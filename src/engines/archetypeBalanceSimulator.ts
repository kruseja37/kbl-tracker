/**
 * Archetype balance simulator (EV-flatness gate).
 *
 * Purpose (per IV_ENGINE_AND_ROSTER_INTELLIGENCE_SPEC.md §5.3 T3 acceptance criterion + the
 * FRANCHISE_SETUP_TO_SEASON_ROADMAP archetype work): prove that no team archetype lets a GM build a
 * strictly stronger roster than any other from the same pool. For each archetype we construct the
 * best-achievable 22-man roster under that archetype's SHIFTED luxury caps + the team budget, then
 * compare each archetype's total true value (kblIV). A balanced set keeps every archetype within a
 * parity band (default ±10%) of the cross-archetype mean. Anything outside the band is a FINDING —
 * the archetype (workbook-original or authored) is retuned or dropped before it ships.
 *
 * Reuses the LIVE construction engine (no parallel math): `shiftLuxuryCaps` applies the archetype to
 * the per-stat caps, `luxuryTax` charges over-cap concentration, `computePoolTierCap` is the budget.
 * Player value = the canonical frozen kblIV; base salary ≈ kblIV, so the budget binds via the tax —
 * the archetype's edge is exactly how much tax it lets you avoid by building to its identity.
 *
 * The roster builder is a budget-aware marginal-value greedy applied IDENTICALLY to every archetype,
 * so the comparison is fair even though it is not a global optimum: any archetype that can assemble a
 * higher-value roster under the same algorithm reveals a real imbalance.
 */
import {
  luxuryTax,
  shiftLuxuryCaps,
  computePoolTierCap,
  type ConstructionPlayer,
} from './leagueConstruction';
import { LUXURY_CAP_TABLES, type LuxuryCapRow, type TierKey } from '../data/tierParams';
import { normalizeAuctionLuxuryCapsForLeagueSize } from './auctionLuxuryTax';
import { snakeMoneyNonnegative } from './snakeMoney';
import {
  LEGAL_ROSTER,
  canCover,
  canRelieve,
  canStart,
  isCloser,
  isLegalRoster,
  type TwoWayVariant,
} from '../data/rosterConstruction';

/** A pool player for the simulator: construction ratings + canonical value/salary. */
export interface SimPlayer extends ConstructionPlayer {
  /** canonical frozen kblIV — the team-strength metric. */
  iv: number;
  /** base salary ≈ kblIV — the budget constraint. */
  salary: number;
  /** primary position label (for hitter slotting). */
  position: string;
  /**
   * Optional Ruling-A coverage info (secondary position / Two Way trait) — consumed by the IDENTITY
   * construction path's backup-C slot via `canCover` (audit F3). Pools without it (e.g. the IV
   * oracle) simply require a primary-C backup, which is the only coverage such pools contain anyway.
   */
  secondaryPosition?: string | null;
  twoWayVariant?: TwoWayVariant | null;
}

/** A single archetype: one cap-modification name in the increase slot (deep, balanced bundle). */
export interface SimArchetype {
  name: string;
  /** increase/decrease modification-name stacks consumed by `shiftLuxuryCaps`. Omit when using rawShift. */
  increase?: string[];
  decrease?: string[];
  /**
   * Optional CUSTOM/tunable profile: fractional cap shifts keyed by `${group}/${stat}` (e.g.
   * 'hitters/FLD': 0.24, 'rotation/JNK': -0.13). When present it overrides increase/decrease, so a
   * trade can be dialled continuously to find the balanced (≈0% deviation) boost:nerf ratio.
   */
  rawShift?: Record<string, number>;
  /** Optional uniform scale on all shifts (the tier-generosity lever, D? — XBL=1.0 baseline). */
  scale?: number;
}

function archetypeCapsFromBase(archetype: SimArchetype, base: LuxuryCapRow[]): LuxuryCapRow[] {
  const s = archetype.scale ?? 1;
  if (archetype.rawShift) {
    return base.map((row) => {
      const shift = (archetype.rawShift![`${row.group}/${row.stat}`] ?? 0) * s;
      return { ...row, cap: Math.max(0, row.cap * (1 + shift)) };
    });
  }
  const shifted = shiftLuxuryCaps(base, { increase: archetype.increase ?? [], decrease: archetype.decrease ?? [] });
  if (s === 1) return shifted;
  // Scale the shift magnitude uniformly: base.cap * (1 + s*(shifted/base - 1)).
  return shifted.map((row, i) => ({ ...row, cap: Math.max(0, base[i].cap * (1 + s * (row.cap / base[i].cap - 1))) }));
}

function archetypeCaps(archetype: SimArchetype, tier: TierKey): LuxuryCapRow[] {
  return archetypeCapsFromBase(archetype, LUXURY_CAP_TABLES[tier]);
}

/** NORMWIRE: tax caps use the same normalized base seam as live auction settlement. */
function archetypeTaxCaps(
  archetype: SimArchetype,
  tier: TierKey,
  realTeamCount: number,
): LuxuryCapRow[] {
  return archetypeCapsFromBase(
    archetype,
    normalizeAuctionLuxuryCapsForLeagueSize(LUXURY_CAP_TABLES[tier], realTeamCount),
  );
}

export interface ArchetypeSimResult {
  name: string;
  totalIv: number;
  totalSalary: number;
  totalTax: number;
  rosterSize: number;
  /** Σsalary + Σtax ≤ budget. */
  solvent: boolean;
  /** True iff the built roster is a LEGAL SMB4 construction (14 position players incl a backup C, 8 pitchers). */
  legalRoster: boolean;
}

