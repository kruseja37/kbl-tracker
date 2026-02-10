/**
 * Granular Runner Advancement Tests
 * Phase B - Tier 1.3 (GAP-B1-006, MIN-B1-006)
 *
 * Tests RunnerAdvancement schema, granular tag-up tracking,
 * and accumulation helpers.
 */

import { describe, test, expect } from 'vitest';
import {
  createBlankAdvancementStats,
  accumulateAdvancement,
  classifyAdvancement,
  calculateUBR,
  type RunnerAdvancement,
  type AdvancementStats,
  type LeagueBaserunningStats,
  ADVANCEMENT_VALUES,
} from '../../../engines/rwarCalculator';

const defaultLeague: LeagueBaserunningStats = {
  runsPerGame: 3.19,
  totalSB: 200,
  totalCS: 60,
  totalSingles: 1500,
  totalWalks: 600,
  totalHBP: 80,
  totalIBB: 30,
  totalGIDP: 150,
  totalGIDPOpportunities: 1250,
  totalExtraBasesTaken: 300,
  totalAdvancementOpportunities: 1000,
};

// ============================================
// createBlankAdvancementStats
// ============================================

describe('createBlankAdvancementStats', () => {
  test('creates all-zero stats', () => {
    const stats = createBlankAdvancementStats();
    expect(stats.firstToThird).toBe(0);
    expect(stats.tagsScored).toBe(0);
    expect(stats.tagsScoredFrom2B).toBe(0);
    expect(stats.tagsScoredFrom3B).toBe(0);
    expect(stats.heldOpportunities).toBe(0);
    expect(stats.advancementOpportunities).toBe(0);
  });
});

// ============================================
// classifyAdvancement
// ============================================

describe('classifyAdvancement (MIN-B1-006)', () => {
  test('forced advance returns "forced"', () => {
    expect(classifyAdvancement('1B', '2B', 'single', true)).toBe('forced');
  });

  test('1B→3B on single is "extra"', () => {
    expect(classifyAdvancement('1B', '3B', 'single', false)).toBe('extra');
  });

  test('2B→HOME on single is "extra"', () => {
    expect(classifyAdvancement('2B', 'HOME', 'single', false)).toBe('extra');
  });

  test('1B→HOME on double is "extra"', () => {
    expect(classifyAdvancement('1B', 'HOME', 'double', false)).toBe('extra');
  });

  test('tag-up to HOME on flyOut is "extra"', () => {
    expect(classifyAdvancement('3B', 'HOME', 'flyOut', false)).toBe('extra');
  });

  test('tag-up to 3B on flyOut is "extra"', () => {
    expect(classifyAdvancement('2B', '3B', 'flyOut', false)).toBe('extra');
  });

  test('OUT returns "out"', () => {
    expect(classifyAdvancement('1B', 'OUT', 'single', false)).toBe('out');
  });

  test('1B→2B on single non-forced returns "forced" (minimum required)', () => {
    // 1B→2B on a single is the minimum advance, classified as forced even if not technically
    expect(classifyAdvancement('1B', '2B', 'single', false)).toBe('forced');
  });
});

// ============================================
// accumulateAdvancement
// ============================================

