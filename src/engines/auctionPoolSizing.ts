/**
 * FABLE-C3: draft-pool SIZING as a market-clearing model, not a body count (contract's
 * make-or-break: "will THIS team WIN enough of them," audit POOL-02/04; spec §5-6 pool sizing).
 *
 * Three layers, all deterministic and closed-form:
 * 1. `poolDemandModel` — how many players a pool must carry for T completing teams under S
 *    pure-pressure shills (the C3 end-checkpoint: shills WIN players but never hold roster
 *    slots, so their demand is a modeled win count, not 22 phantom seats).
 * 2. `archetypeCompletionOutlook` — P(a team completes a LEGAL roster) and P(it completes AT
 *    its archetype's identity) from supply/demand margins per requirement class, with rival +
 *    shill contention pressure. Consumes `analyzePoolFeasibility`'s per-archetype report
 *    (single-math with the orphaned composition engine this ticket surfaces, audit POOL-01)
 *    and prices shill pressure with the same uniform-over-24 stance as C2B's market model.
 * 3. `recommendedShillCount` — the sim-backed default (the `scaledShillDefault` placeholder's
 *    replacement), validated by `scripts/poolSizingSweep.test.ts` on the C2A harness.
 *
 * The probabilities are ADVISORY (Draft Setup guidance); the hard in-auction guarantees live in
 * C2B's completion floor + strand guard + forced filler. Numbers here are §16-tunable and are
 * calibrated/validated by the opt-in sweep, whose results are recorded in
 * `FABLE_C3_DESIGN_2026-07-02.md`.
 */

import {
  LEGAL_ROSTER,
  canCover,
  isCloser,
  type RosterSlotPlayer,
} from '../data/rosterConstruction';
import {
  MLB_POOL_STRUCTURE,
  type PoolStructure,
} from './draftPoolExtractor';
import type { SimPlayer } from './archetypeBalanceSimulator';
import type { ArchetypeFeasibility, PoolFeasibilityReport } from './poolFeasibility';

/** §16 sim-tune: every sizing/probability knob in one place (sweep-calibrated). */
export const SIZING_TUNING = {
  /**
   * Pool size over bare demand for archetypes to stay ROOMY, not merely feasible (C1B evidence:
   * 1.2× is feasibility-dominated + every identity tax-dependent; 1.5× buys identity room).
   */
  identityHeadroom: 1.5,
  /** Per-class hard-floor multiplier (JK's ratified 1.2× floor from the extractor ruling). */
  feasibilityHeadroom: 1.2,
  /**
   * The shill WIN CAP and the sizing budget per shill, one number (sweep-measured: UNCAPPED
   * end-checkpoint shills hoard ~21 wins — a whole roster — so the cap is what keeps a shill
   * price-pressure instead of a competing franchise, and the pool only needs to carry cap×S
   * extra bodies). Wired into live shill profiles as `shillMaxWins`.
   */
  winsPerShill: 10,
  /** Logistic width on a structural class's supply/demand margin → completion probability. */
  completionSlope: 0.10,
  /** Logistic width on an identity stat's supply/demand margin. */
  fitSlope: 0.18,
  /**
   * Cross-class correlation discount on the combined probability (exponent on the product):
   * class contentions OVERLAP — one rival's budget cannot starve every class simultaneously —
   * so full independence (exponent 1) double-counts risk. 0 = fully correlated (min-like).
   */
  classCorrelationDiscount: 0.6,
  /** How much of a rival team's appetite overlaps a given archetype's strong-stat targets. */
  rivalStatOverlap: 0.30,
  /**
   * Sim-validated default shill count per league size (the `scaledShillDefault` placeholder's
   * grounded replacement; JK's 4-human vs 8-human question). Values confirmed/adjusted by the
   * sweep before handoff.
   */
  shillRecommendationByLeagueSize: { 2: 1, 4: 2, 6: 2, 8: 2, 10: 3, 12: 3 } as Record<number, number>,
} as const;

export type SizingTuning = typeof SIZING_TUNING;

// ---------------------------------------------------------------------------------------------
// Layer 1 — the demand model (how big must the pool be).
// ---------------------------------------------------------------------------------------------

