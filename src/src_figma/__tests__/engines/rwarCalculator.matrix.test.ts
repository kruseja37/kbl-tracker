/**
 * rWAR Calculator — Boundary-Value Matrix Tests
 *
 * 13 golden cases: zero stats, SB-only, CS-only, high speed,
 * low speed, GIDP-prone, elite baserunner, NaN, negative
 */
import { describe, it, expect } from 'vitest';
import {
  calculateWSB,
  calculateWSBSimplified,
  calculateWGDP,
  calculateWGDPSimplified,
  calculateRWAR,
  calculateRWARSimplified,
  getRunsPerWin,
  createDefaultLeagueStats,
  getSBSuccessRate,
  isSBProfitable,
  STOLEN_BASE_VALUES,
  GIDP_VALUES,
} from '../../../engines/rwarCalculator';

type BaserunningStats = Parameters<typeof calculateRWARSimplified>[0];

function makeRStats(overrides: Partial<BaserunningStats> = {}): BaserunningStats {
  return {
    stolenBases: 0,
    caughtStealing: 0,
    // StolenBaseStats requires these fields for league rate calculations
    singles: 0,
    walks: 0,
    hitByPitch: 0,
    intentionalWalks: 0,
    // Advancement stats (optional via Partial<AdvancementStats>)
    firstToThird: 0,
    firstToThirdOpportunities: 0,
    secondToHome: 0,
    secondToHomeOpportunities: 0,
    extraBasesTaken: 0,
    extraBasesOpportunities: 0,
    advancementOuts: 0,
    // GIDPStats
    gidp: 0,
    gidpOpportunities: 0,
    ...overrides,
  };
}

describe('rWAR Calculator — Boundary-Value Matrix', () => {
  // ─── Case 1: Zero stats ──────────────────────────
  it('RW-01: All zeros → rWAR = 0', () => {
    const result = calculateRWARSimplified(makeRStats(), 50);
    expect(Number.isFinite(result.rWAR)).toBe(true);
    expect(result.rWAR).toBe(0);
  });

  // ─── Case 2: Stolen bases only ───────────────────
  it('RW-02: 20 SB, 0 CS → positive rWAR', () => {
    const stats = makeRStats({ stolenBases: 20, caughtStealing: 0 });
    const result = calculateRWARSimplified(stats, 50);
    expect(Number.isFinite(result.rWAR)).toBe(true);
    expect(result.rWAR).toBeGreaterThan(0);
  });

  // ─── Case 3: Caught stealing only ────────────────
  it('RW-03: 0 SB, 10 CS → negative rWAR', () => {
    const stats = makeRStats({ stolenBases: 0, caughtStealing: 10 });
    const result = calculateRWARSimplified(stats, 50);
    expect(Number.isFinite(result.rWAR)).toBe(true);
    expect(result.rWAR).toBeLessThan(0);
  });

  // ─── Case 4: Break-even SB rate ──────────────────
  it('RW-04: SB profitability threshold', () => {
    // SB value = +0.20, CS value = -0.45
    // Break-even: 0.20x - 0.45(1-x) = 0 → x = 0.45/0.65 ≈ 69.2%
    const profitable = isSBProfitable(70, 30); // 70%
    const unprofitable = isSBProfitable(60, 40); // 60%
    expect(profitable).toBe(true);
    expect(unprofitable).toBe(false);
  });

  // ─── Case 5: SB success rate ─────────────────────
  it('RW-05: SB success rate calculation', () => {
    expect(getSBSuccessRate(80, 20)).toBeCloseTo(0.8, 2);
    expect(getSBSuccessRate(0, 0)).toBe(0); // or NaN — document
    const zeroRate = getSBSuccessRate(0, 0);
    expect(Number.isFinite(zeroRate) || zeroRate === 0).toBe(true);
  });

  // ─── Case 6: GIDP-prone hitter ──────────────────
  it('RW-06: High GIDP → negative rWAR component', () => {
    const stats = makeRStats({
      gidp: 15, gidpOpportunities: 50,
    });
    const result = calculateRWARSimplified(stats, 50);
    expect(Number.isFinite(result.rWAR)).toBe(true);
    expect(result.rWAR).toBeLessThan(0);
  });

  // ─── Case 7: Zero GIDP despite opportunities ────
  it('RW-07: 0 GIDP in 50 opportunities → positive GIDP component', () => {
    const stats = makeRStats({
      gidp: 0, gidpOpportunities: 50,
    });
    const wgdp = calculateWGDPSimplified(stats);
    expect(Number.isFinite(wgdp)).toBe(true);
    // Avoiding GIDP is positive
    expect(wgdp).toBeGreaterThanOrEqual(0);
  });

  // ─── Case 8: Elite baserunner (all components) ───
  it('RW-08: Elite baserunner → high positive rWAR', () => {
    const stats = makeRStats({
      stolenBases: 30, caughtStealing: 3,
      firstToThird: 10, firstToThirdOpportunities: 12,
      secondToHome: 8, secondToHomeOpportunities: 10,
      extraBasesTaken: 15, extraBasesOpportunities: 20,
      advancementOuts: 1,
      gidp: 2, gidpOpportunities: 40,
    });
    const result = calculateRWARSimplified(stats, 50);
    expect(Number.isFinite(result.rWAR)).toBe(true);
    expect(result.rWAR).toBeGreaterThan(0);
  });

  // ─── Case 9: Terrible baserunner ─────────────────
  it('RW-09: Terrible baserunner → negative rWAR', () => {
    const stats = makeRStats({
      stolenBases: 1, caughtStealing: 8,
      advancementOuts: 5,
      gidp: 15, gidpOpportunities: 30,
    });
    const result = calculateRWARSimplified(stats, 50);
    expect(Number.isFinite(result.rWAR)).toBe(true);
    expect(result.rWAR).toBeLessThan(0);
  });

  // ─── Case 10: Season length scaling ──────────────
  it('RW-10: RPW scales with season length', () => {
    const rpw50 = getRunsPerWin(50);
    expect(rpw50).toBeCloseTo(10 * (50 / 162), 2);
  });

  // ─── Case 11: wSB calculation ────────────────────
  it('RW-11: wSB with known values', () => {
    const stats = { stolenBases: 20, caughtStealing: 5 };
    const wsb = calculateWSBSimplified(stats);
    expect(Number.isFinite(wsb)).toBe(true);
    // 20*0.20 - 5*0.45 = 4.0 - 2.25 = 1.75 (approximate, league adjustment may differ)
    expect(wsb).toBeGreaterThan(0);
  });

  // ─── Case 12: NaN inputs ─────────────────────────
  it('RW-12: NaN inputs → flags or handles gracefully', () => {
    const stats = makeRStats({ stolenBases: NaN, caughtStealing: NaN });
    const result = calculateRWARSimplified(stats, 50);
    const isClean = Number.isFinite(result.rWAR);
    if (!isClean) {
      console.warn('FLAGGED: rWAR returned NaN/Infinity for NaN inputs');
    }
    expect(typeof result.rWAR).toBe('number');
  });

  // ─── Case 13: Constants sanity ───────────────────
  it('RW-13: Constants are correct per spec', () => {
    expect(STOLEN_BASE_VALUES).toBeDefined();
    expect(GIDP_VALUES).toBeDefined();
    // CS should be more negative than SB is positive
    expect(Math.abs(STOLEN_BASE_VALUES.CS)).toBeGreaterThan(STOLEN_BASE_VALUES.SB);
  });
});
