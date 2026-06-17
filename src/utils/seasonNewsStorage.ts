import type { NarrativeEventType } from "../engines/narrativeEngine";
import type { SeasonNewsItem } from "../types/reporter";
import { syncEngine } from "./syncEngine";
import { openTrackerDb } from "./trackerDb";

const DB_NAME = "kbl-tracker";
const STORE = "seasonNewsItems";

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

  return new Error(`[seasonNewsStorage] Failed to ${action}: ${message}`);
}

function seasonNewsKey(record: Pick<SeasonNewsItem, "franchiseId" | "seasonId" | "id">): [string, string, string] {
  return [record.franchiseId, record.seasonId, record.id];
}

export async function persistSeasonNewsItem(record: SeasonNewsItem): Promise<void> {
  const persistedRecord: SeasonNewsItem = {
    ...record,
    changed_at: record.changed_at ?? Date.now(),
  };

  try {
    const db = await openTrackerDb();
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    await requestToPromise(store.put(persistedRecord));
    await transactionToPromise(tx);

    if (!syncEngine.isSuppressed()) {
      syncEngine.upsert(
        DB_NAME,
        STORE,
        seasonNewsKey(persistedRecord),
        persistedRecord,
      );
    }
  } catch (error) {
    throw toStorageError(`persist season news item ${record.id}`, error);
  }
}

export async function listSeasonNewsItemsForFranchiseSeason(
  franchiseId: string,
  seasonId: string,
): Promise<SeasonNewsItem[]> {
  try {
    const db = await openTrackerDb();
    const tx = db.transaction(STORE, "readonly");
    const store = tx.objectStore(STORE);
    const index = store.index("by_scope");
    const entries = (
      (await requestToPromise(
        index.getAll(IDBKeyRange.only([franchiseId, seasonId])),
      )) as SeasonNewsItem[]
    )
      .filter((entry) => entry.deleted !== true)
      .sort((left, right) => right.createdAt - left.createdAt);

    await transactionToPromise(tx);
    return entries;
  } catch (error) {
    throw toStorageError(
      `list season news for franchise ${franchiseId} season ${seasonId}`,
      error,
    );
  }
}

export async function listSeasonNewsItemsByEvent(
  franchiseId: string,
  seasonId: string,
  eventType: NarrativeEventType,
): Promise<SeasonNewsItem[]> {
  try {
    const db = await openTrackerDb();
    const tx = db.transaction(STORE, "readonly");
    const store = tx.objectStore(STORE);
    const index = store.index("by_event");
    const entries = (
      (await requestToPromise(
        index.getAll(IDBKeyRange.only([franchiseId, seasonId, eventType])),
      )) as SeasonNewsItem[]
    )
      .filter((entry) => entry.deleted !== true)
      .sort((left, right) => right.createdAt - left.createdAt);

    await transactionToPromise(tx);
    return entries;
  } catch (error) {
    throw toStorageError(
      `list season news for franchise ${franchiseId} season ${seasonId} event ${eventType}`,
      error,
    );
  }
}

export async function deleteSeasonNewsItem(
  franchiseId: string,
  seasonId: string,
  id: string,
): Promise<void> {
  try {
    const db = await openTrackerDb();
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    const key: [string, string, string] = [franchiseId, seasonId, id];
    const existing =
      ((await requestToPromise(store.get(key))) as SeasonNewsItem | undefined) ??
      null;

    if (!existing) {
      throw new Error(`Season news item not found: ${id}`);
    }

    const deletedRecord: SeasonNewsItem = {
      ...existing,
      deleted: true,
      changed_at: Date.now(),
    };

    await requestToPromise(store.put(deletedRecord));
    await transactionToPromise(tx);

    if (!syncEngine.isSuppressed()) {
      syncEngine.upsert(DB_NAME, STORE, key, deletedRecord);
    }
  } catch (error) {
    throw toStorageError(`delete season news item ${id}`, error);
  }
}
