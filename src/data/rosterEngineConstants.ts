/**
 * IV-layer registry constants shared by roster intelligence engines.
 *
 * Source: IV_ENGINE_AND_ROSTER_INTELLIGENCE_SPEC.md §12 v1.1.8.
 * Keep this file limited to IV-layer constants; T6 can extend the registry for
 * roster construction/interaction constants.
 */

export type PitcherRoleKey = 'SP' | 'SP/RP' | 'RP' | 'CP';
export type UsageAttr = 'POW' | 'CON' | 'SPD' | 'FLD';
export type PotencyTier = 'L1' | 'L2' | 'L3';

export interface UsageInput {
  startShare: number;
  paRatio: number;
  phFloor: number;
  prFloor: number;
  rangeFloor: number;
}

/** §12 usageInputs, CALIBRATE: derives pitcher batting POW/CON/SPD exposure. */
export const USAGE_INPUTS: Record<PitcherRoleKey, UsageInput> = {
  SP: { startShare: 0.25, paRatio: 0.625, phFloor: 0.04, prFloor: 0.02, rangeFloor: 0.10 },
  'SP/RP': { startShare: 0.18, paRatio: 0.625, phFloor: 0.0375, prFloor: 0.02, rangeFloor: 0.08 },
  RP: { startShare: 0, paRatio: 0.625, phFloor: 0.08, prFloor: 0.02, rangeFloor: 0.06 },
  CP: { startShare: 0, paRatio: 0.625, phFloor: 0.05, prFloor: 0.01, rangeFloor: 0.05 },
};

/** §12/D15, CALIBRATE: Two Way trait defensive ARM ladder by potency tier. */
export const TWO_WAY_ARM_BY_TIER: Record<PotencyTier, number> = { L1: 60, L2: 80, L3: 99 };

/** §12/D15 JK ruling: Two Way holders unlock 1.00 usage on all hitter attributes. */
export const TWO_WAY_USAGE = 1.00;

/**
 * §12 JK ruling 2026-06-10: IV potency scales trait deltas around L2 neutrality.
 * Strong tier corrected 2.0→3.0 (JK 2026-06-22): the canonical valuation source
 * (XBL Test Texas Rangers workbook `ImportedTraits`) ramps positives 0.5/1.0/3.0
 * and negatives 3.0/1.0/0.5 — verified cell-for-cell (Cannon Arm 23/45/135, Tough
 * Out 5/10/30, Whiffer 8/15/45). The prior 2.0 matched the BillyYank guide's loose
 * "x1/x2/x4" wording, not the workbook the IV logic was built from. DORMANT today
 * (all ivEngine/effectiveRatings callers run at L2; oracle pins only L2 → no re-bless).
 * See spec-docs/CHEMISTRY_TRAIT_POTENCY_VALUATION_SPEC.md §2.5/§9.7.
 */
export const POTENCY_SCALE: {
  positives: Record<PotencyTier, number>;
  standardInverted: Record<PotencyTier, number>;
} = {
  positives: { L1: 0.5, L2: 1.0, L3: 3.0 },
  standardInverted: { L1: 3.0, L2: 1.0, L3: 0.5 },
};

/**
 * §3.9 simulation export only. Pitcher ARM is unpriced by IV design, so ivEngine
 * must never consume this value.
 */
export const PITCHER_ASSUMED_ARM = 99;

// §3.2 / §12 scout-obscured value range; display-only, NOT an IV input
export const SCOUT_NOISE_BASE = 0.6;

export const PITCHER_ROLES: readonly PitcherRoleKey[] = ['SP', 'SP/RP', 'RP', 'CP'] as const;
export const PITCH_ATTRS = ['VEL', 'JNK', 'ACC'] as const;
export const BAT_USAGE_ATTRS = ['POW', 'CON', 'SPD', 'FLD'] as const;
export const PITCHER_NEUTRAL_HITTER_BLOCK = 'IF/OF' as const;

