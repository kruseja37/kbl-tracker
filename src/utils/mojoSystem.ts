/**
 * Mojo & Fitness System
 * Per SMB4_GAME_REFERENCE.md and FEATURES_ROADMAP.md
 *
 * Mojo is a fluctuating mood stat that affects performance.
 * Fitness represents physical condition.
 *
 * Key insight: "It's more impressive when players do well when ratings are down
 * and less impressive when they have temporary ratings boosts"
 */

// ============================================
// TYPES
// ============================================

/**
 * Mojo levels from SMB4
 * Scale: -3 to +3 (mapped to named levels)
 */
export type MojoLevel = -3 | -2 | -1 | 0 | 1 | 2 | 3;

/**
 * Named mojo states (for display)
 */
export type MojoState =
  | 'Rattled'    // -3: Sustained failure, significant penalties
  | 'Tense'      // -2: Struggling
  | 'Nervous'    // -1: Slightly off
  | 'Normal'     //  0: Default starting state
  | 'Locked In'  // +1: Having a good day
  | 'On Fire'    // +2: Sustained excellence
  | 'Jacked';    // +3: Peak performance, rarely achieved

/**
 * Fitness levels from SMB4
 * Ordered from worst to best
 */
export type FitnessLevel =
  | 'Hurt'      // Injured, significant penalties
  | 'Weak'      // Recovering from injury
  | 'Strained'  // Minor issue, slight penalties
  | 'Well'      // Normal/healthy
  | 'Fit'       // In good shape, slight bonuses
  | 'Juiced';   // Peak physical condition

/**
 * Player's current mojo and fitness state
 */
export interface PlayerCondition {
  playerId: string;
  playerName: string;
  teamId: string;
  mojo: MojoLevel;
  fitness: FitnessLevel;
  lastUpdated: number;
  // Tracking for narrative
  gamesAtCurrentMojo: number;
  consecutiveGamesWithoutNegativeMojo: number;
}

/**
 * Multipliers applied to stats/fame based on condition
 */
export interface ConditionMultipliers {
  fame: number;           // Multiplier for Fame earned
  war: number;            // Multiplier for WAR credit
  battingRating: number;  // In-game rating modifier
  pitchingRating: number; // In-game rating modifier
  fieldingRating: number; // In-game rating modifier
}

// ============================================
// CONSTANTS
// ============================================

/**
 * Map mojo level to named state
 */
export const MOJO_LEVEL_TO_STATE: Record<MojoLevel, MojoState> = {
  [-3]: 'Rattled',
  [-2]: 'Tense',
  [-1]: 'Nervous',
  [0]: 'Normal',
  [1]: 'Locked In',
  [2]: 'On Fire',
  [3]: 'Jacked',
};

/**
 * Map named state to mojo level
 */
export const MOJO_STATE_TO_LEVEL: Record<MojoState, MojoLevel> = {
  'Rattled': -3,
  'Tense': -2,
  'Nervous': -1,
  'Normal': 0,
  'Locked In': 1,
  'On Fire': 2,
  'Jacked': 3,
};

/**
 * Fitness level order (for comparisons)
 */
export const FITNESS_ORDER: FitnessLevel[] = [
  'Hurt', 'Weak', 'Strained', 'Well', 'Fit', 'Juiced'
];

/**
 * Get numeric value for fitness (for calculations)
 * -2 = Hurt, -1 = Weak, 0 = Strained, 1 = Well, 2 = Fit, 3 = Juiced
 */
export function getFitnessValue(fitness: FitnessLevel): number {
  return FITNESS_ORDER.indexOf(fitness) - 2;
}

// ============================================
// PERFORMANCE MULTIPLIERS
// ============================================

/**
 * Get Fame/WAR multiplier based on mojo level
 *
 * Philosophy: Performing well with negative mojo is MORE impressive,
 * performing well with positive mojo is LESS impressive (easier conditions)
 *
 * The multiplier adjusts how much credit a player gets for their performance.
 */
export function getMojoFameMultiplier(mojo: MojoLevel): number {
  switch (mojo) {
    case -3: return 1.20;  // +20% credit for overcoming severe adversity
    case -2: return 1.15;  // +15% credit for overcoming adversity
    case -1: return 1.07;  // +7% credit for slight disadvantage
    case 0:  return 1.00;  // Baseline
    case 1:  return 0.97;  // -3% credit for slight advantage
    case 2:  return 0.93;  // -7% credit for significant advantage
    case 3:  return 0.88;  // -12% credit for "easy mode"
  }
}

