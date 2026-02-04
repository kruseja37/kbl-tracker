/**
 * Baserunning WAR (rWAR) Calculator Tests
 * Per TESTING_IMPLEMENTATION_PLAN.md Phase 2.1
 *
 * Tests the rWAR calculation which measures baserunning value:
 * - wSB: Weighted Stolen Base Runs
 * - UBR: Ultimate Base Running (extra base taking)
 * - wGDP: Weighted Grounded into Double Play Runs
 *
 * BsR = wSB + UBR + wGDP
 * rWAR = BsR / Runs Per Win
 */

import { describe, test, expect } from 'vitest';
import {
  calculateWSB,
  calculateWSBSimplified,
  calculateUBR,
  estimateUBR,
  calculateWGDP,
  calculateWGDPSimplified,
  calculateRWAR,
  calculateRWARSimplified,
  getRunsPerWin,
  getRWARTier,
  getSBSuccessRate,
  isSBProfitable,
  estimateRWARFromSpeed,
  createDefaultLeagueStats,
  STOLEN_BASE_VALUES,
  ADVANCEMENT_VALUES,
  GIDP_VALUES,
  type StolenBaseStats,
  type AdvancementStats,
  type GIDPStats,
  type BaserunningStats,
  type LeagueBaserunningStats,
} from '../../../engines/rwarCalculator';

// ============================================
// CONSTANTS TESTS
// ============================================

describe('rWAR Constants', () => {
  test('stolen base run values match spec', () => {
    expect(STOLEN_BASE_VALUES.SB).toBe(0.20);
    expect(STOLEN_BASE_VALUES.CS).toBe(-0.45);
  });

  test('CS value adjusts with run environment', () => {
    const lowScoring = STOLEN_BASE_VALUES.getCSValue(3.5); // Low scoring env
    const highScoring = STOLEN_BASE_VALUES.getCSValue(5.5); // High scoring env

    // Both should be negative (CS is always bad)
    expect(lowScoring).toBeLessThan(0);
    expect(highScoring).toBeLessThan(0);

    // Per the formula: -2 * (rpg/27) - 0.075
    // Higher scoring env = outs more costly (more potential runs lost)
    // So higher scoring actually makes CS MORE negative
    expect(highScoring).toBeLessThan(lowScoring);
  });

  test('advancement run values are positive', () => {
    expect(ADVANCEMENT_VALUES.firstToThird_onSingle).toBeGreaterThan(0);
    expect(ADVANCEMENT_VALUES.firstToHome_onDouble).toBeGreaterThan(0);
    expect(ADVANCEMENT_VALUES.secondToHome_onSingle).toBeGreaterThan(0);
  });

  test('thrown out values are negative', () => {
    expect(ADVANCEMENT_VALUES.thrownOut_advancing).toBeLessThan(0);
    expect(ADVANCEMENT_VALUES.thrownOut_overrunning).toBeLessThan(0);
    expect(ADVANCEMENT_VALUES.thrownOut_tagUp).toBeLessThan(0);
  });

  test('pickoff values are negative', () => {
    expect(ADVANCEMENT_VALUES.pickedOff_first).toBeLessThan(0);
    expect(ADVANCEMENT_VALUES.pickedOff_second).toBeLessThan(0);
    expect(ADVANCEMENT_VALUES.pickedOff_third).toBeLessThan(0);
  });

  test('GIDP run cost is negative', () => {
    expect(GIDP_VALUES.runCost).toBeLessThan(0);
  });
});

// ============================================
// RUNS PER WIN
// ============================================

describe('Runs Per Win Calculation', () => {
  test('162-game season = 10 RPW', () => {
    expect(getRunsPerWin(162)).toBe(10);
  });

  test('48-game SMB4 season scales correctly', () => {
    const rpw = getRunsPerWin(48);
    expect(rpw).toBeCloseTo(2.96, 1); // 10 * (48/162)
  });

  test('shorter season = fewer runs per win', () => {
    expect(getRunsPerWin(50)).toBeLessThan(getRunsPerWin(162));
  });

  test('81-game season = 5 RPW', () => {
    expect(getRunsPerWin(81)).toBeCloseTo(5, 1);
  });
});

// ============================================
// wSB (WEIGHTED STOLEN BASES)
// ============================================

