import {
  PHASE_11_FARM_ROSTER_SIZE,
  PHASE_11_MLB_ROSTER_SIZE,
  PHASE_11_TOTAL_ROSTER_SIZE,
  validateFranchisePhase11RosterLock,
  type FranchisePhase11RosterLockResult,
  type FranchiseRosterLockIssue,
} from './franchiseRosterLockValidator';
import {
  getAllFranchisePlayers,
  getAllFranchiseTeams,
  type Player,
  type Team,
} from './franchisePlayerStorage';
import {
  getFranchiseFarmRecordsForSeason,
  type FranchiseFarmRecord,
} from './franchiseFarmStorage';

export type FranchisePhase11RosterPlanAction =
  | 'CUT_MLB'
  | 'SIGN_MLB'
  | 'CUT_FARM'
  | 'SIGN_FARM'
  | 'REPAIR_STATUS';

export interface FranchisePhase11RosterPlanRequirement {
  teamId: string;
  action: FranchisePhase11RosterPlanAction;
  count: number;
  message: string;
}

export interface FranchisePhase11RosterPlanTeam {
  teamId: string;
  teamName?: string;
  mlbCount: number;
  farmCount: number;
  totalCount: number;
  requiredCuts: number;
  requiredSignings: number;
  requiredFarmCorrections: number;
  requirements: FranchisePhase11RosterPlanRequirement[];
  lockIssues: FranchiseRosterLockIssue[];
}

export interface FranchisePhase11RosterPlan {
  valid: boolean;
  franchiseId: string;
  seasonId: string;
  checkedTeamIds: string[];
  teams: FranchisePhase11RosterPlanTeam[];
  totals: {
    mlbCount: number;
    farmCount: number;
    totalCount: number;
    requiredCuts: number;
    requiredSignings: number;
    requiredFarmCorrections: number;
  };
  blockingLockIssues: FranchiseRosterLockIssue[];
  warnings: string[];
  limitations: string[];
}

export interface FranchisePhase11RosterPlanFromRecordsInput {
  franchiseId: string;
  seasonId: string;
  players: Player[];
  teams?: Team[];
  farmRecords: FranchiseFarmRecord[];
  teamIds?: string[];
  rosterLock?: FranchisePhase11RosterLockResult;
}

function assignmentForTeam(player: Player, teamId: string) {
  return (player.leagueAssignments ?? []).find((assignment) => assignment.teamId === teamId);
}

function statusForTeam(player: Player, teamId: string): string {
  return String(assignmentForTeam(player, teamId)?.rosterStatus ?? 'UNKNOWN');
}

function playerBelongsToTeam(player: Player, teamId: string): boolean {
  return (player.leagueAssignments ?? []).some((assignment) => assignment.teamId === teamId);
}

function makeTeamIds(input: FranchisePhase11RosterPlanFromRecordsInput): string[] {
  if (input.teamIds?.length) return Array.from(new Set(input.teamIds));
  if (input.rosterLock?.checkedTeamIds.length) return input.rosterLock.checkedTeamIds;

  return Array.from(new Set([
    ...(input.teams ?? []).map((team) => team.id),
    ...input.players.flatMap((player) => (player.leagueAssignments ?? []).map((assignment) => assignment.teamId)),
    ...input.farmRecords.map((record) => record.teamId),
  ].filter(Boolean)));
}

function teamName(team: Team | undefined): string | undefined {
  if (!team) return undefined;
  const source = team as Team & Record<string, unknown>;
  return String(source.name ?? source.teamName ?? source.shortName ?? team.id);
}

function pushCountRequirement(
  requirements: FranchisePhase11RosterPlanRequirement[],
  teamId: string,
  count: number,
  action: FranchisePhase11RosterPlanAction,
  message: string,
): void {
  if (count <= 0) return;
  requirements.push({ teamId, count, action, message });
}

