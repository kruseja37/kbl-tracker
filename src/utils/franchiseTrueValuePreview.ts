import {
  calculateTrueValue,
  normalizeTrueValuePosition,
  type LeagueContext,
  type PlayerPosition,
  type TrueValueLeaguePlayer,
  type TrueValuePoolKey,
} from '../engines/salaryCalculator';
import {
  FRANCHISE_TRUE_VALUE_RESERVE_POOL,
  type FranchiseTrueValueValuationMode,
} from './franchiseEffectivePosition';
import type {
  FranchiseValueInputReport,
  FranchiseValueInputRow,
} from './franchiseValueInputs';

export const FRANCHISE_TRUE_VALUE_PREVIEW_CONTRACT_VERSION =
  'franchise-true-value-preview-v2-canonical-readonly';

export type FranchiseTrueValuePreviewStatus = 'preview-only' | 'blocked';

export interface FranchiseTrueValuePreviewPlayerRow {
  contractVersion: typeof FRANCHISE_TRUE_VALUE_PREVIEW_CONTRACT_VERSION;
  franchiseId: string;
  seasonId: string;
  statsScopeId: string;
  seasonNumber: number;
  playerId: string;
  playerName: string;
  valuePosition: string | null;
  effectivePosition?: PlayerPosition | null;
  poolPosition?: TrueValuePoolKey | null;
  valuationMode?: FranchiseTrueValueValuationMode;
  teamId: string | null;
  rosterStatus: string | null;
  salary: number | null;
  salaryBaselineAvailable: boolean;
  warInputAvailable: boolean;
  warPreviewTotal: number | null;
  seasonMetadataAvailable: boolean;
  status: FranchiseTrueValuePreviewStatus;
  previewValueEstimate: number | null;
  valueDeltaEstimate: number | null;
  valueDeltaTrustedForDesignations: false;
  expectedWinsTrusted: false;
  salaryMovementAllowed: false;
  designationFinalizationAllowed: false;
  persistable: false;
  reasons: string[];
  limitations: string[];
}

export interface FranchiseTrueValuePreviewTeamSummary {
  contractVersion: typeof FRANCHISE_TRUE_VALUE_PREVIEW_CONTRACT_VERSION;
  franchiseId: string;
  seasonId: string;
  statsScopeId: string;
  seasonNumber: number;
  teamId: string;
  previewPlayerCount: number;
  blockedPlayerCount: number;
  salaryTotal: number;
  previewValueEstimateTotal: number;
  valueDeltaEstimateTotal: number;
  status: 'preview-only';
  expectedWinsTrusted: false;
  valueDeltaTrustedForDesignations: false;
  salaryMovementAllowed: false;
  limitations: string[];
}

