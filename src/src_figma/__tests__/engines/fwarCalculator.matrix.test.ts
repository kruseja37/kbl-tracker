/**
 * fWAR Calculator — Boundary-Value Matrix Tests
 *
 * 12 golden cases: zero events, single putout, single error,
 * web gem, robbed HR, full season, different positions, NaN
 */
import { describe, it, expect } from 'vitest';
import {
  calculatePutoutValue,
  calculateAssistValue,
  calculateErrorValue,
  calculateEventValue,
  calculateGameFWAR,
  calculateSeasonFWAR,
  calculateFWARFromStats,
  getRunsPerWin,
  FIELDING_RUN_VALUES,
  DIFFICULTY_MULTIPLIERS,
} from '../../../engines/fwarCalculator';

type FieldingEvent = Parameters<typeof calculateEventValue>[0];

function makeEvent(overrides: Partial<FieldingEvent> = {}): FieldingEvent {
  return {
    gameId: 'test-game',
    playerId: 'p1',
    position: 'SS' as any,
    eventType: 'putout' as any,
    putoutType: 'infield' as any,
    difficulty: 'routine' as any,
    inning: 1,
    outs: 0,
    ...overrides,
  } as FieldingEvent;
}

describe('fWAR Calculator — Boundary-Value Matrix', () => {
  // ─── Case 1: Zero events ─────────────────────────
  it('FW-01: 0 fielding events → fWAR = 0 or small positional adj', () => {
    const result = calculateSeasonFWAR([], 'SS' as any, 50, 50);
    expect(Number.isFinite(result.fWAR)).toBe(true);
    // May include positional adjustment even with 0 events
    expect(Math.abs(result.fWAR)).toBeLessThan(2);
  });

  // ─── Case 2: Single routine putout ────────────────
  it('FW-02: Single routine putout → tiny positive value', () => {
    const val = calculatePutoutValue('infield' as any, 'SS' as any, 'routine' as any);
    expect(Number.isFinite(val)).toBe(true);
    expect(val).toBeGreaterThan(0);
  });

  // ─── Case 3: Single infield assist ────────────────
  it('FW-03: Single infield assist → positive value', () => {
    const val = calculateAssistValue('infield' as any, 'SS' as any);
    expect(Number.isFinite(val)).toBe(true);
    expect(val).toBeGreaterThan(0);
  });

  // ─── Case 4: Single fielding error ───────────────
  it('FW-04: Fielding error → negative value', () => {
    const val = calculateErrorValue('fielding' as any, 'SS' as any);
    expect(Number.isFinite(val)).toBe(true);
    expect(val).toBeLessThan(0);
  });

  // ─── Case 5: Mental error (worst) ────────────────
  it('FW-05: Mental error → more negative than fielding error', () => {
    const fieldingErr = calculateErrorValue('fielding' as any, 'SS' as any);
    const mentalErr = calculateErrorValue('mental' as any, 'SS' as any);
    expect(Number.isFinite(mentalErr)).toBe(true);
    expect(mentalErr).toBeLessThan(fieldingErr);
  });

  // ─── Case 6: Difficulty multipliers ──────────────
  it('FW-06: Diving catch > routine putout', () => {
    const routine = calculatePutoutValue('outfield' as any, 'CF' as any, 'routine');
    const diving = calculatePutoutValue('outfield' as any, 'CF' as any, 'diving');
    expect(diving).toBeGreaterThan(routine);
  });

  // ─── Case 7: Robbed HR (highest difficulty) ──────
  it('FW-07: Robbed HR → highest value play', () => {
    const robbed = calculatePutoutValue('outfield' as any, 'RF' as any, 'robbedHR');
    const wall = calculatePutoutValue('outfield' as any, 'RF' as any, 'wall');
    expect(robbed).toBeGreaterThan(wall);
  });

  // ─── Case 8: calculateFWARFromStats typical ──────
  it('FW-08: Typical Gold Glove SS stats → positive fWAR', () => {
    const stats = { putouts: 150, assists: 300, errors: 5, doublePlays: 50 };
    const result = calculateFWARFromStats(stats, 'SS' as any, 50, 50);
    expect(Number.isFinite(result.fWAR)).toBe(true);
    expect(result.fWAR).toBeGreaterThan(0);
  });

  // ─── Case 9: DH (no fielding) ────────────────────
  it('FW-09: DH position → fWAR ≤ 0 (negative positional adj)', () => {
    const stats = { putouts: 0, assists: 0, errors: 0, doublePlays: 0 };
    const result = calculateFWARFromStats(stats, 'DH' as any, 50, 50);
    expect(Number.isFinite(result.fWAR)).toBe(true);
    // DH gets negative positional adjustment
    expect(result.fWAR).toBeLessThanOrEqual(0);
  });

  // ─── Case 10: Error-heavy fielder ────────────────
  it('FW-10: Many errors → negative fWAR', () => {
    const stats = { putouts: 20, assists: 10, errors: 30, doublePlays: 0 };
    const result = calculateFWARFromStats(stats, '3B' as any, 50, 50);
    expect(Number.isFinite(result.fWAR)).toBe(true);
    expect(result.fWAR).toBeLessThan(0);
  });

  // ─── Case 11: Runs per win consistency ───────────
  it('FW-11: fWAR runsPerWin matches bWAR formula', () => {
    const rpw = getRunsPerWin(50);
    expect(rpw).toBeCloseTo(10 * (50 / 162), 2);
  });

  // ─── Case 12: Constants sanity check ─────────────
  it('FW-12: FIELDING_RUN_VALUES and DIFFICULTY_MULTIPLIERS are sane', () => {
    expect(FIELDING_RUN_VALUES).toBeDefined();
    expect(DIFFICULTY_MULTIPLIERS).toBeDefined();
    // Routine should be 1.0
    expect(DIFFICULTY_MULTIPLIERS.routine).toBe(1.0);
    // Robbed HR should be highest
    expect(DIFFICULTY_MULTIPLIERS.robbedHR).toBeGreaterThan(DIFFICULTY_MULTIPLIERS.diving);
  });
});
