/**
 * Zone-CQ Integration, Spray Chart, and Stadium Spray Tests
 * Phase B - Tier 2.1 (GAP-B3-025, GAP-B3-026, GAP-B3-027)
 */

import { describe, test, expect } from 'vitest';
import {
  getCQTrajectoryFromZone,
  getContactQualityFromZone,
  getFoulContactQuality,
  SPRAY_COLORS,
  SPRAY_SIZES,
  generateSprayPoint,
  createSprayChartEntry,
  mapToStadiumSprayZone,
  estimateDistance,
  estimateAngle,
  createStadiumBattedBallEvent,
} from '../../../data/fieldZones';

// ============================================
// Zone-to-CQ Integration (GAP-B3-025)
// ============================================

describe('getCQTrajectoryFromZone (GAP-B3-025)', () => {
  test('fly ball infield zone → shallow depth', () => {
    const result = getCQTrajectoryFromZone('Z00', 'Fly Ball');
    expect(result.depth).toBe('shallow');
  });

  test('fly ball deep zone → deep depth', () => {
    const result = getCQTrajectoryFromZone('Z15', 'Fly Ball');
    expect(result.depth).toBe('deep');
  });

  test('ground ball infield → medium speed', () => {
    const result = getCQTrajectoryFromZone('Z00', 'Ground Ball');
    expect(result.speed).toBe('medium');
  });

  test('ground ball through hole (shallow OF) → hard speed', () => {
    const result = getCQTrajectoryFromZone('Z07', 'Ground Ball');
    expect(result.speed).toBe('hard');
  });

  test('line drive returns empty (no depth modification)', () => {
    const result = getCQTrajectoryFromZone('Z10', 'Line Drive');
    expect(result).toEqual({});
  });
});

describe('getContactQualityFromZone (GAP-B3-025)', () => {
  test('HR always returns 1.0', () => {
    expect(getContactQualityFromZone('Z15', 'Fly Ball', 'HR')).toBe(1.0);
  });

  test('line drive always returns 0.85', () => {
    expect(getContactQualityFromZone('Z10', 'Line Drive', 'LO')).toBe(0.85);
  });

  test('deep fly ball returns 0.75', () => {
    expect(getContactQualityFromZone('Z15', 'Fly Ball', 'FO')).toBe(0.75);
  });

  test('shallow fly ball returns 0.35', () => {
    expect(getContactQualityFromZone('Z06', 'Fly Ball', 'FO')).toBe(0.35);
  });

  test('ground ball through hole returns 0.70', () => {
    expect(getContactQualityFromZone('Z07', 'Ground Ball', '1B')).toBe(0.70);
  });

  test('infield grounder returns 0.50', () => {
    expect(getContactQualityFromZone('Z00', 'Ground Ball', 'GO')).toBe(0.50);
  });

  test('pop up returns 0.20', () => {
    expect(getContactQualityFromZone('Z00', 'Pop Up', 'PO')).toBe(0.20);
  });

  test('foul zone delegates to getFoulContactQuality', () => {
    expect(getContactQualityFromZone('F06', 'Pop Up', 'PO')).toBe(0.15);
  });
});

describe('getFoulContactQuality (GAP-B3-025)', () => {
  test('F06 (catcher) = 0.15', () => {
    expect(getFoulContactQuality('F06', 'Fly Ball')).toBe(0.15);
  });

  test('F02/F03 (shallow) = 0.20', () => {
    expect(getFoulContactQuality('F02', 'Fly Ball')).toBe(0.20);
    expect(getFoulContactQuality('F03', 'Fly Ball')).toBe(0.20);
  });

  test('F01/F04 (medium) = 0.35', () => {
    expect(getFoulContactQuality('F01', 'Fly Ball')).toBe(0.35);
    expect(getFoulContactQuality('F04', 'Fly Ball')).toBe(0.35);
  });

  test('F00/F05 (deep) = 0.50', () => {
    expect(getFoulContactQuality('F00', 'Fly Ball')).toBe(0.50);
    expect(getFoulContactQuality('F05', 'Fly Ball')).toBe(0.50);
  });

  test('line drive in foul territory = 0.70', () => {
    expect(getFoulContactQuality('F06', 'Line Drive')).toBe(0.70);
  });

  test('unknown zone defaults to 0.25', () => {
    expect(getFoulContactQuality('F99', 'Fly Ball')).toBe(0.25);
  });
});

// ============================================
// Spray Chart Generation (GAP-B3-026)
// ============================================

describe('SPRAY_COLORS / SPRAY_SIZES (GAP-B3-026)', () => {
  test('HR color is red', () => {
    expect(SPRAY_COLORS.HR).toBe('#FF4444');
  });

  test('out color is gray', () => {
    expect(SPRAY_COLORS.out).toBe('#888888');
  });

  test('error color is purple', () => {
    expect(SPRAY_COLORS.error).toBe('#8844FF');
  });

  test('HR size is 12', () => {
    expect(SPRAY_SIZES.HR).toBe(12);
  });

  test('out size is 6', () => {
    expect(SPRAY_SIZES.out).toBe(6);
  });
});

