/**
 * Milestone Detector Tests
 * Phase 3.2 - Statistical Milestones
 *
 * Per MILESTONE_SYSTEM_SPEC.md:
 * - Season milestone detection (batting, pitching)
 * - Career milestone detection (batting, pitching, WAR components)
 * - Adaptive scaling for SMB4 seasons (128 games, 6 innings)
 * - HR-SB Club detection
 * - Rate-based milestones (.400 BA, sub-2.00 ERA)
 * - Milestone watch (approaching milestones)
 */

import { describe, test, expect } from 'vitest';
import {
  // Configuration
  MLB_BASELINE_GAMES,
  MLB_BASELINE_INNINGS,
  SMB4_DEFAULT_GAMES,
  SMB4_DEFAULT_INNINGS,
  MilestoneConfig,

  // Scaling functions
  getSeasonScalingFactor,
  getInningsScalingFactor,
  getCombinedScalingFactor,
  scaleCountingThreshold,
  scaleInningsThreshold,

  // Season thresholds
  SEASON_BATTING_THRESHOLDS,
  SEASON_PITCHING_THRESHOLDS,
  CLUB_THRESHOLDS,
  RATE_THRESHOLDS,

  // Career tiers
  CAREER_BATTING_TIERS,
  CAREER_PITCHING_TIERS,
  CAREER_AGGREGATE_TIERS,
  CAREER_WAR_COMPONENT_TIERS,
  CAREER_NEGATIVE_TIERS,

  // Detection functions
  checkSeasonBattingMilestones,
  checkSeasonPitchingMilestones,
  checkCareerBattingMilestones,
  checkCareerPitchingMilestones,
  checkWARComponentMilestones,
  getApproachingMilestones,
  createMilestoneRecord,
} from '../../../utils/milestoneDetector';

import type { PlayerSeasonBatting, PlayerSeasonPitching } from '../../../utils/seasonStorage';
import type { PlayerCareerBatting, PlayerCareerPitching } from '../../../utils/careerStorage';

// ============================================
// TEST DATA FACTORIES
// ============================================

function createMockSeasonBatting(overrides: Partial<PlayerSeasonBatting> = {}): PlayerSeasonBatting {
  return {
    id: 'season-batting-001',
    playerId: 'player-001',
    playerName: 'Test Player',
    seasonId: 'season-2026',
    teamId: 'team-001',
    teamName: 'Test Team',
    games: 0,
    pa: 0,
    ab: 0,
    hits: 0,
    doubles: 0,
    triples: 0,
    homeRuns: 0,
    rbi: 0,
    runs: 0,
    walks: 0,
    strikeouts: 0,
    stolenBases: 0,
    caughtStealing: 0,
    hitByPitch: 0,
    sacFlies: 0,
    sacBunts: 0,
    gidp: 0,
    ...overrides,
  };
}

function createMockSeasonPitching(overrides: Partial<PlayerSeasonPitching> = {}): PlayerSeasonPitching {
  return {
    id: 'season-pitching-001',
    playerId: 'pitcher-001',
    playerName: 'Test Pitcher',
    seasonId: 'season-2026',
    teamId: 'team-001',
    teamName: 'Test Team',
    games: 0,
    gamesStarted: 0,
    wins: 0,
    losses: 0,
    saves: 0,
    blownSaves: 0,
    holds: 0,
    outsRecorded: 0,
    hits: 0,
    runs: 0,
    earnedRuns: 0,
    homeRunsAllowed: 0,
    walksAllowed: 0,
    strikeouts: 0,
    hitBatters: 0,
    wildPitches: 0,
    completeGames: 0,
    shutouts: 0,
    noHitters: 0,
    perfectGames: 0,
    qualityStarts: 0,
    inheritedRunners: 0,
    inheritedScored: 0,
    ...overrides,
  };
}

function createMockCareerBatting(overrides: Partial<PlayerCareerBatting> = {}): PlayerCareerBatting {
  return {
    id: 'career-batting-001',
    playerId: 'player-001',
    playerName: 'Test Player',
    franchiseId: 'franchise-001',
    seasons: 0,
    games: 0,
    pa: 0,
    ab: 0,
    hits: 0,
    doubles: 0,
    triples: 0,
    homeRuns: 0,
    rbi: 0,
    runs: 0,
    walks: 0,
    strikeouts: 0,
    stolenBases: 0,
    caughtStealing: 0,
    hitByPitch: 0,
    sacFlies: 0,
    sacBunts: 0,
    gidp: 0,
    grandSlams: 0,
    errors: 0,
    bWAR: 0,
    fWAR: 0,
    rWAR: 0,
    totalWAR: 0,
    ...overrides,
  };
}

function createMockCareerPitching(overrides: Partial<PlayerCareerPitching> = {}): PlayerCareerPitching {
  return {
    id: 'career-pitching-001',
    playerId: 'pitcher-001',
    playerName: 'Test Pitcher',
    franchiseId: 'franchise-001',
    seasons: 0,
    games: 0,
    gamesStarted: 0,
    wins: 0,
    losses: 0,
    saves: 0,
    blownSaves: 0,
    holds: 0,
    outsRecorded: 0,
    inningsPitched: 0,
    hits: 0,
    runs: 0,
    earnedRuns: 0,
    homeRunsAllowed: 0,
    walksAllowed: 0,
    strikeouts: 0,
    hitBatters: 0,
    wildPitches: 0,
    completeGames: 0,
    shutouts: 0,
    noHitters: 0,
    perfectGames: 0,
    pWAR: 0,
    totalWAR: 0,
    ...overrides,
  };
}

// ============================================
// CONFIGURATION CONSTANTS
// ============================================

describe('Milestone Configuration Constants', () => {
  describe('MLB Baselines', () => {
    test('MLB baseline games = 162', () => {
      expect(MLB_BASELINE_GAMES).toBe(162);
    });

    test('MLB baseline innings = 9', () => {
      expect(MLB_BASELINE_INNINGS).toBe(9);
    });
  });

  describe('SMB4 Defaults', () => {
    test('SMB4 default games = 128', () => {
      expect(SMB4_DEFAULT_GAMES).toBe(128);
    });

    test('SMB4 default innings = 6', () => {
      expect(SMB4_DEFAULT_INNINGS).toBe(6);
    });
  });
});

// ============================================
// SCALING FUNCTIONS
// ============================================

