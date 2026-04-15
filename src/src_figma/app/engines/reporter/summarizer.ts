import type { CompetitionType } from "../../../../utils/gameStorage";
import {
  getPlayerAlmanacCache,
  getQueuedReporterLegacySummaryJobs,
  getReporterAlmanacEntriesForEntity,
  getTeamAlmanacCache,
  putPlayerAlmanacCache,
  putTeamAlmanacCache,
  removeReporterLegacySummaryJob,
  type ReporterAlmanacEntry,
  type ReporterAlmanacEntityType,
  type ReporterLegacySummaryJob,
  type ReporterPlayerAlmanacCache,
  type ReporterTeamAlmanacCache,
} from "../../../../utils/reporterAlmanacCacheStorage";
import { getNarrativeIntensity } from "../../../../utils/userPreferencesStorage";
import type { NarrativeIntensity } from "../../../../types/reporterPreferences";
import {
  callGrokChatCompletion,
  type GrokChatCompletionRequest,
  type GrokChatCompletionResult,
  type GrokChatMessage,
} from "./grokClient";
import { getNarrativeIntensityThresholds } from "./narrativeIntensity";
import {
  isWithinDailyCallLimit,
  logLlmCall,
  type LlmUsageLogEntry,
  type LlmUsageLogInput,
} from "./usageLogger";

export const GROK_LEGACY_SUMMARY_MODEL = "grok-4";

type AlmanacCache = ReporterPlayerAlmanacCache | ReporterTeamAlmanacCache;

export type LegacySummaryStatus =
  | "generated"
  | "skipped_cache_hit"
  | "skipped_rate_limited"
  | "failed";

export interface LegacySummaryDependencies {
  getIntensity?: () => Promise<NarrativeIntensity>;
  isWithinDailyCallLimit?: (now?: number) => Promise<boolean>;
  logUsage?: (entry: LlmUsageLogInput) => Promise<LlmUsageLogEntry>;
  grokClient?: (request: GrokChatCompletionRequest) => Promise<GrokChatCompletionResult>;
  now?: () => number;
}

export interface RegenerateLegacySummaryOptions {
  mode?: CompetitionType;
  jobId?: string;
  dependencies?: LegacySummaryDependencies;
}

export interface ProcessQueuedLegacySummaryJobsOptions {
  limit?: number;
  mode?: CompetitionType;
  dependencies?: LegacySummaryDependencies;
}

export interface LegacySummaryResult {
  status: LegacySummaryStatus;
  entityType: ReporterAlmanacEntityType;
  entityId: string;
  instanceId?: string;
  eventCount: number;
  cacheEventCount: number;
  threshold: number;
  summary?: string;
  cache?: AlmanacCache;
  usageLog?: LlmUsageLogEntry;
  error?: string;
}

export interface BuildLegacySummaryPromptParams {
  entityType: ReporterAlmanacEntityType;
  entityId: string;
  existingSummary: string;
  entriesSinceLastRegen: ReporterAlmanacEntry[];
}

interface SummaryTarget {
  promptEntityId: string;
  existingSummary: string;
  cacheEventCount: number;
}

function latestGameId(entries: ReporterAlmanacEntry[]): string | undefined {
  return entries
    .slice()
    .sort((left, right) => right.timestamp - left.timestamp)
    .find((entry) => entry.gameId)?.gameId;
}

function recentEventIds(entries: ReporterAlmanacEntry[]): string[] {
  return entries
    .slice()
    .sort((left, right) => right.timestamp - left.timestamp)
    .slice(0, 5)
    .map((entry) => entry.id);
}

function entryPriority(entry: ReporterAlmanacEntry): number {
  return Math.max(
    Math.abs(entry.wpa ?? 0),
    entry.dramaticWeight ?? 0,
    entry.leverageIndex ?? 0,
  );
}

