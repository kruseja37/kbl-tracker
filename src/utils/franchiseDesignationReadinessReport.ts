import type { FranchiseDesignationEligibilityReport } from './franchiseDesignationEligibility';
import type {
  FranchiseTrueValuePreviewPlayerRow,
  FranchiseTrueValuePreviewReport,
} from './franchiseTrueValuePreview';

export const FRANCHISE_DESIGNATION_READINESS_REPORT_VERSION =
  'franchise-designation-readiness-v1-readonly';

export type FranchiseValueDesignationReadinessType = 'FAN_FAVORITE' | 'ALBATROSS';
export type FranchiseDesignationReadinessStatus = 'preview-only' | 'blocked';
export type FranchiseDesignationReadinessDirection =
  | 'positive-surplus-preview-context'
  | 'negative-deficit-preview-context'
  | 'neutral-no-context';

export interface FranchiseDesignationReadinessPolicies {
  finalTrueValueTrusted: false;
  valueDeltaTrustedForDesignations: false;
  fanFavoriteFinalizationAllowed: false;
  albatrossFinalizationAllowed: false;
  designationPersistenceAllowed: false;
  randomEventPromptAllowed: false;
  moraleMutationAllowed: false;
  salaryMovementAllowed: false;
  relationshipMutationAllowed: false;
  mode3HandoffAllowed: false;
}

export interface FranchiseDesignationReadinessRow {
  contractVersion: typeof FRANCHISE_DESIGNATION_READINESS_REPORT_VERSION;
  franchiseId: string;
  seasonId: string;
  statsScopeId: string;
  seasonNumber: number;
  playerId: string;
  playerName: string;
  teamId: string | null;
  rosterStatus: string | null;
  designationType: FranchiseValueDesignationReadinessType;
  salaryBaseline: number | null;
  previewValueEstimate: number | null;
  previewValueDeltaEstimate: number | null;
  readinessStatus: FranchiseDesignationReadinessStatus;
  candidateDirection: FranchiseDesignationReadinessDirection;
  finalizationAllowed: false;
  randomEventPromptAllowed: false;
  blockers: string[];
  limitations: string[];
}

