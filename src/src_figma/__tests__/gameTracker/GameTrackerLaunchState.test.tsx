import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const mockInitializeGame = vi.fn();
  const mockLoadExistingGame = vi.fn();
  const mockEndGame = vi.fn();
  const mockGetCareerStats = vi.fn();
  const mockGetSeasonBattingStats = vi.fn();
  const mockGetSeasonPitchingStats = vi.fn();
  const mockCompleteScheduleGame = vi.fn();
  const emptyLineupSnapshot = {
    away: { lineup: [], bench: [], usedPlayers: [], currentPitcher: null },
    home: { lineup: [], bench: [], usedPlayers: [], currentPitcher: null },
    awayUsesDh: undefined,
    homeUsesDh: undefined,
  };

  return {
    mockNavigate: vi.fn(),
    mockUseParams: vi.fn(),
    mockUseLocation: vi.fn(),
    mockInitializeGame,
    mockLoadExistingGame,
    mockUseGameStateResult: {
      gameState: {
        gameId: "",
        homeScore: 0,
        awayScore: 0,
        inning: 1,
        isTop: true,
        outs: 0,
        balls: 0,
        strikes: 0,
        bases: { first: false, second: false, third: false },
        currentBatterId: "",
        currentBatterName: "",
        currentPitcherId: "",
        currentPitcherName: "",
        currentCatcherId: "",
        currentCatcherName: "",
        awayTeamId: "",
        homeTeamId: "",
        awayTeamName: "",
        homeTeamName: "",
        stadiumName: null,
        seasonNumber: 1,
        gamePhase: "PRE_GAME",
        liveBeatReporterEnabled: false,
        postGameColumnsEnabled: false,
      },
      scoreboard: {
        innings: [],
        away: { runs: 0, hits: 0, errors: 0 },
        home: { runs: 0, hits: 0, errors: 0 },
      },
      playerStats: new Map(),
      pitcherStats: new Map(),
      commitPlateAppearance: vi.fn(),
      recordEvent: vi.fn(),
      recordPlayerStateChange: vi.fn(),
      reassignRunnerEventAttribution: vi.fn(),
      recordPromptedManagerDecision: vi.fn(),
      recordManagerRecommendationWatch: vi.fn(),
      placeGhostRunner: vi.fn(),
      advanceRunner: vi.fn(),
      advanceRunnersBatch: vi.fn(),
      makeSubstitution: vi.fn(),
      swapBattingOrder: vi.fn(),
      switchPositions: vi.fn(),
      changePitcher: vi.fn(),
      advanceCount: vi.fn(),
      resetCount: vi.fn(),
      endInning: vi.fn(),
      endGame: mockEndGame,
      applyScoreAdjustment: vi.fn(),
      applyBasesCorrection: vi.fn(),
      updateTrackedRunnerHowReached: vi.fn(),
      applyOutsAdjustment: vi.fn(),
      scheduleAutoEndInning: vi.fn(),
      forceEndHalfInning: vi.fn(),
      setRunnerOutcomeCorrectionActive: vi.fn(),
      adjustPlayerFieldingErrors: vi.fn(),
      queueAutoEndGame: vi.fn(),
      evaluateEndGameTrigger: vi.fn(),
      pitchCountPrompt: null,
      confirmPitchCount: vi.fn(),
      dismissPitchCountPrompt: vi.fn(),
      deferredPitchCounts: [],
      openDeferredPitchCount: vi.fn(),
      initializeGame: mockInitializeGame,
      loadExistingGame: mockLoadExistingGame,
      undoLastAction: vi.fn(),
      getLineupStateSnapshot: vi.fn(() => emptyLineupSnapshot),
      getBatterIndicesSnapshot: vi.fn(() => ({ away: 0, home: 0 })),
      restoreState: vi.fn(),
      getRunnerTrackerSnapshot: vi.fn(() => ({ runners: [] })),
      getBaseRunnerNames: vi.fn(() => ({})),
      runnerIdentityVersion: 0,
      lineupVersion: 0,
      substitutionLog: [],
      notifyPersistenceMetadataChanged: vi.fn(),
      isLoading: false,
      isSaving: false,
      startGame: vi.fn(),
      showInningEndConfirm: false,
      confirmInningEnd: vi.fn(),
      declineInningEnd: vi.fn(),
      showAutoEndPrompt: false,
      dismissAutoEndPrompt: vi.fn(),
      setPlayoffContext: vi.fn(),
      setStadiumName: vi.fn(),
      setNextEventEnrichment: vi.fn(),
      atBatSequence: 0,
      totalInningsRef: { current: 9 },
      extraInningRunnerRef: { current: false },
      extraInningRunnerDelayRef: { current: 1 },
      teamColorsRef: { current: {} },
      playerMojoFitnessGetterRef: { current: null },
      gameStartTimestampRef: { current: null },
      restoredMojoFitness: null,
      restoredCompetitionContext: {},
      restoredPlayoffContext: {},
    },
    mockEndGame,
    mockGetCareerStats,
    mockGetSeasonBattingStats,
    mockGetSeasonPitchingStats,
    mockCompleteScheduleGame,
  };
});

