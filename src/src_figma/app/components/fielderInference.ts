/**
 * Fielder Inference Engine
 *
 * Direction-based fielder inference using baseball intuition.
 * Per INFERENTIAL_LOGIC_GAP_ANALYSIS.md - ported from FieldingModal.tsx
 *
 * Design Philosophy: "Non-user-intensive" - leverage baseball intuition
 * to minimize user input while capturing accurate data.
 */

import type { FieldCoordinate, SpraySector } from './FieldCanvas';
import { getSpraySector } from './FieldCanvas';

// ============================================
// TYPES
// ============================================

export type Direction = 'Left' | 'Left-Center' | 'Center' | 'Right-Center' | 'Right' | 'Foul-Left' | 'Foul-Right';
export type FoulZone = 'FL-LINE' | 'FL-HOME' | 'FR-LINE' | 'FR-HOME' | 'FOUL-BACK';
export type ExitType = 'Ground' | 'Line Drive' | 'Fly Ball' | 'Pop Up';
export type Position = 'P' | 'C' | '1B' | '2B' | '3B' | 'SS' | 'LF' | 'CF' | 'RF';
export type PlayDifficulty = 'routine' | 'likely' | 'difficult' | 'impossible';
/** The 5 fair-territory directions (used as keys in inference matrices) */
type FairDirection = 'Left' | 'Left-Center' | 'Center' | 'Right-Center' | 'Right';

/** Position number to abbreviation mapping */
export const POSITION_MAP: Record<number, Position> = {
  1: 'P', 2: 'C', 3: '1B', 4: '2B', 5: '3B', 6: 'SS', 7: 'LF', 8: 'CF', 9: 'RF'
};

/** Position abbreviation to number mapping */
export const POSITION_NUMBER: Record<Position, number> = {
  'P': 1, 'C': 2, '1B': 3, '2B': 4, '3B': 5, 'SS': 6, 'LF': 7, 'CF': 8, 'RF': 9
};

export interface InferenceResult {
  primary: Position;
  secondary?: Position;
  tertiary?: Position;
}

export interface FielderInferenceResult {
  /** Most likely fielder position number (1-9) */
  inferredFielder: number;
  /** Position abbreviation */
  position: Position;
  /** Confidence level (0-1) */
  confidence: number;
  /** How the ball left the bat */
  exitType: ExitType;
  /** Direction from batter's perspective */
  direction: Direction;
  /** Play difficulty estimate */
  difficulty: PlayDifficulty;
  /** Secondary fielder option (if applicable) */
  secondaryFielder?: number;
}

// ============================================
// INFERENCE MATRICES
// Per FieldingModal.tsx - Direction → Position mapping
// ============================================

const GROUND_BALL_INFERENCE: Record<FairDirection, InferenceResult> = {
  'Left': { primary: '3B', secondary: 'SS', tertiary: 'P' },
  'Left-Center': { primary: 'SS', secondary: '3B', tertiary: '2B' },
  'Center': { primary: 'P', secondary: 'SS', tertiary: '2B' },
  'Right-Center': { primary: '2B', secondary: '1B', tertiary: 'SS' },
  'Right': { primary: '1B', secondary: '2B', tertiary: 'P' },
};

const FLY_BALL_INFERENCE: Record<FairDirection, InferenceResult> = {
  'Left': { primary: 'LF', secondary: 'CF', tertiary: '3B' },
  'Left-Center': { primary: 'CF', secondary: 'LF', tertiary: 'SS' },
  'Center': { primary: 'CF' },
  'Right-Center': { primary: 'CF', secondary: 'RF', tertiary: '2B' },
  'Right': { primary: 'RF', secondary: 'CF', tertiary: '1B' },
};

const LINE_DRIVE_INFERENCE: Record<FairDirection, InferenceResult> = {
  'Left': { primary: '3B', secondary: 'LF' },
  'Left-Center': { primary: 'SS', secondary: 'CF' },
  'Center': { primary: 'P', secondary: 'CF' },
  'Right-Center': { primary: '2B', secondary: 'CF' },
  'Right': { primary: '1B', secondary: 'RF' },
};