describe('wSB Calculation', () => {
  const defaultLeagueStats: LeagueBaserunningStats = {
    runsPerGame: 4.8,
    totalSB: 200,
    totalCS: 60,
    totalSingles: 1500,
    totalWalks: 600,
    totalHBP: 80,
    totalIBB: 30,
    totalExtraBasesTaken: 300,
    totalAdvancementOpportunities: 1000,
    totalGIDP: 150,
    totalGIDPOpportunities: 1250,
  };

  test('successful SB has positive value (~0.2 runs)', () => {
    const stats: StolenBaseStats = {
      stolenBases: 10,
      caughtStealing: 0,
      singles: 30,
      walks: 10,
      hitByPitch: 2,
      intentionalWalks: 1,
    };

    const wSB = calculateWSB(stats, defaultLeagueStats);
    // 10 SB × 0.2 = 2.0 runs, minus league avg expectation
    expect(wSB).toBeGreaterThan(0);
  });

  test('CS has negative value (~-0.45 runs)', () => {
    const stats: StolenBaseStats = {
      stolenBases: 0,
      caughtStealing: 5,
      singles: 30,
      walks: 10,
      hitByPitch: 2,
      intentionalWalks: 1,
    };

    const wSB = calculateWSB(stats, defaultLeagueStats);
    // 5 CS × -0.45 = -2.25 runs
    expect(wSB).toBeLessThan(0);
  });

  test('break-even SB rate is ~69%', () => {
    // At 69% success rate, wSB should be ~0
    const breakEvenStats: StolenBaseStats = {
      stolenBases: 69,
      caughtStealing: 31, // 69% success
      singles: 100,
      walks: 50,
      hitByPitch: 5,
      intentionalWalks: 2,
    };

    const wSB = calculateWSBSimplified(breakEvenStats);
    // Should be close to 0
    expect(Math.abs(wSB)).toBeLessThan(2);
  });

  test('elite base stealer (90%+ success) has positive wSB', () => {
    const eliteStats: StolenBaseStats = {
      stolenBases: 45,
      caughtStealing: 5, // 90% success
      singles: 80,
      walks: 30,
      hitByPitch: 5,
      intentionalWalks: 2,
    };

    const wSB = calculateWSBSimplified(eliteStats);
    expect(wSB).toBeGreaterThan(0);
  });

  test('poor base stealer (<60% success) has negative wSB', () => {
    const poorStats: StolenBaseStats = {
      stolenBases: 6,
      caughtStealing: 4, // 60% success
      singles: 50,
      walks: 20,
      hitByPitch: 3,
      intentionalWalks: 1,
    };

    const wSB = calculateWSBSimplified(poorStats);
    expect(wSB).toBeLessThan(0);
  });
});

// ============================================
// UBR (ULTIMATE BASE RUNNING)
// ============================================

describe('UBR Calculation', () => {
  const defaultLeagueStats: LeagueBaserunningStats = {
    runsPerGame: 4.8,
    totalSB: 200,
    totalCS: 60,
    totalSingles: 1500,
    totalWalks: 600,
    totalHBP: 80,
    totalIBB: 30,
    totalExtraBasesTaken: 300,
    totalAdvancementOpportunities: 1000,
    totalGIDP: 150,
    totalGIDPOpportunities: 1250,
  };

  test('first to third on single adds ~0.4 runs', () => {
    const stats: AdvancementStats = {
      firstToThird: 5,
      firstToHomeOnDouble: 0,
      secondToHomeOnSingle: 0,
      tagsScored: 0,
      thrownOutAdvancing: 0,
      pickedOff: 0,
      advancementOpportunities: 10,
    };

    const ubr = calculateUBR(stats, defaultLeagueStats);
    // 5 × 0.4 = 2.0 runs credit, minus league expectation
    expect(ubr).toBeGreaterThan(0);
  });

  test('scoring from second on single adds ~0.55 runs', () => {
    const stats: AdvancementStats = {
      firstToThird: 0,
      firstToHomeOnDouble: 0,
      secondToHomeOnSingle: 5,
      tagsScored: 0,
      thrownOutAdvancing: 0,
      pickedOff: 0,
      advancementOpportunities: 10,
    };

    const ubr = calculateUBR(stats, defaultLeagueStats);
    // 5 × 0.55 = 2.75 runs credit
    expect(ubr).toBeGreaterThan(0);
  });

  test('thrown out advancing costs ~-0.65 runs', () => {
    const stats: AdvancementStats = {
      firstToThird: 0,
      firstToHomeOnDouble: 0,
      secondToHomeOnSingle: 0,
      tagsScored: 0,
      thrownOutAdvancing: 3,
      pickedOff: 0,
      advancementOpportunities: 10,
    };

    const ubr = calculateUBR(stats, defaultLeagueStats);
    // 3 × -0.65 = -1.95 runs
    expect(ubr).toBeLessThan(0);
  });

  test('pickoffs cost runs', () => {
    const stats: AdvancementStats = {
      firstToThird: 0,
      firstToHomeOnDouble: 0,
      secondToHomeOnSingle: 0,
      tagsScored: 0,
      thrownOutAdvancing: 0,
      pickedOff: 4,
      advancementOpportunities: 10,
    };

    const ubr = calculateUBR(stats, defaultLeagueStats);
    expect(ubr).toBeLessThan(0);
  });

  test('aggressive runner with good success has positive UBR', () => {
    const stats: AdvancementStats = {
      firstToThird: 8,
      firstToHomeOnDouble: 3,
      secondToHomeOnSingle: 10,
      tagsScored: 5,
      thrownOutAdvancing: 2, // Some outs, but good success rate
      pickedOff: 0,
      advancementOpportunities: 40,
    };

    const ubr = calculateUBR(stats, defaultLeagueStats);
    expect(ubr).toBeGreaterThan(0);
  });

  test('conservative runner with no extra bases has negative UBR', () => {
    const stats: AdvancementStats = {
      firstToThird: 0,
      firstToHomeOnDouble: 0,
      secondToHomeOnSingle: 0,
      tagsScored: 0,
      thrownOutAdvancing: 0,
      pickedOff: 0,
      advancementOpportunities: 20, // Had opportunities but didn't take them
    };

    const ubr = calculateUBR(stats, defaultLeagueStats);
    expect(ubr).toBeLessThan(0);
  });
});