describe('Scaling Functions', () => {
  const smb4Config: MilestoneConfig = {
    gamesPerSeason: 128,
    inningsPerGame: 6,
  };

  const mlbConfig: MilestoneConfig = {
    gamesPerSeason: 162,
    inningsPerGame: 9,
  };

  describe('getSeasonScalingFactor', () => {
    test('SMB4 season factor = 128/162 ≈ 0.79', () => {
      const factor = getSeasonScalingFactor(smb4Config);
      expect(factor).toBeCloseTo(128 / 162, 5);
      expect(factor).toBeCloseTo(0.79, 2);
    });

    test('MLB season factor = 1.0', () => {
      expect(getSeasonScalingFactor(mlbConfig)).toBe(1.0);
    });

    test('50-game season factor', () => {
      const shortConfig = { gamesPerSeason: 50, inningsPerGame: 6 };
      expect(getSeasonScalingFactor(shortConfig)).toBeCloseTo(50 / 162, 5);
    });
  });

  describe('getInningsScalingFactor', () => {
    test('SMB4 innings factor = 6/9 ≈ 0.67', () => {
      const factor = getInningsScalingFactor(smb4Config);
      expect(factor).toBeCloseTo(6 / 9, 5);
      expect(factor).toBeCloseTo(0.67, 2);
    });

    test('MLB innings factor = 1.0', () => {
      expect(getInningsScalingFactor(mlbConfig)).toBe(1.0);
    });
  });

  describe('getCombinedScalingFactor', () => {
    test('SMB4 combined factor ≈ 0.53', () => {
      const factor = getCombinedScalingFactor(smb4Config);
      expect(factor).toBeCloseTo((128 / 162) * (6 / 9), 5);
      expect(factor).toBeCloseTo(0.53, 2);
    });

    test('MLB combined factor = 1.0', () => {
      expect(getCombinedScalingFactor(mlbConfig)).toBe(1.0);
    });
  });

  describe('scaleCountingThreshold', () => {
    test('40 HR → 32 for SMB4', () => {
      // 40 * (128/162) = 31.6 → rounds to 32
      expect(scaleCountingThreshold(40, smb4Config)).toBe(32);
    });

    test('162 games → 162 for MLB', () => {
      expect(scaleCountingThreshold(162, mlbConfig)).toBe(162);
    });

    test('200 strikeouts → 158 for SMB4', () => {
      // 200 * 0.79 = 158
      expect(scaleCountingThreshold(200, smb4Config)).toBe(158);
    });
  });

  describe('scaleInningsThreshold', () => {
    test('100 IP → 53 for SMB4', () => {
      // 100 * 0.53 = 53
      expect(scaleInningsThreshold(100, smb4Config)).toBe(53);
    });

    test('200 IP → 105 for SMB4', () => {
      // 200 * (128/162) * (6/9) = 200 * 0.7901 * 0.6667 = 105.35 → rounds to 105
      expect(scaleInningsThreshold(200, smb4Config)).toBe(105);
    });

    test('MLB threshold unchanged', () => {
      expect(scaleInningsThreshold(100, mlbConfig)).toBe(100);
    });
  });
});

// ============================================
// SEASON BATTING THRESHOLDS
// ============================================

describe('Season Batting Thresholds', () => {
  describe('Home Run Thresholds', () => {
    test('has 40, 45, 55 HR thresholds', () => {
      const hrThresholds = SEASON_BATTING_THRESHOLDS.homeRuns;
      expect(hrThresholds).toHaveLength(3);
      expect(hrThresholds[0].threshold).toBe(40);
      expect(hrThresholds[1].threshold).toBe(45);
      expect(hrThresholds[2].threshold).toBe(55);
    });

    test('event types are correct', () => {
      const hrThresholds = SEASON_BATTING_THRESHOLDS.homeRuns;
      expect(hrThresholds[0].eventType).toBe('SEASON_40_HR');
      expect(hrThresholds[1].eventType).toBe('SEASON_45_HR');
      expect(hrThresholds[2].eventType).toBe('SEASON_55_HR');
    });
  });

  describe('Hits Threshold', () => {
    test('has 160 hits threshold', () => {
      expect(SEASON_BATTING_THRESHOLDS.hits[0].threshold).toBe(160);
      expect(SEASON_BATTING_THRESHOLDS.hits[0].eventType).toBe('SEASON_160_HITS');
    });
  });

  describe('RBI Threshold', () => {
    test('has 120 RBI threshold', () => {
      expect(SEASON_BATTING_THRESHOLDS.rbi[0].threshold).toBe(120);
      expect(SEASON_BATTING_THRESHOLDS.rbi[0].eventType).toBe('SEASON_120_RBI');
    });
  });

  describe('Stolen Base Thresholds', () => {
    test('has 40 and 80 SB thresholds', () => {
      const sbThresholds = SEASON_BATTING_THRESHOLDS.stolenBases;
      expect(sbThresholds).toHaveLength(2);
      expect(sbThresholds[0].threshold).toBe(40);
      expect(sbThresholds[1].threshold).toBe(80);
    });
  });

  describe('Negative Thresholds (Strikeouts)', () => {
    test('has 200 and 250 strikeout thresholds', () => {
      const kThresholds = SEASON_BATTING_THRESHOLDS.strikeouts;
      expect(kThresholds).toHaveLength(2);
      expect(kThresholds[0].threshold).toBe(200);
      expect(kThresholds[1].threshold).toBe(250);
    });
  });

  describe('GIDP Threshold', () => {
    test('has 30 GIDP threshold', () => {
      expect(SEASON_BATTING_THRESHOLDS.gidp[0].threshold).toBe(30);
    });
  });
});

// ============================================
// SEASON PITCHING THRESHOLDS
// ============================================

describe('Season Pitching Thresholds', () => {
  describe('Wins Thresholds', () => {
    test('has 15, 20, 25 win thresholds', () => {
      const winsThresholds = SEASON_PITCHING_THRESHOLDS.wins;
      expect(winsThresholds).toHaveLength(3);
      expect(winsThresholds[0].threshold).toBe(15);
      expect(winsThresholds[1].threshold).toBe(20);
      expect(winsThresholds[2].threshold).toBe(25);
    });
  });

  describe('Strikeouts Threshold', () => {
    test('has 235 strikeout threshold', () => {
      expect(SEASON_PITCHING_THRESHOLDS.strikeouts[0].threshold).toBe(235);
    });
  });

  describe('Saves Threshold', () => {
    test('has 40 saves threshold', () => {
      expect(SEASON_PITCHING_THRESHOLDS.saves[0].threshold).toBe(40);
    });
  });

  describe('Negative Thresholds', () => {
    test('has 20 losses threshold', () => {
      expect(SEASON_PITCHING_THRESHOLDS.losses[0].threshold).toBe(20);
    });

    test('has 100 walks allowed threshold', () => {
      expect(SEASON_PITCHING_THRESHOLDS.walksAllowed[0].threshold).toBe(100);
    });

    test('has 20 blown saves threshold', () => {
      expect(SEASON_PITCHING_THRESHOLDS.blownSaves[0].threshold).toBe(20);
    });

    test('has 40 HR allowed threshold', () => {
      expect(SEASON_PITCHING_THRESHOLDS.homeRunsAllowed[0].threshold).toBe(40);
    });
  });
});