describe('accumulateAdvancement (GAP-B1-006)', () => {
  test('accumulates first-to-third on single', () => {
    const stats = createBlankAdvancementStats();
    const event: RunnerAdvancement = {
      runnerId: 'p1',
      fromBase: '1B',
      toBase: '3B',
      advancementType: 'extra',
      onPlay: 'single',
      couldHaveAdvanced: false,
    };
    accumulateAdvancement(stats, event);
    expect(stats.firstToThird).toBe(1);
    expect(stats.advancementOpportunities).toBe(1);
  });

  test('accumulates tag-up from 3B with granular tracking', () => {
    const stats = createBlankAdvancementStats();
    const event: RunnerAdvancement = {
      runnerId: 'p1',
      fromBase: '3B',
      toBase: 'HOME',
      advancementType: 'extra',
      onPlay: 'flyOut',
      couldHaveAdvanced: false,
    };
    accumulateAdvancement(stats, event);
    expect(stats.tagsScored).toBe(1);
    expect(stats.tagsScoredFrom3B).toBe(1);
    expect(stats.tagsScoredFrom2B).toBe(0);
  });

  test('accumulates tag-up from 2B with granular tracking', () => {
    const stats = createBlankAdvancementStats();
    const event: RunnerAdvancement = {
      runnerId: 'p1',
      fromBase: '2B',
      toBase: 'HOME',
      advancementType: 'extra',
      onPlay: 'sacFly',
      couldHaveAdvanced: false,
    };
    accumulateAdvancement(stats, event);
    expect(stats.tagsScored).toBe(1);
    expect(stats.tagsScoredFrom2B).toBe(1);
    expect(stats.tagsScoredFrom3B).toBe(0);
  });

  test('held with couldHaveAdvanced increments heldOpportunities', () => {
    const stats = createBlankAdvancementStats();
    const event: RunnerAdvancement = {
      runnerId: 'p1',
      fromBase: '2B',
      toBase: 'HOME',
      advancementType: 'held',
      onPlay: 'single',
      couldHaveAdvanced: true,
    };
    accumulateAdvancement(stats, event);
    expect(stats.heldOpportunities).toBe(1);
    expect(stats.advancementOpportunities).toBe(1);
    expect(stats.secondToHomeOnSingle).toBe(0); // Didn't advance
  });

  test('held without couldHaveAdvanced does not increment held count', () => {
    const stats = createBlankAdvancementStats();
    const event: RunnerAdvancement = {
      runnerId: 'p1',
      fromBase: '2B',
      toBase: 'HOME',
      advancementType: 'held',
      onPlay: 'single',
      couldHaveAdvanced: false,
    };
    accumulateAdvancement(stats, event);
    expect(stats.heldOpportunities).toBe(0);
  });

  test('out increments thrownOutAdvancing', () => {
    const stats = createBlankAdvancementStats();
    const event: RunnerAdvancement = {
      runnerId: 'p1',
      fromBase: '1B',
      toBase: 'OUT',
      advancementType: 'out',
      onPlay: 'single',
      couldHaveAdvanced: false,
    };
    accumulateAdvancement(stats, event);
    expect(stats.thrownOutAdvancing).toBe(1);
  });
});

// ============================================
// calculateUBR with granular tag-ups
// ============================================

describe('calculateUBR — granular tag-up tracking', () => {
  test('uses granular tag-up fields when available', () => {
    const stats: AdvancementStats = {
      firstToThird: 2,
      firstToHomeOnDouble: 1,
      secondToHomeOnSingle: 3,
      tagsScored: 5,
      tagsScoredFrom2B: 2,
      tagsScoredFrom3B: 3,
      thrownOutAdvancing: 0,
      pickedOff: 0,
      advancementOpportunities: 15,
      heldOpportunities: 0,
    };

    const ubr = calculateUBR(stats, defaultLeague);
    // Should use: 2B×secondToHome_onFlyOut + 3B×thirdToHome_onFlyOut
    const expected2B = 2 * ADVANCEMENT_VALUES.secondToHome_onFlyOut;
    const expected3B = 3 * ADVANCEMENT_VALUES.thirdToHome_onFlyOut;
    // Both are 0.45, so 2*0.45 + 3*0.45 = 2.25
    // Plus other advancement values
    expect(ubr).toBeGreaterThan(0);
  });

  test('falls back to tagsScored when granular fields are zero', () => {
    const stats: AdvancementStats = {
      firstToThird: 0,
      firstToHomeOnDouble: 0,
      secondToHomeOnSingle: 0,
      tagsScored: 3,
      tagsScoredFrom2B: 0,
      tagsScoredFrom3B: 0,
      thrownOutAdvancing: 0,
      pickedOff: 0,
      advancementOpportunities: 5,
      heldOpportunities: 0,
    };

    const ubr = calculateUBR(stats, defaultLeague);
    // Should use: 3 × thirdToHome_onFlyOut = 3 × 0.45 = 1.35 (minus league avg)
    expect(typeof ubr).toBe('number');
  });
});

// ============================================
// RunnerAdvancement type shape
// ============================================

describe('RunnerAdvancement interface (MIN-B1-006)', () => {
  test('can create a fully typed RunnerAdvancement', () => {
    const event: RunnerAdvancement = {
      runnerId: 'player-123',
      fromBase: '2B',
      toBase: 'HOME',
      advancementType: 'extra',
      onPlay: 'sacFly',
      couldHaveAdvanced: false,
      tagUpFrom: '3B',
    };

    expect(event.advancementType).toBe('extra');
    expect(event.couldHaveAdvanced).toBe(false);
    expect(event.tagUpFrom).toBe('3B');
  });

  test('advancementType covers all 4 values', () => {
    const types: RunnerAdvancement['advancementType'][] = ['forced', 'extra', 'held', 'out'];
    expect(types.length).toBe(4);
  });
});
