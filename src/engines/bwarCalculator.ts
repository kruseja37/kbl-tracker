/**
 * bWAR Calculator
 * Per BWAR_CALCULATION_SPEC.md
 *
 * Calculates batting Wins Above Replacement using:
 * - wOBA (Weighted On-Base Average)
 * - wRAA (Weighted Runs Above Average)
 * - Park/League adjustments
 * - Replacement level runs
 */

import {
  type BattingStatsForWAR,
  type BWARResult,
  type LeagueContext,
  type WOBAWeights,
  type ParkFactors,
  type TeamStint,
  SMB4_BASELINES,
  SMB4_WOBA_WEIGHTS,
  createDefaultLeagueContext,
} from '../types/war';

// Re-export types and constants for engines/index.ts
export {
  SMB4_BASELINES,
  SMB4_WOBA_WEIGHTS,
};

export type {
  BattingStatsForWAR,
  BWARResult,
  LeagueContext,
  WOBAWeights,
};

// ============================================
// wOBA CALCULATION
// ============================================

/**
 * Calculate wOBA (Weighted On-Base Average)
 * Formula: (wBB×uBB + wHBP×HBP + w1B×1B + w2B×2B + w3B×3B + wHR×HR) / (AB + uBB + SF + HBP)
 */
export function calculateWOBA(
  stats: BattingStatsForWAR,
  weights: WOBAWeights = SMB4_WOBA_WEIGHTS
): number {
  const uBB = stats.walks - stats.intentionalWalks;

  const numerator =
    weights.uBB * uBB +
    weights.HBP * stats.hitByPitch +
    weights.single * stats.singles +
    weights.double * stats.doubles +
    weights.triple * stats.triples +
    weights.homeRun * stats.homeRuns;

  const denominator =
    stats.ab + uBB + stats.sacFlies + stats.hitByPitch;

  if (denominator === 0) return 0;

  return numerator / denominator;
}

/**
 * wOBA quality interpretation
 */
export function getWOBAQuality(woba: number): string {
  if (woba >= 0.400) return 'Excellent';
  if (woba >= 0.370) return 'Great';
  if (woba >= 0.340) return 'Above Average';
  if (woba >= 0.320) return 'Average';
  if (woba >= 0.300) return 'Below Average';
  if (woba >= 0.280) return 'Poor';
  return 'Awful';
}

// ============================================
// wRAA CALCULATION
// ============================================

/**
 * Calculate wRAA (Weighted Runs Above Average)
 * Formula: ((playerWOBA - leagueWOBA) / wobaScale) × PA
 */
export function calculateWRAA(
  playerWOBA: number,
  plateAppearances: number,
  leagueWOBA: number = SMB4_BASELINES.leagueWOBA,
  wobaScale: number = SMB4_BASELINES.wobaScale
): number {
  return ((playerWOBA - leagueWOBA) / wobaScale) * plateAppearances;
}

// ============================================
// PARK FACTOR ADJUSTMENTS
// ============================================

/**
 * Get effective park factor considering batter handedness
 */
export function getEffectiveParkFactor(
  parkFactors: ParkFactors,
  batterHand: 'L' | 'R' | 'S'
): number {
  // Switch hitters: use average of both
  if (batterHand === 'S') {
    const leftFactor = (parkFactors.leftHandedHR + parkFactors.leftHandedAVG) / 2;
    const rightFactor = (parkFactors.rightHandedHR + parkFactors.rightHandedAVG) / 2;
    return (leftFactor + rightFactor) / 2;
  }

  // Use handedness-specific factor, blended with overall
  const handedFactor = batterHand === 'L'
    ? (parkFactors.leftHandedHR + parkFactors.leftHandedAVG) / 2
    : (parkFactors.rightHandedHR + parkFactors.rightHandedAVG) / 2;

  // Blend: 60% handedness-specific, 40% overall runs factor
  return (handedFactor * 0.6) + (parkFactors.runs * 0.4);
}

/**
 * Apply park factor adjustment to wRAA
 * Park factor > 1.0 = hitter's park (reduce credit)
 * Park factor < 1.0 = pitcher's park (increase credit)
 */
