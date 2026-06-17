import { describe, expect, test } from 'vitest';
import type { Player } from '../franchisePlayerStorage';
import {
  calculateFranchiseDesignations,
  diffActiveDesignationHolders,
  FRANCHISE_DESIGNATION_EP1_LIMITATION,
  getLiveDesignationBadge,
  getProjectedDesignationBadge,
  minimumAcePitchingAppearances,
  minimumTeamMvpGames,
  minimumValueDesignationGames,
  updateFranchiseDesignationTeamForTrade,
  type FranchiseDesignationPlayerInput,
  type FranchisePlayerDesignationRecord,
} from '../franchiseDesignations';

const context = {
  franchiseId: 'franchise-a',
  seasonId: 'franchise-a-season-1',
  statsScopeId: 'franchise-a-season-1',
  seasonNumber: 1,
  gamesPerTeam: 20,
  calculatedAt: '2026-06-12T00:00:00.000Z',
};

function player(overrides: Partial<FranchiseDesignationPlayerInput>): FranchiseDesignationPlayerInput {
  return {
    playerId: 'player-a',
    playerName: 'Player A',
    teamId: 'team-a',
    position: 'SS',
    gamesPlayed: 5,
    pitchingAppearances: 0,
    totalWAR: 0,
    pWAR: null,
    trueValue: null,
    contractValue: null,
    valueDelta: null,
    ...overrides,
  };
}

function record(overrides: Partial<FranchisePlayerDesignationRecord> = {}): FranchisePlayerDesignationRecord {
  return {
    franchiseId: context.franchiseId,
    seasonId: context.seasonId,
    statsScopeId: context.statsScopeId,
    seasonNumber: context.seasonNumber,
    teamId: 'team-a',
    playerId: 'player-a',
    playerName: 'Player A',
    type: 'TEAM_MVP',
    status: 'active',
    sourceInputs: {},
    sourceEvidence: [],
    calculationVersion: 'test-designations',
    calculatedAt: context.calculatedAt,
    lockedAt: null,
    carryover: {
      carriesOver: false,
      untilSeasonProgress: null,
      previousSeasonId: null,
      previousPlayerId: null,
      note: null,
    },
    ...overrides,
  };
}

