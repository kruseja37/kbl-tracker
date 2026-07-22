import type { RegisteredPool, TeamCapIdentity } from '../engines/leagueConstruction';
import type { LeagueTemplate, Player, Team } from './leagueBuilderStorage';
import type { SnakeLiveJsonObject } from './snakeLiveRoomTypes';

export const SNAKE_LIVE_CATALOG_FORMAT = 'snake-live-catalog-v1' as const;
export const SNAKE_LIVE_FARM_CATALOG_FORMAT = 'snake-live-farm-catalog-v1' as const;

export interface SnakeLiveCatalogSource {
  league: LeagueTemplate;
  teams: readonly Team[];
  players: readonly Player[];
  registeredPool: RegisteredPool;
  /** Exact snakeSetup.clubs team ids for this live room. */
  activeTeamIds: readonly string[];
  /** Exact snakeSetup.poolPlayerIds for this live room. */
  activePoolPlayerIds: readonly string[];
}

export interface SnakeLiveCatalogData {
  formatVersion: typeof SNAKE_LIVE_CATALOG_FORMAT;
  league: LeagueTemplate;
  teams: Team[];
  players: Player[];
  registeredPool: RegisteredPool;
}

export interface SnakeLiveFarmProspectIdentity {
  id: string;
  firstName: string;
  lastName: string;
  primaryPosition: string;
  secondaryPosition?: string | null;
}

export interface SnakeLiveFarmRosterPlayer {
  id: string;
  name: string;
  position: string;
}

export interface SnakeLiveFarmCatalogSource {
  league: LeagueTemplate;
  teams: readonly Team[];
  prospects: readonly SnakeLiveFarmProspectIdentity[];
  existingFarmRostersByTeamId: Readonly<Record<string, readonly SnakeLiveFarmRosterPlayer[]>>;
  activeTeamIds: readonly string[];
  activeProspectIds: readonly string[];
  farmTarget: number;
}

export interface SnakeLiveFarmCatalogData {
  formatVersion: typeof SNAKE_LIVE_FARM_CATALOG_FORMAT;
  league: {
    id: string;
    name: string;
    teamIds: string[];
    tier?: LeagueTemplate['tier'];
  };
  teams: Array<{
    id: string;
    name: string;
    abbreviation: string;
    colors: { primary: string; secondary: string; accent?: string };
    logoUrl?: string;
    farmArchetypeKey: string;
  }>;
  prospects: SnakeLiveFarmProspectIdentity[];
  existingFarmRostersByTeamId: Record<string, SnakeLiveFarmRosterPlayer[]>;
  farmTarget: number;
}

const FORBIDDEN_NORMALIZED_KEYS = new Set([
  'hiddenpersonalitymodifiers',
  'salaryfactors',
  'prospectprofile',
  'backstory',
  'historicallegend',
  'edithistory',
  'rosterdesign',
  'boardrankoverrides',
  'rankoverrides',
  'seatboard',
  'seatboards',
  'farmseatboard',
  'farmseatboards',
  'rankings',
  'designslots',
  'zerointerestplayerids',
  'frozenplayerids',
  'privatepayload',
  'privateboard',
  'roomlogbyteamid',
  'opentradeoffers',
  'snakecompanions',
  'companionroompublication',
  'correctionsnapshots',
  'farmprospectsnapshot',
  'seatingcertificate',
  'hosttokenhash',
  'creationhash',
  'requesthash',
  'eventkey',
]);

function normalizeKey(key: string): string {
  return key.toLocaleLowerCase().replace(/[^a-z0-9]/g, '');
}

function isForbiddenKey(key: string): boolean {
  const normalized = normalizeKey(key);
  return FORBIDDEN_NORMALIZED_KEYS.has(normalized)
    || normalized.startsWith('private')
    || normalized.endsWith('hash')
    || normalized.includes('lineup')
    || normalized.includes('rotation');
}

