/**
 * Win Probability Added (WPA) Calculator
 * Per DATA_INTEGRITY_FIX_PLAN_v2.md MAJ-12
 *
 * WPA measures the change in win probability caused by each play.
 *   WPA = WP_after - WP_before
 *
 * Positive WPA = play helped the batting team
 * Negative WPA = play hurt the batting team
 *
 * The values stored in AtBatEvent are from the HOME TEAM's perspective:
 *   winProbabilityBefore: Home team WP before the play
 *   winProbabilityAfter:  Home team WP after the play
 *   wpa: Change in WP from the BATTING TEAM's perspective
 *        (positive = good for batter, even if batter is away team)
 *
 * Reference: https://www.fangraphs.com/library/misc/wpa/
 */

import { type RunnersOnBase, encodeBaseState, type BaseState } from './leverageCalculator';
import { getWinExpectancy, type WEGameState } from './winExpectancyTable';

// ============================================
// TYPES
// ============================================

/**
 * State before a play (from the game state at time of at-bat)
 */
export interface WPAStateBefore {
  inning: number;
  isTop: boolean;
  outs: number;
  bases: { first: boolean; second: boolean; third: boolean };
  homeScore: number;
  awayScore: number;
  totalInnings?: number;
}

/**
 * State after a play (computed from play result)
 */
export interface WPAStateAfter {
  outs: number;          // Outs after the play (may trigger inning change)
  bases: { first: boolean; second: boolean; third: boolean };
  homeScore: number;
  awayScore: number;
}

/**
 * WPA calculation result
 */
export interface WPAResult {
  /** Home team win probability before the play [0.01, 0.99] */
  winProbabilityBefore: number;
  /** Home team win probability after the play [0.00, 1.00] */
  winProbabilityAfter: number;
  /** WPA from batting team's perspective (positive = good for batter) */
  wpa: number;
}

// ============================================
// CORE WPA CALCULATION
// ============================================

/**
 * Calculate WPA for a play.
 *
 * @param before - Game state before the play
 * @param after  - Game state after the play
 * @returns WPA result with win probabilities and WPA value
 */
export function calculateWPA(
  before: WPAStateBefore,
  after: WPAStateAfter
): WPAResult {
  const totalInnings = before.totalInnings ?? 9;
  const isHomeBatting = !before.isTop;

  // --- State BEFORE ---
  const wpBefore = getWinExpectancy({
    inning: before.inning,
    isTop: before.isTop,
    outs: Math.min(before.outs, 2) as 0 | 1 | 2,
    baseState: encodeBaseState(before.bases),
    homeScore: before.homeScore,
    awayScore: before.awayScore,
    totalInnings,
  });

  // --- State AFTER ---
  // Check for game-ending scenarios first
  let wpAfter: number;

  // Walk-off: bottom of final inning or later, home takes the lead
  if (isHomeBatting && before.inning >= totalInnings && after.homeScore > after.awayScore) {
    wpAfter = 1.0;
  }
  // 3 outs: inning over, switch halves
  else if (after.outs >= 3) {
    // After 3 outs, we move to the next half-inning
    if (before.isTop) {
      // Top of inning over → bottom of same inning starts
      // Check if game is over (bottom of 9+, home ahead)
      if (before.inning >= totalInnings && after.homeScore > after.awayScore) {
        // Home already ahead going to bottom, but home doesn't bat — game over, home wins
        // Actually: if top of 9+ just ended and home leads, game IS over
        wpAfter = 1.0;
      } else {
        wpAfter = getWinExpectancy({
          inning: before.inning,
          isTop: false, // Now bottom
          outs: 0,
          baseState: 0 as BaseState, // Empty
          homeScore: after.homeScore,
          awayScore: after.awayScore,
          totalInnings,
        });
      }
    } else {
      // Bottom of inning over → top of next inning starts
      // Check if game is over
      if (before.inning >= totalInnings && after.awayScore > after.homeScore) {
        // Away team leads after regulation → away wins
        wpAfter = 0.0;
      } else if (before.inning >= totalInnings && after.homeScore > after.awayScore) {
        // Home leads after bottom of 9+ → home wins
        wpAfter = 1.0;
      } else {
        // Game continues to next inning
        wpAfter = getWinExpectancy({
          inning: before.inning + 1,
          isTop: true, // Next inning, top
          outs: 0,
          baseState: 0 as BaseState, // Empty
          homeScore: after.homeScore,
          awayScore: after.awayScore,
          totalInnings,
        });
      }
    }
  }
  // Normal mid-inning state
  else {
    wpAfter = getWinExpectancy({
      inning: before.inning,
      isTop: before.isTop,
      outs: Math.min(after.outs, 2) as 0 | 1 | 2,
      baseState: encodeBaseState(after.bases),
      homeScore: after.homeScore,
      awayScore: after.awayScore,
      totalInnings,
    });
  }

  // WPA from batting team's perspective
  // If home is batting, WPA = wpAfter - wpBefore (positive change = good)
  // If away is batting, WPA = wpBefore - wpAfter (home WP went down = good for away)
  const wpa = isHomeBatting
    ? wpAfter - wpBefore
    : wpBefore - wpAfter;

  return {
    winProbabilityBefore: wpBefore,
    winProbabilityAfter: wpAfter,
    wpa: Math.round(wpa * 10000) / 10000, // Round to 4 decimal places
  };
}

