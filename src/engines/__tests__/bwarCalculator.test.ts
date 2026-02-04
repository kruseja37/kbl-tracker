/**
 * bWAR Calculator Tests
 * Verifies calculations against SMB4 baselines from ADAPTIVE_STANDARDS_ENGINE_SPEC.md
 */

import { describe, test, expect } from 'vitest';

import {
  calculateWOBA,
  calculateWRAA,
  getReplacementLevelRuns,
  getRunsPerWin,
  calculateBWAR,
  calculateBWARSimplified,
  formatWOBA,
  formatWAR,
  getWOBAQuality,
} from '../bwarCalculator';

import {
  type BattingStatsForWAR,
  createDefaultLeagueContext,
  SMB4_BASELINES,
} from '../../types/war';

// ============================================
// TEST HELPERS
// ============================================

function createTestStats(overrides: Partial<BattingStatsForWAR> = {}): BattingStatsForWAR {
  return {
    pa: 200,
    ab: 180,
    hits: 54,
    singles: 36,
    doubles: 12,
    triples: 2,
    homeRuns: 4,
    walks: 15,
    intentionalWalks: 1,
    hitByPitch: 3,
    sacFlies: 2,
    sacBunts: 0,
    strikeouts: 40,
    gidp: 5,
    stolenBases: 3,
    caughtStealing: 1,
    ...overrides,
  };
}

// ============================================
// wOBA TESTS
// ============================================

describe('calculateWOBA', () => {
  test('calculates wOBA for average player using SMB4 weights', () => {
    const stats = createTestStats();
    const woba = calculateWOBA(stats);

    // SMB4 baseline leagueWOBA is 0.329
    // A .300 BA player with modest power should be slightly above average
    // Expected: ~0.330-0.360 (above league avg)
    expect(woba).toBeGreaterThan(0.330);
    expect(woba).toBeLessThan(0.360);
  });

  test('returns 0 for no plate appearances', () => {
    // Must set ALL stats to 0 to get 0 wOBA - denominator AND numerator
    const stats = createTestStats({
      pa: 0, ab: 0, hits: 0, singles: 0, doubles: 0, triples: 0,
      homeRuns: 0, walks: 0, intentionalWalks: 0, hitByPitch: 0,
      sacFlies: 0, sacBunts: 0
    });
    expect(calculateWOBA(stats)).toBe(0);
  });

  test('excludes IBB from walk calculation', () => {
    const statsWithIBB = createTestStats({ walks: 20, intentionalWalks: 10 });
    const statsNoIBB = createTestStats({ walks: 20, intentionalWalks: 0 });

    const wobaWithIBB = calculateWOBA(statsWithIBB);
    const wobaNoIBB = calculateWOBA(statsNoIBB);

    // More IBB = lower wOBA (IBB doesn't count)
    expect(wobaWithIBB).toBeLessThan(wobaNoIBB);
  });

  test('HR has highest weight', () => {
    const baseStats = createTestStats({ singles: 0, doubles: 0, triples: 0, homeRuns: 0 });

    const hrStats = { ...baseStats, homeRuns: 10 };
    const singleStats = { ...baseStats, singles: 10 };

    const hrWoba = calculateWOBA(hrStats);
    const singleWoba = calculateWOBA(singleStats);

    expect(hrWoba).toBeGreaterThan(singleWoba);
  });
});

describe('getWOBAQuality', () => {
  test('returns correct quality grades', () => {
    // Thresholds from implementation: >=0.400 Excellent, >=0.370 Great,
    // >=0.340 Above Average, >=0.320 Average, >=0.300 Below Average,
    // >=0.280 Poor, <0.280 Awful
    expect(getWOBAQuality(0.420)).toBe('Excellent');
    expect(getWOBAQuality(0.380)).toBe('Great');
    expect(getWOBAQuality(0.350)).toBe('Above Average');
    expect(getWOBAQuality(0.320)).toBe('Average');
    expect(getWOBAQuality(0.310)).toBe('Below Average'); // 0.290 is Poor (< 0.300)
    expect(getWOBAQuality(0.285)).toBe('Poor');          // Between 0.280 and 0.300
    expect(getWOBAQuality(0.250)).toBe('Awful');
  });
});

