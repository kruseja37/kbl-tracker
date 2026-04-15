import type { ReporterPersonality } from "../types/reporter";

export type MoodLabel = "euphoric" | "optimistic" | "neutral" | "frustrated" | "bitter";

export type MoodEnergyModifier = "subdued" | "normal" | "elevated" | "electric";

export interface MoodState {
  baseMood: ReporterPersonality;
  currentMood: ReporterPersonality;
  moodMomentum: number;
  moodScore: number;
  driftScore: number;
  energyModifier: MoodEnergyModifier;
  driftActive: boolean;
  driftExpiresAfterAtBats: number;
}

export const INITIAL_MOOD_STATE: MoodState = {
  baseMood: "BALANCED",
  currentMood: "BALANCED",
  moodMomentum: 0,
  moodScore: 0,
  driftScore: 0,
  energyModifier: "normal",
  driftActive: false,
  driftExpiresAfterAtBats: 0,
};

export type MoodDriftEvent =
  | {
      type: "HOME_PITCHER_STRIKEOUT_STREAK";
      consecutiveStrikeouts: number;
    }
  | {
      type: "HOME_TEAM_DOWN_BIG";
      homeDeficit: number;
    }
  | {
      type: "WALK_OFF_SITUATION";
      inning: number;
      halfInning: "TOP" | "BOTTOM";
      totalInnings?: number;
      tyingOrGoAheadRunOnBase: boolean;
    }
  | {
      type: "BLOWOUT_LEAD";
      homeLead: number;
    }
  | {
      type: "RIVALRY_CLOSE_GAME";
      rivalryIntensity: number;
      scoreDifferential: number;
    }
  | {
      type: "HOME_TEAM_RALLY";
      consecutiveHits: number;
    }
  | {
      type: "HOME_TEAM_CRUCIAL_ERROR";
      isCrucial: boolean;
    }
  | {
      type: "NEUTRAL_AT_BAT";
    };

interface TriggerEffect {
  targetMoods: ReporterPersonality[];
  momentumDelta: number;
  moodScoreDelta: number;
  driftPressure: number;
  driftExpiresAfterAtBats: number;
}

const DRIFT_PRESSURE_PER_TRIGGER = 0.2;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function moveOneStepTowardZero(value: number): number {
  if (value > 0) return value - 1;
  if (value < 0) return value + 1;
  return 0;
}

function resolveEnergyModifier(momentum: number): MoodEnergyModifier {
  if (momentum >= 5) return "electric";
  if (momentum > 3) return "elevated";
  if (momentum < -3) return "subdued";
  return "normal";
}

function normalizeState(state: MoodState): MoodState {
  return {
    ...state,
    moodMomentum: clamp(state.moodMomentum, -5, 5),
    moodScore: clamp(state.moodScore, -5, 5),
    driftScore: clamp(state.driftScore, 0, 1),
    energyModifier: resolveEnergyModifier(state.moodMomentum),
    driftActive: state.driftScore >= 1 && state.driftExpiresAfterAtBats > 0,
    currentMood:
      state.driftScore >= 1 && state.driftExpiresAfterAtBats > 0
        ? state.currentMood
        : state.baseMood,
  };
}

