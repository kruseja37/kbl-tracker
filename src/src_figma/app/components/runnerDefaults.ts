/**
 * runnerDefaults.ts - Calculate default runner outcomes based on play type
 *
 * Per GAME_TRACKER_IMPLEMENTATION_ADDENDUM.md:
 * When a play is classified, we pre-calculate where runners likely end up
 * so the user only needs to confirm or adjust (not manually move every runner).
 *
 * The system should be NON-USER-INTENSIVE by leveraging inferential logic
 * based on real baseball gameplay intuition.
 */

import type { PlayData } from './EnhancedInteractiveField';

// ============================================
// TYPES
// ============================================

export type BaseId = 'first' | 'second' | 'third' | 'home' | 'out';

export interface RunnerOutcome {
  /** Where the runner started */
  from: 'first' | 'second' | 'third' | 'batter';
  /** Where the runner ends up (home = scored, out = retired) */
  to: BaseId;
  /** Is this a default that can be changed, or locked in? */
  isDefault: boolean;
  /** Reason for this outcome (for display) */
  reason?: string;
}

export interface RunnerDefaults {
  /** Batter outcome (where they end up) */
  batter: RunnerOutcome;
  /** Runner on first outcome (if applicable) */
  first?: RunnerOutcome;
  /** Runner on second outcome (if applicable) */
  second?: RunnerOutcome;
  /** Runner on third outcome (if applicable) */
  third?: RunnerOutcome;
}

export interface GameBases {
  first: boolean;
  second: boolean;
  third: boolean;
}

// ============================================
// MAIN CALCULATION FUNCTION
// ============================================

/**
 * Calculate default runner outcomes based on play type and game situation
 *
 * @param playData The classified play data
 * @param bases Current base occupancy
 * @param outs Current out count (before play)
 * @returns Default runner outcomes for display/adjustment
 */
export function calculateRunnerDefaults(
  playData: PlayData,
  bases: GameBases,
  outs: number
): RunnerDefaults {
  const { type, hitType, outType } = playData;

  switch (type) {
    case 'hit':
      return calculateHitDefaults(hitType, bases);

    case 'hr':
      return calculateHomeRunDefaults(bases);

    case 'out':
      return calculateOutDefaults(outType, bases, outs, playData.fieldingSequence);

    case 'error':
      return calculateErrorDefaults(bases);

    case 'foul_out':
    case 'foul_ball':
      return calculateFoulOutDefaults(bases, outs);

    default:
      // Default: batter out, runners stay
      return {
        batter: { from: 'batter', to: 'out', isDefault: true, reason: 'Out' },
        ...(bases.first && { first: { from: 'first', to: 'first', isDefault: true, reason: 'Holds' } }),
        ...(bases.second && { second: { from: 'second', to: 'second', isDefault: true, reason: 'Holds' } }),
        ...(bases.third && { third: { from: 'third', to: 'third', isDefault: true, reason: 'Holds' } }),
      };
  }
}

// ============================================
// HIT DEFAULTS
// ============================================

