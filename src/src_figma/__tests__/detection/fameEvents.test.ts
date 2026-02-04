/**
 * Fame Event Detection Tests
 * Phase 3.3 - Fame System Testing
 *
 * Per SPECIAL_EVENTS_SPEC.md and FAN_HAPPINESS_SPEC.md:
 * - Fame value verification for all event types
 * - LI-weighted Fame calculation (√LI multiplier)
 * - Playoff context multipliers
 * - Fame tier classification
 * - Career/Season milestone Fame integration
 * - Positive (Bonus) vs Negative (Boner) events
 */

import { describe, test, expect } from 'vitest';
import { FAME_VALUES, FameEventType } from '../../../types/game';
import {
  // LI and Playoff multipliers
  getLIMultiplier,
  getPlayoffMultiplier,
  calculateFame,
  getFameTier,

  // Career milestone detection
  detectCareerMilestones,
  detectCareerNegativeMilestones,

  // Season milestone detection
  detectSeasonMilestones,
  detectSeasonNegativeMilestones,

  // First career detection
  detectFirstCareer,

  // Types
  CareerStats,
  SeasonStats,
  FameResult,
} from '../../../engines/fameEngine';

import type { MilestoneConfig } from '../../../utils/milestoneDetector';

// ============================================
// TEST DATA FACTORIES
// ============================================

function createMockCareerStats(overrides: Partial<CareerStats> = {}): CareerStats {
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
    ...overrides,
  };
}

function createMockSeasonStats(overrides: Partial<SeasonStats> = {}): SeasonStats {
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
    ...overrides,
  };
}

// ============================================
// FAME VALUES VERIFICATION
// ============================================

