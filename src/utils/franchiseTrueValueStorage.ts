import {
  TRUE_VALUE_CALCULATION_VERSION,
  calculateTrueValue,
  normalizeTrueValuePosition,
  type LeagueContext,
  type PlayerPosition,
} from '../engines/salaryCalculator';
import {
  buildFranchiseValueInputRows,
  type FranchiseValueInputRow,
} from './franchiseValueInputs';

export interface FranchiseTrueValueScopeInput {
  franchiseId: string;
  seasonId: string;
  statsScopeId: string;
}

export interface CalculateAndPersistFranchiseTrueValueInput extends FranchiseTrueValueScopeInput {
  seasonNumber: number;
}

export interface FranchiseTrueValueRow extends FranchiseTrueValueScopeInput {
  playerId: string;
  trueValue: number;
  contractValue: number;
  valueDelta: number;
  warPercentile: number;
  position: PlayerPosition;
  peerPoolSize: number;
  calculationVersion: typeof TRUE_VALUE_CALCULATION_VERSION;
  computedAt: string;
}

export interface CalculateAndPersistFranchiseTrueValueResult {
  rows: FranchiseTrueValueRow[];
  skippedRows: Array<{
    playerId: string;
    reasons: string[];
  }>;
  persisted: boolean;
  blockers: string[];
}

const DB_NAME = 'kbl-franchise-true-values';
const DB_VERSION = 1;
const STORE_NAME = 'franchiseTrueValueRows';

let dbInstance: IDBDatabase | null = null;

export function resetFranchiseTrueValueDatabaseForTests(): void {
  dbInstance?.close();
  dbInstance = null;
}

