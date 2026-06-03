import { syncEngine } from './syncEngine';

export const FRANCHISE_MORALE_STATE_CONTRACT_VERSION = 'franchise-morale-state-v1';

export type FranchiseMoraleTargetType = 'team-fan' | 'player';
export type FranchiseMoraleSourceKind = 'random-event-confirmation' | 'manual-override';

export interface FranchiseMoraleScope {
  franchiseId: string;
  seasonId: string;
  statsScopeId: string;
  seasonNumber: number;
}

export interface FranchiseMoraleHistoryEntry {
  id: string;
  sourceEventId: string;
  sourceKind: FranchiseMoraleSourceKind;
  previousValue: number;
  currentValue: number;
  delta: number;
  reason: string;
  actorDisplayName: string;
  timestamp: string;
}

export interface FranchiseMoraleSnapshot extends FranchiseMoraleScope {
  id: string;
  contractVersion: typeof FRANCHISE_MORALE_STATE_CONTRACT_VERSION;
  targetType: FranchiseMoraleTargetType;
  teamId?: string;
  playerId?: string;
  baselineValue: number;
  currentValue: number;
  lastModified: string;
  history: FranchiseMoraleHistoryEntry[];
}

export interface ApplyFranchiseMoraleEffectInput extends FranchiseMoraleScope {
  targetType: FranchiseMoraleTargetType;
  teamId?: string;
  playerId?: string;
  delta: number;
  reason: string;
  sourceEventId: string;
  sourceKind?: FranchiseMoraleSourceKind;
  actorDisplayName?: string;
  timestamp?: string;
}

export interface ApplyFranchiseMoraleEffectResult {
  status: 'applied' | 'skipped' | 'failed';
  snapshot: FranchiseMoraleSnapshot | null;
  previousValue: number | null;
  currentValue: number | null;
  delta: number;
  reason: string;
  blockers: string[];
}

const DB_NAME = 'kbl-franchise-morale';
const DB_VERSION = 1;
const STORES = {
  SNAPSHOTS: 'moraleSnapshots',
} as const;

let dbInstance: IDBDatabase | null = null;

export function resetFranchiseMoraleDatabaseForTests(): void {
  dbInstance?.close();
  dbInstance = null;
}

export async function clearFranchiseMoraleDatabaseForTests(): Promise<void> {
  const db = await initFranchiseMoraleDatabase();
  const tx = db.transaction(STORES.SNAPSHOTS, 'readwrite');
  tx.objectStore(STORES.SNAPSHOTS).clear();
  await transactionToPromise(tx);
}

function nowISO(): string {
  return new Date().toISOString();
}

export function clampFranchiseMorale(value: number): number {
  if (!Number.isFinite(value)) return 50;
  return Math.max(0, Math.min(99, Math.round(value)));
}

export function getFranchiseMoraleSnapshotId(
  scope: Pick<FranchiseMoraleScope, 'franchiseId' | 'seasonId' | 'statsScopeId'>,
  targetType: FranchiseMoraleTargetType,
  targetId: string,
): string {
  return `${scope.franchiseId}:${scope.seasonId}:${scope.statsScopeId}:morale:${targetType}:${targetId}`;
}

