import {
  BATTING_ORDER_SLOT_WEIGHTS,
  CALIBRATE,
  DEFENSIVE_MOJO_DRIFT_STEPS,
  DEFENSIVE_PLACEMENT_SCALING,
  DEFENSIVE_POSITION_PENALTY_MULTIPLIER,
  FATIGUE_MODEL,
  MOJO_DELTAS,
  OUT_OF_POSITION_MOJO_PENALTY,
  POSITION_CHANCE_FREQUENCY,
  POTENCY_SCALE,
  PRESSURE_MULTIPLIER,
  TWO_WAY_TRAIT_POSITION,
} from "../data/rosterEngineConstants";
import { IV_CURVES } from "../data/ivCurves";
import {
  ARSENAL_TAX_TABLE,
  AUX_PRICING,
  PITCH_COSTS,
  TRAIT_PRICING,
} from "../data/traitPricing";
import { TRAIT_INTERACTION_MATRIX } from "../data/traitInteractionMatrix";

export const OPTIMIZER_CONSTANTS_VERSION = "kbl-optimizer-constants-v1";

export interface OptimizerConstantsSnapshot {
  version: string;
  hash: string;
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }

  if (value && typeof value === "object") {
    return Object.keys(value as Record<string, unknown>)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = canonicalize((value as Record<string, unknown>)[key]);
        return acc;
      }, {});
  }

  return value;
}

function fnv1a32Hex(input: string): string {
  let hash = 0x811c9dc5;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }

  return hash.toString(16).padStart(8, "0");
}

function optimizerConstantsBundle() {
  return {
    rosterEngineConstants: {
      MOJO_DELTAS,
      POTENCY_SCALE,
      PRESSURE_MULTIPLIER,
      FATIGUE_MODEL,
      DEFENSIVE_MOJO_DRIFT_STEPS,
      DEFENSIVE_PLACEMENT_SCALING,
      DEFENSIVE_POSITION_PENALTY_MULTIPLIER,
      OUT_OF_POSITION_MOJO_PENALTY,
      POSITION_CHANCE_FREQUENCY,
      TWO_WAY_TRAIT_POSITION,
      BATTING_ORDER_SLOT_WEIGHTS,
      CALIBRATE,
    },
    ivCurves: IV_CURVES,
    traitPricing: {
      TRAIT_PRICING,
      PITCH_COSTS,
      ARSENAL_TAX_TABLE,
      AUX_PRICING,
    },
    traitInteractionMatrix: TRAIT_INTERACTION_MATRIX,
  };
}

export function captureOptimizerConstantsSnapshot(): OptimizerConstantsSnapshot {
  // Certifies which optimizer constants produced the IV §9 lineup benchmark.
  const canonicalPayload = JSON.stringify(canonicalize(optimizerConstantsBundle()));
  return {
    version: OPTIMIZER_CONSTANTS_VERSION,
    hash: fnv1a32Hex(canonicalPayload),
  };
}
