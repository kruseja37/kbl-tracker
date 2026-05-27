import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { EliminationHome } from "../../app/pages/EliminationHome";
import type { PlayoffPlayerStats } from "../../../utils/playoffStorage";
import type { TeamImpactLeaderboards } from "../../../utils/teamImpact";

const {
  mockGetElimination,
  mockUpdateElimination,
  mockGetAllPlayoffs,
  mockGetPlayoffByElimination,
  mockUpdatePlayoff,
  mockGetSeriesByPlayoff,
  mockGetPlayoffLeaders,
  mockGetInstanceTeamImpactLeaderboards,
  mockBuildEliminationGameTrackerRoster,
  mockGetEliminationTeam,
  mockResolveManagerForTeam,
  mockNavigate,
} = vi.hoisted(() => ({
  mockGetElimination: vi.fn(),
  mockUpdateElimination: vi.fn(),
  mockGetAllPlayoffs: vi.fn(),
  mockGetPlayoffByElimination: vi.fn(),
  mockUpdatePlayoff: vi.fn(),
  mockGetSeriesByPlayoff: vi.fn(),
  mockGetPlayoffLeaders: vi.fn(),
  mockGetInstanceTeamImpactLeaderboards: vi.fn(),
  mockBuildEliminationGameTrackerRoster: vi.fn(),
  mockGetEliminationTeam: vi.fn(),
  mockResolveManagerForTeam: vi.fn(),
  mockNavigate: vi.fn(),
}));

vi.mock("react-router", () => ({
  useNavigate: () => mockNavigate,
  useParams: () => ({ eliminationId: "elim-1" }),
}));

vi.mock("../../../utils/eliminationManager", () => ({
  getElimination: mockGetElimination,
  updateElimination: mockUpdateElimination,
}));

vi.mock("../../../utils/eliminationRosterStorage", () => ({
  buildEliminationGameTrackerRoster: mockBuildEliminationGameTrackerRoster,
}));

vi.mock("../../../utils/eliminationPlayerStorage", () => ({
  getEliminationTeam: mockGetEliminationTeam,
}));

vi.mock("../../../utils/playoffStorage", () => ({
  getAllPlayoffs: mockGetAllPlayoffs,
  getPlayoffByElimination: mockGetPlayoffByElimination,
  updatePlayoff: mockUpdatePlayoff,
  getSeriesByPlayoff: mockGetSeriesByPlayoff,
  getPlayoffLeaders: mockGetPlayoffLeaders,
  getEliminationRoundName: (round: number) => `Round ${round}`,
}));

vi.mock("../../../utils/eliminationAwards", () => ({
  computeEliminationAwards: vi.fn(),
}));

vi.mock("../../../engines/playoffEngine", () => ({
  buildClutchContext: () => ({ isEliminationGame: false, isClinchGame: false }),
  getHomeFieldPattern: (_gameNumber: number, _bestOf: number, higherSeedId: string) => higherSeedId,
}));

vi.mock("../../../utils/managerIdentityStorage", () => ({
  resolveManagerForTeam: mockResolveManagerForTeam,
}));

vi.mock("../../../utils/teamImpact", () => ({
  getInstanceTeamImpactLeaderboards: mockGetInstanceTeamImpactLeaderboards,
}));

vi.mock("../../app/utils/pregameNavigationState", () => ({
  withPregameManagerNavigationState: (state: unknown) => state,
}));

vi.mock("../../app/utils/pregameLineupBenchmarks", () => ({
  buildPregameBenchmarkIssues: () => [],
}));

