/**
 * Fielding Event Extractor
 *
 * Maps PlayData (from EnhancedInteractiveField drag-and-drop) to
 * FieldingEvent[] (for eventLog.ts / IndexedDB persistence).
 *
 * This bridges the gap between the UI capture layer and the storage layer,
 * enabling fWAR calculation and season fielding stat aggregation.
 *
 * Called from GameTracker.tsx handleEnhancedPlayComplete() after each
 * ball-in-play at-bat is recorded.
 */

import type { FieldingEvent, BallInPlayData } from '../../../utils/eventLog';
import type { Position } from '../../../types/game';
import type { PlayData } from '../components/EnhancedInteractiveField';
import { POSITION_MAP } from '../components/fielderInference';

// ============================================
// MAPPING HELPERS
// ============================================

/**
 * Map PlayData.exitType to BallInPlayData.trajectory
 */
function mapExitTypeToTrajectory(
  exitType?: 'Ground' | 'Line Drive' | 'Fly Ball' | 'Pop Up'
): BallInPlayData['trajectory'] {
  if (!exitType) return 'ground'; // default for ground balls
  const mapping: Record<string, BallInPlayData['trajectory']> = {
    'Ground': 'ground',
    'Line Drive': 'line',
    'Fly Ball': 'fly',
    'Pop Up': 'popup',
  };
  return mapping[exitType] || 'ground';
}

/**
 * Map PlayData.playDifficulty to FieldingEvent.difficulty
 */
function mapPlayDifficulty(
  playDifficulty?: 'routine' | 'likely' | 'difficult' | 'impossible'
): FieldingEvent['difficulty'] {
  if (!playDifficulty) return 'routine';
  const mapping: Record<string, FieldingEvent['difficulty']> = {
    'routine': 'routine',
    'likely': 'likely',
    'difficult': '50-50',
    'impossible': 'spectacular',
  };
  return mapping[playDifficulty] || 'routine';
}

/**
 * Map spraySector string to a numeric zone (1-6)
 * Zones roughly correspond to field areas.
 */
function mapSpraySectorToZone(spraySector?: string): number {
  if (!spraySector) return 0;
  const sectorMap: Record<string, number> = {
    'Left': 1,
    'Left-Center': 2,
    'Center': 3,
    'Right-Center': 4,
    'Right': 5,
    'Infield': 6,
  };
  return sectorMap[spraySector] || 0;
}

/**
 * Map PlayData.errorType string to the eventLog error play type
 * PlayData uses 'FIELDING' | 'THROWING' | 'MENTAL'
 */
function mapErrorType(
  errorType?: string
): 'fielding' | 'throwing' | 'mental' {
  if (!errorType) return 'fielding';
  const mapping: Record<string, 'fielding' | 'throwing' | 'mental'> = {
    'FIELDING': 'fielding',
    'THROWING': 'throwing',
    'MENTAL': 'mental',
  };
  return mapping[errorType.toUpperCase()] || 'fielding';
}

/**
 * Get position string from a position number, with fallback
 */
function positionFromNumber(posNum: number): Position {
  return (POSITION_MAP[posNum] as Position) || 'SS';
}

/**
 * Infer trajectory from out type when exitType not available
 */
function inferTrajectoryFromOutType(outType?: string): BallInPlayData['trajectory'] {
  if (!outType) return 'ground';
  const mapping: Record<string, BallInPlayData['trajectory']> = {
    'GO': 'ground',
    'FO': 'fly',
    'LO': 'line',
    'PO': 'popup',
    'DP': 'ground',
    'TP': 'ground',
    'SF': 'fly',
    'SAC': 'bunt',
    'FC': 'ground',
  };
  return mapping[outType] || 'ground';
}

// ============================================
// MAIN EXTRACTION FUNCTION
// ============================================

/**
 * Context needed for generating fielding events
 */
export interface FieldingExtractionContext {
  gameId: string;
  defensiveTeamId: string;
  atBatSequence: number;
}

/**
 * Extract fielding events from a completed play.
 *
 * @param playData - The play data from EnhancedInteractiveField
 * @param context - Game context (gameId, defensive team, at-bat sequence)
 * @returns Array of FieldingEvent objects to be persisted via logFieldingEvent()
 */
