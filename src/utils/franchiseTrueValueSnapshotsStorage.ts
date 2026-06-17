import { syncEngine } from './syncEngine';
import { getTrackerDb, resetTrackerDbForTests } from './trackerDb';

export const FRANCHISE_TRUE_VALUE_SNAPSHOTS_STORE_NAME = 'franchiseTrueValueSnapshots';

const DB_NAME = 'kbl-tracker';
const STORE_NAME = FRANCHISE_TRUE_VALUE_SNAPSHOTS_STORE_NAME;

export interface FranchiseTrueValueSnapshotScopeInput {
  franchiseId: string;
  seasonId: string;
  statsScopeId: string;
}

export type FranchiseTrueValueSnapshotCheckpoint = string | number;

export interface FranchiseTrueValueSnapshotRow extends FranchiseTrueValueSnapshotScopeInput {
  playerId: string;
  checkpoint: FranchiseTrueValueSnapshotCheckpoint;
  trueValue: number;
  valueDelta: number;
  warPercentile: number;
  computedAt: string;
}

export function resetFranchiseTrueValueSnapshotsDatabaseForTests(): void {
  resetTrackerDbForTests();
}

export async function clearFranchiseTrueValueSnapshotsDatabaseForTests(): Promise<void> {
  const db = await initFranchiseTrueValueSnapshotsDatabase();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  tx.objectStore(STORE_NAME).clear();
  await transactionToPromise(tx);
}

export async function initFranchiseTrueValueSnapshotsDatabase(): Promise<IDBDatabase> {
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

function scopeKey(scope: FranchiseTrueValueSnapshotScopeInput): [string, string, string] {
  return [scope.franchiseId, scope.seasonId, scope.statsScopeId];
}

function rowKey(
  scope: FranchiseTrueValueSnapshotScopeInput,
  playerId: string,
  checkpoint: FranchiseTrueValueSnapshotCheckpoint,
): [string, string, string, string, FranchiseTrueValueSnapshotCheckpoint] {
  return [scope.franchiseId, scope.seasonId, scope.statsScopeId, playerId, checkpoint];
}

function hasExplicitScope(
  scope: FranchiseTrueValueSnapshotScopeInput & {
    playerId?: string;
    checkpoint?: FranchiseTrueValueSnapshotCheckpoint;
  },
): boolean {
  return Boolean(
    scope.franchiseId &&
    scope.seasonId &&
    scope.statsScopeId &&
    (scope.playerId === undefined || scope.playerId) &&
    (scope.checkpoint === undefined || scope.checkpoint !== ''),
  );
}

export async function saveFranchiseTrueValueSnapshotRows(
  rows: FranchiseTrueValueSnapshotRow[],
): Promise<FranchiseTrueValueSnapshotRow[]> {
  if (rows.length === 0) return [];
  const db = await initFranchiseTrueValueSnapshotsDatabase();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  for (const row of rows) {
    store.put(row);
  }
  await transactionToPromise(tx);

  if (!syncEngine.isSuppressed()) {
    for (const row of rows) {
      syncEngine.upsert(DB_NAME, STORE_NAME, rowKey(row, row.playerId, row.checkpoint), row);
    }
  }

  return rows;
}

export async function upsertFranchiseTrueValueSnapshotRow(
  row: FranchiseTrueValueSnapshotRow,
): Promise<FranchiseTrueValueSnapshotRow> {
  await saveFranchiseTrueValueSnapshotRows([row]);
  return row;
}

export async function deleteFranchiseTrueValueSnapshotRowsForScope(
  scope: FranchiseTrueValueSnapshotScopeInput,
): Promise<void> {
  if (!hasExplicitScope(scope)) return;
  const db = await initFranchiseTrueValueSnapshotsDatabase();
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

export async function replaceFranchiseTrueValueSnapshotRowsForScope(
  scope: FranchiseTrueValueSnapshotScopeInput,
  rows: FranchiseTrueValueSnapshotRow[],
): Promise<FranchiseTrueValueSnapshotRow[]> {
  await deleteFranchiseTrueValueSnapshotRowsForScope(scope);
  return saveFranchiseTrueValueSnapshotRows(rows);
}

export async function getFranchiseTrueValueSnapshotRowsByScope(
  scope: FranchiseTrueValueSnapshotScopeInput,
): Promise<FranchiseTrueValueSnapshotRow[]> {
  if (!hasExplicitScope(scope)) return [];
  const db = await initFranchiseTrueValueSnapshotsDatabase();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const rows = await requestToPromise<FranchiseTrueValueSnapshotRow[]>(
    tx.objectStore(STORE_NAME).index('by_scope').getAll(scopeKey(scope)),
  );
  return (rows ?? [])
    .filter((row) =>
      row.franchiseId === scope.franchiseId &&
      row.seasonId === scope.seasonId &&
      row.statsScopeId === scope.statsScopeId,
    )
    .sort((left, right) => {
      const checkpointOrder = String(left.checkpoint).localeCompare(String(right.checkpoint), undefined, {
        numeric: true,
      });
      return checkpointOrder || left.playerId.localeCompare(right.playerId);
    });
}

export async function getFranchiseTrueValueSnapshotRow(
  scope: FranchiseTrueValueSnapshotScopeInput & {
    playerId: string;
    checkpoint: FranchiseTrueValueSnapshotCheckpoint;
  },
): Promise<FranchiseTrueValueSnapshotRow | null> {
  if (!hasExplicitScope(scope)) return null;
  const db = await initFranchiseTrueValueSnapshotsDatabase();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const row = await requestToPromise<FranchiseTrueValueSnapshotRow | undefined>(
    tx.objectStore(STORE_NAME).get(rowKey(scope, scope.playerId, scope.checkpoint)),
  );
  return row ?? null;
}
