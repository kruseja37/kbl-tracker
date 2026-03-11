import { describe, expect, test } from 'vitest';

import { convertPlayDataToPlayResult, isPotentialRobbery, isSpectacularCatch } from '../../app/engines/detectionIntegration';
import type { PlayData } from '../../app/utils/gameTrackerFieldTypes';

function buildPlayData(overrides: Partial<PlayData> = {}): PlayData {
  return {
    type: 'out',
    outType: 'FO',
    fieldingSequence: [8],
    ...overrides,
  };
}

describe('detectionIntegration', () => {
  test('uses explicit fielding play type instead of location inference for catch type', () => {
    const result = convertPlayDataToPlayResult(
      buildPlayData({
        fieldingPlayType: 'wall',
        ballLocation: { x: 40, y: 12 },
      }),
      { id: 'b1', name: 'Batter One' },
      { id: 'p1', name: 'Pitcher One' },
      0,
    );

    expect(result.fieldingData?.catchType).toBe('WALL_CATCH');
  });

  test('treats explicit robbed hr as a potential robbery', () => {
    expect(isPotentialRobbery(buildPlayData({ fieldingPlayType: 'robbed_hr' }))).toBe(true);
    expect(isPotentialRobbery(buildPlayData({ fieldingPlayType: 'running' }))).toBe(false);
  });

  test('treats explicit catch types as spectacular catches', () => {
    expect(isSpectacularCatch(buildPlayData({ fieldingPlayType: 'over_shoulder' }))).toBe(true);
    expect(isSpectacularCatch(buildPlayData({ fieldingPlayType: 'routine', playDifficulty: 'routine' }))).toBe(false);
  });
});
