import "fake-indexeddb/auto";

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { __resetLeagueBuilderDatabaseForTests } from "../../../utils/leagueBuilderStorage";
import { LeagueBuilderAuctionDraft } from "../../app/pages/LeagueBuilderAuctionDraft";
import {
  useLeagueBuilderData,
  type LeagueTemplate,
  type Player,
  type RegisteredPool,
  type Team,
  type TeamRoster,
  type UseLeagueBuilderDataReturn,
} from "../../hooks/useLeagueBuilderData";

const mockNavigate = vi.fn();

vi.mock("react-router", () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock("../../../utils/syncEngine", () => ({
  syncEngine: {
    isSuppressed: () => true,
    upsert: vi.fn(),
    remove: vi.fn(),
  },
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

const DB_NAME = "kbl-league-builder";

function deleteDatabase(name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => resolve();
  });
}

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

function makePlayer(
  id: string,
  primaryPosition: Player["primaryPosition"] = "CF",
  secondaryPosition?: Player["secondaryPosition"],
): Player {
  const nameById: Record<string, { firstName: string; lastName: string }> = {
    "player-a": { firstName: "Avery", lastName: "Anchor" },
    "player-b": { firstName: "Blake", lastName: "Bolt" },
  };
  const name = nameById[id] ?? { firstName: "Free", lastName: "Agent" };

  const player: Player = {
    id,
    firstName: name.firstName,
    lastName: name.lastName,
    gender: "M",
    age: 25,
    bats: "R",
    throws: "R",
    primaryPosition,
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
  if (secondaryPosition) player.secondaryPosition = secondaryPosition;
  return player;
}

function emptyRoster(teamId: string): TeamRoster {
  return {
    teamId,
    mlbRoster: [],
    farmRoster: [],
    lineupWithDH: [],
    lineupWithoutDH: [],
    startingRotation: [],
    longRelievers: [],
    closingPitcher: "",
    setupPitchers: [],
    depthChart: {
      C: [],
      "1B": [],
      "2B": [],
      SS: [],
      "3B": [],
      LF: [],
      CF: [],
      RF: [],
      DH: [],
      SP: [],
      RP: [],
      CP: [],
    },
    pinchHitOrder: [],
    pinchRunOrder: [],
    defensiveSubOrder: [],
    lastModified: "2026-01-01",
  };
}

function mockLeagueData() {
  const pool: RegisteredPool = {
    leagueId: "league-page",
    tier: "standard",
    balanceMode: "taxed",
    players: [
      { id: "player-a", iv: 100_000, salary: 10_000 },
      { id: "player-b", iv: 80_000, salary: 8_000 },
    ],
    tierCap: 1_000_000,
    luxuryCaps: [],
    pickValueChart: [],
    totalSlots: 44,
    poolSurplusWarning: false,
  };
  const leagueData = {
    leagues: [makeLeague()],
    teams: [makeTeam("team-a"), makeTeam("team-b")],
    players: [makePlayer("player-a", "CF", "LF"), makePlayer("player-b", "SP")],
    rulesPresets: [],
    isLoading: false,
    error: null,
    getRegisteredPool: vi.fn(async () => pool),
    registerLeaguePool: vi.fn(async () => pool),
    getRoster: vi.fn(async (teamId: string) => emptyRoster(teamId)),
    refresh: vi.fn(async () => undefined),
  } as unknown as UseLeagueBuilderDataReturn;

  vi.mocked(useLeagueBuilderData).mockReturnValue(leagueData);
  return leagueData;
}

describe("LeagueBuilderAuctionDraft", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    window.history.pushState({}, "", "/league-builder/auction-draft");
    __resetLeagueBuilderDatabaseForTests();
    await deleteDatabase(DB_NAME).catch(() => undefined);
    mockLeagueData();
  });

  afterEach(async () => {
    __resetLeagueBuilderDatabaseForTests();
    await deleteDatabase(DB_NAME).catch(() => undefined);
  });

  test("renders setup and begins into an engine-nominated open lot", async () => {
    render(<LeagueBuilderAuctionDraft />);

    expect(screen.getByText("MLB AUCTION DRAFT")).toBeInTheDocument();
    expect(screen.getByText("STATE: SETUP")).toBeInTheDocument();

    const begin = await screen.findByRole("button", { name: /BEGIN AUCTION DRAFT/i });
    fireEvent.click(begin);

    await waitFor(() => {
      expect(screen.getByText("STATE: OPEN_BIDDING")).toBeInTheDocument();
    });
    expect(screen.getByText("ENGINE NOMINATED")).toBeInTheDocument();
    expect(screen.queryByLabelText("Position filter")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /IV SORT/i })).not.toBeInTheDocument();
    expect(screen.getByText(/Avery Anchor|Blake Bolt/)).toBeInTheDocument();
    expect(screen.getByText("YOUR MAX BID")).toBeInTheDocument();
  });

  test("uses leagueId query param over the first league when it matches a known league", async () => {
    const leagueData = mockLeagueData();
    leagueData.leagues = [
      makeLeague({ id: "first-league", name: "First League" }),
      makeLeague({ id: "league-page", name: "Page League" }),
    ];
    window.history.pushState({}, "", "/league-builder/auction-draft?leagueId=league-page");

    render(<LeagueBuilderAuctionDraft />);

    await waitFor(() => {
      expect(screen.getByLabelText("LEAGUE")).toHaveValue("league-page");
    });
  });

  test("falls back to leagues[0] when leagueId query param is absent", async () => {
    const leagueData = mockLeagueData();
    leagueData.leagues = [
      makeLeague({ id: "first-league", name: "First League" }),
      makeLeague({ id: "second-league", name: "Second League" }),
    ];

    render(<LeagueBuilderAuctionDraft />);

    await waitFor(() => {
      expect(screen.getByLabelText("LEAGUE")).toHaveValue("first-league");
    });
  });

  test("renders open bidding with names and records a SOLD result row with winner salary", async () => {
    render(<LeagueBuilderAuctionDraft />);

    fireEvent.click(await screen.findByRole("button", { name: /BEGIN AUCTION DRAFT/i }));

    await waitFor(() => {
      expect(screen.getByText("STATE: OPEN_BIDDING")).toBeInTheDocument();
    });

    expect(screen.getByText("ENGINE NOMINATED")).toBeInTheDocument();
    expect(screen.getByText(/Avery Anchor|Blake Bolt/)).toBeInTheDocument();
    expect(screen.getByText("No bid yet")).toBeInTheDocument();
    expect(screen.getByText("YOUR REMAINING BUDGET")).toBeInTheDocument();
    expect(screen.getByText("YOUR MAX BID")).toBeInTheDocument();
    expect(screen.getByText("ROSTER SLOTS REMAINING")).toBeInTheDocument();
    expect(screen.getByText("CURRENT ROSTER POSITION TALLY")).toBeInTheDocument();
    expect(screen.getByText(/Still in: Page (Caps|Keys), Page (Caps|Keys)/)).toBeInTheDocument();
    expect(screen.queryByText("player-a")).not.toBeInTheDocument();
    expect(screen.queryByText("team-a")).not.toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByLabelText("Custom bid amount")).toHaveValue(70000);
    });

    fireEvent.click(screen.getByRole("button", { name: /RAISE CUSTOM/i }));

    await waitFor(() => {
      expect(screen.getByLabelText("Custom bid amount")).toHaveValue(75000);
    });

    fireEvent.click(screen.getByRole("button", { name: "PASS" }));

    await waitFor(() => {
      expect(screen.getByText("STATE: SOLD")).toBeInTheDocument();
    });

    expect(screen.getAllByText(/(Avery Anchor|Blake Bolt) SOLD to Page (Caps|Keys) for \$/).length).toBeGreaterThan(0);
  });
});
