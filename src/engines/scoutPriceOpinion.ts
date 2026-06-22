import type { Grade } from './gradeEngine';

const GRADE_LADDER: readonly Grade[] = ['S', 'A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C', 'C-', 'D+', 'D'];
const SCOUT_PRICE_BIAS_MAX = 0.3;
const BIAS_FLOOR = 0.01;

export function gradeToTwentyEighty(grade: Grade): number {
  const index = GRADE_LADDER.indexOf(grade);
  if (index < 0) return 50;

  const value = Math.round(80 - index * (60 / (GRADE_LADDER.length - 1)));
  return clamp(value, 20, 80);
}

export function scoutPriceOpinion(input: {
  trueIV: number;
  scoutAccuracy: number;
  scoutId?: string;
  candidateId: string;
  seed: string;
}): number {
  const { trueIV, scoutAccuracy, scoutId, candidateId, seed } = input;
  if (!Number.isFinite(trueIV) || trueIV <= 0) return trueIV;

  const u = seededUnit(`${seed}:price-bias:${scoutId ?? 'default'}:${candidateId}`);
  const signed = u * 2 - 1;
  const sign = signed < 0 ? -1 : 1;
  const rawAccuracy = Number.isFinite(scoutAccuracy) ? scoutAccuracy : 0;
  const magnitude = SCOUT_PRICE_BIAS_MAX * (1 - clamp(rawAccuracy / 100, 0, 1));
  const biasMagnitude = Math.max(Math.abs(signed * magnitude), BIAS_FLOOR);
  const bias = sign * biasMagnitude;

  return trueIV * (1 + bias);
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
