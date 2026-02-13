/**
 * Win Expectancy Table
 * Per DATA_INTEGRITY_FIX_PLAN_v2.md MAJ-12
 *
 * Win expectancy (WE) lookup table indexed by game state:
 *   - Inning (1-9+, with extra-inning handling)
 *   - Half inning (TOP / BOTTOM)
 *   - Outs (0, 1, 2)
 *   - Base state (0-7, bitwise: 1st=1, 2nd=2, 3rd=4)
 *   - Run differential (from HOME team's perspective, clamped -5..+5)
 *
 * Returns: probability that the HOME team wins (0.0 - 1.0)
 *
 * Values derived from empirical MLB win expectancy tables (Tango/FanGraphs),
 * slightly adjusted for SMB4's higher-scoring environment.
 *
 * Reference: https://www.fangraphs.com/library/misc/wpa/
 */

import { BaseState, encodeBaseState, type RunnersOnBase } from './leverageCalculator';

// ============================================
// TYPES
// ============================================

/**
 * Game state for win expectancy lookup
 */
export interface WEGameState {
  inning: number;
  isTop: boolean;
  outs: 0 | 1 | 2;
  baseState: BaseState;
  homeScore: number;
  awayScore: number;
  totalInnings?: number; // Default 9
}

/**
 * Convenience: build WEGameState from bases object
 */
export function buildWEGameState(
  inning: number,
  isTop: boolean,
  outs: number,
  bases: { first: boolean; second: boolean; third: boolean },
  homeScore: number,
  awayScore: number,
  totalInnings?: number
): WEGameState {
  return {
    inning,
    isTop,
    outs: Math.min(outs, 2) as 0 | 1 | 2,
    baseState: encodeBaseState(bases),
    homeScore,
    awayScore,
    totalInnings,
  };
}

// ============================================
// RUN DIFFERENTIAL CLAMPING
// ============================================

/** Min/max run differential tracked in the table */
const MIN_DIFF = -5;
const MAX_DIFF = 5;
const DIFF_RANGE = MAX_DIFF - MIN_DIFF + 1; // 11 buckets: -5..+5

/**
 * Clamp run differential to table range
 * Differential is HOME_SCORE - AWAY_SCORE
 */
function clampDiff(diff: number): number {
  return Math.max(MIN_DIFF, Math.min(MAX_DIFF, diff));
}

/** Convert clamped diff to array index (0-10) */
function diffToIndex(diff: number): number {
  return clampDiff(diff) - MIN_DIFF;
}

// ============================================
// WIN EXPECTANCY TABLE
// ============================================

/**
 * Table structure:
 *   WIN_EXPECTANCY[inning][halfIndex][outs][baseState][diffIndex]
 *
 * Where:
 *   - inning: 1-9 (index 0-8), extras use inning 9 values
 *   - halfIndex: 0 = TOP (before home bats), 1 = BOTTOM (home batting)
 *   - outs: 0, 1, 2
 *   - baseState: 0-7 (BaseState enum)
 *   - diffIndex: 0-10 (maps to -5 through +5)
 *
 * All values are HOME team win probability.
 *
 * Table generation methodology:
 *   - Base values from Tango/Lichtman win expectancy matrices
 *   - Tied game (diff=0) calibrated to empirical home-field advantage (~0.54 at start)
 *   - Each run of differential adjusts WE based on inning (later innings = bigger per-run swing)
 *   - Runner/out states adjust based on scoring potential (run expectancy)
 *   - Values are bounded to [0.01, 0.99] — no game state is 100% certain
 */