function describeEntry(entry: ReporterAlmanacEntry): string {
  const date = new Date(entry.timestamp).toISOString();
  const game = entry.gameId ? ` game=${entry.gameId};` : "";
  const leverage = entry.leverageIndex !== undefined ? ` LI=${entry.leverageIndex};` : "";
  const wpa = entry.wpa !== undefined ? ` WPA=${entry.wpa};` : "";
  const drama = entry.dramaticWeight !== undefined ? ` drama=${entry.dramaticWeight};` : "";

  return `- ${date};${game}${leverage}${wpa}${drama} ${entry.headline}: ${entry.summary}`;
}

async function getSummaryTarget(
  entityType: ReporterAlmanacEntityType,
  entityId: string,
  instanceId: string | undefined,
): Promise<SummaryTarget> {
  if (entityType === "player") {
    const cache = await getPlayerAlmanacCache(entityId, instanceId);
    return {
      promptEntityId: entityId,
      existingSummary: cache?.legacySummary ?? "",
      cacheEventCount: cache?.summaryFromEventCount ?? 0,
    };
  }

  const cache = await getTeamAlmanacCache(entityId, instanceId);
  return {
    promptEntityId: entityId,
    existingSummary: cache?.legacySummary ?? "",
    cacheEventCount: cache?.summaryFromEventCount ?? 0,
  };
}

async function writeLegacySummaryCache(params: {
  entityType: ReporterAlmanacEntityType;
  entityId: string;
  instanceId?: string;
  summary: string;
  generatedAt: number;
  eventCount: number;
  entries: ReporterAlmanacEntry[];
}): Promise<AlmanacCache> {
  const common = {
    instanceId: params.instanceId,
    legacySummary: params.summary,
    summaryGeneratedAt: params.generatedAt,
    summaryFromEventCount: params.eventCount,
    recentEventIds: recentEventIds(params.entries),
    lastModified: params.generatedAt,
  };

  if (params.entityType === "player") {
    return putPlayerAlmanacCache({
      ...common,
      playerId: params.entityId,
    });
  }

  return putTeamAlmanacCache({
    ...common,
    teamId: params.entityId,
  });
}

function getDependencies(dependencies: LegacySummaryDependencies = {}): Required<LegacySummaryDependencies> {
  return {
    getIntensity: dependencies.getIntensity ?? getNarrativeIntensity,
    isWithinDailyCallLimit: dependencies.isWithinDailyCallLimit ?? isWithinDailyCallLimit,
    logUsage: dependencies.logUsage ?? logLlmCall,
    grokClient: dependencies.grokClient ?? callGrokChatCompletion,
    now: dependencies.now ?? Date.now,
  };
}

function resultBase(params: {
  status: LegacySummaryStatus;
  entityType: ReporterAlmanacEntityType;
  entityId: string;
  instanceId?: string;
  eventCount: number;
  cacheEventCount: number;
  threshold: number;
  error?: string;
}): LegacySummaryResult {
  return params;
}

export function buildLegacySummaryPrompt({
  entityType,
  entityId,
  existingSummary,
  entriesSinceLastRegen,
}: BuildLegacySummaryPromptParams): GrokChatMessage[] {
  const entityLabel = entityType === "player" ? `Player ${entityId}` : `Team ${entityId}`;
  const entryText = entriesSinceLastRegen.length > 0
    ? entriesSinceLastRegen.map(describeEntry).join("\n")
    : "- No new almanac entries.";

  return [
    {
      role: "system",
      content:
        "You are the KBL beat reporter almanac editor. Write factual baseball legacy summaries from supplied notes only.",
    },
    {
      role: "user",
      content: [
        `Entity: ${entityLabel}`,
        "Task: Replace the legacy summary with about 150 words.",
        "Style: vivid but grounded, no markdown, no invented stats, no future predictions.",
        `Existing summary: ${existingSummary || "No prior summary."}`,
        "New almanac entries since the last regeneration:",
        entryText,
      ].join("\n\n"),
    },
  ];
}

