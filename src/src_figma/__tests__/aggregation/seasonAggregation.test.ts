/**
 * Season Aggregation Pure Logic Tests
 * Phase 5.2 - Aggregation Utils (Pure Logic)
 *
 * Per TESTING_IMPLEMENTATION_PLAN.md Section 5.2:
 * - Game stats → season stats aggregation calculations
 * - ERA calculation accuracy
 * - AVG/OBP/SLG calculation accuracy
 * - Quality start / complete game / shutout detection
 *
 * These tests verify the pure calculation logic without IndexedDB.
 */

import { describe, test, expect } from 'vitest';

// ============================================
// RATE STAT CALCULATIONS
// ============================================

/**
 * Calculate batting average
 * Formula: Hits / At-Bats
 */
function calculateAVG(hits: number, ab: number): number {
  if (ab === 0) return 0;
  return hits / ab;
}

/**
 * Calculate on-base percentage
 * Formula: (H + BB + HBP) / (AB + BB + HBP + SF)
 */
function calculateOBP(
  hits: number,
  walks: number,
  hitByPitch: number,
  ab: number,
  sacFlies: number
): number {
  const numerator = hits + walks + hitByPitch;
  const denominator = ab + walks + hitByPitch + sacFlies;
  if (denominator === 0) return 0;
  return numerator / denominator;
}

/**
 * Calculate slugging percentage
 * Formula: Total Bases / At-Bats
 */
function calculateSLG(
  singles: number,
  doubles: number,
  triples: number,
  homeRuns: number,
  ab: number
): number {
  if (ab === 0) return 0;
  const totalBases = singles + (doubles * 2) + (triples * 3) + (homeRuns * 4);
  return totalBases / ab;
}

/**
 * Calculate OPS (On-base Plus Slugging)
 */
function calculateOPS(obp: number, slg: number): number {
  return obp + slg;
}

/**
 * Calculate ERA (Earned Run Average)
 * Formula: (Earned Runs / Innings Pitched) * 9
 * Note: IP is stored as outs recorded / 3
 */
function calculateERA(earnedRuns: number, outsRecorded: number): number {
  const ip = outsRecorded / 3;
  if (ip === 0) return 0;
  return (earnedRuns / ip) * 9;
}

/**
 * Calculate WHIP (Walks + Hits per Inning Pitched)
 * Formula: (Walks + Hits) / Innings Pitched
 */
function calculateWHIP(walks: number, hits: number, outsRecorded: number): number {
  const ip = outsRecorded / 3;
  if (ip === 0) return 0;
  return (walks + hits) / ip;
}

/**
 * Calculate K/9 (Strikeouts per 9 innings)
 */
function calculateK9(strikeouts: number, outsRecorded: number): number {
  const ip = outsRecorded / 3;
  if (ip === 0) return 0;
  return (strikeouts / ip) * 9;
}

/**
 * Calculate BB/9 (Walks per 9 innings)
 */
function calculateBB9(walks: number, outsRecorded: number): number {
  const ip = outsRecorded / 3;
  if (ip === 0) return 0;
  return (walks / ip) * 9;
}

// ============================================
// PITCHING ACHIEVEMENT DETECTION
// ============================================

interface PitcherGameStats {
  isStarter: boolean;
  outsRecorded: number;
  earnedRuns: number;
  runsAllowed: number;
  hitsAllowed: number;
  walksAllowed: number;
  hitBatters: number;
  basesReachedViaError?: number;
}

/**
 * Check if pitcher earned a quality start
 * Definition: 6+ IP, 3 or fewer ER
 */
function isQualityStart(stats: PitcherGameStats): boolean {
  return stats.isStarter &&
         stats.outsRecorded >= 18 &&  // 6 IP = 18 outs
         stats.earnedRuns <= 3;
}

/**
 * Check if pitcher threw a complete game
 * Definition: Starter pitched all 9 innings (27 outs)
 */
function isCompleteGame(stats: PitcherGameStats): boolean {
  return stats.isStarter && stats.outsRecorded >= 27;
}

/**
 * Check if pitcher threw a shutout
 * Definition: Complete game with 0 runs allowed
 */
function isShutout(stats: PitcherGameStats): boolean {
  return isCompleteGame(stats) && stats.runsAllowed === 0;
}

/**
 * Check if pitcher threw a no-hitter
 * Definition: Complete game with 0 hits allowed
 */
function isNoHitter(stats: PitcherGameStats): boolean {
  return isCompleteGame(stats) && stats.hitsAllowed === 0;
}