export interface ClassFloor {
  key: string;
  label: string;
  /** Completing-team demand for the class, headroom applied. */
  demand: number;
}

export interface PoolDemandModel {
  teams: number;
  shills: number;
  /** Real roster seats: teams × 22. */
  baseSlots: number;
  /** Players the shills are expected to WIN (never roster seats — the end-checkpoint). */
  expectedShillWins: number;
  /** Per-class hard floors (feasibility headroom applied, real-team demand only). */
  classFloors: readonly ClassFloor[];
  /** Σ bodies implied by the binding side of the class floors. */
  feasibilityFloor: number;
  /** The recommended pool size: max(identity-roomy, feasibility floor) + shill wins. */
  targetSize: number;
}

export function poolDemandModel(
  teams: number,
  shills: number,
  structure: PoolStructure = MLB_POOL_STRUCTURE,
  tuning: SizingTuning = SIZING_TUNING,
): PoolDemandModel {
  const t = Math.max(0, Math.floor(teams));
  const s = Math.max(0, Math.floor(shills));
  const floor = (n: number) => Math.ceil(n * tuning.feasibilityHeadroom);

  const classFloors: ClassFloor[] = [
    ...LEGAL_ROSTER.fieldPositions.map((pos) => ({
      key: `primary-${pos}`,
      label: pos === 'C' ? 'primary catchers (coverage ×2)' : `primary ${pos}`,
      demand: floor(t * structure.primariesPerPosition * (pos === 'C' ? structure.catcherCoverage : 1)),
    })),
    { key: 'startable-arms', label: 'startable arms (SP / SP-RP)', demand: floor(t * structure.startableArms) },
    { key: 'relievable-arms', label: 'relievable arms (RP / CP / SP-RP)', demand: floor(t * structure.relievableArms) },
    { key: 'closer-arms', label: 'true closers (CP)', demand: floor(t * structure.closerArms) },
    { key: 'pitcher-bodies', label: 'total pitchers', demand: floor(t * structure.minPitchers) },
    { key: 'hitter-bodies', label: 'total position players', demand: floor(t * structure.minPositionPlayers) },
  ];

  // The body floor is pitchers + hitters (the class floors overlap inside those two sides).
  const pitcherFloor = classFloors.find((c) => c.key === 'pitcher-bodies')!.demand;
  const hitterFloor = classFloors.find((c) => c.key === 'hitter-bodies')!.demand;
  const feasibilityFloor = pitcherFloor + hitterFloor;

  const baseSlots = t * structure.slotsPerTeam;
  const expectedShillWins = s * tuning.winsPerShill;
  const targetSize =
    Math.max(Math.ceil(baseSlots * tuning.identityHeadroom), feasibilityFloor) + expectedShillWins;

  return { teams: t, shills: s, baseSlots, expectedShillWins, classFloors, feasibilityFloor, targetSize };
}

export interface PoolSizingRow {
  teams: number;
  shills: number;
  feasibilityFloor: number;
  expectedShillWins: number;
  targetSize: number;
}

/** The sizing TABLE (contract deliverable b): common configs, one row per (teams, shills). */
export function poolSizingTable(
  teamCounts: readonly number[],
  shillCounts: readonly number[],
  structure: PoolStructure = MLB_POOL_STRUCTURE,
  tuning: SizingTuning = SIZING_TUNING,
): PoolSizingRow[] {
  const rows: PoolSizingRow[] = [];
  for (const teams of teamCounts) {
    for (const shills of shillCounts) {
      const model = poolDemandModel(teams, shills, structure, tuning);
      rows.push({
        teams: model.teams,
        shills: model.shills,
        feasibilityFloor: model.feasibilityFloor,
        expectedShillWins: model.expectedShillWins,
        targetSize: model.targetSize,
      });
    }
  }
  return rows;
}

// ---------------------------------------------------------------------------------------------
// Layer 2 — completion probability per archetype (the market-clearing read).
// ---------------------------------------------------------------------------------------------

