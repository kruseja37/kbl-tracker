import "fake-indexeddb/auto";

import { afterEach, beforeEach, describe, expect, test } from "vitest";

import {
  addReporterAlmanacEntry,
  getPlayerAlmanacCache,
  getPlayerLegacySummary,
  getQueuedReporterLegacySummaryJobs,
  getRecentPlayerAlmanac,
  getRecentTeamAlmanac,
  getTeamAlmanacCache,
  getTeamLegacySummary,
  maybeRegenerateLegacy,
  putPlayerAlmanacCache,
  putTeamAlmanacCache,
} from "../../../utils/reporterAlmanacCacheStorage";
import { getTrackerDb, resetTrackerDbForTests } from "../../../utils/trackerDb";

const DB_NAME = "kbl-tracker";

function deleteDatabase(name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error(`Delete blocked for ${name}`));
  });
}

async function seedVersionSixTrackerDatabase(): Promise<void> {
  resetTrackerDbForTests();
  await deleteDatabase(DB_NAME).catch(() => undefined);

  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 6);

    request.onupgradeneeded = () => {
      const db = request.result;
      db.createObjectStore("currentGame", { keyPath: "id" });
      db.createObjectStore("completedGames", { keyPath: "gameId" });
      db.createObjectStore("playerGameStats", { keyPath: ["gameId", "playerId"] });
      db.createObjectStore("pitcherGameStats", { keyPath: ["gameId", "pitcherId"] });
      db.createObjectStore("playerSeasonBatting", { keyPath: ["seasonId", "playerId"] });
      db.createObjectStore("playerSeasonPitching", { keyPath: ["seasonId", "playerId"] });
      db.createObjectStore("playerSeasonFielding", { keyPath: ["seasonId", "playerId"] });
      db.createObjectStore("seasonMetadata", { keyPath: "seasonId" });
      db.createObjectStore("playerCareerBatting", { keyPath: "playerId" });
      db.createObjectStore("playerCareerPitching", { keyPath: "playerId" });
      db.createObjectStore("playerCareerFielding", { keyPath: "playerId" });
      db.createObjectStore("careerMilestones", { keyPath: "id" });
      db.createObjectStore("rosterSnapshots", { keyPath: "key" });
      db.createObjectStore("mojoFitnessSnapshots", { keyPath: ["eliminationId", "playerId"] });
      db.createObjectStore("almanacCanonicalPlayers", { keyPath: "canonicalId" });
      db.createObjectStore("eliminationRunFameAggregates", { keyPath: "runId" });
    };

    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction(["completedGames", "eliminationRunFameAggregates"], "readwrite");

      tx.objectStore("completedGames").put({
        gameId: "legacy-game",
        competitionId: "elim-legacy",
        competitionType: "elimination",
        date: 1713139200000,
      });
      tx.objectStore("eliminationRunFameAggregates").put({
        runId: "elim-legacy",
        playerFame: {},
        processedGameIds: ["legacy-game"],
        lastUpdatedAt: 1713139200000,
      });

      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    };

    request.onerror = () => reject(request.error);
  });
}

