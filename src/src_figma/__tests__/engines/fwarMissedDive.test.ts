/**
 * Missed Dive Zero-Penalty Tests
 * Phase B - Tier 1.3 (GAP-B1-005)
 *
 * Tests that missed dives get zero penalty in FWAR.
 */

import { describe, test, expect } from 'vitest';
import { calculateErrorValue } from '../../../engines/fwarCalculator';

describe('calculateErrorValue — missedDive (GAP-B1-005)', () => {
  test('missedDive=true returns 0 penalty (zero-penalty handler)', () => {
    const result = calculateErrorValue('throwing', 'SS', { missedDive: true });
    expect(result).toBe(0);
  });

  test('missedDive=true overrides all other context flags', () => {
    const result = calculateErrorValue('fielding', '3B', {
      missedDive: true,
      allowedRun: true,
      isClutch: true,
      wasRoutine: true,
    });
    expect(result).toBe(0);
  });

  test('missedDive=false still applies normal penalty', () => {
    const result = calculateErrorValue('throwing', 'SS', { missedDive: false });
    expect(result).toBeLessThan(0); // Should be negative penalty
  });

  test('no missedDive flag applies normal penalty', () => {
    const result = calculateErrorValue('throwing', 'SS');
    expect(result).toBeLessThan(0);
  });

  test('wasDifficult still applies 0.7x when missedDive is not set', () => {
    const normal = calculateErrorValue('fielding', 'SS');
    const difficult = calculateErrorValue('fielding', 'SS', { wasDifficult: true });
    // difficult should be less negative (closer to 0) due to 0.7x modifier
    expect(Math.abs(difficult)).toBeLessThan(Math.abs(normal));
  });

  test('missedDive returns exactly 0 for all error types', () => {
    const errorTypes = ['throwing', 'fielding', 'dropped', 'mental'] as const;
    for (const errorType of errorTypes) {
      expect(calculateErrorValue(errorType, 'SS', { missedDive: true })).toBe(0);
    }
  });
});
