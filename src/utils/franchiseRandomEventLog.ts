import type { FranchiseNarrativeEventEligibilityReport } from './franchiseNarrativeEventEligibility';
import type { FranchiseStadiumFoundationReport } from './franchiseStadiumFoundation';

export const FRANCHISE_RANDOM_EVENT_LOG_CONTRACT_VERSION =
  'franchise-random-event-log-v1-draft-only';

export type FranchiseRandomEventLogEntryKind =
  | 'gametracker-archive-fact'
  | 'score-only-context'
  | 'performance-gap-context'
  | 'roster-movement-context'
  | 'player-profile-edit-context'
  | 'stadium-spray-context';

export type FranchiseRandomEventLogEntryStatus =
  | 'ready-for-review'
  | 'confirmed-manual-change'
  | 'dismissed'
  | 'blocked';

export type FranchiseRandomEventSuggestedManualChangeTarget =
  | 'none'
  | 'story-note'
  | 'player-profile-review'
  | 'player-morale-draft'
  | 'fan-morale-draft'
  | 'relationship-draft';

export type FranchiseRandomEventEvidenceType =
  | 'gametracker-archive-summary'
  | 'score-only-schedule-summary'
  | 'performance-gap-summary'
  | 'roster-movement-summary'
  | 'player-profile-edit-summary'
  | 'stadium-spray-summary';

export type FranchiseRandomEventEvidenceTargetType =
  | 'team-fan'
  | 'player'
  | 'stadium'
  | 'player-profile'
  | 'none';

export interface FranchiseRandomEventEvidenceReference {
  type: FranchiseRandomEventEvidenceType;
  description: string;
  franchiseId: string;
  seasonId: string;
  statsScopeId: string;
  count: number;
  playerId?: string;
  teamId?: string;
  stadiumId?: string;
  targetType?: FranchiseRandomEventEvidenceTargetType;
  targetId?: string;
  targetPlayerRevealState?: 'hidden' | 'revealed';
  targetPlayerCurrent?: boolean;
  hiddenProspectTruth: false;
  scoreOnlyContextOnly?: boolean;
  archiveBacked?: boolean;
}

export interface FranchiseRandomEventSuggestedManualChange {
  target: FranchiseRandomEventSuggestedManualChangeTarget;
  summary: string;
  requiresUserConfirmation: true;
  automaticProfileMutationAllowed: false;
  automaticMoraleMutationAllowed: false;
  automaticRelationshipMutationAllowed: false;
}

export interface FranchiseRandomEventLogSafeEffectPreview {
  target: FranchiseRandomEventSuggestedManualChangeTarget;
  targetType: FranchiseRandomEventEvidenceTargetType;
  targetId?: string;
  delta: number;
  reason: string;
  source: FranchiseRandomEventEvidenceType;
  requiresUserConfirmation: true;
  automaticProfileMutationAllowed: false;
  automaticMoraleMutationAllowed: false;
  automaticRelationshipMutationAllowed: false;
  automaticStoryPersistenceAllowed: false;
  salaryMovementAllowed: false;
  trueValueMutationAllowed: false;
  designationMutationAllowed: false;
  mode3OffseasonAllowed: false;
}

export interface FranchiseRandomEventManualConfirmation {
  state: 'unconfirmed' | 'confirmed' | 'dismissed';
  checked: boolean;
  checkboxLabel: string;
  confirmedAt?: string;
  actorDisplayName?: string;
  note?: string;
}

export interface FranchiseRandomEventLogEntry {
  id: string;
  contractVersion: typeof FRANCHISE_RANDOM_EVENT_LOG_CONTRACT_VERSION;
  kind: FranchiseRandomEventLogEntryKind;
  status: FranchiseRandomEventLogEntryStatus;
  franchiseId: string;
  seasonId: string;
  statsScopeId: string;
  seasonNumber: number;
  title: string;
  reason: string;
  suggestedManualChange: FranchiseRandomEventSuggestedManualChange;
  safeEffectPreview?: FranchiseRandomEventLogSafeEffectPreview;
  evidenceReferences: FranchiseRandomEventEvidenceReference[];
  confirmation: FranchiseRandomEventManualConfirmation;
  narrativeReadableStatus: string;
  hiddenSafe: true;
  persistable: false;
  mutable: false;
  automaticProfileMutationAllowed: false;
  automaticMoraleMutationAllowed: false;
  automaticRelationshipMutationAllowed: false;
  automaticStoryPersistenceAllowed: false;
  warnings: string[];
  blockers: string[];
}