describe("reporterAlmanacCacheStorage", () => {
  beforeEach(async () => {
    resetTrackerDbForTests();
    await deleteDatabase(DB_NAME).catch(() => undefined);
  });

  afterEach(async () => {
    resetTrackerDbForTests();
    await deleteDatabase(DB_NAME).catch(() => undefined);
  });

  test("persists player and team legacy cache records", async () => {
    await putPlayerAlmanacCache({
      playerId: "player-1",
      instanceId: "league-1",
      legacySummary: "Ivy Sparks keeps arriving in noisy ninth innings.",
      summaryGeneratedAt: 1713139200000,
      summaryFromEventCount: 3,
      recentEventIds: ["event-3", "event-2"],
    });
    await putTeamAlmanacCache({
      teamId: "team-1",
      instanceId: "league-1",
      legacySummary: "The Comets specialize in one-run trouble.",
      summaryGeneratedAt: 1713139300000,
      summaryFromEventCount: 4,
      recentEventIds: ["team-event-4"],
    });

    await expect(getPlayerAlmanacCache("player-1", "league-1")).resolves.toMatchObject({
      playerId: "player-1",
      legacySummary: "Ivy Sparks keeps arriving in noisy ninth innings.",
      summaryFromEventCount: 3,
    });
    await expect(getTeamAlmanacCache("team-1", "league-1")).resolves.toMatchObject({
      teamId: "team-1",
      legacySummary: "The Comets specialize in one-run trouble.",
      summaryFromEventCount: 4,
    });
    await expect(getPlayerLegacySummary("player-1", "league-1")).resolves.toBe(
      "Ivy Sparks keeps arriving in noisy ninth innings.",
    );
    await expect(getTeamLegacySummary("team-1", "league-1")).resolves.toBe(
      "The Comets specialize in one-run trouble.",
    );
  });

  test("records recent almanac entries and keeps cache recent event ids capped", async () => {
    for (let index = 0; index < 6; index += 1) {
      await addReporterAlmanacEntry(
        {
          id: `entry-${index}`,
          entityType: "player",
          entityId: "player-1",
          instanceId: "league-1",
          gameId: `game-${index}`,
          timestamp: 1000 + index,
          headline: `Moment ${index}`,
          summary: `Summary ${index}`,
        },
        { threshold: 10 },
      );
    }

    const recent = await getRecentPlayerAlmanac("player-1", "league-1");
    expect(recent.map((entry) => entry.id)).toEqual([
      "entry-5",
      "entry-4",
      "entry-3",
      "entry-2",
      "entry-1",
    ]);
    await expect(getPlayerAlmanacCache("player-1", "league-1")).resolves.toMatchObject({
      recentEventIds: ["entry-5", "entry-4", "entry-3", "entry-2", "entry-1"],
      summaryFromEventCount: 0,
    });
  });

  test("queues a regen stub only when the player event delta reaches the threshold", async () => {
    await putPlayerAlmanacCache({
      playerId: "player-threshold",
      instanceId: "league-1",
      legacySummary: "Old summary",
      summaryGeneratedAt: 100,
      summaryFromEventCount: 0,
      recentEventIds: [],
    });

    for (let index = 0; index < 4; index += 1) {
      await addReporterAlmanacEntry(
        {
          id: `threshold-${index}`,
          entityType: "player",
          entityId: "player-threshold",
          instanceId: "league-1",
          timestamp: 2000 + index,
          headline: `Threshold ${index}`,
          summary: `Summary ${index}`,
        },
        { threshold: 999 },
      );
    }

    await expect(
      maybeRegenerateLegacy("player", "player-threshold", "league-1", { now: 3000 }),
    ).resolves.toBeNull();

    await addReporterAlmanacEntry(
      {
        id: "threshold-4",
        entityType: "player",
        entityId: "player-threshold",
        instanceId: "league-1",
        timestamp: 2004,
        headline: "Threshold 4",
        summary: "Summary 4",
      },
      { threshold: 999 },
    );

    await expect(
      maybeRegenerateLegacy("player", "player-threshold", "league-1", { now: 3001 }),
    ).resolves.toMatchObject({
      entityType: "player",
      entityId: "player-threshold",
      status: "queued",
      eventCount: 5,
      cacheEventCount: 0,
    });
    await expect(getQueuedReporterLegacySummaryJobs()).resolves.toHaveLength(1);
  });

  test("supports team almanac entries without crossing into player cache state", async () => {
    await addReporterAlmanacEntry(
      {
        id: "team-entry-1",
        entityType: "team",
        entityId: "team-1",
        instanceId: "league-1",
        timestamp: 4000,
        headline: "The Comets win a strange one",
        summary: "A late rally adds to the club lore.",
      },
      { threshold: 5 },
    );

    await expect(getRecentTeamAlmanac("team-1", "league-1")).resolves.toEqual([
      expect.objectContaining({
        id: "team-entry-1",
        entityType: "team",
        entityId: "team-1",
      }),
    ]);
    await expect(getPlayerAlmanacCache("team-1", "league-1")).resolves.toBeNull();
  });

  test("upgrades an existing tracker database to add reporter almanac stores without data loss", async () => {
    await seedVersionSixTrackerDatabase();

    await expect(getPlayerAlmanacCache("legacy-player", "elim-legacy")).resolves.toBeNull();

    const db = await getTrackerDb();
    expect(db.version).toBe(8);
    expect(Array.from(db.objectStoreNames)).toEqual(
      expect.arrayContaining([
        "reporterPlayerAlmanacCaches",
        "reporterTeamAlmanacCaches",
        "reporterAlmanacEntries",
        "reporterLegacySummaryJobs",
        "eliminationRunFameAggregates",
      ]),
    );

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(["completedGames", "eliminationRunFameAggregates"], "readonly");
      const completedRequest = tx.objectStore("completedGames").get("legacy-game");
      const fameRequest = tx.objectStore("eliminationRunFameAggregates").get("elim-legacy");

      tx.oncomplete = () => {
        expect(completedRequest.result).toMatchObject({
          gameId: "legacy-game",
          competitionType: "elimination",
        });
        expect(fameRequest.result).toMatchObject({
          runId: "elim-legacy",
          processedGameIds: ["legacy-game"],
        });
        resolve();
      };
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  });
});
