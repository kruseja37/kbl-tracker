import { calculateWPA } from "../engines/wpaCalculator";
import { WPA_MODEL_VERSION } from "../engines/wpaV2";
import type {
  AtBatEvent,
  BetweenPlayEvent,
  FieldingEvent,
  RunnerState,
} from "./eventLog";
import type {
  ManagerAssignment,
  ManagerDecisionConfidence,
  ManagerDecisionRecord,
  ManagerDecisionResolutionEndpoint,
  ManagerDecisionResolutionWindow,
  ManagerDecisionSource,
  ManagerDecisionStandards,
  ManagerDecisionType,
  ManagerInferenceMethod,
} from "../types/managerWpa";
import {
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
  gameEnded?: boolean;
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

  const decisions = [
    ...atBatEvents.flatMap((event) =>
      deriveAtBatManagerDecisions(event, input, gameId),
    ),
    ...managerBetweenPlayEvents.flatMap((event) =>
      deriveBetweenPlayManagerDecisions(event, input, gameId),
    ),
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
        }),
      );
    }
  }

  return decisions;
}

function buildAtBatDecision(params: {
  event: AtBatEvent;
  input: ManagerAssignmentResolutionInput & { totalInnings?: number };
  gameId: string;
  decisionType: ManagerDecisionType;
  decisionSource: ManagerDecisionSource;
  confidence: ManagerDecisionConfidence;
  involvedPlayerIds: string[];
  derivedFromFields: string[];
  decisionIdSuffix?: string;
}): ManagerDecisionRecord {
  const { event, input, decisionType } = params;
  const attribution = resolveManagerAttributionForDecision(
    decisionType,
    event.halfInning,
    input,
  );
  const expectedEndpoint = getExpectedEndpoint(decisionType);
  const resolvesSameEvent = expectedEndpoint === "same_event";
  const wpa = calculateAtBatWindow(event, input.totalInnings);
  const window = buildDecisionWindow({
    teamId: attribution.teamId,
    homeTeamId: input.homeTeamId,
    homeWinProbabilityBefore: wpa.winProbabilityBefore,
    homeWinProbabilityAfter: resolvesSameEvent
      ? wpa.winProbabilityAfter
      : undefined,
    decisionType,
  });
  const trackedPlayerIds = uniqueStrings(params.involvedPlayerIds);

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
    involvedPlayerIds: trackedPlayerIds,
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
      trackedRunnerIds: trackedPlayerIds,
      maxEventIndex: resolvesSameEvent ? event.eventIndex : undefined,
    }),
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

  if (
    event.type === "manager_moment" &&
    event.managerMoment?.decisionType === "defensive_alignment"
  ) {
    return [
      buildBetweenPlayDecision({
        event,
        input,
        gameId,
        decisionType: "defensive_alignment",
        decisionSource: "manual_edit",
        confidence: "low",
        involvedPlayerIds: [],
        derivedFromFields: ["managerMoment.decisionType", "managerMoment.context"],
        resolved: false,
      }),
    ];
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
): decisionType is "leave_pitcher_in" | "let_batter_hit" {
  return decisionType === "leave_pitcher_in" || decisionType === "let_batter_hit";
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
  const wpa = calculateBetweenPlayWindow(event, input.totalInnings);
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
  input: ManagerAssignmentResolutionInput & { totalInnings?: number };
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
    params.resolved || expectedEndpoint === "same_event";
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
  const wpa = calculateBetweenPlayWindow(event, input.totalInnings);
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
    return {
      ...decision,
      teamWinProbabilityAfter: undefined,
      rawWindowWpa: undefined,
      managerWpa: undefined,
      resolved: false,
      resolvedAtEventId: undefined,
      resolutionWindow: {
        ...window,
        status: "pending",
        maxEventIndex: undefined,
      },
      linkedEventIds: uniqueStrings([decision.decisionEventId]),
      derivation: {
        ...decision.derivation,
        derivedFromEventIds: uniqueStrings([decision.decisionEventId]),
      },
    };
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

function findResolutionEndpoint(
  decision: ManagerDecisionRecord,
  context: ResolveDecisionWindowsContext,
  timeline: TimelineEntry[],
  atBatById: Map<string, AtBatEvent>,
): ResolutionEndpoint | null {
  switch (decision.resolutionWindow?.expectedEndpoint) {
    case "next_pa":
    case "same_player_pa":
      return (
        findNextPlateAppearanceEndpoint(decision, context) ??
        findHalfInningEndEndpoint(decision, timeline) ??
        findGameEndEndpoint(decision, context, timeline)
      );
    case "runner_terminal":
      return (
        findRunnerTerminalEndpoint(decision, timeline) ??
        findHalfInningEndEndpoint(decision, timeline) ??
        findGameEndEndpoint(decision, context, timeline)
      );
    case "first_fielding_event": {
      const fieldingEndpoint = findFirstFieldingEndpoint(
        decision,
        context,
        atBatById,
      );
      if (fieldingEndpoint) return fieldingEndpoint;
      if (decision.decisionType === "defensive_alignment") return null;
      return (
        findHalfInningEndEndpoint(decision, timeline) ??
        findGameEndEndpoint(decision, context, timeline)
      );
    }
    case "half_inning_end":
      return (
        findHalfInningEndEndpoint(decision, timeline) ??
        findGameEndEndpoint(decision, context, timeline)
      );
    case "game_end":
      return findGameEndEndpoint(decision, context, timeline);
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
      return trackedPlayerIds.size === 0 || trackedPlayerIds.has(event.pitcherId);
    }

    if (
      decision.decisionType === "pinch_hitter" ||
      decision.decisionType === "let_batter_hit"
    ) {
      return trackedPlayerIds.size === 0 || trackedPlayerIds.has(event.batterId);
    }

    return true;
  });

  return endpoint ? endpointFromAtBat(endpoint, context.totalInnings) : null;
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

