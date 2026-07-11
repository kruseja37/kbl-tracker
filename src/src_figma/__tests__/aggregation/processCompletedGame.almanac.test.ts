import { beforeEach, describe, expect, test, vi } from 'vitest';

const {
  mockAggregateGameToSeason,
  mockArchiveCompletedGame,
  mockGetCompletedGameById,
  mockGetGameHeader,
  mockMarkAggregationFailed,
  mockMarkGameAggregated,
  mockGetEffectivePlayer,
  mockRegisterAlmanacPlayers,
  mockPatchCompletedGameLivingSeasonProcessing,
  archiveRecord,
} = vi.hoisted(() => ({
  mockAggregateGameToSeason: vi.fn().mockResolvedValue({
    success: true,
    milestones: null,
    seasonMilestones: [],
    careerMilestones: [],
    franchiseFirsts: [],
    franchiseLeaderEvents: [],
    fameEvents: [],
    milestonesRecorded: [],
  }),
  mockArchiveCompletedGame: vi.fn().mockResolvedValue(undefined),
  mockGetCompletedGameById: vi.fn().mockResolvedValue(null),
  mockGetGameHeader: vi.fn().mockResolvedValue(null),
  mockMarkAggregationFailed: vi.fn().mockResolvedValue(undefined),
  mockMarkGameAggregated: vi.fn().mockResolvedValue(undefined),
  mockGetEffectivePlayer: vi.fn(),
  mockRegisterAlmanacPlayers: vi.fn().mockResolvedValue(undefined),
  mockPatchCompletedGameLivingSeasonProcessing: vi.fn(),
  archiveRecord: { current: null as Record<string, unknown> | null },
}));

vi.mock('../../../utils/seasonAggregator', () => ({
  aggregateGameToSeason: mockAggregateGameToSeason,
  isCompleteGameByContext: vi.fn((stats, context = {}) =>
    stats.isStarter && stats.outsRecorded >= (context.scheduledInnings ?? 9) * 3,
  ),
}));

vi.mock('../../../utils/gameStorage', () => ({
  archiveCompletedGame: mockArchiveCompletedGame,
  getCompletedGameById: mockGetCompletedGameById,
  getSoulOutcomes: (record: { livingSeasonProcessing?: unknown }) => record.livingSeasonProcessing ?? null,
  LIVING_SEASON_PROCESSING_VERSION: '1',
  SOUL_BRANCH_KEYS: [
    'fame', 'moraleAuto', 'checkpointDev', 'traits', 'L10', 'L11',
    'L12raceAllstar', 'L13', 'stadium', 'trueValueSnapshot',
  ],
  patchCompletedGameLivingSeasonProcessing: mockPatchCompletedGameLivingSeasonProcessing,
  resolveExhibitionLeagueId: (game: {
    leagueId?: string;
    competitionId?: string;
    competitionType?: string;
  }) =>
    game.leagueId ??
    (game.competitionType === 'exhibition' || !game.competitionType
      ? game.competitionId
      : undefined),
  // A1.5d-1b: the dark stadium-records tap (transitively imported via
  // processCompletedGame) reads getRecentGames at module-load; stub it.
  getRecentGames: vi.fn().mockResolvedValue([]),
}));

vi.mock('../../../utils/eventLog', () => ({
  getGameHeader: mockGetGameHeader,
  markAggregationFailed: mockMarkAggregationFailed,
  markGameAggregated: mockMarkGameAggregated,
}));

vi.mock('../../../utils/playerOverrides', () => ({
  getEffectivePlayer: mockGetEffectivePlayer,
}));

vi.mock('../../../utils/registerAlmanacPlayers', () => ({
  registerAlmanacPlayers: mockRegisterAlmanacPlayers,
}));

import { processCompletedGame } from '../../../utils/processCompletedGame';

