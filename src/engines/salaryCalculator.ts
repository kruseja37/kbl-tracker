/**
 * Salary Calculator - Player Value and Salary System
 *
 * Calculates player salaries based on:
 * - Base rating value (weighted ratings per spec 3:3:2:1:1 and 1:1:1)
 * - Position multiplier (premium for C, SS, etc.)
 * - Trait modifier (Clutch +10%, Choker -10%, etc.)
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
 * DH-Aware Salary Rules:
 * - Two-way players ALWAYS get full batting bonus (they play every day)
 * - Regular pitchers get reduced batting bonus based on:
 *   1. League DH percentage (0% = pitchers bat, 100% = universal DH)
 *   2. Rotation factor (even without DH, pitchers only bat when they start)
 *
 * @see SALARY_SYSTEM_SPEC.md
 */

import {
  type DHContext,
  calculatePitcherBattingMultiplier,
  PITCHER_ROTATION_FACTOR,
} from '../utils/leagueConfig';

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
  ratings: PlayerRatings;
  battingRatings?: BatterRatings;  // For pitchers who can hit
  age: number;
  personality?: Personality;
  fame: number;
  traits?: string[];
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

export interface LeagueContext {
  allPlayers: Array<{
    id: string;
    detectedPosition: PlayerPosition;
    salary: number;
    seasonWAR: number;
  }>;
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
 * Position multipliers - premium defensive positions command higher salaries
 * Per spec Section "Position Multipliers"
 */
export const POSITION_MULTIPLIERS: Record<PlayerPosition, number> = {
  // Premium positions
  'C': 1.15,      // Most valuable - defensive + game management
  'SS': 1.12,    // Premium up-the-middle defense

  // Above average
  'CF': 1.08,    // Covers most ground
  '2B': 1.05,    // Up-the-middle, double play pivot

  // Average
  '3B': 1.02,    // Hot corner reflexes
  'SP': 1.00,    // Baseline for starters
  'CP': 1.00,    // Closers

  // Below average (offense-first positions)
  'RF': 0.98,
  'LF': 0.95,
  '1B': 0.92,    // Least defensive value
  'DH': 0.88,    // No defensive value

  // Relievers (less innings = less value)
  'RP': 0.85,
  'SP/RP': 0.92,

  // Utility (versatility has value)
  'UTIL': 1.05,
  'BENCH': 0.80,

  // Two-way handled separately
  'TWO-WAY': 1.00,
};

/**
 * Trait tiers and their salary impacts
 * Per spec Section "Trait Salary Modifiers"
 */
export const ELITE_POSITIVE_TRAITS = [
  'Clutch', 'Two Way', 'Utility', 'Durable', 'Composed',
];

export const GOOD_POSITIVE_TRAITS = [
  'Cannon Arm', 'Stealer', 'Magic Hands', 'Dive Wizard', 'K Collector',
  'Rally Stopper', 'RBI Hero', 'Gets Ahead', 'Tough Out', 'First Pitch Slayer', 'Sprinter',
];

export const MINOR_POSITIVE_TRAITS = [
  'Pinch Perfect', 'Base Rounder', 'Stimulated', 'Specialist', 'Reverse Splits',
  'Pick Officer', 'Sign Stealer', 'Mind Gamer', 'Distractor', 'Bad Ball Hitter',
  'Fastball Hitter', 'Off-Speed Hitter', 'Low Pitch', 'High Pitch', 'Inside Pitch',
  'Outside Pitch', 'Metal Head', 'Consistent', 'Rally Starter', 'CON vs LHP',
  'CON vs RHP', 'POW vs LHP', 'POW vs RHP', 'Ace Exterminator', 'Bunter',
  'Big Hack', 'Little Hack', 'Elite 4F', 'Elite 2F', 'Elite CF', 'Elite FK',
  'Elite SL', 'Elite CB', 'Elite CH', 'Elite SB',
];

export const SEVERE_NEGATIVE_TRAITS = [
  'Choker', 'Meltdown', 'Injury Prone', 'Volatile',
];

export const MODERATE_NEGATIVE_TRAITS = [
  'Whiffer', 'Butter Fingers', 'Noodle Arm', 'Wild Thrower', 'BB Prone',
  'Wild Thing', 'Falls Behind', 'K Neglecter', 'Slow Poke',
];

export const MINOR_NEGATIVE_TRAITS = [
  'First Pitch Prayer', 'Bad Jumps', 'Easy Jumps', 'Easy Target',
  'Base Jogger', 'Surrounded', 'RBI Zero', 'Crossed Up',
];

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
 */
export const PITCHER_BATTING_BONUS = {
  ELITE: { threshold: 70, bonus: 1.50 },    // +50%
  GOOD: { threshold: 55, bonus: 1.25 },     // +25%
  COMPETENT: { threshold: 40, bonus: 1.10 }, // +10%
};

/**
 * Two-way player premium
 * Per spec: Combined salaries × 1.25
 */
export const TWO_WAY_PREMIUM = 1.25;

/**
 * Maximum salary in millions
 */
export const MAX_SALARY = 50;

/**
 * Minimum salary in millions
 */
export const MIN_SALARY = 0.5;

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
 * Base draft allocation in millions
 */
export const BASE_DRAFT_ALLOCATION = 5.0;

/**
 * Standings bonus per position in millions
 */
export const STANDINGS_BONUS_PER_POSITION = 0.5;

/**
 * ROI thresholds (WAR per $1M)
 */
export const ROI_THRESHOLDS: Record<ROITier, number> = {
  ELITE_VALUE: 1.0,
  GREAT_VALUE: 0.5,
  GOOD_VALUE: 0.25,
  FAIR_VALUE: 0.15,
  POOR_VALUE: 0.05,
  BUST: 0,
};

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
  const baseSalary = Math.pow(weightedRating / 100, 2.5) * MAX_SALARY;
  return Math.round(baseSalary * 10) / 10;
}

