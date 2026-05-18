import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, test, vi } from "vitest";

import type { CompletedGameRecord } from "../../../utils/gameStorage";
import type { Team } from "../../../utils/leagueBuilderStorage";
import type { TeamImpactSummary } from "../../../utils/teamImpact";

const {
  mockGetAllCompletedGames,
  mockGetArchiveInstanceMode,
  mockGetEliminationTeam,
  mockGetManagerTeamTenures,
  mockGetTeamImpactSummary,
  mockGetTeam,
  mockGetTeamRosterFromGames,
} = vi.hoisted(() => ({
  mockGetAllCompletedGames: vi.fn(),
  mockGetArchiveInstanceMode: vi.fn(),
  mockGetEliminationTeam: vi.fn(),
  mockGetManagerTeamTenures: vi.fn(),
  mockGetTeamImpactSummary: vi.fn(),
  mockGetTeam: vi.fn(),
  mockGetTeamRosterFromGames: vi.fn(),
}));

vi.mock("../../../utils/almanacQueries", () => ({
  getArchiveInstanceMode: mockGetArchiveInstanceMode,
  getManagerTeamTenures: mockGetManagerTeamTenures,
  getTeamRosterFromGames: mockGetTeamRosterFromGames,
}));

vi.mock("../../../utils/eliminationPlayerStorage", () => ({
  getEliminationTeam: mockGetEliminationTeam,
}));

vi.mock("../../../utils/gameStorage", () => ({
  getAllCompletedGames: mockGetAllCompletedGames,
}));

vi.mock("../../../utils/leagueBuilderStorage", () => ({
  getTeam: mockGetTeam,
}));

vi.mock("../../../utils/teamImpact", () => ({
  getTeamImpactSummary: mockGetTeamImpactSummary,
}));

import { TeamPage } from "../../app/pages/TeamPage";

function createTeam(overrides: Partial<Team> = {}): Team {
  return {
    id: "team-a",
    name: "Frozen City Owls",
    abbreviation: "FCO",
    location: "Frozen City",
    nickname: "Owls",
    colors: {
      primary: "#102030",
      secondary: "#405060",
      accent: "#708090",
    },
    logoUrl: "https://example.test/frozen-owls.png",
    stadium: "Frozen Park",
    leagueIds: ["league-1"],
    createdDate: "2026-05-01T00:00:00.000Z",
    lastModified: "2026-05-01T00:00:00.000Z",
    ...overrides,
  };
}

function createCompletedGame(
  overrides: Partial<CompletedGameRecord> = {},
): CompletedGameRecord {
  return {
    gameId: "game-1",
    date: Date.UTC(2026, 4, 1),
    competitionType: "elimination",
    competitionId: "elim-run-1",
    stadiumName: "Archived Park",
    awayTeamId: "team-b",
    homeTeamId: "team-a",
    awayTeamName: "Road Club",
    homeTeamName: "Archived City Owls",
    finalScore: { away: 2, home: 5 },
    innings: 9,
    fameEvents: [],
    playerStats: {},
    pitcherGameStats: [],
    ...overrides,
  } as CompletedGameRecord;
}