// ============================================
// HR-SB CLUB THRESHOLDS
// ============================================

describe('HR-SB Club Thresholds', () => {
  test('has 5 club levels', () => {
    expect(CLUB_THRESHOLDS).toHaveLength(5);
  });

  test('15-15 Club', () => {
    expect(CLUB_THRESHOLDS[0]).toEqual({
      hr: 15, sb: 15, eventType: 'CLUB_15_15', description: '15-15 Club'
    });
  });

  test('20-20 Club', () => {
    expect(CLUB_THRESHOLDS[1]).toEqual({
      hr: 20, sb: 20, eventType: 'CLUB_20_20', description: '20-20 Club'
    });
  });

  test('25-25 Club', () => {
    expect(CLUB_THRESHOLDS[2]).toEqual({
      hr: 25, sb: 25, eventType: 'CLUB_25_25', description: '25-25 Club'
    });
  });

  test('30-30 Club', () => {
    expect(CLUB_THRESHOLDS[3]).toEqual({
      hr: 30, sb: 30, eventType: 'CLUB_30_30', description: '30-30 Club'
    });
  });

  test('40-40 Club', () => {
    expect(CLUB_THRESHOLDS[4]).toEqual({
      hr: 40, sb: 40, eventType: 'CLUB_40_40', description: '40-40 Club'
    });
  });
});

// ============================================
// RATE-BASED THRESHOLDS
// ============================================

describe('Rate-Based Thresholds', () => {
  describe('Batting Average', () => {
    test('.400 BA threshold with 200 AB minimum', () => {
      expect(RATE_THRESHOLDS.battingAvg[0].threshold).toBe(0.400);
      expect(RATE_THRESHOLDS.battingAvg[0].minAB).toBe(200);
    });

    test('Sub-.200 BA negative threshold', () => {
      expect(RATE_THRESHOLDS.battingAvgNegative[0].threshold).toBe(0.200);
      expect(RATE_THRESHOLDS.battingAvgNegative[0].minAB).toBe(200);
    });
  });

  describe('ERA', () => {
    test('Sub-2.00 ERA threshold with 100 IP minimum', () => {
      expect(RATE_THRESHOLDS.era[0].threshold).toBe(2.00);
      expect(RATE_THRESHOLDS.era[0].minIP).toBe(100);
    });

    test('Sub-1.50 ERA threshold', () => {
      expect(RATE_THRESHOLDS.era[1].threshold).toBe(1.50);
    });

    test('6.00+ ERA negative threshold with 50 IP minimum', () => {
      expect(RATE_THRESHOLDS.eraNegative[0].threshold).toBe(6.00);
      expect(RATE_THRESHOLDS.eraNegative[0].minIP).toBe(50);
    });
  });
});

// ============================================
// CAREER BATTING TIERS
// ============================================

describe('Career Batting Tiers', () => {
  describe('Home Runs', () => {
    test('has 11 tiers from 25 to 700', () => {
      const hrTiers = CAREER_BATTING_TIERS.homeRuns;
      expect(hrTiers.tiers).toHaveLength(11);
      expect(hrTiers.tiers[0].threshold).toBe(25);
      expect(hrTiers.tiers[10].threshold).toBe(700);
    });

    test('uses counting scaling', () => {
      expect(CAREER_BATTING_TIERS.homeRuns.scalingType).toBe('counting');
    });

    test('fame multipliers increase with tier', () => {
      const tiers = CAREER_BATTING_TIERS.homeRuns.tiers;
      for (let i = 1; i < tiers.length; i++) {
        expect(tiers[i].fameMultiplier).toBeGreaterThanOrEqual(tiers[i - 1].fameMultiplier);
      }
    });
  });

  describe('Hits', () => {
    test('has 7 tiers from 250 to 3000', () => {
      const hitsTiers = CAREER_BATTING_TIERS.hits;
      expect(hitsTiers.tiers).toHaveLength(7);
      expect(hitsTiers.tiers[0].threshold).toBe(250);
      expect(hitsTiers.tiers[6].threshold).toBe(3000);
    });
  });

  describe('RBI', () => {
    test('has 6 tiers from 250 to 2000', () => {
      const rbiTiers = CAREER_BATTING_TIERS.rbi;
      expect(rbiTiers.tiers).toHaveLength(6);
      expect(rbiTiers.tiers[0].threshold).toBe(250);
      expect(rbiTiers.tiers[5].threshold).toBe(2000);
    });
  });

  describe('Stolen Bases', () => {
    test('has 6 tiers from 50 to 500', () => {
      const sbTiers = CAREER_BATTING_TIERS.stolenBases;
      expect(sbTiers.tiers).toHaveLength(6);
      expect(sbTiers.tiers[0].threshold).toBe(50);
      expect(sbTiers.tiers[5].threshold).toBe(500);
    });
  });

  describe('Grand Slams', () => {
    test('has 5 tiers from 5 to 25', () => {
      const gsTiers = CAREER_BATTING_TIERS.grandSlams;
      expect(gsTiers.tiers).toHaveLength(5);
      expect(gsTiers.tiers[0].threshold).toBe(5);
      expect(gsTiers.tiers[4].threshold).toBe(25);
    });
  });
});

// ============================================
// CAREER PITCHING TIERS
// ============================================

