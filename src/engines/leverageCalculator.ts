/**
 * Leverage Index Calculator
 * Per LEVERAGE_INDEX_SPEC.md
 *
 * Leverage Index (LI) measures the potential swing in win probability at any game state.
 * - LI = 1.0: Average situation
 * - LI > 1.0: Above-average leverage (clutch situation)
 * - LI < 1.0: Below-average leverage (low-stakes situation)
 *
 * Used for:
 * - Clutch/Choke scoring (weighted by LI)
 * - Reliever pWAR (gmLI multiplier)
 * - Net Clutch Rating calculation
 */

// ============================================
// TYPES
// ============================================

/**
 * Base state encoding (0-7)
 * Uses bitwise representation: 1st=1, 2nd=2, 3rd=4
 */
export const BaseState = {
  EMPTY: 0,        // ___
  FIRST: 1,        // 1__
  SECOND: 2,       // _2_
  FIRST_SECOND: 3, // 12_
  THIRD: 4,        // __3
  FIRST_THIRD: 5,  // 1_3
  SECOND_THIRD: 6, // _23
  LOADED: 7,       // 123
} as const;

export type BaseState = typeof BaseState[keyof typeof BaseState];

/**
 * Runner state on bases
 */
export interface RunnersOnBase {
  first: boolean;
  second: boolean;
  third: boolean;
}

/**
 * Complete game state for LI calculation
 */
export interface GameStateForLI {
  inning: number;
  halfInning: 'TOP' | 'BOTTOM';
  outs: 0 | 1 | 2;
  runners: RunnersOnBase;
  homeScore: number;
  awayScore: number;
  totalInnings?: number;  // Defaults to 9
}

/**
 * LI calculation configuration
 */
export interface LIConfig {
  totalInnings: number;
  enableRevengeArcModifier?: boolean;
  enableRomanticMatchupModifier?: boolean;
  enableFamilyHomeModifier?: boolean;
}

/**
 * Complete LI result with breakdown
 */
export interface LIResult {
  leverageIndex: number;        // Final clamped LI (0.1 - 10.0)
  rawLI: number;                // Unclamped LI before bounds check

  // Components
  baseOutLI: number;            // From BASE_OUT_LI table
  inningMultiplier: number;     // Late innings = higher
  scoreDampener: number;        // Blowouts = lower
  walkoffBoost: number;         // Bottom of final inning boost

  // Context
  baseState: BaseState;
  scoreDifferential: number;    // From batting team's perspective
  isWalkoffPossible: boolean;
  gameProgress: number;         // 0.0 - 1.0+

  // Classification
  category: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
}

// ============================================
// BASE-OUT LI TABLE
// ============================================

/**
 * Base-Out Leverage Index lookup table
 * Per LEVERAGE_INDEX_SPEC.md Section 5
 *
 * Indexed as: BASE_OUT_LI[baseState][outs]
 * - baseState: 0-7 (see BaseState enum)
 * - outs: 0, 1, or 2
 */
export const BASE_OUT_LI: readonly [
  readonly [number, number, number], // Empty
  readonly [number, number, number], // 1st
  readonly [number, number, number], // 2nd
  readonly [number, number, number], // 1st+2nd
  readonly [number, number, number], // 3rd
  readonly [number, number, number], // 1st+3rd
  readonly [number, number, number], // 2nd+3rd
  readonly [number, number, number], // Loaded
] = [
  [0.86, 0.90, 0.93],  // Empty (0)
  [1.07, 1.10, 1.24],  // 1st (1)
  [1.15, 1.40, 1.56],  // 2nd (2)
  [1.35, 1.55, 1.93],  // 1st+2nd (3)
  [1.08, 1.65, 1.88],  // 3rd (4)
  [1.32, 1.85, 2.25],  // 1st+3rd (5)
  [1.45, 2.10, 2.50],  // 2nd+3rd (6)
  [1.60, 2.25, 2.67],  // Loaded (7)
];

// ============================================
// LI CONSTANTS
// ============================================

/**
 * LI bounds (per LEVERAGE_INDEX_SPEC.md)
 */
