import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

import {
  buildFranchiseSeasonEndReadinessReport,
  FRANCHISE_SEASON_END_READINESS_VERSION,
  type BuildFranchiseSeasonEndReadinessInput,
} from '../franchiseSeasonEndReadiness';

function completeInput(overrides: Partial<BuildFranchiseSeasonEndReadinessInput> = {}): BuildFranchiseSeasonEndReadinessInput {
  const scope = {
    franchiseId: 'franchise-1',
    seasonId: 'franchise-1-season-2',
    statsScopeId: 'franchise-1-season-2',
    seasonNumber: 2,
  };

  return {
    ...scope,
    completedGameArchives: [{
      ...scope,
      gameId: 'game-1',
      aggregationStatus: 'aggregated',
      archiveBacked: true,
    }],
    randomEventLogRecords: [{
      ...scope,
      id: 'event-1',
      confirmation: { state: 'confirmed' },
      appliedEffect: { state: 'applied', blockers: [] },
      entry: { warnings: [] },
    }],
    moraleSnapshots: [{
      ...scope,
      targetType: 'team-fan',
      history: [{ id: 'history-1' }],
    }, {
      ...scope,
      targetType: 'player',
      history: [],
    }],
    dailyMoraleSnapshots: [{
      ...scope,
      targetType: 'team-fan',
      limitations: ['Daily summary is read-only evidence.'],
    }],
    expectedWinsBaselineSnapshots: [{
      ...scope,
      teamId: 'team-1',
      status: 'preview-only',
      limitations: ['Expected wins baseline remains preview-only.'],
    }],
    stadiumRecords: [{
      ...scope,
      stadiumId: 'stadium-1',
      recordType: 'highest-team-runs-game',
      limitations: ['Stadium record is read-only evidence.'],
    }],
    designationReadinessReport: {
      ...scope,
      rows: [{ id: 'designation-row-1' }],
      blockers: [],
      limitations: ['Final designation carryover remains blocked.'],
      hiddenSafe: true,
      readOnly: true,
    },
    relationshipContextReports: [{
      ...scope,
      rows: [{ id: 'relationship-row-1' }],
      limitations: ['No durable relationship state exists.'],
      hiddenSafe: true,
      policyFlags: { relationshipMutationAllowed: false },
    }],
    ...overrides,
  };
}

describe('franchise season-end readiness report', () => {
  test('complete scoped inputs return ready-for-review while policy flags stay false', () => {
    const report = buildFranchiseSeasonEndReadinessReport(completeInput());

    expect(report.contractVersion).toBe(FRANCHISE_SEASON_END_READINESS_VERSION);
    expect(report.status).toBe('ready-for-review');
    expect(report.readOnly).toBe(true);
    expect(report.hiddenSafe).toBe(true);
    expect(report.mode3ExecutionAllowed).toBe(false);
    expect(report.mutatesState).toBe(false);
    expect(report.policyFlags).toMatchObject({
      mode3ExecutionAllowed: false,
      seasonRolloverAllowed: false,
      salaryMovementAllowed: false,
      trueValuePromotionAllowed: false,
      designationCarryoverAllowed: false,
      relationshipMutationAllowed: false,
      storyPersistenceAllowed: false,
      automaticMoraleDriftAllowed: false,
    });
    expect(report.blockers).toEqual([]);
    expect(report.sections.map((section) => section.key)).toContain('blocked-future-systems');
    expect(report.checklist.find((item) => item.key === 'future:mode3')?.detail).toMatch(/disabled/i);
  });

  test('missing optional summaries return incomplete with checklist warnings', () => {
    const report = buildFranchiseSeasonEndReadinessReport(completeInput({
      dailyMoraleSnapshots: undefined,
      expectedWinsBaselineSnapshots: undefined,
      stadiumRecords: undefined,
      relationshipContextReports: undefined,
    }));

    expect(report.status).toBe('incomplete');
    expect(report.blockers).toEqual([]);
    expect(report.warnings.join(' ')).toMatch(/Daily morale summaries summary missing/i);
    expect(report.warnings.join(' ')).toMatch(/Expected-wins baseline evidence summary missing/i);
    expect(report.warnings.join(' ')).toMatch(/Stadium records\/spray evidence summary missing/i);
    expect(report.warnings.join(' ')).toMatch(/Relationship context summary missing/i);
    expect(report.checklist.filter((item) => item.status === 'missing').length).toBeGreaterThanOrEqual(4);
  });

  test('missing, mismatched, and whitespace scope block readiness', () => {
    const whitespace = buildFranchiseSeasonEndReadinessReport(completeInput({
      franchiseId: '   ',
      seasonId: 'franchise-1-season-2',
      statsScopeId: 'franchise-1-season-2',
      seasonNumber: 2,
    }));
    const mismatchedDesignation = buildFranchiseSeasonEndReadinessReport(completeInput({
      designationReadinessReport: {
        franchiseId: 'franchise-2',
        seasonId: 'franchise-1-season-2',
        statsScopeId: 'franchise-1-season-2',
        seasonNumber: 2,
        rows: [{ id: 'designation-row-1' }],
      },
    }));
    const missingSeason = buildFranchiseSeasonEndReadinessReport(completeInput({
      seasonNumber: 0,
    }));

    expect(whitespace.status).toBe('blocked');
    expect(whitespace.blockers.join(' ')).toMatch(/non-empty franchiseId/i);
    expect(mismatchedDesignation.status).toBe('blocked');
    expect(mismatchedDesignation.blockers).toContain('Designation readiness report scope does not match season-end readiness scope.');
    expect(missingSeason.status).toBe('blocked');
    expect(missingSeason.blockers.join(' ')).toMatch(/positive seasonNumber/i);
  });

  test('unresolved blockers produce blocked readiness', () => {
    const report = buildFranchiseSeasonEndReadinessReport(completeInput({
      expectedWinsBaselineSnapshots: [{
        franchiseId: 'franchise-1',
        seasonId: 'franchise-1-season-2',
        statsScopeId: 'franchise-1-season-2',
        seasonNumber: 2,
        teamId: 'team-1',
        status: 'blocked',
        blockers: ['Expected wins baseline row was blocked by missing preview inputs.'],
      }],
    }));

    expect(report.status).toBe('blocked');
    expect(report.blockers.join(' ')).toMatch(/Expected wins baseline row was blocked/i);
  });

  test('unconfirmed random-event prompts are warnings and incomplete, not automatic blockers', () => {
    const report = buildFranchiseSeasonEndReadinessReport(completeInput({
      randomEventLogRecords: [{
        franchiseId: 'franchise-1',
        seasonId: 'franchise-1-season-2',
        statsScopeId: 'franchise-1-season-2',
        seasonNumber: 2,
        id: 'event-1',
        confirmation: { state: 'unconfirmed' },
      }],
    }));

    expect(report.status).toBe('incomplete');
    expect(report.blockers).toEqual([]);
    expect(report.warnings.join(' ')).toMatch(/remain unconfirmed/i);
    expect(report.checklist.find((item) => item.key === 'random-events:unconfirmed')?.status).toBe('warning');
  });

  test('source file imports no storage or mutation APIs', () => {
    const source = readFileSync('src/utils/franchiseSeasonEndReadiness.ts', 'utf8');
    const importLines = source.split('\n').filter((line) => line.startsWith('import'));

    expect(importLines).toEqual([]);
    expect(source).not.toMatch(/syncEngine|applyFranchiseMoraleEffect|saveRecord|saveSnapshot|put\(|delete\(|indexedDB|localStorage/i);
  });
});
