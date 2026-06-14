import * as franchisePlayerStorage from './franchisePlayerStorage';
import * as franchiseFarmStorage from './franchiseFarmStorage';
import * as transactionStorage from './transactionStorage';
import type { FranchiseFarmRecord, FranchiseFarmRosterLevel } from './franchiseFarmStorage';
import type { Player } from './franchisePlayerStorage';
import type { GamePhase, TransactionLogEntry } from './transactionStorage';
import { V1_MLB_PLAYERS_PER_TEAM } from './leagueBuilderFarmScoutingHandoff';
import {
  FRANCHISE_SEASON_LEDGER_CALCULATION_VERSION,
  getFranchiseSeasonLedgerRow,
  upsertFranchiseSeasonLedgerRow,
} from './franchiseSeasonLedgerStorage';
import {
  calculateFranchiseCurrentSalary,
} from './franchiseSalary';
import { getFranchiseSeasonId } from './franchisePersistenceContract';
import {
  transitionLedgerForCallUp,
  transitionLedgerForDemotion,
} from '../engines/rosterAnalyzer';
import { DEAD_MONEY_RATE } from '../data/rosterEngineConstants';

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
  | 'MLB_ROSTER_CAP_EXCEEDED'
  | 'FARM_RECORD_NOT_FOUND'
  | 'PLAYER_SAVE_FAILED'
  | 'FARM_SAVE_FAILED'
  | 'FARM_DELETE_FAILED'
  | 'SALARY_LEDGER_FAILED'
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

