import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

const {
  mockGetGameHeader,
  mockGetGameEvents,
  mockGetBetweenPlayEvents,
  mockCreateGameHeader,
  mockMarkGameAggregated,
  mockLoadCurrentGame,
  mockSaveCurrentGame,
  mockImmediateSaveCurrentGame,
  mockClearCurrentGame,
  mockGetCompletedGameById,
  mockProcessCompletedGame,
  mockAggregateGameToPlayoffStats,
  mockRecordSeriesGame,
  mockGetPlayoff,
  mockGetSeriesByRound,
  mockUpdatePlayoff,
  mockCreateNextRoundSeries,
} = vi.hoisted(() => ({
  mockGetGameHeader: vi.fn(),
  mockGetGameEvents: vi.fn(),
  mockGetBetweenPlayEvents: vi.fn(),
  mockCreateGameHeader: vi.fn().mockResolvedValue(undefined),
  mockMarkGameAggregated: vi.fn().mockResolvedValue(undefined),
  mockLoadCurrentGame: vi.fn(),
  mockSaveCurrentGame: vi.fn().mockResolvedValue(undefined),
  mockImmediateSaveCurrentGame: vi.fn().mockResolvedValue(undefined),
  mockClearCurrentGame: vi.fn().mockResolvedValue(undefined),
  mockGetCompletedGameById: vi.fn().mockResolvedValue({
    gameId: "franchise-game-restored",
    aggregationStatus: "aggregated",
  }),
  mockProcessCompletedGame: vi.fn().mockResolvedValue({
    aggregation: { success: true, milestones: null },
  }),
  mockAggregateGameToPlayoffStats: vi.fn().mockResolvedValue(undefined),
  mockRecordSeriesGame: vi.fn().mockResolvedValue({
    id: "series-restored",
    playoffId: "playoff-restored",
    round: 1,
    status: "COMPLETED",
    winner: "home-team",
    higherSeed: { teamId: "home-team", teamName: "Home Team", seed: 1 },
    lowerSeed: { teamId: "away-team", teamName: "Away Team", seed: 2 },
    gamesRequired: 1,
    games: [],
  }),
  mockGetPlayoff: vi.fn().mockResolvedValue({
    id: "playoff-restored",
    franchiseId: "franchise-restored",
    seasonId: "franchise-restored-season-5",
    seasonNumber: 5,
    rounds: 2,
    teams: [
      { teamId: "home-team", teamName: "Home Team", eliminated: false },
      { teamId: "away-team", teamName: "Away Team", eliminated: false },
    ],
  }),
  mockGetSeriesByRound: vi.fn().mockResolvedValue([
    {
      id: "series-restored",
      status: "COMPLETED",
      winner: "home-team",
      round: 1,
    },
  ]),
  mockUpdatePlayoff: vi.fn().mockResolvedValue(undefined),
  mockCreateNextRoundSeries: vi.fn().mockResolvedValue([]),
}));

vi.mock("../../../utils/eventLog", () => ({
  getGameHeader: mockGetGameHeader,
  getGameEvents: mockGetGameEvents,
  getBetweenPlayEvents: mockGetBetweenPlayEvents,
  getGameFieldingEvents: vi.fn().mockResolvedValue([]),
  getBetweenPlayEvent: vi.fn().mockResolvedValue(null),
  updateBetweenPlayEvent: vi.fn().mockResolvedValue(undefined),
  createGameHeader: mockCreateGameHeader,
  logAtBatEvent: vi.fn().mockResolvedValue(undefined),
  logBetweenPlayEvent: vi.fn().mockResolvedValue(undefined),
  undoMostRecentGameAction: vi.fn().mockResolvedValue(null),
  completeGame: vi.fn().mockResolvedValue(undefined),
  markGameAggregated: mockMarkGameAggregated,
}));

vi.mock("../../utils/gameStorage", () => ({
  loadCurrentGame: mockLoadCurrentGame,
  saveCurrentGame: mockSaveCurrentGame,
  immediateSaveCurrentGame: mockImmediateSaveCurrentGame,
  clearCurrentGame: mockClearCurrentGame,
  getCompletedGameById: mockGetCompletedGameById,
  archiveCompletedGame: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../../utils/processCompletedGame", () => ({
  processCompletedGame: mockProcessCompletedGame,
}));