/**
 * Get WAR multiplier based on mojo level
 * Similar to Fame but slightly more conservative
 */
export function getMojoWARMultiplier(mojo: MojoLevel): number {
  switch (mojo) {
    case -3: return 1.15;  // +15% WAR credit
    case -2: return 1.10;  // +10% WAR credit
    case -1: return 1.05;  // +5% WAR credit
    case 0:  return 1.00;  // Baseline
    case 1:  return 0.97;  // -3% WAR credit
    case 2:  return 0.95;  // -5% WAR credit
    case 3:  return 0.92;  // -8% WAR credit
  }
}

/**
 * Get Fame multiplier based on fitness level
 *
 * Similar philosophy: performing well while hurt is impressive
 */
export function getFitnessFameMultiplier(fitness: FitnessLevel): number {
  switch (fitness) {
    case 'Hurt':     return 1.25;  // +25% credit for playing through injury
    case 'Weak':     return 1.15;  // +15% credit
    case 'Strained': return 1.07;  // +7% credit
    case 'Well':     return 1.00;  // Baseline
    case 'Fit':      return 0.97;  // -3% credit
    case 'Juiced':   return 0.93;  // -7% credit for peak condition
  }
}

/**
 * Get WAR multiplier based on fitness level
 */
export function getFitnessWARMultiplier(fitness: FitnessLevel): number {
  switch (fitness) {
    case 'Hurt':     return 1.20;  // +20% WAR credit
    case 'Weak':     return 1.12;  // +12% WAR credit
    case 'Strained': return 1.05;  // +5% WAR credit
    case 'Well':     return 1.00;  // Baseline
    case 'Fit':      return 0.98;  // -2% WAR credit
    case 'Juiced':   return 0.95;  // -5% WAR credit
  }
}

/**
 * Get combined multipliers for a player's condition
 */
export function getConditionMultipliers(
  mojo: MojoLevel,
  fitness: FitnessLevel
): ConditionMultipliers {
  const mojoFame = getMojoFameMultiplier(mojo);
  const fitnessFame = getFitnessFameMultiplier(fitness);
  const mojoWAR = getMojoWARMultiplier(mojo);
  const fitnessWAR = getFitnessWARMultiplier(fitness);

  // Combine multipliers (multiplicative, not additive)
  // E.g., -3 mojo (1.20) + Hurt (1.25) = 1.50 fame multiplier
  const fameMultiplier = mojoFame * fitnessFame;
  const warMultiplier = mojoWAR * fitnessWAR;

  // In-game rating modifiers (these affect actual gameplay)
  // Per SMB4: each mojo level = roughly ±5% to ratings
  const mojoRatingMod = 1 + (mojo * 0.05);  // -15% to +15%

  // Fitness affects stamina/performance ceiling
  const fitnessRatingMod = getFitnessRatingMultiplier(fitness);

  return {
    fame: fameMultiplier,
    war: warMultiplier,
    battingRating: mojoRatingMod * fitnessRatingMod,
    pitchingRating: mojoRatingMod * fitnessRatingMod,
    fieldingRating: mojoRatingMod * fitnessRatingMod,
  };
}

/**
 * Get in-game rating multiplier for fitness
 */
function getFitnessRatingMultiplier(fitness: FitnessLevel): number {
  switch (fitness) {
    case 'Hurt':     return 0.75;  // -25% to all ratings
    case 'Weak':     return 0.85;  // -15% to all ratings
    case 'Strained': return 0.93;  // -7% to all ratings
    case 'Well':     return 1.00;  // Baseline
    case 'Fit':      return 1.03;  // +3% to all ratings
    case 'Juiced':   return 1.07;  // +7% to all ratings
  }
}

// ============================================
// CONDITION UTILITIES
// ============================================

/**
 * Create a default player condition (Normal mojo, Well fitness)
 */
export function createDefaultCondition(
  playerId: string,
  playerName: string,
  teamId: string
): PlayerCondition {
  return {
    playerId,
    playerName,
    teamId,
    mojo: 0,
    fitness: 'Well',
    lastUpdated: Date.now(),
    gamesAtCurrentMojo: 0,
    consecutiveGamesWithoutNegativeMojo: 0,
  };
}

/**
 * Update mojo level, clamping to valid range
 */
