import 'fake-indexeddb/auto';

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getGameHeader: vi.fn().mockResolvedValue(null),
  markAggregationFailed: vi.fn().mockResolvedValue(undefined),
  markGameAggregated: vi.fn().mockResolvedValue(undefined),
  getEffectivePlayer: vi.fn(),
  registerAlmanacPlayers: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../eventLog', () => ({
  getGameHeader: mocks.getGameHeader,
  markAggregationFailed: mocks.markAggregationFailed,
  markGameAggregated: mocks.markGameAggregated,
  getFieldingEventsForScope: vi.fn().mockResolvedValue([]),
  getGameHeadersForScope: vi.fn().mockResolvedValue([]),
}));

vi.mock('../playerOverrides', () => ({
  getEffectivePlayer: mocks.getEffectivePlayer,
}));

vi.mock('../registerAlmanacPlayers', () => ({
  registerAlmanacPlayers: mocks.registerAlmanacPlayers,
}));

vi.mock('../syncEngine', () => ({
  syncEngine: {
    isSuppressed: () => true,
    upsert: vi.fn(),
    remove: vi.fn(),
  },
}));

import { aggregateGameToPlayoffStats, createPlayoff, getPlayoffStats, resetPlayoffDbConnection } from '../playoffStorage';
import { processCompletedGame, shouldAggregateToRegularSeasonStats } from '../processCompletedGame';
import { getCompletedGameById } from '../gameStorage';
import { buildFranchisePlayerTeamStatStints } from '../franchiseStatAttribution';
import {
  createInitialBattingStats,
  getSeasonBattingStats,
  getSeasonMetadata,
  updateBattingStats,
} from '../seasonStorage';
import { getPlayerMilestones } from '../careerStorage';
import { resetTrackerDbForTests } from '../trackerDb';
import type { PersistedGameState } from '../gameStorage';

function deleteDatabase(name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => resolve();
  });
}

function batter(
  playerName: string,
  teamId: string,
  overrides: Partial<PersistedGameState['playerStats'][string]> = {},
): PersistedGameState['playerStats'][string] {
  return {
    playerName,
    teamId,
    pa: 4,
    ab: 4,
    h: 1,
    singles: 1,
    doubles: 0,
    triples: 0,
    hr: 0,
    rbi: 0,
    r: 0,
    bb: 0,
    hbp: 0,
    k: 1,
    sb: 0,
    cs: 0,
    sf: 0,
    sh: 0,
    gidp: 0,
    putouts: 1,
    assists: 0,
    fieldingErrors: 0,
    ...overrides,
  };
}

function pitcher(
  pitcherId: string,
  pitcherName: string,
  teamId: string,
  overrides: Partial<PersistedGameState['pitcherGameStats'][number]> = {},
): PersistedGameState['pitcherGameStats'][number] {
  return {
    pitcherId,
    pitcherName,
    teamId,
    isStarter: true,
    entryInning: 1,
    outsRecorded: 18,
    hitsAllowed: 3,
    runsAllowed: 1,
    earnedRuns: 1,
    walksAllowed: 1,
    strikeoutsThrown: 6,
    homeRunsAllowed: 0,
    hitBatters: 0,
    basesReachedViaError: 0,
    wildPitches: 0,
    pitchCount: 88,
    battersFaced: 24,
    consecutiveHRsAllowed: 0,
    firstInningRuns: 0,
    basesLoadedWalks: 0,
    inningsComplete: 6,
    decision: 'W',
    save: false,
    hold: false,
    blownSave: false,
    ...overrides,
  };
}

