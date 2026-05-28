import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { EliminationTeamHub } from "../../app/components/EliminationTeamHub";
import type { EliminationRosterSnapshot } from "../../../utils/eliminationRosterStorage";
import type { Player } from "../../../utils/leagueBuilderStorage";
import type { PlayoffTeam } from "../../../utils/playoffStorage";
import type { TeamImpactSummary } from "../../../utils/teamImpact";

const {
  mockGetInstanceTeamImpactSummaries,
  mockEnsureEliminationRosterSnapshots,
  mockGetAllEliminationRosterSnapshots,
  mockGetEliminationRosterSnapshot,
  mockUpdateEliminationRosterSnapshot,
  mockLoadMojoFitnessSnapshots,
  mockSaveMojoFitnessSnapshots,
  mockResolveManagerForTeam,
  mockSaveManagerProfile,
} = vi.hoisted(() => ({
  mockGetInstanceTeamImpactSummaries: vi.fn(),
  mockEnsureEliminationRosterSnapshots: vi.fn(),
  mockGetAllEliminationRosterSnapshots: vi.fn(),
  mockGetEliminationRosterSnapshot: vi.fn(),
  mockUpdateEliminationRosterSnapshot: vi.fn(),
  mockLoadMojoFitnessSnapshots: vi.fn(),
  mockSaveMojoFitnessSnapshots: vi.fn(),
  mockResolveManagerForTeam: vi.fn(),
  mockSaveManagerProfile: vi.fn(),
}));

vi.mock("../../../utils/teamImpact", () => ({
  getInstanceTeamImpactSummaries: mockGetInstanceTeamImpactSummaries,
}));

vi.mock("../../../utils/eliminationRosterStorage", () => ({
  ensureEliminationRosterSnapshots: mockEnsureEliminationRosterSnapshots,
  getAllEliminationRosterSnapshots: mockGetAllEliminationRosterSnapshots,
  getEliminationRosterSnapshot: mockGetEliminationRosterSnapshot,
  isEliminationPitcher: (player: Player) =>
    player.isPitcher === true ||
    String(player.primaryPosition ?? "").toUpperCase() === "P" ||
    String(player.pitcherRole ?? player.role ?? "").toUpperCase().includes("P"),
  getNormalizedEliminationLineup: (snapshot: EliminationRosterSnapshot) => snapshot.lineup,
  getNormalizedEliminationRotation: (snapshot: EliminationRosterSnapshot) => snapshot.startingRotation,
  updateEliminationRosterSnapshot: mockUpdateEliminationRosterSnapshot,
}));

vi.mock("../../../utils/mojoFitnessStorage", () => ({
  loadMojoFitnessSnapshots: mockLoadMojoFitnessSnapshots,
  saveMojoFitnessSnapshots: mockSaveMojoFitnessSnapshots,
}));

vi.mock("../../../utils/managerIdentityStorage", () => ({
  resolveManagerForTeam: mockResolveManagerForTeam,
  saveManagerProfile: mockSaveManagerProfile,
}));

const teams: PlayoffTeam[] = [
  {
    teamId: "alpha",
    teamName: "Alpha",
    seed: 1,
    league: "Eastern",
    regularSeasonRecord: { wins: 10, losses: 4 },
    eliminated: false,
  },
  {
    teamId: "beta",
    teamName: "Beta",
    seed: 2,
    league: "Western",
    regularSeasonRecord: { wins: 9, losses: 5 },
    eliminated: false,
  },
];

