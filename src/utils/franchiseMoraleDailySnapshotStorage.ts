import {
  clampFranchiseMorale,
  listFranchiseMoraleSnapshots,
  type FranchiseMoraleHistoryEntry,
  type FranchiseMoraleScope,
  type FranchiseMoraleSnapshot,
  type FranchiseMoraleSourceKind,
  type FranchiseMoraleTargetType,
} from './franchiseMoraleState';

export const FRANCHISE_MORALE_DAILY_SNAPSHOT_STORAGE_VERSION =
  'franchise-morale-daily-snapshot-storage-v1';

export interface FranchiseMoraleDailySnapshotPolicies {
  moraleMutationAllowed: false;
  automaticDriftAllowed: false;
  randomEventPromptAllowed: false;
  relationshipMutationAllowed: false;
  salaryMovementAllowed: false;
  mode3HandoffAllowed: false;
}

export interface FranchiseMoraleDailySnapshotRecord extends FranchiseMoraleScope {
  id: string;
  storageVersion: typeof FRANCHISE_MORALE_DAILY_SNAPSHOT_STORAGE_VERSION;
  targetType: FranchiseMoraleTargetType;
  targetId: string;
  teamId?: string;
  playerId?: string;
  dateKey: string;
  openingValue: number;
  closingValue: number;
  highValue: number;
  lowValue: number;
  averageValue: number;
  changeCount: number;
  sourceEventIds: string[];
  sourceKinds: FranchiseMoraleSourceKind[];
  representedHistoryIds: string[];
  limitations: string[];
  policies: FranchiseMoraleDailySnapshotPolicies;
  scopeKey: string;
  targetScopeKey: string;
  identityKey: string;
  createdAt: string;
  updatedAt: string;
}

export interface FranchiseMoraleDailySnapshotScopeInput extends FranchiseMoraleScope {}

export interface UpsertFranchiseMoraleDailySnapshotsResult {
  snapshots: FranchiseMoraleDailySnapshotRecord[];
  policies: FranchiseMoraleDailySnapshotPolicies;
  blockers: string[];
  persisted: boolean;
  mutatesMorale: false;
  createsRandomEventPrompts: false;
  mutatesRelationships: false;
  movesSalary: false;
  mode3HandoffAllowed: false;
}

interface DailyBucket {
  snapshot: FranchiseMoraleSnapshot;
  targetId: string;
  dateKey: string;
  entries: FranchiseMoraleHistoryEntry[];
}

const DB_NAME = 'kbl-franchise-morale-daily-snapshots';
const DB_VERSION = 1;
const STORES = {
  SNAPSHOTS: 'moraleDailySnapshots',
} as const;

let dbInstance: IDBDatabase | null = null;

export function resetFranchiseMoraleDailySnapshotDatabaseForTests(): void {
  dbInstance?.close();
  dbInstance = null;
}

