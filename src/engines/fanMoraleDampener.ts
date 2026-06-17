import type { CanonicalPersonality } from './masterMoraleMatrix';
import type { HiddenModifiers } from '../types/game';

export interface FanDampenerTuning {
  baseStrength: number;
  neutralMorale: number;
  maxDampen: number;
  personalityMultiplier: Record<CanonicalPersonality, { down: number; up: number }>;
  loyaltyAmplification: { atZero: number; atFull: number };
  resilienceWeight: { atZero: number; atFull: number };
  ambitionWeight: { atZero: number; atFull: number };
}

// §16 SIM-TUNE placeholders — shape locked, values owned by the Simulation Gate.
export const FAN_DAMPENER_TUNING: FanDampenerTuning = {
  baseStrength: 0.6,
  neutralMorale: 50,
  maxDampen: 0.9,
  personalityMultiplier: {
    COMPETITIVE: { down: 1.0, up: 1.0 },
    TOUGH: { down: 1.0, up: 1.0 },
    RELAXED: { down: 1.15, up: 1.15 },
    JOLLY: { down: 1.15, up: 1.15 },
    TIMID: { down: 0.85, up: 0.85 },
    EGOTISTICAL: { down: 0.5, up: 0.5 },
    DROOPY: { down: 0.7, up: 0.5 },
  },
  loyaltyAmplification: { atZero: 1.0, atFull: 1.4 },
  resilienceWeight: { atZero: 0.6, atFull: 1.0 },
  ambitionWeight: { atZero: 0.6, atFull: 1.0 },
};

export interface FanDampenerResult {
  dampenedDelta: number;
  applied: boolean;
  dampenStrength: number;
  direction: 'with-trend' | 'counter-trend-up' | 'counter-trend-down';
  reason: string;
}

type CounterTrendDirection = FanDampenerResult['direction'];

export function applyFanMoraleDampener(
  ratingDelta: number,
  teamFanMorale: number,
  personality: CanonicalPersonality,
  modifiers: Pick<HiddenModifiers, 'loyalty' | 'ambition' | 'resilience'>,
  config: FanDampenerTuning = FAN_DAMPENER_TUNING,
): FanDampenerResult {
  const direction = classifyCounterTrend(ratingDelta, teamFanMorale, config.neutralMorale);

  if (direction === 'with-trend') {
    return {
      dampenedDelta: ratingDelta,
      applied: false,
      dampenStrength: 0,
      direction,
      reason: 'fan_morale_dampener.with_trend_or_zero_delta',
    };
  }

  const isDown = direction === 'counter-trend-down';
  const moraleDistance = getMoraleDistance(teamFanMorale, config.neutralMorale);
  const personalityMultiplier = config.personalityMultiplier[personality][isDown ? 'down' : 'up'];
  const modifierWeight = isDown
    ? lerp01(config.resilienceWeight, modifiers.resilience)
    : lerp01(config.ambitionWeight, modifiers.ambition);
  const loyaltyAmp = lerp01(config.loyaltyAmplification, modifiers.loyalty);
  const dampenStrength = clamp(
    config.baseStrength * moraleDistance * personalityMultiplier * modifierWeight * loyaltyAmp,
    0,
    config.maxDampen,
  );

  return {
    dampenedDelta: ratingDelta * (1 - dampenStrength),
    applied: true,
    dampenStrength,
    direction,
    reason: isDown
      ? 'fan_morale_dampener.high_morale_softens_counter_trend_drop'
      : 'fan_morale_dampener.low_morale_softens_counter_trend_gain',
  };
}

function classifyCounterTrend(
  ratingDelta: number,
  teamFanMorale: number,
  neutralMorale: number,
): CounterTrendDirection {
  if (ratingDelta === 0) {
    return 'with-trend';
  }

  const teamTrend = teamFanMorale >= neutralMorale ? 'positive' : 'negative';

  if (teamTrend === 'positive' && ratingDelta < 0) {
    return 'counter-trend-down';
  }

  if (teamTrend === 'negative' && ratingDelta > 0) {
    return 'counter-trend-up';
  }

  return 'with-trend';
}

function getMoraleDistance(teamFanMorale: number, neutralMorale: number): number {
  if (neutralMorale <= 0) {
    return 0;
  }

  return Math.min(1, Math.abs(teamFanMorale - neutralMorale) / neutralMorale);
}

function lerp01(range: { atZero: number; atFull: number }, value0to100: number): number {
  const normalized = clamp(value0to100 / 100, 0, 1);

  return range.atZero + ((range.atFull - range.atZero) * normalized);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
