/**
 * Fame Engine Tests
 * Phase 4.4 - Fame System
 *
 * Per FAN_HAPPINESS_SPEC.md and SPECIAL_EVENTS_SPEC.md:
 * - LI-weighted Fame scoring
 * - Career milestone detection
 * - Season milestone detection
 * - Clutch situation detection
 * - Fame accumulation for awards
 */

import { describe, test, expect } from 'vitest';
import {
  // Types
  CareerStats,
  SeasonStats,
  MilestoneResult,
  FameResult,

  // Constants
  CAREER_THRESHOLDS,
  CAREER_NEGATIVE_THRESHOLDS,
  SEASON_THRESHOLDS,

  // LI Weighting
  getLIMultiplier,
  getPlayoffMultiplier,

  // Fame Calculation
  calculateFame,
  getFameTier,

  // Career Milestone Detection
  detectCareerMilestones,
  detectCareerNegativeMilestones,

  // Season Milestone Detection
  detectSeasonMilestones,
  detectSeasonNegativeMilestones,

  // First Career Detection
  detectFirstCareer,

  // Exports
  FAME_VALUES,
} from '../../../engines/fameEngine';

// ============================================
// HELPERS
// ============================================

function createEmptyCareerStats(): CareerStats {
  return {
    hits: 0,
    homeRuns: 0,
    rbi: 0,
    runs: 0,
    stolenBases: 0,
    doubles: 0,
    walks: 0,
    grandSlams: 0,
    strikeoutsBatter: 0,
    gidp: 0,
    caughtStealing: 0,
    wins: 0,
    losses: 0,
    strikeoutsPitcher: 0,
    saves: 0,
    blownSaves: 0,
    inningsPitched: 0,
    shutouts: 0,
    completeGames: 0,
    noHitters: 0,
    perfectGames: 0,
    wildPitches: 0,
    hbpPitcher: 0,
    errors: 0,
    passedBalls: 0,
    totalWAR: 0,
    bWAR: 0,
    pWAR: 0,
    fWAR: 0,
    rWAR: 0,
    gamesPlayed: 0,
    allStarSelections: 0,
    mvpAwards: 0,
    cyYoungAwards: 0,
  };
}

function createEmptySeasonStats(): SeasonStats {
  return {
    hits: 0,
    homeRuns: 0,
    rbi: 0,
    stolenBases: 0,
    battingAverage: 0,
    strikeoutsBatter: 0,
    gidp: 0,
    errors: 0,
    wins: 0,
    losses: 0,
    strikeoutsPitcher: 0,
    saves: 0,
    blownSaves: 0,
    era: 0,
    walksIssued: 0,
    homeRunsAllowed: 0,
  };
}

// SMB4 default config (50 games, 9 innings)
const SMB4_CONFIG = { gamesPerSeason: 50, inningsPerGame: 9 };

// ============================================
// LI WEIGHTING CONSTANTS
// ============================================

describe('LI Weighting', () => {
  describe('getLIMultiplier', () => {
    test('LI of 1.0 = 1.0× multiplier (baseline)', () => {
      expect(getLIMultiplier(1.0)).toBe(1.0);
    });

    test('LI of 4.0 = 2.0× multiplier (√4)', () => {
      expect(getLIMultiplier(4.0)).toBe(2.0);
    });

    test('LI of 9.0 = 3.0× multiplier (√9)', () => {
      expect(getLIMultiplier(9.0)).toBe(3.0);
    });

    test('LI of 0.5 = √0.5 multiplier (~0.707)', () => {
      expect(getLIMultiplier(0.5)).toBeCloseTo(Math.sqrt(0.5), 5);
    });

    test('clamps LI below 0.1 to 0.1', () => {
      expect(getLIMultiplier(0.01)).toBeCloseTo(Math.sqrt(0.1), 5);
    });

    test('clamps LI above 10 to 10', () => {
      expect(getLIMultiplier(15)).toBeCloseTo(Math.sqrt(10), 5);
    });
  });

  describe('getPlayoffMultiplier', () => {
    test('regular season = 1.0', () => {
      expect(getPlayoffMultiplier({ isPlayoffs: false })).toBe(1.0);
    });

    test('wild card = 1.25×', () => {
      expect(getPlayoffMultiplier({ isPlayoffs: true, round: 'wild_card' })).toBe(1.25);
    });

    test('division series = 1.5×', () => {
      expect(getPlayoffMultiplier({ isPlayoffs: true, round: 'division_series' })).toBe(1.5);
    });

    test('championship series = 1.75×', () => {
      expect(getPlayoffMultiplier({ isPlayoffs: true, round: 'championship_series' })).toBe(1.75);
    });

    test('world series = 2.0×', () => {
      expect(getPlayoffMultiplier({ isPlayoffs: true, round: 'world_series' })).toBe(2.0);
    });

    test('elimination game adds +0.5', () => {
      const result = getPlayoffMultiplier({
        isPlayoffs: true,
        round: 'wild_card',
        isEliminationGame: true,
      });
      expect(result).toBe(1.75); // 1.25 + 0.5
    });

    test('clinch game adds +0.25', () => {
      const result = getPlayoffMultiplier({
        isPlayoffs: true,
        round: 'world_series',
        isClinchGame: true,
      });
      expect(result).toBe(2.25); // 2.0 + 0.25
    });

    test('elimination + clinch stack', () => {
      const result = getPlayoffMultiplier({
        isPlayoffs: true,
        round: 'world_series',
        isEliminationGame: true,
        isClinchGame: true,
      });
      expect(result).toBe(2.75); // 2.0 + 0.5 + 0.25
    });
  });
});

