/**
 * Fame Engine
 * Per FAN_HAPPINESS_SPEC.md and SPECIAL_EVENTS_SPEC.md
 *
 * Centralizes Fame calculation logic:
 * - LI-weighted Fame scoring
 * - Career milestone detection
 * - Season milestone detection
 * - Clutch situation detection
 * - Fame accumulation for awards
 */

import type { FameEventType } from '../types/game';
import { FAME_VALUES } from '../types/game';
import type { MilestoneConfig } from '../utils/milestoneDetector';
import {
  getSeasonScalingFactor,
  scaleCountingThreshold,
  MLB_BASELINE_GAMES,
  SMB4_DEFAULT_GAMES,
  SMB4_DEFAULT_INNINGS,
} from '../utils/milestoneDetector';

// ============================================
// TYPES
// ============================================

/**
 * Career stats for milestone detection
 */
export interface CareerStats {
  // Batting
  hits: number;
  homeRuns: number;
  rbi: number;
  runs: number;
  stolenBases: number;
  doubles: number;
  walks: number;
  grandSlams: number;
  strikeoutsBatter: number;
  gidp: number;
  caughtStealing: number;

  // Pitching
  wins: number;
  losses: number;
  strikeoutsPitcher: number;
  saves: number;
  blownSaves: number;
  inningsPitched: number;
  shutouts: number;
  completeGames: number;
  noHitters: number;
  perfectGames: number;
  wildPitches: number;
  hbpPitcher: number;

  // Fielding
  errors: number;
  passedBalls: number;

  // WAR
  totalWAR: number;
  bWAR: number;
  pWAR: number;
  fWAR: number;
  rWAR: number;

  // Awards/Games
  gamesPlayed: number;
  allStarSelections: number;
  mvpAwards: number;
  cyYoungAwards: number;
}

/**
 * Season stats for milestone detection
 */
export interface SeasonStats {
  // Batting
  hits: number;
  homeRuns: number;
  rbi: number;
  stolenBases: number;
  battingAverage: number;
  strikeoutsBatter: number;
  gidp: number;
  errors: number;

  // Pitching
  wins: number;
  losses: number;
  strikeoutsPitcher: number;
  saves: number;
  blownSaves: number;
  era: number;
  walksIssued: number;
  homeRunsAllowed: number;

  // League leaders (for triple crown)
  isLeagueLeaderAVG?: boolean;
  isLeagueLeaderHR?: boolean;
  isLeagueLeaderRBI?: boolean;
  isLeagueLeaderWins?: boolean;
  isLeagueLeaderK?: boolean;
  isLeagueLeaderERA?: boolean;
}

/**
 * Milestone detection result
 */
export interface MilestoneResult {
  eventType: FameEventType;
  threshold: number;
  currentValue: number;
  tier: number;
  description: string;
}

/**
 * Fame calculation result with breakdown
 */
export interface FameResult {
  baseFame: number;           // Raw Fame value from FAME_VALUES
  liMultiplier: number;       // LI-based multiplier (√LI)
  playoffMultiplier: number;  // Playoff context multiplier
  finalFame: number;          // Final calculated Fame
  isBonus: boolean;           // True if positive Fame
  isBoner: boolean;           // True if negative Fame
}

// ============================================
// CAREER MILESTONE THRESHOLDS (MLB BASELINE)
// ============================================

/**
 * Career milestone tiers for positive achievements
 * Per MILESTONE_SYSTEM_SPEC.md
 *
 * IMPORTANT: These are MLB BASELINE values, NOT pre-scaled!
 *
 * For actual detection, use milestoneDetector.ts which has:
 * - checkCareerBattingMilestones()
 * - checkCareerPitchingMilestones()
 * - These accept MilestoneConfig and scale dynamically based on:
 *   - gamesPerSeason (e.g., 50, 128, 162)
 *   - inningsPerGame (e.g., 6, 9)
 *   - scalingType ('counting', 'innings', 'none')
 *
 * Example: 500 HR MLB baseline × 0.309 (50-game factor) = 155 HR threshold
 *
 * Award-based thresholds (All-Star, MVP, Cy Young) use scalingType: 'none'.
 * WAR thresholds scale with season length (WAR is a counting stat).
 */
export const CAREER_THRESHOLDS = {
  // Batting milestones (MLB baseline - scaled at runtime)
  homeRuns: [25, 50, 100, 150, 200, 250, 300, 400, 500, 600, 700],
  hits: [250, 500, 1000, 1500, 2000, 2500, 3000],
  rbi: [250, 500, 750, 1000, 1500, 2000],
  runs: [250, 500, 750, 1000, 1500, 2000],
  stolenBases: [50, 100, 200, 300, 400, 500],
  doubles: [100, 200, 300, 400, 500, 600],
  walks: [250, 500, 750, 1000, 1500, 2000],
  grandSlams: [5, 10, 15, 20, 25],

  // Pitching milestones (MLB baseline)
  wins: [25, 50, 100, 150, 200, 250, 300],
  strikeoutsPitcher: [250, 500, 1000, 1500, 2000, 2500, 3000],
  saves: [50, 100, 150, 200, 250, 300, 400, 500],
  inningsPitched: [500, 1000, 1500, 2000, 2500, 3000],
  shutouts: [10, 20, 30, 40, 50, 60],
  completeGames: [25, 50, 75, 100, 150],
  noHitters: [1, 2, 3, 4, 5, 6, 7],
  perfectGames: [1, 2],

  // WAR milestones (MLB baseline - scales with season length)
  totalWAR: [10, 20, 30, 40, 50, 60, 70, 80, 100],
  bWAR: [5, 15, 25, 35, 50, 65],
  pWAR: [5, 15, 25, 35, 50, 65],
  fWAR: [3, 8, 15, 22, 30],
  rWAR: [2, 5, 10, 15, 20],

  // Appearance/Award milestones (scalingType: 'none' for awards)
  gamesPlayed: [250, 500, 750, 1000, 1500, 2000],
  allStarSelections: [1, 3, 5, 7, 10, 12, 15],  // No scaling
  mvpAwards: [1, 2, 3, 4],                       // No scaling
  cyYoungAwards: [1, 2, 3, 4, 5],                // No scaling
} as const;

