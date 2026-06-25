import { describe, expect, test } from 'vitest';
import { TRAIT_PRICING } from '../traitPricing';
import {
  IN_SCOPE_TRAIT_NAMES,
  TRAIT_ADAPTIVE_EXCLUDED,
  TRAIT_MAX_USES,
  TRAIT_OVERRIDES,
  assignTier,
  computeTraitDollarValue,
} from '../traitTierConfig';

describe('traitTierConfig T-1 derived trait value/scarcity foundation', () => {
  test('reproduces the IV-marginal dollar anchors from the frozen single-position baseline', () => {
    expect(computeTraitDollarValue('Metal Head')).toBe(14);
    expect(computeTraitDollarValue('Meltdown')).toBe(-308);
    expect(computeTraitDollarValue('RBI Zero')).toBe(-2364);
  });

  test('keeps the frozen TEAM MAX USES distribution from workbook col T', () => {
    const distribution = Object.values(TRAIT_MAX_USES).reduce<Record<number, number>>((counts, maxUses) => {
      counts[maxUses] = (counts[maxUses] ?? 0) + 1;
      return counts;
    }, {});

    expect(distribution).toEqual({ 0: 3, 1: 62, 2: 5, 3: 4, 9: 1 });
  });

  test('ranks the 73 in-scope traits and excludes only Sign Stealer and Stimulated', () => {
    expect(TRAIT_PRICING).toHaveLength(75);
    expect(IN_SCOPE_TRAIT_NAMES).toHaveLength(73);
    expect([...TRAIT_ADAPTIVE_EXCLUDED].sort()).toEqual(['Sign Stealer', 'Stimulated']);
    expect(IN_SCOPE_TRAIT_NAMES).not.toContain('Sign Stealer');
    expect(IN_SCOPE_TRAIT_NAMES).not.toContain('Stimulated');
  });

  test('has no orphan stripped keys in overrides, exclusions, or max-uses config', () => {
    const canonicalNames = new Set(TRAIT_PRICING.map((entry) => entry.name));
    const configuredNames = [
      ...Object.keys(TRAIT_OVERRIDES),
      ...TRAIT_ADAPTIVE_EXCLUDED,
      ...Object.keys(TRAIT_MAX_USES),
    ];

    for (const name of configuredNames) {
      expect(canonicalNames.has(name), name).toBe(true);
    }

    expect(new Set(Object.keys(TRAIT_MAX_USES))).toEqual(canonicalNames);
  });

  test('assigns representative positive and negative tiers from value/scarcity derivation', () => {
    expect(assignTier('Two Way (C)').tier).toBe('ELITE');
    expect(assignTier('Two Way (IF)').tier).toBe('ELITE');
    expect(assignTier('Two Way (OF)').tier).toBe('ELITE');
    expect(assignTier('Metal Head').tier).toBe('COMMON');
    expect(assignTier('RBI Zero').tier).toBe('SEVERE');
  });
});