function findFirstFieldingEndpoint(
  decision: ManagerDecisionRecord,
  context: ResolveDecisionWindowsContext,
  atBatById: Map<string, AtBatEvent>,
): ResolutionEndpoint | null {
  const trackedPlayerIds = new Set(
    decision.resolutionWindow?.trackedPlayerIds ?? [],
  );
  if (
    trackedPlayerIds.size === 0 &&
    decision.decisionType !== "defensive_alignment"
  ) {
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

  const endpoint = endpointFromAtBat(match.atBat, context.totalInnings);
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
        const wpa = calculateAtBatWindow(event, context.totalInnings);
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
      const wpa = calculateBetweenPlayWindow(event, context.totalInnings);
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
): ResolutionEndpoint {
  const wpa = calculateAtBatWindow(event, totalInnings);
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

function getExpectedEndpoint(
  decisionType: ManagerDecisionType,
): ManagerDecisionResolutionEndpoint {
  return RESOLUTION_ENDPOINT_BY_DECISION_TYPE[decisionType] ?? "same_event";
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
  decision: ManagerDecisionRecord,
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

function calculateAtBatWindow(event: AtBatEvent, totalInnings?: number) {
  const result = calculateWPA(
    {
      inning: event.inning,
      isTop: event.halfInning === "TOP",
      outs: event.outs,
      bases: runnerStateToBases(event.runners),
      homeScore: event.homeScore,
      awayScore: event.awayScore,
      totalInnings: event.totalInnings ?? totalInnings,
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
      totalInnings,
    },
    {
      outs: outsAfter,
      bases: afterBases,
      homeScore: homeScoreAfter,
      awayScore: awayScoreAfter,
    },
  );
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
    decisionType === "defensive_sub" ||
    decisionType === "position_change" ||
    decisionType === "intentional_walk" ||
    decisionType === "defensive_alignment"
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