export interface FranchiseDesignationReadinessReport {
  contractVersion: typeof FRANCHISE_DESIGNATION_READINESS_REPORT_VERSION;
  generatedAt: number;
  franchiseId: string;
  seasonId: string;
  statsScopeId: string;
  seasonNumber: number;
  sourceContractVersion: string;
  eligibilityContractVersion: string | null;
  rows: FranchiseDesignationReadinessRow[];
  policies: FranchiseDesignationReadinessPolicies;
  blockers: string[];
  limitations: string[];
  hiddenSafe: true;
  readOnly: true;
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

function finiteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function hasText(value: string | null | undefined): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function policies(): FranchiseDesignationReadinessPolicies {
  return {
    finalTrueValueTrusted: false,
    valueDeltaTrustedForDesignations: false,
    fanFavoriteFinalizationAllowed: false,
    albatrossFinalizationAllowed: false,
    designationPersistenceAllowed: false,
    randomEventPromptAllowed: false,
    moraleMutationAllowed: false,
    salaryMovementAllowed: false,
    relationshipMutationAllowed: false,
    mode3HandoffAllowed: false,
  };
}

function hasReportScope(report: FranchiseTrueValuePreviewReport): boolean {
  return Boolean(
    hasText(report.franchiseId) &&
    hasText(report.seasonId) &&
    hasText(report.statsScopeId) &&
    Number.isInteger(report.seasonNumber) &&
    report.seasonNumber > 0,
  );
}

function rowHasScope(row: FranchiseTrueValuePreviewPlayerRow): boolean {
  return Boolean(
    hasText(row.franchiseId) &&
    hasText(row.seasonId) &&
    hasText(row.statsScopeId) &&
    Number.isInteger(row.seasonNumber) &&
    row.seasonNumber > 0,
  );
}

function rowScopeMatchesReport(
  report: FranchiseTrueValuePreviewReport,
  row: FranchiseTrueValuePreviewPlayerRow,
): boolean {
  return (
    hasReportScope(report) &&
    rowHasScope(row) &&
    row.franchiseId === report.franchiseId &&
    row.seasonId === report.seasonId &&
    row.statsScopeId === report.statsScopeId &&
    row.seasonNumber === report.seasonNumber
  );
}

function rowDirection(
  designationType: FranchiseValueDesignationReadinessType,
  valueDeltaEstimate: number | null,
): FranchiseDesignationReadinessDirection {
  if (!finiteNumber(valueDeltaEstimate) || valueDeltaEstimate === 0) return 'neutral-no-context';
  if (designationType === 'FAN_FAVORITE' && valueDeltaEstimate > 0) {
    return 'positive-surplus-preview-context';
  }
  if (designationType === 'ALBATROSS' && valueDeltaEstimate < 0) {
    return 'negative-deficit-preview-context';
  }
  return 'neutral-no-context';
}

function baseBlockers(
  report: FranchiseTrueValuePreviewReport,
  row: FranchiseTrueValuePreviewPlayerRow,
): string[] {
  const blockers: string[] = [];
  if (!hasReportScope(report)) {
    blockers.push('Explicit franchise, season, stats scope, and positive season number are required for designation readiness.');
  }
  if (!rowHasScope(row)) {
    blockers.push('True Value preview row requires explicit franchise, season, stats scope, and positive season number.');
  }
  if (!rowScopeMatchesReport(report, row)) {
    blockers.push('True Value preview row scope does not match the report scope.');
  }
  if (!row.playerId?.trim()) {
    blockers.push('Player id is required for Fan Favorite/Albatross readiness.');
  }
  if (!row.teamId?.trim()) {
    blockers.push('Current team id is required for Fan Favorite/Albatross readiness.');
  }
  if (row.rosterStatus !== 'MLB') {
    blockers.push(`Current MLB roster status is required for Fan Favorite/Albatross readiness; found ${row.rosterStatus ?? 'unassigned/free-agent'}.`);
  }
  if (!row.salaryBaselineAvailable || !finiteNumber(row.salary)) {
    blockers.push('Stable salary baseline is required for Fan Favorite/Albatross readiness.');
  }
  if (!finiteNumber(row.previewValueEstimate)) {
    blockers.push('Preview value estimate is required for Fan Favorite/Albatross readiness.');
  }
  if (!finiteNumber(row.valueDeltaEstimate)) {
    blockers.push('Preview value-delta estimate is required for Fan Favorite/Albatross readiness.');
  }
  if (row.status !== 'preview-only') {
    blockers.push('True Value preview row must be preview-only before Fan Favorite/Albatross readiness can be inspected.');
  }
  return unique(blockers);
}

function readinessRow(
  report: FranchiseTrueValuePreviewReport,
  row: FranchiseTrueValuePreviewPlayerRow,
  designationType: FranchiseValueDesignationReadinessType,
): FranchiseDesignationReadinessRow {
  const blockers = baseBlockers(report, row);
  const candidateDirection = rowDirection(designationType, row.valueDeltaEstimate);
  if (candidateDirection === 'neutral-no-context') {
    blockers.push(`${designationType} readiness requires ${designationType === 'FAN_FAVORITE' ? 'a positive surplus' : 'a negative deficit'} preview value-delta context.`);
  }

  return {
    contractVersion: FRANCHISE_DESIGNATION_READINESS_REPORT_VERSION,
    franchiseId: row.franchiseId,
    seasonId: row.seasonId,
    statsScopeId: row.statsScopeId,
    seasonNumber: row.seasonNumber,
    playerId: row.playerId,
    playerName: row.playerName,
    teamId: row.teamId,
    rosterStatus: row.rosterStatus,
    designationType,
    salaryBaseline: finiteNumber(row.salary) ? row.salary : null,
    previewValueEstimate: finiteNumber(row.previewValueEstimate) ? row.previewValueEstimate : null,
    previewValueDeltaEstimate: finiteNumber(row.valueDeltaEstimate) ? row.valueDeltaEstimate : null,
    readinessStatus: blockers.length === 0 ? 'preview-only' : 'blocked',
    candidateDirection,
    finalizationAllowed: false,
    randomEventPromptAllowed: false,
    blockers: unique(blockers),
    limitations: unique([
      ...row.limitations,
      'Fan Favorite/Albatross readiness is read-only preview context only.',
      'Preview value delta is not trusted for final designations, random-event morale prompts, salary movement, relationships, offseason, or Mode 3.',
      'Trusted True Value/value-delta promotion remains a future explicit decision.',
    ]),
  };
}

function reportBlockers(
  trueValuePreviewReport: FranchiseTrueValuePreviewReport,
  eligibilityReport?: FranchiseDesignationEligibilityReport | null,
): string[] {
  const blockers: string[] = [];
  if (!hasReportScope(trueValuePreviewReport)) {
    blockers.push('Explicit franchise, season, stats scope, and positive season number are required for designation readiness.');
  }
  if (eligibilityReport) {
    const eligibilityHasScope = Boolean(
      hasText(eligibilityReport.franchiseId) &&
      hasText(eligibilityReport.seasonId) &&
      hasText(eligibilityReport.statsScopeId) &&
      Number.isInteger(eligibilityReport.seasonNumber) &&
      eligibilityReport.seasonNumber > 0,
    );
    const eligibilityScopeMatches =
      eligibilityHasScope &&
      hasReportScope(trueValuePreviewReport) &&
      eligibilityReport.franchiseId === trueValuePreviewReport.franchiseId &&
      eligibilityReport.seasonId === trueValuePreviewReport.seasonId &&
      eligibilityReport.statsScopeId === trueValuePreviewReport.statsScopeId &&
      eligibilityReport.seasonNumber === trueValuePreviewReport.seasonNumber;
    if (!eligibilityScopeMatches) {
      blockers.push('Optional designation eligibility report scope does not match the True Value preview report scope.');
    }
  }
  return unique(blockers);
}

export function buildFranchiseDesignationReadinessReport(
  trueValuePreviewReport: FranchiseTrueValuePreviewReport,
  eligibilityReport?: FranchiseDesignationEligibilityReport | null,
): FranchiseDesignationReadinessReport {
  const blockers = reportBlockers(trueValuePreviewReport, eligibilityReport);
  const rows = trueValuePreviewReport.playerRows.flatMap((row) => [
    readinessRow(trueValuePreviewReport, row, 'FAN_FAVORITE'),
    readinessRow(trueValuePreviewReport, row, 'ALBATROSS'),
  ]);

  return {
    contractVersion: FRANCHISE_DESIGNATION_READINESS_REPORT_VERSION,
    generatedAt: trueValuePreviewReport.generatedAt,
    franchiseId: trueValuePreviewReport.franchiseId,
    seasonId: trueValuePreviewReport.seasonId,
    statsScopeId: trueValuePreviewReport.statsScopeId,
    seasonNumber: trueValuePreviewReport.seasonNumber,
    sourceContractVersion: trueValuePreviewReport.contractVersion,
    eligibilityContractVersion: eligibilityReport?.contractVersion ?? null,
    rows,
    policies: policies(),
    blockers,
    limitations: unique([
      ...trueValuePreviewReport.limitations,
      eligibilityReport ? 'Designation eligibility report was included as read-only context only.' : 'No designation eligibility report was provided; readiness is based on True Value preview rows only.',
      'Fan Favorite and Albatross are not promoted to final designation behavior or random-event morale prompts in this slice.',
      'Final True Value, trusted value delta, designation persistence, salary movement, morale mutation, relationships, story persistence, offseason, and Mode 3 remain blocked.',
    ]),
    hiddenSafe: true,
    readOnly: true,
  };
}
