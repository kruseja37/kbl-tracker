/**
 * Fielding Event Extractor
 *
 * Maps canonical GameTracker PlayData to
 * FieldingEvent[] (for eventLog.ts / IndexedDB persistence).
 *
 * This bridges the gap between the UI capture layer and the storage layer,
 * enabling fWAR calculation and season fielding stat aggregation.
 *
 * Called from GameTracker.tsx after each
 * ball-in-play at-bat is recorded or edited.
 */

import type { FieldingEvent, BallInPlayData } from '../../../utils/eventLog';
import type { Position } from '../../../types/game';
import type { PlayData } from './gameTrackerFieldTypes';
import { POSITION_MAP } from './positionConstants';
import {
  mapFieldingPlayTypeToPersistedDifficulty,
  mapFieldingPlayTypeToSpecialPlayType,
} from './fieldingPlayType';

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
    'Foul-Left': 1,
    'Foul-Right': 5,
    'Behind-Plate': 6,
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

function applySavedRunCredit(events: FieldingEvent[], savedRun?: boolean): FieldingEvent[] {
  if (!savedRun || events.length === 0) {
    return events;
  }

  const creditIndex = events.findIndex((event) => event.playType === 'putout');
  const targetIndex = creditIndex >= 0 ? creditIndex : 0;

  return events.map((event, index) =>
    index === targetIndex
      ? { ...event, runsPreventedOrAllowed: 1 }
      : event
  );
}

function normalizeSavedBasesSpecialPlayType(
  specialPlayType: FieldingEvent['specialPlayType'] | null | undefined,
): FieldingEvent['specialPlayType'] | null | undefined {
  switch (specialPlayType) {
    case 'Missed Dive':
      return 'Diving';
    case 'Missed Leap':
      return 'Leaping';
    default:
      return specialPlayType;
  }
}

function appendRunnerOutcomeErrors(
  events: FieldingEvent[],
  playData: PlayData,
  context: FieldingExtractionContext,
  shared: Pick<FieldingEvent, 'difficulty' | 'specialPlayType'> & Pick<BallInPlayData, 'trajectory' | 'zone'>,
): FieldingEvent[] {
  const runnerErrors = (playData.persistedRunnerOutcomes || []).filter(
    (outcome) =>
      !!outcome.errorType &&
      typeof outcome.errorChargedTo === 'number' &&
      outcome.errorChargedTo >= 1 &&
      outcome.errorChargedTo <= 9,
  );

  if (runnerErrors.length === 0) {
    return events;
  }

  const sequenceDefenderIds = playData.fieldingSequence
    .map((positionNum) => resolveDefenderIdentity(positionFromNumber(positionNum), context.defendersByPosition).playerId);
  const runnerErrorEvents = runnerErrors.map((runnerError, index) => {
    const sequence = events.length + index;
    const chargedFielder = resolveDefenderIdentity(
      positionFromNumber(runnerError.errorChargedTo as number),
      context.defendersByPosition,
    );
    const fielderIds = sequenceDefenderIds.includes(chargedFielder.playerId)
      ? sequenceDefenderIds
      : [...sequenceDefenderIds, chargedFielder.playerId];

    return {
      fieldingEventId: `${context.gameId}_${context.atBatEventIndex}_fe_${sequence}`,
      gameId: context.gameId,
      atBatEventId: context.atBatEventId,
      sequence,
      playerId: chargedFielder.playerId,
      playerName: chargedFielder.playerName,
      position: chargedFielder.position,
      teamId: context.defensiveTeamId,
      playType: 'error' as const,
      difficulty: shared.difficulty,
      specialPlayType: shared.specialPlayType,
      ballInPlay: {
        trajectory: shared.trajectory,
        zone: shared.zone,
        velocity: 'medium' as const,
        fielderIds: fielderIds.length > 0 ? fielderIds : [chargedFielder.playerId],
        primaryFielderId: chargedFielder.playerId,
      },
      success: false,
      runsPreventedOrAllowed: 0,
    };
  });

  return [...events, ...runnerErrorEvents];
}

/**
 * Infer trajectory from out type when exitType not available
 */
