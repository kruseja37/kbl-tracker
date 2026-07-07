import { computeIV, type IVPlayerInput } from '../engines/ivEngine';
import { TRAIT_PRICING, type PricedAttr, type TraitPricingEntry } from './traitPricing';

export const TRAIT_TIERS_POSITIVE = {
  COMMON: { weightMin: 0.00, gainThreshold: 0.55, lossThreshold: 0.30, genWeight: 1.00 }, // §16 sim-tune placeholder
  UNCOMMON: { weightMin: 0.30, gainThreshold: 0.70, lossThreshold: 0.30, genWeight: 0.50 }, // §16 sim-tune placeholder
  RARE: { weightMin: 0.60, gainThreshold: 0.82, lossThreshold: 0.22, genWeight: 0.18 }, // §16 sim-tune placeholder
  ELITE: { weightMin: 0.85, gainThreshold: 0.92, lossThreshold: 0.12, genWeight: 0.05 }, // §16 sim-tune placeholder
} as const;

export const TRAIT_TIERS_NEGATIVE = {
  MINOR: { absDollarMin: 0, gainThreshold: 0.55, lossThreshold: 0.30, genWeight: 1.00 }, // §16 sim-tune placeholder
  MODERATE: { absDollarMin: 600, gainThreshold: 0.65, lossThreshold: 0.25, genWeight: 0.45 }, // §16 sim-tune placeholder
  SEVERE: { absDollarMin: 1500, gainThreshold: 0.78, lossThreshold: 0.18, genWeight: 0.15 }, // §16 sim-tune placeholder
} as const;

export const TRAIT_WEIGHT_BLEND = { valuePart: 0.8, scarcityPart: 0.2 } as const;
export const SCARCITY_FROM_MAX_USES = { 0: 1.0, 1: 0.55, 2: 0.30, 3: 0.15, 9: 0.0 } as const;
export const NEGATIVE_TRAIT_FRACTION = 0.27; // §16 sim-tune placeholder
export const ELITE_GEN_FLOOR = 0.05; // Two-Way stays possible, never excluded. §16 sim-tune placeholder
export const ELITE_PITCH_TRAITS: ReadonlySet<string> = new Set([
  'Elite 2F',
  'Elite 4F',
  'Elite CB',
  'Elite CF',
  'Elite CH',
  'Elite FK',
  'Elite SB',
  'Elite SL',
]);

export type PositiveTraitTier = keyof typeof TRAIT_TIERS_POSITIVE;
export type NegativeTraitTier = keyof typeof TRAIT_TIERS_NEGATIVE;
export type TraitTier = PositiveTraitTier | NegativeTraitTier;

export interface TraitTierOverride {
  tier?: TraitTier;
  gainThreshold?: number;
  lossThreshold?: number;
  genWeight?: number;
}

export const TRAIT_OVERRIDES: Record<string, TraitTierOverride> = {
  'Two Way (IF)': { genWeight: 0.04 }, // §16 sim-tune placeholder
  'Two Way (OF)': { genWeight: 0.04 }, // §16 sim-tune placeholder
  'Two Way (C)': { genWeight: 0.04 }, // §16 sim-tune placeholder
};

export const TRAIT_ADAPTIVE_EXCLUDED = ['Sign Stealer', 'Stimulated'] as const;

/**
 * Frozen workbook scarcity input from `Traits` col T ("TEAM MAX USES").
 * Regenerator note: extend `scripts/extract-iv-data.py` beside the existing
 * Traits-sheet extraction to emit col T alongside cols C-S and U.
 */
