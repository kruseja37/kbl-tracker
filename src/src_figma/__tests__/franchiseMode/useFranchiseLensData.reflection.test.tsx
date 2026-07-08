import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  mockUseSeasonStats: vi.fn(),
  mockGetFranchiseConfig: vi.fn(),
  mockResolveFranchiseSalaryRevealState: vi.fn(),
  mockGetAllFranchiseTeams: vi.fn(),
  mockGetAllTeams: vi.fn(),
  mockGetAllFranchisePlayers: vi.fn(),
  mockCalculateStandings: vi.fn(),
  mockGetFranchiseDesignationRows: vi.fn(),
  mockListFranchiseMoraleSnapshots: vi.fn(),
  mockGetAllGamesByFranchise: vi.fn(),
  mockGetPlayoffByFranchiseSeason: vi.fn(),
  mockGetSeriesByPlayoff: vi.fn(),
  mockGetTransactionsByFranchiseSeason: vi.fn(),
  mockGetChampionships: vi.fn(),
  mockGetAwardWinners: vi.fn(),
  mockGetFranchiseRatingsOverlaysByScope: vi.fn(),
  mockGetFranchiseTrueValueSnapshotRowsByScope: vi.fn(),
  mockGetFranchiseTraitOverlaysByScope: vi.fn(),
  mockGetFranchiseRelationshipEdgesByScope: vi.fn(),
  mockGetFranchiseFameRecordRowsByScope: vi.fn(),
  mockListSeasonNewsItemsForFranchiseSeason: vi.fn(),
  mockListGameStoriesForFranchiseSeason: vi.fn(),
  mockListReporters: vi.fn(),
  mockListManagerProfiles: vi.fn(),
  mockComputeFranchiseRaceCandidateRows: vi.fn(),
  mockLoadFranchiseConditionSnapshots: vi.fn(),
  mockSaveFranchiseFitness: vi.fn(),
  mockGetRecentMilestones: vi.fn(),
  mockCallUpFranchisePlayer: vi.fn(),
  mockSendDownFranchisePlayer: vi.fn(),
  mockExecuteManualFranchiseTrade: vi.fn(),
}));

vi.mock("../../../hooks/useSeasonStats", () => ({
  useSeasonStats: mocks.mockUseSeasonStats,
}));

vi.mock("../../../utils/franchiseManager", () => ({
  getFranchiseConfig: mocks.mockGetFranchiseConfig,
}));

vi.mock("../../../utils/franchiseSalary", () => ({
  resolveFranchiseSalaryRevealState: mocks.mockResolveFranchiseSalaryRevealState,
}));

vi.mock("../../../utils/franchisePlayerStorage", () => ({
  getAllFranchisePlayers: mocks.mockGetAllFranchisePlayers,
  getAllFranchiseTeams: mocks.mockGetAllFranchiseTeams,
}));

vi.mock("../../../utils/leagueBuilderStorage", () => ({
  getAllTeams: mocks.mockGetAllTeams,
}));

vi.mock("../../../utils/seasonStorage", () => ({
  calculateStandings: mocks.mockCalculateStandings,
}));

vi.mock("../../../utils/franchiseDesignationStorage", () => ({
  getFranchiseDesignationRows: mocks.mockGetFranchiseDesignationRows,
}));

vi.mock("../../../utils/franchiseDesignations", () => ({
  getLiveDesignationBadge: vi.fn(() => null),
  getProjectedDesignationBadge: vi.fn(() => null),
}));

vi.mock("../../../utils/franchiseMoraleState", () => ({
  listFranchiseMoraleSnapshots: mocks.mockListFranchiseMoraleSnapshots,
}));

vi.mock("../../../utils/franchisePlayerMoraleSpecAdapter", () => ({
  getPlayerMoraleSpecState: vi.fn(() => ({ value: 50, state: "Neutral", trend: "flat", history: [] })),
}));