/** §3.9/D15: Two Way trait names route pitcher batting to the trait-position curve block. */
export const TWO_WAY_TRAIT_POSITION = {
  'Two Way (C)': 'C',
  'Two Way (IF)': 'IF',
  'Two Way (OF)': 'OF',
} as const;

export function deriveUsageWeights(role: PitcherRoleKey): Record<UsageAttr, number> {
  const input = USAGE_INPUTS[role];
  const bat = input.startShare * input.paRatio + input.phFloor;
  return {
    POW: bat,
    CON: bat,
    SPD: Math.min(1, bat + input.prFloor + input.rangeFloor),
    FLD: 1,
  };
}

/**
 * Luxury tax measures how often a pitcher's secondary rating can affect games.
 * Salary/IV intentionally keeps full pitcher FLD value; tax instead uses defensive
 * start exposure so a once-per-four-games starter is not treated as an everyday fielder.
 */
export function deriveLuxuryTaxUsageWeights(role: PitcherRoleKey): Record<UsageAttr, number> {
  const usage = deriveUsageWeights(role);
  const input = USAGE_INPUTS[role];
  return {
    ...usage,
    FLD: Math.max(input.startShare, input.rangeFloor),
  };
}

// §4.2 Effective Ratings mojo states, ordered from worst to best.
export const MOJO_STATES = ['Rattled', 'Tense', 'Normal', 'Locked In', 'On Fire', 'Jacked'] as const;

export type EffectiveMojoState = typeof MOJO_STATES[number];

/** §4.2/§12 Effective Ratings, CALIBRATE: additive rating delta applied to all attributes. */
export const MOJO_DELTAS: Record<EffectiveMojoState, number> = {
  Rattled: -10,
  Tense: -5,
  Normal: 0,
  'Locked In': 5,
  'On Fire': 10,
  Jacked: 15,
};

/** §4.2/§12 Effective Ratings, CALIBRATE: pressure amplifies current-mojo rating effects. */
export const PRESSURE_MULTIPLIER: Record<'high' | 'extreme', number> = {
  high: 1.5,
  extreme: 2.0,
};

/** §4.2/§10 T9b, CALIBRATE: leverage-index bands mapped into effectiveRatings pressure. */
export const PRESSURE_LEVERAGE_BANDS = {
  high: 1.5,
  extreme: 3.0,
} as const;

/** §4.2 JK 2026-06-10 canonical role-misuse penalties, encoded as mojo levels. */
export const ROLE_MISUSE_MOJO_PENALTY = {
  spRelieving: 1,
  rpStarting: 1,
  cpStarting: 2,
  cpEnteringBeforeSecondToLastInning: 1,
  spRpAnyRole: 0,
} as const;

/** §4.2/§4.5 JK 2026-06-10 canonical out-of-position cost, encoded as mojo levels. */
export const OUT_OF_POSITION_MOJO_PENALTY = 1;

/** §4.4 Effective Ratings, CALIBRATE: local fatigue/decay model inputs. */
export const FATIGUE_MODEL = {
  rolePitchThresholds: {
    SP: 70,
    'SP/RP': 45,
    RP: 25,
    CP: 20,
  },
  recoveryGames: {
    SP: 3,
    'SP/RP': 2,
    RP: 1,
    CP: 1,
  },
  fitnessRatingPenalty: {
    JUICED: -5,
    FIT: 0,
    WELL: 3,
    STRAINED: 8,
    WEAK: 15,
    HURT: 25,
  },
  overThresholdPenaltyPerPitch: 0.4,
  catcherRestEveryGames: 4,
  catcherOverplayPenalty: 5,
  durableFactor: 0.75,
  injuryProneFactor: 1.25,
  mojoDecayMultiplier: {
    Rattled: 1.15,
    Tense: 1.05,
    Normal: 1.0,
    'Locked In': 0.9,
    'On Fire': 0.8,
    Jacked: 0.7,
  },
} as const;

