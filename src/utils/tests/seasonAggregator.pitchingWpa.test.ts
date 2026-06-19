import 'fake-indexeddb/auto';

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import { aggregateGameToSeason } from '../seasonAggregator';
import { getOrCreatePitchingStats } from '../seasonStorage';
import { resetTrackerDbForTests } from '../trackerDb';
import type { PersistedGameState } from '../gameStorage';
import type { KblWpaPlayerTotal } from '../kblWpaAttribution';

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

function pitcher(
  pitcherId: string,
  pitcherName: string,
  teamId: string,
  overrides: Partial<PersistedGameState['pitcherGameStats'][number]> = {},
): PersistedGameState['pitcherGameStats'][number] {
  return {
    pitcherId,
    pitcherName,
    teamId,
    isStarter: false,
    entryInning: 7,
    outsRecorded: 3,
    hitsAllowed: 0,
    runsAllowed: 0,
    earnedRuns: 0,
    walksAllowed: 0,
    strikeoutsThrown: 1,
    homeRunsAllowed: 0,
    hitBatters: 0,
    basesReachedViaError: 0,
    wildPitches: 0,
    pitchCount: 15,
    battersFaced: 3,
    consecutiveHRsAllowed: 0,
    firstInningRuns: 0,
    basesLoadedWalks: 0,
    inningsComplete: 1,
    decision: 'ND',
    save: false,
    hold: false,
    blownSave: false,
    ...overrides,
  };
}

function playerWpaTotal(
  playerId: string,
  playerName: string,
  teamId: string,
  pitchingWpa: number,
): KblWpaPlayerTotal {
  return {
    playerId,
    playerName,
    teamId,
    totalWpa: pitchingWpa,
    battingWpa: 0,
    pitchingWpa,
    catchingWpa: 0,
    fieldingWpa: 0,
    baserunningWpa: 0,
    managingWpa: 0,
  };
}

function gameState(
  gameId: string,
  pitcherGameStats: PersistedGameState['pitcherGameStats'],
  playerWpaTotals?: KblWpaPlayerTotal[],
): PersistedGameState {
  return {
    id: 'current',
    gameId,
    savedAt: 1,
    inning: 9,
    halfInning: 'BOTTOM',
    outs: 3,
    homeScore: 3,
    awayScore: 2,
    bases: { first: null, second: null, third: null },
    currentBatterIndex: 0,
    atBatCount: 36,
    awayTeamId: 'away',
    homeTeamId: 'home',
    awayTeamName: 'Away',
    homeTeamName: 'Home',
    seasonNumber: 1,
    playerStats: {},
    pitcherGameStats,
    fameEvents: [],
    lastHRBatterId: null,
    consecutiveHRCount: 0,
    inningStrikeouts: 0,
    maxDeficitAway: 0,
    maxDeficitHome: 0,
    activityLog: [],
    ...(playerWpaTotals === undefined ? {} : { playerWpaTotals }),
  };
}

describe('season aggregator pitching WPA rollup', () => {
  beforeEach(async () => {
    resetTrackerDbForTests();
    await deleteDatabase(DB_NAME);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    resetTrackerDbForTests();
    await deleteDatabase(DB_NAME);
  });

  test('sums pitcher pitchingWpa across aggregated games', async () => {
    const seasonId = 'pitching-wpa-sum-season';

    await expect(
      aggregateGameToSeason(
        gameState(
          'pitching-wpa-game-1',
          [pitcher('pitcher-a', 'Avery Arm', 'home')],
          [playerWpaTotal('pitcher-a', 'Avery Arm', 'home', 0.42)],
        ),
        { seasonId, detectMilestones: false },
      ),
    ).resolves.toMatchObject({ success: true });

    await expect(
      aggregateGameToSeason(
        gameState(
          'pitching-wpa-game-2',
          [pitcher('pitcher-a', 'Avery Arm', 'home')],
          [playerWpaTotal('pitcher-a', 'Avery Arm', 'home', -0.12)],
        ),
        { seasonId, detectMilestones: false },
      ),
    ).resolves.toMatchObject({ success: true });

    const stats = await getOrCreatePitchingStats(seasonId, 'pitcher-a', 'Avery Arm', 'home');
    expect(stats.games).toBe(2);
    expect(stats.pitchingWpa).toBeCloseTo(0.3, 10);
  });

  test('adds zero for a pitcher absent from playerWpaTotals', async () => {
    const seasonId = 'pitching-wpa-missing-season';

    await expect(
      aggregateGameToSeason(
        gameState(
          'pitching-wpa-missing-game',
          [pitcher('pitcher-b', 'Blake Bullpen', 'away')],
          [playerWpaTotal('pitcher-other', 'Other Pitcher', 'home', 0.9)],
        ),
        { seasonId, detectMilestones: false },
      ),
    ).resolves.toMatchObject({ success: true });

    const stats = await getOrCreatePitchingStats(seasonId, 'pitcher-b', 'Blake Bullpen', 'away');
    expect(stats.pitchingWpa).toBe(0);
    expect(Number.isNaN(stats.pitchingWpa)).toBe(false);
  });

  test('adds zero for all pitchers when playerWpaTotals is undefined', async () => {
    const seasonId = 'pitching-wpa-undefined-season';

    await expect(
      aggregateGameToSeason(
        gameState(
          'pitching-wpa-undefined-game',
          [
            pitcher('pitcher-c', 'Casey Closer', 'home'),
            pitcher('pitcher-d', 'Devon Setup', 'home'),
          ],
        ),
        { seasonId, detectMilestones: false },
      ),
    ).resolves.toMatchObject({ success: true });

    const pitcherC = await getOrCreatePitchingStats(seasonId, 'pitcher-c', 'Casey Closer', 'home');
    const pitcherD = await getOrCreatePitchingStats(seasonId, 'pitcher-d', 'Devon Setup', 'home');
    expect(pitcherC.pitchingWpa).toBe(0);
    expect(pitcherD.pitchingWpa).toBe(0);
  });
});
