/**
 * Archetype DRAFTABILITY ranker — the one-click "which identities can this pool actually support"
 * verdict (FABLE-C1 deliverable g; snipe-test formula RATIFIED by JK, DECISIONS_LOG 2026-07-01).
 *
 * The metric is DELETION-RESILIENCE, not solution-counting (trivial swaps make raw solution counts
 * meaningless): build the archetype's best identity-true roster, then BAN the players it leaned on
 * hardest (its catchers, its startable arms, its top boosted-band players) and make it build again —
 * repeatedly. An archetype is truly draftable when it survives its own plan being raided. Verdicts:
 *   GREEN  — ≥2 successive builds that fit UNDER the cap with zero luxury tax
 *   YELLOW — buildable, but fragile (fails a rebuild) or only by paying tax; the reason is named
 *   LOCKED — cannot complete a legal, solvent, identity-positive roster at all
 * The picker consumes LOCKED as grayed-out-with-reason (JK ruling). The snipe test also doubles as
 * the pre-market-model CONTENTION hedge (two-stage ruling): "still draftable after your favorites
 * get sniped" approximates rivalry until C3's completion-probability layer lands.
 *
 * Uncontested by design: this is the stage-1 feasibility/eligibility gate. Whether the team will
 * actually WIN the players against 7 rivals + shills is C2B/C3 (market model) scope.
 */

import {
  buildIdentityRoster,
  identityEmbodiment,
  type IdentityRosterResult,
  type RosterPosture,
  type SimArchetype,
  type SimPlayer,
} from './archetypeBalanceSimulator';
import { computePoolTierCap } from './leagueConstruction';
import { archetypeCapShift, HISTORICAL_ARCHETYPES, type HistoricalArchetype } from '../data/historicalArchetypes';
import { canCover, LEGAL_ROSTER } from '../data/rosterConstruction';
import type { TierKey } from '../data/tierParams';

export type DraftabilityBand = 'GREEN' | 'YELLOW' | 'LOCKED';

/** §16-tunable placeholder — snipe-test dials (DECISIONS_LOG 2026-07-01: defaults, JK-tunable). */
export const DRAFTABILITY_TUNING = {
  /** Successive ban-and-rebuild rounds attempted (K cap). */
  maxRebuilds: 3,
  /** No-tax builds required for a GREEN verdict. */
  greenNoTaxBuilds: 2,
  /** Boosted-band position players banned per rebuild round (the "leaned-on" raid depth). */
  banTopBoostedHitters: 4,
  /** Rank shifts beyond this across the fielding sweep flag the ranking as yardstick-sensitive. */
  stableRankShift: 3,
  /**
   * A build only counts as identity-TRUE when its boosted-band z clears this floor. 0 = "above the
   * pool mean" (the strict product default, proven for all 24 on the oracle pool). A continuous,
   * pool-relative dial — tests of the verdict MACHINERY may inject a lower floor to decouple
   * resilience/tax mechanics from small-pool z knife-edges.
   */
  minEmbodimentZ: 0,
} as const;

export interface ArchetypeDraftability {
  archetypeId: string;
  name: string;
  band: DraftabilityBand;
  /** Successful builds before a rebuild failed (0..maxRebuilds). */
  resilience: number;
  noTaxBuilds: number;
  taxedBuilds: number;
  /** First build's boosted-band z-score vs the pool (identity-embodiment margin). */
  embodimentZ: number;
  /** budget − (salary + tax) of the first build. */
  taxHeadroom: number;
  /** Plain-language card reasons (YELLOW/LOCKED always carry at least one). */
  reasons: string[];
  /** 1-based position after sorting (best first). */
  rank: number;
}

export function historicalToSimArchetype(archetype: HistoricalArchetype): SimArchetype {
  return { name: archetype.name, rawShift: archetypeCapShift(archetype) };
}

