export const FRANCHISE_MORALE_RELATIONSHIP_OVERRIDE_SCHEMA_VERSION =
  'franchise-morale-relationship-override-schema-v1-draft-only';

export type FranchiseMoraleRelationshipOverrideProposalKind =
  | 'player-morale'
  | 'player-relationship'
  | 'fanbase-team-relationship'
  | 'scout-prospect-relationship';

export type FranchiseMoraleRelationshipOverrideDirection =
  | 'increase'
  | 'decrease'
  | 'neutral'
  | 'strengthen'
  | 'weaken'
  | 'context-only';

export type FranchiseMoraleRelationshipOverrideApprovalState =
  | 'draft'
  | 'needs-approval';

export type FranchiseMoraleRelationshipOverrideValidationStatus =
  | 'valid-draft'
  | 'needs-approval'
  | 'invalid';

export type FranchiseMoraleRelationshipEvidenceType =
  | 'gametracker-archive'
  | 'score-only-schedule'
  | 'roster-transaction'
  | 'player-profile-edit'
  | 'manual-note'
  | 'scouting-report'
  | 'hidden-prospect-truth';

export type FranchiseMoraleRelationshipEvidenceContext =
  | 'player'
  | 'team'
  | 'schedule'
  | 'scout'
  | 'prospect-visible'
  | 'hidden-truth';

export interface FranchiseMoraleRelationshipOverrideActorSource {
  actorType: 'user' | 'admin' | 'manual-note';
  actorId?: string;
  displayName?: string;
}

export interface FranchiseMoraleRelationshipOverrideEvidenceReference {
  type: FranchiseMoraleRelationshipEvidenceType;
  context: FranchiseMoraleRelationshipEvidenceContext;
  id?: string;
  gameId?: string;
  scheduleGameId?: string;
  transactionId?: string;
  playerId?: string;
  teamId?: string;
  scoutId?: string;
  franchiseId?: string;
  seasonId?: string;
  statsScopeId?: string;
  description?: string;
  archiveBacked?: boolean;
  scoreOnly?: boolean;
  hiddenProspectTruth?: boolean;
  hiddenFields?: string[];
}

export interface FranchiseMoraleRelationshipOverrideSafetyFlags {
  targetRosterStatus?: string | null;
  targetRevealState?: 'hidden' | 'revealed' | 'unknown';
  includesHiddenTruthEvidence?: boolean;
  hiddenFieldsReferenced?: string[];
}

export interface FranchiseMoraleRelationshipOverrideEffect {
  direction: FranchiseMoraleRelationshipOverrideDirection;
  summary: string;
  magnitude?: 'minor' | 'moderate' | 'major';
}

interface FranchiseMoraleRelationshipOverrideProposalBase {
  schemaVersion?: typeof FRANCHISE_MORALE_RELATIONSHIP_OVERRIDE_SCHEMA_VERSION;
  kind: FranchiseMoraleRelationshipOverrideProposalKind;
  franchiseId: string;
  seasonId: string;
  statsScopeId: string;
  seasonNumber: number;
  actor: FranchiseMoraleRelationshipOverrideActorSource;
  overrideType: string;
  proposedEffect: FranchiseMoraleRelationshipOverrideEffect;
  reason: string;
  evidenceReferences: FranchiseMoraleRelationshipOverrideEvidenceReference[];
  hiddenProspectSafety: FranchiseMoraleRelationshipOverrideSafetyFlags;
  approvalState: FranchiseMoraleRelationshipOverrideApprovalState;
}

export interface FranchisePlayerMoraleOverrideProposal
  extends FranchiseMoraleRelationshipOverrideProposalBase {
  kind: 'player-morale';
  targetPlayerId: string;
  targetTeamId?: string;
}

export interface FranchisePlayerRelationshipOverrideProposal
  extends FranchiseMoraleRelationshipOverrideProposalBase {
  kind: 'player-relationship';
  targetPlayerId: string;
  relatedPlayerId: string;
  targetTeamId?: string;
}

export interface FranchiseFanbaseTeamRelationshipOverrideProposal
  extends FranchiseMoraleRelationshipOverrideProposalBase {
  kind: 'fanbase-team-relationship';
  targetTeamId: string;
  fanbaseId?: string;
}

export interface FranchiseScoutProspectRelationshipOverrideProposal
  extends FranchiseMoraleRelationshipOverrideProposalBase {
  kind: 'scout-prospect-relationship';
  targetScoutId: string;
  targetProspectPlayerId: string;
}

export type FranchiseMoraleRelationshipOverrideProposal =
  | FranchisePlayerMoraleOverrideProposal
  | FranchisePlayerRelationshipOverrideProposal
  | FranchiseFanbaseTeamRelationshipOverrideProposal
  | FranchiseScoutProspectRelationshipOverrideProposal;

