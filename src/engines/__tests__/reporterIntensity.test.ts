import { describe, expect, test } from 'vitest';

import {
  REPORTER_INTENSITY_TUNING,
  computeReporterHeat,
  type ReporterHeatResult,
} from '../reporterIntensity';
import type { NarrativeIntensity } from '../../types/reporterPreferences';

const VALID_INTENSITIES: NarrativeIntensity[] = ['low', 'medium', 'high'];

function moraleAtHeat(heat: number): number {
  return REPORTER_INTENSITY_TUNING.neutralMorale
    * (1 - heat);
}

function expectValidResult(result: ReporterHeatResult) {
  expect(result.heat).toBeGreaterThanOrEqual(0);
  expect(result.heat).toBeLessThanOrEqual(1);
  expect(VALID_INTENSITIES).toContain(result.intensity);
  expect(result.components.pressHeat).toBe(result.heat);
  expect(result.components.band).toBe(result.intensity);
}

describe('reporterIntensity L5d pure engine', () => {
  test('calm press at high morale', () => {
    const result = computeReporterHeat(85);

    expect(result.heat).toBe(0);
    expect(result.intensity).toBe('low');
    expect(result.toneDirective).toBe('press_calm');
    expect(result.components).toEqual({
      teamFanMorale: 85,
      pressHeat: 0,
      band: 'low',
    });
  });

  test('neutral and above-neutral morale stay calm', () => {
    const neutral = computeReporterHeat(50);
    const aboveNeutral = computeReporterHeat(60);

    expect(neutral.heat).toBe(0);
    expect(neutral.intensity).toBe('low');
    expect(aboveNeutral.heat).toBe(0);
    expect(aboveNeutral.intensity).toBe('low');
  });

  test('heat rises as fans sour', () => {
    const sour = computeReporterHeat(30);
    const hostile = computeReporterHeat(5);

    expect(sour.intensity).toBe('medium');
    expect(sour.heat).toBeGreaterThan(REPORTER_INTENSITY_TUNING.lowHeatBand);
    expect(hostile.heat).toBeGreaterThan(REPORTER_INTENSITY_TUNING.highHeatBand);
    expect(hostile.intensity).toBe('high');
    expect(hostile.toneDirective).toBe('press_scorching');
  });

  test('heat is monotonic as morale falls', () => {
    let previousHeat = computeReporterHeat(99).heat;

    for (let morale = 98; morale >= 0; morale -= 1) {
      const nextHeat = computeReporterHeat(morale).heat;

      expect(nextHeat).toBeGreaterThanOrEqual(previousHeat);
      previousHeat = nextHeat;
    }
  });

  test('band boundaries transition at tuned thresholds', () => {
    const lowBoundaryMorale = moraleAtHeat(REPORTER_INTENSITY_TUNING.lowHeatBand);
    const highBoundaryMorale = moraleAtHeat(REPORTER_INTENSITY_TUNING.highHeatBand);

    expect(computeReporterHeat(lowBoundaryMorale + 0.01).intensity).toBe('low');
    expect(computeReporterHeat(lowBoundaryMorale).heat).toBe(
      REPORTER_INTENSITY_TUNING.lowHeatBand,
    );
    expect(computeReporterHeat(lowBoundaryMorale).intensity).toBe('medium');

    expect(computeReporterHeat(highBoundaryMorale + 0.01).intensity).toBe('medium');
    expect(computeReporterHeat(highBoundaryMorale).heat).toBe(
      REPORTER_INTENSITY_TUNING.highHeatBand,
    );
    expect(computeReporterHeat(highBoundaryMorale).intensity).toBe('high');
  });

  test('same inputs produce the same output', () => {
    const first = computeReporterHeat(12);
    const second = computeReporterHeat(12);

    expect(second).toEqual(first);
  });

  test('clamps and returns a valid intensity at morale extremes', () => {
    const bottom = computeReporterHeat(0);
    const top = computeReporterHeat(99);

    expectValidResult(bottom);
    expectValidResult(top);
    expect(bottom.heat).toBe(1);
    expect(top.heat).toBe(0);
  });
});