/**
 * Career milestone tiers for negative achievements
 * MLB BASELINE values - scaled at runtime via milestoneDetector.ts
 */
export const CAREER_NEGATIVE_THRESHOLDS = {
  strikeoutsBatter: [500, 1000, 1500, 2000, 2500],
  gidp: [100, 200, 300, 400],
  caughtStealing: [100, 150, 200, 250],
  losses: [100, 150, 200, 250, 300],
  blownSaves: [25, 50, 75, 100, 125],
  wildPitches: [100, 150, 200, 250, 350],
  hbpPitcher: [100, 150, 200, 250, 280],
  errors: [100, 200, 400, 600, 800, 1000],
  passedBalls: [50, 100, 150, 200],
} as const;

// ============================================
// SEASON MILESTONE THRESHOLDS (MLB BASELINE)
// ============================================

/**
 * Season milestone thresholds - MLB BASELINE VALUES
 *
 * IMPORTANT: These are MLB baseline values, NOT pre-scaled!
 * Scaling happens at RUNTIME based on franchise MilestoneConfig.
 *
 * For actual detection, use milestoneDetector.ts which has:
 * - checkSeasonBattingMilestones()
 * - checkSeasonPitchingMilestones()
 * - These accept MilestoneConfig and scale dynamically
 *
 * This file provides simplified thresholds for fameEngine's
 * quick Fame calculation (detectSeasonMilestones) which should
 * receive PRE-SCALED stats or be migrated to use milestoneDetector.
 *
 * Rate stats (BA, ERA) don't scale - same thresholds as MLB.
 */
export const SEASON_THRESHOLDS = {
  // Batting positive (MLB baseline - scale at runtime)
  homeRuns: { tier1: 40, tier2: 50, tier3: 60 },
  hits: { tier1: 200 },
  rbi: { tier1: 130 },
  stolenBases: { tier1: 50, tier2: 100 },
  // Rate stat - no scaling
  battingAverage: { tier1: 0.400 },

  // Batting clubs (HR + SB combos) - MLB baseline
  clubs: [
    { hr: 15, sb: 15, event: 'CLUB_15_15' as FameEventType },
    { hr: 20, sb: 20, event: 'CLUB_20_20' as FameEventType },
    { hr: 25, sb: 25, event: 'CLUB_25_25' as FameEventType },
    { hr: 30, sb: 30, event: 'CLUB_30_30' as FameEventType },
    { hr: 40, sb: 40, event: 'CLUB_40_40' as FameEventType },
  ],

  // Batting negative (MLB baseline)
  strikeoutsBatter: { tier1: 200, tier2: 250 },
  battingAverageMin: { tier1: 0.200 },
  gidp: { tier1: 30 },
  errors: { tier1: 20 },

  // Pitching positive (MLB baseline)
  wins: { tier1: 15, tier2: 20, tier3: 25 },
  strikeoutsPitcher: { tier1: 300 },
  saves: { tier1: 40 },
  eraMax: { tier1: 2.00, tier2: 1.50 },

  // Pitching negative (MLB baseline)
  losses: { tier1: 20 },
  eraMin: { tier1: 6.00 },
  walksIssued: { tier1: 100 },
  blownSaves: { tier1: 20 },
  homeRunsAllowed: { tier1: 40 },
} as const;

// ============================================
// LI WEIGHTING
// ============================================

/**
 * Calculate LI-weighted Fame multiplier
 * Per LEVERAGE_INDEX_SPEC.md: Fame scales with √LI
 *
 * @param leverageIndex - Current leverage index (0.1-10.0)
 * @returns Multiplier for Fame value
 */
export function getLIMultiplier(leverageIndex: number): number {
  // Clamp LI to valid range
  const li = Math.max(0.1, Math.min(10.0, leverageIndex));
  // √LI gives reasonable scaling: LI=1→1×, LI=4→2×, LI=9→3×
  return Math.sqrt(li);
}

/**
 * Calculate playoff context multiplier
 * Per CLUTCH_ATTRIBUTION_SPEC.md
 */
export function getPlayoffMultiplier(context: {
  isPlayoffs: boolean;
  round?: 'wild_card' | 'division_series' | 'championship_series' | 'world_series';
  isEliminationGame?: boolean;
  isClinchGame?: boolean;
}): number {
  if (!context.isPlayoffs) return 1.0;

  const baseMultipliers: Record<string, number> = {
    wild_card: 1.25,
    division_series: 1.5,
    championship_series: 1.75,
    world_series: 2.0,
  };

  let multiplier = baseMultipliers[context.round || 'wild_card'] || 1.25;

  if (context.isEliminationGame) multiplier += 0.5;
  if (context.isClinchGame) multiplier += 0.25;

  return multiplier;
}

// ============================================
// FAME CALCULATION
// ============================================

