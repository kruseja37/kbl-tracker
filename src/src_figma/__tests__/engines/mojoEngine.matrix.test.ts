/**
 * Mojo Engine — Boundary-Value Matrix Tests
 *
 * 14 golden cases: all 5 mojo states, triggers, carryover,
 * stat multipliers, combined modifiers, edge cases
 */
import { describe, it, expect } from 'vitest';
import {
  getMojoState,
  getMojoDisplayName,
  getMojoStatMultiplier,
  applyMojoToStat,
  getMojoDelta,
  applyMojoChange,
  calculateStartingMojo,
  inferMojoTriggers,
  clampMojo,
  isValidMojoLevel,
  MOJO_STATES,
  MOJO_CARRYOVER_RATE,
} from '../../../engines/mojoEngine';

type MojoLevel = Parameters<typeof getMojoState>[0];

describe('Mojo Engine — Boundary-Value Matrix', () => {
  // ─── Case 1: All 5 mojo states ───────────────────
  it('MJ-01: 5 mojo states have correct multipliers', () => {
    const expected: [MojoLevel, number][] = [
      [-2, 0.82], // RATTLED
      [-1, 0.90], // TENSE
      [0, 1.00],  // NORMAL
      [1, 1.10],  // LOCKED IN
      [2, 1.18],  // JACKED
    ];

    for (const [level, mult] of expected) {
      const actual = getMojoStatMultiplier(level);
      expect(actual).toBeCloseTo(mult, 2);
    }
  });

  // ─── Case 2: Mojo state metadata ─────────────────
  it('MJ-02: Each mojo level has a name and state', () => {
    for (let level = -2; level <= 2; level++) {
      const state = getMojoState(level as MojoLevel);
      expect(state).toBeDefined();
      const name = getMojoDisplayName(level as MojoLevel);
      expect(typeof name).toBe('string');
      expect(name.length).toBeGreaterThan(0);
    }
  });

  // ─── Case 3: Apply mojo to stat ──────────────────
  it('MJ-03: applyMojoToStat scales correctly (rounds to int)', () => {
    const baseStat = 80;
    // applyMojoToStat uses Math.round, so 80*0.82=65.6→66
    expect(applyMojoToStat(baseStat, -2)).toBe(Math.round(80 * 0.82));
    expect(applyMojoToStat(baseStat, 0)).toBe(80);
    expect(applyMojoToStat(baseStat, 2)).toBe(Math.round(80 * 1.18));
  });

  // ─── Case 4: Stat = 0 with mojo ─────────────────
  it('MJ-04: Base stat 0 → always 0 regardless of mojo', () => {
    expect(applyMojoToStat(0, 2)).toBe(0);
    expect(applyMojoToStat(0, -2)).toBe(0);
  });

  // ─── Case 5: Mojo delta for HR ───────────────────
  it('MJ-05: HOME_RUN trigger → positive mojo delta', () => {
    const delta = getMojoDelta('HOME_RUN' as any);
    expect(Number.isFinite(delta)).toBe(true);
    expect(delta).toBeGreaterThan(0);
  });

  // ─── Case 6: Mojo delta for strikeout ────────────
  it('MJ-06: STRIKEOUT trigger → negative mojo delta', () => {
    const delta = getMojoDelta('STRIKEOUT' as any);
    expect(Number.isFinite(delta)).toBe(true);
    expect(delta).toBeLessThan(0);
  });

  // ─── Case 7: Mojo clamping at ceiling ────────────
  it('MJ-07: Mojo cannot exceed +2 (JACKED)', () => {
    const { newMojo } = applyMojoChange(2 as MojoLevel, 'HOME_RUN' as any);
    expect(newMojo).toBeLessThanOrEqual(2);
  });

  // ─── Case 8: Mojo clamping at floor ──────────────
  it('MJ-08: Mojo cannot go below -2 (RATTLED)', () => {
    const { newMojo } = applyMojoChange(-2 as MojoLevel, 'STRIKEOUT' as any);
    expect(newMojo).toBeGreaterThanOrEqual(-2);
  });

  // ─── Case 9: Carryover mechanics ─────────────────
  it('MJ-09: Starting mojo = regression toward 0', () => {
    // JACKED (+2) → next game should start lower
    const fromJacked = calculateStartingMojo(2 as MojoLevel);
    expect(fromJacked).toBeLessThan(2);
    expect(fromJacked).toBeGreaterThanOrEqual(-2);

    // RATTLED (-2) → next game should start higher
    const fromRattled = calculateStartingMojo(-2 as MojoLevel);
    expect(fromRattled).toBeGreaterThan(-2);
    expect(fromRattled).toBeLessThanOrEqual(2);

    // NORMAL (0) → stays 0
    const fromNormal = calculateStartingMojo(0 as MojoLevel);
    expect(fromNormal).toBe(0);
  });

  // ─── Case 10: Carryover rate constant ────────────
  it('MJ-10: Carryover rate = 0.3', () => {
    expect(MOJO_CARRYOVER_RATE).toBe(0.3);
  });

  // ─── Case 11: Mojo validation ────────────────────
  it('MJ-11: isValidMojoLevel', () => {
    expect(isValidMojoLevel(-2)).toBe(true);
    expect(isValidMojoLevel(0)).toBe(true);
    expect(isValidMojoLevel(2)).toBe(true);
    expect(isValidMojoLevel(3)).toBe(false);
    expect(isValidMojoLevel(-3)).toBe(false);
    expect(isValidMojoLevel(0.5)).toBe(false);
  });

  // ─── Case 12: Clamp mojo ────────────────────────
  it('MJ-12: clampMojo handles out-of-range values', () => {
    expect(clampMojo(5)).toBe(2);
    expect(clampMojo(-5)).toBe(-2);
    expect(clampMojo(0)).toBe(0);
    expect(clampMojo(1.7)).toBe(2); // rounds
  });

  // ─── Case 13: Infer triggers from play result ────
  it('MJ-13: inferMojoTriggers for HR', () => {
    const triggers = inferMojoTriggers({ type: 'BATTING', result: 'HR' } as any);
    expect(Array.isArray(triggers)).toBe(true);
    expect(triggers.length).toBeGreaterThan(0);
    // Should include HOME_RUN trigger
    expect(triggers.some(t => String(t).includes('HOME_RUN') || String(t).includes('HR'))).toBe(true);
  });

  // ─── Case 14: MOJO_STATES constant structure ─────
  it('MJ-14: MOJO_STATES has all 5 levels', () => {
    expect(MOJO_STATES).toBeDefined();
    const states = Object.values(MOJO_STATES);
    expect(states.length).toBeGreaterThanOrEqual(5);
  });
});
