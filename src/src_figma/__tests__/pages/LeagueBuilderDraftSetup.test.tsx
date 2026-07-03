import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { LeagueBuilderDraftSetup } from "../../app/pages/LeagueBuilderDraftSetup";
import {
  useLeagueBuilderData,
  type LeagueTemplate,
  type Player,
  type Team,
  type UseLeagueBuilderDataReturn,
} from "../../hooks/useLeagueBuilderData";
import { selectTeamArchetype } from "../../../engines/archetypeIdentity";
import { getAuctionSession, saveLeagueTemplate, saveTeam } from "../../../utils/leagueBuilderStorage";

const mockNavigate = vi.fn();

type LeaguePoolRecord = {
  leagueId: string;
  tier: "standard";
  balanceMode: "taxed";
  players: Array<{ id: string; iv: number; salary: number }>;
  tierCap: number;
  luxuryCaps: never[];
  pickValueChart: never[];
  totalSlots: number;
  poolSurplusWarning: boolean;
  locked?: boolean;
};

vi.mock("react-router", () => ({
  useLocation: () => ({ search: window.location.search }),
  useNavigate: () => mockNavigate,
}));

vi.mock("../../../engines/archetypeIdentity", async () => {
  const actual = await vi.importActual<typeof import("../../../engines/archetypeIdentity")>(
    "../../../engines/archetypeIdentity",
  );
  return {
    ...actual,
    selectTeamArchetype: vi.fn(async (team) => team),
  };
});

