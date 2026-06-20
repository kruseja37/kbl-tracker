import { normalizePersonality, type CanonicalPersonality } from './masterMoraleMatrix';
import type { HiddenModifiers } from '../types/game';
import type { RelationshipEdgeType } from '../utils/franchiseRelationshipEdgesStorage';

export type RelationshipFormationEdgeType = Extract<
  RelationshipEdgeType,
  'RIVALRY' | 'FEUD' | 'MENTORSHIP' | 'FRIENDSHIP'
>;

export const L13_3A_RELATIONSHIP_EDGE_TYPES: readonly RelationshipFormationEdgeType[] = [
  'RIVALRY',
  'FEUD',
  'MENTORSHIP',
  'FRIENDSHIP',
] as const;

export interface RelationshipFormationPlayer {
  playerId: string;
  teamId?: string | null;
  personality?: string | null;
  age?: number | null;
  modifiers?: Partial<HiddenModifiers> | null;
}

export interface RelationshipFormationContext {
  franchiseId: string;
  seasonId: string;
  statsScopeId: string;
  gameNumber: number;
}

export interface RelationshipFormationEdge {
  player1Id: string;
  player2Id: string;
  type: RelationshipFormationEdgeType;
  intensity: number;
  potential: boolean;
  accuracy: number;
  score: number;
  threshold: number;
  effectiveThreshold: number;
  seededRoll: number;
  seed: string;
}

export const RELATIONSHIP_FORMATION_INPUTS: Record<RelationshipFormationEdgeType, readonly string[]> = {
  RIVALRY: [
    'player1.hiddenModifiers.ambition',
    'player1.hiddenModifiers.loyalty',
    'player1.personality',
    'player2.hiddenModifiers.ambition',
    'player2.hiddenModifiers.loyalty',
    'player2.personality',
  ],
  FEUD: [
    'aggressor.hiddenModifiers.ambition',
    'aggressor.hiddenModifiers.loyalty',
    'aggressor.personality',
    'target.hiddenModifiers.charisma',
    'target.personality',
  ],
  MENTORSHIP: [
    'mentor.age',
    'mentor.hiddenModifiers.charisma',
    'mentor.hiddenModifiers.loyalty',
    'mentor.hiddenModifiers.resilience',
    'mentor.personality',
    'protege.age',
  ],
  FRIENDSHIP: [
    'player1.hiddenModifiers.loyalty',
    'player1.hiddenModifiers.resilience',
    'player1.hiddenModifiers.charisma',
    'player1.personality',
    'player2.hiddenModifiers.loyalty',
    'player2.hiddenModifiers.resilience',
    'player2.hiddenModifiers.charisma',
    'player2.personality',
  ],
};

export const RELATIONSHIP_FORMATION_TUNING = {
  /**
   * L13-3a / §16 SIM-TUNE placeholders. These constants intentionally lock the
   * threshold shape without claiming final design magnitudes.
   */
  thresholds: {
    RIVALRY: 0.78,
    FEUD: 0.78,
    MENTORSHIP: 0.8,
    FRIENDSHIP: 0.84,
  } satisfies Record<RelationshipFormationEdgeType, number>,
  seededThresholdWindow: 0.03,
  youngAgeMax: 24,
  veteranAgeMin: 30,
  activeIntensityFloor: 0.35,
  potentialIntensityFloor: 0.18,
  accuracyFloor: 0.55,
  accuracyRange: 0.4,
} as const;

const NEUTRAL_HIDDEN_MODIFIERS: HiddenModifiers = {
  loyalty: 50,
  ambition: 50,
  resilience: 50,
  charisma: 50,
};

interface PreparedPlayer extends RelationshipFormationPlayer {
  playerId: string;
  personality: CanonicalPersonality;
  modifiers: HiddenModifiers;
}

interface CandidateScore {
  player1Id: string;
  player2Id: string;
  type: RelationshipFormationEdgeType;
  score: number;
  potential: boolean;
}

