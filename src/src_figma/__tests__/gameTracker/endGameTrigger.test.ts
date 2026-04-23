import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

const {
  mockLogAtBatEvent,
  mockLogBetweenPlayEvent,
  mockUndoMostRecentGameAction,
  mockCreateGameHeader,
  mockCompleteGame,
  mockGetGameEvents,
  mockGetBetweenPlayEvents,
  mockMarkGameAggregated,
  mockGetGameFieldingEvents,
  mockGetGameHeader,
  mockArchiveCompletedGame,
  mockSaveCurrentGame,
  mockLoadCurrentGame,
  mockImmediateSaveCurrentGame,
  mockClearCurrentGame,
  mockProcessCompletedGame,
  mockAggregateGameToPlayoffStats,
} = vi.hoisted(() => ({
  mockLogAtBatEvent: vi.fn().mockResolvedValue(undefined),
  mockLogBetweenPlayEvent: vi.fn().mockResolvedValue(undefined),
  mockUndoMostRecentGameAction: vi.fn().mockResolvedValue(null),
  mockCreateGameHeader: vi.fn().mockResolvedValue(undefined),
  mockCompleteGame: vi.fn().mockResolvedValue(undefined),
  mockGetGameEvents: vi.fn().mockResolvedValue([]),
  mockGetBetweenPlayEvents: vi.fn().mockResolvedValue([]),
  mockMarkGameAggregated: vi.fn().mockResolvedValue(undefined),
  mockGetGameFieldingEvents: vi.fn().mockResolvedValue([]),
  mockGetGameHeader: vi.fn().mockResolvedValue({ aggregated: false }),
  mockArchiveCompletedGame: vi.fn().mockResolvedValue(undefined),
  mockSaveCurrentGame: vi.fn().mockResolvedValue(undefined),
  mockLoadCurrentGame: vi.fn().mockResolvedValue(null),
  mockImmediateSaveCurrentGame: vi.fn().mockResolvedValue(undefined),
  mockClearCurrentGame: vi.fn().mockResolvedValue(undefined),
  mockProcessCompletedGame: vi.fn().mockResolvedValue({
    aggregation: { success: true, milestones: null },
  }),
  mockAggregateGameToPlayoffStats: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../../../utils/eventLog", () => ({
  logAtBatEvent: mockLogAtBatEvent,
  logBetweenPlayEvent: mockLogBetweenPlayEvent,
  undoMostRecentGameAction: mockUndoMostRecentGameAction,
  createGameHeader: mockCreateGameHeader,
  completeGame: mockCompleteGame,
  getGameEvents: mockGetGameEvents,
  getBetweenPlayEvents: mockGetBetweenPlayEvents,
  markGameAggregated: mockMarkGameAggregated,
  getGameFieldingEvents: mockGetGameFieldingEvents,
  getGameHeader: mockGetGameHeader,
}));

vi.mock("../../utils/gameStorage", () => ({
  archiveCompletedGame: mockArchiveCompletedGame,
  saveCurrentGame: mockSaveCurrentGame,
  loadCurrentGame: mockLoadCurrentGame,
  immediateSaveCurrentGame: mockImmediateSaveCurrentGame,
  clearCurrentGame: mockClearCurrentGame,
}));

vi.mock("../../../utils/processCompletedGame", () => ({
  processCompletedGame: mockProcessCompletedGame,
}));

vi.mock("../../../utils/playoffStorage", () => ({
  aggregateGameToPlayoffStats: mockAggregateGameToPlayoffStats,
}));

import {
  evaluateEndGameTriggerWithTotalInnings,
  type EndGameTriggerReason,
  useGameState,
} from "../../hooks/useGameState";

function expectReason(
  params: Parameters<typeof evaluateEndGameTriggerWithTotalInnings>[0],
) {
  return evaluateEndGameTriggerWithTotalInnings(params);
}

async function initializeGame(
  result: { current: ReturnType<typeof useGameState> },
  totalInnings = 7,
) {
  await act(async () => {
    await result.current.initializeGame({
      gameId: "game-end-trigger-tests",
      awayTeamId: "away-team",
      awayTeamName: "Away Team",
      homeTeamId: "home-team",
      homeTeamName: "Home Team",
      awayStartingPitcherId: "away-sp",
      awayStartingPitcherName: "Away Starter",
      homeStartingPitcherId: "home-sp",
      homeStartingPitcherName: "Home Starter",
      awayLineup: [
        {
          playerId: "away-batter-1",
          playerName: "Away Batter 1",
          position: "SS",
        },
        {
          playerId: "away-batter-2",
          playerName: "Away Batter 2",
          position: "CF",
        },
      ],
      homeLineup: [
        {
          playerId: "home-batter-1",
          playerName: "Home Batter 1",
          position: "2B",
        },
        {
          playerId: "home-batter-2",
          playerName: "Home Batter 2",
          position: "RF",
        },
      ],
      awayBench: [],
      homeBench: [],
      totalInnings,
      seasonNumber: 1,
    });
  });
}

async function restoreLiveState(
  result: { current: ReturnType<typeof useGameState> },
  overrides: Partial<ReturnType<typeof useGameState>["gameState"]>,
) {
  await act(async () => {
    result.current.restoreState({
      gameState: {
        ...result.current.gameState,
        inning: 7,
        isTop: false,
        outs: 1,
        awayScore: 3,
        homeScore: 3,
        gamePhase: "LIVE",
        ...overrides,
      },
      scoreboard: result.current.scoreboard,
      playerStats: result.current.playerStats,
      pitcherStats: result.current.pitcherStats,
      lineupSnapshot: result.current.getLineupStateSnapshot(),
      batterIndices: result.current.getBatterIndicesSnapshot(),
    });
  });
}

