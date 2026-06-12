import 'fake-indexeddb/auto';

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  calculateAndPersistSeasonWAR: vi.fn().mockResolvedValue([]),
  getGameHeader: vi.fn().mockResolvedValue(null),
  markAggregationFailed: vi.fn().mockResolvedValue(undefined),
  markGameAggregated: vi.fn().mockResolvedValue(undefined),
  registerAlmanacPlayers: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../src_figma/app/engines/warOrchestrator', () => ({
  calculateAndPersistSeasonWAR: mocks.calculateAndPersistSeasonWAR,
}));

vi.mock('../eventLog', () => ({
  getGameHeader: mocks.getGameHeader,
  markAggregationFailed: mocks.markAggregationFailed,
  markGameAggregated: mocks.markGameAggregated,
  getFieldingEventsForScope: vi.fn().mockResolvedValue([]),
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

import { calculateAndPersistSeasonWAR } from '../../src_figma/app/engines/warOrchestrator';
import { processCompletedGame } from '../processCompletedGame';
import { getSeasonMetadata } from '../seasonStorage';
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
    gameId: 'war-metadata-game',
    savedAt: 1,
    inning: 9,
    halfInning: 'BOTTOM',
    outs: 3,
    homeScore: 3,
    awayScore: 1,
    bases: { first: null, second: null, third: null },
    currentBatterIndex: 0,
    atBatCount: 36,
    awayTeamId: 'team-a',
    homeTeamId: 'team-b',
    awayTeamName: 'Team A',
    homeTeamName: 'Team B',
    seasonNumber: 1,
    seasonId: 'war-metadata-season',
    statsScopeId: 'war-metadata-season',
    franchiseId: 'franchise-a',
    competitionType: 'franchise',
    competitionId: 'franchise-a',
    playerStats: {
      'batter-1': {
        playerName: 'Batter One',
        teamId: 'team-a',
        pa: 4,
        ab: 4,
        h: 1,
        singles: 1,
        doubles: 0,
        triples: 0,
        hr: 0,
        rbi: 0,
        r: 1,
        bb: 0,
        hbp: 0,
        k: 1,
        sb: 0,
        cs: 0,
        sf: 0,
        sh: 0,
        gidp: 0,
        putouts: 1,
        assists: 0,
        fieldingErrors: 0,
      },
    },
    pitcherGameStats: [],
    awayLineup: [{ playerId: 'batter-1', playerName: 'Batter One', position: 'SS' }],
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

describe('processCompletedGame WAR season metadata gate', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    resetTrackerDbForTests();
    await deleteDatabase('kbl-tracker').catch(() => undefined);
  });

  afterEach(async () => {
    resetTrackerDbForTests();
    await deleteDatabase('kbl-tracker').catch(() => undefined);
  });

  test('skips WAR and keeps completion successful when gamesPerTeam is unresolved', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    await processCompletedGame(gameState(), {
      seasonId: 'war-metadata-season',
      detectMilestones: false,
    });

    expect(calculateAndPersistSeasonWAR).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith('[WAR] skipped: gamesPerTeam unresolved for season war-metadata-season');
    await expect(getSeasonMetadata('war-metadata-season')).resolves.toMatchObject({
      gamesPerTeam: null,
    });

    warn.mockRestore();
  });

  test('passes explicit gamesPerTeam through to the WAR orchestrator without defaulting', async () => {
    await processCompletedGame(gameState({ gameId: 'war-metadata-game-37' }), {
      seasonId: 'war-metadata-season-37',
      detectMilestones: false,
      milestoneConfig: { gamesPerSeason: 37, inningsPerGame: 6 },
    });

    expect(calculateAndPersistSeasonWAR).toHaveBeenCalledTimes(1);
    expect(calculateAndPersistSeasonWAR).toHaveBeenCalledWith(
      'war-metadata-season-37',
      37,
      ['batter-1'],
      expect.any(Map),
    );
    await expect(getSeasonMetadata('war-metadata-season-37')).resolves.toMatchObject({
      gamesPerTeam: 37,
    });
  });

  test('uses options seasonId for WAR when archiveOptions seasonId differs', async () => {
    await processCompletedGame(
      gameState({
        gameId: 'war-metadata-game-scope',
        seasonId: 'game-state-season',
        statsScopeId: 'game-state-season',
      }),
      {
        seasonId: 'aggregate-season',
        detectMilestones: false,
        milestoneConfig: { gamesPerSeason: 28, inningsPerGame: 6 },
      },
      undefined,
      {
        seasonId: 'archive-season',
      },
    );

    expect(calculateAndPersistSeasonWAR).toHaveBeenCalledWith(
      'aggregate-season',
      28,
      ['batter-1'],
      expect.any(Map),
    );
  });
});
