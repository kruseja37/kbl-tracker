import { describe, expect, test } from 'vitest';

import {
  BAND_TO_PROFILE_CATEGORY,
  FARM_ARCHETYPE_TARGET_TUNING,
  bandPrioritiesToTargetProfile,
} from '../farmArchetypeProfile';
import type { BandPriorities } from '../leagueConstruction';

const profileKeys = ['bullpen', 'contact', 'power', 'rotation', 'speed'];

describe('bandPrioritiesToTargetProfile', () => {
  test('maps a power-heavy farm archetype to strict max power and base levels elsewhere', () => {
    const result = bandPrioritiesToTargetProfile({
      Power: 6,
      Contact: 0,
      Speed: 0,
      Defense: 0,
      Rotation: 0,
      Bullpen: 0,
    });

    expect(result.power).toBe(6);
    expect(result.contact).toBe(FARM_ARCHETYPE_TARGET_TUNING.baseLevel);
    expect(result.speed).toBe(FARM_ARCHETYPE_TARGET_TUNING.baseLevel);
    expect(result.rotation).toBe(FARM_ARCHETYPE_TARGET_TUNING.baseLevel);
    expect(result.bullpen).toBe(FARM_ARCHETYPE_TARGET_TUNING.baseLevel);
    expect(Object.keys(result).sort()).toEqual(profileKeys);
    expect(result).not.toHaveProperty('defense');
  });

  test('keeps mapped category levels monotonic and drops Defense priority', () => {
    const result = bandPrioritiesToTargetProfile({
      Power: 5,
      Contact: 1,
      Speed: 0,
      Defense: 3,
      Rotation: 4,
      Bullpen: 2,
    });

    expect(result.power).toBeGreaterThanOrEqual(result.rotation);
    expect(result.rotation).toBeGreaterThanOrEqual(result.bullpen);
    expect(result.bullpen).toBeGreaterThanOrEqual(result.contact);
    expect(result.contact).toBeGreaterThanOrEqual(result.speed);
    expect(BAND_TO_PROFILE_CATEGORY.Defense).toBeUndefined();
    expect(Object.keys(result).sort()).toEqual(profileKeys);
    expect(result).not.toHaveProperty('defense');
  });

  test('returns neutral base levels for all-zero priorities', () => {
    const result = bandPrioritiesToTargetProfile({
      Power: 0,
      Contact: 0,
      Speed: 0,
      Defense: 0,
      Rotation: 0,
      Bullpen: 0,
    });

    expect(Object.values(result)).toEqual(
      Array(profileKeys.length).fill(FARM_ARCHETYPE_TARGET_TUNING.baseLevel),
    );
  });

  test('treats negative and NaN priorities as zero', () => {
    const priorities: BandPriorities = {
      Power: Number.NaN,
      Contact: -4,
      Speed: 2,
      Defense: -10,
      Rotation: 0,
      Bullpen: 0,
    };

    const result = bandPrioritiesToTargetProfile(priorities);

    expect(result.speed).toBe(6);
    expect(result.power).toBe(FARM_ARCHETYPE_TARGET_TUNING.baseLevel);
    expect(result.contact).toBe(FARM_ARCHETYPE_TARGET_TUNING.baseLevel);
    expect(result.rotation).toBe(FARM_ARCHETYPE_TARGET_TUNING.baseLevel);
    expect(result.bullpen).toBe(FARM_ARCHETYPE_TARGET_TUNING.baseLevel);
    expect(Object.values(result).every((level) => level >= 0 && level <= 6)).toBe(true);
  });
});