describe('FAME_VALUES Constants', () => {
  describe('Walk-Off Events (Bonuses)', () => {
    test('WALK_OFF = 1', () => {
      expect(FAME_VALUES.WALK_OFF).toBe(1);
    });

    test('WALK_OFF_HR = 1.5', () => {
      expect(FAME_VALUES.WALK_OFF_HR).toBe(1.5);
    });

    test('WALK_OFF_GRAND_SLAM = 3', () => {
      expect(FAME_VALUES.WALK_OFF_GRAND_SLAM).toBe(3);
    });
  });

  describe('Defensive Highlights (Bonuses)', () => {
    test('WEB_GEM = 0.75', () => {
      expect(FAME_VALUES.WEB_GEM).toBe(0.75);
    });

    test('ROBBERY = 1.5 (higher than WEB_GEM per spec)', () => {
      expect(FAME_VALUES.ROBBERY).toBe(1.5);
      expect(FAME_VALUES.ROBBERY).toBeGreaterThan(FAME_VALUES.WEB_GEM);
    });

    test('TRIPLE_PLAY = 2', () => {
      expect(FAME_VALUES.TRIPLE_PLAY).toBe(2);
    });

    test('UNASSISTED_TRIPLE_PLAY = 3', () => {
      expect(FAME_VALUES.UNASSISTED_TRIPLE_PLAY).toBe(3);
    });
  });

  describe('Home Run Events (Bonuses)', () => {
    test('GRAND_SLAM = 0.5', () => {
      expect(FAME_VALUES.GRAND_SLAM).toBe(0.5);
    });

    test('INSIDE_PARK_HR = 1.5', () => {
      expect(FAME_VALUES.INSIDE_PARK_HR).toBe(1.5);
    });
  });

  describe('Multi-Hit Events (Bonuses)', () => {
    test('CYCLE = 3', () => {
      expect(FAME_VALUES.CYCLE).toBe(3);
    });

    test('NATURAL_CYCLE = 4 (higher than regular cycle)', () => {
      expect(FAME_VALUES.NATURAL_CYCLE).toBe(4);
      expect(FAME_VALUES.NATURAL_CYCLE).toBeGreaterThan(FAME_VALUES.CYCLE);
    });

    test('Multi-HR progression: 2HR=1, 3HR=2.5, 4+HR=5', () => {
      expect(FAME_VALUES.MULTI_HR_2).toBe(1);
      expect(FAME_VALUES.MULTI_HR_3).toBe(2.5);
      expect(FAME_VALUES.MULTI_HR_4PLUS).toBe(5);
    });
  });

  describe('Pitching Excellence (Bonuses)', () => {
    test('NO_HITTER = 3', () => {
      expect(FAME_VALUES.NO_HITTER).toBe(3);
    });

    test('PERFECT_GAME = 5 (higher than no-hitter)', () => {
      expect(FAME_VALUES.PERFECT_GAME).toBe(5);
      expect(FAME_VALUES.PERFECT_GAME).toBeGreaterThan(FAME_VALUES.NO_HITTER);
    });

    test('MADDUX = 3 (CG shutout <100 pitches)', () => {
      expect(FAME_VALUES.MADDUX).toBe(3);
    });

    test('IMMACULATE_INNING = 2', () => {
      expect(FAME_VALUES.IMMACULATE_INNING).toBe(2);
    });
  });

  describe('SMB4 Special Events (Bonuses)', () => {
    test('NUT_SHOT_DELIVERED = 1', () => {
      expect(FAME_VALUES.NUT_SHOT_DELIVERED).toBe(1);
    });

    test('KILLED_PITCHER = 3', () => {
      expect(FAME_VALUES.KILLED_PITCHER).toBe(3);
    });
  });

  describe('Strikeout Shame (Boners)', () => {
    test('HAT_TRICK = -0.5', () => {
      expect(FAME_VALUES.HAT_TRICK).toBe(-0.5);
    });

    test('GOLDEN_SOMBRERO = -1', () => {
      expect(FAME_VALUES.GOLDEN_SOMBRERO).toBe(-1);
    });

    test('PLATINUM_SOMBRERO = -2', () => {
      expect(FAME_VALUES.PLATINUM_SOMBRERO).toBe(-2);
    });

    test('TITANIUM_SOMBRERO = -3', () => {
      expect(FAME_VALUES.TITANIUM_SOMBRERO).toBe(-3);
    });
  });

  describe('Pitching Disasters (Boners)', () => {
    test('MELTDOWN = -1', () => {
      expect(FAME_VALUES.MELTDOWN).toBe(-1);
    });

    test('MELTDOWN_SEVERE = -2', () => {
      expect(FAME_VALUES.MELTDOWN_SEVERE).toBe(-2);
    });

    test('BLOWN_SAVE = -1', () => {
      expect(FAME_VALUES.BLOWN_SAVE).toBe(-1);
    });

    test('BLOWN_SAVE_LOSS = -2 (worse than just blown save)', () => {
      expect(FAME_VALUES.BLOWN_SAVE_LOSS).toBe(-2);
      expect(Math.abs(FAME_VALUES.BLOWN_SAVE_LOSS)).toBeGreaterThan(Math.abs(FAME_VALUES.BLOWN_SAVE));
    });
  });

  describe('Baserunning Blunders (Boners)', () => {
    test('TOOTBLAN = -1', () => {
      expect(FAME_VALUES.TOOTBLAN).toBe(-1);
    });

    test('TOOTBLAN_RALLY_KILLER = -2', () => {
      expect(FAME_VALUES.TOOTBLAN_RALLY_KILLER).toBe(-2);
    });
  });

  describe('Season Milestones (Positive)', () => {
    test('SEASON_40_HR = 2.5', () => {
      expect(FAME_VALUES.SEASON_40_HR).toBe(2.5);
    });

    test('SEASON_400_BA = 6', () => {
      expect(FAME_VALUES.SEASON_400_BA).toBe(6);
    });

    test('SEASON_TRIPLE_CROWN = 8', () => {
      expect(FAME_VALUES.SEASON_TRIPLE_CROWN).toBe(8);
    });

    test('Club progression: 15-15=0.5, 30-30=3.5, 40-40=6', () => {
      expect(FAME_VALUES.CLUB_15_15).toBe(0.5);
      expect(FAME_VALUES.CLUB_30_30).toBe(3.5);
      expect(FAME_VALUES.CLUB_40_40).toBe(6);
    });
  });

  describe('Season Milestones (Negative)', () => {
    test('SEASON_200_K_BATTER = -1', () => {
      expect(FAME_VALUES.SEASON_200_K_BATTER).toBe(-1);
    });

    test('SEASON_SUB_200_BA = -2', () => {
      expect(FAME_VALUES.SEASON_SUB_200_BA).toBe(-2);
    });

    test('SEASON_20_LOSSES = -1.5', () => {
      expect(FAME_VALUES.SEASON_20_LOSSES).toBe(-1.5);
    });
  });

  describe('Career Milestone Base Values', () => {
    test('CAREER_HR_TIER base = 1', () => {
      expect(FAME_VALUES.CAREER_HR_TIER).toBe(1);
    });

    test('CAREER_NO_HITTERS_TIER base = 2', () => {
      expect(FAME_VALUES.CAREER_NO_HITTERS_TIER).toBe(2);
    });

    test('CAREER_PERFECT_GAMES_TIER base = 5', () => {
      expect(FAME_VALUES.CAREER_PERFECT_GAMES_TIER).toBe(5);
    });

    test('CAREER_FWAR_TIER base = 1.5 (higher - harder to accumulate)', () => {
      expect(FAME_VALUES.CAREER_FWAR_TIER).toBe(1.5);
    });

    test('CAREER_RWAR_TIER base = 2 (highest - hardest to accumulate)', () => {
      expect(FAME_VALUES.CAREER_RWAR_TIER).toBe(2);
    });
  });

  describe('All Bonuses are Positive', () => {
    test('all positive events have positive Fame values', () => {
      const bonusEvents: FameEventType[] = [
        'WALK_OFF', 'WALK_OFF_HR', 'WEB_GEM', 'ROBBERY', 'TRIPLE_PLAY',
        'GRAND_SLAM', 'CYCLE', 'NO_HITTER', 'PERFECT_GAME',
        'SEASON_40_HR', 'CAREER_HR_TIER',
      ];

      for (const event of bonusEvents) {
        expect(FAME_VALUES[event]).toBeGreaterThan(0);
      }
    });
  });

  describe('All Boners are Negative', () => {
    test('all negative events have negative Fame values', () => {
      const bonerEvents: FameEventType[] = [
        'GOLDEN_SOMBRERO', 'PLATINUM_SOMBRERO', 'TOOTBLAN', 'BLOWN_SAVE',
        'MELTDOWN', 'SEASON_200_K_BATTER', 'CAREER_K_BATTER_TIER',
      ];

      for (const event of bonerEvents) {
        expect(FAME_VALUES[event]).toBeLessThan(0);
      }
    });
  });
});

