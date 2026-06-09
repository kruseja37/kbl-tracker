import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

import {
  FRANCHISE_DESIGNATION_ELIGIBILITY_CONTRACT_VERSION,
  type FranchiseDesignationEligibilityRecord,
  type FranchiseDesignationEligibilityReport,
} from '../franchiseDesignationEligibility';
import {
  buildFranchiseDesignationMoraleContextAdapterReport,
  FRANCHISE_DESIGNATION_MORALE_CONTEXT_ADAPTER_VERSION,
} from '../franchiseDesignationMoraleContextAdapter';

function sourceInputs(): FranchiseDesignationEligibilityRecord['sourceInputs'] {
  return {
    salaryBaselineAvailable: true,
    teamSalaryBaselineAvailable: true,
    seasonStatsAvailable: true,
    warPreviewInputAvailable: true,
    pitchingWarPreviewInputAvailable: true,
    totalWar: 1.2,
    pitchingWar: 0.8,
    teamMvpWarTrusted: true,
    aceWarTrusted: true,
    wpaAvailable: false,
    wpaTrustedForFinalValue: false,
    trueValueAvailable: false,
    moraleAvailable: false,
    relationshipInputsAvailable: false,
    awardInputsFinalized: false,
    seedParkFactorsAvailable: true,
    parkAdjustedValueInputsAvailable: false,
    seasonMetadataAvailable: true,
  };
}

function record(overrides: Partial<FranchiseDesignationEligibilityRecord> = {}): FranchiseDesignationEligibilityRecord {
  return {
    contractVersion: FRANCHISE_DESIGNATION_ELIGIBILITY_CONTRACT_VERSION,
    franchiseId: 'franchise-1',
    seasonId: 'season-1',
    statsScopeId: 'season-1',
    seasonNumber: 1,
    playerId: 'player-1',
    playerName: 'Preview Player',
    teamId: 'team-1',
    rosterStatus: 'MLB',
    designationType: 'TEAM_MVP',
    status: 'preview-only',
    persistable: false,
    reasons: ['Preview-only designation eligibility.'],
    limitations: ['Final designation persistence is blocked.'],
    sourceInputs: sourceInputs(),
    ...overrides,
  };
}

function report(records: FranchiseDesignationEligibilityRecord[]): FranchiseDesignationEligibilityReport {
  return {
    contractVersion: FRANCHISE_DESIGNATION_ELIGIBILITY_CONTRACT_VERSION,
    franchiseId: 'franchise-1',
    seasonId: 'season-1',
    statsScopeId: 'season-1',
    seasonNumber: 1,
    valueInputContractVersion: 'franchise-mode2-value-inputs-v1-readonly',
    generatedAt: 100,
    records,
    anyPersistable: false,
    limitations: ['No dynamic designation is persistable in internal v1 conditions.'],
  };
}

