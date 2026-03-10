import { describe, expect, test } from 'vitest';

import {
  applyRunnerDefaultsToNames,
  buildRunnerCorrectionForQuickBarOutcome,
  countRbiFromDefaults,
  getBatterDestinationOptions,
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
});
