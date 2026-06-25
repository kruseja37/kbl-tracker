import { describe, expect, test } from 'vitest';

import {
  applyPitcherParkFactor,
  calculateFIP,
  calculatePWAR,
  createDefaultPitchingContext,
  type PitchingStatsForWAR,
} from '../pwarCalculator';

function createPitchingStats(overrides: Partial<PitchingStatsForWAR> = {}): PitchingStatsForWAR {
  return {
    ip: 100,
    strikeouts: 90,
    walks: 25,
    hitByPitch: 4,
    homeRunsAllowed: 10,
    gamesStarted: 16,
    gamesAppeared: 16,
    saves: 0,
    holds: 0,
    ...overrides,
  };
}

describe('calculatePWAR park factors', () => {
  test('neutral park factor is byte-identical to default pWAR', () => {
    const stats = createPitchingStats();
    const context = createDefaultPitchingContext('season-1', 50);

    const defaultResult = calculatePWAR(stats, context);
    const neutralResult = calculatePWAR(stats, context, { parkFactor: 1 });

    expect(neutralResult).toEqual(defaultResult);
  });

  test('park-adjusts FIP before league-FIP diff', () => {
    const stats = createPitchingStats();
    const context = createDefaultPitchingContext('season-1', 50);
    const rawFIP = calculateFIP(stats, context.fipConstant);
    const hitterFriendlyFactor = 1.2;

    const defaultResult = calculatePWAR(stats, context);
    const adjustedResult = calculatePWAR(stats, context, {
      parkFactor: hitterFriendlyFactor,
    });

    const adjustedFIP = applyPitcherParkFactor(rawFIP, hitterFriendlyFactor);
    expect(adjustedFIP).toBeLessThan(rawFIP);
    expect(adjustedResult.fip).toBeCloseTo(Math.round(adjustedFIP * 100) / 100, 10);
    expect(adjustedResult.fipDiff).toBeCloseTo(
      Math.round((context.leagueFIP - adjustedFIP) * 100) / 100,
      10,
    );
    expect(adjustedResult.pWAR).toBeGreaterThan(defaultResult.pWAR);
  });

  test('pitcher-friendly seed factor debits FIP under existing rawFIP-over-factor semantics', () => {
    const stats = createPitchingStats();
    const context = createDefaultPitchingContext('season-1', 50);
    const rawFIP = calculateFIP(stats, context.fipConstant);
    const pitcherFriendlyFactor = 0.85;

    const defaultResult = calculatePWAR(stats, context);
    const adjustedResult = calculatePWAR(stats, context, {
      parkFactor: pitcherFriendlyFactor,
    });

    expect(applyPitcherParkFactor(rawFIP, pitcherFriendlyFactor)).toBeGreaterThan(rawFIP);
    expect(adjustedResult.pWAR).toBeLessThan(defaultResult.pWAR);
  });
});
