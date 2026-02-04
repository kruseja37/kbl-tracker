/**
 * Milestone Detector
 * Per MILESTONE_SYSTEM_SPEC.md - Detection logic for season and career milestones
 *
 * Detects when players cross threshold values for season or career stats.
 * Supports adaptive scaling for shorter seasons (e.g., 128-game SMB4 seasons).
 */

import type { FameEventType } from '../app/types/game';
import { FAME_VALUES } from '../app/types/game';
import type {
  PlayerCareerBatting,
  PlayerCareerPitching,
  CareerMilestone,
} from './careerStorage';
import type {
  PlayerSeasonBatting,
  PlayerSeasonPitching,
} from './seasonStorage';

// ============================================
// CONFIGURATION
// ============================================

/**
 * Franchise milestone configuration
 *
 * Scaling is based on two factors:
 * 1. Season length: gamesPerSeason / MLB_BASELINE_GAMES (e.g., 128/162 = 0.79)
 * 2. Game length: inningsPerGame / MLB_BASELINE_INNINGS (e.g., 6/9 = 0.67)
 *
 * Combined scaling for per-game stats (pitching especially):
 *   seasonFactor × inningsFactor = 0.79 × 0.67 = 0.53
 *
 * For counting stats accumulated over a season:
 *   Just use seasonFactor (0.79)
 *
 * For career stats:
 *   Use seasonFactor (assumes same season length throughout career)
 */
export interface MilestoneConfig {
  gamesPerSeason: number;    // Games per season (default: 128 for SMB4)
  inningsPerGame: number;    // Innings per game (default: 6 for SMB4)
}

// MLB baseline values for scaling calculations
export const MLB_BASELINE_GAMES = 162;
export const MLB_BASELINE_INNINGS = 9;

// SMB4 default values
export const SMB4_DEFAULT_GAMES = 128;
export const SMB4_DEFAULT_INNINGS = 6;

const DEFAULT_CONFIG: MilestoneConfig = {
  gamesPerSeason: SMB4_DEFAULT_GAMES,
  inningsPerGame: SMB4_DEFAULT_INNINGS,
};

/**
 * Get season-length scaling factor
 * e.g., 128/162 = 0.79 for SMB4 default season
 */
export function getSeasonScalingFactor(config: MilestoneConfig): number {
  return config.gamesPerSeason / MLB_BASELINE_GAMES;
}

/**
 * Get innings-per-game scaling factor
 * e.g., 6/9 = 0.67 for SMB4 default games
 */
export function getInningsScalingFactor(config: MilestoneConfig): number {
  return config.inningsPerGame / MLB_BASELINE_INNINGS;
}

/**
 * Get combined scaling factor (for per-game pitching stats like IP)
 * e.g., 0.79 × 0.67 = 0.53
 */
export function getCombinedScalingFactor(config: MilestoneConfig): number {
  return getSeasonScalingFactor(config) * getInningsScalingFactor(config);
}

/**
 * @deprecated Use getSeasonScalingFactor instead
 */
export function getScalingFactor(config: MilestoneConfig): number {
  return getSeasonScalingFactor(config);
}

/**
 * Scale a counting stat threshold for shorter seasons
 * Used for: HR, Hits, RBI, SB, Wins, Saves, K (batter), etc.
 */
export function scaleCountingThreshold(threshold: number, config: MilestoneConfig): number {
  return Math.round(threshold * getSeasonScalingFactor(config));
}

/**
 * Scale an innings-based threshold for shorter games AND seasons
 * Used for: IP, pitching K (somewhat), CG, Shutouts
 */
export function scaleInningsThreshold(threshold: number, config: MilestoneConfig): number {
  return Math.round(threshold * getCombinedScalingFactor(config));
}

/**
 * @deprecated Use scaleCountingThreshold instead
 */
export function scaleThreshold(threshold: number, config: MilestoneConfig): number {
  return scaleCountingThreshold(threshold, config);
}

// ============================================
// SEASON MILESTONE THRESHOLDS
// ============================================

// Batting thresholds (MLB baseline)
export const SEASON_BATTING_THRESHOLDS = {
  // Home Runs
  homeRuns: [
    { threshold: 40, eventType: 'SEASON_40_HR' as FameEventType, description: '40 Home Run Season' },
    { threshold: 45, eventType: 'SEASON_45_HR' as FameEventType, description: '45 Home Run Season' },
    { threshold: 55, eventType: 'SEASON_55_HR' as FameEventType, description: '55+ Home Run Season' },
  ],
  // Hits
  hits: [
    { threshold: 160, eventType: 'SEASON_160_HITS' as FameEventType, description: '160 Hit Season' },
  ],
  // RBI
  rbi: [
    { threshold: 120, eventType: 'SEASON_120_RBI' as FameEventType, description: '120 RBI Season' },
  ],
  // Stolen Bases
  stolenBases: [
    { threshold: 40, eventType: 'SEASON_40_SB' as FameEventType, description: '40 Stolen Base Season' },
    { threshold: 80, eventType: 'SEASON_80_SB' as FameEventType, description: '80 Stolen Base Season' },
  ],
  // Strikeouts (negative)
  strikeouts: [
    { threshold: 200, eventType: 'SEASON_200_K_BATTER' as FameEventType, description: '200 Strikeout Season' },
    { threshold: 250, eventType: 'SEASON_250_K_BATTER' as FameEventType, description: '250 Strikeout Season' },
  ],
  // GIDP (negative)
  gidp: [
    { threshold: 30, eventType: 'SEASON_30_GIDP' as FameEventType, description: '30 GIDP Season' },
  ],
};

// Pitching thresholds (MLB baseline)
export const SEASON_PITCHING_THRESHOLDS = {
  // Wins
  wins: [
    { threshold: 15, eventType: 'SEASON_15_WINS' as FameEventType, description: '15-Win Season' },
    { threshold: 20, eventType: 'SEASON_20_WINS' as FameEventType, description: '20-Win Season' },
    { threshold: 25, eventType: 'SEASON_25_WINS' as FameEventType, description: '25-Win Season' },
  ],
  // Strikeouts
  strikeouts: [
    { threshold: 235, eventType: 'SEASON_235_K' as FameEventType, description: '235 Strikeout Season' },
  ],
  // Saves
  saves: [
    { threshold: 40, eventType: 'SEASON_40_SAVES' as FameEventType, description: '40-Save Season' },
  ],
  // Losses (negative)
  losses: [
    { threshold: 20, eventType: 'SEASON_20_LOSSES' as FameEventType, description: '20-Loss Season' },
  ],
  // Walks issued (negative)
  walksAllowed: [
    { threshold: 100, eventType: 'SEASON_100_BB' as FameEventType, description: '100 Walk Season' },
  ],
  // Blown Saves (negative)
  blownSaves: [
    { threshold: 20, eventType: 'SEASON_20_BLOWN_SAVES' as FameEventType, description: '20 Blown Save Season' },
  ],
  // HR Allowed (negative)
  homeRunsAllowed: [
    { threshold: 40, eventType: 'SEASON_40_HR_ALLOWED' as FameEventType, description: '40 HR Allowed Season' },
  ],
};