function renderTeamPage(runId = "elim-run-1", teamId = "team-a") {
  return render(
    <MemoryRouter initialEntries={[`/almanac/teams/${runId}/${teamId}`]}>
      <Routes>
        <Route path="/almanac/teams/:leagueId/:teamId" element={<TeamPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

function createImpactSummary(overrides: Partial<TeamImpactSummary> = {}): TeamImpactSummary {
  return {
    mode: "exhibition",
    instanceId: "league-1",
    teamId: "team-a",
    teamName: "Frozen City Owls",
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
        teamId: "team-a",
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
      {
        playerId: "quiet",
        playerName: "Quiet Contributor",
        teamId: "team-a",
        games: 1,
        wpa: {
          total: 0.07,
          batting: 0.02,
          pitching: 0.05,
          fielding: 0,
          baserunning: 0,
          catching: 0,
        },
        pogPoints: 1,
        perGameWpa: 0.07,
        awards: {
          overall: 0,
          bestHitter: 0,
          bestPitcher: 1,
          bestBaserunner: 0,
          bestFielder: 0,
        },
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

function createStoredOnlySummary(): TeamImpactSummary {
  return createImpactSummary({
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
        teamId: "team-a",
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

describe("TeamPage almanac identity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAllCompletedGames.mockResolvedValue([]);
    mockGetArchiveInstanceMode.mockResolvedValue("exhibition");
    mockGetEliminationTeam.mockResolvedValue(null);
    mockGetManagerTeamTenures.mockResolvedValue([]);
    mockGetTeamImpactSummary.mockResolvedValue(null);
    mockGetTeam.mockResolvedValue(createTeam());
    mockGetTeamRosterFromGames.mockResolvedValue([]);
  });

  test("renders frozen elimination identity from the copied team DB", async () => {
    mockGetArchiveInstanceMode.mockResolvedValue("elimination");
    mockGetEliminationTeam.mockResolvedValue(
      createTeam({
        name: "Frozen City Owls",
        abbreviation: "FCO",
        location: "Frozen City",
        nickname: "Owls",
        colors: {
          primary: "#112244",
          secondary: "#AA5500",
          accent: "#CCDDEE",
        },
        logoUrl: "https://example.test/frozen.png",
        stadium: "Frozen Park",
      }),
    );
    mockGetTeam.mockResolvedValue(
      createTeam({
        name: "Mutated City Drifters",
        abbreviation: "MCD",
        location: "Mutated City",
        nickname: "Drifters",
        colors: {
          primary: "#FF00FF",
          secondary: "#00FFFF",
        },
        logoUrl: "https://example.test/live.png",
        stadium: "Mutated Dome",
      }),
    );

    renderTeamPage();

    expect(
      await screen.findByRole("heading", { name: "FROZEN CITY OWLS" }),
    ).toBeInTheDocument();
    expect(screen.getByText("FCO")).toBeInTheDocument();
    expect(screen.getByText("FROZEN PARK")).toBeInTheDocument();
    expect(screen.getByAltText("Frozen City Owls logo")).toHaveAttribute(
      "src",
      "https://example.test/frozen.png",
    );
    expect(screen.getByTestId("team-color-accent").getAttribute("style")).toContain(
      "rgb(17, 34, 68)",
    );
    expect(screen.queryByText("MUTATED CITY DRIFTERS")).not.toBeInTheDocument();
    expect(screen.queryByText("MUTATED DOME")).not.toBeInTheDocument();
    expect(mockGetTeam).not.toHaveBeenCalled();
  });

  test("falls back to completed-game names and stadium for old elimination history", async () => {
    mockGetArchiveInstanceMode.mockResolvedValue("elimination");
    mockGetEliminationTeam.mockResolvedValue(null);
    mockGetAllCompletedGames.mockResolvedValue([
      createCompletedGame({
        homeTeamName: "Archived City Owls",
        stadiumName: "Archived Park",
      }),
    ]);
    mockGetTeam.mockResolvedValue(
      createTeam({
        name: "Live City Drifters",
        location: "Live City",
        nickname: "Drifters",
        stadium: "Live Dome",
      }),
    );

    renderTeamPage();

    expect(
      await screen.findByRole("heading", { name: "ARCHIVED CITY OWLS" }),
    ).toBeInTheDocument();
    expect(screen.getByText("ARCHIVED PARK")).toBeInTheDocument();
    expect(screen.queryByText("LIVE CITY DRIFTERS")).not.toBeInTheDocument();
    expect(screen.queryByText("LIVE DOME")).not.toBeInTheDocument();
    expect(mockGetTeam).not.toHaveBeenCalled();
  });

  test("keeps non-elimination Team Page on live League Builder identity", async () => {
    mockGetArchiveInstanceMode.mockResolvedValue("exhibition");
    mockGetTeam.mockResolvedValue(
      createTeam({
        id: "team-live",
        name: "Live City Drifters",
        abbreviation: "LCD",
        location: "Live City",
        nickname: "Drifters",
        colors: {
          primary: "#CC3300",
          secondary: "#0033CC",
        },
        logoUrl: "https://example.test/live.png",
        stadium: "Live Dome",
      }),
    );

    renderTeamPage("league-1", "team-live");

    expect(
      await screen.findByRole("heading", { name: "LIVE CITY DRIFTERS" }),
    ).toBeInTheDocument();
    expect(screen.getByText("LCD")).toBeInTheDocument();
    expect(screen.getByText("LIVE DOME")).toBeInTheDocument();
    expect(screen.getByTestId("team-color-accent").getAttribute("style")).toContain(
      "rgb(204, 51, 0)",
    );
    expect(mockGetEliminationTeam).not.toHaveBeenCalled();
  });

  test("exhibition TeamPage renders Team Impact from the shared helper", async () => {
    mockGetArchiveInstanceMode.mockResolvedValue("exhibition");
    mockGetTeamImpactSummary.mockResolvedValue(createImpactSummary());

    renderTeamPage("league-1", "team-a");

    expect(await screen.findByRole("heading", { name: "TEAM IMPACT" })).toBeInTheDocument();
    expect(await screen.findByText("LINEUP CARRIED THEM")).toBeInTheDocument();
    expect(mockGetTeamImpactSummary).toHaveBeenCalledWith("exhibition", "league-1", "team-a");
    expect(screen.getByText("TEAM WPA")).toBeInTheDocument();
    expect(screen.getByText("+0.350")).toBeInTheDocument();
    expect(screen.getAllByText(/2ND OF 4/)).toHaveLength(2);
    expect(screen.getByText(/INSTANCE AVG \+0\.100/)).toBeInTheDocument();
    expect(screen.getByText("POG POINTS")).toBeInTheDocument();
    expect(screen.getByText("6 PTS")).toBeInTheDocument();
    expect(screen.getByText(/MOST DECORATED: DANA DUNN, 4 PTS/)).toBeInTheDocument();
    expect(screen.getByText("Dana Dunn")).toBeInTheDocument();
    expect(screen.getByText(/TOTAL \+0\.280/)).toBeInTheDocument();
    expect(screen.getByText(/BEST PLAY: \+0\.180/)).toBeInTheDocument();
    expect(screen.getByText(/HIGH LEVERAGE WPA \+0\.110/)).toBeInTheDocument();
  });

  test("archived elimination TeamPage renders Team Impact from the shared helper", async () => {
    mockGetArchiveInstanceMode.mockResolvedValue("elimination");
    mockGetEliminationTeam.mockResolvedValue(createTeam());
    mockGetTeamImpactSummary.mockResolvedValue(
      createImpactSummary({
        mode: "elimination",
        instanceId: "elim-run-1",
      }),
    );

    renderTeamPage("elim-run-1", "team-a");

    expect(await screen.findByRole("heading", { name: "TEAM IMPACT" })).toBeInTheDocument();
    expect(await screen.findByText("+0.350")).toBeInTheDocument();
    expect(mockGetTeamImpactSummary).toHaveBeenCalledWith("elimination", "elim-run-1", "team-a");
  });

  test("empty Team Impact state is honest when no summary exists", async () => {
    mockGetArchiveInstanceMode.mockResolvedValue("exhibition");
    mockGetTeamImpactSummary.mockResolvedValue(null);

    renderTeamPage("league-1", "team-a");

    expect(
      await screen.findByText("NO TEAM IMPACT SUMMARY AVAILABLE FOR THIS INSTANCE YET."),
    ).toBeInTheDocument();
  });

  test("partial Team Impact warnings render without full role detail", async () => {
    mockGetArchiveInstanceMode.mockResolvedValue("exhibition");
    mockGetTeamImpactSummary.mockResolvedValue(createStoredOnlySummary());

    renderTeamPage("league-1", "team-a");

    expect(
      await screen.findByText("1 game(s) use stored legacy POG only."),
    ).toBeInTheDocument();
    expect(screen.getByText("PLAYER WPA DETAIL IS UNAVAILABLE FOR THIS TEAM.")).toBeInTheDocument();
    expect(screen.getByText("Legacy Hero")).toBeInTheDocument();
    expect(screen.queryByText("BATTING WPA")).not.toBeInTheDocument();
  });

  test("player leaders render play context only when present", async () => {
    mockGetArchiveInstanceMode.mockResolvedValue("exhibition");
    mockGetTeamImpactSummary.mockResolvedValue(createImpactSummary());

    renderTeamPage("league-1", "team-a");

    expect(await screen.findByText("Dana Dunn")).toBeInTheDocument();
    expect(screen.getByText(/BEST PLAY: \+0\.180/)).toBeInTheDocument();
    expect(screen.getByText(/COSTLIEST: -0\.050/)).toBeInTheDocument();
    expect(screen.getByText("Quiet Contributor")).toBeInTheDocument();
    expect(screen.getAllByText(/BEST PLAY:/)).toHaveLength(1);
    expect(screen.getAllByText(/HIGH LEVERAGE WPA/)).toHaveLength(1);
  });

  test("franchise TeamPage does not call unsupported Team Impact aggregation", async () => {
    mockGetArchiveInstanceMode.mockResolvedValue("franchise");

    renderTeamPage("franchise-1", "team-a");

    expect(
      await screen.findByText("TEAM IMPACT IS NOT AVAILABLE FOR FRANCHISE TEAM PAGES YET."),
    ).toBeInTheDocument();
    expect(mockGetTeamImpactSummary).not.toHaveBeenCalled();
  });

  test("keeps manager tenure and roster sections intact", async () => {
    mockGetArchiveInstanceMode.mockResolvedValue("exhibition");
    mockGetManagerTeamTenures.mockResolvedValue([
      {
        managerId: "manager-1",
        managerName: "Casey Skipper",
        teamId: "team-a",
        teamName: "Frozen City Owls",
        mode: "exhibition",
        instanceId: "league-1",
        instanceName: "League One",
        gamesManaged: 2,
        wins: 2,
        losses: 0,
        tacticalManagerWpa: 0.12,
        deploymentWpa: 0.03,
        lineupDeltaWpa: 0.04,
        managerValue: 0.19,
        decisionCount: 3,
        tacticalDecisionCount: 2,
        deploymentStintCount: 1,
        lineupDecisionCount: 1,
        resolvedDecisionCount: 3,
        pendingDecisionCount: 0,
        lineupDeltaDetails: [],
        tendencies: {
          decisionTypeCounts: {},
          tacticalDecisionCount: 2,
          lineupDecisionCount: 1,
          stealRate: 0,
          buntRate: 0,
          bullpenAggressiveness: 0,
          pinchHitRate: 0,
          pinchRunRate: 0,
          intentionalWalkRate: 0,
          defensiveSubRate: 0,
          lineupConstructionRate: 0,
        },
      },
    ]);
    mockGetTeamRosterFromGames.mockResolvedValue([
      {
        playerId: "player-1",
        playerName: "Maya Vega",
        canonicalId: "canon-1",
        instanceId: "league-1",
        games: 2,
      },
    ]);

    renderTeamPage("league-1", "team-a");

    expect(await screen.findByText("Casey Skipper")).toBeInTheDocument();
    expect(screen.getByText("2-0")).toBeInTheDocument();
    expect(screen.getByText("+0.190")).toBeInTheDocument();
    expect(screen.getByText("Maya Vega")).toBeInTheDocument();
    expect(screen.getByText("ROSTER")).toBeInTheDocument();
  });
});
