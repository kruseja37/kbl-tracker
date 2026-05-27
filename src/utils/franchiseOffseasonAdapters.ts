import {
  OFFSEASON_PHASES,
  type OffseasonPhase,
} from './offseasonStorage';

export type FranchiseOffseasonAdapterPhase = OffseasonPhase;

export type FranchiseOffseasonAdapterIssueSeverity = 'error' | 'warning' | 'info';

export type FranchiseOffseasonAdapterIssueCode =
  | 'MISSING_FRANCHISE_ID'
  | 'MISSING_SEASON_ID'
  | 'MISSING_STATS_SCOPE_ID'
  | 'STATS_SCOPE_MISMATCH'
  | 'MISSING_SEASON_NUMBER'
  | 'MISSING_OFFSEASON_STATE_ID'
  | 'MISSING_PHASE'
  | 'INVALID_PHASE'
  | 'OFFSEASON_STATE_NOT_FOUND'
  | 'OFFSEASON_STATE_ID_MISMATCH'
  | 'OFFSEASON_FRANCHISE_MISMATCH'
  | 'OFFSEASON_SEASON_MISMATCH'
  | 'OFFSEASON_PHASE_MISMATCH'
  | 'PHASE_ALREADY_COMPLETE'
  | 'PLAYER_NOT_FOUND'
  | 'TEAM_NOT_FOUND'
  | 'PROTECTED_TEAM_NOT_FOUND'
  | 'PROTECTED_PLAYER_NOT_FOUND'
  | 'PROTECTED_PLAYER_TEAM_MISMATCH'
  | 'PROTECTED_PLAYER_STATUS_INVALID'
  | 'SEASON_SUMMARY_MISSING'
  | 'SEASON_SUMMARY_SCOPE_MISMATCH'
  | 'FARM_RECORD_SCOPE_MISMATCH'
  | 'FARM_RECORD_MISSING'
  | 'FARM_RECORD_LOAD_FAILED'
  | 'FARM_RECORD_PLAYER_MISSING'
  | 'FARM_RECORD_TEAM_MISSING'
  | 'FARM_RECORD_STATUS_MISMATCH'
  | 'PHASE_11_LOCK_FAILED'
  | 'TRANSITION_ATTENTION_REQUIRED'
  | 'PLAYER_WRITE_FAILED'
  | 'PLAYER_ROLLBACK_FAILED'
  | 'RETIREMENT_SELECTION_REQUIRED'
  | 'RETIREMENT_CEREMONY_METADATA_INVALID'
  | 'RETIREMENT_CEREMONY_METADATA_MISMATCH'
  | 'PLAYER_STATUS_INVALID'
  | 'PLAYER_SCOPE_MISMATCH'
  | 'FARM_CLEANUP_FAILED'
  | 'TRANSACTION_LOG_FAILED'
  | 'ADAPTER_NOT_IMPLEMENTED'
  | 'TRADE_TEAM_NOT_FOUND'
  | 'TRADE_TEAM_MATCH_INVALID'
  | 'TRADE_PLAYER_NOT_FOUND'
  | 'TRADE_PLAYER_TEAM_MISMATCH'
  | 'TRADE_PLAYER_STATUS_INVALID'
  | 'TRADE_EXECUTION_NOT_IMPLEMENTED';

export interface FranchiseOffseasonAdapterContext {
  franchiseId: string;
  seasonId: string;
  statsScopeId?: string;
  seasonNumber: number;
  offseasonStateId: string;
  phase: FranchiseOffseasonAdapterPhase;
  actorTeamId?: string;
  actorPlayerId?: string;
  targetTeamId?: string;
  targetPlayerId?: string;
  dryRun?: boolean;
}

export interface FranchiseOffseasonAdapterIssue {
  code: FranchiseOffseasonAdapterIssueCode;
  severity: FranchiseOffseasonAdapterIssueSeverity;
  message: string;
  franchiseId?: string;
  seasonId?: string;
  seasonNumber?: number;
  offseasonStateId?: string;
  phase?: FranchiseOffseasonAdapterPhase | string;
  teamId?: string;
  playerId?: string;
  details?: Record<string, unknown>;
}

export interface FranchiseOffseasonAdapterValidationReport {
  valid: boolean;
  context: Partial<FranchiseOffseasonAdapterContext>;
  issues: FranchiseOffseasonAdapterIssue[];
  counts?: {
    players?: number;
    teams?: number;
    farmRecords?: number;
    transitionJournals?: number;
  };
}

export interface FranchiseOffseasonAdapterResult<TData = unknown> {
  success: boolean;
  dryRun: boolean;
  context: Partial<FranchiseOffseasonAdapterContext>;
  issues: FranchiseOffseasonAdapterIssue[];
  data?: TData;
  errorCode?: FranchiseOffseasonAdapterIssueCode;
  message?: string;
}