export interface FranchiseMoraleRelationshipOverrideValidationResult {
  schemaVersion: typeof FRANCHISE_MORALE_RELATIONSHIP_OVERRIDE_SCHEMA_VERSION;
  proposalKind: FranchiseMoraleRelationshipOverrideProposalKind;
  franchiseId: string;
  seasonId: string;
  statsScopeId: string;
  seasonNumber: number;
  status: FranchiseMoraleRelationshipOverrideValidationStatus;
  validAsDraft: boolean;
  needsApproval: boolean;
  approvalState: FranchiseMoraleRelationshipOverrideApprovalState;
  persistable: false;
  mutable: false;
  automaticEffectsAllowed: false;
  reasons: string[];
  blockers: string[];
  warnings: string[];
  evidenceSummary: {
    references: number;
    gameTrackerArchiveReferences: number;
    scoreOnlyScheduleReferences: number;
    rosterTransactionReferences: number;
    hiddenTruthReferences: number;
    scoreOnlyPlayerEvidenceBlocked: boolean;
  };
}

export interface FranchiseMoraleRelationshipOverrideReport {
  schemaVersion: typeof FRANCHISE_MORALE_RELATIONSHIP_OVERRIDE_SCHEMA_VERSION;
  generatedAt: number;
  total: number;
  validDrafts: number;
  needsApproval: number;
  invalid: number;
  persistable: false;
  mutable: false;
  automaticEffectsAllowed: false;
  results: FranchiseMoraleRelationshipOverrideValidationResult[];
  blockers: string[];
  warnings: string[];
}

