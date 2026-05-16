import type {
  IntentionalWalkConsequenceStatus,
  ManagerDecisionRecord,
  ManagerDecisionResolutionEndpoint,
  ManagerDecisionType,
  ManagerDeploymentLinkedOutcome,
  ManagerDeploymentRole,
  ManagerDeploymentStintRecord,
  ManagerLineupDeltaRecord,
  ManagerOutAdvancingSendStateMetadata,
  ManagerOutAdvancingSendUnscoredReason,
} from "../types/managerWpa";

export type ManagerValueTraceLayer = "tactical" | "deployment" | "lineup";

export interface ManagerValueTraceLinkedOutcome {
  eventId: string;
  source: ManagerDeploymentLinkedOutcome["source"];
  role: ManagerDeploymentLinkedOutcome["role"];
  rawWpa: number;
  weight: number;
  weightedWpa: number;
}

export interface ManagerValueTraceComponent {
  key: string;
  label: string;
  value?: number;
  valueLabel?: string;
  description?: string;
}

export interface ManagerValueTraceRow {
  recordId: string;
  managerId: string;
  teamId: string;
  layer: ManagerValueTraceLayer;
  label: string;
  decisionType?: ManagerDecisionType;
  deploymentRole?: ManagerDeploymentRole;
  sourceEventId?: string;
  endpointEventId?: string;
  linkedEventIds: string[];
  linkedOutcomes: ManagerValueTraceLinkedOutcome[];
  components: ManagerValueTraceComponent[];
  rawWpa?: number;
  share?: number;
  cap?: number;
  finalValue?: number;
  scoring: boolean;
  pending: boolean;
  compatibilityOnly: boolean;
  description: string;
}

export interface BuildManagerValueTraceRowsInput {
  managerDecisions?: ManagerDecisionRecord[];
  managerDeploymentStints?: ManagerDeploymentStintRecord[];
  managerLineupDeltas?: ManagerLineupDeltaRecord[];
}

const TRACE_LAYER_ORDER: Record<ManagerValueTraceLayer, number> = {
  tactical: 0,
  deployment: 1,
  lineup: 2,
};

export function isCompatibilityOnlyManagerDecision(
  decision: ManagerDecisionRecord,
): boolean {
  return decision.decisionType === "defensive_alignment";
}

export function isActiveScoringManagerDecision(
  decision: ManagerDecisionRecord,
): decision is ManagerDecisionRecord & { managerWpa: number } {
  return (
    !isCompatibilityOnlyManagerDecision(decision) &&
    decision.resolved &&
    typeof decision.managerWpa === "number"
  );
}

export function buildManagerValueTraceRows(
  input: BuildManagerValueTraceRowsInput,
): ManagerValueTraceRow[] {
  return [
    ...(input.managerDecisions ?? []).map(traceRowForDecision),
    ...(input.managerDeploymentStints ?? []).map(traceRowForDeploymentStint),
    ...(input.managerLineupDeltas ?? []).map(traceRowForLineupDelta),
  ].sort(compareTraceRows);
}

function traceRowForDecision(decision: ManagerDecisionRecord): ManagerValueTraceRow {
  const compatibilityOnly = isCompatibilityOnlyManagerDecision(decision);
  const scoring = isActiveScoringManagerDecision(decision);
  const pending = !compatibilityOnly && !scoring;
  const components = traceComponentsForDecision(decision);

  return {
    recordId: decision.decisionId,
    managerId: decision.managerId,
    teamId: decision.teamId,
    layer: "tactical",
    label: decision.displayTitle || titleCase(decision.decisionType),
    decisionType: decision.decisionType,
    sourceEventId: decision.decisionEventId,
    endpointEventId: decision.resolvedAtEventId,
    linkedEventIds: uniqueSortedStrings(decision.linkedEventIds),
    linkedOutcomes: [],
    components,
    rawWpa: compatibilityOnly ? undefined : decision.rawWindowWpa,
    share: compatibilityOnly ? undefined : decision.managerShare,
    cap: undefined,
    finalValue: scoring ? decision.managerWpa : undefined,
    scoring,
    pending,
    compatibilityOnly,
    description: describeDecision(decision, {
      compatibilityOnly,
      pending,
    }),
  };
}

