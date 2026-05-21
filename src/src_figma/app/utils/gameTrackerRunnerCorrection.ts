import {
  calculateD3KDefaults,
  calculateDroppedThirdStrikeAdvanceDefaults,
  calculateRunnerDefaults,
  calculateWalkDefaults,
  type BaseId,
  type GameBases,
  type RunnerDefaults,
} from '../components/runnerDefaults';
import type { PlayData } from './gameTrackerFieldTypes';
import type { HitType, OutType, RunnerAdvancement, WalkType } from '../../hooks/useGameState';
import type { AtBatEvent } from '../../../utils/eventLog';
import type { RunnerBase, RunnerDestination, RunnerHoldBaseSaved } from './playLogTypes';

export interface PendingRunnerCorrectionAction {
  outcomeLabel: string;
  resultCategory: 'hit' | 'out' | 'walk' | 'error' | 'special';
  action:
    | { type: 'hit'; hitType: HitType }
    | { type: 'walk'; walkType: WalkType }
    | {
        type: 'out';
        outType: OutType;
        batterReached?: boolean;
        isDroppedThirdStrike?: boolean;
        forceNoRuns?: boolean;
        dropReason?: 'wild_pitch' | 'passed_ball';
      };
  defaults: RunnerDefaults;
}

export function buildRunnerCorrectionForQuickBarOutcome(
  outcome: string,
  bases: GameBases,
  outs: number,
): PendingRunnerCorrectionAction | null {
  const hasRunners = Boolean(bases.first || bases.second || bases.third);

  if (['BB', 'HBP', 'IBB'].includes(outcome)) {
    return {
      outcomeLabel: outcome,
      resultCategory: 'walk',
      action: { type: 'walk', walkType: outcome as WalkType },
      defaults: calculateWalkDefaults(bases),
    };
  }

  if (outcome === 'D3K') {
    return {
      outcomeLabel: outcome,
      resultCategory: 'special',
      action: { type: 'out', outType: 'K', batterReached: true, isDroppedThirdStrike: true },
      defaults: calculateD3KDefaults(bases, outs),
    };
  }

  if (outcome === 'WP_K' || outcome === 'PB_K') {
    const batterReached = !bases.first || outs >= 2;
    return {
      outcomeLabel: outcome,
      resultCategory: 'special',
      action: {
        type: 'out',
        outType: 'K',
        batterReached,
        isDroppedThirdStrike: true,
        dropReason: outcome === 'WP_K' ? 'wild_pitch' : 'passed_ball',
      },
      defaults: calculateDroppedThirdStrikeAdvanceDefaults(bases, outs),
    };
  }

  if (['1B', '2B', '3B', 'GRD'].includes(outcome)) {
    const playData: PlayData = {
      type: 'hit',
      hitType: outcome === 'GRD' ? '2B' : outcome as '1B' | '2B' | '3B',
      fieldingSequence: [],
    };
    return {
      outcomeLabel: outcome,
      resultCategory: 'hit',
      action: { type: 'hit', hitType: outcome as HitType },
      defaults: calculateRunnerDefaults(playData, bases, outs),
    };
  }

  if (outcome === 'FC' && !hasRunners) {
    return null;
  }

  if (['K', 'Kc', 'GO', 'FO', 'FLO', 'LO', 'PO', 'FC', 'SAC', 'SF', 'DP', 'TP'].includes(outcome)) {
    const playData: PlayData = {
      type: 'out',
      outType: outcome === 'SAC' ? 'SAC' : outcome as PlayData['outType'],
      fieldingSequence: [],
    };
    return {
      outcomeLabel: outcome,
      resultCategory: 'out',
      action: { type: 'out', outType: outcome as OutType },
      defaults: calculateRunnerDefaults(playData, bases, outs),
    };
  }

  return null;
}

export function runnerDefaultsToAdvancement(defaults: RunnerDefaults): RunnerAdvancement | undefined {
  const advancement: RunnerAdvancement = {};

  if (defaults.first && defaults.first.to !== 'first') {
    advancement.fromFirst = defaults.first.to === 'out' ? 'out' : defaults.first.to as 'second' | 'third' | 'home';
  }
  if (defaults.second && defaults.second.to !== 'second') {
    advancement.fromSecond = defaults.second.to === 'out' ? 'out' : defaults.second.to as 'third' | 'home';
  }
  if (defaults.third && defaults.third.to !== 'third') {
    advancement.fromThird = defaults.third.to === 'out' ? 'out' : 'home';
  }

  return Object.keys(advancement).length > 0 ? advancement : undefined;
}

export function countRunsScoredFromDefaults(defaults: RunnerDefaults): number {
  return [
    defaults.batter?.to === 'home' ? 1 : 0,
    defaults.first?.to === 'home' ? 1 : 0,
    defaults.second?.to === 'home' ? 1 : 0,
    defaults.third?.to === 'home' ? 1 : 0,
  ].reduce((total, value) => total + value, 0);
}