/** Hitter-stat keys an archetype boosts (POW/CON/SPD/FLD/ARM subset of its boosts). */
function boostedBatKeys(archetype: HistoricalArchetype): ('POW' | 'CON' | 'SPD' | 'FLD' | 'ARM')[] {
  return archetype.boosts.filter(
    (s): s is 'POW' | 'CON' | 'SPD' | 'FLD' | 'ARM' =>
      s === 'POW' || s === 'CON' || s === 'SPD' || s === 'FLD' || s === 'ARM',
  );
}

/**
 * The snipe: ban what the build LEANED ON — every C-coverage player it used (primary-C, secondary-C,
 * or a Two Way (C) arm, per Ruling A), every startable arm it used, its RELIEF corps when the
 * archetype's identity lives in the bullpen (audit F5 — a PEN_-boosted archetype must not re-sign
 * its own elite pen on the rebuild), and its top boosted-band position players (deterministic id
 * tie-break). Scarce + identity-defining players go first, exactly like rival GMs sniping a plan.
 */
function banSnipeTargets(build: IdentityRosterResult, archetype: HistoricalArchetype, banned: Set<string>): void {
  const boostsBullpen = archetype.boosts.some((s) => s.startsWith('PEN_'));
  for (const p of build.players) {
    if (canCover(p, 'C')) banned.add(p.id);
    if (p.isPitcher && (p.role === 'SP' || p.role === 'SP/RP')) banned.add(p.id);
    if (boostsBullpen && p.isPitcher && (p.role === 'RP' || p.role === 'CP')) banned.add(p.id);
  }
  const batKeys = boostedBatKeys(archetype);
  if (batKeys.length > 0) {
    const score = (p: SimPlayer) => batKeys.reduce((s, k) => s + p.bat[k], 0);
    [...build.players]
      .filter((p) => !p.isPitcher)
      .sort((a, b) => score(b) - score(a) || a.id.localeCompare(b.id))
      .slice(0, DRAFTABILITY_TUNING.banTopBoostedHitters)
      .forEach((p) => banned.add(p.id));
  }
}

/** Pool-depth facts used to NAME the reason an identity is fragile/locked (plain-language cards). */
function poolDepthReasons(pool: SimPlayer[]): string[] {
  const reasons: string[] = [];
  const hitters = pool.filter((p) => !p.isPitcher);
  for (const pos of LEGAL_ROSTER.fieldPositions) {
    const primaries = hitters.filter((p) => p.position === pos).length;
    const floor = pos === 'C' ? LEGAL_ROSTER.minCatchers : 1;
    if (primaries < floor + 1) {
      reasons.push(`only ${primaries} primary-${pos} player${primaries === 1 ? '' : 's'} in the pool`);
    }
  }
  const startable = pool.filter((p) => p.isPitcher && (p.role === 'SP' || p.role === 'SP/RP')).length;
  const relievable = pool.filter(
    (p) => p.isPitcher && (p.role === 'RP' || p.role === 'CP' || p.role === 'SP/RP'),
  ).length;
  if (startable < LEGAL_ROSTER.startingPitchers + 1) reasons.push(`only ${startable} startable arms in the pool`);
  if (relievable < LEGAL_ROSTER.minRelievers + 1) reasons.push(`only ${relievable} relief-capable arms in the pool`);
  return reasons;
}

export interface RankDraftabilityOptions {
  /** Real non-shill league clubs; required by the advisory tax build. */
  realTeamCount: number;
  posture?: RosterPosture;
  /** Override the tier budget (defaults to computePoolTierCap on the pool). */
  budgetOverride?: number;
  /** Override the identity-true floor (defaults to DRAFTABILITY_TUNING.minEmbodimentZ). */
  minEmbodimentZ?: number;
  /**
   * Cohort embodiment compares against (default: the ranked pool). The EXTRACTOR passes its fixed
   * SOURCE so feasibility-stuffed candidate pools don't mechanically raise the identity bar.
   */
  embodimentReference?: import('./archetypeBalanceSimulator').SimPlayer[];
}

