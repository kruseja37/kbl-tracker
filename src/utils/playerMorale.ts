/**
 * Player Morale Display Utilities
 * Per KBL_XHD_TRACKER_MASTER_SPEC_v3.md - Player Morale System
 *
 * Morale is a 0-99 scale displayed as colored superscript next to player names.
 * Example: "Mike Trout⁷⁸" in green
 *
 * This is DISTINCT from Mojo (-2 to +2) which is a short-term confidence system.
 * Morale is a longer-term satisfaction/happiness metric affected by:
 * - Playing time
 * - Team success
 * - Awards
 * - Trades
 * - Salary
 * - Personality (each has a baseline)
 */

// ============================================
// SUPERSCRIPT CONVERSION
// ============================================

const SUPERSCRIPT_DIGITS: Record<string, string> = {
  '0': '⁰',
  '1': '¹',
  '2': '²',
  '3': '³',
  '4': '⁴',
  '5': '⁵',
  '6': '⁶',
  '7': '⁷',
  '8': '⁸',
  '9': '⁹',
};

/**
 * Convert a number to Unicode superscript digits
 * e.g., 78 → "⁷⁸"
 */
export function toSuperscript(num: number): string {
  const str = Math.round(num).toString();
  return str.split('').map(digit => SUPERSCRIPT_DIGITS[digit] || digit).join('');
}

// ============================================
// MORALE COLOR CODING
// ============================================

/**
 * Get color for morale value
 * Based on spec thresholds:
 * - 80-99: Ecstatic (green)
 * - 60-79: Happy (light green)
 * - 40-59: Neutral (gray)
 * - 20-39: Unhappy (orange)
 * - 0-19: Miserable (red)
 */
export function getMoraleColor(morale: number): string {
  if (morale >= 80) return '#22c55e'; // Ecstatic - bright green
  if (morale >= 60) return '#4ade80'; // Happy - light green
  if (morale >= 40) return '#9ca3af'; // Neutral - gray
  if (morale >= 20) return '#f97316'; // Unhappy - orange
  return '#ef4444'; // Miserable - red
}

/**
 * Get morale state description
 */
export function getMoraleState(morale: number): string {
  if (morale >= 80) return 'Ecstatic';
  if (morale >= 60) return 'Happy';
  if (morale >= 40) return 'Content';
  if (morale >= 20) return 'Unhappy';
  return 'Miserable';
}

// ============================================
// PERSONALITY BASELINES
// ============================================

/**
 * Per spec, each personality has a morale baseline
 */
const PERSONALITY_BASELINES: Record<string, number> = {
  'JOLLY': 60,
  'TOUGH': 45,
  'ECCENTRIC': 50,
  'NORMAL': 50,
  'GRUMPY': 35,
  'FIERY': 45,
  'DISCIPLINED': 50,
  'SPIRITED': 55,
  'CRAFTY': 48,
  'GRITTY': 45,
};

/**
 * Get baseline morale for a personality type
 * Defaults to 50 if personality not found
 */
export function getBaselineMorale(personality?: string): number {
  if (!personality) return 50;
  return PERSONALITY_BASELINES[personality.toUpperCase()] ?? 50;
}

// ============================================
// MORALE DISPLAY
// ============================================

export interface MoraleDisplay {
  superscript: string;
  color: string;
  value: number;
  state: string;
}

/**
 * Get complete morale display data for a player
 * Per spec: getMoraleDisplay(player)
 */
export function getMoraleDisplay(morale: number): MoraleDisplay {
  // Clamp morale to 0-99
  const clampedMorale = Math.max(0, Math.min(99, morale));

  return {
    superscript: toSuperscript(clampedMorale),
    color: getMoraleColor(clampedMorale),
    value: clampedMorale,
    state: getMoraleState(clampedMorale),
  };
}

/**
 * Get placeholder morale for a player (used until full morale tracking is implemented)
 * Uses personality baseline if available, otherwise defaults to 50
 */
export function getPlaceholderMorale(personality?: string): number {
  return getBaselineMorale(personality);
}
