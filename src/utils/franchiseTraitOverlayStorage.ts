import { syncEngine } from './syncEngine';
import { getTrackerDb, resetTrackerDbForTests } from './trackerDb';

export const FRANCHISE_TRAIT_OVERLAY_STORE_NAME = 'franchiseTraitOverlays';

const DB_NAME = 'kbl-tracker';
const STORE_NAME = FRANCHISE_TRAIT_OVERLAY_STORE_NAME;

export interface FranchiseTraitOverlayScopeInput {
  franchiseId: string;
  seasonId: string;
  statsScopeId: string;
}

export interface FranchiseTraitSlotValue {
  trait1: string | null;
  trait2: string | null;
}

export interface FranchiseTraitOverlayRow extends FranchiseTraitOverlayScopeInput {
  id: string;
  playerId: string;
  /** 'gain' adds the trait (possibly displacing a held one); 'lose' removes a held trait. */
  valence: 'gain' | 'lose';
  /** Canonical trait name (must be a CANONICAL_TRAIT_NAMES member - validated by the L9b-3b-ii writer, not here). */
  traitName: string;
  /** On a capped gain, the weakest held trait this displaces; null otherwise (lose, or gain into a free slot). */
  displacesTraitName: string | null;
  /** Audit/display snapshots carried from the L9b-2 proposal. */
  realityPercentile: number;
  probability: number;
  /** Section 11 two-tier confirmation lifecycle (mirrors the ratings overlay). */
  confirmationStatus:
    | 'pending'
    | 'confirmed'
    | 'confirmed-applied'
    | 'rejected'
    | 'conflict'
    | 'apply-failed';
  /** Whether the categorical trait1/trait2 write to the player record has been applied (L9b-3c sets it). */
  applied: boolean;
  expectedPriorValue?: FranchiseTraitSlotValue;
  proposedValue?: FranchiseTraitSlotValue;
  actualEnteredValue?: FranchiseTraitSlotValue;
  resolvedAt?: number;
  resolvedCivilDate?: string;
  resolvedBy?: string;
  rejectReason?: string;
  playerRecordRevision?: string;
  applyError?: string;
  boundaryGameNumber?: number;
  ordinal?: number;
  source: string;
  sourceEventId: string;
  createdAtGameNumber: number;
  /** ISO timestamp supplied by the caller; storage never generates time. */
  createdAt: string;
}

export function resetFranchiseTraitOverlaysForTests(): void {
  resetTrackerDbForTests();
}

export async function clearFranchiseTraitOverlaysForTests(): Promise<void> {
  const db = await initFranchiseTraitOverlayDatabase();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  tx.objectStore(STORE_NAME).clear();
  await transactionToPromise(tx);
}

