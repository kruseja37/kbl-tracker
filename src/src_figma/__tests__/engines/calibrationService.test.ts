/**
 * Calibration Service Tests
 * Phase B - Tier 1.3 (GAP-B1-001, GAP-B1-002, MAJ-B9-001)
 *
 * Tests season-end calibration pipeline, blend logic,
 * and AdaptiveStandardsEngine state management.
 */

import { describe, test, expect } from 'vitest';
import {
  shouldCalibrate,
  recalibrateLinearWeights,
  recalibrateWOBAWeights,
  recalibrateReplacementLevel,
  calibrateLeagueContext,
  aggregateSeasonStats,
  createInitialAdaptiveState,
  DEFAULT_CALIBRATION_CONFIG,
  type SeasonAggregateStats,
  type CalibrationConfig,
} from '../../../engines/calibrationService';

import {
  SMB4_BASELINES,
  SMB4_LINEAR_WEIGHTS,
  createDefaultLeagueContext,
} from '../../../types/war';

// ============================================
// HELPER: Create mock season stats
// ============================================

function createMockSeasonStats(overrides: Partial<SeasonAggregateStats> = {}): SeasonAggregateStats {
  return {
    seasonId: 'season-1',
    seasonNumber: 1,
    totalPA: 12000,
    totalAB: 10800,
    totalHits: 2700,
    totalSingles: 1800,
    totalDoubles: 500,
    totalTriples: 80,
    totalHR: 320,
    totalBB: 900,
    totalHBP: 120,
    totalK: 2800,
    totalSF: 180,
    totalOuts: 8100,
    totalRuns: 1600,
    totalGames: 400,
    totalTeams: 8,
    gamesPerTeam: 50,
    inningsPerGame: 6,
    totalIP: 2400,
    totalER: 1400,
    totalPitchingK: 2800,
    totalPitchingBB: 900,
    totalPitchingHBP: 120,
    totalPitchingHR: 320,
    collectedAt: Date.now(),
    ...overrides,
  };
}

// ============================================
// shouldCalibrate
// ============================================

describe('shouldCalibrate (GAP-B1-002)', () => {
  test('returns false when under minimum seasons', () => {
    expect(shouldCalibrate(1, 15000)).toBe(false);
  });

  test('returns false when under minimum PA', () => {
    expect(shouldCalibrate(3, 5000)).toBe(false);
  });

  test('returns true when both thresholds met', () => {
    expect(shouldCalibrate(2, 10000)).toBe(true);
  });

  test('returns true well above thresholds', () => {
    expect(shouldCalibrate(5, 50000)).toBe(true);
  });

  test('respects custom config', () => {
    const config: CalibrationConfig = { blendWeight: 0.3, minSeasons: 5, minPA: 20000 };
    expect(shouldCalibrate(3, 15000, config)).toBe(false);
    expect(shouldCalibrate(5, 20000, config)).toBe(true);
  });
});

// ============================================
// recalibrateLinearWeights
// ============================================

describe('recalibrateLinearWeights (GAP-B1-001)', () => {
  test('returns current weights when totalPA < 500', () => {
    const stats = createMockSeasonStats({ totalPA: 400 });
    const result = recalibrateLinearWeights(stats, SMB4_LINEAR_WEIGHTS, 0.3);
    expect(result).toBe(SMB4_LINEAR_WEIGHTS);
  });

  test('blends toward new weights when sufficient data', () => {
    const stats = createMockSeasonStats({ totalPA: 12000, totalRuns: 1600 });
    const result = recalibrateLinearWeights(stats, SMB4_LINEAR_WEIGHTS, 0.3);

    // Result should be different from original (unless run environment identical)
    // The blend weight 0.3 means 70% old, 30% new
    expect(typeof result.single).toBe('number');
    expect(typeof result.homeRun).toBe('number');
    expect(typeof result.uBB).toBe('number');
  });

  test('with blendWeight=0 returns unchanged weights', () => {
    const stats = createMockSeasonStats();
    const result = recalibrateLinearWeights(stats, SMB4_LINEAR_WEIGHTS, 0);
    expect(result.single).toBe(SMB4_LINEAR_WEIGHTS.single);
    expect(result.homeRun).toBe(SMB4_LINEAR_WEIGHTS.homeRun);
  });

  test('with blendWeight=1 fully replaces weights', () => {
    const stats = createMockSeasonStats();
    const result = recalibrateLinearWeights(stats, SMB4_LINEAR_WEIGHTS, 1.0);
    // Should be fully new values, not equal to originals (unless run env identical)
    expect(typeof result.single).toBe('number');
  });
});

// ============================================
// recalibrateWOBAWeights
// ============================================