vi.mock("react-router", () => ({
  useNavigate: () => mocks.mockNavigate,
  useParams: mocks.mockUseParams,
  useLocation: mocks.mockUseLocation,
}));

vi.mock("@/hooks/useGameState", () => ({
  useGameState: () => mocks.mockUseGameStateResult,
}));

vi.mock("@/app/hooks/usePlayerState", () => ({
  usePlayerState: () => ({
    players: new Map(),
    notifications: [],
    getAllPlayers: vi.fn(() => []),
    getPlayer: vi.fn(() => undefined),
    registerPlayer: vi.fn(),
    updateMojo: vi.fn(),
    updateFitness: vi.fn(),
    setMojo: vi.fn(),
    setFitness: vi.fn(),
    dismissNotification: vi.fn(),
  }),
  getStateBadge: vi.fn(() => ""),
  formatMultiplier: vi.fn((value: number) => `${value}`),
}));

vi.mock("@/app/hooks/useFameTracking", () => ({
  useFameTracking: () => ({
    showEventPopup: false,
    lastEvent: null,
    recordFameEvent: vi.fn(),
    dismissEventPopup: vi.fn(),
    getPlayerFame: vi.fn(() => 0),
    fameEvents: [],
  }),
  formatFameValue: vi.fn((value: number) => `${value}`),
  getFameColor: vi.fn(() => "#ffffff"),
  getLITier: vi.fn(() => ({ label: "Low" })),
}));

vi.mock("@/app/hooks/useCommentaryFeed", () => ({
  useCommentaryFeed: () => ({
    commentaryEntries: [],
    fireBetweenInningSummary: vi.fn(),
    firePostGameColumns: vi.fn(),
    homeDisabled: true,
    awayDisabled: true,
  }),
}));

vi.mock("@/app/components/UndoSystem", () => ({
  useUndoSystem: () => ({
    setCurrentState: vi.fn(),
    captureSnapshot: vi.fn(),
    canUndo: false,
    undoCount: 0,
    performUndo: vi.fn(),
    clearHistory: vi.fn(),
    undoBoundaryTimestamp: null,
    ToastComponent: () => null,
  }),
}));

vi.mock("../../app/hooks/useFanMorale", () => ({
  useFanMorale: () => ({
    morale: 50,
    getMoraleMultiplier: vi.fn(() => 1),
    processGameResult: vi.fn(),
  }),
}));

vi.mock("../../app/engines/narrativeIntegration", () => ({
  generateGameRecap: vi.fn(() => ({
    headline: "Final",
    summary: "Final summary",
    keyMoment: "Key moment",
    playerOfGame: "Player",
    tone: "neutral",
  })),
}));

vi.mock("../../../utils/careerStorage", () => ({
  getCareerStats: mocks.mockGetCareerStats,
}));

vi.mock("../../../utils/milestoneDetector", () => ({
  getApproachingMilestones: vi.fn(() => []),
}));

vi.mock("../../../utils/seasonStorage", () => ({
  getSeasonBattingStats: mocks.mockGetSeasonBattingStats,
  getSeasonPitchingStats: mocks.mockGetSeasonPitchingStats,
}));

vi.mock("../../../utils/scheduleStorage", () => ({
  completeGame: mocks.mockCompleteScheduleGame,
}));

vi.mock("../../../utils/leagueBuilderStorage", () => ({
  getAllPlayers: vi.fn().mockResolvedValue([]),
  getTeam: vi.fn().mockResolvedValue(null),
}));

vi.mock("../../../utils/reporterStorage", () => ({
  getReporterForTeam: vi.fn().mockResolvedValue(null),
}));

