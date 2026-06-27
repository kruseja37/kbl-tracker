import { describe, expect, test } from 'vitest';

import {
  CHEM_LEAN_CAP,
  FIELDING_BASELINE,
  FIELDING_CAP,
  computeTrueValue,
} from '../trueValue';
import type { RosterChemistryCounts } from '../derivedTraitPotency';

const L2_COUNTS: RosterChemistryCounts = {
  SPI: 3,
  DIS: 3,
  CMP: 3,
  SCH: 3,
  CRA: 3,
};

describe('trueValue TRUEVAL-2', () => {
  test('keeps a neutral L2 position-player baseline equal to frozen kblIV', () => {
    const kblIV = 150_000;
    const result = computeTrueValue(
      {
        kblIV,
        traits: ['Ace Exterminator', 'Bad Jumps', 'Base Rounder', 'Choker', 'Cannon Arm'],
        fielding: FIELDING_BASELINE,
        isPitcher: false,
      },
      L2_COUNTS,
    );

    expect(result.chemistryAdjustment).toBe(0);
    expect(result.fieldingAdjustment).toBe(0);
    expect(result.trueValue).toBe(kblIV);
  });

  test('boosts a known positive trait at L3 chemistry', () => {
    const result = computeTrueValue(
      { kblIV: 100_000, traits: ['Ace Exterminator'], fielding: FIELDING_BASELINE, isPitcher: false },
      { SCH: 7 },
    );

    expect(result.netSignedLean).toBeGreaterThan(0);
    expect(result.chemistryAdjustment).toBeGreaterThan(0);
  });

  test('drags unsupported positive traits and maxed flaws while crediting dampened flaws', () => {
    const unsupportedPositive = computeTrueValue(
      { kblIV: 100_000, traits: ['Ace Exterminator'], fielding: FIELDING_BASELINE, isPitcher: false },
      { SCH: 2 },
    );
    const maxedFlaw = computeTrueValue(
      { kblIV: 100_000, traits: ['Bad Jumps'], fielding: FIELDING_BASELINE, isPitcher: false },
      { CRA: 2 },
    );
    const dampenedFlaw = computeTrueValue(
      { kblIV: 100_000, traits: ['Bad Jumps'], fielding: FIELDING_BASELINE, isPitcher: false },
      { CRA: 7 },
    );

    expect(unsupportedPositive.chemistryAdjustment).toBeLessThan(0);
    expect(maxedFlaw.chemistryAdjustment).toBeLessThan(0);
    expect(dampenedFlaw.chemistryAdjustment).toBeGreaterThan(0);
  });

  test('credits and docks position-player fielding while leaving pitcher fielding at zero', () => {
    const goodGlove = computeTrueValue(
      { kblIV: 100_000, traits: [], fielding: 90, isPitcher: false },
      L2_COUNTS,
    );
    const badGlove = computeTrueValue(
      { kblIV: 100_000, traits: [], fielding: 20, isPitcher: false },
      L2_COUNTS,
    );
    const pitcher = computeTrueValue(
      { kblIV: 100_000, traits: [], fielding: 20, isPitcher: true },
      L2_COUNTS,
    );

    expect(goodGlove.fieldingAdjustment).toBeGreaterThan(0);
    expect(badGlove.fieldingAdjustment).toBeLessThan(0);
    expect(pitcher.fieldingAdjustment).toBe(0);
  });

  test('bounds extreme chemistry and fielding adjustments at the documented caps', () => {
    const kblIV = 100_000;
    const chemistryCapped = computeTrueValue(
      {
        kblIV,
        traits: Array.from({ length: 20 }, () => 'Ace Exterminator'),
        fielding: 99,
        isPitcher: false,
      },
      { SCH: 7 },
    );
    const fieldingLow = computeTrueValue(
      { kblIV, traits: [], fielding: 0, isPitcher: false },
      L2_COUNTS,
    );

    expect(Math.abs(chemistryCapped.chemistryAdjustment)).toBeLessThanOrEqual(kblIV * CHEM_LEAN_CAP);
    expect(Math.abs(chemistryCapped.fieldingAdjustment)).toBeLessThanOrEqual(kblIV * FIELDING_CAP);
    expect(Math.abs(fieldingLow.fieldingAdjustment)).toBeLessThanOrEqual(kblIV * FIELDING_CAP);
  });

  test('moves all-bat traps and glove-first bargains in the intended fielding direction', () => {
    const allBatNoGlove = computeTrueValue(
      { kblIV: 200_000, traits: [], fielding: 15, isPitcher: false },
      L2_COUNTS,
    );
    const gloveFirst = computeTrueValue(
      { kblIV: 140_000, traits: [], fielding: 92, isPitcher: false },
      L2_COUNTS,
    );

    expect(allBatNoGlove.fieldingAdjustment).toBeLessThan(0);
    expect(gloveFirst.fieldingAdjustment).toBeGreaterThan(0);
    expect(allBatNoGlove.trueValue).toBeLessThan(allBatNoGlove.kblIV);
    expect(gloveFirst.trueValue).toBeGreaterThan(gloveFirst.kblIV);
  });

  test('returns deterministic results for identical inputs', () => {
    const input = {
      kblIV: 123_456,
      traits: ['Clutch', 'Bad Jumps', 'Cannon Arm'],
      fielding: 87,
      isPitcher: false,
    };
    const counts: RosterChemistryCounts = { SPI: 7, CRA: 2, CMP: 7 };

    expect(JSON.stringify(computeTrueValue(input, counts))).toBe(
      JSON.stringify(computeTrueValue(input, counts)),
    );
  });
});
