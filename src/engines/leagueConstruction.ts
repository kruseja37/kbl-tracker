import { POOL_SURPLUS_MAX, TRADE_TOLERANCE_BAND } from '../data/rosterEngineConstants';
import {
  CAP_MODIFICATION_FRACTIONS,
  LUXURY_CAP_TABLES,
  TIER_CAPS,
  type LuxuryCapRow,
  type ModStat,
  type TierKey,
} from '../data/tierParams';

export type BalanceMode = 'taxed' | 'advisory' | 'off';
export type Band = 'Power' | 'Contact' | 'Speed' | 'Defense' | 'Rotation' | 'Bullpen';
export type BandPriorities = Record<Band, number>;
export type IdentityComposition = { increase: string[]; decrease: string[] };
export type TeamCapIdentity = { bandPriorities?: BandPriorities; increase: string[]; decrease: string[] };
export type TaxBinding = { group: string; stat: string; over: number; tax: number };
export type TaxResult = { charged: number; wouldBeTax: number; binding: TaxBinding[] };
export type PickValue = { pick: number; value: number };
export type Pick = { pick: number };
export type PoolPlayerPriced = { id: string; iv: number; salary: number };
export type PoolConfig = {
  leagueId: string;
  tier: TierKey;
  balanceMode: BalanceMode;
  totalSlots: number;
  players: PoolPlayerPriced[];
};
export type RegisteredPool = {
  leagueId: string;
  tier: TierKey;
  balanceMode: BalanceMode;
  players: PoolPlayerPriced[];
  tierCap: number;
  luxuryCaps: LuxuryCapRow[];
  pickValueChart: PickValue[];
  totalSlots: number;
  poolSurplusWarning: boolean;
};
export type TradeVerdict = {
  balanced: boolean;
  imbalancePct: number;
  favored: 'A' | 'B' | 'none';
  overridable: true;
};
export type ConstructionPlayer = {
  id: string;
  isPitcher: boolean;
  role?: 'SP' | 'SP/RP' | 'RP' | 'CP';
  bat: { POW: number; CON: number; SPD: number; FLD: number; ARM: number };
  pit?: { VEL: number; JNK: number; ACC: number };
};
export type ConstructionRoster = ConstructionPlayer[];

type LuxuryGroup = LuxuryCapRow['group'];
type LuxuryStat = LuxuryCapRow['stat'];
type BandScore = { pos: Record<Band, number>; net: Record<Band, number> };

export const BANDS: readonly Band[] = ['Power', 'Contact', 'Speed', 'Defense', 'Rotation', 'Bullpen'] as const;

export const BAND_STATS: Record<Band, readonly ModStat[]> = {
  Power: ['POW'],
  Contact: ['CON'],
  Speed: ['SPD'],
  Defense: ['FLD', 'ARM'],
  Rotation: ['RVEL', 'RJNK', 'RACC'],
  Bullpen: ['PVEL', 'PJNK', 'PACC'],
};

export const MOD_STAT_TO_LUX: Record<ModStat, { group: LuxuryGroup; stat: LuxuryStat }> = {
  POW: { group: 'hitters', stat: 'POW' },
  CON: { group: 'hitters', stat: 'CON' },
  SPD: { group: 'hitters', stat: 'SPD' },
  FLD: { group: 'hitters', stat: 'FLD' },
  ARM: { group: 'hitters', stat: 'ARM' },
  RVEL: { group: 'rotation', stat: 'VEL' },
  RJNK: { group: 'rotation', stat: 'JNK' },
  RACC: { group: 'rotation', stat: 'ACC' },
  PVEL: { group: 'bullpen', stat: 'VEL' },
  PJNK: { group: 'bullpen', stat: 'JNK' },
  PACC: { group: 'bullpen', stat: 'ACC' },
};

const MOD_STATS = Object.keys(MOD_STAT_TO_LUX) as ModStat[];

const MOD_STAT_XBL_CAP: Record<ModStat, number> = {
  POW: 500,
  CON: 545,
  SPD: 550,
  FLD: 585,
  ARM: 565,
  RVEL: 100,
  RJNK: 260,
  RACC: 260,
  PVEL: 65,
  PJNK: 150,
  PACC: 165,
};