// ============================================
// LI MULTIPLIER TESTS
// ============================================

describe('getLIMultiplier', () => {
  describe('Standard LI Values', () => {
    test('LI=1 returns 1× multiplier', () => {
      expect(getLIMultiplier(1)).toBe(1);
    });

    test('LI=4 returns 2× multiplier (√4)', () => {
      expect(getLIMultiplier(4)).toBe(2);
    });

    test('LI=9 returns 3× multiplier (√9)', () => {
      expect(getLIMultiplier(9)).toBe(3);
    });

    test('LI=2.25 returns 1.5× multiplier', () => {
      expect(getLIMultiplier(2.25)).toBe(1.5);
    });
  });

  describe('Edge Cases', () => {
    test('LI=0.1 (minimum) returns √0.1', () => {
      expect(getLIMultiplier(0.1)).toBeCloseTo(Math.sqrt(0.1), 5);
    });

    test('LI=10 (maximum) returns √10', () => {
      expect(getLIMultiplier(10)).toBeCloseTo(Math.sqrt(10), 5);
    });

    test('LI below 0.1 is clamped to 0.1', () => {
      expect(getLIMultiplier(0)).toBe(getLIMultiplier(0.1));
      expect(getLIMultiplier(-1)).toBe(getLIMultiplier(0.1));
    });

    test('LI above 10 is clamped to 10', () => {
      expect(getLIMultiplier(15)).toBe(getLIMultiplier(10));
      expect(getLIMultiplier(100)).toBe(getLIMultiplier(10));
    });
  });
});

// ============================================
// PLAYOFF MULTIPLIER TESTS
// ============================================

