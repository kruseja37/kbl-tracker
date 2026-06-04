import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

import {
  buildFranchiseSeasonEndReadinessReport,
  type BuildFranchiseSeasonEndReadinessInput,
  type FranchiseSeasonEndReadinessReport,
} from '../franchiseSeasonEndReadiness';
import {
  buildFranchiseSeasonHandoffPlan,
  FRANCHISE_SEASON_HANDOFF_PLAN_VERSION,
} from '../franchiseSeasonHandoffPlan';

function readinessInput(overrides: Partial<BuildFranchiseSeasonEndReadinessInput> = {}): BuildFranchiseSeasonEndReadinessInput {
  const scope = {
    franchiseId: 'franchise-1',
    seasonId: 'franchise-1-season-2',
    statsScopeId: 'franchise-1-season-2',
    seasonNumber: 2,
  };

  return {
    ...scope,
    completedGameArchives: [{ ...scope, gameId: 'game-1', aggregationStatus: 'aggregated' }],
    randomEventLogRecords: [{ ...scope, id: 'event-1', confirmation: { state: 'confirmed' } }],
    moraleSnapshots: [{ ...scope, targetType: 'team-fan', history: [{ id: 'history-1' }] }],
    dailyMoraleSnapshots: [{ ...scope, targetType: 'team-fan' }],
    expectedWinsBaselineSnapshots: [{ ...scope, teamId: 'team-1', status: 'preview-only' }],
    stadiumRecords: [{ ...scope, stadiumId: 'stadium-1', recordType: 'highest-team-runs-game' }],
    designationReadinessReport: { ...scope, rows: [{ id: 'designation-row-1' }], blockers: [], limitations: [] },
    relationshipContextReports: [{ ...scope, rows: [{ id: 'relationship-row-1' }], limitations: [] }],
    ...overrides,
  };
}

function readiness(overrides: Partial<BuildFranchiseSeasonEndReadinessInput> = {}): FranchiseSeasonEndReadinessReport {
  return buildFranchiseSeasonEndReadinessReport(readinessInput(overrides));
}

