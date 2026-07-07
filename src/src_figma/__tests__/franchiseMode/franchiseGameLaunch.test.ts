import { beforeEach, describe, expect, test, vi } from "vitest";
import { getFranchiseSeasonId } from "../../../utils/franchisePersistenceContract";

const mocks = vi.hoisted(() => ({
  mockBuildFranchiseGameTrackerRoster: vi.fn(),
  mockGetFranchiseTeam: vi.fn(),
  mockGetTeam: vi.fn(),
  mockGetReporterForTeam: vi.fn(),
  mockAutoGenerateReporterForTeam: vi.fn(),
  mockResolveManagerForTeam: vi.fn(),
}));

vi.mock("../../app/utils/franchiseGameTrackerRoster", async () => {
  const actual = await vi.importActual<typeof import("../../app/utils/franchiseGameTrackerRoster")>(
    "../../app/utils/franchiseGameTrackerRoster",
  );
  return {
    ...actual,
    buildFranchiseGameTrackerRoster: mocks.mockBuildFranchiseGameTrackerRoster,
  };
});

vi.mock("../../../utils/franchisePlayerStorage", () => ({
  getFranchiseTeam: mocks.mockGetFranchiseTeam,
}));

vi.mock("../../../utils/leagueBuilderStorage", () => ({
  getTeam: mocks.mockGetTeam,
}));

vi.mock("../../../utils/reporterStorage", () => ({
  getReporterForTeam: mocks.mockGetReporterForTeam,
}));

vi.mock("../../../utils/reporterAssignment", () => ({
  autoGenerateReporterForTeam: mocks.mockAutoGenerateReporterForTeam,
}));

vi.mock("../../../utils/managerIdentityStorage", () => ({
  LEAGUE_BUILDER_MANAGER_INSTANCE_ID: "league-builder",
  resolveManagerForTeam: mocks.mockResolveManagerForTeam,
}));

vi.mock("@/config/teamColors", () => ({
  getTeamColors: vi.fn(() => ({ primary: "#111111", secondary: "#222222" })),
}));

import {
  buildFranchiseGameTrackerNavigation,
  prepareFranchisePregameData,
} from "../../app/utils/franchiseGameLaunch";

function player(teamId: string, index: number, position = index === 9 ? "P" : "SS") {
  return {
    playerId: `${teamId}-p${index}`,
    name: `${teamId} Player ${index}`,
    position,
    primaryPosition: position,
    battingOrder: index,
    stats: { ab: 0, h: 0, r: 0, rbi: 0, bb: 0, k: 0 },
    battingHand: "R" as const,
  };
}

function pitcher(teamId: string, index: number, isStarter = index === 1) {
  return {
    playerId: `${teamId}-sp${index}`,
    name: `${teamId} Starter ${index}`,
    stats: { ip: "0.0", h: 0, r: 0, er: 0, bb: 0, k: 0, pitches: 0 },
    throwingHand: index === 1 ? "R" as const : "L" as const,
    isStarter,
    isActive: isStarter,
  };
}

function roster(teamId: string) {
  return {
    players: Array.from({ length: 9 }, (_, index) => player(teamId, index + 1)),
    pitchers: [pitcher(teamId, 1, true), pitcher(teamId, 2, false)],
    optimalLineups: {},
  };
}