export function countRbiFromDefaults(
  defaults: RunnerDefaults,
  action: PendingRunnerCorrectionAction['action'],
): number {
  if (action.type === 'walk') {
    return defaults.third?.to === 'home' ? 1 : 0;
  }
  if (action.type === 'out') {
    if (action.outType === 'DP' || action.outType === 'TP') return 0;
    return [defaults.first, defaults.second, defaults.third]
      .filter((runner) => runner?.to === 'home')
      .length;
  }
  return countRunsScoredFromDefaults(defaults);
}

export function applyRunnerDefaultsToNames(
  defaults: RunnerDefaults,
  currentRunnerNames: Partial<Record<'first' | 'second' | 'third', string>>,
  batterName: string,
): Partial<Record<'first' | 'second' | 'third', string>> {
  const nextNames: Partial<Record<'first' | 'second' | 'third', string>> = {};

  if (defaults.third?.to === 'third' && currentRunnerNames.third) nextNames.third = currentRunnerNames.third;
  if (defaults.second?.to === 'second' && currentRunnerNames.second) nextNames.second = currentRunnerNames.second;
  if (defaults.second?.to === 'third' && currentRunnerNames.second) nextNames.third = currentRunnerNames.second;
  if (defaults.first?.to === 'first' && currentRunnerNames.first) nextNames.first = currentRunnerNames.first;
  if (defaults.first?.to === 'second' && currentRunnerNames.first) nextNames.second = currentRunnerNames.first;
  if (defaults.first?.to === 'third' && currentRunnerNames.first) nextNames.third = currentRunnerNames.first;

  if (defaults.batter.to === 'first') nextNames.first = batterName;
  if (defaults.batter.to === 'second') nextNames.second = batterName;
  if (defaults.batter.to === 'third') nextNames.third = batterName;

  return nextNames;
}

export function getBatterDestinationOptions(
  action: PendingRunnerCorrectionAction['action'],
): BaseId[] {
  if (action.type === 'walk') return ['first'];
  if (action.type === 'hit') {
    if (action.hitType === '1B') return ['first'];
    if (action.hitType === '2B' || action.hitType === 'GRD') return ['second'];
    if (action.hitType === '3B') return ['third'];
    if (action.hitType === 'HR') return ['home'];
  }
  if (action.type === 'out') {
    if (action.isDroppedThirdStrike && action.batterReached) return ['first', 'out'];
    if (action.outType === 'FC') return ['first'];
    return ['out'];
  }
  return ['out'];
}

export type PersistedRunnerOutcome = NonNullable<AtBatEvent['runnerOutcomes']>[number];

const BATTER_SAFE_AT_FIRST_RESULTS = new Set<AtBatEvent['result']>([
  'FC',
  'E',
  'D3K',
  'WP_K',
  'PB_K',
]);

const CORRECTABLE_BATTER_OUT_RESULTS = new Set<AtBatEvent['result']>([
  'GO',
  'FO',
  'FLO',
  'LO',
  'PO',
  'FC',
  'DP',
  'TP',
  'K',
  'Kc',
  'Ꝁ',
  'D3K',
  'WP_K',
  'PB_K',
  'SF',
  'SAC',
]);

const STRIKEOUT_RESULTS = new Set<AtBatEvent['result']>([
  'K',
  'Kc',
  'Ꝁ',
  'D3K',
  'WP_K',
  'PB_K',
]);

export function isCorrectableBatterResult(
  result?: AtBatEvent['result'] | null,
): result is AtBatEvent['result'] {
  return !!result && CORRECTABLE_BATTER_OUT_RESULTS.has(result);
}

export function inferBatterSubEntryDestination(
  event: Pick<
    AtBatEvent,
    'result' | 'enrichment' | 'batterReachedOnError'
  >,
): RunnerDestination | null {
  if (event.enrichment?.batterOutAdvancing) {
    return 'out';
  }

  if (
    event.result === '1B' ||
    event.result === 'E' ||
    event.batterReachedOnError ||
    BATTER_SAFE_AT_FIRST_RESULTS.has(event.result)
  ) {
    return 'first';
  }

  if (event.result === '2B' || event.result === 'GRD') {
    return 'second';
  }

  if (event.result === '3B') {
    return 'third';
  }

  if (isCorrectableBatterResult(event.result)) {
    return 'out';
  }

  return null;
}

export function runnerOutcomeCountsAsRun(outcome: Pick<PersistedRunnerOutcome, 'toBase' | 'isTootblan' | 'isOutAdvancing'>): boolean {
  return Boolean(outcome.toBase === 'home' && !outcome.isTootblan && !outcome.isOutAdvancing);
}

