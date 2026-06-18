import { readFileSync } from 'node:fs';

import { describe, expect, test } from 'vitest';

import {
  CAPTAIN_MORALE_ROUTER_TUNING,
  applyCaptainCharismaRouting,
  applyCaptainPerformanceSwingAmplification,
  computeCaptainCharismaRouting,
  type CaptainMoraleRouterTuning,
} from '../captainMoraleRouter';

function overridePerformanceSwingMultiplier(
  captainPerformanceSwingMultiplier: number,
): CaptainMoraleRouterTuning {
  return {
    ...CAPTAIN_MORALE_ROUTER_TUNING,
    captainPerformanceSwingMultiplier,
  };
}

describe('captainMoraleRouter L7d-1 pure engine', () => {
  test('uses the spec-canonical Captain Charisma double', () => {
    expect(CAPTAIN_MORALE_ROUTER_TUNING.charismaRoutingMultiplier).toBe(2);
  });

  test('computeCaptainCharismaRouting doubles high charisma teammate routing', () => {
    const result = computeCaptainCharismaRouting(90);

    expect(result.captainCharisma).toBe(90);
    expect(result.baseRouting).toBeGreaterThan(0);
    expect(result.baseRouting).toBeCloseTo(0.8);
    expect(result.captainRouting).toBeCloseTo(result.baseRouting * 2);
    expect(result.multiplier).toBe(2);
  });

  test('computeCaptainCharismaRouting treats neutral charisma as no routing signal', () => {
    const result = computeCaptainCharismaRouting(50);

    expect(result).toEqual({
      captainCharisma: 50,
      baseRouting: 0,
      captainRouting: 0,
      multiplier: 2,
    });
  });

  test('computeCaptainCharismaRouting remains linear for low-charisma Captains', () => {
    const result = computeCaptainCharismaRouting(30);

    expect(result.baseRouting).toBeLessThan(0);
    expect(result.baseRouting).toBeCloseTo(-0.4);
    expect(result.captainRouting).toBeLessThan(0);
    expect(result.captainRouting).toBeCloseTo(result.baseRouting * 2);
    expect(result.multiplier).toBe(2);
  });

  test('applyCaptainCharismaRouting doubles an existing base charisma-routing value', () => {
    expect(applyCaptainCharismaRouting(0.4)).toBeCloseTo(0.8);
    expect(applyCaptainCharismaRouting(0)).toBe(0);
  });

  test('applyCaptainPerformanceSwingAmplification preserves sign while amplifying magnitude', () => {
    const positive = applyCaptainPerformanceSwingAmplification(2);
    const negative = applyCaptainPerformanceSwingAmplification(-2);

    expect(positive).toBeGreaterThan(2);
    expect(Math.sign(positive)).toBe(1);
    expect(negative).toBeLessThan(-2);
    expect(Math.sign(negative)).toBe(-1);
    expect(applyCaptainPerformanceSwingAmplification(0)).toBe(0);
  });

  test('same input produces the same output', () => {
    const first = computeCaptainCharismaRouting(90);
    const second = computeCaptainCharismaRouting(90);
    const firstSwing = applyCaptainPerformanceSwingAmplification(-1.25);
    const secondSwing = applyCaptainPerformanceSwingAmplification(-1.25);

    expect(second).toEqual(first);
    expect(secondSwing).toBe(firstSwing);
  });

  test('custom config override changes swing amplification deterministically', () => {
    const config = overridePerformanceSwingMultiplier(3);
    const first = applyCaptainPerformanceSwingAmplification(2, config);
    const second = applyCaptainPerformanceSwingAmplification(2, config);

    expect(first).toBe(6);
    expect(second).toBe(first);
  });

  test('engine source does not use nondeterministic primitives', () => {
    const source = readFileSync('src/engines/captainMoraleRouter.ts', 'utf8');

    expect(source).not.toMatch(/Math\.random/);
    expect(source).not.toMatch(/Date\.now/);
    expect(source).not.toMatch(/new\s+Date/);
  });
});