vi.mock("../../../utils/leagueBuilderStorage", async () => {
  const actual = await vi.importActual<typeof import("../../../utils/leagueBuilderStorage")>(
    "../../../utils/leagueBuilderStorage",
  );
  return {
    ...actual,
    getAuctionSession: vi.fn(async () => null),
    saveLeagueTemplate: vi.fn(async (league) => league),
    saveTeam: vi.fn(async (team) => team),
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
    draftSeats: [
      { id: "seat-you", name: "You" },
      { id: "seat-player-2", name: "Player 2" },
    ],
    createdDate: "2026-01-01",
    lastModified: "2026-01-01",
    ...overrides,
  };
}

function makeTeam(id: string, overrides: Partial<Team> = {}): Team {
  return {
    id,
    name: id === "team-a" ? "Caps" : "Keys",
    abbreviation: id.toUpperCase(),
    location: "Page",
    nickname: id,
    colors: { primary: "#000000", secondary: "#ffffff" },
    stadium: "Page Park",
    controlledBy: "human",
    gmSeatId: id === "team-a" ? "seat-you" : "seat-player-2",
    gmSeatName: id === "team-a" ? "You" : "Player 2",
    leagueIds: ["league-page"],
    mlbArchetypeKey: "murderers-row",
    farmArchetypeKey: "whiteyball",
    createdDate: "2026-01-01",
    lastModified: "2026-01-01",
    ...overrides,
  };
}

function makePlayer(index = 0): Player {
  return {
    id: `player-${index}`,
    firstName: index === 0 ? "Avery" : `Player${index}`,
    lastName: index === 0 ? "Anchor" : "Pool",
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

function makePlayers(count: number): Player[] {
  return Array.from({ length: count }, (_, index) => makePlayer(index));
}

function makePool(overrides: Partial<LeaguePoolRecord> = {}): LeaguePoolRecord {
  return {
    leagueId: "league-page",
    tier: "standard",
    balanceMode: "taxed",
    players: Array.from({ length: 80 }, (_, index) => ({
      id: `player-${index}`,
      iv: 100_000 - index,
      salary: 10_000,
    })),
    tierCap: 1_000_000,
    luxuryCaps: [],
    pickValueChart: [],
    totalSlots: 80,
    poolSurplusWarning: false,
    locked: true,
    ...overrides,
  };
}

function mockLeagueData({
  league = makeLeague(),
  teams = [makeTeam("team-a"), makeTeam("team-b")],
  players = makePlayers(80),
  pool = makePool(),
}: {
  league?: LeagueTemplate;
  teams?: Team[];
  players?: Player[];
  pool?: LeaguePoolRecord | null;
} = {}) {
  const leagueData = {
    leagues: [league],
    teams,
    players,
    rulesPresets: [],
    isLoading: false,
    error: null,
    getRegisteredPool: vi.fn(async () => pool),
    updatePlayer: vi.fn(async (player: Player) => player),
    refresh: vi.fn(async () => undefined),
  } as unknown as UseLeagueBuilderDataReturn;
  vi.mocked(useLeagueBuilderData).mockReturnValue(leagueData);
  return leagueData;
}

describe("LeagueBuilderDraftSetup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAuctionSession).mockResolvedValue(null);
    window.history.pushState({}, "", "/league-builder/draft-setup?leagueId=league-page");
    mockLeagueData();
  });

  afterEach(() => {
    cleanup();
  });

  test("renders the merged Draft Room zones", async () => {
    render(<LeagueBuilderDraftSetup />);

    expect(await screen.findByText("1 · THE ROOM")).toBeInTheDocument();
    expect(screen.getByText("2 · WHO'S PLAYING")).toBeInTheDocument();
    expect(screen.getByText("3 · THE CLUBS")).toBeInTheDocument();
    expect(screen.getByText("4 · THE POOL")).toBeInTheDocument();
    expect(screen.getByText("5 · THE FLOOR")).toBeInTheDocument();
    expect(screen.queryByText("PLAYER POOL")).not.toBeInTheDocument();
  });

  test("disables player edits while the pool is locked", async () => {
    render(<LeagueBuilderDraftSetup />);

    fireEvent.click(await screen.findByText("Avery Anchor"));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Unlock to Edit/i })).toBeDisabled();
    });
  });

  test("starts at scout hire once the pool is locked and every club has an identity", async () => {
    render(<LeagueBuilderDraftSetup />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /START THE DRAFT/i })).toBeEnabled();
    });

    fireEvent.click(screen.getByRole("button", { name: /START THE DRAFT/i }));

    expect(mockNavigate).toHaveBeenCalledWith("/league-builder/scout-hire?leagueId=league-page&shills=0");
  });

  test("carries the selected shill count into scout hire", async () => {
    render(<LeagueBuilderDraftSetup />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /START THE DRAFT/i })).toBeEnabled();
    });

    fireEvent.click(screen.getByRole("button", { name: /Increase shill bidders/i }));
    fireEvent.click(screen.getByRole("button", { name: /Increase shill bidders/i }));
    fireEvent.click(screen.getByRole("button", { name: /START THE DRAFT/i }));

    expect(mockNavigate).toHaveBeenCalledWith("/league-builder/scout-hire?leagueId=league-page&shills=2");
  });

  test("persists a changed GM seat name through the existing league and team records", async () => {
    render(<LeagueBuilderDraftSetup />);

    const youInput = (await screen.findAllByDisplayValue("You")).find(
      (element): element is HTMLInputElement => element.tagName === "INPUT",
    );
    if (!youInput) throw new Error("GM seat input not found");
    fireEvent.change(youInput, { target: { value: "Captain Jane" } });

    await waitFor(() => {
      expect(saveLeagueTemplate).toHaveBeenCalledWith(expect.objectContaining({
        id: "league-page",
        draftSeats: expect.arrayContaining([
          expect.objectContaining({ id: "seat-you", name: "Captain Jane" }),
        ]),
      }));
    });
    expect(saveTeam).toHaveBeenCalledWith(expect.objectContaining({
      id: "team-a",
      gmSeatId: "seat-you",
      gmSeatName: "Captain Jane",
    }));
  });

  test("freezes setup changes while a saved auction is in progress and resumes the live draft", async () => {
    vi.mocked(getAuctionSession).mockResolvedValue({
      leagueId: "league-page",
      season: "MLB_AUCTION",
      session: { state: "OPEN_BIDDING" },
      updatedAt: "2026-01-01T00:00:00.000Z",
    } as Awaited<ReturnType<typeof getAuctionSession>>);

    render(<LeagueBuilderDraftSetup />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /RESUME DRAFT/i })).toBeEnabled();
    });

    expect(screen.getByRole("button", { name: /UNLOCK/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Increase shill bidders/i })).toBeDisabled();
    expect(screen.getAllByRole("combobox")[1]).toBeDisabled();
    expect(screen.getByRole("button", { name: /Bomba Squad/i })).toBeDisabled();

    expect(selectTeamArchetype).not.toHaveBeenCalled();
    expect(saveTeam).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /RESUME DRAFT/i }));
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/league-builder/auction-draft?leagueId=league-page&shills=0");
    });
  });

  test("keeps the pool frozen when saved auction status cannot be verified", async () => {
    vi.mocked(getAuctionSession).mockRejectedValue(new Error("storage unavailable"));

    render(<LeagueBuilderDraftSetup />);

    await waitFor(() => {
      expect(screen.getByText(/Could not confirm whether a saved auction exists/i)).toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: /UNLOCK/i })).toBeDisabled();

    fireEvent.click(await screen.findByText("Avery Anchor"));

    expect(screen.getByRole("button", { name: /Unlock to Edit/i })).toBeDisabled();
  });
});
