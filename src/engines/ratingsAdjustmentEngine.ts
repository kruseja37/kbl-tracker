/**
 * Ratings Adjustment Engine - End-of-Season Rating & Salary Adjustments
 *
 * Implements two systems that run in sequence at end of season:
 *   System A: Rating adjustments based on WAR vs salary percentile at position
 *   System B: Salary adjustments toward "true value" (50% gap closure)
 *
 * Per EOS_RATINGS_READINESS.md, EOS_RATINGS_ADJUSTMENT_SPEC.md,
 * SALARY_SYSTEM_SPEC.md §True Value, and OFFSEASON_SYSTEM_SPEC.md §5.
 *
 * GAP-B12-021: detectPosition()
 * GAP-B12-022: getComparisonPool()
 * GAP-B12-023: calculatePercentile()
 * GAP-B12-024: calculateRatingAdjustment()
 * GAP-B12-025: calculateSalaryAdjustment()
 */

// ============================================
// TYPES
// ============================================

/** Detected position from season usage patterns */
export type DetectedPosition =
  | 'SP' | 'RP' | 'CP' | 'SP/RP'
  | 'C' | '1B' | '2B' | '3B' | 'SS'
  | 'LF' | 'CF' | 'RF' | 'DH'
  | 'UTIL' | 'BENCH' | 'TWO-WAY';

/** Player grade from the grade engine */
export type Grade = 'S' | 'A+' | 'A' | 'A-' | 'B+' | 'B' | 'B-' | 'C+' | 'C' | 'C-' | 'D+' | 'D';

/** Input for position detection (GAP-B12-021) */
export interface PositionDetectionInput {
  /** Number of games the pitcher started */
  gamesStarted: number;
  /** Total pitcher appearances */
  appearances: number;
  /** Number of saves recorded */
  saves: number;
  /** Number of save opportunities */
  saveOpportunities: number;
  /** Array of position abbreviations the player appeared at (e.g. ['SS', '2B', '3B']) */
  positionsPlayed: string[];
  /** Total games the player appeared in */
  gamesPlayed: number;
  /** Total games in the season (e.g. 48 for SMB4 default) */
  seasonGames: number;
}

/** A player entry for peer pool assignment (GAP-B12-022) */
export interface PoolPlayer {
  id: string;
  detectedPosition: DetectedPosition;
  war: number;
  salary: number;
}

/** WAR component breakdown for rating adjustment (GAP-B12-024) */
export interface WARComponents {
  bwar: number;
  rwar: number;
  fwar: number;
  pwar: number;
}

/** Input for the rating adjustment calculation (GAP-B12-024) */
export interface RatingAdjustmentInput {
  warPercentile: number;
  salaryPercentile: number;
  warComponents: WARComponents;
  isPitcher: boolean;
}

/** Input for salary adjustment (System B) (GAP-B12-025) */
export interface SalaryAdjustmentInput {
  /** Player's total WAR for the season */
  war: number;
  /** Player's current contract salary */
  currentSalary: number;
  /** Player's overall grade */
  grade: Grade;
  /** Runs per win for the current season length */
  runsPerWin: number;
  /** Dollars per run from adaptive standards (league economy) */
  dollarsPerRun: number;
}

/** Result of salary adjustment calculation (GAP-B12-025) */
export interface SalaryAdjustmentResult {
  /** New salary after adjustment */
  newSalary: number;
  /** The change applied (newSalary - currentSalary) */
  adjustment: number;
  /** The computed "true value" based on WAR performance */
  trueValue: number;
}

// ============================================
// CONSTANTS
// ============================================

/** Position detection thresholds */
const SP_START_RATIO = 0.6;
const RP_MIN_APPEARANCES = 20;
const CP_MIN_SAVES = 10;
const CP_MIN_SAVE_OPPS = 15;
const UTIL_MIN_POSITIONS = 3;
const BENCH_MAX_GAME_RATIO = 0.30;

/** Minimum players in a comparison pool before merging */
const MIN_POOL_SIZE = 6;

/**
 * Merge groups: when a position pool is too small, merge with these related positions.
 * Per SALARY_SYSTEM_SPEC.md §getPositionPeerPool.
 */
const MERGE_GROUPS: Record<string, string[]> = {
  'CP':  ['CP', 'RP'],
  'RP':  ['RP', 'CP'],
  'SP/RP': ['SP/RP', 'SP', 'RP'],
  '1B':  ['1B', '3B'],
  '3B':  ['3B', '1B'],
  'LF':  ['LF', 'RF'],
  'RF':  ['RF', 'LF'],
  '2B':  ['2B', 'SS'],
  'SS':  ['SS', '2B'],
  'UTIL': ['UTIL', 'LF', 'RF', '1B', '2B', '3B'],
  'BENCH': ['BENCH', 'UTIL', 'LF', 'RF'],
  'DH':  ['DH', '1B'],
  'TWO-WAY': ['TWO-WAY', 'SP', 'UTIL'],
};