function traceRowForDeploymentStint(
  stint: ManagerDeploymentStintRecord,
): ManagerValueTraceRow {
  const scoring = isResolvedDeploymentStint(stint);
  const linkedOutcomes = sortLinkedOutcomes(stint.linkedOutcomes ?? []);

  return {
    recordId: stint.stintId,
    managerId: stint.managerId,
    teamId: stint.teamId,
    layer: "deployment",
    label: formatDeploymentRole(stint.deploymentRole),
    deploymentRole: stint.deploymentRole,
    sourceEventId: stint.sourceEventId,
    endpointEventId: stint.closedAtEventId,
    linkedEventIds: uniqueSortedStrings(stint.linkedEventIds),
    linkedOutcomes,
    components: [],
    rawWpa: stint.rawLinkedWpa,
    share: stint.managerShare,
    cap: stint.cap,
    finalValue: scoring ? stint.managerDeploymentWpa : undefined,
    scoring,
    pending: !scoring,
    compatibilityOnly: false,
    description: describeDeploymentStint(stint, linkedOutcomes),
  };
}

function traceRowForLineupDelta(
  delta: ManagerLineupDeltaRecord,
): ManagerValueTraceRow {
  return {
    recordId: delta.decisionId,
    managerId: delta.managerId,
    teamId: delta.teamId,
    layer: "lineup",
    label: "Lineup Delta",
    decisionType: delta.decisionType,
    linkedEventIds: [],
    linkedOutcomes: [],
    components: [],
    rawWpa: delta.actualVsOptimalProjection ?? delta.rawPerformanceDelta,
    share: delta.managerShare,
    cap: delta.capApplied,
    finalValue: delta.managerWpa,
    scoring: true,
    pending: false,
    compatibilityOnly: false,
    description: describeLineupDelta(delta),
  };
}

function describeDecision(
  decision: ManagerDecisionRecord,
  state: { compatibilityOnly: boolean; pending: boolean },
): string {
  if (state.compatibilityOnly) {
    return "Legacy defensive alignment note only; no Manager Value scoring.";
  }

  if (state.pending) {
    if (decision.decisionType === "out_advancing_send") {
      const reason = decision.explanationMetadata?.outAdvancingSend?.unscoredReason;
      if (reason) {
        return `Runner send not scored: ${formatOutAdvancingUnscoredReason(reason)}.`;
      }
    }

    return `Pending ${decision.displayTitle || titleCase(decision.decisionType)}: waiting for ${formatEndpointWait(decision.resolutionWindow?.expectedEndpoint)} before Manager Value is scored.`;
  }

  switch (decision.decisionType) {
    case "intentional_walk":
      return describeIntentionalWalkDecision(decision);
    case "out_advancing_send":
      return describeOutAdvancingSendDecision(decision);
    case "leave_pitcher_in":
      return "Stayed with the pitcher for the next plate appearance.";
    case "let_batter_hit":
      return "Let the current batter hit instead of going to the bench.";
    case "pinch_hitter":
      return "Pinch hitter decision judged on the next plate appearance.";
    case "pinch_runner":
      return "Pinch runner decision tracked until that runner's terminal base outcome.";
    case "pitching_change":
      return "Pitching change judged on the new pitcher's next plate appearance.";
    case "defensive_sub":
      return "Defensive substitution tracked to the first fielding chance.";
    case "position_change":
      return "Position change tracked to the first fielding chance.";
    default:
      return `${decision.displayTitle || titleCase(decision.decisionType)} credited from linked game events.`;
  }
}

function traceComponentsForDecision(
  decision: ManagerDecisionRecord,
): ManagerValueTraceComponent[] {
  if (decision.decisionType === "intentional_walk") {
    return traceComponentsForIntentionalWalk(decision);
  }

  if (decision.decisionType === "out_advancing_send") {
    return traceComponentsForOutAdvancingSend(decision);
  }

  return [];
}

