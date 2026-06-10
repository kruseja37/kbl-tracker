import 'fake-indexeddb/auto';
import { beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('../../../utils/syncEngine', () => ({
  syncEngine: {
    isSuppressed: () => true,
    upsert: vi.fn(),
    remove: vi.fn(),
    upsertLocal: vi.fn(),
    removeLocal: vi.fn(),
  },
}));

import { addGame, completeGame } from '../../../utils/scheduleStorage';
import {
  initDatabase,
  type CompletedGameRecord,
} from '../../../utils/gameStorage';
import {
  createInitialBattingStats,
  updateBattingStats,
} from '../../../utils/seasonStorage';
import {
  createFranchiseSeasonSummary,
  getFranchiseSeasonSummary,
  getFranchiseSeasonSummaryByFranchise,
} from '../../../utils/franchiseSeasonSummaryStorage';
import { getFranchiseSeasonId } from '../../../utils/franchisePersistenceContract';
import { createPlayoff } from '../../../utils/playoffStorage';
import { executeSeasonTransition, type PlayerStorageAdapter } from '../../../engines/seasonTransitionEngine';

let counter = 0;

function nextId(prefix: string): string {
  counter += 1;
  return `${prefix}-${Date.now()}-${counter}`;
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
  seasonNumber: number;
  seasonId: string;
  awayTeamId: string;
  homeTeamId: string;
  awayScore: number;
  homeScore: number;
  scheduleGameId?: string;
  date?: number;
}): CompletedGameRecord {
  return {
    gameId: params.gameId,
    date: params.date ?? Date.now(),
    seasonId: params.seasonId,
    statsScopeId: params.seasonId,
    competitionType: 'franchise',
    franchiseId: params.franchiseId,
    scheduleGameId: params.scheduleGameId,
    seasonNumber: params.seasonNumber,
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

async function seedFranchiseGame(params: {
  franchiseId: string;
  seasonNumber: number;
  awayTeamId: string;
  homeTeamId: string;
  awayScore: number;
  homeScore: number;
}): Promise<{ seasonId: string; scheduleGameId: string; gameId: string }> {
  const seasonId = getFranchiseSeasonId(params.franchiseId, params.seasonNumber);
  const scheduleGame = await addGame({
    franchiseId: params.franchiseId,
    seasonNumber: params.seasonNumber,
    awayTeamId: params.awayTeamId,
    homeTeamId: params.homeTeamId,
  });
  const gameId = nextId('completed');

  await completeGame(scheduleGame.id, {
    awayScore: params.awayScore,
    homeScore: params.homeScore,
    winningTeamId: params.homeScore > params.awayScore ? params.homeTeamId : params.awayTeamId,
    losingTeamId: params.homeScore > params.awayScore ? params.awayTeamId : params.homeTeamId,
    gameLogId: gameId,
  });
  await seedCompletedGame(makeCompletedGame({
    gameId,
    franchiseId: params.franchiseId,
    seasonNumber: params.seasonNumber,
    seasonId,
    awayTeamId: params.awayTeamId,
    homeTeamId: params.homeTeamId,
    awayScore: params.awayScore,
    homeScore: params.homeScore,
    scheduleGameId: scheduleGame.id,
  }));

  return { seasonId, scheduleGameId: scheduleGame.id, gameId };
}

describe('Wave 4 franchise season summary handoff', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('persists isolated summaries for two franchises sharing one season number', async () => {
    const seasonNumber = 4;
    const franchiseA = nextId('summary-a');
    const franchiseB = nextId('summary-b');
    const gameA = await seedFranchiseGame({
      franchiseId: franchiseA,
      seasonNumber,
      awayTeamId: 'alpha-away',
      homeTeamId: 'alpha-home',
      awayScore: 2,
      homeScore: 5,
    });
    const gameB = await seedFranchiseGame({
      franchiseId: franchiseB,
      seasonNumber,
      awayTeamId: 'bravo-away',
      homeTeamId: 'bravo-home',
      awayScore: 7,
      homeScore: 1,
    });

    const summaryA = await createFranchiseSeasonSummary({ franchiseId: franchiseA, seasonNumber });
    const summaryB = await createFranchiseSeasonSummary({ franchiseId: franchiseB, seasonNumber });

    expect(summaryA.seasonId).toBe(gameA.seasonId);
    expect(summaryA.completedGames.gameIds).toEqual([gameA.gameId]);
    expect(summaryA.standings.teams.map((team) => team.teamId).sort()).toEqual(['alpha-away', 'alpha-home']);
    expect(summaryA.standings.teams.some((team) => team.teamId.startsWith('bravo'))).toBe(false);

    expect(summaryB.seasonId).toBe(gameB.seasonId);
    expect(summaryB.completedGames.gameIds).toEqual([gameB.gameId]);
    expect(summaryB.standings.teams.map((team) => team.teamId).sort()).toEqual(['bravo-away', 'bravo-home']);
  });

  test('creates a canonical persisted summary with stats, playoff, schedule, and placeholders', async () => {
    const franchiseId = nextId('summary-canonical');
    const seasonNumber = 5;
    const { seasonId, gameId } = await seedFranchiseGame({
      franchiseId,
      seasonNumber,
      awayTeamId: 'team-a',
      homeTeamId: 'team-b',
      awayScore: 4,
      homeScore: 3,
    });

    await updateBattingStats({
      ...createInitialBattingStats(seasonId, 'player-1', 'Player One', 'team-a'),
      games: 1,
      pa: 4,
      ab: 4,
      hits: 2,
      singles: 1,
      doubles: 1,
    });

    const playoff = await createPlayoff({
      seasonNumber,
      seasonId,
      franchiseId,
      sourceType: 'franchise',
      status: 'COMPLETED',
      teamsQualifying: 2,
      rounds: 1,
      gamesPerRound: [3],
      inningsPerGame: 9,
      useDH: true,
      leagues: ['Eastern', 'Western'],
      conferenceChampionship: false,
      teams: [],
      currentRound: 1,
      champion: 'team-a',
    });

    await createFranchiseSeasonSummary({ franchiseId, seasonNumber, playoffId: playoff.id });
    const persisted = await getFranchiseSeasonSummaryByFranchise(franchiseId, seasonNumber);

    expect(persisted).toMatchObject({
      id: seasonId,
      franchiseId,
      seasonNumber,
      seasonId,
      statsScopeId: seasonId,
      offseasonStateId: `offseason-${seasonId}`,
      playoffs: {
        playoffId: playoff.id,
        status: 'present',
      },
      manifest: {
        contractVersion: 'franchise-season-summary-no-awards-manifest-v1',
        franchiseId,
        seasonId,
        statsScopeId: seasonId,
        readOnly: true,
        hiddenSafe: true,
        policyFlags: {
          awardsImplemented: false,
          mode3ExecutionAllowed: false,
          seasonRolloverAllowed: false,
          salaryMovementAllowed: false,
          relationshipMutationAllowed: false,
        },
      },
      awards: { status: 'placeholder' },
      fanMorale: { status: 'placeholder' },
    });
    expect(persisted?.handoff).toMatchObject({
      seasonId,
      statsScopeId: seasonId,
      seasonSummaryId: seasonId,
    });
    expect(persisted?.completedGames.gameIds).toEqual([gameId]);
    expect(persisted?.seasonStats.batting).toHaveLength(1);
    expect(persisted?.manifest.categories.map((category) => category.key)).toContain('awards-watchlists');
    expect(persisted?.manifest.categories.find((category) => category.key === 'awards-watchlists')).toMatchObject({
      status: 'blocked',
    });
    expect(persisted?.manifest.categories.find((category) => category.key === 'mode3-offseason-rollover')).toMatchObject({
      status: 'blocked',
    });
  });

  test('marks no-awards manifest incomplete when regular-season schedule rows remain unresolved', async () => {
    const franchiseId = nextId('summary-incomplete-manifest');
    const seasonNumber = 10;
    const seasonId = getFranchiseSeasonId(franchiseId, seasonNumber);
    await seedFranchiseGame({
      franchiseId,
      seasonNumber,
      awayTeamId: 'done-away',
      homeTeamId: 'done-home',
      awayScore: 4,
      homeScore: 6,
    });
    await addGame({
      franchiseId,
      seasonNumber,
      awayTeamId: 'pending-away',
      homeTeamId: 'pending-home',
    });

    const summary = await createFranchiseSeasonSummary({ franchiseId, seasonNumber });

    expect(summary.seasonId).toBe(seasonId);
    expect(summary.manifest.status).toBe('incomplete');
    expect(summary.manifest.blockers.join(' ')).toMatch(/regular-season schedule row/i);
    expect(summary.manifest.categories.find((category) => category.key === 'regular-season-schedule')).toMatchObject({
      status: 'incomplete',
    });
    expect(summary.manifest.policyFlags.awardsImplemented).toBe(false);
    expect(summary.manifest.policyFlags.mode3ExecutionAllowed).toBe(false);
  });

  test('excludes incomplete fallback archives from durable summary completed-game snapshots', async () => {
    const franchiseId = nextId('summary-incomplete');
    const seasonNumber = 8;
    const seasonId = getFranchiseSeasonId(franchiseId, seasonNumber);
    const completeScheduleGame = await addGame({
      franchiseId,
      seasonNumber,
      awayTeamId: 'complete-away',
      homeTeamId: 'complete-home',
    });
    const incompleteScheduleGame = await addGame({
      franchiseId,
      seasonNumber,
      awayTeamId: 'incomplete-away',
      homeTeamId: 'incomplete-home',
    });

    await completeGame(completeScheduleGame.id, {
      awayScore: 3,
      homeScore: 4,
      winningTeamId: 'complete-home',
      losingTeamId: 'complete-away',
      gameLogId: 'complete-game',
    });
    await completeGame(incompleteScheduleGame.id, {
      awayScore: 1,
      homeScore: 2,
      winningTeamId: 'incomplete-home',
      losingTeamId: 'incomplete-away',
      gameLogId: 'incomplete-game',
    });

    await seedCompletedGame(makeCompletedGame({
      gameId: 'complete-game',
      franchiseId,
      seasonNumber,
      seasonId,
      awayTeamId: 'complete-away',
      homeTeamId: 'complete-home',
      awayScore: 3,
      homeScore: 4,
      scheduleGameId: completeScheduleGame.id,
    }));
    await seedCompletedGame({
      ...makeCompletedGame({
        gameId: 'incomplete-game',
        franchiseId,
        seasonNumber,
        seasonId,
        awayTeamId: 'incomplete-away',
        homeTeamId: 'incomplete-home',
        awayScore: 1,
        homeScore: 2,
        scheduleGameId: incompleteScheduleGame.id,
      }),
      aggregationStatus: 'incomplete',
    });

    const summary = await createFranchiseSeasonSummary({ franchiseId, seasonNumber });

    expect(summary.completedGames.gameIds).toEqual(['complete-game']);
    expect(summary.completedGames.games).toEqual([
      expect.objectContaining({ gameId: 'complete-game' }),
    ]);
  });

  test('explicit same-franchise wrong-season playoff is rejected from summary creation', async () => {
    const franchiseId = nextId('summary-wrong-playoff');
    const seasonNumber = 7;
    const seasonId = getFranchiseSeasonId(franchiseId, seasonNumber);
    const wrongPlayoff = await createPlayoff({
      seasonNumber: seasonNumber + 1,
      seasonId: getFranchiseSeasonId(franchiseId, seasonNumber + 1),
      franchiseId,
      sourceType: 'franchise',
      status: 'COMPLETED',
      teamsQualifying: 2,
      rounds: 1,
      gamesPerRound: [3],
      inningsPerGame: 9,
      useDH: true,
      leagues: ['Eastern', 'Western'],
      conferenceChampionship: false,
      teams: [],
      currentRound: 1,
      champion: 'wrong-season-team',
    });

    await createFranchiseSeasonSummary({
      franchiseId,
      seasonNumber,
      playoffId: wrongPlayoff.id,
    });

    const persisted = await getFranchiseSeasonSummary(seasonId);
    expect(persisted?.playoffs).toEqual({ status: 'none' });
    expect(persisted?.handoff.playoffId).toBeUndefined();
  });

  test('saved summaries are copy-not-reference snapshots', async () => {
    const franchiseId = nextId('summary-copy');
    const seasonNumber = 6;
    const firstGame = await seedFranchiseGame({
      franchiseId,
      seasonNumber,
      awayTeamId: 'copy-away',
      homeTeamId: 'copy-home',
      awayScore: 1,
      homeScore: 2,
    });

    const saved = await createFranchiseSeasonSummary({ franchiseId, seasonNumber });
    saved.standings.teams[0].wins = 999;

    await seedFranchiseGame({
      franchiseId,
      seasonNumber,
      awayTeamId: 'copy-away-2',
      homeTeamId: 'copy-home-2',
      awayScore: 8,
      homeScore: 9,
    });

    const persisted = await getFranchiseSeasonSummary(firstGame.seasonId);

    expect(persisted?.completedGames.gameIds).toEqual([firstGame.gameId]);
    expect(persisted?.standings.teams[0].wins).not.toBe(999);
    expect(persisted?.standings.teams.map((team) => team.teamId).sort()).toEqual(['copy-away', 'copy-home']);
  });

  test('franchise transition options preserve global current-season markers and skip mojo reset', async () => {
    localStorage.setItem('kbl-current-season', '99');
    localStorage.setItem('kbl_years_of_service', JSON.stringify({ player: 2 }));
    const playerStorage: PlayerStorageAdapter = {
      getAll: vi.fn().mockResolvedValue([]),
      get: vi.fn().mockResolvedValue(null),
      save: vi.fn().mockResolvedValue({ id: 'unused' }),
    };

    const result = await executeSeasonTransition(3, undefined, playerStorage, {
      skipMojoReset: true,
      skipLegacyLocalStorageMarkers: true,
    });

    expect(result.success).toBe(true);
    expect(result.summary.mojosReset).toBe(0);
    expect(result.steps[3].details).toContain('Mojo reset skipped');
    expect(localStorage.getItem('kbl-current-season')).toBe('99');
    expect(localStorage.getItem('kbl_last_transition')).toBeNull();
    expect(localStorage.getItem('kbl_years_of_service')).toBe(JSON.stringify({ player: 2 }));
  });
});