export function adjustMojo(current: MojoLevel, delta: number): MojoLevel {
  const newLevel = Math.max(-3, Math.min(3, current + delta));
  return newLevel as MojoLevel;
}

/**
 * Check if mojo is positive (advantage)
 */
export function isPositiveMojo(mojo: MojoLevel): boolean {
  return mojo > 0;
}

/**
 * Check if mojo is negative (disadvantage)
 */
export function isNegativeMojo(mojo: MojoLevel): boolean {
  return mojo < 0;
}

/**
 * Check if fitness is poor (disadvantage)
 */
export function isPoorFitness(fitness: FitnessLevel): boolean {
  return fitness === 'Hurt' || fitness === 'Weak' || fitness === 'Strained';
}

/**
 * Check if fitness is good (advantage)
 */
export function isGoodFitness(fitness: FitnessLevel): boolean {
  return fitness === 'Fit' || fitness === 'Juiced';
}

/**
 * Get display color for mojo state
 */
export function getMojoColor(mojo: MojoLevel): string {
  if (mojo <= -2) return '#ef4444';  // Red - struggling
  if (mojo === -1) return '#f97316'; // Orange - slightly off
  if (mojo === 0) return '#6b7280';  // Gray - normal
  if (mojo === 1) return '#22c55e';  // Green - good
  if (mojo === 2) return '#3b82f6';  // Blue - great
  return '#a855f7';                   // Purple - exceptional
}

/**
 * Get display color for fitness state
 */
export function getFitnessColor(fitness: FitnessLevel): string {
  switch (fitness) {
    case 'Hurt':     return '#dc2626';  // Red
    case 'Weak':     return '#f97316';  // Orange
    case 'Strained': return '#eab308';  // Yellow
    case 'Well':     return '#6b7280';  // Gray
    case 'Fit':      return '#22c55e';  // Green
    case 'Juiced':   return '#3b82f6';  // Blue
  }
}

// ============================================
// MOJO CHANGE TRIGGERS
// ============================================

/**
 * Events that can trigger mojo changes
 */
export type MojoTrigger =
  // Positive triggers (batters)
  | 'hit_single'
  | 'hit_double'
  | 'hit_triple'
  | 'hit_homerun'
  | 'stolen_base'
  | 'walk'
  | 'rbi'
  // Negative triggers (batters)
  | 'strikeout'
  | 'ground_out'
  | 'fly_out'
  | 'caught_stealing'
  | 'gidp'
  // Positive triggers (pitchers)
  | 'strikeout_pitcher'
  | 'ground_out_pitcher'
  | 'fly_out_pitcher'
  | 'inning_ended'
  // Negative triggers (pitchers)
  | 'hit_allowed'
  | 'walk_allowed'
  | 'run_allowed'
  | 'home_run_allowed'
  // Fielding
  | 'error_committed'
  | 'great_play';

/**
 * Get mojo delta for a trigger event
 * Returns the change in mojo level
 */
export function getMojoDelta(trigger: MojoTrigger): number {
  const deltas: Record<MojoTrigger, number> = {
    // Batter positive
    'hit_single': 0.3,
    'hit_double': 0.5,
    'hit_triple': 0.7,
    'hit_homerun': 1.0,
    'stolen_base': 0.4,
    'walk': 0.2,
    'rbi': 0.2,

    // Batter negative
    'strikeout': -0.5,
    'ground_out': -0.2,
    'fly_out': -0.2,
    'caught_stealing': -0.6,
    'gidp': -0.7,

    // Pitcher positive
    'strikeout_pitcher': 0.4,
    'ground_out_pitcher': 0.2,
    'fly_out_pitcher': 0.2,
    'inning_ended': 0.3,

    // Pitcher negative
    'hit_allowed': -0.3,
    'walk_allowed': -0.3,
    'run_allowed': -0.5,
    'home_run_allowed': -0.8,

    // Fielding
    'error_committed': -0.7,
    'great_play': 0.5,
  };

  return deltas[trigger];
}

/**
 * Calculate cumulative mojo change from multiple events
 * Applies diminishing returns for multiple same-type events
 */
export function calculateCumulativeMojoChange(
  triggers: MojoTrigger[]
): number {
  let totalDelta = 0;
  const triggerCounts: Map<MojoTrigger, number> = new Map();

  for (const trigger of triggers) {
    const count = (triggerCounts.get(trigger) || 0) + 1;
    triggerCounts.set(trigger, count);

    // Diminishing returns: 100%, 70%, 50%, 35%, etc.
    const diminishingFactor = Math.pow(0.7, count - 1);
    totalDelta += getMojoDelta(trigger) * diminishingFactor;
  }

  return totalDelta;
}

