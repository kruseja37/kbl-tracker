import {
  getBetweenPlayEvents,
  getGameFieldingEvents,
  getGameHeader,
  getGameEvents,
  type AtBatEvent,
  type BetweenPlayEvent,
  type FieldingEvent,
  type GameHeader,
} from "./eventLog";
import {
  loadCurrentGame,
  saveCurrentGame,
  type PersistedGameState,
} from "./gameStorage";
import type {
  ManagerDeploymentRole,
  ManagerDeploymentStintRecord,
  ManagerDecisionRecord,
  GameLockLineupSnapshots,
  ManagerLineupDeltaRecord,
  OptimalLineupSnapshot,
} from "../types/managerWpa";
import {
  deriveManagerDecisionRecords,
  getManagerForTeam,
  type ManagerAssignmentResolutionInput,
} from "./managerWpaDerivation";
import { mapLineupSnapshotDeviations } from "./optimalLineup";
import {
  aggregateKblWpaCredits,
  deriveKblWpaCredits,
  type KblWpaCredit,
  type KblWpaStartingLineups,
} from "./kblWpaAttribution";
import { WPA_MODEL_VERSION } from "../engines/wpaV2";

type ManagerStartingLineups = NonNullable<GameHeader["startingLineups"]>;
type ManagerStartingPitchers = NonNullable<GameHeader["startingPitchers"]>;

const LINEUP_DELTA_MANAGER_SHARE = 0.25;
const LINEUP_DELTA_PLAYER_CAP = 0.25;
const LINEUP_DELTA_TEAM_CAP = 0.75;
const DEPLOYMENT_STINT_CAP = 0.15;
const DEPLOYMENT_TEAM_CAP = 0.5;
const DEPLOYMENT_SHARE_BY_ROLE: Record<ManagerDeploymentRole, number> = {
  pinch_hitter_remaining: 0.15,
  pinch_runner: 0.2,
  defensive_position: 0.2,
  pitcher: 0.15,
  kept_in: 0.15,
  manual_deployment: 0.15,
};

export interface CommittedManagerDecisionState {
  managerDecisions: ManagerDecisionRecord[];
  managerDeploymentStints: ManagerDeploymentStintRecord[];
  managerLineupDeltas: ManagerLineupDeltaRecord[];
}

export interface DeriveCommittedManagerDecisionStateInput
  extends ManagerAssignmentResolutionInput {
  gameId: string;
  atBatEvents: AtBatEvent[];
  betweenPlayEvents?: BetweenPlayEvent[];
  fieldingEvents?: FieldingEvent[];
  startingLineups?: ManagerStartingLineups | KblWpaStartingLineups;
  startingPitchers?: ManagerStartingPitchers;
  optimalLineupSnapshots?: GameLockLineupSnapshots;
  chosenLineupSnapshots?: GameLockLineupSnapshots;
  totalInnings?: number;
  gameEnded?: boolean;
}

export interface RefreshCommittedManagerDecisionStateInput
  extends ManagerAssignmentResolutionInput {
  gameId: string;
  startingLineups?: ManagerStartingLineups | KblWpaStartingLineups;
  startingPitchers?: ManagerStartingPitchers;
  optimalLineupSnapshots?: GameLockLineupSnapshots;
  chosenLineupSnapshots?: GameLockLineupSnapshots;
  totalInnings?: number;
  gameEnded?: boolean;
}

export function deriveCommittedManagerDecisionState(
  input: DeriveCommittedManagerDecisionStateInput,
): CommittedManagerDecisionState {
  return {
    managerDecisions: deriveManagerDecisionRecords(input),
    managerDeploymentStints: deriveManagerDeploymentStintRecords(input),
    managerLineupDeltas: input.gameEnded
      ? deriveManagerLineupDeltaRecords(input)
      : [],
  };
}

export function deriveManagerLineupDeltaRecords(
  input: DeriveCommittedManagerDecisionStateInput,
): ManagerLineupDeltaRecord[] {
  if (!input.startingLineups) {
    return [];
  }

  const credits = deriveKblWpaCredits({
    atBatEvents: input.atBatEvents,
    betweenPlayEvents: input.betweenPlayEvents,
    fieldingEvents: input.fieldingEvents,
    totalInnings: input.totalInnings,
    awayTeamId: input.awayTeamId,
    homeTeamId: input.homeTeamId,
    startingLineups: normalizeStartingLineupsForKbl(input.startingLineups),
  });
  const totalsByPlayerId = new Map(
    aggregateKblWpaCredits(credits).map((entry) => [entry.playerId, entry]),
  );

  return [
    ...deriveTeamLineupDeltas({
      side: "away",
      teamId: input.awayTeamId,
      managerId: resolveManagerId(input.awayTeamId, input),
      gameId: input.gameId,
      optimalSnapshot: input.optimalLineupSnapshots?.away,
      chosenSnapshot: input.chosenLineupSnapshots?.away,
      starters: buildStarterEntries(
        input.startingLineups.away,
        input.startingPitchers?.away,
      ),
      totalsByPlayerId,
    }),
    ...deriveTeamLineupDeltas({
      side: "home",
      teamId: input.homeTeamId,
      managerId: resolveManagerId(input.homeTeamId, input),
      gameId: input.gameId,
      optimalSnapshot: input.optimalLineupSnapshots?.home,
      chosenSnapshot: input.chosenLineupSnapshots?.home,
      starters: buildStarterEntries(
        input.startingLineups.home,
        input.startingPitchers?.home,
      ),
      totalsByPlayerId,
    }),
  ];
}