// ============================================
// UBR ESTIMATION FROM SPEED
// ============================================

describe('UBR Estimation from Speed', () => {
  test('elite speed (90+) estimates positive UBR', () => {
    const ubr = estimateUBR(95, 200, 200);
    expect(ubr).toBeGreaterThan(0);
  });

  test('average speed (50) estimates ~0 UBR', () => {
    const ubr = estimateUBR(50, 200, 200);
    expect(ubr).toBeCloseTo(0, 1);
  });

  test('slow runner (30) estimates negative UBR', () => {
    const ubr = estimateUBR(30, 200, 200);
    expect(ubr).toBeLessThan(0);
  });

  test('UBR scales with playing time', () => {
    const fullSeason = estimateUBR(80, 200, 200);
    const halfSeason = estimateUBR(80, 100, 200);

    expect(fullSeason).toBeCloseTo(halfSeason * 2, 1);
  });
});

// ============================================
// wGDP (WEIGHTED GIDP)
// ============================================

describe('wGDP Calculation', () => {
  const defaultLeagueStats: LeagueBaserunningStats = {
    runsPerGame: 4.8,
    totalSB: 200,
    totalCS: 60,
    totalSingles: 1500,
    totalWalks: 600,
    totalHBP: 80,
    totalIBB: 30,
    totalExtraBasesTaken: 300,
    totalAdvancementOpportunities: 1000,
    totalGIDP: 150,
    totalGIDPOpportunities: 1250, // 12% GIDP rate
  };

  test('avoiding GIDP adds runs', () => {
    const stats: GIDPStats = {
      gidp: 0, // Avoided all GIDPs
      gidpOpportunities: 20,
    };

    const wGDP = calculateWGDP(stats, defaultLeagueStats);
    // Expected ~2.4 GIDPs (20 × 0.12), avoided all
    expect(wGDP).toBeGreaterThan(0);
  });

  test('hitting into many GIDPs costs runs', () => {
    const stats: GIDPStats = {
      gidp: 8, // Hit into 8 GIDPs
      gidpOpportunities: 20, // Expected ~2.4
    };

    const wGDP = calculateWGDP(stats, defaultLeagueStats);
    expect(wGDP).toBeLessThan(0);
  });

  test('league average GIDP rate (~12%) results in ~0 wGDP', () => {
    const stats: GIDPStats = {
      gidp: 12, // Exactly 12%
      gidpOpportunities: 100,
    };

    const wGDP = calculateWGDP(stats, defaultLeagueStats);
    expect(Math.abs(wGDP)).toBeLessThan(1);
  });

  test('simplified wGDP uses 12% baseline', () => {
    const stats: GIDPStats = {
      gidp: 6, // Half of expected
      gidpOpportunities: 100, // Expected 12
    };

    const wGDP = calculateWGDPSimplified(stats);
    // Avoided 6 GIDPs × 0.44 = ~2.64 runs
    expect(wGDP).toBeGreaterThan(2);
  });

  test('slow groundball hitter has negative wGDP', () => {
    const stats: GIDPStats = {
      gidp: 20, // Well above average
      gidpOpportunities: 80,
    };

    const wGDP = calculateWGDPSimplified(stats);
    expect(wGDP).toBeLessThan(0);
  });
});

