/**
 * Baserunning WAR (rWAR) Calculator
 * Per RWAR_CALCULATION_SPEC.md
 *
 * Calculates baserunning value from three components:
 * - wSB: Weighted Stolen Base Runs
 * - UBR: Ultimate Base Running (extra base taking)
 * - wGDP: Weighted Grounded into Double Play Runs
 *
 * BsR = wSB + UBR + wGDP
 * rWAR = BsR / Runs Per Win
 */

import { SMB4_BASELINES } from '../types/war';

// ============================================
// CONSTANTS
// ============================================

/**
 * Stolen base run values
 */
export const STOLEN_BASE_VALUES = {
  SB: 0.20,       // Run value of successful steal
  CS: -0.45,      // Run value of caught stealing (baseline)

  /**
   * CS penalty adjusts with run environment
   * Higher scoring = outs less costly = CS less bad
   */
  getCSValue(runsPerGame: number): number {
    const baseRunsPerOut = runsPerGame / 27;  // ~0.17 for 4.5 R/G
    return -2 * baseRunsPerOut - 0.075;        // FanGraphs formula
  },
};

/**
 * Extra base taking (advancement) run values
 */
export const ADVANCEMENT_VALUES = {
  // Extra base taken (beyond minimum required)
  firstToThird_onSingle: 0.40,
  firstToHome_onDouble: 0.45,
  secondToHome_onSingle: 0.55,
  secondToHome_onFlyOut: 0.45,
  thirdToHome_onFlyOut: 0.45,
  firstToSecond_onFlyOut: 0.25,

  // Being thrown out (run value of losing runner + out)
  thrownOut_advancing: -0.65,
  thrownOut_overrunning: -0.70,
  thrownOut_tagUp: -0.60,

  // Pickoffs
  pickedOff_first: -0.45,
  pickedOff_second: -0.55,
  pickedOff_third: -0.70,
};

/**
 * Double play values
 */
export const GIDP_VALUES = {
  runCost: -0.44,  // Run cost of hitting into DP vs. avoiding it
};

// ============================================
// TYPES
// ============================================

/**
 * Stats required for wSB calculation
 */
export interface StolenBaseStats {
  stolenBases: number;
  caughtStealing: number;
  singles: number;
  walks: number;
  hitByPitch: number;
  intentionalWalks: number;
}

/**
 * Stats required for UBR calculation
 */
export interface AdvancementStats {
  firstToThird: number;        // Took 3rd on a single
  firstToHomeOnDouble: number; // Scored from 1st on a double
  secondToHomeOnSingle: number; // Scored from 2nd on a single
  tagsScored: number;          // Tag up and scored on fly out
  thrownOutAdvancing: number;  // Thrown out trying to take extra base
  pickedOff: number;           // Picked off
  advancementOpportunities: number; // Total opportunities to take extra base
}

/**
 * Stats required for wGDP calculation
 */
export interface GIDPStats {
  gidp: number;                // Grounded into double play
  gidpOpportunities: number;   // AB with runner on 1st, less than 2 outs
}

/**
 * Combined stats for full rWAR calculation
 */
export interface BaserunningStats extends StolenBaseStats, Partial<AdvancementStats>, GIDPStats {
  // Player speed rating (0-100) for UBR estimation when tracking is incomplete
  speedRating?: number;
  plateAppearances?: number;
}

/**
 * League stats for comparison
 */
export interface LeagueBaserunningStats {
  runsPerGame: number;
  totalSB: number;
  totalCS: number;
  totalSingles: number;
  totalWalks: number;
  totalHBP: number;
  totalIBB: number;
  totalGIDP: number;
  totalGIDPOpportunities: number;
  totalExtraBasesTaken: number;
  totalAdvancementOpportunities: number;
}

/**
 * Complete rWAR result breakdown
 */
export interface RWARResult {
  // Components
  wSB: number;        // Stolen base runs
  UBR: number;        // Extra base taking runs
  wGDP: number;       // DP avoidance runs

