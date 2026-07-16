import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('../../../utils/syncEngine', () => ({
  syncEngine: {
    isSuppressed: () => true,
    upsert: vi.fn(),
    remove: vi.fn(),
  },
}));

import {
  addGame,
  addSeries,
  clearAllSchedules,
  clearFranchiseSeasonSchedule,
  completeGame,
  completeFranchiseScheduleGameScoreOnly,
  deleteGame,
  getAllGames,
  getAllGamesByFranchise,
  getGame,
  getNextGameNumberForFranchise,
  getScheduleMetadataByFranchise,
  getTeamScheduleStatsForFranchise,
  importFranchiseScheduleRows,
  updateGame,
} from '../../../utils/scheduleStorage';
import { archiveCompletedGame, getRecentGames, type PersistedGameState } from '../../../utils/gameStorage';
import { calculateStandings, getSeasonBattingStats } from '../../../utils/seasonStorage';
import { resetTrackerDbForTests } from '../../../utils/trackerDb';

function deleteDatabase(name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => resolve();
  });
}

function persistedGameState(
  overrides: Partial<PersistedGameState> = {},
): PersistedGameState {
  return {
    id: 'current',
    gameId: 'completed-game',
    savedAt: Date.now(),
    inning: 9,
    halfInning: 'BOTTOM',
    outs: 3,
    homeScore: 5,
    awayScore: 3,
    bases: { first: null, second: null, third: null },
    currentBatterIndex: 0,
    atBatCount: 0,
    awayTeamId: 'team-a',
    homeTeamId: 'team-b',
    awayTeamName: 'Team A',
    homeTeamName: 'Team B',
    seasonNumber: 1,
    playerStats: {},
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

describe('scheduleStorage franchise scoping', () => {
  beforeEach(async () => {
    resetTrackerDbForTests();
    await deleteDatabase('kbl-tracker').catch(() => undefined);
    await clearAllSchedules();
  });

  test('franchise rows do not bleed across franchises or into unscoped schedule reads', async () => {
    const franchiseOneGameOne = await addGame({
      franchiseId: 'franchise-1',
      seasonNumber: 1,
      awayTeamId: 'team-a',
      homeTeamId: 'team-b',
    });
    const franchiseTwoGameOne = await addGame({
      franchiseId: 'franchise-2',
      seasonNumber: 1,
      awayTeamId: 'team-c',
      homeTeamId: 'team-d',
    });
    const franchiseOneGameTwo = await addGame({
      franchiseId: 'franchise-1',
      seasonNumber: 1,
      awayTeamId: 'team-c',
      homeTeamId: 'team-a',
    });
    const globalGame = await addGame({
      seasonNumber: 1,
      awayTeamId: 'global-a',
      homeTeamId: 'global-b',
    });

    expect(franchiseOneGameOne.gameNumber).toBe(1);
    expect(franchiseTwoGameOne.gameNumber).toBe(1);
    expect(franchiseOneGameTwo.gameNumber).toBe(2);
    expect(globalGame.gameNumber).toBe(1);

    await expect(getNextGameNumberForFranchise('franchise-1', 1)).resolves.toBe(3);
    await expect(getNextGameNumberForFranchise('franchise-2', 1)).resolves.toBe(2);

    expect((await getAllGamesByFranchise('franchise-1', 1)).map(game => game.id)).toEqual([
      franchiseOneGameOne.id,
      franchiseOneGameTwo.id,
    ]);
    expect((await getAllGamesByFranchise('franchise-2', 1)).map(game => game.id)).toEqual([
      franchiseTwoGameOne.id,
    ]);
    expect((await getAllGames(1)).map(game => game.id)).toEqual([globalGame.id]);
  });

  test('franchise metadata and team stats are calculated from scoped rows only', async () => {
    const franchiseOneGame = await addGame({
      franchiseId: 'franchise-1',
      seasonNumber: 1,
      awayTeamId: 'team-a',
      homeTeamId: 'team-b',
    });
    await addGame({
      franchiseId: 'franchise-1',
      seasonNumber: 1,
      awayTeamId: 'team-c',
      homeTeamId: 'team-a',
    });
    await addGame({
      franchiseId: 'franchise-2',
      seasonNumber: 1,
      awayTeamId: 'team-a',
      homeTeamId: 'team-d',
    });

    await completeGame(franchiseOneGame.id, {
      awayScore: 4,
      homeScore: 2,
      winningTeamId: 'team-a',
      losingTeamId: 'team-b',
      gameLogId: 'completed-1',
    });

    await expect(getScheduleMetadataByFranchise('franchise-1', 1)).resolves.toMatchObject({
      seasonNumber: 1,
      totalGamesScheduled: 2,
      totalGamesCompleted: 1,
    });
    await expect(getScheduleMetadataByFranchise('franchise-2', 1)).resolves.toMatchObject({
      seasonNumber: 1,
      totalGamesScheduled: 1,
      totalGamesCompleted: 0,
    });
    await expect(getTeamScheduleStatsForFranchise('franchise-1', 1, 'team-a')).resolves.toMatchObject({
      teamId: 'team-a',
      wins: 1,
      losses: 0,
      gamesScheduled: 2,
      gamesRemaining: 1,
    });
  });

  test('score-only completion marks a franchise schedule row without creating player or game archives', async () => {
    const scheduledGame = await addGame({
      franchiseId: 'franchise-score-only',
      seasonNumber: 1,
      seasonId: 'franchise-score-only-season-1',
      statsScopeId: 'franchise-score-only-season-1',
      awayTeamId: 'team-a',
      homeTeamId: 'team-b',
      date: 'July 12',
    });

    const completed = await completeFranchiseScheduleGameScoreOnly({
      scheduleGameId: scheduledGame.id,
      franchiseId: 'franchise-score-only',
      seasonId: 'franchise-score-only-season-1',
      seasonNumber: 1,
      awayScore: 6,
      homeScore: 4,
    });

    expect(completed).toMatchObject({
      id: scheduledGame.id,
      franchiseId: 'franchise-score-only',
      seasonId: 'franchise-score-only-season-1',
      statsScopeId: 'franchise-score-only-season-1',
      status: 'COMPLETED',
      completionSource: 'score-only',
      scoreOnlyResultId: `score-only:franchise-score-only:franchise-score-only-season-1:${scheduledGame.id}`,
      result: {
        awayScore: 6,
        homeScore: 4,
        winningTeamId: 'team-a',
        losingTeamId: 'team-b',
      },
    });
    expect(completed.gameLogId).toBeUndefined();
    await expect(getRecentGames(10, { seasonId: 'franchise-score-only-season-1' })).resolves.toEqual([]);
    await expect(getSeasonBattingStats('franchise-score-only-season-1')).resolves.toEqual([]);
  });

  test('score-only completion validates franchise, season, pending state, and non-tie final score', async () => {
    const scheduledGame = await addGame({
      franchiseId: 'franchise-score-only',
      seasonNumber: 2,
      seasonId: 'franchise-score-only-season-2',
      awayTeamId: 'team-a',
      homeTeamId: 'team-b',
    });

    await expect(completeFranchiseScheduleGameScoreOnly({
      scheduleGameId: scheduledGame.id,
      franchiseId: 'other-franchise',
      seasonId: 'franchise-score-only-season-2',
      seasonNumber: 2,
      awayScore: 2,
      homeScore: 1,
    })).rejects.toThrow('does not belong to this franchise');
    await expect(completeFranchiseScheduleGameScoreOnly({
      scheduleGameId: scheduledGame.id,
      franchiseId: 'franchise-score-only',
      seasonId: 'other-season',
      seasonNumber: 2,
      awayScore: 2,
      homeScore: 1,
    })).rejects.toThrow('does not belong to this season');
    await expect(completeFranchiseScheduleGameScoreOnly({
      scheduleGameId: scheduledGame.id,
      franchiseId: 'franchise-score-only',
      seasonId: 'franchise-score-only-season-2',
      seasonNumber: 2,
      awayScore: 1,
      homeScore: 1,
    })).rejects.toThrow('cannot end in a tie');
  });

  test('score-only results are included in standings without player-stat side effects', async () => {
    const first = await addGame({
      franchiseId: 'franchise-standings',
      seasonNumber: 3,
      seasonId: 'franchise-standings-season-3',
      awayTeamId: 'team-a',
      homeTeamId: 'team-b',
    });
    const second = await addGame({
      franchiseId: 'franchise-standings',
      seasonNumber: 3,
      seasonId: 'franchise-standings-season-3',
      awayTeamId: 'team-c',
      homeTeamId: 'team-a',
    });

    await completeFranchiseScheduleGameScoreOnly({
      scheduleGameId: first.id,
      franchiseId: 'franchise-standings',
      seasonId: 'franchise-standings-season-3',
      seasonNumber: 3,
      awayScore: 7,
      homeScore: 5,
    });
    await completeFranchiseScheduleGameScoreOnly({
      scheduleGameId: second.id,
      franchiseId: 'franchise-standings',
      seasonId: 'franchise-standings-season-3',
      seasonNumber: 3,
      awayScore: 1,
      homeScore: 3,
    });

    const standings = await calculateStandings('franchise-standings-season-3');
    expect(standings.find((team) => team.teamId === 'team-a')).toMatchObject({
      wins: 2,
      losses: 0,
      runsScored: 10,
      runsAllowed: 6,
      runDiff: 4,
      homeRecord: { wins: 1, losses: 0 },
      awayRecord: { wins: 1, losses: 0 },
    });
    expect(standings.find((team) => team.teamId === 'team-b')).toMatchObject({
      wins: 0,
      losses: 1,
    });
    await expect(getSeasonBattingStats('franchise-standings-season-3')).resolves.toEqual([]);
  });

  test('score-only standings do not include playoff archives from the same season scope', async () => {
    const scoreOnlyGame = await addGame({
      franchiseId: 'franchise-standings',
      seasonNumber: 6,
      seasonId: 'franchise-standings-season-6',
      awayTeamId: 'team-a',
      homeTeamId: 'team-b',
    });

    await completeFranchiseScheduleGameScoreOnly({
      scheduleGameId: scoreOnlyGame.id,
      franchiseId: 'franchise-standings',
      seasonId: 'franchise-standings-season-6',
      seasonNumber: 6,
      awayScore: 4,
      homeScore: 2,
    });
    await archiveCompletedGame(
      persistedGameState({
        gameId: 'playoff-archive-same-season',
        seasonId: 'franchise-standings-season-6',
        statsScopeId: 'franchise-standings-season-6',
        franchiseId: 'franchise-standings',
        competitionType: 'playoff',
        playoffId: 'playoff-1',
        playoffSeriesId: 'series-1',
        playoffGameNumber: 1,
        awayTeamId: 'team-b',
        homeTeamId: 'team-a',
        awayTeamName: 'Team B',
        homeTeamName: 'Team A',
      }),
      { away: 10, home: 0 },
      [],
      'franchise-standings-season-6',
      {
        franchiseId: 'franchise-standings',
        statsScopeId: 'franchise-standings-season-6',
        competitionType: 'playoff',
        playoffId: 'playoff-1',
        playoffSeriesId: 'series-1',
        playoffGameNumber: 1,
      },
    );

    const standings = await calculateStandings('franchise-standings-season-6');

    expect(standings.find((team) => team.teamId === 'team-a')).toMatchObject({
      wins: 1,
      losses: 0,
      runsScored: 4,
      runsAllowed: 2,
      runDiff: 2,
    });
    expect(standings.find((team) => team.teamId === 'team-b')).toMatchObject({
      wins: 0,
      losses: 1,
      runsScored: 2,
      runsAllowed: 4,
      runDiff: -2,
    });
  });

  test('repeating score-only completion is idempotent and score edits are blocked', async () => {
    const scheduledGame = await addGame({
      franchiseId: 'franchise-score-only',
      seasonNumber: 4,
      seasonId: 'franchise-score-only-season-4',
      awayTeamId: 'team-a',
      homeTeamId: 'team-b',
      date: 'July 12',
    });
    const input = {
      scheduleGameId: scheduledGame.id,
      franchiseId: 'franchise-score-only',
      seasonId: 'franchise-score-only-season-4',
      seasonNumber: 4,
      awayScore: 5,
      homeScore: 2,
    };

    const first = await completeFranchiseScheduleGameScoreOnly(input);
    const second = await completeFranchiseScheduleGameScoreOnly(input);

    expect(second).toEqual(first);
    expect(first).toMatchObject({
      date: 'July 12',
      completedCivilDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
    });
    await expect(getScheduleMetadataByFranchise('franchise-score-only', 4)).resolves.toMatchObject({
      totalGamesScheduled: 1,
      totalGamesCompleted: 1,
    });
    await expect(calculateStandings('franchise-score-only-season-4')).resolves.toMatchObject([
      expect.objectContaining({ teamId: 'team-a', wins: 1, losses: 0 }),
      expect.objectContaining({ teamId: 'team-b', wins: 0, losses: 1 }),
    ]);
    await expect(completeFranchiseScheduleGameScoreOnly({
      ...input,
      awayScore: 2,
      homeScore: 5,
    })).rejects.toThrow('editing/reopening is not supported');
  });

  test('GameTracker schedule completion remains game-log linked instead of score-only', async () => {
    const scheduledGame = await addGame({
      franchiseId: 'franchise-game-tracker',
      seasonNumber: 5,
      seasonId: 'franchise-game-tracker-season-5',
      awayTeamId: 'team-a',
      homeTeamId: 'team-b',
      date: 'July 13',
    });

    await completeGame(scheduledGame.id, {
      awayScore: 3,
      homeScore: 4,
      winningTeamId: 'team-b',
      losingTeamId: 'team-a',
      gameLogId: 'completed-game-tracker-1',
      completedCivilDate: '2026-07-11',
    });

    await expect(getGame(scheduledGame.id)).resolves.toMatchObject({
      status: 'COMPLETED',
      completionSource: 'game-tracker',
      gameLogId: 'completed-game-tracker-1',
      date: 'July 13',
      completedCivilDate: '2026-07-11',
    });
    await expect(completeFranchiseScheduleGameScoreOnly({
      scheduleGameId: scheduledGame.id,
      franchiseId: 'franchise-game-tracker',
      seasonId: 'franchise-game-tracker-season-5',
      seasonNumber: 5,
      awayScore: 3,
      homeScore: 4,
    })).rejects.toThrow('already completed');
  });

  test('repeating the same completion does not duplicate or mutate schedule completion', async () => {
    const scheduledGame = await addGame({
      franchiseId: 'franchise-1',
      seasonNumber: 1,
      awayTeamId: 'team-a',
      homeTeamId: 'team-b',
    });
    const result = {
      awayScore: 4,
      homeScore: 2,
      winningTeamId: 'team-a',
      losingTeamId: 'team-b',
      gameLogId: 'completed-idempotent-1',
    };

    await completeGame(scheduledGame.id, result);
    const [afterFirst] = await getAllGamesByFranchise('franchise-1', 1);
    await completeGame(scheduledGame.id, result);
    const [afterSecond] = await getAllGamesByFranchise('franchise-1', 1);

    expect(afterSecond).toMatchObject({
      id: scheduledGame.id,
      status: 'COMPLETED',
      result,
      gameLogId: 'completed-idempotent-1',
    });
    expect(afterSecond.completedAt).toBe(afterFirst.completedAt);
    await expect(getScheduleMetadataByFranchise('franchise-1', 1)).resolves.toMatchObject({
      totalGamesScheduled: 1,
      totalGamesCompleted: 1,
    });
  });

  test('manual add and delete remain scoped to one franchise schedule', async () => {
    const franchiseOneGame = await addGame({
      franchiseId: 'franchise-1',
      seasonNumber: 2,
      awayTeamId: 'team-a',
      homeTeamId: 'team-b',
    });
    const franchiseTwoGame = await addGame({
      franchiseId: 'franchise-2',
      seasonNumber: 2,
      awayTeamId: 'team-c',
      homeTeamId: 'team-d',
    });

    await deleteGame(franchiseOneGame.id);

    await expect(getAllGamesByFranchise('franchise-1', 2)).resolves.toEqual([]);
    await expect(getAllGamesByFranchise('franchise-2', 2)).resolves.toMatchObject([
      { id: franchiseTwoGame.id, franchiseId: 'franchise-2' },
    ]);
    await expect(getAllGames(2)).resolves.toEqual([]);
    await expect(getNextGameNumberForFranchise('franchise-1', 2)).resolves.toBe(1);
    await expect(getNextGameNumberForFranchise('franchise-2', 2)).resolves.toBe(2);
  });

  test('accepted CSV import writes franchise-scoped rows with canonical season scope only', async () => {
    await addGame({
      franchiseId: 'franchise-other',
      seasonNumber: 3,
      gameNumber: 1,
      awayTeamId: 'team-x',
      homeTeamId: 'team-y',
    });
    await addGame({
      seasonNumber: 3,
      gameNumber: 1,
      awayTeamId: 'global-a',
      homeTeamId: 'global-b',
    });

    const imported = await importFranchiseScheduleRows({
      franchiseId: 'franchise-1',
      seasonNumber: 3,
      seasonId: 'franchise-1-season-3',
      statsScopeId: 'franchise-1-season-3',
      rows: [
        {
          gameNumber: 1,
          dayNumber: 7,
          date: 'July 12',
          time: '7:00 PM',
          notes: 'SMB4 manual CSV',
          awayTeamId: 'team-a',
          homeTeamId: 'team-b',
        },
        {
          gameNumber: 2,
          awayTeamId: 'team-c',
          homeTeamId: 'team-a',
        },
      ],
    });

    expect(imported).toHaveLength(2);
    expect(await getAllGamesByFranchise('franchise-1', 3)).toMatchObject([
      {
        franchiseId: 'franchise-1',
        seasonId: 'franchise-1-season-3',
        statsScopeId: 'franchise-1-season-3',
        seasonNumber: 3,
        gameNumber: 1,
        dayNumber: 7,
        awayTeamId: 'team-a',
        homeTeamId: 'team-b',
        source: 'csv-import',
        notes: 'SMB4 manual CSV',
        status: 'SCHEDULED',
      },
      {
        franchiseId: 'franchise-1',
        seasonId: 'franchise-1-season-3',
        statsScopeId: 'franchise-1-season-3',
        seasonNumber: 3,
        gameNumber: 2,
        dayNumber: 2,
        awayTeamId: 'team-c',
        homeTeamId: 'team-a',
        source: 'csv-import',
        status: 'SCHEDULED',
      },
    ]);
    expect((await getAllGames(3)).map((game) => game.id)).toHaveLength(1);
    expect((await getAllGamesByFranchise('franchise-other', 3)).map((game) => game.gameNumber)).toEqual([1]);
  });

  test('imported rows remain compatible with manual edit, delete, and game launch fields', async () => {
    const [game] = await importFranchiseScheduleRows({
      franchiseId: 'franchise-1',
      seasonNumber: 4,
      seasonId: 'franchise-1-season-4',
      statsScopeId: 'franchise-1-season-4',
      rows: [
        {
          gameNumber: 1,
          awayTeamId: 'team-a',
          homeTeamId: 'team-b',
        },
      ],
    });

    const edited = await updateGame(game.id, {
      gameNumber: 5,
      dayNumber: 6,
      awayTeamId: 'team-c',
      homeTeamId: 'team-b',
      date: 'July 15',
    });

    expect(edited).toMatchObject({
      id: game.id,
      franchiseId: 'franchise-1',
      seasonId: 'franchise-1-season-4',
      statsScopeId: 'franchise-1-season-4',
      gameNumber: 5,
      dayNumber: 6,
      awayTeamId: 'team-c',
      homeTeamId: 'team-b',
      date: 'July 15',
      status: 'SCHEDULED',
    });

    await completeGame(game.id, {
      awayScore: 3,
      homeScore: 4,
      winningTeamId: 'team-b',
      losingTeamId: 'team-c',
      gameLogId: 'completed-imported-game',
    });
    await expect(updateGame(game.id, { gameNumber: 6 })).rejects.toThrow('Completed games cannot be edited');
    await expect(deleteGame(game.id)).rejects.toThrow('Completed games cannot be deleted');
    await expect(getAllGamesByFranchise('franchise-1', 4)).resolves.toHaveLength(1);

    await clearFranchiseSeasonSchedule('franchise-1', 4);
    await expect(getAllGamesByFranchise('franchise-1', 4)).resolves.toEqual([]);
  });

  test('completed score-only rows cannot be deleted through manual row delete', async () => {
    const game = await addGame({
      franchiseId: 'franchise-score-only-delete',
      seasonNumber: 7,
      seasonId: 'franchise-score-only-delete-season-7',
      statsScopeId: 'franchise-score-only-delete-season-7',
      awayTeamId: 'team-a',
      homeTeamId: 'team-b',
    });

    await completeFranchiseScheduleGameScoreOnly({
      scheduleGameId: game.id,
      franchiseId: 'franchise-score-only-delete',
      seasonNumber: 7,
      seasonId: 'franchise-score-only-delete-season-7',
      awayScore: 2,
      homeScore: 5,
    });

    await expect(deleteGame(game.id)).rejects.toThrow('Completed games cannot be deleted');
    await expect(getAllGamesByFranchise('franchise-score-only-delete', 7)).resolves.toMatchObject([
      {
        id: game.id,
        status: 'COMPLETED',
        completionSource: 'score-only',
      },
    ]);
  });

  test('manual edit cannot create duplicate game numbers inside one franchise schedule', async () => {
    const first = await addGame({
      franchiseId: 'franchise-1',
      seasonNumber: 4,
      gameNumber: 1,
      awayTeamId: 'team-a',
      homeTeamId: 'team-b',
    });
    const second = await addGame({
      franchiseId: 'franchise-1',
      seasonNumber: 4,
      gameNumber: 2,
      awayTeamId: 'team-c',
      homeTeamId: 'team-d',
    });
    await addGame({
      franchiseId: 'franchise-other',
      seasonNumber: 4,
      gameNumber: 1,
      awayTeamId: 'team-x',
      homeTeamId: 'team-y',
    });

    await expect(updateGame(second.id, { gameNumber: 1 })).rejects.toThrow(
      'Duplicate game number 1',
    );
    await expect(updateGame(second.id, { gameNumber: 3 })).resolves.toMatchObject({
      id: second.id,
      gameNumber: 3,
    });
    await expect(getAllGamesByFranchise('franchise-1', 4)).resolves.toMatchObject([
      { id: first.id, gameNumber: 1 },
      { id: second.id, gameNumber: 3 },
    ]);
  });

  test('manual add cannot create duplicate game numbers inside one franchise schedule', async () => {
    await addGame({
      franchiseId: 'franchise-1',
      seasonNumber: 8,
      gameNumber: 1,
      awayTeamId: 'team-a',
      homeTeamId: 'team-b',
    });

    await expect(addGame({
      franchiseId: 'franchise-1',
      seasonNumber: 8,
      gameNumber: 1,
      awayTeamId: 'team-c',
      homeTeamId: 'team-d',
    })).rejects.toThrow('Duplicate game number 1');
    await expect(addGame({
      franchiseId: 'franchise-2',
      seasonNumber: 8,
      gameNumber: 1,
      awayTeamId: 'team-c',
      homeTeamId: 'team-d',
    })).resolves.toMatchObject({ gameNumber: 1 });
    await expect(getAllGamesByFranchise('franchise-1', 8)).resolves.toHaveLength(1);
  });

  test('CSV import rolls back every row on a mid-transaction write failure and can be retried', async () => {
    const rows = [
      { gameNumber: 1, awayTeamId: 'team-a', homeTeamId: 'team-b' },
      { gameNumber: 2, awayTeamId: 'team-c', homeTeamId: 'team-d' },
    ];
    const dateSpy = vi.spyOn(Date, 'now').mockReturnValue(1234);
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.25);
    try {
      await expect(importFranchiseScheduleRows({
        franchiseId: 'franchise-atomic-import',
        seasonNumber: 9,
        rows,
      })).rejects.toBeTruthy();
      await expect(getAllGamesByFranchise('franchise-atomic-import', 9)).resolves.toEqual([]);
    } finally {
      dateSpy.mockRestore();
      randomSpy.mockRestore();
    }

    await expect(importFranchiseScheduleRows({
      franchiseId: 'franchise-atomic-import',
      seasonNumber: 9,
      rows,
    })).resolves.toHaveLength(2);
  });

  test('Add Series rolls back every row on a mid-transaction write failure', async () => {
    const dateSpy = vi.spyOn(Date, 'now').mockReturnValue(5678);
    const randomSpy = vi.spyOn(Math, 'random').mockReturnValue(0.5);
    try {
      await expect(addSeries({
        franchiseId: 'franchise-atomic-series',
        seasonNumber: 10,
        dayNumber: 20,
        awayTeamId: 'team-a',
        homeTeamId: 'team-b',
      }, 3)).rejects.toBeTruthy();
      await expect(getAllGamesByFranchise('franchise-atomic-series', 10)).resolves.toEqual([]);
    } finally {
      dateSpy.mockRestore();
      randomSpy.mockRestore();
    }
  });

  test('Add Series honors an explicitly selected starting game number', async () => {
    await addGame({
      franchiseId: 'franchise-explicit-series',
      seasonNumber: 11,
      gameNumber: 1,
      awayTeamId: 'team-a',
      homeTeamId: 'team-b',
    });

    await expect(addSeries({
      franchiseId: 'franchise-explicit-series',
      seasonNumber: 11,
      gameNumber: 10,
      dayNumber: 20,
      awayTeamId: 'team-c',
      homeTeamId: 'team-d',
    }, 3)).resolves.toMatchObject([
      { gameNumber: 10, dayNumber: 20 },
      { gameNumber: 11, dayNumber: 21 },
      { gameNumber: 12, dayNumber: 22 },
    ]);
    await expect(getAllGamesByFranchise('franchise-explicit-series', 11)).resolves.toMatchObject([
      { gameNumber: 1 },
      { gameNumber: 10 },
      { gameNumber: 11 },
      { gameNumber: 12 },
    ]);
  });

  test('franchise CSV import rejects duplicate game numbers before writing rows', async () => {
    await addGame({
      franchiseId: 'franchise-1',
      seasonNumber: 5,
      gameNumber: 1,
      awayTeamId: 'team-a',
      homeTeamId: 'team-b',
    });

    await expect(importFranchiseScheduleRows({
      franchiseId: 'franchise-1',
      seasonNumber: 5,
      rows: [
        {
          gameNumber: 1,
          awayTeamId: 'team-c',
          homeTeamId: 'team-d',
        },
      ],
    })).rejects.toThrow('Duplicate game number 1');

    await expect(getAllGamesByFranchise('franchise-1', 5)).resolves.toHaveLength(1);
  });

  test('franchise CSV import rejects invalid row numbers before writing rows', async () => {
    await expect(importFranchiseScheduleRows({
      franchiseId: 'franchise-1',
      seasonNumber: 6,
      rows: [
        {
          gameNumber: 0,
          awayTeamId: 'team-c',
          homeTeamId: 'team-d',
        },
      ],
    })).rejects.toThrow('positive game number');

    await expect(importFranchiseScheduleRows({
      franchiseId: 'franchise-1',
      seasonNumber: 6,
      rows: [
        {
          gameNumber: 1,
          dayNumber: 0,
          awayTeamId: 'team-c',
          homeTeamId: 'team-d',
        },
      ],
    })).rejects.toThrow('positive day number');

    await expect(getAllGamesByFranchise('franchise-1', 6)).resolves.toEqual([]);
  });
});