export function extractFieldingEvents(
  playData: PlayData,
  context: FieldingExtractionContext,
): FieldingEvent[] {
  const events: FieldingEvent[] = [];

  // No fielding events for non-ball-in-play outcomes
  if (playData.type === 'walk' || playData.type === 'foul_ball') {
    return events;
  }

  // No fielding events for home runs (ball leaves the park)
  if (playData.type === 'hr') {
    return events;
  }

  // Determine trajectory
  const trajectory = playData.exitType
    ? mapExitTypeToTrajectory(playData.exitType)
    : inferTrajectoryFromOutType(playData.outType);

  const difficulty = mapPlayDifficulty(playData.playDifficulty);
  const zone = mapSpraySectorToZone(playData.spraySector);

  // Build the ball-in-play data shared across all events on this play
  const ballInPlay: BallInPlayData = {
    trajectory,
    zone,
    velocity: 'medium', // SMB4 doesn't expose exit velocity
    fielderIds: playData.fieldingSequence.map(n => positionFromNumber(n)),
    primaryFielderId: playData.fieldingSequence.length > 0
      ? positionFromNumber(playData.fieldingSequence[0])
      : '',
  };

  // Helper to create a fielding event
  const makeEvent = (
    positionNum: number,
    playType: FieldingEvent['playType'],
    sequenceIdx: number,
    overrideDifficulty?: FieldingEvent['difficulty'],
  ): FieldingEvent => {
    const position = positionFromNumber(positionNum);
    return {
      fieldingEventId: `${context.gameId}_fe_${context.atBatSequence}_${sequenceIdx}`,
      gameId: context.gameId,
      atBatEventId: `${context.gameId}_ab_${context.atBatSequence}`,
      sequence: sequenceIdx,
      playerId: position,  // Position-based ID; resolved to real playerId at game end
      playerName: position,
      position,
      teamId: context.defensiveTeamId,
      playType,
      difficulty: overrideDifficulty || difficulty,
      ballInPlay,
      success: playType !== 'error',
      runsPreventedOrAllowed: 0, // Would need LI integration for real values
    };
  };

  // ============================================
  // ROUTE BY PLAY TYPE
  // ============================================

  if (playData.type === 'error') {
    // Error play: errorFielder gets an error event
    if (playData.errorFielder) {
      events.push(makeEvent(playData.errorFielder, 'error', 0));
    }
    return events;
  }

  if (playData.type === 'foul_out') {
    // Foul out: first fielder in sequence gets a putout
    if (playData.fieldingSequence.length > 0) {
      events.push(makeEvent(playData.fieldingSequence[0], 'putout', 0));
    }
    return events;
  }

  if (playData.type === 'out') {
    const outType = playData.outType || 'GO';
    const seq = playData.fieldingSequence;

    // Strikeouts: no fielding event (not a ball in play)
    // Exception: D3K with catcher involved (seq includes position 2)
    if (outType === 'K' || outType === 'KL') {
      // D3K: catcher (2) throwing to first baseman (3)
      if (seq.length >= 2 && seq[0] === 2) {
        events.push(makeEvent(2, 'assist', 0)); // Catcher assist
        events.push(makeEvent(seq[seq.length - 1], 'putout', 1)); // 1B putout
      }
      return events;
    }

    // Double play
    if (outType === 'DP' || playData.dpType) {
      if (seq.length >= 2) {
        // First fielder = starter (assist)
        events.push(makeEvent(seq[0], 'assist', 0));
        // Middle fielder(s) = pivot (double_play_pivot, which counts as assist)
        for (let i = 1; i < seq.length - 1; i++) {
          events.push(makeEvent(seq[i], 'double_play_pivot', i));
        }
        // Last fielder = putout
        events.push(makeEvent(seq[seq.length - 1], 'putout', seq.length - 1));
      }
      return events;
    }

    // Triple play
    if (outType === 'TP') {
      // Same structure as DP — assists for all but last, putout for last
      if (seq.length >= 2) {
        for (let i = 0; i < seq.length - 1; i++) {
          events.push(makeEvent(seq[i], 'assist', i));
        }
        events.push(makeEvent(seq[seq.length - 1], 'putout', seq.length - 1));
      }
      return events;
    }

    // Sacrifice fly
    if (outType === 'SF') {
      if (seq.length > 0) {
        // Fielder who caught it gets putout
        events.push(makeEvent(seq[seq.length - 1], 'putout', 0));
        // If there's a throw, earlier fielders get assists
        for (let i = 0; i < seq.length - 1; i++) {
          events.push(makeEvent(seq[i], 'assist', i + 1));
        }
      }
      return events;
    }

    // Fielder's choice
    if (outType === 'FC') {
      // FC: runner out at another base. First fielder fields, last records putout
      if (seq.length >= 2) {
        for (let i = 0; i < seq.length - 1; i++) {
          events.push(makeEvent(seq[i], 'assist', i));
        }
        events.push(makeEvent(seq[seq.length - 1], 'putout', seq.length - 1));
      } else if (seq.length === 1) {
        events.push(makeEvent(seq[0], 'putout', 0));
      }
      return events;
    }

    // Standard outs (GO, FO, LO, PO, SAC)
    if (seq.length === 0) {
      // No fielding sequence — can't attribute
      return events;
    }

    if (seq.length === 1) {
      // Unassisted out (e.g., fly ball caught)
      events.push(makeEvent(seq[0], 'putout', 0));
    } else {
      // Multiple fielders: first N-1 get assists, last gets putout
      for (let i = 0; i < seq.length - 1; i++) {
        events.push(makeEvent(seq[i], 'assist', i));
      }
      events.push(makeEvent(seq[seq.length - 1], 'putout', seq.length - 1));
    }

    // Check for outfield assists (outfielder throws out a runner)
    // If first fielder is outfielder (7/8/9) and there are subsequent fielders
    if (seq.length >= 2 && seq[0] >= 7 && seq[0] <= 9) {
      // Upgrade the first event from 'assist' to 'outfield_assist'
      if (events.length > 0 && events[0].playType === 'assist') {
        events[0] = { ...events[0], playType: 'outfield_assist' };
      }
    }

    return events;
  }

  if (playData.type === 'hit') {
    // Hits: no fielding credit for the defense (they failed to get an out)
    // However, on hits where a runner is thrown out, the fielder credit
    // is handled by the fielder credit modal (handleFielderCreditConfirm)
    // which calls this function separately for the runner-out play.
    return events;
  }

  // Default: no events for unrecognized play types
  return events;
}
