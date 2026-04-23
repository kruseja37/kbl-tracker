import { describe, expect, test } from 'vitest';

import { calculateRunnerDefaults } from '../../app/components/runnerDefaults';
import type { PlayData } from '../../app/utils/gameTrackerFieldTypes';
import { buildLiveBasesFromRunnerOutcomes } from '../../app/utils/liveBaseCorrection';
import {
  applyRunnerDefaultsToNames,
  buildRunnerCorrectionForQuickBarOutcome,
  countRbiFromDefaults,
  getBatterDestinationOptions,
  inferBatterSubEntryDestination,
  resolveBatterOutcomeResult,
  runnerOutcomeCountsAsOut,
  runnerDefaultsToAdvancement,
} from '../../app/utils/gameTrackerRunnerCorrection';

describe('gameTrackerRunnerCorrection', () => {
  test('builds walk corrections with forced-advance defaults', () => {
    const correction = buildRunnerCorrectionForQuickBarOutcome('BB', {
      first: true,
      second: true,
      third: true,
    }, 1);

    expect(correction?.action).toEqual({ type: 'walk', walkType: 'BB' });
    expect(correction?.defaults.batter.to).toBe('first');
    expect(correction?.defaults.first?.to).toBe('second');
    expect(correction?.defaults.second?.to).toBe('third');
    expect(correction?.defaults.third?.to).toBe('home');
  });

  test('converts corrected defaults into runner advancement and next base names', () => {
    const correction = buildRunnerCorrectionForQuickBarOutcome('1B', {
      first: true,
      second: true,
      third: false,
    }, 1);
    if (!correction) throw new Error('Expected correction');

    correction.defaults.first = { ...correction.defaults.first!, to: 'third', isDefault: false };
    correction.defaults.second = { ...correction.defaults.second!, to: 'home', isDefault: false };

    expect(runnerDefaultsToAdvancement(correction.defaults)).toEqual({
      fromFirst: 'third',
      fromSecond: 'home',
    });

    expect(applyRunnerDefaultsToNames(
      correction.defaults,
      { first: 'Garcia', second: 'Miller' },
      'Johnson',
    )).toEqual({
      first: 'Johnson',
      third: 'Garcia',
    });
  });

  test('counts RBI and locks batter destinations by committed outcome', () => {
    const hitCorrection = buildRunnerCorrectionForQuickBarOutcome('GRD', {
      first: false,
      second: true,
      third: true,
    }, 1);
    if (!hitCorrection) throw new Error('Expected hit correction');

    expect(countRbiFromDefaults(hitCorrection.defaults, hitCorrection.action)).toBe(2);
    expect(getBatterDestinationOptions(hitCorrection.action)).toEqual(['second']);

    const d3kCorrection = buildRunnerCorrectionForQuickBarOutcome('D3K', {
      first: false,
      second: false,
      third: false,
    }, 2);
    if (!d3kCorrection) throw new Error('Expected D3K correction');

    expect(getBatterDestinationOptions(d3kCorrection.action)).toEqual(['first', 'out']);
  });

  test('does not build an FC correction with empty bases', () => {
    expect(buildRunnerCorrectionForQuickBarOutcome('FC', {
      first: false,
      second: false,
      third: false,
    }, 0)).toBeNull();
  });

  test('builds an FC correction when a runner is on base', () => {
    const correction = buildRunnerCorrectionForQuickBarOutcome('FC', {
      first: true,
      second: false,
      third: false,
    }, 0);

    expect(correction?.action).toEqual({ type: 'out', outType: 'FC' });
    expect(correction?.defaults.batter.to).toBe('first');
    expect(correction?.defaults.first?.to).toBe('out');
  });

  test('converts bases-loaded home run defaults into all-runners-home advancement and 4 RBI', () => {
    const defaults = calculateRunnerDefaults(
      { type: 'hr', hitType: 'HR', fieldingSequence: [] } as PlayData,
      { first: true, second: true, third: true },
      1,
    );

    expect(runnerDefaultsToAdvancement(defaults)).toEqual({
      fromFirst: 'home',
      fromSecond: 'home',
      fromThird: 'home',
    });
    expect(countRbiFromDefaults(defaults, { type: 'hit', hitType: 'HR' })).toBe(4);
  });

  test('[M3-3-v2] infers batter correction destinations for out plays and corrected safe results', () => {
    expect(inferBatterSubEntryDestination({ result: 'GO', enrichment: {} })).toBe('out');
    expect(inferBatterSubEntryDestination({ result: 'FC', enrichment: {} })).toBe('first');

    expect(resolveBatterOutcomeResult({
      currentResult: 'GO',
      nextOutcome: { toBase: 'first' },
      nextOutsRecorded: 1,
    })).toBe('FC');

    expect(resolveBatterOutcomeResult({
      currentResult: 'GO',
      nextOutcome: { toBase: 'first', errorType: 'fielding' },
      nextOutsRecorded: 0,
    })).toBe('E');
  });

  test('[M3-3-v2] correcting the batter to safe at first removes an out and puts the batter on first', () => {
    const previousOutcome = {
      runnerId: 'batter-1',
      runnerName: 'Johnson',
      fromBase: 'batter' as const,
      toBase: 'out' as const,
    };
    const correctedOutcome = {
      ...previousOutcome,
      toBase: 'first' as const,
    };

    const outDelta =
      Number(runnerOutcomeCountsAsOut(correctedOutcome)) -
      Number(runnerOutcomeCountsAsOut(previousOutcome));

    expect(outDelta).toBe(-1);
    expect(buildLiveBasesFromRunnerOutcomes([correctedOutcome], {
      result: 'FC',
      enrichment: {},
    })).toEqual({
      first: true,
      second: false,
      third: false,
    });
  });
});
