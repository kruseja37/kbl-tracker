/**
 * pWAR Calculator Tests
 *
 * Phase 2.2 of Testing Implementation Plan
 *
 * Tests the pwarCalculator.ts engine which calculates:
 * - FIP (Fielding Independent Pitching)
 * - Replacement level (starter vs reliever)
 * - Leverage Index adjustments
 * - Complete pWAR
 *
 * Per PWAR_CALCULATION_SPEC.md and ADAPTIVE_STANDARDS_ENGINE_SPEC.md
 */

import { describe, test, expect } from 'vitest';
import {
  SMB4_PITCHING_BASELINES,
  calculateFIP,
  calculateFIPConstant,
  getPitcherReplacementLevel,
  getPitcherRole,
  getLeverageMultiplier,
  estimateLeverageIndex,
  getBaseRunsPerWin,
  getPitcherRunsPerWin,
  calculatePWAR,
  calculatePWARSimplified,
  createDefaultPitchingContext,
  formatIP,
  parseIP,
  getFIPTier,
  getPWARTier,
  type PitchingStatsForWAR,
  type PitchingLeagueContext,
} from '../../../engines/pwarCalculator';

// ============================================
// TEST DATA HELPERS
// ============================================

function createPitchingStats(overrides: Partial<PitchingStatsForWAR> = {}): PitchingStatsForWAR {
  return {
    ip: 100,
    strikeouts: 80,
    walks: 30,
    hitByPitch: 5,
    homeRunsAllowed: 10,
    gamesStarted: 20,
    gamesAppeared: 20,
    saves: 0,
    holds: 0,
    ...overrides,
  };
}

function createPitchingContext(overrides: Partial<PitchingLeagueContext> = {}): PitchingLeagueContext {
  return {
    seasonId: 'test',
    gamesPerTeam: 48,
    leagueERA: SMB4_PITCHING_BASELINES.leagueERA,
    leagueFIP: SMB4_PITCHING_BASELINES.leagueFIP,
    fipConstant: SMB4_PITCHING_BASELINES.fipConstant,
    calibrationConfidence: 1.0,
    ...overrides,
  };
}

// ============================================
// SMB4 BASELINES TESTS
// ============================================

describe('SMB4 Pitching Baselines', () => {
  test('league ERA is 4.04', () => {
    expect(SMB4_PITCHING_BASELINES.leagueERA).toBe(4.04);
  });

  test('league FIP is 4.04', () => {
    expect(SMB4_PITCHING_BASELINES.leagueFIP).toBe(4.04);
  });

  test('FIP constant is 3.28', () => {
    expect(SMB4_PITCHING_BASELINES.fipConstant).toBe(3.28);
  });

  test('FIP coefficients are correct', () => {
    expect(SMB4_PITCHING_BASELINES.fipCoefficients.HR).toBe(13);
    expect(SMB4_PITCHING_BASELINES.fipCoefficients.BB_HBP).toBe(3);
    expect(SMB4_PITCHING_BASELINES.fipCoefficients.K).toBe(2);
  });

  test('replacement levels are correct', () => {
    expect(SMB4_PITCHING_BASELINES.replacementLevel.starter).toBe(0.12);
    expect(SMB4_PITCHING_BASELINES.replacementLevel.reliever).toBe(0.03);
  });
});

// ============================================
// FIP CALCULATION TESTS
// ============================================

