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
  // Types that must exist
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
  // ============================================
  // CAREER PHASE CONTRACT
  // ============================================

  describe('CareerPhase Values Contract', () => {
    test('DEVELOPMENT phase for young players (age <= 24)', () => {
      expect(getCareerPhase(23)).toBe('DEVELOPMENT');
    });

    test('PRIME phase for peak players (age 25-32)', () => {
      expect(getCareerPhase(29)).toBe('PRIME');
    });

    test('DECLINE phase for aging players (age 33-48)', () => {
      expect(getCareerPhase(35)).toBe('DECLINE');
    });

    test('FORCED_RETIREMENT phase for very old players (age >= 49)', () => {
      expect(getCareerPhase(49)).toBe('FORCED_RETIREMENT');
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