/**
 * Asymmetric adjustment factors.
 * Overperformers (positive delta) get a 0.6 factor.
 * Underperformers (negative delta) get a 0.4 factor.
 * Per GAP-B12-024 spec.
 */
const POSITIVE_DELTA_FACTOR = 0.6;
const NEGATIVE_DELTA_FACTOR = 0.4;

/** Maximum per-rating adjustment cap */
const MAX_RATING_ADJUSTMENT = 10;

/**
 * Salary floor/ceiling by grade for System B.
 * Per GAP-B12-025 spec. Values in millions ($M).
 */
const GRADE_SALARY_BOUNDS: Record<Grade, { floor: number; ceiling: number }> = {
  'S':  { floor: 15, ceiling: 45 },
  'A+': { floor: 12, ceiling: 40 },
  'A':  { floor: 10, ceiling: 35 },
  'A-': { floor: 8,  ceiling: 30 },
  'B+': { floor: 6,  ceiling: 25 },
  'B':  { floor: 5,  ceiling: 20 },
  'B-': { floor: 4,  ceiling: 18 },
  'C+': { floor: 3,  ceiling: 15 },
  'C':  { floor: 2,  ceiling: 12 },
  'C-': { floor: 2,  ceiling: 12 },
  'D+': { floor: 1,  ceiling: 8 },
  'D':  { floor: 1,  ceiling: 8 },
};

/** System B gap closure rate (50%) */
const GAP_CLOSURE_RATE = 0.5;

// ============================================
// GAP-B12-021: detectPosition()
// ============================================

/**
 * Detect a player's functional position based on their season usage patterns.
 *
 * Uses scalable thresholds:
 * - SP: games_started / total_appearances >= 0.6
 * - RP: appears >= 20 games, not SP
 * - CP: saves >= 10 AND save_opportunities >= 15
 * - UTIL: played >= 3 different positions
 * - BENCH: total games < 30% of season games
 *
 * @param input - Season usage data for the player
 * @returns The detected position string
 */
export function detectPosition(input: PositionDetectionInput): DetectedPosition {
  const {
    gamesStarted,
    appearances,
    saves,
    saveOpportunities,
    positionsPlayed,
    gamesPlayed,
    seasonGames,
  } = input;

  // --- Pitcher detection (based on pitcher appearances) ---
  if (appearances > 0) {
    // Closer: saves >= 10 AND save opportunities >= 15
    if (saves >= CP_MIN_SAVES && saveOpportunities >= CP_MIN_SAVE_OPPS) {
      return 'CP';
    }

    // Starting pitcher: starts / appearances >= 0.6
    if (gamesStarted / appearances >= SP_START_RATIO) {
      return 'SP';
    }

    // Relief pitcher: 20+ appearances and not a starter
    if (appearances >= RP_MIN_APPEARANCES) {
      return 'RP';
    }
  }

  // --- Position player detection ---

  // Bench player: appeared in fewer than 30% of season games
  if (gamesPlayed < seasonGames * BENCH_MAX_GAME_RATIO) {
    return 'BENCH';
  }

  // Utility player: played 3 or more different positions
  const uniquePositions = [...new Set(positionsPlayed)];
  if (uniquePositions.length >= UTIL_MIN_POSITIONS) {
    return 'UTIL';
  }

  // Default: primary position (most played). If only one position, use it directly.
  if (uniquePositions.length === 1) {
    return uniquePositions[0] as DetectedPosition;
  }

  // Two positions played — return the first (most frequent assumed by caller ordering)
  if (uniquePositions.length === 2) {
    return uniquePositions[0] as DetectedPosition;
  }

  // Fallback (should not reach here given the UTIL check above)
  return 'UTIL';
}

// ============================================
// GAP-B12-022: getComparisonPool()
// ============================================

/**
 * Group players into peer comparison pools by detected position.
 * Pools smaller than MIN_POOL_SIZE are merged with related positions
 * per the MERGE_GROUPS mapping.
 *
 * @param players - Array of all players with detected positions
 * @returns Map from pool name to array of players in that pool
 */
