/**
 * Inherited/Bequeathed Runner Tracker
 *
 * Per FIGMA_IMPLEMENTATION_PLAN.md Phase 1.3
 *
 * This engine tracks which pitcher is responsible for runners on base,
 * which is critical for proper Earned Run (ER) attribution.
 *
 * Key Concepts:
 * - BEQUEATHED RUNNERS: Runners left on base by the outgoing pitcher
 * - INHERITED RUNNERS: Runners the incoming pitcher takes over responsibility for
 * - ER ATTRIBUTION: When a runner scores, the ER is charged to the pitcher
 *   who allowed them on base, NOT the pitcher who allowed them to score
 *
 * Example:
 * - Pitcher A walks a batter, then is pulled
 * - Pitcher B allows a single that scores the runner
 * - The ER is charged to Pitcher A, not Pitcher B
 */

import type { Runner, Bases, HowReached } from '../types/substitution';

// ============================================
// TYPES
// ============================================

export interface TrackedRunner {
  /** Unique runner ID */
  runnerId: string;
  /** Runner's display name */
  runnerName: string;
  /** Current base (1B, 2B, 3B) or null if scored/out */
  currentBase: '1B' | '2B' | '3B' | 'HOME' | 'OUT' | null;
  /** Original base when play started */
  startingBase: '1B' | '2B' | '3B' | 'HOME';
  /** How the runner originally reached base */
  howReached: HowReached;
  /** Pitcher ID responsible for this runner (for ER attribution) */
  responsiblePitcherId: string;
  /** Pitcher name responsible */
  responsiblePitcherName: string;
  /** Was this runner inherited from a previous pitcher? */
  isInherited: boolean;
  /** If inherited, from which pitcher ID */
  inheritedFromPitcherId: string | null;
  /** At what inning was this runner put on base? */
  inningReached: number;
  /** At what at-bat number was this runner put on base? */
  atBatReached: number;
}

export interface PitcherRunnerStats {
  /** Pitcher ID */
  pitcherId: string;
  /** Pitcher name */
  pitcherName: string;
  /** Runners this pitcher put on base (who haven't scored yet) */
  runnersOnBase: TrackedRunner[];
  /** Runners this pitcher allowed who scored (for ER) */
  runnersScored: TrackedRunner[];
  /** Inherited runners (from previous pitcher) */
  inheritedRunners: TrackedRunner[];
  /** Inherited runners who scored */
  inheritedRunnersScored: TrackedRunner[];
  /** Count of bequeathed runners (left for next pitcher) */
  bequeathedRunnerCount: number;
}

export interface RunnerTrackingState {
  /** Currently tracked runners on base */
  runners: TrackedRunner[];
  /** Current pitcher ID */
  currentPitcherId: string;
  /** Current pitcher name */
  currentPitcherName: string;
  /** Stats per pitcher appearance */
  pitcherStats: Map<string, PitcherRunnerStats>;
  /** Current inning */
  inning: number;
  /** Current at-bat number */
  atBatNumber: number;
}

export interface RunnerScoredEvent {
  runner: TrackedRunner;
  wasEarnedRun: boolean;
  chargedToPitcherId: string;
  chargedToPitcherName: string;
  wasInherited: boolean;
}

// ============================================
// STATE MANAGEMENT
// ============================================

/**
 * Create initial runner tracking state
 */
export function createRunnerTrackingState(
  currentPitcherId: string,
  currentPitcherName: string
): RunnerTrackingState {
  const stats: PitcherRunnerStats = {
    pitcherId: currentPitcherId,
    pitcherName: currentPitcherName,
    runnersOnBase: [],
    runnersScored: [],
    inheritedRunners: [],
    inheritedRunnersScored: [],
    bequeathedRunnerCount: 0,
  };

  return {
    runners: [],
    currentPitcherId,
    currentPitcherName,
    pitcherStats: new Map([[currentPitcherId, stats]]),
    inning: 1,
    atBatNumber: 1,
  };
}

/**
 * Get or create pitcher stats
 */
function getOrCreatePitcherStats(
  state: RunnerTrackingState,
  pitcherId: string,
  pitcherName: string
): PitcherRunnerStats {
  let stats = state.pitcherStats.get(pitcherId);
  if (!stats) {
    stats = {
      pitcherId,
      pitcherName,
      runnersOnBase: [],
      runnersScored: [],
      inheritedRunners: [],
      inheritedRunnersScored: [],
      bequeathedRunnerCount: 0,
    };
    state.pitcherStats.set(pitcherId, stats);
  }
  return stats;
}

// ============================================
// RUNNER PLACEMENT
// ============================================

/**
 * Add a runner to a base (when they reach)
 */