export interface BalanceReport {
  tier: TierKey;
  budget: number;
  band: number;
  meanIv: number;
  maxDeviation: number;
  withinBand: boolean;
  results: ArchetypeSimResult[];
  /** archetypes outside the parity band, with signed deviation from the mean. */
  outliers: { name: string; deviation: number }[];
}

const ROSTER_SIZE = LEGAL_ROSTER.size;
const HITTER_POSITIONS = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'] as const;

type SlotKind =
  | { kind: 'pos'; position: string }
  | { kind: 'flex' }
  | { kind: 'benchOrRp' } // the swing slot: a 5th bench bat OR a 5th reliever (whichever builds more value)
  | { kind: 'sp' }
  | { kind: 'rp' }
  | { kind: 'cp' };

/**
 * 22 slots for the VALUE-MAX baseline (`buildBestRoster`) — kept byte-stable for the frozen parity
 * gate. NOTE (Ruling A, DECISIONS_LOG 2026-07-01 / audit F3): legality now accepts a SECONDARY-C
 * hitter or a Two Way (C) pitcher as the backup catcher; this plan's second primary-C slot is a
 * STRICTER-than-law construction that remains legal (a subset), so the frozen gate stays valid. The
 * IDENTITY path builds with `IDENTITY_SLOT_PLAN` + `identityEligible`, which honor `canCover`:
 *   8 field starters (one of each C/1B/2B/3B/SS/LF/CF/RF, HARD by primary position)
 * + 1 REQUIRED backup catcher (here: a 2nd primary-C; identity path: any legal C-coverage)
 * + 4 bench position players (any non-pitcher)
 * + 1 SWING slot — a 5th bench bat OR a 5th reliever, so bench flexes 4-5 and relievers flex 4-5
 * + 4 starting pitchers (SP or SP/RP)
 * + 3 general relievers (RP/CP, or an SP/RP swing)
 * + 1 dedicated closer (CP only)
 * = 13-14 position players + 8-9 pitchers; verified by `isLegalRoster`.
 */
const SLOT_PLAN: SlotKind[] = [
  ...HITTER_POSITIONS.map((position) => ({ kind: 'pos', position } as SlotKind)),
  { kind: 'pos', position: 'C' } as SlotKind, // required backup catcher
  ...Array.from({ length: 4 }, () => ({ kind: 'flex' } as SlotKind)),
  { kind: 'benchOrRp' } as SlotKind, // swing: 5th bench bat or 5th reliever
  ...Array.from({ length: 4 }, () => ({ kind: 'sp' } as SlotKind)),
  { kind: 'cp' } as SlotKind,
  ...Array.from({ length: 3 }, () => ({ kind: 'rp' } as SlotKind)),
];

function eligible(pool: SimPlayer[], slot: SlotKind, used: Set<string>): SimPlayer[] {
  const free = pool.filter((p) => !used.has(p.id));
  if (slot.kind === 'sp') return free.filter(canStart);
  if (slot.kind === 'rp') return free.filter(canRelieve);
  if (slot.kind === 'cp') return free.filter(isCloser);
  if (slot.kind === 'flex') return free.filter((p) => !p.isPitcher);
  // the swing slot: a bench position player OR a reliever (the climb keeps whichever adds more value).
  if (slot.kind === 'benchOrRp') return free.filter((p) => !p.isPitcher || canRelieve(p));
  // 'pos': HARD-require the primary position. A legal SMB4 roster must field one of each of the 8 spots
  // PLUS a real backup catcher — no "any hitter" fallback (that produced illegal rosters that don't
  // translate to a real auction draft). The pool carries 28-40 players per position, so this always fills;
  // if a position ever ran dry the slot stays empty and the archetype fails the rosterSize===22 check —
  // a real finding, surfaced rather than hidden.
  return free.filter((p) => !p.isPitcher && p.position === slot.position);
}

function taxOf(roster: SimPlayer[], caps: LuxuryCapRow[]): number {
  return luxuryTax(roster as ConstructionPlayer[], caps, 'taxed').wouldBeTax;
}

interface SlotPick {
  slotIndex: number;
  player: SimPlayer;
}

/** Over-budget penalty (IV per $ over). Large enough to force feasibility, then maximise value. */
const OVER_BUDGET_PENALTY = 4;

function rosterCost(players: SimPlayer[], caps: LuxuryCapRow[]): number {
  return players.reduce((s, p) => s + p.salary, 0) + taxOf(players, caps);
}

/** Objective the hill-climb maximises: total value minus a stiff penalty for exceeding the budget. */
function objective(players: SimPlayer[], caps: LuxuryCapRow[], budget: number): number {
  const iv = players.reduce((s, p) => s + p.iv, 0);
  const over = Math.max(0, rosterCost(players, caps) - budget);
  return iv - OVER_BUDGET_PENALTY * over;
}

/**
 * Per-slot candidate shortlist, three ways a swap can help: top-IV (raw value), cheapest (shed cost),
 * and best archetype-FIT (loads the raised-cap bands, light in the lowered ones — the specialist
 * players that make extreme archetypes feasible).
 */
function shortlist(
  pool: SimPlayer[],
  slot: SlotKind,
  used: Set<string>,
  fitScore: (p: SimPlayer) => number,
): SimPlayer[] {
  const cands = eligible(pool, slot, used);
  const byIv = [...cands].sort((a, b) => b.iv - a.iv).slice(0, 24);
  const bySalary = [...cands].sort((a, b) => a.salary - b.salary).slice(0, 10);
  const byFit = [...cands].sort((a, b) => fitScore(b) - fitScore(a)).slice(0, 18);
  const seen = new Set<string>();
  return [...byIv, ...byFit, ...bySalary].filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true)));
}