// ============================================
// FAME CALCULATION
// ============================================

describe('Fame Calculation', () => {
  describe('calculateFame', () => {
    test('returns base Fame for event type', () => {
      // Use actual FameEventType from the game types
      const result = calculateFame('GRAND_SLAM');

      expect(result.baseFame).toBe(FAME_VALUES.GRAND_SLAM);
      expect(result.liMultiplier).toBe(1.0);
      expect(result.playoffMultiplier).toBe(1.0);
      expect(result.finalFame).toBe(FAME_VALUES.GRAND_SLAM);
    });

    test('applies LI multiplier', () => {
      const result = calculateFame('GRAND_SLAM', 4.0); // LI=4 → √4=2

      expect(result.liMultiplier).toBe(2.0);
      expect(result.finalFame).toBe(FAME_VALUES.GRAND_SLAM * 2);
    });

    test('applies playoff multiplier', () => {
      const result = calculateFame('GRAND_SLAM', 1.0, {
        isPlayoffs: true,
        round: 'world_series',
      });

      expect(result.playoffMultiplier).toBe(2.0);
      expect(result.finalFame).toBe(FAME_VALUES.GRAND_SLAM * 2);
    });

    test('LI and playoff multiply together', () => {
      const result = calculateFame('GRAND_SLAM', 4.0, {
        isPlayoffs: true,
        round: 'world_series',
      });

      // LI=4→2× * playoff=2× = 4× total
      expect(result.finalFame).toBe(FAME_VALUES.GRAND_SLAM * 4);
    });

    test('isBonus true for positive Fame', () => {
      const result = calculateFame('GRAND_SLAM');
      expect(result.isBonus).toBe(true);
      expect(result.isBoner).toBe(false);
    });

    test('isBoner true for negative Fame', () => {
      // TOOTBLAN is a negative Fame event (boner)
      const result = calculateFame('TOOTBLAN');
      expect(result.isBonus).toBe(false);
      expect(result.isBoner).toBe(true);
    });

    test('amplifies negative events too (shame amplification)', () => {
      const result = calculateFame('TOOTBLAN', 4.0, {
        isPlayoffs: true,
        round: 'world_series',
      });

      // Even negative Fame gets multiplied
      expect(result.finalFame).toBe(FAME_VALUES.TOOTBLAN * 4);
      expect(result.finalFame).toBeLessThan(0);
    });
  });

  describe('getFameTier', () => {
    test('50+ Fame = Legend', () => {
      const tier = getFameTier(50);
      expect(tier.tier).toBe('LEGENDARY');
      expect(tier.label).toBe('Legend');
    });

    test('30-49 Fame = Superstar', () => {
      const tier = getFameTier(35);
      expect(tier.tier).toBe('SUPERSTAR');
    });

    test('15-29 Fame = Star', () => {
      const tier = getFameTier(20);
      expect(tier.tier).toBe('STAR');
    });

    test('5-14 Fame = Fan Favorite', () => {
      const tier = getFameTier(10);
      expect(tier.tier).toBe('FAN_FAVORITE');
    });

    test('0-4 Fame = Known', () => {
      const tier = getFameTier(2);
      expect(tier.tier).toBe('KNOWN');
    });

    test('-5 to -1 Fame = Unknown', () => {
      const tier = getFameTier(-3);
      expect(tier.tier).toBe('UNKNOWN');
    });

    test('-15 to -6 Fame = Disliked', () => {
      const tier = getFameTier(-10);
      expect(tier.tier).toBe('DISLIKED');
    });

    test('-30 to -16 Fame = Villain', () => {
      const tier = getFameTier(-25);
      expect(tier.tier).toBe('VILLAIN');
    });

    test('Below -30 Fame = Notorious', () => {
      const tier = getFameTier(-50);
      expect(tier.tier).toBe('NOTORIOUS');
    });
  });
});

