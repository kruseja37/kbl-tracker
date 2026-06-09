import type {
  FranchiseDesignationEligibilityRecord,
  FranchiseDesignationEligibilityReport,
  FranchiseDesignationEligibilityType,
} from './franchiseDesignationEligibility';
import type { FranchiseDesignationMoraleBridgeInput } from './franchiseDesignationMoraleBridge';

export const FRANCHISE_DESIGNATION_MORALE_CONTEXT_ADAPTER_VERSION =
  'franchise-designation-morale-context-adapter-v1-readonly';

export interface FranchiseDesignationMoraleContextBlockedSummary {
  franchiseId: string;
  seasonId: string;
  statsScopeId: string;
  seasonNumber: number;
  playerId: string;
  playerName: string;
  teamId: string | null;
  rosterStatus: string | null;
  designationType: FranchiseDesignationEligibilityType;
  status: FranchiseDesignationEligibilityRecord['status'];
  reasons: string[];
  limitations: string[];
}

export interface FranchiseDesignationMoraleContextAdapterReport {
  contractVersion: typeof FRANCHISE_DESIGNATION_MORALE_CONTEXT_ADAPTER_VERSION;
  generatedAt: number;
  sourceContractVersion: FranchiseDesignationEligibilityReport['contractVersion'];
  franchiseId: string;
  seasonId: string;
  statsScopeId: string;
  seasonNumber: number;
  contexts: FranchiseDesignationMoraleBridgeInput[];
  blocked: FranchiseDesignationMoraleContextBlockedSummary[];
  limitations: string[];
  persistable: false;
  mutable: false;
  automaticMoraleMutationAllowed: false;
  designationPersistenceAllowed: false;
  trueValueCalculationAllowed: false;
  hiddenProspectTruthAllowed: false;
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

function hasExplicitReportScope(report: FranchiseDesignationEligibilityReport): boolean {
  return Boolean(
    report.franchiseId &&
    report.seasonId &&
    report.statsScopeId &&
    Number.isInteger(report.seasonNumber) &&
    report.seasonNumber > 0,
  );
}

function recordScopeMatchesReport(
  report: FranchiseDesignationEligibilityReport,
  record: FranchiseDesignationEligibilityRecord,
): boolean {
  return (
    record.franchiseId === report.franchiseId &&
    record.seasonId === report.seasonId &&
    record.statsScopeId === report.statsScopeId &&
    record.seasonNumber === report.seasonNumber
  );
}

function baseBlockedSummary(
  record: FranchiseDesignationEligibilityRecord,
  reasons: string[],
): FranchiseDesignationMoraleContextBlockedSummary {
  return {
    franchiseId: record.franchiseId,
    seasonId: record.seasonId,
    statsScopeId: record.statsScopeId,
    seasonNumber: record.seasonNumber,
    playerId: record.playerId,
    playerName: record.playerName,
    teamId: record.teamId,
    rosterStatus: record.rosterStatus,
    designationType: record.designationType,
    status: record.status,
    reasons: unique(reasons),
    limitations: unique([
      ...record.limitations,
      'Designation morale context adapter is read-only and does not persist designations or morale effects.',
    ]),
  };
}

function blockedReasonsForRecord(
  report: FranchiseDesignationEligibilityReport,
  record: FranchiseDesignationEligibilityRecord,
): string[] {
  const reasons: string[] = [];
  if (!hasExplicitReportScope(report)) {
    reasons.push('Explicit franchise, season, stats scope, and positive season number are required.');
  }
  if (!recordScopeMatchesReport(report, record)) {
    reasons.push('Designation eligibility record scope does not match the report scope.');
  }
  if (record.designationType !== 'TEAM_MVP' && record.designationType !== 'ACE') {
    if (record.designationType === 'FAN_FAVORITE' || record.designationType === 'ALBATROSS') {
      reasons.push(`${record.designationType} morale context remains blocked until trusted True Value/value-delta and durable designation state exist.`);
    } else if (record.designationType === 'CAPTAIN') {
      reasons.push('CAPTAIN morale context remains blocked until hidden-charisma/leadership safety is approved.');
    } else if (record.designationType === 'FAN_HOPEFUL') {
      reasons.push('FAN_HOPEFUL morale context remains blocked until a visible-safe prospect assignment source exists.');
    } else {
      reasons.push(`${record.designationType} morale context remains blocked until trusted durable designation state exists.`);
    }
  }
  if (record.status !== 'preview-only') {
    reasons.push('Only preview-only TEAM_MVP/ACE eligibility records can become morale bridge contexts in this adapter; active designations emit DesignationEvent records instead.');
  }
  if (record.rosterStatus !== 'MLB') {
    reasons.push(`Current revealed MLB roster status is required; found ${record.rosterStatus ?? 'unassigned/free-agent'}.`);
  }
  if (!record.teamId) {
    reasons.push('Current team id is required for designation morale context.');
  }
  if (!record.playerId) {
    reasons.push('Player id is required for designation morale context.');
  }
  return unique(reasons);
}

function contextForRecord(
  record: FranchiseDesignationEligibilityRecord,
): FranchiseDesignationMoraleBridgeInput {
  return {
    franchiseId: record.franchiseId,
    seasonId: record.seasonId,
    statsScopeId: record.statsScopeId,
    seasonNumber: record.seasonNumber,
    designationType: record.designationType,
    designationStatus: 'preview-only',
    playerId: record.playerId,
    playerName: record.playerName,
    teamId: record.teamId ?? undefined,
    rosterStatus: record.rosterStatus,
    ratingRevealState: 'revealed',
    playerCurrent: true,
    triggerKind: 'recognition',
    triggerFranchiseId: record.franchiseId,
    triggerSeasonId: record.seasonId,
    triggerStatsScopeId: record.statsScopeId,
    triggerSeasonNumber: record.seasonNumber,
    triggerDescription: `${record.designationType} read-only preview eligibility can be reviewed as player morale recognition context.`,
    valueDeltaTrusted: false,
    durableDesignationStateTrusted: false,
    hiddenProspectTruthPresent: false,
    hiddenProspectTruthApproved: false,
    hiddenTruthExposed: false,
  };
}

export function buildFranchiseDesignationMoraleContextAdapterReport(
  eligibilityReport: FranchiseDesignationEligibilityReport,
): FranchiseDesignationMoraleContextAdapterReport {
  const contexts: FranchiseDesignationMoraleBridgeInput[] = [];
  const blocked: FranchiseDesignationMoraleContextBlockedSummary[] = [];

  for (const record of eligibilityReport.records) {
    const reasons = blockedReasonsForRecord(eligibilityReport, record);
    if ((record.designationType === 'TEAM_MVP' || record.designationType === 'ACE') && reasons.length === 0) {
      contexts.push(contextForRecord(record));
    } else {
      blocked.push(baseBlockedSummary(record, reasons.length > 0 ? reasons : [
        'Designation record is not eligible for a morale bridge context in internal v1.',
      ]));
    }
  }

  return {
    contractVersion: FRANCHISE_DESIGNATION_MORALE_CONTEXT_ADAPTER_VERSION,
    generatedAt: eligibilityReport.generatedAt,
    sourceContractVersion: eligibilityReport.contractVersion,
    franchiseId: eligibilityReport.franchiseId,
    seasonId: eligibilityReport.seasonId,
    statsScopeId: eligibilityReport.statsScopeId,
    seasonNumber: eligibilityReport.seasonNumber,
    contexts,
    blocked,
    limitations: unique([
      ...eligibilityReport.limitations,
      'Adapter emits only read-only bridge contexts; it does not create random-event records or apply morale.',
      'Only preview-only TEAM_MVP/ACE records for current MLB players are converted.',
      'Active TEAM_MVP/ACE designations are not converted here to avoid duplicate recognition prompts.',
      'Fan Favorite, Albatross, Cornerstone, Captain, and Fan Hopeful remain blocked until their upstream trust sources exist.',
      'Hidden FARM/prospect truth is not accepted or exposed by this adapter.',
    ]),
    persistable: false,
    mutable: false,
    automaticMoraleMutationAllowed: false,
    designationPersistenceAllowed: false,
    trueValueCalculationAllowed: false,
    hiddenProspectTruthAllowed: false,
  };
}
