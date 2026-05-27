import 'fake-indexeddb/auto';
import { describe, expect, test, vi } from 'vitest';
import type { PersistedGameState } from '../../../utils/gameStorage';

vi.mock('../../../utils/syncEngine', () => ({
  syncEngine: {
    isSuppressed: () => true,
    upsert: vi.fn(),
    remove: vi.fn(),
  },
}));

import {
  archiveCompletedGame,
  getAllCompletedGames,
  getCompletedGameById,
  getRecentGames,
} from '../../../utils/gameStorage';

function createPersistedGameState(
  overrides: Partial<PersistedGameState> = {},
): PersistedGameState {
  return {
    id: 'current',
    gameId: 'completed-franchise-game',
    savedAt: Date.now(),
    inning: 9,
    halfInning: 'BOTTOM',
    outs: 3,
    homeScore: 5,
    awayScore: 3,
    bases: {
      first: null,
      second: null,
      third: null,
    },
    currentBatterIndex: 0,
    atBatCount: 0,
    awayTeamId: 'away-team',
    homeTeamId: 'home-team',
    awayTeamName: 'Away Team',
    homeTeamName: 'Home Team',
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

describe('completed game franchise identity', () => {
  test('archiveCompletedGame persists franchiseId and scheduleGameId from archive context', async () => {
    await archiveCompletedGame(
      createPersistedGameState({
        gameId: 'completed-franchise-game-context',
      }),
      { away: 3, home: 5 },
      [],
      'franchise-1-season-1',
      {
        statsScopeId: 'franchise-1-season-1',
        competitionType: 'franchise',
        competitionId: 'franchise-1',
        leagueId: 'league-1',
        franchiseId: 'franchise-1',
        scheduleGameId: 'schedule-game-1',
      },
    );

    const record = await getCompletedGameById('completed-franchise-game-context');

    expect(record).toMatchObject({
      gameId: 'completed-franchise-game-context',
      seasonId: 'franchise-1-season-1',
      statsScopeId: 'franchise-1-season-1',
      competitionType: 'franchise',
      competitionId: 'franchise-1',
      franchiseId: 'franchise-1',
      scheduleGameId: 'schedule-game-1',
    });
  });

  test('archiveCompletedGame falls back to persisted game identity when context omits it', async () => {
    await archiveCompletedGame(
      createPersistedGameState({
        gameId: 'completed-franchise-game-snapshot',
        franchiseId: 'franchise-2',
        scheduleGameId: 'schedule-game-2',
      }),
      { away: 1, home: 2 },
      [],
      'franchise-2-season-1',
      {
        statsScopeId: 'franchise-2-season-1',
        competitionType: 'franchise',
        competitionId: 'franchise-2',
        leagueId: 'league-1',
      },
    );

    const record = await getCompletedGameById('completed-franchise-game-snapshot');

    expect(record).toMatchObject({
      gameId: 'completed-franchise-game-snapshot',
      franchiseId: 'franchise-2',
      scheduleGameId: 'schedule-game-2',
    });
  });

  test('recent-game queries isolate exhibition, franchise, playoff, and elimination scopes', async () => {
    await archiveCompletedGame(
      createPersistedGameState({ gameId: 'scope-exhibition-game' }),
      { away: 1, home: 2 },
      [],
      undefined,
      {
        statsScopeId: 'exhibition-scope',
        competitionType: 'exhibition',
        competitionId: 'league-1',
        leagueId: 'league-1',
      },
    );
    await archiveCompletedGame(
      createPersistedGameState({ gameId: 'scope-franchise-game' }),
      { away: 3, home: 4 },
      [],
      'franchise-a-season-1',
      {
        statsScopeId: 'franchise-a-season-1',
        competitionType: 'franchise',
        competitionId: 'franchise-a',
        franchiseId: 'franchise-a',
        scheduleGameId: 'franchise-schedule-1',
      },
    );
    await archiveCompletedGame(
      createPersistedGameState({ gameId: 'scope-playoff-game' }),
      { away: 5, home: 6 },
      [],
      'franchise-a-season-1',
      {
        statsScopeId: 'franchise-a-season-1',
        competitionType: 'playoff',
        competitionId: 'playoff-a',
        franchiseId: 'franchise-a',
        playoffId: 'playoff-a',
      },
    );
    await archiveCompletedGame(
      createPersistedGameState({ gameId: 'scope-elimination-game' }),
      { away: 7, home: 8 },
      [],
      undefined,
      {
        statsScopeId: 'elimination-elim-a',
        competitionType: 'elimination',
        competitionId: 'elim-a',
        isEliminationGame: true,
      },
    );

    await expect(getRecentGames(10, { competitionType: 'exhibition' })).resolves.toEqual([
      expect.objectContaining({ gameId: 'scope-exhibition-game' }),
    ]);
    await expect(
      getRecentGames(10, {
        competitionType: 'franchise',
        franchiseId: 'franchise-a',
        statsScopeId: 'franchise-a-season-1',
      }),
    ).resolves.toEqual([
      expect.objectContaining({ gameId: 'scope-franchise-game' }),
    ]);
    await expect(
      getRecentGames(10, {
        competitionType: 'playoff',
        competitionId: 'playoff-a',
        franchiseId: 'franchise-a',
      }),
    ).resolves.toEqual([
      expect.objectContaining({ gameId: 'scope-playoff-game' }),
    ]);
    await expect(
      getRecentGames(10, {
        competitionType: 'elimination',
        competitionId: 'elim-a',
        statsScopeId: 'elimination-elim-a',
      }),
    ).resolves.toEqual([
      expect.objectContaining({ gameId: 'scope-elimination-game' }),
    ]);
  });

  test('normal completed-game queries exclude incomplete fallback archives by default', async () => {
    await archiveCompletedGame(
      createPersistedGameState({ gameId: 'complete-summary-game' }),
      { away: 4, home: 6 },
      [],
      'franchise-incomplete-season-1',
      {
        statsScopeId: 'franchise-incomplete-season-1',
        competitionType: 'franchise',
        competitionId: 'franchise-incomplete',
        franchiseId: 'franchise-incomplete',
        scheduleGameId: 'schedule-complete',
      },
    );
    await archiveCompletedGame(
      createPersistedGameState({ gameId: 'incomplete-summary-game' }),
      { away: 1, home: 2 },
      [],
      'franchise-incomplete-season-1',
      {
        statsScopeId: 'franchise-incomplete-season-1',
        competitionType: 'franchise',
        competitionId: 'franchise-incomplete',
        franchiseId: 'franchise-incomplete',
        scheduleGameId: 'schedule-incomplete',
        aggregationStatus: 'incomplete',
      },
    );

    await expect(
      getRecentGames(10, {
        franchiseId: 'franchise-incomplete',
        seasonId: 'franchise-incomplete-season-1',
      }),
    ).resolves.toEqual([
      expect.objectContaining({ gameId: 'complete-summary-game' }),
    ]);
    await expect(
      getRecentGames(10, {
        franchiseId: 'franchise-incomplete',
        seasonId: 'franchise-incomplete-season-1',
        includeIncomplete: true,
      }),
    ).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ gameId: 'complete-summary-game' }),
        expect.objectContaining({ gameId: 'incomplete-summary-game' }),
      ]),
    );
    await expect(getAllCompletedGames()).resolves.not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ gameId: 'incomplete-summary-game' }),
      ]),
    );
    await expect(getAllCompletedGames({ includeIncomplete: true })).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ gameId: 'incomplete-summary-game' }),
      ]),
    );
  });
});
