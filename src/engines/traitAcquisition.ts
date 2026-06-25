import {
  CANONICAL_TRAIT_NAMES,
  isTraitEligibleForRole,
  type PlayerRole,
  type TraitRealityScore,
  traitRole,
} from './traitRealityScorer';
import {
  normalizePersonality,
  type CanonicalPersonality,
} from './masterMoraleMatrix';
import type { HiddenModifiers } from '../types/game';
import { assignTier, computeTraitWeight, ELITE_PITCH_TRAITS, type TraitTier } from '../data/traitTierConfig';

/**
 * §9 / L9b-2 — PURE trait acquisition proposals (TS-1 / TS-5 / TS-12).
 *
 * This engine consumes L9b-1 reality scores and emits proposal objects only. It
 * never queries storage, mutates players, writes trait slots, or uses ambient
 * randomness; §8B seeded likelihood rolls are opt-in via input.seed.
 * L9b-3 owns confirmation/write-back.
 */
export type RosterRole = 'bench' | 'starter' | 'unknown';
export type TraitValence = 'positive' | 'negative' | 'neutral';

export interface HeldTrait { traitName: string; strength: number; }
export interface TraitCandidate { traitName: string; score: TraitRealityScore; }

export interface TraitAcquisitionInput {
  playerRole: PlayerRole;
  personality: string;
  modifiers?: HiddenModifiers;
  currentMorale?: number;
  rosterRole?: RosterRole;
  heldTraits: readonly HeldTrait[];
  candidates: readonly TraitCandidate[];
  seed?: string;
}

export interface TraitChangeProposal {
  traitName: string;
  valence: 'gain' | 'lose';
  imageValence: TraitValence;
  probability: number;
  realityPercentile: number;
  factors: {
    ambitionTilt: number;
    resilienceTilt: number;
    imageAxisTilt: number;
    moraleFactor: number;
    rosterRoleFactor: number;
    charismaTilt: number;
    resiliencePositiveTilt: number;
  };
  displaces?: string;
}

export interface SkippedTrait {
  traitName: string;
  reason:
    | 'ineligible_role'
    | 'unknown_trait'
    | 'thin_sample'
    | 'thin_peer_pool'
    | 'dead_band'
    | 'offsetting_pair_held'
    | 'elite_pitch_excluded'
    | 'cap_no_displacement'
    | 'likelihood_not_fired';
}

export interface TraitAcquisitionResult {
  proposals: TraitChangeProposal[];
  skipped: SkippedTrait[];
}

export interface TraitAcquisitionTuning {
  ambitionSwing: number;
  resilienceSwing: number;
  imageSwing: number;
  moraleSwing: number;
  rosterSwing: number;
  charismaSwing: number;
  gainThreshold: number;
  loseThreshold: number;
  maxTraits?: number;
  incumbencyBeta?: number;
}

interface TraitThresholds {
  gainThreshold: number;
  loseThreshold: number;
}

// §16 SIM-TUNE placeholders — shape locked, values owned by the Simulation Gate.
export const TRAIT_ACQUISITION_TUNING: TraitAcquisitionTuning = {
  ambitionSwing: 0.35,
  resilienceSwing: 0.35,
  imageSwing: 0.25,
  moraleSwing: 0.30,
  rosterSwing: 0.30,
  charismaSwing: 0.30,
  gainThreshold: 0.75,
  loseThreshold: 0.35,
  maxTraits: 2, // §16 sim-tune placeholder
  incumbencyBeta: 1.25, // β=1.25 RULED
};

// §16 sim-tune placeholder — shape (monotonic in margin, tier-hardness) locked; constants tunable.
export const TRAIT_FIRING_CURVE = {
  base: 0.15,
  slope: 0.80,
  floor: 0.05,
  ceil: 0.97,
  tierHardness: {
    ELITE: 0.10,
    RARE: 0.05,
    UNCOMMON: 0.02,
    COMMON: 0,
    SEVERE: 0.10,
    MODERATE: 0.05,
    MINOR: 0,
  },
} as const;

// §16 sim-tune — Common-floor; UNREACHABLE for buildable traits (excluded/unpriced only), proven by test.
const DEFAULT_TRAIT_WEIGHT_FALLBACK = 0.15;