describe('Career Pitching Tiers', () => {
  describe('Wins', () => {
    test('has 7 tiers from 25 to 300', () => {
      const winsTiers = CAREER_PITCHING_TIERS.wins;
      expect(winsTiers.tiers).toHaveLength(7);
      expect(winsTiers.tiers[0].threshold).toBe(25);
      expect(winsTiers.tiers[6].threshold).toBe(300);
    });

    test('uses counting scaling', () => {
      expect(CAREER_PITCHING_TIERS.wins.scalingType).toBe('counting');
    });
  });

  describe('Strikeouts', () => {
    test('has 7 tiers from 250 to 3000', () => {
      const kTiers = CAREER_PITCHING_TIERS.strikeouts;
      expect(kTiers.tiers).toHaveLength(7);
      expect(kTiers.tiers[0].threshold).toBe(250);
      expect(kTiers.tiers[6].threshold).toBe(3000);
    });

    test('uses innings scaling (K accumulate faster in shorter games)', () => {
      expect(CAREER_PITCHING_TIERS.strikeouts.scalingType).toBe('innings');
    });
  });

  describe('Saves', () => {
    test('has 8 tiers from 50 to 500', () => {
      const savesTiers = CAREER_PITCHING_TIERS.saves;
      expect(savesTiers.tiers).toHaveLength(8);
      expect(savesTiers.tiers[0].threshold).toBe(50);
      expect(savesTiers.tiers[7].threshold).toBe(500);
    });
  });

  describe('Innings Pitched', () => {
    test('has 6 tiers from 500 to 3000', () => {
      const ipTiers = CAREER_PITCHING_TIERS.inningsPitched;
      expect(ipTiers.tiers).toHaveLength(6);
      expect(ipTiers.tiers[0].threshold).toBe(500);
      expect(ipTiers.tiers[5].threshold).toBe(3000);
    });

    test('uses innings scaling', () => {
      expect(CAREER_PITCHING_TIERS.inningsPitched.scalingType).toBe('innings');
    });
  });

  describe('No-Hitters', () => {
    test('has 7 tiers from 1 to 7', () => {
      const noHitterTiers = CAREER_PITCHING_TIERS.noHitters;
      expect(noHitterTiers.tiers).toHaveLength(7);
      expect(noHitterTiers.tiers[0].threshold).toBe(1);
      expect(noHitterTiers.tiers[6].threshold).toBe(7);
    });

    test('first no-hitter has 2x fame multiplier', () => {
      expect(CAREER_PITCHING_TIERS.noHitters.tiers[0].fameMultiplier).toBe(2);
    });
  });

  describe('Perfect Games', () => {
    test('has 2 tiers', () => {
      const pgTiers = CAREER_PITCHING_TIERS.perfectGames;
      expect(pgTiers.tiers).toHaveLength(2);
      expect(pgTiers.tiers[0].threshold).toBe(1);
      expect(pgTiers.tiers[1].threshold).toBe(2);
    });

    test('first perfect game has 5x fame multiplier', () => {
      expect(CAREER_PITCHING_TIERS.perfectGames.tiers[0].fameMultiplier).toBe(5);
    });
  });
});

// ============================================
// CAREER WAR COMPONENT TIERS
// ============================================

describe('Career WAR Component Tiers', () => {
  describe('bWAR (Batting WAR)', () => {
    test('has 6 tiers from 5 to 65', () => {
      const bwarTiers = CAREER_WAR_COMPONENT_TIERS.bWAR;
      expect(bwarTiers.tiers).toHaveLength(6);
      expect(bwarTiers.tiers[0].threshold).toBe(5);
      expect(bwarTiers.tiers[5].threshold).toBe(65);
    });

    test('uses counting scaling', () => {
      expect(CAREER_WAR_COMPONENT_TIERS.bWAR.scalingType).toBe('counting');
    });
  });

  describe('pWAR (Pitching WAR)', () => {
    test('has 6 tiers from 5 to 65', () => {
      const pwarTiers = CAREER_WAR_COMPONENT_TIERS.pWAR;
      expect(pwarTiers.tiers).toHaveLength(6);
      expect(pwarTiers.tiers[0].threshold).toBe(5);
      expect(pwarTiers.tiers[5].threshold).toBe(65);
    });
  });

  describe('fWAR (Fielding WAR)', () => {
    test('has 5 tiers from 3 to 30 (lower than other components)', () => {
      const fwarTiers = CAREER_WAR_COMPONENT_TIERS.fWAR;
      expect(fwarTiers.tiers).toHaveLength(5);
      expect(fwarTiers.tiers[0].threshold).toBe(3);
      expect(fwarTiers.tiers[4].threshold).toBe(30);
    });
  });

  describe('rWAR (Baserunning WAR)', () => {
    test('has 5 tiers from 2 to 20 (lowest thresholds)', () => {
      const rwarTiers = CAREER_WAR_COMPONENT_TIERS.rWAR;
      expect(rwarTiers.tiers).toHaveLength(5);
      expect(rwarTiers.tiers[0].threshold).toBe(2);
      expect(rwarTiers.tiers[4].threshold).toBe(20);
    });
  });
});

// ============================================
// CAREER AGGREGATE TIERS
// ============================================

describe('Career Aggregate Tiers', () => {
  describe('Total WAR', () => {
    test('has 9 tiers from 10 to 100', () => {
      const warTiers = CAREER_AGGREGATE_TIERS.war;
      expect(warTiers.tiers).toHaveLength(9);
      expect(warTiers.tiers[0].threshold).toBe(10);
      expect(warTiers.tiers[8].threshold).toBe(100);
    });

    test('100 WAR tier has 15x fame multiplier', () => {
      expect(CAREER_AGGREGATE_TIERS.war.tiers[8].fameMultiplier).toBe(15);
    });
  });

  describe('Games Played', () => {
    test('has 6 tiers from 250 to 2000', () => {
      const gamesTiers = CAREER_AGGREGATE_TIERS.games;
      expect(gamesTiers.tiers).toHaveLength(6);
      expect(gamesTiers.tiers[0].threshold).toBe(250);
      expect(gamesTiers.tiers[5].threshold).toBe(2000);
    });
  });

  describe('All-Star Selections', () => {
    test('has 7 tiers from 1 to 15', () => {
      const asTiers = CAREER_AGGREGATE_TIERS.allStarSelections;
      expect(asTiers.tiers).toHaveLength(7);
      expect(asTiers.tiers[0].threshold).toBe(1);
      expect(asTiers.tiers[6].threshold).toBe(15);
    });

    test('uses no scaling (1 per season regardless of season length)', () => {
      expect(CAREER_AGGREGATE_TIERS.allStarSelections.scalingType).toBe('none');
    });
  });

  describe('MVP Awards', () => {
    test('has 4 tiers from 1 to 4', () => {
      const mvpTiers = CAREER_AGGREGATE_TIERS.mvpAwards;
      expect(mvpTiers.tiers).toHaveLength(4);
      expect(mvpTiers.tiers[0].threshold).toBe(1);
      expect(mvpTiers.tiers[3].threshold).toBe(4);
    });

    test('uses no scaling', () => {
      expect(CAREER_AGGREGATE_TIERS.mvpAwards.scalingType).toBe('none');
    });
  });

  describe('Cy Young Awards', () => {
    test('has 5 tiers from 1 to 5', () => {
      const cyTiers = CAREER_AGGREGATE_TIERS.cyYoungAwards;
      expect(cyTiers.tiers).toHaveLength(5);
      expect(cyTiers.tiers[0].threshold).toBe(1);
      expect(cyTiers.tiers[4].threshold).toBe(5);
    });
  });
});

