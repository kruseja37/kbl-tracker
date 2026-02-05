/**
 * Play Classifier - Inferential Logic Engine
 *
 * Per GAMETRACKER_DRAGDROP_SPEC.md and kbl-detection-philosophy.md:
 * - Auto-classify obvious plays (skip modals)
 * - Suggest most likely outcome for ambiguous plays
 * - Prompt for special events (Web Gem, TOOTBLAN, etc.)
 *
 * Design Philosophy: "Non-user-intensive" - leverage baseball intuition
 * to minimize user input while capturing accurate data.
 */

import type { FieldCoordinate, SpraySector } from './FieldCanvas';
import {
  isFoulTerritory,
  getFoulType,
  getSpraySector,
  isInStands,
  classifyHomeRun,
} from './FieldCanvas';

// ============================================
// TYPES
// ============================================

export type HitType = '1B' | '2B' | '3B' | 'HR';
export type OutType = 'GO' | 'FO' | 'LO' | 'PO' | 'DP' | 'TP' | 'K' | 'FC' | 'SAC' | 'SF';
export type PlayType = 'hit' | 'out' | 'hr' | 'foul_out' | 'foul_ball' | 'error';

export interface ClassificationResult {
  /** Whether to auto-complete (skip modal) */
  autoComplete: boolean;

  /** The classified play type */
  playType: PlayType;

  /** For hits: the inferred hit type */
  hitType?: HitType;

  /** For outs: the inferred out type */
  outType?: OutType;

  /** Confidence level (0-1) */
  confidence: number;

  /** Human-readable description */
  description: string;

  /** Special event prompts to show after play */
  prompts: SpecialEventPrompt[];

  /** Quick notation (e.g., "F-8", "6-4-3") */
  notation: string;
}

export interface SpecialEventPrompt {
  eventType: SpecialEventType;
  question: string;
  defaultAnswer: boolean;
  fameImpact: string;
}

export type SpecialEventType =
  | 'WEB_GEM'
  | 'ROBBERY'
  | 'TOOTBLAN'
  | 'KILLED_PITCHER'
  | 'NUT_SHOT'
  | 'DIVING_CATCH'
  | 'INSIDE_PARK_HR'
  | 'BEAT_THROW'
  | 'BUNT'
  | 'STRIKEOUT'
  | 'STRIKEOUT_LOOKING'
  | 'DROPPED_3RD_STRIKE'
  | 'SEVEN_PLUS_PITCH_AB';

export interface GameContext {
  outs: number;
  bases: { first: boolean; second: boolean; third: boolean };
  inning: number;
  isTop: boolean;
  score?: { home: number; away: number };
}

export interface PlayInput {
  /** Where the batter dragged to (hit location) */
  batterPosition?: FieldCoordinate;

  /** Where the ball was fielded */
  ballLocation?: FieldCoordinate;

  /** Fielding sequence (position numbers) */
  fieldingSequence: number[];

  /** Current game situation */
  gameContext: GameContext;

  /** HR distance if entered */
  hrDistance?: number;
}

// ============================================
// CONSTANTS
// ============================================

/** Position numbers for infielders */
const INFIELDERS = [1, 2, 3, 4, 5, 6];

/** Position numbers for outfielders */
const OUTFIELDERS = [7, 8, 9];

/** Position labels */
const POSITION_LABELS: Record<number, string> = {
  1: 'P',
  2: 'C',
  3: '1B',
  4: '2B',
  5: '3B',
  6: 'SS',
  7: 'LF',
  8: 'CF',
  9: 'RF',
};

// ============================================
// MAIN CLASSIFIER
// ============================================

/**
 * Classify a play based on input and game context.
 * Returns auto-complete flag, inferred types, and any prompts.
 */
