import { act, render, screen, within } from "@testing-library/react";
import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

const {
  mockNavigate,
  mockLogAtBatEvent,
  mockLogBetweenPlayEvent,
  mockUndoMostRecentGameAction,
  mockCreateGameHeader,
  mockCompleteGame,
  mockGetGameEvents,
  mockGetBetweenPlayEvent,
  mockGetBetweenPlayEvents,
  mockMarkGameAggregated,
  mockGetGameFieldingEvents,
  mockGetGameHeader,
  mockUpdateBetweenPlayEvent,
  mockArchiveCompletedGame,
  mockSaveCurrentGame,
  mockLoadCurrentGame,
  mockImmediateSaveCurrentGame,
  mockClearCurrentGame,
  mockProcessCompletedGame,
  mockAggregateGameToPlayoffStats,
  mockGetCompletedGameById,
} = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockLogAtBatEvent: vi.fn().mockResolvedValue(undefined),
  mockLogBetweenPlayEvent: vi.fn().mockResolvedValue(undefined),
  mockUndoMostRecentGameAction: vi.fn().mockResolvedValue(null),
  mockCreateGameHeader: vi.fn().mockResolvedValue(undefined),
  mockCompleteGame: vi.fn().mockResolvedValue(undefined),
  mockGetGameEvents: vi.fn().mockResolvedValue([]),
  mockGetBetweenPlayEvent: vi.fn().mockResolvedValue(null),
  mockGetBetweenPlayEvents: vi.fn().mockResolvedValue([]),
  mockMarkGameAggregated: vi.fn().mockResolvedValue(undefined),
  mockGetGameFieldingEvents: vi.fn().mockResolvedValue([]),
  mockGetGameHeader: vi.fn().mockResolvedValue({ aggregated: false }),
  mockUpdateBetweenPlayEvent: vi.fn().mockResolvedValue(undefined),
  mockArchiveCompletedGame: vi.fn().mockResolvedValue(undefined),
  mockSaveCurrentGame: vi.fn().mockResolvedValue(undefined),
  mockLoadCurrentGame: vi.fn().mockResolvedValue(null),
  mockImmediateSaveCurrentGame: vi.fn().mockResolvedValue(undefined),
  mockClearCurrentGame: vi.fn().mockResolvedValue(undefined),
  mockProcessCompletedGame: vi.fn().mockResolvedValue({
    aggregation: { success: true, milestones: null },
  }),
  mockAggregateGameToPlayoffStats: vi.fn().mockResolvedValue(undefined),
  mockGetCompletedGameById: vi.fn().mockResolvedValue(null),
}));

vi.mock("react-router", () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => ({
    state: {
      gameMode: "exhibition",
      franchiseId: "1",
    },
  }),
  useParams: () => ({ gameId: "game-r3-round5" }),
}));

vi.mock("@/config/teamColors", () => ({
  getTeamColors: () => ({
    primary: "#335533",
    secondary: "#FFFFFF",
    stadium: "Swagger Center",
  }),
}));

vi.mock("../../../utils/eventLog", () => ({
  logAtBatEvent: mockLogAtBatEvent,
  logBetweenPlayEvent: mockLogBetweenPlayEvent,
  undoMostRecentGameAction: mockUndoMostRecentGameAction,
  createGameHeader: mockCreateGameHeader,
  completeGame: mockCompleteGame,
  getGameEvents: mockGetGameEvents,
  getBetweenPlayEvent: mockGetBetweenPlayEvent,
  getBetweenPlayEvents: mockGetBetweenPlayEvents,
  markGameAggregated: mockMarkGameAggregated,
  getGameFieldingEvents: mockGetGameFieldingEvents,
  getGameHeader: mockGetGameHeader,
  updateBetweenPlayEvent: mockUpdateBetweenPlayEvent,
}));

vi.mock("../../utils/gameStorage", () => ({
  archiveCompletedGame: mockArchiveCompletedGame,
  saveCurrentGame: mockSaveCurrentGame,
  loadCurrentGame: mockLoadCurrentGame,
  immediateSaveCurrentGame: mockImmediateSaveCurrentGame,
  clearCurrentGame: mockClearCurrentGame,
  getCompletedGameById: mockGetCompletedGameById,
}));

vi.mock("../../../utils/gameStorage", () => ({
  archiveCompletedGame: mockArchiveCompletedGame,
  getCompletedGameById: mockGetCompletedGameById,
}));

vi.mock("../../../utils/processCompletedGame", () => ({
  processCompletedGame: mockProcessCompletedGame,
}));

