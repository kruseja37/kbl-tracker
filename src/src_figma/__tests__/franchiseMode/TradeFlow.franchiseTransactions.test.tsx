import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  mockUseOffseasonData: vi.fn(),
  mockUseOffseasonState: vi.fn(),
  mockGetAllFranchiseTeams: vi.fn(),
  mockGetAllFranchisePlayers: vi.fn(),
  mockGetFranchiseFarmRecordsForSeason: vi.fn(),
  mockGetTransactionsByFranchiseSeason: vi.fn(),
  mockCallUpFranchisePlayer: vi.fn(),
  mockSendDownFranchisePlayer: vi.fn(),
  mockExecuteManualFranchiseTrade: vi.fn(),
  mockRunFranchiseTradeDryRun: vi.fn(),
  mockSaveTeamRoster: vi.fn(),
  mockSavePlayer: vi.fn(),
  mockTransferPlayer: vi.fn(),
}));

vi.mock("@/hooks/useOffseasonData", () => ({
  useOffseasonData: mocks.mockUseOffseasonData,
}));

vi.mock("../../hooks/useOffseasonState", () => ({
  useOffseasonState: mocks.mockUseOffseasonState,
}));

vi.mock("../../../utils/franchisePlayerStorage", () => ({
  getAllFranchiseTeams: mocks.mockGetAllFranchiseTeams,
  getAllFranchisePlayers: mocks.mockGetAllFranchisePlayers,
}));

vi.mock("../../../utils/franchiseFarmStorage", () => ({
  getFranchiseFarmRecordsForSeason: mocks.mockGetFranchiseFarmRecordsForSeason,
}));

vi.mock("../../../utils/transactionStorage", () => ({
  getTransactionsByFranchiseSeason: mocks.mockGetTransactionsByFranchiseSeason,
}));

vi.mock("../../../utils/franchiseRosterMovement", () => ({
  callUpFranchisePlayer: mocks.mockCallUpFranchisePlayer,
  sendDownFranchisePlayer: mocks.mockSendDownFranchisePlayer,
}));

vi.mock("../../../utils/franchiseTradeAdapter", () => ({
  FRANCHISE_TRADE_CALCULATION_VERSION: "franchise-trades-v1-fit-preview-dry-run",
  executeManualFranchiseTrade: mocks.mockExecuteManualFranchiseTrade,
  runFranchiseTradeDryRun: mocks.mockRunFranchiseTradeDryRun,
}));

vi.mock("../../../utils/leagueBuilderStorage", () => ({
  saveTeamRoster: mocks.mockSaveTeamRoster,
  savePlayer: mocks.mockSavePlayer,
  transferPlayer: mocks.mockTransferPlayer,
}));

import { TradeFlow } from "../../app/components/TradeFlow";

const teams = [
  { id: "team-a", name: "Alpha", leagueIds: ["league-a"] },
  { id: "team-b", name: "Beta", leagueIds: ["league-a"] },
];

const players = [
  {
    id: "active-a",
    firstName: "Active",
    lastName: "Alpha",
    primaryPosition: "SS",
    overallGrade: "B",
    leagueAssignments: [{ leagueId: "league-a", teamId: "team-a", rosterStatus: "MLB" }],
  },
  {
    id: "farm-a",
    firstName: "Farm",
    lastName: "Alpha",
    primaryPosition: "SP",
    overallGrade: "C",
    leagueAssignments: [{ leagueId: "league-a", teamId: "team-a", rosterStatus: "FARM" }],
  },
  {
    id: "active-b",
    firstName: "Active",
    lastName: "Beta",
    primaryPosition: "RP",
    overallGrade: "B",
    leagueAssignments: [{ leagueId: "league-a", teamId: "team-b", rosterStatus: "MLB" }],
  },
];

