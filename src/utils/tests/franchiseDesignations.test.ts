import { describe, expect, test } from 'vitest';
import type { Player } from '../franchisePlayerStorage';
import {
  FRANCHISE_ALBATROSS_TRADE_VALUE_MULTIPLIER,
  applyFranchiseDesignationsToPlayers,
  calculateFranchiseDesignations,
  updateFranchiseDesignationTeamForTrade,
  type FranchiseDesignationPlayerInput,
} from '../franchiseDesignations';

const context = {
  franchiseId: 'franchise-a',
  seasonId: 'franchise-a-season-1',
  seasonNumber: 1,
  gamesPerTeam: 20,
  leagueMinSalary: 0.5,
  seasonProgress: 0.5,
  calculatedAt: '2026-05-27T00:00:00.000Z',
};

function player(overrides: Partial<FranchiseDesignationPlayerInput>): FranchiseDesignationPlayerInput {
  return {
    playerId: 'player-a',
    playerName: 'Player A',
    teamId: 'team-a',
    position: 'SS',
    salary: 5,
    trueValue: 5,
    gamesPlayed: 5,
    totalWAR: 0,
    pWAR: 0,
    ...overrides,
  };
}

function storagePlayer(id: string, teamId: string): Player {
  return {
    id,
    firstName: id,
    lastName: 'Test',
    gender: 'M',
    age: 27,
    bats: 'R',
    throws: 'R',
    primaryPosition: 'SS',
    power: 70,
    contact: 70,
    speed: 70,
    fielding: 70,
    arm: 70,
    velocity: 0,
    junk: 0,
    accuracy: 0,
    arsenal: [],
    overallGrade: 'B',
    personality: 'Competitive',
    chemistry: 'Competitive',
    morale: 50,
    mojo: 'Normal',
    fame: 0,
    salary: 5,
    leagueAssignments: [{ leagueId: 'league-1', teamId, rosterStatus: 'MLB' }],
    createdDate: '2026-01-01T00:00:00.000Z',
    lastModified: '2026-01-01T00:00:00.000Z',
    isCustom: false,
    editHistory: [],
  };
}

describe('franchise dynamic designations', () => {
  test('derives stable projected MVP, Ace, Fan Favorite, and Albatross records by playerId', () => {
    const designations = calculateFranchiseDesignations([
      player({ playerId: 'mvp', playerName: 'Most Value', totalWAR: 3.2, trueValue: 8, salary: 6 }),
      player({ playerId: 'ace', playerName: 'Ace Pitcher', position: 'SP', pWAR: 1.1, totalWAR: 1.5 }),
      player({ playerId: 'fan', playerName: 'Fan Bargain', totalWAR: 2, trueValue: 12, salary: 2 }),
      player({ playerId: 'alb', playerName: 'Heavy Contract', totalWAR: 0.2, trueValue: 3, salary: 12 }),
    ], context);

    expect(designations.map((designation) => [designation.type, designation.playerId])).toEqual(
      expect.arrayContaining([
        ['TEAM_MVP', 'mvp'],
        ['ACE', 'ace'],
        ['FAN_FAVORITE', 'fan'],
        ['ALBATROSS', 'alb'],
      ]),
    );
    expect(designations.every((designation) => designation.status === 'projected')).toBe(true);
    expect(
      designations.find((designation) => designation.type === 'ALBATROSS')?.sourceInputs.tradeValueMultiplier,
    ).toBe(FRANCHISE_ALBATROSS_TRADE_VALUE_MULTIPLIER);
  });

  test('does not invent narrative-only Captain or Fan Hopeful designations', () => {
    const designations = calculateFranchiseDesignations([
      player({ playerId: 'captainish', totalWAR: 0, trueValue: 5, salary: 5 }),
    ], context);

    expect(designations.map((designation) => designation.type)).not.toContain('TEAM_CAPTAIN');
    expect(designations.map((designation) => designation.type)).not.toContain('FAN_HOPEFUL');
  });

  test('stores records on franchise player copies and keeps them with playerId through a trade remap', () => {
    const basePlayer = storagePlayer('fan', 'team-a');
    const [withDesignation] = applyFranchiseDesignationsToPlayers(
      [basePlayer],
      calculateFranchiseDesignations([
        player({ playerId: 'fan', playerName: 'Fan Bargain', teamId: 'team-a', trueValue: 12, salary: 2 }),
      ], context),
    );

    const traded = updateFranchiseDesignationTeamForTrade(withDesignation, 'team-a', 'team-b') as Player & {
      franchiseDesignations: Array<{ playerId: string; teamId: string; sourceInputs: Record<string, unknown> }>;
    };

    expect(traded.id).toBe('fan');
    expect(traded.franchiseDesignations[0]).toMatchObject({
      playerId: 'fan',
      teamId: 'team-b',
    });
    expect(traded.franchiseDesignations[0].sourceInputs.previousTeamId).toBe('team-a');
  });
});