export function runnerOutcomeCountsAsOut(outcome: Pick<PersistedRunnerOutcome, 'toBase' | 'isTootblan' | 'isOutAdvancing'>): boolean {
  if (outcome.toBase === 'end') {
    return false;
  }

  return Boolean(outcome.toBase === 'out' || (outcome.toBase === 'home' && (outcome.isTootblan || outcome.isOutAdvancing)));
}

export function getRunnerDisplayDestination(
  outcome: Pick<PersistedRunnerOutcome, 'toBase' | 'isTootblan' | 'isOutAdvancing'>,
): RunnerDestination {
  return runnerOutcomeCountsAsOut(outcome) ? 'out' : (outcome.toBase as RunnerDestination);
}

function fallbackBatterOutResult(
  baseResult: AtBatEvent['result'],
  nextOutsRecorded: number,
): AtBatEvent['result'] {
  if (
    CORRECTABLE_BATTER_OUT_RESULTS.has(baseResult) &&
    baseResult !== 'FC' &&
    baseResult !== 'D3K' &&
    baseResult !== 'WP_K' &&
    baseResult !== 'PB_K'
  ) {
    return baseResult;
  }

  if (STRIKEOUT_RESULTS.has(baseResult)) {
    return 'K';
  }

  if (nextOutsRecorded >= 3) {
    return 'TP';
  }

  if (nextOutsRecorded >= 2) {
    return 'DP';
  }

  return 'GO';
}

export function resolveBatterOutcomeResult(args: {
  currentResult: AtBatEvent['result'];
  originalResult?: AtBatEvent['result'];
  nextOutcome: Pick<PersistedRunnerOutcome, 'toBase' | 'isTootblan' | 'isOutAdvancing' | 'errorType'>;
  nextOutsRecorded: number;
}): AtBatEvent['result'] {
  const baseResult = args.originalResult ?? args.currentResult;

  if (runnerOutcomeCountsAsOut(args.nextOutcome)) {
    return fallbackBatterOutResult(baseResult, args.nextOutsRecorded);
  }

  if (args.nextOutcome.toBase !== 'first') {
    return args.currentResult;
  }

  if (args.nextOutcome.errorType) {
    return 'E';
  }

  if (STRIKEOUT_RESULTS.has(baseResult)) {
    return 'D3K';
  }

  if (baseResult === 'FC' || args.currentResult === 'FC') {
    return 'FC';
  }

  if (args.nextOutsRecorded >= 2) {
    return 'DP';
  }

  if (args.nextOutsRecorded >= 1) {
    return 'FC';
  }

  return 'E';
}

export const OF_HOLD_ELIGIBLE_RESULTS = new Set(['1B', '2B', '3B']);

export function getHeldByOfBaseSaved(
  toBase: RunnerDestination,
  parentResult?: string,
): RunnerHoldBaseSaved | null {
  if (!parentResult || !OF_HOLD_ELIGIBLE_RESULTS.has(parentResult)) {
    return null;
  }

  switch (toBase) {
    case 'first':
      return '2B';
    case 'second':
      return '3B';
    case 'third':
      return 'HOME';
    default:
      return null;
  }
}

export function getRunnerDestinationOptions(fromBase: RunnerBase): RunnerDestination[] {
  switch (fromBase) {
    case 'batter':
      return ['first', 'second', 'third', 'home', 'out'];
    case 'first':
      return ['first', 'second', 'third', 'home', 'out', 'end'];
    case 'second':
      return ['second', 'third', 'home', 'out', 'end'];
    case 'third':
      return ['third', 'home', 'out', 'end'];
    default:
      return ['out'];
  }
}

export interface RunnerScoreCorrectionPrompt {
  inning: number;
  halfInning: 'TOP' | 'BOTTOM';
  current: { away: number; home: number };
  reconciled: { away: number; home: number };
  awayDelta: number;
  homeDelta: number;
}

export function buildRunnerScoreCorrectionPrompt(args: {
  inning: number;
  halfInning: 'TOP' | 'BOTTOM';
  current: { away: number; home: number };
  scoreDelta: number;
}): RunnerScoreCorrectionPrompt | null {
  if (!args.scoreDelta) {
    return null;
  }

  const rawAwayDelta = args.halfInning === 'TOP' ? args.scoreDelta : 0;
  const rawHomeDelta = args.halfInning === 'BOTTOM' ? args.scoreDelta : 0;
  const reconciled = {
    away: Math.max(0, args.current.away + rawAwayDelta),
    home: Math.max(0, args.current.home + rawHomeDelta),
  };
  const awayDelta = reconciled.away - args.current.away;
  const homeDelta = reconciled.home - args.current.home;

  if (awayDelta === 0 && homeDelta === 0) {
    return null;
  }

  return {
    inning: args.inning,
    halfInning: args.halfInning,
    current: args.current,
    reconciled,
    awayDelta,
    homeDelta,
  };
}
