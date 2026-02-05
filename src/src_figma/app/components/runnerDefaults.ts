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

  // Inside-the-Park Home Run: Batter to home, all runners score (EXH-008)
  // This handles HR selected from hit type menu (ball in play, not over fence)
  if (hitType === 'HR') {
    return {
      batter: { from: 'batter', to: 'home', isDefault: false, reason: 'Inside-the-Park HR' },
      ...(bases.third && { third: { from: 'third', to: 'home', isDefault: false, reason: 'Scores on HR' } }),
      ...(bases.second && { second: { from: 'second', to: 'home', isDefault: false, reason: 'Scores on HR' } }),
      ...(bases.first && { first: { from: 'first', to: 'home', isDefault: false, reason: 'Scores on HR' } }),
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
  // ============================================
  // DOUBLE PLAY DETECTION (Most important check first!)
  // Per BASEBALL_RULES_INTEGRATION.md: DP when R1 on base + multi-fielder throw
  // ============================================

  // Check for DP: Either explicit DP type OR ground ball with R1 + throw sequence
  // 6-4-3 = SS → 2B → 1B (3 fielders), 4-6-3 = 2B → SS → 1B, etc.
  const isLikelyDP = (
    outType === 'DP' ||
    outType === 'TP' ||
    (bases.first && outs < 2 && fieldingSequence.length >= 2 && (outType === 'GO' || outType === 'FC' || outType === undefined))
  );

  if (isLikelyDP) {
    return {
      batter: { from: 'batter', to: 'out', isDefault: true, reason: outType === 'TP' ? 'Triple play' : 'Ground into DP' },
      first: { from: 'first', to: 'out', isDefault: true, reason: 'Force out at 2B' },
      // R2 may advance if not also out on TP
      ...(bases.second && outType !== 'TP' && { second: { from: 'second', to: 'third', isDefault: true, reason: 'Advances on DP' } }),
      ...(bases.second && outType === 'TP' && { second: { from: 'second', to: 'out', isDefault: true, reason: 'Out on TP' } }),
      // R3 may score on DP (run counts if scored before 3rd out)
      ...(bases.third && { third: { from: 'third', to: 'home', isDefault: true, reason: 'Scores on DP' } }),
    };
  }

  // Ground out (non-DP) - batter out, runners may advance
  if (outType === 'GO') {
    return {
      batter: { from: 'batter', to: 'out', isDefault: true, reason: 'Ground out' },
      // R3 may score on contact (productive out)
      ...(bases.third && outs < 2 && { third: { from: 'third', to: 'home', isDefault: true, reason: 'Scores on ground out' } }),
      // R3 holds with 2 outs
      ...(bases.third && outs >= 2 && { third: { from: 'third', to: 'third', isDefault: true, reason: 'Holds' } }),
      // R2 typically advances on ground out
      ...(bases.second && { second: { from: 'second', to: 'third', isDefault: true, reason: 'Advances to 3B' } }),
      // R1 advances to 2B (no force since batter is out at 1B)
      ...(bases.first && { first: { from: 'first', to: 'second', isDefault: true, reason: 'Advances to 2B' } }),
    };
  }

  // Fielder's Choice (non-DP) - batter reaches, lead runner is out
  if (outType === 'FC') {
    return {
      batter: { from: 'batter', to: 'first', isDefault: true, reason: "Fielder's choice" },
      // R1 is out on FC (most common)
      ...(bases.first && { first: { from: 'first', to: 'out', isDefault: true, reason: 'Out on FC' } }),
      // R2 advances or may be out
      ...(bases.second && !bases.first && { second: { from: 'second', to: 'out', isDefault: true, reason: 'Out on FC' } }),
      ...(bases.second && bases.first && { second: { from: 'second', to: 'third', isDefault: true, reason: 'Advances on FC' } }),
      // R3 scores
      ...(bases.third && { third: { from: 'third', to: 'home', isDefault: true, reason: 'Scores on FC' } }),
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

// ============================================
// STOLEN BASE / RUNNER EVENT DEFAULTS
// ============================================

export type RunnerEventType = 'SB' | 'CS' | 'PK' | 'TBL';

/**
 * Calculate runner defaults for stolen base events (SB, CS, PK, TBL)
 * Shows the runner outcome modal so user can choose which runner is affected
 * and where all runners end up.
 *
 * @param eventType The type of runner event (SB=safe, CS/PK/TBL=out)
 * @param bases Current base occupancy
 * @param targetRunner The runner to default as stealing (trailing runner usually)
 * @returns Default runner outcomes for display/adjustment
 */
export function calculateStolenBaseDefaults(
  eventType: RunnerEventType,
  bases: GameBases,
  targetRunner?: 'first' | 'second' | 'third'
): RunnerDefaults {
  const isSuccess = eventType === 'SB';

  // Determine target runner (trailing runner by default)
  let stealer: 'first' | 'second' | 'third' | null = targetRunner || null;
  if (!stealer) {
    if (bases.first) stealer = 'first';
    else if (bases.second) stealer = 'second';
    else if (bases.third) stealer = 'third';
  }

  // No runner? Return minimal defaults (batter stays, no runner movement)
  if (!stealer) {
    return {
      // For runner events, batter stays at bat - use 'first' as placeholder
      // (the batter field is required but won't be used for runner events)
      batter: { from: 'batter', to: 'first', isDefault: true, reason: 'At bat continues' },
    };
  }

  // Calculate target base for the stealing runner
  const targetBase: BaseId = stealer === 'first' ? 'second'
    : stealer === 'second' ? 'third'
    : 'home';

  // Reason text based on event type
  const eventReasons: Record<RunnerEventType, string> = {
    'SB': 'Stolen base',
    'CS': 'Caught stealing',
    'PK': 'Picked off',
    'TBL': 'TOOTBLAN',
  };

  // Build result - stealer is affected, others hold
  // For runner events, batter stays at bat - use 'first' as placeholder
  // (the batter field is required but won't be processed for runner events)
  const result: RunnerDefaults = {
    batter: { from: 'batter', to: 'first', isDefault: true, reason: 'At bat continues' },
  };

  // Add outcomes for each runner
  if (bases.first) {
    if (stealer === 'first') {
      result.first = {
        from: 'first',
        to: isSuccess ? targetBase : 'out',
        isDefault: true,
        reason: eventReasons[eventType],
      };
    } else {
      result.first = { from: 'first', to: 'first', isDefault: true, reason: 'Holds' };
    }
  }

  if (bases.second) {
    if (stealer === 'second') {
      result.second = {
        from: 'second',
        to: isSuccess ? targetBase : 'out',
        isDefault: true,
        reason: eventReasons[eventType],
      };
    } else {
      result.second = { from: 'second', to: 'second', isDefault: true, reason: 'Holds' };
    }
  }

  if (bases.third) {
    if (stealer === 'third') {
      result.third = {
        from: 'third',
        to: isSuccess ? 'home' : 'out',
        isDefault: true,
        reason: eventReasons[eventType],
      };
    } else {
      result.third = { from: 'third', to: 'third', isDefault: true, reason: 'Holds' };
    }
  }

  return result;
}

export default calculateRunnerDefaults;
