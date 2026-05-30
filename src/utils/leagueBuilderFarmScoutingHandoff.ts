import type { FranchiseFarmScoutingHandoffSnapshot } from '../types/franchise';
import {
  getAllPlayers,
  getScoutProfilesForLeague,
  getAllTeams,
  getLeagueTemplate,
  getTeamRoster,
  type Player,
  type Team,
  type TeamRoster,
} from './leagueBuilderStorage';

export const LEAGUE_BUILDER_FARM_SCOUTING_VALIDATION_VERSION =
  'league-builder-farm-scouting-v1';
export const LEAGUE_BUILDER_FARM_SCOUTING_OWNERSHIP =
  'league-builder-mode-1';
export const STARTUP_FARM_SCOUTING_BRIDGE_POLICY =
  'temporary-franchise-setup-repair-only';
export const V1_MLB_PLAYERS_PER_TEAM = 22;
export const V1_FARM_PLAYERS_PER_TEAM = 10;

export type LeagueBuilderFarmScoutingValidationStatus =
  | 'prepared'
  | 'repairable-by-bridge'
  | 'blocked';

export interface LeagueBuilderFarmScoutingTeamReport {
  teamId: string;
  teamName: string;
  MLB: number;
  FARM: number;
  hiddenFarm: number;
  visibleSafeMetadata: number;
  missingFarm: number;
  scouts: number;
}

export interface LeagueBuilderFarmScoutingValidationReport {
  validationVersion: typeof LEAGUE_BUILDER_FARM_SCOUTING_VALIDATION_VERSION;
  ownership: typeof LEAGUE_BUILDER_FARM_SCOUTING_OWNERSHIP;
  bridgePolicy: typeof STARTUP_FARM_SCOUTING_BRIDGE_POLICY;
  leagueId: string;
  status: LeagueBuilderFarmScoutingValidationStatus;
  prepared: boolean;
  bridgeRequired: boolean;
  bridgeAllowed: boolean;
  blockers: string[];
  warnings: string[];
  limitations: string[];
  teams: LeagueBuilderFarmScoutingTeamReport[];
}

interface ProspectMetadataCarrier extends Player {
  prospectProfile?: {
    source?: string;
    methodVersion?: string;
    scoutedGrade?: unknown;
    potentialGrade?: unknown;
  };
  scoutedGrade?: unknown;
  scoutReport?: unknown;
}

function hasAssignment(
  player: Player,
  leagueId: string,
  teamId: string,
  rosterStatus: 'MLB' | 'FARM',
): boolean {
  return Boolean(player.leagueAssignments?.some((assignment) =>
    assignment.leagueId === leagueId &&
    assignment.teamId === teamId &&
    assignment.rosterStatus === rosterStatus,
  ));
}

function uniqueCount(ids: string[]): number {
  return new Set(ids).size;
}

function sameIdSet(left: string[], right: string[]): boolean {
  const normalize = (ids: string[]) => [...new Set(ids)].sort((a, b) => a.localeCompare(b));
  const leftIds = normalize(left);
  const rightIds = normalize(right);
  return leftIds.length === rightIds.length &&
    leftIds.every((id, index) => id === rightIds[index]);
}

function hasVisibleSafeProspectMetadata(player: Player): boolean {
  const carrier = player as ProspectMetadataCarrier;
  return Boolean(
    carrier.prospectProfile?.scoutedGrade ||
      carrier.prospectProfile?.potentialGrade ||
      carrier.scoutedGrade ||
      carrier.scoutReport ||
      carrier.sourceDatabase === 'startup-prospect-draft',
  );
}