function calculateHitDefaults(
  hitType: PlayData['hitType'],
  bases: GameBases
): RunnerDefaults {
  // Single: Batter to 1B, runners advance 1-2 bases
  if (hitType === '1B') {
    return {
      batter: { from: 'batter', to: 'first', isDefault: true, reason: 'Single' },
      // R3 scores
      ...(bases.third && { third: { from: 'third', to: 'home', isDefault: true, reason: 'Scores on single' } }),
      // R2 to third (conservative default - can adjust to home)
      ...(bases.second && { second: { from: 'second', to: 'third', isDefault: true, reason: 'Advances to 3B' } }),
      // R1 to second
      ...(bases.first && { first: { from: 'first', to: 'second', isDefault: true, reason: 'Advances to 2B' } }),
    };
  }

  // Double: Batter to 2B, runners advance 2 bases
  if (hitType === '2B') {
    return {
      batter: { from: 'batter', to: 'second', isDefault: true, reason: 'Double' },
      // R3 scores
      ...(bases.third && { third: { from: 'third', to: 'home', isDefault: true, reason: 'Scores on double' } }),
      // R2 scores
      ...(bases.second && { second: { from: 'second', to: 'home', isDefault: true, reason: 'Scores on double' } }),
      // R1 to third (conservative - can adjust to home)
      ...(bases.first && { first: { from: 'first', to: 'third', isDefault: true, reason: 'Advances to 3B' } }),
    };
  }

  // Triple: Batter to 3B, all runners score
  if (hitType === '3B') {
    return {
      batter: { from: 'batter', to: 'third', isDefault: true, reason: 'Triple' },
      ...(bases.third && { third: { from: 'third', to: 'home', isDefault: true, reason: 'Scores on triple' } }),
      ...(bases.second && { second: { from: 'second', to: 'home', isDefault: true, reason: 'Scores on triple' } }),
      ...(bases.first && { first: { from: 'first', to: 'home', isDefault: true, reason: 'Scores on triple' } }),
    };
  }

  // Default single behavior
  return {
    batter: { from: 'batter', to: 'first', isDefault: true, reason: 'Hit' },
    ...(bases.third && { third: { from: 'third', to: 'home', isDefault: true, reason: 'Scores' } }),
    ...(bases.second && { second: { from: 'second', to: 'third', isDefault: true, reason: 'Advances' } }),
    ...(bases.first && { first: { from: 'first', to: 'second', isDefault: true, reason: 'Advances' } }),
  };
}

// ============================================
// HOME RUN DEFAULTS
// ============================================

function calculateHomeRunDefaults(bases: GameBases): RunnerDefaults {
  // Everyone scores!
  return {
    batter: { from: 'batter', to: 'home', isDefault: false, reason: 'Home Run' },
    ...(bases.third && { third: { from: 'third', to: 'home', isDefault: false, reason: 'Scores on HR' } }),
    ...(bases.second && { second: { from: 'second', to: 'home', isDefault: false, reason: 'Scores on HR' } }),
    ...(bases.first && { first: { from: 'first', to: 'home', isDefault: false, reason: 'Scores on HR' } }),
  };
}

// ============================================
// OUT DEFAULTS
// ============================================

function calculateOutDefaults(
  outType: PlayData['outType'],
  bases: GameBases,
  outs: number,
  fieldingSequence: number[]
): RunnerDefaults {
  // Ground out - check for double play potential
  if (outType === 'GO') {
    // With R1 and less than 2 outs, likely double play
    if (bases.first && outs < 2 && fieldingSequence.length >= 2) {
      return {
        batter: { from: 'batter', to: 'out', isDefault: true, reason: 'Ground out' },
        first: { from: 'first', to: 'out', isDefault: true, reason: 'DP - force at 2B' },
        ...(bases.second && { second: { from: 'second', to: 'third', isDefault: true, reason: 'Advances on DP' } }),
        ...(bases.third && { third: { from: 'third', to: 'home', isDefault: true, reason: 'Scores on DP' } }),
      };
    }

    // Standard ground out - runners may advance
    return {
      batter: { from: 'batter', to: 'out', isDefault: true, reason: 'Ground out' },
      // R3 may score on contact (productive out)
      ...(bases.third && outs < 2 && { third: { from: 'third', to: 'home', isDefault: true, reason: 'Scores on ground out' } }),
      // R3 holds with 2 outs
      ...(bases.third && outs >= 2 && { third: { from: 'third', to: 'third', isDefault: true, reason: 'Holds' } }),
      // R2 typically advances on ground out
      ...(bases.second && { second: { from: 'second', to: 'third', isDefault: true, reason: 'Advances to 3B' } }),
      // R1 - depends on force situation
      ...(bases.first && { first: { from: 'first', to: 'second', isDefault: true, reason: 'Advances to 2B' } }),
    };
  }

  // Fly out - tag up opportunities
  if (outType === 'FO' || outType === 'LO') {
    const isDeepFly = outType === 'FO'; // Assume FO is catchable fly

    return {
      batter: { from: 'batter', to: 'out', isDefault: true, reason: 'Fly out' },
      // R3 can tag up with less than 2 outs on deep fly
      ...(bases.third && outs < 2 && isDeepFly && {
        third: { from: 'third', to: 'home', isDefault: true, reason: 'Tags and scores' }
      }),
      // R3 holds on shallow fly or with 2 outs
      ...(bases.third && (outs >= 2 || !isDeepFly) && {
        third: { from: 'third', to: 'third', isDefault: true, reason: 'Holds' }
      }),
      // R2 may advance to 3B on deep fly with less than 2 outs
      ...(bases.second && outs < 2 && isDeepFly && {
        second: { from: 'second', to: 'third', isDefault: true, reason: 'Tags to 3B' }
      }),
      ...(bases.second && (outs >= 2 || !isDeepFly) && {
        second: { from: 'second', to: 'second', isDefault: true, reason: 'Holds' }
      }),
      // R1 rarely advances on fly ball
      ...(bases.first && { first: { from: 'first', to: 'first', isDefault: true, reason: 'Holds' } }),
    };
  }

  // Strikeout - no advancement (unless passed ball/wild pitch, handled separately)
  if (outType === 'K') {
    return {
      batter: { from: 'batter', to: 'out', isDefault: false, reason: 'Strikeout' },
      ...(bases.first && { first: { from: 'first', to: 'first', isDefault: true, reason: 'Holds' } }),
      ...(bases.second && { second: { from: 'second', to: 'second', isDefault: true, reason: 'Holds' } }),
      ...(bases.third && { third: { from: 'third', to: 'third', isDefault: true, reason: 'Holds' } }),
    };
  }

  // Default out - runners hold
  return {
    batter: { from: 'batter', to: 'out', isDefault: true, reason: 'Out' },
    ...(bases.first && { first: { from: 'first', to: 'first', isDefault: true, reason: 'Holds' } }),
    ...(bases.second && { second: { from: 'second', to: 'second', isDefault: true, reason: 'Holds' } }),
    ...(bases.third && { third: { from: 'third', to: 'third', isDefault: true, reason: 'Holds' } }),
  };
}

