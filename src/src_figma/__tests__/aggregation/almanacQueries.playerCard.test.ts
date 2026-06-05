import { beforeEach, describe, expect, test, vi } from 'vitest';

const {
  mockGetAllCompletedGames,
  mockGetAllCanonicalPlayers,
} = vi.hoisted(() => ({
  mockGetAllCompletedGames: vi.fn(),
  mockGetAllCanonicalPlayers: vi.fn().mockResolvedValue([]),
}));

vi.mock('../../../utils/gameStorage', () => ({
  getAllCompletedGames: mockGetAllCompletedGames,
  resolveExhibitionLeagueId: (game: {
    leagueId?: string;
    competitionId?: string;
    competitionType?: string;
  }) =>
    game.leagueId ??
    (game.competitionType === 'exhibition' || !game.competitionType
      ? game.competitionId
      : undefined),
}));

vi.mock('../../../utils/almanacStorage', () => ({
  getAllCanonicalPlayers: mockGetAllCanonicalPlayers,
}));

vi.mock('../../../utils/eventLog', () => ({
  getGameEvents: vi.fn().mockResolvedValue([]),
}));

import {
  getExhibitionBattingLeaders,
  getPlayerExhibitionStats,
  getArchiveInstanceMode,
  getPlayerInstanceStats,
  searchArchivedPlayerInstances,
  getTeamRosterFromGames,
} from '../../../utils/almanacQueries';

