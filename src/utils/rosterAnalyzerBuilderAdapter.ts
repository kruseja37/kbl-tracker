import {
  analyzeRoster,
  createDefaultRosterAnalyzerConfig,
  type AnalyzerBullpenRole,
  type AnalyzerDepthChartEntry,
  type AnalyzerLineupSlot,
  type AnalyzerPlayer,
  type RosterAnalyzerConfig,
  type RosterAnalyzerInput,
  type RosterAnalyzerReport,
} from '../engines/rosterAnalyzerEngine';
import type {
  LeagueAssignment,
  Player,
  Team,
  TeamRoster,
} from './leagueBuilderStorage';

export type BuilderAnalyzerRosterStatus = NonNullable<AnalyzerPlayer['rosterStatus']>;

export interface BuilderTeamAnalyzerAdapterInput {
  leagueId?: string;
  team: Pick<Team, 'id' | 'name'>;
  players: Player[];
  roster: TeamRoster;
  generatedAt?: string;
  config?: Partial<RosterAnalyzerConfig>;
}

export interface BuilderLeagueAnalyzerAdapterInput {
  leagueId?: string;
  teams: Array<Pick<Team, 'id' | 'name'>>;
  players: Player[];
  rostersByTeamId: Record<string, TeamRoster | undefined>;
  generatedAt?: string;
  config?: Partial<RosterAnalyzerConfig>;
}

export interface BuilderTeamAnalyzerReport {
  teamId: string;
  report: RosterAnalyzerReport;
}

export interface NormalizedBuilderPlayerStatus {
  status: BuilderAnalyzerRosterStatus;
  rosterLevel?: 'MLB' | 'FARM';
  relatedToTeam: boolean;
  reasons: string[];
}

const ACTIVE_STATUSES = new Set<BuilderAnalyzerRosterStatus>(['MLB']);
const FARM_STATUSES = new Set<BuilderAnalyzerRosterStatus>(['FARM']);

function normalizeRawRosterStatus(value: unknown): BuilderAnalyzerRosterStatus {
  switch (String(value ?? '').toUpperCase()) {
    case 'MLB':
    case 'ACTIVE':
      return 'MLB';
    case 'FARM':
    case 'AAA':
      return 'FARM';
    case 'FREE_AGENT':
    case 'FREE AGENT':
    case 'FA':
      return 'FREE_AGENT';
    case 'RELEASED':
      return 'RELEASED';
    case 'RETIRED':
      return 'RETIRED';
    case 'INACTIVE':
      return 'INACTIVE';
    case 'UNASSIGNED':
      return 'UNASSIGNED';
    default:
      return 'UNKNOWN';
  }
}

function playerName(player: Player): string {
  return `${player.firstName ?? ''} ${player.lastName ?? ''}`.trim() || player.id;
}

function matchesLeague(assignment: LeagueAssignment | Record<string, unknown>, leagueId?: string): boolean {
  return !leagueId || assignment.leagueId === leagueId;
}

function findTeamAssignment(player: Player, teamId: string, leagueId?: string): LeagueAssignment | Record<string, unknown> | undefined {
  return (player.leagueAssignments ?? []).find((assignment) =>
    matchesLeague(assignment, leagueId) && assignment.teamId === teamId,
  ) as LeagueAssignment | Record<string, unknown> | undefined;
}

function findLeagueAssignment(player: Player, leagueId?: string): LeagueAssignment | Record<string, unknown> | undefined {
  return (player.leagueAssignments ?? []).find((assignment) =>
    matchesLeague(assignment, leagueId),
  ) as LeagueAssignment | Record<string, unknown> | undefined;
}

