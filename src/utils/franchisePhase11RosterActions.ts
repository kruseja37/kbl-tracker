import * as franchisePlayerStorage from './franchisePlayerStorage';
import * as franchiseFarmStorage from './franchiseFarmStorage';
import * as transactionStorage from './transactionStorage';
import type { FranchiseFarmRecord, FranchiseFarmRosterLevel } from './franchiseFarmStorage';
import type { Player } from './franchisePlayerStorage';
import type { TransactionLogEntry } from './transactionStorage';

export type FranchisePhase11RosterStatus =
  | 'MLB'
  | 'FARM'
  | 'FREE_AGENT'
  | 'RELEASED'
  | 'RETIRED'
  | 'INACTIVE'
  | 'UNASSIGNED'
  | 'UNKNOWN';

export type FranchisePhase11SignTargetStatus = 'MLB' | 'FARM';

export type FranchisePhase11RosterActionErrorCode =
  | 'MISSING_CONTEXT'
  | 'PLAYER_NOT_FOUND'
  | 'PLAYER_NOT_ASSIGNED'
  | 'PLAYER_NOT_AVAILABLE'
  | 'INVALID_ROSTER_STATUS'
  | 'PLAYER_SAVE_FAILED'
  | 'FARM_SAVE_FAILED'
  | 'FARM_DELETE_FAILED'
  | 'TRANSACTION_LOG_FAILED'
  | 'ROLLBACK_FAILED';

export interface FranchisePhase11RosterActionContext {
  franchiseId: string;
  seasonId: string;
  statsScopeId?: string;
  seasonNumber: number;
  offseasonStateId?: string;
  teamId: string;
  playerId: string;
  leagueId?: string;
  actor?: 'SYSTEM' | 'USER';
}

export interface ReleaseFranchisePhase11PlayerInput extends FranchisePhase11RosterActionContext {
  reason?: string;
}

export interface SignFranchisePhase11PlayerInput extends FranchisePhase11RosterActionContext {
  targetRosterStatus: FranchisePhase11SignTargetStatus;
  rosterLevel?: FranchiseFarmRosterLevel;
}

export interface FranchisePhase11RosterActionRollbackStatus {
  attempted: boolean;
  success: boolean;
  errors: string[];
}

export interface FranchisePhase11RosterActionResult {
  success: boolean;
  action: 'release' | 'sign';
  affectedPlayerId: string;
  affectedTeamId: string;
  phaseContext: 'PHASE_11_FINALIZE';
  errorCode?: FranchisePhase11RosterActionErrorCode;
  errorMessage?: string;
  rollbackStatus?: FranchisePhase11RosterActionRollbackStatus;
  player?: Player;
  farmRecord?: FranchiseFarmRecord | null;
  transaction?: TransactionLogEntry;
  transactionId?: string;
}

function playerName(player: Player): string {
  return `${player.firstName ?? ''} ${player.lastName ?? ''}`.trim() || player.id;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error || 'Unknown Phase 11 roster action error');
}

function normalizeRosterStatus(status: unknown): FranchisePhase11RosterStatus {
  if (status === 'MLB' || status === 'FARM' || status === 'FREE_AGENT') return status;
  if (status === 'RELEASED' || status === 'RETIRED' || status === 'INACTIVE' || status === 'UNASSIGNED') return status;
  if (status == null || status === '') return 'UNKNOWN';
  return 'UNKNOWN';
}

function cloneAssignments(player: Player): NonNullable<Player['leagueAssignments']> {
  return (player.leagueAssignments ?? []).map((assignment) => ({ ...assignment }));
}

function findAssignmentIndex(player: Player, teamId: string, leagueId?: string): number {
  return (player.leagueAssignments ?? []).findIndex((assignment) =>
    assignment.teamId === teamId && (!leagueId || assignment.leagueId === leagueId),
  );
}

function findFreeAgentAssignmentIndex(player: Player, leagueId?: string): number {
  return (player.leagueAssignments ?? []).findIndex((assignment) =>
    (normalizeRosterStatus(assignment.rosterStatus) === 'FREE_AGENT' ||
      normalizeRosterStatus(assignment.rosterStatus) === 'UNASSIGNED') &&
    (!leagueId || assignment.leagueId === leagueId),
  );
}

function getAllRosterStatuses(player: Player): FranchisePhase11RosterStatus[] {
  return (player.leagueAssignments ?? []).map((assignment) => normalizeRosterStatus(assignment.rosterStatus));
}