// ============================================
// CONVENIENCE FUNCTIONS
// ============================================

/**
 * Calculate WPA for a hit play.
 * Handles the common pattern where batter reaches base and possibly scores runs.
 */
export function calculateHitWPA(
  inning: number,
  isTop: boolean,
  outs: number,
  basesBefore: { first: boolean; second: boolean; third: boolean },
  basesAfter: { first: boolean; second: boolean; third: boolean },
  homeScore: number,
  awayScore: number,
  runsScored: number,
  totalInnings?: number
): WPAResult {
  return calculateWPA(
    { inning, isTop, outs, bases: basesBefore, homeScore, awayScore, totalInnings },
    {
      outs,
      bases: basesAfter,
      homeScore: isTop ? homeScore : homeScore + runsScored,
      awayScore: isTop ? awayScore + runsScored : awayScore,
    }
  );
}

/**
 * Calculate WPA for an out play.
 * Handles outs that may include runner advancement and/or runs scored.
 */
export function calculateOutWPA(
  inning: number,
  isTop: boolean,
  outsBefore: number,
  outsAfter: number,
  basesBefore: { first: boolean; second: boolean; third: boolean },
  basesAfter: { first: boolean; second: boolean; third: boolean },
  homeScore: number,
  awayScore: number,
  runsScored: number,
  totalInnings?: number
): WPAResult {
  return calculateWPA(
    { inning, isTop, outs: outsBefore, bases: basesBefore, homeScore, awayScore, totalInnings },
    {
      outs: outsAfter,
      bases: basesAfter,
      homeScore: isTop ? homeScore : homeScore + runsScored,
      awayScore: isTop ? awayScore + runsScored : awayScore,
    }
  );
}

/**
 * Calculate WPA for a walk/HBP.
 * Batter reaches first, runners advance if forced.
 */
export function calculateWalkWPA(
  inning: number,
  isTop: boolean,
  outs: number,
  basesBefore: { first: boolean; second: boolean; third: boolean },
  basesAfter: { first: boolean; second: boolean; third: boolean },
  homeScore: number,
  awayScore: number,
  runsScored: number,
  totalInnings?: number
): WPAResult {
  return calculateWPA(
    { inning, isTop, outs, bases: basesBefore, homeScore, awayScore, totalInnings },
    {
      outs,
      bases: basesAfter,
      homeScore: isTop ? homeScore : homeScore + runsScored,
      awayScore: isTop ? awayScore + runsScored : awayScore,
    }
  );
}

// ============================================
// WPA FORMATTING
// ============================================

/**
 * Format WPA for display (e.g., "+0.073" or "-0.041")
 */
export function formatWPA(wpa: number, precision: number = 3): string {
  const sign = wpa >= 0 ? '+' : '';
  return `${sign}${wpa.toFixed(precision)}`;
}

/**
 * Get display color for WPA value
 */
export function getWPAColor(wpa: number): string {
  if (wpa > 0.1) return '#22c55e';   // Green - significant positive
  if (wpa > 0) return '#4ade80';     // Light green - positive
  if (wpa === 0) return '#9ca3af';   // Gray - neutral
  if (wpa > -0.1) return '#f87171';  // Light red - negative
  return '#ef4444';                   // Red - significant negative
}

/**
 * Format win probability percentage for display (e.g., "65.3%")
 */
export function formatWP(wp: number, precision: number = 1): string {
  return `${(wp * 100).toFixed(precision)}%`;
}
