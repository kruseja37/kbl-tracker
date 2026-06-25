import { readFileSync } from 'node:fs';

import { describe, expect, test } from 'vitest';

import {
  RATINGS_DEVELOPMENT_TUNING,
  computeCheckpointRatingDevelopment,
  computeRawRatingDelta,
  normalizePerformanceSignal,
  type CheckpointRatingDevelopmentInput,
  type RatingsDevelopmentTuning,
} from '../ratingsDevelopment';

const neutralModifiers = {
  loyalty: 50,
  ambition: 50,
  resilience: 50,
};

const baseCheckpointInput: CheckpointRatingDevelopmentInput = {
  ratingKey: 'power',
  baseRatingValue: 50,
  performanceSignal: 1,
  playerMorale: 50,
  teamFanMorale: 50,
  personality: 'COMPETITIVE',
  modifiers: neutralModifiers,
};

function withTuning(
  overrides: Partial<RatingsDevelopmentTuning>,
): RatingsDevelopmentTuning {
  return {
    ...RATINGS_DEVELOPMENT_TUNING,
    ...overrides,
  };
}

describe('ratingsDevelopment L8a pure engine', () => {
  test('uses the shape-locked ratings-development defaults', () => {
    expect(RATINGS_DEVELOPMENT_TUNING).toEqual({
      baseDeltaScale: 3,
      performanceSignalScale: 10,
      neutralMorale: 50,
      moraleWeightUp: 0.4,
      moraleWeightDown: 0.4,
      moraleMultiplierMin: 0.5,
      moraleMultiplierMax: 1.5,
      shiftThreshold: 0.75,
      maxAbsDelta: 6,
      trendTiltWeight: 0,
      ageCurveSlopeByBand: {
        '18-21': 0.8,
        '22-24': 0.35,
        '25-31': 0,
        '32-35': -0.35,
        '36+': -0.8,
      },
      ageSteepnessByRatingKey: {
        power: 1,
        contact: 1,
        speed: 1.25,
        fielding: 1.2,
        arm: 1.25,
        velocity: 1.1,
        junk: 1,
        accuracy: 1,
      },
    });
  });

  test('normalizes raw performance symmetrically and clamps to [-1, 1]', () => {
    const scale = RATINGS_DEVELOPMENT_TUNING.performanceSignalScale;

    expect(normalizePerformanceSignal(0)).toBe(0);
    expect(normalizePerformanceSignal(scale)).toBe(1);
    expect(normalizePerformanceSignal(scale * 2)).toBe(1);
    expect(normalizePerformanceSignal(-scale)).toBe(-1);
    expect(normalizePerformanceSignal(-scale * 2)).toBe(-1);
    expect(normalizePerformanceSignal(scale / 2)).toBe(0.5);
    expect(normalizePerformanceSignal(-scale / 2)).toBe(-0.5);
  });

  test('omitted recentSignal preserves the cumulative signal even when trend tilt is configured', () => {
    const input: CheckpointRatingDevelopmentInput = {
      ...baseCheckpointInput,
      performanceSignal: 0.4,
      teamFanMorale: 80,
    };
    const baseline = computeCheckpointRatingDevelopment(input);
    const configuredTilt = computeCheckpointRatingDevelopment(
      input,
      withTuning({ trendTiltWeight: 0.5 }),
    );

    expect(configuredTilt).toEqual(baseline);
  });

  test('trendTiltWeight zero ignores a supplied recentSignal', () => {
    const input: CheckpointRatingDevelopmentInput = {
      ...baseCheckpointInput,
      performanceSignal: -0.4,
      teamFanMorale: 20,
    };
    const baseline = computeCheckpointRatingDevelopment(input);
    const withRecent = computeCheckpointRatingDevelopment({
      ...input,
      recentSignal: 1,
    });

    expect(withRecent).toEqual(baseline);
  });

  test('positive trendTiltWeight blends cumulative and recent signals before raw delta', () => {
    const tuning = withTuning({ trendTiltWeight: 0.25 });
    const cumulativeOnly = computeCheckpointRatingDevelopment(
      {
        ...baseCheckpointInput,
        performanceSignal: -0.2,
        teamFanMorale: 80,
      },
      tuning,
    );
    const blended = computeCheckpointRatingDevelopment(
      {
        ...baseCheckpointInput,
        performanceSignal: -0.2,
        recentSignal: 1,
        teamFanMorale: 80,
      },
      tuning,
    );
    const effectiveSignal = (1 - tuning.trendTiltWeight) * -0.2 + tuning.trendTiltWeight * 1;

    expect(blended.rawDelta).toBeCloseTo(tuning.baseDeltaScale * effectiveSignal, 12);
    expect(blended.rawDelta).toBeGreaterThan(cumulativeOnly.rawDelta);
    expect(blended.dampenedDelta).toBe(blended.rawDelta);
  });

  test('blended signal still respects the [-1, 1] signal clamp and maxAbsDelta', () => {
    const capTuning = withTuning({
      baseDeltaScale: 20,
      maxAbsDelta: 6,
      trendTiltWeight: 0.75,
    });
    const result = computeCheckpointRatingDevelopment(
      {
        ...baseCheckpointInput,
        performanceSignal: 1,
        recentSignal: 5,
        teamFanMorale: 80,
      },
      capTuning,
    );

    expect(result.rawDelta).toBe(20);
    expect(result.dampenedDelta).toBe(6);
    expect(result.proposedRating).toBe(56);
    expect(result.appliedDelta).toBe(6);
  });

  test('computes zero and neutral-morale raw deltas from base scale exactly', () => {
    expect(
      computeRawRatingDelta({ performanceSignal: 0, playerMorale: 100 }),
    ).toBe(0);
    expect(
      computeRawRatingDelta({ performanceSignal: 0.5, playerMorale: 50 }),
    ).toBe(RATINGS_DEVELOPMENT_TUNING.baseDeltaScale * 0.5);
    expect(
      computeRawRatingDelta({ performanceSignal: -0.5, playerMorale: 50 }),
    ).toBe(RATINGS_DEVELOPMENT_TUNING.baseDeltaScale * -0.5);
  });

  test('undefined and prime age bands add exactly zero to checkpoint movement', () => {
    const omitted = computeCheckpointRatingDevelopment({
      ...baseCheckpointInput,
      performanceSignal: 1,
      teamFanMorale: 80,
    });
    const prime = computeCheckpointRatingDevelopment({
      ...baseCheckpointInput,
      ageBand: '25-31',
      performanceSignal: 1,
      teamFanMorale: 80,
    });
    const neutralPrime = computeCheckpointRatingDevelopment({
      ...baseCheckpointInput,
      ageBand: '25-31',
      performanceSignal: 0,
      teamFanMorale: 80,
    });

    expect(prime).toEqual(omitted);
    expect(neutralPrime.rawDelta).toBe(0);
    expect(neutralPrime.dampenedDelta).toBe(0);
    expect(neutralPrime.proposedRating).toBe(50);
  });

  test('age gravity moves young players up and oldest players down at neutral performance', () => {
    const young = computeCheckpointRatingDevelopment({
      ...baseCheckpointInput,
      ageBand: '18-21',
      performanceSignal: 0,
      teamFanMorale: 80,
    });
    const old = computeCheckpointRatingDevelopment({
      ...baseCheckpointInput,
      ageBand: '36+',
      performanceSignal: 0,
      teamFanMorale: 20,
    });

    expect(young.rawDelta).toBe(0.8);
    expect(young.dampenedDelta).toBe(0.8);
    expect(young.proposedRating).toBe(51);
    expect(young.shouldShift).toBe(true);
    expect(young.direction).toBe('up');
    expect(old.rawDelta).toBe(-0.8);
    expect(old.dampenedDelta).toBe(-0.8);
    expect(old.proposedRating).toBe(49);
    expect(old.shouldShift).toBe(true);
    expect(old.direction).toBe('down');
  });

  test('speed fielding and arm use steeper age multipliers than power and contact', () => {
    const power = computeCheckpointRatingDevelopment({
      ...baseCheckpointInput,
      ratingKey: 'power',
      ageBand: '36+',
      performanceSignal: 0,
      teamFanMorale: 20,
    });
    const contact = computeCheckpointRatingDevelopment({
      ...baseCheckpointInput,
      ratingKey: 'contact',
      ageBand: '36+',
      performanceSignal: 0,
      teamFanMorale: 20,
    });
    const speed = computeCheckpointRatingDevelopment({
      ...baseCheckpointInput,
      ratingKey: 'speed',
      ageBand: '36+',
      performanceSignal: 0,
      teamFanMorale: 20,
    });
    const fielding = computeCheckpointRatingDevelopment({
      ...baseCheckpointInput,
      ratingKey: 'fielding',
      ageBand: '36+',
      performanceSignal: 0,
      teamFanMorale: 20,
    });
    const arm = computeCheckpointRatingDevelopment({
      ...baseCheckpointInput,
      ratingKey: 'arm',
      ageBand: '36+',
      performanceSignal: 0,
      teamFanMorale: 20,
    });

    expect(Math.abs(power.rawDelta)).toBe(Math.abs(contact.rawDelta));
    expect(Math.abs(speed.rawDelta)).toBeGreaterThan(Math.abs(power.rawDelta));
    expect(Math.abs(fielding.rawDelta)).toBeGreaterThan(Math.abs(power.rawDelta));
    expect(Math.abs(arm.rawDelta)).toBeGreaterThan(Math.abs(power.rawDelta));
  });

  test('player morale amplifies gains and shrinks drops when high', () => {
    const neutralGain = computeRawRatingDelta({
      performanceSignal: 1,
      playerMorale: 50,
    });
    const highMoraleGain = computeRawRatingDelta({
      performanceSignal: 1,
      playerMorale: 100,
    });
    const neutralDrop = computeRawRatingDelta({
      performanceSignal: -1,
      playerMorale: 50,
    });
    const highMoraleDrop = computeRawRatingDelta({
      performanceSignal: -1,
      playerMorale: 100,
    });

    expect(highMoraleGain).toBeGreaterThan(neutralGain);
    expect(Math.abs(highMoraleDrop)).toBeLessThan(Math.abs(neutralDrop));
  });

  test('player morale shrinks gains and grows drops when low', () => {
    const neutralGain = computeRawRatingDelta({
      performanceSignal: 1,
      playerMorale: 50,
    });
    const lowMoraleGain = computeRawRatingDelta({
      performanceSignal: 1,
      playerMorale: 0,
    });
    const neutralDrop = computeRawRatingDelta({
      performanceSignal: -1,
      playerMorale: 50,
    });
    const lowMoraleDrop = computeRawRatingDelta({
      performanceSignal: -1,
      playerMorale: 0,
    });

    expect(lowMoraleGain).toBeLessThan(neutralGain);
    expect(Math.abs(lowMoraleDrop)).toBeGreaterThan(Math.abs(neutralDrop));
  });

  test('raw morale multiplier clamps to configured min/max and never flips sign', () => {
    const clampTuning = withTuning({
      moraleWeightUp: 2,
      moraleWeightDown: 2,
    });
    const highMoraleGain = computeRawRatingDelta(
      { performanceSignal: 1, playerMorale: 100 },
      clampTuning,
    );
    const lowMoraleGain = computeRawRatingDelta(
      { performanceSignal: 1, playerMorale: 0 },
      clampTuning,
    );
    const highMoraleDrop = computeRawRatingDelta(
      { performanceSignal: -1, playerMorale: 100 },
      clampTuning,
    );
    const lowMoraleDrop = computeRawRatingDelta(
      { performanceSignal: -1, playerMorale: 0 },
      clampTuning,
    );

    expect(highMoraleGain).toBe(
      clampTuning.baseDeltaScale * clampTuning.moraleMultiplierMax,
    );
    expect(lowMoraleGain).toBe(
      clampTuning.baseDeltaScale * clampTuning.moraleMultiplierMin,
    );
    expect(highMoraleDrop).toBe(
      -clampTuning.baseDeltaScale * clampTuning.moraleMultiplierMin,
    );
    expect(lowMoraleDrop).toBe(
      -clampTuning.baseDeltaScale * clampTuning.moraleMultiplierMax,
    );
    expect(Math.sign(highMoraleGain)).toBe(1);
    expect(Math.sign(lowMoraleGain)).toBe(1);
    expect(Math.sign(highMoraleDrop)).toBe(-1);
    expect(Math.sign(lowMoraleDrop)).toBe(-1);
  });

  test('hot team positive raw is with-trend and passes through the dampener unchanged', () => {
    const result = computeCheckpointRatingDevelopment({
      ...baseCheckpointInput,
      teamFanMorale: 80,
      performanceSignal: 1,
    });

    expect(result.rawDelta).toBe(3);
    expect(result.dampenedDelta).toBe(result.rawDelta);
    expect(result.dampener.applied).toBe(false);
    expect(result.dampener.direction).toBe('with-trend');
    expect(result.proposedRating).toBe(53);
    expect(result.appliedDelta).toBe(3);
    expect(result.shouldShift).toBe(true);
    expect(result.direction).toBe('up');
  });

  test('hot team negative raw is counter-trend-down and higher resilience creates more brake', () => {
    const lowResilience = computeCheckpointRatingDevelopment({
      ...baseCheckpointInput,
      performanceSignal: -1,
      teamFanMorale: 80,
      modifiers: { ...neutralModifiers, resilience: 0 },
    });
    const highResilience = computeCheckpointRatingDevelopment({
      ...baseCheckpointInput,
      performanceSignal: -1,
      teamFanMorale: 80,
      modifiers: { ...neutralModifiers, resilience: 100 },
    });

    expect(lowResilience.rawDelta).toBe(-3);
    expect(lowResilience.dampener.applied).toBe(true);
    expect(lowResilience.dampener.direction).toBe('counter-trend-down');
    expect(Math.abs(lowResilience.dampenedDelta)).toBeLessThan(
      Math.abs(lowResilience.rawDelta),
    );
    expect(highResilience.dampener.dampenStrength).toBeGreaterThan(
      lowResilience.dampener.dampenStrength,
    );
    expect(Math.abs(highResilience.dampenedDelta)).toBeLessThan(
      Math.abs(lowResilience.dampenedDelta),
    );
  });

  test('cold team positive raw is counter-trend-up and is braked', () => {
    const result = computeCheckpointRatingDevelopment({
      ...baseCheckpointInput,
      performanceSignal: 1,
      teamFanMorale: 20,
    });

    expect(result.rawDelta).toBe(3);
    expect(result.dampener.applied).toBe(true);
    expect(result.dampener.direction).toBe('counter-trend-up');
    expect(Math.abs(result.dampenedDelta)).toBeLessThan(Math.abs(result.rawDelta));
    expect(result.dampenedDelta).toBeGreaterThan(0);
  });

  test('rating clamps at 99 and suppresses shifts when the integer rating cannot move', () => {
    const result = computeCheckpointRatingDevelopment({
      ...baseCheckpointInput,
      baseRatingValue: 99,
      performanceSignal: 1,
      teamFanMorale: 80,
    });

    expect(result.proposedRating).toBe(99);
    expect(result.appliedDelta).toBe(0);
    expect(result.shouldShift).toBe(false);
    expect(result.direction).toBe('none');
  });

  test('rating clamps at 0 and suppresses shifts when the integer rating cannot move', () => {
    const result = computeCheckpointRatingDevelopment({
      ...baseCheckpointInput,
      baseRatingValue: 0,
      performanceSignal: -1,
      teamFanMorale: 20,
    });

    expect(result.proposedRating).toBe(0);
    expect(result.appliedDelta).toBe(0);
    expect(result.shouldShift).toBe(false);
    expect(result.direction).toBe('none');
  });

  test('shiftThreshold gates deterministic rating shifts by dampened magnitude', () => {
    const thresholdTuning = withTuning({
      baseDeltaScale: 1,
      shiftThreshold: 0.75,
    });
    const justBelow = computeCheckpointRatingDevelopment(
      {
        ...baseCheckpointInput,
        performanceSignal: 0.74,
        teamFanMorale: 80,
      },
      thresholdTuning,
    );
    const justAbove = computeCheckpointRatingDevelopment(
      {
        ...baseCheckpointInput,
        performanceSignal: 0.76,
        teamFanMorale: 80,
      },
      thresholdTuning,
    );

    expect(justBelow.dampenedDelta).toBe(0.74);
    expect(justBelow.proposedRating).toBe(51);
    expect(justBelow.appliedDelta).toBe(1);
    expect(justBelow.shouldShift).toBe(false);
    expect(justAbove.dampenedDelta).toBe(0.76);
    expect(justAbove.proposedRating).toBe(51);
    expect(justAbove.appliedDelta).toBe(1);
    expect(justAbove.shouldShift).toBe(true);
  });

  test('zero confidence suppresses even a strong rating-development signal', () => {
    const result = computeCheckpointRatingDevelopment({
      ...baseCheckpointInput,
      confidence: 0,
      performanceSignal: 1,
      teamFanMorale: 80,
    });

    expect(result.rawDelta).toBe(3);
    expect(result.dampenedDelta).toBe(0);
    expect(result.proposedRating).toBe(50);
    expect(result.appliedDelta).toBe(0);
    expect(result.shouldShift).toBe(false);
    expect(result.direction).toBe('none');
  });

  test('half confidence halves the neutral dampened delta exactly', () => {
    const fullConfidence = computeCheckpointRatingDevelopment({
      ...baseCheckpointInput,
      confidence: 1,
      performanceSignal: 1,
      teamFanMorale: 80,
    });
    const halfConfidence = computeCheckpointRatingDevelopment({
      ...baseCheckpointInput,
      confidence: 0.5,
      performanceSignal: 1,
      teamFanMorale: 80,
    });

    expect(fullConfidence.dampener.applied).toBe(false);
    expect(halfConfidence.dampener.applied).toBe(false);
    expect(halfConfidence.dampenedDelta).toBe(fullConfidence.dampenedDelta / 2);
  });

  test('maxAbsDelta caps a huge raw signal before the dampener', () => {
    const capTuning = withTuning({
      baseDeltaScale: 20,
      maxAbsDelta: 6,
    });
    const result = computeCheckpointRatingDevelopment(
      {
        ...baseCheckpointInput,
        performanceSignal: 1,
        teamFanMorale: 80,
      },
      capTuning,
    );

    expect(result.rawDelta).toBe(20);
    expect(result.dampenedDelta).toBe(6);
    expect(result.proposedRating).toBe(56);
    expect(result.appliedDelta).toBe(result.proposedRating - 50);
  });

  test('age gravity shares cap clamp and dampener governors', () => {
    const capTuning = withTuning({
      baseDeltaScale: 0,
      maxAbsDelta: 6,
      ageCurveSlopeByBand: {
        ...RATINGS_DEVELOPMENT_TUNING.ageCurveSlopeByBand,
        '18-21': 10,
      },
    });
    const capped = computeCheckpointRatingDevelopment(
      {
        ...baseCheckpointInput,
        ageBand: '18-21',
        performanceSignal: 0,
        teamFanMorale: 80,
      },
      capTuning,
    );
    const clamped = computeCheckpointRatingDevelopment({
      ...baseCheckpointInput,
      ageBand: '18-21',
      baseRatingValue: 99,
      performanceSignal: 0,
      teamFanMorale: 80,
    });
    const dampened = computeCheckpointRatingDevelopment({
      ...baseCheckpointInput,
      ageBand: '18-21',
      performanceSignal: 0,
      teamFanMorale: 20,
    });

    expect(capped.rawDelta).toBe(10);
    expect(capped.dampenedDelta).toBe(6);
    expect(capped.proposedRating).toBe(56);
    expect(clamped.rawDelta).toBe(0.8);
    expect(clamped.proposedRating).toBe(99);
    expect(clamped.shouldShift).toBe(false);
    expect(dampened.rawDelta).toBe(0.8);
    expect(dampened.dampener.applied).toBe(true);
    expect(dampened.dampener.direction).toBe('counter-trend-up');
    expect(dampened.dampenedDelta).toBeLessThan(dampened.rawDelta);
  });

  test('direction and appliedDelta reflect the integer proposed rating', () => {
    const up = computeCheckpointRatingDevelopment({
      ...baseCheckpointInput,
      performanceSignal: 1,
      teamFanMorale: 80,
    });
    const down = computeCheckpointRatingDevelopment({
      ...baseCheckpointInput,
      performanceSignal: -1,
      teamFanMorale: 20,
    });
    const none = computeCheckpointRatingDevelopment({
      ...baseCheckpointInput,
      baseRatingValue: 50,
      performanceSignal: 0.01,
      teamFanMorale: 80,
    });

    expect(up.direction).toBe('up');
    expect(up.appliedDelta).toBe(up.proposedRating - 50);
    expect(Number.isInteger(up.appliedDelta)).toBe(true);
    expect(down.direction).toBe('down');
    expect(down.appliedDelta).toBe(down.proposedRating - 50);
    expect(Number.isInteger(down.appliedDelta)).toBe(true);
    expect(none.direction).toBe('none');
    expect(none.appliedDelta).toBe(0);
    expect(Number.isInteger(none.appliedDelta)).toBe(true);
  });

  test('same input produces identical output', () => {
    const input: CheckpointRatingDevelopmentInput = {
      ...baseCheckpointInput,
      performanceSignal: -0.75,
      playerMorale: 82,
      teamFanMorale: 91,
      personality: 'RELAXED',
      modifiers: { loyalty: 77, ambition: 22, resilience: 91 },
    };

    const first = computeCheckpointRatingDevelopment(input);
    const second = computeCheckpointRatingDevelopment(input);

    expect(second).toEqual(first);
  });

  test('does not mutate checkpoint input or modifiers', () => {
    const input: CheckpointRatingDevelopmentInput = {
      ...baseCheckpointInput,
      performanceSignal: -0.5,
      playerMorale: 12,
      teamFanMorale: 88,
      modifiers: { loyalty: 1, ambition: 2, resilience: 3 },
    };
    const original = JSON.parse(JSON.stringify(input));

    computeCheckpointRatingDevelopment(input);

    expect(input).toEqual(original);
  });

  test('engine source stays pure and build-dark', () => {
    const source = readFileSync('src/engines/ratingsDevelopment.ts', 'utf8');

    expect(source).not.toMatch(/Math\.random/);
    expect(source).not.toMatch(/Date\.now/);
    expect(source).not.toMatch(/new\s+Date/);
    expect(source).not.toMatch(/node:fs/);
    expect(source).not.toMatch(/indexedDB/);
  });
});