// Helper: generate WE row for a specific (inning, half, outs, baseState)
// Parameters control how WE shifts with run differential
function generateWERow(
  tiedWE: number,          // WE when tied (diff=0)
  perRunSwing: number,     // WE change per run of differential
  runnerBoost: number,     // Additional WE adjustment for runners (positive = helps batting team)
  isHomeBatting: boolean   // Whether home team is currently batting
): number[] {
  const row: number[] = [];
  for (let di = 0; di < DIFF_RANGE; di++) {
    const diff = di + MIN_DIFF; // -5 to +5

    // Base WE from score differential
    // Use logistic-like curve for realistic WE behavior
    // logistic: 1 / (1 + e^(-k*diff)) centered at tiedWE
    const k = perRunSwing * 2; // scale factor
    let we: number;

    if (diff === 0) {
      we = tiedWE;
    } else {
      // Logistic adjustment from tied point
      const logisticShift = 1 / (1 + Math.exp(-k * diff)) - 0.5;
      we = tiedWE + logisticShift * (1 - Math.abs(tiedWE - 0.5) * 0.5);
    }

    // Runner adjustment: runners help the batting team
    // When home is batting, runners help home (positive boost)
    // When away is batting, runners help away (negative boost for home WE)
    if (isHomeBatting) {
      we += runnerBoost * 0.5; // Runners help home team while batting
    } else {
      we -= runnerBoost * 0.5; // Runners help away team while batting
    }

    row.push(Math.max(0.01, Math.min(0.99, we)));
  }
  return row;
}

// ============================================
// FULL TABLE CONSTRUCTION
// ============================================

/**
 * Runner boost values by base state (scoring potential from 24-state run expectancy)
 * Higher values = more runners in scoring position
 */
const RUNNER_BOOST: Record<number, number> = {
  0: 0.000,  // Empty
  1: 0.015,  // 1st
  2: 0.030,  // 2nd (RISP)
  3: 0.040,  // 1st+2nd
  4: 0.035,  // 3rd (RISP)
  5: 0.045,  // 1st+3rd
  6: 0.055,  // 2nd+3rd
  7: 0.065,  // Loaded
};

/**
 * Out penalty: more outs = less scoring potential (applied to tied WE)
 * Values are deliberately small to avoid overshooting half-inning transitions.
 * The main WE impact of outs comes through the runner boost scaling (OUT_RUNNER_SCALE).
 */
const OUT_PENALTY: Record<number, number> = {
  0: 0.000,
  1: -0.004,
  2: -0.010,
};

/**
 * Out scaling for runner boost: runners are worth less with more outs
 * At 0 outs, runners have full scoring potential
 * At 2 outs, runners have reduced scoring potential
 */
const OUT_RUNNER_SCALE: Record<number, number> = {
  0: 1.0,
  1: 0.75,
  2: 0.40,
};

/**
 * Inning-dependent parameters
 * Later innings: tied WE converges toward 0.50, per-run swing increases
 */
interface InningParams {
  tiedWE_top: number;   // Home WE when tied, TOP of inning
  tiedWE_bot: number;   // Home WE when tied, BOTTOM of inning
  perRunSwing: number;   // How much each run shifts WE
}

const INNING_PARAMS: InningParams[] = [
  // Inning 1: Home advantage ~0.54
  { tiedWE_top: 0.540, tiedWE_bot: 0.548, perRunSwing: 0.32 },
  // Inning 2
  { tiedWE_top: 0.538, tiedWE_bot: 0.546, perRunSwing: 0.34 },
  // Inning 3
  { tiedWE_top: 0.535, tiedWE_bot: 0.543, perRunSwing: 0.36 },
  // Inning 4
  { tiedWE_top: 0.530, tiedWE_bot: 0.540, perRunSwing: 0.39 },
  // Inning 5
  { tiedWE_top: 0.525, tiedWE_bot: 0.538, perRunSwing: 0.42 },
  // Inning 6
  { tiedWE_top: 0.520, tiedWE_bot: 0.535, perRunSwing: 0.47 },
  // Inning 7
  { tiedWE_top: 0.515, tiedWE_bot: 0.530, perRunSwing: 0.53 },
  // Inning 8
  { tiedWE_top: 0.510, tiedWE_bot: 0.525, perRunSwing: 0.62 },
  // Inning 9 (and extras)
  { tiedWE_top: 0.505, tiedWE_bot: 0.520, perRunSwing: 0.75 },
];

/**
 * Build the complete win expectancy table
 * Dimensions: [9 innings][2 halves][3 outs][8 base states][11 diffs]
 */