export function getComparisonPool(players: PoolPlayer[]): Map<string, PoolPlayer[]> {
  // Step 1: Group by detected position
  const positionGroups = new Map<string, PoolPlayer[]>();
  for (const player of players) {
    const pos = player.detectedPosition;
    if (!positionGroups.has(pos)) {
      positionGroups.set(pos, []);
    }
    positionGroups.get(pos)!.push(player);
  }

  // Step 2: Merge small pools
  const result = new Map<string, PoolPlayer[]>();
  const processed = new Set<string>();

  for (const [position, group] of positionGroups) {
    if (processed.has(position)) continue;

    if (group.length >= MIN_POOL_SIZE) {
      // Pool is large enough on its own
      result.set(position, [...group]);
      processed.add(position);
    } else {
      // Need to merge with related positions
      const mergeList = MERGE_GROUPS[position] ?? [position];
      const merged: PoolPlayer[] = [];
      const mergedPositions: string[] = [];

      for (const mergePos of mergeList) {
        const mergeGroup = positionGroups.get(mergePos);
        if (mergeGroup && !processed.has(mergePos)) {
          merged.push(...mergeGroup);
          mergedPositions.push(mergePos);
        }
      }

      // If we still don't have the merge positions in our list, at least include
      // the original group
      if (merged.length === 0) {
        merged.push(...group);
        mergedPositions.push(position);
      }

      // Build pool name from merged positions
      const poolName = mergedPositions.length > 1
        ? mergedPositions.join('/')
        : position;

      result.set(poolName, merged);

      // Mark all merged positions as processed
      for (const mp of mergedPositions) {
        processed.add(mp);
      }
    }
  }

  return result;
}

// ============================================
// GAP-B12-023: calculatePercentile()
// ============================================

/**
 * Calculate the percentile rank of a value within a pool of values.
 *
 * Uses the "percentage of values below" method:
 *   percentile = (count of values strictly below playerValue) / (total - 1) * 100
 *
 * For a pool of 1, returns 50 (median assumption).
 *
 * @param playerValue - The player's metric value (WAR or salary)
 * @param poolValues - Array of all values in the comparison pool
 * @returns Percentile rank from 0 to 100
 */
export function calculatePercentile(playerValue: number, poolValues: number[]): number {
  if (poolValues.length === 0) return 50;
  if (poolValues.length === 1) return 50;

  const sorted = [...poolValues].sort((a, b) => a - b);
  const n = sorted.length;

  // Count how many values are strictly below the player's value
  let countBelow = 0;
  for (const val of sorted) {
    if (val < playerValue) {
      countBelow++;
    }
  }

  // Count how many values are equal (for tie handling)
  let countEqual = 0;
  for (const val of sorted) {
    if (val === playerValue) {
      countEqual++;
    }
  }

  // Percentile using midpoint of tied ranks
  const percentile = ((countBelow + countEqual * 0.5) / n) * 100;

  return Math.min(100, Math.max(0, percentile));
}

// ============================================
// GAP-B12-024: calculateRatingAdjustment()
// ============================================

/**
 * Calculate per-rating adjustments based on WAR vs salary percentile.
 *
 * System A logic:
 * 1. delta = warPercentile - salaryPercentile
 * 2. Apply asymmetric factor (0.6 for positive / 0.4 for negative)
 * 3. Distribute adjustedDelta to relevant ratings based on WAR component weights
 * 4. Cap each rating adjustment at +/-10
 *
 * WAR-to-rating mapping:
 *   bWAR -> POW, CON (50/50)
 *   rWAR -> SPD (100%)
 *   fWAR -> FLD, ARM (50/50)
 *   pWAR -> VEL, JNK, ACC (33/33/33)
 *
 * @param input - WAR percentile, salary percentile, WAR components, pitcher flag
 * @returns Map of rating abbreviation to adjustment value (capped at +/-10)
 */
export function calculateRatingAdjustment(input: RatingAdjustmentInput): Map<string, number> {
  const { warPercentile, salaryPercentile, warComponents, isPitcher } = input;

  const delta = warPercentile - salaryPercentile;
  const factor = delta >= 0 ? POSITIVE_DELTA_FACTOR : NEGATIVE_DELTA_FACTOR;
  const adjustedDelta = delta * factor;

  const result = new Map<string, number>();

  if (isPitcher) {
    // pWAR -> VEL, JNK, ACC (equal thirds)
    const pitchAdj = adjustedDelta / 3;
    result.set('VEL', clampAdjustment(pitchAdj));
    result.set('JNK', clampAdjustment(pitchAdj));
    result.set('ACC', clampAdjustment(pitchAdj));
  } else {
    // Distribute based on WAR component magnitudes
    // bWAR -> POW, CON
    const totalOffensiveWAR = Math.abs(warComponents.bwar)
      + Math.abs(warComponents.rwar)
      + Math.abs(warComponents.fwar);

    // If no WAR at all, distribute evenly across batting stats
    if (totalOffensiveWAR === 0) {
      const evenAdj = adjustedDelta / 5; // 5 position player ratings
      result.set('POW', clampAdjustment(evenAdj));
      result.set('CON', clampAdjustment(evenAdj));
      result.set('SPD', clampAdjustment(evenAdj));
      result.set('FLD', clampAdjustment(evenAdj));
      result.set('ARM', clampAdjustment(evenAdj));
    } else {
      // Weight adjustment by each WAR component's proportion
      const bwarWeight = Math.abs(warComponents.bwar) / totalOffensiveWAR;
      const rwarWeight = Math.abs(warComponents.rwar) / totalOffensiveWAR;
      const fwarWeight = Math.abs(warComponents.fwar) / totalOffensiveWAR;

      // bWAR portion split 50/50 into POW and CON
      const bwarAdj = adjustedDelta * bwarWeight;
      result.set('POW', clampAdjustment(bwarAdj * 0.5));
      result.set('CON', clampAdjustment(bwarAdj * 0.5));

      // rWAR -> SPD (100%)
      const rwarAdj = adjustedDelta * rwarWeight;
      result.set('SPD', clampAdjustment(rwarAdj));

      // fWAR -> FLD, ARM (50/50)
      const fwarAdj = adjustedDelta * fwarWeight;
      result.set('FLD', clampAdjustment(fwarAdj * 0.5));
      result.set('ARM', clampAdjustment(fwarAdj * 0.5));
    }
  }

  return result;
}

