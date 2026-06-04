import type {
  FranchiseValueInputReport,
  FranchiseValueInputRow,
} from './franchiseValueInputs';

export const FRANCHISE_TRUE_VALUE_PREVIEW_CONTRACT_VERSION =
  'franchise-true-value-preview-v1-readonly';

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
  if (!row.valuePosition) {
    reasons.push('Primary/value position is required for position-relative True Value preview.');
  }
  if (row.salary === null || !row.salaryBaselineAvailable) {
    reasons.push('Stable stored salary baseline is required for True Value preview.');
  }
  if (!row.warInputAvailability.any || !finiteNumber(row.warPreviewValues.totalWar)) {
    reasons.push('Numeric WAR preview total is required for position-relative True Value preview.');
  }
  if (!hasSeasonMetadata(row)) {
    reasons.push('Stored season length and innings metadata are required for True Value preview.');
  }
  return unique(reasons);
}

function isPeerEligible(report: FranchiseValueInputReport, row: FranchiseValueInputRow): boolean {
  return baseBlockReasons(report, row).length === 0 && finiteNumber(row.salary);
}

function positionPeerPools(report: FranchiseValueInputReport): Map<string, FranchiseValueInputRow[]> {
  const pools = new Map<string, FranchiseValueInputRow[]>();
  for (const row of report.rows) {
    if (!isPeerEligible(report, row) || !row.valuePosition) continue;
    const rows = pools.get(row.valuePosition) ?? [];
    rows.push(row);
    pools.set(row.valuePosition, rows);
  }
  return pools;
}

function rankPercentileByWar(row: FranchiseValueInputRow, peerPool: FranchiseValueInputRow[]): number | null {
  if (peerPool.length < 2 || !finiteNumber(row.warPreviewValues.totalWar)) return null;
  const sorted = [...peerPool].sort((left, right) => {
    const warDelta = (left.warPreviewValues.totalWar ?? 0) - (right.warPreviewValues.totalWar ?? 0);
    return warDelta !== 0 ? warDelta : left.playerId.localeCompare(right.playerId);
  });
  const matchingIndexes = sorted
    .map((candidate, index) => ({ candidate, index }))
    .filter(({ candidate }) => candidate.warPreviewValues.totalWar === row.warPreviewValues.totalWar)
    .map(({ index }) => index);
  if (matchingIndexes.length === 0) return null;
  const averageIndex = matchingIndexes.reduce((sum, index) => sum + index, 0) / matchingIndexes.length;
  return averageIndex / (sorted.length - 1);
}

function salaryAtPercentile(peerPool: FranchiseValueInputRow[], percentile: number): number | null {
  const salaries = peerPool
    .map((row) => row.salary)
    .filter((salary): salary is number => finiteNumber(salary))
    .sort((left, right) => left - right);
  if (salaries.length < 2) return null;
  const boundedPercentile = Math.min(1, Math.max(0, percentile));
  const position = boundedPercentile * (salaries.length - 1);
  const lowerIndex = Math.floor(position);
  const upperIndex = Math.ceil(position);
  const lower = salaries[lowerIndex];
  const upper = salaries[upperIndex];
  if (!finiteNumber(lower) || !finiteNumber(upper)) return null;
  const estimate = lower + (upper - lower) * (position - lowerIndex);
  return Number(estimate.toFixed(3));
}

function previewRow(
  report: FranchiseValueInputReport,
  row: FranchiseValueInputRow,
  peerPool: FranchiseValueInputRow[],
): FranchiseTrueValuePreviewPlayerRow {
  const reasons = baseBlockReasons(report, row);
  if (reasons.length === 0 && peerPool.length < 2) {
    reasons.push(`At least two current MLB ${row.valuePosition ?? 'position'} peers with salary and numeric WAR preview totals are required for position-relative True Value preview.`);
  }
  const warPercentile = reasons.length === 0 ? rankPercentileByWar(row, peerPool) : null;
  const previewValueEstimate = warPercentile !== null
    ? salaryAtPercentile(peerPool, warPercentile)
    : null;
  if (reasons.length === 0 && previewValueEstimate === null) {
    reasons.push('Comparable position salary percentile could not be derived from the peer pool.');
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
    teamId: row.currentTeamId,
    rosterStatus: row.rosterStatus,
    salary: row.salary,
    salaryBaselineAvailable: row.salaryBaselineAvailable,
    warInputAvailable: row.warInputAvailability.any,
    warPreviewTotal: finiteNumber(row.warPreviewValues.totalWar) ? row.warPreviewValues.totalWar : null,
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
        'Position-relative True Value preview is available from current MLB peer salary percentiles and scoped numeric WAR preview totals.',
      ],
    limitations: unique([
      ...row.limitations,
      'Position-relative percentile estimate is preview-only; upstream WAR completeness is not final.',
      'Value delta estimate is preview-only and is not trusted for Fan Favorite, Albatross, expected wins, salary movement, or designation finalization.',
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
  const peerPools = positionPeerPools(valueInputReport);
  const playerRows = valueInputReport.rows.map((row) =>
    previewRow(valueInputReport, row, row.valuePosition ? peerPools.get(row.valuePosition) ?? [] : []),
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
      'True Value preview is read-only and position-relative; final WAR, market valuation, park adjustment, and lifecycle rules remain untrusted.',
      'Preview value delta is not trusted for Fan Favorite, Albatross, expected wins, salary movement, morale, or designation finalization.',
    ]),
  };
}
