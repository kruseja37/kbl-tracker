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

import { useGameState, type PitcherGameStats } from "../../hooks/useGameState";

function makePitcherStats(
  overrides: Partial<PitcherGameStats> = {},
): PitcherGameStats {
  return {
    outsRecorded: 0,
    hitsAllowed: 0,
    runsAllowed: 0,
    earnedRuns: 0,
    walksAllowed: 0,
    strikeoutsThrown: 0,
    homeRunsAllowed: 0,
    pitchCount: 0,
    battersFaced: 0,
    intentionalWalks: 0,
    hitByPitch: 0,
    wildPitches: 0,
    basesLoadedWalks: 0,
    firstInningRuns: 0,
    consecutiveHRsAllowed: 0,
    isStarter: false,
    entryInning: 1,
    entryOuts: 0,
    exitInning: null,
    exitOuts: null,
    finishedGame: false,
    inheritedRunners: 0,
    inheritedRunnersScored: 0,
    bequeathedRunners: 0,
    bequeathedRunnersScored: 0,
    decision: null,
    save: false,
    hold: false,
    blownSave: false,
    ...overrides,
  };
}

async function initializeGame(result: {
  current: ReturnType<typeof useGameState>;
}) {
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
      result.current.confirmPitchCount("home-sp", 18);
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

  test("continues endGame when processCompletedGame fails after pitch-count confirmation", async () => {
    mockProcessCompletedGame.mockRejectedValueOnce(
      new Error("aggregation exploded"),
    );

    const { result } = renderHook(() => useGameState());
    await initializeGame(result);

    act(() => {
      result.current.setPlayoffContext("series-1", 1, "playoff-1");
    });

    let endGamePromise: Promise<void> | undefined;

    await act(async () => {
      endGamePromise = result.current.endGame({
        awaitPitchCountConfirmation: true,
      });
    });

    expect(result.current.pitchCountPrompt?.type).toBe("end_game");

    await act(async () => {
      result.current.confirmPitchCount("home-sp", 18);
      await expect(endGamePromise).resolves.toBeUndefined();
    });

    expect(mockProcessCompletedGame).toHaveBeenCalledTimes(1);
    expect(mockMarkGameAggregated).not.toHaveBeenCalled();
    expect(mockArchiveCompletedGame).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.anything(),
      expect.objectContaining({
        aggregationStatus: "archive_only",
        aggregationError: "aggregation exploded",
      }),
    );
    expect(mockAggregateGameToPlayoffStats).not.toHaveBeenCalled();
    expect(result.current.pitchCountPrompt).toBeNull();
  });

  test("archives the exhibition game when the end-game pitch count prompt is dismissed", async () => {
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
      result.current.dismissPitchCountPrompt();
      await expect(endGamePromise).resolves.toBeUndefined();
    });

    expect(mockCompleteGame).toHaveBeenCalledWith(
      "game-r4-end",
      { away: 0, home: 0 },
      1,
    );
    expect(mockProcessCompletedGame).toHaveBeenCalledTimes(1);
    expect(result.current.pitchCountPrompt).toBeNull();
  });

  test("archives every pitcher who recorded outs, including removed pitchers", async () => {
    const { result } = renderHook(() => useGameState());
    await initializeGame(result);

    act(() => {
      result.current.restoreState({
        gameState: {
          ...result.current.gameState,
          gamePhase: "LIVE",
          currentPitcherId: "home-rp",
          currentPitcherName: "Home Reliever",
        },
        scoreboard: result.current.scoreboard,
        pitcherStats: new Map<string, PitcherGameStats>([
          [
            "home-sp",
            makePitcherStats({
              isStarter: true,
              outsRecorded: 3,
              battersFaced: 4,
              pitchCount: 14,
              exitInning: 2,
              exitOuts: 0,
            }),
          ],
          [
            "home-rp",
            makePitcherStats({
              outsRecorded: 6,
              battersFaced: 7,
              pitchCount: 22,
              entryInning: 2,
              entryOuts: 0,
            }),
          ],
        ]),
      });
    });

    await act(async () => {
      await result.current.endGame();
    });

    const persistedState = mockProcessCompletedGame.mock.calls.at(-1)?.[0];
    expect(persistedState.pitcherGameStats).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          pitcherId: "home-sp",
          outsRecorded: 3,
          inningsComplete: 1,
        }),
        expect.objectContaining({
          pitcherId: "home-rp",
          outsRecorded: 6,
          inningsComplete: 2,
        }),
      ]),
    );
  });
});
