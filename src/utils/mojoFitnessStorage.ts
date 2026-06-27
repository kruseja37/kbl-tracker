import { getTrackerDb } from './trackerDb';
import type { MojoLevel } from '../engines/mojoEngine';
import type { FitnessState } from '../engines/fitnessEngine';
import { syncEngine } from './syncEngine';

const STORE = 'mojoFitnessSnapshots';

export interface MojoFitnessSnapshot {
  eliminationId: string;
  playerId: string;
  mojoLevel: MojoLevel;
  fitnessState: FitnessState;
  updatedAt: number;
}

export async function saveMojoFitnessSnapshots(
  eliminationId: string,
  players: Array<{ playerId: string; mojoLevel: MojoLevel; fitnessState: FitnessState }>
): Promise<void> {
  const db = await getTrackerDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    const updatedAt = Date.now();

    players.forEach((player) => {
      const snapshot = {
        eliminationId,
        playerId: player.playerId,
        mojoLevel: player.mojoLevel,
        fitnessState: player.fitnessState,
        updatedAt,
      } satisfies MojoFitnessSnapshot;
      store.put(snapshot);
      if (!syncEngine.isSuppressed()) {
        syncEngine.upsert('kbl-tracker', STORE, [eliminationId, player.playerId], snapshot);
      }
    });

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export async function loadMojoFitnessSnapshots(
  eliminationId: string
): Promise<MojoFitnessSnapshot[]> {
  const db = await getTrackerDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const store = tx.objectStore(STORE);
    const index = store.index('eliminationId');
    const request = index.getAll(eliminationId);

    request.onsuccess = () => resolve((request.result || []) as MojoFitnessSnapshot[]);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Franchise condition snapshots reuse the SAME mojoFitnessSnapshots store (already in trackerDb +
 * backup/sync), scoped by a synthetic `franchise:<franchiseId>` key in place of an eliminationId.
 * This is the franchise analogue of the elimination-mode flow: the user sets a player's fitness on
 * the team hub, we persist it here, and the franchise GameTracker roster builder reads it back at
 * game launch (mirroring loadMojoFitnessSnapshots in the elimination path). No new store / no DB bump.
 */
export function franchiseConditionScopeId(franchiseId: string): string {
  return `franchise:${franchiseId}`;
}

export async function saveFranchiseFitness(
  franchiseId: string,
  playerId: string,
  fitnessState: FitnessState,
  mojoLevel: MojoLevel = 0 as MojoLevel,
): Promise<void> {
  return saveMojoFitnessSnapshots(franchiseConditionScopeId(franchiseId), [
    { playerId, mojoLevel, fitnessState },
  ]);
}

export async function loadFranchiseConditionSnapshots(
  franchiseId: string,
): Promise<MojoFitnessSnapshot[]> {
  return loadMojoFitnessSnapshots(franchiseConditionScopeId(franchiseId));
}

export async function deleteMojoFitnessSnapshots(
  eliminationId: string
): Promise<void> {
  const db = await getTrackerDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    const index = store.index('eliminationId');
    const request = index.openCursor(IDBKeyRange.only(eliminationId));

    request.onsuccess = () => {
      const cursor = request.result;
      if (cursor) {
        const snapshot = cursor.value as MojoFitnessSnapshot;
        cursor.delete();
        if (!syncEngine.isSuppressed()) {
          syncEngine.remove('kbl-tracker', STORE, [snapshot.eliminationId, snapshot.playerId]);
        }
        cursor.continue();
      }
    };
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}