function transaction(overrides: Record<string, unknown>) {
  return {
    id: "txn-default",
    timestamp: "2026-05-27T12:00:00.000Z",
    season: 3,
    gameNumber: null,
    phase: "REGULAR_SEASON",
    franchiseId: "franchise-a",
    seasonId: "franchise-a-season-3",
    statsScopeId: "franchise-a-season-3",
    type: "call_up",
    actor: "USER",
    data: {},
    previousState: null,
    undone: false,
    undoneAt: null,
    undoneBy: null,
    ...overrides,
  };
}

async function renderFranchiseTradeFlow() {
  render(
    <TradeFlow
      franchiseId="franchise-a"
      seasonId="franchise-a-season-3"
      seasonNumber={3}
    />,
  );
  await screen.findByText(/Regular-Season Roster Desk/i);
}

function playerButtonByText(text: string, index = 0): HTMLButtonElement {
  const button = screen.getAllByText(text)[index]?.closest("button");
  if (!(button instanceof HTMLButtonElement)) {
    throw new Error(`Could not find player button for ${text} at index ${index}`);
  }
  return button;
}

describe("TradeFlow franchise regular-season transactions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mockUseOffseasonData.mockReturnValue({
      teams: [],
      players: [],
      hasRealData: false,
      isLoading: false,
    });
    mocks.mockUseOffseasonState.mockReturnValue({
      addNewTrade: vi.fn(),
      trades: [],
    });
    mocks.mockGetAllFranchiseTeams.mockResolvedValue(teams);
    mocks.mockGetAllFranchisePlayers.mockResolvedValue(players);
    mocks.mockGetFranchiseFarmRecordsForSeason.mockResolvedValue([
      {
        id: "franchise-a:franchise-a-season-3:team-a:farm-a",
        franchiseId: "franchise-a",
        seasonId: "franchise-a-season-3",
        seasonNumber: 3,
        teamId: "team-a",
        playerId: "farm-a",
        rosterLevel: "AAA",
        rosterStatus: "FARM",
        optionsUsed: 1,
        optionDates: [],
        ratingRevealState: "hidden",
        assignedAt: "2026-05-27T00:00:00.000Z",
        lastModified: "2026-05-27T00:00:00.000Z",
      },
    ]);
    mocks.mockGetTransactionsByFranchiseSeason.mockResolvedValue([]);
    mocks.mockCallUpFranchisePlayer.mockResolvedValue({ success: true, transactionId: "txn-call-up" });
    mocks.mockSendDownFranchisePlayer.mockResolvedValue({ success: true, transactionId: "txn-send-down" });
    mocks.mockExecuteManualFranchiseTrade.mockResolvedValue({
      success: true,
      dryRun: false,
      data: { executedTrade: { transactionId: "txn-trade" } },
      message: "Manual franchise trade executed.",
    });
    mocks.mockRunFranchiseTradeDryRun.mockResolvedValue({
      success: true,
      dryRun: true,
      issues: [],
      data: {
        calculationVersion: "franchise-trades-v1-fit-preview-dry-run",
        method: "dry-run",
        teamReports: [],
        fitPreviews: [],
        limitations: ["No transactions, trade state, League Builder data, or franchise offseason state are written."],
      },
    });
  });

  test("call-up UI executes durable call-up with regular-season scoped transaction context", async () => {
    const user = userEvent.setup();
    await renderFranchiseTradeFlow();

    const selects = screen.getAllByRole("combobox");
    await waitFor(() => expect((selects[1] as HTMLSelectElement).options.length).toBeGreaterThan(1));
    await user.selectOptions(selects[1], "farm-a");
    await user.click(screen.getByRole("button", { name: /^CALL UP$/i }));

    await waitFor(() => expect(mocks.mockCallUpFranchisePlayer).toHaveBeenCalledWith(
      expect.objectContaining({
        franchiseId: "franchise-a",
        seasonId: "franchise-a-season-3",
        statsScopeId: "franchise-a-season-3",
        seasonNumber: 3,
        teamId: "team-a",
        playerId: "farm-a",
        leagueId: "league-a",
        actor: "USER",
        rosterMovementPhase: "REGULAR_SEASON",
      }),
    ));
    expect(await screen.findByText(/Call-up logged as txn-call-up/i)).toBeInTheDocument();
    expect(mocks.mockRunFranchiseTradeDryRun).not.toHaveBeenCalled();
    expect(mocks.mockSaveTeamRoster).not.toHaveBeenCalled();
    expect(mocks.mockSavePlayer).not.toHaveBeenCalled();
  });

  test("send-down UI executes durable send-down and reports storage failures", async () => {
    const user = userEvent.setup();
    mocks.mockSendDownFranchisePlayer.mockResolvedValueOnce({
      success: false,
      errorCode: "OPTION_LIMIT_EXCEEDED",
      errorMessage: "Player has already used every option.",
    });
    await renderFranchiseTradeFlow();

    const selects = screen.getAllByRole("combobox");
    await waitFor(() => expect((selects[2] as HTMLSelectElement).options.length).toBeGreaterThan(1));
    await user.selectOptions(selects[2], "active-a");
    await user.click(screen.getByRole("button", { name: /^SEND DOWN$/i }));

    await waitFor(() => expect(mocks.mockSendDownFranchisePlayer).toHaveBeenCalledWith(
      expect.objectContaining({
        playerId: "active-a",
        rosterLevel: "AAA",
        rosterMovementPhase: "REGULAR_SEASON",
      }),
    ));
    expect(await screen.findByText(/OPTION_LIMIT_EXCEEDED: Player has already used every option/i)).toBeInTheDocument();
    expect(mocks.mockExecuteManualFranchiseTrade).not.toHaveBeenCalled();
    expect(mocks.mockTransferPlayer).not.toHaveBeenCalled();
  });

  test("manual trade UI executes explicit manual trade instead of dry-run preview", async () => {
    await renderFranchiseTradeFlow();

    fireEvent.click(screen.getByRole("button", { name: /MANUAL TRADE/i }));
    await screen.findByText("Active Alpha");
    fireEvent.click(playerButtonByText("Active Alpha", 0));
    fireEvent.click(playerButtonByText("Active Beta", 0));
    fireEvent.click(screen.getByRole("button", { name: /EXECUTE MANUAL TRADE/i }));

    await waitFor(() => expect(mocks.mockExecuteManualFranchiseTrade).toHaveBeenCalledWith(
      expect.objectContaining({
        franchiseId: "franchise-a",
        seasonId: "franchise-a-season-3",
        statsScopeId: "franchise-a-season-3",
        seasonNumber: 3,
        dryRun: false,
      }),
      {
        transactionPhase: "REGULAR_SEASON",
        requestedTrade: {
          sourceTeamId: "team-a",
          targetTeamId: "team-b",
          outgoingPlayerIds: ["active-a"],
          incomingPlayerIds: ["active-b"],
        },
      },
    ));
    expect(await screen.findByText(/Manual trade logged as txn-trade/i)).toBeInTheDocument();
    expect(mocks.mockRunFranchiseTradeDryRun).not.toHaveBeenCalled();
    expect(mocks.mockSaveTeamRoster).not.toHaveBeenCalled();
  });

  test("manual trade validation fails before writes when teams are invalid", async () => {
    const user = userEvent.setup();
    await renderFranchiseTradeFlow();

    await user.click(screen.getByRole("button", { name: /MANUAL TRADE/i }));
    const selects = screen.getAllByRole("combobox");
    await user.selectOptions(selects[1], "team-a");
    await waitFor(() => expect(screen.getAllByText("Active Alpha").length).toBeGreaterThanOrEqual(2));
    await user.click(playerButtonByText("Active Alpha", 0));
    await user.click(playerButtonByText("Farm Alpha", 1));
    await user.click(screen.getByRole("button", { name: /EXECUTE MANUAL TRADE/i }));

    expect(await screen.findByText(/Select two different teams before executing a manual trade/i)).toBeInTheDocument();
    expect(mocks.mockExecuteManualFranchiseTrade).not.toHaveBeenCalled();
    expect(mocks.mockSaveTeamRoster).not.toHaveBeenCalled();
    expect(mocks.mockSavePlayer).not.toHaveBeenCalled();
  });

  test("transaction history is franchise season and stats-scope filtered", async () => {
    mocks.mockGetTransactionsByFranchiseSeason.mockResolvedValue([
      transaction({
        id: "txn-visible",
        type: "send_down",
        data: {
          playerId: "active-a",
          playerName: "Active Alpha",
          sourceTeamId: "team-a",
          targetTeamId: "team-a",
          sourceRosterStatus: "MLB",
          targetRosterStatus: "FARM",
        },
      }),
      transaction({
        id: "txn-cross-franchise",
        franchiseId: "franchise-b",
        data: { playerName: "Cross Franchise" },
      }),
      transaction({
        id: "txn-orphan",
        franchiseId: undefined,
        data: { playerName: "Orphan Row" },
      }),
      transaction({
        id: "txn-wrong-stats-scope",
        statsScopeId: "other-scope",
        data: { playerName: "Wrong Scope" },
      }),
    ]);

    await renderFranchiseTradeFlow();
    fireEvent.click(screen.getByRole("button", { name: /^HISTORY$/i }));

    expect(await screen.findByText(/SEND DOWN/i)).toBeInTheDocument();
    expect(screen.getByText(/Active Alpha \(active-a\)/i)).toBeInTheDocument();
    expect(screen.getByText(/team-a -> team-a/i)).toBeInTheDocument();
    expect(screen.getByText(/MLB -> FARM/i)).toBeInTheDocument();
    expect(screen.queryByText(/Cross Franchise/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Orphan Row/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Wrong Scope/i)).not.toBeInTheDocument();
  });

  test("dry-run trade preview remains read-only", async () => {
    await renderFranchiseTradeFlow();

    fireEvent.click(screen.getByRole("button", { name: /FIT PREVIEW/i }));

    expect(await screen.findByText(/Trade Fit Preview/i)).toBeInTheDocument();
    await waitFor(() => expect(mocks.mockRunFranchiseTradeDryRun).toHaveBeenCalledWith(
      expect.objectContaining({
        franchiseId: "franchise-a",
        seasonId: "franchise-a-season-3",
        statsScopeId: "franchise-a-season-3",
        seasonNumber: 3,
        dryRun: true,
      }),
      { dryRun: true },
    ));
    expect(mocks.mockExecuteManualFranchiseTrade).not.toHaveBeenCalled();
    expect(mocks.mockCallUpFranchisePlayer).not.toHaveBeenCalled();
    expect(mocks.mockSendDownFranchisePlayer).not.toHaveBeenCalled();
    expect(mocks.mockSaveTeamRoster).not.toHaveBeenCalled();
  });

  test("missing canonical season id blocks roster desk before reads or writes", () => {
    render(
      <TradeFlow
        franchiseId="franchise-a"
        seasonId=""
        seasonNumber={3}
      />,
    );

    expect(screen.getByText(/MISSING_SEASON_ID/i)).toBeInTheDocument();
    expect(screen.getByText(/no roster moves, trades, previews, or history reads were started/i)).toBeInTheDocument();
    expect(mocks.mockGetAllFranchiseTeams).not.toHaveBeenCalled();
    expect(mocks.mockGetAllFranchisePlayers).not.toHaveBeenCalled();
    expect(mocks.mockGetTransactionsByFranchiseSeason).not.toHaveBeenCalled();
    expect(mocks.mockCallUpFranchisePlayer).not.toHaveBeenCalled();
    expect(mocks.mockSendDownFranchisePlayer).not.toHaveBeenCalled();
    expect(mocks.mockExecuteManualFranchiseTrade).not.toHaveBeenCalled();
  });
});
