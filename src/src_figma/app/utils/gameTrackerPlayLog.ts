import type { AtBatEvent, BetweenPlayEvent } from '../../../utils/eventLog';
import type { PlayLogEditorType, PlayLogEntry, PlayLogEventType, PlayLogResultCategory, RunnerSubEntry } from './playLogTypes';
import {
  getHeldByOfBaseSaved,
  getRunnerDisplayDestination,
  inferBatterSubEntryDestination,
} from './gameTrackerRunnerCorrection';

const WALK_RESULTS = new Set(['BB', 'IBB', 'HBP']);
const HIT_RESULTS = new Set(['1B', '2B', '3B', 'HR', 'ITPHR', 'GRD']);
const OUT_RESULTS = new Set(['K', 'Kc', 'GO', 'FO', 'FLO', 'LO', 'PO', 'DP', 'TP', 'FC', 'SF', 'SAC', 'SH', 'D3K', 'WP_K', 'PB_K']);

const toShortInningLabel = (halfInning: 'TOP' | 'BOTTOM', inning: number): string =>
  `${halfInning === 'TOP' ? 'T' : 'B'}${Math.max(1, inning)}`;

const toDisplayResult = (result: string): string => result === 'SH' ? 'SAC' : result;

const toDisplayedAtBatResult = (event: AtBatEvent): string => {
  const baseDisplayResult = toDisplayResult(event.result);
  if (
    event.result === 'E' &&
    typeof event.batterErrorChargedToPosition === 'number' &&
    event.batterErrorChargedToPosition >= 1 &&
    event.batterErrorChargedToPosition <= 9
  ) {
    return `E${event.batterErrorChargedToPosition}`;
  }
  return baseDisplayResult;
};

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

const buildPlayerStateDescription = (event: BetweenPlayEvent): string => {
  const change = event.playerStateChange;
  if (!change) return '';

  const transition = `${change.previousValue ?? '?'} -> ${change.newValue ?? '?'}`;
  const causedBy = change.causedByPlayerName ? ` by ${change.causedByPlayerName}` : '';

  if (change.sourceEventType === 'KILLED_PITCHER') {
    const stayedInText = typeof change.stayedIn === 'boolean'
      ? change.stayedIn ? ' (stayed in)' : ' (left game)'
      : '';
    if (event.type === 'injury') {
      return `KILLED PITCHER${causedBy}${stayedInText}`;
    }
    return `${transition} from KILLED PITCHER${causedBy}${stayedInText}`;
  }

  if (change.sourceEventType === 'NUT_SHOT') {
    return `${transition} from NUT SHOT${causedBy}`;
  }

  return transition;
};

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

type RunnerBaseKey = 'first' | 'second' | 'third';
const RUNNER_BASES: RunnerBaseKey[] = ['first', 'second', 'third'];
const HIT_RESULTS_WITH_OF_HOLD = new Set(['1B', '2B', '3B']);

const formatRunnerBaseLabel = (fromBase: RunnerSubEntry['fromBase']): string =>
  fromBase === 'batter'
    ? 'BAT'
    : fromBase === 'first'
      ? '1B'
      : fromBase === 'second'
        ? '2B'
        : '3B';

const formatRunnerTransitionLabel = (
  fromBase: RunnerSubEntry['fromBase'],
  toBase: RunnerSubEntry['toBase'],
  playMechanic?: string,
  fielderPosition?: RunnerSubEntry['fielderPosition'],
  heldByOf?: RunnerSubEntry['heldByOf'],
  holdingFielder?: RunnerSubEntry['holdingFielder'],
  errorType?: RunnerSubEntry['errorType'],
  errorChargedTo?: RunnerSubEntry['errorChargedTo'],
): string => {
  const baseTransition = `${formatRunnerBaseLabel(fromBase)}→${
    toBase === 'first'
      ? '1B'
      : toBase === 'second'
        ? '2B'
        : toBase === 'third'
          ? '3B'
          : toBase === 'home'
            ? 'HOME'
            : toBase === 'out'
              ? 'OUT'
              : 'END'
  }`;

  if (
    errorType &&
    typeof errorChargedTo === 'number' &&
    errorChargedTo >= 1 &&
    errorChargedTo <= 9
  ) {
    return `${baseTransition} (E${errorChargedTo})`;
  }

  const holdFielder = holdingFielder || fielderPosition;
  if ((heldByOf || playMechanic === 'hold') && holdFielder) {
    return `${baseTransition} (held by ${holdFielder})`;
  }

  return baseTransition;
};