describe('almanacQueries player exhibition stats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAllCanonicalPlayers.mockResolvedValue([]);
  });

  test('includes legacy exhibition games keyed only by competitionId', async () => {
    mockGetAllCompletedGames.mockResolvedValue([
      {
        gameId: 'game-1',
        date: Date.now(),
        competitionId: 'league-exh',
        awayTeamId: 'away-team',
        awayTeamName: 'Away Team',
        homeTeamId: 'home-team',
        homeTeamName: 'Home Team',
        finalScore: { away: 5, home: 2 },
        innings: 9,
        fameEvents: [],
        playerStats: {
          'player-1': {
            playerName: 'Beefcake McStevens',
            teamId: 'away-team',
            pa: 4,
            ab: 4,
            h: 2,
            singles: 1,
            doubles: 1,
            triples: 0,
            hr: 0,
            rbi: 3,
            r: 1,
            bb: 0,
            hbp: 0,
            k: 1,
            sb: 0,
            cs: 0,
            sf: 0,
            sh: 0,
            gidp: 0,
            putouts: 0,
            assists: 0,
            fieldingErrors: 0,
          },
        },
        pitcherGameStats: [],
      },
      {
        gameId: 'game-2',
        date: Date.now() - 1000,
        competitionType: 'exhibition',
        competitionId: 'other-league',
        awayTeamId: 'away-team',
        awayTeamName: 'Away Team',
        homeTeamId: 'home-team',
        homeTeamName: 'Home Team',
        finalScore: { away: 1, home: 0 },
        innings: 9,
        fameEvents: [],
        playerStats: {
          'player-1': {
            playerName: 'Beefcake McStevens',
            teamId: 'away-team',
            pa: 4,
            ab: 4,
            h: 4,
            singles: 4,
            doubles: 0,
            triples: 0,
            hr: 0,
            rbi: 4,
            r: 1,
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
          },
        },
        pitcherGameStats: [],
      },
    ]);

    await expect(getPlayerExhibitionStats('player-1', 'league-exh')).resolves.toMatchObject({
      batting: expect.objectContaining({
        G: 1,
        RBI: 3,
        H: 2,
      }),
      pitching: null,
    });
  });

  test('returns instance-aware leader and roster links for exhibition-only leagues', async () => {
    mockGetAllCanonicalPlayers.mockResolvedValue([
      {
        canonicalId: 'beefcake',
        playerName: 'Beefcake McStevens',
        hometown: { city: 'Denver', state: 'CO' },
        instances: [
          {
            instanceId: 'league-exh',
            instanceName: 'League EXH',
            mode: 'exhibition',
            playerIdInInstance: 'player-1',
          },
        ],
      },
    ]);
    mockGetAllCompletedGames.mockResolvedValue([
      {
        gameId: 'game-1',
        date: Date.now(),
        competitionType: 'exhibition',
        competitionId: 'league-exh',
        awayTeamId: 'away-team',
        awayTeamName: 'Away Team',
        homeTeamId: 'home-team',
        homeTeamName: 'Home Team',
        finalScore: { away: 5, home: 2 },
        innings: 9,
        fameEvents: [],
        playerStats: {
          'player-1': {
            playerName: 'Beefcake McStevens',
            teamId: 'away-team',
            pa: 4,
            ab: 4,
            h: 2,
            singles: 1,
            doubles: 1,
            triples: 0,
            hr: 0,
            rbi: 3,
            r: 1,
            bb: 0,
            hbp: 0,
            k: 1,
            sb: 0,
            cs: 0,
            sf: 0,
            sh: 0,
            gidp: 0,
            putouts: 0,
            assists: 0,
            fieldingErrors: 0,
          },
        },
        pitcherGameStats: [],
      },
    ]);

    await expect(getExhibitionBattingLeaders('rbi', true, 5)).resolves.toEqual([
      expect.objectContaining({
        canonicalId: 'beefcake',
        instanceId: 'league-exh',
        value: 3,
      }),
    ]);

    await expect(getTeamRosterFromGames('league-exh', 'away-team')).resolves.toEqual([
      expect.objectContaining({
        canonicalId: 'beefcake',
        instanceId: 'league-exh',
        games: 1,
      }),
    ]);
  });

  test('includes elimination archived instances in search and team roster queries', async () => {
    mockGetAllCanonicalPlayers.mockResolvedValue([
      {
        canonicalId: 'beefcake',
        playerName: 'Beefcake McStevens',
        hometown: { city: 'Denver', state: 'CO' },
        instances: [
          {
            instanceId: 'elim-run-1',
            instanceName: 'Elim Run 1',
            mode: 'elimination',
            playerIdInInstance: 'player-1',
          },
        ],
      },
    ]);
    mockGetAllCompletedGames.mockResolvedValue([
      {
        gameId: 'elim-game-1',
        date: Date.now(),
        competitionType: 'elimination',
        competitionId: 'elim-run-1',
        competitionName: 'Elim Run 1',
        awayTeamId: 'away-team',
        awayTeamName: 'Away Team',
        homeTeamId: 'home-team',
        homeTeamName: 'Home Team',
        finalScore: { away: 5, home: 2 },
        innings: 9,
        fameEvents: [],
        playerStats: {
          'player-1': {
            playerName: 'Beefcake McStevens',
            teamId: 'away-team',
            pa: 4,
            ab: 4,
            h: 2,
            singles: 1,
            doubles: 1,
            triples: 0,
            hr: 0,
            rbi: 3,
            r: 1,
            bb: 0,
            hbp: 0,
            k: 1,
            sb: 0,
            cs: 0,
            sf: 0,
            sh: 0,
            gidp: 0,
            putouts: 0,
            assists: 0,
            fieldingErrors: 0,
          },
        },
        pitcherGameStats: [],
      },
    ]);

    await expect(searchArchivedPlayerInstances('Beefcake')).resolves.toEqual([
      expect.objectContaining({
        canonicalId: 'beefcake',
        instanceId: 'elim-run-1',
        mode: 'elimination',
        teamName: 'Away Team',
        games: 1,
      }),
    ]);

    await expect(getArchiveInstanceMode('elim-run-1')).resolves.toBe('elimination');

    await expect(getTeamRosterFromGames('elim-run-1', 'away-team')).resolves.toEqual([
      expect.objectContaining({
        canonicalId: 'beefcake',
        instanceId: 'elim-run-1',
        games: 1,
      }),
    ]);
  });

  test('includes franchise archived instances in search, roster, and player-card stats', async () => {
    mockGetAllCanonicalPlayers.mockResolvedValue([
      {
        canonicalId: 'frannie',
        playerName: 'Frannie First',
        hometown: { city: 'Denver', state: 'CO' },
        instances: [
          {
            instanceId: 'franchise-alpha',
            instanceName: 'Alpha Franchise',
            mode: 'franchise',
            playerIdInInstance: 'franchise-player-1',
          },
        ],
      },
    ]);
    mockGetAllCompletedGames.mockResolvedValue([
      {
        gameId: 'franchise-game-1',
        date: Date.now(),
        competitionType: 'franchise',
        competitionId: 'franchise-alpha',
        competitionName: 'Alpha Franchise',
        franchiseId: 'franchise-alpha',
        seasonId: 'franchise-alpha-season-1',
        statsScopeId: 'franchise-alpha-season-1',
        scheduleGameId: 'sched-1',
        awayTeamId: 'team-alpha',
        awayTeamName: 'Alpha',
        homeTeamId: 'team-beta',
        homeTeamName: 'Beta',
        finalScore: { away: 5, home: 2 },
        innings: 9,
        fameEvents: [],
        playerStats: {
          'franchise-player-1': {
            playerName: 'Frannie First',
            teamId: 'team-alpha',
            pa: 4,
            ab: 4,
            h: 2,
            singles: 1,
            doubles: 1,
            triples: 0,
            hr: 0,
            rbi: 3,
            r: 1,
            bb: 0,
            hbp: 0,
            k: 1,
            sb: 0,
            cs: 0,
            sf: 0,
            sh: 0,
            gidp: 0,
            putouts: 0,
            assists: 0,
            fieldingErrors: 0,
          },
        },
        pitcherGameStats: [
          {
            pitcherId: 'franchise-player-1',
            pitcherName: 'Frannie First',
            teamId: 'team-alpha',
            isStarter: true,
            entryInning: 1,
            outsRecorded: 9,
            hitsAllowed: 1,
            runsAllowed: 0,
            earnedRuns: 0,
            walksAllowed: 0,
            strikeoutsThrown: 3,
            homeRunsAllowed: 0,
            hitBatters: 0,
            basesReachedViaError: 0,
            wildPitches: 0,
            pitchCount: 35,
            battersFaced: 10,
            consecutiveHRsAllowed: 0,
            firstInningRuns: 0,
            basesLoadedWalks: 0,
            inningsComplete: 3,
            decision: 'W',
            save: false,
            hold: false,
            blownSave: false,
          },
        ],
      },
      {
        gameId: 'score-only-row',
        date: Date.now() - 1000,
        competitionType: 'franchise',
        competitionId: 'franchise-alpha',
        franchiseId: 'franchise-alpha',
        awayTeamId: 'team-alpha',
        awayTeamName: 'Alpha',
        homeTeamId: 'team-beta',
        homeTeamName: 'Beta',
        finalScore: { away: 9, home: 8 },
        innings: 9,
        fameEvents: [],
        playerStats: {},
        pitcherGameStats: [],
      },
    ]);

    await expect(searchArchivedPlayerInstances('Frannie')).resolves.toEqual([
      expect.objectContaining({
        canonicalId: 'frannie',
        instanceId: 'franchise-alpha',
        mode: 'franchise',
        teamId: 'team-alpha',
        teamName: 'Alpha',
        games: 1,
      }),
    ]);

    await expect(getArchiveInstanceMode('franchise-alpha')).resolves.toBe('franchise');

    await expect(getTeamRosterFromGames('franchise-alpha', 'team-alpha')).resolves.toEqual([
      expect.objectContaining({
        canonicalId: 'frannie',
        instanceId: 'franchise-alpha',
        games: 1,
      }),
    ]);

    await expect(
      getPlayerInstanceStats('franchise-player-1', 'franchise', 'franchise-alpha'),
    ).resolves.toMatchObject({
      batting: expect.objectContaining({
        G: 1,
        H: 2,
        RBI: 3,
      }),
      pitching: expect.objectContaining({
        G: 1,
        W: 1,
        SO: 3,
      }),
    });
  });

  test('counts batting and pitching stats in the same completed game once in player search', async () => {
    mockGetAllCompletedGames.mockResolvedValue([
      {
        gameId: 'two-way-game-1',
        date: Date.now(),
        competitionType: 'franchise',
        competitionId: 'franchise-alpha',
        franchiseId: 'franchise-alpha',
        awayTeamId: 'team-alpha',
        awayTeamName: 'Alpha',
        homeTeamId: 'team-beta',
        homeTeamName: 'Beta',
        finalScore: { away: 5, home: 2 },
        innings: 9,
        fameEvents: [],
        playerStats: {
          'two-way-player': {
            playerName: 'Two Way Terry',
            teamId: 'team-alpha',
          },
        },
        pitcherGameStats: [
          {
            pitcherId: 'two-way-player',
            pitcherName: 'Two Way Terry',
            teamId: 'team-alpha',
          },
        ],
      },
    ]);

    await expect(searchArchivedPlayerInstances('Two Way')).resolves.toEqual([
      expect.objectContaining({
        playerId: 'two-way-player',
        instanceId: 'franchise-alpha',
        mode: 'franchise',
        games: 1,
      }),
    ]);
  });

  test('counts distinct stat-bearing completed games separately in player search', async () => {
    mockGetAllCompletedGames.mockResolvedValue([
      {
        gameId: 'search-game-1',
        date: Date.now(),
        competitionType: 'franchise',
        competitionId: 'franchise-alpha',
        franchiseId: 'franchise-alpha',
        awayTeamId: 'team-alpha',
        awayTeamName: 'Alpha',
        homeTeamId: 'team-beta',
        homeTeamName: 'Beta',
        finalScore: { away: 5, home: 2 },
        innings: 9,
        fameEvents: [],
        playerStats: {
          'search-player': {
            playerName: 'Searchable Sam',
            teamId: 'team-alpha',
          },
        },
        pitcherGameStats: [],
      },
      {
        gameId: 'search-game-2',
        date: Date.now() - 1000,
        competitionType: 'franchise',
        competitionId: 'franchise-alpha',
        franchiseId: 'franchise-alpha',
        awayTeamId: 'team-alpha',
        awayTeamName: 'Alpha',
        homeTeamId: 'team-beta',
        homeTeamName: 'Beta',
        finalScore: { away: 3, home: 1 },
        innings: 9,
        fameEvents: [],
        playerStats: {},
        pitcherGameStats: [
          {
            pitcherId: 'search-player',
            pitcherName: 'Searchable Sam',
            teamId: 'team-alpha',
          },
        ],
      },
    ]);

    await expect(searchArchivedPlayerInstances('Searchable')).resolves.toEqual([
      expect.objectContaining({
        playerId: 'search-player',
        instanceId: 'franchise-alpha',
        mode: 'franchise',
        games: 2,
      }),
    ]);
  });

  test('aggregates player card stats across multiple exhibition games for the same canonical player', async () => {
    mockGetAllCanonicalPlayers.mockResolvedValue([
      {
        canonicalId: 'beefcake',
        playerName: 'Beefcake McStevens',
        hometown: { city: 'Denver', state: 'CO' },
        instances: [
          {
            instanceId: 'league-exh',
            instanceName: 'League EXH',
            mode: 'exhibition',
            playerIdInInstance: 'player-1-old',
          },
          {
            instanceId: 'league-exh',
            instanceName: 'League EXH',
            mode: 'exhibition',
            playerIdInInstance: 'player-1-new',
          },
        ],
      },
    ]);
    mockGetAllCompletedGames.mockResolvedValue([
      {
        gameId: 'game-1',
        date: Date.now(),
        competitionType: 'exhibition',
        leagueId: 'league-exh',
        awayTeamId: 'away-team',
        awayTeamName: 'Away Team',
        homeTeamId: 'home-team',
        homeTeamName: 'Home Team',
        finalScore: { away: 4, home: 2 },
        innings: 9,
        fameEvents: [],
        playerStats: {
          'player-1-old': {
            playerName: 'Beefcake McStevens',
            teamId: 'away-team',
            pa: 4,
            ab: 4,
            h: 2,
            singles: 2,
            doubles: 0,
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
            putouts: 0,
            assists: 0,
            fieldingErrors: 0,
          },
        },
        pitcherGameStats: [],
      },
      {
        gameId: 'game-2',
        date: Date.now() - 1000,
        competitionType: 'exhibition',
        leagueId: 'league-exh',
        awayTeamId: 'away-team',
        awayTeamName: 'Away Team',
        homeTeamId: 'home-team',
        homeTeamName: 'Home Team',
        finalScore: { away: 6, home: 3 },
        innings: 9,
        fameEvents: [],
        playerStats: {
          'player-1-new': {
            playerName: 'Beefcake McStevens',
            teamId: 'away-team',
            pa: 5,
            ab: 4,
            h: 3,
            singles: 1,
            doubles: 1,
            triples: 0,
            hr: 1,
            rbi: 4,
            r: 2,
            bb: 1,
            hbp: 0,
            k: 0,
            sb: 1,
            cs: 0,
            sf: 0,
            sh: 0,
            gidp: 0,
            putouts: 0,
            assists: 0,
            fieldingErrors: 0,
          },
        },
        pitcherGameStats: [],
      },
    ]);

    await expect(
      getPlayerExhibitionStats('player-1-new', 'league-exh'),
    ).resolves.toMatchObject({
      batting: expect.objectContaining({
        G: 2,
        AB: 8,
        H: 5,
        RBI: 5,
        HR: 1,
        BB: 1,
        SB: 1,
      }),
      pitching: null,
    });
  });
});