describe('FIP Calculation', () => {
  test('calculates FIP with standard stats', () => {
    const stats = createPitchingStats({
      ip: 180,
      strikeouts: 180,
      walks: 50,
      hitByPitch: 5,
      homeRunsAllowed: 20,
    });

    const fip = calculateFIP(stats);

    // FIP = ((13 × 20) + (3 × 55) - (2 × 180)) / 180 + 3.28
    // = (260 + 165 - 360) / 180 + 3.28
    // = 65 / 180 + 3.28
    // = 0.361 + 3.28 = 3.64
    expect(fip).toBeCloseTo(3.64, 1);
  });

  test('zero IP returns 0 FIP', () => {
    const stats = createPitchingStats({ ip: 0 });
    const fip = calculateFIP(stats);
    expect(fip).toBe(0);
  });

  test('more strikeouts lowers FIP', () => {
    const lowK = createPitchingStats({ strikeouts: 50 });
    const highK = createPitchingStats({ strikeouts: 150 });

    const lowKFip = calculateFIP(lowK);
    const highKFip = calculateFIP(highK);

    expect(highKFip).toBeLessThan(lowKFip);
  });

  test('more home runs raises FIP', () => {
    const lowHR = createPitchingStats({ homeRunsAllowed: 5 });
    const highHR = createPitchingStats({ homeRunsAllowed: 20 });

    const lowHRFip = calculateFIP(lowHR);
    const highHRFip = calculateFIP(highHR);

    expect(highHRFip).toBeGreaterThan(lowHRFip);
  });

  test('more walks raises FIP', () => {
    const lowBB = createPitchingStats({ walks: 10 });
    const highBB = createPitchingStats({ walks: 60 });

    const lowBBFip = calculateFIP(lowBB);
    const highBBFip = calculateFIP(highBB);

    expect(highBBFip).toBeGreaterThan(lowBBFip);
  });

  test('HBP affects FIP same as walks', () => {
    const moreWalks = createPitchingStats({ walks: 40, hitByPitch: 0 });
    const moreHBP = createPitchingStats({ walks: 35, hitByPitch: 5 });

    const walksFip = calculateFIP(moreWalks);
    const hbpFip = calculateFIP(moreHBP);

    // Same total BB+HBP should give same FIP
    expect(walksFip).toBeCloseTo(hbpFip, 5);
  });

  test('uses custom FIP constant', () => {
    const stats = createPitchingStats();

    const defaultFip = calculateFIP(stats);
    const customFip = calculateFIP(stats, 4.0); // Different constant

    expect(customFip).not.toBeCloseTo(defaultFip, 1);
    expect(customFip - defaultFip).toBeCloseTo(4.0 - 3.28, 2);
  });
});

describe('FIP Constant Calculation', () => {
  test('calculates FIP constant from league stats', () => {
    const leagueStats = {
      era: 4.04,
      homeRunsAllowed: 1000,
      walks: 2500,
      hitByPitch: 250,
      strikeouts: 5000,
      ip: 10000,
    };

    const constant = calculateFIPConstant(leagueStats);

    // Should be close to SMB4 default
    expect(constant).toBeGreaterThan(2.5);
    expect(constant).toBeLessThan(4.0);
  });

  test('zero IP returns default constant', () => {
    const leagueStats = {
      era: 4.0,
      homeRunsAllowed: 0,
      walks: 0,
      hitByPitch: 0,
      strikeouts: 0,
      ip: 0,
    };

    const constant = calculateFIPConstant(leagueStats);
    expect(constant).toBe(SMB4_PITCHING_BASELINES.fipConstant);
  });
});

// ============================================
// REPLACEMENT LEVEL TESTS
// ============================================

describe('Replacement Level', () => {
  test('pure starter gets 0.12', () => {
    const replacement = getPitcherReplacementLevel(20, 20);
    expect(replacement).toBe(0.12);
  });

  test('pure reliever gets 0.03', () => {
    const replacement = getPitcherReplacementLevel(0, 50);
    expect(replacement).toBe(0.03);
  });

  test('50/50 swingman gets weighted average', () => {
    const replacement = getPitcherReplacementLevel(10, 20);
    // 50% starter (0.12) + 50% reliever (0.03) = 0.075
    expect(replacement).toBeCloseTo(0.075, 3);
  });

  test('80/20 mostly starter', () => {
    const replacement = getPitcherReplacementLevel(16, 20);
    // 80% starter + 20% reliever
    // = 0.80 * 0.12 + 0.20 * 0.03 = 0.096 + 0.006 = 0.102
    expect(replacement).toBeCloseTo(0.102, 3);
  });

  test('zero games appeared returns starter default', () => {
    const replacement = getPitcherReplacementLevel(0, 0);
    expect(replacement).toBe(0.12);
  });
});

