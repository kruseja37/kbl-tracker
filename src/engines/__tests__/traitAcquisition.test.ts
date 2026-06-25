import { describe, expect, test } from 'vitest';

import {
  CANONICAL_TRAIT_NAMES,
  type PlayerRole,
  type TraitRealityScore,
} from '../traitRealityScorer';
import {
  TRAIT_ACQUISITION_TUNING,
  TRAIT_FIRING_CURVE,
  TRAIT_OPPOSITES,
  computeTraitAcquisition,
  firingProbability,
  type HeldTrait,
  type TraitAcquisitionInput,
  type TraitAcquisitionTuning,
} from '../traitAcquisition';
import type { HiddenModifiers } from '../../types/game';
import { assignTier, computeTraitWeight } from '../../data/traitTierConfig';

const FORCE_GAIN_TUNING: TraitAcquisitionTuning = {
  ...TRAIT_ACQUISITION_TUNING,
  gainThreshold: 0,
};

const NO_SWING_FORCE_GAIN_TUNING: TraitAcquisitionTuning = {
  ambitionSwing: 0,
  resilienceSwing: 0,
  imageSwing: 0,
  moraleSwing: 0,
  rosterSwing: 0,
  gainThreshold: 0,
  loseThreshold: 0.35,
};

const neutralModifiers: HiddenModifiers = {
  loyalty: 50,
  ambition: 50,
  resilience: 50,
  charisma: 50,
};

function score(
  traitName: string,
  realityPercentile: number | null,
  sufficient = true,
  sufficiency: TraitRealityScore['sufficiency'] = sufficient ? 'sufficient' : 'thin_sample',
): TraitRealityScore {
  return {
    traitName,
    realityPercentile,
    sufficient,
    sufficiency,
    scaledMinSample: 10,
    peerPoolSize: 10,
  };
}

function input(overrides: Partial<TraitAcquisitionInput> = {}): TraitAcquisitionInput {
  const traitName = overrides.candidates?.[0]?.traitName ?? 'CON vs LHP';

  return {
    playerRole: 'position',
    personality: 'Relaxed',
    modifiers: neutralModifiers,
    currentMorale: 50,
    rosterRole: 'unknown',
    heldTraits: [],
    candidates: [{ traitName, score: score(traitName, 0.8) }],
    ...overrides,
  };
}

function fnv1aUnitForTest(seed: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return (hash >>> 0) / 0xffffffff;
}

function proposalFor(
  traitName: string,
  overrides: Partial<TraitAcquisitionInput> = {},
  tuning: TraitAcquisitionTuning = FORCE_GAIN_TUNING,
) {
  const result = computeTraitAcquisition(
    input({
      candidates: [{ traitName, score: score(traitName, 1) }],
      ...overrides,
    }),
    tuning,
  );

  expect(result.proposals).toHaveLength(1);
  return result.proposals[0];
}

describe('traitAcquisition §8B seeded firing likelihood', () => {
  test('firingProbability is monotonic by margin, tier-harder, bounded, and margin-clamped', () => {
    const commonAtZero = firingProbability(0, 'COMMON');
    const commonAtHalf = firingProbability(0.5, 'COMMON');
    const commonAtOne = firingProbability(1, 'COMMON');

    expect(commonAtZero).toBeGreaterThanOrEqual(TRAIT_FIRING_CURVE.floor);
    expect(commonAtZero).toBeLessThanOrEqual(commonAtHalf);
    expect(commonAtHalf).toBeLessThanOrEqual(commonAtOne);
    expect(commonAtOne).toBeLessThanOrEqual(TRAIT_FIRING_CURVE.ceil);

    expect(firingProbability(0.5, 'ELITE')).toBeLessThan(firingProbability(0.5, 'RARE'));
    expect(firingProbability(0.5, 'RARE')).toBeLessThan(firingProbability(0.5, 'UNCOMMON'));
    expect(firingProbability(0.5, 'UNCOMMON')).toBeLessThan(firingProbability(0.5, 'COMMON'));

    expect(firingProbability(-1, 'ELITE')).toBe(TRAIT_FIRING_CURVE.floor);
    expect(firingProbability(2, 'COMMON')).toBe(firingProbability(1, 'COMMON'));
    expect(firingProbability(2, 'COMMON')).toBeCloseTo(0.95, 12);

    for (const margin of [-10, 0, 0.5, 1, 10]) {
      for (const tier of ['ELITE', 'RARE', 'UNCOMMON', 'COMMON', 'SEVERE', 'MODERATE', 'MINOR'] as const) {
        const probability = firingProbability(margin, tier);
        expect(probability).toBeGreaterThanOrEqual(TRAIT_FIRING_CURVE.floor);
        expect(probability).toBeLessThanOrEqual(TRAIT_FIRING_CURVE.ceil);
      }
    }
  });

  test('same input and seed produce byte-identical proposals and skipped rows', () => {
    const seededInput = input({
      seed: 't5b-2',
      candidates: [
        { traitName: 'CON vs LHP', score: score('CON vs LHP', 0.71) },
        { traitName: 'Sprinter', score: score('Sprinter', 0.95) },
      ],
    });

    const first = computeTraitAcquisition(seededInput);
    const second = computeTraitAcquisition(seededInput);

    expect(JSON.stringify(second.proposals)).toBe(JSON.stringify(first.proposals));
    expect(JSON.stringify(second.skipped)).toBe(JSON.stringify(first.skipped));
    expect(first.proposals).toMatchObject([
      { traitName: 'Sprinter', valence: 'gain', probability: 0.95 },
    ]);
    expect(first.skipped).toContainEqual({
      traitName: 'CON vs LHP',
      reason: 'likelihood_not_fired',
    });
  });

  test('seeded roll is opt-in: unseeded eligible gain fires, but a high draw can defer it', () => {
    const tier = assignTier('CON vs LHP');
    expect(tier.tier).toBe('UNCOMMON');
    expect(tier.gainThreshold).toBe(0.70);

    const borderlineProbability = 0.71;
    const normalizedMargin = (borderlineProbability - tier.gainThreshold)
      / (1 - tier.gainThreshold);
    const fireProb = firingProbability(normalizedMargin, tier.tier);
    const missSeed = 't5b-2';
    const fireSeed = 't5b-0';
    const missDraw = fnv1aUnitForTest(`${missSeed}:CON vs LHP:gain`);
    const fireDraw = fnv1aUnitForTest(`${fireSeed}:CON vs LHP:gain`);

    expect(normalizedMargin).toBeCloseTo(0.03333333333333336, 12);
    expect(fireProb).toBeCloseTo(0.1566666666666667, 12);
    expect(missDraw).toBeCloseTo(0.3151148346520762, 12);
    expect(fireDraw).toBeCloseTo(0.031117576880175055, 12);
    expect(missDraw).toBeGreaterThanOrEqual(fireProb);
    expect(fireDraw).toBeLessThan(fireProb);

    const borderlineInput = input({
      candidates: [{ traitName: 'CON vs LHP', score: score('CON vs LHP', borderlineProbability) }],
    });
    const unseeded = computeTraitAcquisition(borderlineInput);
    const seededMiss = computeTraitAcquisition({ ...borderlineInput, seed: missSeed });
    const seededFire = computeTraitAcquisition({ ...borderlineInput, seed: fireSeed });
    const highMargin = computeTraitAcquisition(input({
      seed: missSeed,
      candidates: [{ traitName: 'CON vs LHP', score: score('CON vs LHP', 1) }],
    }));

    expect(unseeded.proposals).toMatchObject([
      { traitName: 'CON vs LHP', valence: 'gain', probability: borderlineProbability },
    ]);
    expect(unseeded.skipped).toEqual([]);
    expect(seededMiss.proposals).toEqual([]);
    expect(seededMiss.skipped).toEqual([
      { traitName: 'CON vs LHP', reason: 'likelihood_not_fired' },
    ]);
    expect(seededFire.proposals).toMatchObject([
      { traitName: 'CON vs LHP', valence: 'gain', probability: borderlineProbability },
    ]);
    expect(highMargin.proposals).toMatchObject([
      { traitName: 'CON vs LHP', valence: 'gain', probability: 1 },
    ]);
  });

  test('losses use the same seeded likelihood roll and a missed loss leaves the held trait intact', () => {
    const tier = assignTier('CON vs LHP');
    expect(tier.lossThreshold).toBe(0.30);

    const heldProbability = 0.29;
    const normalizedMargin = (tier.lossThreshold - heldProbability) / tier.lossThreshold;
    const fireProb = firingProbability(normalizedMargin, tier.tier);
    const seed = 't5b-0';
    const draw = fnv1aUnitForTest(`${seed}:CON vs LHP:lose`);

    expect(normalizedMargin).toBeCloseTo(0.03333333333333336, 12);
    expect(fireProb).toBeCloseTo(0.1566666666666667, 12);
    expect(draw).toBeCloseTo(0.2940758311408748, 12);
    expect(draw).toBeGreaterThanOrEqual(fireProb);

    const result = computeTraitAcquisition(input({
      seed,
      heldTraits: [{ traitName: 'CON vs LHP', strength: 0.5 }],
      candidates: [{ traitName: 'CON vs LHP', score: score('CON vs LHP', heldProbability) }],
    }));

    expect(result.proposals).toEqual([]);
    expect(result.skipped).toEqual([
      { traitName: 'CON vs LHP', reason: 'likelihood_not_fired' },
    ]);
  });
});