// ============================================
// wRAA TESTS (SMB4 baselines)
// ============================================

describe('calculateWRAA', () => {
  test('calculates positive wRAA for above-average player', () => {
    // Using SMB4 baseline: leagueWOBA=0.329, wobaScale=1.7821
    // .400 wOBA, 200 PA
    const wraa = calculateWRAA(0.400, 200);
    // Expected: ((.400 - .329) / 1.7821) × 200 ≈ 7.97
    expect(wraa).toBeGreaterThan(7);
    expect(wraa).toBeLessThan(9);
  });

  test('calculates negative wRAA for below-average player', () => {
    // .280 wOBA, 200 PA
    const wraa = calculateWRAA(0.280, 200);
    // Expected: ((.280 - .329) / 1.7821) × 200 ≈ -5.50
    expect(wraa).toBeLessThan(-4);
    expect(wraa).toBeGreaterThan(-7);
  });

  test('returns 0 for league-average wOBA', () => {
    const wraa = calculateWRAA(SMB4_BASELINES.leagueWOBA, 200);
    expect(wraa).toBeCloseTo(0, 5);
  });

  test('scales linearly with PA', () => {
    const wraa100 = calculateWRAA(0.400, 100);
    const wraa200 = calculateWRAA(0.400, 200);
    expect(wraa200).toBeCloseTo(wraa100 * 2, 5);
  });
});

// ============================================
// REPLACEMENT LEVEL TESTS (SMB4 baseline: -12.0 runs per 600 PA)
// ============================================

describe('getReplacementLevelRuns', () => {
  test('returns correct value for 600 PA', () => {
    const runs = getReplacementLevelRuns(600);
    // SMB4 replacement: abs(-12.0) = 12.0 runs
    expect(runs).toBeCloseTo(12.0, 1);
  });

  test('scales linearly with PA', () => {
    const runs300 = getReplacementLevelRuns(300);
    const runs600 = getReplacementLevelRuns(600);
    expect(runs600).toBeCloseTo(runs300 * 2, 1);
  });

  test('returns 0 for 0 PA', () => {
    expect(getReplacementLevelRuns(0)).toBe(0);
  });
});

// ============================================
// RUNS PER WIN TESTS
// Per FWAR_CALCULATION_SPEC.md: RPW = 10 × (seasonGames / 162)
// NOTE: 17.87 is for Pythagorean win expectancy, NOT for WAR calculation!
// ============================================

describe('getRunsPerWin', () => {
  test('returns correct RPW for 50-game season', () => {
    // RPW = 10 × (50/162) = 3.086
    expect(getRunsPerWin(50)).toBeCloseTo(3.09, 1);
  });

  test('returns ~2.96 for 48-game season', () => {
    const rpw = getRunsPerWin(48);
    // 10 × (48/162) = 2.963
    expect(rpw).toBeCloseTo(2.96, 1);
  });

  test('returns ~1.98 for 32-game season', () => {
    const rpw = getRunsPerWin(32);
    // 10 × (32/162) = 1.975
    expect(rpw).toBeCloseTo(1.98, 1);
  });

  test('returns ~1.23 for 20-game season', () => {
    const rpw = getRunsPerWin(20);
    // 10 × (20/162) = 1.235
    expect(rpw).toBeCloseTo(1.23, 1);
  });

  test('scales linearly', () => {
    const rpw25 = getRunsPerWin(25);
    const rpw50 = getRunsPerWin(50);
    expect(rpw50).toBeCloseTo(rpw25 * 2, 2);
  });
});

// ============================================
// COMPLETE bWAR TESTS (SMB4 context)
// ============================================

