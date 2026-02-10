/**
 * Tiered Pinch Hitter Failure Values Tests
 * Phase B - Tier 1.3 (MIN-B1-007)
 *
 * Tests tiered PH failure valuation per MWAR spec §5.
 */

import { describe, test, expect } from 'vitest';
import {
  classifyPHFailure,
  calculatePHFailureValue,
  evaluatePinchHitter,
  getDecisionBaseValue,
  calculateDecisionClutchImpact,
  PH_FAILURE_VALUES,
  type ManagerDecision,
} from '../../../engines/mwarCalculator';

// ============================================
// PH_FAILURE_VALUES constants
// ============================================

describe('PH_FAILURE_VALUES (MIN-B1-007)', () => {
  test('severe failure is -0.5', () => {
    expect(PH_FAILURE_VALUES.severe).toBe(-0.5);
  });

  test('mild failure is -0.3', () => {
    expect(PH_FAILURE_VALUES.mild).toBe(-0.3);
  });
});

// ============================================
// classifyPHFailure
// ============================================

describe('classifyPHFailure', () => {
  test('K is severe', () => {
    expect(classifyPHFailure('K')).toBe('severe');
  });

  test('strikeout is severe', () => {
    expect(classifyPHFailure('strikeout')).toBe('severe');
  });

  test('strikeout_swinging is severe', () => {
    expect(classifyPHFailure('strikeout_swinging')).toBe('severe');
  });

  test('strikeout_looking is severe', () => {
    expect(classifyPHFailure('strikeout_looking')).toBe('severe');
  });

  test('GIDP is severe', () => {
    expect(classifyPHFailure('GIDP')).toBe('severe');
  });

  test('groundOut is mild', () => {
    expect(classifyPHFailure('groundOut')).toBe('mild');
  });

  test('flyOut is mild', () => {
    expect(classifyPHFailure('flyOut')).toBe('mild');
  });

  test('lineOut is mild', () => {
    expect(classifyPHFailure('lineOut')).toBe('mild');
  });

  test('popOut is mild', () => {
    expect(classifyPHFailure('popOut')).toBe('mild');
  });
});

// ============================================
// calculatePHFailureValue
// ============================================

describe('calculatePHFailureValue', () => {
  test('K at LI=1.0 gives -0.5', () => {
    expect(calculatePHFailureValue('K', 1.0)).toBeCloseTo(-0.5, 4);
  });

  test('groundOut at LI=1.0 gives -0.3', () => {
    expect(calculatePHFailureValue('groundOut', 1.0)).toBeCloseTo(-0.3, 4);
  });

  test('K at LI=4.0 gives -0.5 * sqrt(4) = -1.0', () => {
    expect(calculatePHFailureValue('K', 4.0)).toBeCloseTo(-1.0, 4);
  });

  test('groundOut at LI=4.0 gives -0.3 * sqrt(4) = -0.6', () => {
    expect(calculatePHFailureValue('groundOut', 4.0)).toBeCloseTo(-0.6, 4);
  });

  test('GIDP at LI=9.0 gives -0.5 * 3 = -1.5', () => {
    expect(calculatePHFailureValue('GIDP', 9.0)).toBeCloseTo(-1.5, 4);
  });
});

// ============================================
// evaluatePinchHitter
// ============================================

describe('evaluatePinchHitter', () => {
  const mockDecision = {
    decisionType: 'pinch_hitter',
    id: 'test',
    gameId: 'test',
    timestamp: Date.now(),
    inning: 7,
    gameContext: {
      inning: 7,
      halfInning: 'BOTTOM' as const,
      outs: 1 as const,
      runners: [],
      homeScore: 2,
      awayScore: 3,
    },
    inferenceMethod: 'auto' as const,
    resolved: false,
    outcome: 'neutral' as const,
    clutchImpact: 0,
    involvedPlayers: [],
  } satisfies ManagerDecision;

  test('hit returns success', () => {
    expect(evaluatePinchHitter(mockDecision, '1B')).toBe('success');
    expect(evaluatePinchHitter(mockDecision, 'HR')).toBe('success');
    expect(evaluatePinchHitter(mockDecision, 'BB')).toBe('success');
  });

  test('K returns failure', () => {
    expect(evaluatePinchHitter(mockDecision, 'K')).toBe('failure');
  });

  test('GIDP returns failure', () => {
    expect(evaluatePinchHitter(mockDecision, 'GIDP')).toBe('failure');
  });

  test('regular out returns failure', () => {
    expect(evaluatePinchHitter(mockDecision, 'groundOut')).toBe('failure');
  });
});

// ============================================
// getDecisionBaseValue with tiered PH
// ============================================

describe('getDecisionBaseValue — tiered PH failures', () => {
  test('PH failure with K atBatResult uses severe value (-0.5)', () => {
    const value = getDecisionBaseValue('pinch_hitter', 'failure', 'K');
    expect(value).toBe(-0.5);
  });

  test('PH failure with groundOut atBatResult uses mild value (-0.3)', () => {
    const value = getDecisionBaseValue('pinch_hitter', 'failure', 'groundOut');
    expect(value).toBe(-0.3);
  });

  test('PH failure without atBatResult uses flat value (-0.4)', () => {
    const value = getDecisionBaseValue('pinch_hitter', 'failure');
    expect(value).toBe(-0.4);
  });

  test('PH success ignores atBatResult', () => {
    const value = getDecisionBaseValue('pinch_hitter', 'success', 'HR');
    expect(value).toBe(0.5);
  });

  test('non-PH decision ignores atBatResult', () => {
    const value = getDecisionBaseValue('pitching_change', 'failure', 'K');
    expect(value).toBe(-0.3); // Uses flat DECISION_VALUES
  });
});

// ============================================
// calculateDecisionClutchImpact with tiered PH
// ============================================

describe('calculateDecisionClutchImpact — tiered PH', () => {
  test('PH K at LI=4 gives -0.5 * sqrt(4) = -1.0', () => {
    const impact = calculateDecisionClutchImpact('pinch_hitter', 'failure', 4.0, 'K');
    expect(impact).toBeCloseTo(-1.0, 4);
  });

  test('PH groundOut at LI=4 gives -0.3 * sqrt(4) = -0.6', () => {
    const impact = calculateDecisionClutchImpact('pinch_hitter', 'failure', 4.0, 'groundOut');
    expect(impact).toBeCloseTo(-0.6, 4);
  });

  test('PH failure without atBatResult uses flat -0.4', () => {
    const impact = calculateDecisionClutchImpact('pinch_hitter', 'failure', 4.0);
    expect(impact).toBeCloseTo(-0.8, 4); // -0.4 * 2
  });
});
