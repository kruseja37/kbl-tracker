import { describe, expect, test } from 'vitest';

import {
  CHECKPOINT_POOL_LADDER,
  classifyRatingsPoolKey,
  computeCheckpointRatingSignals,
  resolvePoolMeanMembers,
  type CheckpointSignalMember,
} from '../checkpointRatingSignal';
import type { RatingsPoolKey } from '../../engines/expectedStatsPoolAggregator';

const categoryRate = (contactAverage?: number, sampleSize = 100) => ({
  actualByCat:
    typeof contactAverage === 'number'
      ? { contactAverage }
      : {},
  sampleSizeByCat: { contactAverage: sampleSize },
});

const member = (
  playerId: string,
  poolKey: RatingsPoolKey,
  contactAverage = 0.280,
  contactRating = 60,
): CheckpointSignalMember => ({
  playerId,
  role: poolKey === 'SP' || poolKey === 'RP' ? 'pitcher' : 'hitter',
  ageBand: '25-31',
  ratings: { contact: contactRating },
  poolKey,
  categoryRates: categoryRate(contactAverage),
});

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

  test('resolvePoolMeanMembers uses the narrowest floor-satisfying rung, else the widest rung', () => {
    const pure = Array.from({ length: 6 }, (_, i) => member(`m${i}`, 'middleIF', 0.250 + i * 0.010));
    const pureResult = resolvePoolMeanMembers('middleIF', pure);
    expect(pureResult.rungIndex).toBe(0);
    expect(pureResult.members).toHaveLength(6);

    const broadened = [
      member('mi1', 'middleIF'),
      member('mi2', 'middleIF'),
      ...Array.from({ length: 6 }, (_, i) => member(`ci${i}`, 'cornerIF', 0.260 + i * 0.005)),
    ];
    const broadenedResult = resolvePoolMeanMembers('middleIF', broadened);
    expect(broadenedResult.rungIndex).toBe(1);
    expect(broadenedResult.members).toHaveLength(8);

    const floor = [member('thin1', 'middleIF'), member('thin2', 'middleIF')];
    const floorResult = resolvePoolMeanMembers('middleIF', floor);
    expect(floorResult.rungIndex).toBe(2);
    expect(floorResult.members).toHaveLength(2);
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

    expect(result.get('anchor')?.contact).toBeCloseTo(0, 10);
    expect(result.get('high')?.contact).toBeGreaterThan(0);
    expect(result.get('low')?.contact).toBeLessThan(0);
  });

  test('computeCheckpointRatingSignals handles empty and one-member thin pools without throwing', () => {
    expect(computeCheckpointRatingSignals([]).size).toBe(0);

    expect(() => computeCheckpointRatingSignals([member('solo', 'middleIF')])).not.toThrow();
    expect(computeCheckpointRatingSignals([member('solo', 'middleIF')]).get('solo')).toEqual({});
  });
});
