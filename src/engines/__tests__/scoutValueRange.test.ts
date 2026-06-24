import { describe, expect, test } from 'vitest';

import { perceivedValueRange } from '../scoutValueRange';

describe('perceivedValueRange AUC-5.1b', () => {
  test('shrinks the scout-obscured width as scout accuracy rises', () => {
    const highAccuracy = perceivedValueRange(100_000, 92, 'width-high');
    const lowAccuracy = perceivedValueRange(100_000, 45, 'width-low');

    expect(highAccuracy.w).toBeCloseTo(0.048, 12);
    expect(lowAccuracy.w).toBeCloseTo(0.33, 12);
    expect(highAccuracy.w).toBeLessThan(lowAccuracy.w);
    expect(highAccuracy.high - highAccuracy.low).toBeLessThan(lowAccuracy.high - lowAccuracy.low);
  });

  test('centers the low/high bracket symmetrically around true IV', () => {
    const trueIV = 125_000;
    const result = perceivedValueRange(trueIV, 70, 'symmetric-band');

    expect(result.low).toBeLessThan(trueIV);
    expect(result.high).toBeGreaterThan(trueIV);
    expect(trueIV - result.low).toBeCloseTo(result.high - trueIV, 10);
    expect((result.low + result.high) / 2).toBeCloseTo(trueIV, 10);
  });

  test('keeps the displayed estimate inside the open range and away from truth', () => {
    const trueIV = 90_000;
    const result = perceivedValueRange(trueIV, 68, 'displayed-estimate');

    expect(result.displayedEstimate).toBeGreaterThan(result.low);
    expect(result.displayedEstimate).toBeLessThan(result.high);
    expect(result.displayedEstimate).not.toBe(trueIV);
  });

  test('is deterministic for the same seed and varies the displayed estimate by seed', () => {
    const first = perceivedValueRange(110_000, 72, 'deterministic-seed');
    const second = perceivedValueRange(110_000, 72, 'deterministic-seed');
    const differentSeed = perceivedValueRange(110_000, 72, 'different-seed');

    expect(second).toEqual(first);
    expect(differentSeed.low).toBe(first.low);
    expect(differentSeed.high).toBe(first.high);
    expect(differentSeed.w).toBe(first.w);
    expect(differentSeed.displayedEstimate).not.toBe(first.displayedEstimate);
  });

  test('clamps scout accuracy outside the raw 0-100 scale', () => {
    const belowScale = perceivedValueRange(100_000, -25, 'clamp-low');
    const atZero = perceivedValueRange(100_000, 0, 'clamp-low');
    const aboveScale = perceivedValueRange(100_000, 150, 'clamp-high');
    const atHundred = perceivedValueRange(100_000, 100, 'clamp-high');

    expect(belowScale.w).toBe(atZero.w);
    expect(belowScale.low).toBe(atZero.low);
    expect(belowScale.high).toBe(atZero.high);
    expect(aboveScale.w).toBe(atHundred.w);
    expect(aboveScale.low).toBe(atHundred.low);
    expect(aboveScale.high).toBe(atHundred.high);
  });

  test('rejects non-positive or non-finite true IV', () => {
    expect(() => perceivedValueRange(0, 70, 'zero')).toThrow(/positive finite trueIV/);
    expect(() => perceivedValueRange(-1, 70, 'negative')).toThrow(/positive finite trueIV/);
    expect(() => perceivedValueRange(Number.POSITIVE_INFINITY, 70, 'infinite')).toThrow(/positive finite trueIV/);
  });
});
