/**
 * Fielding WAR (fWAR) Calculator
 * Per FWAR_CALCULATION_SPEC.md
 *
 * Calculates fielding value on a per-play basis with:
 * - Position-based modifiers
 * - Difficulty multipliers for star plays
 * - Error penalties
 * - Season length scaling
 */

import { SMB4_BASELINES } from '../types/war';

// ============================================
// CONSTANTS
// ============================================

/**
 * Base run values for fielding outcomes
 */
export const FIELDING_RUN_VALUES = {
  // Successful plays (runs saved)
  putout: {
    infield: 0.03,      // Routine infield out
    outfield: 0.04,     // Routine fly out
    lineout: 0.05,      // Line drive catch (harder)
    foulout: 0.02,      // Foul territory catch
  },

  assist: {
    infield: 0.04,      // Routine throw for out
    outfield: 0.08,     // Outfield throw for out
    relay: 0.03,        // Relay throw contribution
    cutoff: 0.02,       // Cutoff throw (not final out)
  },

  doublePlay: {
    turned: 0.12,       // Pivot man on DP
    started: 0.08,      // Started the DP
    completed: 0.06,    // First baseman completing DP
    unassisted: 0.25,   // Very rare, very valuable
  },

  // Failed plays (runs cost)
  error: {
    fielding: -0.15,     // Bobble, drop, mishandle
    throwing: -0.20,     // Wild throw
    mental: -0.25,       // Wrong base, missed cutoff
    collision: -0.10,    // Bad luck, split blame
    passedBall: -0.10,   // Catcher-specific
    missed_catch: -0.18, // Failed to catch throwable ball
  },

  // Neutral
  hitAllowed: 0.00,     // Not fielder's fault
} as const;

/**
 * Position difficulty modifiers
 */
export const POSITION_MODIFIERS = {
  putout: {
    C: 1.3, SS: 1.2, CF: 1.15, '2B': 1.1, '3B': 1.1,
    RF: 1.0, LF: 0.9, '1B': 0.7, P: 0.5, DH: 0.0,
  },
  assist: {
    C: 1.4, SS: 1.2, '3B': 1.15, CF: 1.2, RF: 1.1,
    '2B': 1.0, LF: 0.9, '1B': 0.7, P: 0.6, DH: 0.0,
  },
  error: {
    C: 0.8, SS: 1.0, '3B': 1.0, '2B': 1.0,
    CF: 1.1, RF: 1.1, LF: 1.1,
    '1B': 1.2, P: 1.3, DH: 0.0,  // Errors more damaging at easier positions
  },
} as const;

/**
 * Difficulty multipliers for star plays
 */
export const DIFFICULTY_MULTIPLIERS = {
  routine: 1.0,
  charging: 1.3,     // Charging play - moderate difficulty
  running: 1.5,
  diving: 2.5,
  leaping: 2.0,
  wall: 2.5,
  robbedHR: 5.0,
  overShoulder: 2.0,
  sliding: 2.5,
} as const;

/**
 * Positional adjustments per 48 games (in runs)
 */
export const POSITIONAL_ADJUSTMENTS = {
  C: 3.7,
  SS: 2.2,
  CF: 0.7,
  '2B': 0.7,
  '3B': 0.7,
  RF: -2.2,
  LF: -2.2,
  '1B': -3.7,
  DH: -5.2,
  P: 0,
} as const;

// ============================================
// TYPES
// ============================================

export type Position = 'C' | 'SS' | 'CF' | '2B' | '3B' | 'RF' | 'LF' | '1B' | 'P' | 'DH';
export type PutoutType = 'infield' | 'outfield' | 'lineout' | 'foulout';
export type AssistType = 'infield' | 'outfield' | 'relay' | 'cutoff';
export type DPRole = 'turned' | 'started' | 'completed' | 'unassisted';
export type ErrorType = 'fielding' | 'throwing' | 'mental' | 'collision' | 'passedBall' | 'missed_catch';
export type Difficulty = 'routine' | 'charging' | 'running' | 'diving' | 'leaping' | 'wall' | 'robbedHR' | 'overShoulder' | 'sliding';

