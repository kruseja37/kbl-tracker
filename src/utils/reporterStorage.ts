import type { BeatReporter } from "../types/reporter";
import type { MoodState } from "../engines/moodEngine";
import { syncEngine } from "./syncEngine";
import { getTrackerDb } from "./trackerDb";

const DB_NAME = "kbl-tracker";
const STORE = "reporters";

type ReporterCreateInput = Omit<BeatReporter, "id" | "changed_at">;

export type ReporterMoodPatch = Partial<MoodState>;

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

function createId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `reporter-${Date.now().toString(36)}`;
}

async function persistReporter(reporter: BeatReporter): Promise<BeatReporter> {
  const db = await getTrackerDb();
  const tx = db.transaction(STORE, "readwrite");
  const store = tx.objectStore(STORE);

  await requestToPromise(store.put(reporter));
  await transactionToPromise(tx);

  if (!syncEngine.isSuppressed()) {
    syncEngine.upsert(DB_NAME, STORE, reporter.id, reporter);
  }

  return reporter;
}

export async function createReporter(input: ReporterCreateInput): Promise<BeatReporter> {
  const now = Date.now();
  const reporter: BeatReporter = {
    ...input,
    id: createId(),
    updatedAt: now,
    changed_at: now,
  };

  return persistReporter(reporter);
}

export async function getReporter(id: string): Promise<BeatReporter | null> {
  const db = await getTrackerDb();
  const tx = db.transaction(STORE, "readonly");
  const store = tx.objectStore(STORE);
  const reporter = ((await requestToPromise(store.get(id))) as BeatReporter | undefined) ?? null;

  await transactionToPromise(tx);
  return reporter;
}

export async function getReporterForTeam(
  teamId: string,
  leagueId?: string,
): Promise<BeatReporter | null> {
  const reporters = await listReporters({ teamId, leagueId });
  return reporters[0] ?? null;
}

export async function updateReporterMood(
  id: string,
  moodPatch: ReporterMoodPatch,
): Promise<BeatReporter> {
  const existing = await getReporter(id);

  if (!existing) {
    throw new Error(`Reporter not found: ${id}`);
  }

  const now = Date.now();
  const updated = {
    ...existing,
    ...moodPatch,
    updatedAt: now,
    changed_at: now,
  } as BeatReporter;

  return persistReporter(updated);
}

export async function listReporters(filter: {
  leagueId?: string;
  teamId?: string;
} = {}): Promise<BeatReporter[]> {
  const db = await getTrackerDb();
  const tx = db.transaction(STORE, "readonly");
  const store = tx.objectStore(STORE);
  const reporters = ((await requestToPromise(store.getAll())) as BeatReporter[]).filter((reporter) => {
    if (filter.leagueId !== undefined && reporter.leagueId !== filter.leagueId) return false;
    if (filter.teamId !== undefined && reporter.teamId !== filter.teamId) return false;
    return !reporter.deleted;
  });

  await transactionToPromise(tx);
  return reporters;
}
