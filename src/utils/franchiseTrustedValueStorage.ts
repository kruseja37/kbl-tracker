import { syncEngine } from './syncEngine';
import { getTrackerDb, resetTrackerDbForTests } from './trackerDb';

export const FRANCHISE_TRUSTED_VALUE_CONTRACT_VERSION = 'd6-v1';
export const FRANCHISE_TRUSTED_VALUE_PEER_POOL_MIN_THRESHOLD = 2;
export const FRANCHISE_TRUSTED_VALUE_ARTIFACT_STORE_NAME = 'franchiseTrustedValueArtifacts';

const DB_NAME = 'kbl-tracker';
const STORE_NAME = FRANCHISE_TRUSTED_VALUE_ARTIFACT_STORE_NAME;

export interface FranchiseTrustedValueScopeInput {
  franchiseId: string;
  seasonId: string;
  statsScopeId: string;
}

export interface FranchiseTrustedValueArtifact extends FranchiseTrustedValueScopeInput {
  seasonNumber: number;
  contractVersion: typeof FRANCHISE_TRUSTED_VALUE_CONTRACT_VERSION;
  peerPoolMinThreshold: typeof FRANCHISE_TRUSTED_VALUE_PEER_POOL_MIN_THRESHOLD;
  trustedPlayerIds: string[];
  blockedRows: Array<{
    playerId: string;
    reasons: string[];
  }>;
  rosterStateSnapshot: Array<{
    playerId: string;
    teamId: string;
    rosterStatus: string;
  }>;
  frozen: boolean;
  frozenAt: number | null;
  computedAt: number;
}

export function resetFranchiseTrustedValueDatabaseForTests(): void {
  resetTrackerDbForTests();
}

export async function clearFranchiseTrustedValueDatabaseForTests(): Promise<void> {
  const db = await initFranchiseTrustedValueDatabase();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  tx.objectStore(STORE_NAME).clear();
  await transactionToPromise(tx);
}

export async function initFranchiseTrustedValueDatabase(): Promise<IDBDatabase> {
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

function scopeKey(scope: FranchiseTrustedValueScopeInput): [string, string, string] {
  return [scope.franchiseId, scope.seasonId, scope.statsScopeId];
}

function hasExplicitScope(scope: FranchiseTrustedValueScopeInput): boolean {
  return Boolean(scope.franchiseId && scope.seasonId && scope.statsScopeId);
}

export async function persistTrustedValueArtifact(
  artifact: FranchiseTrustedValueArtifact,
): Promise<FranchiseTrustedValueArtifact> {
  if (!hasExplicitScope(artifact)) {
    throw new Error('Explicit franchiseId, seasonId, and statsScopeId are required for trusted value artifacts.');
  }
  const existing = await getTrustedValueArtifact(artifact.franchiseId, artifact.seasonId, artifact.statsScopeId);
  if (existing?.frozen === true && artifact.frozen !== true) {
    console.warn('[TrustedValue] refused to overwrite a frozen artifact', scopeKey(artifact));
    return existing;
  }
  const db = await initFranchiseTrustedValueDatabase();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  tx.objectStore(STORE_NAME).put(artifact);
  await transactionToPromise(tx);

  if (!syncEngine.isSuppressed()) {
    syncEngine.upsert(DB_NAME, STORE_NAME, scopeKey(artifact), artifact);
  }

  return artifact;
}

export async function freezeTrustedValueArtifactForSeason(
  scope: FranchiseTrustedValueScopeInput,
): Promise<FranchiseTrustedValueArtifact | null> {
  const existing = await getTrustedValueArtifact(scope.franchiseId, scope.seasonId, scope.statsScopeId);
  if (!existing) {
    console.warn('[TrustedValue] freeze skipped: no artifact for scope', scope);
    return null;
  }
  if (existing.frozen === true) return existing;

  return persistTrustedValueArtifact({
    ...existing,
    frozen: true,
    frozenAt: Date.now(),
  });
}

export async function getTrustedValueArtifact(
  franchiseId: string,
  seasonId: string,
  statsScopeId: string,
): Promise<FranchiseTrustedValueArtifact | null> {
  const scope = { franchiseId, seasonId, statsScopeId };
  if (!hasExplicitScope(scope)) return null;
  const db = await initFranchiseTrustedValueDatabase();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const artifact = await requestToPromise<FranchiseTrustedValueArtifact | undefined>(
    tx.objectStore(STORE_NAME).get(scopeKey(scope)),
  );
  return artifact ?? null;
}

export function isPlayerTrustedForValue(
  artifact: FranchiseTrustedValueArtifact | null | undefined,
  playerId: string | null | undefined,
): boolean {
  return Boolean(artifact && playerId && artifact.trustedPlayerIds.includes(playerId));
}