export const LI_BOUNDS = {
  min: 0.1,
  max: 10.0,
} as const;

/**
 * Inning multipliers by inning (1-9)
 * Late innings = higher leverage
 */
const INNING_MULTIPLIERS: Record<number, number> = {
  1: 0.70,
  2: 0.75,
  3: 0.80,
  4: 0.85,
  5: 0.90,
  6: 1.00,
  7: 1.20,
  8: 1.50,
  9: 2.00,
};

/**
 * Walk-off potential boost (bottom of final inning when tied or trailing)
 */
const WALKOFF_BOOST = 1.40;

/**
 * LI category thresholds
 */
export const LI_CATEGORIES = {
  LOW: { min: 0.0, max: 0.85 },
  MEDIUM: { min: 0.85, max: 2.0 },
  HIGH: { min: 2.0, max: 5.0 },
  EXTREME: { min: 5.0, max: Infinity },
} as const;

// ============================================
// CORE FUNCTIONS
// ============================================

/**
 * Encode runners on base to a BaseState enum value
 */
export function encodeBaseState(runners: RunnersOnBase): BaseState {
  let state = 0;
  if (runners.first) state += 1;
  if (runners.second) state += 2;
  if (runners.third) state += 4;
  return state as BaseState;
}

/**
 * Decode BaseState enum to runners object
 */
export function decodeBaseState(state: BaseState): RunnersOnBase {
  return {
    first: (state & 1) !== 0,
    second: (state & 2) !== 0,
    third: (state & 4) !== 0,
  };
}

/**
 * Get base-out leverage index from lookup table
 */
export function getBaseOutLI(baseState: BaseState, outs: 0 | 1 | 2): number {
  return BASE_OUT_LI[baseState][outs];
}

/**
 * Get inning multiplier for LI calculation
 * Supports variable game lengths (SMB4 games are often 5-7 innings)
 *
 * Uses game progress-based scaling:
 * - Early game (< 33%): 0.75
 * - Mid game (33-66%): 1.0
 * - Late game (66-85%): 1.3
 * - Final inning (85%+): 1.8-2.0+
 */
export function getInningMultiplier(
  inning: number,
  halfInning: 'TOP' | 'BOTTOM',
  totalInnings: number = 9,
  scoreDifferential: number = 0
): { multiplier: number; walkoffBoost: number } {
  const gameProgress = inning / totalInnings;
  let walkoffBoost = 1.0;

  // Standard inning multiplier based on game progress
  let multiplier: number;
  if (gameProgress < 0.33) {
    multiplier = 0.75;
  } else if (gameProgress < 0.66) {
    multiplier = 1.0;
  } else if (gameProgress < 0.85) {
    multiplier = 1.3;
  } else {
    // Final inning or extra innings
    multiplier = 1.8;

    // Extra innings ramp up slightly
    if (inning > totalInnings) {
      multiplier = Math.min(2.5, 1.8 + (inning - totalInnings) * 0.15);
    }
  }

  // Walk-off potential boost
  // Bottom of final inning (or later), home team batting, tied or trailing
  if (inning >= totalInnings && halfInning === 'BOTTOM' && scoreDifferential <= 0) {
    walkoffBoost = WALKOFF_BOOST;
  }

  return { multiplier, walkoffBoost };
}

/**
 * Get score dampener for LI calculation
 * Blowouts reduce leverage significantly
 *
 * @param scoreDiff - Score differential from batting team's perspective (positive = leading)
 * @param inning - Current inning (affects how much deficit matters)
 */
export function getScoreDampener(scoreDiff: number, inning: number = 5): number {
  const absDiff = Math.abs(scoreDiff);

  // Blowouts: very low leverage
  if (absDiff >= 7) return 0.10;
  if (absDiff >= 5) return 0.25;
  if (absDiff >= 4) return 0.40;

  // Close games: high leverage
  if (absDiff === 0) return 1.00;  // Tie game = max leverage
  if (absDiff === 1) return 0.95;  // 1-run game
  if (absDiff === 2) return 0.85;  // 2-run game

  // 3-run game: depends on inning
  // Early inning = more comeback potential = higher leverage
  // Late inning = less comeback potential = lower leverage
  if (absDiff === 3) {
    // Scale from 0.60 (early) to 0.72 (late)
    return 0.60 + (0.12 * Math.min(inning, 9) / 9);
  }

  return 0.50;  // Default for any edge cases
}

