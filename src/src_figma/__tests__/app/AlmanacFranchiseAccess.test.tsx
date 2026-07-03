import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { BrowserRouter } from "react-router-dom";
import { beforeEach, describe, expect, test, vi } from "vitest";

import App from "../../../App";
import { AlmanacHome } from "../../app/pages/AlmanacHome";
import { PlayerDirectory } from "../../app/pages/PlayerDirectory";

const mockSearchCanonicalPlayers = vi.fn();
const mockGetCanonicalPlayer = vi.fn();
const mockGetAllTeams = vi.fn();
const mockBackfillCanonicalPlayers = vi.fn();
const mockSearchArchivedPlayerInstances = vi.fn();

vi.mock("../../../utils/almanacStorage", () => ({
  searchCanonicalPlayers: (...args: unknown[]) =>
    mockSearchCanonicalPlayers(...args),
  getCanonicalPlayer: (...args: unknown[]) => mockGetCanonicalPlayer(...args),
}));

vi.mock("../../../utils/leagueBuilderStorage", () => ({
  getAllTeams: (...args: unknown[]) => mockGetAllTeams(...args),
}));

vi.mock("../../../utils/registerAlmanacPlayers", () => ({
  backfillCanonicalPlayers: (...args: unknown[]) =>
    mockBackfillCanonicalPlayers(...args),
}));

vi.mock("../../../utils/almanacQueries", () => ({
  searchArchivedPlayerInstances: (...args: unknown[]) =>
    mockSearchArchivedPlayerInstances(...args),
}));

vi.mock("../../app/pages/GameBrowser", () => ({
  GameBrowser: () => (
    <div>
      <h1>FRANCHISE GAMES</h1>
      <p>Mounted app franchise archive route</p>
    </div>
  ),
}));

vi.mock("../../app/pages/LeagueBuilderDraftSetup", () => ({
  LeagueBuilderDraftSetup: () => <h1>MERGED DRAFT ROOM</h1>,
}));

describe("Almanac franchise access", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearchCanonicalPlayers.mockResolvedValue([]);
    mockGetCanonicalPlayer.mockResolvedValue(null);
    mockGetAllTeams.mockResolvedValue([]);
    mockBackfillCanonicalPlayers.mockResolvedValue(undefined);
    mockSearchArchivedPlayerInstances.mockResolvedValue([]);
    window.history.pushState({}, "", "/");
  });

  test("Franchise section links to archive-backed evidence instead of only Coming Soon copy", async () => {
    render(
      <MemoryRouter>
        <AlmanacHome />
      </MemoryRouter>,
    );

    expect(screen.getByText("FRANCHISE")).toBeInTheDocument();
    expect(
      screen.getByText(/ARCHIVE-BACKED FRANCHISE GAMES/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /FRANCHISE GAME ARCHIVE/i }),
    ).toHaveAttribute("href", "/almanac/franchise");
    expect(
      screen.getByRole("link", { name: /FRANCHISE PLAYER SEARCH/i }),
    ).toHaveAttribute("href", "/almanac/players?mode=franchise");
    expect(screen.queryByText(/^COMING SOON$/i)).not.toBeInTheDocument();

    await waitFor(() => expect(mockBackfillCanonicalPlayers).toHaveBeenCalled());
  });

  test("franchise player directory searches franchise instances without mixing exhibition evidence", async () => {
    mockSearchCanonicalPlayers.mockResolvedValue([
      {
        canonicalId: "canon-franchise",
        playerName: "Franchise Ace",
        hometown: { city: "Denver", state: "CO" },
        instances: [
          {
            mode: "franchise",
            instanceId: "franchise-1",
            instanceName: "Smoke Franchise",
            playerIdInInstance: "player-franchise",
          },
        ],
      },
      {
        canonicalId: "canon-exhibition",
        playerName: "Exhibition Ace",
        hometown: { city: "Austin", state: "TX" },
        instances: [
          {
            mode: "exhibition",
            instanceId: "league-1",
            instanceName: "Exhibition League",
            playerIdInInstance: "player-exhibition",
          },
        ],
      },
    ]);
    mockSearchArchivedPlayerInstances.mockResolvedValue([
      {
        playerId: "archive-franchise",
        playerName: "Archive Franchise Ace",
        leagueId: "franchise-1",
        instanceId: "franchise-1",
        canonicalId: "archive-franchise",
        teamId: "team-a",
        teamName: "Franchise Team",
        games: 1,
        mode: "franchise",
      },
    ]);

    render(
      <MemoryRouter initialEntries={["/almanac/players?mode=franchise&q=Ace"]}>
        <Routes>
          <Route path="/almanac/players" element={<PlayerDirectory />} />
        </Routes>
      </MemoryRouter>,
    );

    expect(await screen.findByText("Franchise Ace")).toBeInTheDocument();
    expect(screen.getByText("Archive Franchise Ace")).toBeInTheDocument();
    expect(screen.queryByText("Exhibition Ace")).not.toBeInTheDocument();
    expect(mockSearchArchivedPlayerInstances).toHaveBeenCalledWith("Ace", [
      "franchise",
    ]);
    expect(screen.getByText(/FRANCHISE ONLY/i)).toBeInTheDocument();
  });

  test("mounted app router reaches the franchise archive game browser route", async () => {
    window.history.pushState({}, "", "/almanac/franchise");
    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>,
    );

    expect(await screen.findByText("FRANCHISE GAMES")).toBeInTheDocument();
    expect(
      screen.getByText(/Mounted app franchise archive route/i),
    ).toBeInTheDocument();
  });

  test("draft-config redirects to the merged draft setup route", async () => {
    window.history.pushState({}, "", "/league-builder/draft-config?leagueId=league-page");
    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>,
    );

    expect(await screen.findByText("MERGED DRAFT ROOM")).toBeInTheDocument();
    expect(window.location.pathname).toBe("/league-builder/draft-setup");
  });
});
