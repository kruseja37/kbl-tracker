import { describe, expect, test } from 'vitest';

import {
  FAN_DAMPENER_TUNING,
  applyFanMoraleDampener,
  type FanDampenerResult,
} from '../fanMoraleDampener';
import type { CanonicalPersonality } from '../masterMoraleMatrix';
import type { HiddenModifiers } from '../../types/game';

const neutralModifiers: Pick<HiddenModifiers, 'loyalty' | 'ambition' | 'resilience'> = {
  loyalty: 50,
  ambition: 50,
  resilience: 50,
};

function dampen(
  ratingDelta: number,
  teamFanMorale: number,
  personality: CanonicalPersonality = 'COMPETITIVE',
  overrides: Partial<Pick<HiddenModifiers, 'loyalty' | 'ambition' | 'resilience'>> = {},
): FanDampenerResult {
  return applyFanMoraleDampener(
    ratingDelta,
    teamFanMorale,
    personality,
    { ...neutralModifiers, ...overrides },
  );
}

function expectBrakeInvariant(result: FanDampenerResult, ratingDelta: number) {
  expect(Math.abs(result.dampenedDelta)).toBeLessThanOrEqual(Math.abs(ratingDelta));

  if (ratingDelta !== 0) {
    expect(Math.sign(result.dampenedDelta)).toBe(Math.sign(ratingDelta));
  }
}

describe('fanMoraleDampener L5a pure engine', () => {
  test('with-trend and zero deltas pass through unchanged', () => {
    const hotTeamGain = dampen(4, 80);
    const coldTeamDrop = dampen(-4, 20);
    const zeroDelta = dampen(0, 90);

    expect(hotTeamGain).toMatchObject({
      dampenedDelta: 4,
      applied: false,
      dampenStrength: 0,
      direction: 'with-trend',
    });
    expect(coldTeamDrop).toMatchObject({
      dampenedDelta: -4,
      applied: false,
      dampenStrength: 0,
      direction: 'with-trend',
    });
    expect(zeroDelta).toMatchObject({
      dampenedDelta: 0,
      applied: false,
      dampenStrength: 0,
      direction: 'with-trend',
    });
  });

  test('counter-trend drops and gains are reduced without sign flips or amplification', () => {
    const counterTrendDrop = dampen(-10, 90);
    const counterTrendGain = dampen(10, 10);

    expect(counterTrendDrop.applied).toBe(true);
    expect(counterTrendDrop.direction).toBe('counter-trend-down');
    expect(Math.abs(counterTrendDrop.dampenedDelta)).toBeLessThan(10);
    expect(Math.abs(counterTrendDrop.dampenedDelta)).toBeGreaterThanOrEqual(
      (1 - FAN_DAMPENER_TUNING.maxDampen) * 10,
    );
    expectBrakeInvariant(counterTrendDrop, -10);

    expect(counterTrendGain.applied).toBe(true);
    expect(counterTrendGain.direction).toBe('counter-trend-up');
    expect(Math.abs(counterTrendGain.dampenedDelta)).toBeLessThan(10);
    expectBrakeInvariant(counterTrendGain, 10);
  });

  test('down-move routing responds to Resilience and not Ambition', () => {
    const lowResilience = dampen(-8, 90, 'COMPETITIVE', { resilience: 0, ambition: 50 });
    const highResilience = dampen(-8, 90, 'COMPETITIVE', { resilience: 100, ambition: 50 });
    const highAmbitionOnly = dampen(-8, 90, 'COMPETITIVE', { resilience: 0, ambition: 100 });

    expect(highResilience.dampenStrength).toBeGreaterThan(lowResilience.dampenStrength);
    expect(highAmbitionOnly.dampenStrength).toBe(lowResilience.dampenStrength);
  });

  test('up-move routing responds to Ambition and not Resilience', () => {
    const lowAmbition = dampen(8, 10, 'COMPETITIVE', { ambition: 0, resilience: 50 });
    const highAmbition = dampen(8, 10, 'COMPETITIVE', { ambition: 100, resilience: 50 });
    const highResilienceOnly = dampen(8, 10, 'COMPETITIVE', { ambition: 0, resilience: 100 });

    expect(highAmbition.dampenStrength).toBeGreaterThan(lowAmbition.dampenStrength);
    expect(highResilienceOnly.dampenStrength).toBe(lowAmbition.dampenStrength);
  });

  test('personality multipliers create the specified shield spread and Droopy asymmetry', () => {
    const competitive = dampen(-10, 90, 'COMPETITIVE', { loyalty: 100, resilience: 100 });
    const egotistical = dampen(-10, 90, 'EGOTISTICAL', { loyalty: 100, resilience: 100 });
    const droopyDown = dampen(-10, 90, 'DROOPY', { ambition: 100, resilience: 100 });
    const droopyUp = dampen(10, 10, 'DROOPY', { ambition: 100, resilience: 100 });

    expect(competitive.dampenStrength).toBeGreaterThan(egotistical.dampenStrength);
    expect(Math.abs(competitive.dampenedDelta)).toBeLessThan(Math.abs(egotistical.dampenedDelta));
    expect(droopyDown.dampenStrength).toBeGreaterThan(droopyUp.dampenStrength);
  });

  test('loyalty amplifies counter-trend shielding', () => {
    const lowLoyalty = dampen(-10, 90, 'COMPETITIVE', { loyalty: 0, resilience: 100 });
    const highLoyalty = dampen(-10, 90, 'COMPETITIVE', { loyalty: 100, resilience: 100 });

    expect(highLoyalty.dampenStrength).toBeGreaterThan(lowLoyalty.dampenStrength);
    expect(Math.abs(highLoyalty.dampenedDelta)).toBeLessThan(Math.abs(lowLoyalty.dampenedDelta));
  });

  test('same inputs produce the same output', () => {
    const first = dampen(-7.5, 88, 'RELAXED', { loyalty: 77, resilience: 42, ambition: 11 });
    const second = dampen(-7.5, 88, 'RELAXED', { loyalty: 77, resilience: 42, ambition: 11 });

    expect(second).toEqual(first);
  });
});