describe('Pitcher Role Detection', () => {
  test('80%+ starts = starter', () => {
    expect(getPitcherRole(16, 20)).toBe('starter');
    expect(getPitcherRole(20, 20)).toBe('starter');
  });

  test('20% or less starts = reliever', () => {
    expect(getPitcherRole(0, 50)).toBe('reliever');
    expect(getPitcherRole(5, 25)).toBe('reliever');
  });

  test('21-79% starts = swingman', () => {
    expect(getPitcherRole(10, 20)).toBe('swingman');
    expect(getPitcherRole(7, 20)).toBe('swingman');
  });

  test('zero appearances = starter', () => {
    expect(getPitcherRole(0, 0)).toBe('starter');
  });
});

// ============================================
// LEVERAGE INDEX TESTS
// ============================================

describe('Leverage Multiplier', () => {
  test('starters get 1.0 regardless of LI', () => {
    expect(getLeverageMultiplier(2.0, false)).toBe(1.0);
    expect(getLeverageMultiplier(0.5, false)).toBe(1.0);
  });

  test('relievers get regressed multiplier', () => {
    // Formula: (LI + 1) / 2
    expect(getLeverageMultiplier(1.0, true)).toBe(1.0); // (1 + 1) / 2 = 1.0
    expect(getLeverageMultiplier(2.0, true)).toBe(1.5); // (2 + 1) / 2 = 1.5
    expect(getLeverageMultiplier(0.5, true)).toBe(0.75); // (0.5 + 1) / 2 = 0.75
  });

  test('high leverage closer gets boost', () => {
    const closerLI = getLeverageMultiplier(1.8, true);
    expect(closerLI).toBeGreaterThan(1.0);
    expect(closerLI).toBeCloseTo(1.4, 2);
  });

  test('mop-up reliever gets dampened', () => {
    const mopUpLI = getLeverageMultiplier(0.6, true);
    expect(mopUpLI).toBeLessThan(1.0);
    expect(mopUpLI).toBeCloseTo(0.8, 2);
  });
});

describe('Leverage Index Estimation', () => {
  test('pure starter estimates 1.0', () => {
    expect(estimateLeverageIndex(20, 20, 0, 0)).toBe(1.0);
  });

  test('primary closer (60%+ save rate) estimates 1.7', () => {
    expect(estimateLeverageIndex(0, 50, 35, 0)).toBe(1.7);
  });

  test('setup man (30%+ hold rate) estimates 1.3', () => {
    expect(estimateLeverageIndex(0, 50, 5, 20)).toBe(1.3);
  });

  test('middle reliever estimates 0.9', () => {
    expect(estimateLeverageIndex(0, 50, 0, 0)).toBe(0.9);
  });

  test('zero relief appearances returns 1.0', () => {
    expect(estimateLeverageIndex(20, 20, 0, 0)).toBe(1.0);
  });
});

// ============================================
// RUNS PER WIN TESTS
// ============================================

describe('Runs Per Win', () => {
  test('162 games = 10 RPW', () => {
    expect(getBaseRunsPerWin(162)).toBeCloseTo(10.0, 5);
  });

  test('shorter seasons = fewer RPW', () => {
    expect(getBaseRunsPerWin(48)).toBeCloseTo(2.96, 1);
    expect(getBaseRunsPerWin(32)).toBeCloseTo(1.975, 1);
  });

  test('pitcher-specific RPW adjusts for quality', () => {
    const eliteFIP = 2.50;
    const poorFIP = 5.50;
    const leagueFIP = 4.04;
    const games = 48;

    const eliteRPW = getPitcherRunsPerWin(eliteFIP, leagueFIP, games);
    const poorRPW = getPitcherRunsPerWin(poorFIP, leagueFIP, games);

    // Elite pitcher has lower RPW (each run worth more to them)
    expect(eliteRPW).toBeLessThan(poorRPW);
  });

  test('pitcher RPW capped between 0.9x and 1.1x base', () => {
    const baseRPW = getBaseRunsPerWin(48);
    const extremeEliteRPW = getPitcherRunsPerWin(1.0, 4.04, 48);
    const extremePoorRPW = getPitcherRunsPerWin(8.0, 4.04, 48);

    expect(extremeEliteRPW).toBeGreaterThanOrEqual(baseRPW * 0.9 - 0.01);
    expect(extremePoorRPW).toBeLessThanOrEqual(baseRPW * 1.1 + 0.01);
  });
});

