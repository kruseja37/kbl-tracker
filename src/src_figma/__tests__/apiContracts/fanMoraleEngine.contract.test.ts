/**
 * Fan Morale Engine API Contract Tests
 * Phase 5.5 - Prevent API Hallucination Bugs
 *
 * Per TESTING_IMPLEMENTATION_PLAN.md Section 5.5:
 * AI-generated fanMoraleIntegration.ts had wrong FanState enum values
 * (ELECTRIC→EUPHORIC, etc.). These tests verify correct values.
 */

import { describe, test, expect } from 'vitest';
import {
  // FanState type
  type FanState,
  type MoraleTrend,
  type RiskLevel,

  // Core functions
  getFanState,
  getRiskLevel,
  calculateTrend,

  // Constants
  FAN_STATE_THRESHOLDS,
  FAN_STATE_CONFIG,
  BASE_MORALE_IMPACTS,
} from '../../../engines/fanMoraleEngine';

// ============================================
// FAN STATE VALUES CONTRACT
// ============================================

describe('FanState Enum Values Contract', () => {
  describe('Required FanState Values', () => {
    test('EUPHORIC exists (90-99)', () => {
      expect(FAN_STATE_THRESHOLDS.EUPHORIC).toBeDefined();
      expect(FAN_STATE_THRESHOLDS.EUPHORIC).toEqual([90, 99]);
    });

    test('EXCITED exists (75-89)', () => {
      expect(FAN_STATE_THRESHOLDS.EXCITED).toBeDefined();
      expect(FAN_STATE_THRESHOLDS.EXCITED).toEqual([75, 89]);
    });

    test('CONTENT exists (55-74)', () => {
      expect(FAN_STATE_THRESHOLDS.CONTENT).toBeDefined();
      expect(FAN_STATE_THRESHOLDS.CONTENT).toEqual([55, 74]);
    });

    test('RESTLESS exists (40-54)', () => {
      expect(FAN_STATE_THRESHOLDS.RESTLESS).toBeDefined();
      expect(FAN_STATE_THRESHOLDS.RESTLESS).toEqual([40, 54]);
    });

    test('FRUSTRATED exists (25-39)', () => {
      expect(FAN_STATE_THRESHOLDS.FRUSTRATED).toBeDefined();
      expect(FAN_STATE_THRESHOLDS.FRUSTRATED).toEqual([25, 39]);
    });

    test('APATHETIC exists (10-24)', () => {
      expect(FAN_STATE_THRESHOLDS.APATHETIC).toBeDefined();
      expect(FAN_STATE_THRESHOLDS.APATHETIC).toEqual([10, 24]);
    });

    test('HOSTILE exists (0-9)', () => {
      expect(FAN_STATE_THRESHOLDS.HOSTILE).toBeDefined();
      expect(FAN_STATE_THRESHOLDS.HOSTILE).toEqual([0, 9]);
    });

    test('exactly 7 fan states exist', () => {
      expect(Object.keys(FAN_STATE_THRESHOLDS)).toHaveLength(7);
    });
  });

  describe('Invalid FanState Values DO NOT Exist', () => {
    test('ELECTRIC does NOT exist (was AI hallucination)', () => {
      expect((FAN_STATE_THRESHOLDS as Record<string, unknown>)['ELECTRIC']).toBeUndefined();
    });

    test('HYPED does NOT exist', () => {
      expect((FAN_STATE_THRESHOLDS as Record<string, unknown>)['HYPED']).toBeUndefined();
    });

    test('FURIOUS does NOT exist', () => {
      expect((FAN_STATE_THRESHOLDS as Record<string, unknown>)['FURIOUS']).toBeUndefined();
    });
  });
});

// ============================================
// GET FAN STATE FUNCTION CONTRACT
// ============================================

