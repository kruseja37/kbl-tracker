import 'fake-indexeddb/auto';

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import {
  createGameHeader,
  getSeasonInjuryCount,
  getSeasonInjuryCountsByPlayer,
  logBetweenPlayEvent,
  type BetweenPlayEvent,
} from '../eventLog';

vi.mock('../syncEngine', () => ({
  syncEngine: {
    isSuppressed: () => true,
    upsert: vi.fn(),
    remove: vi.fn(),
  },
}));

const DB_NAME = 'kbl-event-log';

function deleteDatabase(name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => resolve();
  });
}

async function seedGame(seasonId: string, gameId: string, date: number): Promise<void> {
  await createGameHeader({
    gameId,
    seasonId,
    date,
    homeTeamId: 'home',
    awayTeamId: 'away',
    homeTeamName: 'Home',
    awayTeamName: 'Away',
    isComplete: true,
  });
}

function betweenPlayEvent(
  gameId: string,
  eventIndex: number,
  overrides: Partial<BetweenPlayEvent>,
): BetweenPlayEvent {
  return {
    eventId: `${gameId}-bp-${eventIndex}`,
    gameId,
    timestamp: eventIndex,
    eventIndex,
    type: 'injury',
    gameState: {
      inning: 1,
      halfInning: 'TOP',
      outs: 0,
      score: { away: 0, home: 0 },
    },
    playerStateChange: {
      playerId: 'injured-player',
      playerName: 'Injured Player',
      stateType: 'injury',
      previousValue: 'healthy',
      newValue: 'injured',
      reason: 'collision',
    },
    ...overrides,
  };
}

describe('eventLog season injury counts', () => {
  beforeEach(async () => {
    await deleteDatabase(DB_NAME);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await deleteDatabase(DB_NAME);
  });

  test('derives per-player season injury counts from active injury BetweenPlayEvents only', async () => {
    const seasonId = 'injury-count-season';
    await seedGame(seasonId, 'injury-game-1', 1);
    await seedGame(seasonId, 'injury-game-2', 2);

    await logBetweenPlayEvent(betweenPlayEvent('injury-game-1', 1, {}));
    await logBetweenPlayEvent(betweenPlayEvent('injury-game-2', 1, {}));
    await logBetweenPlayEvent(
      betweenPlayEvent('injury-game-1', 2, {
        eventId: 'ignored-mojo-event',
        type: 'mojo_change',
        playerStateChange: {
          playerId: 'injured-player',
          playerName: 'Injured Player',
          stateType: 'mojo',
          previousValue: 'Neutral',
          newValue: 'Locked In',
        },
      }),
    );
    await logBetweenPlayEvent(
      betweenPlayEvent('injury-game-2', 2, {
        eventId: 'ignored-undone-injury',
        undoneAt: 99,
      }),
    );

    const counts = await getSeasonInjuryCountsByPlayer(seasonId);

    expect(counts.get('injured-player')).toBe(2);
    expect(counts.has('healthy-player')).toBe(false);
    await expect(getSeasonInjuryCount(seasonId, 'injured-player')).resolves.toBe(2);
    await expect(getSeasonInjuryCount(seasonId, 'healthy-player')).resolves.toBe(0);
  });
});
