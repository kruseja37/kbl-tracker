/**
 * mWAR Calculator API Contract Tests
 * Phase 5.5 - Prevent API Hallucination Bugs
 *
 * Per TESTING_IMPLEMENTATION_PLAN.md Section 5.5:
 * Verify mWAR calculator exports exist at correct paths
 * and return expected types.
 */

import { describe, test, expect } from 'vitest';
import {
  // Main functions
  createManagerDecision,
  resolveDecision,
  calculateSeasonMWAR,
  calculateDecisionWAR,
  calculateDecisionClutchImpact,
  getDecisionBaseValue,
  getMWARRating,

  // Stats aggregation functions
  createManagerSeasonStats,
  createGameManagerStats,
  addDecisionToSeasonStats,
  addDecisionToGameStats,
  recalculateSeasonStats,
  createEmptyDecisionCounts,
  createEmptyDecisionTypeBreakdown,

  // Evaluation functions
  evaluatePitchingChange,
  evaluateLeavePitcherIn,
  evaluatePinchHitter,
  evaluatePinchRunner,
  evaluateIBB,
  evaluateStealCall,
  evaluateBuntCall,
  evaluateSqueezeCall,
  evaluateShift,

  // Team performance
  calculateTeamSalaryScore,
  getExpectedWinPct,
  calculateOverperformance,
  getDecisionSuccessRate,

  // Utility functions
  formatMWAR,
  getMWARColor,
  isAutoDetectedDecision,
  isUserPromptedDecision,
  calculateMOYVotes,

  // Types
  type DecisionType,
  type DecisionOutcome,
  type InferenceMethod,
  type DecisionGameState,
  type ManagerDecision,
  type DecisionCounts,
  type DecisionTypeBreakdown,
  type ManagerSeasonStats,
  type GameManagerStats,
  type MWARResult,
  type ManagerProfile,

  // Constants
  MWAR_WEIGHTS,
  MANAGER_OVERPERFORMANCE_CREDIT,
  DECISION_VALUES,
  MWAR_THRESHOLDS,
  HIGH_LEVERAGE_THRESHOLD,
  EXPECTED_SUCCESS_RATES,
} from '../../../engines/mwarCalculator';

// ============================================
// FUNCTION SIGNATURE CONTRACTS
// ============================================