describe('getFanState Function Contract', () => {
  test('accepts morale parameter (number)', () => {
    const state = getFanState(75);
    expect(typeof state).toBe('string');
  });

  test('returns EUPHORIC for morale 90+', () => {
    expect(getFanState(90)).toBe('EUPHORIC');
    expect(getFanState(99)).toBe('EUPHORIC');
  });

  test('returns EXCITED for morale 75-89', () => {
    expect(getFanState(75)).toBe('EXCITED');
    expect(getFanState(89)).toBe('EXCITED');
  });

  test('returns CONTENT for morale 55-74', () => {
    expect(getFanState(55)).toBe('CONTENT');
    expect(getFanState(74)).toBe('CONTENT');
  });

  test('returns RESTLESS for morale 40-54', () => {
    expect(getFanState(40)).toBe('RESTLESS');
    expect(getFanState(54)).toBe('RESTLESS');
  });

  test('returns FRUSTRATED for morale 25-39', () => {
    expect(getFanState(25)).toBe('FRUSTRATED');
    expect(getFanState(39)).toBe('FRUSTRATED');
  });

  test('returns APATHETIC for morale 10-24', () => {
    expect(getFanState(10)).toBe('APATHETIC');
    expect(getFanState(24)).toBe('APATHETIC');
  });

  test('returns HOSTILE for morale 0-9', () => {
    expect(getFanState(0)).toBe('HOSTILE');
    expect(getFanState(9)).toBe('HOSTILE');
  });

  test('returns valid FanState for all valid morale values', () => {
    const validStates: FanState[] = [
      'EUPHORIC', 'EXCITED', 'CONTENT', 'RESTLESS',
      'FRUSTRATED', 'APATHETIC', 'HOSTILE'
    ];

    for (let morale = 0; morale <= 100; morale += 10) {
      const state = getFanState(morale);
      expect(validStates).toContain(state);
    }
  });
});

// ============================================
// RISK LEVEL CONTRACT
// ============================================

describe('getRiskLevel Function Contract', () => {
  test('accepts morale parameter (number)', () => {
    const risk = getRiskLevel(50);
    expect(typeof risk).toBe('string');
  });

  test('returns SAFE for morale 40+', () => {
    expect(getRiskLevel(50)).toBe('SAFE');
    expect(getRiskLevel(100)).toBe('SAFE');
  });

  test('returns WATCH for morale 25-39', () => {
    expect(getRiskLevel(30)).toBe('WATCH');
  });

  test('returns DANGER for morale 10-24', () => {
    expect(getRiskLevel(15)).toBe('DANGER');
  });

  test('returns CRITICAL for morale 0-9', () => {
    expect(getRiskLevel(5)).toBe('CRITICAL');
  });

  test('returns valid RiskLevel type', () => {
    const validRisks: RiskLevel[] = ['SAFE', 'WATCH', 'DANGER', 'CRITICAL'];
    const risk = getRiskLevel(50);
    expect(validRisks).toContain(risk);
  });
});

// ============================================
// MORALE TREND CONTRACT
// ============================================

describe('calculateTrend Function Contract', () => {
  test('accepts (oldMorale, newMorale, previousTrend, previousStreak) parameters', () => {
    const result = calculateTrend(50, 55, 'STABLE', 0);
    expect(typeof result).toBe('object');
    expect(result).toHaveProperty('trend');
    expect(result).toHaveProperty('streak');
  });

  test('returns RISING when morale increased', () => {
    const result = calculateTrend(50, 60, 'STABLE', 0);
    expect(result.trend).toBe('RISING');
  });

  test('returns FALLING when morale decreased', () => {
    const result = calculateTrend(50, 40, 'STABLE', 0);
    expect(result.trend).toBe('FALLING');
  });

  test('returns STABLE when morale unchanged', () => {
    const result = calculateTrend(50, 50, 'STABLE', 0);
    expect(result.trend).toBe('STABLE');
  });

  test('returns valid MoraleTrend type', () => {
    const validTrends: MoraleTrend[] = ['RISING', 'STABLE', 'FALLING'];
    const result = calculateTrend(50, 55, 'STABLE', 0);
    expect(validTrends).toContain(result.trend);
  });
});

// ============================================
// FAN STATE CONFIG CONTRACT
// ============================================