const POP_FLY_INFERENCE: Record<FairDirection, InferenceResult> = {
  'Left': { primary: '3B', secondary: 'SS' },
  'Left-Center': { primary: 'SS', secondary: '3B' },
  'Center': { primary: 'SS', secondary: '2B' },
  'Right-Center': { primary: '2B', secondary: '1B' },
  'Right': { primary: '1B', secondary: '2B' },
};

/** DP Chain defaults by direction */
export const DP_CHAINS: Record<FairDirection, string> = {
  'Left': '5-4-3',
  'Left-Center': '6-4-3',
  'Center': '6-4-3',
  'Right-Center': '4-6-3',
  'Right': '3-6-3',
};

// ============================================
// DIRECTION INFERENCE
// ============================================

/**
 * Infer direction from spray sector or x-coordinate
 */
export function inferDirection(sector: SpraySector): Direction {
  // Map sector to direction
  const sectorToDirection: Record<string, Direction> = {
    'IF_L': 'Left',
    'IF_M': 'Center',
    'IF_R': 'Right',
    'LF': 'Left',
    'LCF': 'Left-Center',
    'CF': 'Center',
    'RCF': 'Right-Center',
    'RF': 'Right',
    'STANDS_LF': 'Left',
    'STANDS_CF': 'Center',
    'STANDS_RF': 'Right',
  };

  return sectorToDirection[sector.sector] || 'Center';
}

/**
 * Infer direction from x-coordinate (0 = left, 1 = right)
 * When isFoul is true or x is in extreme foul territory, returns Foul-Left / Foul-Right.
 */
export function inferDirectionFromX(x: number, isFoul?: boolean): Direction {
  // Foul territory overrides
  if (isFoul) {
    return x <= 0.5 ? 'Foul-Left' : 'Foul-Right';
  }
  if (x < 0.05) return 'Foul-Left';
  if (x > 0.95) return 'Foul-Right';

  if (x < 0.25) return 'Left';
  if (x < 0.4) return 'Left-Center';
  if (x < 0.6) return 'Center';
  if (x < 0.75) return 'Right-Center';
  return 'Right';
}

// ============================================
// EXIT TYPE INFERENCE
// ============================================

/**
 * Infer exit type from result type (for deterministic cases)
 */
export function inferExitTypeFromResult(
  resultType: 'GO' | 'FO' | 'LO' | 'PO' | 'DP' | 'FC' | 'SAC' | 'SF' | 'K' | string
): ExitType | null {
  switch (resultType) {
    case 'GO':
    case 'DP':
    case 'FC':
    case 'SAC':
      return 'Ground';
    case 'FO':
    case 'SF':
      return 'Fly Ball';
    case 'LO':
      return 'Line Drive';
    case 'PO':
      return 'Pop Up';
    default:
      return null; // Hits (1B, 2B, 3B, HR) need context
  }
}

/**
 * Infer exit type from location depth
 * This is used when result type doesn't determine exit type (hits)
 */
export function inferExitTypeFromLocation(y: number, isOut: boolean): ExitType {
  if (isOut) {
    // For outs, depth helps determine ball type
    if (y < 0.35) {
      // Infield - could be ground ball, line drive, or pop
      // Line drive is most common for infield outs
      return 'Line Drive';
    } else if (y < 0.55) {
      // Shallow outfield - likely line drive or fly
      return 'Line Drive';
    } else {
      // Deep outfield - fly ball
      return 'Fly Ball';
    }
  } else {
    // For hits, use depth as proxy
    if (y < 0.35) {
      // Infield hit - ground ball
      return 'Ground';
    } else if (y < 0.55) {
      // Shallow outfield - line drive
      return 'Line Drive';
    } else if (y < 0.8) {
      // Mid/deep outfield - fly ball
      return 'Fly Ball';
    } else {
      // Gap/wall - fly ball
      return 'Fly Ball';
    }
  }
}

// ============================================
// PLAY DIFFICULTY INFERENCE
// ============================================

