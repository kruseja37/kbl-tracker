import type { FranchiseDesignationType } from '../utils/franchiseDesignations';
import { FAME_TUNING } from './fameModel';

/**
 * §20.6 Channel B + Channel A — designation -> fan-morale sentiment.
 *
 * Channel B is the steady per-game sentiment from a HELD designation. DOUBLE-
 * COUNT GUARD: Albatross steady sentiment is 0 here because the §13 flashpoint-
 * decay system (L5b/L7a) already delivers the Albatross "ongoing irritation,
 * compounding" tax. This engine's Channel-B contribution is the Fan Favorite
 * ongoing warmth that the negative-player flashpoint tax does not cover.
 *
 * Channel A ships only the pure designation-tilt multiplier. The full per-play
 * formula `base swing × fame × designation-tilt` is NOT wired: live fame is dark
 * (L6 flag OFF) and there is no live per-play fan-morale swing pipeline. Wiring
 * a real per-play swing by fame × this tilt is a post-D13 activation seam.
 *
 * Channel-B wiring is also deferred. It mutates the SMB4 morale asset, needs
 * per-game idempotency, and must enumerate HELD designations per game. At
 * activation, `processCompletedGame` would fire
 * `computeDesignationSteadyFanSentiment` once per game for each team's HELD Fan
 * Favorite (gated by `isFranchisePhase2MoraleEnabled`, idempotent via a
 * game-keyed sourceEventId), and explicitly NOT for Albatross because the §13
 * flashpoint system owns that irritation. This mirrors L7b deferring its
 * fame-store wiring.
 */
export type DesignationSwingDirection = 'up' | 'down';

export interface DesignationSwingTiltTuning {
  up: number;
  down: number;
}

export interface DesignationFanMoraleTuning {
  steadySentimentByType: Record<FranchiseDesignationType, number>;
  swingTiltByType: Record<FranchiseDesignationType, DesignationSwingTiltTuning>;
  fameVolume: {
    k: number;
    cap: number;
    scaleRef: number;
  };
}

// §16 SIM-TUNE placeholders — shape locked, values owned by the Simulation Gate.
export const DESIGNATION_FAN_MORALE_TUNING: DesignationFanMoraleTuning = {
  steadySentimentByType: {
    FAN_FAVORITE: 0.5,
    ALBATROSS: 0,
    TEAM_MVP: 0,
    ACE: 0,
  },
  swingTiltByType: {
    FAN_FAVORITE: { up: 1.25, down: 1.0 },
    ALBATROSS: { up: 1.0, down: 1.25 },
    TEAM_MVP: { up: 1.0, down: 1.0 },
    ACE: { up: 1.0, down: 1.0 },
  },
  fameVolume: {
    k: 1,
    cap: 1,
    scaleRef: FAME_TUNING.heat.max,
  },
};

export interface DesignationSteadyFanSentimentResult {
  type: FranchiseDesignationType;
  sentiment: number;
  sign: 'positive' | 'negative' | 'neutral';
  reason: string;
}

export interface DesignationSwingTiltResult {
  type: FranchiseDesignationType;
  swingDirection: DesignationSwingDirection;
  tilt: number;
  reason: string;
}

export function computeDesignationSteadyFanSentiment(
  type: FranchiseDesignationType,
  config: DesignationFanMoraleTuning = DESIGNATION_FAN_MORALE_TUNING,
): DesignationSteadyFanSentimentResult {
  const sentiment = config.steadySentimentByType[type];

  return {
    type,
    sentiment,
    sign: getSentimentSign(sentiment),
    reason: getSteadySentimentReason(type),
  };
}

export function summarizeDesignationSteadyFanSentiment(
  types: FranchiseDesignationType[],
  config: DesignationFanMoraleTuning = DESIGNATION_FAN_MORALE_TUNING,
): {
  totalSentiment: number;
  perType: Array<{ type: FranchiseDesignationType; sentiment: number }>;
} {
  const perType = types.map((type) => ({
    type,
    sentiment: config.steadySentimentByType[type],
  }));

  return {
    totalSentiment: perType.reduce((total, item) => total + item.sentiment, 0),
    perType,
  };
}

export function computeDesignationSwingTilt(
  type: FranchiseDesignationType,
  swingDirection: DesignationSwingDirection,
  config: DesignationFanMoraleTuning = DESIGNATION_FAN_MORALE_TUNING,
): DesignationSwingTiltResult {
  const tilt = config.swingTiltByType[type][swingDirection];

  return {
    type,
    swingDirection,
    tilt,
    reason: getSwingTiltReason(tilt),
  };
}

export function applyDesignationSwingTilt(
  type: FranchiseDesignationType,
  baseSwing: number,
  config: DesignationFanMoraleTuning = DESIGNATION_FAN_MORALE_TUNING,
): number {
  if (baseSwing === 0) {
    return 0;
  }

  const swingDirection: DesignationSwingDirection = baseSwing >= 0 ? 'up' : 'down';
  const tilt = config.swingTiltByType[type][swingDirection];

  return baseSwing * tilt;
}

export function computeFameVolume(
  heat: number,
  config: DesignationFanMoraleTuning = DESIGNATION_FAN_MORALE_TUNING,
): number {
  const finiteHeat = Number.isFinite(heat) ? heat : FAME_TUNING.heat.neutral;
  const scaleRef = Math.max(1, Math.abs(config.fameVolume.scaleRef));
  const notability = Math.abs(finiteHeat - FAME_TUNING.heat.neutral);
  const cappedAmplifier = clamp(
    (config.fameVolume.k * notability) / scaleRef,
    0,
    config.fameVolume.cap,
  );

  return 1 + cappedAmplifier;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function getSentimentSign(
  sentiment: number,
): DesignationSteadyFanSentimentResult['sign'] {
  if (sentiment > 0) {
    return 'positive';
  }

  if (sentiment < 0) {
    return 'negative';
  }

  return 'neutral';
}

function getSteadySentimentReason(type: FranchiseDesignationType): string {
  switch (type) {
    case 'FAN_FAVORITE':
      return 'designation_fan_morale.fan_favorite_warmth';
    case 'ALBATROSS':
      return 'designation_fan_morale.albatross_irritation_via_flashpoint';
    case 'TEAM_MVP':
    case 'ACE':
      return 'designation_fan_morale.merit_neutral';
  }
}

function getSwingTiltReason(tilt: number): string {
  if (tilt > 1) {
    return 'designation_fan_morale.swing_amplified';
  }

  if (tilt < 1) {
    return 'designation_fan_morale.swing_damped';
  }

  return 'designation_fan_morale.swing_neutral';
}