describe('FAN_STATE_CONFIG Contract', () => {
  test('each state has emoji property', () => {
    const states: FanState[] = [
      'EUPHORIC', 'EXCITED', 'CONTENT', 'RESTLESS',
      'FRUSTRATED', 'APATHETIC', 'HOSTILE'
    ];

    for (const state of states) {
      expect(FAN_STATE_CONFIG[state]).toHaveProperty('emoji');
      expect(typeof FAN_STATE_CONFIG[state].emoji).toBe('string');
    }
  });

  test('each state has color property', () => {
    const states: FanState[] = [
      'EUPHORIC', 'EXCITED', 'CONTENT', 'RESTLESS',
      'FRUSTRATED', 'APATHETIC', 'HOSTILE'
    ];

    for (const state of states) {
      expect(FAN_STATE_CONFIG[state]).toHaveProperty('color');
      expect(FAN_STATE_CONFIG[state].color).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });

  test('each state has label property', () => {
    const states: FanState[] = [
      'EUPHORIC', 'EXCITED', 'CONTENT', 'RESTLESS',
      'FRUSTRATED', 'APATHETIC', 'HOSTILE'
    ];

    for (const state of states) {
      expect(FAN_STATE_CONFIG[state]).toHaveProperty('label');
      expect(typeof FAN_STATE_CONFIG[state].label).toBe('string');
    }
  });

  test('each state has description property', () => {
    const states: FanState[] = [
      'EUPHORIC', 'EXCITED', 'CONTENT', 'RESTLESS',
      'FRUSTRATED', 'APATHETIC', 'HOSTILE'
    ];

    for (const state of states) {
      expect(FAN_STATE_CONFIG[state]).toHaveProperty('description');
      expect(typeof FAN_STATE_CONFIG[state].description).toBe('string');
    }
  });
});

// ============================================
// BASE_MORALE_IMPACTS CONTRACT
// ============================================

describe('BASE_MORALE_IMPACTS Contract', () => {
  test('WIN impact exists and is positive', () => {
    expect(BASE_MORALE_IMPACTS.WIN).toBeDefined();
    expect(typeof BASE_MORALE_IMPACTS.WIN).toBe('number');
    expect(BASE_MORALE_IMPACTS.WIN).toBeGreaterThan(0);
  });

  test('LOSS impact exists and is negative', () => {
    expect(BASE_MORALE_IMPACTS.LOSS).toBeDefined();
    expect(typeof BASE_MORALE_IMPACTS.LOSS).toBe('number');
    expect(BASE_MORALE_IMPACTS.LOSS).toBeLessThan(0);
  });

  test('WALK_OFF_WIN impact exists', () => {
    expect(BASE_MORALE_IMPACTS.WALK_OFF_WIN).toBeDefined();
    expect(typeof BASE_MORALE_IMPACTS.WALK_OFF_WIN).toBe('number');
  });

  test('WALK_OFF_LOSS impact exists', () => {
    expect(BASE_MORALE_IMPACTS.WALK_OFF_LOSS).toBeDefined();
    expect(typeof BASE_MORALE_IMPACTS.WALK_OFF_LOSS).toBe('number');
  });

  test('WIN_STREAK_3 impact exists', () => {
    expect(BASE_MORALE_IMPACTS.WIN_STREAK_3).toBeDefined();
    expect(typeof BASE_MORALE_IMPACTS.WIN_STREAK_3).toBe('number');
  });

  test('LOSE_STREAK_3 impact exists and is negative', () => {
    expect(BASE_MORALE_IMPACTS.LOSE_STREAK_3).toBeDefined();
    expect(BASE_MORALE_IMPACTS.LOSE_STREAK_3).toBeLessThan(0);
  });
});

// ============================================
// TYPE COMPILATION TESTS
// ============================================

describe('Type Compilation Verification', () => {
  test('FanState type is usable', () => {
    const state: FanState = 'EUPHORIC';
    expect(state).toBe('EUPHORIC');

    const allStates: FanState[] = [
      'EUPHORIC', 'EXCITED', 'CONTENT', 'RESTLESS',
      'FRUSTRATED', 'APATHETIC', 'HOSTILE'
    ];
    expect(allStates).toHaveLength(7);
  });

  test('MoraleTrend type is usable', () => {
    const trends: MoraleTrend[] = ['RISING', 'STABLE', 'FALLING'];
    expect(trends).toHaveLength(3);
  });

  test('RiskLevel type is usable', () => {
    const risks: RiskLevel[] = ['SAFE', 'WATCH', 'DANGER', 'CRITICAL'];
    expect(risks).toHaveLength(4);
  });
});
