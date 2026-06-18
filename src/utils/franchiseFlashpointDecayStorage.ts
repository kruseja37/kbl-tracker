import type { FlashpointKind } from '../engines/flashpointDecay';
import { syncEngine } from './syncEngine';
import { getTrackerDb, resetTrackerDbForTests } from './trackerDb';

export const FRANCHISE_FLASHPOINT_DECAY_STORE_NAME = 'franchiseFlashpointDecay';

const DB_NAME = 'kbl-tracker';
const STORE_NAME = FRANCHISE_FLASHPOINT_DECAY_STORE_NAME;

export interface FranchiseFlashpointDecayScopeInput {
  franchiseId: string;
  seasonId: string;
  statsScopeId: string;
}

export interface FranchiseFlashpointDecayRow extends FranchiseFlashpointDecayScopeInput {
  playerId: string;
  /** The active turned-on reason (null = not currently turned on; the L7/L10/L13 seam). */
  flashpointKind: FlashpointKind;
  /** Consecutive games the flashpoint has been left unresolved (the compounding lever). */
  consecutiveGamesUnresolved: number;
  /** Running negative fan-morale total bled so far this season (<= 0). */
  accumulatedFanMoraleTax: number;
  /** The per-game tax applied at the most recent checkpoint (<= 0). */
  lastGameTax: number;
  /** Re-entry guard — skip an already-processed checkpoint (no double-decay). */
  updatedAtCheckpoint: string;
}

export function resetFranchiseFlashpointDecayForTests(): void {
  resetTrackerDbForTests();
}

export async function clearFranchiseFlashpointDecayForTests(): Promise<void> {
  const db = await initFranchiseFlashpointDecayDatabase();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  tx.objectStore(STORE_NAME).clear();
  await transactionToPromise(tx);
}

export async function initFranchiseFlashpointDecayDatabase(): Promise<IDBDatabase> {
  return getTrackerDb();
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

function scopeKey(scope: FranchiseFlashpointDecayScopeInput): [string, string, string] {
  return [scope.franchiseId, scope.seasonId, scope.statsScopeId];
}

function rowKey(
  scope: FranchiseFlashpointDecayScopeInput,
  playerId: string,
): [string, string, string, string] {
  return [scope.franchiseId, scope.seasonId, scope.statsScopeId, playerId];
}

function hasExplicitScope(scope: FranchiseFlashpointDecayScopeInput & { playerId?: string }): boolean {
  return Boolean(
    scope.franchiseId &&
    scope.seasonId &&
    scope.statsScopeId &&
    (scope.playerId === undefined || scope.playerId),
  );
}

export async function saveFranchiseFlashpointDecayRows(
  rows: FranchiseFlashpointDecayRow[],
): Promise<FranchiseFlashpointDecayRow[]> {
  if (rows.length === 0) return [];
  const db = await initFranchiseFlashpointDecayDatabase();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  for (const row of rows) {
    store.put(row);
  }
  await transactionToPromise(tx);

  if (!syncEngine.isSuppressed()) {
    for (const row of rows) {
      syncEngine.upsert(DB_NAME, STORE_NAME, rowKey(row, row.playerId), row);
    }
  }

  return rows;
}

export async function upsertFranchiseFlashpointDecayRow(
  row: FranchiseFlashpointDecayRow,
): Promise<FranchiseFlashpointDecayRow> {
  await saveFranchiseFlashpointDecayRows([row]);
  return row;
}

export async function upsertFranchiseFlashpointDecayRows(
  rows: FranchiseFlashpointDecayRow[],
): Promise<FranchiseFlashpointDecayRow[]> {
  return saveFranchiseFlashpointDecayRows(rows);
}

export async function deleteFranchiseFlashpointDecayForScope(
  scope: FranchiseFlashpointDecayScopeInput,
): Promise<void> {
  if (!hasExplicitScope(scope)) return;
  const db = await initFranchiseFlashpointDecayDatabase();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  const keys = await requestToPromise<IDBValidKey[]>(
    store.index('by_scope').getAllKeys(scopeKey(scope)),
  );
  for (const key of keys ?? []) {
    store.delete(key);
  }
  await transactionToPromise(tx);

  if (!syncEngine.isSuppressed()) {
    for (const key of keys ?? []) {
      syncEngine.remove(DB_NAME, STORE_NAME, key);
    }
  }
}

export async function replaceFranchiseFlashpointDecayRowsForScope(
  scope: FranchiseFlashpointDecayScopeInput,
  rows: FranchiseFlashpointDecayRow[],
): Promise<FranchiseFlashpointDecayRow[]> {
  await deleteFranchiseFlashpointDecayForScope(scope);
  return saveFranchiseFlashpointDecayRows(rows);
}

export async function getFranchiseFlashpointDecayRowsByScope(
  scope: FranchiseFlashpointDecayScopeInput,
): Promise<FranchiseFlashpointDecayRow[]> {
  if (!hasExplicitScope(scope)) return [];
  const db = await initFranchiseFlashpointDecayDatabase();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const rows = await requestToPromise<FranchiseFlashpointDecayRow[]>(
    tx.objectStore(STORE_NAME).index('by_scope').getAll(scopeKey(scope)),
  );
  return (rows ?? [])
    .filter((row) =>
      row.franchiseId === scope.franchiseId &&
      row.seasonId === scope.seasonId &&
      row.statsScopeId === scope.statsScopeId,
    )
    .sort((left, right) => left.playerId.localeCompare(right.playerId));
}

export async function getFranchiseFlashpointDecayRow(
  scope: FranchiseFlashpointDecayScopeInput,
  playerId: string,
): Promise<FranchiseFlashpointDecayRow | null> {
  if (!hasExplicitScope({ ...scope, playerId })) return null;
  const db = await initFranchiseFlashpointDecayDatabase();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const row = await requestToPromise<FranchiseFlashpointDecayRow | undefined>(
    tx.objectStore(STORE_NAME).get(rowKey(scope, playerId)),
  );
  return row ?? null;
}
