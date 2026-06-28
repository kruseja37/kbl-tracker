import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { DraftSetupHubPreview } from "../../app/pages/DraftSetupHubPreview";
import {
  useLeagueBuilderData,
  type LeagueTemplate,
  type RegisteredPool,
  type Team,
  type UseLeagueBuilderDataReturn,
} from "../../hooks/useLeagueBuilderData";

const mockNavigate = vi.fn();

vi.mock("react-router", () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock("../../hooks/useLeagueBuilderData", async () => {
  const actual = await vi.importActual<typeof import("../../hooks/useLeagueBuilderData")>(
    "../../hooks/useLeagueBuilderData",
  );
  return {
    ...actual,
    useLeagueBuilderData: vi.fn(),
  };
});

function makeLeague(overrides: Partial<LeagueTemplate> = {}): LeagueTemplate {
  return {
    id: "league-page",
    name: "Page League",
    teamIds: ["team-a", "team-b"],
    conferences: [],
    divisions: [],
    defaultRulesPreset: "rules",
    tier: "standard",
    balanceMode: "taxed",
    createdDate: "2026-01-01",
    lastModified: "2026-01-01",
    ...overrides,
  };
}

function makeTeam(id: string): Team {
  return {
    id,
    name: id === "team-a" ? "Caps" : "Keys",
    abbreviation: id.toUpperCase(),
    location: "Page",
    nickname: id,
    colors: { primary: "#000000", secondary: "#ffffff" },
    stadium: "Page Park",
    controlledBy: "human",
    leagueIds: ["league-page"],
    mlbArchetypeKey: "murderers-row",
    farmArchetypeKey: "whiteyball",
    createdDate: "2026-01-01",
    lastModified: "2026-01-01",
  };
}

function makePool(overrides: Partial<RegisteredPool> = {}): RegisteredPool {
  return {
    leagueId: "league-page",
    tier: "standard",
    balanceMode: "taxed",
    players: Array.from({ length: 44 }, (_, index) => ({
      id: `player-${index}`,
      iv: 100_000 - index,
      salary: 10_000,
    })),
    tierCap: 1_000_000,
    luxuryCaps: [],
    pickValueChart: [],
    totalSlots: 44,
    poolSurplusWarning: false,
    ...overrides,
  };
}

function mockLeagueData(pool: RegisteredPool | null) {
  const leagueData = {
    leagues: [makeLeague()],
    teams: [makeTeam("team-a"), makeTeam("team-b")],
    players: [],
    rulesPresets: [],
    isLoading: false,
    error: null,
    getRegisteredPool: vi.fn(async () => pool),
    refresh: vi.fn(async () => undefined),
  } as unknown as UseLeagueBuilderDataReturn;

  vi.mocked(useLeagueBuilderData).mockReturnValue(leagueData);
  return leagueData;
}

describe("DraftSetupHubPreview", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.pushState({}, "", "/league-builder/draft-config?leagueId=league-page");
  });

  afterEach(() => {
    cleanup();
  });

  test("keeps Start disabled and routes back to the multi-select pool builder when the pool is unlocked", async () => {
    mockLeagueData(makePool({ locked: false }));

    render(<DraftSetupHubPreview />);

    expect(await screen.findByText("PLAYER POOL")).toBeInTheDocument();
    expect(screen.getByText("NEEDS LOCK")).toBeInTheDocument();
    expect(screen.getByText(/lock a sufficient player pool first/i)).toBeInTheDocument();

    const start = screen.getByRole("button", { name: /Start the Draft/i });
    expect(start).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: /Edit player pool/i }));
    expect(mockNavigate).toHaveBeenCalledWith("/league-builder/draft-setup?leagueId=league-page");
  });

  test("allows Start to scout hire once the pool is locked and every club has an identity", async () => {
    mockLeagueData(makePool({ locked: true }));

    render(<DraftSetupHubPreview />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Start the Draft/i })).toBeEnabled();
    });

    fireEvent.click(screen.getByRole("button", { name: /Start the Draft/i }));
    expect(mockNavigate).toHaveBeenCalledWith("/league-builder/scout-hire?leagueId=league-page&shills=0");
  });

  test("carries the selected shill count into scout hire", async () => {
    mockLeagueData(makePool({ locked: true, players: Array.from({ length: 88 }, (_, index) => ({
      id: `player-${index}`,
      iv: 100_000 - index,
      salary: 10_000,
    })) }));

    render(<DraftSetupHubPreview />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Start the Draft/i })).toBeEnabled();
    });

    fireEvent.click(screen.getByRole("button", { name: /Increase shill bidders/i }));
    fireEvent.click(screen.getByRole("button", { name: /Increase shill bidders/i }));

    fireEvent.click(screen.getByRole("button", { name: /Start the Draft/i }));
    expect(mockNavigate).toHaveBeenCalledWith("/league-builder/scout-hire?leagueId=league-page&shills=2");
  });
});
