import 'fake-indexeddb/auto';

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getGameHeader: vi.fn().mockResolvedValue(null),
  markAggregationFailed: vi.fn().mockResolvedValue(undefined),
  markGameAggregated: vi.fn().mockResolvedValue(undefined),
  registerAlmanacPlayers: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../eventLog', () => ({
  getGameHeader: mocks.getGameHeader,
  markAggregationFailed: mocks.markAggregationFailed,
  markGameAggregated: mocks.markGameAggregated,
  getFieldingEventsForScope: vi.fn().mockResolvedValue([]),
  getGameHeadersForScope: vi.fn().mockResolvedValue([]),
}));

vi.mock('../registerAlmanacPlayers', () => ({
  registerAlmanacPlayers: mocks.registerAlmanacPlayers,
}));

vi.mock('../syncEngine', () => ({
  syncEngine: {
    isSuppressed: () => true,
    upsert: vi.fn(),
    remove: vi.fn(),
  },
}));

import { processCompletedGame } from '../processCompletedGame';
import {
  getOrCreateSeason,
  getSeasonBattingStats,
  getSeasonMetadata,
  getSeasonPitchingStats,
} from '../seasonStorage';
import { resetTrackerDbForTests } from '../trackerDb';
import type { PersistedGameState } from '../gameStorage';

function deleteDatabase(name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => resolve();
  });
}

function gameState(overrides: Partial<PersistedGameState> = {}): PersistedGameState {
  return {
    id: 'current',
    gameId: 'war-game-1',
    savedAt: 1,
    inning: 9,
    halfInning: 'BOTTOM',
    outs: 3,
    homeScore: 5,
    awayScore: 2,
    bases: { first: null, second: null, third: null },
    currentBatterIndex: 0,
    atBatCount: 36,
    awayTeamId: 'team-a',
    homeTeamId: 'team-b',
    awayTeamName: 'Team A',
    homeTeamName: 'Team B',
    seasonNumber: 1,
    seasonId: 'war-season-1',
    statsScopeId: 'war-season-1',
    franchiseId: 'franchise-a',
    competitionType: 'franchise',
    competitionId: 'franchise-a',
    playerStats: {
      'batter-1': {
        playerName: 'Batter One',
        teamId: 'team-a',
        pa: 4,
        ab: 4,
        h: 2,
        singles: 1,
        doubles: 1,
        triples: 0,
        hr: 0,
        rbi: 1,
        r: 1,
        bb: 0,
        hbp: 0,
        k: 1,
        sb: 1,
        cs: 0,
        sf: 0,
        sh: 0,
        gidp: 0,
        putouts: 2,
        assists: 1,
        fieldingErrors: 0,
      },
    },
    pitcherGameStats: [
      {
        pitcherId: 'pitcher-1',
        pitcherName: 'Pitcher One',
        teamId: 'team-b',
        isStarter: true,
        entryInning: 1,
        outsRecorded: 18,
        hitsAllowed: 4,
        runsAllowed: 2,
        earnedRuns: 2,
        walksAllowed: 1,
        strikeoutsThrown: 6,
        homeRunsAllowed: 0,
        hitBatters: 0,
        basesReachedViaError: 0,
        wildPitches: 0,
        pitchCount: 88,
        battersFaced: 24,
        consecutiveHRsAllowed: 0,
        firstInningRuns: 0,
        basesLoadedWalks: 0,
        inningsComplete: 6,
        decision: 'W',
        save: false,
        hold: false,
        blownSave: false,
      },
    ],
    awayLineup: [{ playerId: 'batter-1', playerName: 'Batter One', position: 'SS' }],
    homeLineupState: {
      lineup: [],
      bench: [],
      usedPlayers: [],
      currentPitcher: {
        playerId: 'pitcher-1',
        playerName: 'Pitcher One',
        position: 'SP',
        battingOrder: 10,
        enteredInning: 1,
        isStarter: true,
      },
    },
    fameEvents: [],
    lastHRBatterId: null,
    consecutiveHRCount: 0,
    inningStrikeouts: 0,
    maxDeficitAway: 0,
    maxDeficitHome: 0,
    activityLog: [],
    ...overrides,
  };
}

describe('processCompletedGame WAR persistence', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    resetTrackerDbForTests();
    await deleteDatabase('kbl-tracker').catch(() => undefined);
  });

  afterEach(async () => {
    resetTrackerDbForTests();
    await deleteDatabase('kbl-tracker').catch(() => undefined);
  });

  test('persists season WAR rows from stored gamesPerTeam metadata when completion passes seasonId only', async () => {
    await getOrCreateSeason('war-season-1', 1, 'Season 1', 0, 32);

    await processCompletedGame(gameState(), {
      seasonId: 'war-season-1',
      detectMilestones: false,
    });

    const [batting] = await getSeasonBattingStats('war-season-1');
    const [pitching] = await getSeasonPitchingStats('war-season-1');

    expect(batting.playerId).toBe('batter-1');
    expect(typeof batting.bwar).toBe('number');
    expect(typeof batting.rwar).toBe('number');
    expect(typeof batting.totalWar).toBe('number');
    expect(pitching.playerId).toBe('pitcher-1');
    expect(typeof pitching.pwar).toBe('number');
    await expect(getSeasonMetadata('war-season-1')).resolves.toMatchObject({
      gamesPerTeam: 32,
    });
  });

  test('null gamesPerTeam metadata skips WAR without blocking game completion', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    await getOrCreateSeason('war-season-null', 1, 'Season 1', 0, null);

    await processCompletedGame(gameState({
      gameId: 'war-game-null',
      seasonId: 'war-season-null',
      statsScopeId: 'war-season-null',
    }), {
      seasonId: 'war-season-null',
      detectMilestones: false,
    });

    const [batting] = await getSeasonBattingStats('war-season-null');
    expect(batting.playerId).toBe('batter-1');
    expect(batting.bwar).toBeUndefined();
    expect(warn).toHaveBeenCalledWith('[WAR] skipped: gamesPerTeam unresolved for season war-season-null');

    warn.mockRestore();
  });
});
