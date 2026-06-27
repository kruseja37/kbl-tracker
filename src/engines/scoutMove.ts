import {
  type EffectiveMojoState,
  type PitcherRoleKey,
} from '../data/rosterEngineConstants';
import {
  effectiveRatings,
  type EffectiveRatingsPlayer,
  type FitnessState,
  type GameContext,
  type PlayerState,
  type Position,
} from './effectiveRatings';
import { computeIV, type IVPlayerInput } from './ivEngine';
import { computeTrueValue } from './trueValue';
import type { OptimalLineupCandidate } from '../utils/optimalLineup';

export type ScoutPlayer = OptimalLineupCandidate;

export interface ScoutDecisionContext {
  decisionType: 'pitcher_change' | 'pinch_hit' | 'defensive_replacement';
  gameId?: string;
  inning: number;
  half: 'top' | 'bottom';
  outs: number;
  totalInnings: number;
  leverageIndex: number;
  count?: { balls: number; strikes: number };
  basesOccupied: { first: boolean; second: boolean; third: boolean };
  scoreDifferentialForFieldingTeam: number;
  battingTeamId: string;
  fieldingTeamId: string;
  incumbent: ScoutPlayer;
  candidates: ScoutPlayer[];
  opposingPitcher?: ScoutPlayer;
  opposingBatter?: ScoutPlayer;
}

export interface ScoutCandidateScore {
  candidateId: string;
  candidateName: string;
  kblWpaGain: number;
  justification: string;
}

export interface ScoutMoveEvaluation {
  evaluationId: string;
  decisionType: ScoutDecisionContext['decisionType'];
  incumbentPlayerId: string;
  bestCandidateId: string | null;
  bestCandidateName: string | null;
  bestMoveKblWpaGain: number;
  recommend: boolean;
  thresholdKblWpa: number;
  recommendationStrength: 'high' | 'medium' | 'low';
  rankedCandidates: ScoutCandidateScore[];
  justification: string;
  algorithmVersion: string;
  optimizerConstantsVersion: string;
}

export const ALGORITHM_VERSION = 'scout-1.0.0';
export const OPTIMIZER_CONSTANTS_VERSION = 'scout-consts-1.0.0';

// PROVISIONAL v1: kblIV is an annualized auction-dollar value, while this scorer
// needs a per-decision WPA magnitude. A 1,000,000 divisor makes a clear 10k-50k
// true-value upgrade worth roughly .01-.05 WPA at average leverage, before the
// context's intrinsic leverage scaling. Mode-2 tuning can retune this constant.
export const SCOUT_DECISION_WPA_DIVISOR = 1_000_000;

export const SCOUT_THRESHOLD_KBL_WPA: Record<ScoutDecisionContext['decisionType'], number> = {
  pitcher_change: 0.015,
  pinch_hit: 0.0125,
  defensive_replacement: 0.01,
};

const PITCHER_POSITIONS = new Set(['P', 'SP', 'SP/RP', 'RP', 'CP', 'TWO-WAY']);

export function evaluateScoutMove(ctx: ScoutDecisionContext): ScoutMoveEvaluation {
  try {
    return evaluateScoutMoveUnsafe(ctx);
  } catch {
    return emptyEvaluation(ctx, 'Scout move evaluation degraded safely; no candidate score was recordable.');
  }
}

function evaluateScoutMoveUnsafe(ctx: ScoutDecisionContext): ScoutMoveEvaluation {
  const thresholdKblWpa = SCOUT_THRESHOLD_KBL_WPA[ctx.decisionType];
  const incumbentPlayerId = playerId(ctx.incumbent);
  const evaluationId = [
    ctx.gameId ?? 'nogame',
    finiteOr(ctx.inning, 0),
    ctx.half,
    finiteOr(ctx.outs, 0),
    ctx.decisionType,
    incumbentPlayerId,
  ].join(':');
  const incumbentValue = scoreTrueValue(ctx.incumbent, ctx);
  const leverageIndex = Math.max(0, finiteOr(ctx.leverageIndex, 1));

  const rankedCandidates = ctx.candidates.map((candidate) => {
    const candidateValue = scoreTrueValue(candidate, ctx);
    const kblWpaGain = roundKblWpa(
      (candidateValue.trueValue - incumbentValue.trueValue) / SCOUT_DECISION_WPA_DIVISOR * leverageIndex,
    );

    return {
      candidateId: playerId(candidate),
      candidateName: playerName(candidate),
      kblWpaGain,
      justification: candidateValue.degraded
        ? `Unable to fully price ${playerName(candidate)}; safe fallback true value ${candidateValue.trueValue}.`
        : `${playerName(candidate)} true-value delta ${Math.round(candidateValue.trueValue - incumbentValue.trueValue).toLocaleString()} IV-$ -> ${kblWpaGain.toFixed(6)} kbl-WPA.`,
    };
  }).sort(compareCandidateScores);

  const bestCandidate = rankedCandidates[0];
  const bestMoveKblWpaGain = bestCandidate?.kblWpaGain ?? 0;
  const recommend = bestMoveKblWpaGain > thresholdKblWpa;
  const recommendationStrength = strengthFor(bestMoveKblWpaGain, thresholdKblWpa);

  return {
    evaluationId,
    decisionType: ctx.decisionType,
    incumbentPlayerId,
    bestCandidateId: bestCandidate?.candidateId ?? null,
    bestCandidateName: bestCandidate?.candidateName ?? null,
    bestMoveKblWpaGain,
    recommend,
    thresholdKblWpa,
    recommendationStrength,
    rankedCandidates,
    justification: bestCandidate
      ? `${bestCandidate.candidateName} leads by ${bestMoveKblWpaGain.toFixed(6)} kbl-WPA against a ${thresholdKblWpa.toFixed(4)} ${ctx.decisionType} bar.`
      : `No ${ctx.decisionType} candidates supplied; no better move exists.`,
    algorithmVersion: ALGORITHM_VERSION,
    optimizerConstantsVersion: OPTIMIZER_CONSTANTS_VERSION,
  };
}

