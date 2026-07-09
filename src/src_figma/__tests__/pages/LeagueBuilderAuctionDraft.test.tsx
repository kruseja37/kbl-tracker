import "fake-indexeddb/auto";

import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import {
  __resetLeagueBuilderDatabaseForTests,
  clearAllLeagueBuilderData,
  createAuctionSessionId,
  saveAuctionSession,
  savePlayer,
  saveTeamRoster,
} from "../../../utils/leagueBuilderStorage";
import {
  deriveAuctionSessionNominationSeed,
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
import { auctionTransitionErrorCopy, buildAuctionPlayers, MLB_AUCTION_SEASON } from "../../app/hooks/useAuctionDraft";
import { DEFAULT_AUCTION_SETUP_CONFIG } from "../../../data/auctionEngineConstants";

const mockNavigate = vi.fn();
const TEST_SESSION_LAUNCH_NONCE = "00000000-0000-4000-8000-000000000001";

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

function legalMlbPositions(): Array<{ primary: Player["primaryPosition"]; secondary?: Player["secondaryPosition"]; trait1?: Player["trait1"] }> {
  return [
    { primary: "C" },
    { primary: "1B" },
    { primary: "2B" },
    { primary: "3B" },
    { primary: "SS" },
    { primary: "LF" },
    { primary: "CF" },
    { primary: "RF" },
    { primary: "1B", secondary: "C" },
    { primary: "2B" },
    { primary: "SS" },
    { primary: "LF" },
    { primary: "RF" },
    { primary: "SP" },
    { primary: "SP" },
    { primary: "SP" },
    { primary: "SP" },
    { primary: "RP" },
    { primary: "RP" },
    { primary: "RP" },
    { primary: "CP" },
    { primary: "RP" },
  ];
}

function makeExitRosterPlayers(teamId: string, options: { missingSs?: boolean } = {}): Player[] {
  return legalMlbPositions().map((shape, index) => {
    const player = makePlayer(
      `${teamId}-exit-${index + 1}`,
      options.missingSs && shape.primary === "SS" ? "1B" : shape.primary,
      shape.secondary,
    );
    return {
      ...player,
      trait1: shape.trait1,
      leagueAssignments: [{ leagueId: "league-page", teamId, rosterStatus: "MLB" }],
    };
  });
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
    const sessionSeed = deriveAuctionSessionNominationSeed({
      sessionId: createAuctionSessionId("league-page", MLB_AUCTION_SEASON),
      launchNonce: TEST_SESSION_LAUNCH_NONCE,
      baseSeed: seed,
    });
    if (options.bidderTeamId && seededNominationOrder(teamIds, sessionSeed)[0] !== options.bidderTeamId) continue;
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
        nominationOrderSeed: sessionSeed,
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

async function saveCompletedAuctionForPage(options: {
  teamAPlayers?: Player[];
  teamBPlayers?: Player[];
  shillRosterCount?: number;
  shillPlayers?: Player[];
} = {}): Promise<Player[]> {
  const teamAPlayers = options.teamAPlayers ?? makeExitRosterPlayers("team-a");
  const teamBPlayers = options.teamBPlayers ?? makeExitRosterPlayers("team-b");
  const shillPlayers = options.shillPlayers ?? Array.from(
    { length: options.shillRosterCount ?? 0 },
    (_, index) => makePlayer(`${TEST_SHILL_ID}-exit-${index + 1}`, "CF"),
  );
  const shillIds = shillPlayers.map((player) => player.id);
  const allPlayers = [...teamAPlayers, ...teamBPlayers, ...shillPlayers];
  const playerIds = allPlayers.map((player) => player.id);
  const session: CpuShillAuctionSession = {
    state: "AUCTION_COMPLETE",
    config: {
      ...DEFAULT_AUCTION_SETUP_CONFIG,
      excludeFromLeague: true,
      cpuShillCount: shillIds.length > 0 ? 1 : 0,
    },
    teams: [
      {
        teamId: "team-a",
        budgetRemaining: 900_000,
        rosterSlotsRemaining: 0,
        minSalary: 3_000,
        projectedTax: 0,
        roster: teamAPlayers.map((player) => ({ playerId: player.id, salary: 10_000 })),
      },
      {
        teamId: "team-b",
        budgetRemaining: 900_000,
        rosterSlotsRemaining: 0,
        minSalary: 3_000,
        projectedTax: 0,
        roster: teamBPlayers.map((player) => ({ playerId: player.id, salary: 10_000 })),
      },
      ...(shillIds.length > 0
        ? [{
            teamId: TEST_SHILL_ID,
            budgetRemaining: 900_000,
            rosterSlotsRemaining: 22 - shillIds.length,
            minSalary: 3_000,
            projectedTax: 0,
            roster: shillIds.map((playerId) => ({ playerId, salary: 10_000 })),
          }]
        : []),
    ],
    nominationOrder: shillIds.length > 0 ? ["team-a", "team-b", TEST_SHILL_ID] : ["team-a", "team-b"],
    nominationIndex: 0,
    nominationRound: 1,
    players: Object.fromEntries(playerIds.map((playerId, index) => [playerId, { playerId, iv: 10_000 + index, ivPercentile: 50 }])),
    playerOrder: playerIds,
    availablePlayerIds: [],
    currentLot: null,
    pendingClaim: null,
    results: [
      ...teamAPlayers.map((player) => ({
        playerId: player.id,
        disposition: "SOLD" as const,
        nominatorTeamId: "team-a",
        winnerTeamId: "team-a",
        salary: 10_000,
      })),
      ...teamBPlayers.map((player) => ({
        playerId: player.id,
        disposition: "SOLD" as const,
        nominatorTeamId: "team-b",
        winnerTeamId: "team-b",
        salary: 10_000,
      })),
      ...shillPlayers.map((player) => ({
        playerId: player.id,
        disposition: "SOLD" as const,
        nominatorTeamId: TEST_SHILL_ID,
        winnerTeamId: TEST_SHILL_ID,
        salary: 10_000,
      })),
    ],
    saleCount: playerIds.length,
    cpuShills: shillIds.length > 0 ? { [TEST_SHILL_ID]: TEST_SHILL_PROFILE } : {},
  };

  await saveTeamRoster(emptyRoster("team-a"));
  await saveTeamRoster(emptyRoster("team-b"));
  for (const player of allPlayers) {
    await savePlayer(player);
  }

  await saveAuctionSession({
    id: createAuctionSessionId("league-page", MLB_AUCTION_SEASON),
    leagueId: "league-page",
    seasonNumber: MLB_AUCTION_SEASON,
    seed: session.config.nominationOrderSeed,
    session,
  });
  return allPlayers;
}

// WT-A: a mid-draft PASSED lot, saved directly (same fixture-injection pattern as
// saveCompletedAuctionForPage above) so the UNSOLD-vs-GONE overlay predicate can be exercised
// without needing to seed-search a real nomination/bidding sequence into a no-bid outcome.
async function savePassedLotSessionForPage(options: {
  reserveFractionK?: number;
  recycled: boolean;
}): Promise<Player[]> {
  const players = makePlayers();
  const playerId = "player-a";
  const playerIds = players.map((player) => player.id);
  const remainingPoolIds = playerIds.filter((id) => id !== playerId);

  await saveTeamRoster(emptyRoster("team-a"));
  await saveTeamRoster(emptyRoster("team-b"));
  for (const player of players) {
    await savePlayer(player);
  }

  const session: CpuShillAuctionSession = {
    state: "PASSED",
    config: {
      ...DEFAULT_AUCTION_SETUP_CONFIG,
      excludeFromLeague: true,
      cpuShillCount: 0,
      ...(options.reserveFractionK !== undefined ? { reserveFractionK: options.reserveFractionK } : {}),
    },
    teams: [
      { teamId: "team-a", budgetRemaining: 900_000, rosterSlotsRemaining: 20, minSalary: 3_000, projectedTax: 0, roster: [] },
      { teamId: "team-b", budgetRemaining: 900_000, rosterSlotsRemaining: 20, minSalary: 3_000, projectedTax: 0, roster: [] },
    ],
    nominationOrder: ["team-a", "team-b"],
    nominationIndex: 0,
    nominationRound: 1,
    players: Object.fromEntries(
      playerIds.map((id, index) => [id, { playerId: id, iv: 10_000 + index, ivPercentile: 50 }]),
    ),
    playerOrder: playerIds,
    // This IS the engine's own recycled/permanent predicate (finalizePassedLot,
    // auctionStateMachine.ts): first pass with reserve pricing re-adds the player here;
    // a second pass (or reserve pricing off) does not.
    availablePlayerIds: options.recycled ? [playerId, ...remainingPoolIds] : remainingPoolIds,
    currentLot: {
      playerId,
      nominatorTeamId: "team-a",
      openingAsk: 12_000,
      highBid: null,
      highBidder: null,
      stillIn: [],
      bidTurnTeamId: null,
    },
    pendingClaim: null,
    results: [
      {
        playerId,
        disposition: "PASSED",
        nominatorTeamId: "team-a",
        winnerTeamId: null,
        salary: null,
      },
    ],
    saleCount: 0,
    passCountByPlayerId: { [playerId]: options.recycled ? 1 : 2 },
    cpuShills: {},
  };

  await saveAuctionSession({
    id: createAuctionSessionId("league-page", MLB_AUCTION_SEASON),
    leagueId: "league-page",
    seasonNumber: MLB_AUCTION_SEASON,
    seed: session.config.nominationOrderSeed,
    session,
  });
  return players;
}

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
    const sessionSeed = deriveAuctionSessionNominationSeed({
      sessionId: createAuctionSessionId("league-page", MLB_AUCTION_SEASON),
      launchNonce: TEST_SESSION_LAUNCH_NONCE,
      baseSeed: seed,
    });
    if (seededNominationOrder(teamIds, sessionSeed)[0] !== TEST_SHILL_ID) continue;
    const initialized = initAuctionSession({
      teams: [
        { teamId: "team-a", budgetRemaining: 1_000_000, rosterSlotsRemaining: 22, minSalary: 3_000, projectedTax: 0 },
        { teamId: "team-b", budgetRemaining: 1_000_000, rosterSlotsRemaining: 22, minSalary: 3_000, projectedTax: 0 },
        { teamId: TEST_SHILL_ID, budgetRemaining: 1_000_000, rosterSlotsRemaining: 22, minSalary: 3_000, projectedTax: 0 },
      ],
      players: auctionPlayers,
      config: {
        nominationOrderSeed: sessionSeed,
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
    const sessionSeed = deriveAuctionSessionNominationSeed({
      sessionId: createAuctionSessionId("league-page", MLB_AUCTION_SEASON),
      launchNonce: TEST_SESSION_LAUNCH_NONCE,
      baseSeed: seed,
    });
    if (seededNominationOrder(teamIds, sessionSeed)[0] !== teamId) continue;
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
        nominationOrderSeed: sessionSeed,
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
    vi.spyOn(globalThis.crypto, "randomUUID").mockReturnValue(TEST_SESSION_LAUNCH_NONCE);
    window.history.pushState({}, "", "/league-builder/auction-draft");
    await resetLeagueBuilderTestState();
    mockLeagueData();
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    cleanup();
    await resetLeagueBuilderTestState();
  });

  test("DJ-19 maps machine transition reasons to GM-facing copy", () => {
    expect(auctionTransitionErrorCopy("Auction transition rejected: bid-strands-roster")).toBe(
      "That bid would leave you unable to fill a legal roster.",
    );
  });

  test("renders setup and begins into an engine-nominated open lot", async () => {
    const players = makePlayers();
    mockLeagueData({ players, pool: makePool(players) });
    const seed = seedForOpeningLot(players);
    window.history.pushState({}, "", `/league-builder/auction-draft?devSeed=${seed}&reserveK=0`);

    render(<LeagueBuilderAuctionDraft />);

    expect(screen.getByText("MLB AUCTION DRAFT")).toBeInTheDocument();
    expect(screen.getByText("STATE: SETUP")).toBeInTheDocument();
    expect(screen.queryByLabelText("SEED")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("CPU COUNT")).not.toBeInTheDocument();
    expect(screen.queryByText("BID INCREMENT")).not.toBeInTheDocument();

    const begin = await screen.findByRole("button", { name: /BEGIN AUCTION DRAFT/i });
    fireEvent.click(begin);

    await waitFor(() => {
      expect(screen.getByText(/Lot 1 of/i)).toBeInTheDocument();
    });
    // TEXTLAW-SWEEP A3 reverse fix: the phase-label pill is ALWAYS-class content -- no longer
    // gated behind Help.
    expect(screen.getByText("MLB auction")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Help" }));
    expect(screen.getByText("MLB auction")).toBeInTheDocument();
    expect(screen.getByText("On the block")).toBeInTheDocument();
    expect(screen.queryByLabelText("Position filter")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /IV SORT/i })).not.toBeInTheDocument();
    expect(screen.getAllByText(/Avery Anchor|Blake Bolt/i).length).toBeGreaterThan(0);
    expect(screen.getByText("Most you can bid")).toBeInTheDocument();
    expect(screen.getByText(/Public market/i)).toBeInTheDocument();
    expect(screen.getByLabelText("Public market price band")).toBeInTheDocument();
    expect(screen.queryByText(/Scout Insight:/)).not.toBeInTheDocument();
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
      expect(screen.getAllByText("MARKET SHILLS").length).toBeGreaterThan(0);
      expect(screen.getAllByText("2").length).toBeGreaterThan(0);
    });
  });

  test("clamps high shill route params and ignores malformed shill route params", async () => {
    window.history.pushState({}, "", "/league-builder/auction-draft?leagueId=league-page&shills=9999");

    const { unmount } = render(<LeagueBuilderAuctionDraft />);

    await waitFor(() => {
      expect(screen.getAllByText("12").length).toBeGreaterThan(0);
    });

    unmount();
    cleanup();
    await resetLeagueBuilderTestState();
    mockLeagueData();
    window.history.pushState({}, "", "/league-builder/auction-draft?leagueId=league-page&shills=3abc");

    render(<LeagueBuilderAuctionDraft />);

    await waitFor(() => {
      expect(screen.getAllByText("0").length).toBeGreaterThan(0);
    });
  });

  test("starts direct auction when the locked pool satisfies the real-club floor regardless of selected shills", async () => {
    // CUT2-3: 52 clears the real-club feasibility floor for 2 teams. The old shill-inflated
    // floor (52 + 10 = 62) would have blocked this direct start.
    const realClubFloorPlayers = makePlayers(52);
    const seed = seedForOpeningLot(realClubFloorPlayers);
    mockLeagueData({ players: realClubFloorPlayers, pool: makePool(realClubFloorPlayers) });
    window.history.pushState({}, "", `/league-builder/auction-draft?leagueId=league-page&shills=1&devSeed=${seed}`);

    render(<LeagueBuilderAuctionDraft />);

    await waitFor(() => {
      expect(screen.getAllByText("MARKET SHILLS").length).toBeGreaterThan(0);
      expect(screen.getAllByText("1").length).toBeGreaterThan(0);
    });

    expect(screen.queryByText(/needs \d+ more player\(s\)/i)).not.toBeInTheDocument();
    const begin = await screen.findByRole("button", { name: /BEGIN AUCTION DRAFT/i });
    expect(begin).toBeEnabled();

    fireEvent.click(begin);

    await waitFor(() => {
      expect(screen.getByText(/Lot 1 of/i)).toBeInTheDocument();
    });
  });

  test("renders open bidding with names and records a SOLD result row with winner salary", async () => {
    const players = makePlayers();
    mockLeagueData({ players, pool: makePool(players) });
    const seed = seedForOpeningLot(players, { playerIds: ["player-a"] });
    window.history.pushState({}, "", `/league-builder/auction-draft?devSeed=${seed}`);

    render(<LeagueBuilderAuctionDraft />);

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

    expect(screen.getByText("RESERVE")).toBeInTheDocument();
    const firstBidButton = await screen.findByRole("button", { name: /BID \$\d+k/i });

    fireEvent.click(firstBidButton);

    await waitFor(() => {
      expect(screen.getByText(/Page (Caps|Keys) — raise or pass/)).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Let him go" })).toBeEnabled();
    });

    fireEvent.click(screen.getByRole("button", { name: "Let him go" }));

    await waitFor(() => {
      expect(screen.getAllByText(/(Avery Anchor|Blake Bolt) SOLD to Page (Caps|Keys) for \$/).length).toBeGreaterThan(0);
    });
    expect(screen.getAllByText(/^Lot 1 of /)).not.toHaveLength(0);
    expect(screen.queryByText(/^Lot 2 of /)).not.toBeInTheDocument();
  });

  test("shows a read-only CPU decision preview before advancing automated turns", async () => {
    const players = makePlayers();
    const leagueData = mockLeagueData({ players, pool: makePool(players) });
    leagueData.teams = [makeTeam("team-a", { controlledBy: "ai" }), makeTeam("team-b")];
    const seed = seedWhereCpuTeamBids(players, "team-a");
    window.history.pushState({}, "", `/league-builder/auction-draft?devSeed=${seed}`);

    render(<LeagueBuilderAuctionDraft />);

    fireEvent.click(await screen.findByRole("button", { name: /BEGIN AUCTION DRAFT/i }));

    await waitFor(() => {
      expect(screen.getByText("Review CPU decision")).toBeInTheDocument();
    });

    expect(screen.getByText(/turn preview/i)).toBeInTheDocument();
    const cpuMoveText = screen.getByText(/Page Caps will (bid \$[\d,]+|pass)/);
    const cpuBidAmount = cpuMoveText.textContent?.match(/\$[\d,]+/)?.[0] ?? "";
    const cpuReason = screen.getByText(/CPU team (likes the player and bids|passes)/);
    expect(cpuReason).toBeInTheDocument();
    expect(cpuReason.textContent).not.toContain("$");
    expect(screen.queryByText(/^Read\b/)).not.toBeInTheDocument();
    expect(screen.queryByText(/^Cap\b/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Advance decision" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Let him go/i })).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Advance decision" }));

    await waitFor(() => {
      expect(screen.queryByText(/turn preview/i)).not.toBeInTheDocument();
    });
    if (cpuBidAmount) {
      expect(screen.getByText("Page Caps")).toBeInTheDocument();
      expect(screen.getAllByText(cpuBidAmount).length).toBeGreaterThan(0);
    }
  });

  test("shows a pure shill winner on the visible AuctionStage roster board after SOLD", async () => {
    const players = makePlayers(66);
    mockLeagueData({ players, pool: makePool(players) });
    const seed = seedWhereFirstShillBids(players);
    window.history.pushState({}, "", `/league-builder/auction-draft?shills=1&devSeed=${seed}`);

    render(<LeagueBuilderAuctionDraft />);

    await waitFor(() => {
      expect(screen.getAllByText("1").length).toBeGreaterThan(0);
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

  test("P11: complete all-legal handoff check shows green rows and navigates to scout reveal", async () => {
    const players = await saveCompletedAuctionForPage();
    mockLeagueData({ players, pool: makePool(players) });

    render(<LeagueBuilderAuctionDraft />);

    expect(await screen.findByText("MLB DRAFT COMPLETE — THE HANDOFF CHECK")).toBeInTheDocument();
    expect(screen.getAllByText("✓ LEGAL 22")).toHaveLength(2);
    expect(screen.getByText("Every club fields a legal 22. Scout reveal is next.")).toBeInTheDocument();

    fireEvent.click(screen.getAllByRole("button", { name: /SCOUT REVEAL/i })[0]);

    expect(mockNavigate).toHaveBeenCalledWith("/league-builder/scout-hire?leagueId=league-page&reserveK=0.65");
  });

  // WT-D: already-won MLB players were plain, unclickable text on the roster board. This proves
  // the page-level wiring (playerById resolved in buildStageRosterSlots) actually reaches the
  // shared PlayerProfilePopover -- the component-level fog/reveal behavior itself is covered by
  // AuctionStage.test.tsx and PlayerProfilePopover.test.tsx.
  test("WT-D: a rostered player's name on the complete-screen roster board opens the profile popover with real ratings", async () => {
    const players = await saveCompletedAuctionForPage();
    mockLeagueData({ players, pool: makePool(players) });

    render(<LeagueBuilderAuctionDraft />);

    expect(await screen.findByText("MLB DRAFT COMPLETE — THE HANDOFF CHECK")).toBeInTheDocument();

    // team-a is the default roster-board focus once the auction is complete (no active bidder/
    // pending claim/latest winner) -- every one of its fixture players shares the "Free Agent"
    // display name, so scope the query to a single known slot rather than matching by name.
    const catcherSlot = screen.getByTestId("auction-board-slot-C");
    fireEvent.click(within(catcherSlot).getByRole("button", { name: "Free Agent" }));

    expect(screen.getByText("POW")).toBeInTheDocument();
    expect(screen.getAllByText("70").length).toBeGreaterThan(0);
    expect(screen.queryByText("Farm - scouting only")).not.toBeInTheDocument();
  });

  test("P2: blocked complete handoff focuses the panel and requires the two-step override", async () => {
    const teamAPlayers = makeExitRosterPlayers("team-a");
    const teamBPlayers = makeExitRosterPlayers("team-b", { missingSs: true });
    const players = await saveCompletedAuctionForPage({ teamAPlayers, teamBPlayers });
    mockLeagueData({ players, pool: makePool(players) });

    render(<LeagueBuilderAuctionDraft />);

    const panel = await screen.findByTestId("auction-complete-panel");
    expect(screen.getByTestId("auction-exit-blocked-team-b")).toBeInTheDocument();
    expect(screen.getByText("Still needs a starting SS.")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "REVIEW ROSTERS" }));
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(panel);

    fireEvent.click(screen.getByRole("button", { name: "PROCEED ANYWAY" }));
    expect(screen.getByText(/This hands off 1 club that can't field a legal 22/)).toBeInTheDocument();
    fireEvent.pointerDown(document.body);
    expect(screen.queryByText(/This hands off 1 club that can't field a legal 22/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "PROCEED ANYWAY" }));
    fireEvent.click(screen.getByRole("button", { name: "YES — HAND OFF AS-IS" }));

    expect(mockNavigate).toHaveBeenCalledWith("/league-builder/scout-hire?leagueId=league-page&reserveK=0.65");
  });

  test("P3: complete handoff reads positions from stored player records, not session enrichment", async () => {
    const players = await saveCompletedAuctionForPage();
    mockLeagueData({ players, pool: makePool(players) });

    render(<LeagueBuilderAuctionDraft />);

    expect(await screen.findByText("MLB DRAFT COMPLETE — THE HANDOFF CHECK")).toBeInTheDocument();
    expect(screen.getAllByText("✓ LEGAL 22")).toHaveLength(2);
    expect(screen.queryByText(/legality can't be verified/i)).not.toBeInTheDocument();
  });

  test("P4: pure shill clubs are not rendered and never block the handoff", async () => {
    const players = await saveCompletedAuctionForPage({ shillRosterCount: 20 });
    mockLeagueData({ players, pool: makePool(players) });

    render(<LeagueBuilderAuctionDraft />);

    expect(await screen.findByText("MLB DRAFT COMPLETE — THE HANDOFF CHECK")).toBeInTheDocument();
    expect(screen.queryByTestId(`auction-exit-club-${TEST_SHILL_ID}`)).not.toBeInTheDocument();
    expect(screen.getAllByText("✓ LEGAL 22")).toHaveLength(2);
    expect(screen.queryByText("BLOCKED")).not.toBeInTheDocument();
  });

  test("SETTLE P1/P2/P4: settle preview fills a stored-record short club and result line survives reload", async () => {
    const teamBShort = makeExitRosterPlayers("team-b").slice(0, 21);
    const shillPlayer = makePlayer(`${TEST_SHILL_ID}-rp-fix`, "RP");
    const players = await saveCompletedAuctionForPage({
      teamBPlayers: teamBShort,
      shillPlayers: [shillPlayer],
    });
    mockLeagueData({ players, pool: makePool(players) });

    const { unmount } = render(<LeagueBuilderAuctionDraft />);

    expect(await screen.findByText("MLB DRAFT COMPLETE — THE HANDOFF CHECK")).toBeInTheDocument();
    expect(screen.getByText(/Settle the empty seats from Market Shills below/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "SETTLE FROM THE SHILLS" }));
    expect(screen.getByText(/Settle 1 empty seat from the leftovers at league minimum/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "SETTLE 1 SEAT" }));

    await waitFor(() => {
      expect(screen.getAllByText("✓ LEGAL 22")).toHaveLength(2);
    });
    expect(screen.getByRole("button", { name: /SCOUT REVEAL/i })).toBeInTheDocument();
    expect(screen.getByText("Settled 1 seat from Market Shills at league minimum.")).toBeInTheDocument();

    unmount();
    cleanup();
    mockLeagueData({ players, pool: makePool(players) });
    render(<LeagueBuilderAuctionDraft />);

    expect(await screen.findByText("Settled 1 seat from Market Shills at league minimum.")).toBeInTheDocument();
    expect(screen.getAllByText("✓ LEGAL 22")).toHaveLength(2);
  });

  test("SETTLE P3/P5: failed settle preview adds no gate term and leaves the short guidance unchanged", async () => {
    const teamBShort = makeExitRosterPlayers("team-b", { missingSs: true }).slice(0, 21);
    const shillPlayer = makePlayer(`${TEST_SHILL_ID}-rp-only`, "RP");
    const players = await saveCompletedAuctionForPage({
      teamBPlayers: teamBShort,
      shillPlayers: [shillPlayer],
    });
    mockLeagueData({ players, pool: makePool(players) });

    render(<LeagueBuilderAuctionDraft />);

    const panel = await screen.findByTestId("auction-complete-panel");
    expect(screen.queryByRole("button", { name: "SETTLE FROM THE SHILLS" })).not.toBeInTheDocument();
    expect(screen.getByText(/Add more players in Draft Setup and run the draft again/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "REVIEW ROSTERS" }));

    expect(mockNavigate).not.toHaveBeenCalled();
    expect(document.activeElement).toBe(panel);
    expect(screen.queryByRole("button", { name: /SCOUT REVEAL/i })).not.toBeInTheDocument();
  });

  test("WT-A: a first pass recycled under reserve pricing shows UNSOLD, not the permanent GONE copy", async () => {
    const players = await savePassedLotSessionForPage({ reserveFractionK: 0.65, recycled: true });
    mockLeagueData({ players, pool: makePool(players) });

    render(<LeagueBuilderAuctionDraft />);

    expect(await screen.findByText("UNSOLD")).toBeInTheDocument();
    expect(screen.getByText(/Nobody bid at that price\. He'll get one more look later\./)).toBeInTheDocument();
    expect(screen.queryByText("GONE")).not.toBeInTheDocument();
    expect(screen.queryByText(/off the board for good/)).not.toBeInTheDocument();
  });

  test("WT-A: a second pass (recycling exhausted) shows the permanent GONE copy", async () => {
    const players = await savePassedLotSessionForPage({ reserveFractionK: 0.65, recycled: false });
    mockLeagueData({ players, pool: makePool(players) });

    render(<LeagueBuilderAuctionDraft />);

    expect(await screen.findByText("GONE")).toBeInTheDocument();
    expect(screen.getByText(/Nobody bid\. He's off the board for good\./)).toBeInTheDocument();
    expect(screen.queryByText("UNSOLD")).not.toBeInTheDocument();
  });

  test("WT-A: reserve pricing off never recycles a passed lot -- GONE copy even on the first pass", async () => {
    const players = await savePassedLotSessionForPage({ recycled: false });
    mockLeagueData({ players, pool: makePool(players) });

    render(<LeagueBuilderAuctionDraft />);

    expect(await screen.findByText("GONE")).toBeInTheDocument();
    expect(screen.queryByText("UNSOLD")).not.toBeInTheDocument();
  });
});
