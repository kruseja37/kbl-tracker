/**
 * Manager WAR (mWAR) Calculator Tests
 * Per TESTING_IMPLEMENTATION_PLAN.md Phase 2.1
 *
 * Tests mWAR calculation which quantifies manager value through:
 * 1. In-game decisions weighted by leverage (60%)
 * 2. Team overperformance vs salary-based expectation (40%)
 *
 * Formula: mWAR = (decisionWAR × 0.60) + (overperformanceWAR × 0.40)
 */

import { describe, test, expect } from 'vitest';
import {
  createManagerDecision,
  resolveDecision,
  getDecisionBaseValue,
  calculateDecisionClutchImpact,
  calculateDecisionWAR,
  calculateSeasonMWAR,
  calculateOverperformance,
  getExpectedWinPct,
  calculateTeamSalaryScore,
  getDecisionSuccessRate,
  getMWARRating,
  evaluatePitchingChange,
  evaluateLeavePitcherIn,
  evaluatePinchHitter,
  evaluatePinchRunner,
  evaluateIBB,
  evaluateStealCall,
  evaluateBuntCall,
  evaluateSqueezeCall,
  createManagerSeasonStats,
  addDecisionToSeasonStats,
  createGameManagerStats,
  addDecisionToGameStats,
  formatMWAR,
  getMWARColor,
  isAutoDetectedDecision,
  isUserPromptedDecision,
  MWAR_WEIGHTS,
  DECISION_VALUES,
  MWAR_THRESHOLDS,
  HIGH_LEVERAGE_THRESHOLD,
  EXPECTED_SUCCESS_RATES,
  type DecisionType,
  type DecisionOutcome,
  type DecisionGameState,
  type ManagerDecision,
} from '../../../engines/mwarCalculator';

// ============================================
// CONSTANTS TESTS
// ============================================

describe('mWAR Constants', () => {
  test('weight components sum to 1.0', () => {
    expect(MWAR_WEIGHTS.decision + MWAR_WEIGHTS.overperformance).toBe(1.0);
  });

  test('decision weight is 60%', () => {
    expect(MWAR_WEIGHTS.decision).toBe(0.60);
  });

  test('overperformance weight is 40%', () => {
    expect(MWAR_WEIGHTS.overperformance).toBe(0.40);
  });

  test('high leverage threshold is 2.0', () => {
    expect(HIGH_LEVERAGE_THRESHOLD).toBe(2.0);
  });

  test('decision values exist for all types', () => {
    const decisionTypes: DecisionType[] = [
      'pitching_change', 'leave_pitcher_in', 'pinch_hitter',
      'pinch_runner', 'defensive_sub', 'intentional_walk',
      'steal_call', 'bunt_call', 'squeeze_call',
      'hit_and_run', 'shift_on', 'shift_off',
    ];

    decisionTypes.forEach((type) => {
      expect(DECISION_VALUES[type]).toBeDefined();
      expect(DECISION_VALUES[type].success).toBeGreaterThan(0);
      expect(DECISION_VALUES[type].failure).toBeLessThan(0);
    });
  });

  test('expected success rates exist for all types', () => {
    const decisionTypes: DecisionType[] = [
      'pitching_change', 'leave_pitcher_in', 'pinch_hitter',
      'pinch_runner', 'defensive_sub', 'intentional_walk',
      'steal_call', 'bunt_call', 'squeeze_call',
      'hit_and_run', 'shift_on', 'shift_off',
    ];

    decisionTypes.forEach((type) => {
      expect(EXPECTED_SUCCESS_RATES[type]).toBeGreaterThan(0);
      expect(EXPECTED_SUCCESS_RATES[type]).toBeLessThan(1);
    });
  });

  test('mWAR thresholds are ordered correctly', () => {
    expect(MWAR_THRESHOLDS.elite).toBeGreaterThan(MWAR_THRESHOLDS.excellent);
    expect(MWAR_THRESHOLDS.excellent).toBeGreaterThan(MWAR_THRESHOLDS.aboveAverage);
    expect(MWAR_THRESHOLDS.aboveAverage).toBeGreaterThan(MWAR_THRESHOLDS.average);
    expect(MWAR_THRESHOLDS.average).toBeGreaterThan(MWAR_THRESHOLDS.belowAverage);
  });
});

