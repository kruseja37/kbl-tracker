import {
  CALIBRATE,
  FATIGUE_MODEL,
  MOJO_STATES,
  ROLE_MISUSE_MOJO_PENALTY,
  SUB_REC_THRESHOLD,
  type EffectiveMojoState,
  type PitcherRoleKey,
} from '../data/rosterEngineConstants';
import {
  activeTraitNames,
  defensivePlacementRisk,
  effectiveRatings,
  type EffectiveRatingsPlayer,
  type GameContext,
  type PlayerState,
  type Position,
} from './effectiveRatings';
import { computeIV, type IVPlayerInput } from './ivEngine';

export type SubRecType = 'pinch_hit' | 'defensive_replacement' | 'pitcher_change';

export interface SubCandidate {
  player: EffectiveRatingsPlayer;
  state: PlayerState;
  position?: Position;
  enteringInRelief?: boolean;
}

export interface SubRecThresholds {
  pinch_hit: number;
  defensive_replacement: number;
  pitcher_change: number;
}

export interface SubRecInput {
  type: SubRecType;
  current: SubCandidate;
  candidates: SubCandidate[];
  ctx: GameContext;
  thresholds?: SubRecThresholds;
}

export interface SubCandidateScore {
  candidateId: string;
  candidateName: string;
  score: number;
  rawKblIV: number;
  delta: number;
  mojoLevelShift: number;
  defensivePenalty: number;
  activeTraits: string[];
  justification: string;
}

export interface SubRecommendation {
  type: SubRecType;
  recommend: boolean;
  threshold: number;
  bestCandidateId?: string;
  bestDelta?: number;
  confidence?: 'high' | 'medium' | 'low';
  justification?: string;
  rankedCandidates: SubCandidateScore[];
}

const PITCHER_POSITIONS = new Set(['P', 'SP', 'SP/RP', 'RP', 'CP']);
const PINCH_CLUTCH_SPLIT_TRAITS = ['Pinch Perfect', 'Clutch', 'Specialist'];

export function recommendSubs(input: SubRecInput): SubRecommendation {
  const threshold = (input.thresholds ?? SUB_REC_THRESHOLD)[input.type];
  const currentRawKblIV = scoreEffectiveRatingsIv(input.current.player, input.current.state, input.ctx);
  const currentDefensivePenalty = input.type === 'defensive_replacement'
    ? defensivePenaltyFor(input.current)
    : 0;
  const currentScore = currentRawKblIV - currentDefensivePenalty;

  const rankedCandidates = input.candidates.map((candidate) => {
    const roleMisuseLevels = input.type === 'pitcher_change'
      ? roleMisuseMojoLevels(candidate, input.ctx)
      : 0;
    const candidateState = roleMisuseLevels > 0
      ? shiftMojo(candidate.state, roleMisuseLevels)
      : candidate.state;
    const rawKblIV = scoreEffectiveRatingsIv(candidate.player, candidateState, input.ctx);
    const defensivePenalty = input.type === 'defensive_replacement'
      ? defensivePenaltyFor(candidate)
      : 0;
    const score = rawKblIV - defensivePenalty;
    const delta = score - currentScore;
    const activeTraits = activeTraitNames(candidate.player, input.ctx);

    return {
      candidateId: playerId(candidate.player),
      candidateName: playerName(candidate.player),
      score,
      rawKblIV,
      delta,
      mojoLevelShift: roleMisuseLevels,
      defensivePenalty,
      activeTraits,
      justification: justificationFor({
        type: input.type,
        candidate,
        state: candidateState,
        ctx: input.ctx,
        delta,
        defensivePenalty,
        activeTraits,
        roleMisuseLevels,
      }),
    };
  }).sort((left, right) => right.score - left.score || left.candidateName.localeCompare(right.candidateName));

  const bestCandidate = rankedCandidates[0];
  const bestDelta = bestCandidate?.delta;
  const recommend = bestDelta !== undefined && bestDelta > threshold;

  return {
    type: input.type,
    recommend,
    threshold,
    bestCandidateId: bestCandidate?.candidateId,
    bestDelta,
    confidence: recommend ? confidenceFor(bestDelta, threshold) : undefined,
    justification: recommend ? bestCandidate?.justification : undefined,
    rankedCandidates,
  };
}