const LUX_TO_MOD_STAT = new Map<string, ModStat>(
  MOD_STATS.map((modStat) => {
    const row = MOD_STAT_TO_LUX[modStat];
    return [`${row.group}/${row.stat}`, modStat];
  }),
);

function bandScores(): Record<string, BandScore> {
  const out: Record<string, BandScore> = {};
  for (const [name, deltas] of Object.entries(CAP_MODIFICATION_FRACTIONS)) {
    const pos = {} as Record<Band, number>;
    const net = {} as Record<Band, number>;
    for (const band of BANDS) {
      pos[band] = BAND_STATS[band].reduce((sum, stat) => sum + Math.max(deltas[stat], 0), 0);
      net[band] = BAND_STATS[band].reduce((sum, stat) => sum + deltas[stat], 0);
    }
    out[name] = { pos, net };
  }
  return out;
}

function rawDeltaMagnitude(name: string): number {
  const deltas = CAP_MODIFICATION_FRACTIONS[name];
  if (!deltas) return Number.NEGATIVE_INFINITY;
  return MOD_STATS.reduce((sum, stat) => sum + Math.abs(deltas[stat] * MOD_STAT_XBL_CAP[stat]), 0);
}

function pickIncrease(weight: BandPriorities, taken: Set<string>, scores: Record<string, BandScore>): string | undefined {
  let bestName: string | undefined;
  let bestVal = Number.NEGATIVE_INFINITY;
  let bestMagnitude = Number.NEGATIVE_INFINITY;

  for (const [name, score] of Object.entries(scores)) {
    if (name === '--' || taken.has(name)) continue;
    const val = BANDS.reduce((sum, band) => sum + weight[band] * score.pos[band], 0)
      + BANDS.reduce((sum, band) => sum + Math.min(score.net[band], 0), 0);
    const magnitude = rawDeltaMagnitude(name);
    if (
      bestName === undefined
      || val > bestVal
      || (val === bestVal && magnitude > bestMagnitude)
      || (val === bestVal && magnitude === bestMagnitude && name < bestName)
    ) {
      bestName = name;
      bestVal = val;
      bestMagnitude = magnitude;
    }
  }

  return bestName;
}

export function composeIdentity(priorities: BandPriorities): IdentityComposition {
  const scores = bandScores();
  let priorityBands = [...BANDS]
    .sort((left, right) => priorities[right] - priorities[left] || left.localeCompare(right))
    .filter((band) => priorities[band] > 0);

  if (priorityBands.length === 1) {
    priorityBands = [priorityBands[0], priorityBands[0]];
  }

  const increase: string[] = [];
  for (const band of priorityBands.slice(0, 2)) {
    const weight = Object.fromEntries(BANDS.map((candidate) => [candidate, candidate === band ? priorities[candidate] : 0])) as BandPriorities;
    const picked = pickIncrease(weight, new Set(increase), scores);
    if (picked) increase.push(picked);
  }

  return { increase, decrease: [] };
}

export function applyIdentitySelection(sel: { increase: string[]; decrease: string[] }): IdentityComposition {
  const validate = (kind: 'increase' | 'decrease', names: string[]): string[] => {
    const filtered = names.filter((name) => name !== '--');
    if (filtered.length > 2) {
      throw new Error(`Identity ${kind} selection can include at most 2 modifications`);
    }
    for (const name of names) {
      if (!(name in CAP_MODIFICATION_FRACTIONS)) {
        throw new Error(`Unknown identity modification: ${name}`);
      }
    }
    return filtered;
  };

  return {
    increase: validate('increase', sel.increase),
    decrease: validate('decrease', sel.decrease),
  };
}

export function identityCapShift(identity: IdentityComposition): Record<ModStat, number> {
  const normalized = applyIdentitySelection(identity);
  const net = Object.fromEntries(MOD_STATS.map((stat) => [stat, 0])) as Record<ModStat, number>;

  for (const name of normalized.increase) {
    const deltas = CAP_MODIFICATION_FRACTIONS[name];
    for (const stat of MOD_STATS) {
      net[stat] += deltas[stat];
    }
  }

  for (const name of normalized.decrease) {
    const deltas = CAP_MODIFICATION_FRACTIONS[name];
    for (const stat of MOD_STATS) {
      net[stat] -= deltas[stat];
    }
  }

  return net;
}