/**
 * Player fit for the archetype = Σ rating × cap-shift-fraction for that player's relevant stats. High
 * when a player loads the bands the archetype RAISED and stays light where it LOWERED them. The shift
 * fraction is read straight off the shifted-vs-base caps so it tracks whatever the archetype does.
 */
function makeFitScore(caps: LuxuryCapRow[], tier: TierKey): (p: SimPlayer) => number {
  const base = LUXURY_CAP_TABLES[tier];
  const frac = new Map<string, number>();
  caps.forEach((row, i) => {
    const b = base[i];
    if (b && b.cap > 0) frac.set(`${row.group}/${row.stat}`, row.cap / b.cap - 1);
  });
  const f = (group: string, stat: string) => frac.get(`${group}/${stat}`) ?? 0;
  return (p: SimPlayer) => {
    if (!p.isPitcher) {
      return (
        p.bat.POW * f('hitters', 'POW') +
        p.bat.CON * f('hitters', 'CON') +
        p.bat.SPD * f('hitters', 'SPD') +
        p.bat.FLD * f('hitters', 'FLD') +
        p.bat.ARM * f('hitters', 'ARM')
      );
    }
    const grp = p.role === 'RP' || p.role === 'CP' ? 'bullpen' : 'rotation';
    return (
      (p.pit?.VEL ?? 0) * f(grp, 'VEL') +
      (p.pit?.JNK ?? 0) * f(grp, 'JNK') +
      (p.pit?.ACC ?? 0) * f(grp, 'ACC')
    );
  };
}

/** Fill each slot with the highest-scoring eligible player (score = value or archetype-fit). */
function greedyStart(pool: SimPlayer[], score: (p: SimPlayer) => number): SlotPick[] {
  const picks: SlotPick[] = [];
  const used = new Set<string>();
  for (let i = 0; i < SLOT_PLAN.length; i += 1) {
    const cands = eligible(pool, SLOT_PLAN[i], used);
    if (cands.length === 0) continue;
    const chosen = cands.reduce((best, c) => (score(c) > score(best) ? c : best));
    picks.push({ slotIndex: i, player: chosen });
    used.add(chosen.id);
  }
  return picks;
}

/**
 * Hill-climb from a starting roster: repeatedly accept the single best slot-swap that improves
 * `objective` (value minus a stiff over-budget penalty). The penalty first drives the roster under
 * budget, then maximises value within it. Because a swap can replace a cap-BUSTING star with a
 * same-position player who FITS the archetype's caps (sheds tax for little value), the climb finds each
 * archetype's natural roster shape rather than punishing the counterintuitive ones.
 */
function climb(
  start: SlotPick[],
  pool: SimPlayer[],
  caps: LuxuryCapRow[],
  budget: number,
  fitScore: (p: SimPlayer) => number,
): SlotPick[] {
  const picks = start.map((p) => ({ ...p }));
  const used = new Set(picks.map((p) => p.player.id));
  const MAX_PASSES = 40;
  for (let pass = 0; pass < MAX_PASSES; pass += 1) {
    let improved = false;
    for (let idx = 0; idx < picks.length; idx += 1) {
      const current = picks[idx].player;
      const usedExcept = new Set(used);
      usedExcept.delete(current.id);
      const players = picks.map((p) => p.player);
      let bestRepl: SimPlayer | null = null;
      let bestObj = objective(players, caps, budget);
      for (const repl of shortlist(pool, SLOT_PLAN[picks[idx].slotIndex], usedExcept, fitScore)) {
        if (repl.id === current.id) continue;
        players[idx] = repl;
        const obj = objective(players, caps, budget);
        if (obj > bestObj + 1) {
          bestObj = obj;
          bestRepl = repl;
        }
      }
      players[idx] = current; // restore
      if (bestRepl) {
        used.delete(current.id);
        used.add(bestRepl.id);
        picks[idx] = { slotIndex: picks[idx].slotIndex, player: bestRepl };
        improved = true;
      }
    }
    if (!improved) break;
  }
  return picks;
}

/**
 * Build the best-achievable 22-man roster under the archetype's SHIFTED caps. Climbs from TWO
 * independent starts — value-first and archetype-fit-first — and keeps the better roster. The fit-first
 * start hands the deep-nerf archetypes a specialist-loaded roster the climb can refine, so they aren't
 * scored low merely because their optimum is unreachable from a value-first start. Identical procedure
 * for every archetype → fair comparison.
 */
export function buildBestRoster(
  pool: SimPlayer[],
  archetype: SimArchetype,
  tier: TierKey,
  budget: number,
  realTeamCount: number,
): ArchetypeSimResult {
  const caps = archetypeTaxCaps(archetype, tier, realTeamCount);
  const fitScore = makeFitScore(archetypeCaps(archetype, tier), tier);
  const objOf = (picks: SlotPick[]) => objective(picks.map((p) => p.player), caps, budget);

  const fromValue = climb(greedyStart(pool, (p) => p.iv), pool, caps, budget, fitScore);
  const fromFit = climb(greedyStart(pool, fitScore), pool, caps, budget, fitScore);
  const best = objOf(fromFit) > objOf(fromValue) ? fromFit : fromValue;

  const players = best.map((p) => p.player);
  const totalIv = players.reduce((s, p) => s + p.iv, 0);
  const totalSalary = players.reduce((s, p) => s + p.salary, 0);
  const totalTax = taxOf(players, caps);
  return {
    name: archetype.name,
    totalIv,
    totalSalary,
    totalTax,
    rosterSize: players.length,
    solvent: totalSalary + totalTax <= budget,
    legalRoster: isLegalRoster(players),
  };
}

