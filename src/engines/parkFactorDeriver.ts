import type { ParkFactors } from '../types/war';
import {
  getParkByName,
  LEAGUE_AVG_DIMENSIONS,
  type ParkDimensions,
  type WallHeight,
} from '../data/parkLookup';

export const MIN_PARK_FACTOR = 0.70;
export const MAX_PARK_FACTOR = 1.30;

const WALL_HEIGHT_ADJUSTMENT: Record<WallHeight, number> = {
  low: 0.03,
  medium: 0,
  high: -0.03,
};

const DEFAULT_PARK_FACTORS: ParkFactors = {
  overall: 1,
  runs: 1,
  homeRuns: 1,
  leftHandedHR: 1,
  rightHandedHR: 1,
  leftHandedAVG: 1,
  rightHandedAVG: 1,
  confidence: 'LOW',
};

export function clampParkFactorValue(value: number): number {
  return Math.max(MIN_PARK_FACTOR, Math.min(MAX_PARK_FACTOR, value));
}

export function clampParkFactors(factors: ParkFactors): ParkFactors {
  return {
    ...factors,
    overall: clampParkFactorValue(factors.overall),
    runs: clampParkFactorValue(factors.runs),
    homeRuns: clampParkFactorValue(factors.homeRuns),
    leftHandedHR: clampParkFactorValue(factors.leftHandedHR),
    rightHandedHR: clampParkFactorValue(factors.rightHandedHR),
    leftHandedAVG: clampParkFactorValue(factors.leftHandedAVG),
    rightHandedAVG: clampParkFactorValue(factors.rightHandedAVG),
  };
}

function averageFenceRatio(park: ParkDimensions, avg: typeof LEAGUE_AVG_DIMENSIONS): number {
  return (
    avg.lf / park.lf +
    avg.cf / park.cf +
    avg.rf / park.rf
  ) / 3;
}

function averageWallAdjustment(park: ParkDimensions): number {
  return (
    WALL_HEIGHT_ADJUSTMENT[park.lfWall] +
    WALL_HEIGHT_ADJUSTMENT[park.cfWall] +
    WALL_HEIGHT_ADJUSTMENT[park.rfWall]
  ) / 3;
}

function buildFromPark(park: ParkDimensions): ParkFactors {
  const ratio = averageFenceRatio(park, LEAGUE_AVG_DIMENSIONS);
  const wallAdjustment = averageWallAdjustment(park);
  const hrFactor = clampParkFactorValue(ratio + wallAdjustment);

  // TODO: Future: break ParkFactors into per-direction factors (LF/CF/RF) to
  // support direction-aware HR park adjustments. Current approach collapses
  // directional data into aggregate factors.

  return clampParkFactors({
    overall: hrFactor,
    runs: hrFactor,
    homeRuns: hrFactor,
    leftHandedHR: hrFactor,
    rightHandedHR: hrFactor,
    leftHandedAVG: 1,
    rightHandedAVG: 1,
    confidence: 'LOW',
  });
}

export function deriveParkFactorsFromStadium(stadiumName?: string): ParkFactors {
  const derived = getDerivedParkFactorsIfAvailable(stadiumName);
  return derived ?? DEFAULT_PARK_FACTORS;
}

export function getDerivedParkFactorsIfAvailable(stadiumName?: string): ParkFactors | undefined {
  if (!stadiumName) return undefined;

  const park = getParkByName(stadiumName);
  if (!park) return undefined;

  return buildFromPark(park);
}

export function getDerivedParkFactorForStadium(stadiumName?: string): number {
  return deriveParkFactorsFromStadium(stadiumName).overall;
}