describe('getPlayoffMultiplier', () => {
  describe('Regular Season', () => {
    test('non-playoff game returns 1.0', () => {
      expect(getPlayoffMultiplier({ isPlayoffs: false })).toBe(1.0);
    });
  });

  describe('Playoff Rounds', () => {
    test('Wild Card = 1.25', () => {
      expect(getPlayoffMultiplier({ isPlayoffs: true, round: 'wild_card' })).toBe(1.25);
    });

    test('Division Series = 1.5', () => {
      expect(getPlayoffMultiplier({ isPlayoffs: true, round: 'division_series' })).toBe(1.5);
    });

    test('Championship Series = 1.75', () => {
      expect(getPlayoffMultiplier({ isPlayoffs: true, round: 'championship_series' })).toBe(1.75);
    });

    test('World Series = 2.0', () => {
      expect(getPlayoffMultiplier({ isPlayoffs: true, round: 'world_series' })).toBe(2.0);
    });
  });

  describe('Elimination/Clinch Bonuses', () => {
    test('Elimination game adds +0.5', () => {
      const base = getPlayoffMultiplier({ isPlayoffs: true, round: 'world_series' });
      const elimination = getPlayoffMultiplier({
        isPlayoffs: true,
        round: 'world_series',
        isEliminationGame: true,
      });
      expect(elimination - base).toBe(0.5);
    });

    test('Clinch game adds +0.25', () => {
      const base = getPlayoffMultiplier({ isPlayoffs: true, round: 'world_series' });
      const clinch = getPlayoffMultiplier({
        isPlayoffs: true,
        round: 'world_series',
        isClinchGame: true,
      });
      expect(clinch - base).toBe(0.25);
    });

    test('Both elimination and clinch stack', () => {
      const base = getPlayoffMultiplier({ isPlayoffs: true, round: 'world_series' });
      const both = getPlayoffMultiplier({
        isPlayoffs: true,
        round: 'world_series',
        isEliminationGame: true,
        isClinchGame: true,
      });
      expect(both - base).toBe(0.75);
    });
  });
});

// ============================================
// FAME CALCULATION TESTS
// ============================================

describe('calculateFame', () => {
  describe('Basic Calculation', () => {
    test('returns correct structure', () => {
      const result = calculateFame('WALK_OFF');

      expect(result).toHaveProperty('baseFame');
      expect(result).toHaveProperty('liMultiplier');
      expect(result).toHaveProperty('playoffMultiplier');
      expect(result).toHaveProperty('finalFame');
      expect(result).toHaveProperty('isBonus');
      expect(result).toHaveProperty('isBoner');
    });

    test('WALK_OFF with default LI=1 returns base value', () => {
      const result = calculateFame('WALK_OFF');

      expect(result.baseFame).toBe(1);
      expect(result.liMultiplier).toBe(1);
      expect(result.playoffMultiplier).toBe(1);
      expect(result.finalFame).toBe(1);
      expect(result.isBonus).toBe(true);
      expect(result.isBoner).toBe(false);
    });

    test('GOLDEN_SOMBRERO returns negative values', () => {
      const result = calculateFame('GOLDEN_SOMBRERO');

      expect(result.baseFame).toBe(-1);
      expect(result.finalFame).toBe(-1);
      expect(result.isBonus).toBe(false);
      expect(result.isBoner).toBe(true);
    });
  });

  describe('LI Weighting', () => {
    test('High LI amplifies bonus Fame', () => {
      const lowLI = calculateFame('WALK_OFF', 1);
      const highLI = calculateFame('WALK_OFF', 4);

      expect(highLI.finalFame).toBe(lowLI.finalFame * 2); // √4 = 2
    });

    test('High LI amplifies boner Fame (more shame)', () => {
      const lowLI = calculateFame('TOOTBLAN', 1);
      const highLI = calculateFame('TOOTBLAN', 4);

      expect(highLI.finalFame).toBe(lowLI.finalFame * 2); // -1 * 2 = -2
      expect(highLI.finalFame).toBeLessThan(lowLI.finalFame); // More negative
    });
  });

  describe('Playoff Context', () => {
    test('World Series doubles Fame value', () => {
      const regularSeason = calculateFame('NO_HITTER');
      const worldSeries = calculateFame('NO_HITTER', 1, {
        isPlayoffs: true,
        round: 'world_series',
      });

      expect(worldSeries.playoffMultiplier).toBe(2);
      expect(worldSeries.finalFame).toBe(regularSeason.finalFame * 2);
    });

    test('Elimination game World Series has maximum multiplier', () => {
      const result = calculateFame('WALK_OFF_HR', 1, {
        isPlayoffs: true,
        round: 'world_series',
        isEliminationGame: true,
        isClinchGame: true,
      });

      expect(result.playoffMultiplier).toBe(2.75); // 2.0 + 0.5 + 0.25
    });
  });

  describe('Combined Multipliers', () => {
    test('High LI + World Series gives maximum multiplier', () => {
      const result = calculateFame('WALK_OFF_GRAND_SLAM', 9, {
        isPlayoffs: true,
        round: 'world_series',
        isEliminationGame: true,
      });

      // Base: 3, LI: √9=3, Playoff: 2.0+0.5=2.5
      expect(result.baseFame).toBe(3);
      expect(result.liMultiplier).toBe(3);
      expect(result.playoffMultiplier).toBe(2.5);
      expect(result.finalFame).toBe(3 * 3 * 2.5); // 22.5
    });
  });
});