describe('traitAcquisition combiner (VI.0 / TS-1)', () => {
  test('neutral inputs leave probability equal to the reality percentile', () => {
    const proposal = proposalFor('CON vs LHP', {
      personality: 'Tough',
      currentMorale: 50,
    });

    expect(proposal.imageValence).toBe('neutral');
    expect(proposal.probability).toBeCloseTo(1, 10);
    expect(proposal.realityPercentile).toBeCloseTo(1, 10);
    expect(proposal.factors).toEqual({
      ambitionTilt: 1,
      resilienceTilt: 1,
      imageAxisTilt: 1,
      moraleFactor: 1,
      rosterRoleFactor: 1,
      charismaTilt: 1,
      resiliencePositiveTilt: 1,
    });
  });

  test('ambition boosts positive-image probability and low ambition suppresses it', () => {
    const high = proposalFor('Base Rounder', {
      modifiers: { ...neutralModifiers, ambition: 100 },
    });
    const low = proposalFor('Base Rounder', {
      modifiers: { ...neutralModifiers, ambition: 0 },
    });

    expect(high.factors.ambitionTilt).toBeCloseTo(1.35, 10);
    expect(low.factors.ambitionTilt).toBeCloseTo(0.65, 10);
    expect(high.probability).toBeGreaterThan(low.probability);
  });

  test('ambition does not affect negative-image traits', () => {
    const high = proposalFor('Choker', {
      modifiers: { ...neutralModifiers, ambition: 100 },
    });
    const low = proposalFor('Choker', {
      modifiers: { ...neutralModifiers, ambition: 0 },
    });

    expect(high.factors.ambitionTilt).toBe(1);
    expect(low.factors.ambitionTilt).toBe(1);
    expect(high.probability).toBeCloseTo(low.probability, 10);
  });

  test('low resilience boosts negative-image probability and high resilience suppresses it', () => {
    const low = proposalFor('Choker', {
      modifiers: { ...neutralModifiers, resilience: 0 },
    });
    const high = proposalFor('Choker', {
      modifiers: { ...neutralModifiers, resilience: 100 },
    });

    expect(low.factors.resilienceTilt).toBeCloseTo(1.35, 10);
    expect(high.factors.resilienceTilt).toBeCloseTo(0.65, 10);
    expect(low.probability).toBeGreaterThan(high.probability);
  });

  test('resilience does not affect positive-image traits', () => {
    const high = proposalFor('Clutch', {
      modifiers: { ...neutralModifiers, resilience: 100 },
    });
    const low = proposalFor('Clutch', {
      modifiers: { ...neutralModifiers, resilience: 0 },
    });

    expect(high.factors.resilienceTilt).toBe(1);
    expect(low.factors.resilienceTilt).toBe(1);
    expect(high.probability).toBeCloseTo(low.probability, 10);
  });

  test('canonical image-driver personality boosts matching traits', () => {
    const tough = proposalFor('Base Rounder', {
      personality: 'Tough',
      candidates: [{ traitName: 'Base Rounder', score: score('Base Rounder', 0.7) }],
    });
    const relaxed = proposalFor('Base Rounder', {
      personality: 'Relaxed',
      candidates: [{ traitName: 'Base Rounder', score: score('Base Rounder', 0.7) }],
    });

    expect(tough.factors.imageAxisTilt).toBeCloseTo(1.25, 10);
    expect(relaxed.factors.imageAxisTilt).toBe(1);
    expect(tough.probability).toBeGreaterThan(relaxed.probability);
  });

  test('Composed flavor personality maps into the composure image axis', () => {
    const composed = proposalFor('RBI Hero', { personality: 'Composed' });

    expect(composed.factors.imageAxisTilt).toBeCloseTo(1.25, 10);
  });

  test('no-image traits never receive an image-axis boost', () => {
    const utility = proposalFor('Utility', {
      personality: 'Tough',
      rosterRole: 'unknown',
    });

    expect(utility.imageValence).toBe('neutral');
    expect(utility.factors.imageAxisTilt).toBe(1);
  });

  test('morale raises positive-image probability when high and lowers it when low', () => {
    const high = proposalFor('Clutch', { currentMorale: 99 });
    const low = proposalFor('Clutch', { currentMorale: 0 });

    expect(high.factors.moraleFactor).toBeGreaterThan(1);
    expect(low.factors.moraleFactor).toBeLessThan(1);
    expect(high.probability).toBeGreaterThan(low.probability);
  });

  test('morale raises negative-image probability when low and lowers it when high', () => {
    const low = proposalFor('Choker', { currentMorale: 0 });
    const high = proposalFor('Choker', { currentMorale: 99 });

    expect(low.factors.moraleFactor).toBeGreaterThan(1);
    expect(high.factors.moraleFactor).toBeLessThan(1);
    expect(low.probability).toBeGreaterThan(high.probability);
  });

  test('roster role only tilts Pinch Perfect and Utility', () => {
    const benchUtility = proposalFor('Utility', { rosterRole: 'bench' });
    const starterUtility = proposalFor('Utility', { rosterRole: 'starter' });
    const benchClutch = proposalFor('Clutch', { rosterRole: 'bench' });
    const starterClutch = proposalFor('Clutch', { rosterRole: 'starter' });

    expect(benchUtility.factors.rosterRoleFactor).toBeCloseTo(1.3, 10);
    expect(starterUtility.factors.rosterRoleFactor).toBeCloseTo(0.7, 10);
    expect(benchUtility.probability).toBeGreaterThan(starterUtility.probability);
    expect(benchClutch.factors.rosterRoleFactor).toBe(1);
    expect(starterClutch.factors.rosterRoleFactor).toBe(1);
  });

  test('probability clamps at the upper extreme', () => {
    const result = computeTraitAcquisition(
      input({
        personality: 'Tough',
        modifiers: { ...neutralModifiers, ambition: 100 },
        currentMorale: 99,
        candidates: [{ traitName: 'Clutch', score: score('Clutch', 2) }],
      }),
      FORCE_GAIN_TUNING,
    );

    expect(result.proposals[0].realityPercentile).toBe(1);
    expect(result.proposals[0].probability).toBe(1);
  });
});

describe('traitAcquisition R-E-a latent-bug fixes + dormant tilts (§0.6/§0.7/§0.8)', () => {
  // (a) Cannon Arm is now POSITIVE (POSITIVE_IMAGE_TRAITS) with a COMPETITIVE image driver.
  test('Cannon Arm is positive: high ambition tilts up and COMPETITIVE drives the image axis', () => {
    const ambitious = proposalFor('Cannon Arm', {
      modifiers: { ...neutralModifiers, ambition: 100 },
    });
    const driven = proposalFor('Cannon Arm', {
      personality: 'Competitive',
    });

    expect(ambitious.imageValence).toBe('positive');
    expect(ambitious.factors.ambitionTilt).toBeGreaterThan(1);
    expect(driven.factors.imageAxisTilt).toBeGreaterThan(1);
  });

  // (b) Durable is now POSITIVE (universal) with NO image driver.
  test('Durable is positive: high ambition tilts up and there is no image driver', () => {
    const ambitious = proposalFor('Durable', {
      modifiers: { ...neutralModifiers, ambition: 100 },
    });

    expect(ambitious.imageValence).toBe('positive');
    expect(ambitious.factors.ambitionTilt).toBeGreaterThan(1);
    expect(ambitious.factors.imageAxisTilt).toBe(1);
  });

  // (c) Injury Prone is now NEGATIVE: low resilience raises the negative trait.
  test('Injury Prone is negative: low resilience raises its probability', () => {
    const fragile = proposalFor('Injury Prone', {
      modifiers: { ...neutralModifiers, resilience: 0 },
    });

    expect(fragile.imageValence).toBe('negative');
    expect(fragile.factors.resilienceTilt).toBeGreaterThan(1);
  });

  // (d) charismaTilt: K Neglector (canonical, pitcher-only, NOT in BUILDABLE) — low charisma > 1, high < 1.
  test('charismaTilt rises for K Neglector at low charisma and falls at high charisma', () => {
    const lowCharisma = proposalFor('K Neglector', {
      playerRole: 'pitcher',
      modifiers: { ...neutralModifiers, charisma: 0 },
    });
    const highCharisma = proposalFor('K Neglector', {
      playerRole: 'pitcher',
      modifiers: { ...neutralModifiers, charisma: 100 },
    });

    expect(lowCharisma.factors.charismaTilt).toBeGreaterThan(1);
    expect(highCharisma.factors.charismaTilt).toBeLessThan(1);
    expect(lowCharisma.probability).toBeGreaterThan(highCharisma.probability);
  });

  // (d-cont) charismaTilt defaults to 1 for every non-listed trait.
  test('charismaTilt stays 1 for traits outside CHARISMA_SENSITIVE_TRAITS regardless of charisma', () => {
    const lowCharismaClutch = proposalFor('Clutch', {
      modifiers: { ...neutralModifiers, charisma: 0 },
    });
    const highCharismaClutch = proposalFor('Clutch', {
      modifiers: { ...neutralModifiers, charisma: 100 },
    });

    expect(lowCharismaClutch.factors.charismaTilt).toBe(1);
    expect(highCharismaClutch.factors.charismaTilt).toBe(1);
  });

  // (e) resiliencePositiveTilt: Composed / Gets Ahead (canonical, pitcher-only, NOT in BUILDABLE) — high resilience > 1.
  test('resiliencePositiveTilt rises for Composed at high resilience', () => {
    const resilient = proposalFor('Composed', {
      playerRole: 'pitcher',
      modifiers: { ...neutralModifiers, resilience: 100 },
    });

    expect(resilient.factors.resiliencePositiveTilt).toBeGreaterThan(1);
  });

  test('resiliencePositiveTilt rises for Gets Ahead at high resilience', () => {
    const resilient = proposalFor('Gets Ahead', {
      playerRole: 'pitcher',
      modifiers: { ...neutralModifiers, resilience: 100 },
    });

    expect(resilient.factors.resiliencePositiveTilt).toBeGreaterThan(1);
  });

  // (e-cont) resiliencePositiveTilt defaults to 1 for every non-listed trait.
  test('resiliencePositiveTilt stays 1 for traits outside RESILIENCE_POSITIVE_TRAITS', () => {
    const resilientClutch = proposalFor('Clutch', {
      modifiers: { ...neutralModifiers, resilience: 100 },
    });

    expect(resilientClutch.factors.resiliencePositiveTilt).toBe(1);
  });

  // (f) the factors object now carries both new keys.
  test('factors object includes charismaTilt and resiliencePositiveTilt', () => {
    const proposal = proposalFor('CON vs LHP');

    expect(proposal.factors).toHaveProperty('charismaTilt');
    expect(proposal.factors).toHaveProperty('resiliencePositiveTilt');
    expect(Object.keys(proposal.factors).sort()).toEqual([
      'ambitionTilt',
      'charismaTilt',
      'imageAxisTilt',
      'moraleFactor',
      'resiliencePositiveTilt',
      'resilienceTilt',
      'rosterRoleFactor',
    ]);
  });
});

