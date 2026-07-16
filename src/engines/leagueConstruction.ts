import {
  deriveLuxuryTaxUsageWeights,
  POOL_SURPLUS_MAX,
  type PitcherRoleKey,
  SOLVENCY_RED_MARGIN,
  SOLVENCY_SEVERE_TAX_FRAC,
  TRADE_TOLERANCE_BAND,
} from '../data/rosterEngineConstants';
import { LEGAL_ROSTER, type TwoWayVariant } from '../data/rosterConstruction';
import {
  CAP_MODIFICATION_FRACTIONS,
  LUXURY_TAX_RATING_BASIS,
  LUXURY_CAP_TABLES,
  T3_DERIVATION_INPUTS,
  TIER_CAPS,
  TIER_SHIFTS,
  type LuxuryCapRow,
  type ModStat,
  type TierKey,
} from '../data/tierParams';

export type BalanceMode = 'taxed' | 'advisory' | 'off';
export type Band = 'Power' | 'Contact' | 'Speed' | 'Defense' | 'Rotation' | 'Bullpen';
export type BandPriorities = Record<Band, number>;
export type IdentityComposition = { increase: string[]; decrease: string[]; rawShift?: Record<ModStat, number> };
export type TeamCapIdentity = { bandPriorities?: BandPriorities; increase: string[]; decrease: string[]; rawShift?: Record<ModStat, number> };
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
  /** Explicit live league club count. Legacy/direct callers may omit and use slot inference. */
  teamCount?: number;
  players: PoolPlayerPriced[];
  salaryCap?: number;
};
export type RegisteredPool = {
  leagueId: string;
  tier: TierKey;
  balanceMode: BalanceMode;
  players: PoolPlayerPriced[];
  /** Team draft budget: the league settings hard cap when provided, otherwise the pool-relative fallback. */
  tierCap: number;
  luxuryCaps: LuxuryCapRow[];
  pickValueChart: PickValue[];
  totalSlots: number;
  poolSurplusWarning: boolean;
  /**
   * Draft-pool lock (Draft Setup redesign, 2026-06-25). When true, the pool's
   * membership + per-player IV are frozen: this exact snapshot is what the auction
   * consumes, and pool add/remove is rejected until the pool is unlocked. Additive +
   * optional → no kbl-league-builder DB version bump (schemaless at the record level).
   * Set by lockLeaguePool / cleared by unlockLeaguePool (leagueBuilderPoolBuilder.ts).
   */
  locked?: boolean;
  lockedAt?: number;
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
  twoWayVariant?: TwoWayVariant | null;
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
  Rotation: ['RPOW', 'RCON', 'RVEL', 'RJNK', 'RACC'],
  Bullpen: ['PVEL', 'PJNK', 'PACC'],
};