function scoreEffectiveRatingsIv(player: EffectiveRatingsPlayer, state: PlayerState, ctx: GameContext): number {
  const eff = effectiveRatings(player, state, ctx);
  const input: IVPlayerInput = {
    id: playerId(player),
    name: playerName(player),
    isPitcher: isPitcher(player),
    bats: player.bats,
    primaryPosition: normalizePrimaryPosition(player),
    secondaryPosition: player.secondaryPosition ?? null,
    pitcherRole: pitcherRole(player),
    traits: traitsFor(player),
    arsenal: Array.isArray((player as { arsenal?: string[] }).arsenal) ? (player as { arsenal?: string[] }).arsenal : undefined,
    armSlot: ((player as { armSlot?: 'High' | 'Mid' | 'Low' | 'Sub' | null }).armSlot) ?? null,
    ratings: {
      POW: clampRating(eff.POW),
      CON: clampRating(eff.CON),
      SPD: clampRating(eff.SPD),
      FLD: clampRating(eff.FLD),
      ARM: clampRating(eff.ARM),
    },
    pitcherRatings: {
      velocity: clampRating(eff.VEL),
      junk: clampRating(eff.JNK),
      accuracy: clampRating(eff.ACC),
    },
  };
  return computeIV(input).kblIV;
}

function defensivePenaltyFor(candidate: SubCandidate): number {
  if (!candidate.position) return 0;
  const risk = defensivePlacementRisk(candidate.player, candidate.position);
  return risk.chanceFrequency * risk.errorLikelihood * CALIBRATE.lineupDefensiveRiskIvPenalty;
}

function roleMisuseMojoLevels(candidate: SubCandidate, ctx: GameContext): number {
  const role = pitcherRole(candidate.player);
  if (role === 'SP/RP') return ROLE_MISUSE_MOJO_PENALTY.spRpAnyRole;
  if (role === 'SP' && candidate.enteringInRelief) return ROLE_MISUSE_MOJO_PENALTY.spRelieving;
  if (role === 'RP' && !candidate.enteringInRelief) return ROLE_MISUSE_MOJO_PENALTY.rpStarting;
  if (role === 'CP' && !candidate.enteringInRelief) return ROLE_MISUSE_MOJO_PENALTY.cpStarting;
  if (role === 'CP' && candidate.enteringInRelief && ctx.inning < secondToLastInning(ctx)) {
    return ROLE_MISUSE_MOJO_PENALTY.cpEnteringBeforeSecondToLastInning;
  }
  return 0;
}

function secondToLastInning(ctx: GameContext): number {
  return Math.max(1, (ctx.gameLengthInnings ?? 9) - 1);
}

function shiftMojo(state: PlayerState, levels: number): PlayerState {
  const currentIndex = MOJO_STATES.indexOf(state.mojo);
  const nextIndex = Math.max(0, currentIndex - levels);
  return {
    ...state,
    mojo: MOJO_STATES[nextIndex] as EffectiveMojoState,
  };
}

