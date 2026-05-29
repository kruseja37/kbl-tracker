import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  mockSaveRetirementDecisions: vi.fn().mockResolvedValue(undefined),
  mockSaveRatingChanges: vi.fn().mockResolvedValue(undefined),
  mockSaveFreeAgentSignings: vi.fn().mockResolvedValue(undefined),
  mockSaveDraft: vi.fn().mockResolvedValue(undefined),
  mockAddNewTrade: vi.fn().mockResolvedValue(undefined),
  mockTransferPlayer: vi.fn().mockResolvedValue(undefined),
  mockRetirePlayer: vi.fn().mockResolvedValue(undefined),
  mockSavePlayer: vi.fn().mockResolvedValue({ id: "saved-player" }),
  mockGetPlayer: vi.fn().mockResolvedValue(null),
  mockGetTeam: vi.fn().mockResolvedValue({ id: "team-a", leagueIds: ["league-a"] }),
  mockGetTeamRoster: vi.fn().mockResolvedValue({ teamId: "team-a", mlbRoster: [], farmRoster: [] }),
  mockSaveTeamRoster: vi.fn().mockResolvedValue(undefined),
  mockGetAllManagerSeasonStatsForSeason: vi.fn().mockResolvedValue([]),
  mockGetActiveFranchise: vi.fn().mockResolvedValue("franchise-a"),
  mockLoadFranchise: vi.fn().mockResolvedValue({ controlledTeamName: "Alpha" }),
  mockRunFranchiseRatingsSalaryRecalculation: vi.fn(),
  mockRunFranchiseRetirementDryRun: vi.fn(),
  mockRevealFranchiseRetirementForTeam: vi.fn(),
  mockGetFranchiseFarmRecordsForSeason: vi.fn(),
  mockGetAllFranchiseTeams: vi.fn(),
  mockGetAllFranchisePlayers: vi.fn(),
  mockGetTransactionsByFranchiseSeason: vi.fn(),
  mockRunFranchiseFreeAgencyDryRun: vi.fn(),
  mockRunFranchiseDraftDryRun: vi.fn(),
  mockRunFranchiseTradeDryRun: vi.fn(),
  mockExecuteManualFranchiseTrade: vi.fn(),
  mockCallUpFranchisePlayer: vi.fn(),
  mockSendDownFranchisePlayer: vi.fn(),
  mockUseOffseasonData: vi.fn(),
  mockUseLeagueBuilderData: vi.fn(),
  mockUseOffseasonState: vi.fn(),
}));

const team = {
  id: "team-a",
  name: "Alpha",
  shortName: "ALP",
  stadium: "Alpha Park",
  record: { wins: 40, losses: 20 },
  primaryColor: "#123456",
  secondaryColor: "#abcdef",
};

const players = [
  {
    id: "player-a",
    name: "Alpha One",
    position: "SS",
    grade: "B",
    personality: "JOLLY",
    salary: 4,
    teamId: "team-a",
    age: 28,
    seasons: 5,
    war: 4,
    jerseyNumber: 1,
    awards: [],
    careerStats: "",
    power: 60,
    contact: 60,
    speed: 60,
    fielding: 60,
    arm: 60,
  },
  {
    id: "player-b",
    name: "Alpha Two",
    position: "CF",
    grade: "C+",
    personality: "JOLLY",
    salary: 2,
    teamId: "team-a",
    age: 39,
    seasons: 14,
    war: 30,
    jerseyNumber: 2,
    awards: [],
    careerStats: "",
    power: 50,
    contact: 50,
    speed: 50,
    fielding: 50,
    arm: 50,
  },
];

vi.mock("@/hooks/useOffseasonData", () => ({
  useOffseasonData: mocks.mockUseOffseasonData,
}));

vi.mock("@/hooks/useLeagueBuilderData", () => ({
  useLeagueBuilderData: mocks.mockUseLeagueBuilderData,
}));

vi.mock("../../hooks/useOffseasonState", () => ({
  useOffseasonState: mocks.mockUseOffseasonState,
}));

vi.mock("../../../utils/leagueBuilderStorage", () => ({
  getAllPlayers: vi.fn(() => []),
  transferPlayer: mocks.mockTransferPlayer,
  retirePlayer: mocks.mockRetirePlayer,
  savePlayer: mocks.mockSavePlayer,
  getPlayer: mocks.mockGetPlayer,
  getTeam: mocks.mockGetTeam,
  getTeamRoster: mocks.mockGetTeamRoster,
  saveTeamRoster: mocks.mockSaveTeamRoster,
}));

vi.mock("../../../utils/managerStorage", () => ({
  getAllManagerSeasonStatsForSeason: mocks.mockGetAllManagerSeasonStatsForSeason,
}));

vi.mock("../../../utils/franchiseManager", () => ({
  getActiveFranchise: mocks.mockGetActiveFranchise,
  loadFranchise: mocks.mockLoadFranchise,
}));

vi.mock("../../../utils/franchiseRatingsSalaryAdapter", () => ({
  FRANCHISE_RATINGS_SALARY_CALCULATION_VERSION: "franchise-ratings-salary-v1-grade-salary-only",
  runFranchiseRatingsSalaryRecalculation: mocks.mockRunFranchiseRatingsSalaryRecalculation,
}));

vi.mock("../../../utils/franchiseRetirementAdapter", () => ({
  FRANCHISE_RETIREMENT_CALCULATION_VERSION: "franchise-retirement-v1-age-risk-dry-run",
  FRANCHISE_RETIREMENT_APPLY_VERSION: "franchise-retirement-v1-selected-player-apply",
  runFranchiseRetirementDryRun: mocks.mockRunFranchiseRetirementDryRun,
}));

vi.mock("../../../utils/franchiseRetirementCeremony", () => ({
  FRANCHISE_RETIREMENT_CEREMONY_VERSION: "franchise-retirement-ceremony-v1-reverse-age-roll",
  revealFranchiseRetirementForTeam: mocks.mockRevealFranchiseRetirementForTeam,
}));

vi.mock("../../../utils/franchiseFarmStorage", () => ({
  getFranchiseFarmRecordsForSeason: mocks.mockGetFranchiseFarmRecordsForSeason,
}));

vi.mock("../../../utils/franchisePlayerStorage", () => ({
  getAllFranchiseTeams: mocks.mockGetAllFranchiseTeams,
  getAllFranchisePlayers: mocks.mockGetAllFranchisePlayers,
}));

vi.mock("../../../utils/transactionStorage", () => ({
  getTransactionsByFranchiseSeason: mocks.mockGetTransactionsByFranchiseSeason,
}));

vi.mock("../../../utils/franchiseRosterMovement", () => ({
  callUpFranchisePlayer: mocks.mockCallUpFranchisePlayer,
  sendDownFranchisePlayer: mocks.mockSendDownFranchisePlayer,
}));

vi.mock("../../../utils/franchiseFreeAgencyAdapter", () => ({
  FRANCHISE_FREE_AGENCY_CALCULATION_VERSION: "franchise-free-agency-v1-dice-board-dry-run",
  runFranchiseFreeAgencyDryRun: mocks.mockRunFranchiseFreeAgencyDryRun,
}));

vi.mock("../../../utils/franchiseDraftAdapter", () => ({
  FRANCHISE_DRAFT_CALCULATION_VERSION: "franchise-draft-v1-roster-readiness-dry-run",
  runFranchiseDraftDryRun: mocks.mockRunFranchiseDraftDryRun,
}));

vi.mock("../../../utils/franchiseTradeAdapter", () => ({
  FRANCHISE_TRADE_CALCULATION_VERSION: "franchise-trades-v1-fit-preview-dry-run",
  runFranchiseTradeDryRun: mocks.mockRunFranchiseTradeDryRun,
  executeManualFranchiseTrade: mocks.mockExecuteManualFranchiseTrade,
}));

import { FreeAgencyFlow } from "../../app/components/FreeAgencyFlow";
import { RetirementFlow } from "../../app/components/RetirementFlow";
import { RatingsAdjustmentFlow } from "../../app/components/RatingsAdjustmentFlow";
import { DraftFlow } from "../../app/components/DraftFlow";
import { TradeFlow } from "../../app/components/TradeFlow";
import { ContractionExpansionFlow } from "../../app/components/ContractionExpansionFlow";
import { FinalizeAdvanceFlow } from "../../app/components/FinalizeAdvanceFlow";

function makeRatingsAdapterResult(overrides: Record<string, any> = {}) {
  return {
    success: true,
    dryRun: true,
    context: {
      franchiseId: "franchise-a",
      seasonId: "franchise-a-season-3",
      seasonNumber: 3,
      offseasonStateId: "offseason-franchise-a-season-3",
      phase: "RATINGS_ADJUSTMENTS",
    },
    issues: [
      {
        code: "TRANSITION_ATTENTION_REQUIRED",
        severity: "warning",
        message: "Pending transition journal needs review.",
        details: { journalId: "journal-pending" },
      },
    ],
    data: {
      calculationVersion: "franchise-ratings-salary-v1-grade-salary-only",
      method: "Recalculate overallGrade from current app rating weights and salary from salaryCalculator; raw ratings are unchanged.",
      changedPlayerIds: ["player-a"],
      appliedPlayerIds: [],
      rollbackStatus: "not_needed",
      proposals: [
        {
          playerId: "player-a",
          changed: true,
          before: {
            playerId: "player-a",
            firstName: "Alpha",
            lastName: "One",
            primaryPosition: "SS",
            overallGrade: "C",
            salary: 1.2,
            ratings: { power: 60, contact: 60, speed: 60, fielding: 60, arm: 60 },
          },
          after: {
            playerId: "player-a",
            firstName: "Alpha",
            lastName: "One",
            primaryPosition: "SS",
            overallGrade: "B",
            salary: 3.4,
            ratings: { power: 60, contact: 60, speed: 60, fielding: 60, arm: 60 },
          },
          changes: {
            overallGrade: { before: "C", after: "B" },
            salary: { before: 1.2, after: 3.4 },
          },
        },
      ],
    },
    message: "Dry-run ratings/salary recalculation completed without writes.",
    ...overrides,
  };
}

