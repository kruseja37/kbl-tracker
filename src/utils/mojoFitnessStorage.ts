import { getTrackerDb } from './trackerDb';
import type { MojoLevel } from '../engines/mojoEngine';
import type { FitnessState } from '../engines/fitnessEngine';

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
      store.put({
        eliminationId,
        playerId: player.playerId,
        mojoLevel: player.mojoLevel,
        fitnessState: player.fitnessState,
        updatedAt,
      } satisfies MojoFitnessSnapshot);
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
        cursor.delete();
        cursor.continue();
      }
    };
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}