export function buildLeagueBuilderFarmScoutingHandoffSnapshot(
  report: LeagueBuilderFarmScoutingValidationReport,
  options: {
    bridgeRepairApplied?: boolean;
    scoutProfilesByTeamId?: FranchiseFarmScoutingHandoffSnapshot['scoutProfilesByTeamId'];
  } = {},
): FranchiseFarmScoutingHandoffSnapshot {
  return {
    ownership: LEAGUE_BUILDER_FARM_SCOUTING_OWNERSHIP,
    validationVersion: LEAGUE_BUILDER_FARM_SCOUTING_VALIDATION_VERSION,
    bridgePolicy: STARTUP_FARM_SCOUTING_BRIDGE_POLICY,
    preparedInLeagueBuilder: report.prepared && !options.bridgeRepairApplied,
    bridgeRepairApplied: options.bridgeRepairApplied === true,
    mlbPlayersPerTeam: V1_MLB_PLAYERS_PER_TEAM,
    farmPlayersPerTeam: V1_FARM_PLAYERS_PER_TEAM,
    hiddenTrueRatingsUntilReveal: true,
    scoutProfilesRequired: true,
    teamCounts: Object.fromEntries(
      report.teams.map((team) => [
        team.teamId,
        {
          MLB: team.MLB,
          FARM: team.FARM,
          hiddenFarm: team.hiddenFarm,
          visibleSafeMetadata: team.visibleSafeMetadata,
          scouts: team.scouts,
        },
      ]),
    ),
    scoutProfilesByTeamId: options.scoutProfilesByTeamId,
    warnings: report.warnings,
    limitations: report.limitations,
  };
}

export function validateLeagueBuilderFarmScoutingHandoffState(input: {
  leagueId: string;
  teams: Team[];
  players: Player[];
  rostersByTeamId: Map<string, TeamRoster | null>;
  scoutsByTeamId?: Map<string, number>;
}): LeagueBuilderFarmScoutingValidationReport {
  const blockers: string[] = [];
  const warnings: string[] = [];
  const limitations = [
    'Each team must hire two League Builder scouts before Franchise Setup can copy farm/scouting state.',
    'Scouting output remains imperfect and true ratings stay hidden until call-up/reveal.',
  ];
  const teams: LeagueBuilderFarmScoutingTeamReport[] = [];
  let bridgeRequired = false;
  let bridgeAllowed = true;

  for (const team of input.teams) {
    const roster = input.rostersByTeamId.get(team.id) ?? null;
    if (!roster) {
      blockers.push(`${team.name}: missing League Builder roster.`);
      bridgeAllowed = false;
      teams.push({
        teamId: team.id,
        teamName: team.name,
        MLB: 0,
        FARM: 0,
        hiddenFarm: 0,
        visibleSafeMetadata: 0,
        missingFarm: V1_FARM_PLAYERS_PER_TEAM,
        scouts: 0,
      });
      continue;
    }

    const mlbPlayers = input.players.filter((player) =>
      hasAssignment(player, input.leagueId, team.id, 'MLB'),
    );
    const farmPlayers = input.players.filter((player) =>
      hasAssignment(player, input.leagueId, team.id, 'FARM'),
    );
    const farmIds = farmPlayers.map((player) => player.id);
    const hiddenFarm = farmPlayers.filter((player) => player.ratingRevealState !== 'revealed').length;
    const visibleSafeMetadata = farmPlayers.filter(hasVisibleSafeProspectMetadata).length;
    const missingFarm = Math.max(0, V1_FARM_PLAYERS_PER_TEAM - farmPlayers.length);
    const scoutCount = input.scoutsByTeamId?.get(team.id) ?? 0;

    teams.push({
      teamId: team.id,
      teamName: team.name,
      MLB: mlbPlayers.length,
      FARM: farmPlayers.length,
      hiddenFarm,
      visibleSafeMetadata,
      missingFarm,
      scouts: scoutCount,
    });

    if (uniqueCount(roster.farmRoster) !== roster.farmRoster.length) {
      blockers.push(`${team.name}: FARM roster contains duplicate player ids.`);
      bridgeAllowed = false;
    }
    if (!sameIdSet(roster.farmRoster, farmIds)) {
      blockers.push(`${team.name}: FARM roster does not match player FARM assignments.`);
      bridgeAllowed = false;
    }
    if (mlbPlayers.length !== V1_MLB_PLAYERS_PER_TEAM) {
      blockers.push(`${team.name}: expected ${V1_MLB_PLAYERS_PER_TEAM} MLB players; found ${mlbPlayers.length}.`);
      bridgeAllowed = false;
    }
    if (farmPlayers.length > V1_FARM_PLAYERS_PER_TEAM) {
      blockers.push(`${team.name}: expected at most ${V1_FARM_PLAYERS_PER_TEAM} FARM players; found ${farmPlayers.length}.`);
      bridgeAllowed = false;
    }
    if (farmPlayers.length < V1_FARM_PLAYERS_PER_TEAM) {
      bridgeRequired = true;
      blockers.push(`${team.name}: has ${farmPlayers.length}/${V1_FARM_PLAYERS_PER_TEAM} FARM players; run the League Builder startup prospect draft.`);
      bridgeAllowed = false;
    }
    if (scoutCount !== 2) {
      blockers.push(`${team.name}: expected 2 hired scouts; found ${scoutCount}.`);
      bridgeAllowed = false;
    }
    const revealedFarm = farmPlayers.filter((player) => player.ratingRevealState === 'revealed');
    if (revealedFarm.length > 0) {
      blockers.push(`${team.name}: ${revealedFarm.length} FARM player(s) have revealed ratings before call-up.`);
      bridgeAllowed = false;
    }
    const missingMetadata = farmPlayers.length - visibleSafeMetadata;
    if (missingMetadata > 0) {
      warnings.push(`${team.name}: ${missingMetadata} FARM player(s) lack visible-safe prospect/scouting metadata.`);
    }
  }

  const status: LeagueBuilderFarmScoutingValidationStatus =
    blockers.length > 0
      ? 'blocked'
      : bridgeRequired
        ? 'repairable-by-bridge'
        : 'prepared';

  return {
    validationVersion: LEAGUE_BUILDER_FARM_SCOUTING_VALIDATION_VERSION,
    ownership: LEAGUE_BUILDER_FARM_SCOUTING_OWNERSHIP,
    bridgePolicy: STARTUP_FARM_SCOUTING_BRIDGE_POLICY,
    leagueId: input.leagueId,
    status,
    prepared: status === 'prepared',
    bridgeRequired,
    bridgeAllowed: status !== 'blocked' && bridgeAllowed,
    blockers,
    warnings,
    limitations,
    teams,
  };
}