export function addRunner(
  state: RunnerTrackingState,
  runnerId: string,
  runnerName: string,
  base: '1B' | '2B' | '3B',
  howReached: HowReached
): RunnerTrackingState {
  const newRunner: TrackedRunner = {
    runnerId,
    runnerName,
    currentBase: base,
    startingBase: base,
    howReached,
    responsiblePitcherId: state.currentPitcherId,
    responsiblePitcherName: state.currentPitcherName,
    isInherited: false,
    inheritedFromPitcherId: null,
    inningReached: state.inning,
    atBatReached: state.atBatNumber,
  };

  // Add to current pitcher's stats
  const stats = getOrCreatePitcherStats(state, state.currentPitcherId, state.currentPitcherName);
  stats.runnersOnBase.push(newRunner);

  return {
    ...state,
    runners: [...state.runners, newRunner],
  };
}

/**
 * Advance a runner to a new base
 */
export function advanceRunner(
  state: RunnerTrackingState,
  runnerId: string,
  toBase: '1B' | '2B' | '3B' | 'HOME'
): { state: RunnerTrackingState; scoredEvent: RunnerScoredEvent | null } {
  const runner = state.runners.find(r => r.runnerId === runnerId);
  if (!runner) {
    return { state, scoredEvent: null };
  }

  // Update runner's position
  const updatedRunner: TrackedRunner = {
    ...runner,
    currentBase: toBase,
  };

  let scoredEvent: RunnerScoredEvent | null = null;

  // If runner scored
  if (toBase === 'HOME') {
    // Determine ER attribution
    const responsibleStats = getOrCreatePitcherStats(
      state,
      runner.responsiblePitcherId,
      runner.responsiblePitcherName
    );

    // Earned run if reached via hit, walk, or HBP (not error or FC)
    const wasEarnedRun = runner.howReached !== 'error' && runner.howReached !== 'FC';

    scoredEvent = {
      runner: updatedRunner,
      wasEarnedRun,
      chargedToPitcherId: runner.responsiblePitcherId,
      chargedToPitcherName: runner.responsiblePitcherName,
      wasInherited: runner.isInherited,
    };

    // Update pitcher stats
    responsibleStats.runnersScored.push(updatedRunner);

    // Remove from runners on base
    responsibleStats.runnersOnBase = responsibleStats.runnersOnBase.filter(
      r => r.runnerId !== runnerId
    );

    // If this was an inherited runner, track it
    if (runner.isInherited) {
      const currentStats = getOrCreatePitcherStats(
        state,
        state.currentPitcherId,
        state.currentPitcherName
      );
      currentStats.inheritedRunnersScored.push(updatedRunner);
    }

    // Remove from active runners
    return {
      state: {
        ...state,
        runners: state.runners.filter(r => r.runnerId !== runnerId),
      },
      scoredEvent,
    };
  }

  // Just advancing, update position
  return {
    state: {
      ...state,
      runners: state.runners.map(r => (r.runnerId === runnerId ? updatedRunner : r)),
    },
    scoredEvent: null,
  };
}

/**
 * Runner is out
 */
export function runnerOut(
  state: RunnerTrackingState,
  runnerId: string
): RunnerTrackingState {
  const runner = state.runners.find(r => r.runnerId === runnerId);
  if (!runner) {
    return state;
  }

  // Remove from responsible pitcher's stats
  const responsibleStats = getOrCreatePitcherStats(
    state,
    runner.responsiblePitcherId,
    runner.responsiblePitcherName
  );
  responsibleStats.runnersOnBase = responsibleStats.runnersOnBase.filter(
    r => r.runnerId !== runnerId
  );

  // Remove from active runners
  return {
    ...state,
    runners: state.runners.filter(r => r.runnerId !== runnerId),
  };
}

// ============================================
// PITCHING CHANGE HANDLING
// ============================================

/**
 * Handle pitching change - transfer runner responsibility
 *
 * When a pitcher is replaced, any runners on base become "inherited"
 * by the new pitcher, but the ER responsibility stays with the original pitcher.
 */
export function handlePitchingChange(
  state: RunnerTrackingState,
  newPitcherId: string,
  newPitcherName: string
): {
  state: RunnerTrackingState;
  bequeathedRunners: TrackedRunner[];
  inheritedRunnerCount: number;
} {
  const outgoingPitcherId = state.currentPitcherId;
  const bequeathedRunners = state.runners.filter(r => r.currentBase !== null && r.currentBase !== 'HOME' && r.currentBase !== 'OUT');

  // Update outgoing pitcher's bequeathed count
  const outgoingStats = getOrCreatePitcherStats(
    state,
    outgoingPitcherId,
    state.currentPitcherName
  );
  outgoingStats.bequeathedRunnerCount = bequeathedRunners.length;

  // Mark runners as inherited by new pitcher (but keep ER responsibility)
  const updatedRunners = state.runners.map(runner => {
    if (runner.currentBase !== null && runner.currentBase !== 'HOME' && runner.currentBase !== 'OUT') {
      return {
        ...runner,
        isInherited: true,
        inheritedFromPitcherId: outgoingPitcherId,
      };
    }
    return runner;
  });

  // Create stats for new pitcher
  const newStats = getOrCreatePitcherStats(state, newPitcherId, newPitcherName);
  newStats.inheritedRunners = bequeathedRunners.map(r => ({
    ...r,
    isInherited: true,
    inheritedFromPitcherId: outgoingPitcherId,
  }));

  return {
    state: {
      ...state,
      runners: updatedRunners,
      currentPitcherId: newPitcherId,
      currentPitcherName: newPitcherName,
    },
    bequeathedRunners,
    inheritedRunnerCount: bequeathedRunners.length,
  };
}