// HR-SB Club thresholds
export const CLUB_THRESHOLDS = [
  { hr: 15, sb: 15, eventType: 'CLUB_15_15' as FameEventType, description: '15-15 Club' },
  { hr: 20, sb: 20, eventType: 'CLUB_20_20' as FameEventType, description: '20-20 Club' },
  { hr: 25, sb: 25, eventType: 'CLUB_25_25' as FameEventType, description: '25-25 Club' },
  { hr: 30, sb: 30, eventType: 'CLUB_30_30' as FameEventType, description: '30-30 Club' },
  { hr: 40, sb: 40, eventType: 'CLUB_40_40' as FameEventType, description: '40-40 Club' },
];

// Rate-based thresholds (not scaled - they're ratios)
export const RATE_THRESHOLDS = {
  // Batting Average (requires min AB)
  battingAvg: [
    { threshold: 0.400, minAB: 200, eventType: 'SEASON_400_BA' as FameEventType, description: '.400 Batting Average' },
  ],
  battingAvgNegative: [
    { threshold: 0.200, minAB: 200, eventType: 'SEASON_SUB_200_BA' as FameEventType, description: 'Sub-.200 Batting Average' },
  ],
  // ERA (requires min IP)
  era: [
    { threshold: 2.00, minIP: 100, eventType: 'SEASON_SUB_2_ERA' as FameEventType, description: 'Sub-2.00 ERA' },
    { threshold: 1.50, minIP: 100, eventType: 'SEASON_SUB_1_5_ERA' as FameEventType, description: 'Sub-1.50 ERA' },
  ],
  eraNegative: [
    { threshold: 6.00, minIP: 50, eventType: 'SEASON_6_ERA' as FameEventType, description: '6.00+ ERA' },
  ],
};

// ============================================
// CAREER MILESTONE TIERS
// ============================================

export interface CareerTier {
  threshold: number;
  tier: number;
  fameMultiplier: number;
}

// ============================================
// CAREER MILESTONE THRESHOLDS (MLB BASELINE)
// ============================================
// These are stored as MLB baseline values (162 games, 9 innings)
// They get scaled at runtime based on franchise configuration
// Use scaleCountingThreshold() for counting stats
// Use scaleInningsThreshold() for innings-based stats

// Batting career milestones (MLB baseline values)
export const CAREER_BATTING_TIERS: Record<string, { stat: string; tiers: CareerTier[]; eventType: FameEventType; scalingType: 'counting' | 'innings' }> = {
  homeRuns: {
    stat: 'homeRuns',
    eventType: 'CAREER_HR_TIER',
    scalingType: 'counting',
    // MLB thresholds: 25, 50, 100, 150, 200, 250, 300, 400, 500, 600, 700
    tiers: [
      { threshold: 25, tier: 1, fameMultiplier: 0.25 },
      { threshold: 50, tier: 2, fameMultiplier: 0.5 },
      { threshold: 100, tier: 3, fameMultiplier: 1 },
      { threshold: 150, tier: 4, fameMultiplier: 1 },
      { threshold: 200, tier: 5, fameMultiplier: 1.5 },
      { threshold: 250, tier: 6, fameMultiplier: 2 },
      { threshold: 300, tier: 7, fameMultiplier: 3 },
      { threshold: 400, tier: 8, fameMultiplier: 4 },
      { threshold: 500, tier: 9, fameMultiplier: 6 },
      { threshold: 600, tier: 10, fameMultiplier: 8 },
      { threshold: 700, tier: 11, fameMultiplier: 10 },
    ],
  },
  hits: {
    stat: 'hits',
    eventType: 'CAREER_HITS_TIER',
    scalingType: 'counting',
    // MLB thresholds: 250, 500, 1000, 1500, 2000, 2500, 3000
    tiers: [
      { threshold: 250, tier: 1, fameMultiplier: 0.25 },
      { threshold: 500, tier: 2, fameMultiplier: 0.5 },
      { threshold: 1000, tier: 3, fameMultiplier: 1 },
      { threshold: 1500, tier: 4, fameMultiplier: 1.5 },
      { threshold: 2000, tier: 5, fameMultiplier: 2.5 },
      { threshold: 2500, tier: 6, fameMultiplier: 4 },
      { threshold: 3000, tier: 7, fameMultiplier: 6 },
    ],
  },
  rbi: {
    stat: 'rbi',
    eventType: 'CAREER_RBI_TIER',
    scalingType: 'counting',
    // MLB thresholds: 250, 500, 750, 1000, 1500, 2000
    tiers: [
      { threshold: 250, tier: 1, fameMultiplier: 0.25 },
      { threshold: 500, tier: 2, fameMultiplier: 0.5 },
      { threshold: 750, tier: 3, fameMultiplier: 0.75 },
      { threshold: 1000, tier: 4, fameMultiplier: 1 },
      { threshold: 1500, tier: 5, fameMultiplier: 1.5 },
      { threshold: 2000, tier: 6, fameMultiplier: 2 },
    ],
  },
  runs: {
    stat: 'runs',
    eventType: 'CAREER_RUNS_TIER',
    scalingType: 'counting',
    // MLB thresholds: 250, 500, 750, 1000, 1500, 2000
    tiers: [
      { threshold: 250, tier: 1, fameMultiplier: 0.25 },
      { threshold: 500, tier: 2, fameMultiplier: 0.5 },
      { threshold: 750, tier: 3, fameMultiplier: 0.75 },
      { threshold: 1000, tier: 4, fameMultiplier: 1 },
      { threshold: 1500, tier: 5, fameMultiplier: 1.5 },
      { threshold: 2000, tier: 6, fameMultiplier: 2 },
    ],
  },
  stolenBases: {
    stat: 'stolenBases',
    eventType: 'CAREER_SB_TIER',
    scalingType: 'counting',
    // MLB thresholds: 50, 100, 200, 300, 400, 500
    tiers: [
      { threshold: 50, tier: 1, fameMultiplier: 0.25 },
      { threshold: 100, tier: 2, fameMultiplier: 0.5 },
      { threshold: 200, tier: 3, fameMultiplier: 1 },
      { threshold: 300, tier: 4, fameMultiplier: 1.5 },
      { threshold: 400, tier: 5, fameMultiplier: 2 },
      { threshold: 500, tier: 6, fameMultiplier: 3 },
    ],
  },
  doubles: {
    stat: 'doubles',
    eventType: 'CAREER_DOUBLES_TIER',
    scalingType: 'counting',
    // MLB thresholds: 100, 200, 300, 400, 500, 600
    tiers: [
      { threshold: 100, tier: 1, fameMultiplier: 0.25 },
      { threshold: 200, tier: 2, fameMultiplier: 0.5 },
      { threshold: 300, tier: 3, fameMultiplier: 1 },
      { threshold: 400, tier: 4, fameMultiplier: 1.5 },
      { threshold: 500, tier: 5, fameMultiplier: 2 },
      { threshold: 600, tier: 6, fameMultiplier: 2.5 },
    ],
  },
  walks: {
    stat: 'walks',
    eventType: 'CAREER_BB_TIER',
    scalingType: 'counting',
    // MLB thresholds: 250, 500, 750, 1000, 1500, 2000
    tiers: [
      { threshold: 250, tier: 1, fameMultiplier: 0.25 },
      { threshold: 500, tier: 2, fameMultiplier: 0.5 },
      { threshold: 750, tier: 3, fameMultiplier: 0.75 },
      { threshold: 1000, tier: 4, fameMultiplier: 1 },
      { threshold: 1500, tier: 5, fameMultiplier: 1.5 },
      { threshold: 2000, tier: 6, fameMultiplier: 2 },
    ],
  },
  grandSlams: {
    stat: 'grandSlams',
    eventType: 'CAREER_GRAND_SLAMS_TIER',
    scalingType: 'counting',
    // MLB thresholds: 5, 10, 15, 20, 25 (rare events, minimal scaling)
    tiers: [
      { threshold: 5, tier: 1, fameMultiplier: 0.5 },
      { threshold: 10, tier: 2, fameMultiplier: 1 },
      { threshold: 15, tier: 3, fameMultiplier: 1.5 },
      { threshold: 20, tier: 4, fameMultiplier: 2 },
      { threshold: 25, tier: 5, fameMultiplier: 3 },
    ],
  },
};

