import { syncEngine } from "./syncEngine";
import { getTrackerDb } from "./trackerDb";

const PLAYER_CACHE_STORE = "reporterPlayerAlmanacCaches";
const TEAM_CACHE_STORE = "reporterTeamAlmanacCaches";
const ENTRY_STORE = "reporterAlmanacEntries";
const SUMMARY_JOB_STORE = "reporterLegacySummaryJobs";
const GLOBAL_INSTANCE_ID = "__global__";
const DEFAULT_REGEN_THRESHOLD = 5;
const RECENT_EVENT_ID_LIMIT = 5;

export type ReporterAlmanacEntityType = "player" | "team";
export type ReporterLegacySummaryJobStatus = "queued";

interface ReporterAlmanacCacheBase {
  cacheKey: string;
  instanceId?: string;
  legacySummary: string;
  summaryGeneratedAt: number | null;
  summaryFromEventCount: number;
  recentEventIds: string[];
  lastModified: number;
}

export interface ReporterPlayerAlmanacCache extends ReporterAlmanacCacheBase {
  playerId: string;
}

export interface ReporterTeamAlmanacCache extends ReporterAlmanacCacheBase {
  teamId: string;
}

export interface ReporterAlmanacEntry {
  id: string;
  entityType: ReporterAlmanacEntityType;
  entityId: string;
  entityKey: string;
  instanceId?: string;
  gameId?: string;
  timestamp: number;
  headline: string;
  summary: string;
  wpa?: number;
  leverageIndex?: number;
  dramaticWeight?: number;
}

export interface ReporterAlmanacEntryInput {
  id?: string;
  entityType: ReporterAlmanacEntityType;
  entityId: string;
  instanceId?: string;
  gameId?: string;
  timestamp?: number;
  headline: string;
  summary: string;
  wpa?: number;
  leverageIndex?: number;
  dramaticWeight?: number;
}

export interface ReporterLegacySummaryJob {
  id: string;
  entityType: ReporterAlmanacEntityType;
  entityId: string;
  entityKey: string;
  instanceId?: string;
  status: ReporterLegacySummaryJobStatus;
  reason: "EVENT_THRESHOLD";
  queuedAt: number;
  eventCount: number;
  cacheEventCount: number;
}