export function computeRelationshipFormationEdges(
  players: readonly RelationshipFormationPlayer[],
  context: RelationshipFormationContext,
): RelationshipFormationEdge[] {
  const preparedPlayers = players
    .filter((player) => Boolean(player.playerId))
    .map(preparePlayer)
    .sort((left, right) => left.playerId.localeCompare(right.playerId));

  const edges: RelationshipFormationEdge[] = [];

  for (let leftIndex = 0; leftIndex < preparedPlayers.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < preparedPlayers.length; rightIndex += 1) {
      const left = preparedPlayers[leftIndex];
      const right = preparedPlayers[rightIndex];
      const candidates = [
        scoreRivalry(left, right),
        scoreFeud(left, right),
        scoreMentorship(left, right),
        scoreFriendship(left, right),
      ].filter((candidate): candidate is CandidateScore => candidate !== null);

      for (const candidate of candidates) {
        const seed = relationshipFormationSeed(context, candidate.player1Id, candidate.player2Id, candidate.type);
        const seededRoll = stableUnitInterval(seed);
        const threshold = RELATIONSHIP_FORMATION_TUNING.thresholds[candidate.type];
        const effectiveThreshold = threshold + (seededRoll * RELATIONSHIP_FORMATION_TUNING.seededThresholdWindow);
        if (candidate.score < effectiveThreshold) continue;

        edges.push({
          player1Id: candidate.player1Id,
          player2Id: candidate.player2Id,
          type: candidate.type,
          potential: candidate.potential,
          score: round4(candidate.score),
          threshold,
          effectiveThreshold: round4(effectiveThreshold),
          seededRoll: round4(seededRoll),
          seed,
          intensity: relationshipIntensity(candidate.score, candidate.potential),
          accuracy: relationshipAccuracy(candidate.score),
        });
      }
    }
  }

  return edges.sort((left, right) =>
    left.player1Id.localeCompare(right.player1Id) ||
    left.player2Id.localeCompare(right.player2Id) ||
    left.type.localeCompare(right.type),
  );
}

export function relationshipFormationSeed(
  context: RelationshipFormationContext,
  player1Id: string,
  player2Id: string,
  type: RelationshipFormationEdgeType,
): string {
  const [canonicalPlayer1Id, canonicalPlayer2Id] = canonicalPair(player1Id, player2Id);
  return [
    context.franchiseId,
    context.seasonId,
    context.statsScopeId,
    String(context.gameNumber),
    canonicalPlayer1Id,
    canonicalPlayer2Id,
    type,
  ].join(':');
}

function preparePlayer(player: RelationshipFormationPlayer): PreparedPlayer {
  return {
    ...player,
    playerId: player.playerId,
    personality: normalizePersonality(player.personality ?? undefined),
    modifiers: resolveHiddenModifiers(player.modifiers),
  };
}

function resolveHiddenModifiers(modifiers: Partial<HiddenModifiers> | null | undefined): HiddenModifiers {
  return {
    loyalty: clampModifier(modifiers?.loyalty ?? NEUTRAL_HIDDEN_MODIFIERS.loyalty),
    ambition: clampModifier(modifiers?.ambition ?? NEUTRAL_HIDDEN_MODIFIERS.ambition),
    resilience: clampModifier(modifiers?.resilience ?? NEUTRAL_HIDDEN_MODIFIERS.resilience),
    charisma: clampModifier(modifiers?.charisma ?? NEUTRAL_HIDDEN_MODIFIERS.charisma),
  };
}

function scoreRivalry(left: PreparedPlayer, right: PreparedPlayer): CandidateScore {
  const score =
    (0.42 * average(normalizeModifier(left.modifiers.ambition), normalizeModifier(right.modifiers.ambition))) +
    (0.22 * (1 - average(normalizeModifier(left.modifiers.loyalty), normalizeModifier(right.modifiers.loyalty)))) +
    (0.18 * Math.abs(normalizeModifier(left.modifiers.ambition) - normalizeModifier(right.modifiers.ambition))) +
    (0.18 * personalityClashScore(left.personality, right.personality));
  const [player1Id, player2Id] = canonicalPair(left.playerId, right.playerId);
  return {
    player1Id,
    player2Id,
    type: 'RIVALRY',
    score,
    potential: isPotentialEdge(left, right),
  };
}

function scoreFeud(left: PreparedPlayer, right: PreparedPlayer): CandidateScore {
  const leftAsAggressor = directionalFeudScore(left, right);
  const rightAsAggressor = directionalFeudScore(right, left);
  const aggressor = leftAsAggressor >= rightAsAggressor ? left : right;
  const target = aggressor === left ? right : left;
  return {
    player1Id: aggressor.playerId,
    player2Id: target.playerId,
    type: 'FEUD',
    score: Math.max(leftAsAggressor, rightAsAggressor),
    potential: isPotentialEdge(left, right),
  };
}

function scoreMentorship(left: PreparedPlayer, right: PreparedPlayer): CandidateScore | null {
  const leftMentorsRight = directionalMentorshipScore(left, right);
  const rightMentorsLeft = directionalMentorshipScore(right, left);
  if (leftMentorsRight == null && rightMentorsLeft == null) return null;

  const leftScore = leftMentorsRight ?? -1;
  const rightScore = rightMentorsLeft ?? -1;
  const mentor = leftScore >= rightScore ? left : right;
  const protege = mentor === left ? right : left;

  return {
    player1Id: mentor.playerId,
    player2Id: protege.playerId,
    type: 'MENTORSHIP',
    score: Math.max(leftScore, rightScore),
    potential: isPotentialEdge(left, right),
  };
}

