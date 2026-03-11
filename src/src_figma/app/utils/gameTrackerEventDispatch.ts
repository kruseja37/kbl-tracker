import type { BetweenPlayEventDetails, EventType } from '@/hooks/useGameState';
import type { RunnerMoveData } from '@/app/components/RunnerDragDrop';
import type { SpecialEventData } from '@/app/utils/gameTrackerFieldTypes';

export function normalizeSpecialEventType(eventType: SpecialEventData['eventType']): EventType | null {
  switch (eventType) {
    case 'KILLED_PITCHER':
      return 'KILLED';
    case 'NUT_SHOT':
      return 'NUTSHOT';
    case 'WEB_GEM':
    case 'ROBBERY':
    case 'TOOTBLAN':
    case 'BEAT_THROW':
    case 'BUNT':
    case 'STRIKEOUT':
    case 'STRIKEOUT_LOOKING':
    case 'DROPPED_3RD_STRIKE':
    case 'SEVEN_PLUS_PITCH_AB':
      return eventType;
    default:
      return null;
  }
}

export function deriveRunnerEventType(move: RunnerMoveData): EventType {
  switch (move.playType) {
    case 'SB':
      return 'SB';
    case 'CS':
      return 'CS';
    case 'WP':
      return 'WP';
    case 'PB':
      return 'PB';
    case 'PICK':
      if (move.outcome === 'out') return 'PICK';
      return move.to === move.from ? 'PICK_SAFE' : 'PICK_E';
    case 'ADV':
    case 'DI':
    case 'ERROR':
      return 'ADVANCE';
  }
}

export function buildRunnerEventDetails(
  move: RunnerMoveData,
  runnerId?: string,
  runnerName?: string,
): BetweenPlayEventDetails {
  const toBase =
    move.outcome === 'out'
      ? 'out'
      : move.to;

  return {
    runnerId,
    runnerName,
    fromBase: move.from,
    toBase,
    outcome: move.outcome,
    fielderPosition: move.fielderPosition,
    fielderName: move.fielderName,
  };
}