export function snakeLiveCatalogForbiddenPath(value: unknown, path = '$'): string | null {
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      const result = snakeLiveCatalogForbiddenPath(value[index], `${path}[${index}]`);
      if (result) return result;
    }
    return null;
  }
  if (!value || typeof value !== 'object') return null;
  for (const [key, child] of Object.entries(value)) {
    const nextPath = `${path}.${key}`;
    if (isForbiddenKey(key)) return nextPath;
    const result = snakeLiveCatalogForbiddenPath(child, nextPath);
    if (result) return result;
  }
  return null;
}

function defined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)) as T;
}

function copyCapIdentity(value: TeamCapIdentity | undefined): Record<string, unknown> | undefined {
  if (!value) return undefined;
  return defined({
    bandPriorities: value.bandPriorities ? { ...value.bandPriorities } : undefined,
    increase: [...value.increase],
    decrease: [...value.decrease],
    rawShift: value.rawShift ? { ...value.rawShift } : undefined,
  });
}

function publicLeague(league: LeagueTemplate): Record<string, unknown> {
  return defined({
    id: league.id,
    name: league.name,
    description: league.description,
    createdDate: league.createdDate,
    lastModified: league.lastModified,
    teamIds: [...league.teamIds],
    conferences: league.conferences.map((conference) => ({
      id: conference.id,
      name: conference.name,
      abbreviation: conference.abbreviation,
      divisionIds: [...conference.divisionIds],
    })),
    divisions: league.divisions.map((division) => ({
      id: division.id,
      name: division.name,
      conferenceId: division.conferenceId,
      teamIds: [...division.teamIds],
    })),
    defaultRulesPreset: league.defaultRulesPreset,
    draftFormat: league.draftFormat,
    tier: league.tier,
    salaryCap: league.salaryCap,
    balanceMode: league.balanceMode,
    logoUrl: league.logoUrl,
    color: league.color,
  });
}

function publicTeam(team: Team): Record<string, unknown> {
  return defined({
    id: team.id,
    name: team.name,
    abbreviation: team.abbreviation,
    location: team.location,
    nickname: team.nickname,
    colors: defined({
      primary: team.colors.primary,
      secondary: team.colors.secondary,
      accent: team.colors.accent,
    }),
    logoUrl: team.logoUrl,
    leagueIds: [...team.leagueIds],
    capIdentity: copyCapIdentity(team.capIdentity),
    mlbArchetypeKey: team.mlbArchetypeKey,
    farmArchetypeKey: team.farmArchetypeKey,
    createdDate: team.createdDate,
    lastModified: team.lastModified,
  });
}

function publicFarmLeague(
  league: LeagueTemplate,
  activeTeamIds: readonly string[],
): Record<string, unknown> {
  return defined({
    id: league.id,
    name: league.name,
    teamIds: [...activeTeamIds],
    tier: league.tier,
  });
}

function publicFarmTeam(team: Team): Record<string, unknown> {
  return defined({
    id: team.id,
    name: team.name,
    abbreviation: team.abbreviation,
    colors: defined({
      primary: team.colors.primary,
      secondary: team.colors.secondary,
      accent: team.colors.accent,
    }),
    logoUrl: team.logoUrl,
    farmArchetypeKey: team.farmArchetypeKey,
  });
}

function publicPlayer(player: Player): Record<string, unknown> {
  return defined({
    id: player.id,
    sourceId: player.sourceId,
    versionGroupId: player.versionGroupId,
    versionLabel: player.versionLabel,
    firstName: player.firstName,
    lastName: player.lastName,
    nickname: player.nickname,
    nicknames: player.nicknames ? [...player.nicknames] : undefined,
    archetype: player.archetype,
    baseFameTier: player.baseFameTier,
    gender: player.gender,
    jerseyNumber: player.jerseyNumber,
    age: player.age,
    bats: player.bats,
    throws: player.throws,
    armSlot: player.armSlot,
    primaryPosition: player.primaryPosition,
    secondaryPosition: player.secondaryPosition,
    power: player.power,
    contact: player.contact,
    speed: player.speed,
    fielding: player.fielding,
    arm: player.arm,
    velocity: player.velocity,
    junk: player.junk,
    accuracy: player.accuracy,
    arsenal: [...player.arsenal],
    overallGrade: player.overallGrade,
    trait1: player.trait1,
    trait2: player.trait2,
    personality: player.personality,
    chemistry: player.chemistry,
    morale: player.morale,
    mojo: player.mojo,
    fame: player.fame,
    salary: player.salary,
    settledSalary: player.settledSalary,
    contractYears: player.contractYears,
    ratingRevealState: player.ratingRevealState,
    ratingRevealedAt: player.ratingRevealedAt,
    createdDate: player.createdDate,
    lastModified: player.lastModified,
    isCustom: player.isCustom,
    sourceDatabase: player.sourceDatabase,
    historicalSourceId: player.historicalSourceId,
    historicalProfileType: player.historicalProfileType,
    hometown: player.hometown ? { ...player.hometown } : undefined,
  });
}