/**
 * Rank a set of archetypes' draftability against a pool (uncontested stage-1 verdicts). Sorted best
 * first: band (GREEN < YELLOW < LOCKED), then resilience, embodiment margin, tax headroom.
 */
export function rankArchetypeDraftability(
  pool: SimPlayer[],
  archetypes: readonly HistoricalArchetype[],
  tier: TierKey,
  options: RankDraftabilityOptions,
): ArchetypeDraftability[] {
  const posture = options.posture ?? 'optimal';
  const budget = options.budgetOverride ?? computePoolTierCap(pool.map((p) => p.iv), tier);

  const rows = archetypes.map((archetype) => {
    const simArch = historicalToSimArchetype(archetype);
    const banned = new Set<string>();
    let resilience = 0;
    let noTaxBuilds = 0;
    let taxedBuilds = 0;
    let firstBuild: IdentityRosterResult | null = null;
    let failedBuild: IdentityRosterResult | null = null;

    for (let round = 0; round < DRAFTABILITY_TUNING.maxRebuilds; round += 1) {
      const build = buildIdentityRoster(pool, simArch, tier, budget, {
        realTeamCount: options.realTeamCount,
        posture,
        banned,
        ...(options.embodimentReference ? { embodimentReference: options.embodimentReference } : {}),
      });
      if (round === 0) firstBuild = build;
      const identityPositive =
        build.embodiment.boostZ > (options.minEmbodimentZ ?? DRAFTABILITY_TUNING.minEmbodimentZ);
      const success = build.legalRoster && build.solvent && build.floorMet && identityPositive;
      if (!success) {
        failedBuild = build;
        break;
      }
      resilience += 1;
      if (build.noTax) noTaxBuilds += 1;
      else taxedBuilds += 1;
      banSnipeTargets(build, archetype, banned);
    }

    const band: DraftabilityBand =
      resilience === 0 ? 'LOCKED' : noTaxBuilds >= DRAFTABILITY_TUNING.greenNoTaxBuilds ? 'GREEN' : 'YELLOW';

    const reasons: string[] = [];
    if (band === 'LOCKED' && failedBuild) {
      if (!failedBuild.legalRoster) {
        reasons.push('the pool cannot field a legal roster for this identity');
        reasons.push(...poolDepthReasons(pool));
      } else if (!failedBuild.solvent) {
        reasons.push('cannot complete within the max-tax budget');
      } else if (!failedBuild.floorMet) {
        reasons.push(`identity build falls below the ${posture} value floor`);
      } else {
        reasons.push('the pool lacks players who express this identity (embodiment below the floor)');
      }
    } else if (band === 'YELLOW') {
      if (resilience < DRAFTABILITY_TUNING.maxRebuilds) {
        reasons.push(
          `fragile — fails once its top targets are gone (survived ${resilience} of ${DRAFTABILITY_TUNING.maxRebuilds} snipe rounds)`,
        );
      }
      if (taxedBuilds > 0) {
        reasons.push(`needs the luxury tax to complete (${taxedBuilds} of ${resilience} builds taxed)`);
      }
    }

    return {
      archetypeId: archetype.id,
      name: archetype.name,
      band,
      resilience,
      noTaxBuilds,
      taxedBuilds,
      embodimentZ: firstBuild?.embodiment.boostZ ?? 0,
      taxHeadroom: firstBuild ? budget - (firstBuild.totalSalary + firstBuild.totalTax) : 0,
      reasons,
      rank: 0,
    };
  });

  const bandOrder: Record<DraftabilityBand, number> = { GREEN: 0, YELLOW: 1, LOCKED: 2 };
  rows.sort(
    (a, b) =>
      bandOrder[a.band] - bandOrder[b.band] ||
      b.resilience - a.resilience ||
      b.embodimentZ - a.embodimentZ ||
      b.taxHeadroom - a.taxHeadroom ||
      a.archetypeId.localeCompare(b.archetypeId),
  );
  rows.forEach((row, i) => {
    row.rank = i + 1;
  });
  return rows;
}