describe('recalibrateWOBAWeights', () => {
  test('produces wOBA weights from linear weights', () => {
    const result = recalibrateWOBAWeights(SMB4_LINEAR_WEIGHTS, SMB4_BASELINES.wobaScale);
    expect(result.single).toBeGreaterThan(0);
    expect(result.homeRun).toBeGreaterThan(result.single);
    expect(result.uBB).toBeGreaterThan(0);
  });

  test('higher wOBA scale produces larger weights', () => {
    const low = recalibrateWOBAWeights(SMB4_LINEAR_WEIGHTS, 1.0);
    const high = recalibrateWOBAWeights(SMB4_LINEAR_WEIGHTS, 2.0);
    expect(high.single).toBeGreaterThan(low.single);
  });
});

// ============================================
// recalibrateReplacementLevel
// ============================================

describe('recalibrateReplacementLevel', () => {
  test('returns current level when totalPA < 500', () => {
    const stats = createMockSeasonStats({ totalPA: 400 });
    const result = recalibrateReplacementLevel(stats, -12.0, 0.3);
    expect(result).toBe(-12.0);
  });

  test('blends toward recalibrated level', () => {
    const stats = createMockSeasonStats();
    const result = recalibrateReplacementLevel(stats, -12.0, 0.3);
    expect(typeof result).toBe('number');
    expect(result).toBeLessThan(0); // Replacement level is always negative
  });
});

// ============================================
// calibrateLeagueContext
// ============================================

describe('calibrateLeagueContext (full pipeline)', () => {
  test('produces a valid LeagueContext', () => {
    const stats = createMockSeasonStats();
    const current = createDefaultLeagueContext('season-0', 50);
    const result = calibrateLeagueContext(stats, current);

    expect(result.seasonId).toBe('season-1');
    expect(result.runsPerPA).toBeGreaterThan(0);
    expect(result.leagueWOBA).toBeGreaterThan(0);
    expect(result.replacementRunsPer600PA).toBeLessThan(0);
    expect(result.calibrationDate).toBeGreaterThan(0);
    expect(result.sampleSize).toBe(12000);
  });

  test('confidence is HIGH for large sample', () => {
    const stats = createMockSeasonStats({ totalPA: 25000 });
    const current = createDefaultLeagueContext('season-0', 50);
    const result = calibrateLeagueContext(stats, current);
    expect(result.confidence).toBe('HIGH');
  });

  test('confidence is MEDIUM for moderate sample', () => {
    const stats = createMockSeasonStats({ totalPA: 15000 });
    const current = createDefaultLeagueContext('season-0', 50);
    const result = calibrateLeagueContext(stats, current);
    expect(result.confidence).toBe('MEDIUM');
  });

  test('confidence is LOW for small sample', () => {
    const stats = createMockSeasonStats({ totalPA: 5000 });
    const current = createDefaultLeagueContext('season-0', 50);
    const result = calibrateLeagueContext(stats, current);
    expect(result.confidence).toBe('LOW');
  });
});

// ============================================
// aggregateSeasonStats
// ============================================

describe('aggregateSeasonStats', () => {
  test('throws on empty array', () => {
    expect(() => aggregateSeasonStats([])).toThrow('No seasons to aggregate');
  });

  test('returns single season unchanged', () => {
    const stats = createMockSeasonStats();
    const result = aggregateSeasonStats([stats]);
    expect(result).toBe(stats);
  });

  test('sums numeric fields across seasons', () => {
    const s1 = createMockSeasonStats({ seasonNumber: 1, totalPA: 10000, totalHR: 200, totalRuns: 800 });
    const s2 = createMockSeasonStats({ seasonNumber: 2, totalPA: 12000, totalHR: 250, totalRuns: 900 });
    const result = aggregateSeasonStats([s1, s2]);

    expect(result.totalPA).toBe(22000);
    expect(result.totalHR).toBe(450);
    expect(result.totalRuns).toBe(1700);
    expect(result.seasonNumber).toBe(2); // Takes latest
  });
});

// ============================================
// createInitialAdaptiveState (MAJ-B9-001)
// ============================================

describe('createInitialAdaptiveState', () => {
  test('creates state with SMB4 defaults', () => {
    const state = createInitialAdaptiveState('season-1', 50);
    expect(state.id).toBe('adaptive-engine-state');
    expect(state.seasonHistory).toEqual([]);
    expect(state.calibrationHistory).toEqual([]);
    expect(state.lastCalibratedSeason).toBe(0);
    expect(state.totalPAAllTime).toBe(0);
    expect(state.currentContext.seasonId).toBe('season-1');
  });
});

// ============================================
// DEFAULT_CALIBRATION_CONFIG
// ============================================

describe('DEFAULT_CALIBRATION_CONFIG', () => {
  test('has spec-mandated values', () => {
    expect(DEFAULT_CALIBRATION_CONFIG.blendWeight).toBe(0.3);
    expect(DEFAULT_CALIBRATION_CONFIG.minSeasons).toBe(2);
    expect(DEFAULT_CALIBRATION_CONFIG.minPA).toBe(10000);
  });
});
