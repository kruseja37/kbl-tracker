import { getAllFranchisePlayers } from './franchisePlayerStorage';
import { getFranchiseFarmRecordsForSeason } from './franchiseFarmStorage';
import type { Player, Team } from './franchisePlayerStorage';
import type { FranchiseFarmRecord } from './franchiseFarmStorage';

export const PHASE_11_MLB_ROSTER_SIZE = 22;
export const PHASE_11_FARM_ROSTER_SIZE = 10;
export const PHASE_11_TOTAL_ROSTER_SIZE = 32;

export type FranchiseRosterLockIssueCode =
  | 'NO_FRANCHISE_PLAYERS'
  | 'NO_TEAM_SCOPE'
  | 'MLB_COUNT_MISMATCH'
  | 'FARM_COUNT_MISMATCH'
  | 'TOTAL_COUNT_MISMATCH'
  | 'DAMAGED_LEGACY_STATUS'
  | 'INACTIVE_STATUS_INCLUDED'
  | 'FARM_RECORD_PLAYER_MISSING'
  | 'FARM_RECORD_TEAM_MISMATCH'
  | 'FARM_RECORD_STATUS_MISMATCH'
  | 'PLAYER_FARM_STATUS_WITHOUT_RECORD';

export interface FranchiseRosterLockIssue {
  code: FranchiseRosterLockIssueCode;
  severity: 'error' | 'warning';
  message: string;
  teamId?: string;
  playerId?: string;
  farmRecordId?: string;
  actualRosterStatus?: string;
}

export interface FranchiseTeamRosterLockCounts {
  teamId: string;
  mlbCount: number;
  farmCount: number;
  totalCount: number;
  excludedCount: number;
}

export interface FranchisePhase11RosterLockResult {
  valid: boolean;
  franchiseId: string;
  seasonId: string;
  checkedTeamIds: string[];
  countsByTeam: FranchiseTeamRosterLockCounts[];
  issues: FranchiseRosterLockIssue[];
}

export interface ValidateFranchisePhase11RosterLockInput {
  franchiseId: string;
  seasonId: string;
  teamIds?: string[];
}

function assignmentForTeam(player: Player, teamId: string) {
  return (player.leagueAssignments ?? []).find((assignment) => assignment.teamId === teamId);
}

function statusForPlayerTeam(player: Player, teamId: string): string {
  return String(assignmentForTeam(player, teamId)?.rosterStatus ?? 'UNKNOWN');
}

function playerBelongsToTeam(player: Player, teamId: string): boolean {
  return (player.leagueAssignments ?? []).some((assignment) => assignment.teamId === teamId);
}

function makeTeamIds(players: Player[], farmRecords: FranchiseFarmRecord[], explicitTeamIds?: string[]): string[] {
  if (explicitTeamIds?.length) {
    return Array.from(new Set(explicitTeamIds));
  }

  return Array.from(new Set([
    ...players.flatMap((player) => (player.leagueAssignments ?? []).map((assignment) => assignment.teamId)),
    ...farmRecords.map((record) => record.teamId),
  ].filter(Boolean)));
}