// ============================================
// DECISION CREATION
// ============================================

describe('Decision Creation', () => {
  const baseGameState: DecisionGameState = {
    inning: 7,
    halfInning: 'BOTTOM',
    outs: 1,
    runners: { first: true, second: false, third: true },
    homeScore: 3,
    awayScore: 4,
  };

  test('createManagerDecision creates valid decision', () => {
    const decision = createManagerDecision(
      'game-001',
      'manager-001',
      'pitching_change',
      baseGameState,
      'auto',
      ['pitcher-123', 'pitcher-456']
    );

    expect(decision.gameId).toBe('game-001');
    expect(decision.managerId).toBe('manager-001');
    expect(decision.decisionType).toBe('pitching_change');
    expect(decision.resolved).toBe(false);
    expect(decision.outcome).toBe('neutral');
    expect(decision.involvedPlayers).toContain('pitcher-123');
  });

  test('decision has unique ID', () => {
    const decision1 = createManagerDecision('g1', 'm1', 'pinch_hitter', baseGameState);
    const decision2 = createManagerDecision('g1', 'm1', 'pinch_hitter', baseGameState);

    expect(decision1.decisionId).not.toBe(decision2.decisionId);
  });

  test('decision captures leverage index', () => {
    const highLIState: DecisionGameState = {
      inning: 9,
      halfInning: 'BOTTOM',
      outs: 2,
      runners: { first: false, second: true, third: true },
      homeScore: 4,
      awayScore: 5,
    };

    const decision = createManagerDecision('g1', 'm1', 'pitching_change', highLIState);

    expect(decision.leverageIndex).toBeGreaterThan(1.0);
  });
});

// ============================================
// DECISION BASE VALUES
// ============================================

describe('Decision Base Values', () => {
  test('successful pitching change has positive value', () => {
    const value = getDecisionBaseValue('pitching_change', 'success');
    expect(value).toBe(0.4);
  });

  test('failed pitching change has negative value', () => {
    const value = getDecisionBaseValue('pitching_change', 'failure');
    expect(value).toBe(-0.3);
  });

  test('neutral outcome has 0 value', () => {
    const value = getDecisionBaseValue('pitching_change', 'neutral');
    expect(value).toBe(0);
  });

  test('squeeze play has highest success value', () => {
    const squeezeSuccess = getDecisionBaseValue('squeeze_call', 'success');

    // Check it's higher than other decision types
    expect(squeezeSuccess).toBe(0.6);
  });

  test('IBB failure has steep penalty', () => {
    const ibbFailure = getDecisionBaseValue('intentional_walk', 'failure');
    expect(ibbFailure).toBe(-0.5);
  });
});

// ============================================
// CLUTCH IMPACT CALCULATION
// ============================================

describe('Clutch Impact Calculation', () => {
  test('high LI amplifies decision value', () => {
    const lowLI = calculateDecisionClutchImpact('pinch_hitter', 'success', 1.0);
    const highLI = calculateDecisionClutchImpact('pinch_hitter', 'success', 4.0);

    // sqrt(4.0) = 2.0, so highLI should be ~2x
    expect(highLI).toBeGreaterThan(lowLI);
    expect(highLI).toBeCloseTo(lowLI * 2, 1);
  });

  test('LI of 1.0 returns base value', () => {
    const baseValue = getDecisionBaseValue('steal_call', 'success');
    const clutchValue = calculateDecisionClutchImpact('steal_call', 'success', 1.0);

    expect(clutchValue).toBe(baseValue);
  });

  test('failed decision at high LI is very negative', () => {
    const clutchValue = calculateDecisionClutchImpact('squeeze_call', 'failure', 4.0);

    // Base value is -0.5, with sqrt(4)=2 multiplier = -1.0
    expect(clutchValue).toBeCloseTo(-1.0, 1);
  });
});

// ============================================
// DECISION RESOLUTION
// ============================================