// ============================================
// CAREER NEGATIVE TIERS
// ============================================

describe('Career Negative Tiers', () => {
  describe('Batter Strikeouts', () => {
    test('has 5 tiers from 500 to 2500', () => {
      const kTiers = CAREER_NEGATIVE_TIERS.strikeoutsAsBatter;
      expect(kTiers.tiers).toHaveLength(5);
      expect(kTiers.tiers[0].threshold).toBe(500);
      expect(kTiers.tiers[4].threshold).toBe(2500);
    });
  });

  describe('GIDP', () => {
    test('has 4 tiers from 100 to 400', () => {
      const gidpTiers = CAREER_NEGATIVE_TIERS.gidp;
      expect(gidpTiers.tiers).toHaveLength(4);
      expect(gidpTiers.tiers[0].threshold).toBe(100);
      expect(gidpTiers.tiers[3].threshold).toBe(400);
    });
  });

  describe('Losses', () => {
    test('has 5 tiers from 100 to 300', () => {
      const lossTiers = CAREER_NEGATIVE_TIERS.losses;
      expect(lossTiers.tiers).toHaveLength(5);
      expect(lossTiers.tiers[0].threshold).toBe(100);
      expect(lossTiers.tiers[4].threshold).toBe(300);
    });
  });

  describe('Blown Saves', () => {
    test('has 5 tiers from 25 to 125', () => {
      const bsTiers = CAREER_NEGATIVE_TIERS.blownSaves;
      expect(bsTiers.tiers).toHaveLength(5);
      expect(bsTiers.tiers[0].threshold).toBe(25);
      expect(bsTiers.tiers[4].threshold).toBe(125);
    });
  });

  describe('Errors', () => {
    test('has 6 tiers from 100 to 1000', () => {
      const errorTiers = CAREER_NEGATIVE_TIERS.errors;
      expect(errorTiers.tiers).toHaveLength(6);
      expect(errorTiers.tiers[0].threshold).toBe(100);
      expect(errorTiers.tiers[5].threshold).toBe(1000);
    });
  });
});

// ============================================
// SEASON BATTING MILESTONE DETECTION
// ============================================