interface OpenDeploymentStint {
  stintId: string;
  gameId: string;
  managerId: string;
  teamId: string;
  deploymentRole: ManagerDeploymentRole;
  playerId: string;
  playerName?: string;
  trackedPosition?: string;
  sourceEventId: string;
  openedAtEventIndex: number;
  tacticalExclusionEventIds?: string[];
  closedAtEventId?: string;
  closedAtEventIndex?: number;
  closeReason?: ManagerDeploymentStintRecord["closeReason"];
}

type DeploymentTimelineEntry =
  | {
      kind: "at_bat";
      eventId: string;
      eventIndex: number;
      atBat: AtBatEvent;
    }
  | {
      kind: "between_play";
      eventId: string;
      eventIndex: number;
      betweenPlay: BetweenPlayEvent;
    };

interface DeploymentActivationWindow {
  openedAtEventIndex: number;
  tacticalExclusionEventIds?: string[];
}

export function deriveManagerDeploymentStintRecords(
  input: DeriveCommittedManagerDecisionStateInput,
): ManagerDeploymentStintRecord[] {
  const events = [...(input.betweenPlayEvents ?? [])]
    .filter((event) => !event.undoneAt && event.gameState)
    .sort((left, right) => left.eventIndex - right.eventIndex);

  if (events.length === 0) {
    return [];
  }

  const open: OpenDeploymentStint[] = [];
  const closed: OpenDeploymentStint[] = [];
  const promptedOpeningsByEndpointId =
    groupPromptedKeepCurrentDeploymentOpenings(input, events);

  const closeMatching = (
    playerId: string | undefined,
    event: BetweenPlayEvent,
    reason: ManagerDeploymentStintRecord["closeReason"],
  ) => {
    if (!playerId) return;
    for (let index = open.length - 1; index >= 0; index--) {
      const stint = open[index];
      if (stint.playerId !== playerId) continue;
      open.splice(index, 1);
      closed.push({
        ...stint,
        closedAtEventId: event.eventId,
        closedAtEventIndex: event.eventIndex,
        closeReason: reason,
      });
    }
  };

  const closePinchRunnerTerminal = (
    playerId: string | undefined,
    eventId: string,
    eventIndex: number,
  ) => {
    if (!playerId) return;
    for (let index = open.length - 1; index >= 0; index--) {
      const stint = open[index];
      if (stint.deploymentRole !== "pinch_runner") continue;
      if (stint.playerId !== playerId) continue;
      if (pinchRunnerRemainsActiveAfterTerminal(stint, input, eventIndex)) {
        continue;
      }
      open.splice(index, 1);
      closed.push({
        ...stint,
        closedAtEventId: eventId,
        closedAtEventIndex: eventIndex,
        closeReason: "runner_terminal",
      });
    }
  };

  for (const entry of buildDeploymentTimeline(input, events)) {
    if (entry.kind === "at_bat") {
      for (const outcome of entry.atBat.runnerOutcomes ?? []) {
        if (isTerminalRunnerOutcome(outcome.toBase)) {
          closePinchRunnerTerminal(
            outcome.runnerId,
            entry.eventId,
            entry.eventIndex,
          );
        }
      }
      for (const opening of promptedOpeningsByEndpointId.get(entry.eventId) ?? []) {
        if (hasOpenDeploymentForPlayer(open, opening)) continue;
        open.push(opening);
      }
      continue;
    }

    const event = entry.betweenPlay;
    const substitution = event.substitution;
    const pitcherChange = event.pitcherChange;

    if (
      substitution?.subType === "position_change" &&
      substitution.inPlayerId === substitution.outPlayerId
    ) {
      closeMatching(substitution.inPlayerId, event, "role_change");
    } else if (substitution?.outPlayerId) {
      closeMatching(substitution.outPlayerId, event, "removed");
    }

    const opening = buildDeploymentOpening(input, event);
    if (opening && !hasOpenDeploymentForPlayer(open, opening)) {
      open.push(opening);
    }

    if (pitcherChange?.outgoingPitcherId) {
      closeMatching(pitcherChange.outgoingPitcherId, event, "removed");
    }

    if (isTerminalRunnerAction(event.runnerAction)) {
      closePinchRunnerTerminal(
        event.runnerAction.runnerId,
        event.eventId,
        event.eventIndex,
      );
    }
  }

  if (input.gameEnded === true) {
    const lastEvent = latestCommittedEvent(input);
    for (const stint of open) {
      closed.push({
        ...stint,
        closedAtEventId: lastEvent?.eventId,
        closedAtEventIndex: lastEvent?.eventIndex,
        closeReason: "game_end",
      });
    }
  }

  const credits = deriveKblWpaCredits({
    atBatEvents: input.atBatEvents,
    betweenPlayEvents: input.betweenPlayEvents,
    fieldingEvents: input.fieldingEvents,
    totalInnings: input.totalInnings,
    awayTeamId: input.awayTeamId,
    homeTeamId: input.homeTeamId,
    startingLineups: input.startingLineups
      ? normalizeStartingLineupsForKbl(input.startingLineups)
      : undefined,
  });
  const eventIndexById = buildEventIndexById(input);
  const fieldingEventsByAtBat = groupFieldingEventsByAtBat(input.fieldingEvents);

  const uncapped = closed.map((stint) => {
    const tacticalExclusionEventIds = findTacticalExclusionEventIds(
      stint,
      input,
    );
    const linkedCredits = credits.filter((credit) =>
      isCreditLinkedToDeploymentStint({
        credit,
        stint,
        eventIndexById,
        tacticalExclusionEventIds,
        fieldingEventsByAtBat,
      }),
    );
    const rawLinkedWpa = roundWpa(
      linkedCredits.reduce((sum, credit) => sum + credit.wpa, 0),
    );
    const managerShare = DEPLOYMENT_SHARE_BY_ROLE[stint.deploymentRole];
    const managerDeploymentWpa = clamp(
      roundWpa(rawLinkedWpa * managerShare),
      -DEPLOYMENT_STINT_CAP,
      DEPLOYMENT_STINT_CAP,
    );

    return {
      stint,
      tacticalExclusionEventIds,
      linkedEventIds: uniqueStrings(linkedCredits.map((credit) => credit.eventId)),
      rawLinkedWpa,
      managerShare,
      managerDeploymentWpa,
    };
  });

  const teamTotals = new Map<string, number>();
  for (const row of uncapped) {
    teamTotals.set(
      row.stint.teamId,
      (teamTotals.get(row.stint.teamId) ?? 0) + row.managerDeploymentWpa,
    );
  }

  const scoredClosedStints = uncapped.map((row) => {
    const teamTotal = teamTotals.get(row.stint.teamId) ?? 0;
    const teamScale =
      Math.abs(teamTotal) > DEPLOYMENT_TEAM_CAP
        ? DEPLOYMENT_TEAM_CAP / Math.abs(teamTotal)
        : 1;

    return {
      ...row.stint,
      tacticalExclusionEventIds: row.tacticalExclusionEventIds,
      closeReason: row.stint.closeReason ?? "game_end",
      linkedEventIds: row.linkedEventIds,
      rawLinkedWpa: row.rawLinkedWpa,
      managerShare: row.managerShare,
      managerDeploymentWpa: roundWpa(row.managerDeploymentWpa * teamScale),
      cap: DEPLOYMENT_STINT_CAP,
      confidence: "medium" as const,
      wpaModelVersion: WPA_MODEL_VERSION,
    };
  });

  const activeStints =
    input.gameEnded === true
      ? []
      : open.map((stint) => ({
          ...stint,
          tacticalExclusionEventIds: findTacticalExclusionEventIds(stint, input),
          linkedEventIds: [],
          rawLinkedWpa: 0,
          managerShare: DEPLOYMENT_SHARE_BY_ROLE[stint.deploymentRole],
          managerDeploymentWpa: 0,
          cap: DEPLOYMENT_STINT_CAP,
          confidence: "medium" as const,
          wpaModelVersion: WPA_MODEL_VERSION,
        }));

  return [...scoredClosedStints, ...activeStints];
}