describe('franchise designation morale context adapter', () => {
  test('emits read-only bridge contexts for preview-only TEAM_MVP and ACE MLB records', () => {
    const output = buildFranchiseDesignationMoraleContextAdapterReport(report([
      record({ playerId: 'mvp', playerName: 'Preview MVP', designationType: 'TEAM_MVP' }),
      record({ playerId: 'ace', playerName: 'Preview Ace', designationType: 'ACE' }),
    ]));

    expect(output.contractVersion).toBe(FRANCHISE_DESIGNATION_MORALE_CONTEXT_ADAPTER_VERSION);
    expect(output.persistable).toBe(false);
    expect(output.mutable).toBe(false);
    expect(output.automaticMoraleMutationAllowed).toBe(false);
    expect(output.contexts).toHaveLength(2);
    expect(output.contexts).toEqual([
      expect.objectContaining({
        designationType: 'TEAM_MVP',
        designationStatus: 'preview-only',
        playerId: 'mvp',
        rosterStatus: 'MLB',
        ratingRevealState: 'revealed',
        playerCurrent: true,
        triggerKind: 'recognition',
        valueDeltaTrusted: false,
        durableDesignationStateTrusted: false,
        hiddenTruthExposed: false,
      }),
      expect.objectContaining({
        designationType: 'ACE',
        playerId: 'ace',
        triggerFranchiseId: 'franchise-1',
        triggerSeasonId: 'season-1',
        triggerStatsScopeId: 'season-1',
        triggerSeasonNumber: 1,
      }),
    ]);
  });

  test('blocks missing report scope and mismatched record scope', () => {
    const missingScopeReport = {
      ...report([record()]),
      franchiseId: '',
      seasonId: '',
      statsScopeId: '',
      seasonNumber: 0,
    } as FranchiseDesignationEligibilityReport;
    const missing = buildFranchiseDesignationMoraleContextAdapterReport(missingScopeReport);
    expect(missing.contexts).toHaveLength(0);
    expect(missing.blocked[0].reasons.join(' ')).toMatch(/Explicit franchise, season, stats scope/i);

    const mismatched = buildFranchiseDesignationMoraleContextAdapterReport(report([
      record({ franchiseId: 'other-franchise' }),
    ]));
    expect(mismatched.contexts).toHaveLength(0);
    expect(mismatched.blocked[0].reasons.join(' ')).toMatch(/record scope does not match/i);
  });

  test('blocks FARM unassigned and hidden-safe prospect-like rows instead of inferring reveal state', () => {
    const output = buildFranchiseDesignationMoraleContextAdapterReport(report([
      record({ playerId: 'farm', rosterStatus: 'FARM', designationType: 'TEAM_MVP' }),
      record({ playerId: 'unassigned', rosterStatus: null, teamId: null, designationType: 'ACE' }),
    ]));

    expect(output.contexts).toHaveLength(0);
    expect(output.blocked.map((blocked) => blocked.playerId)).toEqual(['farm', 'unassigned']);
    expect(output.blocked[0].reasons.join(' ')).toMatch(/Current revealed MLB roster status is required/i);
    expect(output.blocked[1].reasons.join(' ')).toMatch(/Current team id is required/i);
    const serialized = JSON.stringify(output);
    expect(serialized).not.toMatch(/trueGrade|hiddenScoutTruth|hiddenPersonalityModifiers|leadership/i);
  });

  test('blocks Fan Favorite and Albatross because True Value value delta is not trusted', () => {
    const output = buildFranchiseDesignationMoraleContextAdapterReport(report([
      record({ designationType: 'FAN_FAVORITE', status: 'blocked' }),
      record({ designationType: 'ALBATROSS', status: 'blocked' }),
    ]));

    expect(output.contexts).toHaveLength(0);
    expect(output.blocked).toHaveLength(2);
    expect(output.blocked[0].reasons.join(' ')).toMatch(/True Value\/value-delta/i);
    expect(output.blocked[1].reasons.join(' ')).toMatch(/True Value\/value-delta/i);
  });

  test('blocks Captain Cornerstone and Fan Hopeful with explicit deferred reasons', () => {
    const output = buildFranchiseDesignationMoraleContextAdapterReport(report([
      record({ designationType: 'CAPTAIN', status: 'blocked' }),
      record({ designationType: 'CORNERSTONE', status: 'blocked' }),
      record({ designationType: 'FAN_HOPEFUL', status: 'blocked', rosterStatus: 'FARM' }),
    ]));

    expect(output.contexts).toHaveLength(0);
    expect(output.blocked.find((blocked) => blocked.designationType === 'CAPTAIN')?.reasons.join(' ')).toMatch(/hidden-charisma\/leadership safety/i);
    expect(output.blocked.find((blocked) => blocked.designationType === 'CORNERSTONE')?.reasons.join(' ')).toMatch(/durable designation state/i);
    expect(output.blocked.find((blocked) => blocked.designationType === 'FAN_HOPEFUL')?.reasons.join(' ')).toMatch(/visible-safe prospect assignment/i);
  });

  test('does not treat blocked eligible or active records as bridge-ready durable designation state', () => {
    const output = buildFranchiseDesignationMoraleContextAdapterReport(report([
      record({ designationType: 'TEAM_MVP', status: 'blocked' }),
      record({ designationType: 'ACE', status: 'eligible' }),
      record({ designationType: 'TEAM_MVP', status: 'active', persistable: true }),
    ]));

    expect(output.contexts).toHaveLength(0);
    expect(output.blocked.map((blocked) => blocked.playerId)).toEqual(['player-1', 'player-1', 'player-1']);
    expect(output.blocked.every((blocked) =>
      blocked.reasons.some((reason) => reason.includes('Only preview-only TEAM_MVP/ACE')),
    )).toBe(true);
  });

  test('utility imports no storage save set persist or mutation APIs', () => {
    const source = readFileSync('src/utils/franchiseDesignationMoraleContextAdapter.ts', 'utf8');
    const output = buildFranchiseDesignationMoraleContextAdapterReport(report([record()]));

    expect(source).not.toMatch(/indexedDB|syncEngine|save[A-Z]|set[A-Z]|persist[A-Z]|put\(|delete\(|confirmFranchiseRandomEvent|applyFranchiseMoraleEffect|buildFranchiseRandomEventLogReport/);
    expect(output.designationPersistenceAllowed).toBe(false);
    expect(output.trueValueCalculationAllowed).toBe(false);
    expect(output.hiddenProspectTruthAllowed).toBe(false);
  });
});
