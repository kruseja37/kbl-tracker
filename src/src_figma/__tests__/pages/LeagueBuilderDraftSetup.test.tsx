import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import {
  LeagueBuilderDraftSetup,
  draftSetupSolvencyBannerText,
} from "../../app/pages/LeagueBuilderDraftSetup";
import { buildRosterDesignPool } from "../../app/components/leagueBuilder/RosterDesigner";
import { describeRosterLawGaps } from "../../../engines/auctionExitGate";
import { evaluateRosterDesign } from "../../../engines/rosterDesignFeasibility";
import { buildDefaultDesignSlots } from "../../../engines/rosterDesignFeasibility";
import { teamRosterNeed, toRosterSlotPlayer, type RosterPositionMap } from "../../../engines/rosterNeed";
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

function makePlayer(index = 0, overrides: Partial<Player> = {}): Player {
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
    ...overrides,
  };
}

function makePlayers(count: number): Player[] {
  return Array.from({ length: count }, (_, index) => makePlayer(index));
}

function makeLegalRosterPlayers(salary: number): Player[] {
  const hitters: Player[] = ["C", "1B", "2B", "3B", "SS", "LF", "CF", "RF"].map((position, index) =>
    makePlayer(index, { id: `legal-h-${position}`, primaryPosition: position as Player["primaryPosition"], salary }),
  );
  const backupC = makePlayer(20, {
    id: "legal-backup-c",
    primaryPosition: "1B",
    secondaryPosition: "C",
    salary,
  });
  const starters = Array.from({ length: 4 }, (_, index) =>
    makePlayer(30 + index, { id: `legal-sp-${index}`, primaryPosition: "SP", salary }),
  );
  const relievers = Array.from({ length: 4 }, (_, index) =>
    makePlayer(40 + index, { id: `legal-rp-${index}`, primaryPosition: "RP", salary }),
  );
  const flexPositions: Player["primaryPosition"][] = ["1B", "2B", "3B", "SS"];
  const flex = flexPositions.map((position, index) =>
    makePlayer(50 + index, { id: `legal-flex-${index}`, primaryPosition: position, salary }),
  );
  const swing = makePlayer(60, { id: "legal-swing", primaryPosition: "SP/RP", salary });
  return [...hitters, backupC, ...starters, ...relievers, ...flex, swing];
}

function makeLockedRosterDesign(lockedAt: string): NonNullable<Team["rosterDesign"]> {
  return { slots: [], lockedAt };
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

  test("blocks design-first draft start when a locked design changed after pool extraction", async () => {
    mockLeagueData({
      league: makeLeague({
        draftPoolMode: "design-first",
        poolExtractedAt: "2026-01-02T00:00:00.000Z",
      }),
      teams: [
        makeTeam("team-a", { rosterDesign: makeLockedRosterDesign("2026-01-01T00:00:00.000Z") }),
        makeTeam("team-b", { rosterDesign: makeLockedRosterDesign("2026-01-03T00:00:00.000Z") }),
      ],
    });

    render(<LeagueBuilderDraftSetup />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /START THE DRAFT/i })).toBeDisabled();
    });
    expect(screen.getByText(/re-extract the pool — some designs changed after it was drawn/i)).toBeInTheDocument();
    expect(screen.getByText(/Designs changed since this pool was drawn/i)).toBeInTheDocument();
  });

  test("enables design-first draft start when all locked designs predate the extracted pool", async () => {
    mockLeagueData({
      league: makeLeague({
        draftPoolMode: "design-first",
        poolExtractedAt: "2026-01-02T00:00:00.000Z",
      }),
      teams: [
        makeTeam("team-a", { rosterDesign: makeLockedRosterDesign("2026-01-01T00:00:00.000Z") }),
        makeTeam("team-b", { rosterDesign: makeLockedRosterDesign("2026-01-02T00:00:00.000Z") }),
      ],
    });

    render(<LeagueBuilderDraftSetup />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /START THE DRAFT/i })).toBeEnabled();
    });
    expect(screen.queryByText(/re-extract the pool/i)).not.toBeInTheDocument();
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

  test("builds the hard-cap solvency banner when the cheapest legal roster exceeds the league cap", () => {
    const legalPlayers = makeLegalRosterPlayers(2_000_000);

    expect(draftSetupSolvencyBannerText(buildRosterDesignPool(legalPlayers), 1_000_000)).toBe(
      "This pool can't seat a legal roster under your $1,000,000 cap — raise the cap or add cheaper players.",
    );
    expect(draftSetupSolvencyBannerText(buildRosterDesignPool(legalPlayers), 60_000_000)).toBeNull();
  });

  test("renders the pool-size dial and persists the selected stop", async () => {
    mockLeagueData({
      league: makeLeague({
        draftPoolMode: "design-first",
        poolExtractedAt: "2026-01-02T00:00:00.000Z",
        poolSizeMultiplier: 1.35,
      }),
      teams: [
        makeTeam("team-a", { rosterDesign: makeLockedRosterDesign("2026-01-01T00:00:00.000Z") }),
        makeTeam("team-b", { rosterDesign: makeLockedRosterDesign("2026-01-01T00:00:00.000Z") }),
      ],
      pool: makePool({ locked: false }),
    });

    render(<LeagueBuilderDraftSetup />);

    expect(await screen.findByText("POOL SIZE")).toBeInTheDocument();
    expect(screen.getByText(/PLAYERS · 2 CLUBS × 22/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "1.5×" }));

    await waitFor(() => {
      expect(saveLeagueTemplate).toHaveBeenCalledWith(expect.objectContaining({
        id: "league-page",
        poolSizeMultiplier: 1.5,
      }));
    });
  });

  test("renders RE-CHECK with roster-law blocker wording", async () => {
    const shortPool = makeLegalRosterPlayers(10_000).filter((player) => player.id !== "legal-h-RF");
    const positions: RosterPositionMap = Object.fromEntries(shortPool.map((player) => [
      player.id,
      toRosterSlotPlayer({
        primaryPosition: player.primaryPosition,
        secondaryPosition: player.secondaryPosition ?? null,
        traits: [player.trait1, player.trait2],
      }),
    ]));
    const attempt = evaluateRosterDesign(buildDefaultDesignSlots(), buildRosterDesignPool(shortPool), 1_000_000);
    const attemptIds = attempt.slots.map((slot) => slot.playerId).filter((id): id is string => Boolean(id));
    const need = teamRosterNeed(attemptIds, positions);
    if (!need) throw new Error("Expected roster need");
    const expectedLawLine = describeRosterLawGaps(attemptIds.length, need).join(" ");

    mockLeagueData({
      league: makeLeague({
        teamIds: ["team-a"],
        draftPoolMode: "pool-first",
      }),
      teams: [makeTeam("team-a")],
      players: shortPool,
      pool: makePool({ locked: false, players: shortPool.map((player) => ({ id: player.id, iv: player.salary, salary: player.salary })) }),
    });

    render(<LeagueBuilderDraftSetup />);

    expect(await screen.findByText(/CAN EVERY CLUB BUILD A LEGAL 22 UNDER/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /RE-CHECK/i }));

    await waitFor(() => {
      expect(screen.getByText((content) => content.includes(expectedLawLine))).toBeInTheDocument();
    });
  });
});