// Pitching career milestones (MLB baseline values)
export const CAREER_PITCHING_TIERS: Record<string, { stat: string; tiers: CareerTier[]; eventType: FameEventType; scalingType: 'counting' | 'innings' }> = {
  wins: {
    stat: 'wins',
    eventType: 'CAREER_WINS_TIER',
    scalingType: 'counting',
    // MLB thresholds: 25, 50, 100, 150, 200, 250, 300
    tiers: [
      { threshold: 25, tier: 1, fameMultiplier: 0.25 },
      { threshold: 50, tier: 2, fameMultiplier: 0.5 },
      { threshold: 100, tier: 3, fameMultiplier: 1 },
      { threshold: 150, tier: 4, fameMultiplier: 1.5 },
      { threshold: 200, tier: 5, fameMultiplier: 3 },
      { threshold: 250, tier: 6, fameMultiplier: 4 },
      { threshold: 300, tier: 7, fameMultiplier: 6 },
    ],
  },
  strikeouts: {
    stat: 'strikeouts',
    eventType: 'CAREER_K_TIER',
    scalingType: 'innings',  // K accumulate faster in shorter games (more K/IP in SMB4)
    // MLB thresholds: 250, 500, 1000, 1500, 2000, 2500, 3000
    tiers: [
      { threshold: 250, tier: 1, fameMultiplier: 0.25 },
      { threshold: 500, tier: 2, fameMultiplier: 0.5 },
      { threshold: 1000, tier: 3, fameMultiplier: 1 },
      { threshold: 1500, tier: 4, fameMultiplier: 1.5 },
      { threshold: 2000, tier: 5, fameMultiplier: 2.5 },
      { threshold: 2500, tier: 6, fameMultiplier: 4 },
      { threshold: 3000, tier: 7, fameMultiplier: 6 },
    ],
  },
  saves: {
    stat: 'saves',
    eventType: 'CAREER_SAVES_TIER',
    scalingType: 'counting',
    // MLB thresholds: 50, 100, 150, 200, 250, 300, 400, 500
    tiers: [
      { threshold: 50, tier: 1, fameMultiplier: 0.5 },
      { threshold: 100, tier: 2, fameMultiplier: 1 },
      { threshold: 150, tier: 3, fameMultiplier: 1.5 },
      { threshold: 200, tier: 4, fameMultiplier: 2 },
      { threshold: 250, tier: 5, fameMultiplier: 3 },
      { threshold: 300, tier: 6, fameMultiplier: 4 },
      { threshold: 400, tier: 7, fameMultiplier: 5 },
      { threshold: 500, tier: 8, fameMultiplier: 7 },
    ],
  },
  inningsPitched: {
    stat: 'inningsPitched',
    eventType: 'CAREER_IP_TIER',
    scalingType: 'innings',  // Directly affected by both season length AND innings/game
    // MLB thresholds: 500, 1000, 1500, 2000, 2500, 3000
    tiers: [
      { threshold: 500, tier: 1, fameMultiplier: 0.25 },
      { threshold: 1000, tier: 2, fameMultiplier: 0.5 },
      { threshold: 1500, tier: 3, fameMultiplier: 1 },
      { threshold: 2000, tier: 4, fameMultiplier: 1.5 },
      { threshold: 2500, tier: 5, fameMultiplier: 2 },
      { threshold: 3000, tier: 6, fameMultiplier: 2.5 },
    ],
  },
  shutouts: {
    stat: 'shutouts',
    eventType: 'CAREER_SHUTOUTS_TIER',
    scalingType: 'counting',  // Shutouts are per-game events
    // MLB thresholds: 10, 20, 30, 40, 50, 60
    tiers: [
      { threshold: 10, tier: 1, fameMultiplier: 0.5 },
      { threshold: 20, tier: 2, fameMultiplier: 1 },
      { threshold: 30, tier: 3, fameMultiplier: 1.5 },
      { threshold: 40, tier: 4, fameMultiplier: 2 },
      { threshold: 50, tier: 5, fameMultiplier: 3 },
      { threshold: 60, tier: 6, fameMultiplier: 4 },
    ],
  },
  completeGames: {
    stat: 'completeGames',
    eventType: 'CAREER_CG_TIER',
    scalingType: 'counting',
    // MLB thresholds: 25, 50, 75, 100, 150
    tiers: [
      { threshold: 25, tier: 1, fameMultiplier: 0.5 },
      { threshold: 50, tier: 2, fameMultiplier: 1 },
      { threshold: 75, tier: 3, fameMultiplier: 1.5 },
      { threshold: 100, tier: 4, fameMultiplier: 2 },
      { threshold: 150, tier: 5, fameMultiplier: 3 },
    ],
  },
  noHitters: {
    stat: 'noHitters',
    eventType: 'CAREER_NO_HITTERS_TIER',
    scalingType: 'counting',  // Rare events - no scaling (1 is 1)
    // MLB thresholds: 1, 2, 3, 4, 5, 6, 7
    tiers: [
      { threshold: 1, tier: 1, fameMultiplier: 2 },
      { threshold: 2, tier: 2, fameMultiplier: 3 },
      { threshold: 3, tier: 3, fameMultiplier: 4 },
      { threshold: 4, tier: 4, fameMultiplier: 5 },
      { threshold: 5, tier: 5, fameMultiplier: 6 },
      { threshold: 6, tier: 6, fameMultiplier: 7 },
      { threshold: 7, tier: 7, fameMultiplier: 8 },
    ],
  },
  perfectGames: {
    stat: 'perfectGames',
    eventType: 'CAREER_PERFECT_GAMES_TIER',
    scalingType: 'counting',  // Rare events - no scaling
    // MLB thresholds: 1, 2
    tiers: [
      { threshold: 1, tier: 1, fameMultiplier: 5 },
      { threshold: 2, tier: 2, fameMultiplier: 8 },
    ],
  },
};