function getTriggeredEffect(event: MoodDriftEvent): TriggerEffect | null {
  switch (event.type) {
    case "HOME_PITCHER_STRIKEOUT_STREAK":
      return event.consecutiveStrikeouts >= 3
        ? {
            targetMoods: ["DRAMATIC", "OPTIMIST"],
            momentumDelta: 2,
            moodScoreDelta: 1.5,
            driftPressure: DRIFT_PRESSURE_PER_TRIGGER,
            driftExpiresAfterAtBats: 2,
          }
        : null;

    case "HOME_TEAM_DOWN_BIG":
      return event.homeDeficit >= 6
        ? {
            targetMoods: ["PESSIMIST", "CONTRARIAN"],
            momentumDelta: -2,
            moodScoreDelta: -2,
            driftPressure: DRIFT_PRESSURE_PER_TRIGGER,
            driftExpiresAfterAtBats: 2,
          }
        : null;

    case "WALK_OFF_SITUATION":
      return event.halfInning === "BOTTOM" &&
        event.inning >= (event.totalInnings ?? 9) &&
        event.tyingOrGoAheadRunOnBase
        ? {
            targetMoods: ["DRAMATIC"],
            momentumDelta: 2,
            moodScoreDelta: 2,
            driftPressure: DRIFT_PRESSURE_PER_TRIGGER,
            driftExpiresAfterAtBats: 2,
          }
        : null;

    case "BLOWOUT_LEAD":
      return event.homeLead >= 8
        ? {
            targetMoods: ["BALANCED", "ANALYTICAL"],
            momentumDelta: -1,
            moodScoreDelta: -0.5,
            driftPressure: DRIFT_PRESSURE_PER_TRIGGER,
            driftExpiresAfterAtBats: 1,
          }
        : null;

    case "RIVALRY_CLOSE_GAME":
      return event.rivalryIntensity > 0 && Math.abs(event.scoreDifferential) <= 2
        ? {
            targetMoods: ["HOMER", "CONTRARIAN"],
            momentumDelta: event.rivalryIntensity >= 8 ? 2 : 1,
            moodScoreDelta: event.rivalryIntensity >= 8 ? 1.5 : 1,
            driftPressure: DRIFT_PRESSURE_PER_TRIGGER,
            driftExpiresAfterAtBats: 2,
          }
        : null;

    case "HOME_TEAM_RALLY":
      return event.consecutiveHits >= 3
        ? {
            targetMoods: ["OPTIMIST", "DRAMATIC"],
            momentumDelta: 3,
            moodScoreDelta: 2.5,
            driftPressure: DRIFT_PRESSURE_PER_TRIGGER,
            driftExpiresAfterAtBats: 3,
          }
        : null;

    case "HOME_TEAM_CRUCIAL_ERROR":
      return event.isCrucial
        ? {
            targetMoods: ["PESSIMIST", "HOT_TAKE"],
            momentumDelta: -3,
            moodScoreDelta: -2.5,
            driftPressure: DRIFT_PRESSURE_PER_TRIGGER,
            driftExpiresAfterAtBats: 3,
          }
        : null;

    case "NEUTRAL_AT_BAT":
      return null;
  }
}

export function decayMomentum(state: MoodState): MoodState {
  const nextExpires = Math.max(0, state.driftExpiresAfterAtBats - 1);
  const nextDriftScore = nextExpires === 0 ? Math.max(0, state.driftScore - DRIFT_PRESSURE_PER_TRIGGER) : state.driftScore;

  return normalizeState({
    ...state,
    moodMomentum: moveOneStepTowardZero(state.moodMomentum),
    moodScore: moveOneStepTowardZero(state.moodScore),
    driftExpiresAfterAtBats: nextExpires,
    driftScore: nextDriftScore,
  });
}

export function applyDriftTriggers(state: MoodState, event: MoodDriftEvent): MoodState {
  const effect = getTriggeredEffect(event);

  if (!effect) {
    return decayMomentum(state);
  }

  const driftScore = clamp(state.driftScore + effect.driftPressure, 0, 1);
  const driftActive = driftScore >= 1;

  return normalizeState({
    ...state,
    moodMomentum: state.moodMomentum + effect.momentumDelta,
    moodScore: state.moodScore + effect.moodScoreDelta,
    driftScore,
    driftActive,
    currentMood: driftActive ? effect.targetMoods[0] : state.baseMood,
    driftExpiresAfterAtBats: Math.max(state.driftExpiresAfterAtBats, effect.driftExpiresAfterAtBats),
  });
}

export function resolveMood(state: MoodState): MoodLabel {
  if (state.moodScore >= 4) return "euphoric";
  if (state.moodScore >= 1.5) return "optimistic";
  if (state.moodScore > -1.5) return "neutral";
  if (state.moodScore > -4) return "frustrated";
  return "bitter";
}