export interface FranchiseOffseasonAdapter<TInput = unknown, TOutput = unknown> {
  id: string;
  phase: FranchiseOffseasonAdapterPhase;
  description: string;
  implemented: boolean;
  validate: (
    context: Partial<FranchiseOffseasonAdapterContext>,
    input?: TInput,
  ) => Promise<FranchiseOffseasonAdapterValidationReport> | FranchiseOffseasonAdapterValidationReport;
  execute: (
    context: Partial<FranchiseOffseasonAdapterContext>,
    input?: TInput,
  ) => Promise<FranchiseOffseasonAdapterResult<TOutput>> | FranchiseOffseasonAdapterResult<TOutput>;
}

export function getFranchiseOffseasonStateId(seasonId: string): string {
  return `offseason-${seasonId}`;
}

export function makeFranchiseOffseasonAdapterContext(input: {
  franchiseId: string;
  seasonId: string;
  statsScopeId?: string;
  seasonNumber: number;
  phase: FranchiseOffseasonAdapterPhase;
  offseasonStateId?: string;
  actorTeamId?: string;
  actorPlayerId?: string;
  targetTeamId?: string;
  targetPlayerId?: string;
  dryRun?: boolean;
}): FranchiseOffseasonAdapterContext {
  return {
    ...input,
    offseasonStateId: input.offseasonStateId ?? getFranchiseOffseasonStateId(input.seasonId),
  };
}

function hasText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function validateFranchiseOffseasonAdapterContext(
  context: Partial<FranchiseOffseasonAdapterContext>,
): FranchiseOffseasonAdapterIssue[] {
  const issues: FranchiseOffseasonAdapterIssue[] = [];

  if (!hasText(context.franchiseId)) {
    issues.push({
      code: 'MISSING_FRANCHISE_ID',
      severity: 'error',
      message: 'Franchise offseason adapters require a franchiseId.',
    });
  }

  if (!hasText(context.seasonId)) {
    issues.push({
      code: 'MISSING_SEASON_ID',
      severity: 'error',
      message: 'Franchise offseason adapters require a canonical seasonId.',
      franchiseId: context.franchiseId,
    });
  }

  if (!Number.isFinite(context.seasonNumber) || (context.seasonNumber ?? 0) < 1) {
    issues.push({
      code: 'MISSING_SEASON_NUMBER',
      severity: 'error',
      message: 'Franchise offseason adapters require a positive seasonNumber.',
      franchiseId: context.franchiseId,
      seasonId: context.seasonId,
    });
  }

  if (!hasText(context.offseasonStateId)) {
    issues.push({
      code: 'MISSING_OFFSEASON_STATE_ID',
      severity: 'error',
      message: 'Franchise offseason adapters require an offseasonStateId.',
      franchiseId: context.franchiseId,
      seasonId: context.seasonId,
      seasonNumber: context.seasonNumber,
    });
  }

  if (!hasText(context.phase)) {
    issues.push({
      code: 'MISSING_PHASE',
      severity: 'error',
      message: 'Franchise offseason adapters require an offseason phase.',
      franchiseId: context.franchiseId,
      seasonId: context.seasonId,
      seasonNumber: context.seasonNumber,
      offseasonStateId: context.offseasonStateId,
    });
  } else if (!OFFSEASON_PHASES.includes(context.phase as OffseasonPhase)) {
    issues.push({
      code: 'INVALID_PHASE',
      severity: 'error',
      message: `Unsupported franchise offseason phase: ${String(context.phase)}.`,
      franchiseId: context.franchiseId,
      seasonId: context.seasonId,
      seasonNumber: context.seasonNumber,
      offseasonStateId: context.offseasonStateId,
      phase: context.phase,
    });
  }

  return issues;
}

export function createUnavailableFranchiseOffseasonAdapter<TInput = unknown, TOutput = never>(
  phase: FranchiseOffseasonAdapterPhase,
  description: string,
): FranchiseOffseasonAdapter<TInput, TOutput> {
  return {
    id: `franchise-offseason-${phase.toLowerCase()}-unavailable`,
    phase,
    description,
    implemented: false,
    validate(context) {
      const issues = validateFranchiseOffseasonAdapterContext(context);
      return {
        valid: issues.every((issue) => issue.severity !== 'error'),
        context,
        issues,
      };
    },
    execute(context) {
      const contextIssues = validateFranchiseOffseasonAdapterContext(context);
      const notImplementedIssue: FranchiseOffseasonAdapterIssue = {
        code: 'ADAPTER_NOT_IMPLEMENTED',
        severity: 'error',
        message: description,
        franchiseId: context.franchiseId,
        seasonId: context.seasonId,
        seasonNumber: context.seasonNumber,
        offseasonStateId: context.offseasonStateId,
        phase,
      };
      return {
        success: false,
        dryRun: context.dryRun ?? true,
        context,
        issues: [...contextIssues, notImplementedIssue],
        errorCode: 'ADAPTER_NOT_IMPLEMENTED',
        message: description,
      };
    },
  };
}
