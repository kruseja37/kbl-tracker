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
  getBetweenPlayEvent: vi.fn().mockResolvedValue(null),
  updateBetweenPlayEvent: vi.fn().mockResolvedValue(undefined),
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

import { useGameState } from "../../hooks/useGameState";

async function initializeGame(
  result: { current: ReturnType<typeof useGameState> },
) {
  await act(async () => {
    await result.current.initializeGame({
      gameId: "runner-error-enrichment",
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
      seasonNumber: 1,
    });
  });
}

describe("useGameState runner error enrichment", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("applyBasesCorrection can seed a new runner as error-reached for unearned scoring", async () => {
    const { result } = renderHook(() => useGameState());
    await initializeGame(result);

    act(() => {
      result.current.applyBasesCorrection(
        { first: true, second: false, third: false },
        {
          first: {
            runnerId: "away-batter-1",
            runnerName: "Away Batter 1",
            responsiblePitcherId: "home-sp",
          },
          second: null,
          third: null,
        },
        {
          inning: 1,
          halfInning: "TOP",
        },
        "error",
      );
    });

    let trackerSnapshot = result.current.getRunnerTrackerSnapshot();
    let trackerPitcherStats = new Map(trackerSnapshot.pitcherStatsEntries);

    expect(trackerSnapshot.runners[0]?.howReached).toBe("error");
    expect(
      trackerPitcherStats.get("home-sp")?.runnersOnBase[0]?.howReached,
    ).toBe("error");

    act(() => {
      result.current.advanceRunner("first", "home", "safe");
    });

    trackerSnapshot = result.current.getRunnerTrackerSnapshot();
    trackerPitcherStats = new Map(trackerSnapshot.pitcherStatsEntries);

    expect(
      trackerPitcherStats.get("home-sp")?.runnersScored[0]?.howReached,
    ).toBe("error");
    expect(result.current.pitcherStats.get("home-sp")).toMatchObject({
      runsAllowed: 1,
      earnedRuns: 0,
    });
  });

  test("updateTrackedRunnerHowReached reclassifies an already scored run as unearned", async () => {
    const { result } = renderHook(() => useGameState());
    await initializeGame(result);

    act(() => {
      result.current.applyBasesCorrection(
        { first: true, second: false, third: false },
        {
          first: {
            runnerId: "away-batter-1",
            runnerName: "Away Batter 1",
            responsiblePitcherId: "home-sp",
          },
          second: null,
          third: null,
        },
        {
          inning: 1,
          halfInning: "TOP",
        },
      );
      result.current.advanceRunner("first", "home", "safe");
    });

    expect(result.current.pitcherStats.get("home-sp")).toMatchObject({
      runsAllowed: 1,
      earnedRuns: 1,
    });

    let changed = false;
    act(() => {
      changed = result.current.updateTrackedRunnerHowReached(
        {
          runnerId: "away-batter-1",
          runnerName: "Away Batter 1",
        },
        "error",
      );
    });

    const trackerSnapshot = result.current.getRunnerTrackerSnapshot();
    const trackerPitcherStats = new Map(trackerSnapshot.pitcherStatsEntries);

    expect(changed).toBe(true);
    expect(
      trackerPitcherStats.get("home-sp")?.runnersScored[0]?.howReached,
    ).toBe("error");
    expect(result.current.pitcherStats.get("home-sp")).toMatchObject({
      runsAllowed: 1,
      earnedRuns: 0,
    });
  });
});