// Aggregate career milestones (WAR, Games, All-Stars, Awards)
// MLB baseline values - scaled at runtime
export const CAREER_AGGREGATE_TIERS: Record<string, { stat: string; tiers: CareerTier[]; eventType: FameEventType; scalingType: 'counting' | 'innings' | 'none' }> = {
  war: {
    stat: 'war',
    eventType: 'CAREER_WAR_TIER',
    scalingType: 'counting',  // WAR scales with season length
    // MLB thresholds: 10, 20, 30, 40, 50, 60, 70, 80, 100
    tiers: [
      { threshold: 10, tier: 1, fameMultiplier: 0.5 },
      { threshold: 20, tier: 2, fameMultiplier: 1 },
      { threshold: 30, tier: 3, fameMultiplier: 2 },
      { threshold: 40, tier: 4, fameMultiplier: 3 },
      { threshold: 50, tier: 5, fameMultiplier: 5 },
      { threshold: 60, tier: 6, fameMultiplier: 6 },
      { threshold: 70, tier: 7, fameMultiplier: 8 },
      { threshold: 80, tier: 8, fameMultiplier: 10 },
      { threshold: 100, tier: 9, fameMultiplier: 15 },
    ],
  },
  games: {
    stat: 'games',
    eventType: 'CAREER_GAMES_TIER',
    scalingType: 'counting',
    // MLB thresholds: 250, 500, 750, 1000, 1500, 2000
    tiers: [
      { threshold: 250, tier: 1, fameMultiplier: 0.25 },
      { threshold: 500, tier: 2, fameMultiplier: 0.5 },
      { threshold: 750, tier: 3, fameMultiplier: 0.75 },
      { threshold: 1000, tier: 4, fameMultiplier: 1 },
      { threshold: 1500, tier: 5, fameMultiplier: 1.5 },
      { threshold: 2000, tier: 6, fameMultiplier: 2 },
    ],
  },
  allStarSelections: {
    stat: 'allStarSelections',
    eventType: 'CAREER_ALL_STARS_TIER',
    scalingType: 'none',  // 1 per season regardless of season length
    // Thresholds: 1, 3, 5, 7, 10, 12, 15
    tiers: [
      { threshold: 1, tier: 1, fameMultiplier: 0.5 },
      { threshold: 3, tier: 2, fameMultiplier: 1 },
      { threshold: 5, tier: 3, fameMultiplier: 1.5 },
      { threshold: 7, tier: 4, fameMultiplier: 2.5 },
      { threshold: 10, tier: 5, fameMultiplier: 4 },
      { threshold: 12, tier: 6, fameMultiplier: 5 },
      { threshold: 15, tier: 7, fameMultiplier: 7 },
    ],
  },
  mvpAwards: {
    stat: 'mvpAwards',
    eventType: 'CAREER_MVPS_TIER',
    scalingType: 'none',  // 1 per season regardless of season length
    // Thresholds: 1, 2, 3, 4
    tiers: [
      { threshold: 1, tier: 1, fameMultiplier: 2 },
      { threshold: 2, tier: 2, fameMultiplier: 4 },
      { threshold: 3, tier: 3, fameMultiplier: 7 },
      { threshold: 4, tier: 4, fameMultiplier: 10 },
    ],
  },
  cyYoungAwards: {
    stat: 'cyYoungAwards',
    eventType: 'CAREER_CY_YOUNGS_TIER',
    scalingType: 'none',  // 1 per season regardless of season length
    // Thresholds: 1, 2, 3, 4, 5
    tiers: [
      { threshold: 1, tier: 1, fameMultiplier: 2 },
      { threshold: 2, tier: 2, fameMultiplier: 4 },
      { threshold: 3, tier: 3, fameMultiplier: 7 },
      { threshold: 4, tier: 4, fameMultiplier: 10 },
      { threshold: 5, tier: 5, fameMultiplier: 12 },
    ],
  },
};

// ============================================
// WAR COMPONENT CAREER MILESTONES
// Per MILESTONE_SYSTEM_SPEC.md Section 5.1
// These track excellence in specific WAR components
// ============================================

export const CAREER_WAR_COMPONENT_TIERS: Record<string, {
  stat: string;
  tiers: CareerTier[];
  eventType: FameEventType;
  scalingType: 'counting' | 'none';
  description: string;
}> = {
  /**
   * Career bWAR (Batting WAR)
   * Measures offensive contribution via wOBA → wRAA → Batting Runs
   * Thresholds: 5, 15, 25, 35, 50, 65
   */
  bWAR: {
    stat: 'bWAR',
    eventType: 'CAREER_BWAR_TIER' as FameEventType,
    scalingType: 'counting',  // WAR scales with season length
    description: 'Career Batting WAR',
    tiers: [
      { threshold: 5, tier: 1, fameMultiplier: 0.5 },
      { threshold: 15, tier: 2, fameMultiplier: 1.0 },
      { threshold: 25, tier: 3, fameMultiplier: 2.0 },
      { threshold: 35, tier: 4, fameMultiplier: 3.0 },
      { threshold: 50, tier: 5, fameMultiplier: 5.0 },
      { threshold: 65, tier: 6, fameMultiplier: 7.0 },
    ],
  },

  /**
   * Career pWAR (Pitching WAR)
   * Measures pitching contribution via FIP-based value
   * Thresholds: 5, 15, 25, 35, 50, 65
   */
  pWAR: {
    stat: 'pWAR',
    eventType: 'CAREER_PWAR_TIER' as FameEventType,
    scalingType: 'counting',  // WAR scales with season length
    description: 'Career Pitching WAR',
    tiers: [
      { threshold: 5, tier: 1, fameMultiplier: 0.5 },
      { threshold: 15, tier: 2, fameMultiplier: 1.0 },
      { threshold: 25, tier: 3, fameMultiplier: 2.0 },
      { threshold: 35, tier: 4, fameMultiplier: 3.0 },
      { threshold: 50, tier: 5, fameMultiplier: 5.0 },
      { threshold: 65, tier: 6, fameMultiplier: 7.0 },
    ],
  },

  /**
   * Career fWAR (Fielding WAR)
   * Measures defensive contribution via per-play OAA-style calculation
   * Thresholds: 3, 8, 15, 22, 30 (lower than other components)
   * Design note: 30 career fWAR would be historically elite (Ozzie Smith level)
   */
  fWAR: {
    stat: 'fWAR',
    eventType: 'CAREER_FWAR_TIER' as FameEventType,
    scalingType: 'counting',  // WAR scales with season length
    description: 'Career Fielding WAR',
    tiers: [
      { threshold: 3, tier: 1, fameMultiplier: 0.5 },
      { threshold: 8, tier: 2, fameMultiplier: 1.0 },
      { threshold: 15, tier: 3, fameMultiplier: 2.0 },
      { threshold: 22, tier: 4, fameMultiplier: 3.0 },
      { threshold: 30, tier: 5, fameMultiplier: 5.0 },
    ],
  },

  /**
   * Career rWAR (Baserunning WAR)
   * Measures baserunning contribution via wSB + UBR + wGDP
   * Thresholds: 2, 5, 10, 15, 20 (lowest thresholds - hardest to accumulate)
   * Design note: 20 career rWAR would be an all-time baserunning legend
   */
  rWAR: {
    stat: 'rWAR',
    eventType: 'CAREER_RWAR_TIER' as FameEventType,
    scalingType: 'counting',  // WAR scales with season length
    description: 'Career Baserunning WAR',
    tiers: [
      { threshold: 2, tier: 1, fameMultiplier: 0.5 },
      { threshold: 5, tier: 2, fameMultiplier: 1.0 },
      { threshold: 10, tier: 3, fameMultiplier: 1.5 },
      { threshold: 15, tier: 4, fameMultiplier: 2.5 },
      { threshold: 20, tier: 5, fameMultiplier: 4.0 },
    ],
  },
};