describe("EliminationTeamHub Team Impact", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEnsureEliminationRosterSnapshots.mockResolvedValue({
      requestedTeamIds: ["alpha", "beta"],
      existingTeamIds: ["alpha", "beta"],
      createdTeamIds: [],
      missingTeamIds: [],
      failures: [],
    });
    mockGetAllEliminationRosterSnapshots.mockResolvedValue([
      rosterSnapshot("alpha", "Alpha"),
      rosterSnapshot("beta", "Beta"),
    ]);
    mockGetEliminationRosterSnapshot.mockImplementation(
      async (_eliminationId: string, teamId: string) =>
        rosterSnapshot(teamId, teamId === "beta" ? "Beta" : "Alpha"),
    );
    mockUpdateEliminationRosterSnapshot.mockResolvedValue(undefined);
    mockLoadMojoFitnessSnapshots.mockResolvedValue([]);
    mockSaveMojoFitnessSnapshots.mockResolvedValue(undefined);
    mockResolveManagerForTeam.mockResolvedValue({
      profile: {
        id: "manager-alpha",
        displayName: "Casey Skipper",
        gender: "F",
        age: 42,
        hometown: "Portland",
        managementStyle: { label: "Measured" },
      },
    });
    mockSaveManagerProfile.mockImplementation(async (profile) => profile);
    mockGetInstanceTeamImpactSummaries.mockResolvedValue([fullSummary()]);
  });

  test("renders the Team Impact loading state", async () => {
    mockGetInstanceTeamImpactSummaries.mockReturnValue(new Promise(() => {}));

    render(<EliminationTeamHub eliminationId="elim-1" teams={teams} useDH />);

    expect(await screen.findByText(/LOADING TEAM IMPACT/i)).toBeInTheDocument();
  });

  test("renders an empty state when the selected team has no completed games", async () => {
    mockGetInstanceTeamImpactSummaries.mockResolvedValue([]);

    render(<EliminationTeamHub eliminationId="elim-1" teams={teams} useDH />);

    expect(
      await screen.findByText(/No completed games yet for this team/i),
    ).toBeInTheDocument();
  });

  test("renders full Team Impact context, POG points, and player leaders", async () => {
    render(<EliminationTeamHub eliminationId="elim-1" teams={teams} useDH />);

    const panel = await screen.findByTestId("team-impact-panel");
    expect(within(panel).getByText("TEAM WPA")).toBeInTheDocument();
    expect(within(panel).getByText("+35.0 pp")).toBeInTheDocument();
    expect(within(panel).getAllByText(/2nd of 4/i)).toHaveLength(2);
    expect(within(panel).getByText(/bracket avg \+10\.0 pp/i)).toBeInTheDocument();
    expect(within(panel).getByText(/\+17\.5 pp per game/i)).toBeInTheDocument();
    expect(within(panel).getByText("Lineup carried them")).toBeInTheDocument();
    expect(within(panel).getByText("POG POINTS")).toBeInTheDocument();
    expect(within(panel).getByText("6 pts")).toBeInTheDocument();
    expect(within(panel).getByText(/Most decorated: Dana Dunn, 4 pts/i)).toBeInTheDocument();

    const leader = within(panel).getByTestId("team-impact-player-alpha-star");
    expect(within(leader).getByText("Dana Dunn")).toBeInTheDocument();
    expect(within(leader).getByText(/Total \+28\.0 pp/i)).toBeInTheDocument();
    expect(within(leader).getByText(/High leverage WPA \+11\.0 pp/i)).toBeInTheDocument();
    expect(within(leader).getByText(/Best play \+18\.0 pp/i)).toBeInTheDocument();
  });

  test("renders partial data warnings honestly", async () => {
    mockGetInstanceTeamImpactSummaries.mockResolvedValue([storedOnlySummary()]);

    render(<EliminationTeamHub eliminationId="elim-1" teams={teams} useDH />);

    const panel = await screen.findByTestId("team-impact-panel");
    expect(
      within(panel).getByText("1 game(s) use stored legacy POG only."),
    ).toBeInTheDocument();
    expect(
      within(panel).getByText(/Player WPA detail is unavailable/i),
    ).toBeInTheDocument();
    expect(within(panel).getByText("Legacy Hero")).toBeInTheDocument();
    expect(within(panel).queryByText("Batting WPA")).not.toBeInTheDocument();
  });

  test("changes the displayed impact summary when another team is selected", async () => {
    mockGetInstanceTeamImpactSummaries.mockResolvedValue([
      fullSummary(),
      fullSummary({
        teamId: "beta",
        teamName: "Beta",
        playerWpa: {
          total: 0.42,
          batting: 0.12,
          pitching: 0.24,
          fielding: 0.04,
          baserunning: 0.01,
          catching: 0.01,
        },
        benchmarks: {
          totalPlayerWpaRank: 1,
          teamCount: 4,
          instanceAverageTotalPlayerWpa: 0.1,
          perGameTotalPlayerWpa: 0.21,
          identityLabel: "Pitching carried them",
        },
        playerLeaders: [
          {
            playerId: "beta-bolt",
            playerName: "Beta Bolt",
            teamId: "beta",
            games: 2,
            wpa: {
              total: 0.31,
              batting: 0.04,
              pitching: 0.25,
              fielding: 0.02,
              baserunning: 0,
              catching: 0,
            },
            pogPoints: 5,
            perGameWpa: 0.155,
            awards: {
              overall: 1,
              bestHitter: 0,
              bestPitcher: 2,
              bestBaserunner: 0,
              bestFielder: 0,
            },
          },
        ],
      }),
    ]);

    render(<EliminationTeamHub eliminationId="elim-1" teams={teams} useDH />);

    expect(await screen.findByTestId("team-impact-player-alpha-star")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Beta/i }));

    await waitFor(() => {
      const panel = screen.getByTestId("team-impact-panel");
      expect(within(panel).getByText("+42.0 pp")).toBeInTheDocument();
      expect(within(panel).getByText("Beta Bolt")).toBeInTheDocument();
      expect(within(panel).getByText("Pitching carried them")).toBeInTheDocument();
    });
  });

  test("repairs a missing selected-team snapshot before showing the missing state", async () => {
    let betaReads = 0;
    mockGetAllEliminationRosterSnapshots.mockResolvedValue([rosterSnapshot("alpha", "Alpha")]);
    mockGetEliminationRosterSnapshot.mockImplementation(
      async (_eliminationId: string, teamId: string) => {
        if (teamId === "beta") {
          betaReads += 1;
          return betaReads === 1 ? null : rosterSnapshot("beta", "Beta");
        }
        return rosterSnapshot("alpha", "Alpha");
      },
    );
    mockEnsureEliminationRosterSnapshots.mockResolvedValue({
      requestedTeamIds: ["beta"],
      existingTeamIds: ["beta"],
      createdTeamIds: ["beta"],
      missingTeamIds: [],
      failures: [],
    });

    render(<EliminationTeamHub eliminationId="elim-1" teams={teams} useDH />);

    expect(await screen.findByTestId("team-impact-player-alpha-star")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Beta/i }));

    await waitFor(() => {
      expect(mockEnsureEliminationRosterSnapshots).toHaveBeenCalledWith("elim-1", ["beta"]);
      expect(mockGetEliminationRosterSnapshot).toHaveBeenCalledWith("elim-1", "beta");
    });
    await waitFor(() => {
      expect(screen.queryByText(/No roster snapshot found for this team/i)).not.toBeInTheDocument();
    });
  });
});