// ============================================
// COMPLETE rWAR CALCULATION
// ============================================

describe('Complete rWAR Calculation', () => {
  const defaultLeagueStats: LeagueBaserunningStats = {
    runsPerGame: 4.8,
    totalSB: 200,
    totalCS: 60,
    totalSingles: 1500,
    totalWalks: 600,
    totalHBP: 80,
    totalIBB: 30,
    totalExtraBasesTaken: 300,
    totalAdvancementOpportunities: 1000,
    totalGIDP: 150,
    totalGIDPOpportunities: 1250,
  };

  test('elite base runner has positive rWAR', () => {
    const stats: BaserunningStats = {
      stolenBases: 40,
      caughtStealing: 5, // 89% success
      singles: 100,
      walks: 50,
      hitByPitch: 5,
      intentionalWalks: 2,
      gidp: 2,
      gidpOpportunities: 40,
      speedRating: 90,
      plateAppearances: 450,
    };

    const result = calculateRWAR(stats, defaultLeagueStats, 48);

    expect(result.wSB).toBeGreaterThan(0);
    expect(result.BsR).toBeGreaterThan(0);
    expect(result.rWAR).toBeGreaterThan(0);
  });

  test('poor base runner has negative rWAR', () => {
    const stats: BaserunningStats = {
      stolenBases: 2,
      caughtStealing: 4, // 33% success - terrible
      singles: 80,
      walks: 30,
      hitByPitch: 3,
      intentionalWalks: 1,
      gidp: 15,
      gidpOpportunities: 60, // Many GIDPs
      speedRating: 30,
      plateAppearances: 400,
    };

    const result = calculateRWAR(stats, defaultLeagueStats, 48);

    expect(result.wSB).toBeLessThan(0);
    expect(result.wGDP).toBeLessThan(0);
    expect(result.rWAR).toBeLessThan(0);
  });

  test('rWAR result includes all components', () => {
    const stats: BaserunningStats = {
      stolenBases: 15,
      caughtStealing: 5,
      singles: 60,
      walks: 25,
      hitByPitch: 3,
      intentionalWalks: 1,
      gidp: 5,
      gidpOpportunities: 35,
      speedRating: 65,
      plateAppearances: 350,
    };

    const result = calculateRWAR(stats, defaultLeagueStats, 48);

    expect(result).toHaveProperty('wSB');
    expect(result).toHaveProperty('UBR');
    expect(result).toHaveProperty('wGDP');
    expect(result).toHaveProperty('BsR');
    expect(result).toHaveProperty('rWAR');
    expect(result).toHaveProperty('runsPerWin');
    expect(result).toHaveProperty('seasonGames');
  });

  test('BsR = wSB + UBR + wGDP', () => {
    const stats: BaserunningStats = {
      stolenBases: 20,
      caughtStealing: 6,
      singles: 70,
      walks: 30,
      hitByPitch: 4,
      intentionalWalks: 2,
      gidp: 8,
      gidpOpportunities: 50,
      speedRating: 70,
      plateAppearances: 400,
    };

    const result = calculateRWAR(stats, defaultLeagueStats, 48);

    // BsR should equal sum of components (allowing for rounding)
    const calculatedBsR = result.wSB + result.UBR + result.wGDP;
    expect(result.BsR).toBeCloseTo(calculatedBsR, 1);
  });

  test('rWAR = BsR / runsPerWin', () => {
    const stats: BaserunningStats = {
      stolenBases: 10,
      caughtStealing: 3,
      singles: 50,
      walks: 20,
      hitByPitch: 2,
      intentionalWalks: 1,
      gidp: 4,
      gidpOpportunities: 30,
      speedRating: 60,
      plateAppearances: 300,
    };

    const result = calculateRWAR(stats, defaultLeagueStats, 48);

    const calculatedRWAR = result.BsR / result.runsPerWin;
    expect(result.rWAR).toBeCloseTo(calculatedRWAR, 1);
  });
});