// ============================================
// PRESSURE SITUATION MULTIPLIERS
// ============================================

/**
 * Pressure situations amplify mojo effects
 */
export interface PressureSituation {
  isCloseGame: boolean;      // Within 2 runs
  isLateInning: boolean;     // 7th inning or later
  hasRunnersInScoringPosition: boolean;
  isTieGame: boolean;
  isWalkOffOpportunity: boolean;
}

/**
 * Get pressure multiplier for mojo effects
 * High pressure = mojo matters more
 */
export function getPressureMultiplier(situation: PressureSituation): number {
  let multiplier = 1.0;

  if (situation.isCloseGame) multiplier += 0.15;
  if (situation.isLateInning) multiplier += 0.10;
  if (situation.hasRunnersInScoringPosition) multiplier += 0.10;
  if (situation.isTieGame) multiplier += 0.15;
  if (situation.isWalkOffOpportunity) multiplier += 0.25;

  return multiplier;
}

/**
 * Apply pressure to a mojo delta
 */
export function applyPressureToMojoDelta(
  baseDelta: number,
  situation: PressureSituation
): number {
  const pressureMultiplier = getPressureMultiplier(situation);
  return baseDelta * pressureMultiplier;
}

// ============================================
// FAME/WAR ADJUSTMENT FUNCTIONS
// ============================================

/**
 * Adjust a Fame value based on player condition
 * Call this when awarding Fame to apply mojo/fitness weighting
 */
export function adjustFameForCondition(
  baseFame: number,
  mojo: MojoLevel,
  fitness: FitnessLevel
): number {
  const multipliers = getConditionMultipliers(mojo, fitness);
  return baseFame * multipliers.fame;
}

/**
 * Adjust a WAR value based on player condition
 * Call this when calculating WAR to apply mojo/fitness weighting
 */
export function adjustWARForCondition(
  baseWAR: number,
  mojo: MojoLevel,
  fitness: FitnessLevel
): number {
  const multipliers = getConditionMultipliers(mojo, fitness);
  return baseWAR * multipliers.war;
}

/**
 * Get a human-readable description of the condition effect
 */
export function getConditionEffectDescription(
  mojo: MojoLevel,
  fitness: FitnessLevel
): string {
  const multipliers = getConditionMultipliers(mojo, fitness);
  const famePercent = Math.round((multipliers.fame - 1) * 100);
  const warPercent = Math.round((multipliers.war - 1) * 100);

  const mojoState = MOJO_LEVEL_TO_STATE[mojo];
  const parts: string[] = [];

  if (famePercent !== 0) {
    const sign = famePercent > 0 ? '+' : '';
    parts.push(`${sign}${famePercent}% Fame`);
  }

  if (warPercent !== 0) {
    const sign = warPercent > 0 ? '+' : '';
    parts.push(`${sign}${warPercent}% WAR`);
  }

  if (parts.length === 0) {
    return `${mojoState}, ${fitness} - No adjustment`;
  }

  return `${mojoState}, ${fitness} - ${parts.join(', ')}`;
}

// ============================================
// LEVERAGE INDEX (LI) SYSTEM
// Per LEVERAGE_INDEX_SPEC.md
// ============================================

/**
 * Game state required for LI calculation
 */
export interface LeverageGameState {
  inning: number;
  halfInning: 'TOP' | 'BOTTOM';
  outs: 0 | 1 | 2;
  runners: {
    first: boolean;
    second: boolean;
    third: boolean;
  };
  homeScore: number;
  awayScore: number;
  totalInnings?: number;  // Default 9, but SMB4 can be shorter
}

/**
 * Base-Out Leverage Index lookup table
 * Per LEVERAGE_INDEX_SPEC.md Section 5
 * Index: [baseState (0-7)][outs (0-2)]
 */
export const BASE_OUT_LI: readonly (readonly number[])[] = [
  // 0 outs, 1 out, 2 outs
  [0.86, 0.90, 0.93],  // Empty (0)
  [1.07, 1.10, 1.24],  // 1st (1)
  [1.15, 1.40, 1.56],  // 2nd (2)
  [1.35, 1.55, 1.93],  // 1st+2nd (3)
  [1.08, 1.65, 1.88],  // 3rd (4)
  [1.32, 1.85, 2.25],  // 1st+3rd (5)
  [1.45, 2.10, 2.50],  // 2nd+3rd (6)
  [1.60, 2.25, 2.67]   // Loaded (7)
] as const;