/** §4.5 DefensivePlacementRisk, CALIBRATE: per-position defensive traffic. */
export const POSITION_CHANCE_FREQUENCY = {
  C: 0.75,
  '1B': 0.3,
  '2B': 0.65,
  SS: 0.8,
  '3B': 0.6,
  LF: 0.35,
  CF: 0.7,
  RF: 0.45,
  DH: 0,
  SP: 0.15,
  RP: 0.08,
  CP: 0.08,
} as const;

/** §4.5 DefensivePlacementRisk, CALIBRATE: fielding-eligibility penalty multipliers. */
export const DEFENSIVE_POSITION_PENALTY_MULTIPLIER = {
  primary: 1.0,
  secondary: 1.2,
  other: 1.85,
} as const;

/** §4.5 DefensivePlacementRisk, CALIBRATE: low-FLD/ARM error and high-FLD/SPD spectacular scaling. */
export const DEFENSIVE_PLACEMENT_SCALING = {
  errorBase: 0.02,
  errorFieldingWeight: 0.006,
  errorArmWeight: 0.002,
  spectacularBase: 0.01,
  spectacularFieldingWeight: 0.0035,
  spectacularSpeedWeight: 0.0025,
  minLikelihood: 0,
  maxLikelihood: 0.95,
} as const;

/** §4.5 DefensivePlacementRisk, CALIBRATE: expected mojo drift step values. */
export const DEFENSIVE_MOJO_DRIFT_STEPS = {
  up: 1,
  down: 1,
} as const;

/**
 * §8.1/§15.2, CALIBRATE draft: lineup slot opportunity weights bias IV toward
 * high-PA/high-leverage lineup jobs without claiming T10 Lineup Delta WPA.
 */
export const BATTING_ORDER_SLOT_WEIGHTS: Record<1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9, number> = {
  1: 1.06,
  2: 1.04,
  3: 1.08,
  4: 1.10,
  5: 1.02,
  6: 0.98,
  7: 0.94,
  8: 0.91,
  9: 0.88,
};

/**
 * §8.3, CALIBRATE draft: farm recommendation threshold in TV2 salary/value units.
 * This is intentionally playtest-tunable; T7b only makes the advisory live.
 */
export const ROSTER_MOVE_CALLOUT_THRESHOLD = 500;

/**
 * §12:615 subRecThreshold, CALIBRATE/playtest placeholder in kblIV-dollar units.
 * T9a uses per-type gates because pinch-hit, defensive, and pitcher-change deltas
 * sit on different practical ranges.
 */
export const SUB_REC_THRESHOLD = {
  pinch_hit: 5_000,
  defensive_replacement: 7_500,
  pitcher_change: 12_000,
} as const;

/** §8.4, CALIBRATE: dead-money cap charge after a season ledger demotion. */
export const DEAD_MONEY_RATE = 0.75;

/**
 * §8.3/R-T7b-LEAK, CALIBRATE draft: scout-visible projected value by scouted grade.
 * The curve is monotonic and aligned to the existing prospect salary unit family,
 * but remains a playtest placeholder pending JK approval.
 */
export const FARM_SCOUTED_GRADE_PROJECTED_VALUE: Record<string, number> = {
  S: 14_500,
  'A+': 13_000,
  A: 11_500,
  'A-': 10_000,
  'B+': 8_500,
  B: 7_000,
  'B-': 5_800,
  'C+': 4_600,
  C: 3_500,
  'C-': 2_700,
  'D+': 2_100,
  D: 1_600,
  'D-': 1_200,
};

/**
 * §8.1/§15.2, CALIBRATE draft: local lineup optimizer scales for comparing
 * IV dollars, defensive placement risk, and legacy snapshot comparison fields.
 */
export const CALIBRATE = {
  lineupDefensiveRiskIvPenalty: 300_000,
  lineupSnapshotIvDisplayDivisor: 10_000,
  lineupSnapshotWpaDivisor: 10_000_000,
} as const;

/** §12/§7.3 tradeToleranceBand: pick-trade imbalance above 15% is advisory-flagged. */
export const TRADE_TOLERANCE_BAND = 0.15;

/** §12/§7.3:492 RED when slack is at or below this fraction of remaining budget. */
export const SOLVENCY_RED_MARGIN = 0.10;