describe('traitAcquisition R1-a (K Neglector enters BUILDABLE)', () => {
  // K Neglector is now negative-valence with a TIMID/DROOPY image driver.
  test('K Neglector is negative: a DROOPY image driver fires and low resilience raises it', () => {
    const droopyFragile = proposalFor('K Neglector', {
      playerRole: 'pitcher',
      personality: 'Droopy',
      modifiers: { ...neutralModifiers, resilience: 0 },
    });

    expect(droopyFragile.imageValence).toBe('negative');
    expect(droopyFragile.factors.imageAxisTilt).toBeGreaterThan(1);
    expect(droopyFragile.factors.resilienceTilt).toBeGreaterThan(1);
  });

  test('K Neglector TIMID personality also drives the image axis', () => {
    const timid = proposalFor('K Neglector', {
      playerRole: 'pitcher',
      personality: 'Timid',
    });

    expect(timid.factors.imageAxisTilt).toBeGreaterThan(1);
  });

  // (still) low charisma raises K Neglector P via the R-E-a charisma factor.
  test('low charisma raises K Neglector probability above high charisma', () => {
    const lowCharisma = proposalFor('K Neglector', {
      playerRole: 'pitcher',
      modifiers: { ...neutralModifiers, charisma: 0 },
    });
    const highCharisma = proposalFor('K Neglector', {
      playerRole: 'pitcher',
      modifiers: { ...neutralModifiers, charisma: 100 },
    });

    expect(lowCharisma.factors.charismaTilt).toBeGreaterThan(1);
    expect(highCharisma.factors.charismaTilt).toBeLessThan(1);
    expect(lowCharisma.probability).toBeGreaterThan(highCharisma.probability);
  });
});

describe('traitAcquisition R1-b1 (Big/Little Hack image deltas; Base Rounder unchanged; Distractor neutral)', () => {
  // Big Hack is now POSITIVE with an EGOTISTICAL image driver (§0.7).
  test('Big Hack is positive: high ambition tilts up and EGOTISTICAL drives the image axis', () => {
    const ambitious = proposalFor('Big Hack', {
      modifiers: { ...neutralModifiers, ambition: 100 },
    });
    const driven = proposalFor('Big Hack', {
      personality: 'Egotistical',
    });

    expect(ambitious.imageValence).toBe('positive');
    expect(ambitious.factors.ambitionTilt).toBeGreaterThan(1);
    expect(driven.factors.imageAxisTilt).toBeGreaterThan(1);
  });

  // Little Hack is now POSITIVE with a TOUGH image driver (§0.7).
  test('Little Hack is positive: high ambition tilts up and TOUGH drives the image axis', () => {
    const ambitious = proposalFor('Little Hack', {
      modifiers: { ...neutralModifiers, ambition: 100 },
    });
    const driven = proposalFor('Little Hack', {
      personality: 'Tough',
    });

    expect(ambitious.imageValence).toBe('positive');
    expect(ambitious.factors.ambitionTilt).toBeGreaterThan(1);
    expect(driven.factors.imageAxisTilt).toBeGreaterThan(1);
  });

  // Big Hack's driver is EGOTISTICAL, not TOUGH; Little Hack's is TOUGH, not EGOTISTICAL.
  test('the Hack image drivers do not cross over', () => {
    const bigWithTough = proposalFor('Big Hack', { personality: 'Tough' });
    const littleWithEgo = proposalFor('Little Hack', { personality: 'Egotistical' });

    expect(bigWithTough.factors.imageAxisTilt).toBe(1);
    expect(littleWithEgo.factors.imageAxisTilt).toBe(1);
  });

  // Base Rounder was ALREADY positive with a COMPETITIVE/TOUGH driver (pre-R1-b1) — unchanged.
  test('Base Rounder stays positive with a COMPETITIVE/TOUGH image driver', () => {
    const competitive = proposalFor('Base Rounder', { personality: 'Competitive' });
    const tough = proposalFor('Base Rounder', { personality: 'Tough' });

    expect(competitive.imageValence).toBe('positive');
    expect(competitive.factors.imageAxisTilt).toBeGreaterThan(1);
    expect(tough.factors.imageAxisTilt).toBeGreaterThan(1);
  });

  // Distractor is neutral/universal tilt — no image-set entry (§0.7).
  test('Distractor is neutral: no image valence and no personality drives its image axis', () => {
    const egotistical = proposalFor('Distractor', { personality: 'Egotistical' });
    const tough = proposalFor('Distractor', { personality: 'Tough' });

    expect(egotistical.imageValence).toBe('neutral');
    expect(egotistical.factors.imageAxisTilt).toBe(1);
    expect(tough.factors.imageAxisTilt).toBe(1);
  });
});

describe('traitAcquisition R1-b2 (Bunter positive+TOUGH; Crossed Up + Utility neutral)', () => {
  // Bunter was ALREADY positive (POSITIVE_IMAGE_TRAITS) with a TOUGH image driver
  // (§0.6) before this ticket — verify it stays so as Bunter enters BUILDABLE.
  test('Bunter is positive: high ambition tilts up and TOUGH drives the image axis', () => {
    const ambitious = proposalFor('Bunter', {
      modifiers: { ...neutralModifiers, ambition: 100 },
    });
    const driven = proposalFor('Bunter', { personality: 'Tough' });

    expect(ambitious.imageValence).toBe('positive');
    expect(ambitious.factors.ambitionTilt).toBeGreaterThan(1);
    expect(driven.factors.imageAxisTilt).toBeGreaterThan(1);
  });

  // Bunter's image driver is TOUGH only — EGOTISTICAL/COMPETITIVE do NOT drive it.
  test('Bunter image driver is TOUGH only (no cross-driver)', () => {
    const ego = proposalFor('Bunter', { personality: 'Egotistical' });
    const competitive = proposalFor('Bunter', { personality: 'Competitive' });

    expect(ego.factors.imageAxisTilt).toBe(1);
    expect(competitive.factors.imageAxisTilt).toBe(1);
  });

  // Crossed Up is neutral/pitcher-only — no image-set entry (§0.7).
  test('Crossed Up is neutral: no image valence and no personality drives its image axis', () => {
    const droopy = proposalFor('Crossed Up', {
      playerRole: 'pitcher',
      personality: 'Droopy',
    });
    const timid = proposalFor('Crossed Up', {
      playerRole: 'pitcher',
      personality: 'Timid',
    });

    expect(droopy.imageValence).toBe('neutral');
    expect(droopy.factors.imageAxisTilt).toBe(1);
    expect(timid.factors.imageAxisTilt).toBe(1);
  });

  // Utility is neutral with a BENCH roster tilt (ROSTER_ROLE_TRAITS) — no image entry.
  test('Utility is neutral with a bench roster tilt and no image axis', () => {
    const neutralImage = proposalFor('Utility', { personality: 'Tough' });
    const bench = proposalFor('Utility', { rosterRole: 'bench' });
    const starter = proposalFor('Utility', { rosterRole: 'starter' });

    expect(neutralImage.imageValence).toBe('neutral');
    expect(neutralImage.factors.imageAxisTilt).toBe(1);
    // Bench tilts Utility's probability up vs starter (the ROSTER_ROLE factor).
    expect(bench.factors.rosterRoleFactor).toBeGreaterThan(1);
    expect(starter.factors.rosterRoleFactor).toBeLessThan(1);
    expect(bench.probability).toBeGreaterThan(starter.probability);
  });
});

