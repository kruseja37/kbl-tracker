import { SCOUT_NOISE_BASE } from '../data/rosterEngineConstants';

export interface ScoutValueRange {
  w: number;
  low: number;
  high: number;
  displayedEstimate: number;
}

const DISPLAY_EPSILON_RATIO = 1e-9;

export function perceivedValueRange(
  trueIV: number,
  scoutAccuracy: number,
  seed: string,
): ScoutValueRange {
  if (!Number.isFinite(trueIV) || trueIV <= 0) {
    throw new Error('perceivedValueRange requires a positive finite trueIV.');
  }

  const acc01 = clamp(scoutAccuracy / 100, 0, 1);
  const w = SCOUT_NOISE_BASE * (1 - acc01);
  const low = trueIV * (1 - w);
  const high = trueIV * (1 + w);
  const jitter = seededUnit(seed) * w * 2 - w;
  const displayedEstimate = forceOpenObscuredEstimate(trueIV * (1 + jitter), trueIV, low, high);

  return {
    w,
    low,
    high,
    displayedEstimate,
  };
}

function forceOpenObscuredEstimate(value: number, trueIV: number, low: number, high: number): number {
  if (high <= low) return trueIV;

  const epsilon = Math.max(Number.EPSILON, Math.abs(trueIV) * DISPLAY_EPSILON_RATIO);
  const openLow = low + epsilon;
  const openHigh = high - epsilon;
  const clamped = clamp(value, openLow, openHigh);

  if (clamped !== trueIV) return clamped;

  const nudgedUp = trueIV + epsilon;
  if (nudgedUp < high) return nudgedUp;
  return trueIV - epsilon;
}

function seededUnit(seed: string): number {
  return hashString(seed) / 0xffffffff;
}

function hashString(value: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