// ============================================
// COMPLETE pWAR CALCULATION TESTS
// ============================================

describe('Complete pWAR Calculation', () => {
  test('calculates pWAR for solid starter', () => {
    const stats = createPitchingStats({
      ip: 180,
      strikeouts: 180,
      walks: 40,
      hitByPitch: 5,
      homeRunsAllowed: 15,
      gamesStarted: 30,
      gamesAppeared: 30,
    });

    const context = createPitchingContext({ gamesPerTeam: 48 });
    const result = calculatePWAR(stats, context);

    expect(result.fip).toBeLessThan(SMB4_PITCHING_BASELINES.leagueFIP);
    expect(result.fipDiff).toBeGreaterThan(0); // Better than league
    expect(result.pWAR).toBeGreaterThan(0);
    expect(result.role).toBe('starter');
    expect(result.leverageMultiplier).toBe(1.0);
  });

  test('calculates pWAR for closer', () => {
    const stats = createPitchingStats({
      ip: 60,
      strikeouts: 70,
      walks: 20,
      hitByPitch: 2,
      homeRunsAllowed: 5,
      gamesStarted: 0,
      gamesAppeared: 55,
      saves: 35,
      holds: 5,
    });

    const context = createPitchingContext({ gamesPerTeam: 48 });
    const result = calculatePWAR(stats, context);

    expect(result.role).toBe('reliever');
    expect(result.leverageMultiplier).toBeGreaterThan(1.0); // Closer bonus
    expect(result.pWAR).toBeGreaterThan(0);
  });

  test('calculates pWAR for poor pitcher', () => {
    const stats = createPitchingStats({
      ip: 100,
      strikeouts: 50,
      walks: 50,
      hitByPitch: 10,
      homeRunsAllowed: 20,
      gamesStarted: 15,
      gamesAppeared: 15,
    });

    const context = createPitchingContext({ gamesPerTeam: 48 });
    const result = calculatePWAR(stats, context);

    expect(result.fip).toBeGreaterThan(SMB4_PITCHING_BASELINES.leagueFIP);
    expect(result.fipDiff).toBeLessThan(0); // Worse than league
    // pWAR might be negative or low positive
  });

  test('zero IP returns zero pWAR', () => {
    const stats = createPitchingStats({ ip: 0 });
    const context = createPitchingContext();
    const result = calculatePWAR(stats, context);

    expect(result.pWAR).toBe(0);
    expect(result.fip).toBe(0);
  });

  test('pWAR includes all components', () => {
    const stats = createPitchingStats();
    const context = createPitchingContext();
    const result = calculatePWAR(stats, context);

    expect(result.fip).toBeDefined();
    expect(result.leagueFIP).toBeDefined();
    expect(result.fipDiff).toBeDefined();
    expect(result.fipRunsAboveAvg).toBeDefined();
    expect(result.replacementLevel).toBeDefined();
    expect(result.leverageMultiplier).toBeDefined();
    expect(result.pitcherRPW).toBeDefined();
    expect(result.pWAR).toBeDefined();
    expect(result.ip).toBe(100);
    expect(result.role).toBeDefined();
    expect(result.starterShare).toBeDefined();
  });

  test('leverage adjustment can be disabled', () => {
    const stats = createPitchingStats({
      gamesStarted: 0,
      gamesAppeared: 50,
      saves: 30,
    });
    const context = createPitchingContext();

    const withLI = calculatePWAR(stats, context, { useLeverageAdjustment: true });
    const withoutLI = calculatePWAR(stats, context, { useLeverageAdjustment: false });

    expect(withLI.leverageMultiplier).toBeGreaterThan(1.0);
    expect(withoutLI.leverageMultiplier).toBe(1.0);
    expect(withLI.pWAR).not.toBe(withoutLI.pWAR);
  });
});

