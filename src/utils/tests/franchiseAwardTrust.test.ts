import { describe, expect, test } from 'vitest';

import {
  MLB_BASELINE_GAMES,
  MLB_BASELINE_INNINGS,
  deriveAdaptiveStandardsConfig,
} from '../franchiseAdaptiveStandards';
import {
  QUALIFIED_IP_BASELINE,
  QUALIFIED_PA_BASELINE,
  awardQualifierThresholds,
} from '../franchiseAwardTrust';

describe('franchise award trust qualifier thresholds', () => {
  test('scales qualified PA and IP thresholds from stored season metadata', () => {
    const shortSeason = deriveAdaptiveStandardsConfig({
      gamesPerTeam: 32,
      inningsPerGame: 6,
    });
    const fullSeason = deriveAdaptiveStandardsConfig({
      gamesPerTeam: MLB_BASELINE_GAMES,
      inningsPerGame: MLB_BASELINE_INNINGS,
    });

    const shortThresholds = awardQualifierThresholds(shortSeason);
    const fullThresholds = awardQualifierThresholds(fullSeason);

    expect(QUALIFIED_PA_BASELINE).toBe(502);
    expect(QUALIFIED_IP_BASELINE).toBeGreaterThan(QUALIFIED_PA_BASELINE / 4);
    expect(shortThresholds.minPlateAppearances).toBeLessThan(fullThresholds.minPlateAppearances);
    expect(shortThresholds.minInningsPitched).toBeLessThan(fullThresholds.minInningsPitched);
    expect(shortThresholds).toEqual({
      minPlateAppearances: 99,
      minInningsPitched: 21,
    });
    expect(fullThresholds).toEqual({
      minPlateAppearances: QUALIFIED_PA_BASELINE,
      minInningsPitched: QUALIFIED_IP_BASELINE,
    });
  });
});
