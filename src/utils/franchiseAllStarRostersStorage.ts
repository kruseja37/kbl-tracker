import { syncEngine } from './syncEngine';
import { getTrackerDb, resetTrackerDbForTests } from './trackerDb';

export const FRANCHISE_ALL_STAR_ROSTERS_STORE_NAME = 'franchiseAllStarRosters';

const DB_NAME = 'kbl-tracker';
const STORE_NAME = FRANCHISE_ALL_STAR_ROSTERS_STORE_NAME;

export interface FranchiseAllStarRosterScopeInput {
  franchiseId: string;
  seasonId: string;
  statsScopeId: string;
}

export type FranchiseAllStarSelectionRole = 'starter' | 'reserve';

export interface FranchiseAllStarSelection {
  playerId: string;
  teamId: string;
  position: string;
  role: FranchiseAllStarSelectionRole;
  selectionScore?: number;
}

export interface FranchiseAllStarRosterRow extends FranchiseAllStarRosterScopeInput {
  id: string;
  seasonNumber: number;
  selections: FranchiseAllStarSelection[];
  lockedAtGameNumber: number | null;
  locked: boolean;
  createdAt: number;
  updatedAt?: number;
}

export function resetFranchiseAllStarRostersForTests(): void {
  resetTrackerDbForTests();
}

export async function clearFranchiseAllStarRostersForTests(): Promise<void> {
  const db = await initFranchiseAllStarRosterDatabase();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  tx.objectStore(STORE_NAME).clear();
  await transactionToPromise(tx);
}

export async function initFranchiseAllStarRosterDatabase(): Promise<IDBDatabase> {
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

function scopeKey(scope: FranchiseAllStarRosterScopeInput): [string, string, string] {
  return [scope.franchiseId, scope.seasonId, scope.statsScopeId];
}

function hasExplicitScope(scope: FranchiseAllStarRosterScopeInput): boolean {
  return Boolean(scope.franchiseId && scope.seasonId && scope.statsScopeId);
}

function sortAllStarRosters(rows: FranchiseAllStarRosterRow[]): FranchiseAllStarRosterRow[] {
  return rows.sort((left, right) =>
    left.seasonNumber - right.seasonNumber ||
    left.id.localeCompare(right.id),
  );
}

export function franchiseAllStarRosterId(scope: FranchiseAllStarRosterScopeInput): string {
  return `${scope.franchiseId}:${scope.seasonId}:${scope.statsScopeId}:allstar`;
}

export async function putFranchiseAllStarRoster(
  row: FranchiseAllStarRosterRow,
): Promise<void> {
  const db = await initFranchiseAllStarRosterDatabase();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  tx.objectStore(STORE_NAME).put(row);
  await transactionToPromise(tx);

  if (!syncEngine.isSuppressed()) {
    syncEngine.upsert(DB_NAME, STORE_NAME, row.id, row);
  }
}

export async function getFranchiseAllStarRoster(
  scope: FranchiseAllStarRosterScopeInput,
): Promise<FranchiseAllStarRosterRow | undefined> {
  if (!hasExplicitScope(scope)) return undefined;
  const db = await initFranchiseAllStarRosterDatabase();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const row = await requestToPromise<FranchiseAllStarRosterRow | undefined>(
    tx.objectStore(STORE_NAME).get(franchiseAllStarRosterId(scope)),
  );
  if (
    !row ||
    row.franchiseId !== scope.franchiseId ||
    row.seasonId !== scope.seasonId ||
    row.statsScopeId !== scope.statsScopeId
  ) {
    return undefined;
  }
  return row;
}

export async function getFranchiseAllStarRostersByScope(
  scope: FranchiseAllStarRosterScopeInput,
): Promise<FranchiseAllStarRosterRow[]> {
  if (!hasExplicitScope(scope)) return [];
  const db = await initFranchiseAllStarRosterDatabase();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const rows = await requestToPromise<FranchiseAllStarRosterRow[]>(
    tx.objectStore(STORE_NAME).index('by_scope').getAll(scopeKey(scope)),
  );
  return sortAllStarRosters(
    (rows ?? []).filter((row) =>
      row.franchiseId === scope.franchiseId &&
      row.seasonId === scope.seasonId &&
      row.statsScopeId === scope.statsScopeId,
    ),
  );
}