function scoreTrueValue(
  player: ScoutPlayer,
  ctx: ScoutDecisionContext,
): { trueValue: number; degraded: boolean } {
  try {
    const gameCtx = buildGameContext(ctx, player);
    const eff = effectiveRatings(player as EffectiveRatingsPlayer, toPlayerState(player), gameCtx);
    const kblIV = computeIV(toIvInput(player, eff)).kblIV;
    const result = computeTrueValue(
      {
        kblIV,
        traits: [],
        fielding: clampRating(player.fielding),
        isPitcher: ctx.decisionType === 'pitcher_change',
      },
      {},
    );

    return { trueValue: finiteOr(result.trueValue, 0), degraded: false };
  } catch {
    return { trueValue: 0, degraded: true };
  }
}

function toIvInput(player: ScoutPlayer, eff: Record<string, number>): IVPlayerInput {
  return {
    id: playerId(player),
    name: playerName(player),
    isPitcher: isPitcher(player),
    bats: player.bats,
    primaryPosition: normalizePrimaryPosition(player),
    secondaryPosition: player.secondaryPosition ?? null,
    pitcherRole: pitcherRole(player),
    traits: traitsFor(player),
    arsenal: Array.isArray(player.arsenal) ? player.arsenal : undefined,
    armSlot: player.armSlot ?? null,
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
}

function buildGameContext(ctx: ScoutDecisionContext, player: ScoutPlayer): GameContext {
  const runners = runnerCount(ctx);
  return {
    count: ctx.count,
    // Leverage enters the win-value EXACTLY ONCE — via the ×leverageIndex WPA conversion in
    // evaluateScoutMoveUnsafe (interface contract Answer 1: "no separate leverage multiplier on top, no
    // double-count"). Deriving pressure from leverageIndex here would apply leverage a second time (through
    // effectiveRatings), so pressure stays neutral. Clutch-performance-under-pressure modeling is a Mode-2 refinement.
    pressure: 'none',
    runnersOn: runners,
    risp: ctx.basesOccupied.second || ctx.basesOccupied.third,
    opposingHand: normalizeHand(throwingHand(ctx.opposingPitcher), ctx.half === 'top' ? 'R' : 'L'),
    opposingPlayer: (ctx.opposingPitcher ?? ctx.opposingBatter) as EffectiveRatingsPlayer | undefined,
    inning: finiteOr(ctx.inning, 1),
    gameLengthInnings: finiteOr(ctx.totalInnings, 9),
    isSubstitutionAB: ctx.decisionType === 'pinch_hit',
    basesEmpty: runners === 0,
    teamLosing: ctx.scoreDifferentialForFieldingTeam < 0,
    playingPosition: normalizePosition(player.currentPosition ?? player.primaryPosition),
    batterHand: normalizeBats(ctx.opposingBatter?.bats),
    pitcherHand: normalizeHand(throwingHand(ctx.opposingPitcher)),
  };
}

function toPlayerState(player: ScoutPlayer): PlayerState {
  return {
    mojo: normalizeMojo(player.mojo),
    fitness: normalizeFitness(player.fitness),
    workload: {
      role: pitcherRole(player),
    },
  };
}

function emptyEvaluation(ctx: ScoutDecisionContext, justification: string): ScoutMoveEvaluation {
  const incumbentPlayerId = playerId(ctx.incumbent);
  return {
    evaluationId: [
      ctx.gameId ?? 'nogame',
      finiteOr(ctx.inning, 0),
      ctx.half,
      finiteOr(ctx.outs, 0),
      ctx.decisionType,
      incumbentPlayerId,
    ].join(':'),
    decisionType: ctx.decisionType,
    incumbentPlayerId,
    bestCandidateId: null,
    bestCandidateName: null,
    bestMoveKblWpaGain: 0,
    recommend: false,
    thresholdKblWpa: SCOUT_THRESHOLD_KBL_WPA[ctx.decisionType],
    recommendationStrength: 'low',
    rankedCandidates: [],
    justification,
    algorithmVersion: ALGORITHM_VERSION,
    optimizerConstantsVersion: OPTIMIZER_CONSTANTS_VERSION,
  };
}

function compareCandidateScores(left: ScoutCandidateScore, right: ScoutCandidateScore): number {
  return right.kblWpaGain - left.kblWpaGain
    || left.candidateName.localeCompare(right.candidateName)
    || left.candidateId.localeCompare(right.candidateId);
}

function strengthFor(gain: number, threshold: number): 'high' | 'medium' | 'low' {
  if (gain >= threshold * 2) return 'high';
  if (gain >= threshold * 1.25) return 'medium';
  return 'low';
}

function runnerCount(ctx: ScoutDecisionContext): number {
  return [
    ctx.basesOccupied.first,
    ctx.basesOccupied.second,
    ctx.basesOccupied.third,
  ].filter(Boolean).length;
}

function playerId(player: ScoutPlayer): string {
  return player.playerId ?? (player as { id?: string }).id ?? player.playerName ?? (player as { name?: string }).name ?? 'unknown-player';
}

function playerName(player: ScoutPlayer): string {
  return player.playerName ?? (player as { name?: string }).name ?? playerId(player);
}

function isPitcher(player: ScoutPlayer): boolean {
  const positions = [
    player.primaryPosition,
    player.currentPosition,
    player.secondaryPosition,
    player.pitcherRole,
  ].map((position) => String(position ?? '').toUpperCase());
  return positions.some((position) => PITCHER_POSITIONS.has(position));
}

function normalizePrimaryPosition(player: ScoutPlayer): string {
  const position = String(player.primaryPosition ?? player.currentPosition ?? (isPitcher(player) ? 'SP' : '1B')).toUpperCase();
  if (position === 'P') return 'SP';
  if (position === 'TWO-WAY') return 'SP/RP';
  if (!position) return '1B';
  return position;
}

function pitcherRole(player: ScoutPlayer): PitcherRoleKey | undefined {
  if (!isPitcher(player)) return undefined;
  const explicit = player.pitcherRole;
  if (explicit === 'SP' || explicit === 'RP' || explicit === 'CP' || explicit === 'SP/RP') return explicit;
  const position = normalizePrimaryPosition(player);
  if (position === 'CP') return 'CP';
  if (position === 'RP') return 'RP';
  if (position === 'SP/RP') return 'SP/RP';
  return 'SP';
}

function traitsFor(player: ScoutPlayer): string[] {
  const traitValues = [
    player.trait1,
    player.trait2,
    ...(Array.isArray(player.traits) ? player.traits : Object.values(player.traits ?? {})),
  ];
  return traitValues.filter((trait): trait is string => typeof trait === 'string' && trait.trim().length > 0);
}

function normalizePosition(position: string | undefined): Position | undefined {
  const normalized = String(position ?? '').toUpperCase();
  if (
    normalized === 'C' ||
    normalized === '1B' ||
    normalized === '2B' ||
    normalized === 'SS' ||
    normalized === '3B' ||
    normalized === 'LF' ||
    normalized === 'CF' ||
    normalized === 'RF' ||
    normalized === 'DH' ||
    normalized === 'SP' ||
    normalized === 'RP' ||
    normalized === 'CP'
  ) {
    return normalized;
  }
  if (normalized === 'P') return 'SP';
  return undefined;
}

function normalizeHand(value: unknown, fallback: 'L' | 'R' = 'R'): 'L' | 'R' {
  return value === 'L' || value === 'R' ? value : fallback;
}

function throwingHand(player: ScoutPlayer | undefined): unknown {
  return (player as { throws?: unknown; throwingHand?: unknown } | undefined)?.throws
    ?? (player as { throws?: unknown; throwingHand?: unknown } | undefined)?.throwingHand;
}

function normalizeBats(value: unknown): 'L' | 'R' | 'S' | undefined {
  return value === 'L' || value === 'R' || value === 'S' ? value : undefined;
}

function normalizeMojo(value: unknown): EffectiveMojoState {
  if (value === 'Rattled' || value === 'Tense' || value === 'Normal' || value === 'Locked In'
    || value === 'On Fire' || value === 'Jacked') {
    return value;
  }
  if (value === 'Hot') return 'Locked In';
  if (value === 'Cold') return 'Tense';
  if (value === 'Ice Cold') return 'Rattled';
  if (typeof value === 'number') {
    if (value <= -2) return 'Rattled';
    if (value < 0) return 'Tense';
    if (value > 2) return 'On Fire';
    if (value > 0) return 'Locked In';
  }
  return 'Normal';
}

function normalizeFitness(value: unknown): FitnessState {
  if (value === 'JUICED' || value === 'FIT' || value === 'WELL' || value === 'STRAINED'
    || value === 'WEAK' || value === 'HURT') {
    return value;
  }
  return 'FIT';
}

function clampRating(value: unknown): number {
  return Math.max(0, Math.min(99, finiteOr(value, 0)));
}

function finiteOr(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function roundKblWpa(value: number): number {
  return Math.round(finiteOr(value, 0) * 1_000_000_000) / 1_000_000_000;
}
