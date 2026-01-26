/**
 * bWAR Calculator Test Runner
 *
 * Run with: npx ts-node src/tests/runBwarTests.ts
 *
 * Verifies bWAR calculations against SMB4 baselines
 */

import {
  calculateWOBA,
  calculateWRAA,
  getReplacementLevelRuns,
  getRunsPerWin,
  calculateBWARSimplified,
  formatWOBA,
  formatWAR,
} from '../engines/bwarCalculator.js';

import {
  type BattingStatsForWAR,
  createDefaultLeagueContext,
  SMB4_BASELINES,
} from '../types/war.js';

// =============================================
// TEST UTILITIES
// =============================================

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void): void {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (error: any) {
    failed++;
    console.log(`  ✗ ${name}`);
    console.log(`    Error: ${error.message}`);
  }
}

function expect(actual: any) {
  return {
    toBe(expected: any) {
      if (actual !== expected) {
        throw new Error(`Expected ${expected}, got ${actual}`);
      }
    },
    toBeCloseTo(expected: number, precision: number = 2) {
      const factor = Math.pow(10, precision);
      const actualRounded = Math.round(actual * factor) / factor;
      const expectedRounded = Math.round(expected * factor) / factor;
      if (actualRounded !== expectedRounded) {
        throw new Error(`Expected ~${expected}, got ${actual}`);
      }
    },
    toBeGreaterThan(expected: number) {
      if (actual <= expected) {
        throw new Error(`Expected ${actual} > ${expected}`);
      }
    },
    toBeLessThan(expected: number) {
      if (actual >= expected) {
        throw new Error(`Expected ${actual} < ${expected}`);
      }
    },
    toHaveProperty(prop: string) {
      if (!(prop in actual)) {
        throw new Error(`Expected object to have property "${prop}"`);
      }
    },
  };
}

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

// =============================================
// TESTS
// =============================================

console.log('\n=== SMB4 BASELINE VERIFICATION ===\n');

test('SMB4 league wOBA = 0.329', () => {
  expect(SMB4_BASELINES.leagueWOBA).toBe(0.329);
});

test('SMB4 wOBA scale = 1.7821', () => {
  expect(SMB4_BASELINES.wobaScale).toBe(1.7821);
});

test('SMB4 replacement level = -12.0 runs per 600 PA', () => {
  expect(SMB4_BASELINES.replacementRunsPer600PA).toBe(-12.0);
});

test('SMB4 run environment RPW = 17.87 (NOT for WAR - use 10 × games/162)', () => {
  // This is for Pythagorean expectation analysis, NOT WAR calculation!
  expect(SMB4_BASELINES.runEnvironmentRPW).toBe(17.87);
});

console.log('\n=== wOBA TESTS ===\n');

test('calculates wOBA for average player using SMB4 weights', () => {
  const stats = createTestStats();
  const woba = calculateWOBA(stats);
  expect(woba).toBeGreaterThan(0.38);
  expect(woba).toBeLessThan(0.45);
});

test('returns 0 for no plate appearances', () => {
  const stats = createTestStats({ pa: 0, ab: 0 });
  expect(calculateWOBA(stats)).toBe(0);
});

test('HR has highest weight', () => {
  const baseStats = createTestStats({ singles: 0, doubles: 0, triples: 0, homeRuns: 0 });
  const hrStats = { ...baseStats, homeRuns: 10 };
  const singleStats = { ...baseStats, singles: 10 };
  expect(calculateWOBA(hrStats)).toBeGreaterThan(calculateWOBA(singleStats));
});

console.log('\n=== wRAA TESTS ===\n');

test('calculates positive wRAA for above-average player', () => {
  const wraa = calculateWRAA(0.400, 200);
  // ((.400 - .329) / 1.7821) × 200 ≈ 7.97
  expect(wraa).toBeGreaterThan(7);
  expect(wraa).toBeLessThan(9);
});

test('calculates negative wRAA for below-average player', () => {
  const wraa = calculateWRAA(0.280, 200);
  expect(wraa).toBeLessThan(-4);
  expect(wraa).toBeGreaterThan(-7);
});

test('returns 0 for league-average wOBA', () => {
  const wraa = calculateWRAA(SMB4_BASELINES.leagueWOBA, 200);
  expect(wraa).toBeCloseTo(0, 5);
});

console.log('\n=== REPLACEMENT LEVEL TESTS ===\n');

