import "fake-indexeddb/auto";

import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import {
  __resetLeagueBuilderDatabaseForTests,
  clearAllLeagueBuilderData,
} from "../../../utils/leagueBuilderStorage";
import {
  initAuctionSession,
  seededNominationOrder,
  surfaceNextPlayer,
  type AuctionSession,
} from "../../../engines/auctionStateMachine";
import {
  cpuBidOnLot,
  type CpuShillAuctionSession,
  type CpuShillProfile,
} from "../../../engines/cpuShillBidding";
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
import { buildAuctionPlayers } from "../../app/hooks/useAuctionDraft";

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

async function resetLeagueBuilderTestState(): Promise<void> {
  __resetLeagueBuilderDatabaseForTests();
  await clearAllLeagueBuilderData().catch(() => undefined);
  __resetLeagueBuilderDatabaseForTests();
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
    leagueIds: ["league-page"],
    createdDate: "2026-01-01",
    lastModified: "2026-01-01",
    ...overrides,
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

// FABLE-C3-FIX-2 F6: the default fixture clears the demand-model floor for 2 teams (class
// feasibility 52) with room for the shill-count variations the route tests exercise.
function makePlayers(count = 80): Player[] {
  const players = [
    makePlayer("player-a", "CF", "LF"),
    makePlayer("player-b", "SP"),
  ];
  for (let index = players.length; index < count; index += 1) {
    const position = index % 5 === 0 ? "C" : index % 5 === 1 ? "SS" : index % 5 === 2 ? "RF" : index % 5 === 3 ? "RP" : "SP";
    players.push(makePlayer(`depth-${index + 1}`, position as Player["primaryPosition"]));
  }
  return players;
}

function makePool(players: Player[]): RegisteredPool {
  return {
    leagueId: "league-page",
    tier: "standard",
    balanceMode: "taxed",
    players: players.map((player, index) => ({
      id: player.id,
      iv: index === 0 ? 100_000 : index === 1 ? 80_000 : 12_000 + index,
      salary: index === 0 ? 10_000 : index === 1 ? 8_000 : 3_000,
    })),
    tierCap: 1_000_000,
    luxuryCaps: [],
    pickValueChart: [],
    totalSlots: players.length,
    poolSurplusWarning: false,
    locked: true,
  };
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

function seedForOpeningLot(
  players: readonly Player[],
  options: {
    bidderTeamId?: string;
    playerIds?: readonly string[];
    teamIds?: readonly string[];
  } = {},
): string {
  const teamIds = options.teamIds ?? ["team-a", "team-b"];
  const playerIds = new Set(options.playerIds ?? ["player-a", "player-b"]);
  const auctionPlayers = buildAuctionPlayers(makePool([...players]));

  for (let index = 0; index < 2000; index += 1) {
    const seed = `page-opening-seed-${index}`;
    if (options.bidderTeamId && seededNominationOrder(teamIds, seed)[0] !== options.bidderTeamId) continue;
    const initialized = initAuctionSession({
      teams: teamIds.map((teamId) => ({
        teamId,
        budgetRemaining: 1_000_000,
        rosterSlotsRemaining: 22,
        minSalary: 3_000,
        projectedTax: 0,
      })),
      players: auctionPlayers,
      config: {
        nominationOrderSeed: seed,
        bidIncrement: 5_000,
        nominationWeightExponent: 2,
      },
    });
    const surfaced = surfaceNextPlayer(initialized);
    if (!surfaced.ok || surfaced.session.state !== "OPEN_BIDDING") continue;
    const lot = surfaced.session.currentLot;
    if (lot && playerIds.has(lot.playerId)) return seed;
  }

  throw new Error("No deterministic opening-lot seed found.");
}

function mockLeagueData(options: { players?: Player[]; pool?: RegisteredPool } = {}) {
  const players = options.players ?? makePlayers();
  const pool = options.pool ?? makePool(players);
  const leagueData = {
    leagues: [makeLeague()],
    teams: [makeTeam("team-a"), makeTeam("team-b")],
    players,
    rulesPresets: [],
    isLoading: false,
    error: null,
    getRegisteredPool: vi.fn(async () => pool),
    registerLeaguePool: vi.fn(async () => pool),
    clearRoster: vi.fn(async (teamId: string) => emptyRoster(teamId)),
    getRoster: vi.fn(async (teamId: string) => emptyRoster(teamId)),
    refresh: vi.fn(async () => undefined),
  } as unknown as UseLeagueBuilderDataReturn;

  vi.mocked(useLeagueBuilderData).mockReturnValue(leagueData);
  return leagueData;
}

const TEST_SHILL_ID = "__auction_shill__league-page__1";
const TEST_SHILL_PROFILE: CpuShillProfile = {
  teamId: TEST_SHILL_ID,
  personality: "sniper",
  bandPriorities: {
    Power: 1,
    Contact: 3,
    Speed: 1,
    Defense: 2,
    Rotation: 2,
    Bullpen: 1,
  },
};

function cpuDecisionSeedForTest(session: AuctionSession, kind: "bid" | "claim", teamId: string): string {
  const lot = session.currentLot;
  return [
    session.config.nominationOrderSeed,
    "preview",
    kind,
    session.results.length,
    teamId,
    lot?.playerId ?? session.pendingClaim?.playerId ?? "no-player",
    lot?.highBid ?? "open",
    lot?.stillIn.join("-") ?? "resolve",
  ].join(":");
}

function seedWhereFirstShillBids(players: readonly Player[]): string {
  const teamIds = ["team-a", "team-b", TEST_SHILL_ID];
  const auctionPlayers = buildAuctionPlayers(makePool([...players]));

  for (let index = 0; index < 2000; index += 1) {
    const seed = `page-shill-win-seed-${index}`;
    if (seededNominationOrder(teamIds, seed)[0] !== TEST_SHILL_ID) continue;
    const initialized = initAuctionSession({
      teams: [
        { teamId: "team-a", budgetRemaining: 1_000_000, rosterSlotsRemaining: 22, minSalary: 3_000, projectedTax: 0 },
        { teamId: "team-b", budgetRemaining: 1_000_000, rosterSlotsRemaining: 22, minSalary: 3_000, projectedTax: 0 },
        { teamId: TEST_SHILL_ID, budgetRemaining: 1_000_000, rosterSlotsRemaining: 22, minSalary: 3_000, projectedTax: 0 },
      ],
      players: auctionPlayers,
      config: {
        nominationOrderSeed: seed,
        bidIncrement: 5_000,
        nominationWeightExponent: 2,
      },
    }) as CpuShillAuctionSession;
    const surfaced = surfaceNextPlayer(initialized);
    if (!surfaced.ok || surfaced.session.state !== "OPEN_BIDDING") continue;
    const session = {
      ...surfaced.session,
      cpuShills: { [TEST_SHILL_ID]: TEST_SHILL_PROFILE },
    } as CpuShillAuctionSession;
    const decision = cpuBidOnLot(session, TEST_SHILL_ID, cpuDecisionSeedForTest(session, "bid", TEST_SHILL_ID));
    if (decision.kind === "bid") return seed;
  }

  throw new Error("No deterministic shill-bid seed found.");
}

function seedWhereCpuTeamBids(players: readonly Player[], teamId: string): string {
  const teamIds = ["team-a", "team-b"];
  const auctionPlayers = buildAuctionPlayers(makePool([...players]));

  for (let index = 0; index < 2000; index += 1) {
    const seed = `page-cpu-bid-seed-${index}`;
    if (seededNominationOrder(teamIds, seed)[0] !== teamId) continue;
    const initialized = initAuctionSession({
      teams: teamIds.map((candidateTeamId) => ({
        teamId: candidateTeamId,
        budgetRemaining: 1_000_000,
        rosterSlotsRemaining: 22,
        minSalary: 3_000,
        projectedTax: 0,
      })),
      players: auctionPlayers,
      config: {
        nominationOrderSeed: seed,
        bidIncrement: 5_000,
        nominationWeightExponent: 2,
      },
    }) as CpuShillAuctionSession;
    const surfaced = surfaceNextPlayer(initialized);
    if (!surfaced.ok || surfaced.session.state !== "OPEN_BIDDING") continue;
    // The test's $70,000 pins anchor on player-a's 100th-percentile ask — pin the lot too so
    // the seed search stays deterministic at any fixture pool size (FABLE-C3-FIX-2 F6).
    if (surfaced.session.currentLot?.playerId !== "player-a") continue;
    const session = surfaced.session as CpuShillAuctionSession;
    const decision = cpuBidOnLot(session, teamId, cpuDecisionSeedForTest(session, "bid", teamId));
    if (decision.kind === "bid") return seed;
  }

  throw new Error(`No deterministic CPU bid seed found for ${teamId}.`);
}

describe("LeagueBuilderAuctionDraft", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    window.history.pushState({}, "", "/league-builder/auction-draft");
    await resetLeagueBuilderTestState();
    mockLeagueData();
  });

  afterEach(async () => {
    cleanup();
    await resetLeagueBuilderTestState();
  });

  test("renders setup and begins into an engine-nominated open lot", async () => {
    const players = makePlayers();
    mockLeagueData({ players, pool: makePool(players) });
    const seed = seedForOpeningLot(players);

    render(<LeagueBuilderAuctionDraft />);

    expect(screen.getByText("MLB AUCTION DRAFT")).toBeInTheDocument();
    expect(screen.getByText("STATE: SETUP")).toBeInTheDocument();

    const seedInput = await screen.findByLabelText("SEED");
    fireEvent.change(seedInput, { target: { value: seed } });
    await waitFor(() => {
      expect(seedInput).toHaveValue(seed);
    });

    const begin = await screen.findByRole("button", { name: /BEGIN AUCTION DRAFT/i });
    fireEvent.click(begin);

    await waitFor(() => {
      expect(screen.getByText(/Lot 1 of/i)).toBeInTheDocument();
    });
    expect(screen.queryByText("MLB auction")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Help" }));
    expect(screen.getByText("MLB auction")).toBeInTheDocument();
    expect(screen.getByText("On the block")).toBeInTheDocument();
    expect(screen.queryByLabelText("Position filter")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /IV SORT/i })).not.toBeInTheDocument();
    expect(screen.getAllByText(/Avery Anchor|Blake Bolt/i).length).toBeGreaterThan(0);
    expect(screen.getByText("Most you can bid")).toBeInTheDocument();
    expect(screen.getByText(/Scout Insight:/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /BID/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Let him go/i })).toBeInTheDocument();
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

  test("uses shill count from the draft setup route before starting the auction", async () => {
    window.history.pushState({}, "", "/league-builder/auction-draft?leagueId=league-page&shills=2");

    render(<LeagueBuilderAuctionDraft />);

    await waitFor(() => {
      expect(screen.getByLabelText("CPU COUNT")).toHaveValue(2);
    });
  });

  test("clamps high shill route params and ignores malformed shill route params", async () => {
    window.history.pushState({}, "", "/league-builder/auction-draft?leagueId=league-page&shills=9999");

    const { unmount } = render(<LeagueBuilderAuctionDraft />);

    await waitFor(() => {
      expect(screen.getByLabelText("CPU COUNT")).toHaveValue(12);
    });

    unmount();
    cleanup();
    await resetLeagueBuilderTestState();
    mockLeagueData();
    window.history.pushState({}, "", "/league-builder/auction-draft?leagueId=league-page&shills=3abc");

    render(<LeagueBuilderAuctionDraft />);

    await waitFor(() => {
      expect(screen.getByLabelText("CPU COUNT")).toHaveValue(0);
    });
  });

  test("blocks direct auction start when selected shills make the locked pool underfilled", async () => {
    // 44 players vs the demand-model floor for 2 teams + 1 shill (52 + 10 = 62) → needs 18.
    const smallPoolPlayers = makePlayers(44);
    mockLeagueData({ players: smallPoolPlayers, pool: makePool(smallPoolPlayers) });
    window.history.pushState({}, "", "/league-builder/auction-draft?leagueId=league-page&shills=1");

    render(<LeagueBuilderAuctionDraft />);

    await waitFor(() => {
      // FABLE-C3-FIX-2 F6: the demand-model gate — floor = classFeasibility(2 teams)=52 + 1 shill×10 wins = 62; pool 44 → needs 18.
      expect(screen.getByText(/needs 18 more player\(s\) for 3 drafting teams/i)).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByRole("button", { name: /BEGIN AUCTION DRAFT|STARTING/i })).toBeDisabled();
    });
  });

  test("renders open bidding with names and records a SOLD result row with winner salary", async () => {
    const players = makePlayers();
    mockLeagueData({ players, pool: makePool(players) });
    const seed = seedForOpeningLot(players, { playerIds: ["player-a"] });

    render(<LeagueBuilderAuctionDraft />);

    const seedInput = await screen.findByLabelText("SEED");
    fireEvent.change(seedInput, { target: { value: seed } });
    await waitFor(() => {
      expect(seedInput).toHaveValue(seed);
    });

    fireEvent.click(await screen.findByRole("button", { name: /BEGIN AUCTION DRAFT/i }));

    await waitFor(() => {
      expect(screen.getByText(/Lot 1 of/i)).toBeInTheDocument();
    });

    expect(screen.getByText("On the block")).toBeInTheDocument();
    expect(screen.getAllByText(/Avery Anchor|Blake Bolt/i).length).toBeGreaterThan(0);
    expect(screen.getByText("opening — be the first")).toBeInTheDocument();
    expect(screen.getByText(/Page (Caps|Keys) budget/)).toBeInTheDocument();
    expect(screen.getByText("Most you can bid")).toBeInTheDocument();
    expect(screen.getByText("Slots left")).toBeInTheDocument();
    expect(screen.getByText(/Priority need:/)).toBeInTheDocument();
    expect(screen.queryByText("player-a")).not.toBeInTheDocument();
    expect(screen.queryByText("team-a")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Custom bid amount")).not.toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /BID \$70k/i })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /BID \$70k/i }));

    await waitFor(() => {
      expect(screen.getByText("$70,000")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Let him go" }));

    await waitFor(() => {
      expect(screen.getByText("SOLD")).toBeInTheDocument();
    });
    expect(screen.getAllByText(/(Avery Anchor|Blake Bolt) SOLD to Page (Caps|Keys) for \$/).length).toBeGreaterThan(0);
  });

  test("shows a read-only CPU decision preview before advancing automated turns", async () => {
    const players = makePlayers();
    const leagueData = mockLeagueData({ players, pool: makePool(players) });
    leagueData.teams = [makeTeam("team-a", { controlledBy: "ai" }), makeTeam("team-b")];
    const seed = seedWhereCpuTeamBids(players, "team-a");

    render(<LeagueBuilderAuctionDraft />);

    const seedInput = await screen.findByLabelText("SEED");
    fireEvent.change(seedInput, { target: { value: seed } });
    await waitFor(() => {
      expect(seedInput).toHaveValue(seed);
    });
    fireEvent.click(await screen.findByRole("button", { name: /BEGIN AUCTION DRAFT/i }));

    await waitFor(() => {
      expect(screen.getByText("Review CPU decision")).toBeInTheDocument();
    });

    expect(screen.getByText(/turn preview/i)).toBeInTheDocument();
    expect(screen.getByText(/Page Caps will bid \$70,000/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Advance decision" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Let him go/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Advance decision" }));

    await waitFor(() => {
      expect(screen.queryByText(/turn preview/i)).not.toBeInTheDocument();
    });
    expect(screen.getByText("Page Caps")).toBeInTheDocument();
    expect(screen.getAllByText("$70,000").length).toBeGreaterThan(0);
  });

  test("shows a pure shill winner on the visible AuctionStage roster board after SOLD", async () => {
    const players = makePlayers(66);
    mockLeagueData({ players, pool: makePool(players) });
    const seed = seedWhereFirstShillBids(players);

    render(<LeagueBuilderAuctionDraft />);

    fireEvent.change(await screen.findByLabelText("CPU COUNT"), { target: { value: "1" } });
    const seedInput = screen.getByLabelText("SEED");
    fireEvent.change(seedInput, { target: { value: seed } });

    await waitFor(() => {
      expect(screen.getByLabelText("CPU COUNT")).toHaveValue(1);
      expect(seedInput).toHaveValue(seed);
    });
    fireEvent.click(await screen.findByRole("button", { name: /BEGIN AUCTION DRAFT/i }));

    await waitFor(() => {
      expect(screen.getByText(/Market Shill 1 will bid/)).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: "Advance decision" }));

    for (let index = 0; index < 2; index += 1) {
      await waitFor(() => {
        expect(screen.getByRole("button", { name: /Let him go/i })).toBeEnabled();
      });
      fireEvent.click(screen.getByRole("button", { name: /Let him go/i }));
    }

    await waitFor(() => {
      expect(screen.getByText("SOLD")).toBeInTheDocument();
    });
    expect(screen.getByText(/Market Shill 1 · 1 of 22/)).toBeInTheDocument();
    expect(screen.getByText(/SOLD to Market Shill 1/)).toBeInTheDocument();
  });
});
