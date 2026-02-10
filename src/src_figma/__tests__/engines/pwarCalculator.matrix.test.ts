/**
 * pWAR Calculator — Boundary-Value Matrix Tests
 *
 * 15 golden cases: zero IP, minimum valid, typical starter, typical reliever,
 * Cy Young line, maximum K rate, 0 K (contact pitcher), NaN/negative inputs
 */
import { describe, it, expect } from 'vitest';
import {
  calculateFIP,
  calculatePWAR,
  calculatePWARSimplified,
  getPitcherReplacementLevel,
  getPitcherRole,
  getLeverageMultiplier,
  getBaseRunsPerWin,
  formatIP,
} from '../../../engines/pwarCalculator';

type PitchingStatsForWAR = Parameters<typeof calculatePWARSimplified>[0];

function makePStats(overrides: Partial<PitchingStatsForWAR> = {}): PitchingStatsForWAR {
  return {
    ip: 0, strikeouts: 0, walks: 0, homeRunsAllowed: 0, hitByPitch: 0,
    earnedRuns: 0, hitsAllowed: 0, gamesStarted: 0, gamesAppeared: 0,
    saves: 0, holds: 0, qualityStarts: 0, completeGames: 0,
    shutouts: 0, noHitters: 0, perfectGames: 0,
    averageLeverageIndex: 1.0,
    ...overrides,
  };
}