/**
 * Categorize LI value
 */
export function getLICategory(li: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME' {
  if (li >= LI_CATEGORIES.EXTREME.min) return 'EXTREME';
  if (li >= LI_CATEGORIES.HIGH.min) return 'HIGH';
  if (li >= LI_CATEGORIES.MEDIUM.min) return 'MEDIUM';
  return 'LOW';
}

// ============================================
// MAIN LI CALCULATION
// ============================================

/**
 * Calculate Leverage Index for a given game state
 *
 * This is the primary function for LI calculation.
 * Returns a value between 0.1 and 10.0.
 *
 * @param gameState - Current game state
 * @param config - Optional configuration (total innings, modifiers)
 * @returns Complete LI result with breakdown
 */
export function calculateLeverageIndex(
  gameState: GameStateForLI,
  config?: Partial<LIConfig>
): LIResult {
  const totalInnings = config?.totalInnings ?? gameState.totalInnings ?? 9;
  const { inning, halfInning, outs, runners, homeScore, awayScore } = gameState;

  // 1. Determine batting team perspective
  const isBattingHome = halfInning === 'BOTTOM';
  const scoreDifferential = isBattingHome
    ? homeScore - awayScore
    : awayScore - homeScore;

  // 2. Get base-out leverage
  const baseState = encodeBaseState(runners);
  const baseOutLI = getBaseOutLI(baseState, outs);

  // 3. Get inning multiplier and walkoff boost
  const { multiplier: inningMultiplier, walkoffBoost } = getInningMultiplier(
    inning,
    halfInning,
    totalInnings,
    scoreDifferential
  );

  // 4. Get score dampener
  const scoreDampener = getScoreDampener(scoreDifferential, inning);

  // 5. Calculate raw LI
  const rawLI = baseOutLI * inningMultiplier * walkoffBoost * scoreDampener;

  // 6. Clamp to bounds
  const leverageIndex = Math.max(LI_BOUNDS.min, Math.min(LI_BOUNDS.max, rawLI));

  // 7. Categorize
  const category = getLICategory(leverageIndex);

  return {
    leverageIndex,
    rawLI,
    baseOutLI,
    inningMultiplier,
    scoreDampener,
    walkoffBoost,
    baseState,
    scoreDifferential,
    isWalkoffPossible: walkoffBoost > 1.0,
    gameProgress: inning / totalInnings,
    category,
  };
}

/**
 * Simplified LI calculation - returns just the number
 * For use when full breakdown isn't needed
 */
export function getLeverageIndex(
  gameState: GameStateForLI,
  totalInnings: number = 9
): number {
  return calculateLeverageIndex(gameState, { totalInnings }).leverageIndex;
}

// ============================================
// GAME MEAN LEVERAGE INDEX (gmLI)
// ============================================

/**
 * Track LI accumulation for a player (for gmLI calculation)
 */
export interface LIAccumulator {
  totalLI: number;
  appearances: number;
  maxLI: number;
  minLI: number;
  highLeverageAppearances: number;  // LI >= 2.0
  extremeLeverageAppearances: number;  // LI >= 5.0
}

/**
 * Create empty LI accumulator
 */
export function createLIAccumulator(): LIAccumulator {
  return {
    totalLI: 0,
    appearances: 0,
    maxLI: 0,
    minLI: Infinity,
    highLeverageAppearances: 0,
    extremeLeverageAppearances: 0,
  };
}

/**
 * Add an appearance to the accumulator
 */
export function addLIAppearance(accumulator: LIAccumulator, li: number): void {
  accumulator.totalLI += li;
  accumulator.appearances += 1;
  accumulator.maxLI = Math.max(accumulator.maxLI, li);
  accumulator.minLI = Math.min(accumulator.minLI, li);

  if (li >= LI_CATEGORIES.HIGH.min) {
    accumulator.highLeverageAppearances += 1;
  }
  if (li >= LI_CATEGORIES.EXTREME.min) {
    accumulator.extremeLeverageAppearances += 1;
  }
}

