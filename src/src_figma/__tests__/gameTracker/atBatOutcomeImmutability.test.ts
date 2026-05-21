import 'fake-indexeddb/auto';

import { afterEach, describe, expect, test } from 'vitest';

import {
  getAtBatEvent,
  logAtBatEvent,
  updateAtBatEvent,
  type AtBatEvent,
} from '../../../utils/eventLog';

const deleteEventLogDB = () => new Promise<void>((resolve) => {
  const request = indexedDB.deleteDatabase('kbl-event-log');
  const finish = () => resolve();
  request.onsuccess = finish;
  request.onerror = finish;
  request.onblocked = finish;
  setTimeout(finish, 50);
});

afterEach(async () => {
  await deleteEventLogDB();
});

function createAtBatEvent(overrides: Partial<AtBatEvent> = {}): AtBatEvent {
  return {
    eventId: 'immutability-game_1',
    gameId: 'immutability-game',
    eventIndex: 1,
    timestamp: 1,
    batterId: 'away-batter',
    batterName: 'Away Batter',
    batterTeamId: 'away',
    pitcherId: 'home-pitcher',
    pitcherName: 'Home Pitcher',
    pitcherTeamId: 'home',
    result: 'GO',
    rbiCount: 0,
    runsScored: [],
    inning: 1,
    halfInning: 'TOP',
    outs: 0,
    runners: { first: null, second: null, third: null },
    awayScore: 0,
    homeScore: 0,
    outsAfter: 1,
    runnersAfter: { first: null, second: null, third: null },
    awayScoreAfter: 0,
    homeScoreAfter: 0,
    leverageIndex: 1,
    winProbabilityBefore: 0.5,
    winProbabilityAfter: 0.48,
    wpa: -0.02,
    ballInPlay: null,
    fameEvents: [],
    isLeadoff: true,
    isClutch: false,
    isWalkOff: false,
    version: 1,
    ...overrides,
  };
}

describe('Mode 2 v1 at-bat outcome immutability', () => {
  test('rejects unaudited result changes', async () => {
    await logAtBatEvent(createAtBatEvent());

    await expect(
      updateAtBatEvent('immutability-game_1', { result: 'HR' }),
    ).rejects.toThrow('outcome corrections must include a version bump and editHistory');

    const persisted = await getAtBatEvent('immutability-game_1');
    expect(persisted?.result).toBe('GO');
    expect(persisted?.version).toBe(1);
  });

  test('allows versioned result corrections with edit history', async () => {
    await logAtBatEvent(createAtBatEvent());

    await updateAtBatEvent('immutability-game_1', {
      result: 'K',
      version: 2,
      editHistory: [
        {
          field: 'result',
          oldValue: 'GO',
          newValue: 'K',
          timestamp: 2,
        },
      ],
    });

    const persisted = await getAtBatEvent('immutability-game_1');
    expect(persisted?.result).toBe('K');
    expect(persisted?.version).toBe(2);
    expect(persisted?.editHistory).toEqual([
      expect.objectContaining({
        field: 'result',
        oldValue: 'GO',
        newValue: 'K',
      }),
    ]);
  });
});