/**
 * Calculate base salary for a position player
 */
export function calculatePositionPlayerBaseSalary(ratings: BatterRatings): number {
  const weightedRating = getUnifiedBattingRating(ratings);
  return ratingsToBaseSalary(weightedRating);
}

/**
 * Calculate base salary for a pitcher
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

// ============================================
// COMPLETE SALARY CALCULATION
// ============================================

/**
 * Calculate complete salary with breakdown
 * Per spec: Base × Position × Traits × Age × Performance × Fame × Personality
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
  dhContext?: DHContext
): SalaryBreakdown {
  // 1. Base salary from ratings (DH-aware for pitchers)
  const baseSalary = calculateBaseRatingSalary(player, dhContext);

  // 2. Position multiplier
  const positionMultiplier = getPositionMultiplier(player.primaryPosition);
  const afterPosition = baseSalary * positionMultiplier;

  // 3. Trait modifier
  const traitModifier = calculateTraitModifier(player.traits);
  const afterTraits = afterPosition * traitModifier;

  // 4. Age factor
  const ageFactor = calculateAgeFactor(player.age);
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

  // Final salary with minimum
  const finalSalary = Math.max(MIN_SALARY, Math.round(afterPersonality * 10) / 10);

  return {
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
  dhContext?: DHContext
): number {
  return calculateSalaryWithBreakdown(player, seasonStats, expectations, isNewTeam, dhContext).finalSalary;
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
  const scaleFactor = gamesPerSeason / 162;

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

/**
 * Get percentile of a value within an array
 */
function getPercentile(value: number, sortedArray: number[]): number {
  if (sortedArray.length === 0) return 0.5;

  let count = 0;
  for (const v of sortedArray) {
    if (v <= value) count++;
    else break;
  }

  return count / sortedArray.length;
}

/**
 * Get value at a percentile within an array
 */
function getValueAtPercentile(percentile: number, sortedArray: number[]): number {
  if (sortedArray.length === 0) return 0;

  const index = Math.min(
    Math.floor(percentile * sortedArray.length),
    sortedArray.length - 1
  );

  return sortedArray[index];
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
  'UTIL': ['UTIL', 'BENCH'],
  'BENCH': ['BENCH', 'UTIL'],
};

/**
 * Get peer pool for a position
 */
function getPositionPeerPool(
  position: PlayerPosition,
  allPlayers: LeagueContext['allPlayers']
): LeagueContext['allPlayers'] {
  const MIN_POOL_SIZE = 6;

  // Direct position matches
  let pool = allPlayers.filter(p => p.detectedPosition === position);

  // Merge with similar positions if pool too small
  if (pool.length < MIN_POOL_SIZE) {
    const mergeGroup = POSITION_MERGE_GROUPS[position];
    if (mergeGroup) {
      pool = allPlayers.filter(p => mergeGroup.includes(p.detectedPosition));
    }
  }

  // If still too small, return all players
  if (pool.length < MIN_POOL_SIZE) {
    return allPlayers;
  }

  return pool;
}

