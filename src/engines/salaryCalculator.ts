/**
 * Salary Calculator - Player Value and Salary System
 *
 * Calculates player salaries based on:
 * - kblIV base from IV spec §3.8/§3.9
 * - Position multiplier knobs defaulted to 1.0
 * - L2-reference trait value already embedded in kblIV (D15)
 * - Age/experience factor
 * - Performance modifier (WAR vs expectations)
 * - Fame modifier (narrative value)
 * - Personality modifier (free agency behavior)
 * - DH context (adjusts pitcher batting bonus based on league rules)
 *
 * Per SALARY_SYSTEM_SPEC.md v3:
 * - No salary cap (because baseball!)
 * - Dynamic salary that updates throughout the season
 * - Salary-based trade matching instead of grade-based
 * - True Value = position-relative percentile comparison
 *
 * Deprecated legacy rating/bonus helpers remain below for bridge and matrix tests,
 * but the live T5 pipeline does not call them.
 *
 * @see SALARY_SYSTEM_SPEC.md
 */

import {
  type DHContext,
  calculatePitcherBattingMultiplier,
  PITCHER_ROTATION_FACTOR,
} from '../utils/leagueConfig';
import {
  MLB_BASELINE_INNINGS,
  getSeasonScalingFactor,
} from '../utils/franchiseAdaptiveStandards';
import {
  computeIV,
  type IVLayerBreakdown,
  type IVPlayerInput,
} from './ivEngine';
import { getPercentile, getValueAtPercentile } from './percentile';

// Re-export DHContext for consumers
export type { DHContext } from '../utils/leagueConfig';
export { PITCHER_ROTATION_FACTOR } from '../utils/leagueConfig';

// ============================================
// TYPES
// ============================================

export type Personality =
  | 'Egotistical'
  | 'Competitive'
  | 'Tough'
  | 'Relaxed'
  | 'Jolly'
  | 'Timid'
  | 'Droopy';

export type PlayerPosition =
  | 'C' | 'SS' | 'CF' | '2B' | '3B' | 'RF' | 'LF' | '1B' | 'DH'
  | 'SP' | 'RP' | 'CP' | 'SP/RP'
  | 'UTIL' | 'BENCH' | 'TWO-WAY';

export interface BatterRatings {
  power: number;      // Combined power (or use powerL/R average)
  contact: number;    // Combined contact (or use contactL/R average)
  speed: number;
  fielding: number;
  arm: number;
  // Optional L/R splits for compatibility
  powerL?: number;
  powerR?: number;
  contactL?: number;
  contactR?: number;
}

export interface PitcherRatings {
  velocity: number;
  junk: number;
  accuracy: number;
  stamina?: number;
}

export type PlayerRatings = BatterRatings | PitcherRatings;

export interface PlayerForSalary {
  id: string;
  name: string;
  isPitcher: boolean;
  isTwoWay?: boolean;
  primaryPosition?: PlayerPosition;
  secondaryPosition?: PlayerPosition | string | null;
  pitcherRole?: 'SP' | 'RP' | 'CP' | 'SP/RP';
  ratings: PlayerRatings;
  battingRatings?: BatterRatings;  // For pitchers who can hit
  age: number;
  bats?: 'L' | 'R' | 'S' | string;
  personality?: Personality;
  fame: number;
  traits?: string[];
  arsenal?: string[];
  armSlot?: 'High' | 'Mid' | 'Low' | 'Sub' | null;
}

export interface SalaryCalculationOptions {
  rookieScaleActive?: boolean;
}

export interface SeasonStatsForSalary {
  war: {
    total: number;
    batting?: number;
    pitching?: number;
    fielding?: number;
    baserunning?: number;
  };
  games: number;
}

export interface ExpectedPerformance {
  total: number;
  batting?: number;
  pitching?: number;
  fielding?: number;
  baserunning?: number;
}

export interface SalaryBreakdown {
  ivBase?: number;
  ivBreakdown?: IVLayerBreakdown;
  baseSalary: number;
  positionMultiplier: number;
  traitModifier: number;
  ageFactor: number;
  performanceModifier: number;
  fameModifier: number;
  personalityModifier: number;
  finalSalary: number;
  components: {
    fromRatings: number;
    afterPosition: number;
    afterTraits: number;
    afterAge: number;
    afterPerformance: number;
    afterFame: number;
    afterPersonality: number;
  };
}

export interface SalaryHistory {
  game: number;
  date: string;
  salary: number;
  change: number;
  trigger: SalaryTrigger;
}

export type SalaryTrigger =
  | 'GAME_UPDATE'
  | 'FAME_EVENT'
  | 'TRAIT_CHANGE'
  | 'RANDOM_EVENT'
  | 'ALL_STAR_SELECTION'
  | 'AWARD'
  | 'SEASON_START'
  | 'FREE_AGENCY';

export interface TrueValueResult {
  trueValue: number;
  contractValue: number;
  valueDelta: number;
  warPercentile: number;
  position: string;
  peerPoolSize: number;
  // Legacy ROI fields for backward compatibility
  salary: number;
  war: number;
  roiWARPer100k: number;
  roiWARPerMillion: number;
  roiTier: ROITier;
  valueRating: number;
}

export type ROITier = 'ELITE_VALUE' | 'GREAT_VALUE' | 'GOOD_VALUE' | 'FAIR_VALUE' | 'POOR_VALUE' | 'BUST';

export interface SwapRequirement {
  min: number;
  max: number;
  isWinnerReceiving: boolean;
}

export interface DraftBudget {
  fromRetirements: number;
  fromReleases: number;
  baseAllocation: number;
  standingsBonus: number;
  total: number;
}

export type TrueValuePoolKey = PlayerPosition | 'RESERVE';

export interface TrueValueLeaguePlayer {
  id: string;
  detectedPosition: PlayerPosition;
  trueValuePool?: TrueValuePoolKey;
  excludeFromPeerPools?: boolean;
  salary: number;
  seasonWAR: number;
}

export interface LeagueContext {
  allPlayers: TrueValueLeaguePlayer[];
}

// ============================================
// CONSTANTS - Per SALARY_SYSTEM_SPEC.md v3
// ============================================

/**
 * Rating weights for position players: 3:3:2:1:1
 * Per spec: Power and Contact equally dominant, Speed secondary, Fielding/Arm tertiary
 */
export const POSITION_PLAYER_WEIGHTS = {
  power: 0.30,      // 3/10
  contact: 0.30,    // 3/10
  speed: 0.20,      // 2/10
  fielding: 0.10,   // 1/10
  arm: 0.10,        // 1/10
};

