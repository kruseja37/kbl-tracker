/**
 * Fielder Inference: Foul Zones + FL/FR Directions + Depth Pop Fly
 * Phase B - Tier 2.1 (GAP-B3-009, MAJ-B3-005, MAJ-B3-006)
 */

import { describe, test, expect } from 'vitest';
import {
  type Direction,
  type FoulZone,
  inferFoulBallFielder,
  classifyFoulZone,
  inferDirectionFromX,
  inferPopFlyFielder,
  inferFielder,
  inferFielderEnhanced,
  POSITION_NUMBER,
} from '../../app/components/fielderInference';

// ============================================
// FL/FR in inference matrices (MAJ-B3-005)
// ============================================

describe('FL/FR Direction in Inference Matrices (MAJ-B3-005)', () => {
  test('Direction type accepts Foul-Left and Foul-Right', () => {
    const fl: Direction = 'Foul-Left';
    const fr: Direction = 'Foul-Right';
    expect(fl).toBe('Foul-Left');
    expect(fr).toBe('Foul-Right');
  });

  test('inferDirectionFromX returns Foul-Left for x < 0.05', () => {
    expect(inferDirectionFromX(0.02)).toBe('Foul-Left');
  });

  test('inferDirectionFromX returns Foul-Right for x > 0.95', () => {
    expect(inferDirectionFromX(0.97)).toBe('Foul-Right');
  });

  test('inferDirectionFromX isFoul flag overrides normal thresholds', () => {
    expect(inferDirectionFromX(0.15, true)).toBe('Foul-Left');
  });

  test('inferFielderEnhanced handles Foul-Left direction for ground ball', () => {
    // When direction is explicitly Foul-Left, ground ball → C primary
    const fielder = inferFielderEnhanced('GO', 'Foul-Left' as Direction, 'Ground');
    expect(fielder).toBe(POSITION_NUMBER['C']); // C = position 2
  });

  test('inferFielderEnhanced handles Foul-Right direction for fly ball', () => {
    const fielder = inferFielderEnhanced('FO', 'Foul-Right' as Direction, 'Fly Ball');
    expect(fielder).toBe(POSITION_NUMBER['RF']); // RF = position 9
  });
});

// ============================================
// Foul Territory Zones (GAP-B3-009)
// ============================================

describe('Foul Territory Zones (GAP-B3-009)', () => {
  test('FoulZone type covers all 5 zones', () => {
    const zones: FoulZone[] = ['FL-LINE', 'FL-HOME', 'FR-LINE', 'FR-HOME', 'FOUL-BACK'];
    expect(zones.length).toBe(5);
  });

  test('classifyFoulZone: behind plate → FOUL-BACK', () => {
    expect(classifyFoulZone(0.5, 0.05)).toBe('FOUL-BACK');
  });

  test('classifyFoulZone: left foul near plate → FL-HOME', () => {
    expect(classifyFoulZone(0.05, 0.15)).toBe('FL-HOME');
  });

  test('classifyFoulZone: left foul near line → FL-LINE', () => {
    expect(classifyFoulZone(0.05, 0.5)).toBe('FL-LINE');
  });

  test('classifyFoulZone: right foul near plate → FR-HOME', () => {
    expect(classifyFoulZone(0.95, 0.15)).toBe('FR-HOME');
  });

  test('classifyFoulZone: right foul near line → FR-LINE', () => {
    expect(classifyFoulZone(0.95, 0.5)).toBe('FR-LINE');
  });

  test('classifyFoulZone: fair territory → null', () => {
    expect(classifyFoulZone(0.5, 0.5)).toBeNull();
  });

  test('inferFoulBallFielder: FO + FL-LINE → LF primary', () => {
    const result = inferFoulBallFielder('FL-LINE', 'FO');
    expect(result.primary).toBe('LF');
    expect(result.secondary).toBe('3B');
  });

  test('inferFoulBallFielder: FO + FR-HOME → C primary', () => {
    const result = inferFoulBallFielder('FR-HOME', 'FO');
    expect(result.primary).toBe('C');
    expect(result.secondary).toBe('1B');
  });

  test('inferFoulBallFielder: PO + FL → 3B primary', () => {
    const result = inferFoulBallFielder('FL-LINE', 'PO');
    expect(result.primary).toBe('3B');
    expect(result.secondary).toBe('C');
  });

  test('inferFoulBallFielder: FOUL-BACK → C only', () => {
    const result = inferFoulBallFielder('FOUL-BACK', 'FO');
    expect(result.primary).toBe('C');
    expect(result.secondary).toBeUndefined();
  });
});

// ============================================
// Depth-Aware Pop Fly Inference (MAJ-B3-006)
// ============================================

describe('inferPopFlyFielder (MAJ-B3-006)', () => {
  test('shallow depth → C primary, P secondary', () => {
    const result = inferPopFlyFielder('Center', 'shallow');
    expect(result.primary).toBe('C');
    expect(result.secondary).toBe('P');
  });

  test('shallow depth is direction-independent', () => {
    expect(inferPopFlyFielder('Left', 'shallow').primary).toBe('C');
    expect(inferPopFlyFielder('Right', 'shallow').primary).toBe('C');
    expect(inferPopFlyFielder('Foul-Left', 'shallow').primary).toBe('C');
  });

  test('infield depth Left → 3B primary', () => {
    const result = inferPopFlyFielder('Left', 'infield');
    expect(result.primary).toBe('3B');
  });

  test('infield depth Center → SS primary', () => {
    const result = inferPopFlyFielder('Center', 'infield');
    expect(result.primary).toBe('SS');
  });

  test('infield depth Right → 1B primary', () => {
    const result = inferPopFlyFielder('Right', 'infield');
    expect(result.primary).toBe('1B');
  });

  test('outfield depth Left → LF primary', () => {
    const result = inferPopFlyFielder('Left', 'outfield');
    expect(result.primary).toBe('LF');
  });

  test('outfield depth Center → CF primary', () => {
    const result = inferPopFlyFielder('Center', 'outfield');
    expect(result.primary).toBe('CF');
  });

  test('outfield depth Right → RF primary', () => {
    const result = inferPopFlyFielder('Right', 'outfield');
    expect(result.primary).toBe('RF');
  });

  test('deep depth Left-Center → CF primary', () => {
    const result = inferPopFlyFielder('Left-Center', 'deep');
    expect(result.primary).toBe('CF');
  });

  test('inferFielder uses depth for Pop Up', () => {
    // Shallow location (y < 0.15) should infer C for pop up
    const result = inferFielder({ x: 0.5, y: 0.05 }, { exitType: 'Pop Up' });
    expect(result.position).toBe('C');
  });

  test('inferFielder with explicit depth overrides y-based inference', () => {
    // y=0.5 would normally be outfield, but explicit depth=infield overrides
    const result = inferFielder(
      { x: 0.5, y: 0.5 },
      { exitType: 'Pop Up', depth: 'infield' }
    );
    expect(result.position).toBe('SS');
  });
});
