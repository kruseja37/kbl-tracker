import { getTrackerDb } from './trackerDb';
import { syncEngine } from './syncEngine';

const STORE_NAME = 'almanacCanonicalPlayers';

export interface CanonicalPlayerInstance {
  mode: 'exhibition' | 'franchise' | 'elimination';
  instanceId: string;
  instanceName: string;
  playerIdInInstance: string;
}

export interface CanonicalPlayer {
  canonicalId: string;
  playerName: string;
  hometown: { city: string; state: string };
  instances: CanonicalPlayerInstance[];
}

export async function getCanonicalPlayer(canonicalId: string): Promise<CanonicalPlayer | null> {
  const db = await getTrackerDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(canonicalId);

    request.onsuccess = () => resolve((request.result as CanonicalPlayer | undefined) ?? null);
    request.onerror = () => reject(request.error);
  });
}

export async function getAllCanonicalPlayers(): Promise<CanonicalPlayer[]> {
  const db = await getTrackerDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      const players = (request.result as CanonicalPlayer[] | undefined) ?? [];
      resolve(players.sort((a, b) => a.playerName.localeCompare(b.playerName)));
    };
    request.onerror = () => reject(request.error);
  });
}

export async function searchCanonicalPlayers(query: string): Promise<CanonicalPlayer[]> {
  const normalizedQuery = query.trim().toLowerCase();
  const players = await getAllCanonicalPlayers();

  if (!normalizedQuery) {
    console.log('[M4-1] searchCanonicalPlayers', {
      query,
      normalizedQuery,
      results: players.map((player) => player.playerName),
    });
    return players;
  }

  const results = players.filter((player) =>
    player.playerName.toLowerCase().includes(normalizedQuery),
  );

  console.log('[M4-1] searchCanonicalPlayers', {
    query,
    normalizedQuery,
    results: results.map((player) => player.playerName),
  });

  return results;
}

export async function upsertCanonicalPlayer(player: CanonicalPlayer): Promise<void> {
  const db = await getTrackerDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(player);

    request.onsuccess = () => {
      if (!syncEngine.isSuppressed()) syncEngine.upsert('kbl-tracker', 'almanacCanonicalPlayers', player.canonicalId, player);
      resolve();
    };
    request.onerror = () => reject(request.error);
  });
}

export async function findCanonicalByPlayerId(playerId: string): Promise<CanonicalPlayer | null> {
  const players = await getAllCanonicalPlayers();

  return players.find((player) =>
    player.instances.some((instance) => instance.playerIdInInstance === playerId)
  ) ?? null;
}

export async function removeCanonicalPlayerInstancesForFranchise(
  franchiseId: string,
): Promise<{ updated: number; deleted: number }> {
  const db = await getTrackerDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.openCursor();
    let updated = 0;
    let deleted = 0;
    const syncUpdates: CanonicalPlayer[] = [];
    const syncDeletes: string[] = [];

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) {
        return;
      }

      const player = cursor.value as CanonicalPlayer;
      const nextInstances = player.instances.filter(
        (instance) =>
          !(instance.mode === 'franchise' && instance.instanceId === franchiseId),
      );

      if (nextInstances.length === player.instances.length) {
        cursor.continue();
        return;
      }

      if (nextInstances.length === 0) {
        deleted += 1;
        syncDeletes.push(player.canonicalId);
        cursor.delete();
        cursor.continue();
        return;
      }

      const nextPlayer: CanonicalPlayer = {
        ...player,
        instances: nextInstances,
      };
      updated += 1;
      syncUpdates.push(nextPlayer);
      cursor.update(nextPlayer);
      cursor.continue();
    };

    tx.oncomplete = () => {
      if (!syncEngine.isSuppressed()) {
        for (const player of syncUpdates) {
          syncEngine.upsert('kbl-tracker', STORE_NAME, player.canonicalId, player);
        }
        for (const canonicalId of syncDeletes) {
          syncEngine.remove('kbl-tracker', STORE_NAME, canonicalId);
        }
      }
      resolve({ updated, deleted });
    };
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}
