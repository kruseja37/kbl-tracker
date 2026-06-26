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
  /** increase/decrease modification-name stacks consumed by `shiftLuxuryCaps`. */
  increase: string[];
  decrease: string[];
}

export interface ArchetypeSimResult {
  name: string;
  totalIv: number;
  totalSalary: number;
  totalTax: number;
  rosterSize: number;
  /** Σsalary + Σtax ≤ budget. */
  solvent: boolean;
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
  | { kind: 'sp' }
  | { kind: 'rp' };

/** 22 slots: 8 set position players + 5 flex hitters + 4 starters + 5 relievers (= a topN-valid staff). */
const SLOT_PLAN: SlotKind[] = [
  ...HITTER_POSITIONS.map((position) => ({ kind: 'pos', position } as SlotKind)),
  ...Array.from({ length: 5 }, () => ({ kind: 'flex' } as SlotKind)),
  ...Array.from({ length: 4 }, () => ({ kind: 'sp' } as SlotKind)),
  ...Array.from({ length: 5 }, () => ({ kind: 'rp' } as SlotKind)),
];

function isStarter(player: SimPlayer): boolean {
  return player.isPitcher && (player.role === 'SP' || player.role === 'SP/RP');
}
function isReliever(player: SimPlayer): boolean {
  return player.isPitcher && (player.role === 'RP' || player.role === 'CP' || player.role === 'SP/RP');
}

function eligible(pool: SimPlayer[], slot: SlotKind, used: Set<string>): SimPlayer[] {
  const free = pool.filter((p) => !used.has(p.id));
  if (slot.kind === 'sp') return free.filter(isStarter);
  if (slot.kind === 'rp') return free.filter(isReliever);
  if (slot.kind === 'flex') return free.filter((p) => !p.isPitcher);
  // 'pos': prefer exact primary/secondary position; fall back to any hitter so the roster always fills.
  const exact = free.filter((p) => !p.isPitcher && p.position === slot.position);
  return exact.length > 0 ? exact : free.filter((p) => !p.isPitcher);
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

/**
 * Build the best-achievable 22-man roster under the archetype's SHIFTED caps via hill-climb.
 *   1. Greedy highest-IV-per-slot start.
 *   2. Hill-climb: repeatedly accept the single best slot-swap that improves `objective` (value minus a
 *      stiff over-budget penalty). The penalty first drives the roster under budget, then it maximises
 *      value within budget. Because swaps can replace a cap-BUSTING star with a same-position player
 *      who FITS the archetype's caps (sheds tax for little value), the climb discovers each archetype's
 *      natural roster shape — e.g. Defense First converging on glove-first, weak-bat hitters — instead
 *      of unfairly punishing archetypes whose optimum is counterintuitive. Identical for every
 *      archetype, so the comparison stays fair.
 */
export function buildBestRoster(
  pool: SimPlayer[],
  archetype: SimArchetype,
  tier: TierKey,
  budget: number,
): ArchetypeSimResult {
  const caps = shiftLuxuryCaps(LUXURY_CAP_TABLES[tier], { increase: archetype.increase, decrease: archetype.decrease });
  const fitScore = makeFitScore(caps, tier);
  const picks: SlotPick[] = [];
  const used = new Set<string>();

  for (let i = 0; i < SLOT_PLAN.length; i += 1) {
    const cands = eligible(pool, SLOT_PLAN[i], used);
    if (cands.length === 0) continue;
    const chosen = cands.reduce((best, c) => (c.iv > best.iv ? c : best));
    picks.push({ slotIndex: i, player: chosen });
    used.add(chosen.id);
  }

  const MAX_PASSES = 40;
  for (let pass = 0; pass < MAX_PASSES; pass += 1) {
    let improved = false;
    for (let idx = 0; idx < picks.length; idx += 1) {
      const current = picks[idx].player;
      const usedExcept = new Set(used);
      usedExcept.delete(current.id);
      const players = picks.map((p) => p.player);
      const baseObj = objective(players, caps, budget);

      let bestRepl: SimPlayer | null = null;
      let bestObj = baseObj;
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

  const finalPlayers = picks.map((p) => p.player);
  const totalIv = finalPlayers.reduce((s, p) => s + p.iv, 0);
  const totalSalary = finalPlayers.reduce((s, p) => s + p.salary, 0);
  const totalTax = taxOf(finalPlayers, caps);
  return {
    name: archetype.name,
    totalIv,
    totalSalary,
    totalTax,
    rosterSize: finalPlayers.length,
    solvent: totalSalary + totalTax <= budget,
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
