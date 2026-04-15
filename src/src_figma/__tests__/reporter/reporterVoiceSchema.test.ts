import "fake-indexeddb/auto";

import { afterEach, beforeEach, describe, expect, test } from "vitest";

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

async function seedVersionEightTrackerDatabase(): Promise<void> {
  resetTrackerDbForTests();
  await deleteDatabase(DB_NAME).catch(() => undefined);

  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 8);

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
      db.createObjectStore("reporterPlayerAlmanacCaches", { keyPath: "cacheKey" });
      db.createObjectStore("reporterTeamAlmanacCaches", { keyPath: "cacheKey" });
      db.createObjectStore("reporterAlmanacEntries", { keyPath: "id" });
      db.createObjectStore("reporterLegacySummaryJobs", { keyPath: "id" });
      db.createObjectStore("llmUsageLog", { keyPath: "id" });
      db.createObjectStore("userPreferences", { keyPath: "key" });
    };

    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction(["completedGames", "userPreferences"], "readwrite");

      tx.objectStore("completedGames").put({
        gameId: "legacy-game",
        competitionType: "exhibition",
        date: 1713139200000,
      });
      tx.objectStore("userPreferences").put({
        key: "narrativeIntensity",
        value: "medium",
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

describe("reporter voice tracker schema", () => {
  beforeEach(async () => {
    resetTrackerDbForTests();
    await deleteDatabase(DB_NAME).catch(() => undefined);
  });

  afterEach(async () => {
    resetTrackerDbForTests();
    await deleteDatabase(DB_NAME).catch(() => undefined);
  });

  test("upgrades a v8 tracker database to v9 reporter voice stores without data loss", async () => {
    await seedVersionEightTrackerDatabase();

    const db = await getTrackerDb();
    expect(db.version).toBe(9);
    expect(Array.from(db.objectStoreNames)).toEqual(
      expect.arrayContaining([
        "reporters",
        "gameStories",
        "narrativeContext",
        "rivalryScores",
        "completedGames",
        "userPreferences",
      ]),
    );

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(
        [
          "reporters",
          "gameStories",
          "narrativeContext",
          "rivalryScores",
          "completedGames",
          "userPreferences",
        ],
        "readonly",
      );

      expect(tx.objectStore("reporters").keyPath).toBe("id");
      expect(Array.from(tx.objectStore("reporters").indexNames)).toEqual(
        expect.arrayContaining(["teamId", "leagueId", "changed_at"]),
      );

      expect(tx.objectStore("gameStories").keyPath).toBe("id");
      expect(Array.from(tx.objectStore("gameStories").indexNames)).toEqual(
        expect.arrayContaining([
          "gameId",
          "reporterId",
          "teamId",
          "leagueId",
          "opponentTeamId",
          "gameMode",
          "gameDate",
          "changed_at",
        ]),
      );

      expect(tx.objectStore("narrativeContext").keyPath).toBe("id");
      expect(Array.from(tx.objectStore("narrativeContext").indexNames)).toEqual(
        expect.arrayContaining(["teamId", "leagueId", "gameMode", "teamId_gameMode", "changed_at"]),
      );

      expect(tx.objectStore("rivalryScores").keyPath).toBe("id");
      expect(Array.from(tx.objectStore("rivalryScores").indexNames)).toEqual(
        expect.arrayContaining(["teamId", "leagueId", "rivalTeamId", "teamId_rivalTeamId", "changed_at"]),
      );

      const gameRequest = tx.objectStore("completedGames").get("legacy-game");
      const preferencesRequest = tx.objectStore("userPreferences").get("narrativeIntensity");

      tx.oncomplete = () => {
        expect(gameRequest.result).toMatchObject({
          gameId: "legacy-game",
          competitionType: "exhibition",
        });
        expect(preferencesRequest.result).toMatchObject({
          key: "narrativeIntensity",
          value: "medium",
        });
        resolve();
      };
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  });
});
