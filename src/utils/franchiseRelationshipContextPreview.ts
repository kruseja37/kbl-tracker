import type { FranchisePlayerProfileViewModel } from './franchisePlayerProfile';
import type { FranchiseMoraleRelationshipTrustReport } from './franchiseMoraleRelationshipTrust';
import {
  validateFranchiseMoraleRelationshipOverrideProposal,
  type FranchiseMoraleRelationshipOverrideProposal,
  type FranchiseMoraleRelationshipOverrideValidationResult,
} from './franchiseMoraleRelationshipOverrideSchema';

export const FRANCHISE_RELATIONSHIP_CONTEXT_PREVIEW_VERSION =
  'franchise-relationship-context-preview-v1-readonly';

export type FranchiseRelationshipContextBoundaryKind =
  | 'player-player'
  | 'fan-team'
  | 'scout-prospect';

export interface FranchiseRelationshipContextPreviewRow {
  kind: FranchiseRelationshipContextBoundaryKind;
  label: string;
  status: FranchiseMoraleRelationshipOverrideValidationResult['status'] | 'not-applicable';
  proposal: FranchiseMoraleRelationshipOverrideProposal | null;
  validation: FranchiseMoraleRelationshipOverrideValidationResult | null;
  evidenceDescriptions: string[];
  reasons: string[];
  warnings: string[];
  blockers: string[];
  contextOnly: true;
}

export interface FranchiseRelationshipContextPreviewReport {
  contractVersion: typeof FRANCHISE_RELATIONSHIP_CONTEXT_PREVIEW_VERSION;
  franchiseId: string;
  seasonId: string;
  statsScopeId: string;
  seasonNumber: number;
  playerId: string;
  playerName: string;
  hiddenSafe: boolean;
  rows: FranchiseRelationshipContextPreviewRow[];
  evidencePolicy: string[];
  limitations: string[];
  hiddenTruthGuard: FranchiseMoraleRelationshipOverrideValidationResult | null;
  policyFlags: {
    relationshipMutationAllowed: false;
    moraleMutationAllowed: false;
    profileMutationAllowed: false;
    salaryMovementAllowed: false;
    designationMutationAllowed: false;
    storyPersistenceAllowed: false;
    mode3HandoffAllowed: false;
  };
}

