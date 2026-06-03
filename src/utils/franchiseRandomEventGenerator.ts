import {
  FRANCHISE_RANDOM_EVENT_LOG_CONTRACT_VERSION,
  type FranchiseRandomEventEvidenceReference,
  type FranchiseRandomEventLogEntry,
  type FranchiseRandomEventLogEntryKind,
  type FranchiseRandomEventLogReport,
  type FranchiseRandomEventManualConfirmation,
  type FranchiseRandomEventSuggestedManualChange,
  type FranchiseRandomEventSuggestedManualChangeTarget,
} from './franchiseRandomEventLog';
import { buildFranchiseFanMoraleGameResultEffects } from './franchiseFanMoraleGameResultFormula';
import type { FranchiseStadiumFoundationReport } from './franchiseStadiumFoundation';

export const FRANCHISE_RANDOM_EVENT_GENERATOR_VERSION =
  'franchise-random-event-generator-v1-deterministic';

export type FranchiseRandomEventTriggerCategory =
  | 'score-only-team-fan-reaction'
  | 'archive-backed-team-fan-reaction'
  | 'archive-backed-player-morale-prompt'
  | 'roster-movement-morale-prompt'
  | 'stadium-spray-story-prompt'
  | 'manual-profile-review-prompt';

export type FranchiseRandomEventTargetType =
  | 'team-fan'
  | 'player'
  | 'stadium'
  | 'player-profile'
  | 'none';

