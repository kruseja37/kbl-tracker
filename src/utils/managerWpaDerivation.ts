import { calculateWPA } from "../engines/wpaCalculator";
import { WPA_MODEL_VERSION } from "../engines/wpaV2";
import type {
  AtBatEvent,
  BetweenPlayEvent,
  FieldingEvent,
  RunnerState,
} from "./eventLog";
import type {
  IntentionalWalkConsequenceStatus,
  ManagerAssignment,
  ManagerDecisionConfidence,
  ManagerDecisionExplanationMetadata,
  ManagerDecisionHorizon,
  ManagerDecisionRecord,
  ManagerDecisionResolutionEndpoint,
  ManagerDecisionResolutionWindow,
  ManagerDecisionSource,
  ManagerDecisionStandards,
  ManagerDecisionType,
  ManagerInferenceMethod,
  ManagerRecommendationProvenanceMetadata,
  ManagerRecommendationWatchEvent,
  ManagerRecommendationWatchRecord,
  ManagerRecommendationWatchResolutionStatus,
  ManagerRecommendationWatchType,
  ManagerOutAdvancingSendExplanationMetadata,
  ManagerOutAdvancingSendUnscoredReason,
} from "../types/managerWpa";
import {
  DECISION_HORIZON_BY_DECISION_TYPE,
  MANAGER_DECISION_LABELS,
  MANAGER_WPA_SHARE_BY_DECISION_TYPE,
  RESOLUTION_ENDPOINT_BY_DECISION_TYPE,
} from "./managerDecisionRegistry";

export { MANAGER_WPA_SHARE_BY_DECISION_TYPE } from "./managerDecisionRegistry";

export interface ManagerAssignmentResolutionInput {
  awayTeamId: string;
  homeTeamId: string;
  awayManagerId?: string;
  homeManagerId?: string;
  managerByTeamId?: Record<string, string | undefined>;
  managerAssignments?: ManagerAssignment[];
  mode?: ManagerAssignment["mode"];
  instanceId?: string;
}

export interface HalfInningManagerContext {
  offensiveTeamId: string;
  defensiveTeamId: string;
  offensiveManagerId: string;
  defensiveManagerId: string;
}

export interface DeriveManagerDecisionRecordsInput
  extends ManagerAssignmentResolutionInput {
  gameId?: string;
  atBatEvents: AtBatEvent[];
  betweenPlayEvents?: BetweenPlayEvent[];
  fieldingEvents?: FieldingEvent[];
  totalInnings?: number;
  useGhostRunner?: boolean;
  extraInningRunner?: boolean;
  extraInningRunnerDelay?: 1 | 2;
  gameEnded?: boolean;
}

interface ExtraInningRunnerPolicy {
  useGhostRunner?: boolean;
  extraInningRunner?: boolean;
  extraInningRunnerDelay?: 1 | 2;
}

interface DecisionWindow {
  teamWinProbabilityBefore: number;
  teamWinProbabilityAfter?: number;
  rawWindowWpa?: number;
  managerWpa?: number;
}

interface BuildDecisionInput {
  gameId: string;
  decisionEventId: string;
  linkedEventIds: string[];
  managerId: string;
  teamId: string;
  opponentTeamId: string;
  decisionType: ManagerDecisionType;
  inferenceMethod: ManagerInferenceMethod;
  decisionSource: ManagerDecisionSource;
  confidence: ManagerDecisionConfidence;
  inning: number;
  halfInning: "TOP" | "BOTTOM";
  outs: number;
  baseState: string;
  scoreDifferentialForTeam: number;
  leverageIndex?: number;
  involvedPlayerIds: string[];
  window: DecisionWindow;
  resolved: boolean;
  resolvedAtEventId?: string;
  resolutionWindow: ManagerDecisionResolutionWindow;
  explanationMetadata?: ManagerDecisionExplanationMetadata;
  derivedFromFields: string[];
  decisionKeySuffix?: string;
  manuallyPinned?: boolean;
}

const STANDARD_TABLE: Record<
  5 | 6 | 7 | 9,
  Omit<ManagerDecisionStandards, "scheduledInnings">
> = {
  9: {
    lateInningStart: 7,
    finalPhaseStart: 8,
    criticalLeverageIndex: 2,
    lateLeverageIndex: 1.5,
    starterFatigueWatchPitches: 90,
    starterFatigueUrgentPitches: 105,
    relieverFatigueWatchPitches: 35,
    relieverFatigueUrgentPitches: 45,
    runsAllowedInInningWatch: 3,
    consecutiveBaserunnersWatch: 3,
    consecutiveWalksWatch: 2,
  },
  7: {
    lateInningStart: 5,
    finalPhaseStart: 6,
    criticalLeverageIndex: 2,
    lateLeverageIndex: 1.5,
    starterFatigueWatchPitches: 75,
    starterFatigueUrgentPitches: 90,
    relieverFatigueWatchPitches: 30,
    relieverFatigueUrgentPitches: 40,
    runsAllowedInInningWatch: 3,
    consecutiveBaserunnersWatch: 3,
    consecutiveWalksWatch: 2,
  },
  6: {
    lateInningStart: 5,
    finalPhaseStart: 5,
    criticalLeverageIndex: 2,
    lateLeverageIndex: 1.4,
    starterFatigueWatchPitches: 65,
    starterFatigueUrgentPitches: 80,
    relieverFatigueWatchPitches: 25,
    relieverFatigueUrgentPitches: 35,
    runsAllowedInInningWatch: 2,
    consecutiveBaserunnersWatch: 3,
    consecutiveWalksWatch: 2,
  },
  5: {
    lateInningStart: 4,
    finalPhaseStart: 4,
    criticalLeverageIndex: 2,
    lateLeverageIndex: 1.4,
    starterFatigueWatchPitches: 55,
    starterFatigueUrgentPitches: 70,
    relieverFatigueWatchPitches: 20,
    relieverFatigueUrgentPitches: 30,
    runsAllowedInInningWatch: 2,
    consecutiveBaserunnersWatch: 3,
    consecutiveWalksWatch: 2,
  },
};

export function getManagerDecisionStandards(
  scheduledInnings: number = 9,
): ManagerDecisionStandards {
  if (
    scheduledInnings === 5 ||
    scheduledInnings === 6 ||
    scheduledInnings === 7 ||
    scheduledInnings === 9
  ) {
    return {
      scheduledInnings,
      ...STANDARD_TABLE[scheduledInnings],
    };
  }

  return {
    scheduledInnings,
    lateInningStart: Math.floor((scheduledInnings * 2) / 3) + 1,
    finalPhaseStart: Math.ceil(scheduledInnings * 0.8),
    criticalLeverageIndex: 2,
    lateLeverageIndex: scheduledInnings <= 6 ? 1.4 : 1.5,
    starterFatigueWatchPitches: 75,
    starterFatigueUrgentPitches: 90,
    relieverFatigueWatchPitches: 30,
    relieverFatigueUrgentPitches: 40,
    runsAllowedInInningWatch: scheduledInnings <= 6 ? 2 : 3,
    consecutiveBaserunnersWatch: 3,
    consecutiveWalksWatch: 2,
  };
}

export function getDefaultManagerIdForTeam(teamId: string): string {
  return `${teamId}-manager`;
}

export function getManagerForTeam(
  teamId: string,
  input: Omit<ManagerAssignmentResolutionInput, "awayTeamId" | "homeTeamId"> = {},
): string {
  const direct = input.managerByTeamId?.[teamId];
  if (direct) return direct;

  const assigned = input.managerAssignments?.find((assignment) => {
    if (assignment.teamId !== teamId) return false;
    if (assignment.fired || assignment.endDate) return false;
    if (input.mode && assignment.mode !== input.mode) return false;
    if (input.instanceId && assignment.instanceId !== input.instanceId) {
      return false;
    }
    return true;
  });
  if (assigned) return assigned.managerId;

  return getDefaultManagerIdForTeam(teamId);
}

export function getHalfInningManagerContext(
  halfInning: "TOP" | "BOTTOM",
  input: ManagerAssignmentResolutionInput,
): HalfInningManagerContext {
  const isTop = halfInning === "TOP";
  const offensiveTeamId = isTop ? input.awayTeamId : input.homeTeamId;
  const defensiveTeamId = isTop ? input.homeTeamId : input.awayTeamId;
  const managerInput = {
    managerByTeamId: {
      ...(input.managerByTeamId ?? {}),
      [input.awayTeamId]:
        input.managerByTeamId?.[input.awayTeamId] ?? input.awayManagerId,
      [input.homeTeamId]:
        input.managerByTeamId?.[input.homeTeamId] ?? input.homeManagerId,
    },
    managerAssignments: input.managerAssignments,
    mode: input.mode,
    instanceId: input.instanceId,
  };

  return {
    offensiveTeamId,
    defensiveTeamId,
    offensiveManagerId: getManagerForTeam(offensiveTeamId, managerInput),
    defensiveManagerId: getManagerForTeam(defensiveTeamId, managerInput),
  };
}

export function resolveManagerAttributionForDecision(
  decisionType: ManagerDecisionType,
  halfInning: "TOP" | "BOTTOM",
  input: ManagerAssignmentResolutionInput,
): {
  managerId: string;
  teamId: string;
  opponentTeamId: string;
  teamRole: "offense" | "defense";
} {
  const context = getHalfInningManagerContext(halfInning, input);
  if (isDefensiveManagerDecision(decisionType)) {
    return {
      managerId: context.defensiveManagerId,
      teamId: context.defensiveTeamId,
      opponentTeamId: context.offensiveTeamId,
      teamRole: "defense",
    };
  }

  return {
    managerId: context.offensiveManagerId,
    teamId: context.offensiveTeamId,
    opponentTeamId: context.defensiveTeamId,
    teamRole: "offense",
  };
}

export function deriveManagerDecisionRecords(
  input: DeriveManagerDecisionRecordsInput,
): ManagerDecisionRecord[] {
  const gameId =
    input.gameId ??
    input.atBatEvents[0]?.gameId ??
    input.betweenPlayEvents?.[0]?.gameId;
  if (!gameId) return [];

  const atBatEvents = [...input.atBatEvents]
    .filter((event) => !event.undoneAt)
    .sort((left, right) => left.eventIndex - right.eventIndex);
  const betweenPlayEvents = [...(input.betweenPlayEvents ?? [])]
    .filter((event) => !event.undoneAt)
    .sort((left, right) => left.eventIndex - right.eventIndex);
  const managerBetweenPlayEvents =
    dedupePromptedManagerDecisionEvents(betweenPlayEvents);
  const fieldingEvents = [...(input.fieldingEvents ?? [])].sort(
    (left, right) =>
      left.atBatEventId.localeCompare(right.atBatEventId) ||
      left.sequence - right.sequence ||
      left.fieldingEventId.localeCompare(right.fieldingEventId),
  );

  const baseDecisions = [
    ...atBatEvents.flatMap((event) =>
      deriveAtBatManagerDecisions(event, input, gameId),
    ),
    ...managerBetweenPlayEvents.flatMap((event) =>
      deriveBetweenPlayManagerDecisions(event, input, gameId),
    ),
  ];
  const recommendationWatchResolution = resolveRecommendationWatches({
    input,
    gameId,
    atBatEvents,
    betweenPlayEvents,
    fieldingEvents,
    baseDecisions,
  });
  const decisions = [
    ...recommendationWatchResolution.decisions,
    ...recommendationWatchResolution.inferredNoChangeDecisions,
  ];
  if (decisions.length === 0) {
    return [];
  }

  const resolvedDecisions = resolveManagerDecisionWindows(decisions, {
    atBatEvents,
    betweenPlayEvents,
    fieldingEvents,
    homeTeamId: input.homeTeamId,
    totalInnings: input.totalInnings,
    useGhostRunner: input.useGhostRunner,
    extraInningRunner: input.extraInningRunner,
    extraInningRunnerDelay: input.extraInningRunnerDelay,
    gameEnded: input.gameEnded ?? false,
  });

  return resolvedDecisions.sort(
    (left, right) =>
      firstLinkedEventIndex(left, atBatEvents, betweenPlayEvents) -
        firstLinkedEventIndex(right, atBatEvents, betweenPlayEvents) ||
      left.decisionId.localeCompare(right.decisionId),
  );
}

export const deriveManagerDecisionsFromEventLog =
  deriveManagerDecisionRecords;

export function deriveManagerRecommendationWatchRecords(
  input: DeriveManagerDecisionRecordsInput,
): ManagerRecommendationWatchRecord[] {
  const gameId =
    input.gameId ??
    input.atBatEvents[0]?.gameId ??
    input.betweenPlayEvents?.[0]?.gameId;
  if (!gameId) return [];

  const atBatEvents = [...input.atBatEvents]
    .filter((event) => !event.undoneAt)
    .sort((left, right) => left.eventIndex - right.eventIndex);
  const betweenPlayEvents = [...(input.betweenPlayEvents ?? [])]
    .filter((event) => !event.undoneAt)
    .sort((left, right) => left.eventIndex - right.eventIndex);
  const managerBetweenPlayEvents =
    dedupePromptedManagerDecisionEvents(betweenPlayEvents);
  const fieldingEvents = [...(input.fieldingEvents ?? [])].sort(
    (left, right) =>
      left.atBatEventId.localeCompare(right.atBatEventId) ||
      left.sequence - right.sequence ||
      left.fieldingEventId.localeCompare(right.fieldingEventId),
  );
  const baseDecisions = [
    ...atBatEvents.flatMap((event) =>
      deriveAtBatManagerDecisions(event, input, gameId),
    ),
    ...managerBetweenPlayEvents.flatMap((event) =>
      deriveBetweenPlayManagerDecisions(event, input, gameId),
    ),
  ];

  return resolveRecommendationWatches({
    input,
    gameId,
    atBatEvents,
    betweenPlayEvents,
    fieldingEvents,
    baseDecisions,
  }).watches;
}