/**
 * Run the EV-flatness check across a set of archetypes. Each archetype independently builds its best
 * roster from the FULL pool (archetypes don't contend — this measures best-achievable strength). The
 * report flags any archetype whose total value deviates more than `band` from the cross-archetype mean.
 */
export function runBalanceSim(
  pool: SimPlayer[],
  archetypes: SimArchetype[],
  tier: TierKey,
  realTeamCount: number,
  band = 0.1,
): BalanceReport {
  // Intentionally pool-relative: this offline balance harness is a calibration frame, not a live league budget.
  const budget = computePoolTierCap(pool.map((p) => p.iv), tier);
  const results = archetypes.map((a) => buildBestRoster(pool, a, tier, budget, realTeamCount));
  const meanIv = results.reduce((s, r) => s + r.totalIv, 0) / results.length;
  const withDev = results.map((r) => ({ name: r.name, deviation: (r.totalIv - meanIv) / meanIv }));
  const maxDeviation = Math.max(...withDev.map((d) => Math.abs(d.deviation)));
  const outliers = withDev.filter((d) => Math.abs(d.deviation) > band);
  return {
    tier,
    budget,
    band,
    meanIv,
    maxDeviation,
    withinBand: outliers.length === 0,
    results,
    outliers,
  };
}

// ────────────────────────────────────────────────────────────────────────────────────────────────
// IDENTITY-FIRST construction (FABLE-C1 — audit RCI-06; DECISIONS_LOG 2026-07-01).
//
// `buildBestRoster` above stays byte-compatible as the VALUE-MAX baseline (the frozen parity gate
// consumes it). The functions below flip the OBJECTIVE: maximize archetype fit SUBJECT TO legality
// (structural via SLOT_PLAN + verified by isLegalRoster), solvency, and a hard VALUE FLOOR anchored
// to the value-maximizer's own build on the same pool. A weighted fit+value blend could collapse
// back into the value slop (the diagnosed confound: kblIV prices pitching above hitting); a floor
// CONSTRAINT cannot — the identity objective never trades below it.
// ────────────────────────────────────────────────────────────────────────────────────────────────

/** GM risk posture for identity building. */
export type RosterPosture = 'conservative' | 'optimal' | 'aggressive';

/**
 * Posture parameters — §16-tunable placeholder defaults (DECISIONS_LOG 2026-07-01). `valueFloor` =
 * the fraction of the value-max baseline IV the identity build must keep; `boostFitWeight`
 * over-weights the boosted bands inside the fit objective (aggressive leans harder into identity).
 */
export const POSTURE_PARAMS: Record<RosterPosture, { valueFloor: number; boostFitWeight: number }> = {
  conservative: { valueFloor: 0.95, boostFitWeight: 1 },
  optimal: { valueFloor: 0.9, boostFitWeight: 1 },
  aggressive: { valueFloor: 0.82, boostFitWeight: 1.25 },
};

/** Per cap-row embodiment: roster cohort mean vs pool cohort mean, in pool standard deviations. */
export interface EmbodimentRow {
  key: string;
  rosterMean: number;
  poolMean: number;
  poolStd: number;
  z: number;
}

export interface EmbodimentReport {
  boostRows: EmbodimentRow[];
  nerfRows: EmbodimentRow[];
  /** Mean z across boosted rows — the headline "does the roster LOOK like the identity" number. */
  boostZ: number;
  nerfZ: number;
}

export interface IdentityRosterResult {
  name: string;
  posture: RosterPosture;
  players: SimPlayer[];
  /**
   * Chosen picks carrying their TRUE identity-slot index; array `players` order is NOT guaranteed to
   * equal slot order — consumers that need per-slot attribution must key on this.
   */
  slotPicks: readonly { slotIndex: number; player: SimPlayer }[];
  totalIv: number;
  totalSalary: number;
  totalTax: number;
  rosterSize: number;
  solvent: boolean;
  legalRoster: boolean;
  /** Solvent with zero luxury tax — the ranker's green-flag dimension (JK tax-band ruling). */
  noTax: boolean;
  /** The pure value-maximizer's IV on the same (possibly ban-reduced) pool. */
  baselineIv: number;
  valueFloor: number;
  floorMet: boolean;
  embodiment: EmbodimentReport;
}

function capShiftFractions(caps: LuxuryCapRow[], tier: TierKey): Map<string, number> {
  const base = LUXURY_CAP_TABLES[tier];
  const frac = new Map<string, number>();
  caps.forEach((row, i) => {
    const b = base[i];
    if (b && b.cap > 0) {
      const f = row.cap / b.cap - 1;
      if (f !== 0) frac.set(`${row.group}/${row.stat}`, f);
    }
  });
  return frac;
}

/** Caps with the BOOSTED rows' shift scaled by `boostWeight` — used only inside the fit objective. */
function weightedCaps(caps: LuxuryCapRow[], tier: TierKey, boostWeight: number): LuxuryCapRow[] {
  if (boostWeight === 1) return caps;
  const base = LUXURY_CAP_TABLES[tier];
  return caps.map((row, i) => {
    const b = base[i];
    if (!b || b.cap <= 0) return row;
    const f = row.cap / b.cap - 1;
    return f > 0 ? { ...row, cap: b.cap * (1 + f * boostWeight) } : row;
  });
}

