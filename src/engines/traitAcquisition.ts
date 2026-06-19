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

/**
 * §9 / L9b-2 — PURE trait acquisition proposals (TS-1 / TS-5 / TS-12).
 *
 * This engine consumes L9b-1 reality scores and emits proposal objects only. It
 * never queries storage, mutates players, writes trait slots, or randomizes.
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
    | 'cap_no_displacement';
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
};

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
};

const ROSTER_ROLE_TRAITS = new Set(['Pinch Perfect', 'Utility']);

// §0.6: low-Charisma-driven traits (K Neglector). K Neglector enters BUILDABLE_TRAITS in R1 — dormant until then.
const CHARISMA_SENSITIVE_TRAITS = new Set(['K Neglector']);

// §0.6/§0.7: high-Resilience POSITIVE lean. Today resilienceTilt only down-tilts NEGATIVE traits; this adds
// the symmetric positive path. Scoped to these two per §0.7; they enter BUILDABLE_TRAITS in R2 — dormant until then.
const RESILIENCE_POSITIVE_TRAITS = new Set(['Composed', 'Gets Ahead']);

const OPPOSITE_PAIRS: readonly (readonly [string, string])[] = [
  ['First Pitch Slayer', 'First Pitch Prayer'],
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
    if (!isHeld && proposalBase.probability >= tuning.gainThreshold) {
      rawProposals.push({ ...proposalBase, valence: 'gain' });
      continue;
    }

    if (isHeld && proposalBase.probability <= tuning.loseThreshold) {
      rawProposals.push({ ...proposalBase, valence: 'lose' });
      continue;
    }

    skipped.push({ traitName, reason: 'dead_band' });
  }

  const loseProposals = rawProposals.filter((proposal) => proposal.valence === 'lose');
  const reconciledGains = reconcileGainProposals({
    gainProposals: rawProposals.filter((proposal) => proposal.valence === 'gain'),
    heldTraits: input.heldTraits,
    loseProposals,
    heldNames,
    heldProbabilityByTrait,
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

function reconcileGainProposals(args: {
  gainProposals: TraitChangeProposal[];
  heldTraits: readonly HeldTrait[];
  loseProposals: TraitChangeProposal[];
  heldNames: ReadonlySet<string>;
  heldProbabilityByTrait: ReadonlyMap<string, number>;
  skipped: SkippedTrait[];
}): TraitChangeProposal[] {
  const gainsByName = new Map(args.gainProposals.map((proposal) => [proposal.traitName, proposal]));
  const dropped = new Set<string>();

  // §0.1/§0.8: P is the single comparison currency for displacement. Rank held traits by their
  // RECOMPUTED P this cycle; fall back to the supplied strength only when a held trait has no
  // candidate this cycle (and therefore no recomputed P).
  const effectiveHeldStrength = (held: HeldTrait): number =>
    args.heldProbabilityByTrait.get(held.traitName) ?? normalizeHeldStrength(held.strength);

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

    const drop = leftGain.probability >= rightGain.probability ? right : left;
    dropped.add(drop);
    args.skipped.push({ traitName: drop, reason: 'offsetting_pair_held' });
  }

  const lossNames = new Set(args.loseProposals.map((proposal) => proposal.traitName));
  const heldAfterLosses = args.heldTraits.filter((held) => !lossNames.has(held.traitName));
  const weakestHeld = getWeakestHeld(heldAfterLosses, effectiveHeldStrength);
  const needsDisplacement = heldAfterLosses.length >= 2;
  const reconciled: TraitChangeProposal[] = [];

  for (const proposal of args.gainProposals) {
    if (dropped.has(proposal.traitName)) {
      continue;
    }

    if (!needsDisplacement) {
      reconciled.push(proposal);
      continue;
    }

    if (weakestHeld && proposal.probability > effectiveHeldStrength(weakestHeld)) {
      reconciled.push({ ...proposal, displaces: weakestHeld.traitName });
      continue;
    }

    args.skipped.push({ traitName: proposal.traitName, reason: 'cap_no_displacement' });
  }

  return reconciled;
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