/**
 * Calculate Fame value for an event with LI and playoff weighting
 */
export function calculateFame(
  eventType: FameEventType,
  leverageIndex: number = 1.0,
  playoffContext?: {
    isPlayoffs: boolean;
    round?: 'wild_card' | 'division_series' | 'championship_series' | 'world_series';
    isEliminationGame?: boolean;
    isClinchGame?: boolean;
  }
): FameResult {
  const baseFame = FAME_VALUES[eventType];
  const liMultiplier = getLIMultiplier(leverageIndex);
  const playoffMultiplier = playoffContext ? getPlayoffMultiplier(playoffContext) : 1.0;

  // For boners, LI amplifies the shame
  // For bonuses, LI amplifies the glory
  const finalFame = baseFame * liMultiplier * playoffMultiplier;

  return {
    baseFame,
    liMultiplier,
    playoffMultiplier,
    finalFame,
    isBonus: baseFame > 0,
    isBoner: baseFame < 0,
  };
}

/**
 * Get Fame tier description based on accumulated Fame
 */
export function getFameTier(totalFame: number): {
  tier: string;
  label: string;
  minFame: number;
  maxFame: number;
} {
  const tiers = [
    { tier: 'LEGENDARY', label: 'Legend', minFame: 50, maxFame: Infinity },
    { tier: 'SUPERSTAR', label: 'Superstar', minFame: 30, maxFame: 50 },
    { tier: 'STAR', label: 'Star', minFame: 15, maxFame: 30 },
    { tier: 'FAN_FAVORITE', label: 'Fan Favorite', minFame: 5, maxFame: 15 },
    { tier: 'KNOWN', label: 'Known', minFame: 0, maxFame: 5 },
    { tier: 'UNKNOWN', label: 'Unknown', minFame: -5, maxFame: 0 },
    { tier: 'DISLIKED', label: 'Disliked', minFame: -15, maxFame: -5 },
    { tier: 'VILLAIN', label: 'Villain', minFame: -30, maxFame: -15 },
    { tier: 'NOTORIOUS', label: 'Notorious', minFame: -Infinity, maxFame: -30 },
  ];

  for (const t of tiers) {
    if (totalFame >= t.minFame && totalFame < t.maxFame) {
      return t;
    }
  }

  return tiers[tiers.length - 1];
}

// ============================================
// DEFAULT CONFIG FOR FAMEENGINE
// ============================================

const DEFAULT_FAME_CONFIG: MilestoneConfig = {
  gamesPerSeason: SMB4_DEFAULT_GAMES,
  inningsPerGame: SMB4_DEFAULT_INNINGS,
};

// ============================================
// CAREER MILESTONE DETECTION
// ============================================

/**
 * Scaling type for milestone thresholds
 *
 * - 'opportunity': Scales with BOTH season length AND innings per game
 *   Formula: (gamesPerSeason / 162) × (inningsPerGame / 9)
 *   Used for: All stats tied to plate appearances or innings pitched
 *   (HR, hits, RBI, SB, pitcher K, IP, walks, etc.)
 *
 * - 'per-game': Scales with season length ONLY
 *   Formula: gamesPerSeason / 162
 *   Used for: Stats that happen once per game max (wins, saves, games played)
 *
 * - 'none': No scaling
 *   Used for: Awards (1 per season regardless of length), rare achievements
 */
type MilestoneScalingType = 'opportunity' | 'per-game' | 'none';

/**
 * Milestone stat scaling configuration
 * Maps stat names to their scaling type
 *
 * KEY INSIGHT: A 32-game/9-inning season gives more ABs per game than
 * a 32-game/7-inning season, so opportunity-based stats should scale
 * with both games AND innings.
 */
const MILESTONE_STAT_SCALING: Record<string, MilestoneScalingType> = {
  // Batting - opportunity-based (more innings = more ABs)
  homeRuns: 'opportunity',
  hits: 'opportunity',
  rbi: 'opportunity',
  runs: 'opportunity',
  stolenBases: 'opportunity',
  doubles: 'opportunity',
  walks: 'opportunity',
  grandSlams: 'opportunity',
  strikeoutsBatter: 'opportunity',
  gidp: 'opportunity',
  caughtStealing: 'opportunity',

  // Pitching - opportunity-based (more innings = more chances)
  strikeoutsPitcher: 'opportunity',
  inningsPitched: 'opportunity',
  wildPitches: 'opportunity',
  hbpPitcher: 'opportunity',
  walksIssued: 'opportunity',
  homeRunsAllowed: 'opportunity',

  // Pitching - per-game (max 1 per game)
  wins: 'per-game',
  losses: 'per-game',
  saves: 'per-game',
  blownSaves: 'per-game',
  shutouts: 'per-game',
  completeGames: 'per-game',

  // Rare achievements - per-game (happen in a single game)
  noHitters: 'per-game',
  perfectGames: 'per-game',

  // Fielding - opportunity-based (more innings = more chances)
  errors: 'opportunity',
  passedBalls: 'opportunity',

  // WAR - opportunity-based (accumulates with playing time)
  totalWAR: 'opportunity',
  bWAR: 'opportunity',
  pWAR: 'opportunity',
  fWAR: 'opportunity',
  rWAR: 'opportunity',

  // Appearances - per-game
  gamesPlayed: 'per-game',

  // Awards - no scaling (1 per season max)
  allStarSelections: 'none',
  mvpAwards: 'none',
  cyYoungAwards: 'none',
};