/**
 * Calculate game-mean Leverage Index (gmLI)
 * Used for reliever pWAR calculation
 *
 * @param accumulator - LI accumulator with appearance data
 * @returns gmLI value (average LI across all appearances)
 */
export function calculateGmLI(accumulator: LIAccumulator): number {
  if (accumulator.appearances === 0) return 1.0;  // Default to average
  return accumulator.totalLI / accumulator.appearances;
}

/**
 * Get leverage multiplier for pWAR from gmLI
 * Per PWAR_CALCULATION_SPEC.md Section 7
 *
 * Formula: (gmLI + 1) / 2
 * - gmLI = 1.0 → multiplier = 1.0 (average)
 * - gmLI = 2.0 → multiplier = 1.5 (closer-level)
 * - gmLI = 0.5 → multiplier = 0.75 (mop-up duty)
 */
export function gmLIToLeverageMultiplier(gmLI: number): number {
  return (gmLI + 1) / 2;
}

/**
 * Estimate gmLI for a pitcher based on role and save opportunities
 * Used when actual LI tracking isn't available
 */
export function estimateGmLI(
  role: 'STARTER' | 'CLOSER' | 'SETUP' | 'MIDDLE' | 'LONG' | 'MOP_UP',
  saves: number = 0,
  holdOpportunities: number = 0
): number {
  // Base gmLI by role
  const roleBaseGmLI: Record<string, number> = {
    STARTER: 1.0,
    CLOSER: 1.85,
    SETUP: 1.45,
    MIDDLE: 1.1,
    LONG: 0.9,
    MOP_UP: 0.5,
  };

  let gmLI = roleBaseGmLI[role] ?? 1.0;

  // Adjust based on actual save/hold opportunities
  if (role === 'CLOSER') {
    // More saves = confirmed high-leverage usage
    if (saves >= 15) gmLI = 1.95;
    else if (saves >= 10) gmLI = 1.90;
    else if (saves >= 5) gmLI = 1.85;
    else gmLI = 1.75;  // Fewer save chances = lower gmLI
  }

  if (role === 'SETUP' && holdOpportunities > 0) {
    // Hold opportunities confirm setup role
    gmLI = Math.min(1.60, 1.40 + holdOpportunities * 0.02);
  }

  return gmLI;
}

// ============================================
// CLUTCH SITUATION DETECTION
// ============================================

/**
 * Check if current situation qualifies as "clutch"
 * LI >= 1.5 = clutch situation
 */
export function isClutchSituation(li: number): boolean {
  return li >= 1.5;
}

/**
 * Check if current situation is high-leverage
 * LI >= 2.5 = high stakes
 */
export function isHighLeverageSituation(li: number): boolean {
  return li >= 2.5;
}

/**
 * Check if current situation is extreme leverage
 * LI >= 5.0 = game on the line
 */
export function isExtremeLeverageSituation(li: number): boolean {
  return li >= 5.0;
}

/**
 * Calculate clutch value based on LI
 * Uses sqrt(LI) for dampened scaling
 *
 * @param baseValue - Base clutch/choke value (+/-)
 * @param li - Leverage Index
 * @returns Weighted clutch/choke value
 */
export function calculateClutchValue(baseValue: number, li: number): number {
  return baseValue * Math.sqrt(li);
}

// ============================================
// WIN PROBABILITY (simplified)
// ============================================

/**
 * Estimate win probability based on game state
 * Simplified version - for accurate WP, would need full lookup tables
 */
