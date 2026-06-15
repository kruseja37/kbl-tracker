import { PRESSURE_LEVERAGE_BANDS, type PitcherRoleKey } from "../data/rosterEngineConstants";
import {
  recommendSubs,
  type SubCandidate,
  type SubRecommendation,
} from "../engines/subRecommendations";
import type {
  EffectiveRatingsPlayer,
  GameContext,
  PlayerState,
  Position,
} from "../engines/effectiveRatings";
import type {
  PromptedManagerDecisionEvent,
  PromptedManagerDecisionType,
} from "./eventLog";
import type { ManagerRecommendationWatchEvent } from "../types/managerWpa";

export type ManagerRecommendationType =
  | "consider_pitching_change"
  | "consider_pinch_hitter"
  | "consider_defensive_replacement";

export type ManagerRecommendationConfidence = "high" | "medium" | "low";

export type ManagerRecommendationSurface =
  | "recommendation_card"
  | "feed_quick_action"
  | "feed_passive";

export type ManagerRecommendationPrimaryAction =
  | "open_pitching_change"
  | "open_pinch_hit"
  | "open_defensive_sub";

export type ManagerRecommendationNoChangeAction =
  | "keep_pitcher"
  | "let_batter_hit"
  | "decline_defensive_sub";

export type ManagerRecommendationAction =
  | ManagerRecommendationPrimaryAction
  | ManagerRecommendationNoChangeAction
  | "dismiss";

export interface ManagerRecommendation {
  recommendationId: string;
  type: ManagerRecommendationType;
  managerId: string;
  teamId: string;
  confidence: ManagerRecommendationConfidence;
  surface: ManagerRecommendationSurface;
  inning: number;
  half: "top" | "bottom";
  outs: number;
  leverageIndex?: number;
  trackedPlayerIds: string[];
  title: string;
  rationale: string;
  primaryAction: ManagerRecommendationPrimaryAction;
  noChangeAction?: ManagerRecommendationNoChangeAction;
  suppressKey: string;
}

interface RecommendationPlayerBase {
  playerId: string;
  playerName: string;
  power?: number;
  contact?: number;
  speed?: number;
  fieldingRating?: number;
  fielding?: number;
  arm?: number;
  velocity?: number;
  junk?: number;
  accuracy?: number;
  trait1?: string | null;
  trait2?: string | null;
  traits?: string[];
  battingHand?: "L" | "R" | "S";
  bats?: "L" | "R" | "S";
  throws?: "L" | "R";
  throwingHand?: "L" | "R";
  position?: string;
  primaryPosition?: string;
  secondaryPosition?: string;
  secondaryPositions?: string[];
  mojo?: PlayerState["mojo"];
  fitness?: PlayerState["fitness"];
  role?: PitcherRoleKey;
  pitcherRole?: PitcherRoleKey;
  pitchCount?: number;
  isAvailable?: boolean;
}

export interface PitchingRecommendationPlayer extends RecommendationPlayerBase {
  isStarter?: boolean;
  runsAllowedInInning?: number;
  consecutiveBaserunners?: number;
  consecutiveWalks?: number;
}

export interface HitterRecommendationPlayer extends RecommendationPlayerBase {
  battingOrder?: number;
}

export interface DefenderRecommendationPlayer extends RecommendationPlayerBase {
  fieldingErrors?: number;
}

export interface BenchDefenderRecommendationPlayer
  extends RecommendationPlayerBase {
  positions?: string[];
}

export interface ManagerRecommendationInput {
  gameId?: string;
  inning: number;
  half: "top" | "bottom";
  outs: number;
  totalInnings?: number;
  leverageIndex?: number;
  battingTeamId: string;
  fieldingTeamId: string;
  offensiveManagerId: string;
  defensiveManagerId: string;
  scoreDifferentialForFieldingTeam?: number;
  count?: { balls: number; strikes: number };
  bases?: { first?: unknown; second?: unknown; third?: unknown };
  runnersOn?: boolean | number;
  risp?: boolean;
  opposingHand?: "L" | "R";
  opposingPitcher?: PitchingRecommendationPlayer;
  opposingBatter?: HitterRecommendationPlayer;
  isSubstitutionAB?: boolean;
  currentPitcher?: PitchingRecommendationPlayer;
  availablePitchers?: PitchingRecommendationPlayer[];
  currentBatter?: HitterRecommendationPlayer;
  benchHitters?: HitterRecommendationPlayer[];
  defenders?: DefenderRecommendationPlayer[];
  benchDefenders?: BenchDefenderRecommendationPlayer[];
  suppressedRecommendationKeys?: Iterable<string>;
}