describe('calculateBWAR', () => {
  test('calculates bWAR for solid player (48-game season)', () => {
    const stats: BattingStatsForWAR = {
      pa: 200,
      ab: 180,
      hits: 54,
      singles: 36,
      doubles: 12,
      triples: 2,
      homeRuns: 4,
      walks: 15,
      intentionalWalks: 1,
      hitByPitch: 3,
      sacFlies: 2,
      sacBunts: 0,
      strikeouts: 40,
      gidp: 5,
      stolenBases: 3,
      caughtStealing: 1,
    };

    const context = createDefaultLeagueContext('test', 48);
    const result = calculateBWAR(stats, context);

    // With SMB4 baselines and correct RPW formula (10 × games/162):
    // - League wOBA is 0.329
    // - A .300 BA player with modest power should be slightly above avg (~0.338)
    // - RPW for 48 games = 2.96 (not 17.15!)
    // - Same runs ÷ lower RPW = HIGHER WAR
    // - bWAR for a slightly above-average player over 200 PA: ~1.5-2.0
    expect(result.wOBA).toBeGreaterThan(0.330);
    expect(result.wOBA).toBeLessThan(0.360);
    expect(result.bWAR).toBeGreaterThan(1.0);
    expect(result.bWAR).toBeLessThan(2.5);
  });

  test('calculates positive bWAR for elite hitter', () => {
    const eliteStats: BattingStatsForWAR = {
      pa: 220,
      ab: 195,
      hits: 68,
      singles: 40,
      doubles: 16,
      triples: 4,
      homeRuns: 8,
      walks: 22,
      intentionalWalks: 3,
      hitByPitch: 2,
      sacFlies: 1,
      sacBunts: 0,
      strikeouts: 30,
      gidp: 3,
      stolenBases: 5,
      caughtStealing: 1,
    };

    const result = calculateBWARSimplified(eliteStats, 48);

    // Elite hitter (.350 BA, strong power): wOBA ~0.420 (Excellent tier)
    // With correct RPW formula (10 × 48/162 = 2.96):
    // bWAR ~4.5-6.0 for 220 PA of excellent hitting
    expect(result.wOBA).toBeGreaterThan(0.400);
    expect(result.wOBA).toBeLessThan(0.450);
    expect(result.bWAR).toBeGreaterThan(4.0);
    expect(result.bWAR).toBeLessThan(6.5);
  });

  test('calculates low/negative bWAR for weak hitter', () => {
    const weakStats: BattingStatsForWAR = {
      pa: 100,
      ab: 92,
      hits: 18,
      singles: 14,
      doubles: 3,
      triples: 0,
      homeRuns: 1,
      walks: 6,
      intentionalWalks: 0,
      hitByPitch: 1,
      sacFlies: 1,
      sacBunts: 0,
      strikeouts: 30,
      gidp: 4,
      stolenBases: 0,
      caughtStealing: 2,
    };

    const result = calculateBWARSimplified(weakStats, 48);

    // Weak hitter (.196 BA, minimal power): wOBA ~0.247 (Awful tier)
    // With correct RPW formula (10 × 48/162 = 2.96):
    // Very weak hitters can have negative bWAR (below replacement)
    // Expected bWAR ~-2.0 to 0.5
    expect(result.wOBA).toBeLessThan(0.280);
    expect(result.wOBA).toBeGreaterThan(0.200);
    expect(result.bWAR).toBeLessThan(1.0);
    expect(result.bWAR).toBeGreaterThan(-2.0);
  });

  test('returns all result components', () => {
    const stats = createTestStats();
    const result = calculateBWARSimplified(stats, 48);

    expect(result).toHaveProperty('wOBA');
    expect(result).toHaveProperty('wRAA');
    expect(result).toHaveProperty('battingRuns');
    expect(result).toHaveProperty('parkAdjustment');
    expect(result).toHaveProperty('leagueAdjustment');
    expect(result).toHaveProperty('replacementRuns');
    expect(result).toHaveProperty('runsAboveReplacement');
    expect(result).toHaveProperty('runsPerWin');
    expect(result).toHaveProperty('bWAR');
    expect(result).toHaveProperty('plateAppearances');
    expect(result).toHaveProperty('seasonGames');
  });
});

