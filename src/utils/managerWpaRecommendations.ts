import { getManagerDecisionStandards } from "./managerWpaDerivation";
import type {
  PromptedManagerDecisionEvent,
  PromptedManagerDecisionType,
} from "./eventLog";

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
}

export interface PitchingRecommendationPlayer extends RecommendationPlayerBase {
  pitchCount?: number;
  isStarter?: boolean;
  runsAllowedInInning?: number;
  consecutiveBaserunners?: number;
  consecutiveWalks?: number;
}

export interface HitterRecommendationPlayer extends RecommendationPlayerBase {
  battingOrder?: number;
  contact?: number;
  power?: number;
  battingHand?: "L" | "R" | "S";
  isAvailable?: boolean;
}

export interface DefenderRecommendationPlayer extends RecommendationPlayerBase {
  position?: string;
  fieldingErrors?: number;
  fieldingRating?: number;
  arm?: number;
  isAvailable?: boolean;
}

export interface BenchDefenderRecommendationPlayer
  extends RecommendationPlayerBase {
  positions?: string[];
  fieldingRating?: number;
  arm?: number;
  isAvailable?: boolean;
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
  currentPitcher?: PitchingRecommendationPlayer;
  availablePitchers?: RecommendationPlayerBase[];
  currentBatter?: HitterRecommendationPlayer;
  benchHitters?: HitterRecommendationPlayer[];
  defenders?: DefenderRecommendationPlayer[];
  benchDefenders?: BenchDefenderRecommendationPlayer[];
  suppressedRecommendationKeys?: Iterable<string>;
}

const DEFAULT_RATING = 50;

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

