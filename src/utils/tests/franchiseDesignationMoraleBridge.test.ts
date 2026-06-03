import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

import {
  buildFranchiseDesignationMoraleBridgeReport,
  FRANCHISE_DESIGNATION_MORALE_BRIDGE_VERSION,
  type FranchiseDesignationMoraleBridgeInput,
} from '../franchiseDesignationMoraleBridge';

function input(overrides: Partial<FranchiseDesignationMoraleBridgeInput> = {}): FranchiseDesignationMoraleBridgeInput {
  return {
    franchiseId: 'franchise-1',
    seasonId: 'season-1',
    statsScopeId: 'season-1',
    seasonNumber: 1,
    designationType: 'TEAM_MVP',
    designationStatus: 'preview-only',
    playerId: 'player-1',
    playerName: 'Bridge Player',
    teamId: 'team-1',
    teamName: 'Bridge Team',
    rosterStatus: 'MLB',
    ratingRevealState: 'revealed',
    playerCurrent: true,
    triggerKind: 'recognition',
    triggerDescription: 'Manual review of designation context.',
    valueDeltaTrusted: false,
    durableDesignationStateTrusted: false,
    hiddenProspectTruthPresent: false,
    hiddenProspectTruthApproved: false,
    hiddenTruthExposed: false,
    generatedAt: 1,
    ...overrides,
  };
}