export function classifyPlay(input: PlayInput): ClassificationResult {
  const { batterPosition, ballLocation, fieldingSequence, gameContext, hrDistance } = input;

  // Location to use for classification
  const location = batterPosition || ballLocation;

  // No location = can't classify
  if (!location) {
    return {
      autoComplete: false,
      playType: 'out',
      confidence: 0,
      description: 'No location data',
      prompts: [],
      notation: '?',
    };
  }

  // Check for HR (in stands)
  if (isInStands(location.y)) {
    return classifyHomeRun_internal(location, hrDistance);
  }

  // Check for foul territory
  if (isFoulTerritory(location.x, location.y)) {
    return classifyFoulPlay(location, fieldingSequence);
  }

  // Fair territory - classify based on fielding sequence
  if (fieldingSequence.length > 0) {
    return classifyFieldedBall(location, fieldingSequence, gameContext);
  }

  // No fielding sequence - likely a hit
  return classifyHit(location, gameContext);
}

// ============================================
// HOME RUN CLASSIFICATION
// ============================================

function classifyHomeRun_internal(
  location: FieldCoordinate,
  hrDistance?: number
): ClassificationResult {
  const hrType = classifyHomeRun(location.y);
  const sector = getSpraySector(location.x, location.y);

  return {
    autoComplete: false, // Still need distance input
    playType: 'hr',
    hitType: 'HR',
    confidence: 1.0,
    description: `Home Run (${hrType}) to ${sector.sector}`,
    prompts: [], // Could add inside-park HR prompt if needed
    notation: 'HR',
  };
}

// ============================================
// FOUL PLAY CLASSIFICATION
// ============================================

function classifyFoulPlay(
  location: FieldCoordinate,
  fieldingSequence: number[]
): ClassificationResult {
  const foulType = getFoulType(location.x, location.y);

  // If a fielder caught it in foul territory = foul out
  if (fieldingSequence.length > 0) {
    const catcherPos = fieldingSequence[0];
    const notation = `Foul-${catcherPos}`;

    return {
      autoComplete: true, // Auto-complete foul outs
      playType: 'foul_out',
      outType: 'FO',
      confidence: 0.95,
      description: `Foul out to ${POSITION_LABELS[catcherPos]}`,
      prompts: [],
      notation,
    };
  }

  // No fielder = foul ball (strike)
  return {
    autoComplete: true, // Auto-complete foul balls
    playType: 'foul_ball',
    confidence: 1.0,
    description: `Foul ball (${foulType})`,
    prompts: [],
    notation: 'Foul',
  };
}

// ============================================
// FIELDED BALL CLASSIFICATION
// ============================================

function classifyFieldedBall(
  location: FieldCoordinate,
  fieldingSequence: number[],
  gameContext: GameContext
): ClassificationResult {
  const sector = getSpraySector(location.x, location.y);
  const firstFielder = fieldingSequence[0];
  const sequenceLength = fieldingSequence.length;

  // Build notation
  const notation = fieldingSequence.join('-');

  // Determine if outfielder or infielder
  const isOutfielder = OUTFIELDERS.includes(firstFielder);
  const isInfielder = INFIELDERS.includes(firstFielder);
  const isPitcher = firstFielder === 1;

  // Check for special prompts
  const prompts: SpecialEventPrompt[] = [];

  // Single fielder catches
  if (sequenceLength === 1) {
    return classifySingleFielderOut(location, firstFielder, sector, prompts);
  }

  // Multi-fielder plays
  return classifyMultiFielderOut(location, fieldingSequence, gameContext, sector, prompts);
}