export function firingProbability(normalizedMargin: number, tier?: TraitTier): number {
  return clamp(
    TRAIT_FIRING_CURVE.base
      + TRAIT_FIRING_CURVE.slope * clamp01(normalizedMargin)
      - (TRAIT_FIRING_CURVE.tierHardness[tier ?? 'COMMON'] ?? 0),
    TRAIT_FIRING_CURVE.floor,
    TRAIT_FIRING_CURVE.ceil,
  );
}

const NEUTRAL_MODIFIERS: HiddenModifiers = {
  loyalty: 50,
  ambition: 50,
  resilience: 50,
  charisma: 50,
};

const POSITIVE_IMAGE_TRAITS = new Set([
  'Clutch',
  'RBI Hero',
  'Rally Starter',
  'Pinch Perfect',
  'Magic Hands',
  'Rally Stopper',
  'Stealer',
  'Sprinter',
  'Base Rounder',
  'Ace Exterminator',
  'K Collector',
  'Two Way (C)',
  'Two Way (IF)',
  'Two Way (OF)',
  'Stimulated',
  'Tough Out',
  'Bunter',
  'Consistent',
  'Cannon Arm',
  'Durable',
  // R1-b1 (§0.7): Big/Little Hack enter BUILDABLE_TRAITS — both positive valence.
  'Big Hack',
  'Little Hack',
  // R2 (§0.7): the count-family POSITIVE pair (Composed / Gets Ahead — low walks,
  // high-Resilience lean via RESILIENCE_POSITIVE_TRAITS) + First Pitch Slayer
  // (first-pitch hit, big-game axis). Composed has NO image driver (its lean is
  // the universal high-Resilience positive path); Gets Ahead / Slayer get drivers.
  'Composed',
  'Gets Ahead',
  'First Pitch Slayer',
  // T-9b (§16 sim-tune default, Captain/AUTH-4): spec §0.7 does NOT assign
  // drivers for these 10; mirror K Collector. Personality is a ≤±20% TILT,
  // NEVER a gate (§0.8) — the per-pitch reality signal is primary.
  'Elite 4F',
  'Elite 2F',
  'Elite CF',
  'Elite CB',
  'Elite CH',
  'Elite FK',
  'Elite SB',
  'Elite SL',
  'Fastball Hitter',
  'Off-Speed Hitter',
  // DT-B / §16 sim-tune default (Captain, AUTH-4): spec §0.7 does NOT assign
  // drivers for these 4; mirror K Collector / the T-9b pitch traits.
  // Personality is a ≤±20% TILT, never a gate (§0.8) — the per-zone reality
  // signal is primary.
  'High Pitch',
  'Low Pitch',
  'Inside Pitch',
  'Outside Pitch',
  // DT-C1 / §0.6b row C: positive valence (priced positive). §0.7 assigns
  // NO personality driver → NO IMAGE_DRIVER_SETS entry (neutral/universal tilt,
  // §16/§0.7 documented default, OPEN-DECISION-for-JK). NO opposite pair (Bad
  // Ball Hitter stands alone; Easy Target↔Mind Gamer are a separate
  // discipline-axis pair, out of scope).
  'Bad Ball Hitter',
]);

const NEGATIVE_IMAGE_TRAITS = new Set([
  'Choker',
  'RBI Zero',
  'Butter Fingers',
  'Wild Thrower',
  'Surrounded',
  'Meltdown',
  'Bad Jumps',
  'Slow Poke',
  'Base Jogger',
  'Whiffer',
  'Volatile',
  'Injury Prone',
  // R1-a (§0.7): K Neglector enters BUILDABLE_TRAITS — negative valence + low-charisma lean.
  'K Neglector',
  // R2 (§0.7): the count-family NEGATIVE pair (BB Prone / Falls Behind — high
  // walks) + First Pitch Prayer (first-pitch out). BB Prone is mechanical (NO
  // image driver); Falls Behind / Prayer get TIMID-axis drivers (§0.7).
  'BB Prone',
  'Falls Behind',
  'First Pitch Prayer',
]);

