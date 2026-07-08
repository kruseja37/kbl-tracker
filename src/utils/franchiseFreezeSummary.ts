import type { StoredFranchiseConfig } from '../types/franchise';
import { getFranchiseConfig } from './franchiseManager';
import {
  getAllFranchisePlayers,
  getAllFranchiseTeams,
  type Player,
  type Team,
} from './franchisePlayerStorage';
import {
  listFranchiseMoraleSnapshots,
  type FranchiseMoraleSnapshot,
} from './franchiseMoraleState';
import {
  getFranchiseTrueValueRows,
  type FranchiseTrueValueRow,
} from './franchiseTrueValueStorage';
import { getFranchiseSeasonId } from './franchisePersistenceContract';

export interface FranchiseFreezeTeamSummary {
  teamId: string;
  teamName: string;
  payrollBaseline: number | null;
  mlbRosterCount: number | null;
  farmRosterCount: number | null;
  fanMoraleBaseline: number | null;
}

export interface FranchiseFreezeMoraleSummary {
  playerCount: number;
  playerAverage: number | null;
  playerMin: number | null;
  playerMax: number | null;
  teamFanCount: number;
  teamFanAverage: number | null;
  teamFanMin: number | null;
  teamFanMax: number | null;
}

export interface FranchiseFreezeSummary {
  franchiseId: string;
  seasonId: string;
  leagueName: string;
  teamCount: number;
  frozenPlayerRows: number;
  settledSalaryPlayerRows: number;
  draftBaselineRows: number;
  draftBaselineContractRows: number;
  rosterTotals: {
    mlb: number;
    farm: number;
  };
  morale: FranchiseFreezeMoraleSummary;
  teams: FranchiseFreezeTeamSummary[];
  notDisplayable: string[];
}

function finiteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function min(values: number[]): number | null {
  return values.length > 0 ? Math.min(...values) : null;
}

function max(values: number[]): number | null {
  return values.length > 0 ? Math.max(...values) : null;
}

function rosterStatusForTeam(player: Player, teamId: string): 'MLB' | 'FARM' | null {
  const assignment = player.leagueAssignments?.find((candidate) =>
    candidate.teamId === teamId &&
    (candidate.rosterStatus === 'MLB' || candidate.rosterStatus === 'FARM'),
  );
  return assignment?.rosterStatus === 'MLB' || assignment?.rosterStatus === 'FARM'
    ? assignment.rosterStatus
    : null;
}

function teamName(team: Team | undefined, teamId: string): string {
  return team?.name || team?.nickname || teamId;
}

function moraleValues(
  snapshots: FranchiseMoraleSnapshot[],
  targetType: FranchiseMoraleSnapshot['targetType'],
): number[] {
  return snapshots
    .filter((snapshot) => snapshot.targetType === targetType)
    .map((snapshot) => finiteNumber(snapshot.baselineValue))
    .filter((value): value is number => value !== null);
}

function buildMoraleSummary(snapshots: FranchiseMoraleSnapshot[]): FranchiseFreezeMoraleSummary {
  const playerValues = moraleValues(snapshots, 'player');
  const teamFanValues = moraleValues(snapshots, 'team-fan');
  return {
    playerCount: playerValues.length,
    playerAverage: average(playerValues),
    playerMin: min(playerValues),
    playerMax: max(playerValues),
    teamFanCount: teamFanValues.length,
    teamFanAverage: average(teamFanValues),
    teamFanMin: min(teamFanValues),
    teamFanMax: max(teamFanValues),
  };
}

function rosterCountFromPersistedConfig(
  config: StoredFranchiseConfig | null,
  teamId: string,
  level: 'MLB' | 'FARM',
): number | null {
  const count = config?.rosterRequirements?.teamCounts?.[teamId]?.[level];
  return typeof count === 'number' && Number.isInteger(count) ? count : null;
}

function rosterCountFromPlayerRows(players: Player[], teamId: string, level: 'MLB' | 'FARM'): number {
  return players.filter((player) => rosterStatusForTeam(player, teamId) === level).length;
}

export async function loadFranchiseFreezeSummary(franchiseId: string): Promise<FranchiseFreezeSummary> {
  const seasonId = getFranchiseSeasonId(franchiseId, 1);
  const [
    config,
    players,
    teams,
    moraleSnapshots,
    draftBaselineRows,
  ] = await Promise.all([
    getFranchiseConfig(franchiseId),
    getAllFranchisePlayers(franchiseId),
    getAllFranchiseTeams(franchiseId),
    listFranchiseMoraleSnapshots(franchiseId, seasonId, seasonId, 1),
    getFranchiseTrueValueRows({
      franchiseId,
      seasonId,
      statsScopeId: 'draft-baseline',
    }),
  ]);

  const teamsById = new Map(teams.map((team) => [team.id, team]));
  const teamIds = Array.from(new Set([
    ...teams.map((team) => team.id),
    ...Object.keys(config?.rosterRequirements?.teamCounts ?? {}),
    ...Object.keys(config?.salaryBaseline?.teamPayrolls ?? {}),
  ])).sort((left, right) => teamName(teamsById.get(left), left).localeCompare(teamName(teamsById.get(right), right)));

  const teamFanMoraleByTeamId = new Map(
    moraleSnapshots
      .filter((snapshot) => snapshot.targetType === 'team-fan' && snapshot.teamId)
      .map((snapshot) => [snapshot.teamId!, snapshot.baselineValue]),
  );

  const teamSummaries = teamIds.map((teamId): FranchiseFreezeTeamSummary => {
    const persistedMlb = rosterCountFromPersistedConfig(config, teamId, 'MLB');
    const persistedFarm = rosterCountFromPersistedConfig(config, teamId, 'FARM');
    return {
      teamId,
      teamName: teamName(teamsById.get(teamId), teamId),
      payrollBaseline: finiteNumber(config?.salaryBaseline?.teamPayrolls?.[teamId]),
      mlbRosterCount: persistedMlb ?? rosterCountFromPlayerRows(players, teamId, 'MLB'),
      farmRosterCount: persistedFarm ?? rosterCountFromPlayerRows(players, teamId, 'FARM'),
      fanMoraleBaseline: finiteNumber(teamFanMoraleByTeamId.get(teamId)),
    };
  });

  const draftBaselineContractRows = draftBaselineRows.filter((row: FranchiseTrueValueRow) =>
    finiteNumber(row.contractValue) !== null,
  ).length;
  const settledSalaryPlayerRows = players.filter((player) =>
    finiteNumber(player.settledSalary) !== null,
  ).length;

  const notDisplayable: string[] = [];
  if (draftBaselineRows.length > 0) {
    notDisplayable.push(
      'Exact freeze-engine team payroll totals are not persisted as a team aggregate; only player-level contract values and the roster-copy salary baseline are readable.',
    );
    notDisplayable.push(
      'Draft slot class and pay class are not persisted; only the final starting morale baseline is readable.',
    );
  }

  return {
    franchiseId,
    seasonId,
    leagueName: config?.leagueDetails?.name || 'Franchise',
    teamCount: teamSummaries.length,
    frozenPlayerRows: players.length,
    settledSalaryPlayerRows,
    draftBaselineRows: draftBaselineRows.length,
    draftBaselineContractRows,
    rosterTotals: {
      mlb: teamSummaries.reduce((sum, team) => sum + (team.mlbRosterCount ?? 0), 0),
      farm: teamSummaries.reduce((sum, team) => sum + (team.farmRosterCount ?? 0), 0),
    },
    morale: buildMoraleSummary(moraleSnapshots),
    teams: teamSummaries,
    notDisplayable,
  };
}
