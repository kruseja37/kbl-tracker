import { describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  saveFranchisePlayer: vi.fn(),
  savePlayer: vi.fn(),
}));

vi.mock('../franchisePlayerStorage', () => ({
  saveFranchisePlayer: mocks.saveFranchisePlayer,
}));

vi.mock('../leagueBuilderStorage', () => ({
  savePlayer: mocks.savePlayer,
}));

import {
  persistFranchiseDesignationsForPlayers,
  type FranchisePlayerDesignationRecord,
} from '../franchiseDesignations';
import type { Player } from '../franchisePlayerStorage';
import * as leagueBuilderStorage from '../leagueBuilderStorage';

function makePlayer(id: string): Player {
  return {
    id,
    firstName: id,
    lastName: 'Persist',
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
    leagueAssignments: [{ leagueId: 'league-1', teamId: 'team-a', rosterStatus: 'MLB' }],
    createdDate: '2026-01-01T00:00:00.000Z',
    lastModified: '2026-01-01T00:00:00.000Z',
    isCustom: false,
    editHistory: [],
  };
}

function designation(playerId: string): FranchisePlayerDesignationRecord {
  return {
    franchiseId: 'franchise-a',
    seasonId: 'franchise-a-season-1',
    seasonNumber: 1,
    teamId: 'team-a',
    playerId,
    playerName: playerId,
    type: 'FAN_FAVORITE',
    status: 'projected',
    sourceInputs: { valueDelta: 5 },
    calculationVersion: 'test',
    calculatedAt: '2026-05-27T00:00:00.000Z',
  };
}

describe('franchise designation persistence', () => {
  test('writes only franchise-owned player records and never League Builder/global players', async () => {
    mocks.saveFranchisePlayer.mockImplementation(async (_franchiseId: string, player: Player) => player);

    const saved = await persistFranchiseDesignationsForPlayers(
      'franchise-a',
      [makePlayer('player-a'), makePlayer('player-b')],
      [designation('player-a')],
    );

    expect(saved).toHaveLength(1);
    expect(mocks.saveFranchisePlayer).toHaveBeenCalledWith(
      'franchise-a',
      expect.objectContaining({
        id: 'player-a',
        franchiseDesignations: [expect.objectContaining({ playerId: 'player-a' })],
      }),
    );
    expect(mocks.saveFranchisePlayer).not.toHaveBeenCalledWith(
      'franchise-a',
      expect.objectContaining({ id: 'player-b' }),
    );
    expect(leagueBuilderStorage.savePlayer).not.toHaveBeenCalled();
  });
});
