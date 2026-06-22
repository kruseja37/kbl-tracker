import { describe, expect, test } from 'vitest';

import { gradeToTwentyEighty, scoutPriceOpinion } from '../scoutPriceOpinion';
import type { Grade } from '../gradeEngine';

const GRADES: readonly Grade[] = ['S', 'A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D'];

describe('scoutPriceOpinion RB-1a', () => {
  test('is deterministic for the same scout, candidate, seed, and accuracy', () => {
    const input = {
      trueIV: 125_000,
      scoutAccuracy: 72,
      scoutId: 'scout-a',
      candidateId: 'candidate-a',
      seed: 'deterministic',
    };

    expect(scoutPriceOpinion(input)).toBe(scoutPriceOpinion(input));
  });

  test('never returns the exact true IV because the bias floor holds near zero signed seeds', () => {
    const trueIV = 100_000;
    const opinion = scoutPriceOpinion({
      trueIV,
      scoutAccuracy: 45,
      scoutId: 'floor-scout',
      candidateId: 'floor-candidate',
      seed: 'rb1a-floor-231859',
    });

    expect(opinion).not.toBe(trueIV);
    expect(Math.abs(opinion / trueIV - 1)).toBeCloseTo(0.01, 12);
  });

  test('lower scout accuracy yields a strictly wider bias than higher scout accuracy', () => {
    const trueIV = 100_000;
    const shared = {
      trueIV,
      scoutId: 'scout',
      candidateId: 'candidate',
      seed: 'auction',
    };
    const lowAccuracyOpinion = scoutPriceOpinion({ ...shared, scoutAccuracy: 45 });
    const highAccuracyOpinion = scoutPriceOpinion({ ...shared, scoutAccuracy: 92 });

    expect(Math.abs(lowAccuracyOpinion / trueIV - 1)).toBeGreaterThan(
      Math.abs(highAccuracyOpinion / trueIV - 1),
    );
  });

  test('maps the letter ladder to integer 20-80 grades monotonically', () => {
    const mapped = GRADES.map((grade) => gradeToTwentyEighty(grade));

    expect(gradeToTwentyEighty('S')).toBe(80);
    expect(gradeToTwentyEighty('D')).toBe(20);
    expect(gradeToTwentyEighty('unknown' as Grade)).toBe(50);

    for (const value of mapped) {
      expect(Number.isInteger(value)).toBe(true);
      expect(value).toBeGreaterThanOrEqual(20);
      expect(value).toBeLessThanOrEqual(80);
    }

    for (let index = 1; index < mapped.length; index += 1) {
      expect(mapped[index]).toBeLessThanOrEqual(mapped[index - 1]);
    }
  });

  test('returns non-positive and non-finite true IV unchanged', () => {
    expect(scoutPriceOpinion({
      trueIV: 0,
      scoutAccuracy: 45,
      candidateId: 'zero',
      seed: 'invalid',
    })).toBe(0);
    expect(scoutPriceOpinion({
      trueIV: -1_000,
      scoutAccuracy: 45,
      candidateId: 'negative',
      seed: 'invalid',
    })).toBe(-1_000);
    expect(scoutPriceOpinion({
      trueIV: Number.POSITIVE_INFINITY,
      scoutAccuracy: 45,
      candidateId: 'infinite',
      seed: 'invalid',
    })).toBe(Number.POSITIVE_INFINITY);
  });
});