// ============================================
// PINCH RUNNER HANDLING
// ============================================

/**
 * Handle pinch runner - transfer runner with same ER responsibility
 *
 * When a pinch runner replaces a runner on base, the new runner
 * inherits the ER responsibility of the original runner.
 */
export function handlePinchRunner(
  state: RunnerTrackingState,
  originalRunnerId: string,
  newRunnerId: string,
  newRunnerName: string
): RunnerTrackingState {
  const originalRunner = state.runners.find(r => r.runnerId === originalRunnerId);
  if (!originalRunner) {
    return state;
  }

  // Create new runner with same responsibility
  const pinchRunner: TrackedRunner = {
    ...originalRunner,
    runnerId: newRunnerId,
    runnerName: newRunnerName,
    // Keep the same pitcher responsibility!
    responsiblePitcherId: originalRunner.responsiblePitcherId,
    responsiblePitcherName: originalRunner.responsiblePitcherName,
    isInherited: originalRunner.isInherited,
    inheritedFromPitcherId: originalRunner.inheritedFromPitcherId,
  };

  // Update pitcher stats - replace the runner reference
  const responsibleStats = getOrCreatePitcherStats(
    state,
    originalRunner.responsiblePitcherId,
    originalRunner.responsiblePitcherName
  );
  responsibleStats.runnersOnBase = responsibleStats.runnersOnBase.map(r =>
    r.runnerId === originalRunnerId ? pinchRunner : r
  );

  // Update active runners
  return {
    ...state,
    runners: state.runners.map(r => (r.runnerId === originalRunnerId ? pinchRunner : r)),
  };
}

// ============================================
// INNING/AT-BAT MANAGEMENT
// ============================================

/**
 * Clear bases at end of half-inning
 */
export function clearBases(state: RunnerTrackingState): RunnerTrackingState {
  // Note: We don't clear runner history, just the active runners
  return {
    ...state,
    runners: [],
  };
}

/**
 * Advance to next inning
 */
export function nextInning(state: RunnerTrackingState): RunnerTrackingState {
  return clearBases({
    ...state,
    inning: state.inning + 1,
    atBatNumber: 1,
  });
}

/**
 * Advance to next at-bat
 */
export function nextAtBat(state: RunnerTrackingState): RunnerTrackingState {
  return {
    ...state,
    atBatNumber: state.atBatNumber + 1,
  };
}

// ============================================
// SUMMARY FUNCTIONS
// ============================================

/**
 * Get ER summary for all pitchers
 */
export function getERSummary(state: RunnerTrackingState): Array<{
  pitcherId: string;
  pitcherName: string;
  earnedRuns: number;
  unearnedRuns: number;
  inheritedRunnersScored: number;
  bequeathedRunners: number;
}> {
  const summary: Array<{
    pitcherId: string;
    pitcherName: string;
    earnedRuns: number;
    unearnedRuns: number;
    inheritedRunnersScored: number;
    bequeathedRunners: number;
  }> = [];

  for (const [pitcherId, stats] of state.pitcherStats.entries()) {
    let earnedRuns = 0;
    let unearnedRuns = 0;

    for (const runner of stats.runnersScored) {
      if (runner.howReached !== 'error' && runner.howReached !== 'FC') {
        earnedRuns++;
      } else {
        unearnedRuns++;
      }
    }

    summary.push({
      pitcherId,
      pitcherName: stats.pitcherName,
      earnedRuns,
      unearnedRuns,
      inheritedRunnersScored: stats.inheritedRunnersScored.length,
      bequeathedRunners: stats.bequeathedRunnerCount,
    });
  }

  return summary;
}

/**
 * Get current bases state (for display)
 */
export function getCurrentBases(state: RunnerTrackingState): Bases {
  const bases: Bases = {
    first: null,
    second: null,
    third: null,
  };

  for (const runner of state.runners) {
    if (runner.currentBase === '1B') {
      bases.first = {
        playerId: runner.runnerId,
        playerName: runner.runnerName,
        inheritedFrom: runner.isInherited ? runner.inheritedFromPitcherId : null,
        howReached: runner.howReached,
      };
    } else if (runner.currentBase === '2B') {
      bases.second = {
        playerId: runner.runnerId,
        playerName: runner.runnerName,
        inheritedFrom: runner.isInherited ? runner.inheritedFromPitcherId : null,
        howReached: runner.howReached,
      };
    } else if (runner.currentBase === '3B') {
      bases.third = {
        playerId: runner.runnerId,
        playerName: runner.runnerName,
        inheritedFrom: runner.isInherited ? runner.inheritedFromPitcherId : null,
        howReached: runner.howReached,
      };
    }
  }

  return bases;
}