vi.mock("../../../utils/playoffStorage", () => ({
  aggregateGameToPlayoffStats: mockAggregateGameToPlayoffStats,
  recordSeriesGame: mockRecordSeriesGame,
  getPlayoff: mockGetPlayoff,
  getSeriesByRound: mockGetSeriesByRound,
  updatePlayoff: mockUpdatePlayoff,
  createNextRoundSeries: mockCreateNextRoundSeries,
  completePlayoff: vi.fn().mockResolvedValue(undefined),
}));

import { useGameState } from "../../hooks/useGameState";
import { resolveGameTrackerIdentity } from "../../app/utils/gameTrackerIdentity";

function restoredSnapshot() {
  return {
    id: "current",
    gameId: "franchise-game-restored",
    savedAt: Date.now(),
    inning: 5,
    halfInning: "TOP",
    outs: 1,
    homeScore: 2,
    awayScore: 4,
    bases: { first: null, second: null, third: null },
    currentBatterIndex: 0,
    atBatCount: 18,
    awayTeamId: "away-team",
    homeTeamId: "home-team",
    awayTeamName: "Away Team",
    homeTeamName: "Home Team",
    seasonNumber: 3,
    seasonId: "franchise-restored-season-3",
    statsScopeId: "franchise-restored-season-3",
    competitionType: "franchise",
    competitionId: "franchise-restored",
    franchiseId: "franchise-restored",
    scheduleGameId: "schedule-restored-7",
    leagueId: "league-restored",
    currentBatterId: "away-batter-1",
    currentBatterName: "Away Batter 1",
    currentPitcherId: "home-sp",
    currentPitcherName: "Home Starter",
    playerStats: {},
    pitcherGameStats: [],
    fameEvents: [],
    lastHRBatterId: null,
    consecutiveHRCount: 0,
    inningStrikeouts: 0,
    maxDeficitAway: 0,
    maxDeficitHome: 0,
    activityLog: [],
    scoreboard: {
      innings: [{ away: 4, home: 2 }],
      away: { runs: 4, hits: 0, errors: 0 },
      home: { runs: 2, hits: 0, errors: 0 },
    },
    awayLineup: [
      { playerId: "away-batter-1", playerName: "Away Batter 1", position: "SS" },
    ],
    homeLineup: [
      { playerId: "home-batter-1", playerName: "Home Batter 1", position: "C" },
    ],
    awayLineupState: { lineup: [], bench: [], usedPlayers: [], currentPitcher: null },
    homeLineupState: {
      lineup: [],
      bench: [],
      usedPlayers: [],
      currentPitcher: {
        playerId: "home-sp",
        playerName: "Home Starter",
        position: "P",
        battingOrder: 9,
        enteredInning: 1,
        isStarter: true,
      },
    },
  };
}

function restoredPlayoffSnapshot() {
  return {
    ...restoredSnapshot(),
    gameId: "playoff-game-restored",
    seasonNumber: 5,
    seasonId: "franchise-restored-season-5",
    statsScopeId: "franchise-restored-season-5",
    competitionType: "playoff",
    competitionId: "playoff-restored",
    franchiseId: "franchise-restored",
    scheduleGameId: undefined,
    playoffId: "playoff-restored",
    playoffSeriesId: "series-restored",
    playoffGameNumber: 2,
    homeScore: 5,
    awayScore: 3,
    scoreboard: {
      innings: [{ away: 3, home: 5 }],
      away: { runs: 3, hits: 0, errors: 0 },
      home: { runs: 5, hits: 0, errors: 0 },
    },
  };
}