/**
 * Encode base runners to state index (0-7)
 */
export function encodeBaseState(runners: { first: boolean; second: boolean; third: boolean }): number {
  let state = 0;
  if (runners.first) state += 1;
  if (runners.second) state += 2;
  if (runners.third) state += 4;
  return state;
}

/**
 * Decode base state index to runner positions
 */
export function decodeBaseState(state: number): { first: boolean; second: boolean; third: boolean } {
  return {
    first: (state & 1) !== 0,
    second: (state & 2) !== 0,
    third: (state & 4) !== 0,
  };
}

/**
 * Get inning multiplier for LI calculation
 * Late innings have higher leverage
 */
export function getInningMultiplier(
  inning: number,
  halfInning: 'TOP' | 'BOTTOM',
  totalInnings: number = 9
): number {
  // Scale based on game progress for variable-length games (SMB4 can be 5-9 innings)
  const gameProgress = inning / totalInnings;

  let mult: number;
  if (gameProgress < 0.33) {
    mult = 0.75;  // Early game
  } else if (gameProgress < 0.55) {
    mult = 0.9;   // Early-mid game
  } else if (gameProgress < 0.78) {
    mult = 1.1;   // Mid-late game
  } else if (gameProgress < 0.9) {
    mult = 1.4;   // Late game
  } else {
    mult = 1.8;   // Final inning
  }

  // Walk-off potential: bottom of final inning or later
  if (inning >= totalInnings && halfInning === 'BOTTOM') {
    mult *= 1.4;
  }

  return mult;
}

/**
 * Get score differential dampener
 * Blowouts significantly reduce leverage
 */
export function getScoreDampener(scoreDiff: number, inning: number, totalInnings: number = 9): number {
  const absDiff = Math.abs(scoreDiff);

  // Blowouts reduce leverage significantly
  if (absDiff >= 7) return 0.1;
  if (absDiff >= 5) return 0.25;
  if (absDiff >= 4) return 0.4;

  // Close games have near-full leverage
  if (absDiff === 0) return 1.0;  // Tie game - max leverage
  if (absDiff === 1) return 0.95;
  if (absDiff === 2) return 0.85;

  // 3-run game: slightly reduced but increases as game progresses
  if (absDiff === 3) {
    return 0.6 + (0.2 * Math.min(inning, totalInnings) / totalInnings);
  }

  return 0.5;
}

/**
 * Calculate Leverage Index for a game state
 * LI measures how critical the current moment is.
 *
 * LI Scale:
 * - 0.0-0.85: Low (blowout, early innings) ~60% of PAs
 * - 0.85-2.0: Medium (competitive game) ~30% of PAs
 * - 2.0-5.0: High (critical moment) ~9% of PAs
 * - 5.0+: Extreme (game on the line) ~1% of PAs
 */
export function calculateLeverageIndex(gameState: LeverageGameState): number {
  const {
    inning,
    halfInning,
    outs,
    runners,
    homeScore,
    awayScore,
    totalInnings = 9
  } = gameState;

  // 1. Get base-out LI component
  const baseState = encodeBaseState(runners);
  const boLI = BASE_OUT_LI[baseState][outs];

  // 2. Apply inning multiplier
  const inningMult = getInningMultiplier(inning, halfInning, totalInnings);

  // 3. Calculate score differential from batting team's perspective
  // TOP inning = away team batting, BOTTOM = home team batting
  const scoreDiff = halfInning === 'TOP'
    ? awayScore - homeScore
    : homeScore - awayScore;

  // 4. Apply score dampener
  const scoreDamp = getScoreDampener(scoreDiff, inning, totalInnings);

  // 5. Calculate final LI and clamp to reasonable range
  const rawLI = boLI * inningMult * scoreDamp;
  return Math.max(0.1, Math.min(10.0, rawLI));
}

/**
 * LI thresholds for categorization
 */
export const LI_THRESHOLDS = {
  LOW: 0.85,        // Below this = low leverage
  MEDIUM: 1.5,      // Clutch situation threshold
  HIGH: 2.5,        // High stakes
  EXTREME: 5.0,     // Game on the line
} as const;

/**
 * Check if current LI represents a clutch situation
 */
