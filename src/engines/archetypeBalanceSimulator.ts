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
  assignLuxuryTaxPitchingGroups,
  luxuryTax,
  luxuryRowPlayerRating,
  playerEligibleForLuxuryRow,
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

function rosterCost(players: SimPlayer[], caps: LuxuryCapRow[]): number {
  return players.reduce((s, p) => s + p.salary, 0) + taxOf(players, caps);
}

type ValueObjective = { over: number; iv: number };

/** Solvency is lexicographically absolute; value breaks ties only after overage is minimized to zero. */
function objective(players: SimPlayer[], caps: LuxuryCapRow[], budget: number): ValueObjective {
  const iv = players.reduce((s, p) => s + p.iv, 0);
  const over = Math.max(0, rosterCost(players, caps) - budget);
  return { over, iv };
}

function betterObjective(candidate: ValueObjective, current: ValueObjective): boolean {
  if (candidate.over < current.over - 1e-9) return true;
  if (candidate.over > current.over + 1e-9) return false;
  return candidate.iv > current.iv + 1;
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
type AssignedPitchingGroup = 'rotation' | 'bullpen';

function assignedPitchingGroupById(players: readonly SimPlayer[]): ReadonlyMap<string, AssignedPitchingGroup> {
  const assigned = assignLuxuryTaxPitchingGroups([...players]);
  return new Map<string, AssignedPitchingGroup>([
    ...assigned.rotation.map((player) => [player.id, 'rotation'] as const),
    ...assigned.bullpen.map((player) => [player.id, 'bullpen'] as const),
  ]);
}

function defaultPitchingGroup(player: SimPlayer): AssignedPitchingGroup {
  if (player.role === 'RP' || player.role === 'CP' || player.role === 'SP/RP') return 'bullpen';
  return 'rotation';
}

function makeFitScore(
  caps: LuxuryCapRow[],
  tier: TierKey,
  pitchingGroupById?: ReadonlyMap<string, AssignedPitchingGroup>,
): (p: SimPlayer) => number {
  const base = LUXURY_CAP_TABLES[tier];
  const frac = new Map<string, number>();
  caps.forEach((row, i) => {
    const b = base[i];
    if (b && b.cap > 0) frac.set(`${row.group}/${row.stat}`, row.cap / b.cap - 1);
  });
  const f = (group: string, stat: string) => frac.get(`${group}/${stat}`) ?? 0;
  return (p: SimPlayer) => {
    const pitcherGroup = pitchingGroupById?.get(p.id) ?? defaultPitchingGroup(p);
    return caps.reduce((score, row) => {
      if (p.isPitcher && row.group !== 'hitters' && row.group !== pitcherGroup) return score;
      if (!playerEligibleForLuxuryRow(p, row, caps)) return score;
      return score + luxuryRowPlayerRating(p, row, caps) * f(row.group, row.stat);
    }, 0);
  };
}

function makeRosterFitScore(caps: LuxuryCapRow[], tier: TierKey): (players: SimPlayer[]) => number {
  return (players) => {
    const fitScore = makeFitScore(caps, tier, assignedPitchingGroupById(players));
    return players.reduce((sum, player) => sum + fitScore(player), 0);
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
 * Hill-climb from a starting roster: repeatedly accept the single best slot-swap that first reduces
 * over-budget dollars to zero, then maximises value without leaving solvency. Because a swap can replace a cap-BUSTING star with a
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
        if (betterObjective(obj, bestObj)) {
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
  const best = betterObjective(objOf(fromFit), objOf(fromValue)) ? fromFit : fromValue;

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
  /** False when the bounded exclusive-group cycle neighborhood could not be exhausted. */
  optimizationComplete: boolean;
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

function cohortOf(
  key: string,
  players: SimPlayer[],
  tier: TierKey,
  pitchingGroupById: ReadonlyMap<string, AssignedPitchingGroup>,
): number[] {
  const [group, stat] = key.split('/');
  const caps = LUXURY_CAP_TABLES[tier];
  const row = caps.find((candidate) => candidate.group === group && candidate.stat === stat);
  if (!row) return [];
  return players.filter((player) => {
    if (!playerEligibleForLuxuryRow(player, row, caps)) return false;
    if (group === 'hitters') return true;
    return pitchingGroupById.get(player.id) === group;
  }).map((player) => luxuryRowPlayerRating(player, row, caps));
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
  const rosterPitchingGroupById = assignedPitchingGroupById(players);
  const poolPitchingGroupById = assignedPitchingGroupById(pool);
  const rowFor = (key: string): EmbodimentRow => {
    const rosterCohort = cohortOf(key, players, tier, rosterPitchingGroupById);
    const poolCohort = cohortOf(key, pool, tier, poolPitchingGroupById);
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
  exclusiveGroupId?: (player: SimPlayer) => string,
): SimPlayer[] {
  const free = pool.filter((p) => !used.has(exclusiveGroupId?.(p) ?? p.id));
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
  // `free` already applies either player-id or exclusive-group occupancy. Reusing `pool` here
  // would reinterpret group ids as card ids and allow a constrained climb to select siblings.
  return eligible(free, slot as SlotKind, new Set());
}

function normalizeIdentityPins(
  pool: SimPlayer[],
  pinned: ReadonlyArray<{ slotIndex: number; playerId: string }> | undefined,
  exclusiveGroupId?: (player: SimPlayer) => string,
): Map<number, SimPlayer> | undefined {
  if (!pinned?.length) return undefined;
  const byId = new Map(pool.map((player) => [player.id, player]));
  const pinnedBySlot = new Map<number, SimPlayer>();
  const usedPlayers = new Set<string>();
  for (const pin of pinned) {
    const player = byId.get(pin.playerId);
    const uniqueId = player ? exclusiveGroupId?.(player) ?? player.id : pin.playerId;
    if (usedPlayers.has(uniqueId) || pinnedBySlot.has(pin.slotIndex)) continue;
    const slot = IDENTITY_SLOT_PLAN[pin.slotIndex];
    if (!player || !slot) continue;
    const eligibleForPinnedSlot = identityEligible(pool, slot, new Set()).some((candidate) => candidate.id === player.id);
    if (!eligibleForPinnedSlot) continue;
    pinnedBySlot.set(pin.slotIndex, player);
    usedPlayers.add(uniqueId);
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
  exclusiveGroupId?: (player: SimPlayer) => string,
): SimPlayer[] {
  const cands = identityEligible(pool, slot, used, undefined, exclusiveGroupId);
  const lensScore = (p: SimPlayer) =>
    fitScore(p) + (slotBonus && slotIndex !== undefined ? slotBonus(p.id, slotIndex) : 0);
  const byIv = [...cands].sort((a, b) => b.iv - a.iv).slice(0, 24);
  const bySalary = [...cands].sort((a, b) => a.salary - b.salary).slice(0, 10);
  const byFit = [...cands].sort((a, b) => lensScore(b) - lensScore(a)).slice(0, 18);
  const seen = new Set<string>();
  return [...byIv, ...byFit, ...bySalary].filter((p) => (seen.has(p.id) ? false : (seen.add(p.id), true)));
}

/** Exact rectangular maximum-weight assignment (rows to distinct columns). */
function maximumWeightAssignment(weights: readonly (readonly number[])[]): number[] | null {
  const rowCount = weights.length;
  const columnCount = weights[0]?.length ?? 0;
  if (rowCount === 0) return [];
  if (columnCount < rowCount || weights.some((row) => row.length !== columnCount)) return null;

  // Hungarian minimization over negated weights. Missing edges stay finite for the algorithm, then
  // are rejected from the recovered assignment. Stable column order is the deterministic tie law.
  const forbiddenCost = 1e15;
  const u = Array<number>(rowCount + 1).fill(0);
  const v = Array<number>(columnCount + 1).fill(0);
  const matchedRow = Array<number>(columnCount + 1).fill(0);
  const previousColumn = Array<number>(columnCount + 1).fill(0);

  for (let row = 1; row <= rowCount; row += 1) {
    matchedRow[0] = row;
    const minCost = Array<number>(columnCount + 1).fill(forbiddenCost);
    const usedColumn = Array<boolean>(columnCount + 1).fill(false);
    let column = 0;
    do {
      usedColumn[column] = true;
      const activeRow = matchedRow[column];
      let delta = forbiddenCost;
      let nextColumn = 0;
      for (let candidateColumn = 1; candidateColumn <= columnCount; candidateColumn += 1) {
        if (usedColumn[candidateColumn]) continue;
        const weight = weights[activeRow - 1][candidateColumn - 1];
        const cost = Number.isFinite(weight) ? -weight : forbiddenCost;
        const reduced = cost - u[activeRow] - v[candidateColumn];
        if (reduced < minCost[candidateColumn]) {
          minCost[candidateColumn] = reduced;
          previousColumn[candidateColumn] = column;
        }
        if (minCost[candidateColumn] < delta) {
          delta = minCost[candidateColumn];
          nextColumn = candidateColumn;
        }
      }
      if (!Number.isFinite(delta) || delta >= forbiddenCost / 2 || nextColumn === 0) return null;
      for (let candidateColumn = 0; candidateColumn <= columnCount; candidateColumn += 1) {
        if (usedColumn[candidateColumn]) {
          u[matchedRow[candidateColumn]] += delta;
          v[candidateColumn] -= delta;
        } else {
          minCost[candidateColumn] -= delta;
        }
      }
      column = nextColumn;
    } while (matchedRow[column] !== 0);

    do {
      const prior = previousColumn[column];
      matchedRow[column] = matchedRow[prior];
      column = prior;
    } while (column !== 0);
  }

  const assignment = Array<number>(rowCount).fill(-1);
  for (let column = 1; column <= columnCount; column += 1) {
    if (matchedRow[column] > 0) assignment[matchedRow[column] - 1] = column - 1;
  }
  return assignment.every((column, row) => column >= 0 && Number.isFinite(weights[row][column]))
    ? assignment
    : null;
}

/**
 * Exact group-capacity seed for the weighted identity optimizer. Every sibling remains an edge;
 * the solver chooses the best card for each slot/group pair and the best disjoint group assignment
 * globally. A legal 22 can use at most one pitcher across backup-C and swing, so the two exhaustive
 * hitter-policy branches cover the complete legal assignment space without a heuristic fallback.
 */
function exactExclusiveIdentityStart(
  pool: SimPlayer[],
  score: (player: SimPlayer) => number,
  exclusiveGroupId: (player: SimPlayer) => string,
  slotBonus?: (playerId: string, slotIndex: number) => number,
  pinnedBySlot?: ReadonlyMap<number, SimPlayer>,
): SlotPick[] | null {
  const pinnedPicks = [...(pinnedBySlot?.entries() ?? [])]
    .sort(([left], [right]) => left - right)
    .map(([slotIndex, player]) => ({ slotIndex, player }));
  const pinnedGroups = new Set(pinnedPicks.map((pick) => exclusiveGroupId(pick.player)));
  if (pinnedGroups.size !== pinnedPicks.length) return null;
  const openSlotIndices = IDENTITY_SLOT_PLAN
    .map((_, slotIndex) => slotIndex)
    .filter((slotIndex) => !pinnedBySlot?.has(slotIndex));
  const groupIds = [...new Set(pool.map(exclusiveGroupId))]
    .filter((groupId) => !pinnedGroups.has(groupId))
    .sort((left, right) => left.localeCompare(right));
  if (groupIds.length < openSlotIndices.length) return null;
  const groupIndex = new Map(groupIds.map((groupId, index) => [groupId, index]));

  const policies = [new Set([8]), new Set([21])]; // backup-C hitter OR swing hitter
  let best: { picks: SlotPick[]; score: number; tie: string } | null = null;
  for (const forceHitterSlots of policies) {
    if (pinnedPicks.some((pick) => forceHitterSlots.has(pick.slotIndex) && pick.player.isPitcher)) continue;
    const edgePlayers: Array<Array<SimPlayer | null>> = openSlotIndices.map(() =>
      Array<SimPlayer | null>(groupIds.length).fill(null));
    const weights: number[][] = openSlotIndices.map((slotIndex, rowIndex) => {
      const row = Array<number>(groupIds.length).fill(Number.NEGATIVE_INFINITY);
      for (const player of identityEligible(pool, IDENTITY_SLOT_PLAN[slotIndex], pinnedGroups, undefined, exclusiveGroupId)) {
        if (forceHitterSlots.has(slotIndex) && player.isPitcher) continue;
        const columnIndex = groupIndex.get(exclusiveGroupId(player));
        if (columnIndex === undefined) continue;
        const weight = score(player) + (slotBonus?.(player.id, slotIndex) ?? 0);
        const current = edgePlayers[rowIndex][columnIndex];
        if (!current || weight > row[columnIndex] + 1e-9
          || (Math.abs(weight - row[columnIndex]) <= 1e-9 && player.id.localeCompare(current.id) < 0)) {
          row[columnIndex] = weight;
          edgePlayers[rowIndex][columnIndex] = player;
        }
      }
      return row;
    });
    const assignment = maximumWeightAssignment(weights);
    if (!assignment) continue;
    const openPicks = openSlotIndices.map((slotIndex, rowIndex) => ({
      slotIndex,
      player: edgePlayers[rowIndex][assignment[rowIndex]]!,
    }));
    if (openPicks.some((pick) => !pick.player)) continue;
    const picks = [...pinnedPicks, ...openPicks].sort((left, right) => left.slotIndex - right.slotIndex);
    const players = picks.map((pick) => pick.player);
    if (picks.length !== ROSTER_SIZE
      || new Set(players.map(exclusiveGroupId)).size !== ROSTER_SIZE
      || !isLegalRoster(players)) continue;
    const totalScore = picks.reduce(
      (sum, pick) => sum + score(pick.player) + (slotBonus?.(pick.player.id, pick.slotIndex) ?? 0),
      0,
    );
    const tie = picks.map((pick) => `${pick.slotIndex}:${pick.player.id}`).join('|');
    if (!best || totalScore > best.score + 1e-9
      || (Math.abs(totalScore - best.score) <= 1e-9 && tie.localeCompare(best.tie) < 0)) {
      best = { picks, score: totalScore, tie };
    }
  }
  return best?.picks ?? null;
}

function constrainedExclusiveValueClimb(
  start: SlotPick[],
  pool: SimPlayer[],
  caps: LuxuryCapRow[],
  budget: number,
  fitScore: (player: SimPlayer) => number,
  exclusiveGroupId: (player: SimPlayer) => string,
): SlotPick[] {
  const picks = start.map((pick) => ({ ...pick }));
  const used = new Set(picks.map((pick) => exclusiveGroupId(pick.player)));
  const assess = (players: SimPlayer[]): ValueObjective => {
    const result = objective(players, caps, budget);
    return {
      over: result.over + (players.length === ROSTER_SIZE && isLegalRoster(players) ? 0 : ILLEGAL_ROSTER_PENALTY),
      iv: result.iv,
    };
  };
  for (let pass = 0; pass < IDENTITY_MAX_PASSES; pass += 1) {
    let improved = false;
    for (let index = 0; index < picks.length; index += 1) {
      const current = picks[index].player;
      const usedExcept = new Set(used);
      usedExcept.delete(exclusiveGroupId(current));
      const players = picks.map((pick) => pick.player);
      let bestObjective = assess(players);
      let bestReplacement: SimPlayer | null = null;
      for (const replacement of identityShortlist(
        pool,
        IDENTITY_SLOT_PLAN[picks[index].slotIndex],
        usedExcept,
        fitScore,
        undefined,
        undefined,
        exclusiveGroupId,
      )) {
        if (replacement.id === current.id) continue;
        players[index] = replacement;
        const candidateObjective = assess(players);
        if (betterObjective(candidateObjective, bestObjective)) {
          bestObjective = candidateObjective;
          bestReplacement = replacement;
        }
      }
      players[index] = current;
      if (bestReplacement) {
        used.delete(exclusiveGroupId(current));
        used.add(exclusiveGroupId(bestReplacement));
        picks[index] = { slotIndex: picks[index].slotIndex, player: bestReplacement };
        improved = true;
      }
    }
    if (!improved) break;
  }
  return picks;
}

const EXCLUSIVE_CYCLE_NODE_CAP = 250_000;
const EXCLUSIVE_CYCLE_CANDIDATE_CAP = 250_000;
const EXCLUSIVE_CYCLE_IMPROVEMENT_PASSES = 6;

interface ExclusiveCycleResult {
  picks: SlotPick[];
  complete: boolean;
}

/**
 * Exhausts simple occupied-version-group cycles under the caller's real full-roster objective.
 * Hungarian remains only an additive seed; this pass can jointly rotate sibling cards through an
 * arbitrary-length alternating cycle. Caps are explicit proof boundaries, never success shortcuts.
 */
function improveExclusiveGroupCycles<Score>(input: {
  start: SlotPick[];
  pool: SimPlayer[];
  exclusiveGroupId: (player: SimPlayer) => string;
  assess: (picks: readonly SlotPick[]) => Score;
  better: (candidate: Score, current: Score) => boolean;
  pinnedSlots?: ReadonlySet<number>;
}): ExclusiveCycleResult {
  let picks = input.start.map((pick) => ({ ...pick }));
  const cardsByGroup = new Map<string, SimPlayer[]>();
  for (const player of input.pool) {
    const groupId = input.exclusiveGroupId(player);
    const cards = cardsByGroup.get(groupId) ?? [];
    cards.push(player);
    cardsByGroup.set(groupId, cards);
  }
  for (const cards of cardsByGroup.values()) cards.sort((left, right) => left.id.localeCompare(right.id));

  for (let pass = 0; pass < EXCLUSIVE_CYCLE_IMPROVEMENT_PASSES; pass += 1) {
    const movableNodes = picks
      .map((pick, pickIndex) => ({ pick, pickIndex }))
      .filter(({ pick }) => !input.pinnedSlots?.has(pick.slotIndex))
      .sort((left, right) => left.pick.slotIndex - right.pick.slotIndex);
    if (movableNodes.length < 2) return { picks, complete: true };

    const edgeCards = new Map<string, readonly SimPlayer[]>();
    const cardsForEdge = (sourcePickIndex: number, targetPickIndex: number): readonly SimPlayer[] => {
      const key = `${sourcePickIndex}:${targetPickIndex}`;
      const cached = edgeCards.get(key);
      if (cached) return cached;
      const sourceGroup = input.exclusiveGroupId(picks[sourcePickIndex].player);
      const targetSlotIndex = picks[targetPickIndex].slotIndex;
      const eligibleIds = new Set(identityEligible(
        input.pool,
        IDENTITY_SLOT_PLAN[targetSlotIndex],
        new Set(),
        undefined,
        input.exclusiveGroupId,
      ).map((player) => player.id));
      const cards = (cardsByGroup.get(sourceGroup) ?? []).filter((player) => eligibleIds.has(player.id));
      edgeCards.set(key, cards);
      return cards;
    };

    // A one-card occupied group may be an indispensable intermediary in a version rotation. Include
    // every unpinned node in an SCC that contains a real multi-card choice, and prune only components
    // whose cycles can do nothing beyond permuting the exact same player IDs. With at most 22 roster
    // nodes, deterministic transitive closure is smaller and clearer than a special-case path heuristic.
    const reachable = movableNodes.map((source) => movableNodes.map((target) =>
      source.pickIndex !== target.pickIndex && cardsForEdge(source.pickIndex, target.pickIndex).length > 0));
    for (let through = 0; through < movableNodes.length; through += 1) {
      for (let source = 0; source < movableNodes.length; source += 1) {
        if (!reachable[source][through]) continue;
        for (let target = 0; target < movableNodes.length; target += 1) {
          reachable[source][target] ||= reachable[through][target];
        }
      }
    }
    const versionNodeIndices = movableNodes
      .map((node, index) => (cardsByGroup.get(input.exclusiveGroupId(node.pick.player))?.length ?? 0) > 1
        ? index
        : -1)
      .filter((index) => index >= 0);
    const cycleNodes = movableNodes.filter((_, index) => versionNodeIndices.some((versionIndex) =>
      reachable[index][versionIndex] && reachable[versionIndex][index]));
    if (cycleNodes.length < 2) return { picks, complete: true };

    let nodesVisited = 0;
    let candidatesEvaluated = 0;
    let capped = false;
    let bestPicks: SlotPick[] | null = null;
    let bestScore = input.assess(picks);

    const evaluateCycle = (cycle: readonly number[]) => {
      const choices = cycle.map((sourcePickIndex, index) =>
        cardsForEdge(sourcePickIndex, cycle[(index + 1) % cycle.length]));
      if (choices.some((cards) => cards.length === 0)) return;
      const selected: SimPlayer[] = [];
      const enumerateCards = (edgeIndex: number) => {
        if (capped) return;
        if (edgeIndex === choices.length) {
          candidatesEvaluated += 1;
          if (candidatesEvaluated > EXCLUSIVE_CYCLE_CANDIDATE_CAP) {
            capped = true;
            return;
          }
          const candidate = picks.map((pick) => ({ ...pick }));
          let changedVersion = false;
          cycle.forEach((sourcePickIndex, index) => {
            const targetPickIndex = cycle[(index + 1) % cycle.length];
            const card = selected[index];
            candidate[targetPickIndex] = { slotIndex: candidate[targetPickIndex].slotIndex, player: card };
            if (card.id !== picks[sourcePickIndex].player.id) changedVersion = true;
          });
          if (!changedVersion) return;
          const score = input.assess(candidate);
          if (input.better(score, bestScore)) {
            bestScore = score;
            bestPicks = candidate;
          }
          return;
        }
        for (const card of choices[edgeIndex]) {
          selected.push(card);
          enumerateCards(edgeIndex + 1);
          selected.pop();
          if (capped) return;
        }
      };
      enumerateCards(0);
    };

    // Canonical simple directed cycles: the root has the smallest slot index in the cycle, which
    // removes rotational duplicates while retaining both directions and every cycle length.
    for (let length = 2; length <= cycleNodes.length && !capped; length += 1) {
      for (let rootIndex = 0; rootIndex < cycleNodes.length && !capped; rootIndex += 1) {
        const root = cycleNodes[rootIndex];
        const path = [root.pickIndex];
        const used = new Set(path);
        const visit = () => {
          if (capped) return;
          nodesVisited += 1;
          if (nodesVisited > EXCLUSIVE_CYCLE_NODE_CAP) {
            capped = true;
            return;
          }
          if (path.length === length) {
            if (cardsForEdge(path[path.length - 1], path[0]).length > 0) evaluateCycle(path);
            return;
          }
          const last = path[path.length - 1];
          for (const next of cycleNodes) {
            if (next.pick.slotIndex <= root.pick.slotIndex || used.has(next.pickIndex)) continue;
            if (cardsForEdge(last, next.pickIndex).length === 0) continue;
            path.push(next.pickIndex);
            used.add(next.pickIndex);
            visit();
            used.delete(next.pickIndex);
            path.pop();
            if (capped) return;
          }
        };
        visit();
      }
    }

    if (capped) return { picks: bestPicks ?? picks, complete: false };
    if (!bestPicks) return { picks, complete: true };
    picks = bestPicks;
  }
  // A final no-improvement pass was not completed, so local completion is unproved.
  return { picks, complete: false };
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
  rosterFitScore: (players: SimPlayer[]) => number,
  slotBonus?: (playerId: string, slotIndex: number) => number,
  pinnedSlots?: ReadonlySet<number>,
  exclusiveGroupId?: (player: SimPlayer) => string,
): SlotPick[] {
  const picks = start.map((p) => ({ ...p }));
  const uniqueId = (player: SimPlayer) => exclusiveGroupId?.(player) ?? player.id;
  const used = new Set(picks.map((p) => uniqueId(p.player)));
  // The preference bonus is slot-positional, so fit is assessed over PICKS (player + slot),
  // not the bare player list. Absent bonus adds an exact 0 — byte-identical acceptance.
  const assess = (players: SimPlayer[]) => {
    const iv = players.reduce((s, p) => s + p.iv, 0);
    const over = Math.max(0, rosterCost(players, caps) - budget);
    const short = Math.max(0, floorIv - iv);
    const illegal = players.length === LEGAL_ROSTER.size && isLegalRoster(players) ? 0 : ILLEGAL_ROSTER_PENALTY;
    const fit = rosterFitScore(players) + players.reduce(
      (sum, player, idx) => sum + (slotBonus?.(player.id, picks[idx].slotIndex) ?? 0),
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
      usedExcept.delete(uniqueId(current));
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
        exclusiveGroupId,
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
        used.delete(uniqueId(current));
        used.add(uniqueId(bestRepl));
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
  /**
   * Optional one-capacity identity group for alternate cards of the same person. When present, the
   * weighted optimizer keeps every card edge and solves slot-to-group assignment exactly before
   * its normal constrained climb. Absent callers retain the existing byte-path.
   */
  exclusiveGroupByPlayerId?: ReadonlyMap<string, string>;
}

export interface IdentityValueBaselineResult {
  baselineIv: number;
  valueFloor: number;
  optimizationComplete: boolean;
}

function buildIdentityValueBaselineState(input: {
  pool: SimPlayer[];
  caps: LuxuryCapRow[];
  budget: number;
  valueFit: (player: SimPlayer) => number;
  exclusiveGroupId?: (player: SimPlayer) => string;
}) {
  const objOf = (picks: SlotPick[]) => objective(picks.map((pick) => pick.player), input.caps, input.budget);
  const assessValuePicks = (picks: readonly SlotPick[]): ValueObjective => {
    const players = picks.map((pick) => pick.player);
    const result = objective(players, input.caps, input.budget);
    return {
      over: result.over + (players.length === ROSTER_SIZE && isLegalRoster(players) ? 0 : ILLEGAL_ROSTER_PENALTY),
      iv: result.iv,
    };
  };
  const buildExclusiveValueStart = (score: (player: SimPlayer) => number): ExclusiveCycleResult => {
    if (!input.exclusiveGroupId) return { picks: [], complete: true };
    const seed = exactExclusiveIdentityStart(input.pool, score, input.exclusiveGroupId) ?? [];
    const climbed = constrainedExclusiveValueClimb(
      seed,
      input.pool,
      input.caps,
      input.budget,
      input.valueFit,
      input.exclusiveGroupId,
    );
    return improveExclusiveGroupCycles({
      start: climbed,
      pool: input.pool,
      exclusiveGroupId: input.exclusiveGroupId,
      assess: assessValuePicks,
      better: betterObjective,
    });
  };
  const fromValueState = input.exclusiveGroupId
    ? buildExclusiveValueStart((player) => player.iv)
    : {
        picks: climb(
          greedyStart(input.pool, (player) => player.iv),
          input.pool,
          input.caps,
          input.budget,
          input.valueFit,
        ),
        complete: true,
      };
  const fromFitState = input.exclusiveGroupId
    ? (fromValueState.complete ? buildExclusiveValueStart(input.valueFit) : fromValueState)
    : {
        picks: climb(
          greedyStart(input.pool, input.valueFit),
          input.pool,
          input.caps,
          input.budget,
          input.valueFit,
        ),
        complete: true,
      };
  const baselineState = betterObjective(objOf(fromFitState.picks), objOf(fromValueState.picks))
    ? fromFitState
    : fromValueState;
  return {
    picks: baselineState.picks,
    baselineIv: baselineState.picks.reduce((sum, pick) => sum + pick.player.iv, 0),
    optimizationComplete: fromValueState.complete && fromFitState.complete,
  };
}

/**
 * Canonical value-max floor authority without running the identity climb. Large Snake source
 * certificates use this against immutable Full Sources, then run the bounded identity search on a
 * smaller candidate union. `buildIdentityRoster` calls the same helper, so the floor has one math
 * path rather than a test-only approximation.
 */
export function buildIdentityValueBaseline(
  fullPool: SimPlayer[],
  archetype: SimArchetype,
  tier: TierKey,
  budget: number,
  options: BuildIdentityOptions,
): IdentityValueBaselineResult {
  const posture = options.posture ?? 'optimal';
  const params = POSTURE_PARAMS[posture];
  const pool = options.banned?.size ? fullPool.filter((player) => !options.banned!.has(player.id)) : fullPool;
  const caps = options.taxCaps
    ? [...options.taxCaps]
    : archetypeTaxCaps(archetype, tier, options.realTeamCount);
  const valueFit = makeFitScore(archetypeCaps(archetype, tier), tier);
  const exclusiveGroupId = options.exclusiveGroupByPlayerId
    ? (player: SimPlayer) => options.exclusiveGroupByPlayerId!.get(player.id) ?? player.id
    : undefined;
  const baseline = buildIdentityValueBaselineState({ pool, caps, budget, valueFit, exclusiveGroupId });
  return {
    baselineIv: baseline.baselineIv,
    valueFloor: options.valueFloorOverride ?? params.valueFloor,
    optimizationComplete: baseline.optimizationComplete,
  };
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
  const exclusiveGroupId = options.exclusiveGroupByPlayerId
    ? (player: SimPlayer) => options.exclusiveGroupByPlayerId!.get(player.id) ?? player.id
    : undefined;

  // The pure value-max baseline on the SAME pool anchors the floor. The exported baseline-only
  // authority uses this exact helper for large-source proof without paying for another identity
  // climb.
  const baseline = buildIdentityValueBaselineState({ pool, caps, budget, valueFit, exclusiveGroupId });
  const baselineOptimizationComplete = baseline.optimizationComplete;
  const baselinePicks = baseline.picks;
  const baselineIv = baseline.baselineIv;
  const valueFloor = options.valueFloorOverride ?? params.valueFloor;
  const floorIv = baselineIv * valueFloor;
  const fitScore = makeFitScore(
    weightedCaps(archetypeCaps(archetype, tier), tier, params.boostFitWeight),
    tier,
  );
  const rosterFitScore = makeRosterFitScore(
    weightedCaps(archetypeCaps(archetype, tier), tier, params.boostFitWeight),
    tier,
  );

  const slotBonus = options.slotPreferenceBonus;
  const pinnedBySlot = normalizeIdentityPins(pool, options.pinned, exclusiveGroupId);
  const pinnedSlots = pinnedBySlot ? new Set(pinnedBySlot.keys()) : undefined;
  const fitStart = exclusiveGroupId
    ? exactExclusiveIdentityStart(pool, fitScore, exclusiveGroupId, slotBonus, pinnedBySlot) ?? []
    : identityGreedyStart(pool, fitScore, slotBonus, pinnedBySlot);
  const idFromFitSingle = constrainedIdentityClimb(
    fitStart,
    pool,
    caps,
    budget,
    floorIv,
    fitScore,
    rosterFitScore,
    slotBonus,
    pinnedSlots,
    exclusiveGroupId,
  );
  // Unpinned builds re-seed the value baseline into identity slot indices; pinned builds use a
  // value-greedy fixed-slot seed so the frozen occupants stay correct.
  const idFromValueSingle = constrainedIdentityClimb(
    exclusiveGroupId
      ? (pinnedBySlot
          ? exactExclusiveIdentityStart(pool, (player) => player.iv, exclusiveGroupId, undefined, pinnedBySlot) ?? []
          : baselinePicks)
      : (pinnedBySlot
          ? identityGreedyStart(pool, (p) => p.iv, undefined, pinnedBySlot)
          : baselinePicks.map((p) => ({ slotIndex: VALUE_TO_IDENTITY_SLOT[p.slotIndex], player: p.player }))),
    pool,
    caps,
    budget,
    floorIv,
    fitScore,
    rosterFitScore,
    slotBonus,
    pinnedSlots,
    exclusiveGroupId,
  );

  const assessIdentityPicks = (picks: readonly SlotPick[]) => {
    const players = picks.map((pick) => pick.player);
    const iv = players.reduce((sum, player) => sum + player.iv, 0);
    const over = Math.max(0, rosterCost(players, caps) - budget);
    const short = Math.max(0, floorIv - iv);
    const illegal = players.length === ROSTER_SIZE && isLegalRoster(players) ? 0 : ILLEGAL_ROSTER_PENALTY;
    return {
      violation: illegal + over + short,
      fit: rosterFitScore(players) + players.reduce(
        (sum, player, index) => sum + (slotBonus?.(player.id, picks[index].slotIndex) ?? 0),
        0,
      ),
    };
  };
  const betterIdentityScore = (
    candidate: ReturnType<typeof assessIdentityPicks>,
    current: ReturnType<typeof assessIdentityPicks>,
  ) => candidate.violation < current.violation - 1e-9
    || (candidate.violation <= current.violation + 1e-9 && candidate.fit > current.fit + 1e-6);
  const idFromFitState = exclusiveGroupId && baselineOptimizationComplete
    ? improveExclusiveGroupCycles({
        start: idFromFitSingle,
        pool,
        exclusiveGroupId,
        assess: assessIdentityPicks,
        better: betterIdentityScore,
        pinnedSlots,
      })
    : { picks: idFromFitSingle, complete: !exclusiveGroupId };
  const idFromValueState = exclusiveGroupId && baselineOptimizationComplete
    ? improveExclusiveGroupCycles({
        start: idFromValueSingle,
        pool,
        exclusiveGroupId,
        assess: assessIdentityPicks,
        better: betterIdentityScore,
        pinnedSlots,
      })
    : { picks: idFromValueSingle, complete: !exclusiveGroupId };

  const evaluate = (state: ExclusiveCycleResult) => {
    const { picks } = state;
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
      // The combined slot-aware final-start comparison is exclusive to the group-constrained
      // Assistant path. Default callers retain the literal pre-versioning roster-fit comparison.
      fit: rosterFitScore(players) + (exclusiveGroupId
        ? picks.reduce((sum, pick) => sum + (slotBonus?.(pick.player.id, pick.slotIndex) ?? 0), 0)
        : 0),
      optimizationComplete: state.complete,
    };
  };
  const a = evaluate(idFromFitState);
  const b = evaluate(idFromValueState);
  // Feasible = LEGAL 22 + solvent + floor (audit F3 follow-through: a shorter/illegal candidate
  // must never out-rank a legal build on raw fit — legality is a feasibility dimension, not a flag).
  const feasible = (x: typeof a) =>
    x.players.length === ROSTER_SIZE && isLegalRoster(x.players) && x.solvent && x.floorMet;
  const feasibleA = feasible(a);
  const feasibleB = feasible(b);
  let chosen = feasibleA === feasibleB ? (a.fit >= b.fit ? a : b) : feasibleA ? a : b;
  let chosenEmbodiment = identityEmbodiment(
    chosen.players,
    archetype,
    tier,
    options.embodimentReference ?? fullPool,
  );
  // Identity is not embodied when the roster's boosted cohort still sits below the source mean.
  // When both starts are otherwise feasible, require that visible boost before optimizing the full
  // boost-and-sacrifice fit score. This keeps legality, solvency, and the IV floor ahead of identity.
  if (feasibleA && feasibleB && chosenEmbodiment.boostZ <= 0) {
    const alternate = chosen === a ? b : a;
    const alternateEmbodiment = identityEmbodiment(
      alternate.players,
      archetype,
      tier,
      options.embodimentReference ?? fullPool,
    );
    if (alternateEmbodiment.boostZ > 0) {
      chosen = alternate;
      chosenEmbodiment = alternateEmbodiment;
    }
  }
  const identityOptimizationComplete = idFromFitState.complete && idFromValueState.complete;

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
    optimizationComplete: baselineOptimizationComplete && identityOptimizationComplete,
    embodiment: chosenEmbodiment,
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
  assignmentContext?: readonly SimPlayer[],
): (p: SimPlayer) => number {
  const caps = archetypeCaps(archetype, tier);
  return makeFitScore(
    weightedCaps(caps, tier, POSTURE_PARAMS[posture].boostFitWeight),
    tier,
    assignmentContext ? assignedPitchingGroupById(assignmentContext) : undefined,
  );
}
