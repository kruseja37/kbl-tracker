import "fake-indexeddb/auto";

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import {
  callGrokChatCompletion,
  GrokApiError,
  type GrokChatCompletionRequest,
  type GrokChatCompletionResult,
} from "../../app/engines/reporter/grokClient";
import {
  buildLegacySummaryPrompt,
  processQueuedLegacySummaryJobs,
  regenerateLegacySummary,
} from "../../app/engines/reporter/summarizer";
import { getUsageMonthToDate } from "../../app/engines/reporter/usageLogger";
import {
  addReporterAlmanacEntry,
  getPlayerAlmanacCache,
  getQueuedReporterLegacySummaryJobs,
  putPlayerAlmanacCache,
  queueReporterLegacySummaryJob,
} from "../../../utils/reporterAlmanacCacheStorage";
import { resetTrackerDbForTests } from "../../../utils/trackerDb";
import {
  setGrokApiKey,
  setNarrativeIntensity,
} from "../../../utils/userPreferencesStorage";
import type { NarrativeIntensity } from "../../../types/reporterPreferences";

const DB_NAME = "kbl-tracker";
const FIXED_NOW = new Date("2026-04-15T12:00:00.000Z").getTime();
const INSTANCE_ID = "league-1";

function deleteDatabase(name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error(`Delete blocked for ${name}`));
  });
}

function createMockGrokClient(summary = "A crisp, newly generated legacy summary."): ReturnType<typeof vi.fn> {
  return vi.fn(async (): Promise<GrokChatCompletionResult> => ({
    text: summary,
    inputTokens: 420,
    outputTokens: 90,
    raw: { mocked: true },
  }));
}

async function seedPlayerEntries(
  playerId: string,
  count: number,
  options: {
    startIndex?: number;
    wpa?: (index: number) => number | undefined;
    dramaticWeight?: (index: number) => number | undefined;
    gameIdPrefix?: string;
  } = {},
): Promise<void> {
  const startIndex = options.startIndex ?? 0;
  for (let index = 0; index < count; index += 1) {
    const ordinal = startIndex + index;
    await addReporterAlmanacEntry(
      {
        id: `${playerId}-entry-${ordinal}`,
        entityType: "player",
        entityId: playerId,
        instanceId: INSTANCE_ID,
        gameId: `${options.gameIdPrefix ?? playerId}-game-${ordinal}`,
        timestamp: FIXED_NOW + ordinal,
        headline: `Moment ${ordinal}`,
        summary: `Summary ${ordinal}`,
        wpa: options.wpa?.(ordinal),
        dramaticWeight: options.dramaticWeight?.(ordinal),
      },
      { threshold: 999 },
    );
  }
}

