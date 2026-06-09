/**
 * Shared adaptive standards contract for franchise engines.
 *
 * This module is intentionally read-only: it centralizes season-length and
 * inning-length assumptions without promoting preview systems to final trust.
 */

export const MLB_BASELINE_GAMES = 162;
export const MLB_BASELINE_INNINGS = 9;
export const MLB_BASELINE_RUNS_PER_WIN = 10;
export const MIN_QUALITY_START_OUTS = 9;

export const SMB4_DEFAULT_GAMES = 128;
export const SMB4_DEFAULT_INNINGS = 6;

export type AdaptiveThresholdBasis = 'season' | 'innings' | 'combined' | 'none';

export interface MilestoneConfig {
  gamesPerSeason: number;
  inningsPerGame: number;
}

export interface AdaptiveStandardsConfig extends MilestoneConfig {
  baselineGames: number;
  baselineInnings: number;
  source: 'explicit' | 'franchise-rules' | 'franchise-season' | 'default';
}

export interface AdaptiveStandardsConfigInput {
  gamesPerSeason?: number | null;
  gamesPerTeam?: number | null;
  inningsPerGame?: number | null;
  seasonLength?: {
    gamesPerTeam?: number | null;
    expectedRegularSeasonGamesPerTeam?: number | null;
    inningsPerGame?: number | null;
    adaptiveStandardsInningsPerGame?: number | null;
  } | null;
  rulesSnapshot?: {
    gamesPerTeam?: number | null;
    inningsPerGame?: number | null;
  } | null;
  season?: {
    gamesPerSeason?: number | null;
    gamesPerTeam?: number | null;
    inningsPerGame?: number | null;
  } | null;
}

export const DEFAULT_ADAPTIVE_STANDARDS_CONFIG: AdaptiveStandardsConfig = {
  gamesPerSeason: SMB4_DEFAULT_GAMES,
  inningsPerGame: SMB4_DEFAULT_INNINGS,
  baselineGames: MLB_BASELINE_GAMES,
  baselineInnings: MLB_BASELINE_INNINGS,
  source: 'default',
};

export const adaptiveStandardsConfig: AdaptiveStandardsConfig = DEFAULT_ADAPTIVE_STANDARDS_CONFIG;

export const MLB_BASELINE_MILESTONE_CONFIG: MilestoneConfig = {
  gamesPerSeason: MLB_BASELINE_GAMES,
  inningsPerGame: MLB_BASELINE_INNINGS,
};

function positiveFiniteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;
}

export function deriveAdaptiveStandardsConfig(
  input: AdaptiveStandardsConfigInput | null | undefined = null,
): AdaptiveStandardsConfig {
  const explicitGames = positiveFiniteNumber(input?.gamesPerSeason) ?? positiveFiniteNumber(input?.gamesPerTeam);
  const explicitInnings = positiveFiniteNumber(input?.inningsPerGame);

  const seasonGames =
    positiveFiniteNumber(input?.seasonLength?.gamesPerTeam) ??
    positiveFiniteNumber(input?.seasonLength?.expectedRegularSeasonGamesPerTeam) ??
    positiveFiniteNumber(input?.season?.gamesPerSeason) ??
    positiveFiniteNumber(input?.season?.gamesPerTeam);
  const seasonInnings =
    positiveFiniteNumber(input?.seasonLength?.adaptiveStandardsInningsPerGame) ??
    positiveFiniteNumber(input?.seasonLength?.inningsPerGame) ??
    positiveFiniteNumber(input?.season?.inningsPerGame);

  const rulesGames = positiveFiniteNumber(input?.rulesSnapshot?.gamesPerTeam);
  const rulesInnings = positiveFiniteNumber(input?.rulesSnapshot?.inningsPerGame);

  const gamesPerSeason =
    explicitGames ??
    seasonGames ??
    rulesGames ??
    DEFAULT_ADAPTIVE_STANDARDS_CONFIG.gamesPerSeason;
  const inningsPerGame =
    explicitInnings ??
    seasonInnings ??
    rulesInnings ??
    DEFAULT_ADAPTIVE_STANDARDS_CONFIG.inningsPerGame;

  const source: AdaptiveStandardsConfig['source'] = explicitGames !== null || explicitInnings !== null
    ? 'explicit'
    : seasonGames !== null || seasonInnings !== null
      ? 'franchise-season'
      : rulesGames !== null || rulesInnings !== null
        ? 'franchise-rules'
        : 'default';

  return {
    gamesPerSeason,
    inningsPerGame,
    baselineGames: MLB_BASELINE_GAMES,
    baselineInnings: MLB_BASELINE_INNINGS,
    source,
  };
}

export function getSeasonScalingFactor(config: MilestoneConfig = DEFAULT_ADAPTIVE_STANDARDS_CONFIG): number {
  return config.gamesPerSeason / MLB_BASELINE_GAMES;
}

export function getInningsScalingFactor(config: MilestoneConfig = DEFAULT_ADAPTIVE_STANDARDS_CONFIG): number {
  return config.inningsPerGame / MLB_BASELINE_INNINGS;
}

export function getCombinedScalingFactor(config: MilestoneConfig = DEFAULT_ADAPTIVE_STANDARDS_CONFIG): number {
  return getSeasonScalingFactor(config) * getInningsScalingFactor(config);
}

export function scaledThreshold(
  threshold: number,
  config: MilestoneConfig = DEFAULT_ADAPTIVE_STANDARDS_CONFIG,
  basis: AdaptiveThresholdBasis = 'season',
): number {
  if (!Number.isFinite(threshold)) return 0;
  if (basis === 'none') return threshold;

  const factor = basis === 'combined'
    ? getCombinedScalingFactor(config)
    : basis === 'innings'
      ? getInningsScalingFactor(config)
      : getSeasonScalingFactor(config);

  const scaled = Math.round(threshold * factor);
  return threshold > 0 ? Math.max(1, scaled) : scaled;
}

export function scaleCountingThreshold(
  threshold: number,
  config: MilestoneConfig = DEFAULT_ADAPTIVE_STANDARDS_CONFIG,
): number {
  return scaledThreshold(threshold, config, 'season');
}

export function scaleInningsThreshold(
  threshold: number,
  config: MilestoneConfig = DEFAULT_ADAPTIVE_STANDARDS_CONFIG,
): number {
  return scaledThreshold(threshold, config, 'combined');
}

export function scaledGameInningsThreshold(
  threshold: number,
  inningsPerGame: number = MLB_BASELINE_INNINGS,
): number {
  return scaledThreshold(threshold, { gamesPerSeason: MLB_BASELINE_GAMES, inningsPerGame }, 'innings');
}

export function scaledFullSeasonGamesThreshold(
  config: MilestoneConfig = MLB_BASELINE_MILESTONE_CONFIG,
): number {
  return scaledThreshold(MLB_BASELINE_GAMES, config, 'season');
}

export function runsPerWinForSeason(
  gamesPerSeason: number,
  baselineRunsPerWin: number = MLB_BASELINE_RUNS_PER_WIN,
): number {
  return baselineRunsPerWin * getSeasonScalingFactor({
    gamesPerSeason,
    inningsPerGame: MLB_BASELINE_INNINGS,
  });
}

export function mlbEquivalentSeasonMultiplier(gamesPerSeason: number): number {
  return positiveFiniteNumber(gamesPerSeason) ? MLB_BASELINE_GAMES / gamesPerSeason : 1;
}

export function normalizeToMlbSeasonEquivalent(value: number, gamesPerSeason: number): number {
  return value * mlbEquivalentSeasonMultiplier(gamesPerSeason);
}