export function estimateWinProbability(
  gameState: GameStateForLI,
  totalInnings: number = 9
): number {
  const { inning, halfInning, outs, runners, homeScore, awayScore } = gameState;

  // Determine which team's perspective we want (batting team)
  const isBattingHome = halfInning === 'BOTTOM';
  const scoreDiff = isBattingHome
    ? homeScore - awayScore
    : awayScore - homeScore;

  // Calculate game progress (0.0 - 1.0+)
  const gameProgress = ((inning - 1) * 2 + (halfInning === 'BOTTOM' ? 1 : 0) + (outs / 3)) / (totalInnings * 2);

  // Base WP from score differential
  // Each run is worth roughly 10% at game start, more at game end
  const runValue = 0.08 + 0.12 * gameProgress;  // 8% early, 20% late
  let wp = 0.50 + scoreDiff * runValue;

  // Adjust for runners on base (potential scoring)
  const baseState = encodeBaseState(runners);
  const runnerWPBoost = [0, 0.02, 0.04, 0.05, 0.06, 0.07, 0.09, 0.11][baseState];
  if (scoreDiff <= 0) {
    wp += runnerWPBoost;  // Runners help when tied or trailing
  }

  // Late-game effects
  if (gameProgress > 0.85 && scoreDiff > 0) {
    // Leading late = higher WP
    wp = Math.min(0.95, wp + 0.10);
  }
  if (gameProgress > 0.85 && scoreDiff < -3) {
    // Trailing badly late = low WP
    wp = Math.max(0.05, wp - 0.20);
  }

  // Clamp to 1-99%
  return Math.max(0.01, Math.min(0.99, wp));
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Format LI for display
 */
export function formatLI(li: number, precision: number = 2): string {
  return li.toFixed(precision);
}

/**
 * Get color code for LI category (for UI display)
 */
export function getLIColor(category: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME'): string {
  switch (category) {
    case 'LOW': return '#6b7280';      // Gray
    case 'MEDIUM': return '#3b82f6';   // Blue
    case 'HIGH': return '#f59e0b';     // Amber
    case 'EXTREME': return '#ef4444';  // Red
  }
}

/**
 * Get emoji for LI category
 */
export function getLIEmoji(category: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME'): string {
  switch (category) {
    case 'LOW': return '😌';
    case 'MEDIUM': return '😐';
    case 'HIGH': return '😰';
    case 'EXTREME': return '🔥';
  }
}

// ============================================
// SCENARIO EXAMPLES (for testing/documentation)
// ============================================

/**
 * Example scenarios for LI calculation verification
 */
export const LI_SCENARIOS = {
  // Low leverage
  earlyInningEmpty: {
    state: { inning: 1, halfInning: 'TOP', outs: 0, runners: { first: false, second: false, third: false }, homeScore: 0, awayScore: 0 } as GameStateForLI,
    expectedRange: [0.5, 0.7],
    description: '1st inning, 0-0, empty, 0 out',
  },
  blowout: {
    state: { inning: 5, halfInning: 'TOP', outs: 1, runners: { first: false, second: false, third: false }, homeScore: 0, awayScore: 7 } as GameStateForLI,
    expectedRange: [0.1, 0.3],
    description: '5th inning, down 7, empty',
  },

  // Medium leverage
  midGameClose: {
    state: { inning: 5, halfInning: 'BOTTOM', outs: 1, runners: { first: true, second: false, third: false }, homeScore: 3, awayScore: 4 } as GameStateForLI,
    expectedRange: [0.8, 1.2],
    description: '5th inning, down 1, runner on 1st',
  },

  // High leverage
  lateGameRISP: {
    state: { inning: 7, halfInning: 'TOP', outs: 2, runners: { first: false, second: true, third: false }, homeScore: 5, awayScore: 5 } as GameStateForLI,
    expectedRange: [1.8, 2.5],
    description: '7th inning, tie, RISP, 2 out',
  },

  // Extreme leverage
  ninthInningLoadedTie: {
    state: { inning: 9, halfInning: 'BOTTOM', outs: 2, runners: { first: true, second: true, third: true }, homeScore: 5, awayScore: 5 } as GameStateForLI,
    expectedRange: [6.0, 10.0],
    description: '9th inning (B), tie, bases loaded, 2 out',
  },
  closerUp1: {
    state: { inning: 9, halfInning: 'TOP', outs: 2, runners: { first: true, second: true, third: true }, homeScore: 6, awayScore: 5 } as GameStateForLI,
    expectedRange: [4.5, 6.0],
    description: '9th inning (T), up 1, bases loaded, 2 out',
  },
} as const;
