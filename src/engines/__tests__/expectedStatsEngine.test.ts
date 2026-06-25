import { describe, expect, test } from 'vitest';

import {
  EXPECTED_STATS_TUNING,
  expectedAndSignal,
  type ExpectedStatsInput,
  type ExpectedStatsTuning,
} from '../expectedStatsEngine';
import {
  MLB_BASELINE_GAMES,
  MLB_BASELINE_INNINGS,
  type AdaptiveStandardsConfig,
} from '../../utils/franchiseAdaptiveStandards';
import { SMB4_BASELINES } from '../../types/war';

const MLB_CONFIG: AdaptiveStandardsConfig = {
  gamesPerSeason: MLB_BASELINE_GAMES,
  inningsPerGame: MLB_BASELINE_INNINGS,
  baselineGames: MLB_BASELINE_GAMES,
  baselineInnings: MLB_BASELINE_INNINGS,
  source: 'explicit',
};

const baseInput = (overrides: Partial<ExpectedStatsInput> = {}): ExpectedStatsInput => ({
  playerRole: 'hitter',
  ageBand: '25-31',
  curveBlock: 'SS',
  ratings: { contact: 50 },
  actualByCat: { contactAvoidStrikeoutRate: 0.300 },
  sampleSizeByCat: { contactAvoidStrikeoutRate: 100 },
  poolMeanByCat: { contactAvoidStrikeoutRate: 0.300 },
  poolSdByCat: { contactAvoidStrikeoutRate: 0.050 },
  poolMeanRating: { contact: 50 },
  peerPoolSize: 6,
  ...overrides,
});

const NEUTRAL_AGE_TUNING: ExpectedStatsTuning = {
  ...EXPECTED_STATS_TUNING,
  ageBandFactorByBand: {
    '18-21': 1.0,
    '22-24': 1.0,
    '25-31': 1.0,
    '32-35': 1.0,
    '36+': 1.0,
  },
};

function expectFiniteNumber(value: number | null | undefined): number {
  expect(typeof value).toBe('number');
  expect(Number.isFinite(value)).toBe(true);
  return value as number;
}