const IMAGE_DRIVER_SETS: Readonly<Record<string, readonly CanonicalPersonality[]>> = {
  Clutch: ['TOUGH', 'COMPETITIVE'],
  'RBI Hero': ['TOUGH', 'COMPETITIVE'],
  'Rally Starter': ['TOUGH', 'COMPETITIVE'],
  'Pinch Perfect': ['TOUGH', 'COMPETITIVE'],
  'Magic Hands': ['TOUGH', 'COMPETITIVE'],
  'Rally Stopper': ['TOUGH', 'COMPETITIVE'],
  Choker: ['TIMID', 'DROOPY'],
  'RBI Zero': ['TIMID', 'DROOPY'],
  'Butter Fingers': ['TIMID', 'DROOPY'],
  'Wild Thrower': ['TIMID', 'DROOPY'],
  Surrounded: ['TIMID', 'DROOPY'],
  Meltdown: ['TIMID', 'DROOPY'],
  Stealer: ['COMPETITIVE', 'TOUGH'],
  Sprinter: ['COMPETITIVE', 'TOUGH'],
  'Base Rounder': ['COMPETITIVE', 'TOUGH'],
  'Bad Jumps': ['RELAXED', 'DROOPY'],
  'Slow Poke': ['RELAXED', 'DROOPY'],
  'Base Jogger': ['RELAXED', 'DROOPY'],
  'Ace Exterminator': ['COMPETITIVE', 'EGOTISTICAL'],
  'K Collector': ['COMPETITIVE', 'EGOTISTICAL'],
  'Two Way (C)': ['EGOTISTICAL'],
  'Two Way (IF)': ['EGOTISTICAL'],
  'Two Way (OF)': ['EGOTISTICAL'],
  Stimulated: ['TOUGH', 'EGOTISTICAL'],
  'Tough Out': ['TOUGH'],
  Bunter: ['TOUGH'],
  Whiffer: ['EGOTISTICAL'],
  'Cannon Arm': ['COMPETITIVE'],
  // R1-a (§0.7): K Neglector image driver — same TIMID/DROOPY axis as Choker et al.
  'K Neglector': ['TIMID', 'DROOPY'],
  // R1-b1 (§0.7): Big Hack ← EGOTISTICAL (swing-for-the-fences), Little Hack ←
  // TOUGH (grind-it-out contact). Distractor = neutral/universal — no entry.
  'Big Hack': ['EGOTISTICAL'],
  'Little Hack': ['TOUGH'],
  // R2 (§0.7): count-family pair-mates share a data signal; the personality TILT
  // differentiates them. Gets Ahead ← COMPETITIVE (positive), Falls Behind ←
  // TIMID (negative). First Pitch Slayer ← COMPETITIVE/EGOTISTICAL (big-game
  // spotlight, positive), First Pitch Prayer ← TIMID/DROOPY (Composure-negative).
  // BB Prone = mechanical (NO driver — universal tilt only); Composed = the
  // high-Resilience positive path (RESILIENCE_POSITIVE_TRAITS), no driver. The 6
  // handedness splits are NEUTRAL (§0.6) — intentionally NO entry here.
  'Gets Ahead': ['COMPETITIVE'],
  'Falls Behind': ['TIMID'],
  'First Pitch Slayer': ['COMPETITIVE', 'EGOTISTICAL'],
  'First Pitch Prayer': ['TIMID', 'DROOPY'],
  // T-9b (§16 sim-tune default, Captain/AUTH-4): spec §0.7 does NOT assign
  // drivers for these 10; mirror K Collector. Personality is a ≤±20% TILT,
  // NEVER a gate (§0.8) — the per-pitch reality signal is primary.
  'Elite 4F': ['COMPETITIVE', 'EGOTISTICAL'],
  'Elite 2F': ['COMPETITIVE', 'EGOTISTICAL'],
  'Elite CF': ['COMPETITIVE', 'EGOTISTICAL'],
  'Elite CB': ['COMPETITIVE', 'EGOTISTICAL'],
  'Elite CH': ['COMPETITIVE', 'EGOTISTICAL'],
  'Elite FK': ['COMPETITIVE', 'EGOTISTICAL'],
  'Elite SB': ['COMPETITIVE', 'EGOTISTICAL'],
  'Elite SL': ['COMPETITIVE', 'EGOTISTICAL'],
  'Fastball Hitter': ['COMPETITIVE', 'EGOTISTICAL'],
  'Off-Speed Hitter': ['COMPETITIVE', 'EGOTISTICAL'],
  // DT-B / §16 sim-tune default (Captain, AUTH-4): spec §0.7 does NOT assign
  // drivers for these 4; mirror K Collector / the T-9b pitch traits.
  // Personality is a ≤±20% TILT, never a gate (§0.8) — the per-zone reality
  // signal is primary.
  'High Pitch': ['COMPETITIVE', 'EGOTISTICAL'],
  'Low Pitch': ['COMPETITIVE', 'EGOTISTICAL'],
  'Inside Pitch': ['COMPETITIVE', 'EGOTISTICAL'],
  'Outside Pitch': ['COMPETITIVE', 'EGOTISTICAL'],
};

