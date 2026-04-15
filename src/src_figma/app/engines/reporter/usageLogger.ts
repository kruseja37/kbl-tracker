import type { CompetitionType } from "../../../../utils/gameStorage";
import { getTrackerDb } from "../../../../utils/trackerDb";
import type { NarrativeIntensity } from "../../../../types/reporterPreferences";
import { calculateLlmCostUsd, getReporterModelPricing } from "./pricing";

const STORE = "llmUsageLog";
const DAILY_GROK_CALL_LIMIT = 500;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

export type LlmUsagePurpose =
  | "legacy_summary"
  | "commentary"
  | "between_inning_summary"
  | "post_game_column"
  | "storyline_refinement";

export interface LlmUsageLogEntry {
  id: string;
  timestamp: number;
  model: string;
  provider: "grok" | "anthropic";
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  gameId?: string;
  mode?: CompetitionType;
  intensity: NarrativeIntensity;
  purpose: LlmUsagePurpose;
}

export interface LlmUsageLogInput {
  timestamp?: number;
  model: string;
  inputTokens: number;
  outputTokens: number;
  gameId?: string;
  mode?: CompetitionType;
  intensity: NarrativeIntensity;
  purpose: LlmUsagePurpose;
}

export interface UsageSummary {
  totalCostUsd: number;
  totalCalls: number;
  inputTokens: number;
  outputTokens: number;
  grokCalls: number;
  claudeCalls: number;
}

export interface PerGameUsageAverage {
  games: number;
  averageCostUsd: number;
  averageCalls: number;
}

export interface PerIntensityUsage extends UsageSummary {
  intensity: NarrativeIntensity;
  games: number;
  averageCostPerGameUsd: number;
}