/**
 * Rating weights for pitchers: 1:1:1 (equal)
 * Per spec: Statistical analysis showed equal weighting has highest correlation (0.9694)
 */
export const PITCHER_WEIGHTS = {
  velocity: 1 / 3,
  junk: 1 / 3,
  accuracy: 1 / 3,
};

/**
 * Position multipliers remain exported tuning knobs, but T5/D15 moves positional
 * value into computeIV(...).kblIV. Defaults are 1.0 per IV spec §3.8.
 */
export const POSITION_MULTIPLIERS: Record<PlayerPosition, number> = {
  'C': 1.00,
  'SS': 1.00,
  'CF': 1.00,
  '2B': 1.00,
  '3B': 1.00,
  'SP': 1.00,
  'CP': 1.00,
  'RF': 1.00,
  'LF': 1.00,
  '1B': 1.00,
  'DH': 1.00,
  'RP': 1.00,
  'SP/RP': 1.00,
  'UTIL': 1.00,
  'BENCH': 1.00,
  'TWO-WAY': 1.00,
};

/**
 * Trait tiers and their salary impacts
 * Per spec Section "Trait Salary Modifiers"
 * @deprecated T5/D15 - retained for legacy bridge and compatibility tests only.
 */
/** @deprecated T5/D15 - retired from the live salary pipeline. */
export const ELITE_POSITIVE_TRAITS = [
  'Clutch', 'Two Way', 'Utility', 'Durable', 'Composed',
];

/** @deprecated T5/D15 - retired from the live salary pipeline. */
export const GOOD_POSITIVE_TRAITS = [
  'Cannon Arm', 'Stealer', 'Magic Hands', 'Dive Wizard', 'K Collector',
  'Rally Stopper', 'RBI Hero', 'Gets Ahead', 'Tough Out', 'First Pitch Slayer', 'Sprinter',
];

/** @deprecated T5/D15 - retired from the live salary pipeline. */
export const MINOR_POSITIVE_TRAITS = [
  'Pinch Perfect', 'Base Rounder', 'Stimulated', 'Specialist', 'Reverse Splits',
  'Pick Officer', 'Sign Stealer', 'Mind Gamer', 'Distractor', 'Bad Ball Hitter',
  'Fastball Hitter', 'Off-Speed Hitter', 'Low Pitch', 'High Pitch', 'Inside Pitch',
  'Outside Pitch', 'Metal Head', 'Consistent', 'Rally Starter', 'CON vs LHP',
  'CON vs RHP', 'POW vs LHP', 'POW vs RHP', 'Ace Exterminator', 'Bunter',
  'Big Hack', 'Little Hack', 'Elite 4F', 'Elite 2F', 'Elite CF', 'Elite FK',
  'Elite SL', 'Elite CB', 'Elite CH', 'Elite SB',
];

/** @deprecated T5/D15 - retired from the live salary pipeline. */
export const SEVERE_NEGATIVE_TRAITS = [
  'Choker', 'Meltdown', 'Injury Prone', 'Volatile',
];

/** @deprecated T5/D15 - retired from the live salary pipeline. */
export const MODERATE_NEGATIVE_TRAITS = [
  'Whiffer', 'Butter Fingers', 'Noodle Arm', 'Wild Thrower', 'BB Prone',
  'Wild Thing', 'Falls Behind', 'K Neglecter', 'Slow Poke',
];

/** @deprecated T5/D15 - retired from the live salary pipeline. */
export const MINOR_NEGATIVE_TRAITS = [
  'First Pitch Prayer', 'Bad Jumps', 'Easy Jumps', 'Easy Target',
  'Base Jogger', 'Surrounded', 'RBI Zero', 'Crossed Up',
];

/** @deprecated T5/D15 - retired from the live salary pipeline. */
export const TRAIT_SALARY_IMPACT = {
  ELITE_POSITIVE: 1.10,     // +10%
  GOOD_POSITIVE: 1.05,      // +5%
  MINOR_POSITIVE: 1.02,     // +2%
  MINOR_NEGATIVE: 0.98,     // -2%
  MODERATE_NEGATIVE: 0.95,  // -5%
  SEVERE_NEGATIVE: 0.90,    // -10%
};

/**
 * Pitcher batting bonus thresholds
 * Per spec: Pitchers with good batting ratings command a premium
 * @deprecated T5/D15 - retired from the live salary pipeline.
 */
export const PITCHER_BATTING_BONUS = {
  ELITE: { threshold: 70, bonus: 1.50 },    // +50%
  GOOD: { threshold: 55, bonus: 1.25 },     // +25%
  COMPETENT: { threshold: 40, bonus: 1.10 }, // +10%
};

/**
 * Two-way player premium
 * Per spec: Combined salaries × 1.25
 * @deprecated T5/D15 - retired from the live salary pipeline.
 */
export const TWO_WAY_PREMIUM = 1.25;

/**
 * Maximum salary in canonical kblIV dollars.
 */
export const MAX_SALARY = 166648.6; // CALIBRATE (T5 bridge — see PROMPT_CONTRACTS T5)

/**
 * Minimum salary in canonical kblIV dollars.
 */
export const MIN_SALARY = 1666.49; // CALIBRATE (T5 bridge — see PROMPT_CONTRACTS T5)

/**
 * Personality modifiers (for free agency)
 */
export const PERSONALITY_MODIFIERS: Record<Personality, number> = {
  Egotistical: 1.15,
  Competitive: 1.05,
  Tough: 1.00,
  Relaxed: 0.95,
  Jolly: 0.90,
  Timid: 0.85,
  Droopy: 1.00,
};

/**
 * Base draft allocation in canonical kblIV dollars.
 */
export const BASE_DRAFT_ALLOCATION = 16664.86; // CALIBRATE (T5 bridge — see PROMPT_CONTRACTS T5)

/**
 * Standings bonus per position in canonical kblIV dollars.
 */
export const STANDINGS_BONUS_PER_POSITION = 1666.49; // CALIBRATE (T5 bridge — see PROMPT_CONTRACTS T5)

/**
 * ROI thresholds (WAR per $100k) after T5 dollar-denomination bridge.
 */
export const ROI_THRESHOLDS: Record<ROITier, number> = {
  ELITE_VALUE: 30.003, // CALIBRATE (T5 bridge — see PROMPT_CONTRACTS T5)
  GREAT_VALUE: 15.002, // CALIBRATE (T5 bridge — see PROMPT_CONTRACTS T5)
  GOOD_VALUE: 7.501, // CALIBRATE (T5 bridge — see PROMPT_CONTRACTS T5)
  FAIR_VALUE: 4.5, // CALIBRATE (T5 bridge — see PROMPT_CONTRACTS T5)
  POOR_VALUE: 1.5, // CALIBRATE (T5 bridge — see PROMPT_CONTRACTS T5)
  BUST: 0,
};