function traceComponentsForIntentionalWalk(
  decision: ManagerDecisionRecord,
): ManagerValueTraceComponent[] {
  const metadata = decision.explanationMetadata?.intentionalWalk;
  const components = metadata?.wpaComponents;
  if (!components) return [];

  const outcomeText = metadata.finalConsequence
    ? formatIntentionalWalkConsequence(metadata.finalConsequence)
    : undefined;
  const nextBatterText = metadata.nextBatterResult
    ? `Next batter: ${metadata.nextBatterResult}.`
    : undefined;

  const rows: ManagerValueTraceComponent[] = [
    {
      key: "ibb_immediate_cost",
      label: "Immediate IBB cost",
      value: components.immediateRawWpa,
      description: `Before IBB ${formatTraceProbability(components.beforeIbbTeamWinProbability)} -> after IBB ${formatTraceProbability(components.afterIbbTeamWinProbability)}.`,
    },
  ];

  if (
    typeof components.consequenceRawWpa === "number" &&
    typeof components.finalTeamWinProbability === "number"
  ) {
    rows.push({
      key: "ibb_consequence_payoff",
      label: "Consequence payoff",
      value: components.consequenceRawWpa,
      description: [
        `After IBB ${formatTraceProbability(components.afterIbbTeamWinProbability)} -> final ${formatTraceProbability(components.finalTeamWinProbability)}.`,
        nextBatterText,
        outcomeText,
      ]
        .filter(Boolean)
        .join(" "),
    });
  }

  if (
    typeof components.netRawWpa === "number" &&
    typeof components.finalTeamWinProbability === "number"
  ) {
    rows.push({
      key: "ibb_official_net",
      label: "Official net",
      value: components.netRawWpa,
      description: [
        `Before IBB ${formatTraceProbability(components.beforeIbbTeamWinProbability)} -> final ${formatTraceProbability(components.finalTeamWinProbability)}.`,
        outcomeText,
      ]
        .filter(Boolean)
        .join(" "),
    });
  }

  return rows;
}

function traceComponentsForOutAdvancingSend(
  decision: ManagerDecisionRecord,
): ManagerValueTraceComponent[] {
  const metadata = decision.explanationMetadata?.outAdvancingSend;
  if (!metadata) return [];

  if (metadata.unscoredReason) {
    return [
      {
        key: "runner_send_unscored_reason",
        label: "Unscored runner-send reason",
        description: `Counterfactual unavailable: ${formatOutAdvancingUnscoredReason(metadata.unscoredReason)}.`,
      },
    ];
  }

  const rows: ManagerValueTraceComponent[] = [];

  if (metadata.actualState) {
    rows.push({
      key: "runner_send_actual_state",
      label: "Actual after-state",
      valueLabel:
        typeof metadata.actualTeamWinProbability === "number"
          ? formatTraceProbability(metadata.actualTeamWinProbability)
          : undefined,
      description: formatOutAdvancingState(metadata.actualState),
    });
  }

  if (metadata.counterfactualState) {
    rows.push({
      key: "runner_send_counterfactual_state",
      label: "Counterfactual hold/stop state",
      valueLabel:
        typeof metadata.counterfactualTeamWinProbability === "number"
          ? formatTraceProbability(metadata.counterfactualTeamWinProbability)
          : undefined,
      description: [
        metadata.inferredHoldBase
          ? `Compared with holding at ${formatBase(metadata.inferredHoldBase)}.`
          : undefined,
        formatOutAdvancingState(metadata.counterfactualState),
      ]
        .filter(Boolean)
        .join(" "),
    });
  }

  if (typeof metadata.actualTeamWinProbability === "number") {
    rows.push({
      key: "runner_send_actual_team_wp",
      label: "Actual team WP",
      valueLabel: formatTraceProbability(metadata.actualTeamWinProbability),
    });
  }

  if (typeof metadata.counterfactualTeamWinProbability === "number") {
    rows.push({
      key: "runner_send_counterfactual_team_wp",
      label: "Counterfactual team WP",
      valueLabel: formatTraceProbability(metadata.counterfactualTeamWinProbability),
    });
  }

  if (typeof metadata.rawCounterfactualWpa === "number") {
    rows.push({
      key: "runner_send_raw_counterfactual_wpa",
      label: "Raw counterfactual WPA",
      value: metadata.rawCounterfactualWpa,
      description: metadata.holdBaseSource
        ? `Hold inference: ${formatHoldBaseSource(metadata.holdBaseSource)}.`
        : undefined,
    });
  }

  if (metadata.inferredHoldBase) {
    rows.push({
      key: "runner_send_hold_base",
      label: "Inferred hold base",
      valueLabel: formatBase(metadata.inferredHoldBase),
      description: metadata.holdBaseSource
        ? formatHoldBaseSource(metadata.holdBaseSource)
        : undefined,
    });
  }

  return rows;
}