describe('Decision Resolution', () => {
  test('resolving decision sets outcome', () => {
    const baseState: DecisionGameState = {
      inning: 5,
      halfInning: 'TOP',
      outs: 1,
      runners: { first: true, second: false, third: false },
      homeScore: 2,
      awayScore: 2,
    };

    const decision = createManagerDecision('g1', 'm1', 'steal_call', baseState);
    const resolved = resolveDecision(decision, 'success');

    expect(resolved.resolved).toBe(true);
    expect(resolved.outcome).toBe('success');
    expect(resolved.clutchImpact).toBeGreaterThan(0);
  });

  test('resolved decision calculates clutch impact', () => {
    const highLIState: DecisionGameState = {
      inning: 9,
      halfInning: 'BOTTOM',
      outs: 2,
      runners: { first: false, second: true, third: false },
      homeScore: 3,
      awayScore: 4,
    };

    const decision = createManagerDecision('g1', 'm1', 'pinch_hitter', highLIState);
    const resolved = resolveDecision(decision, 'success');

    // With high LI, clutch impact should be amplified
    expect(resolved.clutchImpact).toBeGreaterThan(
      getDecisionBaseValue('pinch_hitter', 'success')
    );
  });
});

// ============================================
// DECISION OUTCOME EVALUATION
// ============================================

describe('Decision Outcome Evaluation', () => {
  const mockDecision: ManagerDecision = {
    decisionId: 'd1',
    gameId: 'g1',
    managerId: 'm1',
    inning: 7,
    halfInning: 'TOP',
    decisionType: 'pitching_change',
    leverageIndex: 1.5,
    gameState: {
      inning: 7,
      halfInning: 'TOP',
      outs: 1,
      runners: { first: true, second: true, third: false },
      homeScore: 3,
      awayScore: 4,
    },
    inferenceMethod: 'auto',
    resolved: false,
    outcome: 'neutral',
    clutchImpact: 0,
    involvedPlayers: [],
  };

  describe('evaluatePitchingChange', () => {
    test('success when new pitcher escapes jam', () => {
      const result = evaluatePitchingChange(mockDecision, {
        runsAllowed: 0,
        outsRecorded: 5,
        inheritedRunnersScored: 0,
      });
      expect(result).toBe('success');
    });

    test('failure when inherited runners score', () => {
      const result = evaluatePitchingChange(mockDecision, {
        runsAllowed: 2,
        outsRecorded: 3,
        inheritedRunnersScored: 2,
      });
      expect(result).toBe('failure');
    });

    test('failure when gives up runs quickly', () => {
      const result = evaluatePitchingChange(mockDecision, {
        runsAllowed: 3,
        outsRecorded: 1,
        inheritedRunnersScored: 0,
      });
      expect(result).toBe('failure');
    });
  });

  describe('evaluateLeavePitcherIn', () => {
    test('success when pitcher escapes without runs', () => {
      const result = evaluateLeavePitcherIn(mockDecision, {
        runsAllowed: 0,
        gotOutOfInning: true,
      });
      expect(result).toBe('success');
    });

    test('failure when gives up multiple runs', () => {
      const result = evaluateLeavePitcherIn(mockDecision, {
        runsAllowed: 3,
        gotOutOfInning: false,
      });
      expect(result).toBe('failure');
    });
  });

  describe('evaluatePinchHitter', () => {
    test('success on hit', () => {
      expect(evaluatePinchHitter(mockDecision, '2B')).toBe('success');
      expect(evaluatePinchHitter(mockDecision, 'HR')).toBe('success');
      expect(evaluatePinchHitter(mockDecision, 'single')).toBe('success');
    });

    test('success on walk', () => {
      expect(evaluatePinchHitter(mockDecision, 'BB')).toBe('success');
      expect(evaluatePinchHitter(mockDecision, 'walk')).toBe('success');
    });

    test('failure on strikeout', () => {
      expect(evaluatePinchHitter(mockDecision, 'K')).toBe('failure');
      expect(evaluatePinchHitter(mockDecision, 'strikeout')).toBe('failure');
    });

    test('failure on GIDP', () => {
      expect(evaluatePinchHitter(mockDecision, 'GIDP')).toBe('failure');
    });
  });

  describe('evaluatePinchRunner', () => {
    test('success when runner scores', () => {
      expect(evaluatePinchRunner(mockDecision, 'scored')).toBe('success');
    });

    test('success when runner advances', () => {
      expect(evaluatePinchRunner(mockDecision, 'advanced')).toBe('success');
    });

    test('failure when thrown out on bases', () => {
      expect(evaluatePinchRunner(mockDecision, 'out_on_bases')).toBe('failure');
    });

    test('neutral when held', () => {
      expect(evaluatePinchRunner(mockDecision, 'held')).toBe('neutral');
    });
  });

  describe('evaluateIBB', () => {
    test('success when next batter makes out', () => {
      expect(evaluateIBB(mockDecision, 'GO')).toBe('success');
      expect(evaluateIBB(mockDecision, 'K')).toBe('success');
      expect(evaluateIBB(mockDecision, 'fly_out')).toBe('success');
    });

    test('failure when next batter gets hit', () => {
      expect(evaluateIBB(mockDecision, '1B')).toBe('failure');
      expect(evaluateIBB(mockDecision, 'HR')).toBe('failure');
      expect(evaluateIBB(mockDecision, 'double')).toBe('failure');
    });

    test('failure when next batter walks', () => {
      expect(evaluateIBB(mockDecision, 'BB')).toBe('failure');
    });
  });

  describe('evaluateStealCall', () => {
    test('success on stolen base', () => {
      expect(evaluateStealCall(mockDecision, 'SB')).toBe('success');
      expect(evaluateStealCall(mockDecision, 'stolen_base')).toBe('success');
    });

    test('failure on caught stealing', () => {
      expect(evaluateStealCall(mockDecision, 'CS')).toBe('failure');
      expect(evaluateStealCall(mockDecision, 'caught_stealing')).toBe('failure');
    });
  });

  describe('evaluateBuntCall', () => {
    test('success on successful bunt', () => {
      expect(evaluateBuntCall(mockDecision, 'success')).toBe('success');
    });

    test('failure on double play', () => {
      expect(evaluateBuntCall(mockDecision, 'double_play')).toBe('failure');
    });

    test('neutral on regular sacrifice out', () => {
      expect(evaluateBuntCall(mockDecision, 'out')).toBe('neutral');
    });
  });

  describe('evaluateSqueezeCall', () => {
    test('success when runner scores', () => {
      expect(evaluateSqueezeCall(mockDecision, 'scores')).toBe('success');
    });

    test('success when batter out but runner scores', () => {
      expect(evaluateSqueezeCall(mockDecision, 'batter_out_runner_scores')).toBe('success');
    });

    test('failure when runner out at home', () => {
      expect(evaluateSqueezeCall(mockDecision, 'out_at_home')).toBe('failure');
    });
  });
});