describe('franchise projected designations', () => {
  test('applies each §17 projected criterion from canonical source rows', () => {
    const designations = calculateFranchiseDesignations([
      player({ playerId: 'mvp', playerName: 'Most Value', totalWAR: 3.2, gamesPlayed: 5 }),
      player({ playerId: 'mvp-runner-up', playerName: 'Runner Up', totalWAR: 2.8, gamesPlayed: 12 }),
      player({ playerId: 'ace', playerName: 'Ace Pitcher', position: 'SP', pWAR: 1.1, pitchingAppearances: 4 }),
      player({ playerId: 'fan', playerName: 'Fan Bargain', gamesPlayed: 3, trueValue: 12, contractValue: 2, valueDelta: 10 }),
      player({ playerId: 'alb', playerName: 'Heavy Contract', gamesPlayed: 3, trueValue: 3, contractValue: 12, valueDelta: -9, valueTrusted: true }),
    ], context);

    expect(designations.map((designation) => [designation.type, designation.playerId])).toEqual([
      ['TEAM_MVP', 'mvp'],
      ['ACE', 'ace'],
      ['FAN_FAVORITE', 'fan'],
      ['ALBATROSS', 'alb'],
    ]);
    expect(designations.every((designation) => designation.status === 'projected')).toBe(true);
    expect(designations.every((designation) => designation.lockedAt === null)).toBe(true);
    expect(designations.every((designation) =>
      designation.sourceInputs.peerPoolLimitation === FRANCHISE_DESIGNATION_EP1_LIMITATION,
    )).toBe(true);
  });

  test('excludes untrusted negative value-delta rows when selecting Albatross', () => {
    const designations = calculateFranchiseDesignations([
      player({
        playerId: 'untrusted-worst',
        playerName: 'Untrusted Worst',
        gamesPlayed: 3,
        trueValue: 1,
        contractValue: 31,
        valueDelta: -30,
        valueTrusted: false,
      }),
      player({
        playerId: 'trusted-worst',
        playerName: 'Trusted Worst',
        gamesPlayed: 3,
        trueValue: 7,
        contractValue: 18,
        valueDelta: -11,
        valueTrusted: true,
      }),
      player({
        playerId: 'trusted-less-bad',
        playerName: 'Trusted Less Bad',
        gamesPlayed: 3,
        trueValue: 10,
        contractValue: 14,
        valueDelta: -4,
        valueTrusted: true,
      }),
    ], context);

    const albatross = designations.find((designation) => designation.type === 'ALBATROSS');
    expect(albatross?.playerId).toBe('trusted-worst');
    expect(designations.some((designation) => designation.playerId === 'untrusted-worst')).toBe(false);
  });

  test('honors §17 floors and Ace pWAR minimum without default holders', () => {
    const designations = calculateFranchiseDesignations([
      player({ playerId: 'short-mvp', totalWAR: 9, gamesPlayed: minimumTeamMvpGames(context.gamesPerTeam) - 1 }),
      player({ playerId: 'short-ace', position: 'SP', gamesPlayed: 0, totalWAR: null, pWAR: 3, pitchingAppearances: minimumAcePitchingAppearances(context.gamesPerTeam) - 1 }),
      player({ playerId: 'low-pwar-ace', position: 'RP', gamesPlayed: 0, totalWAR: null, pWAR: 0.49, pitchingAppearances: minimumAcePitchingAppearances(context.gamesPerTeam) }),
      player({ playerId: 'short-fan', valueDelta: 99, gamesPlayed: minimumValueDesignationGames(context.gamesPerTeam) - 1 }),
      player({ playerId: 'short-alb', valueDelta: -99, gamesPlayed: minimumValueDesignationGames(context.gamesPerTeam) - 1 }),
    ], context);

    expect(designations).toEqual([]);
  });

  test('exposes §17.8 projected dotted badge metadata', () => {
    expect(getProjectedDesignationBadge('TEAM_MVP')).toMatchObject({
      label: 'Proj. MVP',
      borderStyle: 'dotted',
      status: 'projected',
      colorHex: '#FFD700',
    });
    expect(getProjectedDesignationBadge('ACE').label).toBe('Proj. Ace');
    expect(getProjectedDesignationBadge('FAN_FAVORITE').label).toBe('Proj. Fan Favorite');
    expect(getProjectedDesignationBadge('ALBATROSS').label).toBe('Proj. Albatross');
  });

  test('exposes D7a live solid badge metadata without changing projected labels', () => {
    expect(getLiveDesignationBadge('TEAM_MVP')).toMatchObject({
      label: 'MVP',
      borderStyle: 'solid',
      status: 'active',
      colorHex: '#FFD700',
    });
    expect(getLiveDesignationBadge('ACE')).toMatchObject({
      label: 'Ace',
      borderStyle: 'solid',
      status: 'active',
      colorHex: '#4169E1',
    });
    expect(getLiveDesignationBadge('ALBATROSS')).toMatchObject({
      label: 'Albatross',
      borderStyle: 'solid',
      status: 'active',
      colorHex: '#EF4444',
    });
    expect(getLiveDesignationBadge('TEAM_MVP')?.label).not.toMatch(/Proj\./);
    expect(getLiveDesignationBadge('ACE')?.label).not.toMatch(/Proj\./);
    expect(getLiveDesignationBadge('ALBATROSS')?.label).not.toMatch(/Proj\./);
    expect(getLiveDesignationBadge('FAN_FAVORITE')).toBeNull();
    expect(getProjectedDesignationBadge('TEAM_MVP').label).toBe('Proj. MVP');
    expect(getProjectedDesignationBadge('ACE').label).toBe('Proj. Ace');
  });

  test('diffs active holder transitions without any morale relationship or salary mutation', () => {
    const events = diffActiveDesignationHolders(
      [record({ playerId: 'old-mvp', playerName: 'Old MVP' })],
      [record({ playerId: 'new-mvp', playerName: 'New MVP', calculatedAt: '2026-06-13T00:00:00.000Z' })],
    );

    expect(events).toEqual([
      expect.objectContaining({
        eventType: 'designation',
        designationType: 'TEAM_MVP',
        transition: 'changed',
        playerId: 'new-mvp',
        previousPlayerId: 'old-mvp',
        moraleMutationApplied: false,
        relationshipMutationApplied: false,
        salaryMovementApplied: false,
      }),
    ]);
    expect(diffActiveDesignationHolders(
      [record({ playerId: 'same-mvp' })],
      [record({ playerId: 'same-mvp', calculatedAt: '2026-06-13T00:00:00.000Z' })],
    )).toEqual([]);
  });

  test('carries stale player-embedded designation metadata through trade compatibility only', () => {
    const legacyPlayer = {
      id: 'legacy',
      franchiseDesignations: [{
        teamId: 'team-a',
        status: 'active',
        type: 'TEAM_MVP',
        sourceInputs: {},
      }],
    } as unknown as Player;

    const updated = updateFranchiseDesignationTeamForTrade(legacyPlayer, 'team-a', 'team-b') as unknown as {
      franchiseDesignations: Array<{ teamId: string; sourceInputs: Record<string, unknown> }>;
    };

    expect(updated.franchiseDesignations[0].teamId).toBe('team-b');
    expect(updated.franchiseDesignations[0].sourceInputs.previousTeamId).toBe('team-a');
  });
});
