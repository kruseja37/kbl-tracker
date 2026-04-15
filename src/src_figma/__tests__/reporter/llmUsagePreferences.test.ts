import "fake-indexeddb/auto";

import { afterEach, beforeEach, describe, expect, test } from "vitest";

import {
  getNarrativeIntensityThresholds,
  NARRATIVE_INTENSITY_THRESHOLDS,
} from "../../app/engines/reporter/narrativeIntensity";
import {
  calculateLlmCostUsd,
  getReporterModelPricing,
} from "../../app/engines/reporter/pricing";
import {
  getRecentGamesUsage,
  getUsageMonthToDate,
  getUsagePerGameAverage,
  getUsagePerIntensity,
  isWithinDailyCallLimit,
  logLlmCall,
} from "../../app/engines/reporter/usageLogger";
import {
  getGrokApiKey,
  getNarrativeIntensity,
  getSoftMonthlyBudget,
  getUserPreferences,
  setGrokApiKey,
  setNarrativeIntensity,
  setSoftMonthlyBudget,
} from "../../../utils/userPreferencesStorage";
import { getTrackerDb, resetTrackerDbForTests } from "../../../utils/trackerDb";

const DB_NAME = "kbl-tracker";
const APRIL_15_2026 = new Date("2026-04-15T12:00:00.000Z").getTime();

function deleteDatabase(name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error(`Delete blocked for ${name}`));
  });
}