export const ROOKIE_SCALE_FACTOR = 0.50;

const LEGACY_MAX_SALARY_MILLIONS = 50;
const BUST_SCORE_SALARY_DIVISOR = 66659.44; // CALIBRATE (T5 bridge — see PROMPT_CONTRACTS T5)

// ============================================
// RATING CALCULATION FUNCTIONS
// ============================================

/**
 * Check if ratings are for a pitcher
 */
export function isPitcherRatings(ratings: PlayerRatings): ratings is PitcherRatings {
  return 'velocity' in ratings && 'junk' in ratings && 'accuracy' in ratings;
}

/**
 * Get unified batting rating from a BatterRatings object
 * Handles both combined ratings (power, contact) and L/R splits
 */
export function getUnifiedBattingRating(ratings: BatterRatings): number {
  // If we have combined ratings, use them
  if (ratings.power !== undefined && ratings.contact !== undefined) {
    return (
      ratings.power * POSITION_PLAYER_WEIGHTS.power +
      ratings.contact * POSITION_PLAYER_WEIGHTS.contact +
      (ratings.speed || 0) * POSITION_PLAYER_WEIGHTS.speed +
      (ratings.fielding || 0) * POSITION_PLAYER_WEIGHTS.fielding +
      (ratings.arm || 0) * POSITION_PLAYER_WEIGHTS.arm
    );
  }

  // Fall back to L/R splits if available
  const power = ((ratings.powerL || 0) + (ratings.powerR || 0)) / 2;
  const contact = ((ratings.contactL || 0) + (ratings.contactR || 0)) / 2;

  return (
    power * POSITION_PLAYER_WEIGHTS.power +
    contact * POSITION_PLAYER_WEIGHTS.contact +
    (ratings.speed || 0) * POSITION_PLAYER_WEIGHTS.speed +
    (ratings.fielding || 0) * POSITION_PLAYER_WEIGHTS.fielding +
    (ratings.arm || 0) * POSITION_PLAYER_WEIGHTS.arm
  );
}

/**
 * Calculate weighted rating for a pitcher
 */
export function getPitcherRating(ratings: PitcherRatings): number {
  return (
    (ratings.velocity || 0) * PITCHER_WEIGHTS.velocity +
    (ratings.junk || 0) * PITCHER_WEIGHTS.junk +
    (ratings.accuracy || 0) * PITCHER_WEIGHTS.accuracy
  );
}

/**
 * Calculate weighted rating for a player
 */
export function calculateWeightedRating(ratings: PlayerRatings, isPitcher: boolean): number {
  if (isPitcher && isPitcherRatings(ratings)) {
    return getPitcherRating(ratings);
  }
  return getUnifiedBattingRating(ratings as BatterRatings);
}

// ============================================
// BASE SALARY CALCULATION
// ============================================

/**
 * Convert weighted rating to base salary using exponential formula
 * Formula: (weightedRating / 100)^2.5 * 50
 */
function ratingsToBaseSalary(weightedRating: number): number {
  const baseSalary = Math.pow(weightedRating / 100, 2.5) * LEGACY_MAX_SALARY_MILLIONS;
  return Math.round(baseSalary * 10) / 10;
}

/**
 * Calculate base salary for a position player
 * @deprecated T5/D15: live salary uses computeIV(...).kblIV. Kept for bridge
 * scripts and legacy matrix coverage only.
 */
export function calculatePositionPlayerBaseSalary(ratings: BatterRatings): number {
  const weightedRating = getUnifiedBattingRating(ratings);
  return ratingsToBaseSalary(weightedRating);
}

/**
 * Calculate base salary for a pitcher
 * @deprecated T5/D15: live salary uses computeIV(...).kblIV. Kept for bridge
 * scripts and legacy matrix coverage only.
 */
export function calculatePitcherBaseSalary(ratings: PitcherRatings): number {
  const weightedRating = getPitcherRating(ratings);
  return ratingsToBaseSalary(weightedRating);
}

/**
 * Get the full (unadjusted) batting bonus for a pitcher
 * Used internally before applying DH adjustments
 */
function getFullPitcherBattingBonus(battingRatings: BatterRatings): number {
  const battingRating = getUnifiedBattingRating(battingRatings);

  if (battingRating >= PITCHER_BATTING_BONUS.ELITE.threshold) {
    return PITCHER_BATTING_BONUS.ELITE.bonus;
  } else if (battingRating >= PITCHER_BATTING_BONUS.GOOD.threshold) {
    return PITCHER_BATTING_BONUS.GOOD.bonus;
  } else if (battingRating >= PITCHER_BATTING_BONUS.COMPETENT.threshold) {
    return PITCHER_BATTING_BONUS.COMPETENT.bonus;
  }

  return 1.0;
}

/**
 * Calculate pitcher batting bonus with DH context
 * @deprecated T5/D15: pitcher batting value is priced by kblIV usage weights.
 * Kept for legacy tests and historical display compatibility only.
 *
 * Key adjustments:
 * 1. Two-way players ALWAYS get full bonus (they play every day)
 * 2. Regular pitchers get reduced bonus based on:
 *    - DH percentage (how often their league uses DH)
 *    - Rotation factor (pitchers only bat when they start, ~25% of games)
 *
 * @param battingRatings - Pitcher's batting ratings
 * @param dhContext - Optional DH context for league-aware calculation
 * @returns Bonus multiplier (1.0 = no bonus)
 */
export function calculatePitcherBattingBonus(
  battingRatings?: BatterRatings,
  dhContext?: DHContext
): number {
  if (!battingRatings) return 1.0;

  // Get the full (unadjusted) batting bonus
  const fullBonus = getFullPitcherBattingBonus(battingRatings);

  // If no bonus earned, no need for DH adjustment
  if (fullBonus <= 1.0) return 1.0;

  // Two-way players ALWAYS get full bonus - they play every day
  // (either pitching or in the field), so their batting has full value
  if (dhContext?.isTwoWay) {
    return fullBonus;
  }

  // If no DH context provided, use legacy behavior (full bonus)
  // This maintains backward compatibility
  if (!dhContext) {
    return fullBonus;
  }

  // For regular pitchers, calculate effective batting multiplier:
  // - They only bat in games without DH
  // - Even then, they only bat when they start (~25% of games)
  const battingMultiplier = calculatePitcherBattingMultiplier(dhContext.effectiveDHPercentage);

  // Apply the batting multiplier to the bonus portion only
  // Formula: 1 + (fullBonus - 1) * battingMultiplier
  // Example: 50% bonus (1.50) with 0.25 multiplier → 1 + 0.50 * 0.25 = 1.125 (+12.5%)
  const adjustedBonus = 1 + (fullBonus - 1) * battingMultiplier;

  return adjustedBonus;
}

