/**
 * DRAFT-POOL EXTRACTOR — the one-click REVERSE direction (FABLE-C1B; JK requirement 3 + the
 * extractor rulings, DECISIONS_LOG 2026-07-01): select the archetypes a league should support →
 * carve a right-sized draft pool out of a much larger source set (e.g. 240 from 1000+) such that
 * every selected archetype is DRAFTABLE and the field is BALANCED — no identity starts with a
 * stacked deck.
 *
 * Engine-only and build-dark: the league-builder button is C4/spec-recovery surface. Pure function
 * over a provided source set — no storage, no UI, fully deterministic (id tie-breaks everywhere).
 *
 * SINGLE-MATH RULE: construction and verification are C1's committed machinery — seeds come from
 * `buildIdentityRoster`, verdicts from `rankArchetypeDraftability` (the ratified snipe test), fill
 * ranking from `archetypeFitScorer` (the same fit function the identity climb maximizes). This
 * module only orchestrates: structural floors → identity seeds → balanced fill → repair loop.
 *
 * STRUCTURE is a parameter: the MLB 22-man structure ships wired (LEGAL_ROSTER-derived). The FARM
 * 10-man structure is deliberately NOT defined here — farm legality/composition is not grounded on
 * trunk, and the farm-prospect-generation RELOCATION (generate at league-builder time, store
 * HIDDEN, grade-distribution-only validation; JK pre-approved 2026-07-01) is the companion
 * plumbing ticket. When that lands, the farm pool extracts through this same engine with a farm
 * `PoolStructure` + a farm-shaped ranker structure.
 *
 * Uncontested stage-1 semantics (two-stage ruling): "can this pool support the identity at all."
 * The contention-aware layer (will THIS team WIN the players vs N−1 rivals + shills) is C3 scope.
 */

import {
  archetypeFitScorer,
  buildIdentityRoster,
  type RosterPosture,
  type SimArchetype,
  type SimPlayer,
} from './archetypeBalanceSimulator';
import {
  historicalToSimArchetype,
  rankArchetypeDraftability,
  type ArchetypeDraftability,
  type DraftabilityBand,
} from './draftabilityRanker';
import { computePoolTierCap } from './leagueConstruction';
import { canCover, canRelieve, canStart, LEGAL_ROSTER } from '../data/rosterConstruction';
import type { HistoricalArchetype } from '../data/historicalArchetypes';
import type { TierKey } from '../data/tierParams';

/** Per-team structural demands the pool must supply (scaled by teams × oversupply). */
export interface PoolStructure {
  slotsPerTeam: number;
  /** Primary-position players needed per team at each of the eight field spots. */
  primariesPerPosition: number;
  /** Distinct C-coverage bodies needed per team (primary-C, secondary-C, or Two Way (C)). */
  catcherCoverage: number;
  startableArms: number;
  relievableArms: number;
  /** TOTAL pitcher bodies per team (capability floors alone undercount — audit C1B-1: SP/RP swings satisfy both arm floors with one body). */
  minPitchers: number;
  /** TOTAL position-player bodies per team. */
  minPositionPlayers: number;
}

/** The MLB 22-man structure, derived from the canonical law. */
export const MLB_POOL_STRUCTURE: PoolStructure = {
  slotsPerTeam: LEGAL_ROSTER.size,
  primariesPerPosition: 1,
  catcherCoverage: LEGAL_ROSTER.minCatchers,
  startableArms: LEGAL_ROSTER.startingPitchers,
  relievableArms: LEGAL_ROSTER.minRelievers,
  minPitchers: LEGAL_ROSTER.minPitchers,
  minPositionPlayers: LEGAL_ROSTER.minPositionPlayers,
};

/** §16-tunable placeholder — extractor dials (DECISIONS_LOG 2026-07-01 extractor ruling). */
export const EXTRACTOR_TUNING = {
  /** Pool size multiplier over bare roster demand (JK's 1.2× floor; C3 refines the sizing model). */
  oversupply: 1.2,
  /** Balance target: max allowed resilience gap between the best- and worst-off selected archetype. */
  maxResilienceSpread: 1,
  /** Repair-loop cap. */
  maxRepairRounds: 6,
  /** Players fed to the worst-off archetype per repair round. */
  repairBatch: 6,
} as const;

export interface ExtractPoolOptions {
  teams?: number;
  oversupply?: number;
  /** Hard override of the computed target size. */
  targetSize?: number;
  structure?: PoolStructure;
  posture?: RosterPosture;
  /** Forwarded to the ranker (verdict floor; default = the strict product dial). */
  minEmbodimentZ?: number;
  maxRepairRounds?: number;
  maxResilienceSpread?: number;
}

