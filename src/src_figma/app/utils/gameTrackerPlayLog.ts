import type { AtBatEvent, BetweenPlayEvent } from '../../../utils/eventLog';
import type { PlayLogEditorType, PlayLogEntry, PlayLogEventType, PlayLogResultCategory } from './playLogTypes';

const WALK_RESULTS = new Set(['BB', 'IBB', 'HBP']);
const HIT_RESULTS = new Set(['1B', '2B', '3B', 'HR', 'GRD']);
const OUT_RESULTS = new Set(['K', 'Kc', 'GO', 'FO', 'LO', 'PO', 'DP', 'TP', 'FC', 'SF', 'SAC', 'SH', 'D3K', 'WP_K', 'PB_K']);

const toShortInningLabel = (halfInning: 'TOP' | 'BOTTOM', inning: number): string =>
  `${halfInning === 'TOP' ? 'T' : 'B'}${Math.max(1, inning)}`;

const toDisplayResult = (result: string): string => result === 'SH' ? 'SAC' : result;

const getResultCategory = (result: string): PlayLogResultCategory => {
  if (HIT_RESULTS.has(result)) return 'hit';
  if (OUT_RESULTS.has(result)) return 'out';
  if (WALK_RESULTS.has(result)) return 'walk';
  if (result === 'E') return 'error';
  return 'special';
};

const baseLabel = (base: number): string => base === 4 ? 'HOME' : `${base}B`;

const getEditorType = (eventType: PlayLogEventType): PlayLogEditorType => {
  switch (eventType) {
    case 'at_bat':
      return 'batter_at_bat';
    case 'stolen_base':
    case 'caught_stealing':
    case 'pickoff':
    case 'wild_pitch':
    case 'passed_ball':
    case 'balk':
    case 'runner_advance':
      return 'runner';
    case 'substitution':
    case 'position_change':
    case 'pitcher_change':
      return 'lineup_pitching';
    case 'mojo_change':
    case 'fitness_change':
    case 'injury':
    case 'manager_moment':
    case 'pitch_count_update':
      return 'context_modifiers';
  }
};

const getVisibility = (eventType: PlayLogEventType): 'default' | 'system' =>
  eventType === 'manager_moment' || eventType === 'pitch_count_update' ? 'system' : 'default';

const createBaseEntry = (
  overrides: Partial<PlayLogEntry> & Pick<PlayLogEntry, 'id' | 'eventType' | 'inningLabel' | 'batterName' | 'result' | 'timestamp'>,
): PlayLogEntry => ({
  eventId: overrides.eventId,
  editorType: getEditorType(overrides.eventType),
  visibility: getVisibility(overrides.eventType),
  isSelectable: true,
  resultCategory: 'special',
  rbi: 0,
  runsScored: 0,
  hasFieldingData: false,
  hasLocationData: false,
  hasKType: false,
  hasPitchCount: false,
  hasPitchType: false,
  isEnrichable: false,
  isQAB: false,
  ...overrides,
});

export function mapAtBatEventToPlayLogEntry(event: AtBatEvent): PlayLogEntry {
  const displayResult = toDisplayResult(event.result);
  const runsScored = Array.isArray(event.runsScored) ? event.runsScored.length : event.runsScored;
  const fieldingSequence = event.enrichment?.fieldingSequence?.join('-');

  return createBaseEntry({
    id: event.eventId,
    eventId: event.eventId,
    eventType: 'at_bat',
    inningLabel: toShortInningLabel(event.halfInning, event.inning),
    batterName: event.batterName,
    result: displayResult,
    resultCategory: getResultCategory(displayResult),
    rbi: event.rbiCount,
    runsScored,
    hasFieldingData: !!fieldingSequence || !!event.enrichment?.putouts?.length || !!event.enrichment?.assists?.length || !!event.enrichment?.errors?.length,
    hasLocationData: !!event.enrichment?.fieldLocation,
    hasKType: displayResult === 'Kc',
    hasPitchCount: typeof event.enrichment?.pitchesInAtBat === 'number',
    hasPitchType: !!event.enrichment?.pitchType,
    isEnrichable: !WALK_RESULTS.has(displayResult),
    isQAB: !!event.isQualityAtBat,
    fieldingSequence,
    timestamp: event.timestamp,
  });
}

