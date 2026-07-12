/**
 * Pure GameTracker Fame capture helpers.
 *
 * The durable Fame ledger lives in useGameState. This module intentionally
 * owns no React state and no parallel game accumulator.
 */

import type { FameEventRecord } from '../../../utils/eventLog';
import {
  FAME_EVENT_LABELS,
  FAME_VALUES,
  type FameEventType,
  type HalfInning,
} from '../../../types/game';
import {
  calculateFame,
  resolveFamePlayoffContext,
  type FameGameMode,
  type FamePlayoffContext,
} from '../engines/fameIntegration';

export interface FameCaptureInput {
  eventType: FameEventType;
  playerId: string;
  playerName: string;
  inning: number;
  halfInning: HalfInning;
  leverageIndex?: number;
  gameMode?: FameGameMode;
  playoffContext?: FamePlayoffContext;
}

export interface DetectedFameCapture {
  detectionKey: string;
  eventType: FameEventType;
  playerId: string;
  playerName: string;
  inning: number;
  halfInning: HalfInning;
  leverageIndex: number;
}

export type AppendFameEvent = (
  event: FameEventRecord,
  sourceEventIds?: string[],
) => void;

/** Build the durable ledger record from the canonical FAME_VALUES calculation. */
export function buildFameEventRecord(input: FameCaptureInput): FameEventRecord {
  const result = calculateFame(
    input.eventType,
    input.leverageIndex ?? 1,
    resolveFamePlayoffContext(
      input.gameMode ?? 'exhibition',
      input.playoffContext,
    ),
  );

  return {
    eventType: input.eventType,
    fameType: result.finalFame >= 0 ? 'bonus' : 'boner',
    fameValue: result.finalFame,
    playerId: input.playerId,
    playerName: input.playerName,
    description: `${FAME_EVENT_LABELS[input.eventType]} — ${input.playerName}`,
  };
}

/**
 * Append newly detected events once while preserving the existing detection-key
 * semantics. sourceEventIds are supplied only by the caller that owns the
 * durable event-log identity; finalization awards deliberately omit them.
 */
export function appendDetectedFameEvents(input: {
  events: readonly DetectedFameCapture[];
  recordedDetectionKeys: Set<string>;
  appendFameEvent: AppendFameEvent;
  gameMode?: FameGameMode;
  playoffContext?: FamePlayoffContext;
  sourceEventIds?: readonly string[];
}): FameEventRecord[] {
  const appended: FameEventRecord[] = [];

  for (const event of input.events) {
    if (input.recordedDetectionKeys.has(event.detectionKey)) {
      continue;
    }

    input.recordedDetectionKeys.add(event.detectionKey);
    const record = buildFameEventRecord({
      ...event,
      gameMode: input.gameMode,
      playoffContext: input.playoffContext,
    });
    input.appendFameEvent(
      record,
      input.sourceEventIds?.length ? [...input.sourceEventIds] : undefined,
    );
    appended.push(record);
  }

  return appended;
}

/** Map tracker-native quick-button aliases to the canonical Fame catalog. */
export function toCatalogFameEventType(eventType: string): FameEventType | null {
  if (Object.prototype.hasOwnProperty.call(FAME_VALUES, eventType)) {
    return eventType as FameEventType;
  }

  if (eventType === 'KILLED') return 'KILLED_PITCHER';
  if (eventType === 'NUTSHOT' || eventType === 'NUT_SHOT') {
    return 'NUT_SHOT_DELIVERED';
  }

  return null;
}

/** Activity-log copy contains the event and player only — never Fame arithmetic. */
export function formatNeutralFameEventActivity(
  eventType: FameEventType,
  playerName: string,
): string {
  return `${FAME_EVENT_LABELS[eventType]} — ${playerName}`;
}