// Negative career milestones (MLB baseline values)
export const CAREER_NEGATIVE_TIERS: Record<string, { stat: string; tiers: CareerTier[]; eventType: FameEventType; scalingType: 'counting' | 'innings' | 'none' }> = {
  strikeoutsAsBatter: {
    stat: 'strikeouts',  // From batting stats
    eventType: 'CAREER_K_BATTER_TIER',
    scalingType: 'counting',
    // MLB thresholds: 500, 1000, 1500, 2000, 2500
    tiers: [
      { threshold: 500, tier: 1, fameMultiplier: 0.5 },
      { threshold: 1000, tier: 2, fameMultiplier: 1 },
      { threshold: 1500, tier: 3, fameMultiplier: 2 },
      { threshold: 2000, tier: 4, fameMultiplier: 3 },
      { threshold: 2500, tier: 5, fameMultiplier: 4 },
    ],
  },
  gidp: {
    stat: 'gidp',
    eventType: 'CAREER_GIDP_TIER',
    scalingType: 'counting',
    // MLB thresholds: 100, 200, 300, 400
    tiers: [
      { threshold: 100, tier: 1, fameMultiplier: 0.5 },
      { threshold: 200, tier: 2, fameMultiplier: 1 },
      { threshold: 300, tier: 3, fameMultiplier: 2 },
      { threshold: 400, tier: 4, fameMultiplier: 3 },
    ],
  },
  caughtStealing: {
    stat: 'caughtStealing',
    eventType: 'CAREER_CS_TIER',
    scalingType: 'counting',
    // MLB thresholds: 100, 150, 200, 250
    tiers: [
      { threshold: 100, tier: 1, fameMultiplier: 0.5 },
      { threshold: 150, tier: 2, fameMultiplier: 1 },
      { threshold: 200, tier: 3, fameMultiplier: 1.5 },
      { threshold: 250, tier: 4, fameMultiplier: 2 },
    ],
  },
  losses: {
    stat: 'losses',
    eventType: 'CAREER_LOSSES_TIER',
    scalingType: 'counting',
    // MLB thresholds: 100, 150, 200, 250, 300
    tiers: [
      { threshold: 100, tier: 1, fameMultiplier: 0.5 },
      { threshold: 150, tier: 2, fameMultiplier: 1 },
      { threshold: 200, tier: 3, fameMultiplier: 2 },
      { threshold: 250, tier: 4, fameMultiplier: 3 },
      { threshold: 300, tier: 5, fameMultiplier: 4 },
    ],
  },
  blownSaves: {
    stat: 'blownSaves',
    eventType: 'CAREER_BLOWN_SAVES_TIER',
    scalingType: 'counting',
    // MLB thresholds: 25, 50, 75, 100, 125
    tiers: [
      { threshold: 25, tier: 1, fameMultiplier: 1 },
      { threshold: 50, tier: 2, fameMultiplier: 2 },
      { threshold: 75, tier: 3, fameMultiplier: 3 },
      { threshold: 100, tier: 4, fameMultiplier: 4 },
      { threshold: 125, tier: 5, fameMultiplier: 6 },
    ],
  },
  wildPitches: {
    stat: 'wildPitches',
    eventType: 'CAREER_WILD_PITCHES_TIER',
    scalingType: 'innings',  // Scales with innings pitched
    // MLB thresholds: 100, 150, 200, 250, 350
    tiers: [
      { threshold: 100, tier: 1, fameMultiplier: 0.5 },
      { threshold: 150, tier: 2, fameMultiplier: 1 },
      { threshold: 200, tier: 3, fameMultiplier: 1.5 },
      { threshold: 250, tier: 4, fameMultiplier: 2 },
      { threshold: 350, tier: 5, fameMultiplier: 3 },
    ],
  },
  hitBatters: {
    stat: 'hitBatters',
    eventType: 'CAREER_HBP_PITCHER_TIER',
    scalingType: 'innings',  // Scales with innings pitched
    // MLB thresholds: 100, 150, 200, 250, 280
    tiers: [
      { threshold: 100, tier: 1, fameMultiplier: 0.5 },
      { threshold: 150, tier: 2, fameMultiplier: 1 },
      { threshold: 200, tier: 3, fameMultiplier: 1.5 },
      { threshold: 250, tier: 4, fameMultiplier: 2 },
      { threshold: 280, tier: 5, fameMultiplier: 3 },
    ],
  },
  errors: {
    stat: 'errors',
    eventType: 'CAREER_ERRORS_TIER',
    scalingType: 'counting',
    // MLB thresholds: 100, 200, 400, 600, 800, 1000
    tiers: [
      { threshold: 100, tier: 1, fameMultiplier: 0.5 },
      { threshold: 200, tier: 2, fameMultiplier: 1 },
      { threshold: 400, tier: 3, fameMultiplier: 2 },
      { threshold: 600, tier: 4, fameMultiplier: 3 },
      { threshold: 800, tier: 5, fameMultiplier: 4 },
      { threshold: 1000, tier: 6, fameMultiplier: 6 },
    ],
  },
  passedBalls: {
    stat: 'passedBalls',
    eventType: 'CAREER_PASSED_BALLS_TIER',
    scalingType: 'innings',  // Scales with innings caught
    // MLB thresholds: 50, 100, 150, 200
    tiers: [
      { threshold: 50, tier: 1, fameMultiplier: 0.5 },
      { threshold: 100, tier: 2, fameMultiplier: 1 },
      { threshold: 150, tier: 3, fameMultiplier: 2 },
      { threshold: 200, tier: 4, fameMultiplier: 3 },
    ],
  },
};

// ============================================
// DETECTION RESULTS
// ============================================

export interface MilestoneDetectionResult {
  achieved: boolean;
  eventType: FameEventType;
  statName: string;
  threshold: number;
  actualValue: number;
  tier?: number;
  fameValue: number;
  description: string;
  category: 'season' | 'career';
  isNegative: boolean;
}

// ============================================
// SEASON MILESTONE DETECTION
// ============================================

/**
 * Check for season batting milestones
 */
