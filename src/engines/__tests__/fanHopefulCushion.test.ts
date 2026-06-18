import { readFileSync } from 'node:fs';

import { describe, expect, test } from 'vitest';

import {
  FAN_HOPEFUL_CUSHION_TUNING,
  applyFanHopefulSlumpCushion,
  computeFanHopefulCallUpLift,
  computeFanHopefulWindowState,
  type FanHopefulCushionTuning,
} from '../fanHopefulCushion';

function overrideWindowGames(windowGames: number): FanHopefulCushionTuning {
  return {
    ...FAN_HOPEFUL_CUSHION_TUNING,
    windowGames,
  };
}

function overrideSlumpCushionFactor(
  slumpCushionFactor: number,
): FanHopefulCushionTuning {
  return {
    ...FAN_HOPEFUL_CUSHION_TUNING,
    slumpCushionFactor,
  };
}

describe('fanHopefulCushion L7d-2 pure engine', () => {
  test('uses the shape-locked Fan Hopeful cushion defaults', () => {
    expect(FAN_HOPEFUL_CUSHION_TUNING).toEqual({
      windowGames: 10,
      fanMoraleLift: 3,
      slumpCushionFactor: 0.5,
    });
    expect(FAN_HOPEFUL_CUSHION_TUNING.fanMoraleLift).toBeGreaterThan(0);
    expect(
      FAN_HOPEFUL_CUSHION_TUNING.slumpCushionFactor,
    ).toBeGreaterThanOrEqual(0);
    expect(FAN_HOPEFUL_CUSHION_TUNING.slumpCushionFactor).toBeLessThan(1);
  });

  test('computes the game-count active window from the call-up game', () => {
    expect(computeFanHopefulWindowState(5, 5)).toEqual({
      gamesSinceCallUp: 0,
      active: true,
      expired: false,
      gamesRemaining: 10,
    });

    expect(computeFanHopefulWindowState(5, 14)).toEqual({
      gamesSinceCallUp: 9,
      active: true,
      expired: false,
      gamesRemaining: 1,
    });
  });

  test('expires exactly when gamesSinceCallUp reaches the configured window', () => {
    expect(computeFanHopefulWindowState(5, 15)).toEqual({
      gamesSinceCallUp: 10,
      active: false,
      expired: true,
      gamesRemaining: 0,
    });

    expect(computeFanHopefulWindowState(5, 20)).toEqual({
      gamesSinceCallUp: 15,
      active: false,
      expired: true,
      gamesRemaining: 0,
    });
  });

  test('treats games before the call-up as not yet active and not expired', () => {
    expect(computeFanHopefulWindowState(5, 4)).toEqual({
      gamesSinceCallUp: -1,
      active: false,
      expired: false,
      gamesRemaining: 0,
    });
  });

  test('returns the one-time call-up fan-morale lift', () => {
    expect(computeFanHopefulCallUpLift()).toBe(
      FAN_HOPEFUL_CUSHION_TUNING.fanMoraleLift,
    );
    expect(computeFanHopefulCallUpLift()).toBeGreaterThan(0);
  });

  test('active window cushions only negative Fan Hopeful slump swings', () => {
    const activeWindow = computeFanHopefulWindowState(5, 5);

    expect(applyFanHopefulSlumpCushion(-4, activeWindow)).toBe(-2);
    expect(applyFanHopefulSlumpCushion(4, activeWindow)).toBe(4);
    expect(applyFanHopefulSlumpCushion(0, activeWindow)).toBe(0);
  });

  test('expired or inactive windows leave negative swings unchanged', () => {
    const expiredWindow = computeFanHopefulWindowState(5, 15);
    const inactiveWindow = computeFanHopefulWindowState(5, 4);

    expect(applyFanHopefulSlumpCushion(-4, expiredWindow)).toBe(-4);
    expect(applyFanHopefulSlumpCushion(-4, inactiveWindow)).toBe(-4);
  });

  test('slump cushion is sign-preserving for cushioned cases', () => {
    const activeWindow = computeFanHopefulWindowState(5, 6);
    const baseSwing = -4;
    const cushionedSwing = applyFanHopefulSlumpCushion(baseSwing, activeWindow);

    expect(cushionedSwing).toBeGreaterThan(baseSwing);
    expect(cushionedSwing).toBeLessThan(0);
    expect(Math.sign(cushionedSwing)).toBe(Math.sign(baseSwing));
  });

  test('same input produces the same output', () => {
    const firstWindow = computeFanHopefulWindowState(5, 14);
    const secondWindow = computeFanHopefulWindowState(5, 14);
    const firstLift = computeFanHopefulCallUpLift();
    const secondLift = computeFanHopefulCallUpLift();
    const firstSwing = applyFanHopefulSlumpCushion(-4, firstWindow);
    const secondSwing = applyFanHopefulSlumpCushion(-4, secondWindow);

    expect(secondWindow).toEqual(firstWindow);
    expect(secondLift).toBe(firstLift);
    expect(secondSwing).toBe(firstSwing);
  });

  test('custom config overrides window and cushion deterministically', () => {
    const windowConfig = overrideWindowGames(5);
    const cushionConfig = overrideSlumpCushionFactor(0.25);
    const firstWindow = computeFanHopefulWindowState(5, 10, windowConfig);
    const secondWindow = computeFanHopefulWindowState(5, 10, windowConfig);
    const activeWindow = computeFanHopefulWindowState(5, 6);
    const firstSwing = applyFanHopefulSlumpCushion(-4, activeWindow, cushionConfig);
    const secondSwing = applyFanHopefulSlumpCushion(-4, activeWindow, cushionConfig);

    expect(firstWindow).toEqual({
      gamesSinceCallUp: 5,
      active: false,
      expired: true,
      gamesRemaining: 0,
    });
    expect(secondWindow).toEqual(firstWindow);
    expect(firstSwing).toBe(-1);
    expect(secondSwing).toBe(firstSwing);
  });

  test('engine source does not use nondeterministic primitives', () => {
    const source = readFileSync('src/engines/fanHopefulCushion.ts', 'utf8');

    expect(source).not.toMatch(/Math\.random/);
    expect(source).not.toMatch(/Date\.now/);
    expect(source).not.toMatch(/new\s+Date/);
  });
});
