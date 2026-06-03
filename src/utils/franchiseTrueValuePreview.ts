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
  teamId: string | null;
  rosterStatus: string | null;
  salary: number | null;
  salaryBaselineAvailable: boolean;
  warInputAvailable: boolean;
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

function rowScopeMatchesReport(report: FranchiseValueInputReport, row: FranchiseValueInputRow): boolean {
  return (
    row.franchiseId === report.franchiseId &&
    row.seasonId === report.seasonId &&
    row.statsScopeId === report.statsScopeId &&
    row.seasonNumber === report.seasonNumber
  );
}

function blockReasons(report: FranchiseValueInputReport, row: FranchiseValueInputRow): string[] {
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
  if (!row.warInputAvailability.any) {
    reasons.push('WAR-like preview inputs are required for True Value preview.');
  }
  if (!hasSeasonMetadata(row)) {
    reasons.push('Stored season length and innings metadata are required for True Value preview.');
  }
  return unique(reasons);
}

function previewRow(report: FranchiseValueInputReport, row: FranchiseValueInputRow): FranchiseTrueValuePreviewPlayerRow {
  const reasons = blockReasons(report, row);
  const previewValueEstimate = reasons.length === 0 && row.salary !== null
    ? row.salary
    : null;
  const valueDeltaEstimate = previewValueEstimate !== null && row.salary !== null
    ? previewValueEstimate - row.salary
    : null;

  return {
    contractVersion: FRANCHISE_TRUE_VALUE_PREVIEW_CONTRACT_VERSION,
    franchiseId: row.franchiseId,
    seasonId: row.seasonId,
    statsScopeId: row.statsScopeId,
    seasonNumber: row.seasonNumber,
    playerId: row.playerId,
    playerName: row.playerName,
    teamId: row.currentTeamId,
    rosterStatus: row.rosterStatus,
    salary: row.salary,
    salaryBaselineAvailable: row.salaryBaselineAvailable,
    warInputAvailable: row.warInputAvailability.any,
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
        'Salary-anchored True Value preview is available because stable salary, current MLB roster context, WAR-like input readiness, and season metadata are present.',
      ],
    limitations: unique([
      ...row.limitations,
      'Preview estimate is salary-anchored because numeric final WAR/market valuation is not exposed by the current value input contract.',
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
  const playerRows = valueInputReport.rows.map((row) => previewRow(valueInputReport, row));
  const teams = teamSummaries(valueInputReport, playerRows);

  return {
    contractVersion: FRANCHISE_TRUE_VALUE_PREVIEW_CONTRACT_VERSION,
    generatedAt: valueInputReport.generatedAt,
    franchiseId: valueInputReport.franchiseId,
    seasonId: valueInputReport.seasonId,
    statsScopeId: valueInputReport.statsScopeId,
    seasonNumber: valueInputReport.seasonNumber,
    sourceContractVersion: valueInputReport.contractVersion,
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
      'True Value preview is read-only and salary-anchored until numeric final WAR, market valuation, park adjustment, and lifecycle rules are trusted.',
      'Preview value delta is not trusted for Fan Favorite, Albatross, expected wins, salary movement, morale, or designation finalization.',
    ]),
  };
}