export async function clearFranchiseMoraleDailySnapshotDatabaseForTests(): Promise<void> {
  const db = await initFranchiseMoraleDailySnapshotDatabase();
  const tx = db.transaction(STORES.SNAPSHOTS, 'readwrite');
  tx.objectStore(STORES.SNAPSHOTS).clear();
  await transactionToPromise(tx);
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

export async function initFranchiseMoraleDailySnapshotDatabase(): Promise<IDBDatabase> {
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
      ensureIndex(store, 'by_scope', 'scopeKey', { unique: false });
      ensureIndex(store, 'by_target_scope', 'targetScopeKey', { unique: false });
      ensureIndex(store, 'by_identity', 'identityKey', { unique: true });
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

function nowISO(): string {
  return new Date().toISOString();
}

function hasText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function hasExplicitScope(scope: FranchiseMoraleDailySnapshotScopeInput): boolean {
  return Boolean(
    hasText(scope.franchiseId) &&
    hasText(scope.seasonId) &&
    hasText(scope.statsScopeId) &&
    Number.isInteger(scope.seasonNumber) &&
    scope.seasonNumber > 0,
  );
}

function dailySnapshotPolicies(): FranchiseMoraleDailySnapshotPolicies {
  return {
    moraleMutationAllowed: false,
    automaticDriftAllowed: false,
    randomEventPromptAllowed: false,
    relationshipMutationAllowed: false,
    salaryMovementAllowed: false,
    mode3HandoffAllowed: false,
  };
}

function scopeKey(scope: FranchiseMoraleDailySnapshotScopeInput): string {
  return [
    scope.franchiseId,
    scope.seasonId,
    scope.statsScopeId,
    String(scope.seasonNumber),
  ].join(':');
}

function targetScopeKey(
  scope: FranchiseMoraleDailySnapshotScopeInput,
  targetType: FranchiseMoraleTargetType,
  targetId: string,
): string {
  return `${scopeKey(scope)}:${targetType}:${targetId}`;
}

function identityKey(
  scope: FranchiseMoraleDailySnapshotScopeInput,
  targetType: FranchiseMoraleTargetType,
  targetId: string,
  dateKey: string,
): string {
  return `${targetScopeKey(scope, targetType, targetId)}:${dateKey}`;
}

function snapshotId(identity: string): string {
  return `morale-daily-snapshot:${identity}`;
}

function dateKeyFromTimestamp(timestamp: string | undefined): string | null {
  if (!timestamp) return null;
  const parsed = Date.parse(timestamp);
  if (!Number.isFinite(parsed)) return null;
  return new Date(parsed).toISOString().slice(0, 10);
}

function clampMoraleValue(value: number | undefined): number {
  return clampFranchiseMorale(Number.isFinite(value) ? value as number : 50);
}

function isValidMoraleSnapshotTargetType(value: unknown): value is FranchiseMoraleTargetType {
  return value === 'team-fan' || value === 'player';
}

function targetIdForSnapshot(snapshot: FranchiseMoraleSnapshot): string | null {
  if (!isValidMoraleSnapshotTargetType(snapshot.targetType)) return null;
  if (snapshot.targetType === 'team-fan') return hasText(snapshot.teamId) ? snapshot.teamId : null;
  return hasText(snapshot.playerId) ? snapshot.playerId : null;
}

function scopeMatchesSnapshot(
  scope: FranchiseMoraleDailySnapshotScopeInput,
  snapshot: FranchiseMoraleSnapshot,
): boolean {
  return (
    snapshot.franchiseId === scope.franchiseId &&
    snapshot.seasonId === scope.seasonId &&
    snapshot.statsScopeId === scope.statsScopeId &&
    snapshot.seasonNumber === scope.seasonNumber
  );
}

function snapshotBlockers(
  scope: FranchiseMoraleDailySnapshotScopeInput,
  snapshot: FranchiseMoraleSnapshot,
  snapshotIndex: number,
): string[] {
  const blockers: string[] = [];
  const label = targetIdForSnapshot(snapshot) ?? `snapshot ${snapshotIndex + 1}`;

  if (!scopeMatchesSnapshot(scope, snapshot)) {
    blockers.push(
      `Daily morale snapshot skipped for ${label}: snapshot scope mismatch with requested franchise/season/stats scope.`,
    );
  }
  if (!isValidMoraleSnapshotTargetType(snapshot.targetType)) {
    blockers.push(
      `Daily morale snapshot skipped for snapshot ${snapshotIndex + 1}: target type must be team-fan or player.`,
    );
  }
  if (!targetIdForSnapshot(snapshot)) {
    blockers.push(`Daily morale snapshot skipped for snapshot ${snapshotIndex + 1}: non-empty target id is required.`);
  }
  if (!Array.isArray(snapshot.history) || snapshot.history.length === 0) {
    blockers.push(`Daily morale snapshot skipped for ${label}: morale history is required.`);
  }

  return blockers;
}

function sortedHistory(entries: FranchiseMoraleHistoryEntry[]): FranchiseMoraleHistoryEntry[] {
  return entries.slice().sort((left, right) => {
    const leftTime = left.timestamp ? Date.parse(left.timestamp) : 0;
    const rightTime = right.timestamp ? Date.parse(right.timestamp) : 0;
    return leftTime - rightTime || left.id.localeCompare(right.id);
  });
}

function bucketsFromSnapshot(snapshot: FranchiseMoraleSnapshot, targetId: string): DailyBucket[] {
  const buckets = new Map<string, FranchiseMoraleHistoryEntry[]>();
  for (const entry of snapshot.history) {
    const dateKey = dateKeyFromTimestamp(entry.timestamp);
    if (!dateKey) continue;
    const entries = buckets.get(dateKey) ?? [];
    entries.push(entry);
    buckets.set(dateKey, entries);
  }

  return Array.from(buckets.entries()).map(([dateKey, entries]) => ({
    snapshot,
    targetId,
    dateKey,
    entries: sortedHistory(entries),
  }));
}

function uniqueDefined<T extends string>(values: Array<T | undefined>): T[] {
  return Array.from(new Set(values.filter((value): value is T => hasText(value))));
}

function dailyRecordFromBucket(
  scope: FranchiseMoraleDailySnapshotScopeInput,
  bucket: DailyBucket,
  timestamp: string,
  existing?: FranchiseMoraleDailySnapshotRecord,
): FranchiseMoraleDailySnapshotRecord {
  const values = [
    clampMoraleValue(bucket.entries[0]?.previousValue),
    ...bucket.entries.map((entry) => clampMoraleValue(entry.currentValue)),
  ];
  const sum = values.reduce((total, value) => total + value, 0);
  const identity = identityKey(scope, bucket.snapshot.targetType, bucket.targetId, bucket.dateKey);

  return {
    id: snapshotId(identity),
    storageVersion: FRANCHISE_MORALE_DAILY_SNAPSHOT_STORAGE_VERSION,
    franchiseId: scope.franchiseId,
    seasonId: scope.seasonId,
    statsScopeId: scope.statsScopeId,
    seasonNumber: scope.seasonNumber,
    targetType: bucket.snapshot.targetType,
    targetId: bucket.targetId,
    teamId: bucket.snapshot.targetType === 'team-fan' ? bucket.targetId : bucket.snapshot.teamId,
    playerId: bucket.snapshot.targetType === 'player' ? bucket.targetId : undefined,
    dateKey: bucket.dateKey,
    openingValue: values[0],
    closingValue: values[values.length - 1],
    highValue: Math.max(...values),
    lowValue: Math.min(...values),
    averageValue: Math.round((sum / values.length) * 100) / 100,
    changeCount: bucket.entries.length,
    sourceEventIds: uniqueDefined(bucket.entries.map((entry) => entry.sourceEventId)),
    sourceKinds: uniqueDefined(bucket.entries.map((entry) => entry.sourceKind)),
    representedHistoryIds: uniqueDefined(bucket.entries.map((entry) => entry.id)),
    limitations: [
      'Daily morale snapshot is read-only summary evidence from existing confirmed/manual morale history.',
      'Daily morale snapshots do not create prompts, mutate morale, apply drift/recovery, or drive Mode 3/offseason behavior.',
    ],
    policies: dailySnapshotPolicies(),
    scopeKey: scopeKey(scope),
    targetScopeKey: targetScopeKey(scope, bucket.snapshot.targetType, bucket.targetId),
    identityKey: identity,
    createdAt: existing?.createdAt ?? timestamp,
    updatedAt: timestamp,
  };
}

async function getSnapshotById(id: string): Promise<FranchiseMoraleDailySnapshotRecord | null> {
  const db = await initFranchiseMoraleDailySnapshotDatabase();
  const tx = db.transaction(STORES.SNAPSHOTS, 'readonly');
  const snapshot = await requestToPromise<FranchiseMoraleDailySnapshotRecord | undefined>(
    tx.objectStore(STORES.SNAPSHOTS).get(id),
  );
  return snapshot ?? null;
}

export async function upsertFranchiseMoraleDailySnapshotsFromMoraleSnapshots(
  scope: FranchiseMoraleDailySnapshotScopeInput,
  moraleSnapshots: FranchiseMoraleSnapshot[],
  options: { timestamp?: string } = {},
): Promise<UpsertFranchiseMoraleDailySnapshotsResult> {
  const policies = dailySnapshotPolicies();
  const blockers: string[] = [];
  if (!hasExplicitScope(scope)) {
    blockers.push('Explicit non-empty franchise, season, stats scope, and positive season number are required before daily morale snapshots can be stored.');
  }
  if (blockers.length > 0) {
    return {
      snapshots: [],
      policies,
      blockers,
      persisted: false,
      mutatesMorale: false,
      createsRandomEventPrompts: false,
      mutatesRelationships: false,
      movesSalary: false,
      mode3HandoffAllowed: false,
    };
  }

  const timestamp = options.timestamp ?? nowISO();
  const records: FranchiseMoraleDailySnapshotRecord[] = [];
  for (const [snapshotIndex, snapshot] of moraleSnapshots.entries()) {
    const skippedSnapshotBlockers = snapshotBlockers(scope, snapshot, snapshotIndex);
    if (skippedSnapshotBlockers.length > 0) {
      blockers.push(...skippedSnapshotBlockers);
      continue;
    }
    const targetId = targetIdForSnapshot(snapshot);
    if (!targetId) continue;
    const buckets = bucketsFromSnapshot(snapshot, targetId);
    if (buckets.length === 0) {
      blockers.push(`Daily morale snapshot skipped for ${targetId}: valid morale history timestamps are required.`);
      continue;
    }
    for (const bucket of buckets) {
      const identity = identityKey(scope, snapshot.targetType, targetId, bucket.dateKey);
      const existing = await getSnapshotById(snapshotId(identity));
      records.push(dailyRecordFromBucket(scope, bucket, timestamp, existing ?? undefined));
    }
  }

  if (records.length === 0) {
    return {
      snapshots: [],
      policies,
      blockers,
      persisted: false,
      mutatesMorale: false,
      createsRandomEventPrompts: false,
      mutatesRelationships: false,
      movesSalary: false,
      mode3HandoffAllowed: false,
    };
  }

  const db = await initFranchiseMoraleDailySnapshotDatabase();
  const tx = db.transaction(STORES.SNAPSHOTS, 'readwrite');
  const store = tx.objectStore(STORES.SNAPSHOTS);
  for (const record of records) {
    store.put(record);
  }
  await transactionToPromise(tx);

  return {
    snapshots: records,
    policies,
    blockers,
    persisted: true,
    mutatesMorale: false,
    createsRandomEventPrompts: false,
    mutatesRelationships: false,
    movesSalary: false,
    mode3HandoffAllowed: false,
  };
}

export async function upsertFranchiseMoraleDailySnapshotsFromCanonicalState(
  scope: FranchiseMoraleDailySnapshotScopeInput,
  options: { timestamp?: string } = {},
): Promise<UpsertFranchiseMoraleDailySnapshotsResult> {
  if (!hasExplicitScope(scope)) {
    return upsertFranchiseMoraleDailySnapshotsFromMoraleSnapshots(scope, [], options);
  }
  const moraleSnapshots = await listFranchiseMoraleSnapshots(
    scope.franchiseId,
    scope.seasonId,
    scope.statsScopeId,
    scope.seasonNumber,
  );
  return upsertFranchiseMoraleDailySnapshotsFromMoraleSnapshots(scope, moraleSnapshots, options);
}

export async function listFranchiseMoraleDailySnapshots(
  scope: FranchiseMoraleDailySnapshotScopeInput,
): Promise<FranchiseMoraleDailySnapshotRecord[]> {
  if (!hasExplicitScope(scope)) return [];
  const db = await initFranchiseMoraleDailySnapshotDatabase();
  const tx = db.transaction(STORES.SNAPSHOTS, 'readonly');
  const snapshots = await requestToPromise<FranchiseMoraleDailySnapshotRecord[]>(
    tx.objectStore(STORES.SNAPSHOTS).index('by_scope').getAll(scopeKey(scope)),
  );
  return (snapshots ?? [])
    .filter((snapshot) =>
      snapshot.franchiseId === scope.franchiseId &&
      snapshot.seasonId === scope.seasonId &&
      snapshot.statsScopeId === scope.statsScopeId &&
      snapshot.seasonNumber === scope.seasonNumber,
    )
    .sort((left, right) =>
      left.dateKey.localeCompare(right.dateKey) ||
      left.targetType.localeCompare(right.targetType) ||
      left.targetId.localeCompare(right.targetId),
    );
}

export async function getFranchiseMoraleDailySnapshot(
  scope: FranchiseMoraleDailySnapshotScopeInput & {
    targetType: FranchiseMoraleTargetType;
    targetId: string;
    dateKey: string;
  },
): Promise<FranchiseMoraleDailySnapshotRecord | null> {
  if (!hasExplicitScope(scope) || !hasText(scope.targetId) || !hasText(scope.dateKey)) return null;
  const db = await initFranchiseMoraleDailySnapshotDatabase();
  const tx = db.transaction(STORES.SNAPSHOTS, 'readonly');
  const snapshots = await requestToPromise<FranchiseMoraleDailySnapshotRecord[]>(
    tx.objectStore(STORES.SNAPSHOTS).index('by_target_scope').getAll(
      targetScopeKey(scope, scope.targetType, scope.targetId),
    ),
  );
  return (snapshots ?? []).find((snapshot) =>
    snapshot.franchiseId === scope.franchiseId &&
    snapshot.seasonId === scope.seasonId &&
    snapshot.statsScopeId === scope.statsScopeId &&
    snapshot.seasonNumber === scope.seasonNumber &&
    snapshot.targetType === scope.targetType &&
    snapshot.targetId === scope.targetId &&
    snapshot.dateKey === scope.dateKey,
  ) ?? null;
}