function cohortOf(key: string, players: SimPlayer[]): number[] {
  const [group, stat] = key.split('/');
  if (group === 'hitters') {
    return players.filter((p) => !p.isPitcher).map((p) => p.bat[stat as keyof SimPlayer['bat']] ?? 0);
  }
  const wantRotation = group === 'rotation';
  return players
    .filter((p) => (wantRotation ? canStart(p) : canRelieve(p)))
    .map((p) => p.pit?.[stat as 'VEL' | 'JNK' | 'ACC'] ?? 0);
}

function meanStd(xs: number[]): { mean: number; std: number } {
  if (xs.length === 0) return { mean: 0, std: 0 };
  const mean = xs.reduce((s, x) => s + x, 0) / xs.length;
  const variance = xs.reduce((s, x) => s + (x - mean) ** 2, 0) / xs.length;
  return { mean, std: Math.sqrt(variance) };
}

/**
 * Does a built roster VISIBLY express the archetype? For every boosted (and nerfed) cap row, compare
 * the roster's relevant cohort (position players for hitter stats; startable / relievable arms for
 * rotation / bullpen stats) against the SAME cohort of the full pool, in pool standard deviations.
 * The identity-embodiment gate asserts boostZ > 0 (FABLE-C1 verification requirement).
 */
export function identityEmbodiment(
  players: SimPlayer[],
  archetype: SimArchetype,
  tier: TierKey,
  pool: SimPlayer[],
): EmbodimentReport {
  const frac = capShiftFractions(archetypeCaps(archetype, tier), tier);
  const rowFor = (key: string): EmbodimentRow => {
    const rosterCohort = cohortOf(key, players);
    const poolCohort = cohortOf(key, pool);
    const rosterMean = meanStd(rosterCohort).mean;
    const { mean: poolMean, std: poolStd } = meanStd(poolCohort);
    return { key, rosterMean, poolMean, poolStd, z: poolStd > 0 ? (rosterMean - poolMean) / poolStd : 0 };
  };
  const boostRows = [...frac.entries()].filter(([, f]) => f > 0).map(([k]) => rowFor(k));
  const nerfRows = [...frac.entries()].filter(([, f]) => f < 0).map(([k]) => rowFor(k));
  const avg = (rows: EmbodimentRow[]) => (rows.length ? rows.reduce((s, r) => s + r.z, 0) / rows.length : 0);
  return { boostRows, nerfRows, boostZ: avg(boostRows), nerfZ: avg(nerfRows) };
}

const IDENTITY_MAX_PASSES = 40;

/**
 * Ruling-A slot machinery for the IDENTITY path (audit F3 + F4). The value-max SLOT_PLAN above is
 * frozen-gate machinery and stays byte-stable; the identity builder uses ITS OWN plan whose
 * backup-C slot honors `canCover` (secondary-C hitters, Two Way (C) arms) and whose slot ORDER +
 * pure-first arm assignment cannot strand the bullpen when a legal assignment exists.
 */
type IdentitySlotKind = SlotKind | { kind: 'backupC' };

/** pos ×8 → backupC → sp ×4 → rp ×3 → cp ×1 → flex ×4 → swing LAST (pitcher-count context is known). */
const IDENTITY_SLOT_PLAN: IdentitySlotKind[] = [
  ...HITTER_POSITIONS.map((position) => ({ kind: 'pos', position } as IdentitySlotKind)),
  { kind: 'backupC' } as IdentitySlotKind,
  ...Array.from({ length: 4 }, () => ({ kind: 'sp' } as IdentitySlotKind)),
  ...Array.from({ length: 3 }, () => ({ kind: 'rp' } as IdentitySlotKind)),
  { kind: 'cp' } as IdentitySlotKind,
  ...Array.from({ length: 4 }, () => ({ kind: 'flex' } as IdentitySlotKind)),
  { kind: 'benchOrRp' } as IdentitySlotKind,
];

/** Old SLOT_PLAN index → IDENTITY_SLOT_PLAN index (re-seeding the value baseline as a climb start). */
const VALUE_TO_IDENTITY_SLOT: number[] = [
  0, 1, 2, 3, 4, 5, 6, 7, // pos ×8
  8, // backup primary-C → backupC (a primary-C is valid coverage)
  17, 18, 19, 20, // flex ×4
  21, // swing
  9, 10, 11, 12, // sp ×4
  16, // cp
  13, 14, 15, // rp ×3
];

/**
 * Identity-path eligibility. `greedyCtx` is set only during the sequential greedy start (running
 * pitcher count); swap shortlists pass undefined and rely on the climb's legality-violation term.
 * - backupC (F3): any covering HITTER (primary- or secondary-C); a Two Way (C) pitcher only when no
 *   covering hitter remains and the staff has headroom under the 9-pitcher ceiling.
 * - sp / rp (F4): PURE-role arms first — swings are spent only after every pure arm of that side is
 *   used, so the greedy start can never consume the swings a legal bullpen needed.
 */
