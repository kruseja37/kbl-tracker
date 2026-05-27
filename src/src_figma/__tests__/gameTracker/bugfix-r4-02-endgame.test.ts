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
  mockGetCompletedGameById,
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
  mockGetCompletedGameById: vi.fn().mockResolvedValue({
    gameId: "game-r4-end",
    aggregationStatus: "aggregated",
  }),
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
  getCompletedGameById: mockGetCompletedGameById,
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

async function initializeGame(result: {
  current: ReturnType<typeof useGameState>;
}, overrides: Partial<Parameters<ReturnType<typeof useGameState>["initializeGame"]>[0]> = {}) {
  await act(async () => {
    await result.current.initializeGame({
      gameId: "game-r4-end",
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
      ...overrides,
    });
  });
}

describe("bugfix R4-02: end-game pitch count continuation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetGameEvents.mockResolvedValue([]);
    mockGetBetweenPlayEvents.mockResolvedValue([]);
    mockGetGameFieldingEvents.mockResolvedValue([]);
    mockGetGameHeader.mockResolvedValue({ aggregated: false });
    mockGetCompletedGameById.mockResolvedValue({
      gameId: "game-r4-end",
      aggregationStatus: "aggregated",
    });
  });

  test("resolves endGame after confirming the final pitch count", async () => {
    const { result } = renderHook(() => useGameState());
    await initializeGame(result);

    let endGamePromise: Promise<void> | undefined;

    await act(async () => {
      endGamePromise = result.current.endGame({
        awaitPitchCountConfirmation: true,
      });
    });

    expect(result.current.pitchCountPrompt?.type).toBe("end_game");

    await act(async () => {
      await result.current.confirmPitchCount("home-sp", 18);
      await endGamePromise;
    });

    expect(mockCompleteGame).toHaveBeenCalledWith(
      "game-r4-end",
      { away: 0, home: 0 },
      1,
    );
    expect(mockProcessCompletedGame).toHaveBeenCalledTimes(1);
    expect(result.current.pitchCountPrompt).toBeNull();
  });

  test("blocks downstream completion when processCompletedGame fails after pitch-count confirmation", async () => {
    mockProcessCompletedGame.mockRejectedValueOnce(
      new Error("aggregation exploded"),
    );

    const { result } = renderHook(() => useGameState());
    await initializeGame(result);

    let endGamePromise: Promise<void> | undefined;

    await act(async () => {
      endGamePromise = result.current.endGame({
        awaitPitchCountConfirmation: true,
      });
    });

    expect(result.current.pitchCountPrompt?.type).toBe("end_game");

    await act(async () => {
      await result.current.confirmPitchCount("home-sp", 18);
      await expect(endGamePromise).rejects.toThrow(/season aggregation/i);
    });

    expect(mockProcessCompletedGame).toHaveBeenCalledTimes(1);
    expect(mockMarkGameAggregated).not.toHaveBeenCalled();
    expect(mockArchiveCompletedGame).toHaveBeenCalledWith(
      expect.any(Object),
      expect.any(Object),
      expect.any(Array),
      expect.anything(),
      expect.objectContaining({
        aggregationStatus: "incomplete",
        aggregationError: "aggregation exploded",
      }),
    );
    expect(result.current.pitchCountPrompt).toBeNull();
  });

  test("blocks restored playoff advancement when completed archive repair fails", async () => {
    mockGetGameHeader.mockResolvedValue({ aggregated: true });
    mockGetCompletedGameById.mockResolvedValue({
      gameId: "game-r4-end",
      aggregationStatus: "incomplete",
    });
    mockArchiveCompletedGame.mockRejectedValueOnce(new Error("archive down"));

    const { result } = renderHook(() => useGameState());
    await initializeGame(result, {
      competitionType: "playoff",
      competitionId: "playoff-1",
      seasonId: "franchise-season-1",
      statsScopeId: "franchise-season-1",
      franchiseId: "franchise-1",
      playoffId: "playoff-1",
      playoffSeriesId: "series-1",
      playoffGameNumber: 1,
    });

    await act(async () => {
      await expect(result.current.endGame()).rejects.toThrow("archive down");
    });

    expect(mockProcessCompletedGame).not.toHaveBeenCalled();
    expect(mockAggregateGameToPlayoffStats).not.toHaveBeenCalled();
    expect(mockClearCurrentGame).toHaveBeenCalledTimes(1);
  });
});
