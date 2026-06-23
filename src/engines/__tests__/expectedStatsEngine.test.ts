import { describe, expect, test } from 'vitest';

import {
  expectedAndSignal,
  type ExpectedStatsInput,
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
  actualByCat: { contactAverage: 0.300 },
  sampleSizeByCat: { contactAverage: 100 },
  poolMeanByCat: { contactAverage: 0.300 },
  poolSdByCat: { contactAverage: 0.050 },
  poolMeanRating: { contact: 50 },
  peerPoolSize: 6,
  ...overrides,
});

describe('expectedStatsEngine RA-1 pure expected-stat signal', () => {
  test('anchor identity returns r=0 when actual equals expected', () => {
    const result = expectedAndSignal(baseInput(), MLB_CONFIG);

    expect(result.expectedByCat.contactAverage).toBeCloseTo(0.300, 10);
    expect(result.rByCat.contactAverage).toBeCloseTo(0, 10);
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
        actualByCat: { contactAverage: 0.400 },
        poolSdByCat: { contactAverage: 0.020 },
      }),
      MLB_CONFIG,
    );
    const low = expectedAndSignal(
      baseInput({
        actualByCat: { contactAverage: 0.100 },
        poolSdByCat: { contactAverage: 0.020 },
      }),
      MLB_CONFIG,
    );

    expect(high.rByCat.contactAverage).toBe(1);
    expect(low.rByCat.contactAverage).toBe(-1);
  });

  test('min-sample gate emits no signal below the season-scaled floor', () => {
    const result = expectedAndSignal(
      baseInput({
        sampleSizeByCat: { contactAverage: 49 },
      }),
      MLB_CONFIG,
    );

    expect(result.expectedByCat.contactAverage).toBeCloseTo(0.300, 10);
    expect(result.rByCat.contactAverage).toBeNull();
  });

  test('uses SMB4_BASELINES as the default pool mean path', () => {
    const result = expectedAndSignal(
      baseInput({
        actualByCat: { contactAverage: SMB4_BASELINES.leagueAVG },
        poolMeanByCat: undefined,
        poolSdByCat: { contactAverage: 0.020 },
      }),
      MLB_CONFIG,
    );

    expect(result.expectedByCat.contactAverage).toBeCloseTo(SMB4_BASELINES.leagueAVG, 10);
    expect(result.rByCat.contactAverage).toBeCloseTo(0, 10);
  });

  test('pitchers emit no arm expected value or signal', () => {
    const result = expectedAndSignal(
      baseInput({
        playerRole: 'pitcher',
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

    expect(result.expectedByCat.armThrowingRate).toBeNull();
    expect(result.rByCat.armThrowingRate).toBeNull();
  });
});