function inferTrajectoryFromOutType(outType?: string): BallInPlayData['trajectory'] {
  if (!outType) return 'ground';
  const mapping: Record<string, BallInPlayData['trajectory']> = {
    'GO': 'ground',
    'FO': 'fly',
    'FLO': 'fly',
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
  atBatEventId: string;
  atBatEventIndex: number;
  defendersByPosition?: Partial<Record<Position, { playerId: string; playerName: string }>>;
}

export interface SupplementalAdvanceErrorInput {
  errorFielder: Position;
  errorType?: 'FIELDING' | 'THROWING' | 'MENTAL' | string;
  sequence: number;
}

export interface SupplementalRunnerOutCreditInput {
  putoutBy: Position;
  assistBy: Position[];
}

function resolveDefenderIdentity(
  position: Position,
  defendersByPosition?: Partial<Record<Position, { playerId: string; playerName: string }>>,
) {
  const defender = defendersByPosition?.[position];
  return {
    position,
    playerId: defender?.playerId || position,
    playerName: defender?.playerName || position,
  };
}

/**
 * Extract fielding events from a completed play.
 *
 * @param playData - Canonical GameTracker play data
 * @param context - Game context (gameId, defensive team, canonical at-bat id/index, optional defender identity map)
 * @returns Array of FieldingEvent objects to be persisted via logFieldingEvent()
 */
export function extractFieldingEvents(
  playData: PlayData,
  context: FieldingExtractionContext,
): FieldingEvent[] {
  const resolveDefender = (positionNum: number) => {
    const position = positionFromNumber(positionNum);
    return resolveDefenderIdentity(position, context.defendersByPosition);
  };

  // No fielding events for non-ball-in-play outcomes
  if (playData.type === 'walk' || playData.type === 'foul_ball') {
    return [];
  }

  // Plain home runs do not credit the defense, but robbery enrichments do.
  if (
    playData.type === 'hr' &&
    (!playData.fieldingPlayType || playData.fieldingSequence.length === 0)
  ) {
    return [];
  }

  // Determine trajectory
  const trajectory = playData.exitType
    ? mapExitTypeToTrajectory(playData.exitType)
    : inferTrajectoryFromOutType(playData.outType);

  const difficulty = playData.fieldingPlayType
    ? mapFieldingPlayTypeToPersistedDifficulty(playData.fieldingPlayType)
    : mapPlayDifficulty(playData.playDifficulty);
  const specialPlayType = playData.fieldingPlayType
    ? mapFieldingPlayTypeToSpecialPlayType(playData.fieldingPlayType)
    : null;
  const zone = mapSpraySectorToZone(playData.spraySector);
  const finalizeEvents = (events: FieldingEvent[]) =>
    appendRunnerOutcomeErrors(events, playData, context, {
      difficulty,
      specialPlayType,
      trajectory,
      zone,
    });

  // Build the ball-in-play data shared across all events on this play
  const ballInPlay: BallInPlayData = {
    trajectory,
    zone,
    velocity: 'medium', // SMB4 doesn't expose exit velocity
    fielderIds: playData.fieldingSequence.map((n) => resolveDefender(n).playerId),
    primaryFielderId: playData.fieldingSequence.length > 0
      ? resolveDefender(playData.fieldingSequence[0]).playerId
      : '',
  };

  // Helper to create a fielding event
  const makeEvent = (
    positionNum: number,
    playType: FieldingEvent['playType'],
    sequenceIdx: number,
    overrideDifficulty?: FieldingEvent['difficulty'],
    overrideSpecialPlayType?: FieldingEvent['specialPlayType'] | null,
  ): FieldingEvent => {
    const defender = resolveDefender(positionNum);
    return {
      fieldingEventId: `${context.gameId}_${context.atBatEventIndex}_fe_${sequenceIdx}`,
      gameId: context.gameId,
      atBatEventId: context.atBatEventId,
      sequence: sequenceIdx,
      playerId: defender.playerId,
      playerName: defender.playerName,
      position: defender.position,
      teamId: context.defensiveTeamId,
      playType,
      difficulty: overrideDifficulty || difficulty,
      specialPlayType: overrideSpecialPlayType ?? specialPlayType,
      ballInPlay,
      success: playType !== 'error',
      runsPreventedOrAllowed: 0, // Would need LI integration for real values
    };
  };

  // ============================================
  // ROUTE BY PLAY TYPE
  // ============================================

  if (playData.type === 'error') {
    const events: FieldingEvent[] = [];
    // Error play: errorFielder gets an error event
    if (playData.errorFielder) {
      events.push(makeEvent(playData.errorFielder, 'error', 0));
    }
    return finalizeEvents(events);
  }

  if (playData.type === 'foul_out') {
    const events: FieldingEvent[] = [];
    // Foul out: first fielder in sequence gets a putout
    if (playData.fieldingSequence.length > 0) {
      events.push(makeEvent(playData.fieldingSequence[0], 'putout', 0));
    }
    return finalizeEvents(applySavedRunCredit(events, playData.savedRun));
  }

  if (playData.type === 'hr') {
    const events: FieldingEvent[] = [];
    const seq = playData.fieldingSequence;

    if (
      seq.length > 0 &&
      (playData.fieldingPlayType === 'robbed_hr' || playData.fieldingPlayType === 'wall')
    ) {
      events.push(makeEvent(seq[seq.length - 1], 'putout', 0));
    }

    return finalizeEvents(applySavedRunCredit(events, playData.savedRun));
  }

  if (playData.type === 'out') {
    const events: FieldingEvent[] = [];
    const outType = playData.outType || 'GO';
    const seq = playData.fieldingSequence;

    // Strikeouts: no fielding event (not a ball in play)
    // Exception: D3K with catcher involved (seq includes position 2)
    if (outType === 'K' || outType === 'Kc') {
      // D3K: catcher (2) throwing to first baseman (3)
      if (seq.length >= 2 && seq[0] === 2) {
        events.push(makeEvent(2, 'assist', 0)); // Catcher assist
        events.push(makeEvent(seq[seq.length - 1], 'putout', 1)); // 1B putout
      }
      return finalizeEvents(applySavedRunCredit(events, playData.savedRun));
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
      return finalizeEvents(applySavedRunCredit(events, playData.savedRun));
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
      return finalizeEvents(applySavedRunCredit(events, playData.savedRun));
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
      return finalizeEvents(applySavedRunCredit(events, playData.savedRun));
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
      return finalizeEvents(applySavedRunCredit(events, playData.savedRun));
    }

    // Standard outs (GO, FO, FLO, LO, PO, SAC)
    if (seq.length === 0) {
      // No fielding sequence — can't attribute
      return finalizeEvents(events);
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

    return finalizeEvents(applySavedRunCredit(events, playData.savedRun));
  }

  if (playData.type === 'hit') {
    const events: FieldingEvent[] = [];

    if (playData.savedRun && playData.fieldingSequence.length > 0) {
      events.push(
        makeEvent(
          playData.fieldingSequence[0],
          'base_save',
          0,
          difficulty,
          normalizeSavedBasesSpecialPlayType(specialPlayType),
        ),
      );
    }

    // Plain hits otherwise do not credit the defense. Runner-thrown-out cases
    // are handled through the supplemental runner-out credit helper below so
    // they can share the same at-bat id.
    return finalizeEvents(applySavedRunCredit(events, playData.savedRun));
  }

  // Default: no events for unrecognized play types
  return finalizeEvents([]);
}

export function extractSupplementalAdvanceErrorEvents(
  playData: PlayData,
  errors: SupplementalAdvanceErrorInput[],
  context: FieldingExtractionContext,
): FieldingEvent[] {
  if (errors.length === 0) {
    return [];
  }

  const trajectory = playData.exitType
    ? mapExitTypeToTrajectory(playData.exitType)
    : inferTrajectoryFromOutType(playData.outType);
  const difficulty = playData.fieldingPlayType
    ? mapFieldingPlayTypeToPersistedDifficulty(playData.fieldingPlayType)
    : mapPlayDifficulty(playData.playDifficulty);
  const specialPlayType = playData.fieldingPlayType
    ? mapFieldingPlayTypeToSpecialPlayType(playData.fieldingPlayType)
    : null;
  const zone = mapSpraySectorToZone(playData.spraySector);
  const sequenceDefenderIds = playData.fieldingSequence
    .map((positionNum) => resolveDefenderIdentity(positionFromNumber(positionNum), context.defendersByPosition).playerId);

  return errors.map(({ errorFielder, errorType, sequence }) => {
    const defender = resolveDefenderIdentity(errorFielder, context.defendersByPosition);

    return {
      fieldingEventId: `${context.gameId}_${context.atBatEventIndex}_fe_${sequence}`,
      gameId: context.gameId,
      atBatEventId: context.atBatEventId,
      sequence,
      playerId: defender.playerId,
      playerName: defender.playerName,
      position: defender.position,
      teamId: context.defensiveTeamId,
      playType: 'error',
      difficulty,
      ballInPlay: {
        trajectory,
        zone,
        velocity: 'medium',
        fielderIds: sequenceDefenderIds.length > 0 ? sequenceDefenderIds : [defender.playerId],
        primaryFielderId: defender.playerId,
      },
      success: false,
      specialPlayType,
      runsPreventedOrAllowed: 0,
    };
  });
}

export function extractSupplementalRunnerOutFieldingEvents(
  playData: PlayData,
  credits: SupplementalRunnerOutCreditInput[],
  context: FieldingExtractionContext,
  startingSequence: number = 0,
): FieldingEvent[] {
  if (credits.length === 0) {
    return [];
  }

  const trajectory = playData.exitType
    ? mapExitTypeToTrajectory(playData.exitType)
    : inferTrajectoryFromOutType(playData.outType);
  const difficulty = playData.fieldingPlayType
    ? mapFieldingPlayTypeToPersistedDifficulty(playData.fieldingPlayType)
    : mapPlayDifficulty(playData.playDifficulty);
  const specialPlayType = playData.fieldingPlayType
    ? mapFieldingPlayTypeToSpecialPlayType(playData.fieldingPlayType)
    : null;
  const zone = mapSpraySectorToZone(playData.spraySector);
  const events: FieldingEvent[] = [];
  let sequence = startingSequence;

  for (const credit of credits) {
    const assistPositions = credit.assistBy.filter(Boolean);
    const assistIds = assistPositions.map((position) =>
      resolveDefenderIdentity(position, context.defendersByPosition).playerId,
    );
    const putoutDefender = resolveDefenderIdentity(credit.putoutBy, context.defendersByPosition);
    const chainIds = assistIds.length > 0 ? [...assistIds, putoutDefender.playerId] : [putoutDefender.playerId];
    const baseBallInPlay: BallInPlayData = {
      trajectory,
      zone,
      velocity: 'medium',
      fielderIds: chainIds,
      primaryFielderId: chainIds[0],
    };

    assistPositions.forEach((position, assistIndex) => {
      const defender = resolveDefenderIdentity(position, context.defendersByPosition);
      const isOutfieldAssist = assistIndex === 0 && ['LF', 'CF', 'RF'].includes(position);
      events.push({
        fieldingEventId: `${context.gameId}_${context.atBatEventIndex}_fe_${sequence}`,
        gameId: context.gameId,
        atBatEventId: context.atBatEventId,
        sequence,
        playerId: defender.playerId,
        playerName: defender.playerName,
        position: defender.position,
        teamId: context.defensiveTeamId,
        playType: isOutfieldAssist ? 'outfield_assist' : 'assist',
        difficulty,
        ballInPlay: {
          ...baseBallInPlay,
          primaryFielderId: defender.playerId,
        },
        success: true,
        specialPlayType,
        runsPreventedOrAllowed: 0,
      });
      sequence += 1;
    });

    events.push({
      fieldingEventId: `${context.gameId}_${context.atBatEventIndex}_fe_${sequence}`,
      gameId: context.gameId,
      atBatEventId: context.atBatEventId,
      sequence,
      playerId: putoutDefender.playerId,
      playerName: putoutDefender.playerName,
      position: putoutDefender.position,
      teamId: context.defensiveTeamId,
      playType: 'putout',
      difficulty,
      ballInPlay: {
        ...baseBallInPlay,
        primaryFielderId: putoutDefender.playerId,
      },
      success: true,
      specialPlayType,
      runsPreventedOrAllowed: 0,
    });
    sequence += 1;
  }

  return events;
}
