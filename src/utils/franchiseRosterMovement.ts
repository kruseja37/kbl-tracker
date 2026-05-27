import * as franchisePlayerStorage from './franchisePlayerStorage';
import * as franchiseFarmStorage from './franchiseFarmStorage';
import * as transactionStorage from './transactionStorage';
import type { FranchiseFarmRecord, FranchiseFarmRosterLevel } from './franchiseFarmStorage';
import type { Player } from './franchisePlayerStorage';
import type { GamePhase, TransactionLogEntry } from './transactionStorage';

const MAX_OPTIONS_PER_SEASON = 3;

export type FranchiseRosterMovementPhase =
  | 'REGULAR_SEASON'
  | 'POSTSEASON'
  | 'OFFSEASON'
  | 'PHASE_11_FINALIZE';

export type FranchiseRosterMovementKind = 'call_up' | 'send_down';

export type FranchiseRosterStatus =
  | 'MLB'
  | 'FARM'
  | 'FREE_AGENT'
  | 'RELEASED'
  | 'RETIRED'
  | 'INACTIVE'
  | 'UNASSIGNED'
  | 'UNKNOWN';

export type FranchiseRosterMovementErrorCode =
  | 'PLAYER_NOT_FOUND'
  | 'PLAYER_NOT_ASSIGNED'
  | 'INVALID_ROSTER_STATUS'
  | 'OPTION_LIMIT_EXCEEDED'
  | 'FARM_RECORD_NOT_FOUND'
  | 'PLAYER_SAVE_FAILED'
  | 'FARM_SAVE_FAILED'
  | 'FARM_DELETE_FAILED'
  | 'TRANSACTION_LOG_FAILED'
  | 'ROLLBACK_FAILED';

export interface FranchiseRosterMovementInput {
  franchiseId: string;
  seasonId: string;
  statsScopeId?: string;
  seasonNumber: number;
  teamId: string;
  playerId: string;
  leagueId?: string;
  actor?: 'SYSTEM' | 'USER';
  rosterMovementPhase?: FranchiseRosterMovementPhase;
}

export interface FranchiseSendDownInput extends FranchiseRosterMovementInput {
  rosterLevel?: FranchiseFarmRosterLevel;
}

export interface FranchiseRosterMovementRollbackStatus {
  attempted: boolean;
  success: boolean;
  errors: string[];
}

export interface FranchiseRosterMovementResult {
  success: boolean;
  affectedPlayerId: string;
  affectedTeamId: string;
  errorCode?: FranchiseRosterMovementErrorCode;
  errorMessage?: string;
  rollbackStatus?: FranchiseRosterMovementRollbackStatus;
  player?: Player;
  transaction?: TransactionLogEntry;
  transactionId?: string;
  farmRecord?: FranchiseFarmRecord | null;
}

export interface FranchiseRosterMovementEligibility {
  eligible: boolean;
  errorCode?: FranchiseRosterMovementErrorCode;
  message?: string;
  assignmentIndex: number;
  rosterStatus: FranchiseRosterStatus;
  currentOptions: number;
}

function playerName(player: Player): string {
  return `${player.firstName ?? ''} ${player.lastName ?? ''}`.trim() || player.id;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error || 'Unknown roster movement error');
}

function failureResult(
  input: Pick<FranchiseRosterMovementInput, 'playerId' | 'teamId'>,
  errorCode: FranchiseRosterMovementErrorCode,
  error: unknown,
  rollbackStatus?: FranchiseRosterMovementRollbackStatus,
): FranchiseRosterMovementResult {
  return {
    success: false,
    affectedPlayerId: input.playerId,
    affectedTeamId: input.teamId,
    errorCode,
    errorMessage: errorMessage(error),
    rollbackStatus,
  };
}

function findAssignmentIndex(
  player: Player,
  teamId: string,
  leagueId?: string,
): number {
  return (player.leagueAssignments ?? []).findIndex((assignment) =>
    assignment.teamId === teamId && (!leagueId || assignment.leagueId === leagueId),
  );
}

