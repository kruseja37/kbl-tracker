import type { CommentaryFeedEntryRecord } from "../types/reporter";
import { syncEngine } from "./syncEngine";
import { openTrackerDb } from "./trackerDb";

const DB_NAME = "kbl-tracker";
const STORE = "commentaryFeedEntries";

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

  return new Error(`[commentaryFeedStorage] Failed to ${action}: ${message}`);
}

export async function persistCommentaryFeedEntry(
  record: CommentaryFeedEntryRecord,
): Promise<void> {
  const { kind, ...rest } = record;
  const persistedRecord: CommentaryFeedEntryRecord = {
    ...rest,
    changed_at: record.changed_at ?? Date.now(),
    ...(kind ? { kind } : {}),
  };

  try {
    const db = await openTrackerDb();
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    const isPreambleRecord =
      persistedRecord.halfInningLabel === "PRE" ||
      persistedRecord.id.startsWith("commentary-pre-");
    const existingRecord = isPreambleRecord
      ? ((await requestToPromise(store.get(persistedRecord.id))) as
          | CommentaryFeedEntryRecord
          | undefined) ?? null
      : null;

    if (isPreambleRecord) {
      console.log("[repdbg] persistCommentaryFeedEntry PRE", {
        id: persistedRecord.id,
        gameId: persistedRecord.gameId,
        alreadyExisted: existingRecord !== null,
      });
    }

    await requestToPromise(store.put(persistedRecord));
    await transactionToPromise(tx);

    if (!syncEngine.isSuppressed()) {
      syncEngine.upsert(DB_NAME, STORE, persistedRecord.id, persistedRecord);
    }
  } catch (error) {
    throw toStorageError(`persist commentary feed entry ${record.id}`, error);
  }
}

export async function listCommentaryFeedEntriesForGame(
  gameId: string,
): Promise<CommentaryFeedEntryRecord[]> {
  try {
    const db = await openTrackerDb();
    const tx = db.transaction(STORE, "readonly");
    const store = tx.objectStore(STORE);
    const index = store.index("gameId");
    const entries =
      ((await requestToPromise(index.getAll(IDBKeyRange.only(gameId)))) as CommentaryFeedEntryRecord[])
        .filter((entry) => entry.deleted !== true)
        .sort((left, right) => left.timestamp - right.timestamp);

    await transactionToPromise(tx);
    return entries;
  } catch (error) {
    throw toStorageError(`list commentary feed entries for game ${gameId}`, error);
  }
}

export async function deleteCommentaryFeedEntry(id: string): Promise<void> {
  try {
    const db = await openTrackerDb();
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    const existing =
      ((await requestToPromise(store.get(id))) as CommentaryFeedEntryRecord | undefined) ?? null;

    if (!existing) {
      throw new Error(`Commentary feed entry not found: ${id}`);
    }

    const deletedRecord: CommentaryFeedEntryRecord = {
      ...existing,
      deleted: true,
      changed_at: Date.now(),
    };

    await requestToPromise(store.put(deletedRecord));
    await transactionToPromise(tx);

    if (!syncEngine.isSuppressed()) {
      syncEngine.upsert(DB_NAME, STORE, deletedRecord.id, deletedRecord);
    }
  } catch (error) {
    throw toStorageError(`delete commentary feed entry ${id}`, error);
  }
}
