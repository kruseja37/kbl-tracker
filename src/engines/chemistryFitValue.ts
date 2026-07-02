import type { PotencyTier } from '../data/rosterEngineConstants';
import { normalizeToChemistryCode, type ChemistryCode } from '../data/chemistryCanonical';
import { derivedPotencyTier, POTENCY_L2_MIN, POTENCY_L3_MIN } from './derivedTraitPotency';

// CHEM-POTENCY single-math (JK ruling 2026-06-22, executed 2026-07-02 with ruling 4): the
// scout-fit tiers now delegate to the canonical 3/7 potency thresholds (derivedTraitPotency)
// — the RB-16 off-by-one 4/8 sim-tune values are retired. The ±8% bump shape is unchanged.
export const CHEMISTRY_FIT_L2_MIN = POTENCY_L2_MIN;
export const CHEMISTRY_FIT_L3_MIN = POTENCY_L3_MIN;
export const CHEMISTRY_FIT_BUFFER_FRACTION = 0.4; // RB-16 sim-tune
export const CHEMISTRY_FIT_BUMP_MAX = 0.08; // RB-16 sim-tune

type ChemistryFitDirection = 'add' | 'remove';

const POTENCY_TIER_RANK: Record<PotencyTier, number> = {
  L1: 1,
  L2: 2,
  L3: 3,
};

export function chemistryFitTier(count: number): PotencyTier {
  return derivedPotencyTier(normalizeCount(count));
}

export function marginalChemistryValue(count: number, direction: ChemistryFitDirection): number {
  const safeCount = normalizeCount(count);
  const currentTier = chemistryFitTier(safeCount);

  if (direction === 'add') {
    const addedTier = chemistryFitTier(safeCount + 1);
    if (POTENCY_TIER_RANK[addedTier] > POTENCY_TIER_RANK[currentTier]) {
      return 1;
    }

    if (safeCount === CHEMISTRY_FIT_L2_MIN || safeCount === CHEMISTRY_FIT_L3_MIN) {
      return CHEMISTRY_FIT_BUFFER_FRACTION;
    }

    return 0;
  }

  const removedTier = chemistryFitTier(safeCount - 1);
  if (POTENCY_TIER_RANK[removedTier] < POTENCY_TIER_RANK[currentTier]) {
    return -1;
  }

  return 0;
}

export function chemistryFitPriceMultiplier(
  prospectChemistry: string,
  rosterChemistryCounts: Partial<Record<ChemistryCode, number>>,
): number {
  const code = normalizeToChemistryCode(prospectChemistry);
  const count = rosterChemistryCounts[code] ?? 0;
  const addValue = marginalChemistryValue(count, 'add');
  return 1 + addValue * CHEMISTRY_FIT_BUMP_MAX;
}

function normalizeCount(count: number): number {
  if (!Number.isFinite(count) || count < 0) return 0;
  return count;
}