export async function clearFranchiseTrueValueDatabaseForTests(): Promise<void> {
  const db = await initFranchiseTrueValueDatabase();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  tx.objectStore(STORE_NAME).clear();
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

export async function initFranchiseTrueValueDatabase(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      let store: IDBObjectStore;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        store = db.createObjectStore(STORE_NAME, {
          keyPath: ['franchiseId', 'seasonId', 'statsScopeId', 'playerId'],
        });
      } else {
        store = (event.target as IDBOpenDBRequest).transaction!.objectStore(STORE_NAME);
      }
      ensureIndex(store, 'by_scope', ['franchiseId', 'seasonId', 'statsScopeId'], { unique: false });
      ensureIndex(store, 'by_player_scope', ['franchiseId', 'seasonId', 'statsScopeId', 'playerId'], { unique: true });
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

function finiteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function scopeKey(scope: FranchiseTrueValueScopeInput): [string, string, string] {
  return [scope.franchiseId, scope.seasonId, scope.statsScopeId];
}

function rowKey(scope: FranchiseTrueValueScopeInput, playerId: string): [string, string, string, string] {
  return [scope.franchiseId, scope.seasonId, scope.statsScopeId, playerId];
}

function hasExplicitScope(scope: FranchiseTrueValueScopeInput & { seasonNumber?: number }): boolean {
  return Boolean(
    scope.franchiseId &&
    scope.seasonId &&
    scope.statsScopeId &&
    (scope.seasonNumber === undefined || (Number.isInteger(scope.seasonNumber) && scope.seasonNumber > 0)),
  );
}

function canonicalPlayerFromValueRow(
  row: FranchiseValueInputRow,
): {
  player: LeagueContext['allPlayers'][number];
  position: PlayerPosition;
} | null {
  const detectedPosition = normalizeTrueValuePosition(row.valuePosition);
  if (
    !detectedPosition ||
    row.rosterStatus !== 'MLB' ||
    !row.currentTeamId ||
    !finiteNumber(row.salary) ||
    !row.salaryBaselineAvailable ||
    !row.warInputAvailability.any ||
    !finiteNumber(row.warPreviewValues.totalWar)
  ) {
    return null;
  }

  return {
    player: {
      id: row.playerId,
      detectedPosition,
      salary: row.salary,
      seasonWAR: row.warPreviewValues.totalWar,
    },
    position: detectedPosition,
  };
}

function skippedReasons(row: FranchiseValueInputRow): string[] {
  const reasons: string[] = [];
  if (row.rosterStatus !== 'MLB') reasons.push('Current MLB roster status is required.');
  if (!row.currentTeamId) reasons.push('Current team id is required.');
  if (!normalizeTrueValuePosition(row.valuePosition)) reasons.push('Supported True Value position is required.');
  if (!finiteNumber(row.salary) || !row.salaryBaselineAvailable) reasons.push('Canonical salary baseline is required.');
  if (!row.warInputAvailability.any || !finiteNumber(row.warPreviewValues.totalWar)) reasons.push('Persisted numeric season WAR is required.');
  return reasons;
}

export async function saveFranchiseTrueValueRows(
  rows: FranchiseTrueValueRow[],
): Promise<FranchiseTrueValueRow[]> {
  if (rows.length === 0) return [];
  const db = await initFranchiseTrueValueDatabase();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  for (const row of rows) {
    store.put(row);
  }
  await transactionToPromise(tx);
  return rows;
}

export async function deleteFranchiseTrueValueRowsForScope(
  scope: FranchiseTrueValueScopeInput,
): Promise<void> {
  if (!hasExplicitScope(scope)) return;
  const db = await initFranchiseTrueValueDatabase();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  const keys = await requestToPromise<IDBValidKey[]>(
    store.index('by_scope').getAllKeys(scopeKey(scope)),
  );
  for (const key of keys ?? []) {
    store.delete(key);
  }
  await transactionToPromise(tx);
}

export async function replaceFranchiseTrueValueRowsForScope(
  scope: FranchiseTrueValueScopeInput,
  rows: FranchiseTrueValueRow[],
): Promise<FranchiseTrueValueRow[]> {
  await deleteFranchiseTrueValueRowsForScope(scope);
  return saveFranchiseTrueValueRows(rows);
}

export async function getFranchiseTrueValueRows(
  scope: FranchiseTrueValueScopeInput,
): Promise<FranchiseTrueValueRow[]> {
  if (!hasExplicitScope(scope)) return [];
  const db = await initFranchiseTrueValueDatabase();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const rows = await requestToPromise<FranchiseTrueValueRow[]>(
    tx.objectStore(STORE_NAME).index('by_scope').getAll(scopeKey(scope)),
  );
  return (rows ?? [])
    .filter((row) =>
      row.franchiseId === scope.franchiseId &&
      row.seasonId === scope.seasonId &&
      row.statsScopeId === scope.statsScopeId,
    )
    .sort((left, right) => left.playerId.localeCompare(right.playerId));
}

export async function getFranchiseTrueValueRow(
  scope: FranchiseTrueValueScopeInput & { playerId: string },
): Promise<FranchiseTrueValueRow | null> {
  if (!hasExplicitScope(scope) || !scope.playerId) return null;
  const db = await initFranchiseTrueValueDatabase();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const row = await requestToPromise<FranchiseTrueValueRow | undefined>(
    tx.objectStore(STORE_NAME).get(rowKey(scope, scope.playerId)),
  );
  return row ?? null;
}

export async function calculateAndPersistFranchiseTrueValueForSeason(
  input: CalculateAndPersistFranchiseTrueValueInput,
  options: { computedAt?: string } = {},
): Promise<CalculateAndPersistFranchiseTrueValueResult> {
  const scope = {
    franchiseId: input.franchiseId,
    seasonId: input.seasonId,
    statsScopeId: input.statsScopeId,
  };
  const blockers: string[] = [];
  if (!hasExplicitScope(input)) {
    blockers.push('Explicit franchise, season, stats scope, and positive season number are required before True Value rows can be stored.');
  }
  if (blockers.length > 0) {
    return { rows: [], skippedRows: [], persisted: false, blockers };
  }

  const valueInputReport = await buildFranchiseValueInputRows(input);
  const canonicalEntries = valueInputReport.rows
    .map((row) => ({ row, entry: canonicalPlayerFromValueRow(row) }))
    .filter((candidate): candidate is {
      row: FranchiseValueInputRow;
      entry: NonNullable<ReturnType<typeof canonicalPlayerFromValueRow>>;
    } => candidate.entry !== null);
  const leagueContext: LeagueContext = {
    allPlayers: canonicalEntries.map(({ entry }) => entry.player),
  };

  const skippedRows = valueInputReport.rows
    .filter((row) => !canonicalEntries.some((candidate) => candidate.row.playerId === row.playerId))
    .map((row) => ({
      playerId: row.playerId,
      reasons: skippedReasons(row),
    }));

  if (leagueContext.allPlayers.length === 0) {
    return {
      rows: [],
      skippedRows,
      persisted: false,
      blockers: ['No current MLB players had canonical salary and persisted numeric season WAR inputs for True Value.'],
    };
  }

  const computedAt = options.computedAt ?? new Date().toISOString();
  const rows = canonicalEntries.map(({ row, entry }): FranchiseTrueValueRow => {
    // TV1 R-2/R-4/R-5: compute canonical True Value from persisted season WAR
    // and canonical salary, then store rows without flipping designation trust.
    const result = calculateTrueValue(entry.player, leagueContext);
    return {
      ...scope,
      playerId: row.playerId,
      trueValue: result.trueValue,
      contractValue: result.contractValue,
      valueDelta: result.valueDelta,
      warPercentile: result.warPercentile,
      position: entry.position,
      peerPoolSize: result.peerPoolSize,
      calculationVersion: TRUE_VALUE_CALCULATION_VERSION,
      computedAt,
    };
  });

  await replaceFranchiseTrueValueRowsForScope(scope, rows);

  return {
    rows,
    skippedRows,
    persisted: rows.length > 0,
    blockers,
  };
}