// ============================================
// SIMPLIFIED rWAR
// ============================================

describe('Simplified rWAR Calculation', () => {
  test('simplified calculation works without league stats', () => {
    const stats: BaserunningStats = {
      stolenBases: 25,
      caughtStealing: 7,
      singles: 75,
      walks: 35,
      hitByPitch: 4,
      intentionalWalks: 2,
      gidp: 6,
      gidpOpportunities: 45,
      speedRating: 75,
      plateAppearances: 400,
    };

    const result = calculateRWARSimplified(stats, 48);

    expect(result).toHaveProperty('rWAR');
    expect(typeof result.rWAR).toBe('number');
  });

  test('simplified uses default 50-game season', () => {
    const stats: BaserunningStats = {
      stolenBases: 10,
      caughtStealing: 3,
      singles: 50,
      walks: 20,
      hitByPitch: 2,
      intentionalWalks: 1,
      gidp: 4,
      gidpOpportunities: 30,
    };

    const result = calculateRWARSimplified(stats);
    expect(result.seasonGames).toBe(50); // SMB4_BASELINES.gamesPerTeam
  });
});

// ============================================
// UTILITY FUNCTIONS
// ============================================

describe('rWAR Utility Functions', () => {
  describe('getRWARTier', () => {
    test('Elite tier for rWAR > 2.0', () => {
      expect(getRWARTier(2.5)).toBe('Elite');
    });

    test('Great tier for rWAR > 1.0', () => {
      expect(getRWARTier(1.5)).toBe('Great');
    });

    test('Above Average tier for rWAR > 0.3', () => {
      expect(getRWARTier(0.5)).toBe('Above Average');
    });

    test('Average tier for rWAR between -0.3 and 0.3', () => {
      expect(getRWARTier(0.1)).toBe('Average');
      expect(getRWARTier(-0.1)).toBe('Average');
    });

    test('Below Average tier for rWAR > -1.0', () => {
      expect(getRWARTier(-0.5)).toBe('Below Average');
    });

    test('Poor tier for rWAR <= -1.0', () => {
      expect(getRWARTier(-1.5)).toBe('Poor');
    });
  });

  describe('getSBSuccessRate', () => {
    test('calculates SB success rate correctly', () => {
      expect(getSBSuccessRate(70, 30)).toBe(0.7);
      expect(getSBSuccessRate(90, 10)).toBe(0.9);
      expect(getSBSuccessRate(50, 50)).toBe(0.5);
    });

    test('returns 0 when no attempts', () => {
      expect(getSBSuccessRate(0, 0)).toBe(0);
    });
  });

  describe('isSBProfitable', () => {
    test('profitable at 70%+ success', () => {
      expect(isSBProfitable(70, 30)).toBe(true);
      expect(isSBProfitable(80, 20)).toBe(true);
    });

    test('not profitable below 69%', () => {
      expect(isSBProfitable(60, 40)).toBe(false);
      expect(isSBProfitable(50, 50)).toBe(false);
    });

    test('exactly 69% is profitable', () => {
      expect(isSBProfitable(69, 31)).toBe(true);
    });
  });

  describe('estimateRWARFromSpeed', () => {
    test('elite speed (95+) has high rWAR range', () => {
      const range = estimateRWARFromSpeed(98, 48);
      expect(range.min).toBeGreaterThan(1);
      expect(range.max).toBeGreaterThan(2);
    });

    test('average speed has range around 0', () => {
      const range = estimateRWARFromSpeed(50, 48);
      expect(range.min).toBeLessThan(0);
      expect(range.max).toBeGreaterThan(0);
    });

    test('slow speed has negative range', () => {
      const range = estimateRWARFromSpeed(30, 48);
      expect(range.min).toBeLessThan(0);
      expect(range.max).toBeLessThan(0);
    });

    test('range scales with season length', () => {
      const short = estimateRWARFromSpeed(80, 24);
      const long = estimateRWARFromSpeed(80, 96);

      expect(long.max).toBeGreaterThan(short.max);
    });
  });
});

// ============================================
// CREATE DEFAULT LEAGUE STATS
// ============================================