function scoreFriendship(left: PreparedPlayer, right: PreparedPlayer): CandidateScore {
  const score =
    (0.3 * average(normalizeModifier(left.modifiers.loyalty), normalizeModifier(right.modifiers.loyalty))) +
    (0.25 * average(normalizeModifier(left.modifiers.resilience), normalizeModifier(right.modifiers.resilience))) +
    (0.2 * average(normalizeModifier(left.modifiers.charisma), normalizeModifier(right.modifiers.charisma))) +
    (0.15 * (1 - Math.abs(normalizeModifier(left.modifiers.ambition) - normalizeModifier(right.modifiers.ambition)))) +
    (0.1 * personalityCompatibilityScore(left.personality, right.personality));
  const [player1Id, player2Id] = canonicalPair(left.playerId, right.playerId);
  return {
    player1Id,
    player2Id,
    type: 'FRIENDSHIP',
    score,
    potential: isPotentialEdge(left, right),
  };
}

function directionalFeudScore(aggressor: PreparedPlayer, target: PreparedPlayer): number {
  return (
    (0.34 * normalizeModifier(aggressor.modifiers.ambition)) +
    (0.2 * (1 - normalizeModifier(aggressor.modifiers.loyalty))) +
    (0.22 * (1 - normalizeModifier(target.modifiers.charisma))) +
    (0.14 * (aggressor.personality === 'EGOTISTICAL' ? 1 : 0)) +
    (0.1 * (target.personality === 'TIMID' || target.personality === 'DROOPY' ? 1 : 0))
  );
}

function directionalMentorshipScore(mentor: PreparedPlayer, protege: PreparedPlayer): number | null {
  if (!isVeteranAge(mentor.age) || !isYoungAge(protege.age)) return null;
  return (
    (0.54 * normalizeModifier(mentor.modifiers.charisma)) +
    (0.18 * normalizeModifier(mentor.modifiers.loyalty)) +
    (0.16 * normalizeModifier(mentor.modifiers.resilience)) +
    (0.12 * mentorshipPersonalityScore(mentor.personality))
  );
}

function isPotentialEdge(left: RelationshipFormationPlayer, right: RelationshipFormationPlayer): boolean {
  return !(left.teamId && right.teamId && left.teamId === right.teamId);
}

function isVeteranAge(age: number | null | undefined): boolean {
  return typeof age === 'number' && Number.isFinite(age) && age >= RELATIONSHIP_FORMATION_TUNING.veteranAgeMin;
}

function isYoungAge(age: number | null | undefined): boolean {
  return typeof age === 'number' && Number.isFinite(age) && age <= RELATIONSHIP_FORMATION_TUNING.youngAgeMax;
}

function personalityClashScore(left: CanonicalPersonality, right: CanonicalPersonality): number {
  if (left === right) return left === 'EGOTISTICAL' ? 0.75 : 0.25;
  const antagonist = new Set<CanonicalPersonality>(['COMPETITIVE', 'EGOTISTICAL', 'TOUGH']);
  if (left === 'EGOTISTICAL' || right === 'EGOTISTICAL') return 1;
  return antagonist.has(left) && antagonist.has(right) ? 0.75 : 0;
}

function personalityCompatibilityScore(left: CanonicalPersonality, right: CanonicalPersonality): number {
  if (left === right) return 1;
  const steady = new Set<CanonicalPersonality>(['JOLLY', 'RELAXED', 'TOUGH']);
  return steady.has(left) && steady.has(right) ? 0.75 : 0;
}

function mentorshipPersonalityScore(personality: CanonicalPersonality): number {
  return personality === 'JOLLY' || personality === 'TOUGH' || personality === 'RELAXED' ? 1 : 0;
}

function relationshipIntensity(score: number, potential: boolean): number {
  const floor = potential
    ? RELATIONSHIP_FORMATION_TUNING.potentialIntensityFloor
    : RELATIONSHIP_FORMATION_TUNING.activeIntensityFloor;
  return round4(clamp01(floor + ((1 - floor) * score)));
}

function relationshipAccuracy(score: number): number {
  return round4(clamp01(
    RELATIONSHIP_FORMATION_TUNING.accuracyFloor +
    (score * RELATIONSHIP_FORMATION_TUNING.accuracyRange),
  ));
}

function canonicalPair(player1Id: string, player2Id: string): [string, string] {
  return [player1Id, player2Id].sort((left, right) => left.localeCompare(right)) as [string, string];
}

function stableUnitInterval(seed: string): number {
  return fnv1a32(seed) / 0xffffffff;
}

function fnv1a32(value: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

function normalizeModifier(value: number): number {
  return clampModifier(value) / 100;
}

function clampModifier(value: number): number {
  return Math.min(100, Math.max(0, Number.isFinite(value) ? value : 50));
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

function average(left: number, right: number): number {
  return (left + right) / 2;
}

function round4(value: number): number {
  return Math.round(value * 10000) / 10000;
}