/**
 * Calculate base salary for a two-way player
 * @deprecated T5/D15: Two Way is priced by kblIV usage-unlock machinery.
 */
export function calculateTwoWayBaseSalary(
  batterRatings: BatterRatings,
  pitcherRatings: PitcherRatings
): number {
  const positionSalary = calculatePositionPlayerBaseSalary(batterRatings);
  const pitcherSalary = calculatePitcherBaseSalary(pitcherRatings);

  // Combined with premium
  return (positionSalary + pitcherSalary) * TWO_WAY_PREMIUM;
}

/**
 * Calculate base salary from ratings (router function)
 * @deprecated T5/D15: live salary base is computeIV(...).kblIV.
 *
 * @param player - Player data with ratings
 * @param dhContext - Optional DH context for pitcher batting bonus adjustment
 */
export function calculateBaseRatingSalary(
  player: PlayerForSalary,
  dhContext?: DHContext
): number {
  // Two-way player - always gets full batting value (uses special formula)
  if (player.isTwoWay && player.battingRatings && isPitcherRatings(player.ratings)) {
    return calculateTwoWayBaseSalary(player.battingRatings, player.ratings);
  }

  // Pitcher who can hit - apply DH-aware batting bonus
  if (player.isPitcher && isPitcherRatings(player.ratings)) {
    const baseSalary = calculatePitcherBaseSalary(player.ratings);

    // Build DH context for this pitcher, ensuring isTwoWay is set
    const pitcherDHContext = dhContext
      ? { ...dhContext, isTwoWay: player.isTwoWay ?? false }
      : undefined;

    const battingBonus = calculatePitcherBattingBonus(player.battingRatings, pitcherDHContext);
    return baseSalary * battingBonus;
  }

  // Position player - no DH adjustment needed
  return calculatePositionPlayerBaseSalary(player.ratings as BatterRatings);
}

// ============================================
// MODIFIER FUNCTIONS
// ============================================

/**
 * Get position multiplier
 */
export function getPositionMultiplier(position?: PlayerPosition): number {
  if (!position) return 1.0;
  return POSITION_MULTIPLIERS[position] || 1.0;
}

/**
 * Calculate trait modifier
 * Traits are multiplicative
 * @deprecated T5/D15: trait pricing is already embedded in kblIV at the L2
 * reference; live salary path uses traitModifier=1.0.
 */
export function calculateTraitModifier(traits?: string[]): number {
  if (!traits || traits.length === 0) return 1.0;

  let modifier = 1.0;

  for (const trait of traits) {
    if (ELITE_POSITIVE_TRAITS.includes(trait)) {
      modifier *= TRAIT_SALARY_IMPACT.ELITE_POSITIVE;
    } else if (GOOD_POSITIVE_TRAITS.includes(trait)) {
      modifier *= TRAIT_SALARY_IMPACT.GOOD_POSITIVE;
    } else if (MINOR_POSITIVE_TRAITS.includes(trait)) {
      modifier *= TRAIT_SALARY_IMPACT.MINOR_POSITIVE;
    } else if (SEVERE_NEGATIVE_TRAITS.includes(trait)) {
      modifier *= TRAIT_SALARY_IMPACT.SEVERE_NEGATIVE;
    } else if (MODERATE_NEGATIVE_TRAITS.includes(trait)) {
      modifier *= TRAIT_SALARY_IMPACT.MODERATE_NEGATIVE;
    } else if (MINOR_NEGATIVE_TRAITS.includes(trait)) {
      modifier *= TRAIT_SALARY_IMPACT.MINOR_NEGATIVE;
    }
  }

  return modifier;
}

/**
 * Calculate age factor
 */
export function calculateAgeFactor(age: number): number {
  if (age <= 24) return 0.70;       // Rookie scale
  if (age <= 26) return 0.85;       // Pre-arb
  if (age <= 29) return 1.00;       // Prime
  if (age <= 32) return 1.10;       // Peak earning
  if (age <= 35) return 1.00;       // Veteran
  if (age <= 38) return 0.85;       // Declining
  return 0.70;                       // Twilight
}

/**
 * Calculate performance modifier
 */
export function calculatePerformanceModifier(
  actualWAR: number,
  expectedWAR: number
): number {
  const delta = actualWAR - expectedWAR;
  const modifier = 1 + (delta * 0.10);
  return Math.max(0.5, Math.min(1.5, modifier));
}

/**
 * Calculate Fame modifier
 */
export function calculateFameModifier(fame: number): number {
  const modifier = 1 + (fame * 0.03);
  return Math.max(0.7, Math.min(1.3, modifier));
}

/**
 * Apply personality modifier (only when joining new team)
 */
export function applyPersonalityModifier(
  salary: number,
  personality: Personality | undefined,
  isNewTeam: boolean
): number {
  if (!isNewTeam || !personality) return salary;
  return salary * (PERSONALITY_MODIFIERS[personality] || 1.0);
}

function roundSalaryDollars(value: number): number {
  return Math.round(value);
}

function isPitcherPosition(position: PlayerPosition | undefined): position is 'SP' | 'RP' | 'CP' | 'SP/RP' {
  return position === 'SP' || position === 'RP' || position === 'CP' || position === 'SP/RP';
}

function resolvePitcherRole(player: PlayerForSalary): 'SP' | 'RP' | 'CP' | 'SP/RP' {
  if (player.pitcherRole) return player.pitcherRole;
  if (isPitcherPosition(player.primaryPosition)) return player.primaryPosition;
  return 'SP';
}

function resolveHitterPosition(position: PlayerPosition | undefined): string {
  if (!position || position === 'UTIL' || position === 'BENCH') return 'IF/OF';
  if (position === 'TWO-WAY') return 'OF';
  return position;
}

function normalizeSalaryTraitsForIV(player: PlayerForSalary): string[] {
  const traits = [...(player.traits ?? [])];
  if (player.isTwoWay && !traits.some((trait) => trait.startsWith('Two Way'))) {
    traits.push('Two Way (OF)');
  }
  return traits;
}