function confidenceToSurface(
  confidence: ManagerRecommendationConfidence,
): ManagerRecommendationSurface {
  if (confidence === "high") {
    return "recommendation_card";
  }

  if (confidence === "medium") {
    return "feed_quick_action";
  }

  return "feed_passive";
}

export function buildManagerRecommendationSuppressKey(
  type: ManagerRecommendationType,
  playerId: string,
  inning: number,
  half: "top" | "bottom",
): string {
  return `${type}:${playerId}:${inning}:${half}`;
}

export function getPromptedDecisionTypeForRecommendationAction(
  action: ManagerRecommendationAction,
): PromptedManagerDecisionType | null {
  if (action === "keep_pitcher") return "leave_pitcher_in";
  if (action === "let_batter_hit") return "let_batter_hit";
  if (action === "decline_defensive_sub") return "keep_defender_in";
  return null;
}

export function buildPromptedManagerDecisionFromRecommendation(input: {
  recommendation: ManagerRecommendation;
  action: ManagerRecommendationAction;
  opponentTeamId: string;
}): PromptedManagerDecisionEvent | null {
  const decisionType = getPromptedDecisionTypeForRecommendationAction(input.action);
  if (!decisionType) return null;

  const primaryPlayerId = input.recommendation.trackedPlayerIds[0];
  if (!primaryPlayerId) return null;
  const expectedEndpoint =
    decisionType === "keep_defender_in" ? "first_fielding_event" : "next_pa";

  return {
    decisionType,
    action:
      input.action === "keep_pitcher"
        ? "keep_pitcher"
        : input.action === "decline_defensive_sub"
          ? "decline_defensive_sub"
          : "let_batter_hit",
    source: "recommendation",
    decisionSource: "situational_prompt",
    confidence: input.recommendation.confidence,
    managerId: input.recommendation.managerId,
    teamId: input.recommendation.teamId,
    opponentTeamId: input.opponentTeamId,
    trackedPlayerIds: [primaryPlayerId],
    involvedPlayerIds: input.recommendation.trackedPlayerIds,
    playerId: primaryPlayerId,
    leverageIndex: input.recommendation.leverageIndex,
    recommendationId: input.recommendation.recommendationId,
    provenanceKey: input.recommendation.suppressKey,
    resolution: {
      status: "pending",
      expectedEndpoint,
    },
  };
}

export function buildManagerRecommendationWatchEvent(input: {
  recommendation: ManagerRecommendation;
  opponentTeamId: string;
}): ManagerRecommendationWatchEvent {
  return {
    recommendationId: input.recommendation.recommendationId,
    type: input.recommendation.type,
    managerId: input.recommendation.managerId,
    teamId: input.recommendation.teamId,
    opponentTeamId: input.opponentTeamId,
    confidence: input.recommendation.confidence,
    surface: input.recommendation.surface,
    trackedPlayerIds: input.recommendation.trackedPlayerIds,
    primaryAction: input.recommendation.primaryAction,
    noChangeAction: input.recommendation.noChangeAction,
    suppressKey: input.recommendation.suppressKey,
    title: input.recommendation.title,
    rationale: input.recommendation.rationale,
    leverageIndex: input.recommendation.leverageIndex,
  };
}

function createRecommendation(
  input: ManagerRecommendationInput,
  params: Omit<
    ManagerRecommendation,
    "recommendationId" | "surface" | "inning" | "half" | "outs" | "leverageIndex"
  >,
): ManagerRecommendation {
  return {
    ...params,
    recommendationId: `${input.gameId ?? "live"}:${params.suppressKey}`,
    surface: confidenceToSurface(params.confidence),
    inning: input.inning,
    half: input.half,
    outs: input.outs,
    leverageIndex: input.leverageIndex,
  };
}

function isBenchOptionAvailable<T extends { isAvailable?: boolean }>(
  player: T,
): boolean {
  return player.isAvailable !== false;
}

function positionMatches(benchPlayer: BenchDefenderRecommendationPlayer, position?: string): boolean {
  if (!position) {
    return true;
  }

  const positions = benchPlayer.positions ?? [];
  return positions.includes(position) || positions.includes("UT");
}