function validateSignableAssignmentState(player: Player): FranchisePhase11RosterActionErrorCode | null {
  const statuses = getAllRosterStatuses(player);
  if (statuses.length === 0) return null;

  if (statuses.every((status) => status === 'FREE_AGENT' || status === 'UNASSIGNED')) {
    return null;
  }

  if (statuses.some((status) => status === 'MLB' || status === 'FARM')) {
    return 'PLAYER_NOT_AVAILABLE';
  }

  return 'INVALID_ROSTER_STATUS';
}

function failureResult(
  action: 'release' | 'sign',
  input: Pick<FranchisePhase11RosterActionContext, 'playerId' | 'teamId'>,
  errorCode: FranchisePhase11RosterActionErrorCode,
  error: unknown,
  rollbackStatus?: FranchisePhase11RosterActionRollbackStatus,
): FranchisePhase11RosterActionResult {
  return {
    success: false,
    action,
    affectedPlayerId: input.playerId,
    affectedTeamId: input.teamId,
    phaseContext: 'PHASE_11_FINALIZE',
    errorCode,
    errorMessage: errorMessage(error),
    rollbackStatus,
  };
}

function validateContext(input: FranchisePhase11RosterActionContext): string | null {
  if (!input.franchiseId || !input.seasonId || !input.teamId || !input.playerId) {
    return 'Phase 11 roster actions require franchiseId, seasonId, teamId, and playerId.';
  }
  if (!Number.isFinite(input.seasonNumber) || input.seasonNumber < 1) {
    return 'Phase 11 roster actions require a positive seasonNumber.';
  }
  if (input.statsScopeId && input.statsScopeId !== input.seasonId) {
    return 'Phase 11 roster actions require statsScopeId to match the canonical seasonId when provided.';
  }
  return null;
}

async function rollbackPhase11Action(params: {
  franchiseId: string;
  seasonId: string;
  teamId: string;
  playerId: string;
  originalPlayer: Player;
  originalFarmRecord: FranchiseFarmRecord | null;
  playerMutated: boolean;
  farmMutated: boolean;
}): Promise<FranchisePhase11RosterActionRollbackStatus> {
  const status: FranchisePhase11RosterActionRollbackStatus = {
    attempted: params.playerMutated || params.farmMutated,
    success: true,
    errors: [],
  };

  if (params.playerMutated) {
    try {
      await franchisePlayerStorage.saveFranchisePlayer(params.franchiseId, params.originalPlayer);
    } catch (error) {
      status.success = false;
      status.errors.push(`player rollback failed: ${errorMessage(error)}`);
    }
  }

  if (params.farmMutated) {
    try {
      if (params.originalFarmRecord) {
        await franchiseFarmStorage.saveFranchiseFarmRecord(params.originalFarmRecord);
      } else {
        await franchiseFarmStorage.deleteFranchiseFarmRecord(
          params.franchiseId,
          params.seasonId,
          params.teamId,
          params.playerId,
        );
      }
    } catch (error) {
      status.success = false;
      status.errors.push(`farm rollback failed: ${errorMessage(error)}`);
    }
  }

  return status;
}

