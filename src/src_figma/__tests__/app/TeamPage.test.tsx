import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, test, vi } from "vitest";

import type { CompletedGameRecord } from "../../../utils/gameStorage";
import type { Team } from "../../../utils/leagueBuilderStorage";

const {
  mockGetAllCompletedGames,
  mockGetArchiveInstanceMode,
  mockGetEliminationTeam,
  mockGetManagerTeamTenures,
  mockGetTeam,
  mockGetTeamRosterFromGames,
} = vi.hoisted(() => ({
  mockGetAllCompletedGames: vi.fn(),
  mockGetArchiveInstanceMode: vi.fn(),
  mockGetEliminationTeam: vi.fn(),
  mockGetManagerTeamTenures: vi.fn(),
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

describe("TeamPage almanac identity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAllCompletedGames.mockResolvedValue([]);
    mockGetArchiveInstanceMode.mockResolvedValue("exhibition");
    mockGetEliminationTeam.mockResolvedValue(null);
    mockGetManagerTeamTenures.mockResolvedValue([]);
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
});