function classifySingleFielderOut(
  location: FieldCoordinate,
  fielderId: number,
  sector: SpraySector,
  prompts: SpecialEventPrompt[]
): ClassificationResult {
  const isOutfielder = OUTFIELDERS.includes(fielderId);
  const isPitcher = fielderId === 1;
  const notation = `F-${fielderId}`;

  // Deep outfield catch = likely fly out
  if (isOutfielder && location.y > 0.6) {
    // Check for Web Gem / Robbery prompts based on depth
    // Per GAMETRACKER_DRAGDROP_SPEC.md v2:
    // - y > 0.95 = ROBBERY (catch at wall, HR denied) → +1.0 Fame (spec v3.3)
    // - 0.8 < y ≤ 0.95 = WEB GEM (spectacular catch) → +0.75 Fame
    if (location.y > 0.95) {
      prompts.push({
        eventType: 'ROBBERY',
        question: 'HR Robbery at the wall?',
        defaultAnswer: true,
        fameImpact: '+1.5 Fame (fielder)',
      });
    } else if (location.y > 0.8) {
      prompts.push({
        eventType: 'WEB_GEM',
        question: 'Web Gem?',
        defaultAnswer: false,
        fameImpact: '+1.0 Fame (fielder)',
      });
    }

    return {
      autoComplete: true, // Auto-complete obvious fly outs
      playType: 'out',
      outType: 'FO',
      confidence: 0.9,
      description: `Fly out to ${POSITION_LABELS[fielderId]}`,
      prompts,
      notation,
    };
  }

  // Shallow outfield = could be line out or fly out
  if (isOutfielder) {
    return {
      autoComplete: false, // Need user to confirm LO vs FO
      playType: 'out',
      outType: 'FO', // Suggest FO
      confidence: 0.7,
      description: `Out to ${POSITION_LABELS[fielderId]} (FO or LO?)`,
      prompts,
      notation,
    };
  }

  // Infielder unassisted = line out or pop out
  if (location.y < 0.35) {
    // Pitcher comebacker - offer both KILLED_PITCHER and NUT_SHOT
    // Per GAMETRACKER_DRAGDROP_SPEC.md v2:
    // - KILLED_PITCHER = +3 Fame (batter knocked pitcher down)
    // - NUT_SHOT = +1 Fame (batter hit sensitive area)
    if (isPitcher) {
      prompts.push({
        eventType: 'KILLED_PITCHER',
        question: 'Knocked pitcher down?',
        defaultAnswer: false,
        fameImpact: '+3.0 Fame (batter)',
      });
      prompts.push({
        eventType: 'NUT_SHOT',
        question: 'Nut shot?',
        defaultAnswer: false,
        fameImpact: '+1.0 Fame (batter)',
      });
    }

    return {
      autoComplete: false, // Need user to confirm type
      playType: 'out',
      outType: 'LO', // Suggest line out for infield
      confidence: 0.6,
      description: `Out to ${POSITION_LABELS[fielderId]} (LO?)`,
      prompts,
      notation: `U-${fielderId}`,
    };
  }

  return {
    autoComplete: false,
    playType: 'out',
    outType: 'FO',
    confidence: 0.5,
    description: `Out to ${POSITION_LABELS[fielderId]}`,
    prompts,
    notation,
  };
}