export function checkSeasonBattingMilestones(
  stats: PlayerSeasonBatting,
  previousStats: PlayerSeasonBatting | null,
  achievedMilestones: Set<string>,
  config: MilestoneConfig = DEFAULT_CONFIG
): MilestoneDetectionResult[] {
  const results: MilestoneDetectionResult[] = [];
  const scaleFactor = getScalingFactor(config);

  // Check counting stat thresholds
  for (const [statName, thresholds] of Object.entries(SEASON_BATTING_THRESHOLDS)) {
    const currentValue = stats[statName as keyof PlayerSeasonBatting] as number;
    const previousValue = previousStats?.[statName as keyof PlayerSeasonBatting] as number ?? 0;

    for (const { threshold, eventType, description } of thresholds) {
      const scaledThreshold = Math.round(threshold * scaleFactor);
      const milestoneKey = `${eventType}_${stats.seasonId}`;

      // Check if crossed threshold (wasn't achieved before, is now)
      if (
        currentValue >= scaledThreshold &&
        previousValue < scaledThreshold &&
        !achievedMilestones.has(milestoneKey)
      ) {
        const isNegative = FAME_VALUES[eventType] < 0;
        results.push({
          achieved: true,
          eventType,
          statName,
          threshold: scaledThreshold,
          actualValue: currentValue,
          fameValue: FAME_VALUES[eventType],
          description: `${description} (${scaledThreshold}${scaleFactor < 1 ? ' scaled' : ''})`,
          category: 'season',
          isNegative,
        });
      }
    }
  }

  // Check rate-based thresholds (batting average)
  const battingAvg = stats.ab > 0 ? stats.hits / stats.ab : 0;
  const minAB = Math.round(200 * scaleFactor);  // Scale min AB requirement too

  if (stats.ab >= minAB) {
    // Positive: .400+ BA
    for (const { threshold, eventType, description } of RATE_THRESHOLDS.battingAvg) {
      const milestoneKey = `${eventType}_${stats.seasonId}`;
      if (battingAvg >= threshold && !achievedMilestones.has(milestoneKey)) {
        results.push({
          achieved: true,
          eventType,
          statName: 'battingAverage',
          threshold,
          actualValue: battingAvg,
          fameValue: FAME_VALUES[eventType],
          description,
          category: 'season',
          isNegative: false,
        });
      }
    }

    // Negative: Sub-.200 BA (only check near end of season)
    if (stats.games >= Math.round(config.gamesPerSeason * 0.8)) {
      for (const { threshold, eventType, description } of RATE_THRESHOLDS.battingAvgNegative) {
        const milestoneKey = `${eventType}_${stats.seasonId}`;
        if (battingAvg < threshold && !achievedMilestones.has(milestoneKey)) {
          results.push({
            achieved: true,
            eventType,
            statName: 'battingAverage',
            threshold,
            actualValue: battingAvg,
            fameValue: FAME_VALUES[eventType],
            description,
            category: 'season',
            isNegative: true,
          });
        }
      }
    }
  }

  // Check HR-SB Club milestones
  for (const { hr, sb, eventType, description } of CLUB_THRESHOLDS) {
    const scaledHR = Math.round(hr * scaleFactor);
    const scaledSB = Math.round(sb * scaleFactor);
    const milestoneKey = `${eventType}_${stats.seasonId}`;

    if (
      stats.homeRuns >= scaledHR &&
      stats.stolenBases >= scaledSB &&
      !achievedMilestones.has(milestoneKey)
    ) {
      results.push({
        achieved: true,
        eventType,
        statName: 'club',
        threshold: hr,  // Report MLB baseline
        actualValue: Math.min(stats.homeRuns, stats.stolenBases),
        fameValue: FAME_VALUES[eventType],
        description: `${description} (${scaledHR}/${scaledSB}${scaleFactor < 1 ? ' scaled' : ''})`,
        category: 'season',
        isNegative: false,
      });
    }
  }

  return results;
}

/**
 * Check for season pitching milestones
 */
export function checkSeasonPitchingMilestones(
  stats: PlayerSeasonPitching,
  previousStats: PlayerSeasonPitching | null,
  achievedMilestones: Set<string>,
  config: MilestoneConfig = DEFAULT_CONFIG
): MilestoneDetectionResult[] {
  const results: MilestoneDetectionResult[] = [];
  const scaleFactor = getScalingFactor(config);

  // Check counting stat thresholds
  for (const [statName, thresholds] of Object.entries(SEASON_PITCHING_THRESHOLDS)) {
    const currentValue = stats[statName as keyof PlayerSeasonPitching] as number;
    const previousValue = previousStats?.[statName as keyof PlayerSeasonPitching] as number ?? 0;

    for (const { threshold, eventType, description } of thresholds) {
      const scaledThreshold = Math.round(threshold * scaleFactor);
      const milestoneKey = `${eventType}_${stats.seasonId}`;

      if (
        currentValue >= scaledThreshold &&
        previousValue < scaledThreshold &&
        !achievedMilestones.has(milestoneKey)
      ) {
        const isNegative = FAME_VALUES[eventType] < 0;
        results.push({
          achieved: true,
          eventType,
          statName,
          threshold: scaledThreshold,
          actualValue: currentValue,
          fameValue: FAME_VALUES[eventType],
          description: `${description} (${scaledThreshold}${scaleFactor < 1 ? ' scaled' : ''})`,
          category: 'season',
          isNegative,
        });
      }
    }
  }

  // Check ERA thresholds (rate-based)
  const ip = stats.outsRecorded / 3;
  const minIP = Math.round(100 * scaleFactor);

  if (ip >= minIP) {
    const era = (stats.earnedRuns / ip) * 9;

    // Positive: Low ERA
    for (const { threshold, eventType, description } of RATE_THRESHOLDS.era) {
      const milestoneKey = `${eventType}_${stats.seasonId}`;
      if (era <= threshold && !achievedMilestones.has(milestoneKey)) {
        results.push({
          achieved: true,
          eventType,
          statName: 'era',
          threshold,
          actualValue: era,
          fameValue: FAME_VALUES[eventType],
          description,
          category: 'season',
          isNegative: false,
        });
      }
    }

    // Negative: High ERA
    const minIPNegative = Math.round(50 * scaleFactor);
    if (ip >= minIPNegative && stats.games >= Math.round(config.gamesPerSeason * 0.5)) {
      for (const { threshold, eventType, description } of RATE_THRESHOLDS.eraNegative) {
        const milestoneKey = `${eventType}_${stats.seasonId}`;
        if (era >= threshold && !achievedMilestones.has(milestoneKey)) {
          results.push({
            achieved: true,
            eventType,
            statName: 'era',
            threshold,
            actualValue: era,
            fameValue: FAME_VALUES[eventType],
            description,
            category: 'season',
            isNegative: true,
          });
        }
      }
    }
  }

  return results;
}

// ============================================
// CAREER MILESTONE DETECTION
// ============================================

/**
 * Helper to scale a career threshold based on scaling type
 */
function scaleCareerThreshold(
  threshold: number,
  scalingType: 'counting' | 'innings' | 'none',
  config: MilestoneConfig
): number {
  switch (scalingType) {
    case 'counting':
      return scaleCountingThreshold(threshold, config);
    case 'innings':
      return scaleInningsThreshold(threshold, config);
    case 'none':
    default:
      return threshold;
  }
}

/**
 * Check for career batting milestones
 * Thresholds are stored as MLB baseline and scaled at runtime
 */