function fullSummary(overrides: Partial<TeamImpactSummary> = {}): TeamImpactSummary {
  return {
    mode: "elimination",
    instanceId: "elim-1",
    teamId: "alpha",
    teamName: "Alpha",
    games: 2,
    playerWpa: {
      total: 0.35,
      batting: 0.2,
      pitching: 0.1,
      fielding: 0.03,
      baserunning: 0.01,
      catching: 0.01,
    },
    managerWpa: {
      tacticalManagerWpa: 0.02,
      deploymentWpa: 0.01,
      lineupDeltaWpa: 0.02,
      managerValue: 0.05,
    },
    pog: {
      points: 6,
      rank: 2,
      teamCount: 4,
      overallWins: 1,
      bestHitter: 1,
      bestPitcher: 1,
      bestBaserunner: 0,
      bestFielder: 1,
      bestManager: 1,
      bestManagerWins: 1,
      mostDecoratedPlayer: {
        playerId: "alpha-star",
        playerName: "Dana Dunn",
        points: 4,
      },
    },
    benchmarks: {
      totalPlayerWpaRank: 2,
      teamCount: 4,
      instanceAverageTotalPlayerWpa: 0.1,
      perGameTotalPlayerWpa: 0.175,
      identityLabel: "Lineup carried them",
    },
    playerLeaders: [
      {
        playerId: "alpha-star",
        playerName: "Dana Dunn",
        teamId: "alpha",
        games: 2,
        wpa: {
          total: 0.28,
          batting: 0.18,
          pitching: 0,
          fielding: 0.06,
          baserunning: 0.02,
          catching: 0.02,
        },
        pogPoints: 4,
        perGameWpa: 0.14,
        awards: {
          overall: 1,
          bestHitter: 1,
          bestPitcher: 0,
          bestBaserunner: 0,
          bestFielder: 1,
        },
        biggestPositivePlay: {
          gameId: "game-1",
          eventId: "event-1",
          value: 0.18,
          label: "Dana Dunn HR vs Riley Ray",
          inningLabel: "Bot 8",
          leverageIndex: 2.1,
        },
        biggestNegativePlay: {
          gameId: "game-2",
          eventId: "event-2",
          value: -0.05,
          label: "Dana Dunn K vs Riley Ray",
          inningLabel: "Top 5",
          leverageIndex: 1.4,
        },
        highLeverageWpa: 0.11,
      },
    ],
    dataQuality: {
      fullKblWpaGames: 2,
      legacyAtBatWpaGames: 0,
      storedPogGames: 0,
      managerValueOnlyGames: 0,
      unavailableGames: 0,
      eventLogFailedGames: 0,
      warnings: [],
    },
    ...overrides,
  };
}