describe("EliminationHome leaders Team Impact panels", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetElimination.mockResolvedValue({
      eliminationId: "elim-1",
      name: "Test Cup",
      leagueId: "league-1",
      leagueName: "Test League",
      teamsCount: 2,
      currentRound: 1,
      status: "IN_PROGRESS",
    });
    mockUpdateElimination.mockResolvedValue(undefined);
    mockGetAllPlayoffs.mockResolvedValue([]);
    mockGetPlayoffByElimination.mockResolvedValue({
      id: "playoff-1",
      sourceType: "elimination",
      seasonId: "elim-1",
      status: "IN_PROGRESS",
      teams: [
        playoffTeam("alpha", "Alpha"),
        playoffTeam("beta", "Beta"),
      ],
      teamsQualifying: 2,
      rounds: 1,
      gamesPerRound: [1],
      inningsPerGame: 9,
      useDH: true,
      liveBeatReporterEnabled: false,
      postGameColumnsEnabled: true,
      beatReporterEnabled: true,
    });
    mockUpdatePlayoff.mockImplementation(async (_id, updates) => ({
      id: "playoff-1",
      ...updates,
    }));
    mockGetSeriesByPlayoff.mockResolvedValue([]);
    mockGetPlayoffLeaders.mockResolvedValue([playoffLeader()]);
    mockGetInstanceTeamImpactLeaderboards.mockResolvedValue(impactLeaderboards());
    mockBuildEliminationGameTrackerRoster.mockImplementation(
      async (_eliminationId: string, teamId: string) =>
        gameTrackerRosterFixture(teamId),
    );
    mockGetEliminationTeam.mockImplementation(
      async (_eliminationId: string, teamId: string) => ({
        id: teamId,
        name: teamId === "alpha" ? "Alpha" : "Beta",
        abbreviation: teamId.toUpperCase().slice(0, 3),
        managerId: `${teamId}-manager`,
        managerName: `${teamId} Manager`,
        colors: { primary: "#123456", secondary: "#abcdef" },
        stadium: `${teamId} Park`,
      }),
    );
    mockResolveManagerForTeam.mockImplementation(
      async ({ team }: { team: { id: string; name: string } }) => ({
        managerId: `${team.id}-manager`,
        managerName: `${team.name} Manager`,
      }),
    );
  });

  test("Leaders tab renders Team Impact and POG leaderboards for the current run", async () => {
    render(<EliminationHome />);

    fireEvent.click(await screen.findByRole("button", { name: /LEADERS/i }));

    const panel = await screen.findByTestId("team-impact-leaderboards");
    expect(mockGetInstanceTeamImpactLeaderboards).toHaveBeenCalledWith("elimination", "elim-1", 5);
    expect(within(panel).getByText("Team Impact / POG Leaders")).toBeInTheDocument();
    expect(within(panel).getByText("Team WPA")).toBeInTheDocument();
    expect(within(panel).getByText("Team POG Points")).toBeInTheDocument();
    expect(within(panel).getByText("Overall POG")).toBeInTheDocument();
    expect(within(panel).getByText("Best Manager")).toBeInTheDocument();
    expect(within(panel).getAllByText("Alpha Star").length).toBeGreaterThan(0);
    expect(within(panel).getByText("+50.0 pp")).toBeInTheDocument();
    expect(await screen.findByText("BATTING LEADERS")).toBeInTheDocument();
  });

  test("Leaders tab shows an honest empty impact leaderboard state", async () => {
    mockGetPlayoffLeaders.mockResolvedValue([]);
    mockGetInstanceTeamImpactLeaderboards.mockResolvedValue(emptyImpactLeaderboards());

    render(<EliminationHome />);

    fireEvent.click(await screen.findByRole("button", { name: /LEADERS/i }));

    const panel = await screen.findByTestId("team-impact-leaderboards");
    expect(
      within(panel).getByText("No Team Impact or POG leaderboard data yet."),
    ).toBeInTheDocument();
  });

  test("Team Impact leader failure does not block playoff leader sections", async () => {
    mockGetInstanceTeamImpactLeaderboards.mockRejectedValue(new Error("Impact service unavailable"));

    render(<EliminationHome />);

    fireEvent.click(await screen.findByRole("button", { name: /LEADERS/i }));

    const panel = await screen.findByTestId("team-impact-leaderboards");
    expect(within(panel).getByText("Team Impact leaders unavailable")).toBeInTheDocument();
    expect(within(panel).getByText("Impact service unavailable")).toBeInTheDocument();
    expect(await screen.findByText("BATTING LEADERS")).toBeInTheDocument();
    expect(screen.getByText("PITCHING LEADERS")).toBeInTheDocument();
    expect(screen.getByText("FIELDING LEADERS")).toBeInTheDocument();
    expect(screen.getAllByText(/Alpha Star/).length).toBeGreaterThan(0);
  });

  test("elimination launch carries bracket inning rules from metadata without franchise scope", async () => {
    mockGetElimination.mockResolvedValue({
      eliminationId: "elim-1",
      name: "Test Cup",
      leagueId: "league-1",
      leagueName: "Test League",
      teamsCount: 2,
      inningsPerGame: 7,
      currentRound: 1,
      status: "IN_PROGRESS",
    });
    mockGetPlayoffByElimination.mockResolvedValue({
      id: "playoff-1",
      sourceType: "elimination",
      seasonId: "elim-1",
      status: "IN_PROGRESS",
      teams: [
        playoffTeam("alpha", "Alpha"),
        playoffTeam("beta", "Beta"),
      ],
      teamsQualifying: 2,
      rounds: 1,
      gamesPerRound: [1],
      inningsPerGame: 4,
      useDH: true,
      liveBeatReporterEnabled: false,
      postGameColumnsEnabled: true,
      beatReporterEnabled: true,
    });
    mockGetSeriesByPlayoff.mockResolvedValue([
      {
        id: "series-1",
        playoffId: "playoff-1",
        round: 1,
        roundName: "Round 1",
        higherSeed: { teamId: "alpha", teamName: "Alpha", seed: 1 },
        lowerSeed: { teamId: "beta", teamName: "Beta", seed: 2 },
        status: "IN_PROGRESS",
        gamesRequired: 1,
        bestOf: 1,
        higherSeedWins: 0,
        lowerSeedWins: 0,
        games: [],
        createdAt: Date.now(),
      },
    ]);

    render(<EliminationHome />);

    expect(await screen.findByText(/7 INNINGS/i)).toBeInTheDocument();
    fireEvent.click(await screen.findByRole("button", { name: "PLAY GAME" }));

    await waitFor(() => expect(mockNavigate).toHaveBeenCalled());
    const state = mockNavigate.mock.calls.at(-1)?.[1]?.state;
    expect(state).toMatchObject({
      gameMode: "elimination",
      eliminationId: "elim-1",
      statsScopeId: "elimination-elim-1",
      competitionType: "elimination",
      competitionId: "elim-1",
      playoffId: "playoff-1",
      playoffSeriesId: "series-1",
      playoffGameNumber: 1,
      totalInnings: 7,
    });
    expect(state.franchiseId).toBeUndefined();
    expect(state.seasonId).toBeUndefined();
  });
});