export interface ExtractedPool {
  players: SimPlayer[];
  size: number;
  targetSize: number;
  /** Final snipe-test verdicts for the SELECTED archetypes, on the extracted pool. */
  verdicts: ArchetypeDraftability[];
  /** No LOCKED verdict, band spread ≤ 1 step, resilience spread within tolerance. */
  balanced: boolean;
  repairRounds: number;
  /** Plain-language shortfalls (source-level scarcities, unmet archetypes, cap evictions). */
  notes: string[];
}

export function defaultPoolTargetSize(
  teams: number,
  structure: PoolStructure = MLB_POOL_STRUCTURE,
  oversupply: number = EXTRACTOR_TUNING.oversupply,
): number {
  return Math.ceil(teams * structure.slotsPerTeam * oversupply);
}

const BAND_ORDER: Record<DraftabilityBand, number> = { GREEN: 0, YELLOW: 1, LOCKED: 2 };

function byIvDescIdAsc(a: SimPlayer, b: SimPlayer): number {
  return b.iv - a.iv || a.id.localeCompare(b.id);
}

/**
 * Structural floor pick-lists from the source (deterministic): per-position primaries, extra
 * C-coverage, startable + relievable arms — each scaled to league demand × oversupply. Shortfalls
 * are reported, not fabricated.
 */
function structuralFloor(
  source: SimPlayer[],
  teams: number,
  structure: PoolStructure,
  oversupply: number,
  notes: string[],
): SimPlayer[] {
  const picks = new Map<string, SimPlayer>();
  const need = (n: number) => Math.ceil(n * oversupply);

  for (const pos of LEGAL_ROSTER.fieldPositions) {
    const wanted = need(teams * structure.primariesPerPosition * (pos === 'C' ? structure.catcherCoverage : 1));
    const primaries = source.filter((p) => !p.isPitcher && p.position === pos).sort(byIvDescIdAsc);
    primaries.slice(0, wanted).forEach((p) => picks.set(p.id, p));
    if (pos === 'C') {
      // Ruling A: each team's catcher depth-2 must include a PRIMARY-C STARTER — coverage alone
      // (secondary-C / Two Way (C)) cannot field the position. Name the PRIMARY shortfall
      // separately (audit C1B-R2-1: this note lived in the else-branch C could never reach).
      if (primaries.length < teams * structure.primariesPerPosition) {
        notes.push(
          `source itself is short on primary catchers: ${primaries.length} for ${teams * structure.primariesPerPosition} needed (one starter per team)`,
        );
      }
      // Coverage beyond primaries also counts (secondary-C hitters, Two Way (C) arms).
      const stillWanted = need(teams * structure.catcherCoverage) - Math.min(primaries.length, wanted);
      if (stillWanted > 0) {
        source
          .filter((p) => canCover(p, 'C') && !picks.has(p.id))
          .sort(byIvDescIdAsc)
          .slice(0, stillWanted)
          .forEach((p) => picks.set(p.id, p));
      }
      const coverageInSource = source.filter((p) => canCover(p, 'C')).length;
      if (coverageInSource < teams * structure.catcherCoverage) {
        notes.push(
          `source itself is short on catching: ${coverageInSource} C-coverage players for ${teams * structure.catcherCoverage} needed league-wide`,
        );
      }
    } else if (primaries.length < teams * structure.primariesPerPosition) {
      notes.push(`source itself is short at ${pos}: ${primaries.length} primaries for ${teams} teams`);
    }
  }

  const startable = source.filter(canStart).sort(byIvDescIdAsc);
  const relievable = source.filter(canRelieve).sort(byIvDescIdAsc);
  startable.slice(0, need(teams * structure.startableArms)).forEach((p) => picks.set(p.id, p));
  relievable.slice(0, need(teams * structure.relievableArms)).forEach((p) => picks.set(p.id, p));
  if (startable.length < teams * structure.startableArms) {
    notes.push(`source itself is short on startable arms: ${startable.length} for ${teams * structure.startableArms} needed`);
  }
  if (relievable.length < teams * structure.relievableArms) {
    notes.push(`source itself is short on relief arms: ${relievable.length} for ${teams * structure.relievableArms} needed`);
  }

  // TOTAL-BODY floors (audit C1B-1): capability floors dedup into the same picks — one SP/RP body
  // can satisfy both arm floors — but a league of T teams needs T×minPitchers distinct pitcher
  // BODIES and T×minPositionPlayers hitter BODIES on the field. Top up by iv; name shortfalls.
  const topUpBodies = (
    candidates: SimPlayer[],
    wanted: number,
    already: (p: SimPlayer) => boolean,
    label: string,
    rawNeed: number,
  ) => {
    let have = [...picks.values()].filter(already).length;
    for (const p of candidates) {
      if (have >= wanted) break;
      if (!picks.has(p.id)) {
        picks.set(p.id, p);
        have += 1;
      }
    }
    const available = candidates.length;
    if (available < rawNeed) {
      notes.push(`source itself is short on ${label}: ${available} for ${rawNeed} needed league-wide`);
    }
  };
  topUpBodies(
    source.filter((p) => p.isPitcher).sort(byIvDescIdAsc),
    need(teams * structure.minPitchers),
    (p) => p.isPitcher,
    'pitcher bodies',
    teams * structure.minPitchers,
  );
  topUpBodies(
    source.filter((p) => !p.isPitcher).sort(byIvDescIdAsc),
    need(teams * structure.minPositionPlayers),
    (p) => !p.isPitcher,
    'position-player bodies',
    teams * structure.minPositionPlayers,
  );

  return [...picks.values()];
}