async function seedVersionSevenTrackerDatabase(): Promise<void> {
  resetTrackerDbForTests();
  await deleteDatabase(DB_NAME).catch(() => undefined);

  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 7);

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
    };

    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction(["completedGames", "reporterAlmanacEntries"], "readwrite");

      tx.objectStore("completedGames").put({
        gameId: "legacy-game",
        competitionType: "exhibition",
        date: APRIL_15_2026,
      });
      tx.objectStore("reporterAlmanacEntries").put({
        id: "legacy-almanac-entry",
        entityType: "player",
        entityId: "player-1",
        entityKey: "player:league-1:player-1",
        instanceId: "league-1",
        timestamp: APRIL_15_2026,
        headline: "Legacy moment",
        summary: "Still here after migration.",
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

describe("F1 LLM usage logging and preferences", () => {
  beforeEach(async () => {
    resetTrackerDbForTests();
    await deleteDatabase(DB_NAME).catch(() => undefined);
  });

  afterEach(async () => {
    resetTrackerDbForTests();
    await deleteDatabase(DB_NAME).catch(() => undefined);
  });

  test("computes model costs using configured Grok and Claude Sonnet rates", () => {
    expect(getReporterModelPricing("grok-4")).toMatchObject({
      provider: "grok",
      inputUsdPerMillionTokens: 3,
      outputUsdPerMillionTokens: 15,
    });
    expect(getReporterModelPricing("claude-sonnet-4.6")).toMatchObject({
      provider: "anthropic",
      inputUsdPerMillionTokens: 3,
      outputUsdPerMillionTokens: 15,
    });
    expect(calculateLlmCostUsd({ model: "grok-4", inputTokens: 1000, outputTokens: 500 })).toBe(
      0.0105,
    );
  });

  test("returns empty usage aggregates before any LLM calls are logged", async () => {
    await expect(getUsageMonthToDate(APRIL_15_2026)).resolves.toMatchObject({
      totalCostUsd: 0,
      totalCalls: 0,
      inputTokens: 0,
      outputTokens: 0,
    });
    await expect(getUsagePerGameAverage("exhibition", APRIL_15_2026)).resolves.toEqual({
      games: 0,
      averageCostUsd: 0,
      averageCalls: 0,
    });
    await expect(getRecentGamesUsage(5)).resolves.toEqual([]);
  });

  test("logs LLM calls with cost metadata and aggregates by month, game, and intensity", async () => {
    const first = await logLlmCall({
      timestamp: APRIL_15_2026 - 1000,
      model: "grok-4",
      inputTokens: 1000,
      outputTokens: 500,
      gameId: "game-1",
      mode: "exhibition",
      intensity: "medium",
      purpose: "legacy_summary",
    });
    await logLlmCall({
      timestamp: APRIL_15_2026,
      model: "claude-sonnet-4.6",
      inputTokens: 1000,
      outputTokens: 1000,
      gameId: "game-1",
      mode: "exhibition",
      intensity: "medium",
      purpose: "post_game_column",
    });
    await logLlmCall({
      timestamp: APRIL_15_2026,
      model: "grok-4",
      inputTokens: 500,
      outputTokens: 100,
      gameId: "game-2",
      mode: "elimination",
      intensity: "high",
      purpose: "commentary",
    });

    expect(first).toMatchObject({
      provider: "grok",
      costUsd: 0.0105,
      intensity: "medium",
      purpose: "legacy_summary",
    });
    await expect(getUsageMonthToDate(APRIL_15_2026)).resolves.toMatchObject({
      totalCalls: 3,
      grokCalls: 2,
      claudeCalls: 1,
      inputTokens: 2500,
      outputTokens: 1600,
    });
    await expect(getUsagePerGameAverage("exhibition", APRIL_15_2026)).resolves.toEqual({
      games: 1,
      averageCostUsd: 0.0285,
      averageCalls: 2,
    });
    await expect(getUsagePerIntensity("medium")).resolves.toMatchObject({
      intensity: "medium",
      totalCalls: 2,
      games: 1,
      averageCostPerGameUsd: 0.0285,
    });
    await expect(getRecentGamesUsage(2)).resolves.toEqual([
      expect.objectContaining({
        gameId: "game-2",
        mode: "elimination",
        intensity: "high",
        callCount: 1,
      }),
      expect.objectContaining({
        gameId: "game-1",
        mode: "exhibition",
        intensity: "medium",
        callCount: 2,
      }),
    ]);
  });

  test("enforces the 500-per-day Grok call safety rail", async () => {
    for (let index = 0; index < 499; index += 1) {
      await logLlmCall({
        timestamp: APRIL_15_2026 + index,
        model: "grok-4",
        inputTokens: 1,
        outputTokens: 1,
        gameId: "game-limit",
        mode: "exhibition",
        intensity: "low",
        purpose: "commentary",
      });
    }

    await expect(isWithinDailyCallLimit(APRIL_15_2026 + 499)).resolves.toBe(true);

    await logLlmCall({
      timestamp: APRIL_15_2026 + 500,
      model: "grok-4",
      inputTokens: 1,
      outputTokens: 1,
      gameId: "game-limit",
      mode: "exhibition",
      intensity: "low",
      purpose: "commentary",
    });

    await expect(isWithinDailyCallLimit(APRIL_15_2026 + 501)).resolves.toBe(false);
  });

  test("defaults preferences to Medium intensity and persists preference writes", async () => {
    await expect(getUserPreferences()).resolves.toMatchObject({
      narrativeIntensity: "medium",
      softMonthlyBudget: 5,
    });
    await expect(getNarrativeIntensity()).resolves.toBe("medium");

    await setNarrativeIntensity("high");
    await setGrokApiKey("xai-test-key-123");
    await setSoftMonthlyBudget(12.5);

    await expect(getNarrativeIntensity()).resolves.toBe("high");
    await expect(getGrokApiKey()).resolves.toBe("xai-test-key-123");
    await expect(getSoftMonthlyBudget()).resolves.toBe(12.5);
  });

  test("rejects invalid Grok API keys before persistence", async () => {
    await expect(setGrokApiKey("bad key with spaces")).rejects.toThrow(
      "Grok API key must be at least 8 characters",
    );
    await expect(getGrokApiKey()).resolves.toBeUndefined();
  });

  test("exposes Narrative Intensity threshold mapping from the spec", () => {
    expect(getNarrativeIntensityThresholds("low")).toMatchObject({
      commentaryWpaThreshold: 0.15,
      commentaryDramaticWeightThreshold: 4,
      summaryRegenDelta: 10,
      opposingReporterColumn: "off",
    });
    expect(NARRATIVE_INTENSITY_THRESHOLDS.medium).toMatchObject({
      commentaryWpaThreshold: 0.08,
      commentaryDramaticWeightThreshold: 2.5,
      summaryRegenDelta: 5,
      postGameColumnTargetWords: 300,
    });
    expect(getNarrativeIntensityThresholds("high")).toMatchObject({
      commentaryWpaThreshold: 0.04,
      commentaryDramaticWeightThreshold: 1.5,
      summaryRegenDelta: 3,
      opposingReporterColumn: "full",
    });
  });

  test("upgrades an existing tracker database to add F1 stores without data loss", async () => {
    await seedVersionSevenTrackerDatabase();

    await expect(getNarrativeIntensity()).resolves.toBe("medium");

    const db = await getTrackerDb();
    expect(db.version).toBe(8);
    expect(Array.from(db.objectStoreNames)).toEqual(
      expect.arrayContaining([
        "llmUsageLog",
        "userPreferences",
        "completedGames",
        "reporterAlmanacEntries",
      ]),
    );

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(["completedGames", "reporterAlmanacEntries"], "readonly");
      const gameRequest = tx.objectStore("completedGames").get("legacy-game");
      const almanacRequest = tx.objectStore("reporterAlmanacEntries").get("legacy-almanac-entry");

      tx.oncomplete = () => {
        expect(gameRequest.result).toMatchObject({
          gameId: "legacy-game",
          competitionType: "exhibition",
        });
        expect(almanacRequest.result).toMatchObject({
          id: "legacy-almanac-entry",
          summary: "Still here after migration.",
        });
        resolve();
      };
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  });
});