function makeRetirementAdapterResult(overrides: Record<string, any> = {}) {
  return {
    success: true,
    dryRun: true,
    context: {
      franchiseId: "franchise-a",
      seasonId: "franchise-a-season-3",
      seasonNumber: 3,
      offseasonStateId: "offseason-franchise-a-season-3",
      phase: "RETIREMENTS",
    },
    issues: [
      {
        code: "TRANSITION_ATTENTION_REQUIRED",
        severity: "warning",
        message: "Pending transition journal needs review.",
        details: { journalId: "journal-pending" },
      },
    ],
    data: {
      calculationVersion: "franchise-retirement-v1-age-risk-dry-run",
      method: "Dry-run only: age-based v1 retirement risk curve adapted from the existing prototype flow.",
      candidatePlayerIds: ["player-b"],
      candidates: [
        {
          playerId: "player-b",
          playerName: "Alpha Two",
          teamId: "team-a",
          rosterStatus: "MLB",
          age: 39,
          seasons: 14,
          salary: 2,
          overallGrade: "C+",
          probabilityScore: 35,
          probabilityBand: "high",
          trustLevel: "high",
          evidence: [
            "Age 39 maps to the v1 prototype retirement probability curve.",
            "Roster status: MLB.",
          ],
          limitations: [
            "No morale, injury, contract, or narrative retirement modifiers are active yet.",
          ],
        },
      ],
      limitations: [
        "No retirement decisions are finalized by this adapter.",
        "No players are removed, retired, or written.",
        "No transactions are logged.",
        "This is not a full retirement probability model with morale, injuries, contract state, or narrative systems.",
      ],
    },
    message: "Retirement dry-run completed without writes.",
    ...overrides,
  };
}

function makeRetirementApplyResult(overrides: Record<string, any> = {}) {
  return {
    success: true,
    dryRun: false,
    context: {
      franchiseId: "franchise-a",
      seasonId: "franchise-a-season-3",
      statsScopeId: "franchise-a-season-3",
      seasonNumber: 3,
      offseasonStateId: "offseason-franchise-a-season-3",
      phase: "RETIREMENTS",
    },
    issues: [
      {
        code: "TRANSITION_ATTENTION_REQUIRED",
        severity: "warning",
        message: "Pending transition journal needs review.",
        details: { journalId: "journal-pending" },
      },
    ],
    data: {
      calculationVersion: "franchise-retirement-v1-selected-player-apply",
      method: "Selected-player apply: retire only explicitly selected eligible franchise-owned MLB/FARM players.",
      candidates: [],
      candidatePlayerIds: [],
      limitations: [
        "Only explicitly selected franchise-owned MLB/FARM players are retired.",
        "Rollback is compensating best-effort restoration, not true cross-store atomicity.",
      ],
      retiredPlayers: [
        {
          playerId: "player-b",
          playerName: "Alpha Two",
          retiredFromTeamId: "team-a",
          previousRosterStatus: "MLB",
          transactionId: "txn-retirement",
          farmRecordRemoved: false,
        },
      ],
      retiredPlayerIds: ["player-b"],
      skippedPlayerIds: [],
      rollbackStatus: "applied",
    },
    message: "Selected franchise retirements applied.",
    ...overrides,
  };
}

function makeCeremonyRevealResult(overrides: Record<string, any> = {}) {
  const candidate = {
    playerId: "player-b",
    playerName: "Alpha Two",
    teamId: "team-a",
    age: 39,
    rosterStatus: "MLB",
    ageRank: 0,
    probability: 50,
    evidence: [
      "Oldest eligible player in reverse-age ceremony order.",
      "Roster status: MLB.",
    ],
  };

  return {
    methodVersion: "franchise-retirement-ceremony-v1-reverse-age-roll",
    valid: true,
    issues: [],
    warnings: [],
    limitations: [
      "Pure preview only: no writes, no persistence, no transactions, and no auto-apply.",
      "No jersey retirement, narrative/news, milestone, or replacement-player effects are active.",
    ],
    teamId: "team-a",
    revealIndex: 0,
    candidatePoolHash: "pool-hash-alpha",
    seedHash: "seed-hash-alpha",
    roll: 12.34,
    revealBucket: {
      type: "retiree",
      playerId: "player-b",
      start: 0,
      end: 50,
      weight: 50,
    },
    candidates: [candidate],
    buckets: [
      {
        type: "retiree",
        playerId: "player-b",
        start: 0,
        end: 50,
        weight: 50,
      },
      {
        type: "no_retirement",
        start: 50,
        end: 100,
        weight: 50,
      },
    ],
    outcome: {
      type: "retiree",
      playerId: "player-b",
      candidate,
    },
    selectedPlayerIds: ["player-b"],
    ...overrides,
  };
}

function makeFreeAgencyAdapterResult(overrides: Record<string, any> = {}) {
  return {
    success: false,
    dryRun: true,
    context: {
      franchiseId: "franchise-a",
      seasonId: "franchise-a-season-3",
      seasonNumber: 3,
      offseasonStateId: "offseason-franchise-a-season-3",
      phase: "FREE_AGENCY",
    },
    issues: [
      {
        code: "TRANSITION_ATTENTION_REQUIRED",
        severity: "warning",
        message: "Pending transition journal needs review.",
        details: { journalId: "journal-pending" },
      },
      {
        code: "PROTECTED_PLAYER_STATUS_INVALID",
        severity: "error",
        message: "Protected player player-farm is not on the MLB active roster for team team-a.",
        teamId: "team-a",
        playerId: "player-farm",
      },
    ],
    data: {
      calculationVersion: "franchise-free-agency-v1-dice-board-dry-run",
      method: "Dry-run only: spec-inspired top-11 team dice-board exposure preview.",
      candidatePlayerIds: ["player-a"],
      teamPreviews: [
        {
          teamId: "team-a",
          eligiblePlayerCount: 2,
          protectedPlayerId: "player-farm",
          diceBoardPlayerIds: ["player-a", "player-b"],
        },
      ],
      candidates: [
        {
          playerId: "player-a",
          playerName: "Alpha One",
          teamId: "team-a",
          rosterStatus: "MLB",
          age: 28,
          salary: 4,
          overallGrade: "B",
          personality: "JOLLY",
          diceValue: 7,
          probabilityScore: 16.67,
          probabilityBand: "high",
          trustLevel: "medium",
          finalFreeAgencyModelDeferred: true,
          evidence: [
            "Spec dice board value 7 carries 16.67% departure-roll probability.",
            "Roster status: MLB.",
          ],
          limitations: [
            "Final destination selection, dice execution, player exchange, and movement are deferred.",
            "Personality destination rules are recognized but not executed in this dry-run.",
          ],
        },
      ],
      limitations: [
        "No free-agent decisions are finalized by this adapter.",
        "No players are released, moved, exchanged, signed, retired, or written.",
        "No transactions are logged.",
        "Destination selection, dice-roll ceremony execution, return-player exchange, morale, contract, and narrative systems are deferred.",
      ],
    },
    message: "Free-agency dry-run validation failed.",
    ...overrides,
  };
}

function makeDraftAdapterResult(overrides: Record<string, any> = {}) {
  return {
    success: true,
    dryRun: true,
    context: {
      franchiseId: "franchise-a",
      seasonId: "franchise-a-season-3",
      seasonNumber: 3,
      offseasonStateId: "offseason-franchise-a-season-3",
      phase: "DRAFT",
    },
    issues: [
      {
        code: "TRANSITION_ATTENTION_REQUIRED",
        severity: "warning",
        message: "Pending transition journal needs review.",
        details: { journalId: "journal-pending" },
      },
    ],
    data: {
      calculationVersion: "franchise-draft-v1-roster-readiness-dry-run",
      method: "Dry-run only: franchise-owned roster/farm readiness preview for draft planning; no draft class, picks, replacements, signings, releases, or roster writes are executed.",
      teamIds: ["team-a"],
      draftClassPreviewUnavailable: true,
      teamReports: [
        {
          teamId: "team-a",
          teamName: "Alpha",
          mlbCount: 20,
          farmCount: 8,
          totalCount: 28,
          mlbVacancies: 2,
          farmVacancies: 2,
          farmOverage: 0,
          totalVacancies: 4,
          positionNeeds: [
            {
              role: "Relief pitching depth",
              currentCount: 2,
              targetCount: 4,
              source: "COMBINED",
              severity: "medium",
            },
          ],
          draftUrgency: "medium",
          trustLevel: "high",
          evidence: [
            "MLB roster count: 20/22.",
            "Farm record count: 8/10.",
            "This team would need 2 draft/farm additions to reach 10 farm players.",
          ],
          limitations: [
            "Draft class generation, pick execution, player replacement, and roster mutation are deferred.",
          ],
          draftClassPreviewUnavailable: true,
        },
      ],
      limitations: [
        "No draft decisions are finalized by this adapter.",
        "No prospects are generated or persisted.",
        "No players are drafted, released, signed, replaced, retired, or written.",
        "No transactions are logged.",
        "Draft class generation, pick execution, replacement rules, and post-draft salary recalculation are deferred.",
      ],
    },
    message: "Draft dry-run completed without writes.",
    ...overrides,
  };
}