export interface FranchiseRandomEventLogReport {
  contractVersion: typeof FRANCHISE_RANDOM_EVENT_LOG_CONTRACT_VERSION;
  generatedAt: number;
  franchiseId: string;
  seasonId: string;
  statsScopeId: string;
  seasonNumber: number;
  entries: FranchiseRandomEventLogEntry[];
  readyForReview: number;
  confirmedManualChanges: number;
  dismissed: number;
  blocked: number;
  persistable: false;
  mutable: false;
  automaticProfileMutationAllowed: false;
  automaticMoraleMutationAllowed: false;
  automaticRelationshipMutationAllowed: false;
  automaticStoryPersistenceAllowed: false;
  hiddenSafe: true;
  blockers: string[];
  warnings: string[];
  limitations: string[];
}

export interface BuildFranchiseRandomEventLogInput {
  narrativeEventEligibilityReport: FranchiseNarrativeEventEligibilityReport;
  stadiumFoundationReport?: FranchiseStadiumFoundationReport;
  confirmations?: Record<string, Partial<FranchiseRandomEventManualConfirmation>>;
  generatedAt?: number;
}

interface EventLogScope {
  franchiseId: string;
  seasonId: string;
  statsScopeId: string;
  seasonNumber: number;
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

function entryId(scope: EventLogScope, kind: FranchiseRandomEventLogEntryKind, suffix: string): string {
  return `${scope.franchiseId}:${scope.seasonId}:${scope.statsScopeId}:random-event:${kind}:${suffix}`;
}

function defaultConfirmation(): FranchiseRandomEventManualConfirmation {
  return {
    state: 'unconfirmed',
    checked: false,
    checkboxLabel: 'Manual change completed',
  };
}

function mergeConfirmation(
  confirmation: Partial<FranchiseRandomEventManualConfirmation> | undefined,
): FranchiseRandomEventManualConfirmation {
  const merged = {
    ...defaultConfirmation(),
    ...confirmation,
  };
  if (merged.state === 'confirmed') {
    return { ...merged, checked: true };
  }
  if (merged.state === 'dismissed') {
    return { ...merged, checked: false };
  }
  return { ...merged, state: 'unconfirmed', checked: false };
}

function statusFromConfirmation(
  confirmation: FranchiseRandomEventManualConfirmation,
  blockers: string[],
): FranchiseRandomEventLogEntryStatus {
  if (blockers.length > 0) return 'blocked';
  if (confirmation.state === 'confirmed') return 'confirmed-manual-change';
  if (confirmation.state === 'dismissed') return 'dismissed';
  return 'ready-for-review';
}

function sameScope(left: EventLogScope, right: EventLogScope): boolean {
  return (
    left.franchiseId === right.franchiseId &&
    left.seasonId === right.seasonId &&
    left.statsScopeId === right.statsScopeId &&
    left.seasonNumber === right.seasonNumber
  );
}

function evidence(
  scope: EventLogScope,
  type: FranchiseRandomEventEvidenceType,
  description: string,
  count: number,
  extras: Partial<FranchiseRandomEventEvidenceReference> = {},
): FranchiseRandomEventEvidenceReference {
  return {
    type,
    description,
    franchiseId: scope.franchiseId,
    seasonId: scope.seasonId,
    statsScopeId: scope.statsScopeId,
    count,
    hiddenProspectTruth: false,
    ...extras,
  };
}

function manualChange(
  target: FranchiseRandomEventSuggestedManualChangeTarget,
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

function buildEntry(
  scope: EventLogScope,
  kind: FranchiseRandomEventLogEntryKind,
  suffix: string,
  input: {
    title: string;
    reason: string;
    suggestedManualChange: FranchiseRandomEventSuggestedManualChange;
    evidenceReferences: FranchiseRandomEventEvidenceReference[];
    confirmations?: BuildFranchiseRandomEventLogInput['confirmations'];
    warnings?: string[];
    blockers?: string[];
  },
): FranchiseRandomEventLogEntry {
  const id = entryId(scope, kind, suffix);
  const blockers = unique(input.blockers ?? []);
  const warnings = unique(input.warnings ?? []);
  const confirmation = mergeConfirmation(input.confirmations?.[id]);
  const status = statusFromConfirmation(confirmation, blockers);

  return {
    id,
    contractVersion: FRANCHISE_RANDOM_EVENT_LOG_CONTRACT_VERSION,
    kind,
    status,
    franchiseId: scope.franchiseId,
    seasonId: scope.seasonId,
    statsScopeId: scope.statsScopeId,
    seasonNumber: scope.seasonNumber,
    title: input.title,
    reason: input.reason,
    suggestedManualChange: input.suggestedManualChange,
    evidenceReferences: input.evidenceReferences,
    confirmation,
    narrativeReadableStatus: status === 'confirmed-manual-change'
      ? 'Manual change confirmed; future narrative readers may treat this entry as user-confirmed context.'
      : status === 'dismissed'
        ? 'Dismissed by user; future narrative readers should ignore this suggestion.'
        : status === 'blocked'
          ? 'Blocked; not eligible for random-event log review.'
          : 'Ready for user review; no effects have been applied.',
    hiddenSafe: true,
    persistable: false,
    mutable: false,
    automaticProfileMutationAllowed: false,
    automaticMoraleMutationAllowed: false,
    automaticRelationshipMutationAllowed: false,
    automaticStoryPersistenceAllowed: false,
    warnings,
    blockers,
  };
}

export function buildFranchiseRandomEventLogReport(
  input: BuildFranchiseRandomEventLogInput,
): FranchiseRandomEventLogReport {
  const narrative = input.narrativeEventEligibilityReport;
  const scope: EventLogScope = {
    franchiseId: narrative.franchiseId,
    seasonId: narrative.seasonId,
    statsScopeId: narrative.statsScopeId,
    seasonNumber: narrative.seasonNumber,
  };
  const reportBlockers: string[] = [];
  const reportWarnings: string[] = [];

  if (narrative.scope.status === 'blocked') {
    reportBlockers.push('Narrative/random-event eligibility scope is blocked.');
  }

  if (input.stadiumFoundationReport && !sameScope(scope, input.stadiumFoundationReport.scope)) {
    reportBlockers.push('Stadium foundation report scope does not match narrative/random-event scope.');
  }

  if (narrative.hiddenFarmProspectData.hiddenModifierRows > 0 || narrative.hiddenFarmProspectData.hiddenSafeRows > 0) {
    reportWarnings.push('Unrevealed FARM/prospect hidden truth remains blocked from random-event prompts.');
  }

  const entries: FranchiseRandomEventLogEntry[] = [];
  const canBuildContext = reportBlockers.length === 0;

  if (canBuildContext && narrative.gameTrackerArchiveBackedGames.scopedRows > 0) {
    entries.push(buildEntry(scope, 'gametracker-archive-fact', 'archive-games', {
      title: 'Archive-backed game facts available',
      reason: `${narrative.gameTrackerArchiveBackedGames.scopedRows} scoped GameTracker archive-backed game(s) can support a reviewed event prompt.`,
      suggestedManualChange: manualChange(
        'story-note',
        'Review the archive facts and optionally add a manual story note. Do not auto-edit player profiles or morale.',
      ),
      evidenceReferences: [
        evidence(
          scope,
          'gametracker-archive-summary',
          'Scoped GameTracker archive-backed completed games.',
          narrative.gameTrackerArchiveBackedGames.scopedRows,
          { archiveBacked: true },
        ),
      ],
      confirmations: input.confirmations,
    }));
  }

  if (canBuildContext && narrative.scoreOnlyCompletedGames.scopedRows > 0) {
    entries.push(buildEntry(scope, 'score-only-context', 'score-only-games', {
      title: 'Score-only result context available',
      reason: `${narrative.scoreOnlyCompletedGames.scopedRows} scoped score-only result(s) can be reviewed as team/schedule context only.`,
      suggestedManualChange: manualChange(
        'story-note',
        'Optional team-level note only. Score-only rows may queue team-fan morale review after confirmation, but must not create player-stat, profile, player morale, or relationship changes.',
      ),
      evidenceReferences: [
        evidence(
          scope,
          'score-only-schedule-summary',
          'Score-only completed games are schedule and standings context only.',
          narrative.scoreOnlyCompletedGames.scopedRows,
          { scoreOnlyContextOnly: true },
        ),
      ],
      confirmations: input.confirmations,
      warnings: [
        'Score-only evidence has no player archive, player stats, WPA, WAR, player morale, fame, milestones, awards, designations, relationships, or Game Detail archive authority.',
        'Team-fan morale can change only after Random Event Log confirmation.',
      ],
    }));
  }

  if (canBuildContext && narrative.rosterMovementTransactions.scopedRows > 0) {
    entries.push(buildEntry(scope, 'roster-movement-context', 'roster-movement', {
      title: 'Roster movement context available',
      reason: `${narrative.rosterMovementTransactions.scopedRows} scoped call-up/send-down/trade transaction(s) can support a reviewed prompt.`,
      suggestedManualChange: manualChange(
        'player-morale-draft',
        'If the user wants a morale/relationship effect, create or confirm a separate manual draft. Do not auto-apply it.',
      ),
      evidenceReferences: [
        evidence(
          scope,
          'roster-movement-summary',
          'Scoped roster movement transaction history.',
          narrative.rosterMovementTransactions.scopedRows,
        ),
      ],
      confirmations: input.confirmations,
    }));
  }

  if (canBuildContext && narrative.playerLocalProfileEdits.entries > 0) {
    entries.push(buildEntry(scope, 'player-profile-edit-context', 'profile-edits', {
      title: 'Player-local profile edits available',
      reason: `${narrative.playerLocalProfileEdits.entries} player-local profile edit(s) can support a reviewed context prompt.`,
      suggestedManualChange: manualChange(
        'player-profile-review',
        'Review the player-local edit history before deciding whether any separate story or morale note is warranted.',
      ),
      evidenceReferences: [
        evidence(
          scope,
          'player-profile-edit-summary',
          'Player-local profile edit history.',
          narrative.playerLocalProfileEdits.entries,
        ),
      ],
      confirmations: input.confirmations,
      warnings: [
        'Profile edit history is player-local and separate from official roster movement history.',
      ],
    }));
  }

  const stadiumReport = input.stadiumFoundationReport;
  if (canBuildContext && stadiumReport && sameScope(scope, stadiumReport.scope) && stadiumReport.sprayCharts.summary.rows > 0) {
    entries.push(buildEntry(scope, 'stadium-spray-context', 'stadium-spray', {
      title: 'Stadium spray evidence available',
      reason: `${stadiumReport.sprayCharts.summary.rows} scoped spray row(s) can support a reviewed stadium/trend prompt.`,
      suggestedManualChange: manualChange(
        'story-note',
        'Review stadium spray context and optionally confirm a manual story note. Do not auto-adjust park factors, profiles, or morale.',
      ),
      evidenceReferences: [
        evidence(
          scope,
          'stadium-spray-summary',
          `Archive-backed spray rows: batting ${stadiumReport.sprayCharts.summary.battingRows}, pitching ${stadiumReport.sprayCharts.summary.pitchingRows}, fielding ${stadiumReport.sprayCharts.summary.fieldingRows}.`,
          stadiumReport.sprayCharts.summary.rows,
          { stadiumId: stadiumReport.sprayCharts.summary.stadiumIds[0] },
        ),
      ],
      confirmations: input.confirmations,
      warnings: [
        'Adaptive park factors remain preview-only and are not persisted by random-event log prompts.',
      ],
    }));
  }

  const readyForReview = entries.filter((entry) => entry.status === 'ready-for-review').length;
  const confirmedManualChanges = entries.filter((entry) => entry.status === 'confirmed-manual-change').length;
  const dismissed = entries.filter((entry) => entry.status === 'dismissed').length;
  const blocked = entries.filter((entry) => entry.status === 'blocked').length;

  return {
    contractVersion: FRANCHISE_RANDOM_EVENT_LOG_CONTRACT_VERSION,
    generatedAt: input.generatedAt ?? Date.now(),
    franchiseId: scope.franchiseId,
    seasonId: scope.seasonId,
    statsScopeId: scope.statsScopeId,
    seasonNumber: scope.seasonNumber,
    entries,
    readyForReview,
    confirmedManualChanges,
    dismissed,
    blocked,
    persistable: false,
    mutable: false,
    automaticProfileMutationAllowed: false,
    automaticMoraleMutationAllowed: false,
    automaticRelationshipMutationAllowed: false,
    automaticStoryPersistenceAllowed: false,
    hiddenSafe: true,
    blockers: unique(reportBlockers),
    warnings: unique([
      ...reportWarnings,
      ...entries.flatMap((entry) => entry.warnings),
    ]),
    limitations: [
      'This report is a draft-only log/view model and writes no random-event storage.',
      'Suggested manual changes require user confirmation and do not mutate player profiles, morale, relationships, stories, salary, or park factors.',
      'Score-only rows are schedule/standings context only.',
      'Unrevealed FARM/prospect hidden truth cannot be prompt evidence.',
    ],
  };
}
