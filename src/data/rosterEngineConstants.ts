/**
 * IV-layer registry constants shared by roster intelligence engines.
 *
 * Source: IV_ENGINE_AND_ROSTER_INTELLIGENCE_SPEC.md §12 v1.1.8.
 * Keep this file limited to IV-layer constants; T6 can extend the registry for
 * roster construction/interaction constants.
 */

export type PitcherRoleKey = 'SP' | 'SP/RP' | 'RP' | 'CP';
export type UsageAttr = 'POW' | 'CON' | 'SPD' | 'FLD';
export type PotencyTier = 'L1' | 'L2' | 'L3';

export interface UsageInput {
  startShare: number;
  paRatio: number;
  phFloor: number;
  prFloor: number;
  rangeFloor: number;
}

/** §12 usageInputs, CALIBRATE: derives pitcher batting POW/CON/SPD exposure. */
export const USAGE_INPUTS: Record<PitcherRoleKey, UsageInput> = {
  SP: { startShare: 0.25, paRatio: 0.625, phFloor: 0.04, prFloor: 0.02, rangeFloor: 0.10 },
  'SP/RP': { startShare: 0.18, paRatio: 0.625, phFloor: 0.0375, prFloor: 0.02, rangeFloor: 0.08 },
  RP: { startShare: 0, paRatio: 0.625, phFloor: 0.08, prFloor: 0.02, rangeFloor: 0.06 },
  CP: { startShare: 0, paRatio: 0.625, phFloor: 0.05, prFloor: 0.01, rangeFloor: 0.05 },
};

/** §12/D16 SP/RP arm interpolation alpha. Distinct from SP/RP batting startShare. */
export const SP_RP_INNINGS_ALPHA = 0.30;

/** §12/D16 SP/RP flexible arm premium. */
export const SP_RP_FLEX_PREMIUM = 1.12;

/** §12/D15, CALIBRATE: Two Way trait defensive ARM ladder by potency tier. */
export const TWO_WAY_ARM_BY_TIER: Record<PotencyTier, number> = { L1: 60, L2: 80, L3: 99 };

/** §12/D15 JK ruling: Two Way holders unlock 1.00 usage on all hitter attributes. */
export const TWO_WAY_USAGE = 1.00;

/** §12 JK ruling 2026-06-10: IV potency scales trait deltas around L2 neutrality. */
export const POTENCY_SCALE: {
  positives: Record<PotencyTier, number>;
  standardInverted: Record<PotencyTier, number>;
} = {
  positives: { L1: 0.5, L2: 1.0, L3: 2.0 },
  standardInverted: { L1: 2.0, L2: 1.0, L3: 0.5 },
};

/**
 * §3.9 simulation export only. Pitcher ARM is unpriced by IV design, so ivEngine
 * must never consume this value.
 */
export const PITCHER_ASSUMED_ARM = 99;

export const PITCHER_ROLES: readonly PitcherRoleKey[] = ['SP', 'SP/RP', 'RP', 'CP'] as const;
export const PITCH_ATTRS = ['VEL', 'JNK', 'ACC'] as const;
export const BAT_USAGE_ATTRS = ['POW', 'CON', 'SPD', 'FLD'] as const;
export const PITCHER_NEUTRAL_HITTER_BLOCK = 'IF/OF' as const;

/** §3.9/D15: Two Way trait names route pitcher batting to the trait-position curve block. */
export const TWO_WAY_TRAIT_POSITION = {
  'Two Way (C)': 'C',
  'Two Way (IF)': 'IF',
  'Two Way (OF)': 'OF',
} as const;

export function deriveUsageWeights(role: PitcherRoleKey): Record<UsageAttr, number> {
  const input = USAGE_INPUTS[role];
  const bat = input.startShare * input.paRatio + input.phFloor;
  return {
    POW: bat,
    CON: bat,
    SPD: Math.min(1, bat + input.prFloor + input.rangeFloor),
    FLD: 1,
  };
}