/**
 * Infer play difficulty from location and fielder context
 */
export function inferPlayDifficulty(
  location: FieldCoordinate,
  inferredFielder: Position,
  actualFielder?: number
): PlayDifficulty {
  const y = location.y;
  const isOutfielder = ['LF', 'CF', 'RF'].includes(inferredFielder);

  // If actual fielder differs from inferred, it was a difficult play
  if (actualFielder && POSITION_MAP[actualFielder] !== inferredFielder) {
    return 'difficult';
  }

  if (isOutfielder) {
    // Outfield plays
    if (y > 0.95) return 'impossible'; // At the wall
    if (y > 0.85) return 'difficult';  // Deep warning track
    if (y > 0.7) return 'likely';      // Normal fly ball range
    if (y > 0.5) return 'routine';     // Shallow fly
    return 'difficult'; // Very shallow - charging play
  } else {
    // Infield plays
    if (y < 0.15) return 'routine';    // Right at fielder
    if (y < 0.25) return 'likely';     // Normal range
    if (y < 0.35) return 'difficult';  // Extended range
    return 'impossible'; // Outfield grass
  }
}

// ============================================
// FOUL ZONE INFERENCE (GAP-B3-009)
// ============================================

/**
 * Classify a foul territory zone from x/y coordinates.
 * Returns null if the location is in fair territory.
 */
export function classifyFoulZone(x: number, y: number): FoulZone | null {
  // Behind the plate — very shallow, any horizontal position
  if (y < 0.10) return 'FOUL-BACK';

  // Left foul territory
  if (x < 0.10) {
    return y < 0.30 ? 'FL-HOME' : 'FL-LINE';
  }

  // Right foul territory
  if (x > 0.90) {
    return y < 0.30 ? 'FR-HOME' : 'FR-LINE';
  }

  // Fair territory
  return null;
}

/**
 * Infer fielder for a foul ball given zone and result type.
 */
export function inferFoulBallFielder(
  zone: FoulZone,
  result: string,
): InferenceResult {
  // Behind plate → always catcher
  if (zone === 'FOUL-BACK') {
    return { primary: 'C' };
  }

  // Pop-ups in foul territory
  if (result === 'PO') {
    if (zone === 'FL-LINE' || zone === 'FL-HOME') return { primary: '3B', secondary: 'C' };
    if (zone === 'FR-LINE' || zone === 'FR-HOME') return { primary: '1B', secondary: 'C' };
  }

  // Fly-outs in foul territory
  if (zone === 'FL-LINE') return { primary: 'LF', secondary: '3B' };
  if (zone === 'FL-HOME') return { primary: 'C', secondary: '3B' };
  if (zone === 'FR-LINE') return { primary: 'RF', secondary: '1B' };
  if (zone === 'FR-HOME') return { primary: 'C', secondary: '1B' };

  // Fallback
  return { primary: 'C' };
}

// ============================================
// DEPTH-AWARE POP FLY INFERENCE (MAJ-B3-006)
// ============================================

type PopFlyDepth = 'shallow' | 'infield' | 'outfield' | 'deep';

/**
 * Infer fielder for a pop fly based on direction and depth.
 * Shallow depth is always C regardless of direction.
 */
