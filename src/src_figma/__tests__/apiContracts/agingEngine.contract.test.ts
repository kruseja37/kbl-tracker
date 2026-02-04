/**
 * Aging Engine API Contract Tests
 * Phase 5.5 - Prevent API Hallucination Bugs
 *
 * These tests verify that:
 * 1. Function signatures match expected types
 * 2. Return types have expected properties
 * 3. Integration wrappers can call the engine correctly
 *
 * Per TESTING_IMPLEMENTATION_PLAN.md Section 5.5:
 * Root cause of build failures was AI-generated integration files
 * that hallucinated different API signatures.
 */

import { describe, test, expect } from 'vitest';
import {
  // Main function under contract
  processEndOfSeasonAging,

  // Types that must exist
  type AgingResult,
  type CareerPhase,

  // Supporting functions
  getCareerPhase,
  calculateRetirementProbability,
  getCareerPhaseDisplayName,
  getCareerPhaseColor,
} from '../../../engines/agingEngine';

// ============================================
// FUNCTION SIGNATURE CONTRACTS
// ============================================

describe('Aging Engine API Contract', () => {
  describe('processEndOfSeasonAging Signature', () => {
    test('accepts (age: number, ratings: Record<string, number>)', () => {
      const result = processEndOfSeasonAging(
        25, // age: number
        { power: 80, contact: 75, speed: 70 } // ratings: Record<string, number>
      );

      expect(result).toBeDefined();
      expect(typeof result).toBe('object');
    });

    test('accepts optional fame parameter (number)', () => {
      const result = processEndOfSeasonAging(
        28,
        { power: 80, contact: 75 },
        50 // fame?: number
      );

      expect(result).toBeDefined();
    });

    test('accepts optional performanceModifier parameter (number)', () => {
      const result = processEndOfSeasonAging(
        30,
        { power: 80, contact: 75 },
        50, // fame
        0.1 // performanceModifier?: number
      );

      expect(result).toBeDefined();
    });

    test('handles negative performanceModifier (poor season)', () => {
      const result = processEndOfSeasonAging(
        30,
        { power: 80, contact: 75 },
        50,
        -0.2 // Poor performance
      );

      expect(result).toBeDefined();
    });
  });

  // ============================================
  // RETURN TYPE CONTRACT
  // ============================================

  describe('AgingResult Return Type Contract', () => {
    const result = processEndOfSeasonAging(
      28,
      { power: 80, contact: 75, speed: 70, fielding: 65, arm: 60 },
      50,
      0
    );

    test('has newAge property (number)', () => {
      expect(result).toHaveProperty('newAge');
      expect(typeof result.newAge).toBe('number');
    });

    test('has ratingChanges property (array)', () => {
      expect(result).toHaveProperty('ratingChanges');
      expect(Array.isArray(result.ratingChanges)).toBe(true);
    });

    test('ratingChanges items have { attribute: string, change: number }', () => {
      // May be empty array for young players in prime
      if (result.ratingChanges.length > 0) {
        const firstChange = result.ratingChanges[0];
        expect(firstChange).toHaveProperty('attribute');
        expect(firstChange).toHaveProperty('change');
        expect(typeof firstChange.attribute).toBe('string');
        expect(typeof firstChange.change).toBe('number');
      }
    });

    test('has shouldRetire property (boolean)', () => {
      expect(result).toHaveProperty('shouldRetire');
      expect(typeof result.shouldRetire).toBe('boolean');
    });

    test('has retirementProbability property (number)', () => {
      expect(result).toHaveProperty('retirementProbability');
      expect(typeof result.retirementProbability).toBe('number');
      expect(result.retirementProbability).toBeGreaterThanOrEqual(0);
      expect(result.retirementProbability).toBeLessThanOrEqual(1);
    });

    test('has phase property (CareerPhase)', () => {
      expect(result).toHaveProperty('phase');
      expect(typeof result.phase).toBe('string');
      // Valid CareerPhase values
      const validPhases = ['DEVELOPMENT', 'PRIME', 'DECLINE', 'FORCED_RETIREMENT'];
      expect(validPhases).toContain(result.phase);
    });
  });

  // ============================================
  // SEMANTIC CONTRACT - newAge increment
  // ============================================

  describe('Semantic Contract - Age Increment', () => {
    test('newAge is exactly currentAge + 1', () => {
      const ages = [20, 25, 30, 35, 40];

      for (const age of ages) {
        const result = processEndOfSeasonAging(age, { power: 80 });
        expect(result.newAge).toBe(age + 1);
      }
    });
  });

  // ============================================
  // CAREER PHASE CONTRACT
  // ============================================

  describe('CareerPhase Values Contract', () => {
    // Per agingEngine.ts: DEVELOPMENT_END=24, PRIME_END=32, MAX_AGE=49
    // Phase is calculated on newAge (currentAge + 1)

    test('DEVELOPMENT phase for young players (newAge <= 24)', () => {
      // Age 22 → newAge 23 → DEVELOPMENT
      const result = processEndOfSeasonAging(22, { power: 80 });
      expect(result.phase).toBe('DEVELOPMENT');
    });

    test('PRIME phase for peak players (newAge 25-32)', () => {
      // Age 28 → newAge 29 → PRIME
      const result = processEndOfSeasonAging(28, { power: 80 });
      expect(result.phase).toBe('PRIME');
    });

    test('DECLINE phase for aging players (newAge 33-48)', () => {
      // Age 34 → newAge 35 → DECLINE
      const result = processEndOfSeasonAging(34, { power: 80 });
      expect(result.phase).toBe('DECLINE');
    });

    test('FORCED_RETIREMENT phase for very old players (newAge >= 49)', () => {
      // Age 48 → newAge 49 → FORCED_RETIREMENT
      const result = processEndOfSeasonAging(48, { power: 80 });
      expect(result.phase).toBe('FORCED_RETIREMENT');
    });
  });

  // ============================================
  // SUPPORTING FUNCTION CONTRACTS
  // ============================================

  describe('getCareerPhase Function Contract', () => {
    test('accepts age parameter (number)', () => {
      const phase = getCareerPhase(28);
      expect(typeof phase).toBe('string');
    });

    test('returns valid CareerPhase', () => {
      const validPhases = ['DEVELOPMENT', 'PRIME', 'DECLINE', 'FORCED_RETIREMENT'];
      const phase = getCareerPhase(30);
      expect(validPhases).toContain(phase);
    });
  });

  describe('calculateRetirementProbability Function Contract', () => {
    test('accepts (age, overallRating, fame) parameters', () => {
      const prob = calculateRetirementProbability(35, 75, 50);
      expect(typeof prob).toBe('number');
      expect(prob).toBeGreaterThanOrEqual(0);
      expect(prob).toBeLessThanOrEqual(1);
    });

    test('higher age = higher retirement probability', () => {
      const young = calculateRetirementProbability(28, 75, 50);
      const old = calculateRetirementProbability(38, 75, 50);

      expect(old).toBeGreaterThan(young);
    });

    test('higher fame = lower retirement probability', () => {
      const lowFame = calculateRetirementProbability(35, 75, 10);
      const highFame = calculateRetirementProbability(35, 75, 90);

      expect(highFame).toBeLessThan(lowFame);
    });
  });

  describe('getCareerPhaseDisplayName Function Contract', () => {
    test('accepts CareerPhase parameter', () => {
      const name = getCareerPhaseDisplayName('PRIME');
      expect(typeof name).toBe('string');
    });

    test('returns display names for all phases', () => {
      expect(getCareerPhaseDisplayName('DEVELOPMENT')).toBe('Development');
      expect(getCareerPhaseDisplayName('PRIME')).toBe('Prime Years');
      expect(getCareerPhaseDisplayName('DECLINE')).toBe('Declining');
      expect(getCareerPhaseDisplayName('FORCED_RETIREMENT')).toBe('Must Retire');
    });
  });

  describe('getCareerPhaseColor Function Contract', () => {
    test('accepts CareerPhase parameter', () => {
      const color = getCareerPhaseColor('PRIME');
      expect(typeof color).toBe('string');
    });

    test('returns hex color strings', () => {
      const color = getCareerPhaseColor('PRIME');
      expect(color).toMatch(/^#[0-9a-fA-F]{6}$/);
    });
  });
});

// ============================================
// TYPE COMPILATION TESTS
// ============================================

describe('Type Compilation Verification', () => {
  test('AgingResult type is usable', () => {
    // This test verifies the type exists and has expected shape
    const testResult: AgingResult = {
      newAge: 29,
      ratingChanges: [{ attribute: 'power', change: -2 }],
      shouldRetire: false,
      retirementProbability: 0.05,
      phase: 'PRIME',
    };

    expect(testResult.newAge).toBe(29);
    expect(testResult.shouldRetire).toBe(false);
  });

  test('CareerPhase type accepts valid values', () => {
    // TypeScript will catch invalid values at compile time
    const phases: CareerPhase[] = [
      'DEVELOPMENT',
      'PRIME',
      'DECLINE',
      'FORCED_RETIREMENT',
    ];

    expect(phases).toHaveLength(4);
  });
});
