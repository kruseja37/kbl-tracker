/**
 * Save Detection Engine
 *
 * Per FIGMA_IMPLEMENTATION_PLAN.md Phase 1.2
 * Ported from legacy src/engines/detectionFunctions.ts
 *
 * Tracks:
 * - Save opportunities
 * - Saves (successful completion)
 * - Blown saves
 * - Blown save + loss
 * - Holds (reliever protects lead, exits before save)
 *
 * Official Save Rules (MLB):
 * 1. Pitcher finishes game with lead
 * 2. Pitcher is not the winning pitcher
 * 3. One of:
 *    a) Enters with lead of 3 runs or less and pitches at least 1 inning
 *    b) Enters with tying run on base, at bat, or on deck
 *    c) Pitches 3+ effective innings (rare)
 */

import type { Runner, Bases, HowReached } from '../types/substitution';

// ============================================
// TYPES
// ============================================

export interface GameState {
  inning: number;
  halfInning: 'TOP' | 'BOTTOM';
  outs: number;
  bases: Bases;
  homeScore: number;
  awayScore: number;
  scheduledInnings: number;
  /** Is this the home team's defense (bottom of inning)? */
  isHomeDefense: boolean;
}

export interface PitcherAppearance {
  pitcherId: string;
  pitcherName: string;
  /** Score when pitcher entered */
  leadWhenEntered: number;
  /** Score when pitcher exited (or current) */
  leadWhenExited: number;
  /** Did pitcher enter in a save opportunity? */
  enteredInSaveOpportunity: boolean;
  /** Entry game state */
  entryState: {
    inning: number;
    outs: number;
    bases: { first: boolean; second: boolean; third: boolean };
    lead: number;
  };
  /** Outs recorded by this pitcher */
  outsRecorded: number;
  /** Did pitcher finish the game? */
  finishedGame: boolean;
  /** Runs allowed while in game */
  runsAllowed: number;
  /** Is this pitcher eligible for the win? (entered with lead/tie, team won) */
  isWinningPitcher: boolean;
}

export type SaveResult =
  | 'SAVE'
  | 'BLOWN_SAVE'
  | 'BLOWN_SAVE_LOSS'
  | 'HOLD'
  | 'NONE';

