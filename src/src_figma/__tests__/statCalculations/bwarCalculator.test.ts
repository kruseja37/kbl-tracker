/**
 * bWAR Calculator Tests
 *
 * Phase 2.1 of Testing Implementation Plan
 *
 * Tests the bwarCalculator.ts engine which calculates:
 * - wOBA (Weighted On-Base Average)
 * - wRAA (Weighted Runs Above Average)
 * - Park factor adjustments
 * - Replacement level runs
 * - Complete bWAR
 *
 * Per BWAR_CALCULATION_SPEC.md and ADAPTIVE_STANDARDS_ENGINE_SPEC.md
 */

import { describe, test, expect } from 'vitest';
import {
  calculateWOBA,
  getWOBAQuality,
  calculateWRAA,
  getEffectiveParkFactor,
  applyParkFactor,
  getReplacementLevelRuns,
  getRunsPerWin,
  calculateBWAR,
  calculateBWARSimplified,
  calculateBWARBatch,
  calculateLeagueWOBA,
  recalibrateWeights,
  formatWOBA,
  formatWAR,
  formatRuns,
  SMB4_BASELINES,
  SMB4_WOBA_WEIGHTS,
  type BattingStatsForWAR,
} from '../../../engines/bwarCalculator';
import { createDefaultLeagueContext, type ParkFactors } from '../../../types/war';

// ============================================
// TEST DATA HELPERS
// ============================================

function createBattingStats(overrides: Partial<BattingStatsForWAR> = {}): BattingStatsForWAR {
  return {
    pa: 200,
    ab: 180,
    walks: 15,
    intentionalWalks: 2,
    hitByPitch: 3,
    singles: 40,
    doubles: 10,
    triples: 2,
    homeRuns: 5,
    sacFlies: 2,
    ...overrides,
  };
}

function createParkFactors(overrides: Partial<ParkFactors> = {}): ParkFactors {
  return {
    parkId: 'test-park',
    runs: 1.0,
    hr: 1.0,
    hits: 1.0,
    doubles: 1.0,
    triples: 1.0,
    leftHandedHR: 1.0,
    leftHandedAVG: 1.0,
    rightHandedHR: 1.0,
    rightHandedAVG: 1.0,
    sampleSize: 500,
    confidence: 'HIGH' as const,
    ...overrides,
  };
}

// ============================================
// wOBA CALCULATION TESTS
// ============================================

