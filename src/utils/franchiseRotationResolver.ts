import type { OpponentStarterProfile } from '../engines/lineupVsStarter';

type PitcherRole = NonNullable<OpponentStarterProfile['pitcherRole']>;
type ArmSlot = NonNullable<OpponentStarterProfile['armSlot']>;

export interface OpponentStarterTeamRecord {
  startingRotation?: readonly string[] | null;
}

export interface OpponentStarterPlayerRecord {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  name?: string | null;
  fullName?: string | null;
  throws?: 'L' | 'R' | string | null;
  velocity?: number | null;
  junk?: number | null;
  accuracy?: number | null;
  trait1?: string | null;
  trait2?: string | null;
  traits?: readonly string[] | null;
  arsenal?: readonly string[] | null;
  armSlot?: ArmSlot | string | null;
  pitcherRole?: PitcherRole | string | null;
  primaryPosition?: string | null;
}

export interface OpponentStarterRosterLookup {
  teams?: ReadonlyMap<string, OpponentStarterTeamRecord> | Record<string, OpponentStarterTeamRecord | undefined>;
  players?: ReadonlyMap<string, OpponentStarterPlayerRecord> | Record<string, OpponentStarterPlayerRecord | undefined>;
  getTeam?: (teamId: string) => OpponentStarterTeamRecord | null | undefined;
  getPlayer?: (playerId: string) => OpponentStarterPlayerRecord | null | undefined;
}

export function getRotationStarterId(
  startingRotation: readonly string[] | null | undefined,
  gamesPlayed: number,
): string | null {
  if (!startingRotation?.length) return null;

  const rotationSize = startingRotation.length;
  const wholeGamesPlayed = Number.isFinite(gamesPlayed) ? Math.trunc(gamesPlayed) : 0;
  const rotationIndex = ((wholeGamesPlayed % rotationSize) + rotationSize) % rotationSize;
  return startingRotation[rotationIndex] ?? null;
}

export function resolveOpponentStarterProfile(
  teamId: string,
  gamesPlayed: number,
  rosterLookup: OpponentStarterRosterLookup,
): OpponentStarterProfile | null {
  const team = lookupTeam(rosterLookup, teamId);
  const pitcherId = getRotationStarterId(team?.startingRotation, gamesPlayed);
  if (!pitcherId) return null;

  const pitcher = lookupPlayer(rosterLookup, pitcherId);
  if (!pitcher) return null;

  const throws = pitcher.throws === 'L' ? 'L' : pitcher.throws === 'R' ? 'R' : null;
  if (!throws) return null;

  const traits = pitcher.traits
    ? pitcher.traits.filter((trait): trait is string => Boolean(trait))
    : [pitcher.trait1, pitcher.trait2].filter((trait): trait is string => Boolean(trait));

  return {
    pitcherId,
    pitcherName: pitcher.fullName ?? buildPitcherName(pitcher),
    throws,
    velocity: finiteNumber(pitcher.velocity),
    junk: finiteNumber(pitcher.junk),
    accuracy: finiteNumber(pitcher.accuracy),
    trait1: pitcher.trait1 ?? null,
    trait2: pitcher.trait2 ?? null,
    traits,
    arsenal: pitcher.arsenal ? [...pitcher.arsenal] : undefined,
    armSlot: normalizeArmSlot(pitcher.armSlot),
    pitcherRole: normalizePitcherRole(pitcher.pitcherRole ?? pitcher.primaryPosition),
  };
}

function lookupTeam(
  lookup: OpponentStarterRosterLookup,
  teamId: string,
): OpponentStarterTeamRecord | null | undefined {
  if (lookup.getTeam) return lookup.getTeam(teamId);
  if (!lookup.teams) return undefined;
  if (isReadonlyMap(lookup.teams)) return lookup.teams.get(teamId);
  return lookup.teams[teamId];
}

function lookupPlayer(
  lookup: OpponentStarterRosterLookup,
  playerId: string,
): OpponentStarterPlayerRecord | null | undefined {
  if (lookup.getPlayer) return lookup.getPlayer(playerId);
  if (!lookup.players) return undefined;
  if (isReadonlyMap(lookup.players)) return lookup.players.get(playerId);
  return lookup.players[playerId];
}

function isReadonlyMap<T>(
  value: ReadonlyMap<string, T> | Record<string, T | undefined>,
): value is ReadonlyMap<string, T> {
  return typeof (value as ReadonlyMap<string, T>).get === 'function';
}

function buildPitcherName(player: OpponentStarterPlayerRecord): string {
  if (player.name) return player.name;
  return [player.firstName, player.lastName].filter(Boolean).join(' ').trim() || player.id;
}

function finiteNumber(value: number | null | undefined): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function normalizeArmSlot(value: string | null | undefined): OpponentStarterProfile['armSlot'] {
  return value === 'High' || value === 'Mid' || value === 'Low' || value === 'Sub'
    ? value
    : null;
}

function normalizePitcherRole(value: string | null | undefined): OpponentStarterProfile['pitcherRole'] {
  if (value === 'SP' || value === 'SP/RP' || value === 'RP' || value === 'CP') return value;
  return undefined;
}
