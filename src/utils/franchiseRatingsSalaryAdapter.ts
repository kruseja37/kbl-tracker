import {
  type FranchiseOffseasonAdapter,
  type FranchiseOffseasonAdapterContext,
  type FranchiseOffseasonAdapterIssue,
  type FranchiseOffseasonAdapterResult,
  type FranchiseOffseasonAdapterValidationReport,
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
  calculatePitcherGrade,
  calculatePositionPlayerGrade,
  calculateTwoWayPlayerGrade,
  type Grade,
} from '../engines/gradeEngine';
import { calculateFranchisePlayerSalary } from './franchiseSalary';

export const FRANCHISE_RATINGS_SALARY_CALCULATION_VERSION = 'franchise-ratings-salary-v1-grade-salary-only';

export interface FranchiseRatingsSalaryAdapterInput {
  apply?: boolean;
  dryRun?: boolean;
  playerIds?: string[];
  includeUnchanged?: boolean;
}

export interface FranchiseRatingsSalarySnapshot {
  playerId: string;
  firstName?: string;
  lastName?: string;
  primaryPosition?: string;
  overallGrade?: string;
  salary?: number;
  ratings: {
    power?: number;
    contact?: number;
    speed?: number;
    fielding?: number;
    arm?: number;
    velocity?: number;
    junk?: number;
    accuracy?: number;
  };
}

export interface FranchiseRatingsSalaryProposal {
  playerId: string;
  changed: boolean;
  before: FranchiseRatingsSalarySnapshot;
  after: FranchiseRatingsSalarySnapshot;
  changes: {
    overallGrade?: { before?: string; after: Grade };
    salary?: { before?: number; after: number };
  };
}

export interface FranchiseRatingsSalaryAdapterData {
  calculationVersion: string;
  method: string;
  proposals: FranchiseRatingsSalaryProposal[];
  changedPlayerIds: string[];
  appliedPlayerIds: string[];
  rollbackStatus?: 'not_needed' | 'rolled_back' | 'rollback_failed';
  rollbackErrors?: Array<{ playerId: string; message: string }>;
}

type CompleteContext = FranchiseOffseasonAdapterContext;

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

function isCompleteContext(
  context: Partial<FranchiseOffseasonAdapterContext>,
): context is CompleteContext {
  return Boolean(
    context.franchiseId &&
      context.seasonId &&
      context.seasonNumber &&
      context.offseasonStateId &&
      context.phase,
  );
}

function isTwoWay(player: Player): boolean {
  return String(player.primaryPosition) === 'TWO-WAY';
}

function isPitcher(player: Player): boolean {
  return ['SP', 'RP', 'CP', 'SP/RP', 'P', 'TWO-WAY'].includes(String(player.primaryPosition));
}

