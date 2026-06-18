import 'fake-indexeddb/auto';

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { aggregateGameToSeason } from '../seasonAggregator';
import { getOrCreateFieldingStats } from '../seasonStorage';
import { resetTrackerDbForTests } from '../trackerDb';
import type { FieldingEvent } from '../eventLog';
import type { PersistedGameState } from '../gameStorage';

vi.mock('../syncEngine', () => ({
  syncEngine: {
    isSuppressed: () => true,
    upsert: vi.fn(),
    remove: vi.fn(),
  },
}));

const DB_NAME = 'kbl-tracker';

function deleteDatabase(name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => resolve();
  });
}

function playerStats(
  playerName: string,
  teamId: string,
  overrides: Partial<PersistedGameState['playerStats'][string]> = {},
): PersistedGameState['playerStats'][string] {
  return {
    playerName,
    teamId,
    pa: 0,
    ab: 0,
    h: 0,
    singles: 0,
    doubles: 0,
    triples: 0,
    hr: 0,
    rbi: 0,
    r: 0,
    bb: 0,
    hbp: 0,
    k: 0,
    sb: 0,
    cs: 0,
    sf: 0,
    sh: 0,
    gidp: 0,
    putouts: 0,
    assists: 0,
    fieldingErrors: 0,
    grandSlams: 0,
    ...overrides,
  };
}

function gameState(
  gameId: string,
  fieldingEvents: FieldingEvent[],
): PersistedGameState {
  return {
    id: 'current',
    gameId,
    savedAt: 1,
    inning: 1,
    halfInning: 'TOP',
    outs: 0,
    homeScore: 0,
    awayScore: 0,
    bases: { first: null, second: null, third: null },
    currentBatterIndex: 0,
    atBatCount: 0,
    awayTeamId: 'away',
    homeTeamId: 'home',
    awayTeamName: 'Away',
    homeTeamName: 'Home',
    seasonNumber: 1,
    playerStats: {
      'player-x': playerStats('Player X', 'away'),
      'player-y': playerStats('Player Y', 'away'),
      'player-z': playerStats('Player Z', 'away'),
    },
    pitcherGameStats: [],
    fameEvents: [],
    lastHRBatterId: null,
    consecutiveHRCount: 0,
    inningStrikeouts: 0,
    maxDeficitAway: 0,
    maxDeficitHome: 0,
    activityLog: [],
    fieldingEvents,
  };
}

function fieldingEvent(
  gameId: string,
  sequence: number,
  playerId: string,
  playType: FieldingEvent['playType'],
): FieldingEvent {
  return {
    fieldingEventId: `${gameId}-fielding-${sequence}`,
    gameId,
    atBatEventId: `${gameId}-ab-${sequence}`,
    sequence,
    playerId,
    playerName: playerId,
    position: playerId === 'player-y' ? 'RF' : 'CF',
    teamId: 'away',
    playType,
    difficulty: 'likely',
    ballInPlay: {
      trajectory: 'fly',
      zone: 8,
      velocity: 'medium',
      fielderIds: [playerId],
      primaryFielderId: playerId,
    },
    success: true,
    runsPreventedOrAllowed: playType === 'base_save' ? 1 : 0,
  };
}

describe('season aggregator outfield arm capture', () => {
  beforeEach(async () => {
    resetTrackerDbForTests();
    await deleteDatabase(DB_NAME);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    resetTrackerDbForTests();
    await deleteDatabase(DB_NAME);
  });

  test('accumulates outfield assists and baserunners held from FieldingEvent rows across games', async () => {
    const seasonId = 'of-arm-season';

    await expect(
      aggregateGameToSeason(
        gameState('of-arm-game-1', [
          fieldingEvent('of-arm-game-1', 1, 'player-x', 'outfield_assist'),
          fieldingEvent('of-arm-game-1', 2, 'player-x', 'outfield_assist'),
          fieldingEvent('of-arm-game-1', 3, 'player-y', 'base_save'),
        ]),
        { seasonId, detectMilestones: false },
      ),
    ).resolves.toMatchObject({ success: true });

    await expect(
      aggregateGameToSeason(
        gameState('of-arm-game-2', [
          fieldingEvent('of-arm-game-2', 1, 'player-x', 'outfield_assist'),
          fieldingEvent('of-arm-game-2', 2, 'player-y', 'base_save'),
        ]),
        { seasonId, detectMilestones: false },
      ),
    ).resolves.toMatchObject({ success: true });

    const playerX = await getOrCreateFieldingStats(seasonId, 'player-x', 'Player X', 'away');
    const playerY = await getOrCreateFieldingStats(seasonId, 'player-y', 'Player Y', 'away');

    expect(playerX.outfieldAssists).toBe(3);
    expect(playerX.baserunnersHeld).toBe(0);
    expect(playerY.outfieldAssists).toBe(0);
    expect(playerY.baserunnersHeld).toBe(2);
  });

  test('leaves outfield arm fields at zero when the game has no matching FieldingEvent rows', async () => {
    const seasonId = 'of-arm-empty-season';

    await expect(
      aggregateGameToSeason(
        gameState('of-arm-empty-game', []),
        { seasonId, detectMilestones: false },
      ),
    ).resolves.toMatchObject({ success: true });

    const playerZ = await getOrCreateFieldingStats(seasonId, 'player-z', 'Player Z', 'away');
    expect(playerZ.outfieldAssists).toBe(0);
    expect(playerZ.baserunnersHeld).toBe(0);
  });
});