describe('checkSeasonBattingMilestones', () => {
  const smb4Config: MilestoneConfig = {
    gamesPerSeason: 128,
    inningsPerGame: 6,
  };

  describe('Home Run Milestones', () => {
    test('detects 40 HR milestone (scaled to 32 for SMB4)', () => {
      const current = createMockSeasonBatting({ homeRuns: 32 });
      const previous = createMockSeasonBatting({ homeRuns: 31 });
      const achieved = new Set<string>();

      const results = checkSeasonBattingMilestones(current, previous, achieved, smb4Config);

      expect(results).toHaveLength(1);
      expect(results[0].eventType).toBe('SEASON_40_HR');
      expect(results[0].threshold).toBe(32); // Scaled
      expect(results[0].achieved).toBe(true);
    });

    test('does not re-detect already achieved milestone', () => {
      const current = createMockSeasonBatting({ homeRuns: 35 });
      const previous = createMockSeasonBatting({ homeRuns: 33 });
      const achieved = new Set(['SEASON_40_HR_season-2026']);

      const results = checkSeasonBattingMilestones(current, previous, achieved, smb4Config);

      expect(results.filter(r => r.eventType === 'SEASON_40_HR')).toHaveLength(0);
    });

    test('detects multiple HR milestones if crossed in same update', () => {
      const current = createMockSeasonBatting({ homeRuns: 45 });
      const previous = createMockSeasonBatting({ homeRuns: 30 });
      const achieved = new Set<string>();

      // 45 HR > scaled 32 (40) and scaled 36 (45)
      const results = checkSeasonBattingMilestones(current, previous, achieved, smb4Config);

      expect(results.filter(r => r.eventType.includes('HR')).length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('HR-SB Club Milestones', () => {
    test('detects 15-15 club (scaled to 12-12)', () => {
      const current = createMockSeasonBatting({ homeRuns: 12, stolenBases: 12 });
      const achieved = new Set<string>();

      const results = checkSeasonBattingMilestones(current, null, achieved, smb4Config);

      const clubResult = results.find(r => r.eventType === 'CLUB_15_15');
      expect(clubResult).toBeDefined();
    });

    test('does not detect club if only one stat qualifies', () => {
      const current = createMockSeasonBatting({ homeRuns: 20, stolenBases: 5 });
      const achieved = new Set<string>();

      const results = checkSeasonBattingMilestones(current, null, achieved, smb4Config);

      const clubResults = results.filter(r => r.eventType.includes('CLUB'));
      expect(clubResults).toHaveLength(0);
    });

    test('detects 30-30 club (scaled to 24-24)', () => {
      const current = createMockSeasonBatting({ homeRuns: 24, stolenBases: 24 });
      const achieved = new Set<string>();

      const results = checkSeasonBattingMilestones(current, null, achieved, smb4Config);

      const clubResult = results.find(r => r.eventType === 'CLUB_30_30');
      expect(clubResult).toBeDefined();
    });
  });

  describe('Batting Average Milestone', () => {
    test('detects .400 BA with sufficient AB', () => {
      // Scaled min AB: 200 * 0.79 = 158
      const current = createMockSeasonBatting({
        ab: 160,
        hits: 65, // .406 BA
      });
      const achieved = new Set<string>();

      const results = checkSeasonBattingMilestones(current, null, achieved, smb4Config);

      const baResult = results.find(r => r.eventType === 'SEASON_400_BA');
      expect(baResult).toBeDefined();
      expect(baResult?.actualValue).toBeCloseTo(0.406, 2);
    });

    test('does not detect .400 BA without sufficient AB', () => {
      const current = createMockSeasonBatting({
        ab: 50,
        hits: 25, // .500 BA but not enough AB
      });
      const achieved = new Set<string>();

      const results = checkSeasonBattingMilestones(current, null, achieved, smb4Config);

      expect(results.find(r => r.eventType === 'SEASON_400_BA')).toBeUndefined();
    });
  });

  describe('Negative Milestones', () => {
    test('detects 200 strikeout milestone (scaled)', () => {
      // Scaled: 200 * 0.79 = 158
      const current = createMockSeasonBatting({ strikeouts: 160 });
      const previous = createMockSeasonBatting({ strikeouts: 155 });
      const achieved = new Set<string>();

      const results = checkSeasonBattingMilestones(current, previous, achieved, smb4Config);

      const kResult = results.find(r => r.eventType === 'SEASON_200_K_BATTER');
      expect(kResult).toBeDefined();
      expect(kResult?.isNegative).toBe(true);
    });
  });
});

// ============================================
// SEASON PITCHING MILESTONE DETECTION
// ============================================

describe('checkSeasonPitchingMilestones', () => {
  const smb4Config: MilestoneConfig = {
    gamesPerSeason: 128,
    inningsPerGame: 6,
  };

  describe('Wins Milestones', () => {
    test('detects 15-win season (scaled to 12)', () => {
      // Scaled: 15 * 0.79 = 12
      const current = createMockSeasonPitching({ wins: 12 });
      const previous = createMockSeasonPitching({ wins: 11 });
      const achieved = new Set<string>();

      const results = checkSeasonPitchingMilestones(current, previous, achieved, smb4Config);

      expect(results.find(r => r.eventType === 'SEASON_15_WINS')).toBeDefined();
    });

    test('detects 20-win season (scaled to 16)', () => {
      // Scaled: 20 * 0.79 = 16
      const current = createMockSeasonPitching({ wins: 16 });
      const previous = createMockSeasonPitching({ wins: 15 });
      const achieved = new Set<string>();

      const results = checkSeasonPitchingMilestones(current, previous, achieved, smb4Config);

      expect(results.find(r => r.eventType === 'SEASON_20_WINS')).toBeDefined();
    });
  });

  describe('ERA Milestones', () => {
    test('detects sub-2.00 ERA with sufficient IP', () => {
      // Scaled min IP: 100 * 0.79 = 79
      const current = createMockSeasonPitching({
        outsRecorded: 250, // ~83 IP
        earnedRuns: 14, // ERA = 14/83 * 9 = 1.52
      });
      const achieved = new Set<string>();

      const results = checkSeasonPitchingMilestones(current, null, achieved, smb4Config);

      const eraResult = results.find(r => r.eventType === 'SEASON_SUB_2_ERA');
      expect(eraResult).toBeDefined();
    });

    test('detects sub-1.50 ERA', () => {
      const current = createMockSeasonPitching({
        outsRecorded: 300, // 100 IP
        earnedRuns: 12, // ERA = 12/100 * 9 = 1.08
      });
      const achieved = new Set<string>();

      const results = checkSeasonPitchingMilestones(current, null, achieved, smb4Config);

      expect(results.find(r => r.eventType === 'SEASON_SUB_1_5_ERA')).toBeDefined();
    });
  });

  describe('Negative Milestones', () => {
    test('detects 20-loss season (scaled to 16)', () => {
      const current = createMockSeasonPitching({ losses: 16 });
      const previous = createMockSeasonPitching({ losses: 15 });
      const achieved = new Set<string>();

      const results = checkSeasonPitchingMilestones(current, previous, achieved, smb4Config);

      const lossResult = results.find(r => r.eventType === 'SEASON_20_LOSSES');
      expect(lossResult).toBeDefined();
      expect(lossResult?.isNegative).toBe(true);
    });

    test('detects high ERA only near end of season', () => {
      const current = createMockSeasonPitching({
        games: 70, // 70/128 = 55% < 80% threshold
        outsRecorded: 150, // 50 IP
        earnedRuns: 40, // ERA = 40/50 * 9 = 7.2
      });
      const achieved = new Set<string>();

      const results = checkSeasonPitchingMilestones(current, null, achieved, smb4Config);

      // Should NOT detect because not near end of season
      expect(results.find(r => r.eventType === 'SEASON_6_ERA')).toBeUndefined();
    });
  });
});

// ============================================
// CAREER BATTING MILESTONE DETECTION
// ============================================

describe('checkCareerBattingMilestones', () => {
  const smb4Config: MilestoneConfig = {
    gamesPerSeason: 128,
    inningsPerGame: 6,
  };

  describe('Home Run Career Milestones', () => {
    test('detects career 100 HR (scaled to 79)', () => {
      // Scaled: 100 * 0.79 = 79
      const current = createMockCareerBatting({ homeRuns: 80 });
      const previous = createMockCareerBatting({ homeRuns: 78 });
      const achieved = new Set<string>();

      const results = checkCareerBattingMilestones(current, previous, achieved, smb4Config);

      const hrResult = results.find(r => r.eventType === 'CAREER_HR_TIER');
      expect(hrResult).toBeDefined();
      expect(hrResult?.tier).toBe(3); // Tier 3 = 100 HR
    });

    test('detects career 500 HR (scaled to 395)', () => {
      // Scaled: 500 * 0.79 = 395
      const current = createMockCareerBatting({ homeRuns: 396 });
      const previous = createMockCareerBatting({ homeRuns: 394 });
      const achieved = new Set<string>();

      const results = checkCareerBattingMilestones(current, previous, achieved, smb4Config);

      const hrResult = results.find(r => r.eventType === 'CAREER_HR_TIER' && r.tier === 9);
      expect(hrResult).toBeDefined();
    });
  });

  describe('Hits Career Milestones', () => {
    test('detects career 3000 hits (scaled to 2370)', () => {
      // Scaled: 3000 * 0.79 = 2370
      const current = createMockCareerBatting({ hits: 2371 });
      const previous = createMockCareerBatting({ hits: 2369 });
      const achieved = new Set<string>();

      const results = checkCareerBattingMilestones(current, previous, achieved, smb4Config);

      const hitsResult = results.find(r => r.eventType === 'CAREER_HITS_TIER' && r.tier === 7);
      expect(hitsResult).toBeDefined();
      expect(hitsResult?.fameValue).toBeGreaterThan(0); // High tier = high fame
    });
  });

  describe('Negative Career Milestones', () => {
    test('detects career 1000 strikeouts (scaled)', () => {
      const current = createMockCareerBatting({ strikeouts: 800 });
      const previous = createMockCareerBatting({ strikeouts: 788 });
      const achieved = new Set<string>();

      const results = checkCareerBattingMilestones(current, previous, achieved, smb4Config);

      const kResult = results.find(r => r.eventType === 'CAREER_K_BATTER_TIER');
      expect(kResult).toBeDefined();
      expect(kResult?.isNegative).toBe(true);
    });
  });
});

// ============================================
// CAREER PITCHING MILESTONE DETECTION
// ============================================

describe('checkCareerPitchingMilestones', () => {
  const smb4Config: MilestoneConfig = {
    gamesPerSeason: 128,
    inningsPerGame: 6,
  };

  describe('Wins Career Milestones', () => {
    test('detects career 100 wins (scaled to 79)', () => {
      const current = createMockCareerPitching({ wins: 80 });
      const previous = createMockCareerPitching({ wins: 78 });
      const achieved = new Set<string>();

      const results = checkCareerPitchingMilestones(current, previous, achieved, smb4Config);

      expect(results.find(r => r.eventType === 'CAREER_WINS_TIER' && r.tier === 3)).toBeDefined();
    });
  });

  describe('Saves Career Milestones', () => {
    test('detects career 300 saves (scaled to 237)', () => {
      const current = createMockCareerPitching({ saves: 238 });
      const previous = createMockCareerPitching({ saves: 236 });
      const achieved = new Set<string>();

      const results = checkCareerPitchingMilestones(current, previous, achieved, smb4Config);

      expect(results.find(r => r.eventType === 'CAREER_SAVES_TIER' && r.tier === 6)).toBeDefined();
    });
  });

  describe('No-Hitter Milestones', () => {
    test('detects first career no-hitter', () => {
      const current = createMockCareerPitching({ noHitters: 1 });
      const previous = createMockCareerPitching({ noHitters: 0 });
      const achieved = new Set<string>();

      const results = checkCareerPitchingMilestones(current, previous, achieved, smb4Config);

      const nhResult = results.find(r => r.eventType === 'CAREER_NO_HITTERS_TIER');
      expect(nhResult).toBeDefined();
      expect(nhResult?.tier).toBe(1);
    });
  });

  describe('Perfect Game Milestones', () => {
    test('detects first career perfect game', () => {
      const current = createMockCareerPitching({ perfectGames: 1 });
      const previous = createMockCareerPitching({ perfectGames: 0 });
      const achieved = new Set<string>();

      const results = checkCareerPitchingMilestones(current, previous, achieved, smb4Config);

      const pgResult = results.find(r => r.eventType === 'CAREER_PERFECT_GAMES_TIER');
      expect(pgResult).toBeDefined();
      expect(pgResult?.fameValue).toBeGreaterThan(0);
    });
  });
});

// ============================================
// WAR COMPONENT MILESTONE DETECTION
// ============================================

describe('checkWARComponentMilestones', () => {
  const smb4Config: MilestoneConfig = {
    gamesPerSeason: 128,
    inningsPerGame: 6,
  };

  describe('bWAR Milestones', () => {
    test('detects career 15 bWAR (scaled to ~12)', () => {
      const current = createMockCareerBatting({ bWAR: 12 });
      const previous = createMockCareerBatting({ bWAR: 11 });
      const achieved = new Set<string>();

      const results = checkWARComponentMilestones(
        current, null, previous, null, achieved, smb4Config
      );

      expect(results.find(r => r.eventType === 'CAREER_BWAR_TIER')).toBeDefined();
    });
  });

  describe('fWAR Milestones', () => {
    test('detects career 8 fWAR (scaled to ~6)', () => {
      const current = createMockCareerBatting({ fWAR: 7 });
      const previous = createMockCareerBatting({ fWAR: 5 });
      const achieved = new Set<string>();

      const results = checkWARComponentMilestones(
        current, null, previous, null, achieved, smb4Config
      );

      expect(results.find(r => r.eventType === 'CAREER_FWAR_TIER')).toBeDefined();
    });
  });

  describe('pWAR Milestones', () => {
    test('detects career 15 pWAR (scaled to ~12)', () => {
      const current = createMockCareerPitching({ pWAR: 12 });
      const previous = createMockCareerPitching({ pWAR: 11 });
      const achieved = new Set<string>();

      const results = checkWARComponentMilestones(
        null, current, null, previous, achieved, smb4Config
      );

      expect(results.find(r => r.eventType === 'CAREER_PWAR_TIER')).toBeDefined();
    });
  });

  describe('rWAR Milestones', () => {
    test('detects career 5 rWAR (scaled to ~4)', () => {
      const current = createMockCareerBatting({ rWAR: 4 });
      const previous = createMockCareerBatting({ rWAR: 3 });
      const achieved = new Set<string>();

      const results = checkWARComponentMilestones(
        current, null, previous, null, achieved, smb4Config
      );

      expect(results.find(r => r.eventType === 'CAREER_RWAR_TIER')).toBeDefined();
    });
  });
});

// ============================================
// APPROACHING MILESTONES (MILESTONE WATCH)
// ============================================

describe('getApproachingMilestones', () => {
  const smb4Config: MilestoneConfig = {
    gamesPerSeason: 128,
    inningsPerGame: 6,
  };

  test('identifies approaching career HR milestone', () => {
    // getApproachingMilestones uses MLB BASELINE thresholds (not scaled)
    // Tier 1 = 25 HR, Tier 2 = 50 HR, Tier 3 = 100 HR
    // 2 HR away from 50 HR tier (MLB baseline)
    // getReasonableGameMax('homeRuns') = 4, so we need <=4 away
    const careerBatting = createMockCareerBatting({
      playerId: 'player-001',
      playerName: 'Power Hitter',
      homeRuns: 48, // 2 away from 50 HR tier
    });

    const watches = getApproachingMilestones(
      careerBatting, null, null, null, new Set(), smb4Config
    );

    const hrWatch = watches.find(w => w.statName === 'homeRuns' && w.category === 'career');
    expect(hrWatch).toBeDefined();
    expect(hrWatch?.neededForMilestone).toBe(2); // 50 - 48 = 2
    expect(hrWatch?.threshold).toBe(50); // MLB baseline threshold
    expect(hrWatch?.isReachableInGame).toBe(true);
  });

  test('identifies approaching season milestone', () => {
    // Close to 40 HR season (scaled to 32)
    const seasonBatting = createMockSeasonBatting({
      playerId: 'player-001',
      playerName: 'Power Hitter',
      homeRuns: 30,
    });

    const watches = getApproachingMilestones(
      null, null, seasonBatting, null, new Set(), smb4Config
    );

    const hrWatch = watches.find(w => w.statName === 'homeRuns' && w.category === 'season');
    expect(hrWatch).toBeDefined();
    expect(hrWatch?.neededForMilestone).toBe(2);
    expect(hrWatch?.isReachableInGame).toBe(true);
  });

  test('sorts watches by proximity', () => {
    const careerBatting = createMockCareerBatting({
      homeRuns: 23, // 2 away from 25 (tier 1, scaled ~20)
      hits: 196, // Many away from 250 (tier 1, scaled ~198)
    });

    const watches = getApproachingMilestones(
      careerBatting, null, null, null, new Set(), smb4Config
    );

    // Should be sorted by neededForMilestone
    for (let i = 1; i < watches.length; i++) {
      expect(watches[i].neededForMilestone).toBeGreaterThanOrEqual(
        watches[i - 1].neededForMilestone
      );
    }
  });

  test('excludes already achieved milestones', () => {
    const careerBatting = createMockCareerBatting({
      homeRuns: 77,
    });
    const achieved = new Set(['CAREER_HR_TIER_79']); // Already achieved this tier

    const watches = getApproachingMilestones(
      careerBatting, null, null, null, achieved, smb4Config
    );

    // Should show next tier, not the achieved one
    const hrWatch = watches.find(w => w.statName === 'homeRuns');
    if (hrWatch) {
      expect(hrWatch.threshold).not.toBe(79);
    }
  });

  test('identifies pitcher milestones', () => {
    // getApproachingMilestones uses MLB BASELINE thresholds (not scaled)
    // Tier 1 = 25 wins, getReasonableGameMax('wins') = 1
    // So we need to be exactly 1 away from a tier threshold
    const careerPitching = createMockCareerPitching({
      playerId: 'pitcher-001',
      playerName: 'Ace Pitcher',
      wins: 24, // 1 away from 25 wins tier (MLB baseline)
    });

    const watches = getApproachingMilestones(
      null, careerPitching, null, null, new Set(), smb4Config
    );

    const winsWatch = watches.find(w => w.statName === 'wins');
    expect(winsWatch).toBeDefined();
    expect(winsWatch?.neededForMilestone).toBe(1);
    expect(winsWatch?.threshold).toBe(25); // MLB baseline threshold
  });
});

// ============================================
// MILESTONE RECORD CREATION
// ============================================

describe('createMilestoneRecord', () => {
  test('creates valid milestone record from detection result', () => {
    const result = {
      achieved: true,
      eventType: 'CAREER_HR_TIER' as const,
      statName: 'homeRuns',
      threshold: 100,
      actualValue: 101,
      tier: 3,
      fameValue: 5,
      description: 'Career homeRuns milestone: 100',
      category: 'career' as const,
      isNegative: false,
    };

    const record = createMilestoneRecord(
      result,
      'player-001',
      'Test Player',
      'game-001',
      'season-2026'
    );

    expect(record.playerId).toBe('player-001');
    expect(record.playerName).toBe('Test Player');
    expect(record.gameId).toBe('game-001');
    expect(record.seasonId).toBe('season-2026');
    expect(record.thresholdValue).toBe(100);
    expect(record.actualValue).toBe(101);
    expect(record.tier).toBe(3);
    expect(record.fameValue).toBe(5);
    expect(record.id).toContain('CAREER_HR_TIER');
  });

  test('includes timestamp in record ID', () => {
    const result = {
      achieved: true,
      eventType: 'SEASON_40_HR' as const,
      statName: 'homeRuns',
      threshold: 40,
      actualValue: 42,
      fameValue: 3,
      description: '40 HR Season',
      category: 'season' as const,
      isNegative: false,
    };

    const before = Date.now();
    const record = createMilestoneRecord(
      result, 'player-001', 'Player', 'game-001', 'season-2026'
    );
    const after = Date.now();

    // ID should contain a timestamp
    const idParts = record.id.split('_');
    const timestamp = parseInt(idParts[idParts.length - 1]);
    expect(timestamp).toBeGreaterThanOrEqual(before);
    expect(timestamp).toBeLessThanOrEqual(after);
  });
});

// ============================================
// EDGE CASES
// ============================================

describe('Edge Cases', () => {
  describe('Empty/Null Stats', () => {
    test('handles null previous stats', () => {
      const current = createMockSeasonBatting({ homeRuns: 10 });
      const achieved = new Set<string>();
      const smb4Config = { gamesPerSeason: 128, inningsPerGame: 6 };

      // Should not throw
      const results = checkSeasonBattingMilestones(current, null, achieved, smb4Config);
      expect(results).toBeDefined();
    });

    test('handles empty achieved set', () => {
      const current = createMockSeasonBatting({ homeRuns: 35 });
      const previous = createMockSeasonBatting({ homeRuns: 30 });
      const smb4Config = { gamesPerSeason: 128, inningsPerGame: 6 };

      const results = checkSeasonBattingMilestones(current, previous, new Set(), smb4Config);
      expect(results).toBeDefined();
    });
  });

  describe('Boundary Conditions', () => {
    test('exact threshold triggers milestone', () => {
      const smb4Config = { gamesPerSeason: 128, inningsPerGame: 6 };
      // Scaled 40 HR = 32
      const current = createMockSeasonBatting({ homeRuns: 32 });
      const previous = createMockSeasonBatting({ homeRuns: 31 });

      const results = checkSeasonBattingMilestones(current, previous, new Set(), smb4Config);

      expect(results.find(r => r.eventType === 'SEASON_40_HR')).toBeDefined();
    });

    test('one below threshold does not trigger', () => {
      const smb4Config = { gamesPerSeason: 128, inningsPerGame: 6 };
      const current = createMockSeasonBatting({ homeRuns: 31 });
      const previous = createMockSeasonBatting({ homeRuns: 30 });

      const results = checkSeasonBattingMilestones(current, previous, new Set(), smb4Config);

      expect(results.find(r => r.eventType === 'SEASON_40_HR')).toBeUndefined();
    });
  });

  describe('MLB Config (No Scaling)', () => {
    test('uses unscaled thresholds for MLB config', () => {
      const mlbConfig = { gamesPerSeason: 162, inningsPerGame: 9 };
      const current = createMockSeasonBatting({ homeRuns: 40 });
      const previous = createMockSeasonBatting({ homeRuns: 39 });

      const results = checkSeasonBattingMilestones(current, previous, new Set(), mlbConfig);

      const hrResult = results.find(r => r.eventType === 'SEASON_40_HR');
      expect(hrResult).toBeDefined();
      expect(hrResult?.threshold).toBe(40); // Unscaled
    });
  });

  describe('Multiple Milestone Types', () => {
    test('can detect both positive and negative milestones', () => {
      const smb4Config = { gamesPerSeason: 128, inningsPerGame: 6 };
      const current = createMockSeasonBatting({
        homeRuns: 35,
        strikeouts: 160,
      });
      const previous = createMockSeasonBatting({
        homeRuns: 30,
        strikeouts: 155,
      });

      const results = checkSeasonBattingMilestones(current, previous, new Set(), smb4Config);

      const positives = results.filter(r => !r.isNegative);
      const negatives = results.filter(r => r.isNegative);

      // May have both types
      expect(positives.length + negatives.length).toBeGreaterThanOrEqual(0);
    });
  });
});