describe("end-game trigger evaluation", () => {
  test("ends after the top of the configured final inning when the home team leads", () => {
    expect(
      expectReason({
        inning: 7,
        isTop: true,
        homeScoreBefore: 3,
        awayScoreBefore: 2,
        homeScoreAfter: 3,
        awayScoreAfter: 2,
        totalInnings: 7,
        context: "half_inning_end",
      }),
    ).toEqual({
      shouldEndGame: true,
      reason: "home_ahead_after_top" satisfies EndGameTriggerReason,
      isWalkOff: false,
    });
  });

  test("ends after the bottom of the configured final inning when the score is not tied", () => {
    expect(
      expectReason({
        inning: 7,
        isTop: false,
        homeScoreBefore: 2,
        awayScoreBefore: 4,
        homeScoreAfter: 2,
        awayScoreAfter: 4,
        totalInnings: 7,
        context: "half_inning_end",
      }),
    ).toEqual({
      shouldEndGame: true,
      reason: "final_inning_complete" satisfies EndGameTriggerReason,
      isWalkOff: false,
    });
  });

  test("marks a home lead change in the bottom of regulation as a walk-off", () => {
    expect(
      expectReason({
        inning: 7,
        isTop: false,
        homeScoreBefore: 3,
        awayScoreBefore: 3,
        homeScoreAfter: 4,
        awayScoreAfter: 3,
        totalInnings: 7,
        context: "live_play",
      }),
    ).toEqual({
      shouldEndGame: true,
      reason: "walkoff" satisfies EndGameTriggerReason,
      isWalkOff: true,
    });
  });

  test("supports the same end-game rules in extra innings", () => {
    expect(
      expectReason({
        inning: 10,
        isTop: false,
        homeScoreBefore: 5,
        awayScoreBefore: 5,
        homeScoreAfter: 6,
        awayScoreAfter: 5,
        totalInnings: 7,
        context: "live_play",
      }),
    ).toEqual({
      shouldEndGame: true,
      reason: "walkoff" satisfies EndGameTriggerReason,
      isWalkOff: true,
    });
  });

  test("detects a single-runner walk-off score in the bottom of the final inning", () => {
    expect(
      expectReason({
        inning: 7,
        isTop: false,
        homeScoreBefore: 2,
        awayScoreBefore: 2,
        homeScoreAfter: 3,
        awayScoreAfter: 2,
        totalInnings: 7,
        context: "live_play",
      }),
    ).toEqual({
      shouldEndGame: true,
      reason: "walkoff" satisfies EndGameTriggerReason,
      isWalkOff: true,
    });
  });

  test("treats a corrected home lead in the bottom of the final inning as an end-game trigger", () => {
    expect(
      expectReason({
        inning: 7,
        isTop: false,
        homeScoreBefore: 2,
        awayScoreBefore: 3,
        homeScoreAfter: 4,
        awayScoreAfter: 3,
        totalInnings: 7,
        context: "half_inning_end",
      }),
    ).toEqual({
      shouldEndGame: true,
      reason: "final_inning_complete" satisfies EndGameTriggerReason,
      isWalkOff: false,
    });
  });

  test("does not end the game before the configured regulation length", () => {
    expect(
      expectReason({
        inning: 6,
        isTop: false,
        homeScoreBefore: 3,
        awayScoreBefore: 3,
        homeScoreAfter: 4,
        awayScoreAfter: 3,
        totalInnings: 7,
        context: "live_play",
      }),
    ).toEqual({
      shouldEndGame: false,
      reason: null,
      isWalkOff: false,
    });
  });
});

describe("correction-driven end-game re-evaluation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  test("queues auto end-game when a score correction gives the home team the lead in the bottom of the final inning", async () => {
    const { result } = renderHook(() => useGameState());
    await initializeGame(result, 7);
    await restoreLiveState(result, {});

    await act(async () => {
      result.current.applyScoreAdjustment(7, "BOTTOM", 1);
    });

    expect(result.current.gameState.homeScore).toBe(4);
    expect(result.current.gameState.awayScore).toBe(3);
    expect(result.current.gameState.gamePhase).toBe("POST_FINAL_OUT");

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(result.current.showAutoEndPrompt).toBe(true);
  });

  test("reverts POST_FINAL_OUT back to LIVE when a score correction reverses a queued walk-off", async () => {
    const { result } = renderHook(() => useGameState());
    await initializeGame(result, 7);
    await restoreLiveState(result, {
      homeScore: 4,
      awayScore: 3,
    });

    await act(async () => {
      result.current.queueAutoEndGame();
    });

    expect(result.current.gameState.gamePhase).toBe("POST_FINAL_OUT");

    await act(async () => {
      result.current.applyScoreAdjustment(7, "BOTTOM", -1);
      await vi.runAllTimersAsync();
    });

    expect(result.current.gameState.homeScore).toBe(3);
    expect(result.current.gameState.awayScore).toBe(3);
    expect(result.current.gameState.gamePhase).toBe("LIVE");
    expect(result.current.showAutoEndPrompt).toBe(false);
  });

  test("re-evaluates end-game conditions when an outs correction creates the final out", async () => {
    const { result } = renderHook(() => useGameState());
    await initializeGame(result, 7);
    await restoreLiveState(result, {
      outs: 2,
      homeScore: 3,
      awayScore: 4,
    });

    await act(async () => {
      result.current.applyOutsAdjustment(1);
      await vi.runAllTimersAsync();
    });

    expect(result.current.gameState.outs).toBe(3);
    expect(result.current.gameState.gamePhase).toBe("POST_FINAL_OUT");
    expect(result.current.showAutoEndPrompt).toBe(true);
  });
});