interface RecommendationWatchResolutionInput {
  input: DeriveManagerDecisionRecordsInput;
  gameId: string;
  atBatEvents: AtBatEvent[];
  betweenPlayEvents: BetweenPlayEvent[];
  fieldingEvents: FieldingEvent[];
  baseDecisions: ManagerDecisionRecord[];
}

interface RecommendationWatchResolutionResult {
  watches: ManagerRecommendationWatchRecord[];
  decisions: ManagerDecisionRecord[];
  inferredNoChangeDecisions: ManagerDecisionRecord[];
}

interface WatchActionResolution {
  status: Extract<
    ManagerRecommendationWatchResolutionStatus,
    "action_taken" | "action_taken_alternative"
  >;
  actualPlayerId?: string;
  alternativePlayerId?: string;
}

interface WatchResolution {
  status: Exclude<ManagerRecommendationWatchResolutionStatus, "pending">;
  resolvedAtEventId: string;
  resolutionDecisionType: ManagerDecisionType;
  decision?: ManagerDecisionRecord;
  actualPlayerId?: string;
  alternativePlayerId?: string;
}

type RecommendationWatchTimelineEntry =
  | {
      kind: "between_play";
      eventId: string;
      eventIndex: number;
      betweenPlay: BetweenPlayEvent;
    }
  | {
      kind: "at_bat";
      eventId: string;
      eventIndex: number;
      atBat: AtBatEvent;
    };

function resolveRecommendationWatches(
  params: RecommendationWatchResolutionInput,
): RecommendationWatchResolutionResult {
  const watchEvents = getRecommendationWatchEvents(params.betweenPlayEvents);
  if (watchEvents.length === 0) {
    return {
      watches: [],
      decisions: params.baseDecisions,
      inferredNoChangeDecisions: [],
    };
  }

  const watchRecords = watchEvents.map(({ event, watch }) =>
    createRecommendationWatchRecord(event, watch, params.gameId),
  );
  const eventById = new Map(
    params.betweenPlayEvents.map((event) => [event.eventId, event] as const),
  );
  const decisionsByEventId = groupDecisionsByEventId(params.baseDecisions);
  const fieldingEventsByAtBat = groupFieldingEventsByAtBat(params.fieldingEvents);
  const timeline = buildRecommendationWatchTimeline(params);
  const nextWatches = [...watchRecords];
  const provenanceByDecisionId = new Map<
    string,
    {
      watch: ManagerRecommendationWatchRecord;
      resolution: WatchResolution;
    }
  >();
  const inferredNoChangeDecisions: ManagerDecisionRecord[] = [];

  for (const watch of nextWatches) {
    const resolution = findEarliestWatchResolution({
      watch,
      decisionsByEventId,
      fieldingEventsByAtBat,
      timeline,
    });
    if (!resolution) continue;

    let resolvedDecisionId = resolution.decision?.decisionId;
    if (resolution.status === "inferred_no_change") {
      const decisionType = noChangeDecisionTypeForRecommendation(watch.type);
      const sourceEvent = eventById.get(watch.sourceEventId);
      if (!decisionType || !sourceEvent) continue;

      const inferredDecision = buildInferredNoChangeDecisionFromWatch({
        input: params.input,
        gameId: params.gameId,
        watch,
        sourceEvent,
        decisionType,
      });
      inferredNoChangeDecisions.push(inferredDecision);
      resolvedDecisionId = inferredDecision.decisionId;
    } else if (
      resolution.decision &&
      !provenanceByDecisionId.has(resolution.decision.decisionId)
    ) {
      provenanceByDecisionId.set(resolution.decision.decisionId, {
        watch,
        resolution,
      });
    }

    updateWatchResolution(nextWatches, watch.watchId, {
      status: resolution.status,
      resolvedAtEventId: resolution.resolvedAtEventId,
      resolvedDecisionId,
      resolutionDecisionType: resolution.resolutionDecisionType,
      actualPlayerId: resolution.actualPlayerId,
      alternativePlayerId: resolution.alternativePlayerId,
    });
  }

  const decoratedDecisions = params.baseDecisions.map((decision) => {
    const provenance = provenanceByDecisionId.get(decision.decisionId);
    if (!provenance) return decision;

    return attachRecommendationProvenance(
      decision,
      provenance.watch,
      provenance.resolution.status,
      {
        actualPlayerId: provenance.resolution.actualPlayerId,
        alternativePlayerId: provenance.resolution.alternativePlayerId,
      },
    );
  });

  return {
    watches: nextWatches,
    decisions: decoratedDecisions,
    inferredNoChangeDecisions,
  };
}

function getRecommendationWatchEvents(
  betweenPlayEvents: BetweenPlayEvent[],
): Array<{ event: BetweenPlayEvent; watch: ManagerRecommendationWatchEvent }> {
  const seen = new Set<string>();
  return betweenPlayEvents.flatMap((event) => {
    const watch = event.managerRecommendationWatch;
    if (event.type !== "manager_recommendation" || !watch || !event.gameState) {
      return [];
    }

    const key = [
      watch.recommendationId,
      watch.suppressKey,
      promptedManagerDecisionSnapshotKey(event),
    ].join(":");
    if (seen.has(key)) return [];
    seen.add(key);
    return [{ event, watch }];
  });
}

function createRecommendationWatchRecord(
  event: BetweenPlayEvent,
  watch: ManagerRecommendationWatchEvent,
  gameId: string,
): ManagerRecommendationWatchRecord {
  const gameState = event.gameState!;
  const targetPlayerId = watch.trackedPlayerIds[0];
  const suggestedPlayerId = watch.trackedPlayerIds[1];
  return {
    ...watch,
    watchId: `${gameId}:${event.eventId}:watch:${watch.recommendationId}`,
    gameId,
    sourceEventId: event.eventId,
    openedAtEventIndex: event.eventIndex,
    inning: gameState.inning,
    half: gameState.halfInning === "TOP" ? "top" : "bottom",
    outs: gameState.outs,
    targetPlayerId,
    suggestedPlayerId,
    status: "pending",
    linkedEventIds: [event.eventId],
  };
}

function groupDecisionsByEventId(
  decisions: ManagerDecisionRecord[],
): Map<string, ManagerDecisionRecord[]> {
  const grouped = new Map<string, ManagerDecisionRecord[]>();
  for (const decision of decisions) {
    if (!decision.decisionEventId) continue;
    const decisionsForEvent = grouped.get(decision.decisionEventId) ?? [];
    decisionsForEvent.push(decision);
    grouped.set(decision.decisionEventId, decisionsForEvent);
  }
  return grouped;
}

function groupFieldingEventsByAtBat(
  fieldingEvents: FieldingEvent[],
): Map<string, FieldingEvent[]> {
  const grouped = new Map<string, FieldingEvent[]>();
  for (const event of fieldingEvents) {
    const eventsForAtBat = grouped.get(event.atBatEventId) ?? [];
    eventsForAtBat.push(event);
    grouped.set(event.atBatEventId, eventsForAtBat);
  }

  for (const events of grouped.values()) {
    events.sort(
      (left, right) =>
        left.sequence - right.sequence ||
        left.fieldingEventId.localeCompare(right.fieldingEventId),
    );
  }

  return grouped;
}

function buildRecommendationWatchTimeline(
  params: RecommendationWatchResolutionInput,
): RecommendationWatchTimelineEntry[] {
  return [
    ...params.betweenPlayEvents.map((event) => ({
      kind: "between_play" as const,
      eventId: event.eventId,
      eventIndex: event.eventIndex,
      betweenPlay: event,
    })),
    ...params.atBatEvents.map((event) => ({
      kind: "at_bat" as const,
      eventId: event.eventId,
      eventIndex: event.eventIndex,
      atBat: event,
    })),
  ].sort(
    (left, right) =>
      left.eventIndex - right.eventIndex ||
      (left.kind === right.kind ? 0 : left.kind === "between_play" ? -1 : 1) ||
      left.eventId.localeCompare(right.eventId),
  );
}

function findEarliestWatchResolution(input: {
  watch: ManagerRecommendationWatchRecord;
  decisionsByEventId: Map<string, ManagerDecisionRecord[]>;
  fieldingEventsByAtBat: Map<string, FieldingEvent[]>;
  timeline: RecommendationWatchTimelineEntry[];
}): WatchResolution | null {
  for (const entry of input.timeline) {
    if (entry.eventIndex <= input.watch.openedAtEventIndex) continue;

    if (entry.kind === "between_play") {
      const event = entry.betweenPlay;
      if (
        event.gameState &&
        !isSameHalf(input.watch, event.gameState.inning, event.gameState.halfInning)
      ) {
        return null;
      }

      const decisions = input.decisionsByEventId.get(event.eventId) ?? [];
      const explicitNoChangeDecision = findExplicitNoChangeDecisionForWatch(
        input.watch,
        event,
        decisions,
      );
      if (explicitNoChangeDecision) {
        return {
          status: "explicit_no_change",
          resolvedAtEventId: event.eventId,
          resolutionDecisionType: explicitNoChangeDecision.decisionType,
          decision: explicitNoChangeDecision,
        };
      }

      for (const decision of decisions) {
        if (decision.teamId !== input.watch.teamId) continue;
        const actionResolution = getWatchActionResolution(
          input.watch,
          decision,
          event,
        );
        if (!actionResolution) continue;
        return {
          status: actionResolution.status,
          resolvedAtEventId: event.eventId,
          resolutionDecisionType: decision.decisionType,
          decision,
          actualPlayerId: actionResolution.actualPlayerId,
          alternativePlayerId: actionResolution.alternativePlayerId,
        };
      }

      continue;
    }

    const event = entry.atBat;
    if (!isCompleteAtBatWindowEvent(event)) continue;
    if (!isSameHalf(input.watch, event.inning, event.halfInning)) {
      return null;
    }

    const noChangeResolution = getWatchNoChangeResolutionAtBat(
      input.watch,
      event,
      input.fieldingEventsByAtBat,
    );
    if (noChangeResolution) return noChangeResolution;
  }

  return null;
}

function findExplicitNoChangeDecisionForWatch(
  watch: ManagerRecommendationWatchRecord,
  event: BetweenPlayEvent,
  decisions: ManagerDecisionRecord[],
): ManagerDecisionRecord | null {
  const prompted = event.promptedManagerDecision;
  const expectedDecisionType = noChangeDecisionTypeForRecommendation(watch.type);
  if (!prompted || prompted.source !== "recommendation" || !expectedDecisionType) {
    return null;
  }
  const matchesRecommendationId =
    prompted.recommendationId === watch.recommendationId;
  const matchesProvenanceKey = prompted.provenanceKey === watch.suppressKey;
  if (!matchesRecommendationId && !matchesProvenanceKey) {
    return null;
  }
  if (!isNoChangeDecisionForRecommendationType(expectedDecisionType)) return null;

  return (
    decisions.find(
      (decision) =>
        decision.teamId === watch.teamId &&
        decision.decisionType === expectedDecisionType,
    ) ?? null
  );
}

function getWatchActionResolution(
  watch: ManagerRecommendationWatchRecord,
  decision: ManagerDecisionRecord,
  event: BetweenPlayEvent,
): WatchActionResolution | null {
  const targetPlayerId = watch.targetPlayerId;
  if (!targetPlayerId) return null;

  let actualPlayerId: string | undefined;
  if (
    watch.type === "consider_pitching_change" &&
    decision.decisionType === "pitching_change" &&
    event.pitcherChange?.outgoingPitcherId === targetPlayerId
  ) {
    actualPlayerId = event.pitcherChange.incomingPitcherId;
  } else if (
    watch.type === "consider_pinch_hitter" &&
    decision.decisionType === "pinch_hitter" &&
    event.substitution?.outPlayerId === targetPlayerId
  ) {
    actualPlayerId = event.substitution.inPlayerId;
  } else if (
    watch.type === "consider_defensive_replacement" &&
    (decision.decisionType === "defensive_sub" ||
      decision.decisionType === "position_change") &&
    (event.substitution?.outPlayerId === targetPlayerId ||
      event.substitution?.inPlayerId === targetPlayerId)
  ) {
    actualPlayerId = event.substitution?.inPlayerId;
  } else {
    return null;
  }

  const isAlternative =
    Boolean(watch.suggestedPlayerId) &&
    Boolean(actualPlayerId) &&
    actualPlayerId !== watch.suggestedPlayerId;

  return {
    status: isAlternative ? "action_taken_alternative" : "action_taken",
    actualPlayerId,
    alternativePlayerId: isAlternative ? actualPlayerId : undefined,
  };
}

function noChangeDecisionTypeForRecommendation(
  recommendationType: ManagerRecommendationWatchType,
): ManagerDecisionType | null {
  if (recommendationType === "consider_pitching_change") {
    return "leave_pitcher_in";
  }
  if (recommendationType === "consider_pinch_hitter") {
    return "let_batter_hit";
  }
  if (recommendationType === "consider_defensive_replacement") {
    return "keep_defender_in";
  }
  return null;
}

function isNoChangeDecisionForRecommendationType(
  decisionType: ManagerDecisionType,
): boolean {
  return (
    decisionType === "leave_pitcher_in" ||
    decisionType === "let_batter_hit" ||
    decisionType === "keep_defender_in"
  );
}