export async function releaseFranchisePhase11Player(
  input: ReleaseFranchisePhase11PlayerInput,
): Promise<FranchisePhase11RosterActionResult> {
  const contextError = validateContext(input);
  if (contextError) return failureResult('release', input, 'MISSING_CONTEXT', contextError);

  const originalPlayer = await franchisePlayerStorage.getFranchisePlayer(input.franchiseId, input.playerId);
  if (!originalPlayer) return failureResult('release', input, 'PLAYER_NOT_FOUND', 'Franchise player was not found.');

  const assignmentIndex = findAssignmentIndex(originalPlayer, input.teamId, input.leagueId);
  if (assignmentIndex < 0) {
    return failureResult('release', input, 'PLAYER_NOT_ASSIGNED', `Player ${input.playerId} is not assigned to ${input.teamId}.`);
  }

  const currentStatus = normalizeRosterStatus(originalPlayer.leagueAssignments?.[assignmentIndex]?.rosterStatus);
  if (currentStatus !== 'MLB' && currentStatus !== 'FARM') {
    return failureResult('release', input, 'INVALID_ROSTER_STATUS', `Only MLB or FARM players can be released in Phase 11; ${input.playerId} is ${currentStatus}.`);
  }

  const originalFarmRecord = await franchiseFarmStorage.getFranchiseFarmRecord(
    input.franchiseId,
    input.seasonId,
    input.teamId,
    input.playerId,
  );

  const assignments = cloneAssignments(originalPlayer);
  assignments[assignmentIndex] = {
    ...assignments[assignmentIndex],
    rosterStatus: 'RELEASED' as never,
  };

  let playerMutated = false;
  let farmMutated = false;
  let failureCode: FranchisePhase11RosterActionErrorCode = 'PLAYER_SAVE_FAILED';

  try {
    const updatedPlayer = await franchisePlayerStorage.saveFranchisePlayer(input.franchiseId, {
      ...originalPlayer,
      leagueAssignments: assignments,
    });
    playerMutated = true;

    if (originalFarmRecord) {
      failureCode = 'FARM_DELETE_FAILED';
      await franchiseFarmStorage.deleteFranchiseFarmRecord(input.franchiseId, input.seasonId, input.teamId, input.playerId);
      farmMutated = true;
    }

    failureCode = 'TRANSACTION_LOG_FAILED';
    const transaction = await transactionStorage.logMode2V1Transaction({
      type: 'release',
      actor: input.actor ?? 'USER',
      season: input.seasonNumber,
      gameNumber: null,
      phase: 'OFFSEASON',
      franchiseId: input.franchiseId,
      seasonId: input.seasonId,
      statsScopeId: input.statsScopeId ?? input.seasonId,
      data: {
        playerId: input.playerId,
        playerName: playerName(updatedPlayer),
        teamId: input.teamId,
        previousRosterStatus: currentStatus,
        rosterMovementPhase: 'PHASE_11_FINALIZE',
        offseasonStateId: input.offseasonStateId,
        reason: input.reason ?? 'Phase 11 roster lock correction',
      },
      previousState: {
        player: originalPlayer,
        farmRecord: originalFarmRecord,
      },
    });

    return {
      success: true,
      action: 'release',
      affectedPlayerId: input.playerId,
      affectedTeamId: input.teamId,
      phaseContext: 'PHASE_11_FINALIZE',
      player: updatedPlayer,
      farmRecord: null,
      transaction,
      transactionId: transaction.id,
    };
  } catch (error) {
    const rollbackStatus = await rollbackPhase11Action({
      franchiseId: input.franchiseId,
      seasonId: input.seasonId,
      teamId: input.teamId,
      playerId: input.playerId,
      originalPlayer,
      originalFarmRecord,
      playerMutated,
      farmMutated,
    });
    return failureResult(
      'release',
      input,
      rollbackStatus.success ? failureCode : 'ROLLBACK_FAILED',
      error,
      rollbackStatus,
    );
  }
}