function justificationFor(input: {
  type: SubRecType;
  candidate: SubCandidate;
  state: PlayerState;
  ctx: GameContext;
  delta: number;
  defensivePenalty: number;
  activeTraits: string[];
  roleMisuseLevels: number;
}): string {
  if (input.state.mojo !== 'Normal') return `${input.state.mojo} mojo`;
  if (input.state.fitness !== 'FIT') return `${input.state.fitness} fitness`;

  const pinchClutchSplit = input.activeTraits.find((trait) =>
    PINCH_CLUTCH_SPLIT_TRAITS.includes(trait) || trait.includes('vs LHP') || trait.includes('vs RHP'),
  );
  if (pinchClutchSplit) return `${pinchClutchSplit} active`;

  const opposingTraits = input.ctx.opposingPlayer
    ? activeTraitNames(input.ctx.opposingPlayer, input.ctx)
    : [];
  if (input.activeTraits.length > 0 && opposingTraits.length > 0) {
    return `${input.activeTraits[0]} vs ${opposingTraits[0]}`;
  }

  if (input.type === 'pitcher_change' && input.roleMisuseLevels > 0) {
    return `role misuse -${input.roleMisuseLevels} mojo`;
  }
  if (input.defensivePenalty > 0 && input.candidate.position) {
    return `${input.candidate.position} defensive risk priced`;
  }

  const fatigue = fatigueJustification(input.candidate.player, input.state);
  if (fatigue) return fatigue;

  return `IV-of-effectiveRatings Δ $${Math.round(input.delta).toLocaleString()}`;
}

function fatigueJustification(player: EffectiveRatingsPlayer, state: PlayerState): string | undefined {
  const role = normalizePitcherRole(state.workload?.role ?? pitcherRole(player));
  const pitches = state.workload?.pitchesThrown ?? 0;
  if (!role || pitches <= FATIGUE_MODEL.rolePitchThresholds[role]) return undefined;
  return `fatigued (${pitches} pitches)`;
}

function confidenceFor(delta: number, threshold: number): 'high' | 'medium' | 'low' | undefined {
  if (delta >= threshold * 2) return 'high';
  if (delta >= threshold * 1.25) return 'medium';
  if (delta > threshold) return 'low';
  return undefined;
}

function playerId(player: EffectiveRatingsPlayer): string {
  return player.id ?? (player as { playerId?: string }).playerId ?? player.name ?? (player as { playerName?: string }).playerName ?? 'unknown-player';
}

function playerName(player: EffectiveRatingsPlayer): string {
  if (player.name) return player.name;
  const profileName = (player as { playerName?: string }).playerName;
  if (profileName) return profileName;
  const first = typeof (player as { firstName?: unknown }).firstName === 'string' ? (player as { firstName: string }).firstName : '';
  const last = typeof (player as { lastName?: unknown }).lastName === 'string' ? (player as { lastName: string }).lastName : '';
  return `${first} ${last}`.trim() || playerId(player);
}

function isPitcher(player: EffectiveRatingsPlayer): boolean {
  const positions = [
    player.primaryPosition,
    player.position,
    player.secondaryPosition,
    player.role,
    (player as { pitcherRole?: string | null }).pitcherRole,
  ].map((position) => String(position ?? '').toUpperCase());
  return positions.some((position) => PITCHER_POSITIONS.has(position));
}

function normalizePrimaryPosition(player: EffectiveRatingsPlayer): string {
  const position = String(player.primaryPosition ?? player.position ?? '1B').toUpperCase();
  if (position === 'P') return 'SP';
  if (position === 'TWO-WAY') return 'SP/RP';
  return position;
}

function pitcherRole(player: EffectiveRatingsPlayer): PitcherRoleKey | undefined {
  if (!isPitcher(player)) return undefined;
  const explicit = normalizePitcherRole((player as { pitcherRole?: string | null }).pitcherRole ?? player.role);
  if (explicit) return explicit;
  const position = normalizePrimaryPosition(player);
  if (position === 'CP') return 'CP';
  if (position === 'RP') return 'RP';
  if (position === 'SP/RP') return 'SP/RP';
  return 'SP';
}

function normalizePitcherRole(value: unknown): PitcherRoleKey | undefined {
  return value === 'SP' || value === 'RP' || value === 'CP' || value === 'SP/RP' ? value : undefined;
}

function traitsFor(player: EffectiveRatingsPlayer): string[] {
  const traitValues = [
    player.trait1,
    player.trait2,
    ...(Array.isArray(player.traits) ? player.traits : Object.values(player.traits ?? {})),
  ];
  return traitValues.filter((trait): trait is string => typeof trait === 'string' && trait.trim().length > 0);
}

function clampRating(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(99, value));
}