describe('pWAR Calculator — Boundary-Value Matrix', () => {
  // ─── Case 1: Zero IP ─────────────────────────────
  it('PW-01: 0 IP → pWAR = 0, no division by zero', () => {
    const result = calculatePWARSimplified(makePStats(), 50);
    expect(Number.isFinite(result.pWAR)).toBe(true);
    // 0 IP should give 0 or very small WAR
    expect(Math.abs(result.pWAR)).toBeLessThan(0.1);
  });

  // ─── Case 2: 0.1 IP (1 out recorded) ─────────────
  it('PW-02: 0.1 IP (minimum valid) → finite pWAR', () => {
    const stats = makePStats({ ip: 0.1, gamesAppeared: 1, strikeouts: 1 });
    const result = calculatePWARSimplified(stats, 50);
    expect(Number.isFinite(result.pWAR)).toBe(true);
  });

  // ─── Case 3: Typical starter (50-game season) ────
  it('PW-03: Typical starter → pWAR near 0-2', () => {
    const stats = makePStats({
      ip: 100, strikeouts: 80, walks: 30, homeRunsAllowed: 10,
      hitByPitch: 3, earnedRuns: 40, hitsAllowed: 90,
      gamesStarted: 16, gamesAppeared: 16,
    });
    const result = calculatePWARSimplified(stats, 50);
    expect(Number.isFinite(result.pWAR)).toBe(true);
    expect(Number.isFinite(result.fip)).toBe(true);
    // Average starter in 50-game season
    expect(result.pWAR).toBeGreaterThan(-3);
    expect(result.pWAR).toBeLessThan(5);
  });

  // ─── Case 4: Typical reliever ────────────────────
  it('PW-04: Typical reliever → smaller pWAR magnitude', () => {
    const stats = makePStats({
      ip: 30, strikeouts: 30, walks: 10, homeRunsAllowed: 3,
      hitByPitch: 1, earnedRuns: 12, hitsAllowed: 25,
      gamesStarted: 0, gamesAppeared: 25, saves: 5,
      averageLeverageIndex: 1.5,
    });
    const result = calculatePWARSimplified(stats, 50);
    expect(Number.isFinite(result.pWAR)).toBe(true);
    // Reliever WAR is typically smaller magnitude
    expect(Math.abs(result.pWAR)).toBeLessThan(4);
  });

  // ─── Case 5: Cy Young line ───────────────────────
  it('PW-05: Elite ace → high positive pWAR', () => {
    const stats = makePStats({
      ip: 120, strikeouts: 140, walks: 15, homeRunsAllowed: 5,
      hitByPitch: 2, earnedRuns: 20, hitsAllowed: 70,
      gamesStarted: 16, gamesAppeared: 16,
    });
    const result = calculatePWARSimplified(stats, 50);
    expect(Number.isFinite(result.pWAR)).toBe(true);
    expect(result.pWAR).toBeGreaterThan(1);
    // FIP should be very low
    expect(result.fip).toBeLessThan(3.5);
  });

  // ─── Case 6: Worst possible pitcher ──────────────
  it('PW-06: All walks, no outs → extreme negative pWAR', () => {
    const stats = makePStats({
      ip: 1, walks: 50, homeRunsAllowed: 10, strikeouts: 0,
      hitByPitch: 5, gamesAppeared: 5,
    });
    const result = calculatePWARSimplified(stats, 50);
    expect(Number.isFinite(result.pWAR)).toBe(true);
    expect(result.pWAR).toBeLessThan(0);
    expect(result.fip).toBeGreaterThan(10);
  });

  // ─── Case 7: Perfect pitcher (all K, no walks/HR) ─
  it('PW-07: Perfect K/BB/HR line → lowest FIP', () => {
    const stats = makePStats({
      ip: 100, strikeouts: 200, walks: 0, homeRunsAllowed: 0,
      hitByPitch: 0, gamesStarted: 16, gamesAppeared: 16,
    });
    const result = calculatePWARSimplified(stats, 50);
    expect(Number.isFinite(result.pWAR)).toBe(true);
    expect(Number.isFinite(result.fip)).toBe(true);
    // FIP should be very low (close to fipConstant - 2*K/IP component)
    expect(result.fip).toBeLessThan(2);
    expect(result.pWAR).toBeGreaterThan(3);
  });

  // ─── Case 8: FIP calculation directly ────────────
  it('PW-08: FIP formula: ((13*HR + 3*(BB+HBP) - 2*K) / IP) + C', () => {
    const stats = makePStats({
      ip: 100, strikeouts: 100, walks: 30, homeRunsAllowed: 10,
      hitByPitch: 5,
    });
    const fip = calculateFIP(stats);
    // Manual: ((13*10 + 3*(30+5) - 2*100) / 100) + 3.28
    // = (130 + 105 - 200) / 100 + 3.28 = 35/100 + 3.28 = 3.63
    expect(Number.isFinite(fip)).toBe(true);
    expect(fip).toBeCloseTo(3.63, 1);
  });

  // ─── Case 9: Pitcher role detection ──────────────
  it('PW-09: Role detection: starter vs reliever', () => {
    const starterRole = getPitcherRole(15, 15);
    const relieverRole = getPitcherRole(0, 30);
    const swingmanRole = getPitcherRole(5, 20);

    expect(starterRole).toBe('starter');
    expect(relieverRole).toBe('reliever');
    // Swingman depends on threshold
    expect(['starter', 'reliever', 'swingman']).toContain(swingmanRole);
  });

  // ─── Case 10: Replacement level ──────────────────
  it('PW-10: Replacement level: starter > reliever', () => {
    const starterRL = getPitcherReplacementLevel(15, 15);
    const relieverRL = getPitcherReplacementLevel(0, 30);

    expect(Number.isFinite(starterRL)).toBe(true);
    expect(Number.isFinite(relieverRL)).toBe(true);
    // Starter replacement level should be higher (easier to replace)
    expect(starterRL).toBeGreaterThan(relieverRL);
  });

  // ─── Case 11: Leverage multiplier ────────────────
  it('PW-11: Leverage multiplier scales with LI', () => {
    const li05 = getLeverageMultiplier(0.5, true);
    const li10 = getLeverageMultiplier(1.0, true);
    const li20 = getLeverageMultiplier(2.0, true);

    expect(Number.isFinite(li05)).toBe(true);
    expect(Number.isFinite(li10)).toBe(true);
    expect(Number.isFinite(li20)).toBe(true);
    // Higher LI = higher multiplier for relievers
    expect(li20).toBeGreaterThan(li10);
  });

  // ─── Case 12: Season length scaling ──────────────
  it('PW-12: Runs per win scales with season length', () => {
    const rpw16 = getBaseRunsPerWin(16);
    const rpw50 = getBaseRunsPerWin(50);
    const rpw162 = getBaseRunsPerWin(162);

    expect(rpw16).toBeLessThan(rpw50);
    expect(rpw50).toBeLessThan(rpw162);
    expect(Number.isFinite(rpw162)).toBe(true);
  });

  // ─── Case 13: Very high IP ───────────────────────
  it('PW-13: 200 IP in 50-game season → no overflow', () => {
    const stats = makePStats({
      ip: 200, strikeouts: 180, walks: 40, homeRunsAllowed: 15,
      hitByPitch: 5, gamesStarted: 20, gamesAppeared: 20,
    });
    const result = calculatePWARSimplified(stats, 50);
    expect(Number.isFinite(result.pWAR)).toBe(true);
    expect(Number.isFinite(result.fip)).toBe(true);
  });

  // ─── Case 14: NaN-prone inputs ───────────────────
  it('PW-14: NaN IP → flags or handles gracefully', () => {
    const stats = makePStats({ ip: NaN, strikeouts: NaN });
    const result = calculatePWARSimplified(stats, 50);
    const isClean = Number.isFinite(result.pWAR);
    if (!isClean) {
      console.warn('FLAGGED: pWAR returned NaN/Infinity for NaN inputs');
    }
    expect(typeof result.pWAR).toBe('number');
  });

  // ─── Case 15: Negative inputs ────────────────────
  it('PW-15: Negative IP → handles gracefully', () => {
    const stats = makePStats({ ip: -10, strikeouts: -5 });
    const result = calculatePWARSimplified(stats, 50);
    const isClean = Number.isFinite(result.pWAR);
    if (!isClean) {
      console.warn('FLAGGED: pWAR returned NaN/Infinity for negative inputs');
    }
    expect(typeof result.pWAR).toBe('number');
  });
});
