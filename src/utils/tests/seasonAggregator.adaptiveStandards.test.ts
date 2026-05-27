import { describe, expect, test } from 'vitest';
import {
  getScaledQualityStartThresholds,
  isCompleteGameByContext,
  isQualityStartByContext,
} from '../seasonAggregator';

describe('season aggregator adaptive standards', () => {
  test('scales quality-start thresholds for short games', () => {
    expect(getScaledQualityStartThresholds(9)).toEqual({
      outsRecorded: 18,
      earnedRuns: 3,
    });
    expect(getScaledQualityStartThresholds(6)).toEqual({
      outsRecorded: 12,
      earnedRuns: 2,
    });
  });

  test('uses scheduled innings for quality starts and complete games', () => {
    const shortGameStart = {
      isStarter: true,
      outsRecorded: 12,
      earnedRuns: 2,
    };

    expect(isQualityStartByContext(shortGameStart, { scheduledInnings: 6 })).toBe(true);
    expect(isQualityStartByContext(shortGameStart, { scheduledInnings: 9 })).toBe(false);
    expect(isCompleteGameByContext(shortGameStart, { scheduledInnings: 6 })).toBe(false);
    expect(isCompleteGameByContext({ ...shortGameStart, outsRecorded: 18 }, { scheduledInnings: 6 })).toBe(true);
  });
});
