import 'fake-indexeddb/auto';
import { describe, expect, test, vi } from 'vitest';
import type { PersistedGameState } from '../../../utils/gameStorage';
import type { AtBatEvent } from '../../../utils/eventLog';

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
  loadCurrentGame,
  saveCurrentGame,
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
  test('active-game snapshot policy keeps one resumable current game with explicit overwrite', async () => {
    await saveCurrentGame(
      createPersistedGameState({
        gameId: 'active-franchise-game-1',
        franchiseId: 'franchise-active-1',
        scheduleGameId: 'schedule-active-1',
      }),
    );
    await saveCurrentGame(
      createPersistedGameState({
        gameId: 'active-franchise-game-2',
        franchiseId: 'franchise-active-2',
        scheduleGameId: 'schedule-active-2',
      }),
    );

    await expect(loadCurrentGame()).resolves.toMatchObject({
      id: 'current',
      gameId: 'active-franchise-game-2',
      franchiseId: 'franchise-active-2',
      scheduleGameId: 'schedule-active-2',
    });
  });

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

  test('archiveCompletedGame persists scoped spray-enriched at-bat evidence', async () => {
    const atBatEvent: AtBatEvent = {
      eventId: 'spray-game-1-1',
      gameId: 'spray-game-1',
      eventIndex: 1,
      timestamp: 101,
      batterId: 'batter-1',
      batterName: 'Batter One',
      batterTeamId: 'away-team',
      pitcherId: 'pitcher-1',
      pitcherName: 'Pitcher One',
      pitcherTeamId: 'home-team',
      result: '1B',
      rbiCount: 0,
      runsScored: [],
      inning: 1,
      halfInning: 'TOP',
      outs: 0,
      runners: { first: null, second: null, third: null },
      awayScore: 0,
      homeScore: 0,
      outsAfter: 0,
      runnersAfter: { first: null, second: null, third: null },
      awayScoreAfter: 0,
      homeScoreAfter: 0,
      leverageIndex: 1,
      winProbabilityBefore: 0.5,
      winProbabilityAfter: 0.48,
      wpa: 0.02,
      ballInPlay: {
        trajectory: 'line',
        zone: 0,
        velocity: 'hard',
        fielderIds: ['fielder-1'],
        primaryFielderId: 'fielder-1',
      },
      fameEvents: [],
      isLeadoff: true,
      isClutch: false,
      isWalkOff: false,
      enrichment: {
        fieldLocation: { x: 74, y: 48, zone: 'Z05' },
        exitType: 'line_drive',
      },
    };

    await archiveCompletedGame(
      createPersistedGameState({
        gameId: 'spray-game-1',
        stadiumName: 'Apple Field',
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
        atBatEvents: [atBatEvent],
        fieldingEvents: [],
      },
    );

    const record = await getCompletedGameById('spray-game-1');

    expect(record?.atBatEvents).toHaveLength(1);
    expect(record?.fieldingEvents).toBeUndefined();
    expect(record?.atBatEvents?.[0]).toMatchObject({
      eventId: 'spray-game-1-1',
      franchiseId: 'franchise-1',
      seasonId: 'franchise-1-season-1',
      statsScopeId: 'franchise-1-season-1',
      competitionType: 'franchise',
      competitionId: 'franchise-1',
      scheduleGameId: 'schedule-game-1',
      parkContext: {
        stadiumId: 'apple-field',
        stadiumName: 'Apple Field',
        parkFactors: expect.objectContaining({
          stadiumId: 'apple-field',
          stadiumName: 'Apple Field',
          source: 'SEED',
        }),
      },
      enrichment: {
        fieldLocation: { zone: 'Z05' },
      },
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

  test('archiveCompletedGame scopes trusted fame events to franchise, teams, and schedule context', async () => {
    await archiveCompletedGame(
      createPersistedGameState({
        gameId: 'completed-franchise-no-hitter',
        awayTeamId: 'team-alpha',
        homeTeamId: 'team-beta',
        awayTeamName: 'Alpha Club',
        homeTeamName: 'Beta Club',
        fameEvents: [
          {
            id: 'completed-franchise-no-hitter:fame:1',
            gameId: 'completed-franchise-no-hitter',
            eventType: 'NO_HITTER',
            playerId: 'pitcher-alpha',
            playerName: 'Nolan Alpha',
            playerTeam: 'team-alpha',
            fameValue: 5,
            fameType: 'bonus',
            inning: 9,
            halfInning: 'BOTTOM',
            timestamp: 123,
            autoDetected: true,
            description: 'Nolan Alpha finishes a no-hitter.',
          },
        ],
      }),
      { away: 4, home: 0 },
      [],
      'franchise-fame-season-1',
      {
        statsScopeId: 'franchise-fame-season-1',
        competitionType: 'franchise',
        competitionId: 'franchise-fame',
        franchiseId: 'franchise-fame',
        scheduleGameId: 'schedule-fame-1',
      },
    );

    const record = await getCompletedGameById('completed-franchise-no-hitter');

    expect(record?.fameEvents).toEqual([
      expect.objectContaining({
        eventType: 'NO_HITTER',
        playerId: 'pitcher-alpha',
        playerName: 'Nolan Alpha',
        teamId: 'team-alpha',
        teamName: 'Alpha Club',
        opponentTeamId: 'team-beta',
        opponentTeamName: 'Beta Club',
        franchiseId: 'franchise-fame',
        seasonId: 'franchise-fame-season-1',
        statsScopeId: 'franchise-fame-season-1',
        competitionType: 'franchise',
        competitionId: 'franchise-fame',
        scheduleGameId: 'schedule-fame-1',
      }),
    ]);
  });

  test('archiveCompletedGame preserves stadium identity, seeded park factors, and player WPA totals', async () => {
    await archiveCompletedGame(
      createPersistedGameState({
        gameId: 'completed-franchise-game-park-wpa',
        stadiumName: 'Apple Field',
      }),
      { away: 4, home: 6 },
      [],
      'franchise-park-season-1',
      {
        statsScopeId: 'franchise-park-season-1',
        competitionType: 'franchise',
        competitionId: 'franchise-park',
        franchiseId: 'franchise-park',
        playerWpaTotals: [
          {
            playerId: 'player-one',
            playerName: 'Player One',
            teamId: 'team-a',
            totalWpa: 0.24,
            battingWpa: 0.24,
            pitchingWpa: 0,
            catchingWpa: 0,
            fieldingWpa: 0,
            baserunningWpa: 0,
            managingWpa: 0,
          },
        ],
      },
    );

    const record = await getCompletedGameById('completed-franchise-game-park-wpa');

    expect(record).toMatchObject({
      gameId: 'completed-franchise-game-park-wpa',
      stadiumName: 'Apple Field',
      stadiumId: 'apple-field',
      parkFactors: {
        stadiumId: 'apple-field',
        stadiumName: 'Apple Field',
        source: 'SEED',
      },
      playerWpaTotals: [
        expect.objectContaining({
          playerId: 'player-one',
          teamId: 'team-a',
          totalWpa: 0.24,
        }),
      ],
    });
  });

  test('archiveCompletedGame keeps custom stadium identity without fabricating park factors', async () => {
    await archiveCompletedGame(
      createPersistedGameState({
        gameId: 'completed-franchise-custom-park',
        stadiumName: 'My Custom Yard',
      }),
      { away: 2, home: 1 },
      [],
      'franchise-custom-season-1',
      {
        statsScopeId: 'franchise-custom-season-1',
        competitionType: 'franchise',
        competitionId: 'franchise-custom',
        franchiseId: 'franchise-custom',
      },
    );

    const record = await getCompletedGameById('completed-franchise-custom-park');

    expect(record).toMatchObject({
      stadiumName: 'My Custom Yard',
      stadiumId: 'my-custom-yard',
    });
    expect(record?.parkFactors).toBeUndefined();
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