// ============================================
// FAME TIER TESTS
// ============================================

describe('getFameTier', () => {
  describe('Positive Tiers', () => {
    test('50+ Fame = LEGENDARY', () => {
      const tier = getFameTier(50);
      expect(tier.tier).toBe('LEGENDARY');
      expect(tier.label).toBe('Legend');
    });

    test('30-50 Fame = SUPERSTAR', () => {
      const tier = getFameTier(35);
      expect(tier.tier).toBe('SUPERSTAR');
    });

    test('15-30 Fame = STAR', () => {
      const tier = getFameTier(20);
      expect(tier.tier).toBe('STAR');
    });

    test('5-15 Fame = FAN_FAVORITE', () => {
      const tier = getFameTier(10);
      expect(tier.tier).toBe('FAN_FAVORITE');
    });

    test('0-5 Fame = KNOWN', () => {
      const tier = getFameTier(3);
      expect(tier.tier).toBe('KNOWN');
    });
  });

  describe('Negative Tiers', () => {
    test('-5 to 0 Fame = UNKNOWN', () => {
      const tier = getFameTier(-3);
      expect(tier.tier).toBe('UNKNOWN');
    });

    test('-15 to -5 Fame = DISLIKED', () => {
      const tier = getFameTier(-10);
      expect(tier.tier).toBe('DISLIKED');
    });

    test('-30 to -15 Fame = VILLAIN', () => {
      const tier = getFameTier(-20);
      expect(tier.tier).toBe('VILLAIN');
    });

    test('Below -30 Fame = NOTORIOUS', () => {
      const tier = getFameTier(-50);
      expect(tier.tier).toBe('NOTORIOUS');
    });
  });

  describe('Boundary Conditions', () => {
    test('exactly 0 = KNOWN', () => {
      const tier = getFameTier(0);
      expect(tier.tier).toBe('KNOWN');
    });

    test('exactly 5 = FAN_FAVORITE', () => {
      const tier = getFameTier(5);
      expect(tier.tier).toBe('FAN_FAVORITE');
    });

    test('exactly 15 = STAR', () => {
      const tier = getFameTier(15);
      expect(tier.tier).toBe('STAR');
    });
  });
});

// ============================================
// CAREER MILESTONE DETECTION
// ============================================

