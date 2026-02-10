/**
 * mWAR Calculator — Boundary-Value Matrix Tests
 *
 * 12 golden cases: zero decisions, single good decision, single bad decision,
 * full season, overperformance, underperformance, NaN
 */
import { describe, it, expect } from 'vitest';
import {
  createManagerDecision,
  resolveDecision,
  getDecisionBaseValue,
  calculateDecisionWAR,
  calculateSeasonMWAR,
  calculateOverperformance,
  calculateTeamSalaryScore,
  getExpectedWinPct,
  getMWARRating,
  MWAR_WEIGHTS,
} from '../../../engines/mwarCalculator';

describe('mWAR Calculator — Boundary-Value Matrix', () => {
  // ─── Case 1: Zero decisions ──────────────────────
  it('MW-01: 0 decisions → mWAR = 0 for decision component', () => {
    const decWAR = calculateDecisionWAR([], 3.09);
    expect(Number.isFinite(decWAR)).toBe(true);
    expect(decWAR).toBe(0);
  });

  // ─── Case 2: Single good pitching change ─────────
  it('MW-02: Successful pitching change → positive value', () => {
    const val = getDecisionBaseValue('pitching_change' as any, 'success' as any);
    expect(Number.isFinite(val)).toBe(true);
    expect(val).toBeGreaterThan(0);
  });

  // ─── Case 3: Single bad pitching change ──────────
  it('MW-03: Bad pitching change → negative value', () => {
    const val = getDecisionBaseValue('pitching_change' as any, 'failure' as any);
    expect(Number.isFinite(val)).toBe(true);
    expect(val).toBeLessThan(0);
  });

  // ─── Case 4: Neutral decision ────────────────────
  it('MW-04: Neutral decision → near-zero value', () => {
    const val = getDecisionBaseValue('pitching_change' as any, 'neutral' as any);
    expect(Number.isFinite(val)).toBe(true);
    expect(Math.abs(val)).toBeLessThan(0.5);
  });

  // ─── Case 5: Team overperformance ────────────────
  it('MW-05: Team that overperforms → positive overperformance', () => {
    const result = calculateOverperformance(30, 20, 0.5, 50);
    expect(Number.isFinite(result.overperformance)).toBe(true);
    expect(result.overperformance).toBeGreaterThan(0);
    // 30-20 = .600 win%, salary score 0.5 → expected wins ~.500
    expect(result.actualWinPct).toBe(0.6);
  });

  // ─── Case 6: Team underperformance ───────────────
  it('MW-06: Team that underperforms → negative overperformance', () => {
    const result = calculateOverperformance(20, 30, 0.7, 50);
    expect(Number.isFinite(result.overperformance)).toBe(true);
    expect(result.overperformance).toBeLessThan(0);
    expect(result.actualWinPct).toBe(0.4);
  });

  // ─── Case 7: Perfect record team ─────────────────
  it('MW-07: 50-0 team → high overperformance', () => {
    const result = calculateOverperformance(50, 0, 0.5, 50);
    expect(Number.isFinite(result.overperformance)).toBe(true);
    expect(result.overperformance).toBeGreaterThan(0);
    expect(result.actualWinPct).toBe(1.0);
  });

  // ─── Case 8: Salary score extremes ───────────────
  it('MW-08: Salary score calculation', () => {
    const lowScore = calculateTeamSalaryScore(100, 200, 400);
    const highScore = calculateTeamSalaryScore(400, 200, 400);

    expect(Number.isFinite(lowScore)).toBe(true);
    expect(Number.isFinite(highScore)).toBe(true);
    // Higher salary → higher score
    expect(highScore).toBeGreaterThan(lowScore);
  });

  // ─── Case 9: Expected win pct from salary ────────
  it('MW-09: Expected win pct scales with salary score', () => {
    const lowExpected = getExpectedWinPct(0.2);
    const midExpected = getExpectedWinPct(0.5);
    const highExpected = getExpectedWinPct(0.8);

    expect(Number.isFinite(lowExpected)).toBe(true);
    expect(Number.isFinite(midExpected)).toBe(true);
    expect(Number.isFinite(highExpected)).toBe(true);
    expect(highExpected).toBeGreaterThan(lowExpected);
  });

  // ─── Case 10: Full season mWAR ──────────────────
  it('MW-10: Season mWAR with mixed decisions', () => {
    // Create a set of resolved decisions
    // gameState requires: inning, halfInning, outs, runners: {first,second,third}, homeScore, awayScore
    const decisions = [];
    for (let i = 0; i < 20; i++) {
      const dec = createManagerDecision(
        `game-${i}`, 'mgr-1', 'pitching_change' as any,
        {
          inning: 6,
          halfInning: 'BOTTOM' as const,
          outs: 1 as const,
          runners: { first: false, second: false, third: false },
          homeScore: 3,
          awayScore: 2,
        },
      );
      const resolved = resolveDecision(dec, i % 3 === 0 ? 'failure' as any : 'success' as any);
      decisions.push(resolved);
    }

    const result = calculateSeasonMWAR(
      decisions,
      { wins: 28, losses: 22, salaryScore: 0.5 },
      50,
    );
    expect(Number.isFinite(result.mWAR)).toBe(true);
  });

  // ─── Case 11: MWAR weights sum check ─────────────
  it('MW-11: MWAR_WEIGHTS sum to 1.0', () => {
    const sum = MWAR_WEIGHTS.decision + MWAR_WEIGHTS.overperformance;
    expect(sum).toBeCloseTo(1.0, 5);
  });

  // ─── Case 12: Rating tiers ───────────────────────
  it('MW-12: Rating tiers are ordered', () => {
    const excellent = getMWARRating(2.0);
    const average = getMWARRating(0.0);
    const poor = getMWARRating(-1.0);

    expect(typeof excellent).toBe('string');
    expect(typeof average).toBe('string');
    expect(typeof poor).toBe('string');
    // Different ratings for different mWAR values
    expect(excellent).not.toBe(poor);
  });
});
