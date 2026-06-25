import 'fake-indexeddb/auto';

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import type { PersistedGameState } from '../gameStorage';

const mocks = vi.hoisted(() => ({
  aggregateGameToSeason: vi.fn(),
  archiveCompletedGame: vi.fn(),
  getCompletedGameById: vi.fn(),
  resolveExhibitionLeagueId: vi.fn(),
  getGameHeader: vi.fn(),
  markAggregationFailed: vi.fn(),
  markGameAggregated: vi.fn(),
  registerAlmanacPlayers: vi.fn(),
  getEffectivePlayer: vi.fn(),
  getSeasonMetadata: vi.fn(),
  saveSeasonMetadata: vi.fn(),
  getSeasonPitchingStats: vi.fn(),
  calculateAndPersistSeasonWAR: vi.fn(),
  calculateAndPersistFranchiseTrueValueForSeason: vi.fn(),
  calculateAndPersistProjectedFranchiseDesignationsForSeason: vi.fn(),
}));

vi.mock('../seasonAggregator', () => ({
  aggregateGameToSeason: mocks.aggregateGameToSeason,
}));

vi.mock('../gameStorage', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../gameStorage')>();
  return {
    ...actual,
    archiveCompletedGame: mocks.archiveCompletedGame,
    getCompletedGameById: mocks.getCompletedGameById,
    resolveExhibitionLeagueId: mocks.resolveExhibitionLeagueId,
  };
});

vi.mock('../eventLog', () => ({
  getGameHeader: mocks.getGameHeader,
  markAggregationFailed: mocks.markAggregationFailed,
  markGameAggregated: mocks.markGameAggregated,
}));

vi.mock('../registerAlmanacPlayers', () => ({
  registerAlmanacPlayers: mocks.registerAlmanacPlayers,
}));

vi.mock('../playerOverrides', () => ({
  getEffectivePlayer: mocks.getEffectivePlayer,
}));

vi.mock('../seasonStorage', () => ({
  getSeasonMetadata: mocks.getSeasonMetadata,
  saveSeasonMetadata: mocks.saveSeasonMetadata,
  getSeasonPitchingStats: mocks.getSeasonPitchingStats,
}));

vi.mock('../../src_figma/app/engines/warOrchestrator', () => ({
  calculateAndPersistSeasonWAR: mocks.calculateAndPersistSeasonWAR,
}));

vi.mock('../franchiseTrueValueStorage', () => ({
  calculateAndPersistFranchiseTrueValueForSeason: mocks.calculateAndPersistFranchiseTrueValueForSeason,
}));