function identityEligible(
  pool: SimPlayer[],
  slot: IdentitySlotKind,
  used: Set<string>,
  greedyCtx?: { pitchers: number },
): SimPlayer[] {
  const free = pool.filter((p) => !used.has(p.id));
  if (slot.kind === 'backupC') {
    const coveringHitters = free.filter((p) => !p.isPitcher && canCover(p, 'C'));
    const twoWayArms = free.filter((p) => p.isPitcher && p.twoWayVariant === 'C');
    if (greedyCtx === undefined) return [...coveringHitters, ...twoWayArms];
    if (coveringHitters.length > 0) return coveringHitters;
    return greedyCtx.pitchers < LEGAL_MAX_PITCHERS ? twoWayArms : [];
  }
  if (slot.kind === 'benchOrRp' && greedyCtx !== undefined && greedyCtx.pitchers >= LEGAL_MAX_PITCHERS) {
    return free.filter((p) => !p.isPitcher);
  }
  if (slot.kind === 'sp' && greedyCtx !== undefined) {
    const pure = free.filter((p) => p.isPitcher && p.role === 'SP');
    return pure.length > 0 ? pure : free.filter(canStart);
  }
  if (slot.kind === 'rp' && greedyCtx !== undefined) {
    const pure = free.filter((p) => p.isPitcher && p.role === 'RP');
    if (pure.length > 0) return pure;
    const nonCloser = free.filter((p) => canRelieve(p) && !isCloser(p));
    return nonCloser.length > 0 ? nonCloser : free.filter(canRelieve);
  }
  if (slot.kind === 'cp') return free.filter(isCloser);
  return eligible(pool, slot as SlotKind, used);
}

function normalizeIdentityPins(
  pool: SimPlayer[],
  pinned: ReadonlyArray<{ slotIndex: number; playerId: string }> | undefined,
): Map<number, SimPlayer> | undefined {
  if (!pinned?.length) return undefined;
  const byId = new Map(pool.map((player) => [player.id, player]));
  const pinnedBySlot = new Map<number, SimPlayer>();
  const usedPlayers = new Set<string>();
  for (const pin of pinned) {
    if (usedPlayers.has(pin.playerId) || pinnedBySlot.has(pin.slotIndex)) continue;
    const player = byId.get(pin.playerId);
    const slot = IDENTITY_SLOT_PLAN[pin.slotIndex];
    if (!player || !slot) continue;
    const eligibleForPinnedSlot = identityEligible(pool, slot, new Set()).some((candidate) => candidate.id === player.id);
    if (!eligibleForPinnedSlot) continue;
    pinnedBySlot.set(pin.slotIndex, player);
    usedPlayers.add(player.id);
  }
  return pinnedBySlot.size > 0 ? pinnedBySlot : undefined;
}

const LEGAL_MAX_PITCHERS = LEGAL_ROSTER.maxPitchers;

/** Sequential greedy over IDENTITY_SLOT_PLAN with the running pitcher-count context. */
function identityGreedyStart(
  pool: SimPlayer[],
  score: (p: SimPlayer) => number,
  slotBonus?: (playerId: string, slotIndex: number) => number,
  pinnedBySlot?: ReadonlyMap<number, SimPlayer>,
): SlotPick[] {
  if (pinnedBySlot?.size) {
    const picks: SlotPick[] = [];
    const used = new Set<string>();
    let pitchers = 0;
    for (const [slotIndex, player] of pinnedBySlot) {
      picks.push({ slotIndex, player });
      used.add(player.id);
      if (player.isPitcher) pitchers += 1;
    }
    for (let i = 0; i < IDENTITY_SLOT_PLAN.length; i += 1) {
      if (pinnedBySlot.has(i)) continue;
      const cands = identityEligible(pool, IDENTITY_SLOT_PLAN[i], used, { pitchers });
      if (cands.length === 0) continue;
      const slotScore = (c: SimPlayer) => score(c) + (slotBonus?.(c.id, i) ?? 0);
      const chosen = cands.reduce((best, c) => (slotScore(c) > slotScore(best) ? c : best));
      picks.push({ slotIndex: i, player: chosen });
      used.add(chosen.id);
      if (chosen.isPitcher) pitchers += 1;
    }
    return picks;
  }
  const picks: SlotPick[] = [];
  const used = new Set<string>();
  let pitchers = 0;
  for (let i = 0; i < IDENTITY_SLOT_PLAN.length; i += 1) {
    const cands = identityEligible(pool, IDENTITY_SLOT_PLAN[i], used, { pitchers });
    if (cands.length === 0) continue;
    const slotScore = (c: SimPlayer) => score(c) + (slotBonus?.(c.id, i) ?? 0);
    const chosen = cands.reduce((best, c) => (slotScore(c) > slotScore(best) ? c : best));
    picks.push({ slotIndex: i, player: chosen });
    used.add(chosen.id);
    if (chosen.isPitcher) pitchers += 1;
  }
  return picks;
}

/** Identity-path candidate shortlist (same three lenses as `shortlist`, identity eligibility). */
function identityShortlist(
  pool: SimPlayer[],
  slot: IdentitySlotKind,
  used: Set<string>,
  fitScore: (p: SimPlayer) => number,
  slotIndex?: number,
  slotBonus?: (playerId: string, slotIndex: number) => number,
): SimPlayer[] {
  const cands = identityEligible(pool, slot, used);
  const lensScore = (p: SimPlayer) =>
    fitScore(p) + (slotBonus && slotIndex !== undefined ? slotBonus(p.id, slotIndex) : 0);
  const byIv = [...cands].sort((a, b) => b.iv - a.iv).slice(0, 24);
  const bySalary = [...cands].sort((a, b) => a.salary - b.salary).slice(0, 10);
  const byFit = [...cands].sort((a, b) => lensScore(b) - lensScore(a)).slice(0, 18);
  const seen = new Set<string>();
  return [...byIv, ...byFit, ...bySalary].filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true)));
}

/** Dominates over-budget/floor dollars-and-IV units; keeps illegal states strictly ordered below. */
const ILLEGAL_ROSTER_PENALTY = 1e9;

