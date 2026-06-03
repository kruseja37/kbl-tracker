import type { FranchiseDesignationEligibilityType } from './franchiseDesignationEligibility';
import type {
  FranchiseRandomEventEvidenceReference,
  FranchiseRandomEventLogEntryKind,
  FranchiseRandomEventLogSafeEffectPreview,
  FranchiseRandomEventSuggestedManualChange,
} from './franchiseRandomEventLog';

export const FRANCHISE_DESIGNATION_MORALE_BRIDGE_VERSION =
  'franchise-designation-morale-bridge-v1-readonly';

export type FranchiseDesignationMoraleBridgePromptKind =
  | 'designation-recognition-player-morale'
  | 'designation-fan-reaction'
  | 'designation-player-reaction'
  | 'prospect-hopeful-player-morale';

export type FranchiseDesignationMoraleBridgeTriggerKind =
  | 'recognition'
  | 'performance'
  | 'trade'
  | 'send_down'
  | 'call_up'
  | 'roster_move'
  | 'manual_review';

export type FranchiseDesignationMoraleBridgeDesignationStatus =
  | 'eligible'
  | 'preview-only'
  | 'blocked'
  | 'trusted-durable';

export interface FranchiseDesignationMoraleBridgeScope {
  franchiseId: string;
  seasonId: string;
  statsScopeId: string;
  seasonNumber: number;
}

export interface FranchiseDesignationMoraleBridgeInput
  extends Partial<FranchiseDesignationMoraleBridgeScope> {
  designationType: FranchiseDesignationEligibilityType;
  designationStatus: FranchiseDesignationMoraleBridgeDesignationStatus;
  playerId?: string;
  playerName?: string;
  teamId?: string;
  teamName?: string;
  rosterStatus?: string | null;
  ratingRevealState?: 'hidden' | 'revealed';
  playerCurrent?: boolean;
  triggerKind: FranchiseDesignationMoraleBridgeTriggerKind;
  triggerId?: string;
  triggerFranchiseId?: string;
  triggerSeasonId?: string;
  triggerStatsScopeId?: string;
  triggerSeasonNumber?: number;
  triggerDescription?: string;
  valueDeltaTrusted?: boolean;
  durableDesignationStateTrusted?: boolean;
  hiddenProspectTruthPresent?: boolean;
  hiddenProspectTruthApproved?: boolean;
  hiddenTruthExposed?: boolean;
  generatedAt?: number;
}

export interface FranchiseDesignationMoraleBridgeCandidate
  extends FranchiseDesignationMoraleBridgeScope {
  id: string;
  contractVersion: typeof FRANCHISE_DESIGNATION_MORALE_BRIDGE_VERSION;
  designationType: FranchiseDesignationEligibilityType;
  promptKind: FranchiseDesignationMoraleBridgePromptKind;
  triggerKind: FranchiseDesignationMoraleBridgeTriggerKind;
  eventKind: FranchiseRandomEventLogEntryKind;
  title: string;
  targetType: 'team-fan' | 'player';
  targetId: string;
  targetName?: string;
  reason: string;
  suggestedManualChange: FranchiseRandomEventSuggestedManualChange;
  safeEffectPreview: FranchiseRandomEventLogSafeEffectPreview;
  evidenceReferences: FranchiseRandomEventEvidenceReference[];
  blockers: string[];
  limitations: string[];
  hiddenSafe: true;
  persistable: false;
  mutable: false;
  automaticMoraleMutationAllowed: false;
  automaticRelationshipMutationAllowed: false;
  automaticProfileMutationAllowed: false;
  designationPersistenceAllowed: false;
  salaryMovementAllowed: false;
  trueValueCalculationAllowed: false;
  mode3OffseasonAllowed: false;
}

