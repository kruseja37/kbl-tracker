import {
  type FranchiseOffseasonAdapterContext,
  type FranchiseOffseasonAdapterIssue,
  type FranchiseOffseasonAdapterValidationReport,
  validateFranchiseOffseasonAdapterContext,
} from './franchiseOffseasonAdapters';
import {
  getAllFranchisePlayers,
  getAllFranchiseTeams,
  getFranchisePlayer,
  getFranchiseTeam,
  type Player,
  type Team,
} from './franchisePlayerStorage';
import {
  getFranchiseFarmRecordsForSeason,
  type FranchiseFarmRecord,
} from './franchiseFarmStorage';
import {
  getOffseasonState,
  type OffseasonState,
} from './offseasonStorage';
import {
  getFranchiseSeasonSummary,
  type FranchiseSeasonSummary,
} from './franchiseSeasonSummaryStorage';
import {
  listFranchiseTransitionJournals,
  type FranchiseTransitionJournalRecord,
} from './franchiseTransitionJournal';
import {
  validateFranchisePhase11RosterLock,
  type FranchisePhase11RosterLockResult,
} from './franchiseRosterLockValidator';

export interface FranchiseOffseasonScopeValidationOptions {
  requireCurrentPhase?: boolean;
  allowCompletedPhase?: boolean;
  actorTeamId?: string;
  actorPlayerId?: string;
  targetTeamId?: string;
  targetPlayerId?: string;
  includeFarmRecords?: boolean;
  includeSeasonSummary?: boolean;
  includeTransitionJournals?: boolean;
  includePhase11RosterLock?: boolean;
  rosterLockTeamIds?: string[];
}

export interface FranchiseOffseasonAdapterScope {
  context: FranchiseOffseasonAdapterContext;
  offseasonState: OffseasonState | null;
  players: Player[];
  teams: Team[];
  farmRecords: FranchiseFarmRecord[];
  seasonSummary: FranchiseSeasonSummary | null;
  transitionJournals: FranchiseTransitionJournalRecord[];
  phase11RosterLock: FranchisePhase11RosterLockResult | null;
}

export interface FranchiseOffseasonScopeValidationReport
  extends FranchiseOffseasonAdapterValidationReport {
  scope: FranchiseOffseasonAdapterScope | null;
}