/**
 * Get the opportunity scaling factor (games × innings)
 * Used for stats that accumulate with plate appearances or innings pitched
 */
function getOpportunityScalingFactor(config: MilestoneConfig): number {
  const seasonFactor = config.gamesPerSeason / MLB_BASELINE_GAMES;
  const inningsFactor = config.inningsPerGame / 9;
  return seasonFactor * inningsFactor;
}

/**
 * Scale a milestone threshold based on stat type and franchise config
 *
 * @param threshold - MLB baseline threshold (162 games, 9 innings)
 * @param scalingType - How to scale: 'opportunity', 'per-game', or 'none'
 * @param config - Franchise configuration
 * @returns Scaled threshold for the franchise
 */
function scaleMilestoneThreshold(
  threshold: number,
  scalingType: MilestoneScalingType,
  config: MilestoneConfig
): number {
  switch (scalingType) {
    case 'opportunity':
      // Scales with both games AND innings (more innings = more ABs/chances)
      return Math.round(threshold * getOpportunityScalingFactor(config));
    case 'per-game':
      // Scales with games only (max 1 per game events like wins, saves)
      return scaleCountingThreshold(threshold, config);
    case 'none':
    default:
      return threshold;
  }
}

/**
 * Detect career milestones for positive achievements
 *
 * Thresholds are MLB BASELINE values, scaled at RUNTIME based on config.
 *
 * @param stats - Current career stats
 * @param previousStats - Optional previous career stats for crossing detection
 * @param config - Franchise milestone config (gamesPerSeason, inningsPerGame)
 * @returns Array of milestone results
 */
export function detectCareerMilestones(
  stats: CareerStats,
  previousStats?: CareerStats,
  config: MilestoneConfig = DEFAULT_FAME_CONFIG
): MilestoneResult[] {
  const results: MilestoneResult[] = [];
  const scaleFactor = getSeasonScalingFactor(config);

  // Helper to check if crossed a threshold (with scaling)
  const checkThreshold = (
    current: number,
    previous: number | undefined,
    thresholds: readonly number[],
    eventType: FameEventType,
    statName: string,
    scalingType: MilestoneScalingType = 'opportunity'
  ) => {
    for (let i = 0; i < thresholds.length; i++) {
      const mlbThreshold = thresholds[i];
      const scaledThreshold = scaleMilestoneThreshold(mlbThreshold, scalingType, config);
      const crossed = current >= scaledThreshold && (previous === undefined || previous < scaledThreshold);
      if (crossed) {
        const scaleNote = scaleFactor < 1 ? ` (${mlbThreshold} MLB)` : '';
        results.push({
          eventType,
          threshold: scaledThreshold,
          currentValue: current,
          tier: i + 1,
          description: `${statName}: ${current} (reached ${scaledThreshold}${scaleNote})`,
        });
      }
    }
  };

  // Batting milestones (opportunity-based - more innings = more ABs)
  checkThreshold(stats.homeRuns, previousStats?.homeRuns, CAREER_THRESHOLDS.homeRuns, 'CAREER_HR_TIER', 'Career HR', 'opportunity');
  checkThreshold(stats.hits, previousStats?.hits, CAREER_THRESHOLDS.hits, 'CAREER_HITS_TIER', 'Career Hits', 'opportunity');
  checkThreshold(stats.rbi, previousStats?.rbi, CAREER_THRESHOLDS.rbi, 'CAREER_RBI_TIER', 'Career RBI', 'opportunity');
  checkThreshold(stats.runs, previousStats?.runs, CAREER_THRESHOLDS.runs, 'CAREER_RUNS_TIER', 'Career Runs', 'opportunity');
  checkThreshold(stats.stolenBases, previousStats?.stolenBases, CAREER_THRESHOLDS.stolenBases, 'CAREER_SB_TIER', 'Career SB', 'opportunity');
  checkThreshold(stats.doubles, previousStats?.doubles, CAREER_THRESHOLDS.doubles, 'CAREER_DOUBLES_TIER', 'Career 2B', 'opportunity');
  checkThreshold(stats.walks, previousStats?.walks, CAREER_THRESHOLDS.walks, 'CAREER_BB_TIER', 'Career BB', 'opportunity');
  checkThreshold(stats.grandSlams, previousStats?.grandSlams, CAREER_THRESHOLDS.grandSlams, 'CAREER_GRAND_SLAMS_TIER', 'Career Grand Slams', 'opportunity');

  // Pitching milestones
  checkThreshold(stats.wins, previousStats?.wins, CAREER_THRESHOLDS.wins, 'CAREER_WINS_TIER', 'Career Wins', 'per-game');
  checkThreshold(stats.strikeoutsPitcher, previousStats?.strikeoutsPitcher, CAREER_THRESHOLDS.strikeoutsPitcher, 'CAREER_K_TIER', 'Career K', 'opportunity');
  checkThreshold(stats.saves, previousStats?.saves, CAREER_THRESHOLDS.saves, 'CAREER_SAVES_TIER', 'Career Saves', 'per-game');
  checkThreshold(stats.inningsPitched, previousStats?.inningsPitched, CAREER_THRESHOLDS.inningsPitched, 'CAREER_IP_TIER', 'Career IP', 'opportunity');
  checkThreshold(stats.shutouts, previousStats?.shutouts, CAREER_THRESHOLDS.shutouts, 'CAREER_SHUTOUTS_TIER', 'Career SO', 'per-game');
  checkThreshold(stats.completeGames, previousStats?.completeGames, CAREER_THRESHOLDS.completeGames, 'CAREER_CG_TIER', 'Career CG', 'per-game');
  checkThreshold(stats.noHitters, previousStats?.noHitters, CAREER_THRESHOLDS.noHitters, 'CAREER_NO_HITTERS_TIER', 'Career No-Hitters', 'per-game');
  checkThreshold(stats.perfectGames, previousStats?.perfectGames, CAREER_THRESHOLDS.perfectGames, 'CAREER_PERFECT_GAMES_TIER', 'Career Perfect Games', 'per-game');

  // WAR milestones (opportunity-based - accumulates with playing time)
  checkThreshold(stats.totalWAR, previousStats?.totalWAR, CAREER_THRESHOLDS.totalWAR, 'CAREER_WAR_TIER', 'Career WAR', 'opportunity');
  checkThreshold(stats.bWAR, previousStats?.bWAR, CAREER_THRESHOLDS.bWAR, 'CAREER_BWAR_TIER', 'Career bWAR', 'opportunity');
  checkThreshold(stats.pWAR, previousStats?.pWAR, CAREER_THRESHOLDS.pWAR, 'CAREER_PWAR_TIER', 'Career pWAR', 'opportunity');
  checkThreshold(stats.fWAR, previousStats?.fWAR, CAREER_THRESHOLDS.fWAR, 'CAREER_FWAR_TIER', 'Career fWAR', 'opportunity');
  checkThreshold(stats.rWAR, previousStats?.rWAR, CAREER_THRESHOLDS.rWAR, 'CAREER_RWAR_TIER', 'Career rWAR', 'opportunity');

  // Appearance/Award milestones
  checkThreshold(stats.gamesPlayed, previousStats?.gamesPlayed, CAREER_THRESHOLDS.gamesPlayed, 'CAREER_GAMES_TIER', 'Career Games', 'per-game');
  checkThreshold(stats.allStarSelections, previousStats?.allStarSelections, CAREER_THRESHOLDS.allStarSelections, 'CAREER_ALL_STARS_TIER', 'All-Star Selections', 'none');
  checkThreshold(stats.mvpAwards, previousStats?.mvpAwards, CAREER_THRESHOLDS.mvpAwards, 'CAREER_MVPS_TIER', 'MVP Awards', 'none');
  checkThreshold(stats.cyYoungAwards, previousStats?.cyYoungAwards, CAREER_THRESHOLDS.cyYoungAwards, 'CAREER_CY_YOUNGS_TIER', 'Cy Young Awards', 'none');

  return results;
}

