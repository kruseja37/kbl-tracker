import { getTrackerDb } from '../utils/trackerDb';
import {
  getPlayersByTeam,
  getTeam,
  getTeamRoster,
  type LineupSlot,
  type Player,
  type TeamRoster,
} from '../utils/leagueBuilderStorage';

const SNAPSHOT_STORE = 'rosterSnapshots';

export interface EliminationRosterSnapshot {
  key: string;
  eliminationId: string;
  teamId: string;
  teamName: string;
  players: Player[];
  lineup: LineupSlot[];
  startingRotation: string[];
  snapshotAt: number;
}

function getSnapshotKey(eliminationId: string, teamId: string): string {
  return `elim-roster-${eliminationId}-${teamId}`;
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

function buildSnapshot(
  eliminationId: string,
  teamId: string,
  teamName: string,
  players: Player[],
  roster: TeamRoster
): EliminationRosterSnapshot {
  return {
    key: getSnapshotKey(eliminationId, teamId),
    eliminationId,
    teamId,
    teamName,
    players,
    lineup: roster.lineupVsRHP,
    startingRotation: roster.startingRotation,
    snapshotAt: Date.now(),
  };
}

/**
 * Create frozen roster snapshots for every team in an elimination bracket.
 */
export async function createRosterSnapshots(eliminationId: string, teamIds: string[]): Promise<void> {
  const snapshots = await Promise.all(
    teamIds.map(async (teamId) => {
      const [team, roster, players] = await Promise.all([
        getTeam(teamId),
        getTeamRoster(teamId),
        getPlayersByTeam(teamId),
      ]);

      if (!team) {
        throw new Error(`League Builder team not found for snapshot: ${teamId}`);
      }

      if (!roster) {
        throw new Error(`League Builder roster not found for snapshot: ${teamId}`);
      }

      return buildSnapshot(eliminationId, teamId, team.name, players, roster);
    })
  );

  const db = await getTrackerDb();
  const tx = db.transaction(SNAPSHOT_STORE, 'readwrite');
  const store = tx.objectStore(SNAPSHOT_STORE);

  for (const snapshot of snapshots) {
    await requestToPromise(store.put(snapshot));
  }

  await transactionToPromise(tx);
}

/**
 * Get a single roster snapshot by elimination ID and team ID.
 */
export async function getEliminationRosterSnapshot(
  eliminationId: string,
  teamId: string
): Promise<EliminationRosterSnapshot | null> {
  const db = await getTrackerDb();
  const tx = db.transaction(SNAPSHOT_STORE, 'readonly');
  const store = tx.objectStore(SNAPSHOT_STORE);
  const snapshot = await requestToPromise(store.get(getSnapshotKey(eliminationId, teamId)));

  return (snapshot as EliminationRosterSnapshot | undefined) ?? null;
}

/**
 * Get every roster snapshot for a single elimination bracket.
 */
export async function getAllEliminationRosterSnapshots(
  eliminationId: string
): Promise<EliminationRosterSnapshot[]> {
  const db = await getTrackerDb();
  const tx = db.transaction(SNAPSHOT_STORE, 'readonly');
  const store = tx.objectStore(SNAPSHOT_STORE);
  const index = store.index('eliminationId');
  const snapshots = await requestToPromise(index.getAll(eliminationId));

  return (snapshots as EliminationRosterSnapshot[]).sort((a, b) => a.teamName.localeCompare(b.teamName));
}

/**
 * Update lineup or rotation data for a frozen roster snapshot.
 */
export async function updateEliminationRosterSnapshot(
  eliminationId: string,
  teamId: string,
  updates: Partial<Pick<EliminationRosterSnapshot, 'lineup' | 'startingRotation'>>
): Promise<void> {
  const existing = await getEliminationRosterSnapshot(eliminationId, teamId);

  if (!existing) {
    throw new Error(`Roster snapshot not found: ${eliminationId}/${teamId}`);
  }

  const db = await getTrackerDb();
  const tx = db.transaction(SNAPSHOT_STORE, 'readwrite');
  const store = tx.objectStore(SNAPSHOT_STORE);

  await requestToPromise(
    store.put({
      ...existing,
      ...updates,
    })
  );
  await transactionToPromise(tx);
}

/**
 * Delete every roster snapshot tied to an elimination bracket.
 */
export async function deleteEliminationRosterSnapshots(eliminationId: string): Promise<void> {
  const db = await getTrackerDb();
  const tx = db.transaction(SNAPSHOT_STORE, 'readwrite');
  const store = tx.objectStore(SNAPSHOT_STORE);
  const index = store.index('eliminationId');
  const keys = await requestToPromise(index.getAllKeys(eliminationId));

  for (const key of keys as IDBValidKey[]) {
    await requestToPromise(store.delete(key));
  }

  await transactionToPromise(tx);
}