export interface RosterMoveEvent {
  id: string;
  eventType: 'roster-move';
  movementType: FranchiseRosterMovementKind;
  franchiseId: string;
  seasonId: string;
  statsScopeId: string;
  seasonNumber: number;
  teamId: string;
  playerId: string;
  playerName: string;
  sourceRosterStatus: 'MLB' | 'FARM';
  targetRosterStatus: 'MLB' | 'FARM';
  rosterLevel?: FranchiseFarmRosterLevel;
  optionsUsed?: number;
  ratingRevealState?: 'hidden' | 'revealed';
  rosterMovementPhase: FranchiseRosterMovementPhase;
  createdAt: string;
  transactionId?: string;
  moraleMutationApplied: false;
  relationshipMutationApplied: false;
  salaryMovementApplied: boolean;
  mode3HandoffApplied: false;
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
  rosterMoveEvent?: RosterMoveEvent;
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

function normalizeRevealState(value: unknown): 'hidden' | 'revealed' | undefined {
  return value === 'hidden' || value === 'revealed' ? value : undefined;
}

function assignmentMatchesTeam(
  assignment: NonNullable<Player['leagueAssignments']>[number],
  teamId: string,
  leagueId?: string,
): boolean {
  return assignment.teamId === teamId && (!leagueId || assignment.leagueId === leagueId);
}

function rosterStatusForTeam(
  player: Player,
  teamId: string,
  leagueId?: string,
): FranchiseRosterStatus {
  const assignment = (player.leagueAssignments ?? []).find((candidate) =>
    assignmentMatchesTeam(candidate, teamId, leagueId),
  );
  return normalizeRosterStatus(assignment?.rosterStatus);
}

async function validateRosterCapacity(params: {
  franchiseId: string;
  teamId: string;
  leagueId?: string;
  playerId: string;
  movement: FranchiseRosterMovementKind;
}): Promise<{
  eligible: boolean;
  errorCode?: FranchiseRosterMovementErrorCode;
  message?: string;
}> {
  const players = await franchisePlayerStorage.getAllFranchisePlayers(params.franchiseId);
  const otherPlayers = players.filter((player) => player.id !== params.playerId);
  const mlbCount = otherPlayers.filter((player) =>
    rosterStatusForTeam(player, params.teamId, params.leagueId) === 'MLB',
  ).length;
  if (params.movement === 'call_up' && mlbCount >= V1_MLB_PLAYERS_PER_TEAM) {
    return {
      eligible: false,
      errorCode: 'MLB_ROSTER_CAP_EXCEEDED',
      message: `Call-up would exceed the ${V1_MLB_PLAYERS_PER_TEAM}-player MLB roster cap for team ${params.teamId}.`,
    };
  }

  return { eligible: true };
}

function transactionPhaseForMovement(phase: FranchiseRosterMovementPhase | undefined): GamePhase {
  if (phase === 'REGULAR_SEASON') return 'REGULAR_SEASON';
  if (phase === 'POSTSEASON') return 'PLAYOFFS';
  return 'OFFSEASON';
}

function buildRosterMoveEvent(params: {
  movementType: FranchiseRosterMovementKind;
  input: FranchiseRosterMovementInput;
  player: Player;
  sourceRosterStatus: 'MLB' | 'FARM';
  targetRosterStatus: 'MLB' | 'FARM';
  rosterMovementPhase: FranchiseRosterMovementPhase;
  createdAt: string;
  rosterLevel?: FranchiseFarmRosterLevel;
  optionsUsed?: number;
  ratingRevealState?: 'hidden' | 'revealed';
  transactionId?: string;
  salaryMovementApplied?: boolean;
}): RosterMoveEvent {
  return {
    id: [
      'roster-move',
      params.input.franchiseId,
      params.input.seasonId,
      params.input.teamId,
      params.input.playerId,
      params.movementType,
      params.createdAt,
    ].join(':'),
    eventType: 'roster-move',
    movementType: params.movementType,
    franchiseId: params.input.franchiseId,
    seasonId: params.input.seasonId,
    statsScopeId: params.input.statsScopeId ?? params.input.seasonId,
    seasonNumber: params.input.seasonNumber,
    teamId: params.input.teamId,
    playerId: params.input.playerId,
    playerName: playerName(params.player),
    sourceRosterStatus: params.sourceRosterStatus,
    targetRosterStatus: params.targetRosterStatus,
    rosterLevel: params.rosterLevel,
    optionsUsed: params.optionsUsed,
    ratingRevealState: params.ratingRevealState,
    rosterMovementPhase: params.rosterMovementPhase,
    createdAt: params.createdAt,
    transactionId: params.transactionId,
    moraleMutationApplied: false,
    relationshipMutationApplied: false,
    salaryMovementApplied: params.salaryMovementApplied === true,
    mode3HandoffApplied: false,
  };
}

function ledgerScope(input: FranchiseRosterMovementInput): {
  franchiseId: string;
  seasonId: string;
  statsScopeId: string;
} {
  const seasonId = getFranchiseSeasonId(input.franchiseId, input.seasonNumber);
  return {
    franchiseId: input.franchiseId,
    seasonId,
    statsScopeId: input.statsScopeId ?? seasonId,
  };
}

function withSalaryFields(
  player: Player,
  salaryResult: ReturnType<typeof calculateFranchiseCurrentSalary>,
  input: FranchiseRosterMovementInput,
  computedAt: string,
): Player {
  const seasonId = getFranchiseSeasonId(input.franchiseId, input.seasonNumber);
  return {
    ...player,
    salary: salaryResult.salary ?? player.salary,
    salaryCalculationVersion: salaryResult.calculationVersion,
    salarySeasonId: seasonId,
    salaryStatsScopeId: input.statsScopeId ?? seasonId,
    salarySeasonNumber: input.seasonNumber,
    salaryUpdatedAt: computedAt,
    rookieScaleActiveBySeason: {
      ...(player.rookieScaleActiveBySeason ?? {}),
      [seasonId]: true,
    },
    salaryFactors: salaryResult.breakdown
      ? {
          source: salaryResult.source === 'hidden-farm-public-context' ? 'hidden-farm-public-context' : 'multifactor-current-season',
          baseSalary: salaryResult.breakdown.baseSalary,
          positionMultiplier: salaryResult.breakdown.positionMultiplier,
          traitModifier: salaryResult.breakdown.traitModifier,
          ageFactor: salaryResult.breakdown.ageFactor,
          performanceModifier: salaryResult.breakdown.performanceModifier,
          fameModifier: salaryResult.breakdown.fameModifier,
          personalityModifier: salaryResult.breakdown.personalityModifier,
          actualWar: null,
          expectedWar: salaryResult.expectedPerformance?.total ?? null,
          gamesPerSeason: salaryResult.adaptiveStandards.gamesPerSeason,
          inningsPerGame: salaryResult.adaptiveStandards.inningsPerGame,
          rookieScaleActive: true,
        }
      : player.salaryFactors,
  };
}

async function buildCallUpSalaryLedgerUpdate(input: FranchiseRosterMovementInput, player: Player, computedAt: string): Promise<{
  player: Player;
  row: Parameters<typeof upsertFranchiseSeasonLedgerRow>[0];
}> {
  const scope = ledgerScope(input);
  const existing = await getFranchiseSeasonLedgerRow({ ...scope, playerId: input.playerId });
  const transition = transitionLedgerForCallUp(existing, {
    playerId: input.playerId,
    salary: player.salary,
  });
  const salaryPlayer = transition.firstCallUp
    ? withSalaryFields(player, calculateFranchiseCurrentSalary(player, { rookieScaleActive: true }), input, computedAt)
    : {
        ...player,
        salary: transition.entry.salary,
        salarySeasonId: scope.seasonId,
        salaryStatsScopeId: scope.statsScopeId,
        salarySeasonNumber: input.seasonNumber,
        salaryUpdatedAt: computedAt,
        rookieScaleActiveBySeason: {
          ...(player.rookieScaleActiveBySeason ?? {}),
          [scope.seasonId]: true,
        },
      };
  const entry = transition.firstCallUp
    ? transitionLedgerForCallUp(null, {
        playerId: input.playerId,
        salary: salaryPlayer.salary,
      }).entry
    : transition.entry;

  return {
    player: salaryPlayer,
    row: {
      ...scope,
      playerId: input.playerId,
      salary: entry.salary,
      status: entry.status,
      capCharge: entry.capCharge,
      calculationVersion: FRANCHISE_SEASON_LEDGER_CALCULATION_VERSION,
      computedAt,
    },
  };
}

async function applySendDownSalaryLedger(input: FranchiseRosterMovementInput, player: Player, computedAt: string): Promise<void> {
  const scope = ledgerScope(input);
  const existing = await getFranchiseSeasonLedgerRow({ ...scope, playerId: input.playerId });
  const entry = transitionLedgerForDemotion(existing, {
    playerId: input.playerId,
    salary: existing?.salary ?? player.salary,
    deadMoneyRate: DEAD_MONEY_RATE,
  });
  await upsertFranchiseSeasonLedgerRow({
    ...scope,
    playerId: input.playerId,
    salary: entry.salary,
    status: entry.status,
    capCharge: entry.capCharge,
    calculationVersion: FRANCHISE_SEASON_LEDGER_CALCULATION_VERSION,
    computedAt,
  });
}

function buildRosterMovementTransactionId(params: {
  input: FranchiseRosterMovementInput;
  movementType: FranchiseRosterMovementKind;
  createdAt: string;
}): string {
  return [
    'txn',
    'roster-move',
    params.input.franchiseId,
    params.input.seasonId,
    params.input.teamId,
    params.input.playerId,
    params.movementType,
    params.createdAt,
  ]
    .join('_')
    .replace(/[^A-Za-z0-9_-]/g, '_');
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

  const capacity = await validateRosterCapacity({
    franchiseId: input.franchiseId,
    teamId: input.teamId,
    leagueId: input.leagueId,
    playerId: input.playerId,
    movement: 'send_down',
  });
  if (!capacity.eligible) {
    return failureResult(input, capacity.errorCode ?? 'MLB_ROSTER_CAP_EXCEEDED', capacity.message ?? 'Roster cap would be exceeded.');
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
      ratingRevealState: originalPlayer.ratingRevealState ?? 'revealed',
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
      ratingRevealState: updatedPlayer.ratingRevealState ?? 'revealed',
      assignedAt: timestamp,
    });
    farmMutated = true;

