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
import { canRelieve, canStart, isLegalRoster } from '../data/rosterConstruction';

/** A pool player for the simulator: construction ratings + canonical value/salary. */
export interface SimPlayer extends ConstructionPlayer {
  /** canonical frozen kblIV — the team-strength metric. */
  iv: number;
  /** base salary ≈ kblIV — the budget constraint. */
  salary: number;
  /** primary position label (for hitter slotting). */
  position: string;
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

function archetypeCaps(archetype: SimArchetype, tier: TierKey): LuxuryCapRow[] {
  const base = LUXURY_CAP_TABLES[tier];
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

const ROSTER_SIZE = 22;
const HITTER_POSITIONS = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'] as const;

type SlotKind =
  | { kind: 'pos'; position: string }
  | { kind: 'flex' }
  | { kind: 'benchOrRp' } // the swing slot: a 5th bench bat OR a 5th reliever (whichever builds more value)
  | { kind: 'sp' }
  | { kind: 'rp' };

/**
 * 22 slots = the canonical LEGAL SMB4 roster (`LEGAL_ROSTER`, JK-confirmed 2026-06-30), so the balance
 * result translates to a real auction draft rather than to impossible teams:
 *   8 field starters (one of each C/1B/2B/3B/SS/LF/CF/RF, HARD by primary position)
 * + 1 REQUIRED backup catcher (a 2nd primary-C — the most load-bearing bench slot)
 * + 4 bench position players (any non-pitcher)
 * + 1 SWING slot — a 5th bench bat OR a 5th reliever, so bench flexes 4-5 and relievers flex 4-5
 * + 4 starting pitchers (SP or SP/RP)
 * + 4 relievers (RP/CP, or an SP/RP swing)
 * = 13-14 position players + 8-9 pitchers. The 8 field slots + the backup C are HARD position
 * requirements (no "any hitter" fallback — see `eligible`); an archetype that cannot field a legal
 * roster is a real finding, not a silent pass (verified by `isLegalRoster`).
 */
const SLOT_PLAN: SlotKind[] = [
  ...HITTER_POSITIONS.map((position) => ({ kind: 'pos', position } as SlotKind)),
  { kind: 'pos', position: 'C' } as SlotKind, // required backup catcher
  ...Array.from({ length: 4 }, () => ({ kind: 'flex' } as SlotKind)),
  { kind: 'benchOrRp' } as SlotKind, // swing: 5th bench bat or 5th reliever
  ...Array.from({ length: 4 }, () => ({ kind: 'sp' } as SlotKind)),
  ...Array.from({ length: 4 }, () => ({ kind: 'rp' } as SlotKind)),
];

function eligible(pool: SimPlayer[], slot: SlotKind, used: Set<string>): SimPlayer[] {
  const free = pool.filter((p) => !used.has(p.id));
  if (slot.kind === 'sp') return free.filter(canStart);
  if (slot.kind === 'rp') return free.filter(canRelieve);
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
): ArchetypeSimResult {
  const caps = archetypeCaps(archetype, tier);
  const fitScore = makeFitScore(caps, tier);
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
  band = 0.1,
): BalanceReport {
  const budget = computePoolTierCap(pool.map((p) => p.iv), tier);
  const results = archetypes.map((a) => buildBestRoster(pool, a, tier, budget));
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