  // Combined
  BsR: number;        // Total baserunning runs

  // Final WAR
  rWAR: number;

  // Context
  runsPerWin: number;
  seasonGames: number;

  // Breakdown flags
  ubrEstimated: boolean;  // True if UBR was estimated from speed rating
}

// ============================================
// RUNS PER WIN
// ============================================

/**
 * Get runs per win for a given season length
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
// wSB CALCULATION
// ============================================

/**
 * Calculate wSB (Weighted Stolen Base Runs)
 */
export function calculateWSB(
  stats: StolenBaseStats,
  leagueStats: LeagueBaserunningStats
): number {
  const runSB = STOLEN_BASE_VALUES.SB;
  const runCS = STOLEN_BASE_VALUES.getCSValue(leagueStats.runsPerGame);

  // Player's raw SB runs
  const playerSBRuns = (stats.stolenBases * runSB) + (stats.caughtStealing * runCS);

  // League average rate
  const lgSBRuns = (leagueStats.totalSB * runSB) + (leagueStats.totalCS * runCS);
  const lgOpportunities = leagueStats.totalSingles + leagueStats.totalWalks +
    leagueStats.totalHBP - leagueStats.totalIBB;

  if (lgOpportunities === 0) return playerSBRuns;  // Can't compare to league

  const lgwSBRate = lgSBRuns / lgOpportunities;

  // Player's opportunities (times on first base)
  const playerOpportunities = stats.singles + stats.walks + stats.hitByPitch - stats.intentionalWalks;

  // Expected vs actual
  const expectedSBRuns = lgwSBRate * playerOpportunities;
  const wSB = playerSBRuns - expectedSBRuns;

  return Math.round(wSB * 100) / 100;
}

/**
 * Simplified wSB when league stats aren't available
 * Uses break-even rate of 69% as baseline
 */
export function calculateWSBSimplified(stats: StolenBaseStats): number {
  const runSB = STOLEN_BASE_VALUES.SB;
  const runCS = STOLEN_BASE_VALUES.CS;

  // Raw runs from stolen bases
  const sbRuns = (stats.stolenBases * runSB) + (stats.caughtStealing * runCS);

  // Assume league average is ~0 (break-even)
  return Math.round(sbRuns * 100) / 100;
}

// ============================================
// UBR CALCULATION
// ============================================

/**
 * Calculate UBR (Ultimate Base Running) from tracked advancement data
 */
export function calculateUBR(
  stats: AdvancementStats,
  leagueStats: LeagueBaserunningStats
): number {
  let ubr = 0;

  // Credit for extra bases taken
  ubr += stats.firstToThird * ADVANCEMENT_VALUES.firstToThird_onSingle;
  ubr += stats.firstToHomeOnDouble * ADVANCEMENT_VALUES.firstToHome_onDouble;
  ubr += stats.secondToHomeOnSingle * ADVANCEMENT_VALUES.secondToHome_onSingle;
  ubr += stats.tagsScored * ADVANCEMENT_VALUES.thirdToHome_onFlyOut;

  // Penalty for outs on bases
  ubr += stats.thrownOutAdvancing * ADVANCEMENT_VALUES.thrownOut_advancing;
  ubr += stats.pickedOff * ADVANCEMENT_VALUES.pickedOff_first;  // Avg pickoff

  // Subtract league average advancement rate
  if (leagueStats.totalAdvancementOpportunities > 0 && stats.advancementOpportunities > 0) {
    const lgAdvancementRate = leagueStats.totalExtraBasesTaken / leagueStats.totalAdvancementOpportunities;
    const expectedExtraBases = stats.advancementOpportunities * lgAdvancementRate;
    const avgValuePerExtraBase = 0.40;  // Weighted average
    ubr -= expectedExtraBases * avgValuePerExtraBase;
  }

  return Math.round(ubr * 100) / 100;
}

/**
 * Estimate UBR from player speed rating when advancement tracking isn't available
 *
 * Per spec Section 8: Use speed rating as proxy
 * Elite speed (90+) → +3 runs
 * Average speed (50) → 0 runs
 * Slow (30) → -2 runs
 */