export async function signFranchisePhase11Player(
  input: SignFranchisePhase11PlayerInput,
): Promise<FranchisePhase11RosterActionResult> {
  const contextError = validateContext(input);
  if (contextError) return failureResult('sign', input, 'MISSING_CONTEXT', contextError);

  const originalPlayer = await franchisePlayerStorage.getFranchisePlayer(input.franchiseId, input.playerId);
  if (!originalPlayer) return failureResult('sign', input, 'PLAYER_NOT_FOUND', 'Franchise player was not found.');

  const signableStateError = validateSignableAssignmentState(originalPlayer);
  if (signableStateError) {
    const statuses = getAllRosterStatuses(originalPlayer);
    return failureResult(
      'sign',
      input,
      signableStateError,
      `Only franchise-owned players with no assignments or only FREE_AGENT/UNASSIGNED assignments can be signed in Phase 11; ${input.playerId} has assignment status ${statuses.join(', ') || 'UNKNOWN'}.`,
    );
  }

  const assignments = cloneAssignments(originalPlayer);
  const targetAssignmentIndex = findAssignmentIndex(originalPlayer, input.teamId, input.leagueId);
  const freeAgentAssignmentIndex = findFreeAgentAssignmentIndex(originalPlayer, input.leagueId);
  const existingIndex = targetAssignmentIndex >= 0 ? targetAssignmentIndex : freeAgentAssignmentIndex;
  const existingAssignment = existingIndex >= 0 ? assignments[existingIndex] : undefined;
  const currentStatus = normalizeRosterStatus(existingAssignment?.rosterStatus);

  if (existingAssignment && currentStatus !== 'FREE_AGENT' && currentStatus !== 'UNASSIGNED') {
    return failureResult('sign', input, 'INVALID_ROSTER_STATUS', `Only franchise-owned FREE_AGENT or UNASSIGNED players can be signed in Phase 11; ${input.playerId} is ${currentStatus}.`);
  }

  const leagueId = input.leagueId ?? existingAssignment?.leagueId ?? originalPlayer.leagueAssignments?.[0]?.leagueId ?? 'franchise';
  const nextAssignment = {
    leagueId,
    teamId: input.teamId,
    rosterStatus: input.targetRosterStatus as never,
  };

  if (existingIndex >= 0) {
    assignments[existingIndex] = {
      ...assignments[existingIndex],
      ...nextAssignment,
    };
  } else {
    assignments.push(nextAssignment);
  }

  const originalFarmRecord = await franchiseFarmStorage.getFranchiseFarmRecord(
    input.franchiseId,
    input.seasonId,
    input.teamId,
    input.playerId,
  );
  if (input.targetRosterStatus === 'MLB' && originalFarmRecord) {
    return failureResult(
      'sign',
      input,
      'INVALID_ROSTER_STATUS',
      `Player ${input.playerId} has a stale franchise farm record for ${input.teamId}; repair or release the farm record before MLB Phase 11 signing.`,
    );
  }

  let playerMutated = false;
  let farmMutated = false;
  let failureCode: FranchisePhase11RosterActionErrorCode = 'PLAYER_SAVE_FAILED';

  try {
    const updatedPlayer = await franchisePlayerStorage.saveFranchisePlayer(input.franchiseId, {
      ...originalPlayer,
      leagueAssignments: assignments,
      ratingRevealState: input.targetRosterStatus === 'MLB' ? 'revealed' : originalPlayer.ratingRevealState,
      ratingRevealedAt: input.targetRosterStatus === 'MLB'
        ? originalPlayer.ratingRevealedAt ?? new Date().toISOString()
        : originalPlayer.ratingRevealedAt,
    });
    playerMutated = true;

    let farmRecord: FranchiseFarmRecord | null = null;
    if (input.targetRosterStatus === 'FARM') {
      failureCode = 'FARM_SAVE_FAILED';
      farmRecord = await franchiseFarmStorage.saveFranchiseFarmRecord({
        franchiseId: input.franchiseId,
        seasonId: input.seasonId,
        seasonNumber: input.seasonNumber,
        teamId: input.teamId,
        playerId: input.playerId,
        rosterLevel: input.rosterLevel ?? originalFarmRecord?.rosterLevel ?? 'AAA',
        optionsUsed: updatedPlayer.optionsUsedBySeason?.[input.seasonId] ?? originalFarmRecord?.optionsUsed ?? 0,
        optionDates: updatedPlayer.optionDatesBySeason?.[input.seasonId] ?? originalFarmRecord?.optionDates ?? [],
        ratingRevealState: updatedPlayer.ratingRevealState ?? originalFarmRecord?.ratingRevealState ?? 'hidden',
        assignedAt: originalFarmRecord?.assignedAt,
      });
      farmMutated = true;
    }

    failureCode = 'TRANSACTION_LOG_FAILED';
    const transaction = await transactionStorage.logMode2V1Transaction({
      type: 'free_agent_signing',
      actor: input.actor ?? 'USER',
      season: input.seasonNumber,
      gameNumber: null,
      phase: 'OFFSEASON',
      franchiseId: input.franchiseId,
      seasonId: input.seasonId,
      statsScopeId: input.statsScopeId ?? input.seasonId,
      data: {
        playerId: input.playerId,
        playerName: playerName(updatedPlayer),
        teamId: input.teamId,
        targetRosterStatus: input.targetRosterStatus,
        rosterLevel: farmRecord?.rosterLevel,
        rosterMovementPhase: 'PHASE_11_FINALIZE',
        offseasonStateId: input.offseasonStateId,
      },
      previousState: {
        player: originalPlayer,
        farmRecord: originalFarmRecord,
      },
    });

    return {
      success: true,
      action: 'sign',
      affectedPlayerId: input.playerId,
      affectedTeamId: input.teamId,
      phaseContext: 'PHASE_11_FINALIZE',
      player: updatedPlayer,
      farmRecord,
      transaction,
      transactionId: transaction.id,
    };
  } catch (error) {
    const rollbackStatus = await rollbackPhase11Action({
      franchiseId: input.franchiseId,
      seasonId: input.seasonId,
      teamId: input.teamId,
      playerId: input.playerId,
      originalPlayer,
      originalFarmRecord,
      playerMutated,
      farmMutated,
    });
    return failureResult(
      'sign',
      input,
      rollbackStatus.success ? failureCode : 'ROLLBACK_FAILED',
      error,
      rollbackStatus,
    );
  }
}