/**
 * Detect career milestones for negative achievements
 *
 * Thresholds are MLB BASELINE values, scaled at RUNTIME based on config.
 *
 * @param stats - Current career stats
 * @param previousStats - Optional previous career stats for crossing detection
 * @param config - Franchise milestone config (gamesPerSeason, inningsPerGame)
 * @returns Array of milestone results
 */
export function detectCareerNegativeMilestones(
  stats: CareerStats,
  previousStats?: CareerStats,
  config: MilestoneConfig = DEFAULT_FAME_CONFIG
): MilestoneResult[] {
  const results: MilestoneResult[] = [];
  const scaleFactor = getSeasonScalingFactor(config);

  const checkThreshold = (
    current: number,
    previous: number | undefined,
    thresholds: readonly number[],
    eventType: FameEventType,
    statName: string,
    scalingType: MilestoneScalingType = 'opportunity'
  ) => {
    for (let i = 0; i < thresholds.length; i++) {
      const mlbThreshold = thresholds[i];
      const scaledThreshold = scaleMilestoneThreshold(mlbThreshold, scalingType, config);
      const crossed = current >= scaledThreshold && (previous === undefined || previous < scaledThreshold);
      if (crossed) {
        const scaleNote = scaleFactor < 1 ? ` (${mlbThreshold} MLB)` : '';
        results.push({
          eventType,
          threshold: scaledThreshold,
          currentValue: current,
          tier: i + 1,
          description: `${statName}: ${current} (reached ${scaledThreshold}${scaleNote})`,
        });
      }
    }
  };

  // Batting negative (opportunity-based - more innings = more ABs)
  checkThreshold(stats.strikeoutsBatter, previousStats?.strikeoutsBatter, CAREER_NEGATIVE_THRESHOLDS.strikeoutsBatter, 'CAREER_K_BATTER_TIER', 'Career K (Batter)', 'opportunity');
  checkThreshold(stats.gidp, previousStats?.gidp, CAREER_NEGATIVE_THRESHOLDS.gidp, 'CAREER_GIDP_TIER', 'Career GIDP', 'opportunity');
  checkThreshold(stats.caughtStealing, previousStats?.caughtStealing, CAREER_NEGATIVE_THRESHOLDS.caughtStealing, 'CAREER_CS_TIER', 'Career CS', 'opportunity');

  // Pitching negative
  checkThreshold(stats.losses, previousStats?.losses, CAREER_NEGATIVE_THRESHOLDS.losses, 'CAREER_LOSSES_TIER', 'Career Losses', 'per-game');
  checkThreshold(stats.blownSaves, previousStats?.blownSaves, CAREER_NEGATIVE_THRESHOLDS.blownSaves, 'CAREER_BLOWN_SAVES_TIER', 'Career Blown Saves', 'per-game');
  checkThreshold(stats.wildPitches, previousStats?.wildPitches, CAREER_NEGATIVE_THRESHOLDS.wildPitches, 'CAREER_WILD_PITCHES_TIER', 'Career WP', 'opportunity');
  checkThreshold(stats.hbpPitcher, previousStats?.hbpPitcher, CAREER_NEGATIVE_THRESHOLDS.hbpPitcher, 'CAREER_HBP_PITCHER_TIER', 'Career HBP', 'opportunity');

  // Fielding negative (opportunity-based - more innings = more chances)
  checkThreshold(stats.errors, previousStats?.errors, CAREER_NEGATIVE_THRESHOLDS.errors, 'CAREER_ERRORS_TIER', 'Career Errors', 'opportunity');
  checkThreshold(stats.passedBalls, previousStats?.passedBalls, CAREER_NEGATIVE_THRESHOLDS.passedBalls, 'CAREER_PASSED_BALLS_TIER', 'Career PB', 'opportunity');

  return results;
}

