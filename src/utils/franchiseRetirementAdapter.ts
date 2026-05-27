import {
  type FranchiseOffseasonAdapter,
  type FranchiseOffseasonAdapterContext,
  type FranchiseOffseasonAdapterIssue,
  type FranchiseOffseasonAdapterResult,
} from './franchiseOffseasonAdapters';
import {
  validateFranchiseOffseasonScope,
  type FranchiseOffseasonScopeValidationReport,
} from './franchiseOffseasonDataAccess';
import {
  saveFranchisePlayer,
  type Player,
} from './franchisePlayerStorage';
import {
  deleteFranchiseFarmRecord,
  saveFranchiseFarmRecord,
  type FranchiseFarmRecord,
} from './franchiseFarmStorage';
import { logMode2V1Transaction, type TransactionLogEntry } from './transactionStorage';

export const FRANCHISE_RETIREMENT_CALCULATION_VERSION = 'franchise-retirement-v1-age-risk-dry-run';
export const FRANCHISE_RETIREMENT_APPLY_VERSION = 'franchise-retirement-v1-selected-player-apply';
export const FRANCHISE_RETIREMENT_CEREMONY_PROVENANCE_VERSION = 'franchise-retirement-ceremony-v1-reverse-age-roll';

export type FranchiseRetirementRiskBand = 'unknown' | 'low' | 'medium' | 'high' | 'very_high';
export type FranchiseRetirementTrustLevel = 'low' | 'medium' | 'high';
export type FranchiseRetirementApplyStatus = 'not_attempted' | 'applied' | 'failed' | 'rolled_back' | 'rollback_failed';

export interface FranchiseRetirementAdapterInput {
  dryRun?: boolean;
  apply?: boolean;
  playerIds?: string[];
  includeLowRisk?: boolean;
  selectedSource?: 'manual' | 'ceremony';
  ceremonyProvenance?: FranchiseRetirementCeremonyProvenanceInput;
}

export interface FranchiseRetirementCeremonyProvenanceInput {
  methodVersion?: string;
  outcomeType?: 'retiree' | 'no_retirement';
  revealIndex?: number;
  seedNamespace?: string;
  candidatePoolHash?: string;
  seedHash?: string;
  roll?: number;
  revealBucket?: {
    type?: string;
    playerId?: string | null;
  } | null;
  candidateProbability?: number | null;
  selectedPlayerIds?: string[];
  limitations?: string[];
}

export interface FranchiseRetirementCeremonyTransactionProvenance {
  selectedSource: 'ceremony';
  methodVersion: string;
  outcomeType: 'retiree';
  revealIndex: number;
  seedNamespace: string;
  candidatePoolHash: string;
  seedHash: string;
  roll: number;
  revealBucketType: string;
  revealBucketPlayerId?: string | null;
  candidateProbability: number | null;
  selectedPlayerIds: string[];
  limitations: string[];
}

export interface FranchiseRetirementCandidate {
  playerId: string;
  playerName: string;
  teamId?: string;
  rosterStatus: string;
  age?: number;
  seasons?: number;
  salary?: number;
  overallGrade?: string;
  probabilityScore: number | null;
  probabilityBand: FranchiseRetirementRiskBand;
  trustLevel: FranchiseRetirementTrustLevel;
  evidence: string[];
  limitations: string[];
}

export interface FranchiseRetirementAdapterData {
  calculationVersion: string;
  method: string;
  candidates: FranchiseRetirementCandidate[];
  candidatePlayerIds: string[];
  limitations: string[];
  retiredPlayers?: FranchiseRetirementAppliedPlayer[];
  retiredPlayerIds?: string[];
  skippedPlayerIds?: string[];
  rollbackStatus?: FranchiseRetirementApplyStatus;
  rollbackErrors?: Array<{ playerId: string; message: string }>;
}

export interface FranchiseRetirementAppliedPlayer {
  playerId: string;
  playerName: string;
  retiredFromTeamId: string;
  previousRosterStatus: 'MLB' | 'FARM';
  transactionId: string;
  farmRecordRemoved: boolean;
}

