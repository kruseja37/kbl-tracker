import { describe, expect, test } from 'vitest';

import { LEAGUE_MINIMUM_SALARY } from '../../data/rosterEngineConstants';
import {
  DEFAULT_RESERVE_PRICE_K,
  RESERVE_PRICE_K_STOPS,
  isReservePriceKStop,
  normalizeReservePriceK,
  reserveP,
} from '../auctionReservePrice';

describe('reserveP', () => {
  test('floors positive-k reserve prices at the league minimum salary', () => {
    expect(reserveP({ iv: 1_000, k: 0.5 })).toBe(LEAGUE_MINIMUM_SALARY);
    expect(reserveP({ iv: 0, k: 0.65 })).toBe(LEAGUE_MINIMUM_SALARY);
  });

  test('rounds k times IV with Math.round before applying the floor', () => {
    expect(reserveP({ iv: 10_001, k: 0.65 })).toBe(6_501);
    expect(reserveP({ iv: 99_999, k: 0.8 })).toBe(79_999);
  });

  test('uses the exact v1 k-dial stops', () => {
    expect(RESERVE_PRICE_K_STOPS).toEqual([0, 0.5, 0.65, 0.8]);
    expect(isReservePriceKStop(0)).toBe(true);
    expect(isReservePriceKStop(0.5)).toBe(true);
    expect(isReservePriceKStop(0.65)).toBe(true);
    expect(isReservePriceKStop(0.8)).toBe(true);
    expect(isReservePriceKStop(0.7)).toBe(false);
  });

  test('normalizes invalid k values to the default dial stop', () => {
    expect(DEFAULT_RESERVE_PRICE_K).toBe(0.65);
    expect(normalizeReservePriceK(0.8)).toBe(0.8);
    expect(normalizeReservePriceK(0.7)).toBe(DEFAULT_RESERVE_PRICE_K);
    expect(normalizeReservePriceK(Number.NaN)).toBe(DEFAULT_RESERVE_PRICE_K);
  });

  test('k=0 passes through historical opening prices without applying the minimum floor', () => {
    expect(reserveP({ iv: 100_000, k: 0, passthroughPrice: 833.25 })).toBe(833.25);
    expect(reserveP({ iv: 100_000, k: 0 })).toBe(0);
  });
});