describe('expectedStatsEngine RA-1 pure expected-stat signal', () => {
  test('anchor identity returns r=0 when actual equals expected', () => {
    const result = expectedAndSignal(baseInput(), MLB_CONFIG);

    expect(result.expectedByCat.contactAvoidStrikeoutRate).toBeCloseTo(0.300, 10);
    expect(result.rByCat.contactAvoidStrikeoutRate).toBeCloseTo(0, 10);
  });

  test('prime age band is neutral against the all-1.0 baseline tuning', () => {
    const prime = expectedAndSignal(baseInput({ ageBand: '25-31' }), MLB_CONFIG);
    const baseline = expectedAndSignal(
      baseInput({ ageBand: '25-31' }),
      MLB_CONFIG,
      NEUTRAL_AGE_TUNING,
    );

    expect(prime.expectedByCat.contactAvoidStrikeoutRate).toBe(
      baseline.expectedByCat.contactAvoidStrikeoutRate,
    );
    expect(prime.rByCat.contactAvoidStrikeoutRate).toBe(
      baseline.rByCat.contactAvoidStrikeoutRate,
    );
  });

  test('young and old age bands lower the expected bar and raise r for the same actual', () => {
    const prime = expectedAndSignal(baseInput({ ageBand: '25-31' }), MLB_CONFIG);
    const young = expectedAndSignal(baseInput({ ageBand: '18-21' }), MLB_CONFIG);
    const old = expectedAndSignal(baseInput({ ageBand: '36+' }), MLB_CONFIG);
    const primeExpected = expectFiniteNumber(prime.expectedByCat.contactAvoidStrikeoutRate);
    const youngExpected = expectFiniteNumber(young.expectedByCat.contactAvoidStrikeoutRate);
    const oldExpected = expectFiniteNumber(old.expectedByCat.contactAvoidStrikeoutRate);
    const primeR = expectFiniteNumber(prime.rByCat.contactAvoidStrikeoutRate);
    const youngR = expectFiniteNumber(young.rByCat.contactAvoidStrikeoutRate);
    const oldR = expectFiniteNumber(old.rByCat.contactAvoidStrikeoutRate);

    expect(youngExpected).toBeLessThan(primeExpected);
    expect(oldExpected).toBeLessThan(primeExpected);
    expect(youngR).toBeGreaterThan(primeR);
    expect(oldR).toBeGreaterThan(primeR);
  });

  test('equal-factor tail age bands apply the same bar shift', () => {
    const young = expectedAndSignal(baseInput({ ageBand: '18-21' }), MLB_CONFIG);
    const old = expectedAndSignal(baseInput({ ageBand: '36+' }), MLB_CONFIG);

    expect(expectFiniteNumber(young.expectedByCat.contactAvoidStrikeoutRate)).toBe(
      expectFiniteNumber(old.expectedByCat.contactAvoidStrikeoutRate),
    );
    expect(expectFiniteNumber(young.rByCat.contactAvoidStrikeoutRate)).toBe(
      expectFiniteNumber(old.rByCat.contactAvoidStrikeoutRate),
    );
  });

  test('curve-ratio is monotonic: a higher rating raises its own expectation', () => {
    const low = expectedAndSignal(
      baseInput({
        ratings: { power: 40 },
        actualByCat: { powerHomeRunRate: 0.050 },
        sampleSizeByCat: { powerHomeRunRate: 100 },
        poolMeanByCat: { powerHomeRunRate: 0.050 },
        poolSdByCat: { powerHomeRunRate: 0.010 },
        poolMeanRating: { power: 50 },
      }),
      MLB_CONFIG,
    );
    const high = expectedAndSignal(
      baseInput({
        ratings: { power: 80 },
        actualByCat: { powerHomeRunRate: 0.050 },
        sampleSizeByCat: { powerHomeRunRate: 100 },
        poolMeanByCat: { powerHomeRunRate: 0.050 },
        poolSdByCat: { powerHomeRunRate: 0.010 },
        poolMeanRating: { power: 50 },
      }),
      MLB_CONFIG,
    );

    expect(high.expectedByCat.powerHomeRunRate).toBeGreaterThan(
      low.expectedByCat.powerHomeRunRate ?? 0,
    );
  });

  test('peer-SD z-score clamps at +1 and -1', () => {
    const high = expectedAndSignal(
      baseInput({
        actualByCat: { contactAvoidStrikeoutRate: 0.400 },
        poolSdByCat: { contactAvoidStrikeoutRate: 0.020 },
      }),
      MLB_CONFIG,
    );
    const low = expectedAndSignal(
      baseInput({
        actualByCat: { contactAvoidStrikeoutRate: 0.100 },
        poolSdByCat: { contactAvoidStrikeoutRate: 0.020 },
      }),
      MLB_CONFIG,
    );

    expect(high.rByCat.contactAvoidStrikeoutRate).toBe(1);
    expect(low.rByCat.contactAvoidStrikeoutRate).toBe(-1);
  });

  test('min-sample gate emits no signal below the season-scaled floor', () => {
    const result = expectedAndSignal(
      baseInput({
        sampleSizeByCat: { contactAvoidStrikeoutRate: 49 },
      }),
      MLB_CONFIG,
    );

    expect(result.expectedByCat.contactAvoidStrikeoutRate).toBeCloseTo(0.300, 10);
    expect(result.rByCat.contactAvoidStrikeoutRate).toBeNull();
  });

  test('uses SMB4_BASELINES as the default pool mean path', () => {
    const contactBaseline = 1 - SMB4_BASELINES.kPerPA;
    const result = expectedAndSignal(
      baseInput({
        actualByCat: { contactAvoidStrikeoutRate: contactBaseline },
        poolMeanByCat: undefined,
        poolSdByCat: { contactAvoidStrikeoutRate: 0.020 },
      }),
      MLB_CONFIG,
    );

    expect(result.expectedByCat.contactAvoidStrikeoutRate).toBeCloseTo(contactBaseline, 10);
    expect(result.rByCat.contactAvoidStrikeoutRate).toBeCloseTo(0, 10);
  });

  test('pitchers emit no arm expected value or signal regardless of age band', () => {
    const young = expectedAndSignal(
      baseInput({
        playerRole: 'pitcher',
        ageBand: '18-21',
        curveBlock: 'SP',
        ratings: { arm: 70 },
        actualByCat: { armThrowingRate: 0.100 },
        sampleSizeByCat: { armThrowingRate: 100 },
        poolMeanByCat: { armThrowingRate: 0.050 },
        poolSdByCat: { armThrowingRate: 0.010 },
        poolMeanRating: { arm: 50 },
      }),
      MLB_CONFIG,
    );
    const old = expectedAndSignal(
      baseInput({
        playerRole: 'pitcher',
        ageBand: '36+',
        curveBlock: 'SP',
        ratings: { arm: 70 },
        actualByCat: { armThrowingRate: 0.100 },
        sampleSizeByCat: { armThrowingRate: 100 },
        poolMeanByCat: { armThrowingRate: 0.050 },
        poolSdByCat: { armThrowingRate: 0.010 },
        poolMeanRating: { arm: 50 },
      }),
      MLB_CONFIG,
    );

    expect(young.expectedByCat.armThrowingRate).toBeNull();
    expect(young.rByCat.armThrowingRate).toBeNull();
    expect(old.expectedByCat.armThrowingRate).toBeNull();
    expect(old.rByCat.armThrowingRate).toBeNull();
  });
});
