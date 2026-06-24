import { describe, expect, test } from 'vitest';

import { catcherCaughtStealingRate } from '../catcherCaughtStealingAggregator';

describe('catcherCaughtStealingRate A1.5c-4', () => {
  test('returns null for zero denominator', () => {
    expect(catcherCaughtStealingRate({
      caughtStealingAgainst: 0,
      stolenBasesAllowed: 0,
    })).toBeNull();
  });

  test('computes the §9 discounted catcher arm rate', () => {
    expect(catcherCaughtStealingRate({
      caughtStealingAgainst: 3,
      stolenBasesAllowed: 7,
    })).toBeCloseTo(0.475, 12);
  });

  test('treats null, undefined, and NaN inputs as zero', () => {
    expect(catcherCaughtStealingRate({
      caughtStealingAgainst: null,
      stolenBasesAllowed: undefined,
    })).toBeNull();

    expect(catcherCaughtStealingRate({
      caughtStealingAgainst: Number.NaN,
      stolenBasesAllowed: 2,
    })).toBe(0);
  });

  test('returns zero when catcher has steals allowed but no caught stealings', () => {
    expect(catcherCaughtStealingRate({
      caughtStealingAgainst: 0,
      stolenBasesAllowed: 4,
    })).toBe(0);
  });
});