vi.mock("../../../utils/playoffStorage", () => ({
  aggregateGameToPlayoffStats: mockAggregateGameToPlayoffStats,
}));

import { PostGameSummary } from "../../app/pages/PostGameSummary";
import {
  addRunner,
  createRunnerTrackingState,
} from "../../app/engines/inheritedRunnerTracker";
import { useGameState } from "../../hooks/useGameState";

async function initializeGame(
  result: { current: ReturnType<typeof useGameState> },
  totalInnings = 7,
) {
  await act(async () => {
    await result.current.initializeGame({
      gameId: "game-r3-round5",
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
          playerId: "home-c",
          playerName: "Home Catcher",
          position: "C",
        },
        {
          playerId: "home-sp",
          playerName: "Home Starter",
          position: "P",
        },
      ],
      awayBench: [],
      homeBench: [
        { playerId: "home-rp", playerName: "Home Reliever", positions: ["P"] },
        { playerId: "home-c2", playerName: "Backup Catcher", positions: ["C"] },
      ],
      totalInnings,
      seasonNumber: 1,
    });
  });
}

function buildPlayerStatsMap() {
  return new Map<string, any>([
    [
      "away-batter-1",
      {
        playerName: "Away Batter 1",
        teamId: "away-team",
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
        k: 0,
        sb: 0,
        cs: 0,
        sf: 0,
        sh: 0,
        gidp: 0,
        putouts: 0,
        assists: 0,
        fieldingErrors: 0,
      },
    ],
    [
      "home-c",
      {
        playerName: "Home Catcher",
        teamId: "home-team",
        pa: 4,
        ab: 4,
        h: 1,
        singles: 0,
        doubles: 0,
        triples: 0,
        hr: 1,
        rbi: 3,
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
    ],
    [
      "home-sp",
      {
        playerName: "Home Starter",
        teamId: "home-team",
        pa: 0,
        ab: 0,
        h: 0,
        singles: 0,
        doubles: 0,
        triples: 0,
        hr: 0,
        rbi: 0,
        r: 0,
        bb: 0,
        hbp: 0,
        k: 0,
        sb: 0,
        cs: 0,
        sf: 0,
        sh: 0,
        gidp: 0,
        putouts: 0,
        assists: 0,
        fieldingErrors: 0,
      },
    ],
  ]);
}

describe("R3 Round 5 bug fixes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetGameEvents.mockResolvedValue([]);
    mockGetBetweenPlayEvent.mockResolvedValue(null);
    mockGetBetweenPlayEvents.mockResolvedValue([]);
    mockGetGameFieldingEvents.mockResolvedValue([]);
    mockGetGameHeader.mockResolvedValue({ aggregated: false });
    mockGetCompletedGameById.mockResolvedValue(null);
  });

  test("uses total innings for scoreboard init and archives the same stored POG ordering", async () => {
    const { result } = renderHook(() => useGameState());
    await initializeGame(result, 7);

    expect(result.current.scoreboard.innings).toHaveLength(7);

    mockGetGameEvents.mockResolvedValue([
      { batterId: "home-c", wpa: 0.31 },
      { batterId: "away-batter-1", wpa: 0.14 },
    ]);

    await act(async () => {
      result.current.restoreState({
        gameState: {
          ...result.current.gameState,
          awayScore: 2,
          homeScore: 3,
        },
        scoreboard: result.current.scoreboard,
        playerStats: buildPlayerStatsMap(),
        pitcherStats: result.current.pitcherStats,
        lineupSnapshot: result.current.getLineupStateSnapshot(),
        batterIndices: result.current.getBatterIndicesSnapshot(),
      });
    });

    await act(async () => {
      await result.current.endGame({
        competitionType: "exhibition",
        competitionId: "league-exh",
        leagueId: "league-exh",
      });
    });

    expect(mockProcessCompletedGame).toHaveBeenCalled();
    expect(mockProcessCompletedGame.mock.calls[0]?.[3]?.context).toMatchObject({
      totalInnings: 7,
      pogPlayerId: "home-c",
      playersOfTheGame: {
        first: "home-c",
        second: "away-batter-1",
      },
    });
  });

  test("updates live pitcher and catcher ids after substitutions and exposes the substitution log", async () => {
    const { result } = renderHook(() => useGameState());
    await initializeGame(result, 7);

    act(() => {
      result.current.startGame();
    });

    await act(async () => {
      const pitcherSub = await result.current.makeSubstitution(
        "home-rp",
        "home-sp",
        "Home Reliever",
        "Home Starter",
        { subType: "defensive_sub", newPosition: "P" },
      );
      expect(pitcherSub).toEqual({ success: true });
    });

    expect(result.current.gameState.currentPitcherId).toBe("home-rp");

    await act(async () => {
      const catcherSub = await result.current.makeSubstitution(
        "home-c2",
        "home-c",
        "Backup Catcher",
        "Home Catcher",
        { subType: "defensive_sub", newPosition: "C" },
      );
      expect(catcherSub).toEqual({ success: true });
    });

    expect(result.current.gameState.currentCatcherId).toBe("home-c2");
    expect(result.current.substitutionLog).toHaveLength(2);
    expect(result.current.getLineupStateSnapshot().home.usedPlayers).toEqual([
      "home-sp",
      "home-c",
    ]);
    expect(result.current.substitutionLog[1]).toMatchObject({
      outgoingPlayerId: "home-c",
      incomingPlayerId: "home-c2",
    });
  });

  test("treats pre-game substitutions as lineup edits instead of permanent usage", async () => {
    const { result } = renderHook(() => useGameState());
    await initializeGame(result, 7);

    await act(async () => {
      const catcherSub = await result.current.makeSubstitution(
        "home-c2",
        "home-c",
        "Backup Catcher",
        "Home Catcher",
        { subType: "defensive_sub", newPosition: "C" },
      );
      expect(catcherSub).toEqual({ success: true });
    });

    const lineupSnapshot = result.current.getLineupStateSnapshot();
    expect(result.current.substitutionLog).toHaveLength(0);
    expect(lineupSnapshot.home.usedPlayers).toEqual([]);
    expect(lineupSnapshot.home.lineup).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          playerId: "home-c2",
          playerName: "Backup Catcher",
          position: "C",
          isStarter: true,
        }),
      ]),
    );
    expect(lineupSnapshot.home.bench).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          playerId: "home-c",
          playerName: "Home Catcher",
          isAvailable: true,
        }),
      ]),
    );
    expect(result.current.gameState.currentCatcherId).toBe("home-c2");
  });

  test("keeps pre-game pitcher swaps available for later use", async () => {
    const { result } = renderHook(() => useGameState());
    await initializeGame(result, 7);

    act(() => {
      result.current.changePitcher(
        "home-rp",
        "home-sp",
        "home",
        "Home Reliever",
        "Home Starter",
      );
    });

    const lineupSnapshot = result.current.getLineupStateSnapshot();
    expect(lineupSnapshot.home.usedPlayers).toEqual([]);
    expect(lineupSnapshot.home.currentPitcher).toMatchObject({
      playerId: "home-rp",
      playerName: "Home Reliever",
      position: "P",
      isStarter: true,
    });
    expect(lineupSnapshot.home.bench).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          playerId: "home-sp",
          playerName: "Home Starter",
          positions: ["P"],
          isAvailable: true,
        }),
      ]),
    );
    expect(lineupSnapshot.home.bench.some((player) => player.playerId === "home-rp")).toBe(false);
    expect(result.current.gameState.currentPitcherId).toBe("home-rp");
  });

  test("routes walk-off errors through the shared end-game evaluator", async () => {
    const { result } = renderHook(() => useGameState());
    await initializeGame(result, 7);

    act(() => {
      result.current.startGame();
    });

    let runnerTrackerState = createRunnerTrackingState("away-sp", "Away Starter");
    runnerTrackerState = addRunner(
      runnerTrackerState,
      "home-sp",
      "Home Starter",
      "3B",
      "hit",
    );

    await act(async () => {
      result.current.restoreState({
        gameState: {
          ...result.current.gameState,
          inning: 7,
          isTop: false,
          outs: 1,
          awayScore: 3,
          homeScore: 3,
          bases: { first: false, second: false, third: true },
          currentBatterId: "home-c",
          currentBatterName: "Home Catcher",
          currentPitcherId: "away-sp",
          currentPitcherName: "Away Starter",
          gamePhase: "LIVE",
        },
        scoreboard: result.current.scoreboard,
        playerStats: buildPlayerStatsMap(),
        pitcherStats: result.current.pitcherStats,
        runnerTrackerState: {
          ...runnerTrackerState,
          inning: 7,
        },
        lineupSnapshot: result.current.getLineupStateSnapshot(),
        batterIndices: result.current.getBatterIndicesSnapshot(),
      });
    });

    await act(async () => {
      await result.current.recordError(0, { fromThird: "home" });
    });

    expect(mockLogAtBatEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        result: "E",
        isWalkOff: true,
        homeScoreAfter: 4,
        awayScoreAfter: 3,
      }),
    );
    expect(result.current.gameState.gamePhase).toBe("POST_FINAL_OUT");
  });

  test("defaults pickoff errors to the pitcher and applies archived fielding errors to the charged player", async () => {
    const { result } = renderHook(() => useGameState());
    await initializeGame(result, 7);

    await act(async () => {
      await result.current.commitPlateAppearance({
        type: "hit",
        hitType: "1B",
        rbi: 0,
      });
    });

    mockLogBetweenPlayEvent.mockClear();

    await act(async () => {
      await result.current.recordEvent("PICK_E", "away-batter-1", {
        runnerId: "away-batter-1",
        runnerName: "Away Batter 1",
        fromBase: "first",
        toBase: "second",
      });
    });

    expect(mockLogBetweenPlayEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "pickoff",
        errorChargedTo: "pitcher",
      }),
    );

    mockGetBetweenPlayEvents.mockResolvedValue([
      {
        eventId: "bp-1",
        gameId: "game-r3-round5",
        timestamp: Date.now(),
        eventIndex: 2,
        type: "pickoff",
        runnerAction: {
          runnerId: "away-batter-1",
          fromBase: 1,
          toBase: 2,
          outcome: "safe",
          reason: "pickoff",
        },
        runnerAttribution: {
          pitcherId: "home-sp",
          catcherId: "home-c",
        },
        errorChargedTo: "catcher",
      },
    ]);

    await act(async () => {
      result.current.restoreState({
        gameState: {
          ...result.current.gameState,
          awayScore: 1,
          homeScore: 0,
        },
        scoreboard: result.current.scoreboard,
        playerStats: buildPlayerStatsMap(),
        pitcherStats: result.current.pitcherStats,
        lineupSnapshot: result.current.getLineupStateSnapshot(),
        batterIndices: result.current.getBatterIndicesSnapshot(),
      });
      await result.current.endGame();
    });

    const archivedState = mockProcessCompletedGame.mock.calls.at(-1)?.[0];
    expect(archivedState.playerStats["home-c"].fieldingErrors).toBe(1);
    expect(archivedState.playerStats["home-sp"].fieldingErrors).toBe(0);
  });

  test("caps post-game linescore columns and uses canonical WPA POG over stored order", async () => {
    mockGetCompletedGameById.mockResolvedValue({
      gameId: "game-r3-round5",
      date: Date.now(),
      stadiumName: "Swagger Center",
      seasonNumber: 1,
      awayTeamId: "away-team",
      homeTeamId: "home-team",
      awayTeamName: "Away Team",
      homeTeamName: "Home Team",
      finalScore: { away: 2, home: 3 },
      innings: 7,
      totalInnings: 7,
      pogPlayerId: "away-batter-1",
      playersOfTheGame: {
        first: "away-batter-1",
        second: "home-c",
      },
      fameEvents: [],
      activityLog: [],
      playerStats: {
        "away-batter-1": {
          playerName: "Away Batter 1",
          teamId: "away-team",
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
          k: 0,
          sb: 0,
          cs: 0,
          sf: 0,
          sh: 0,
          gidp: 0,
          putouts: 0,
          assists: 0,
          fieldingErrors: 0,
        },
        "home-c": {
          playerName: "Home Catcher",
          teamId: "home-team",
          pa: 4,
          ab: 4,
          h: 1,
          singles: 0,
          doubles: 0,
          triples: 0,
          hr: 1,
          rbi: 3,
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
      pitcherGameStats: [],
      inningScores: [
        { away: 0, home: 1 },
        { away: 1, home: 0 },
        { away: 0, home: 0 },
        { away: 0, home: 1 },
        { away: 0, home: 0 },
        { away: 1, home: 0 },
        { away: 0, home: 1 },
        { away: 0, home: 0 },
        { away: 0, home: 0 },
      ],
    });
    mockGetGameEvents.mockResolvedValue([
      { batterId: "home-c", wpa: 0.4 },
      { batterId: "away-batter-1", wpa: 0.1 },
    ]);

    render(<PostGameSummary gameId="game-r3-round5" />);

    expect(await screen.findByText("★ HOME TEAM WIN! ★")).toBeInTheDocument();
    expect(screen.queryByText("8")).not.toBeInTheDocument();
    expect(screen.queryByText("9")).not.toBeInTheDocument();

    const topPogLabel = screen.getByText("Overall POG");
    const topPogCard = topPogLabel.closest("div[style]");
    expect(topPogCard).toBeTruthy();
    expect(within(topPogCard as HTMLElement).getByText("Home Catcher")).toBeInTheDocument();
  });
});