export const MOD_STAT_TO_LUX: Record<ModStat, { group: LuxuryGroup; stat: LuxuryStat }> = {
  POW: { group: 'hitters', stat: 'POW' },
  CON: { group: 'hitters', stat: 'CON' },
  SPD: { group: 'hitters', stat: 'SPD' },
  FLD: { group: 'hitters', stat: 'FLD' },
  ARM: { group: 'hitters', stat: 'ARM' },
  RPOW: { group: 'rotation', stat: 'POW' },
  RCON: { group: 'rotation', stat: 'CON' },
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
  RPOW: 120,
  RCON: 160,
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

export function luxKeyToModStat(luxKey: string): ModStat | undefined {
  return LUX_TO_MOD_STAT.get(luxKey);
}

function bandScores(): Record<string, BandScore> {
  const out: Record<string, BandScore> = {};
  for (const [name, deltas] of Object.entries(CAP_MODIFICATION_FRACTIONS)) {
    const pos = {} as Record<Band, number>;
    const net = {} as Record<Band, number>;
    for (const band of BANDS) {
      pos[band] = BAND_STATS[band].reduce((sum, stat) => sum + Math.max(deltas[stat] ?? 0, 0), 0);
      net[band] = BAND_STATS[band].reduce((sum, stat) => sum + (deltas[stat] ?? 0), 0);
    }
    out[name] = { pos, net };
  }
  return out;
}

function rawDeltaMagnitude(name: string): number {
  const deltas = CAP_MODIFICATION_FRACTIONS[name];
  if (!deltas) return Number.NEGATIVE_INFINITY;
  return MOD_STATS.reduce((sum, stat) => sum + Math.abs((deltas[stat] ?? 0) * MOD_STAT_XBL_CAP[stat]), 0);
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
  const validate = (names: string[]): string[] => {
    const filtered = names.filter((name) => name !== '--');
    for (const name of names) {
      if (!(name in CAP_MODIFICATION_FRACTIONS)) {
        throw new Error(`Unknown identity modification: ${name}`);
      }
    }
    return filtered;
  };

  return {
    increase: validate(sel.increase),
    decrease: validate(sel.decrease),
  };
}

export function identityCapShift(identity: IdentityComposition): Record<ModStat, number> {
  if (identity.rawShift) {
    const base = Object.fromEntries(MOD_STATS.map((stat) => [stat, 0])) as Record<ModStat, number>;
    return { ...base, ...identity.rawShift };
  }

  const normalized = applyIdentitySelection(identity);
  const net = Object.fromEntries(MOD_STATS.map((stat) => [stat, 0])) as Record<ModStat, number>;

  for (const name of normalized.increase) {
    const deltas = CAP_MODIFICATION_FRACTIONS[name];
    for (const stat of MOD_STATS) {
      net[stat] += deltas[stat] ?? 0;
    }
  }

  for (const name of normalized.decrease) {
    const deltas = CAP_MODIFICATION_FRACTIONS[name];
    for (const stat of MOD_STATS) {
      net[stat] -= deltas[stat] ?? 0;
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

export const PITCHER_ROLE_USAGE_RATING_BASIS = LUXURY_TAX_RATING_BASIS;

export function luxuryCapsUsePitcherRoleUsage(caps: readonly LuxuryCapRow[]): boolean {
  return caps.some((row) => row.ratingBasis === PITCHER_ROLE_USAGE_RATING_BASIS);
}

export function isPitcherSecondaryBattingStat(
  stat: LuxuryStat,
): stat is 'POW' | 'CON' | 'SPD' | 'FLD' {
  return stat === 'POW' || stat === 'CON' || stat === 'SPD' || stat === 'FLD';
}

function isTwoWayPitcher(player: ConstructionPlayer): boolean {
  return player.isPitcher && player.twoWayVariant != null;
}

export function playerEligibleForLuxuryRow(
  player: ConstructionPlayer,
  row: LuxuryCapRow,
  caps: readonly LuxuryCapRow[],
): boolean {
  if (!luxuryCapsUsePitcherRoleUsage(caps)) {
    return row.group === 'hitters' ? !player.isPitcher : player.isPitcher;
  }
  if (row.group === 'hitters') {
    if (!player.isPitcher) return true;
    return isTwoWayPitcher(player) && isPitcherSecondaryBattingStat(row.stat);
  }
  if (!player.isPitcher) return false;
  return !(isTwoWayPitcher(player) && isPitcherSecondaryBattingStat(row.stat));
}

export function luxuryRowPlayerRating(
  player: ConstructionPlayer,
  row: LuxuryCapRow,
  caps: readonly LuxuryCapRow[],
): number {
  const stat = row.stat;
  if (stat === 'VEL' || stat === 'JNK' || stat === 'ACC') {
    return player.pit?.[stat] ?? 0;
  }
  const raw = player.bat[stat];
  if (
    !luxuryCapsUsePitcherRoleUsage(caps)
    || row.group === 'hitters'
    || !player.isPitcher
    || isTwoWayPitcher(player)
    || !isPitcherSecondaryBattingStat(stat)
  ) {
    return raw;
  }
  const role = player.role;
  if (!role) return 0;
  return raw * deriveLuxuryTaxUsageWeights(role as PitcherRoleKey)[stat];
}

export type LuxuryTaxPitchingGroups = {
  rotation: ConstructionRoster;
  bullpen: ConstructionRoster;
};

function pitchingMean(player: ConstructionPlayer): number {
  return ((player.pit?.VEL ?? 0) + (player.pit?.JNK ?? 0) + (player.pit?.ACC ?? 0)) / 3;
}

/**
 * TAXSWING (2026-07-10): assign each SP/RP swing arm to exactly one settlement-tax group.
 * Pure SPs own rotation seats first; when fewer than the legal four-man rotation are present,
 * the best remaining swing arms fill the shortfall by mean(VEL,JNK,ACC). Equal means break by
 * player id ascending so the assignment is independent of roster input order.
 */
export function assignLuxuryTaxPitchingGroups(roster: ConstructionRoster): LuxuryTaxPitchingGroups {
  const pureStarters = roster.filter((player) => player.isPitcher && player.role === 'SP');
  const rankedSwingArms = roster
    .filter((player) => player.isPitcher && player.role === 'SP/RP')
    .sort((left, right) => {
      const meanDelta = pitchingMean(right) - pitchingMean(left);
      if (meanDelta !== 0) return meanDelta;
      return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
    });
  const promotionCount = Math.max(
    0,
    Math.min(rankedSwingArms.length, LEGAL_ROSTER.startingPitchers - pureStarters.length),
  );
  const promotedSwingArms = rankedSwingArms.slice(0, promotionCount);
  const unpromotedSwingArms = rankedSwingArms.slice(promotionCount);
  const pureRelievers = roster.filter(
    (player) => player.isPitcher && (player.role === 'RP' || player.role === 'CP'),
  );

  return {
    rotation: [...pureStarters, ...promotedSwingArms],
    bullpen: [...pureRelievers, ...unpromotedSwingArms],
  };
}

export function luxuryTax(roster: ConstructionRoster, caps: LuxuryCapRow[], mode: BalanceMode): TaxResult {
  const { rotation, bullpen } = assignLuxuryTaxPitchingGroups(roster);

  let wouldBeTax = 0;
  const binding: TaxBinding[] = [];

  for (const row of caps) {
    const group = row.group === 'hitters' ? roster : row.group === 'rotation' ? rotation : bullpen;
    const vals = group
      .filter((player) => playerEligibleForLuxuryRow(player, row, caps))
      .map((player) => luxuryRowPlayerRating(player, row, caps))
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

export function derivePickValueChart(
  frozenIvs: readonly number[],
  draftPickCount: number,
  teamCount: number,
): PickValue[] {
  if (!Number.isInteger(draftPickCount) || draftPickCount < 0) {
    throw new Error('Draft pick count must be a non-negative integer.');
  }
  if (!Number.isInteger(teamCount) || teamCount <= 0) {
    throw new Error('Team count must be a positive integer.');
  }
  if (draftPickCount === 0) return [];

  const sorted = frozenIvs.filter(Number.isFinite).sort((left, right) => right - left);
  const rankedIvs = sorted.length > 0 ? sorted : [0];
  const finalIv = rankedIvs[rankedIvs.length - 1];
  const expectedIv = (pick: number): number => {
    let total = 0;
    const cohort: number[] = [];
    for (let offset = 0; offset < teamCount; offset += 1) {
      const value = rankedIvs[pick - 1 + offset] ?? finalIv;
      cohort.push(value);
      total += value;
    }
    if (Number.isFinite(total)) return total / teamCount;

    // Canonical IV cohorts take the direct path above byte-for-byte. Only a finite-input overflow
    // enters this scaled path, where normalizing before summation keeps the represented mean finite.
    const scale = cohort.reduce((maximum, value) => Math.max(maximum, Math.abs(value)), 0);
    if (scale === 0) return 0;
    const normalizedTotal = cohort.reduce((sum, value) => sum + (value / scale), 0);
    const normalizedMean = Math.max(-1, Math.min(1, normalizedTotal / teamCount));
    const scaledMean = normalizedMean * scale;
    if (Number.isFinite(scaledMean)) return scaledMean;
    return normalizedMean < 0 ? -Number.MAX_VALUE : Number.MAX_VALUE;
  };
  const nonnegativeFiniteDifference = (higher: number, lower: number): number => {
    const difference = higher - lower;
    if (Number.isFinite(difference)) return Math.max(0, difference);
    if (difference === Number.NEGATIVE_INFINITY) return 0;
    if (difference === Number.POSITIVE_INFINITY) return Number.MAX_VALUE;
    if (higher === lower) return 0;
    return higher > lower ? Number.MAX_VALUE : 0;
  };
  const roundedPositiveFinite = (value: number): number => {
    const bounded = Number.isFinite(value)
      ? Math.min(Number.MAX_VALUE, Math.max(0, value))
      : Number.MAX_VALUE;
    const rounded = Math.round(bounded);
    return Math.max(1, Number.isFinite(rounded) ? rounded : Number.MAX_VALUE);
  };
  const replacementIv = expectedIv(draftPickCount + 1);
  const lateFloor = roundedPositiveFinite(
    nonnegativeFiniteDifference(expectedIv(draftPickCount), replacementIv),
  );

  let priorValue = Number.MAX_VALUE;
  return Array.from({ length: draftPickCount }, (_, index) => {
    const surplus = nonnegativeFiniteDifference(expectedIv(index + 1), replacementIv);
    const value = Math.min(priorValue, roundedPositiveFinite(Math.max(lateFloor, surplus)));
    priorValue = value;
    return { pick: index + 1, value };
  });
}

const MLB_ROSTER_SLOTS_PER_TEAM = LEGAL_ROSTER.size;

/**
 * Option B — pool-relative MLB team budget (JK ruling 2026-06-25). Instead of a static per-tier
 * dollar table, the cap scales with the ACTUAL pool's objective IVs, so the money-to-talent ratio
 * stays constant however the pool is curated: removing stars lowers the mean → lowers the cap; a
 * richer pool raises it. The tier (juiced/standard/nerfed) is the multiplier. Mirrors the farm
 * wallet's pool-relative approach (computeFarmTierCap). Reproduces the static TIER_CAPS within
 * ~0.1% on the stock 440-player pool (poolMean 54854 × 22 ≈ the juiced cap), so standard pools
 * behave as before while curated pools now move the budget. Luxury caps stay tier-fixed (separate
 * rating-concentration lever).
 */
export function computePoolTierCap(ivs: number[], tier: TierKey): number {
  const finite = ivs.filter((iv) => Number.isFinite(iv));
  if (finite.length === 0) return TIER_CAPS[tier].tierCap; // degenerate pool → static fallback
  const maxIV = Math.max(...finite);
  const meanIV = finite.reduce((sum, iv) => sum + iv, 0) / finite.length;
  const starBranch = maxIV / T3_DERIVATION_INPUTS.starBudgetShare;
  const rosterBranch = meanIV * MLB_ROSTER_SLOTS_PER_TEAM;
  return Math.round(Math.max(starBranch, rosterBranch) * TIER_SHIFTS[tier].scale);
}

export function registerPool(cfg: PoolConfig): RegisteredPool {
  const teamCount = cfg.teamCount
    ?? Math.max(1, Math.ceil(cfg.totalSlots / MLB_ROSTER_SLOTS_PER_TEAM));
  return {
    leagueId: cfg.leagueId,
    tier: cfg.tier,
    balanceMode: cfg.balanceMode,
    players: cfg.players,
    tierCap: cfg.salaryCap ?? computePoolTierCap(cfg.players.map((player) => player.iv), cfg.tier),
    luxuryCaps: LUXURY_CAP_TABLES[cfg.tier],
    pickValueChart: derivePickValueChart(
      cfg.players.map((player) => player.iv),
      cfg.totalSlots,
      teamCount,
    ),
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

// ---- Snake order ----
export type SnakePickSlot = { round: number; pick: number; teamId: string };

export function buildSnakeOrder(teamIds: string[], rounds: number): SnakePickSlot[] {
  const order: SnakePickSlot[] = [];
  let pick = 0;

  for (let round = 1; round <= rounds; round += 1) {
    const roundOrder = round % 2 === 1 ? teamIds : [...teamIds].reverse();
    for (const teamId of roundOrder) {
      pick += 1;
      order.push({ round, pick, teamId });
    }
  }

  return order;
}

// ---- Solvency guardrail ----
export type SolvencySignal = 'GREEN' | 'YELLOW' | 'RED' | 'BLOCKED';
export type SolvencyInput = {
  committedRoster: ConstructionRoster;
  committedSalaries: number;
  candidate: ConstructionPlayer;
  candidateSalary: number;
  caps: LuxuryCapRow[];
  mode: BalanceMode;
  tierCap: number;
  rosterSize: number;
  remainingPoolSalaries: number[];
};
export type SolvencyAssessment = {
  signal: SolvencySignal;
  confirmable: boolean;
  budget: number;
  committedSalaries: number;
  projectedTaxes: number;
  pickCost: number;
  pickMarginalTax: number;
  wouldBeProjectedTaxes: number;
  wouldBePickMarginalTax: number;
  slotsRemaining: number;
  cheapestFillCost: number;
  reserve: number;
  remainingBudget: number;
  totalAfterPick: number;
  slack: number;
};

export function cheapestFillCost(remainingPoolSalaries: number[]): number {
  return remainingPoolSalaries.length === 0 ? Number.POSITIVE_INFINITY : Math.min(...remainingPoolSalaries);
}

export function pickMarginalTax(
  committedRoster: ConstructionRoster,
  candidate: ConstructionPlayer,
  caps: LuxuryCapRow[],
  mode: BalanceMode,
): number {
  return luxuryTax([...committedRoster, candidate], caps, mode).charged - luxuryTax(committedRoster, caps, mode).charged;
}

export function assessSolvency(input: SolvencyInput): SolvencyAssessment {
  const {
    committedRoster,
    committedSalaries,
    candidate,
    candidateSalary,
    caps,
    mode,
    tierCap,
    rosterSize,
    remainingPoolSalaries,
  } = input;

  const slotsRemaining = Math.max(0, rosterSize - committedRoster.length - 1);
  const fill = slotsRemaining > 0 ? cheapestFillCost(remainingPoolSalaries) : 0;
  const reserve = slotsRemaining * fill;

  const currentTax = luxuryTax(committedRoster, caps, mode);
  const nextTax = luxuryTax([...committedRoster, candidate], caps, mode);
  const projectedTaxes = currentTax.charged;
  const marginalTax = nextTax.charged - projectedTaxes;
  const wouldBeProjectedTaxes = currentTax.wouldBeTax;
  const wouldBePickMarginalTax = nextTax.wouldBeTax - wouldBeProjectedTaxes;
  const budget = tierCap;
  const remainingBudget = Math.max(0, budget - committedSalaries - projectedTaxes);
  const totalAfterPick = committedSalaries + projectedTaxes + candidateSalary + marginalTax;
  const slack = (budget - reserve) - totalAfterPick;
  const signalTax = mode === 'off' ? 0 : wouldBePickMarginalTax;

  let signal: SolvencySignal;
  if (slack < 0) {
    signal = 'BLOCKED';
  } else {
    const severeTax = signalTax > 0 && signalTax >= SOLVENCY_SEVERE_TAX_FRAC * remainingBudget;
    const nearLine = slack <= SOLVENCY_RED_MARGIN * remainingBudget;
    signal = severeTax || nearLine ? 'RED' : signalTax > 0 ? 'YELLOW' : 'GREEN';
  }

  return {
    signal,
    confirmable: signal !== 'BLOCKED',
    budget,
    committedSalaries,
    projectedTaxes,
    pickCost: candidateSalary,
    pickMarginalTax: marginalTax,
    wouldBeProjectedTaxes,
    wouldBePickMarginalTax,
    slotsRemaining,
    cheapestFillCost: fill,
    reserve,
    remainingBudget,
    totalAfterPick,
    slack,
  };
}
