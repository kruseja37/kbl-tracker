import { describe, expect, test } from 'vitest';
import {
  MLB_BASELINE_GAMES,
  MLB_BASELINE_INNINGS,
  SMB4_DEFAULT_GAMES,
  SMB4_DEFAULT_INNINGS,
  adaptiveStandardsConfig,
  deriveAdaptiveStandardsConfig,
  getCombinedScalingFactor,
  getInningsScalingFactor,
  getSeasonScalingFactor,
  mlbEquivalentSeasonMultiplier,
  normalizeToMlbSeasonEquivalent,
  runsPerWinForSeason,
  scaledGameInningsThreshold,
  scaledThreshold,
} from '../franchiseAdaptiveStandards';

describe('franchiseAdaptiveStandards', () => {
  test('scales short-season counting and innings thresholds from one shared config', () => {
    const config = deriveAdaptiveStandardsConfig({
      gamesPerSeason: 32,
      inningsPerGame: 6,
    });

    expect(config).toEqual({
      gamesPerSeason: 32,
      inningsPerGame: 6,
      baselineGames: MLB_BASELINE_GAMES,
      baselineInnings: MLB_BASELINE_INNINGS,
      source: 'explicit',
    });
    expect(getSeasonScalingFactor(config)).toBeCloseTo(32 / MLB_BASELINE_GAMES, 5);
    expect(getInningsScalingFactor(config)).toBeCloseTo(6 / MLB_BASELINE_INNINGS, 5);
    expect(getCombinedScalingFactor(config)).toBeCloseTo((32 / MLB_BASELINE_GAMES) * (6 / MLB_BASELINE_INNINGS), 5);
    expect(scaledThreshold(40, config, 'season')).toBe(8);
    expect(scaledThreshold(100, config, 'combined')).toBe(13);
    expect(scaledGameInningsThreshold(18, 6)).toBe(12);
  });

  test('keeps positive one-event thresholds from scaling below one', () => {
    const config = deriveAdaptiveStandardsConfig({
      gamesPerSeason: 32,
      inningsPerGame: 6,
    });

    expect(scaledThreshold(1, config, 'season')).toBe(1);
    expect(scaledThreshold(1, config, 'innings')).toBe(1);
    expect(scaledThreshold(1, config, 'combined')).toBe(1);
    expect(scaledThreshold(0, config, 'season')).toBe(0);
  });

  test('preserves MLB-like defaults when explicit baseline values are supplied', () => {
    const config = deriveAdaptiveStandardsConfig({
      gamesPerSeason: MLB_BASELINE_GAMES,
      inningsPerGame: MLB_BASELINE_INNINGS,
    });

    expect(getSeasonScalingFactor(config)).toBe(1);
    expect(getInningsScalingFactor(config)).toBe(1);
    expect(getCombinedScalingFactor(config)).toBe(1);
    expect(scaledThreshold(162, config, 'season')).toBe(162);
    expect(scaledThreshold(200, config, 'combined')).toBe(200);
    expect(runsPerWinForSeason(MLB_BASELINE_GAMES)).toBe(10);
    expect(normalizeToMlbSeasonEquivalent(4, MLB_BASELINE_GAMES)).toBe(4);
  });

  test('derives config from stored franchise season metadata before rules fallback', () => {
    const config = deriveAdaptiveStandardsConfig({
      seasonLength: {
        gamesPerTeam: 48,
        inningsPerGame: 7,
      },
      rulesSnapshot: {
        gamesPerTeam: 60,
        inningsPerGame: 9,
      },
    });

    expect(config.gamesPerSeason).toBe(48);
    expect(config.inningsPerGame).toBe(7);
    expect(config.source).toBe('franchise-season');
  });

  test('uses SMB4 defaults when no valid season inputs are available', () => {
    const config = deriveAdaptiveStandardsConfig({
      gamesPerSeason: 0,
      inningsPerGame: Number.NaN,
      rulesSnapshot: {
        gamesPerTeam: null,
        inningsPerGame: -1,
      },
    });

    expect(config.gamesPerSeason).toBe(SMB4_DEFAULT_GAMES);
    expect(config.inningsPerGame).toBe(SMB4_DEFAULT_INNINGS);
    expect(config.source).toBe('default');
    expect(adaptiveStandardsConfig.gamesPerSeason).toBe(SMB4_DEFAULT_GAMES);
    expect(adaptiveStandardsConfig.inningsPerGame).toBe(SMB4_DEFAULT_INNINGS);
  });

  test('provides WAR normalization helpers without calculating final WAR', () => {
    expect(runsPerWinForSeason(32)).toBeCloseTo(10 * (32 / MLB_BASELINE_GAMES), 5);
    expect(mlbEquivalentSeasonMultiplier(32)).toBeCloseTo(MLB_BASELINE_GAMES / 32, 5);
    expect(normalizeToMlbSeasonEquivalent(1, 32)).toBeCloseTo(MLB_BASELINE_GAMES / 32, 5);
  });
});