describe("franchiseGameLaunch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mockBuildFranchiseGameTrackerRoster.mockImplementation((teamId: string) =>
      Promise.resolve(roster(teamId)),
    );
    mocks.mockGetFranchiseTeam.mockImplementation((_franchiseId: string, teamId: string) =>
      Promise.resolve({
        id: teamId,
        name: `${teamId} Team`,
        abbreviation: teamId.slice(0, 3).toUpperCase(),
        colors: { primary: "#aa0000", secondary: "#00aa00" },
        stadium: `${teamId} Park`,
      }),
    );
    mocks.mockGetReporterForTeam.mockResolvedValue({ id: "reporter-1" });
    mocks.mockResolveManagerForTeam.mockImplementation(({ team }: { team: { id: string; name: string } }) =>
      Promise.resolve({
        managerId: `${team.id}-manager`,
        managerName: `${team.name} Manager`,
      }),
    );
  });

  test("prepares real franchise rosters with schedule-derived rotation counts", async () => {
    const prepared = await prepareFranchisePregameData({
      franchiseId: "franchise-1",
      leagueId: "league-1",
      useDH: false,
      nextGame: {
        id: "game-7",
        seasonNumber: 1,
        gameNumber: 7,
        dayNumber: 4,
        awayTeamId: "away-team",
        homeTeamId: "home-team",
        status: "SCHEDULED",
      },
      completedGames: [
        {
          id: "completed-away",
          seasonNumber: 1,
          gameNumber: 1,
          dayNumber: 1,
          awayTeamId: "away-team",
          homeTeamId: "other-team",
          status: "COMPLETED",
        },
        {
          id: "completed-home",
          seasonNumber: 1,
          gameNumber: 2,
          dayNumber: 2,
          awayTeamId: "other-team",
          homeTeamId: "home-team",
          status: "COMPLETED",
        },
      ],
      teamNameMap: {
        "away-team": "Away Team",
        "home-team": "Home Team",
      },
    });

    expect(mocks.mockBuildFranchiseGameTrackerRoster).toHaveBeenCalledWith(
      "away-team",
      expect.objectContaining({ franchiseId: "franchise-1", leagueId: "league-1", useDH: false, teamGamesPlayed: 1 }),
    );
    expect(mocks.mockBuildFranchiseGameTrackerRoster).toHaveBeenCalledWith(
      "home-team",
      expect.objectContaining({ franchiseId: "franchise-1", leagueId: "league-1", useDH: false, teamGamesPlayed: 1 }),
    );
    expect(prepared.awayPlayers).toHaveLength(9);
    expect(prepared.homePitchers).toHaveLength(2);
    expect(prepared.scheduleGameId).toBe("game-7");
  });

  test("builds GameTracker navigation with franchise season/statsScope parity", async () => {
    const seasonId = getFranchiseSeasonId("franchise-1", 1);
    const prepared = await prepareFranchisePregameData({
      franchiseId: "franchise-1",
      leagueId: "league-1",
      useDH: false,
      nextGame: {
        id: "game-7",
        seasonNumber: 1,
        gameNumber: 7,
        dayNumber: 4,
        awayTeamId: "away-team",
        homeTeamId: "home-team",
        status: "SCHEDULED",
      },
      completedGames: [],
      teamNameMap: {
        "away-team": "Away Team",
        "home-team": "Home Team",
      },
    });

    const navigation = await buildFranchiseGameTrackerNavigation({
      data: prepared,
      franchiseId: "franchise-1",
      leagueId: "league-1",
      seasonId,
      seasonNumber: 1,
      franchiseConfig: {
        league: "league-1",
        season: { inningsPerGame: 9, useDH: false, extraInningsRule: "Standard" },
      },
      stadiumMap: { "home-team": "Home Park" },
      getTeamRecord: (teamId) => (teamId === "home-team" ? "4-3" : "3-4"),
    });

    expect(navigation.pathname).toBe("/game-tracker/franchise-g7");
    expect(navigation.state).toMatchObject({
      gameMode: "franchise",
      franchiseId: "franchise-1",
      leagueId: "league-1",
      seasonId,
      statsScopeId: seasonId,
      competitionType: "franchise",
      competitionId: "franchise-1",
      scheduleGameId: "game-7",
      seasonNumber: 1,
      gameNumber: 7,
      stadiumName: "Home Park",
      awayRecord: "3-4",
      homeRecord: "4-3",
    });
    expect(navigation.state.seasonId).toBe(getFranchiseSeasonId("franchise-1", 1));
    expect(navigation.state.statsScopeId).toBe(navigation.state.seasonId);
    expect(navigation.state.awayPlayers).toHaveLength(9);
    expect(navigation.state.homePitchers).toHaveLength(2);
    expect(navigation.state.awayManagerId).toBe("away-team-manager");
    expect(navigation.state.homeManagerId).toBe("home-team-manager");
  });
});