export interface FranchiseRandomEventSafeEffectPreviewMetadata {
  target: FranchiseRandomEventSuggestedManualChangeTarget;
  targetType: FranchiseRandomEventTargetType;
  targetId?: string;
  delta: number;
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

export interface FranchiseRandomEventCandidate {
  id: string;
  generatorVersion: typeof FRANCHISE_RANDOM_EVENT_GENERATOR_VERSION;
  franchiseId: string;
  seasonId: string;
  statsScopeId: string;
  seasonNumber: number;
  seed: string;
  roll: number;
  triggerCategory: FranchiseRandomEventTriggerCategory;
  eventKind: FranchiseRandomEventLogEntryKind;
  title: string;
  targetType: FranchiseRandomEventTargetType;
  targetId?: string;
  evidenceReferences: FranchiseRandomEventEvidenceReference[];
  reason: string;
  suggestedManualChange: FranchiseRandomEventSuggestedManualChange;
  safeEffectPreview: FranchiseRandomEventSafeEffectPreviewMetadata;
  blockers: string[];
  warnings: string[];
  hiddenSafe: true;
}

export interface FranchiseRandomEventGeneratorReport {
  generatorVersion: typeof FRANCHISE_RANDOM_EVENT_GENERATOR_VERSION;
  generatedAt: number;
  franchiseId: string;
  seasonId: string;
  statsScopeId: string;
  seasonNumber: number;
  seed: string;
  candidates: FranchiseRandomEventCandidate[];
  candidateCount: number;
  hiddenSafe: true;
  blockers: string[];
  warnings: string[];
  limitations: string[];
  automaticProfileMutationAllowed: false;
  automaticMoraleMutationAllowed: false;
  automaticRelationshipMutationAllowed: false;
  automaticStoryPersistenceAllowed: false;
}

export interface BuildFranchiseRandomEventCandidatesInput {
  franchiseId: string;
  seasonId: string;
  statsScopeId: string;
  seasonNumber: number;
  seed: string;
  completedGames?: FranchiseRandomEventCompletedGameEvidence[];
  scoreOnlyScheduleRows?: FranchiseRandomEventScheduleEvidence[];
  rosterTransactions?: FranchiseRandomEventTransactionEvidence[];
  players?: FranchiseRandomEventPlayerEvidence[];
  stadiumFoundationReport?: FranchiseStadiumFoundationReport | null;
  moraleSnapshots?: FranchiseRandomEventMoraleSnapshotEvidence[];
  generatedAt?: number;
}

export interface BuildGeneratedFranchiseRandomEventLogReportInput
  extends BuildFranchiseRandomEventCandidatesInput {
  confirmations?: Record<string, Partial<FranchiseRandomEventManualConfirmation>>;
}

interface EventScope {
  franchiseId: string;
  seasonId: string;
  statsScopeId: string;
  seasonNumber: number;
}

export interface FranchiseRandomEventPlayerEvidence {
  id: string;
  franchiseId?: string;
  seasonId?: string;
  statsScopeId?: string;
  seasonNumber?: number;
  firstName?: string;
  lastName?: string;
  ratingRevealState?: 'hidden' | 'revealed';
  leagueAssignments?: Array<{ rosterStatus?: string }>;
  editHistory?: unknown[];
  hiddenPersonalityModifiers?: unknown;
  prospectProfile?: {
    trueGrade?: unknown;
    hiddenScoutTruth?: unknown;
    trueRatings?: unknown;
    hiddenRatingFields?: unknown;
    [key: string]: unknown;
  };
}

export interface FranchiseRandomEventCompletedGameEvidence {
  gameId: string;
  franchiseId?: string;
  seasonId?: string;
  statsScopeId?: string;
  seasonNumber?: number;
  competitionType?: string;
  aggregationStatus?: string;
  awayTeamId: string;
  homeTeamId: string;
  awayTeamName: string;
  homeTeamName: string;
  finalScore: { away: number; home: number };
  playerStats?: Record<string, { playerName?: string; teamId?: string }>;
}

export interface FranchiseRandomEventScheduleEvidence {
  id: string;
  franchiseId?: string;
  seasonId?: string;
  statsScopeId?: string;
  seasonNumber: number;
  gameNumber: number;
  awayTeamId: string;
  homeTeamId: string;
  status: string;
  completionSource?: string;
  result?: {
    awayScore: number;
    homeScore: number;
    winningTeamId: string;
    losingTeamId: string;
  };
}

export interface FranchiseRandomEventTransactionEvidence {
  id: string;
  franchiseId?: string;
  seasonId?: string;
  statsScopeId?: string;
  season: number;
  type: string;
  data: Record<string, unknown>;
  undone?: boolean;
}

export interface FranchiseRandomEventMoraleSnapshotEvidence {
  franchiseId: string;
  seasonId: string;
  statsScopeId: string;
  seasonNumber: number;
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function deterministicRoll(seed: string): number {
  return Number((hashString(seed) / 0xffffffff).toFixed(6));
}

function scopeComplete(scope: EventScope): boolean {
  return Boolean(scope.franchiseId && scope.seasonId && scope.statsScopeId && scope.seasonNumber > 0);
}

function gameInScope(game: FranchiseRandomEventCompletedGameEvidence, scope: EventScope): boolean {
  return (
    game.franchiseId === scope.franchiseId &&
    game.seasonId === scope.seasonId &&
    game.statsScopeId === scope.statsScopeId &&
    game.seasonNumber === scope.seasonNumber &&
    game.competitionType === 'franchise' &&
    game.aggregationStatus !== 'incomplete'
  );
}

function scheduleInScope(game: FranchiseRandomEventScheduleEvidence, scope: EventScope): boolean {
  return (
    game.franchiseId === scope.franchiseId &&
    game.seasonId === scope.seasonId &&
    game.statsScopeId === scope.statsScopeId &&
    game.seasonNumber === scope.seasonNumber &&
    game.status === 'COMPLETED' &&
    game.completionSource === 'score-only'
  );
}

function transactionInScope(entry: FranchiseRandomEventTransactionEvidence, scope: EventScope): boolean {
  return (
    entry.franchiseId === scope.franchiseId &&
    entry.seasonId === scope.seasonId &&
    entry.statsScopeId === scope.statsScopeId &&
    entry.season === scope.seasonNumber &&
    entry.undone !== true
  );
}

function stadiumReportInScope(report: FranchiseStadiumFoundationReport | null | undefined, scope: EventScope): boolean {
  return Boolean(
    report &&
      report.scope.franchiseId === scope.franchiseId &&
      report.scope.seasonId === scope.seasonId &&
      report.scope.statsScopeId === scope.statsScopeId &&
      report.scope.seasonNumber === scope.seasonNumber,
  );
}

function playerName(player: FranchiseRandomEventPlayerEvidence): string {
  return `${player.firstName ?? ''} ${player.lastName ?? ''}`.trim() || player.id;
}

function playerById(players: FranchiseRandomEventPlayerEvidence[]): Map<string, FranchiseRandomEventPlayerEvidence> {
  return new Map(players.map((player) => [player.id, player]));
}

function playerInScope(player: FranchiseRandomEventPlayerEvidence, scope: EventScope): boolean {
  return (
    player.franchiseId === scope.franchiseId &&
    player.seasonId === scope.seasonId &&
    player.statsScopeId === scope.statsScopeId &&
    player.seasonNumber === scope.seasonNumber
  );
}

function isCurrentRevealedPlayer(
  player: FranchiseRandomEventPlayerEvidence | undefined,
): player is FranchiseRandomEventPlayerEvidence {
  if (!player) return false;
  if (player.ratingRevealState === 'hidden') return false;
  return (player.leagueAssignments ?? []).some((assignment) => assignment.rosterStatus === 'MLB');
}

function hasHiddenProspectTruth(player: FranchiseRandomEventPlayerEvidence | undefined): boolean {
  if (!player) return false;
  return Boolean(
    player.ratingRevealState === 'hidden' ||
      player.hiddenPersonalityModifiers ||
      player.prospectProfile?.trueGrade ||
      player.prospectProfile?.hiddenScoutTruth ||
      player.prospectProfile?.trueRatings ||
      player.prospectProfile?.hiddenRatingFields,
  );
}

function evidence(
  scope: EventScope,
  type: FranchiseRandomEventEvidenceReference['type'],
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

function candidate(
  scope: EventScope,
  inputSeed: string,
  triggerCategory: FranchiseRandomEventTriggerCategory,
  eventKind: FranchiseRandomEventLogEntryKind,
  suffix: string,
  input: {
    title: string;
    targetType: FranchiseRandomEventTargetType;
    targetId?: string;
    reason: string;
    suggestedManualChange: FranchiseRandomEventSuggestedManualChange;
    evidenceReferences: FranchiseRandomEventEvidenceReference[];
    safeEffectPreview: Omit<FranchiseRandomEventSafeEffectPreviewMetadata,
      | 'requiresUserConfirmation'
      | 'automaticProfileMutationAllowed'
      | 'automaticMoraleMutationAllowed'
      | 'automaticRelationshipMutationAllowed'
      | 'automaticStoryPersistenceAllowed'
      | 'salaryMovementAllowed'
      | 'trueValueMutationAllowed'
      | 'designationMutationAllowed'
      | 'mode3OffseasonAllowed'
    >;
    warnings?: string[];
    blockers?: string[];
  },
): FranchiseRandomEventCandidate {
  const seed = `${inputSeed}:${triggerCategory}:${suffix}`;
  const id = `${scope.franchiseId}:${scope.seasonId}:${scope.statsScopeId}:random-event:${eventKind}:${triggerCategory}:${suffix}`;
  return {
    id,
    generatorVersion: FRANCHISE_RANDOM_EVENT_GENERATOR_VERSION,
    ...scope,
    seed,
    roll: deterministicRoll(seed),
    triggerCategory,
    eventKind,
    title: input.title,
    targetType: input.targetType,
    targetId: input.targetId,
    evidenceReferences: input.evidenceReferences,
    reason: input.reason,
    suggestedManualChange: input.suggestedManualChange,
    safeEffectPreview: {
      ...input.safeEffectPreview,
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
    blockers: unique(input.blockers ?? []),
    warnings: unique(input.warnings ?? []),
    hiddenSafe: true,
  };
}

function rosterTransactionPlayerIds(entry: FranchiseRandomEventTransactionEvidence): string[] {
  const data = entry.data ?? {};
  const values = [
    data.playerId,
    ...(Array.isArray(data.playerIds) ? data.playerIds : []),
    ...(Array.isArray(data.playersFromSource) ? data.playersFromSource : []),
    ...(Array.isArray(data.playersFromTarget) ? data.playersFromTarget : []),
  ];
  return unique(values.filter((value): value is string => typeof value === 'string'));
}

function buildScoreOnlyCandidates(
  scope: EventScope,
  seed: string,
  rows: FranchiseRandomEventScheduleEvidence[],
): FranchiseRandomEventCandidate[] {
  return rows.flatMap((game) => {
    const formula = buildFranchiseFanMoraleGameResultEffects({
      source: 'score-only',
      gameId: game.id,
      awayTeamId: game.awayTeamId,
      homeTeamId: game.homeTeamId,
      awayScore: game.result?.awayScore ?? Number.NaN,
      homeScore: game.result?.homeScore ?? Number.NaN,
    });
    return formula.effects.map((effectResult) =>
      candidate(scope, seed, 'score-only-team-fan-reaction', 'score-only-context', `${game.id}:${effectResult.teamId}`, {
        title: `Score-only ${effectResult.outcome.replace('-', ' ')} fan reaction`,
        targetType: 'team-fan',
        targetId: effectResult.teamId,
        reason: `Score-only Game ${game.gameNumber}: ${effectResult.reason}`,
        suggestedManualChange: manualChange(
          'fan-morale-draft',
          `Optional team fan morale draft (${effectResult.delta > 0 ? '+' : ''}${effectResult.delta}) only. Score-only rows must not target player morale or player stats.`,
        ),
        evidenceReferences: [
          evidence(scope, 'score-only-schedule-summary', `Score-only Game ${game.gameNumber}: ${game.awayTeamId} ${game.result?.awayScore ?? '—'} at ${game.homeTeamId} ${game.result?.homeScore ?? '—'}.`, 1, {
            teamId: effectResult.teamId,
            scoreOnlyContextOnly: true,
          }),
        ],
        safeEffectPreview: {
          target: 'fan-morale-draft',
          targetType: 'team-fan',
          targetId: effectResult.teamId,
          delta: effectResult.delta,
        },
        warnings: [
          ...formula.limitations,
          'Score-only evidence has no player archive, player stats, WPA, WAR, morale, or relationship authority.',
          'Score-only evidence is schedule/standings context only and cannot target player morale.',
        ],
      }),
    );
  });
}

function buildArchiveTeamCandidates(
  scope: EventScope,
  seed: string,
  games: FranchiseRandomEventCompletedGameEvidence[],
): FranchiseRandomEventCandidate[] {
  return games.flatMap((game) => {
    const formula = buildFranchiseFanMoraleGameResultEffects({
      source: 'gametracker-archive',
      gameId: game.gameId,
      awayTeamId: game.awayTeamId,
      homeTeamId: game.homeTeamId,
      awayTeamName: game.awayTeamName,
      homeTeamName: game.homeTeamName,
      awayScore: game.finalScore.away,
      homeScore: game.finalScore.home,
    });
    return formula.effects.map((effectResult) =>
      candidate(scope, seed, 'archive-backed-team-fan-reaction', 'gametracker-archive-fact', `${game.gameId}:${effectResult.teamId}`, {
        title: `Archive-backed ${effectResult.outcome.replace('-', ' ')} fan reaction`,
        targetType: 'team-fan',
        targetId: effectResult.teamId,
        reason: `Archive-backed ${game.awayTeamName} ${game.finalScore.away} at ${game.homeTeamName} ${game.finalScore.home}: ${effectResult.reason}`,
        suggestedManualChange: manualChange(
          'fan-morale-draft',
          `Optional team fan morale draft (${effectResult.delta > 0 ? '+' : ''}${effectResult.delta}) based on archive-backed game facts. No automatic effect is applied.`,
        ),
        evidenceReferences: [
          evidence(scope, 'gametracker-archive-summary', `Archive-backed completed game ${game.gameId}.`, 1, {
            teamId: effectResult.teamId,
            archiveBacked: true,
          }),
        ],
        safeEffectPreview: {
          target: 'fan-morale-draft',
          targetType: 'team-fan',
          targetId: effectResult.teamId,
          delta: effectResult.delta,
        },
        warnings: formula.limitations,
      }),
    );
  });
}

function buildArchivePlayerCandidates(
  scope: EventScope,
  seed: string,
  games: FranchiseRandomEventCompletedGameEvidence[],
  playersById: Map<string, FranchiseRandomEventPlayerEvidence>,
): FranchiseRandomEventCandidate[] {
  const candidates: FranchiseRandomEventCandidate[] = [];
  for (const game of games) {
    const playerIds = Object.keys(game.playerStats ?? {}).sort();
    const playerId = playerIds.find((id) => isCurrentRevealedPlayer(playersById.get(id)));
    if (!playerId) continue;
    const player = playersById.get(playerId)!;
    candidates.push(candidate(scope, seed, 'archive-backed-player-morale-prompt', 'gametracker-archive-fact', `${game.gameId}:${playerId}`, {
      title: 'Archive-backed revealed player morale prompt',
      targetType: 'player',
      targetId: playerId,
      reason: `${playerName(player)} has archive-backed player stat evidence in completed game ${game.gameId}.`,
      suggestedManualChange: manualChange(
        'player-morale-draft',
        'Optional revealed/current player morale draft based on archive-backed evidence. No automatic effect is applied.',
      ),
      evidenceReferences: [
        evidence(scope, 'gametracker-archive-summary', `Archive-backed player evidence for ${playerName(player)}.`, 1, {
          playerId,
          teamId: game.playerStats?.[playerId]?.teamId,
          archiveBacked: true,
        }),
      ],
      safeEffectPreview: {
        target: 'player-morale-draft',
        targetType: 'player',
        targetId: playerId,
        delta: 1,
      },
    }));
  }
  return candidates;
}

function buildRosterMovementCandidates(
  scope: EventScope,
  seed: string,
  transactions: FranchiseRandomEventTransactionEvidence[],
  playersById: Map<string, FranchiseRandomEventPlayerEvidence>,
): FranchiseRandomEventCandidate[] {
  const candidates: FranchiseRandomEventCandidate[] = [];
  for (const entry of transactions) {
    const playerId = rosterTransactionPlayerIds(entry).find((id) => isCurrentRevealedPlayer(playersById.get(id)));
    if (!playerId) continue;
    const player = playersById.get(playerId)!;
    candidates.push(candidate(scope, seed, 'roster-movement-morale-prompt', 'roster-movement-context', entry.id, {
      title: 'Roster movement context available',
      targetType: 'player',
      targetId: playerId,
      reason: `${entry.type} transaction ${entry.id} can be reviewed as a revealed/current player morale prompt for ${playerName(player)}.`,
      suggestedManualChange: manualChange(
        'player-morale-draft',
        'Optional player morale draft after a scoped roster movement. Do not auto-apply morale or relationship changes.',
      ),
      evidenceReferences: [
        evidence(scope, 'roster-movement-summary', `Scoped ${entry.type} roster transaction.`, 1, {
          playerId,
          teamId: typeof entry.data.teamId === 'string' ? entry.data.teamId : undefined,
        }),
      ],
      safeEffectPreview: {
        target: 'player-morale-draft',
        targetType: 'player',
        targetId: playerId,
        delta: 1,
      },
    }));
  }
  return candidates;
}

function buildStadiumCandidates(
  scope: EventScope,
  seed: string,
  stadiumReport: FranchiseStadiumFoundationReport | null | undefined,
): FranchiseRandomEventCandidate[] {
  if (!stadiumReportInScope(stadiumReport, scope) || !stadiumReport || stadiumReport.sprayCharts.summary.rows <= 0) {
    return [];
  }
  const stadiumId = stadiumReport.sprayCharts.summary.stadiumIds[0] ?? 'unknown-stadium';
  return [candidate(scope, seed, 'stadium-spray-story-prompt', 'stadium-spray-context', stadiumId, {
    title: 'Stadium spray evidence available',
    targetType: 'stadium',
    targetId: stadiumId,
    reason: `${stadiumReport.sprayCharts.summary.rows} scoped spray row(s) can support a reviewed stadium/spray story prompt.`,
    suggestedManualChange: manualChange(
      'story-note',
      'Optional manual story note based on stadium spray context. Do not persist park factors or stories automatically.',
    ),
    evidenceReferences: [
      evidence(scope, 'stadium-spray-summary', `Archive-backed spray rows: batting ${stadiumReport.sprayCharts.summary.battingRows}, pitching ${stadiumReport.sprayCharts.summary.pitchingRows}, fielding ${stadiumReport.sprayCharts.summary.fieldingRows}.`, stadiumReport.sprayCharts.summary.rows, {
        stadiumId,
      }),
    ],
    safeEffectPreview: {
      target: 'story-note',
      targetType: 'stadium',
      targetId: stadiumId,
      delta: 0,
    },
    warnings: [
      'Stadium/spray prompts cannot persist stories, park factors, profile changes, or morale automatically.',
    ],
  })];
}

function buildProfileReviewCandidates(
  scope: EventScope,
  seed: string,
  players: FranchiseRandomEventPlayerEvidence[],
): FranchiseRandomEventCandidate[] {
  return players
    .filter((player) => isCurrentRevealedPlayer(player) && (player.editHistory?.length ?? 0) > 0)
    .map((player) => candidate(scope, seed, 'manual-profile-review-prompt', 'player-profile-edit-context', player.id, {
      title: 'Player-local profile edits available',
      targetType: 'player-profile',
      targetId: player.id,
      reason: `${playerName(player)} has ${player.editHistory?.length ?? 0} player-local profile edit(s) ready for manual review.`,
      suggestedManualChange: manualChange(
        'player-profile-review',
        'Review player-local profile edits before deciding whether any separate manual note is warranted.',
      ),
      evidenceReferences: [
        evidence(scope, 'player-profile-edit-summary', `Player-local profile edit history for ${playerName(player)}.`, player.editHistory?.length ?? 0, {
          playerId: player.id,
        }),
      ],
      safeEffectPreview: {
        target: 'player-profile-review',
        targetType: 'player-profile',
        targetId: player.id,
        delta: 0,
      },
      warnings: [
        'Profile edit history is player-local and does not create official transaction, story, morale, or relationship effects.',
      ],
    }));
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
  const merged = { ...defaultConfirmation(), ...confirmation };
  if (merged.state === 'confirmed') return { ...merged, checked: true };
  if (merged.state === 'dismissed') return { ...merged, checked: false };
  return { ...merged, state: 'unconfirmed', checked: false };
}

function logStatus(
  confirmation: FranchiseRandomEventManualConfirmation,
  blockers: string[],
): FranchiseRandomEventLogEntry['status'] {
  if (blockers.length > 0) return 'blocked';
  if (confirmation.state === 'confirmed') return 'confirmed-manual-change';
  if (confirmation.state === 'dismissed') return 'dismissed';
  return 'ready-for-review';
}

function logEntryFromCandidate(
  candidate: FranchiseRandomEventCandidate,
  confirmations: Record<string, Partial<FranchiseRandomEventManualConfirmation>> | undefined,
): FranchiseRandomEventLogEntry {
  const confirmation = mergeConfirmation(confirmations?.[candidate.id]);
  const status = logStatus(confirmation, candidate.blockers);
  const evidenceReferences = candidate.evidenceReferences.map((reference) => ({
    ...reference,
    targetType: candidate.targetType,
    targetId: candidate.targetId,
    targetPlayerRevealState: candidate.targetType === 'player' ? 'revealed' as const : reference.targetPlayerRevealState,
    targetPlayerCurrent: candidate.targetType === 'player' ? true : reference.targetPlayerCurrent,
  }));
  return {
    id: candidate.id,
    contractVersion: FRANCHISE_RANDOM_EVENT_LOG_CONTRACT_VERSION,
    kind: candidate.eventKind,
    status,
    franchiseId: candidate.franchiseId,
    seasonId: candidate.seasonId,
    statsScopeId: candidate.statsScopeId,
    seasonNumber: candidate.seasonNumber,
    title: candidate.title,
    reason: `${candidate.reason} Roll ${candidate.roll.toFixed(3)} from ${candidate.seed}.`,
    suggestedManualChange: candidate.suggestedManualChange,
    safeEffectPreview: {
      ...candidate.safeEffectPreview,
      reason: candidate.reason,
      source: candidate.evidenceReferences[0]?.type ?? 'gametracker-archive-summary',
    },
    evidenceReferences,
    confirmation,
    narrativeReadableStatus: status === 'confirmed-manual-change'
      ? 'Manual change confirmed; future narrative readers may treat this generated candidate as user-confirmed context.'
      : status === 'dismissed'
        ? 'Dismissed by user; future narrative readers should ignore this generated candidate.'
        : status === 'blocked'
          ? 'Blocked generated candidate; not eligible for random-event log review.'
          : 'Generated candidate ready for user review; no effects have been applied.',
    hiddenSafe: true,
    persistable: false,
    mutable: false,
    automaticProfileMutationAllowed: false,
    automaticMoraleMutationAllowed: false,
    automaticRelationshipMutationAllowed: false,
    automaticStoryPersistenceAllowed: false,
    warnings: candidate.warnings,
    blockers: candidate.blockers,
  };
}

export function buildFranchiseRandomEventCandidates(
  input: BuildFranchiseRandomEventCandidatesInput,
): FranchiseRandomEventGeneratorReport {
  const scope: EventScope = {
    franchiseId: input.franchiseId,
    seasonId: input.seasonId,
    statsScopeId: input.statsScopeId,
    seasonNumber: input.seasonNumber,
  };
  const blockers: string[] = [];
  const warnings: string[] = [];

  if (!scopeComplete(scope)) {
    blockers.push('franchiseId, seasonId, statsScopeId, and positive seasonNumber are required for random-event generation.');
  }

  const players = input.players ?? [];
  const scopedPlayers = players.filter((player) => playerInScope(player, scope));
  const playersById = playerById(scopedPlayers);
  const outOfScopePlayersExcluded = players.length - scopedPlayers.length;
  if (outOfScopePlayersExcluded > 0) {
    warnings.push(`${outOfScopePlayersExcluded} out-of-scope player/profile evidence record(s) were excluded from random-event generation.`);
  }
  const hiddenPlayersExcluded = scopedPlayers.filter(hasHiddenProspectTruth).length;
  if (hiddenPlayersExcluded > 0) {
    warnings.push('Hidden FARM/prospect truth is excluded from generated random-event candidates.');
  }

  const scopedCompletedGames = (input.completedGames ?? [])
    .filter((game) => gameInScope(game, scope))
    .sort((left, right) => left.gameId.localeCompare(right.gameId));
  const scopedScoreOnlyRows = (input.scoreOnlyScheduleRows ?? [])
    .filter((game) => scheduleInScope(game, scope))
    .sort((left, right) => left.id.localeCompare(right.id));
  const scopedTransactions = (input.rosterTransactions ?? [])
    .filter((entry) => transactionInScope(entry, scope))
    .sort((left, right) => left.id.localeCompare(right.id));

  const candidates = blockers.length > 0 ? [] : [
    ...buildScoreOnlyCandidates(scope, input.seed, scopedScoreOnlyRows),
    ...buildArchiveTeamCandidates(scope, input.seed, scopedCompletedGames),
    ...buildArchivePlayerCandidates(scope, input.seed, scopedCompletedGames, playersById),
    ...buildRosterMovementCandidates(scope, input.seed, scopedTransactions, playersById),
    ...buildStadiumCandidates(scope, input.seed, input.stadiumFoundationReport),
    ...buildProfileReviewCandidates(scope, input.seed, scopedPlayers),
  ].sort((left, right) =>
    left.triggerCategory.localeCompare(right.triggerCategory) ||
    left.id.localeCompare(right.id),
  );

  const moraleSnapshotCount = input.moraleSnapshots?.filter((snapshot) =>
    snapshot.franchiseId === scope.franchiseId &&
    snapshot.seasonId === scope.seasonId &&
    snapshot.statsScopeId === scope.statsScopeId &&
    snapshot.seasonNumber === scope.seasonNumber
  ).length ?? 0;
  if (moraleSnapshotCount > 0) {
    warnings.push(`${moraleSnapshotCount} scoped morale snapshot(s) were available as read-only context only.`);
  }

  return {
    generatorVersion: FRANCHISE_RANDOM_EVENT_GENERATOR_VERSION,
    generatedAt: input.generatedAt ?? 0,
    ...scope,
    seed: input.seed,
    candidates,
    candidateCount: candidates.length,
    hiddenSafe: true,
    blockers: unique(blockers),
    warnings: unique([
      ...warnings,
      ...candidates.flatMap((event) => event.warnings),
    ]),
    limitations: [
      'Generator output is candidate-only and does not persist stories, profiles, morale, relationships, salary, designations, park factors, schedules, or offseason state.',
      'Score-only candidates can target team fan morale only.',
      'Player morale candidates require revealed/current player targets.',
      'Hidden FARM/prospect truth is not candidate evidence.',
    ],
    automaticProfileMutationAllowed: false,
    automaticMoraleMutationAllowed: false,
    automaticRelationshipMutationAllowed: false,
    automaticStoryPersistenceAllowed: false,
  };
}

export function franchiseRandomEventCandidatesToLogReport(
  report: FranchiseRandomEventGeneratorReport,
  confirmations?: Record<string, Partial<FranchiseRandomEventManualConfirmation>>,
): FranchiseRandomEventLogReport {
  const entries = report.candidates.map((event) => logEntryFromCandidate(event, confirmations));
  return {
    contractVersion: FRANCHISE_RANDOM_EVENT_LOG_CONTRACT_VERSION,
    generatedAt: report.generatedAt,
    franchiseId: report.franchiseId,
    seasonId: report.seasonId,
    statsScopeId: report.statsScopeId,
    seasonNumber: report.seasonNumber,
    entries,
    readyForReview: entries.filter((entry) => entry.status === 'ready-for-review').length,
    confirmedManualChanges: entries.filter((entry) => entry.status === 'confirmed-manual-change').length,
    dismissed: entries.filter((entry) => entry.status === 'dismissed').length,
    blocked: entries.filter((entry) => entry.status === 'blocked').length,
    persistable: false,
    mutable: false,
    automaticProfileMutationAllowed: false,
    automaticMoraleMutationAllowed: false,
    automaticRelationshipMutationAllowed: false,
    automaticStoryPersistenceAllowed: false,
    hiddenSafe: true,
    blockers: report.blockers,
    warnings: report.warnings,
    limitations: report.limitations,
  };
}

export function buildGeneratedFranchiseRandomEventLogReport(
  input: BuildGeneratedFranchiseRandomEventLogReportInput,
): FranchiseRandomEventLogReport {
  return franchiseRandomEventCandidatesToLogReport(
    buildFranchiseRandomEventCandidates(input),
    input.confirmations,
  );
}
