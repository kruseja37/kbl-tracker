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
  clearAllSchedules,
  completeGame,
  deleteGame,
  getAllGames,
  getAllGamesByFranchise,
  getNextGameNumberForFranchise,
  getScheduleMetadataByFranchise,
  getTeamScheduleStatsForFranchise,
  importFranchiseScheduleRows,
  updateGame,
} from '../../../utils/scheduleStorage';

describe('scheduleStorage franchise scoping', () => {
  beforeEach(async () => {
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

    await deleteGame(game.id);
    await expect(getAllGamesByFranchise('franchise-1', 4)).resolves.toEqual([]);
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