export async function regenerateLegacySummary(
  entityType: ReporterAlmanacEntityType,
  entityId: string,
  instanceId?: string,
  options: RegenerateLegacySummaryOptions = {},
): Promise<LegacySummaryResult> {
  const dependencies = getDependencies(options.dependencies);
  const now = dependencies.now();
  const [intensity, entries, target] = await Promise.all([
    dependencies.getIntensity(),
    getReporterAlmanacEntriesForEntity(entityType, entityId, instanceId),
    getSummaryTarget(entityType, entityId, instanceId),
  ]);
  const threshold = getNarrativeIntensityThresholds(intensity).summaryRegenDelta;
  const eventCount = entries.length;
  const delta = eventCount - target.cacheEventCount;

  if (delta < threshold) {
    return resultBase({
      status: "skipped_cache_hit",
      entityType,
      entityId,
      instanceId,
      eventCount,
      cacheEventCount: target.cacheEventCount,
      threshold,
    });
  }

  const withinDailyLimit = await dependencies.isWithinDailyCallLimit(now);
  if (!withinDailyLimit) {
    console.warn("[reporter:summarizer] Grok daily call safety rail reached; skipping legacy summary regen.");
    return resultBase({
      status: "skipped_rate_limited",
      entityType,
      entityId,
      instanceId,
      eventCount,
      cacheEventCount: target.cacheEventCount,
      threshold,
    });
  }

  const entriesSinceLastRegen = entries.slice(target.cacheEventCount);
  const gameId = latestGameId(entriesSinceLastRegen);
  const messages = buildLegacySummaryPrompt({
    entityType,
    entityId: target.promptEntityId,
    existingSummary: target.existingSummary,
    entriesSinceLastRegen,
  });

  try {
    const summaryResponse = await dependencies.grokClient({
      model: GROK_LEGACY_SUMMARY_MODEL,
      messages,
      intensity,
      purpose: "legacy_summary",
      gameId,
      mode: options.mode,
      temperature: 0.2,
      maxTokens: 260,
    });
    const usageLog = await dependencies.logUsage({
      timestamp: now,
      model: GROK_LEGACY_SUMMARY_MODEL,
      inputTokens: summaryResponse.inputTokens,
      outputTokens: summaryResponse.outputTokens,
      gameId,
      mode: options.mode,
      intensity,
      purpose: "legacy_summary",
    });
    const cache = await writeLegacySummaryCache({
      entityType,
      entityId,
      instanceId,
      summary: summaryResponse.text,
      generatedAt: now,
      eventCount,
      entries,
    });

    if (options.jobId) {
      await removeReporterLegacySummaryJob(options.jobId);
    }

    return {
      status: "generated",
      entityType,
      entityId,
      instanceId,
      eventCount,
      cacheEventCount: target.cacheEventCount,
      threshold,
      summary: summaryResponse.text,
      cache,
      usageLog,
    };
  } catch (error) {
    return resultBase({
      status: "failed",
      entityType,
      entityId,
      instanceId,
      eventCount,
      cacheEventCount: target.cacheEventCount,
      threshold,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

async function prioritizeJob(job: ReporterLegacySummaryJob): Promise<ReporterLegacySummaryJob & { priority: number }> {
  const entries = await getReporterAlmanacEntriesForEntity(job.entityType, job.entityId, job.instanceId);
  const entriesSinceCache = entries.slice(job.cacheEventCount);
  const priority = entriesSinceCache.reduce(
    (currentPriority, entry) => Math.max(currentPriority, entryPriority(entry)),
    0,
  );

  return { ...job, priority };
}

export async function processQueuedLegacySummaryJobs(
  options: ProcessQueuedLegacySummaryJobsOptions = {},
): Promise<LegacySummaryResult[]> {
  const jobs = await getQueuedReporterLegacySummaryJobs();
  const prioritizedJobs = await Promise.all(jobs.map(prioritizeJob));
  const selectedJobs = prioritizedJobs
    .sort((left, right) => right.priority - left.priority || left.queuedAt - right.queuedAt)
    .slice(0, options.limit ?? prioritizedJobs.length);

  const results: LegacySummaryResult[] = [];
  for (const job of selectedJobs) {
    results.push(
      await regenerateLegacySummary(job.entityType, job.entityId, job.instanceId, {
        mode: options.mode,
        jobId: job.id,
        dependencies: options.dependencies,
      }),
    );
  }

  return results;
}