    failureCode = 'SALARY_LEDGER_FAILED';
    await applySendDownSalaryLedger(input, updatedPlayer, timestamp);

    failureCode = 'TRANSACTION_LOG_FAILED';
    const rosterMovementPhase = input.rosterMovementPhase ?? 'OFFSEASON';
    const transactionId = buildRosterMovementTransactionId({
      input,
      movementType: 'send_down',
      createdAt: timestamp,
    });
    const rosterMoveEvent = buildRosterMoveEvent({
      movementType: 'send_down',
      input,
      player: updatedPlayer,
      sourceRosterStatus: 'MLB',
      targetRosterStatus: 'FARM',
      rosterMovementPhase,
      createdAt: timestamp,
      rosterLevel: farmRecord.rosterLevel,
      optionsUsed: nextOptions,
      ratingRevealState: normalizeRevealState(farmRecord.ratingRevealState),
      transactionId,
      salaryMovementApplied: true,
    });
    const transaction = await transactionStorage.logMode2V1Transaction({
      id: transactionId,
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
        rosterMoveEvent,
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
      rosterMoveEvent,
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

  const capacity = await validateRosterCapacity({
    franchiseId: input.franchiseId,
    teamId: input.teamId,
    leagueId: input.leagueId,
    playerId: input.playerId,
    movement: 'call_up',
  });
  if (!capacity.eligible) {
    return failureResult(input, capacity.errorCode ?? 'MLB_ROSTER_CAP_EXCEEDED', capacity.message ?? 'MLB roster cap would be exceeded.');
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

    failureCode = 'SALARY_LEDGER_FAILED';
    const callUpSalaryLedger = await buildCallUpSalaryLedgerUpdate(input, updatedPlayer, timestamp);
    const salaryAdjustedPlayer = await franchisePlayerStorage.saveFranchisePlayer(
      input.franchiseId,
      callUpSalaryLedger.player,
    );
    await upsertFranchiseSeasonLedgerRow(callUpSalaryLedger.row);

    failureCode = 'TRANSACTION_LOG_FAILED';
    const rosterMovementPhase = input.rosterMovementPhase ?? 'OFFSEASON';
    const transactionId = buildRosterMovementTransactionId({
      input,
      movementType: 'call_up',
      createdAt: timestamp,
    });
    const rosterMoveEvent = buildRosterMoveEvent({
      movementType: 'call_up',
      input,
      player: salaryAdjustedPlayer,
      sourceRosterStatus: 'FARM',
      targetRosterStatus: 'MLB',
      rosterMovementPhase,
      createdAt: timestamp,
      ratingRevealState: normalizeRevealState(salaryAdjustedPlayer.ratingRevealState),
      transactionId,
      salaryMovementApplied: true,
    });
    const transaction = await transactionStorage.logMode2V1Transaction({
      id: transactionId,
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
        playerName: playerName(salaryAdjustedPlayer),
        teamId: input.teamId,
        sourceTeamId: input.teamId,
        targetTeamId: input.teamId,
        sourceRosterStatus: 'FARM',
        targetRosterStatus: 'MLB',
        ratingRevealState: salaryAdjustedPlayer.ratingRevealState,
        rosterMovementPhase,
        rosterMoveEvent,
      },
    });

    return {
      success: true,
      affectedPlayerId: input.playerId,
      affectedTeamId: input.teamId,
      player: salaryAdjustedPlayer,
      farmRecord: null,
      transaction,
      transactionId: transaction.id,
      rosterMoveEvent,
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