export interface ArchetypeCompletionOutlook {
  archetypeId: string;
  archetypeName: string;
  /** P(this team assembles a LEGAL 22 at all) from the structural supply/demand margins. */
  pLegalCompletion: number;
  /** P(it completes AT the archetype) — legal × the identity-stat margins. */
  pIdentityCompletion: number;
  /** The tightest structural class (the market's binding constraint), null when roomy. */
  bindingClass: string | null;
  /** Plain-language guidance assembled from the binding constraint. */
  note: string | null;
}

function shapeOf(player: SimPlayer): RosterSlotPlayer {
  return {
    isPitcher: player.isPitcher,
    position: player.position,
    role: player.role,
    secondaryPosition: player.secondaryPosition ?? null,
    twoWayVariant: player.twoWayVariant ?? null,
  };
}

function logistic01(margin: number, slope: number): number {
  const z = (margin - 1) / Math.max(1e-9, slope);
  const p = 1 / (1 + Math.exp(-z));
  return Math.min(1, Math.max(0, p));
}

interface StructuralClassRead {
  key: string;
  label: string;
  supply: number;
  demand: number;
  margin: number;
  p: number;
}

/**
 * Structural supply/demand per requirement class for T completing teams + S shills' expected
 * wins (spread over classes by demand share — the C2B stance: shill appetite is a DISTRIBUTION,
 * uniform over the 24, so in expectation it lands proportionally to what the market needs).
 */
function structuralReads(
  pool: readonly SimPlayer[],
  teams: number,
  shills: number,
  tuning: SizingTuning,
): StructuralClassRead[] {
  const shapes = pool.map(shapeOf);
  const hitters = shapes.filter((p) => !p.isPitcher);
  const pitchers = shapes.filter((p) => p.isPitcher);

  const raw: Array<{ key: string; label: string; supply: number; demand: number }> = [
    ...LEGAL_ROSTER.fieldPositions.map((pos) => ({
      key: `primary-${pos}`,
      label: `primary ${pos}`,
      supply: hitters.filter((p) => p.position === pos).length,
      demand: teams,
    })),
    {
      key: 'catcher-coverage',
      label: 'catcher coverage (2 per team)',
      supply: shapes.filter((p) => canCover(p, 'C')).length,
      demand: teams * LEGAL_ROSTER.minCatchers,
    },
    {
      key: 'startable-arms',
      label: 'startable arms',
      supply: pitchers.filter((p) => p.role === 'SP' || p.role === 'SP/RP').length,
      demand: teams * LEGAL_ROSTER.startingPitchers,
    },
    {
      key: 'relievable-arms',
      label: 'relievable arms',
      supply: pitchers.filter((p) => p.role === 'RP' || p.role === 'CP' || p.role === 'SP/RP').length,
      demand: teams * LEGAL_ROSTER.minRelievers,
    },
    {
      key: 'closer-arms',
      label: 'true closers',
      supply: pitchers.filter(isCloser).length,
      demand: teams * LEGAL_ROSTER.minClosers,
    },
    {
      key: 'pitcher-bodies',
      label: 'total pitchers',
      supply: pitchers.length,
      demand: teams * LEGAL_ROSTER.minPitchers,
    },
    {
      key: 'hitter-bodies',
      label: 'total position players',
      supply: hitters.length,
      demand: teams * LEGAL_ROSTER.minPositionPlayers,
    },
  ];

  const totalDemand = raw.reduce((sum, c) => sum + c.demand, 0);
  const shillWins = shills * tuning.winsPerShill;

  return raw.map((c) => {
    const shillPressure = totalDemand > 0 ? shillWins * (c.demand / totalDemand) : 0;
    const pressured = c.demand + shillPressure;
    const margin = pressured > 0 ? c.supply / pressured : Number.POSITIVE_INFINITY;
    return { ...c, demand: pressured, margin, p: logistic01(margin, tuning.completionSlope) };
  });
}

/**
 * The per-archetype market-clearing outlook (contract deliverable c's probability layer).
 * `feasibility` comes from `analyzePoolFeasibility` — its per-stat supply/demand shortfalls are
 * reused as-is (single-math with the surfaced composition engine); rival contention on an
 * archetype's strong-stat targets is priced by the tunable overlap share.
 */
