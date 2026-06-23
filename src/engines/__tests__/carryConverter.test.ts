import { describe, expect, test } from 'vitest';

import { computeBattedBallCarry } from '../carryConverter';
import type { ParkDimensions } from '../../data/parkLookup';

const CX = 100;
const CY = 115;
const MAX_R = 110;
const SVG_TO_NORMALIZED_X = 2;
const SVG_TO_NORMALIZED_Y = 1.2;

const testPark: ParkDimensions = {
  name: 'Carry Test Park',
  lf: 330,
  lfWall: 'medium',
  cf: 410,
  cfWall: 'high',
  rf: 315,
  rfWall: 'low',
};

function pointAt(radiusPx: number, uiDeg: number): { x: number; y: number } {
  const angle = uiDeg * Math.PI / 180;
  const svgX = CX + radiusPx * Math.cos(angle);
  const svgY = CY + radiusPx * Math.sin(angle);

  return {
    x: svgX / SVG_TO_NORMALIZED_X,
    y: svgY / SVG_TO_NORMALIZED_Y,
  };
}

describe('computeBattedBallCarry A1.5b', () => {
  test('model fence straight-up maps to r=1.0, Center, and the park CF distance', () => {
    const result = computeBattedBallCarry({
      ballLocation: pointAt(MAX_R, 270),
      park: testPark,
      outcome: 'FO',
      outCode: 'FO',
    });

    expect(result.r).toBeCloseTo(1, 6);
    expect(result.direction).toBe('Center');
    expect(result.eligible).toBe(true);
    expect(result.source).toBe('computed');
    expect(result.carryFeet).toBeCloseTo(testPark.cf, 6);
  });

  test('IF boundary is pinned at r=0.45 and a hit there is ineligible for carry', () => {
    const result = computeBattedBallCarry({
      ballLocation: pointAt(0.45 * MAX_R, 270),
      park: testPark,
      outcome: '1B',
    });

    expect(result.r).toBeCloseTo(0.45, 6);
    expect(result.direction).toBe('Center');
    expect(result.eligible).toBe(false);
    expect(result.carryFeet).toBeNull();
    expect(result.reason).toBe('infield-landing');
  });

  test('LF and RF foul-line edges are fair and interpolate to LF/RF fence distances', () => {
    const leftEdge = computeBattedBallCarry({
      ballLocation: pointAt(MAX_R, 228),
      park: testPark,
      outcome: 'FO',
      outCode: 'FO',
    });
    const rightEdge = computeBattedBallCarry({
      ballLocation: pointAt(MAX_R, 312),
      park: testPark,
      outcome: 'FO',
      outCode: 'FO',
    });

    expect(leftEdge.direction).toBe('Left');
    expect(leftEdge.eligible).toBe(true);
    expect(leftEdge.carryFeet).toBeCloseTo(testPark.lf, 6);
    expect(rightEdge.direction).toBe('Right');
    expect(rightEdge.eligible).toBe(true);
    expect(rightEdge.carryFeet).toBeCloseTo(testPark.rf, 6);
  });

  test('just outside the foul-line fan is Foul and ineligible', () => {
    const leftFoul = computeBattedBallCarry({
      ballLocation: pointAt(MAX_R, 227),
      park: testPark,
      outcome: 'FO',
      outCode: 'FO',
    });
    const rightFoul = computeBattedBallCarry({
      ballLocation: pointAt(MAX_R, 313),
      park: testPark,
      outcome: 'FO',
      outCode: 'FO',
    });

    expect(leftFoul.direction).toBe('Foul');
    expect(leftFoul.eligible).toBe(false);
    expect(leftFoul.carryFeet).toBeNull();
    expect(rightFoul.direction).toBe('Foul');
    expect(rightFoul.eligible).toBe(false);
    expect(rightFoul.carryFeet).toBeNull();
  });

  test('HR carry uses only the user-entered distance and never computes a park distance', () => {
    const ballLocation = pointAt(MAX_R, 270);

    const entered = computeBattedBallCarry({
      ballLocation,
      park: testPark,
      outcome: 'HR',
      hrDistance: 445,
    });
    const missing = computeBattedBallCarry({
      ballLocation,
      park: testPark,
      outcome: 'HR',
      hrDistance: null,
    });

    expect(entered.eligible).toBe(true);
    expect(entered.source).toBe('user-entered');
    expect(entered.carryFeet).toBe(445);
    expect(entered.carryFeet).not.toBe(testPark.cf);
    expect(missing.eligible).toBe(false);
    expect(missing.source).toBe('none');
    expect(missing.carryFeet).toBeNull();
    expect(missing.reason).toBe('hr-distance-missing');
  });

  test('field-leak documented drift: drawn CF fence apex is r=0.909, not model fence r=1.0', () => {
    // field-leak: drawn fence != model fence; A1.5b-2 (deferred UI re-derivation)
    // fixes the drawn markers; until then this converter is build-dark and unwired.
    const drawnCfFenceApex = { x: 100 / SVG_TO_NORMALIZED_X, y: 15 / SVG_TO_NORMALIZED_Y };

    const result = computeBattedBallCarry({
      ballLocation: drawnCfFenceApex,
      park: testPark,
      outcome: 'FO',
      outCode: 'FO',
    });

    expect(result.direction).toBe('Center');
    expect(result.r).toBeCloseTo(100 / MAX_R, 6);
    expect(result.r).not.toBeCloseTo(1, 3);
  });

  test('anisotropic round-trip preserves model angles before direction bucketing', () => {
    const pureUp = computeBattedBallCarry({
      ballLocation: pointAt(MAX_R, 270),
      park: testPark,
      outcome: 'FO',
      outCode: 'FO',
    });
    const leftCenterByModel = computeBattedBallCarry({
      ballLocation: pointAt(MAX_R, 260),
      park: testPark,
      outcome: 'FO',
      outCode: 'FO',
    });

    expect(pureUp.direction).toBe('Center');
    expect(leftCenterByModel.direction).toBe('Left-Center');
  });

  test('non-HR air-ball carry is capped at the wall', () => {
    const result = computeBattedBallCarry({
      ballLocation: pointAt(MAX_R * 1.15, 270),
      park: testPark,
      outcome: 'FO',
      outCode: 'FO',
    });

    expect(result.r).toBeCloseTo(1.15, 6);
    expect(result.carryFeet).toBeCloseTo(testPark.cf, 6);
  });

  test('grounders, pop-ups, and foul-outs do not produce carry', () => {
    const fairOutfield = pointAt(MAX_R * 0.8, 270);

    expect(computeBattedBallCarry({
      ballLocation: fairOutfield,
      park: testPark,
      outcome: 'GO',
      outCode: 'GO',
    })).toMatchObject({ eligible: false, carryFeet: null, source: 'none', reason: 'ground-ball' });

    expect(computeBattedBallCarry({
      ballLocation: fairOutfield,
      park: testPark,
      outcome: 'PO',
      outCode: 'PO',
    })).toMatchObject({ eligible: false, carryFeet: null, source: 'none', reason: 'pop-up' });

    expect(computeBattedBallCarry({
      ballLocation: fairOutfield,
      park: testPark,
      outcome: 'FLO',
      outCode: 'FLO',
    })).toMatchObject({ eligible: false, carryFeet: null, source: 'none', reason: 'foul-out' });
  });
});