export interface FranchiseTrueValuePreviewReport {
  contractVersion: typeof FRANCHISE_TRUE_VALUE_PREVIEW_CONTRACT_VERSION;
  generatedAt: number;
  franchiseId: string;
  seasonId: string;
  statsScopeId: string;
  seasonNumber: number;
  sourceContractVersion: string;
  seasonContext: FranchiseValueInputReport['seasonContext'];
  playerRows: FranchiseTrueValuePreviewPlayerRow[];
  teamSummaries: FranchiseTrueValuePreviewTeamSummary[];
  policies: {
    finalTrueValueCalculated: false;
    persistedTrueValueCreated: false;
    valueDeltaTrustedForDesignations: false;
    expectedWinsTrusted: false;
    salaryMovementAllowed: false;
    designationFinalizationAllowed: false;
    moraleMutationAllowed: false;
  };
  limitations: string[];
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

function hasReportScope(report: FranchiseValueInputReport): boolean {
  return Boolean(
    report.franchiseId &&
    report.seasonId &&
    report.statsScopeId &&
    Number.isInteger(report.seasonNumber) &&
    report.seasonNumber > 0,
  );
}

function hasSeasonMetadata(row: FranchiseValueInputRow): boolean {
  return row.seasonContext.gamesPerTeam !== null && row.seasonContext.inningsPerGame !== null;
}

function finiteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function rounded(value: number): number {
  return Number(value.toFixed(3));
}

function rowScopeMatchesReport(report: FranchiseValueInputReport, row: FranchiseValueInputRow): boolean {
  return (
    row.franchiseId === report.franchiseId &&
    row.seasonId === report.seasonId &&
    row.statsScopeId === report.statsScopeId &&
    row.seasonNumber === report.seasonNumber
  );
}

function baseBlockReasons(report: FranchiseValueInputReport, row: FranchiseValueInputRow): string[] {
  const reasons: string[] = [];
  if (!hasReportScope(report)) {
    reasons.push('Explicit franchise, season, stats scope, and positive season number are required for True Value preview.');
  }
  if (!rowScopeMatchesReport(report, row)) {
    reasons.push('Value input row scope does not match the report scope.');
  }
  if (row.rosterStatus !== 'MLB') {
    reasons.push(`Current MLB roster status is required for True Value preview; found ${row.rosterStatus ?? 'unassigned/free-agent'}.`);
  }
  if (!row.currentTeamId) {
    reasons.push('Current team id is required for True Value preview.');
  }
  if (row.salary === null || !row.salaryBaselineAvailable) {
    reasons.push('Stable stored salary baseline is required for True Value preview.');
  }
  if (!hasSeasonMetadata(row)) {
    reasons.push('Stored season length and innings metadata are required for True Value preview.');
  }
  return unique(reasons);
}

type PreviewEntry =
  | {
      kind: 'single';
      player: TrueValueLeaguePlayer;
      position: PlayerPosition;
      effectivePosition: PlayerPosition | null;
      poolPosition: TrueValuePoolKey;
      valuationMode: 'single-position' | 'reserve';
    }
  | {
      kind: 'two-way';
      armPosition: PlayerPosition;
      batPosition: PlayerPosition;
      salary: number;
      armWar: number;
      batWar: number;
    };

function singlePositionFromRow(row: FranchiseValueInputRow): {
  position: PlayerPosition;
  effectivePosition: PlayerPosition | null;
  poolPosition: TrueValuePoolKey;
  valuationMode: 'single-position' | 'reserve';
} | null {
  const positioning = row.trueValuePositioning;
  if (!positioning) {
    const position = normalizeTrueValuePosition(row.valuePosition);
    return position
      ? { position, effectivePosition: position, poolPosition: position, valuationMode: 'single-position' }
      : null;
  }
  if (positioning.valuationMode === 'invalid' || positioning.valuationMode === 'two-way-composite') return null;
  const position = normalizeTrueValuePosition(positioning.valuePosition);
  const poolPosition = positioning.poolPosition === FRANCHISE_TRUE_VALUE_RESERVE_POOL
    ? FRANCHISE_TRUE_VALUE_RESERVE_POOL
    : normalizeTrueValuePosition(positioning.poolPosition);
  if (!position || !poolPosition) return null;
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

function previewEntryFromRow(
  report: FranchiseValueInputReport,
  row: FranchiseValueInputRow,
): PreviewEntry | null {
  if (baseBlockReasons(report, row).length > 0 || !finiteNumber(row.salary)) {
    return null;
  }

  const positioning = row.trueValuePositioning;
  if (positioning?.valuationMode === 'two-way-composite') {
    const armPosition = normalizeTrueValuePosition(positioning.twoWayArmPosition);
    const batPosition = normalizeTrueValuePosition(positioning.twoWayBatPosition);
    const armWar = finiteNumber(row.warPreviewValues.pitchingWar) ? row.warPreviewValues.pitchingWar : null;
    const batWar = battingSideWar(row);
    if (!armPosition || !batPosition || armWar === null || batWar === null) return null;
    return {
      kind: 'two-way',
      armPosition,
      batPosition,
      salary: row.salary,
      armWar,
      batWar,
    };
  }

  const singlePosition = singlePositionFromRow(row);
  if (!singlePosition || !row.warInputAvailability.any || !finiteNumber(row.warPreviewValues.totalWar)) return null;

  return {
    kind: 'single',
    position: singlePosition.position,
    effectivePosition: singlePosition.effectivePosition,
    poolPosition: singlePosition.poolPosition,
    valuationMode: singlePosition.valuationMode,
    player: {
      id: row.playerId,
      detectedPosition: singlePosition.position,
      trueValuePool: singlePosition.poolPosition,
      salary: row.salary,
      seasonWAR: row.warPreviewValues.totalWar,
    },
  };
}

function buildLeagueContext(report: FranchiseValueInputReport): LeagueContext {
  return {
    allPlayers: report.rows
      .map((row) => previewEntryFromRow(report, row))
      .filter((entry): entry is Extract<PreviewEntry, { kind: 'single' }> => entry?.kind === 'single')
      .map((entry) => entry.player),
  };
}

function previewEntryBlockReasons(row: FranchiseValueInputRow): string[] {
  const reasons: string[] = [];
  const positioning = row.trueValuePositioning;
  if (positioning?.valuationMode === 'invalid') reasons.push(...positioning.reasons);
  if (positioning?.valuationMode === 'two-way-composite') {
    if (!normalizeTrueValuePosition(positioning.twoWayArmPosition)) reasons.push('Canonical two-way arm profile position is required.');
    if (!normalizeTrueValuePosition(positioning.twoWayBatPosition)) reasons.push('Canonical two-way trait batting position is required.');
    if (!finiteNumber(row.warPreviewValues.pitchingWar)) reasons.push('Numeric pitching WAR preview value is required for two-way arm True Value preview.');
    if (battingSideWar(row) === null) reasons.push('Numeric batting, fielding, or baserunning WAR preview value is required for two-way bat True Value preview.');
    return reasons;
  }
  if (!singlePositionFromRow(row)) {
    reasons.push(row.valuePosition
      ? `Supported True Value position is required; found ${row.valuePosition}.`
      : 'Primary/value position is required for position-relative True Value preview.');
  }
  if (!row.warInputAvailability.any || !finiteNumber(row.warPreviewValues.totalWar)) {
    reasons.push('Numeric WAR preview total is required for position-relative True Value preview.');
  }
  return reasons;
}

function compositePreviewValue(
  entry: Extract<PreviewEntry, { kind: 'two-way' }>,
  leagueContext: LeagueContext,
): number {
  // EP1 R-8 pt 5/6: two-way preview mirrors persisted composite True Value
  // from uncombined arm and bat-side WAR.
  const arm = calculateTrueValue({
    detectedPosition: entry.armPosition,
    trueValuePool: entry.armPosition,
    salary: entry.salary,
    seasonWAR: entry.armWar,
  }, leagueContext);
  const bat = calculateTrueValue({
    detectedPosition: entry.batPosition,
    trueValuePool: entry.batPosition,
    salary: entry.salary,
    seasonWAR: entry.batWar,
  }, leagueContext);
  return rounded(arm.trueValue + bat.trueValue);
}

function previewRow(
  report: FranchiseValueInputReport,
  row: FranchiseValueInputRow,
  leagueContext: LeagueContext,
): FranchiseTrueValuePreviewPlayerRow {
  const reasons = baseBlockReasons(report, row);
  reasons.push(...previewEntryBlockReasons(row));
  const entry = previewEntryFromRow(report, row);
  if (reasons.length === 0 && leagueContext.allPlayers.length < 2) {
    reasons.push('At least two current MLB players with canonical salary and numeric scoped WAR are required for position-relative True Value preview.');
  }
  const previewTotalWar = finiteNumber(row.warPreviewValues.totalWar)
    ? row.warPreviewValues.totalWar
    : null;

  // TV1 R-2/R-5: displayed True Value uses the canonical engine step-percentile
  // method. EP1 R-8/R-9/R-10 supplies effective-position/Reserve pools.
  const result = (() => {
    if (reasons.length > 0 || !entry || !finiteNumber(row.salary)) return null;
    if (entry.kind === 'two-way') {
      return { trueValue: compositePreviewValue(entry, leagueContext) };
    }
    if (previewTotalWar === null) return null;
    return calculateTrueValue(
      {
        salary: row.salary,
        seasonWAR: previewTotalWar,
        detectedPosition: entry.position,
        trueValuePool: entry.poolPosition,
      },
      leagueContext,
    );
  })();
  const previewValueEstimate = result?.trueValue ?? null;
  if (reasons.length === 0 && previewValueEstimate === null) {
    reasons.push('Comparable canonical salary percentile could not be derived from the peer context.');
  }
  const valueDeltaEstimate = previewValueEstimate !== null && row.salary !== null
    ? Number((previewValueEstimate - row.salary).toFixed(3))
    : null;

  return {
    contractVersion: FRANCHISE_TRUE_VALUE_PREVIEW_CONTRACT_VERSION,
    franchiseId: row.franchiseId,
    seasonId: row.seasonId,
    statsScopeId: row.statsScopeId,
    seasonNumber: row.seasonNumber,
    playerId: row.playerId,
    playerName: row.playerName,
    valuePosition: row.valuePosition,
    effectivePosition: entry?.kind === 'single' ? entry.effectivePosition : entry?.batPosition ?? null,
    poolPosition: entry?.kind === 'single' ? entry.poolPosition : null,
    valuationMode: entry?.kind === 'single' ? entry.valuationMode : entry?.kind === 'two-way' ? 'two-way-composite' : row.trueValuePositioning?.valuationMode,
    teamId: row.currentTeamId,
    rosterStatus: row.rosterStatus,
    salary: row.salary,
    salaryBaselineAvailable: row.salaryBaselineAvailable,
    warInputAvailable: row.warInputAvailability.any,
    warPreviewTotal: previewTotalWar,
    seasonMetadataAvailable: hasSeasonMetadata(row),
    status: reasons.length === 0 ? 'preview-only' : 'blocked',
    previewValueEstimate,
    valueDeltaEstimate,
    valueDeltaTrustedForDesignations: false,
    expectedWinsTrusted: false,
    salaryMovementAllowed: false,
    designationFinalizationAllowed: false,
    persistable: false,
    reasons: reasons.length > 0
      ? reasons
      : [
        'Canonical position-relative True Value is available from current MLB peer salary percentiles and scoped numeric WAR totals.',
      ],
    limitations: unique([
      ...row.limitations,
      'EP1 R-8/R-9/R-10: step-percentile canonical True Value uses starts-derived effective positions and Reserve pooling.',
      'Value delta remains projected-designation context only; expected wins, salary movement, morale, and final designation effects stay blocked.',
      'No True Value, value delta, salary, morale, designation, relationship, offseason, or Mode 3 state is persisted by this preview contract.',
    ]),
  };
}

function teamSummaries(
  report: FranchiseValueInputReport,
  playerRows: FranchiseTrueValuePreviewPlayerRow[],
): FranchiseTrueValuePreviewTeamSummary[] {
  const byTeam = new Map<string, FranchiseTrueValuePreviewPlayerRow[]>();
  for (const row of playerRows) {
    if (!row.teamId) continue;
    const rows = byTeam.get(row.teamId) ?? [];
    rows.push(row);
    byTeam.set(row.teamId, rows);
  }

  return Array.from(byTeam.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([teamId, rows]) => {
      const previewRows = rows.filter((row) => row.status === 'preview-only');
      const salaryTotal = previewRows.reduce((total, row) => total + (row.salary ?? 0), 0);
      const previewValueEstimateTotal = previewRows.reduce((total, row) => total + (row.previewValueEstimate ?? 0), 0);
      return {
        contractVersion: FRANCHISE_TRUE_VALUE_PREVIEW_CONTRACT_VERSION,
        franchiseId: report.franchiseId,
        seasonId: report.seasonId,
        statsScopeId: report.statsScopeId,
        seasonNumber: report.seasonNumber,
        teamId,
        previewPlayerCount: previewRows.length,
        blockedPlayerCount: rows.length - previewRows.length,
        salaryTotal,
        previewValueEstimateTotal,
        valueDeltaEstimateTotal: previewValueEstimateTotal - salaryTotal,
        status: 'preview-only',
        expectedWinsTrusted: false,
        valueDeltaTrustedForDesignations: false,
        salaryMovementAllowed: false,
        limitations: [
          'Team summary aggregates preview-only player rows and remains untrusted for expected wins, Fan Favorite, Albatross, salary movement, or final designations.',
        ],
      };
    });
}

export function buildFranchiseTrueValuePreviewReport(
  valueInputReport: FranchiseValueInputReport,
): FranchiseTrueValuePreviewReport {
  const leagueContext = buildLeagueContext(valueInputReport);
  const playerRows = valueInputReport.rows.map((row) =>
    previewRow(valueInputReport, row, leagueContext),
  );
  const teams = teamSummaries(valueInputReport, playerRows);

  return {
    contractVersion: FRANCHISE_TRUE_VALUE_PREVIEW_CONTRACT_VERSION,
    generatedAt: valueInputReport.generatedAt,
    franchiseId: valueInputReport.franchiseId,
    seasonId: valueInputReport.seasonId,
    statsScopeId: valueInputReport.statsScopeId,
    seasonNumber: valueInputReport.seasonNumber,
    sourceContractVersion: valueInputReport.contractVersion,
    seasonContext: valueInputReport.seasonContext,
    playerRows,
    teamSummaries: teams,
    policies: {
      finalTrueValueCalculated: false,
      persistedTrueValueCreated: false,
      valueDeltaTrustedForDesignations: false,
      expectedWinsTrusted: false,
      salaryMovementAllowed: false,
      designationFinalizationAllowed: false,
      moraleMutationAllowed: false,
    },
    limitations: unique([
      ...valueInputReport.limitations,
      'True Value display uses the canonical step-percentile engine with EP1 starts-derived effective-position pools.',
      'Value delta remains projected-designation context only; expected wins, salary movement, morale, and final designation effects stay blocked.',
    ]),
  };
}