export function normalizeBuilderPlayerStatus(
  player: Player,
  teamId: string,
  roster: Pick<TeamRoster, 'mlbRoster' | 'farmRoster'>,
  leagueId?: string,
): NormalizedBuilderPlayerStatus {
  const inMlbRoster = roster.mlbRoster.includes(player.id);
  const inFarmRoster = roster.farmRoster.includes(player.id);
  const teamAssignment = findTeamAssignment(player, teamId, leagueId);
  const leagueAssignment = findLeagueAssignment(player, leagueId);
  const assignment = teamAssignment ?? leagueAssignment;
  const rawStatus = (assignment as Record<string, unknown> | undefined)?.rosterStatus;
  const assignmentStatus = assignment ? normalizeRawRosterStatus(rawStatus) : undefined;
  const relatedToTeam = Boolean(teamAssignment) || inMlbRoster || inFarmRoster;
  const reasons: string[] = [];

  if (!relatedToTeam) {
    return {
      status: 'UNASSIGNED',
      relatedToTeam: false,
      reasons: ['Player is not assigned to the selected team or roster list.'],
    };
  }

  if (inMlbRoster && inFarmRoster) {
    reasons.push('Player appears in both MLB and farm roster lists.');
  }

  if (!assignment) {
    return {
      status: 'UNKNOWN',
      relatedToTeam,
      reasons: ['Player has roster list membership but no league assignment.'],
    };
  }

  if (!assignmentStatus || assignmentStatus === 'UNKNOWN') {
    return {
      status: 'UNKNOWN',
      relatedToTeam,
      reasons: ['Player league assignment has a missing or unsupported roster status.'],
    };
  }

  if (!teamAssignment && leagueAssignment) {
    return {
      status: assignmentStatus,
      relatedToTeam,
      reasons: ['Player has league assignment data, but not for the selected team.'],
    };
  }

  if (inMlbRoster && assignmentStatus !== 'MLB') {
    reasons.push(`MLB roster list disagrees with assignment status ${assignmentStatus}.`);
  }

  if (inFarmRoster && assignmentStatus !== 'FARM') {
    reasons.push(`Farm roster list disagrees with assignment status ${assignmentStatus}.`);
  }

  if (!inMlbRoster && !inFarmRoster && (assignmentStatus === 'MLB' || assignmentStatus === 'FARM')) {
    reasons.push(`Assignment status is ${assignmentStatus}, but the player is not in that roster list.`);
  }

  return {
    status: assignmentStatus,
    rosterLevel: assignmentStatus === 'MLB' || assignmentStatus === 'FARM' ? assignmentStatus : undefined,
    relatedToTeam,
    reasons,
  };
}

function isPitcherPosition(position: string | undefined): boolean {
  return ['SP', 'RP', 'CP', 'P', 'SP/RP', 'TWO-WAY'].includes(position ?? '');
}

function mapBuilderPlayer(
  player: Player,
  teamId: string,
  leagueId: string | undefined,
  roster: TeamRoster,
): AnalyzerPlayer {
  const normalized = normalizeBuilderPlayerStatus(player, teamId, roster, leagueId);
  const secondaryPositions = player.secondaryPosition ? [player.secondaryPosition] : [];

  return {
    id: player.id,
    name: playerName(player),
    teamId: normalized.relatedToTeam ? teamId : undefined,
    leagueId,
    primaryPosition: player.primaryPosition,
    secondaryPositions,
    bats: player.bats,
    throws: player.throws,
    isPitcher: isPitcherPosition(player.primaryPosition),
    rosterStatus: normalized.status,
    rosterLevel: normalized.rosterLevel,
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
    arsenal: player.arsenal,
    traits: [player.trait1, player.trait2].filter((trait): trait is string => Boolean(trait)),
    chemistry: player.chemistry,
    personality: player.personality,
    mojo: player.mojo,
    salary: player.salary,
    contractYears: player.contractYears,
    age: player.age,
    optionState: normalized.status === 'FARM'
      ? {
        seasonOptionsUsed: latestOptionCount(player.optionsUsedBySeason),
        maxSeasonOptions: 3,
        ratingRevealState: player.ratingRevealState ?? 'hidden',
        eligibleForCallUp: true,
        eligibleForSendDown: false,
      }
      : undefined,
    stats: {
      source: 'unavailable',
      trust: 'unavailable',
    },
    sourceTrust: normalized.status === 'UNKNOWN' ? 'low' : 'high',
  };
}

function latestOptionCount(optionsUsedBySeason: Player['optionsUsedBySeason']): number | undefined {
  if (!optionsUsedBySeason) return undefined;
  const values = Object.values(optionsUsedBySeason)
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  return values.length > 0 ? Math.max(...values) : undefined;
}

