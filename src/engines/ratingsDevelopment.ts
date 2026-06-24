import { applyFanMoraleDampener } from './fanMoraleDampener';
import type { FanDampenerResult } from './fanMoraleDampener';
import type { CanonicalPersonality } from './masterMoraleMatrix';
import type { HiddenModifiers } from '../types/game';

/**
 * §8 / §9 ratings-development DEV-MATH.
 *
 * This is the pure checkpoint math only. It accepts an already-normalized
 * performance signal in [-1, 1] for `computeCheckpointRatingDevelopment`;
 * L8b owns the checkpoint sweep, upstream performance aggregation, and the
 * L2 overlay writer.
 *
 * DEFAULTS-TAKEN: the spec is silent on the raw delta formula, so the raw
 * signed move is on-field performance × the player's own morale alignment.
 * High player morale amplifies gains and shrugs off drops; low player morale
 * shrinks gains and deepens drops. Team fan morale is consumed only by the
 * L5a dampener.
 *
 * The dampener is CONSUMED, not rebuilt: it already owns the §8 personality
 * table, Ambition on up-moves, Resilience on down-moves, and Loyalty
 * amplification. This engine never separately multiplies by personality,
 * ambition, resilience, or loyalty, which avoids double-counting.
 *
 * RATINGS only, never TRAITS. Raises the ceiling, never TV. All magnitudes
 * are §16 Simulation-Gate placeholders in RATINGS_DEVELOPMENT_TUNING.
 * Checkpoint-sweep compute and overlay-writer wiring are deferred to L8b.
 * Build-dark.
 */

export interface RatingsDevelopmentTuning {
  baseDeltaScale: number;
  performanceSignalScale: number;
  neutralMorale: number;
  moraleWeightUp: number;
  moraleWeightDown: number;
  moraleMultiplierMin: number;
  moraleMultiplierMax: number;
  shiftThreshold: number;
  maxAbsDelta: number;
}

// §16 SIM-TUNE placeholders — shape locked, numbers owned by the Simulation Gate.
export const RATINGS_DEVELOPMENT_TUNING: RatingsDevelopmentTuning = {
  baseDeltaScale: 3,
  // Placeholder: raw TV-delta magnitude that maps to a full +/-1 signal.
  performanceSignalScale: 10,
  neutralMorale: 50,
  moraleWeightUp: 0.4,
  moraleWeightDown: 0.4,
  moraleMultiplierMin: 0.5,
  moraleMultiplierMax: 1.5,
  shiftThreshold: 0.75,
  maxAbsDelta: 6,
};

export interface CheckpointRatingDevelopmentInput {
  ratingKey: string;
  baseRatingValue: number;
  performanceSignal: number;
  confidence?: number;
  playerMorale: number;
  teamFanMorale: number;
  personality: CanonicalPersonality;
  modifiers: Pick<HiddenModifiers, 'loyalty' | 'ambition' | 'resilience'>;
}

export interface CheckpointRatingDevelopmentResult {
  ratingKey: string;
  rawDelta: number;
  dampenedDelta: number;
  appliedDelta: number;
  proposedRating: number;
  shouldShift: boolean;
  direction: 'up' | 'down' | 'none';
  dampener: FanDampenerResult;
  reason: string;
}

export function normalizePerformanceSignal(
  rawPerformance: number,
  tuning: RatingsDevelopmentTuning = RATINGS_DEVELOPMENT_TUNING,
): number {
  return clamp(rawPerformance / tuning.performanceSignalScale, -1, 1);
}

export function computeRawRatingDelta(
  input: { performanceSignal: number; playerMorale: number },
  tuning: RatingsDevelopmentTuning = RATINGS_DEVELOPMENT_TUNING,
): number {
  const performanceSignal = clamp(input.performanceSignal, -1, 1);
  const centeredMorale =
    (clamp(input.playerMorale, 0, 100) - tuning.neutralMorale) / tuning.neutralMorale;
  const moraleMultiplier =
    performanceSignal >= 0
      ? 1 + (centeredMorale * tuning.moraleWeightUp)
      : 1 - (centeredMorale * tuning.moraleWeightDown);
  const clampedMultiplier = clamp(
    moraleMultiplier,
    tuning.moraleMultiplierMin,
    tuning.moraleMultiplierMax,
  );

  return tuning.baseDeltaScale * performanceSignal * clampedMultiplier;
}

export function computeCheckpointRatingDevelopment(
  input: CheckpointRatingDevelopmentInput,
  tuning: RatingsDevelopmentTuning = RATINGS_DEVELOPMENT_TUNING,
): CheckpointRatingDevelopmentResult {
  const rawDelta = computeRawRatingDelta(
    {
      performanceSignal: input.performanceSignal,
      playerMorale: input.playerMorale,
    },
    tuning,
  );
  const cappedRaw = clamp(rawDelta, -tuning.maxAbsDelta, tuning.maxAbsDelta);
  const confidenceScaled = cappedRaw * clamp(input.confidence ?? 1, 0, 1);
  const dampener = applyFanMoraleDampener(
    confidenceScaled,
    input.teamFanMorale,
    input.personality,
    input.modifiers,
  );
  const dampenedDelta = dampener.dampenedDelta;
  const proposedRating = clamp(
    Math.round(input.baseRatingValue + dampenedDelta),
    0,
    99,
  );
  const appliedDelta = proposedRating - input.baseRatingValue;
  const shouldShift =
    Math.abs(dampenedDelta) >= tuning.shiftThreshold && appliedDelta !== 0;
  const direction =
    appliedDelta > 0 ? 'up' : appliedDelta < 0 ? 'down' : 'none';

  return {
    ratingKey: input.ratingKey,
    rawDelta,
    dampenedDelta,
    appliedDelta,
    proposedRating,
    shouldShift,
    direction,
    dampener,
    reason: shouldShift
      ? `ratings_development.shift_${direction}`
      : `ratings_development.no_shift_${direction}`,
  };
}

function clamp(amount: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, amount));
}
