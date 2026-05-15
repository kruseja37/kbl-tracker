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

import { calculateWpaV2, WPA_MODEL_VERSION } from "./wpaV2";

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
  /** Versioned official WPA model used for reproducible storage. */
  wpaModelVersion: string;
  /** Explicit home-team delta before storage/display rounding. */
  homeDelta: number;
  /** Explicit batting-team delta before storage/display rounding. */
  battingTeamDelta: number;
  /** Explicit fielding-team delta before storage/display rounding. */
  fieldingTeamDelta: number;
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
  const result = calculateWpaV2(
    {
      inning: before.inning,
      halfInning: before.isTop ? "TOP" : "BOTTOM",
      outs: Math.min(Math.max(before.outs, 0), 2) as 0 | 1 | 2,
      bases: before.bases,
      homeScore: before.homeScore,
      awayScore: before.awayScore,
      scheduledInnings: totalInnings,
    },
    after,
  );

  return {
    winProbabilityBefore: roundProbability(result.homeWinProbabilityBefore),
    winProbabilityAfter: roundProbability(result.homeWinProbabilityAfter),
    wpa: roundWpa(result.battingTeamDelta),
    wpaModelVersion: WPA_MODEL_VERSION,
    homeDelta: roundWpa(result.homeDelta),
    battingTeamDelta: roundWpa(result.battingTeamDelta),
    fieldingTeamDelta: roundWpa(result.fieldingTeamDelta),
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

function roundWpa(value: number): number {
  return Math.round(value * 10000) / 10000;
}

function roundProbability(value: number): number {
  return Math.round(value * 10000) / 10000;
}
