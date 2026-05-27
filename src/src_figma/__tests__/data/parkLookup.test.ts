/**
 * Park lookup validation (D1 – 23 parks load, fences, league averages)
 * @franchise-game-tracker
 */

import { describe, test, expect } from 'vitest';
import { getAllParks, getParkByName, getMinFenceDistance, getStableParkId, LEAGUE_AVG_DIMENSIONS } from '../../../data/parkLookup';
import {
  getDerivedParkFactorsIfAvailable,
  isParkFactorAdjustmentActive,
} from '../../../engines/parkFactorDeriver';

describe('@franchise-game-tracker park lookup data', () => {
  test('loads 23 parks from SMB4 data', () => {
    const parks = getAllParks();
    expect(parks.length).toBe(23);
  });

  test('getParkByName returns normalized data', () => {
    const park = getParkByName('apple field');
    expect(park).toBeDefined();
    expect(park?.name).toBe('Apple Field');
    expect(park?.cf).toBeGreaterThan(400);
  });

  test('min fence distance matches park data per direction', () => {
    const park = getParkByName('Apple Field');
    expect(park).toBeDefined();
    expect(getMinFenceDistance(park!, 'lf')).toBe(337);
    expect(getMinFenceDistance(park!, 'cf')).toBe(419);
    expect(getMinFenceDistance(park!, 'rf')).toBe(347);
  });

  test('league average dimensions look reasonable', () => {
    expect(LEAGUE_AVG_DIMENSIONS.lf).toBeGreaterThan(320);
    expect(LEAGUE_AVG_DIMENSIONS.cf).toBeGreaterThan(395);
    expect(LEAGUE_AVG_DIMENSIONS.rf).toBeGreaterThan(320);
  });

  test('derives seeded park-factor identity for known SMB4 stadiums only', () => {
    const apple = getDerivedParkFactorsIfAvailable('Apple Field');
    expect(apple).toMatchObject({
      stadiumId: getStableParkId('Apple Field'),
      stadiumName: 'Apple Field',
      source: 'SEED',
      gamesIncluded: 0,
      confidence: 'LOW',
    });
    expect(apple?.homeRuns).toBeGreaterThan(0.7);
    expect(getDerivedParkFactorsIfAvailable('Custom Backyard')).toBeUndefined();
  });

  test('park-factor adjustments activate only after 40 percent of scheduled games', () => {
    expect(isParkFactorAdjustmentActive(7, 20)).toBe(false);
    expect(isParkFactorAdjustmentActive(8, 20)).toBe(true);
  });
});
