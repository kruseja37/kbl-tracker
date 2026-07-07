import { describe, expect, test } from 'vitest';

import {
  CANONICAL_PERSONALITIES,
  clampMorale,
  type CanonicalPersonality,
} from '../masterMoraleMatrix';
import {
  DRAFT_MORALE_TUNING,
  classifyDraftPay,
  classifyDraftSlot,
  computeDraftMorale,
  computeDraftMoraleFromRaw,
  type DraftPayClass,
  type DraftSlotClass,
} from '../draftMorale';
import type { HiddenModifiers } from '../../types/game';

const neutralModifiers: HiddenModifiers = {
  loyalty: 50,
  ambition: 50,
  resilience: 50,
  charisma: 50,
};

function draftMorale(
  slotClass: DraftSlotClass,
  payClass: DraftPayClass,
  personality: CanonicalPersonality = 'COMPETITIVE',
  modifiers: HiddenModifiers = neutralModifiers,
) {
  return computeDraftMorale({
    slotClass,
    payClass,
    personality,
    modifiers,
  });
}

describe('draftMorale RB-5 pure engine', () => {
  test('early-dominates corner cases hold for all canonical personalities', () => {
    for (const personality of CANONICAL_PERSONALITIES) {
      const earlyUnderpaid = draftMorale('early', 'below', personality);
      const lateOverpaid = draftMorale('late', 'above', personality);
      const lateUnderpaid = draftMorale('late', 'below', personality);
      const earlyOverpaid = draftMorale('early', 'above', personality);

      expect(earlyUnderpaid).toMatchObject({
        slotBase: DRAFT_MORALE_TUNING.slotBoost,
        payBase: DRAFT_MORALE_TUNING.payPenalty,
      });
      expect(earlyUnderpaid.totalDelta).toBeGreaterThan(0);
      expect(earlyUnderpaid.startingMorale).toBeGreaterThan(DRAFT_MORALE_TUNING.neutralMorale);

      expect(lateOverpaid).toMatchObject({
        slotBase: DRAFT_MORALE_TUNING.slotPenalty,
        payBase: DRAFT_MORALE_TUNING.payBoost,
      });
      expect(lateOverpaid.totalDelta).toBeLessThan(0);
      expect(lateOverpaid.startingMorale).toBeLessThan(DRAFT_MORALE_TUNING.neutralMorale);

      const cornerDeltas = [
        earlyUnderpaid.totalDelta,
        lateOverpaid.totalDelta,
        lateUnderpaid.totalDelta,
        earlyOverpaid.totalDelta,
      ];
      expect(lateUnderpaid.totalDelta).toBe(Math.min(...cornerDeltas));
      expect(earlyOverpaid.totalDelta).toBe(Math.max(...cornerDeltas));
      expect(lateUnderpaid.startingMorale).toBeLessThan(lateOverpaid.startingMorale);
      expect(earlyOverpaid.startingMorale).toBeGreaterThan(earlyUnderpaid.startingMorale);
    }
  });

  test('sum-then-tilt preserves DROOPY early-underpaid as a net boost', () => {
    const result = draftMorale('early', 'below', 'DROOPY');

    expect(result.slotBase + result.payBase).toBe(5);
    expect(result.totalDelta).toBe(4);
    expect(result.startingMorale).toBe(54);
  });

  test('middle slot and within-range pay are exactly neutral even with reactive inputs', () => {
    const result = computeDraftMorale({
      slotClass: 'middle',
      payClass: 'within',
      personality: 'EGOTISTICAL',
      modifiers: {
        loyalty: 0,
        ambition: 100,
        resilience: 0,
        charisma: 100,
      },
    });

    expect(result).toEqual({
      startingMorale: DRAFT_MORALE_TUNING.neutralMorale,
      slotBase: 0,
      payBase: 0,
      totalDelta: 0,
    });
  });

  test('personality scales the magnitude for the same draft class', () => {
    const relaxed = draftMorale('early', 'above', 'RELAXED');
    const egotistical = draftMorale('early', 'above', 'EGOTISTICAL');

    expect(egotistical.totalDelta).toBeGreaterThan(relaxed.totalDelta);
    expect(Math.abs(egotistical.totalDelta)).toBeGreaterThan(Math.abs(relaxed.totalDelta));
  });

  test('hidden modifiers tilt the already-summed net draft delta', () => {
    const neutralPositive = draftMorale('early', 'below', 'COMPETITIVE');
    const highAmbition = draftMorale('early', 'below', 'COMPETITIVE', {
      ...neutralModifiers,
      ambition: 100,
    });
    const neutralNegative = draftMorale('late', 'above', 'COMPETITIVE');
    const highResilience = draftMorale('late', 'above', 'COMPETITIVE', {
      ...neutralModifiers,
      resilience: 100,
    });

    expect(highAmbition.totalDelta).toBeGreaterThan(neutralPositive.totalDelta);
    expect(highAmbition.startingMorale).toBeGreaterThan(neutralPositive.startingMorale);
    expect(highResilience.totalDelta).toBeGreaterThan(neutralNegative.totalDelta);
    expect(Math.abs(highResilience.totalDelta)).toBeLessThan(Math.abs(neutralNegative.totalDelta));
  });

  test('classifyDraftSlot uses won-order terciles with sane edges', () => {
    expect(classifyDraftSlot(0, 9)).toBe('early');
    expect(classifyDraftSlot(2, 9)).toBe('early');
    expect(classifyDraftSlot(3, 9)).toBe('middle');
    expect(classifyDraftSlot(5, 9)).toBe('middle');
    expect(classifyDraftSlot(6, 9)).toBe('late');
    expect(classifyDraftSlot(8, 9)).toBe('late');

    expect(classifyDraftSlot(0, 4)).toBe('early');
    expect(classifyDraftSlot(1, 4)).toBe('middle');
    expect(classifyDraftSlot(2, 4)).toBe('middle');
    expect(classifyDraftSlot(3, 4)).toBe('late');
    expect(classifyDraftSlot(0, 2)).toBe('early');
    expect(classifyDraftSlot(1, 2)).toBe('late');

    expect(classifyDraftSlot(0, 1)).toBe('middle');
    expect(classifyDraftSlot(-1, 9)).toBe('middle');
    expect(classifyDraftSlot(9, 9)).toBe('middle');
    expect(classifyDraftSlot(Number.NaN, 9)).toBe('middle');
  });

  test('classifyDraftPay buckets bids against the scout range', () => {
    expect(classifyDraftPay(121, { low: 100, high: 120 })).toBe('above');
    expect(classifyDraftPay(99, { low: 100, high: 120 })).toBe('below');
    expect(classifyDraftPay(100, { low: 100, high: 120 })).toBe('within');
    expect(classifyDraftPay(120, { low: 100, high: 120 })).toBe('within');
    expect(classifyDraftPay(110, { low: 120, high: 100 })).toBe('within');
    expect(classifyDraftPay(Number.NaN, { low: 100, high: 120 })).toBe('within');
  });

  test('raw helper classifies first, then delegates to the draft morale computation', () => {
    const result = computeDraftMoraleFromRaw(
      0,
      9,
      80,
      { low: 100, high: 120 },
      'RELAXED',
      neutralModifiers,
    );

    expect(result.slotBase).toBe(DRAFT_MORALE_TUNING.slotBoost);
    expect(result.payBase).toBe(DRAFT_MORALE_TUNING.payPenalty);
    expect(result.totalDelta).toBeGreaterThan(0);
    expect(result.startingMorale).toBeGreaterThan(DRAFT_MORALE_TUNING.neutralMorale);
  });

  test('clamp safety keeps morale bounded to [0, 99]', () => {
    expect(clampMorale(-999)).toBe(0);
    expect(clampMorale(0)).toBe(0);
    expect(clampMorale(50)).toBe(50);
    expect(clampMorale(99)).toBe(99);
    expect(clampMorale(999)).toBe(99);

    for (const personality of CANONICAL_PERSONALITIES) {
      for (const slotClass of ['early', 'middle', 'late'] as const) {
        for (const payClass of ['above', 'within', 'below'] as const) {
          const result = draftMorale(slotClass, payClass, personality);
          expect(result.startingMorale).toBeGreaterThanOrEqual(0);
          expect(result.startingMorale).toBeLessThanOrEqual(99);
        }
      }
    }
  });
});
