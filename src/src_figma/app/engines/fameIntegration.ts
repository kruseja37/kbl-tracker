/**
 * Fame System Integration
 *
 * Per FIGMA_IMPLEMENTATION_PLAN.md Phase 4
 *
 * This module integrates the legacy Fame engine with the Figma GameTracker.
 * Provides simplified interfaces for:
 * - LI-weighted Fame calculation
 * - Career/Season milestone detection
 * - Fame accumulation tracking
 * - UI-friendly Fame event formatting
 */

// ============================================
// RE-EXPORT CORE FAME ENGINE FUNCTIONS
// ============================================

export {
  // Fame calculation
  calculateFame,
  getLIMultiplier,
  getPlayoffMultiplier,
  getFameTier,

  // Career milestone detection
  detectCareerMilestones,
  detectCareerNegativeMilestones,

  // Season milestone detection
  detectSeasonMilestones,
  detectSeasonNegativeMilestones,

  // First career detection
  detectFirstCareer,

  // Types
  type CareerStats,
  type SeasonStats,
  type MilestoneResult,
  type FameResult,

  // Fame values
  FAME_VALUES,

  // Threshold constants (MLB baseline - scaled at runtime)
  CAREER_THRESHOLDS,
  CAREER_NEGATIVE_THRESHOLDS,
  SEASON_THRESHOLDS,
} from '../../../engines/fameEngine';

// Import FameEventType and related from game types
import type { FameEventType, FameTarget } from '../../../types/game';
import { FAME_VALUES, FAME_EVENT_LABELS, FAME_TARGET } from '../../../types/game';
import {
  calculateFame,
  getLIMultiplier,
  getFameTier,
  type FameResult,
} from '../../../engines/fameEngine';

// ============================================
// FIGMA-SPECIFIC TYPES
// ============================================

/**
 * UI-friendly Fame event display
 */
export interface FameEventDisplay {
  eventType: FameEventType;
  icon: string;
  label: string;
  description: string;
  baseFame: number;
  finalFame: number;
  liMultiplier: number;
  playoffMultiplier: number;
  isBonus: boolean;
  isBoner: boolean;
  attribution: FameTarget;
}

/**
 * Player Fame summary for display
 */
export interface PlayerFameSummary {
  playerId: string;
  playerName: string;
  totalFame: number;
  gameFame: number;
  seasonFame: number;
  tier: {
    tier: string;
    label: string;
    minFame: number;
    maxFame: number;
  };
  recentEvents: FameEventDisplay[];
}

// ============================================
// ICON MAPPING
// ============================================

/**
 * Icons for Fame events (for UI display)
 */
const FAME_ICONS: Partial<Record<FameEventType, string>> = {
  // Walk-Off Events
  WALK_OFF: '🏆',
  WALK_OFF_HR: '🎆',
  WALK_OFF_GRAND_SLAM: '💥',

  // Defensive Highlights
  WEB_GEM: '✨',
  ROBBERY: '🔥',
  ROBBERY_GRAND_SLAM: '🔥🔥',
  TRIPLE_PLAY: '🎉',
  UNASSISTED_TRIPLE_PLAY: '🎉🎉',
  THROW_OUT_AT_HOME: '🎯',

  // Home Run Events
  INSIDE_PARK_HR: '🏃',
  LEADOFF_HR: '⚡',
  PINCH_HIT_HR: '💪',
  GO_AHEAD_HR: '📈',
  GRAND_SLAM: '💣',
  CLUTCH_GRAND_SLAM: '🎆',

  // Multi-Hit Events
  CYCLE: '🔄',
  NATURAL_CYCLE: '🌟',
  MULTI_HR_2: '💪',
  MULTI_HR_3: '💪💪',
  MULTI_HR_4PLUS: '🦾',
  BACK_TO_BACK_HR: '🎯🎯',
  BACK_TO_BACK_TO_BACK_HR: '🎯🎯🎯',

  // Pitching Excellence
  NO_HITTER: '⭐',
  PERFECT_GAME: '🌟',
  MADDUX: '🎩',
  COMPLETE_GAME: '💪',
  SHUTOUT: '🔒',
  IMMACULATE_INNING: '✨',
  ESCAPE_ARTIST: '🎩',

  // SMB4 Special Events
  NUT_SHOT_DELIVERED: '🥜',
  NUT_SHOT_TOUGH_GUY: '💪',
  KILLED_PITCHER: '💥',

  // Negative Events (Boners)
  HAT_TRICK: '🎩',
  GOLDEN_SOMBRERO: '🎩',
  PLATINUM_SOMBRERO: '🎩',
  TITANIUM_SOMBRERO: '🎩',
  TOOTBLAN: '🤦',
  TOOTBLAN_RALLY_KILLER: '🤦',
  BLOWN_SAVE: '💔',
  BLOWN_SAVE_LOSS: '💔💔',
  MELTDOWN: '🔥',
  MELTDOWN_SEVERE: '🔥🔥',
  DROPPED_FLY: '😱',
  BOOTED_GROUNDER: '😱',
  HIT_INTO_TRIPLE_PLAY: '💀',
  NUT_SHOT_VICTIM: '🥜',
  RALLY_KILLER: '🛑',

  // Milestones
  FIRST_CAREER: '🎉',
  CAREER_MILESTONE: '📈',
  SEASON_TRIPLE_CROWN: '👑',
  SEASON_PITCHING_TRIPLE_CROWN: '👑',
};