export function checkCareerBattingMilestones(
  stats: PlayerCareerBatting,
  previousStats: PlayerCareerBatting | null,
  achievedMilestones: Set<string>,
  config: MilestoneConfig = DEFAULT_CONFIG
): MilestoneDetectionResult[] {
  const results: MilestoneDetectionResult[] = [];

  // Check positive milestones
  for (const { stat, tiers, eventType, scalingType } of Object.values(CAREER_BATTING_TIERS)) {
    const currentValue = stats[stat as keyof PlayerCareerBatting] as number;
    const previousValue = previousStats?.[stat as keyof PlayerCareerBatting] as number ?? 0;

    for (const { threshold, tier, fameMultiplier } of tiers) {
      // Scale the threshold based on franchise configuration
      const scaledThreshold = scaleCareerThreshold(threshold, scalingType, config);
      const milestoneKey = `${eventType}_${scaledThreshold}`;

      if (
        currentValue >= scaledThreshold &&
        previousValue < scaledThreshold &&
        !achievedMilestones.has(milestoneKey)
      ) {
        const baseFame = FAME_VALUES[eventType];
        const scaleFactor = getSeasonScalingFactor(config);
        results.push({
          achieved: true,
          eventType,
          statName: stat,
          threshold: scaledThreshold,
          actualValue: currentValue,
          tier,
          fameValue: baseFame * fameMultiplier,
          description: `Career ${stat} milestone: ${scaledThreshold}${scaleFactor < 1 ? ` (${threshold} MLB)` : ''}`,
          category: 'career',
          isNegative: false,
        });
      }
    }
  }

  // Check negative milestones (batting stats only)
  for (const { stat, tiers, eventType, scalingType } of Object.values(CAREER_NEGATIVE_TIERS)) {
    // Skip pitching stats in batting check
    if (['losses', 'blownSaves', 'wildPitches', 'hitBatters'].includes(stat)) continue;

    const currentValue = stats[stat as keyof PlayerCareerBatting] as number;
    const previousValue = previousStats?.[stat as keyof PlayerCareerBatting] as number ?? 0;

    for (const { threshold, tier, fameMultiplier } of tiers) {
      const scaledThreshold = scaleCareerThreshold(threshold, scalingType, config);
      const milestoneKey = `${eventType}_${scaledThreshold}`;

      if (
        currentValue >= scaledThreshold &&
        previousValue < scaledThreshold &&
        !achievedMilestones.has(milestoneKey)
      ) {
        const baseFame = FAME_VALUES[eventType];
        const scaleFactor = getSeasonScalingFactor(config);
        results.push({
          achieved: true,
          eventType,
          statName: stat,
          threshold: scaledThreshold,
          actualValue: currentValue,
          tier,
          fameValue: baseFame * fameMultiplier,
          description: `Career ${stat} milestone: ${scaledThreshold}${scaleFactor < 1 ? ` (${threshold} MLB)` : ''}`,
          category: 'career',
          isNegative: true,
        });
      }
    }
  }

  return results;
}

/**
 * Check for career pitching milestones
 * Thresholds are stored as MLB baseline and scaled at runtime
 */
export function checkCareerPitchingMilestones(
  stats: PlayerCareerPitching,
  previousStats: PlayerCareerPitching | null,
  achievedMilestones: Set<string>,
  config: MilestoneConfig = DEFAULT_CONFIG
): MilestoneDetectionResult[] {
  const results: MilestoneDetectionResult[] = [];
  const scaleFactor = getSeasonScalingFactor(config);

  // Check positive milestones
  for (const { stat, tiers, eventType, scalingType } of Object.values(CAREER_PITCHING_TIERS)) {
    const currentValue = stats[stat as keyof PlayerCareerPitching] as number;
    const previousValue = previousStats?.[stat as keyof PlayerCareerPitching] as number ?? 0;

    for (const { threshold, tier, fameMultiplier } of tiers) {
      const scaledThreshold = scaleCareerThreshold(threshold, scalingType, config);
      const milestoneKey = `${eventType}_${scaledThreshold}`;

      if (
        currentValue >= scaledThreshold &&
        previousValue < scaledThreshold &&
        !achievedMilestones.has(milestoneKey)
      ) {
        const baseFame = FAME_VALUES[eventType];
        results.push({
          achieved: true,
          eventType,
          statName: stat,
          threshold: scaledThreshold,
          actualValue: currentValue,
          tier,
          fameValue: baseFame * fameMultiplier,
          description: `Career ${stat} milestone: ${scaledThreshold}${scaleFactor < 1 ? ` (${threshold} MLB)` : ''}`,
          category: 'career',
          isNegative: false,
        });
      }
    }
  }

  // Check negative milestones (pitching stats)
  for (const { stat, tiers, eventType, scalingType } of Object.values(CAREER_NEGATIVE_TIERS)) {
    // Only check pitching stats here
    if (!['losses', 'blownSaves', 'wildPitches', 'hitBatters'].includes(stat)) continue;
    if (!(stat in stats)) continue;

    const currentValue = stats[stat as keyof PlayerCareerPitching] as number;
    const previousValue = previousStats?.[stat as keyof PlayerCareerPitching] as number ?? 0;

    for (const { threshold, tier, fameMultiplier } of tiers) {
      const scaledThreshold = scaleCareerThreshold(threshold, scalingType, config);
      const milestoneKey = `${eventType}_${scaledThreshold}`;

      if (
        currentValue >= scaledThreshold &&
        previousValue < scaledThreshold &&
        !achievedMilestones.has(milestoneKey)
      ) {
        const baseFame = FAME_VALUES[eventType];
        results.push({
          achieved: true,
          eventType,
          statName: stat,
          threshold: scaledThreshold,
          actualValue: currentValue,
          tier,
          fameValue: baseFame * fameMultiplier,
          description: `Career ${stat} milestone: ${scaledThreshold}${scaleFactor < 1 ? ` (${threshold} MLB)` : ''}`,
          category: 'career',
          isNegative: true,
        });
      }
    }
  }

  return results;
}

/**
 * Check for WAR component career milestones
 * Tracks excellence in specific WAR contributions:
 * - bWAR: Batting WAR (position players)
 * - pWAR: Pitching WAR (pitchers)
 * - fWAR: Fielding WAR (all players)
 * - rWAR: Baserunning WAR (all players)
 *
 * Thresholds are stored as MLB baseline and scaled at runtime
 */
export function checkWARComponentMilestones(
  battingStats: PlayerCareerBatting | null,
  pitchingStats: PlayerCareerPitching | null,
  previousBattingStats: PlayerCareerBatting | null,
  previousPitchingStats: PlayerCareerPitching | null,
  achievedMilestones: Set<string>,
  config: MilestoneConfig = DEFAULT_CONFIG
): MilestoneDetectionResult[] {
  const results: MilestoneDetectionResult[] = [];
  const scaleFactor = getSeasonScalingFactor(config);

  // Check position player WAR components (bWAR, fWAR, rWAR)
  if (battingStats) {
    const positionPlayerComponents = ['bWAR', 'fWAR', 'rWAR'] as const;

    for (const component of positionPlayerComponents) {
      const tierConfig = CAREER_WAR_COMPONENT_TIERS[component];
      if (!tierConfig) continue;

      const currentValue = battingStats[component] ?? 0;
      const previousValue = previousBattingStats?.[component] ?? 0;

      for (const { threshold, tier, fameMultiplier } of tierConfig.tiers) {
        const scaledThreshold = scaleCareerThreshold(threshold, tierConfig.scalingType, config);
        const milestoneKey = `${tierConfig.eventType}_${scaledThreshold}`;

        if (
          currentValue >= scaledThreshold &&
          previousValue < scaledThreshold &&
          !achievedMilestones.has(milestoneKey)
        ) {
          const baseFame = FAME_VALUES[tierConfig.eventType];
          results.push({
            achieved: true,
            eventType: tierConfig.eventType,
            statName: component,
            threshold: scaledThreshold,
            actualValue: currentValue,
            tier,
            fameValue: baseFame * fameMultiplier,
            description: `${tierConfig.description} milestone: ${scaledThreshold.toFixed(1)}${scaleFactor < 1 ? ` (${threshold} MLB)` : ''}`,
            category: 'career',
            isNegative: false,
          });
        }
      }
    }
  }

  // Check pitching WAR component (pWAR)
  if (pitchingStats) {
    const tierConfig = CAREER_WAR_COMPONENT_TIERS.pWAR;
    if (tierConfig) {
      const currentValue = pitchingStats.pWAR ?? 0;
      const previousValue = previousPitchingStats?.pWAR ?? 0;

      for (const { threshold, tier, fameMultiplier } of tierConfig.tiers) {
        const scaledThreshold = scaleCareerThreshold(threshold, tierConfig.scalingType, config);
        const milestoneKey = `${tierConfig.eventType}_${scaledThreshold}`;

        if (
          currentValue >= scaledThreshold &&
          previousValue < scaledThreshold &&
          !achievedMilestones.has(milestoneKey)
        ) {
          const baseFame = FAME_VALUES[tierConfig.eventType];
          results.push({
            achieved: true,
            eventType: tierConfig.eventType,
            statName: 'pWAR',
            threshold: scaledThreshold,
            actualValue: currentValue,
            tier,
            fameValue: baseFame * fameMultiplier,
            description: `${tierConfig.description} milestone: ${scaledThreshold.toFixed(1)}${scaleFactor < 1 ? ` (${threshold} MLB)` : ''}`,
            category: 'career',
            isNegative: false,
          });
        }
      }
    }
  }

  return results;
}