export function planFranchisePhase11RosterFromRecords(
  input: FranchisePhase11RosterPlanFromRecordsInput,
): FranchisePhase11RosterPlan {
  const teamIds = makeTeamIds(input);
  const teamsById = new Map((input.teams ?? []).map((team) => [team.id, team]));
  const lockIssues = input.rosterLock?.issues ?? [];
  const teams: FranchisePhase11RosterPlanTeam[] = [];

  for (const teamId of teamIds) {
    const teamPlayers = input.players.filter((player) => playerBelongsToTeam(player, teamId));
    const farmRecords = input.farmRecords.filter((record) => record.teamId === teamId);
    const mlbCount = teamPlayers.filter((player) => statusForTeam(player, teamId) === 'MLB').length;
    const farmCount = farmRecords.length;
    const totalCount = mlbCount + farmCount;
    const teamLockIssues = lockIssues.filter((issue) => issue.teamId === teamId);

    const requirements: FranchisePhase11RosterPlanRequirement[] = [];
    pushCountRequirement(
      requirements,
      teamId,
      Math.max(0, mlbCount - PHASE_11_MLB_ROSTER_SIZE),
      'CUT_MLB',
      `${teamId} must cut or release ${mlbCount - PHASE_11_MLB_ROSTER_SIZE} MLB player(s) to reach the Phase 11 lock.`,
    );
    pushCountRequirement(
      requirements,
      teamId,
      Math.max(0, PHASE_11_MLB_ROSTER_SIZE - mlbCount),
      'SIGN_MLB',
      `${teamId} must sign or fill ${PHASE_11_MLB_ROSTER_SIZE - mlbCount} MLB player(s) to reach the Phase 11 lock.`,
    );
    pushCountRequirement(
      requirements,
      teamId,
      Math.max(0, farmCount - PHASE_11_FARM_ROSTER_SIZE),
      'CUT_FARM',
      `${teamId} must cut or release ${farmCount - PHASE_11_FARM_ROSTER_SIZE} farm player(s) to reach the Phase 11 lock.`,
    );
    pushCountRequirement(
      requirements,
      teamId,
      Math.max(0, PHASE_11_FARM_ROSTER_SIZE - farmCount),
      'SIGN_FARM',
      `${teamId} must sign or assign ${PHASE_11_FARM_ROSTER_SIZE - farmCount} farm player(s) to reach the Phase 11 lock.`,
    );

    const farmCorrections = teamLockIssues.filter((issue) =>
      issue.code === 'FARM_RECORD_STATUS_MISMATCH' ||
      issue.code === 'FARM_RECORD_PLAYER_MISSING' ||
      issue.code === 'FARM_RECORD_TEAM_MISMATCH' ||
      issue.code === 'PLAYER_FARM_STATUS_WITHOUT_RECORD' ||
      issue.code === 'DAMAGED_LEGACY_STATUS'
    ).length;

    pushCountRequirement(
      requirements,
      teamId,
      farmCorrections,
      'REPAIR_STATUS',
      `${teamId} has ${farmCorrections} damaged farm/player status issue(s) that must be repaired before Phase 11 can lock.`,
    );

    teams.push({
      teamId,
      teamName: teamName(teamsById.get(teamId)),
      mlbCount,
      farmCount,
      totalCount,
      requiredCuts: Math.max(0, mlbCount - PHASE_11_MLB_ROSTER_SIZE) + Math.max(0, farmCount - PHASE_11_FARM_ROSTER_SIZE),
      requiredSignings: Math.max(0, PHASE_11_MLB_ROSTER_SIZE - mlbCount) + Math.max(0, PHASE_11_FARM_ROSTER_SIZE - farmCount),
      requiredFarmCorrections: farmCorrections,
      requirements,
      lockIssues: teamLockIssues,
    });
  }

  const blockingLockIssues = lockIssues.filter((issue) => issue.severity === 'error');
  const totals = teams.reduce(
    (sum, team) => ({
      mlbCount: sum.mlbCount + team.mlbCount,
      farmCount: sum.farmCount + team.farmCount,
      totalCount: sum.totalCount + team.totalCount,
      requiredCuts: sum.requiredCuts + team.requiredCuts,
      requiredSignings: sum.requiredSignings + team.requiredSignings,
      requiredFarmCorrections: sum.requiredFarmCorrections + team.requiredFarmCorrections,
    }),
    { mlbCount: 0, farmCount: 0, totalCount: 0, requiredCuts: 0, requiredSignings: 0, requiredFarmCorrections: 0 },
  );

  return {
    valid: input.rosterLock ? input.rosterLock.valid : blockingLockIssues.length === 0 && teams.every((team) => team.requirements.length === 0),
    franchiseId: input.franchiseId,
    seasonId: input.seasonId,
    checkedTeamIds: teamIds,
    teams,
    totals,
    blockingLockIssues,
    warnings: lockIssues.filter((issue) => issue.severity === 'warning').map((issue) => issue.message),
    limitations: [
      'Phase 11 planner is read-only and does not choose players to cut, release, sign, or move.',
      'Counts are based only on franchise-owned players and franchise farm records.',
      `Final lock target is exactly ${PHASE_11_MLB_ROSTER_SIZE} MLB + ${PHASE_11_FARM_ROSTER_SIZE} FARM = ${PHASE_11_TOTAL_ROSTER_SIZE} total per team.`,
    ],
  };
}

export async function planFranchisePhase11Roster(input: {
  franchiseId: string;
  seasonId: string;
  teamIds?: string[];
}): Promise<FranchisePhase11RosterPlan> {
  const [players, teams, farmRecords, rosterLock] = await Promise.all([
    getAllFranchisePlayers(input.franchiseId),
    getAllFranchiseTeams(input.franchiseId),
    getFranchiseFarmRecordsForSeason(input.franchiseId, input.seasonId),
    validateFranchisePhase11RosterLock({
      franchiseId: input.franchiseId,
      seasonId: input.seasonId,
      teamIds: input.teamIds,
    }),
  ]);

  return planFranchisePhase11RosterFromRecords({
    franchiseId: input.franchiseId,
    seasonId: input.seasonId,
    players,
    teams,
    farmRecords,
    teamIds: input.teamIds,
    rosterLock,
  });
}