/**
 * Extract a draft pool that supports every SELECTED archetype (uncontested stage-1). Deterministic:
 * structural floors → per-archetype identity seeds → round-robin balanced fill → snipe-test verify
 * → repair (feed the worst-off archetype its missing pieces; evict unclaimed filler at the cap).
 */
export function extractDraftPool(
  source: SimPlayer[],
  selected: readonly HistoricalArchetype[],
  tier: TierKey,
  options: ExtractPoolOptions = {},
): ExtractedPool {
  const teams = options.teams ?? 8;
  const structure = options.structure ?? MLB_POOL_STRUCTURE;

  // Audit C1B-3 + C1B-R2-2 (farm-seam guard) + JK farm ruling 2026-07-01: the verifier below
  // speaks the MLB 22-man law ONLY. Farm extraction has DIFFERENT ruled semantics — fair-supply
  // sizing for 10 picks/team, ~50% archetype-fit targeting (§16-tunable), NO roster/balance
  // guarantees — and lands with the farm-generation relocation ticket. Fail loudly on ANY
  // non-MLB structure (STRUCTURAL identity, not just a slot count — a 22-slot non-MLB shape must
  // not slip through to MLB floors + MLB legality).
  const isMlbStructure =
    structure === MLB_POOL_STRUCTURE ||
    (Object.keys(MLB_POOL_STRUCTURE) as (keyof PoolStructure)[]).every(
      (k) => structure[k] === MLB_POOL_STRUCTURE[k],
    );
  if (!isMlbStructure) {
    throw new Error(
      `extractDraftPool supports the MLB ${LEGAL_ROSTER.size}-man structure only for now; farm semantics ` +
        '(fair supply, ~50% archetype-fit targeting, no roster guarantees — JK ruling 2026-07-01) land with the farm-generation relocation ticket.',
    );
  }

  // Audit C1B-4 (determinism): canonicalize source order so extraction is a function of the player
  // SET, not the caller's array order (C1's greedy keeps input order on exact score ties).
  const canonicalSource = [...source].sort((a, b) => a.id.localeCompare(b.id));

  const oversupply = options.oversupply ?? EXTRACTOR_TUNING.oversupply;
  const targetSize = options.targetSize ?? defaultPoolTargetSize(teams, structure, oversupply);
  const posture = options.posture ?? 'optimal';
  const maxRounds = options.maxRepairRounds ?? EXTRACTOR_TUNING.maxRepairRounds;
  const maxSpread = options.maxResilienceSpread ?? EXTRACTOR_TUNING.maxResilienceSpread;
  const notes: string[] = [];

  const simArchetypes = new Map<string, SimArchetype>(
    selected.map((a) => [a.id, historicalToSimArchetype(a)]),
  );
  // Audit C1B-2 (single-math): the fill/eviction scorer is the builder's EXACT posture-weighted
  // fit function — one scoring rule for seeds, fill, and eviction.
  const fitScorers = new Map(
    selected.map((a) => [a.id, archetypeFitScorer(simArchetypes.get(a.id)!, tier, posture)]),
  );
  const sourceBudget = computePoolTierCap(canonicalSource.map((p) => p.iv), tier);

  // 1. Structural floors + 2. identity seeds (each archetype's best build on the full source).
  const pool = new Map<string, SimPlayer>();
  structuralFloor(canonicalSource, teams, structure, oversupply, notes).forEach((p) => pool.set(p.id, p));
  /** Ids any archetype's seed build claimed — protected from cap eviction. */
  const claimed = new Set<string>();
  for (const arch of selected) {
    const build = buildIdentityRoster(canonicalSource, simArchetypes.get(arch.id)!, tier, sourceBudget, { posture });
    for (const p of build.players) {
      pool.set(p.id, p);
      claimed.add(p.id);
    }
  }

  // 3. Round-robin balanced fill to target: each archetype in turn takes its best-fit remaining
  // source player (no identity gets a stacked deck by fill order; deterministic).
  const remaining = canonicalSource
    .filter((p) => !pool.has(p.id))
    .sort(byIvDescIdAsc);
  let cursor = 0;
  while (pool.size < targetSize && remaining.length > 0) {
    const arch = selected[cursor % selected.length];
    cursor += 1;
    const scorer = fitScorers.get(arch.id)!;
    let bestIdx = -1;
    let bestScore = Number.NEGATIVE_INFINITY;
    for (let i = 0; i < remaining.length; i += 1) {
      const s = scorer(remaining[i]);
      if (s > bestScore + 1e-9) {
        bestScore = s;
        bestIdx = i;
      }
    }
    if (bestIdx < 0) break;
    const [chosen] = remaining.splice(bestIdx, 1);
    pool.set(chosen.id, chosen);
  }

  // Cap enforcement (idempotent): evict unclaimed, lowest-max-fit filler down to the target —
  // never a player an identity build claimed or a structural-floor pick. Runs after the initial
  // assembly AND after every repair addition (seeds alone can exceed the target on small sources).
  const floorIds = new Set(structuralFloor(canonicalSource, teams, structure, oversupply, []).map((p) => p.id));
  const enforceCap = () => {
    if (pool.size <= targetSize) return;
    const evictable = [...pool.values()]
      .filter((p) => !claimed.has(p.id) && !floorIds.has(p.id))
      .map((p) => ({
        p,
        maxFit: Math.max(...selected.map((a) => fitScorers.get(a.id)!(p))),
      }))
      .sort((a, b) => a.maxFit - b.maxFit || a.p.id.localeCompare(b.p.id));
    for (const { p } of evictable) {
      if (pool.size <= targetSize) break;
      pool.delete(p.id);
    }
  };
  enforceCap();

  // 4. Verify → repair.
  let verdicts: ArchetypeDraftability[] = [];
  let round = 0;
  const rankNow = () =>
    rankArchetypeDraftability([...pool.values()], selected, tier, {
      posture,
      // Identity is judged against the fixed SOURCE universe, not the moving candidate pool —
      // otherwise every feasibility body the floors add raises the bar mechanically (C1B fix round).
      embodimentReference: canonicalSource,
      ...(options.minEmbodimentZ !== undefined ? { minEmbodimentZ: options.minEmbodimentZ } : {}),
    });
  const isBalanced = (rows: ArchetypeDraftability[]) => {
    if (rows.some((r) => r.band === 'LOCKED')) return false;
    const bands = rows.map((r) => BAND_ORDER[r.band]);
    const res = rows.map((r) => r.resilience);
    return Math.max(...bands) - Math.min(...bands) <= 1 && Math.max(...res) - Math.min(...res) <= maxSpread;
  };

  verdicts = rankNow();
  while (!isBalanced(verdicts) && round < maxRounds) {
    round += 1;
    const worst = verdicts[verdicts.length - 1];
    const worstArch = simArchetypes.get(worst.archetypeId)!;
    const rebuild = buildIdentityRoster(canonicalSource, worstArch, tier, sourceBudget, { posture });
    const missing = rebuild.players
      .filter((p) => !pool.has(p.id))
      .sort(byIvDescIdAsc)
      .slice(0, EXTRACTOR_TUNING.repairBatch);
    if (missing.length === 0) {
      notes.push(`${worst.name}: the source has nothing further to offer (its full identity build is already pooled)`);
      break;
    }
    missing.forEach((p) => {
      pool.set(p.id, p);
      claimed.add(p.id);
    });
    enforceCap();
    verdicts = rankNow();
  }

  if (pool.size > targetSize) {
    notes.push(
      `pool exceeds the ${targetSize} target by ${pool.size - targetSize} (every remaining player is claimed by an identity build or a structural floor)`,
    );
  }

  for (const v of verdicts) {
    if (v.band !== 'GREEN' && v.reasons.length > 0) {
      notes.push(`${v.name}: ${v.band} — ${v.reasons.join('; ')}`);
    }
  }

  return {
    players: [...pool.values()].sort((a, b) => a.id.localeCompare(b.id)),
    size: pool.size,
    targetSize,
    verdicts,
    balanced: isBalanced(verdicts),
    repairRounds: round,
    notes,
  };
}
