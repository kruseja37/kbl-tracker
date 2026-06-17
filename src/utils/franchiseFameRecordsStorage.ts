import type { FameAttributionChannel } from '../engines/fameModel';
import { syncEngine } from './syncEngine';
import { getTrackerDb, resetTrackerDbForTests } from './trackerDb';

export const FRANCHISE_FAME_RECORDS_STORE_NAME = 'franchiseFameRecords';

const DB_NAME = 'kbl-tracker';
const STORE_NAME = FRANCHISE_FAME_RECORDS_STORE_NAME;

export interface FranchiseFameRecordsScopeInput {
  franchiseId: string;
  seasonId: string;
  statsScopeId: string;
}

export interface FranchiseFameRecordRow extends FranchiseFameRecordsScopeInput {
  playerId: string;
  heat: number;
  reachFloor: number;
  wasNegative: boolean;
  channelTotal: number;
  channelByChannel: Record<FameAttributionChannel, number>;
  defensiveFame: number;
  rolePlayerFame: number;
  updatedAtCheckpoint: string;
}

export function resetFranchiseFameRecordsForTests(): void {
  resetTrackerDbForTests();
}

export async function clearFranchiseFameRecordsForTests(): Promise<void> {
  const db = await initFranchiseFameRecordsDatabase();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  tx.objectStore(STORE_NAME).clear();
  await transactionToPromise(tx);
}

export async function initFranchiseFameRecordsDatabase(): Promise<IDBDatabase> {
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

function scopeKey(scope: FranchiseFameRecordsScopeInput): [string, string, string] {
  return [scope.franchiseId, scope.seasonId, scope.statsScopeId];
}

function rowKey(
  scope: FranchiseFameRecordsScopeInput,
  playerId: string,
): [string, string, string, string] {
  return [scope.franchiseId, scope.seasonId, scope.statsScopeId, playerId];
}

function hasExplicitScope(scope: FranchiseFameRecordsScopeInput & { playerId?: string }): boolean {
  return Boolean(
    scope.franchiseId &&
    scope.seasonId &&
    scope.statsScopeId &&
    (scope.playerId === undefined || scope.playerId),
  );
}

export async function saveFranchiseFameRecordRows(
  rows: FranchiseFameRecordRow[],
): Promise<FranchiseFameRecordRow[]> {
  if (rows.length === 0) return [];
  const db = await initFranchiseFameRecordsDatabase();
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

export async function upsertFranchiseFameRecordRow(
  row: FranchiseFameRecordRow,
): Promise<FranchiseFameRecordRow> {
  await saveFranchiseFameRecordRows([row]);
  return row;
}

export async function upsertFranchiseFameRecordRows(
  rows: FranchiseFameRecordRow[],
): Promise<FranchiseFameRecordRow[]> {
  return saveFranchiseFameRecordRows(rows);
}

export async function deleteFranchiseFameRecordsForScope(
  scope: FranchiseFameRecordsScopeInput,
): Promise<void> {
  if (!hasExplicitScope(scope)) return;
  const db = await initFranchiseFameRecordsDatabase();
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

export async function replaceFranchiseFameRecordRowsForScope(
  scope: FranchiseFameRecordsScopeInput,
  rows: FranchiseFameRecordRow[],
): Promise<FranchiseFameRecordRow[]> {
  await deleteFranchiseFameRecordsForScope(scope);
  return saveFranchiseFameRecordRows(rows);
}

export async function getFranchiseFameRecordRowsByScope(
  scope: FranchiseFameRecordsScopeInput,
): Promise<FranchiseFameRecordRow[]> {
  if (!hasExplicitScope(scope)) return [];
  const db = await initFranchiseFameRecordsDatabase();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const rows = await requestToPromise<FranchiseFameRecordRow[]>(
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

export async function getFranchiseFameRecord(
  scope: FranchiseFameRecordsScopeInput,
  playerId: string,
): Promise<FranchiseFameRecordRow | null> {
  if (!hasExplicitScope({ ...scope, playerId })) return null;
  const db = await initFranchiseFameRecordsDatabase();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const row = await requestToPromise<FranchiseFameRecordRow | undefined>(
    tx.objectStore(STORE_NAME).get(rowKey(scope, playerId)),
  );
  return row ?? null;
}
