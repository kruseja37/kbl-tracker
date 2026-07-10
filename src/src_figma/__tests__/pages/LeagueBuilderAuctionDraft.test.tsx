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
  toConstructionPlayer,
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
import { LUXURY_CAP_TABLES } from "../../../data/tierParams";
import * as auctionLuxuryTax from "../../../engines/auctionLuxuryTax";
import { buildAuctionPlayersWithPositions } from "../../../utils/leagueBuilderAuctionPipeline";

const mockNavigate = vi.fn();
const mockEmitAuctionAdvisorMoment = vi.hoisted(() => vi.fn(async (payload: { fallback: string }) => ({
  text: payload.fallback,
  source: "template" as const,
  rejected: false,
})));
const TEST_SESSION_LAUNCH_NONCE = "00000000-0000-4000-8000-000000000001";

vi.mock("react-router", () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock("../../app/engines/reporter/auctionAdvisorColorEmission", () => ({
  emitAuctionAdvisorMoment: mockEmitAuctionAdvisorMoment,
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
//
// CONTRACT_FIXTUREFIX_2026-07-09: PR #41 POOLFLOOR (CONTRACT_POOLFLOOR_2026-07-09.md) added hard
// per-position supply floors (derivePositionSupplyFloorTargets, src/engines/poolFromDemand.ts) on
// top of the count-only class-feasibility floor this fixture was already sized to. The old %5
// C/SS/RF/RP/SP cycle covers zero of 1B/2B/3B/CP, so it clears the count floor but not the
// position floors. This keeps the exact same 52-body class shape (32 hitters : 20 pitchers --
// matches poolDemandModel(2, 0).feasibilityFloor exactly) but spreads it across every hard
// legal position/role at or above derivePositionSupplyFloorTargets(2): the fixed player-a (CF) and
// player-b (SP) count toward their categories, then 31 new hitters split 4 each across
// C/1B/2B/3B/SS/LF/RF and 3 more CF (player-a supplies the 4th), with two of the "4th" 1B/2B
// hitters also carrying a secondary C for catcher depth (4 primary C + 2 secondary C = 6, the
// exact catcher-depth floor for 2 teams); then 19 new pitchers split 9 SP (player-b supplies the
// 10th) + 6 RP + 4 CP (10 startable, 10 relievable, 4 closers -- all exact). Any count beyond this
// 52-body shape (the default is 80) is padded with harmless CF depth that never binds a floor.
// player-a/player-b keep their original identity (Avery Anchor / Blake Bolt, first two positions)
// so every existing seed/name-based assertion still holds.
const CLASS_SHAPE_FIELD_ORDER: Array<Player["primaryPosition"]> = ["C", "1B", "2B", "3B", "SS", "LF", "RF", "CF"];

function classShapeForPositionFloors(): Array<{ position: Player["primaryPosition"]; secondary?: Player["secondaryPosition"] }> {
  const shape: Array<{ position: Player["primaryPosition"]; secondary?: Player["secondaryPosition"] }> = [];
  CLASS_SHAPE_FIELD_ORDER.forEach((position) => {
    // CF is last in cycle order and gets only 3 new bodies -- player-a's fixed CF supplies the 4th.
    const occurrences = position === "CF" ? 3 : 4;
    for (let n = 0; n < occurrences; n += 1) {
      const secondary = (position === "1B" && n === 3) || (position === "2B" && n === 3) ? "C" : undefined;
      shape.push({ position, secondary });
    }
  });
  // 9 more SP (player-b supplies the 10th) + 6 RP + 4 CP: 10 startable / 10 relievable / 4 closers.
  for (let n = 0; n < 9; n += 1) shape.push({ position: "SP" });
  for (let n = 0; n < 6; n += 1) shape.push({ position: "RP" });
  for (let n = 0; n < 4; n += 1) shape.push({ position: "CP" });
  return shape;
}

function makePlayers(count = 80): Player[] {
  const players = [
    makePlayer("player-a", "CF", "LF"),
    makePlayer("player-b", "SP"),
  ];
  let index = players.length;
  for (const shape of classShapeForPositionFloors()) {
    if (players.length >= count) break;
    players.push(makePlayer(`depth-${index + 1}`, shape.position, shape.secondary));
    index += 1;
  }
  while (players.length < count) {
    players.push(makePlayer(`depth-${index + 1}`, "CF"));
    index += 1;
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

function mockLeagueData(options: { players?: Player[]; pool?: RegisteredPool; teams?: Team[] } = {}) {
  const players = options.players ?? makePlayers();
  const pool = options.pool ?? makePool(players);
  const leagueData = {
    leagues: [makeLeague()],
    teams: options.teams ?? [makeTeam("team-a"), makeTeam("team-b")],
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

async function beginAndCommitHumanNomination(playerId = "player-a"): Promise<void> {
  fireEvent.click(await screen.findByRole("button", { name: /BEGIN AUCTION DRAFT/i }));
  const playerSelect = await screen.findByLabelText("Nomination player");
  fireEvent.change(playerSelect, { target: { value: playerId } });
  const reveal = await screen.findByRole("button", { name: /Reveal Page Caps assistant GM read/ });
  fireEvent.click(reveal);
  fireEvent.click(await screen.findByRole("button", { name: /NOMINATE ·/i }));
  await waitFor(() => {
    expect(screen.getByText("MLB auction")).toBeInTheDocument();
  });
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

async function saveNormwireTaxHeavyOpenLotForPage(): Promise<{
  players: Player[];
  pool: RegisteredPool;
  candidate: Player;
  rosterPlayers: Player[];
}> {
  const candidateId = "player-b";
  const basePlayers = makePlayers();
  const rosterIds = basePlayers
    .filter((player) => player.primaryPosition === "SP" && player.id !== candidateId)
    .slice(0, 3)
    .map((player) => player.id);
  const taxCoreIds = new Set([candidateId, ...rosterIds]);
  const players = basePlayers.map((player) => taxCoreIds.has(player.id)
    ? {
        ...player,
        power: 99,
        contact: 99,
        speed: 99,
        fielding: 99,
        arm: 99,
        velocity: 99,
        junk: 99,
        accuracy: 99,
      }
    : player);
  const pool: RegisteredPool = {
    ...makePool(players),
    luxuryCaps: LUXURY_CAP_TABLES.standard,
  };
  const playerById = new Map(players.map((player) => [player.id, player]));
  const auctionPlayers = await buildAuctionPlayersWithPositions(
    pool,
    async (playerId) => playerById.get(playerId) ?? null,
  );
  const availablePlayerIds = players
    .map((player) => player.id)
    .filter((playerId) => playerId !== candidateId && !rosterIds.includes(playerId));
  const session: CpuShillAuctionSession = {
    state: "OPEN_BIDDING",
    config: {
      ...DEFAULT_AUCTION_SETUP_CONFIG,
      nominationOrderSeed: "normwire-tax-heavy-open-lot",
      excludeFromLeague: true,
      cpuShillCount: 0,
    },
    teams: [
      {
        teamId: "team-a",
        budgetRemaining: 970_000,
        rosterSlotsRemaining: 19,
        minSalary: 3_000,
        projectedTax: 0,
        roster: rosterIds.map((playerId) => ({ playerId, salary: 10_000 })),
      },
      {
        teamId: "team-b",
        budgetRemaining: 1_000_000,
        rosterSlotsRemaining: 22,
        minSalary: 3_000,
        projectedTax: 0,
        roster: [],
      },
    ],
    nominationOrder: ["team-b", "team-a"],
    nominationIndex: 0,
    nominationRound: 1,
    players: Object.fromEntries(auctionPlayers.map((player) => [player.playerId, player])),
    playerOrder: auctionPlayers.map((player) => player.playerId),
    availablePlayerIds,
    currentLot: {
      playerId: candidateId,
      nominatorTeamId: "team-b",
      openingAsk: 10_000,
      highBid: 10_000,
      highBidder: "team-b",
      stillIn: ["team-a", "team-b"],
      bidTurnTeamId: "team-a",
      bidLog: [],
    },
    pendingClaim: null,
    results: [],
    saleCount: 0,
    cpuShills: {},
  };

  await saveTeamRoster(emptyRoster("team-a"));
  await saveTeamRoster(emptyRoster("team-b"));
  for (const player of players) await savePlayer(player);
  await saveAuctionSession({
    id: createAuctionSessionId("league-page", MLB_AUCTION_SEASON),
    leagueId: "league-page",
    seasonNumber: MLB_AUCTION_SEASON,
    seed: session.config.nominationOrderSeed,
    session,
  });

  return {
    players,
    pool,
    candidate: playerById.get(candidateId)!,
    rosterPlayers: rosterIds.map((playerId) => playerById.get(playerId)!),
  };
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

  test("renders setup, requires a manual committed nomination, then opens bidding", async () => {
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

    expect(await screen.findByText("Next nomination")).toBeInTheDocument();
    expect(screen.getByLabelText("Nomination player")).toBeInTheDocument();
    expect(screen.getByLabelText("Nomination opening bid")).toHaveValue(1_667);
    expect(screen.queryByRole("button", { name: /Let him go/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /NOMINATE ·/i })).toBeDisabled();

    fireEvent.change(screen.getByLabelText("Nomination player"), { target: { value: "player-a" } });
    fireEvent.click(screen.getByRole("button", { name: /Reveal Page Caps assistant GM read/ }));
    expect(screen.getByRole("button", { name: /NOMINATE ·/i })).toBeEnabled();
    fireEvent.click(screen.getByRole("button", { name: /NOMINATE ·/i }));

    expect(await screen.findByText("MLB auction")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Help" }));
    expect(screen.getByText("MLB auction")).toBeInTheDocument();
    expect(screen.getByText("On the block")).toBeInTheDocument();
    expect(screen.queryByLabelText("Position filter")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /IV SORT/i })).not.toBeInTheDocument();
    expect(screen.getAllByText(/Avery Anchor|Blake Bolt/i).length).toBeGreaterThan(0);
    expect(screen.getByText("Ceiling")).toBeInTheDocument();
    // FLOORREFIT Move 5: the old "Public market" eyebrow is gone -- "MARKET" is the label now,
    // inline in the consolidated mono line (design §1.2, say-it-once). Same coverage (the
    // market-read block renders), same aria-label assertion right after it.
    expect(screen.getByText(/^MARKET \$/)).toBeInTheDocument();
    expect(screen.getByLabelText("Public market price band")).toBeInTheDocument();
    expect(screen.queryByText(/Scout Insight:/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Let the bid stand/i })).toBeInTheDocument();
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

    await beginAndCommitHumanNomination("player-a");
    mockEmitAuctionAdvisorMoment.mockClear();

    expect(screen.getByText("On the block")).toBeInTheDocument();
    expect(screen.getAllByText(/Avery Anchor|Blake Bolt/i).length).toBeGreaterThan(0);
    expect(screen.getByText("Page Caps")).toBeInTheDocument();
    expect(screen.getByText(/Page (Caps|Keys) budget/)).toBeInTheDocument();
    expect(screen.getByText("Ceiling")).toBeInTheDocument();
    expect(screen.getByText("Slots left")).toBeInTheDocument();
    // PRIVACY: the acting human must claim the seat before any strategy/advisor content or
    // action control opens. Public lot/market/roster facts above remain visible.
    expect(screen.queryByText(/Priority need:/)).not.toBeInTheDocument();
    const reveal = screen.getByRole("button", { name: /Reveal Page (Caps|Keys) assistant GM read/ });
    const firstRevealLabel = reveal.getAttribute("aria-label");
    fireEvent.click(reveal);
    expect(screen.getByText(/Priority need:/)).toBeInTheDocument();
    expect(await screen.findByText("PRE-DRAFT BRIEF")).toBeInTheDocument();
    expect(mockEmitAuctionAdvisorMoment).toHaveBeenCalledTimes(1);
    fireEvent.click(reveal);
    expect(screen.getAllByText("PRE-DRAFT BRIEF")).toHaveLength(1);
    expect(mockEmitAuctionAdvisorMoment).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("player-a")).not.toBeInTheDocument();
    expect(screen.queryByText("team-a")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Custom bid amount")).not.toBeInTheDocument();

    expect(screen.getByText("OPEN")).toBeInTheDocument();
    expect(firstRevealLabel).toMatch(/Page Keys/);
    expect(screen.getByRole("button", { name: "Let the bid stand" })).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: "Let the bid stand" }));

    await waitFor(() => {
      // CALLFIX Item 3: the log row's headline name is now popover-wrapped (a separate element
      // from the trailing "SOLD to ... for $X" text), so the sentence is split across sibling
      // nodes -- match on full element.textContent (a custom function matcher) instead of the
      // default direct-child-text-only matcher, per testing-library's own guidance for this case.
      expect(
        screen.getAllByText((_content, element) =>
          /(Avery Anchor|Blake Bolt) SOLD to Page (Caps|Keys) for \$/.test(element?.textContent ?? ""),
        ).length,
      ).toBeGreaterThan(0);
    });
    expect(screen.getAllByText(/^Lot 1 of /)).not.toHaveLength(0);
    expect(screen.queryByText(/^Lot 2 of /)).not.toBeInTheDocument();
  });

  // STAKES repro-first (CONTRACT_STAKES_2026-07-09.md Tier 1): the live bid controls already
  // hold the GM's contemplated amount, but the pre-fix page pins projectBidVsPass to the lot's
  // standing high bid/opening ask. Selecting a higher bid step must therefore move the revealed
  // stakes header after the page's debounce without submitting a bid.
  test("STAKES: the revealed bid-vs-pass read follows the contemplated bid step", async () => {
    const players = makePlayers();
    const leagueData = mockLeagueData({ players, pool: makePool(players) });
    leagueData.teams = [
      makeTeam("team-a", { mlbArchetypeKey: "murderers-row" }),
      makeTeam("team-b", { mlbArchetypeKey: "murderers-row" }),
    ];
    for (const player of players) await savePlayer(player);
    const seed = seedForOpeningLot(players, { bidderTeamId: "team-a" });
    window.history.pushState({}, "", `/league-builder/auction-draft?devSeed=${seed}&reserveK=0`);

    render(<LeagueBuilderAuctionDraft />);
    await beginAndCommitHumanNomination("player-a");

    const reveal = await screen.findByRole("button", { name: /Reveal Page Keys assistant GM read/ });
    expect(screen.queryByTestId("whisper-keep-targets")).not.toBeInTheDocument();
    fireEvent.click(reveal);
    const stakes = await screen.findByTestId("whisper-bid-vs-pass");
    expect(within(stakes).getAllByText(/^Your #\d+ — /)).toHaveLength(3);

    fireEvent.click(screen.getByRole("button", { name: "+2x" }));
    const contemplated = screen.getByText(/your bid · \$[\d,]+/).textContent?.split("·")[1]?.trim();
    if (!contemplated) throw new Error("expected the selected contemplated bid to render");

    await waitFor(() => {
      expect(screen.getByText(`IF YOU WIN AT ${contemplated}`)).toBeInTheDocument();
    });
  });

  test("shows a read-only CPU nomination preview before advancing the committed open", async () => {
    const players = makePlayers();
    const leagueData = mockLeagueData({ players, pool: makePool(players) });
    leagueData.teams = [makeTeam("team-a", { controlledBy: "ai" }), makeTeam("team-b")];
    window.history.pushState({}, "", "/league-builder/auction-draft");

    render(<LeagueBuilderAuctionDraft />);

    fireEvent.click(await screen.findByRole("button", { name: /BEGIN AUCTION DRAFT/i }));

    await waitFor(() => {
      expect(screen.getByText("Review CPU nomination")).toBeInTheDocument();
    });

    expect(screen.getByText(/turn preview/i)).toBeInTheDocument();
    const cpuMoveText = screen.getByText(/Page Caps nominates/);
    const cpuReason = screen.getByText(/board value, roster need, and fit/i);
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
    expect(screen.getByText("MLB auction")).toBeInTheDocument();
    expect(screen.getByText("Page Caps")).toBeInTheDocument();
  });

  // CALLFIX Item 5(d): the stage's public market banner used to ALWAYS compute its own,
  // independent read with advisedTeamId: null -- now it reuses the SAME per-seat read the whisper
  // payload assembly consumes when a human seat is on the clock, falling back to the prior neutral
  // (advisedTeamId: null) read only when no human seat is active. With team-a AI-controlled and
  // bidding first, this lot has no active human seat -- activeWhisperSeatTeamId resolves to null,
  // so this exercises the EXACT SAME neutral code path (and therefore the exact same numbers) as
  // before the fix. Locks the deterministic band this seed + fixture produces as a real (not
  // synthetic) regression guard.
  //
  // FLOORREFIT Move 5: the DOM this queries changed (the three unlabeled boxes collapsed into one
  // "MARKET $lo · $mid · $hi — RESERVE $r" mono line, same aria-label) -- the byte-identical target
  // string is updated to the new format, still asserting the exact same three numbers (plus the
  // reserve this fixture already carries), still a real regression guard.
  test("CALLFIX Item 5(d): the public market band is byte-identical for the no-seat (CPU-turn) case", async () => {
    const players = makePlayers();
    const leagueDataAllCpu = mockLeagueData({ players, pool: makePool(players) });
    leagueDataAllCpu.teams = [
      makeTeam("team-a", { controlledBy: "ai" }),
      makeTeam("team-b", { controlledBy: "ai" }),
    ];

    render(<LeagueBuilderAuctionDraft />);
    fireEvent.click(await screen.findByRole("button", { name: /BEGIN AUCTION DRAFT/i }));

    await waitFor(() => {
      expect(screen.getByText("Review CPU nomination")).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole("button", { name: "Advance decision" }));
    await screen.findByText("Review CPU decision");

    const band = screen.getByLabelText("Public market price band");
    expect(band.textContent).toMatch(/^MARKET \$[\d,]+ · \$[\d,]+ · \$[\d,]+ — OPEN \$[\d,]+$/);
  });

  test("NORMWIRE: 2-team TRUE COST uses the exact settlement marginal tax for the same lot and club", async () => {
    const fixture = await saveNormwireTaxHeavyOpenLotForPage();
    const bandPriorities = {
      Power: 1,
      Contact: 1,
      Speed: 1,
      Defense: 1,
      Rotation: 1,
      Bullpen: 1,
    };
    const capIdentity = { bandPriorities, increase: [], decrease: [] };
    mockLeagueData({
      players: fixture.players,
      pool: fixture.pool,
      teams: [
        makeTeam("team-a", { capIdentity }),
        makeTeam("team-b", { capIdentity }),
      ],
    });
    const roster = fixture.rosterPlayers.map(toConstructionPlayer);
    const candidate = toConstructionPlayer(fixture.candidate);
    const normalizedCaps = auctionLuxuryTax.normalizeAuctionLuxuryCapsForLeagueSize(
      fixture.pool.luxuryCaps,
      2,
    );
    const settlementMarginal = auctionLuxuryTax.auctionMarginalTaxWithCaps(
      roster,
      candidate,
      capIdentity,
      normalizedCaps,
    );
    const legacyRawMarginal = auctionLuxuryTax.auctionMarginalTaxWithCaps(
      roster,
      candidate,
      capIdentity,
      fixture.pool.luxuryCaps,
    );
    expect(settlementMarginal).toBeGreaterThan(0);
    expect(legacyRawMarginal).toBeGreaterThan(settlementMarginal);
    const marginalSpy = vi.spyOn(auctionLuxuryTax, "auctionMarginalTaxWithCaps");

    render(<LeagueBuilderAuctionDraft />);

    fireEvent.click(await screen.findByRole("button", { name: /Reveal Page Caps assistant GM read/ }));
    const number = await screen.findByTestId("whisper-tier1-number");
    const trueCost = await screen.findByTestId("whisper-tier1-truecost");
    const numberMatch = /YOUR NUMBER \$([\d,]+)/.exec(number.textContent ?? "");
    const trueCostMatch = /TRUE COST \$([\d,]+)/.exec(trueCost.textContent ?? "");
    const displayedNumber = (number.textContent ?? "").includes("YOUR NUMBER PASS")
      ? 0
      : Number(numberMatch?.[1].replace(/,/g, ""));
    expect(Number.isFinite(displayedNumber)).toBe(true);
    expect(trueCostMatch).not.toBeNull();
    const displayedSurcharge = Number(trueCostMatch![1].replace(/,/g, ""))
      - displayedNumber;
    expect(Math.abs(displayedSurcharge - settlementMarginal)).toBeLessThanOrEqual(1);

    const rosterIds = fixture.rosterPlayers.map((player) => player.id).sort().join("|");
    const matchingCallIndexes = marginalSpy.mock.calls.flatMap((call, index) => {
      const [calledRoster, calledCandidate, calledIdentity, calledCaps] = call;
      const calledRosterIds = calledRoster.map((player) => player.id).sort().join("|");
      return calledCandidate.id === fixture.candidate.id
        && calledRosterIds === rosterIds
        && calledIdentity === capIdentity
        && JSON.stringify(calledCaps) === JSON.stringify(normalizedCaps)
        ? [index]
        : [];
    });
    // One call is settlement's projectedTax recompute; another is the whisper's TRUE COST read.
    expect(matchingCallIndexes.length).toBeGreaterThanOrEqual(2);
    expect(matchingCallIndexes.map((index) => marginalSpy.mock.results[index].value))
      .toEqual(matchingCallIndexes.map(() => settlementMarginal));
  });

  test("shows a pure shill winner on the visible AuctionStage roster board after SOLD", async () => {
    const players = makePlayers(66);
    mockLeagueData({ players, pool: makePool(players) });
    window.history.pushState({}, "", "/league-builder/auction-draft?shills=1");

    render(<LeagueBuilderAuctionDraft />);

    await waitFor(() => {
      expect(screen.getAllByText("1").length).toBeGreaterThan(0);
    });
    await beginAndCommitHumanNomination("player-a");

    fireEvent.click(await screen.findByRole("button", { name: /Reveal Page Keys assistant GM read/ }));
    fireEvent.click(screen.getByRole("button", { name: "Let the bid stand" }));

    expect(await screen.findByText(/Market Shill 1 will bid/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Advance decision" }));

    fireEvent.click(await screen.findByRole("button", { name: /Reveal Page Caps assistant GM read/ }));
    fireEvent.click(screen.getByRole("button", { name: "Let the bid stand" }));

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

  test("auction rebuild: a blocked handoff has no override or continuation safety net", async () => {
    const teamAPlayers = makeExitRosterPlayers("team-a");
    const teamBPlayers = makeExitRosterPlayers("team-b", { missingSs: true });
    const players = await saveCompletedAuctionForPage({ teamAPlayers, teamBPlayers });
    mockLeagueData({ players, pool: makePool(players) });

    render(<LeagueBuilderAuctionDraft />);

    await screen.findByTestId("auction-complete-panel");
    expect(screen.getByTestId("auction-exit-blocked-team-b")).toBeInTheDocument();
    expect(screen.getByText("Still needs a starting SS.")).toBeInTheDocument();
    expect(screen.getByText("NO HANDOFF — this auction did not reach its legal end condition.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /review rosters|proceed anyway|scout reveal/i })).not.toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
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

  test("auction rebuild: a shill-held player is never redistributed into a short club", async () => {
    const teamBShort = makeExitRosterPlayers("team-b").slice(0, 21);
    const shillPlayer = makePlayer(`${TEST_SHILL_ID}-rp-fix`, "RP");
    const players = await saveCompletedAuctionForPage({
      teamBPlayers: teamBShort,
      shillPlayers: [shillPlayer],
    });
    mockLeagueData({ players, pool: makePool(players) });

    render(<LeagueBuilderAuctionDraft />);

    expect(await screen.findByText("MLB DRAFT COMPLETE — THE HANDOFF CHECK")).toBeInTheDocument();
    expect(screen.getByTestId("auction-exit-blocked-team-b")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /SETTLE FROM THE SHILLS/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /SCOUT REVEAL/i })).not.toBeInTheDocument();
    expect(screen.getByText("NO HANDOFF — this auction did not reach its legal end condition.")).toBeInTheDocument();
  });

  test("auction rebuild: an incompatible shill body also leaves the legal shortfall visible", async () => {
    const teamBShort = makeExitRosterPlayers("team-b", { missingSs: true }).slice(0, 21);
    const shillPlayer = makePlayer(`${TEST_SHILL_ID}-rp-only`, "RP");
    const players = await saveCompletedAuctionForPage({
      teamBPlayers: teamBShort,
      shillPlayers: [shillPlayer],
    });
    mockLeagueData({ players, pool: makePool(players) });

    render(<LeagueBuilderAuctionDraft />);

    await screen.findByTestId("auction-complete-panel");
    expect(screen.queryByRole("button", { name: "SETTLE FROM THE SHILLS" })).not.toBeInTheDocument();
    expect(screen.getByText("Still needs a starting SS.")).toBeInTheDocument();
    expect(mockNavigate).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: /SCOUT REVEAL/i })).not.toBeInTheDocument();
  });

  test("WT-A: a first pass recycled under reserve pricing shows UNSOLD, not the permanent GONE copy", async () => {
    const players = await savePassedLotSessionForPage({ reserveFractionK: 0.65, recycled: true });
    mockLeagueData({ players, pool: makePool(players) });

    render(<LeagueBuilderAuctionDraft />);

    expect(await screen.findByText("UNSOLD")).toBeInTheDocument();
    expect(screen.getByText(/No takers at that price — he'll come around again\./)).toBeInTheDocument();
    expect(screen.queryByText("GONE")).not.toBeInTheDocument();
    expect(screen.queryByText(/off the board for good/)).not.toBeInTheDocument();
  });

  test("WT-A: a second pass (recycling exhausted) shows the permanent GONE copy", async () => {
    const players = await savePassedLotSessionForPage({ reserveFractionK: 0.65, recycled: false });
    mockLeagueData({ players, pool: makePool(players) });

    render(<LeagueBuilderAuctionDraft />);

    expect(await screen.findByText("GONE")).toBeInTheDocument();
    expect(screen.getByText(/No takers — he's off the board for good\./)).toBeInTheDocument();
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