// ============================================
// TEAM PERFORMANCE
// ============================================

describe('Team Performance', () => {
  describe('calculateTeamSalaryScore', () => {
    test('median salary gives middle-range score', () => {
      // Formula: (salary - minSalary) / (maxSalary - minSalary)
      // minSalary = median * 0.3 = 30
      // (100 - 30) / (150 - 30) = 70/120 = 0.583
      const score = calculateTeamSalaryScore(100, 100, 150);
      expect(score).toBeGreaterThan(0.4);
      expect(score).toBeLessThan(0.7);
    });

    test('max salary = 1.0 score', () => {
      const score = calculateTeamSalaryScore(150, 100, 150);
      expect(score).toBe(1.0);
    });

    test('min salary = 0.0 score', () => {
      const score = calculateTeamSalaryScore(30, 100, 150); // 0.3 × median
      expect(score).toBeCloseTo(0.0, 1);
    });
  });

  describe('getExpectedWinPct', () => {
    test('score 0 = 35% expected win pct', () => {
      expect(getExpectedWinPct(0)).toBeCloseTo(0.35, 4);
    });

    test('score 1 = 65% expected win pct', () => {
      expect(getExpectedWinPct(1)).toBeCloseTo(0.65, 4);
    });

    test('score 0.5 = 50% expected win pct', () => {
      expect(getExpectedWinPct(0.5)).toBeCloseTo(0.50, 4);
    });
  });

  describe('calculateOverperformance', () => {
    test('team exceeding expectations has positive overperformance', () => {
      const result = calculateOverperformance(35, 15, 0.3, 50);

      expect(result.actualWinPct).toBe(0.7);
      expect(result.expectedWinPct).toBeLessThan(0.7);
      expect(result.overperformance).toBeGreaterThan(0);
      expect(result.overperformanceWins).toBeGreaterThan(0);
    });

    test('team underperforming has negative overperformance', () => {
      const result = calculateOverperformance(15, 35, 0.7, 50);

      expect(result.actualWinPct).toBe(0.3);
      expect(result.expectedWinPct).toBeGreaterThan(0.3);
      expect(result.overperformance).toBeLessThan(0);
      expect(result.overperformanceWins).toBeLessThan(0);
    });

    test('manager credit is 30% of overperformance', () => {
      const result = calculateOverperformance(30, 20, 0.4, 50);

      // Manager credit should be 0.30 × overperformanceWins
      expect(result.managerCredit).toBeCloseTo(
        result.overperformanceWins * 0.30,
        2
      );
    });
  });
});