export async function validateFranchisePhase11RosterLock(
  input: ValidateFranchisePhase11RosterLockInput,
): Promise<FranchisePhase11RosterLockResult> {
  const [players, farmRecords] = await Promise.all([
    getAllFranchisePlayers(input.franchiseId),
    getFranchiseFarmRecordsForSeason(input.franchiseId, input.seasonId),
  ]);

  const checkedTeamIds = makeTeamIds(players, farmRecords, input.teamIds);
  const issues: FranchiseRosterLockIssue[] = [];
  const countsByTeam: FranchiseTeamRosterLockCounts[] = [];

  if (players.length === 0) {
    issues.push({
      code: 'NO_FRANCHISE_PLAYERS',
      severity: 'error',
      message: 'No franchise-owned player records were found for Phase 11 roster lock validation.',
    });
  }

  if (checkedTeamIds.length === 0) {
    issues.push({
      code: 'NO_TEAM_SCOPE',
      severity: 'error',
      message: 'No franchise-owned team scope was available for Phase 11 roster lock validation.',
    });
  }

  for (const teamId of checkedTeamIds) {
    const teamPlayers = players.filter((player) => playerBelongsToTeam(player, teamId));
    const farmForTeam = farmRecords.filter((record) => record.teamId === teamId);
    const farmPlayerIds = new Set(farmForTeam.map((record) => record.playerId));
    const mlbPlayers = teamPlayers.filter((player) => statusForPlayerTeam(player, teamId) === 'MLB');
    const excludedPlayers = teamPlayers.filter((player) =>
      ['FREE_AGENT', 'RELEASED', 'RETIRED', 'INACTIVE', 'UNASSIGNED'].includes(statusForPlayerTeam(player, teamId)),
    );
    const legacyUnknownPlayers = teamPlayers.filter((player) => statusForPlayerTeam(player, teamId) === 'UNKNOWN');
    const farmStatusPlayers = teamPlayers.filter((player) => statusForPlayerTeam(player, teamId) === 'FARM');

    countsByTeam.push({
      teamId,
      mlbCount: mlbPlayers.length,
      farmCount: farmForTeam.length,
      totalCount: mlbPlayers.length + farmForTeam.length,
      excludedCount: excludedPlayers.length + legacyUnknownPlayers.length,
    });

    if (mlbPlayers.length !== PHASE_11_MLB_ROSTER_SIZE) {
      issues.push({
        code: 'MLB_COUNT_MISMATCH',
        severity: 'error',
        teamId,
        message: `${teamId} has ${mlbPlayers.length} MLB players; Phase 11 requires ${PHASE_11_MLB_ROSTER_SIZE}.`,
      });
    }

    if (farmForTeam.length !== PHASE_11_FARM_ROSTER_SIZE) {
      issues.push({
        code: 'FARM_COUNT_MISMATCH',
        severity: 'error',
        teamId,
        message: `${teamId} has ${farmForTeam.length} franchise farm records; Phase 11 requires ${PHASE_11_FARM_ROSTER_SIZE}.`,
      });
    }

    if (mlbPlayers.length + farmForTeam.length !== PHASE_11_TOTAL_ROSTER_SIZE) {
      issues.push({
        code: 'TOTAL_COUNT_MISMATCH',
        severity: 'error',
        teamId,
        message: `${teamId} has ${mlbPlayers.length + farmForTeam.length} lock-counted players; Phase 11 requires ${PHASE_11_TOTAL_ROSTER_SIZE}.`,
      });
    }

    for (const player of legacyUnknownPlayers) {
      issues.push({
        code: 'DAMAGED_LEGACY_STATUS',
        severity: 'error',
        teamId,
        playerId: player.id,
        message: `${player.id} has no explicit franchise roster status and cannot be counted for Phase 11 lock.`,
      });
    }

    for (const player of excludedPlayers) {
      issues.push({
        code: 'INACTIVE_STATUS_INCLUDED',
        severity: 'warning',
        teamId,
        playerId: player.id,
        message: `${player.id} is ${statusForPlayerTeam(player, teamId)} and is excluded from Phase 11 lock counts.`,
      });
    }

    for (const player of farmStatusPlayers) {
      if (!farmPlayerIds.has(player.id)) {
        issues.push({
          code: 'PLAYER_FARM_STATUS_WITHOUT_RECORD',
          severity: 'error',
          teamId,
          playerId: player.id,
          message: `${player.id} is marked FARM but has no franchise farm record for ${input.seasonId}.`,
        });
      }
    }

    for (const farmRecord of farmForTeam) {
      const player = players.find((candidate) => candidate.id === farmRecord.playerId);
      if (!player) {
        issues.push({
          code: 'FARM_RECORD_PLAYER_MISSING',
          severity: 'error',
          teamId,
          playerId: farmRecord.playerId,
          message: `Farm record for ${farmRecord.playerId} has no matching franchise player record.`,
        });
        continue;
      }

      if (!playerBelongsToTeam(player, teamId)) {
        issues.push({
          code: 'FARM_RECORD_TEAM_MISMATCH',
          severity: 'error',
          teamId,
          playerId: player.id,
          message: `Farm record for ${player.id} points to ${teamId}, but the player is not assigned to that team.`,
        });
        continue;
      }

      const actualRosterStatus = statusForPlayerTeam(player, teamId);
      if (actualRosterStatus !== 'FARM') {
        issues.push({
          code: 'FARM_RECORD_STATUS_MISMATCH',
          severity: 'error',
          teamId,
          playerId: player.id,
          farmRecordId: farmRecord.id,
          actualRosterStatus,
          message: `Farm record ${farmRecord.id} points to ${player.id}, but the player status is ${actualRosterStatus}; Phase 11 farm records require FARM status.`,
        });
      }
    }
  }

  return {
    valid: !issues.some((issue) => issue.severity === 'error'),
    franchiseId: input.franchiseId,
    seasonId: input.seasonId,
    checkedTeamIds,
    countsByTeam,
    issues,
  };
}

export type { Team };
