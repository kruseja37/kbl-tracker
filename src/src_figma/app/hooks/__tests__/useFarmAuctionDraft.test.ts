import "fake-indexeddb/auto";

import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { initAuctionSession, seededNominationOrder } from "../../../../engines/auctionStateMachine";
import { LEAGUE_MINIMUM_SALARY } from "../../../../data/rosterEngineConstants";
import type { CpuShillAuctionSession } from "../../../../engines/cpuShillBidding";
import { FARM_AUCTION_ROSTER_SLOTS_PER_TEAM } from "../../../../utils/farmAuctionPool";
import {
  __resetLeagueBuilderDatabaseForTests,
  createAuctionSessionId,
  createFarmAuctionSessionId,
  getAuctionSession,
  getAuctionSessionById,
  saveScoutProfile,
  saveAuctionSession,
} from "../../../../utils/leagueBuilderStorage";
import {
  useLeagueBuilderData,
  type LeagueTemplate,
  type Team,
  type TeamRoster,
  type UseLeagueBuilderDataReturn,
} from "../../../hooks/useLeagueBuilderData";
import { useFarmAuctionDraft } from "../useFarmAuctionDraft";

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

function makeRoster(teamId: string, farmRoster: string[] = []): TeamRoster {
  return {
    teamId,
    mlbRoster: [],
    farmRoster,
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

function makeRosterWithMlb(teamId: string, mlbRoster: string[], farmRoster: string[] = []): TeamRoster {
  return {
    ...makeRoster(teamId, farmRoster),
    mlbRoster,
  };
}

function seedWithOrder(teamIds: string[], expectedOrder: string[]): string {
  const seed = Array.from({ length: 5_000 }, (_, index) => `farm-auction-seed-${index}`).find(
    (candidate) => {
      const order = seededNominationOrder(teamIds, candidate);
      return expectedOrder.every((teamId, index) => order[index] === teamId);
    },
  );
  if (!seed) throw new Error(`No seed found for order ${expectedOrder.join(",")}`);
  return seed;
}

function mockLeagueData(input: {
  leagues: LeagueTemplate[];
  teams: Team[];
  rosters?: Record<string, TeamRoster>;
  players?: UseLeagueBuilderDataReturn["players"];
}) {
  const leagueData = {
    leagues: input.leagues,
    teams: input.teams,
    players: input.players ?? [],
    rulesPresets: [],
    isLoading: false,
    error: null,
    getRoster: vi.fn(async (teamId: string) => input.rosters?.[teamId] ?? makeRoster(teamId)),
    refresh: vi.fn(async () => undefined),
  } as unknown as UseLeagueBuilderDataReturn;

  vi.mocked(useLeagueBuilderData).mockReturnValue(leagueData);
  return leagueData;
}

function buildMlbSession(seed: string): CpuShillAuctionSession {
  return initAuctionSession({
    teams: [{ teamId: "human", budgetRemaining: 1_000_000, rosterSlotsRemaining: 1 }],
    players: [{ playerId: "mlb-player", iv: 100_000, ivPercentile: 100 }],
    config: {
      nominationOrderSeed: seed,
      bidIncrement: 1_000,
      cpuShillCount: 0,
      turnTimerSeconds: null,
      excludeFromLeague: true,
    },
  }) as CpuShillAuctionSession;
}

function buildMlbSessionWithBudgets(
  seed: string,
  teamBudgets: Record<string, number>,
  state: CpuShillAuctionSession["state"] = "AUCTION_COMPLETE",
): CpuShillAuctionSession {
  const teamIds = Object.keys(teamBudgets);
  const session = initAuctionSession({
    teams: teamIds.map((teamId) => ({
      teamId,
      budgetRemaining: 1_000_000,
      rosterSlotsRemaining: 1,
      minSalary: LEAGUE_MINIMUM_SALARY,
    })),
    players: [{ playerId: `${seed}-mlb-player`, iv: 100_000, ivPercentile: 100 }],
    nominationOrder: teamIds,
    config: {
      nominationOrderSeed: seed,
      bidIncrement: 1_000,
      cpuShillCount: 0,
      turnTimerSeconds: null,
      excludeFromLeague: true,
    },
  }) as CpuShillAuctionSession;

  return {
    ...session,
    state,
    teams: session.teams.map((team) => ({
      ...team,
      budgetRemaining: teamBudgets[team.teamId] ?? team.budgetRemaining,
    })),
  };
}

function sessionAuctionPlayers(session: CpuShillAuctionSession) {
  return session.playerOrder.map((playerId) => session.players[playerId]);
}

async function seedScoutProfile(leagueId: string, teamId: string): Promise<void> {
  await saveScoutProfile({
    id: `${leagueId}-${teamId}-scout`,
    leagueId,
    teamId,
    name: `${teamId.toUpperCase()} Scout`,
    specialties: teamId === "human" ? ["outfield"] : ["pitching"],
    weaknesses: teamId === "human" ? ["CP"] : ["1B"],
    accuracyByPosition: { CF: 84, SP: 80, CP: 55, "1B": 64 },
    seed: `${leagueId}:${teamId}:scout`,
    createdDate: "2026-01-01",
    lastModified: "2026-01-01",
  });
}

describe("useFarmAuctionDraft", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    __resetLeagueBuilderDatabaseForTests();
    await deleteDatabase(DB_NAME).catch(() => undefined);
  });

  afterEach(async () => {
    __resetLeagueBuilderDatabaseForTests();
    await deleteDatabase(DB_NAME).catch(() => undefined);
  });

  test("initializes a locked league into an engine-surfaced farm lot with flat-floor reserve", async () => {
    const teamIds = ["human", "cpu"];
    const seed = seedWithOrder(teamIds, ["human", "cpu"]);
    mockLeagueData({
      leagues: [makeLeague("farm-init", teamIds)],
      teams: [makeTeam("human"), makeTeam("cpu", "ai")],
      rosters: {
        human: makeRoster("human", ["existing-farm-a", "existing-farm-b"]),
        cpu: makeRoster("cpu"),
      },
    });

    const { result } = renderHook(() => useFarmAuctionDraft());

    await act(async () => {
      await result.current.initFarmAuction("farm-init", {
        nominationOrderSeed: seed,
        cpuShillCount: 0,
        bidIncrement: 1_000,
      });
    });

    expect(result.current.session?.state).toBe("OPEN_BIDDING");
    expect(result.current.session?.availablePlayerIds).toHaveLength(
      teamIds.length * FARM_AUCTION_ROSTER_SLOTS_PER_TEAM * 3 - 1,
    );
    expect(result.current.session?.currentLot?.playerId).toEqual(expect.any(String));
    expect(result.current.session?.currentLot?.openingAsk).toBe(LEAGUE_MINIMUM_SALARY);
    expect(result.current.session?.config.nominationWeightExponent).toBe(3);
    expect(result.current.session?.config.flatReserveFloor).toBe(LEAGUE_MINIMUM_SALARY);
    expect(result.current.session?.teams.find((team) => team.teamId === "human")).toMatchObject({
      rosterSlotsRemaining: FARM_AUCTION_ROSTER_SLOTS_PER_TEAM - 2,
      roster: [],
    });
    expect(result.current.session?.teams.find((team) => team.teamId === "cpu")).toMatchObject({
      rosterSlotsRemaining: FARM_AUCTION_ROSTER_SLOTS_PER_TEAM,
      roster: [],
    });
    const budgets = result.current.session?.teams.map((team) => team.budgetRemaining) ?? [];
    expect(budgets[0]).toBeGreaterThan(0);
    expect(budgets[1]).toBe(budgets[0]);

    const persisted = await getAuctionSessionById(createFarmAuctionSessionId("farm-init"));
    expect(persisted?.session.state).toBe("OPEN_BIDDING");
    expect(persisted?.session.currentLot?.openingAsk).toBe(LEAGUE_MINIMUM_SALARY);
    await expect(getAuctionSession("farm-init")).resolves.toBeNull();
  });

  test("seeds farm wallets with each team's own completed MLB unspent budget carryover", async () => {
    const teamIds = ["human", "cpu"];
    const leagueId = "farm-carryover-complete";
    const seed = seedWithOrder(teamIds, ["human", "cpu"]);
    mockLeagueData({
      leagues: [makeLeague(leagueId, teamIds)],
      teams: [makeTeam("human"), makeTeam("cpu", "ai")],
    });
    await saveAuctionSession({
      id: createAuctionSessionId(leagueId),
      leagueId,
      seasonNumber: 1,
      seed: "mlb-complete-carryover",
      session: buildMlbSessionWithBudgets("mlb-complete-carryover", {
        human: 120_000,
        cpu: 40_000,
      }),
    });

    const { result } = renderHook(() => useFarmAuctionDraft());

    await act(async () => {
      await result.current.initFarmAuction(leagueId, {
        nominationOrderSeed: seed,
        cpuShillCount: 0,
        bidIncrement: 1_000,
      });
    });

    const farmTierCap = result.current.farmTierCap!;
    const humanBudget = result.current.session?.teams.find((team) => team.teamId === "human")?.budgetRemaining;
    const cpuBudget = result.current.session?.teams.find((team) => team.teamId === "cpu")?.budgetRemaining;

    expect(humanBudget).toBe(farmTierCap + 60_000);
    expect(cpuBudget).toBe(farmTierCap + 20_000);
    expect((humanBudget ?? 0) - (cpuBudget ?? 0)).toBe(40_000);

    const persisted = await getAuctionSessionById(createFarmAuctionSessionId(leagueId));
    expect(persisted?.session.teams.find((team) => team.teamId === "human")?.budgetRemaining)
      .toBe(farmTierCap + 60_000);
    expect(persisted?.session.teams.find((team) => team.teamId === "cpu")?.budgetRemaining)
      .toBe(farmTierCap + 20_000);
  });

  test("does not carry MLB leftovers when the MLB auction row is missing or incomplete", async () => {
    const teamIds = ["human", "cpu"];
    const seed = seedWithOrder(teamIds, ["human", "cpu"]);
    const missingLeagueId = "farm-carryover-missing";
    const incompleteLeagueId = "farm-carryover-incomplete";
    mockLeagueData({
      leagues: [
        makeLeague(missingLeagueId, teamIds),
        makeLeague(incompleteLeagueId, teamIds),
      ],
      teams: [makeTeam("human"), makeTeam("cpu", "ai")],
    });

    const { result } = renderHook(() => useFarmAuctionDraft());

    await act(async () => {
      await result.current.initFarmAuction(missingLeagueId, {
        nominationOrderSeed: seed,
        cpuShillCount: 0,
        bidIncrement: 1_000,
      });
    });

    const missingFarmTierCap = result.current.farmTierCap!;
    expect(result.current.session?.teams.map((team) => team.budgetRemaining)).toEqual([
      missingFarmTierCap,
      missingFarmTierCap,
    ]);

    await saveAuctionSession({
      id: createAuctionSessionId(incompleteLeagueId),
      leagueId: incompleteLeagueId,
      seasonNumber: 1,
      seed: "mlb-incomplete-carryover",
      session: buildMlbSessionWithBudgets("mlb-incomplete-carryover", {
        human: 120_000,
        cpu: 40_000,
      }, "NOMINATION"),
    });

    await act(async () => {
      await result.current.initFarmAuction(incompleteLeagueId, {
        nominationOrderSeed: seed,
        cpuShillCount: 0,
        bidIncrement: 1_000,
      });
    });

    const incompleteFarmTierCap = result.current.farmTierCap!;
    expect(result.current.session?.teams.map((team) => team.budgetRemaining)).toEqual([
      incompleteFarmTierCap,
      incompleteFarmTierCap,
    ]);
  });

  test("exposes derived MLB roster chemistry counts without persisting them into the farm auction session", async () => {
    const teamIds = ["human", "cpu"];
    const seed = seedWithOrder(teamIds, ["human", "cpu"]);
    mockLeagueData({
      leagues: [makeLeague("farm-chemistry", teamIds)],
      teams: [makeTeam("human"), makeTeam("cpu", "ai")],
      rosters: {
        human: makeRosterWithMlb("human", ["mlb-spi-1", "mlb-spi-2", "mlb-dis", "missing-player"], ["farm-cra"]),
        cpu: makeRosterWithMlb("cpu", ["mlb-legacy-fiery"]),
      },
      players: [
        { id: "mlb-spi-1", chemistry: "Spirited" },
        { id: "mlb-spi-2", chemistry: "SPI" },
        { id: "mlb-dis", chemistry: "Disciplined" },
        { id: "farm-cra", chemistry: "Crafty" },
        { id: "mlb-legacy-fiery", chemistry: "FIERY" },
      ] as unknown as UseLeagueBuilderDataReturn["players"],
    });

    const { result } = renderHook(() => useFarmAuctionDraft());

    await act(async () => {
      await result.current.initFarmAuction("farm-chemistry", {
        nominationOrderSeed: seed,
        cpuShillCount: 0,
        bidIncrement: 1_000,
      });
    });

    expect(result.current.mlbRosterChemistryByTeamId).toEqual({
      human: { SPI: 2, DIS: 1 },
      cpu: { CMP: 1 },
    });

    const persisted = await getAuctionSessionById(createFarmAuctionSessionId("farm-chemistry"));
    expect(persisted?.session.teams.find((team) => team.teamId === "human")).not.toHaveProperty(
      "mlbRosterChemistry",
    );
    expect(persisted?.session.teams.find((team) => team.teamId === "cpu")).not.toHaveProperty(
      "mlbRosterChemistry",
    );
  });

  test("drives engine-surfaced farm lot to bids to SOLD while a CPU farm team auto-acts", async () => {
    const teamIds = ["human", "other", "cpu"];
    const seed = seedWithOrder(teamIds, ["human", "other", "cpu"]);
    mockLeagueData({
      leagues: [makeLeague("farm-loop", teamIds)],
      teams: [makeTeam("human"), makeTeam("other"), makeTeam("cpu", "ai")],
    });

    const { result } = renderHook(() => useFarmAuctionDraft());

    await act(async () => {
      await result.current.initFarmAuction("farm-loop", {
        nominationOrderSeed: seed,
        cpuShillCount: 0,
        bidIncrement: 1_000,
      });
    });

    const playerId = result.current.session?.currentLot?.playerId;
    const openingAsk = result.current.session?.currentLot?.openingAsk;
    expect(openingAsk).toBe(LEAGUE_MINIMUM_SALARY);

    await act(async () => {
      await result.current.bid("human", openingAsk!);
    });
    expect(result.current.currentBidderTeamId).toBe("other");

    await act(async () => {
      await result.current.pass("other");
    });
    if (result.current.session?.state === "OPEN_BIDDING" && result.current.currentBidderTeamId === "human") {
      await act(async () => {
        await result.current.pass("human");
      });
    }

    expect(result.current.cpuTeamIds).toEqual(["cpu"]);
    expect(result.current.session?.state).toBe("SOLD");
    expect(result.current.session?.results.at(-1)).toMatchObject({
      playerId,
      disposition: "SOLD",
    });

    const soldResult = result.current.session?.results.at(-1);
    const winner = result.current.session?.teams.find((team) => team.teamId === soldResult?.winnerTeamId);
    expect(winner?.roster).toContainEqual({ playerId, salary: soldResult?.salary });

    await act(async () => {
      await result.current.advance();
    });

    expect(result.current.session?.state).toBe("OPEN_BIDDING");
    expect(result.current.session?.currentLot?.playerId).not.toBe(playerId);
    expect(result.current.session?.currentLot?.openingAsk).toBe(LEAGUE_MINIMUM_SALARY);
  });

  test("autosaves under the farm namespace, resumes by farm id, and does not clobber the MLB auction row", async () => {
    const teamIds = ["human", "other"];
    const seed = seedWithOrder(teamIds, ["human", "other"]);
    const leagueId = "farm-persist";
    mockLeagueData({
      leagues: [makeLeague(leagueId, teamIds)],
      teams: [makeTeam("human"), makeTeam("other")],
    });
    await saveAuctionSession({
      id: createAuctionSessionId(leagueId),
      leagueId,
      seasonNumber: 1,
      seed: "mlb-seed",
      session: buildMlbSession("mlb-seed"),
    });

    const { result } = renderHook(() => useFarmAuctionDraft());

    await act(async () => {
      await result.current.initFarmAuction(leagueId, {
        nominationOrderSeed: seed,
        cpuShillCount: 0,
        bidIncrement: 1_000,
      });
    });
    const playerId = result.current.session?.currentLot?.playerId;

    const farmRow = await getAuctionSessionById(createFarmAuctionSessionId(leagueId));
    expect(farmRow?.id).toBe(createFarmAuctionSessionId(leagueId));
    expect(farmRow?.session.state).toBe("OPEN_BIDDING");
    expect(farmRow?.session.currentLot?.playerId).toBe(playerId);

    const mlbRow = await getAuctionSession(leagueId);
    expect(mlbRow?.id).toBe(createAuctionSessionId(leagueId));
    expect(mlbRow?.session.config.nominationOrderSeed).toBe("mlb-seed");

    const { result: resumed } = renderHook(() => useFarmAuctionDraft());
    await act(async () => {
      await resumed.current.loadFarmAuction(leagueId);
    });

    expect(resumed.current.session?.state).toBe("OPEN_BIDDING");
    expect(resumed.current.session?.currentLot?.playerId).toBe(playerId);
    expect(resumed.current.activeLeagueId).toBe(leagueId);
  });

  test("uses the same seed to produce the same farm pool and nomination order", async () => {
    const teamIds = ["alpha", "bravo", "charlie"];
    const seed = "stable-farm-auction-order";
    mockLeagueData({
      leagues: [makeLeague("farm-seed", teamIds)],
      teams: teamIds.map((teamId) => makeTeam(teamId)),
    });

    const { result } = renderHook(() => useFarmAuctionDraft());

    await act(async () => {
      await result.current.initFarmAuction("farm-seed", {
        nominationOrderSeed: seed,
        cpuShillCount: 0,
      });
    });
    const firstOrder = result.current.session?.nominationOrder;
    const firstPlayerOrder = result.current.session?.playerOrder;
    const firstPlayers = result.current.session?.players;

    await act(async () => {
      await result.current.initFarmAuction("farm-seed", {
        nominationOrderSeed: seed,
        cpuShillCount: 0,
      });
    });

    expect(result.current.session?.nominationOrder).toEqual(firstOrder);
    expect(result.current.session?.playerOrder).toEqual(firstPlayerOrder);
    expect(result.current.session?.players).toEqual(firstPlayers);
  });

  test("falls back to regenerating the farm pool for legacy saved rows without a pool", async () => {
    const teamIds = ["human", "other"];
    const leagueId = "farm-legacy-resume-pool";
    const seed = seedWithOrder(teamIds, ["human", "other"]);
    mockLeagueData({
      leagues: [makeLeague(leagueId, teamIds)],
      teams: [makeTeam("human"), makeTeam("other")],
    });

    const { result, unmount } = renderHook(() => useFarmAuctionDraft());

    await act(async () => {
      await result.current.initFarmAuction(leagueId, {
        nominationOrderSeed: seed,
        cpuShillCount: 0,
        bidIncrement: 1_000,
      });
    });

    const initializedPool = result.current.pool;
    const expectedFarmTierCap = result.current.farmTierCap;
    expect(initializedPool?.prospects.length).toBeGreaterThan(0);

    const farmRow = await getAuctionSessionById(createFarmAuctionSessionId(leagueId));
    expect(farmRow?.pool).toBeDefined();
    await saveAuctionSession({
      id: createFarmAuctionSessionId(leagueId),
      leagueId,
      seasonNumber: 1,
      seed: farmRow!.seed,
      session: farmRow!.session,
    });
    unmount();
    const legacyRow = await getAuctionSessionById(createFarmAuctionSessionId(leagueId));
    expect(legacyRow?.pool).toBeUndefined();

    const { result: resumed, unmount: unmountResumed } = renderHook(() => useFarmAuctionDraft());
    await act(async () => {
      await resumed.current.loadFarmAuction(leagueId);
    });

    expect(resumed.current.pool).not.toBeNull();
    expect(resumed.current.pool?.prospects.length).toBeGreaterThan(0);
    expect(resumed.current.pool?.prospects).toEqual(initializedPool?.prospects);
    expect(resumed.current.pool?.auctionPlayers).toEqual(sessionAuctionPlayers(resumed.current.session!));
    expect(resumed.current.pool?.auctionPlayers.map((player) => player.playerId)).toEqual(legacyRow?.session.playerOrder);
    expect(resumed.current.farmTierCap).toBe(expectedFarmTierCap);
    unmountResumed();
  });

  test("persists the generated farm pool and loads the saved DTO pool on resume", async () => {
    const teamIds = ["human", "other"];
    const leagueId = "farm-resume-pool";
    const seed = seedWithOrder(teamIds, ["human", "other"]);
    mockLeagueData({
      leagues: [makeLeague(leagueId, teamIds)],
      teams: [makeTeam("human"), makeTeam("other")],
    });
    await Promise.all(teamIds.map((teamId) => seedScoutProfile(leagueId, teamId)));

    const { result, unmount } = renderHook(() => useFarmAuctionDraft());

    await act(async () => {
      await result.current.initFarmAuction(leagueId, {
        nominationOrderSeed: seed,
        cpuShillCount: 0,
        bidIncrement: 1_000,
      });
    });

    const initializedPool = result.current.pool;
    const initializedSession = result.current.session;
    expect(initializedPool).not.toBeNull();
    expect(initializedSession).not.toBeNull();
    expect(result.current.scoutsByTeamId).toEqual({
      human: expect.objectContaining({ scoutId: `${leagueId}-human-scout`, scoutName: "HUMAN Scout" }),
      other: expect.objectContaining({ scoutId: `${leagueId}-other-scout`, scoutName: "OTHER Scout" }),
    });
    expect(result.current.farmTierCap).toEqual(expect.any(Number));
    expect(result.current.farmTierCap).toBeGreaterThan(0);
    expect(initializedPool?.auctionPlayers).toEqual(sessionAuctionPlayers(initializedSession!));
    const expectedScoutsByTeamId = result.current.scoutsByTeamId;
    const expectedFarmTierCap = result.current.farmTierCap;

    const originalAuctionPlayers = initializedPool!.auctionPlayers.map((player) => ({ ...player }));
    expect(initializedPool!.prospects).toHaveLength(originalAuctionPlayers.length);
    expect(new Set(initializedPool!.prospects.map((prospect) => prospect.id))).toEqual(
      new Set(originalAuctionPlayers.map((player) => player.playerId)),
    );
    expect(initializedPool!.prospects.slice(0, 5)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: originalAuctionPlayers[0].playerId,
          firstName: expect.any(String),
          lastName: expect.any(String),
          primaryPosition: expect.any(String),
        }),
      ]),
    );

    const persisted = await getAuctionSessionById(createFarmAuctionSessionId(leagueId));
    expect(persisted?.session.playerOrder).toEqual(originalAuctionPlayers.map((player) => player.playerId));
    expect(sessionAuctionPlayers(persisted!.session)).toEqual(originalAuctionPlayers);
    expect(persisted?.pool?.prospects.length).toBeGreaterThan(0);
    expect(persisted?.pool).toEqual(initializedPool);
    unmount();

    const savedPool = persisted!.pool!;
    const sentinelPool = {
      ...savedPool,
      prospects: savedPool.prospects.map((prospect, index) => index === 0
        ? {
            ...prospect,
            prospectProfile: {
              ...prospect.prospectProfile,
              scoutName: "Persisted Sentinel Scout",
            },
          }
        : prospect),
    };
    await saveAuctionSession({
      id: createFarmAuctionSessionId(leagueId),
      leagueId,
      seasonNumber: 1,
      seed: persisted!.seed,
      session: persisted!.session,
      pool: sentinelPool,
    });
    const persistedWithSentinel = await getAuctionSessionById(createFarmAuctionSessionId(leagueId));
    expect(persistedWithSentinel?.pool?.prospects[0].prospectProfile.scoutName).toBe("Persisted Sentinel Scout");

    const { result: resumed, unmount: unmountResumed } = renderHook(() => useFarmAuctionDraft());
    await act(async () => {
      await resumed.current.loadFarmAuction(leagueId);
    });

    expect(resumed.current.pool?.prospects).toEqual(persistedWithSentinel?.pool?.prospects);
    expect(resumed.current.pool?.auctionPlayers).toEqual(persistedWithSentinel?.pool?.auctionPlayers);
    expect(resumed.current.pool?.auctionPlayers).toEqual(sessionAuctionPlayers(resumed.current.session!));
    expect(resumed.current.session?.playerOrder).toEqual(originalAuctionPlayers.map((player) => player.playerId));
    expect(resumed.current.scoutsByTeamId).toEqual(expectedScoutsByTeamId);
    expect(resumed.current.farmTierCap).toBe(expectedFarmTierCap);
    unmountResumed();
  });
});