// ============================================
// ERROR DEFAULTS
// ============================================

function calculateErrorDefaults(bases: GameBases): RunnerDefaults {
  // Error - batter reaches, runners typically advance one extra base
  return {
    batter: { from: 'batter', to: 'first', isDefault: true, reason: 'Reached on error' },
    // R3 scores on error
    ...(bases.third && { third: { from: 'third', to: 'home', isDefault: true, reason: 'Scores on error' } }),
    // R2 to third (may score - user can adjust)
    ...(bases.second && { second: { from: 'second', to: 'third', isDefault: true, reason: 'Advances to 3B' } }),
    // R1 to second (may go further - user can adjust)
    ...(bases.first && { first: { from: 'first', to: 'second', isDefault: true, reason: 'Advances to 2B' } }),
  };
}

// ============================================
// FOUL OUT DEFAULTS
// ============================================

function calculateFoulOutDefaults(bases: GameBases, outs: number): RunnerDefaults {
  // Foul out - batter out, runners may tag up (rarely do on foul territory)
  return {
    batter: { from: 'batter', to: 'out', isDefault: false, reason: 'Foul out' },
    // Runners typically hold on foul outs
    ...(bases.first && { first: { from: 'first', to: 'first', isDefault: true, reason: 'Holds' } }),
    ...(bases.second && { second: { from: 'second', to: 'second', isDefault: true, reason: 'Holds' } }),
    // R3 might tag on deep foul fly with less than 2 outs (rare)
    ...(bases.third && { third: { from: 'third', to: 'third', isDefault: true, reason: 'Holds' } }),
  };
}

// ============================================
// WALK/HBP DEFAULTS (for direct use)
// ============================================

/**
 * Calculate runner defaults for walks (BB, IBB, HBP)
 * Only forced runners advance
 */