function gameTrackerRosterFixture(teamId: string) {
  return {
    players: Array.from({ length: 9 }, (_, index) => ({
      playerId: `${teamId}-batter-${index + 1}`,
      name: `${teamId} Batter ${index + 1}`,
      position:
        ["C", "1B", "2B", "3B", "SS", "LF", "CF", "RF", "DH"][index] ||
        "DH",
      battingOrder: index + 1,
      stats: { ab: 0, h: 0, r: 0, rbi: 0, bb: 0, k: 0 },
      battingHand: "R",
    })),
    pitchers: [
      {
        playerId: `${teamId}-starter`,
        name: `${teamId} Starter`,
        stats: { ip: "0.0", h: 0, r: 0, er: 0, bb: 0, k: 0, pitches: 0 },
        throwingHand: "R",
        isStarter: true,
        isActive: true,
      },
    ],
    optimalLineups: {},
  };
}

function playoffTeam(teamId: string, teamName: string) {
  return {
    teamId,
    teamName,
    seed: teamId === "alpha" ? 1 : 2,
    league: "Test",
    regularSeasonRecord: { wins: 1, losses: 0 },
    eliminated: false,
  };
}

function playoffLeader(): PlayoffPlayerStats {
  return {
    playerId: "alpha-star",
    playerName: "Alpha Star",
    teamId: "alpha",
    games: 2,
    atBats: 8,
    hits: 4,
    homeRuns: 1,
    rbi: 3,
    runs: 2,
    stolenBases: 1,
    walks: 1,
    avg: 0.5,
    obp: 0.556,
    ops: 1.25,
    era: 2.25,
    inningsPitched: 8,
    wins: 1,
    pitchingStrikeouts: 7,
    whip: 1,
    saves: 0,
    fieldingWAR: 0.2,
    fieldingRunsSaved: 1,
    fieldingPlays: 5,
  } as PlayoffPlayerStats;
}

