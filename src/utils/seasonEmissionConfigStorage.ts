import type { SeasonEmissionConfig } from "../types/reporter";
import { openTrackerDb } from "./trackerDb";
import { syncEngine } from "./syncEngine";

const DB_NAME = "kbl-tracker";
const STORE = "seasonEmissionConfig";
const DEFAULT_CONFIG_ID = "default";

export const DEFAULT_SEASON_EMISSION_CONFIG: SeasonEmissionConfig = {
  id: DEFAULT_CONFIG_ID,
  marqueeOnly: true,
  perEventRate: {},
  raceTopN: 3,
  simWritable: true,
  lastModified: 0,
};

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

function toStorageError(action: string, error: unknown): Error {
  const message =
    error instanceof Error
      ? error.message
      : error instanceof DOMException
        ? error.message
        : String(error ?? "unknown error");

  return new Error(`[seasonEmissionConfigStorage] Failed to ${action}: ${message}`);
}

export async function loadSeasonEmissionConfig(): Promise<SeasonEmissionConfig> {
  try {
    const db = await openTrackerDb();
    const tx = db.transaction(STORE, "readonly");
    const store = tx.objectStore(STORE);
    const record =
      ((await requestToPromise(
        store.get(DEFAULT_CONFIG_ID),
      )) as SeasonEmissionConfig | undefined) ?? null;
    await transactionToPromise(tx);

    return record ?? { ...DEFAULT_SEASON_EMISSION_CONFIG };
  } catch (error) {
    throw toStorageError("load season emission config", error);
  }
}

export async function saveSeasonEmissionConfig(
  partial: Partial<SeasonEmissionConfig>,
): Promise<SeasonEmissionConfig> {
  try {
    const current = await loadSeasonEmissionConfig();
    const next: SeasonEmissionConfig = {
      ...current,
      ...partial,
      id: DEFAULT_CONFIG_ID,
      perEventRate: partial.perEventRate ?? current.perEventRate,
      lastModified: Date.now(),
    };

    const db = await openTrackerDb();
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    await requestToPromise(store.put(next));
    await transactionToPromise(tx);

    if (!syncEngine.isSuppressed()) {
      syncEngine.upsert(DB_NAME, STORE, next.id, next);
    }

    return next;
  } catch (error) {
    throw toStorageError("save season emission config", error);
  }
}
