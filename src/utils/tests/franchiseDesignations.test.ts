import { describe, expect, test } from 'vitest';
import type { Player } from '../franchisePlayerStorage';
import {
  calculateFranchiseDesignations,
  getProjectedDesignationBadge,
  minimumAcePitchingAppearances,
  minimumTeamMvpGames,
  minimumValueDesignationGames,
  updateFranchiseDesignationTeamForTrade,
  type FranchiseDesignationPlayerInput,
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

describe('franchise projected designations', () => {
  test('applies each §17 projected criterion from canonical source rows', () => {
    const designations = calculateFranchiseDesignations([
      player({ playerId: 'mvp', playerName: 'Most Value', totalWAR: 3.2, gamesPlayed: 5 }),
      player({ playerId: 'mvp-runner-up', playerName: 'Runner Up', totalWAR: 2.8, gamesPlayed: 12 }),
      player({ playerId: 'ace', playerName: 'Ace Pitcher', position: 'SP', pWAR: 1.1, pitchingAppearances: 4 }),
      player({ playerId: 'fan', playerName: 'Fan Bargain', gamesPlayed: 3, trueValue: 12, contractValue: 2, valueDelta: 10 }),
      player({ playerId: 'alb', playerName: 'Heavy Contract', gamesPlayed: 3, trueValue: 3, contractValue: 12, valueDelta: -9 }),
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
      String(designation.sourceInputs.peerPoolLimitation).includes('EP1'),
    )).toBe(true);
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
