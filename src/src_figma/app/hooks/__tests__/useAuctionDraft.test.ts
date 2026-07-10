import "fake-indexeddb/auto";

import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import {
  getTeamAuctionMaxBid,
  initAuctionSession,
  passBid,
  recordBid,
  resolveLot,
  seededNominationOrder,
  surfaceNextPlayer,
  type AuctionPlayer as EnginePlayer,
} from "../../../../engines/auctionStateMachine";
import type { CpuShillAuctionSession } from "../../../../engines/cpuShillBidding";
import { archetypeBandPriorities } from "../../../../engines/cpuShillBidding";
import {
  buildArchetypeLiftTable,
  buildLotViewFromSession,
  estimateMarket,
} from "../../../../engines/auctionMarketModel";
import { HISTORICAL_ARCHETYPES } from "../../../../data/historicalArchetypes";
import type { LuxuryCapRow } from "../../../../data/tierParams";
import {
  __resetLeagueBuilderDatabaseForTests,
  createAuctionSessionId,
  getAuctionSession,
  saveAuctionSession,
  savePlayer,
} from "../../../../utils/leagueBuilderStorage";
import {
  useLeagueBuilderData,
  type LeagueTemplate,
  type Player,
  type RegisteredPool,
  type Team,
  type TeamRoster,
  type UseLeagueBuilderDataReturn,
} from "../../../hooks/useLeagueBuilderData";
import { applyAuctionLuxuryTaxForLot, useAuctionDraft } from "../useAuctionDraft";
import { buildMarketBandPrioritiesByTeamId } from "../../pages/LeagueBuilderAuctionDraft";

vi.mock("../../../../utils/syncEngine", () => ({
  syncEngine: {
    isSuppressed: () => true,
    upsert: vi.fn(),
    remove: vi.fn(),
  },
}));

