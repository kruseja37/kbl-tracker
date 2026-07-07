import {
  buildBestRoster,
  type ArchetypeSimResult,
  type SimPlayer,
} from './archetypeBalanceSimulator';
import { computePoolTierCap } from './leagueConstruction';
import {
  archetypeCapShift,
  type ArchetypeStat,
  type HistoricalArchetype,
} from '../data/historicalArchetypes';
import { LEGAL_ROSTER } from '../data/rosterConstruction';
import type { TierKey } from '../data/tierParams';

export const STRONG_PERCENTILE = 0.67;
export const DEMAND_HITTER = 7;
export const DEMAND_ROTATION = 3;
export const DEMAND_BULLPEN = 3;

export const BINDING_STATS = new Set<ArchetypeStat>([
  'POW',
  'CON',
  'ROT_VEL',
  'ROT_JNK',
  'ROT_ACC',
  'PEN_VEL',
]);

export const DESCRIPTORS: Record<ArchetypeStat, string> = {
  POW: 'power bats',
  CON: 'contact hitters',
  SPD: 'speed/baserunning threats',
  FLD: 'rangy defenders',
  ARM: 'strong-armed fielders',
  ROT_VEL: 'power starters',
  ROT_JNK: 'finesse starters',
  ROT_ACC: 'pinpoint command starters',
  PEN_VEL: 'power relievers',
  PEN_JNK: 'junkball relievers',
  PEN_ACC: 'pinpoint command relievers',
};

export interface FeasibilityShortfall {
  stat: ArchetypeStat;
  group: 'hitters' | 'rotation' | 'bullpen';
  demand: number;
  supply: number;
  needCount: number;
  binding: boolean;
  descriptor: string;
}

export interface ArchetypeFeasibility {
  archetypeId: string;
  archetypeName: string;
  support: 'supported' | 'thin' | 'starved';
  built: ArchetypeSimResult;
  shortfalls: FeasibilityShortfall[];
  activationPrompt: string | null;
}

export interface PoolFeasibilityReport {
  tier: TierKey;
  budget: number;
  poolSize: number;
  results: ArchetypeFeasibility[];
}

type PlayerGroup = FeasibilityShortfall['group'];

const HITTER_STATS = new Set<ArchetypeStat>(['POW', 'CON', 'SPD', 'FLD', 'ARM']);
const ROTATION_STATS = new Set<ArchetypeStat>(['ROT_VEL', 'ROT_JNK', 'ROT_ACC']);

function groupForStat(stat: ArchetypeStat): PlayerGroup {
  if (HITTER_STATS.has(stat)) return 'hitters';
  if (ROTATION_STATS.has(stat)) return 'rotation';
  return 'bullpen';
}

function isGroupMember(player: SimPlayer, group: PlayerGroup): boolean {
  if (group === 'hitters') return !player.isPitcher;
  if (group === 'rotation') return player.isPitcher && (player.role === 'SP' || player.role === 'SP/RP');
  return player.isPitcher && (player.role === 'RP' || player.role === 'CP' || player.role === 'SP/RP');
}

function ratingForStat(player: SimPlayer, stat: ArchetypeStat): number {
  switch (stat) {
    case 'POW':
    case 'CON':
    case 'SPD':
    case 'FLD':
    case 'ARM':
      return player.bat[stat] ?? 0;
    case 'ROT_VEL':
    case 'PEN_VEL':
      return player.pit?.VEL ?? 0;
    case 'ROT_JNK':
    case 'PEN_JNK':
      return player.pit?.JNK ?? 0;
    case 'ROT_ACC':
    case 'PEN_ACC':
      return player.pit?.ACC ?? 0;
  }
}

function demandForGroup(group: PlayerGroup): number {
  if (group === 'hitters') return DEMAND_HITTER;
  if (group === 'rotation') return DEMAND_ROTATION;
  return DEMAND_BULLPEN;
}