function impactLeaderboards(overrides: Partial<TeamImpactLeaderboards> = {}): TeamImpactLeaderboards {
  return {
    teamWpaLeaders: [
      {
        rank: 1,
        teamId: "alpha",
        teamName: "Alpha",
        games: 2,
        value: 0.5,
        perGameWpa: 0.25,
        identityLabel: "Lineup carried them",
      },
    ],
    teamPogPointsLeaders: [
      {
        rank: 1,
        teamId: "alpha",
        teamName: "Alpha",
        games: 2,
        points: 7,
        overallWins: 1,
        bestManagerWins: 1,
        mostDecoratedPlayer: {
          playerId: "alpha-star",
          playerName: "Alpha Star",
          points: 4,
        },
      },
    ],
    playerTotalWpaLeaders: [
      {
        rank: 1,
        playerId: "alpha-star",
        playerName: "Alpha Star",
        teamId: "alpha",
        teamName: "Alpha",
        games: 2,
        value: 0.4,
        perGameWpa: 0.2,
        roleSplit: roleWpa(0.4, 0.3),
        pogPoints: 4,
      },
    ],
    playerPogPointsLeaders: [
      {
        rank: 1,
        playerId: "alpha-star",
        playerName: "Alpha Star",
        teamId: "alpha",
        teamName: "Alpha",
        games: 2,
        points: 4,
        totalWpa: 0.4,
        perGameWpa: 0.2,
        roleSplit: roleWpa(0.4, 0.3),
        awardCounts: {
          overall: 1,
          bestHitter: 1,
          bestPitcher: 0,
          bestBaserunner: 0,
          bestFielder: 0,
        },
      },
    ],
    overallPogLeaders: [playerAward("alpha-star", "Alpha Star", "alpha", "Alpha", 1, 4)],
    bestHitterLeaders: [playerAward("alpha-star", "Alpha Star", "alpha", "Alpha", 1, 4)],
    bestPitcherLeaders: [],
    bestBaserunnerLeaders: [],
    bestFielderLeaders: [],
    bestManagerLeaders: [
      {
        rank: 1,
        teamId: "alpha",
        teamName: "Alpha",
        count: 1,
        managerValue: 0.12,
      },
    ],
    roleWpaLeaders: {
      batting: [
        {
          rank: 1,
          role: "batting",
          playerId: "alpha-star",
          playerName: "Alpha Star",
          teamId: "alpha",
          teamName: "Alpha",
          games: 2,
          value: 0.3,
          perGameWpa: 0.15,
          roleSplit: roleWpa(0.4, 0.3),
          pogPoints: 4,
        },
      ],
      pitching: [],
      defense: [],
      baserunning: [],
    },
    managerValueTeamLeaders: [
      {
        rank: 1,
        teamId: "alpha",
        teamName: "Alpha",
        games: 2,
        value: 0.12,
        managerWpa: {
          tacticalManagerWpa: 0.04,
          deploymentWpa: 0.03,
          lineupDeltaWpa: 0.05,
          managerValue: 0.12,
        },
        bestManagerWins: 1,
      },
    ],
    highLeverageWpaLeaders: [],
    dataQuality: {
      teamCount: 2,
      teamGameCount: 4,
      fullKblWpaTeamGames: 4,
      legacyAtBatWpaTeamGames: 0,
      storedPogTeamGames: 0,
      managerValueOnlyTeamGames: 0,
      unavailableTeamGames: 0,
      eventLogFailedTeamGames: 0,
      warnings: [],
    },
    ...overrides,
  };
}

function emptyImpactLeaderboards(): TeamImpactLeaderboards {
  return impactLeaderboards({
    teamWpaLeaders: [],
    teamPogPointsLeaders: [],
    playerTotalWpaLeaders: [],
    playerPogPointsLeaders: [],
    overallPogLeaders: [],
    bestHitterLeaders: [],
    bestPitcherLeaders: [],
    bestBaserunnerLeaders: [],
    bestFielderLeaders: [],
    bestManagerLeaders: [],
    roleWpaLeaders: {
      batting: [],
      pitching: [],
      defense: [],
      baserunning: [],
    },
    managerValueTeamLeaders: [],
    highLeverageWpaLeaders: [],
    dataQuality: {
      teamCount: 0,
      teamGameCount: 0,
      fullKblWpaTeamGames: 0,
      legacyAtBatWpaTeamGames: 0,
      storedPogTeamGames: 0,
      managerValueOnlyTeamGames: 0,
      unavailableTeamGames: 0,
      eventLogFailedTeamGames: 0,
      warnings: [],
    },
  });
}

function playerAward(
  playerId: string,
  playerName: string,
  teamId: string,
  teamName: string,
  count: number,
  pogPoints: number,
) {
  return {
    rank: 1,
    playerId,
    playerName,
    teamId,
    teamName,
    count,
    pogPoints,
  };
}

function roleWpa(total: number, batting = 0) {
  return {
    total,
    batting,
    pitching: 0,
    fielding: 0,
    baserunning: 0,
    catching: 0,
  };
}