function classifyMultiFielderOut(
  location: FieldCoordinate,
  fieldingSequence: number[],
  gameContext: GameContext,
  sector: SpraySector,
  prompts: SpecialEventPrompt[]
): ClassificationResult {
  const sequenceLength = fieldingSequence.length;
  const notation = fieldingSequence.join('-');
  const firstFielder = fieldingSequence[0];
  const lastFielder = fieldingSequence[fieldingSequence.length - 1];

  // Check for double play potential
  const hasRunnersOn = gameContext.bases.first || gameContext.bases.second || gameContext.bases.third;
  const canBeDP = hasRunnersOn && gameContext.outs < 2;

  // Per GAMETRACKER_DRAGDROP_SPEC.md v2:
  // 2-3 sequence (catcher to 1B) = Strikeout (swinging or looking)
  // 2-3-3 sequence = Dropped third strike (batter ran to first)
  if (firstFielder === 2 && lastFielder === 3) {
    if (notation === '2-3') {
      // Strikeout - offer K vs Ꝅ (looking)
      prompts.push({
        eventType: 'STRIKEOUT',
        question: 'Swinging?',
        defaultAnswer: true,
        fameImpact: 'Strikeout recorded',
      });
      prompts.push({
        eventType: 'STRIKEOUT_LOOKING',
        question: 'Looking (Ꝅ)?',
        defaultAnswer: false,
        fameImpact: 'Strikeout looking recorded',
      });

      return {
        autoComplete: false, // Need user to specify K vs Ꝅ
        playType: 'out',
        outType: 'K',
        confidence: 0.95,
        description: `Strikeout: ${notation}`,
        prompts,
        notation,
      };
    } else if (notation === '2-3-3') {
      // Dropped third strike
      prompts.push({
        eventType: 'DROPPED_3RD_STRIKE',
        question: 'Dropped 3rd strike?',
        defaultAnswer: true,
        fameImpact: 'D3K recorded',
      });

      return {
        autoComplete: false,
        playType: 'out',
        outType: 'K',
        confidence: 0.9,
        description: `Dropped 3rd Strike: ${notation}`,
        prompts,
        notation,
      };
    }
  }

  // Pitcher fielding sequence (1-X) = Comebacker
  // Per GAMETRACKER_DRAGDROP_SPEC.md v2:
  // - KILLED_PITCHER = +3 Fame
  // - NUT_SHOT = +1 Fame
  if (firstFielder === 1 && sequenceLength >= 2) {
    prompts.push({
      eventType: 'KILLED_PITCHER',
      question: 'Knocked pitcher down?',
      defaultAnswer: false,
      fameImpact: '+3.0 Fame (batter)',
    });
    prompts.push({
      eventType: 'NUT_SHOT',
      question: 'Nut shot?',
      defaultAnswer: false,
      fameImpact: '+1.0 Fame (batter)',
    });

    // GT-008: Auto-complete common pitcher combacker patterns
    if (notation === '1-3' || notation === '1-4-3' || notation === '1-6-3') {
      return {
        autoComplete: true,
        playType: 'out',
        outType: 'GO',
        confidence: 0.90,
        description: `Ground out (comebacker): ${notation}`,
        prompts,
        notation,
      };
    }
  }

  // GT-008: Auto-complete standard infield ground outs (X-3 pattern)
  const isStandardGroundOut = sequenceLength === 2 && lastFielder === 3 &&
    [4, 5, 6].includes(firstFielder); // 2B, 3B, SS to 1B

  if (isStandardGroundOut) {
    return {
      autoComplete: true,
      playType: 'out',
      outType: 'GO',
      confidence: 0.92,
      description: `Ground out: ${notation}`,
      prompts,
      notation,
    };
  }

  // 3+ fielder sequence with runners = likely DP
  if (sequenceLength >= 3 && canBeDP) {
    // Classic DP sequences
    const isClassicDP =
      (notation === '6-4-3') || // SS to 2B to 1B
      (notation === '4-6-3') || // 2B to SS to 1B
      (notation === '5-4-3') || // 3B to 2B to 1B
      (notation === '3-6-3') || // 1B to SS to 1B
      (notation === '1-6-3') || // P to SS to 1B
      (notation === '1-4-3');   // P to 2B to 1B

    if (isClassicDP) {
      return {
        autoComplete: true, // Auto-complete classic DPs
        playType: 'out',
        outType: 'DP',
        confidence: 0.95,
        description: `Double Play: ${notation}`,
        prompts,
        notation,
      };
    }

    // Non-classic but still 3+ fielders with runners
    return {
      autoComplete: false,
      playType: 'out',
      outType: 'DP', // Suggest DP
      confidence: 0.8,
      description: `Likely Double Play: ${notation}`,
      prompts,
      notation,
    };
  }

  // 4+ fielders = could be triple play
  if (sequenceLength >= 4 && hasRunnersOn) {
    return {
      autoComplete: false,
      playType: 'out',
      outType: 'TP', // Suggest TP
      confidence: 0.7,
      description: `Possible Triple Play: ${notation}`,
      prompts,
      notation,
    };
  }

  // 2-fielder sequence = ground out
  if (sequenceLength === 2) {
    // Check for fielder's choice potential
    if (hasRunnersOn && lastFielder !== 3) {
      // Throw not to first = might be FC
      return {
        autoComplete: false,
        playType: 'out',
        outType: 'GO', // Suggest GO, but FC is possible
        confidence: 0.7,
        description: `Ground out ${notation} (or FC?)`,
        prompts,
        notation,
      };
    }

    // Standard ground out (throw to first)
    if (lastFielder === 3) {
      return {
        autoComplete: true, // Auto-complete standard ground outs
        playType: 'out',
        outType: 'GO',
        confidence: 0.9,
        description: `Ground out: ${notation}`,
        prompts,
        notation,
      };
    }
  }

  // Default: ground out
  return {
    autoComplete: false,
    playType: 'out',
    outType: 'GO',
    confidence: 0.6,
    description: `Ground out: ${notation}`,
    prompts,
    notation,
  };
}

