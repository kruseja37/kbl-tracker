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
import {
  getAllFranchisePlayers,
  getFranchiseTeam,
  type Player,
  type Team,
} from './franchisePlayerStorage';
import {
  getFranchiseFarmRoster,
  type FranchiseFarmRecord,
} from './franchiseFarmStorage';
import type { LeagueAssignment } from './leagueBuilderStorage';

export type FranchiseAnalyzerRosterStatus = NonNullable<AnalyzerPlayer['rosterStatus']>;

export interface FranchiseTeamAnalyzerAdapterInput {
  franchiseId: string;
  seasonId: string;
  seasonNumber: number;
  statsScopeId?: string;
  leagueId?: string;
  team: Pick<Team, 'id' | 'name'> & Partial<Team>;
  players: Player[];
  farmRecords?: FranchiseFarmRecord[];
  generatedAt?: string;
  config?: Partial<RosterAnalyzerConfig>;
}

export interface AnalyzeFranchiseTeamRosterFromStorageInput {
  franchiseId: string;
  seasonId: string;
  seasonNumber: number;
  teamId: string;
  statsScopeId?: string;
  leagueId?: string;
  generatedAt?: string;
  config?: Partial<RosterAnalyzerConfig>;
}

const ACTIVE_STATUSES = new Set<FranchiseAnalyzerRosterStatus>(['MLB']);
const FARM_STATUSES = new Set<FranchiseAnalyzerRosterStatus>(['FARM']);
const PITCHER_POSITIONS = new Set(['SP', 'RP', 'CP', 'P', 'SP/RP', 'TWO-WAY']);

