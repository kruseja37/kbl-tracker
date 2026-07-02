import {
  CHEMISTRY_CODES,
  normalizeToChemistryCode,
  type ChemistryCode,
} from '../data/chemistryCanonical';
import {
  TRAIT_PRICING,
  type ChemistryType,
  type TraitPricingEntry,
} from '../data/traitPricing';
import { POTENCY_SCALE, type PotencyTier } from '../data/rosterEngineConstants';

export const POTENCY_L2_MIN = 3;
export const POTENCY_L3_MIN = 7;

export type RosterChemistryCounts = Partial<Record<ChemistryCode, number>>;

export interface TraitPotency {
  trait: string;
  chemistry: ChemistryType;
  polarity: 'positive' | 'negative';
  sharedCount: number;
  tier: PotencyTier;
  factor: number;
}

const CHEMISTRY_CODE_SET = new Set<string>(CHEMISTRY_CODES);
const TRAIT_BY_NAME = new Map<string, Pick<TraitPricingEntry, 'chemistry' | 'polarity'>>(
  TRAIT_PRICING.map((trait) => [trait.name, { chemistry: trait.chemistry, polarity: trait.polarity }]),
);

export function derivedPotencyTier(sharedChemistryCount: number): PotencyTier {
  const safeCount = normalizeCount(sharedChemistryCount);
  if (safeCount >= POTENCY_L3_MIN) return 'L3';
  if (safeCount >= POTENCY_L2_MIN) return 'L2';
  return 'L1';
}

export function countRosterChemistry(roster: readonly { chemistry: string }[]): RosterChemistryCounts {
  const counts: RosterChemistryCounts = {};

  for (const player of roster) {
    const code = normalizedChemistryCode(player.chemistry);
    if (!code) continue;
    counts[code] = (counts[code] ?? 0) + 1;
  }

  return counts;
}

/**
 * Build-dark defaults for TRUEVAL-1: the roster is the team's full active roster,
 * and chemistry self-counts toward the player's own trait potency. Both assumptions
 * are retunable in Mode-2 because CHEMISTRY_TRAIT_POTENCY_VALUATION_SPEC §2.6 leaves
 * the denominator unresolved.
 */
export function traitPotencies(traitNames: string[], counts: RosterChemistryCounts): TraitPotency[] {
  const potencies: TraitPotency[] = [];

  for (const traitName of traitNames) {
    const trait = TRAIT_BY_NAME.get(traitName);
    if (!trait) continue;

    const code = normalizedChemistryCode(trait.chemistry);
    if (!code) continue;

    const sharedCount = counts[code] ?? 0;
    const tier = derivedPotencyTier(sharedCount);
    const factor =
      trait.polarity === 'positive' ? POTENCY_SCALE.positives[tier] : POTENCY_SCALE.standardInverted[tier];

    potencies.push({
      trait: traitName,
      chemistry: trait.chemistry,
      polarity: trait.polarity,
      sharedCount,
      tier,
      factor,
    });
  }

  return potencies;
}

function normalizeCount(count: number): number {
  if (!Number.isFinite(count) || count < 0) return 0;
  return count;
}

function normalizedChemistryCode(value: string): ChemistryCode | null {
  const code = normalizeToChemistryCode(value);
  return CHEMISTRY_CODE_SET.has(code) ? code : null;
}
