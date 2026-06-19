import { describe, expect, test } from 'vitest';

import {
  CANONICAL_TRAIT_NAMES,
  type PlayerRole,
  type TraitRealityScore,
} from '../traitRealityScorer';
import {
  TRAIT_ACQUISITION_TUNING,
  TRAIT_OPPOSITES,
  computeTraitAcquisition,
  type HeldTrait,
  type TraitAcquisitionInput,
  type TraitAcquisitionTuning,
} from '../traitAcquisition';
import type { HiddenModifiers } from '../../types/game';

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

function proposalFor(
  traitName: string,
  overrides: Partial<TraitAcquisitionInput> = {},
  tuning: TraitAcquisitionTuning = FORCE_GAIN_TUNING,
) {
  const result = computeTraitAcquisition(
    input({
      candidates: [{ traitName, score: score(traitName, 0.5) }],
      ...overrides,
    }),
    tuning,
  );

  expect(result.proposals).toHaveLength(1);
  return result.proposals[0];
}

describe('traitAcquisition combiner (VI.0 / TS-1)', () => {
  test('neutral inputs leave probability equal to the reality percentile', () => {
    const proposal = proposalFor('CON vs LHP', {
      personality: 'Tough',
      currentMorale: 50,
    });

    expect(proposal.imageValence).toBe('neutral');
    expect(proposal.probability).toBeCloseTo(0.5, 10);
    expect(proposal.realityPercentile).toBeCloseTo(0.5, 10);
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
    const high = proposalFor('Clutch', {
      modifiers: { ...neutralModifiers, ambition: 100 },
    });
    const low = proposalFor('Clutch', {
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
    const tough = proposalFor('Clutch', { personality: 'Tough' });
    const relaxed = proposalFor('Clutch', { personality: 'Relaxed' });

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

describe('traitAcquisition gates and reconciliation (VI.1 / VI.2 / VI.3)', () => {
  test('hysteresis emits a gain at or above the gain threshold', () => {
    const result = computeTraitAcquisition(input({
      candidates: [{ traitName: 'CON vs LHP', score: score('CON vs LHP', 0.75) }],
    }));

    expect(result.proposals).toMatchObject([
      { traitName: 'CON vs LHP', valence: 'gain', probability: 0.75 },
    ]);
    expect(result.skipped).toEqual([]);
  });

  test('hysteresis emits a loss for a held trait at or below the lose threshold', () => {
    const heldTraits: HeldTrait[] = [{ traitName: 'CON vs LHP', strength: 0.5 }];
    const result = computeTraitAcquisition(input({
      heldTraits,
      candidates: [{ traitName: 'CON vs LHP', score: score('CON vs LHP', 0.35) }],
    }));

    expect(result.proposals).toMatchObject([
      { traitName: 'CON vs LHP', valence: 'lose', probability: 0.35 },
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

  test('when both sides of an opposite pair are gains, only the higher probability survives', () => {
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

  test('at the two-trait cap, a stronger gain displaces the weakest held trait', () => {
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
    const result = computeTraitAcquisition(
      input({
        heldTraits: [
          { traitName: 'Clutch', strength: 0.8 },
          { traitName: 'Utility', strength: 0.6 },
        ],
        candidates: [{ traitName: 'Stealer', score: score('Stealer', 0.6) }],
      }),
      NO_SWING_FORCE_GAIN_TUNING,
    );

    expect(result.proposals).toEqual([]);
    expect(result.skipped).toEqual([
      { traitName: 'Stealer', reason: 'cap_no_displacement' },
    ]);
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

  // R-E-b (E3): displacement uses the RECOMPUTED P this cycle, not the supplied HeldTrait.strength.
  test('displacement follows the recomputed P, displacing the held trait with the lower P even when its supplied strength is high', () => {
    const result = computeTraitAcquisition(
      input({
        heldTraits: [
          // High supplied strength, but its recomputed P this cycle is LOW.
          { traitName: 'Clutch', strength: 0.9 },
          // Low supplied strength, but its recomputed P this cycle is HIGH.
          { traitName: 'Utility', strength: 0.1 },
        ],
        candidates: [
          // Each held trait re-scores this cycle; both land in the dead band (> loseThreshold 0.35,
          // < gainThreshold 0) so neither is lost — they only matter for displacement ranking.
          { traitName: 'Clutch', score: score('Clutch', 0.4) },
          { traitName: 'Utility', score: score('Utility', 0.7) },
          { traitName: 'Stealer', score: score('Stealer', 0.5) },
        ],
      }),
      NO_SWING_FORCE_GAIN_TUNING,
    );

    // Old behavior (rank by supplied strength) would have displaced 'Utility' (strength 0.1).
    // New behavior (rank by recomputed P): Clutch P=0.4 < Utility P=0.7, so Clutch is the weakest.
    expect(result.proposals).toMatchObject([
      { traitName: 'Stealer', valence: 'gain', displaces: 'Clutch' },
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
          { traitName: 'Stealer', score: score('Stealer', 0.5) },
        ],
      }),
      NO_SWING_FORCE_GAIN_TUNING,
    );

    // Effective strengths: Clutch=0.6 (recomputed P), Utility=0.2 (supplied fallback).
    // Weakest = Utility; gain Stealer P=0.5 > 0.2 → displaces Utility.
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
          // Recomputed P 0.3 ≤ loseThreshold 0.35 → lost regardless of supplied strength 0.9.
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

