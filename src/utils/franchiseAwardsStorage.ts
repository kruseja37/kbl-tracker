import type { AwardType } from '../engines/awardEmblems';
import { syncEngine } from './syncEngine';
import { getTrackerDb, resetTrackerDbForTests } from './trackerDb';

export const FRANCHISE_AWARDS_STORE_NAME = 'franchiseAwardsRows';

const DB_NAME = 'kbl-tracker';
const STORE_NAME = FRANCHISE_AWARDS_STORE_NAME;

export interface FranchiseAwardsScopeInput {
  franchiseId: string;
  seasonId: string;
  statsScopeId: string;
}

export type FranchiseAwardCategory = Extract<
  AwardType,
  | 'MVP'
  | 'CY_YOUNG'
  | 'ROOKIE_OF_YEAR'
  | 'GOLD_GLOVE'
  | 'SILVER_SLUGGER'
  | 'MANAGER_OF_YEAR'
  | 'KARA_KAWAGUCHI'
  | 'COMEBACK_PLAYER'
  | 'BUST_OF_YEAR'
>;

export interface FranchiseAwardCandidate {
  playerId: string;
  score: number;
  marginToWinner: number;
}

export interface FranchiseAwardGoldGloveSplit {
  fWar: number | null;
  totalWar: number | null;
}

export interface FranchiseAwardRow extends FranchiseAwardsScopeInput {
  category: FranchiseAwardCategory;
  winnerPlayerId: string | null;
  candidates: FranchiseAwardCandidate[];
  goldGloveSplit?: FranchiseAwardGoldGloveSplit | null;
  voteWeight: number | null;
  finalized: boolean;
  computedAt: string;
}

export function resetFranchiseAwardsDatabaseForTests(): void {
  resetTrackerDbForTests();
}

export async function clearFranchiseAwardsDatabaseForTests(): Promise<void> {
  const db = await initFranchiseAwardsDatabase();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  tx.objectStore(STORE_NAME).clear();
  await transactionToPromise(tx);
}

export async function initFranchiseAwardsDatabase(): Promise<IDBDatabase> {
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

function scopeKey(scope: FranchiseAwardsScopeInput): [string, string, string] {
  return [scope.franchiseId, scope.seasonId, scope.statsScopeId];
}

function rowKey(
  scope: FranchiseAwardsScopeInput,
  category: FranchiseAwardCategory,
): [string, string, string, FranchiseAwardCategory] {
  return [scope.franchiseId, scope.seasonId, scope.statsScopeId, category];
}

function hasExplicitScope(scope: FranchiseAwardsScopeInput & { category?: string }): boolean {
  return Boolean(
    scope.franchiseId &&
    scope.seasonId &&
    scope.statsScopeId &&
    (scope.category === undefined || scope.category),
  );
}

export async function saveFranchiseAwardRows(rows: FranchiseAwardRow[]): Promise<FranchiseAwardRow[]> {
  if (rows.length === 0) return [];
  const db = await initFranchiseAwardsDatabase();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  for (const row of rows) {
    store.put(row);
  }
  await transactionToPromise(tx);

  if (!syncEngine.isSuppressed()) {
    for (const row of rows) {
      syncEngine.upsert(DB_NAME, STORE_NAME, rowKey(row, row.category), row);
    }
  }

  return rows;
}

export async function upsertFranchiseAwardRow(row: FranchiseAwardRow): Promise<FranchiseAwardRow> {
  await saveFranchiseAwardRows([row]);
  return row;
}

export async function deleteFranchiseAwardRowsForScope(scope: FranchiseAwardsScopeInput): Promise<void> {
  if (!hasExplicitScope(scope)) return;
  const db = await initFranchiseAwardsDatabase();
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

export async function replaceFranchiseAwardRowsForScope(
  scope: FranchiseAwardsScopeInput,
  rows: FranchiseAwardRow[],
): Promise<FranchiseAwardRow[]> {
  await deleteFranchiseAwardRowsForScope(scope);
  return saveFranchiseAwardRows(rows);
}

export async function getFranchiseAwardRowsByScope(
  scope: FranchiseAwardsScopeInput,
): Promise<FranchiseAwardRow[]> {
  if (!hasExplicitScope(scope)) return [];
  const db = await initFranchiseAwardsDatabase();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const rows = await requestToPromise<FranchiseAwardRow[]>(
    tx.objectStore(STORE_NAME).index('by_scope').getAll(scopeKey(scope)),
  );
  return (rows ?? [])
    .filter((row) =>
      row.franchiseId === scope.franchiseId &&
      row.seasonId === scope.seasonId &&
      row.statsScopeId === scope.statsScopeId,
    )
    .sort((left, right) => left.category.localeCompare(right.category));
}

export async function getFranchiseAwardRow(
  scope: FranchiseAwardsScopeInput & { category: FranchiseAwardCategory },
): Promise<FranchiseAwardRow | null> {
  if (!hasExplicitScope(scope)) return null;
  const db = await initFranchiseAwardsDatabase();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const row = await requestToPromise<FranchiseAwardRow | undefined>(
    tx.objectStore(STORE_NAME).get(rowKey(scope, scope.category)),
  );
  return row ?? null;
}
