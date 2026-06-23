import { describe, expect, test } from 'vitest';

import {
  DESIGNATION_FAN_MORALE_TUNING,
  applyDesignationSwingTilt,
  computeDesignationSteadyFanSentiment,
  computeFameVolume,
  computeDesignationSwingTilt,
  summarizeDesignationSteadyFanSentiment,
  type DesignationFanMoraleTuning,
} from '../designationFanMorale';
import { FAME_TUNING } from '../fameModel';
import type { FranchiseDesignationType } from '../../utils/franchiseDesignations';

const STORE_BACKED_DESIGNATION_TYPES: FranchiseDesignationType[] = [
  'TEAM_MVP',
  'ACE',
  'FAN_FAVORITE',
  'ALBATROSS',
];

function overrideFanFavoriteWarmth(sentiment: number): DesignationFanMoraleTuning {
  return {
    ...DESIGNATION_FAN_MORALE_TUNING,
    steadySentimentByType: {
      ...DESIGNATION_FAN_MORALE_TUNING.steadySentimentByType,
      FAN_FAVORITE: sentiment,
    },
  };
}

function overrideFanFavoriteUpTilt(tilt: number): DesignationFanMoraleTuning {
  return {
    ...DESIGNATION_FAN_MORALE_TUNING,
    swingTiltByType: {
      ...DESIGNATION_FAN_MORALE_TUNING.swingTiltByType,
      FAN_FAVORITE: {
        ...DESIGNATION_FAN_MORALE_TUNING.swingTiltByType.FAN_FAVORITE,
        up: tilt,
      },
    },
  };
}