function pressureFromLeverage(leverageIndex: number | undefined): GameContext["pressure"] {
  const leverage = leverageIndex ?? 1;
  if (leverage >= PRESSURE_LEVERAGE_BANDS.extreme) return "extreme";
  if (leverage >= PRESSURE_LEVERAGE_BANDS.high) return "high";
  return "none";
}

function runnerCount(input: ManagerRecommendationInput): number {
  if (typeof input.runnersOn === "number") {
    return input.runnersOn;
  }
  if (typeof input.runnersOn === "boolean") {
    return input.runnersOn ? 1 : 0;
  }
  return [
    input.bases?.first,
    input.bases?.second,
    input.bases?.third,
  ].filter(Boolean).length;
}

function hasRisp(input: ManagerRecommendationInput): boolean {
  return input.risp ?? Boolean(input.bases?.second || input.bases?.third);
}

function normalizeHand(hand: string | undefined, fallback: "L" | "R" = "R"): "L" | "R" {
  return hand === "L" || hand === "R" ? hand : fallback;
}

function normalizePitcherRole(player: RecommendationPlayerBase): PitcherRoleKey | undefined {
  const value = player.pitcherRole ?? player.role;
  if (value === "SP" || value === "SP/RP" || value === "RP" || value === "CP") {
    return value;
  }
  const position = (player.primaryPosition ?? player.position ?? "").toUpperCase();
  if (position === "SP" || position === "SP/RP" || position === "RP" || position === "CP") {
    return position;
  }
  return undefined;
}

function normalizePosition(position: string | undefined): Position | undefined {
  if (!position) return undefined;
  const normalized = position.toUpperCase();
  if (
    normalized === "C" ||
    normalized === "1B" ||
    normalized === "2B" ||
    normalized === "SS" ||
    normalized === "3B" ||
    normalized === "LF" ||
    normalized === "CF" ||
    normalized === "RF" ||
    normalized === "DH" ||
    normalized === "SP" ||
    normalized === "RP" ||
    normalized === "CP"
  ) {
    return normalized;
  }
  if (normalized === "P") return "SP";
  return undefined;
}

function toEffectiveRatingsPlayer(player: RecommendationPlayerBase): EffectiveRatingsPlayer {
  const traits = [
    ...(player.traits ?? []),
    player.trait1,
    player.trait2,
  ].filter((trait): trait is string => typeof trait === "string" && trait.trim().length > 0);

  return {
    id: player.playerId,
    name: player.playerName,
    primaryPosition: player.primaryPosition ?? player.position ?? normalizePitcherRole(player) ?? null,
    secondaryPosition: player.secondaryPosition ?? null,
    secondaryPositions: player.secondaryPositions,
    position: player.position ?? player.primaryPosition ?? null,
    role: normalizePitcherRole(player),
    bats: player.bats ?? player.battingHand,
    throws: player.throws ?? player.throwingHand,
    traits,
    trait1: player.trait1,
    trait2: player.trait2,
    power: player.power,
    contact: player.contact,
    speed: player.speed,
    fielding: player.fielding ?? player.fieldingRating,
    arm: player.arm,
    velocity: player.velocity,
    junk: player.junk,
    accuracy: player.accuracy,
  };
}

function toPlayerState(player: RecommendationPlayerBase): PlayerState {
  return {
    mojo: player.mojo ?? "Normal",
    fitness: player.fitness ?? "FIT",
    workload: {
      role: normalizePitcherRole(player),
      pitchesThrown: player.pitchCount,
    },
  };
}

function toSubCandidate(
  player: RecommendationPlayerBase,
  options: { position?: Position; enteringInRelief?: boolean } = {},
): SubCandidate {
  return {
    player: toEffectiveRatingsPlayer(player),
    state: toPlayerState(player),
    position: options.position,
    enteringInRelief: options.enteringInRelief,
  };
}