export function inferPopFlyFielder(
  direction: Direction,
  depth: PopFlyDepth,
): InferenceResult {
  // Shallow → always catcher
  if (depth === 'shallow') {
    return { primary: 'C', secondary: 'P' };
  }

  // Map foul directions to their fair-territory equivalent for infield/outfield
  let fairDir: FairDirection;
  if (direction === 'Foul-Left') fairDir = 'Left';
  else if (direction === 'Foul-Right') fairDir = 'Right';
  else fairDir = direction;

  if (depth === 'infield') {
    const map: Record<FairDirection, InferenceResult> = {
      'Left': { primary: '3B', secondary: 'SS' },
      'Left-Center': { primary: 'SS', secondary: '3B' },
      'Center': { primary: 'SS', secondary: '2B' },
      'Right-Center': { primary: '2B', secondary: '1B' },
      'Right': { primary: '1B', secondary: '2B' },
    };
    return map[fairDir];
  }

  if (depth === 'outfield') {
    const map: Record<FairDirection, InferenceResult> = {
      'Left': { primary: 'LF', secondary: 'CF' },
      'Left-Center': { primary: 'CF', secondary: 'LF' },
      'Center': { primary: 'CF' },
      'Right-Center': { primary: 'CF', secondary: 'RF' },
      'Right': { primary: 'RF', secondary: 'CF' },
    };
    return map[fairDir];
  }

  // deep
  const map: Record<FairDirection, InferenceResult> = {
    'Left': { primary: 'LF', secondary: 'CF' },
    'Left-Center': { primary: 'CF', secondary: 'LF' },
    'Center': { primary: 'CF' },
    'Right-Center': { primary: 'CF', secondary: 'RF' },
    'Right': { primary: 'RF', secondary: 'CF' },
  };
  return map[fairDir];
}

/**
 * Infer depth from y coordinate for pop fly inference.
 */
function inferPopFlyDepth(y: number): PopFlyDepth {
  if (y < 0.15) return 'shallow';
  if (y < 0.35) return 'infield';
  if (y < 0.70) return 'outfield';
  return 'deep';
}

/**
 * Check if a direction is in fair territory (for matrix lookups).
 */
function isFairDirection(d: Direction): d is FairDirection {
  return d !== 'Foul-Left' && d !== 'Foul-Right';
}

/**
 * Get the nearest fair-territory direction for a foul direction.
 */
function toFairDirection(d: Direction): FairDirection {
  if (d === 'Foul-Left') return 'Left';
  if (d === 'Foul-Right') return 'Right';
  return d;
}

// ============================================
// FOUL DIRECTION INFERENCE HELPERS
// ============================================

/**
 * Get inference result for foul territory directions in inferFielderEnhanced.
 */
function inferFoulDirectionFielder(result: string, direction: Direction, exitType?: ExitType | null): InferenceResult | null {
  const isFoulLeft = direction === 'Foul-Left';

  // Ground balls in foul territory → catcher
  if (['GO', 'DP', 'FC', 'SAC'].includes(result) || exitType === 'Ground') {
    return { primary: 'C', secondary: isFoulLeft ? '3B' : '1B' };
  }

  // Fly outs in foul territory
  if (['FO', 'SF'].includes(result) || exitType === 'Fly Ball') {
    return isFoulLeft
      ? { primary: 'LF', secondary: '3B' }
      : { primary: 'RF', secondary: '1B' };
  }

  // Line drives
  if (result === 'LO' || exitType === 'Line Drive') {
    return isFoulLeft
      ? { primary: '3B', secondary: 'LF' }
      : { primary: '1B', secondary: 'RF' };
  }

  // Pop ups
  if (result === 'PO' || exitType === 'Pop Up') {
    return isFoulLeft
      ? { primary: '3B', secondary: 'C' }
      : { primary: '1B', secondary: 'C' };
  }

  return null;
}

// ============================================
// MAIN INFERENCE FUNCTION
// ============================================

/**
 * Infer fielder from location, with optional result context
 */
