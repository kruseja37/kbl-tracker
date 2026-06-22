import "fake-indexeddb/auto";

import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { getTeamAuctionMaxBid, seededNominationOrder } from "../../../../engines/auctionStateMachine";
import type { LuxuryCapRow } from "../../../../data/tierParams";
import {
  __resetLeagueBuilderDatabaseForTests,
  getAuctionSession,
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
import { useAuctionDraft } from "../useAuctionDraft";

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

function makeTeam(id: string, controlledBy: Team["controlledBy"] = "human"): Team {
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

function makePool(leagueId: string, playerIds = ["p1", "p2", "p3", "p4"]): RegisteredPool {
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
    .map((poolPlayer) => makePlayer(poolPlayer.id));
  const leagueData = {
    leagues: input.leagues,
    teams: input.teams,
    players,
    rulesPresets: [],
    isLoading: false,
    error: null,
    getRegisteredPool: vi.fn(async (leagueId: string) => input.pools[leagueId] ?? null),
    registerLeaguePool: vi.fn(async (leagueId: string) => input.pools[leagueId]),
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

  test("initializes a locked league into an engine-surfaced open lot and persists the session", async () => {
    const teamIds = ["human", "other"];
    const seed = seedWithFirst(teamIds, "human");
    mockLeagueData({
      leagues: [makeLeague("league-init", teamIds)],
      teams: teamIds.map((id) => makeTeam(id)),
      pools: { "league-init": makePool("league-init") },
    });

    const { result } = renderHook(() => useAuctionDraft());

    await act(async () => {
      await result.current.initAuction("league-init", {
        nominationOrderSeed: seed,
        cpuShillCount: 0,
        bidIncrement: 1_000,
      });
    });

    expect(result.current.session?.state).toBe("OPEN_BIDDING");
    expect(result.current.session?.availablePlayerIds).toHaveLength(3);
    expect(result.current.session?.currentLot?.playerId).toEqual(expect.any(String));
    expect(result.current.session?.config.nominationWeightExponent).toBe(2);
    expect(result.current.session?.players.p1.ivPercentile).toBe(100);
    expect(result.current.session?.teams.map((team) => team.projectedTax)).toEqual([0, 0]);

    const persisted = await getAuctionSession("league-init");
    expect(persisted?.session.state).toBe("OPEN_BIDDING");
    expect(persisted?.session.currentLot?.playerId).toBe(result.current.session?.currentLot?.playerId);
    expect(persisted?.session.config.nominationOrderSeed).toBe(seed);
  });

  test("drives engine-surfaced lot to bids to SOLD while a CPU team auto-acts", async () => {
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
    const openingAsk = result.current.session?.currentLot?.openingAsk;
    const playerId = result.current.session?.currentLot?.playerId;
    expect(openingAsk).toBeGreaterThan(0);
    expect(playerId).toEqual(expect.any(String));

    await act(async () => {
      await result.current.bid("human", openingAsk!);
    });
    expect(result.current.session?.nominationOrder).toEqual(["human", "other", "cpu"]);
    expect(result.current.currentBidderTeamId).toBe("other");
    expect(result.current.session?.currentLot).toMatchObject({
      highBidder: "human",
      bidTurnTeamId: "other",
      stillIn: ["human", "cpu", "other"],
    });

    await act(async () => {
      await result.current.pass("other");
    });

    expect(result.current.session?.state).toBe("SOLD");
    expect(result.current.session?.results.at(-1)).toMatchObject({
      playerId,
      disposition: "SOLD",
      winnerTeamId: "human",
      salary: openingAsk,
    });

    await act(async () => {
      await result.current.advance();
    });

    expect(result.current.session?.state).toBe("OPEN_BIDDING");
    expect(result.current.session?.currentLot?.playerId).not.toBe(playerId);
    expect(result.current.session?.results).toHaveLength(1);
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
    expect(persisted?.session.state).toBe("OPEN_BIDDING");
    expect(persisted?.session.currentLot?.playerId).toBe(result.current.session?.currentLot?.playerId);
  });

  test("uses the same seed to produce the same nomination order", async () => {
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

    await act(async () => {
      await result.current.initAuction("league-seed-b", {
        nominationOrderSeed: seed,
        cpuShillCount: 0,
      });
    });

    expect(result.current.session?.nominationOrder).toEqual(firstOrder);
  });

  test("lone survivor requires claimAtReserve and sells at reserve", async () => {
    const teamIds = ["human", "other"];
    const seed = seedWithFirst(teamIds, "human");
    mockLeagueData({
      leagues: [makeLeague("league-claim", teamIds)],
      teams: teamIds.map((id) => makeTeam(id)),
      pools: { "league-claim": makePool("league-claim", ["p1"]) },
    });

    const { result } = renderHook(() => useAuctionDraft());

    await act(async () => {
      await result.current.initAuction("league-claim", {
        nominationOrderSeed: seed,
        cpuShillCount: 0,
        bidIncrement: 1_000,
      });
    });
    const reserve = result.current.session?.currentLot?.openingAsk;
    const playerId = result.current.session?.currentLot?.playerId;
    await act(async () => {
      await result.current.pass("other");
    });

    expect(result.current.session?.state).toBe("RESOLVE");
    expect(result.current.session?.pendingClaim).toMatchObject({ teamId: "human", price: reserve });

    await act(async () => {
      await result.current.claimAtReserve();
    });

    expect(result.current.session?.state).toBe("SOLD");
    expect(result.current.session?.results.at(-1)).toMatchObject({
      playerId,
      disposition: "SOLD",
      winnerTeamId: "human",
      salary: reserve,
    });
  });

  test("CPU lone survivor auto-claims at reserve and fills a roster slot", async () => {
    const teamIds = ["human", "cpu"];
    const seed = seedWithFirst(teamIds, "human");
    mockLeagueData({
      leagues: [makeLeague("league-cpu-claim", teamIds)],
      teams: [makeTeam("human"), makeTeam("cpu", "ai")],
      pools: { "league-cpu-claim": makePool("league-cpu-claim", ["p1"]) },
    });

    const { result } = renderHook(() => useAuctionDraft());

    await act(async () => {
      await result.current.initAuction("league-cpu-claim", {
        nominationOrderSeed: seed,
        cpuShillCount: 0,
        bidIncrement: 1_000,
      });
    });
    const reserve = result.current.session?.currentLot?.openingAsk;
    const playerId = result.current.session?.currentLot?.playerId;

    await act(async () => {
      await result.current.pass("human");
    });

    expect(result.current.session?.state).toBe("SOLD");
    expect(result.current.session?.results.at(-1)).toMatchObject({
      playerId,
      disposition: "SOLD",
      winnerTeamId: "cpu",
      salary: reserve,
    });
    expect(result.current.session?.teams.find((team) => team.teamId === "cpu")).toMatchObject({
      rosterSlotsRemaining: 21,
      roster: [{ playerId, salary: reserve }],
    });
  });

  test("applies pool luxury caps per surfaced lot so off-archetype max bid is reduced", async () => {
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
      ...makePool("league-on", ["on-fit"]),
      luxuryCaps: caps,
    };
    const offPool: RegisteredPool = {
      ...makePool("league-off", ["off-fit"]),
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
        makePlayer("on-fit", { power: 100, contact: 10 }),
        makePlayer("off-fit", { power: 10, contact: 100 }),
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

    const onTax = result.current.session?.teams.find((team) => team.teamId === "human")?.projectedTax;
    const onMaxBid = result.current.session ? getTeamAuctionMaxBid(result.current.session, "human") : null;

    await act(async () => {
      await result.current.initAuction("league-off", {
        nominationOrderSeed: seed,
        cpuShillCount: 0,
        bidIncrement: 1_000,
      });
    });

    const offTax = result.current.session?.teams.find((team) => team.teamId === "human")?.projectedTax;
    const offMaxBid = result.current.session ? getTeamAuctionMaxBid(result.current.session, "human") : null;

    expect(result.current.session?.currentLot?.playerId).toBe("off-fit");
    expect(onTax).toBe(0);
    expect(offTax).toEqual(expect.any(Number));
    expect(offTax!).toBeGreaterThan(0);
    expect(onMaxBid).not.toBeNull();
    expect(offMaxBid).not.toBeNull();
    expect(offMaxBid!).toBeLessThan(onMaxBid!);
  });
});