function makeIssue(
  code: FranchiseOffseasonAdapterIssue['code'],
  message: string,
  context: Partial<FranchiseOffseasonAdapterContext>,
  details?: Partial<FranchiseOffseasonAdapterIssue>,
): FranchiseOffseasonAdapterIssue {
  return {
    code,
    severity: details?.severity ?? 'error',
    message,
    franchiseId: context.franchiseId,
    seasonId: context.seasonId,
    seasonNumber: context.seasonNumber,
    offseasonStateId: context.offseasonStateId,
    phase: context.phase,
    ...details,
  };
}

function playerName(player: Player): string {
  const name = `${player.firstName ?? ''} ${player.lastName ?? ''}`.trim();
  return name || player.id;
}

function primaryAssignment(player: Player) {
  return (player.leagueAssignments ?? []).find((assignment) =>
    assignment.teamId && assignment.rosterStatus !== 'FREE_AGENT',
  ) ?? (player.leagueAssignments ?? [])[0];
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error || 'Unknown retirement adapter error');
}

function numeric(value: unknown): number | undefined {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function calculateFranchiseRetirementProbability(age: number): number {
  if (age >= 42) return 47;
  if (age >= 41) return 42;
  if (age >= 40) return 38;
  if (age >= 39) return 35;
  if (age >= 38) return 31;
  if (age >= 37) return 27;
  if (age >= 36) return 23;
  if (age >= 35) return 19;
  if (age >= 34) return 16;
  if (age >= 33) return 14;
  if (age >= 32) return 12;
  if (age >= 31) return 10;
  if (age >= 30) return 8;
  if (age >= 29) return 7;
  if (age >= 28) return 6;
  if (age >= 27) return 5;
  if (age >= 26) return 4;
  if (age >= 25) return 3;
  return 2;
}

function riskBand(probability: number | null): FranchiseRetirementRiskBand {
  if (probability === null) return 'unknown';
  if (probability >= 40) return 'very_high';
  if (probability >= 25) return 'high';
  if (probability >= 15) return 'medium';
  return 'low';
}

function trustLevel(age: number | undefined, rosterStatus: string, limitations: string[]): FranchiseRetirementTrustLevel {
  if (limitations.length > 1) return 'low';
  if (age === undefined || rosterStatus === 'UNKNOWN') return 'low';
  if (limitations.length === 1) return 'medium';
  return 'high';
}

function seasonsForPlayer(player: Player): number | undefined {
  const extendedPlayer = player as Player & Record<string, unknown>;
  return numeric(extendedPlayer.seasons) ?? numeric(extendedPlayer.yearsOfService);
}

export function buildFranchiseRetirementCandidate(player: Player): FranchiseRetirementCandidate {
  const assignment = primaryAssignment(player);
  const rosterStatus = String(assignment?.rosterStatus ?? 'UNKNOWN');
  const teamId = assignment?.teamId;
  const age = numeric(player.age);
  const seasons = seasonsForPlayer(player);
  const limitations: string[] = [];
  const evidence: string[] = [];

  if (age === undefined) {
    limitations.push('Missing or invalid age prevents confident retirement risk scoring.');
  } else {
    evidence.push(`Age ${age} maps to the v1 prototype retirement probability curve.`);
  }

  if (!teamId) {
    limitations.push('Missing franchise team assignment limits team-scoped retirement context.');
  } else {
    evidence.push(`Franchise team assignment: ${teamId}.`);
  }

  if (rosterStatus === 'UNKNOWN') {
    limitations.push('Missing or damaged roster status limits retirement context.');
  } else {
    evidence.push(`Roster status: ${rosterStatus}.`);
  }

  if (seasons === undefined) {
    limitations.push('Service/seasons data is unavailable; dry-run does not infer career tenure.');
  } else {
    evidence.push(`${seasons} recorded seasons/service years are available as supporting context.`);
  }

  const probabilityScore = age === undefined ? null : calculateFranchiseRetirementProbability(age);
  const band = riskBand(probabilityScore);

  return {
    playerId: player.id,
    playerName: playerName(player),
    teamId,
    rosterStatus,
    age,
    seasons,
    salary: numeric(player.salary),
    overallGrade: player.overallGrade,
    probabilityScore,
    probabilityBand: band,
    trustLevel: trustLevel(age, rosterStatus, limitations),
    evidence,
    limitations,
  };
}

function selectPlayers(players: Player[], input?: FranchiseRetirementAdapterInput): Player[] {
  if (!input?.playerIds?.length) {
    return players;
  }

  const requested = new Set(input.playerIds);
  return players.filter((player) => requested.has(player.id));
}

function validateRequestedPlayerIds(
  report: FranchiseOffseasonScopeValidationReport,
  context: Partial<FranchiseOffseasonAdapterContext>,
  input?: FranchiseRetirementAdapterInput,
): void {
  if (!input?.playerIds?.length || !report.scope) return;

  const playerIds = new Set(report.scope.players.map((player) => player.id));
  for (const playerId of Array.from(new Set(input.playerIds))) {
    if (!playerIds.has(playerId)) {
      report.issues.push(
        makeIssue(
          'PLAYER_NOT_FOUND',
          `Requested player ${playerId} was not found in franchise-owned player storage.`,
          context,
          { playerId },
        ),
      );
      report.valid = false;
    }
  }
}

async function validateRetirementContext(
  context: Partial<FranchiseOffseasonAdapterContext>,
  input?: FranchiseRetirementAdapterInput,
): Promise<FranchiseOffseasonScopeValidationReport> {
  const report = await validateFranchiseOffseasonScope(context, {
    requireCurrentPhase: true,
    includeTransitionJournals: true,
    ...(input?.apply ? { includeFarmRecords: true } : {}),
  });

  if (context.phase && context.phase !== 'RETIREMENTS') {
    report.issues.push(
      makeIssue(
        'OFFSEASON_PHASE_MISMATCH',
        'Retirement dry-run requires the RETIREMENTS offseason phase.',
        context,
        { details: { requiredPhase: 'RETIREMENTS' } },
      ),
    );
    report.valid = false;
  }

  validateRequestedPlayerIds(report, context, input);
  return report;
}

function buildData(
  players: Player[],
  input?: FranchiseRetirementAdapterInput,
  overrides: Partial<FranchiseRetirementAdapterData> = {},
): FranchiseRetirementAdapterData {
  const candidates = selectPlayers(players, input)
    .map(buildFranchiseRetirementCandidate)
    .filter((candidate) => input?.includeLowRisk || candidate.probabilityBand !== 'low' || candidate.limitations.length > 0)
    .sort((a, b) => (b.probabilityScore ?? -1) - (a.probabilityScore ?? -1));

  return {
    calculationVersion: input?.apply ? FRANCHISE_RETIREMENT_APPLY_VERSION : FRANCHISE_RETIREMENT_CALCULATION_VERSION,
    method: input?.apply
      ? 'Selected-player apply: retire only explicitly selected eligible franchise-owned MLB/FARM players; no random/team-roll ceremony, jersey retirement, narrative, or generated replacement behavior.'
      : 'Dry-run only: age-based v1 retirement risk curve adapted from the existing prototype flow, with service/status data used only as evidence and limitations.',
    candidates,
    candidatePlayerIds: candidates.map((candidate) => candidate.playerId),
    limitations: input?.apply
      ? [
          'Only explicitly selected franchise-owned MLB/FARM players are retired.',
          'This is not the random/team-roll retirement ceremony.',
          'Jersey retirement, narrative/news/milestone side effects, generated filler, free agency, draft, and trade execution are deferred.',
          'Rollback is compensating best-effort restoration, not true cross-store atomicity.',
        ]
      : [
          'No retirement decisions are finalized by this adapter.',
          'No players are removed, retired, or written.',
          'No transactions are logged.',
          'This is not a full retirement probability model with morale, injuries, contract state, or narrative systems.',
        ],
    ...overrides,
  };
}

function rosterStatusForPlayer(player: Player): string {
  return String(primaryAssignment(player)?.rosterStatus ?? 'UNKNOWN');
}

function assignmentIndexForPlayer(player: Player): number {
  const assignments = player.leagueAssignments ?? [];
  const activeIndex = assignments.findIndex((assignment) =>
    assignment.teamId && (assignment.rosterStatus === 'MLB' || assignment.rosterStatus === 'FARM'),
  );
  return activeIndex >= 0 ? activeIndex : 0;
}

function validateApplySelection(
  context: FranchiseOffseasonAdapterContext,
  player: Player,
  teamIds: Set<string>,
): { issue: FranchiseOffseasonAdapterIssue; status?: string; teamId?: string } | null {
  const index = assignmentIndexForPlayer(player);
  const assignment = player.leagueAssignments?.[index];
  const status = String(assignment?.rosterStatus ?? 'UNKNOWN');

  if (status !== 'MLB' && status !== 'FARM') {
    return {
      status,
      teamId: assignment?.teamId,
      issue: makeIssue(
        'PLAYER_STATUS_INVALID',
        `Selected player ${player.id} is not eligible for R1 retirement execution because roster status is ${status}.`,
        context,
        {
          playerId: player.id,
          teamId: assignment?.teamId,
          details: { actualRosterStatus: status },
        },
      ),
    };
  }

  if (!assignment?.teamId || !teamIds.has(assignment.teamId)) {
    return {
      status,
      teamId: assignment?.teamId,
      issue: makeIssue(
        'PLAYER_SCOPE_MISMATCH',
        `Selected player ${player.id} is not assigned to a franchise-owned team in this offseason scope.`,
        context,
        {
          playerId: player.id,
          teamId: assignment?.teamId,
          details: { actualTeamId: assignment?.teamId ?? null },
        },
      ),
    };
  }

  return null;
}

function validateApplyStatsScope(
  context: Partial<FranchiseOffseasonAdapterContext>,
): FranchiseOffseasonAdapterIssue | null {
  if (!context.statsScopeId || context.statsScopeId !== context.seasonId) {
    return makeIssue(
      'STATS_SCOPE_MISMATCH',
      'Franchise retirement apply requires statsScopeId to match the canonical seasonId.',
      context,
      {
        details: {
          expectedStatsScopeId: context.seasonId,
          actualStatsScopeId: context.statsScopeId ?? null,
        },
      },
    );
  }
  return null;
}

function validateCeremonyProvenance(
  context: FranchiseOffseasonAdapterContext,
  selectedIds: string[],
  input: FranchiseRetirementAdapterInput,
): {
  issue?: FranchiseOffseasonAdapterIssue;
  provenance?: FranchiseRetirementCeremonyTransactionProvenance;
  selectedSource: 'manual' | 'ceremony';
} {
  const selectedSource = input.selectedSource === 'ceremony' || input.ceremonyProvenance ? 'ceremony' : 'manual';
  if (selectedSource === 'manual') {
    return { selectedSource };
  }

  const metadata = input.ceremonyProvenance;
  const selectedSet = Array.from(new Set(selectedIds));
  const metadataSelected = Array.from(new Set(metadata?.selectedPlayerIds ?? []));

  const baseDetails = {
    selectedPlayerIds: selectedSet,
    ceremonySelectedPlayerIds: metadataSelected,
  };

  if (!metadata) {
    return {
      selectedSource,
      issue: makeIssue(
        'RETIREMENT_CEREMONY_METADATA_INVALID',
        'Ceremony-selected retirement apply requires ceremony provenance metadata.',
        context,
        { details: baseDetails },
      ),
    };
  }

  const missingFields = [
    ['methodVersion', metadata.methodVersion],
    ['outcomeType', metadata.outcomeType],
    ['revealIndex', metadata.revealIndex],
    ['seedNamespace', metadata.seedNamespace],
    ['candidatePoolHash', metadata.candidatePoolHash],
    ['seedHash', metadata.seedHash],
    ['roll', metadata.roll],
    ['revealBucket.type', metadata.revealBucket?.type],
  ].filter(([, value]) =>
    value === undefined ||
    value === null ||
    (typeof value === 'string' && value.trim().length === 0) ||
    (typeof value === 'number' && !Number.isFinite(value)),
  ).map(([field]) => field);
  if (!metadata.revealBucket?.playerId) {
    missingFields.push('revealBucket.playerId');
  }

  const roll = Number(metadata.roll);
  const candidateProbability = metadata.candidateProbability;
  const invalidFields: string[] = [];
  if (metadata.methodVersion && metadata.methodVersion !== FRANCHISE_RETIREMENT_CEREMONY_PROVENANCE_VERSION) {
    invalidFields.push('methodVersion');
  }
  if (metadata.outcomeType && metadata.outcomeType !== 'retiree') {
    invalidFields.push('outcomeType');
  }
  if (metadata.revealBucket?.type && metadata.revealBucket.type !== 'retiree') {
    invalidFields.push('revealBucket.type');
  }
  if (!Number.isFinite(roll) || roll < 0 || roll > 100) {
    invalidFields.push('roll');
  }
  if (
    candidateProbability !== undefined &&
    candidateProbability !== null &&
    (
      typeof candidateProbability !== 'number' ||
      !Number.isFinite(candidateProbability) ||
      candidateProbability < 0 ||
      candidateProbability > 100
    )
  ) {
    invalidFields.push('candidateProbability');
  }

  if (missingFields.length > 0 || invalidFields.length > 0) {
    return {
      selectedSource,
      issue: makeIssue(
        'RETIREMENT_CEREMONY_METADATA_INVALID',
        'Ceremony provenance metadata is incomplete or not tied to a retiree outcome.',
        context,
        {
          details: {
            ...baseDetails,
            missingFields,
            invalidFields,
            methodVersion: metadata.methodVersion ?? null,
            outcomeType: metadata.outcomeType ?? null,
            revealBucketType: metadata.revealBucket?.type ?? null,
            roll: metadata.roll ?? null,
            candidateProbability: metadata.candidateProbability ?? null,
          },
        },
      ),
    };
  }

  if (
    selectedSet.length !== 1 ||
    metadataSelected.length !== 1 ||
    selectedSet[0] !== metadataSelected[0] ||
    (metadata.revealBucket?.playerId && metadata.revealBucket.playerId !== selectedSet[0])
  ) {
    return {
      selectedSource,
      issue: makeIssue(
        'RETIREMENT_CEREMONY_METADATA_MISMATCH',
        'Ceremony provenance selected player must match the explicit retirement apply selection.',
        context,
        {
          playerId: selectedSet[0],
          details: {
            ...baseDetails,
            revealBucketPlayerId: metadata.revealBucket?.playerId ?? null,
          },
        },
      ),
    };
  }

  return {
    selectedSource,
    provenance: {
      selectedSource: 'ceremony',
      methodVersion: String(metadata.methodVersion),
      outcomeType: 'retiree',
      revealIndex: Number(metadata.revealIndex),
      seedNamespace: String(metadata.seedNamespace),
      candidatePoolHash: String(metadata.candidatePoolHash),
      seedHash: String(metadata.seedHash),
      roll,
      revealBucketType: String(metadata.revealBucket?.type),
      revealBucketPlayerId: metadata.revealBucket?.playerId,
      candidateProbability: typeof metadata.candidateProbability === 'number' && Number.isFinite(metadata.candidateProbability)
        ? metadata.candidateProbability
        : null,
      selectedPlayerIds: metadataSelected,
      limitations: [
        'Ceremony reveal results are not persisted as separate storage.',
        'Ceremony provenance is recorded only on the retirement transaction payload.',
        ...(metadata.limitations ?? []).filter((item): item is string => typeof item === 'string' && item.trim().length > 0),
      ],
    },
  };
}

async function rollbackRetirementWrites(params: {
  context: FranchiseOffseasonAdapterContext;
  playerId: string;
  teamId: string;
  originalPlayer: Player;
  originalFarmRecord: FranchiseFarmRecord | null;
  playerMutated: boolean;
  farmMutated: boolean;
}): Promise<{ rollbackStatus: FranchiseRetirementApplyStatus; rollbackErrors?: Array<{ playerId: string; message: string }> }> {
  if (!params.playerMutated && !params.farmMutated) {
    return { rollbackStatus: 'not_attempted' };
  }

  const rollbackErrors: Array<{ playerId: string; message: string }> = [];

  if (params.farmMutated) {
    try {
      if (params.originalFarmRecord) {
        await saveFranchiseFarmRecord(params.originalFarmRecord);
      } else {
        await deleteFranchiseFarmRecord(
          params.context.franchiseId,
          params.context.seasonId,
          params.teamId,
          params.playerId,
        );
      }
    } catch (error) {
      rollbackErrors.push({
        playerId: params.playerId,
        message: `farm rollback failed: ${errorMessage(error)}`,
      });
    }
  }

  if (params.playerMutated) {
    try {
      await saveFranchisePlayer(params.context.franchiseId, params.originalPlayer);
    } catch (error) {
      rollbackErrors.push({
        playerId: params.playerId,
        message: `player rollback failed: ${errorMessage(error)}`,
      });
    }
  }

  return rollbackErrors.length > 0
    ? { rollbackStatus: 'rollback_failed', rollbackErrors }
    : { rollbackStatus: 'rolled_back' };
}

async function applyRetirementForPlayer(params: {
  context: FranchiseOffseasonAdapterContext;
  player: Player;
  farmRecord: FranchiseFarmRecord | null;
  selectedSource: 'manual' | 'ceremony';
  ceremonyProvenance?: FranchiseRetirementCeremonyTransactionProvenance;
}): Promise<{
  applied?: FranchiseRetirementAppliedPlayer;
  transaction?: TransactionLogEntry;
  issue?: FranchiseOffseasonAdapterIssue;
  rollbackStatus?: FranchiseRetirementApplyStatus;
  rollbackErrors?: Array<{ playerId: string; message: string }>;
}> {
  const { context, player, farmRecord, selectedSource, ceremonyProvenance } = params;
  const assignmentIndex = assignmentIndexForPlayer(player);
  const assignment = player.leagueAssignments?.[assignmentIndex];
  const previousRosterStatus = String(assignment?.rosterStatus ?? 'UNKNOWN') as 'MLB' | 'FARM';
  const teamId = assignment?.teamId ?? '';
  const assignments = (player.leagueAssignments ?? []).map((item, index) =>
    index === assignmentIndex
      ? {
          ...item,
          rosterStatus: 'RETIRED' as never,
          retiredFromTeamId: teamId,
        }
      : item,
  );
  const timestamp = new Date().toISOString();
  const retiredPlayer = {
    ...player,
    leagueAssignments: assignments,
    retiredSeasonId: context.seasonId,
    retiredSeasonNumber: context.seasonNumber,
    retiredAt: timestamp,
    retirementMethodVersion: FRANCHISE_RETIREMENT_APPLY_VERSION,
  } as Player;

  let playerMutated = false;
  let farmMutated = false;
  let failureCode: FranchiseOffseasonAdapterIssue['code'] = 'PLAYER_WRITE_FAILED';
  let failureMessage = 'Failed to save retired franchise player state.';

  try {
    const savedPlayer = await saveFranchisePlayer(context.franchiseId, retiredPlayer);
    playerMutated = true;

    if (previousRosterStatus === 'FARM' && farmRecord) {
      failureCode = 'FARM_CLEANUP_FAILED';
      failureMessage = 'Failed to remove the franchise farm record for a retiring FARM player.';
      await deleteFranchiseFarmRecord(context.franchiseId, context.seasonId, teamId, player.id);
      farmMutated = true;
    }

    failureCode = 'TRANSACTION_LOG_FAILED';
    failureMessage = 'Failed to write the canonical franchise retirement transaction.';
    const transaction = await logMode2V1Transaction({
      type: 'retirement',
      actor: 'USER',
      season: context.seasonNumber,
      gameNumber: null,
      phase: 'OFFSEASON',
      franchiseId: context.franchiseId,
      seasonId: context.seasonId,
      statsScopeId: context.statsScopeId ?? context.seasonId,
      data: {
        playerId: player.id,
        playerName: playerName(player),
        teamId,
        retiredFromTeamId: teamId,
        previousRosterStatus,
        rosterMovementPhase: 'RETIREMENTS',
        offseasonStateId: context.offseasonStateId,
        methodVersion: FRANCHISE_RETIREMENT_APPLY_VERSION,
        selectedSource,
        ...(ceremonyProvenance ? { ceremonyProvenance } : {}),
      },
      previousState: {
        player,
        farmRecord,
      },
    });

    return {
      transaction,
      applied: {
        playerId: savedPlayer.id,
        playerName: playerName(savedPlayer),
        retiredFromTeamId: teamId,
        previousRosterStatus,
        transactionId: transaction.id,
        farmRecordRemoved: Boolean(previousRosterStatus === 'FARM' && farmRecord),
      },
    };
  } catch (error) {
    const rollback = await rollbackRetirementWrites({
      context,
      playerId: player.id,
      teamId,
      originalPlayer: player,
      originalFarmRecord: farmRecord,
      playerMutated,
      farmMutated,
    });

    const rollbackFailed = rollback.rollbackStatus === 'rollback_failed';
    return {
      rollbackStatus: rollback.rollbackStatus,
      rollbackErrors: rollback.rollbackErrors,
      issue: makeIssue(
        rollbackFailed ? 'PLAYER_ROLLBACK_FAILED' : failureCode,
        rollbackFailed
          ? 'Franchise retirement failed and compensating rollback also failed.'
          : failureMessage,
        context,
        {
          playerId: player.id,
          teamId,
          details: {
            message: errorMessage(error),
            previousRosterStatus,
            rollbackStatus: rollback.rollbackStatus,
            rollbackErrors: rollback.rollbackErrors,
          },
        },
      ),
    };
  }
}

export const franchiseRetirementDryRunAdapter: FranchiseOffseasonAdapter<
  FranchiseRetirementAdapterInput,
  FranchiseRetirementAdapterData
> = {
  id: 'franchise-retirement-dry-run',
  phase: 'RETIREMENTS',
  description: 'Dry-run franchise retirement candidate identification from franchise-owned player records.',
  implemented: true,
  validate: validateRetirementContext,
  async execute(context, input = {}) {
    const validation = await validateRetirementContext(context, input);
    const dryRun = input.apply ? false : true;
    const data = buildData(validation.scope?.players ?? [], input, {
      retiredPlayers: [],
      retiredPlayerIds: [],
      skippedPlayerIds: [],
      rollbackStatus: input.apply ? 'not_attempted' : undefined,
    });

    if (input.apply && !input.playerIds?.length) {
      const issue = makeIssue(
        'RETIREMENT_SELECTION_REQUIRED',
        'Franchise retirement apply requires explicit selected player IDs.',
        context,
      );
      return {
        success: false,
        dryRun,
        context,
        issues: [...validation.issues, issue],
        errorCode: 'RETIREMENT_SELECTION_REQUIRED',
        message: 'Retirement apply requires explicit selected players.',
        data,
      };
    }

    if (input.apply) {
      const statsScopeIssue = validateApplyStatsScope(context);
      if (statsScopeIssue) {
        return {
          success: false,
          dryRun,
          context,
          issues: [...validation.issues, statsScopeIssue],
          errorCode: 'STATS_SCOPE_MISMATCH',
          message: 'Retirement apply validation failed.',
          data,
        };
      }
    }

    if (!validation.valid || !validation.scope) {
      return {
        success: false,
        dryRun,
        context,
        issues: validation.issues,
        errorCode: validation.issues.find((issue) => issue.severity === 'error')?.code,
        message: 'Retirement dry-run validation failed.',
        data,
      };
    }

    if (!input.apply) {
      return {
        success: true,
        dryRun,
        context,
        issues: validation.issues,
        data,
        message: 'Retirement dry-run completed without writes.',
      };
    }

    const completeContext = context as FranchiseOffseasonAdapterContext;
    const selectedIds = Array.from(new Set(input.playerIds ?? []));
    const playersById = new Map(validation.scope.players.map((player) => [player.id, player]));
    const teamIds = new Set(validation.scope.teams.map((team) => team.id));
    const farmRecordByPlayerTeam = new Map(
      validation.scope.farmRecords.map((record) => [`${record.playerId}:${record.teamId}`, record]),
    );
    const issues: FranchiseOffseasonAdapterIssue[] = [...validation.issues];
    const appliedPlayers: FranchiseRetirementAppliedPlayer[] = [];
    const skippedPlayerIds: string[] = [];
    let rollbackStatus: FranchiseRetirementApplyStatus = 'not_attempted';
    let rollbackErrors: Array<{ playerId: string; message: string }> | undefined;
    const preparedSelections: Array<{ player: Player; farmRecord: FranchiseFarmRecord | null }> = [];
    const ceremonyValidation = validateCeremonyProvenance(completeContext, selectedIds, input);
    if (ceremonyValidation.issue) {
      issues.push(ceremonyValidation.issue);
    }

    for (const playerId of selectedIds) {
      const player = playersById.get(playerId);
      if (!player) {
        skippedPlayerIds.push(playerId);
        issues.push(
          makeIssue(
            'PLAYER_NOT_FOUND',
            `Requested player ${playerId} was not found in franchise-owned player storage.`,
            completeContext,
            { playerId },
          ),
        );
        continue;
      }

      const eligibility = validateApplySelection(completeContext, player, teamIds);
      if (eligibility) {
        skippedPlayerIds.push(player.id);
        issues.push(eligibility.issue);
        continue;
      }

      const assignment = player.leagueAssignments?.[assignmentIndexForPlayer(player)];
      const farmRecord = assignment?.rosterStatus === 'FARM' && assignment.teamId
        ? farmRecordByPlayerTeam.get(`${player.id}:${assignment.teamId}`) ?? null
        : null;
      if (assignment?.rosterStatus === 'FARM' && !farmRecord) {
        skippedPlayerIds.push(player.id);
        issues.push(
          makeIssue(
            'FARM_RECORD_MISSING',
            `Selected FARM player ${player.id} is missing a matching scoped franchise farm record.`,
            completeContext,
            {
              playerId: player.id,
              teamId: assignment.teamId,
              details: {
                expectedFranchiseId: completeContext.franchiseId,
                expectedSeasonId: completeContext.seasonId,
                expectedTeamId: assignment.teamId,
              },
            },
          ),
        );
        continue;
      }
      preparedSelections.push({ player, farmRecord });
    }

    const prevalidationError = issues.find((issue) => issue.severity === 'error');
    if (prevalidationError) {
      return {
        success: false,
        dryRun: false,
        context,
        issues,
        errorCode: prevalidationError.code,
        message: 'Retirement apply validation failed before writes.',
        data: buildData(validation.scope.players, input, {
          retiredPlayers: [],
          retiredPlayerIds: [],
          skippedPlayerIds,
          rollbackStatus: 'failed',
        }),
      };
    }

    for (const { player, farmRecord } of preparedSelections) {
      const result = await applyRetirementForPlayer({
        context: completeContext,
        player,
        farmRecord,
        selectedSource: ceremonyValidation.selectedSource,
        ceremonyProvenance: ceremonyValidation.provenance,
      });

      if (result.applied) {
        appliedPlayers.push(result.applied);
        continue;
      }

      skippedPlayerIds.push(player.id);
      if (result.issue) {
        issues.push(result.issue);
      }
      rollbackStatus = result.rollbackStatus ?? rollbackStatus;
      rollbackErrors = result.rollbackErrors;
      break;
    }

    const errorIssue = issues.find((issue) => issue.severity === 'error');
    const finalData = buildData(validation.scope.players, input, {
      retiredPlayers: appliedPlayers,
      retiredPlayerIds: appliedPlayers.map((player) => player.playerId),
      skippedPlayerIds,
      rollbackStatus: errorIssue
        ? rollbackStatus === 'not_attempted' ? 'failed' : rollbackStatus
        : 'applied',
      rollbackErrors,
    });

    if (errorIssue) {
      return {
        success: false,
        dryRun: false,
        context,
        issues,
        errorCode: errorIssue.code,
        message: rollbackStatus === 'rollback_failed'
          ? 'Retirement apply failed and rollback needs repair.'
          : 'Retirement apply failed; no additional selected players were processed.',
        data: finalData,
      };
    }

    return {
      success: true,
      dryRun: false,
      context,
      issues: validation.issues,
      data: finalData,
      message: 'Selected franchise retirements applied.',
    };
  },
};

export async function runFranchiseRetirementDryRun(
  context: Partial<FranchiseOffseasonAdapterContext>,
  input?: FranchiseRetirementAdapterInput,
): Promise<FranchiseOffseasonAdapterResult<FranchiseRetirementAdapterData>> {
  return franchiseRetirementDryRunAdapter.execute(context, input);
}