function normalizeRawRosterStatus(value: unknown): FranchiseAnalyzerRosterStatus {
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

function matchesLeague(assignment: Pick<LeagueAssignment, 'leagueId'>, leagueId?: string): boolean {
  return !leagueId || assignment.leagueId === leagueId;
}

function assignmentForTeam(player: Player, teamId: string, leagueId?: string): LeagueAssignment | undefined {
  return (player.leagueAssignments ?? []).find((assignment) =>
    matchesLeague(assignment, leagueId) && assignment.teamId === teamId,
  );
}

function normalizeFranchisePlayerStatus(player: Player, teamId: string, leagueId?: string): FranchiseAnalyzerRosterStatus {
  const assignment = assignmentForTeam(player, teamId, leagueId);
  return assignment ? normalizeRawRosterStatus(assignment.rosterStatus) : 'UNASSIGNED';
}

function isPitcherPosition(position: string | undefined): boolean {
  return PITCHER_POSITIONS.has(position ?? '');
}

function mapLineupSlots(team: Partial<Team>): AnalyzerLineupSlot[] {
  const lineupWithDH = team.lineupWithDH ?? [];
  const lineupWithoutDH = team.lineupWithoutDH ?? [];
  const slots = lineupWithDH.length > 0 ? lineupWithDH : lineupWithoutDH;
  return slots.map((slot) => ({
    order: slot.battingOrder,
    playerId: slot.playerId,
    position: slot.fieldingPosition,
    handednessContext: lineupWithDH.length > 0 ? 'withDH' : 'noDH',
  }));
}

function recordArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function mapBullpenRoles(team: Partial<Team>): AnalyzerBullpenRole[] {
  const teamRecord = team as Record<string, unknown>;
  const roles: AnalyzerBullpenRole[] = [];
  for (const playerId of recordArray(teamRecord.longRelievers)) {
    roles.push({ role: 'long', playerId });
  }
  for (const playerId of recordArray(teamRecord.setupPitchers)) {
    roles.push({ role: 'setup', playerId });
  }
  if (typeof teamRecord.closingPitcher === 'string' && teamRecord.closingPitcher) {
    roles.push({ role: 'closer', playerId: teamRecord.closingPitcher });
  }
  return roles;
}

function mapDepthChart(team: Partial<Team>): AnalyzerDepthChartEntry[] {
  const depthChart = (team as Record<string, unknown>).depthChart;
  if (!depthChart || typeof depthChart !== 'object') return [];
  return Object.entries(depthChart as Record<string, unknown>).map(([position, playerIds]) => ({
    position,
    playerIds: recordArray(playerIds),
  }));
}

function teamSnapshotPlayerIds(team: Partial<Team>): string[] {
  return Array.from(new Set([
    ...(team.lineupWithDH ?? []).map((slot) => slot.playerId),
    ...(team.lineupWithoutDH ?? []).map((slot) => slot.playerId),
    ...(team.startingRotation ?? []),
    ...mapBullpenRoles(team).map((role) => role.playerId),
    ...mapDepthChart(team).flatMap((entry) => entry.playerIds),
    ...recordArray((team as Record<string, unknown>).pinchHitOrder),
    ...recordArray((team as Record<string, unknown>).pinchRunOrder),
    ...recordArray((team as Record<string, unknown>).defensiveSubOrder),
  ].filter(Boolean)));
}

function playerRelatedToTeam(
  player: Player,
  teamId: string,
  farmPlayerIds: Set<string>,
  snapshotPlayerIds: Set<string>,
  leagueId?: string,
): boolean {
  return Boolean(assignmentForTeam(player, teamId, leagueId)) ||
    farmPlayerIds.has(player.id) ||
    snapshotPlayerIds.has(player.id);
}

function latestOptionCount(player: Player): number | undefined {
  const values = Object.values(player.optionsUsedBySeason ?? {})
    .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  return values.length > 0 ? Math.max(...values) : undefined;
}

function mapFranchisePlayer(
  player: Player,
  input: FranchiseTeamAnalyzerAdapterInput,
  farmRecordByPlayerId: Map<string, FranchiseFarmRecord>,
): AnalyzerPlayer {
  const status = normalizeFranchisePlayerStatus(player, input.team.id, input.leagueId);
  const farmRecord = farmRecordByPlayerId.get(player.id);
  const ratingRevealState = farmRecord?.ratingRevealState ?? player.ratingRevealState;

  return {
    id: player.id,
    name: playerName(player),
    teamId: input.team.id,
    leagueId: input.leagueId,
    primaryPosition: player.primaryPosition,
    secondaryPositions: player.secondaryPosition ? [player.secondaryPosition] : [],
    bats: player.bats,
    throws: player.throws,
    isPitcher: isPitcherPosition(player.primaryPosition),
    rosterStatus: status,
    rosterLevel: status === 'MLB' || status === 'FARM' ? status : undefined,
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
    optionState: status === 'FARM'
      ? {
        seasonOptionsUsed: farmRecord?.optionsUsed ?? latestOptionCount(player),
        maxSeasonOptions: 3,
        ratingRevealState: ratingRevealState === 'revealed' ? 'revealed' : 'hidden',
        eligibleForCallUp: true,
        eligibleForSendDown: false,
      }
      : undefined,
    stats: {
      source: 'unavailable',
      trust: 'unavailable',
    },
    sourceTrust: status === 'UNKNOWN' ? 'low' : 'high',
  };
}

function includeRosterIdForAnalyzerIntegrity(
  playerId: string,
  playerById: Map<string, AnalyzerPlayer>,
  allowedStatuses: Set<FranchiseAnalyzerRosterStatus>,
): boolean {
  const player = playerById.get(playerId);
  if (!player) return true;
  return allowedStatuses.has(player.rosterStatus ?? 'UNKNOWN');
}

export function buildFranchiseTeamAnalyzerInput(input: FranchiseTeamAnalyzerAdapterInput): RosterAnalyzerInput {
  const farmRecords = input.farmRecords ?? [];
  const farmRecordByPlayerId = new Map(farmRecords.map((record) => [record.playerId, record]));
  const farmPlayerIdsFromRecords = new Set(farmRecords.map((record) => record.playerId));
  const snapshotIds = teamSnapshotPlayerIds(input.team);
  const snapshotPlayerIds = new Set(snapshotIds);
  const mappedPlayers = input.players
    .filter((player) => playerRelatedToTeam(player, input.team.id, farmPlayerIdsFromRecords, snapshotPlayerIds, input.leagueId))
    .map((player) => mapFranchisePlayer(player, input, farmRecordByPlayerId));
  const playerById = new Map(mappedPlayers.map((player) => [player.id, player]));
  const mlbAssignedIds = mappedPlayers
    .filter((player) => player.rosterStatus === 'MLB')
    .map((player) => player.id);
  const activePlayerIds = Array.from(new Set([...mlbAssignedIds, ...snapshotIds])).filter((playerId) =>
    includeRosterIdForAnalyzerIntegrity(playerId, playerById, ACTIVE_STATUSES),
  );
  const farmAssignedIds = mappedPlayers
    .filter((player) => player.rosterStatus === 'FARM')
    .map((player) => player.id);
  const farmPlayerIds = Array.from(new Set([...farmAssignedIds, ...farmRecords.map((record) => record.playerId)])).filter((playerId) =>
    includeRosterIdForAnalyzerIntegrity(playerId, playerById, FARM_STATUSES),
  );

  return {
    identity: {
      mode: 'franchise',
      surface: 'franchise_team_hub',
      franchiseId: input.franchiseId,
      seasonId: input.seasonId,
      seasonNumber: input.seasonNumber,
      statsScopeId: input.statsScopeId ?? input.seasonId,
      leagueId: input.leagueId,
      teamId: input.team.id,
      generatedAt: input.generatedAt,
    },
    teamName: input.team.name,
    players: mappedPlayers,
    roster: {
      activePlayerIds,
      farmPlayerIds,
      lineupSlots: mapLineupSlots(input.team),
      rotationIds: input.team.startingRotation ?? [],
      bullpenRoles: mapBullpenRoles(input.team),
      depthChart: mapDepthChart(input.team),
      pinchHitOrderIds: recordArray((input.team as Record<string, unknown>).pinchHitOrder),
      pinchRunOrderIds: recordArray((input.team as Record<string, unknown>).pinchRunOrder),
    },
    config: createDefaultRosterAnalyzerConfig({
      presetId: 'franchise_team_hub_read_only_v1',
      salary: {
        enabled: true,
        unit: 'unknown',
      },
      ...(input.config ?? {}),
    }),
  };
}

export function analyzeFranchiseTeamRoster(input: FranchiseTeamAnalyzerAdapterInput): RosterAnalyzerReport {
  return analyzeRoster(buildFranchiseTeamAnalyzerInput(input));
}

export async function analyzeFranchiseTeamRosterFromStorage(
  input: AnalyzeFranchiseTeamRosterFromStorageInput,
): Promise<RosterAnalyzerReport> {
  const [team, players, farmRecords] = await Promise.all([
    getFranchiseTeam(input.franchiseId, input.teamId),
    getAllFranchisePlayers(input.franchiseId),
    getFranchiseFarmRoster(input.franchiseId, input.seasonId, input.teamId),
  ]);

  if (!team) {
    throw new Error(`Franchise team "${input.teamId}" was not found.`);
  }

  return analyzeFranchiseTeamRoster({
    franchiseId: input.franchiseId,
    seasonId: input.seasonId,
    seasonNumber: input.seasonNumber,
    statsScopeId: input.statsScopeId,
    leagueId: input.leagueId,
    team,
    players,
    farmRecords,
    generatedAt: input.generatedAt,
    config: input.config,
  });
}