describe('mWAR Calculator API Contract', () => {
  describe('createManagerDecision Signature', () => {
    test('accepts (gameId, managerId, decisionType, gameState) and returns ManagerDecision', () => {
      const gameState: DecisionGameState = {
        inning: 7,
        halfInning: 'TOP',
        outs: 1,
        runners: { first: true, second: false, third: false },
        homeScore: 3,
        awayScore: 2,
      };

      const decision = createManagerDecision(
        'game-1',
        'manager-1',
        'pitching_change',
        gameState
      );

      expect(decision).toHaveProperty('decisionId');
      expect(decision).toHaveProperty('gameId', 'game-1');
      expect(decision).toHaveProperty('managerId', 'manager-1');
      expect(decision).toHaveProperty('decisionType', 'pitching_change');
      expect(decision).toHaveProperty('leverageIndex');
      expect(decision).toHaveProperty('gameState');
      expect(decision).toHaveProperty('resolved', false);
    });

    test('accepts optional inferenceMethod parameter', () => {
      const gameState: DecisionGameState = {
        inning: 5,
        halfInning: 'BOTTOM',
        outs: 2,
        runners: { first: false, second: true, third: false },
        homeScore: 1,
        awayScore: 1,
      };

      const decision = createManagerDecision(
        'game-1',
        'manager-1',
        'steal_call',
        gameState,
        'user_prompted'
      );

      expect(decision.inferenceMethod).toBe('user_prompted');
    });

    test('accepts optional involvedPlayers and notes parameters', () => {
      const gameState: DecisionGameState = {
        inning: 9,
        halfInning: 'BOTTOM',
        outs: 2,
        runners: { first: true, second: true, third: false },
        homeScore: 4,
        awayScore: 5,
      };

      const decision = createManagerDecision(
        'game-1',
        'manager-1',
        'pinch_hitter',
        gameState,
        'auto',
        ['player-1', 'player-2'],
        'Bringing in lefty specialist'
      );

      expect(decision.involvedPlayers).toContain('player-1');
      expect(decision.notes).toBe('Bringing in lefty specialist');
    });
  });

  // ============================================
  // DecisionType TYPE CONTRACT
  // ============================================

  describe('DecisionType Type Contract', () => {
    const validDecisionTypes: DecisionType[] = [
      'pitching_change',
      'leave_pitcher_in',
      'pinch_hitter',
      'pinch_runner',
      'defensive_sub',
      'intentional_walk',
      'steal_call',
      'bunt_call',
      'squeeze_call',
      'hit_and_run',
      'shift_on',
      'shift_off',
    ];

    test('has all expected decision types', () => {
      expect(validDecisionTypes.length).toBe(12);
    });

    test('DECISION_VALUES has entry for each type', () => {
      for (const type of validDecisionTypes) {
        expect(DECISION_VALUES[type]).toBeDefined();
        expect(DECISION_VALUES[type]).toHaveProperty('success');
        expect(DECISION_VALUES[type]).toHaveProperty('failure');
      }
    });

    test('EXPECTED_SUCCESS_RATES has entry for each type', () => {
      for (const type of validDecisionTypes) {
        expect(EXPECTED_SUCCESS_RATES[type]).toBeDefined();
        expect(typeof EXPECTED_SUCCESS_RATES[type]).toBe('number');
      }
    });
  });

  // ============================================
  // DecisionOutcome TYPE CONTRACT
  // ============================================

  describe('DecisionOutcome Type Contract', () => {
    test('valid outcomes are success, failure, neutral', () => {
      const outcomes: DecisionOutcome[] = ['success', 'failure', 'neutral'];
      expect(outcomes.length).toBe(3);
    });
  });

  // ============================================
  // InferenceMethod TYPE CONTRACT
  // ============================================

  describe('InferenceMethod Type Contract', () => {
    test('valid methods are auto, user_prompted, user_flagged', () => {
      const methods: InferenceMethod[] = ['auto', 'user_prompted', 'user_flagged'];
      expect(methods.length).toBe(3);
    });
  });

  // ============================================
  // ManagerDecision INTERFACE CONTRACT
  // ============================================

  describe('ManagerDecision Interface Contract', () => {
    const gameState: DecisionGameState = {
      inning: 8,
      halfInning: 'TOP',
      outs: 0,
      runners: { first: false, second: false, third: false },
      homeScore: 2,
      awayScore: 2,
    };

    const decision = createManagerDecision(
      'game-test',
      'manager-test',
      'defensive_sub',
      gameState
    );

    test('has decisionId (string)', () => {
      expect(typeof decision.decisionId).toBe('string');
    });

    test('has gameId (string)', () => {
      expect(typeof decision.gameId).toBe('string');
    });

    test('has managerId (string)', () => {
      expect(typeof decision.managerId).toBe('string');
    });

    test('has inning (number)', () => {
      expect(typeof decision.inning).toBe('number');
    });

    test('has halfInning (TOP | BOTTOM)', () => {
      expect(['TOP', 'BOTTOM']).toContain(decision.halfInning);
    });

    test('has decisionType (DecisionType)', () => {
      expect(typeof decision.decisionType).toBe('string');
    });

    test('has leverageIndex (number)', () => {
      expect(typeof decision.leverageIndex).toBe('number');
    });

    test('has gameState (DecisionGameState)', () => {
      expect(decision.gameState).toHaveProperty('inning');
      expect(decision.gameState).toHaveProperty('halfInning');
      expect(decision.gameState).toHaveProperty('outs');
      expect(decision.gameState).toHaveProperty('runners');
    });

    test('has inferenceMethod (InferenceMethod)', () => {
      expect(['auto', 'user_prompted', 'user_flagged']).toContain(decision.inferenceMethod);
    });

    test('has resolved (boolean)', () => {
      expect(typeof decision.resolved).toBe('boolean');
    });

    test('has outcome (DecisionOutcome)', () => {
      expect(['success', 'failure', 'neutral']).toContain(decision.outcome);
    });

    test('has clutchImpact (number)', () => {
      expect(typeof decision.clutchImpact).toBe('number');
    });

    test('has involvedPlayers (string[])', () => {
      expect(Array.isArray(decision.involvedPlayers)).toBe(true);
    });
  });

  // ============================================
  // resolveDecision CONTRACT
  // ============================================

  describe('resolveDecision Signature', () => {
    test('accepts (decision, outcome) and returns resolved ManagerDecision', () => {
      const gameState: DecisionGameState = {
        inning: 6,
        halfInning: 'BOTTOM',
        outs: 1,
        runners: { first: true, second: true, third: false },
        homeScore: 3,
        awayScore: 5,
      };

      const decision = createManagerDecision(
        'game-1',
        'manager-1',
        'pitching_change',
        gameState
      );

      const resolved = resolveDecision(decision, 'success');

      expect(resolved.resolved).toBe(true);
      expect(resolved.outcome).toBe('success');
      expect(typeof resolved.clutchImpact).toBe('number');
    });
  });

  // ============================================
  // calculateSeasonMWAR CONTRACT
  // ============================================

  describe('calculateSeasonMWAR Signature', () => {
    test('accepts (decisions, teamStats, seasonGames) and returns MWARResult', () => {
      const result = calculateSeasonMWAR(
        [], // No decisions
        { wins: 30, losses: 20, salaryScore: 0.5 },
        50
      );

      expect(result).toHaveProperty('mWAR');
      expect(result).toHaveProperty('decisionWAR');
      expect(result).toHaveProperty('overperformanceWAR');
      expect(result).toHaveProperty('decisionCount');
      expect(result).toHaveProperty('successRate');
      expect(result).toHaveProperty('teamRecord');
      expect(result).toHaveProperty('expectedWins');
      expect(result).toHaveProperty('actualWins');
      expect(result).toHaveProperty('overperformanceWins');
      expect(result).toHaveProperty('rating');
    });

    test('accepts optional runsPerWin parameter', () => {
      const result = calculateSeasonMWAR(
        [],
        { wins: 25, losses: 25, salaryScore: 0.5 },
        50,
        3.09 // Custom RPW
      );

      expect(typeof result.mWAR).toBe('number');
    });
  });

  // ============================================
  // MWARResult INTERFACE CONTRACT
  // ============================================

  describe('MWARResult Interface Contract', () => {
    const result = calculateSeasonMWAR(
      [],
      { wins: 30, losses: 20, salaryScore: 0.6 },
      50
    );

    test('mWAR is number', () => {
      expect(typeof result.mWAR).toBe('number');
    });

    test('decisionWAR is number', () => {
      expect(typeof result.decisionWAR).toBe('number');
    });

    test('overperformanceWAR is number', () => {
      expect(typeof result.overperformanceWAR).toBe('number');
    });

    test('decisionCount is number', () => {
      expect(typeof result.decisionCount).toBe('number');
    });

    test('successRate is number', () => {
      expect(typeof result.successRate).toBe('number');
    });

    test('teamRecord is string (W-L format)', () => {
      expect(typeof result.teamRecord).toBe('string');
      expect(result.teamRecord).toMatch(/^\d+-\d+$/);
    });

    test('rating is string', () => {
      expect(typeof result.rating).toBe('string');
    });
  });

  // ============================================
  // CONSTANTS CONTRACT
  // ============================================

  describe('Constants Contract', () => {
    test('MWAR_WEIGHTS has decision and overperformance', () => {
      expect(MWAR_WEIGHTS.decision).toBe(0.60);
      expect(MWAR_WEIGHTS.overperformance).toBe(0.40);
    });

    test('MANAGER_OVERPERFORMANCE_CREDIT is 0.30', () => {
      expect(MANAGER_OVERPERFORMANCE_CREDIT).toBe(0.30);
    });

    test('HIGH_LEVERAGE_THRESHOLD is 2.0', () => {
      expect(HIGH_LEVERAGE_THRESHOLD).toBe(2.0);
    });

    test('MWAR_THRESHOLDS has expected levels', () => {
      expect(MWAR_THRESHOLDS.elite).toBe(4.0);
      expect(MWAR_THRESHOLDS.excellent).toBe(2.5);
      expect(MWAR_THRESHOLDS.aboveAverage).toBe(1.0);
      expect(MWAR_THRESHOLDS.average).toBe(0);
      expect(MWAR_THRESHOLDS.belowAverage).toBe(-1.0);
    });
  });

  // ============================================
  // EVALUATION FUNCTIONS CONTRACT
  // ============================================

  describe('Evaluation Functions Contract', () => {
    const gameState: DecisionGameState = {
      inning: 7,
      halfInning: 'TOP',
      outs: 1,
      runners: { first: true, second: true, third: false },
      homeScore: 3,
      awayScore: 4,
    };

    const decision = createManagerDecision(
      'game-1',
      'manager-1',
      'pitching_change',
      gameState
    );

    test('evaluatePitchingChange returns DecisionOutcome', () => {
      const result = evaluatePitchingChange(decision, {
        runsAllowed: 0,
        outsRecorded: 3,
        inheritedRunnersScored: 0,
      });
      expect(['success', 'failure', 'neutral']).toContain(result);
    });

    test('evaluateLeavePitcherIn returns DecisionOutcome', () => {
      const result = evaluateLeavePitcherIn(decision, {
        runsAllowed: 0,
        gotOutOfInning: true,
      });
      expect(['success', 'failure', 'neutral']).toContain(result);
    });

    test('evaluatePinchHitter returns DecisionOutcome', () => {
      const result = evaluatePinchHitter(decision, '2B');
      expect(['success', 'failure', 'neutral']).toContain(result);
    });

    test('evaluatePinchRunner returns DecisionOutcome', () => {
      const result = evaluatePinchRunner(decision, 'scored');
      expect(result).toBe('success');
    });

    test('evaluateIBB returns DecisionOutcome', () => {
      const result = evaluateIBB(decision, 'K');
      expect(result).toBe('success');
    });

    test('evaluateStealCall returns DecisionOutcome', () => {
      const result = evaluateStealCall(decision, 'SB');
      expect(result).toBe('success');
    });

    test('evaluateBuntCall returns DecisionOutcome', () => {
      const result = evaluateBuntCall(decision, 'success');
      expect(result).toBe('success');
    });

    test('evaluateSqueezeCall returns DecisionOutcome', () => {
      const result = evaluateSqueezeCall(decision, 'scores');
      expect(result).toBe('success');
    });

    test('evaluateShift returns DecisionOutcome', () => {
      const shiftDecision = createManagerDecision(
        'game-1',
        'manager-1',
        'shift_on',
        gameState
      );
      const result = evaluateShift(shiftDecision, 'out', 'pull');
      expect(result).toBe('success');
    });
  });

  // ============================================
  // STATS AGGREGATION CONTRACT
  // ============================================

  describe('Stats Aggregation Contract', () => {
    test('createManagerSeasonStats returns ManagerSeasonStats', () => {
      const stats = createManagerSeasonStats('season-1', 'manager-1', 'team-1');

      expect(stats.seasonId).toBe('season-1');
      expect(stats.managerId).toBe('manager-1');
      expect(stats.teamId).toBe('team-1');
      expect(stats.mWAR).toBe(0);
      expect(Array.isArray(stats.decisions)).toBe(true);
      expect(stats.decisionCounts).toHaveProperty('total', 0);
      expect(stats.decisionsByType).toHaveProperty('pitching_change');
    });

    test('createGameManagerStats returns GameManagerStats', () => {
      const stats = createGameManagerStats('game-1', 'manager-1');

      expect(stats.gameId).toBe('game-1');
      expect(stats.managerId).toBe('manager-1');
      expect(Array.isArray(stats.decisions)).toBe(true);
      expect(stats.totalDecisionValue).toBe(0);
    });

    test('addDecisionToSeasonStats mutates stats', () => {
      const stats = createManagerSeasonStats('season-1', 'manager-1', 'team-1');
      const gameState: DecisionGameState = {
        inning: 5,
        halfInning: 'TOP',
        outs: 1,
        runners: { first: false, second: false, third: false },
        homeScore: 0,
        awayScore: 0,
      };

      const decision = createManagerDecision(
        'game-1',
        'manager-1',
        'pinch_hitter',
        gameState
      );

      addDecisionToSeasonStats(stats, decision);

      expect(stats.decisionCounts.total).toBe(1);
      expect(stats.decisions.length).toBe(1);
    });

    test('addDecisionToGameStats mutates stats', () => {
      const stats = createGameManagerStats('game-1', 'manager-1');
      const gameState: DecisionGameState = {
        inning: 8,
        halfInning: 'BOTTOM',
        outs: 2,
        runners: { first: true, second: false, third: false },
        homeScore: 2,
        awayScore: 3,
      };

      const decision = resolveDecision(
        createManagerDecision('game-1', 'manager-1', 'steal_call', gameState),
        'success'
      );

      addDecisionToGameStats(stats, decision);

      expect(stats.decisions.length).toBe(1);
      expect(stats.successfulDecisions).toBe(1);
    });

    test('createEmptyDecisionCounts returns DecisionCounts', () => {
      const counts = createEmptyDecisionCounts();

      expect(counts.total).toBe(0);
      expect(counts.successes).toBe(0);
      expect(counts.failures).toBe(0);
      expect(counts.neutral).toBe(0);
    });

    test('createEmptyDecisionTypeBreakdown returns DecisionTypeBreakdown', () => {
      const breakdown = createEmptyDecisionTypeBreakdown();

      expect(breakdown.count).toBe(0);
      expect(breakdown.successes).toBe(0);
      expect(breakdown.failures).toBe(0);
      expect(breakdown.totalValue).toBe(0);
    });
  });

  // ============================================
  // UTILITY FUNCTIONS CONTRACT
  // ============================================

  describe('Utility Functions Contract', () => {
    test('getMWARRating returns rating string', () => {
      expect(getMWARRating(5.0)).toBe('Elite');
      expect(getMWARRating(3.0)).toBe('Excellent');
      expect(getMWARRating(1.5)).toBe('Above Average');
      expect(getMWARRating(0.5)).toBe('Average');
      expect(getMWARRating(-0.5)).toBe('Below Average');
      expect(getMWARRating(-2.0)).toBe('Poor');
    });

    test('formatMWAR returns formatted string with sign', () => {
      expect(formatMWAR(2.5)).toBe('+2.50');
      expect(formatMWAR(-1.3)).toBe('-1.30');
      expect(formatMWAR(0)).toBe('+0.00');
    });

    test('getMWARColor returns hex color', () => {
      const color = getMWARColor('Elite');
      expect(color).toMatch(/^#[0-9a-f]{6}$/);
    });

    test('isAutoDetectedDecision returns boolean', () => {
      expect(isAutoDetectedDecision('pitching_change')).toBe(true);
      expect(isAutoDetectedDecision('steal_call')).toBe(false);
    });

    test('isUserPromptedDecision returns boolean', () => {
      expect(isUserPromptedDecision('steal_call')).toBe(true);
      expect(isUserPromptedDecision('pitching_change')).toBe(false);
    });

    test('getDecisionBaseValue returns number', () => {
      expect(getDecisionBaseValue('pitching_change', 'success')).toBe(0.4);
      expect(getDecisionBaseValue('pitching_change', 'failure')).toBe(-0.3);
      expect(getDecisionBaseValue('pitching_change', 'neutral')).toBe(0);
    });

    test('calculateDecisionClutchImpact returns LI-weighted value', () => {
      const impact = calculateDecisionClutchImpact('pitching_change', 'success', 4.0);
      // Base value 0.4 × sqrt(4) = 0.4 × 2 = 0.8
      expect(impact).toBe(0.8);
    });

    test('getDecisionSuccessRate returns rate 0-1', () => {
      expect(getDecisionSuccessRate([])).toBe(0);
    });
  });

  // ============================================
  // TEAM PERFORMANCE FUNCTIONS CONTRACT
  // ============================================

  describe('Team Performance Functions Contract', () => {
    test('calculateTeamSalaryScore returns 0-1 value', () => {
      const score = calculateTeamSalaryScore(500, 400, 800);
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    });

    test('getExpectedWinPct returns percentage', () => {
      const pct = getExpectedWinPct(0.5);
      expect(pct).toBe(0.50); // 0.35 + (0.5 × 0.30) = 0.50
    });

    test('calculateOverperformance returns expected object', () => {
      const result = calculateOverperformance(35, 15, 0.5, 50);

      expect(result).toHaveProperty('expectedWinPct');
      expect(result).toHaveProperty('actualWinPct');
      expect(result).toHaveProperty('overperformance');
      expect(result).toHaveProperty('overperformanceWins');
      expect(result).toHaveProperty('managerCredit');
    });
  });

  // ============================================
  // MANAGER OF THE YEAR CONTRACT
  // ============================================

  describe('Manager of the Year Contract', () => {
    test('calculateMOYVotes returns score 0-100', () => {
      const managers = [
        { mWAR: 3.0, overperformanceWins: 5 },
        { mWAR: 1.5, overperformanceWins: 2 },
        { mWAR: -1.0, overperformanceWins: -3 },
      ];

      const score = calculateMOYVotes(managers[0], managers);
      expect(typeof score).toBe('number');
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });
  });

  // ============================================
  // SEMANTIC CONTRACTS
  // ============================================

  describe('Semantic Contracts', () => {
    test('team that overperforms has positive overperformanceWAR', () => {
      // Team with low salary (score 0.3) but wins 70% of games
      const result = calculateSeasonMWAR(
        [],
        { wins: 35, losses: 15, salaryScore: 0.3 },
        50
      );

      // Expected win% at 0.3 salary score = 0.35 + (0.3 × 0.30) = 0.44
      // Actual win% = 0.70
      // Overperformance = 0.26 × 50 = 13 wins
      // Manager credit = 13 × 0.30 = 3.9
      expect(result.overperformanceWAR).toBeGreaterThan(0);
    });

    test('team that underperforms has negative overperformanceWAR', () => {
      // Team with high salary (score 0.8) but wins only 40% of games
      const result = calculateSeasonMWAR(
        [],
        { wins: 20, losses: 30, salaryScore: 0.8 },
        50
      );

      // Expected win% at 0.8 salary score = 0.35 + (0.8 × 0.30) = 0.59
      // Actual win% = 0.40
      // Underperformance = -0.19 × 50 = -9.5 wins
      expect(result.overperformanceWAR).toBeLessThan(0);
    });

    test('high LI decisions have more impact', () => {
      const gameStateLow: DecisionGameState = {
        inning: 1,
        halfInning: 'TOP',
        outs: 0,
        runners: { first: false, second: false, third: false },
        homeScore: 0,
        awayScore: 0,
      };

      const gameStateHigh: DecisionGameState = {
        inning: 9,
        halfInning: 'BOTTOM',
        outs: 2,
        runners: { first: true, second: true, third: true },
        homeScore: 4,
        awayScore: 5,
      };

      const lowLI = createManagerDecision('game-1', 'manager-1', 'pitching_change', gameStateLow);
      const highLI = createManagerDecision('game-1', 'manager-1', 'pitching_change', gameStateHigh);

      expect(highLI.leverageIndex).toBeGreaterThan(lowLI.leverageIndex);

      // Same outcome should have higher clutchImpact at high LI
      const lowResolved = resolveDecision(lowLI, 'success');
      const highResolved = resolveDecision(highLI, 'success');

      expect(Math.abs(highResolved.clutchImpact)).toBeGreaterThan(Math.abs(lowResolved.clutchImpact));
    });
  });
});

// ============================================
// TYPE COMPILATION TESTS
// ============================================

describe('Type Compilation Verification', () => {
  test('DecisionGameState type is usable', () => {
    const state: DecisionGameState = {
      inning: 5,
      halfInning: 'BOTTOM',
      outs: 2,
      runners: { first: true, second: false, third: false },
      homeScore: 2,
      awayScore: 3,
    };

    expect(state.inning).toBe(5);
  });

  test('ManagerDecision type is usable', () => {
    const decision: ManagerDecision = {
      decisionId: 'test-id',
      gameId: 'game-1',
      managerId: 'manager-1',
      inning: 7,
      halfInning: 'TOP',
      decisionType: 'pitching_change',
      leverageIndex: 2.5,
      gameState: {
        inning: 7,
        halfInning: 'TOP',
        outs: 1,
        runners: { first: true, second: true, third: false },
        homeScore: 3,
        awayScore: 4,
      },
      inferenceMethod: 'auto',
      resolved: true,
      outcome: 'success',
      clutchImpact: 0.63,
      involvedPlayers: ['pitcher-1', 'pitcher-2'],
    };

    expect(decision.decisionId).toBe('test-id');
  });

  test('DecisionCounts type is usable', () => {
    const counts: DecisionCounts = {
      total: 50,
      successes: 30,
      failures: 15,
      neutral: 5,
    };

    expect(counts.total).toBe(50);
  });

  test('MWARResult type is usable', () => {
    const result: MWARResult = {
      mWAR: 2.5,
      decisionWAR: 1.5,
      overperformanceWAR: 1.0,
      decisionCount: 50,
      successRate: 0.60,
      teamRecord: '35-15',
      expectedWins: 25,
      actualWins: 35,
      overperformanceWins: 10,
      rating: 'Excellent',
    };

    expect(result.mWAR).toBe(2.5);
  });

  test('ManagerProfile type is usable', () => {
    const profile: ManagerProfile = {
      id: 'manager-1',
      name: 'Test Manager',
      teamId: 'team-1',
      careerRecord: { wins: 500, losses: 400 },
      careerMWAR: 15.5,
      seasonsManaged: 10,
    };

    expect(profile.careerMWAR).toBe(15.5);
  });
});