vi.mock("../../../utils/eventLog", () => ({
  getAtBatEvent: vi.fn().mockResolvedValue(null),
  getBetweenPlayEvent: vi.fn().mockResolvedValue(null),
  getBetweenPlayEvents: vi.fn().mockResolvedValue([]),
  getFieldingEventsForAtBat: vi.fn().mockResolvedValue([]),
  getGameFieldingEvents: vi.fn().mockResolvedValue([]),
  getGameEvents: vi.fn().mockResolvedValue([]),
  getGameHeader: vi.fn().mockResolvedValue(null),
  getMatchupEvents: vi.fn().mockResolvedValue([]),
  logFieldingEvent: vi.fn().mockResolvedValue(undefined),
  updateAtBatEvent: vi.fn().mockResolvedValue(undefined),
  updateAtBatEventWithFieldingSync: vi.fn().mockResolvedValue(undefined),
  updateBetweenPlayEvent: vi.fn().mockResolvedValue(undefined),
}));

import { GameTracker, MISSING_GAME_TRACKER_LAUNCH_STATE_TITLE } from "../../app/pages/GameTracker";
import type { Player, Pitcher } from "../../app/components/TeamRoster";

function makePlayers(team: "away" | "home"): Player[] {
  const positions = ["C", "1B", "2B", "3B", "SS", "LF", "CF", "RF", "DH"];
  return positions.map((position, index) => ({
    playerId: `${team}-player-${index + 1}`,
    name: `${team === "away" ? "Away" : "Home"} Batter ${index + 1}`,
    position,
    battingOrder: index + 1,
    stats: { ab: 0, h: 0, r: 0, rbi: 0, bb: 0, k: 0 },
    battingHand: index % 2 === 0 ? "R" : "L",
  }));
}

function makePitchers(team: "away" | "home"): Pitcher[] {
  return [
    {
      playerId: `${team}-starter`,
      name: `${team === "away" ? "Away" : "Home"} Starter`,
      stats: { ip: "0.0", h: 0, r: 0, er: 0, bb: 0, k: 0, pitches: 0 },
      throwingHand: "R",
      isStarter: true,
      isActive: true,
    },
  ];
}