function buildDeploymentOpening(
  input: DeriveCommittedManagerDecisionStateInput,
  event: BetweenPlayEvent,
): OpenDeploymentStint | null {
  if (!event.gameState) return null;

  if (event.type === "pitcher_change" && event.pitcherChange?.incomingPitcherId) {
    const teamId = defensiveTeamIdForHalf(event.gameState.halfInning, input);
    const activation = deploymentActivationWindowForEvent({
      input,
      event,
      role: "pitcher",
      playerId: event.pitcherChange.incomingPitcherId,
    });
    return {
      stintId: `${input.gameId}:${event.eventId}:deployment:pitcher:${event.pitcherChange.incomingPitcherId}`,
      gameId: input.gameId,
      managerId: resolveManagerId(teamId, input),
      teamId,
      deploymentRole: "pitcher",
      playerId: event.pitcherChange.incomingPitcherId,
      playerName: event.pitcherChange.incomingPitcherName,
      sourceEventId: event.eventId,
      openedAtEventIndex: activation.openedAtEventIndex,
      tacticalExclusionEventIds: activation.tacticalExclusionEventIds,
    };
  }

  if (
    (event.type !== "substitution" && event.type !== "position_change") ||
    !event.substitution?.inPlayerId
  ) {
    return null;
  }

  const { substitution } = event;
  const role = deploymentRoleForSubstitution(substitution.subType);
  if (!role) return null;
  const activation = deploymentActivationWindowForEvent({
    input,
    event,
    role,
    playerId: substitution.inPlayerId,
    trackedPosition: substitution.inPosition,
  });

  const teamId =
    role === "pinch_hitter_remaining" || role === "pinch_runner"
      ? offensiveTeamIdForHalf(event.gameState.halfInning, input)
      : defensiveTeamIdForHalf(event.gameState.halfInning, input);

  return {
    stintId: `${input.gameId}:${event.eventId}:deployment:${role}:${substitution.inPlayerId}`,
    gameId: input.gameId,
    managerId: resolveManagerId(teamId, input),
    teamId,
    deploymentRole: role,
    playerId: substitution.inPlayerId,
    playerName: substitution.inPlayerName,
    trackedPosition: substitution.inPosition,
    sourceEventId: event.eventId,
    openedAtEventIndex: activation.openedAtEventIndex,
    tacticalExclusionEventIds: activation.tacticalExclusionEventIds,
  };
}

function deploymentActivationWindowForEvent(input: {
  input: DeriveCommittedManagerDecisionStateInput;
  event: BetweenPlayEvent;
  role: ManagerDeploymentRole;
  playerId: string;
  trackedPosition?: string;
}): DeploymentActivationWindow {
  const { event, playerId, role } = input;

  if (role === "pinch_runner") {
    return pinchRunnerActivationWindow(input.input, event, playerId);
  }

  const endpoint = immediateDeploymentTacticalEndpoint(input);
  if (!endpoint) {
    return { openedAtEventIndex: event.eventIndex };
  }

  return {
    openedAtEventIndex: endpoint.eventIndex,
    tacticalExclusionEventIds: [endpoint.eventId],
  };
}