const ROSTER_ROLE_TRAITS = new Set(['Pinch Perfect', 'Utility']);

// §0.6: low-Charisma-driven traits (K Neglector). K Neglector enters BUILDABLE_TRAITS in R1 — dormant until then.
const CHARISMA_SENSITIVE_TRAITS = new Set(['K Neglector']);

// §0.6/§0.7: high-Resilience POSITIVE lean. Today resilienceTilt only down-tilts NEGATIVE traits; this adds
// the symmetric positive path. Scoped to these two per §0.7; both entered BUILDABLE_TRAITS in R2 (now live).
const RESILIENCE_POSITIVE_TRAITS = new Set(['Composed', 'Gets Ahead']);

const OPPOSITE_PAIRS: readonly (readonly [string, string])[] = [
  ['First Pitch Slayer', 'First Pitch Prayer'],
  // DT-B / §0.6b row B: pitch-location opposite pairs — earn-side
  // mutual-exclusion (mirrors the generation conflict list
  // `prospectScoutingDraftEngine.ts:381-382`). Feeds TRAIT_OPPOSITES + the
  // reconcileGainProposals duels; NO new pass needed.
  ['High Pitch', 'Low Pitch'],
  ['Inside Pitch', 'Outside Pitch'],
  ['Cannon Arm', 'Noodle Arm'],
  ['Clutch', 'Choker'],
  ['RBI Hero', 'RBI Zero'],
  ['Magic Hands', 'Butter Fingers'],
  ['Tough Out', 'Whiffer'],
  ['Big Hack', 'Little Hack'],
  ['Sprinter', 'Slow Poke'],
  ['Base Rounder', 'Base Jogger'],
  ['Stealer', 'Bad Jumps'],
  ['Consistent', 'Volatile'],
  ['Durable', 'Injury Prone'],
  ['Gets Ahead', 'Falls Behind'],
  ['K Collector', 'K Neglector'],
];

export const TRAIT_OPPOSITES: Readonly<Record<string, string>> =
  createSymmetricOpposites(OPPOSITE_PAIRS);

export function computeTraitAcquisition(
  input: TraitAcquisitionInput,
  tuning: TraitAcquisitionTuning = TRAIT_ACQUISITION_TUNING,
): TraitAcquisitionResult {
  const skipped: SkippedTrait[] = [];
  const heldNames = new Set(input.heldTraits.map((held) => held.traitName));
  const modifiers = input.modifiers ?? NEUTRAL_MODIFIERS;
  const morale = clamp(input.currentMorale ?? 50, 0, 99);
  const rosterRole = input.rosterRole ?? 'unknown';
  const imagePersonalities = resolveImagePersonalities(input.personality);
  const rawProposals: TraitChangeProposal[] = [];
  const heldProbabilityByTrait = new Map<string, number>();
  const thresholdsByTrait = new Map<string, TraitThresholds>();

  for (const candidate of input.candidates) {
    const traitName = candidate.traitName;
    const canonicalRole = traitRole(traitName);

    if (canonicalRole === null) {
      skipped.push({ traitName, reason: 'unknown_trait' });
      continue;
    }

    if (!isTraitEligibleForRole(traitName, input.playerRole)) {
      skipped.push({ traitName, reason: 'ineligible_role' });
      continue;
    }

    if (candidate.score.sufficient !== true || candidate.score.realityPercentile == null) {
      skipped.push({
        traitName,
        reason: toSkippedReason(candidate.score.sufficiency),
      });
      continue;
    }

    const realityPercentile = clamp01(candidate.score.realityPercentile);
    const proposalBase = buildProposalBase({
      traitName,
      realityPercentile,
      modifiers,
      morale,
      rosterRole,
      imagePersonalities,
      tuning,
    });

    const isHeld = heldNames.has(traitName);
    if (isHeld) {
      heldProbabilityByTrait.set(traitName, proposalBase.probability);
    }
    const thresholds = thresholdsForTrait(traitName, tuning, thresholdsByTrait);
    if (!isHeld && proposalBase.probability >= thresholds.gainThreshold) {
      rawProposals.push({ ...proposalBase, valence: 'gain' });
      continue;
    }

    if (isHeld && proposalBase.probability <= thresholds.loseThreshold) {
      rawProposals.push({ ...proposalBase, valence: 'lose' });
      continue;
    }

    skipped.push({ traitName, reason: 'dead_band' });
  }

  const firingProposals = input.seed != null && input.seed !== ''
    ? applyLikelihoodRoll(rawProposals, input.seed, thresholdsByTrait, tuning, skipped)
    : rawProposals;

  const loseProposals = firingProposals.filter((proposal) => proposal.valence === 'lose');
  const reconciledGains = reconcileGainProposals({
    gainProposals: firingProposals.filter((proposal) => proposal.valence === 'gain'),
    heldTraits: input.heldTraits,
    loseProposals,
    heldNames,
    heldProbabilityByTrait,
    tuning,
    skipped,
  });

  return {
    proposals: [...loseProposals, ...reconciledGains],
    skipped,
  };
}