export function buildSalaryIvInput(player: PlayerForSalary): IVPlayerInput {
  const batterRatings = player.isPitcher
    ? player.battingRatings ?? { power: 0, contact: 0, speed: 0, fielding: 0, arm: 0 }
    : player.ratings as BatterRatings;

  return {
    id: player.id,
    name: player.name,
    isPitcher: player.isPitcher,
    bats: player.bats,
    primaryPosition: player.isPitcher ? undefined : resolveHitterPosition(player.primaryPosition),
    secondaryPosition: player.secondaryPosition,
    pitcherRole: player.isPitcher ? resolvePitcherRole(player) : undefined,
    batterRatings,
    pitcherRatings: player.isPitcher && isPitcherRatings(player.ratings)
      ? {
          velocity: player.ratings.velocity,
          junk: player.ratings.junk,
          accuracy: player.ratings.accuracy,
        }
      : undefined,
    traits: normalizeSalaryTraitsForIV(player),
    arsenal: player.arsenal ?? [],
    armSlot: player.armSlot ?? null,
  };
}

export function calculateIvBaseSalary(player: PlayerForSalary): { ivBase: number; ivBreakdown: IVLayerBreakdown } {
  const result = computeIV(buildSalaryIvInput(player));
  return {
    ivBase: result.kblIV,
    ivBreakdown: result.kbl,
  };
}

// ============================================
// COMPLETE SALARY CALCULATION
// ============================================

/**
 * Calculate complete salary with breakdown
 * Per IV spec §3.8 / D15: kblIV × position knob × age or rookie scale ×
 * performance × fame × personality. Trait percentage repricing is retired from
 * the live salary path because kblIV already carries L2-reference trait value.
 *
 * @param player - Player data
 * @param seasonStats - Optional season statistics
 * @param expectations - Optional expected performance
 * @param isNewTeam - Whether player is joining a new team (for personality modifier)
 * @param dhContext - Optional DH context for pitcher batting bonus adjustment
 */
export function calculateSalaryWithBreakdown(
  player: PlayerForSalary,
  seasonStats?: SeasonStatsForSalary,
  expectations?: ExpectedPerformance,
  isNewTeam: boolean = false,
  dhContext?: DHContext,
  options: SalaryCalculationOptions = {},
): SalaryBreakdown {
  void dhContext;

  // 1. T5/D15 base salary from kblIV. Legacy baseSalary remains populated for
  // back-compat, but it is the same canonical ivBase value.
  const { ivBase, ivBreakdown } = calculateIvBaseSalary(player);
  const baseSalary = ivBase;

  // 2. Position multiplier knob. Defaults are 1.0 because positional value is
  // already embedded in the IV curves (§3.8).
  const positionMultiplier = getPositionMultiplier(player.primaryPosition);
  const afterPosition = baseSalary * positionMultiplier;

  // 3. Trait modifier retired from salary path by D15; kblIV already includes
  // L2-reference trait value.
  const traitModifier = 1.0;
  const afterTraits = afterPosition * traitModifier;

  // 4. Age factor, with rookie-scale override replacing age rather than
  // stacking with it (§8.4 / D6 / FINDING-127).
  const ageFactor = options.rookieScaleActive ? ROOKIE_SCALE_FACTOR : calculateAgeFactor(player.age);
  const afterAge = afterTraits * ageFactor;

  // 5. Performance modifier (if season data available)
  let performanceModifier = 1.0;
  let afterPerformance = afterAge;
  if (seasonStats && expectations) {
    performanceModifier = calculatePerformanceModifier(
      seasonStats.war.total,
      expectations.total
    );
    afterPerformance = afterAge * performanceModifier;
  }

  // 6. Fame modifier
  const fameModifier = calculateFameModifier(player.fame);
  const afterFame = afterPerformance * fameModifier;

  // 7. Personality modifier (only when joining new team)
  const personalityModifier = isNewTeam && player.personality
    ? PERSONALITY_MODIFIERS[player.personality] || 1.0
    : 1.0;
  const afterPersonality = afterFame * personalityModifier;

  // Final salary clamped to bridged dollar bounds.
  const finalSalary = Math.min(
    MAX_SALARY,
    Math.max(MIN_SALARY, roundSalaryDollars(afterPersonality))
  );

  return {
    ivBase,
    ivBreakdown,
    baseSalary,
    positionMultiplier,
    traitModifier,
    ageFactor,
    performanceModifier,
    fameModifier,
    personalityModifier,
    finalSalary,
    components: {
      fromRatings: baseSalary,
      afterPosition,
      afterTraits,
      afterAge,
      afterPerformance,
      afterFame,
      afterPersonality: finalSalary,
    },
  };
}

/**
 * Calculate salary (simplified)
 *
 * @param player - Player data
 * @param seasonStats - Optional season statistics
 * @param expectations - Optional expected performance
 * @param isNewTeam - Whether player is joining a new team (for personality modifier)
 * @param dhContext - Optional DH context for pitcher batting bonus adjustment
 */
export function calculateSalary(
  player: PlayerForSalary,
  seasonStats?: SeasonStatsForSalary,
  expectations?: ExpectedPerformance,
  isNewTeam: boolean = false,
  dhContext?: DHContext,
  options: SalaryCalculationOptions = {},
): number {
  return calculateSalaryWithBreakdown(player, seasonStats, expectations, isNewTeam, dhContext, options).finalSalary;
}

// ============================================
// EXPECTED WAR CALCULATION
// ============================================

/**
 * Calculate expected WAR based on ratings
 */
export function calculateExpectedWAR(
  player: PlayerForSalary,
  gamesPerSeason: number = 48
): ExpectedPerformance {
  const weightedRating = calculateWeightedRating(player.ratings, player.isPitcher);
  const scaleFactor = getSeasonScalingFactor({
    gamesPerSeason,
    inningsPerGame: MLB_BASELINE_INNINGS,
  });

  let baseExpectedWAR: number;
  if (weightedRating >= 95) baseExpectedWAR = 6.0;
  else if (weightedRating >= 90) baseExpectedWAR = 4.5;
  else if (weightedRating >= 85) baseExpectedWAR = 3.5;
  else if (weightedRating >= 80) baseExpectedWAR = 2.5;
  else if (weightedRating >= 75) baseExpectedWAR = 2.0;
  else if (weightedRating >= 70) baseExpectedWAR = 1.5;
  else if (weightedRating >= 65) baseExpectedWAR = 1.0;
  else if (weightedRating >= 60) baseExpectedWAR = 0.5;
  else baseExpectedWAR = 0.2;

  const scaledExpected = baseExpectedWAR * scaleFactor;

  if (player.isPitcher) {
    return {
      total: scaledExpected,
      pitching: scaledExpected * 0.9,
      fielding: scaledExpected * 0.1,
    };
  }

  return {
    total: scaledExpected,
    batting: scaledExpected * 0.6,
    fielding: scaledExpected * 0.25,
    baserunning: scaledExpected * 0.15,
  };
}