function buildGameContext(input: ManagerRecommendationInput, params: {
  type: "pinch_hit" | "defensive_replacement" | "pitcher_change";
  opposingPlayer?: RecommendationPlayerBase;
  opposingHand?: "L" | "R";
  batterHand?: "L" | "R" | "S";
  pitcherHand?: "L" | "R";
  playingPosition?: Position;
}): GameContext {
  const runners = runnerCount(input);
  return {
    count: input.count,
    pressure: pressureFromLeverage(input.leverageIndex),
    runnersOn: runners,
    risp: hasRisp(input),
    opposingHand:
      params.opposingHand ??
      input.opposingHand ??
      normalizeHand(params.opposingPlayer?.battingHand ?? params.opposingPlayer?.bats ?? params.opposingPlayer?.throws),
    opposingPlayer: params.opposingPlayer
      ? toEffectiveRatingsPlayer(params.opposingPlayer)
      : undefined,
    inning: input.inning,
    gameLengthInnings: input.totalInnings ?? 9,
    isSubstitutionAB: params.type === "pinch_hit" ? true : input.isSubstitutionAB,
    basesEmpty: runners === 0,
    batterHand: params.batterHand,
    pitcherHand: params.pitcherHand,
    playingPosition: params.playingPosition,
  };
}

function bestCandidateName(result: SubRecommendation): string {
  return result.rankedCandidates.find(
    (candidate) => candidate.candidateId === result.bestCandidateId,
  )?.candidateName ?? "the replacement";
}

function formatDelta(delta: number | undefined): string {
  return `$${Math.round(delta ?? 0).toLocaleString()}`;
}

function trackedPlayers(currentId: string, bestCandidateId: string | undefined): string[] {
  return [currentId, bestCandidateId].filter((id): id is string => Boolean(id));
}

function resultConfidence(result: SubRecommendation): ManagerRecommendationConfidence {
  return result.confidence ?? "low";
}

function addIfUnique(
  recommendations: ManagerRecommendation[],
  recommendation: ManagerRecommendation | null,
): void {
  if (!recommendation) {
    return;
  }

  if (
    recommendations.some(
      (existing) => existing.suppressKey === recommendation.suppressKey,
    )
  ) {
    return;
  }

  recommendations.push(recommendation);
}

function getPitchingRecommendation(
  input: ManagerRecommendationInput,
): ManagerRecommendation | null {
  const pitcher = input.currentPitcher;
  const availablePitchers = (input.availablePitchers ?? []).filter(
    (candidate) => candidate.playerId !== pitcher?.playerId,
  );
  if (!pitcher || availablePitchers.length === 0) {
    return null;
  }

  const batter = input.opposingBatter ?? input.currentBatter;
  const result = recommendSubs({
    type: "pitcher_change",
    current: toSubCandidate(pitcher),
    candidates: availablePitchers.map((candidate) =>
      toSubCandidate(candidate, { enteringInRelief: true }),
    ),
    ctx: buildGameContext(input, {
      type: "pitcher_change",
      opposingPlayer: batter,
      opposingHand: normalizeHand(batter?.battingHand ?? batter?.bats),
      batterHand: batter?.battingHand ?? batter?.bats,
      pitcherHand: normalizeHand(pitcher.throws ?? pitcher.throwingHand),
    }),
  });

  if (!result.recommend || !result.bestCandidateId) {
    return null;
  }

  const suppressKey = buildManagerRecommendationSuppressKey(
    "consider_pitching_change",
    result.bestCandidateId,
    input.inning,
    input.half,
  );
  const replacementName = bestCandidateName(result);

  return createRecommendation(input, {
    type: "consider_pitching_change",
    managerId: input.defensiveManagerId,
    teamId: input.fieldingTeamId,
    confidence: resultConfidence(result),
    trackedPlayerIds: trackedPlayers(pitcher.playerId, result.bestCandidateId),
    title: `Check on ${pitcher.playerName}`,
    rationale: `${replacementName} grades as the best fresh-arm upgrade (${formatDelta(result.bestDelta)} IV delta). ${result.justification ?? "Pure IV-delta clears the pitcher-change threshold."}`,
    primaryAction: "open_pitching_change",
    noChangeAction: "keep_pitcher",
    suppressKey,
  });
}

