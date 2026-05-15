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