// ============================================
// TRUE VALUE CALCULATION (Position-Relative)
// ============================================

export const TRUE_VALUE_CALCULATION_VERSION = 'true-value-effective-position-v2';
export const TRUE_VALUE_MIN_PEER_POOL_SIZE = 6;

export const TRUE_VALUE_PLAYER_POSITIONS: readonly PlayerPosition[] = [
  'SP',
  'SP/RP',
  'RP',
  'CP',
  'C',
  '1B',
  '2B',
  'SS',
  '3B',
  'LF',
  'CF',
  'RF',
];

const TRUE_VALUE_PLAYER_POSITION_SET = new Set<string>(TRUE_VALUE_PLAYER_POSITIONS);

export function normalizeTrueValuePosition(position: unknown): PlayerPosition | null {
  // TV1-FIX R-6: True Value accepts only canonical primary positions.
  // Non-canonical labels are data defects for callers to surface, not inputs
  // to normalize into an inferred peer pool.
  if (typeof position !== 'string') return null;
  const normalized = position.trim().toUpperCase();
  if (TRUE_VALUE_PLAYER_POSITION_SET.has(normalized)) return normalized as PlayerPosition;
  return null;
}

/**
 * Position merge groups for small peer pools
 */
const POSITION_MERGE_GROUPS: Partial<Record<PlayerPosition, PlayerPosition[]>> = {
  'CP': ['CP', 'RP'],
  'RP': ['RP', 'CP'],
  'SP/RP': ['SP/RP', 'SP', 'RP'],
  '1B': ['1B', '3B'],
  '3B': ['3B', '1B'],
  '2B': ['2B', 'SS'],
  'SS': ['SS', '2B'],
  'LF': ['LF', 'RF', 'CF'],
  'RF': ['RF', 'LF', 'CF'],
  'CF': ['CF', 'LF', 'RF'],
};

/**
 * Get peer pool for a position
 */
function getPositionPeerPool(
  position: TrueValuePoolKey,
  allPlayers: LeagueContext['allPlayers']
): LeagueContext['allPlayers'] {
  const poolEligiblePlayers = allPlayers.filter(p => !p.excludeFromPeerPools);
  const poolKey = (player: LeagueContext['allPlayers'][number]) =>
    player.trueValuePool ?? player.detectedPosition;

  // Direct position matches
  let pool = poolEligiblePlayers.filter(p => poolKey(p) === position);

  // SALARY_SYSTEM_SPEC_UPDATED.md True Value Calculation + R-3:
  // merge sparse position pools first, then fall back to whole league only
  // when the merged pool is still below the canonical peer floor.
  // EP1 R-8/R-9: effective-position and Reserve callers provide trueValuePool;
  // Reserve is a distinct sparse pool with only the whole-league safety net.
  if (position !== 'RESERVE' && pool.length < TRUE_VALUE_MIN_PEER_POOL_SIZE) {
    const mergeGroup = POSITION_MERGE_GROUPS[position];
    if (mergeGroup) {
      pool = poolEligiblePlayers.filter(p => mergeGroup.includes(poolKey(p) as PlayerPosition));
    }
  }

  // If still too small, return all players
  if (pool.length < TRUE_VALUE_MIN_PEER_POOL_SIZE) {
    return poolEligiblePlayers;
  }

  return pool;
}

/**
 * Calculate True Value (position-relative percentile approach)
 * Per SALARY_SYSTEM_SPEC_UPDATED.md "True Value Calculation" and TV1 R-2:
 * this is the canonical step-percentile implementation for True Value.
 */
export function calculateTrueValue(
  player: { id?: string; salary: number; seasonWAR: number; detectedPosition: PlayerPosition; trueValuePool?: TrueValuePoolKey },
  leagueContext: LeagueContext
): TrueValueResult {
  const position = player.trueValuePool ?? player.detectedPosition;
  const actualWAR = player.seasonWAR;

  // Get peer pool for this position
  const peerPool = getPositionPeerPool(position, leagueContext.allPlayers);

  // Calculate position percentiles
  const warsAtPosition = peerPool.map(p => p.seasonWAR).sort((a, b) => a - b);
  const salariesAtPosition = peerPool.map(p => p.salary).sort((a, b) => a - b);

  // Find player's WAR percentile among position peers
  const warPercentile = getPercentile(actualWAR, warsAtPosition);

  // True Value = salary at that same percentile among position peers
  const trueValue = getValueAtPercentile(warPercentile, salariesAtPosition);
  const valueDelta = trueValue - player.salary;

  // Calculate simple ROI for backward compatibility. T5 canonical salaries are
  // dollars, so tiering uses WAR per $100k; roiWARPerMillion is retained as an
  // alias for legacy consumers.
  const roiWARPer100k = player.salary > 0 ? actualWAR / (player.salary / 100_000) : 0;

  let roiTier: ROITier;
  if (roiWARPer100k >= ROI_THRESHOLDS.ELITE_VALUE) roiTier = 'ELITE_VALUE';
  else if (roiWARPer100k >= ROI_THRESHOLDS.GREAT_VALUE) roiTier = 'GREAT_VALUE';
  else if (roiWARPer100k >= ROI_THRESHOLDS.GOOD_VALUE) roiTier = 'GOOD_VALUE';
  else if (roiWARPer100k >= ROI_THRESHOLDS.FAIR_VALUE) roiTier = 'FAIR_VALUE';
  else if (roiWARPer100k >= ROI_THRESHOLDS.POOR_VALUE) roiTier = 'POOR_VALUE';
  else roiTier = 'BUST';

  let valueRating: number;
  switch (roiTier) {
    case 'ELITE_VALUE': valueRating = 5; break;
    case 'GREAT_VALUE': valueRating = 4; break;
    case 'GOOD_VALUE': valueRating = 3; break;
    case 'FAIR_VALUE': valueRating = 2; break;
    default: valueRating = 1;
  }

  return {
    trueValue,
    contractValue: player.salary,
    valueDelta,
    warPercentile,
    position,
    peerPoolSize: peerPool.length,
    // Legacy fields
    salary: player.salary,
    war: actualWAR,
    roiWARPer100k: Math.round(roiWARPer100k * 1000) / 1000,
    roiWARPerMillion: Math.round(roiWARPer100k * 1000) / 1000,
    roiTier,
    valueRating,
  };
}