function createGameState() {
  return {
    id: 'current',
    gameId: 'game-exh-1',
    savedAt: Date.now(),
    inning: 9,
    halfInning: 'BOTTOM' as const,
    outs: 3,
    homeScore: 5,
    awayScore: 4,
    bases: {
      first: null,
      second: null,
      third: null,
    },
    currentBatterIndex: 0,
    atBatCount: 27,
    awayTeamId: 'away-team',
    homeTeamId: 'home-team',
    awayTeamName: 'Away Team',
    homeTeamName: 'Home Team',
    seasonNumber: 1,
    competitionType: 'exhibition' as const,
    competitionId: 'league-exh',
    playerStats: {
      'player-1': {
        playerName: 'Player One',
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
    pitcherGameStats: [
      {
        pitcherId: 'pitcher-1',
        pitcherName: 'Pitcher One',
        teamId: 'home-team',
        isStarter: true,
        entryInning: 1,
        outsRecorded: 27,
        hitsAllowed: 2,
        runsAllowed: 1,
        earnedRuns: 1,
        walksAllowed: 1,
        strikeoutsThrown: 7,
        homeRunsAllowed: 0,
        hitBatters: 0,
        basesReachedViaError: 0,
        wildPitches: 0,
        pitchCount: 96,
        battersFaced: 30,
        consecutiveHRsAllowed: 0,
        firstInningRuns: 0,
        basesLoadedWalks: 0,
        inningsComplete: 9,
        decision: 'W' as const,
        save: false,
        hold: false,
        blownSave: false,
      },
    ],
    fameEvents: [],
    activityLog: [],
  };
}

const mockEffectivePlayer = {
  firstName: 'Test',
  lastName: 'Player',
  nickname: 'TP',
  hometown: { city: 'Denver', state: 'CO' },
  age: 27,
  gender: 'M' as const,
  bats: 'R' as const,
  throws: 'R' as const,
  primaryPosition: 'SS' as const,
  secondaryPosition: '2B' as const,
  power: 65,
  contact: 70,
  speed: 60,
  fielding: 58,
  arm: 62,
  velocity: 40,
  junk: 35,
  accuracy: 45,
  arsenal: ['4F'] as const,
  overallGrade: 'B' as const,
  trait1: 'Clutch',
  trait2: 'Sparkplug',
  personality: 'Competitive' as const,
  chemistry: 'Competitive' as const,
  morale: 50,
  mojo: 'Normal' as const,
  fame: 10,
  salary: 1000000,
};

describe('processCompletedGame exhibition almanac registration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAggregateGameToSeason.mockResolvedValue({
      success: true,
      milestones: null,
      seasonMilestones: [],
      careerMilestones: [],
      franchiseFirsts: [],
      franchiseLeaderEvents: [],
      fameEvents: [],
      milestonesRecorded: [],
    });
    mockGetEffectivePlayer.mockResolvedValue(mockEffectivePlayer);
    archiveRecord.current = null;
    mockArchiveCompletedGame.mockImplementation(async (
      state: ReturnType<typeof createGameState>,
      _score: unknown,
      _innings: unknown,
      seasonId: string | undefined,
      context: Record<string, unknown> | undefined,
    ) => {
      archiveRecord.current = {
        gameId: state.gameId,
        aggregationStatus: 'aggregated',
        seasonId,
        statsScopeId: context?.statsScopeId ?? seasonId,
        franchiseId: context?.franchiseId,
        seasonNumber: state.seasonNumber,
        livingSeasonProcessing: context?.livingSeasonProcessing,
      };
    });
    mockGetCompletedGameById.mockImplementation(async (gameId: string) => (
      archiveRecord.current?.gameId === gameId ? archiveRecord.current : null
    ));
    mockPatchCompletedGameLivingSeasonProcessing.mockImplementation(async (
      _gameId: string,
      update: (current: Record<string, unknown>) => Record<string, unknown>,
    ) => {
      archiveRecord.current = {
        ...archiveRecord.current,
        livingSeasonProcessing: update(
          archiveRecord.current?.livingSeasonProcessing as Record<string, unknown>,
        ),
      };
      return archiveRecord.current;
    });
    mockGetGameHeader.mockResolvedValue(null);
  });

  test('falls back to competitionId for exhibition league registration', async () => {
    const gameState = createGameState();

    await processCompletedGame(gameState);

    expect(mockGetEffectivePlayer).toHaveBeenCalledWith('player-1', 'league-exh');
    expect(mockGetEffectivePlayer).toHaveBeenCalledWith('pitcher-1', 'league-exh');
    expect(mockArchiveCompletedGame).toHaveBeenCalledWith(
      gameState,
      { away: 4, home: 5 },
      [],
      undefined,
      { leagueId: 'league-exh' }
    );
    expect(mockRegisterAlmanacPlayers).toHaveBeenCalledWith(
      gameState,
      'league-exh',
      {
        competitionId: 'league-exh',
        competitionName: undefined,
        competitionType: 'exhibition',
        franchiseId: undefined,
        leagueId: 'league-exh',
      },
    );
    expect(gameState.playerRatingsSnapshots).toMatchObject({
      'player-1': expect.objectContaining({ playerId: 'player-1', firstName: 'Test' }),
      'pitcher-1': expect.objectContaining({ playerId: 'pitcher-1', firstName: 'Test' }),
    });
  });

  test('does not archive or register almanac players when season aggregation fails', async () => {
    const gameState = {
      ...createGameState(),
      competitionType: 'franchise' as const,
      competitionId: 'franchise-fail',
      franchiseId: 'franchise-fail',
      seasonId: 'franchise-fail-season-1',
      statsScopeId: 'franchise-fail-season-1',
    };
    mockAggregateGameToSeason.mockResolvedValueOnce({
      success: false,
      milestones: null,
      error: 'season DB unavailable',
    });

    await expect(processCompletedGame(gameState)).rejects.toThrow('season DB unavailable');

    expect(mockArchiveCompletedGame).not.toHaveBeenCalled();
    expect(mockRegisterAlmanacPlayers).not.toHaveBeenCalled();
    expect(mockGetEffectivePlayer).not.toHaveBeenCalled();
    expect(mockMarkAggregationFailed).toHaveBeenCalledWith(
      'game-exh-1',
      'season DB unavailable',
    );
  });

  test('skips duplicate aggregation when a completed archive already exists', async () => {
    const gameState = createGameState();
    mockGetCompletedGameById.mockResolvedValueOnce({
      gameId: gameState.gameId,
      aggregationStatus: 'aggregated',
    });

    await processCompletedGame(gameState);

    expect(mockAggregateGameToSeason).not.toHaveBeenCalled();
    expect(mockArchiveCompletedGame).not.toHaveBeenCalled();
    expect(mockMarkGameAggregated).not.toHaveBeenCalled();
  });

  test('repairs archive without re-aggregating when the event header is already aggregated', async () => {
    const gameState = createGameState();
    mockGetGameHeader.mockResolvedValueOnce({ aggregated: true });

    await processCompletedGame(gameState);

    expect(mockAggregateGameToSeason).not.toHaveBeenCalled();
    expect(mockArchiveCompletedGame).toHaveBeenCalledTimes(1);
    expect(mockRegisterAlmanacPlayers).toHaveBeenCalledWith(
      gameState,
      'league-exh',
      expect.objectContaining({
        competitionId: 'league-exh',
        competitionType: 'exhibition',
        leagueId: 'league-exh',
      }),
    );
  });

  test('registers franchise players in Almanac even without an exhibition league id', async () => {
    const gameState = {
      ...createGameState(),
      gameId: 'game-franchise-1',
      competitionType: 'franchise' as const,
      competitionId: 'franchise-alpha',
      competitionName: 'Alpha Franchise',
      franchiseId: 'franchise-alpha',
      leagueId: undefined,
      seasonId: 'franchise-alpha-season-1',
      statsScopeId: 'franchise-alpha-season-1',
      scheduleGameId: 'sched-1',
      playerWpaTotals: [
        {
          playerId: 'player-1',
          playerName: 'Player One',
          teamId: 'away-team',
          totalWpa: 0.184,
          battingWpa: 0.184,
          pitchingWpa: 0,
          catchingWpa: 0,
          fieldingWpa: 0,
          baserunningWpa: 0,
          managingWpa: 0,
        },
      ],
      managerWpaTotals: [
        {
          managerId: 'away-manager',
          managerName: 'Away Manager',
          teamId: 'away-team',
          tacticalManagerWpa: 0.12,
          deploymentWpa: 0,
          lineupDeltaWpa: 0.02,
          managerValue: 0.14,
        },
      ],
    };

    await processCompletedGame(
      gameState,
      { seasonId: 'franchise-alpha-season-1' },
      undefined,
      {
        seasonId: 'franchise-alpha-season-1',
        context: {
          competitionType: 'franchise',
          competitionId: 'franchise-alpha',
          competitionName: 'Alpha Franchise',
          franchiseId: 'franchise-alpha',
          statsScopeId: 'franchise-alpha-season-1',
          scheduleGameId: 'sched-1',
          playerWpaTotals: gameState.playerWpaTotals,
          managerWpaTotals: gameState.managerWpaTotals,
        },
      },
    );

    expect(mockArchiveCompletedGame).toHaveBeenCalledWith(
      gameState,
      { away: 4, home: 5 },
      [],
      'franchise-alpha-season-1',
      expect.objectContaining({
        competitionType: 'franchise',
        competitionId: 'franchise-alpha',
        franchiseId: 'franchise-alpha',
        statsScopeId: 'franchise-alpha-season-1',
        playerWpaTotals: gameState.playerWpaTotals,
        managerWpaTotals: gameState.managerWpaTotals,
      }),
    );
    expect(mockRegisterAlmanacPlayers).toHaveBeenCalledWith(
      gameState,
      undefined,
      {
        competitionId: 'franchise-alpha',
        competitionName: 'Alpha Franchise',
        competitionType: 'franchise',
        franchiseId: 'franchise-alpha',
        leagueId: undefined,
      },
    );
  });
});
