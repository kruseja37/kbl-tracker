import { describe, expect, test } from 'vitest';

import {
  LUXURY_CAP_TABLES,
  PITCHER_SECONDARY_BATTING_PENALTY_CURVE,
  type LuxuryCapRow,
  type TierKey,
} from '../tierParams';

const TIERS: TierKey[] = ['juiced', 'standard', 'nerfed'];

const EXPECTED_ROWS: Record<TierKey, Array<Pick<LuxuryCapRow, 'group' | 'stat' | 'cap' | 'penaltyPer100' | 'minAdder'>>> = {
  juiced: [
    { group: 'rotation', stat: 'POW', cap: 17.5, penaltyPer100: 2_194_663, minAdder: 3_292 },
    { group: 'rotation', stat: 'CON', cap: 17.3, penaltyPer100: 1_316_798, minAdder: 2_743 },
    { group: 'bullpen', stat: 'POW', cap: 6.9, penaltyPer100: 2_304_396, minAdder: 5_487 },
    { group: 'bullpen', stat: 'CON', cap: 7.0, penaltyPer100: 1_426_531, minAdder: 3_292 },
  ],
  standard: [
    { group: 'rotation', stat: 'POW', cap: 16.7, penaltyPer100: 1_937_221, minAdder: 2_906 },
    { group: 'rotation', stat: 'CON', cap: 16.6, penaltyPer100: 1_162_333, minAdder: 2_422 },
    { group: 'bullpen', stat: 'POW', cap: 6.6, penaltyPer100: 2_034_082, minAdder: 4_843 },
    { group: 'bullpen', stat: 'CON', cap: 6.7, penaltyPer100: 1_259_194, minAdder: 2_906 },
  ],
  nerfed: [
    { group: 'rotation', stat: 'POW', cap: 16.0, penaltyPer100: 1_737_903, minAdder: 2_607 },
    { group: 'rotation', stat: 'CON', cap: 15.9, penaltyPer100: 1_042_742, minAdder: 2_172 },
    { group: 'bullpen', stat: 'POW', cap: 6.3, penaltyPer100: 1_824_798, minAdder: 4_345 },
    { group: 'bullpen', stat: 'CON', cap: 6.4, penaltyPer100: 1_129_637, minAdder: 2_607 },
  ],
};

function pitcherSecondaryRows(tier: TierKey): LuxuryCapRow[] {
  return LUXURY_CAP_TABLES[tier].filter((row) =>
    (row.group === 'rotation' || row.group === 'bullpen')
    && (row.stat === 'POW' || row.stat === 'CON'));
}

function rowTax(row: LuxuryCapRow, overage: number): number {
  return Math.round(row.penaltyPer100 * (overage / 100) ** row.penaltyCurve + row.minAdder);
}

describe('pitcher secondary-rating luxury tax tuning', () => {
  test('uses the approved quadratic curve for rotation and bullpen POW/CON at every tier', () => {
    expect(PITCHER_SECONDARY_BATTING_PENALTY_CURVE).toBe(2);

    for (const tier of TIERS) {
      const rows = pitcherSecondaryRows(tier);
      expect(rows).toHaveLength(4);
      expect(rows.every((row) => row.topN === 4)).toBe(true);
      expect(rows.every((row) => row.penaltyCurve === PITCHER_SECONDARY_BATTING_PENALTY_CURVE)).toBe(true);
    }
  });

  test('uses playing-time-derived caps while preserving the approved dollar coefficients', () => {
    for (const tier of TIERS) {
      expect(pitcherSecondaryRows(tier).map(({ group, stat, cap, penaltyPer100, minAdder }) => ({
        group,
        stat,
        cap,
        penaltyPer100,
        minAdder,
      }))).toEqual(EXPECTED_ROWS[tier]);
    }
  });

  test('marks every generated row with the new basis, re-derives six secondary caps, and excludes pitcher FLD', () => {
    const expectedCaps = {
      juiced: [17.5, 17.3, 35.3, 6.9, 7.0, 22.1],
      standard: [16.7, 16.6, 33.7, 6.6, 6.7, 21.1],
      nerfed: [16.0, 15.9, 32.3, 6.3, 6.4, 20.2],
    } satisfies Record<TierKey, number[]>;
    for (const tier of TIERS) {
      expect(LUXURY_CAP_TABLES[tier].every((row) => row.ratingBasis === 'pitcher-role-usage-v1')).toBe(true);
      expect(LUXURY_CAP_TABLES[tier]
        .filter((row) => (row.group === 'rotation' || row.group === 'bullpen')
          && ['POW', 'CON', 'SPD'].includes(row.stat))
        .map((row) => row.cap)).toEqual(expectedCaps[tier]);
      expect(LUXURY_CAP_TABLES[tier].some((row) => (
        (row.group === 'rotation' || row.group === 'bullpen') && row.stat === 'FLD'
      ))).toBe(false);
    }
  });

  test('keeps a standard ten-point overage modest while preserving a meaningful stacking penalty', () => {
    const rows = pitcherSecondaryRows('standard');

    expect(rows.map((row) => rowTax(row, 10))).toEqual([22_278, 14_045, 25_184, 15_498]);
    expect(rows.map((row) => rowTax(row, 50))).toEqual([487_211, 293_005, 513_364, 317_705]);
  });
});
