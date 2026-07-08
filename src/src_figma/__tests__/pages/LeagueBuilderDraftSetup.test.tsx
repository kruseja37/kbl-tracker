import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import {
  LeagueBuilderDraftSetup,
  buildIdentityAutoAssignPlan,
  comparePlayersByIvDesc,
  draftSetupSolvencyBannerText,
} from "../../app/pages/LeagueBuilderDraftSetup";
import { buildRosterDesignPool } from "../../app/components/leagueBuilder/RosterDesigner";
import { describeRosterLawGaps } from "../../../engines/auctionExitGate";
import { buildBest22Target, type Best22Target } from "../../../engines/best22Target";
import { rankAllArchetypesForPool } from "../../../engines/draftabilityRanker";
import { extractPoolFromDemand } from "../../../engines/poolFromDemand";
import { evaluateRosterDesign } from "../../../engines/rosterDesignFeasibility";
import { buildDefaultDesignSlots } from "../../../engines/rosterDesignFeasibility";
import { teamRosterNeed, toRosterSlotPlayer, type RosterPositionMap } from "../../../engines/rosterNeed";
import { poolDemandModel } from "../../../engines/auctionPoolSizing";
import {
  useLeagueBuilderData,
  type LeagueTemplate,
  type Player,
  type Team,
  type UseLeagueBuilderDataReturn,
} from "../../hooks/useLeagueBuilderData";
import { selectTeamArchetype } from "../../../engines/archetypeIdentity";
import { getAuctionSession, saveLeagueTemplate, saveTeam } from "../../../utils/leagueBuilderStorage";
import {
  RUN_IT_BACK_FRANCHISE_GUARD_MESSAGE,
  resetCompletedDraftArc,
} from "../../../utils/leagueBuilderAuctionPipeline";
import {
  addPlayersToLeaguePool,
  computePlayerIv,
  lockLeaguePool,
  removePlayersFromLeaguePool,
} from "../../../utils/leagueBuilderPoolBuilder";
import { leagueHasLinkedFranchise } from "../../../utils/franchiseManager";
import { SALARY_CAP_FLOOR, salaryCapHardError } from "../../app/utils/salaryCapInput";

vi.setConfig({ testTimeout: 15000 });

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
    selectTeamArchetype: vi.fn(async (team, mlbKey: string, farmKey?: string) => ({
      ...team,
      mlbArchetypeKey: mlbKey,
      farmArchetypeKey: farmKey ?? team.farmArchetypeKey,
    })),
  };
});

vi.mock("../../../engines/best22Target", async () => {
  const actual = await vi.importActual<typeof import("../../../engines/best22Target")>(
    "../../../engines/best22Target",
  );
  return {
    ...actual,
    buildBest22Target: vi.fn(actual.buildBest22Target),
  };
});

vi.mock("../../../engines/draftabilityRanker", async () => {
  const actual = await vi.importActual<typeof import("../../../engines/draftabilityRanker")>(
    "../../../engines/draftabilityRanker",
  );
  return {
    ...actual,
    rankAllArchetypesForPool: vi.fn(actual.rankAllArchetypesForPool),
  };
});