describe("GameTracker launch state", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mockUseParams.mockReturnValue({ gameId: undefined });
    mocks.mockUseLocation.mockReturnValue({
      pathname: "/game-tracker",
      search: "",
      hash: "",
      state: null,
    });
    mocks.mockLoadExistingGame.mockResolvedValue(false);
    mocks.mockInitializeGame.mockImplementation(() => new Promise(() => {}));
    mocks.mockEndGame.mockResolvedValue(undefined);
    mocks.mockGetCareerStats.mockResolvedValue({ batting: {}, pitching: {} });
    mocks.mockGetSeasonBattingStats.mockResolvedValue([]);
    mocks.mockGetSeasonPitchingStats.mockResolvedValue([]);
    mocks.mockCompleteScheduleGame.mockResolvedValue(undefined);
    Object.assign(mocks.mockUseGameStateResult.gameState, {
      gameId: "",
      homeScore: 0,
      awayScore: 0,
      inning: 1,
      isTop: true,
      outs: 0,
      balls: 0,
      strikes: 0,
      bases: { first: false, second: false, third: false },
      currentBatterId: "",
      currentBatterName: "",
      currentPitcherId: "",
      currentPitcherName: "",
      currentCatcherId: "",
      currentCatcherName: "",
      awayTeamId: "",
      homeTeamId: "",
      awayTeamName: "",
      homeTeamName: "",
      stadiumName: null,
      seasonId: undefined,
      statsScopeId: undefined,
      seasonNumber: 1,
      gamePhase: "PRE_GAME",
      liveBeatReporterEnabled: false,
      postGameColumnsEnabled: false,
    });
    mocks.mockUseGameStateResult.restoredCompetitionContext = {};
    mocks.mockUseGameStateResult.restoredPlayoffContext = {};
    mocks.mockUseGameStateResult.showAutoEndPrompt = false;
    vi.spyOn(console, "error").mockImplementation(() => {});
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation(() => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });
  });

  test("direct entry without launch rosters shows a blocking error and does not create fake players", async () => {
    render(<GameTracker />);

    expect(await screen.findByRole("alert")).toHaveTextContent(
      MISSING_GAME_TRACKER_LAUNCH_STATE_TITLE,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("away batting roster");
    expect(mocks.mockLoadExistingGame).toHaveBeenCalledWith({
      preferSnapshot: true,
    });
    expect(mocks.mockInitializeGame).not.toHaveBeenCalled();
    expect(document.body).not.toHaveTextContent("J. MARTINEZ");
    expect(document.body).not.toHaveTextContent("R. LOPEZ");
    expect(document.body).not.toHaveTextContent("S. WHITE");
  });

  test("valid Exhibition launch state initializes GameTracker with supplied rosters", async () => {
    const awayPlayers = makePlayers("away");
    const homePlayers = makePlayers("home");
    const awayPitchers = makePitchers("away");
    const homePitchers = makePitchers("home");

    mocks.mockUseParams.mockReturnValue({ gameId: "exhibition-1" });
    mocks.mockUseLocation.mockReturnValue({
      pathname: "/game-tracker/exhibition-1",
      search: "",
      hash: "",
      state: {
        gameMode: "exhibition",
        competitionType: "exhibition",
        awayTeamId: "away-team",
        homeTeamId: "home-team",
        awayTeamName: "Away Team",
        homeTeamName: "Home Team",
        awayPlayers,
        awayPitchers,
        homePlayers,
        homePitchers,
        useDH: true,
      },
    });

    render(<GameTracker />);

    await waitFor(() => expect(mocks.mockInitializeGame).toHaveBeenCalled());
    expect(mocks.mockLoadExistingGame).not.toHaveBeenCalled();

    const initConfig = mocks.mockInitializeGame.mock.calls[0][0];
    expect(initConfig.awayLineup.map((player: { playerName: string }) => player.playerName)).toContain(
      "Away Batter 1",
    );
    expect(initConfig.homeLineup.map((player: { playerName: string }) => player.playerName)).toContain(
      "Home Batter 1",
    );
    expect(initConfig.awayStartingPitcherName).toBe("Away Starter");
    expect(initConfig.homeStartingPitcherName).toBe("Home Starter");
    expect(JSON.stringify(initConfig)).not.toContain("J. MARTINEZ");
    expect(JSON.stringify(initConfig)).not.toContain("R. LOPEZ");
    expect(JSON.stringify(initConfig)).not.toContain("S. WHITE");
  });

  test("valid Elimination launch state is not blocked by the missing-state guard", async () => {
    const awayPlayers = [
      ...makePlayers("away"),
      {
        playerId: "away-bench-of",
        name: "Lester Bronco",
        position: "OF",
        stats: { ab: 0, h: 0, r: 0, rbi: 0, bb: 0, k: 0 },
        battingHand: "R",
      },
      {
        playerId: "away-starter",
        name: "Away Starter",
        position: "P",
        stats: { ab: 0, h: 0, r: 0, rbi: 0, bb: 0, k: 0 },
        battingHand: "L",
      },
    ];
    const homePlayers = makePlayers("home");
    const awayPitchers = [
      ...makePitchers("away"),
      {
        playerId: "away-reliever",
        name: "Away Reliever",
        stats: { ip: "0.0", h: 0, r: 0, er: 0, bb: 0, k: 0, pitches: 0 },
        throwingHand: "L",
        isStarter: false,
        isActive: false,
      },
    ];
    const homePitchers = makePitchers("home");

    mocks.mockUseParams.mockReturnValue({ gameId: "elimination-game-1" });
    mocks.mockUseLocation.mockReturnValue({
      pathname: "/game-tracker/elimination-game-1",
      search: "",
      hash: "",
      state: {
        gameMode: "elimination",
        competitionType: "elimination",
        eliminationId: "elim-1",
        competitionId: "elim-1",
        awayTeamId: "lower-seed",
        homeTeamId: "higher-seed",
        awayTeamName: "Lower Seed",
        homeTeamName: "Higher Seed",
        awayPlayers,
        awayPitchers,
        homePlayers,
        homePitchers,
        useDH: true,
      },
    });

    render(<GameTracker />);

    await waitFor(() => expect(mocks.mockInitializeGame).toHaveBeenCalled());

    const initConfig = mocks.mockInitializeGame.mock.calls[0][0];
    expect(initConfig.competitionType).toBe("elimination");
    expect(initConfig.competitionId).toBe("elim-1");
    expect(initConfig.awayStartingPitcherName).toBe("Away Starter");
    expect(initConfig.homeStartingPitcherName).toBe("Home Starter");
    expect(initConfig.awayBench).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ playerId: "away-bench-of", playerName: "Lester Bronco" }),
        expect.objectContaining({ playerId: "away-reliever", playerName: "Away Reliever" }),
      ]),
    );
    expect(initConfig.awayBench).not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ playerId: "away-starter" }),
      ]),
    );
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  test("direct-entry restored franchise scope drives live season stat context", async () => {
    mocks.mockUseParams.mockReturnValue({ gameId: "game-franchise-restored" });
    mocks.mockUseLocation.mockReturnValue({
      pathname: "/game-tracker/game-franchise-restored",
      search: "",
      hash: "",
      state: null,
    });
    mocks.mockLoadExistingGame.mockResolvedValue(true);
    Object.assign(mocks.mockUseGameStateResult.gameState, {
      gameId: "game-franchise-restored",
      currentBatterId: "away-batter-1",
      currentBatterName: "Away Batter 1",
      currentPitcherId: "home-sp",
      currentPitcherName: "Home Starter",
      awayTeamId: "away-team",
      homeTeamId: "home-team",
      awayTeamName: "Away Team",
      homeTeamName: "Home Team",
      seasonNumber: 3,
      gamePhase: "LIVE",
    });
    mocks.mockUseGameStateResult.restoredCompetitionContext = {
      seasonId: "franchise-restored-season-3",
      statsScopeId: "franchise-restored-season-3",
      seasonNumber: 3,
      competitionType: "franchise",
      competitionId: "franchise-restored",
      franchiseId: "franchise-restored",
      scheduleGameId: "schedule-restored-7",
    };

    render(<GameTracker />);

    await waitFor(() => {
      expect(mocks.mockGetSeasonBattingStats).toHaveBeenCalledWith(
        "franchise-restored-season-3",
      );
    });
    expect(mocks.mockGetSeasonPitchingStats).toHaveBeenCalledWith(
      "franchise-restored-season-3",
    );
    expect(mocks.mockInitializeGame).not.toHaveBeenCalled();
  });

  test("direct-entry restored franchise scope completes restored schedule game", async () => {
    mocks.mockUseParams.mockReturnValue({ gameId: "game-franchise-restored" });
    mocks.mockUseLocation.mockReturnValue({
      pathname: "/game-tracker/game-franchise-restored",
      search: "",
      hash: "",
      state: null,
    });
    mocks.mockLoadExistingGame.mockResolvedValue(true);
    Object.assign(mocks.mockUseGameStateResult.gameState, {
      gameId: "game-franchise-restored",
      currentBatterId: "away-batter-1",
      currentBatterName: "Away Batter 1",
      currentPitcherId: "home-sp",
      currentPitcherName: "Home Starter",
      awayTeamId: "away-team",
      homeTeamId: "home-team",
      awayTeamName: "Away Team",
      homeTeamName: "Home Team",
      awayScore: 2,
      homeScore: 5,
      seasonNumber: 3,
      gamePhase: "LIVE",
      postGameColumnsEnabled: false,
    });
    mocks.mockUseGameStateResult.restoredCompetitionContext = {
      seasonId: "franchise-restored-season-3",
      statsScopeId: "franchise-restored-season-3",
      seasonNumber: 3,
      competitionType: "franchise",
      competitionId: "franchise-restored",
      franchiseId: "franchise-restored",
      scheduleGameId: "schedule-restored-7",
      leagueId: "league-restored",
    };
    mocks.mockUseGameStateResult.showAutoEndPrompt = true;

    render(<GameTracker />);

    expect(await screen.findByText(/END GAME CONFIRMATION/i)).toBeInTheDocument();

    const confirmEndGameButton = screen
      .getAllByRole("button", { name: /END GAME/i })
      .find((button) => button.textContent?.trim() === "END GAME");
    expect(confirmEndGameButton).toBeDefined();
    fireEvent.click(confirmEndGameButton!);

    await waitFor(() => {
      expect(mocks.mockEndGame).toHaveBeenCalledWith(
        expect.objectContaining({
          seasonId: "franchise-restored-season-3",
          statsScopeId: "franchise-restored-season-3",
          franchiseId: "franchise-restored",
          scheduleGameId: "schedule-restored-7",
          currentSeason: 3,
        }),
      );
    });
    await waitFor(() => {
      expect(mocks.mockCompleteScheduleGame).toHaveBeenCalledWith(
        "schedule-restored-7",
        expect.objectContaining({
          homeScore: 5,
          awayScore: 2,
          winningTeamId: "home-team",
          losingTeamId: "away-team",
          gameLogId: "game-franchise-restored",
        }),
      );
    });
  });

});
