import { describe, expect, test } from 'vitest';

import {
  CHECKPOINT_POOL_LADDER,
  classifyRatingsPoolKey,
  computeCheckpointRatingSignals,
  resolvePoolMeanMembers,
  type CheckpointSignalMember,
} from '../checkpointRatingSignal';
import type { RatingsPoolKey } from '../../engines/expectedStatsPoolAggregator';
import type {
  ExpectedStatsCategory,
  ExpectedStatsRatingKey,
} from '../../engines/expectedStatsEngine';

const categoryRate = (contactAvoidStrikeoutRate?: number, sampleSize = 100) => ({
  actualByCat:
    typeof contactAvoidStrikeoutRate === 'number'
      ? { contactAvoidStrikeoutRate }
      : {},
  sampleSizeByCat: { contactAvoidStrikeoutRate: sampleSize },
});

const member = (
  playerId: string,
  poolKey: RatingsPoolKey,
  contactAvoidStrikeoutRate = 0.280,
  contactRating = 60,
): CheckpointSignalMember => ({
  playerId,
  role: poolKey === 'SP' || poolKey === 'RP' ? 'pitcher' : 'hitter',
  ageBand: '25-31',
  ratings: { contact: contactRating },
  poolKey,
  categoryRates: categoryRate(contactAvoidStrikeoutRate),
});

const categoryRateFor = (
  category: ExpectedStatsCategory,
  actual: number,
  sampleSize: number,
) => ({
  actualByCat: { [category]: actual } as Partial<Record<ExpectedStatsCategory, number>>,
  sampleSizeByCat: { [category]: sampleSize } as Partial<Record<ExpectedStatsCategory, number>>,
});

const ratedCategoryMember = (
  playerId: string,
  poolKey: RatingsPoolKey,
  category: ExpectedStatsCategory,
  ratingKey: ExpectedStatsRatingKey,
  actual: number,
  sampleSize: number,
  rating = 60,
): CheckpointSignalMember => ({
  playerId,
  role: poolKey === 'SP' || poolKey === 'RP' ? 'pitcher' : 'hitter',
  ageBand: '25-31',
  ratings: { [ratingKey]: rating },
  poolKey,
  categoryRates: categoryRateFor(category, actual, sampleSize),
});

const qualifyingContactPeers = (
  poolKey: RatingsPoolKey,
  count: number,
  sampleSize: number,
): CheckpointSignalMember[] => (
  Array.from({ length: count }, (_, i) => (
    ratedCategoryMember(
      `${poolKey}-contact-peer-${i}`,
      poolKey,
      'contactAvoidStrikeoutRate',
      'contact',
      0.245 + i * 0.010,
      sampleSize,
    )
  ))
);

const qualifyingSpeedPeers = (count: number): CheckpointSignalMember[] => (
  Array.from({ length: count }, (_, i) => (
    ratedCategoryMember(
      `speed-peer-${i}`,
      'middleIF',
      'speedStealTripleRate',
      'speed',
      0.050 + i * 0.010,
      2,
    )
  ))
);