/**
 * Simple ROI calculation (for backward compatibility)
 */
export function calculateSimpleROI(salary: number, war: number): {
  roiWARPer100k: number;
  roiWARPerMillion: number;
  roiTier: ROITier;
  valueRating: number;
} {
  const roiWARPer100k = salary > 0 ? war / (salary / 100_000) : 0;

  let roiTier: ROITier;
  if (roiWARPer100k >= ROI_THRESHOLDS.ELITE_VALUE) roiTier = 'ELITE_VALUE';
  else if (roiWARPer100k >= ROI_THRESHOLDS.GREAT_VALUE) roiTier = 'GREAT_VALUE';
  else if (roiWARPer100k >= ROI_THRESHOLDS.GOOD_VALUE) roiTier = 'GOOD_VALUE';
  else if (roiWARPer100k >= ROI_THRESHOLDS.FAIR_VALUE) roiTier = 'FAIR_VALUE';
  else if (roiWARPer100k >= ROI_THRESHOLDS.POOR_VALUE) roiTier = 'POOR_VALUE';
  else roiTier = 'BUST';

  let valueRating: number;
  switch (roiTier) {
    case 'ELITE_VALUE': valueRating = 5; break;
    case 'GREAT_VALUE': valueRating = 4; break;
    case 'GOOD_VALUE': valueRating = 3; break;
    case 'FAIR_VALUE': valueRating = 2; break;
    default: valueRating = 1;
  }

  return {
    roiWARPer100k: Math.round(roiWARPer100k * 1000) / 1000,
    roiWARPerMillion: Math.round(roiWARPer100k * 1000) / 1000,
    roiTier,
    valueRating,
  };
}

/**
 * Get ROI tier display text
 */
export function getROITierDisplay(tier: ROITier): string {
  const displays: Record<ROITier, string> = {
    ELITE_VALUE: 'Elite Value ⭐⭐⭐⭐⭐',
    GREAT_VALUE: 'Great Value ⭐⭐⭐⭐',
    GOOD_VALUE: 'Good Value ⭐⭐⭐',
    FAIR_VALUE: 'Fair Value ⭐⭐',
    POOR_VALUE: 'Poor Value ⭐',
    BUST: 'Bust ⚠️',
  };
  return displays[tier];
}

// ============================================
// FREE AGENCY / TRADE MATCHING
// ============================================

/**
 * Calculate swap requirement for a trade
 */
export function calculateSwapRequirement(
  outgoingPlayerSalary: number,
  receivingTeamWinPct: number,
  sendingTeamWinPct: number
): SwapRequirement {
  const isWinnerReceiving = receivingTeamWinPct >= sendingTeamWinPct;

  if (isWinnerReceiving) {
    return {
      min: outgoingPlayerSalary * 0.90,
      max: outgoingPlayerSalary * 1.10,
      isWinnerReceiving: true,
    };
  } else {
    return {
      min: outgoingPlayerSalary * 0.70,
      max: outgoingPlayerSalary * 1.00,
      isWinnerReceiving: false,
    };
  }
}

/**
 * Validate a multi-player swap
 */
export interface SwapValidation {
  valid: boolean;
  reason?: string;
  totalIncomingSalary?: number;
}

export function validateMultiPlayerSwap(
  outgoingPlayerSalary: number,
  incomingPlayerSalaries: number[],
  salaryRange: SwapRequirement,
  outgoingIsPitcher: boolean,
  incomingTypes: boolean[]
): SwapValidation {
  const totalIncomingSalary = incomingPlayerSalaries.reduce((sum, s) => sum + s, 0);

  if (totalIncomingSalary < salaryRange.min || totalIncomingSalary > salaryRange.max) {
    return {
      valid: false,
      reason: `Total salary ${formatSalary(totalIncomingSalary)} outside range ${formatSalary(salaryRange.min)} - ${formatSalary(salaryRange.max)}`,
      totalIncomingSalary,
    };
  }

  const hasMatchingType = incomingTypes.some(isPitcher => isPitcher === outgoingIsPitcher);

  if (!hasMatchingType) {
    return {
      valid: false,
      reason: 'At least one player must match position type (pitcher/position player)',
      totalIncomingSalary,
    };
  }

  return { valid: true, totalIncomingSalary };
}

// ============================================
// DRAFT BUDGET
// ============================================

/**
 * Calculate draft budget for a team
 */
export function calculateDraftBudget(
  retiredPlayerSalaries: number[],
  releasedPlayerSalaries: number[],
  standingsPosition: number,
  totalTeams: number
): DraftBudget {
  const fromRetirements = retiredPlayerSalaries.reduce((sum, s) => sum + s, 0);
  const fromReleases = releasedPlayerSalaries.reduce((sum, s) => sum + s, 0);
  const baseAllocation = BASE_DRAFT_ALLOCATION;
  const standingsBonus = (totalTeams - standingsPosition) * STANDINGS_BONUS_PER_POSITION;

  return {
    fromRetirements,
    fromReleases,
    baseAllocation,
    standingsBonus,
    total: fromRetirements + fromReleases + baseAllocation + standingsBonus,
  };
}

/**
 * Check if a draft pick is affordable
 */
export function canAffordDraftPick(
  budget: DraftBudget,
  alreadyDrafted: number,
  pickCost: number
): boolean {
  const remaining = budget.total - alreadyDrafted;
  return pickCost <= remaining;
}

// ============================================
// SALARY UPDATE TRIGGERS
// ============================================

export interface SalaryUpdateResult {
  previousSalary: number;
  newSalary: number;
  change: number;
  trigger: SalaryTrigger;
}

export function updatePlayerSalary(
  player: PlayerForSalary,
  previousSalary: number,
  seasonStats: SeasonStatsForSalary,
  expectations: ExpectedPerformance,
  trigger: SalaryTrigger = 'GAME_UPDATE'
): SalaryUpdateResult {
  const newSalary = calculateSalary(player, seasonStats, expectations, false);

  return {
    previousSalary,
    newSalary,
    change: roundSalaryDollars(newSalary - previousSalary),
    trigger,
  };
}

// ============================================
// FAN EXPECTATIONS
// ============================================

export type ExpectationLevel =
  | 'CHAMPIONSHIP_OR_BUST'
  | 'PLAYOFF_CONTENDER'
  | 'COMPETITIVE'
  | 'REBUILDING';

export interface FanExpectations {
  level: ExpectationLevel;
  payrollPercentile: number;
  minExpectedWins: number;
  managerFireProbability: number;
  fanRevoltProbability: number;
}