function getPinchHitterRecommendation(
  input: ManagerRecommendationInput,
): ManagerRecommendation | null {
  const batter = input.currentBatter;
  const benchHitters = (input.benchHitters ?? []).filter(isBenchOptionAvailable);
  if (!batter || benchHitters.length === 0) {
    return null;
  }

  const pitcher = input.opposingPitcher ?? input.currentPitcher;
  const result = recommendSubs({
    type: "pinch_hit",
    current: toSubCandidate(batter),
    candidates: benchHitters.map((candidate) => toSubCandidate(candidate)),
    ctx: buildGameContext(input, {
      type: "pinch_hit",
      opposingPlayer: pitcher,
      opposingHand: normalizeHand(pitcher?.throws ?? pitcher?.throwingHand),
      batterHand: batter.battingHand ?? batter.bats,
      pitcherHand: normalizeHand(pitcher?.throws ?? pitcher?.throwingHand),
    }),
  });

  if (!result.recommend || !result.bestCandidateId) {
    return null;
  }

  const replacementName = bestCandidateName(result);

  const suppressKey = buildManagerRecommendationSuppressKey(
    "consider_pinch_hitter",
    result.bestCandidateId,
    input.inning,
    input.half,
  );

  return createRecommendation(input, {
    type: "consider_pinch_hitter",
    managerId: input.offensiveManagerId,
    teamId: input.battingTeamId,
    confidence: resultConfidence(result),
    trackedPlayerIds: trackedPlayers(batter.playerId, result.bestCandidateId),
    title: `Pinch-hit spot for ${batter.playerName}`,
    rationale: `${replacementName} grades as the best bench-bat upgrade (${formatDelta(result.bestDelta)} IV delta). ${result.justification ?? "Pure IV-delta clears the pinch-hit threshold."}`,
    primaryAction: "open_pinch_hit",
    noChangeAction: "let_batter_hit",
    suppressKey,
  });
}

function getDefensiveReplacementRecommendation(
  input: ManagerRecommendationInput,
): ManagerRecommendation | null {
  const defenders = input.defenders ?? [];
  const benchDefenders = (input.benchDefenders ?? []).filter(
    isBenchOptionAvailable,
  );
  if (defenders.length === 0 || benchDefenders.length === 0) {
    return null;
  }

  const evaluated = defenders.flatMap((defender) => {
    const position = normalizePosition(defender.position);
    const candidates = benchDefenders
      .filter((candidate) => positionMatches(candidate, defender.position))
      .map((candidate) => toSubCandidate(candidate, { position }));
    if (!position || candidates.length === 0) return [];

    const result = recommendSubs({
      type: "defensive_replacement",
      current: toSubCandidate(defender, { position }),
      candidates,
      ctx: buildGameContext(input, {
        type: "defensive_replacement",
        opposingPlayer: input.opposingBatter ?? input.currentBatter,
        opposingHand: normalizeHand(input.opposingBatter?.battingHand ?? input.currentBatter?.battingHand),
        playingPosition: position,
      }),
    });

    return result.recommend && result.bestCandidateId
      ? [{ defender, position, result, bestCandidateId: result.bestCandidateId }]
      : [];
  }).sort((left, right) => (right.result.bestDelta ?? 0) - (left.result.bestDelta ?? 0));

  const bestCandidate = evaluated[0];
  if (!bestCandidate) {
    return null;
  }

  const suppressKey = buildManagerRecommendationSuppressKey(
    "consider_defensive_replacement",
    bestCandidate.bestCandidateId,
    input.inning,
    input.half,
  );
  const replacementName = bestCandidateName(bestCandidate.result);

  return createRecommendation(input, {
    type: "consider_defensive_replacement",
    managerId: input.defensiveManagerId,
    teamId: input.fieldingTeamId,
    confidence: resultConfidence(bestCandidate.result),
    trackedPlayerIds: [
      bestCandidate.defender.playerId,
      bestCandidate.bestCandidateId,
    ],
    title: `Defensive look at ${bestCandidate.defender.position ?? "the field"}`,
    rationale: `${replacementName} grades as the best defensive upgrade at ${bestCandidate.position} (${formatDelta(bestCandidate.result.bestDelta)} IV delta). ${bestCandidate.result.justification ?? "Pure IV-delta clears the defensive-replacement threshold."}`,
    primaryAction: "open_defensive_sub",
    noChangeAction: "decline_defensive_sub",
    suppressKey,
  });
}

export function generateManagerRecommendations(
  input: ManagerRecommendationInput,
): ManagerRecommendation[] {
  const suppressed = new Set(input.suppressedRecommendationKeys ?? []);
  const recommendations: ManagerRecommendation[] = [];

  addIfUnique(recommendations, getPitchingRecommendation(input));
  addIfUnique(recommendations, getPinchHitterRecommendation(input));
  addIfUnique(recommendations, getDefensiveReplacementRecommendation(input));

  return recommendations.filter(
    (recommendation) => !suppressed.has(recommendation.suppressKey),
  );
}