function storedOnlySummary(): TeamImpactSummary {
  return fullSummary({
    games: 1,
    playerWpa: {
      total: 0,
      batting: 0,
      pitching: 0,
      fielding: 0,
      baserunning: 0,
      catching: 0,
    },
    managerWpa: {
      tacticalManagerWpa: 0,
      deploymentWpa: 0,
      lineupDeltaWpa: 0,
      managerValue: 0,
    },
    pog: {
      points: 3,
      rank: 1,
      teamCount: 2,
      overallWins: 1,
      bestHitter: 0,
      bestPitcher: 0,
      bestBaserunner: 0,
      bestFielder: 0,
      bestManager: 0,
      bestManagerWins: 0,
      mostDecoratedPlayer: {
        playerId: "legacy-hero",
        playerName: "Legacy Hero",
        points: 3,
      },
    },
    benchmarks: {
      totalPlayerWpaRank: 0,
      teamCount: 2,
      instanceAverageTotalPlayerWpa: 0,
      perGameTotalPlayerWpa: 0,
      identityLabel: "Impact detail unavailable",
    },
    playerLeaders: [
      {
        playerId: "legacy-hero",
        playerName: "Legacy Hero",
        teamId: "alpha",
        games: 1,
        wpa: {
          total: 0,
          batting: 0,
          pitching: 0,
          fielding: 0,
          baserunning: 0,
          catching: 0,
        },
        pogPoints: 3,
        perGameWpa: 0,
        awards: {
          overall: 1,
          bestHitter: 0,
          bestPitcher: 0,
          bestBaserunner: 0,
          bestFielder: 0,
        },
      },
    ],
    dataQuality: {
      fullKblWpaGames: 0,
      legacyAtBatWpaGames: 0,
      storedPogGames: 1,
      managerValueOnlyGames: 0,
      unavailableGames: 0,
      eventLogFailedGames: 0,
      warnings: ["1 game(s) use stored legacy POG only."],
    },
  });
}

function rosterSnapshot(teamId: string, teamName: string): EliminationRosterSnapshot {
  return {
    key: `elim-1:${teamId}`,
    eliminationId: "elim-1",
    teamId,
    teamName,
    players: [
      player(`${teamId}-bat`, "Dana", "Dunn", "SS"),
      player(`${teamId}-arm`, "Riley", "Ray", "SP"),
    ],
    lineup: [{ battingOrder: 1, playerId: `${teamId}-bat`, fieldingPosition: "SS" }],
    lineupWithoutDH: [{ battingOrder: 1, playerId: `${teamId}-bat`, fieldingPosition: "SS" }],
    startingRotation: [`${teamId}-arm`],
    snapshotAt: 1,
  };
}

function player(
  id: string,
  firstName: string,
  lastName: string,
  primaryPosition: Player["primaryPosition"],
): Player {
  return {
    id,
    firstName,
    lastName,
    gender: "F",
    age: 28,
    bats: "R",
    throws: "R",
    primaryPosition,
    power: 70,
    contact: 70,
    speed: 60,
    fielding: 65,
    arm: 65,
    velocity: 60,
    junk: 60,
    accuracy: 60,
    arsenal: ["4F"],
    overallGrade: "A",
    personality: "Competitive",
    chemistry: "Competitive",
    morale: 75,
    mojo: "Normal",
    fame: 0,
    salary: 5,
    createdDate: "2026-01-01",
    lastModified: "2026-01-01",
    isCustom: false,
  };
}
