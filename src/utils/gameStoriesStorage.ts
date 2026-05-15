import type { GameStory, ReporterGameMode } from "../types/reporter";
import { syncEngine } from "./syncEngine";
import { openTrackerDb } from "./trackerDb";

const DB_NAME = "kbl-tracker";
const STORE = "gameStories";

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

  return new Error(`[gameStoriesStorage] Failed to ${action}: ${message}`);
}

/**
 * Writes a post-game column to the `gameStories` IDB store and queues a sync
 * push. Stores are shared with J-phase work per spec §12.1; this is the first
 * path that actually writes to the store.
 */
export async function persistGameStory(record: GameStory): Promise<void> {
  const persistedRecord: GameStory = {
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
      syncEngine.upsert(DB_NAME, STORE, persistedRecord.id, persistedRecord);
    }
  } catch (error) {
    throw toStorageError(`persist game story ${record.id}`, error);
  }
}

/** All columns for a single game, sorted by createdAt ascending. */
export async function listGameStoriesForGame(
  gameId: string,
): Promise<GameStory[]> {
  try {
    const db = await openTrackerDb();
    const tx = db.transaction(STORE, "readonly");
    const store = tx.objectStore(STORE);
    const index = store.index("gameId");
    const entries = (
      (await requestToPromise(
        index.getAll(IDBKeyRange.only(gameId)),
      )) as GameStory[]
    )
      .filter((entry) => entry.deleted !== true)
      .sort((left, right) => left.createdAt - right.createdAt);

    await transactionToPromise(tx);
    return entries;
  } catch (error) {
    throw toStorageError(`list game stories for game ${gameId}`, error);
  }
}

export async function listAllGameStories(): Promise<GameStory[]> {
  try {
    const db = await openTrackerDb();
    const tx = db.transaction(STORE, "readonly");
    const store = tx.objectStore(STORE);
    const entries = (
      (await requestToPromise(store.getAll())) as GameStory[]
    )
      .filter((entry) => entry.deleted !== true)
      .sort((left, right) => right.createdAt - left.createdAt);

    await transactionToPromise(tx);
    return entries;
  } catch (error) {
    throw toStorageError("list all game stories", error);
  }
}

/** All columns for a team, optionally filtered by game mode. Newest first. */
export async function listGameStoriesForTeam(
  teamId: string,
  gameMode?: ReporterGameMode,
): Promise<GameStory[]> {
  try {
    const db = await openTrackerDb();
    const tx = db.transaction(STORE, "readonly");
    const store = tx.objectStore(STORE);
    const index = store.index("teamId");
    const entries = (
      (await requestToPromise(
        index.getAll(IDBKeyRange.only(teamId)),
      )) as GameStory[]
    )
      .filter((entry) => entry.deleted !== true)
      .filter((entry) => (gameMode ? entry.gameMode === gameMode : true))
      .sort((left, right) => right.createdAt - left.createdAt);

    await transactionToPromise(tx);
    return entries;
  } catch (error) {
    throw toStorageError(`list game stories for team ${teamId}`, error);
  }
}

/**
 * All columns that mention a given player name. IDB has no array-membership
 * index, so we scan. OK at v1 scale; can swap to a dedicated `playerMentions`
 * store later if it gets heavy.
 */
export async function listGameStoriesMentioningPlayer(
  playerName: string,
): Promise<GameStory[]> {
  try {
    const db = await openTrackerDb();
    const tx = db.transaction(STORE, "readonly");
    const store = tx.objectStore(STORE);
    const entries = (
      (await requestToPromise(store.getAll())) as GameStory[]
    )
      .filter((entry) => entry.deleted !== true)
      .filter((entry) => entry.playersMentioned.includes(playerName))
      .sort((left, right) => right.createdAt - left.createdAt);

    await transactionToPromise(tx);
    return entries;
  } catch (error) {
    throw toStorageError(
      `list game stories mentioning ${playerName}`,
      error,
    );
  }
}

/** Soft delete — sets deleted=true and syncs. Never hard-delete (breaks sync). */
export async function deleteGameStory(id: string): Promise<void> {
  try {
    const db = await openTrackerDb();
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    const existing =
      ((await requestToPromise(store.get(id))) as GameStory | undefined) ??
      null;

    if (!existing) {
      throw new Error(`Game story not found: ${id}`);
    }

    const deletedRecord: GameStory = {
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
    throw toStorageError(`delete game story ${id}`, error);
  }
}
