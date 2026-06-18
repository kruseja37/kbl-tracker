import { describe, expect, test } from 'vitest';

import {
  DESIGNATION_FAME_NUDGE_TUNING,
  computeDesignationFameNudge,
  summarizeDesignationFameNudges,
  type DesignationFameNudgeTuning,
} from '../designationFameNudge';
import type { FranchiseDesignationType } from '../../utils/franchiseDesignations';

const STORE_BACKED_DESIGNATION_TYPES: FranchiseDesignationType[] = [
  'TEAM_MVP',
  'ACE',
  'FAN_FAVORITE',
  'ALBATROSS',
];

function overrideNudge(
  type: FranchiseDesignationType,
  fameNudge: number,
): DesignationFameNudgeTuning {
  return {
    nudgeByType: {
      ...DESIGNATION_FAME_NUDGE_TUNING.nudgeByType,
      [type]: fameNudge,
    },
  };
}

describe('designationFameNudge L7b pure engine', () => {
  test('Fan Favorite earns the spec-canonical positive naming seed', () => {
    const result = computeDesignationFameNudge('FAN_FAVORITE');

    expect(result).toEqual({
      type: 'FAN_FAVORITE',
      fameNudge: 2,
      sign: 'positive',
      reason: 'designation_fame_nudge.fan_favorite_warmth',
    });
  });

  test('Albatross earns the spec-canonical negative naming seed', () => {
    const result = computeDesignationFameNudge('ALBATROSS');

    expect(result).toEqual({
      type: 'ALBATROSS',
      fameNudge: -1,
      sign: 'negative',
      reason: 'designation_fame_nudge.albatross_irritation',
    });
  });

  test('Team MVP and Ace use their tuned positive placeholder nudges', () => {
    const teamMvp = computeDesignationFameNudge('TEAM_MVP');
    const ace = computeDesignationFameNudge('ACE');

    expect(teamMvp).toMatchObject({
      fameNudge: DESIGNATION_FAME_NUDGE_TUNING.nudgeByType.TEAM_MVP,
      sign: 'positive',
      reason: 'designation_fame_nudge.merit_honor',
    });
    expect(ace).toMatchObject({
      fameNudge: DESIGNATION_FAME_NUDGE_TUNING.nudgeByType.ACE,
      sign: 'positive',
      reason: 'designation_fame_nudge.merit_honor',
    });
  });

  test('tuning covers exactly the four store-backed designation types', () => {
    const tunedTypes = Object.keys(DESIGNATION_FAME_NUDGE_TUNING.nudgeByType).sort();

    expect(tunedTypes).toEqual([...STORE_BACKED_DESIGNATION_TYPES].sort());
    expect(tunedTypes).not.toContain('CAPTAIN');
    expect(tunedTypes).not.toContain('FAN_HOPEFUL');

    for (const type of STORE_BACKED_DESIGNATION_TYPES) {
      expect(Number.isFinite(DESIGNATION_FAME_NUDGE_TUNING.nudgeByType[type])).toBe(true);
    }
  });

  test('zero-valued config override returns neutral sign', () => {
    const result = computeDesignationFameNudge('ACE', overrideNudge('ACE', 0));

    expect(result.fameNudge).toBe(0);
    expect(result.sign).toBe('neutral');
  });

  test('summarizes single, multiple, and empty designation lists', () => {
    expect(summarizeDesignationFameNudges(['FAN_FAVORITE'])).toEqual({
      totalNudge: 2,
      perType: [{ type: 'FAN_FAVORITE', fameNudge: 2 }],
    });

    expect(summarizeDesignationFameNudges(['FAN_FAVORITE', 'TEAM_MVP'])).toEqual({
      totalNudge: 3.5,
      perType: [
        { type: 'FAN_FAVORITE', fameNudge: 2 },
        { type: 'TEAM_MVP', fameNudge: 1.5 },
      ],
    });

    expect(summarizeDesignationFameNudges([])).toEqual({
      totalNudge: 0,
      perType: [],
    });
  });

  test('same input produces the same output', () => {
    const first = computeDesignationFameNudge('TEAM_MVP');
    const second = computeDesignationFameNudge('TEAM_MVP');

    expect(second).toEqual(first);
  });

  test('custom config override changes the result deterministically', () => {
    const config = overrideNudge('FAN_FAVORITE', 4);
    const first = computeDesignationFameNudge('FAN_FAVORITE', config);
    const second = computeDesignationFameNudge('FAN_FAVORITE', config);

    expect(first.fameNudge).toBe(4);
    expect(first.sign).toBe('positive');
    expect(second).toEqual(first);
  });
});