function buildTable(): number[][][][][] {
  const table: number[][][][][] = [];

  for (let inn = 0; inn < 9; inn++) {
    const params = INNING_PARAMS[inn];
    const inningTable: number[][][][] = [];

    for (let half = 0; half < 2; half++) {
      const isHomeBatting = half === 1; // 1 = BOTTOM
      const tiedBase = isHomeBatting ? params.tiedWE_bot : params.tiedWE_top;
      const halfTable: number[][][] = [];

      for (let outs = 0; outs < 3; outs++) {
        const outsTable: number[][] = [];
        const outAdj = OUT_PENALTY[outs];
        const runnerScale = OUT_RUNNER_SCALE[outs];

        for (let bs = 0; bs < 8; bs++) {
          const runnerAdj = RUNNER_BOOST[bs] * runnerScale;
          // Out penalty: reduces scoring potential for batting team
          // When home bats: more outs → lower home WE (negative adjustment)
          // When away bats: more outs → higher home WE (positive adjustment, away loses chances)
          const directionalOutAdj = isHomeBatting ? outAdj : -outAdj;
          const tiedWE = tiedBase + directionalOutAdj;
          const row = generateWERow(
            tiedWE,
            params.perRunSwing,
            runnerAdj,
            isHomeBatting
          );
          outsTable.push(row);
        }
        halfTable.push(outsTable);
      }
      inningTable.push(halfTable);
    }
    table.push(inningTable);
  }

  return table;
}

/** The pre-computed win expectancy table (built once at module load) */
const WIN_EXPECTANCY_TABLE = buildTable();

// ============================================
// LOOKUP FUNCTION
// ============================================

/**
 * Look up win expectancy for a given game state.
 *
 * @param state - Current game state
 * @returns Home team win probability [0.01, 0.99]
 */
export function getWinExpectancy(state: WEGameState): number {
  const totalInnings = state.totalInnings ?? 9;
  const { inning, isTop, outs, baseState, homeScore, awayScore } = state;

  // Handle game-over states
  if (!isTop && homeScore > awayScore && inning >= totalInnings) {
    // Walk-off: home wins
    return 1.0;
  }

  // Normalize inning for variable game lengths
  // Map current inning to a 9-inning equivalent
  const normalizedInning = Math.round((inning / totalInnings) * 9);
  const innIdx = Math.max(0, Math.min(8, normalizedInning - 1));

  const halfIdx = isTop ? 0 : 1;
  const outsIdx = Math.min(outs, 2) as 0 | 1 | 2;
  const bsIdx = Math.max(0, Math.min(7, baseState));

  const diff = homeScore - awayScore;
  const diffIdx = diffToIndex(diff);

  return WIN_EXPECTANCY_TABLE[innIdx][halfIdx][outsIdx][bsIdx][diffIdx];
}

/**
 * Look up win expectancy using raw game parameters (convenience function).
 *
 * @returns Home team win probability [0.01, 0.99]
 */
export function lookupWinExpectancy(
  inning: number,
  isTop: boolean,
  outs: number,
  runners: RunnersOnBase,
  homeScore: number,
  awayScore: number,
  totalInnings?: number
): number {
  return getWinExpectancy({
    inning,
    isTop,
    outs: Math.min(outs, 2) as 0 | 1 | 2,
    baseState: encodeBaseState(runners),
    homeScore,
    awayScore,
    totalInnings,
  });
}

// ============================================
// INNING-END TRANSITION VALUES
// ============================================

/**
 * Get win expectancy at the start of a half-inning (0 outs, bases empty).
 * Used for transition points when the inning changes.
 */
export function getHalfInningStartWE(
  inning: number,
  isTop: boolean,
  homeScore: number,
  awayScore: number,
  totalInnings: number = 9
): number {
  return getWinExpectancy({
    inning,
    isTop,
    outs: 0,
    baseState: BaseState.EMPTY,
    homeScore,
    awayScore,
    totalInnings,
  });
}

// ============================================
// EXPORTS FOR TESTING
// ============================================

export { MIN_DIFF, MAX_DIFF, DIFF_RANGE, INNING_PARAMS, RUNNER_BOOST, OUT_PENALTY, OUT_RUNNER_SCALE };
