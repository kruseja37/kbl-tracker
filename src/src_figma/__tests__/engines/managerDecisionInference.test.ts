/**
 * Manager Decision Inference Tests
 * Phase B - Tier 2.1 (GAP-B3-005)
 *
 * Tests auto-detection of manager decisions from game state changes.
 */

import { describe, test, expect } from 'vitest';
import {
  inferManagerDecision,
  PROMPT_DECISIONS,
  AUTO_DECISIONS,
  type ManagerDecisionType,
  type InferenceMethod,
} from '../../../engines/clutchCalculator';

// ============================================
// inferManagerDecision
// ============================================

describe('inferManagerDecision (GAP-B3-005)', () => {
  test('detects pitching change', () => {
    const result = inferManagerDecision({
      pitcherChanged: true,
      involvedPlayers: ['pitcher-old', 'pitcher-new'],
    });
    expect(result).not.toBeNull();
    expect(result!.type).toBe('pitching_change');
    expect(result!.inferenceMethod).toBe('auto');
    expect(result!.confidence).toBe(1.0);
  });

  test('detects pinch hitter', () => {
    const result = inferManagerDecision({
      pinchHitterUsed: true,
      involvedPlayers: ['bench-player'],
    });
    expect(result!.type).toBe('pinch_hitter');
    expect(result!.inferenceMethod).toBe('auto');
  });

  test('detects pinch runner', () => {
    const result = inferManagerDecision({
      pinchRunnerUsed: true,
      involvedPlayers: ['bench-runner'],
    });
    expect(result!.type).toBe('pinch_runner');
  });

  test('detects defensive sub', () => {
    const result = inferManagerDecision({
      defensiveSubMade: true,
      involvedPlayers: ['new-fielder'],
    });
    expect(result!.type).toBe('defensive_sub');
  });

  test('detects IBB', () => {
    const result = inferManagerDecision({
      ibbIssued: true,
      involvedPlayers: ['walked-batter'],
    });
    expect(result!.type).toBe('ibb');
  });

  test('returns null when no decision detected', () => {
    const result = inferManagerDecision({});
    expect(result).toBeNull();
  });

  test('pitching change takes priority over other decisions', () => {
    const result = inferManagerDecision({
      pitcherChanged: true,
      pinchHitterUsed: true,
      involvedPlayers: ['p1', 'p2'],
    });
    expect(result!.type).toBe('pitching_change');
  });

  test('involvedPlayers defaults to empty array', () => {
    const result = inferManagerDecision({ ibbIssued: true });
    expect(result!.involvedPlayers).toEqual([]);
  });
});

// ============================================
// Decision type lists
// ============================================

describe('Decision type classification', () => {
  test('AUTO_DECISIONS has 5 types', () => {
    expect(AUTO_DECISIONS).toHaveLength(5);
    expect(AUTO_DECISIONS).toContain('pitching_change');
    expect(AUTO_DECISIONS).toContain('pinch_hitter');
    expect(AUTO_DECISIONS).toContain('pinch_runner');
    expect(AUTO_DECISIONS).toContain('defensive_sub');
    expect(AUTO_DECISIONS).toContain('ibb');
  });

  test('PROMPT_DECISIONS has 4 types', () => {
    expect(PROMPT_DECISIONS).toHaveLength(4);
    expect(PROMPT_DECISIONS).toContain('steal_call');
    expect(PROMPT_DECISIONS).toContain('bunt_call');
    expect(PROMPT_DECISIONS).toContain('squeeze_call');
    expect(PROMPT_DECISIONS).toContain('hit_and_run');
  });

  test('no overlap between AUTO and PROMPT decisions', () => {
    const overlap = AUTO_DECISIONS.filter(d => PROMPT_DECISIONS.includes(d));
    expect(overlap).toHaveLength(0);
  });
});