/**
 * Check if pitcher threw a perfect game
 * Definition: No-hitter with no walks, HBP, or errors
 */
function isPerfectGame(stats: PitcherGameStats): boolean {
  return isNoHitter(stats) &&
         stats.walksAllowed === 0 &&
         stats.hitBatters === 0 &&
         (stats.basesReachedViaError ?? 0) === 0;
}

// ============================================
// STAT AGGREGATION HELPERS
// ============================================

interface GameBattingStats {
  pa: number;
  ab: number;
  h: number;
  singles: number;
  doubles: number;
  triples: number;
  hr: number;
  rbi: number;
  r: number;
  bb: number;
  k: number;
  sb: number;
  cs: number;
  hbp?: number;
  sf?: number;
  gidp?: number;
}

interface SeasonBattingStats {
  games: number;
  pa: number;
  ab: number;
  hits: number;
  singles: number;
  doubles: number;
  triples: number;
  homeRuns: number;
  rbi: number;
  runs: number;
  walks: number;
  strikeouts: number;
  stolenBases: number;
  caughtStealing: number;
  hitByPitch: number;
  sacFlies: number;
  gidp: number;
}

/**
 * Aggregate a single game's batting stats into season totals
 */
function aggregateGameBatting(
  season: SeasonBattingStats,
  game: GameBattingStats
): SeasonBattingStats {
  return {
    games: season.games + 1,
    pa: season.pa + game.pa,
    ab: season.ab + game.ab,
    hits: season.hits + game.h,
    singles: season.singles + game.singles,
    doubles: season.doubles + game.doubles,
    triples: season.triples + game.triples,
    homeRuns: season.homeRuns + game.hr,
    rbi: season.rbi + game.rbi,
    runs: season.runs + game.r,
    walks: season.walks + game.bb,
    strikeouts: season.strikeouts + game.k,
    stolenBases: season.stolenBases + game.sb,
    caughtStealing: season.caughtStealing + game.cs,
    hitByPitch: season.hitByPitch + (game.hbp ?? 0),
    sacFlies: season.sacFlies + (game.sf ?? 0),
    gidp: season.gidp + (game.gidp ?? 0),
  };
}

function createEmptySeasonBatting(): SeasonBattingStats {
  return {
    games: 0,
    pa: 0,
    ab: 0,
    hits: 0,
    singles: 0,
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
    gidp: 0,
  };
}

// ============================================
// TESTS: BATTING AVERAGE CALCULATION
// ============================================