/**
 * A single fielding event
 */
export interface FieldingEvent {
  type: 'putout' | 'assist' | 'doublePlay' | 'error' | 'starPlay';
  playerId: string;
  position: Position;

  // Type-specific
  putoutType?: PutoutType;
  assistType?: AssistType;
  dpRole?: DPRole;
  errorType?: ErrorType;
  targetBase?: 'second' | 'third' | 'home';  // For OF assists

  // Difficulty
  difficulty?: Difficulty;

  // Context modifiers for errors
  allowedRun?: boolean;
  wasRoutine?: boolean;
  wasDifficult?: boolean;
  isClutch?: boolean;
}

/**
 * Complete fWAR result for a player
 */
export interface FWARResult {
  // Raw runs
  totalRunsSaved: number;
  putoutRuns: number;
  assistRuns: number;
  dpRuns: number;
  errorRuns: number;  // Negative
  starPlayRuns: number;

  // Positional adjustment
  positionalAdjustment: number;

  // Final WAR
  fWAR: number;

  // Context
  gamesPlayed: number;
  position: Position;
  seasonGames: number;
  runsPerWin: number;
}

/**
 * Per-game fielding summary
 */
export interface GameFieldingSummary {
  playerId: string;
  gameId: string;
  position: Position;
  runsSaved: number;
  fWAR: number;
  plays: number;
  errors: number;
  starPlays: number;
}

// ============================================
// RUNS PER WIN (Season Scaling)
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

/**
 * Convert runs to WAR for a season
 */
export function runsToWAR(runs: number, seasonGames: number): number {
  const rpw = getRunsPerWin(seasonGames);
  return runs / rpw;
}

// ============================================
// PER-PLAY CALCULATIONS
// ============================================

/**
 * Calculate run value for a putout
 */
export function calculatePutoutValue(
  putoutType: PutoutType,
  position: Position,
  difficulty: Difficulty = 'routine'
): number {
  const baseValue = FIELDING_RUN_VALUES.putout[putoutType] || 0.03;
  const posMod = POSITION_MODIFIERS.putout[position] || 1.0;
  const diffMod = DIFFICULTY_MULTIPLIERS[difficulty] || 1.0;

  return baseValue * posMod * diffMod;
}

/**
 * Calculate run value for an assist
 */
export function calculateAssistValue(
  assistType: AssistType,
  position: Position,
  targetBase?: 'second' | 'third' | 'home'
): number {
  let baseValue: number;

  if (assistType === 'outfield' && targetBase) {
    // Outfield assists to specific bases
    const ofAssistValues = { second: 0.08, third: 0.10, home: 0.12 };
    baseValue = ofAssistValues[targetBase] || 0.08;
  } else {
    baseValue = FIELDING_RUN_VALUES.assist[assistType] || 0.04;
  }

  const posMod = POSITION_MODIFIERS.assist[position] || 1.0;
  return baseValue * posMod;
}

/**
 * Calculate run value for double play involvement
 */
export function calculateDPValue(
  role: DPRole,
  position: Position
): number {
  const baseValue = FIELDING_RUN_VALUES.doublePlay[role] || 0.08;
  // DP credit doesn't get position modifier - it's the play itself
  return baseValue;
}

/**
 * Calculate run penalty for an error
 */
export function calculateErrorValue(
  errorType: ErrorType,
  position: Position,
  context: {
    allowedRun?: boolean;
    wasRoutine?: boolean;
    wasDifficult?: boolean;
    isClutch?: boolean;
  } = {}
): number {
  const basePenalty = FIELDING_RUN_VALUES.error[errorType] || -0.15;
  const posMod = POSITION_MODIFIERS.error[position] || 1.0;

  // Context multipliers (penalties get worse)
  let contextMod = 1.0;
  if (context.allowedRun) contextMod *= 1.5;
  if (context.isClutch) contextMod *= 1.3;
  if (context.wasRoutine) contextMod *= 1.2;
  if (context.wasDifficult) contextMod *= 0.7;

  return basePenalty * posMod * contextMod;
}