describe("F3 Grok legacy summarizer", () => {
  beforeEach(async () => {
    resetTrackerDbForTests();
    await deleteDatabase(DB_NAME).catch(() => undefined);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    resetTrackerDbForTests();
    await deleteDatabase(DB_NAME).catch(() => undefined);
  });

  test("builds a grounded legacy-summary prompt from the existing summary and new entries", () => {
    const messages = buildLegacySummaryPrompt({
      entityType: "player",
      entityId: "Ivy Sparks",
      existingSummary: "Ivy already owns late innings.",
      entriesSinceLastRegen: [
        {
          id: "entry-1",
          entityType: "player",
          entityId: "player-1",
          entityKey: "player:league-1:player-1",
          instanceId: INSTANCE_ID,
          gameId: "game-1",
          timestamp: FIXED_NOW,
          headline: "Walk-off wallop",
          summary: "Ivy ended a tense elimination game.",
          wpa: 0.42,
          leverageIndex: 3.2,
        },
      ],
    });

    expect(messages[0]).toMatchObject({ role: "system" });
    expect(messages[1].content).toContain("about 150 words");
    expect(messages[1].content).toContain("Existing summary: Ivy already owns late innings.");
    expect(messages[1].content).toContain("Walk-off wallop");
    expect(messages[1].content).toContain("WPA=0.42");
  });

  test("calls the mocked Grok client, logs usage, and writes the generated summary back to cache", async () => {
    await setGrokApiKey("xai-test-key-123");
    await setNarrativeIntensity("medium");
    await seedPlayerEntries("player-success", 5);
    const grokClient = createMockGrokClient("Ivy Sparks keeps turning tense innings into personal folklore.");

    const result = await regenerateLegacySummary("player", "player-success", INSTANCE_ID, {
      mode: "exhibition",
      dependencies: {
        grokClient,
        now: () => FIXED_NOW,
      },
    });

    expect(result).toMatchObject({
      status: "generated",
      eventCount: 5,
      cacheEventCount: 0,
      threshold: 5,
      summary: "Ivy Sparks keeps turning tense innings into personal folklore.",
    });
    expect(grokClient).toHaveBeenCalledWith(
      expect.objectContaining({
        apiKey: "xai-test-key-123",
        model: "grok-4",
      }),
    );
    await expect(getPlayerAlmanacCache("player-success", INSTANCE_ID)).resolves.toMatchObject({
      legacySummary: "Ivy Sparks keeps turning tense innings into personal folklore.",
      summaryGeneratedAt: FIXED_NOW,
      summaryFromEventCount: 5,
      recentEventIds: [
        "player-success-entry-4",
        "player-success-entry-3",
        "player-success-entry-2",
        "player-success-entry-1",
        "player-success-entry-0",
      ],
    });
    await expect(getUsageMonthToDate(FIXED_NOW)).resolves.toMatchObject({
      totalCalls: 1,
      grokCalls: 1,
      inputTokens: 420,
      outputTokens: 90,
    });
  });

  test.each([
    ["low", 9, 10],
    ["medium", 4, 5],
    ["high", 2, 3],
  ] satisfies Array<[NarrativeIntensity, number, number]>)(
    "skips %s intensity until its regen threshold is crossed",
    async (intensity, belowThresholdCount, threshold) => {
      await setGrokApiKey("xai-test-key-123");
      await setNarrativeIntensity(intensity);
      await seedPlayerEntries(`player-${intensity}`, belowThresholdCount);
      const grokClient = createMockGrokClient();

      await expect(
        regenerateLegacySummary("player", `player-${intensity}`, INSTANCE_ID, {
          dependencies: { grokClient, now: () => FIXED_NOW },
        }),
      ).resolves.toMatchObject({
        status: "skipped_cache_hit",
        threshold,
      });
      expect(grokClient).not.toHaveBeenCalled();

      await seedPlayerEntries(`player-${intensity}`, 1, { startIndex: belowThresholdCount });

      await expect(
        regenerateLegacySummary("player", `player-${intensity}`, INSTANCE_ID, {
          dependencies: { grokClient, now: () => FIXED_NOW },
        }),
      ).resolves.toMatchObject({
        status: "generated",
        threshold,
        eventCount: threshold,
      });
      expect(grokClient).toHaveBeenCalledTimes(1);
    },
  );

  test("skips regeneration when the API key is missing", async () => {
    await setNarrativeIntensity("high");
    await seedPlayerEntries("player-missing-key", 3);
    const grokClient = createMockGrokClient();

    await expect(
      regenerateLegacySummary("player", "player-missing-key", INSTANCE_ID, {
        dependencies: { grokClient, now: () => FIXED_NOW },
      }),
    ).resolves.toMatchObject({
      status: "skipped_missing_api_key",
      eventCount: 3,
      threshold: 3,
    });
    expect(grokClient).not.toHaveBeenCalled();
    await expect(getUsageMonthToDate(FIXED_NOW)).resolves.toMatchObject({ totalCalls: 0 });
  });

  test("skips regeneration when the 500-per-day Grok safety rail is reached", async () => {
    await setGrokApiKey("xai-test-key-123");
    await setNarrativeIntensity("high");
    await seedPlayerEntries("player-rate-limit", 3);
    const grokClient = createMockGrokClient();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    await expect(
      regenerateLegacySummary("player", "player-rate-limit", INSTANCE_ID, {
        dependencies: {
          grokClient,
          isWithinDailyCallLimit: async () => false,
          now: () => FIXED_NOW,
        },
      }),
    ).resolves.toMatchObject({
      status: "skipped_rate_limited",
    });
    expect(warn).toHaveBeenCalledWith(
      "[reporter:summarizer] Grok daily call safety rail reached; skipping legacy summary regen.",
    );
    expect(grokClient).not.toHaveBeenCalled();
  });

  test("returns a failed result without cache write-back or usage logging when the mocked API fails", async () => {
    await setGrokApiKey("xai-test-key-123");
    await setNarrativeIntensity("high");
    await seedPlayerEntries("player-api-failure", 3);
    const grokClient = vi.fn(async (): Promise<GrokChatCompletionResult> => {
      throw new Error("xAI unavailable");
    });

    await expect(
      regenerateLegacySummary("player", "player-api-failure", INSTANCE_ID, {
        dependencies: { grokClient, now: () => FIXED_NOW },
      }),
    ).resolves.toMatchObject({
      status: "failed",
      error: "xAI unavailable",
    });
    await expect(getPlayerAlmanacCache("player-api-failure", INSTANCE_ID)).resolves.toMatchObject({
      legacySummary: "",
      summaryGeneratedAt: null,
      summaryFromEventCount: 0,
    });
    await expect(getUsageMonthToDate(FIXED_NOW)).resolves.toMatchObject({ totalCalls: 0 });
  });

  test("treats an up-to-date cache as a hit and regenerates after enough new entries create a miss", async () => {
    await setGrokApiKey("xai-test-key-123");
    await setNarrativeIntensity("medium");
    await seedPlayerEntries("player-cache", 5);
    await putPlayerAlmanacCache({
      playerId: "player-cache",
      instanceId: INSTANCE_ID,
      legacySummary: "Fresh enough for now.",
      summaryGeneratedAt: FIXED_NOW - 1000,
      summaryFromEventCount: 5,
      recentEventIds: ["player-cache-entry-4"],
    });
    const grokClient = createMockGrokClient("A refreshed cache-miss summary.");

    await expect(
      regenerateLegacySummary("player", "player-cache", INSTANCE_ID, {
        dependencies: { grokClient, now: () => FIXED_NOW },
      }),
    ).resolves.toMatchObject({
      status: "skipped_cache_hit",
      cacheEventCount: 5,
      eventCount: 5,
    });
    expect(grokClient).not.toHaveBeenCalled();

    await seedPlayerEntries("player-cache", 5, { startIndex: 5 });

    await expect(
      regenerateLegacySummary("player", "player-cache", INSTANCE_ID, {
        dependencies: { grokClient, now: () => FIXED_NOW },
      }),
    ).resolves.toMatchObject({
      status: "generated",
      cacheEventCount: 5,
      eventCount: 10,
      summary: "A refreshed cache-miss summary.",
    });
    expect(grokClient).toHaveBeenCalledTimes(1);
  });

  test("processes queued summary jobs by highest recent dramatic priority first", async () => {
    await setGrokApiKey("xai-test-key-123");
    await setNarrativeIntensity("high");
    await seedPlayerEntries("player-low-drama", 3, { gameIdPrefix: "low" });
    await seedPlayerEntries("player-high-drama", 3, {
      gameIdPrefix: "high",
      wpa: (index) => (index === 1 ? 0.61 : 0.04),
      dramaticWeight: (index) => (index === 1 ? 6 : 1),
    });
    const lowJob = await queueReporterLegacySummaryJob(
      "player",
      "player-low-drama",
      INSTANCE_ID,
      3,
      0,
      FIXED_NOW,
    );
    const highJob = await queueReporterLegacySummaryJob(
      "player",
      "player-high-drama",
      INSTANCE_ID,
      3,
      0,
      FIXED_NOW + 1,
    );
    const processedEntityIds: string[] = [];
    const grokClient = vi.fn(async (request: GrokChatCompletionRequest): Promise<GrokChatCompletionResult> => {
      const userPrompt = request.messages[1].content;
      processedEntityIds.push(userPrompt.includes("player-high-drama") ? "player-high-drama" : "player-low-drama");
      return {
        text: `Summary ${processedEntityIds.length}`,
        inputTokens: 100,
        outputTokens: 50,
        raw: {},
      };
    });

    await expect(
      processQueuedLegacySummaryJobs({
        dependencies: { grokClient, now: () => FIXED_NOW },
      }),
    ).resolves.toEqual([
      expect.objectContaining({ status: "generated", entityId: "player-high-drama" }),
      expect.objectContaining({ status: "generated", entityId: "player-low-drama" }),
    ]);
    expect(processedEntityIds).toEqual(["player-high-drama", "player-low-drama"]);
    await expect(getQueuedReporterLegacySummaryJobs()).resolves.not.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: highJob.id }),
        expect.objectContaining({ id: lowJob.id }),
      ]),
    );
  });

  test("parses a mocked Grok HTTP response and surfaces HTTP failures", async () => {
    const fetchImpl = vi.fn(async () =>
      new Response(
        JSON.stringify({
          choices: [{ message: { content: "HTTP summary" } }],
          usage: { prompt_tokens: 12, completion_tokens: 7 },
        }),
        { status: 200 },
      ),
    );

    await expect(
      callGrokChatCompletion({
        apiKey: "xai-test-key-123",
        model: "grok-4",
        messages: [{ role: "user", content: "Summarize this." }],
        fetchImpl,
      }),
    ).resolves.toMatchObject({
      text: "HTTP summary",
      inputTokens: 12,
      outputTokens: 7,
    });
    expect(fetchImpl).toHaveBeenCalledWith(
      "https://api.x.ai/v1/chat/completions",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer xai-test-key-123",
        }),
      }),
    );

    const failingFetch = vi.fn(async () => new Response("rate limited", { status: 429 }));
    await expect(
      callGrokChatCompletion({
        apiKey: "xai-test-key-123",
        model: "grok-4",
        messages: [{ role: "user", content: "Summarize this." }],
        fetchImpl: failingFetch,
      }),
    ).rejects.toMatchObject({
      name: "GrokApiError",
      status: 429,
    } satisfies Partial<GrokApiError>);
  });
});