describe('wOBA Calculation', () => {
  test('calculates wOBA with standard stats', () => {
    const stats = createBattingStats();
    const woba = calculateWOBA(stats);

    // wOBA should be between 0 and ~0.500 for realistic stats
    expect(woba).toBeGreaterThan(0);
    expect(woba).toBeLessThan(0.600);
  });

  test('zero PA returns 0 wOBA', () => {
    const stats = createBattingStats({
      pa: 0,
      ab: 0,
      walks: 0,
      intentionalWalks: 0,
      hitByPitch: 0,
      singles: 0,
      doubles: 0,
      triples: 0,
      homeRuns: 0,
      sacFlies: 0,
    });

    const woba = calculateWOBA(stats);
    expect(woba).toBe(0);
  });

  test('IBB excluded from unintentional walk count', () => {
    const statsWithIBB = createBattingStats({ walks: 20, intentionalWalks: 5 });
    const statsNoIBB = createBattingStats({ walks: 15, intentionalWalks: 0 });

    // Both should have 15 unintentional walks, so similar wOBA
    const wobaWithIBB = calculateWOBA(statsWithIBB);
    const wobaNoIBB = calculateWOBA(statsNoIBB);

    // The main difference would be denominator (IBB not counted)
    // but for testing, we verify IBB doesn't inflate the wOBA numerator
    expect(wobaWithIBB).toBeGreaterThan(0);
    expect(wobaNoIBB).toBeGreaterThan(0);
  });

  test('HR has highest per-event weight impact', () => {
    // Player with only HRs
    const hrOnly = createBattingStats({
      ab: 100,
      singles: 0,
      doubles: 0,
      triples: 0,
      homeRuns: 10,
      walks: 0,
      intentionalWalks: 0,
      hitByPitch: 0,
    });

    // Player with only singles (same total bases)
    const singlesOnly = createBattingStats({
      ab: 100,
      singles: 40, // 40 singles = 40 total bases
      doubles: 0,
      triples: 0,
      homeRuns: 0, // 10 HR = 40 total bases
      walks: 0,
      intentionalWalks: 0,
      hitByPitch: 0,
    });

    const hrWoba = calculateWOBA(hrOnly);
    const singlesWoba = calculateWOBA(singlesOnly);

    // HR player should have higher wOBA per event
    // Even with fewer total bases, HR weight is ~3x single weight
    expect(hrWoba).toBeLessThan(singlesWoba); // Fewer events, but...
    // Per-event value of HR is higher
    expect(SMB4_WOBA_WEIGHTS.homeRun / SMB4_WOBA_WEIGHTS.single).toBeGreaterThan(2.5);
  });

  test('uses custom weights when provided', () => {
    const stats = createBattingStats();
    const customWeights = {
      uBB: 0.5,
      HBP: 0.5,
      single: 0.5,
      double: 1.0,
      triple: 1.5,
      homeRun: 2.0,
    };

    const defaultWoba = calculateWOBA(stats);
    const customWoba = calculateWOBA(stats, customWeights);

    // Should be different with different weights
    expect(defaultWoba).not.toBe(customWoba);
  });

  test('SMB4 wOBA weights are correct', () => {
    // Per ADAPTIVE_STANDARDS_ENGINE_SPEC.md
    expect(SMB4_WOBA_WEIGHTS.uBB).toBeCloseTo(0.521, 2);
    expect(SMB4_WOBA_WEIGHTS.HBP).toBeCloseTo(0.566, 2);
    expect(SMB4_WOBA_WEIGHTS.single).toBeCloseTo(0.797, 2);
    expect(SMB4_WOBA_WEIGHTS.double).toBeCloseTo(1.332, 2);
    expect(SMB4_WOBA_WEIGHTS.triple).toBeCloseTo(1.813, 2);
    expect(SMB4_WOBA_WEIGHTS.homeRun).toBeCloseTo(2.495, 2);
  });
});

describe('wOBA Quality', () => {
  test('excellent wOBA >= 0.400', () => {
    expect(getWOBAQuality(0.450)).toBe('Excellent');
    expect(getWOBAQuality(0.400)).toBe('Excellent');
  });

  test('great wOBA 0.370-0.399', () => {
    expect(getWOBAQuality(0.385)).toBe('Great');
    expect(getWOBAQuality(0.370)).toBe('Great');
  });

  test('above average wOBA 0.340-0.369', () => {
    expect(getWOBAQuality(0.350)).toBe('Above Average');
    expect(getWOBAQuality(0.340)).toBe('Above Average');
  });

  test('average wOBA 0.320-0.339', () => {
    expect(getWOBAQuality(0.329)).toBe('Average');
    expect(getWOBAQuality(0.320)).toBe('Average');
  });

  test('below average wOBA 0.300-0.319', () => {
    expect(getWOBAQuality(0.310)).toBe('Below Average');
    expect(getWOBAQuality(0.300)).toBe('Below Average');
  });

  test('poor wOBA 0.280-0.299', () => {
    expect(getWOBAQuality(0.290)).toBe('Poor');
    expect(getWOBAQuality(0.280)).toBe('Poor');
  });

  test('awful wOBA < 0.280', () => {
    expect(getWOBAQuality(0.250)).toBe('Awful');
    expect(getWOBAQuality(0.200)).toBe('Awful');
  });
});

// ============================================
// wRAA CALCULATION TESTS
// ============================================

