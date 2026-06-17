import {
  calculateFranchiseDesignations,
  diffActiveDesignationHolders,
  FRANCHISE_DESIGNATION_CALCULATION_VERSION,
  type DesignationEvent,
  type FranchiseDesignationContext,
  type FranchiseDesignationPlayerInput,
  type FranchiseDesignationType,
  type FranchisePlayerDesignationRecord,
} from './franchiseDesignations';
import {
  buildFranchiseDesignationEligibility,
} from './franchiseDesignationEligibility';
import {
  buildFranchiseValueInputRows,
  type FranchiseValueInputRow,
} from './franchiseValueInputs';
import {
  getAllBattingStats,
  getAllPitchingStats,
  type PlayerSeasonBatting,
  type PlayerSeasonPitching,
} from './seasonStorage';
import {
  getFranchiseTrueValueRows,
  type FranchiseTrueValueRow,
} from './franchiseTrueValueStorage';
import { getTrackerDb, resetTrackerDbForTests } from './trackerDb';

export interface FranchiseDesignationScopeInput {
  franchiseId: string;
  seasonId: string;
  statsScopeId: string;
}

export interface CalculateAndPersistProjectedFranchiseDesignationsInput extends FranchiseDesignationScopeInput {
  seasonNumber: number;
}

export interface FranchiseDesignationSourceRowsResult {
  rows: FranchiseDesignationPlayerInput[];
  skippedRows: Array<{
    playerId: string;
    reasons: string[];
  }>;
  blockers: string[];
  gamesPerTeam: number | null;
}

export interface CalculateAndPersistProjectedFranchiseDesignationsResult {
  rows: FranchisePlayerDesignationRecord[];
  skippedRows: FranchiseDesignationSourceRowsResult['skippedRows'];
  blockers: string[];
  persisted: boolean;
  designationEvents: DesignationEvent[];
}

const STORE_NAME = 'franchiseDesignationRows';
const CANONICAL_PRIMARY_POSITIONS = new Set(['SP', 'SP/RP', 'RP', 'CP', 'C', '1B', '2B', 'SS', '3B', 'LF', 'CF', 'RF']);
const ACTIVE_PROMOTION_TYPES = new Set<FranchiseDesignationType>(['TEAM_MVP', 'ACE', 'ALBATROSS']);

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

function finiteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function positiveInteger(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
    ? Math.floor(value)
    : null;
}

function hasExplicitScope(scope: FranchiseDesignationScopeInput & { seasonNumber?: number }): boolean {
  return Boolean(
    scope.franchiseId &&
    scope.seasonId &&
    scope.statsScopeId &&
    (scope.seasonNumber === undefined || (Number.isInteger(scope.seasonNumber) && scope.seasonNumber > 0)),
  );
}

function scopeKey(scope: FranchiseDesignationScopeInput): [string, string, string] {
  return [scope.franchiseId, scope.seasonId, scope.statsScopeId];
}

function rowKey(scope: FranchiseDesignationScopeInput & { teamId: string; type: FranchiseDesignationType }): [string, string, string, string, FranchiseDesignationType] {
  return [scope.franchiseId, scope.seasonId, scope.statsScopeId, scope.teamId, scope.type];
}

function mapByPlayerId<T extends { playerId: string }>(rows: T[]): Map<string, T> {
  return new Map(rows.map((row) => [row.playerId, row]));
}

function canonicalPosition(position: unknown): string | null {
  const normalized = String(position ?? '').trim().toUpperCase();
  return CANONICAL_PRIMARY_POSITIONS.has(normalized) ? normalized : null;
}

function numericOrNull(value: unknown): number | null {
  return finiteNumber(value) ? value : null;
}

function activeEligibilityKey(row: Pick<FranchisePlayerDesignationRecord, 'type' | 'teamId' | 'playerId'>): string {
  return `${row.type}\u0000${row.teamId}\u0000${row.playerId}`;
}

function upgradeRowsWithActiveEligibility(
  rows: FranchisePlayerDesignationRecord[],
  activeEligibilityKeys: Set<string>,
): FranchisePlayerDesignationRecord[] {
  return rows.map((row) => {
    if (!ACTIVE_PROMOTION_TYPES.has(row.type) || !activeEligibilityKeys.has(activeEligibilityKey(row))) {
      return row;
    }
    return {
      ...row,
      status: 'active',
      lockedAt: null,
      sourceInputs: {
        ...row.sourceInputs,
        statusAuthority: 'FRANCHISE_PLAYABLE_V1_DEFINITION D7a/D7b: persisted canonical TEAM_MVP/ACE/ALBATROSS row promoted to active only when the eligibility path classifies the exact holder active.',
      },
    };
  });
}

