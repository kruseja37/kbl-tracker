import "fake-indexeddb/auto";

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../utils/syncEngine", () => ({
  syncEngine: {
    isSuppressed: () => true,
    upsert: vi.fn(),
    remove: vi.fn(),
  },
}));

import {
  acceptFamePromotion,
  buildPromotionCandidate,
  dismissFamePromotion,
  getPromotionTargetTier,
  getRunPromotionCandidates,
} from "../../app/engines/famePromotion";
import {
  appendEliminationGameFameToRun,
  getRunPromotionDecision,
  type RunFameStanding,
} from "../../../utils/eliminationRunFameStorage";
import {
  __resetLeagueBuilderDatabaseForTests,
  getLeaguePlayerOverride,
  getPlayer,
  savePlayer,
  type Player,
} from "../../../utils/leagueBuilderStorage";
import {
  deleteEliminationDatabase,
  saveEliminationPlayer,
} from "../../../utils/eliminationPlayerStorage";
import { resetTrackerDbForTests } from "../../../utils/trackerDb";

const TRACKER_DB_NAME = "kbl-tracker";
const LEAGUE_BUILDER_DB_NAME = "kbl-league-builder";
const touchedRunIds = new Set<string>();

function deleteDatabase(name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error(`Delete blocked for ${name}`));
  });
}

function makePlayer(
  id: string,
  baseFameTier: Player["baseFameTier"] = 3,
): Omit<Player, "createdDate" | "lastModified"> {
  return {
    id,
    firstName: "Ivy",
    lastName: "Knox",
    baseFameTier,
    gender: "F",
    age: 27,
    bats: "R",
    throws: "R",
    primaryPosition: "CF",
    power: 70,
    contact: 68,
    speed: 75,
    fielding: 80,
    arm: 66,
    velocity: 20,
    junk: 20,
    accuracy: 20,
    arsenal: [],
    overallGrade: "B+",
    personality: "Competitive",
    chemistry: "Competitive",
    morale: 50,
    mojo: "Normal",
    fame: 0,
    salary: 8,
    leagueAssignments: [],
    isCustom: true,
  };
}

function makeStanding(totalFame: number): RunFameStanding {
  return {
    playerId: "player-ivy",
    playerName: "Ivy Knox",
    totalFame,
    gamesPlayed: 2,
    events: [
      {
        id: "fame-1",
        gameId: "game-1",
        eventType: "GRAND_SLAM",
        playerId: "player-ivy",
        playerName: "Ivy Knox",
        playerTeam: "night-shift",
        fameValue: totalFame,
        fameType: "bonus",
        inning: 7,
        halfInning: "BOTTOM",
        timestamp: 1,
        autoDetected: true,
      },
    ],
  };
}

async function seedRunPlayer(runId: string, playerId = "player-ivy") {
  touchedRunIds.add(runId);
  await saveEliminationPlayer(runId, makePlayer(playerId, 3));
  await appendEliminationGameFameToRun(runId, "game-1", [
    {
      id: `${runId}-fame-1`,
      gameId: "game-1",
      eventType: "WEB_GEM",
      playerId,
      playerName: "Ivy Knox",
      playerTeam: "night-shift",
      fameValue: 42,
      fameType: "bonus",
      inning: 4,
      halfInning: "BOTTOM",
      timestamp: 1,
      autoDetected: true,
    },
  ]);
  await appendEliminationGameFameToRun(runId, "game-2", [
    {
      id: `${runId}-fame-2`,
      gameId: "game-2",
      eventType: "WALK_OFF",
      playerId,
      playerName: "Ivy Knox",
      playerTeam: "night-shift",
      fameValue: 40,
      fameType: "bonus",
      inning: 9,
      halfInning: "BOTTOM",
      timestamp: 2,
      autoDetected: true,
    },
  ]);
}

describe("famePromotion", () => {
  beforeEach(async () => {
    resetTrackerDbForTests();
    __resetLeagueBuilderDatabaseForTests();
    await deleteDatabase(TRACKER_DB_NAME).catch(() => undefined);
    await deleteDatabase(LEAGUE_BUILDER_DB_NAME).catch(() => undefined);
    touchedRunIds.clear();
  });

  afterEach(async () => {
    resetTrackerDbForTests();
    __resetLeagueBuilderDatabaseForTests();
    await Promise.all(
      [...touchedRunIds].map((runId) =>
        deleteEliminationDatabase(runId).catch(() => undefined),
      ),
    );
  });

  test("detects threshold crossings and edge boundaries", () => {
    expect(getPromotionTargetTier(1, 9.99)).toBeNull();
    expect(getPromotionTargetTier(1, 10)).toBe(2);
    expect(getPromotionTargetTier(3, 79.99)).toBeNull();
    expect(getPromotionTargetTier(3, 80)).toBe(4);
    expect(getPromotionTargetTier(1, 151)).toBe(5);
    expect(getPromotionTargetTier(5, 999)).toBeNull();
  });

  test("does not build a candidate below threshold or after a handled decision", () => {
    expect(buildPromotionCandidate(makeStanding(79.99), 3, "Night Shift", null)).toBeNull();
    expect(
      buildPromotionCandidate(makeStanding(82), 3, "Night Shift", {
        dismissedTier: 4,
        lastUpdatedAt: 1,
      }),
    ).toBeNull();
    expect(
      buildPromotionCandidate(makeStanding(82), 3, "Night Shift", {
        acceptedTier: 4,
        lastUpdatedAt: 1,
      }),
    ).toBeNull();

    const candidate = buildPromotionCandidate(makeStanding(82), 3, "Night Shift", null);
    expect(candidate).toMatchObject({
      playerId: "player-ivy",
      currentTier: 3,
      targetTier: 4,
      runTotalFame: 82,
    });
  });

  test("dismiss persists for the run and prevents a re-prompt next game", async () => {
    const runId = "promo-dismiss-run";
    await seedRunPlayer(runId);

    const beforeDismiss = await getRunPromotionCandidates(runId, [makeStanding(82)], {
      "night-shift": "Night Shift",
    });
    expect(beforeDismiss).toHaveLength(1);

    await dismissFamePromotion(runId, "player-ivy", 4);

    const afterDismiss = await getRunPromotionCandidates(runId, [makeStanding(84)], {
      "night-shift": "Night Shift",
    });
    expect(afterDismiss).toHaveLength(0);
    expect(await getRunPromotionDecision(runId, "player-ivy")).toMatchObject({
      dismissedTier: 4,
    });
  });

  test("accept writes an elimination override without mutating the base player", async () => {
    const runId = "promo-accept-run";
    await savePlayer(makePlayer("player-ivy", 3));
    await seedRunPlayer(runId);

    await acceptFamePromotion(runId, "player-ivy", 4);

    expect(await getLeaguePlayerOverride(runId, "player-ivy")).toMatchObject({
      leagueId: runId,
      playerId: "player-ivy",
      fameTierOverride: 4,
    });
    expect(await getRunPromotionDecision(runId, "player-ivy")).toMatchObject({
      acceptedTier: 4,
    });
    expect((await getPlayer("player-ivy"))?.baseFameTier).toBe(3);

    const candidatesAfterAccept = await getRunPromotionCandidates(runId, [makeStanding(82)], {
      "night-shift": "Night Shift",
    });
    expect(candidatesAfterAccept).toHaveLength(0);
  });
});