const sameRunner = (
  before: { runnerId?: string; runnerName?: string } | null | undefined,
  after: { runnerId?: string; runnerName?: string } | null | undefined,
): boolean => {
  if (!before || !after) return false;
  if (before.runnerId && after.runnerId) {
    return before.runnerId === after.runnerId;
  }
  return !!before.runnerName && before.runnerName === after.runnerName;
};

function inferHeldRunnerSubEntries(
  event: AtBatEvent,
  existingKeys: Set<string>,
): RunnerSubEntry[] {
  if (!HIT_RESULTS_WITH_OF_HOLD.has(event.result)) {
    return [];
  }

  return RUNNER_BASES.flatMap((fromBase, idx) => {
    const runnerBefore = event.runners[fromBase];
    const runnerAfter = event.runnersAfter[fromBase];
    if (!sameRunner(runnerBefore, runnerAfter)) {
      return [];
    }

    const runnerId = runnerBefore?.runnerId || runnerAfter?.runnerId || '';
    const runnerName = runnerBefore?.runnerName || runnerAfter?.runnerName || 'Unknown';
    const runnerKey = `${runnerId}:${fromBase}:${runnerName}`;
    if (existingKeys.has(runnerKey)) {
      return [];
    }

    return [{
      id: `${event.eventId}-runner-held-${idx}`,
      parentEventId: event.eventId,
      runnerId,
      runnerName,
      fromBase,
      toBase: fromBase,
      parentResult: event.result,
      isEnrichable: true,
      transitionLabel: formatRunnerTransitionLabel(fromBase, fromBase),
    }];
  });
}

function getDefaultBatterDestination(event: AtBatEvent): RunnerSubEntry['toBase'] | null {
  return inferBatterSubEntryDestination(event);
}

function inferBatterRunnerSubEntry(
  event: AtBatEvent,
  existingKeys: Set<string>,
): RunnerSubEntry[] {
  const toBase = getDefaultBatterDestination(event);
  if (!toBase) {
    return [];
  }

  const batterKey = `${event.batterId}:batter:${event.batterName}`;
  if (existingKeys.has(batterKey)) {
    return [];
  }

  return [{
    id: `${event.eventId}-runner-batter`,
    parentEventId: event.eventId,
    runnerId: event.batterId,
    runnerName: event.batterName,
    fromBase: 'batter',
    toBase,
    parentResult: event.result,
    isEnrichable: true,
    errorType: event.batterErrorType,
    errorChargedTo: event.batterErrorChargedToPosition,
    baseSaved: getHeldByOfBaseSaved(toBase, event.result) ?? undefined,
    transitionLabel: formatRunnerTransitionLabel(
      'batter',
      toBase,
      undefined,
      undefined,
      undefined,
      undefined,
      event.batterErrorType,
      event.batterErrorChargedToPosition,
    ),
  }];
}

/**
 * Derive runner sub-entries from AtBatEvent data.
 * Prefers explicit runnerOutcomes[] when available.
 * Falls back to inferring from runners (before) vs runnersAfter (after).
 */