function buildProposalBase(args: {
  traitName: string;
  realityPercentile: number;
  modifiers: HiddenModifiers;
  morale: number;
  rosterRole: RosterRole;
  imagePersonalities: ReadonlySet<CanonicalPersonality>;
  tuning: TraitAcquisitionTuning;
}): Omit<TraitChangeProposal, 'valence'> {
  const imageValence = getImageValence(args.traitName);
  const ambitionTilt = imageValence === 'positive'
    ? 1 + centered(args.modifiers.ambition, 0, 100) * args.tuning.ambitionSwing
    : 1;
  const resilienceTilt = imageValence === 'negative'
    ? 1 - centered(args.modifiers.resilience, 0, 100) * args.tuning.resilienceSwing
    : 1;
  const imageAxisTilt = isImageDriver(args.traitName, args.imagePersonalities)
    ? 1 + args.tuning.imageSwing
    : 1;
  const moraleFactor = imageValence === 'positive'
    ? 1 + centered(args.morale, 0, 100) * args.tuning.moraleSwing
    : imageValence === 'negative'
      ? 1 - centered(args.morale, 0, 100) * args.tuning.moraleSwing
      : 1;
  const rosterRoleFactor = ROSTER_ROLE_TRAITS.has(args.traitName)
    ? getRosterRoleFactor(args.rosterRole, args.tuning.rosterSwing)
    : 1;
  const charismaTilt = CHARISMA_SENSITIVE_TRAITS.has(args.traitName)
    ? 1 - centered(args.modifiers.charisma, 0, 100) * args.tuning.charismaSwing
    : 1;
  const resiliencePositiveTilt = RESILIENCE_POSITIVE_TRAITS.has(args.traitName)
    ? 1 + centered(args.modifiers.resilience, 0, 100) * args.tuning.resilienceSwing
    : 1;
  const probability = clamp01(
    args.realityPercentile
    * ambitionTilt
    * resilienceTilt
    * imageAxisTilt
    * moraleFactor
    * rosterRoleFactor
    * charismaTilt
    * resiliencePositiveTilt,
  );

  return {
    traitName: args.traitName,
    imageValence,
    probability,
    realityPercentile: args.realityPercentile,
    factors: {
      ambitionTilt,
      resilienceTilt,
      imageAxisTilt,
      moraleFactor,
      rosterRoleFactor,
      charismaTilt,
      resiliencePositiveTilt,
    },
  };
}