describe('checkpointRatingSignal RA-2c-1', () => {
  test('classifyRatingsPoolKey follows Fork A/B startsShare and effectivePosition rulings', () => {
    expect(classifyRatingsPoolKey({ role: 'hitter', effectivePosition: 'SS', startsShare: 0.8 })).toBe('middleIF');
    expect(classifyRatingsPoolKey({ role: 'hitter', effectivePosition: '1B', startsShare: 0.8 })).toBe('cornerIF');
    expect(classifyRatingsPoolKey({ role: 'hitter', effectivePosition: '3B', startsShare: 0.8 })).toBe('cornerIF');
    expect(classifyRatingsPoolKey({ role: 'hitter', effectivePosition: 'CF', startsShare: 0.8 })).toBe('CF');
    expect(classifyRatingsPoolKey({ role: 'hitter', effectivePosition: 'LF', startsShare: 0.8 })).toBe('cornerOF');
    expect(classifyRatingsPoolKey({ role: 'hitter', effectivePosition: 'C', startsShare: 0.8 })).toBe('C');
    expect(classifyRatingsPoolKey({ role: 'hitter', effectivePosition: '1B', startsShare: 0.3 })).toBe('benchIF');
    expect(classifyRatingsPoolKey({ role: 'hitter', effectivePosition: 'LF', startsShare: 0.3 })).toBe('benchOF');
    expect(classifyRatingsPoolKey({ role: 'hitter', effectivePosition: 'C', startsShare: 0.5 })).toBe('benchIF');
    expect(classifyRatingsPoolKey({ role: 'hitter', effectivePosition: 'SS', startsShare: null })).toBe('benchIF');
    expect(classifyRatingsPoolKey({ role: 'pitcher', effectivePosition: 'SP', startsShare: null })).toBe('SP');
    expect(classifyRatingsPoolKey({ role: 'pitcher', effectivePosition: 'CP', startsShare: null })).toBe('RP');
    expect(classifyRatingsPoolKey({ role: 'pitcher', effectivePosition: 'RP', startsShare: null })).toBe('RP');
    expect(classifyRatingsPoolKey({ role: 'pitcher', effectivePosition: 'SP/RP', startsShare: null })).toBe('RP');
    expect(classifyRatingsPoolKey({ role: 'hitter', effectivePosition: null, startsShare: 0.8 })).toBeNull();
    expect(classifyRatingsPoolKey({ role: 'pitcher', effectivePosition: 'C', startsShare: null })).toBeNull();
  });

  test('CHECKPOINT_POOL_LADDER preserves the ruled middleIF fallback shape', () => {
    expect(CHECKPOINT_POOL_LADDER.middleIF).toEqual([
      ['middleIF'],
      ['cornerIF', 'middleIF'],
      ['C', 'cornerIF', 'middleIF', 'cornerOF', 'CF', 'benchIF', 'benchOF'],
    ]);
  });

  test('resolvePoolMeanMembers always returns the position-pure Rung 0 mean pool', () => {
    const pure = Array.from({ length: 6 }, (_, i) => member(`m${i}`, 'middleIF', 0.250 + i * 0.010));
    const pureResult = resolvePoolMeanMembers('middleIF', pure);
    expect(pureResult.rungIndex).toBe(0);
    expect(pureResult.members).toHaveLength(6);

    const sameGroup = [
      member('mi1', 'middleIF'),
      member('mi2', 'middleIF'),
      ...Array.from({ length: 6 }, (_, i) => member(`ci${i}`, 'cornerIF', 0.260 + i * 0.005)),
    ];
    const sameGroupResult = resolvePoolMeanMembers('middleIF', sameGroup);
    expect(sameGroupResult.rungIndex).toBe(0);
    expect(sameGroupResult.members).toHaveLength(2);
    expect(new Set(sameGroupResult.members.map((m) => m.playerId))).toEqual(new Set(['mi1', 'mi2']));

    const thin = [member('thin1', 'middleIF'), member('thin2', 'middleIF')];
    const thinResult = resolvePoolMeanMembers('middleIF', thin);
    expect(thinResult.rungIndex).toBe(0);
    expect(thinResult.members).toHaveLength(2);
  });

  test('computeCheckpointRatingSignals blends contact categories and preserves anchor identity', () => {
    const cohort: CheckpointSignalMember[] = [
      member('low', 'middleIF', 0.240),
      member('below', 'middleIF', 0.260),
      member('anchor', 'middleIF', 0.280),
      member('mid', 'middleIF', 0.280),
      member('above', 'middleIF', 0.300),
      member('high', 'middleIF', 0.320),
    ];

    const result = computeCheckpointRatingSignals(cohort);

    expect(result.cumulative.get('anchor')?.contact).toBeCloseTo(0, 10);
    expect(result.cumulative.get('high')?.contact).toBeGreaterThan(0);
    expect(result.cumulative.get('low')?.contact).toBeLessThan(0);
    expect(result.recent.size).toBe(0);
  });

  test('recentCategoryRates produces a parallel recent signal against the cumulative pool stats', () => {
    const cohort: CheckpointSignalMember[] = [
      {
        ...member('target', 'middleIF', 0.280),
        recentCategoryRates: categoryRate(0.340, 10),
      },
      member('low', 'middleIF', 0.240),
      member('below', 'middleIF', 0.260),
      member('mid', 'middleIF', 0.280),
      member('above', 'middleIF', 0.300),
      member('high', 'middleIF', 0.320),
    ];

    const result = computeCheckpointRatingSignals(cohort);

    expect(result.cumulative.get('target')?.contact).toBeCloseTo(0, 10);
    expect(result.recent.get('target')?.contact).toBeGreaterThan(
      result.cumulative.get('target')?.contact ?? Number.NEGATIVE_INFINITY,
    );
    expect(result.recent.has('low')).toBe(false);
  });

  test('thin recentCategoryRates are gated by the same flat floor as cumulative rates', () => {
    const cohort: CheckpointSignalMember[] = [
      {
        ...member('target', 'middleIF', 0.280),
        recentCategoryRates: categoryRate(0.340, 9),
      },
      member('low', 'middleIF', 0.240),
      member('below', 'middleIF', 0.260),
      member('mid', 'middleIF', 0.280),
      member('above', 'middleIF', 0.300),
      member('high', 'middleIF', 0.320),
    ];

    const result = computeCheckpointRatingSignals(cohort);

    expect(result.cumulative.get('target')?.contact).toBeCloseTo(0, 10);
    expect(result.recent.get('target')).toEqual({});
  });

  test('computeCheckpointRatingSignals handles empty and one-member thin pools without throwing', () => {
    const empty = computeCheckpointRatingSignals([]);
    expect(empty.cumulative.size).toBe(0);
    expect(empty.recent.size).toBe(0);

    expect(() => computeCheckpointRatingSignals([member('solo', 'middleIF')])).not.toThrow();
    expect(computeCheckpointRatingSignals([member('solo', 'middleIF')]).cumulative.get('solo')).toEqual({});
  });

  test('computeCheckpointRatingSignals suppresses a thin position-pure pool and never borrows the wider MEAN (RA-2c-1a)', () => {
    const fiveMiddleInfielders = Array.from({ length: 5 }, (_, i) => (
      member(`thin-mi-${i}`, 'middleIF', 0.250 + i * 0.010)
    ));
    const thinResult = computeCheckpointRatingSignals(fiveMiddleInfielders);

    for (const thinMember of fiveMiddleInfielders) {
      expect(thinResult.cumulative.get(thinMember.playerId)?.contact).toBeUndefined();
    }

    const mixedCohort: CheckpointSignalMember[] = [
      member('low-mi', 'middleIF', 0.240),
      member('high-mi', 'middleIF', 0.320),
      ...[0.260, 0.270, 0.282, 0.292, 0.300, 0.308].map((rate, i) => (
        member(`corner-${i}`, 'cornerIF', rate)
      )),
    ];
    const mixedResult = computeCheckpointRatingSignals(mixedCohort);

    expect(mixedResult.cumulative.get('low-mi')?.contact).toBeUndefined();
    expect(mixedResult.cumulative.get('high-mi')?.contact).toBeUndefined();
    expect(
      mixedCohort
        .filter((m) => m.poolKey === 'cornerIF')
        .some((m) => {
          const signal = mixedResult.cumulative.get(m.playerId)?.contact;
          return typeof signal === 'number' && Number.isFinite(signal);
        }),
    ).toBe(true);
  });

  test('RA-2c-2a flat floors suppress starter contact below 10 PA and allow it at 10', () => {
    const belowFloor = [
      ratedCategoryMember('target', 'middleIF', 'contactAvoidStrikeoutRate', 'contact', 0.330, 9),
      ...qualifyingContactPeers('middleIF', 6, 10),
    ];
    const atFloor = [
      ratedCategoryMember('target', 'middleIF', 'contactAvoidStrikeoutRate', 'contact', 0.330, 10),
      ...qualifyingContactPeers('middleIF', 6, 10),
    ];

    expect(computeCheckpointRatingSignals(belowFloor).cumulative.get('target')?.contact).toBeUndefined();
    expect(computeCheckpointRatingSignals(atFloor).cumulative.get('target')?.contact).toEqual(expect.any(Number));
  });

  test('RA-2c-2a flat floors use the 5 PA bench contact floor for benchIF members', () => {
    const aboveBenchFloor = [
      ratedCategoryMember('bench-target', 'benchIF', 'contactAvoidStrikeoutRate', 'contact', 0.330, 6),
      ...qualifyingContactPeers('benchIF', 6, 5),
    ];
    const belowBenchFloor = [
      ratedCategoryMember('bench-target', 'benchIF', 'contactAvoidStrikeoutRate', 'contact', 0.330, 4),
      ...qualifyingContactPeers('benchIF', 6, 5),
    ];

    expect(computeCheckpointRatingSignals(aboveBenchFloor).cumulative.get('bench-target')?.contact).toEqual(expect.any(Number));
    expect(computeCheckpointRatingSignals(belowBenchFloor).cumulative.get('bench-target')?.contact).toBeUndefined();
  });

  test('RA-2c-2a flat floors suppress speedStealTripleRate below 2 speed events and allow it at 2', () => {
    const belowFloor = [
      ratedCategoryMember('speed-target', 'middleIF', 'speedStealTripleRate', 'speed', 0.140, 1),
      ...qualifyingSpeedPeers(6),
    ];
    const atFloor = [
      ratedCategoryMember('speed-target', 'middleIF', 'speedStealTripleRate', 'speed', 0.140, 2),
      ...qualifyingSpeedPeers(6),
    ];

    expect(computeCheckpointRatingSignals(belowFloor).cumulative.get('speed-target')?.speed).toBeUndefined();
    expect(computeCheckpointRatingSignals(atFloor).cumulative.get('speed-target')?.speed).toEqual(expect.any(Number));
  });
});