function buildRunnerSubEntries(event: AtBatEvent): RunnerSubEntry[] | undefined {
  // Path 1: Explicit runnerOutcomes[] exists
  if (event.runnerOutcomes?.length) {
    const persistedEntries = event.runnerOutcomes.map((ro, idx) => ({
      id: `${event.eventId}-runner-${idx}`,
      parentEventId: event.eventId,
      runnerId: ro.runnerId,
      runnerName: ro.runnerName,
      fromBase: ro.fromBase,
      toBase: getRunnerDisplayDestination(ro),
      parentResult: event.result,
      isEnrichable: true,
      fieldingSequence: ro.fieldingSequence,
      playMechanic: ro.playMechanic,
      fielderId: ro.fielderId,
      fielderPosition: ro.fielderPosition,
      heldByOf: ro.heldByOf,
      holdingFielder: ro.holdingFielder,
      baseSaved: ro.baseSaved,
      isTootblan: ro.isTootblan,
      isOutAdvancing: ro.isOutAdvancing,
      errorType: ro.errorType,
      errorChargedTo: ro.errorChargedTo,
      transitionLabel: formatRunnerTransitionLabel(
        ro.fromBase,
        getRunnerDisplayDestination(ro),
        ro.playMechanic,
        ro.fielderPosition,
        ro.heldByOf,
        ro.holdingFielder,
        ro.errorType,
        ro.errorChargedTo,
      ),
    }));

    const existingKeys = new Set(
      persistedEntries.map((entry) => `${entry.runnerId}:${entry.fromBase}:${entry.runnerName}`),
    );

    return [
      ...persistedEntries,
      ...inferHeldRunnerSubEntries(event, existingKeys),
      ...inferBatterRunnerSubEntry(event, existingKeys),
    ];
  }

  // Path 2: Infer from runners/runnersAfter
  if (!event.runners || !event.runnersAfter) return undefined;

  const subEntries: RunnerSubEntry[] = [];
  let idx = 0;

  // Build a map of runnersAfter for lookup
  const afterMap = new Map<string, RunnerBaseKey>();
  for (const base of RUNNER_BASES) {
    const r = event.runnersAfter[base];
    if (r?.runnerId) afterMap.set(r.runnerId, base);
  }

  // Collect scored runner IDs
  const scoredIds = new Set<string>();
  if (Array.isArray(event.runsScored)) {
    for (const r of event.runsScored) {
      const runner = r as { runnerId?: string };
      if (runner.runnerId) scoredIds.add(runner.runnerId);
    }
  }

  for (const fromBase of RUNNER_BASES) {
    const runnerBefore = event.runners[fromBase];
    if (!runnerBefore) continue;

    let runnerId = runnerBefore.runnerId;
    let runnerName = runnerBefore.runnerName;

    // If runner data is empty, try to identify from runnersAfter
    // Find a runner in runnersAfter who wasn't on that same base before (i.e., they advanced)
    if (!runnerId && !runnerName) {
      for (const afterBase of RUNNER_BASES) {
        if (afterBase === fromBase) continue; // Skip same base
        const afterRunner = event.runnersAfter[afterBase];
        if (!afterRunner?.runnerId) continue;
        // Skip the batter (they're new to the bases)
        if (afterRunner.runnerId === event.batterId) continue;
        // Check this runner wasn't already on a different occupied base before
        const wasOnAnotherBase = RUNNER_BASES.some(b => b !== fromBase && event.runners[b]?.runnerId === afterRunner.runnerId);
        if (wasOnAnotherBase) continue;
        // This runner must have come from fromBase
        runnerId = afterRunner.runnerId;
        runnerName = afterRunner.runnerName;
        break;
      }
      // Still empty? Try scored runners
      if (!runnerId && !runnerName && scoredIds.size > 0) {
        // If runs scored is numeric (not array), we can't identify the runner
        if (Array.isArray(event.runsScored)) {
          for (const r of event.runsScored) {
            const runner = r as { runnerId?: string; runnerName?: string };
            if (!runner.runnerId) continue;
            if (runner.runnerId === event.batterId) continue;
            runnerId = runner.runnerId;
            runnerName = runner.runnerName || '';
            break;
          }
        }
      }
      // If still can't identify, skip this entry
      if (!runnerId && !runnerName) continue;
    }

    // Determine destination
    let toBase: RunnerSubEntry['toBase'] | null = null;

    // Check runnersAfter for this runner
    const afterBase = runnerId ? afterMap.get(runnerId) : undefined;
    if (afterBase) {
      toBase = afterBase as RunnerBaseKey;
    }

    // Check if they scored
    if (!toBase && runnerId && scoredIds.has(runnerId)) {
      toBase = 'home';
    }

    // Check numeric runsScored as fallback for home
    if (!toBase && typeof event.runsScored === 'number' && event.runsScored > 0) {
      // Can't attribute specific runner, but if outs didn't increase and runner disappeared, they likely scored
      const inAfter = afterBase !== undefined;
      if (!inAfter) toBase = 'home';
    }

    // If not found anywhere, they were out
    if (!toBase) {
      toBase = event.outsAfter >= 3 ? 'end' : 'out';
    }

    if (toBase === fromBase && !HIT_RESULTS.has(event.result)) continue;

    subEntries.push({
      id: `${event.eventId}-runner-${idx}`,
      parentEventId: event.eventId,
      runnerId: runnerId || '',
      runnerName: runnerName || 'Unknown',
      fromBase,
      toBase,
      parentResult: event.result,
      isEnrichable: true,
      transitionLabel: formatRunnerTransitionLabel(fromBase, toBase),
    });
    idx++;
  }

  const existingKeys = new Set(
    subEntries.map((entry) => `${entry.runnerId}:${entry.fromBase}:${entry.runnerName}`),
  );
  subEntries.push(...inferBatterRunnerSubEntry(event, existingKeys));

  return subEntries.length > 0 ? subEntries : undefined;
}