export function archetypeCompletionOutlook(
  pool: readonly SimPlayer[],
  feasibility: ArchetypeFeasibility,
  teams: number,
  shills: number,
  tuning: SizingTuning = SIZING_TUNING,
): ArchetypeCompletionOutlook {
  const structural = structuralReads(pool, teams, shills, tuning);
  const temper = (product: number) => Math.pow(product, tuning.classCorrelationDiscount);
  const pLegalCompletion = temper(structural.reduce((prod, c) => prod * c.p, 1));

  let fitProduct = 1;
  for (const shortfall of feasibility.shortfalls) {
    // One team's need of the archetype's strong-stat players, contested by overlapping rival
    // appetite and the shills' expected share of exactly these players.
    const rivalPressure = shortfall.demand * tuning.rivalStatOverlap * Math.max(0, teams - 1) / Math.max(1, teams);
    const shillPressure = shills * tuning.winsPerShill / Math.max(1, teams);
    const pressured = shortfall.demand + rivalPressure + shillPressure;
    const margin = pressured > 0 ? shortfall.supply / pressured : Number.POSITIVE_INFINITY;
    fitProduct *= logistic01(margin, tuning.fitSlope);
  }
  const pIdentityCompletion = pLegalCompletion * temper(fitProduct);

  const binding = [...structural].sort((l, r) => l.margin - r.margin)[0] ?? null;
  const bindingClass = binding !== null && binding.p < 0.97 ? binding.label : null;
  const note =
    feasibility.activationPrompt ??
    (bindingClass !== null
      ? `The market is tightest at ${bindingClass} — expect contested prices there.`
      : null);

  return {
    archetypeId: feasibility.archetypeId,
    archetypeName: feasibility.archetypeName,
    pLegalCompletion,
    pIdentityCompletion,
    bindingClass,
    note,
  };
}

/** Every archetype's outlook for one pool (drives the Draft Setup panel + the sweep report). */
export function poolCompletionOutlook(
  pool: readonly SimPlayer[],
  report: PoolFeasibilityReport,
  teams: number,
  shills: number,
  tuning: SizingTuning = SIZING_TUNING,
): ArchetypeCompletionOutlook[] {
  return report.results.map((feasibility) =>
    archetypeCompletionOutlook(pool, feasibility, teams, shills, tuning),
  );
}

// ---------------------------------------------------------------------------------------------
// Layer 3 — the shill-count recommendation (contract deliverable a).
// ---------------------------------------------------------------------------------------------

export interface ShillRecommendation {
  count: number;
  rationale: string;
}

/**
 * The sim-backed default shill count (audit POOL-04; JK's 4-human vs 8-human question). Keyed by
 * LEAGUE size — shills exist to keep prices honest when few humans compete, and the sweep showed
 * pressure saturates fast (each shill is a full-budget bidder under the end-checkpoint).
 * `humanTeams` tempers the table: a fully-human league needs less artificial pressure.
 */
export function recommendedShillCount(
  humanTeams: number,
  leagueTeams: number,
  tuning: SizingTuning = SIZING_TUNING,
): ShillRecommendation {
  const sizes = Object.keys(tuning.shillRecommendationByLeagueSize)
    .map(Number)
    .sort((l, r) => l - r);
  const nearest = sizes.reduce(
    (best, size) => (Math.abs(size - leagueTeams) < Math.abs(best - leagueTeams) ? size : best),
    sizes[0] ?? 8,
  );
  const base = tuning.shillRecommendationByLeagueSize[nearest] ?? 2;
  const humanShare = leagueTeams > 0 ? Math.min(1, Math.max(0, humanTeams / leagueTeams)) : 1;
  // Full-human leagues halve the pressure need (competition is already organic).
  const count = Math.max(0, Math.round(base * (1 - 0.5 * humanShare)));
  return {
    count,
    rationale:
      `${count} shill${count === 1 ? '' : 's'} for a ${leagueTeams}-team league with ` +
      `${humanTeams} human${humanTeams === 1 ? '' : 's'}: enough hidden pressure to keep prices ` +
      `honest without crowding the pool (each shill is expected to win ~${tuning.winsPerShill} players).`,
  };
}