function rating(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function buildSnapshot(
  player: Player,
  overrides: Partial<Pick<Player, 'overallGrade' | 'salary'>> = {},
): FranchiseRatingsSalarySnapshot {
  return {
    playerId: player.id,
    firstName: player.firstName,
    lastName: player.lastName,
    primaryPosition: player.primaryPosition,
    overallGrade: overrides.overallGrade ?? player.overallGrade,
    salary: overrides.salary ?? player.salary,
    ratings: {
      power: player.power,
      contact: player.contact,
      speed: player.speed,
      fielding: player.fielding,
      arm: player.arm,
      velocity: player.velocity,
      junk: player.junk,
      accuracy: player.accuracy,
    },
  };
}

function calculateOverallGrade(player: Player): Grade {
  const positionRatings = {
    power: rating(player.power),
    contact: rating(player.contact),
    speed: rating(player.speed),
    fielding: rating(player.fielding),
    arm: rating(player.arm),
  };
  const pitcherRatings = {
    velocity: rating(player.velocity),
    junk: rating(player.junk),
    accuracy: rating(player.accuracy),
  };

  if (isTwoWay(player)) {
    return calculateTwoWayPlayerGrade(positionRatings, pitcherRatings);
  }

  return isPitcher(player)
    ? calculatePitcherGrade(pitcherRatings)
    : calculatePositionPlayerGrade(positionRatings);
}

export function buildFranchiseRatingsSalaryProposal(
  player: Player,
): FranchiseRatingsSalaryProposal {
  const nextGrade = calculateOverallGrade(player);
  const nextSalary = calculateFranchisePlayerSalary(player);
  const before = buildSnapshot(player);
  const after = buildSnapshot(player, {
    overallGrade: nextGrade,
    salary: nextSalary,
  });
  const changes: FranchiseRatingsSalaryProposal['changes'] = {};

  if (player.overallGrade !== nextGrade) {
    changes.overallGrade = {
      before: player.overallGrade,
      after: nextGrade,
    };
  }

  if (player.salary !== nextSalary) {
    changes.salary = {
      before: player.salary,
      after: nextSalary,
    };
  }

  return {
    playerId: player.id,
    changed: Object.keys(changes).length > 0,
    before,
    after,
    changes,
  };
}

function selectPlayers(
  players: Player[],
  input: FranchiseRatingsSalaryAdapterInput | undefined,
): Player[] {
  if (!input?.playerIds?.length) {
    return players;
  }

  const requested = new Set(input.playerIds);
  return players.filter((player) => requested.has(player.id));
}

function validateRequestedPlayerIds(
  report: FranchiseOffseasonScopeValidationReport,
  context: Partial<FranchiseOffseasonAdapterContext>,
  input: FranchiseRatingsSalaryAdapterInput | undefined,
): void {
  if (!input?.playerIds?.length || !report.scope) {
    return;
  }

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

async function validateRatingsSalaryContext(
  context: Partial<FranchiseOffseasonAdapterContext>,
  input?: FranchiseRatingsSalaryAdapterInput,
): Promise<FranchiseOffseasonScopeValidationReport> {
  const report = await validateFranchiseOffseasonScope(context, {
    requireCurrentPhase: true,
    includeTransitionJournals: true,
  });

  if (context.phase && context.phase !== 'RATINGS_ADJUSTMENTS') {
    report.issues.push(
      makeIssue(
        'OFFSEASON_PHASE_MISMATCH',
        'Ratings/salary recalculation requires the RATINGS_ADJUSTMENTS offseason phase.',
        context,
        { details: { requiredPhase: 'RATINGS_ADJUSTMENTS' } },
      ),
    );
    report.valid = false;
  }

  validateRequestedPlayerIds(report, context, input);

  return report;
}

async function rollbackPlayers(
  context: CompleteContext,
  writtenSnapshots: Player[],
): Promise<Pick<FranchiseRatingsSalaryAdapterData, 'rollbackStatus' | 'rollbackErrors'>> {
  if (writtenSnapshots.length === 0) {
    return { rollbackStatus: 'not_needed' };
  }

  const rollbackErrors: Array<{ playerId: string; message: string }> = [];
  for (const player of [...writtenSnapshots].reverse()) {
    try {
      await saveFranchisePlayer(context.franchiseId, player);
    } catch (error) {
      rollbackErrors.push({
        playerId: player.id,
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return rollbackErrors.length > 0
    ? { rollbackStatus: 'rollback_failed', rollbackErrors }
    : { rollbackStatus: 'rolled_back' };
}

export const franchiseRatingsSalaryRecalculationAdapter: FranchiseOffseasonAdapter<
  FranchiseRatingsSalaryAdapterInput,
  FranchiseRatingsSalaryAdapterData
> = {
  id: 'franchise-ratings-salary-recalculation',
  phase: 'RATINGS_ADJUSTMENTS',
  description: 'Recalculate franchise-owned player overall grades and salaries from current ratings.',
  implemented: true,
  validate: validateRatingsSalaryContext,
  async execute(context, input = {}) {
    const dryRun = input.apply ? false : (input.dryRun ?? context.dryRun ?? true);
    const validation = await validateRatingsSalaryContext(context, input);
    const baseData: FranchiseRatingsSalaryAdapterData = {
      calculationVersion: FRANCHISE_RATINGS_SALARY_CALCULATION_VERSION,
      method: 'Recalculate overallGrade from current app rating weights and salary from salaryCalculator ratings inputs only; raw ratings are unchanged and True Value/performance salary adjustments remain deferred until franchise WAR/value inputs are complete.',
      proposals: [],
      changedPlayerIds: [],
      appliedPlayerIds: [],
      rollbackStatus: dryRun ? 'not_needed' : undefined,
    };

    if (!validation.valid || !validation.scope || !isCompleteContext(context)) {
      return {
        success: false,
        dryRun,
        context,
        issues: validation.issues,
        errorCode: validation.issues.find((issue) => issue.severity === 'error')?.code,
        message: 'Ratings/salary recalculation validation failed.',
        data: baseData,
      };
    }

    const proposals = selectPlayers(validation.scope.players, input)
      .map(buildFranchiseRatingsSalaryProposal)
      .filter((proposal) => input.includeUnchanged || proposal.changed);
    const changedPlayerIds = proposals
      .filter((proposal) => proposal.changed)
      .map((proposal) => proposal.playerId);
    const data: FranchiseRatingsSalaryAdapterData = {
      ...baseData,
      proposals,
      changedPlayerIds,
      method: 'Recalculate overallGrade from current app rating weights and salary from salaryCalculator ratings inputs only; True Value/performance salary adjustments remain deferred until franchise WAR/value inputs are complete.',
    };

    if (dryRun) {
      return {
        success: true,
        dryRun: true,
        context,
        issues: validation.issues,
        data,
        message: 'Dry-run ratings/salary recalculation completed without writes.',
      };
    }

    const playersById = new Map(validation.scope.players.map((player) => [player.id, player]));
    const writtenSnapshots: Player[] = [];

    for (const proposal of proposals.filter((item) => item.changed)) {
      const player = playersById.get(proposal.playerId);
      if (!player) continue;

      try {
        await saveFranchisePlayer(context.franchiseId, {
          ...player,
          overallGrade: proposal.after.overallGrade as Player['overallGrade'],
          salary: proposal.after.salary ?? player.salary,
        });
        writtenSnapshots.push(player);
        data.appliedPlayerIds.push(player.id);
      } catch (error) {
        const rollback = await rollbackPlayers(context, writtenSnapshots);
        const writeIssue = makeIssue(
          'PLAYER_WRITE_FAILED',
          'Failed to save a franchise-owned player during ratings/salary recalculation.',
          context,
          {
            playerId: player.id,
            details: {
              message: error instanceof Error ? error.message : String(error),
            },
          },
        );
        const rollbackIssue = rollback.rollbackStatus === 'rollback_failed'
          ? makeIssue(
              'PLAYER_ROLLBACK_FAILED',
              'One or more franchise player rollback writes failed after ratings/salary recalculation aborted.',
              context,
              { details: { rollbackErrors: rollback.rollbackErrors } },
            )
          : null;

        return {
          success: false,
          dryRun: false,
          context,
          issues: rollbackIssue
            ? [...validation.issues, writeIssue, rollbackIssue]
            : [...validation.issues, writeIssue],
          errorCode: rollbackIssue ? 'PLAYER_ROLLBACK_FAILED' : 'PLAYER_WRITE_FAILED',
          message: rollbackIssue
            ? 'Ratings/salary recalculation failed and rollback needs repair.'
            : 'Ratings/salary recalculation failed and prior writes were restored.',
          data: {
            ...data,
            rollbackStatus: rollback.rollbackStatus,
            rollbackErrors: rollback.rollbackErrors,
          },
        };
      }
    }

    return {
      success: true,
      dryRun: false,
      context,
      issues: validation.issues,
      data: {
        ...data,
        rollbackStatus: 'not_needed',
      },
      message: 'Ratings/salary recalculation applied to franchise-owned players.',
    };
  },
};

export async function runFranchiseRatingsSalaryRecalculation(
  context: Partial<FranchiseOffseasonAdapterContext>,
  input?: FranchiseRatingsSalaryAdapterInput,
): Promise<FranchiseOffseasonAdapterResult<FranchiseRatingsSalaryAdapterData>> {
  return franchiseRatingsSalaryRecalculationAdapter.execute(context, input);
}