function restoredHeader() {
  return {
    gameId: "franchise-header-restored",
    seasonId: "franchise-header-season-4",
    statsScopeId: "franchise-header-season-4",
    competitionType: "franchise",
    competitionId: "franchise-header",
    competitionName: "Header Franchise",
    franchiseId: "franchise-header",
    scheduleGameId: "schedule-header-9",
    leagueId: "league-header",
    date: Date.now(),
    awayTeamId: "away-team",
    awayTeamName: "Away Team",
    homeTeamId: "home-team",
    homeTeamName: "Home Team",
    startingLineups: {
      away: [{ playerId: "away-batter-1", playerName: "Away Batter 1", position: "SS", battingOrder: 1 }],
      home: [{ playerId: "home-batter-1", playerName: "Home Batter 1", position: "C", battingOrder: 1 }],
    },
    benchRosters: { away: [], home: [] },
    startingPitchers: {
      away: { playerId: "away-sp", playerName: "Away Starter" },
      home: { playerId: "home-sp", playerName: "Home Starter" },
    },
    finalScore: null,
    finalInning: 9,
    totalInnings: 9,
    ballInPlay: null,
    fameEvents: [],
    isLeadoff: false,
    isClutch: false,
    isWalkOff: false,
    isComplete: false,
    aggregated: false,
    aggregatedAt: null,
    aggregationError: null,
    eventCount: 0,
    checksum: "",
  };
}