function isCompleteContext(
  context: Partial<FranchiseOffseasonAdapterContext>,
): context is FranchiseOffseasonAdapterContext {
  return Boolean(
    context.franchiseId &&
      context.seasonId &&
      context.seasonNumber &&
      context.offseasonStateId &&
      context.phase,
  );
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

function hasCompletedPhase(
  state: OffseasonState,
  phase: FranchiseOffseasonAdapterContext['phase'],
): boolean {
  return (state.phasesCompleted ?? []).includes(phase);
}

function playerBelongsToFranchisePlayerSet(players: Player[], playerId: string): boolean {
  return players.some((player) => player.id === playerId);
}

function teamBelongsToFranchiseTeamSet(teams: Team[], teamId: string): boolean {
  return teams.some((team) => team.id === teamId);
}

function assignmentForTeam(player: Player, teamId: string) {
  return (player.leagueAssignments ?? []).find((assignment) => assignment.teamId === teamId);
}

function validateSeasonSummaryScope(
  context: FranchiseOffseasonAdapterContext,
  scope: FranchiseOffseasonAdapterScope,
): FranchiseOffseasonAdapterIssue[] {
  if (!scope.seasonSummary) {
    return [
      makeIssue(
        'SEASON_SUMMARY_MISSING',
        'A franchise season summary was requested but no summary was found for this season.',
        context,
      ),
    ];
  }

  const mismatches: Record<string, unknown> = {};
  if (scope.seasonSummary.franchiseId !== context.franchiseId) {
    mismatches.franchiseId = scope.seasonSummary.franchiseId;
  }
  if (scope.seasonSummary.seasonId !== context.seasonId) {
    mismatches.seasonId = scope.seasonSummary.seasonId;
  }
  if (scope.seasonSummary.seasonNumber !== context.seasonNumber) {
    mismatches.seasonNumber = scope.seasonSummary.seasonNumber;
  }

  if (Object.keys(mismatches).length === 0) {
    return [];
  }

  return [
    makeIssue(
      'SEASON_SUMMARY_SCOPE_MISMATCH',
      'The loaded franchise season summary does not match the adapter context.',
      context,
      { details: { actual: mismatches } },
    ),
  ];
}

function validateFarmRecordScope(
  context: FranchiseOffseasonAdapterContext,
  scope: FranchiseOffseasonAdapterScope,
): FranchiseOffseasonAdapterIssue[] {
  const issues: FranchiseOffseasonAdapterIssue[] = [];
  const playersById = new Map(scope.players.map((player) => [player.id, player]));
  const teamIds = new Set(scope.teams.map((team) => team.id));

  for (const record of scope.farmRecords) {
    const scopeMismatches: Record<string, unknown> = {};
    if (record.franchiseId !== context.franchiseId) {
      scopeMismatches.franchiseId = record.franchiseId;
    }
    if (record.seasonId !== context.seasonId) {
      scopeMismatches.seasonId = record.seasonId;
    }
    if (
      typeof record.seasonNumber !== 'number' ||
      !Number.isFinite(record.seasonNumber) ||
      record.seasonNumber !== context.seasonNumber
    ) {
      scopeMismatches.seasonNumber = record.seasonNumber;
    }
    if (Object.keys(scopeMismatches).length > 0) {
      issues.push(
        makeIssue(
          'FARM_RECORD_SCOPE_MISMATCH',
          'A franchise farm record does not match the adapter context scope.',
          context,
          {
            teamId: record.teamId,
            playerId: record.playerId,
            details: { farmRecordId: record.id, actual: scopeMismatches },
          },
        ),
      );
    }

    const player = playersById.get(record.playerId);
    if (!player) {
      issues.push(
        makeIssue(
          'FARM_RECORD_PLAYER_MISSING',
          'A franchise farm record references a player missing from franchise-owned player storage.',
          context,
          {
            teamId: record.teamId,
            playerId: record.playerId,
            details: { farmRecordId: record.id },
          },
        ),
      );
    }

    if (!teamIds.has(record.teamId)) {
      issues.push(
        makeIssue(
          'FARM_RECORD_TEAM_MISSING',
          'A franchise farm record references a team missing from franchise-owned team storage.',
          context,
          {
            teamId: record.teamId,
            playerId: record.playerId,
            details: { farmRecordId: record.id },
          },
        ),
      );
    }

    if (player) {
      const assignment = assignmentForTeam(player, record.teamId);
      const status = String(assignment?.rosterStatus ?? 'UNKNOWN');
      if (status !== 'FARM') {
        issues.push(
          makeIssue(
            'FARM_RECORD_STATUS_MISMATCH',
            'A franchise farm record references a player whose team assignment is not FARM.',
            context,
            {
              teamId: record.teamId,
              playerId: record.playerId,
              details: {
                farmRecordId: record.id,
                actualRosterStatus: status,
              },
            },
          ),
        );
      }
    }

    if (record.rosterStatus !== 'FARM') {
      issues.push(
        makeIssue(
          'FARM_RECORD_STATUS_MISMATCH',
          'A franchise farm record has an invalid farm rosterStatus.',
          context,
          {
            teamId: record.teamId,
            playerId: record.playerId,
            details: {
              farmRecordId: record.id,
              actualFarmRecordStatus: record.rosterStatus,
            },
          },
        ),
      );
    }
  }

  return issues;
}

export async function loadFranchiseOffseasonAdapterScope(
  context: FranchiseOffseasonAdapterContext,
  options: FranchiseOffseasonScopeValidationOptions = {},
): Promise<FranchiseOffseasonAdapterScope> {
  const [
    offseasonState,
    players,
    teams,
    farmRecords,
    seasonSummary,
    transitionJournals,
    phase11RosterLock,
  ] = await Promise.all([
    getOffseasonState(context.seasonId),
    getAllFranchisePlayers(context.franchiseId),
    getAllFranchiseTeams(context.franchiseId),
    options.includeFarmRecords || options.includePhase11RosterLock
      ? getFranchiseFarmRecordsForSeason(context.franchiseId, context.seasonId)
      : Promise.resolve([]),
    options.includeSeasonSummary
      ? getFranchiseSeasonSummary(context.seasonId)
      : Promise.resolve(null),
    options.includeTransitionJournals
      ? listFranchiseTransitionJournals(context.franchiseId)
      : Promise.resolve([]),
    options.includePhase11RosterLock
      ? validateFranchisePhase11RosterLock({
          franchiseId: context.franchiseId,
          seasonId: context.seasonId,
          teamIds: options.rosterLockTeamIds,
        })
      : Promise.resolve(null),
  ]);

  return {
    context,
    offseasonState,
    players,
    teams,
    farmRecords,
    seasonSummary,
    transitionJournals,
    phase11RosterLock,
  };
}

async function validateExplicitReferences(
  context: FranchiseOffseasonAdapterContext,
  scope: FranchiseOffseasonAdapterScope,
  options: FranchiseOffseasonScopeValidationOptions,
): Promise<FranchiseOffseasonAdapterIssue[]> {
  const issues: FranchiseOffseasonAdapterIssue[] = [];
  const teamIds = [
    options.actorTeamId ?? context.actorTeamId,
    options.targetTeamId ?? context.targetTeamId,
  ].filter((teamId): teamId is string => Boolean(teamId));
  const playerIds = [
    options.actorPlayerId ?? context.actorPlayerId,
    options.targetPlayerId ?? context.targetPlayerId,
  ].filter((playerId): playerId is string => Boolean(playerId));

  for (const teamId of Array.from(new Set(teamIds))) {
    const team =
      teamBelongsToFranchiseTeamSet(scope.teams, teamId) ||
      Boolean(await getFranchiseTeam(context.franchiseId, teamId));
    if (!team) {
      issues.push(
        makeIssue(
          'TEAM_NOT_FOUND',
          `Team ${teamId} was not found in franchise-owned team storage.`,
          context,
          { teamId },
        ),
      );
    }
  }

  for (const playerId of Array.from(new Set(playerIds))) {
    const player =
      playerBelongsToFranchisePlayerSet(scope.players, playerId) ||
      Boolean(await getFranchisePlayer(context.franchiseId, playerId));
    if (!player) {
      issues.push(
        makeIssue(
          'PLAYER_NOT_FOUND',
          `Player ${playerId} was not found in franchise-owned player storage.`,
          context,
          { playerId },
        ),
      );
    }
  }

  return issues;
}

export async function validateFranchiseOffseasonScope(
  context: Partial<FranchiseOffseasonAdapterContext>,
  options: FranchiseOffseasonScopeValidationOptions = {},
): Promise<FranchiseOffseasonScopeValidationReport> {
  const issues = validateFranchiseOffseasonAdapterContext(context);

  if (!isCompleteContext(context) || issues.some((issue) => issue.severity === 'error')) {
    return {
      valid: false,
      context,
      issues,
      scope: null,
    };
  }

  const scope = await loadFranchiseOffseasonAdapterScope(context, options);

  if (!scope.offseasonState) {
    issues.push(
      makeIssue(
        'OFFSEASON_STATE_NOT_FOUND',
        'No franchise offseason state was found for this season.',
        context,
      ),
    );
  } else {
    if (scope.offseasonState.id !== context.offseasonStateId) {
      issues.push(
        makeIssue(
          'OFFSEASON_STATE_ID_MISMATCH',
          'The loaded offseason state does not match the requested offseasonStateId.',
          context,
          { details: { actualOffseasonStateId: scope.offseasonState.id } },
        ),
      );
    }

    if (scope.offseasonState.franchiseId !== context.franchiseId) {
      issues.push(
        makeIssue(
          'OFFSEASON_FRANCHISE_MISMATCH',
          'The offseason state does not belong to this franchise.',
          context,
          { details: { actualFranchiseId: scope.offseasonState.franchiseId } },
        ),
      );
    }

    if (
      scope.offseasonState.seasonId !== context.seasonId ||
      scope.offseasonState.seasonNumber !== context.seasonNumber
    ) {
      issues.push(
        makeIssue(
          'OFFSEASON_SEASON_MISMATCH',
          'The offseason state season identity does not match the adapter context.',
          context,
          {
            details: {
              actualSeasonId: scope.offseasonState.seasonId,
              actualSeasonNumber: scope.offseasonState.seasonNumber,
            },
          },
        ),
      );
    }

    if (options.requireCurrentPhase !== false && scope.offseasonState.currentPhase !== context.phase) {
      const completed = hasCompletedPhase(scope.offseasonState, context.phase);
      issues.push(
        makeIssue(
          completed && options.allowCompletedPhase
            ? 'PHASE_ALREADY_COMPLETE'
            : 'OFFSEASON_PHASE_MISMATCH',
          completed && options.allowCompletedPhase
            ? 'The requested offseason phase is already completed.'
            : 'The requested offseason phase is not the current franchise offseason phase.',
          context,
          {
            severity: completed && options.allowCompletedPhase ? 'warning' : 'error',
            details: { currentPhase: scope.offseasonState.currentPhase },
          },
        ),
      );
    }
  }

  issues.push(...await validateExplicitReferences(context, scope, options));

  if (options.includeSeasonSummary) {
    issues.push(...validateSeasonSummaryScope(context, scope));
  }

  if (options.includeFarmRecords || options.includePhase11RosterLock) {
    issues.push(...validateFarmRecordScope(context, scope));
  }

  if (scope.phase11RosterLock && !scope.phase11RosterLock.valid) {
    issues.push(
      makeIssue(
        'PHASE_11_LOCK_FAILED',
        'Franchise Phase 11 roster lock validation failed.',
        context,
        { details: { rosterLockIssues: scope.phase11RosterLock.issues } },
      ),
    );
  }

  for (const journal of scope.transitionJournals) {
    if (journal.status === 'pending' || journal.status === 'failed') {
      issues.push(
        makeIssue(
          'TRANSITION_ATTENTION_REQUIRED',
          'This franchise has a pending or failed transition journal that may need review before offseason mutation.',
          context,
          {
            severity: 'warning',
            details: { journalId: journal.id, status: journal.status },
          },
        ),
      );
    }
  }

  return {
    valid: issues.every((issue) => issue.severity !== 'error'),
    context,
    issues,
    counts: {
      players: scope.players.length,
      teams: scope.teams.length,
      farmRecords: scope.farmRecords.length,
      transitionJournals: scope.transitionJournals.length,
    },
    scope,
  };
}