export async function initFranchiseTraitOverlayDatabase(): Promise<IDBDatabase> {
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

function scopeKey(scope: FranchiseTraitOverlayScopeInput): [string, string, string] {
  return [scope.franchiseId, scope.seasonId, scope.statsScopeId];
}

function playerKey(
  scope: FranchiseTraitOverlayScopeInput,
  playerId: string,
): [string, string, string, string] {
  return [scope.franchiseId, scope.seasonId, scope.statsScopeId, playerId];
}

function hasExplicitScope(scope: FranchiseTraitOverlayScopeInput & { playerId?: string }): boolean {
  return Boolean(
    scope.franchiseId &&
    scope.seasonId &&
    scope.statsScopeId &&
    (scope.playerId === undefined || scope.playerId),
  );
}

function sortTraitOverlays(
  rows: FranchiseTraitOverlayRow[],
): FranchiseTraitOverlayRow[] {
  return rows.sort((left, right) =>
    left.playerId.localeCompare(right.playerId) ||
    left.traitName.localeCompare(right.traitName) ||
    left.sourceEventId.localeCompare(right.sourceEventId) ||
    left.id.localeCompare(right.id),
  );
}

export async function putFranchiseTraitOverlay(
  row: FranchiseTraitOverlayRow,
): Promise<void> {
  const db = await initFranchiseTraitOverlayDatabase();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  tx.objectStore(STORE_NAME).put(row);
  await transactionToPromise(tx);

  if (!syncEngine.isSuppressed()) {
    syncEngine.upsert(DB_NAME, STORE_NAME, row.id, row);
  }
}

export async function getFranchiseTraitOverlaysByPlayer(
  scope: FranchiseTraitOverlayScopeInput,
  playerId: string,
): Promise<FranchiseTraitOverlayRow[]> {
  if (!hasExplicitScope({ ...scope, playerId })) return [];
  const db = await initFranchiseTraitOverlayDatabase();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const rows = await requestToPromise<FranchiseTraitOverlayRow[]>(
    tx.objectStore(STORE_NAME).index('by_player').getAll(playerKey(scope, playerId)),
  );
  return sortTraitOverlays(
    (rows ?? []).filter((row) =>
      row.franchiseId === scope.franchiseId &&
      row.seasonId === scope.seasonId &&
      row.statsScopeId === scope.statsScopeId &&
      row.playerId === playerId,
    ),
  );
}

export async function getFranchiseTraitOverlaysByScope(
  scope: FranchiseTraitOverlayScopeInput,
): Promise<FranchiseTraitOverlayRow[]> {
  if (!hasExplicitScope(scope)) return [];
  const db = await initFranchiseTraitOverlayDatabase();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const rows = await requestToPromise<FranchiseTraitOverlayRow[]>(
    tx.objectStore(STORE_NAME).index('by_scope').getAll(scopeKey(scope)),
  );
  return sortTraitOverlays(
    (rows ?? []).filter((row) =>
      row.franchiseId === scope.franchiseId &&
      row.seasonId === scope.seasonId &&
      row.statsScopeId === scope.statsScopeId,
    ),
  );
}

export async function getFranchiseTraitOverlayById(
  id: string,
): Promise<FranchiseTraitOverlayRow | null> {
  if (!id) return null;
  const db = await initFranchiseTraitOverlayDatabase();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const row = await requestToPromise<FranchiseTraitOverlayRow | undefined>(
    tx.objectStore(STORE_NAME).get(id),
  );
  return row ?? null;
}

async function getAllFranchiseTraitOverlays(): Promise<FranchiseTraitOverlayRow[]> {
  const db = await initFranchiseTraitOverlayDatabase();
  const tx = db.transaction(STORE_NAME, 'readonly');
  return requestToPromise<FranchiseTraitOverlayRow[]>(tx.objectStore(STORE_NAME).getAll());
}

export async function getFranchiseTraitOverlaysByFranchiseSeason(
  franchiseId: string,
  seasonId: string,
): Promise<FranchiseTraitOverlayRow[]> {
  if (!franchiseId || !seasonId) return [];
  return sortTraitOverlays(
    (await getAllFranchiseTraitOverlays()).filter(
      (row) => row.franchiseId === franchiseId && row.seasonId === seasonId,
    ),
  );
}

export async function getFranchiseTraitOverlaysByFranchisePlayer(
  franchiseId: string,
  playerId: string,
): Promise<FranchiseTraitOverlayRow[]> {
  if (!franchiseId || !playerId) return [];
  return sortTraitOverlays(
    (await getAllFranchiseTraitOverlays()).filter(
      (row) => row.franchiseId === franchiseId && row.playerId === playerId,
    ),
  );
}

export async function deleteFranchiseTraitOverlay(id: string): Promise<void> {
  if (!id) return;
  const db = await initFranchiseTraitOverlayDatabase();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  tx.objectStore(STORE_NAME).delete(id);
  await transactionToPromise(tx);

  if (!syncEngine.isSuppressed()) {
    syncEngine.remove(DB_NAME, STORE_NAME, id);
  }
}