// ============================================
// HIT CLASSIFICATION
// ============================================

function classifyHit(
  location: FieldCoordinate,
  gameContext: GameContext
): ClassificationResult {
  const sector = getSpraySector(location.x, location.y);
  const prompts: SpecialEventPrompt[] = [];

  // Infer hit type from depth
  let suggestedHitType: HitType;
  let confidence: number;

  if (location.y < 0.35) {
    // Infield hit - very likely single
    // Per GAMETRACKER_DRAGDROP_SPEC.md v2:
    // Infield hit = BEAT_THROW or BUNT
    suggestedHitType = '1B';
    confidence = 0.85;

    prompts.push({
      eventType: 'BEAT_THROW',
      question: 'Beat the throw?',
      defaultAnswer: true,
      fameImpact: 'Infield hit - speed',
    });
    prompts.push({
      eventType: 'BUNT',
      question: 'Bunt?',
      defaultAnswer: false,
      fameImpact: 'Bunt single recorded',
    });
  } else if (location.y < 0.55) {
    // Shallow outfield - likely single
    suggestedHitType = '1B';
    confidence = 0.75;
  } else if (location.y < 0.75) {
    // Mid outfield - could be single or double
    suggestedHitType = '1B';
    confidence = 0.6;
  } else if (location.y < 0.9) {
    // Deep outfield - likely double or triple
    suggestedHitType = '2B';
    confidence = 0.7;
  } else {
    // At the wall - likely triple or HR
    suggestedHitType = '3B';
    confidence = 0.6;
  }

  return {
    autoComplete: false, // Hits always need confirmation
    playType: 'hit',
    hitType: suggestedHitType,
    confidence,
    description: `Hit to ${sector.sector} (${suggestedHitType}?)`,
    prompts,
    notation: suggestedHitType,
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Check if the play should auto-complete based on classification.
 */
export function shouldAutoComplete(result: ClassificationResult): boolean {
  return result.autoComplete && result.confidence >= 0.85;
}

/**
 * Get the suggested type for a modal (pre-selected option).
 */
export function getSuggestedType(result: ClassificationResult): HitType | OutType | null {
  return result.hitType || result.outType || null;
}

/**
 * Generate play description for display.
 */
export function getPlayDescription(
  playType: PlayType,
  hitType?: HitType,
  outType?: OutType,
  notation?: string
): string {
  if (playType === 'hr') {
    return `Home Run`;
  }
  if (playType === 'hit' && hitType) {
    const hitNames: Record<HitType, string> = {
      '1B': 'Single',
      '2B': 'Double',
      '3B': 'Triple',
      HR: 'Home Run',
    };
    return hitNames[hitType];
  }
  if (playType === 'out' && outType) {
    const outNames: Record<OutType, string> = {
      GO: 'Ground Out',
      FO: 'Fly Out',
      LO: 'Line Out',
      PO: 'Pop Out',
      DP: 'Double Play',
      TP: 'Triple Play',
      K: 'Strikeout',
      FC: "Fielder's Choice",
      SAC: 'Sacrifice',
      SF: 'Sacrifice Fly',
    };
    return `${outNames[outType]}${notation ? ` (${notation})` : ''}`;
  }
  if (playType === 'foul_out') {
    return `Foul Out${notation ? ` (${notation})` : ''}`;
  }
  if (playType === 'foul_ball') {
    return 'Foul Ball';
  }
  return 'Unknown Play';
}

/**
 * Detect special events that should prompt the user.
 */
export function detectSpecialEvents(
  input: PlayInput,
  result: ClassificationResult
): SpecialEventPrompt[] {
  const prompts: SpecialEventPrompt[] = [...result.prompts];
  const { fieldingSequence, gameContext } = input;

  // TOOTBLAN check - runner out on non-force play
  // This would need additional context about runner outs
  // For now, we'll rely on the prompts already added

  return prompts;
}