export function estimateUBR(
  speedRating: number,
  plateAppearances: number,
  fullSeasonPA: number = 200
): number {
  // Base UBR from speed (per full season)
  const baseUBR = (speedRating - 50) / 20;  // -1 to +2 range

  // Scale by playing time
  const playingTimeFactor = plateAppearances / fullSeasonPA;
  return Math.round(baseUBR * playingTimeFactor * 100) / 100;
}

// ============================================
// wGDP CALCULATION
// ============================================

/**
 * Calculate wGDP (Weighted Grounded into Double Play Runs)
 */
export function calculateWGDP(
  stats: GIDPStats,
  leagueStats: LeagueBaserunningStats
): number {
  // League GIDP rate
  if (leagueStats.totalGIDPOpportunities === 0) {
    // No league data - just penalize raw GIDP
    return stats.gidp * GIDP_VALUES.runCost;
  }

  const lgGIDPRate = leagueStats.totalGIDP / leagueStats.totalGIDPOpportunities;

  // Expected GIDP based on opportunities
  const expectedGIDP = stats.gidpOpportunities * lgGIDPRate;

  // Runs saved by avoiding (or lost by hitting into) DP
  const wGDP = (expectedGIDP - stats.gidp) * Math.abs(GIDP_VALUES.runCost);

  return Math.round(wGDP * 100) / 100;
}

/**
 * Simplified wGDP using standard 12% GIDP rate
 */
export function calculateWGDPSimplified(stats: GIDPStats): number {
  const lgGIDPRate = 0.12;  // League average ~12%
  const expectedGIDP = stats.gidpOpportunities * lgGIDPRate;
  const wGDP = (expectedGIDP - stats.gidp) * Math.abs(GIDP_VALUES.runCost);

  return Math.round(wGDP * 100) / 100;
}

// ============================================
// COMPLETE rWAR CALCULATION
// ============================================

/**
 * Calculate complete rWAR with all components
 */
export function calculateRWAR(
  stats: BaserunningStats,
  leagueStats: LeagueBaserunningStats,
  seasonGames: number
): RWARResult {
  // NaN guard: if any numeric input is NaN, return zero result
  if (isNaN(seasonGames) || isNaN(stats.stolenBases) || isNaN(stats.caughtStealing) ||
      isNaN(stats.gidp) || isNaN(stats.gidpOpportunities)) {
    return { wSB: 0, UBR: 0, wGDP: 0, BsR: 0, rWAR: 0,
      runsPerWin: 0, seasonGames: seasonGames || 0, ubrEstimated: true };
  }

  // Step 1: Calculate wSB
  const wSB = calculateWSB(stats, leagueStats);

  // Step 2: Calculate UBR (or estimate from speed)
  let UBR: number;
  let ubrEstimated = false;

  if (stats.firstToThird !== undefined &&
      stats.secondToHomeOnSingle !== undefined &&
      stats.advancementOpportunities !== undefined) {
    // We have advancement tracking data
    UBR = calculateUBR(stats as AdvancementStats, leagueStats);
  } else if (stats.speedRating !== undefined && stats.plateAppearances !== undefined) {
    // Estimate from speed rating
    UBR = estimateUBR(stats.speedRating, stats.plateAppearances);
    ubrEstimated = true;
  } else {
    // No data - assume average
    UBR = 0;
    ubrEstimated = true;
  }

  // Step 3: Calculate wGDP
  const wGDP = calculateWGDP(stats, leagueStats);

  // Step 4: Combine into BsR
  const BsR = wSB + UBR + wGDP;

  // Step 5: Convert to WAR
  const runsPerWin = getRunsPerWin(seasonGames);
  const rWAR = BsR / runsPerWin;

  return {
    wSB: Math.round(wSB * 100) / 100,
    UBR: Math.round(UBR * 100) / 100,
    wGDP: Math.round(wGDP * 100) / 100,
    BsR: Math.round(BsR * 100) / 100,
    rWAR: Math.round(rWAR * 100) / 100,
    runsPerWin: Math.round(runsPerWin * 100) / 100,
    seasonGames,
    ubrEstimated,
  };
}