// ============================================
// SEASON MILESTONE DETECTION
// ============================================

/**
 * Detect season milestones
 *
 * Event type names use MLB-style numbers for consistency with FameEventType enum.
 * Actual thresholds are MLB BASELINE values, scaled at RUNTIME based on config.
 *
 * @param stats - Current season stats
 * @param config - Franchise milestone config (gamesPerSeason, inningsPerGame)
 * @returns Array of milestone results
 */
export function detectSeasonMilestones(
  stats: SeasonStats,
  config: MilestoneConfig = DEFAULT_FAME_CONFIG
): MilestoneResult[] {
  const results: MilestoneResult[] = [];
  const T = SEASON_THRESHOLDS; // MLB baseline thresholds
  const oppFactor = getOpportunityScalingFactor(config);

  // Helper for opportunity-based scaling (games × innings)
  const scaleOpp = (threshold: number) => scaleMilestoneThreshold(threshold, 'opportunity', config);
  // Helper for per-game scaling (games only)
  const scalePerGame = (threshold: number) => scaleMilestoneThreshold(threshold, 'per-game', config);

  // Batting positive (opportunity-based - more innings = more ABs)
  const scaledHR1 = scaleOpp(T.homeRuns.tier1);
  const scaledHR2 = scaleOpp(T.homeRuns.tier2);
  const scaledHR3 = scaleOpp(T.homeRuns.tier3);

  if (stats.homeRuns >= scaledHR3) {
    results.push({ eventType: 'SEASON_55_HR', threshold: scaledHR3, currentValue: stats.homeRuns, tier: 3, description: `${stats.homeRuns} HR season (${T.homeRuns.tier3} MLB baseline)` });
  } else if (stats.homeRuns >= scaledHR2) {
    results.push({ eventType: 'SEASON_45_HR', threshold: scaledHR2, currentValue: stats.homeRuns, tier: 2, description: `${stats.homeRuns} HR season (${T.homeRuns.tier2} MLB baseline)` });
  } else if (stats.homeRuns >= scaledHR1) {
    results.push({ eventType: 'SEASON_40_HR', threshold: scaledHR1, currentValue: stats.homeRuns, tier: 1, description: `${stats.homeRuns} HR season (${T.homeRuns.tier1} MLB baseline)` });
  }

  const scaledHits = scaleOpp(T.hits.tier1);
  if (stats.hits >= scaledHits) {
    results.push({ eventType: 'SEASON_160_HITS', threshold: scaledHits, currentValue: stats.hits, tier: 1, description: `${stats.hits} hits (${T.hits.tier1} MLB baseline)` });
  }

  const scaledRBI = scaleOpp(T.rbi.tier1);
  if (stats.rbi >= scaledRBI) {
    results.push({ eventType: 'SEASON_120_RBI', threshold: scaledRBI, currentValue: stats.rbi, tier: 1, description: `${stats.rbi} RBI (${T.rbi.tier1} MLB baseline)` });
  }

  const scaledSB1 = scaleOpp(T.stolenBases.tier1);
  const scaledSB2 = scaleOpp(T.stolenBases.tier2);
  if (stats.stolenBases >= scaledSB2) {
    results.push({ eventType: 'SEASON_80_SB', threshold: scaledSB2, currentValue: stats.stolenBases, tier: 2, description: `${stats.stolenBases} SB (${T.stolenBases.tier2} MLB baseline)` });
  } else if (stats.stolenBases >= scaledSB1) {
    results.push({ eventType: 'SEASON_40_SB', threshold: scaledSB1, currentValue: stats.stolenBases, tier: 1, description: `${stats.stolenBases} SB (${T.stolenBases.tier1} MLB baseline)` });
  }

  // Rate stat - no scaling needed
  if (stats.battingAverage >= T.battingAverage.tier1) {
    results.push({ eventType: 'SEASON_400_BA', threshold: 0.400, currentValue: stats.battingAverage, tier: 1, description: `.${Math.round(stats.battingAverage * 1000)} BA` });
  }

  // HR+SB Clubs (opportunity-based)
  for (const club of T.clubs) {
    const scaledClubHR = scaleOpp(club.hr);
    const scaledClubSB = scaleOpp(club.sb);
    if (stats.homeRuns >= scaledClubHR && stats.stolenBases >= scaledClubSB) {
      results.push({ eventType: club.event, threshold: scaledClubHR, currentValue: stats.homeRuns, tier: 1, description: `${scaledClubHR}/${scaledClubSB} Club (${club.hr}/${club.sb} MLB)` });
    }
  }

  // Triple Crown - no scaling (league leadership)
  if (stats.isLeagueLeaderAVG && stats.isLeagueLeaderHR && stats.isLeagueLeaderRBI) {
    results.push({ eventType: 'SEASON_TRIPLE_CROWN', threshold: 0, currentValue: 1, tier: 1, description: 'Triple Crown!' });
  }

  // Pitching positive - wins/saves are per-game, K is opportunity-based
  const scaledWins1 = scalePerGame(T.wins.tier1);
  const scaledWins2 = scalePerGame(T.wins.tier2);
  const scaledWins3 = scalePerGame(T.wins.tier3);

  if (stats.wins >= scaledWins3) {
    results.push({ eventType: 'SEASON_25_WINS', threshold: scaledWins3, currentValue: stats.wins, tier: 3, description: `${stats.wins} wins (${T.wins.tier3} MLB baseline)` });
  } else if (stats.wins >= scaledWins2) {
    results.push({ eventType: 'SEASON_20_WINS', threshold: scaledWins2, currentValue: stats.wins, tier: 2, description: `${stats.wins} wins (${T.wins.tier2} MLB baseline)` });
  } else if (stats.wins >= scaledWins1) {
    results.push({ eventType: 'SEASON_15_WINS', threshold: scaledWins1, currentValue: stats.wins, tier: 1, description: `${stats.wins} wins (${T.wins.tier1} MLB baseline)` });
  }

  // Pitcher K is opportunity-based (more innings = more K chances)
  const scaledK = scaleOpp(T.strikeoutsPitcher.tier1);
  if (stats.strikeoutsPitcher >= scaledK) {
    results.push({ eventType: 'SEASON_235_K', threshold: scaledK, currentValue: stats.strikeoutsPitcher, tier: 1, description: `${stats.strikeoutsPitcher} K (${T.strikeoutsPitcher.tier1} MLB baseline)` });
  }

  // Saves are per-game (max 1 per game)
  const scaledSaves = scalePerGame(T.saves.tier1);
  if (stats.saves >= scaledSaves) {
    results.push({ eventType: 'SEASON_40_SAVES', threshold: scaledSaves, currentValue: stats.saves, tier: 1, description: `${stats.saves} saves (${T.saves.tier1} MLB baseline)` });
  }

  // ERA is a rate stat - no scaling needed
  if (stats.era <= T.eraMax.tier2 && stats.era > 0) {
    results.push({ eventType: 'SEASON_SUB_1_5_ERA', threshold: 1.5, currentValue: stats.era, tier: 2, description: `${stats.era.toFixed(2)} ERA` });
  } else if (stats.era <= T.eraMax.tier1 && stats.era > 0) {
    results.push({ eventType: 'SEASON_SUB_2_ERA', threshold: 2.0, currentValue: stats.era, tier: 1, description: `${stats.era.toFixed(2)} ERA` });
  }

  // Pitching Triple Crown - no scaling (league leadership)
  if (stats.isLeagueLeaderWins && stats.isLeagueLeaderK && stats.isLeagueLeaderERA) {
    results.push({ eventType: 'SEASON_PITCHING_TRIPLE_CROWN', threshold: 0, currentValue: 1, tier: 1, description: 'Pitching Triple Crown!' });
  }

  return results;
}

