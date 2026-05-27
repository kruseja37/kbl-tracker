import { syncEngine } from './syncEngine';

export type FranchiseFarmRosterLevel = 'AAA' | 'AA' | 'A' | 'FARM';
export type FranchiseFarmRosterStatus = 'FARM';
export type FranchiseRatingRevealState = 'hidden' | 'revealed';

export interface FranchiseFarmRecord {
  id: string;
  franchiseId: string;
  seasonId: string;
  seasonNumber: number;
  teamId: string;
  playerId: string;
  rosterLevel: FranchiseFarmRosterLevel;
  rosterStatus: FranchiseFarmRosterStatus;
  optionsUsed: number;
  optionDates: string[];
  ratingRevealState: FranchiseRatingRevealState;
  assignedAt: string;
  lastModified: string;
}

export interface SaveFranchiseFarmRecordInput {
  franchiseId: string;
  seasonId: string;
  seasonNumber: number;
  teamId: string;
  playerId: string;
  rosterLevel?: FranchiseFarmRosterLevel;
  optionsUsed?: number;
  optionDates?: string[];
  ratingRevealState?: FranchiseRatingRevealState;
  assignedAt?: string;
}

const DB_NAME = 'kbl-franchise-farm';
const DB_VERSION = 1;

const STORES = {
  FARM_RECORDS: 'franchiseFarmRecords',
} as const;

let dbInstance: IDBDatabase | null = null;

function nowISO(): string {
  return new Date().toISOString();
}

export function getFranchiseFarmRecordId(
  franchiseId: string,
  seasonId: string,
  teamId: string,
  playerId: string,
): string {
  return `${franchiseId}:${seasonId}:${teamId}:${playerId}`;
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

function ensureIndex(
  store: IDBObjectStore,
  name: string,
  keyPath: string | string[],
  options?: IDBIndexParameters,
): void {
  if (!store.indexNames.contains(name)) {
    store.createIndex(name, keyPath, options);
  }
}

export async function initFranchiseFarmDatabase(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      let store: IDBObjectStore;
      if (!db.objectStoreNames.contains(STORES.FARM_RECORDS)) {
        store = db.createObjectStore(STORES.FARM_RECORDS, { keyPath: 'id' });
      } else {
        store = (event.target as IDBOpenDBRequest).transaction!.objectStore(STORES.FARM_RECORDS);
      }
      ensureIndex(store, 'by_franchise', 'franchiseId', { unique: false });
      ensureIndex(store, 'by_franchise_season', ['franchiseId', 'seasonId'], { unique: false });
      ensureIndex(store, 'by_franchise_season_team', ['franchiseId', 'seasonId', 'teamId'], { unique: false });
      ensureIndex(store, 'by_player_scope', ['franchiseId', 'seasonId', 'playerId'], { unique: false });
    };
    request.onsuccess = () => {
      dbInstance = request.result;
      dbInstance.onversionchange = () => {
        dbInstance?.close();
        dbInstance = null;
      };
      resolve(dbInstance);
    };
  });
}

export async function saveFranchiseFarmRecord(
  input: SaveFranchiseFarmRecordInput,
): Promise<FranchiseFarmRecord> {
  const db = await initFranchiseFarmDatabase();
  const timestamp = nowISO();
  const record: FranchiseFarmRecord = {
    id: getFranchiseFarmRecordId(input.franchiseId, input.seasonId, input.teamId, input.playerId),
    franchiseId: input.franchiseId,
    seasonId: input.seasonId,
    seasonNumber: input.seasonNumber,
    teamId: input.teamId,
    playerId: input.playerId,
    rosterLevel: input.rosterLevel ?? 'AAA',
    rosterStatus: 'FARM',
    optionsUsed: input.optionsUsed ?? 0,
    optionDates: input.optionDates ?? [],
    ratingRevealState: input.ratingRevealState ?? 'hidden',
    assignedAt: input.assignedAt ?? timestamp,
    lastModified: timestamp,
  };

  const tx = db.transaction(STORES.FARM_RECORDS, 'readwrite');
  tx.objectStore(STORES.FARM_RECORDS).put(record);
  await transactionToPromise(tx);

  if (!syncEngine.isSuppressed()) {
    syncEngine.upsert(DB_NAME, STORES.FARM_RECORDS, record.id, record);
  }

  return record;
}

export async function getFranchiseFarmRecord(
  franchiseId: string,
  seasonId: string,
  teamId: string,
  playerId: string,
): Promise<FranchiseFarmRecord | null> {
  const db = await initFranchiseFarmDatabase();
  const tx = db.transaction(STORES.FARM_RECORDS, 'readonly');
  const record = await requestToPromise<FranchiseFarmRecord | undefined>(
    tx.objectStore(STORES.FARM_RECORDS).get(getFranchiseFarmRecordId(franchiseId, seasonId, teamId, playerId)),
  );
  return record ?? null;
}

export async function getFranchiseFarmRoster(
  franchiseId: string,
  seasonId: string,
  teamId: string,
): Promise<FranchiseFarmRecord[]> {
  const db = await initFranchiseFarmDatabase();
  const tx = db.transaction(STORES.FARM_RECORDS, 'readonly');
  const index = tx.objectStore(STORES.FARM_RECORDS).index('by_franchise_season_team');
  const records = await requestToPromise<FranchiseFarmRecord[]>(
    index.getAll([franchiseId, seasonId, teamId]),
  );
  return records ?? [];
}

export async function getFranchiseFarmRecordsForSeason(
  franchiseId: string,
  seasonId: string,
): Promise<FranchiseFarmRecord[]> {
  const db = await initFranchiseFarmDatabase();
  const tx = db.transaction(STORES.FARM_RECORDS, 'readonly');
  const index = tx.objectStore(STORES.FARM_RECORDS).index('by_franchise_season');
  const records = await requestToPromise<FranchiseFarmRecord[]>(
    index.getAll([franchiseId, seasonId]),
  );
  return records ?? [];
}

export async function deleteFranchiseFarmRecord(
  franchiseId: string,
  seasonId: string,
  teamId: string,
  playerId: string,
): Promise<void> {
  const db = await initFranchiseFarmDatabase();
  const recordId = getFranchiseFarmRecordId(franchiseId, seasonId, teamId, playerId);
  const tx = db.transaction(STORES.FARM_RECORDS, 'readwrite');
  tx.objectStore(STORES.FARM_RECORDS).delete(recordId);
  await transactionToPromise(tx);

  if (!syncEngine.isSuppressed()) {
    syncEngine.remove(DB_NAME, STORES.FARM_RECORDS, recordId);
  }
}
