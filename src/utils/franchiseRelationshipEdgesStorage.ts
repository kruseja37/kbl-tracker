import { syncEngine } from './syncEngine';
import { getTrackerDb, resetTrackerDbForTests } from './trackerDb';

export const FRANCHISE_RELATIONSHIP_EDGES_STORE_NAME = 'franchiseRelationshipEdges';
export const STORE_NAME = FRANCHISE_RELATIONSHIP_EDGES_STORE_NAME;

const DB_NAME = 'kbl-tracker';

export interface FranchiseRelationshipEdgeScopeInput {
  franchiseId: string;
  seasonId: string;
  statsScopeId: string;
}

export type RelationshipEdgeType =
  | 'RIVALRY'
  | 'FEUD'
  | 'MENTORSHIP'
  | 'FRIENDSHIP'
  | 'ROMANCE'
  | 'HISTORY';

export interface RelationshipEdgeRow extends FranchiseRelationshipEdgeScopeInput {
  id: string;
  seasonNumber: number;
  player1Id: string;
  player2Id: string;
  type: RelationshipEdgeType;
  /** Strength scalar in [0, 1], folded into the edge row per L13 Fork B. */
  intensity: number;
  /** Potential edges can drive reporter intel before they become active. */
  potential: boolean;
  /** Reporter intel confidence for this edge. */
  accuracy: number;
  formedAtGameNumber: number | null;
  dissolvedAtGameNumber: number | null;
  createdAt: number;
  updatedAt?: number;
}

export function resetFranchiseRelationshipEdgesForTests(): void {
  resetTrackerDbForTests();
}

export async function clearFranchiseRelationshipEdgesForTests(): Promise<void> {
  const db = await initFranchiseRelationshipEdgeDatabase();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  tx.objectStore(STORE_NAME).clear();
  await transactionToPromise(tx);
}

export async function initFranchiseRelationshipEdgeDatabase(): Promise<IDBDatabase> {
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

function scopeKey(scope: FranchiseRelationshipEdgeScopeInput): [string, string, string] {
  return [scope.franchiseId, scope.seasonId, scope.statsScopeId];
}

function hasExplicitScope(scope: FranchiseRelationshipEdgeScopeInput): boolean {
  return Boolean(scope.franchiseId && scope.seasonId && scope.statsScopeId);
}

function canonicalRelationshipPair(player1Id: string, player2Id: string): [string, string] {
  return [player1Id, player2Id].sort((left, right) => left.localeCompare(right)) as [string, string];
}

function sortRelationshipEdges(rows: RelationshipEdgeRow[]): RelationshipEdgeRow[] {
  return rows.sort((left, right) =>
    left.player1Id.localeCompare(right.player1Id) ||
    left.player2Id.localeCompare(right.player2Id) ||
    left.type.localeCompare(right.type) ||
    left.id.localeCompare(right.id),
  );
}

export function franchiseRelationshipEdgeId(
  scope: FranchiseRelationshipEdgeScopeInput,
  player1Id: string,
  player2Id: string,
  type: RelationshipEdgeType,
): string {
  const [canonicalPlayer1Id, canonicalPlayer2Id] = canonicalRelationshipPair(player1Id, player2Id);
  return [
    scope.franchiseId,
    scope.seasonId,
    scope.statsScopeId,
    canonicalPlayer1Id,
    canonicalPlayer2Id,
    type,
  ].join(':');
}

export async function putFranchiseRelationshipEdge(
  row: RelationshipEdgeRow,
): Promise<void> {
  const db = await initFranchiseRelationshipEdgeDatabase();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  tx.objectStore(STORE_NAME).put(row);
  await transactionToPromise(tx);

  if (!syncEngine.isSuppressed()) {
    syncEngine.upsert(DB_NAME, STORE_NAME, row.id, row);
  }
}

export async function getFranchiseRelationshipEdge(
  id: string,
): Promise<RelationshipEdgeRow | undefined> {
  if (!id) return undefined;
  const db = await initFranchiseRelationshipEdgeDatabase();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const row = await requestToPromise<RelationshipEdgeRow | undefined>(
    tx.objectStore(STORE_NAME).get(id),
  );
  await transactionToPromise(tx);
  return row;
}

export async function getFranchiseRelationshipEdgesByScope(
  scope: FranchiseRelationshipEdgeScopeInput,
): Promise<RelationshipEdgeRow[]> {
  if (!hasExplicitScope(scope)) return [];
  const db = await initFranchiseRelationshipEdgeDatabase();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const rows = await requestToPromise<RelationshipEdgeRow[]>(
    tx.objectStore(STORE_NAME).index('by_scope').getAll(scopeKey(scope)),
  );
  await transactionToPromise(tx);
  return sortRelationshipEdges(
    (rows ?? []).filter((row) =>
      row.franchiseId === scope.franchiseId &&
      row.seasonId === scope.seasonId &&
      row.statsScopeId === scope.statsScopeId,
    ),
  );
}