export function inferFielder(
  location: FieldCoordinate,
  options?: {
    resultType?: string;
    exitType?: ExitType;
    isOut?: boolean;
    depth?: PopFlyDepth;
  }
): FielderInferenceResult {
  const { resultType, exitType: providedExitType, isOut = true, depth: explicitDepth } = options || {};

  // Get spray sector
  const sector = getSpraySector(location.x, location.y);
  const direction = inferDirection(sector);

  // Determine exit type
  let exitType: ExitType;
  if (providedExitType) {
    exitType = providedExitType;
  } else if (resultType) {
    const inferred = inferExitTypeFromResult(resultType);
    exitType = inferred || inferExitTypeFromLocation(location.y, isOut);
  } else {
    exitType = inferExitTypeFromLocation(location.y, isOut);
  }

  // Use fair direction for matrix lookups
  const fairDir = toFairDirection(direction);

  // Select appropriate inference matrix
  let inference: InferenceResult;
  let confidence: number;

  switch (exitType) {
    case 'Ground':
      inference = GROUND_BALL_INFERENCE[fairDir];
      confidence = 0.85;
      break;
    case 'Fly Ball':
      inference = FLY_BALL_INFERENCE[fairDir];
      confidence = 0.90;
      break;
    case 'Line Drive':
      inference = LINE_DRIVE_INFERENCE[fairDir];
      confidence = 0.70;
      break;
    case 'Pop Up': {
      // Depth-aware pop fly inference (MAJ-B3-006)
      const depth = explicitDepth || inferPopFlyDepth(location.y);
      inference = inferPopFlyFielder(direction, depth);
      confidence = 0.80;
      break;
    }
  }

  // Adjust confidence based on depth (edge cases are less certain)
  if (location.y > 0.9 || location.y < 0.1) {
    confidence *= 0.8;
  }
  if (location.x < 0.1 || location.x > 0.9) {
    confidence *= 0.85;
  }

  const primaryPosition = inference.primary;
  const primaryNumber = POSITION_NUMBER[primaryPosition];

  // Calculate difficulty
  const difficulty = inferPlayDifficulty(location, primaryPosition);

  return {
    inferredFielder: primaryNumber,
    position: primaryPosition,
    confidence: Math.round(confidence * 100) / 100,
    exitType,
    direction,
    difficulty,
    secondaryFielder: inference.secondary ? POSITION_NUMBER[inference.secondary] : undefined,
  };
}

/**
 * Infer fielder with enhanced context (result type + exit type)
 * This is the primary function to use for PlayData enrichment
 */
export function inferFielderEnhanced(
  result: string,
  direction: Direction | null,
  exitType?: ExitType | null
): number | null {
  if (!direction) return null;

  // Handle foul directions with dedicated logic
  if (!isFairDirection(direction)) {
    const foulInference = inferFoulDirectionFielder(result, direction, exitType);
    return foulInference ? POSITION_NUMBER[foulInference.primary] : null;
  }

  let inference: InferenceResult | null = null;

  // For hits, use exit type first if available
  if (['1B', '2B', '3B'].includes(result) && exitType) {
    if (exitType === 'Ground') {
      inference = GROUND_BALL_INFERENCE[direction];
    } else if (exitType === 'Line Drive') {
      inference = LINE_DRIVE_INFERENCE[direction];
    } else if (exitType === 'Fly Ball') {
      inference = FLY_BALL_INFERENCE[direction];
    } else if (exitType === 'Pop Up') {
      inference = POP_FLY_INFERENCE[direction];
    }
  }
  // Ground balls (by result)
  else if (['GO', 'DP', 'FC', 'SAC'].includes(result) || exitType === 'Ground') {
    inference = GROUND_BALL_INFERENCE[direction];
  }
  // Fly balls (by result)
  else if (['FO', 'SF'].includes(result) || exitType === 'Fly Ball') {
    inference = FLY_BALL_INFERENCE[direction];
  }
  // Line drives (by result)
  else if (result === 'LO' || exitType === 'Line Drive') {
    inference = LINE_DRIVE_INFERENCE[direction];
  }
  // Pop flies (by result)
  else if (result === 'PO' || exitType === 'Pop Up') {
    inference = POP_FLY_INFERENCE[direction];
  }

  return inference ? POSITION_NUMBER[inference.primary] : null;
}

/**
 * Get suggested DP chain based on direction
 */
export function getSuggestedDPChain(direction: Direction): string {
  return DP_CHAINS[toFairDirection(direction)];
}

/**
 * Get all possible fielders for a location (for UI highlighting)
 */
export function getPossibleFielders(
  location: FieldCoordinate,
  exitType?: ExitType
): number[] {
  const result = inferFielder(location, { exitType });
  const fielders = [result.inferredFielder];

  if (result.secondaryFielder) {
    fielders.push(result.secondaryFielder);
  }

  return fielders;
}