export interface RecentGameUsage {
  gameId: string;
  mode?: CompetitionType;
  intensity: NarrativeIntensity;
  lastTimestamp: number;
  totalCostUsd: number;
  callCount: number;
  inputTokens: number;
  outputTokens: number;
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transactionToPromise(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

function createUsageId(entry: LlmUsageLogInput, timestamp: number): string {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Math.random().toString(36).slice(2)}-${timestamp}`;

  return `llm:${entry.purpose}:${entry.gameId ?? "global"}:${timestamp}:${random}`;
}

function emptySummary(): UsageSummary {
  return {
    totalCostUsd: 0,
    totalCalls: 0,
    inputTokens: 0,
    outputTokens: 0,
    grokCalls: 0,
    claudeCalls: 0,
  };
}

function roundCurrency(value: number): number {
  return Number(value.toFixed(6));
}

function summarize(entries: LlmUsageLogEntry[]): UsageSummary {
  return entries.reduce((summary, entry) => {
    summary.totalCostUsd = roundCurrency(summary.totalCostUsd + entry.costUsd);
    summary.totalCalls += 1;
    summary.inputTokens += entry.inputTokens;
    summary.outputTokens += entry.outputTokens;
    if (entry.provider === "grok") summary.grokCalls += 1;
    if (entry.provider === "anthropic") summary.claudeCalls += 1;
    return summary;
  }, emptySummary());
}

function startOfMonth(timestamp: number): number {
  const date = new Date(timestamp);
  return new Date(date.getFullYear(), date.getMonth(), 1).getTime();
}

function startOfDay(timestamp: number): number {
  const date = new Date(timestamp);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

async function getAllUsageEntries(): Promise<LlmUsageLogEntry[]> {
  const db = await getTrackerDb();
  const tx = db.transaction(STORE, "readonly");
  const entries = await requestToPromise<LlmUsageLogEntry[]>(
    tx.objectStore(STORE).getAll(),
  );
  await transactionToPromise(tx);

  return entries;
}

export async function logLlmCall(entry: LlmUsageLogInput): Promise<LlmUsageLogEntry> {
  const timestamp = entry.timestamp ?? Date.now();
  const pricing = getReporterModelPricing(entry.model);
  const storedEntry: LlmUsageLogEntry = {
    ...entry,
    id: createUsageId(entry, timestamp),
    timestamp,
    provider: pricing.provider,
    costUsd: calculateLlmCostUsd(entry),
  };
  const db = await getTrackerDb();
  const tx = db.transaction(STORE, "readwrite");

  await requestToPromise(tx.objectStore(STORE).put(storedEntry));
  await transactionToPromise(tx);

  return storedEntry;
}

export async function getUsageMonthToDate(now = Date.now()): Promise<UsageSummary> {
  const monthStart = startOfMonth(now);
  const entries = (await getAllUsageEntries()).filter(
    (entry) => entry.timestamp >= monthStart && entry.timestamp <= now,
  );

  return summarize(entries);
}

export async function getUsagePerGameAverage(
  mode?: CompetitionType,
  now = Date.now(),
): Promise<PerGameUsageAverage> {
  const windowStart = now - THIRTY_DAYS_MS;
  const entries = (await getAllUsageEntries()).filter(
    (entry) =>
      entry.timestamp >= windowStart &&
      entry.timestamp <= now &&
      entry.gameId &&
      (!mode || entry.mode === mode),
  );
  const byGame = new Map<string, LlmUsageLogEntry[]>();

  for (const entry of entries) {
    const gameEntries = byGame.get(entry.gameId!) ?? [];
    gameEntries.push(entry);
    byGame.set(entry.gameId!, gameEntries);
  }

  const games = byGame.size;
  if (games === 0) {
    return { games: 0, averageCostUsd: 0, averageCalls: 0 };
  }

  const summary = summarize(entries);

  return {
    games,
    averageCostUsd: roundCurrency(summary.totalCostUsd / games),
    averageCalls: Number((summary.totalCalls / games).toFixed(2)),
  };
}

export async function getUsagePerIntensity(
  intensity: NarrativeIntensity,
): Promise<PerIntensityUsage> {
  const entries = (await getAllUsageEntries()).filter((entry) => entry.intensity === intensity);
  const summary = summarize(entries);
  const games = new Set(entries.map((entry) => entry.gameId).filter(Boolean)).size;

  return {
    ...summary,
    intensity,
    games,
    averageCostPerGameUsd: games > 0 ? roundCurrency(summary.totalCostUsd / games) : 0,
  };
}

export async function getRecentGamesUsage(limit: number): Promise<RecentGameUsage[]> {
  const entries = (await getAllUsageEntries()).filter((entry) => entry.gameId);
  const byGame = new Map<string, LlmUsageLogEntry[]>();

  for (const entry of entries) {
    const gameEntries = byGame.get(entry.gameId!) ?? [];
    gameEntries.push(entry);
    byGame.set(entry.gameId!, gameEntries);
  }

  return Array.from(byGame.entries())
    .map(([gameId, gameEntries]) => {
      const sorted = gameEntries.slice().sort((left, right) => right.timestamp - left.timestamp);
      const latest = sorted[0];
      const summary = summarize(gameEntries);

      return {
        gameId,
        mode: latest.mode,
        intensity: latest.intensity,
        lastTimestamp: latest.timestamp,
        totalCostUsd: summary.totalCostUsd,
        callCount: summary.totalCalls,
        inputTokens: summary.inputTokens,
        outputTokens: summary.outputTokens,
      };
    })
    .sort((left, right) => right.lastTimestamp - left.lastTimestamp)
    .slice(0, limit);
}

export async function isWithinDailyCallLimit(now = Date.now()): Promise<boolean> {
  const dayStart = startOfDay(now);
  const grokCallsToday = (await getAllUsageEntries()).filter(
    (entry) =>
      entry.provider === "grok" &&
      entry.timestamp >= dayStart &&
      entry.timestamp <= now,
  ).length;

  return grokCallsToday < DAILY_GROK_CALL_LIMIT;
}
