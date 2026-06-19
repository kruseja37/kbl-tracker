import { describe, expect, test } from 'vitest';

import {
  ALL_STAR_LOCK_FRACTION,
  isAtOrPastAllStarLockFraction,
} from '../franchiseAllStarLock';

describe('isAtOrPastAllStarLockFraction', () => {
  test('returns true at the default 60% anchor and false before it', () => {
    expect(isAtOrPastAllStarLockFraction(60, 100)).toBe(true);
    expect(isAtOrPastAllStarLockFraction(59, 100)).toBe(false);
  });

  test('uses Math.round for the scheduled-game anchor', () => {
    expect(isAtOrPastAllStarLockFraction(19, 32)).toBe(true);
    expect(isAtOrPastAllStarLockFraction(18, 32)).toBe(false);
  });

  test('stays skip-safe after the anchor game was never processed', () => {
    expect(isAtOrPastAllStarLockFraction(20, 32)).toBe(true);
    expect(isAtOrPastAllStarLockFraction(25, 32)).toBe(true);
  });

  test('guards non-positive and non-finite game counts', () => {
    expect(isAtOrPastAllStarLockFraction(1, 0)).toBe(false);
    expect(isAtOrPastAllStarLockFraction(1, -1)).toBe(false);
    expect(isAtOrPastAllStarLockFraction(Number.NaN, 100)).toBe(false);
    expect(isAtOrPastAllStarLockFraction(Number.POSITIVE_INFINITY, 100)).toBe(false);
    expect(isAtOrPastAllStarLockFraction(60, Number.NaN)).toBe(false);
    expect(isAtOrPastAllStarLockFraction(60, Number.POSITIVE_INFINITY)).toBe(false);
  });

  test('supports a custom lock fraction', () => {
    expect(isAtOrPastAllStarLockFraction(50, 100, 0.5)).toBe(true);
    expect(isAtOrPastAllStarLockFraction(49, 100, 0.5)).toBe(false);
  });

  test('defaults to the 60% All-Star lock fraction', () => {
    expect(ALL_STAR_LOCK_FRACTION).toBe(0.6);
    expect(isAtOrPastAllStarLockFraction(59, 100)).toBe(false);
    expect(isAtOrPastAllStarLockFraction(60, 100)).toBe(true);
  });
});