export interface MaybeRegenerateLegacyOptions {
  threshold?: number;
  now?: number;
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

function createEntityKey(entityType: ReporterAlmanacEntityType, entityId: string, instanceId?: string): string {
  return `${entityType}:${instanceId ?? GLOBAL_INSTANCE_ID}:${entityId}`;
}

function cacheStoreName(entityType: ReporterAlmanacEntityType): typeof PLAYER_CACHE_STORE | typeof TEAM_CACHE_STORE {
  return entityType === "player" ? PLAYER_CACHE_STORE : TEAM_CACHE_STORE;
}

function createEmptyCache(
  entityType: ReporterAlmanacEntityType,
  entityId: string,
  instanceId: string | undefined,
  now: number,
): ReporterPlayerAlmanacCache | ReporterTeamAlmanacCache {
  const base = {
    cacheKey: createEntityKey(entityType, entityId, instanceId),
    instanceId,
    legacySummary: "",
    summaryGeneratedAt: null,
    summaryFromEventCount: 0,
    recentEventIds: [],
    lastModified: now,
  };

  return entityType === "player"
    ? { ...base, playerId: entityId }
    : { ...base, teamId: entityId };
}

function createEntry(input: ReporterAlmanacEntryInput): ReporterAlmanacEntry {
  const timestamp = input.timestamp ?? Date.now();
  return {
    ...input,
    id: input.id ?? `${input.entityType}:${input.entityId}:${timestamp}`,
    entityKey: createEntityKey(input.entityType, input.entityId, input.instanceId),
    timestamp,
  };
}

function createSummaryJob(params: {
  entityType: ReporterAlmanacEntityType;
  entityId: string;
  instanceId?: string;
  eventCount: number;
  cacheEventCount: number;
  queuedAt: number;
}): ReporterLegacySummaryJob {
  const entityKey = createEntityKey(params.entityType, params.entityId, params.instanceId);

  return {
    id: `${entityKey}:${params.eventCount}`,
    entityType: params.entityType,
    entityId: params.entityId,
    entityKey,
    instanceId: params.instanceId,
    status: "queued",
    reason: "EVENT_THRESHOLD",
    queuedAt: params.queuedAt,
    eventCount: params.eventCount,
    cacheEventCount: params.cacheEventCount,
  };
}

async function getCache(
  entityType: ReporterAlmanacEntityType,
  entityId: string,
  instanceId?: string,
): Promise<ReporterPlayerAlmanacCache | ReporterTeamAlmanacCache | null> {
  const db = await getTrackerDb();
  const tx = db.transaction(cacheStoreName(entityType), "readonly");
  const cache = await requestToPromise<ReporterPlayerAlmanacCache | ReporterTeamAlmanacCache | undefined>(
    tx.objectStore(cacheStoreName(entityType)).get(createEntityKey(entityType, entityId, instanceId)),
  );
  await transactionToPromise(tx);

  return cache ?? null;
}

async function persistCache<TCache extends ReporterPlayerAlmanacCache | ReporterTeamAlmanacCache>(
  storeName: typeof PLAYER_CACHE_STORE | typeof TEAM_CACHE_STORE,
  cache: TCache,
): Promise<TCache> {
  const db = await getTrackerDb();
  const tx = db.transaction(storeName, "readwrite");

  await requestToPromise(tx.objectStore(storeName).put(cache));
  await transactionToPromise(tx);

  if (!syncEngine.isSuppressed()) {
    syncEngine.upsert("kbl-tracker", storeName, cache.cacheKey, cache);
  }

  return cache;
}

async function countEntries(
  entityType: ReporterAlmanacEntityType,
  entityId: string,
  instanceId?: string,
): Promise<number> {
  const db = await getTrackerDb();
  const tx = db.transaction(ENTRY_STORE, "readonly");
  const count = await requestToPromise(
    tx.objectStore(ENTRY_STORE).index("entityKey").count(createEntityKey(entityType, entityId, instanceId)),
  );
  await transactionToPromise(tx);

  return count;
}

export async function getPlayerAlmanacCache(
  playerId: string,
  instanceId?: string,
): Promise<ReporterPlayerAlmanacCache | null> {
  return getCache("player", playerId, instanceId) as Promise<ReporterPlayerAlmanacCache | null>;
}

export async function putPlayerAlmanacCache(
  cache: Omit<ReporterPlayerAlmanacCache, "cacheKey" | "lastModified"> &
    Partial<Pick<ReporterPlayerAlmanacCache, "cacheKey" | "lastModified">>,
): Promise<ReporterPlayerAlmanacCache> {
  return persistCache(PLAYER_CACHE_STORE, {
    ...cache,
    cacheKey: createEntityKey("player", cache.playerId, cache.instanceId),
    recentEventIds: [...cache.recentEventIds],
    lastModified: cache.lastModified ?? Date.now(),
  });
}

export async function getTeamAlmanacCache(
  teamId: string,
  instanceId?: string,
): Promise<ReporterTeamAlmanacCache | null> {
  return getCache("team", teamId, instanceId) as Promise<ReporterTeamAlmanacCache | null>;
}

export async function putTeamAlmanacCache(
  cache: Omit<ReporterTeamAlmanacCache, "cacheKey" | "lastModified"> &
    Partial<Pick<ReporterTeamAlmanacCache, "cacheKey" | "lastModified">>,
): Promise<ReporterTeamAlmanacCache> {
  return persistCache(TEAM_CACHE_STORE, {
    ...cache,
    cacheKey: createEntityKey("team", cache.teamId, cache.instanceId),
    recentEventIds: [...cache.recentEventIds],
    lastModified: cache.lastModified ?? Date.now(),
  });
}

export async function getPlayerLegacySummary(playerId: string, instanceId?: string): Promise<string | null> {
  const cache = await getPlayerAlmanacCache(playerId, instanceId);
  return cache?.legacySummary || null;
}

export async function getTeamLegacySummary(teamId: string, instanceId?: string): Promise<string | null> {
  const cache = await getTeamAlmanacCache(teamId, instanceId);
  return cache?.legacySummary || null;
}

export async function getRecentReporterAlmanacEntries(
  entityType: ReporterAlmanacEntityType,
  entityId: string,
  instanceId?: string,
  limit = RECENT_EVENT_ID_LIMIT,
): Promise<ReporterAlmanacEntry[]> {
  const db = await getTrackerDb();
  const tx = db.transaction(ENTRY_STORE, "readonly");
  const entries = await requestToPromise<ReporterAlmanacEntry[]>(
    tx.objectStore(ENTRY_STORE).index("entityKey").getAll(createEntityKey(entityType, entityId, instanceId)),
  );
  await transactionToPromise(tx);

  return entries
    .sort((left, right) => right.timestamp - left.timestamp)
    .slice(0, limit)
    .map((entry) => ({ ...entry }));
}

export async function getReporterAlmanacEntriesForEntity(
  entityType: ReporterAlmanacEntityType,
  entityId: string,
  instanceId?: string,
): Promise<ReporterAlmanacEntry[]> {
  const db = await getTrackerDb();
  const tx = db.transaction(ENTRY_STORE, "readonly");
  const entries = await requestToPromise<ReporterAlmanacEntry[]>(
    tx.objectStore(ENTRY_STORE).index("entityKey").getAll(createEntityKey(entityType, entityId, instanceId)),
  );
  await transactionToPromise(tx);

  return entries
    .sort((left, right) => left.timestamp - right.timestamp)
    .map((entry) => ({ ...entry }));
}

export async function getReporterAlmanacEntryCount(
  entityType: ReporterAlmanacEntityType,
  entityId: string,
  instanceId?: string,
): Promise<number> {
  return countEntries(entityType, entityId, instanceId);
}

export async function getRecentPlayerAlmanac(playerId: string, instanceId?: string): Promise<ReporterAlmanacEntry[]> {
  return getRecentReporterAlmanacEntries("player", playerId, instanceId);
}

export async function getRecentTeamAlmanac(teamId: string, instanceId?: string): Promise<ReporterAlmanacEntry[]> {
  return getRecentReporterAlmanacEntries("team", teamId, instanceId);
}

export async function getQueuedReporterLegacySummaryJobs(): Promise<ReporterLegacySummaryJob[]> {
  const db = await getTrackerDb();
  const tx = db.transaction(SUMMARY_JOB_STORE, "readonly");
  const jobs = await requestToPromise<ReporterLegacySummaryJob[]>(
    tx.objectStore(SUMMARY_JOB_STORE).index("status").getAll("queued"),
  );
  await transactionToPromise(tx);

  return jobs.sort((left, right) => left.queuedAt - right.queuedAt);
}

export async function removeReporterLegacySummaryJob(jobId: string): Promise<void> {
  const db = await getTrackerDb();
  const tx = db.transaction(SUMMARY_JOB_STORE, "readwrite");

  await requestToPromise(tx.objectStore(SUMMARY_JOB_STORE).delete(jobId));
  await transactionToPromise(tx);

  if (!syncEngine.isSuppressed()) {
    syncEngine.remove("kbl-tracker", SUMMARY_JOB_STORE, jobId);
  }
}

export async function queueReporterLegacySummaryJob(
  entityType: ReporterAlmanacEntityType,
  entityId: string,
  instanceId: string | undefined,
  eventCount: number,
  cacheEventCount: number,
  queuedAt = Date.now(),
): Promise<ReporterLegacySummaryJob> {
  const job = createSummaryJob({
    entityType,
    entityId,
    instanceId,
    eventCount,
    cacheEventCount,
    queuedAt,
  });
  const db = await getTrackerDb();
  const tx = db.transaction(SUMMARY_JOB_STORE, "readwrite");

  await requestToPromise(tx.objectStore(SUMMARY_JOB_STORE).put(job));
  await transactionToPromise(tx);

  if (!syncEngine.isSuppressed()) {
    syncEngine.upsert("kbl-tracker", SUMMARY_JOB_STORE, job.id, job);
  }

  return job;
}

export async function maybeRegenerateLegacy(
  entityType: ReporterAlmanacEntityType,
  entityId: string,
  instanceId?: string,
  options: MaybeRegenerateLegacyOptions = {},
): Promise<ReporterLegacySummaryJob | null> {
  const threshold = options.threshold ?? DEFAULT_REGEN_THRESHOLD;
  const now = options.now ?? Date.now();
  const [cache, eventCount] = await Promise.all([
    getCache(entityType, entityId, instanceId),
    countEntries(entityType, entityId, instanceId),
  ]);
  const cacheEventCount = cache?.summaryFromEventCount ?? 0;

  if (eventCount - cacheEventCount < threshold) {
    return null;
  }

  return queueReporterLegacySummaryJob(entityType, entityId, instanceId, eventCount, cacheEventCount, now);
}

export async function addReporterAlmanacEntry(
  input: ReporterAlmanacEntryInput,
  options: MaybeRegenerateLegacyOptions = {},
): Promise<{
  entry: ReporterAlmanacEntry;
  queuedJob: ReporterLegacySummaryJob | null;
}> {
  const entry = createEntry(input);
  const db = await getTrackerDb();
  const tx = db.transaction([ENTRY_STORE, cacheStoreName(entry.entityType)], "readwrite");
  const entryStore = tx.objectStore(ENTRY_STORE);
  const cacheStore = tx.objectStore(cacheStoreName(entry.entityType));
  const cacheKey = createEntityKey(entry.entityType, entry.entityId, entry.instanceId);

  await requestToPromise(entryStore.put(entry));

  const existingCache = await requestToPromise<ReporterPlayerAlmanacCache | ReporterTeamAlmanacCache | undefined>(
    cacheStore.get(cacheKey),
  );
  const cache = existingCache ?? createEmptyCache(entry.entityType, entry.entityId, entry.instanceId, entry.timestamp);
  const updatedCache = {
    ...cache,
    recentEventIds: [entry.id, ...cache.recentEventIds.filter((eventId) => eventId !== entry.id)].slice(
      0,
      RECENT_EVENT_ID_LIMIT,
    ),
    lastModified: entry.timestamp,
  };

  await requestToPromise(cacheStore.put(updatedCache));
  await transactionToPromise(tx);

  if (!syncEngine.isSuppressed()) {
    syncEngine.upsert("kbl-tracker", ENTRY_STORE, entry.id, entry);
    syncEngine.upsert(
      "kbl-tracker",
      cacheStoreName(entry.entityType),
      updatedCache.cacheKey,
      updatedCache,
    );
  }

  return {
    entry,
    queuedJob: await maybeRegenerateLegacy(entry.entityType, entry.entityId, entry.instanceId, options),
  };
}
