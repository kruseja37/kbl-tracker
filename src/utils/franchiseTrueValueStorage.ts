import {
  TRUE_VALUE_CALCULATION_VERSION,
  calculateTrueValue,
  normalizeTrueValuePosition,
  type LeagueContext,
  type PlayerPosition,
  type TrueValueLeaguePlayer,
  type TrueValuePoolKey,
} from '../engines/salaryCalculator';
import {
  buildFranchiseValueInputRows,
  type FranchiseValueInputRow,
} from './franchiseValueInputs';
import {
  FRANCHISE_TRUE_VALUE_RESERVE_POOL,
  type FranchiseTrueValueValuationMode,
} from './franchiseEffectivePosition';
import {
  FRANCHISE_TRUSTED_VALUE_CONTRACT_VERSION,
  FRANCHISE_TRUSTED_VALUE_PEER_POOL_MIN_THRESHOLD,
  persistTrustedValueArtifact,
  type FranchiseTrustedValueArtifact,
} from './franchiseTrustedValueStorage';
import { getTrackerDb, resetTrackerDbForTests } from './trackerDb';

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
  effectivePosition?: PlayerPosition | null;
  poolPosition?: TrueValuePoolKey | null;
  valuationMode?: FranchiseTrueValueValuationMode;
  trueValueComponents?: {
    arm?: FranchiseTrueValueComponent;
    bat?: FranchiseTrueValueComponent;
  };
  peerPoolSize: number;
  calculationVersion: typeof TRUE_VALUE_CALCULATION_VERSION;
  computedAt: string;
}