/**
 * Calculate run value for a star play (diving catch, robbed HR, etc.)
 */
export function calculateStarPlayValue(
  basePlayType: PutoutType,
  position: Position,
  difficulty: Difficulty
): number {
  return calculatePutoutValue(basePlayType, position, difficulty);
}

// ============================================
// EVENT PROCESSING
// ============================================

/**
 * Calculate run value for a single fielding event
 */
export function calculateEventValue(event: FieldingEvent): number {
  switch (event.type) {
    case 'putout':
      return calculatePutoutValue(
        event.putoutType || 'infield',
        event.position,
        event.difficulty || 'routine'
      );

    case 'assist':
      return calculateAssistValue(
        event.assistType || 'infield',
        event.position,
        event.targetBase
      );

    case 'doublePlay':
      return calculateDPValue(event.dpRole || 'started', event.position);

    case 'error':
      return calculateErrorValue(
        event.errorType || 'fielding',
        event.position,
        {
          allowedRun: event.allowedRun,
          wasRoutine: event.wasRoutine,
          wasDifficult: event.wasDifficult,
          isClutch: event.isClutch,
        }
      );

    case 'starPlay':
      return calculateStarPlayValue(
        event.putoutType || 'outfield',
        event.position,
        event.difficulty || 'diving'
      );

    default:
      return 0;
  }
}

/**
 * Calculate game fWAR for a player
 */
export function calculateGameFWAR(
  events: FieldingEvent[],
  seasonGames: number
): GameFieldingSummary & { events: FieldingEvent[] } {
  let runsSaved = 0;
  let plays = 0;
  let errors = 0;
  let starPlays = 0;

  for (const event of events) {
    const value = calculateEventValue(event);
    runsSaved += value;
    plays++;

    if (event.type === 'error') errors++;
    if (event.type === 'starPlay' || (event.difficulty && event.difficulty !== 'routine')) {
      starPlays++;
    }
  }

  const fWAR = runsToWAR(runsSaved, seasonGames);

  return {
    playerId: events[0]?.playerId || '',
    gameId: '',
    position: events[0]?.position || 'SS',
    runsSaved: Math.round(runsSaved * 1000) / 1000,
    fWAR: Math.round(fWAR * 1000) / 1000,
    plays,
    errors,
    starPlays,
    events,
  };
}

// ============================================
// SEASON AGGREGATION
// ============================================

/**
 * Calculate season fWAR from all events
 */
export function calculateSeasonFWAR(
  allEvents: FieldingEvent[],
  primaryPosition: Position,
  gamesPlayed: number,
  seasonGames: number
): FWARResult {
  // Sum up all event values by category
  let putoutRuns = 0;
  let assistRuns = 0;
  let dpRuns = 0;
  let errorRuns = 0;
  let starPlayRuns = 0;

  for (const event of allEvents) {
    const value = calculateEventValue(event);

    switch (event.type) {
      case 'putout':
        putoutRuns += value;
        break;
      case 'assist':
        assistRuns += value;
        break;
      case 'doublePlay':
        dpRuns += value;
        break;
      case 'error':
        errorRuns += value;
        break;
      case 'starPlay':
        starPlayRuns += value;
        break;
    }
  }

  const totalRunsSaved = putoutRuns + assistRuns + dpRuns + errorRuns + starPlayRuns;

  // Positional adjustment (prorated by games played)
  const playingTimeFactor = gamesPlayed / seasonGames;
  const positionalAdjustment = (POSITIONAL_ADJUSTMENTS[primaryPosition] || 0) * playingTimeFactor;

  // Convert to WAR
  const runsPerWin = getRunsPerWin(seasonGames);
  const rawFWAR = totalRunsSaved / runsPerWin;
  const positionalWAR = positionalAdjustment / runsPerWin;
  const totalFWAR = rawFWAR + positionalWAR;

  return {
    totalRunsSaved: Math.round(totalRunsSaved * 1000) / 1000,
    putoutRuns: Math.round(putoutRuns * 1000) / 1000,
    assistRuns: Math.round(assistRuns * 1000) / 1000,
    dpRuns: Math.round(dpRuns * 1000) / 1000,
    errorRuns: Math.round(errorRuns * 1000) / 1000,
    starPlayRuns: Math.round(starPlayRuns * 1000) / 1000,
    positionalAdjustment: Math.round(positionalAdjustment * 1000) / 1000,
    fWAR: Math.round(totalFWAR * 100) / 100,
    gamesPlayed,
    position: primaryPosition,
    seasonGames,
    runsPerWin: Math.round(runsPerWin * 100) / 100,
  };
}