// ============================================
// FORMATTING TESTS
// ============================================

describe('formatWOBA', () => {
  test('formats wOBA without leading zero', () => {
    expect(formatWOBA(0.320)).toBe('.320');
    expect(formatWOBA(0.400)).toBe('.400');
  });

  test('rounds to 3 decimal places', () => {
    expect(formatWOBA(0.3456)).toBe('.346');
    expect(formatWOBA(0.3454)).toBe('.345');
  });
});

describe('formatWAR', () => {
  test('formats positive WAR', () => {
    expect(formatWAR(3.5)).toBe('3.5');
    expect(formatWAR(10.2)).toBe('10.2');
  });

  test('formats negative WAR', () => {
    expect(formatWAR(-1.5)).toBe('-1.5');
  });

  test('rounds to 1 decimal place', () => {
    expect(formatWAR(3.56)).toBe('3.6');
    expect(formatWAR(3.54)).toBe('3.5');
  });
});

// ============================================
// EDGE CASES
// ============================================

describe('Edge Cases', () => {
  test('handles zero stats gracefully', () => {
    const zeroStats: BattingStatsForWAR = {
      pa: 0, ab: 0, hits: 0, singles: 0, doubles: 0, triples: 0,
      homeRuns: 0, walks: 0, intentionalWalks: 0, hitByPitch: 0,
      sacFlies: 0, sacBunts: 0, strikeouts: 0, gidp: 0,
      stolenBases: 0, caughtStealing: 0,
    };

    const result = calculateBWARSimplified(zeroStats, 48);
    expect(result.wOBA).toBe(0);
    expect(result.bWAR).toBe(0);
  });

  test('handles very short season', () => {
    const stats = createTestStats({ pa: 50 });
    const result = calculateBWARSimplified(stats, 16);

    // 16-game season: RPW = 10 × (16/162) = 0.988
    expect(result.runsPerWin).toBeCloseTo(0.99, 1);
    expect(result.seasonGames).toBe(16);
  });

  test('bWAR scales inversely with season length', () => {
    const stats = createTestStats();

    const short = calculateBWARSimplified(stats, 20);
    const standard = calculateBWARSimplified(stats, 32);
    const long = calculateBWARSimplified(stats, 48);

    // Same player stats, shorter season = higher WAR (wins are more valuable)
    expect(short.bWAR).toBeGreaterThan(standard.bWAR);
    expect(standard.bWAR).toBeGreaterThan(long.bWAR);
  });
});

// ============================================
// SMB4 BASELINE VERIFICATION
// ============================================

describe('SMB4 Baseline Verification', () => {
  test('uses SMB4 league wOBA (0.329)', () => {
    expect(SMB4_BASELINES.leagueWOBA).toBe(0.329);
  });

  test('uses SMB4 wOBA scale (1.7821)', () => {
    expect(SMB4_BASELINES.wobaScale).toBe(1.7821);
  });

  test('uses SMB4 replacement level (-12.0 runs per 600 PA)', () => {
    expect(SMB4_BASELINES.replacementRunsPer600PA).toBe(-12.0);
  });

  test('uses SMB4 run environment RPW (17.87) - NOT for WAR calculation', () => {
    // Note: This is for Pythagorean expectation, NOT WAR!
    // WAR uses: 10 × (seasonGames / 162)
    expect(SMB4_BASELINES.runEnvironmentRPW).toBe(17.87);
  });

  test('league context uses SMB4 values', () => {
    const context = createDefaultLeagueContext('test', 50);

    expect(context.leagueWOBA).toBe(SMB4_BASELINES.leagueWOBA);
    expect(context.wobaScale).toBe(SMB4_BASELINES.wobaScale);
    expect(context.replacementRunsPer600PA).toBe(SMB4_BASELINES.replacementRunsPer600PA);
  });
});