function describeIntentionalWalkDecision(decision: ManagerDecisionRecord): string {
  const metadata = decision.explanationMetadata?.intentionalWalk;
  const walkedRunner = metadata?.walkedRunnerName ?? "the walked batter";
  const nextBatter = metadata?.nextBatterName
    ? ` to face ${metadata.nextBatterName}`
    : "";
  const nextResult = metadata?.nextBatterResult
    ? `, who ended with ${metadata.nextBatterResult}`
    : "";
  const consequence = metadata?.finalConsequence
    ? `; ${formatIntentionalWalkConsequence(metadata.finalConsequence)}.`
    : ".";

  return `IBB put ${walkedRunner} on base${nextBatter}${nextResult}${consequence}`;
}

function describeOutAdvancingSendDecision(decision: ManagerDecisionRecord): string {
  const metadata = decision.explanationMetadata?.outAdvancingSend;
  if (metadata?.inferredHoldBase) {
    return `Runner send compared the actual out with holding at ${formatBase(metadata.inferredHoldBase)}.`;
  }

  return "Runner send credited from the isolated send decision.";
}

function formatIntentionalWalkConsequence(
  status: IntentionalWalkConsequenceStatus,
): string {
  switch (status) {
    case "scored":
      return "the walked runner scored";
    case "out":
      return "the walked runner was retired";
    case "removed":
      return "the walked runner was lifted before scoring";
    case "stranded":
      return "the walked runner was stranded";
  }
}

function formatOutAdvancingUnscoredReason(
  reason: ManagerOutAdvancingSendUnscoredReason,
): string {
  switch (reason) {
    case "missing_runner_outcome":
      return "runner outcome data was missing";
    case "unsupported_between_play_counterfactual":
      return "between-play runner advancement does not yet have a provable hold state";
    case "missing_hit_context":
      return "the hit context was not enough to infer a safe hold base";
    case "missing_hold_base":
      return "the safe hold base could not be inferred";
    case "base_conflict":
      return "the inferred hold state conflicted with another runner";
    case "invalid_out_count":
      return "the inferred out count was invalid";
  }
}

function formatOutAdvancingState(
  state: ManagerOutAdvancingSendStateMetadata,
): string {
  return `${formatOutCount(state.outs)}, ${formatBases(state.bases)}, score ${state.awayScore}-${state.homeScore}.`;
}

function formatOutCount(outs: number): string {
  return `${outs} ${outs === 1 ? "out" : "outs"}`;
}

function formatBases(bases: ManagerOutAdvancingSendStateMetadata["bases"]): string {
  const occupied = [
    bases.first ? "1B" : undefined,
    bases.second ? "2B" : undefined,
    bases.third ? "3B" : undefined,
  ].filter(Boolean);

  return occupied.length ? `${occupied.join("/")} occupied` : "bases empty";
}

function formatBase(base: "first" | "second" | "third"): string {
  switch (base) {
    case "first":
      return "1B";
    case "second":
      return "2B";
    case "third":
      return "3B";
  }
}

function formatHoldBaseSource(source: string): string {
  return source.replace(/_/g, " ");
}

function formatTraceProbability(value: number): string {
  return `${(value * 100).toFixed(1)}% WP`;
}

function describeDeploymentStint(
  stint: ManagerDeploymentStintRecord,
  linkedOutcomes: ManagerValueTraceLinkedOutcome[],
): string {
  const player = stint.playerName ?? stint.playerId;
  const weightedSummary = describeLinkedOutcomeWeights(linkedOutcomes);

  switch (stint.deploymentRole) {
    case "kept_position_player_in":
    case "kept_defender_in":
    case "kept_pitcher_in":
    case "kept_in":
      return `Kept ${player} in after the prompt; later ${weightedSummary || "linked"} outcomes carry deployment weights.`;
    case "pinch_hitter_remaining":
      return `After the pinch-hit plate appearance, ${player}'s remaining batting, running, and fielding value stays with the deployment choice.`;
    case "pinch_runner":
      return `Pinch runner ${player}'s remaining baserunning and fielding outcomes stay with the deployment choice.`;
    case "pitcher":
      return `New pitcher ${player}'s later pitching outcomes count after the initial change plate appearance.`;
    case "defensive_position":
      return `Defensive sub or position change for ${player} tracks later fielding outcomes.`;
    case "manual_deployment":
      return `Manual deployment for ${player} tracks later linked outcomes.`;
  }
}