function immediateDeploymentTacticalEndpoint(input: {
  input: DeriveCommittedManagerDecisionStateInput;
  event: BetweenPlayEvent;
  role: ManagerDeploymentRole;
  playerId: string;
  trackedPosition?: string;
}): { eventId: string; eventIndex: number } | undefined {
  const { event, playerId, role, trackedPosition } = input;
  const atBatEvents = [...input.input.atBatEvents]
    .filter((candidate) => !candidate.undoneAt)
    .sort((left, right) => left.eventIndex - right.eventIndex);

  if (role === "pitcher") {
    return atBatEvents.find(
      (candidate) =>
        candidate.eventIndex > event.eventIndex &&
        candidate.pitcherId === playerId,
    );
  }

  if (role === "pinch_hitter_remaining") {
    return atBatEvents.find(
      (candidate) =>
        candidate.eventIndex > event.eventIndex &&
        candidate.batterId === playerId,
    );
  }

  if (role === "defensive_position") {
    return atBatEvents.find((candidate) => {
      if (candidate.eventIndex <= event.eventIndex) return false;
      return (input.input.fieldingEvents ?? []).some(
        (fieldingEvent) =>
          fieldingEvent.atBatEventId === candidate.eventId &&
          fieldingEvent.playerId === playerId &&
          (!trackedPosition || fieldingEvent.position === trackedPosition),
      );
    });
  }

  return undefined;
}

function pinchRunnerActivationWindow(
  input: DeriveCommittedManagerDecisionStateInput,
  sourceEvent: BetweenPlayEvent,
  playerId: string,
): DeploymentActivationWindow {
  const tacticalExclusionEventIds: string[] = [];
  let terminalEventIndex: number | undefined;

  for (const entry of buildDeploymentTimeline(input)) {
    if (entry.eventIndex <= sourceEvent.eventIndex) continue;

    if (entry.kind === "at_bat") {
      const runnerOutcome = (entry.atBat.runnerOutcomes ?? []).find(
        (outcome) => outcome.runnerId === playerId,
      );
      if (!runnerOutcome) continue;

      tacticalExclusionEventIds.push(entry.eventId);
      if (isTerminalRunnerOutcome(runnerOutcome.toBase)) {
        terminalEventIndex = entry.eventIndex;
        break;
      }
      continue;
    }

    const action = entry.betweenPlay.runnerAction;
    if (action?.runnerId !== playerId) continue;

    tacticalExclusionEventIds.push(entry.eventId);
    if (isTerminalRunnerAction(action)) {
      terminalEventIndex = entry.eventIndex;
      break;
    }
  }

  return {
    openedAtEventIndex: terminalEventIndex ?? sourceEvent.eventIndex,
    tacticalExclusionEventIds:
      tacticalExclusionEventIds.length > 0
        ? uniqueStrings(tacticalExclusionEventIds)
        : undefined,
  };
}

function groupPromptedKeepCurrentDeploymentOpenings(
  input: DeriveCommittedManagerDecisionStateInput,
  events: BetweenPlayEvent[],
): Map<string, OpenDeploymentStint[]> {
  const grouped = new Map<string, OpenDeploymentStint[]>();
  const seen = new Set<string>();
  const atBatEvents = [...input.atBatEvents]
    .filter((event) => !event.undoneAt)
    .sort((left, right) => left.eventIndex - right.eventIndex);

  for (const event of events) {
    const prompted = event.promptedManagerDecision;
    if (!prompted || !event.gameState) continue;
    if (
      prompted.decisionType !== "leave_pitcher_in" &&
      prompted.decisionType !== "let_batter_hit"
    ) {
      continue;
    }

    const provenanceKey = prompted.provenanceKey ?? prompted.recommendationId;
    const dedupeKey = provenanceKey
      ? [
          prompted.decisionType,
          prompted.managerId,
          prompted.teamId,
          provenanceKey,
          promptedManagerDecisionSnapshotKey(event),
        ].join(":")
      : null;
    if (dedupeKey) {
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);
    }

    const trackedPlayerId = promptedTrackedPlayerIds(prompted)[0];
    if (!trackedPlayerId) continue;

    const endpoint = atBatEvents.find((candidate) => {
      if (candidate.eventIndex <= event.eventIndex) return false;
      if (candidate.inning !== event.gameState?.inning) return false;
      if (candidate.halfInning !== event.gameState?.halfInning) return false;
      if (prompted.decisionType === "leave_pitcher_in") {
        return candidate.pitcherId === trackedPlayerId;
      }
      return candidate.batterId === trackedPlayerId;
    });
    if (!endpoint) continue;

    const opening: OpenDeploymentStint = {
      stintId: `${input.gameId}:${event.eventId}:deployment:kept_in:${trackedPlayerId}`,
      gameId: input.gameId,
      managerId: prompted.managerId,
      teamId: prompted.teamId,
      deploymentRole: "kept_in",
      playerId: trackedPlayerId,
      playerName: prompted.playerName,
      sourceEventId: event.eventId,
      openedAtEventIndex: endpoint.eventIndex,
      tacticalExclusionEventIds: [endpoint.eventId],
    };
    const openings = grouped.get(endpoint.eventId) ?? [];
    openings.push(opening);
    grouped.set(endpoint.eventId, openings);
  }

  return grouped;
}

