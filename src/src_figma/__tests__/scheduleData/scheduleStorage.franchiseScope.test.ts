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
});