export function calculateFanExpectations(
  payrollRank: number,
  totalTeams: number,
  gamesPerSeason: number
): FanExpectations {
  const payrollPercentile = 1 - (payrollRank / totalTeams);

  let level: ExpectationLevel;
  let minExpectedWins: number;
  let managerFireProbability: number;
  let fanRevoltProbability: number;

  if (payrollPercentile >= 0.75) {
    level = 'CHAMPIONSHIP_OR_BUST';
    minExpectedWins = Math.round(gamesPerSeason * 0.60);
    managerFireProbability = 0.15;
    fanRevoltProbability = 0.10;
  } else if (payrollPercentile >= 0.50) {
    level = 'PLAYOFF_CONTENDER';
    minExpectedWins = Math.round(gamesPerSeason * 0.52);
    managerFireProbability = 0.08;
    fanRevoltProbability = 0.05;
  } else if (payrollPercentile >= 0.25) {
    level = 'COMPETITIVE';
    minExpectedWins = Math.round(gamesPerSeason * 0.45);
    managerFireProbability = 0.05;
    fanRevoltProbability = 0.02;
  } else {
    level = 'REBUILDING';
    minExpectedWins = Math.round(gamesPerSeason * 0.35);
    managerFireProbability = 0.05;
    fanRevoltProbability = 0.02;
  }

  return {
    level,
    payrollPercentile,
    minExpectedWins,
    managerFireProbability,
    fanRevoltProbability,
  };
}

export function getExpectationLevelDisplay(level: ExpectationLevel): string {
  const displays: Record<ExpectationLevel, string> = {
    CHAMPIONSHIP_OR_BUST: 'Championship or Bust 🏆',
    PLAYOFF_CONTENDER: 'Playoff Contender 📈',
    COMPETITIVE: 'Competitive ⚾',
    REBUILDING: 'Rebuilding 🔧',
  };
  return displays[level];
}

// ============================================
// BUST/COMEBACK SCORING
// ============================================

export function calculateBustScore(
  salary: number,
  actualWAR: number,
  expectedWAR: number
): number {
  const underperformance = expectedWAR - actualWAR;
  if (underperformance <= 0) return 0;

  const salaryFactor = salary / BUST_SCORE_SALARY_DIVISOR;
  return underperformance * salaryFactor;
}

export function calculateComebackScore(
  actualWAR: number,
  expectedWAR: number,
  previousSeasonWAR: number
): number {
  if (previousSeasonWAR >= 1.5) return 0;

  const improvement = actualWAR - expectedWAR;
  if (improvement <= 0.5) return 0;

  const struggleFactor = Math.max(0, 2 - previousSeasonWAR);
  return improvement * struggleFactor;
}

// ============================================
// DISPLAY HELPERS
// ============================================

export function formatSalary(salary: number): string {
  const abs = Math.abs(salary);
  const sign = salary < 0 ? '-' : '';
  if (abs >= 1_000_000) {
    return `${sign}$${(abs / 1_000_000).toFixed(2)}M`;
  }
  if (abs >= 1_000) {
    return `${sign}$${(abs / 1_000).toFixed(1)}K`;
  }
  return `${sign}$${abs.toFixed(abs < 10 ? 2 : 0)}`;
}

export function formatSalaryChange(change: number): string {
  const sign = change >= 0 ? '+' : '';
  return `${sign}${formatSalary(change)}`;
}

export function getSalaryTier(salary: number): string {
  if (salary >= 133318.88) return 'Superstar Contract'; // CALIBRATE (T5 bridge — see PROMPT_CONTRACTS T5)
  if (salary >= 99989.16) return 'All-Star Contract'; // CALIBRATE (T5 bridge — see PROMPT_CONTRACTS T5)
  if (salary >= 66659.44) return 'Premium Contract'; // CALIBRATE (T5 bridge — see PROMPT_CONTRACTS T5)
  if (salary >= 33329.72) return 'Solid Contract'; // CALIBRATE (T5 bridge — see PROMPT_CONTRACTS T5)
  if (salary >= 16664.86) return 'Moderate Contract'; // CALIBRATE (T5 bridge — see PROMPT_CONTRACTS T5)
  if (salary >= 6665.94) return 'Budget Contract'; // CALIBRATE (T5 bridge — see PROMPT_CONTRACTS T5)
  return 'Minimum Contract';
}

export function getSalaryColor(salary: number): string {
  if (salary >= 133318.88) return '#a855f7'; // CALIBRATE (T5 bridge — see PROMPT_CONTRACTS T5)
  if (salary >= 99989.16) return '#f59e0b'; // CALIBRATE (T5 bridge — see PROMPT_CONTRACTS T5)
  if (salary >= 66659.44) return '#22c55e'; // CALIBRATE (T5 bridge — see PROMPT_CONTRACTS T5)
  if (salary >= 33329.72) return '#3b82f6'; // CALIBRATE (T5 bridge — see PROMPT_CONTRACTS T5)
  if (salary >= 16664.86) return '#6b7280'; // CALIBRATE (T5 bridge — see PROMPT_CONTRACTS T5)
  return '#9ca3af';
}

export function getRatingSalaryScale(): Array<{ rating: string; salary: string }> {
  return [
    { rating: '95+', salary: '$150K-167K' },
    { rating: '90-94', salary: '$117K-147K' },
    { rating: '85-89', salary: '$83K-113K' },
    { rating: '80-84', salary: '$60K-80K' },
    { rating: '75-79', salary: '$40K-57K' },
    { rating: '70-74', salary: '$27K-37K' },
    { rating: '65-69', salary: '$17K-23K' },
    { rating: '60-64', salary: '$10K-13K' },
    { rating: '55-59', salary: '$6.7K-10K' },
    { rating: '50-54', salary: '$3.3K-6.7K' },
    { rating: '<50', salary: '$1.7K-3.3K' },
  ];
}

// ============================================
// BACKWARD COMPATIBILITY EXPORTS
// ============================================

// Legacy weight exports (renamed to be clear they're for backward compatibility)
export const BATTER_RATING_WEIGHTS = {
  powerL: 0.15,  // Half of power (0.30/2 for L/R splits)
  powerR: 0.15,
  contactL: 0.15,  // Half of contact
  contactR: 0.15,
  speed: 0.20,
  fielding: 0.10,
  arm: 0.10,
};

export const PITCHER_RATING_WEIGHTS = {
  velocity: 1 / 3,
  junk: 1 / 3,
  accuracy: 1 / 3,
};