export function calculateWalkDefaults(bases: GameBases): RunnerDefaults {
  // Walk logic: Only FORCED runners advance
  // Batter always to first
  // R1 forced to second only if batter going to first
  // R2 forced to third only if R1 forced to second
  // R3 forced home only if R2 forced to third

  const r1Forced = true; // Batter going to first forces R1
  const r2Forced = bases.first; // R1 on base forces R2
  const r3Forced = bases.first && bases.second; // R1 and R2 forces R3

  return {
    batter: { from: 'batter', to: 'first', isDefault: false, reason: 'Walk' },
    // R1 forced to 2B if bases.first occupied (and batter taking 1B)
    ...(bases.first && {
      first: { from: 'first', to: 'second', isDefault: false, reason: 'Forced to 2B' }
    }),
    // R2 forced to 3B only if R1 also advancing
    ...(bases.second && r2Forced && {
      second: { from: 'second', to: 'third', isDefault: false, reason: 'Forced to 3B' }
    }),
    ...(bases.second && !r2Forced && {
      second: { from: 'second', to: 'second', isDefault: false, reason: 'Not forced' }
    }),
    // R3 forced home only if R2 also advancing
    ...(bases.third && r3Forced && {
      third: { from: 'third', to: 'home', isDefault: false, reason: 'Forced home' }
    }),
    ...(bases.third && !r3Forced && {
      third: { from: 'third', to: 'third', isDefault: false, reason: 'Not forced' }
    }),
  };
}

/**
 * Calculate runner defaults for fielder's choice
 * Batter reaches, one runner is out
 */
export function calculateFieldersChoiceDefaults(
  bases: GameBases,
  runnerOut: 'first' | 'second' | 'third'
): RunnerDefaults {
  return {
    batter: { from: 'batter', to: 'first', isDefault: true, reason: "Fielder's choice" },
    // The specified runner is out
    ...(bases.first && runnerOut === 'first' && {
      first: { from: 'first', to: 'out', isDefault: false, reason: 'Out on FC' }
    }),
    ...(bases.first && runnerOut !== 'first' && {
      first: { from: 'first', to: 'second', isDefault: true, reason: 'Advances on FC' }
    }),
    ...(bases.second && runnerOut === 'second' && {
      second: { from: 'second', to: 'out', isDefault: false, reason: 'Out on FC' }
    }),
    ...(bases.second && runnerOut !== 'second' && {
      second: { from: 'second', to: 'third', isDefault: true, reason: 'Advances on FC' }
    }),
    ...(bases.third && runnerOut === 'third' && {
      third: { from: 'third', to: 'out', isDefault: false, reason: 'Out on FC' }
    }),
    ...(bases.third && runnerOut !== 'third' && {
      third: { from: 'third', to: 'home', isDefault: true, reason: 'Scores on FC' }
    }),
  };
}

/**
 * Calculate runner defaults for dropped third strike (D3K)
 * Batter reaches first if legal (no runner on first OR 2 outs)
 */
export function calculateD3KDefaults(bases: GameBases, outs: number): RunnerDefaults {
  const isD3KLegal = !bases.first || outs >= 2;

  if (!isD3KLegal) {
    // D3K not legal - batter out, runners hold
    return {
      batter: { from: 'batter', to: 'out', isDefault: false, reason: 'K (D3K not legal)' },
      ...(bases.first && { first: { from: 'first', to: 'first', isDefault: true, reason: 'Holds' } }),
      ...(bases.second && { second: { from: 'second', to: 'second', isDefault: true, reason: 'Holds' } }),
      ...(bases.third && { third: { from: 'third', to: 'third', isDefault: true, reason: 'Holds' } }),
    };
  }

  // D3K legal - batter reaches, runners may advance
  return {
    batter: { from: 'batter', to: 'first', isDefault: true, reason: 'Reached on D3K' },
    // Runners may advance due to chaos
    ...(bases.third && { third: { from: 'third', to: 'home', isDefault: true, reason: 'Scores on D3K' } }),
    ...(bases.second && { second: { from: 'second', to: 'third', isDefault: true, reason: 'Advances to 3B' } }),
    // R1 forced out if 2 outs (batter taking first), otherwise advances
    ...(bases.first && outs >= 2 && {
      first: { from: 'first', to: 'out', isDefault: true, reason: 'Force out at 2B' }
    }),
    ...(bases.first && outs < 2 && {
      first: { from: 'first', to: 'second', isDefault: true, reason: 'Advances to 2B' }
    }),
  };
}

export default calculateRunnerDefaults;
