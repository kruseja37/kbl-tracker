import type { PersistedTrueValueScope } from './processCompletedGame';

export const DB_NAME = 'kbl-franchise-home-park-rivals';
const DB_VERSION = 1;
const STORES = {
  HOME_PARK_RIVALS: 'homeParkRivals',
} as const;

let dbInstance: IDBDatabase | null = null;

export interface HomeParkRivalRow extends PersistedTrueValueScope {
  id: string;
  homeTeamId: string;
  rivalTeamId: string | null;
  rivalWinsAtPark: number;
  rivalRecordsHeld: number;
  scopeKey: string;
  updatedAt: string;
  updatedAtGameId: string;
}

export function resetHomeParkRivalDatabaseForTests(): void {
  dbInstance?.close();
  dbInstance = null;
}

export async function clearHomeParkRivalDatabaseForTests(): Promise<void> {
  const db = await initHomeParkRivalDatabase();
  const tx = db.transaction(STORES.HOME_PARK_RIVALS, 'readwrite');
  tx.objectStore(STORES.HOME_PARK_RIVALS).clear();
  await transactionToPromise(tx);
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

function ensureIndex(
  store: IDBObjectStore,
  name: string,
  keyPath: string | string[],
  options?: IDBIndexParameters,
): void {
  if (!store.indexNames.contains(name)) {
    store.createIndex(name, keyPath, options);
  }
}

export async function initHomeParkRivalDatabase(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      let store: IDBObjectStore;
      if (!db.objectStoreNames.contains(STORES.HOME_PARK_RIVALS)) {
        store = db.createObjectStore(STORES.HOME_PARK_RIVALS, { keyPath: 'id' });
      } else {
        store = (event.target as IDBOpenDBRequest).transaction!.objectStore(STORES.HOME_PARK_RIVALS);
      }
      ensureIndex(store, 'by_scope', 'scopeKey', { unique: false });
    };
    request.onsuccess = () => {
      dbInstance = request.result;
      dbInstance.onversionchange = () => {
        dbInstance?.close();
        dbInstance = null;
      };
      resolve(dbInstance);
    };
  });
}

function hasText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function hasExplicitScope(scope: PersistedTrueValueScope): boolean {
  return Boolean(
    hasText(scope.franchiseId) &&
    hasText(scope.seasonId) &&
    hasText(scope.statsScopeId) &&
    Number.isInteger(scope.seasonNumber) &&
    scope.seasonNumber > 0,
  );
}

export function homeParkRivalScopeKey(scope: PersistedTrueValueScope): string {
  return [
    scope.franchiseId,
    scope.seasonId,
    scope.statsScopeId,
    String(scope.seasonNumber),
  ].join(':');
}

export function homeParkRivalId(scope: PersistedTrueValueScope, homeTeamId: string): string {
  return `${homeParkRivalScopeKey(scope)}:${homeTeamId}`;
}

export async function putHomeParkRival(row: HomeParkRivalRow): Promise<void> {
  const db = await initHomeParkRivalDatabase();
  const tx = db.transaction(STORES.HOME_PARK_RIVALS, 'readwrite');
  tx.objectStore(STORES.HOME_PARK_RIVALS).put(row);
  await transactionToPromise(tx);
}

export async function getHomeParkRival(
  scope: PersistedTrueValueScope,
  homeTeamId: string,
): Promise<HomeParkRivalRow | null> {
  if (!hasExplicitScope(scope) || !hasText(homeTeamId)) return null;
  const db = await initHomeParkRivalDatabase();
  const tx = db.transaction(STORES.HOME_PARK_RIVALS, 'readonly');
  const row = await requestToPromise<HomeParkRivalRow | undefined>(
    tx.objectStore(STORES.HOME_PARK_RIVALS).get(homeParkRivalId(scope, homeTeamId)),
  );
  if (!row) return null;
  if (
    row.franchiseId !== scope.franchiseId ||
    row.seasonId !== scope.seasonId ||
    row.statsScopeId !== scope.statsScopeId ||
    row.seasonNumber !== scope.seasonNumber ||
    row.homeTeamId !== homeTeamId
  ) {
    return null;
  }
  return row;
}

export async function listHomeParkRivals(scope: PersistedTrueValueScope): Promise<HomeParkRivalRow[]> {
  if (!hasExplicitScope(scope)) return [];
  const db = await initHomeParkRivalDatabase();
  const tx = db.transaction(STORES.HOME_PARK_RIVALS, 'readonly');
  const rows = await requestToPromise<HomeParkRivalRow[]>(
    tx.objectStore(STORES.HOME_PARK_RIVALS).index('by_scope').getAll(homeParkRivalScopeKey(scope)),
  );
  return (rows ?? [])
    .filter((row) =>
      row.franchiseId === scope.franchiseId &&
      row.seasonId === scope.seasonId &&
      row.statsScopeId === scope.statsScopeId &&
      row.seasonNumber === scope.seasonNumber,
    )
    .sort((left, right) => left.homeTeamId.localeCompare(right.homeTeamId));
}