function targetId(input: Pick<ApplyFranchiseMoraleEffectInput, 'targetType' | 'teamId' | 'playerId'>): string | null {
  if (input.targetType === 'team-fan') return input.teamId ?? null;
  return input.playerId ?? null;
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

export async function initFranchiseMoraleDatabase(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      let store: IDBObjectStore;
      if (!db.objectStoreNames.contains(STORES.SNAPSHOTS)) {
        store = db.createObjectStore(STORES.SNAPSHOTS, { keyPath: 'id' });
      } else {
        store = (event.target as IDBOpenDBRequest).transaction!.objectStore(STORES.SNAPSHOTS);
      }
      ensureIndex(store, 'by_franchise', 'franchiseId', { unique: false });
      ensureIndex(store, 'by_franchise_season', ['franchiseId', 'seasonId'], { unique: false });
      ensureIndex(store, 'by_scope_target', ['franchiseId', 'seasonId', 'statsScopeId', 'targetType'], { unique: false });
      ensureIndex(store, 'by_team_scope', ['franchiseId', 'seasonId', 'statsScopeId', 'teamId'], { unique: false });
      ensureIndex(store, 'by_player_scope', ['franchiseId', 'seasonId', 'statsScopeId', 'playerId'], { unique: false });
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

function createSnapshot(
  input: FranchiseMoraleScope & {
    targetType: FranchiseMoraleTargetType;
    teamId?: string;
    playerId?: string;
    timestamp: string;
  },
): FranchiseMoraleSnapshot {
  const idTarget = input.targetType === 'team-fan' ? input.teamId : input.playerId;
  return {
    id: getFranchiseMoraleSnapshotId(input, input.targetType, idTarget ?? 'missing-target'),
    contractVersion: FRANCHISE_MORALE_STATE_CONTRACT_VERSION,
    franchiseId: input.franchiseId,
    seasonId: input.seasonId,
    statsScopeId: input.statsScopeId,
    seasonNumber: input.seasonNumber,
    targetType: input.targetType,
    teamId: input.teamId,
    playerId: input.playerId,
    baselineValue: 50,
    currentValue: 50,
    lastModified: input.timestamp,
    history: [],
  };
}

export async function getFranchiseMoraleSnapshot(
  scope: Pick<FranchiseMoraleScope, 'franchiseId' | 'seasonId' | 'statsScopeId'>,
  targetType: FranchiseMoraleTargetType,
  targetIdValue: string,
): Promise<FranchiseMoraleSnapshot | null> {
  const db = await initFranchiseMoraleDatabase();
  const tx = db.transaction(STORES.SNAPSHOTS, 'readonly');
  const snapshot = await requestToPromise<FranchiseMoraleSnapshot | undefined>(
    tx.objectStore(STORES.SNAPSHOTS).get(getFranchiseMoraleSnapshotId(scope, targetType, targetIdValue)),
  );
  return snapshot ?? null;
}

export async function listFranchiseMoraleSnapshots(
  franchiseId: string,
  seasonId: string,
  statsScopeId: string,
  seasonNumber: number,
): Promise<FranchiseMoraleSnapshot[]> {
  const db = await initFranchiseMoraleDatabase();
  const tx = db.transaction(STORES.SNAPSHOTS, 'readonly');
  const snapshots = await requestToPromise<FranchiseMoraleSnapshot[]>(
    tx.objectStore(STORES.SNAPSHOTS).index('by_franchise_season').getAll([franchiseId, seasonId]),
  );
  return (snapshots ?? []).filter((snapshot) =>
    snapshot.statsScopeId === statsScopeId &&
    snapshot.seasonNumber === seasonNumber,
  );
}

async function saveSnapshot(snapshot: FranchiseMoraleSnapshot): Promise<FranchiseMoraleSnapshot> {
  const db = await initFranchiseMoraleDatabase();
  const tx = db.transaction(STORES.SNAPSHOTS, 'readwrite');
  tx.objectStore(STORES.SNAPSHOTS).put(snapshot);
  await transactionToPromise(tx);

  if (!syncEngine.isSuppressed()) {
    syncEngine.upsert(DB_NAME, STORES.SNAPSHOTS, snapshot.id, snapshot);
  }

  return snapshot;
}

export async function applyFranchiseMoraleEffect(
  input: ApplyFranchiseMoraleEffectInput,
): Promise<ApplyFranchiseMoraleEffectResult> {
  const blockers: string[] = [];
  const idTarget = targetId(input);
  if (!input.franchiseId || !input.seasonId || !input.statsScopeId) {
    blockers.push('Franchise, season, and stats scope identity are required.');
  }
  if (!Number.isInteger(input.seasonNumber) || input.seasonNumber <= 0) {
    blockers.push('Positive season number is required.');
  }
  if (!idTarget) {
    blockers.push(input.targetType === 'team-fan' ? 'Team id is required for fan morale.' : 'Player id is required for player morale.');
  }
  if (!input.sourceEventId) {
    blockers.push('Source event id is required.');
  }
  if (!input.reason.trim()) {
    blockers.push('Human-readable reason is required.');
  }
  if (!Number.isFinite(input.delta) || input.delta === 0) {
    blockers.push('Non-zero finite morale delta is required.');
  }

  if (blockers.length > 0 || !idTarget) {
    return {
      status: 'failed',
      snapshot: null,
      previousValue: null,
      currentValue: null,
      delta: 0,
      reason: blockers.join(' '),
      blockers,
    };
  }

  const timestamp = input.timestamp ?? nowISO();
  const existing = await getFranchiseMoraleSnapshot(input, input.targetType, idTarget);
  const snapshot = existing ?? createSnapshot({
    franchiseId: input.franchiseId,
    seasonId: input.seasonId,
    statsScopeId: input.statsScopeId,
    seasonNumber: input.seasonNumber,
    targetType: input.targetType,
    teamId: input.targetType === 'team-fan' ? idTarget : undefined,
    playerId: input.targetType === 'player' ? idTarget : undefined,
    timestamp,
  });

  const existingHistory = snapshot.history.find((entry) => entry.sourceEventId === input.sourceEventId);
  if (existingHistory) {
    return {
      status: 'skipped',
      snapshot,
      previousValue: existingHistory.previousValue,
      currentValue: existingHistory.currentValue,
      delta: 0,
      reason: 'Morale effect already applied for this source event.',
      blockers: [],
    };
  }

  const previousValue = clampFranchiseMorale(snapshot.currentValue);
  const currentValue = clampFranchiseMorale(previousValue + input.delta);
  const appliedDelta = currentValue - previousValue;
  const historyEntry: FranchiseMoraleHistoryEntry = {
    id: `${snapshot.id}:history:${input.sourceEventId}`,
    sourceEventId: input.sourceEventId,
    sourceKind: input.sourceKind ?? 'random-event-confirmation',
    previousValue,
    currentValue,
    delta: appliedDelta,
    reason: input.reason,
    actorDisplayName: input.actorDisplayName ?? 'User',
    timestamp,
  };

  const saved = await saveSnapshot({
    ...snapshot,
    currentValue,
    lastModified: timestamp,
    history: [...snapshot.history, historyEntry],
  });

  return {
    status: 'applied',
    snapshot: saved,
    previousValue,
    currentValue,
    delta: appliedDelta,
    reason: input.reason,
    blockers: [],
  };
}