export function mapBetweenPlayEventToPlayLogEntry(
  event: BetweenPlayEvent,
  resolvePlayerNameById?: (playerId?: string) => string | undefined,
): PlayLogEntry | null {
  const inningLabel = toShortInningLabel(event.gameState?.halfInning || 'TOP', event.gameState?.inning || 1);
  const actorName = (playerId?: string, explicitName?: string) => explicitName || resolvePlayerNameById?.(playerId) || playerId || 'UNKNOWN';
  const runnerDescription = event.runnerAction
    ? `${baseLabel(event.runnerAction.fromBase)} -> ${event.runnerAction.outcome === 'out' ? 'OUT' : baseLabel(event.runnerAction.toBase)}`
    : undefined;

  switch (event.type) {
    case 'stolen_base':
      return createBaseEntry({
        id: event.eventId,
        eventId: event.eventId,
        eventType: 'stolen_base',
        inningLabel,
        batterName: actorName(event.runnerAction?.runnerId, event.runnerAction?.runnerName || event.stolenBase?.runnerName),
        result: 'SB',
        description: runnerDescription,
        timestamp: event.timestamp,
      });
    case 'caught_stealing':
      return createBaseEntry({
        id: event.eventId,
        eventId: event.eventId,
        eventType: 'caught_stealing',
        inningLabel,
        batterName: actorName(event.runnerAction?.runnerId, event.runnerAction?.runnerName || event.stolenBase?.runnerName),
        result: 'CS',
        description: runnerDescription,
        timestamp: event.timestamp,
      });
    case 'pickoff':
      return createBaseEntry({
        id: event.eventId,
        eventId: event.eventId,
        eventType: 'pickoff',
        inningLabel,
        batterName: actorName(event.runnerAction?.runnerId, event.runnerAction?.runnerName),
        result: 'PK',
        description: runnerDescription,
        timestamp: event.timestamp,
      });
    case 'wild_pitch':
      return createBaseEntry({
        id: event.eventId,
        eventId: event.eventId,
        eventType: 'wild_pitch',
        inningLabel,
        batterName: actorName(event.runnerAction?.runnerId, event.runnerAction?.runnerName),
        result: 'WP',
        description: runnerDescription,
        timestamp: event.timestamp,
      });
    case 'passed_ball':
      return createBaseEntry({
        id: event.eventId,
        eventId: event.eventId,
        eventType: 'passed_ball',
        inningLabel,
        batterName: actorName(event.runnerAction?.runnerId, event.runnerAction?.runnerName),
        result: 'PB',
        description: runnerDescription,
        timestamp: event.timestamp,
      });
    case 'balk':
      return createBaseEntry({
        id: event.eventId,
        eventId: event.eventId,
        eventType: 'balk',
        inningLabel,
        batterName: 'Balk',
        result: 'BLK',
        description: runnerDescription,
        timestamp: event.timestamp,
      });
    case 'runner_advance':
      return createBaseEntry({
        id: event.eventId,
        eventId: event.eventId,
        eventType: 'runner_advance',
        inningLabel,
        batterName: actorName(event.runnerAction?.runnerId, event.runnerAction?.runnerName),
        result: 'ADV',
        description: runnerDescription,
        timestamp: event.timestamp,
      });
    case 'substitution':
      return createBaseEntry({
        id: event.eventId,
        eventId: event.eventId,
        eventType: 'substitution',
        inningLabel,
        batterName: actorName(event.substitution?.inPlayerId, event.substitution?.inPlayerName),
        result: 'SUB',
        description: `${actorName(event.substitution?.inPlayerId, event.substitution?.inPlayerName)} for ${actorName(event.substitution?.outPlayerId, event.substitution?.outPlayerName)}`,
        timestamp: event.timestamp,
      });
    case 'position_change':
      return createBaseEntry({
        id: event.eventId,
        eventId: event.eventId,
        eventType: 'position_change',
        inningLabel,
        batterName: actorName(event.substitution?.inPlayerId, event.substitution?.inPlayerName),
        result: 'POS',
        description: `${event.substitution?.previousPosition || '?'} -> ${event.substitution?.inPosition || '?'}`,
        timestamp: event.timestamp,
      });
    case 'pitcher_change':
      return createBaseEntry({
        id: event.eventId,
        eventId: event.eventId,
        eventType: 'pitcher_change',
        inningLabel,
        batterName: actorName(event.pitcherChange?.incomingPitcherId, event.pitcherChange?.incomingPitcherName),
        result: 'PCHG',
        description: `${actorName(event.pitcherChange?.incomingPitcherId, event.pitcherChange?.incomingPitcherName)} for ${actorName(event.pitcherChange?.outgoingPitcherId, event.pitcherChange?.outgoingPitcherName)}`,
        timestamp: event.timestamp,
      });
    case 'mojo_change':
      return createBaseEntry({
        id: event.eventId,
        eventId: event.eventId,
        eventType: 'mojo_change',
        inningLabel,
        batterName: actorName(event.playerStateChange?.playerId, event.playerStateChange?.playerName),
        result: 'MOJO',
        description: `${event.playerStateChange?.previousValue ?? '?'} -> ${event.playerStateChange?.newValue ?? '?'}`,
        timestamp: event.timestamp,
      });
    case 'fitness_change':
      return createBaseEntry({
        id: event.eventId,
        eventId: event.eventId,
        eventType: 'fitness_change',
        inningLabel,
        batterName: actorName(event.playerStateChange?.playerId, event.playerStateChange?.playerName),
        result: 'FIT',
        description: `${event.playerStateChange?.previousValue ?? '?'} -> ${event.playerStateChange?.newValue ?? '?'}`,
        timestamp: event.timestamp,
      });
    case 'injury':
      return createBaseEntry({
        id: event.eventId,
        eventId: event.eventId,
        eventType: 'injury',
        inningLabel,
        batterName: actorName(event.playerStateChange?.playerId, event.playerStateChange?.playerName),
        result: 'INJ',
        description: event.playerStateChange?.reason || 'Injury recorded',
        timestamp: event.timestamp,
      });
    case 'manager_moment':
      return createBaseEntry({
        id: event.eventId,
        eventId: event.eventId,
        eventType: 'manager_moment',
        inningLabel,
        batterName: 'Manager Moment',
        result: 'MM',
        description: event.managerMoment?.decisionType || event.managerMoment?.context || 'Manager moment',
        timestamp: event.timestamp,
      });
    case 'pitch_count_update':
      return createBaseEntry({
        id: event.eventId,
        eventId: event.eventId,
        eventType: 'pitch_count_update',
        inningLabel,
        batterName: actorName(event.pitchCountUpdate?.pitcherId),
        result: 'PC',
        description: `${event.pitchCountUpdate?.pitchCount ?? '?'} pitches`,
        timestamp: event.timestamp,
      });
    default:
      return null;
  }
}

export function buildPlayLogEntries(
  atBatEvents: AtBatEvent[],
  betweenPlayEvents: BetweenPlayEvent[],
  resolvePlayerNameById?: (playerId?: string) => string | undefined,
): PlayLogEntry[] {
  const indexedOrder = new Map<string, number>();
  atBatEvents.forEach((event) => indexedOrder.set(event.eventId, event.eventIndex));
  betweenPlayEvents.forEach((event) => indexedOrder.set(event.eventId, event.eventIndex));

  return [
    ...atBatEvents.map(mapAtBatEventToPlayLogEntry),
    ...betweenPlayEvents
      .map((event) => mapBetweenPlayEventToPlayLogEntry(event, resolvePlayerNameById))
      .filter((entry): entry is PlayLogEntry => entry !== null),
  ].sort((a, b) => {
    const aIndex = indexedOrder.get(a.id) ?? Number.MAX_SAFE_INTEGER;
    const bIndex = indexedOrder.get(b.id) ?? Number.MAX_SAFE_INTEGER;
    if (aIndex === bIndex) return a.timestamp - b.timestamp;
    return aIndex - bIndex;
  });
}
