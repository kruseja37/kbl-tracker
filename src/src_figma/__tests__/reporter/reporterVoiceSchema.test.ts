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

async function seedVersionNineTrackerDatabase(): Promise<void> {
  resetTrackerDbForTests();
  await deleteDatabase(DB_NAME).catch(() => undefined);

  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 9);

    request.onupgradeneeded = () => {
      const db = request.result;
      db.createObjectStore("completedGames", { keyPath: "gameId" });

      const reporterStore = db.createObjectStore("reporters", { keyPath: "id" });
      reporterStore.createIndex("teamId", "teamId", { unique: false });
      reporterStore.createIndex("leagueId", "leagueId", { unique: false });
      reporterStore.createIndex("changed_at", "changed_at", { unique: false });

      const storyStore = db.createObjectStore("gameStories", { keyPath: "id" });
      storyStore.createIndex("gameId", "gameId", { unique: false });
      storyStore.createIndex("reporterId", "reporterId", { unique: false });
      storyStore.createIndex("teamId", "teamId", { unique: false });
      storyStore.createIndex("leagueId", "leagueId", { unique: false });
      storyStore.createIndex("opponentTeamId", "opponentTeamId", { unique: false });
      storyStore.createIndex("gameMode", "gameMode", { unique: false });
      storyStore.createIndex("gameDate", "gameDate", { unique: false });
      storyStore.createIndex("changed_at", "changed_at", { unique: false });

      const contextStore = db.createObjectStore("narrativeContext", { keyPath: "id" });
      contextStore.createIndex("teamId", "teamId", { unique: false });
      contextStore.createIndex("leagueId", "leagueId", { unique: false });
      contextStore.createIndex("gameMode", "gameMode", { unique: false });
      contextStore.createIndex("teamId_gameMode", ["teamId", "gameMode"], { unique: false });
      contextStore.createIndex("changed_at", "changed_at", { unique: false });

      const rivalryStore = db.createObjectStore("rivalryScores", { keyPath: "id" });
      rivalryStore.createIndex("teamId", "teamId", { unique: false });
      rivalryStore.createIndex("leagueId", "leagueId", { unique: false });
      rivalryStore.createIndex("rivalTeamId", "rivalTeamId", { unique: false });
      rivalryStore.createIndex("teamId_rivalTeamId", ["teamId", "rivalTeamId"], { unique: false });
      rivalryStore.createIndex("changed_at", "changed_at", { unique: false });
    };

    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction(["completedGames", "gameStories"], "readwrite");

      tx.objectStore("completedGames").put({
        gameId: "legacy-game-v9",
        competitionType: "exhibition",
        date: 1713139200000,
      });
      tx.objectStore("gameStories").put({
        id: "story-1",
        gameId: "legacy-game-v9",
        reporterId: "reporter-1",
        teamId: "team-1",
        leagueId: "league-1",
        gameMode: "exhibition",
        headline: "Legacy story stays put",
        body: "Reporter voice data should survive the upgrade.",
        playersMentioned: [],
        gameDate: "2026-04-16",
        createdAt: 1000,
        changed_at: 1000,
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

  test("upgrades a v8 tracker database to current reporter voice stores without data loss", async () => {
    await seedVersionEightTrackerDatabase();

    const db = await getTrackerDb();
    expect(db.version).toBe(10);
    expect(Array.from(db.objectStoreNames)).toEqual(
      expect.arrayContaining([
        "reporters",
        "gameStories",
        "commentaryFeedEntries",
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

  test("upgrades a v9 tracker database to v10 commentary feed store without repurposing gameStories", async () => {
    await seedVersionNineTrackerDatabase();

    const db = await getTrackerDb();
    expect(db.version).toBe(10);
    expect(Array.from(db.objectStoreNames)).toEqual(
      expect.arrayContaining([
        "commentaryFeedEntries",
        "gameStories",
        "completedGames",
      ]),
    );

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(
        ["commentaryFeedEntries", "gameStories", "completedGames"],
        "readonly",
      );

      expect(tx.objectStore("commentaryFeedEntries").keyPath).toBe("id");
      expect(Array.from(tx.objectStore("commentaryFeedEntries").indexNames)).toEqual(
        expect.arrayContaining([
          "gameId",
          "reporterId",
          "leagueId",
          "timestamp",
          "changed_at",
          "gameId_timestamp",
        ]),
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

      const gameRequest = tx.objectStore("completedGames").get("legacy-game-v9");
      const storyRequest = tx.objectStore("gameStories").get("story-1");

      tx.oncomplete = () => {
        expect(gameRequest.result).toMatchObject({
          gameId: "legacy-game-v9",
          competitionType: "exhibition",
        });
        expect(storyRequest.result).toMatchObject({
          id: "story-1",
          headline: "Legacy story stays put",
        });
        resolve();
      };
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  });
});