/**
 * Clamp a rating adjustment value to the +/-10 cap, rounding to nearest integer.
 */
function clampAdjustment(value: number): number {
  const rounded = Math.round(value);
  return Math.max(-MAX_RATING_ADJUSTMENT, Math.min(MAX_RATING_ADJUSTMENT, rounded));
}

// ============================================
// GAP-B12-025: calculateSalaryAdjustment()
// ============================================

/**
 * Calculate the end-of-season salary adjustment (System B).
 *
 * Formula:
 * 1. trueValue = WAR * runsPerWin * dollarsPerRun
 * 2. gapToTrue = trueValue - currentSalary
 * 3. adjustment = gapToTrue * 0.5 (50% gap closure)
 * 4. newSalary = currentSalary + adjustment
 * 5. Clamp newSalary within grade-based floor/ceiling
 *
 * @param input - WAR, current salary, grade, economic context
 * @returns New salary, adjustment amount, and computed true value
 */
export function calculateSalaryAdjustment(input: SalaryAdjustmentInput): SalaryAdjustmentResult {
  const { war, currentSalary, grade, runsPerWin, dollarsPerRun } = input;

  // Step 1: Compute true value from WAR
  const trueValue = war * runsPerWin * dollarsPerRun;

  // Step 2: Gap to true value
  const gapToTrue = trueValue - currentSalary;

  // Step 3: 50% gap closure
  const rawAdjustment = gapToTrue * GAP_CLOSURE_RATE;
  const rawNewSalary = currentSalary + rawAdjustment;

  // Step 4: Apply grade-based floor/ceiling
  const bounds = GRADE_SALARY_BOUNDS[grade];
  const clampedSalary = Math.max(bounds.floor, Math.min(bounds.ceiling, rawNewSalary));

  // Final adjustment is the clamped difference
  const finalAdjustment = clampedSalary - currentSalary;

  return {
    newSalary: clampedSalary,
    adjustment: finalAdjustment,
    trueValue,
  };
}

// ============================================
// CONVENIENCE / AGGREGATION HELPERS
// ============================================

/**
 * Find which pool a player belongs to in the comparison pools map.
 * Searches pool names for the player's detected position, considering merged pools.
 *
 * @param poolMap - The comparison pools from getComparisonPool()
 * @param playerId - The player's id to find
 * @returns The pool name and the players in that pool, or null if not found
 */
export function findPlayerPool(
  poolMap: Map<string, PoolPlayer[]>,
  playerId: string
): { poolName: string; pool: PoolPlayer[] } | null {
  for (const [poolName, pool] of poolMap) {
    if (pool.some(p => p.id === playerId)) {
      return { poolName, pool };
    }
  }
  return null;
}

/**
 * Compute WAR and salary percentiles for a player within their pool.
 * Convenience wrapper combining findPlayerPool + calculatePercentile.
 *
 * @param poolMap - Comparison pools
 * @param player - The player to evaluate
 * @returns Object with warPercentile and salaryPercentile, or null if player not in any pool
 */
export function getPlayerPercentiles(
  poolMap: Map<string, PoolPlayer[]>,
  player: PoolPlayer
): { warPercentile: number; salaryPercentile: number } | null {
  const found = findPlayerPool(poolMap, player.id);
  if (!found) return null;

  const warValues = found.pool.map(p => p.war);
  const salaryValues = found.pool.map(p => p.salary);

  return {
    warPercentile: calculatePercentile(player.war, warValues),
    salaryPercentile: calculatePercentile(player.salary, salaryValues),
  };
}