function applyLikelihoodRoll(
  rawProposals: readonly TraitChangeProposal[],
  seed: string,
  thresholdsByTrait: ReadonlyMap<string, TraitThresholds>,
  tuning: TraitAcquisitionTuning,
  skipped: SkippedTrait[],
): TraitChangeProposal[] {
  const firing: TraitChangeProposal[] = [];

  for (const proposal of rawProposals) {
    const thresholds = thresholdsByTrait.get(proposal.traitName) ?? {
      gainThreshold: tuning.gainThreshold,
      loseThreshold: tuning.loseThreshold,
    };
    let tier: TraitTier | undefined;
    try {
      tier = assignTier(proposal.traitName).tier;
    } catch {
      tier = undefined;
    }

    const normalizedMargin = proposal.valence === 'gain'
      ? clamp01(
        (proposal.probability - thresholds.gainThreshold)
        / Math.max(1 - thresholds.gainThreshold, 1e-9),
      )
      : clamp01(
        (thresholds.loseThreshold - proposal.probability)
        / Math.max(thresholds.loseThreshold, 1e-9),
      );
    const fireProb = firingProbability(normalizedMargin, tier);
    const draw = fnv1aUnit(`${seed}:${proposal.traitName}:${proposal.valence}`);

    if (draw < fireProb) {
      firing.push(proposal);
    } else {
      skipped.push({ traitName: proposal.traitName, reason: 'likelihood_not_fired' });
    }
  }

  return firing;
}

function thresholdsForTrait(
  traitName: string,
  tuning: TraitAcquisitionTuning,
  cache: Map<string, TraitThresholds>,
): TraitThresholds {
  const cached = cache.get(traitName);
  if (cached) {
    return cached;
  }

  let thresholds: TraitThresholds;
  try {
    const tier = assignTier(traitName);
    thresholds = {
      gainThreshold: tier.gainThreshold,
      loseThreshold: tier.lossThreshold,
    };
  } catch {
    thresholds = {
      gainThreshold: tuning.gainThreshold,
      loseThreshold: tuning.loseThreshold,
    };
  }

  cache.set(traitName, thresholds);
  return thresholds;
}

function reconcileGainProposals(args: {
  gainProposals: TraitChangeProposal[];
  heldTraits: readonly HeldTrait[];
  loseProposals: TraitChangeProposal[];
  heldNames: ReadonlySet<string>;
  heldProbabilityByTrait: ReadonlyMap<string, number>;
  tuning: TraitAcquisitionTuning;
  skipped: SkippedTrait[];
}): TraitChangeProposal[] {
  const gainsByName = new Map(args.gainProposals.map((proposal) => [proposal.traitName, proposal]));
  const dropped = new Set<string>();

  // §8B: held traits defend by value-weighted, incumbency-boosted recomputed P; fall
  // back to supplied strength only when no current-cycle held P exists.
  const effectiveHeldStrength = (held: HeldTrait): number =>
    args.heldProbabilityByTrait.get(held.traitName) ?? normalizeHeldStrength(held.strength);
  const maxTraits = args.tuning.maxTraits ?? 2;
  const beta = args.tuning.incumbencyBeta ?? 1.25;
  const gainScore = (proposal: TraitChangeProposal): number =>
    proposal.probability * traitWeightFor(proposal.traitName);
  const keepScore = (held: HeldTrait): number =>
    effectiveHeldStrength(held) * traitWeightFor(held.traitName) * beta;

  for (const proposal of args.gainProposals) {
    const opposite = TRAIT_OPPOSITES[proposal.traitName];
    if (opposite && args.heldNames.has(opposite)) {
      dropped.add(proposal.traitName);
      args.skipped.push({ traitName: proposal.traitName, reason: 'offsetting_pair_held' });
    }
  }

  for (const [left, right] of OPPOSITE_PAIRS) {
    const leftGain = gainsByName.get(left);
    const rightGain = gainsByName.get(right);
    if (!leftGain || !rightGain || dropped.has(left) || dropped.has(right)) {
      continue;
    }

    const drop = gainScore(leftGain) >= gainScore(rightGain) ? right : left;
    dropped.add(drop);
    args.skipped.push({ traitName: drop, reason: 'offsetting_pair_held' });
  }

  const lossNames = new Set(args.loseProposals.map((proposal) => proposal.traitName));
  // §0.6b / T-9c: at most ONE Elite-pitch trait per player (mirrors T-4c
  // generation). Held elite (not being lost) DEFENDS; otherwise the strongest
  // same-cycle elite gain wins.
  const heldEliteStaying = [...args.heldNames].filter(
    (name) => ELITE_PITCH_TRAITS.has(name) && !lossNames.has(name),
  );
  const eliteGains = args.gainProposals.filter(
    (proposal) => ELITE_PITCH_TRAITS.has(proposal.traitName) && !dropped.has(proposal.traitName),
  );
  const dropElite = (proposal: TraitChangeProposal): void => {
    dropped.add(proposal.traitName);
    args.skipped.push({ traitName: proposal.traitName, reason: 'elite_pitch_excluded' });
  };

  if (heldEliteStaying.length >= 1) {
    eliteGains.forEach(dropElite);
  } else if (eliteGains.length >= 2) {
    [...eliteGains]
      .sort((a, b) => gainScore(b) - gainScore(a) || a.traitName.localeCompare(b.traitName))
      .slice(1)
      .forEach(dropElite);
  }

  const working = args.heldTraits.filter((held) => !lossNames.has(held.traitName));
  const survivingGains = args.gainProposals
    .filter((proposal) => !dropped.has(proposal.traitName))
    .sort((a, b) => gainScore(b) - gainScore(a));

  let admittedCount = 0;
  const reconciled: TraitChangeProposal[] = [];

  for (const proposal of survivingGains) {
    const occupants = working.length + admittedCount;
    if (occupants < maxTraits) {
      reconciled.push(proposal);
      admittedCount++;
      continue;
    }

    const weakestHeld = getWeakestHeld(working, keepScore);
    if (weakestHeld && gainScore(proposal) > keepScore(weakestHeld)) {
      reconciled.push({ ...proposal, displaces: weakestHeld.traitName });
      working.splice(working.indexOf(weakestHeld), 1);
      admittedCount++;
      continue;
    }

    args.skipped.push({ traitName: proposal.traitName, reason: 'cap_no_displacement' });
  }

  return reconciled;
}

