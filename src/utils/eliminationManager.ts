/**
 * Elimination Manager — CRUD for elimination bracket instances. Per ELIMINATION_MODE_SPEC.md §2.5.
 */

import { initMetaDatabase as openMetaDatabase } from './franchiseManager';

const ELIMINATION_STORE = 'eliminationList';

export interface EliminationMetadata {
  eliminationId: string;
  name: string;
  leagueId: string;
  leagueName: string;
  status: 'SETUP' | 'IN_PROGRESS' | 'COMPLETED';
  createdAt: number;
  lastPlayedAt: number;
  teamsCount: number;
  currentRound: number;
  champion?: string;
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

/**
 * Generate a unique elimination bracket ID.
 */
export function generateEliminationId(): string {
  return `elim-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Create and persist elimination bracket metadata in `kbl-app-meta` -> `eliminationList`.
 */
export async function createElimination(params: {
  name: string;
  leagueId: string;
  leagueName: string;
  teamsCount: number;
}): Promise<EliminationMetadata> {
  const db = await openMetaDatabase();
  const tx = db.transaction(ELIMINATION_STORE, 'readwrite');
  const store = tx.objectStore(ELIMINATION_STORE);
  const now = Date.now();

  const metadata: EliminationMetadata = {
    eliminationId: generateEliminationId(),
    name: params.name,
    leagueId: params.leagueId,
    leagueName: params.leagueName,
    status: 'SETUP',
    createdAt: now,
    lastPlayedAt: now,
    teamsCount: params.teamsCount,
    currentRound: 0,
  };

  await requestToPromise(store.put(metadata));
  await transactionToPromise(tx);
  return metadata;
}

/**
 * Load a single elimination bracket metadata record by ID.
 */
export async function getElimination(eliminationId: string): Promise<EliminationMetadata | null> {
  const db = await openMetaDatabase();
  const tx = db.transaction(ELIMINATION_STORE, 'readonly');
  const store = tx.objectStore(ELIMINATION_STORE);
  const result = await requestToPromise(store.get(eliminationId));

  return (result as EliminationMetadata | undefined) ?? null;
}

/**
 * List all elimination bracket metadata records, newest activity first.
 */
export async function listEliminations(): Promise<EliminationMetadata[]> {
  const db = await openMetaDatabase();
  const tx = db.transaction(ELIMINATION_STORE, 'readonly');
  const store = tx.objectStore(ELIMINATION_STORE);
  const results = await requestToPromise(store.getAll());

  return (results as EliminationMetadata[]).sort((a, b) => b.lastPlayedAt - a.lastPlayedAt);
}

/**
 * Update an existing elimination bracket metadata record by merging partial fields.
 */
export async function updateElimination(
  eliminationId: string,
  updates: Partial<Omit<EliminationMetadata, 'eliminationId' | 'createdAt'>>
): Promise<void> {
  const db = await openMetaDatabase();
  const tx = db.transaction(ELIMINATION_STORE, 'readwrite');
  const store = tx.objectStore(ELIMINATION_STORE);
  const existing = (await requestToPromise(store.get(eliminationId))) as EliminationMetadata | undefined;

  if (!existing) {
    throw new Error(`Elimination bracket not found: ${eliminationId}`);
  }

  const updated: EliminationMetadata = {
    ...existing,
    ...updates,
    eliminationId: existing.eliminationId,
    createdAt: existing.createdAt,
  };

  await requestToPromise(store.put(updated));
  await transactionToPromise(tx);
}

/**
 * Delete elimination metadata from `eliminationList`.
 */
export async function deleteElimination(eliminationId: string): Promise<void> {
  const db = await openMetaDatabase();
  const tx = db.transaction(ELIMINATION_STORE, 'readwrite');
  const store = tx.objectStore(ELIMINATION_STORE);

  // TODO: Delete related bracket data from kbl-playoffs and stats from kbl-tracker separately.
  await requestToPromise(store.delete(eliminationId));
  await transactionToPromise(tx);
}
