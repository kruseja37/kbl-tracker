import { describe, expect, it } from 'vitest';

import { LUXURY_CAP_TABLES } from '../../data/tierParams';
import { snakeLuxuryCaps, snakePlayerTaxPressure } from '../snakeLuxuryTax';

describe('snake roster-local luxury tax', () => {
  it('preserves the configured table exactly because room size is not a tax input', () => {
    expect(snakeLuxuryCaps(LUXURY_CAP_TABLES.standard)).toBe(LUXURY_CAP_TABLES.standard);
  });

  it('prices every applicable cap row, including a category the archetype did not shift', () => {
    const pressure = snakePlayerTaxPressure({
      id: 'multi-category-hitter',
      isPitcher: false,
      bat: { POW: 5, CON: 95, SPD: 90, FLD: 20, ARM: 20 },
    }, [
      { group: 'hitters', stat: 'POW', topN: 8, cap: 80, penaltyCurve: 1, penaltyPer100: 1_000, minAdder: 0 },
      { group: 'hitters', stat: 'CON', topN: 8, cap: 400, penaltyCurve: 1, penaltyPer100: 1_000, minAdder: 0 },
      { group: 'hitters', stat: 'SPD', topN: 8, cap: 800, penaltyCurve: 1, penaltyPer100: 1_000, minAdder: 0 },
    ]);

    expect(pressure).toBe(450);
  });

  it('screens a swing arm against whichever settlement group can cost more', () => {
    const pressure = snakePlayerTaxPressure({
      id: 'rotation-bound-swing',
      isPitcher: true,
      role: 'SP/RP',
      bat: { POW: 0, CON: 0, SPD: 0, FLD: 0, ARM: 0 },
      pit: { VEL: 95, JNK: 40, ACC: 40 },
    }, [
      { group: 'rotation', stat: 'VEL', topN: 4, cap: 200, penaltyCurve: 1, penaltyPer100: 1_000, minAdder: 0 },
      { group: 'bullpen', stat: 'VEL', topN: 4, cap: 400, penaltyCurve: 1, penaltyPer100: 1_000, minAdder: 0 },
    ]);

    expect(pressure).toBe(450);
  });

  it('screens a Two Way player as a hitter plus pitcher without secondary-rating duplication', () => {
    const pressure = snakePlayerTaxPressure({
      id: 'two-way',
      isPitcher: true,
      role: 'SP',
      twoWayVariant: 'OF',
      bat: { POW: 80, CON: 0, SPD: 0, FLD: 0, ARM: 99 },
      pit: { VEL: 70, JNK: 0, ACC: 0 },
    }, [
      { group: 'hitters', stat: 'POW', topN: 1, cap: 0, penaltyCurve: 1, penaltyPer100: 100, minAdder: 0, ratingBasis: 'pitcher-role-usage-v1' },
      { group: 'hitters', stat: 'ARM', topN: 1, cap: 0, penaltyCurve: 1, penaltyPer100: 100, minAdder: 0, ratingBasis: 'pitcher-role-usage-v1' },
      { group: 'rotation', stat: 'POW', topN: 1, cap: 0, penaltyCurve: 1, penaltyPer100: 100, minAdder: 0, ratingBasis: 'pitcher-role-usage-v1' },
      { group: 'rotation', stat: 'VEL', topN: 1, cap: 0, penaltyCurve: 1, penaltyPer100: 100, minAdder: 0, ratingBasis: 'pitcher-role-usage-v1' },
    ]);

    expect(pressure).toBe(150);
  });
});
