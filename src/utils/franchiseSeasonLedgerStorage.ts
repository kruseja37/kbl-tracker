import type { LedgerStatus } from '../engines/rosterAnalyzer';
import { getTrackerDb, resetTrackerDbForTests } from './trackerDb';

export interface FranchiseSeasonLedgerScopeInput {
  franchiseId: string;
  seasonId: string;
  statsScopeId: string;
}

export interface FranchiseSeasonLedgerRow extends FranchiseSeasonLedgerScopeInput {
  playerId: string;
  salary: number;
  status: LedgerStatus;
  capCharge: number;
  calculationVersion: string;
  computedAt: string;
}

export const FRANCHISE_SEASON_LEDGER_CALCULATION_VERSION = 'franchise-season-ledger-v1-t7c';

const STORE_NAME = 'franchiseSeasonLedgerRows';

export { STORE_NAME as FRANCHISE_SEASON_LEDGER_STORE_NAME };

export function resetFranchiseSeasonLedgerDatabaseForTests(): void {
  resetTrackerDbForTests();
}

export async function clearFranchiseSeasonLedgerDatabaseForTests(): Promise<void> {
  const db = await initFranchiseSeasonLedgerDatabase();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  tx.objectStore(STORE_NAME).clear();
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

export async function initFranchiseSeasonLedgerDatabase(): Promise<IDBDatabase> {
  return getTrackerDb();
}

function scopeKey(scope: FranchiseSeasonLedgerScopeInput): [string, string, string] {
  return [scope.franchiseId, scope.seasonId, scope.statsScopeId];
}

function rowKey(scope: FranchiseSeasonLedgerScopeInput, playerId: string): [string, string, string, string] {
  return [scope.franchiseId, scope.seasonId, scope.statsScopeId, playerId];
}

function hasExplicitScope(scope: FranchiseSeasonLedgerScopeInput & { playerId?: string }): boolean {
  return Boolean(scope.franchiseId && scope.seasonId && scope.statsScopeId && (scope.playerId === undefined || scope.playerId));
}

export async function saveFranchiseSeasonLedgerRows(
  rows: FranchiseSeasonLedgerRow[],
): Promise<FranchiseSeasonLedgerRow[]> {
  if (rows.length === 0) return [];
  const db = await initFranchiseSeasonLedgerDatabase();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  for (const row of rows) {
    store.put(row);
  }
  await transactionToPromise(tx);
  return rows;
}

export async function upsertFranchiseSeasonLedgerRow(
  row: FranchiseSeasonLedgerRow,
): Promise<FranchiseSeasonLedgerRow> {
  await saveFranchiseSeasonLedgerRows([row]);
  return row;
}

export async function deleteFranchiseSeasonLedgerRowsForScope(
  scope: FranchiseSeasonLedgerScopeInput,
): Promise<void> {
  if (!hasExplicitScope(scope)) return;
  const db = await initFranchiseSeasonLedgerDatabase();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  const keys = await requestToPromise<IDBValidKey[]>(
    store.index('by_scope').getAllKeys(scopeKey(scope)),
  );
  for (const key of keys ?? []) {
    store.delete(key);
  }
  await transactionToPromise(tx);
}

export async function replaceFranchiseSeasonLedgerRowsForScope(
  scope: FranchiseSeasonLedgerScopeInput,
  rows: FranchiseSeasonLedgerRow[],
): Promise<FranchiseSeasonLedgerRow[]> {
  await deleteFranchiseSeasonLedgerRowsForScope(scope);
  return saveFranchiseSeasonLedgerRows(rows);
}

export async function getFranchiseSeasonLedgerRows(
  scope: FranchiseSeasonLedgerScopeInput,
): Promise<FranchiseSeasonLedgerRow[]> {
  if (!hasExplicitScope(scope)) return [];
  const db = await initFranchiseSeasonLedgerDatabase();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const rows = await requestToPromise<FranchiseSeasonLedgerRow[]>(
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

export async function getFranchiseSeasonLedgerRow(
  scope: FranchiseSeasonLedgerScopeInput & { playerId: string },
): Promise<FranchiseSeasonLedgerRow | null> {
  if (!hasExplicitScope(scope)) return null;
  const db = await initFranchiseSeasonLedgerDatabase();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const row = await requestToPromise<FranchiseSeasonLedgerRow | undefined>(
    tx.objectStore(STORE_NAME).get(rowKey(scope, scope.playerId)),
  );
  return row ?? null;
}