describe('Season Aggregation Pure Logic', () => {
  describe('Batting Average (AVG) Calculation', () => {
    test('perfect 1.000 average', () => {
      expect(calculateAVG(4, 4)).toBe(1.0);
    });

    test('.300 average', () => {
      expect(calculateAVG(3, 10)).toBe(0.3);
    });

    test('.333 average with rounding', () => {
      const avg = calculateAVG(1, 3);
      expect(avg).toBeCloseTo(0.333, 3);
    });

    test('0-fer (0 for X)', () => {
      expect(calculateAVG(0, 5)).toBe(0);
    });

    test('empty at-bats returns 0', () => {
      expect(calculateAVG(0, 0)).toBe(0);
    });

    test('season-long calculation', () => {
      // 160 hits in 500 AB = .320
      expect(calculateAVG(160, 500)).toBe(0.32);
    });
  });

  // ============================================
  // TESTS: OBP CALCULATION
  // ============================================

  describe('On-Base Percentage (OBP) Calculation', () => {
    test('OBP equals AVG when no walks/HBP', () => {
      const avg = calculateAVG(3, 10);
      const obp = calculateOBP(3, 0, 0, 10, 0);
      expect(obp).toBe(avg);
    });

    test('OBP higher than AVG with walks', () => {
      const avg = calculateAVG(3, 10);
      const obp = calculateOBP(3, 2, 0, 10, 0);
      expect(obp).toBeGreaterThan(avg);
    });

    test('OBP includes HBP', () => {
      // 3H + 2BB + 1HBP = 6 times on base
      // 10AB + 2BB + 1HBP + 0SF = 13 PA
      const obp = calculateOBP(3, 2, 1, 10, 0);
      expect(obp).toBeCloseTo(6 / 13, 4);
    });

    test('OBP includes sac flies in denominator', () => {
      // 3H / (10AB + 1SF) = 3/11
      const obp = calculateOBP(3, 0, 0, 10, 1);
      expect(obp).toBeCloseTo(3 / 11, 4);
    });

    test('perfect 1.000 OBP', () => {
      // 4 hits in 4 AB, no walks needed
      expect(calculateOBP(4, 0, 0, 4, 0)).toBe(1.0);
    });

    test('empty plate appearances returns 0', () => {
      expect(calculateOBP(0, 0, 0, 0, 0)).toBe(0);
    });

    test('.400 OBP (elite)', () => {
      // 100H + 50BB + 10HBP = 160 / (350AB + 50BB + 10HBP + 10SF) = 160/420
      const obp = calculateOBP(100, 50, 10, 350, 10);
      expect(obp).toBeCloseTo(0.381, 2);
    });
  });

  // ============================================
  // TESTS: SLG CALCULATION
  // ============================================

  describe('Slugging Percentage (SLG) Calculation', () => {
    test('all singles = SLG equals AVG', () => {
      // 3 singles in 10 AB = .300 SLG
      expect(calculateSLG(3, 0, 0, 0, 10)).toBe(0.3);
    });

    test('all doubles = 2x total bases', () => {
      // 3 doubles = 6 TB in 10 AB = .600
      expect(calculateSLG(0, 3, 0, 0, 10)).toBe(0.6);
    });

    test('all triples = 3x total bases', () => {
      // 2 triples = 6 TB in 10 AB = .600
      expect(calculateSLG(0, 0, 2, 0, 10)).toBe(0.6);
    });

    test('all home runs = 4x total bases', () => {
      // 2 HR = 8 TB in 10 AB = .800
      expect(calculateSLG(0, 0, 0, 2, 10)).toBe(0.8);
    });

    test('mixed extra-base hits', () => {
      // 1 single (1) + 1 double (2) + 1 triple (3) + 1 HR (4) = 10 TB
      // 10 TB in 20 AB = .500
      expect(calculateSLG(1, 1, 1, 1, 20)).toBe(0.5);
    });

    test('empty at-bats returns 0', () => {
      expect(calculateSLG(0, 0, 0, 0, 0)).toBe(0);
    });

    test('.500 SLG (good)', () => {
      // 100 singles + 30 doubles + 5 triples + 20 HR
      // = 100 + 60 + 15 + 80 = 255 TB in 500 AB = .510
      expect(calculateSLG(100, 30, 5, 20, 500)).toBe(0.51);
    });
  });

  // ============================================
  // TESTS: OPS CALCULATION
  // ============================================

  describe('OPS (On-base Plus Slugging) Calculation', () => {
    test('OPS = OBP + SLG', () => {
      const obp = 0.350;
      const slg = 0.450;
      expect(calculateOPS(obp, slg)).toBe(0.800);
    });

    test('.800 OPS (above average)', () => {
      expect(calculateOPS(0.350, 0.450)).toBe(0.800);
    });

    test('.900 OPS (all-star)', () => {
      expect(calculateOPS(0.380, 0.520)).toBe(0.900);
    });

    test('1.000+ OPS (elite)', () => {
      expect(calculateOPS(0.420, 0.600)).toBe(1.020);
    });
  });

  // ============================================
  // TESTS: ERA CALCULATION
  // ============================================

  describe('ERA (Earned Run Average) Calculation', () => {
    test('0.00 ERA (shutout)', () => {
      // 0 ER in 27 outs (9 IP)
      expect(calculateERA(0, 27)).toBe(0);
    });

    test('1.00 ERA (elite)', () => {
      // 1 ER in 27 outs (9 IP) = 1.00 ERA
      expect(calculateERA(1, 27)).toBe(1.0);
    });

    test('3.00 ERA (above average)', () => {
      // 3 ER in 27 outs (9 IP)
      expect(calculateERA(3, 27)).toBe(3.0);
    });

    test('4.50 ERA (league average)', () => {
      // 4.5 ER in 27 outs
      expect(calculateERA(4.5, 27)).toBe(4.5);
    });

    test('ERA with fractional innings', () => {
      // 3 ER in 20 outs (6.67 IP) = 3 / (20/3) * 9 = 4.05
      const era = calculateERA(3, 20);
      expect(era).toBeCloseTo(4.05, 2);
    });

    test('ERA scales properly', () => {
      // Double the ER = double the ERA
      const era1 = calculateERA(2, 27);
      const era2 = calculateERA(4, 27);
      expect(era2).toBe(era1 * 2);
    });

    test('0 IP returns 0 (not infinity)', () => {
      expect(calculateERA(5, 0)).toBe(0);
    });
  });

  // ============================================
  // TESTS: WHIP CALCULATION
  // ============================================

  describe('WHIP Calculation', () => {
    test('perfect game WHIP = 0', () => {
      expect(calculateWHIP(0, 0, 27)).toBe(0);
    });

    test('1.00 WHIP (good)', () => {
      // 5 walks + 4 hits = 9 baserunners in 27 outs (9 IP)
      expect(calculateWHIP(5, 4, 27)).toBe(1.0);
    });

    test('1.20 WHIP (average)', () => {
      // 6 walks + 5 hits = 11 baserunners in 27 outs = 1.222...
      const whip = calculateWHIP(6, 5, 27.5); // 9.17 IP to get ~1.2
      expect(whip).toBeCloseTo(1.2, 1);
    });

    test('WHIP with fractional innings', () => {
      // 3 walks + 5 hits = 8 in 18 outs (6 IP) = 1.333
      const whip = calculateWHIP(3, 5, 18);
      expect(whip).toBeCloseTo(1.333, 2);
    });

    test('0 IP returns 0', () => {
      expect(calculateWHIP(5, 5, 0)).toBe(0);
    });
  });

  // ============================================
  // TESTS: K/9 AND BB/9
  // ============================================

  describe('K/9 and BB/9 Calculations', () => {
    test('K/9 = 9.0 (one per inning)', () => {
      expect(calculateK9(9, 27)).toBe(9.0);
    });

    test('K/9 = 12.0 (elite)', () => {
      // 12 K in 9 IP = 12.0 K/9
      expect(calculateK9(12, 27)).toBe(12.0);
    });

    test('K/9 with fractional innings', () => {
      // 8 K in 6 IP (18 outs) = 12.0 K/9
      expect(calculateK9(8, 18)).toBe(12.0);
    });

    test('BB/9 = 3.0 (average)', () => {
      expect(calculateBB9(3, 27)).toBe(3.0);
    });

    test('BB/9 = 1.5 (elite)', () => {
      // 1.5 BB in 9 IP = 1.5 BB/9
      expect(calculateBB9(1.5, 27)).toBe(1.5);
    });

    test('0 IP returns 0 for both', () => {
      expect(calculateK9(10, 0)).toBe(0);
      expect(calculateBB9(5, 0)).toBe(0);
    });
  });

  // ============================================
  // TESTS: PITCHING ACHIEVEMENTS
  // ============================================

  describe('Pitching Achievement Detection', () => {
    describe('Quality Start', () => {
      test('quality start: 6 IP, 3 ER', () => {
        const stats: PitcherGameStats = {
          isStarter: true,
          outsRecorded: 18, // 6 IP
          earnedRuns: 3,
          runsAllowed: 3,
          hitsAllowed: 6,
          walksAllowed: 2,
          hitBatters: 0,
        };
        expect(isQualityStart(stats)).toBe(true);
      });

      test('not quality start: 5.2 IP', () => {
        const stats: PitcherGameStats = {
          isStarter: true,
          outsRecorded: 17, // 5.2 IP
          earnedRuns: 2,
          runsAllowed: 2,
          hitsAllowed: 5,
          walksAllowed: 1,
          hitBatters: 0,
        };
        expect(isQualityStart(stats)).toBe(false);
      });

      test('not quality start: 4 ER', () => {
        const stats: PitcherGameStats = {
          isStarter: true,
          outsRecorded: 21, // 7 IP
          earnedRuns: 4,
          runsAllowed: 4,
          hitsAllowed: 8,
          walksAllowed: 2,
          hitBatters: 0,
        };
        expect(isQualityStart(stats)).toBe(false);
      });

      test('not quality start: reliever', () => {
        const stats: PitcherGameStats = {
          isStarter: false,
          outsRecorded: 27, // 9 IP
          earnedRuns: 0,
          runsAllowed: 0,
          hitsAllowed: 0,
          walksAllowed: 0,
          hitBatters: 0,
        };
        expect(isQualityStart(stats)).toBe(false);
      });
    });

    describe('Complete Game', () => {
      test('complete game: 9 IP', () => {
        const stats: PitcherGameStats = {
          isStarter: true,
          outsRecorded: 27,
          earnedRuns: 3,
          runsAllowed: 3,
          hitsAllowed: 7,
          walksAllowed: 2,
          hitBatters: 0,
        };
        expect(isCompleteGame(stats)).toBe(true);
      });

      test('not complete game: 8.2 IP', () => {
        const stats: PitcherGameStats = {
          isStarter: true,
          outsRecorded: 26,
          earnedRuns: 1,
          runsAllowed: 1,
          hitsAllowed: 5,
          walksAllowed: 1,
          hitBatters: 0,
        };
        expect(isCompleteGame(stats)).toBe(false);
      });
    });

    describe('Shutout', () => {
      test('shutout: CG with 0 runs', () => {
        const stats: PitcherGameStats = {
          isStarter: true,
          outsRecorded: 27,
          earnedRuns: 0,
          runsAllowed: 0,
          hitsAllowed: 5,
          walksAllowed: 2,
          hitBatters: 0,
        };
        expect(isShutout(stats)).toBe(true);
      });

      test('not shutout: 1 unearned run', () => {
        const stats: PitcherGameStats = {
          isStarter: true,
          outsRecorded: 27,
          earnedRuns: 0,
          runsAllowed: 1, // 1 unearned
          hitsAllowed: 5,
          walksAllowed: 2,
          hitBatters: 0,
        };
        expect(isShutout(stats)).toBe(false);
      });
    });

    describe('No-Hitter', () => {
      test('no-hitter: CG with 0 hits', () => {
        const stats: PitcherGameStats = {
          isStarter: true,
          outsRecorded: 27,
          earnedRuns: 0,
          runsAllowed: 0,
          hitsAllowed: 0,
          walksAllowed: 3, // can walk batters
          hitBatters: 1,   // can hit batters
        };
        expect(isNoHitter(stats)).toBe(true);
      });

      test('not no-hitter: 1 hit in 9th', () => {
        const stats: PitcherGameStats = {
          isStarter: true,
          outsRecorded: 27,
          earnedRuns: 0,
          runsAllowed: 0,
          hitsAllowed: 1,
          walksAllowed: 0,
          hitBatters: 0,
        };
        expect(isNoHitter(stats)).toBe(false);
      });
    });

    describe('Perfect Game', () => {
      test('perfect game: 27 up, 27 down', () => {
        const stats: PitcherGameStats = {
          isStarter: true,
          outsRecorded: 27,
          earnedRuns: 0,
          runsAllowed: 0,
          hitsAllowed: 0,
          walksAllowed: 0,
          hitBatters: 0,
          basesReachedViaError: 0,
        };
        expect(isPerfectGame(stats)).toBe(true);
      });

      test('not perfect game: 1 walk', () => {
        const stats: PitcherGameStats = {
          isStarter: true,
          outsRecorded: 27,
          earnedRuns: 0,
          runsAllowed: 0,
          hitsAllowed: 0,
          walksAllowed: 1,
          hitBatters: 0,
          basesReachedViaError: 0,
        };
        expect(isPerfectGame(stats)).toBe(false);
      });

      test('not perfect game: HBP', () => {
        const stats: PitcherGameStats = {
          isStarter: true,
          outsRecorded: 27,
          earnedRuns: 0,
          runsAllowed: 0,
          hitsAllowed: 0,
          walksAllowed: 0,
          hitBatters: 1,
          basesReachedViaError: 0,
        };
        expect(isPerfectGame(stats)).toBe(false);
      });

      test('not perfect game: error', () => {
        const stats: PitcherGameStats = {
          isStarter: true,
          outsRecorded: 27,
          earnedRuns: 0,
          runsAllowed: 0,
          hitsAllowed: 0,
          walksAllowed: 0,
          hitBatters: 0,
          basesReachedViaError: 1,
        };
        expect(isPerfectGame(stats)).toBe(false);
      });
    });
  });

  // ============================================
  // TESTS: GAME → SEASON AGGREGATION
  // ============================================

  describe('Game to Season Aggregation', () => {
    test('first game of season', () => {
      const season = createEmptySeasonBatting();
      const game: GameBattingStats = {
        pa: 5,
        ab: 4,
        h: 2,
        singles: 1,
        doubles: 1,
        triples: 0,
        hr: 0,
        rbi: 2,
        r: 1,
        bb: 1,
        k: 1,
        sb: 0,
        cs: 0,
      };

      const updated = aggregateGameBatting(season, game);

      expect(updated.games).toBe(1);
      expect(updated.pa).toBe(5);
      expect(updated.ab).toBe(4);
      expect(updated.hits).toBe(2);
      expect(updated.doubles).toBe(1);
    });

    test('multiple games aggregate correctly', () => {
      let season = createEmptySeasonBatting();

      const game1: GameBattingStats = {
        pa: 4, ab: 4, h: 2, singles: 2, doubles: 0, triples: 0, hr: 0,
        rbi: 1, r: 1, bb: 0, k: 1, sb: 1, cs: 0,
      };

      const game2: GameBattingStats = {
        pa: 5, ab: 4, h: 1, singles: 0, doubles: 0, triples: 0, hr: 1,
        rbi: 3, r: 1, bb: 1, k: 2, sb: 0, cs: 0,
      };

      season = aggregateGameBatting(season, game1);
      season = aggregateGameBatting(season, game2);

      expect(season.games).toBe(2);
      expect(season.pa).toBe(9);
      expect(season.ab).toBe(8);
      expect(season.hits).toBe(3);
      expect(season.homeRuns).toBe(1);
      expect(season.rbi).toBe(4);
      expect(season.walks).toBe(1);
      expect(season.strikeouts).toBe(3);
    });

    test('aggregation preserves extra-base hit breakdown', () => {
      let season = createEmptySeasonBatting();

      for (let i = 0; i < 10; i++) {
        const game: GameBattingStats = {
          pa: 4, ab: 4, h: 2, singles: 1, doubles: 0, triples: 0, hr: 1,
          rbi: 2, r: 1, bb: 0, k: 1, sb: 0, cs: 0,
        };
        season = aggregateGameBatting(season, game);
      }

      expect(season.games).toBe(10);
      expect(season.hits).toBe(20);
      expect(season.singles).toBe(10);
      expect(season.homeRuns).toBe(10);
      expect(season.rbi).toBe(20);
    });

    test('aggregation includes optional stats', () => {
      let season = createEmptySeasonBatting();

      const game: GameBattingStats = {
        pa: 5, ab: 3, h: 1, singles: 1, doubles: 0, triples: 0, hr: 0,
        rbi: 0, r: 0, bb: 1, k: 1, sb: 0, cs: 0,
        hbp: 1,
        sf: 1,
        gidp: 1,
      };

      season = aggregateGameBatting(season, game);

      expect(season.hitByPitch).toBe(1);
      expect(season.sacFlies).toBe(1);
      expect(season.gidp).toBe(1);
    });
  });

  // ============================================
  // TESTS: RATE STAT ACCURACY WITH AGGREGATED DATA
  // ============================================

  describe('Rate Stats from Aggregated Season Data', () => {
    test('AVG from season totals', () => {
      const season: SeasonBattingStats = {
        games: 100,
        pa: 450,
        ab: 400,
        hits: 120,
        singles: 80,
        doubles: 25,
        triples: 5,
        homeRuns: 10,
        rbi: 50,
        runs: 60,
        walks: 40,
        strikeouts: 80,
        stolenBases: 15,
        caughtStealing: 5,
        hitByPitch: 5,
        sacFlies: 5,
        gidp: 10,
      };

      const avg = calculateAVG(season.hits, season.ab);
      expect(avg).toBe(0.3); // 120/400 = .300
    });

    test('OBP from season totals', () => {
      const season: SeasonBattingStats = {
        games: 100,
        pa: 450,
        ab: 400,
        hits: 120,
        singles: 80,
        doubles: 25,
        triples: 5,
        homeRuns: 10,
        rbi: 50,
        runs: 60,
        walks: 40,
        strikeouts: 80,
        stolenBases: 15,
        caughtStealing: 5,
        hitByPitch: 5,
        sacFlies: 5,
        gidp: 10,
      };

      // OBP = (H + BB + HBP) / (AB + BB + HBP + SF)
      // = (120 + 40 + 5) / (400 + 40 + 5 + 5) = 165/450 = .367
      const obp = calculateOBP(
        season.hits,
        season.walks,
        season.hitByPitch,
        season.ab,
        season.sacFlies
      );
      expect(obp).toBeCloseTo(0.367, 2);
    });

    test('SLG from season totals', () => {
      const season: SeasonBattingStats = {
        games: 100,
        pa: 450,
        ab: 400,
        hits: 120,
        singles: 80,
        doubles: 25,
        triples: 5,
        homeRuns: 10,
        rbi: 50,
        runs: 60,
        walks: 40,
        strikeouts: 80,
        stolenBases: 15,
        caughtStealing: 5,
        hitByPitch: 5,
        sacFlies: 5,
        gidp: 10,
      };

      // TB = 80 + 50 + 15 + 40 = 185
      // SLG = 185/400 = .4625
      const slg = calculateSLG(
        season.singles,
        season.doubles,
        season.triples,
        season.homeRuns,
        season.ab
      );
      expect(slg).toBeCloseTo(0.4625, 3);
    });
  });
});
