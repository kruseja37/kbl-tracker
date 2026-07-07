/**
 * CHEM-POTENCY — the shared chemistry tipping-premium calculation (JK ruling 4, 2026-07-02;
 * design: spec-docs/FABLE_CHEM_POTENCY_DESIGN_2026-07-02.md §3).
 *
 * ONE tier-delta model for every roster-intelligence consumer (draft board, auction advice,
 * in-season analyzer adapter). INTELLIGENCE-LAYER ONLY: nothing here feeds IV, salary,
 * market-price prediction, CPU/shill bidding, or archetype balance — the economy stays at
 * the frozen L2 standard (the price ≠ true-value gap is the intended scout edge).
 *
 * Mechanic (CHEMISTRY_TRAIT_POTENCY_VALUATION_SPEC, all CONFIRMED):
 * - A trait's potency tier is set by the team count of the TRAIT's chemistry family:
 *   L1 = 0-2, L2 = 3-6, L3 = 7+ (JK-ratified 3/7; derivedTraitPotency is the tier oracle).
 * - A player adds +1 to HIS family's count, re-tiering every matching-family trait on the
 *   team — so the marginal value of a player is roster-contextual, and crossing 2→3 or 6→7
 *   ("tipping") is worth far more than a same-tier add.
 * - Dollar magnitudes come from ivEngine.traitPotencyDollarDelta (the engine's own
 *   marginal-curve pricing per holder), so premiums are in the same currency as IV.
 */

import {
  countRosterChemistry,
  derivedPotencyTier,
  POTENCY_L2_MIN,
  POTENCY_L3_MIN,
  type RosterChemistryCounts,
} from './derivedTraitPotency';
import { traitPotencyDollarDelta, type IVPlayerInput } from './ivEngine';
import type { PotencyTier } from '../data/rosterEngineConstants';
import {
  CHEMISTRY_CODES,
  normalizeToChemistryCode,
  type ChemistryCode,
} from '../data/chemistryCanonical';
import { TRAIT_PRICING } from '../data/traitPricing';

/** Neutral roster shape every consumer adapts to (auction session, analyzer, pool panels). */
export interface ChemistryContextPlayer {
  /** Chemistry family (word or SPI/DIS/CMP/SCH/CRA code; normalized internally). */
  chemistry: string;
  /** Canonical trait names (unknown names are skipped, matching traitPotencies). */
  traits: readonly string[];
  /** Pricing basis for THIS holder's trait deltas (build via buildSalaryIvInput or peer). */
  iv: IVPlayerInput;
}

export type ChemistryCrossing = 'L1->L2' | 'L2->L3' | 'L2->L1' | 'L3->L2';

export interface ChemistryTipBreakdown {
  /** teamLift + ownContext, in IV dollars. */
  premium: number;
  /** Re-tiering of the EXISTING roster's matching-family traits (0 unless a tier crossing). */
  teamLift: number;
  /** Repricing of the candidate's own traits from the L2 assumption to the joined roster's tiers. */
  ownContext: number;
  /** The candidate's family, normalized. */
  family: ChemistryCode;
  crossing: ChemistryCrossing | null;
  countsBefore: RosterChemistryCounts;
  countsAfter: RosterChemistryCounts;
  /** Same-family adds still needed to reach the NEXT tier after this add (null at L3). */
  distanceToNextTier: number | null;
  /** Roster traits re-tiered by the crossing (advice copy: "lifts 5 Scholarly traits"). */
  liftedTraitCount: number;
}

export interface ChemistryRemovalBreakdown {
  /** Negative when the removal down-tiers the family (dollars lost across remaining roster). */
  teamLoss: number;
  family: ChemistryCode;
  crossing: ChemistryCrossing | null;
  countsBefore: RosterChemistryCounts;
  countsAfter: RosterChemistryCounts;
  /** Remaining-roster traits that would re-tier down. */
  affectedTraitCount: number;
  /** Same-family removals the roster can absorb before the NEXT down-crossing (0 = this one crosses). */
  slack: number;
}

export interface FamilyChemistryProfile {
  family: ChemistryCode;
  count: number;
  tier: PotencyTier;
  /** Adds needed to reach the next tier (null at L3). */
  distanceToNextTier: number | null;
  /** Removals absorbable before dropping a tier (null at L1). */
  slack: number | null;
  /** Traits of this family held across the roster. */
  traitCount: number;
}

const TRAIT_FAMILY = new Map<string, ChemistryCode>(
  TRAIT_PRICING.map((entry) => [entry.name, normalizeToChemistryCode(entry.chemistry)]),
);

function familyOfTrait(traitName: string): ChemistryCode | null {
  return TRAIT_FAMILY.get(traitName) ?? null;
}

function tierRank(tier: PotencyTier): number {
  return tier === 'L3' ? 3 : tier === 'L2' ? 2 : 1;
}

function crossingLabel(before: PotencyTier, after: PotencyTier): ChemistryCrossing | null {
  if (before === after) return null;
  return `${before}->${after}` as ChemistryCrossing;
}

function distanceToNext(count: number): number | null {
  if (count >= POTENCY_L3_MIN) return null;
  if (count >= POTENCY_L2_MIN) return POTENCY_L3_MIN - count;
  return POTENCY_L2_MIN - count;
}