/**
 * Simplified fWAR calculation from basic stats
 * For when we don't have per-play data
 */
export function calculateFWARFromStats(
  stats: {
    putouts: number;
    assists: number;
    errors: number;
    doublePlays: number;
  },
  position: Position,
  gamesPlayed: number,
  seasonGames: number
): FWARResult {
  // Estimate runs from counting stats
  const putoutBase = position === 'C' || position === '1B' ? 0.01 : 0.02;
  const assistBase = 0.03;
  const dpBase = 0.10;
  const errorBase = -0.15;

  const posMod = POSITION_MODIFIERS.putout[position] || 1.0;

  const putoutRuns = stats.putouts * putoutBase * posMod;
  const assistRuns = stats.assists * assistBase * posMod;
  const dpRuns = stats.doublePlays * dpBase;
  const errorRuns = stats.errors * errorBase * (POSITION_MODIFIERS.error[position] || 1.0);

  const totalRunsSaved = putoutRuns + assistRuns + dpRuns + errorRuns;

  // Positional adjustment
  const playingTimeFactor = gamesPlayed / seasonGames;
  const positionalAdjustment = (POSITIONAL_ADJUSTMENTS[position] || 0) * playingTimeFactor;

  // Convert to WAR
  const runsPerWin = getRunsPerWin(seasonGames);
  const totalFWAR = (totalRunsSaved + positionalAdjustment) / runsPerWin;

  return {
    totalRunsSaved: Math.round(totalRunsSaved * 1000) / 1000,
    putoutRuns: Math.round(putoutRuns * 1000) / 1000,
    assistRuns: Math.round(assistRuns * 1000) / 1000,
    dpRuns: Math.round(dpRuns * 1000) / 1000,
    errorRuns: Math.round(errorRuns * 1000) / 1000,
    starPlayRuns: 0,
    positionalAdjustment: Math.round(positionalAdjustment * 1000) / 1000,
    fWAR: Math.round(totalFWAR * 100) / 100,
    gamesPlayed,
    position,
    seasonGames,
    runsPerWin: Math.round(runsPerWin * 100) / 100,
  };
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Get fWAR quality tier
 */
export function getFWARTier(fWAR: number, position: Position): string {
  // Adjust thresholds by position
  const positionMultiplier = POSITION_MODIFIERS.putout[position] || 1.0;
  const adjustedFWAR = fWAR / positionMultiplier;

  if (adjustedFWAR > 0.4) return 'Elite';
  if (adjustedFWAR > 0.2) return 'Above Average';
  if (adjustedFWAR > -0.1) return 'Average';
  if (adjustedFWAR > -0.3) return 'Below Average';
  return 'Poor';
}

/**
 * Get Fame bonus for a star play
 */
export function getStarPlayFameBonus(difficulty: Difficulty): number {
  const fameValues: Record<Difficulty, number> = {
    routine: 0,
    charging: 0,
    running: 0,
    diving: 1,
    leaping: 1,
    wall: 1,
    robbedHR: 2,
    overShoulder: 1,
    sliding: 1,
  };
  return fameValues[difficulty] || 0;
}

/**
 * Check if a play qualifies as a "web gem"
 */
export function isWebGem(difficulty: Difficulty): boolean {
  return ['diving', 'robbedHR', 'wall', 'sliding'].includes(difficulty);
}

// ============================================
// ADAPTER: Convert persisted FieldingEvent to calculator format
// This bridges eventLog.ts FieldingEvent → fwarCalculator.ts FieldingEvent
// ============================================

import type { FieldingEvent as PersistedFieldingEvent } from '../utils/eventLog';

/**
 * Map persisted difficulty to calculator difficulty
 */
function mapPersistedDifficulty(
  difficulty: 'routine' | 'likely' | '50-50' | 'unlikely' | 'spectacular'
): Difficulty {
  const mapping: Record<string, Difficulty> = {
    'routine': 'routine',
    'likely': 'running',
    '50-50': 'diving',
    'unlikely': 'diving',
    'spectacular': 'robbedHR',
  };
  return mapping[difficulty] || 'routine';
}

/**
 * Map persisted playType to calculator event type
 */
function mapPersistedPlayType(
  playType: 'putout' | 'assist' | 'error' | 'double_play_pivot' | 'outfield_assist'
): 'putout' | 'assist' | 'doublePlay' | 'error' | 'starPlay' {
  const mapping: Record<string, 'putout' | 'assist' | 'doublePlay' | 'error' | 'starPlay'> = {
    'putout': 'putout',
    'assist': 'assist',
    'error': 'error',
    'double_play_pivot': 'doublePlay',
    'outfield_assist': 'assist',
  };
  return mapping[playType] || 'putout';
}

/**
 * Convert a persisted FieldingEvent (from eventLog.ts/IndexedDB)
 * to the calculator's FieldingEvent format
 */
export function convertPersistedToCalculatorEvent(
  persisted: PersistedFieldingEvent
): FieldingEvent {
  const calculatorDifficulty = mapPersistedDifficulty(persisted.difficulty);
  const calculatorType = mapPersistedPlayType(persisted.playType);

  // Determine if this is a star play based on difficulty
  const isStarPlay = ['diving', 'leaping', 'wall', 'robbedHR', 'sliding', 'overShoulder'].includes(calculatorDifficulty);

  return {
    type: isStarPlay ? 'starPlay' : calculatorType,
    playerId: persisted.playerId,
    position: persisted.position as Position,
    difficulty: calculatorDifficulty,

    // Infer putout/assist type from position
    putoutType: calculatorType === 'putout'
      ? (['LF', 'CF', 'RF'].includes(persisted.position) ? 'outfield' : 'infield')
      : undefined,
    assistType: calculatorType === 'assist' || persisted.playType === 'outfield_assist'
      ? (['LF', 'CF', 'RF'].includes(persisted.position) ? 'outfield' : 'infield')
      : undefined,

    // DP role (simplified - would need more context for accurate assignment)
    dpRole: persisted.playType === 'double_play_pivot' ? 'turned' : undefined,

    // Error context
    allowedRun: persisted.runsPreventedOrAllowed < 0,
    wasRoutine: persisted.difficulty === 'routine',
    wasDifficult: ['unlikely', 'spectacular'].includes(persisted.difficulty),
  };
}

/**
 * Convert an array of persisted FieldingEvents to calculator format
 */
export function convertPersistedEventsToCalculator(
  persistedEvents: PersistedFieldingEvent[]
): FieldingEvent[] {
  return persistedEvents.map(convertPersistedToCalculatorEvent);
}

/**
 * Calculate fWAR from persisted fielding events
 * This is the main entry point for calculating fWAR from stored game data
 */
export async function calculateFWARFromPersistedEvents(
  gameId: string,
  playerId: string,
  position: Position,
  gamesPlayed: number,
  seasonGames: number
): Promise<FWARResult> {
  // Dynamic import to avoid circular dependency
  const { getGameFieldingEvents } = await import('../utils/eventLog');

  // Get all fielding events for this game
  const persistedEvents = await getGameFieldingEvents(gameId);

  // Filter to this player's events (by position since we store position not playerId)
  const playerEvents = persistedEvents.filter(e => e.position === position);

  // Convert to calculator format
  const calculatorEvents = convertPersistedEventsToCalculator(playerEvents);

  // Calculate fWAR
  return calculateSeasonFWAR(calculatorEvents, position, gamesPlayed, seasonGames);
}