describe("restored GameTracker franchise scope", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
    mockGetGameEvents.mockResolvedValue([]);
    mockGetBetweenPlayEvents.mockResolvedValue([]);
    mockLoadCurrentGame.mockResolvedValue(null);
    mockGetGameHeader.mockResolvedValue(null);
    mockGetCompletedGameById.mockResolvedValue({
      gameId: "franchise-game-restored",
      aggregationStatus: "aggregated",
    });
  });

  test("snapshot restore exposes canonical franchise identity and archives with it", async () => {
    mockLoadCurrentGame.mockResolvedValue(restoredSnapshot());
    const { result } = renderHook(() => useGameState("franchise-game-restored"));

    await act(async () => {
      await result.current.loadExistingGame({ preferSnapshot: true });
    });

    await waitFor(() => {
      expect(result.current.restoredCompetitionContext).toMatchObject({
        seasonId: "franchise-restored-season-3",
        statsScopeId: "franchise-restored-season-3",
        seasonNumber: 3,
        competitionType: "franchise",
        competitionId: "franchise-restored",
        franchiseId: "franchise-restored",
        scheduleGameId: "schedule-restored-7",
        leagueId: "league-restored",
      });
    });

    await act(async () => {
      await result.current.endGame();
    });

    expect(mockProcessCompletedGame).toHaveBeenCalledWith(
      expect.objectContaining({
        seasonId: "franchise-restored-season-3",
        statsScopeId: "franchise-restored-season-3",
        franchiseId: "franchise-restored",
        scheduleGameId: "schedule-restored-7",
      }),
      expect.objectContaining({
        seasonId: "franchise-restored-season-3",
        franchiseId: "franchise-restored",
      }),
      "league-restored",
      expect.objectContaining({
        seasonId: "franchise-restored-season-3",
        context: expect.objectContaining({
          statsScopeId: "franchise-restored-season-3",
          franchiseId: "franchise-restored",
          scheduleGameId: "schedule-restored-7",
        }),
      }),
    );
  });

  test("restored franchise playoff completion preserves playoff identity and advances once", async () => {
    mockLoadCurrentGame.mockResolvedValue(restoredPlayoffSnapshot());
    mockGetCompletedGameById.mockResolvedValue({
      gameId: "playoff-game-restored",
      aggregationStatus: "aggregated",
    });
    const { result } = renderHook(() => useGameState("playoff-game-restored"));

    await act(async () => {
      await result.current.loadExistingGame({ preferSnapshot: true });
    });

    await waitFor(() => {
      expect(result.current.restoredCompetitionContext).toMatchObject({
        seasonId: "franchise-restored-season-5",
        statsScopeId: "franchise-restored-season-5",
        seasonNumber: 5,
        competitionType: "playoff",
        competitionId: "playoff-restored",
        franchiseId: "franchise-restored",
      });
      expect(result.current.restoredPlayoffContext).toMatchObject({
        playoffId: "playoff-restored",
        playoffSeriesId: "series-restored",
        playoffGameNumber: 2,
      });
    });

    await act(async () => {
      await result.current.endGame();
    });

    expect(mockProcessCompletedGame).toHaveBeenCalledWith(
      expect.objectContaining({
        gameId: "playoff-game-restored",
        seasonId: "franchise-restored-season-5",
        statsScopeId: "franchise-restored-season-5",
        franchiseId: "franchise-restored",
        playoffId: "playoff-restored",
        playoffSeriesId: "series-restored",
        playoffGameNumber: 2,
      }),
      expect.objectContaining({
        seasonId: "franchise-restored-season-5",
        franchiseId: "franchise-restored",
        currentSeason: 5,
      }),
      "league-restored",
      expect.objectContaining({
        seasonId: "franchise-restored-season-5",
        context: expect.objectContaining({
          statsScopeId: "franchise-restored-season-5",
          franchiseId: "franchise-restored",
          playoffId: "playoff-restored",
          playoffSeriesId: "series-restored",
          playoffGameNumber: 2,
        }),
      }),
    );
    expect(mockAggregateGameToPlayoffStats).toHaveBeenCalledWith(
      "playoff-restored",
      expect.objectContaining({
        gameId: "playoff-game-restored",
        statsScopeId: "franchise-restored-season-5",
        playoffId: "playoff-restored",
      }),
    );
    expect(mockRecordSeriesGame).toHaveBeenCalledWith(
      "series-restored",
      expect.objectContaining({
        gameNumber: 2,
        gameLogId: "playoff-game-restored",
      }),
    );
    expect(mockCreateNextRoundSeries).toHaveBeenCalledTimes(1);
  });

  test("durable-log restore exposes schedule identity from game header", async () => {
    mockGetGameHeader.mockResolvedValue(restoredHeader());
    const { result } = renderHook(() => useGameState("franchise-header-restored"));

    await act(async () => {
      await result.current.loadExistingGame({ preferSnapshot: true });
    });

    await waitFor(() => {
      expect(result.current.restoredCompetitionContext).toMatchObject({
        seasonId: "franchise-header-season-4",
        statsScopeId: "franchise-header-season-4",
        seasonNumber: 4,
        competitionType: "franchise",
        competitionId: "franchise-header",
        competitionName: "Header Franchise",
        franchiseId: "franchise-header",
        scheduleGameId: "schedule-header-9",
        leagueId: "league-header",
      });
    });
  });

  test("launch snapshot keeps lineups isolated from later roster object mutation", async () => {
    const awayLineup = [
      { playerId: "away-batter-1", playerName: "Away Batter 1", position: "SS" },
    ];
    const homeLineup = [
      { playerId: "home-batter-1", playerName: "Home Batter 1", position: "C" },
    ];
    const awayBench = [
      { playerId: "away-bench-1", playerName: "Away Bench 1", positions: ["CF"] },
    ];
    const { result } = renderHook(() => useGameState());

    await act(async () => {
      await result.current.initializeGame({
        gameId: "snapshot-roster-invariant",
        seasonId: "franchise-season-1",
        statsScopeId: "franchise-season-1",
        competitionType: "franchise",
        competitionId: "franchise-1",
        franchiseId: "franchise-1",
        scheduleGameId: "schedule-1",
        awayTeamId: "away-team",
        homeTeamId: "home-team",
        awayTeamName: "Away Team",
        homeTeamName: "Home Team",
        awayStartingPitcherId: "away-sp",
        awayStartingPitcherName: "Away Starter",
        homeStartingPitcherId: "home-sp",
        homeStartingPitcherName: "Home Starter",
        awayLineup,
        homeLineup,
        awayBench,
        homeBench: [],
        seasonNumber: 1,
      });
    });

    awayLineup[0].playerName = "Mutated Away Batter";
    homeLineup[0].position = "1B";
    awayBench[0].positions.push("P");

    await act(async () => {
      result.current.startGame();
    });

    expect(mockImmediateSaveCurrentGame).toHaveBeenLastCalledWith(
      expect.objectContaining({
        gameId: "snapshot-roster-invariant",
        awayLineup: [
          { playerId: "away-batter-1", playerName: "Away Batter 1", position: "SS" },
        ],
        homeLineup: [
          { playerId: "home-batter-1", playerName: "Home Batter 1", position: "C" },
        ],
        awayLineupState: expect.objectContaining({
          bench: [
            expect.objectContaining({
              playerId: "away-bench-1",
              positions: ["CF"],
            }),
          ],
        }),
      }),
    );
  });

  test("identity resolver keeps restored franchise ids for end-game and schedule completion", () => {
    expect(
      resolveGameTrackerIdentity({
        navigationState: null,
        restoredContext: {
          seasonId: "franchise-restored-season-3",
          statsScopeId: "franchise-restored-season-3",
          seasonNumber: 3,
          competitionType: "franchise",
          competitionId: "franchise-restored",
          franchiseId: "franchise-restored",
          scheduleGameId: "schedule-restored-7",
          leagueId: "league-restored",
        },
        gameState: { seasonNumber: 1 },
      }),
    ).toMatchObject({
      gameMode: "franchise",
      seasonId: "franchise-restored-season-3",
      statsScopeId: "franchise-restored-season-3",
      seasonNumber: 3,
      competitionType: "franchise",
      competitionId: "franchise-restored",
      franchiseId: "franchise-restored",
      scheduleGameId: "schedule-restored-7",
      leagueId: "league-restored",
    });
  });

  test("identity resolver keeps restored playoff ids without falling back to season-1", () => {
    expect(
      resolveGameTrackerIdentity({
        navigationState: null,
        restoredContext: {
          seasonId: "franchise-restored-season-5",
          statsScopeId: "franchise-restored-season-5",
          seasonNumber: 5,
          competitionType: "playoff",
          competitionId: "playoff-restored",
          franchiseId: "franchise-restored",
          scheduleGameId: "playoff-schedule-2",
        },
        gameState: { seasonNumber: 1 },
      }),
    ).toMatchObject({
      gameMode: "playoff",
      seasonId: "franchise-restored-season-5",
      statsScopeId: "franchise-restored-season-5",
      seasonNumber: 5,
      competitionType: "playoff",
      competitionId: "playoff-restored",
      franchiseId: "franchise-restored",
      scheduleGameId: "playoff-schedule-2",
    });
  });

  test("identity resolver keeps elimination scope isolated from franchise identity", () => {
    expect(
      resolveGameTrackerIdentity({
        navigationState: {
          gameMode: "elimination",
          competitionType: "elimination",
          competitionId: "elim-restored",
          eliminationId: "elim-restored",
          franchiseId: "franchise-should-drop",
          seasonId: "franchise-should-drop-season-2",
          statsScopeId: "wrong-scope",
        },
        restoredContext: null,
      }),
    ).toMatchObject({
      gameMode: "elimination",
      competitionType: "elimination",
      competitionId: "elim-restored",
      eliminationId: "elim-restored",
      franchiseId: undefined,
      seasonId: undefined,
      statsScopeId: "elimination-elim-restored",
    });
  });

  test("fresh exhibition identity carries league identity without a season scope", () => {
    expect(
      resolveGameTrackerIdentity({
        navigationState: {
          gameMode: "exhibition",
          competitionType: "exhibition",
          competitionId: "league-exhibition",
          leagueId: "league-exhibition",
          seasonId: "season-1",
          statsScopeId: "season-1",
        },
      }),
    ).toMatchObject({
      competitionType: "exhibition",
      leagueId: "league-exhibition",
      seasonId: undefined,
      statsScopeId: undefined,
    });
  });

  test("fresh launch without an explicit competition type is loudly rejected", () => {
    expect(() =>
      resolveGameTrackerIdentity({
        navigationState: {
          gameMode: "franchise",
          franchiseId: "franchise-missing-type",
          seasonId: "franchise-missing-type-season-1",
          statsScopeId: "franchise-missing-type-season-1",
        },
      }),
    ).toThrow(/new game launch.*competition type/i);
  });

  test("restored legacy identity keeps warning tolerance instead of throwing", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    expect(() =>
      resolveGameTrackerIdentity({
        navigationState: null,
        restoredContext: {
          competitionType: "elimination",
        },
      }),
    ).not.toThrow();
    expect(warn).toHaveBeenCalledWith(
      "[GameTrackerIdentity] Resolved incomplete competition scope:",
      expect.arrayContaining([expect.stringMatching(/eliminationId/)]),
    );
    warn.mockRestore();
  });
});