function sourceRowFromValueRow(
  row: FranchiseValueInputRow,
  batting: PlayerSeasonBatting | undefined,
  pitching: PlayerSeasonPitching | undefined,
  trueValue: FranchiseTrueValueRow | undefined,
): { input: FranchiseDesignationPlayerInput | null; reasons: string[] } {
  const reasons: string[] = [];
  const position = canonicalPosition(row.valuePosition);
  if (!position) {
    reasons.push(`Non-canonical designation position "${String(row.valuePosition)}" is a data defect; R-6 requires a canonical primary position.`);
  }
  if (row.rosterStatus !== 'MLB') {
    reasons.push(`Current MLB roster status is required for projected designations; found ${row.rosterStatus ?? 'unassigned/free-agent'}.`);
  }
  if (!row.currentTeamId) {
    reasons.push('Current team id is required for projected designations.');
  }

  if (reasons.length > 0 || !position || !row.currentTeamId) {
    return { input: null, reasons };
  }

  const battingGames = positiveInteger(batting?.games) ?? 0;
  const pitchingAppearances = positiveInteger(pitching?.games) ?? 0;

  return {
    input: {
      playerId: row.playerId,
      playerName: row.playerName,
      teamId: row.currentTeamId,
      position,
      // MODE_2_CANON §17.1/§17.3/§17.4: position-player floors use games
      // from persisted season batting rows; EP1 will replace profile-position peers.
      gamesPlayed: battingGames,
      // MODE_2_CANON §17.2: Ace floor uses persisted pitcher appearances.
      pitchingAppearances,
      totalWAR: numericOrNull(row.warPreviewValues.totalWar),
      pWAR: numericOrNull(row.warPreviewValues.pitchingWar ?? pitching?.pwar),
      trueValue: numericOrNull(trueValue?.trueValue),
      contractValue: numericOrNull(trueValue?.contractValue),
      valueDelta: numericOrNull(trueValue?.valueDelta),
      valueTrusted: row.warConsumerTrust?.fanFavoriteAlbatrossDesignations === true,
    },
    reasons: trueValue
      ? []
      : ['Canonical True Value/value-delta row is unavailable; Fan Favorite/Albatross cannot use this player.'],
  };
}

export function resetFranchiseDesignationDatabaseForTests(): void {
  resetTrackerDbForTests();
}

export async function initFranchiseDesignationDatabase(): Promise<IDBDatabase> {
  return getTrackerDb();
}

export async function clearFranchiseDesignationDatabaseForTests(): Promise<void> {
  const db = await initFranchiseDesignationDatabase();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  tx.objectStore(STORE_NAME).clear();
  await transactionToPromise(tx);
}

export async function saveFranchiseDesignationRows(
  rows: FranchisePlayerDesignationRecord[],
): Promise<FranchisePlayerDesignationRecord[]> {
  if (rows.length === 0) return [];
  const db = await initFranchiseDesignationDatabase();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const store = tx.objectStore(STORE_NAME);
  for (const row of rows) {
    store.put(row);
  }
  await transactionToPromise(tx);
  return rows;
}

