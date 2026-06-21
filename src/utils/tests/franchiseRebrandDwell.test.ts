import { describe, expect, test } from 'vitest';

import {
  computeRebrandDwell,
  REBRAND_DWELL_BAND_MAX,
  REBRAND_DWELL_TRIGGER_GAMES,
  REBRAND_RESET_MORALE,
} from '../franchiseRebrandDwell';

describe('computeRebrandDwell', () => {
  test('counts the most-recent consecutive rock-bottom games', () => {
    const result = computeRebrandDwell([60, 21, 20, 19, 18]);

    expect(result).toEqual({
      consecutiveRockBottomGames: 3,
      armed: false,
    });
  });

  test('resets the streak when a recovery game breaks older rock-bottom history', () => {
    const result = computeRebrandDwell([20, 19, REBRAND_DWELL_BAND_MAX + 1, 18, 17]);

    expect(result).toEqual({
      consecutiveRockBottomGames: 2,
      armed: false,
    });
  });

  test('treats the band edge as inclusive and max plus one as a recovery', () => {
    expect(computeRebrandDwell([70, REBRAND_DWELL_BAND_MAX]).consecutiveRockBottomGames).toBe(1);
    expect(computeRebrandDwell([70, REBRAND_DWELL_BAND_MAX + 1]).consecutiveRockBottomGames).toBe(0);
  });

  test('arms exactly at the trigger threshold', () => {
    const oneShortHistory = Array.from({ length: REBRAND_DWELL_TRIGGER_GAMES - 1 }, () => REBRAND_DWELL_BAND_MAX);
    const thresholdHistory = Array.from({ length: REBRAND_DWELL_TRIGGER_GAMES }, () => REBRAND_DWELL_BAND_MAX);

    expect(computeRebrandDwell(oneShortHistory)).toEqual({
      consecutiveRockBottomGames: REBRAND_DWELL_TRIGGER_GAMES - 1,
      armed: false,
    });
    expect(computeRebrandDwell(thresholdHistory)).toEqual({
      consecutiveRockBottomGames: REBRAND_DWELL_TRIGGER_GAMES,
      armed: true,
    });
  });

  test('returns an unarmed zero streak for empty history', () => {
    expect(computeRebrandDwell([])).toEqual({
      consecutiveRockBottomGames: 0,
      armed: false,
    });
  });

  test('exports the rebrand reset morale constant for the later cascade ticket', () => {
    expect(REBRAND_RESET_MORALE).toBe(70);
  });
});