function makeTradeAdapterResult(overrides: Record<string, any> = {}) {
  return {
    success: true,
    dryRun: true,
    context: {
      franchiseId: "franchise-a",
      seasonId: "franchise-a-season-3",
      statsScopeId: "franchise-a-season-3",
      seasonNumber: 3,
      offseasonStateId: "offseason-franchise-a-season-3",
      phase: "TRADES",
    },
    issues: [
      {
        code: "TRANSITION_ATTENTION_REQUIRED",
        severity: "warning",
        message: "Pending transition journal needs review.",
        details: { journalId: "journal-pending" },
      },
    ],
    data: {
      calculationVersion: "franchise-trades-v1-fit-preview-dry-run",
      method: "Dry-run only: franchise-owned roster/farm trade-fit preview; no trade AI, acceptance, execution, player movement, transactions, morale/chemistry, injuries, or salary-cap enforcement are performed.",
      teamReports: [
        {
          teamId: "team-a",
          teamName: "Alpha",
          mlbCount: 20,
          farmCount: 8,
          needs: [
            {
              role: "Relief pitching depth",
              currentCount: 2,
              targetCount: 4,
              gap: 2,
              surplus: 0,
              severity: "medium",
            },
          ],
          surpluses: [
            {
              role: "Middle infield depth",
              currentCount: 5,
              targetCount: 3,
              gap: 0,
              surplus: 2,
              severity: "low",
            },
          ],
          eligibleTradePlayerIds: ["player-a"],
          riskLevel: "medium",
          trustLevel: "medium",
          evidence: [
            "Eligible MLB players: 20.",
            "Franchise farm records: 8.",
            "Detected 1 roster needs and 1 roster surplus areas.",
          ],
          limitations: [
            "Trade AI, final acceptance, roster movement, transactions, morale/chemistry effects, injuries, and salary enforcement are deferred.",
          ],
        },
        {
          teamId: "team-b",
          teamName: "Beta",
          mlbCount: 21,
          farmCount: 10,
          needs: [],
          surpluses: [],
          eligibleTradePlayerIds: ["player-b"],
          riskLevel: "low",
          trustLevel: "high",
          evidence: [
            "Eligible MLB players: 21.",
            "Franchise farm records: 10.",
            "Detected 0 roster needs and 0 roster surplus areas.",
          ],
          limitations: [
            "Trade AI, final acceptance, roster movement, transactions, morale/chemistry effects, injuries, and salary enforcement are deferred.",
          ],
        },
      ],
      fitPreviews: [
        {
          id: "trade-fit-team-a-team-b-middle-infield-depth",
          sourceTeamId: "team-a",
          sourceTeamName: "Alpha",
          targetTeamId: "team-b",
          targetTeamName: "Beta",
          role: "Middle infield depth",
          sourceSurplus: 2,
          targetGap: 1,
          candidatePlayerIds: ["player-a"],
          riskLevel: "medium",
          trustLevel: "medium",
          evidence: [
            "Alpha has 2 surplus in Middle infield depth.",
            "Beta has a 1 player gap in Middle infield depth.",
            "This is a non-executable trade-fit preview only.",
          ],
          limitations: [
            "No trade AI, acceptance, movement, transaction, salary, morale, chemistry, or injury logic is executed.",
          ],
          nonExecutable: true,
        },
      ],
      limitations: [
        "No trade execution is implemented by this adapter.",
        "No players are moved and no roster or farm records are changed.",
        "No transactions, trade state, League Builder data, or franchise offseason state are written.",
        "Trade AI, final acceptance logic, chemistry, morale, injuries, and salary-cap enforcement are deferred.",
        "All fit previews are non-executable advisory previews.",
      ],
    },
    message: "Trade dry-run completed without writes.",
    ...overrides,
  };
}

async function clickRetirementCeremonyReveal(teamId = "team-a") {
  fireEvent.click(await screen.findByRole("button", { name: new RegExp(`Reveal ceremony for ${teamId}`, "i") }));
}