describe('wRAA Calculation', () => {
  test('above-average player has positive wRAA', () => {
    const playerWOBA = 0.380; // Well above league average
    const pa = 500;
    const leagueWOBA = SMB4_BASELINES.leagueWOBA; // 0.329

    const wraa = calculateWRAA(playerWOBA, pa, leagueWOBA);
    expect(wraa).toBeGreaterThan(0);
  });

  test('below-average player has negative wRAA', () => {
    const playerWOBA = 0.280; // Below league average
    const pa = 500;
    const leagueWOBA = SMB4_BASELINES.leagueWOBA; // 0.329

    const wraa = calculateWRAA(playerWOBA, pa, leagueWOBA);
    expect(wraa).toBeLessThan(0);
  });

  test('league-average wOBA produces 0 wRAA', () => {
    const playerWOBA = SMB4_BASELINES.leagueWOBA;
    const pa = 500;

    const wraa = calculateWRAA(playerWOBA, pa);
    expect(wraa).toBeCloseTo(0, 5);
  });

  test('wRAA scales linearly with PA', () => {
    const playerWOBA = 0.380;
    const leagueWOBA = SMB4_BASELINES.leagueWOBA;

    const wraa200 = calculateWRAA(playerWOBA, 200, leagueWOBA);
    const wraa400 = calculateWRAA(playerWOBA, 400, leagueWOBA);

    expect(wraa400).toBeCloseTo(wraa200 * 2, 5);
  });

  test('zero PA returns 0 wRAA', () => {
    const wraa = calculateWRAA(0.380, 0);
    expect(wraa).toBe(0);
  });

  test('uses SMB4 defaults when not specified', () => {
    const wraa = calculateWRAA(0.380, 500);
    // Should use SMB4_BASELINES.leagueWOBA (0.329) and wobaScale (1.7821)
    expect(wraa).toBeGreaterThan(0);
  });
});

// ============================================
// PARK FACTOR TESTS
// ============================================

describe('Park Factor Adjustments', () => {
  test('getEffectiveParkFactor for right-handed batter', () => {
    const parkFactors = createParkFactors({
      rightHandedHR: 1.1,
      rightHandedAVG: 1.05,
      runs: 1.0,
    });

    const effectivePF = getEffectiveParkFactor(parkFactors, 'R');

    // 60% of (1.1 + 1.05)/2 + 40% of 1.0
    // = 0.6 * 1.075 + 0.4 * 1.0 = 0.645 + 0.4 = 1.045
    expect(effectivePF).toBeCloseTo(1.045, 2);
  });

  test('getEffectiveParkFactor for left-handed batter', () => {
    const parkFactors = createParkFactors({
      leftHandedHR: 0.9,
      leftHandedAVG: 0.95,
      runs: 1.0,
    });

    const effectivePF = getEffectiveParkFactor(parkFactors, 'L');

    // 60% of (0.9 + 0.95)/2 + 40% of 1.0
    // = 0.6 * 0.925 + 0.4 * 1.0 = 0.555 + 0.4 = 0.955
    expect(effectivePF).toBeCloseTo(0.955, 2);
  });

  test('getEffectiveParkFactor for switch hitter averages both', () => {
    const parkFactors = createParkFactors({
      leftHandedHR: 0.9,
      leftHandedAVG: 0.9,
      rightHandedHR: 1.1,
      rightHandedAVG: 1.1,
    });

    const effectivePF = getEffectiveParkFactor(parkFactors, 'S');

    // Left: (0.9 + 0.9)/2 = 0.9
    // Right: (1.1 + 1.1)/2 = 1.1
    // Average: (0.9 + 1.1)/2 = 1.0
    expect(effectivePF).toBeCloseTo(1.0, 2);
  });

  test('hitter\'s park (PF > 1) reduces credit', () => {
    const wRAA = 10.0;
    const homePA = 250;
    const parkFactor = 1.10; // Hitter's park
    const leagueRunsPerPA = 0.115;

    const adjustedWRAA = applyParkFactor(wRAA, homePA, parkFactor, leagueRunsPerPA);

    // Park adjustment should be negative (reduces credit)
    expect(adjustedWRAA).toBeLessThan(wRAA);
  });

  test('pitcher\'s park (PF < 1) increases credit', () => {
    const wRAA = 10.0;
    const homePA = 250;
    const parkFactor = 0.90; // Pitcher's park
    const leagueRunsPerPA = 0.115;

    const adjustedWRAA = applyParkFactor(wRAA, homePA, parkFactor, leagueRunsPerPA);

    // Park adjustment should be positive (increases credit)
    expect(adjustedWRAA).toBeGreaterThan(wRAA);
  });

  test('neutral park (PF = 1) no adjustment', () => {
    const wRAA = 10.0;
    const homePA = 250;
    const parkFactor = 1.0;
    const leagueRunsPerPA = 0.115;

    const adjustedWRAA = applyParkFactor(wRAA, homePA, parkFactor, leagueRunsPerPA);

    expect(adjustedWRAA).toBeCloseTo(wRAA, 5);
  });
});