function percentileThreshold(players: SimPlayer[], stat: ArchetypeStat, group: PlayerGroup): number {
  const ratings = players
    .filter((player) => isGroupMember(player, group))
    .map((player) => ratingForStat(player, stat))
    .sort((a, b) => a - b);
  const n = ratings.length;
  if (n === 0) return 0;
  const rawIndex = Math.ceil(STRONG_PERCENTILE * n) - 1;
  const idx = Math.max(0, Math.min(n - 1, rawIndex));
  return ratings[idx];
}

function boostedStats(archetype: HistoricalArchetype): ArchetypeStat[] {
  return (Object.entries(archetype.spec) as [ArchetypeStat, number][])
    .filter(([, multiplier]) => multiplier > 0)
    .map(([stat]) => stat);
}

function sortShortfalls(a: FeasibilityShortfall, b: FeasibilityShortfall): number {
  if (a.binding !== b.binding) return a.binding ? -1 : 1;
  if (a.needCount !== b.needCount) return b.needCount - a.needCount;
  return a.stat.localeCompare(b.stat);
}

function buildShortfall(
  lockedPool: SimPlayer[],
  referencePool: SimPlayer[],
  stat: ArchetypeStat,
): FeasibilityShortfall {
  const group = groupForStat(stat);
  const threshold = percentileThreshold(referencePool, stat, group);
  const supply = lockedPool.filter((player) => (
    isGroupMember(player, group) && ratingForStat(player, stat) >= threshold
  )).length;
  const demand = demandForGroup(group);
  return {
    stat,
    group,
    demand,
    supply,
    needCount: Math.max(0, demand - supply),
    binding: BINDING_STATS.has(stat),
    descriptor: DESCRIPTORS[stat],
  };
}

export function analyzePoolFeasibility(
  lockedPool: SimPlayer[],
  archetypes: HistoricalArchetype[],
  tier: TierKey,
  referencePool?: SimPlayer[],
  budgetOverride?: number,
): PoolFeasibilityReport {
  const budget = budgetOverride ?? computePoolTierCap(lockedPool.map((player) => player.iv), tier);
  const thresholdPool = referencePool ?? lockedPool;
  const results = archetypes.map((arch) => {
    const built = buildBestRoster(lockedPool, { name: arch.name, rawShift: archetypeCapShift(arch) }, tier, budget);
    const shortfalls = boostedStats(arch)
      .map((stat) => buildShortfall(lockedPool, thresholdPool, stat))
      .sort(sortShortfalls);
    // Bodies-only: can the pool fill all 22 slots. The heuristic builder's `solvent` flag is a noisy
    // diagnostic (it leaves rosters $30–$150 over a ~$1.07M budget on convergence), NOT a composition
    // gate — feasibility is about player TYPES + bodies, per the brief. `built.solvent` stays in the
    // output for the draft-guide/UI to surface budget pressure later.
    const notFieldable = built.rosterSize < LEGAL_ROSTER.size;
    const hasBindingShortfall = shortfalls.some((shortfall) => shortfall.binding && shortfall.needCount > 0);
    const hasAnyShortfall = shortfalls.some((shortfall) => shortfall.needCount > 0);
    const support: ArchetypeFeasibility['support'] = notFieldable || hasBindingShortfall
      ? 'starved'
      : hasAnyShortfall
        ? 'thin'
        : 'supported';
    const firstShortfall = shortfalls.find((shortfall) => shortfall.needCount > 0);
    const activationPrompt = support === 'supported'
      ? null
      : notFieldable
        ? `This pool is too thin to field a full ${arch.name} roster — add more players.`
        : `Add ~${firstShortfall?.needCount ?? 0} ${firstShortfall?.descriptor ?? 'players'} to activate ${arch.name}.`;
    return {
      archetypeId: arch.id,
      archetypeName: arch.name,
      support,
      built,
      shortfalls,
      activationPrompt,
    };
  });
  return {
    tier,
    budget,
    poolSize: lockedPool.length,
    results,
  };
}