describe('Create Default League Stats', () => {
  test('creates league stats with default parameters', () => {
    const stats = createDefaultLeagueStats();

    expect(stats).toHaveProperty('runsPerGame');
    expect(stats).toHaveProperty('totalSB');
    expect(stats).toHaveProperty('totalCS');
    expect(stats).toHaveProperty('totalSingles');
    expect(stats).toHaveProperty('totalWalks');
  });

  test('scales with season length', () => {
    const shortSeason = createDefaultLeagueStats(25, 8);
    const longSeason = createDefaultLeagueStats(100, 8);

    expect(longSeason.totalSB).toBeGreaterThan(shortSeason.totalSB);
  });

  test('scales with number of teams', () => {
    const smallLeague = createDefaultLeagueStats(50, 4);
    const largeLeague = createDefaultLeagueStats(50, 16);

    expect(largeLeague.totalSB).toBeGreaterThan(smallLeague.totalSB);
  });
});

// ============================================
// EDGE CASES
// ============================================

describe('rWAR Edge Cases', () => {
  test('zero PA returns 0 rWAR', () => {
    const stats: BaserunningStats = {
      stolenBases: 0,
      caughtStealing: 0,
      singles: 0,
      walks: 0,
      hitByPitch: 0,
      intentionalWalks: 0,
      gidp: 0,
      gidpOpportunities: 0,
    };

    const result = calculateRWARSimplified(stats, 48);
    expect(result.rWAR).toBe(0);
  });

  test('handles missing optional stats', () => {
    const stats: BaserunningStats = {
      stolenBases: 10,
      caughtStealing: 3,
      singles: 50,
      walks: 20,
      hitByPitch: 2,
      intentionalWalks: 1,
      gidp: 4,
      gidpOpportunities: 30,
      // No speedRating, plateAppearances, or advancement stats
    };

    const result = calculateRWARSimplified(stats, 48);
    expect(typeof result.rWAR).toBe('number');
    expect(result.ubrEstimated).toBe(true);
  });

  test('very short season has high RPW impact', () => {
    const stats: BaserunningStats = {
      stolenBases: 5,
      caughtStealing: 1,
      singles: 20,
      walks: 8,
      hitByPitch: 1,
      intentionalWalks: 0,
      gidp: 1,
      gidpOpportunities: 10,
    };

    const shortResult = calculateRWARSimplified(stats, 10);
    const longResult = calculateRWARSimplified(stats, 100);

    // Same BsR but different RPW means different rWAR
    expect(Math.abs(shortResult.rWAR)).toBeGreaterThan(Math.abs(longResult.rWAR));
  });
});

// ============================================
// INTEGRATION TESTS
// ============================================

describe('rWAR Integration Tests', () => {
  test('realistic elite baserunner season', () => {
    // Trea Turner type: 30 SB, 4 CS, fast, avoids DP
    const stats: BaserunningStats = {
      stolenBases: 30,
      caughtStealing: 4, // 88% success
      singles: 120,
      walks: 40,
      hitByPitch: 5,
      intentionalWalks: 3,
      gidp: 3,
      gidpOpportunities: 50,
      speedRating: 92,
      plateAppearances: 550,
    };

    const result = calculateRWARSimplified(stats, 48);

    // Should be significantly positive
    expect(result.rWAR).toBeGreaterThan(0.5);
    expect(getRWARTier(result.rWAR)).not.toBe('Poor');
    expect(getRWARTier(result.rWAR)).not.toBe('Below Average');
  });

  test('realistic slow power hitter season', () => {
    // Big slugger: no SB, hits into DP, slow
    const stats: BaserunningStats = {
      stolenBases: 0,
      caughtStealing: 0,
      singles: 50,
      walks: 70,
      hitByPitch: 8,
      intentionalWalks: 10,
      gidp: 18, // Lots of DP
      gidpOpportunities: 80,
      speedRating: 25,
      plateAppearances: 500,
    };

    const result = calculateRWARSimplified(stats, 48);

    // Should be negative
    expect(result.rWAR).toBeLessThan(0);
    expect(result.wGDP).toBeLessThan(0);
  });

  test('average runner season', () => {
    const stats: BaserunningStats = {
      stolenBases: 5,
      caughtStealing: 2,
      singles: 70,
      walks: 40,
      hitByPitch: 4,
      intentionalWalks: 2,
      gidp: 6, // Closer to league average (12% of 50)
      gidpOpportunities: 50,
      speedRating: 50,
      plateAppearances: 400,
    };

    const result = calculateRWARSimplified(stats, 48);

    // Should be close to 0 (within 1.0 rWAR range for "average")
    expect(Math.abs(result.rWAR)).toBeLessThan(1.0);
    expect(['Average', 'Above Average']).toContain(getRWARTier(result.rWAR));
  });
});