function gameState(
  overrides: Partial<PersistedGameState> = {},
): PersistedGameState {
  return {
    id: 'current',
    gameId: 'game-1',
    savedAt: 1,
    inning: 9,
    halfInning: 'BOTTOM',
    outs: 3,
    homeScore: 4,
    awayScore: 3,
    bases: { first: null, second: null, third: null },
    currentBatterIndex: 0,
    atBatCount: 36,
    awayTeamId: 'team-a',
    homeTeamId: 'team-b',
    awayTeamName: 'Team A',
    homeTeamName: 'Team B',
    seasonNumber: 1,
    seasonId: 'franchise-a-season-1',
    statsScopeId: 'franchise-a-season-1',
    franchiseId: 'franchise-a',
    competitionType: 'franchise',
    competitionId: 'franchise-a',
    playerStats: {
      'player-1': batter('Jordan Switch', 'team-a'),
    },
    pitcherGameStats: [
      pitcher('pitcher-1', 'Pat Starter', 'team-b'),
    ],
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

describe('processCompletedGame stat truth boundary', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    resetTrackerDbForTests();
    resetPlayoffDbConnection();
    await Promise.all([
      deleteDatabase('kbl-tracker').catch(() => undefined),
      deleteDatabase('kbl-playoffs').catch(() => undefined),
    ]);
  });

  afterEach(async () => {
    resetTrackerDbForTests();
    resetPlayoffDbConnection();
    await Promise.all([
      deleteDatabase('kbl-tracker').catch(() => undefined),
      deleteDatabase('kbl-playoffs').catch(() => undefined),
    ]);
  });

  test('regular-season franchise games aggregate only to regular-season stats', async () => {
    const regularGame = gameState({
      gameId: 'regular-1',
      playerStats: {
        'player-1': batter('Jordan Switch', 'team-a', { h: 2, singles: 2 }),
      },
    });

    await processCompletedGame(regularGame, {
      seasonId: 'franchise-a-season-1',
      detectMilestones: false,
    });

    const batting = await getSeasonBattingStats('franchise-a-season-1');
    expect(batting).toHaveLength(1);
    expect(batting[0]).toMatchObject({
      playerId: 'player-1',
      teamId: 'team-a',
      games: 1,
      hits: 2,
    });
    await expect(getSeasonMetadata('franchise-a-season-1')).resolves.toMatchObject({
      gamesPlayed: 1,
    });
  });

  test('season milestone crossing persists once and its fame event reaches the completed archive', async () => {
    await updateBattingStats({
      ...createInitialBattingStats(
        'franchise-a-season-1',
        'player-1',
        'Jordan Switch',
        'team-a',
      ),
      games: 20,
      pa: 80,
      ab: 72,
      hits: 40,
      singles: 1,
      homeRuns: 39,
    });
    const milestoneGame = gameState({
      gameId: 'season-milestone-40-hr',
      playerStats: {
        'player-1': batter('Jordan Switch', 'team-a', {
          h: 1,
          singles: 0,
          hr: 1,
          rbi: 1,
          r: 1,
        }),
      },
    });

    await processCompletedGame(milestoneGame, {
      seasonId: 'franchise-a-season-1',
      detectMilestones: true,
      milestoneConfig: { gamesPerSeason: 162, inningsPerGame: 9 },
    });

    await expect(getCompletedGameById(milestoneGame.gameId)).resolves.toMatchObject({
      fameEvents: [expect.objectContaining({ eventType: 'SEASON_40_HR', playerId: 'player-1' })],
    });
    await expect(getPlayerMilestones('player-1')).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'season:franchise-a-season-1:SEASON_40_HR:40:player-1',
          milestoneType: 'SEASON_40_HR_franchise-a-season-1',
        }),
      ]),
    );
  });

  test('exhibition archives remain available without writing generic regular-season stats', async () => {
    const exhibition = gameState({
      gameId: 'exhibition-no-season-pollution',
      seasonId: undefined,
      statsScopeId: undefined,
      franchiseId: undefined,
      competitionType: 'exhibition',
      competitionId: 'league-exhibition',
      leagueId: 'league-exhibition',
    });

    expect(shouldAggregateToRegularSeasonStats(exhibition)).toBe(false);
    await processCompletedGame(exhibition, { seasonId: 'season-1', detectMilestones: false });

    await expect(getSeasonBattingStats('season-1')).resolves.toEqual([]);
    await expect(getCompletedGameById(exhibition.gameId)).resolves.toMatchObject({
      competitionType: 'exhibition',
      leagueId: 'league-exhibition',
    });
    expect((await getCompletedGameById(exhibition.gameId))?.livingSeasonProcessing).toBeUndefined();
  });

  test('rejects disagreeing regular-season seasonId/statsScopeId before any write', async () => {
    const mismatched = gameState({
      gameId: 'scope-mismatch',
      seasonId: 'franchise-a-season-1',
      statsScopeId: 'franchise-a-season-2',
    });

    await expect(processCompletedGame(mismatched, {
      seasonId: 'franchise-a-season-1',
      detectMilestones: false,
    })).rejects.toThrow(
      'Regular-season completion scope mismatch: seasonId "franchise-a-season-1" does not match statsScopeId "franchise-a-season-2" for game scope-mismatch',
    );

    await expect(getSeasonBattingStats('franchise-a-season-1')).resolves.toEqual([]);
    await expect(getSeasonBattingStats('franchise-a-season-2')).resolves.toEqual([]);
    await expect(getCompletedGameById('scope-mismatch')).resolves.toBeNull();
    expect(mocks.markGameAggregated).not.toHaveBeenCalled();
    expect(mocks.registerAlmanacPlayers).not.toHaveBeenCalled();
  });

  test('keeps matching and single-identifier regular-season completions valid', async () => {
    await expect(processCompletedGame(gameState({ gameId: 'scope-match' }), {
      seasonId: 'franchise-a-season-1',
      detectMilestones: false,
    })).resolves.toMatchObject({ aggregation: { success: true } });
    await expect(processCompletedGame(gameState({
      gameId: 'scope-single',
      statsScopeId: undefined,
    }), {
      seasonId: 'franchise-a-season-1',
      detectMilestones: false,
    })).resolves.toMatchObject({ aggregation: { success: true } });

    await expect(getCompletedGameById('scope-match')).resolves.not.toBeNull();
    await expect(getCompletedGameById('scope-single')).resolves.not.toBeNull();
  });

  test('playoff games archive and aggregate to playoff stats without regular-season contamination', async () => {
    const playoff = await createPlayoff({
      seasonNumber: 1,
      seasonId: 'franchise-a-season-1',
      status: 'IN_PROGRESS',
      teamsQualifying: 2,
      rounds: 1,
      gamesPerRound: [1],
      inningsPerGame: 9,
      useDH: true,
      leagues: ['Eastern'],
      conferenceChampionship: false,
      teams: [],
      currentRound: 1,
      sourceType: 'franchise',
      franchiseId: 'franchise-a',
    });
    const playoffGame = gameState({
      gameId: 'playoff-1',
      competitionType: 'playoff',
      playoffId: playoff.id,
      playerStats: {
        'player-1': batter('Jordan Switch', 'team-a', { h: 3, singles: 0, hr: 1 }),
      },
    });

    expect(shouldAggregateToRegularSeasonStats(playoffGame)).toBe(false);

    await processCompletedGame(
      playoffGame,
      { seasonId: 'franchise-a-season-1', detectMilestones: false },
      undefined,
      {
        seasonId: 'franchise-a-season-1',
        context: {
          franchiseId: 'franchise-a',
          statsScopeId: 'franchise-a-season-1',
          competitionType: 'playoff',
          competitionId: playoff.id,
          playoffId: playoff.id,
        },
      },
    );
    await aggregateGameToPlayoffStats(playoff.id, playoffGame);

    await expect(getSeasonBattingStats('franchise-a-season-1')).resolves.toEqual([]);
    const playoffStats = await getPlayoffStats(playoff.id);
    expect(playoffStats).toHaveLength(2);
    expect(playoffStats.find((row) => row.playerId === 'player-1')).toMatchObject({
      playerId: 'player-1',
      teamId: 'team-a',
      hits: 3,
      homeRuns: 1,
      processedGameIds: ['playoff-1'],
    });
  });

  test('restored playoff games without competition type do not contaminate regular-season stats', async () => {
    const restoredPlayoffGame = gameState({
      gameId: 'legacy-playoff-identity',
      competitionType: undefined,
      playoffId: 'playoff-legacy',
      playoffSeriesId: 'series-legacy',
      playoffGameNumber: 1,
      playerStats: {
        'player-1': batter('Jordan Switch', 'team-a', { h: 4, doubles: 1, hr: 1 }),
      },
    });

    expect(shouldAggregateToRegularSeasonStats(restoredPlayoffGame)).toBe(false);

    await processCompletedGame(
      restoredPlayoffGame,
      { seasonId: 'franchise-a-season-1', detectMilestones: false },
      undefined,
      {
        seasonId: 'franchise-a-season-1',
        context: {
          franchiseId: 'franchise-a',
          statsScopeId: 'franchise-a-season-1',
          playoffId: 'playoff-legacy',
          playoffSeriesId: 'series-legacy',
          playoffGameNumber: 1,
        },
      },
    );

    await expect(getSeasonBattingStats('franchise-a-season-1')).resolves.toEqual([]);
    await expect(getCompletedGameById('legacy-playoff-identity')).resolves.toMatchObject({
      gameId: 'legacy-playoff-identity',
      playoffId: 'playoff-legacy',
      playoffSeriesId: 'series-legacy',
      playoffGameNumber: 1,
      franchiseId: 'franchise-a',
    });
  });

  test('post-trade regular-season stats keep player totals continuous and team attribution explicit', async () => {
    await processCompletedGame(
      gameState({
        gameId: 'pre-trade',
        playerStats: {
          'player-1': batter('Jordan Switch', 'team-a', { h: 1, singles: 1 }),
        },
      }),
      { seasonId: 'franchise-a-season-1', detectMilestones: false },
    );
    await processCompletedGame(
      gameState({
        gameId: 'post-trade',
        playerStats: {
          'player-1': batter('Jordan Switch', 'team-b', { h: 2, singles: 0, doubles: 2 }),
        },
      }),
      { seasonId: 'franchise-a-season-1', detectMilestones: false },
    );

    const [seasonRow] = await getSeasonBattingStats('franchise-a-season-1');
    expect(seasonRow).toMatchObject({
      playerId: 'player-1',
      hits: 3,
      games: 2,
    });

    const archivedGames = await Promise.all([
      getCompletedGameById('pre-trade'),
      getCompletedGameById('post-trade'),
    ]);
    const stints = buildFranchisePlayerTeamStatStints(
      archivedGames.filter((game): game is NonNullable<typeof game> => game !== null),
      {
        franchiseId: 'franchise-a',
        seasonId: 'franchise-a-season-1',
        statsScopeId: 'franchise-a-season-1',
      },
    );

    expect(stints.filter((stint) => stint.playerId === 'player-1').map((stint) => ({
      playerId: stint.playerId,
      teamId: stint.teamId,
      hits: stint.batting.hits,
      gameIds: stint.gameIds,
    }))).toEqual([
      { playerId: 'player-1', teamId: 'team-a', hits: 1, gameIds: ['pre-trade'] },
      { playerId: 'player-1', teamId: 'team-b', hits: 2, gameIds: ['post-trade'] },
    ]);
  });

  test('completion retry does not double-count regular-season stats or archive-derived stints', async () => {
    const regularGame = gameState({
      gameId: 'retry-regular',
      playerStats: {
        'player-1': batter('Jordan Switch', 'team-a', { h: 2 }),
      },
    });

    await processCompletedGame(regularGame, {
      seasonId: 'franchise-a-season-1',
      detectMilestones: false,
    });
    await processCompletedGame(regularGame, {
      seasonId: 'franchise-a-season-1',
      detectMilestones: false,
    });

    const [seasonRow] = await getSeasonBattingStats('franchise-a-season-1');
    expect(seasonRow).toMatchObject({ playerId: 'player-1', games: 1, hits: 2 });

    const archived = await getCompletedGameById('retry-regular');
    const stints = buildFranchisePlayerTeamStatStints(
      archived ? [archived] : [],
      {
        franchiseId: 'franchise-a',
        seasonId: 'franchise-a-season-1',
        statsScopeId: 'franchise-a-season-1',
      },
    );
    expect(stints.find((stint) => stint.playerId === 'player-1')).toMatchObject({
      games: 1,
      batting: expect.objectContaining({ hits: 2 }),
      gameIds: ['retry-regular'],
    });
  });

  test('playoff completion retry does not double-count playoff stats', async () => {
    const playoff = await createPlayoff({
      seasonNumber: 1,
      seasonId: 'franchise-a-season-1',
      status: 'IN_PROGRESS',
      teamsQualifying: 2,
      rounds: 1,
      gamesPerRound: [1],
      inningsPerGame: 9,
      useDH: true,
      leagues: ['Eastern'],
      conferenceChampionship: false,
      teams: [],
      currentRound: 1,
      sourceType: 'franchise',
      franchiseId: 'franchise-a',
    });
    const playoffGame = gameState({
      gameId: 'retry-playoff',
      competitionType: 'playoff',
      playoffId: playoff.id,
      playerStats: {
        'player-1': batter('Jordan Switch', 'team-a', { h: 2 }),
      },
    });

    await processCompletedGame(
      playoffGame,
      { seasonId: 'franchise-a-season-1', detectMilestones: false },
      undefined,
      {
        seasonId: 'franchise-a-season-1',
        context: {
          franchiseId: 'franchise-a',
          statsScopeId: 'franchise-a-season-1',
          competitionType: 'playoff',
          competitionId: playoff.id,
          playoffId: playoff.id,
        },
      },
    );
    await processCompletedGame(
      playoffGame,
      { seasonId: 'franchise-a-season-1', detectMilestones: false },
      undefined,
      {
        seasonId: 'franchise-a-season-1',
        context: {
          franchiseId: 'franchise-a',
          statsScopeId: 'franchise-a-season-1',
          competitionType: 'playoff',
          competitionId: playoff.id,
          playoffId: playoff.id,
        },
      },
    );
    await aggregateGameToPlayoffStats(playoff.id, playoffGame);
    await aggregateGameToPlayoffStats(playoff.id, playoffGame);

    await expect(getSeasonBattingStats('franchise-a-season-1')).resolves.toEqual([]);
    const playoffStats = await getPlayoffStats(playoff.id);
    expect(playoffStats.find((row) => row.playerId === 'player-1')).toMatchObject({
      hits: 2,
      games: 1,
      processedGameIds: ['retry-playoff'],
    });
  });
});