/** §7.3:492 RED "severe tax" warning threshold; Captain default, JK-tunable. */
export const SOLVENCY_SEVERE_TAX_FRAC = 0.20;

/** §12/§5.4 balanceMode default for Mode 1 league construction. */
export const BALANCE_MODE_DEFAULT = 'taxed' as const;

/** Shared ratings/traits/L-SIM checkpoint cadence. Standard preserves the original 20% grid. */
export const CHECKPOINT_CADENCE_DEFAULT = 'standard' as const;

export const CHECKPOINT_CADENCE_COUNTS = {
  standard: 5,
  frequent: 10,
} as const;

export type CheckpointCadence = keyof typeof CHECKPOINT_CADENCE_COUNTS;

export function normalizeCheckpointCadence(value: unknown): CheckpointCadence {
  return value === 'frequent' ? 'frequent' : CHECKPOINT_CADENCE_DEFAULT;
}

export function checkpointCountForCadence(cadence: CheckpointCadence | null | undefined): number {
  return CHECKPOINT_CADENCE_COUNTS[normalizeCheckpointCadence(cadence)];
}

/** §12/§7.2 poolSurplusMax: warn when registered pool exceeds roster slots by more than 20%. */
export const POOL_SURPLUS_MAX = 1.2;

/** §12/§5.3 T3 acceptance criterion: flag identity EV drift above 10%. */
export const EV_FLATNESS_TOLERANCE = 0.10;

/**
 * Shared league-minimum salary in canonical kblIV dollars.
 * Source: existing T5 salary bridge floor, moved here so auction minSalaryByPosition
 * and salaryCalculator share one numeric source.
 */
export const LEAGUE_MINIMUM_SALARY = 1666.49;

/**
 * IV_ENGINE §7.5 / D14: auction opening asks use a reserve multiplier that
 * scales from 0.5 at the pool bottom to 0.7 by the top decile.
 */
export const RESERVE_PRICE_CURVE_MIN = 0.5;
export const RESERVE_PRICE_CURVE_MAX = 0.7;
export const RESERVE_PRICE_CURVE_MAX_PERCENTILE = 90;

export function reservePriceCurve(ivPercentile: number): number {
  const percentile = Number.isFinite(ivPercentile)
    ? Math.min(Math.max(ivPercentile, 0), RESERVE_PRICE_CURVE_MAX_PERCENTILE)
    : 0;
  const progress = percentile / RESERVE_PRICE_CURVE_MAX_PERCENTILE;
  return RESERVE_PRICE_CURVE_MIN + (RESERVE_PRICE_CURVE_MAX - RESERVE_PRICE_CURVE_MIN) * progress;
}

export const AUCTION_MIN_SALARY_POSITIONS = [
  'C',
  '1B',
  '2B',
  '3B',
  'SS',
  'LF',
  'CF',
  'RF',
  'DH',
  'SP',
  'SP/RP',
  'RP',
  'CP',
] as const;

export type AuctionMinSalaryPosition = typeof AUCTION_MIN_SALARY_POSITIONS[number];

/** IV_ENGINE §7.5 minSalaryByPosition, sourced from the existing league minimum salary floor. */
export const MIN_SALARY_BY_POSITION: Record<AuctionMinSalaryPosition, number> =
  Object.fromEntries(AUCTION_MIN_SALARY_POSITIONS.map((position) => [position, LEAGUE_MINIMUM_SALARY])) as Record<
    AuctionMinSalaryPosition,
    number
  >;

/**
 * AUCTION_DRAFT_SPEC.md §2.3 / IV_ENGINE §7.5 solvency cap.
 * Compute projectedTax at the call site with leagueConstruction.luxuryTax, then
 * pass it here to keep the per-bid ceiling pure.
 */
export function auctionMaxBid(
  remainingBudget: number,
  slotsRemaining: number,
  minSalary: number,
  projectedTax: number,
): number {
  return Math.max(0, remainingBudget - Math.max(0, slotsRemaining - 1) * minSalary - projectedTax);
}