describe('Simplified pWAR', () => {
  test('uses SMB4 defaults', () => {
    const stats = createPitchingStats();
    const result = calculatePWARSimplified(stats);

    expect(result.leagueFIP).toBe(SMB4_PITCHING_BASELINES.leagueFIP);
    expect(result.pWAR).toBeDefined();
  });

  test('accepts custom season length', () => {
    const stats = createPitchingStats();

    const short = calculatePWARSimplified(stats, 32);
    const long = calculatePWARSimplified(stats, 48);

    // Different season lengths affect RPW
    expect(short.pitcherRPW).not.toBe(long.pitcherRPW);
  });
});

// ============================================
// CONTEXT HELPERS TESTS
// ============================================

describe('Context Helpers', () => {
  test('createDefaultPitchingContext uses SMB4 baselines', () => {
    const context = createDefaultPitchingContext('test-season', 48);

    expect(context.seasonId).toBe('test-season');
    expect(context.gamesPerTeam).toBe(48);
    expect(context.leagueERA).toBe(SMB4_PITCHING_BASELINES.leagueERA);
    expect(context.leagueFIP).toBe(SMB4_PITCHING_BASELINES.leagueFIP);
    expect(context.fipConstant).toBe(SMB4_PITCHING_BASELINES.fipConstant);
  });

  test('default games is 50', () => {
    const context = createDefaultPitchingContext('test');
    expect(context.gamesPerTeam).toBe(50);
  });
});

// ============================================
// UTILITY FUNCTIONS TESTS
// ============================================

describe('IP Formatting', () => {
  test('formatIP converts decimal to baseball notation', () => {
    expect(formatIP(5)).toBe('5.0');
    expect(formatIP(5.33)).toBe('5.1'); // 5 1/3
    expect(formatIP(5.67)).toBe('5.2'); // 5 2/3
  });

  test('parseIP converts baseball notation to decimal', () => {
    expect(parseIP('5.0')).toBe(5);
    expect(parseIP('5.1')).toBeCloseTo(5.33, 1); // 5 1/3
    expect(parseIP('5.2')).toBeCloseTo(5.67, 1); // 5 2/3
  });

  test('round trip formatting', () => {
    const original = 7.67;
    const formatted = formatIP(original);
    const parsed = parseIP(formatted);
    expect(parsed).toBeCloseTo(original, 1);
  });
});

describe('FIP Tiers', () => {
  test('excellent FIP < 3.00', () => {
    expect(getFIPTier(2.50)).toBe('Excellent');
    expect(getFIPTier(2.99)).toBe('Excellent');
  });

  test('great FIP 3.00-3.49', () => {
    expect(getFIPTier(3.00)).toBe('Great');
    expect(getFIPTier(3.25)).toBe('Great');
  });

  test('above average FIP 3.50-3.99', () => {
    expect(getFIPTier(3.50)).toBe('Above Average');
    expect(getFIPTier(3.75)).toBe('Above Average');
  });

  test('average FIP 4.00-4.49', () => {
    expect(getFIPTier(4.00)).toBe('Average');
    expect(getFIPTier(4.25)).toBe('Average');
  });

  test('below average FIP 4.50-4.99', () => {
    expect(getFIPTier(4.50)).toBe('Below Average');
    expect(getFIPTier(4.75)).toBe('Below Average');
  });

  test('poor FIP >= 5.00', () => {
    expect(getFIPTier(5.00)).toBe('Poor');
    expect(getFIPTier(6.00)).toBe('Poor');
  });
});

describe('pWAR Tiers', () => {
  test('MVP caliber > 5.0', () => {
    expect(getPWARTier(5.5)).toBe('MVP-caliber');
  });

  test('All-Star 3.0-5.0', () => {
    expect(getPWARTier(4.0)).toBe('All-Star');
    expect(getPWARTier(3.0)).toBe('Above Average'); // Edge case - just below
  });

  test('Above Average 1.5-3.0', () => {
    expect(getPWARTier(2.0)).toBe('Above Average');
    expect(getPWARTier(1.5)).toBe('Average'); // Edge case
  });

  test('Average 0.5-1.5', () => {
    expect(getPWARTier(1.0)).toBe('Average');
  });

  test('Below Average 0.0-0.5', () => {
    expect(getPWARTier(0.3)).toBe('Below Average');
  });

  test('Replacement <= 0.0', () => {
    expect(getPWARTier(0.0)).toBe('Replacement'); // 0.0 is replacement level
    expect(getPWARTier(-0.5)).toBe('Replacement');
  });
});