describe('traitAcquisition R2 (count-family + First-Pitch image deltas; handedness splits neutral)', () => {
  // BB Prone is now NEGATIVE with NO image driver (mechanical) — low resilience raises it.
  test('BB Prone is negative: low resilience raises it and NO personality drives its image axis', () => {
    const fragile = proposalFor('BB Prone', {
      playerRole: 'pitcher',
      modifiers: { ...neutralModifiers, resilience: 0 },
    });
    const timid = proposalFor('BB Prone', { playerRole: 'pitcher', personality: 'Timid' });
    const droopy = proposalFor('BB Prone', { playerRole: 'pitcher', personality: 'Droopy' });

    expect(fragile.imageValence).toBe('negative');
    expect(fragile.factors.resilienceTilt).toBeGreaterThan(1);
    // BB Prone has NO IMAGE_DRIVER_SETS entry — no personality drives its image axis.
    expect(timid.factors.imageAxisTilt).toBe(1);
    expect(droopy.factors.imageAxisTilt).toBe(1);
  });

  // Falls Behind is now NEGATIVE with a TIMID image driver (§0.7).
  test('Falls Behind is negative: low resilience raises it and TIMID drives the image axis', () => {
    const fragile = proposalFor('Falls Behind', {
      playerRole: 'pitcher',
      personality: 'Timid',
      modifiers: { ...neutralModifiers, resilience: 0 },
    });

    expect(fragile.imageValence).toBe('negative');
    expect(fragile.factors.resilienceTilt).toBeGreaterThan(1);
    expect(fragile.factors.imageAxisTilt).toBeGreaterThan(1);
  });

  // Composed is now POSITIVE with NO image driver; its lean is the high-Resilience positive path.
  test('Composed is positive: high resilience tilts it up via resiliencePositiveTilt and there is no image driver', () => {
    const resilient = proposalFor('Composed', {
      playerRole: 'pitcher',
      modifiers: { ...neutralModifiers, resilience: 100 },
    });
    const tough = proposalFor('Composed', { playerRole: 'pitcher', personality: 'Tough' });

    expect(resilient.imageValence).toBe('positive');
    // The R-E-a high-Resilience positive path fires (RESILIENCE_POSITIVE_TRAITS membership).
    expect(resilient.factors.resiliencePositiveTilt).toBeGreaterThan(1);
    // Composed has NO IMAGE_DRIVER_SETS entry — no personality drives its image axis.
    expect(tough.factors.imageAxisTilt).toBe(1);
  });

  // Gets Ahead is now POSITIVE with a COMPETITIVE image driver (§0.7).
  test('Gets Ahead is positive: COMPETITIVE drives the image axis and high resilience tilts it up', () => {
    const competitive = proposalFor('Gets Ahead', {
      playerRole: 'pitcher',
      personality: 'Competitive',
    });
    const resilient = proposalFor('Gets Ahead', {
      playerRole: 'pitcher',
      modifiers: { ...neutralModifiers, resilience: 100 },
    });

    expect(competitive.imageValence).toBe('positive');
    expect(competitive.factors.imageAxisTilt).toBeGreaterThan(1);
    expect(resilient.factors.resiliencePositiveTilt).toBeGreaterThan(1);
  });

  // First Pitch Slayer is now POSITIVE with a COMPETITIVE/EGOTISTICAL image driver (§0.7).
  test('First Pitch Slayer is positive: COMPETITIVE and EGOTISTICAL both drive the image axis', () => {
    const competitive = proposalFor('First Pitch Slayer', { personality: 'Competitive' });
    const egotistical = proposalFor('First Pitch Slayer', { personality: 'Egotistical' });

    expect(competitive.imageValence).toBe('positive');
    expect(competitive.factors.imageAxisTilt).toBeGreaterThan(1);
    expect(egotistical.factors.imageAxisTilt).toBeGreaterThan(1);
  });

  // First Pitch Prayer is now NEGATIVE with a TIMID/DROOPY image driver (§0.7).
  test('First Pitch Prayer is negative: TIMID and DROOPY drive the image axis and low resilience raises it', () => {
    const timid = proposalFor('First Pitch Prayer', { personality: 'Timid' });
    const droopy = proposalFor('First Pitch Prayer', { personality: 'Droopy' });
    const fragile = proposalFor('First Pitch Prayer', {
      modifiers: { ...neutralModifiers, resilience: 0 },
    });

    expect(timid.imageValence).toBe('negative');
    expect(timid.factors.imageAxisTilt).toBeGreaterThan(1);
    expect(droopy.factors.imageAxisTilt).toBeGreaterThan(1);
    expect(fragile.factors.resilienceTilt).toBeGreaterThan(1);
  });

  // The First-Pitch pair drivers do not cross over.
  test('First Pitch Slayer is not driven by TIMID/DROOPY; Prayer is not driven by COMPETITIVE/EGOTISTICAL', () => {
    const slayerTimid = proposalFor('First Pitch Slayer', { personality: 'Timid' });
    const slayerDroopy = proposalFor('First Pitch Slayer', { personality: 'Droopy' });
    const prayerCompetitive = proposalFor('First Pitch Prayer', { personality: 'Competitive' });
    const prayerEgo = proposalFor('First Pitch Prayer', { personality: 'Egotistical' });

    expect(slayerTimid.factors.imageAxisTilt).toBe(1);
    expect(slayerDroopy.factors.imageAxisTilt).toBe(1);
    expect(prayerCompetitive.factors.imageAxisTilt).toBe(1);
    expect(prayerEgo.factors.imageAxisTilt).toBe(1);
  });

  // The 6 handedness splits are NEUTRAL (§0.6) — no image valence, no image driver.
  test('the 6 handedness splits are neutral: no image valence and no personality drives the image axis', () => {
    const positionSplits = ['CON vs LHP', 'CON vs RHP', 'POW vs LHP', 'POW vs RHP'];
    for (const traitName of positionSplits) {
      const ego = proposalFor(traitName, { personality: 'Egotistical' });
      const timid = proposalFor(traitName, { personality: 'Timid' });
      expect(ego.imageValence).toBe('neutral');
      expect(ego.factors.imageAxisTilt).toBe(1);
      expect(timid.factors.imageAxisTilt).toBe(1);
    }
    const pitcherSplits = ['Specialist', 'Reverse Splits'];
    for (const traitName of pitcherSplits) {
      const ego = proposalFor(traitName, { playerRole: 'pitcher', personality: 'Egotistical' });
      const timid = proposalFor(traitName, { playerRole: 'pitcher', personality: 'Timid' });
      expect(ego.imageValence).toBe('neutral');
      expect(ego.factors.imageAxisTilt).toBe(1);
      expect(timid.factors.imageAxisTilt).toBe(1);
    }
  });
});

describe('traitAcquisition R1-b3 / PRE-ACT-TRAITS-1 (Two Way C/IF/OF family — acquisition UNCHANGED)', () => {
  // R1-b3 / PRE-ACT-TRAITS-1 make NO acquisition change. All THREE Two Way variants
  // were ALREADY positive (POSITIVE_IMAGE_TRAITS) with an EGOTISTICAL image driver
  // (§0.6) — verify each stays so now that the builder seeds variants per pitcher.
  // Pitcher-only.
  test.each(['Two Way (C)', 'Two Way (IF)', 'Two Way (OF)'])(
    '%s is positive: high ambition tilts up and EGOTISTICAL drives the image axis',
    (traitName) => {
      const ambitious = proposalFor(traitName, {
        playerRole: 'pitcher',
        modifiers: { ...neutralModifiers, ambition: 100 },
      });
      const driven = proposalFor(traitName, { playerRole: 'pitcher', personality: 'Egotistical' });

      expect(ambitious.imageValence).toBe('positive');
      expect(ambitious.factors.ambitionTilt).toBeGreaterThan(1);
      expect(driven.factors.imageAxisTilt).toBeGreaterThan(1);
    },
  );

  test.each(['Two Way (C)', 'Two Way (IF)', 'Two Way (OF)'])(
    '%s image driver is EGOTISTICAL only (no cross-driver)',
    (traitName) => {
      const competitive = proposalFor(traitName, { playerRole: 'pitcher', personality: 'Competitive' });
      const tough = proposalFor(traitName, { playerRole: 'pitcher', personality: 'Tough' });

      expect(competitive.factors.imageAxisTilt).toBe(1);
      expect(tough.factors.imageAxisTilt).toBe(1);
    },
  );

  test('Two Way (C) is positive: high ambition tilts up and EGOTISTICAL drives the image axis', () => {
    const ambitious = proposalFor('Two Way (C)', {
      playerRole: 'pitcher',
      modifiers: { ...neutralModifiers, ambition: 100 },
    });
    const driven = proposalFor('Two Way (C)', { playerRole: 'pitcher', personality: 'Egotistical' });

    expect(ambitious.imageValence).toBe('positive');
    expect(ambitious.factors.ambitionTilt).toBeGreaterThan(1);
    expect(driven.factors.imageAxisTilt).toBeGreaterThan(1);
  });

  // Two Way (C)'s image driver is EGOTISTICAL only — COMPETITIVE/TOUGH do NOT drive it.
  test('Two Way (C) image driver is EGOTISTICAL only (no cross-driver)', () => {
    const competitive = proposalFor('Two Way (C)', { playerRole: 'pitcher', personality: 'Competitive' });
    const tough = proposalFor('Two Way (C)', { playerRole: 'pitcher', personality: 'Tough' });

    expect(competitive.factors.imageAxisTilt).toBe(1);
    expect(tough.factors.imageAxisTilt).toBe(1);
  });
});