function traitWeightFor(traitName: string): number {
  try {
    return computeTraitWeight(traitName);
  } catch {
    return DEFAULT_TRAIT_WEIGHT_FALLBACK;
  }
}

function getWeakestHeld(
  heldTraits: readonly HeldTrait[],
  strengthOf: (held: HeldTrait) => number,
): HeldTrait | undefined {
  return heldTraits.reduce<HeldTrait | undefined>((weakest, held) => {
    if (!weakest) return held;
    return strengthOf(held) < strengthOf(weakest) ? held : weakest;
  }, undefined);
}

function getImageValence(traitName: string): TraitValence {
  if (POSITIVE_IMAGE_TRAITS.has(traitName)) return 'positive';
  if (NEGATIVE_IMAGE_TRAITS.has(traitName)) return 'negative';
  return 'neutral';
}

function isImageDriver(
  traitName: string,
  personalities: ReadonlySet<CanonicalPersonality>,
): boolean {
  const drivers = IMAGE_DRIVER_SETS[traitName] ?? [];
  return drivers.some((driver) => personalities.has(driver));
}

function resolveImagePersonalities(rawPersonality: string): ReadonlySet<CanonicalPersonality> {
  const normalized = String(rawPersonality ?? '').trim().toUpperCase();

  if (normalized === 'COMPOSED') {
    return new Set(['TOUGH', 'COMPETITIVE']);
  }

  return new Set([normalizePersonality(rawPersonality)]);
}

function getRosterRoleFactor(rosterRole: RosterRole, rosterSwing: number): number {
  if (rosterRole === 'bench') return 1 + rosterSwing;
  if (rosterRole === 'starter') return 1 - rosterSwing;
  return 1;
}

function toSkippedReason(sufficiency: TraitRealityScore['sufficiency']): SkippedTrait['reason'] {
  if (sufficiency === 'sufficient') {
    return 'thin_sample';
  }

  return sufficiency;
}

function centered(value: number, min: number, max: number): number {
  return (clamp(value, min, max) - 50) / 50;
}

function normalizeHeldStrength(value: number): number {
  return Number.isFinite(value) ? clamp01(value) : 0.5;
}

function clamp01(value: number): number {
  return clamp(value, 0, 1);
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

function fnv1aUnit(seed: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return (hash >>> 0) / 0xffffffff;
}

function createSymmetricOpposites(
  pairs: readonly (readonly [string, string])[],
): Readonly<Record<string, string>> {
  const opposites: Record<string, string> = {};

  for (const [left, right] of pairs) {
    if (!CANONICAL_TRAIT_NAMES.has(left) || !CANONICAL_TRAIT_NAMES.has(right)) {
      throw new Error(`Non-canonical trait opposite: ${left} <-> ${right}`);
    }
    opposites[left] = right;
    opposites[right] = left;
  }

  return Object.freeze(opposites);
}