function trim(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

function hasScopeIdentity(proposal: FranchiseMoraleRelationshipOverrideProposal): boolean {
  return Boolean(
    trim(proposal.franchiseId) &&
      trim(proposal.seasonId) &&
      trim(proposal.statsScopeId) &&
      Number.isInteger(proposal.seasonNumber) &&
      proposal.seasonNumber > 0,
  );
}

function evidenceUsesHiddenTruth(reference: FranchiseMoraleRelationshipOverrideEvidenceReference): boolean {
  return (
    reference.type === 'hidden-prospect-truth' ||
    reference.context === 'hidden-truth' ||
    reference.hiddenProspectTruth === true ||
    (reference.hiddenFields?.length ?? 0) > 0
  );
}

function evidenceIsScoreOnlyPlayerEvidence(
  reference: FranchiseMoraleRelationshipOverrideEvidenceReference,
): boolean {
  return (
    reference.type === 'score-only-schedule' &&
    (reference.context === 'player' || Boolean(reference.playerId)) &&
    reference.scoreOnly !== false
  );
}

function proposalTargetMissing(proposal: FranchiseMoraleRelationshipOverrideProposal): string[] {
  switch (proposal.kind) {
    case 'player-morale':
      return trim(proposal.targetPlayerId) ? [] : ['player morale overrides require targetPlayerId.'];
    case 'player-relationship':
      return [
        trim(proposal.targetPlayerId) ? '' : 'player relationship overrides require targetPlayerId.',
        trim(proposal.relatedPlayerId) ? '' : 'player relationship overrides require relatedPlayerId.',
      ];
    case 'fanbase-team-relationship':
      return trim(proposal.targetTeamId) ? [] : ['fanbase/team relationship overrides require targetTeamId.'];
    case 'scout-prospect-relationship':
      return [
        trim(proposal.targetScoutId) ? '' : 'scout/prospect relationship overrides require targetScoutId.',
        trim(proposal.targetProspectPlayerId) ? '' : 'scout/prospect relationship overrides require targetProspectPlayerId.',
      ];
    default:
      return ['Unsupported morale/relationship override proposal kind.'];
  }
}

function approvalNeeded(proposal: FranchiseMoraleRelationshipOverrideProposal): boolean {
  return (
    proposal.approvalState === 'needs-approval' ||
    proposal.kind === 'scout-prospect-relationship' ||
    proposal.proposedEffect.magnitude === 'major'
  );
}

export function validateFranchiseMoraleRelationshipOverrideProposal(
  proposal: FranchiseMoraleRelationshipOverrideProposal,
): FranchiseMoraleRelationshipOverrideValidationResult {
  const blockers: string[] = [];
  const warnings: string[] = [];
  const reasons: string[] = [];

  if (!hasScopeIdentity(proposal)) {
    blockers.push('franchiseId, seasonId, statsScopeId, and positive seasonNumber are required for draft overrides.');
  } else {
    reasons.push('Franchise, season, stats scope, and season number are present.');
  }

  const reason = trim(proposal.reason);
  if (!reason) {
    blockers.push('A human-readable reason is required for every manual override draft.');
  } else {
    reasons.push('Human-readable reason is present.');
  }

  if (!trim(proposal.actor?.actorType)) {
    blockers.push('Actor/user source is required for manual override drafts.');
  } else if (!['user', 'admin', 'manual-note'].includes(proposal.actor.actorType)) {
    blockers.push('Manual override drafts only allow user, admin, or manual-note actor sources.');
  }

  if (!['draft', 'needs-approval'].includes(proposal.approvalState)) {
    blockers.push('Manual override schema is draft-only; approved/rejected states are not valid until an approval workflow exists.');
  }

  if (!trim(proposal.overrideType)) {
    blockers.push('overrideType is required for manual override drafts.');
  }

  if (!trim(proposal.proposedEffect?.summary) || !proposal.proposedEffect?.direction) {
    blockers.push('proposedEffect with direction and summary is required for manual override drafts.');
  }

  blockers.push(...proposalTargetMissing(proposal).filter(Boolean));

  const hiddenTruthReferences = proposal.evidenceReferences.filter(evidenceUsesHiddenTruth);
  const scoreOnlyPlayerEvidence = proposal.evidenceReferences.filter(evidenceIsScoreOnlyPlayerEvidence);
  const archiveReferences = proposal.evidenceReferences.filter((reference) =>
    reference.type === 'gametracker-archive' && reference.archiveBacked !== false,
  );
  const scoreOnlyReferences = proposal.evidenceReferences.filter((reference) => reference.type === 'score-only-schedule');
  const transactionReferences = proposal.evidenceReferences.filter((reference) => reference.type === 'roster-transaction');

  if (proposal.hiddenProspectSafety.includesHiddenTruthEvidence || hiddenTruthReferences.length > 0) {
    blockers.push('Unrevealed FARM/prospect hidden truth cannot be used as morale/relationship override evidence.');
  }

  if ((proposal.hiddenProspectSafety.hiddenFieldsReferenced?.length ?? 0) > 0) {
    blockers.push('Hidden prospect fields cannot be referenced by manual morale/relationship override drafts.');
  }

  if (scoreOnlyPlayerEvidence.length > 0) {
    blockers.push('Score-only schedule evidence is allowed only as team/schedule context, not player evidence.');
  }

  if (scoreOnlyReferences.length > 0) {
    warnings.push('Score-only evidence is schedule/standings context only and has no player archive, WPA, or player-stat authority.');
  }

  if (archiveReferences.length > 0) {
    reasons.push('GameTracker archive-backed evidence is referenced as factual context.');
  }

  const needsApproval = blockers.length === 0 && approvalNeeded(proposal);
  const status: FranchiseMoraleRelationshipOverrideValidationStatus =
    blockers.length > 0 ? 'invalid' : needsApproval ? 'needs-approval' : 'valid-draft';

  if (status === 'valid-draft') {
    reasons.push('Proposal is valid as a draft-only manual override contract.');
  }
  if (status === 'needs-approval') {
    reasons.push('Proposal is valid as a draft but remains approval-gated.');
  }

  return {
    schemaVersion: FRANCHISE_MORALE_RELATIONSHIP_OVERRIDE_SCHEMA_VERSION,
    proposalKind: proposal.kind,
    franchiseId: proposal.franchiseId,
    seasonId: proposal.seasonId,
    statsScopeId: proposal.statsScopeId,
    seasonNumber: proposal.seasonNumber,
    status,
    validAsDraft: status !== 'invalid',
    needsApproval,
    approvalState: proposal.approvalState,
    persistable: false,
    mutable: false,
    automaticEffectsAllowed: false,
    reasons: unique(reasons),
    blockers: unique(blockers),
    warnings: unique(warnings),
    evidenceSummary: {
      references: proposal.evidenceReferences.length,
      gameTrackerArchiveReferences: archiveReferences.length,
      scoreOnlyScheduleReferences: scoreOnlyReferences.length,
      rosterTransactionReferences: transactionReferences.length,
      hiddenTruthReferences: hiddenTruthReferences.length,
      scoreOnlyPlayerEvidenceBlocked: scoreOnlyPlayerEvidence.length > 0,
    },
  };
}

export function buildFranchiseMoraleRelationshipOverrideReport(
  proposals: FranchiseMoraleRelationshipOverrideProposal[],
  options: { generatedAt?: number } = {},
): FranchiseMoraleRelationshipOverrideReport {
  const results = proposals.map(validateFranchiseMoraleRelationshipOverrideProposal);
  return {
    schemaVersion: FRANCHISE_MORALE_RELATIONSHIP_OVERRIDE_SCHEMA_VERSION,
    generatedAt: options.generatedAt ?? 0,
    total: results.length,
    validDrafts: results.filter((result) => result.status === 'valid-draft').length,
    needsApproval: results.filter((result) => result.status === 'needs-approval').length,
    invalid: results.filter((result) => result.status === 'invalid').length,
    persistable: false,
    mutable: false,
    automaticEffectsAllowed: false,
    results,
    blockers: unique(results.flatMap((result) => result.blockers)),
    warnings: unique(results.flatMap((result) => result.warnings)),
  };
}