vi.mock('../franchiseDesignationStorage', () => ({
  calculateAndPersistProjectedFranchiseDesignationsForSeason: mocks.calculateAndPersistProjectedFranchiseDesignationsForSeason,
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
  getFranchiseTrueValueSnapshotRowsByScope,
  resetFranchiseTrueValueSnapshotsDatabaseForTests,
} from '../franchiseTrueValueSnapshotsStorage';
import { addGame, clearAllSchedules } from '../scheduleStorage';
import { resetTrackerDbForTests } from '../trackerDb';

const scope = {
  franchiseId: 'franchise-snapshot',
  seasonId: 'snapshot-season-1',
  statsScopeId: 'snapshot-season-1',
};

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
    gameId: 'snapshot-game-1',
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
    seasonId: scope.seasonId,
    statsScopeId: scope.statsScopeId,
    franchiseId: scope.franchiseId,
    competitionType: 'franchise',
    competitionId: scope.franchiseId,
    playerStats: {
      'player-1': {
        playerName: 'Player One',
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
        sb: 0,
        cs: 0,
        sf: 0,
        sh: 0,
        gidp: 0,
        putouts: 2,
        assists: 1,
        fieldingErrors: 0,
      },
    },
    pitcherGameStats: [],
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

function trueValueResult(rows: Array<{
  playerId: string;
  trueValue: number;
  valueDelta: number;
  warPercentile: number;
  computedAt: string;
}>) {
  return {
    rows,
    skippedRows: [],
    persisted: true,
    blockers: [],
  };
}

describe('processCompletedGame True Value snapshot capture', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    resetTrackerDbForTests();
    resetFranchiseTrueValueSnapshotsDatabaseForTests();
    await deleteDatabase('kbl-tracker').catch(() => undefined);
    await clearAllSchedules().catch(() => undefined);

    mocks.aggregateGameToSeason.mockResolvedValue({ success: true, milestones: null });
    mocks.archiveCompletedGame.mockResolvedValue(undefined);
    mocks.getCompletedGameById.mockResolvedValue(null);
    mocks.resolveExhibitionLeagueId.mockReturnValue(null);
    mocks.getGameHeader.mockResolvedValue(null);
    mocks.markAggregationFailed.mockResolvedValue(undefined);
    mocks.markGameAggregated.mockResolvedValue(undefined);
    mocks.registerAlmanacPlayers.mockResolvedValue(undefined);
    mocks.getEffectivePlayer.mockResolvedValue(null);
    mocks.getSeasonMetadata.mockResolvedValue({ seasonId: scope.seasonId, gamesPerTeam: 32 });
    mocks.saveSeasonMetadata.mockResolvedValue(undefined);
    mocks.getSeasonPitchingStats.mockResolvedValue([]);
    mocks.calculateAndPersistSeasonWAR.mockResolvedValue(undefined);
    mocks.calculateAndPersistFranchiseTrueValueForSeason.mockResolvedValue(trueValueResult([
      {
        playerId: 'player-1',
        trueValue: 12.5,
        valueDelta: 4.25,
        warPercentile: 0.8,
        computedAt: '2026-06-17T00:00:00.000Z',
      },
      {
        playerId: 'player-2',
        trueValue: 8.75,
        valueDelta: -1.5,
        warPercentile: 0.45,
        computedAt: '2026-06-17T00:00:00.000Z',
      },
    ]));
    mocks.calculateAndPersistProjectedFranchiseDesignationsForSeason.mockResolvedValue({
      rows: [],
      skippedRows: [],
      persisted: true,
      blockers: [],
    });
  });

  afterEach(async () => {
    resetTrackerDbForTests();
    resetFranchiseTrueValueSnapshotsDatabaseForTests();
    await deleteDatabase('kbl-tracker').catch(() => undefined);
    await clearAllSchedules().catch(() => undefined);
  });

  test('writes snapshot rows with TV fields and scheduled game-number checkpoint', async () => {
    const scheduledGame = await addGame({
      ...scope,
      seasonNumber: 1,
      gameNumber: 7,
      awayTeamId: 'team-a',
      homeTeamId: 'team-b',
    });

    await processCompletedGame(
      gameState({ scheduleGameId: scheduledGame.id }),
      { seasonId: scope.seasonId, detectMilestones: false },
      undefined,
      {
        seasonId: scope.seasonId,
        context: {
          ...scope,
          competitionType: 'franchise',
          competitionId: scope.franchiseId,
          franchiseId: scope.franchiseId,
          scheduleGameId: scheduledGame.id,
        },
      },
    );

    await expect(getFranchiseTrueValueSnapshotRowsByScope(scope)).resolves.toEqual([
      {
        ...scope,
        playerId: 'player-1',
        checkpoint: 7,
        trueValue: 12.5,
        valueDelta: 4.25,
        warPercentile: 0.8,
        computedAt: '2026-06-17T00:00:00.000Z',
      },
      {
        ...scope,
        playerId: 'player-2',
        checkpoint: 7,
        trueValue: 8.75,
        valueDelta: -1.5,
        warPercentile: 0.45,
        computedAt: '2026-06-17T00:00:00.000Z',
      },
    ]);
  });

  test('re-completing the same game overwrites the same checkpoint instead of duplicating rows', async () => {
    const scheduledGame = await addGame({
      ...scope,
      seasonNumber: 1,
      gameNumber: 3,
      awayTeamId: 'team-a',
      homeTeamId: 'team-b',
    });
    mocks.calculateAndPersistFranchiseTrueValueForSeason
      .mockResolvedValueOnce(trueValueResult([{
        playerId: 'player-1',
        trueValue: 10,
        valueDelta: 1,
        warPercentile: 0.6,
        computedAt: '2026-06-17T00:00:00.000Z',
      }]))
      .mockResolvedValueOnce(trueValueResult([{
        playerId: 'player-1',
        trueValue: 14,
        valueDelta: 5,
        warPercentile: 0.9,
        computedAt: '2026-06-17T00:00:00.000Z',
      }]));
    const completedGame = gameState({ scheduleGameId: scheduledGame.id });
    const archiveOptions = {
      seasonId: scope.seasonId,
      context: {
        ...scope,
        competitionType: 'franchise' as const,
        competitionId: scope.franchiseId,
        franchiseId: scope.franchiseId,
        scheduleGameId: scheduledGame.id,
      },
    };

    await processCompletedGame(completedGame, { seasonId: scope.seasonId, detectMilestones: false }, undefined, archiveOptions);
    await processCompletedGame(completedGame, { seasonId: scope.seasonId, detectMilestones: false }, undefined, archiveOptions);

    await expect(getFranchiseTrueValueSnapshotRowsByScope(scope)).resolves.toEqual([
      {
        ...scope,
        playerId: 'player-1',
        checkpoint: 3,
        trueValue: 14,
        valueDelta: 5,
        warPercentile: 0.9,
        computedAt: '2026-06-17T00:00:00.000Z',
      },
    ]);
  });

  test('playoff and elimination completions do not write regular-season snapshot rows', async () => {
    await processCompletedGame(
      gameState({
        gameId: 'snapshot-playoff',
        competitionType: 'playoff',
        playoffId: 'playoff-1',
      }),
      { seasonId: scope.seasonId, detectMilestones: false },
      undefined,
      {
        seasonId: scope.seasonId,
        context: {
          ...scope,
          competitionType: 'playoff',
          competitionId: 'playoff-1',
          franchiseId: scope.franchiseId,
          playoffId: 'playoff-1',
        },
      },
    );
    await processCompletedGame(
      gameState({
        gameId: 'snapshot-elimination',
        competitionType: 'elimination',
        isEliminationGame: true,
      }),
      { seasonId: scope.seasonId, detectMilestones: false },
      undefined,
      {
        seasonId: scope.seasonId,
        context: {
          ...scope,
          competitionType: 'elimination',
          competitionId: 'elimination-1',
          franchiseId: scope.franchiseId,
          isEliminationGame: true,
        },
      },
    );

    expect(mocks.calculateAndPersistFranchiseTrueValueForSeason).not.toHaveBeenCalled();
    await expect(getFranchiseTrueValueSnapshotRowsByScope(scope)).resolves.toEqual([]);
  });

  test('snapshot-store failure warns and does not fail game completion', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const originalPut = IDBObjectStore.prototype.put;
    const putSpy = vi.spyOn(IDBObjectStore.prototype, 'put').mockImplementation(function put(value: unknown, key?: IDBValidKey) {
      if (this.name === 'franchiseTrueValueSnapshots') {
        throw new Error('snapshot store failed');
      }
      return originalPut.call(this, value, key);
    });

    await expect(processCompletedGame(
      gameState({ gameId: 'snapshot-store-failure' }),
      { seasonId: scope.seasonId, detectMilestones: false },
    )).resolves.toMatchObject({ aggregation: { success: true } });

    expect(warn).toHaveBeenCalledWith(
      '[TrueValueSnapshots] failed to persist True Value snapshots for completed game snapshot-store-failure:',
      expect.any(Error),
    );
    expect(mocks.archiveCompletedGame).toHaveBeenCalled();

    putSpy.mockRestore();
    warn.mockRestore();
  });
});