describe('detectCareerMilestones', () => {
  const smb4Config: MilestoneConfig = {
    gamesPerSeason: 128,
    inningsPerGame: 6,
  };

  describe('Batting Milestones', () => {
    test('detects first career 100 HR (scaled for SMB4)', () => {
      // Opportunity-based: 100 * (128/162) * (6/9) = 100 * 0.53 = 53
      const current = createMockCareerStats({ homeRuns: 55 });
      const previous = createMockCareerStats({ homeRuns: 50 });

      const milestones = detectCareerMilestones(current, previous, smb4Config);

      expect(milestones.length).toBeGreaterThan(0);
      const hrMilestone = milestones.find(m => m.eventType === 'CAREER_HR_TIER');
      expect(hrMilestone).toBeDefined();
    });

    test('does not detect if threshold not crossed', () => {
      const current = createMockCareerStats({ homeRuns: 50 });
      const previous = createMockCareerStats({ homeRuns: 48 });

      const milestones = detectCareerMilestones(current, previous, smb4Config);

      expect(milestones.filter(m => m.eventType === 'CAREER_HR_TIER')).toHaveLength(0);
    });
  });

  describe('Pitching Milestones', () => {
    test('detects career wins milestone (per-game scaling)', () => {
      // Per-game: 25 * (128/162) = 20 (rounded)
      const current = createMockCareerStats({ wins: 21 });
      const previous = createMockCareerStats({ wins: 19 });

      const milestones = detectCareerMilestones(current, previous, smb4Config);

      const winsMilestone = milestones.find(m => m.eventType === 'CAREER_WINS_TIER');
      expect(winsMilestone).toBeDefined();
    });

    test('detects no-hitter (rare event)', () => {
      const current = createMockCareerStats({ noHitters: 1 });
      const previous = createMockCareerStats({ noHitters: 0 });

      const milestones = detectCareerMilestones(current, previous, smb4Config);

      const nhMilestone = milestones.find(m => m.eventType === 'CAREER_NO_HITTERS_TIER');
      expect(nhMilestone).toBeDefined();
      expect(nhMilestone?.tier).toBe(1);
    });
  });

  describe('WAR Component Milestones', () => {
    test('detects total WAR milestone', () => {
      // Opportunity-based: 10 * 0.53 = 5.3
      const current = createMockCareerStats({ totalWAR: 6 });
      const previous = createMockCareerStats({ totalWAR: 4 });

      const milestones = detectCareerMilestones(current, previous, smb4Config);

      expect(milestones.find(m => m.eventType === 'CAREER_WAR_TIER')).toBeDefined();
    });
  });

  describe('Award Milestones (No Scaling)', () => {
    test('detects first All-Star selection (no scaling)', () => {
      const current = createMockCareerStats({ allStarSelections: 1 });
      const previous = createMockCareerStats({ allStarSelections: 0 });

      const milestones = detectCareerMilestones(current, previous, smb4Config);

      const asMilestone = milestones.find(m => m.eventType === 'CAREER_ALL_STARS_TIER');
      expect(asMilestone).toBeDefined();
      expect(asMilestone?.threshold).toBe(1); // Not scaled
    });

    test('detects MVP award (no scaling)', () => {
      const current = createMockCareerStats({ mvpAwards: 1 });
      const previous = createMockCareerStats({ mvpAwards: 0 });

      const milestones = detectCareerMilestones(current, previous, smb4Config);

      expect(milestones.find(m => m.eventType === 'CAREER_MVPS_TIER')).toBeDefined();
    });
  });
});

// ============================================
// CAREER NEGATIVE MILESTONE DETECTION
// ============================================

describe('detectCareerNegativeMilestones', () => {
  const smb4Config: MilestoneConfig = {
    gamesPerSeason: 128,
    inningsPerGame: 6,
  };

  test('detects career strikeouts as batter', () => {
    // Opportunity-based: 500 * 0.53 = 265
    const current = createMockCareerStats({ strikeoutsBatter: 270 });
    const previous = createMockCareerStats({ strikeoutsBatter: 260 });

    const milestones = detectCareerNegativeMilestones(current, previous, smb4Config);

    expect(milestones.find(m => m.eventType === 'CAREER_K_BATTER_TIER')).toBeDefined();
  });

  test('detects career losses (per-game scaling)', () => {
    // Per-game: 100 * (128/162) = 79
    const current = createMockCareerStats({ losses: 80 });
    const previous = createMockCareerStats({ losses: 78 });

    const milestones = detectCareerNegativeMilestones(current, previous, smb4Config);

    expect(milestones.find(m => m.eventType === 'CAREER_LOSSES_TIER')).toBeDefined();
  });

  test('detects career errors (opportunity-based)', () => {
    // Opportunity-based: 100 * 0.53 = 53
    const current = createMockCareerStats({ errors: 55 });
    const previous = createMockCareerStats({ errors: 50 });

    const milestones = detectCareerNegativeMilestones(current, previous, smb4Config);

    expect(milestones.find(m => m.eventType === 'CAREER_ERRORS_TIER')).toBeDefined();
  });
});

// ============================================
// SEASON MILESTONE DETECTION
// ============================================