export async function validatePreparedLeagueBuilderFarmScoutingState(
  leagueId: string,
): Promise<LeagueBuilderFarmScoutingValidationReport> {
  const league = await getLeagueTemplate(leagueId);
  if (!league) {
    return {
      validationVersion: LEAGUE_BUILDER_FARM_SCOUTING_VALIDATION_VERSION,
      ownership: LEAGUE_BUILDER_FARM_SCOUTING_OWNERSHIP,
      bridgePolicy: STARTUP_FARM_SCOUTING_BRIDGE_POLICY,
      leagueId,
      status: 'blocked',
      prepared: false,
      bridgeRequired: false,
      bridgeAllowed: false,
      blockers: [`League template "${leagueId}" not found.`],
      warnings: [],
      limitations: [],
      teams: [],
    };
  }

  const [players, allTeams] = await Promise.all([
    getAllPlayers(),
    getAllTeams(),
  ]);
  const scouts = await getScoutProfilesForLeague(leagueId);
  const scoutsByTeamId = new Map<string, number>();
  for (const scout of scouts) {
    if (!scout.teamId) continue;
    scoutsByTeamId.set(scout.teamId, (scoutsByTeamId.get(scout.teamId) ?? 0) + 1);
  }
  const teams = league.teamIds.map((teamId) => allTeams.find((team) => team.id === teamId)).filter(Boolean) as Team[];
  const missingTeamIds = league.teamIds.filter((teamId) => !teams.some((team) => team.id === teamId));
  const rosterEntries = await Promise.all(
    league.teamIds.map(async (teamId) => [teamId, await getTeamRoster(teamId)] as const),
  );
  const report = validateLeagueBuilderFarmScoutingHandoffState({
    leagueId,
    teams,
    players,
    rostersByTeamId: new Map(rosterEntries),
    scoutsByTeamId,
  });

  if (missingTeamIds.length === 0) return report;
  return {
    ...report,
    status: 'blocked',
    prepared: false,
    bridgeAllowed: false,
    blockers: [
      ...report.blockers,
      ...missingTeamIds.map((teamId) => `Team "${teamId}" not found for league "${leagueId}".`),
    ],
  };
}
