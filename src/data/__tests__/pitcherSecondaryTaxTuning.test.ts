import { createHash } from 'node:crypto';

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
    { group: 'rotation', stat: 'POW', cap: 98.0, penaltyPer100: 2_194_663, minAdder: 3_292 },
    { group: 'rotation', stat: 'CON', cap: 98.3, penaltyPer100: 1_316_798, minAdder: 2_743 },
    { group: 'bullpen', stat: 'POW', cap: 80.0, penaltyPer100: 2_304_396, minAdder: 5_487 },
    { group: 'bullpen', stat: 'CON', cap: 77.1, penaltyPer100: 1_426_531, minAdder: 3_292 },
  ],
  standard: [
    { group: 'rotation', stat: 'POW', cap: 93.5, penaltyPer100: 1_937_221, minAdder: 2_906 },
    { group: 'rotation', stat: 'CON', cap: 93.9, penaltyPer100: 1_162_333, minAdder: 2_422 },
    { group: 'bullpen', stat: 'POW', cap: 76.3, penaltyPer100: 2_034_082, minAdder: 4_843 },
    { group: 'bullpen', stat: 'CON', cap: 73.6, penaltyPer100: 1_259_194, minAdder: 2_906 },
  ],
  nerfed: [
    { group: 'rotation', stat: 'POW', cap: 89.6, penaltyPer100: 1_737_903, minAdder: 2_607 },
    { group: 'rotation', stat: 'CON', cap: 89.9, penaltyPer100: 1_042_742, minAdder: 2_172 },
    { group: 'bullpen', stat: 'POW', cap: 73.1, penaltyPer100: 1_824_798, minAdder: 4_345 },
    { group: 'bullpen', stat: 'CON', cap: 70.5, penaltyPer100: 1_129_637, minAdder: 2_607 },
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

function isPitcherSecondaryRow(row: LuxuryCapRow): boolean {
  return (row.group === 'rotation' || row.group === 'bullpen')
    && (row.stat === 'POW' || row.stat === 'CON');
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

  test('changes only the response curve, preserving the empirical caps and dollar coefficients', () => {
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

  test('leaves every non-target luxury-tax row unchanged', () => {
    const nonTargetRows = TIERS.flatMap((tier) =>
      LUXURY_CAP_TABLES[tier]
        .filter((row) => !isPitcherSecondaryRow(row))
        .map((row) => [tier, row]));
    const fingerprint = createHash('sha256')
      .update(JSON.stringify(nonTargetRows))
      .digest('hex');

    expect(fingerprint).toBe('fd42eded9c654ea27a59b41176369f698b4fdc49dfaee843ab6205282123da03');
  });

  test('keeps a standard ten-point overage modest while preserving a meaningful stacking penalty', () => {
    const rows = pitcherSecondaryRows('standard');

    expect(rows.map((row) => rowTax(row, 10))).toEqual([22_278, 14_045, 25_184, 15_498]);
    expect(rows.map((row) => rowTax(row, 50))).toEqual([487_211, 293_005, 513_364, 317_705]);
  });
});