function getWatchNoChangeResolutionAtBat(
  watch: ManagerRecommendationWatchRecord,
  event: AtBatEvent,
  fieldingEventsByAtBat: Map<string, FieldingEvent[]>,
): WatchResolution | null {
  const decisionType = noChangeDecisionTypeForRecommendation(watch.type);
  const targetPlayerId = watch.targetPlayerId;
  if (!decisionType || !targetPlayerId) return null;

  if (
    watch.type === "consider_pitching_change" &&
    event.pitcherId === targetPlayerId
  ) {
    return {
      status: "inferred_no_change",
      resolvedAtEventId: event.eventId,
      resolutionDecisionType: decisionType,
    };
  }

  if (watch.type === "consider_pinch_hitter" && event.batterId === targetPlayerId) {
    return {
      status: "inferred_no_change",
      resolvedAtEventId: event.eventId,
      resolutionDecisionType: decisionType,
    };
  }

  if (watch.type === "consider_defensive_replacement") {
    const fieldingEvent = (fieldingEventsByAtBat.get(event.eventId) ?? []).find(
      (candidate) => candidate.playerId === targetPlayerId,
    );
    if (!fieldingEvent) return null;
    return {
      status: "inferred_no_change",
      resolvedAtEventId: fieldingEvent.fieldingEventId,
      resolutionDecisionType: decisionType,
    };
  }

  return null;
}

function buildInferredNoChangeDecisionFromWatch(input: {
  input: DeriveManagerDecisionRecordsInput;
  gameId: string;
  watch: ManagerRecommendationWatchRecord;
  sourceEvent: BetweenPlayEvent;
  decisionType: ManagerDecisionType;
}): ManagerDecisionRecord {
  const { watch, sourceEvent, decisionType } = input;
  const halfInning = sourceEvent.gameState?.halfInning ?? "TOP";
  const score = sourceEvent.gameState?.score ?? { away: 0, home: 0 };
  const wpa = calculateBetweenPlayWindow(sourceEvent, input.input.totalInnings, input.input);
  const window = buildDecisionWindow({
    teamId: watch.teamId,
    homeTeamId: input.input.homeTeamId,
    homeWinProbabilityBefore: wpa.winProbabilityBefore,
    decisionType,
  });
  const trackedPlayerIds = uniqueStrings([watch.targetPlayerId]);

  return buildDecisionRecord({
    gameId: input.gameId,
    decisionEventId: sourceEvent.eventId,
    linkedEventIds: [sourceEvent.eventId],
    managerId: watch.managerId,
    teamId: watch.teamId,
    opponentTeamId: watch.opponentTeamId,
    decisionType,
    inferenceMethod: "passive",
    decisionSource: "situational_prompt",
    confidence: watch.confidence,
    inning: sourceEvent.gameState?.inning ?? watch.inning,
    halfInning,
    outs: sourceEvent.gameState?.outs ?? watch.outs,
    baseState: formatBetweenPlayBaseState(sourceEvent.gameState?.runnersOn),
    scoreDifferentialForTeam: scoreDifferentialForTeam({
      teamId: watch.teamId,
      homeTeamId: input.input.homeTeamId,
      homeScore: score.home,
      awayScore: score.away,
    }),
    leverageIndex: watch.leverageIndex,
    involvedPlayerIds: uniqueStrings([
      watch.targetPlayerId,
      watch.suggestedPlayerId,
    ]),
    window,
    resolved: false,
    resolutionWindow: buildResolutionWindow({
      status: "pending",
      startEventId: sourceEvent.eventId,
      startEventIndex: sourceEvent.eventIndex,
      startSnapshotSource: "event_state",
      expectedEndpoint: getExpectedEndpoint(decisionType),
      trackedPlayerIds,
      trackedRunnerIds: [],
    }),
    explanationMetadata: {
      recommendation: buildRecommendationProvenance(
        watch,
        "inferred_no_change",
      ),
    },
    derivedFromFields: [
      "managerRecommendationWatch",
      "managerRecommendationWatch.recommendationId",
      "committedBehavior.noChange",
    ],
    decisionKeySuffix: `watch:${watch.recommendationId}`,
  });
}

function attachRecommendationProvenance(
  decision: ManagerDecisionRecord,
  watch: ManagerRecommendationWatchRecord,
  response: Exclude<ManagerRecommendationWatchResolutionStatus, "pending">,
  action?: { actualPlayerId?: string; alternativePlayerId?: string },
): ManagerDecisionRecord {
  return {
    ...decision,
    explanationMetadata: {
      ...decision.explanationMetadata,
      recommendation: buildRecommendationProvenance(watch, response, action),
    },
    derivation: {
      ...decision.derivation,
      derivedFromFields: uniqueStrings([
        ...decision.derivation.derivedFromFields,
        "managerRecommendationWatch",
      ]),
    },
  };
}

function buildRecommendationProvenance(
  watch: ManagerRecommendationWatchRecord,
  response: Exclude<ManagerRecommendationWatchResolutionStatus, "pending">,
  action?: { actualPlayerId?: string; alternativePlayerId?: string },
): ManagerRecommendationProvenanceMetadata {
  return {
    recommendationId: watch.recommendationId,
    recommendationType: watch.type,
    suppressKey: watch.suppressKey,
    sourceEventId: watch.sourceEventId,
    response,
    confidence: watch.confidence,
    surface: watch.surface,
    recommendedPlayerId: watch.targetPlayerId,
    suggestedPlayerId: watch.suggestedPlayerId,
    actualPlayerId: action?.actualPlayerId,
    alternativePlayerId: action?.alternativePlayerId,
  };
}

function updateWatchResolution(
  watches: ManagerRecommendationWatchRecord[],
  watchId: string,
  updates: Partial<
    Pick<
      ManagerRecommendationWatchRecord,
      | "status"
      | "resolvedAtEventId"
      | "resolvedDecisionId"
      | "resolutionDecisionType"
      | "actualPlayerId"
      | "alternativePlayerId"
    >
  >,
): void {
  const index = watches.findIndex((watch) => watch.watchId === watchId);
  if (index < 0) return;
  const current = watches[index];
  watches[index] = {
    ...current,
    ...updates,
    linkedEventIds: uniqueStrings([
      ...current.linkedEventIds,
      updates.resolvedAtEventId,
    ]),
  };
}