/**
 * Detect season negative milestones
 *
 * Thresholds are MLB BASELINE values, scaled at RUNTIME based on config.
 *
 * @param stats - Current season stats
 * @param config - Franchise milestone config (gamesPerSeason, inningsPerGame)
 * @returns Array of milestone results
 */
export function detectSeasonNegativeMilestones(
  stats: SeasonStats,
  config: MilestoneConfig = DEFAULT_FAME_CONFIG
): MilestoneResult[] {
  const results: MilestoneResult[] = [];
  const T = SEASON_THRESHOLDS; // MLB baseline thresholds

  // Helper for opportunity-based scaling (games × innings)
  const scaleOpp = (threshold: number) => scaleMilestoneThreshold(threshold, 'opportunity', config);
  // Helper for per-game scaling (games only)
  const scalePerGame = (threshold: number) => scaleMilestoneThreshold(threshold, 'per-game', config);

  // Batting negative (opportunity-based - more innings = more ABs)
  const scaledK1 = scaleOpp(T.strikeoutsBatter.tier1);
  const scaledK2 = scaleOpp(T.strikeoutsBatter.tier2);
  if (stats.strikeoutsBatter >= scaledK2) {
    results.push({ eventType: 'SEASON_250_K_BATTER', threshold: scaledK2, currentValue: stats.strikeoutsBatter, tier: 2, description: `${stats.strikeoutsBatter} K (${T.strikeoutsBatter.tier2} MLB baseline)` });
  } else if (stats.strikeoutsBatter >= scaledK1) {
    results.push({ eventType: 'SEASON_200_K_BATTER', threshold: scaledK1, currentValue: stats.strikeoutsBatter, tier: 1, description: `${stats.strikeoutsBatter} K (${T.strikeoutsBatter.tier1} MLB baseline)` });
  }

  // Rate stat - no scaling needed
  if (stats.battingAverage < T.battingAverageMin.tier1 && stats.battingAverage > 0) {
    results.push({ eventType: 'SEASON_SUB_200_BA', threshold: 0.200, currentValue: stats.battingAverage, tier: 1, description: `${stats.battingAverage.toFixed(3)} BA` });
  }

  // GIDP is opportunity-based (more ABs = more DP chances)
  const scaledGIDP = scaleOpp(T.gidp.tier1);
  if (stats.gidp >= scaledGIDP) {
    results.push({ eventType: 'SEASON_30_GIDP', threshold: scaledGIDP, currentValue: stats.gidp, tier: 1, description: `${stats.gidp} GIDP (${T.gidp.tier1} MLB baseline)` });
  }

  // Errors are opportunity-based (more innings = more fielding chances)
  const scaledErrors = scaleOpp(T.errors.tier1);
  if (stats.errors >= scaledErrors) {
    results.push({ eventType: 'SEASON_20_ERRORS', threshold: scaledErrors, currentValue: stats.errors, tier: 1, description: `${stats.errors} errors (${T.errors.tier1} MLB baseline)` });
  }

  // Pitching negative
  // Losses are per-game (max 1 per game)
  const scaledLosses = scalePerGame(T.losses.tier1);
  if (stats.losses >= scaledLosses) {
    results.push({ eventType: 'SEASON_20_LOSSES', threshold: scaledLosses, currentValue: stats.losses, tier: 1, description: `${stats.losses} losses (${T.losses.tier1} MLB baseline)` });
  }

  // ERA is a rate stat - no scaling needed
  if (stats.era >= T.eraMin.tier1) {
    results.push({ eventType: 'SEASON_6_ERA', threshold: 6.0, currentValue: stats.era, tier: 1, description: `${stats.era.toFixed(2)} ERA` });
  }

  // Walks issued is opportunity-based (more innings = more chances)
  const scaledBB = scaleOpp(T.walksIssued.tier1);
  if (stats.walksIssued >= scaledBB) {
    results.push({ eventType: 'SEASON_100_BB', threshold: scaledBB, currentValue: stats.walksIssued, tier: 1, description: `${stats.walksIssued} BB (${T.walksIssued.tier1} MLB baseline)` });
  }

  // Blown saves are per-game (max 1 per game)
  const scaledBS = scalePerGame(T.blownSaves.tier1);
  if (stats.blownSaves >= scaledBS) {
    results.push({ eventType: 'SEASON_20_BLOWN_SAVES', threshold: scaledBS, currentValue: stats.blownSaves, tier: 1, description: `${stats.blownSaves} blown saves (${T.blownSaves.tier1} MLB baseline)` });
  }

  // HR allowed is opportunity-based (more innings = more batters faced)
  const scaledHRA = scaleOpp(T.homeRunsAllowed.tier1);
  if (stats.homeRunsAllowed >= scaledHRA) {
    results.push({ eventType: 'SEASON_40_HR_ALLOWED', threshold: scaledHRA, currentValue: stats.homeRunsAllowed, tier: 1, description: `${stats.homeRunsAllowed} HR allowed (${T.homeRunsAllowed.tier1} MLB baseline)` });
  }

  return results;
}