describe('franchise designation morale bridge', () => {
  test('MVP and Ace recognition produce revealed player morale prompt candidates', () => {
    const mvp = buildFranchiseDesignationMoraleBridgeReport(input({ designationType: 'TEAM_MVP' }));
    const ace = buildFranchiseDesignationMoraleBridgeReport(input({ designationType: 'ACE' }));

    expect(mvp.contractVersion).toBe(FRANCHISE_DESIGNATION_MORALE_BRIDGE_VERSION);
    expect(mvp.blockers).toEqual([]);
    expect(mvp.candidates).toHaveLength(1);
    expect(mvp.candidates[0]).toMatchObject({
      designationType: 'TEAM_MVP',
      promptKind: 'designation-recognition-player-morale',
      targetType: 'player',
      targetId: 'player-1',
      hiddenSafe: true,
      persistable: false,
      automaticMoraleMutationAllowed: false,
      designationPersistenceAllowed: false,
      safeEffectPreview: expect.objectContaining({
        target: 'player-morale-draft',
        targetType: 'player',
        targetId: 'player-1',
        delta: 3,
        automaticMoraleMutationAllowed: false,
        designationMutationAllowed: false,
      }),
    });
    expect(ace.candidates[0].safeEffectPreview).toMatchObject({ target: 'player-morale-draft', delta: 2 });
  });

  test('Fan Favorite trade or send-down blocks without trusted value delta and produces negative fan/player prompts when trusted', () => {
    const blocked = buildFranchiseDesignationMoraleBridgeReport(input({
      designationType: 'FAN_FAVORITE',
      triggerKind: 'send_down',
      valueDeltaTrusted: false,
      durableDesignationStateTrusted: false,
    }));

    expect(blocked.candidates).toHaveLength(0);
    expect(blocked.blockers.join(' ')).toMatch(/trusted value-delta and durable designation state/i);

    const trusted = buildFranchiseDesignationMoraleBridgeReport(input({
      designationType: 'FAN_FAVORITE',
      triggerKind: 'trade',
      valueDeltaTrusted: true,
      durableDesignationStateTrusted: true,
    }));

    expect(trusted.blockers).toEqual([]);
    expect(trusted.candidates).toHaveLength(2);
    expect(trusted.candidates.map((candidate) => candidate.targetType)).toEqual(['team-fan', 'player']);
    expect(trusted.candidates.find((candidate) => candidate.targetType === 'team-fan')?.safeEffectPreview).toMatchObject({
      target: 'fan-morale-draft',
      delta: -3,
    });
    expect(trusted.candidates.find((candidate) => candidate.targetType === 'player')?.safeEffectPreview).toMatchObject({
      target: 'player-morale-draft',
      delta: -2,
    });
  });

  test('Albatross moved blocks without trusted value delta and produces fan/player relief candidates when trusted', () => {
    const blocked = buildFranchiseDesignationMoraleBridgeReport(input({
      designationType: 'ALBATROSS',
      triggerKind: 'trade',
      valueDeltaTrusted: false,
      durableDesignationStateTrusted: false,
    }));

    expect(blocked.candidates).toHaveLength(0);
    expect(blocked.blockers.join(' ')).toMatch(/ALBATROSS morale prompts require trusted value-delta/i);

    const trusted = buildFranchiseDesignationMoraleBridgeReport(input({
      designationType: 'ALBATROSS',
      triggerKind: 'trade',
      valueDeltaTrusted: true,
      durableDesignationStateTrusted: true,
    }));

    expect(trusted.candidates).toHaveLength(2);
    expect(trusted.candidates.find((candidate) => candidate.targetType === 'team-fan')?.safeEffectPreview).toMatchObject({
      target: 'fan-morale-draft',
      delta: 2,
    });
    expect(trusted.candidates.find((candidate) => candidate.targetType === 'player')?.safeEffectPreview).toMatchObject({
      target: 'player-morale-draft',
      delta: 1,
    });
  });

  test('Cornerstone moved produces stronger negative fan/player morale prompts only when durable designation state is trusted', () => {
    const blocked = buildFranchiseDesignationMoraleBridgeReport(input({
      designationType: 'CORNERSTONE',
      triggerKind: 'trade',
      durableDesignationStateTrusted: false,
    }));

    expect(blocked.candidates).toHaveLength(0);
    expect(blocked.blockers.join(' ')).toMatch(/trusted durable designation state/i);

    const trusted = buildFranchiseDesignationMoraleBridgeReport(input({
      designationType: 'CORNERSTONE',
      triggerKind: 'trade',
      durableDesignationStateTrusted: true,
    }));

    expect(trusted.candidates).toHaveLength(2);
    expect(trusted.candidates.find((candidate) => candidate.targetType === 'team-fan')?.safeEffectPreview.delta).toBe(-5);
    expect(trusted.candidates.find((candidate) => candidate.targetType === 'player')?.safeEffectPreview.delta).toBe(-3);
  });

  test('Captain returns blocked when hidden-charisma safety is not approved', () => {
    const report = buildFranchiseDesignationMoraleBridgeReport(input({
      designationType: 'CAPTAIN',
      triggerKind: 'recognition',
      hiddenProspectTruthPresent: true,
      hiddenProspectTruthApproved: false,
    }));

    expect(report.candidates).toHaveLength(0);
    expect(report.blockers.join(' ')).toMatch(/hidden-charisma\/leadership safety is approved/i);
    expect(report.blockers.join(' ')).toMatch(/Hidden FARM\/prospect truth is present/i);
  });

  test('Fan Hopeful returns prospect-safe player morale candidate without exposing hidden truth', () => {
    const report = buildFranchiseDesignationMoraleBridgeReport(input({
      designationType: 'FAN_HOPEFUL',
      designationStatus: 'preview-only',
      triggerKind: 'call_up',
      rosterStatus: 'FARM',
      ratingRevealState: 'hidden',
      playerCurrent: true,
      hiddenProspectTruthPresent: false,
      hiddenTruthExposed: false,
    }));

    expect(report.blockers).toEqual([]);
    expect(report.candidates).toHaveLength(1);
    expect(report.candidates[0]).toMatchObject({
      promptKind: 'prospect-hopeful-player-morale',
      targetType: 'player',
      hiddenSafe: true,
      safeEffectPreview: expect.objectContaining({
        target: 'player-morale-draft',
        delta: 1,
      }),
    });
    const serialized = JSON.stringify(report);
    expect(serialized).not.toMatch(/true ratings|trueGrade|hiddenScoutTruth|hiddenPersonalityModifiers|leadership/i);
  });

  test('missing scope returns blocked with no candidates', () => {
    const report = buildFranchiseDesignationMoraleBridgeReport(input({
      franchiseId: '',
      seasonId: '',
      statsScopeId: '',
      seasonNumber: 0,
      designationType: 'TEAM_MVP',
    }));

    expect(report.candidates).toHaveLength(0);
    expect(report.blockers.join(' ')).toMatch(/Franchise, season, and stats scope identity are required/i);
    expect(report.blockers.join(' ')).toMatch(/Positive season number is required/i);
  });

  test('mismatched trigger scope returns blocked with no candidates', () => {
    const report = buildFranchiseDesignationMoraleBridgeReport(input({
      designationType: 'TEAM_MVP',
      triggerKind: 'recognition',
      triggerFranchiseId: 'other-franchise',
      triggerSeasonId: 'other-season',
      triggerStatsScopeId: 'other-scope',
      triggerSeasonNumber: 2,
    }));

    expect(report.candidates).toHaveLength(0);
    expect(report.blockers.join(' ')).toMatch(/Trigger context franchise scope does not match/i);
    expect(report.blockers.join(' ')).toMatch(/Trigger context season scope does not match/i);
    expect(report.blockers.join(' ')).toMatch(/Trigger context stats scope does not match/i);
    expect(report.blockers.join(' ')).toMatch(/Trigger context season number does not match/i);
  });

  test('utility imports no storage save set or persist APIs', () => {
    const source = readFileSync('src/utils/franchiseDesignationMoraleBridge.ts', 'utf8');
    const report = buildFranchiseDesignationMoraleBridgeReport(input({
      designationType: 'TEAM_MVP',
    }));

    expect(source).not.toMatch(/indexedDB|syncEngine|save[A-Z]|set[A-Z]|persist[A-Z]|put\(|delete\(|confirmFranchiseRandomEvent|applyFranchiseMoraleEffect/);
    expect(report.persistable).toBe(false);
    expect(report.mutable).toBe(false);
    expect(report.automaticMoraleMutationAllowed).toBe(false);
    expect(report.designationPersistenceAllowed).toBe(false);
    expect(report.salaryMovementAllowed).toBe(false);
    expect(report.trueValueCalculationAllowed).toBe(false);
    expect(report.mode3OffseasonAllowed).toBe(false);
  });
});