function dedupePromptedManagerDecisionEvents(
  events: BetweenPlayEvent[],
): BetweenPlayEvent[] {
  const seen = new Set<string>();
  return events.filter((event) => {
    const key = promptedManagerDecisionDedupeKey(event);
    if (!key) return true;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function promptedManagerDecisionDedupeKey(
  event: BetweenPlayEvent,
): string | null {
  const prompted = event.promptedManagerDecision;
  const provenanceKey = prompted?.provenanceKey ?? prompted?.recommendationId;
  if (!prompted || !provenanceKey) return null;

  return [
    prompted.decisionType,
    prompted.managerId,
    prompted.teamId,
    provenanceKey,
    promptedManagerDecisionSnapshotKey(event),
  ].join(":");
}

function promptedManagerDecisionSnapshotKey(event: BetweenPlayEvent): string {
  const state = event.gameState;
  if (!state) return `event:${event.eventIndex}`;

  const runners = state.runnersOn ?? {};
  return [
    "state",
    state.inning,
    state.halfInning,
    state.outs,
    state.score.away,
    state.score.home,
    runners.first ?? "",
    runners.second ?? "",
    runners.third ?? "",
  ].join(":");
}

function deriveAtBatManagerDecisions(
  event: AtBatEvent,
  input: ManagerAssignmentResolutionInput & { totalInnings?: number },
  gameId: string,
): ManagerDecisionRecord[] {
  const decisions: ManagerDecisionRecord[] = [];

  if (event.result === "IBB") {
    decisions.push(
      buildAtBatDecision({
        event,
        input,
        gameId,
        decisionType: "intentional_walk",
        decisionSource: "event_semantics",
        confidence: "high",
        involvedPlayerIds: [event.batterId, event.pitcherId],
        derivedFromFields: ["result"],
      }),
    );
  }

  const buntDecisionType = inferBuntDecisionType(event);
  if (buntDecisionType) {
    const isBuntEnrichment = Boolean(
      event.enrichment?.managerBuntIntent ||
        event.enrichment?.exitType === "bunt",
    );
    decisions.push(
      buildAtBatDecision({
        event,
        input,
        gameId,
        decisionType: buntDecisionType,
        decisionSource: isBuntEnrichment
          ? "play_log_enhancement"
          : "event_semantics",
        confidence:
          event.enrichment?.managerBuntIntent === "squeeze_call" ||
          event.enrichment?.managerBuntIntent === "bunt_call"
            ? "high"
            : "medium",
        involvedPlayerIds: [
          event.batterId,
          ...(event.runnerOutcomes ?? []).map((outcome) => outcome.runnerId),
        ],
        derivedFromFields: [
          event.enrichment?.managerBuntIntent
            ? "enrichment.managerBuntIntent"
            : "enrichment.exitType",
          "runnerOutcomes",
        ],
      }),
    );
  }

  const hitAndRunEntries = (event.runnerOutcomes ?? [])
    .map((outcome, index) => ({ outcome, index }))
    .filter(({ outcome }) => outcome.managerRunPlay === "hit_and_run");
  if (hitAndRunEntries.length > 0) {
    decisions.push(
      buildAtBatDecision({
        event,
        input,
        gameId,
        decisionType: "hit_and_run",
        decisionSource:
          hitAndRunEntries.find(({ outcome }) => outcome.managerDecisionSource)
            ?.outcome.managerDecisionSource ?? "play_log_enhancement",
        confidence: "medium",
        involvedPlayerIds: [
          event.batterId,
          ...hitAndRunEntries.map(({ outcome }) => outcome.runnerId),
        ],
        derivedFromFields: hitAndRunEntries.map(
          ({ index }) => `runnerOutcomes.${index}.managerRunPlay`,
        ),
        decisionIdSuffix: "hit-and-run",
      }),
    );
  }

  for (const [index, outcome] of (event.runnerOutcomes ?? []).entries()) {
    if (outcome.managerIntent === "manager_hold") {
      decisions.push(
        buildAtBatDecision({
          event,
          input,
          gameId,
          decisionType: "runner_hold",
          decisionSource: outcome.managerDecisionSource ?? "play_log_enhancement",
          confidence: "medium",
          involvedPlayerIds: [outcome.runnerId],
          derivedFromFields: [`runnerOutcomes.${index}.managerIntent`],
          decisionIdSuffix: `runner-${index}`,
        }),
      );
    }

    if (
      outcome.managerIntent === "manager_send" &&
      outcome.managerRunPlay !== "hit_and_run" &&
      (outcome.isOutAdvancing || outcome.toBase === "out")
    ) {
      decisions.push(
        buildAtBatDecision({
          event,
          input,
          gameId,
          decisionType: "out_advancing_send",
          decisionSource: outcome.managerDecisionSource ?? "play_log_enhancement",
          confidence: "medium",
          involvedPlayerIds: [outcome.runnerId],
          derivedFromFields: [
            `runnerOutcomes.${index}.managerIntent`,
            `runnerOutcomes.${index}.isOutAdvancing`,
          ],
          decisionIdSuffix: `runner-${index}`,
          runnerOutcomeIndex: index,
        }),
      );
    }
  }

  return decisions;
}

function buildAtBatDecision(params: {
  event: AtBatEvent;
  input: ManagerAssignmentResolutionInput & {
    totalInnings?: number;
  } & ExtraInningRunnerPolicy;
  gameId: string;
  decisionType: ManagerDecisionType;
  decisionSource: ManagerDecisionSource;
  confidence: ManagerDecisionConfidence;
  involvedPlayerIds: string[];
  derivedFromFields: string[];
  decisionIdSuffix?: string;
  runnerOutcomeIndex?: number;
}): ManagerDecisionRecord {
  const { event, input, decisionType } = params;
  const attribution = resolveManagerAttributionForDecision(
    decisionType,
    event.halfInning,
    input,
  );
  const expectedEndpoint = getExpectedEndpoint(decisionType);
  const outAdvancingWindow =
    decisionType === "out_advancing_send"
      ? buildOutAdvancingSendCounterfactualWindow({
          event,
          runnerOutcomeIndex: params.runnerOutcomeIndex,
          teamId: attribution.teamId,
          homeTeamId: input.homeTeamId,
          totalInnings: input.totalInnings,
          useGhostRunner: input.useGhostRunner,
          extraInningRunner: input.extraInningRunner,
          extraInningRunnerDelay: input.extraInningRunnerDelay,
        })
      : undefined;
  const resolvesSameEvent =
    expectedEndpoint === "same_event" &&
    (decisionType !== "out_advancing_send" ||
      outAdvancingWindow?.scored === true);
  const wpa = calculateAtBatWindow(event, input.totalInnings, input);
  const window =
    decisionType === "out_advancing_send" && outAdvancingWindow?.scored
      ? outAdvancingWindow.window
      : buildDecisionWindow({
          teamId: attribution.teamId,
          homeTeamId: input.homeTeamId,
          homeWinProbabilityBefore: wpa.winProbabilityBefore,
          homeWinProbabilityAfter: resolvesSameEvent
            ? wpa.winProbabilityAfter
            : undefined,
          decisionType,
        });
  const involvedPlayerIds = uniqueStrings(params.involvedPlayerIds);
  const trackedPlayerIds =
    decisionType === "intentional_walk"
      ? uniqueStrings([event.batterId])
      : involvedPlayerIds;
  const trackedRunnerIds =
    decisionType === "intentional_walk"
      ? uniqueStrings([event.batterId])
      : trackedPlayerIds;

  return buildDecisionRecord({
    gameId: params.gameId,
    decisionEventId: event.eventId,
    linkedEventIds: [event.eventId],
    managerId: attribution.managerId,
    teamId: attribution.teamId,
    opponentTeamId: attribution.opponentTeamId,
    decisionType,
    inferenceMethod: params.decisionSource === "manual_edit" ? "manual" : "automatic",
    decisionSource: params.decisionSource,
    confidence: params.confidence,
    inning: event.inning,
    halfInning: event.halfInning,
    outs: event.outs,
    baseState: formatRunnerState(event.runners),
    scoreDifferentialForTeam: scoreDifferentialForTeam({
      teamId: attribution.teamId,
      homeTeamId: input.homeTeamId,
      homeScore: event.homeScore,
      awayScore: event.awayScore,
    }),
    leverageIndex: event.leverageIndex,
    involvedPlayerIds,
    window,
    resolved: resolvesSameEvent,
    resolvedAtEventId: resolvesSameEvent ? event.eventId : undefined,
    resolutionWindow: buildResolutionWindow({
      status: resolvesSameEvent ? "resolved" : "pending",
      startEventId: event.eventId,
      startEventIndex: event.eventIndex,
      startSnapshotSource: "pre_event",
      expectedEndpoint,
      trackedPlayerIds,
      trackedRunnerIds,
      maxEventIndex: resolvesSameEvent ? event.eventIndex : undefined,
    }),
    explanationMetadata:
      decisionType === "intentional_walk"
        ? buildIntentionalWalkExplanationMetadata({
            ibbEvent: event,
            walkedRunnerId: event.batterId,
            walkedRunnerName: event.batterName,
            teamId: attribution.teamId,
            homeTeamId: input.homeTeamId,
            totalInnings: input.totalInnings,
            useGhostRunner: input.useGhostRunner,
            extraInningRunner: input.extraInningRunner,
            extraInningRunnerDelay: input.extraInningRunnerDelay,
          })
        : decisionType === "out_advancing_send"
          ? { outAdvancingSend: outAdvancingWindow?.metadata }
        : undefined,
    derivedFromFields: params.derivedFromFields,
    decisionKeySuffix: params.decisionIdSuffix,
    manuallyPinned: event.enrichment?.managerDecisionSource === "manual_edit",
  });
}

function deriveBetweenPlayManagerDecisions(
  event: BetweenPlayEvent,
  input: DeriveManagerDecisionRecordsInput,
  gameId: string,
): ManagerDecisionRecord[] {
  if (!event.gameState) return [];

  if (event.promptedManagerDecision) {
    if (!isSupportedPromptedManagerDecision(event.promptedManagerDecision.decisionType)) {
      return [];
    }
    if (promptedTrackedPlayerIds(event.promptedManagerDecision).length === 0) {
      return [];
    }
    return [buildPromptedBetweenPlayDecision({ event, input, gameId })];
  }

  if (event.type === "stolen_base" || event.type === "caught_stealing") {
    return [
      buildBetweenPlayDecision({
        event,
        input,
        gameId,
        decisionType: "steal_send",
        decisionSource: "event_semantics",
        confidence: "high",
        involvedPlayerIds: [event.runnerAction?.runnerId],
        derivedFromFields: ["type", "runnerAction"],
        resolved: true,
      }),
    ];
  }

  if (
    event.type === "runner_advance" &&
    event.runnerAction?.managerIntent === "manager_send" &&
    event.runnerAction.outcome === "out"
  ) {
    return [
      buildBetweenPlayDecision({
        event,
        input,
        gameId,
        decisionType: "out_advancing_send",
        decisionSource:
          event.runnerAction.managerDecisionSource ?? "play_log_enhancement",
        confidence: "medium",
        involvedPlayerIds: [event.runnerAction.runnerId],
        derivedFromFields: ["runnerAction.managerIntent"],
        resolved: true,
      }),
    ];
  }

  if (
    event.type === "runner_advance" &&
    event.runnerAction?.managerIntent === "manager_hold"
  ) {
    return [
      buildBetweenPlayDecision({
        event,
        input,
        gameId,
        decisionType: "runner_hold",
        decisionSource:
          event.runnerAction.managerDecisionSource ?? "play_log_enhancement",
        confidence: "medium",
        involvedPlayerIds: [event.runnerAction.runnerId],
        derivedFromFields: ["runnerAction.managerIntent"],
        resolved: true,
      }),
    ];
  }

  if (event.type === "pitcher_change") {
    return [
      buildBetweenPlayDecision({
        event,
        input,
        gameId,
        decisionType: "pitching_change",
        decisionSource: "user_action",
        confidence: "high",
        involvedPlayerIds: [
          event.pitcherChange?.outgoingPitcherId,
          event.pitcherChange?.incomingPitcherId,
        ],
        derivedFromFields: ["pitcherChange"],
        resolved: false,
      }),
    ];
  }

  if (event.type === "substitution" && event.substitution) {
    const decisionType = inferSubstitutionDecisionType(event, input);
    const wasInferredPinchHit =
      decisionType === "pinch_hitter" &&
      event.substitution.subType !== "pinch_hit";
    return [
      buildBetweenPlayDecision({
        event,
        input,
        gameId,
        decisionType,
        decisionSource: "user_action",
        confidence: wasInferredPinchHit
          ? "medium"
          : decisionType === "position_change"
            ? "low"
            : "high",
        involvedPlayerIds: [
          event.substitution.outPlayerId,
          event.substitution.inPlayerId,
        ],
        derivedFromFields: wasInferredPinchHit
          ? ["substitution.subType", "nextAtBat.batterId"]
          : ["substitution.subType"],
        resolved: false,
      }),
    ];
  }

  if (event.type === "position_change") {
    return [
      buildBetweenPlayDecision({
        event,
        input,
        gameId,
        decisionType: "position_change",
        decisionSource: "user_action",
        confidence: "low",
        involvedPlayerIds: [
          event.substitution?.outPlayerId,
          event.substitution?.inPlayerId,
        ],
        derivedFromFields: ["type"],
        resolved: false,
      }),
    ];
  }

  return [];
}

function isSupportedPromptedManagerDecision(
  decisionType: string,
): decisionType is "leave_pitcher_in" | "let_batter_hit" | "keep_defender_in" {
  return (
    decisionType === "leave_pitcher_in" ||
    decisionType === "let_batter_hit" ||
    decisionType === "keep_defender_in"
  );
}

function buildPromptedBetweenPlayDecision(params: {
  event: BetweenPlayEvent;
  input: DeriveManagerDecisionRecordsInput;
  gameId: string;
}): ManagerDecisionRecord {
  const { event, input, gameId } = params;
  const prompted = event.promptedManagerDecision!;
  const halfInning = event.gameState?.halfInning ?? "TOP";
  const fallbackAttribution = resolveManagerAttributionForDecision(
    prompted.decisionType,
    halfInning,
    input,
  );
  const attribution = {
    managerId: prompted.managerId || fallbackAttribution.managerId,
    teamId: prompted.teamId || fallbackAttribution.teamId,
    opponentTeamId:
      prompted.opponentTeamId || fallbackAttribution.opponentTeamId,
  };
  const involvedPlayerIds = uniqueStrings(
    prompted.involvedPlayerIds?.length
      ? prompted.involvedPlayerIds
      : promptedTrackedPlayerIds(prompted),
  );
  const trackedPlayerIds = uniqueStrings(
    promptedTrackedPlayerIds(prompted).length
      ? promptedTrackedPlayerIds(prompted)
      : [prompted.playerId, ...involvedPlayerIds],
  );
  const expectedEndpoint =
    prompted.resolution?.expectedEndpoint ?? getExpectedEndpoint(prompted.decisionType);
  const wpa = calculateBetweenPlayWindow(event, input.totalInnings, input);
  const window = buildDecisionWindow({
    teamId: attribution.teamId,
    homeTeamId: input.homeTeamId,
    homeWinProbabilityBefore: wpa.winProbabilityBefore,
    decisionType: prompted.decisionType,
  });
  const score = event.gameState?.score ?? { away: 0, home: 0 };

  return buildDecisionRecord({
    gameId,
    decisionEventId: event.eventId,
    linkedEventIds: [event.eventId],
    managerId: attribution.managerId,
    teamId: attribution.teamId,
    opponentTeamId: attribution.opponentTeamId,
    decisionType: prompted.decisionType,
    inferenceMethod: prompted.source === "manual_manager_moment" ? "manual" : "prompted",
    decisionSource:
      prompted.decisionSource ??
      (prompted.source === "manual_manager_moment"
        ? "manual_edit"
        : "situational_prompt"),
    confidence: prompted.confidence ?? "medium",
    inning: event.gameState?.inning ?? 1,
    halfInning,
    outs: event.gameState?.outs ?? 0,
    baseState: formatBetweenPlayBaseState(event.gameState?.runnersOn),
    scoreDifferentialForTeam: scoreDifferentialForTeam({
      teamId: attribution.teamId,
      homeTeamId: input.homeTeamId,
      homeScore: score.home,
      awayScore: score.away,
    }),
    leverageIndex: prompted.leverageIndex,
    involvedPlayerIds: uniqueStrings([
      ...involvedPlayerIds,
      ...trackedPlayerIds,
    ]),
    window,
    resolved: false,
    resolutionWindow: buildResolutionWindow({
      status: "pending",
      startEventId: event.eventId,
      startEventIndex: event.eventIndex,
      startSnapshotSource: "event_state",
      expectedEndpoint,
      trackedPlayerIds,
      trackedRunnerIds: [],
    }),
    derivedFromFields: uniqueStrings([
      "promptedManagerDecision",
      prompted.provenanceKey
        ? "promptedManagerDecision.provenanceKey"
        : undefined,
      prompted.recommendationId
        ? "promptedManagerDecision.recommendationId"
        : undefined,
    ]),
    decisionKeySuffix:
      prompted.provenanceKey || prompted.recommendationId
        ? `prompt:${prompted.provenanceKey ?? prompted.recommendationId}`
        : undefined,
    manuallyPinned: prompted.source === "manual_manager_moment",
  });
}

function promptedTrackedPlayerIds(
  prompted: NonNullable<BetweenPlayEvent["promptedManagerDecision"]>,
): string[] {
  return uniqueStrings(
    Array.isArray(prompted.trackedPlayerIds)
      ? prompted.trackedPlayerIds
      : [prompted.playerId],
  );
}

function buildBetweenPlayDecision(params: {
  event: BetweenPlayEvent;
  input: ManagerAssignmentResolutionInput & {
    totalInnings?: number;
  } & ExtraInningRunnerPolicy;
  gameId: string;
  decisionType: ManagerDecisionType;
  decisionSource: ManagerDecisionSource;
  confidence: ManagerDecisionConfidence;
  involvedPlayerIds: Array<string | undefined>;
  derivedFromFields: string[];
  resolved: boolean;
}): ManagerDecisionRecord {
  const { event, input, decisionType } = params;
  const halfInning = event.gameState?.halfInning ?? "TOP";
  const attribution = resolveManagerAttributionForDecision(
    decisionType,
    halfInning,
    input,
  );
  const expectedEndpoint = getExpectedEndpoint(decisionType);
  const resolvesSameEvent =
    decisionType === "out_advancing_send"
      ? false
      : params.resolved || expectedEndpoint === "same_event";
  const involvedPlayerIds = uniqueStrings(params.involvedPlayerIds);
  const trackedPlayerIds = getTrackedPlayerIdsForBetweenPlayDecision(
    decisionType,
    event,
    involvedPlayerIds,
  );
  const trackedRunnerIds = getTrackedRunnerIdsForBetweenPlayDecision(
    decisionType,
    event,
    involvedPlayerIds,
  );
  const wpa = calculateBetweenPlayWindow(event, input.totalInnings, input);
  const window = buildDecisionWindow({
    teamId: attribution.teamId,
    homeTeamId: input.homeTeamId,
    homeWinProbabilityBefore: wpa.winProbabilityBefore,
    homeWinProbabilityAfter: resolvesSameEvent
      ? wpa.winProbabilityAfter
      : undefined,
    decisionType,
  });

  return buildDecisionRecord({
    gameId: params.gameId,
    decisionEventId: event.eventId,
    linkedEventIds: [event.eventId],
    managerId: attribution.managerId,
    teamId: attribution.teamId,
    opponentTeamId: attribution.opponentTeamId,
    decisionType,
    inferenceMethod: params.decisionSource === "manual_edit" ? "manual" : "automatic",
    decisionSource: params.decisionSource,
    confidence: params.confidence,
    inning: event.gameState?.inning ?? 1,
    halfInning,
    outs: event.gameState?.outs ?? 0,
    baseState: formatBetweenPlayBaseState(event.gameState?.runnersOn),
    scoreDifferentialForTeam: scoreDifferentialForTeam({
      teamId: attribution.teamId,
      homeTeamId: input.homeTeamId,
      homeScore: event.gameState?.score.home ?? 0,
      awayScore: event.gameState?.score.away ?? 0,
    }),
    leverageIndex: event.managerMoment?.leverageIndex,
    involvedPlayerIds,
    window,
    resolved: resolvesSameEvent,
    resolvedAtEventId: resolvesSameEvent ? event.eventId : undefined,
    resolutionWindow: buildResolutionWindow({
      status: resolvesSameEvent ? "resolved" : "pending",
      startEventId: event.eventId,
      startEventIndex: event.eventIndex,
      startSnapshotSource: "event_state",
      expectedEndpoint,
      trackedPlayerIds,
      trackedRunnerIds,
      maxEventIndex: resolvesSameEvent ? event.eventIndex : undefined,
    }),
    explanationMetadata:
      decisionType === "out_advancing_send"
        ? {
            outAdvancingSend: {
              runnerId: event.runnerAction?.runnerId,
              runnerName: event.runnerAction?.runnerName,
              unscoredReason: "unsupported_between_play_counterfactual",
            },
          }
        : undefined,
    derivedFromFields: params.derivedFromFields,
    manuallyPinned:
      event.runnerAction?.managerDecisionSource === "manual_edit" ||
      event.managerMoment?.decisionType === decisionType,
  });
}

interface ResolveDecisionWindowsContext {
  atBatEvents: AtBatEvent[];
  betweenPlayEvents: BetweenPlayEvent[];
  fieldingEvents: FieldingEvent[];
  homeTeamId: string;
  totalInnings?: number;
  useGhostRunner?: boolean;
  extraInningRunner?: boolean;
  extraInningRunnerDelay?: 1 | 2;
  gameEnded: boolean;
}

interface TimelineEntry {
  kind: "at_bat" | "between_play";
  eventId: string;
  eventIndex: number;
  inning: number;
  halfInning: "TOP" | "BOTTOM";
  outsAfter: number;
  homeWinProbabilityAfter: number;
  atBat?: AtBatEvent;
  betweenPlay?: BetweenPlayEvent;
}

interface ResolutionEndpoint {
  eventId: string;
  eventIds: string[];
  eventIndex: number;
  homeWinProbabilityAfter: number;
  explanationMetadata?: ManagerDecisionExplanationMetadata;
}

function resolveManagerDecisionWindows(
  decisions: ManagerDecisionRecord[],
  context: ResolveDecisionWindowsContext,
): ManagerDecisionRecord[] {
  const timeline = buildTimeline(context);
  const atBatById = new Map(
    context.atBatEvents.map((event) => [event.eventId, event] as const),
  );

  return decisions.map((decision) =>
    resolveManagerDecisionWindow(decision, context, timeline, atBatById),
  );
}

function resolveManagerDecisionWindow(
  decision: ManagerDecisionRecord,
  context: ResolveDecisionWindowsContext,
  timeline: TimelineEntry[],
  atBatById: Map<string, AtBatEvent>,
): ManagerDecisionRecord {
  const window = decision.resolutionWindow;
  if (!window || window.expectedEndpoint === "same_event") {
    return decision;
  }

  const endpoint = findResolutionEndpoint(
    decision,
    context,
    timeline,
    atBatById,
  );
  if (!endpoint) {
    return markDecisionPending(decision, context);
  }

  return resolveDecisionAtEndpoint(decision, context, endpoint);
}

function resolveDecisionAtEndpoint(
  decision: ManagerDecisionRecord,
  context: ResolveDecisionWindowsContext,
  endpoint: ResolutionEndpoint,
): ManagerDecisionRecord {
  const share =
    decision.managerShare ??
    MANAGER_WPA_SHARE_BY_DECISION_TYPE[decision.decisionType] ??
    0;
  const teamWinProbabilityAfter = roundProbability(
    teamWinProbability(
      endpoint.homeWinProbabilityAfter,
      decision.teamId,
      context.homeTeamId,
    ),
  );
  const rawWindowWpa = roundWpa(
    teamWinProbabilityAfter - decision.teamWinProbabilityBefore,
  );
  const linkedEventIds = uniqueStrings([
    ...decision.linkedEventIds,
    ...endpoint.eventIds,
  ]);

  return {
    ...decision,
    linkedEventIds,
    teamWinProbabilityAfter,
    rawWindowWpa,
    managerWpa: roundWpa(rawWindowWpa * share),
    resolved: true,
    resolvedAtEventId: endpoint.eventId,
    explanationMetadata:
      endpoint.explanationMetadata ?? decision.explanationMetadata,
    resolutionWindow: decision.resolutionWindow
      ? {
          ...decision.resolutionWindow,
          status: "resolved",
          maxEventIndex: endpoint.eventIndex,
        }
      : undefined,
    derivation: {
      ...decision.derivation,
      derivedFromEventIds: linkedEventIds,
    },
  };
}

function markDecisionPending(
  decision: ManagerDecisionRecord,
  context: ResolveDecisionWindowsContext,
): ManagerDecisionRecord {
  const nextBatterPa =
    decision.decisionType === "intentional_walk"
      ? findNextPlateAppearanceAfterDecision(decision, context)
      : undefined;
  const linkedEventIds =
    decision.decisionType === "intentional_walk"
      ? uniqueStrings([decision.decisionEventId, nextBatterPa?.eventId])
      : uniqueStrings([decision.decisionEventId]);
  const explanationMetadata = nextBatterPa
      ? buildIntentionalWalkExplanationMetadata({
          decision,
          nextBatterPa,
          homeTeamId: context.homeTeamId,
          totalInnings: context.totalInnings,
          extraInningRunner: context.extraInningRunner,
          extraInningRunnerDelay: context.extraInningRunnerDelay,
        })
    : decision.explanationMetadata;

  return {
    ...decision,
    teamWinProbabilityAfter: undefined,
    rawWindowWpa: undefined,
    managerWpa: undefined,
    resolved: false,
    resolvedAtEventId: undefined,
    explanationMetadata,
    resolutionWindow: decision.resolutionWindow
      ? {
          ...decision.resolutionWindow,
          status: "pending",
          maxEventIndex: undefined,
        }
      : undefined,
    linkedEventIds,
    derivation: {
      ...decision.derivation,
      derivedFromEventIds: linkedEventIds,
    },
  };
}

function findResolutionEndpoint(
  decision: ManagerDecisionRecord,
  context: ResolveDecisionWindowsContext,
  timeline: TimelineEntry[],
  atBatById: Map<string, AtBatEvent>,
): ResolutionEndpoint | null {
  switch (getDecisionHorizon(decision.decisionType)) {
    case "single_play":
      return findSinglePlayResolutionEndpoint(decision, timeline);
    case "matchup":
      return findMatchupResolutionEndpoint(
        decision,
        context,
        timeline,
        atBatById,
      );
    case "inning_consequence":
      return findInningConsequenceResolutionEndpoint(
        decision,
        context,
        timeline,
      );
    case "personnel_stint":
      return findPersonnelStintResolutionEndpoint(decision, timeline);
    case "lineup_baseline":
      return findGameEndEndpoint(decision, context, timeline);
    default:
      return null;
  }
}

function findSinglePlayResolutionEndpoint(
  decision: ManagerDecisionRecord,
  timeline: TimelineEntry[],
): ResolutionEndpoint | null {
  switch (decision.resolutionWindow?.expectedEndpoint) {
    case "runner_terminal":
      return findRunnerTerminalEndpoint(decision, timeline);
    default:
      return null;
  }
}

function findMatchupResolutionEndpoint(
  decision: ManagerDecisionRecord,
  context: ResolveDecisionWindowsContext,
  timeline: TimelineEntry[],
  atBatById: Map<string, AtBatEvent>,
): ResolutionEndpoint | null {
  switch (decision.resolutionWindow?.expectedEndpoint) {
    case "next_pa":
    case "same_player_pa":
      return findNextPlateAppearanceEndpoint(decision, context);
    case "first_fielding_event": {
      const fieldingEndpoint = findFirstFieldingEndpoint(
        decision,
        context,
        atBatById,
      );
      if (fieldingEndpoint) return fieldingEndpoint;

      // Defensive substitutions and position changes historically close at
      // half-inning/game end when no first fielding touch is logged. Keep that
      // compatibility shim explicit while all other matchup horizons stay open.
      if (!usesDefensiveDeploymentFallback(decision.decisionType)) {
        return null;
      }

      return (
        findHalfInningEndEndpoint(decision, timeline) ??
        findGameEndEndpoint(decision, context, timeline)
      );
    }
    default:
      return null;
  }
}

function findInningConsequenceResolutionEndpoint(
  decision: ManagerDecisionRecord,
  context: ResolveDecisionWindowsContext,
  timeline: TimelineEntry[],
): ResolutionEndpoint | null {
  if (decision.decisionType !== "intentional_walk") {
    return null;
  }

  switch (decision.resolutionWindow?.expectedEndpoint) {
    case "runner_consequence":
    case "runner_terminal":
    case "next_pa":
      return findIntentionalWalkConsequenceEndpoint(
        decision,
        context,
        timeline,
      );
    default:
      return null;
  }
}

function findPersonnelStintResolutionEndpoint(
  decision: ManagerDecisionRecord,
  timeline: TimelineEntry[],
): ResolutionEndpoint | null {
  switch (decision.resolutionWindow?.expectedEndpoint) {
    case "runner_terminal":
      return findRunnerTerminalEndpoint(decision, timeline);
    default:
      return null;
  }
}

function findNextPlateAppearanceEndpoint(
  decision: ManagerDecisionRecord,
  context: ResolveDecisionWindowsContext,
): ResolutionEndpoint | null {
  const trackedPlayerIds = new Set(
    decision.resolutionWindow?.trackedPlayerIds ?? [],
  );
  const startIndex = decision.resolutionWindow?.startEventIndex ?? -1;

  const endpoint = context.atBatEvents.find((event) => {
    if (event.eventIndex <= startIndex) return false;
    if (!isCompleteAtBatWindowEvent(event)) return false;
    if (!isSameHalf(decision, event.inning, event.halfInning)) return false;

    if (
      decision.decisionType === "pitching_change" ||
      decision.decisionType === "leave_pitcher_in"
    ) {
      return trackedPlayerIds.has(event.pitcherId);
    }

    if (
      decision.decisionType === "pinch_hitter" ||
      decision.decisionType === "let_batter_hit"
    ) {
      return trackedPlayerIds.has(event.batterId);
    }

    return true;
  });

  return endpoint ? endpointFromAtBat(endpoint, context.totalInnings, context) : null;
}

function findRunnerTerminalEndpoint(
  decision: ManagerDecisionRecord,
  timeline: TimelineEntry[],
): ResolutionEndpoint | null {
  const trackedRunnerIds = new Set(
    decision.resolutionWindow?.trackedRunnerIds ?? [],
  );
  if (trackedRunnerIds.size === 0) return null;

  const startIndex = decision.resolutionWindow?.startEventIndex ?? -1;
  for (const entry of timeline) {
    if (entry.eventIndex <= startIndex) continue;
    if (!isSameHalf(decision, entry.inning, entry.halfInning)) continue;

    const atBatTerminal = entry.atBat?.runnerOutcomes?.some(
      (outcome) =>
        trackedRunnerIds.has(outcome.runnerId) &&
        (outcome.toBase === "home" ||
          outcome.toBase === "out" ||
          outcome.toBase === "end"),
    );
    if (atBatTerminal) {
      return endpointFromTimelineEntry(entry);
    }

    const action = entry.betweenPlay?.runnerAction;
    if (
      action &&
      trackedRunnerIds.has(action.runnerId) &&
      (action.outcome === "out" || action.toBase === 4)
    ) {
      return endpointFromTimelineEntry(entry);
    }
  }

  return null;
}

function findIntentionalWalkConsequenceEndpoint(
  decision: ManagerDecisionRecord,
  context: ResolveDecisionWindowsContext,
  timeline: TimelineEntry[],
): ResolutionEndpoint | null {
  const walkedRunnerId = getTrackedIntentionalWalkRunnerId(decision);
  if (!walkedRunnerId) return null;

  const startIndex = decision.resolutionWindow?.startEventIndex ?? -1;
  const decisionEntry =
    timeline.find(
      (entry) =>
        entry.eventId === decision.decisionEventId &&
        entry.eventIndex === startIndex &&
        isSameHalf(decision, entry.inning, entry.halfInning),
    ) ?? null;
  let lastSameHalfEntry: TimelineEntry | null = decisionEntry;

  if (decisionEntry) {
    const sameEventConsequence = intentionalWalkConsequenceFromEntry(
      decisionEntry,
      walkedRunnerId,
    );
    const sameEventInningEnded =
      decisionEntry.outsAfter >= 3 || isWalkOffTimelineEntry(decisionEntry);

    if (sameEventConsequence || sameEventInningEnded) {
      return endpointFromIntentionalWalkEntry({
        decision,
        context,
        entry: decisionEntry,
        finalConsequence: sameEventConsequence ?? "stranded",
        inningEnded: sameEventInningEnded,
      });
    }
  }

  for (const entry of timeline) {
    if (entry.eventIndex <= startIndex) continue;

    if (!isSameHalf(decision, entry.inning, entry.halfInning)) {
      return lastSameHalfEntry
        ? endpointFromIntentionalWalkEntry({
            decision,
            context,
            entry: lastSameHalfEntry,
            finalConsequence: "stranded",
            inningEnded: true,
          })
        : null;
    }

    lastSameHalfEntry = entry;
    const terminalConsequence = intentionalWalkConsequenceFromEntry(
      entry,
      walkedRunnerId,
    );
    const inningEnded = entry.outsAfter >= 3 || isWalkOffTimelineEntry(entry);

    if (terminalConsequence || inningEnded) {
      return endpointFromIntentionalWalkEntry({
        decision,
        context,
        entry,
        finalConsequence: terminalConsequence ?? "stranded",
        inningEnded,
      });
    }
  }

  if (context.gameEnded && lastSameHalfEntry) {
    return endpointFromIntentionalWalkEntry({
      decision,
      context,
      entry: lastSameHalfEntry,
      finalConsequence: "stranded",
      inningEnded: true,
    });
  }

  return null;
}

function endpointFromIntentionalWalkEntry(input: {
  decision: ManagerDecisionRecord;
  context: ResolveDecisionWindowsContext;
  entry: TimelineEntry;
  finalConsequence: IntentionalWalkConsequenceStatus;
  inningEnded: boolean;
}): ResolutionEndpoint {
  const endpoint = endpointFromTimelineEntry(input.entry);
  const nextBatterPa = findNextPlateAppearanceAfterDecision(
    input.decision,
    input.context,
    endpoint.eventIndex,
  );

  return {
    ...endpoint,
    eventIds: uniqueStrings([nextBatterPa?.eventId, ...endpoint.eventIds]),
    explanationMetadata: buildIntentionalWalkExplanationMetadata({
      decision: input.decision,
      homeTeamId: input.context.homeTeamId,
      totalInnings: input.context.totalInnings,
      extraInningRunner: input.context.extraInningRunner,
      extraInningRunnerDelay: input.context.extraInningRunnerDelay,
      nextBatterPa,
      finalConsequenceEventId: endpoint.eventId,
      finalHomeWinProbabilityAfter: endpoint.homeWinProbabilityAfter,
      finalConsequence: input.finalConsequence,
      inningEnded: input.inningEnded,
    }),
  };
}

function intentionalWalkConsequenceFromEntry(
  entry: TimelineEntry,
  walkedRunnerId: string,
): IntentionalWalkConsequenceStatus | null {
  if (entry.atBat) {
    return intentionalWalkConsequenceFromAtBat(
      entry.atBat,
      walkedRunnerId,
    );
  }

  if (entry.betweenPlay) {
    return intentionalWalkConsequenceFromBetweenPlay(
      entry.betweenPlay,
      walkedRunnerId,
    );
  }

  return null;
}

function isWalkOffTimelineEntry(entry: TimelineEntry): boolean {
  return entry.atBat?.isWalkOff === true;
}

function intentionalWalkConsequenceFromAtBat(
  event: AtBatEvent,
  walkedRunnerId: string,
): IntentionalWalkConsequenceStatus | null {
  const runnerOutcome = event.runnerOutcomes?.find(
    (outcome) => outcome.runnerId === walkedRunnerId,
  );

  if (
    runScoredByRunner(event, walkedRunnerId) ||
    runnerOutcome?.toBase === "home" ||
    (runnerStateContains(event.runners, walkedRunnerId) &&
      (event.result === "HR" || event.result === "ITPHR"))
  ) {
    return "scored";
  }

  if (runnerOutcome?.toBase === "out") return "out";
  if (runnerOutcome?.toBase === "end") return "removed";

  if (
    runnerStateContains(event.runners, walkedRunnerId) &&
    !runnerStateContains(event.runnersAfter, walkedRunnerId) &&
    event.outsAfter < 3
  ) {
    return "removed";
  }

  return null;
}

function intentionalWalkConsequenceFromBetweenPlay(
  event: BetweenPlayEvent,
  walkedRunnerId: string,
): IntentionalWalkConsequenceStatus | null {
  const action = event.runnerAction;
  if (action?.runnerId === walkedRunnerId) {
    if (action.outcome === "out") return "out";
    if (action.toBase === 4) return "scored";
  }

  if (
    event.substitution?.subType === "pinch_run" &&
    event.substitution.outPlayerId === walkedRunnerId
  ) {
    return "removed";
  }

  return null;
}

function findFirstFieldingEndpoint(
  decision: ManagerDecisionRecord,
  context: ResolveDecisionWindowsContext,
  atBatById: Map<string, AtBatEvent>,
): ResolutionEndpoint | null {
  const trackedPlayerIds = new Set(
    decision.resolutionWindow?.trackedPlayerIds ?? [],
  );
  if (trackedPlayerIds.size === 0) {
    return null;
  }

  const startIndex = decision.resolutionWindow?.startEventIndex ?? -1;
  const candidates = context.fieldingEvents
    .map((fieldingEvent) => {
      const atBat = atBatById.get(fieldingEvent.atBatEventId);
      return atBat ? { fieldingEvent, atBat } : null;
    })
    .filter((candidate): candidate is {
      fieldingEvent: FieldingEvent;
      atBat: AtBatEvent;
    } => {
      if (!candidate) return false;
      if (
        trackedPlayerIds.size > 0 &&
        !trackedPlayerIds.has(candidate.fieldingEvent.playerId)
      ) {
        return false;
      }
      if (!isCompleteAtBatWindowEvent(candidate.atBat)) return false;
      if (candidate.atBat.eventIndex <= startIndex) return false;
      return isSameHalf(
        decision,
        candidate.atBat.inning,
        candidate.atBat.halfInning,
      );
    })
    .sort(
      (left, right) =>
        left.atBat.eventIndex - right.atBat.eventIndex ||
        left.fieldingEvent.sequence - right.fieldingEvent.sequence ||
        left.fieldingEvent.fieldingEventId.localeCompare(
          right.fieldingEvent.fieldingEventId,
        ),
    );

  const match = candidates[0];
  if (!match) return null;

  const endpoint = endpointFromAtBat(match.atBat, context.totalInnings, context);
  return {
    ...endpoint,
    eventId: match.fieldingEvent.fieldingEventId,
    eventIds: [match.fieldingEvent.fieldingEventId, match.atBat.eventId],
  };
}

function findHalfInningEndEndpoint(
  decision: ManagerDecisionRecord,
  timeline: TimelineEntry[],
): ResolutionEndpoint | null {
  const startIndex = decision.resolutionWindow?.startEventIndex ?? -1;
  let lastSameHalfEntry: TimelineEntry | null = null;

  for (const entry of timeline) {
    if (entry.eventIndex <= startIndex) continue;

    if (!isSameHalf(decision, entry.inning, entry.halfInning)) {
      return lastSameHalfEntry ? endpointFromTimelineEntry(lastSameHalfEntry) : null;
    }

    lastSameHalfEntry = entry;
    if (entry.outsAfter >= 3) {
      return endpointFromTimelineEntry(entry);
    }
  }

  return null;
}

function findGameEndEndpoint(
  decision: ManagerDecisionRecord,
  context: ResolveDecisionWindowsContext,
  timeline: TimelineEntry[],
): ResolutionEndpoint | null {
  if (!context.gameEnded) return null;

  const startIndex = decision.resolutionWindow?.startEventIndex ?? -1;
  const endpoint = [...timeline]
    .reverse()
    .find((entry) => entry.eventIndex >= startIndex);

  return endpoint ? endpointFromTimelineEntry(endpoint) : null;
}

function buildTimeline(context: ResolveDecisionWindowsContext): TimelineEntry[] {
  return [
    ...context.atBatEvents
      .filter(isCompleteAtBatWindowEvent)
      .map((event) => {
        const wpa = calculateAtBatWindow(event, context.totalInnings, context);
        return {
          kind: "at_bat" as const,
          eventId: event.eventId,
          eventIndex: event.eventIndex,
          inning: event.inning,
          halfInning: event.halfInning,
          outsAfter: event.outsAfter,
          homeWinProbabilityAfter: wpa.winProbabilityAfter,
          atBat: event,
        };
      }),
    ...context.betweenPlayEvents.map((event) => {
      const wpa = calculateBetweenPlayWindow(event, context.totalInnings, context);
      return {
        kind: "between_play" as const,
        eventId: event.eventId,
        eventIndex: event.eventIndex,
        inning: event.gameState?.inning ?? 1,
        halfInning: event.gameState?.halfInning ?? "TOP",
        outsAfter: getBetweenPlayOutsAfter(event),
        homeWinProbabilityAfter: wpa.winProbabilityAfter,
        betweenPlay: event,
      };
    }),
  ].sort(
    (left, right) =>
      left.eventIndex - right.eventIndex || left.eventId.localeCompare(right.eventId),
  );
}

function isCompleteAtBatWindowEvent(event: AtBatEvent): boolean {
  return (
    typeof event.inning === "number" &&
    (event.halfInning === "TOP" || event.halfInning === "BOTTOM") &&
    typeof event.outs === "number" &&
    typeof event.outsAfter === "number" &&
    typeof event.homeScore === "number" &&
    typeof event.awayScore === "number" &&
    typeof event.homeScoreAfter === "number" &&
    typeof event.awayScoreAfter === "number" &&
    Boolean(event.runners) &&
    Boolean(event.runnersAfter)
  );
}

function endpointFromAtBat(
  event: AtBatEvent,
  totalInnings?: number,
  extraPolicy?: ExtraInningRunnerPolicy,
): ResolutionEndpoint {
  const wpa = calculateAtBatWindow(event, totalInnings, extraPolicy);
  return {
    eventId: event.eventId,
    eventIds: [event.eventId],
    eventIndex: event.eventIndex,
    homeWinProbabilityAfter: wpa.winProbabilityAfter,
  };
}

function endpointFromTimelineEntry(entry: TimelineEntry): ResolutionEndpoint {
  return {
    eventId: entry.eventId,
    eventIds: [entry.eventId],
    eventIndex: entry.eventIndex,
    homeWinProbabilityAfter: entry.homeWinProbabilityAfter,
  };
}

function getTrackedIntentionalWalkRunnerId(
  decision: ManagerDecisionRecord,
): string | undefined {
  return (
    decision.resolutionWindow?.trackedRunnerIds[0] ??
    decision.explanationMetadata?.intentionalWalk?.walkedRunnerId ??
    decision.involvedPlayerIds[0]
  );
}

function findNextPlateAppearanceAfterDecision(
  decision: ManagerDecisionRecord,
  context: ResolveDecisionWindowsContext,
  maxEventIndex?: number,
): AtBatEvent | undefined {
  const startIndex = decision.resolutionWindow?.startEventIndex ?? -1;

  return context.atBatEvents.find((event) => {
    if (event.eventIndex <= startIndex) return false;
    if (maxEventIndex !== undefined && event.eventIndex > maxEventIndex) {
      return false;
    }
    if (!isCompleteAtBatWindowEvent(event)) return false;
    return isSameHalf(decision, event.inning, event.halfInning);
  });
}

function buildIntentionalWalkExplanationMetadata(input: {
  ibbEvent?: AtBatEvent;
  decision?: ManagerDecisionRecord;
  walkedRunnerId?: string;
  walkedRunnerName?: string;
  teamId?: string;
  homeTeamId?: string;
  totalInnings?: number;
  useGhostRunner?: boolean;
  extraInningRunner?: boolean;
  extraInningRunnerDelay?: 1 | 2;
  nextBatterPa?: AtBatEvent;
  finalConsequenceEventId?: string;
  finalHomeWinProbabilityAfter?: number;
  finalConsequence?: IntentionalWalkConsequenceStatus;
  inningEnded?: boolean;
}): ManagerDecisionExplanationMetadata | undefined {
  const existing = input.decision?.explanationMetadata?.intentionalWalk;
  const ibbEventId =
    input.ibbEvent?.eventId ??
    existing?.ibbEventId ??
    input.decision?.decisionEventId ??
    input.decision?.resolutionWindow?.startEventId;
  const walkedRunnerId =
    input.walkedRunnerId ??
    existing?.walkedRunnerId ??
    (input.decision
      ? getTrackedIntentionalWalkRunnerId(input.decision)
      : undefined);

  if (!ibbEventId || !walkedRunnerId) {
    return input.decision?.explanationMetadata;
  }

  return {
    intentionalWalk: {
      ibbEventId,
      walkedRunnerId,
      walkedRunnerName:
        input.walkedRunnerName ??
        existing?.walkedRunnerName ??
        input.ibbEvent?.batterName,
      walkedRunnerStartBase:
        input.ibbEvent && input.walkedRunnerId
          ? findRunnerBase(input.ibbEvent.runnersAfter, input.walkedRunnerId)
          : existing?.walkedRunnerStartBase,
      nextBatterEventId:
        input.nextBatterPa?.eventId ?? existing?.nextBatterEventId,
      nextBatterId: input.nextBatterPa?.batterId ?? existing?.nextBatterId,
      nextBatterName:
        input.nextBatterPa?.batterName ?? existing?.nextBatterName,
      nextBatterResult:
        input.nextBatterPa?.result ?? existing?.nextBatterResult,
      finalConsequenceEventId:
        input.finalConsequenceEventId ?? existing?.finalConsequenceEventId,
      finalConsequence:
        input.finalConsequence ?? existing?.finalConsequence,
      inningEnded: input.inningEnded ?? existing?.inningEnded,
      wpaComponents: buildIntentionalWalkWpaComponents({
        existing,
        ibbEvent: input.ibbEvent,
        decision: input.decision,
        teamId: input.teamId,
        homeTeamId: input.homeTeamId,
        totalInnings: input.totalInnings,
        useGhostRunner: input.useGhostRunner,
        extraInningRunner: input.extraInningRunner,
        extraInningRunnerDelay: input.extraInningRunnerDelay,
        finalHomeWinProbabilityAfter: input.finalHomeWinProbabilityAfter,
      }),
    },
  };
}

function buildIntentionalWalkWpaComponents(input: {
  existing?: NonNullable<
    ManagerDecisionExplanationMetadata["intentionalWalk"]
  >;
  ibbEvent?: AtBatEvent;
  decision?: ManagerDecisionRecord;
  teamId?: string;
  homeTeamId?: string;
  totalInnings?: number;
  useGhostRunner?: boolean;
  extraInningRunner?: boolean;
  extraInningRunnerDelay?: 1 | 2;
  finalHomeWinProbabilityAfter?: number;
}): NonNullable<
  NonNullable<
    ManagerDecisionExplanationMetadata["intentionalWalk"]
  >["wpaComponents"]
> | undefined {
  const existingComponents = input.existing?.wpaComponents;
  const teamId = input.teamId ?? input.decision?.teamId;
  const beforeIbbTeamWinProbability =
    existingComponents?.beforeIbbTeamWinProbability ??
    input.decision?.teamWinProbabilityBefore ??
    teamWinProbabilityFromAtBatWindow({
      event: input.ibbEvent,
      teamId,
      homeTeamId: input.homeTeamId,
      totalInnings: input.totalInnings,
      useGhostRunner: input.useGhostRunner,
      extraInningRunner: input.extraInningRunner,
      extraInningRunnerDelay: input.extraInningRunnerDelay,
      field: "winProbabilityBefore",
    });
  const afterIbbTeamWinProbability =
    existingComponents?.afterIbbTeamWinProbability ??
    teamWinProbabilityFromAtBatWindow({
      event: input.ibbEvent,
      teamId,
      homeTeamId: input.homeTeamId,
      totalInnings: input.totalInnings,
      useGhostRunner: input.useGhostRunner,
      extraInningRunner: input.extraInningRunner,
      extraInningRunnerDelay: input.extraInningRunnerDelay,
      field: "winProbabilityAfter",
    });

  if (
    beforeIbbTeamWinProbability === undefined ||
    afterIbbTeamWinProbability === undefined
  ) {
    return existingComponents;
  }

  const finalTeamWinProbability =
    input.finalHomeWinProbabilityAfter !== undefined &&
    teamId &&
    input.homeTeamId
      ? roundProbability(
          teamWinProbability(
            input.finalHomeWinProbabilityAfter,
            teamId,
            input.homeTeamId,
          ),
        )
      : existingComponents?.finalTeamWinProbability;
  const immediateRawWpa = roundWpa(
    afterIbbTeamWinProbability - beforeIbbTeamWinProbability,
  );

  if (finalTeamWinProbability === undefined) {
    return {
      beforeIbbTeamWinProbability,
      afterIbbTeamWinProbability,
      immediateRawWpa,
    };
  }

  return {
    beforeIbbTeamWinProbability,
    afterIbbTeamWinProbability,
    finalTeamWinProbability,
    immediateRawWpa,
    consequenceRawWpa: roundWpa(
      finalTeamWinProbability - afterIbbTeamWinProbability,
    ),
    netRawWpa: roundWpa(
      finalTeamWinProbability - beforeIbbTeamWinProbability,
    ),
  };
}

function teamWinProbabilityFromAtBatWindow(input: {
  event?: AtBatEvent;
  teamId?: string;
  homeTeamId?: string;
  totalInnings?: number;
  useGhostRunner?: boolean;
  extraInningRunner?: boolean;
  extraInningRunnerDelay?: 1 | 2;
  field: "winProbabilityBefore" | "winProbabilityAfter";
}): number | undefined {
  if (!input.event || !input.teamId || !input.homeTeamId) {
    return undefined;
  }

  const wpa = calculateAtBatWindow(input.event, input.totalInnings, input);
  return roundProbability(
    teamWinProbability(wpa[input.field], input.teamId, input.homeTeamId),
  );
}

function getExpectedEndpoint(
  decisionType: ManagerDecisionType,
): ManagerDecisionResolutionEndpoint {
  return RESOLUTION_ENDPOINT_BY_DECISION_TYPE[decisionType] ?? "same_event";
}

function getDecisionHorizon(
  decisionType: ManagerDecisionType,
): ManagerDecisionHorizon {
  return DECISION_HORIZON_BY_DECISION_TYPE[decisionType] ?? "single_play";
}

function usesDefensiveDeploymentFallback(
  decisionType: ManagerDecisionType,
): boolean {
  return decisionType === "defensive_sub" || decisionType === "position_change";
}

function buildResolutionWindow(
  input: ManagerDecisionResolutionWindow,
): ManagerDecisionResolutionWindow {
  return input;
}

function getTrackedPlayerIdsForBetweenPlayDecision(
  decisionType: ManagerDecisionType,
  event: BetweenPlayEvent,
  fallbackIds: string[],
): string[] {
  if (
    decisionType === "pitching_change" ||
    decisionType === "leave_pitcher_in"
  ) {
    return uniqueStrings([event.pitcherChange?.incomingPitcherId]);
  }

  if (decisionType === "keep_defender_in") {
    return fallbackIds;
  }

  if (
    decisionType === "pinch_hitter" ||
    decisionType === "pinch_runner" ||
    decisionType === "defensive_sub" ||
    decisionType === "position_change"
  ) {
    return uniqueStrings([event.substitution?.inPlayerId, ...fallbackIds]);
  }

  return fallbackIds;
}

function getTrackedRunnerIdsForBetweenPlayDecision(
  decisionType: ManagerDecisionType,
  event: BetweenPlayEvent,
  fallbackIds: string[],
): string[] {
  if (decisionType === "pinch_runner") {
    return uniqueStrings([event.substitution?.inPlayerId]);
  }

  if (
    decisionType === "steal_send" ||
    decisionType === "runner_hold" ||
    decisionType === "out_advancing_send"
  ) {
    return uniqueStrings([event.runnerAction?.runnerId, ...fallbackIds]);
  }

  return [];
}

function getBetweenPlayOutsAfter(event: BetweenPlayEvent): number {
  const before = event.gameState?.outs ?? 0;
  return Math.min(3, before + (event.runnerAction?.outcome === "out" ? 1 : 0));
}

function isSameHalf(
  decision: { inning: number; half: "top" | "bottom" },
  inning: number,
  halfInning: "TOP" | "BOTTOM",
): boolean {
  return (
    decision.inning === inning &&
    decision.half === (halfInning === "TOP" ? "top" : "bottom")
  );
}

function buildDecisionRecord(input: BuildDecisionInput): ManagerDecisionRecord {
  const share = MANAGER_WPA_SHARE_BY_DECISION_TYPE[input.decisionType];
  const decisionEventId = input.decisionEventId;
  const decisionKey = input.decisionKeySuffix
    ? `${decisionEventId}:${input.decisionKeySuffix}`
    : decisionEventId;
  const displayTitle = MANAGER_DECISION_LABELS[input.decisionType];

  return {
    decisionId: `${input.gameId}:${decisionKey}:${input.decisionType}`,
    gameId: input.gameId,
    managerId: input.managerId,
    teamId: input.teamId,
    opponentTeamId: input.opponentTeamId,
    decisionType: input.decisionType,
    inferenceMethod: input.inferenceMethod,
    decisionSource: input.decisionSource,
    confidence: input.confidence,
    inning: input.inning,
    half: input.halfInning === "TOP" ? "top" : "bottom",
    outs: input.outs,
    baseState: input.baseState,
    scoreDifferentialForTeam: input.scoreDifferentialForTeam,
    leverageIndex: input.leverageIndex,
    decisionEventId,
    linkedEventIds: input.linkedEventIds,
    involvedPlayerIds: input.involvedPlayerIds,
    teamWinProbabilityBefore: roundProbability(
      input.window.teamWinProbabilityBefore,
    ),
    teamWinProbabilityAfter:
      input.window.teamWinProbabilityAfter === undefined
        ? undefined
        : roundProbability(input.window.teamWinProbabilityAfter),
    rawWindowWpa: input.window.rawWindowWpa,
    managerShare: share,
    managerWpa: input.window.managerWpa,
    wpaModelVersion: WPA_MODEL_VERSION,
    resolved: input.resolved,
    resolvedAtEventId: input.resolvedAtEventId,
    resolutionWindow: input.resolutionWindow,
    explanationMetadata: input.explanationMetadata,
    displayTitle,
    displaySummary: `${displayTitle} for ${input.teamId}`,
    derivation: {
      derivedFromEventIds: input.linkedEventIds,
      derivedFromFields: input.derivedFromFields,
      manuallyPinned: input.manuallyPinned ?? false,
      stale: false,
    },
  };
}

function buildDecisionWindow(input: {
  teamId: string;
  homeTeamId: string;
  homeWinProbabilityBefore: number;
  homeWinProbabilityAfter?: number;
  decisionType: ManagerDecisionType;
}): DecisionWindow {
  const before = teamWinProbability(
    input.homeWinProbabilityBefore,
    input.teamId,
    input.homeTeamId,
  );
  if (input.homeWinProbabilityAfter === undefined) {
    return { teamWinProbabilityBefore: before };
  }

  const after = teamWinProbability(
    input.homeWinProbabilityAfter,
    input.teamId,
    input.homeTeamId,
  );
  const rawWindowWpa = roundWpa(after - before);
  const share = MANAGER_WPA_SHARE_BY_DECISION_TYPE[input.decisionType] ?? 0;

  return {
    teamWinProbabilityBefore: before,
    teamWinProbabilityAfter: after,
    rawWindowWpa,
    managerWpa: roundWpa(rawWindowWpa * share),
  };
}

type AtBatRunnerOutcome = NonNullable<AtBatEvent["runnerOutcomes"]>[number];
type CounterfactualBase = "first" | "second" | "third";
type CounterfactualBaseOccupancy = Record<CounterfactualBase, string | undefined>;

type OutAdvancingCounterfactualWindowResult =
  | {
      scored: true;
      window: DecisionWindow;
      metadata: ManagerOutAdvancingSendExplanationMetadata;
    }
  | {
      scored: false;
      metadata: ManagerOutAdvancingSendExplanationMetadata;
    };

function buildOutAdvancingSendCounterfactualWindow(input: {
  event: AtBatEvent;
  runnerOutcomeIndex?: number;
  teamId: string;
  homeTeamId: string;
  totalInnings?: number;
  useGhostRunner?: boolean;
  extraInningRunner?: boolean;
  extraInningRunnerDelay?: 1 | 2;
}): OutAdvancingCounterfactualWindowResult {
  const { event } = input;
  const outcome =
    input.runnerOutcomeIndex === undefined
      ? undefined
      : event.runnerOutcomes?.[input.runnerOutcomeIndex];
  if (!outcome) {
    return buildUnscoredOutAdvancingMetadata(
      "missing_runner_outcome",
      undefined,
    );
  }

  const holdBase = inferOutAdvancingHoldBase(event, outcome);
  if (!holdBase) {
    return buildUnscoredOutAdvancingMetadata(
      inferMissingHoldBaseReason(event, outcome),
      outcome,
    );
  }

  const counterfactualState = buildCounterfactualOutAdvancingState(
    event,
    outcome,
    holdBase.base,
  );
  if (!counterfactualState.scored) {
    return {
      scored: false,
      metadata: {
        ...baseOutAdvancingMetadata(outcome),
        inferredHoldBase: holdBase.base,
        holdBaseSource: holdBase.source,
        actualState: stateMetadataFromAtBatActual(event),
        unscoredReason: counterfactualState.reason,
      },
    };
  }

  const original = {
    inning: event.inning,
    isTop: event.halfInning === "TOP",
    outs: event.outs,
    bases: runnerStateToBases(event.runners),
    homeScore: event.homeScore,
    awayScore: event.awayScore,
    totalInnings: event.totalInnings ?? input.totalInnings,
    ...resolveAtBatExtraInningRunnerPolicy(event, input),
  };
  const actualWpa = calculateAtBatWindow(event, input.totalInnings, input);
  const counterfactualWpa = calculateWPA(original, {
    outs: counterfactualState.state.outs,
    bases: counterfactualState.state.bases,
    homeScore: counterfactualState.state.homeScore,
    awayScore: counterfactualState.state.awayScore,
  });
  const actualTeamWinProbability = roundProbability(
    teamWinProbability(
      actualWpa.winProbabilityAfter,
      input.teamId,
      input.homeTeamId,
    ),
  );
  const counterfactualTeamWinProbability = roundProbability(
    teamWinProbability(
      counterfactualWpa.winProbabilityAfter,
      input.teamId,
      input.homeTeamId,
    ),
  );
  const rawWindowWpa = roundWpa(
    actualTeamWinProbability - counterfactualTeamWinProbability,
  );
  const share = MANAGER_WPA_SHARE_BY_DECISION_TYPE.out_advancing_send ?? 0;
  const metadata: ManagerOutAdvancingSendExplanationMetadata = {
    ...baseOutAdvancingMetadata(outcome),
    inferredHoldBase: holdBase.base,
    holdBaseSource: holdBase.source,
    actualState: stateMetadataFromAtBatActual(event),
    counterfactualState: counterfactualState.metadata,
    actualTeamWinProbability,
    counterfactualTeamWinProbability,
    originalPlateAppearanceTeamWinProbabilityBefore: roundProbability(
      teamWinProbability(
        actualWpa.winProbabilityBefore,
        input.teamId,
        input.homeTeamId,
      ),
    ),
    rawCounterfactualWpa: rawWindowWpa,
  };

  return {
    scored: true,
    window: {
      teamWinProbabilityBefore: counterfactualTeamWinProbability,
      teamWinProbabilityAfter: actualTeamWinProbability,
      rawWindowWpa,
      managerWpa: roundWpa(rawWindowWpa * share),
    },
    metadata,
  };
}

function inferOutAdvancingHoldBase(
  event: AtBatEvent,
  outcome: AtBatRunnerOutcome,
): { base: CounterfactualBase; source: string } | null {
  const batterBase = hitBaseForResult(event.result);

  if (outcome.fromBase === "batter") {
    return batterBase
      ? { base: batterBase, source: `batter_safe_at_${batterBase}` }
      : null;
  }

  if (!batterBase) return null;

  if (outcome.fromBase === "second") {
    return {
      base: "third",
      source: "runner_from_second_safe_stop_third",
    };
  }

  if (outcome.fromBase === "first") {
    if (outcome.toBase === "third") {
      return {
        base: "second",
        source: "runner_from_first_safe_stop_second",
      };
    }
    if (outcome.toBase === "home") {
      return batterBase === "second" || batterBase === "third"
        ? {
            base: "third",
            source: "runner_from_first_safe_stop_third",
          }
        : null;
    }
    if (outcome.toBase === "out") {
      if (batterBase === "first") {
        return {
          base: "second",
          source: "runner_from_first_out_at_third_safe_stop_second",
        };
      }
      if (batterBase === "second" || batterBase === "third") {
        return {
          base: "third",
          source: "runner_from_first_out_at_home_safe_stop_third",
        };
      }
    }
  }

  return null;
}

function inferMissingHoldBaseReason(
  event: AtBatEvent,
  outcome: AtBatRunnerOutcome,
): ManagerOutAdvancingSendUnscoredReason {
  if (!hitBaseForResult(event.result)) return "missing_hit_context";
  if (outcome.fromBase === "third") return "missing_hold_base";
  return "missing_hold_base";
}

function buildCounterfactualOutAdvancingState(
  event: AtBatEvent,
  outcome: AtBatRunnerOutcome,
  holdBase: CounterfactualBase,
):
  | {
      scored: true;
      state: {
        outs: number;
        bases: { first: boolean; second: boolean; third: boolean };
        homeScore: number;
        awayScore: number;
      };
      metadata: ManagerOutAdvancingSendExplanationMetadata["counterfactualState"];
    }
  | {
      scored: false;
      reason: ManagerOutAdvancingSendUnscoredReason;
    } {
  const removedOut = outcome.toBase === "out" ? 1 : 0;
  const outs = event.outsAfter - removedOut;
  if (outs < event.outs || outs < 0) {
    return { scored: false, reason: "invalid_out_count" };
  }

  const occupancyResult = buildCounterfactualBaseOccupancy(
    event,
    outcome,
    holdBase,
  );
  if (!occupancyResult.scored) return occupancyResult;

  let awayScore = event.awayScoreAfter;
  let homeScore = event.homeScoreAfter;
  if (runScoredByRunner(event, outcome.runnerId) || outcome.toBase === "home") {
    if (event.halfInning === "TOP") awayScore -= 1;
    else homeScore -= 1;
  }
  if (awayScore < 0 || homeScore < 0) {
    return { scored: false, reason: "missing_hold_base" };
  }

  const bases =
    outs >= 3
      ? { first: false, second: false, third: false }
      : basesFromOccupancy(occupancyResult.occupancy);
  const metadata = {
    outs,
    awayScore,
    homeScore,
    bases,
  };

  return {
    scored: true,
    state: {
      outs,
      bases,
      homeScore,
      awayScore,
    },
    metadata,
  };
}

function buildCounterfactualBaseOccupancy(
  event: AtBatEvent,
  targetOutcome: AtBatRunnerOutcome,
  holdBase: CounterfactualBase,
):
  | { scored: true; occupancy: CounterfactualBaseOccupancy }
  | { scored: false; reason: ManagerOutAdvancingSendUnscoredReason } {
  const occupancy: CounterfactualBaseOccupancy = {
    first: undefined,
    second: undefined,
    third: undefined,
  };
  const addRunner = (
    base: CounterfactualBase,
    runnerId: string,
  ): ManagerOutAdvancingSendUnscoredReason | null => {
    const current = occupancy[base];
    if (current && current !== runnerId) return "base_conflict";
    occupancy[base] = runnerId;
    return null;
  };

  for (const [base, runner] of Object.entries(event.runnersAfter) as Array<
    [CounterfactualBase, RunnerState[CounterfactualBase]]
  >) {
    if (!runner || runner.runnerId === targetOutcome.runnerId) continue;
    const conflict = addRunner(base, runner.runnerId);
    if (conflict) return { scored: false, reason: conflict };
  }

  for (const outcome of event.runnerOutcomes ?? []) {
    if (outcome.runnerId === targetOutcome.runnerId) continue;
    const base = outcomeToCounterfactualBase(outcome.toBase);
    if (!base) continue;
    const conflict = addRunner(base, outcome.runnerId);
    if (conflict) return { scored: false, reason: conflict };
  }

  const batterBase = hitBaseForResult(event.result);
  const batterHasOutcome = (event.runnerOutcomes ?? []).some(
    (outcome) => outcome.runnerId === event.batterId,
  );
  const batterAlreadyOnBase = Object.values(occupancy).includes(event.batterId);
  if (
    targetOutcome.runnerId !== event.batterId &&
    !batterHasOutcome &&
    !batterAlreadyOnBase &&
    batterBase
  ) {
    const conflict = addRunner(batterBase, event.batterId);
    if (conflict) return { scored: false, reason: conflict };
  }

  const conflict = addRunner(holdBase, targetOutcome.runnerId);
  if (conflict) return { scored: false, reason: conflict };

  return { scored: true, occupancy };
}

function outcomeToCounterfactualBase(
  toBase: AtBatRunnerOutcome["toBase"],
): CounterfactualBase | null {
  if (toBase === "first" || toBase === "second" || toBase === "third") {
    return toBase;
  }
  return null;
}

function hitBaseForResult(result: AtBatEvent["result"]): CounterfactualBase | null {
  if (result === "1B") return "first";
  if (result === "2B" || result === "GRD") return "second";
  if (result === "3B") return "third";
  return null;
}

function basesFromOccupancy(occupancy: CounterfactualBaseOccupancy): {
  first: boolean;
  second: boolean;
  third: boolean;
} {
  return {
    first: Boolean(occupancy.first),
    second: Boolean(occupancy.second),
    third: Boolean(occupancy.third),
  };
}

function stateMetadataFromAtBatActual(
  event: AtBatEvent,
): ManagerOutAdvancingSendExplanationMetadata["actualState"] {
  return {
    outs: event.outsAfter,
    awayScore: event.awayScoreAfter,
    homeScore: event.homeScoreAfter,
    bases: runnerStateToBases(event.runnersAfter),
  };
}

function buildUnscoredOutAdvancingMetadata(
  reason: ManagerOutAdvancingSendUnscoredReason,
  outcome: AtBatRunnerOutcome | undefined,
): OutAdvancingCounterfactualWindowResult {
  return {
    scored: false,
    metadata: {
      ...baseOutAdvancingMetadata(outcome),
      unscoredReason: reason,
    },
  };
}

function baseOutAdvancingMetadata(
  outcome: AtBatRunnerOutcome | undefined,
): ManagerOutAdvancingSendExplanationMetadata {
  return {
    runnerId: outcome?.runnerId,
    runnerName: outcome?.runnerName,
    fromBase: outcome?.fromBase,
    actualToBase: outcome?.toBase,
  };
}

function calculateAtBatWindow(
  event: AtBatEvent,
  totalInnings?: number,
  extraPolicy?: ExtraInningRunnerPolicy,
) {
  const resolvedExtraPolicy = resolveAtBatExtraInningRunnerPolicy(
    event,
    extraPolicy,
  );
  const result = calculateWPA(
    {
      inning: event.inning,
      isTop: event.halfInning === "TOP",
      outs: event.outs,
      bases: runnerStateToBases(event.runners),
      homeScore: event.homeScore,
      awayScore: event.awayScore,
      totalInnings: event.totalInnings ?? totalInnings,
      ...resolvedExtraPolicy,
    },
    {
      outs: event.outsAfter,
      bases: runnerStateToBases(event.runnersAfter),
      homeScore: event.homeScoreAfter,
      awayScore: event.awayScoreAfter,
    },
  );

  return result;
}

function calculateBetweenPlayWindow(
  event: BetweenPlayEvent,
  totalInnings?: number,
  extraPolicy?: ExtraInningRunnerPolicy,
) {
  const gameState = event.gameState;
  if (!gameState) {
    return {
      winProbabilityBefore: 0.5,
      winProbabilityAfter: 0.5,
    };
  }

  const isTop = gameState.halfInning === "TOP";
  const beforeBases = {
    first: !!gameState.runnersOn?.first,
    second: !!gameState.runnersOn?.second,
    third: !!gameState.runnersOn?.third,
  };
  const afterBases = { ...beforeBases };
  let outsAfter = gameState.outs;
  let homeScoreAfter = gameState.score.home;
  let awayScoreAfter = gameState.score.away;

  const action = event.runnerAction;
  if (action) {
    const fromKey = runnerBaseKey(action.fromBase);
    const toKey = runnerBaseKey(action.toBase);
    if (fromKey) afterBases[fromKey] = false;

    if (action.outcome === "out") {
      outsAfter += 1;
    } else if (action.toBase === 4) {
      if (isTop) awayScoreAfter += 1;
      else homeScoreAfter += 1;
    } else if (toKey) {
      afterBases[toKey] = true;
    }
  }

  if (outsAfter >= 3) {
    afterBases.first = false;
    afterBases.second = false;
    afterBases.third = false;
  }

  return calculateWPA(
    {
      inning: gameState.inning,
      isTop,
      outs: gameState.outs,
      bases: beforeBases,
      homeScore: gameState.score.home,
      awayScore: gameState.score.away,
      totalInnings: gameState.totalInnings ?? totalInnings,
      useGhostRunner:
        gameState.useGhostRunner ?? extraPolicy?.useGhostRunner,
      extraInningRunner:
        gameState.extraInningRunner ?? extraPolicy?.extraInningRunner,
      extraInningRunnerDelay:
        gameState.extraInningRunnerDelay ??
        extraPolicy?.extraInningRunnerDelay,
    },
    {
      outs: outsAfter,
      bases: afterBases,
      homeScore: homeScoreAfter,
      awayScore: awayScoreAfter,
    },
  );
}

function resolveAtBatExtraInningRunnerPolicy(
  event: AtBatEvent,
  fallback?: ExtraInningRunnerPolicy,
): ExtraInningRunnerPolicy {
  return {
    useGhostRunner:
      event.useGhostRunner ?? fallback?.useGhostRunner,
    extraInningRunner:
      event.extraInningRunner ?? fallback?.extraInningRunner,
    extraInningRunnerDelay:
      event.extraInningRunnerDelay ?? fallback?.extraInningRunnerDelay,
  };
}

function inferBuntDecisionType(
  event: AtBatEvent,
): "bunt_call" | "squeeze_call" | null {
  const intent = event.enrichment?.managerBuntIntent;
  if (intent === "not_squeeze" || intent === "ambiguous_bunt") return null;
  if (intent === "bunt_call") return "bunt_call";
  if (intent === "squeeze_call") return "squeeze_call";

  const hasBuntContact =
    event.enrichment?.exitType === "bunt" ||
    event.ballInPlay?.trajectory === "bunt";
  if (!hasBuntContact) return null;

  return runnerFromThirdAttemptedHome(event) ? "squeeze_call" : "bunt_call";
}

function runnerFromThirdAttemptedHome(event: AtBatEvent): boolean {
  return (event.runnerOutcomes ?? []).some(
    (outcome) =>
      outcome.fromBase === "third" &&
      (outcome.toBase === "home" || outcome.toBase === "out"),
  );
}

function substitutionDecisionType(
  subType: NonNullable<BetweenPlayEvent["substitution"]>["subType"],
): ManagerDecisionType {
  if (subType === "pinch_hit") return "pinch_hitter";
  if (subType === "pinch_run") return "pinch_runner";
  if (subType === "defensive_replacement") return "defensive_sub";
  return "position_change";
}

function inferSubstitutionDecisionType(
  event: BetweenPlayEvent,
  input: DeriveManagerDecisionRecordsInput,
): ManagerDecisionType {
  const explicitType = substitutionDecisionType(event.substitution!.subType);
  if (explicitType !== "defensive_sub" && explicitType !== "position_change") {
    return explicitType;
  }

  const nextPlateAppearance = input.atBatEvents
    .filter((candidate) => {
      if (candidate.undoneAt) return false;
      if (candidate.eventIndex <= event.eventIndex) return false;
      if (candidate.inning !== event.gameState?.inning) return false;
      if (candidate.halfInning !== event.gameState?.halfInning) return false;
      return true;
    })
    .sort((left, right) => left.eventIndex - right.eventIndex)[0];

  if (nextPlateAppearance?.batterId === event.substitution?.inPlayerId) {
    return "pinch_hitter";
  }

  return explicitType;
}

function isDefensiveManagerDecision(decisionType: ManagerDecisionType): boolean {
  return (
    decisionType === "pitching_change" ||
    decisionType === "leave_pitcher_in" ||
    decisionType === "keep_defender_in" ||
    decisionType === "defensive_sub" ||
    decisionType === "position_change" ||
    decisionType === "intentional_walk"
  );
}

function teamWinProbability(
  homeWinProbability: number,
  teamId: string,
  homeTeamId: string,
): number {
  return teamId === homeTeamId ? homeWinProbability : 1 - homeWinProbability;
}

function scoreDifferentialForTeam(input: {
  teamId: string;
  homeTeamId: string;
  homeScore: number;
  awayScore: number;
}): number {
  return input.teamId === input.homeTeamId
    ? input.homeScore - input.awayScore
    : input.awayScore - input.homeScore;
}

function runnerStateToBases(runners: RunnerState) {
  return {
    first: !!runners.first,
    second: !!runners.second,
    third: !!runners.third,
  };
}

function runnerStateContains(runners: RunnerState, runnerId: string): boolean {
  return (
    runners.first?.runnerId === runnerId ||
    runners.second?.runnerId === runnerId ||
    runners.third?.runnerId === runnerId
  );
}

function findRunnerBase(
  runners: RunnerState,
  runnerId: string,
): "first" | "second" | "third" | undefined {
  if (runners.first?.runnerId === runnerId) return "first";
  if (runners.second?.runnerId === runnerId) return "second";
  if (runners.third?.runnerId === runnerId) return "third";
  return undefined;
}

function runScoredByRunner(event: AtBatEvent, runnerId: string): boolean {
  return Array.isArray(event.runsScored)
    ? event.runsScored.includes(runnerId)
    : false;
}

function formatRunnerState(runners: RunnerState): string {
  return formatBases({
    first: !!runners.first,
    second: !!runners.second,
    third: !!runners.third,
  });
}

function formatBetweenPlayBaseState(
  runnersOn?: NonNullable<BetweenPlayEvent["gameState"]>["runnersOn"],
): string {
  return formatBases({
    first: !!runnersOn?.first,
    second: !!runnersOn?.second,
    third: !!runnersOn?.third,
  });
}

function formatBases(bases: {
  first: boolean;
  second: boolean;
  third: boolean;
}): string {
  if (!bases.first && !bases.second && !bases.third) return "empty";
  return `${bases.first ? "1" : "-"}${bases.second ? "2" : "-"}${
    bases.third ? "3" : "-"
  }`;
}

function runnerBaseKey(
  base: 1 | 2 | 3 | 4,
): "first" | "second" | "third" | null {
  if (base === 1) return "first";
  if (base === 2) return "second";
  if (base === 3) return "third";
  return null;
}

function firstLinkedEventIndex(
  decision: ManagerDecisionRecord,
  atBatEvents: AtBatEvent[],
  betweenPlayEvents: BetweenPlayEvent[],
): number {
  const ids = new Set(decision.linkedEventIds);
  const event =
    atBatEvents.find((candidate) => ids.has(candidate.eventId)) ??
    betweenPlayEvents.find((candidate) => ids.has(candidate.eventId));
  return event?.eventIndex ?? Number.MAX_SAFE_INTEGER;
}

function uniqueStrings(values: Array<string | undefined>): string[] {
  return Array.from(
    new Set(values.filter((value): value is string => Boolean(value))),
  );
}

function roundWpa(value: number): number {
  return Math.round(value * 10000) / 10000;
}

function roundProbability(value: number): number {
  return Math.round(value * 10000) / 10000;
}
