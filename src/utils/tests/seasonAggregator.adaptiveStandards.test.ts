import { describe, expect, test } from 'vitest';
import {
  aggregateGameToSeason,
  getScaledQualityStartThresholds,
  isCompleteGameByContext,
  isQualityStartByContext,
  MissingSeasonScopeError,
} from '../seasonAggregator';
import type { PersistedGameState } from '../gameStorage';

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

  test('rejects aggregation without an explicit season scope before any season write', async () => {
    await expect(
      aggregateGameToSeason({ gameId: 'missing-season-scope' } as PersistedGameState),
    ).rejects.toBeInstanceOf(MissingSeasonScopeError);
  });
});
