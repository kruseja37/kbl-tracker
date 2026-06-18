import { syncEngine } from './syncEngine';
import { getTrackerDb, resetTrackerDbForTests } from './trackerDb';

export const FRANCHISE_RATINGS_OVERLAY_STORE_NAME = 'franchiseRatingsOverlays';

const DB_NAME = 'kbl-tracker';
const STORE_NAME = FRANCHISE_RATINGS_OVERLAY_STORE_NAME;

export interface FranchiseRatingsOverlayScopeInput {
  franchiseId: string;
  seasonId: string;
  statsScopeId: string;
}

export interface FranchiseRatingsOverlayRow extends FranchiseRatingsOverlayScopeInput {
  id: string;
  playerId: string;
  /** Plain SMB4 rating key; intentionally decoupled from the ratings type. */
  ratingKey: string;
  /** Signed adjustment stacked over the frozen base rating by the later read path. */
  delta: number;
  kind: 'permanent' | 'temporary';
  /** Absolute game-number expiry for temporary overlays; null for permanent rows. */
  expiresAtGameNumber: number | null;
  confirmationStatus: 'pending' | 'confirmed';
  source: string;
  sourceEventId: string;
  createdAtGameNumber: number;
  /** ISO timestamp supplied by the caller; storage does not generate time. */
  createdAt: string;
}

export function resetFranchiseRatingsOverlaysForTests(): void {
  resetTrackerDbForTests();
}

export async function clearFranchiseRatingsOverlaysForTests(): Promise<void> {
  const db = await initFranchiseRatingsOverlayDatabase();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  tx.objectStore(STORE_NAME).clear();
  await transactionToPromise(tx);
}

export async function initFranchiseRatingsOverlayDatabase(): Promise<IDBDatabase> {
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

function scopeKey(scope: FranchiseRatingsOverlayScopeInput): [string, string, string] {
  return [scope.franchiseId, scope.seasonId, scope.statsScopeId];
}

function playerKey(
  scope: FranchiseRatingsOverlayScopeInput,
  playerId: string,
): [string, string, string, string] {
  return [scope.franchiseId, scope.seasonId, scope.statsScopeId, playerId];
}

function hasExplicitScope(scope: FranchiseRatingsOverlayScopeInput & { playerId?: string }): boolean {
  return Boolean(
    scope.franchiseId &&
    scope.seasonId &&
    scope.statsScopeId &&
    (scope.playerId === undefined || scope.playerId),
  );
}

function sortRatingsOverlays(
  rows: FranchiseRatingsOverlayRow[],
): FranchiseRatingsOverlayRow[] {
  return rows.sort((left, right) =>
    left.playerId.localeCompare(right.playerId) ||
    left.ratingKey.localeCompare(right.ratingKey) ||
    left.sourceEventId.localeCompare(right.sourceEventId) ||
    left.id.localeCompare(right.id),
  );
}

export async function putFranchiseRatingsOverlay(
  row: FranchiseRatingsOverlayRow,
): Promise<void> {
  const db = await initFranchiseRatingsOverlayDatabase();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  tx.objectStore(STORE_NAME).put(row);
  await transactionToPromise(tx);

  if (!syncEngine.isSuppressed()) {
    syncEngine.upsert(DB_NAME, STORE_NAME, row.id, row);
  }
}

export async function getFranchiseRatingsOverlaysByPlayer(
  scope: FranchiseRatingsOverlayScopeInput,
  playerId: string,
): Promise<FranchiseRatingsOverlayRow[]> {
  if (!hasExplicitScope({ ...scope, playerId })) return [];
  const db = await initFranchiseRatingsOverlayDatabase();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const rows = await requestToPromise<FranchiseRatingsOverlayRow[]>(
    tx.objectStore(STORE_NAME).index('by_player').getAll(playerKey(scope, playerId)),
  );
  return sortRatingsOverlays(
    (rows ?? []).filter((row) =>
      row.franchiseId === scope.franchiseId &&
      row.seasonId === scope.seasonId &&
      row.statsScopeId === scope.statsScopeId &&
      row.playerId === playerId,
    ),
  );
}

export async function getFranchiseRatingsOverlaysByScope(
  scope: FranchiseRatingsOverlayScopeInput,
): Promise<FranchiseRatingsOverlayRow[]> {
  if (!hasExplicitScope(scope)) return [];
  const db = await initFranchiseRatingsOverlayDatabase();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const rows = await requestToPromise<FranchiseRatingsOverlayRow[]>(
    tx.objectStore(STORE_NAME).index('by_scope').getAll(scopeKey(scope)),
  );
  return sortRatingsOverlays(
    (rows ?? []).filter((row) =>
      row.franchiseId === scope.franchiseId &&
      row.seasonId === scope.seasonId &&
      row.statsScopeId === scope.statsScopeId,
    ),
  );
}

export async function deleteFranchiseRatingsOverlay(id: string): Promise<void> {
  if (!id) return;
  const db = await initFranchiseRatingsOverlayDatabase();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  tx.objectStore(STORE_NAME).delete(id);
  await transactionToPromise(tx);

  if (!syncEngine.isSuppressed()) {
    syncEngine.remove(DB_NAME, STORE_NAME, id);
  }
}