export function shiftLuxuryCaps(caps: LuxuryCapRow[], identity: IdentityComposition): LuxuryCapRow[] {
  const shift = identityCapShift(identity);
  return caps.map((row) => {
    const modStat = LUX_TO_MOD_STAT.get(`${row.group}/${row.stat}`);
    if (!modStat) return { ...row };
    return { ...row, cap: Math.max(0, row.cap * (1 + shift[modStat])) };
  });
}

function playerRating(player: ConstructionPlayer, stat: LuxuryStat): number {
  if (stat === 'VEL' || stat === 'JNK' || stat === 'ACC') {
    return player.pit?.[stat] ?? 0;
  }
  return player.bat[stat];
}

export function luxuryTax(roster: ConstructionRoster, caps: LuxuryCapRow[], mode: BalanceMode): TaxResult {
  const hitters = roster.filter((player) => !player.isPitcher);
  const rotation = roster.filter((player) => player.isPitcher && (player.role === 'SP' || player.role === 'SP/RP'));
  const bullpen = roster.filter((player) => player.isPitcher && (player.role === 'RP' || player.role === 'CP' || player.role === 'SP/RP'));

  let wouldBeTax = 0;
  const binding: TaxBinding[] = [];

  for (const row of caps) {
    const group = row.group === 'hitters' ? hitters : row.group === 'rotation' ? rotation : bullpen;
    const vals = group
      .map((player) => playerRating(player, row.stat))
      .sort((left, right) => right - left)
      .slice(0, row.topN);
    const over = vals.reduce((sum, val) => sum + val, 0) - Math.max(row.cap, 0);

    if (over > 0) {
      const tax = row.penaltyPer100 * (over / 100) ** row.penaltyCurve + row.minAdder;
      wouldBeTax += tax;
      binding.push({ group: row.group, stat: row.stat, over, tax });
    }
  }

  binding.sort((left, right) => right.tax - left.tax);
  return {
    charged: mode === 'taxed' ? wouldBeTax : 0,
    wouldBeTax,
    binding,
  };
}

export function derivePickValueChart(ivsDesc: number[]): PickValue[] {
  return [...ivsDesc]
    .sort((left, right) => right - left)
    .map((value, index) => ({ pick: index + 1, value }));
}

export function registerPool(cfg: PoolConfig): RegisteredPool {
  return {
    leagueId: cfg.leagueId,
    tier: cfg.tier,
    balanceMode: cfg.balanceMode,
    players: cfg.players,
    tierCap: TIER_CAPS[cfg.tier].tierCap,
    luxuryCaps: LUXURY_CAP_TABLES[cfg.tier],
    pickValueChart: derivePickValueChart(cfg.players.map((player) => player.iv)),
    totalSlots: cfg.totalSlots,
    poolSurplusWarning: cfg.players.length > cfg.totalSlots * POOL_SURPLUS_MAX,
  };
}

export function validateTrade(sideA: Pick[], sideB: Pick[], chart: PickValue[]): TradeVerdict {
  const valueFor = (pick: Pick): number => {
    const row = chart[pick.pick - 1];
    if (!row) {
      throw new Error(`Pick ${pick.pick} is outside the pick value chart`);
    }
    return row.value;
  };
  const sumA = sideA.reduce((sum, pick) => sum + valueFor(pick), 0);
  const sumB = sideB.reduce((sum, pick) => sum + valueFor(pick), 0);
  const denominator = Math.max(sumA, sumB, Number.EPSILON);
  const imbalancePct = Math.abs(sumA - sumB) / denominator;
  const balanced = imbalancePct <= TRADE_TOLERANCE_BAND;
  const favored: TradeVerdict['favored'] = balanced ? 'none' : sumA > sumB ? 'A' : sumB > sumA ? 'B' : 'none';

  return { balanced, imbalancePct, favored, overridable: true };
}