function slackToDrop(count: number): number | null {
  if (count < POTENCY_L2_MIN) return null;
  if (count < POTENCY_L3_MIN) return count - POTENCY_L2_MIN;
  return count - POTENCY_L3_MIN;
}

/**
 * The tipping premium of ADDING `candidate` to `roster` (roster EXCLUDES the candidate).
 *
 * teamLift: only the candidate's own family can cross, and only that family's traits held
 * by EXISTING roster players re-tier — priced per holder at the holder's own curves.
 * ownContext: every candidate trait is repriced from the L2 standard baked into his IV to
 * the tier the joined roster actually gives it (his own +1 included for his own family).
 * The candidate never appears in teamLift, so nothing double-counts.
 */
export function chemistryTipPremium(
  candidate: ChemistryContextPlayer,
  roster: readonly ChemistryContextPlayer[],
): ChemistryTipBreakdown {
  const countsBefore = countRosterChemistry(roster);
  const family = normalizeToChemistryCode(candidate.chemistry);
  const beforeCount = countsBefore[family] ?? 0;
  const afterCount = beforeCount + 1;
  const countsAfter: RosterChemistryCounts = { ...countsBefore, [family]: afterCount };

  const tierBefore = derivedPotencyTier(beforeCount);
  const tierAfter = derivedPotencyTier(afterCount);
  const crossing = crossingLabel(tierBefore, tierAfter);

  let teamLift = 0;
  let liftedTraitCount = 0;
  if (crossing) {
    for (const teammate of roster) {
      for (const trait of teammate.traits) {
        if (familyOfTrait(trait) !== family) continue;
        const lift = traitPotencyDollarDelta(teammate.iv, trait, tierBefore, tierAfter);
        teamLift += lift;
        if (lift !== 0) liftedTraitCount += 1;
      }
    }
  }

  let ownContext = 0;
  for (const trait of candidate.traits) {
    const traitFamily = familyOfTrait(trait);
    if (!traitFamily) continue;
    const traitCount = (countsBefore[traitFamily] ?? 0) + (traitFamily === family ? 1 : 0);
    const traitTier = derivedPotencyTier(traitCount);
    ownContext += traitPotencyDollarDelta(candidate.iv, trait, 'L2', traitTier);
  }

  return {
    premium: teamLift + ownContext,
    teamLift,
    ownContext,
    family,
    crossing,
    countsBefore,
    countsAfter,
    distanceToNextTier: distanceToNext(afterCount),
    liftedTraitCount,
  };
}

/**
 * The team-side impact of REMOVING `departing` from `roster` (roster INCLUDES the departing
 * player). Prices only the remaining roster's matching-family re-tiering — the departing
 * player's own value leaves with him and is his IV's business, not this function's.
 */
export function chemistryRemovalImpact(
  departing: ChemistryContextPlayer,
  roster: readonly ChemistryContextPlayer[],
): ChemistryRemovalBreakdown {
  const countsBefore = countRosterChemistry(roster);
  const family = normalizeToChemistryCode(departing.chemistry);
  const beforeCount = countsBefore[family] ?? 0;
  const afterCount = Math.max(0, beforeCount - 1);
  const countsAfter: RosterChemistryCounts = { ...countsBefore, [family]: afterCount };

  const tierBefore = derivedPotencyTier(beforeCount);
  const tierAfter = derivedPotencyTier(afterCount);
  const crossing = crossingLabel(tierBefore, tierAfter);

  let teamLoss = 0;
  let affectedTraitCount = 0;
  if (crossing && tierRank(tierAfter) < tierRank(tierBefore)) {
    let departingSkipped = false;
    for (const teammate of roster) {
      // Skip ONE roster entry matching the departing player (identity by reference first,
      // shape-tolerant fallback for adapters that rebuild objects).
      if (!departingSkipped && (teammate === departing || teammate.iv === departing.iv)) {
        departingSkipped = true;
        continue;
      }
      for (const trait of teammate.traits) {
        if (familyOfTrait(trait) !== family) continue;
        const loss = traitPotencyDollarDelta(teammate.iv, trait, tierBefore, tierAfter);
        teamLoss += loss;
        if (loss !== 0) affectedTraitCount += 1;
      }
    }
  }

  return {
    teamLoss,
    family,
    crossing,
    countsBefore,
    countsAfter,
    affectedTraitCount,
    slack: slackToDrop(beforeCount) ?? 0,
  };
}

/** Per-family roster summary for panels (pool supply, analyzer chemistry card). */
export function rosterChemistryProfile(
  roster: readonly ChemistryContextPlayer[],
): FamilyChemistryProfile[] {
  const counts = countRosterChemistry(roster);
  const traitCounts: Partial<Record<ChemistryCode, number>> = {};
  for (const player of roster) {
    for (const trait of player.traits) {
      const family = familyOfTrait(trait);
      if (!family) continue;
      traitCounts[family] = (traitCounts[family] ?? 0) + 1;
    }
  }
  return CHEMISTRY_CODES.map((family) => {
    const count = counts[family] ?? 0;
    return {
      family,
      count,
      tier: derivedPotencyTier(count),
      distanceToNextTier: distanceToNext(count),
      slack: slackToDrop(count),
      traitCount: traitCounts[family] ?? 0,
    };
  });
}
