import { describe, expect, test } from 'vitest';

import {
  aggregatePoolStats,
  classifyStarterRole,
  isPeerPoolBelowFloor,
} from '../expectedStatsPoolAggregator';
import {
  expectedAndSignal,
  winsorizedStandardDeviation,
} from '../expectedStatsEngine';
import type { CategoryRateResult } from '../expectedStatsCategoryRates';

const categoryRate = (contactAvoidStrikeoutRate?: number): CategoryRateResult => ({
  actualByCat:
    typeof contactAvoidStrikeoutRate === 'number'
      ? { contactAvoidStrikeoutRate }
      : {},
  sampleSizeByCat: {},
});

describe('expectedStatsPoolAggregator RA-2b', () => {
  test('classifies sticky starter roles with promote, demote, dead-band, and NaN handling', () => {
    expect(classifyStarterRole(0.65)).toBe('starter');
    expect(classifyStarterRole(0.60)).toBe('starter');

    expect(classifyStarterRole(0.40)).toBe('bench');
    expect(classifyStarterRole(0.44)).toBe('bench');

    expect(classifyStarterRole(0.50, 'starter')).toBe('starter');
    expect(classifyStarterRole(0.50, 'bench')).toBe('bench');
    expect(classifyStarterRole(0.50)).toBe('bench');

    expect(classifyStarterRole(Number.NaN, 'starter')).toBe('starter');
  });

  test('aggregates position-pure member mean, count, sorted values, and winsorized SD', () => {
    const values = [0.250, 0.300, 0.275, 0.325];
    const result = aggregatePoolStats({
      members: [
        ...values.map((value) => categoryRate(value)),
        categoryRate(),
      ],
    });

    expect(result.poolMeanByCat.contactAvoidStrikeoutRate).toBeCloseTo(0.2875, 10);
    expect(result.peerPoolSize.contactAvoidStrikeoutRate).toBe(4);
    expect(result.peerValuesByCat.contactAvoidStrikeoutRate).toEqual([0.250, 0.275, 0.300, 0.325]);
    expect(result.poolSdByCat.contactAvoidStrikeoutRate).toBeCloseTo(
      winsorizedStandardDeviation([0.250, 0.275, 0.300, 0.325]) ?? -1,
      10,
    );
  });

  test('borrows spread from wider reference while keeping mean and count from members', () => {
    const memberValues = [0.260, 0.340];
    const spreadValues = [0.220, 0.250, 0.280, 0.310, 0.340, 0.370];
    const result = aggregatePoolStats({
      members: memberValues.map((value) => categoryRate(value)),
      spreadReference: spreadValues.map((value) => categoryRate(value)),
    });

    expect(result.poolMeanByCat.contactAvoidStrikeoutRate).toBeCloseTo(0.300, 10);
    expect(result.peerPoolSize.contactAvoidStrikeoutRate).toBe(2);
    expect(result.poolSdByCat.contactAvoidStrikeoutRate).toBeCloseTo(
      winsorizedStandardDeviation(spreadValues) ?? -1,
      10,
    );
  });

  test('checks the default thin-pool floor per category count', () => {
    expect(isPeerPoolBelowFloor(5)).toBe(true);
    expect(isPeerPoolBelowFloor(6)).toBe(false);
    expect(isPeerPoolBelowFloor(Number.NaN)).toBe(true);
  });

  test('preserves the expected-stats anchor identity at the pool-mean rating', () => {
    const pool = aggregatePoolStats({
      members: [0.250, 0.300, 0.275, 0.325, 0.290, 0.285].map((value) => categoryRate(value)),
    });
    const poolMean = pool.poolMeanByCat.contactAvoidStrikeoutRate;

    expect(poolMean).toBeDefined();
    const result = expectedAndSignal({
      playerRole: 'hitter',
      ageBand: '25-31',
      curveBlock: 'SS',
      ratings: { contact: 60 },
      actualByCat: { contactAvoidStrikeoutRate: poolMean },
      sampleSizeByCat: { contactAvoidStrikeoutRate: 100 },
      poolMeanByCat: pool.poolMeanByCat,
      poolSdByCat: pool.poolSdByCat,
      peerValuesByCat: pool.peerValuesByCat,
      poolMeanRating: 60,
      peerPoolSize: pool.peerPoolSize,
    });

    expect(result.expectedByCat.contactAvoidStrikeoutRate).toBeCloseTo(poolMean ?? 0, 10);
  });
});