describe('franchise season handoff plan', () => {
  test('ready readiness report creates review-only handoff plan', () => {
    const plan = buildFranchiseSeasonHandoffPlan({
      franchiseId: 'franchise-1',
      seasonId: 'franchise-1-season-2',
      statsScopeId: 'franchise-1-season-2',
      seasonNumber: 2,
      readinessReport: readiness(),
      summaryCounts: {
        randomEvents: { confirmed: 1, dismissed: 1, unconfirmed: 0 },
        moraleSnapshots: 1,
        dailyMoraleSnapshots: 1,
        expectedWinsBaselines: 1,
        stadiumRecords: 1,
        designationReadinessRows: 1,
        relationshipContextReports: 1,
      },
    });

    expect(plan.contractVersion).toBe(FRANCHISE_SEASON_HANDOFF_PLAN_VERSION);
    expect(plan.status).toBe('review-only');
    expect(plan.readinessStatus).toBe('ready-for-review');
    expect(plan.mode3ExecutionAllowed).toBe(false);
    expect(plan.mutatesState).toBe(false);
    expect(plan.decisionCategories.map((category) => category.key)).toEqual([
      'random-event-log',
      'morale-snapshots-history',
      'daily-morale-summaries',
      'expected-wins-baselines',
      'stadium-records',
      'designation-readiness',
      'relationships',
    ]);
    expect(plan.decisionCategories.every((category) => category.carryoverAllowed === false)).toBe(true);
    expect(plan.sections.map((section) => section.key)).toEqual([
      'eligible-review-evidence',
      'blocked-carryover-categories',
      'unresolved-blockers',
      'warnings',
      'future-decisions-required',
    ]);
    expect(plan.futureDecisionsRequired.join(' ')).toMatch(/season rollover storage/i);
    expect(plan.futureDecisionsRequired.join(' ')).toMatch(/durable relationship state/i);
  });

  test('incomplete readiness report creates not-ready handoff plan', () => {
    const incomplete = readiness({
      expectedWinsBaselineSnapshots: undefined,
    });
    const plan = buildFranchiseSeasonHandoffPlan({
      franchiseId: 'franchise-1',
      seasonId: 'franchise-1-season-2',
      statsScopeId: 'franchise-1-season-2',
      seasonNumber: 2,
      readinessReport: incomplete,
    });

    expect(incomplete.status).toBe('incomplete');
    expect(plan.status).toBe('not-ready');
    expect(plan.warnings.join(' ')).toMatch(/readiness is incomplete/i);
  });

  test('blocked readiness report creates blocked handoff plan', () => {
    const blocked = readiness({
      expectedWinsBaselineSnapshots: [{
        franchiseId: 'franchise-1',
        seasonId: 'franchise-1-season-2',
        statsScopeId: 'franchise-1-season-2',
        seasonNumber: 2,
        teamId: 'team-1',
        status: 'blocked',
        blockers: ['Expected wins baseline blocked by missing preview inputs.'],
      }],
    });
    const plan = buildFranchiseSeasonHandoffPlan({
      franchiseId: 'franchise-1',
      seasonId: 'franchise-1-season-2',
      statsScopeId: 'franchise-1-season-2',
      seasonNumber: 2,
      readinessReport: blocked,
    });

    expect(blocked.status).toBe('blocked');
    expect(plan.status).toBe('blocked');
    expect(plan.blockers.join(' ')).toMatch(/Expected wins baseline blocked/i);
  });

  test('missing, mismatched, and whitespace scope blocks handoff planning', () => {
    const ready = readiness();
    const whitespace = buildFranchiseSeasonHandoffPlan({
      franchiseId: '   ',
      seasonId: 'franchise-1-season-2',
      statsScopeId: 'franchise-1-season-2',
      seasonNumber: 2,
      readinessReport: ready,
    });
    const mismatched = buildFranchiseSeasonHandoffPlan({
      franchiseId: 'franchise-2',
      seasonId: 'franchise-1-season-2',
      statsScopeId: 'franchise-1-season-2',
      seasonNumber: 2,
      readinessReport: ready,
    });
    const missing = buildFranchiseSeasonHandoffPlan({
      franchiseId: 'franchise-1',
      seasonId: 'franchise-1-season-2',
      statsScopeId: 'franchise-1-season-2',
      seasonNumber: 2,
      readinessReport: null,
    });

    expect(whitespace.status).toBe('blocked');
    expect(whitespace.blockers.join(' ')).toMatch(/non-empty franchiseId/i);
    expect(mismatched.status).toBe('blocked');
    expect(mismatched.blockers).toContain('Season-end readiness report scope does not match handoff plan scope.');
    expect(missing.status).toBe('blocked');
    expect(missing.blockers).toContain('Season-end readiness report is required before handoff planning.');
  });

  test('all carryover and execution policy flags remain false', () => {
    const plan = buildFranchiseSeasonHandoffPlan({
      franchiseId: 'franchise-1',
      seasonId: 'franchise-1-season-2',
      statsScopeId: 'franchise-1-season-2',
      seasonNumber: 2,
      readinessReport: readiness(),
    });

    expect(plan.policyFlags).toMatchObject({
      mode3ExecutionAllowed: false,
      seasonRolloverAllowed: false,
      carryoverWritesAllowed: false,
      salaryMovementAllowed: false,
      trueValuePromotionAllowed: false,
      designationCarryoverAllowed: false,
      relationshipCarryoverAllowed: false,
      storyPersistenceAllowed: false,
      automaticMoraleDriftAllowed: false,
    });
    expect(plan.decisionCategories.every((category) => category.carryoverAllowed === false)).toBe(true);
  });

  test('source file imports no storage or mutation APIs', () => {
    const source = readFileSync('src/utils/franchiseSeasonHandoffPlan.ts', 'utf8');
    const importLines = source.split('\n').filter((line) => line.startsWith('import'));

    expect(source).toMatch(/from '\.\/franchiseSeasonEndReadiness'/);
    expect(importLines.join('\n')).not.toMatch(/Storage|syncEngine|save|set|persist|upsert|delete|applyFranchiseMoraleEffect/i);
    expect(source).not.toMatch(/syncEngine|applyFranchiseMoraleEffect|saveRecord|saveSnapshot|put\(|delete\(|indexedDB|localStorage/i);
  });
});
