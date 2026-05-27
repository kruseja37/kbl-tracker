import 'fake-indexeddb/auto';
import { describe, expect, test, vi } from 'vitest';

vi.mock('../../../utils/syncEngine', () => ({
  syncEngine: {
    isSuppressed: () => true,
    upsert: vi.fn(),
    remove: vi.fn(),
    upsertLocal: vi.fn(),
    removeLocal: vi.fn(),
  },
}));

import {
  initDatabase,
  getRecentGames,
  type CompletedGameRecord,
} from '../../../utils/gameStorage';
import { calculateStandings } from '../../../utils/seasonStorage';
import {
  createPlayoff,
  deletePlayoffBySeason,
  getPlayoffBySeason,
} from '../../../utils/playoffStorage';
import {
  advanceOffseasonPhase,
  getOffseasonState,
  startOffseason,
} from '../../../utils/offseasonStorage';
import {
  buildFranchiseSeasonHandoff,
  getFranchiseSeasonId,
} from '../../../utils/franchisePersistenceContract';

let uniqueCounter = 0;

function nextId(prefix: string): string {
  uniqueCounter += 1;
  return `${prefix}-${Date.now()}-${uniqueCounter}`;
}

async function seedCompletedGame(record: CompletedGameRecord): Promise<void> {
  const db = await initDatabase();

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction('completedGames', 'readwrite');
    const store = tx.objectStore('completedGames');
    store.put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

function makeCompletedGame(params: {
  gameId: string;
  franchiseId: string;
  seasonId: string;
  awayTeamId: string;
  homeTeamId: string;
  awayScore: number;
  homeScore: number;
  date: number;
}): CompletedGameRecord {
  return {
    gameId: params.gameId,
    date: params.date,
    seasonId: params.seasonId,
    statsScopeId: params.seasonId,
    competitionType: 'franchise',
    franchiseId: params.franchiseId,
    scheduleGameId: `${params.gameId}-schedule`,
    seasonNumber: 1,
    awayTeamId: params.awayTeamId,
    homeTeamId: params.homeTeamId,
    awayTeamName: params.awayTeamId,
    homeTeamName: params.homeTeamId,
    finalScore: { away: params.awayScore, home: params.homeScore },
    innings: 9,
    totalInnings: 9,
    fameEvents: [],
    playerStats: {},
    pitcherGameStats: [],
    activityLog: [],
    inningScores: [],
  };
}

describe('Wave 3 franchise season scoping', () => {
  test('completed-game queries and standings isolate franchises with the same season number', async () => {
    const franchiseA = nextId('franchise-a');
    const franchiseB = nextId('franchise-b');
    const seasonA = getFranchiseSeasonId(franchiseA, 1);
    const seasonB = getFranchiseSeasonId(franchiseB, 1);

    await seedCompletedGame(makeCompletedGame({
      gameId: nextId('game-a'),
      franchiseId: franchiseA,
      seasonId: seasonA,
      awayTeamId: 'a-away',
      homeTeamId: 'a-home',
      awayScore: 2,
      homeScore: 5,
      date: 100,
    }));
    await seedCompletedGame(makeCompletedGame({
      gameId: nextId('game-b'),
      franchiseId: franchiseB,
      seasonId: seasonB,
      awayTeamId: 'b-away',
      homeTeamId: 'b-home',
      awayScore: 9,
      homeScore: 1,
      date: 200,
    }));

    const recentA = await getRecentGames(10, { franchiseId: franchiseA, seasonId: seasonA });
    expect(recentA).toHaveLength(1);
    expect(recentA[0].homeTeamId).toBe('a-home');

    const standingsA = await calculateStandings(seasonA);
    expect(standingsA.map((team) => team.teamId).sort()).toEqual(['a-away', 'a-home']);
    expect(standingsA.find((team) => team.teamId === 'a-home')).toMatchObject({
      wins: 1,
      losses: 0,
    });
    expect(standingsA.some((team) => team.teamId.startsWith('b-'))).toBe(false);
  });

  test('playoff storage keeps same-season franchise brackets separate', async () => {
    const seasonNumber = 9000 + uniqueCounter;
    const franchiseA = nextId('playoff-a');
    const franchiseB = nextId('playoff-b');

    const playoffA = await createPlayoff({
      seasonNumber,
      seasonId: getFranchiseSeasonId(franchiseA, seasonNumber),
      franchiseId: franchiseA,
      sourceType: 'franchise',
      status: 'NOT_STARTED',
      teamsQualifying: 2,
      rounds: 1,
      gamesPerRound: [3],
      inningsPerGame: 9,
      useDH: true,
      leagues: ['Eastern', 'Western'],
      conferenceChampionship: false,
      teams: [],
      currentRound: 0,
    });

    const playoffB = await createPlayoff({
      seasonNumber,
      seasonId: getFranchiseSeasonId(franchiseB, seasonNumber),
      franchiseId: franchiseB,
      sourceType: 'franchise',
      status: 'NOT_STARTED',
      teamsQualifying: 2,
      rounds: 1,
      gamesPerRound: [3],
      inningsPerGame: 9,
      useDH: true,
      leagues: ['Eastern', 'Western'],
      conferenceChampionship: false,
      teams: [],
      currentRound: 0,
    });

    await expect(getPlayoffBySeason(seasonNumber, 'franchise', franchiseA)).resolves.toMatchObject({
      id: playoffA.id,
      franchiseId: franchiseA,
    });
    await expect(getPlayoffBySeason(seasonNumber, 'franchise', franchiseB)).resolves.toMatchObject({
      id: playoffB.id,
      franchiseId: franchiseB,
    });

    await deletePlayoffBySeason(seasonNumber, 'franchise', franchiseA);
    await expect(getPlayoffBySeason(seasonNumber, 'franchise', franchiseA)).resolves.toBeNull();
    await expect(getPlayoffBySeason(seasonNumber, 'franchise', franchiseB)).resolves.toMatchObject({
      id: playoffB.id,
    });
  });

  test('offseason state is stored by canonical franchise season id', async () => {
    const franchiseA = nextId('offseason-a');
    const franchiseB = nextId('offseason-b');
    const seasonA = getFranchiseSeasonId(franchiseA, 1);
    const seasonB = getFranchiseSeasonId(franchiseB, 1);

    await startOffseason(seasonA, 1, { franchiseId: franchiseA });
    await startOffseason(seasonB, 1, { franchiseId: franchiseB });
    await advanceOffseasonPhase(seasonA);

    await expect(getOffseasonState(seasonA)).resolves.toMatchObject({
      seasonId: seasonA,
      franchiseId: franchiseA,
      currentPhase: 'AWARDS',
    });
    await expect(getOffseasonState(seasonB)).resolves.toMatchObject({
      seasonId: seasonB,
      franchiseId: franchiseB,
      currentPhase: 'STANDINGS_FINAL',
    });
  });

  test('franchise season handoff carries canonical season, stats, schedule, game, playoff, and offseason identities', () => {
    const franchiseId = 'handoff-franchise';
    const handoff = buildFranchiseSeasonHandoff({
      franchiseId,
      seasonNumber: 3,
      playoffId: 'playoff-123',
    });

    expect(handoff).toEqual({
      franchiseId,
      seasonNumber: 3,
      seasonId: `${franchiseId}-season-3`,
      statsScopeId: `${franchiseId}-season-3`,
      seasonSummaryId: `${franchiseId}-season-3`,
      scheduleScope: {
        franchiseId,
        seasonNumber: 3,
      },
      completedGamesQuery: {
        franchiseId,
        seasonId: `${franchiseId}-season-3`,
      },
      playoffId: 'playoff-123',
      offseasonStateId: `offseason-${franchiseId}-season-3`,
    });
  });
});