vi.mock("../../../engines/ratingsOverlayMerge", () => ({
  mergeRatingsOverlays: vi.fn((player) => player),
}));

vi.mock("../../../utils/franchiseRatingsOverlayStorage", () => ({
  getFranchiseRatingsOverlaysByScope: mocks.mockGetFranchiseRatingsOverlaysByScope,
}));

vi.mock("../../../utils/franchiseTrueValueSnapshotsStorage", () => ({
  getFranchiseTrueValueSnapshotRowsByScope: mocks.mockGetFranchiseTrueValueSnapshotRowsByScope,
}));

vi.mock("../../../utils/franchiseTraitOverlayStorage", () => ({
  getFranchiseTraitOverlaysByScope: mocks.mockGetFranchiseTraitOverlaysByScope,
}));

vi.mock("../../../utils/franchiseRelationshipEdgesStorage", () => ({
  getFranchiseRelationshipEdgesByScope: mocks.mockGetFranchiseRelationshipEdgesByScope,
}));

vi.mock("../../../utils/franchiseFameRecordsStorage", () => ({
  getFranchiseFameRecordRowsByScope: mocks.mockGetFranchiseFameRecordRowsByScope,
}));

vi.mock("../../../utils/scheduleStorage", () => ({
  getAllGamesByFranchise: mocks.mockGetAllGamesByFranchise,
}));

vi.mock("../../../utils/playoffStorage", () => ({
  getPlayoffByFranchiseSeason: mocks.mockGetPlayoffByFranchiseSeason,
  getSeriesByPlayoff: mocks.mockGetSeriesByPlayoff,
}));

vi.mock("../../../utils/transactionStorage", () => ({
  getTransactionsByFranchiseSeason: mocks.mockGetTransactionsByFranchiseSeason,
}));

vi.mock("../../../utils/museumStorage", () => ({
  getAwardWinners: mocks.mockGetAwardWinners,
  getChampionships: mocks.mockGetChampionships,
}));

vi.mock("../../../utils/seasonNewsStorage", () => ({
  listSeasonNewsItemsForFranchiseSeason: mocks.mockListSeasonNewsItemsForFranchiseSeason,
}));

vi.mock("../../../utils/gameStoriesStorage", () => ({
  listGameStoriesForFranchiseSeason: mocks.mockListGameStoriesForFranchiseSeason,
}));

vi.mock("../../../utils/reporterStorage", () => ({
  listReporters: mocks.mockListReporters,
}));

vi.mock("../../../utils/managerIdentityStorage", () => ({
  listManagerProfiles: mocks.mockListManagerProfiles,
}));

vi.mock("../../../utils/franchiseAwardsEngine", () => ({
  computeFranchiseRaceCandidateRows: mocks.mockComputeFranchiseRaceCandidateRows,
}));

vi.mock("../../../utils/mojoFitnessStorage", () => ({
  loadFranchiseConditionSnapshots: mocks.mockLoadFranchiseConditionSnapshots,
  saveFranchiseFitness: mocks.mockSaveFranchiseFitness,
}));

vi.mock("../../../utils/careerStorage", () => ({
  getRecentMilestones: mocks.mockGetRecentMilestones,
}));

vi.mock("../../../utils/franchiseRosterMovement", () => ({
  callUpFranchisePlayer: mocks.mockCallUpFranchisePlayer,
  sendDownFranchisePlayer: mocks.mockSendDownFranchisePlayer,
}));

vi.mock("../../../utils/franchiseTradeAdapter", () => ({
  executeManualFranchiseTrade: mocks.mockExecuteManualFranchiseTrade,
}));

import { useFranchiseLensData } from "../../hooks/useFranchiseLensData";

function team(id: string, name: string, abbreviation: string) {
  return {
    id,
    name,
    abbreviation,
    location: name,
    nickname: name,
    colors: { primary: "#123456", secondary: "#abcdef" },
    stadium: `${name} Park`,
    leagueIds: ["league-1"],
    managerId: `${id}-manager`,
    managerName: `${name} Manager`,
  };
}

