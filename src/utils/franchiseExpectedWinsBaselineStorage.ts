import type {
  FranchiseExpectedWinsPreviewReport,
  FranchiseExpectedWinsPreviewStatus,
  FranchiseExpectedWinsPreviewTeamRow,
} from './franchiseExpectedWinsPreview';

export const FRANCHISE_EXPECTED_WINS_BASELINE_STORAGE_VERSION =
  'franchise-expected-wins-baseline-storage-v1';

export type FranchiseExpectedWinsBaselineSourceKind = 'true-value-preview';

export interface FranchiseExpectedWinsBaselinePolicies {
  expectedWinsTrusted: false;
  fanMoraleMutationAllowed: false;
  gameTrackerMutationAllowed: false;
  dailySnapshotPersistenceAllowed: false;
  designationFinalizationAllowed: false;
  salaryMovementAllowed: false;
  relationshipEffectsAllowed: false;
  mode3HandoffAllowed: false;
}

export interface FranchiseExpectedWinsBaselineSnapshot {
  id: string;
  storageVersion: typeof FRANCHISE_EXPECTED_WINS_BASELINE_STORAGE_VERSION;
  franchiseId: string;
  seasonId: string;
  statsScopeId: string;
  seasonNumber: number;
  teamId: string;
  sourceKind: FranchiseExpectedWinsBaselineSourceKind;
  expectedWinsPreviewContractVersion: string;
  trueValuePreviewContractVersion: string;
  gamesPerTeam: number | null;
  leagueAveragePreviewValueBaseline: number | null;
  teamPreviewValueTotal: number | null;
  previewGapFromLeagueAverage: number | null;
  expectedWinsEstimate: number | null;
  status: FranchiseExpectedWinsPreviewStatus;
  blockers: string[];
  limitations: string[];
  policies: FranchiseExpectedWinsBaselinePolicies;
  scopeKey: string;
  teamScopeKey: string;
  identityKey: string;
  createdAt: string;
  updatedAt: string;
}

export interface FranchiseExpectedWinsBaselineScopeInput {
  franchiseId: string;
  seasonId: string;
  statsScopeId: string;
  seasonNumber: number;
}

export interface UpsertFranchiseExpectedWinsBaselineSnapshotsResult {
  snapshots: FranchiseExpectedWinsBaselineSnapshot[];
  policies: FranchiseExpectedWinsBaselinePolicies;
  blockers: string[];
  persisted: boolean;
  mutatesFanMorale: false;
  mutatesGameTracker: false;
  createsDailySnapshots: false;
  finalizesDesignations: false;
  movesSalary: false;
  mutatesRelationships: false;
  mode3HandoffAllowed: false;
}

const DB_NAME = 'kbl-franchise-expected-wins-baselines';
const DB_VERSION = 1;
const STORES = {
  SNAPSHOTS: 'expectedWinsBaselineSnapshots',
} as const;

let dbInstance: IDBDatabase | null = null;

export function resetFranchiseExpectedWinsBaselineDatabaseForTests(): void {
  dbInstance?.close();
  dbInstance = null;
}