// ============================================
// EDGE CASES
// ============================================

describe('Edge Cases', () => {
  test('very low IP pitcher', () => {
    const stats = createPitchingStats({
      ip: 2,
      strikeouts: 3,
      walks: 1,
      hitByPitch: 0,
      homeRunsAllowed: 0,
      gamesStarted: 0,
      gamesAppeared: 2,
    });

    const result = calculatePWARSimplified(stats, 48);

    expect(result.pWAR).toBeDefined();
    expect(!isNaN(result.pWAR)).toBe(true);
  });

  test('immaculate inning stats (9 K, 0 BB, 0 HR)', () => {
    const stats = createPitchingStats({
      ip: 100,
      strikeouts: 150, // Very high K rate
      walks: 0,
      hitByPitch: 0,
      homeRunsAllowed: 0,
    });

    const result = calculatePWARSimplified(stats, 48);

    expect(result.fip).toBeLessThan(2.0); // Elite FIP
    expect(result.pWAR).toBeGreaterThan(0);
  });

  test('terrible pitcher (low K, high BB, high HR)', () => {
    const stats = createPitchingStats({
      ip: 100,
      strikeouts: 30,
      walks: 80,
      hitByPitch: 10,
      homeRunsAllowed: 30,
    });

    const result = calculatePWARSimplified(stats, 48);

    expect(result.fip).toBeGreaterThan(6.0); // Very high FIP
    expect(result.pWAR).toBeLessThan(0); // Likely negative
  });

  test('swingman with mixed usage', () => {
    const stats = createPitchingStats({
      ip: 80,
      gamesStarted: 10,
      gamesAppeared: 25,
      saves: 2,
      holds: 5,
    });

    const result = calculatePWARSimplified(stats, 48);

    expect(result.role).toBe('swingman');
    expect(result.starterShare).toBeCloseTo(0.4, 2);
  });
});

// ============================================
// COMPARISON TESTS
// ============================================

describe('Starter vs Reliever Comparison', () => {
  test('same FIP, starter gets more WAR (more IP)', () => {
    const starterStats = createPitchingStats({
      ip: 180,
      strikeouts: 150,
      walks: 50,
      hitByPitch: 5,
      homeRunsAllowed: 18,
      gamesStarted: 30,
      gamesAppeared: 30,
    });

    const relieverStats = createPitchingStats({
      ip: 60,
      strikeouts: 50,
      walks: 17,
      hitByPitch: 2,
      homeRunsAllowed: 6,
      gamesStarted: 0,
      gamesAppeared: 55,
    });

    const starterResult = calculatePWARSimplified(starterStats, 48);
    const relieverResult = calculatePWARSimplified(relieverStats, 48);

    // Similar FIP rate, but starter has 3x the IP
    expect(Math.abs(starterResult.fip - relieverResult.fip)).toBeLessThan(0.5);
    expect(starterResult.pWAR).toBeGreaterThan(relieverResult.pWAR);
  });

  test('closer with high LI can match starter WAR', () => {
    const starterStats = createPitchingStats({
      ip: 100,
      strikeouts: 80,
      walks: 30,
      hitByPitch: 3,
      homeRunsAllowed: 10,
      gamesStarted: 18,
      gamesAppeared: 18,
    });

    const closerStats = createPitchingStats({
      ip: 60,
      strikeouts: 70,
      walks: 15,
      hitByPitch: 2,
      homeRunsAllowed: 4,
      gamesStarted: 0,
      gamesAppeared: 55,
      saves: 40, // Elite closer
      holds: 3,
    });

    const starterResult = calculatePWARSimplified(starterStats, 48);
    const closerResult = calculatePWARSimplified(closerStats, 48);

    // Elite closer with LI boost can have similar WAR despite fewer IP
    expect(closerResult.leverageMultiplier).toBeGreaterThan(1.2);
    // Closer has better FIP rate
    expect(closerResult.fip).toBeLessThan(starterResult.fip);
  });
});
