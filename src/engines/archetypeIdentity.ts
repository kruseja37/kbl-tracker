import {
  HISTORICAL_ARCHETYPES,
  ARCHETYPE_STAT_LUX_KEY,
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
  type TeamCapIdentity,
} from './leagueConstruction';
import { archetypeBandPriorities } from './cpuShillBidding';
import type { ModStat } from '../data/tierParams';
import { saveTeam, type Team } from '../utils/leagueBuilderStorage';

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
    return archetypeBandPriorities(archetype);
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
