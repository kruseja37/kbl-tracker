import { describe, expect, test } from 'vitest';

import { gradeBandToPriceRange, gradeMidpointSalary } from '../gradeBandPrice';

describe('gradeBandPrice S7a', () => {
  test('calculates grade midpoint from canonical salary bounds', () => {
    expect(gradeMidpointSalary('A')).toBeCloseTo((33329.72 + 116654.02) / 2, 2);
    expect(gradeMidpointSalary('A')).toBeCloseTo(74991.87, 2);
  });

  test('keeps stronger grade bands above weaker grade bands', () => {
    const aBand = gradeBandToPriceRange({ best: 'A', worst: 'A-' });
    const dBand = gradeBandToPriceRange({ best: 'D+', worst: 'D' });

    expect(aBand.high).toBeGreaterThan(dBand.high);
  });

  test('returns low less than or equal to high', () => {
    const range = gradeBandToPriceRange({ best: 'B+', worst: 'C' });

    expect(range.low).toBeLessThanOrEqual(range.high);
  });

  test('collapses single-grade bands to one midpoint', () => {
    const range = gradeBandToPriceRange({ best: 'B', worst: 'B' });

    expect(range.low).toBe(gradeMidpointSalary('B'));
    expect(range.high).toBe(gradeMidpointSalary('B'));
    expect(range.low).toBe(range.high);
  });

  test('preserves intentional T5 bridge midpoint overlap for C and C-', () => {
    expect(gradeMidpointSalary('C')).toBe(gradeMidpointSalary('C-'));
  });

  test('normalizes swapped best and worst grades', () => {
    const range = gradeBandToPriceRange({ best: 'D', worst: 'A' });

    expect(range.low).toBeLessThanOrEqual(range.high);
    expect(range.low).toBe(gradeMidpointSalary('D'));
    expect(range.high).toBe(gradeMidpointSalary('A'));
  });
});
