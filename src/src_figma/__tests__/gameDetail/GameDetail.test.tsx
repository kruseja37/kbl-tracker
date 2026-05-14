import { beforeEach, describe, expect, test, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";

import { GameDetail } from "../../app/pages/GameDetail";
import type { CompletedGameRecord } from "../../utils/gameStorage";
import type {
  ManagerDeploymentStintRecord,
  ManagerDecisionRecord,
  ManagerLineupDeltaRecord,
} from "../../../types/managerWpa";

const {
  mockAggregateKblWpaCredits,
  mockDeriveActualAtBatWpa,
  mockDeriveKblWpaCredits,
  mockGetAllCanonicalPlayers,
  mockGetArchiveInstanceIdForGame,
  mockGetBetweenPlayEvents,
  mockGetCompletedGameById,
  mockGetGameEvents,
  mockGetGameFieldingEvents,
  mockGetGameHeader,
  mockListManagerProfiles,
  mockRankPlayersOfTheGame,
} = vi.hoisted(() => ({
  mockAggregateKblWpaCredits: vi.fn(),
  mockDeriveActualAtBatWpa: vi.fn(),
  mockDeriveKblWpaCredits: vi.fn(),
  mockGetAllCanonicalPlayers: vi.fn(),
  mockGetArchiveInstanceIdForGame: vi.fn(),
  mockGetBetweenPlayEvents: vi.fn(),
  mockGetCompletedGameById: vi.fn(),
  mockGetGameEvents: vi.fn(),
  mockGetGameFieldingEvents: vi.fn(),
  mockGetGameHeader: vi.fn(),
  mockListManagerProfiles: vi.fn(),
  mockRankPlayersOfTheGame: vi.fn(),
}));

vi.mock("react-router", () => ({
  Link: ({ children, className, to }: { children: ReactNode; className?: string; to: string }) => (
    <a className={className} href={to}>
      {children}
    </a>
  ),
  useParams: () => ({ gameId: "game-detail-1" }),
}));

vi.mock("@/config/teamColors", () => ({
  getTeamColors: (teamId: string) => ({
    primary: teamId === "away" ? "#3355AA" : "#AA5533",
    secondary: "#FFFFFF",
  }),
}));

vi.mock("../../utils/gameStorage", () => ({
  getCompletedGameById: mockGetCompletedGameById,
}));

vi.mock("../../../utils/almanacQueries", () => ({
  getArchiveInstanceIdForGame: mockGetArchiveInstanceIdForGame,
}));

vi.mock("../../../utils/almanacStorage", () => ({
  getAllCanonicalPlayers: mockGetAllCanonicalPlayers,
}));

vi.mock("../../../utils/managerIdentityStorage", () => ({
  listManagerProfiles: mockListManagerProfiles,
}));

vi.mock("../../../utils/eventLog", () => ({
  getBetweenPlayEvents: mockGetBetweenPlayEvents,
  getGameEvents: mockGetGameEvents,
  getGameFieldingEvents: mockGetGameFieldingEvents,
  getGameHeader: mockGetGameHeader,
}));

vi.mock("../../../utils/kblWpaAttribution", () => ({
  aggregateKblWpaCredits: mockAggregateKblWpaCredits,
  deriveActualAtBatWpa: mockDeriveActualAtBatWpa,
  deriveKblWpaCredits: mockDeriveKblWpaCredits,
}));

vi.mock("../../../utils/playersOfTheGame", () => ({
  rankPlayersOfTheGame: mockRankPlayersOfTheGame,
}));

vi.mock("../../app/components/WinProbChart", () => ({
  WinProbChart: () => <div data-testid="win-prob-chart" />,
}));

function createManagerDecision(
  overrides: Partial<ManagerDecisionRecord> = {},
): ManagerDecisionRecord {
  return {
    decisionId: "game-detail-1:bp-1:pinch_hitter",
    gameId: "game-detail-1",
    managerId: "away-manager",
    teamId: "away",
    opponentTeamId: "home",
    decisionType: "pinch_hitter",
    inferenceMethod: "automatic",
    decisionSource: "user_action",
    confidence: "high",
    inning: 7,
    half: "top",
    outs: 1,
    baseState: "---",
    scoreDifferentialForTeam: 0,
    leverageIndex: 2.4,
    decisionEventId: "bp-1",
    linkedEventIds: ["bp-1"],
    involvedPlayerIds: ["bench-bat"],
    teamWinProbabilityBefore: 0.5,
    teamWinProbabilityAfter: 0.684,
    managerWpa: 0.184,
    rawWindowWpa: 0.184,
    managerShare: 1,
    resolved: true,
    resolvedAtEventId: "ab-9",
    displayTitle: "Pinch hitter",
    displaySummary: "Pinch hitter for away",
    derivation: {
      derivedFromEventIds: ["bp-1"],
      derivedFromFields: ["substitution.subType"],
      manuallyPinned: false,
      stale: false,
    },
    ...overrides,
  };
}

function createCompletedGame(
  managerDecisions: ManagerDecisionRecord[] = [],
  managerLineupDeltas: ManagerLineupDeltaRecord[] = [],
  managerDeploymentStints: ManagerDeploymentStintRecord[] = [],
): CompletedGameRecord {
  return {
    gameId: "game-detail-1",
    date: Date.UTC(2026, 4, 11),
    stadiumName: "Detail Park",
    awayTeamId: "away",
    homeTeamId: "home",
    awayTeamName: "Away Club",
    homeTeamName: "Home Club",
    finalScore: { away: 5, home: 4 },
    innings: 9,
    totalInnings: 9,
    fameEvents: [],
    playerStats: {
      "player-one": {
        playerName: "Player One",
        teamId: "away",
        pa: 1,
        ab: 1,
        h: 1,
        singles: 1,
        doubles: 0,
        triples: 0,
        hr: 0,
        rbi: 1,
        r: 0,
        bb: 0,
        hbp: 0,
        k: 0,
        sb: 0,
        cs: 0,
        putouts: 0,
        assists: 0,
        fieldingErrors: 0,
      },
    },
    pitcherGameStats: [],
    managerDecisions,
    managerDeploymentStints,
    managerLineupDeltas,
  } as CompletedGameRecord;
}

describe("GameDetail Manager WPA overlay", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAllCanonicalPlayers.mockResolvedValue([]);
    mockGetArchiveInstanceIdForGame.mockReturnValue("league-1");
    mockGetBetweenPlayEvents.mockResolvedValue([]);
    mockGetGameEvents.mockResolvedValue([]);
    mockGetGameFieldingEvents.mockResolvedValue([]);
    mockGetGameHeader.mockResolvedValue(null);
    mockListManagerProfiles.mockResolvedValue([
      { managerId: "away-manager", displayName: "Casey Custom" },
      { managerId: "home-manager", displayName: "Home Boss" },
    ]);
    mockDeriveActualAtBatWpa.mockReturnValue({ wpa: 0 });
    mockDeriveKblWpaCredits.mockReturnValue([]);
    mockAggregateKblWpaCredits.mockReturnValue([
      {
        playerId: "player-one",
        playerName: "Player One",
        teamId: "away",
        totalWpa: 0.3,
        battingWpa: 0.3,
        pitchingWpa: 0,
        catchingWpa: 0,
        fieldingWpa: 0,
        baserunningWpa: 0,
      },
    ]);
    mockRankPlayersOfTheGame.mockReturnValue([]);
  });

  test("renders one manager summary card per team from committed decisions", async () => {
    mockGetCompletedGameById.mockResolvedValue(
      createCompletedGame([
        createManagerDecision({ managerWpa: 0.184 }),
        createManagerDecision({
          decisionId: "game-detail-1:bp-2:pitching_change",
          decisionType: "pitching_change",
          displayTitle: "Pitching change",
          managerWpa: undefined,
          rawWindowWpa: undefined,
          resolved: false,
          teamWinProbabilityAfter: undefined,
          resolvedAtEventId: undefined,
        }),
        createManagerDecision({
          decisionId: "game-detail-1:bp-3:runner_hold",
          managerId: "home-manager",
          teamId: "home",
          opponentTeamId: "away",
          decisionType: "runner_hold",
          displayTitle: "Runner hold",
          managerWpa: -0.052,
          rawWindowWpa: -0.052,
        }),
      ]),
    );

    render(<GameDetail />);

    const overlay = await screen.findByTestId("manager-wpa-overlay");
    expect(within(overlay).getByText("MANAGER WPA OVERLAY")).toBeInTheDocument();
    expect(screen.getByText("Casey Custom")).toBeInTheDocument();
    expect(screen.getByTestId("manager-wpa-total-away")).toHaveTextContent("+0.184");
    expect(screen.getByTestId("manager-wpa-total-home")).toHaveTextContent("-0.052");
    expect(within(screen.getByTestId("manager-wpa-card-away")).getByText("2 (1 pending)")).toBeInTheDocument();
  });

  test("shows committed deployment and lineup values separately from tactical Manager WPA", async () => {
    mockGetCompletedGameById.mockResolvedValue(
      createCompletedGame(
        [createManagerDecision({ managerWpa: 0.184 })],
        [
          {
            decisionId: "game-detail-1:away:player-one:lineup_delta",
            gameId: "game-detail-1",
            managerId: "away-manager",
            teamId: "away",
            decisionType: "lineup_construction",
            inferenceMethod: "automatic",
            confidence: "low",
            starterPlayerId: "player-one",
            starterPlayerName: "Player One",
            battingOrderSlot: 1,
            defensivePosition: "SS",
            starterRole: "position_player",
            actualPlayerKblWpa: 0.4,
            replacementExpectedKblWpa: 0.032,
            replacementBaselineSource: "optimal_lineup_v2",
            replacementBaselineConfidence: "medium",
            rawPerformanceDelta: 0.368,
            managerShare: 0.25,
            managerWpa: 0.1,
            chosenPlayerId: "player-one",
            chosenPlayerName: "Player One",
            chosenBattingOrderSlot: 1,
            chosenDefensivePosition: "SS",
            optimalPlayerId: "bench-one",
            optimalPlayerName: "Bench One",
            optimalBattingOrderSlot: 4,
            optimalDefensivePosition: "CF",
            chosenProjectedKblWpa: 0.012,
            optimalProjectedKblWpa: 0.032,
            projectedOpportunityCost: -0.02,
            actualChosenKblWpa: 0.4,
            actualVsOptimalProjection: 0.368,
          },
        ],
        [
          {
            stintId: "game-detail-1:away:deployment",
            gameId: "game-detail-1",
            managerId: "away-manager",
            teamId: "away",
            deploymentRole: "pinch_hitter_remaining",
            playerId: "bench-one",
            playerName: "Bench One",
            sourceEventId: "bp-1",
            openedAtEventIndex: 1,
            tacticalExclusionEventIds: ["ab-1"],
            closedAtEventId: "ab-2",
            closedAtEventIndex: 2,
            closeReason: "game_end",
            linkedEventIds: ["ab-2"],
            rawLinkedWpa: 0.08,
            managerShare: 0.15,
            managerDeploymentWpa: 0.012,
            cap: 0.1,
            confidence: "medium",
          },
        ],
      ),
    );

    render(<GameDetail />);

    await screen.findByTestId("manager-wpa-overlay");
    expect(screen.getByTestId("manager-wpa-total-away")).toHaveTextContent("+0.296");
    expect(screen.getByTestId("manager-deployment-wpa-away")).toHaveTextContent("+0.012");
    expect(screen.getByTestId("manager-lineup-delta-away")).toHaveTextContent("+0.100");
    expect(screen.getByTestId("manager-value-away")).toHaveTextContent("+0.296");
    expect(screen.getByTestId("manager-lineup-delta-details-away")).toHaveTextContent("Chosen: #1 SS Player One");
    expect(screen.getByTestId("manager-lineup-delta-details-away")).toHaveTextContent("Optimal: #4 CF Bench One");
    expect(screen.getByTestId("manager-lineup-delta-details-away")).toHaveTextContent("Projected opportunity cost: -0.020");
    expect(screen.getByTestId("manager-lineup-delta-details-away")).toHaveTextContent("Actual vs optimal projection: +0.368");
    const deploymentDetails = screen.getByTestId("manager-deployment-stint-details-away");
    expect(deploymentDetails).toHaveTextContent("Pinch hitter remaining: Bench One");
    expect(deploymentDetails).toHaveTextContent("Opened: Event 1");
    expect(deploymentDetails).toHaveTextContent("Closed: Event 2 (Game End)");
    expect(deploymentDetails).toHaveTextContent("Linked outcomes: 1 (ab-2)");
    expect(deploymentDetails).toHaveTextContent("Raw WPA: +0.080");
    expect(deploymentDetails).toHaveTextContent("Share: 15%");
    expect(deploymentDetails).toHaveTextContent("Cap: +/-0.100");
    expect(deploymentDetails).toHaveTextContent("Deployment WPA: +0.012");
  });

  test("keeps active deployment stints out of resolved overlay totals", async () => {
    mockGetCompletedGameById.mockResolvedValue(
      createCompletedGame(
        [],
        [],
        [
          {
            stintId: "game-detail-1:away:active-deployment",
            gameId: "game-detail-1",
            managerId: "away-manager",
            teamId: "away",
            deploymentRole: "pitcher",
            playerId: "away-reliever",
            playerName: "Away Reliever",
            sourceEventId: "bp-1",
            openedAtEventIndex: 5,
            tacticalExclusionEventIds: ["ab-5"],
            linkedEventIds: ["ab-6"],
            rawLinkedWpa: 0.6,
            managerShare: 0.15,
            managerDeploymentWpa: 0.09,
            cap: 0.2,
            confidence: "medium",
          },
        ],
      ),
    );

    render(<GameDetail />);

    await screen.findByTestId("manager-wpa-overlay");
    expect(screen.getByTestId("manager-deployment-wpa-away")).toHaveTextContent("+0.000");
    expect(screen.getByTestId("manager-wpa-total-away")).toHaveTextContent("+0.000");
    const deploymentDetails = screen.getByTestId("manager-deployment-stint-details-away");
    expect(deploymentDetails).toHaveTextContent("Pitcher: Away Reliever");
    expect(deploymentDetails).toHaveTextContent("Closed: Active");
    expect(deploymentDetails).toHaveTextContent("Active, excluded from resolved total");
    expect(deploymentDetails).toHaveTextContent("Deployment WPA: +0.000");
  });

  test("keeps manager overlay values out of the player KBL WPA leaderboard", async () => {
    mockGetCompletedGameById.mockResolvedValue(
      createCompletedGame([
        createManagerDecision({
          managerWpa: 9.999,
          rawWindowWpa: 9.999,
        }),
      ]),
    );

    render(<GameDetail />);

    const leaderboardTitle = await screen.findByText("KBL WPA Leaderboard");
    const leaderboardSection = leaderboardTitle.closest("section");
    expect(leaderboardSection).not.toBeNull();
    expect(within(leaderboardSection as HTMLElement).getByText("+0.300")).toBeInTheDocument();
    expect(within(leaderboardSection as HTMLElement).queryByText("+9.999")).not.toBeInTheDocument();
  });

  test("does not derive overlay values from event-log data without committed managerDecisions", async () => {
    mockGetCompletedGameById.mockResolvedValue(createCompletedGame([]));
    mockGetBetweenPlayEvents.mockResolvedValue([
      {
        eventId: "ghost-manager-event",
        type: "pitching_change",
        timestamp: Date.UTC(2026, 4, 11),
      },
    ]);

    render(<GameDetail />);

    await screen.findByTestId("manager-wpa-overlay");
    expect(screen.getByTestId("manager-wpa-total-away")).toHaveTextContent("+0.000");
    expect(screen.getByTestId("manager-wpa-total-home")).toHaveTextContent("+0.000");
    expect(screen.getByTestId("manager-lineup-delta-empty-away")).toHaveTextContent("No lineup deviations");
  });
});