export const TRAIT_MAX_USES: Record<string, number> = {
  'Ace Exterminator': 1,
  'Bad Ball Hitter': 1,
  'Bad Jumps': 1,
  'Base Jogger': 1,
  'Base Rounder': 2,
  'BB Prone': 1,
  'Big Hack': 1,
  Bunter: 2,
  'Butter Fingers': 1,
  'Cannon Arm': 1,
  Choker: 1,
  Clutch: 2,
  Composed: 3,
  'CON vs LHP': 1,
  'CON vs RHP': 1,
  Consistent: 3,
  'Crossed Up': 1,
  Distractor: 1,
  'Dive Wizard': 1,
  Durable: 3,
  'Easy Jumps': 1,
  'Easy Target': 1,
  'Elite 2F': 1,
  'Elite 4F': 1,
  'Elite CB': 1,
  'Elite CF': 1,
  'Elite CH': 1,
  'Elite FK': 1,
  'Elite SB': 1,
  'Elite SL': 1,
  'Falls Behind': 1,
  'Fastball Hitter': 1,
  'First Pitch Prayer': 1,
  'First Pitch Slayer': 1,
  'Gets Ahead': 1,
  'High Pitch': 1,
  'Injury Prone': 1,
  'Inside Pitch': 1,
  'K Collector': 1,
  'K Neglector': 1,
  'Little Hack': 1,
  'Low Pitch': 1,
  'Magic Hands': 1,
  Meltdown: 1,
  'Metal Head': 9,
  'Mind Gamer': 1,
  'Noodle Arm': 1,
  'Off-Speed Hitter': 1,
  'Outside Pitch': 1,
  'Pick Officer': 1,
  'Pinch Perfect': 1,
  'POW vs LHP': 1,
  'POW vs RHP': 1,
  'Rally Starter': 1,
  'Rally Stopper': 1,
  'RBI Hero': 1,
  'RBI Zero': 1,
  'Reverse Splits': 1,
  'Sign Stealer': 1,
  'Slow Poke': 1,
  Specialist: 1,
  Sprinter: 2,
  Stealer: 2,
  Stimulated: 1,
  Surrounded: 1,
  'Tough Out': 1,
  'Two Way (C)': 0,
  'Two Way (IF)': 0,
  'Two Way (OF)': 0,
  Utility: 3,
  Volatile: 1,
  Whiffer: 1,
  'Wild Thing': 1,
  'Wild Thrower': 1,
  Workhorse: 1,
};

type ScarcityMaxUses = keyof typeof SCARCITY_FROM_MAX_USES;

interface RankedTraitDollar {
  name: string;
  absDollarValue: number;
  rank: number;
}

interface TraitTierConfig {
  weightMin?: number;
  absDollarMin?: number;
  gainThreshold: number;
  lossThreshold: number;
  genWeight: number;
}

export interface TraitTierAssignment extends TraitTierConfig {
  name: string;
  polarity: TraitPricingEntry['polarity'];
  tier: TraitTier;
  dollarValue: number;
  traitWeight: number;
  maxUses: number;
}

const HITTER_PRICING_ATTRS: readonly PricedAttr[] = ['POW', 'CON', 'SPD', 'FLD', 'ARM'];
const PITCHER_PRICING_ATTRS: readonly PricedAttr[] = ['VEL', 'JNK', 'ACC'];
const TWO_WAY_TRAITS = new Set(['Two Way (C)', 'Two Way (IF)', 'Two Way (OF)']);
const traitPricingByName = new Map(TRAIT_PRICING.map((entry) => [entry.name, entry]));
const dollarValueCache = new Map<string, number>();
const weightCache = new Map<string, number>();

export const IN_SCOPE_TRAIT_NAMES = TRAIT_PRICING
  .map((entry) => entry.name)
  .filter((name) => !(TRAIT_ADAPTIVE_EXCLUDED as readonly string[]).includes(name));

function normalizeTraitName(name: string): string {
  return name.replace(/\s+\([+-]\)\s*$/, '').trim();
}

function assertKnownTrait(name: string): TraitPricingEntry {
  const normalized = normalizeTraitName(name);
  const entry = traitPricingByName.get(normalized);
  if (!entry) {
    throw new Error(`Unknown trait ${name}`);
  }
  return entry;
}

function hasPricing(entry: TraitPricingEntry, attrs: readonly PricedAttr[]): boolean {
  return attrs.some((attr) => entry.deltas[attr] !== 0 || entry.multipliers[attr] !== 1);
}

function baselineHitter(traitName: string): IVPlayerInput {
  return {
    id: `trait-tier:${traitName}`,
    name: `Trait Tier ${traitName}`,
    isPitcher: false,
    bats: 'R',
    primaryPosition: 'C',
    curveBlock: 'C',
    batterRatings: {
      power: 50,
      contact: 50,
      speed: 50,
      fielding: 50,
      arm: 50,
    },
    traits: [traitName],
    arsenal: [],
  };
}

function baselinePitcher(traitName: string): IVPlayerInput {
  return {
    id: `trait-tier:${traitName}`,
    name: `Trait Tier ${traitName}`,
    isPitcher: true,
    bats: 'R',
    pitcherRole: 'SP',
    curveBlock: 'SP',
    batterRatings: {
      power: 50,
      contact: 50,
      speed: 50,
      fielding: 50,
      arm: 50,
    },
    pitcherRatings: {
      velocity: 50,
      junk: 50,
      accuracy: 50,
    },
    traits: [traitName],
    arsenal: [],
  };
}

function baselineForTrait(entry: TraitPricingEntry): IVPlayerInput {
  if (hasPricing(entry, HITTER_PRICING_ATTRS)) {
    return baselineHitter(entry.name);
  }
  if (hasPricing(entry, PITCHER_PRICING_ATTRS)) {
    return baselinePitcher(entry.name);
  }
  return baselineHitter(entry.name);
}