// ============================================
// MILESTONE WATCH (Pre-game calculation)
// ============================================

export interface MilestoneWatch {
  playerId: string;
  playerName: string;
  statName: string;
  currentValue: number;
  threshold: number;
  neededForMilestone: number;
  eventType: FameEventType;
  description: string;
  category: 'season' | 'career';
  isReachableInGame: boolean;  // Could reasonably be reached in a single game
}

/**
 * Calculate which milestones are approaching for a player
 * Used for "Milestone Watch" feature at game start
 */
export function getApproachingMilestones(
  careerBatting: PlayerCareerBatting | null,
  careerPitching: PlayerCareerPitching | null,
  seasonBatting: PlayerSeasonBatting | null,
  seasonPitching: PlayerSeasonPitching | null,
  achievedMilestones: Set<string>,
  config: MilestoneConfig = DEFAULT_CONFIG
): MilestoneWatch[] {
  const watches: MilestoneWatch[] = [];
  const scaleFactor = getScalingFactor(config);

  // Check career batting
  if (careerBatting) {
    for (const { stat, tiers, eventType } of Object.values(CAREER_BATTING_TIERS)) {
      const currentValue = careerBatting[stat as keyof PlayerCareerBatting] as number;

      for (const { threshold } of tiers) {
        const milestoneKey = `${eventType}_${threshold}`;
        if (achievedMilestones.has(milestoneKey)) continue;

        const needed = threshold - currentValue;
        if (needed > 0 && needed <= getReasonableGameMax(stat)) {
          watches.push({
            playerId: careerBatting.playerId,
            playerName: careerBatting.playerName,
            statName: stat,
            currentValue,
            threshold,
            neededForMilestone: needed,
            eventType,
            description: `Career ${stat}: ${currentValue}/${threshold}`,
            category: 'career',
            isReachableInGame: needed <= getReasonableGameMax(stat),
          });
          break;  // Only show next threshold for each stat
        }
      }
    }
  }

  // Check career pitching
  if (careerPitching) {
    for (const { stat, tiers, eventType } of Object.values(CAREER_PITCHING_TIERS)) {
      const currentValue = careerPitching[stat as keyof PlayerCareerPitching] as number;

      for (const { threshold } of tiers) {
        const milestoneKey = `${eventType}_${threshold}`;
        if (achievedMilestones.has(milestoneKey)) continue;

        const needed = threshold - currentValue;
        if (needed > 0 && needed <= getReasonableGameMax(stat)) {
          watches.push({
            playerId: careerPitching.playerId,
            playerName: careerPitching.playerName,
            statName: stat,
            currentValue,
            threshold,
            neededForMilestone: needed,
            eventType,
            description: `Career ${stat}: ${currentValue}/${threshold}`,
            category: 'career',
            isReachableInGame: needed <= getReasonableGameMax(stat),
          });
          break;
        }
      }
    }
  }

  // Check season batting
  if (seasonBatting) {
    for (const [statName, thresholds] of Object.entries(SEASON_BATTING_THRESHOLDS)) {
      const currentValue = seasonBatting[statName as keyof PlayerSeasonBatting] as number;

      for (const { threshold, eventType } of thresholds) {
        const scaledThreshold = Math.round(threshold * scaleFactor);
        const milestoneKey = `${eventType}_${seasonBatting.seasonId}`;
        if (achievedMilestones.has(milestoneKey)) continue;

        const needed = scaledThreshold - currentValue;
        if (needed > 0 && needed <= getReasonableGameMax(statName)) {
          watches.push({
            playerId: seasonBatting.playerId,
            playerName: seasonBatting.playerName,
            statName,
            currentValue,
            threshold: scaledThreshold,
            neededForMilestone: needed,
            eventType,
            description: `Season ${statName}: ${currentValue}/${scaledThreshold}`,
            category: 'season',
            isReachableInGame: needed <= getReasonableGameMax(statName),
          });
          break;
        }
      }
    }
  }

  // Check season pitching
  if (seasonPitching) {
    for (const [statName, thresholds] of Object.entries(SEASON_PITCHING_THRESHOLDS)) {
      const currentValue = seasonPitching[statName as keyof PlayerSeasonPitching] as number;

      for (const { threshold, eventType } of thresholds) {
        const scaledThreshold = Math.round(threshold * scaleFactor);
        const milestoneKey = `${eventType}_${seasonPitching.seasonId}`;
        if (achievedMilestones.has(milestoneKey)) continue;

        const needed = scaledThreshold - currentValue;
        if (needed > 0 && needed <= getReasonableGameMax(statName)) {
          watches.push({
            playerId: seasonPitching.playerId,
            playerName: seasonPitching.playerName,
            statName,
            currentValue,
            threshold: scaledThreshold,
            neededForMilestone: needed,
            eventType,
            description: `Season ${statName}: ${currentValue}/${scaledThreshold}`,
            category: 'season',
            isReachableInGame: needed <= getReasonableGameMax(statName),
          });
          break;
        }
      }
    }
  }

  // Sort by how close they are
  return watches.sort((a, b) => a.neededForMilestone - b.neededForMilestone);
}

/**
 * Get reasonable maximum for a stat in a single game
 */
function getReasonableGameMax(stat: string): number {
  switch (stat) {
    case 'homeRuns': return 4;
    case 'hits': return 6;
    case 'rbi': return 10;
    case 'runs': return 5;
    case 'stolenBases': return 5;
    case 'doubles': return 3;
    case 'triples': return 2;
    case 'walks': return 5;
    case 'strikeouts': return 5;  // Batter
    case 'grandSlams': return 2;
    // Pitching
    case 'wins': return 1;
    case 'saves': return 1;
    case 'losses': return 1;
    default: return 3;
  }
}

// ============================================
// UTILITY: Convert milestone result to CareerMilestone record
// ============================================

export function createMilestoneRecord(
  result: MilestoneDetectionResult,
  playerId: string,
  playerName: string,
  gameId: string,
  seasonId: string
): CareerMilestone {
  return {
    id: `${result.eventType}_${playerId}_${Date.now()}`,
    playerId,
    playerName,
    milestoneType: `${result.eventType}_${result.threshold}`,
    statCategory: result.category === 'season' ? 'batting' : 'batting',  // Would need more context
    statName: result.statName,
    thresholdValue: result.threshold,
    actualValue: result.actualValue,
    tier: result.tier ?? 1,
    fameValue: result.fameValue,
    achievedDate: Date.now(),
    gameId,
    seasonId,
    description: result.description,
  };
}