/**
 * Get icon for a Fame event
 */
export function getFameIcon(eventType: FameEventType): string {
  return FAME_ICONS[eventType] || '⚾';
}

// ============================================
// FAME EVENT FORMATTING
// ============================================

/**
 * Format a Fame event for UI display
 */
export function formatFameEvent(
  eventType: FameEventType,
  leverageIndex: number = 1.0,
  playoffContext?: {
    isPlayoffs: boolean;
    round?: 'wild_card' | 'division_series' | 'championship_series' | 'world_series';
    isEliminationGame?: boolean;
    isClinchGame?: boolean;
  }
): FameEventDisplay {
  const result = calculateFame(eventType, leverageIndex, playoffContext);

  return {
    eventType,
    icon: getFameIcon(eventType),
    label: eventType.replace(/_/g, ' '),
    description: FAME_EVENT_LABELS[eventType] || eventType,
    baseFame: result.baseFame,
    finalFame: result.finalFame,
    liMultiplier: result.liMultiplier,
    playoffMultiplier: result.playoffMultiplier,
    isBonus: result.isBonus,
    isBoner: result.isBoner,
    attribution: FAME_TARGET[eventType] || 'player',
  };
}

/**
 * Format Fame value for display (with sign)
 */
export function formatFameValue(fame: number, decimals: number = 1): string {
  const formatted = Math.abs(fame).toFixed(decimals);
  if (fame > 0) return `+${formatted}`;
  if (fame < 0) return `-${formatted}`;
  return formatted;
}

/**
 * Get color for Fame value (for UI styling)
 */
export function getFameColor(fame: number): string {
  if (fame > 0) return '#5A8352'; // Green - bonus
  if (fame < 0) return '#DD0000'; // Red - boner
  return '#808080'; // Gray - neutral
}

/**
 * Get tier color (for UI styling)
 */
export function getTierColor(tier: string): string {
  const colors: Record<string, string> = {
    LEGENDARY: '#FFD700',    // Gold
    SUPERSTAR: '#5599FF',    // Blue
    STAR: '#5A8352',         // Green
    FAN_FAVORITE: '#AA6600', // Orange
    KNOWN: '#808080',        // Gray
    UNKNOWN: '#555555',      // Dark gray
    DISLIKED: '#AA6600',     // Orange
    VILLAIN: '#DD0000',      // Red
    NOTORIOUS: '#8B0000',    // Dark red
  };
  return colors[tier] || '#808080';
}

// ============================================
// GAME FAME TRACKING
// ============================================

/**
 * Track Fame events during a game
 */
export interface GameFameTracker {
  gameId: string;
  events: Array<{
    eventType: FameEventType;
    playerId: string;
    playerName: string;
    result: FameResult;
    inning: number;
    halfInning: 'TOP' | 'BOTTOM';
    timestamp: number;
  }>;
}

/**
 * Create a new game Fame tracker
 */
export function createGameFameTracker(gameId: string): GameFameTracker {
  return {
    gameId,
    events: [],
  };
}

/**
 * Add a Fame event to the tracker
 */
export function addFameEvent(
  tracker: GameFameTracker,
  eventType: FameEventType,
  playerId: string,
  playerName: string,
  inning: number,
  halfInning: 'TOP' | 'BOTTOM',
  leverageIndex: number = 1.0,
  playoffContext?: Parameters<typeof calculateFame>[2]
): GameFameTracker {
  const result = calculateFame(eventType, leverageIndex, playoffContext);

  return {
    ...tracker,
    events: [
      ...tracker.events,
      {
        eventType,
        playerId,
        playerName,
        result,
        inning,
        halfInning,
        timestamp: Date.now(),
      },
    ],
  };
}

/**
 * Get total Fame for a player in a game
 */
export function getPlayerGameFame(tracker: GameFameTracker, playerId: string): number {
  return tracker.events
    .filter(e => e.playerId === playerId)
    .reduce((sum, e) => sum + e.result.finalFame, 0);
}

/**
 * Get Fame events for a player in a game
 */
export function getPlayerGameEvents(
  tracker: GameFameTracker,
  playerId: string
): FameEventDisplay[] {
  return tracker.events
    .filter(e => e.playerId === playerId)
    .map(e => ({
      eventType: e.eventType,
      icon: getFameIcon(e.eventType),
      label: e.eventType.replace(/_/g, ' '),
      description: FAME_EVENT_LABELS[e.eventType] || e.eventType,
      baseFame: e.result.baseFame,
      finalFame: e.result.finalFame,
      liMultiplier: e.result.liMultiplier,
      playoffMultiplier: e.result.playoffMultiplier,
      isBonus: e.result.isBonus,
      isBoner: e.result.isBoner,
      attribution: FAME_TARGET[e.eventType] || 'player',
    }));
}