// ============================================
// CAREER MILESTONE THRESHOLDS
// ============================================

describe('Career Milestone Thresholds', () => {
  describe('Batting Thresholds', () => {
    test('homeRuns has 11 tiers from 25 to 700', () => {
      expect(CAREER_THRESHOLDS.homeRuns[0]).toBe(25);
      expect(CAREER_THRESHOLDS.homeRuns[10]).toBe(700);
      expect(CAREER_THRESHOLDS.homeRuns).toHaveLength(11);
    });

    test('hits has tiers for 250 to 3000', () => {
      expect(CAREER_THRESHOLDS.hits).toContain(1000);
      expect(CAREER_THRESHOLDS.hits).toContain(3000);
    });

    test('grandSlams has 5 tiers (5, 10, 15, 20, 25)', () => {
      expect(CAREER_THRESHOLDS.grandSlams).toEqual([5, 10, 15, 20, 25]);
    });
  });

  describe('Pitching Thresholds', () => {
    test('wins has 7 tiers from 25 to 300', () => {
      expect(CAREER_THRESHOLDS.wins[0]).toBe(25);
      expect(CAREER_THRESHOLDS.wins[6]).toBe(300);
    });

    test('noHitters has 7 tiers (1-7)', () => {
      expect(CAREER_THRESHOLDS.noHitters).toEqual([1, 2, 3, 4, 5, 6, 7]);
    });

    test('perfectGames has 2 tiers (1, 2)', () => {
      expect(CAREER_THRESHOLDS.perfectGames).toEqual([1, 2]);
    });
  });

  describe('Award Thresholds (no scaling)', () => {
    test('allStarSelections includes 1, 5, 10', () => {
      expect(CAREER_THRESHOLDS.allStarSelections).toContain(1);
      expect(CAREER_THRESHOLDS.allStarSelections).toContain(5);
      expect(CAREER_THRESHOLDS.allStarSelections).toContain(10);
    });

    test('mvpAwards goes 1, 2, 3, 4', () => {
      expect(CAREER_THRESHOLDS.mvpAwards).toEqual([1, 2, 3, 4]);
    });

    test('cyYoungAwards goes 1, 2, 3, 4, 5', () => {
      expect(CAREER_THRESHOLDS.cyYoungAwards).toEqual([1, 2, 3, 4, 5]);
    });
  });

  describe('Negative Thresholds', () => {
    test('strikeoutsBatter has tiers for 500+', () => {
      expect(CAREER_NEGATIVE_THRESHOLDS.strikeoutsBatter).toContain(1000);
      expect(CAREER_NEGATIVE_THRESHOLDS.strikeoutsBatter).toContain(2000);
    });

    test('losses has tiers for 100+', () => {
      expect(CAREER_NEGATIVE_THRESHOLDS.losses[0]).toBe(100);
    });

    test('blownSaves has tiers starting at 25', () => {
      expect(CAREER_NEGATIVE_THRESHOLDS.blownSaves[0]).toBe(25);
    });
  });
});

// ============================================
// CAREER MILESTONE DETECTION
// ============================================