export function applyParkFactor(
  wRAA: number,
  homePA: number,
  parkFactor: number,
  leagueRunsPerPA: number
): number {
  // Only adjust home plate appearances
  const parkAdjustment = (leagueRunsPerPA - (parkFactor * leagueRunsPerPA)) * homePA;
  return wRAA + parkAdjustment;
}

/**
 * Apply park factor for multi-team player
 */
export function applyMultiTeamParkFactor(
  wRAA: number,
  stints: TeamStint[],
  getParkFactors: (teamId: string) => ParkFactors,
  batterHand: 'L' | 'R' | 'S',
  leagueRunsPerPA: number
): number {
  let totalAdjustment = 0;

  for (const stint of stints) {
    const parkFactors = getParkFactors(stint.teamId);
    const effectivePF = getEffectiveParkFactor(parkFactors, batterHand);
    const stintAdjustment = (leagueRunsPerPA - (effectivePF * leagueRunsPerPA)) * stint.homePA;
    totalAdjustment += stintAdjustment;
  }

  return wRAA + totalAdjustment;
}

// ============================================
// REPLACEMENT LEVEL
// ============================================

/**
 * Calculate replacement level runs to add
 * Replacement level = runs a freely-available player would produce
 * Per ADAPTIVE_STANDARDS_ENGINE_SPEC.md: SMB4 replacement is -12.0 runs per 600 PA
 */
export function getReplacementLevelRuns(
  plateAppearances: number,
  replacementRunsPer600PA: number = SMB4_BASELINES.replacementRunsPer600PA
): number {
  const STANDARD_PA = 600;
  // replacementRunsPer600PA is negative (e.g., -12.0)
  // We return a positive number to ADD to batting runs
  return (plateAppearances / STANDARD_PA) * Math.abs(replacementRunsPer600PA);
}

// ============================================
// RUNS PER WIN
// ============================================

/**
 * Calculate runs per win for a given season length
 * Per FWAR_CALCULATION_SPEC.md Section 2:
 * MLB: 162 games = 10 RPW. Shorter seasons = fewer runs per win.
 * Each run has MORE impact on win% in shorter seasons.
 *
 * Formula: RPW = 10 × (seasonGames / 162)
 */
export function getRunsPerWin(seasonGames: number): number {
  const MLB_GAMES = 162;
  const MLB_RUNS_PER_WIN = 10;
  return MLB_RUNS_PER_WIN * (seasonGames / MLB_GAMES);
}

// ============================================
// COMPLETE bWAR CALCULATION
// ============================================

/**
 * Calculate complete bWAR with all components
 */
export function calculateBWAR(
  stats: BattingStatsForWAR,
  context: LeagueContext,
  options: {
    parkFactors?: ParkFactors;
    batterHand?: 'L' | 'R' | 'S';
  } = {}
): BWARResult {
  const { seasonGames, leagueWOBA, wobaScale, wobaWeights, runsPerPA, replacementRunsPer600PA, runsPerWin } = context;

  // Step 1: Calculate wOBA
  const wOBA = calculateWOBA(stats, wobaWeights);

  // Step 2: Calculate wRAA
  const wRAA = calculateWRAA(wOBA, stats.pa, leagueWOBA, wobaScale);

  // Step 3: Apply park factor adjustment (if available)
  let parkAdjustment = 0;
  let battingRuns = wRAA;

  if (options.parkFactors && options.parkFactors.confidence !== 'LOW' && options.batterHand) {
    const effectivePF = getEffectiveParkFactor(options.parkFactors, options.batterHand);
    const homePA = stats.homePA ?? Math.floor(stats.pa / 2);  // Assume 50% home if not tracked
    parkAdjustment = (runsPerPA - (effectivePF * runsPerPA)) * homePA;
    battingRuns = wRAA + parkAdjustment;
  }

  // Step 4: League adjustment (placeholder - used for multi-league setups)
  const leagueAdjustment = 0;

  // Step 5: Add replacement level runs
  const replacementRuns = getReplacementLevelRuns(stats.pa, replacementRunsPer600PA);
  const runsAboveReplacement = battingRuns + replacementRuns;

  // Step 6: Convert to wins
  const bWAR = runsAboveReplacement / runsPerWin;

  return {
    wOBA,
    wRAA,
    battingRuns,
    parkAdjustment,
    leagueAdjustment,
    replacementRuns,
    runsAboveReplacement,
    runsPerWin,
    bWAR,
    plateAppearances: stats.pa,
    seasonGames,
  };
}

