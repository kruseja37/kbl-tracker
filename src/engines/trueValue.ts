import {
  traitPotencies,
  type RosterChemistryCounts,
} from './derivedTraitPotency';

// Conservative, PROVISIONAL v1 magnitudes for the optimizer/scout/draft-guide
// value layer only. Mode-2 calibration may retune them here, but this additive
// layer must never feed salary/economy/archetype balance; those stay on frozen
// kblIV. The price != true-value gap is the intended scout edge: bargains are
// underpriced good gloves, traps are overpriced bad gloves.
export const CHEM_LEAN_COEF = 0.02;
export const CHEM_LEAN_CAP = 0.12;
export const FIELDING_COEF = 0.10;
export const FIELDING_BASELINE = 50;
export const FIELDING_RANGE = 50;
export const FIELDING_CAP = 0.08;

export interface TrueValueInput {
  kblIV: number;
  traits: string[];
  fielding: number;
  isPitcher: boolean;
}

export interface TrueValueResult {
  trueValue: number;
  kblIV: number;
  chemistryAdjustment: number;
  fieldingAdjustment: number;
  netSignedLean: number;
}

export function computeTrueValue(
  input: TrueValueInput,
  rosterChemistryCounts: RosterChemistryCounts,
): TrueValueResult {
  const potencies = traitPotencies(input.traits, rosterChemistryCounts);
  const netSignedLean = potencies.reduce((sum, potency) => {
    const lean = potency.factor - 1;
    return sum + (potency.polarity === 'positive' ? lean : -lean);
  }, 0);

  const chemRaw = CHEM_LEAN_COEF * netSignedLean;
  const chemFrac = clamp(chemRaw, -CHEM_LEAN_CAP, CHEM_LEAN_CAP);
  const chemistryAdjustment = Math.round(input.kblIV * chemFrac);

  const fieldRaw =
    FIELDING_COEF * (input.fielding - FIELDING_BASELINE) / FIELDING_RANGE;
  const fieldFrac = input.isPitcher ? 0 : clamp(fieldRaw, -FIELDING_CAP, FIELDING_CAP);
  const fieldingAdjustment = Math.round(input.kblIV * fieldFrac);

  return {
    trueValue: input.kblIV + chemistryAdjustment + fieldingAdjustment,
    kblIV: input.kblIV,
    chemistryAdjustment,
    fieldingAdjustment,
    netSignedLean,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