export function mapAtBatEventToPlayLogEntry(event: AtBatEvent): PlayLogEntry {
  const baseDisplayResult = toDisplayResult(event.result);
  const detailedDisplayResult = toDisplayedAtBatResult(event);
  const displayResult = event.enrichment?.batterOutAdvancing
    ? `${detailedDisplayResult} OA`
    : detailedDisplayResult;
  const scoreDerivedRuns = event.halfInning === 'TOP'
    ? Math.max(0, event.awayScoreAfter - event.awayScore)
    : Math.max(0, event.homeScoreAfter - event.homeScore);
  const rawRunsScored = Array.isArray(event.runsScored) ? event.runsScored.length : event.runsScored;
  const runsScored = event.runnerOutcomes?.length ? scoreDerivedRuns : rawRunsScored;
  const fieldingSequence = event.enrichment?.fieldingSequence?.join('-');
  const enrichmentAny = event.enrichment as (NonNullable<AtBatEvent['enrichment']> & {
    fieldingDifficulty?: string;
    fieldingAttemptType?: string;
    fieldingAttemptOutcome?: string;
    playMechanic?: string;
    basesSaved?: 1 | 2;
  }) | undefined;
  const hasFieldingDefaults = !!(
    enrichmentAny?.fieldingDifficulty ||
    event.enrichment?.fieldingPlayType ||
    enrichmentAny?.fieldingAttemptType ||
    enrichmentAny?.fieldingAttemptOutcome ||
    enrichmentAny?.playMechanic ||
    enrichmentAny?.basesSaved
  );
  const basesSavedSuffix = enrichmentAny?.basesSaved
    ? ` (saved ${enrichmentAny.basesSaved}B)`
    : '';
  const fieldingDescription = `${fieldingSequence || ''}${basesSavedSuffix}`.trim() || undefined;
  const description = [fieldingDescription, event.enrichment?.chased ? 'chase' : undefined]
    .filter((value): value is string => !!value)
    .join(' ') || undefined;

  return createBaseEntry({
    id: event.eventId,
    eventId: event.eventId,
    eventType: 'at_bat',
    inningLabel: toShortInningLabel(event.halfInning, event.inning),
    batterName: event.batterName,
    result: displayResult,
    resultCategory: getResultCategory(baseDisplayResult),
    rbi: Math.max(0, event.rbiCount),
    runsScored,
    hasFieldingData: !!fieldingSequence || !!event.enrichment?.putouts?.length || !!event.enrichment?.assists?.length || !!event.enrichment?.errors?.length || hasFieldingDefaults,
    hasLocationData: !!event.enrichment?.fieldLocation,
    hasKType: displayResult === 'Kc',
    hasPitchCount: typeof event.enrichment?.pitchesInAtBat === 'number',
    hasPitchType: !!event.enrichment?.pitchType,
    isEnrichable: !WALK_RESULTS.has(displayResult),
    isQAB: !!event.isQualityAtBat,
    description,
    fieldingSequence,
    timestamp: event.timestamp,
    runnerSubEntries: buildRunnerSubEntries(event),
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
        description: buildPlayerStateDescription(event),
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
        description: buildPlayerStateDescription(event),
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
        description: buildPlayerStateDescription(event) || event.playerStateChange?.reason || 'Injury recorded',
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