export interface SaveDetectionResult {
  result: SaveResult;
  message: string;
  details: {
    enteredWithLead: number;
    exitedWithLead: number;
    outsRecorded: number;
    wasQualifyingSituation: boolean;
  };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Count runners on base
 */
function countRunners(bases: Bases): number {
  let count = 0;
  if (bases.first) count++;
  if (bases.second) count++;
  if (bases.third) count++;
  return count;
}

/**
 * Count runners (from boolean bases)
 */
function countRunnersBool(bases: { first: boolean; second: boolean; third: boolean }): number {
  let count = 0;
  if (bases.first) count++;
  if (bases.second) count++;
  if (bases.third) count++;
  return count;
}

// ============================================
// SAVE OPPORTUNITY DETECTION
// ============================================

/**
 * Check if current situation is a save opportunity
 *
 * Save opportunity conditions:
 * 1. Team has the lead
 * 2. Must be in 7th inning or later (for 9-inning game)
 * 3. One of:
 *    a) Lead of 3 runs or less
 *    b) Tying run is on base, at bat, or on deck
 */
export function isSaveOpportunity(
  lead: number,
  bases: Bases,
  inning: number,
  scheduledInnings: number = 9
): boolean {
  // Must have a lead
  if (lead <= 0) return false;

  // Must be in the "late game" (7th or later for 9-inning, proportional for other lengths)
  // For 9 innings: 7th+ (inning >= scheduledInnings - 2)
  // For 7 innings: 5th+
  // For 6 innings: 4th+
  const lateGameStart = Math.max(1, scheduledInnings - 2);
  if (inning < lateGameStart) return false;

  // Condition A: Lead of 3 runs or less
  if (lead <= 3) return true;

  // Condition B: Tying run is on base, at bat, or on deck
  // Tying run is "at bat or closer" if lead <= (runners + 1)
  // - Lead=4, runners=3 (loaded): tying run = next batter (at bat) ✓
  // - Lead=4, runners=2: tying run = on deck ✓
  // - Lead=4, runners=1: tying run = in the hole (not close enough) ✗
  // - Lead=4, runners=0: tying run = 4 batters away ✗
  const runnersCount = countRunners(bases);
  return lead <= (runnersCount + 2); // +2 for "at bat or on deck"
}

/**
 * Check if situation qualifies for save opportunity (with boolean bases)
 */
export function isSaveOpportunityBool(
  lead: number,
  bases: { first: boolean; second: boolean; third: boolean },
  inning: number,
  scheduledInnings: number = 9
): boolean {
  if (lead <= 0) return false;

  const lateGameStart = Math.max(1, scheduledInnings - 2);
  if (inning < lateGameStart) return false;

  if (lead <= 3) return true;

  const runnersCount = countRunnersBool(bases);
  return lead <= (runnersCount + 2);
}

// ============================================
// SAVE DETECTION
// ============================================

/**
 * Detect if pitcher earned a save
 *
 * Requirements for a save:
 * 1. Pitcher finishes game with team winning
 * 2. Pitcher is NOT the winning pitcher of record
 * 3. Entered in a save opportunity situation
 * 4. Pitched at least 1 inning (3 outs) OR entered with tying run on base/at bat
 */
export function detectSave(
  appearance: PitcherAppearance,
  gameEnded: boolean,
  teamWon: boolean
): SaveDetectionResult {
  const details = {
    enteredWithLead: appearance.leadWhenEntered,
    exitedWithLead: appearance.leadWhenExited,
    outsRecorded: appearance.outsRecorded,
    wasQualifyingSituation: appearance.enteredInSaveOpportunity,
  };

  // Game must be over
  if (!gameEnded) {
    return {
      result: 'NONE',
      message: 'Game not finished',
      details,
    };
  }

  // Must have entered in save opportunity
  if (!appearance.enteredInSaveOpportunity) {
    return {
      result: 'NONE',
      message: 'Did not enter in save opportunity',
      details,
    };
  }

  // Check for blown save first
  if (appearance.leadWhenExited <= 0 && appearance.leadWhenEntered > 0) {
    // Lost or tied the lead
    const isLoss = !teamWon;
    return {
      result: isLoss ? 'BLOWN_SAVE_LOSS' : 'BLOWN_SAVE',
      message: isLoss
        ? `${appearance.pitcherName} blew the save AND took the loss!`
        : `${appearance.pitcherName} blew the save!`,
      details,
    };
  }

  // For a save, pitcher must finish the game
  if (!appearance.finishedGame) {
    // Could be a hold if they maintained the lead
    if (appearance.leadWhenExited > 0 && appearance.outsRecorded >= 3) {
      return {
        result: 'HOLD',
        message: `${appearance.pitcherName} earned a hold`,
        details,
      };
    }
    return {
      result: 'NONE',
      message: 'Did not finish game',
      details,
    };
  }

  // Team must have won
  if (!teamWon) {
    return {
      result: 'NONE',
      message: 'Team did not win',
      details,
    };
  }

  // Cannot be the winning pitcher
  if (appearance.isWinningPitcher) {
    return {
      result: 'NONE',
      message: 'Pitcher is winning pitcher (not eligible for save)',
      details,
    };
  }

  // Must have pitched at least 3 outs (1 inning)
  // OR entered with tying run on base/at bat/on deck
  const hadTyingRunClose =
    appearance.leadWhenEntered <= (countRunnersBool(appearance.entryState.bases) + 2);

  if (appearance.outsRecorded < 3 && !hadTyingRunClose) {
    return {
      result: 'NONE',
      message: 'Did not pitch full inning without tying run close',
      details,
    };
  }

  // All conditions met - SAVE!
  return {
    result: 'SAVE',
    message: `${appearance.pitcherName} earned the save!`,
    details,
  };
}

// ============================================
// BLOWN SAVE DETECTION
// ============================================

/**
 * Detect blown save (legacy function signature compatibility)
 */
export function detectBlownSave(
  appearance: PitcherAppearance,
  gameEnded: boolean,
  teamWon: boolean
): { eventType: 'BLOWN_SAVE' | 'BLOWN_SAVE_LOSS'; message: string } | null {
  if (!appearance.enteredInSaveOpportunity) {
    return null;
  }

  // Lead was lost or tied
  if (appearance.leadWhenExited <= 0 && appearance.leadWhenEntered > 0) {
    const isBlownSaveLoss = gameEnded && !teamWon;

    return {
      eventType: isBlownSaveLoss ? 'BLOWN_SAVE_LOSS' : 'BLOWN_SAVE',
      message: isBlownSaveLoss
        ? `${appearance.pitcherName} blew the save AND took the loss!`
        : `${appearance.pitcherName} blew the save!`,
    };
  }

  return null;
}

// ============================================
// HOLD DETECTION
// ============================================

/**
 * Detect if pitcher earned a hold
 *
 * A hold is awarded when:
 * 1. Reliever enters in save situation
 * 2. Records at least 1 out
 * 3. Leaves without relinquishing the lead
 * 4. Does not finish the game (another reliever gets the save)
 */
export function detectHold(
  appearance: PitcherAppearance,
  gameEnded: boolean,
  teamWon: boolean,
  anotherPitcherGotSave: boolean
): { result: boolean; message: string } {
  // Must have entered in save opportunity
  if (!appearance.enteredInSaveOpportunity) {
    return { result: false, message: 'Did not enter in save opportunity' };
  }

  // Must have recorded at least 1 out
  if (appearance.outsRecorded < 1) {
    return { result: false, message: 'Did not record an out' };
  }

  // Must have maintained the lead
  if (appearance.leadWhenExited <= 0) {
    return { result: false, message: 'Relinquished the lead' };
  }

  // Must NOT have finished the game
  if (appearance.finishedGame) {
    return { result: false, message: 'Finished the game (eligible for save, not hold)' };
  }

  // Team should have won (hold requires eventual win)
  if (gameEnded && !teamWon) {
    return { result: false, message: 'Team did not win' };
  }

  // If game ended, another pitcher should have gotten the save
  if (gameEnded && !anotherPitcherGotSave) {
    return { result: false, message: 'No save recorded after this appearance' };
  }

  return {
    result: true,
    message: `${appearance.pitcherName} earned a hold`,
  };
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Calculate lead from game state perspective
 * Returns positive if defending team is ahead, negative if behind
 */
export function calculateLead(state: GameState): number {
  if (state.isHomeDefense) {
    // Home team is in the field (bottom of inning)
    return state.homeScore - state.awayScore;
  } else {
    // Away team is in the field (top of inning)
    return state.awayScore - state.homeScore;
  }
}

/**
 * Create a pitcher appearance record when a reliever enters
 */
export function createPitcherAppearance(
  pitcherId: string,
  pitcherName: string,
  gameState: GameState
): PitcherAppearance {
  const lead = calculateLead(gameState);
  const bases: Bases = {
    first: gameState.bases.first ? { playerId: 'r1', playerName: 'Runner', inheritedFrom: null } : null,
    second: gameState.bases.second ? { playerId: 'r2', playerName: 'Runner', inheritedFrom: null } : null,
    third: gameState.bases.third ? { playerId: 'r3', playerName: 'Runner', inheritedFrom: null } : null,
  };

  const isInSaveOpportunity = isSaveOpportunityBool(
    lead,
    {
      first: !!gameState.bases.first,
      second: !!gameState.bases.second,
      third: !!gameState.bases.third,
    },
    gameState.inning,
    gameState.scheduledInnings
  );

  return {
    pitcherId,
    pitcherName,
    leadWhenEntered: lead,
    leadWhenExited: lead, // Will be updated as game progresses
    enteredInSaveOpportunity: isInSaveOpportunity,
    entryState: {
      inning: gameState.inning,
      outs: gameState.outs,
      bases: {
        first: !!gameState.bases.first,
        second: !!gameState.bases.second,
        third: !!gameState.bases.third,
      },
      lead,
    },
    outsRecorded: 0,
    finishedGame: false,
    runsAllowed: 0,
    isWinningPitcher: false, // Will be determined at game end
  };
}

/**
 * Update pitcher appearance with current game state
 */
export function updatePitcherAppearance(
  appearance: PitcherAppearance,
  gameState: GameState,
  additionalOuts: number = 0,
  additionalRuns: number = 0
): PitcherAppearance {
  const lead = calculateLead(gameState);

  return {
    ...appearance,
    leadWhenExited: lead,
    outsRecorded: appearance.outsRecorded + additionalOuts,
    runsAllowed: appearance.runsAllowed + additionalRuns,
  };
}

/**
 * Finalize pitcher appearance when game ends
 */
export function finalizePitcherAppearance(
  appearance: PitcherAppearance,
  finishedGame: boolean,
  isWinningPitcher: boolean,
  finalLead: number
): PitcherAppearance {
  return {
    ...appearance,
    finishedGame,
    isWinningPitcher,
    leadWhenExited: finalLead,
  };
}