function playerKey(playerId: string | undefined, playerName: string | undefined) {
  return playerId || playerName || "unknown";
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

  return {
    decisionType,
    action: input.action === "keep_pitcher" ? "keep_pitcher" : "let_batter_hit",
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
      expectedEndpoint: "next_pa",
    },
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

function batterScore(player: HitterRecommendationPlayer): number {
  return (player.contact ?? DEFAULT_RATING) * 0.6 + (player.power ?? DEFAULT_RATING) * 0.4;
}

function defenderScore(
  player: DefenderRecommendationPlayer | BenchDefenderRecommendationPlayer,
): number {
  return (player.fieldingRating ?? DEFAULT_RATING) + (player.arm ?? DEFAULT_RATING) * 0.2;
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

  const standards = getManagerDecisionStandards(input.totalInnings ?? 9);
  const leverage = input.leverageIndex ?? 1;
  const pitchCount = pitcher.pitchCount ?? 0;
  const fatigueWatch = pitcher.isStarter
    ? standards.starterFatigueWatchPitches
    : standards.relieverFatigueWatchPitches;
  const fatigueUrgent = pitcher.isStarter
    ? standards.starterFatigueUrgentPitches
    : standards.relieverFatigueUrgentPitches;
  const hasRunStress =
    (pitcher.runsAllowedInInning ?? 0) >= standards.runsAllowedInInningWatch;
  const hasTrafficStress =
    (pitcher.consecutiveBaserunners ?? 0) >=
    standards.consecutiveBaserunnersWatch;
  const hasWalkStress =
    (pitcher.consecutiveWalks ?? 0) >= standards.consecutiveWalksWatch;
  const isLate = input.inning >= standards.lateInningStart;
  const isCriticalLeverage = leverage >= standards.criticalLeverageIndex;
  const isLateLeverage = leverage >= standards.lateLeverageIndex;
  const isUrgent = pitchCount >= fatigueUrgent || hasRunStress || hasWalkStress;
  const isWatch = pitchCount >= fatigueWatch || hasTrafficStress;

  let confidence: ManagerRecommendationConfidence | null = null;
  if (isCriticalLeverage && isUrgent) {
    confidence = "high";
  } else if ((isLate || isLateLeverage) && (isWatch || isUrgent)) {
    confidence = "medium";
  } else if ((isWatch || isUrgent) && leverage >= 1) {
    confidence = "low";
  }

  if (!confidence) {
    return null;
  }

  const suppressKey = buildManagerRecommendationSuppressKey(
    "consider_pitching_change",
    playerKey(pitcher.playerId, pitcher.playerName),
    input.inning,
    input.half,
  );
  const stressLabels = [
    pitchCount >= fatigueWatch ? `${pitchCount} pitches` : null,
    hasRunStress ? "runs mounting" : null,
    hasTrafficStress ? "traffic building" : null,
    hasWalkStress ? "walks piling up" : null,
  ].filter(Boolean);

  return createRecommendation(input, {
    type: "consider_pitching_change",
    managerId: input.defensiveManagerId,
    teamId: input.fieldingTeamId,
    confidence,
    trackedPlayerIds: [pitcher.playerId],
    title: `Check on ${pitcher.playerName}`,
    rationale:
      stressLabels.length > 0
        ? `${stressLabels.join(", ")} with leverage at ${leverage.toFixed(1)}.`
        : `Leverage is ${leverage.toFixed(1)} and a fresh arm is available.`,
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

  const battingOrder = batter.battingOrder ?? 0;
  if (battingOrder < 7 || battingOrder > 9) {
    return null;
  }

  const standards = getManagerDecisionStandards(input.totalInnings ?? 9);
  const leverage = input.leverageIndex ?? 1;
  if (leverage < standards.lateLeverageIndex) {
    return null;
  }

  const currentScore = batterScore(batter);
  const bestBenchHitter = benchHitters
    .slice()
    .sort((left, right) => batterScore(right) - batterScore(left))[0];
  const improvement = batterScore(bestBenchHitter) - currentScore;

  let confidence: ManagerRecommendationConfidence | null = null;
  if (leverage >= standards.criticalLeverageIndex && improvement >= 12) {
    confidence = "high";
  } else if (improvement >= 8) {
    confidence = "medium";
  } else if (improvement > 0) {
    confidence = "low";
  }

  if (!confidence) {
    return null;
  }

  const suppressKey = buildManagerRecommendationSuppressKey(
    "consider_pinch_hitter",
    playerKey(batter.playerId, batter.playerName),
    input.inning,
    input.half,
  );

  return createRecommendation(input, {
    type: "consider_pinch_hitter",
    managerId: input.offensiveManagerId,
    teamId: input.battingTeamId,
    confidence,
    trackedPlayerIds: [batter.playerId, bestBenchHitter.playerId],
    title: `Pinch-hit spot for ${batter.playerName}`,
    rationale: `${bestBenchHitter.playerName} grades as a stronger bat in a ${leverage.toFixed(1)} LI spot.`,
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

  const standards = getManagerDecisionStandards(input.totalInnings ?? 9);
  const isLateLead =
    input.inning >= standards.finalPhaseStart &&
    typeof input.scoreDifferentialForFieldingTeam === "number" &&
    input.scoreDifferentialForFieldingTeam > 0 &&
    input.scoreDifferentialForFieldingTeam <= 3;

  const candidates = defenders.flatMap((defender) => {
    const repeatedErrors = (defender.fieldingErrors ?? 0) >= 2;
    if (!repeatedErrors && !isLateLead) {
      return [];
    }

    const benchDefender = benchDefenders
      .filter((candidate) => positionMatches(candidate, defender.position))
      .sort((left, right) => defenderScore(right) - defenderScore(left))[0];
    if (!benchDefender) {
      return [];
    }

    return [
      {
        defender,
        benchDefender,
        improvement: defenderScore(benchDefender) - defenderScore(defender),
        repeatedErrors,
      },
    ];
  });

  const bestCandidate = candidates.sort(
    (left, right) => right.improvement - left.improvement,
  )[0];

  if (!bestCandidate) {
    return null;
  }

  let confidence: ManagerRecommendationConfidence | null = null;
  if (
    (bestCandidate.repeatedErrors && bestCandidate.improvement >= 10) ||
    (isLateLead && bestCandidate.improvement >= 15)
  ) {
    confidence = "high";
  } else if (
    bestCandidate.repeatedErrors ||
    (isLateLead && bestCandidate.improvement >= 8)
  ) {
    confidence = "medium";
  } else if (isLateLead && bestCandidate.improvement > 0) {
    confidence = "low";
  }

  if (!confidence) {
    return null;
  }

  const suppressKey = buildManagerRecommendationSuppressKey(
    "consider_defensive_replacement",
    playerKey(bestCandidate.defender.playerId, bestCandidate.defender.playerName),
    input.inning,
    input.half,
  );
  const reason = bestCandidate.repeatedErrors
    ? `${bestCandidate.defender.playerName} has multiple errors.`
    : `Protecting a ${input.scoreDifferentialForFieldingTeam}-run lead late.`;

  return createRecommendation(input, {
    type: "consider_defensive_replacement",
    managerId: input.defensiveManagerId,
    teamId: input.fieldingTeamId,
    confidence,
    trackedPlayerIds: [
      bestCandidate.defender.playerId,
      bestCandidate.benchDefender.playerId,
    ],
    title: `Defensive look at ${bestCandidate.defender.position ?? "the field"}`,
    rationale: `${reason} ${bestCandidate.benchDefender.playerName} is the cleaner glove.`,
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
