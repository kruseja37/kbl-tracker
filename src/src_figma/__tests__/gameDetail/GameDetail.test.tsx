import { beforeEach, describe, expect, test, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
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
    mockDeriveKblWpaCredits.mockReturnValue([
      {
        eventId: "ab-1",
        source: "at_bat",
        playerId: "player-one",
        playerName: "Player One",
        teamId: "away",
        role: "batting",
        wpa: 0.3,
        confidence: "high",
        basis: "Batting WPA",
        allocationMode: "ratio",
      },
    ]);
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
  });

  test("renders POG awards from canonical KBL WPA totals", async () => {
    mockGetCompletedGameById.mockResolvedValue(createCompletedGame());

    render(<GameDetail />);

    const awardsTitle = await screen.findByText("POG Awards");
    const awardsSection = awardsTitle.closest("section");
    expect(awardsSection).not.toBeNull();
    expect(within(awardsSection as HTMLElement).getByText("Overall POG")).toBeInTheDocument();
    expect(within(awardsSection as HTMLElement).getByText("3 pts")).toBeInTheDocument();
    expect(within(awardsSection as HTMLElement).getByText("Player One")).toBeInTheDocument();
    expect(within(awardsSection as HTMLElement).getByText("+30.0 pp KBL WPA")).toBeInTheDocument();
  });

  test("renders Team Standouts as display-only recognition", async () => {
    mockGetCompletedGameById.mockResolvedValue(createCompletedGame());

    render(<GameDetail />);

    const standoutsTitle = await screen.findByText("Team Standouts");
    const standoutsSection = standoutsTitle.closest("section");
    expect(standoutsSection).not.toBeNull();
    expect(within(standoutsSection as HTMLElement).getByText("Team Standout")).toBeInTheDocument();
    expect(within(standoutsSection as HTMLElement).getByText("Display only")).toBeInTheDocument();
    expect(within(standoutsSection as HTMLElement).getByText("Player One")).toBeInTheDocument();
    expect(within(standoutsSection as HTMLElement).getByText(/Recognition only/)).toBeInTheDocument();
  });

  test("renders archived fame event team and opponent context", async () => {
    mockGetCompletedGameById.mockResolvedValue({
      ...createCompletedGame(),
      fameEvents: [
        {
          id: "fame-perfect-game-1",
          gameId: "game-detail-1",
          eventType: "PERFECT_GAME",
          playerId: "pitcher-one",
          playerName: "Pitcher One",
          playerTeam: "away",
          teamId: "away",
          teamName: "Away Club",
          opponentTeamId: "home",
          opponentTeamName: "Home Club",
          fameValue: 7,
          fameType: "bonus",
          inning: 9,
          halfInning: "BOTTOM",
          timestamp: 123,
          autoDetected: true,
          description: "Pitcher One finishes a perfect game.",
        },
      ],
    });

    render(<GameDetail />);

    const fameTitle = await screen.findByText("Fame Events");
    const fameSection = fameTitle.closest("section");
    expect(fameSection).not.toBeNull();
    expect(within(fameSection as HTMLElement).getByText("Pitcher One")).toBeInTheDocument();
    expect(within(fameSection as HTMLElement).getByText("PERFECT GAME")).toBeInTheDocument();
    expect(within(fameSection as HTMLElement).getByText("Away Club vs Home Club")).toBeInTheDocument();
    expect(within(fameSection as HTMLElement).getByText("Pitcher One finishes a perfect game.")).toBeInTheDocument();
  });

  test("renders compact blocker when archive has no trusted fame events", async () => {
    mockGetCompletedGameById.mockResolvedValue(createCompletedGame());

    render(<GameDetail />);

    expect(
      await screen.findByText("No trusted fame events stored. Score-only/manual-result games do not create fame evidence."),
    ).toBeInTheDocument();
  });

  test("stored POG ids do not override KBL WPA-derived GameDetail awards", async () => {
    mockGetCompletedGameById.mockResolvedValue({
      ...createCompletedGame(),
      playersOfTheGame: {
        first: "stored-player",
      },
    });

    render(<GameDetail />);

    const awardsTitle = await screen.findByText("POG Awards");
    const awardsSection = awardsTitle.closest("section");
    expect(awardsSection).not.toBeNull();
    expect(within(awardsSection as HTMLElement).getByText("Player One")).toBeInTheDocument();
    expect(within(awardsSection as HTMLElement).queryByText("stored-player")).not.toBeInTheDocument();
  });

  test("renders stored-only legacy Overall POG when KBL WPA is unavailable", async () => {
    mockDeriveKblWpaCredits.mockReturnValue([]);
    mockGetCompletedGameById.mockResolvedValue({
      ...createCompletedGame(),
      playersOfTheGame: {
        first: "player-one",
      },
    });

    render(<GameDetail />);

    const awardsTitle = await screen.findByText("POG Awards");
    const awardsSection = awardsTitle.closest("section");
    expect(awardsSection).not.toBeNull();
    expect(within(awardsSection as HTMLElement).getByText("Overall POG")).toBeInTheDocument();
    expect(within(awardsSection as HTMLElement).getByText("Stored legacy POG")).toBeInTheDocument();
    expect(within(awardsSection as HTMLElement).queryByText("Best Hitter")).not.toBeInTheDocument();
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
          resolutionWindow: {
            status: "pending",
            startEventId: "bp-2",
            startEventIndex: 2,
            startSnapshotSource: "event_state",
            expectedEndpoint: "next_pa",
            trackedPlayerIds: ["home-pitcher"],
            trackedRunnerIds: [],
          },
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
    expect(within(overlay).getByText("Casey Custom")).toBeInTheDocument();
    expect(screen.getByTestId("manager-wpa-total-away")).toHaveTextContent("+18.4 pp");
    expect(screen.getByTestId("manager-wpa-total-home")).toHaveTextContent("-5.2 pp");
    expect(within(screen.getByTestId("manager-wpa-card-away")).getByText("2 (1 pending)")).toBeInTheDocument();
    expect(screen.getByTestId("manager-tactical-trace-details-away")).toHaveTextContent(
      "Pinch hitter decision judged on the next plate appearance.",
    );
    expect(screen.getByTestId("manager-tactical-trace-details-away")).toHaveTextContent(
      "Pending Pitching change: waiting for the next plate appearance before Manager Value is scored.",
    );

    fireEvent.click(
      within(screen.getByTestId("manager-tactical-trace-details-away")).getByRole(
        "button",
        { name: /open pinch hitter manager moment details for casey custom/i },
      ),
    );

    let dialog = screen.getByRole("dialog", { name: /manager moment details/i });
    expect(dialog).toHaveTextContent("Casey Custom / Away Club");
    expect(dialog).toHaveTextContent("Layer");
    expect(dialog).toHaveTextContent("Tactical");
    expect(dialog).toHaveTextContent("Type / Role");
    expect(dialog).toHaveTextContent("Pinch Hitter");
    expect(dialog).toHaveTextContent("Raw WPA");
    expect(dialog).toHaveTextContent("+18.4 pp");
    expect(dialog).toHaveTextContent("Share");
    expect(dialog).toHaveTextContent("100%");
    expect(dialog).toHaveTextContent("Cap");
    expect(dialog).toHaveTextContent("n/a");
    expect(dialog).toHaveTextContent("Final Manager Value");
    expect(dialog).toHaveTextContent("+18.4 pp");
    fireEvent.click(within(dialog).getByRole("button", { name: /close/i }));

    fireEvent.click(
      within(screen.getByTestId("manager-tactical-trace-details-away")).getByRole(
        "button",
        { name: /open pitching change manager moment details for casey custom/i },
      ),
    );
    dialog = screen.getByRole("dialog", { name: /manager moment details/i });
    expect(dialog).toHaveTextContent("Pending, waiting for linked outcome");
    expect(dialog).toHaveTextContent("Final Manager Value");
    expect(dialog).toHaveTextContent("Pending");
  });

  test("renders IBB component detail in the manager moment popup", async () => {
    mockGetCompletedGameById.mockResolvedValue(
      createCompletedGame([
        createManagerDecision({
          decisionId: "game-detail-1:ab-7:intentional_walk",
          decisionType: "intentional_walk",
          displayTitle: "Intentional walk",
          decisionEventId: "ab-7",
          linkedEventIds: ["ab-7", "ab-8", "ab-9"],
          teamWinProbabilityBefore: 0.55,
          teamWinProbabilityAfter: 0.43,
          rawWindowWpa: -0.12,
          managerShare: 1,
          managerWpa: -0.12,
          resolvedAtEventId: "ab-9",
          explanationMetadata: {
            intentionalWalk: {
              ibbEventId: "ab-7",
              walkedRunnerId: "walked-star",
              walkedRunnerName: "Walked Star",
              nextBatterEventId: "ab-8",
              nextBatterId: "next-batter",
              nextBatterName: "Next Batter",
              nextBatterResult: "GIDP",
              finalConsequenceEventId: "ab-9",
              finalConsequence: "stranded",
              inningEnded: true,
              wpaComponents: {
                beforeIbbTeamWinProbability: 0.55,
                afterIbbTeamWinProbability: 0.49,
                finalTeamWinProbability: 0.43,
                immediateRawWpa: -0.06,
                consequenceRawWpa: -0.06,
                netRawWpa: -0.12,
              },
            },
          },
        }),
      ]),
    );

    render(<GameDetail />);

    await screen.findByTestId("manager-wpa-overlay");
    fireEvent.click(
      screen.getByRole("button", {
        name: /open intentional walk manager moment details for casey custom/i,
      }),
    );

    const dialog = screen.getByRole("dialog", { name: /manager moment details/i });
    expect(dialog).toHaveTextContent("Scoped Components");
    expect(dialog).toHaveTextContent("Immediate IBB cost");
    expect(dialog).toHaveTextContent("-6.0 pp");
    expect(dialog).toHaveTextContent("Before IBB 55.0% WP -> after IBB 49.0% WP.");
    expect(dialog).toHaveTextContent("Consequence payoff");
    expect(dialog).toHaveTextContent("Next batter: GIDP");
    expect(dialog).toHaveTextContent("the walked runner was stranded");
    expect(dialog).toHaveTextContent("Official net");
  });

  test("renders runner-send counterfactual and unscored detail in the manager moment popup", async () => {
    mockGetCompletedGameById.mockResolvedValue(
      createCompletedGame([
        createManagerDecision({
          decisionId: "game-detail-1:ab-8:out_advancing_send",
          decisionType: "out_advancing_send",
          displayTitle: "Out-advancing send",
          decisionEventId: "ab-8",
          linkedEventIds: ["ab-8"],
          teamWinProbabilityBefore: 0.62,
          teamWinProbabilityAfter: 0.55,
          rawWindowWpa: -0.07,
          managerShare: 0.35,
          managerWpa: -0.0245,
          resolvedAtEventId: "ab-8",
          explanationMetadata: {
            outAdvancingSend: {
              runnerId: "runner-second",
              runnerName: "Runner Second",
              fromBase: "second",
              actualToBase: "out",
              inferredHoldBase: "third",
              holdBaseSource: "runner_from_second_safe_stop_third",
              actualTeamWinProbability: 0.55,
              counterfactualTeamWinProbability: 0.62,
              rawCounterfactualWpa: -0.07,
              actualState: {
                outs: 2,
                awayScore: 4,
                homeScore: 4,
                bases: { first: true, second: false, third: false },
              },
              counterfactualState: {
                outs: 1,
                awayScore: 4,
                homeScore: 4,
                bases: { first: true, second: false, third: true },
              },
            },
          },
        }),
        createManagerDecision({
          decisionId: "game-detail-1:ab-9:out_advancing_send_unscored",
          decisionType: "out_advancing_send",
          displayTitle: "Out-advancing send unavailable",
          decisionEventId: "ab-9",
          linkedEventIds: ["ab-9"],
          teamWinProbabilityBefore: 0.52,
          teamWinProbabilityAfter: undefined,
          rawWindowWpa: undefined,
          managerWpa: undefined,
          managerShare: 0.35,
          resolved: false,
          resolvedAtEventId: undefined,
          explanationMetadata: {
            outAdvancingSend: {
              runnerId: "runner-first",
              runnerName: "Runner First",
              fromBase: "first",
              actualToBase: "out",
              unscoredReason: "missing_hit_context",
            },
          },
        }),
      ]),
    );

    render(<GameDetail />);

    await screen.findByTestId("manager-wpa-overlay");
    fireEvent.click(
      screen.getByRole("button", {
        name: /open out-advancing send manager moment details for casey custom/i,
      }),
    );

    let dialog = screen.getByRole("dialog", { name: /manager moment details/i });
    expect(dialog).toHaveTextContent("Compared with holding at 3B");
    expect(dialog).toHaveTextContent("Actual after-state");
    expect(dialog).toHaveTextContent("55.0% WP");
    expect(dialog).toHaveTextContent("Counterfactual hold/stop state");
    expect(dialog).toHaveTextContent("62.0% WP");
    expect(dialog).toHaveTextContent("Raw counterfactual WPA");
    expect(dialog).toHaveTextContent("-7.0 pp");
    expect(dialog).toHaveTextContent("Inferred hold base");
    fireEvent.click(within(dialog).getByRole("button", { name: /close/i }));

    fireEvent.click(
      screen.getByRole("button", {
        name: /open out-advancing send unavailable manager moment details for casey custom/i,
      }),
    );
    dialog = screen.getByRole("dialog", { name: /manager moment details/i });
    expect(dialog).toHaveTextContent("Runner send not scored");
    expect(dialog).toHaveTextContent("Unscored runner-send reason");
    expect(dialog).toHaveTextContent(
      "Counterfactual unavailable: the hit context was not enough to infer a safe hold base.",
    );
    expect(dialog).toHaveTextContent("Pending");
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
            deploymentRole: "kept_position_player_in",
            playerId: "bench-one",
            playerName: "Bench One",
            sourceEventId: "bp-1",
            openedAtEventIndex: 1,
            tacticalExclusionEventIds: ["ab-1"],
            closedAtEventId: "ab-2",
            closedAtEventIndex: 2,
            closeReason: "game_end",
            linkedEventIds: ["ab-2"],
            linkedOutcomes: [
              {
                eventId: "ab-2",
                source: "at_bat",
                role: "batting",
                rawWpa: 0.05,
                weight: 1,
                weightedWpa: 0.05,
              },
              {
                eventId: "ab-2",
                source: "at_bat",
                role: "fielding",
                rawWpa: 0.04,
                weight: 0.75,
                weightedWpa: 0.03,
              },
            ],
            rawLinkedWpa: 0.08,
            managerShare: 0.15,
            managerDeploymentWpa: 0.012,
            cap: 0.15,
            confidence: "medium",
          },
        ],
      ),
    );

    render(<GameDetail />);

    await screen.findByTestId("manager-wpa-overlay");
    expect(screen.getByTestId("manager-wpa-total-away")).toHaveTextContent("+29.6 pp");
    expect(screen.getByTestId("manager-deployment-wpa-away")).toHaveTextContent("+1.2 pp");
    expect(screen.getByTestId("manager-lineup-delta-away")).toHaveTextContent("+10.0 pp");
    expect(screen.getByTestId("manager-value-away")).toHaveTextContent("+29.6 pp");
    expect(screen.getByTestId("manager-wpa-boundary-copy")).toHaveTextContent(
      "Player WPA remains player outcome credit",
    );
    expect(screen.getByTestId("manager-decision-quality-evidence-away")).toHaveTextContent(
      "Tactical Pinch hitter: +18.4 pp",
    );
    expect(screen.getByTestId("manager-decision-quality-evidence-away")).toHaveTextContent(
      "Deployment Kept position player in: +1.2 pp",
    );
    expect(screen.getByTestId("manager-lineup-delta-evidence-away")).toHaveTextContent(
      "Slot 1 SS Player One vs optimal Slot 4 CF Bench One",
    );
    expect(screen.getByTestId("manager-lineup-delta-evidence-away")).toHaveTextContent(
      "actual +40.0 pp, expected +3.2 pp, delta +36.8 pp, manager +10.0 pp",
    );
    expect(screen.getByTestId("manager-lineup-delta-evidence-away")).toHaveTextContent(
      "separate from player WPA",
    );
    expect(screen.getByTestId("manager-lineup-delta-details-away")).toHaveTextContent(
      "Lineup Delta: chose #1 SS Player One instead of optimal #4 CF Bench One; actual value was compared to the optimal projection.",
    );
    const deploymentDetails = screen.getByTestId("manager-deployment-stint-details-away");
    expect(deploymentDetails).toHaveTextContent(
      "Kept Bench One in after the prompt; later batting 100%, fielding 75% outcomes carry deployment weights.",
    );
    fireEvent.click(
      within(deploymentDetails).getByRole("button", {
        name: /open kept position player in manager moment details for casey custom/i,
      }),
    );
    let dialog = screen.getByRole("dialog", { name: /manager moment details/i });
    expect(dialog).toHaveTextContent("Deployment");
    expect(dialog).toHaveTextContent("Kept Position Player In");
    expect(dialog).toHaveTextContent("Raw WPA");
    expect(dialog).toHaveTextContent("+8.0 pp");
    expect(dialog).toHaveTextContent("Share");
    expect(dialog).toHaveTextContent("15%");
    expect(dialog).toHaveTextContent("Cap");
    expect(dialog).toHaveTextContent("+/-0.150");
    expect(dialog).toHaveTextContent("Final Manager Value");
    expect(dialog).toHaveTextContent("+1.2 pp");
    expect(dialog).toHaveTextContent("Linked Events");
    expect(dialog).toHaveTextContent("ab-2");
    expect(dialog).toHaveTextContent("ab-2 Batting 100% raw +5.0 pp, weighted +5.0 pp");
    expect(dialog).toHaveTextContent("ab-2 Fielding 75% raw +4.0 pp, weighted +3.0 pp");
    fireEvent.click(within(dialog).getByRole("button", { name: /close/i }));

    fireEvent.click(
      within(screen.getByTestId("manager-lineup-delta-details-away")).getByRole(
        "button",
        { name: /open lineup delta manager moment details for casey custom/i },
      ),
    );
    dialog = screen.getByRole("dialog", { name: /manager moment details/i });
    expect(dialog).toHaveTextContent(
      "Lineup Delta: chose #1 SS Player One instead of optimal #4 CF Bench One; actual value was compared to the optimal projection.",
    );
    expect(dialog).toHaveTextContent("Lineup Delta");
    expect(dialog).toHaveTextContent("Lineup Construction");
    expect(dialog).toHaveTextContent("Raw WPA");
    expect(dialog).toHaveTextContent("+36.8 pp");
    expect(dialog).toHaveTextContent("Share");
    expect(dialog).toHaveTextContent("25%");
    expect(dialog).toHaveTextContent("Final Manager Value");
    expect(dialog).toHaveTextContent("+10.0 pp");
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
    expect(screen.getByTestId("manager-deployment-wpa-away")).toHaveTextContent("+0.0 pp");
    expect(screen.getByTestId("manager-wpa-total-away")).toHaveTextContent("+0.0 pp");
    const deploymentDetails = screen.getByTestId("manager-deployment-stint-details-away");
    expect(deploymentDetails).toHaveTextContent("Active, excluded from resolved total");
    fireEvent.click(
      within(deploymentDetails).getByRole("button", {
        name: /open pitcher manager moment details for casey custom/i,
      }),
    );
    const dialog = screen.getByRole("dialog", { name: /manager moment details/i });
    expect(dialog).toHaveTextContent("Active, excluded from resolved total");
    expect(dialog).toHaveTextContent("Final Manager Value");
    expect(dialog).toHaveTextContent("Active");
    expect(dialog).toHaveTextContent("Linked Events");
    expect(dialog).toHaveTextContent("ab-6");
    expect(dialog).toHaveTextContent("No weighted outcomes linked.");
  });

  test("shows legacy defensive alignment records as non-scoring compatibility notes", async () => {
    mockGetCompletedGameById.mockResolvedValue(
      createCompletedGame([
        createManagerDecision({
          decisionId: "game-detail-1:bp-align:defensive_alignment",
          decisionType: "defensive_alignment",
          displayTitle: "Defensive alignment",
          decisionEventId: "bp-align",
          linkedEventIds: ["bp-align", "ab-field"],
          managerWpa: 0.4,
          rawWindowWpa: 0.4,
          managerShare: 0.1,
          resolved: true,
          resolvedAtEventId: "ab-field",
        }),
      ]),
    );

    render(<GameDetail />);

    await screen.findByTestId("manager-wpa-overlay");
    expect(screen.getByTestId("manager-wpa-total-away")).toHaveTextContent("+0.0 pp");
    expect(screen.getByTestId("manager-value-away")).toHaveTextContent("+0.0 pp");
    expect(within(screen.getByTestId("manager-wpa-card-away")).getByText("0")).toBeInTheDocument();
    const traceDetails = screen.getByTestId("manager-tactical-trace-details-away");
    expect(traceDetails).toHaveTextContent(
      "Legacy defensive alignment note only; no Manager Value scoring.",
    );
    expect(traceDetails).toHaveTextContent("Non-scoring compatibility row");
    fireEvent.click(
      within(traceDetails).getByRole("button", {
        name: /open defensive alignment manager moment details for casey custom/i,
      }),
    );
    const dialog = screen.getByRole("dialog", { name: /manager moment details/i });
    expect(dialog).toHaveTextContent("Non-scoring compatibility row");
    expect(dialog).toHaveTextContent("Final Manager Value");
    expect(dialog).toHaveTextContent("Non-scoring");
    expect(dialog).toHaveTextContent("Cap");
    expect(dialog).toHaveTextContent("n/a");
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
    expect(within(leaderboardSection as HTMLElement).getByText("+30.0 pp")).toBeInTheDocument();
    expect(within(leaderboardSection as HTMLElement).queryByText("+9.999")).not.toBeInTheDocument();
  });

  test("renders archived player and manager WPA totals from completed franchise games", async () => {
    mockGetCompletedGameById.mockResolvedValue({
      ...createCompletedGame([
        createManagerDecision({
          managerWpa: 0.184,
          rawWindowWpa: 0.184,
        }),
      ]),
      competitionType: "franchise",
      competitionId: "franchise-alpha",
      franchiseId: "franchise-alpha",
      playerWpaTotals: [
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
          managingWpa: 0,
        },
      ],
      managerWpaTotals: [
        {
          managerId: "away-manager",
          managerName: "Casey Custom",
          teamId: "away",
          tacticalManagerWpa: 0.184,
          deploymentWpa: 0,
          lineupDeltaWpa: -0.025,
          managerValue: 0.159,
        },
      ],
    } satisfies CompletedGameRecord);

    render(<GameDetail />);

    const archivedTitle = await screen.findByText("Archived WPA Totals");
    const archivedSection = archivedTitle.closest("section");
    expect(archivedSection).not.toBeNull();
    expect(within(archivedSection as HTMLElement).getByText("Player One")).toBeInTheDocument();
    expect(within(archivedSection as HTMLElement).getByText("+30.0 pp")).toBeInTheDocument();
    expect(within(archivedSection as HTMLElement).getByText("Casey Custom")).toBeInTheDocument();
    expect(within(archivedSection as HTMLElement).getByText("+15.9 pp")).toBeInTheDocument();
    expect(within(archivedSection as HTMLElement).getByText(/LI and clutch details remain/i)).toBeInTheDocument();
  });

  test("shows compact WPA blocker when an archive has no stored WPA totals", async () => {
    mockGetCompletedGameById.mockResolvedValue({
      ...createCompletedGame(),
      playerWpaTotals: [],
      managerWpaTotals: [],
    });

    render(<GameDetail />);

    const archivedTitle = await screen.findByText("Archived WPA Totals");
    const archivedSection = archivedTitle.closest("section");
    expect(archivedSection).not.toBeNull();
    expect(within(archivedSection as HTMLElement).getByText(
      "WPA unavailable for score-only/manual-result games or older archives without stored WPA totals.",
    )).toBeInTheDocument();
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
    expect(screen.getByTestId("manager-wpa-total-away")).toHaveTextContent("+0.0 pp");
    expect(screen.getByTestId("manager-wpa-total-home")).toHaveTextContent("+0.0 pp");
    expect(screen.getByTestId("manager-decision-quality-evidence-away")).toHaveTextContent(
      "Decision quality unavailable for older archives, score-only/manual-result games",
    );
    expect(screen.getByTestId("manager-lineup-delta-evidence-away")).toHaveTextContent(
      "Lineup delta unavailable for older archives, score-only/manual-result games",
    );
    expect(screen.getByTestId("manager-lineup-delta-empty-away")).toHaveTextContent("No lineup deviations");
  });
});