function standing(teamId: string, wins: number, losses: number) {
  return {
    teamId,
    wins,
    losses,
    winPct: wins + losses > 0 ? wins / (wins + losses) : 0,
    gamesBack: 0,
    lastTenWins: wins,
    streak: { type: wins > losses ? "W" : "L", count: wins + losses > 0 ? 1 : 0 },
    runDiff: 0,
    homeRecord: { wins, losses: 0 },
    awayRecord: { wins: 0, losses },
  };
}

describe("useFranchiseLensData schedule reflection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mockUseSeasonStats.mockReturnValue({
      isLoading: false,
      getBattingLeaders: vi.fn(() => []),
      getPitchingLeaders: vi.fn(() => []),
    });
    mocks.mockGetFranchiseConfig.mockResolvedValue({
      franchiseId: "franchise-reflect",
      franchiseName: "Reflection Franchise",
      league: "league-1",
      controlledTeams: [{ teamId: "home-team" }],
      gm: { displayName: "GM" },
    });
    mocks.mockResolveFranchiseSalaryRevealState.mockReturnValue("revealed");
    mocks.mockGetAllFranchiseTeams.mockResolvedValue([
      team("home-team", "Home Team", "HOM"),
      team("away-team", "Away Team", "AWY"),
      team("next-team", "Next Team", "NXT"),
    ]);
    mocks.mockGetAllTeams.mockResolvedValue([]);
    mocks.mockGetAllFranchisePlayers.mockResolvedValue([]);
    mocks.mockCalculateStandings.mockResolvedValue([
      standing("home-team", 1, 0),
      standing("away-team", 0, 1),
      standing("next-team", 0, 0),
    ]);
    mocks.mockGetFranchiseDesignationRows.mockResolvedValue([]);
    mocks.mockListFranchiseMoraleSnapshots.mockResolvedValue([]);
    mocks.mockGetAllGamesByFranchise.mockResolvedValue([
      {
        id: "game-completed",
        franchiseId: "franchise-reflect",
        seasonId: "franchise-reflect-season-1",
        statsScopeId: "franchise-reflect-season-1",
        seasonNumber: 1,
        gameNumber: 1,
        dayNumber: 1,
        awayTeamId: "away-team",
        homeTeamId: "home-team",
        status: "COMPLETED",
        result: {
          awayScore: 2,
          homeScore: 5,
          winningTeamId: "home-team",
          losingTeamId: "away-team",
          gameLogId: "archive-1",
        },
      },
      {
        id: "game-skipped",
        franchiseId: "franchise-reflect",
        seasonId: "franchise-reflect-season-1",
        statsScopeId: "franchise-reflect-season-1",
        seasonNumber: 1,
        gameNumber: 2,
        dayNumber: 2,
        awayTeamId: "home-team",
        homeTeamId: "away-team",
        status: "SKIPPED",
      },
      {
        id: "game-next",
        franchiseId: "franchise-reflect",
        seasonId: "franchise-reflect-season-1",
        statsScopeId: "franchise-reflect-season-1",
        seasonNumber: 1,
        gameNumber: 3,
        dayNumber: 3,
        awayTeamId: "home-team",
        homeTeamId: "next-team",
        status: "SCHEDULED",
      },
    ]);
    mocks.mockGetPlayoffByFranchiseSeason.mockResolvedValue(null);
    mocks.mockGetSeriesByPlayoff.mockResolvedValue([]);
    mocks.mockGetTransactionsByFranchiseSeason.mockResolvedValue([]);
    mocks.mockGetChampionships.mockResolvedValue([]);
    mocks.mockGetAwardWinners.mockResolvedValue([]);
    mocks.mockGetFranchiseRatingsOverlaysByScope.mockResolvedValue([]);
    mocks.mockGetFranchiseTrueValueSnapshotRowsByScope.mockResolvedValue([]);
    mocks.mockGetFranchiseTraitOverlaysByScope.mockResolvedValue([]);
    mocks.mockGetFranchiseRelationshipEdgesByScope.mockResolvedValue([]);
    mocks.mockGetFranchiseFameRecordRowsByScope.mockResolvedValue([]);
    mocks.mockListSeasonNewsItemsForFranchiseSeason.mockResolvedValue([]);
    mocks.mockListGameStoriesForFranchiseSeason.mockResolvedValue([]);
    mocks.mockListReporters.mockImplementation(async (filter: { franchiseId?: string; leagueId?: string }) =>
      filter.leagueId === "league-1"
        ? [{
          id: "reporter-draft",
          teamId: "home-team",
          leagueId: "league-1",
          name: "Rita Wire",
          personality: "BALANCED",
          voiceStyle: "THE_CALLER",
          eraFlavor: "MODERN_LOCAL",
          avatarEra: "headset",
          avatarColors: { primary: "#123456", secondary: "#abcdef" },
          currentMood: "BALANCED",
          moodMomentum: 0,
          createdAt: 1,
          updatedAt: 1,
          changed_at: 1,
        }]
        : [],
    );
    mocks.mockListManagerProfiles.mockResolvedValue([
      {
        managerId: "home-team-manager",
        displayName: "Mina Dugout",
        createdByUser: true,
        defaultManager: false,
        managementStyle: { label: "Analytics" },
      },
    ]);
    mocks.mockComputeFranchiseRaceCandidateRows.mockResolvedValue({});
    mocks.mockLoadFranchiseConditionSnapshots.mockResolvedValue([]);
    mocks.mockGetRecentMilestones.mockResolvedValue([]);
  });

  test("advances past completed and skipped games while reflecting updated standings", async () => {
    const { result } = renderHook(() => useFranchiseLensData("franchise-reflect", 1, "home-team"));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(mocks.mockCalculateStandings).toHaveBeenCalledWith("franchise-reflect-season-1");
    expect(mocks.mockGetAllGamesByFranchise).toHaveBeenCalledWith("franchise-reflect", 1);
    expect(mocks.mockListReporters).toHaveBeenCalledWith({ franchiseId: "franchise-reflect" });
    expect(mocks.mockListReporters).toHaveBeenCalledWith({ leagueId: "league-1" });
    expect(result.current.seasonId).toBe("franchise-reflect-season-1");
    expect(result.current.active?.managerName).toBe("Mina Dugout");
    expect(result.current.active?.managerStyle).toBe("Analytics");
    expect(result.current.active?.reporter?.name).toBe("Rita Wire");
    expect(result.current.active?.reporter?.avatar).toBe("headset");
    expect(result.current.hub.home?.nextGame?.scheduleGameId).toBe("game-next");
    expect(result.current.hub.home?.nextGame?.awayRecord).toBe("1-0");
    expect(result.current.hub.schedule?.upcoming.map((game) => game.scheduleGameId)).toEqual(["game-next"]);
    expect(result.current.hub.schedule?.recent.map((game) => game.scheduleGameId)).toEqual(["game-completed"]);
    expect(result.current.hub.schedule?.recent[0]?.result).toEqual({
      teamScore: 5,
      oppScore: 2,
      win: true,
    });
  });

  test("falls back to team manager and no reporter when staffing stores are empty", async () => {
    mocks.mockListReporters.mockResolvedValue([]);
    mocks.mockListManagerProfiles.mockResolvedValue([]);

    const { result } = renderHook(() => useFranchiseLensData("franchise-reflect", 1, "home-team"));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.error).toBeNull();
    expect(result.current.active?.managerName).toBe("Home Team Manager");
    expect(result.current.active?.reporter).toBeUndefined();
  });
});
