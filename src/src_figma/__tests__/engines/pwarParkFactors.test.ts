/**
 * Pitcher Park Factor Tests
 * Phase B - Tier 1.3 (GAP-B1-004)
 *
 * Tests park factor adjustment functions in pwarCalculator.
 */

import { describe, test, expect } from 'vitest';
import {
  applyPitcherParkFactor,
  getParkAdjustedERA,
  calculateERAPlus,
  getParkFactor,
  DEFAULT_PARK_FACTOR,
  SMB4_PARK_FACTORS,
} from '../../../engines/pwarCalculator';

describe('Park Factor Constants (GAP-B1-004)', () => {
  test('DEFAULT_PARK_FACTOR is neutral (1.00)', () => {
    expect(DEFAULT_PARK_FACTOR).toBe(1.00);
  });

  test('SMB4_PARK_FACTORS has neutral park', () => {
    expect(SMB4_PARK_FACTORS['neutral']).toBe(1.00);
  });
});

describe('applyPitcherParkFactor', () => {
  test('neutral park returns FIP unchanged', () => {
    expect(applyPitcherParkFactor(3.50, 1.00)).toBe(3.50);
  });

  test('hitter-friendly park (PF > 1) decreases adjusted FIP', () => {
    const adjusted = applyPitcherParkFactor(4.00, 1.10);
    expect(adjusted).toBeLessThan(4.00);
    expect(adjusted).toBeCloseTo(3.636, 2);
  });

  test('pitcher-friendly park (PF < 1) increases adjusted FIP', () => {
    const adjusted = applyPitcherParkFactor(3.50, 0.90);
    expect(adjusted).toBeGreaterThan(3.50);
    expect(adjusted).toBeCloseTo(3.889, 2);
  });

  test('guards against zero/negative park factor', () => {
    expect(applyPitcherParkFactor(3.50, 0)).toBe(3.50);
    expect(applyPitcherParkFactor(3.50, -1)).toBe(3.50);
  });

  test('defaults to neutral when no park factor provided', () => {
    expect(applyPitcherParkFactor(4.00)).toBe(4.00);
  });
});

describe('getParkAdjustedERA', () => {
  test('neutral park returns ERA unchanged', () => {
    expect(getParkAdjustedERA(4.00, 1.00)).toBe(4.00);
  });

  test('hitter park deflates ERA', () => {
    expect(getParkAdjustedERA(4.40, 1.10)).toBeCloseTo(4.00, 1);
  });

  test('pitcher park inflates ERA', () => {
    expect(getParkAdjustedERA(3.60, 0.90)).toBeCloseTo(4.00, 1);
  });
});

describe('calculateERAPlus', () => {
  test('league-average ERA at neutral park = 100', () => {
    expect(calculateERAPlus(4.04, 4.04, 1.00)).toBe(100);
  });

  test('ERA of 0.00 returns 999 (cap)', () => {
    expect(calculateERAPlus(0, 4.04, 1.00)).toBe(999);
  });

  test('better ERA produces ERA+ > 100', () => {
    const eraPlus = calculateERAPlus(3.00, 4.04, 1.00);
    expect(eraPlus).toBeGreaterThan(100);
  });

  test('worse ERA produces ERA+ < 100', () => {
    const eraPlus = calculateERAPlus(5.50, 4.04, 1.00);
    expect(eraPlus).toBeLessThan(100);
  });

  test('hitter park boosts ERA+ for same raw ERA', () => {
    const neutral = calculateERAPlus(4.04, 4.04, 1.00);
    const hitterPark = calculateERAPlus(4.04, 4.04, 1.10);
    expect(hitterPark).toBeLessThan(neutral); // Park makes ERA look worse
  });
});

describe('getParkFactor', () => {
  test('returns stored factor for known park', () => {
    expect(getParkFactor('neutral')).toBe(1.00);
  });

  test('returns DEFAULT_PARK_FACTOR for unknown park', () => {
    expect(getParkFactor('unknown-stadium')).toBe(DEFAULT_PARK_FACTOR);
  });
});