export function isClutchSituation(li: number): boolean {
  return li >= LI_THRESHOLDS.MEDIUM;
}

/**
 * Check if current LI is high leverage
 */
export function isHighLeverageSituation(li: number): boolean {
  return li >= LI_THRESHOLDS.HIGH;
}

/**
 * Check if current LI is extreme leverage
 */
export function isExtremeLeverageSituation(li: number): boolean {
  return li >= LI_THRESHOLDS.EXTREME;
}

/**
 * Get LI category name
 */
export function getLeverageCategory(li: number): 'Low' | 'Medium' | 'High' | 'Extreme' {
  if (li < LI_THRESHOLDS.LOW) return 'Low';
  if (li < LI_THRESHOLDS.HIGH) return 'Medium';
  if (li < LI_THRESHOLDS.EXTREME) return 'High';
  return 'Extreme';
}

/**
 * Get LI display color
 */
export function getLeverageColor(li: number): string {
  if (li < LI_THRESHOLDS.LOW) return '#6b7280';     // Gray - low leverage
  if (li < LI_THRESHOLDS.MEDIUM) return '#22c55e';  // Green - medium
  if (li < LI_THRESHOLDS.HIGH) return '#eab308';    // Yellow - high
  if (li < LI_THRESHOLDS.EXTREME) return '#f97316'; // Orange - very high
  return '#ef4444';                                  // Red - extreme
}

// ============================================
// COMBINED PERFORMANCE WEIGHTING
// Mojo + Fitness + Leverage Index
// ============================================

/**
 * Combined performance context for full weighting
 */
export interface PerformanceContext {
  mojo: MojoLevel;
  fitness: FitnessLevel;
  leverageIndex: number;
}

/**
 * Full multipliers including LI
 */
export interface FullPerformanceMultipliers extends ConditionMultipliers {
  leverageFame: number;   // LI multiplier for Fame
  leverageWAR: number;    // LI multiplier for WAR
  combinedFame: number;   // Mojo × Fitness × LI for Fame
  combinedWAR: number;    // Mojo × Fitness × LI for WAR
}

/**
 * Get LI multiplier for Fame
 * Uses sqrt scaling so extreme LI doesn't dominate
 *
 * Per spec: clutchValue = baseValue × sqrt(LI)
 */
export function getLeverageFameMultiplier(li: number): number {
  // sqrt scaling provides diminishing returns at high LI
  // LI=1.0 → 1.0, LI=4.0 → 2.0, LI=9.0 → 3.0
  return Math.sqrt(li);
}

/**
 * Get LI multiplier for WAR
 * More conservative than Fame - WAR uses direct scaling with dampening
 *
 * Per PWAR_CALCULATION_SPEC.md: liMultiplier = (avgLI + 1) / 2
 * For per-event: we use a similar dampened approach
 */
export function getLeverageWARMultiplier(li: number): number {
  // Dampened scaling: LI=1.0 → 1.0, LI=2.0 → 1.25, LI=4.0 → 1.5
  return (li + 1) / 2;
}

/**
 * Get complete performance multipliers including LI
 *
 * Philosophy:
 * - Mojo/Fitness: Performing well when disadvantaged (negative mojo, hurt) = MORE credit
 * - Leverage Index: Performing well in high-leverage situations = MORE credit
 *
 * Combined effect example:
 * - Negative mojo (-3) = 1.20× Fame
 * - Hurt fitness = 1.25× Fame
 * - High LI (4.0) = 2.0× Fame (sqrt scaling)
 * - Combined: 1.20 × 1.25 × 2.0 = 3.0× Fame for clutch performance while struggling
 */
export function getFullPerformanceMultipliers(context: PerformanceContext): FullPerformanceMultipliers {
  const { mojo, fitness, leverageIndex } = context;

  // Get base condition multipliers
  const conditionMults = getConditionMultipliers(mojo, fitness);

  // Get LI multipliers
  const leverageFame = getLeverageFameMultiplier(leverageIndex);
  const leverageWAR = getLeverageWARMultiplier(leverageIndex);

  // Calculate combined multipliers
  const combinedFame = conditionMults.fame * leverageFame;
  const combinedWAR = conditionMults.war * leverageWAR;

  return {
    ...conditionMults,
    leverageFame,
    leverageWAR,
    combinedFame,
    combinedWAR,
  };
}

