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
}));

vi.mock('../../../utils/almanacStorage', () => ({
  getAllCanonicalPlayers: mockGetAllCanonicalPlayers,
}));

vi.mock('../../../utils/eventLog', () => ({
  getGameEvents: vi.fn().mockResolvedValue([]),
}));

import { getPlayerExhibitionStats } from '../../../utils/almanacQueries';

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
});