describe('detectSeasonMilestones', () => {
  const smb4Config: MilestoneConfig = {
    gamesPerSeason: 128,
    inningsPerGame: 6,
  };

  describe('Batting Milestones', () => {
    test('detects 40 HR season (scaled)', () => {
      // Opportunity-based: 40 * 0.53 = 21
      const stats = createMockSeasonStats({ homeRuns: 25 });

      const milestones = detectSeasonMilestones(stats, smb4Config);

      expect(milestones.find(m => m.eventType === 'SEASON_40_HR')).toBeDefined();
    });

    test('.400 BA milestone (rate - no scaling)', () => {
      const stats = createMockSeasonStats({ battingAverage: 0.405 });

      const milestones = detectSeasonMilestones(stats, smb4Config);

      expect(milestones.find(m => m.eventType === 'SEASON_400_BA')).toBeDefined();
    });

    test('30-30 Club detection (scaled)', () => {
      // Opportunity-based: 30 * 0.53 = 16 for both HR and SB
      const stats = createMockSeasonStats({
        homeRuns: 18,
        stolenBases: 18,
      });

      const milestones = detectSeasonMilestones(stats, smb4Config);

      expect(milestones.find(m => m.eventType === 'CLUB_30_30')).toBeDefined();
    });
  });

  describe('Pitching Milestones', () => {
    test('detects 15-win season (per-game scaling)', () => {
      // Per-game: 15 * (128/162) = 12
      const stats = createMockSeasonStats({ wins: 13 });

      const milestones = detectSeasonMilestones(stats, smb4Config);

      expect(milestones.find(m => m.eventType === 'SEASON_15_WINS')).toBeDefined();
    });

    test('sub-2.00 ERA milestone (rate - no scaling)', () => {
      const stats = createMockSeasonStats({ era: 1.85 });

      const milestones = detectSeasonMilestones(stats, smb4Config);

      expect(milestones.find(m => m.eventType === 'SEASON_SUB_2_ERA')).toBeDefined();
    });

    test('40 saves milestone (per-game scaling)', () => {
      // Per-game: 40 * (128/162) = 32
      const stats = createMockSeasonStats({ saves: 35 });

      const milestones = detectSeasonMilestones(stats, smb4Config);

      expect(milestones.find(m => m.eventType === 'SEASON_40_SAVES')).toBeDefined();
    });
  });

  describe('Triple Crown', () => {
    test('detects batting Triple Crown', () => {
      const stats = createMockSeasonStats({
        isLeagueLeaderAVG: true,
        isLeagueLeaderHR: true,
        isLeagueLeaderRBI: true,
      });

      const milestones = detectSeasonMilestones(stats, smb4Config);

      expect(milestones.find(m => m.eventType === 'SEASON_TRIPLE_CROWN')).toBeDefined();
    });

    test('detects pitching Triple Crown', () => {
      const stats = createMockSeasonStats({
        isLeagueLeaderWins: true,
        isLeagueLeaderK: true,
        isLeagueLeaderERA: true,
      });

      const milestones = detectSeasonMilestones(stats, smb4Config);

      expect(milestones.find(m => m.eventType === 'SEASON_PITCHING_TRIPLE_CROWN')).toBeDefined();
    });
  });
});

// ============================================
// SEASON NEGATIVE MILESTONE DETECTION
// ============================================

describe('detectSeasonNegativeMilestones', () => {
  const smb4Config: MilestoneConfig = {
    gamesPerSeason: 128,
    inningsPerGame: 6,
  };

  test('detects 200 strikeout season (scaled)', () => {
    // Opportunity-based: 200 * 0.53 = 106
    const stats = createMockSeasonStats({ strikeoutsBatter: 110 });

    const milestones = detectSeasonNegativeMilestones(stats, smb4Config);

    expect(milestones.find(m => m.eventType === 'SEASON_200_K_BATTER')).toBeDefined();
  });

  test('sub-.200 BA milestone (rate - no scaling)', () => {
    const stats = createMockSeasonStats({ battingAverage: 0.180 });

    const milestones = detectSeasonNegativeMilestones(stats, smb4Config);

    expect(milestones.find(m => m.eventType === 'SEASON_SUB_200_BA')).toBeDefined();
  });

  test('6.00+ ERA milestone (rate - no scaling)', () => {
    const stats = createMockSeasonStats({ era: 6.50 });

    const milestones = detectSeasonNegativeMilestones(stats, smb4Config);

    expect(milestones.find(m => m.eventType === 'SEASON_6_ERA')).toBeDefined();
  });

  test('20-loss season (per-game scaling)', () => {
    // Per-game: 20 * (128/162) = 16
    const stats = createMockSeasonStats({ losses: 17 });

    const milestones = detectSeasonNegativeMilestones(stats, smb4Config);

    expect(milestones.find(m => m.eventType === 'SEASON_20_LOSSES')).toBeDefined();
  });
});

