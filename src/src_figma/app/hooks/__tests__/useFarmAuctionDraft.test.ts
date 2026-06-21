import "fake-indexeddb/auto";

import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { initAuctionSession, seededNominationOrder } from "../../../../engines/auctionStateMachine";
import type { CpuShillAuctionSession } from "../../../../engines/cpuShillBidding";
import { FARM_AUCTION_ROSTER_SLOTS_PER_TEAM } from "../../../../utils/farmAuctionPool";
import {
  __resetLeagueBuilderDatabaseForTests,
  createAuctionSessionId,
  createFarmAuctionSessionId,
  getAuctionSession,
  getAuctionSessionById,
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
}) {
  const leagueData = {
    leagues: input.leagues,
    teams: input.teams,
    players: [],
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

  test("initializes a locked league into NOMINATION using the farm pool, 10-slot rosters, and farm cap budgets", async () => {
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

    expect(result.current.session?.state).toBe("NOMINATION");
    expect(result.current.session?.availablePlayerIds).toHaveLength(
      teamIds.length * FARM_AUCTION_ROSTER_SLOTS_PER_TEAM * 3,
    );
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
    expect(persisted?.session.state).toBe("NOMINATION");
    await expect(getAuctionSession("farm-init")).resolves.toBeNull();
  });

  test("drives nominate to bids to SOLD while a CPU farm team auto-acts", async () => {
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

    const playerId = result.current.session?.availablePlayerIds[0];
    await act(async () => {
      await result.current.nominate(playerId!);
    });
    const openingAsk = result.current.session?.currentLot?.openingAsk;

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
    const playerId = result.current.session?.availablePlayerIds[0];
    await act(async () => {
      await result.current.nominate(playerId!);
    });

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
});