/**
 * Get game Fame summary for all players
 */
export function getGameFameSummary(
  tracker: GameFameTracker
): Array<{ playerId: string; playerName: string; totalFame: number; eventCount: number }> {
  const playerMap = new Map<string, { playerName: string; totalFame: number; eventCount: number }>();

  for (const event of tracker.events) {
    const existing = playerMap.get(event.playerId);
    if (existing) {
      existing.totalFame += event.result.finalFame;
      existing.eventCount += 1;
    } else {
      playerMap.set(event.playerId, {
        playerName: event.playerName,
        totalFame: event.result.finalFame,
        eventCount: 1,
      });
    }
  }

  return Array.from(playerMap.entries())
    .map(([playerId, data]) => ({ playerId, ...data }))
    .sort((a, b) => b.totalFame - a.totalFame);
}

// ============================================
// FAME EVENT QUICK DETECTION
// ============================================

/**
 * Quick detection for strikeout-based Fame events
 */
export function detectStrikeoutFameEvent(
  strikeoutsInGame: number
): FameEventType | null {
  if (strikeoutsInGame >= 6) return 'TITANIUM_SOMBRERO';
  if (strikeoutsInGame >= 5) return 'PLATINUM_SOMBRERO';
  if (strikeoutsInGame >= 4) return 'GOLDEN_SOMBRERO';
  if (strikeoutsInGame >= 3) return 'HAT_TRICK';
  return null;
}

/**
 * Quick detection for multi-HR Fame events
 */
export function detectMultiHRFameEvent(
  homeRunsInGame: number
): FameEventType | null {
  if (homeRunsInGame >= 4) return 'MULTI_HR_4PLUS';
  if (homeRunsInGame >= 3) return 'MULTI_HR_3';
  if (homeRunsInGame >= 2) return 'MULTI_HR_2';
  return null;
}

/**
 * Quick detection for multi-hit Fame events
 */
export function detectMultiHitFameEvent(
  hitsInGame: number
): FameEventType | null {
  if (hitsInGame >= 6) return 'SIX_HIT_GAME';
  if (hitsInGame >= 5) return 'FIVE_HIT_GAME';
  if (hitsInGame >= 4) return 'FOUR_HIT_GAME';
  if (hitsInGame >= 3) return 'THREE_HIT_GAME';
  return null;
}

/**
 * Quick detection for RBI Fame events
 */
export function detectRBIFameEvent(
  rbiInGame: number
): FameEventType | null {
  if (rbiInGame >= 10) return 'TEN_RBI_GAME';
  if (rbiInGame >= 8) return 'EIGHT_RBI_GAME';
  if (rbiInGame >= 5) return 'FIVE_RBI_GAME';
  return null;
}

/**
 * Quick detection for pitcher K Fame events
 */
export function detectPitcherKFameEvent(
  strikeoutsInGame: number
): FameEventType | null {
  if (strikeoutsInGame >= 15) return 'FIFTEEN_K_GAME';
  if (strikeoutsInGame >= 10) return 'TEN_K_GAME';
  return null;
}

/**
 * Quick detection for meltdown Fame events
 */
export function detectMeltdownFameEvent(
  runsAllowed: number
): FameEventType | null {
  if (runsAllowed >= 10) return 'MELTDOWN_SEVERE';
  if (runsAllowed >= 6) return 'MELTDOWN';
  return null;
}

// ============================================
// FAME LI HELPERS
// ============================================

/**
 * Describe LI multiplier effect
 */
export function describeLIEffect(leverageIndex: number): string {
  const multiplier = getLIMultiplier(leverageIndex);

  if (leverageIndex >= 4.0) return `High leverage (${multiplier.toFixed(1)}x)`;
  if (leverageIndex >= 2.0) return `Medium leverage (${multiplier.toFixed(1)}x)`;
  if (leverageIndex >= 1.0) return `Normal leverage (${multiplier.toFixed(1)}x)`;
  return `Low leverage (${multiplier.toFixed(1)}x)`;
}

/**
 * Get LI tier for display
 */
export function getLITier(leverageIndex: number): {
  label: string;
  color: string;
  multiplier: number;
} {
  const multiplier = getLIMultiplier(leverageIndex);

  if (leverageIndex >= 4.0) {
    return { label: 'HIGH LI', color: '#DD0000', multiplier };
  }
  if (leverageIndex >= 2.0) {
    return { label: 'MED LI', color: '#FFD700', multiplier };
  }
  if (leverageIndex >= 1.0) {
    return { label: 'NORM LI', color: '#5A8352', multiplier };
  }
  return { label: 'LOW LI', color: '#808080', multiplier };
}

// ============================================
// PLAYER FAME SUMMARY
// ============================================

/**
 * Create a Fame summary for a player
 */
export function createPlayerFameSummary(
  playerId: string,
  playerName: string,
  totalFame: number,
  gameFame: number,
  seasonFame: number,
  recentEvents: FameEventDisplay[] = []
): PlayerFameSummary {
  return {
    playerId,
    playerName,
    totalFame,
    gameFame,
    seasonFame,
    tier: getFameTier(totalFame),
    recentEvents,
  };
}