vi.mock("../../../hooks/useLeagueBuilderData", async () => {
  const actual = await vi.importActual<typeof import("../../../hooks/useLeagueBuilderData")>(
    "../../../hooks/useLeagueBuilderData",
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

function makeLeague(id: string, teamIds: string[]): LeagueTemplate {
  return {
    id,
    name: id,
    teamIds,
    conferences: [],
    divisions: [],
    defaultRulesPreset: "rules",
    tier: "standard",
    balanceMode: "taxed",
    createdDate: "2026-01-01",
    lastModified: "2026-01-01",
  };
}

function makeTeam(id: string, controlledBy: Team["controlledBy"] = "human", overrides: Partial<Team> = {}): Team {
  return {
    id,
    name: id.toUpperCase(),
    abbreviation: id.slice(0, 3).toUpperCase(),
    location: "Test",
    nickname: id,
    colors: { primary: "#000000", secondary: "#ffffff" },
    stadium: "Test Park",
    controlledBy,
    leagueIds: ["league"],
    createdDate: "2026-01-01",
    lastModified: "2026-01-01",
    ...overrides,
  };
}

function makePlayer(id: string, overrides: Partial<Player> = {}): Player {
  return {
    id,
    firstName: id,
    lastName: "Player",
    gender: "M",
    age: 25,
    bats: "R",
    throws: "R",
    primaryPosition: "CF",
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
    leagueAssignments: [{ leagueId: "league", teamId: "human", rosterStatus: "FREE_AGENT" }],
    createdDate: "2026-01-01",
    lastModified: "2026-01-01",
    isCustom: true,
    ...overrides,
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

const TEST_POOL_SHAPES: Array<Pick<Player, "primaryPosition" | "secondaryPosition">> = [
  ...(["C", "1B", "2B", "3B", "SS", "LF", "RF", "CF"] as Player["primaryPosition"][])
    .flatMap((primaryPosition) => Array.from({ length: 4 }, (_, index) => ({
      primaryPosition,
      ...((primaryPosition === "1B" || primaryPosition === "2B") && index === 3
        ? { secondaryPosition: "C" as const }
        : {}),
    }))),
  ...Array.from({ length: 10 }, () => ({ primaryPosition: "SP" as const })),
  ...Array.from({ length: 6 }, () => ({ primaryPosition: "RP" as const })),
  ...Array.from({ length: 4 }, () => ({ primaryPosition: "CP" as const })),
];

function makePool(
  leagueId: string,
  playerIds = Array.from({ length: 80 }, (_, index) => `p${index + 1}`),
): RegisteredPool {
  return {
    leagueId,
    tier: "standard",
    balanceMode: "taxed",
    players: playerIds.map((id, index) => ({
      id,
      iv: 100_000 - index * 10_000,
      salary: 10_000 - index * 500,
    })),
    tierCap: 1_000_000,
    luxuryCaps: [],
    pickValueChart: [],
    totalSlots: 88,
    poolSurplusWarning: false,
  };
}

function makePlayersForPool(
  pool: RegisteredPool,
  overrides: Readonly<Record<string, Partial<Player>>> = {},
): Player[] {
  return pool.players.map((poolPlayer, index) => makePlayer(poolPlayer.id, {
    ...TEST_POOL_SHAPES[index % TEST_POOL_SHAPES.length],
    ...(overrides[poolPlayer.id] ?? {}),
  }));
}

function seedWithFirst(teamIds: string[], firstTeamId: string): string {
  const seed = Array.from({ length: 500 }, (_, index) => `auction-seed-${index}`).find(
    (candidate) => seededNominationOrder(teamIds, candidate)[0] === firstTeamId,
  );
  if (!seed) throw new Error(`No seed found for first team ${firstTeamId}`);
  return seed;
}

function mockLeagueData(input: {
  leagues: LeagueTemplate[];
  teams: Team[];
  pools: Record<string, RegisteredPool>;
  players?: Player[];
}) {
  const players = input.players ?? Object.values(input.pools)
    .flatMap((pool) => pool.players)
    .map((poolPlayer, index) => makePlayer(poolPlayer.id, TEST_POOL_SHAPES[index % TEST_POOL_SHAPES.length]));
  const leagueData = {
    leagues: input.leagues,
    teams: input.teams,
    players,
    rulesPresets: [],
    isLoading: false,
    error: null,
    getRegisteredPool: vi.fn(async (leagueId: string) => input.pools[leagueId] ?? null),
    registerLeaguePool: vi.fn(async (leagueId: string) => input.pools[leagueId]),
    clearRoster: vi.fn(async (teamId: string) => emptyRoster(teamId)),
    getRoster: vi.fn(async (teamId: string) => emptyRoster(teamId)),
    refresh: vi.fn(async () => undefined),
  } as unknown as UseLeagueBuilderDataReturn;

  vi.mocked(useLeagueBuilderData).mockReturnValue(leagueData);
  return leagueData;
}

describe("useAuctionDraft", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    __resetLeagueBuilderDatabaseForTests();
    await deleteDatabase(DB_NAME).catch(() => undefined);
  });

  afterEach(async () => {
    __resetLeagueBuilderDatabaseForTests();
    await deleteDatabase(DB_NAME).catch(() => undefined);
  });

  test("initializes at the fixed nomination turn, then persists the club's committed opening bid", async () => {
    const teamIds = ["human", "other"];
    const seed = seedWithFirst(teamIds, "human");
    mockLeagueData({
      leagues: [makeLeague("league-init", teamIds)],
      teams: teamIds.map((id) => makeTeam(id)),
      pools: { "league-init": makePool("league-init") },
    });
    for (const player of ["p1", "p2", "p3", "p4"].map((id) => makePlayer(id))) {
      await savePlayer(player);
    }

    const { result } = renderHook(() => useAuctionDraft());

    await act(async () => {
      await result.current.initAuction("league-init", {
        nominationOrderSeed: seed,
        cpuShillCount: 0,
        bidIncrement: 1_000,
      });
    });

    expect(result.current.session?.state).toBe("NOMINATION");
    expect(result.current.currentNominatorTeamId).toBe("human");
    expect(result.current.session?.availablePlayerIds).toHaveLength(80);
    expect(result.current.session?.currentLot).toBeNull();
    expect(result.current.session?.config.sequentialNomination).toBe(true);
    expect(result.current.session?.config.nominationWeightExponent).toBe(2);
    expect(result.current.session?.players.p1.ivPercentile).toBe(100);
    expect(result.current.session?.players.p1.pos).toMatchObject({
      isPitcher: false,
      position: "CF",
    });
    expect(result.current.session?.teams.map((team) => team.projectedTax)).toEqual([0, 0]);

    await act(async () => {
      await result.current.nominate("human", "p1", 5_000);
    });

    expect(result.current.session?.state).toBe("OPEN_BIDDING");
    expect(result.current.session?.availablePlayerIds).toHaveLength(79);
    expect(result.current.session?.currentLot).toMatchObject({
      playerId: "p1",
      nominatorTeamId: "human",
      highBid: 5_000,
      highBidder: "human",
    });

    const marketView = result.current.session
      ? buildLotViewFromSession(result.current.session, {
          shillTeamIds: new Set(result.current.shillTeamIds),
          advisedTeamId: null,
          humanTeamIds: new Set(["human", "other"]),
        })
      : null;
    expect(marketView).not.toBeNull();
    expect(marketView?.bidders.length).toBeGreaterThan(0);
    const market = marketView ? estimateMarket(marketView, buildArchetypeLiftTable()) : null;
    expect(market?.band.low).toBeGreaterThan(0);
    expect(market?.band.high).toBeGreaterThanOrEqual(market?.band.low ?? 0);

    const persisted = await getAuctionSession("league-init");
    expect(persisted?.session.state).toBe("OPEN_BIDDING");
    expect(persisted?.session.currentLot?.playerId).toBe(result.current.session?.currentLot?.playerId);
    expect(persisted?.session.sessionLaunchNonce).toEqual(expect.any(String));
    expect(persisted?.session.sessionBaseSeed).toBe(seed);
    expect(persisted?.session.config.nominationOrderSeed).not.toBe(seed);
    expect(persisted?.session.config.nominationOrderSeed).toContain(seed);
    expect(persisted?.session.config.nominationOrderSeed).toContain(createAuctionSessionId("league-init", 1));
    expect(persisted?.session.config.nominationOrderSeed).toContain(persisted?.session.sessionLaunchNonce ?? "");
  });

  test("starts consecutive MLB auctions for the same pool with different session-derived nomination seeds", async () => {
    const teamIds = ["human", "other"];
    const setupSeed = seedWithFirst(teamIds, "human");
    mockLeagueData({
      leagues: [makeLeague("league-f1", teamIds)],
      teams: teamIds.map((id) => makeTeam(id)),
      pools: { "league-f1": makePool("league-f1") },
    });
    for (const player of ["p1", "p2", "p3", "p4"].map((id) => makePlayer(id))) {
      await savePlayer(player);
    }

    const { result } = renderHook(() => useAuctionDraft());

    await act(async () => {
      await result.current.initAuction("league-f1", {
        nominationOrderSeed: setupSeed,
        cpuShillCount: 0,
        bidIncrement: 1_000,
      });
    });
    const firstSeed = result.current.session?.config.nominationOrderSeed;
    const firstNonce = result.current.session?.sessionLaunchNonce;
    const firstPlayerOrder = result.current.session?.playerOrder;

    await act(async () => {
      await result.current.initAuction("league-f1", {
        nominationOrderSeed: setupSeed,
        cpuShillCount: 0,
        bidIncrement: 1_000,
      });
    });

    expect(result.current.session?.playerOrder).toEqual(firstPlayerOrder);
    expect(result.current.session?.config.nominationOrderSeed).not.toBe(firstSeed);
    expect(result.current.session?.sessionLaunchNonce).not.toBe(firstNonce);
    expect(result.current.session?.config.nominationOrderSeed).toContain(createAuctionSessionId("league-f1", 1));
  });

  test("initializes new auction budgets from league salaryCap instead of a stale locked pool stamp", async () => {
    const teamIds = ["human", "other"];
    const shillId = "__auction_shill__league-hard-cap__1";
    const seed = seedWithFirst([...teamIds, shillId], "human");
    const cap = 1_200_000;
    const stalePool = {
      ...makePool("league-hard-cap", ["p1", "p2", "p3", "p4"]),
      tierCap: 1_550_000,
      locked: true,
    };
    mockLeagueData({
      leagues: [{ ...makeLeague("league-hard-cap", teamIds), salaryCap: cap }],
      teams: teamIds.map((id) => makeTeam(id)),
      pools: { "league-hard-cap": stalePool },
    });
    for (const player of stalePool.players.map((poolPlayer) => makePlayer(poolPlayer.id))) {
      await savePlayer(player);
    }

    const { result } = renderHook(() => useAuctionDraft());

    await act(async () => {
      await result.current.initAuction("league-hard-cap", {
        nominationOrderSeed: seed,
        cpuShillCount: 1,
        bidIncrement: 1_000,
      });
    });

    expect(result.current.session?.teams.filter((team) => teamIds.includes(team.teamId)).map((team) => team.budgetRemaining))
      .toEqual([cap, cap]);
    expect(result.current.shillTeamIds).toHaveLength(1);
    expect(result.current.session?.teams.find((team) => result.current.shillTeamIds.includes(team.teamId))?.budgetRemaining)
      .toBe(cap);
  });

  test("SHILLTAX repro: explicit non-completing shills are tax-neutral on every surfaced lot", () => {
    const candidate = makePlayer("taxed-candidate", { contact: 100 });
    const caps: LuxuryCapRow[] = [{
      group: "hitters",
      stat: "CON",
      topN: 1,
      cap: 50,
      penaltyCurve: 1,
      penaltyPer100: 1_000_000,
      minAdder: 0,
    }];
    const shillId = "__auction_shill__shilltax__1";
    const initialized = initAuctionSession({
      teams: [
        { teamId: "club", budgetRemaining: 1_000_000, rosterSlotsRemaining: 22 },
        { teamId: shillId, budgetRemaining: 1_000_000, rosterSlotsRemaining: 22 },
      ],
      players: [{ playerId: candidate.id, iv: 90_000, ivPercentile: 100 }],
      nominationOrder: ["club", shillId],
      config: {
        nominationOrderSeed: "shilltax-repro",
        bidIncrement: 1_000,
        nonCompletingTeamIds: [shillId],
      },
    }) as CpuShillAuctionSession;
    const surfaced = surfaceNextPlayer(initialized);
    if (!surfaced.ok) throw new Error("test setup: surfaceNextPlayer rejected");

    const projected = applyAuctionLuxuryTaxForLot(surfaced.session as CpuShillAuctionSession, {
      poolById: new Map([[candidate.id, { id: candidate.id, iv: 90_000, salary: 10_000 }]]),
      playerById: new Map([[candidate.id, candidate]]),
      identityByTeamId: new Map(),
      baseCaps: caps,
    });

    expect(projected.teams.find((team) => team.teamId === "club")?.projectedTax).toBeGreaterThan(0);
    expect(projected.teams.find((team) => team.teamId === shillId)?.projectedTax).toBe(0);

    const openingAsk = projected.currentLot?.openingAsk ?? 0;
    const shillBid = recordBid(projected, shillId, openingAsk);
    if (!shillBid.ok) throw new Error(`test setup: shill bid rejected (${shillBid.reason})`);
    const clubPass = passBid(shillBid.session, "club");
    if (!clubPass.ok) throw new Error(`test setup: club pass rejected (${clubPass.reason})`);
    const settled = resolveLot(clubPass.session);
    if (!settled.ok) throw new Error(`test setup: lot resolution rejected (${settled.reason})`);

    expect(settled.session.teams.find((team) => team.teamId === shillId)?.budgetRemaining)
      .toBe(1_000_000 - openingAsk);
  });

  test("does not retro-edit an in-flight persisted auction session when the league cap changes", async () => {
    const teamIds = ["human", "other"];
    const session = initAuctionSession({
      teams: [
        { teamId: "human", budgetRemaining: 999_000, rosterSlotsRemaining: 22 },
        { teamId: "other", budgetRemaining: 888_000, rosterSlotsRemaining: 22 },
      ],
      players: [{
        playerId: "p1",
        iv: 50_000,
        ivPercentile: 100,
        pos: { isPitcher: false, position: "CF" },
      }],
      nominationOrder: teamIds,
      config: { nominationOrderSeed: seedWithFirst(teamIds, "human"), bidIncrement: 1_000 },
    }) as CpuShillAuctionSession;
    mockLeagueData({
      leagues: [{ ...makeLeague("league-resume-cap", teamIds), salaryCap: 1_200_000 }],
      teams: teamIds.map((id) => makeTeam(id)),
      pools: { "league-resume-cap": { ...makePool("league-resume-cap", ["p1"]), tierCap: 1_550_000, locked: true } },
      players: [makePlayer("p1")],
    });
    await saveAuctionSession({
      id: createAuctionSessionId("league-resume-cap", 1),
      leagueId: "league-resume-cap",
      seasonNumber: 1,
      seed: session.config.nominationOrderSeed,
      session,
    });

    const { result } = renderHook(() => useAuctionDraft());

    await act(async () => {
      await result.current.loadAuction("league-resume-cap");
    });

    expect(result.current.session?.teams.map((team) => team.budgetRemaining)).toEqual([999_000, 888_000]);
  });

  test("pauses on CPU bidding turns until the decision is advanced", async () => {
    const teamIds = ["human", "cpu", "other"];
    const seed = seedWithFirst(teamIds, "human");
    mockLeagueData({
      leagues: [makeLeague("league-loop", teamIds)],
      teams: [makeTeam("human"), makeTeam("cpu", "ai"), makeTeam("other")],
      pools: { "league-loop": makePool("league-loop") },
    });

    const { result } = renderHook(() => useAuctionDraft());

    await act(async () => {
      await result.current.initAuction("league-loop", {
        nominationOrderSeed: seed,
        cpuShillCount: 0,
        bidIncrement: 1_000,
      });
    });
    const nominationPlayerId = result.current.session?.availablePlayerIds[0];
    const nominator = result.current.currentNominatorTeamId!;
    await act(async () => {
      await result.current.nominate(nominator, nominationPlayerId!, 5_000);
    });
    const openingAsk = result.current.session?.currentLot?.openingAsk;
    const playerId = result.current.session?.currentLot?.playerId;
    expect(openingAsk).toBeGreaterThan(0);
    expect(playerId).toEqual(expect.any(String));

    if (nominator === "cpu") {
      const challenger = result.current.currentBidderTeamId!;
      await act(async () => {
        await result.current.bid(challenger, openingAsk! + 1_000);
      });
    }

    while (result.current.currentBidderTeamId && result.current.currentBidderTeamId !== "cpu") {
      const bidder = result.current.currentBidderTeamId;
      await act(async () => {
        await result.current.pass(bidder!);
      });
    }

    expect(result.current.session?.state).toBe("OPEN_BIDDING");
    expect(result.current.currentBidderTeamId).toBe("cpu");
    expect(result.current.controlledCpuTeamIds).toContain("cpu");
    expect(result.current.session?.currentLot).toMatchObject({
      bidTurnTeamId: "cpu",
    });
    expect(result.current.session?.currentLot?.stillIn).toContain("cpu");

    await act(async () => {
      await result.current.pass("cpu");
    });

    while (result.current.session?.state === "OPEN_BIDDING" && result.current.currentBidderTeamId) {
      const bidder = result.current.currentBidderTeamId;
      await act(async () => {
        await result.current.pass(bidder);
      });
    }

    expect(result.current.session?.state).toBe("SOLD");
    expect(result.current.session?.results.at(-1)).toMatchObject({
      playerId,
      disposition: "SOLD",
      winnerTeamId: expect.any(String),
      salary: expect.any(Number),
    });

    await act(async () => {
      await result.current.advance();
    });

    expect(result.current.session?.state).toBe("NOMINATION");
    expect(result.current.session?.currentLot).toBeNull();
    expect(result.current.session?.results).toHaveLength(1);
  });

  test("DJ-03 initializes stable real-club CPU profiles and keeps market priorities coherent", async () => {
    const archetype = HISTORICAL_ARCHETYPES.find((candidate) => candidate.id === "murderers-row")!;
    const teamIds = ["human", "cpu", "blank"];
    const shillId = "__auction_shill__league-dj03-init__1";
    const seed = seedWithFirst([...teamIds, shillId], "human");
    const leagueTeams = [
      makeTeam("human"),
      makeTeam("cpu", "ai", { mlbArchetypeKey: archetype.id }),
      makeTeam("blank", "ai"),
    ];
    mockLeagueData({
      leagues: [makeLeague("league-dj03-init", teamIds)],
      teams: leagueTeams,
      pools: { "league-dj03-init": makePool("league-dj03-init") },
    });

    const { result } = renderHook(() => useAuctionDraft());

    await act(async () => {
      await result.current.initAuction("league-dj03-init", {
        nominationOrderSeed: seed,
        cpuShillCount: 1,
        bidIncrement: 1_000,
      });
    });

    const firstProfile = result.current.session?.cpuShills?.cpu;
    expect(firstProfile).toMatchObject({
      teamId: "cpu",
      archetypeId: archetype.id,
      bandPriorities: archetypeBandPriorities(archetype),
    });
    expect(firstProfile?.shillMaxWins).toBeUndefined();
    expect(firstProfile?.personalityBias).toBeUndefined();
    expect(firstProfile?.interestAggression).toBeUndefined();
    expect(firstProfile?.maxInterestProbability).toBeUndefined();
    expect(result.current.session?.cpuShills?.[shillId]?.shillMaxWins).toEqual(expect.any(Number));
    expect(result.current.session?.cpuShills?.blank?.bandPriorities).toEqual({
      Power: 1,
      Contact: 1,
      Speed: 1,
      Defense: 1,
      Rotation: 1,
      Bullpen: 1,
    });

    const marketMap = buildMarketBandPrioritiesByTeamId(leagueTeams);
    expect(marketMap.get("cpu")).toEqual(firstProfile?.bandPriorities);
    expect(marketMap.has("blank")).toBe(false);

    const nominator = result.current.currentNominatorTeamId;
    const nominationPlayer = result.current.session?.availablePlayerIds[0];
    expect(nominator).toEqual(expect.any(String));
    expect(nominationPlayer).toEqual(expect.any(String));
    await act(async () => {
      await result.current.nominate(nominator!, nominationPlayer!, 5_000);
    });

    const marketView = result.current.session
      ? buildLotViewFromSession(result.current.session, {
          shillTeamIds: new Set(result.current.shillTeamIds),
          advisedTeamId: null,
          bandPrioritiesByTeamId: marketMap,
          humanTeamIds: new Set(["human"]),
        })
      : null;
    const cpuBidder = marketView?.bidders.find((bidder) => bidder.teamId === "cpu");
    expect(cpuBidder?.bandPriorities).toEqual(firstProfile?.bandPriorities);
    expect(cpuBidder?.personality).toBeUndefined();

    await act(async () => {
      await result.current.initAuction("league-dj03-init", {
        nominationOrderSeed: seed,
        cpuShillCount: 1,
        bidIncrement: 1_000,
      });
    });

    expect(result.current.session?.cpuShills?.cpu).toEqual(firstProfile);
  });

  test("DJ-03 resumes legacy sessions by healing missing real-club profiles once", async () => {
    const archetype = HISTORICAL_ARCHETYPES.find((candidate) => candidate.id === "the-opener")!;
    const teamIds = ["human", "cpu"];
    const legacySession = initAuctionSession({
      teams: [
        { teamId: "human", budgetRemaining: 999_000, rosterSlotsRemaining: 22 },
        { teamId: "cpu", budgetRemaining: 888_000, rosterSlotsRemaining: 22 },
      ],
      players: [{
        playerId: "p1",
        iv: 50_000,
        ivPercentile: 100,
        pos: { isPitcher: false, position: "CF" },
      }],
      nominationOrder: teamIds,
      config: { nominationOrderSeed: seedWithFirst(teamIds, "human"), bidIncrement: 1_000 },
    }) as CpuShillAuctionSession;
    mockLeagueData({
      leagues: [makeLeague("league-dj03-heal", teamIds)],
      teams: [
        makeTeam("human"),
        makeTeam("cpu", "ai", { mlbArchetypeKey: archetype.id }),
      ],
      pools: { "league-dj03-heal": { ...makePool("league-dj03-heal", ["p1"]), locked: true } },
      players: [makePlayer("p1")],
    });
    await saveAuctionSession({
      id: createAuctionSessionId("league-dj03-heal", 1),
      leagueId: "league-dj03-heal",
      seasonNumber: 1,
      seed: legacySession.config.nominationOrderSeed,
      session: legacySession,
    });

    const { result } = renderHook(() => useAuctionDraft());

    await act(async () => {
      await result.current.loadAuction("league-dj03-heal");
    });

    const healedProfile = result.current.session?.cpuShills?.cpu;
    expect(healedProfile).toMatchObject({
      teamId: "cpu",
      archetypeId: archetype.id,
      bandPriorities: archetypeBandPriorities(archetype),
    });
    expect(result.current.session?.cpuShills?.human).toBeUndefined();
    const persisted = await getAuctionSession("league-dj03-heal");
    expect(persisted?.session.cpuShills?.cpu).toEqual(healedProfile);
    expect(persisted?.session.cpuShills?.human).toBeUndefined();

    await act(async () => {
      await result.current.loadAuction("league-dj03-heal");
    });

    expect(result.current.session?.cpuShills?.cpu).toEqual(healedProfile);
  });

  test("autosaves committed transitions after user actions", async () => {
    const teamIds = ["human", "other"];
    const seed = seedWithFirst(teamIds, "human");
    mockLeagueData({
      leagues: [makeLeague("league-save", teamIds)],
      teams: teamIds.map((id) => makeTeam(id)),
      pools: { "league-save": makePool("league-save") },
    });

    const { result } = renderHook(() => useAuctionDraft());

    await act(async () => {
      await result.current.initAuction("league-save", {
        nominationOrderSeed: seed,
        cpuShillCount: 0,
        bidIncrement: 1_000,
      });
    });
    const persisted = await getAuctionSession("league-save");
    expect(persisted?.session.state).toBe("NOMINATION");
    expect(persisted?.session.currentLot).toBeNull();

    const nominator = result.current.currentNominatorTeamId!;
    const playerId = result.current.session?.availablePlayerIds[0]!;
    await act(async () => {
      await result.current.nominate(nominator, playerId, 5_000);
    });
    const afterNomination = await getAuctionSession("league-save");
    expect(afterNomination?.session.state).toBe("OPEN_BIDDING");
    expect(afterNomination?.session.currentLot?.playerId).toBe(playerId);
  });

  test("uses the same setup seed to produce new session-derived MLB nomination order seeds", async () => {
    const teamIds = ["alpha", "bravo", "charlie"];
    const seed = "stable-auction-order";
    mockLeagueData({
      leagues: [makeLeague("league-seed-a", teamIds), makeLeague("league-seed-b", teamIds)],
      teams: teamIds.map((id) => makeTeam(id)),
      pools: {
        "league-seed-a": makePool("league-seed-a"),
        "league-seed-b": makePool("league-seed-b"),
      },
    });

    const { result } = renderHook(() => useAuctionDraft());

    await act(async () => {
      await result.current.initAuction("league-seed-a", {
        nominationOrderSeed: seed,
        cpuShillCount: 0,
      });
    });
    const firstOrder = result.current.session?.nominationOrder;
    const firstSeed = result.current.session?.config.nominationOrderSeed;
    const firstNonce = result.current.session?.sessionLaunchNonce;

    await act(async () => {
      await result.current.initAuction("league-seed-b", {
        nominationOrderSeed: seed,
        cpuShillCount: 0,
      });
    });

    expect(firstOrder).toBeDefined();
    expect(result.current.session?.config.nominationOrderSeed).not.toBe(firstSeed);
    expect(result.current.session?.sessionLaunchNonce).not.toBe(firstNonce);
    expect(result.current.session?.config.nominationOrderSeed).toContain(seed);
    expect(result.current.session?.config.nominationOrderSeed).toContain(createAuctionSessionId("league-seed-b", 1));
  });

  test("the committed opener wins when every rival lets the bid stand", async () => {
    const teamIds = ["human", "other"];
    const seed = seedWithFirst(teamIds, "human");
    mockLeagueData({
      leagues: [makeLeague("league-claim", teamIds)],
      teams: teamIds.map((id) => makeTeam(id)),
      pools: { "league-claim": makePool("league-claim") },
    });

    const { result } = renderHook(() => useAuctionDraft());

    await act(async () => {
      await result.current.initAuction("league-claim", {
        nominationOrderSeed: seed,
        cpuShillCount: 0,
        bidIncrement: 1_000,
      });
    });
    const nominator = result.current.currentNominatorTeamId!;
    const rival = teamIds.find((teamId) => teamId !== nominator)!;
    const playerId = result.current.session?.availablePlayerIds[0]!;
    await act(async () => {
      await result.current.nominate(nominator, playerId, 5_000);
    });
    await act(async () => {
      await result.current.pass(rival);
    });

    expect(result.current.session?.state).toBe("SOLD");
    expect(result.current.session?.results.at(-1)).toMatchObject({
      playerId,
      disposition: "SOLD",
      winnerTeamId: nominator,
      salary: 5_000,
    });
  });

  test("pauses on a CPU club's nomination instead of auto-surfacing a player", async () => {
    const teamIds = ["cpu-a", "cpu-b"];
    const seed = seedWithFirst(teamIds, "cpu-a");
    mockLeagueData({
      leagues: [makeLeague("league-cpu-claim", teamIds)],
      teams: [makeTeam("cpu-a", "ai"), makeTeam("cpu-b", "ai")],
      pools: { "league-cpu-claim": makePool("league-cpu-claim") },
    });

    const { result } = renderHook(() => useAuctionDraft());

    await act(async () => {
      await result.current.initAuction("league-cpu-claim", {
        nominationOrderSeed: seed,
        cpuShillCount: 0,
        bidIncrement: 1_000,
      });
    });
    expect(result.current.session?.state).toBe("NOMINATION");
    const nominator = result.current.currentNominatorTeamId!;
    const rival = teamIds.find((teamId) => teamId !== nominator)!;
    const playerId = result.current.session?.availablePlayerIds[0]!;
    expect(result.current.controlledCpuTeamIds).toContain(nominator);
    expect(result.current.session?.currentLot).toBeNull();

    await act(async () => {
      await result.current.nominate(nominator, playerId, 5_000);
    });
    await act(async () => {
      await result.current.pass(rival);
    });

    expect(result.current.session?.state).toBe("SOLD");
    expect(result.current.session?.results.at(-1)).toMatchObject({
      playerId,
      disposition: "SOLD",
      winnerTeamId: nominator,
      salary: 5_000,
    });
    expect(result.current.session?.teams.find((team) => team.teamId === nominator)).toMatchObject({
      rosterSlotsRemaining: 21,
      roster: [{ playerId, salary: 5_000 }],
    });
  });

  test("computes projected tax per surfaced lot, and TAXTEETH now reserves it in the bid cap", async () => {
    const teamIds = ["human", "other"];
    const seed = seedWithFirst(teamIds, "human");
    const caps: LuxuryCapRow[] = [
      {
        group: "hitters",
        stat: "CON",
        topN: 1,
        cap: 95,
        penaltyCurve: 1,
        penaltyPer100: 1_000_000,
        minAdder: 0,
      },
    ];
    const humanTeam: Team = {
      ...makeTeam("human"),
      capIdentity: {
        increase: ["POW"],
        decrease: ["CON"],
      },
    };
    const onPool: RegisteredPool = {
      ...makePool("league-on", ["on-fit", ...Array.from({ length: 79 }, (_, index) => `on-depth-${index}`)]),
      luxuryCaps: caps,
    };
    const offPool: RegisteredPool = {
      ...makePool("league-off", ["off-fit", ...Array.from({ length: 79 }, (_, index) => `off-depth-${index}`)]),
      luxuryCaps: caps,
    };

    mockLeagueData({
      leagues: [makeLeague("league-on", teamIds), makeLeague("league-off", teamIds)],
      teams: [humanTeam, makeTeam("other")],
      pools: {
        "league-on": onPool,
        "league-off": offPool,
      },
      players: [
        ...makePlayersForPool(onPool, { "on-fit": { power: 100, contact: 10 } }),
        ...makePlayersForPool(offPool, { "off-fit": { power: 10, contact: 100 } }),
      ],
    });

    const { result } = renderHook(() => useAuctionDraft());

    await act(async () => {
      await result.current.initAuction("league-on", {
        nominationOrderSeed: seed,
        cpuShillCount: 0,
        bidIncrement: 1_000,
      });
    });
    await act(async () => {
      await result.current.nominate(result.current.currentNominatorTeamId!, "on-fit", 5_000);
    });

    const onTax = result.current.session?.teams.find((team) => team.teamId === "human")?.projectedTax;
    const onMaxBid = result.current.session ? getTeamAuctionMaxBid(result.current.session, "human") : null;

    await act(async () => {
      await result.current.initAuction("league-off", {
        nominationOrderSeed: seed,
        cpuShillCount: 0,
        bidIncrement: 1_000,
      });
    });
    await act(async () => {
      await result.current.nominate(result.current.currentNominatorTeamId!, "off-fit", 5_000);
    });

    const offTax = result.current.session?.teams.find((team) => team.teamId === "human")?.projectedTax;
    const offMaxBid = result.current.session ? getTeamAuctionMaxBid(result.current.session, "human") : null;

    expect(result.current.session?.currentLot?.playerId).toBe("off-fit");
    expect(onTax).toBe(0);
    expect(offTax).toEqual(expect.any(Number));
    expect(offTax!).toBeGreaterThan(0);
    expect(onMaxBid).not.toBeNull();
    expect(offMaxBid).not.toBeNull();
    // TAXTEETH (JK ruling 2026-07-08, spec-docs/contracts/CONTRACT_TAXTEETH_2026-07-08.md)
    // supersedes the FABLE-C2B display-only ruling this test used to pin: the luxury tax must
    // actually drain budget, so the ceiling now reserves the marginal tax of winning THIS specific
    // candidate. Both pools are single-player (no `pos`), so this exercises the scalar fallback
    // path (auctionMaxBid's own tax argument), not the enriched completion-based path — and since
    // the human roster is empty on both sides, "full total" and "marginal" tax are identical here,
    // so offTax is exactly the reservation this assertion checks for.
    expect(offMaxBid!).toBe(onMaxBid! - offTax!);
  });

  test("TAXTEETH Item 3 -- the coherence proof: TRUE COST at a given price is exactly what settling at that price drains", async () => {
    // The honesty guarantee JK is buying: whatever the whisper's TRUE COST line would show for a
    // price (bid + marginal tax) must be EXACTLY what happens to the team's real budget once that
    // price actually wins. team.projectedTax, read here BEFORE the win, is computed by the same
    // auctionMarginalTaxWithCaps call LeagueBuilderAuctionDraft.tsx's own TRUE COST line uses
    // (same roster, same candidate, same capIdentity, same pool caps) -- so reading it off the
    // session IS reading what the whisper would display, without re-deriving the formula here.
    const teamIds = ["human", "other"];
    const seed = seedWithFirst(teamIds, "human");
    const caps: LuxuryCapRow[] = [
      {
        group: "hitters",
        stat: "CON",
        topN: 1,
        cap: 95,
        penaltyCurve: 1,
        penaltyPer100: 1_000_000,
        minAdder: 0,
      },
    ];
    const humanTeam: Team = {
      ...makeTeam("human"),
      capIdentity: { increase: ["POW"], decrease: ["CON"] },
    };
    const pool: RegisteredPool = {
      ...makePool("league-coherence", ["off-fit", ...Array.from({ length: 79 }, (_, index) => `coherence-depth-${index}`)]),
      luxuryCaps: caps,
    };
    mockLeagueData({
      leagues: [makeLeague("league-coherence", teamIds)],
      teams: [humanTeam, makeTeam("other")],
      pools: { "league-coherence": pool },
      players: makePlayersForPool(pool, { "off-fit": { power: 10, contact: 100 } }),
    });

    const { result } = renderHook(() => useAuctionDraft());
    await act(async () => {
      await result.current.initAuction("league-coherence", {
        nominationOrderSeed: seed,
        cpuShillCount: 0,
        bidIncrement: 1_000,
      });
    });
    const nominator = result.current.currentNominatorTeamId!;
    await act(async () => {
      await result.current.nominate(nominator, "off-fit", 5_000);
    });

    const budgetBefore = result.current.session?.teams.find((team) => team.teamId === "human")?.budgetRemaining;
    // THE TRUE COST tax component, as the whisper would compute and display it for this lot.
    const trueCostTax = result.current.session?.teams.find((team) => team.teamId === "human")?.projectedTax;
    expect(budgetBefore).toEqual(expect.any(Number));
    expect(trueCostTax).toBeGreaterThan(0);

    const bidPrice = nominator === "human"
      ? result.current.session?.currentLot?.openingAsk ?? 0
      : (result.current.session?.currentLot?.openingAsk ?? 0) + 1_000;
    expect(bidPrice).toBeGreaterThan(0);
    const trueCostShown = bidPrice + trueCostTax!; // what the whisper's TRUE COST line reads

    if (nominator !== "human") {
      await act(async () => {
        await result.current.bid("human", bidPrice);
      });
    }
    await act(async () => {
      await result.current.pass("other");
    });
    expect(result.current.session?.state).toBe("SOLD");
    expect(result.current.session?.results.at(-1)).toMatchObject({
      winnerTeamId: "human",
      salary: bidPrice,
    });
    const budgetAfter = result.current.session?.teams.find((team) => team.teamId === "human")?.budgetRemaining;

    // THE COHERENCE GUARANTEE: the actual budget drop equals TRUE COST exactly -- not salary
    // alone. toBeCloseTo(..., 8) absorbs only float subtraction-order noise (~1e-9), not any real
    // discrepancy -- the same tolerance auctionLuxuryTax.test.ts uses for this identical formula.
    expect(budgetBefore! - budgetAfter!).toBeCloseTo(trueCostShown, 8);
  });

  test("TAXTEETH back-compat: a mid-lot session saved before this change self-heals its stale projectedTax on load", async () => {
    // A pre-TAXTEETH save could carry ANY stale number in team.projectedTax -- the old full-total
    // recompute, or (older still) whatever normalizeTeam defaulted it to. This proves loadAuction
    // always overwrites it with a fresh marginal-tax read before any bid/ceiling logic runs, so a
    // mid-draft save from before this change loads and continues correctly rather than gating (or
    // settling) off a number that no longer means what it used to.
    const teamIds = ["human", "other"];
    const seed = seedWithFirst(teamIds, "human");
    const caps: LuxuryCapRow[] = [
      {
        group: "hitters",
        stat: "CON",
        topN: 1,
        cap: 95,
        penaltyCurve: 1,
        penaltyPer100: 1_000_000,
        minAdder: 0,
      },
    ];
    const humanTeam: Team = {
      ...makeTeam("human"),
      capIdentity: { increase: ["POW"], decrease: ["CON"] },
    };
    const pool: RegisteredPool = { ...makePool("league-backcompat", ["off-fit"]), luxuryCaps: caps };
    mockLeagueData({
      leagues: [makeLeague("league-backcompat", teamIds)],
      teams: [humanTeam, makeTeam("other")],
      pools: { "league-backcompat": pool },
      players: [makePlayer("off-fit", { power: 10, contact: 100 })],
    });

    // Build the mid-lot legacy session directly (the "crash-restore" shape other tests use), then
    // hand-corrupt team.projectedTax to a value the real formula would never produce -- standing
    // in for a stale pre-TAXTEETH save.
    const legacyInit = initAuctionSession({
      teams: [
        { teamId: "human", budgetRemaining: 900_000, rosterSlotsRemaining: 22 },
        { teamId: "other", budgetRemaining: 900_000, rosterSlotsRemaining: 22 },
      ],
      players: [{ playerId: "off-fit", iv: 90_000, ivPercentile: 90 }],
      nominationOrder: teamIds,
      config: { nominationOrderSeed: seed, bidIncrement: 1_000 },
    });
    const surfaced = surfaceNextPlayer(legacyInit);
    if (!surfaced.ok) throw new Error("test setup: surfaceNextPlayer rejected");
    const legacySession: CpuShillAuctionSession = {
      ...surfaced.session,
      teams: surfaced.session.teams.map((team) =>
        team.teamId === "human" ? { ...team, projectedTax: 999_999 } : team,
      ),
    } as CpuShillAuctionSession;
    expect(legacySession.currentLot?.playerId).toBe("off-fit");

    await saveAuctionSession({
      id: createAuctionSessionId("league-backcompat", 1),
      leagueId: "league-backcompat",
      seasonNumber: 1,
      seed,
      session: legacySession,
    });

    const { result } = renderHook(() => useAuctionDraft());
    await act(async () => {
      await result.current.loadAuction("league-backcompat");
    });

    const humanAfterLoad = result.current.session?.teams.find((team) => team.teamId === "human");
    // The stale 999,999 must be gone -- replaced by a fresh, finite, positive marginal tax read
    // (a lone off-archetype player alone breaches the CON=95 cap), proving loadAuction always
    // overwrites whatever a pre-TAXTEETH save carried before any bid/ceiling logic can read it.
    expect(humanAfterLoad?.projectedTax).not.toBe(999_999);
    expect(Number.isFinite(humanAfterLoad?.projectedTax)).toBe(true);
    expect(humanAfterLoad?.projectedTax).toBeGreaterThan(0);

    const ceiling = result.current.session ? getTeamAuctionMaxBid(result.current.session, "human") : null;
    expect(ceiling).not.toBeNull();
    expect(Number.isFinite(ceiling)).toBe(true);
    // The auction must still be able to continue: the minimum legal bid clears well inside the
    // healed ceiling.
    const minimumBid = result.current.session?.currentLot?.openingAsk ?? 0;
    expect(minimumBid).toBeLessThan(ceiling!);
    await act(async () => {
      await result.current.bid("human", minimumBid);
    });
    expect(result.current.error).toBeNull();
    expect(result.current.session?.currentLot?.highBid).toBe(minimumBid);
  });
});

// -----------------------------------------------------------------------------------------------
// FABLE-C3-FIX F3: the strand-safe transition helpers (pure — no hook render needed).
// -----------------------------------------------------------------------------------------------
import {
  auctionTransitionErrorCopy,
  auctionTransitionReasonCopy,
  strandSafeBidTransition,
  strandSafeClaimTransition,
} from "../useAuctionDraft";

describe("strand-safe CPU transitions (FABLE-C3-FIX F3)", () => {
  // A team at the 14-hitter ceiling bidding on ANOTHER hitter → 'bid-strands-roster'.
  const hitter = (pos: string, i: number): EnginePlayer => ({
    playerId: `h-${pos}-${i}`,
    iv: 10_000,
    ivPercentile: 50,
    pos: { isPitcher: false, position: pos, secondaryPosition: pos === "C" ? null : "IF" },
  });
  const arm = (role: string, i: number): EnginePlayer => ({
    playerId: `p-${role}-${i}`,
    iv: 10_000,
    ivPercentile: 50,
    pos: { isPitcher: true, position: "P", role },
  });

  function strandSession(): CpuShillAuctionSession {
    const rostered = [
      ...["C", "1B", "2B", "3B", "SS", "LF", "CF", "RF", "C", "1B", "2B", "3B", "SS", "LF"].map(hitter),
      ...["SP", "SP", "SP", "SP/RP", "RP", "RP"].map(arm),
    ];
    const lotHitter = hitter("CF", 99);
    const spareArms = [arm("RP", 98), arm("CP", 97)];
    const session = initAuctionSession({
      teams: [
        {
          teamId: "cpu-1",
          budgetRemaining: 500_000,
          rosterSlotsRemaining: 2,
          roster: rostered.map((p) => ({ playerId: p.playerId, salary: 5_000 })),
        },
        { teamId: "human-1", budgetRemaining: 500_000, rosterSlotsRemaining: 22 },
      ],
      players: [...rostered, lotHitter, ...spareArms],
      nominationOrder: ["cpu-1", "human-1"],
      config: { bidIncrement: 1_000, nominationOrderSeed: "f3-strand", flatReserveFloor: 2_000 },
    }) as CpuShillAuctionSession;
    return {
      ...session,
      state: "OPEN_BIDDING",
      availablePlayerIds: spareArms.map((p) => p.playerId),
      currentLot: {
        playerId: lotHitter.playerId,
        nominatorTeamId: "cpu-1",
        openingAsk: 2_000,
        highBid: null,
        highBidder: null,
        stillIn: ["cpu-1", "human-1"],
        bidTurnTeamId: "cpu-1",
        bidLog: [],
      },
    };
  }

  test("a CPU whose bid would strand PASSES instead of halting the draft", () => {
    const session = strandSession();
    const result = strandSafeBidTransition(session, "cpu-1", 2_000, true);
    expect(result.ok).toBe(true);
    if (result.ok) {
      // The CPU left the lot (its pass), the draft moves on — no throw upstream.
      expect(result.session.currentLot?.stillIn).not.toContain("cpu-1");
    }
  });

  test("a HUMAN keeps the rejection (UI feedback, never a silent pass)", () => {
    const session = strandSession();
    const result = strandSafeBidTransition(session, "cpu-1", 2_000, false);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("bid-strands-roster");
  });

  test("DJ-19 maps machine rejection reasons to GM-facing copy", () => {
    expect(auctionTransitionReasonCopy("bid-strands-roster")).toBe(
      "That bid would leave you unable to fill a legal roster.",
    );
    expect(auctionTransitionErrorCopy("Auction transition rejected: bid-strands-roster")).toBe(
      "That bid would leave you unable to fill a legal roster.",
    );
    expect(auctionTransitionErrorCopy("Farm auction transition rejected: bid-strands-roster")).toBe(
      "That bid would leave you unable to fill a legal roster.",
    );
  });

  test("other rejection reasons pass through untouched for CPUs too", () => {
    const session = strandSession();
    const result = strandSafeBidTransition(session, "cpu-1", 1, true); // below the opening ask
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.reason).toBe("bid-below-minimum");
  });

  test("a CPU lone-survivor claim that would strand passes out instead of throwing", () => {
    const base = strandSession();
    const session: CpuShillAuctionSession = {
      ...base,
      state: "RESOLVE",
      currentLot: { ...base.currentLot!, stillIn: ["cpu-1"], bidTurnTeamId: null },
      pendingClaim: { playerId: base.currentLot!.playerId, teamId: "cpu-1", price: 2_000 },
    };
    const result = strandSafeClaimTransition(session, true);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.session.results.at(-1)?.disposition).toBe("PASSED");
    }
  });
});