export function computeTraitDollarValue(name: string): number {
  const entry = assertKnownTrait(name);
  const cached = dollarValueCache.get(entry.name);
  if (cached !== undefined) {
    return cached;
  }

  const dollarValue = TWO_WAY_TRAITS.has(entry.name)
    ? computeIV(baselinePitcher(entry.name)).kbl.twoWayUnlock ?? 0
    : computeIV(baselineForTrait(entry)).raw.traits;

  dollarValueCache.set(entry.name, dollarValue);
  return dollarValue;
}

function rankedTraitDollars(): RankedTraitDollar[] {
  return IN_SCOPE_TRAIT_NAMES
    .map((name) => ({ name, absDollarValue: Math.abs(computeTraitDollarValue(name)) }))
    .sort((a, b) => a.absDollarValue - b.absDollarValue || a.name.localeCompare(b.name))
    .map((entry, rank) => ({ ...entry, rank }));
}

function valueRankByTrait(): Map<string, RankedTraitDollar> {
  return new Map(rankedTraitDollars().map((entry) => [entry.name, entry]));
}

function normalizeMaxUses(maxUses: number): ScarcityMaxUses {
  return Object.prototype.hasOwnProperty.call(SCARCITY_FROM_MAX_USES, maxUses)
    ? maxUses as ScarcityMaxUses
    : 1;
}

export function computeTraitWeight(name: string): number {
  const entry = assertKnownTrait(name);
  const cached = weightCache.get(entry.name);
  if (cached !== undefined) {
    return cached;
  }
  if ((TRAIT_ADAPTIVE_EXCLUDED as readonly string[]).includes(entry.name)) {
    throw new Error(`Trait ${entry.name} is excluded from adaptive trait weighting`);
  }

  const rankEntry = valueRankByTrait().get(entry.name);
  if (!rankEntry) {
    throw new Error(`Trait ${entry.name} is missing from the in-scope trait rank`);
  }

  const denominator = Math.max(IN_SCOPE_TRAIT_NAMES.length - 1, 1);
  const valueNorm = rankEntry.rank / denominator;
  const maxUses = normalizeMaxUses(TRAIT_MAX_USES[entry.name] ?? 1);
  const scarcityNorm = SCARCITY_FROM_MAX_USES[maxUses];
  const weight = TRAIT_WEIGHT_BLEND.valuePart * valueNorm + TRAIT_WEIGHT_BLEND.scarcityPart * scarcityNorm;

  weightCache.set(entry.name, weight);
  return weight;
}

function positiveTierForWeight(weight: number): PositiveTraitTier {
  return (Object.entries(TRAIT_TIERS_POSITIVE) as [PositiveTraitTier, TraitTierConfig][])
    .sort((a, b) => (b[1].weightMin ?? 0) - (a[1].weightMin ?? 0))
    .find(([, config]) => weight >= (config.weightMin ?? 0))?.[0] ?? 'COMMON';
}

function negativeTierForDollar(absDollarValue: number): NegativeTraitTier {
  return (Object.entries(TRAIT_TIERS_NEGATIVE) as [NegativeTraitTier, TraitTierConfig][])
    .sort((a, b) => (b[1].absDollarMin ?? 0) - (a[1].absDollarMin ?? 0))
    .find(([, config]) => absDollarValue >= (config.absDollarMin ?? 0))?.[0] ?? 'MINOR';
}

function tierConfig(tier: TraitTier): TraitTierConfig {
  if (tier in TRAIT_TIERS_POSITIVE) {
    return TRAIT_TIERS_POSITIVE[tier as PositiveTraitTier];
  }
  return TRAIT_TIERS_NEGATIVE[tier as NegativeTraitTier];
}

export function assignTier(name: string): TraitTierAssignment {
  const entry = assertKnownTrait(name);
  const dollarValue = computeTraitDollarValue(entry.name);
  const traitWeight = computeTraitWeight(entry.name);
  const tier = entry.polarity === 'positive'
    ? positiveTierForWeight(traitWeight)
    : negativeTierForDollar(Math.abs(dollarValue));
  const override = TRAIT_OVERRIDES[entry.name] ?? {};
  const assignedTier = override.tier ?? tier;

  return {
    name: entry.name,
    polarity: entry.polarity,
    tier: assignedTier,
    dollarValue,
    traitWeight,
    maxUses: TRAIT_MAX_USES[entry.name] ?? 1,
    ...tierConfig(assignedTier),
    ...override,
  };
}