/**
 * Simplified bWAR calculation (no park/league adjustments)
 * Use this for early seasons before calibration
 */
export function calculateBWARSimplified(
  stats: BattingStatsForWAR,
  seasonGames: number
): BWARResult {
  const context = createDefaultLeagueContext('default', seasonGames);
  return calculateBWAR(stats, context);
}

// ============================================
// BATCH CALCULATION
// ============================================

/**
 * Calculate bWAR for multiple players
 */
export function calculateBWARBatch(
  playerStats: Array<{ playerId: string; stats: BattingStatsForWAR }>,
  context: LeagueContext
): Map<string, BWARResult> {
  const results = new Map<string, BWARResult>();

  for (const { playerId, stats } of playerStats) {
    results.set(playerId, calculateBWAR(stats, context));
  }

  return results;
}

// ============================================
// CALIBRATION HELPERS
// ============================================

/**
 * Calculate league-wide wOBA from aggregate stats
 * Used for calibrating league context
 */
export function calculateLeagueWOBA(
  aggregateStats: BattingStatsForWAR,
  weights: WOBAWeights = SMB4_WOBA_WEIGHTS
): number {
  return calculateWOBA(aggregateStats, weights);
}

/**
 * Recalibrate linear weights based on league run environment
 * Per Jester GUTS methodology: rOut = R/Outs, derive others from rOut
 */
export function recalibrateWeights(
  leagueRunsPerOut: number
): WOBAWeights {
  // Jester method: derive from rOut
  const rOut = leagueRunsPerOut;
  const rBB = rOut + 0.14;
  const rHBP = rBB + 0.025;
  const r1B = rOut + 0.14 + 0.155;
  const r2B = r1B + 0.30;
  const r3B = r2B + 0.27;
  const rHR = 1.40;  // Fixed

  // Convert to wOBA weights using wOBAscale
  const wobaScale = SMB4_BASELINES.wobaScale;

  return {
    uBB: rBB * wobaScale,
    HBP: rHBP * wobaScale,
    single: r1B * wobaScale,
    double: r2B * wobaScale,
    triple: r3B * wobaScale,
    homeRun: rHR * wobaScale,
  };
}

/**
 * Recalibrate replacement level based on bottom tier of players
 */
export function recalibrateReplacementLevel(
  allPlayerStats: Array<{ pa: number; wRAA: number }>,
  minPAPercentage: number = 0.03  // Minimum 3% of league PA to qualify
): number {
  // Find qualified players
  const totalPA = allPlayerStats.reduce((sum, p) => sum + p.pa, 0);
  const minPA = totalPA * minPAPercentage;
  const qualified = allPlayerStats.filter(p => p.pa >= minPA);

  if (qualified.length < 10) {
    // Not enough data, use SMB4 default
    return SMB4_BASELINES.replacementRunsPer600PA;
  }

  // Sort by wRAA (worst first)
  qualified.sort((a, b) => a.wRAA - b.wRAA);

  // Take bottom 20% as "replacement tier"
  const replacementTier = qualified.slice(0, Math.ceil(qualified.length * 0.2));

  // Calculate average wRAA per 600 PA for replacement tier
  const avgWRAA = replacementTier.reduce((sum, p) => sum + p.wRAA, 0) / replacementTier.length;
  const avgPA = replacementTier.reduce((sum, p) => sum + p.pa, 0) / replacementTier.length;

  return (avgWRAA / avgPA) * 600;  // Will be negative
}

// ============================================
// DISPLAY HELPERS
// ============================================

/**
 * Format wOBA for display (3 decimal places)
 */
export function formatWOBA(woba: number): string {
  return woba.toFixed(3).replace(/^0/, '');  // ".320" not "0.320"
}

/**
 * Format WAR for display (1 decimal place)
 */
export function formatWAR(war: number): string {
  const sign = war >= 0 ? '' : '';  // No + prefix, just show negative
  return `${sign}${war.toFixed(1)}`;
}

/**
 * Format runs for display (1 decimal place)
 */
export function formatRuns(runs: number): string {
  const sign = runs >= 0 ? '+' : '';
  return `${sign}${runs.toFixed(1)}`;
}