export interface BuildFranchiseRelationshipContextPreviewInput {
  franchiseId: string;
  seasonId: string;
  statsScopeId: string;
  seasonNumber: number;
  profile: FranchisePlayerProfileViewModel;
  trustReport?: FranchiseMoraleRelationshipTrustReport | null;
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

function baseProposal(
  input: BuildFranchiseRelationshipContextPreviewInput,
): Omit<FranchiseMoraleRelationshipOverrideProposal, 'kind'> {
  const { profile } = input;
  return {
    franchiseId: input.franchiseId,
    seasonId: input.seasonId,
    statsScopeId: input.statsScopeId,
    seasonNumber: input.seasonNumber,
    actor: {
      actorType: 'manual-note',
      actorId: 'internal-v1-relationship-context',
      displayName: 'Internal v1 relationship context',
    },
    overrideType: 'manual-relationship-context-preview',
    proposedEffect: {
      direction: 'context-only',
      magnitude: 'minor',
      summary: 'Read-only relationship context preview; no relationship or morale state is created.',
    },
    reason: `Preview relationship context boundary for ${profile.identity.name}.`,
    evidenceReferences: [],
    hiddenProspectSafety: {
      targetRosterStatus: profile.rosterStatus,
      targetRevealState: profile.revealState,
      includesHiddenTruthEvidence: false,
      hiddenFieldsReferenced: [],
    },
    approvalState: 'draft',
  };
}

function validateRow(
  kind: FranchiseRelationshipContextBoundaryKind,
  label: string,
  proposal: FranchiseMoraleRelationshipOverrideProposal,
  extraLimitations: string[] = [],
): FranchiseRelationshipContextPreviewRow {
  const validation = validateFranchiseMoraleRelationshipOverrideProposal(proposal);
  return {
    kind,
    label,
    status: validation.status,
    proposal,
    validation,
    evidenceDescriptions: proposal.evidenceReferences.map((reference) =>
      reference.description ?? `${reference.type}: ${reference.context}`,
    ),
    reasons: validation.reasons,
    warnings: unique([...validation.warnings, ...extraLimitations]),
    blockers: validation.blockers,
    contextOnly: true,
  };
}

function trustLimitations(
  trustReport: FranchiseMoraleRelationshipTrustReport | null | undefined,
  playerId: string,
): string[] {
  const playerRecord = trustReport?.playerRecords.find((record) => record.playerId === playerId);
  return unique([
    ...(playerRecord?.relationshipChanges.limitations ?? []),
    ...(playerRecord?.limitations ?? []),
    ...(trustReport?.downstreamConsumers.relationshipChanges.limitations ?? []),
    ...(trustReport?.scoreOnlyResults.limitations ?? []),
    ...(trustReport?.gameTrackerArchives.limitations ?? []),
  ]);
}

export function buildFranchiseRelationshipContextPreview(
  input: BuildFranchiseRelationshipContextPreviewInput,
): FranchiseRelationshipContextPreviewReport {
  const { profile } = input;
  const base = baseProposal(input);
  const visibleEvidenceContext = profile.hiddenSafe ? 'prospect-visible' : 'player';
  const playerEvidenceDescription = profile.hiddenSafe
    ? 'Visible scouting/profile context only; hidden FARM/prospect truth is not included.'
    : 'Manual profile context may be used as factual relationship context only.';

  const playerRelationship = validateRow(
    'player-player',
    'Player-player relationship proposal boundary',
    {
      ...base,
      kind: 'player-relationship',
      targetPlayerId: profile.playerId,
      relatedPlayerId: '',
      targetTeamId: profile.teamId,
      evidenceReferences: [{
        type: profile.hiddenSafe ? 'scouting-report' : 'manual-note',
        context: visibleEvidenceContext,
        playerId: profile.playerId,
        teamId: profile.teamId,
        description: playerEvidenceDescription,
      }],
    },
    ['A second player must be chosen manually before any player-player relationship draft can be complete.'],
  );

  const fanTeam = validateRow(
    'fan-team',
    'Fan/team relationship proposal boundary',
    {
      ...base,
      kind: 'fanbase-team-relationship',
      targetTeamId: profile.teamId ?? '',
      fanbaseId: profile.teamId ? `${profile.teamId}:fanbase` : undefined,
      evidenceReferences: [{
        type: 'score-only-schedule',
        context: 'team',
        teamId: profile.teamId,
        franchiseId: input.franchiseId,
        seasonId: input.seasonId,
        statsScopeId: input.statsScopeId,
        scoreOnly: true,
        description: 'Score-only data is team/schedule context only, not player relationship authority.',
      }],
    },
  );

  const rows = [playerRelationship, fanTeam];

  if (profile.hiddenSafe) {
    rows.push(validateRow(
      'scout-prospect',
      'Scout/prospect relationship proposal boundary',
      {
        ...base,
        kind: 'scout-prospect-relationship',
        targetScoutId: profile.prospectReport.scoutName ? `visible-scout:${profile.prospectReport.scoutName}` : '',
        targetProspectPlayerId: profile.playerId,
        evidenceReferences: [{
          type: 'scouting-report',
          context: 'prospect-visible',
          playerId: profile.playerId,
          teamId: profile.teamId,
          description: 'Visible scouting report context only; hidden scout truth is blocked.',
        }],
      },
      ['Scout/prospect relationship drafts are approval-gated and remain hidden-safe.'],
    ));
  }

  const hiddenTruthGuard = profile.hiddenSafe
    ? validateFranchiseMoraleRelationshipOverrideProposal({
        ...base,
        kind: 'scout-prospect-relationship',
        targetScoutId: profile.prospectReport.scoutName ? `visible-scout:${profile.prospectReport.scoutName}` : 'visible-scout',
        targetProspectPlayerId: profile.playerId,
        evidenceReferences: [{
          type: 'hidden-prospect-truth',
          context: 'hidden-truth',
          playerId: profile.playerId,
          teamId: profile.teamId,
          hiddenProspectTruth: true,
          hiddenFields: ['true ratings', 'true grade', 'hidden scout truth', 'hidden personality modifiers'],
          description: 'Blocked hidden FARM/prospect truth marker; no hidden values are rendered.',
        }],
        hiddenProspectSafety: {
          targetRosterStatus: profile.rosterStatus,
          targetRevealState: profile.revealState,
          includesHiddenTruthEvidence: true,
          hiddenFieldsReferenced: ['true ratings', 'true grade', 'hidden scout truth', 'hidden personality modifiers'],
        },
      })
    : null;

  const limitations = unique([
    'No durable relationship state exists in Franchise internal v1.',
    'Relationship context is draft-only/read-only and cannot mutate morale, profiles, salary, designations, stories, offseason, or Mode 3.',
    ...trustLimitations(input.trustReport, profile.playerId),
    ...rows.flatMap((row) => row.blockers),
    ...rows.flatMap((row) => row.warnings),
    ...(hiddenTruthGuard?.blockers ?? []),
  ]);

  return {
    contractVersion: FRANCHISE_RELATIONSHIP_CONTEXT_PREVIEW_VERSION,
    franchiseId: input.franchiseId,
    seasonId: input.seasonId,
    statsScopeId: input.statsScopeId,
    seasonNumber: input.seasonNumber,
    playerId: profile.playerId,
    playerName: profile.identity.name,
    hiddenSafe: profile.hiddenSafe,
    rows,
    evidencePolicy: [
      'GameTracker/archive facts may be factual context only.',
      'Score-only data is team/schedule context only, not player relationship authority.',
      'Hidden FARM/prospect truth is blocked.',
      'No durable relationship state exists in Franchise internal v1.',
    ],
    limitations,
    hiddenTruthGuard,
    policyFlags: {
      relationshipMutationAllowed: false,
      moraleMutationAllowed: false,
      profileMutationAllowed: false,
      salaryMovementAllowed: false,
      designationMutationAllowed: false,
      storyPersistenceAllowed: false,
      mode3HandoffAllowed: false,
    },
  };
}