export interface FranchiseTrueValueComponent {
  trueValue: number;
  valueDelta: number;
  warPercentile: number;
  position: PlayerPosition;
  poolPosition: TrueValuePoolKey;
  seasonWAR: number;
  peerPoolSize: number;
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

const STORE_NAME = 'franchiseTrueValueRows';

export function resetFranchiseTrueValueDatabaseForTests(): void {
  resetTrackerDbForTests();
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

export async function initFranchiseTrueValueDatabase(): Promise<IDBDatabase> {
  // TV1-FIX R-7: use the shared kbl-tracker DB. The old standalone
  // pre-release DB is intentionally not migrated; completed games regenerate rows.
  return getTrackerDb();
}

function finiteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function rounded(value: number): number {
  return Number(value.toFixed(3));
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

type SingleTrueValueEntry = {
  kind: 'single';
  row: FranchiseValueInputRow;
  player: TrueValueLeaguePlayer;
  position: PlayerPosition;
  effectivePosition: PlayerPosition | null;
  poolPosition: TrueValuePoolKey;
  valuationMode: 'single-position' | 'reserve';
};

type CompositeTrueValueEntry = {
  kind: 'two-way';
  row: FranchiseValueInputRow;
  armPosition: PlayerPosition;
  batPosition: PlayerPosition;
  salary: number;
  armWar: number;
  batWar: number;
};

type TrueValueEntry = SingleTrueValueEntry | CompositeTrueValueEntry;

function baseSkippedReasons(row: FranchiseValueInputRow): string[] {
  const reasons: string[] = [];
  if (row.rosterStatus !== 'MLB') reasons.push('Current MLB roster status is required.');
  if (!row.currentTeamId) reasons.push('Current team id is required.');
  if (!finiteNumber(row.salary) || !row.salaryBaselineAvailable) reasons.push('Canonical salary baseline is required.');
  return reasons;
}

function singlePositioningFromValuePosition(row: FranchiseValueInputRow): {
  position: PlayerPosition;
  effectivePosition: PlayerPosition | null;
  poolPosition: TrueValuePoolKey;
  valuationMode: 'single-position' | 'reserve';
} | null {
  const position = normalizeTrueValuePosition(row.valuePosition);
  if (!position) return null;
  return {
    position,
    effectivePosition: position,
    poolPosition: position,
    valuationMode: 'single-position',
  };
}

function singlePositioningFromMetadata(row: FranchiseValueInputRow): ReturnType<typeof singlePositioningFromValuePosition> {
  const positioning = row.trueValuePositioning;
  if (!positioning) return singlePositioningFromValuePosition(row);
  if (positioning.valuationMode === 'invalid' || positioning.valuationMode === 'two-way-composite') return null;
  const position = normalizeTrueValuePosition(positioning.valuePosition);
  if (!position) return null;
  const poolPosition = positioning.poolPosition === FRANCHISE_TRUE_VALUE_RESERVE_POOL
    ? FRANCHISE_TRUE_VALUE_RESERVE_POOL
    : normalizeTrueValuePosition(positioning.poolPosition);
  if (!poolPosition) return null;
  return {
    position,
    effectivePosition: normalizeTrueValuePosition(positioning.effectivePosition),
    poolPosition,
    valuationMode: poolPosition === FRANCHISE_TRUE_VALUE_RESERVE_POOL ? 'reserve' : 'single-position',
  };
}

function battingSideWar(row: FranchiseValueInputRow): number | null {
  const components = [
    row.warPreviewValues.battingWar,
    row.warPreviewValues.fieldingWar,
    row.warPreviewValues.baserunningWar,
  ].filter(finiteNumber);
  if (components.length === 0) return null;
  return rounded(components.reduce((sum, value) => sum + value, 0));
}

function trueValueEntryFromRow(row: FranchiseValueInputRow): TrueValueEntry | null {
  if (baseSkippedReasons(row).length > 0 || !finiteNumber(row.salary)) return null;

  const positioning = row.trueValuePositioning;
  if (positioning?.valuationMode === 'two-way-composite') {
    const armPosition = normalizeTrueValuePosition(positioning.twoWayArmPosition);
    const batPosition = normalizeTrueValuePosition(positioning.twoWayBatPosition);
    const armWar = finiteNumber(row.warPreviewValues.pitchingWar) ? row.warPreviewValues.pitchingWar : null;
    const batWar = battingSideWar(row);
    if (!armPosition || !batPosition || armWar === null || batWar === null) return null;
    return {
      kind: 'two-way',
      row,
      armPosition,
      batPosition,
      salary: row.salary,
      armWar,
      batWar,
    };
  }

  const single = singlePositioningFromMetadata(row);
  if (
    !single ||
    !row.warInputAvailability.any ||
    !finiteNumber(row.warPreviewValues.totalWar)
  ) {
    return null;
  }

  return {
    kind: 'single',
    row,
    position: single.position,
    effectivePosition: single.effectivePosition,
    poolPosition: single.poolPosition,
    valuationMode: single.valuationMode,
    player: {
      id: row.playerId,
      detectedPosition: single.position,
      trueValuePool: single.poolPosition,
      salary: row.salary,
      seasonWAR: row.warPreviewValues.totalWar,
    },
  };
}

function rosterStateSnapshot(rows: FranchiseValueInputRow[]): FranchiseTrustedValueArtifact['rosterStateSnapshot'] {
  return rows
    .filter((row) => Boolean(row.playerId))
    .map((row) => ({
      playerId: row.playerId,
      teamId: row.currentTeamId ?? '',
      rosterStatus: row.rosterStatus ?? 'UNASSIGNED',
    }))
    .sort((left, right) => left.playerId.localeCompare(right.playerId));
}

function auditedPoolPositions(entry: TrueValueEntry): TrueValuePoolKey[] {
  if (entry.kind === 'single') return [entry.poolPosition];
  return [entry.armPosition, entry.batPosition];
}

function peerPoolReason(poolPosition: TrueValuePoolKey, peerPoolSize: number): string {
  return `Position ${poolPosition} peer pool size ${peerPoolSize} (< ${FRANCHISE_TRUSTED_VALUE_PEER_POOL_MIN_THRESHOLD} required)`;
}

function auditTrustedValuePeerPools(params: {
  scope: FranchiseTrueValueScopeInput;
  seasonNumber: number;
  valueRows: FranchiseValueInputRow[];
  canonicalEntries: TrueValueEntry[];
  singleEntries: SingleTrueValueEntry[];
  computedAt: number;
}): FranchiseTrustedValueArtifact {
  const trustedPlayerIds: string[] = [];
  const blockedRows: FranchiseTrustedValueArtifact['blockedRows'] = [];

  for (const entry of params.canonicalEntries) {
    const reasons = auditedPoolPositions(entry)
      .map((poolPosition) => {
        const peerPoolSize = params.singleEntries.filter((candidate) =>
          candidate.player.id !== entry.row.playerId &&
          candidate.player.trueValuePool === poolPosition,
        ).length;
        return peerPoolSize >= FRANCHISE_TRUSTED_VALUE_PEER_POOL_MIN_THRESHOLD
          ? null
          : peerPoolReason(poolPosition, peerPoolSize);
      })
      .filter((reason): reason is string => reason !== null);

    if (reasons.length > 0) {
      blockedRows.push({
        playerId: entry.row.playerId,
        reasons,
      });
    } else {
      trustedPlayerIds.push(entry.row.playerId);
    }
  }

  return {
    ...params.scope,
    seasonNumber: params.seasonNumber,
    contractVersion: FRANCHISE_TRUSTED_VALUE_CONTRACT_VERSION,
    peerPoolMinThreshold: FRANCHISE_TRUSTED_VALUE_PEER_POOL_MIN_THRESHOLD,
    trustedPlayerIds: Array.from(new Set(trustedPlayerIds)).sort(),
    blockedRows: blockedRows.sort((left, right) => left.playerId.localeCompare(right.playerId)),
    rosterStateSnapshot: rosterStateSnapshot(params.valueRows),
    frozen: false,
    frozenAt: null,
    computedAt: params.computedAt,
  };
}

function computedAtMillis(computedAt: string): number {
  const parsed = Date.parse(computedAt);
  return Number.isFinite(parsed) ? parsed : Date.now();
}

function skippedReasons(row: FranchiseValueInputRow): string[] {
  const reasons = baseSkippedReasons(row);
  const positioning = row.trueValuePositioning;
  if (positioning?.valuationMode === 'invalid') {
    reasons.push(...positioning.reasons);
  }
  if (positioning?.valuationMode === 'two-way-composite') {
    if (!normalizeTrueValuePosition(positioning.twoWayArmPosition)) {
      reasons.push('Canonical two-way arm profile position is required.');
    }
    if (!normalizeTrueValuePosition(positioning.twoWayBatPosition)) {
      reasons.push('Canonical two-way trait batting position is required.');
    }
    if (!finiteNumber(row.warPreviewValues.pitchingWar)) {
      reasons.push('Persisted numeric pitching WAR is required for two-way arm True Value.');
    }
    if (battingSideWar(row) === null) {
      reasons.push('Persisted numeric batting, fielding, or baserunning WAR is required for two-way bat True Value.');
    }
    return reasons;
  }
  if (!singlePositioningFromMetadata(row)) {
    reasons.push(
      `Non-canonical True Value position "${String(row.valuePosition)}" is a data defect; R-6 requires a canonical primary position.`,
    );
  }
  if (!row.warInputAvailability.any || !finiteNumber(row.warPreviewValues.totalWar)) {
    reasons.push('Persisted numeric season WAR is required.');
  }
  return reasons;
}

function componentFromResult(
  result: ReturnType<typeof calculateTrueValue>,
  poolPosition: TrueValuePoolKey,
  seasonWAR: number,
): FranchiseTrueValueComponent {
  return {
    trueValue: result.trueValue,
    valueDelta: result.valueDelta,
    warPercentile: result.warPercentile,
    position: result.position as PlayerPosition,
    poolPosition,
    seasonWAR,
    peerPoolSize: result.peerPoolSize,
  };
}

function calculateCompositeTrueValueRow(
  entry: CompositeTrueValueEntry,
  scope: FranchiseTrueValueScopeInput,
  leagueContext: LeagueContext,
  computedAt: string,
): FranchiseTrueValueRow {
  // EP1 R-8 pt 5/6: two-way holders are valued compositionally from
  // uncombined persisted pitching WAR and batting/fielding/running WAR.
  const armResult = calculateTrueValue({
    id: `${entry.row.playerId}:arm`,
    detectedPosition: entry.armPosition,
    trueValuePool: entry.armPosition,
    salary: entry.salary,
    seasonWAR: entry.armWar,
  }, leagueContext);
  const batResult = calculateTrueValue({
    id: `${entry.row.playerId}:bat`,
    detectedPosition: entry.batPosition,
    trueValuePool: entry.batPosition,
    salary: entry.salary,
    seasonWAR: entry.batWar,
  }, leagueContext);
  const trueValue = rounded(armResult.trueValue + batResult.trueValue);
  return {
    ...scope,
    playerId: entry.row.playerId,
    trueValue,
    contractValue: entry.salary,
    valueDelta: rounded(trueValue - entry.salary),
    warPercentile: Number(((armResult.warPercentile + batResult.warPercentile) / 2).toFixed(6)),
    position: entry.batPosition,
    effectivePosition: entry.batPosition,
    poolPosition: null,
    valuationMode: 'two-way-composite',
    trueValueComponents: {
      arm: componentFromResult(armResult, entry.armPosition, entry.armWar),
      bat: componentFromResult(batResult, entry.batPosition, entry.batWar),
    },
    peerPoolSize: armResult.peerPoolSize + batResult.peerPoolSize,
    calculationVersion: TRUE_VALUE_CALCULATION_VERSION,
    computedAt,
  };
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
    .map((row) => trueValueEntryFromRow(row))
    .filter((entry): entry is TrueValueEntry => entry !== null);
  const singleEntries = canonicalEntries.filter((entry): entry is SingleTrueValueEntry => entry.kind === 'single');
  const leagueContext: LeagueContext = {
    allPlayers: singleEntries.map((entry) => entry.player),
  };
  const computedAt = options.computedAt ?? new Date().toISOString();
  const trustedValueArtifact = auditTrustedValuePeerPools({
    scope,
    seasonNumber: input.seasonNumber,
    valueRows: valueInputReport.rows,
    canonicalEntries,
    singleEntries,
    computedAt: computedAtMillis(computedAt),
  });
  await persistTrustedValueArtifact(trustedValueArtifact);

  const skippedRows = valueInputReport.rows
    .filter((row) => !canonicalEntries.some((entry) => entry.row.playerId === row.playerId))
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

  const rows = canonicalEntries.map((entry): FranchiseTrueValueRow => {
    if (entry.kind === 'two-way') {
      return calculateCompositeTrueValueRow(entry, scope, leagueContext, computedAt);
    }

    // TV1 R-2/R-4/R-5 + EP1 R-8/R-9/R-10: compute canonical True Value
    // from persisted season WAR and canonical salary, using effective-position
    // or Reserve peer pools supplied by the value-input replay.
    const result = calculateTrueValue(entry.player, leagueContext);
    return {
      ...scope,
      playerId: entry.row.playerId,
      trueValue: result.trueValue,
      contractValue: result.contractValue,
      valueDelta: result.valueDelta,
      warPercentile: result.warPercentile,
      position: entry.position,
      effectivePosition: entry.effectivePosition,
      poolPosition: entry.poolPosition,
      valuationMode: entry.valuationMode,
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
