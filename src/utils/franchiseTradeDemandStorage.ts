import { syncEngine } from './syncEngine';
import { getTrackerDb, resetTrackerDbForTests } from './trackerDb';

export const FRANCHISE_TRADE_DEMAND_STORE_NAME = 'franchiseTradeDemandState';

const DB_NAME = 'kbl-tracker';
const STORE_NAME = FRANCHISE_TRADE_DEMAND_STORE_NAME;

export interface FranchiseTradeDemandScopeInput {
  franchiseId: string;
  seasonId: string;
  statsScopeId: string;
}

export interface FranchiseTradeDemandRow extends FranchiseTradeDemandScopeInput {
  playerId: string;
  teamId: string;
  status: 'active' | 'resolved';
  confirmedAtGameNumber: number;
  confirmedAtCheckpoint: string;
  confirmedAtIso: string;
}

export function resetFranchiseTradeDemandForTests(): void {
  resetTrackerDbForTests();
}

export async function clearFranchiseTradeDemandForTests(): Promise<void> {
  const db = await initFranchiseTradeDemandDatabase();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  tx.objectStore(STORE_NAME).clear();
  await transactionToPromise(tx);
}

export async function initFranchiseTradeDemandDatabase(): Promise<IDBDatabase> {
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

function scopeKey(scope: FranchiseTradeDemandScopeInput): [string, string, string] {
  return [scope.franchiseId, scope.seasonId, scope.statsScopeId];
}

function rowKey(
  scope: FranchiseTradeDemandScopeInput,
  playerId: string,
): [string, string, string, string] {
  return [scope.franchiseId, scope.seasonId, scope.statsScopeId, playerId];
}

function hasExplicitScope(scope: FranchiseTradeDemandScopeInput & { playerId?: string }): boolean {
  return Boolean(
    scope.franchiseId &&
    scope.seasonId &&
    scope.statsScopeId &&
    (scope.playerId === undefined || scope.playerId),
  );
}

export async function saveFranchiseTradeDemandRows(
  rows: FranchiseTradeDemandRow[],
): Promise<FranchiseTradeDemandRow[]> {
  if (rows.length === 0) return [];
  const db = await initFranchiseTradeDemandDatabase();
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

export async function upsertFranchiseTradeDemandRow(
  row: FranchiseTradeDemandRow,
): Promise<FranchiseTradeDemandRow> {
  await saveFranchiseTradeDemandRows([row]);
  return row;
}

export async function deleteFranchiseTradeDemandForScope(
  scope: FranchiseTradeDemandScopeInput,
): Promise<void> {
  if (!hasExplicitScope(scope)) return;
  const db = await initFranchiseTradeDemandDatabase();
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

export async function getFranchiseTradeDemandRowsByScope(
  scope: FranchiseTradeDemandScopeInput,
): Promise<FranchiseTradeDemandRow[]> {
  if (!hasExplicitScope(scope)) return [];
  const db = await initFranchiseTradeDemandDatabase();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const rows = await requestToPromise<FranchiseTradeDemandRow[]>(
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

export async function getFranchiseTradeDemandRow(
  scope: FranchiseTradeDemandScopeInput,
  playerId: string,
): Promise<FranchiseTradeDemandRow | null> {
  if (!hasExplicitScope({ ...scope, playerId })) return null;
  const db = await initFranchiseTradeDemandDatabase();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const row = await requestToPromise<FranchiseTradeDemandRow | undefined>(
    tx.objectStore(STORE_NAME).get(rowKey(scope, playerId)),
  );
  return row ?? null;
}