export async function clearFranchiseExpectedWinsBaselineDatabaseForTests(): Promise<void> {
  const db = await initFranchiseExpectedWinsBaselineDatabase();
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

export async function initFranchiseExpectedWinsBaselineDatabase(): Promise<IDBDatabase> {
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
      ensureIndex(store, 'by_team_scope', 'teamScopeKey', { unique: false });
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

function baselinePolicies(): FranchiseExpectedWinsBaselinePolicies {
  return {
    expectedWinsTrusted: false,
    fanMoraleMutationAllowed: false,
    gameTrackerMutationAllowed: false,
    dailySnapshotPersistenceAllowed: false,
    designationFinalizationAllowed: false,
    salaryMovementAllowed: false,
    relationshipEffectsAllowed: false,
    mode3HandoffAllowed: false,
  };
}

function scopeKey(scope: FranchiseExpectedWinsBaselineScopeInput): string {
  return [
    scope.franchiseId,
    scope.seasonId,
    scope.statsScopeId,
    String(scope.seasonNumber),
  ].join(':');
}

function teamScopeKey(scope: FranchiseExpectedWinsBaselineScopeInput, teamId: string): string {
  return `${scopeKey(scope)}:${teamId}`;
}

function hasExplicitScope(scope: FranchiseExpectedWinsBaselineScopeInput): boolean {
  return Boolean(
    scope.franchiseId &&
    scope.seasonId &&
    scope.statsScopeId &&
    Number.isInteger(scope.seasonNumber) &&
    scope.seasonNumber > 0,
  );
}

function rowBlockers(
  report: FranchiseExpectedWinsPreviewReport,
  row: FranchiseExpectedWinsPreviewTeamRow,
  rowIndex: number,
): string[] {
  const blockers: string[] = [];
  const rowLabel = row.teamId?.trim() || `row ${rowIndex + 1}`;
  const rowScopeMatchesReport =
    row.franchiseId === report.franchiseId &&
    row.seasonId === report.seasonId &&
    row.statsScopeId === report.statsScopeId &&
    row.seasonNumber === report.seasonNumber;

  if (!rowScopeMatchesReport) {
    blockers.push(
      `Expected-wins baseline snapshot skipped for ${rowLabel}: row scope mismatch with report franchise/season/stats scope.`,
    );
  }
  if (!row.teamId?.trim()) {
    blockers.push(`Expected-wins baseline snapshot skipped for row ${rowIndex + 1}: non-empty team id is required.`);
  }

  return blockers;
}

function identityKey(
  scope: FranchiseExpectedWinsBaselineScopeInput,
  teamId: string,
  sourceKind: FranchiseExpectedWinsBaselineSourceKind,
  trueValuePreviewContractVersion: string,
  expectedWinsPreviewContractVersion: string,
): string {
  return [
    scopeKey(scope),
    teamId,
    sourceKind,
    trueValuePreviewContractVersion,
    expectedWinsPreviewContractVersion,
  ].join(':');
}

function snapshotId(identity: string): string {
  return `expected-wins-baseline:${identity}`;
}

function snapshotFromPreviewRow(
  report: FranchiseExpectedWinsPreviewReport,
  row: FranchiseExpectedWinsPreviewTeamRow,
  sourceKind: FranchiseExpectedWinsBaselineSourceKind,
  timestamp: string,
  existing?: FranchiseExpectedWinsBaselineSnapshot,
): FranchiseExpectedWinsBaselineSnapshot {
  const scope = {
    franchiseId: report.franchiseId,
    seasonId: report.seasonId,
    statsScopeId: report.statsScopeId,
    seasonNumber: report.seasonNumber,
  };
  const identity = identityKey(
    scope,
    row.teamId,
    sourceKind,
    report.sourceContractVersion,
    report.contractVersion,
  );

  return {
    id: snapshotId(identity),
    storageVersion: FRANCHISE_EXPECTED_WINS_BASELINE_STORAGE_VERSION,
    franchiseId: report.franchiseId,
    seasonId: report.seasonId,
    statsScopeId: report.statsScopeId,
    seasonNumber: report.seasonNumber,
    teamId: row.teamId,
    sourceKind,
    expectedWinsPreviewContractVersion: report.contractVersion,
    trueValuePreviewContractVersion: report.sourceContractVersion,
    gamesPerTeam: report.gamesPerTeam,
    leagueAveragePreviewValueBaseline: row.leagueAveragePreviewValueBaseline,
    teamPreviewValueTotal: row.teamPreviewValueTotal,
    previewGapFromLeagueAverage: row.previewGapFromLeagueAverage,
    expectedWinsEstimate: row.expectedWinsEstimate,
    status: row.status,
    blockers: [...row.blockers],
    limitations: [...row.limitations],
    policies: baselinePolicies(),
    scopeKey: scopeKey(scope),
    teamScopeKey: teamScopeKey(scope, row.teamId),
    identityKey: identity,
    createdAt: existing?.createdAt ?? timestamp,
    updatedAt: timestamp,
  };
}

async function getSnapshotById(id: string): Promise<FranchiseExpectedWinsBaselineSnapshot | null> {
  const db = await initFranchiseExpectedWinsBaselineDatabase();
  const tx = db.transaction(STORES.SNAPSHOTS, 'readonly');
  const snapshot = await requestToPromise<FranchiseExpectedWinsBaselineSnapshot | undefined>(
    tx.objectStore(STORES.SNAPSHOTS).get(id),
  );
  return snapshot ?? null;
}

export async function upsertFranchiseExpectedWinsBaselineSnapshotsFromPreview(
  report: FranchiseExpectedWinsPreviewReport,
  options: {
    sourceKind?: FranchiseExpectedWinsBaselineSourceKind;
    timestamp?: string;
  } = {},
): Promise<UpsertFranchiseExpectedWinsBaselineSnapshotsResult> {
  const scope = {
    franchiseId: report.franchiseId,
    seasonId: report.seasonId,
    statsScopeId: report.statsScopeId,
    seasonNumber: report.seasonNumber,
  };
  const policies = baselinePolicies();
  const blockers: string[] = [];
  if (!hasExplicitScope(scope)) {
    blockers.push('Explicit franchise, season, stats scope, and positive season number are required before expected-wins baseline snapshots can be stored.');
  }
  if (blockers.length > 0) {
    return {
      snapshots: [],
      policies,
      blockers,
      persisted: false,
      mutatesFanMorale: false,
      mutatesGameTracker: false,
      createsDailySnapshots: false,
      finalizesDesignations: false,
      movesSalary: false,
      mutatesRelationships: false,
      mode3HandoffAllowed: false,
    };
  }

  const sourceKind = options.sourceKind ?? 'true-value-preview';
  const timestamp = options.timestamp ?? nowISO();
  const snapshots: FranchiseExpectedWinsBaselineSnapshot[] = [];
  for (const [rowIndex, row] of report.teamRows.entries()) {
    const skippedRowBlockers = rowBlockers(report, row, rowIndex);
    if (skippedRowBlockers.length > 0) {
      blockers.push(...skippedRowBlockers);
      continue;
    }
    const identity = identityKey(scope, row.teamId, sourceKind, report.sourceContractVersion, report.contractVersion);
    const existing = await getSnapshotById(snapshotId(identity));
    snapshots.push(snapshotFromPreviewRow(report, row, sourceKind, timestamp, existing ?? undefined));
  }

  if (snapshots.length === 0) {
    return {
      snapshots,
      policies,
      blockers,
      persisted: false,
      mutatesFanMorale: false,
      mutatesGameTracker: false,
      createsDailySnapshots: false,
      finalizesDesignations: false,
      movesSalary: false,
      mutatesRelationships: false,
      mode3HandoffAllowed: false,
    };
  }

  const db = await initFranchiseExpectedWinsBaselineDatabase();
  const tx = db.transaction(STORES.SNAPSHOTS, 'readwrite');
  const store = tx.objectStore(STORES.SNAPSHOTS);
  for (const snapshot of snapshots) {
    store.put(snapshot);
  }
  await transactionToPromise(tx);

  return {
    snapshots,
    policies,
    blockers,
    persisted: true,
    mutatesFanMorale: false,
    mutatesGameTracker: false,
    createsDailySnapshots: false,
    finalizesDesignations: false,
    movesSalary: false,
    mutatesRelationships: false,
    mode3HandoffAllowed: false,
  };
}

export async function listFranchiseExpectedWinsBaselineSnapshots(
  scope: FranchiseExpectedWinsBaselineScopeInput,
): Promise<FranchiseExpectedWinsBaselineSnapshot[]> {
  if (!hasExplicitScope(scope)) return [];
  const db = await initFranchiseExpectedWinsBaselineDatabase();
  const tx = db.transaction(STORES.SNAPSHOTS, 'readonly');
  const snapshots = await requestToPromise<FranchiseExpectedWinsBaselineSnapshot[]>(
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
      left.teamId.localeCompare(right.teamId) ||
      left.sourceKind.localeCompare(right.sourceKind) ||
      left.updatedAt.localeCompare(right.updatedAt),
    );
}

export async function getLatestFranchiseExpectedWinsBaselineSnapshotForTeam(
  scope: FranchiseExpectedWinsBaselineScopeInput & {
    teamId: string;
    sourceKind?: FranchiseExpectedWinsBaselineSourceKind;
  },
): Promise<FranchiseExpectedWinsBaselineSnapshot | null> {
  if (!hasExplicitScope(scope) || !scope.teamId) return null;
  const db = await initFranchiseExpectedWinsBaselineDatabase();
  const tx = db.transaction(STORES.SNAPSHOTS, 'readonly');
  const snapshots = await requestToPromise<FranchiseExpectedWinsBaselineSnapshot[]>(
    tx.objectStore(STORES.SNAPSHOTS).index('by_team_scope').getAll(teamScopeKey(scope, scope.teamId)),
  );
  const sourceKind = scope.sourceKind ?? 'true-value-preview';
  return (snapshots ?? [])
    .filter((snapshot) =>
      snapshot.franchiseId === scope.franchiseId &&
      snapshot.seasonId === scope.seasonId &&
      snapshot.statsScopeId === scope.statsScopeId &&
      snapshot.seasonNumber === scope.seasonNumber &&
      snapshot.teamId === scope.teamId &&
      snapshot.sourceKind === sourceKind,
    )
    .sort((left, right) =>
      right.updatedAt.localeCompare(left.updatedAt) ||
      right.createdAt.localeCompare(left.createdAt),
    )[0] ?? null;
}