test('returns 12.0 runs for 600 PA (SMB4 baseline)', () => {
  const runs = getReplacementLevelRuns(600);
  expect(runs).toBeCloseTo(12.0, 1);
});

test('scales linearly with PA', () => {
  const runs300 = getReplacementLevelRuns(300);
  const runs600 = getReplacementLevelRuns(600);
  expect(runs600).toBeCloseTo(runs300 * 2, 1);
});

console.log('\n=== RUNS PER WIN TESTS ===\n');

test('returns 17.87 for 50-game season (SMB4 baseline)', () => {
  expect(getRunsPerWin(50)).toBeCloseTo(17.87, 1);
});

test('returns ~17.15 for 48-game season', () => {
  const rpw = getRunsPerWin(48);
  // 17.87 * (48/50) = 17.15
  expect(rpw).toBeCloseTo(17.15, 1);
});

test('returns ~11.44 for 32-game season', () => {
  const rpw = getRunsPerWin(32);
  expect(rpw).toBeCloseTo(11.44, 1);
});

console.log('\n=== COMPLETE bWAR TESTS ===\n');

test('calculates bWAR for solid player (48-game season)', () => {
  const stats = createTestStats();
  const result = calculateBWARSimplified(stats, 48);

  expect(result.wOBA).toBeGreaterThan(0.38);
  expect(result.wOBA).toBeLessThan(0.45);
  expect(result.bWAR).toBeGreaterThan(0.5);
  expect(result.bWAR).toBeLessThan(2.0);
});

test('elite hitter has positive bWAR', () => {
  const eliteStats: BattingStatsForWAR = {
    pa: 220, ab: 195, hits: 68, singles: 40, doubles: 16, triples: 4,
    homeRuns: 8, walks: 22, intentionalWalks: 3, hitByPitch: 2, sacFlies: 1,
    sacBunts: 0, strikeouts: 30, gidp: 3, stolenBases: 5, caughtStealing: 1,
  };
  const result = calculateBWARSimplified(eliteStats, 48);
  expect(result.wOBA).toBeGreaterThan(0.45);
  expect(result.bWAR).toBeGreaterThan(1.5);
});

test('weak hitter has low/negative bWAR', () => {
  const weakStats: BattingStatsForWAR = {
    pa: 100, ab: 92, hits: 18, singles: 14, doubles: 3, triples: 0,
    homeRuns: 1, walks: 6, intentionalWalks: 0, hitByPitch: 1, sacFlies: 1,
    sacBunts: 0, strikeouts: 30, gidp: 4, stolenBases: 0, caughtStealing: 2,
  };
  const result = calculateBWARSimplified(weakStats, 48);
  expect(result.wOBA).toBeLessThan(0.32);
  expect(result.bWAR).toBeLessThan(0.5);
});

test('returns all result components', () => {
  const stats = createTestStats();
  const result = calculateBWARSimplified(stats, 48);

  expect(result).toHaveProperty('wOBA');
  expect(result).toHaveProperty('wRAA');
  expect(result).toHaveProperty('battingRuns');
  expect(result).toHaveProperty('replacementRuns');
  expect(result).toHaveProperty('runsAboveReplacement');
  expect(result).toHaveProperty('runsPerWin');
  expect(result).toHaveProperty('bWAR');
});

console.log('\n=== EDGE CASES ===\n');

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

test('bWAR scales inversely with season length', () => {
  const stats = createTestStats();
  const short = calculateBWARSimplified(stats, 20);
  const standard = calculateBWARSimplified(stats, 32);
  const long = calculateBWARSimplified(stats, 48);

  expect(short.bWAR).toBeGreaterThan(standard.bWAR);
  expect(standard.bWAR).toBeGreaterThan(long.bWAR);
});

console.log('\n=== FORMATTING TESTS ===\n');

test('formatWOBA removes leading zero', () => {
  expect(formatWOBA(0.320)).toBe('.320');
  expect(formatWOBA(0.400)).toBe('.400');
});

test('formatWAR handles positive and negative', () => {
  expect(formatWAR(3.5)).toBe('3.5');
  expect(formatWAR(-1.5)).toBe('-1.5');
});

// =============================================
// SUMMARY
// =============================================

console.log('\n=========================================');
console.log(`RESULTS: ${passed} passed, ${failed} failed`);
console.log('=========================================\n');

if (failed > 0) {
  process.exit(1);
}