function hasOpenDeploymentForPlayer(
  open: OpenDeploymentStint[],
  opening: OpenDeploymentStint,
): boolean {
  return open.some(
    (stint) =>
      stint.teamId === opening.teamId &&
      stint.playerId === opening.playerId &&
      stint.deploymentRole === opening.deploymentRole,
  );
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

interface StarterEntry {
  playerId: string;
  playerName: string;
  battingOrder: number;
  defensivePosition: string;
  starterRole: ManagerLineupDeltaRecord["starterRole"];
}

function deriveTeamLineupDeltas(input: {
  side: "away" | "home";
  gameId: string;
  teamId: string;
  managerId: string;
  optimalSnapshot?: OptimalLineupSnapshot;
  chosenSnapshot?: OptimalLineupSnapshot;
  starters: StarterEntry[];
  totalsByPlayerId: Map<string, ReturnType<typeof aggregateKblWpaCredits>[number]>;
}): ManagerLineupDeltaRecord[] {
  const { optimalSnapshot, chosenSnapshot } = input;
  if (optimalSnapshot && chosenSnapshot) {
    return deriveTeamLineupDeltasFromOptimalSnapshot({
      ...input,
      optimalSnapshot,
      chosenSnapshot,
    });
  }

  return [];
}

function deriveTeamLineupDeltasFromOptimalSnapshot(input: {
  side: "away" | "home";
  gameId: string;
  teamId: string;
  managerId: string;
  optimalSnapshot: OptimalLineupSnapshot;
  chosenSnapshot: OptimalLineupSnapshot;
  starters: StarterEntry[];
  totalsByPlayerId: Map<string, ReturnType<typeof aggregateKblWpaCredits>[number]>;
}): ManagerLineupDeltaRecord[] {
  const deviations = mapLineupSnapshotDeviations({
    chosen: input.chosenSnapshot,
    optimal: input.optimalSnapshot,
  }).filter(
    (deviation) =>
      !isPitcherLineupSlot(deviation.chosenSlot.defensivePosition) &&
      !isPitcherLineupSlot(deviation.optimalSlot.defensivePosition),
  );

  if (deviations.length === 0) {
    return [];
  }

  const starterById = new Map(input.starters.map((starter) => [starter.playerId, starter]));
  const uncapped = deviations.map((deviation, index) => {
    const chosen = deviation.chosenSlot;
    const optimal = deviation.optimalSlot;
    const actualChosenKblWpa =
      input.totalsByPlayerId.get(chosen.playerId)?.totalWpa ?? 0;
    const realizedVsChosenProjection = roundWpa(
      actualChosenKblWpa - chosen.projectedSlotKblWpa,
    );
    const actualVsOptimalProjection = roundWpa(
      actualChosenKblWpa - optimal.projectedSlotKblWpa,
    );
    const playerCappedManagerWpa = clamp(
      roundWpa(actualVsOptimalProjection * LINEUP_DELTA_MANAGER_SHARE),
      -LINEUP_DELTA_PLAYER_CAP,
      LINEUP_DELTA_PLAYER_CAP,
    );
    const starter = starterById.get(chosen.playerId);

    return {
      index,
      chosen,
      optimal,
      starter,
      actualChosenKblWpa,
      realizedVsChosenProjection,
      actualVsOptimalProjection,
      projectedOpportunityCost: deviation.projectedOpportunityCost,
      playerCappedManagerWpa,
      capApplied:
        Math.abs(roundWpa(actualVsOptimalProjection * LINEUP_DELTA_MANAGER_SHARE)) >
        LINEUP_DELTA_PLAYER_CAP
          ? LINEUP_DELTA_PLAYER_CAP
          : undefined,
    };
  });

  const teamTotal = uncapped.reduce(
    (sum, row) => sum + row.playerCappedManagerWpa,
    0,
  );
  const teamScale =
    Math.abs(teamTotal) > LINEUP_DELTA_TEAM_CAP
      ? LINEUP_DELTA_TEAM_CAP / Math.abs(teamTotal)
      : 1;

  return uncapped.map((row) => {
    const managerWpa = roundWpa(row.playerCappedManagerWpa * teamScale);
    const capApplied =
      row.capApplied ??
      (teamScale < 1 ? LINEUP_DELTA_TEAM_CAP : undefined);

    return {
      decisionId: `${input.gameId}:${input.teamId}:${row.chosen.playerId}:${row.optimal.playerId}:${row.index}:lineup_delta_v2`,
      gameId: input.gameId,
      managerId: input.managerId,
      teamId: input.teamId,
      decisionType: "lineup_construction",
      inferenceMethod: "automatic",
      confidence: confidenceForLineupDelta(input.optimalSnapshot, input.chosenSnapshot),
      starterPlayerId: row.chosen.playerId,
      starterPlayerName: row.chosen.playerName,
      battingOrderSlot: row.chosen.battingOrderSlot,
      defensivePosition: row.chosen.defensivePosition,
      starterRole:
        row.starter?.starterRole ?? starterRoleForPosition(row.chosen.defensivePosition),
      actualPlayerKblWpa: roundWpa(row.actualChosenKblWpa),
      replacementExpectedKblWpa: row.optimal.projectedSlotKblWpa,
      replacementBaselineSource: "optimal_lineup_v2",
      replacementBaselineConfidence:
        input.optimalSnapshot.sourceConfidence === "user_registered"
          ? "high"
          : "medium",
      rawPerformanceDelta: row.actualVsOptimalProjection,
      managerShare: LINEUP_DELTA_MANAGER_SHARE,
      managerWpa,
      wpaModelVersion: WPA_MODEL_VERSION,
      optimalSnapshotId: input.optimalSnapshot.snapshotId,
      opposingPitcherHand: input.optimalSnapshot.opposingPitcherHand,
      algorithmVersion: input.optimalSnapshot.algorithmVersion,
      chosenPlayerId: row.chosen.playerId,
      chosenPlayerName: row.chosen.playerName,
      chosenBattingOrderSlot: row.chosen.battingOrderSlot,
      chosenDefensivePosition: row.chosen.defensivePosition,
      optimalPlayerId: row.optimal.playerId,
      optimalPlayerName: row.optimal.playerName,
      optimalBattingOrderSlot: row.optimal.battingOrderSlot,
      optimalDefensivePosition: row.optimal.defensivePosition,
      chosenProjectedKblWpa: row.chosen.projectedSlotKblWpa,
      optimalProjectedKblWpa: row.optimal.projectedSlotKblWpa,
      projectedOpportunityCost: row.projectedOpportunityCost,
      actualChosenKblWpa: roundWpa(row.actualChosenKblWpa),
      realizedVsChosenProjection: row.realizedVsChosenProjection,
      actualVsOptimalProjection: row.actualVsOptimalProjection,
      capApplied,
    };
  });
}

function buildStarterEntries(
  lineup: ManagerStartingLineups["away"] | KblWpaStartingLineups["away"],
  startingPitcher?: ManagerStartingPitchers["away"],
): StarterEntry[] {
  const starters = lineup.map((player, index) => {
    const defensivePosition =
      ("fieldPosition" in player ? player.fieldPosition : undefined) ??
      player.position ??
      "DH";
    return {
      playerId: player.playerId,
      playerName: player.playerName,
      battingOrder: "battingOrder" in player ? player.battingOrder ?? index + 1 : index + 1,
      defensivePosition,
      starterRole: starterRoleForPosition(defensivePosition),
    };
  });

  if (
    startingPitcher &&
    !starters.some((starter) => starter.playerId === startingPitcher.playerId)
  ) {
    starters.push({
      playerId: startingPitcher.playerId,
      playerName: startingPitcher.playerName,
      battingOrder: 0,
      defensivePosition: "P",
      starterRole: "starting_pitcher",
    });
  }

  return starters;
}

function starterRoleForPosition(
  position: string,
): ManagerLineupDeltaRecord["starterRole"] {
  const normalized = position.trim().toUpperCase();
  if (normalized === "DH") return "designated_hitter";
  if (isPitcherLineupSlot(normalized)) {
    return "starting_pitcher";
  }
  return "position_player";
}

function isPitcherLineupSlot(position: string): boolean {
  const normalized = position.trim().toUpperCase();
  return normalized === "P" || normalized === "SP" || normalized === "RP";
}

function confidenceForLineupDelta(
  optimalSnapshot: OptimalLineupSnapshot,
  chosenSnapshot: OptimalLineupSnapshot,
): NonNullable<ManagerLineupDeltaRecord["confidence"]> {
  if (
    optimalSnapshot.sourceConfidence === "user_registered" &&
    chosenSnapshot.confidence !== "low"
  ) {
    return "high";
  }
  if (optimalSnapshot.confidence === "low" || chosenSnapshot.confidence === "low") {
    return "low";
  }
  return "medium";
}

function deploymentRoleForSubstitution(
  subType: NonNullable<BetweenPlayEvent["substitution"]>["subType"],
): ManagerDeploymentRole | null {
  if (subType === "pinch_hit") return "pinch_hitter_remaining";
  if (subType === "pinch_run") return "pinch_runner";
  if (subType === "defensive_replacement" || subType === "position_change") {
    return "defensive_position";
  }
  return null;
}

function offensiveTeamIdForHalf(
  halfInning: "TOP" | "BOTTOM",
  input: DeriveCommittedManagerDecisionStateInput,
): string {
  return halfInning === "TOP" ? input.awayTeamId : input.homeTeamId;
}

function defensiveTeamIdForHalf(
  halfInning: "TOP" | "BOTTOM",
  input: DeriveCommittedManagerDecisionStateInput,
): string {
  return halfInning === "TOP" ? input.homeTeamId : input.awayTeamId;
}

function latestCommittedEvent(
  input: DeriveCommittedManagerDecisionStateInput,
): { eventId: string; eventIndex: number } | undefined {
  return [
    ...input.atBatEvents.map((event) => ({
      eventId: event.eventId,
      eventIndex: event.eventIndex,
    })),
    ...(input.betweenPlayEvents ?? []).map((event) => ({
      eventId: event.eventId,
      eventIndex: event.eventIndex,
    })),
  ].sort((left, right) => right.eventIndex - left.eventIndex)[0];
}

function buildEventIndexById(
  input: DeriveCommittedManagerDecisionStateInput,
): Map<string, number> {
  return new Map([
    ...input.atBatEvents.map((event) => [event.eventId, event.eventIndex] as const),
    ...(input.betweenPlayEvents ?? []).map(
      (event) => [event.eventId, event.eventIndex] as const,
    ),
  ]);
}

function groupFieldingEventsByAtBat(
  fieldingEvents: FieldingEvent[] | undefined,
): Map<string, FieldingEvent[]> {
  const grouped = new Map<string, FieldingEvent[]>();
  for (const event of fieldingEvents ?? []) {
    const rows = grouped.get(event.atBatEventId) ?? [];
    rows.push(event);
    grouped.set(event.atBatEventId, rows);
  }
  return grouped;
}

function findTacticalExclusionEventIds(
  stint: OpenDeploymentStint,
  input: DeriveCommittedManagerDecisionStateInput,
): string[] {
  const promptedEndpointEventIds = findPromptedTacticalEndpointEventIds(
    stint,
    input,
  );

  if (stint.tacticalExclusionEventIds) {
    return uniqueStrings([
      ...stint.tacticalExclusionEventIds,
      ...promptedEndpointEventIds,
    ]);
  }

  const afterOpen = input.atBatEvents
    .filter((event) => event.eventIndex > stint.openedAtEventIndex)
    .sort((left, right) => left.eventIndex - right.eventIndex);

  if (stint.deploymentRole === "pitcher") {
    return uniqueStrings([
      ...firstEventId(afterOpen.find((event) => event.pitcherId === stint.playerId)),
      ...promptedEndpointEventIds,
    ]);
  }

  if (stint.deploymentRole === "pinch_hitter_remaining") {
    return uniqueStrings([
      ...firstEventId(afterOpen.find((event) => event.batterId === stint.playerId)),
      ...promptedEndpointEventIds,
    ]);
  }

  if (stint.deploymentRole === "pinch_runner") {
    return uniqueStrings([
      ...findPinchRunnerTacticalExclusionEventIds(stint, input),
      ...promptedEndpointEventIds,
    ]);
  }

  if (stint.deploymentRole === "defensive_position") {
    const firstFieldingAtBat = afterOpen.find((event) =>
      (input.fieldingEvents ?? []).some(
        (fieldingEvent) =>
          fieldingEvent.atBatEventId === event.eventId &&
          fieldingEvent.playerId === stint.playerId &&
          (!stint.trackedPosition ||
            fieldingEvent.position === stint.trackedPosition),
      ),
    );
    return uniqueStrings([
      ...firstEventId(firstFieldingAtBat),
      ...promptedEndpointEventIds,
    ]);
  }

  return promptedEndpointEventIds;
}

function findPromptedTacticalEndpointEventIds(
  stint: OpenDeploymentStint,
  input: DeriveCommittedManagerDecisionStateInput,
): string[] {
  const atBatEvents = [...input.atBatEvents]
    .filter((event) => !event.undoneAt)
    .sort((left, right) => left.eventIndex - right.eventIndex);
  const excluded: string[] = [];

  for (const event of input.betweenPlayEvents ?? []) {
    const prompted = event.promptedManagerDecision;
    if (!prompted || !event.gameState) continue;
    if (prompted.teamId !== stint.teamId) continue;
    if (!promptedTrackedPlayerIds(prompted).includes(stint.playerId)) continue;
    if (
      prompted.decisionType !== "leave_pitcher_in" &&
      prompted.decisionType !== "let_batter_hit"
    ) {
      continue;
    }

    const endpoint = atBatEvents.find((candidate) => {
      if (candidate.eventIndex <= event.eventIndex) return false;
      if (candidate.inning !== event.gameState?.inning) return false;
      if (candidate.halfInning !== event.gameState?.halfInning) return false;
      if (prompted.decisionType === "leave_pitcher_in") {
        return candidate.pitcherId === stint.playerId;
      }
      return candidate.batterId === stint.playerId;
    });
    if (!endpoint) continue;
    if (endpoint.eventIndex < stint.openedAtEventIndex) continue;
    if (
      stint.closedAtEventIndex !== undefined &&
      endpoint.eventIndex > stint.closedAtEventIndex
    ) {
      continue;
    }
    excluded.push(endpoint.eventId);
  }

  return uniqueStrings(excluded);
}

function firstEventId(event: AtBatEvent | undefined): string[] {
  return event ? [event.eventId] : [];
}

function findPinchRunnerTacticalExclusionEventIds(
  stint: OpenDeploymentStint,
  input: DeriveCommittedManagerDecisionStateInput,
): string[] {
  const excludedEventIds: string[] = [];

  for (const entry of buildDeploymentTimeline(input)) {
    if (entry.eventIndex <= stint.openedAtEventIndex) continue;
    if (
      stint.closedAtEventIndex !== undefined &&
      entry.eventIndex > stint.closedAtEventIndex
    ) {
      continue;
    }

    if (entry.kind === "at_bat") {
      const runnerOutcome = (entry.atBat.runnerOutcomes ?? []).find(
        (outcome) => outcome.runnerId === stint.playerId,
      );
      if (!runnerOutcome) continue;

      excludedEventIds.push(entry.eventId);
      if (isTerminalRunnerOutcome(runnerOutcome.toBase)) {
        break;
      }
      continue;
    }

    const action = entry.betweenPlay.runnerAction;
    if (action?.runnerId !== stint.playerId) continue;

    excludedEventIds.push(entry.eventId);
    if (isTerminalRunnerAction(action)) {
      break;
    }
  }

  return uniqueStrings(excludedEventIds);
}

function buildDeploymentTimeline(
  input: DeriveCommittedManagerDecisionStateInput,
  betweenPlayEvents: BetweenPlayEvent[] = [...(input.betweenPlayEvents ?? [])]
    .filter((event) => !event.undoneAt && event.gameState)
    .sort((left, right) => left.eventIndex - right.eventIndex),
): DeploymentTimelineEntry[] {
  return [
    ...input.atBatEvents
      .filter((event) => !event.undoneAt)
      .map((event) => ({
        kind: "at_bat" as const,
        eventId: event.eventId,
        eventIndex: event.eventIndex,
        atBat: event,
      })),
    ...betweenPlayEvents.map((event) => ({
      kind: "between_play" as const,
      eventId: event.eventId,
      eventIndex: event.eventIndex,
      betweenPlay: event,
    })),
  ].sort(
    (left, right) =>
      left.eventIndex - right.eventIndex ||
      (left.kind === right.kind ? 0 : left.kind === "between_play" ? -1 : 1) ||
      left.eventId.localeCompare(right.eventId),
  );
}

function isTerminalRunnerOutcome(
  toBase: NonNullable<AtBatEvent["runnerOutcomes"]>[number]["toBase"],
): boolean {
  return toBase === "home" || toBase === "out" || toBase === "end";
}

function isTerminalRunnerAction(
  action: BetweenPlayEvent["runnerAction"] | undefined,
): action is NonNullable<BetweenPlayEvent["runnerAction"]> {
  return Boolean(action && (action.outcome === "out" || action.toBase === 4));
}

function pinchRunnerRemainsActiveAfterTerminal(
  stint: OpenDeploymentStint,
  input: DeriveCommittedManagerDecisionStateInput,
  terminalEventIndex: number,
): boolean {
  const playerId = stint.playerId;
  const futureAtBats = input.atBatEvents.filter(
    (event) => !event.undoneAt && event.eventIndex > terminalEventIndex,
  );

  if (
    futureAtBats.some(
      (event) =>
        event.batterId === playerId ||
        event.pitcherId === playerId ||
        (event.runnerOutcomes ?? []).some(
          (outcome) => outcome.runnerId === playerId,
        ),
    )
  ) {
    return true;
  }

  const atBatEventIndexById = new Map(
    input.atBatEvents.map((event) => [event.eventId, event.eventIndex] as const),
  );
  if (
    (input.fieldingEvents ?? []).some((event) => {
      if (event.playerId !== playerId) return false;
      const atBatEventIndex = atBatEventIndexById.get(event.atBatEventId);
      return (
        atBatEventIndex !== undefined && atBatEventIndex > terminalEventIndex
      );
    })
  ) {
    return true;
  }

  return (input.betweenPlayEvents ?? []).some((event) => {
    if (event.undoneAt || event.eventIndex <= terminalEventIndex) return false;
    if (event.pitcherChange?.incomingPitcherId === playerId) return true;
    if (event.substitution?.inPlayerId === playerId) return true;
    return (
      event.playerStateChange?.playerId === playerId &&
      event.playerStateChange.stayedIn === true
    );
  });
}

function isCreditLinkedToDeploymentStint(input: {
  credit: KblWpaCredit;
  stint: OpenDeploymentStint;
  eventIndexById: Map<string, number>;
  tacticalExclusionEventIds: string[];
  fieldingEventsByAtBat: Map<string, FieldingEvent[]>;
}): boolean {
  const {
    credit,
    stint,
    eventIndexById,
    tacticalExclusionEventIds,
    fieldingEventsByAtBat,
  } = input;
  if (credit.playerId !== stint.playerId || credit.teamId !== stint.teamId) {
    return false;
  }
  if (tacticalExclusionEventIds.includes(credit.eventId)) {
    return false;
  }

  const eventIndex = eventIndexById.get(credit.eventId);
  if (eventIndex === undefined || eventIndex <= stint.openedAtEventIndex) {
    return false;
  }
  if (
    stint.closedAtEventIndex !== undefined &&
    eventIndex > stint.closedAtEventIndex
  ) {
    return false;
  }

  if (stint.deploymentRole === "pitcher") {
    return credit.role === "pitching";
  }
  if (stint.deploymentRole === "defensive_position") {
    if (credit.role !== "fielding") return false;
    return (fieldingEventsByAtBat.get(credit.eventId) ?? []).some(
      (fieldingEvent) =>
        fieldingEvent.playerId === stint.playerId &&
        (!stint.trackedPosition ||
          fieldingEvent.position === stint.trackedPosition),
    );
  }
  if (
    stint.deploymentRole === "pinch_hitter_remaining" ||
    stint.deploymentRole === "pinch_runner"
  ) {
    return (
      credit.role === "batting" ||
      credit.role === "baserunning" ||
      credit.role === "fielding"
    );
  }

  return credit.role !== "managing";
}

function uniqueStrings(values: Array<string | undefined>): string[] {
  return Array.from(new Set(values.filter((value): value is string => !!value)));
}

function normalizeStartingLineupsForKbl(
  startingLineups: ManagerStartingLineups | KblWpaStartingLineups,
): KblWpaStartingLineups {
  return {
    away: startingLineups.away.map((player) => ({
      playerId: player.playerId,
      playerName: player.playerName,
      position:
        ("position" in player ? player.position : undefined) ??
        ("fieldPosition" in player ? player.fieldPosition : undefined),
      fieldPosition:
        ("fieldPosition" in player ? player.fieldPosition : undefined) ??
        ("position" in player ? player.position : undefined),
    })),
    home: startingLineups.home.map((player) => ({
      playerId: player.playerId,
      playerName: player.playerName,
      position:
        ("position" in player ? player.position : undefined) ??
        ("fieldPosition" in player ? player.fieldPosition : undefined),
      fieldPosition:
        ("fieldPosition" in player ? player.fieldPosition : undefined) ??
        ("position" in player ? player.position : undefined),
    })),
  };
}

function resolveManagerId(
  teamId: string,
  input: ManagerAssignmentResolutionInput,
): string {
  return getManagerForTeam(teamId, {
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
  });
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function roundWpa(value: number): number {
  return Math.round(value * 10000) / 10000;
}

export async function deriveCommittedManagerDecisionStateForGame(
  input: RefreshCommittedManagerDecisionStateInput,
): Promise<CommittedManagerDecisionState> {
  const [atBatEvents, betweenPlayEvents, fieldingEvents, gameHeader] = await Promise.all([
    getGameEvents(input.gameId),
    getBetweenPlayEvents(input.gameId),
    getGameFieldingEvents(input.gameId),
    getGameHeader(input.gameId).catch(() => null),
  ]);

  return deriveCommittedManagerDecisionState({
    ...input,
    atBatEvents,
    betweenPlayEvents,
    fieldingEvents,
    startingLineups: input.startingLineups ?? gameHeader?.startingLineups,
    startingPitchers: input.startingPitchers ?? gameHeader?.startingPitchers,
    optimalLineupSnapshots:
      input.optimalLineupSnapshots ?? gameHeader?.optimalLineupSnapshots,
    chosenLineupSnapshots:
      input.chosenLineupSnapshots ?? gameHeader?.chosenLineupSnapshots,
  });
}

export async function refreshCurrentGameManagerDecisionState(
  input: RefreshCommittedManagerDecisionStateInput,
): Promise<CommittedManagerDecisionState> {
  const nextState = await deriveCommittedManagerDecisionStateForGame(input);
  const currentGame = await loadCurrentGame();

  if (currentGame?.gameId === input.gameId) {
    const updatedCurrentGame: PersistedGameState = {
      ...currentGame,
      managerDecisions: nextState.managerDecisions,
      managerDeploymentStints: nextState.managerDeploymentStints,
      managerLineupDeltas: nextState.managerLineupDeltas,
    };
    await saveCurrentGame(updatedCurrentGame);
  }

  return nextState;
}