/**
 * The constrained identity climb: LEXICOGRAPHIC acceptance — first drive VIOLATION (illegality +
 * over-budget + value-floor shortfall) to zero (repair), then maximize total FIT while violation
 * stays zero. Legality is IN the violation term (audit F3): swaps that would break the roster's
 * legality — e.g. a backup-C coverage swap that busts the 9-pitcher ceiling — are never accepted
 * from a legal state, and repair prefers legality-restoring swaps.
 * `pinnedSlots` assumes `start` already contains the correct pinned occupants; it only freezes those
 * slots against later swaps.
 */
function constrainedIdentityClimb(
  start: SlotPick[],
  pool: SimPlayer[],
  caps: LuxuryCapRow[],
  budget: number,
  floorIv: number,
  fitScore: (p: SimPlayer) => number,
  slotBonus?: (playerId: string, slotIndex: number) => number,
  pinnedSlots?: ReadonlySet<number>,
): SlotPick[] {
  const picks = start.map((p) => ({ ...p }));
  const used = new Set(picks.map((p) => p.player.id));
  // The preference bonus is slot-positional, so fit is assessed over PICKS (player + slot),
  // not the bare player list. Absent bonus adds an exact 0 — byte-identical acceptance.
  const assess = (players: SimPlayer[]) => {
    const iv = players.reduce((s, p) => s + p.iv, 0);
    const over = Math.max(0, rosterCost(players, caps) - budget);
    const short = Math.max(0, floorIv - iv);
    const illegal = players.length === LEGAL_ROSTER.size && isLegalRoster(players) ? 0 : ILLEGAL_ROSTER_PENALTY;
    const fit = players.reduce(
      (s, p, idx) => s + fitScore(p) + (slotBonus?.(p.id, picks[idx].slotIndex) ?? 0),
      0,
    );
    return { violation: illegal + over + short, fit };
  };
  for (let pass = 0; pass < IDENTITY_MAX_PASSES; pass += 1) {
    let improved = false;
    for (let idx = 0; idx < picks.length; idx += 1) {
      if (pinnedSlots?.has(picks[idx].slotIndex)) continue;
      const current = picks[idx].player;
      const usedExcept = new Set(used);
      usedExcept.delete(current.id);
      const players = picks.map((p) => p.player);
      let best = assess(players);
      let bestRepl: SimPlayer | null = null;
      for (const repl of identityShortlist(
        pool,
        IDENTITY_SLOT_PLAN[picks[idx].slotIndex],
        usedExcept,
        fitScore,
        picks[idx].slotIndex,
        slotBonus,
      )) {
        if (repl.id === current.id) continue;
        players[idx] = repl;
        const t = assess(players);
        const better =
          t.violation < best.violation - 1e-9 ||
          (t.violation <= best.violation + 1e-9 && t.fit > best.fit + 1e-6);
        if (better) {
          best = t;
          bestRepl = repl;
        }
      }
      players[idx] = current;
      if (bestRepl) {
        used.delete(current.id);
        used.add(bestRepl.id);
        picks[idx] = { slotIndex: picks[idx].slotIndex, player: bestRepl };
        improved = true;
      }
    }
    if (!improved) break;
  }
  return picks;
}

export interface BuildIdentityOptions {
  /** Real non-shill league clubs. Required so advisory tax can never silently fall back to 20. */
  realTeamCount: number;
  /** Optional already-resolved team tax caps. Snake uses this roster-local seam. */
  taxCaps?: readonly LuxuryCapRow[];
  /** Snake rooms use the shared sub-cent affordability law; other builders remain strict. */
  affordabilityLaw?: 'strict' | 'snake-money';
  posture?: RosterPosture;
  /** Override the posture's value floor (fraction of the value-max baseline). */
  valueFloorOverride?: number;
  /** Player ids unavailable for this build — the snipe-test's ban list (draftability ranker). */
  banned?: ReadonlySet<string>;
  /**
   * Cohort the embodiment z-scores compare against (default: the build pool). The EXTRACTOR passes
   * its fixed SOURCE universe here — a candidate pool deliberately stuffed with league-feasibility
   * bodies raises a pool-relative bar mechanically, penalizing identity verdicts for an artifact of
   * the comparison, not the roster (FABLE-C1B fix round).
   */
  embodimentReference?: SimPlayer[];
  /**
   * PREFERENCE-AWARE BUILD (taxonomy polish leg — the C4-B designer/whisper seam): a
   * per-(player, identity-slot) bonus ADDED to the fit objective in the identity climb, so
   * the build path honors the GM's per-slot archetype/tilt asks. The CALLER computes the
   * bonus (the adapter classifies with the full profile — this module stays classifier-free
   * and its calibrated dependency surface unchanged). ABSENT → byte-identical builds (the
   * objective adds an exact 0). Never consulted by the frozen value baseline.
   */
  slotPreferenceBonus?: (playerId: string, slotIndex: number) => number;
  /**
   * PIN-CONSTRAINED BUILD (FABLE_ITERATE_DRAFT_DESIGN_2026-07-03 §2.2a): fixed
   * player-slot commitments honored before the identity greedy seed. Invalid pins are
   * dropped silently here; `buildBest22Target` owns user-facing drop reporting.
   * When combined with `banned`, pins normalize against the ban-filtered pool; no live divergence
   * today because `buildBest22Target` passes no banned set.
   */
  pinned?: ReadonlyArray<{ slotIndex: number; playerId: string }>;
}

/**
 * Build a LEGAL roster that EMBODIES the archetype (FABLE-C1's generalized builder): maximize
 * archetype fit subject to legality + solvency + a posture-scaled value floor anchored to the pure
 * value-maximizer's build on the same pool. Two starts keep the floor reachable from both
 * directions; pinned builds seed both starts through the same fixed-slot constraint.
 */