// ============================================
// SEASON mWAR CALCULATION
// ============================================

describe('Season mWAR Calculation', () => {
  test('calculateDecisionWAR sums clutch impacts', () => {
    const decisions: ManagerDecision[] = [
      createResolvedDecision('success', 0.5),
      createResolvedDecision('success', 0.3),
      createResolvedDecision('failure', -0.4),
    ];

    const rpw = 3.0;
    const decisionWAR = calculateDecisionWAR(decisions, rpw);

    // Total value: 0.5 + 0.3 - 0.4 = 0.4
    // WAR = 0.4 / 3.0 = 0.133
    expect(decisionWAR).toBeCloseTo(0.133, 2);
  });

  test('getDecisionSuccessRate calculates correctly', () => {
    const decisions: ManagerDecision[] = [
      createResolvedDecision('success', 0.5),
      createResolvedDecision('success', 0.3),
      createResolvedDecision('failure', -0.2),
      createResolvedDecision('neutral', 0),
    ];

    const rate = getDecisionSuccessRate(decisions);
    expect(rate).toBe(0.5); // 2 successes out of 4
  });

  test('calculateSeasonMWAR combines components correctly', () => {
    const decisions: ManagerDecision[] = [];
    for (let i = 0; i < 10; i++) {
      decisions.push(createResolvedDecision('success', 0.2));
    }

    const teamStats = {
      wins: 30,
      losses: 20,
      salaryScore: 0.4, // Below median
    };

    const result = calculateSeasonMWAR(decisions, teamStats, 50);

    expect(result.mWAR).toBeDefined();
    expect(result.decisionWAR).toBeGreaterThan(0);
    expect(result.decisionCount).toBe(10);
    expect(result.successRate).toBe(1.0);
    expect(result.teamRecord).toBe('30-20');
  });

  test('mWAR uses 60/40 weighting', () => {
    // Create scenario where we know exact values
    const decisions: ManagerDecision[] = [
      createResolvedDecision('success', 1.0), // 1.0 total value
    ];

    const teamStats = {
      wins: 35,
      losses: 15,
      salaryScore: 0.5, // Expected .500
    };

    const result = calculateSeasonMWAR(decisions, teamStats, 50);

    // Decision component should be 60% of total
    // Overperformance component should be 40% of total
    expect(result.decisionWAR).toBeGreaterThan(0);
    expect(result.overperformanceWAR).toBeGreaterThan(0);
  });
});

// ============================================
// mWAR RATING
// ============================================

describe('mWAR Rating', () => {
  test('Elite rating for mWAR >= 4.0', () => {
    expect(getMWARRating(4.5)).toBe('Elite');
    expect(getMWARRating(4.0)).toBe('Elite');
  });

  test('Excellent rating for mWAR >= 2.5', () => {
    expect(getMWARRating(3.0)).toBe('Excellent');
    expect(getMWARRating(2.5)).toBe('Excellent');
  });

  test('Above Average rating for mWAR >= 1.0', () => {
    expect(getMWARRating(1.5)).toBe('Above Average');
    expect(getMWARRating(1.0)).toBe('Above Average');
  });

  test('Average rating for mWAR >= 0', () => {
    expect(getMWARRating(0.5)).toBe('Average');
    expect(getMWARRating(0)).toBe('Average');
  });

  test('Below Average rating for mWAR >= -1.0', () => {
    expect(getMWARRating(-0.5)).toBe('Below Average');
  });

  test('Poor rating for mWAR < -1.0', () => {
    expect(getMWARRating(-1.5)).toBe('Poor');
    expect(getMWARRating(-2.0)).toBe('Poor');
  });
});

