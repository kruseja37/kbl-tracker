import { syncEngine } from './syncEngine';
import { getTrackerDb, resetTrackerDbForTests } from './trackerDb';

export const FRANCHISE_L10_OVERLAY_STORE_NAME = 'franchiseL10Overlays';

const DB_NAME = 'kbl-tracker';
const STORE_NAME = FRANCHISE_L10_OVERLAY_STORE_NAME;

export interface FranchiseL10OverlayScopeInput {
  franchiseId: string;
  seasonId: string;
  statsScopeId: string;
}

export interface FranchiseL10OverlayRow extends FranchiseL10OverlayScopeInput {
  id: string;
  targetId: string;
  targetKind: 'player' | 'team';
  family: string;
  eventType: string;
  valence: 'positive' | 'negative' | 'neutral';
  magnitude: number;
  probability: number;
  confirmationStatus: 'pending' | 'confirmed';
  applied: boolean;
  source: string;
  sourceEventId: string;
  createdAtGameNumber: number;
  createdAt: string;
}

export function resetFranchiseL10OverlaysForTests(): void {
  resetTrackerDbForTests();
}

export async function clearFranchiseL10OverlaysForTests(): Promise<void> {
  const db = await initFranchiseL10OverlayDatabase();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  tx.objectStore(STORE_NAME).clear();
  await transactionToPromise(tx);
}

export async function initFranchiseL10OverlayDatabase(): Promise<IDBDatabase> {
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

function scopeKey(scope: FranchiseL10OverlayScopeInput): [string, string, string] {
  return [scope.franchiseId, scope.seasonId, scope.statsScopeId];
}

function targetKey(
  scope: FranchiseL10OverlayScopeInput,
  targetId: string,
): [string, string, string, string] {
  return [scope.franchiseId, scope.seasonId, scope.statsScopeId, targetId];
}

function hasExplicitScope(scope: FranchiseL10OverlayScopeInput & { targetId?: string }): boolean {
  return Boolean(
    scope.franchiseId &&
    scope.seasonId &&
    scope.statsScopeId &&
    (scope.targetId === undefined || scope.targetId),
  );
}

function sortL10Overlays(rows: FranchiseL10OverlayRow[]): FranchiseL10OverlayRow[] {
  return rows.sort((left, right) =>
    left.targetId.localeCompare(right.targetId) ||
    left.family.localeCompare(right.family) ||
    left.sourceEventId.localeCompare(right.sourceEventId) ||
    left.id.localeCompare(right.id),
  );
}

export async function putFranchiseL10Overlay(
  row: FranchiseL10OverlayRow,
): Promise<void> {
  const db = await initFranchiseL10OverlayDatabase();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  tx.objectStore(STORE_NAME).put(row);
  await transactionToPromise(tx);

  if (!syncEngine.isSuppressed()) {
    syncEngine.upsert(DB_NAME, STORE_NAME, row.id, row);
  }
}

export async function getFranchiseL10OverlaysByTarget(
  scope: FranchiseL10OverlayScopeInput,
  targetId: string,
): Promise<FranchiseL10OverlayRow[]> {
  if (!hasExplicitScope({ ...scope, targetId })) return [];
  const db = await initFranchiseL10OverlayDatabase();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const rows = await requestToPromise<FranchiseL10OverlayRow[]>(
    tx.objectStore(STORE_NAME).index('by_target').getAll(targetKey(scope, targetId)),
  );
  return sortL10Overlays(
    (rows ?? []).filter((row) =>
      row.franchiseId === scope.franchiseId &&
      row.seasonId === scope.seasonId &&
      row.statsScopeId === scope.statsScopeId &&
      row.targetId === targetId,
    ),
  );
}

export async function getFranchiseL10OverlaysByScope(
  scope: FranchiseL10OverlayScopeInput,
): Promise<FranchiseL10OverlayRow[]> {
  if (!hasExplicitScope(scope)) return [];
  const db = await initFranchiseL10OverlayDatabase();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const rows = await requestToPromise<FranchiseL10OverlayRow[]>(
    tx.objectStore(STORE_NAME).index('by_scope').getAll(scopeKey(scope)),
  );
  return sortL10Overlays(
    (rows ?? []).filter((row) =>
      row.franchiseId === scope.franchiseId &&
      row.seasonId === scope.seasonId &&
      row.statsScopeId === scope.statsScopeId,
    ),
  );
}

export async function deleteFranchiseL10Overlay(id: string): Promise<void> {
  if (!id) return;
  const db = await initFranchiseL10OverlayDatabase();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  tx.objectStore(STORE_NAME).delete(id);
  await transactionToPromise(tx);

  if (!syncEngine.isSuppressed()) {
    syncEngine.remove(DB_NAME, STORE_NAME, id);
  }
}