// ============================================
// FIRST CAREER DETECTION
// ============================================

/**
 * Detect first career achievements (hit, HR, win, save, etc.)
 */
export function detectFirstCareer(
  statType: 'hit' | 'homeRun' | 'rbi' | 'win' | 'save' | 'strikeout',
  currentCareerTotal: number,
  previousCareerTotal: number
): MilestoneResult | null {
  if (currentCareerTotal === 1 && previousCareerTotal === 0) {
    const descriptions: Record<string, string> = {
      hit: 'First career hit!',
      homeRun: 'First career home run!',
      rbi: 'First career RBI!',
      win: 'First career win!',
      save: 'First career save!',
      strikeout: 'First career strikeout!',
    };

    return {
      eventType: 'FIRST_CAREER',
      threshold: 1,
      currentValue: 1,
      tier: 1,
      description: descriptions[statType],
    };
  }
  return null;
}

// ============================================
// CHAMPIONSHIP FAME
// ============================================

/**
 * Championship Fame Bonus Result
 * All championship roster players get +1 Fame per SEASON_END_FIGMA_SPEC.md
 */
export interface ChampionshipFameBonus {
  playerId: string;
  playerName: string;
  fameBefore: number;
  fameAfter: number;
  bonusApplied: number;
}

/**
 * Apply championship fame bonus to all roster players.
 * +1 Fame to each player on the winning roster.
 *
 * @param roster - Array of players with current fame values
 * @returns Array of fame bonus results showing before/after
 */
export function applyChampionshipFame(
  roster: Array<{ playerId: string; playerName: string; currentFame: number }>
): ChampionshipFameBonus[] {
  return roster.map((player) => ({
    playerId: player.playerId,
    playerName: player.playerName,
    fameBefore: player.currentFame,
    fameAfter: player.currentFame + 1,
    bonusApplied: 1,
  }));
}

// ============================================
// FAILED HR ROBBERY DETECTION (GAP-B3-017)
// ============================================

/**
 * Determine if the user should be prompted about a potential robbery attempt.
 * Only prompts on HRs that reach deep zones (y >= 0.85 normalized depth).
 * If no zone depth is provided, defaults to prompting (HR could be near wall).
 */
export function shouldPromptForRobbery(
  result: string,
  zoneDepth?: number,
): boolean {
  if (result !== 'HR') return false;
  if (zoneDepth === undefined) return true;
  return zoneDepth >= 0.85;
}

/**
 * Evaluate the outcome of a robbery attempt.
 * Returns 'FAILED_ROBBERY' if the fielder attempted but failed,
 * null otherwise (not attempted, or attempted and succeeded — success is a ROBBERY bonus).
 */
export function evaluateFailedRobbery(
  attempted: boolean,
  failed: boolean,
): 'FAILED_ROBBERY' | null {
  if (attempted && failed) return 'FAILED_ROBBERY';
  return null;
}

// ============================================
// EXPORTS
// ============================================

export {
  FAME_VALUES,
};