describe('designationFanMorale L7c pure engine', () => {
  test('Channel B returns Fan Favorite ongoing warmth', () => {
    const result = computeDesignationSteadyFanSentiment('FAN_FAVORITE');

    expect(result).toEqual({
      type: 'FAN_FAVORITE',
      sentiment: 0.5,
      sign: 'positive',
      reason: 'designation_fan_morale.fan_favorite_warmth',
    });
  });

  test('Channel B double-count guard defers Albatross irritation to flashpoint decay', () => {
    const result = computeDesignationSteadyFanSentiment('ALBATROSS');

    expect(result).toEqual({
      type: 'ALBATROSS',
      sentiment: 0,
      sign: 'neutral',
      reason: 'designation_fan_morale.albatross_irritation_via_flashpoint',
    });
  });

  test('Channel B keeps merit designations neutral', () => {
    const teamMvp = computeDesignationSteadyFanSentiment('TEAM_MVP');
    const ace = computeDesignationSteadyFanSentiment('ACE');

    expect(teamMvp).toMatchObject({
      sentiment: 0,
      sign: 'neutral',
      reason: 'designation_fan_morale.merit_neutral',
    });
    expect(ace).toMatchObject({
      sentiment: 0,
      sign: 'neutral',
      reason: 'designation_fan_morale.merit_neutral',
    });
  });

  test('both tuning maps cover exactly the four store-backed designation types', () => {
    const steadyTypes = Object.keys(
      DESIGNATION_FAN_MORALE_TUNING.steadySentimentByType,
    ).sort();
    const tiltTypes = Object.keys(DESIGNATION_FAN_MORALE_TUNING.swingTiltByType).sort();

    expect(steadyTypes).toEqual([...STORE_BACKED_DESIGNATION_TYPES].sort());
    expect(tiltTypes).toEqual([...STORE_BACKED_DESIGNATION_TYPES].sort());
    expect(steadyTypes).not.toContain('CAPTAIN');
    expect(steadyTypes).not.toContain('FAN_HOPEFUL');
    expect(tiltTypes).not.toContain('CAPTAIN');
    expect(tiltTypes).not.toContain('FAN_HOPEFUL');

    for (const type of STORE_BACKED_DESIGNATION_TYPES) {
      expect(Number.isFinite(
        DESIGNATION_FAN_MORALE_TUNING.steadySentimentByType[type],
      )).toBe(true);
      expect(Number.isFinite(
        DESIGNATION_FAN_MORALE_TUNING.swingTiltByType[type].up,
      )).toBe(true);
      expect(Number.isFinite(
        DESIGNATION_FAN_MORALE_TUNING.swingTiltByType[type].down,
      )).toBe(true);
    }
  });

  test('summarizes single, mixed, and empty designation lists', () => {
    expect(summarizeDesignationSteadyFanSentiment(['FAN_FAVORITE'])).toEqual({
      totalSentiment: 0.5,
      perType: [{ type: 'FAN_FAVORITE', sentiment: 0.5 }],
    });

    expect(summarizeDesignationSteadyFanSentiment(['FAN_FAVORITE', 'ALBATROSS'])).toEqual({
      totalSentiment: 0.5,
      perType: [
        { type: 'FAN_FAVORITE', sentiment: 0.5 },
        { type: 'ALBATROSS', sentiment: 0 },
      ],
    });

    expect(summarizeDesignationSteadyFanSentiment([])).toEqual({
      totalSentiment: 0,
      perType: [],
    });
  });

  test('Channel A applies asymmetric Fan Favorite and Albatross swing tilts', () => {
    const fanFavoriteUp = computeDesignationSwingTilt('FAN_FAVORITE', 'up');
    const fanFavoriteDown = computeDesignationSwingTilt('FAN_FAVORITE', 'down');
    const albatrossUp = computeDesignationSwingTilt('ALBATROSS', 'up');
    const albatrossDown = computeDesignationSwingTilt('ALBATROSS', 'down');

    expect(fanFavoriteUp.tilt).toBeGreaterThan(1);
    expect(fanFavoriteUp.reason).toBe('designation_fan_morale.swing_amplified');
    expect(fanFavoriteDown.tilt).toBe(1);
    expect(fanFavoriteDown.reason).toBe('designation_fan_morale.swing_neutral');

    expect(albatrossDown.tilt).toBeGreaterThan(1);
    expect(albatrossDown.reason).toBe('designation_fan_morale.swing_amplified');
    expect(albatrossUp.tilt).toBe(1);
    expect(albatrossUp.reason).toBe('designation_fan_morale.swing_neutral');
  });

  test('Channel A leaves Team MVP and Ace swing tilts neutral', () => {
    for (const type of ['TEAM_MVP', 'ACE'] as const) {
      expect(computeDesignationSwingTilt(type, 'up')).toMatchObject({
        type,
        swingDirection: 'up',
        tilt: 1,
        reason: 'designation_fan_morale.swing_neutral',
      });
      expect(computeDesignationSwingTilt(type, 'down')).toMatchObject({
        type,
        swingDirection: 'down',
        tilt: 1,
        reason: 'designation_fan_morale.swing_neutral',
      });
    }
  });

  test('applyDesignationSwingTilt is sign-preserving and direction-aware', () => {
    const fanFavoritePositive = applyDesignationSwingTilt('FAN_FAVORITE', 2);
    const albatrossNegative = applyDesignationSwingTilt('ALBATROSS', -2);
    const fanFavoriteNegative = applyDesignationSwingTilt('FAN_FAVORITE', -2);

    expect(fanFavoritePositive).toBeGreaterThan(2);
    expect(Math.sign(fanFavoritePositive)).toBe(1);
    expect(albatrossNegative).toBeLessThan(-2);
    expect(Math.sign(albatrossNegative)).toBe(-1);
    expect(fanFavoriteNegative).toBe(-2);
    expect(Math.sign(fanFavoriteNegative)).toBe(-1);
    expect(applyDesignationSwingTilt('ALBATROSS', 0)).toBe(0);
  });

  test('computeFameVolume floors at one and returns exactly one at neutral heat', () => {
    expect(computeFameVolume(FAME_TUNING.heat.neutral)).toBe(1);
    expect(computeFameVolume(Number.NaN)).toBe(1);
    expect(computeFameVolume(FAME_TUNING.heat.max)).toBeGreaterThanOrEqual(1);
    expect(computeFameVolume(FAME_TUNING.heat.min)).toBeGreaterThanOrEqual(1);
  });

  test('computeFameVolume amplifies both fame and infamy as notability', () => {
    const positive = computeFameVolume(FAME_TUNING.heat.max);
    const negative = computeFameVolume(FAME_TUNING.heat.min);

    expect(positive).toBeGreaterThan(1);
    expect(negative).toBeGreaterThan(1);
  });

  test('computeFameVolume is monotonic in distance from neutral', () => {
    const nearPositive = computeFameVolume(FAME_TUNING.heat.neutral + 5);
    const farPositive = computeFameVolume(FAME_TUNING.heat.neutral + 15);
    const nearNegative = computeFameVolume(FAME_TUNING.heat.neutral - 5);
    const farNegative = computeFameVolume(FAME_TUNING.heat.neutral - 15);

    expect(farPositive).toBeGreaterThan(nearPositive);
    expect(farNegative).toBeGreaterThan(nearNegative);
  });

  test('same input produces the same output', () => {
    const first = computeDesignationSteadyFanSentiment('FAN_FAVORITE');
    const second = computeDesignationSteadyFanSentiment('FAN_FAVORITE');
    const firstTilt = applyDesignationSwingTilt('ALBATROSS', -3);
    const secondTilt = applyDesignationSwingTilt('ALBATROSS', -3);

    expect(second).toEqual(first);
    expect(secondTilt).toBe(firstTilt);
  });

  test('custom config overrides steady sentiment and swing tilt deterministically', () => {
    const sentimentConfig = overrideFanFavoriteWarmth(1);
    const tiltConfig = overrideFanFavoriteUpTilt(2);
    const firstSentiment = computeDesignationSteadyFanSentiment(
      'FAN_FAVORITE',
      sentimentConfig,
    );
    const secondSentiment = computeDesignationSteadyFanSentiment(
      'FAN_FAVORITE',
      sentimentConfig,
    );
    const firstTilt = applyDesignationSwingTilt('FAN_FAVORITE', 2, tiltConfig);
    const secondTilt = applyDesignationSwingTilt('FAN_FAVORITE', 2, tiltConfig);

    expect(firstSentiment.sentiment).toBe(1);
    expect(firstSentiment.sign).toBe('positive');
    expect(secondSentiment).toEqual(firstSentiment);
    expect(firstTilt).toBe(4);
    expect(secondTilt).toBe(firstTilt);
  });
});
