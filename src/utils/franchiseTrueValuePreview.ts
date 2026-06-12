import {
  calculateTrueValue,
  normalizeTrueValuePosition,
  type LeagueContext,
} from '../engines/salaryCalculator';
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

function leaguePlayerFromRow(
  report: FranchiseValueInputReport,
  row: FranchiseValueInputRow,
): LeagueContext['allPlayers'][number] | null {
  const detectedPosition = normalizeTrueValuePosition(row.valuePosition);
  if (!detectedPosition || !isPeerEligible(report, row) || !finiteNumber(row.salary) || !finiteNumber(row.warPreviewValues.totalWar)) {
    return null;
  }
  return {
    id: row.playerId,
    detectedPosition,
    salary: row.salary,
    seasonWAR: row.warPreviewValues.totalWar,
  };
}

function buildLeagueContext(report: FranchiseValueInputReport): LeagueContext {
  return {
    allPlayers: report.rows
      .map((row) => leaguePlayerFromRow(report, row))
      .filter((player): player is LeagueContext['allPlayers'][number] => player !== null),
  };
}

function previewRow(
  report: FranchiseValueInputReport,
  row: FranchiseValueInputRow,
  leagueContext: LeagueContext,
): FranchiseTrueValuePreviewPlayerRow {
  const reasons = baseBlockReasons(report, row);
  const detectedPosition = normalizeTrueValuePosition(row.valuePosition);
  if (row.valuePosition && !detectedPosition) {
    reasons.push(`Supported True Value position is required; found ${row.valuePosition}.`);
  }
  if (reasons.length === 0 && leagueContext.allPlayers.length < 2) {
    reasons.push('At least two current MLB players with canonical salary and numeric scoped WAR are required for position-relative True Value preview.');
  }

  // TV1 R-2/R-5: displayed True Value uses the canonical engine step-percentile
  // method, while preview/designation trust remains blocked until TV2.
  const result = reasons.length === 0 &&
    detectedPosition &&
    finiteNumber(row.salary) &&
    finiteNumber(row.warPreviewValues.totalWar)
    ? calculateTrueValue(
        {
          salary: row.salary,
          seasonWAR: row.warPreviewValues.totalWar,
          detectedPosition,
        },
        leagueContext,
      )
    : null;
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
        'Canonical position-relative True Value is available from current MLB peer salary percentiles and scoped numeric WAR totals.',
      ],
    limitations: unique([
      ...row.limitations,
      'Position-relative step-percentile True Value is canonical, but preview policy stays read-only until TV2.',
      'Value delta is not trusted for Fan Favorite, Albatross, expected wins, salary movement, or designation finalization until TV2.',
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
      'True Value display uses the canonical step-percentile engine, while downstream trust remains blocked until TV2.',
      'Value delta is not trusted for Fan Favorite, Albatross, expected wins, salary movement, morale, or designation finalization.',
    ]),
  };
}