function publicRegisteredPool(pool: RegisteredPool): Record<string, unknown> {
  return defined({
    leagueId: pool.leagueId,
    tier: pool.tier,
    balanceMode: pool.balanceMode,
    players: pool.players.map((player) => ({ id: player.id, iv: player.iv, salary: player.salary })),
    tierCap: pool.tierCap,
    luxuryCaps: pool.luxuryCaps.map((row) => defined({
      group: row.group,
      stat: row.stat,
      topN: row.topN,
      cap: row.cap,
      penaltyCurve: row.penaltyCurve,
      penaltyPer100: row.penaltyPer100,
      minAdder: row.minAdder,
      ratingBasis: row.ratingBasis,
    })),
    pickValueChart: pool.pickValueChart.map((row) => ({ pick: row.pick, value: row.value })),
    totalSlots: pool.totalSlots,
    poolSurplusWarning: pool.poolSurplusWarning,
    locked: pool.locked,
    lockedAt: pool.lockedAt,
  });
}

function objectValue(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function idSet(rows: readonly unknown[]): Set<string> | null {
  const ids = new Set<string>();
  for (const row of rows) {
    if (!objectValue(row) || typeof row.id !== 'string' || !row.id) return null;
    if (ids.has(row.id)) return null;
    ids.add(row.id);
  }
  return ids;
}

function sameIds(left: readonly string[], right: Set<string>): boolean {
  return left.length === right.size && left.every((id) => right.has(id));
}

function hasOnlyKeys(value: Record<string, unknown>, allowed: readonly string[]): boolean {
  return Object.keys(value).every((key) => allowed.includes(key));
}

function validFarmCatalogEnvelope(catalog: SnakeLiveJsonObject): boolean {
  if (!hasOnlyKeys(catalog, [
    'formatVersion', 'league', 'teams', 'prospects', 'existingFarmRostersByTeamId', 'farmTarget',
  ])) return false;
  if (!objectValue(catalog.league)
    || !hasOnlyKeys(catalog.league, ['id', 'name', 'teamIds', 'tier'])
    || typeof catalog.league.id !== 'string'
    || !catalog.league.id
    || typeof catalog.league.name !== 'string'
    || !catalog.league.name.trim()
    || (catalog.league.tier !== undefined
      && (typeof catalog.league.tier !== 'string' || !catalog.league.tier.trim()))
    || !Array.isArray(catalog.league.teamIds)
    || !catalog.league.teamIds.every((id) => typeof id === 'string' && Boolean(id))) return false;
  if (!Array.isArray(catalog.teams) || !catalog.teams.every((team) => {
    if (!objectValue(team)
      || !hasOnlyKeys(team, ['id', 'name', 'abbreviation', 'colors', 'logoUrl', 'farmArchetypeKey'])
      || typeof team.id !== 'string'
      || !team.id
      || typeof team.name !== 'string'
      || !team.name.trim()
      || typeof team.abbreviation !== 'string'
      || !team.abbreviation.trim()
      || !objectValue(team.colors)
      || !hasOnlyKeys(team.colors, ['primary', 'secondary', 'accent'])
      || typeof team.colors.primary !== 'string'
      || !team.colors.primary.trim()
      || typeof team.colors.secondary !== 'string'
      || !team.colors.secondary.trim()
      || typeof team.farmArchetypeKey !== 'string'
      || !team.farmArchetypeKey.trim()) return false;
    return (team.logoUrl === undefined || typeof team.logoUrl === 'string')
      && (team.colors.accent === undefined || typeof team.colors.accent === 'string');
  })) return false;
  return true;
}

function toJsonObject(value: Record<string, unknown>): SnakeLiveJsonObject {
  return JSON.parse(JSON.stringify(value)) as SnakeLiveJsonObject;
}

export function buildSnakeLiveCatalog(source: SnakeLiveCatalogSource): SnakeLiveJsonObject {
  if (source.registeredPool.leagueId !== source.league.id) {
    throw new Error('The live catalog pool does not belong to the active league.');
  }
  const expectedTeamIds = [...source.activeTeamIds];
  if (expectedTeamIds.length === 0) throw new Error('The live catalog has no active teams.');
  if (new Set(expectedTeamIds).size !== expectedTeamIds.length) {
    throw new Error('The live catalog request has duplicate active team ids.');
  }
  if (source.league.teamIds.length !== expectedTeamIds.length
    || expectedTeamIds.some((teamId) => !source.league.teamIds.includes(teamId))) {
    throw new Error('The live catalog league does not match the active draft teams.');
  }
  const teamById = new Map(source.teams.map((team) => [team.id, team]));
  if (teamById.size !== source.teams.length) throw new Error('The live catalog has duplicate team ids.');
  const activeTeams = expectedTeamIds.map((teamId) => teamById.get(teamId));
  if (activeTeams.some((team) => !team)) throw new Error('The live catalog is missing an active team.');
  const missingIdentity = activeTeams.find((team) => (
    !team?.mlbArchetypeKey?.trim() || !team.farmArchetypeKey?.trim()
  ));
  if (missingIdentity) {
    throw new Error(`The live catalog cannot freeze ${missingIdentity.name} without both draft identities.`);
  }

  const expectedPoolIds = [...source.activePoolPlayerIds];
  if (expectedPoolIds.length === 0) throw new Error('The live catalog has no active-pool players.');
  if (new Set(expectedPoolIds).size !== expectedPoolIds.length) {
    throw new Error('The live catalog request has duplicate active-pool player ids.');
  }
  const poolIds = source.registeredPool.players.map((player) => player.id);
  if (new Set(poolIds).size !== poolIds.length) throw new Error('The live catalog pool has duplicate player ids.');
  if (poolIds.length !== expectedPoolIds.length
    || expectedPoolIds.some((playerId) => !poolIds.includes(playerId))) {
    throw new Error('The live catalog pool does not match the requested active pool.');
  }
  const playerById = new Map(source.players.map((player) => [player.id, player]));
  if (playerById.size !== source.players.length) throw new Error('The live catalog has duplicate player ids.');
  const activePlayers = expectedPoolIds.map((playerId) => playerById.get(playerId));
  if (activePlayers.some((player) => !player)) throw new Error('The live catalog is missing an active-pool player.');

  const catalog = toJsonObject({
    formatVersion: SNAKE_LIVE_CATALOG_FORMAT,
    league: publicLeague(source.league),
    teams: activeTeams.map((team) => publicTeam(team!)),
    players: activePlayers.map((player) => publicPlayer(player!)),
    registeredPool: publicRegisteredPool(source.registeredPool),
  });
  const forbiddenPath = snakeLiveCatalogForbiddenPath(catalog);
  if (forbiddenPath) throw new Error(`The live catalog contains private data at ${forbiddenPath}.`);
  return catalog;
}

export function readSnakeLiveCatalog(catalog: SnakeLiveJsonObject): SnakeLiveCatalogData | null {
  if (snakeLiveCatalogForbiddenPath(catalog)) return null;
  if (catalog.formatVersion !== SNAKE_LIVE_CATALOG_FORMAT) return null;
  if (!objectValue(catalog.league) || !Array.isArray(catalog.teams)
    || !Array.isArray(catalog.players) || !objectValue(catalog.registeredPool)) return null;
  if (typeof catalog.league.id !== 'string' || !Array.isArray(catalog.league.teamIds)) return null;
  if (catalog.registeredPool.leagueId !== catalog.league.id
    || !Array.isArray(catalog.registeredPool.players)) return null;
  const teams = idSet(catalog.teams);
  const players = idSet(catalog.players);
  const poolPlayers = idSet(catalog.registeredPool.players);
  const teamIds = catalog.league.teamIds;
  if (!teams || !players || !poolPlayers || !teamIds.every((id): id is string => typeof id === 'string')) return null;
  if (teamIds.length === 0 || players.size === 0 || !sameIds(teamIds, teams) || players.size !== poolPlayers.size
    || [...players].some((id) => !poolPlayers.has(id))) return null;
  return catalog as unknown as SnakeLiveCatalogData;
}

function validFarmRosterPlayer(value: unknown): value is SnakeLiveFarmRosterPlayer {
  return objectValue(value)
    && Object.keys(value).every((key) => ['id', 'name', 'position'].includes(key))
    && typeof value.id === 'string'
    && Boolean(value.id)
    && typeof value.name === 'string'
    && Boolean(value.name)
    && typeof value.position === 'string'
    && Boolean(value.position);
}

/**
 * FARM companions receive public identity only. Scout grades and all true
 * prospect data stay in the approved team's private board row.
 */
export function buildSnakeLiveFarmCatalog(source: SnakeLiveFarmCatalogSource): SnakeLiveJsonObject {
  const expectedTeamIds = [...source.activeTeamIds];
  if (expectedTeamIds.length === 0 || new Set(expectedTeamIds).size !== expectedTeamIds.length) {
    throw new Error('The FARM live catalog needs unique active teams.');
  }
  if (source.league.teamIds.length !== expectedTeamIds.length
    || expectedTeamIds.some((teamId) => !source.league.teamIds.includes(teamId))) {
    throw new Error('The FARM live catalog league does not match the active draft teams.');
  }
  const teamById = new Map(source.teams.map((team) => [team.id, team]));
  if (teamById.size !== source.teams.length) throw new Error('The FARM live catalog has duplicate team ids.');
  const activeTeams = expectedTeamIds.map((teamId) => teamById.get(teamId));
  if (activeTeams.some((team) => !team)) throw new Error('The FARM live catalog is missing an active team.');
  const missingIdentity = activeTeams.find((team) => !team?.farmArchetypeKey?.trim());
  if (missingIdentity) throw new Error(`The FARM live catalog cannot freeze ${missingIdentity.name} without a FARM identity.`);

  const expectedProspectIds = [...source.activeProspectIds];
  if (expectedProspectIds.length === 0 || new Set(expectedProspectIds).size !== expectedProspectIds.length) {
    throw new Error('The FARM live catalog needs unique active prospects.');
  }
  const prospectById = new Map(source.prospects.map((prospect) => [prospect.id, prospect]));
  if (prospectById.size !== source.prospects.length) throw new Error('The FARM live catalog has duplicate prospect ids.');
  const activeProspects = expectedProspectIds.map((prospectId) => prospectById.get(prospectId));
  if (activeProspects.some((prospect) => !prospect)) throw new Error('The FARM live catalog is missing an active prospect.');
  if (!Number.isInteger(source.farmTarget) || source.farmTarget < 1) {
    throw new Error('The FARM live catalog needs a positive roster target.');
  }

  const rosterTeamIds = Object.keys(source.existingFarmRostersByTeamId).sort();
  if (rosterTeamIds.length !== expectedTeamIds.length
    || expectedTeamIds.some((teamId) => !rosterTeamIds.includes(teamId))) {
    throw new Error('The FARM live catalog rosters do not match the active draft teams.');
  }
  const existingFarmRostersByTeamId = Object.fromEntries(expectedTeamIds.map((teamId) => {
    const roster = source.existingFarmRostersByTeamId[teamId] ?? [];
    const rosterIds = roster.map((player) => player.id);
    if (new Set(rosterIds).size !== rosterIds.length || roster.some((player) => !validFarmRosterPlayer(player))) {
      throw new Error(`The FARM live catalog has an invalid public roster for ${teamId}.`);
    }
    return [teamId, roster.map((player) => ({ ...player }))];
  }));

  const catalog = toJsonObject({
    formatVersion: SNAKE_LIVE_FARM_CATALOG_FORMAT,
    league: publicFarmLeague(source.league, expectedTeamIds),
    teams: activeTeams.map((team) => publicFarmTeam(team!)),
    prospects: activeProspects.map((prospect) => defined({
      id: prospect!.id,
      firstName: prospect!.firstName,
      lastName: prospect!.lastName,
      primaryPosition: prospect!.primaryPosition,
      secondaryPosition: prospect!.secondaryPosition,
    })),
    existingFarmRostersByTeamId,
    farmTarget: source.farmTarget,
  });
  const forbiddenPath = snakeLiveCatalogForbiddenPath(catalog);
  if (forbiddenPath) throw new Error(`The FARM live catalog contains private data at ${forbiddenPath}.`);
  return catalog;
}

export function readSnakeLiveFarmCatalog(catalog: SnakeLiveJsonObject): SnakeLiveFarmCatalogData | null {
  if (snakeLiveCatalogForbiddenPath(catalog)) return null;
  if (catalog.formatVersion !== SNAKE_LIVE_FARM_CATALOG_FORMAT) return null;
  if (!validFarmCatalogEnvelope(catalog)) return null;
  if (!objectValue(catalog.league) || !Array.isArray(catalog.teams)
    || !Array.isArray(catalog.prospects) || !objectValue(catalog.existingFarmRostersByTeamId)) return null;
  if (typeof catalog.league.id !== 'string' || !Array.isArray(catalog.league.teamIds)
    || !Number.isInteger(catalog.farmTarget) || Number(catalog.farmTarget) < 1) return null;
  const teams = idSet(catalog.teams);
  const prospects = idSet(catalog.prospects);
  const teamIds = catalog.league.teamIds;
  if (!teams || !prospects || prospects.size === 0
    || !teamIds.every((id): id is string => typeof id === 'string')
    || !sameIds(teamIds, teams)
    || catalog.teams.some((team, index) => !objectValue(team) || team.id !== teamIds[index])) return null;
  const rosterTeamIds = Object.keys(catalog.existingFarmRostersByTeamId);
  if (rosterTeamIds.length !== teamIds.length || teamIds.some((teamId) => !rosterTeamIds.includes(teamId))) return null;
  for (const teamId of teamIds) {
    const roster = catalog.existingFarmRostersByTeamId[teamId];
    if (!Array.isArray(roster) || !roster.every(validFarmRosterPlayer)) return null;
    const rosterIds = (roster as unknown as SnakeLiveFarmRosterPlayer[]).map((player) => player.id);
    if (new Set(rosterIds).size !== rosterIds.length) return null;
  }
  for (const prospect of catalog.prospects) {
    if (!objectValue(prospect)
      || !Object.keys(prospect).every((key) => [
        'id', 'firstName', 'lastName', 'primaryPosition', 'secondaryPosition',
      ].includes(key))
      || typeof prospect.firstName !== 'string'
      || typeof prospect.lastName !== 'string'
      || typeof prospect.primaryPosition !== 'string'
      || (prospect.secondaryPosition !== undefined
        && prospect.secondaryPosition !== null
        && typeof prospect.secondaryPosition !== 'string')) return null;
  }
  return catalog as unknown as SnakeLiveFarmCatalogData;
}

export function readSnakeLiveCatalogForPhase(
  catalog: SnakeLiveJsonObject,
  phase: 'MLB' | 'FARM',
): SnakeLiveCatalogData | SnakeLiveFarmCatalogData | null {
  return phase === 'FARM' ? readSnakeLiveFarmCatalog(catalog) : readSnakeLiveCatalog(catalog);
}

export function snakeLiveCatalogJson(data: SnakeLiveCatalogData): SnakeLiveJsonObject {
  return data as unknown as SnakeLiveJsonObject;
}
