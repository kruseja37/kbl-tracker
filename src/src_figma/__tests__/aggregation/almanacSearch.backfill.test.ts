import 'fake-indexeddb/auto';

import { beforeEach, describe, expect, test, vi } from 'vitest';

const {
  mockGetAllCompletedGames,
  mockGetLeagueTemplate,
  mockGetPlayer,
} = vi.hoisted(() => ({
  mockGetAllCompletedGames: vi.fn(),
  mockGetLeagueTemplate: vi.fn().mockResolvedValue({ name: 'League EXH' }),
  mockGetPlayer: vi.fn().mockResolvedValue(null),
}));

vi.mock('../../../utils/gameStorage', async () => {
  const actual = await vi.importActual<typeof import('../../../utils/gameStorage')>(
    '../../../utils/gameStorage',
  );

  return {
    ...actual,
    getAllCompletedGames: mockGetAllCompletedGames,
  };
});

vi.mock('../../../utils/leagueBuilderStorage', () => ({
  getLeagueTemplate: mockGetLeagueTemplate,
  getPlayer: mockGetPlayer,
}));

import { searchCanonicalPlayers } from '../../../utils/almanacStorage';
import { backfillCanonicalPlayers } from '../../../utils/registerAlmanacPlayers';
import { getTrackerDb } from '../../../utils/trackerDb';

async function clearCanonicalPlayersStore(): Promise<void> {
  const db = await getTrackerDb();

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction('almanacCanonicalPlayers', 'readwrite');
    const request = tx.objectStore('almanacCanonicalPlayers').clear();

    request.onerror = () => reject(request.error);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

describe('almanac backfill search integration', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mockGetLeagueTemplate.mockResolvedValue({ name: 'League EXH' });
    mockGetPlayer.mockResolvedValue(null);
    await clearCanonicalPlayersStore();
  });

  test("completed game's players appear in almanac search after backfill", async () => {
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
    await expect(searchCanonicalPlayers('Beefcake')).resolves.toEqual([
      expect.objectContaining({
        canonicalId: 'custom_player-1',
        playerName: 'Beefcake McStevens',
      }),
    ]);
  });
});
