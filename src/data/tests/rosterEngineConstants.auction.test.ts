import { describe, expect, test } from 'vitest';

import {
  AUCTION_MIN_SALARY_POSITIONS,
  LEAGUE_MINIMUM_SALARY,
  MIN_SALARY_BY_POSITION,
  RESERVE_PRICE_CURVE_MAX,
  RESERVE_PRICE_CURVE_MIN,
  auctionMaxBid,
  reservePriceCurve,
} from '../rosterEngineConstants';
import { MIN_SALARY } from '../../engines/salaryCalculator';

describe('rosterEngineConstants auction pricing primitives', () => {
  test('reservePriceCurve follows IV_ENGINE §7.5 0.5 to 0.7 top-decile curve', () => {
    const bottom = reservePriceCurve(0);
    const midpoint = reservePriceCurve(50);
    const top = reservePriceCurve(100);

    expect(bottom).toBe(RESERVE_PRICE_CURVE_MIN);
    expect(midpoint).toBeGreaterThan(bottom);
    expect(midpoint).toBeLessThan(top);
    expect(top).toBe(RESERVE_PRICE_CURVE_MAX);
  });

  test('MIN_SALARY_BY_POSITION covers every auction roster position from the existing salary floor', () => {
    expect(AUCTION_MIN_SALARY_POSITIONS).toEqual([
      'C',
      '1B',
      '2B',
      '3B',
      'SS',
      'LF',
      'CF',
      'RF',
      'DH',
      'SP',
      'SP/RP',
      'RP',
      'CP',
    ]);
    expect(Object.keys(MIN_SALARY_BY_POSITION).sort()).toEqual([...AUCTION_MIN_SALARY_POSITIONS].sort());
    for (const position of AUCTION_MIN_SALARY_POSITIONS) {
      expect(MIN_SALARY_BY_POSITION[position]).toBe(LEAGUE_MINIMUM_SALARY);
      expect(MIN_SALARY_BY_POSITION[position]).toBe(MIN_SALARY);
    }
  });

  test('auctionMaxBid leaves no filler reserve for a solo remaining slot', () => {
    expect(auctionMaxBid(25_000, 1, LEAGUE_MINIMUM_SALARY, 3_000)).toBe(22_000);
  });

  test('auctionMaxBid clamps budget exhaustion to zero', () => {
    expect(auctionMaxBid(4_000, 3, 2_000, 1)).toBe(0);
  });

  test('auctionMaxBid reserves remaining filler slots and projected tax in a normal case', () => {
    expect(auctionMaxBid(50_000, 4, 2_000, 5_000)).toBe(39_000);
  });
});
