import { describe, it, expect } from 'vitest';
import {
  CANONICAL_TRAIT_NAMES,
  computeTraitRealityScore,
  isTraitEligibleForRole,
  TRAIT_REALITY_SCORER_TUNING,
  traitRole,
  type TraitRealityScoreInput,
} from '../traitRealityScorer';
import { TRAIT_PRICING } from '../../data/traitPricing';
import {
  type AdaptiveStandardsConfig,
  DEFAULT_ADAPTIVE_STANDARDS_CONFIG,
  MLB_BASELINE_GAMES,
  MLB_BASELINE_INNINGS,
} from '../../utils/franchiseAdaptiveStandards';

const baseInput = (over: Partial<TraitRealityScoreInput> = {}): TraitRealityScoreInput => ({
  traitName: 'Clutch',
  playerRole: 'position',
  signalValue: 5,
  sampleSize: 1000,
  peerValues: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  basis: 'none',
  ...over,
});

// A 162-game / 9-inning config makes scaledThreshold a no-op (factor 1.0) so
// the tuning floors apply verbatim — clean for assertions.
const MLB_CONFIG: AdaptiveStandardsConfig = {
  gamesPerSeason: MLB_BASELINE_GAMES,
  inningsPerGame: MLB_BASELINE_INNINGS,
  baselineGames: MLB_BASELINE_GAMES,
  baselineInnings: MLB_BASELINE_INNINGS,
  source: 'explicit',
};

describe('traitRealityScorer — SMB4-asset role classification (VI.2)', () => {
  it('classifies every canonical trait name into a role (no orphans)', () => {
    const unclassified = [...CANONICAL_TRAIT_NAMES].filter((n) => traitRole(n) === null);
    expect(unclassified).toEqual([]);
  });

  it('the canonical name set is exactly the 75 TRAIT_PRICING names', () => {
    expect(CANONICAL_TRAIT_NAMES.size).toBe(TRAIT_PRICING.length);
    for (const entry of TRAIT_PRICING) {
      expect(CANONICAL_TRAIT_NAMES.has(entry.name)).toBe(true);
    }
  });

  it('uses canonical (not spec-shorthand) names for the drifted traits', () => {
    expect(traitRole('K Neglector')).toBe('pitcher'); // data spelling, not "Neglecter"
    expect(traitRole('K Neglecter')).toBeNull(); // the spec shorthand is NOT canonical
    expect(traitRole('Two Way (C)')).toBe('pitcher');
    expect(traitRole('Two Way (IF)')).toBe('pitcher');
    expect(traitRole('Two Way (OF)')).toBe('pitcher');
    expect(traitRole('Two Way')).toBeNull();
  });

  it('classifies the role-set sizes per VI.2 (canonical-name counts)', () => {
    const roles = [...CANONICAL_TRAIT_NAMES].map((n) => traitRole(n));
    const count = (r: string) => roles.filter((x) => x === r).length;
    // 28 pitcher = spec's 25 with Two Way → 3 variants + Workhorse default-taken.
    expect(count('pitcher')).toBe(28);
    expect(count('position')).toBe(39);
    expect(count('universal')).toBe(7);
    expect(count('cut')).toBe(1);
  });

  it('treats an unknown trait name as no role (a misspell never fires)', () => {
    expect(traitRole('Definitely Not A Trait')).toBeNull();
  });
});

describe('traitRealityScorer — eligibility (VI.2)', () => {
  it('universal traits are eligible for both roles', () => {
    expect(isTraitEligibleForRole('Clutch', 'pitcher')).toBe(true);
    expect(isTraitEligibleForRole('Clutch', 'position')).toBe(true);
  });

  it('pitcher-only traits are ineligible for position players', () => {
    expect(isTraitEligibleForRole('K Collector', 'pitcher')).toBe(true);
    expect(isTraitEligibleForRole('K Collector', 'position')).toBe(false);
  });

  it('position-only traits are ineligible for pitchers', () => {
    expect(isTraitEligibleForRole('Stealer', 'position')).toBe(true);
    expect(isTraitEligibleForRole('Stealer', 'pitcher')).toBe(false);
  });

  it('cut traits are never eligible', () => {
    expect(isTraitEligibleForRole('Sign Stealer', 'pitcher')).toBe(false);
    expect(isTraitEligibleForRole('Sign Stealer', 'position')).toBe(false);
  });
});

