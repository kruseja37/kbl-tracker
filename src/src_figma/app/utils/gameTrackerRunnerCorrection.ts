import {
  calculateD3KDefaults,
  calculateRunnerDefaults,
  calculateWalkDefaults,
  type BaseId,
  type GameBases,
  type RunnerDefaults,
} from '../components/runnerDefaults';
import type { PlayData } from './gameTrackerFieldTypes';
import type { HitType, OutType, RunnerAdvancement, WalkType } from '../../hooks/useGameState';

export interface PendingRunnerCorrectionAction {
  outcomeLabel: string;
  resultCategory: 'hit' | 'out' | 'walk' | 'error' | 'special';
  action:
    | { type: 'hit'; hitType: HitType }
    | { type: 'walk'; walkType: WalkType }
    | { type: 'out'; outType: OutType; batterReached?: boolean; isDroppedThirdStrike?: boolean; forceNoRuns?: boolean };
  defaults: RunnerDefaults;
}

export function buildRunnerCorrectionForQuickBarOutcome(
  outcome: string,
  bases: GameBases,
  outs: number,
): PendingRunnerCorrectionAction | null {
  if (['BB', 'HBP', 'IBB'].includes(outcome)) {
    return {
      outcomeLabel: outcome,
      resultCategory: 'walk',
      action: { type: 'walk', walkType: outcome as WalkType },
      defaults: calculateWalkDefaults(bases),
    };
  }

  if (outcome === 'D3K' || outcome === 'WP_K' || outcome === 'PB_K') {
    return {
      outcomeLabel: outcome,
      resultCategory: 'special',
      action: { type: 'out', outType: 'K', batterReached: true, isDroppedThirdStrike: true },
      defaults: calculateD3KDefaults(bases, outs),
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

  if (['K', 'GO', 'FO', 'LO', 'PO', 'FC', 'SAC', 'SF', 'DP', 'TP'].includes(outcome)) {
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