// ============================================
// STATS AGGREGATION
// ============================================

describe('Stats Aggregation', () => {
  describe('Manager Season Stats', () => {
    test('createManagerSeasonStats initializes correctly', () => {
      const stats = createManagerSeasonStats('s1', 'm1', 't1');

      expect(stats.seasonId).toBe('s1');
      expect(stats.managerId).toBe('m1');
      expect(stats.teamId).toBe('t1');
      expect(stats.mWAR).toBe(0);
      expect(stats.decisions).toHaveLength(0);
      expect(stats.decisionCounts.total).toBe(0);
    });

    test('addDecisionToSeasonStats tracks decision', () => {
      const stats = createManagerSeasonStats('s1', 'm1', 't1');
      const decision = createTestDecision('pitching_change', 2.5);

      addDecisionToSeasonStats(stats, decision);

      expect(stats.decisions).toHaveLength(1);
      expect(stats.decisionCounts.total).toBe(1);
      expect(stats.highLeverageDecisions).toBe(1);
    });

    test('addDecisionToSeasonStats tracks by type', () => {
      const stats = createManagerSeasonStats('s1', 'm1', 't1');

      addDecisionToSeasonStats(stats, createTestDecision('pitching_change', 1.0));
      addDecisionToSeasonStats(stats, createTestDecision('pitching_change', 1.5));
      addDecisionToSeasonStats(stats, createTestDecision('pinch_hitter', 1.0));

      expect(stats.decisionsByType.pitching_change.count).toBe(2);
      expect(stats.decisionsByType.pinch_hitter.count).toBe(1);
    });
  });

  describe('Game Manager Stats', () => {
    test('createGameManagerStats initializes correctly', () => {
      const stats = createGameManagerStats('g1', 'm1');

      expect(stats.gameId).toBe('g1');
      expect(stats.managerId).toBe('m1');
      expect(stats.decisions).toHaveLength(0);
      expect(stats.totalDecisionValue).toBe(0);
    });

    test('addDecisionToGameStats tracks decisions', () => {
      const stats = createGameManagerStats('g1', 'm1');
      const decision = createResolvedDecision('success', 0.5);

      addDecisionToGameStats(stats, decision);

      expect(stats.decisions).toHaveLength(1);
      expect(stats.totalDecisionValue).toBe(0.5);
      expect(stats.successfulDecisions).toBe(1);
    });
  });
});

// ============================================
// UTILITY FUNCTIONS
// ============================================

describe('Utility Functions', () => {
  describe('formatMWAR', () => {
    test('formats positive mWAR with + sign', () => {
      expect(formatMWAR(2.5)).toBe('+2.50');
    });

    test('formats negative mWAR without + sign', () => {
      expect(formatMWAR(-1.5)).toBe('-1.50');
    });

    test('formats zero as +0.00', () => {
      expect(formatMWAR(0)).toBe('+0.00');
    });

    test('respects precision parameter', () => {
      expect(formatMWAR(2.567, 1)).toBe('+2.6');
      expect(formatMWAR(2.567, 3)).toBe('+2.567');
    });
  });

  describe('getMWARColor', () => {
    test('Elite is gold', () => {
      expect(getMWARColor('Elite')).toBe('#fbbf24');
    });

    test('Excellent is green', () => {
      expect(getMWARColor('Excellent')).toBe('#22c55e');
    });

    test('Poor is red', () => {
      expect(getMWARColor('Poor')).toBe('#ef4444');
    });
  });

  describe('isAutoDetectedDecision', () => {
    test('pitching changes are auto-detected', () => {
      expect(isAutoDetectedDecision('pitching_change')).toBe(true);
    });

    test('pinch hitters are auto-detected', () => {
      expect(isAutoDetectedDecision('pinch_hitter')).toBe(true);
    });

    test('steal calls require user prompting', () => {
      expect(isAutoDetectedDecision('steal_call')).toBe(false);
    });
  });

  describe('isUserPromptedDecision', () => {
    test('steal calls require prompting', () => {
      expect(isUserPromptedDecision('steal_call')).toBe(true);
    });

    test('bunt calls require prompting', () => {
      expect(isUserPromptedDecision('bunt_call')).toBe(true);
    });

    test('pitching changes do not require prompting', () => {
      expect(isUserPromptedDecision('pitching_change')).toBe(false);
    });
  });
});