export interface FranchiseDesignationMoraleBridgeReport {
  contractVersion: typeof FRANCHISE_DESIGNATION_MORALE_BRIDGE_VERSION;
  generatedAt: number;
  franchiseId: string;
  seasonId: string;
  statsScopeId: string;
  seasonNumber: number;
  designationType: FranchiseDesignationEligibilityType;
  triggerKind: FranchiseDesignationMoraleBridgeTriggerKind;
  candidates: FranchiseDesignationMoraleBridgeCandidate[];
  candidateCount: number;
  blockers: string[];
  limitations: string[];
  hiddenSafe: true;
  persistable: false;
  mutable: false;
  automaticMoraleMutationAllowed: false;
  automaticRelationshipMutationAllowed: false;
  automaticProfileMutationAllowed: false;
  designationPersistenceAllowed: false;
  salaryMovementAllowed: false;
  trueValueCalculationAllowed: false;
  mode3OffseasonAllowed: false;
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

function hasScope(input: FranchiseDesignationMoraleBridgeInput): input is FranchiseDesignationMoraleBridgeInput & FranchiseDesignationMoraleBridgeScope {
  return Boolean(
    input.franchiseId &&
    input.seasonId &&
    input.statsScopeId &&
    Number.isInteger(input.seasonNumber) &&
    (input.seasonNumber ?? 0) > 0,
  );
}

function scopeBlockers(input: FranchiseDesignationMoraleBridgeInput): string[] {
  const blockers: string[] = [];
  if (!input.franchiseId || !input.seasonId || !input.statsScopeId) {
    blockers.push('Franchise, season, and stats scope identity are required.');
  }
  if (!Number.isInteger(input.seasonNumber) || (input.seasonNumber ?? 0) <= 0) {
    blockers.push('Positive season number is required.');
  }
  if (input.triggerFranchiseId && input.franchiseId && input.triggerFranchiseId !== input.franchiseId) {
    blockers.push('Trigger context franchise scope does not match designation morale bridge scope.');
  }
  if (input.triggerSeasonId && input.seasonId && input.triggerSeasonId !== input.seasonId) {
    blockers.push('Trigger context season scope does not match designation morale bridge scope.');
  }
  if (input.triggerStatsScopeId && input.statsScopeId && input.triggerStatsScopeId !== input.statsScopeId) {
    blockers.push('Trigger context stats scope does not match designation morale bridge scope.');
  }
  if (Number.isInteger(input.triggerSeasonNumber) && Number.isInteger(input.seasonNumber) && input.triggerSeasonNumber !== input.seasonNumber) {
    blockers.push('Trigger context season number does not match designation morale bridge scope.');
  }
  return blockers;
}

function hiddenSafetyBlockers(input: FranchiseDesignationMoraleBridgeInput): string[] {
  const blockers: string[] = [];
  if (input.hiddenTruthExposed) {
    blockers.push('Hidden FARM/prospect truth cannot be used as morale bridge evidence.');
  }
  if (input.hiddenProspectTruthPresent && !input.hiddenProspectTruthApproved) {
    blockers.push('Hidden FARM/prospect truth is present but not approved for designation morale prompts.');
  }
  return blockers;
}

function currentRevealedPlayerBlockers(input: FranchiseDesignationMoraleBridgeInput): string[] {
  const blockers: string[] = [];
  if (!input.playerId) blockers.push('Player id is required for player morale prompts.');
  if (input.playerCurrent === false) blockers.push('Player morale prompts require a current franchise player target.');
  if (input.ratingRevealState === 'hidden') {
    blockers.push('Player morale prompts require revealed/current player targets unless the designation is FAN_HOPEFUL.');
  }
  return blockers;
}

function teamBlockers(input: FranchiseDesignationMoraleBridgeInput): string[] {
  return input.teamId ? [] : ['Team id is required for fan morale prompts.'];
}

function safeManualChange(
  target: FranchiseRandomEventSuggestedManualChange['target'],
  summary: string,
): FranchiseRandomEventSuggestedManualChange {
  return {
    target,
    summary,
    requiresUserConfirmation: true,
    automaticProfileMutationAllowed: false,
    automaticMoraleMutationAllowed: false,
    automaticRelationshipMutationAllowed: false,
  };
}

function evidence(
  scope: FranchiseDesignationMoraleBridgeScope,
  input: FranchiseDesignationMoraleBridgeInput,
  targetType: 'team-fan' | 'player',
  targetId: string,
): FranchiseRandomEventEvidenceReference {
  return {
    type: 'roster-movement-summary',
    description: `${input.designationType} ${input.triggerKind} context only; no designation persistence or morale mutation is automatic.`,
    franchiseId: scope.franchiseId,
    seasonId: scope.seasonId,
    statsScopeId: scope.statsScopeId,
    count: 1,
    playerId: input.playerId,
    teamId: input.teamId,
    targetType,
    targetId,
    targetPlayerRevealState: input.ratingRevealState,
    targetPlayerCurrent: input.playerCurrent,
    hiddenProspectTruth: false,
  };
}

function baseCandidate(
  scope: FranchiseDesignationMoraleBridgeScope,
  input: FranchiseDesignationMoraleBridgeInput,
  details: {
    suffix: string;
    promptKind: FranchiseDesignationMoraleBridgePromptKind;
    title: string;
    targetType: 'team-fan' | 'player';
    targetId: string;
    targetName?: string;
    delta: number;
    summary: string;
    reason: string;
    limitations?: string[];
  },
): FranchiseDesignationMoraleBridgeCandidate {
  const target = details.targetType === 'team-fan' ? 'fan-morale-draft' : 'player-morale-draft';
  const evidenceType = evidence(scope, input, details.targetType, details.targetId);
  return {
    id: `${scope.franchiseId}:${scope.seasonId}:${scope.statsScopeId}:designation-morale:${input.designationType}:${input.triggerKind}:${details.suffix}`,
    contractVersion: FRANCHISE_DESIGNATION_MORALE_BRIDGE_VERSION,
    franchiseId: scope.franchiseId,
    seasonId: scope.seasonId,
    statsScopeId: scope.statsScopeId,
    seasonNumber: scope.seasonNumber,
    designationType: input.designationType,
    promptKind: details.promptKind,
    triggerKind: input.triggerKind,
    eventKind: 'roster-movement-context',
    title: details.title,
    targetType: details.targetType,
    targetId: details.targetId,
    targetName: details.targetName,
    reason: details.reason,
    suggestedManualChange: safeManualChange(target, details.summary),
    safeEffectPreview: {
      target,
      targetType: details.targetType,
      targetId: details.targetId,
      delta: details.delta,
      reason: details.reason,
      source: 'roster-movement-summary',
      requiresUserConfirmation: true,
      automaticProfileMutationAllowed: false,
      automaticMoraleMutationAllowed: false,
      automaticRelationshipMutationAllowed: false,
      automaticStoryPersistenceAllowed: false,
      salaryMovementAllowed: false,
      trueValueMutationAllowed: false,
      designationMutationAllowed: false,
      mode3OffseasonAllowed: false,
    },
    evidenceReferences: [evidenceType],
    blockers: [],
    limitations: unique([
      'Designation morale bridge is read-only candidate generation only.',
      'No random-event log entry, morale change, designation, relationship, profile, salary, True Value, or offseason state is persisted by this bridge.',
      ...(details.limitations ?? []),
    ]),
    hiddenSafe: true,
    persistable: false,
    mutable: false,
    automaticMoraleMutationAllowed: false,
    automaticRelationshipMutationAllowed: false,
    automaticProfileMutationAllowed: false,
    designationPersistenceAllowed: false,
    salaryMovementAllowed: false,
    trueValueCalculationAllowed: false,
    mode3OffseasonAllowed: false,
  };
}

function valueDeltaTrusted(input: FranchiseDesignationMoraleBridgeInput): boolean {
  return input.valueDeltaTrusted === true && input.durableDesignationStateTrusted === true;
}

function durableDesignationTrusted(input: FranchiseDesignationMoraleBridgeInput): boolean {
  return input.durableDesignationStateTrusted === true;
}

function recognitionCandidates(
  scope: FranchiseDesignationMoraleBridgeScope,
  input: FranchiseDesignationMoraleBridgeInput,
): FranchiseDesignationMoraleBridgeCandidate[] {
  const playerBlockers = currentRevealedPlayerBlockers(input);
  if (playerBlockers.length > 0 || !input.playerId) return [];
  return [
    baseCandidate(scope, input, {
      suffix: 'player-recognition',
      promptKind: 'designation-recognition-player-morale',
      title: `${input.designationType} preview recognition candidate`,
      targetType: 'player',
      targetId: input.playerId,
      targetName: input.playerName,
      delta: input.designationType === 'ACE' ? 2 : 3,
      summary: `${input.playerName ?? input.playerId} can receive a reviewed player morale preview-recognition prompt for ${input.designationType}.`,
      reason: `${input.designationType} preview recognition context is safe as a revealed/current player morale prompt only after user confirmation.`,
    }),
  ];
}

function fanFavoriteCandidates(
  scope: FranchiseDesignationMoraleBridgeScope,
  input: FranchiseDesignationMoraleBridgeInput,
): FranchiseDesignationMoraleBridgeCandidate[] {
  if (!valueDeltaTrusted(input) || input.triggerKind !== 'trade' && input.triggerKind !== 'send_down' && input.triggerKind !== 'performance') {
    return [];
  }
  const candidates: FranchiseDesignationMoraleBridgeCandidate[] = [];
  if (input.teamId) {
    candidates.push(baseCandidate(scope, input, {
      suffix: 'fan-favorite-team-reaction',
      promptKind: 'designation-fan-reaction',
      title: 'Fan Favorite negative fan reaction prompt',
      targetType: 'team-fan',
      targetId: input.teamId,
      targetName: input.teamName,
      delta: input.triggerKind === 'performance' ? 1 : -3,
      summary: 'Review a team fan morale prompt tied to trusted Fan Favorite value/designation context.',
      reason: `${input.designationType} ${input.triggerKind} context has trusted value-delta/designation state and may affect team fan morale after confirmation.`,
    }));
  }
  if (input.playerId && input.ratingRevealState !== 'hidden' && input.playerCurrent !== false) {
    candidates.push(baseCandidate(scope, input, {
      suffix: 'fan-favorite-player-reaction',
      promptKind: 'designation-player-reaction',
      title: 'Fan Favorite player morale prompt',
      targetType: 'player',
      targetId: input.playerId,
      targetName: input.playerName,
      delta: input.triggerKind === 'performance' ? 1 : -2,
      summary: 'Review a player morale prompt tied to trusted Fan Favorite value/designation context.',
      reason: `${input.designationType} ${input.triggerKind} context may affect a revealed/current player after confirmation.`,
    }));
  }
  return candidates;
}

function albatrossCandidates(
  scope: FranchiseDesignationMoraleBridgeScope,
  input: FranchiseDesignationMoraleBridgeInput,
): FranchiseDesignationMoraleBridgeCandidate[] {
  if (!valueDeltaTrusted(input) || input.triggerKind !== 'trade' && input.triggerKind !== 'send_down' && input.triggerKind !== 'roster_move') {
    return [];
  }
  const candidates: FranchiseDesignationMoraleBridgeCandidate[] = [];
  if (input.teamId) {
    candidates.push(baseCandidate(scope, input, {
      suffix: 'albatross-team-relief',
      promptKind: 'designation-fan-reaction',
      title: 'Albatross relief fan morale prompt',
      targetType: 'team-fan',
      targetId: input.teamId,
      targetName: input.teamName,
      delta: 2,
      summary: 'Review a team fan morale relief prompt tied to trusted Albatross value/designation context.',
      reason: 'Trusted Albatross movement context may create fan relief after user confirmation.',
    }));
  }
  if (input.playerId && input.ratingRevealState !== 'hidden' && input.playerCurrent !== false) {
    candidates.push(baseCandidate(scope, input, {
      suffix: 'albatross-player-relief',
      promptKind: 'designation-player-reaction',
      title: 'Albatross moved player morale prompt',
      targetType: 'player',
      targetId: input.playerId,
      targetName: input.playerName,
      delta: 1,
      summary: 'Review a revealed player morale prompt tied to trusted Albatross movement context.',
      reason: 'Trusted Albatross movement context may create a reviewed player morale prompt after confirmation.',
    }));
  }
  return candidates;
}

function cornerstoneCandidates(
  scope: FranchiseDesignationMoraleBridgeScope,
  input: FranchiseDesignationMoraleBridgeInput,
): FranchiseDesignationMoraleBridgeCandidate[] {
  if (!durableDesignationTrusted(input) || input.triggerKind !== 'trade' && input.triggerKind !== 'send_down' && input.triggerKind !== 'roster_move') {
    return [];
  }
  const candidates: FranchiseDesignationMoraleBridgeCandidate[] = [];
  if (input.teamId) {
    candidates.push(baseCandidate(scope, input, {
      suffix: 'cornerstone-fan-reaction',
      promptKind: 'designation-fan-reaction',
      title: 'Cornerstone moved fan morale prompt',
      targetType: 'team-fan',
      targetId: input.teamId,
      targetName: input.teamName,
      delta: -5,
      summary: 'Review a stronger team fan morale reaction because durable Cornerstone state is trusted.',
      reason: 'Trusted durable Cornerstone movement context can create a stronger negative fan reaction after confirmation.',
    }));
  }
  if (input.playerId && input.ratingRevealState !== 'hidden' && input.playerCurrent !== false) {
    candidates.push(baseCandidate(scope, input, {
      suffix: 'cornerstone-player-reaction',
      promptKind: 'designation-player-reaction',
      title: 'Cornerstone moved player morale prompt',
      targetType: 'player',
      targetId: input.playerId,
      targetName: input.playerName,
      delta: -3,
      summary: 'Review a stronger revealed player morale reaction because durable Cornerstone state is trusted.',
      reason: 'Trusted durable Cornerstone movement context can create a stronger negative player morale prompt after confirmation.',
    }));
  }
  return candidates;
}

function fanHopefulCandidates(
  scope: FranchiseDesignationMoraleBridgeScope,
  input: FranchiseDesignationMoraleBridgeInput,
): FranchiseDesignationMoraleBridgeCandidate[] {
  if (!input.playerId) return [];
  return [
    baseCandidate(scope, input, {
      suffix: 'fan-hopeful-prospect-safe',
      promptKind: 'prospect-hopeful-player-morale',
      title: 'Fan Hopeful prospect-safe morale prompt',
      targetType: 'player',
      targetId: input.playerId,
      targetName: input.playerName,
      delta: 1,
      summary: 'Review a prospect-safe player morale excitement prompt without exposing hidden FARM truth.',
      reason: 'FAN_HOPEFUL can create visible-safe prospect excitement context without exposing restricted prospect data.',
      limitations: [
        'FAN_HOPEFUL prompt uses visible-safe prospect context only.',
      ],
    }),
  ];
}

function designationBlockers(input: FranchiseDesignationMoraleBridgeInput): string[] {
  const blockers = [...hiddenSafetyBlockers(input)];

  if (input.designationType === 'TEAM_MVP' || input.designationType === 'ACE') {
    if (input.triggerKind !== 'recognition' && input.triggerKind !== 'performance') {
      blockers.push(`${input.designationType} bridge currently supports recognition/performance context only.`);
    }
    blockers.push(...currentRevealedPlayerBlockers(input));
  }

  if (input.designationType === 'FAN_FAVORITE') {
    if (!valueDeltaTrusted(input)) {
      blockers.push('FAN_FAVORITE morale prompts require trusted value-delta and durable designation state.');
    }
    if (input.triggerKind === 'trade' || input.triggerKind === 'send_down') {
      blockers.push(...teamBlockers(input));
    }
  }

  if (input.designationType === 'ALBATROSS') {
    if (!valueDeltaTrusted(input)) {
      blockers.push('ALBATROSS morale prompts require trusted value-delta and durable designation state.');
    }
    blockers.push(...teamBlockers(input));
  }

  if (input.designationType === 'CORNERSTONE') {
    if (!durableDesignationTrusted(input)) {
      blockers.push('CORNERSTONE morale prompts require trusted durable designation state.');
    }
    blockers.push(...teamBlockers(input));
  }

  if (input.designationType === 'CAPTAIN') {
    blockers.push('CAPTAIN morale bridge is blocked until hidden-charisma/leadership safety is approved.');
  }

  if (input.designationType === 'FAN_HOPEFUL' && !input.playerId) {
    blockers.push('FAN_HOPEFUL morale prompts require a player id.');
  }

  return unique(blockers);
}

function buildCandidates(
  scope: FranchiseDesignationMoraleBridgeScope,
  input: FranchiseDesignationMoraleBridgeInput,
  blockers: string[],
): FranchiseDesignationMoraleBridgeCandidate[] {
  if (blockers.length > 0) return [];
  if (input.designationType === 'TEAM_MVP' || input.designationType === 'ACE') return recognitionCandidates(scope, input);
  if (input.designationType === 'FAN_FAVORITE') return fanFavoriteCandidates(scope, input);
  if (input.designationType === 'ALBATROSS') return albatrossCandidates(scope, input);
  if (input.designationType === 'CORNERSTONE') return cornerstoneCandidates(scope, input);
  if (input.designationType === 'FAN_HOPEFUL') return fanHopefulCandidates(scope, input);
  return [];
}

export function buildFranchiseDesignationMoraleBridgeReport(
  input: FranchiseDesignationMoraleBridgeInput,
): FranchiseDesignationMoraleBridgeReport {
  const blockers = unique([...scopeBlockers(input), ...designationBlockers(input)]);
  const scope: FranchiseDesignationMoraleBridgeScope = hasScope(input)
    ? {
      franchiseId: input.franchiseId,
      seasonId: input.seasonId,
      statsScopeId: input.statsScopeId,
      seasonNumber: input.seasonNumber,
    }
    : {
      franchiseId: input.franchiseId ?? '',
      seasonId: input.seasonId ?? '',
      statsScopeId: input.statsScopeId ?? '',
      seasonNumber: Number.isInteger(input.seasonNumber) ? input.seasonNumber as number : 0,
    };
  const candidates = hasScope(input) ? buildCandidates(scope, input, blockers) : [];

  return {
    contractVersion: FRANCHISE_DESIGNATION_MORALE_BRIDGE_VERSION,
    generatedAt: input.generatedAt ?? Date.now(),
    franchiseId: scope.franchiseId,
    seasonId: scope.seasonId,
    statsScopeId: scope.statsScopeId,
    seasonNumber: scope.seasonNumber,
    designationType: input.designationType,
    triggerKind: input.triggerKind,
    candidates,
    candidateCount: candidates.length,
    blockers,
    limitations: unique([
      'Read-only dynamic designation morale bridge only.',
      'Candidates require existing random-event confirmation before any morale effect can be applied elsewhere.',
      'No storage writes, random-event log persistence, automatic morale mutation, designation persistence, salary movement, relationship mutation, True Value calculation, offseason, generated schedule, or Mode 3 behavior is performed.',
      'Hidden FARM/prospect truth remains blocked from designation morale prompts.',
    ]),
    hiddenSafe: true,
    persistable: false,
    mutable: false,
    automaticMoraleMutationAllowed: false,
    automaticRelationshipMutationAllowed: false,
    automaticProfileMutationAllowed: false,
    designationPersistenceAllowed: false,
    salaryMovementAllowed: false,
    trueValueCalculationAllowed: false,
    mode3OffseasonAllowed: false,
  };
}