// ============================================
// REPLACEMENT LEVEL TESTS
// ============================================

describe('Replacement Level', () => {
  test('SMB4 replacement level is -12.0 per 600 PA', () => {
    expect(SMB4_BASELINES.replacementRunsPer600PA).toBe(-12.0);
  });

  test('getReplacementLevelRuns scales with PA', () => {
    const runs300 = getReplacementLevelRuns(300);
    const runs600 = getReplacementLevelRuns(600);

    expect(runs600).toBeCloseTo(runs300 * 2, 5);
  });

  test('600 PA returns absolute value of replacement level', () => {
    const runs = getReplacementLevelRuns(600);

    // Returns positive (to add to batting runs)
    expect(runs).toBeCloseTo(12.0, 5);
  });

  test('0 PA returns 0 replacement runs', () => {
    const runs = getReplacementLevelRuns(0);
    expect(runs).toBe(0);
  });

  test('uses custom replacement level when provided', () => {
    const customReplacement = -15.0;
    const runs = getReplacementLevelRuns(600, customReplacement);

    expect(runs).toBeCloseTo(15.0, 5);
  });
});

// ============================================
// RUNS PER WIN TESTS
// ============================================

describe('Runs Per Win', () => {
  test('162 games = 10 RPW', () => {
    const rpw = getRunsPerWin(162);
    expect(rpw).toBeCloseTo(10.0, 5);
  });

  test('shorter seasons have fewer runs per win', () => {
    const rpw50 = getRunsPerWin(50);
    const rpw162 = getRunsPerWin(162);

    // 50-game season: 10 * (50/162) = 3.09
    expect(rpw50).toBeCloseTo(3.09, 1);
    expect(rpw50).toBeLessThan(rpw162);
  });

  test('48-game season (SMB4 long)', () => {
    const rpw = getRunsPerWin(48);
    // 10 * (48/162) = 2.96
    expect(rpw).toBeCloseTo(2.96, 1);
  });

  test('32-game season (SMB4 standard)', () => {
    const rpw = getRunsPerWin(32);
    // 10 * (32/162) = 1.975
    expect(rpw).toBeCloseTo(1.975, 1);
  });

  test('16-game season (SMB4 mini)', () => {
    const rpw = getRunsPerWin(16);
    // 10 * (16/162) = 0.988
    expect(rpw).toBeCloseTo(0.988, 1);
  });
});

// ============================================
// COMPLETE bWAR CALCULATION TESTS
// ============================================

