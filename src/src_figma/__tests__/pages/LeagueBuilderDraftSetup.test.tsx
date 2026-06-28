import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { LeagueBuilderDraftSetup } from "../../app/pages/LeagueBuilderDraftSetup";
import {
  useLeagueBuilderData,
  type LeagueTemplate,
  type Player,
  type RegisteredPool,
  type Team,
  type UseLeagueBuilderDataReturn,
} from "../../hooks/useLeagueBuilderData";

const mockNavigate = vi.fn();

vi.mock("react-router", () => ({
  useLocation: () => ({ search: window.location.search }),
  useNavigate: () => mockNavigate,
}));

vi.mock("../../../utils/leagueBuilderStorage", async () => {
  const actual = await vi.importActual<typeof import("../../../utils/leagueBuilderStorage")>(
    "../../../utils/leagueBuilderStorage",
  );
  return {
    ...actual,
    getAuctionSession: vi.fn(async () => null),
  };
});

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
    createdDate: "2026-01-01",
    lastModified: "2026-01-01",
  };
}

function makePlayer(): Player {
  return {
    id: "player-a",
    firstName: "Avery",
    lastName: "Anchor",
    gender: "M",
    age: 25,
    bats: "R",
    throws: "R",
    primaryPosition: "CF",
    secondaryPosition: "LF",
    power: 70,
    contact: 70,
    speed: 70,
    fielding: 70,
    arm: 70,
    velocity: 30,
    junk: 30,
    accuracy: 30,
    arsenal: ["4F"],
    overallGrade: "B",
    personality: "Competitive",
    chemistry: "Crafty",
    morale: 50,
    mojo: "Normal",
    fame: 0,
    salary: 10_000,
    leagueAssignments: [{ leagueId: "league-page", teamId: "team-a", rosterStatus: "FREE_AGENT" }],
    createdDate: "2026-01-01",
    lastModified: "2026-01-01",
    isCustom: true,
  };
}

function makePool(): RegisteredPool {
  return {
    leagueId: "league-page",
    tier: "standard",
    balanceMode: "taxed",
    players: [{ id: "player-a", iv: 100_000, salary: 10_000 }],
    tierCap: 1_000_000,
    luxuryCaps: [],
    pickValueChart: [],
    totalSlots: 44,
    poolSurplusWarning: false,
    locked: true,
  };
}

function mockLeagueData() {
  vi.mocked(useLeagueBuilderData).mockReturnValue({
    leagues: [makeLeague()],
    teams: [makeTeam("team-a"), makeTeam("team-b")],
    players: [makePlayer()],
    rulesPresets: [],
    isLoading: false,
    error: null,
    getRegisteredPool: vi.fn(async () => makePool()),
    updatePlayer: vi.fn(async (player: Player) => player),
    refresh: vi.fn(async () => undefined),
  } as unknown as UseLeagueBuilderDataReturn);
}

describe("LeagueBuilderDraftSetup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.pushState({}, "", "/league-builder/draft-setup?leagueId=league-page");
    mockLeagueData();
  });

  afterEach(() => {
    cleanup();
  });

  test("disables player edits while the pool is locked", async () => {
    render(<LeagueBuilderDraftSetup />);

    fireEvent.click(await screen.findByText("Avery Anchor"));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Unlock to Edit/i })).toBeDisabled();
    });
  });
});