/**
 * Adjust Fame value with full performance context (Mojo + Fitness + LI)
 *
 * @param baseFame - The base Fame value for the event
 * @param context - Player's current condition and game leverage
 * @returns Adjusted Fame value
 */
export function adjustFameWithLeverage(
  baseFame: number,
  context: PerformanceContext
): number {
  const multipliers = getFullPerformanceMultipliers(context);
  return baseFame * multipliers.combinedFame;
}

/**
 * Adjust WAR value with full performance context (Mojo + Fitness + LI)
 *
 * @param baseWAR - The base WAR value
 * @param context - Player's current condition and game leverage
 * @returns Adjusted WAR value
 */
export function adjustWARWithLeverage(
  baseWAR: number,
  context: PerformanceContext
): number {
  const multipliers = getFullPerformanceMultipliers(context);
  return baseWAR * multipliers.combinedWAR;
}

/**
 * Calculate clutch value for an event per LEVERAGE_INDEX_SPEC.md
 *
 * @param baseClutchValue - Base clutch value (+1.0 for go-ahead RBI, -2.0 for bases loaded K, etc.)
 * @param leverageIndex - Current LI
 * @returns Weighted clutch value
 */
export function calculateClutchValue(baseClutchValue: number, leverageIndex: number): number {
  // Per spec: clutchValue = baseValue × sqrt(LI)
  return baseClutchValue * Math.sqrt(leverageIndex);
}

/**
 * Get a human-readable description of the full performance effect
 */
export function getFullPerformanceDescription(context: PerformanceContext): string {
  const { mojo, fitness, leverageIndex } = context;
  const multipliers = getFullPerformanceMultipliers(context);

  const mojoState = MOJO_LEVEL_TO_STATE[mojo];
  const liCategory = getLeverageCategory(leverageIndex);

  const famePercent = Math.round((multipliers.combinedFame - 1) * 100);
  const warPercent = Math.round((multipliers.combinedWAR - 1) * 100);

  const fameSign = famePercent >= 0 ? '+' : '';
  const warSign = warPercent >= 0 ? '+' : '';

  return `${mojoState}, ${fitness}, ${liCategory} LI (${leverageIndex.toFixed(2)}) → ` +
    `${fameSign}${famePercent}% Fame, ${warSign}${warPercent}% WAR`;
}

// ============================================
// RELIEVER LEVERAGE TRACKING
// Per PWAR_CALCULATION_SPEC.md
// ============================================

/**
 * Track cumulative LI for a player (especially relievers for pWAR)
 */
export interface PlayerLeverageStats {
  playerId: string;
  totalLI: number;          // Sum of all LI encountered
  appearances: number;      // Number of appearances/PAs
  gmLI: number;             // Average LI (totalLI / appearances)
  highLeverageAppearances: number;  // Count of LI >= 2.5
  clutchMoments: number;    // Count of LI >= 1.5
}

/**
 * Calculate gmLI (game-average Leverage Index) for a player
 * Used in pWAR calculation for relievers
 */
export function calculateGmLI(totalLI: number, appearances: number): number {
  if (appearances === 0) return 1.0;
  return totalLI / appearances;
}

/**
 * Get pWAR leverage multiplier from gmLI
 * Per PWAR_CALCULATION_SPEC.md: liMultiplier = (gmLI + 1) / 2
 */
export function getPWARLeverageMultiplier(gmLI: number): number {
  return (gmLI + 1) / 2;
}

/**
 * Create empty leverage stats for a player
 */
export function createEmptyLeverageStats(playerId: string): PlayerLeverageStats {
  return {
    playerId,
    totalLI: 0,
    appearances: 0,
    gmLI: 1.0,
    highLeverageAppearances: 0,
    clutchMoments: 0,
  };
}

/**
 * Update leverage stats with a new appearance
 */
export function updateLeverageStats(
  stats: PlayerLeverageStats,
  leverageIndex: number
): PlayerLeverageStats {
  const newTotalLI = stats.totalLI + leverageIndex;
  const newAppearances = stats.appearances + 1;

  return {
    ...stats,
    totalLI: newTotalLI,
    appearances: newAppearances,
    gmLI: calculateGmLI(newTotalLI, newAppearances),
    highLeverageAppearances: stats.highLeverageAppearances + (leverageIndex >= LI_THRESHOLDS.HIGH ? 1 : 0),
    clutchMoments: stats.clutchMoments + (leverageIndex >= LI_THRESHOLDS.MEDIUM ? 1 : 0),
  };
}