function cloneAssignments(player: Player): NonNullable<Player['leagueAssignments']> {
  return (player.leagueAssignments ?? []).map((assignment) => ({ ...assignment }));
}

function normalizeRosterStatus(status: unknown): FranchiseRosterStatus {
  if (status === 'MLB' || status === 'FARM' || status === 'FREE_AGENT') return status;
  if (status === 'RELEASED' || status === 'RETIRED' || status === 'INACTIVE' || status === 'UNASSIGNED') return status;
  if (status == null || status === '') return 'UNKNOWN';
  return 'UNKNOWN';
}

function transactionPhaseForMovement(phase: FranchiseRosterMovementPhase | undefined): GamePhase {
  if (phase === 'REGULAR_SEASON') return 'REGULAR_SEASON';
  if (phase === 'POSTSEASON') return 'PLAYOFFS';
  return 'OFFSEASON';
}

export function validateFranchiseRosterMovementEligibility(params: {
  player: Player | null;
  movement: FranchiseRosterMovementKind;
  teamId: string;
  leagueId?: string;
  seasonId: string;
  farmRecord?: FranchiseFarmRecord | null;
}): FranchiseRosterMovementEligibility {
  if (!params.player) {
    return {
      eligible: false,
      errorCode: 'PLAYER_NOT_FOUND',
      message: 'Franchise player was not found.',
      assignmentIndex: -1,
      rosterStatus: 'UNKNOWN',
      currentOptions: 0,
    };
  }

  const assignmentIndex = findAssignmentIndex(params.player, params.teamId, params.leagueId);
  if (assignmentIndex < 0) {
    return {
      eligible: false,
      errorCode: 'PLAYER_NOT_ASSIGNED',
      message: `Player ${params.player.id} is not assigned to team ${params.teamId} in this franchise.`,
      assignmentIndex,
      rosterStatus: 'UNASSIGNED',
      currentOptions: params.player.optionsUsedBySeason?.[params.seasonId] ?? 0,
    };
  }

  const assignment = params.player.leagueAssignments?.[assignmentIndex];
  const rosterStatus = normalizeRosterStatus(assignment?.rosterStatus);
  const currentOptions = params.player.optionsUsedBySeason?.[params.seasonId] ?? 0;

  if (params.movement === 'send_down') {
    if (currentOptions >= MAX_OPTIONS_PER_SEASON) {
      return {
        eligible: false,
        errorCode: 'OPTION_LIMIT_EXCEEDED',
        message: `Player ${params.player.id} has already used ${MAX_OPTIONS_PER_SEASON} options for ${params.seasonId}.`,
        assignmentIndex,
        rosterStatus,
        currentOptions,
      };
    }

    if (rosterStatus !== 'MLB' && rosterStatus !== 'UNKNOWN') {
      return {
        eligible: false,
        errorCode: 'INVALID_ROSTER_STATUS',
        message: `Player ${params.player.id} cannot be sent down from roster status ${rosterStatus}.`,
        assignmentIndex,
        rosterStatus,
        currentOptions,
      };
    }
  }

  if (params.movement === 'call_up') {
    const hasFarmRecord = Boolean(params.farmRecord);
    if (rosterStatus !== 'FARM' && !(rosterStatus === 'UNKNOWN' && hasFarmRecord)) {
      return {
        eligible: false,
        errorCode: 'INVALID_ROSTER_STATUS',
        message: `Player ${params.player.id} cannot be called up from roster status ${rosterStatus}.`,
        assignmentIndex,
        rosterStatus,
        currentOptions,
      };
    }

    if (!hasFarmRecord) {
      return {
        eligible: false,
        errorCode: 'FARM_RECORD_NOT_FOUND',
        message: `Farm record not found for player ${params.player.id} in ${params.seasonId}.`,
        assignmentIndex,
        rosterStatus,
        currentOptions,
      };
    }
  }

  return {
    eligible: true,
    assignmentIndex,
    rosterStatus,
    currentOptions,
  };
}