function mapLineupSlots(roster: TeamRoster): AnalyzerLineupSlot[] {
  const slots = roster.lineupWithDH.length > 0 ? roster.lineupWithDH : roster.lineupWithoutDH;
  return slots.map((slot) => ({
    order: slot.battingOrder,
    playerId: slot.playerId,
    position: slot.fieldingPosition,
    handednessContext: roster.lineupWithDH.length > 0 ? 'withDH' : 'noDH',
  }));
}

function mapBullpenRoles(roster: TeamRoster): AnalyzerBullpenRole[] {
  const roles: AnalyzerBullpenRole[] = [];
  for (const playerId of roster.longRelievers ?? []) {
    roles.push({ role: 'long', playerId });
  }
  for (const playerId of roster.setupPitchers ?? []) {
    roles.push({ role: 'setup', playerId });
  }
  if (roster.closingPitcher) {
    roles.push({ role: 'closer', playerId: roster.closingPitcher });
  }
  return roles;
}

function mapDepthChart(roster: TeamRoster): AnalyzerDepthChartEntry[] {
  return Object.entries(roster.depthChart).map(([position, playerIds]) => ({
    position,
    playerIds,
  }));
}

function relatedBuilderPlayers(
  players: Player[],
  teamId: string,
  roster: TeamRoster,
  leagueId?: string,
): Player[] {
  const rosterIds = new Set([...roster.mlbRoster, ...roster.farmRoster]);
  return players.filter((player) =>
    rosterIds.has(player.id) || Boolean(findTeamAssignment(player, teamId, leagueId)),
  );
}

function includeRosterIdForAnalyzerIntegrity(
  playerId: string,
  playerById: Map<string, AnalyzerPlayer>,
  allowedStatuses: Set<BuilderAnalyzerRosterStatus>,
): boolean {
  const player = playerById.get(playerId);
  if (!player) return true;
  return allowedStatuses.has(player.rosterStatus ?? 'UNKNOWN');
}

export function buildBuilderTeamAnalyzerInput({
  leagueId,
  team,
  players,
  roster,
  generatedAt,
  config,
}: BuilderTeamAnalyzerAdapterInput): RosterAnalyzerInput {
  const mappedPlayers = relatedBuilderPlayers(players, team.id, roster, leagueId)
    .map((player) => mapBuilderPlayer(player, team.id, leagueId, roster));
  const playerById = new Map(mappedPlayers.map((player) => [player.id, player]));
  const activePlayerIds = roster.mlbRoster.filter((playerId) =>
    includeRosterIdForAnalyzerIntegrity(playerId, playerById, ACTIVE_STATUSES),
  );
  const farmPlayerIds = roster.farmRoster.filter((playerId) =>
    includeRosterIdForAnalyzerIntegrity(playerId, playerById, FARM_STATUSES),
  );

  return {
    identity: {
      mode: 'builder',
      surface: 'builder_team',
      leagueId,
      teamId: team.id,
      generatedAt,
    },
    teamName: team.name,
    players: mappedPlayers,
    roster: {
      activePlayerIds,
      farmPlayerIds,
      lineupSlots: mapLineupSlots(roster),
      rotationIds: roster.startingRotation,
      bullpenRoles: mapBullpenRoles(roster),
      depthChart: mapDepthChart(roster),
      pinchHitOrderIds: roster.pinchHitOrder,
      pinchRunOrderIds: roster.pinchRunOrder,
    },
    config: createDefaultRosterAnalyzerConfig({
      presetId: 'builder_roster_read_only_v1',
      salary: {
        enabled: true,
        unit: 'unknown',
      },
      ...(config ?? {}),
    }),
  };
}

export function analyzeBuilderTeamRoster(input: BuilderTeamAnalyzerAdapterInput): RosterAnalyzerReport {
  return analyzeRoster(buildBuilderTeamAnalyzerInput(input));
}

export function analyzeBuilderLeagueRosters(input: BuilderLeagueAnalyzerAdapterInput): BuilderTeamAnalyzerReport[] {
  return input.teams
    .map((team) => {
      const roster = input.rostersByTeamId[team.id];
      if (!roster) return null;
      return {
        teamId: team.id,
        report: analyzeBuilderTeamRoster({
          leagueId: input.leagueId,
          team,
          players: input.players,
          roster,
          generatedAt: input.generatedAt,
          config: input.config,
        }),
      };
    })
    .filter((entry): entry is BuilderTeamAnalyzerReport => Boolean(entry));
}