vi.mock("../../../engines/poolFromDemand", async () => {
  const actual = await vi.importActual<typeof import("../../../engines/poolFromDemand")>(
    "../../../engines/poolFromDemand",
  );
  return {
    ...actual,
    extractPoolFromDemand: vi.fn(actual.extractPoolFromDemand),
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

vi.mock("../../../utils/leagueBuilderAuctionPipeline", async () => {
  const actual = await vi.importActual<typeof import("../../../utils/leagueBuilderAuctionPipeline")>(
    "../../../utils/leagueBuilderAuctionPipeline",
  );
  return {
    ...actual,
    resetCompletedDraftArc: vi.fn(async () => undefined),
  };
});

vi.mock("../../../utils/franchiseManager", async () => {
  const actual = await vi.importActual<typeof import("../../../utils/franchiseManager")>(
    "../../../utils/franchiseManager",
  );
  return {
    ...actual,
    leagueHasLinkedFranchise: vi.fn(async () => false),
  };
});

vi.mock("../../../utils/leagueBuilderPoolBuilder", async () => {
  const actual = await vi.importActual<typeof import("../../../utils/leagueBuilderPoolBuilder")>(
    "../../../utils/leagueBuilderPoolBuilder",
  );
  return {
    ...actual,
    addPlayersToLeaguePool: vi.fn(async () => undefined),
    removePlayersFromLeaguePool: vi.fn(async () => undefined),
    importRosteredPlayersToLeaguePool: vi.fn(async () => 0),
    lockLeaguePool: vi.fn(async () => undefined),
    unlockLeaguePool: vi.fn(async () => undefined),
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

const DEFAULT_TEST_POOL_SIZE = Math.max(80, poolDemandModel(2, 0).feasibilityFloor);

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
  const relievers = Array.from({ length: 3 }, (_, index) =>
    makePlayer(40 + index, { id: `legal-rp-${index}`, primaryPosition: "RP", salary }),
  );
  const closer = makePlayer(44, { id: "legal-cp", primaryPosition: "CP", salary });
  const flexPositions: Player["primaryPosition"][] = ["1B", "2B", "3B", "SS"];
  const flex = flexPositions.map((position, index) =>
    makePlayer(50 + index, { id: `legal-flex-${index}`, primaryPosition: position, salary }),
  );
  const swing = makePlayer(60, { id: "legal-swing", primaryPosition: "SP/RP", salary });
  return [...hitters, backupC, ...starters, ...relievers, closer, ...flex, swing];
}

function makeLegalRosterPlayerSet(prefix: string, salary: number): Player[] {
  return makeLegalRosterPlayers(salary).map((player) => ({
    ...player,
    id: `${prefix}-${player.id}`,
  }));
}

function makeQualityRosterPlayerSet(prefix: string, rating: number): Player[] {
  return makeLegalRosterPlayerSet(prefix, 10_000).map((player) => ({
    ...player,
    power: rating,
    contact: rating,
    speed: rating,
    fielding: rating,
    arm: rating,
    velocity: rating,
    junk: rating,
    accuracy: rating,
  }));
}

function capFitDiagnosticText(): string {
  return screen.getByLabelText("Cap fit diagnostic").textContent ?? "";
}

type ExtractPoolOptions = {
  excludedIds?: string[];
  generationNonce?: number;
  pinnedIds?: string[];
  poolBalancePreset?: string;
  poolQualityCenter?: number;
  poolSizeMultiplier?: number;
  poolSourceMode?: string;
  priorityIds?: string[];
};

function extractPoolOptions(): ExtractPoolOptions[] {
  return vi.mocked(extractPoolFromDemand).mock.calls.map((call) => call[4] as ExtractPoolOptions);
}

async function waitForExtractPoolOptions(
  predicate: (options: ExtractPoolOptions) => boolean,
): Promise<ExtractPoolOptions> {
  let matched: ExtractPoolOptions | undefined;
  await waitFor(() => {
    matched = extractPoolOptions().find(predicate);
    expect(matched).toBeDefined();
  }, { timeout: 7000 });
  return matched!;
}

async function clickDraftSetupButton(name: string | RegExp): Promise<void> {
  const button = await screen.findByRole("button", { name });
  await act(async () => {
    fireEvent.click(button);
  });
}

function makeLockedRosterDesign(lockedAt: string): NonNullable<Team["rosterDesign"]> {
  return { slots: [], lockedAt };
}

function makeBest22Target(overrides: Partial<Best22Target> = {}): Best22Target {
  return {
    picks: [],
    pins: { honored: [], dropped: [] },
    totalSalary: 28_000,
    totalTax: 2_000,
    allIn: 30_000,
    budget: 1_000_000,
    feasible: true,
    embodimentZ: 0.4,
    asksHonored: { honored: 0, asked: 0 },
    ...overrides,
  };
}

function makePool(overrides: Partial<LeaguePoolRecord> = {}): LeaguePoolRecord {
  return {
    leagueId: "league-page",
    tier: "standard",
    balanceMode: "taxed",
    players: Array.from({ length: DEFAULT_TEST_POOL_SIZE }, (_, index) => ({
      id: `player-${index}`,
      iv: 100_000 - index,
      salary: 10_000,
    })),
    tierCap: 1_000_000,
    luxuryCaps: [],
    pickValueChart: [],
    totalSlots: DEFAULT_TEST_POOL_SIZE,
    poolSurplusWarning: false,
    locked: true,
    ...overrides,
  };
}

function mockLeagueData({
  league = makeLeague(),
  teams = [makeTeam("team-a"), makeTeam("team-b")],
  players = makePlayers(DEFAULT_TEST_POOL_SIZE),
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
    replaceTeamsLocal: vi.fn(() => undefined),
    refresh: vi.fn(async () => undefined),
  } as unknown as UseLeagueBuilderDataReturn;
  vi.mocked(useLeagueBuilderData).mockReturnValue(leagueData);
  return leagueData;
}

describe("LeagueBuilderDraftSetup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getAuctionSession).mockResolvedValue(null);
    vi.mocked(leagueHasLinkedFranchise).mockResolvedValue(false);
    vi.mocked(resetCompletedDraftArc).mockResolvedValue(undefined);
    vi.mocked(buildBest22Target).mockReturnValue(makeBest22Target());
    vi.mocked(rankAllArchetypesForPool).mockReturnValue([]);
    window.sessionStorage.clear();
    window.history.pushState({}, "", "/league-builder/draft-setup?leagueId=league-page");
    mockLeagueData();
  });

  afterEach(async () => {
    cleanup();
    await act(async () => undefined);
    window.sessionStorage.clear();
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

  test("starts at scout hire once the pool is locked and every club has both identities", async () => {
    render(<LeagueBuilderDraftSetup />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /START THE DRAFT/i })).toBeEnabled();
    }, { timeout: 5000 });

    fireEvent.click(screen.getByRole("button", { name: /START THE DRAFT/i }));

    expect(mockNavigate).toHaveBeenCalledWith("/league-builder/scout-hire?leagueId=league-page&shills=0&reserveK=0.65");
  });

  test("CUT2-1 flips THE FLOOR status in-session after locking the pool", async () => {
    const players = ["one", "two", "three", "four"].flatMap((prefix) =>
      makeLegalRosterPlayerSet(prefix, 10_000),
    );
    const unlockedPool = makePool({
      locked: false,
      players: players.map((player) => ({ id: player.id, iv: player.salary, salary: player.salary })),
    });
    const lockedPool = { ...unlockedPool, locked: true };
    const leagueData = mockLeagueData({ players, pool: unlockedPool });
    vi.mocked(lockLeaguePool).mockResolvedValue(lockedPool);

    render(<LeagueBuilderDraftSetup />);

    expect(await screen.findByText(/pool open/i)).toBeInTheDocument();
    expect(await screen.findByText(/lock a sufficient player pool first/i)).toBeInTheDocument();

    const lockButton = screen.getByRole("button", { name: /^LOCK POOL$/i });
    expect(lockButton).toBeEnabled();
    fireEvent.click(lockButton);

    await waitFor(() => {
      expect(screen.getAllByText(/pool locked/i).length).toBeGreaterThan(0);
    });
    expect(screen.queryByText(/lock a sufficient player pool first/i)).not.toBeInTheDocument();
    expect(leagueData.refresh).toHaveBeenCalled();
  });

  test("CUT2-1 flips THE FLOOR status in-session after locking the pool", async () => {
    const players = ["one", "two", "three", "four"].flatMap((prefix) =>
      makeLegalRosterPlayerSet(prefix, 10_000),
    );
    const unlockedPool = makePool({
      locked: false,
      players: players.map((player) => ({ id: player.id, iv: player.salary, salary: player.salary })),
    });
    const lockedPool = { ...unlockedPool, locked: true };
    const leagueData = mockLeagueData({ players, pool: unlockedPool });
    vi.mocked(lockLeaguePool).mockResolvedValue(lockedPool);

    render(<LeagueBuilderDraftSetup />);

    expect(await screen.findByText(/pool open/i)).toBeInTheDocument();
    expect(await screen.findByText(/lock a sufficient player pool first/i)).toBeInTheDocument();

    const lockButton = screen.getByRole("button", { name: /^LOCK POOL$/i });
    expect(lockButton).toBeEnabled();
    fireEvent.click(lockButton);

    await waitFor(() => {
      expect(screen.getAllByText(/pool locked/i).length).toBeGreaterThan(0);
    });
    expect(screen.queryByText(/lock a sufficient player pool first/i)).not.toBeInTheDocument();
    expect(leagueData.refresh).toHaveBeenCalled();
  });

  test("blocks draft start when a club has an MLB identity but no farm identity", async () => {
    mockLeagueData({
      teams: [
        makeTeam("team-a"),
        makeTeam("team-b", { farmArchetypeKey: undefined }),
      ],
    });

    render(<LeagueBuilderDraftSetup />);

    await waitFor(() => {
      expect(screen.getByText(/give every club an MLB and a farm identity first/i)).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /START THE DRAFT/i })).toBeDisabled();
    expect(screen.getByText(/set each club's identities/i)).toBeInTheDocument();
  });

  test("P1 planner is deterministic per seed, rerolls away from current auto-filled identities, and skips LOCKED archetypes", () => {
    const seats = makeLeague().draftSeats ?? [];
    const baseTeam = makeTeam("team-b", {
      controlledBy: "ai",
      gmSeatId: undefined,
      gmSeatName: undefined,
      mlbArchetypeKey: undefined,
      farmArchetypeKey: undefined,
    });
    const input = {
      leagueId: "league-page",
      nonce: 7,
      teams: [baseTeam],
      seats,
      draftability: {
        "murderers-row": { band: "LOCKED" as const, reason: "test locked" },
        whiteyball: { band: "LOCKED" as const, reason: "test locked" },
      },
      includeHumanTeams: false,
      mode: "fill-empty" as const,
      poolSourceMode: "full-pool" as const,
      activeLeagueId: "league-page",
      players: makePlayers(6),
    };

    const planA = buildIdentityAutoAssignPlan(input);
    const planB = buildIdentityAutoAssignPlan(input);

    expect(planA).toEqual(planB);
    expect(planA).toHaveLength(1);
    expect([planA[0].mlbKey, planA[0].farmKey]).not.toContain("murderers-row");
    expect([planA[0].mlbKey, planA[0].farmKey]).not.toContain("whiteyball");

    const rerollPlan = buildIdentityAutoAssignPlan({
      ...input,
      nonce: 8,
      teams: [
        makeTeam("team-b", {
          controlledBy: "ai",
          gmSeatId: undefined,
          gmSeatName: undefined,
          mlbArchetypeKey: planA[0].mlbKey,
          farmArchetypeKey: planA[0].farmKey,
        }),
      ],
      autoFilledSlots: new Set(["team-b:mlb", "team-b:farm"]),
      mode: "reroll-team",
      rerollTeamId: "team-b",
    });

    expect(rerollPlan).toHaveLength(1);
    expect(rerollPlan[0].mlbKey).not.toBe(planA[0].mlbKey);
    expect(rerollPlan[0].farmKey).not.toBe(planA[0].farmKey);
  });

  test("P1 auto-fill remaining fills only empty CPU identities and preserves human/user-set picks by default", async () => {
    mockLeagueData({
      league: makeLeague({ teamIds: ["team-a", "team-b", "team-c"] }),
      teams: [
        makeTeam("team-a", {
          mlbArchetypeKey: undefined,
          farmArchetypeKey: undefined,
        }),
        makeTeam("team-b", {
          controlledBy: "ai",
          gmSeatId: undefined,
          gmSeatName: undefined,
          mlbArchetypeKey: undefined,
          farmArchetypeKey: undefined,
        }),
        makeTeam("team-c", {
          controlledBy: "ai",
          gmSeatId: undefined,
          gmSeatName: undefined,
          mlbArchetypeKey: "murderers-row",
          farmArchetypeKey: "whiteyball",
        }),
      ],
    });

    render(<LeagueBuilderDraftSetup />);

    const autoFill = await screen.findByRole("button", { name: /Auto-fill remaining/i });
    await waitFor(() => expect(autoFill).toBeEnabled());
    fireEvent.click(autoFill);

    await waitFor(() => {
      expect(selectTeamArchetype).toHaveBeenCalledTimes(1);
    });
    expect(selectTeamArchetype).toHaveBeenCalledWith(
      expect.objectContaining({ id: "team-b" }),
      expect.any(String),
      expect.any(String),
    );
    expect(selectTeamArchetype).not.toHaveBeenCalledWith(
      expect.objectContaining({ id: "team-a" }),
      expect.any(String),
      expect.any(String),
    );
    expect(selectTeamArchetype).not.toHaveBeenCalledWith(
      expect.objectContaining({ id: "team-c" }),
      expect.any(String),
      expect.any(String),
    );
  });

  test("P1 auto-fill includes human empty identities only after explicit opt-in", async () => {
    mockLeagueData({
      teams: [
        makeTeam("team-a", {
          mlbArchetypeKey: undefined,
          farmArchetypeKey: undefined,
        }),
        makeTeam("team-b", {
          controlledBy: "ai",
          gmSeatId: undefined,
          gmSeatName: undefined,
          mlbArchetypeKey: undefined,
          farmArchetypeKey: undefined,
        }),
      ],
    });

    render(<LeagueBuilderDraftSetup />);

    const autoFill = await screen.findByRole("button", { name: /Auto-fill remaining/i });
    fireEvent.click(screen.getByLabelText(/include human clubs/i));
    await waitFor(() => expect(autoFill).toBeEnabled());
    fireEvent.click(autoFill);

    await waitFor(() => {
      expect(selectTeamArchetype).toHaveBeenCalledTimes(2);
    });
    expect(selectTeamArchetype).toHaveBeenCalledWith(
      expect.objectContaining({ id: "team-a" }),
      expect.any(String),
      expect.any(String),
    );
    expect(selectTeamArchetype).toHaveBeenCalledWith(
      expect.objectContaining({ id: "team-b" }),
      expect.any(String),
      expect.any(String),
    );
  });

  test("carries the selected shill count into scout hire", async () => {
    render(<LeagueBuilderDraftSetup />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /START THE DRAFT/i })).toBeEnabled();
    }, { timeout: 5000 });

    fireEvent.click(screen.getByRole("button", { name: /Increase shill bidders/i }));
    fireEvent.click(screen.getByRole("button", { name: /Increase shill bidders/i }));
    fireEvent.click(screen.getByRole("button", { name: /START THE DRAFT/i }));

    expect(mockNavigate).toHaveBeenCalledWith("/league-builder/scout-hire?leagueId=league-page&shills=2&reserveK=0.65");
  });

  test("CUT2-2 persists selected shill count and reloads it without a URL carrier", async () => {
    render(<LeagueBuilderDraftSetup />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /START THE DRAFT/i })).toBeEnabled();
    }, { timeout: 5000 });

    fireEvent.click(screen.getByRole("button", { name: /Increase shill bidders/i }));

    await waitFor(() => {
      expect(saveLeagueTemplate).toHaveBeenCalledWith(expect.objectContaining({ draftShillCount: 1 }));
    });

    cleanup();
    vi.mocked(saveLeagueTemplate).mockClear();
    window.history.pushState({}, "", "/league-builder/draft-setup?leagueId=league-page");
    mockLeagueData({ league: makeLeague({ draftShillCount: 1 }) });

    render(<LeagueBuilderDraftSetup />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /START THE DRAFT/i })).toBeEnabled();
    });
    fireEvent.click(screen.getByRole("button", { name: /START THE DRAFT/i }));

    expect(mockNavigate).toHaveBeenCalledWith("/league-builder/scout-hire?leagueId=league-page&shills=1&reserveK=0.65");
  });

  test("CUT2-2 30-club shill pressure does not inflate the pool-lock floor", async () => {
    window.history.pushState({}, "", "/league-builder/draft-setup?leagueId=league-page&shills=10");
    const teamIds = Array.from({ length: 30 }, (_, index) => `team-${index}`);
    const teams = teamIds.map((teamId) => makeTeam(teamId));
    const realClubFloor = poolDemandModel(30, 0).feasibilityFloor;
    const players = makePlayers(realClubFloor);
    const pool = makePool({
      locked: true,
      players: players.map((player) => ({ id: player.id, iv: player.salary, salary: player.salary })),
    });

    mockLeagueData({
      league: makeLeague({ teamIds }),
      teams,
      players,
      pool,
    });

    render(<LeagueBuilderDraftSetup />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /START THE DRAFT/i })).toBeEnabled();
    }, { timeout: 5000 });
    expect(screen.getByText(new RegExp(`Pool ${realClubFloor} / ${realClubFloor} draft slots`))).toBeInTheDocument();
    expect(screen.getByText(/30 clubs \+ 10 CPU shills/i)).toBeInTheDocument();
  });

  test("CUT2-2 persists selected shill count and reloads it without a URL carrier", async () => {
    render(<LeagueBuilderDraftSetup />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /START THE DRAFT/i })).toBeEnabled();
    });

    fireEvent.click(screen.getByRole("button", { name: /Increase shill bidders/i }));

    await waitFor(() => {
      expect(saveLeagueTemplate).toHaveBeenCalledWith(expect.objectContaining({ draftShillCount: 1 }));
    });

    cleanup();
    vi.mocked(saveLeagueTemplate).mockClear();
    window.history.pushState({}, "", "/league-builder/draft-setup?leagueId=league-page");
    mockLeagueData({ league: makeLeague({ draftShillCount: 1 }) });

    render(<LeagueBuilderDraftSetup />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /START THE DRAFT/i })).toBeEnabled();
    });
    fireEvent.click(screen.getByRole("button", { name: /START THE DRAFT/i }));

    expect(mockNavigate).toHaveBeenCalledWith("/league-builder/scout-hire?leagueId=league-page&shills=1&reserveK=0.65");
  });

  test("CUT2-2 30-club shill pressure does not inflate the pool-lock floor", async () => {
    window.history.pushState({}, "", "/league-builder/draft-setup?leagueId=league-page&shills=10");
    const teamIds = Array.from({ length: 30 }, (_, index) => `team-${index}`);
    const teams = teamIds.map((teamId) => makeTeam(teamId));
    const realClubFloor = poolDemandModel(30, 0).feasibilityFloor;
    const players = makePlayers(realClubFloor);
    const pool = makePool({
      locked: true,
      players: players.map((player) => ({ id: player.id, iv: player.salary, salary: player.salary })),
    });

    mockLeagueData({
      league: makeLeague({ teamIds }),
      teams,
      players,
      pool,
    });

    render(<LeagueBuilderDraftSetup />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /START THE DRAFT/i })).toBeEnabled();
    });
    expect(screen.getByText(new RegExp(`Pool ${realClubFloor} / ${realClubFloor} draft slots`))).toBeInTheDocument();
    expect(screen.getByText(/30 clubs \+ 10 CPU shills/i)).toBeInTheDocument();
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
      expect(screen.getByText(/finish the re-plan — lock the edits, then re-extract/i)).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: /START THE DRAFT/i })).toBeDisabled();
    expect(screen.getByText("RE-PLAN IN PROGRESS · EDIT → LOCK → RE-EXTRACT")).toBeInTheDocument();
    expect(screen.getByText(/◉ Keys \(Player 2\) — locked, waiting on re-extract/i)).toBeInTheDocument();
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

  test("W3 shows the re-plan rail while editing and flips the action line once every club locks", async () => {
    const league = makeLeague({
      draftPoolMode: "design-first",
      poolExtractedAt: "2026-01-02T00:00:00.000Z",
    });
    const teams = [
      makeTeam("team-a", { rosterDesign: { slots: [] } }),
      makeTeam("team-b", { rosterDesign: makeLockedRosterDesign("2026-01-01T00:00:00.000Z") }),
    ];
    const { rerender } = render(<LeagueBuilderDraftSetup />);

    mockLeagueData({ league, teams, pool: makePool({ locked: false }) });
    rerender(<LeagueBuilderDraftSetup />);

    expect(await screen.findByText("RE-PLAN IN PROGRESS · EDIT → LOCK → RE-EXTRACT")).toBeInTheDocument();
    expect(screen.getByText(/✎ Caps \(You\) — editing/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^RE-EXTRACT$/i })).toBeDisabled();
    expect(screen.getByText("The current pool still reflects the old designs. Re-extract when every club locks.")).toBeInTheDocument();

    mockLeagueData({
      league,
      teams: [
        makeTeam("team-a", { rosterDesign: makeLockedRosterDesign("2026-01-03T00:00:00.000Z") }),
        teams[1],
      ],
      pool: makePool({ locked: false }),
    });
    rerender(<LeagueBuilderDraftSetup />);

    expect(await screen.findByText(/◉ Caps \(You\) — locked, waiting on re-extract/i)).toBeInTheDocument();
    expect(screen.getByText("EVERY CLUB IS LOCKED — RE-EXTRACT TO APPLY THE NEW PLAN.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^RE-EXTRACT$/i })).toBeEnabled();
  });

  test("W5 pool-first mode does not render the re-plan rail", async () => {
    render(<LeagueBuilderDraftSetup />);

    await screen.findByText("4 · THE POOL");

    expect(screen.queryByText("RE-PLAN IN PROGRESS · EDIT → LOCK → RE-EXTRACT")).not.toBeInTheDocument();
  });

  test("persists a changed GM seat name through the existing league and team records", async () => {
    render(<LeagueBuilderDraftSetup />);

    await waitFor(() => {
      expect(screen.queryByText(/Checking for a saved auction before allowing pool edits/i)).not.toBeInTheDocument();
    });
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
    }, { timeout: 5000 });

    expect(screen.getByRole("button", { name: /UNLOCK/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /Increase shill bidders/i })).toBeDisabled();
    expect(screen.getAllByRole("combobox")[1]).toBeDisabled();
    expect(screen.getByRole("button", { name: /Bomba Squad/i })).toBeDisabled();

    expect(selectTeamArchetype).not.toHaveBeenCalled();
    expect(saveTeam).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /RESUME DRAFT/i }));
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith("/league-builder/auction-draft?leagueId=league-page&shills=0&reserveK=0.65");
    });
  });

  test("R5 completed draft renders RUN IT BACK and resets to a fresh scout-hire start", async () => {
    vi.mocked(getAuctionSession).mockResolvedValue({
      leagueId: "league-page",
      seasonNumber: 1,
      seed: "completed-draft",
      session: { state: "AUCTION_COMPLETE" },
      createdDate: "2026-01-01T00:00:00.000Z",
      lastModified: "2026-01-01T00:00:00.000Z",
    } as Awaited<ReturnType<typeof getAuctionSession>>);

    render(<LeagueBuilderDraftSetup />);

    expect(await screen.findByText("Drafted ✓")).toBeInTheDocument();
    const runItBack = await screen.findByRole("button", { name: "RUN IT BACK" });
    expect(runItBack).toBeEnabled();

    fireEvent.click(runItBack);
    expect(screen.getByText("SURE?")).toBeInTheDocument();
    expect(screen.getByText(
      "Clears the finished draft and every roster it handed out. Your pool, prices, designs, and identities stay. You'll draft again from scout hire.",
    )).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Confirm run it back" }));

    await waitFor(() => {
      expect(resetCompletedDraftArc).toHaveBeenCalledWith("league-page");
    });
    await waitFor(() => {
      expect(screen.queryByText("Drafted ✓")).not.toBeInTheDocument();
    });

    const start = screen.getByRole("button", { name: /START THE DRAFT/i });
    expect(start).toBeEnabled();
    fireEvent.click(start);
    expect(mockNavigate).toHaveBeenCalledWith("/league-builder/scout-hire?leagueId=league-page&shills=0&reserveK=0.65");
  });

  test("R4 disables RUN IT BACK when a franchise already references the league", async () => {
    vi.mocked(getAuctionSession).mockResolvedValue({
      leagueId: "league-page",
      seasonNumber: 1,
      seed: "completed-draft",
      session: { state: "AUCTION_COMPLETE" },
      createdDate: "2026-01-01T00:00:00.000Z",
      lastModified: "2026-01-01T00:00:00.000Z",
    } as Awaited<ReturnType<typeof getAuctionSession>>);
    vi.mocked(leagueHasLinkedFranchise).mockResolvedValue(true);

    render(<LeagueBuilderDraftSetup />);

    expect(await screen.findByText("Drafted ✓")).toBeInTheDocument();
    expect(await screen.findByText(RUN_IT_BACK_FRANCHISE_GUARD_MESSAGE)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "RUN IT BACK" })).toBeDisabled();
    expect(resetCompletedDraftArc).not.toHaveBeenCalled();
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
    const onePointFiveButton = screen.getByRole("button", { name: "1.5×" });
    await waitFor(() => {
      expect(onePointFiveButton).not.toBeDisabled();
    });
    fireEvent.click(onePointFiveButton);

    await waitFor(() => {
      expect(saveLeagueTemplate).toHaveBeenCalledWith(expect.objectContaining({
        id: "league-page",
        poolSizeMultiplier: 1.5,
      }));
    });
  });

  test("renders Pool Quality stops with the 68 baseline default", async () => {
    mockLeagueData({
      league: makeLeague({ draftPoolMode: "pool-first" }),
      pool: makePool({ locked: false }),
    });

    render(<LeagueBuilderDraftSetup />);

    expect(await screen.findByText("POOL QUALITY")).toBeInTheDocument();
    expect(screen.getByText("Shift the numeric talent curve up or down while preserving the selected pool shape.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "64" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "66" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "68 baseline" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "70" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "72" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "74" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "76" })).toBeInTheDocument();
    expect(screen.getByText("baseline")).toBeInTheDocument();
  });

  test("renders the advisory Cap Fit diagnostic without reserve-price or apply-recommendation copy", async () => {
    mockLeagueData({
      league: makeLeague({ draftPoolMode: "pool-first", salaryCap: 1_000_000 }),
      pool: makePool({ locked: false }),
    });

    render(<LeagueBuilderDraftSetup />);

    expect(await screen.findByLabelText("Cap fit diagnostic")).toBeInTheDocument();
    expect(capFitDiagnosticText()).toContain("Cap Fit:");
    expect(capFitDiagnosticText()).toContain("Current Cap: $1,000,000");
    expect(capFitDiagnosticText()).toContain("Suggested Neutral Cap:");
    expect(capFitDiagnosticText()).toContain("expected drafted window");
    expect(capFitDiagnosticText()).toContain("advisory only");
    expect(capFitDiagnosticText()).toContain("Based on the expected drafted window, not every player in the pool.");
    expect(capFitDiagnosticText()).toContain("Uses actual generated pool values");
    expect(capFitDiagnosticText()).toContain("Pool quality and salary cap are separate. Changing Pool Quality does not change the cap.");
    expect(screen.queryByText(/reserve price/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/luxury tax/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /apply recommended cap/i })).not.toBeInTheDocument();
  });

  test("displays the retuned inflationary state as Cap Rich near a 1.30 cap ratio", async () => {
    const legalPlayers = makeLegalRosterPlayers(10_000);
    mockLeagueData({
      league: makeLeague({
        teamIds: ["team-a"],
        draftPoolMode: "pool-first",
        salaryCap: 1_034_526,
      }),
      teams: [makeTeam("team-a")],
      players: legalPlayers,
      pool: makePool({
        locked: false,
        players: legalPlayers.map((player) => ({ id: player.id, iv: 10_000, salary: 10_000 })),
        totalSlots: legalPlayers.length,
      }),
    });

    render(<LeagueBuilderDraftSetup />);

    expect(await screen.findByLabelText("Cap fit diagnostic")).toBeInTheDocument();
    expect(capFitDiagnosticText()).toContain("Cap Fit: Cap Rich");
    expect(capFitDiagnosticText()).toContain("Suggested Neutral Cap: $795,789");
    expect(capFitDiagnosticText()).toContain("Current Cap: $1,034,526");
    expect(capFitDiagnosticText()).not.toContain("Very Loose");
    expect(saveLeagueTemplate).not.toHaveBeenCalled();
  });

  test("changing Pool Quality does not mutate salary cap while the diagnostic stays visible", async () => {
    mockLeagueData({
      league: makeLeague({ draftPoolMode: "pool-first", salaryCap: 900_000 }),
      pool: makePool({ locked: false }),
    });

    render(<LeagueBuilderDraftSetup />);

    expect(await screen.findByLabelText("Cap fit diagnostic")).toBeInTheDocument();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "76" }));
    });

    expect(capFitDiagnosticText()).toContain("Current Cap: $900,000");
    expect(saveLeagueTemplate).not.toHaveBeenCalled();
  });

  test("diagnostic recommendation updates from current generated pool values after Pool Quality generation changes composition", async () => {
    const lowPoolPlayers = [
      ...makeQualityRosterPlayerSet("low-one", 30),
      ...makeQualityRosterPlayerSet("low-two", 30),
    ];
    const highPoolPlayers = lowPoolPlayers.map((player) => ({
      ...player,
      power: 90,
      contact: 90,
      speed: 90,
      fielding: 90,
      arm: 90,
      velocity: 90,
      junk: 90,
      accuracy: 90,
    }));
    const league = makeLeague({
      draftPoolMode: "pool-first",
      salaryCap: 1_000_000,
    });
    const { rerender } = render(<LeagueBuilderDraftSetup />);

    mockLeagueData({
      league,
      players: lowPoolPlayers,
      pool: makePool({
        locked: false,
        players: lowPoolPlayers.map((player) => ({ id: player.id, iv: player.salary, salary: player.salary })),
        totalSlots: lowPoolPlayers.length,
      }),
    });
    await act(async () => {
      rerender(<LeagueBuilderDraftSetup />);
    });

    expect(await screen.findByLabelText("Cap fit diagnostic")).toBeInTheDocument();
    const lowDiagnostic = capFitDiagnosticText();

    await clickDraftSetupButton("76");

    mockLeagueData({
      league,
      players: highPoolPlayers,
      pool: makePool({
        locked: false,
        players: highPoolPlayers.map((player) => ({ id: player.id, iv: player.salary, salary: player.salary })),
        totalSlots: highPoolPlayers.length,
      }),
    });
    await act(async () => {
      rerender(<LeagueBuilderDraftSetup />);
    });

    expect(capFitDiagnosticText()).toContain("Current Cap: $1,000,000");
    expect(capFitDiagnosticText()).not.toBe(lowDiagnostic);
  });

  test("Cap Fit diagnostic survives preset, source, Regenerate, and Reroll without salary cap mutation", async () => {
    const currentPlayers = ["one", "two", "three", "four"].flatMap((prefix) =>
      makeLegalRosterPlayerSet(prefix, 10_000),
    );
    const candidatePlayers = ["five", "six", "seven"].flatMap((prefix) =>
      makeLegalRosterPlayerSet(prefix, 10_000).map((player) => ({
        ...player,
        leagueAssignments: [],
      })),
    );
    mockLeagueData({
      league: makeLeague({
        teamIds: ["team-a", "team-b", "team-c", "team-d"],
        draftPoolMode: "pool-first",
        salaryCap: 1_000_000,
      }),
      teams: ["team-a", "team-b", "team-c", "team-d"].map((teamId) => makeTeam(teamId)),
      players: [...currentPlayers, ...candidatePlayers],
      pool: makePool({
        locked: false,
        players: currentPlayers.map((player) => ({ id: player.id, iv: player.salary, salary: player.salary })),
        totalSlots: currentPlayers.length,
      }),
    });

    render(<LeagueBuilderDraftSetup />);

    expect(await screen.findByLabelText("Cap fit diagnostic")).toBeInTheDocument();
    await clickDraftSetupButton(/^Grounded$/i);
    await clickDraftSetupButton(/^Full player pool$/i);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Regenerate production-shaped pool/i })).not.toBeDisabled();
    });
    vi.mocked(extractPoolFromDemand).mockClear();
    await clickDraftSetupButton(/Regenerate production-shaped pool/i);

    await waitForExtractPoolOptions((options) => {
      return options.generationNonce === 0
        && options.poolBalancePreset === "grounded"
        && options.poolSourceMode === "full-pool";
    });
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Regenerate production-shaped pool/i })).not.toBeDisabled();
    });
    expect(capFitDiagnosticText()).toContain("Current Cap: $1,000,000");
    vi.mocked(extractPoolFromDemand).mockClear();

    await clickDraftSetupButton(/Reroll generated players/i);

    await waitForExtractPoolOptions((options) => {
      return options.generationNonce === 1
        && options.poolBalancePreset === "grounded"
        && options.poolSourceMode === "full-pool";
    });
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Reroll generated players/i })).not.toBeDisabled();
    });
    expect(capFitDiagnosticText()).toContain("Suggested Neutral Cap:");
    expect(capFitDiagnosticText()).toContain("advisory only");
    expect(saveLeagueTemplate).not.toHaveBeenCalled();
  }, 20_000);

  test("M1 applies THE MONEY and the recheck header follows the persisted cap", async () => {
    const unlockedPool = makePool({ locked: false });
    const { rerender } = render(<LeagueBuilderDraftSetup />);

    mockLeagueData({ pool: unlockedPool });
    rerender(<LeagueBuilderDraftSetup />);

    expect(await screen.findByText("THE MONEY")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("The money salary cap"), { target: { value: "900000" } });
    fireEvent.click(screen.getByRole("button", { name: /^APPLY$/i }));

    await waitFor(() => {
      expect(saveLeagueTemplate).toHaveBeenCalledWith(expect.objectContaining({
        id: "league-page",
        salaryCap: 900_000,
      }));
    });

    mockLeagueData({ league: makeLeague({ salaryCap: 900_000 }), pool: unlockedPool });
    rerender(<LeagueBuilderDraftSetup />);

    expect(await screen.findByText(/CAN EVERY CLUB BUILD A LEGAL 22 UNDER \$900,000/i)).toBeInTheDocument();
  });

  test("M2 THE MONEY uses the shared below-floor hard error and disables APPLY", async () => {
    mockLeagueData({ pool: makePool({ locked: false }) });
    render(<LeagueBuilderDraftSetup />);

    fireEvent.change(await screen.findByLabelText("The money salary cap"), { target: { value: String(SALARY_CAP_FLOOR - 1) } });

    expect(screen.getByText(salaryCapHardError(SALARY_CAP_FLOOR - 1)!)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^APPLY$/i })).toBeDisabled();
  });

  test("M3 resets THE MONEY to tier par", async () => {
    mockLeagueData({
      league: makeLeague({ salaryCap: 900_000 }),
      pool: makePool({ locked: false }),
    });

    render(<LeagueBuilderDraftSetup />);

    await clickDraftSetupButton(/RESET TO TIER/i);

    await waitFor(() => {
      expect(saveLeagueTemplate).toHaveBeenCalledWith(expect.objectContaining({
        id: "league-page",
        salaryCap: undefined,
      }));
    });
  });

  test("M4-M6 extraction basis marks cap, dial, and identity drift without retro-nagging legacy pools", async () => {
    const extractedBasis = {
      cap: 1_000_000,
      poolSizeMultiplier: 1.35,
      identityByTeamId: { "team-a": "murderers-row", "team-b": "whiteyball" },
    };
    const staleLeague = makeLeague({
      draftPoolMode: "design-first",
      poolExtractedAt: "2026-01-02T00:00:00.000Z",
      poolExtractedBasis: extractedBasis,
      salaryCap: 900_000,
      poolSizeMultiplier: 1.5,
    });
    const teams = [
      makeTeam("team-a", { rosterDesign: makeLockedRosterDesign("2026-01-01T00:00:00.000Z") }),
      makeTeam("team-b", {
        mlbArchetypeKey: "murderers-row",
        rosterDesign: makeLockedRosterDesign("2026-01-01T00:00:00.000Z"),
      }),
    ];
    const { rerender } = render(<LeagueBuilderDraftSetup />);

    mockLeagueData({ league: staleLeague, teams, pool: makePool() });
    rerender(<LeagueBuilderDraftSetup />);

    expect(await screen.findByText(/THE CAP MOVED \(\$1,000,000 → \$900,000\) SINCE THE POOL WAS DRAWN/i)).toBeInTheDocument();
    expect(screen.getByText("THE POOL-SIZE DIAL MOVED — RE-EXTRACT TO REDRAW.")).toBeInTheDocument();
    expect(screen.getByText("Keys CHANGED ITS IDENTITY — RE-EXTRACT TO RESTOCK FOR IT.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /START THE DRAFT/i })).toBeDisabled();

    mockLeagueData({
      league: makeLeague({
        draftPoolMode: "design-first",
        poolExtractedAt: "2026-01-02T00:00:00.000Z",
      }),
      teams: [
        makeTeam("team-a", { rosterDesign: makeLockedRosterDesign("2026-01-01T00:00:00.000Z") }),
        makeTeam("team-b", { rosterDesign: makeLockedRosterDesign("2026-01-01T00:00:00.000Z") }),
      ],
      pool: makePool(),
    });
    rerender(<LeagueBuilderDraftSetup />);

    await waitFor(() => {
      expect(screen.queryByText(/THE CAP MOVED/i)).not.toBeInTheDocument();
    });
  });

  test("M6b shill-count basis stales the pool and hides the healed sizing receipt", async () => {
    window.history.pushState({}, "", "/league-builder/draft-setup?leagueId=league-page&shills=1");
    const players = [
      ...makeLegalRosterPlayerSet("one", 10_000),
      ...makeLegalRosterPlayerSet("two", 10_000),
    ];
    const teams = [
      makeTeam("team-a", { rosterDesign: makeLockedRosterDesign("2026-01-01T00:00:00.000Z") }),
      makeTeam("team-b", { rosterDesign: makeLockedRosterDesign("2026-01-01T00:00:00.000Z") }),
    ];
    const staleLeague = makeLeague({
      draftPoolMode: "design-first",
      poolExtractedAt: "2026-01-02T00:00:00.000Z",
      poolExtractedBasis: {
        cap: 1_000_000,
        poolSizeMultiplier: 1.35,
        shills: 0,
        identityByTeamId: { "team-a": "murderers-row", "team-b": "murderers-row" },
      },
      salaryCap: 1_000_000,
      poolSizeMultiplier: 1.35,
    });
    const pool = makePool({
      locked: false,
      players: players.map((player) => ({ id: player.id, iv: player.salary, salary: player.salary })),
    });
    const { rerender } = render(<LeagueBuilderDraftSetup />);

    mockLeagueData({ league: staleLeague, teams, players, pool });
    rerender(<LeagueBuilderDraftSetup />);

    expect(await screen.findByText("THE SHILL COUNT MOVED — RE-EXTRACT TO REDRAW.")).toBeInTheDocument();
    await waitFor(() => {
      expect(extractPoolFromDemand).toHaveBeenCalled();
    });
    expect(screen.queryByText(/Sized to .*added .* for affordability/i)).not.toBeInTheDocument();

    mockLeagueData({
      league: {
        ...staleLeague,
        poolExtractedBasis: {
          ...staleLeague.poolExtractedBasis!,
          shills: 1,
        },
      },
      teams,
      players,
      pool,
    });
    rerender(<LeagueBuilderDraftSetup />);

    await waitFor(() => {
      expect(screen.queryByText("THE SHILL COUNT MOVED — RE-EXTRACT TO REDRAW.")).not.toBeInTheDocument();
    });
    expect(await screen.findByText(/Sized to .*added .* for affordability/i)).toBeInTheDocument();
  });

  test("pool-first regeneration uses numeric-shaped slack target instead of exact roster demand", async () => {
    const currentPlayers = ["one", "two", "three", "four"].flatMap((prefix) =>
      makeLegalRosterPlayerSet(prefix, 10_000),
    );
    const candidatePlayers = ["five", "six"].flatMap((prefix) =>
      makeLegalRosterPlayerSet(prefix, 10_000).map((player) => ({
        ...player,
        leagueAssignments: [],
      })),
    );
    const players = [...currentPlayers, ...candidatePlayers];
    mockLeagueData({
      league: makeLeague({
        teamIds: ["team-a", "team-b", "team-c", "team-d"],
        draftPoolMode: "pool-first",
        poolSizeMultiplier: 1.25,
      }),
      teams: ["team-a", "team-b", "team-c", "team-d"].map((teamId) => makeTeam(teamId)),
      players,
      pool: makePool({
        locked: false,
        players: currentPlayers.map((player) => ({ id: player.id, iv: player.salary, salary: player.salary })),
        totalSlots: currentPlayers.length,
      }),
    });

    render(<LeagueBuilderDraftSetup />);

    await clickDraftSetupButton(/Regenerate production-shaped pool/i);

    await waitFor(() => {
      expect(extractPoolFromDemand).toHaveBeenCalled();
      expect(addPlayersToLeaguePool).toHaveBeenCalled();
    }, { timeout: 7000 });
    const extractMock = vi.mocked(extractPoolFromDemand);
    const matchingCall = extractMock.mock.calls.find((call) => {
      const options = call[4] as { teams?: number; poolBalancePreset?: string; poolSizeMultiplier?: number; pinnedIds?: string[]; poolSourceMode?: string };
      return options.teams === 4 && options.poolBalancePreset === "balanced" && options.poolSizeMultiplier === 1.25;
    });
    expect(matchingCall).toBeTruthy();
    const matchingOptions = matchingCall?.[4] as { pinnedIds?: string[]; priorityIds?: string[]; poolSourceMode?: string };
    expect(matchingOptions.poolSourceMode).toBe("team-roster-priority");
    expect(matchingOptions.priorityIds).toHaveLength(88);
    expect(matchingOptions.pinnedIds).toHaveLength(0);
    const addedIds = vi.mocked(addPlayersToLeaguePool).mock.calls[0]?.[0] ?? [];
    const removedIds = vi.mocked(removePlayersFromLeaguePool).mock.calls[0]?.[0] ?? [];
    expect(addedIds.length - removedIds.length).toBe(22);
    expect(await screen.findByText(/Sized to 110 \(1\.25×\)/i)).toBeInTheDocument();
    expect(screen.getByText((content) =>
      content.includes("Production shape: Balanced") &&
      content.includes("demand 88") &&
      content.includes("target 110") &&
      content.includes("actual 110") &&
      content.includes("source Team roster priority"),
    )).toBeInTheDocument();
  });

  test("pool-first regeneration carries the selected balance preset into numeric shaping", async () => {
    const currentPlayers = ["one", "two", "three", "four"].flatMap((prefix) =>
      makeLegalRosterPlayerSet(prefix, 10_000),
    );
    const candidatePlayers = ["five", "six"].flatMap((prefix) =>
      makeLegalRosterPlayerSet(prefix, 10_000).map((player) => ({
        ...player,
        leagueAssignments: [],
      })),
    );
    mockLeagueData({
      league: makeLeague({
        teamIds: ["team-a", "team-b", "team-c", "team-d"],
        draftPoolMode: "pool-first",
      }),
      teams: ["team-a", "team-b", "team-c", "team-d"].map((teamId) => makeTeam(teamId)),
      players: [...currentPlayers, ...candidatePlayers],
      pool: makePool({
        locked: false,
        players: currentPlayers.map((player) => ({ id: player.id, iv: player.salary, salary: player.salary })),
        totalSlots: currentPlayers.length,
      }),
    });

    render(<LeagueBuilderDraftSetup />);

    fireEvent.click(await screen.findByRole("button", { name: /^Grounded$/i }));
    fireEvent.click(screen.getByRole("button", { name: /Regenerate production-shaped pool/i }));

    await waitFor(() => {
      expect(extractPoolFromDemand).toHaveBeenCalled();
    });
    const options = vi.mocked(extractPoolFromDemand).mock.calls.at(-1)?.[4] as {
      poolBalancePreset?: string;
      poolSizeMultiplier?: number;
    };
    expect(options.poolBalancePreset).toBe("grounded");
    expect(options.poolSizeMultiplier).toBe(1.2);
    expect(await screen.findByText(/Sized to 106 \(1\.20×\)/i)).toBeInTheDocument();
  });

  test("pool-first regeneration carries the selected pool quality center without saving salary cap", async () => {
    const currentPlayers = ["one", "two", "three", "four"].flatMap((prefix) =>
      makeLegalRosterPlayerSet(prefix, 10_000),
    );
    const candidatePlayers = ["five", "six"].flatMap((prefix) =>
      makeLegalRosterPlayerSet(prefix, 10_000).map((player) => ({
        ...player,
        leagueAssignments: [],
      })),
    );
    mockLeagueData({
      league: makeLeague({
        teamIds: ["team-a", "team-b", "team-c", "team-d"],
        draftPoolMode: "pool-first",
        salaryCap: 1_000_000,
      }),
      teams: ["team-a", "team-b", "team-c", "team-d"].map((teamId) => makeTeam(teamId)),
      players: [...currentPlayers, ...candidatePlayers],
      pool: makePool({
        locked: false,
        players: currentPlayers.map((player) => ({ id: player.id, iv: player.salary, salary: player.salary })),
        totalSlots: currentPlayers.length,
      }),
    });

    render(<LeagueBuilderDraftSetup />);

    await clickDraftSetupButton("72");
    await clickDraftSetupButton(/Regenerate production-shaped pool/i);

    const options = await waitForExtractPoolOptions((callOptions) =>
      callOptions.poolQualityCenter === 72
        && callOptions.poolBalancePreset === "balanced"
        && callOptions.poolSizeMultiplier === 1.25,
    );
    expect(options.poolQualityCenter).toBe(72);
    expect(options.poolBalancePreset).toBe("balanced");
    expect(options.poolSizeMultiplier).toBe(1.25);
    expect(saveLeagueTemplate).not.toHaveBeenCalled();
    expect(await screen.findByText((content) =>
      content.includes("Production shape: Balanced") &&
      content.includes("quality 72") &&
      content.includes("achieved"),
    )).toBeInTheDocument();
  });

  test("pool quality center restores from session and feeds regeneration", async () => {
    window.sessionStorage.setItem("kbl:draft-pool-quality-center:league-page:pool-first", "74");
    const currentPlayers = ["one", "two", "three", "four"].flatMap((prefix) =>
      makeLegalRosterPlayerSet(prefix, 10_000),
    );
    const candidatePlayers = ["five", "six"].flatMap((prefix) =>
      makeLegalRosterPlayerSet(prefix, 10_000).map((player) => ({
        ...player,
        leagueAssignments: [],
      })),
    );
    mockLeagueData({
      league: makeLeague({
        teamIds: ["team-a", "team-b", "team-c", "team-d"],
        draftPoolMode: "pool-first",
      }),
      teams: ["team-a", "team-b", "team-c", "team-d"].map((teamId) => makeTeam(teamId)),
      players: [...currentPlayers, ...candidatePlayers],
      pool: makePool({
        locked: false,
        players: currentPlayers.map((player) => ({ id: player.id, iv: player.salary, salary: player.salary })),
        totalSlots: currentPlayers.length,
      }),
    });

    render(<LeagueBuilderDraftSetup />);

    fireEvent.click(await screen.findByRole("button", { name: /Regenerate production-shaped pool/i }));

    await waitForExtractPoolOptions((options) => options.poolQualityCenter === 74);
    expect(screen.getByText("highest")).toBeInTheDocument();
  });

  test("repeated pool-first regenerate is idempotent for engine-generated players", async () => {
    const currentPlayers = ["one", "two", "three", "four"].flatMap((prefix) =>
      makeLegalRosterPlayerSet(prefix, 10_000),
    );
    const candidatePlayers = ["five", "six"].flatMap((prefix) =>
      makeLegalRosterPlayerSet(prefix, 10_000).map((player) => ({
        ...player,
        leagueAssignments: [],
      })),
    );
    const players = [...currentPlayers, ...candidatePlayers];
    const league = makeLeague({
      teamIds: ["team-a", "team-b", "team-c", "team-d"],
      draftPoolMode: "pool-first",
      poolSizeMultiplier: 1.25,
    });
    const teams = ["team-a", "team-b", "team-c", "team-d"].map((teamId) => makeTeam(teamId));
    const { rerender } = render(<LeagueBuilderDraftSetup />);

    mockLeagueData({
      league,
      teams,
      players,
      pool: makePool({
        locked: false,
        players: currentPlayers.map((player) => ({ id: player.id, iv: player.salary, salary: player.salary })),
        totalSlots: currentPlayers.length,
      }),
    });
    rerender(<LeagueBuilderDraftSetup />);

    fireEvent.click(await screen.findByRole("button", { name: /Regenerate production-shaped pool/i }));

    await waitFor(() => {
      expect(addPlayersToLeaguePool).toHaveBeenCalled();
    });
    const firstAddedIds = vi.mocked(addPlayersToLeaguePool).mock.calls[0]?.[0] ?? [];
    const firstRemovedIds = vi.mocked(removePlayersFromLeaguePool).mock.calls[0]?.[0] ?? [];
    expect(firstAddedIds.length - firstRemovedIds.length).toBe(22);

    vi.mocked(addPlayersToLeaguePool).mockClear();
    vi.mocked(removePlayersFromLeaguePool).mockClear();
    const firstFinalIds = [
      ...currentPlayers.map((player) => player.id).filter((id) => !firstRemovedIds.includes(id)),
      ...firstAddedIds,
    ];
    const assignedPlayers = players.map((player) => {
      if (firstRemovedIds.includes(player.id)) return { ...player, leagueAssignments: [] };
      if (firstAddedIds.includes(player.id)) {
        return { ...player, leagueAssignments: [{ leagueId: "league-page", teamId: "", rosterStatus: "FREE_AGENT" as const }] };
      }
      return player;
    });
    mockLeagueData({
      league,
      teams,
      players: assignedPlayers,
      pool: makePool({
        locked: false,
        players: firstFinalIds.map((id) => ({ id, iv: 10_000, salary: 10_000 })),
        totalSlots: 110,
      }),
    });
    rerender(<LeagueBuilderDraftSetup />);

    fireEvent.click(screen.getByRole("button", { name: /Regenerate production-shaped pool/i }));

    await waitFor(() => {
      expect(extractPoolFromDemand).toHaveBeenCalledTimes(2);
    });
    expect(addPlayersToLeaguePool).not.toHaveBeenCalled();
    expect(removePlayersFromLeaguePool).not.toHaveBeenCalled();
  });

  test("reroll advances the deterministic generation nonce without converting roster priority into hard keeps", async () => {
    const currentPlayers = ["one", "two", "three", "four"].flatMap((prefix) =>
      makeLegalRosterPlayerSet(prefix, 10_000),
    );
    const candidatePlayers = ["five", "six", "seven"].flatMap((prefix) =>
      makeLegalRosterPlayerSet(prefix, 10_000).map((player) => ({
        ...player,
        leagueAssignments: [],
      })),
    );
    mockLeagueData({
      league: makeLeague({
        teamIds: ["team-a", "team-b", "team-c", "team-d"],
        draftPoolMode: "pool-first",
      }),
      teams: ["team-a", "team-b", "team-c", "team-d"].map((teamId) => makeTeam(teamId)),
      players: [...currentPlayers, ...candidatePlayers],
      pool: makePool({
        locked: false,
        players: currentPlayers.map((player) => ({ id: player.id, iv: player.salary, salary: player.salary })),
        totalSlots: currentPlayers.length,
      }),
    });

    render(<LeagueBuilderDraftSetup />);

    await clickDraftSetupButton("72");
    await clickDraftSetupButton(/Regenerate production-shaped pool/i);
    await waitForExtractPoolOptions((options) => {
      return options.generationNonce === 0
        && options.poolQualityCenter === 72
        && options.poolSourceMode === "team-roster-priority";
    });

    vi.mocked(extractPoolFromDemand).mockClear();
    await clickDraftSetupButton(/Reroll generated players/i);

    const rerollOptions = await waitForExtractPoolOptions((options) => {
      return options.generationNonce === 1
        && options.poolQualityCenter === 72
        && options.poolSourceMode === "team-roster-priority"
        && options.priorityIds?.length === 88
        && options.pinnedIds?.length === 0;
    });
    expect(rerollOptions.priorityIds).toHaveLength(88);
    expect(rerollOptions.pinnedIds).toHaveLength(0);
  });

  test("reroll preserves roster-design pinned players as hard keeps", async () => {
    const currentPlayers = ["one", "two", "three", "four"].flatMap((prefix) =>
      makeLegalRosterPlayerSet(prefix, 10_000),
    );
    const pinnedPlayer = currentPlayers.find((player) => player.primaryPosition === "C")!;
    const candidatePlayers = ["five", "six", "seven"].flatMap((prefix) =>
      makeLegalRosterPlayerSet(prefix, 10_000).map((player) => ({
        ...player,
        leagueAssignments: [],
      })),
    );
    mockLeagueData({
      league: makeLeague({
        teamIds: ["team-a", "team-b", "team-c", "team-d"],
        draftPoolMode: "pool-first",
      }),
      teams: [
        makeTeam("team-a", {
          rosterDesign: {
            slots: [],
            pins: { C: pinnedPlayer.id },
          },
        }),
        ...["team-b", "team-c", "team-d"].map((teamId) => makeTeam(teamId)),
      ],
      players: [...currentPlayers, ...candidatePlayers],
      pool: makePool({
        locked: false,
        players: currentPlayers.map((player) => ({ id: player.id, iv: player.salary, salary: player.salary })),
        totalSlots: currentPlayers.length,
      }),
    });

    render(<LeagueBuilderDraftSetup />);

    await clickDraftSetupButton("72");
    await clickDraftSetupButton(/Regenerate production-shaped pool/i);
    await waitForExtractPoolOptions((options) => {
      return options.generationNonce === 0
        && options.poolQualityCenter === 72
        && Boolean(options.pinnedIds?.includes(pinnedPlayer.id));
    });

    vi.mocked(removePlayersFromLeaguePool).mockClear();
    vi.mocked(extractPoolFromDemand).mockClear();
    await clickDraftSetupButton(/Reroll generated players/i);

    const rerollOptions = await waitForExtractPoolOptions((options) => {
      return options.generationNonce === 1
        && options.poolQualityCenter === 72
        && Boolean(options.pinnedIds?.includes(pinnedPlayer.id))
        && !options.excludedIds?.includes(pinnedPlayer.id);
    });
    expect(rerollOptions.pinnedIds).toContain(pinnedPlayer.id);
    expect(rerollOptions.excludedIds).not.toContain(pinnedPlayer.id);
    const removedIds = vi.mocked(removePlayersFromLeaguePool).mock.calls.flatMap((call) => call[0] ?? []);
    expect(removedIds).not.toContain(pinnedPlayer.id);
  });

  test("manual exclusion does not beat a roster-design pin during regeneration", async () => {
    const currentPlayers = ["one", "two", "three", "four"].flatMap((prefix) =>
      makeLegalRosterPlayerSet(prefix, 10_000),
    );
    const pinnedPlayer = currentPlayers.find((player) => player.primaryPosition === "C")!;
    const candidatePlayers = ["five", "six", "seven"].flatMap((prefix) =>
      makeLegalRosterPlayerSet(prefix, 10_000).map((player) => ({
        ...player,
        leagueAssignments: [],
      })),
    );
    window.sessionStorage.setItem("kbl:draft-pool-provenance:league-page:pool-first", JSON.stringify({
      engineGeneratedIds: currentPlayers.map((player) => player.id),
      userAddedIds: [],
      manualExcludedIds: [pinnedPlayer.id],
      seedProtectedIds: [],
      generationNonce: 0,
    }));
    mockLeagueData({
      league: makeLeague({
        teamIds: ["team-a", "team-b", "team-c", "team-d"],
        draftPoolMode: "pool-first",
      }),
      teams: [
        makeTeam("team-a", {
          rosterDesign: {
            slots: [],
            pins: { C: pinnedPlayer.id },
          },
        }),
        ...["team-b", "team-c", "team-d"].map((teamId) => makeTeam(teamId)),
      ],
      players: [...currentPlayers, ...candidatePlayers],
      pool: makePool({
        locked: false,
        players: currentPlayers.map((player) => ({ id: player.id, iv: player.salary, salary: player.salary })),
        totalSlots: currentPlayers.length,
      }),
    });

    render(<LeagueBuilderDraftSetup />);

    await clickDraftSetupButton("72");
    await clickDraftSetupButton(/Regenerate production-shaped pool/i);

    const options = await waitForExtractPoolOptions((candidate) => (
      candidate.poolQualityCenter === 72
      && Boolean(candidate.pinnedIds?.includes(pinnedPlayer.id))
      && !candidate.excludedIds?.includes(pinnedPlayer.id)
    ));
    expect(options.poolQualityCenter).toBe(72);
    expect(options.pinnedIds).toContain(pinnedPlayer.id);
    expect(options.excludedIds).not.toContain(pinnedPlayer.id);
  });

  test("quality-center changes preserve user-added hard keeps and manual exclusions", async () => {
    const currentPlayers = ["one", "two", "three", "four"].flatMap((prefix) =>
      makeLegalRosterPlayerSet(prefix, 10_000),
    );
    const userAdded = currentPlayers[0];
    const manualExcluded = currentPlayers[1];
    const candidatePlayers = ["five", "six", "seven"].flatMap((prefix) =>
      makeLegalRosterPlayerSet(prefix, 10_000).map((player) => ({
        ...player,
        leagueAssignments: [],
      })),
    );
    window.sessionStorage.setItem("kbl:draft-pool-provenance:league-page:pool-first", JSON.stringify({
      engineGeneratedIds: currentPlayers.map((player) => player.id).filter((id) => id !== userAdded.id),
      userAddedIds: [userAdded.id],
      manualExcludedIds: [manualExcluded.id],
      seedProtectedIds: [],
      generationNonce: 0,
    }));
    mockLeagueData({
      league: makeLeague({
        teamIds: ["team-a", "team-b", "team-c", "team-d"],
        draftPoolMode: "pool-first",
      }),
      teams: ["team-a", "team-b", "team-c", "team-d"].map((teamId) => makeTeam(teamId)),
      players: [...currentPlayers, ...candidatePlayers],
      pool: makePool({
        locked: false,
        players: currentPlayers.map((player) => ({ id: player.id, iv: player.salary, salary: player.salary })),
        totalSlots: currentPlayers.length,
      }),
    });

    render(<LeagueBuilderDraftSetup />);

    fireEvent.click(await screen.findByRole("button", { name: "72" }));
    fireEvent.click(screen.getByRole("button", { name: /Regenerate production-shaped pool/i }));

    const options = await waitForExtractPoolOptions((candidate) => (
      candidate.poolQualityCenter === 72
      && Boolean(candidate.pinnedIds?.includes(userAdded.id))
      && Boolean(candidate.excludedIds?.includes(manualExcluded.id))
    ));
    expect(options.pinnedIds).toContain(userAdded.id);
    expect(options.excludedIds).toContain(manualExcluded.id);
  });

  test("source mode switching rebuilds disposable engine players without preserving roster priority as hard keep", async () => {
    const currentPlayers = ["one", "two", "three", "four"].flatMap((prefix) =>
      makeLegalRosterPlayerSet(prefix, 10_000),
    );
    const candidatePlayers = ["five", "six", "seven"].flatMap((prefix) =>
      makeLegalRosterPlayerSet(prefix, 10_000).map((player) => ({
        ...player,
        leagueAssignments: [],
      })),
    );
    mockLeagueData({
      league: makeLeague({
        teamIds: ["team-a", "team-b", "team-c", "team-d"],
        draftPoolMode: "pool-first",
      }),
      teams: ["team-a", "team-b", "team-c", "team-d"].map((teamId) => makeTeam(teamId)),
      players: [...currentPlayers, ...candidatePlayers],
      pool: makePool({
        locked: false,
        players: currentPlayers.map((player) => ({ id: player.id, iv: player.salary, salary: player.salary })),
        totalSlots: currentPlayers.length,
      }),
    });

    render(<LeagueBuilderDraftSetup />);

    await clickDraftSetupButton("72");
    await clickDraftSetupButton(/Full player pool/i);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Regenerate production-shaped pool/i })).not.toBeDisabled();
    });
    vi.mocked(extractPoolFromDemand).mockClear();
    await clickDraftSetupButton(/Regenerate production-shaped pool/i);

    const options = await waitForExtractPoolOptions((callOptions) => {
      return callOptions.poolSourceMode === "full-pool"
        && callOptions.poolQualityCenter === 72
        && callOptions.priorityIds?.length === 88
        && callOptions.pinnedIds?.length === 0;
    });
    expect(options.poolQualityCenter).toBe(72);
    expect(options.poolSourceMode).toBe("full-pool");
    expect(options.priorityIds).toHaveLength(88);
    expect(options.pinnedIds).toHaveLength(0);
  });

  test("session provenance keeps remounted generated players disposable", async () => {
    const seedPlayers = ["one", "two", "three", "four"].flatMap((prefix) =>
      makeLegalRosterPlayerSet(prefix, 10_000),
    );
    const generatedPlayers = makeLegalRosterPlayerSet("generated", 10_000).map((player) => ({
      ...player,
      leagueAssignments: [{ leagueId: "league-page", teamId: "", rosterStatus: "FREE_AGENT" as const }],
    }));
    const extraGeneratedPlayers = makeLegalRosterPlayerSet("generated-extra", 10_000).map((player) => ({
      ...player,
      leagueAssignments: [{ leagueId: "league-page", teamId: "", rosterStatus: "FREE_AGENT" as const }],
    }));
    const candidatePlayers = ["five", "six"].flatMap((prefix) =>
      makeLegalRosterPlayerSet(prefix, 10_000).map((player) => ({
        ...player,
        leagueAssignments: [],
      })),
    );
    window.sessionStorage.setItem("kbl:draft-pool-provenance:league-page:pool-first", JSON.stringify({
      engineGeneratedIds: [...generatedPlayers, ...extraGeneratedPlayers].map((player) => player.id),
      userAddedIds: [],
      manualExcludedIds: [],
      seedProtectedIds: seedPlayers.map((player) => player.id),
      generationNonce: 0,
    }));
    mockLeagueData({
      league: makeLeague({
        teamIds: ["team-a", "team-b", "team-c", "team-d"],
        draftPoolMode: "pool-first",
      }),
      teams: ["team-a", "team-b", "team-c", "team-d"].map((teamId) => makeTeam(teamId)),
      players: [...seedPlayers, ...generatedPlayers, ...extraGeneratedPlayers, ...candidatePlayers],
      pool: makePool({
        locked: false,
        players: [...seedPlayers, ...generatedPlayers, ...extraGeneratedPlayers].map((player) => ({
          id: player.id,
          iv: player.salary,
          salary: player.salary,
        })),
        totalSlots: seedPlayers.length + generatedPlayers.length + extraGeneratedPlayers.length,
      }),
    });

    render(<LeagueBuilderDraftSetup />);

    await clickDraftSetupButton(/^Grounded$/i);
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Regenerate production-shaped pool/i })).not.toBeDisabled();
    });
    await clickDraftSetupButton(/Regenerate production-shaped pool/i);

    await waitFor(() => {
      expect(removePlayersFromLeaguePool).toHaveBeenCalled();
    });
    const options = await waitForExtractPoolOptions((callOptions) => callOptions.poolBalancePreset === "grounded");
    expect(options.pinnedIds).toHaveLength(88);
    const removedIds = vi.mocked(removePlayersFromLeaguePool).mock.calls[0]?.[0] ?? [];
    expect(removedIds.some((id) => generatedPlayers.some((player) => player.id === id) || extraGeneratedPlayers.some((player) => player.id === id))).toBe(true);
  });

  test("switching from balanced to grounded can shrink engine-generated slack", async () => {
    const currentPlayers = ["one", "two", "three", "four"].flatMap((prefix) =>
      makeLegalRosterPlayerSet(prefix, 10_000),
    );
    const candidatePlayers = ["five", "six"].flatMap((prefix) =>
      makeLegalRosterPlayerSet(prefix, 10_000).map((player) => ({
        ...player,
        leagueAssignments: [],
      })),
    );
    const players = [...currentPlayers, ...candidatePlayers];
    const league = makeLeague({
      teamIds: ["team-a", "team-b", "team-c", "team-d"],
      draftPoolMode: "pool-first",
      poolSizeMultiplier: 1.25,
    });
    const teams = ["team-a", "team-b", "team-c", "team-d"].map((teamId) => makeTeam(teamId));
    const { rerender } = render(<LeagueBuilderDraftSetup />);

    mockLeagueData({
      league,
      teams,
      players,
      pool: makePool({
        locked: false,
        players: currentPlayers.map((player) => ({ id: player.id, iv: player.salary, salary: player.salary })),
        totalSlots: currentPlayers.length,
      }),
    });
    rerender(<LeagueBuilderDraftSetup />);

    fireEvent.click(await screen.findByRole("button", { name: /Regenerate production-shaped pool/i }));
    await waitFor(() => {
      expect(addPlayersToLeaguePool).toHaveBeenCalled();
    });
    const balancedAddedIds = vi.mocked(addPlayersToLeaguePool).mock.calls[0]?.[0] ?? [];
    const balancedRemovedIds = vi.mocked(removePlayersFromLeaguePool).mock.calls[0]?.[0] ?? [];
    expect(balancedAddedIds.length - balancedRemovedIds.length).toBe(22);

    vi.mocked(addPlayersToLeaguePool).mockClear();
    vi.mocked(removePlayersFromLeaguePool).mockClear();
    const balancedFinalIds = [
      ...currentPlayers.map((player) => player.id).filter((id) => !balancedRemovedIds.includes(id)),
      ...balancedAddedIds,
    ];
    const assignedPlayers = players.map((player) => {
      if (balancedRemovedIds.includes(player.id)) return { ...player, leagueAssignments: [] };
      if (balancedAddedIds.includes(player.id)) {
        return { ...player, leagueAssignments: [{ leagueId: "league-page", teamId: "", rosterStatus: "FREE_AGENT" as const }] };
      }
      return player;
    });
    mockLeagueData({
      league,
      teams,
      players: assignedPlayers,
      pool: makePool({
        locked: false,
        players: balancedFinalIds.map((id) => ({ id, iv: 10_000, salary: 10_000 })),
        totalSlots: 110,
      }),
    });
    rerender(<LeagueBuilderDraftSetup />);

    fireEvent.click(screen.getByRole("button", { name: /^Grounded$/i }));
    fireEvent.click(screen.getByRole("button", { name: /Regenerate production-shaped pool/i }));

    await waitFor(() => {
      expect(removePlayersFromLeaguePool).toHaveBeenCalled();
    });
    const removedIds = vi.mocked(removePlayersFromLeaguePool).mock.calls[0]?.[0] ?? [];
    expect(removedIds.length).toBeGreaterThan(0);
    expect(removedIds.every((id) => balancedFinalIds.includes(id))).toBe(true);
  });

  test("manual pool diagnostics report illegal completion and block locking only for legality", async () => {
    const shortPool = makeLegalRosterPlayers(10_000).slice(0, 8);
    mockLeagueData({
      league: makeLeague({
        teamIds: ["team-a"],
        draftPoolMode: "pool-first",
      }),
      teams: [makeTeam("team-a")],
      players: shortPool,
      pool: makePool({
        locked: false,
        players: shortPool.map((player) => ({ id: player.id, iv: player.salary, salary: player.salary })),
        totalSlots: shortPool.length,
      }),
    });

    render(<LeagueBuilderDraftSetup />);

    expect(await screen.findByText((content) =>
      content.includes("Manual pool: Balanced") && content.includes("legal no"),
    )).toBeInTheDocument();
    expect(screen.getByText(/Pool cannot legally seat every club at 22 under the cap/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /LOCK POOL/i })).toBeDisabled();
  });

  test("available player rows expose IV instead of letter grade for swap decisions", async () => {
    const available = makePlayer(77, {
      id: "available-iv",
      firstName: "Ivy",
      lastName: "Value",
      salary: 42_000,
      overallGrade: "A+",
      leagueAssignments: [],
    });
    mockLeagueData({
      league: makeLeague({
        draftPoolMode: "pool-first",
      }),
      players: [available],
      pool: makePool({ locked: false, players: [], totalSlots: 0 }),
    });

    render(<LeagueBuilderDraftSetup />);

    expect(await screen.findByText("Ivy Value")).toBeInTheDocument();
    expect(screen.getByText(`$${Math.round(computePlayerIv(available)).toLocaleString()}`)).toBeInTheDocument();
  });

  test("available players default-sort by numeric IV high to low instead of first name", async () => {
    const highValue = makePlayer(201, {
      id: "available-high-iv",
      firstName: "Zed",
      lastName: "High",
      salary: 95_000,
      power: 99,
      contact: 99,
      speed: 99,
      fielding: 99,
      arm: 99,
      leagueAssignments: [],
    });
    const lowValue = makePlayer(202, {
      id: "available-low-iv",
      firstName: "Aaron",
      lastName: "Low",
      salary: 1_000,
      power: 10,
      contact: 10,
      speed: 10,
      fielding: 10,
      arm: 10,
      leagueAssignments: [],
    });
    mockLeagueData({
      league: makeLeague({
        draftPoolMode: "pool-first",
      }),
      players: [lowValue, highValue],
      pool: makePool({ locked: false, players: [], totalSlots: 0 }),
    });

    render(<LeagueBuilderDraftSetup />);

    const highNode = await screen.findByText("Zed High");
    const lowNode = await screen.findByText("Aaron Low");
    expect(highNode.compareDocumentPosition(lowNode) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  test("IV comparator sorts invalid values last and uses deterministic name/id ties", () => {
    const alpha = makePlayer(301, { id: "alpha-id", firstName: "Alpha", lastName: "Tie", leagueAssignments: [] });
    const zed = makePlayer(302, { id: "zed-id", firstName: "Zed", lastName: "Tie", leagueAssignments: [] });
    const high = makePlayer(303, { id: "high-id", firstName: "High", lastName: "Value", leagueAssignments: [] });
    const invalid = makePlayer(304, { id: "invalid-id", firstName: "Invalid", lastName: "Value", leagueAssignments: [] });
    const sorted = [invalid, zed, high, alpha].sort(comparePlayersByIvDesc(new Map([
      [alpha.id, 50_000],
      [zed.id, 50_000],
      [high.id, 90_000],
      [invalid.id, Number.NaN],
    ])));

    expect(sorted.map((player) => player.id)).toEqual([high.id, alpha.id, zed.id, invalid.id]);
  });

  test("M7 locked pool renders THE MONEY read-only with the unlock hint", async () => {
    render(<LeagueBuilderDraftSetup />);

    expect(await screen.findByText("UNLOCK THE POOL TO MOVE THE MONEY")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^APPLY$/i })).toBeDisabled();
  });

  test("P8 locked design pins ride extraction and beat hand-removes", async () => {
    const pinnedPlayer = makePlayer(999, { id: "pinned-player", primaryPosition: "SS" });
    mockLeagueData({
      league: makeLeague({
        draftPoolMode: "design-first",
        poolExtractedAt: "2026-01-02T00:00:00.000Z",
        modeAExtractedIds: ["player-0"],
        modeAHandRemoves: ["pinned-player"],
      }),
      teams: [
        makeTeam("team-a", {
          rosterDesign: {
            slots: [],
            lockedAt: "2026-01-03T00:00:00.000Z",
            pins: { SS: "pinned-player" },
          },
        }),
        makeTeam("team-b", { rosterDesign: makeLockedRosterDesign("2026-01-03T00:00:00.000Z") }),
      ],
      players: [...makePlayers(80), pinnedPlayer],
      pool: makePool({
        locked: false,
        players: [{ id: "player-0", iv: 100_000, salary: 10_000 }],
      }),
    });

    render(<LeagueBuilderDraftSetup />);

    fireEvent.click(await screen.findByRole("button", { name: /^RE-EXTRACT$/i }));

    await waitFor(() => {
      const extractMock = vi.mocked(extractPoolFromDemand);
      const matchingIndex = extractMock.mock.calls.findIndex((call) => {
        const options = call[4] as { pinnedIds?: string[]; excludedIds?: string[] };
        return options.pinnedIds?.includes("pinned-player");
      });
      expect(matchingIndex).toBeGreaterThanOrEqual(0);
      const options = extractMock.mock.calls[matchingIndex][4] as { pinnedIds?: string[]; excludedIds?: string[] };
      expect(options.excludedIds).not.toContain("pinned-player");
      const result = extractMock.mock.results[matchingIndex]?.value as ReturnType<typeof extractPoolFromDemand>;
      expect(result.players.map((player) => player.id)).toContain("pinned-player");
    });
  });

  test("design-first extraction protects identity-critical target picks from the full eligible universe", async () => {
    const criticalCloser = makePlayer(999, {
      id: "critical-cp",
      firstName: "Kay",
      lastName: "Frequin",
      primaryPosition: "CP",
      salary: 10_000,
    });
    const sourcePlayers = [
      ...makeLegalRosterPlayerSet("alpha", 10_000),
      ...makeLegalRosterPlayerSet("beta", 10_000),
      criticalCloser,
    ];
    vi.mocked(buildBest22Target).mockReturnValue(makeBest22Target({
      picks: [{
        slotId: "CP",
        playerId: "critical-cp",
        playerName: "Kay Frequin",
        salary: 10_000,
        honorsAsk: true,
        pinned: false,
      }],
    }));
    mockLeagueData({
      league: makeLeague({
        teamIds: ["team-a", "team-b"],
        draftPoolMode: "design-first",
        salaryCap: 1_000_000,
      }),
      teams: [
        makeTeam("team-a", {
          rosterDesign: makeLockedRosterDesign("2026-01-01T00:00:00.000Z"),
        }),
        makeTeam("team-b", {
          rosterDesign: makeLockedRosterDesign("2026-01-01T00:00:00.000Z"),
        }),
      ],
      players: sourcePlayers,
      pool: makePool({ locked: false, players: [], totalSlots: 0 }),
    });

    render(<LeagueBuilderDraftSetup />);

    const extractButton = await screen.findByRole("button", { name: /EXTRACT POOL/i });
    await waitFor(() => {
      expect(extractButton).not.toBeDisabled();
    });
    vi.mocked(extractPoolFromDemand).mockClear();
    fireEvent.click(extractButton);

    await waitFor(() => {
      const matchingCallIndex = vi.mocked(extractPoolFromDemand).mock.calls.findIndex((call) => {
        const options = call[4] as { designPriorityIds?: string[] };
        return options.designPriorityIds?.includes("critical-cp");
      });
      expect(matchingCallIndex).toBeGreaterThanOrEqual(0);
    });
    const matchingCallIndex = vi.mocked(extractPoolFromDemand).mock.calls.findIndex((call) => {
      const options = call[4] as { designPriorityIds?: string[] };
      return options.designPriorityIds?.includes("critical-cp");
    });
    const result = vi.mocked(extractPoolFromDemand).mock.results[matchingCallIndex]?.value as ReturnType<typeof extractPoolFromDemand>;
    expect(result.players.map((player) => player.id)).toContain("critical-cp");
    expect(result.numericShape?.identityCriticalCandidateCount).toBe(1);
    expect(result.numericShape?.identityCriticalIncludedCount).toBe(1);
    expect(result.numericShape?.identityCriticalMissingCount).toBe(0);
  });

  test("design-first diagnostics name manual exclusions that block identity-critical target picks", async () => {
    const criticalReliever = makePlayer(1000, {
      id: "critical-rp",
      firstName: "LaTroy",
      lastName: "Hawkins",
      primaryPosition: "RP",
      salary: 10_000,
    });
    const sourcePlayers = [
      ...makeLegalRosterPlayerSet("alpha", 10_000),
      ...makeLegalRosterPlayerSet("beta", 10_000),
      criticalReliever,
    ];
    vi.mocked(buildBest22Target).mockReturnValue(makeBest22Target({
      picks: [{
        slotId: "RP1",
        playerId: "critical-rp",
        playerName: "LaTroy Hawkins",
        salary: 10_000,
        honorsAsk: true,
        pinned: false,
      }],
    }));
    mockLeagueData({
      league: makeLeague({
        teamIds: ["team-a", "team-b"],
        draftPoolMode: "design-first",
        poolExtractedAt: "2026-01-02T00:00:00.000Z",
        modeAExtractedIds: sourcePlayers.filter((player) => player.id !== "critical-rp").map((player) => player.id),
        modeAHandRemoves: ["critical-rp"],
        salaryCap: 1_000_000,
      }),
      teams: [
        makeTeam("team-a", {
          rosterDesign: makeLockedRosterDesign("2026-01-01T00:00:00.000Z"),
        }),
        makeTeam("team-b", {
          rosterDesign: makeLockedRosterDesign("2026-01-01T00:00:00.000Z"),
        }),
      ],
      players: sourcePlayers.map((player) => player.id === "critical-rp"
        ? { ...player, leagueAssignments: [] }
        : player),
      pool: makePool({
        locked: false,
        players: sourcePlayers
          .filter((player) => player.id !== "critical-rp")
          .map((player) => ({ id: player.id, iv: player.salary, salary: player.salary })),
      }),
    });

    render(<LeagueBuilderDraftSetup />);

    fireEvent.click(await screen.findByRole("button", { name: /^RE-EXTRACT$/i }));

    await waitFor(() => {
      expect(screen.getByText(/Design targets 0\/1 included/i)).toBeInTheDocument();
      expect(screen.getByText(/Missing design targets: LaTroy Hawkins: manual exclusion/i)).toBeInTheDocument();
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

  test("renders shared-pool floor failures as pool-level budget overflow rows", async () => {
    const cheapRoster = makeLegalRosterPlayerSet("cheap", 10_000);
    const expensiveRoster = [
      ...makeLegalRosterPlayerSet("expensive-a", 70_000),
      ...makeLegalRosterPlayerSet("expensive-b", 70_000),
    ];
    const poolPlayers = [...cheapRoster, ...expensiveRoster];
    mockLeagueData({
      league: makeLeague({
        teamIds: ["team-a", "team-b", "team-c"],
        draftPoolMode: "design-first",
        poolExtractedAt: "2026-01-02T00:00:00.000Z",
        salaryCap: 1_000_000,
      }),
      teams: [
        makeTeam("team-a", {
          name: "Caps",
          rosterDesign: makeLockedRosterDesign("2026-01-01T00:00:00.000Z"),
        }),
        makeTeam("team-b", {
          name: "Keys",
          rosterDesign: makeLockedRosterDesign("2026-01-01T00:00:00.000Z"),
        }),
        makeTeam("team-c", {
          name: "CPU Blues",
          controlledBy: "ai",
        }),
      ],
      players: poolPlayers,
      pool: makePool({
        locked: false,
        players: poolPlayers.map((player) => ({ id: player.id, iv: player.salary, salary: player.salary })),
      }),
    });

    render(<LeagueBuilderDraftSetup />);

    expect(await screen.findByText("CAN EVERY CLUB BUILD A LEGAL 22 UNDER $1,000,000?")).toBeInTheDocument();
    expect(screen.getByText(
      "Each club is checked drafting alone from the full pool; the last line checks all clubs sharing one pool.",
    )).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /RE-CHECK/i }));

    const floorMessage = await screen.findByText((content) =>
      content.includes("The shared pool seats 1 of 3 clubs, then can't seat the next:"),
    );
    const floorRow = floorMessage.closest("div");
    expect(floorRow).toHaveTextContent("ALL CLUBS · ONE POOL");
    expect(floorRow).toHaveTextContent("SHARED POOL");
    expect(floorRow).toHaveTextContent("seats 1 of 3 clubs");
    expect(floorRow).toHaveTextContent("the balanced legal 22 for that club costs $1,180,000");
    expect(floorRow).toHaveTextContent("against the $1,000,000 cap ($180,000 over)");
    expect(floorRow).toHaveTextContent("the affordable players are used up");
    expect(floorRow).not.toHaveTextContent("Priciest asks");
    expect(floorRow).not.toHaveTextContent("CPU Blues");
    expect(floorRow).not.toHaveTextContent("club 2");
    expect(screen.getAllByText("BUILDS · $660,000 to spare")).toHaveLength(2);
  });

  test("renders CLUB CHECK target segments without changing the floor dot gate", async () => {
    const legalPlayers = [
      ...makeLegalRosterPlayers(1_000),
      ...Array.from({ length: 60 }, (_, index) =>
        makePlayer(100 + index, {
          id: `depth-${index}`,
          primaryPosition: "CF",
          salary: 1_000,
        }),
      ),
    ];
    vi.mocked(buildBest22Target)
      .mockReturnValueOnce(makeBest22Target())
      .mockReturnValueOnce(makeBest22Target())
      .mockReturnValueOnce(makeBest22Target({ allIn: 30_000, feasible: true }))
      .mockReturnValueOnce(makeBest22Target({ allIn: 45_000, feasible: false }));
    mockLeagueData({
      league: makeLeague({
        teamIds: ["team-a", "team-b", "team-c"],
        draftPoolMode: "design-first",
        poolExtractedAt: "2026-01-02T00:00:00.000Z",
      }),
      teams: [
        makeTeam("team-a", {
          name: "Target Ready",
          rosterDesign: makeLockedRosterDesign("2026-01-01T00:00:00.000Z"),
          mlbArchetypeKey: "murderers-row",
          farmArchetypeKey: "whiteyball",
        }),
        makeTeam("team-b", {
          name: "No Identity",
          rosterDesign: makeLockedRosterDesign("2026-01-01T00:00:00.000Z"),
          mlbArchetypeKey: undefined,
        }),
        makeTeam("team-c", {
          name: "Target Trouble",
          gmSeatId: "seat-you",
          rosterDesign: makeLockedRosterDesign("2026-01-01T00:00:00.000Z"),
          mlbArchetypeKey: "whiteyball",
          farmArchetypeKey: "murderers-row",
        }),
      ],
      players: legalPlayers,
      pool: makePool({
        locked: false,
        players: legalPlayers.map((player) => ({ id: player.id, iv: player.salary, salary: player.salary })),
      }),
    });

    render(<LeagueBuilderDraftSetup />);

    expect(await screen.findByText("THE CLUB CHECK")).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText("TARGET $30,000")).toBeInTheDocument();
      expect(screen.getAllByText("TARGET $30,000").length).toBeGreaterThan(0);
      expect(screen.getByText("NO IDENTITY")).toBeInTheDocument();
      expect(screen.getByText("IDENTITY WON'T EXPRESS")).toBeInTheDocument();
    });

    const troubleRow = screen.getByText((content) => content.includes("Target Trouble · Player 2")).closest("div");
    expect(troubleRow?.querySelector("[aria-hidden='true']")?.className).toContain("bg-[var(--ballpark-status-green)]");
  });

  test("B5 recomputes draftability on pool membership changes, not roster-design edits", async () => {
    const basePlayers = makePlayers(24);
    const baseTeams = [makeTeam("team-a"), makeTeam("team-b")];
    mockLeagueData({ players: basePlayers, teams: baseTeams });
    const { rerender } = render(<LeagueBuilderDraftSetup />);

    await waitFor(() => {
      expect(rankAllArchetypesForPool).toHaveBeenCalledTimes(1);
    });

    mockLeagueData({
      players: basePlayers,
      teams: [
        makeTeam("team-a", {
          rosterDesign: {
            slots: buildDefaultDesignSlots(),
            lockedAt: "2026-01-03T00:00:00.000Z",
          },
        }),
        makeTeam("team-b"),
      ],
    });
    rerender(<LeagueBuilderDraftSetup />);

    await act(async () => {
      await new Promise((resolve) => window.setTimeout(resolve, 500));
    });
    expect(rankAllArchetypesForPool).toHaveBeenCalledTimes(1);

    const ratingEditedPlayers = basePlayers.map((player, index) =>
      index === 0 ? { ...player, power: player.power + 1 } : player,
    );
    const ratingEditData = mockLeagueData({
      players: ratingEditedPlayers,
      teams: baseTeams,
    });
    await act(async () => {
      await ratingEditData.updatePlayer(ratingEditedPlayers[0]);
    });
    expect(ratingEditData.updatePlayer).toHaveBeenCalledWith(ratingEditedPlayers[0]);
    rerender(<LeagueBuilderDraftSetup />);

    await waitFor(() => {
      expect(rankAllArchetypesForPool).toHaveBeenCalledTimes(2);
    });

    mockLeagueData({
      players: [
        ...ratingEditedPlayers,
        makePlayer(200, { id: "new-pool-member", primaryPosition: "SS" }),
      ],
      teams: baseTeams,
    });
    rerender(<LeagueBuilderDraftSetup />);

    await waitFor(() => {
      expect(rankAllArchetypesForPool).toHaveBeenCalledTimes(3);
    });
  });
});