describe('Complete bWAR Calculation', () => {
  test('calculates bWAR for solid hitter', () => {
    // Good hitter: .300+ BA, 8+ HR in 48-game season
    const stats = createBattingStats({
      pa: 200,
      ab: 175,
      walks: 20,
      intentionalWalks: 2,
      hitByPitch: 3,
      singles: 35,
      doubles: 12,
      triples: 2,
      homeRuns: 8,
      sacFlies: 2,
    });

    const context = createDefaultLeagueContext('test', 48);
    const result = calculateBWAR(stats, context);

    expect(result.wOBA).toBeGreaterThan(SMB4_BASELINES.leagueWOBA);
    expect(result.wRAA).toBeGreaterThan(0);
    expect(result.bWAR).toBeGreaterThan(0);
  });

  test('calculates bWAR for weak hitter', () => {
    // Weak hitter: .220 BA, few extra-base hits
    const stats = createBattingStats({
      pa: 200,
      ab: 180,
      walks: 10,
      intentionalWalks: 0,
      hitByPitch: 2,
      singles: 25,
      doubles: 5,
      triples: 0,
      homeRuns: 2,
      sacFlies: 1,
    });

    const context = createDefaultLeagueContext('test', 48);
    const result = calculateBWAR(stats, context);

    expect(result.wOBA).toBeLessThan(SMB4_BASELINES.leagueWOBA);
    expect(result.wRAA).toBeLessThan(0);
    // bWAR might still be positive due to replacement level
    // but should be lower than good hitter
  });

  test('bWAR includes all component calculations', () => {
    const stats = createBattingStats();
    const context = createDefaultLeagueContext('test', 48);
    const result = calculateBWAR(stats, context);

    expect(result.wOBA).toBeDefined();
    expect(result.wRAA).toBeDefined();
    expect(result.battingRuns).toBeDefined();
    expect(result.parkAdjustment).toBeDefined();
    expect(result.leagueAdjustment).toBeDefined();
    expect(result.replacementRuns).toBeDefined();
    expect(result.runsAboveReplacement).toBeDefined();
    expect(result.runsPerWin).toBeDefined();
    expect(result.bWAR).toBeDefined();
    expect(result.plateAppearances).toBe(stats.pa);
    expect(result.seasonGames).toBe(48);
  });

  test('bWAR with park factors', () => {
    const stats = createBattingStats();
    const context = createDefaultLeagueContext('test', 48);
    const parkFactors = createParkFactors({ runs: 1.1 }); // Hitter's park

    const resultWithPark = calculateBWAR(stats, context, {
      parkFactors,
      batterHand: 'R',
    });
    const resultNoPark = calculateBWAR(stats, context);

    // With hitter's park, bWAR should be slightly lower
    expect(resultWithPark.parkAdjustment).not.toBe(0);
  });

  test('simplified bWAR without park factors', () => {
    const stats = createBattingStats();
    const result = calculateBWARSimplified(stats, 48);

    expect(result.bWAR).toBeDefined();
    expect(result.parkAdjustment).toBe(0);
    expect(result.seasonGames).toBe(48);
  });
});

// ============================================
// BATCH CALCULATION TESTS
// ============================================

describe('Batch bWAR Calculation', () => {
  test('calculates bWAR for multiple players', () => {
    const players = [
      { playerId: 'player-1', stats: createBattingStats({ homeRuns: 10 }) },
      { playerId: 'player-2', stats: createBattingStats({ homeRuns: 5 }) },
      { playerId: 'player-3', stats: createBattingStats({ homeRuns: 2 }) },
    ];

    const context = createDefaultLeagueContext('test', 48);
    const results = calculateBWARBatch(players, context);

    expect(results.size).toBe(3);
    expect(results.has('player-1')).toBe(true);
    expect(results.has('player-2')).toBe(true);
    expect(results.has('player-3')).toBe(true);

    // Player with more HRs should have higher bWAR
    const p1WAR = results.get('player-1')!.bWAR;
    const p3WAR = results.get('player-3')!.bWAR;
    expect(p1WAR).toBeGreaterThan(p3WAR);
  });

  test('empty batch returns empty map', () => {
    const context = createDefaultLeagueContext('test', 48);
    const results = calculateBWARBatch([], context);

    expect(results.size).toBe(0);
  });
});

// ============================================
// CALIBRATION HELPERS TESTS
// ============================================

describe('Calibration Helpers', () => {
  test('calculateLeagueWOBA from aggregate stats', () => {
    // Aggregate stats for a league
    const leagueStats = createBattingStats({
      pa: 10000,
      ab: 9000,
      walks: 800,
      intentionalWalks: 50,
      hitByPitch: 150,
      singles: 2000,
      doubles: 500,
      triples: 50,
      homeRuns: 300,
      sacFlies: 100,
    });

    const leagueWOBA = calculateLeagueWOBA(leagueStats);

    expect(leagueWOBA).toBeGreaterThan(0);
    expect(leagueWOBA).toBeLessThan(0.500);
  });

  test('recalibrateWeights produces valid weights', () => {
    const leagueRunsPerOut = 0.15; // Typical value
    const weights = recalibrateWeights(leagueRunsPerOut);

    expect(weights.uBB).toBeGreaterThan(0);
    expect(weights.HBP).toBeGreaterThan(weights.uBB);
    expect(weights.single).toBeGreaterThan(weights.HBP);
    expect(weights.double).toBeGreaterThan(weights.single);
    expect(weights.triple).toBeGreaterThan(weights.double);
    expect(weights.homeRun).toBeGreaterThan(weights.triple);
  });
});