/**
 * Calculate True Value (position-relative percentile approach)
 * Per spec Section "True Value Calculation"
 */
export function calculateTrueValue(
  player: { salary: number; seasonWAR: number; detectedPosition: PlayerPosition },
  leagueContext: LeagueContext
): TrueValueResult {
  const position = player.detectedPosition;
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

  // Calculate simple ROI for backward compatibility
  const roiWARPerMillion = player.salary > 0 ? actualWAR / player.salary : 0;

  let roiTier: ROITier;
  if (roiWARPerMillion >= ROI_THRESHOLDS.ELITE_VALUE) roiTier = 'ELITE_VALUE';
  else if (roiWARPerMillion >= ROI_THRESHOLDS.GREAT_VALUE) roiTier = 'GREAT_VALUE';
  else if (roiWARPerMillion >= ROI_THRESHOLDS.GOOD_VALUE) roiTier = 'GOOD_VALUE';
  else if (roiWARPerMillion >= ROI_THRESHOLDS.FAIR_VALUE) roiTier = 'FAIR_VALUE';
  else if (roiWARPerMillion >= ROI_THRESHOLDS.POOR_VALUE) roiTier = 'POOR_VALUE';
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
    roiWARPerMillion: Math.round(roiWARPerMillion * 1000) / 1000,
    roiTier,
    valueRating,
  };
}

/**
 * Simple ROI calculation (for backward compatibility)
 */
export function calculateSimpleROI(salary: number, war: number): {
  roiWARPerMillion: number;
  roiTier: ROITier;
  valueRating: number;
} {
  const roiWARPerMillion = salary > 0 ? war / salary : 0;

  let roiTier: ROITier;
  if (roiWARPerMillion >= ROI_THRESHOLDS.ELITE_VALUE) roiTier = 'ELITE_VALUE';
  else if (roiWARPerMillion >= ROI_THRESHOLDS.GREAT_VALUE) roiTier = 'GREAT_VALUE';
  else if (roiWARPerMillion >= ROI_THRESHOLDS.GOOD_VALUE) roiTier = 'GOOD_VALUE';
  else if (roiWARPerMillion >= ROI_THRESHOLDS.FAIR_VALUE) roiTier = 'FAIR_VALUE';
  else if (roiWARPerMillion >= ROI_THRESHOLDS.POOR_VALUE) roiTier = 'POOR_VALUE';
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
    roiWARPerMillion: Math.round(roiWARPerMillion * 1000) / 1000,
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
      reason: `Total salary $${totalIncomingSalary.toFixed(1)}M outside range $${salaryRange.min.toFixed(1)}M - $${salaryRange.max.toFixed(1)}M`,
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
    change: Math.round((newSalary - previousSalary) * 10) / 10,
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

  const salaryFactor = salary / 20;
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
  if (salary >= 1) {
    return `$${salary.toFixed(1)}M`;
  }
  return `$${(salary * 1000).toFixed(0)}K`;
}

export function formatSalaryChange(change: number): string {
  const sign = change >= 0 ? '+' : '';
  return `${sign}$${change.toFixed(1)}M`;
}

export function getSalaryTier(salary: number): string {
  if (salary >= 40) return 'Superstar Contract';
  if (salary >= 30) return 'All-Star Contract';
  if (salary >= 20) return 'Premium Contract';
  if (salary >= 10) return 'Solid Contract';
  if (salary >= 5) return 'Moderate Contract';
  if (salary >= 2) return 'Budget Contract';
  return 'Minimum Contract';
}

export function getSalaryColor(salary: number): string {
  if (salary >= 40) return '#a855f7';
  if (salary >= 30) return '#f59e0b';
  if (salary >= 20) return '#22c55e';
  if (salary >= 10) return '#3b82f6';
  if (salary >= 5) return '#6b7280';
  return '#9ca3af';
}

export function getRatingSalaryScale(): Array<{ rating: string; salary: string }> {
  return [
    { rating: '95+', salary: '$45-50M' },
    { rating: '90-94', salary: '$35-44M' },
    { rating: '85-89', salary: '$25-34M' },
    { rating: '80-84', salary: '$18-24M' },
    { rating: '75-79', salary: '$12-17M' },
    { rating: '70-74', salary: '$8-11M' },
    { rating: '65-69', salary: '$5-7M' },
    { rating: '60-64', salary: '$3-4M' },
    { rating: '55-59', salary: '$2-3M' },
    { rating: '50-54', salary: '$1-2M' },
    { rating: '<50', salary: '$0.5-1M' },
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