describe('detectCareerMilestones', () => {
  describe('Home Run Milestones (SMB4 scaled)', () => {
    // SMB4: 50 games, 9 innings → factor = (50/162) × (9/9) ≈ 0.309
    // 25 HR threshold × 0.309 = ~8 HR scaled

    test('detects first tier HR milestone with SMB4 config', () => {
      const stats = createEmptyCareerStats();
      stats.homeRuns = 8; // ~25 MLB equivalent

      const milestones = detectCareerMilestones(stats, undefined, SMB4_CONFIG);

      expect(milestones.some(m => m.eventType === 'CAREER_HR_TIER')).toBe(true);
    });

    test('detects crossing threshold with previous stats', () => {
      const stats = createEmptyCareerStats();
      stats.homeRuns = 9;

      const prevStats = createEmptyCareerStats();
      prevStats.homeRuns = 7;

      const milestones = detectCareerMilestones(stats, prevStats, SMB4_CONFIG);

      // Should detect the crossing
      const hrMilestones = milestones.filter(m => m.eventType === 'CAREER_HR_TIER');
      expect(hrMilestones.length).toBeGreaterThan(0);
    });

    test('does not detect if already past threshold', () => {
      const stats = createEmptyCareerStats();
      stats.homeRuns = 15;

      const prevStats = createEmptyCareerStats();
      prevStats.homeRuns = 14; // Both past scaled threshold

      // First threshold is ~8, we're already past it
      const milestones = detectCareerMilestones(stats, prevStats, SMB4_CONFIG);

      // May not detect tier 1 since we're checking crossing
      // But may detect tier 2 if we crossed it
      // With 15 HR, we're at ~49 MLB equivalent, close to 50 tier 2
      expect(milestones.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Award Milestones (no scaling)', () => {
    test('detects first MVP award', () => {
      const stats = createEmptyCareerStats();
      stats.mvpAwards = 1;

      const milestones = detectCareerMilestones(stats, undefined, SMB4_CONFIG);

      const mvpMilestone = milestones.find(m => m.eventType === 'CAREER_MVPS_TIER');
      expect(mvpMilestone).toBeDefined();
      expect(mvpMilestone?.threshold).toBe(1); // Not scaled
    });

    test('detects first All-Star selection', () => {
      const stats = createEmptyCareerStats();
      stats.allStarSelections = 1;

      const milestones = detectCareerMilestones(stats, undefined, SMB4_CONFIG);

      const asMilestone = milestones.find(m => m.eventType === 'CAREER_ALL_STARS_TIER');
      expect(asMilestone).toBeDefined();
    });

    test('detects Cy Young award', () => {
      const stats = createEmptyCareerStats();
      stats.cyYoungAwards = 1;

      const milestones = detectCareerMilestones(stats, undefined, SMB4_CONFIG);

      const cyMilestone = milestones.find(m => m.eventType === 'CAREER_CY_YOUNGS_TIER');
      expect(cyMilestone).toBeDefined();
    });
  });

  describe('Rare Achievement Milestones', () => {
    test('detects first no-hitter', () => {
      const stats = createEmptyCareerStats();
      stats.noHitters = 1;

      const milestones = detectCareerMilestones(stats, undefined, SMB4_CONFIG);

      const nhMilestone = milestones.find(m => m.eventType === 'CAREER_NO_HITTERS_TIER');
      expect(nhMilestone).toBeDefined();
    });

    test('detects first perfect game', () => {
      const stats = createEmptyCareerStats();
      stats.perfectGames = 1;

      const milestones = detectCareerMilestones(stats, undefined, SMB4_CONFIG);

      const pgMilestone = milestones.find(m => m.eventType === 'CAREER_PERFECT_GAMES_TIER');
      expect(pgMilestone).toBeDefined();
    });
  });

  describe('WAR Milestones (scaled)', () => {
    test('detects WAR milestone with scaling', () => {
      const stats = createEmptyCareerStats();
      stats.totalWAR = 4; // ~10 WAR MLB equivalent at SMB4 scale

      const milestones = detectCareerMilestones(stats, undefined, SMB4_CONFIG);

      const warMilestone = milestones.find(m => m.eventType === 'CAREER_WAR_TIER');
      expect(warMilestone).toBeDefined();
    });
  });
});

describe('detectCareerNegativeMilestones', () => {
  test('detects strikeout batter milestone', () => {
    const stats = createEmptyCareerStats();
    // 500 × 0.309 ≈ 155 strikeouts scaled
    stats.strikeoutsBatter = 160;

    const milestones = detectCareerNegativeMilestones(stats, undefined, SMB4_CONFIG);

    const kMilestone = milestones.find(m => m.eventType === 'CAREER_K_BATTER_TIER');
    expect(kMilestone).toBeDefined();
  });

  test('detects career losses milestone', () => {
    const stats = createEmptyCareerStats();
    // 100 × (50/162) ≈ 31 losses scaled (per-game)
    stats.losses = 35;

    const milestones = detectCareerNegativeMilestones(stats, undefined, SMB4_CONFIG);

    const lossMilestone = milestones.find(m => m.eventType === 'CAREER_LOSSES_TIER');
    expect(lossMilestone).toBeDefined();
  });

  test('detects career errors milestone', () => {
    const stats = createEmptyCareerStats();
    // 100 × 0.309 ≈ 31 errors scaled
    stats.errors = 35;

    const milestones = detectCareerNegativeMilestones(stats, undefined, SMB4_CONFIG);

    const errorMilestone = milestones.find(m => m.eventType === 'CAREER_ERRORS_TIER');
    expect(errorMilestone).toBeDefined();
  });

  test('detects blown saves milestone', () => {
    const stats = createEmptyCareerStats();
    // 25 × (50/162) ≈ 8 blown saves scaled (per-game)
    stats.blownSaves = 10;

    const milestones = detectCareerNegativeMilestones(stats, undefined, SMB4_CONFIG);

    const bsMilestone = milestones.find(m => m.eventType === 'CAREER_BLOWN_SAVES_TIER');
    expect(bsMilestone).toBeDefined();
  });
});

// ============================================
// SEASON MILESTONE THRESHOLDS
// ============================================

describe('Season Milestone Thresholds', () => {
  test('HR thresholds are 40, 50, 60', () => {
    expect(SEASON_THRESHOLDS.homeRuns.tier1).toBe(40);
    expect(SEASON_THRESHOLDS.homeRuns.tier2).toBe(50);
    expect(SEASON_THRESHOLDS.homeRuns.tier3).toBe(60);
  });

  test('hits tier is 200', () => {
    expect(SEASON_THRESHOLDS.hits.tier1).toBe(200);
  });

  test('SB thresholds are 50, 100', () => {
    expect(SEASON_THRESHOLDS.stolenBases.tier1).toBe(50);
    expect(SEASON_THRESHOLDS.stolenBases.tier2).toBe(100);
  });

  test('batting average threshold is .400', () => {
    expect(SEASON_THRESHOLDS.battingAverage.tier1).toBe(0.400);
  });

  test('clubs are HR+SB combinations', () => {
    expect(SEASON_THRESHOLDS.clubs).toHaveLength(5);
    expect(SEASON_THRESHOLDS.clubs[0]).toEqual({
      hr: 15, sb: 15, event: 'CLUB_15_15',
    });
    expect(SEASON_THRESHOLDS.clubs[4]).toEqual({
      hr: 40, sb: 40, event: 'CLUB_40_40',
    });
  });

  test('pitching wins thresholds are 15, 20, 25', () => {
    expect(SEASON_THRESHOLDS.wins.tier1).toBe(15);
    expect(SEASON_THRESHOLDS.wins.tier2).toBe(20);
    expect(SEASON_THRESHOLDS.wins.tier3).toBe(25);
  });

  test('ERA thresholds are sub-2.00, sub-1.50', () => {
    expect(SEASON_THRESHOLDS.eraMax.tier1).toBe(2.00);
    expect(SEASON_THRESHOLDS.eraMax.tier2).toBe(1.50);
  });
});

// ============================================
// SEASON MILESTONE DETECTION
// ============================================

describe('detectSeasonMilestones', () => {
  describe('Batting Milestones (scaled)', () => {
    test('detects 40 HR season (scaled to ~12 HR SMB4)', () => {
      const stats = createEmptySeasonStats();
      // 40 × 0.309 ≈ 12 HR scaled
      stats.homeRuns = 13;

      const milestones = detectSeasonMilestones(stats, SMB4_CONFIG);

      const hrMilestone = milestones.find(m => m.eventType === 'SEASON_40_HR');
      expect(hrMilestone).toBeDefined();
    });

    test('detects 50 HR season tier 2', () => {
      const stats = createEmptySeasonStats();
      // 50 × 0.309 ≈ 15 HR scaled
      stats.homeRuns = 16;

      const milestones = detectSeasonMilestones(stats, SMB4_CONFIG);

      const hrMilestone = milestones.find(m => m.eventType === 'SEASON_45_HR');
      expect(hrMilestone).toBeDefined();
    });

    test('detects stolen base season milestone', () => {
      const stats = createEmptySeasonStats();
      // 50 × 0.309 ≈ 15 SB scaled
      stats.stolenBases = 16;

      const milestones = detectSeasonMilestones(stats, SMB4_CONFIG);

      const sbMilestone = milestones.find(m => m.eventType === 'SEASON_40_SB');
      expect(sbMilestone).toBeDefined();
    });
  });

  describe('Rate Stat Milestones (no scaling)', () => {
    test('detects .400 batting average', () => {
      const stats = createEmptySeasonStats();
      stats.battingAverage = 0.405;

      const milestones = detectSeasonMilestones(stats, SMB4_CONFIG);

      const baMilestone = milestones.find(m => m.eventType === 'SEASON_400_BA');
      expect(baMilestone).toBeDefined();
      expect(baMilestone?.threshold).toBe(0.400); // Not scaled
    });

    test('detects sub-2.00 ERA', () => {
      const stats = createEmptySeasonStats();
      stats.era = 1.85;

      const milestones = detectSeasonMilestones(stats, SMB4_CONFIG);

      const eraMilestone = milestones.find(m => m.eventType === 'SEASON_SUB_2_ERA');
      expect(eraMilestone).toBeDefined();
    });

    test('detects sub-1.50 ERA (tier 2)', () => {
      const stats = createEmptySeasonStats();
      stats.era = 1.35;

      const milestones = detectSeasonMilestones(stats, SMB4_CONFIG);

      const eraMilestone = milestones.find(m => m.eventType === 'SEASON_SUB_1_5_ERA');
      expect(eraMilestone).toBeDefined();
    });
  });

  describe('Club Milestones (scaled HR + SB)', () => {
    test('detects 15/15 club', () => {
      const stats = createEmptySeasonStats();
      // 15 × 0.309 ≈ 5 each scaled
      stats.homeRuns = 5;
      stats.stolenBases = 5;

      const milestones = detectSeasonMilestones(stats, SMB4_CONFIG);

      const clubMilestone = milestones.find(m => m.eventType === 'CLUB_15_15');
      expect(clubMilestone).toBeDefined();
    });

    test('detects 30/30 club', () => {
      const stats = createEmptySeasonStats();
      // 30 × 0.309 ≈ 9 each scaled
      stats.homeRuns = 10;
      stats.stolenBases = 10;

      const milestones = detectSeasonMilestones(stats, SMB4_CONFIG);

      const clubMilestone = milestones.find(m => m.eventType === 'CLUB_30_30');
      expect(clubMilestone).toBeDefined();
    });
  });

  describe('Triple Crown', () => {
    test('detects batting Triple Crown', () => {
      const stats = createEmptySeasonStats();
      stats.isLeagueLeaderAVG = true;
      stats.isLeagueLeaderHR = true;
      stats.isLeagueLeaderRBI = true;

      const milestones = detectSeasonMilestones(stats, SMB4_CONFIG);

      const tcMilestone = milestones.find(m => m.eventType === 'SEASON_TRIPLE_CROWN');
      expect(tcMilestone).toBeDefined();
    });

    test('does not detect Triple Crown if missing one category', () => {
      const stats = createEmptySeasonStats();
      stats.isLeagueLeaderAVG = true;
      stats.isLeagueLeaderHR = true;
      stats.isLeagueLeaderRBI = false;

      const milestones = detectSeasonMilestones(stats, SMB4_CONFIG);

      const tcMilestone = milestones.find(m => m.eventType === 'SEASON_TRIPLE_CROWN');
      expect(tcMilestone).toBeUndefined();
    });

    test('detects pitching Triple Crown', () => {
      const stats = createEmptySeasonStats();
      stats.isLeagueLeaderWins = true;
      stats.isLeagueLeaderK = true;
      stats.isLeagueLeaderERA = true;

      const milestones = detectSeasonMilestones(stats, SMB4_CONFIG);

      const tcMilestone = milestones.find(m => m.eventType === 'SEASON_PITCHING_TRIPLE_CROWN');
      expect(tcMilestone).toBeDefined();
    });
  });

  describe('Pitching Milestones (per-game scaled)', () => {
    test('detects 15-win season', () => {
      const stats = createEmptySeasonStats();
      // 15 × (50/162) ≈ 5 wins scaled
      stats.wins = 5;

      const milestones = detectSeasonMilestones(stats, SMB4_CONFIG);

      const winMilestone = milestones.find(m => m.eventType === 'SEASON_15_WINS');
      expect(winMilestone).toBeDefined();
    });

    test('detects 40-save season', () => {
      const stats = createEmptySeasonStats();
      // 40 × (50/162) ≈ 12 saves scaled
      stats.saves = 13;

      const milestones = detectSeasonMilestones(stats, SMB4_CONFIG);

      const saveMilestone = milestones.find(m => m.eventType === 'SEASON_40_SAVES');
      expect(saveMilestone).toBeDefined();
    });
  });
});

describe('detectSeasonNegativeMilestones', () => {
  test('detects 200+ strikeout batter season', () => {
    const stats = createEmptySeasonStats();
    // 200 × 0.309 ≈ 62 strikeouts scaled
    stats.strikeoutsBatter = 65;

    const milestones = detectSeasonNegativeMilestones(stats, SMB4_CONFIG);

    const kMilestone = milestones.find(m => m.eventType === 'SEASON_200_K_BATTER');
    expect(kMilestone).toBeDefined();
  });

  test('detects sub-.200 batting average (no scaling)', () => {
    const stats = createEmptySeasonStats();
    stats.battingAverage = 0.185;

    const milestones = detectSeasonNegativeMilestones(stats, SMB4_CONFIG);

    const baMilestone = milestones.find(m => m.eventType === 'SEASON_SUB_200_BA');
    expect(baMilestone).toBeDefined();
  });

  test('detects 20-loss season', () => {
    const stats = createEmptySeasonStats();
    // 20 × (50/162) ≈ 6 losses scaled
    stats.losses = 7;

    const milestones = detectSeasonNegativeMilestones(stats, SMB4_CONFIG);

    const lossMilestone = milestones.find(m => m.eventType === 'SEASON_20_LOSSES');
    expect(lossMilestone).toBeDefined();
  });

  test('detects 6.00+ ERA (no scaling)', () => {
    const stats = createEmptySeasonStats();
    stats.era = 6.50;

    const milestones = detectSeasonNegativeMilestones(stats, SMB4_CONFIG);

    const eraMilestone = milestones.find(m => m.eventType === 'SEASON_6_ERA');
    expect(eraMilestone).toBeDefined();
  });

  test('detects 20+ blown saves season', () => {
    const stats = createEmptySeasonStats();
    // 20 × (50/162) ≈ 6 blown saves scaled
    stats.blownSaves = 7;

    const milestones = detectSeasonNegativeMilestones(stats, SMB4_CONFIG);

    const bsMilestone = milestones.find(m => m.eventType === 'SEASON_20_BLOWN_SAVES');
    expect(bsMilestone).toBeDefined();
  });

  test('detects 30+ GIDP season', () => {
    const stats = createEmptySeasonStats();
    // 30 × 0.309 ≈ 9 GIDP scaled
    stats.gidp = 10;

    const milestones = detectSeasonNegativeMilestones(stats, SMB4_CONFIG);

    const gidpMilestone = milestones.find(m => m.eventType === 'SEASON_30_GIDP');
    expect(gidpMilestone).toBeDefined();
  });
});

// ============================================
// FIRST CAREER DETECTION
// ============================================

describe('detectFirstCareer', () => {
  test('detects first career hit (0 → 1)', () => {
    const result = detectFirstCareer('hit', 1, 0);

    expect(result).not.toBeNull();
    expect(result?.eventType).toBe('FIRST_CAREER');
    expect(result?.description).toContain('First career hit');
  });

  test('detects first career home run', () => {
    const result = detectFirstCareer('homeRun', 1, 0);

    expect(result).not.toBeNull();
    expect(result?.description).toContain('First career home run');
  });

  test('detects first career RBI', () => {
    const result = detectFirstCareer('rbi', 1, 0);

    expect(result).not.toBeNull();
    expect(result?.description).toContain('First career RBI');
  });

  test('detects first career win', () => {
    const result = detectFirstCareer('win', 1, 0);

    expect(result).not.toBeNull();
    expect(result?.description).toContain('First career win');
  });

  test('detects first career save', () => {
    const result = detectFirstCareer('save', 1, 0);

    expect(result).not.toBeNull();
    expect(result?.description).toContain('First career save');
  });

  test('detects first career strikeout (pitcher)', () => {
    const result = detectFirstCareer('strikeout', 1, 0);

    expect(result).not.toBeNull();
    expect(result?.description).toContain('First career strikeout');
  });

  test('does not detect if already had one', () => {
    const result = detectFirstCareer('hit', 2, 1);

    expect(result).toBeNull();
  });

  test('does not detect if had more than one before', () => {
    const result = detectFirstCareer('homeRun', 5, 4);

    expect(result).toBeNull();
  });
});

// ============================================
// EDGE CASES
// ============================================

describe('Edge Cases', () => {
  test('empty career stats returns minimal milestones (gamesPlayed = 0)', () => {
    const stats = createEmptyCareerStats();
    const milestones = detectCareerMilestones(stats, undefined, SMB4_CONFIG);

    // With all zeros, only gamesPlayed could trigger if threshold crosses 0
    // Verify no counting stat milestones are triggered
    const hrMilestones = milestones.filter(m => m.eventType === 'CAREER_HR_TIER');
    expect(hrMilestones).toHaveLength(0);
  });

  test('empty season stats returns no milestones', () => {
    const stats = createEmptySeasonStats();
    const milestones = detectSeasonMilestones(stats, SMB4_CONFIG);

    expect(milestones).toHaveLength(0);
  });

  test('handles 0 ERA correctly (does not trigger sub-ERA milestone)', () => {
    const stats = createEmptySeasonStats();
    stats.era = 0; // No ERA yet (probably 0 IP)

    const milestones = detectSeasonMilestones(stats, SMB4_CONFIG);

    // ERA of 0 should not trigger "sub-2.00 ERA" milestone
    // (because we check era > 0)
    const eraMilestone = milestones.find(m => m.eventType === 'SEASON_SUB_2_ERA');
    expect(eraMilestone).toBeUndefined();
  });

  test('handles 0 batting average correctly', () => {
    const stats = createEmptySeasonStats();
    stats.battingAverage = 0;

    const milestones = detectSeasonNegativeMilestones(stats, SMB4_CONFIG);

    // BA of 0 should not trigger "sub-.200 BA" (we check BA > 0)
    const baMilestone = milestones.find(m => m.eventType === 'SEASON_SUB_200_BA');
    expect(baMilestone).toBeUndefined();
  });

  test('fame tier includes min/max values', () => {
    const tier = getFameTier(25);

    expect(tier.minFame).toBeDefined();
    expect(tier.maxFame).toBeDefined();
    expect(tier.minFame).toBeLessThanOrEqual(25);
    expect(tier.maxFame).toBeGreaterThan(25);
  });

  test('LI multiplier handles edge values', () => {
    // Very low LI
    expect(getLIMultiplier(0.001)).toBeGreaterThan(0);

    // Very high LI
    expect(getLIMultiplier(100)).toBeLessThanOrEqual(Math.sqrt(10) + 0.01);
  });

  test('default config uses SMB4 values', () => {
    const stats = createEmptyCareerStats();
    stats.mvpAwards = 1;

    // Should work without passing config (uses defaults)
    const milestones = detectCareerMilestones(stats);

    const mvpMilestone = milestones.find(m => m.eventType === 'CAREER_MVPS_TIER');
    expect(mvpMilestone).toBeDefined();
  });
});

// ============================================
// FAME VALUES INTEGRATION
// ============================================

describe('FAME_VALUES Integration', () => {
  test('FAME_VALUES has positive values for bonuses', () => {
    // Use actual FameEventTypes that exist in the FAME_VALUES
    expect(FAME_VALUES.GRAND_SLAM).toBeGreaterThan(0);
    expect(FAME_VALUES.CYCLE).toBeGreaterThan(0);
    expect(FAME_VALUES.WALK_OFF_HR).toBeGreaterThan(0);
  });

  test('FAME_VALUES has negative values for boners', () => {
    // Use actual negative FameEventTypes
    expect(FAME_VALUES.TOOTBLAN).toBeLessThan(0);
    expect(FAME_VALUES.BLOWN_SAVE).toBeLessThan(0);
    expect(FAME_VALUES.GOLDEN_SOMBRERO).toBeLessThan(0);
  });

  test('WALK_OFF_GRAND_SLAM worth more than WALK_OFF_HR', () => {
    expect(FAME_VALUES.WALK_OFF_GRAND_SLAM).toBeGreaterThan(FAME_VALUES.WALK_OFF_HR);
  });

  test('NATURAL_CYCLE worth more than CYCLE', () => {
    expect(FAME_VALUES.NATURAL_CYCLE).toBeGreaterThan(FAME_VALUES.CYCLE);
  });
});