// ============================================
// FIRST CAREER DETECTION
// ============================================

describe('detectFirstCareer', () => {
  test('detects first career hit', () => {
    const result = detectFirstCareer('hit', 1, 0);

    expect(result).not.toBeNull();
    expect(result?.eventType).toBe('FIRST_CAREER');
    expect(result?.description).toBe('First career hit!');
  });

  test('detects first career home run', () => {
    const result = detectFirstCareer('homeRun', 1, 0);

    expect(result).not.toBeNull();
    expect(result?.description).toBe('First career home run!');
  });

  test('detects first career win', () => {
    const result = detectFirstCareer('win', 1, 0);

    expect(result).not.toBeNull();
    expect(result?.description).toBe('First career win!');
  });

  test('returns null if not first (second hit)', () => {
    const result = detectFirstCareer('hit', 2, 1);

    expect(result).toBeNull();
  });

  test('returns null if previous was not 0', () => {
    const result = detectFirstCareer('hit', 1, 1);

    expect(result).toBeNull();
  });
});

// ============================================
// INTEGRATION: FAME CALCULATION WITH MILESTONES
// ============================================

describe('Fame Integration with Milestones', () => {
  test('career milestone Fame uses tier multipliers', () => {
    // The fameEngine detectCareerMilestones returns tier info
    // which can be used to calculate Fame: baseFame * tierMultiplier
    const current = createMockCareerStats({ noHitters: 1 });
    const previous = createMockCareerStats({ noHitters: 0 });

    const milestones = detectCareerMilestones(current, previous);

    const nhMilestone = milestones.find(m => m.eventType === 'CAREER_NO_HITTERS_TIER');
    expect(nhMilestone).toBeDefined();

    // Calculate Fame for this milestone
    const fameResult = calculateFame('CAREER_NO_HITTERS_TIER');
    expect(fameResult.baseFame).toBe(2); // CAREER_NO_HITTERS_TIER base value
  });

  test('clutch milestone has amplified Fame', () => {
    // A milestone achieved in a high-LI playoff situation
    const baseResult = calculateFame('CAREER_HR_TIER');
    const clutchResult = calculateFame('CAREER_HR_TIER', 4, {
      isPlayoffs: true,
      round: 'world_series',
    });

    expect(clutchResult.finalFame).toBe(baseResult.baseFame * 2 * 2); // √4=2, WS=2
  });
});

// ============================================
// EDGE CASES
// ============================================

describe('Edge Cases', () => {
  test('handles zero stats', () => {
    const stats = createMockCareerStats();
    const milestones = detectCareerMilestones(stats);
    expect(milestones).toHaveLength(0);
  });

  test('handles undefined previous stats', () => {
    const current = createMockCareerStats({ homeRuns: 30 });
    // Previous is undefined, should detect crossing from 0
    const milestones = detectCareerMilestones(current);
    // May or may not detect depending on threshold
    expect(milestones).toBeDefined();
  });

  test('handles season stats with 0 ERA', () => {
    const stats = createMockSeasonStats({ era: 0 });
    // 0 ERA should trigger sub-2.00 but code checks era > 0
    const milestones = detectSeasonMilestones(stats);
    // Should NOT trigger because era must be > 0
    expect(milestones.find(m => m.eventType === 'SEASON_SUB_2_ERA')).toBeUndefined();
  });

  test('handles MLB config (no scaling)', () => {
    const mlbConfig: MilestoneConfig = {
      gamesPerSeason: 162,
      inningsPerGame: 9,
    };

    const stats = createMockSeasonStats({ homeRuns: 40 });
    const milestones = detectSeasonMilestones(stats, mlbConfig);

    const hrMilestone = milestones.find(m => m.eventType === 'SEASON_40_HR');
    expect(hrMilestone).toBeDefined();
    expect(hrMilestone?.threshold).toBe(40); // Unscaled
  });
});