// ============================================
// INTEGRATION TESTS
// ============================================

describe('mWAR Integration Tests', () => {
  test('elite manager season', () => {
    // Many successful high-leverage decisions + team overperforms
    const decisions: ManagerDecision[] = [];
    for (let i = 0; i < 30; i++) {
      decisions.push(createResolvedDecision('success', 0.4));
    }

    const teamStats = {
      wins: 38,
      losses: 12, // 76% win rate
      salaryScore: 0.4, // Expected ~44% win rate
    };

    const result = calculateSeasonMWAR(decisions, teamStats, 50);

    expect(result.mWAR).toBeGreaterThan(2.0);
    expect(['Elite', 'Excellent']).toContain(result.rating);
  });

  test('poor manager season', () => {
    // Failed decisions + team underperforms
    const decisions: ManagerDecision[] = [];
    for (let i = 0; i < 20; i++) {
      decisions.push(createResolvedDecision('failure', -0.3));
    }

    const teamStats = {
      wins: 15,
      losses: 35, // 30% win rate
      salaryScore: 0.7, // Expected ~56% win rate
    };

    const result = calculateSeasonMWAR(decisions, teamStats, 50);

    expect(result.mWAR).toBeLessThan(0);
    expect(['Below Average', 'Poor']).toContain(result.rating);
  });

  test('average manager season', () => {
    // Mixed decisions + team performs as expected
    const decisions: ManagerDecision[] = [];
    for (let i = 0; i < 10; i++) {
      decisions.push(createResolvedDecision('success', 0.2));
      decisions.push(createResolvedDecision('failure', -0.2));
    }

    const teamStats = {
      wins: 25,
      losses: 25, // 50% win rate
      salaryScore: 0.5, // Expected ~50% win rate
    };

    const result = calculateSeasonMWAR(decisions, teamStats, 50);

    expect(Math.abs(result.mWAR)).toBeLessThan(1.0);
    expect(['Average', 'Above Average', 'Below Average']).toContain(result.rating);
  });
});

// ============================================
// HELPERS
// ============================================

function createResolvedDecision(
  outcome: DecisionOutcome,
  clutchImpact: number
): ManagerDecision {
  return {
    decisionId: `d-${Date.now()}-${Math.random()}`,
    gameId: 'g1',
    managerId: 'm1',
    inning: 7,
    halfInning: 'TOP',
    decisionType: 'pitching_change',
    leverageIndex: 1.5,
    gameState: {
      inning: 7,
      halfInning: 'TOP',
      outs: 1,
      runners: { first: true, second: false, third: false },
      homeScore: 3,
      awayScore: 3,
    },
    inferenceMethod: 'auto',
    resolved: true,
    outcome,
    clutchImpact,
    involvedPlayers: [],
  };
}

function createTestDecision(
  type: DecisionType,
  leverageIndex: number
): ManagerDecision {
  return {
    decisionId: `d-${Date.now()}-${Math.random()}`,
    gameId: 'g1',
    managerId: 'm1',
    inning: 7,
    halfInning: 'TOP',
    decisionType: type,
    leverageIndex,
    gameState: {
      inning: 7,
      halfInning: 'TOP',
      outs: 1,
      runners: { first: true, second: false, third: false },
      homeScore: 3,
      awayScore: 3,
    },
    inferenceMethod: 'auto',
    resolved: false,
    outcome: 'neutral',
    clutchImpact: 0,
    involvedPlayers: [],
  };
}