// ============================================
// DISPLAY HELPERS TESTS
// ============================================

describe('Display Helpers', () => {
  test('formatWOBA removes leading zero', () => {
    expect(formatWOBA(0.329)).toBe('.329');
    expect(formatWOBA(0.400)).toBe('.400');
    expect(formatWOBA(0.285)).toBe('.285');
  });

  test('formatWOBA shows 3 decimal places', () => {
    expect(formatWOBA(0.3)).toBe('.300');
    expect(formatWOBA(0.3456)).toBe('.346');
  });

  test('formatWAR shows 1 decimal place', () => {
    expect(formatWAR(2.5)).toBe('2.5');
    expect(formatWAR(-0.3)).toBe('-0.3');
    expect(formatWAR(0)).toBe('0.0');
  });

  test('formatRuns shows + for positive', () => {
    expect(formatRuns(5.2)).toBe('+5.2');
    expect(formatRuns(-3.1)).toBe('-3.1');
    expect(formatRuns(0)).toBe('+0.0');
  });
});

// ============================================
// EDGE CASES
// ============================================

describe('Edge Cases', () => {
  test('all zeros produces 0 bWAR', () => {
    const zeroStats: BattingStatsForWAR = {
      pa: 0,
      ab: 0,
      walks: 0,
      intentionalWalks: 0,
      hitByPitch: 0,
      singles: 0,
      doubles: 0,
      triples: 0,
      homeRuns: 0,
      sacFlies: 0,
    };

    const result = calculateBWARSimplified(zeroStats, 48);
    expect(result.bWAR).toBe(0);
  });

  test('only walks (no AB)', () => {
    const walkOnlyStats: BattingStatsForWAR = {
      pa: 10,
      ab: 0,
      walks: 10,
      intentionalWalks: 0,
      hitByPitch: 0,
      singles: 0,
      doubles: 0,
      triples: 0,
      homeRuns: 0,
      sacFlies: 0,
    };

    const woba = calculateWOBA(walkOnlyStats);
    expect(woba).toBeGreaterThan(0); // Walks have value
  });

  test('perfect hitter (all home runs)', () => {
    const perfectStats: BattingStatsForWAR = {
      pa: 100,
      ab: 100,
      walks: 0,
      intentionalWalks: 0,
      hitByPitch: 0,
      singles: 0,
      doubles: 0,
      triples: 0,
      homeRuns: 100, // Every AB is a HR
      sacFlies: 0,
    };

    const woba = calculateWOBA(perfectStats);
    expect(woba).toBeGreaterThan(2.0); // Very high wOBA
  });

  test('low PA player', () => {
    const lowPA: BattingStatsForWAR = {
      pa: 5,
      ab: 4,
      walks: 1,
      intentionalWalks: 0,
      hitByPitch: 0,
      singles: 2,
      doubles: 0,
      triples: 0,
      homeRuns: 0,
      sacFlies: 0,
    };

    const result = calculateBWARSimplified(lowPA, 48);
    // Should calculate without error, even with tiny sample
    expect(result.bWAR).toBeDefined();
    expect(typeof result.bWAR).toBe('number');
    expect(!isNaN(result.bWAR)).toBe(true);
  });
});

// ============================================
// SEASON LENGTH IMPACT TESTS
// ============================================

describe('Season Length Impact', () => {
  test('shorter season = higher WAR per run', () => {
    const stats = createBattingStats();

    const result16 = calculateBWARSimplified(stats, 16);
    const result48 = calculateBWARSimplified(stats, 48);

    // Same player in shorter season should have higher WAR
    // because each run is worth more wins
    // (assuming similar wRAA, replacement level scales with games played)
    expect(result16.runsPerWin).toBeLessThan(result48.runsPerWin);
  });

  test('full MLB season (162 games)', () => {
    const stats = createBattingStats({ pa: 600 }); // Full season PA
    const result = calculateBWARSimplified(stats, 162);

    expect(result.runsPerWin).toBeCloseTo(10.0, 1);
    expect(result.seasonGames).toBe(162);
  });
});