describe('traitAcquisition T-9b pitch-type image defaults', () => {
  const pitchTypeTraits = [
    ['Elite 4F', 'pitcher'],
    ['Elite 2F', 'pitcher'],
    ['Elite CF', 'pitcher'],
    ['Elite CB', 'pitcher'],
    ['Elite CH', 'pitcher'],
    ['Elite FK', 'pitcher'],
    ['Elite SB', 'pitcher'],
    ['Elite SL', 'pitcher'],
    ['Fastball Hitter', 'position'],
    ['Off-Speed Hitter', 'position'],
  ] as const satisfies readonly (readonly [string, PlayerRole])[];

  test.each(pitchTypeTraits)(
    '%s is positive and mirrors the K Collector COMPETITIVE/EGOTISTICAL image drivers',
    (traitName, playerRole) => {
      const ambitious = proposalFor(traitName, {
        playerRole,
        modifiers: { ...neutralModifiers, ambition: 100 },
      });
      const competitive = proposalFor(traitName, { playerRole, personality: 'Competitive' });
      const egotistical = proposalFor(traitName, { playerRole, personality: 'Egotistical' });

      expect(ambitious.imageValence).toBe('positive');
      expect(ambitious.factors.ambitionTilt).toBeGreaterThan(1);
      expect(competitive.factors.imageAxisTilt).toBeGreaterThan(1);
      expect(egotistical.factors.imageAxisTilt).toBeGreaterThan(1);
    },
  );

  test.each(pitchTypeTraits)(
    '%s image driver does not cross into TOUGH/TIMID',
    (traitName, playerRole) => {
      const tough = proposalFor(traitName, { playerRole, personality: 'Tough' });
      const timid = proposalFor(traitName, { playerRole, personality: 'Timid' });

      expect(tough.factors.imageAxisTilt).toBe(1);
      expect(timid.factors.imageAxisTilt).toBe(1);
    },
  );
});

describe('traitAcquisition DT-B pitch-location image defaults', () => {
  test.each(['High Pitch', 'Low Pitch', 'Inside Pitch', 'Outside Pitch'])(
    '%s is positive and mirrors the K Collector COMPETITIVE/EGOTISTICAL image drivers',
    (traitName) => {
      const ambitious = proposalFor(traitName, {
        playerRole: 'position',
        modifiers: { ...neutralModifiers, ambition: 100 },
      });
      const competitive = proposalFor(traitName, { playerRole: 'position', personality: 'Competitive' });
      const egotistical = proposalFor(traitName, { playerRole: 'position', personality: 'Egotistical' });
      const tough = proposalFor(traitName, { playerRole: 'position', personality: 'Tough' });
      const timid = proposalFor(traitName, { playerRole: 'position', personality: 'Timid' });

      expect(ambitious.imageValence).toBe('positive');
      expect(ambitious.factors.ambitionTilt).toBeGreaterThan(1);
      expect(competitive.factors.imageAxisTilt).toBeGreaterThan(1);
      expect(egotistical.factors.imageAxisTilt).toBeGreaterThan(1);
      expect(tough.factors.imageAxisTilt).toBe(1);
      expect(timid.factors.imageAxisTilt).toBe(1);
    },
  );
});

describe('traitAcquisition DT-C1 Bad Ball Hitter image default', () => {
  test('Bad Ball Hitter is positive with no personality driver or opposite-pair tilt', () => {
    const ambitious = proposalFor('Bad Ball Hitter', {
      playerRole: 'position',
      modifiers: { ...neutralModifiers, ambition: 100 },
    });
    const competitive = proposalFor('Bad Ball Hitter', { playerRole: 'position', personality: 'Competitive' });
    const egotistical = proposalFor('Bad Ball Hitter', { playerRole: 'position', personality: 'Egotistical' });
    const tough = proposalFor('Bad Ball Hitter', { playerRole: 'position', personality: 'Tough' });
    const timid = proposalFor('Bad Ball Hitter', { playerRole: 'position', personality: 'Timid' });

    expect(ambitious.imageValence).toBe('positive');
    expect(ambitious.factors.ambitionTilt).toBeGreaterThan(1);
    expect(competitive.factors.imageAxisTilt).toBe(1);
    expect(egotistical.factors.imageAxisTilt).toBe(1);
    expect(tough.factors.imageAxisTilt).toBe(1);
    expect(timid.factors.imageAxisTilt).toBe(1);
  });
});

describe('traitAcquisition DT-C2 Dive Wizard image default', () => {
  test('Dive Wizard is positive with no personality driver and no Magic Hands opposite pair', () => {
    const ambitious = proposalFor('Dive Wizard', {
      playerRole: 'position',
      modifiers: { ...neutralModifiers, ambition: 100 },
    });
    const competitive = proposalFor('Dive Wizard', { playerRole: 'position', personality: 'Competitive' });
    const egotistical = proposalFor('Dive Wizard', { playerRole: 'position', personality: 'Egotistical' });
    const tough = proposalFor('Dive Wizard', { playerRole: 'position', personality: 'Tough' });
    const timid = proposalFor('Dive Wizard', { playerRole: 'position', personality: 'Timid' });

    expect(ambitious.imageValence).toBe('positive');
    expect(ambitious.factors.ambitionTilt).toBeGreaterThan(1);
    expect(competitive.factors.imageAxisTilt).toBe(1);
    expect(egotistical.factors.imageAxisTilt).toBe(1);
    expect(tough.factors.imageAxisTilt).toBe(1);
    expect(timid.factors.imageAxisTilt).toBe(1);
    expect(TRAIT_OPPOSITES['Dive Wizard']).toBeUndefined();
    expect(TRAIT_OPPOSITES['Magic Hands']).toBe('Butter Fingers');
  });
});

describe('traitAcquisition DT-D Noodle Arm mental-error valence', () => {
  test('Noodle Arm is negative with no image driver and keeps the Cannon Arm opposite pair', () => {
    const fragile = proposalFor('Noodle Arm', {
      playerRole: 'position',
      modifiers: { ...neutralModifiers, resilience: 0 },
    });
    const timid = proposalFor('Noodle Arm', { playerRole: 'position', personality: 'Timid' });
    const droopy = proposalFor('Noodle Arm', { playerRole: 'position', personality: 'Droopy' });

    expect(fragile.imageValence).toBe('negative');
    expect(fragile.factors.resilienceTilt).toBeGreaterThan(1);
    expect(timid.factors.imageAxisTilt).toBe(1);
    expect(droopy.factors.imageAxisTilt).toBe(1);
    expect(TRAIT_OPPOSITES['Noodle Arm']).toBe('Cannon Arm');
    expect(TRAIT_OPPOSITES['Cannon Arm']).toBe('Noodle Arm');
  });

  test('Cannon Arm held blocks a Noodle Arm gain proposal', () => {
    const result = computeTraitAcquisition(input({
      heldTraits: [{ traitName: 'Cannon Arm', strength: 0.8 }],
      candidates: [{ traitName: 'Noodle Arm', score: score('Noodle Arm', 0.9) }],
    }), FORCE_GAIN_TUNING);

    expect(result.proposals).toEqual([]);
    expect(result.skipped).toEqual([
      { traitName: 'Noodle Arm', reason: 'offsetting_pair_held' },
    ]);
  });

  test('Wild Thrower remains negative with its existing TIMID/DROOPY image driver', () => {
    const fragile = proposalFor('Wild Thrower', {
      playerRole: 'position',
      modifiers: { ...neutralModifiers, resilience: 0 },
    });
    const timid = proposalFor('Wild Thrower', { playerRole: 'position', personality: 'Timid' });
    const droopy = proposalFor('Wild Thrower', { playerRole: 'position', personality: 'Droopy' });

    expect(fragile.imageValence).toBe('negative');
    expect(fragile.factors.resilienceTilt).toBeGreaterThan(1);
    expect(timid.factors.imageAxisTilt).toBeGreaterThan(1);
    expect(droopy.factors.imageAxisTilt).toBeGreaterThan(1);
  });
});

describe('traitAcquisition DT-FIX-2 Volatile positive image valence', () => {
  test('Volatile is positive with no image driver and keeps the Consistent opposite pair', () => {
    const ambitious = proposalFor('Volatile', {
      modifiers: { ...neutralModifiers, ambition: 100 },
    });
    const fragile = proposalFor('Volatile', {
      modifiers: { ...neutralModifiers, resilience: 0 },
    });
    const highMorale = proposalFor('Volatile', { currentMorale: 100 });
    const timid = proposalFor('Volatile', { personality: 'Timid' });
    const egotistical = proposalFor('Volatile', { personality: 'Egotistical' });

    expect(ambitious.imageValence).toBe('positive');
    expect(ambitious.factors.ambitionTilt).toBeGreaterThan(1);
    expect(fragile.factors.resilienceTilt).toBe(1);
    expect(highMorale.factors.moraleFactor).toBeGreaterThan(1);
    expect(timid.factors.imageAxisTilt).toBe(1);
    expect(egotistical.factors.imageAxisTilt).toBe(1);
    expect(TRAIT_OPPOSITES['Volatile']).toBe('Consistent');
    expect(TRAIT_OPPOSITES['Consistent']).toBe('Volatile');
  });
});

describe('traitAcquisition DT-F1 Wild Thing negative image valence', () => {
  test('Wild Thing is negative with no personality image driver', () => {
    const fragile = proposalFor('Wild Thing', {
      playerRole: 'pitcher',
      modifiers: { ...neutralModifiers, resilience: 0 },
    });
    const timid = proposalFor('Wild Thing', { playerRole: 'pitcher', personality: 'Timid' });
    const droopy = proposalFor('Wild Thing', { playerRole: 'pitcher', personality: 'Droopy' });

    expect(fragile.imageValence).toBe('negative');
    expect(fragile.factors.resilienceTilt).toBeGreaterThan(1);
    expect(timid.factors.imageAxisTilt).toBe(1);
    expect(droopy.factors.imageAxisTilt).toBe(1);
  });
});