/**
 * Simplified rWAR calculation using default league values
 */
export function calculateRWARSimplified(
  stats: BaserunningStats,
  seasonGames: number = SMB4_BASELINES.gamesPerTeam
): RWARResult {
  // Default league stats (SMB4 calibrated)
  const defaultLeagueStats: LeagueBaserunningStats = {
    runsPerGame: 4.8,
    totalSB: 200,
    totalCS: 60,
    totalSingles: 1500,
    totalWalks: 600,
    totalHBP: 80,
    totalIBB: 30,
    totalGIDP: 150,
    totalGIDPOpportunities: 1250,
    totalExtraBasesTaken: 300,
    totalAdvancementOpportunities: 1000,
  };

  return calculateRWAR(stats, defaultLeagueStats, seasonGames);
}

// ============================================
// DEFAULT LEAGUE STATS HELPER
// ============================================

/**
 * Create default league baserunning stats
 */
export function createDefaultLeagueStats(
  seasonGames: number = SMB4_BASELINES.gamesPerTeam,
  teams: number = 8
): LeagueBaserunningStats {
  // Scale based on season length
  const gameFactor = seasonGames / 50;  // 50-game baseline
  const teamFactor = teams / 8;         // 8-team baseline

  return {
    runsPerGame: 4.8,
    totalSB: Math.round(200 * gameFactor * teamFactor),
    totalCS: Math.round(60 * gameFactor * teamFactor),
    totalSingles: Math.round(1500 * gameFactor * teamFactor),
    totalWalks: Math.round(600 * gameFactor * teamFactor),
    totalHBP: Math.round(80 * gameFactor * teamFactor),
    totalIBB: Math.round(30 * gameFactor * teamFactor),
    totalGIDP: Math.round(150 * gameFactor * teamFactor),
    totalGIDPOpportunities: Math.round(1250 * gameFactor * teamFactor),
    totalExtraBasesTaken: Math.round(300 * gameFactor * teamFactor),
    totalAdvancementOpportunities: Math.round(1000 * gameFactor * teamFactor),
  };
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Get rWAR quality tier
 */
export function getRWARTier(rWAR: number): string {
  if (rWAR > 2.0) return 'Elite';
  if (rWAR > 1.0) return 'Great';
  if (rWAR > 0.3) return 'Above Average';
  if (rWAR > -0.3) return 'Average';
  if (rWAR > -1.0) return 'Below Average';
  return 'Poor';
}

/**
 * Get stolen base success rate
 */
export function getSBSuccessRate(sb: number, cs: number): number {
  if (sb + cs === 0) return 0;
  return sb / (sb + cs);
}

/**
 * Check if stolen base success rate is above break-even (~69%)
 */
export function isSBProfitable(sb: number, cs: number): boolean {
  return getSBSuccessRate(sb, cs) >= 0.69;
}

/**
 * Estimate expected rWAR from speed rating
 * Per spec Section 11 table
 */
export function estimateRWARFromSpeed(
  speedRating: number,
  seasonGames: number = 48
): { min: number; max: number } {
  const gameFactor = seasonGames / 48;

  if (speedRating >= 95) return { min: 1.5 * gameFactor, max: 2.5 * gameFactor };
  if (speedRating >= 80) return { min: 0.5 * gameFactor, max: 1.0 * gameFactor };
  if (speedRating >= 65) return { min: 0.0 * gameFactor, max: 0.5 * gameFactor };
  if (speedRating >= 50) return { min: -0.3 * gameFactor, max: 0.3 * gameFactor };
  if (speedRating >= 35) return { min: -0.5 * gameFactor, max: -1.0 * gameFactor };
  return { min: -1.0 * gameFactor, max: -1.5 * gameFactor };
}
