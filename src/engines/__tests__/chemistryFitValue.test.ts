import { describe, expect, test } from 'vitest';

import {
  CHEMISTRY_FIT_BUFFER_FRACTION,
  CHEMISTRY_FIT_BUMP_MAX,
  chemistryFitPriceMultiplier,
  chemistryFitTier,
  marginalChemistryValue,
} from '../chemistryFitValue';

describe('chemistryFitValue RB-1b-1', () => {
  test('maps chemistry count boundaries to potency tiers', () => {
    expect(chemistryFitTier(0)).toBe('L1');
    expect(chemistryFitTier(3)).toBe('L1');
    expect(chemistryFitTier(4)).toBe('L2');
    expect(chemistryFitTier(7)).toBe('L2');
    expect(chemistryFitTier(8)).toBe('L3');
    expect(chemistryFitTier(99)).toBe('L3');

    expect(chemistryFitTier(Number.NaN)).toBe('L1');
    expect(chemistryFitTier(Number.POSITIVE_INFINITY)).toBe('L1');
    expect(chemistryFitTier(-1)).toBe('L1');
  });

  test('add marginal value rewards level-ups and tier-floor buffer only', () => {
    expect(marginalChemistryValue(3, 'add')).toBe(1);
    expect(marginalChemistryValue(7, 'add')).toBe(1);
    expect(marginalChemistryValue(4, 'add')).toBe(CHEMISTRY_FIT_BUFFER_FRACTION);
    expect(marginalChemistryValue(8, 'add')).toBe(CHEMISTRY_FIT_BUFFER_FRACTION);

    for (const count of [0, 1, 2, 5, 6, 9, 10, 99]) {
      expect(marginalChemistryValue(count, 'add')).toBe(0);
    }
  });

  test('remove marginal value penalizes only demotion boundaries', () => {
    expect(marginalChemistryValue(4, 'remove')).toBe(-1);
    expect(marginalChemistryValue(8, 'remove')).toBe(-1);

    for (const count of [0, 3, 5, 9]) {
      expect(marginalChemistryValue(count, 'remove')).toBe(0);
    }
  });

  test('chemistry fit price multiplier is reward-only for draft adds', () => {
    expect(chemistryFitPriceMultiplier('SPI', { SPI: 7 })).toBe(1 + CHEMISTRY_FIT_BUMP_MAX);
    expect(chemistryFitPriceMultiplier('SPI', { SPI: 4 })).toBe(
      1 + CHEMISTRY_FIT_BUFFER_FRACTION * CHEMISTRY_FIT_BUMP_MAX,
    );
    expect(chemistryFitPriceMultiplier('SPI', { SPI: 5 })).toBe(1);
    expect(chemistryFitPriceMultiplier('SPI', {})).toBe(1);
    expect(chemistryFitPriceMultiplier('Unknown', {})).toBe(1);
    expect(chemistryFitPriceMultiplier('SPI', { DIS: 7 })).toBe(1);
  });

  test('uses the canonical chemistry-normalization bridge for prospect title words', () => {
    expect(chemistryFitPriceMultiplier('Spirited', { SPI: 7 })).toBe(1.08);
  });
});
