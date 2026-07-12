import { act, renderHook, waitFor } from "@testing-library/react";
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
  mockListUnresolvedDevelopment: vi.fn(),
  mockGetDevelopmentHistory: vi.fn(),
  mockResolveRatingsProposal: vi.fn(),
  mockResolveTraitProposal: vi.fn(),
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
  getPlayerMoraleSpecState: vi.fn(() => "CONTENT"),
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

vi.mock("../../../utils/franchiseConsoleMirror", () => ({
  listUnresolvedDevelopment: mocks.mockListUnresolvedDevelopment,
  getDevelopmentHistory: mocks.mockGetDevelopmentHistory,
  resolveRatingsProposal: mocks.mockResolveRatingsProposal,
  resolveTraitProposal: mocks.mockResolveTraitProposal,
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

function player(id: string, morale = 99) {
  return {
    id,
    firstName: "Piper",
    lastName: "Truth",
    gender: "F",
    age: 25,
    bats: "R",
    throws: "R",
    primaryPosition: "CF",
    secondaryPosition: "LF",
    power: 50,
    contact: 51,
    speed: 52,
    fielding: 53,
    arm: 54,
    velocity: 0,
    junk: 0,
    accuracy: 0,
    arsenal: [],
    overallGrade: "B",
    personality: "Competitive",
    chemistry: "Competitive",
    morale,
    mojo: "Normal",
    fame: 0,
    salary: 1_000_000,
    trait1: null,
    trait2: null,
    leagueAssignments: [{ leagueId: "league-1", teamId: "home-team", rosterStatus: "MLB" }],
    editHistory: [],
    createdDate: "2026-01-01T00:00:00.000Z",
    lastModified: "2026-01-01T00:00:00.000Z",
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
      leagueDetails: {
        name: "Reflection League",
        teams: 3,
        conferences: 2,
        divisions: 2,
      },
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
    mocks.mockListUnresolvedDevelopment.mockResolvedValue([]);
    mocks.mockGetDevelopmentHistory.mockResolvedValue([]);
    mocks.mockResolveRatingsProposal.mockResolvedValue({ outcome: "resolved", overlay: {} });
    mocks.mockResolveTraitProposal.mockResolvedValue({ outcome: "resolved", overlay: {} });
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

  test("currently renders Lens standings as one league-wide group even when the franchise has conferences", async () => {
    const { result } = renderHook(() => useFranchiseLensData("franchise-reflect", 1, "home-team"));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.hub.standings?.divisions).toHaveLength(1);
    expect(result.current.hub.standings?.divisions[0]?.name).toBe("Reflection League");
    expect(result.current.hub.standings?.divisions[0]?.rows.map((row) => row.teamId).sort()).toEqual([
      "away-team",
      "home-team",
      "next-team",
    ]);
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

  test("maps the service worklist with true checkpoint ordinals, oldest first, and stamped from-to values", async () => {
    mocks.mockGetAllFranchisePlayers.mockResolvedValue([player("player-1")]);
    mocks.mockListUnresolvedDevelopment.mockResolvedValue([
      {
        boundaryGameNumber: 24,
        ordinal: 2,
        ordinalCount: 5,
        proposals: [{
          kind: "rating",
          overlay: {
            id: "rating-24",
            playerId: "player-1",
            ratingKey: "power",
            expectedPriorValue: 50,
            proposedValue: 55,
          },
        }],
      },
      {
        boundaryGameNumber: 48,
        ordinal: 4,
        ordinalCount: 5,
        proposals: [{
          kind: "trait",
          overlay: {
            id: "trait-48",
            playerId: "player-1",
            valence: "gain",
            traitName: "Clutch",
            displacesTraitName: null,
            expectedPriorValue: { trait1: null, trait2: null },
            proposedValue: { trait1: "Clutch", trait2: null },
          },
        }],
      },
    ]);

    const { result } = renderHook(() => useFranchiseLensData("franchise-reflect", 1, "home-team"));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.hub.checkpoint?.groups?.map((group) => group.label)).toEqual([
      "Checkpoint 2 of 5 — game 24",
      "Checkpoint 4 of 5 — game 48",
    ]);
    expect(result.current.hub.checkpoint?.groups?.[0].players[0].proposals?.[0].ratingChange).toEqual({
      label: "Power",
      from: 50,
      to: 55,
    });
    expect(result.current.hub.home?.impactCards[0]?.detail).toContain("2 changes across 1 players");
    expect(result.current.hub.bigMoments?.[0]).toMatchObject({
      kicker: "Checkpoint 2 of 5 — game 24",
      title: "2 changes across 1 players",
      action: "checkpoint",
    });
  });

  test("routes confirm-adjusted through the mirror service with the currently displayed prior value", async () => {
    mocks.mockResolveRatingsProposal.mockResolvedValue({
      outcome: "resolved",
      currentValue: 54,
      overlay: { confirmationStatus: "confirmed-applied" },
    });
    const { result } = renderHook(() => useFranchiseLensData("franchise-reflect", 1, "home-team"));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.resolveDevelopment({
        proposalId: "rating-adjust",
        kind: "rating",
        action: "confirm-adjusted",
        observedPriorValue: 50,
        actualValue: 54,
      });
    });

    expect(mocks.mockResolveRatingsProposal).toHaveBeenCalledWith("rating-adjust", {
      action: "confirm-adjusted",
      observedPriorValue: 50,
      actualValue: 54,
      rejectReason: undefined,
      actor: "Franchise Lens",
    });
  });

  test("uses canonical morale snapshots for the pulse and derives both player and fan trends", async () => {
    mocks.mockGetAllFranchisePlayers.mockResolvedValue([player("player-1", 99)]);
    mocks.mockListFranchiseMoraleSnapshots.mockResolvedValue([
      {
        targetType: "player",
        playerId: "player-1",
        currentValue: 37,
        history: [{ previousValue: 32, currentValue: 37, delta: 5, reason: "Walk-off", timestamp: "2026-07-10T00:00:00Z" }],
      },
      {
        targetType: "team-fan",
        teamId: "home-team",
        currentValue: 44,
        history: [{ previousValue: 50, currentValue: 44, delta: -6, reason: "Sweep", timestamp: "2026-07-10T00:00:00Z" }],
      },
    ]);

    const { result } = renderHook(() => useFranchiseLensData("franchise-reflect", 1, "home-team"));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.hub.pulse.clubhouseAvg).toBe(37);
    expect(result.current.hub.pulse.fanMorale?.trend).toBe("down");
    expect(result.current.hub.roster[0].morale).toMatchObject({ value: 37, trend: "up" });
  });

  test("deduplicates the news wire and filters museum and milestones to this franchise", async () => {
    mocks.mockGetAllFranchisePlayers.mockResolvedValue([player("player-1")]);
    mocks.mockListSeasonNewsItemsForFranchiseSeason.mockResolvedValue(
      Array.from({ length: 10 }, (_, index) => ({
        id: `news-${index}`,
        eventType: "MILESTONE",
        headline: `Headline ${index}`,
        body: `Body ${index}`,
        dramaticWeight: 100 - index,
      })),
    );
    mocks.mockGetChampionships.mockResolvedValue([
      { year: 2026, champion: "Home Team", championId: "home-team" },
      { year: 2025, champion: "Other Club", championId: "other-team" },
    ]);
    mocks.mockGetAwardWinners.mockResolvedValue([
      { year: 2026, awardType: "MVP", playerName: "Piper Truth", teamId: "home-team" },
      { year: 2025, awardType: "MVP", playerName: "Stranger", teamId: "other-team" },
    ]);
    mocks.mockGetRecentMilestones.mockResolvedValue([
      { id: "ours", playerId: "player-1", seasonId: "franchise-reflect-season-1", achievedDate: 2, description: "Our milestone", tier: 1 },
      { id: "theirs", playerId: "player-1", seasonId: "other-franchise-season-1", achievedDate: 1, description: "Bleed milestone", tier: 1 },
    ]);
    mocks.mockGetFranchiseFameRecordRowsByScope.mockResolvedValue([
      { playerId: "player-1", heat: 55, reachFloor: 1, wasNegative: false, channelTotal: 12, updatedAtCheckpoint: "24" },
    ]);

    const { result } = renderHook(() => useFranchiseLensData("franchise-reflect", 1, "home-team"));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const storyHeadlines = new Set(result.current.hub.news?.stories.map((story) => story.headline));
    expect(result.current.hub.news?.wire?.every((item) => !storyHeadlines.has(item.text))).toBe(true);
    expect(result.current.hub.almanac?.trophyCase?.map((trophy) => trophy.holder)).toEqual([
      "Home Team",
      "Piper Truth",
    ]);
    expect(result.current.hub.moments?.ceremony?.champion).toBe("Home Team");
    expect(result.current.hub.roster[0].detail?.milestones?.map((milestone) => milestone.label)).toEqual(["Our milestone"]);
    expect(result.current.hub.bigMoments?.map((moment) => moment.id)).toContain("milestone-ours");
    expect(result.current.hub.bigMoments?.map((moment) => moment.id)).toContain("fame-player-1");
  });

  test("shares the run-differential tiebreak for table order and pulse rank and reports real L10 length", async () => {
    mocks.mockCalculateStandings.mockResolvedValue([
      { ...standing("home-team", 1, 1), runDiff: 2, lastTenWins: 1 },
      { ...standing("away-team", 1, 1), runDiff: 9, lastTenWins: 1 },
    ]);
    const { result } = renderHook(() => useFranchiseLensData("franchise-reflect", 1, "home-team"));
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.hub.standings?.divisions[0].rows.slice(0, 2).map((row) => row.teamId)).toEqual(["away-team", "home-team"]);
    expect(result.current.hub.pulse.standingLabel).toBe("2nd of 3");
    expect(result.current.hub.standings?.divisions[0].rows.find((row) => row.teamId === "home-team")?.lastTenGames).toBe(2);
    expect(result.current.hub.home?.nextGame).toMatchObject({ activeTeamId: "home-team", awayTeamId: "home-team" });
    expect(result.current.hub.home?.impactCards.some((card) => card.detail.includes("Above .500"))).toBe(false);
  });
});