describe("franchise offseason prototype mutation guards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(window, "alert").mockImplementation(() => undefined);
    mocks.mockUseOffseasonData.mockReturnValue({
      teams: [team],
      players,
      hasRealData: true,
      isLoading: false,
      error: null,
      getTeamById: (teamId: string) => (teamId === team.id ? team : undefined),
      getPlayerById: (playerId: string) => players.find((player) => player.id === playerId),
      getTeamRoster: (teamId: string) => players.filter((player) => player.teamId === teamId),
      retirementCandidates: [],
      getRetirementProbability: () => 0,
      freeAgents: [],
      refresh: vi.fn().mockResolvedValue(undefined),
    });
    mocks.mockUseLeagueBuilderData.mockReturnValue({
      leagues: [{ id: "league-a", name: "League A" }],
      teams: [{ id: "team-a", leagueIds: ["league-a"] }],
      players: [],
      rulesPresets: [],
      isLoading: false,
      error: null,
      refresh: vi.fn().mockResolvedValue(undefined),
    });
    mocks.mockUseOffseasonState.mockReturnValue({
      saveRetirementDecisions: mocks.mockSaveRetirementDecisions,
      saveRatingChanges: mocks.mockSaveRatingChanges,
      saveFreeAgentSignings: mocks.mockSaveFreeAgentSignings,
      saveDraft: mocks.mockSaveDraft,
      addNewTrade: mocks.mockAddNewTrade,
      trades: [],
      completeCurrentPhase: vi.fn().mockResolvedValue(undefined),
    });
    mocks.mockRunFranchiseRatingsSalaryRecalculation.mockResolvedValue(makeRatingsAdapterResult());
    mocks.mockRunFranchiseRetirementDryRun.mockResolvedValue(makeRetirementAdapterResult());
    mocks.mockRevealFranchiseRetirementForTeam.mockReturnValue(makeCeremonyRevealResult());
    mocks.mockGetFranchiseFarmRecordsForSeason.mockResolvedValue([]);
    mocks.mockGetAllFranchiseTeams.mockResolvedValue([
      { id: "team-a", name: "Alpha", leagueIds: ["league-a"] },
      { id: "team-b", name: "Beta", leagueIds: ["league-a"] },
    ]);
    mocks.mockGetAllFranchisePlayers.mockResolvedValue([
      {
        id: "player-a",
        firstName: "Alpha",
        lastName: "One",
        primaryPosition: "SS",
        overallGrade: "B",
        leagueAssignments: [{ leagueId: "league-a", teamId: "team-a", rosterStatus: "MLB" }],
      },
      {
        id: "player-b",
        firstName: "Beta",
        lastName: "Two",
        primaryPosition: "RP",
        overallGrade: "C",
        leagueAssignments: [{ leagueId: "league-a", teamId: "team-b", rosterStatus: "MLB" }],
      },
    ]);
    mocks.mockGetTransactionsByFranchiseSeason.mockResolvedValue([]);
    mocks.mockExecuteManualFranchiseTrade.mockResolvedValue({
      success: true,
      dryRun: false,
      data: { executedTrade: { transactionId: "txn-manual" } },
    });
    mocks.mockCallUpFranchisePlayer.mockResolvedValue({ success: true, transactionId: "txn-call-up" });
    mocks.mockSendDownFranchisePlayer.mockResolvedValue({ success: true, transactionId: "txn-send-down" });
    mocks.mockRunFranchiseFreeAgencyDryRun.mockResolvedValue(makeFreeAgencyAdapterResult());
    mocks.mockRunFranchiseDraftDryRun.mockResolvedValue(makeDraftAdapterResult());
    mocks.mockRunFranchiseTradeDryRun.mockResolvedValue(makeTradeAdapterResult());
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  test("FreeAgencyFlow renders franchise dry-run candidates without free-agency mutation controls", async () => {
    render(
      <FreeAgencyFlow
        franchiseId="franchise-a"
        seasonId="franchise-a-season-3"
        seasonNumber={3}
        onClose={vi.fn()}
      />,
    );

    expect(await screen.findByText(/Preview only, no free-agency commit/i)).toBeInTheDocument();
    expect(screen.getByText(/franchise-free-agency-v1-dice-board-dry-run/i)).toBeInTheDocument();
    expect(screen.getByText(/No players are released, moved, exchanged, signed, or written/i)).toBeInTheDocument();
    expect(screen.getByText(/no dice rolls are executed/i)).toBeInTheDocument();
    expect(screen.getByText(/no destination is selected/i)).toBeInTheDocument();
    expect(screen.getByText(/no player exchange is selected/i)).toBeInTheDocument();
    expect(screen.getByText(/Final free-agency ceremony and exchange model remains deferred/i)).toBeInTheDocument();
    expect(screen.getByText(/No transactions are written/i)).toBeInTheDocument();
    expect(screen.getByText(/Free-agency dry-run validation failed/i)).toBeInTheDocument();
    expect(screen.getByText(/TRANSITION_ATTENTION_REQUIRED/i)).toBeInTheDocument();
    expect(screen.getByText(/PROTECTED_PLAYER_STATUS_INVALID/i)).toBeInTheDocument();
    expect(screen.getByText(/Alpha One/i)).toBeInTheDocument();
    expect(screen.getAllByText(/HIGH/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/16.67% risk/i)).toBeInTheDocument();
    expect(screen.getAllByText(/team-a/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/No free-agent decisions are finalized by this adapter/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /CONFIRM PROTECTION/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /ROLL DICE/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /SEE DESTINATION/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /SAVE & CONTINUE/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /CONFIRM EXCHANGE/i })).not.toBeInTheDocument();
    expect(mocks.mockRunFranchiseFreeAgencyDryRun).toHaveBeenCalledWith(
      {
        franchiseId: "franchise-a",
        seasonId: "franchise-a-season-3",
        seasonNumber: 3,
        offseasonStateId: "offseason-franchise-a-season-3",
        phase: "FREE_AGENCY",
        dryRun: true,
      },
      { dryRun: true },
    );
    expect(mocks.mockUseOffseasonData).not.toHaveBeenCalled();
    expect(mocks.mockUseLeagueBuilderData).not.toHaveBeenCalled();
    expect(mocks.mockUseOffseasonState).not.toHaveBeenCalled();
    expect(mocks.mockSaveFreeAgentSignings).not.toHaveBeenCalled();
    expect(mocks.mockTransferPlayer).not.toHaveBeenCalled();
    expect(mocks.mockRetirePlayer).not.toHaveBeenCalled();
  });

  test("RetirementFlow renders franchise preview first with explicit selected-player controls", async () => {
    render(
      <RetirementFlow
        franchiseId="franchise-a"
        seasonId="franchise-a-season-3"
        seasonNumber={3}
        onClose={vi.fn()}
      />,
    );

    expect(await screen.findByText(/Preview first, explicit retirement confirmation required/i)).toBeInTheDocument();
    expect(screen.getByText(/franchise-retirement-v1-age-risk-dry-run/i)).toBeInTheDocument();
    expect(screen.getByText(/No players are retired unless selected and explicitly confirmed/i)).toBeInTheDocument();
    expect(screen.getByText(/not the final reverse-age\/team-roll retirement model/i)).toBeInTheDocument();
    expect(screen.getByText(/narrative\/news, milestones, jersey retirement, and replacement-player systems are not active/i)).toBeInTheDocument();
    expect(await screen.findByText(/Alpha Two/i)).toBeInTheDocument();
    expect(screen.getAllByText(/HIGH/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/35% risk/i)).toBeInTheDocument();
    expect(screen.getByText(/TRANSITION_ATTENTION_REQUIRED/i)).toBeInTheDocument();
    expect(screen.getByText(/No retirement decisions are finalized by this adapter/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Select$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Review selected retirements/i })).toBeDisabled();
    expect(screen.queryByRole("button", { name: /REVEAL RETIREMENT/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /SAVE & CONTINUE TO FREE AGENCY/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /RETIRE JERSEY/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Apply selected retirements/i })).not.toBeInTheDocument();
    expect(mocks.mockRunFranchiseRetirementDryRun).toHaveBeenCalledWith(
      {
        franchiseId: "franchise-a",
        seasonId: "franchise-a-season-3",
        statsScopeId: "franchise-a-season-3",
        seasonNumber: 3,
        offseasonStateId: "offseason-franchise-a-season-3",
        phase: "RETIREMENTS",
        dryRun: true,
      },
      { dryRun: true },
    );
    expect(mocks.mockUseOffseasonData).not.toHaveBeenCalled();
    expect(mocks.mockUseOffseasonState).not.toHaveBeenCalled();
    expect(mocks.mockSaveRetirementDecisions).not.toHaveBeenCalled();
    expect(mocks.mockRetirePlayer).not.toHaveBeenCalled();
  });

  test("RetirementFlow renders no-write ceremony preview and locally stages suggested retiree", async () => {
    render(
      <RetirementFlow
        franchiseId="franchise-a"
        seasonId="franchise-a-season-3"
        seasonNumber={3}
        onClose={vi.fn()}
      />,
    );

    expect(await screen.findByText(/Retirement ceremony preview/i)).toBeInTheDocument();
    expect(screen.getByText(/franchise-retirement-ceremony-v1-reverse-age-roll/i)).toBeInTheDocument();
    expect(screen.getByText(/no-write preview: no players are retired, no transactions are written/i)).toBeInTheDocument();
    expect(screen.getByText(/Confirmation\/apply integration is deferred/i)).toBeInTheDocument();
    expect(screen.getByText(/No reroll, jersey retirement, narrative\/news, milestone, or replacement-player effects/i)).toBeInTheDocument();

    await clickRetirementCeremonyReveal();

    expect(mocks.mockRevealFranchiseRetirementForTeam).toHaveBeenCalledWith(
      expect.objectContaining({
        context: expect.objectContaining({
          franchiseId: "franchise-a",
          seasonId: "franchise-a-season-3",
          seasonNumber: 3,
          statsScopeId: "franchise-a-season-3",
          offseasonStateId: "offseason-franchise-a-season-3",
          phase: "RETIREMENTS",
          seedNamespace: "franchise-retirement-ceremony-preview",
        }),
        seed: "franchise-a:franchise-a-season-3:3:retirement-ceremony-preview",
        teamId: "team-a",
        revealIndex: 0,
        players: [
          expect.objectContaining({
            playerId: "player-b",
            displayName: "Alpha Two",
            rosterStatus: "MLB",
            teamId: "team-a",
          }),
        ],
        stagedRetireeIds: [],
      }),
    );
    expect(screen.getByText(/Ceremony reveal result/i)).toBeInTheDocument();
    expect(screen.getByText(/Staged suggestion: Alpha Two \(player-b\)/i)).toBeInTheDocument();
    expect(screen.getByText(/This player is not retired unless a future confirmation flow applies the result/i)).toBeInTheDocument();
    expect(screen.getByText(/Reveal roll:/i)).toBeInTheDocument();
    expect(screen.getByText(/12.34/i)).toBeInTheDocument();
    expect(screen.getByText(/Reveal bucket:/i)).toBeInTheDocument();
    expect(screen.getAllByText(/retiree/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/Candidate pool hash:/i)).toBeInTheDocument();
    expect(screen.getByText(/pool-hash-alpha/i)).toBeInTheDocument();
    expect(screen.getByText(/Seed hash:/i)).toBeInTheDocument();
    expect(screen.getByText(/seed-hash-alpha/i)).toBeInTheDocument();
    expect(screen.getByText(/Alpha Two · player-b · age 39 · rank 0 · 50%/i)).toBeInTheDocument();
    expect(screen.getByText(/Locally staged ceremony suggestion/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Use ceremony suggestion/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Apply selected retirements/i })).not.toBeInTheDocument();
    expect(mocks.mockRunFranchiseRetirementDryRun).toHaveBeenCalledTimes(1);
    expect(mocks.mockSaveRetirementDecisions).not.toHaveBeenCalled();
    expect(mocks.mockRetirePlayer).not.toHaveBeenCalled();
    expect(mocks.mockSavePlayer).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /Remove staged suggestion/i }));

    expect(screen.queryByText(/Locally staged ceremony suggestion/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Use ceremony suggestion/i })).not.toBeInTheDocument();
    expect(mocks.mockRunFranchiseRetirementDryRun).toHaveBeenCalledTimes(1);
    expect(mocks.mockSaveRetirementDecisions).not.toHaveBeenCalled();
    expect(mocks.mockRetirePlayer).not.toHaveBeenCalled();
    expect(mocks.mockSavePlayer).not.toHaveBeenCalled();
  });

  test("RetirementFlow routes ceremony suggestion through explicit selected-player confirmation", async () => {
    mocks.mockRunFranchiseRetirementDryRun
      .mockResolvedValueOnce(makeRetirementAdapterResult())
      .mockResolvedValueOnce(makeRetirementApplyResult())
      .mockResolvedValueOnce(makeRetirementAdapterResult({
        data: {
          ...makeRetirementAdapterResult().data,
          candidates: [],
          candidatePlayerIds: [],
        },
      }));

    render(
      <RetirementFlow
        franchiseId="franchise-a"
        seasonId="franchise-a-season-3"
        seasonNumber={3}
        onClose={vi.fn()}
      />,
    );

    await screen.findByText(/Retirement ceremony preview/i);
    await clickRetirementCeremonyReveal();

    expect(screen.getByText(/Staged suggestion: Alpha Two \(player-b\)/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Apply selected retirements/i })).not.toBeInTheDocument();
    expect(mocks.mockRunFranchiseRetirementDryRun).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: /Use ceremony suggestion/i }));

    expect(screen.getByText(/Confirm selected-player retirement/i)).toBeInTheDocument();
    expect(screen.getByText(/Alpha Two · MLB · player-b/i)).toBeInTheDocument();
    expect(screen.getByText(/moves the staged ceremony retiree into the existing selected-player confirmation flow/i)).toBeInTheDocument();
    expect(mocks.mockRunFranchiseRetirementDryRun).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: /Apply selected retirements/i }));

    expect(await screen.findByText(/Retired 1 selected franchise player/i)).toBeInTheDocument();
    expect(mocks.mockRunFranchiseRetirementDryRun).toHaveBeenNthCalledWith(
      2,
      {
        franchiseId: "franchise-a",
        seasonId: "franchise-a-season-3",
        statsScopeId: "franchise-a-season-3",
        seasonNumber: 3,
        offseasonStateId: "offseason-franchise-a-season-3",
        phase: "RETIREMENTS",
        dryRun: false,
      },
      {
        apply: true,
        playerIds: ["player-b"],
        selectedSource: "ceremony",
        ceremonyProvenance: expect.objectContaining({
          methodVersion: "franchise-retirement-ceremony-v1-reverse-age-roll",
          outcomeType: "retiree",
          revealIndex: 0,
          seedNamespace: "franchise-retirement-ceremony-preview",
          candidatePoolHash: "pool-hash-alpha",
          seedHash: "seed-hash-alpha",
          roll: 12.34,
          revealBucket: expect.objectContaining({
            type: "retiree",
            playerId: "player-b",
          }),
          candidateProbability: 50,
          selectedPlayerIds: ["player-b"],
        }),
      },
    );
    expect(mocks.mockRunFranchiseRetirementDryRun).toHaveBeenNthCalledWith(
      3,
      {
        franchiseId: "franchise-a",
        seasonId: "franchise-a-season-3",
        statsScopeId: "franchise-a-season-3",
        seasonNumber: 3,
        offseasonStateId: "offseason-franchise-a-season-3",
        phase: "RETIREMENTS",
        dryRun: true,
      },
      { dryRun: true },
    );
    expect(screen.queryByText(/Locally staged ceremony suggestion/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Use ceremony suggestion/i })).not.toBeInTheDocument();
    expect(mocks.mockSaveRetirementDecisions).not.toHaveBeenCalled();
    expect(mocks.mockRetirePlayer).not.toHaveBeenCalled();
    expect(mocks.mockSavePlayer).not.toHaveBeenCalled();
  });

  test("RetirementFlow loads scoped farm records for ceremony FARM candidates", async () => {
    const farmRecord = {
      id: "franchise-a:franchise-a-season-3:team-a:player-farm",
      franchiseId: "franchise-a",
      seasonId: "franchise-a-season-3",
      seasonNumber: 3,
      teamId: "team-a",
      playerId: "player-farm",
      rosterLevel: "AAA",
      rosterStatus: "FARM",
      optionsUsed: 1,
      optionDates: [],
      ratingRevealState: "hidden",
      assignedAt: "2026-01-01T00:00:00.000Z",
      lastModified: "2026-01-01T00:00:00.000Z",
    };
    mocks.mockGetFranchiseFarmRecordsForSeason.mockResolvedValue([farmRecord]);
    mocks.mockRunFranchiseRetirementDryRun.mockResolvedValue(makeRetirementAdapterResult({
      data: {
        ...makeRetirementAdapterResult().data,
        candidatePlayerIds: ["player-farm"],
        candidates: [
          {
            playerId: "player-farm",
            playerName: "Farm Risk",
            teamId: "team-a",
            rosterStatus: "FARM",
            age: 40,
            seasons: 12,
            salary: 1,
            overallGrade: "C",
            probabilityScore: 38,
            probabilityBand: "high",
            trustLevel: "medium",
            evidence: ["Roster status: FARM."],
            limitations: ["Farm record proof must come from scoped farm storage."],
          },
        ],
      },
    }));
    mocks.mockRevealFranchiseRetirementForTeam.mockReturnValue(makeCeremonyRevealResult({
      candidates: [
        {
          playerId: "player-farm",
          playerName: "Farm Risk",
          teamId: "team-a",
          age: 40,
          rosterStatus: "FARM",
          ageRank: 0,
          probability: 50,
          evidence: ["Roster status: FARM.", "Matching scoped franchise farm record supplied."],
        },
      ],
      revealBucket: {
        type: "retiree",
        playerId: "player-farm",
        start: 0,
        end: 50,
        weight: 50,
      },
      outcome: {
        type: "retiree",
        playerId: "player-farm",
        candidate: {
          playerId: "player-farm",
          playerName: "Farm Risk",
          teamId: "team-a",
          age: 40,
          rosterStatus: "FARM",
          ageRank: 0,
          probability: 50,
          evidence: ["Roster status: FARM.", "Matching scoped franchise farm record supplied."],
        },
      },
      selectedPlayerIds: ["player-farm"],
    }));

    render(
      <RetirementFlow
        franchiseId="franchise-a"
        seasonId="franchise-a-season-3"
        seasonNumber={3}
        onClose={vi.fn()}
      />,
    );

    await screen.findByText(/Farm Risk/i);
    await waitFor(() => {
      expect(mocks.mockGetFranchiseFarmRecordsForSeason).toHaveBeenCalledWith(
        "franchise-a",
        "franchise-a-season-3",
      );
    });
    await clickRetirementCeremonyReveal();

    const revealInput = mocks.mockRevealFranchiseRetirementForTeam.mock.calls[0][0];
    expect(revealInput.farmRecords).toEqual([
      expect.objectContaining({
        franchiseId: "franchise-a",
        seasonId: "franchise-a-season-3",
        seasonNumber: 3,
        teamId: "team-a",
        playerId: "player-farm",
        rosterStatus: "FARM",
      }),
    ]);
    expect(screen.getByText(/Staged suggestion: Farm Risk \(player-farm\)/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Use ceremony suggestion/i })).toBeInTheDocument();
    expect(mocks.mockRetirePlayer).not.toHaveBeenCalled();
    expect(mocks.mockSavePlayer).not.toHaveBeenCalled();
    expect(mocks.mockSaveRetirementDecisions).not.toHaveBeenCalled();
  });

  test("RetirementFlow does not fabricate farm-record proof for ceremony FARM candidates", async () => {
    mocks.mockRunFranchiseRetirementDryRun.mockResolvedValue(makeRetirementAdapterResult({
      data: {
        ...makeRetirementAdapterResult().data,
        candidatePlayerIds: ["player-farm"],
        candidates: [
          {
            playerId: "player-farm",
            playerName: "Farm Risk",
            teamId: "team-a",
            rosterStatus: "FARM",
            age: 40,
            seasons: 12,
            salary: 1,
            overallGrade: "C",
            probabilityScore: 38,
            probabilityBand: "high",
            trustLevel: "medium",
            evidence: ["Roster status: FARM."],
            limitations: ["Farm record proof must come from scoped farm storage."],
          },
        ],
      },
    }));
    mocks.mockRevealFranchiseRetirementForTeam.mockReturnValue(makeCeremonyRevealResult({
      valid: false,
      issues: [
        {
          code: "FARM_RECORD_MISSING",
          severity: "error",
          message: "FARM candidate requires a scoped franchise farm record before ceremony eligibility.",
          playerId: "player-farm",
          teamId: "team-a",
        },
      ],
      candidates: [],
      revealBucket: {
        type: "invalid",
        start: 0,
        end: 0,
        weight: 0,
      },
      outcome: {
        type: "no_retirement",
      },
      selectedPlayerIds: [],
    }));

    render(
      <RetirementFlow
        franchiseId="franchise-a"
        seasonId="franchise-a-season-3"
        seasonNumber={3}
        onClose={vi.fn()}
      />,
    );

    await screen.findByText(/Farm Risk/i);
    await clickRetirementCeremonyReveal();

    expect(mocks.mockRevealFranchiseRetirementForTeam).toHaveBeenCalledWith(
      expect.objectContaining({
        players: [
          expect.objectContaining({
            playerId: "player-farm",
            displayName: "Farm Risk",
            rosterStatus: "FARM",
            teamId: "team-a",
          }),
        ],
      }),
    );
    const revealInput = mocks.mockRevealFranchiseRetirementForTeam.mock.calls[0][0];
    expect(revealInput.farmRecords).toEqual([]);
    expect(screen.getByText(/FARM_RECORD_MISSING/i)).toBeInTheDocument();
    expect(screen.getByText(/FARM candidate requires a scoped franchise farm record/i)).toBeInTheDocument();
    expect(screen.queryByText(/Locally staged ceremony suggestion/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Use ceremony suggestion/i })).not.toBeInTheDocument();
    expect(mocks.mockRunFranchiseRetirementDryRun).toHaveBeenCalledTimes(1);
    expect(mocks.mockRetirePlayer).not.toHaveBeenCalled();
    expect(mocks.mockSavePlayer).not.toHaveBeenCalled();
    expect(mocks.mockSaveRetirementDecisions).not.toHaveBeenCalled();
  });

  test("RetirementFlow surfaces farm-record load failure without fabricating proof", async () => {
    mocks.mockGetFranchiseFarmRecordsForSeason.mockRejectedValue(new Error("indexeddb unavailable"));
    mocks.mockRunFranchiseRetirementDryRun.mockResolvedValue(makeRetirementAdapterResult({
      data: {
        ...makeRetirementAdapterResult().data,
        candidatePlayerIds: ["player-farm"],
        candidates: [
          {
            playerId: "player-farm",
            playerName: "Farm Risk",
            teamId: "team-a",
            rosterStatus: "FARM",
            age: 40,
            seasons: 12,
            salary: 1,
            overallGrade: "C",
            probabilityScore: 38,
            probabilityBand: "high",
            trustLevel: "medium",
            evidence: ["Roster status: FARM."],
            limitations: ["Farm record proof must come from scoped farm storage."],
          },
        ],
      },
    }));
    mocks.mockRevealFranchiseRetirementForTeam.mockReturnValue(makeCeremonyRevealResult({
      valid: true,
      issues: [
        {
          code: "FARM_RECORD_MISSING",
          severity: "warning",
          message: "FARM player player-farm is excluded because no matching scoped farm record was supplied.",
          playerId: "player-farm",
          teamId: "team-a",
        },
      ],
      candidates: [],
      revealBucket: {
        type: "no_retirement",
        start: 0,
        end: 100,
        weight: 100,
      },
      outcome: {
        type: "no_retirement",
      },
      selectedPlayerIds: [],
    }));

    render(
      <RetirementFlow
        franchiseId="franchise-a"
        seasonId="franchise-a-season-3"
        seasonNumber={3}
        onClose={vi.fn()}
      />,
    );

    await screen.findByText(/Farm Risk/i);
    expect(await screen.findByText(/FARM_RECORD_LOAD_FAILED/i)).toBeInTheDocument();
    expect(screen.getByText(/could not be loaded for retirement ceremony eligibility/i)).toBeInTheDocument();

    await clickRetirementCeremonyReveal();

    const revealInput = mocks.mockRevealFranchiseRetirementForTeam.mock.calls[0][0];
    expect(revealInput.farmRecords).toEqual([]);
    expect(screen.getByText(/FARM_RECORD_MISSING/i)).toBeInTheDocument();
    expect(screen.queryByText(/Locally staged ceremony suggestion/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Use ceremony suggestion/i })).not.toBeInTheDocument();
    expect(mocks.mockRunFranchiseRetirementDryRun).toHaveBeenCalledTimes(1);
    expect(mocks.mockRetirePlayer).not.toHaveBeenCalled();
    expect(mocks.mockSavePlayer).not.toHaveBeenCalled();
    expect(mocks.mockSaveRetirementDecisions).not.toHaveBeenCalled();
  });

  test("RetirementFlow renders no-retirement ceremony outcome without staged selected IDs", async () => {
    mocks.mockRevealFranchiseRetirementForTeam.mockReturnValue(makeCeremonyRevealResult({
      revealBucket: {
        type: "no_retirement",
        start: 50,
        end: 100,
        weight: 50,
      },
      outcome: {
        type: "no_retirement",
      },
      selectedPlayerIds: [],
    }));

    render(
      <RetirementFlow
        franchiseId="franchise-a"
        seasonId="franchise-a-season-3"
        seasonNumber={3}
        onClose={vi.fn()}
      />,
    );

    await screen.findByText(/Retirement ceremony preview/i);
    await clickRetirementCeremonyReveal();

    expect(screen.getByText(/No retirement was selected by this ceremony reveal/i)).toBeInTheDocument();
    expect(screen.getByText(/No selected player IDs were staged/i)).toBeInTheDocument();
    expect(screen.queryByText(/Locally staged ceremony suggestion/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Use ceremony suggestion/i })).not.toBeInTheDocument();
    expect(mocks.mockRunFranchiseRetirementDryRun).toHaveBeenCalledTimes(1);
    expect(mocks.mockRetirePlayer).not.toHaveBeenCalled();
    expect(mocks.mockSavePlayer).not.toHaveBeenCalled();
  });

  test("RetirementFlow renders invalid ceremony issues without staging a retiree", async () => {
    mocks.mockRevealFranchiseRetirementForTeam.mockReturnValue(makeCeremonyRevealResult({
      valid: false,
      issues: [
        {
          code: "MISSING_TEAM_ID",
          severity: "error",
          message: "Ceremony reveal requires a canonical teamId.",
          teamId: "",
        },
      ],
      revealBucket: {
        type: "invalid",
        start: 0,
        end: 0,
        weight: 0,
      },
      outcome: {
        type: "no_retirement",
      },
      selectedPlayerIds: [],
    }));

    render(
      <RetirementFlow
        franchiseId="franchise-a"
        seasonId="franchise-a-season-3"
        seasonNumber={3}
        onClose={vi.fn()}
      />,
    );

    await screen.findByText(/Retirement ceremony preview/i);
    await clickRetirementCeremonyReveal();

    expect(screen.getByText(/Ceremony issues and warnings/i)).toBeInTheDocument();
    expect(screen.getByText(/MISSING_TEAM_ID/i)).toBeInTheDocument();
    expect(screen.getByText(/Ceremony reveal requires a canonical teamId/i)).toBeInTheDocument();
    expect(screen.getByText(/No retirement was selected by this ceremony reveal/i)).toBeInTheDocument();
    expect(screen.queryByText(/Locally staged ceremony suggestion/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Use ceremony suggestion/i })).not.toBeInTheDocument();
    expect(mocks.mockRunFranchiseRetirementDryRun).toHaveBeenCalledTimes(1);
    expect(mocks.mockRetirePlayer).not.toHaveBeenCalled();
    expect(mocks.mockSavePlayer).not.toHaveBeenCalled();
  });

  test("RetirementFlow blocks franchise preview when seasonId is missing", () => {
    render(
      <RetirementFlow
        franchiseId="franchise-a"
        seasonNumber={3}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText(/RETIREMENT PREVIEW BLOCKED/i)).toBeInTheDocument();
    expect(screen.getByText(/Canonical franchise season context required/i)).toBeInTheDocument();
    expect(screen.getByText(/MISSING_SEASON_ID/i)).toBeInTheDocument();
    expect(screen.getByText(/No prototype fallback or fabricated season context is used/i)).toBeInTheDocument();
    expect(mocks.mockRunFranchiseRetirementDryRun).not.toHaveBeenCalled();
    expect(mocks.mockRevealFranchiseRetirementForTeam).not.toHaveBeenCalled();
    expect(mocks.mockGetFranchiseFarmRecordsForSeason).not.toHaveBeenCalled();
    expect(mocks.mockUseOffseasonData).not.toHaveBeenCalled();
    expect(mocks.mockUseOffseasonState).not.toHaveBeenCalled();
    expect(mocks.mockRetirePlayer).not.toHaveBeenCalled();
  });

  test.each([
    ["missing", undefined],
    ["invalid", 0],
  ])("RetirementFlow blocks franchise preview when seasonNumber is %s", (_label, seasonNumber) => {
    render(
      <RetirementFlow
        franchiseId="franchise-a"
        seasonId="franchise-a-season-3"
        seasonNumber={seasonNumber}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText(/RETIREMENT PREVIEW BLOCKED/i)).toBeInTheDocument();
    expect(screen.getByText(/Canonical franchise season context required/i)).toBeInTheDocument();
    expect(screen.getByText(/MISSING_SEASON_NUMBER/i)).toBeInTheDocument();
    expect(mocks.mockRunFranchiseRetirementDryRun).not.toHaveBeenCalled();
    expect(mocks.mockRevealFranchiseRetirementForTeam).not.toHaveBeenCalled();
    expect(mocks.mockGetFranchiseFarmRecordsForSeason).not.toHaveBeenCalled();
    expect(mocks.mockUseOffseasonData).not.toHaveBeenCalled();
    expect(mocks.mockUseOffseasonState).not.toHaveBeenCalled();
    expect(mocks.mockRetirePlayer).not.toHaveBeenCalled();
  });

  test("RetirementFlow applies selected franchise retirements only after explicit confirmation", async () => {
    mocks.mockRunFranchiseRetirementDryRun
      .mockResolvedValueOnce(makeRetirementAdapterResult())
      .mockResolvedValueOnce(makeRetirementApplyResult())
      .mockResolvedValueOnce(makeRetirementAdapterResult({
        data: {
          ...makeRetirementAdapterResult().data,
          candidates: [],
          candidatePlayerIds: [],
        },
      }));

    render(
      <RetirementFlow
        franchiseId="franchise-a"
        seasonId="franchise-a-season-3"
        seasonNumber={3}
        onClose={vi.fn()}
      />,
    );

    fireEvent.click(await screen.findByRole("button", { name: /^Select$/i }));

    expect(screen.getByRole("button", { name: /^Selected$/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Review selected retirements/i })).toBeEnabled();
    expect(screen.queryByRole("button", { name: /Apply selected retirements/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Review selected retirements/i }));

    expect(screen.getByText(/Confirm selected-player retirement/i)).toBeInTheDocument();
    expect(screen.getByText(/franchise-retirement-v1-selected-player-apply/i)).toBeInTheDocument();
    expect(screen.getByText(/Selected-player apply only/i)).toBeInTheDocument();
    expect(screen.getByText(/No random\/team-roll retirement ceremony is executed/i)).toBeInTheDocument();
    expect(screen.getByText(/No jersey retirement, narrative\/news, milestone side effects, or replacement-player generation/i)).toBeInTheDocument();
    expect(screen.getByText(/not true cross-store atomicity/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Apply selected retirements/i }));

    expect(await screen.findByText(/Retired 1 selected franchise player/i)).toBeInTheDocument();
    expect(screen.getByText(/Alpha Two · player-b · from MLB/i)).toBeInTheDocument();
    expect(screen.getByText(/Rollback status:/i)).toBeInTheDocument();
    expect(screen.getAllByText(/applied/i).length).toBeGreaterThanOrEqual(1);
    expect(mocks.mockRunFranchiseRetirementDryRun).toHaveBeenNthCalledWith(
      2,
      {
        franchiseId: "franchise-a",
        seasonId: "franchise-a-season-3",
        statsScopeId: "franchise-a-season-3",
        seasonNumber: 3,
        offseasonStateId: "offseason-franchise-a-season-3",
        phase: "RETIREMENTS",
        dryRun: false,
      },
      { apply: true, playerIds: ["player-b"], selectedSource: "manual" },
    );
    expect(mocks.mockRunFranchiseRetirementDryRun).toHaveBeenNthCalledWith(
      3,
      {
        franchiseId: "franchise-a",
        seasonId: "franchise-a-season-3",
        statsScopeId: "franchise-a-season-3",
        seasonNumber: 3,
        offseasonStateId: "offseason-franchise-a-season-3",
        phase: "RETIREMENTS",
        dryRun: true,
      },
      { dryRun: true },
    );
    expect(mocks.mockSaveRetirementDecisions).not.toHaveBeenCalled();
    expect(mocks.mockRetirePlayer).not.toHaveBeenCalled();
    expect(mocks.mockSavePlayer).not.toHaveBeenCalled();
  });

  test("RetirementFlow renders structured apply failures and rollback details", async () => {
    mocks.mockRunFranchiseRetirementDryRun
      .mockResolvedValueOnce(makeRetirementAdapterResult())
      .mockResolvedValueOnce(makeRetirementApplyResult({
        success: false,
        message: "Retirement apply failed and rollback needs repair.",
        errorCode: "PLAYER_ROLLBACK_FAILED",
        issues: [
          {
            code: "PLAYER_ROLLBACK_FAILED",
            severity: "error",
            message: "Franchise retirement failed and compensating rollback also failed.",
            playerId: "player-b",
          },
        ],
        data: {
          ...makeRetirementApplyResult().data,
          retiredPlayers: [],
          retiredPlayerIds: [],
          rollbackStatus: "rollback_failed",
          rollbackErrors: [{ playerId: "player-b", message: "restore failed" }],
        },
      }));

    render(
      <RetirementFlow
        franchiseId="franchise-a"
        seasonId="franchise-a-season-3"
        seasonNumber={3}
        onClose={vi.fn()}
      />,
    );

    fireEvent.click(await screen.findByRole("button", { name: /^Select$/i }));
    fireEvent.click(screen.getByRole("button", { name: /Review selected retirements/i }));
    fireEvent.click(screen.getByRole("button", { name: /Apply selected retirements/i }));

    expect(await screen.findByText(/Retirement apply failed and rollback needs repair/i)).toBeInTheDocument();
    expect(screen.getByText(/PLAYER_ROLLBACK_FAILED/i)).toBeInTheDocument();
    expect(screen.getAllByText(/rollback_failed/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/player-b: restore failed/i)).toBeInTheDocument();
    expect(mocks.mockRetirePlayer).not.toHaveBeenCalled();
    expect(mocks.mockSavePlayer).not.toHaveBeenCalled();
  });

  test("RatingsAdjustmentFlow renders franchise dry-run proposals without template writes", async () => {
    render(
      <RatingsAdjustmentFlow
        franchiseId="franchise-a"
        seasonId="franchise-a-season-3"
        onClose={vi.fn()}
      />,
    );

    expect(await screen.findByText(/Preview first, explicit commit required/i)).toBeInTheDocument();
    expect(screen.getByText(/franchise-ratings-salary-v1-grade-salary-only/i)).toBeInTheDocument();
    expect(screen.getByText(/raw ratings are not changed/i)).toBeInTheDocument();
    expect(screen.getByText(/not the full true-value or 50% salary-delta offseason model/i)).toBeInTheDocument();
    expect(screen.getByText(/changed players/i)).toBeInTheDocument();
    expect(screen.getByText(/Alpha One/i)).toBeInTheDocument();
    expect(screen.getByText(/TRANSITION_ATTENTION_REQUIRED/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Confirm grade\/salary update/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /CONTINUE TO RETIREMENTS/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /SAVE/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Apply confirmed grade\/salary update/i })).not.toBeInTheDocument();
    expect(mocks.mockRunFranchiseRatingsSalaryRecalculation).toHaveBeenCalledWith(
      {
        franchiseId: "franchise-a",
        seasonId: "franchise-a-season-3",
        seasonNumber: 3,
        offseasonStateId: "offseason-franchise-a-season-3",
        phase: "RATINGS_ADJUSTMENTS",
        dryRun: true,
      },
      { dryRun: true },
    );
    expect(mocks.mockSaveRatingChanges).not.toHaveBeenCalled();
    expect(mocks.mockGetPlayer).not.toHaveBeenCalled();
    expect(mocks.mockSavePlayer).not.toHaveBeenCalled();
  });

  test("RatingsAdjustmentFlow confirmation step appears before apply", async () => {
    render(
      <RatingsAdjustmentFlow
        franchiseId="franchise-a"
        seasonId="franchise-a-season-3"
        onClose={vi.fn()}
      />,
    );

    fireEvent.click(await screen.findByRole("button", { name: /Confirm grade\/salary update/i }));

    expect(screen.getAllByText(/^Confirm grade\/salary update$/i).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText(/apply the current adapter output to 1 franchise-owned players/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Raw ratings are not changed/i).length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText(/not the full true-value or 50% salary-delta offseason model/i).length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText(/TRANSITION_ATTENTION_REQUIRED/i).length).toBeGreaterThanOrEqual(2);
    expect(screen.getByRole("button", { name: /Apply confirmed grade\/salary update/i })).toBeInTheDocument();
    expect(mocks.mockRunFranchiseRatingsSalaryRecalculation).toHaveBeenCalledTimes(1);
    expect(mocks.mockSavePlayer).not.toHaveBeenCalled();
  });

  test("RatingsAdjustmentFlow applies only after confirmation and renders success", async () => {
    mocks.mockRunFranchiseRatingsSalaryRecalculation
      .mockResolvedValueOnce(makeRatingsAdapterResult())
      .mockResolvedValueOnce(makeRatingsAdapterResult({
        success: true,
        dryRun: false,
        data: {
          ...makeRatingsAdapterResult().data,
          appliedPlayerIds: ["player-a"],
          rollbackStatus: "not_needed",
        },
        message: "Ratings/salary recalculation applied to franchise-owned players.",
      }));

    render(
      <RatingsAdjustmentFlow
        franchiseId="franchise-a"
        seasonId="franchise-a-season-3"
        onClose={vi.fn()}
      />,
    );

    await screen.findByText(/Alpha One/i);
    fireEvent.click(await screen.findByRole("button", { name: /Confirm grade\/salary update/i }));
    fireEvent.click(screen.getByRole("button", { name: /Apply confirmed grade\/salary update/i }));

    expect(await screen.findByText(/Updated 1 franchise-owned players/i)).toBeInTheDocument();
    expect(mocks.mockRunFranchiseRatingsSalaryRecalculation).toHaveBeenNthCalledWith(
      2,
      {
        franchiseId: "franchise-a",
        seasonId: "franchise-a-season-3",
        seasonNumber: 3,
        offseasonStateId: "offseason-franchise-a-season-3",
        phase: "RATINGS_ADJUSTMENTS",
        dryRun: false,
      },
      { apply: true },
    );
    expect(screen.getAllByText(/TRANSITION_ATTENTION_REQUIRED/i).length).toBeGreaterThanOrEqual(2);
    expect(mocks.mockSaveRatingChanges).not.toHaveBeenCalled();
    expect(mocks.mockGetPlayer).not.toHaveBeenCalled();
    expect(mocks.mockSavePlayer).not.toHaveBeenCalled();
  });

  test("RatingsAdjustmentFlow renders structured apply failure errors", async () => {
    mocks.mockRunFranchiseRatingsSalaryRecalculation
      .mockResolvedValueOnce(makeRatingsAdapterResult())
      .mockResolvedValueOnce(makeRatingsAdapterResult({
        success: false,
        dryRun: false,
        message: "Ratings/salary recalculation failed and prior writes were restored.",
        errorCode: "PLAYER_WRITE_FAILED",
        issues: [
          {
            code: "PLAYER_WRITE_FAILED",
            severity: "error",
            message: "Failed to save a franchise-owned player during ratings/salary recalculation.",
            playerId: "player-a",
          },
        ],
        data: {
          ...makeRatingsAdapterResult().data,
          appliedPlayerIds: [],
          rollbackStatus: "rolled_back",
        },
      }));

    render(
      <RatingsAdjustmentFlow
        franchiseId="franchise-a"
        seasonId="franchise-a-season-3"
        onClose={vi.fn()}
      />,
    );

    await screen.findByText(/Alpha One/i);
    fireEvent.click(await screen.findByRole("button", { name: /Confirm grade\/salary update/i }));
    fireEvent.click(screen.getByRole("button", { name: /Apply confirmed grade\/salary update/i }));

    expect(await screen.findByText(/Ratings\/salary recalculation failed and prior writes were restored/i)).toBeInTheDocument();
    expect(screen.getByText(/PLAYER_WRITE_FAILED/i)).toBeInTheDocument();
    expect(screen.getByText(/Rollback status:/i)).toBeInTheDocument();
    expect(screen.getByText(/rolled_back/i)).toBeInTheDocument();
    expect(screen.getByText(/not true cross-store atomicity/i)).toBeInTheDocument();
    expect(mocks.mockSavePlayer).not.toHaveBeenCalled();
  });

  test("RatingsAdjustmentFlow renders rollback failure details", async () => {
    mocks.mockRunFranchiseRatingsSalaryRecalculation
      .mockResolvedValueOnce(makeRatingsAdapterResult())
      .mockResolvedValueOnce(makeRatingsAdapterResult({
        success: false,
        dryRun: false,
        message: "Ratings/salary recalculation failed and rollback needs repair.",
        errorCode: "PLAYER_ROLLBACK_FAILED",
        issues: [
          {
            code: "PLAYER_ROLLBACK_FAILED",
            severity: "error",
            message: "One or more franchise player rollback writes failed after ratings/salary recalculation aborted.",
          },
        ],
        data: {
          ...makeRatingsAdapterResult().data,
          appliedPlayerIds: ["player-a"],
          rollbackStatus: "rollback_failed",
          rollbackErrors: [{ playerId: "player-a", message: "rollback failed" }],
        },
      }));

    render(
      <RatingsAdjustmentFlow
        franchiseId="franchise-a"
        seasonId="franchise-a-season-3"
        onClose={vi.fn()}
      />,
    );

    await screen.findByText(/Alpha One/i);
    fireEvent.click(await screen.findByRole("button", { name: /Confirm grade\/salary update/i }));
    fireEvent.click(screen.getByRole("button", { name: /Apply confirmed grade\/salary update/i }));

    expect(await screen.findByText(/Ratings\/salary recalculation failed and rollback needs repair/i)).toBeInTheDocument();
    expect(screen.getByText(/PLAYER_ROLLBACK_FAILED/i)).toBeInTheDocument();
    expect(screen.getAllByText(/rollback_failed/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/player-a: rollback failed/i)).toBeInTheDocument();
    expect(mocks.mockSavePlayer).not.toHaveBeenCalled();
  });

  test("DraftFlow renders franchise dry-run readiness without draft mutation controls", async () => {
    render(
      <DraftFlow
        franchiseId="franchise-a"
        seasonId="franchise-a-season-3"
        seasonNumber={3}
        onComplete={vi.fn()}
        onCancel={vi.fn()}
      />,
    );

    expect(await screen.findByText(/Preview only - no draft commit/i)).toBeInTheDocument();
    expect(screen.getByText(/franchise-draft-v1-roster-readiness-dry-run/i)).toBeInTheDocument();
    expect(screen.getByText(/No draft picks are made/i)).toBeInTheDocument();
    expect(screen.getByText(/no players are generated, signed, released, replaced, retired, or moved/i)).toBeInTheDocument();
    expect(screen.getByText(/no transactions are written/i)).toBeInTheDocument();
    expect(screen.getByText(/no draft class is persisted/i)).toBeInTheDocument();
    expect(screen.getByText(/Phase 11 roster lock readiness targets/i)).toBeInTheDocument();
    expect(screen.getByText(/Draft class preview is unavailable/i)).toBeInTheDocument();
    expect(screen.getByText(/TRANSITION_ATTENTION_REQUIRED/i)).toBeInTheDocument();
    expect(screen.getByText(/Alpha/i)).toBeInTheDocument();
    expect(screen.getByText(/MLB: 20\/22/i)).toBeInTheDocument();
    expect(screen.getByText(/Farm: 8\/10/i)).toBeInTheDocument();
    expect(screen.getByText(/Relief pitching depth: 2\/4/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Skip - Use Generated Prospects Only/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Add Selected to Draft/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Begin Draft/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /DRAFT SELECTED PLAYER/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Confirm Pick/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Pass & Exit Draft/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Continue to Trade Phase/i })).not.toBeInTheDocument();
    expect(mocks.mockRunFranchiseDraftDryRun).toHaveBeenCalledWith(
      {
        franchiseId: "franchise-a",
        seasonId: "franchise-a-season-3",
        seasonNumber: 3,
        offseasonStateId: "offseason-franchise-a-season-3",
        phase: "DRAFT",
        dryRun: true,
      },
      { dryRun: true },
    );
    expect(mocks.mockUseOffseasonData).not.toHaveBeenCalled();
    expect(mocks.mockUseOffseasonState).not.toHaveBeenCalled();
    expect(mocks.mockGetActiveFranchise).not.toHaveBeenCalled();
    expect(mocks.mockLoadFranchise).not.toHaveBeenCalled();
    expect(mocks.mockSaveDraft).not.toHaveBeenCalled();
    expect(mocks.mockSavePlayer).not.toHaveBeenCalled();
    expect(mocks.mockSaveTeamRoster).not.toHaveBeenCalled();
  });

  test("TradeFlow exposes franchise transaction console and keeps advisory preview read-only", async () => {
    render(
      <TradeFlow
        franchiseId="franchise-a"
        seasonId="franchise-a-season-3"
        seasonNumber={3}
      />,
    );

    expect(await screen.findByText(/Regular-Season Roster Desk/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /ROSTER MOVES/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /MANUAL TRADE/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /HISTORY/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /FIT PREVIEW/i })).toBeInTheDocument();
    expect(screen.getByText(/League Builder roster writes are not used here/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /FIT PREVIEW/i }));

    expect(await screen.findByText(/Trade Fit Preview/i)).toBeInTheDocument();
    expect(screen.getByText(/franchise-trades-v1-fit-preview-dry-run/i)).toBeInTheDocument();
    expect(screen.getByText(/no trades are executed/i)).toBeInTheDocument();
    expect(screen.getAllByText(/no players are moved/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/no teams, farm records, transactions, League Builder data, prototype trade records, or offseason state are written/i)).toBeInTheDocument();
    expect(screen.getByText(/Trade AI acceptance, chemistry, morale, injuries, salary-cap enforcement/i)).toBeInTheDocument();
    expect(screen.getByText(/TEAM NEEDS \/ SURPLUS/i)).toBeInTheDocument();
    expect(screen.getByText(/NON-EXECUTABLE FIT PREVIEWS/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Alpha/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Beta/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Middle infield depth/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText(/TRANSITION_ATTENTION_REQUIRED/i)).toBeInTheDocument();
    expect(screen.getByText(/No trade execution is implemented by this adapter/i)).toBeInTheDocument();
    expect(mocks.mockRunFranchiseTradeDryRun).toHaveBeenCalledWith(
      {
        franchiseId: "franchise-a",
        seasonId: "franchise-a-season-3",
        statsScopeId: "franchise-a-season-3",
        seasonNumber: 3,
        offseasonStateId: "offseason-franchise-a-season-3",
        phase: "TRADES",
        dryRun: true,
      },
      { dryRun: true },
    );
    expect(mocks.mockUseOffseasonData).not.toHaveBeenCalled();
    expect(mocks.mockUseOffseasonState).not.toHaveBeenCalled();
    expect(mocks.mockAddNewTrade).not.toHaveBeenCalled();
    expect(mocks.mockSavePlayer).not.toHaveBeenCalled();
    expect(mocks.mockSaveTeamRoster).not.toHaveBeenCalled();
    expect(mocks.mockTransferPlayer).not.toHaveBeenCalled();
    expect(mocks.mockExecuteManualFranchiseTrade).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: /PROPOSE TRADE/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /COMPLETE TRADE/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /CONFIRM TRADE/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /ACCEPT TRADE/i })).not.toBeInTheDocument();
  });

  test("TradeFlow blocks franchise preview when seasonNumber is missing instead of defaulting to season 1", () => {
    render(
      <TradeFlow
        franchiseId="franchise-a"
        seasonId="franchise-a-season-3"
      />,
    );

    expect(screen.getByText(/Regular-Season Roster Desk/i)).toBeInTheDocument();
    expect(screen.getByText(/franchise-trades-v1-fit-preview-dry-run/i)).toBeInTheDocument();
    expect(screen.getByText(/MISSING_SEASON_NUMBER/i)).toBeInTheDocument();
    expect(screen.getByText(/no roster moves, trades, previews, or history reads were started/i)).toBeInTheDocument();
    expect(screen.getByText(/silently defaulting to season 1 can scope data to the wrong season/i)).toBeInTheDocument();
    expect(mocks.mockRunFranchiseTradeDryRun).not.toHaveBeenCalled();
    expect(mocks.mockGetAllFranchiseTeams).not.toHaveBeenCalled();
    expect(mocks.mockGetAllFranchisePlayers).not.toHaveBeenCalled();
    expect(mocks.mockGetTransactionsByFranchiseSeason).not.toHaveBeenCalled();
    expect(mocks.mockUseOffseasonData).not.toHaveBeenCalled();
    expect(mocks.mockUseOffseasonState).not.toHaveBeenCalled();
    expect(mocks.mockAddNewTrade).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: /PROPOSE TRADE/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /COMPLETE TRADE/i })).not.toBeInTheDocument();
  });

  test("ContractionExpansionFlow renders a v1 skip-only expansion boundary without contraction workflow copy", () => {
    render(
      <ContractionExpansionFlow
        franchiseId="franchise-a"
        seasonId="franchise-a-season-3"
        seasonNumber={3}
        onComplete={vi.fn()}
      />,
    );

    expect(screen.getByText(/Expansion Boundary/i)).toBeInTheDocument();
    expect(screen.getByText(/Deferred in Mode 2 v1/i)).toBeInTheDocument();
    expect(screen.queryByText(/contraction rolls/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/expansion drafts/i)).not.toBeInTheDocument();
  });

  test("FinalizeAdvanceFlow blocks local-only roster movement controls in franchise context", async () => {
    render(
      <FinalizeAdvanceFlow
        franchiseId="franchise-a"
        seasonId="franchise-a-season-3"
        seasonNumber={3}
        onClose={vi.fn()}
        onAdvanceComplete={vi.fn()}
      />,
    );

    expect(screen.getByText(/Franchise roster movement is blocked here/i)).toBeInTheDocument();
    for (const button of screen.getAllByRole("button", { name: /Send/i })) {
      expect(button).toBeDisabled();
    }
  });
});
