import {
  HISTORICAL_ARCHETYPES,
  archetypeCapShift,
  type HistoricalArchetype,
  type ArchetypeStat,
} from '../data/historicalArchetypes';
import {
  BANDS,
  BAND_STATS,
  luxKeyToModStat,
  type Band,
  type BandPriorities,
  type ConstructionPlayer,
  type TeamCapIdentity,
} from './leagueConstruction';
import { archetypeBandPriorities } from './cpuShillBidding';
import type { ModStat } from '../data/tierParams';
import { saveTeam, type Team } from '../utils/leagueBuilderStorage';

const ARCHETYPE_BAND_PRIORITIES_CACHE = new Map<string, BandPriorities>();

function cachedArchetypeBandPriorities(archetype: HistoricalArchetype): BandPriorities {
  const cached = ARCHETYPE_BAND_PRIORITIES_CACHE.get(archetype.id);
  if (cached) return cached;
  const resolved = Object.freeze({ ...archetypeBandPriorities(archetype) }) as BandPriorities;
  ARCHETYPE_BAND_PRIORITIES_CACHE.set(archetype.id, resolved);
  return resolved;
}

export function archetypeStatToModName(stat: ArchetypeStat): string {
  if (stat.startsWith('ROT_') || stat.startsWith('PEN_')) {
    return stat.slice(4);
  }
  return stat;
}

function uniqueModNames(stats: ArchetypeStat[]): string[] {
  return [...new Set(stats.map(archetypeStatToModName))];
}

export function archetypeToCapIdentity(arch: HistoricalArchetype): TeamCapIdentity {
  const rawShift: Partial<Record<ModStat, number>> = {};

  for (const [luxKey, frac] of Object.entries(archetypeCapShift(arch))) {
    const modStat = luxKeyToModStat(luxKey);
    if (!modStat) {
      throw new Error(`Unknown lux key from archetype ${arch.id}: ${luxKey}`);
    }
    rawShift[modStat] = frac;
  }

  return {
    increase: uniqueModNames(arch.boosts),
    decrease: uniqueModNames(arch.nerfs),
    rawShift: rawShift as Record<ModStat, number>,
  };
}

export function resolveClubBandPriorities(input: {
  capIdentity?: TeamCapIdentity | null;
  mlbArchetypeKey?: string | null;
}): BandPriorities | null {
  const priorities = input.capIdentity?.bandPriorities;
  if (priorities && BANDS.some((band) => priorities[band] > 0)) {
    return priorities;
  }

  const archetype = input.mlbArchetypeKey
    ? HISTORICAL_ARCHETYPES.find((candidate) => candidate.id === input.mlbArchetypeKey)
    : undefined;
  if (archetype) {
    return cachedArchetypeBandPriorities(archetype);
  }

  const rawShift = input.capIdentity?.rawShift;
  if (rawShift) {
    const lift = Object.fromEntries(BANDS.map((band) => [band, 0])) as Record<Band, number>;
    for (const band of BANDS) {
      lift[band] = BAND_STATS[band].reduce(
        (sum, stat) => sum + Math.max(0, rawShift[stat] ?? 0),
        0,
      );
    }
    const top = Math.max(...BANDS.map((band) => lift[band]));
    if (top <= 0) {
      return Object.fromEntries(BANDS.map((band) => [band, 1])) as BandPriorities;
    }
    return Object.fromEntries(BANDS.map((band) => [band, lift[band] / top])) as BandPriorities;
  }

  return null;
}

export interface ArchetypeFitRatings {
  isPitcher: boolean;
  role?: string | null;
  twoWayVariant?: ConstructionPlayer['twoWayVariant'];
  power: number;
  contact: number;
  speed: number;
  fielding: number;
  arm: number;
  velocity: number;
  junk: number;
  accuracy: number;
}

const FIT_MULTIPLIER_SPREAD = 0.16;

/** Preserve role-specific identity fit (for example bullpen velocity versus rotation velocity). */
export function archetypeStatFitMultiplier(
  capIdentity: TeamCapIdentity | null | undefined,
  player: ArchetypeFitRatings,
): number | null {
  const rawShift = capIdentity?.rawShift;
  if (!rawShift) return null;
  const role = (player.role ?? '').toUpperCase();
  const startable = player.isPitcher && (role === 'SP' || role === 'SP/RP');
  const relievable = player.isPitcher && (role === 'RP' || role === 'CP' || role === 'SP/RP');
  const twoWay = player.isPitcher && player.twoWayVariant != null;
  const ratings: Partial<Record<ModStat, number>> = player.isPitcher
    ? {
        ...(twoWay ? {
          POW: player.power, CON: player.contact, SPD: player.speed, FLD: player.fielding,
        } : {}),
        ...(startable || (!startable && !relievable) ? {
          ...(!twoWay ? { RPOW: player.power, RCON: player.contact } : {}),
          RVEL: player.velocity, RJNK: player.junk, RACC: player.accuracy,
        } : {}),
        ...(relievable || (!startable && !relievable) ? {
          PVEL: player.velocity, PJNK: player.junk, PACC: player.accuracy,
        } : {}),
      }
    : {
        POW: player.power, CON: player.contact, SPD: player.speed,
        FLD: player.fielding, ARM: player.arm,
      };
  let weightedSignal = 0;
  let totalWeight = 0;
  for (const [stat, rating] of Object.entries(ratings) as Array<[ModStat, number]>) {
    const shift = rawShift[stat] ?? 0;
    if (!Number.isFinite(shift) || shift === 0 || !Number.isFinite(rating)) continue;
    const centeredRating = Math.max(-1, Math.min(1, (rating - 49.5) / 49.5));
    weightedSignal += shift * centeredRating;
    totalWeight += Math.abs(shift);
  }
  // A real identity with no axis for this player's role is exactly neutral.
  // Returning null here would invite the legacy generic-band fallback and let,
  // for example, a Flamethrowers reliever inherit a Rotation preference.
  if (totalWeight === 0) return 1;
  return 1 + (weightedSignal / totalWeight) * FIT_MULTIPLIER_SPREAD;
}

/** One exact adapter used by every Snake valuation path so role-specific axes cannot drift. */
export function constructionArchetypeFitMultiplier(
  capIdentity: TeamCapIdentity | null | undefined,
  player: ConstructionPlayer,
): number | null {
  return archetypeStatFitMultiplier(capIdentity, {
    isPitcher: player.isPitcher,
    role: player.role,
    twoWayVariant: player.twoWayVariant,
    power: player.bat.POW,
    contact: player.bat.CON,
    speed: player.bat.SPD,
    fielding: player.bat.FLD,
    arm: player.bat.ARM,
    velocity: player.pit?.VEL ?? 0,
    junk: player.pit?.JNK ?? 0,
    accuracy: player.pit?.ACC ?? 0,
  });
}

export async function selectTeamArchetype(team: Team, mlbKey: string, farmKey?: string): Promise<Team> {
  const mlbArch = HISTORICAL_ARCHETYPES.find((arch) => arch.id === mlbKey);
  if (!mlbArch) {
    throw new Error(`Unknown archetype: ${mlbKey}`);
  }

  team.mlbArchetypeKey = mlbKey;
  team.capIdentity = archetypeToCapIdentity(mlbArch);

  if (farmKey) {
    const farmArch = HISTORICAL_ARCHETYPES.find((arch) => arch.id === farmKey);
    if (!farmArch) {
      throw new Error(`Unknown archetype: ${farmKey}`);
    }
    team.farmArchetypeKey = farmKey;
    team.farmCapIdentity = archetypeToCapIdentity(farmArch);
  }

  return saveTeam(team);
}