async function rollbackRosterMovement(params: {
  franchiseId: string;
  seasonId: string;
  teamId: string;
  playerId: string;
  originalPlayer: Player;
  originalFarmRecord: FranchiseFarmRecord | null;
  playerMutated: boolean;
  farmMutated: boolean;
}): Promise<FranchiseRosterMovementRollbackStatus> {
  const status: FranchiseRosterMovementRollbackStatus = {
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

export async function sendDownFranchisePlayer(
  input: FranchiseSendDownInput,
): Promise<FranchiseRosterMovementResult> {
  const originalPlayer = await franchisePlayerStorage.getFranchisePlayer(input.franchiseId, input.playerId);
  const originalFarmRecord = await franchiseFarmStorage.getFranchiseFarmRecord(
    input.franchiseId,
    input.seasonId,
    input.teamId,
    input.playerId,
  );
  const eligibility = validateFranchiseRosterMovementEligibility({
    player: originalPlayer,
    movement: 'send_down',
    teamId: input.teamId,
    leagueId: input.leagueId,
    seasonId: input.seasonId,
    farmRecord: originalFarmRecord,
  });

  if (!eligibility.eligible || !originalPlayer) {
    return failureResult(input, eligibility.errorCode ?? 'INVALID_ROSTER_STATUS', eligibility.message ?? 'Player is not eligible for send-down.');
  }

  const timestamp = new Date().toISOString();
  const assignments = cloneAssignments(originalPlayer);
  assignments[eligibility.assignmentIndex] = {
    ...assignments[eligibility.assignmentIndex],
    rosterStatus: 'FARM',
  };

  const nextOptions = eligibility.currentOptions + 1;
  const optionDates = [
    ...(originalPlayer.optionDatesBySeason?.[input.seasonId] ?? []),
    timestamp,
  ];

  let playerMutated = false;
  let farmMutated = false;
  let failureCode: FranchiseRosterMovementErrorCode = 'PLAYER_SAVE_FAILED';

  try {
    const updatedPlayer = await franchisePlayerStorage.saveFranchisePlayer(input.franchiseId, {
      ...originalPlayer,
      leagueAssignments: assignments,
      optionsUsedBySeason: {
        ...(originalPlayer.optionsUsedBySeason ?? {}),
        [input.seasonId]: nextOptions,
      },
      optionDatesBySeason: {
        ...(originalPlayer.optionDatesBySeason ?? {}),
        [input.seasonId]: optionDates,
      },
    });
    playerMutated = true;

    failureCode = 'FARM_SAVE_FAILED';
    const farmRecord = await franchiseFarmStorage.saveFranchiseFarmRecord({
      franchiseId: input.franchiseId,
      seasonId: input.seasonId,
      seasonNumber: input.seasonNumber,
      teamId: input.teamId,
      playerId: input.playerId,
      rosterLevel: input.rosterLevel ?? originalFarmRecord?.rosterLevel ?? 'AAA',
      optionsUsed: nextOptions,
      optionDates,
      ratingRevealState: updatedPlayer.ratingRevealState ?? 'hidden',
      assignedAt: timestamp,
    });
    farmMutated = true;

    failureCode = 'TRANSACTION_LOG_FAILED';
    const rosterMovementPhase = input.rosterMovementPhase ?? 'OFFSEASON';
    const transaction = await transactionStorage.logMode2V1Transaction({
      type: 'send_down',
      actor: input.actor ?? 'USER',
      season: input.seasonNumber,
      gameNumber: null,
      phase: transactionPhaseForMovement(rosterMovementPhase),
      franchiseId: input.franchiseId,
      seasonId: input.seasonId,
      statsScopeId: input.statsScopeId ?? input.seasonId,
      data: {
        movementType: 'send_down',
        playerId: input.playerId,
        playerIds: [input.playerId],
        playerName: playerName(updatedPlayer),
        teamId: input.teamId,
        sourceTeamId: input.teamId,
        targetTeamId: input.teamId,
        sourceRosterStatus: 'MLB',
        targetRosterStatus: 'FARM',
        rosterLevel: farmRecord.rosterLevel,
        optionsUsed: nextOptions,
        rosterMovementPhase,
      },
    });

    return {
      success: true,
      affectedPlayerId: input.playerId,
      affectedTeamId: input.teamId,
      player: updatedPlayer,
      farmRecord,
      transaction,
      transactionId: transaction.id,
    };
  } catch (error) {
    const rollbackStatus = await rollbackRosterMovement({
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
      input,
      rollbackStatus.success ? failureCode : 'ROLLBACK_FAILED',
      error,
      rollbackStatus,
    );
  }
}

export async function callUpFranchisePlayer(
  input: FranchiseRosterMovementInput,
): Promise<FranchiseRosterMovementResult> {
  const originalPlayer = await franchisePlayerStorage.getFranchisePlayer(input.franchiseId, input.playerId);
  const originalFarmRecord = await franchiseFarmStorage.getFranchiseFarmRecord(
    input.franchiseId,
    input.seasonId,
    input.teamId,
    input.playerId,
  );
  const eligibility = validateFranchiseRosterMovementEligibility({
    player: originalPlayer,
    movement: 'call_up',
    teamId: input.teamId,
    leagueId: input.leagueId,
    seasonId: input.seasonId,
    farmRecord: originalFarmRecord,
  });

  if (!eligibility.eligible || !originalPlayer) {
    return failureResult(input, eligibility.errorCode ?? 'INVALID_ROSTER_STATUS', eligibility.message ?? 'Player is not eligible for call-up.');
  }

  const timestamp = new Date().toISOString();
  const assignments = cloneAssignments(originalPlayer);
  assignments[eligibility.assignmentIndex] = {
    ...assignments[eligibility.assignmentIndex],
    rosterStatus: 'MLB',
  };

  let playerMutated = false;
  let farmMutated = false;
  let failureCode: FranchiseRosterMovementErrorCode = 'PLAYER_SAVE_FAILED';

  try {
    const updatedPlayer = await franchisePlayerStorage.saveFranchisePlayer(input.franchiseId, {
      ...originalPlayer,
      leagueAssignments: assignments,
      ratingRevealState: 'revealed',
      ratingRevealedAt: originalPlayer.ratingRevealedAt ?? timestamp,
    });
    playerMutated = true;

    failureCode = 'FARM_DELETE_FAILED';
    await franchiseFarmStorage.deleteFranchiseFarmRecord(input.franchiseId, input.seasonId, input.teamId, input.playerId);
    farmMutated = true;

    failureCode = 'TRANSACTION_LOG_FAILED';
    const rosterMovementPhase = input.rosterMovementPhase ?? 'OFFSEASON';
    const transaction = await transactionStorage.logMode2V1Transaction({
      type: 'call_up',
      actor: input.actor ?? 'USER',
      season: input.seasonNumber,
      gameNumber: null,
      phase: transactionPhaseForMovement(rosterMovementPhase),
      franchiseId: input.franchiseId,
      seasonId: input.seasonId,
      statsScopeId: input.statsScopeId ?? input.seasonId,
      data: {
        movementType: 'call_up',
        playerId: input.playerId,
        playerIds: [input.playerId],
        playerName: playerName(updatedPlayer),
        teamId: input.teamId,
        sourceTeamId: input.teamId,
        targetTeamId: input.teamId,
        sourceRosterStatus: 'FARM',
        targetRosterStatus: 'MLB',
        ratingRevealState: updatedPlayer.ratingRevealState,
        rosterMovementPhase,
      },
    });

    return {
      success: true,
      affectedPlayerId: input.playerId,
      affectedTeamId: input.teamId,
      player: updatedPlayer,
      farmRecord: null,
      transaction,
      transactionId: transaction.id,
    };
  } catch (error) {
    const rollbackStatus = await rollbackRosterMovement({
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
      input,
      rollbackStatus.success ? failureCode : 'ROLLBACK_FAILED',
      error,
      rollbackStatus,
    );
  }
}