describe('traitRealityScorer — strength score (TS-2)', () => {
  it('returns the peer-relative percentile when all gates pass', () => {
    const result = computeTraitRealityScore(baseInput(), MLB_CONFIG);
    expect(result.sufficient).toBe(true);
    expect(result.sufficiency).toBe('sufficient');
    // signalValue 5 is <= 5 of {1..10} → 5/10 = 0.5.
    expect(result.realityPercentile).toBeCloseTo(0.5, 10);
  });

  it('top of the pool scores ~1.0, bottom scores low', () => {
    const top = computeTraitRealityScore(baseInput({ signalValue: 10 }), MLB_CONFIG);
    expect(top.realityPercentile).toBeCloseTo(1.0, 10);
    const bottom = computeTraitRealityScore(baseInput({ signalValue: 1 }), MLB_CONFIG);
    expect(bottom.realityPercentile).toBeCloseTo(0.1, 10);
  });

  it('does not require pre-sorted peer values', () => {
    const shuffled = computeTraitRealityScore(
      baseInput({ peerValues: [10, 3, 7, 1, 5, 9, 2, 8, 4, 6] }),
      MLB_CONFIG,
    );
    expect(shuffled.realityPercentile).toBeCloseTo(0.5, 10);
  });

  it('gates on a thin counting sample (the VI.1 valve)', () => {
    const result = computeTraitRealityScore(
      baseInput({ basis: 'season', sampleSize: 5 }),
      MLB_CONFIG,
    );
    expect(result.sufficient).toBe(false);
    expect(result.sufficiency).toBe('thin_sample');
    expect(result.realityPercentile).toBeNull();
    expect(result.scaledMinSample).toBe(TRAIT_REALITY_SCORER_TUNING.minSampleSeason);
  });

  it('gates on a thin peer pool', () => {
    const result = computeTraitRealityScore(
      baseInput({ peerValues: [1, 2] }),
      MLB_CONFIG,
    );
    expect(result.sufficient).toBe(false);
    expect(result.sufficiency).toBe('thin_peer_pool');
    expect(result.realityPercentile).toBeNull();
  });

  it('gates a role-ineligible trait before scoring', () => {
    const result = computeTraitRealityScore(
      baseInput({ traitName: 'K Collector', playerRole: 'position' }),
      MLB_CONFIG,
    );
    expect(result.sufficient).toBe(false);
    expect(result.sufficiency).toBe('ineligible_role');
  });

  it('gates an unknown trait name', () => {
    const result = computeTraitRealityScore(
      baseInput({ traitName: 'Nonexistent Trait' }),
      MLB_CONFIG,
    );
    expect(result.sufficiency).toBe('unknown_trait');
    expect(result.realityPercentile).toBeNull();
  });

  it('scales the counting floor DOWN for a short SMB4 season', () => {
    // 128 games / 6 innings: season factor 128/162 ≈ 0.790 → floor 50 → 40.
    const smb4: AdaptiveStandardsConfig = {
      gamesPerSeason: 128,
      inningsPerGame: 6,
      baselineGames: MLB_BASELINE_GAMES,
      baselineInnings: MLB_BASELINE_INNINGS,
      source: 'explicit',
    };
    const result = computeTraitRealityScore(
      baseInput({ basis: 'season', sampleSize: 45 }),
      smb4,
    );
    // 45 clears the shrunk floor (40) even though it would fail the MLB floor (50).
    expect(result.scaledMinSample).toBe(40);
    expect(result.sufficient).toBe(true);
  });

  it("does NOT scale a 'none'-basis rate floor with season length", () => {
    const smb4: AdaptiveStandardsConfig = {
      gamesPerSeason: 128,
      inningsPerGame: 6,
      baselineGames: MLB_BASELINE_GAMES,
      baselineInnings: MLB_BASELINE_INNINGS,
      source: 'explicit',
    };
    const result = computeTraitRealityScore(baseInput({ basis: 'none' }), smb4);
    expect(result.scaledMinSample).toBe(TRAIT_REALITY_SCORER_TUNING.minSampleRate);
  });

  it('defaults the adaptive config when omitted', () => {
    expect(DEFAULT_ADAPTIVE_STANDARDS_CONFIG.source).toBe('default');
    const result = computeTraitRealityScore(baseInput());
    expect(result.sufficient).toBe(true);
  });
});
