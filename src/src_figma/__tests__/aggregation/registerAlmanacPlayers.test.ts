import { beforeEach, describe, expect, test, vi } from 'vitest';

const {
  mockGetAllCompletedGames,
  mockGetLeagueTemplate,
  mockGetPlayer,
  mockGetCanonicalPlayer,
  mockGetAllCanonicalPlayers,
  mockFindCanonicalByPlayerId,
  mockUpsertCanonicalPlayer,
} = vi.hoisted(() => ({
  mockGetAllCompletedGames: vi.fn(),
  mockGetLeagueTemplate: vi.fn().mockResolvedValue({ name: 'League EXH' }),
  mockGetPlayer: vi.fn(),
  mockGetCanonicalPlayer: vi.fn().mockResolvedValue(null),
  mockGetAllCanonicalPlayers: vi.fn().mockResolvedValue([]),
  mockFindCanonicalByPlayerId: vi.fn().mockResolvedValue(null),
  mockUpsertCanonicalPlayer: vi.fn().mockResolvedValue(undefined),
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

vi.mock('../../../utils/leagueBuilderStorage', () => ({
  getLeagueTemplate: mockGetLeagueTemplate,
  getPlayer: mockGetPlayer,
}));

vi.mock('../../../utils/almanacStorage', () => ({
  getCanonicalPlayer: mockGetCanonicalPlayer,
  getAllCanonicalPlayers: mockGetAllCanonicalPlayers,
  findCanonicalByPlayerId: mockFindCanonicalByPlayerId,
  upsertCanonicalPlayer: mockUpsertCanonicalPlayer,
}));

import {
  backfillCanonicalPlayers,
  registerAlmanacPlayers,
} from '../../../utils/registerAlmanacPlayers';

describe('registerAlmanacPlayers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetLeagueTemplate.mockResolvedValue({ name: 'League EXH' });
    mockGetCanonicalPlayer.mockResolvedValue(null);
    mockGetAllCanonicalPlayers.mockResolvedValue([]);
    mockFindCanonicalByPlayerId.mockResolvedValue(null);
  });

  test('registers exhibition players from ratings snapshots when the roster lookup is missing', async () => {
    mockGetPlayer.mockResolvedValue(null);

    await registerAlmanacPlayers(
      {
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
        playerRatingsSnapshots: {
          'player-1': {
            playerId: 'player-1',
            firstName: 'Beefcake',
            lastName: 'McStevens',
            hometown: { city: 'Denver', state: 'CO' },
            age: 28,
            gender: 'M',
            bats: 'R',
            throws: 'R',
            primaryPosition: '3B',
            power: 88,
            contact: 72,
            speed: 41,
            fielding: 60,
            arm: 64,
            velocity: 0,
            junk: 0,
            accuracy: 0,
            arsenal: [],
            overallGrade: 'A',
            personality: 'Competitive',
            chemistry: 'Competitive',
            morale: 50,
            mojo: 'Normal',
            fame: 10,
            salary: 1000000,
          },
        },
      } as never,
      'league-exh',
    );

    expect(mockUpsertCanonicalPlayer).toHaveBeenCalledWith(
      expect.objectContaining({
        canonicalId: 'custom_player-1',
        playerName: 'Beefcake McStevens',
        hometown: { city: 'Denver', state: 'CO' },
        instances: [
          expect.objectContaining({
            instanceId: 'league-exh',
            playerIdInInstance: 'player-1',
          }),
        ],
      }),
    );
  });

  test('backfills completed exhibition games that only have archived snapshots', async () => {
    mockGetPlayer.mockResolvedValue(null);
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
        playerRatingsSnapshots: {
          'player-1': {
            playerId: 'player-1',
            firstName: 'Beefcake',
            lastName: 'McStevens',
            hometown: { city: 'Denver', state: 'CO' },
            age: 28,
            gender: 'M',
            bats: 'R',
            throws: 'R',
            primaryPosition: '3B',
            power: 88,
            contact: 72,
            speed: 41,
            fielding: 60,
            arm: 64,
            velocity: 0,
            junk: 0,
            accuracy: 0,
            arsenal: [],
            overallGrade: 'A',
            personality: 'Competitive',
            chemistry: 'Competitive',
            morale: 50,
            mojo: 'Normal',
            fame: 10,
            salary: 1000000,
          },
        },
      },
    ]);

    await expect(backfillCanonicalPlayers()).resolves.toBe(1);
    expect(mockUpsertCanonicalPlayer).toHaveBeenCalledWith(
      expect.objectContaining({
        canonicalId: 'custom_player-1',
        playerName: 'Beefcake McStevens',
      }),
    );
  });
});