/** The one-click, all-24 form (the picker/eligibility consumer). */
export function rankAllArchetypesForPool(
  pool: SimPlayer[],
  tier: TierKey,
  options: RankDraftabilityOptions,
): ArchetypeDraftability[] {
  return rankArchetypeDraftability(pool, HISTORICAL_ARCHETYPES, tier, options);
}

// ────────────────────────────────────────────────────────────────────────────────────────────────
// Fielding-sensitivity ROBUSTNESS SWEEP (JK 2026-07-01: the IV engine is the best available parity
// yardstick but KNOWN to undervalue fielding; no SMB4-logic sim exists to prove real balance). The
// sweep re-ranks draftability with each hitter's iv (and its salary mirror) scaled up by their
// fielding share — if the rank order holds, the verdicts are robust to the yardstick's known bias;
// a collapsing glove-heavy archetype means the yardstick, not the archetype, is the problem.
// ────────────────────────────────────────────────────────────────────────────────────────────────

export interface FieldingSweepRun {
  multiplier: number;
  ranks: { archetypeId: string; rank: number; band: DraftabilityBand }[];
}

export interface FieldingRobustnessReport {
  base: ArchetypeDraftability[];
  sweeps: FieldingSweepRun[];
  /** Largest |rank shift| any archetype suffers at any sweep multiplier vs the base ranking. */
  maxRankShift: number;
  shifts: { archetypeId: string; maxShift: number }[];
  stable: boolean;
}

function fieldingScaledPool(pool: SimPlayer[], multiplier: number): SimPlayer[] {
  if (multiplier === 1) return pool;
  return pool.map((p) => {
    if (p.isPitcher) return p;
    const total = p.bat.POW + p.bat.CON + p.bat.SPD + p.bat.FLD + p.bat.ARM;
    const fldShare = total > 0 ? p.bat.FLD / total : 0;
    const scale = 1 + (multiplier - 1) * fldShare;
    // salary ≈ iv is the engine's own pricing mirror — scale both so the budget constraint tracks.
    return { ...p, iv: p.iv * scale, salary: p.salary * scale };
  });
}

export function fieldingRobustnessSweep(
  pool: SimPlayer[],
  archetypes: readonly HistoricalArchetype[],
  tier: TierKey,
  multipliers: readonly number[] = [1.15, 1.3],
  options: RankDraftabilityOptions,
): FieldingRobustnessReport {
  const base = rankArchetypeDraftability(pool, archetypes, tier, options);
  const baseRank = new Map(base.map((r) => [r.archetypeId, r.rank]));

  const sweeps = multipliers.map((multiplier) => {
    const scaled = fieldingScaledPool(pool, multiplier);
    const ranked = rankArchetypeDraftability(scaled, archetypes, tier, options);
    return {
      multiplier,
      ranks: ranked.map((r) => ({ archetypeId: r.archetypeId, rank: r.rank, band: r.band })),
    };
  });

  const shifts = base.map((r) => {
    let maxShift = 0;
    for (const sweep of sweeps) {
      const at = sweep.ranks.find((x) => x.archetypeId === r.archetypeId);
      if (at) maxShift = Math.max(maxShift, Math.abs(at.rank - (baseRank.get(r.archetypeId) ?? at.rank)));
    }
    return { archetypeId: r.archetypeId, maxShift };
  });
  const maxRankShift = shifts.reduce((m, s) => Math.max(m, s.maxShift), 0);

  return { base, sweeps, maxRankShift, shifts, stable: maxRankShift <= DRAFTABILITY_TUNING.stableRankShift };
}

// Re-export for report tooling that wants per-build embodiment detail without a second import path.
export { identityEmbodiment };