export function buildIdentityRoster(
  fullPool: SimPlayer[],
  archetype: SimArchetype,
  tier: TierKey,
  budget: number,
  options: BuildIdentityOptions,
): IdentityRosterResult {
  const posture = options.posture ?? 'optimal';
  const params = POSTURE_PARAMS[posture];
  const pool = options.banned?.size ? fullPool.filter((p) => !options.banned!.has(p.id)) : fullPool;

  const caps = options.taxCaps
    ? [...options.taxCaps]
    : archetypeTaxCaps(archetype, tier, options.realTeamCount);
  const valueFit = makeFitScore(archetypeCaps(archetype, tier), tier);

  // The pure value-max baseline on the SAME pool anchors the floor (identical two-start procedure
  // to buildBestRoster, kept inline so that function stays byte-compatible for the frozen gate).
  const objOf = (picks: SlotPick[]) => objective(picks.map((p) => p.player), caps, budget);
  const fromValue = climb(greedyStart(pool, (p) => p.iv), pool, caps, budget, valueFit);
  const fromFit = climb(greedyStart(pool, valueFit), pool, caps, budget, valueFit);
  const baselinePicks = objOf(fromFit) > objOf(fromValue) ? fromFit : fromValue;
  const baselineIv = baselinePicks.reduce((s, p) => s + p.player.iv, 0);

  const valueFloor = options.valueFloorOverride ?? params.valueFloor;
  const floorIv = baselineIv * valueFloor;
  const fitScore = makeFitScore(
    weightedCaps(archetypeCaps(archetype, tier), tier, params.boostFitWeight),
    tier,
  );

  const slotBonus = options.slotPreferenceBonus;
  const pinnedBySlot = normalizeIdentityPins(pool, options.pinned);
  const pinnedSlots = pinnedBySlot ? new Set(pinnedBySlot.keys()) : undefined;
  const idFromFit = constrainedIdentityClimb(
    identityGreedyStart(pool, fitScore, slotBonus, pinnedBySlot),
    pool,
    caps,
    budget,
    floorIv,
    fitScore,
    slotBonus,
    pinnedSlots,
  );
  // Unpinned builds re-seed the value baseline into identity slot indices; pinned builds use a
  // value-greedy fixed-slot seed so the frozen occupants stay correct.
  const idFromValue = constrainedIdentityClimb(
    pinnedBySlot
      ? identityGreedyStart(pool, (p) => p.iv, undefined, pinnedBySlot)
      : baselinePicks.map((p) => ({ slotIndex: VALUE_TO_IDENTITY_SLOT[p.slotIndex], player: p.player })),
    pool,
    caps,
    budget,
    floorIv,
    fitScore,
    slotBonus,
    pinnedSlots,
  );

  const evaluate = (picks: SlotPick[]) => {
    const players = picks.map((p) => p.player);
    const totalIv = players.reduce((s, p) => s + p.iv, 0);
    const totalSalary = players.reduce((s, p) => s + p.salary, 0);
    const totalTax = taxOf(players, caps);
    return {
      picks,
      players,
      totalIv,
      totalSalary,
      totalTax,
      solvent: options.affordabilityLaw === 'snake-money'
        ? snakeMoneyNonnegative(budget - totalSalary - totalTax)
        : totalSalary + totalTax <= budget,
      floorMet: totalIv >= floorIv - 1e-9,
      fit: players.reduce((s, p) => s + fitScore(p), 0),
    };
  };
  const a = evaluate(idFromFit);
  const b = evaluate(idFromValue);
  // Feasible = LEGAL 22 + solvent + floor (audit F3 follow-through: a shorter/illegal candidate
  // must never out-rank a legal build on raw fit — legality is a feasibility dimension, not a flag).
  const feasible = (x: typeof a) =>
    x.players.length === ROSTER_SIZE && isLegalRoster(x.players) && x.solvent && x.floorMet;
  const feasibleA = feasible(a);
  const feasibleB = feasible(b);
  const chosen = feasibleA === feasibleB ? (a.fit >= b.fit ? a : b) : feasibleA ? a : b;

  return {
    name: archetype.name,
    posture,
    players: chosen.players,
    slotPicks: chosen.picks.map((p) => ({ slotIndex: p.slotIndex, player: p.player })),
    totalIv: chosen.totalIv,
    totalSalary: chosen.totalSalary,
    totalTax: chosen.totalTax,
    rosterSize: chosen.players.length,
    solvent: chosen.solvent,
    legalRoster: isLegalRoster(chosen.players),
    noTax: chosen.solvent && chosen.totalTax <= 1e-9,
    baselineIv,
    valueFloor,
    floorMet: chosen.floorMet,
    embodiment: identityEmbodiment(chosen.players, archetype, tier, options.embodimentReference ?? fullPool),
  };
}

/**
 * The archetype-fit scorer as a standalone (FABLE-C1B; audit C1B-2): the EXACT fit function the
 * identity climb maximizes — including the posture's `boostFitWeight` cap weighting — exposed so
 * the pool extractor ranks source players by the SAME rule that builds rosters (single-math rule).
 */
export function archetypeFitScorer(
  archetype: SimArchetype,
  tier: TierKey,
  posture: RosterPosture = 'optimal',
): (p: SimPlayer) => number {
  const caps = archetypeCaps(archetype, tier);
  return makeFitScore(weightedCaps(caps, tier, POSTURE_PARAMS[posture].boostFitWeight), tier);
}