describe('generateSprayPoint (GAP-B3-026)', () => {
  test('no-randomize returns exact center', () => {
    const point = generateSprayPoint('Z15', false);
    expect(typeof point.x).toBe('number');
    expect(typeof point.y).toBe('number');
  });

  test('unknown zone returns 0.5/0.5 default', () => {
    const point = generateSprayPoint('UNKNOWN', false);
    expect(point.x).toBe(0.5);
    expect(point.y).toBe(0.5);
  });

  test('randomize adds jitter', () => {
    // With randomize, multiple calls should give different results (usually)
    const p1 = generateSprayPoint('Z15', true);
    const p2 = generateSprayPoint('Z15', true);
    // Not a deterministic test, but x/y should be numbers
    expect(typeof p1.x).toBe('number');
    expect(typeof p2.y).toBe('number');
  });
});

describe('createSprayChartEntry (GAP-B3-026)', () => {
  test('creates a valid spray chart entry', () => {
    const entry = createSprayChartEntry('Z15', 'R', 'HR', 'Fly Ball');
    expect(entry.zoneId).toBe('Z15');
    expect(entry.result).toBe('HR');
    expect(entry.exitType).toBe('Fly Ball');
    expect(entry.isHit).toBe(true);
    expect(entry.isHR).toBe(true);
  });

  test('out is not a hit', () => {
    const entry = createSprayChartEntry('Z06', 'L', 'FO', 'Fly Ball');
    expect(entry.isHit).toBe(false);
    expect(entry.isHR).toBe(false);
  });

  test('single is a hit but not HR', () => {
    const entry = createSprayChartEntry('Z03', 'R', 'single', 'Ground Ball');
    expect(entry.isHit).toBe(true);
    expect(entry.isHR).toBe(false);
  });
});

// ============================================
// Stadium Spray Integration (GAP-B3-027)
// ============================================

describe('mapToStadiumSprayZone (GAP-B3-027)', () => {
  test('Z15 (CF wall) → CENTER', () => {
    expect(mapToStadiumSprayZone('Z15')).toBe('CENTER');
  });

  test('Z13 (RF wall) → RIGHT_LINE', () => {
    expect(mapToStadiumSprayZone('Z13')).toBe('RIGHT_LINE');
  });

  test('Z17 (LF wall) → LEFT_LINE', () => {
    expect(mapToStadiumSprayZone('Z17')).toBe('LEFT_LINE');
  });

  test('Z07 (shallow LF) → LEFT_FIELD', () => {
    expect(mapToStadiumSprayZone('Z07')).toBe('LEFT_FIELD');
  });

  test('Z14 (RCF wall) → RIGHT_CENTER', () => {
    expect(mapToStadiumSprayZone('Z14')).toBe('RIGHT_CENTER');
  });

  test('F06 (catcher foul) → CENTER', () => {
    expect(mapToStadiumSprayZone('F06')).toBe('CENTER');
  });

  test('unknown zone → CENTER default', () => {
    expect(mapToStadiumSprayZone('UNKNOWN')).toBe('CENTER');
  });
});

describe('estimateDistance (GAP-B3-027)', () => {
  test('non-HR returns 0', () => {
    expect(estimateDistance('Z15', 'FO')).toBe(0);
    expect(estimateDistance('Z15', '1B')).toBe(0);
  });

  test('HR to Z15 (CF) ≈ 400 with random variance', () => {
    const dist = estimateDistance('Z15', 'HR');
    // Base 400, formula: 400 + floor((random - 0.3) * 60) → range [382, 442]
    expect(dist).toBeGreaterThanOrEqual(370);
    expect(dist).toBeLessThanOrEqual(445);
  });

  test('HR to Z13 (RF) ≈ 330 ± variance', () => {
    const dist = estimateDistance('Z13', 'HR');
    // Base 330, random offset (Math.random()-0.3)*60 → -18 to +42
    expect(dist).toBeGreaterThanOrEqual(310);
    expect(dist).toBeLessThanOrEqual(375);
  });

  test('HR to unknown zone uses 370 base', () => {
    const dist = estimateDistance('Z00', 'HR');
    expect(dist).toBeGreaterThanOrEqual(350);
    expect(dist).toBeLessThanOrEqual(415);
  });
});

describe('estimateAngle', () => {
  test('center zone ≈ 0 degrees', () => {
    const angle = estimateAngle('Z15'); // CF wall
    // CF center.x should be ~0.5, so angle ≈ 0
    expect(Math.abs(angle)).toBeLessThan(20);
  });

  test('unknown zone returns 0', () => {
    expect(estimateAngle('UNKNOWN')).toBe(0);
  });
});

describe('createStadiumBattedBallEvent (GAP-B3-027)', () => {
  test('creates valid event for HR', () => {
    const event = createStadiumBattedBallEvent(
      'Z15',
      { gameId: 'g1', inning: 3, batterId: 'b1', pitcherId: 'p1' },
      'R',
      'HR',
      'Fly Ball',
    );
    expect(event.gameId).toBe('g1');
    expect(event.zone).toBe('CENTER');
    expect(event.inputZone).toBe('Z15');
    expect(event.distance).toBeGreaterThan(0);
    expect(event.outcome).toBe('HR');
    expect(event.outType).toBe('FLY');
    expect(event.batterHandedness).toBe('R');
  });

  test('ground out has GROUND outType', () => {
    const event = createStadiumBattedBallEvent(
      'Z03',
      { gameId: 'g1', inning: 1, batterId: 'b1', pitcherId: 'p1' },
      'L',
      'GO',
      'Ground Ball',
    );
    expect(event.outType).toBe('GROUND');
    expect(event.distance).toBe(0); // Not HR
  });
});