describe('traitAcquisition DT-F2 Workhorse positive image valence', () => {
  test('Workhorse is positive with no personality image driver', () => {
    const ambitious = proposalFor('Workhorse', {
      playerRole: 'pitcher',
      modifiers: { ...neutralModifiers, ambition: 100 },
    });
    const fragile = proposalFor('Workhorse', {
      playerRole: 'pitcher',
      modifiers: { ...neutralModifiers, resilience: 0 },
    });
    const competitive = proposalFor('Workhorse', { playerRole: 'pitcher', personality: 'Competitive' });
    const egotistical = proposalFor('Workhorse', { playerRole: 'pitcher', personality: 'Egotistical' });

    expect(ambitious.imageValence).toBe('positive');
    expect(ambitious.factors.ambitionTilt).toBeGreaterThan(1);
    expect(fragile.factors.resilienceTilt).toBe(1);
    expect(competitive.factors.imageAxisTilt).toBe(1);
    expect(egotistical.factors.imageAxisTilt).toBe(1);
  });
});

describe('traitAcquisition gates and reconciliation (VI.1 / VI.2 / VI.3)', () => {
  test('hysteresis emits a gain at or above the gain threshold', () => {
    const tier = assignTier('CON vs LHP');
    expect(tier.tier).toBe('UNCOMMON');
    expect(tier.gainThreshold).toBe(0.70);

    const result = computeTraitAcquisition(input({
      candidates: [{ traitName: 'CON vs LHP', score: score('CON vs LHP', tier.gainThreshold) }],
    }));

    expect(result.proposals).toMatchObject([
      { traitName: 'CON vs LHP', valence: 'gain', probability: tier.gainThreshold },
    ]);
    expect(result.skipped).toEqual([]);
  });

  test('hysteresis emits a loss for a held trait at or below the lose threshold', () => {
    const tier = assignTier('CON vs LHP');
    expect(tier.lossThreshold).toBe(0.30);

    const heldTraits: HeldTrait[] = [{ traitName: 'CON vs LHP', strength: 0.5 }];
    const result = computeTraitAcquisition(input({
      heldTraits,
      candidates: [{ traitName: 'CON vs LHP', score: score('CON vs LHP', tier.lossThreshold) }],
    }));

    expect(result.proposals).toMatchObject([
      { traitName: 'CON vs LHP', valence: 'lose', probability: tier.lossThreshold },
    ]);
    expect(result.skipped).toEqual([]);
  });

  test('negative Severe traits use badness percentile thresholds without inversion', () => {
    const tier = assignTier('RBI Zero');
    expect(tier.tier).toBe('SEVERE');
    expect(tier.gainThreshold).toBe(0.78);
    expect(tier.lossThreshold).toBe(0.18);

    const gain = computeTraitAcquisition(input({
      candidates: [{ traitName: 'RBI Zero', score: score('RBI Zero', tier.gainThreshold) }],
    }));
    const lose = computeTraitAcquisition(input({
      heldTraits: [{ traitName: 'RBI Zero', strength: 0.5 }],
      candidates: [{ traitName: 'RBI Zero', score: score('RBI Zero', tier.lossThreshold) }],
    }));

    expect(gain.proposals).toMatchObject([
      { traitName: 'RBI Zero', valence: 'gain', probability: tier.gainThreshold },
    ]);
    expect(lose.proposals).toMatchObject([
      { traitName: 'RBI Zero', valence: 'lose', probability: tier.lossThreshold },
    ]);
  });

  test('adaptive-excluded traits fall back to the flat tuning thresholds', () => {
    const result = computeTraitAcquisition(input({
      candidates: [{ traitName: 'Stimulated', score: score('Stimulated', TRAIT_ACQUISITION_TUNING.gainThreshold) }],
    }));

    expect(() => assignTier('Stimulated')).toThrow(/excluded from adaptive trait weighting/);
    expect(result.proposals).toMatchObject([
      { traitName: 'Stimulated', valence: 'gain', probability: TRAIT_ACQUISITION_TUNING.gainThreshold },
    ]);
    expect(result.skipped).toEqual([]);
  });

  test('values between hysteresis thresholds stay in the dead band', () => {
    const result = computeTraitAcquisition(input({
      candidates: [{ traitName: 'CON vs LHP', score: score('CON vs LHP', 0.5) }],
    }));

    expect(result.proposals).toEqual([]);
    expect(result.skipped).toEqual([
      { traitName: 'CON vs LHP', reason: 'dead_band' },
    ]);
  });

  test('null or thin L9b-1 score skips with the score sufficiency reason', () => {
    const result = computeTraitAcquisition(input({
      candidates: [{
        traitName: 'Clutch',
        score: score('Clutch', null, false, 'thin_sample'),
      }],
    }));

    expect(result.proposals).toEqual([]);
    expect(result.skipped).toEqual([
      { traitName: 'Clutch', reason: 'thin_sample' },
    ]);
  });

  test('defensively skips unknown and role-ineligible candidates', () => {
    const result = computeTraitAcquisition(input({
      candidates: [
        { traitName: 'Not A Trait', score: score('Not A Trait', 0.9) },
        { traitName: 'K Collector', score: score('K Collector', 0.9) },
      ],
    }));

    expect(result.proposals).toEqual([]);
    expect(result.skipped).toEqual([
      { traitName: 'Not A Trait', reason: 'unknown_trait' },
      { traitName: 'K Collector', reason: 'ineligible_role' },
    ]);
  });

  test('a held opposite blocks a gain proposal', () => {
    const result = computeTraitAcquisition(input({
      heldTraits: [{ traitName: 'Choker', strength: 0.4 }],
      candidates: [{ traitName: 'Clutch', score: score('Clutch', 0.9) }],
    }));

    expect(result.proposals).toEqual([]);
    expect(result.skipped).toEqual([
      { traitName: 'Clutch', reason: 'offsetting_pair_held' },
    ]);
  });

  test('when both sides of an opposite pair are gains, only the higher gainScore survives', () => {
    expect(computeTraitWeight('Clutch')).toBeCloseTo(0.4711111111111111, 10);
    expect(computeTraitWeight('Choker')).toBeCloseTo(0.4322222222222223, 10);
    // §8B: Clutch 0.8 × 0.471111 = 0.376889; Choker 0.9 × 0.432222 = 0.389000.
    const result = computeTraitAcquisition(
      input({
        candidates: [
          { traitName: 'Clutch', score: score('Clutch', 0.8) },
          { traitName: 'Choker', score: score('Choker', 0.9) },
        ],
      }),
      NO_SWING_FORCE_GAIN_TUNING,
    );

    expect(result.proposals).toMatchObject([
      { traitName: 'Choker', valence: 'gain', probability: 0.9 },
    ]);
    expect(result.skipped).toEqual([
      { traitName: 'Clutch', reason: 'offsetting_pair_held' },
    ]);
  });

  test('DT-B held pitch-location opposite blocks a gain proposal', () => {
    const result = computeTraitAcquisition(input({
      heldTraits: [{ traitName: 'Low Pitch', strength: 0.4 }],
      candidates: [{ traitName: 'High Pitch', score: score('High Pitch', 0.95) }],
    }));

    expect(result.proposals).toEqual([]);
    expect(result.skipped).toEqual([
      { traitName: 'High Pitch', reason: 'offsetting_pair_held' },
    ]);
  });

  test('DT-B competing pitch-location gains keep only the higher gainScore', () => {
    expect(0.92 * computeTraitWeight('High Pitch')).toBeGreaterThan(0.84 * computeTraitWeight('Low Pitch'));
    expect(0.91 * computeTraitWeight('Outside Pitch')).toBeGreaterThan(0.83 * computeTraitWeight('Inside Pitch'));

    const highLow = computeTraitAcquisition(
      input({
        candidates: [
          { traitName: 'High Pitch', score: score('High Pitch', 0.92) },
          { traitName: 'Low Pitch', score: score('Low Pitch', 0.84) },
        ],
      }),
      NO_SWING_FORCE_GAIN_TUNING,
    );
    const insideOutside = computeTraitAcquisition(
      input({
        candidates: [
          { traitName: 'Inside Pitch', score: score('Inside Pitch', 0.83) },
          { traitName: 'Outside Pitch', score: score('Outside Pitch', 0.91) },
        ],
      }),
      NO_SWING_FORCE_GAIN_TUNING,
    );

    expect(highLow.proposals).toMatchObject([
      { traitName: 'High Pitch', valence: 'gain', probability: 0.92 },
    ]);
    expect(highLow.skipped).toEqual([
      { traitName: 'Low Pitch', reason: 'offsetting_pair_held' },
    ]);
    expect(insideOutside.proposals).toMatchObject([
      { traitName: 'Outside Pitch', valence: 'gain', probability: 0.91 },
    ]);
    expect(insideOutside.skipped).toEqual([
      { traitName: 'Inside Pitch', reason: 'offsetting_pair_held' },
    ]);
  });

  test('T-9c held Elite-pitch trait defends its slot while non-Elite gains are unaffected', () => {
    const result = computeTraitAcquisition(
      input({
        playerRole: 'pitcher',
        heldTraits: [{ traitName: 'Elite SL', strength: 0.2 }],
        candidates: [
          { traitName: 'Elite 4F', score: score('Elite 4F', 0.99) },
          { traitName: 'K Collector', score: score('K Collector', 0.95) },
        ],
      }),
      NO_SWING_FORCE_GAIN_TUNING,
    );

    expect(result.proposals).toMatchObject([
      { traitName: 'K Collector', valence: 'gain', probability: 0.95 },
    ]);
    expect(result.proposals.some((proposal) => proposal.traitName === 'Elite SL')).toBe(false);
    expect(result.skipped).toEqual([
      { traitName: 'Elite 4F', reason: 'elite_pitch_excluded' },
    ]);
  });

  test('T-9c competing Elite-pitch gains keep only the highest gainScore', () => {
    const elite4FScore = 0.99 * computeTraitWeight('Elite 4F');
    const eliteSBScore = 0.83 * computeTraitWeight('Elite SB');
    expect(elite4FScore).toBeGreaterThan(eliteSBScore);

    const result = computeTraitAcquisition(
      input({
        playerRole: 'pitcher',
        candidates: [
          { traitName: 'Elite SB', score: score('Elite SB', 0.83) },
          { traitName: 'Elite 4F', score: score('Elite 4F', 0.99) },
        ],
      }),
      NO_SWING_FORCE_GAIN_TUNING,
    );

    expect(result.proposals).toMatchObject([
      { traitName: 'Elite 4F', valence: 'gain', probability: 0.99 },
    ]);
    expect(result.skipped).toEqual([
      { traitName: 'Elite SB', reason: 'elite_pitch_excluded' },
    ]);
  });

  test('T-9c an Elite-pitch loss frees the group slot for a new Elite-pitch gain', () => {
    const result = computeTraitAcquisition(
      input({
        playerRole: 'pitcher',
        heldTraits: [{ traitName: 'Elite SL', strength: 0.9 }],
        candidates: [
          { traitName: 'Elite SL', score: score('Elite SL', 0.01) },
          { traitName: 'Elite 4F', score: score('Elite 4F', 0.99) },
        ],
      }),
      NO_SWING_FORCE_GAIN_TUNING,
    );

    expect(result.proposals).toMatchObject([
      { traitName: 'Elite SL', valence: 'lose' },
      { traitName: 'Elite 4F', valence: 'gain' },
    ]);
    expect(result.skipped).toEqual([]);
  });

  test('T-9c equal-gainScore Elite-pitch gains use alphabetical deterministic tiebreak', () => {
    const elite2FWeight = computeTraitWeight('Elite 2F');
    const eliteCFWeight = computeTraitWeight('Elite CF');
    const elite2FProbability = eliteCFWeight * 1.2;
    const eliteCFProbability = elite2FWeight * 1.2;

    expect(elite2FProbability).toBeGreaterThanOrEqual(assignTier('Elite 2F').gainThreshold);
    expect(eliteCFProbability).toBeGreaterThanOrEqual(assignTier('Elite CF').gainThreshold);
    expect(elite2FProbability * elite2FWeight).toBe(eliteCFProbability * eliteCFWeight);

    const result = computeTraitAcquisition(
      input({
        playerRole: 'pitcher',
        candidates: [
          { traitName: 'Elite CF', score: score('Elite CF', eliteCFProbability) },
          { traitName: 'Elite 2F', score: score('Elite 2F', elite2FProbability) },
        ],
      }),
      NO_SWING_FORCE_GAIN_TUNING,
    );

    expect(result.proposals).toMatchObject([
      { traitName: 'Elite 2F', valence: 'gain', probability: elite2FProbability },
    ]);
    expect(result.skipped).toEqual([
      { traitName: 'Elite CF', reason: 'elite_pitch_excluded' },
    ]);
  });

  test('T-9c a single Elite-pitch gain with no held Elite-pitch trait is admitted normally', () => {
    const result = computeTraitAcquisition(
      input({
        playerRole: 'pitcher',
        candidates: [{ traitName: 'Elite 4F', score: score('Elite 4F', 0.99) }],
      }),
      NO_SWING_FORCE_GAIN_TUNING,
    );

    expect(result.proposals).toMatchObject([
      { traitName: 'Elite 4F', valence: 'gain', probability: 0.99 },
    ]);
    expect(result.skipped).toEqual([]);
  });

  test('at the two-trait cap, a stronger gain displaces the weakest held trait', () => {
    expect(computeTraitWeight('Clutch')).toBeCloseTo(0.4711111111111111, 10);
    expect(computeTraitWeight('Utility')).toBeCloseTo(0.13, 10);
    expect(computeTraitWeight('Stealer')).toBeCloseTo(0.32666666666666666, 10);
    // §8B: keep(Clutch)=0.6×0.471111×1.25=0.353333;
    // keep(Utility)=0.4×0.13×1.25=0.065000; gain(Stealer)=0.8×0.326667=0.261333.
    const result = computeTraitAcquisition(
      input({
        heldTraits: [
          { traitName: 'Clutch', strength: 0.6 },
          { traitName: 'Utility', strength: 0.4 },
        ],
        candidates: [{ traitName: 'Stealer', score: score('Stealer', 0.8) }],
      }),
      NO_SWING_FORCE_GAIN_TUNING,
    );

    expect(result.proposals).toMatchObject([
      { traitName: 'Stealer', valence: 'gain', displaces: 'Utility' },
    ]);
    expect(result.skipped).toEqual([]);
  });

  test('at the two-trait cap, equal strength is not enough for displacement', () => {
    expect(computeTraitWeight('Clutch')).toBeCloseTo(0.4711111111111111, 10);
    expect(computeTraitWeight('Rally Starter')).toBeCloseTo(0.5322222222222223, 10);
    expect(computeTraitWeight('Stealer')).toBeCloseTo(0.32666666666666666, 10);
    // §8B: weakest keep(Clutch)=0.8×0.471111×1.25=0.471111;
    // gain(Stealer)=0.8×0.326667=0.261333, so β incumbency blocks equal-P churn.
    const result = computeTraitAcquisition(
      input({
        heldTraits: [
          { traitName: 'Clutch', strength: 0.8 },
          { traitName: 'Rally Starter', strength: 0.8 },
        ],
        candidates: [{ traitName: 'Stealer', score: score('Stealer', 0.8) }],
      }),
      NO_SWING_FORCE_GAIN_TUNING,
    );

    expect(result.proposals).toEqual([]);
    expect(result.skipped).toEqual([
      { traitName: 'Stealer', reason: 'cap_no_displacement' },
    ]);
  });

  test('gainScore ranking admits the top two by value and caps open slots', () => {
    expect(computeTraitWeight('Cannon Arm')).toBeCloseTo(0.81, 10);
    expect(computeTraitWeight('Tough Out')).toBeCloseTo(0.5433333333333333, 10);
    expect(computeTraitWeight('Sprinter')).toBeCloseTo(0.24888888888888888, 10);
    // Appendix A example 1: Cannon Arm 0.84×0.81=0.680400;
    // Tough Out 0.75×0.543333=0.407500; Sprinter 0.90×0.248889=0.224000.
    const result = computeTraitAcquisition(input({
      candidates: [
        { traitName: 'Sprinter', score: score('Sprinter', 0.9) },
        { traitName: 'Tough Out', score: score('Tough Out', 0.75) },
        { traitName: 'Cannon Arm', score: score('Cannon Arm', 0.84) },
      ],
    }));

    expect(result.proposals).toMatchObject([
      { traitName: 'Cannon Arm', valence: 'gain', probability: 0.84 },
      { traitName: 'Tough Out', valence: 'gain', probability: 0.75 },
    ]);
    expect(result.proposals).toHaveLength(2);
    expect(result.skipped).toEqual([
      { traitName: 'Sprinter', reason: 'cap_no_displacement' },
    ]);
  });

  test('recomputes weakest incumbent after each displacement so gains cannot target the same slot', () => {
    expect(computeTraitWeight('Utility')).toBeCloseTo(0.13, 10);
    expect(computeTraitWeight('Clutch')).toBeCloseTo(0.4711111111111111, 10);
    expect(computeTraitWeight('Cannon Arm')).toBeCloseTo(0.81, 10);
    expect(computeTraitWeight('Big Hack')).toBeCloseTo(0.798888888888889, 10);
    // §8B collision fix: keep(Utility)=0.4×0.13×1.25=0.065000;
    // keep(Clutch)=0.4×0.471111×1.25=0.235556. Cannon Arm (0.680400)
    // displaces Utility, then Big Hack (0.663078) recomputes and displaces Clutch.
    const result = computeTraitAcquisition(input({
      heldTraits: [
        { traitName: 'Utility', strength: 0.4 },
        { traitName: 'Clutch', strength: 0.4 },
      ],
      candidates: [
        { traitName: 'Big Hack', score: score('Big Hack', 0.83) },
        { traitName: 'Cannon Arm', score: score('Cannon Arm', 0.84) },
      ],
    }));

    expect(result.proposals).toMatchObject([
      { traitName: 'Cannon Arm', valence: 'gain', displaces: 'Utility' },
      { traitName: 'Big Hack', valence: 'gain', displaces: 'Clutch' },
    ]);
    expect(new Set(result.proposals.map((proposal) => proposal.displaces))).toEqual(
      new Set(['Utility', 'Clutch']),
    );
    expect(result.skipped).toEqual([]);
  });

  test('incumbency lets a valuable held trait block a high-P common gain', () => {
    expect(computeTraitWeight('Cannon Arm')).toBeCloseTo(0.81, 10);
    expect(computeTraitWeight('Big Hack')).toBeCloseTo(0.798888888888889, 10);
    expect(computeTraitWeight('Sprinter')).toBeCloseTo(0.24888888888888888, 10);
    // Appendix A example 2: keep(Cannon Arm)=0.55×0.81×1.25=0.556875;
    // keep(Big Hack)=0.95×0.798889×1.25=0.948681; gain(Sprinter)=0.88×0.248889=0.219022.
    const result = computeTraitAcquisition(input({
      heldTraits: [
        { traitName: 'Cannon Arm', strength: 0.2 },
        { traitName: 'Big Hack', strength: 0.2 },
      ],
      candidates: [
        { traitName: 'Cannon Arm', score: score('Cannon Arm', 0.55) },
        { traitName: 'Big Hack', score: score('Big Hack', 0.95) },
        { traitName: 'Sprinter', score: score('Sprinter', 0.88) },
      ],
    }));

    expect(result.proposals).toEqual([]);
    expect(result.skipped).toEqual([
      { traitName: 'Cannon Arm', reason: 'dead_band' },
      { traitName: 'Big Hack', reason: 'dead_band' },
      { traitName: 'Sprinter', reason: 'cap_no_displacement' },
    ]);
  });

  test('a high-gainScore rare trait displaces a near-zero-weight common incumbent', () => {
    expect(computeTraitWeight('Metal Head')).toBeCloseTo(0, 10);
    expect(computeTraitWeight('Composed')).toBeCloseTo(0.3077777777777778, 10);
    expect(computeTraitWeight('K Collector')).toBeCloseTo(0.8322222222222223, 10);
    // Appendix A example 3: keep(Metal Head)=0.5×0×1.25=0;
    // keep(Composed)=0.6×0.307778×1.25=0.230833; gain(K Collector)=0.86×0.832222=0.715711.
    const result = computeTraitAcquisition(
      input({
        playerRole: 'pitcher',
        heldTraits: [
          { traitName: 'Metal Head', strength: 0.5 },
          { traitName: 'Composed', strength: 0.6 },
        ],
        candidates: [
          { traitName: 'Metal Head', score: score('Metal Head', 0.5) },
          { traitName: 'Composed', score: score('Composed', 0.6) },
          { traitName: 'K Collector', score: score('K Collector', 0.86) },
        ],
      }),
    );

    expect(result.proposals).toMatchObject([
      { traitName: 'K Collector', valence: 'gain', displaces: 'Metal Head' },
    ]);
    expect(result.skipped).toEqual([
      { traitName: 'Metal Head', reason: 'dead_band' },
      { traitName: 'Composed', reason: 'dead_band' },
    ]);
  });

  test('excluded-trait weight fallback is safe and buildable traits resolve through computeTraitWeight', () => {
    const buildableTraits = [
      'Utility',
      'Clutch',
      'Stealer',
      'Choker',
      'Big Hack',
      'Rally Starter',
      'Butter Fingers',
      'CON vs LHP',
      'RBI Zero',
      'K Collector',
    ];
    for (const traitName of buildableTraits) {
      expect(() => computeTraitWeight(traitName)).not.toThrow();
    }
    expect(() => computeTraitWeight('Stimulated')).toThrow(/excluded from adaptive trait weighting/);

    // §8B safe wrapper path: raw compute throws for Stimulated, but scoring uses the
    // Common-floor fallback, so the cap duel completes instead of crashing.
    const result = computeTraitAcquisition(input({
      heldTraits: [
        { traitName: 'Clutch', strength: 0.8 },
        { traitName: 'Utility', strength: 0.4 },
      ],
      candidates: [{ traitName: 'Stimulated', score: score('Stimulated', 0.9) }],
    }));

    expect(result.proposals).toMatchObject([
      { traitName: 'Stimulated', valence: 'gain', displaces: 'Utility' },
    ]);
    expect(result.skipped).toEqual([]);
  });

  test('a loss proposal frees a slot, so a gain needs no displacement', () => {
    const result = computeTraitAcquisition(
      input({
        heldTraits: [
          { traitName: 'Stealer', strength: 0.2 },
          { traitName: 'Utility', strength: 0.9 },
        ],
        candidates: [
          { traitName: 'Stealer', score: score('Stealer', 0.2) },
          { traitName: 'Clutch', score: score('Clutch', 0.9) },
        ],
      }),
      NO_SWING_FORCE_GAIN_TUNING,
    );

    expect(result.proposals).toMatchObject([
      { traitName: 'Stealer', valence: 'lose' },
      { traitName: 'Clutch', valence: 'gain' },
    ]);
    expect(result.proposals[1].displaces).toBeUndefined();
  });

  // R-E-b (E3) + §8B: displacement uses recomputed keepScore, not supplied strength or bare P.
  test('displacement follows recomputed keepScore, not supplied strength or bare recomputed P', () => {
    expect(computeTraitWeight('Clutch')).toBeCloseTo(0.4711111111111111, 10);
    expect(computeTraitWeight('Utility')).toBeCloseTo(0.13, 10);
    expect(computeTraitWeight('Stealer')).toBeCloseTo(0.32666666666666666, 10);
    // §8B: bare recomputed P says Clutch (0.4) is weaker than Utility (0.7), but
    // keep(Clutch)=0.4×0.471111×1.25=0.235556 and keep(Utility)=0.7×0.13×1.25=0.113750.
    // gain(Stealer)=0.8×0.326667=0.261333, so Utility is displaced by keepScore.
    const result = computeTraitAcquisition(
      input({
        heldTraits: [
          // High supplied strength, but its recomputed P this cycle is LOW.
          { traitName: 'Clutch', strength: 0.9 },
          // Low supplied strength, but its recomputed P this cycle is HIGH.
          { traitName: 'Utility', strength: 0.1 },
        ],
        candidates: [
          // Each held trait re-scores this cycle; both land in the dead band for their tier,
          // so neither is lost — they only matter for displacement ranking.
          { traitName: 'Clutch', score: score('Clutch', 0.4) },
          { traitName: 'Utility', score: score('Utility', 0.7) },
          { traitName: 'Stealer', score: score('Stealer', 0.8) },
        ],
      }),
      NO_SWING_FORCE_GAIN_TUNING,
    );

    expect(result.proposals).toMatchObject([
      { traitName: 'Stealer', valence: 'gain', displaces: 'Utility' },
    ]);
    expect(result.skipped).toEqual([
      { traitName: 'Clutch', reason: 'dead_band' },
      { traitName: 'Utility', reason: 'dead_band' },
    ]);
  });

  test('a held trait with no candidate this cycle falls back to its supplied strength for displacement ranking', () => {
    const result = computeTraitAcquisition(
      input({
        heldTraits: [
          // Has a candidate this cycle → ranked by recomputed P (0.6).
          { traitName: 'Clutch', strength: 0.9 },
          // No candidate this cycle → ranked by supplied strength (0.2) via the ?? fallback.
          { traitName: 'Utility', strength: 0.2 },
        ],
        candidates: [
          { traitName: 'Clutch', score: score('Clutch', 0.6) },
          { traitName: 'Stealer', score: score('Stealer', 0.8) },
        ],
      }),
      NO_SWING_FORCE_GAIN_TUNING,
    );

    // Effective strengths: Clutch=0.6 (recomputed P), Utility=0.2 (supplied fallback).
    // Weakest = Utility; gain Stealer P=0.8 > 0.2 → displaces Utility.
    expect(result.proposals).toMatchObject([
      { traitName: 'Stealer', valence: 'gain', displaces: 'Utility' },
    ]);
    expect(result.skipped).toEqual([
      { traitName: 'Clutch', reason: 'dead_band' },
    ]);
  });

  test('lose-low still drops a held trait whose recomputed P is at or below the lose threshold', () => {
    const result = computeTraitAcquisition(
      input({
        heldTraits: [
          { traitName: 'Clutch', strength: 0.9 },
          { traitName: 'Utility', strength: 0.9 },
        ],
        candidates: [
          // Recomputed P 0.3 ≤ Clutch's tier loss threshold → lost regardless of supplied strength 0.9.
          { traitName: 'Clutch', score: score('Clutch', 0.3) },
        ],
      }),
      NO_SWING_FORCE_GAIN_TUNING,
    );

    expect(result.proposals).toMatchObject([
      { traitName: 'Clutch', valence: 'lose', probability: 0.3 },
    ]);
    expect(result.skipped).toEqual([]);
  });

  test('a thin-signal held trait with no candidate is not spuriously dropped when no gain needs its slot', () => {
    const result = computeTraitAcquisition(
      input({
        heldTraits: [
          { traitName: 'Clutch', strength: 0.05 },
          { traitName: 'Utility', strength: 0.9 },
        ],
        // No gain candidate and no candidate for the held traits this cycle.
        candidates: [],
      }),
      NO_SWING_FORCE_GAIN_TUNING,
    );

    // Neither held trait re-scores, so neither is lost; with no gain needing a slot, nothing is displaced.
    expect(result.proposals).toEqual([]);
    expect(result.skipped).toEqual([]);
  });

  test('TRAIT_OPPOSITES is symmetric and all names are canonical', () => {
    for (const [traitName, opposite] of Object.entries(TRAIT_OPPOSITES)) {
      expect(CANONICAL_TRAIT_NAMES.has(traitName)).toBe(true);
      expect(CANONICAL_TRAIT_NAMES.has(opposite)).toBe(true);
      expect(TRAIT_OPPOSITES[opposite]).toBe(traitName);
    }
  });

  test('pitcher-only canonical candidates can gain for pitcher inputs', () => {
    const pitcherInput = input({
      playerRole: 'pitcher' as PlayerRole,
      candidates: [{ traitName: 'K Collector', score: score('K Collector', 0.9) }],
    });
    const result = computeTraitAcquisition(pitcherInput);

    expect(result.proposals).toMatchObject([
      { traitName: 'K Collector', valence: 'gain' },
    ]);
    expect(result.skipped).toEqual([]);
  });
});
