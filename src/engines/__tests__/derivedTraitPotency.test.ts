import { describe, expect, test } from 'vitest';

import { normalizeToChemistryCode, type ChemistryCode } from '../../data/chemistryCanonical';
import { TRAIT_PRICING, type TraitPricingEntry } from '../../data/traitPricing';
import {
  countRosterChemistry,
  derivedPotencyTier,
  traitPotencies,
  type RosterChemistryCounts,
} from '../derivedTraitPotency';

function rosterOf(chemistry: string, count: number): Array<{ chemistry: string }> {
  return Array.from({ length: count }, () => ({ chemistry }));
}

function countsForTrait(trait: TraitPricingEntry, sharedCount: number): RosterChemistryCounts {
  const code = normalizeToChemistryCode(trait.chemistry);
  return { [code]: sharedCount };
}

function requiredTrait(
  predicate: (trait: TraitPricingEntry) => boolean,
  description: string,
): TraitPricingEntry {
  const trait = TRAIT_PRICING.find(predicate);
  expect(trait, description).toBeDefined();
  return trait as TraitPricingEntry;
}

describe('derivedTraitPotency TRUEVAL-1', () => {
  test('maps canonical 3/7 shared-chemistry thresholds to potency tiers', () => {
    for (const count of [0, 1, 2]) {
      expect(derivedPotencyTier(count)).toBe('L1');
    }

    for (const count of [3, 4, 5, 6]) {
      expect(derivedPotencyTier(count)).toBe('L2');
    }

    for (const count of [7, 8, 20]) {
      expect(derivedPotencyTier(count)).toBe('L3');
    }

    expect(derivedPotencyTier(-1)).toBe('L1');
    expect(derivedPotencyTier(Number.NaN)).toBe('L1');
  });

  test('counts mixed roster chemistry using canonical normalization', () => {
    const counts = countRosterChemistry([
      ...rosterOf('SPIRITED', 2),
      ...rosterOf('SPI', 1),
      ...rosterOf('disciplined', 2),
      ...rosterOf('Competitive', 1),
      ...rosterOf('SCH', 3),
      ...rosterOf('crafty', 1),
    ]);

    const expected: Record<ChemistryCode, number> = {
      SPI: 3,
      DIS: 2,
      CMP: 1,
      SCH: 3,
      CRA: 1,
    };

    expect(counts).toEqual(expected);
  });

  test('derives positive trait factors relative to the L2 baseline', () => {
    const trait = requiredTrait(
      (entry) => entry.chemistry === 'Scholarly' && entry.polarity === 'positive',
      'expected a Scholarly positive trait in traitPricing',
    );

    expect(traitPotencies([trait.name], countsForTrait(trait, 7))).toEqual([
      {
        trait: trait.name,
        chemistry: trait.chemistry,
        polarity: 'positive',
        sharedCount: 7,
        tier: 'L3',
        factor: 3.0,
      },
    ]);
    expect(traitPotencies([trait.name], countsForTrait(trait, 3))[0]).toMatchObject({
      tier: 'L2',
      factor: 1.0,
    });
    expect(traitPotencies([trait.name], countsForTrait(trait, 2))[0]).toMatchObject({
      tier: 'L1',
      factor: 0.5,
    });
  });

  test('derives negative trait factors from the inverted potency scale', () => {
    const trait = requiredTrait(
      (entry) => entry.polarity === 'negative',
      'expected a negative trait in traitPricing',
    );

    expect(traitPotencies([trait.name], countsForTrait(trait, 7))[0]).toMatchObject({
      trait: trait.name,
      chemistry: trait.chemistry,
      polarity: 'negative',
      sharedCount: 7,
      tier: 'L3',
      factor: 0.5,
    });
    expect(traitPotencies([trait.name], countsForTrait(trait, 2))[0]).toMatchObject({
      tier: 'L1',
      factor: 3.0,
    });
    expect(traitPotencies([trait.name], countsForTrait(trait, 6))[0]).toMatchObject({
      tier: 'L2',
      factor: 1.0,
    });
  });

  test('omits unknown trait names and preserves known-name input order', () => {
    const first = requiredTrait(
      (entry) => entry.polarity === 'positive',
      'expected a positive trait in traitPricing',
    );
    const second = requiredTrait(
      (entry) => entry.polarity === 'negative' && entry.name !== first.name,
      'expected a different negative trait in traitPricing',
    );

    const result = traitPotencies(['Not A Real Trait', second.name, first.name], {
      SPI: 2,
      DIS: 3,
      CMP: 4,
      SCH: 5,
      CRA: 6,
    });

    expect(result.map((entry) => entry.trait)).toEqual([second.name, first.name]);
  });

  test('returns deterministic output for identical inputs', () => {
    const traitNames = TRAIT_PRICING.slice(0, 6).map((trait) => trait.name);
    const counts: RosterChemistryCounts = { SPI: 7, DIS: 3, CMP: 2, SCH: 8, CRA: 1 };

    expect(JSON.stringify(traitPotencies(traitNames, counts))).toBe(
      JSON.stringify(traitPotencies(traitNames, counts)),
    );
  });
});