function describeLineupDelta(delta: ManagerLineupDeltaRecord): string {
  return `Lineup Delta: chose ${formatLineupSlot(
    delta.chosenPlayerName ?? delta.starterPlayerName,
    delta.chosenBattingOrderSlot ?? delta.battingOrderSlot,
    delta.chosenDefensivePosition ?? delta.defensivePosition,
  )} instead of optimal ${formatLineupSlot(
    delta.optimalPlayerName,
    delta.optimalBattingOrderSlot,
    delta.optimalDefensivePosition,
  )}; actual value was compared to the optimal projection.`;
}

function formatEndpointWait(
  endpoint: ManagerDecisionResolutionEndpoint | undefined,
): string {
  switch (endpoint) {
    case "same_event":
      return "the current play";
    case "next_pa":
      return "the next plate appearance";
    case "same_player_pa":
      return "that player's next plate appearance";
    case "runner_consequence":
    case "runner_terminal":
      return "the runner's inning consequence";
    case "first_fielding_event":
      return "the first fielding chance";
    case "half_inning_end":
      return "the half-inning to end";
    case "game_end":
      return "the game to end";
    default:
      return "the linked outcome";
  }
}

function formatDeploymentRole(role: ManagerDeploymentRole): string {
  switch (role) {
    case "pinch_hitter_remaining":
      return "Pinch hitter remaining";
    case "pinch_runner":
      return "Pinch runner";
    case "defensive_position":
      return "Defensive position";
    case "pitcher":
      return "Pitcher";
    case "kept_position_player_in":
      return "Kept position player in";
    case "kept_defender_in":
      return "Kept defender in";
    case "kept_pitcher_in":
      return "Kept pitcher in";
    case "kept_in":
      return "Kept in";
    case "manual_deployment":
      return "Manual deployment";
  }
}

function describeLinkedOutcomeWeights(
  outcomes: ManagerValueTraceLinkedOutcome[],
): string {
  const seen = new Set<string>();
  const pieces: string[] = [];

  for (const outcome of outcomes) {
    const key = `${outcome.role}:${outcome.weight}`;
    if (seen.has(key)) continue;
    seen.add(key);
    pieces.push(`${outcome.role} ${Math.round(outcome.weight * 100)}%`);
  }

  return pieces.join(", ");
}

function formatLineupSlot(
  playerName: string | undefined,
  battingOrderSlot: number | undefined,
  defensivePosition: string | undefined,
): string {
  const order = battingOrderSlot ? `#${battingOrderSlot}` : "slot ?";
  const position = defensivePosition || "POS";
  return `${order} ${position} ${playerName || "Unknown player"}`;
}

function isResolvedDeploymentStint(stint: ManagerDeploymentStintRecord): boolean {
  return (
    Number.isFinite(stint.managerDeploymentWpa) &&
    (Boolean(stint.closeReason) ||
      Boolean(stint.closedAtEventId) ||
      typeof stint.closedAtEventIndex === "number")
  );
}

function sortLinkedOutcomes(
  outcomes: ManagerDeploymentLinkedOutcome[],
): ManagerValueTraceLinkedOutcome[] {
  return outcomes
    .map((outcome) => ({
      eventId: outcome.eventId,
      source: outcome.source,
      role: outcome.role,
      rawWpa: outcome.rawWpa,
      weight: outcome.weight,
      weightedWpa: outcome.weightedWpa,
    }))
    .sort(
      (left, right) =>
        left.eventId.localeCompare(right.eventId) ||
        left.role.localeCompare(right.role) ||
        left.source.localeCompare(right.source) ||
        left.weight - right.weight ||
        left.rawWpa - right.rawWpa ||
        left.weightedWpa - right.weightedWpa,
    );
}

function compareTraceRows(
  left: ManagerValueTraceRow,
  right: ManagerValueTraceRow,
): number {
  return (
    left.managerId.localeCompare(right.managerId) ||
    left.teamId.localeCompare(right.teamId) ||
    TRACE_LAYER_ORDER[left.layer] - TRACE_LAYER_ORDER[right.layer] ||
    (left.sourceEventId ?? "").localeCompare(right.sourceEventId ?? "") ||
    (left.endpointEventId ?? "").localeCompare(right.endpointEventId ?? "") ||
    left.recordId.localeCompare(right.recordId)
  );
}

function uniqueSortedStrings(values: Array<string | undefined>): string[] {
  return Array.from(
    new Set(values.filter((value): value is string => Boolean(value))),
  ).sort((left, right) => left.localeCompare(right));
}

function titleCase(value: string): string {
  return value
    .replace(/[_-]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0]?.toUpperCase() + word.slice(1))
    .join(" ");
}