export async function deleteFranchiseDesignationRowsForScope(
  scope: FranchiseDesignationScopeInput,
): Promise<void> {
  if (!hasExplicitScope(scope)) return;
  const db = await initFranchiseDesignationDatabase();
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

export async function replaceFranchiseDesignationRowsForScope(
  scope: FranchiseDesignationScopeInput,
  rows: FranchisePlayerDesignationRecord[],
): Promise<FranchisePlayerDesignationRecord[]> {
  await deleteFranchiseDesignationRowsForScope(scope);
  return saveFranchiseDesignationRows(rows);
}

export async function getFranchiseDesignationRows(
  scope: FranchiseDesignationScopeInput,
): Promise<FranchisePlayerDesignationRecord[]> {
  if (!hasExplicitScope(scope)) return [];
  const db = await initFranchiseDesignationDatabase();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const rows = await requestToPromise<FranchisePlayerDesignationRecord[]>(
    tx.objectStore(STORE_NAME).index('by_scope').getAll(scopeKey(scope)),
  );
  return (rows ?? [])
    .filter((row) =>
      row.franchiseId === scope.franchiseId &&
      row.seasonId === scope.seasonId &&
      row.statsScopeId === scope.statsScopeId,
    )
    .sort((left, right) =>
      left.teamId.localeCompare(right.teamId) ||
      left.type.localeCompare(right.type) ||
      left.playerId.localeCompare(right.playerId),
    );
}

export async function getFranchiseDesignationRow(
  scope: FranchiseDesignationScopeInput & { teamId: string; type: FranchiseDesignationType },
): Promise<FranchisePlayerDesignationRecord | null> {
  if (!hasExplicitScope(scope) || !scope.teamId || !scope.type) return null;
  const db = await initFranchiseDesignationDatabase();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const row = await requestToPromise<FranchisePlayerDesignationRecord | undefined>(
    tx.objectStore(STORE_NAME).get(rowKey(scope)),
  );
  return row ?? null;
}

export async function buildProjectedFranchiseDesignationSourceRows(
  input: CalculateAndPersistProjectedFranchiseDesignationsInput,
): Promise<FranchiseDesignationSourceRowsResult> {
  const blockers: string[] = [];
  if (!hasExplicitScope(input)) {
    blockers.push('Explicit franchise, season, stats scope, and positive season number are required before projected designations can be stored.');
    return { rows: [], skippedRows: [], blockers, gamesPerTeam: null };
  }

  const [valueInputReport, battingStats, pitchingStats, trueValueRows] = await Promise.all([
    buildFranchiseValueInputRows(input),
    getAllBattingStats(input.statsScopeId),
    getAllPitchingStats(input.statsScopeId),
    getFranchiseTrueValueRows(input),
  ]);

  const gamesPerTeam = positiveInteger(valueInputReport.seasonContext.gamesPerTeam);
  if (gamesPerTeam === null) {
    blockers.push('Stored gamesPerTeam config truth is required for §17 designation floors; schedule totals are not a fallback.');
  }

  const battingByPlayer = mapByPlayerId(battingStats);
  const pitchingByPlayer = mapByPlayerId(pitchingStats);
  const trueValueByPlayer = mapByPlayerId(trueValueRows);
  const rows: FranchiseDesignationPlayerInput[] = [];
  const skippedRows: FranchiseDesignationSourceRowsResult['skippedRows'] = [];

  for (const row of valueInputReport.rows) {
    const result = sourceRowFromValueRow(
      row,
      battingByPlayer.get(row.playerId),
      pitchingByPlayer.get(row.playerId),
      trueValueByPlayer.get(row.playerId),
    );
    if (result.input) rows.push(result.input);
    if (result.reasons.length > 0) {
      skippedRows.push({
        playerId: row.playerId,
        reasons: result.reasons,
      });
    }
  }

  return {
    rows,
    skippedRows,
    blockers,
    gamesPerTeam,
  };
}

export async function calculateAndPersistProjectedFranchiseDesignationsForSeason(
  input: CalculateAndPersistProjectedFranchiseDesignationsInput,
  options: { calculatedAt?: string } = {},
): Promise<CalculateAndPersistProjectedFranchiseDesignationsResult> {
  const source = await buildProjectedFranchiseDesignationSourceRows(input);
  if (source.blockers.length > 0 || source.gamesPerTeam === null) {
    return {
      rows: [],
      skippedRows: source.skippedRows,
      blockers: source.blockers,
      persisted: false,
      designationEvents: [],
    };
  }

  const context: FranchiseDesignationContext = {
    franchiseId: input.franchiseId,
    seasonId: input.seasonId,
    statsScopeId: input.statsScopeId,
    seasonNumber: input.seasonNumber,
    gamesPerTeam: source.gamesPerTeam,
    calculatedAt: options.calculatedAt,
  };
  const rows = calculateFranchiseDesignations(source.rows, context);
  const stampedRows = rows.map((row) => ({
    ...row,
    calculationVersion: FRANCHISE_DESIGNATION_CALCULATION_VERSION,
  }));
  const eligibilityReport = await buildFranchiseDesignationEligibility(input);
  const activeEligibilityKeys = new Set(
    eligibilityReport.records
      .filter((record) =>
        record.status === 'active' &&
        ACTIVE_PROMOTION_TYPES.has(record.designationType as FranchiseDesignationType) &&
        record.teamId !== null,
      )
      .map((record) => activeEligibilityKey({
        type: record.designationType as FranchiseDesignationType,
        teamId: record.teamId ?? '',
        playerId: record.playerId,
      })),
  );
  const upgradedRows = upgradeRowsWithActiveEligibility(stampedRows, activeEligibilityKeys);
  const priorRows = await getFranchiseDesignationRows(input);
  const designationEvents = diffActiveDesignationHolders(priorRows, upgradedRows);

  // MODE_2_CANON §17: every completed regular-season game recalculates projected
  // holders; a below-floor result still clears stale projected rows.
  await replaceFranchiseDesignationRowsForScope(input, upgradedRows);

  return {
    rows: upgradedRows,
    skippedRows: source.skippedRows,
    blockers: [],
    persisted: true,
    designationEvents,
  };
}
