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
  mockProcessCompletedGame,
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
  mockProcessCompletedGame: vi.fn().mockResolvedValue({
    aggregation: { success: true, milestones: null },
  }),
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
  archiveCompletedGame: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../../utils/processCompletedGame", () => ({
  processCompletedGame: mockProcessCompletedGame,
}));

vi.mock("../../../utils/playoffStorage", () => ({
  aggregateGameToPlayoffStats: vi.fn().mockResolvedValue(undefined),
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
});
