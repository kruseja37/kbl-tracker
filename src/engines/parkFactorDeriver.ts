import type { ParkFactors } from '../types/war';
import {
  getParkByName,
  getStableParkId,
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
  stadiumId: 'unavailable',
  stadiumName: 'Unavailable',
  overall: 1,
  runs: 1,
  homeRuns: 1,
  hits: 1,
  doubles: 1,
  triples: 1,
  strikeouts: 1,
  walks: 1,
  leftHandedHR: 1,
  rightHandedHR: 1,
  leftHandedAVG: 1,
  rightHandedAVG: 1,
  gamesIncluded: 0,
  lastUpdated: 'seed',
  confidence: 'LOW',
  source: 'UNAVAILABLE',
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
    hits: factors.hits == null ? factors.hits : clampParkFactorValue(factors.hits),
    doubles: factors.doubles == null ? factors.doubles : clampParkFactorValue(factors.doubles),
    triples: factors.triples == null ? factors.triples : clampParkFactorValue(factors.triples),
    strikeouts: factors.strikeouts == null ? factors.strikeouts : clampParkFactorValue(factors.strikeouts),
    walks: factors.walks == null ? factors.walks : clampParkFactorValue(factors.walks),
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
  const hitFactor = clampParkFactorValue(1 + ((ratio - 1) * 0.25));
  const doublesTriplesFactor = clampParkFactorValue(1 + ((LEAGUE_AVG_DIMENSIONS.cf / park.cf) - 1) * -0.25);

  // TODO: Future: break ParkFactors into per-direction factors (LF/CF/RF) to
  // support direction-aware HR park adjustments. Current approach collapses
  // directional data into aggregate factors.

  return clampParkFactors({
    stadiumId: getStableParkId(park.name),
    stadiumName: park.name,
    overall: hrFactor,
    runs: clampParkFactorValue((hrFactor * 0.55) + (hitFactor * 0.45)),
    homeRuns: hrFactor,
    hits: hitFactor,
    doubles: doublesTriplesFactor,
    triples: doublesTriplesFactor,
    strikeouts: 1,
    walks: 1,
    leftHandedHR: hrFactor,
    rightHandedHR: hrFactor,
    leftHandedAVG: hitFactor,
    rightHandedAVG: hitFactor,
    gamesIncluded: 0,
    lastUpdated: 'seed',
    confidence: 'LOW',
    source: 'SEED',
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

export function isParkFactorAdjustmentActive(gamesPlayed: number, gamesPerSeason: number): boolean {
  if (gamesPerSeason <= 0) return false;
  return gamesPlayed / gamesPerSeason >= 0.40;
}
