import type { FameEventType, HalfInning } from "../../../types/game";
import type { AtBatEvent } from "../../../utils/eventLog";
import {
  createPitcherAppearance,
  updatePitcherAppearance,
  type PitcherAppearance,
} from "./saveDetector";

type TeamSide = "away" | "home";

export interface DetectedFameEvent {
  detectionKey: string;
  eventType: FameEventType;
  playerId: string;
  playerName: string;
  inning: number;
  halfInning: HalfInning;
  leverageIndex: number;
}

export interface DefensivePlayerIdentity {
  playerId: string;
  playerName: string;
}

export interface SaveAppearanceSnapshot {
  teamSide: TeamSide;
  pitcherId: string;
  pitcherName: string;
  appearance: PitcherAppearance;
  leadLost: boolean;
  leadLossContext?: {
    inning: number;
    halfInning: HalfInning;
    leverageIndex: number;
  };
}

export interface SaveAppearanceStartContext {
  inning: number;
  halfInning: HalfInning;
  outs: number;
  bases: {
    first: boolean;
    second: boolean;
    third: boolean;
  };
  score: {
    away: number;
    home: number;
  };
  scheduledInnings: number;
  teamSide: TeamSide;
}

export interface SaveAppearanceUpdateContext {
  inning: number;
  halfInning: HalfInning;
  score: {
    away: number;
    home: number;
  };
  scheduledInnings: number;
  additionalOuts?: number;
  additionalRuns?: number;
  leverageIndex?: number;
}

function getDefensiveSide(halfInning: HalfInning): TeamSide {
  return halfInning === "TOP" ? "home" : "away";
}

function buildSaveDetectorBases(bases: SaveAppearanceStartContext["bases"]) {
  return {
    first: bases.first
      ? { playerId: "r1", playerName: "Runner", inheritedFrom: null }
      : null,
    second: bases.second
      ? { playerId: "r2", playerName: "Runner", inheritedFrom: null }
      : null,
    third: bases.third
      ? { playerId: "r3", playerName: "Runner", inheritedFrom: null }
      : null,
  };
}

function getLeadForSide(score: { away: number; home: number }, teamSide: TeamSide): number {
  return teamSide === "home"
    ? score.home - score.away
    : score.away - score.home;
}

export function createSaveAppearanceSnapshot(
  pitcherId: string,
  pitcherName: string,
  context: SaveAppearanceStartContext,
): SaveAppearanceSnapshot {
  const isHomeDefense = context.teamSide === "home";

  return {
    teamSide: context.teamSide,
    pitcherId,
    pitcherName,
    appearance: createPitcherAppearance(pitcherId, pitcherName, {
      inning: context.inning,
      halfInning: context.halfInning,
      outs: context.outs,
      bases: buildSaveDetectorBases(context.bases),
      homeScore: context.score.home,
      awayScore: context.score.away,
      scheduledInnings: context.scheduledInnings,
      isHomeDefense,
    }),
    leadLost: false,
  };
}

export function updateSaveAppearanceSnapshot(
  snapshot: SaveAppearanceSnapshot,
  context: SaveAppearanceUpdateContext,
): SaveAppearanceSnapshot {
  const previousLead = snapshot.appearance.leadWhenExited;
  const nextAppearance = updatePitcherAppearance(
    snapshot.appearance,
    {
      inning: context.inning,
      halfInning: context.halfInning,
      outs: 0,
      bases: { first: null, second: null, third: null },
      homeScore: context.score.home,
      awayScore: context.score.away,
      scheduledInnings: context.scheduledInnings,
      isHomeDefense: snapshot.teamSide === "home",
    },
    context.additionalOuts ?? 0,
    context.additionalRuns ?? 0,
  );

  const leadLostNow = previousLead > 0 && nextAppearance.leadWhenExited <= 0;
  const leadLossContext =
    !snapshot.leadLossContext && leadLostNow
      ? {
          inning: context.inning,
          halfInning: context.halfInning,
          leverageIndex: context.leverageIndex ?? 1,
        }
      : snapshot.leadLossContext;

  return {
    ...snapshot,
    appearance: nextAppearance,
    leadLost: snapshot.leadLost || leadLostNow,
    leadLossContext,
  };
}

export function detectBlownSaveEvent(
  snapshot: SaveAppearanceSnapshot,
  teamWon: boolean,
): DetectedFameEvent | null {
  if (!snapshot.appearance.enteredInSaveOpportunity || !snapshot.leadLost) {
    return null;
  }

  const context = snapshot.leadLossContext;
  if (!context) {
    return null;
  }

  const eventType: FameEventType = teamWon ? "BLOWN_SAVE" : "BLOWN_SAVE_LOSS";

  return {
    detectionKey: `blown-save:${snapshot.pitcherId}:${context.inning}:${context.halfInning}`,
    eventType,
    playerId: snapshot.pitcherId,
    playerName: snapshot.pitcherName,
    inning: context.inning,
    halfInning: context.halfInning,
    leverageIndex: context.leverageIndex,
  };
}

function getUniqueTriplePlayPositions(event: AtBatEvent): number[] {
  const sequence = event.enrichment?.fieldingSequence ?? [];
  const assists = event.enrichment?.assists ?? [];
  const putouts = event.enrichment?.putouts ?? [];

  return Array.from(
    new Set([...sequence, ...assists, ...putouts].filter((value) => Number.isInteger(value))),
  );
}

export function detectTriplePlayEvents(
  event: AtBatEvent,
  defendersByPosition: Partial<Record<number, DefensivePlayerIdentity>>,
): DetectedFameEvent[] {
  const outsRecorded =
    event.outsRecorded ?? Math.max(0, event.outsAfter - event.outs);

  if (event.result !== "TP" && outsRecorded !== 3) {
    return [];
  }

  const positions = getUniqueTriplePlayPositions(event);
  if (positions.length === 0) {
    return [];
  }

  const isUnassisted = positions.length === 1;
  const eventType: FameEventType = isUnassisted
    ? "UNASSISTED_TRIPLE_PLAY"
    : "TRIPLE_PLAY";

  const detectedEvents: DetectedFameEvent[] = [];
  for (const position of positions) {
    const defender = defendersByPosition[position];
    if (!defender) {
      continue;
    }

    detectedEvents.push({
      detectionKey: `${event.eventId}:${eventType}:${defender.playerId}`,
      eventType,
      playerId: defender.playerId,
      playerName: defender.playerName,
      inning: event.inning,
      halfInning: event.halfInning,
      leverageIndex: event.leverageIndex,
    });
  }

  return detectedEvents;
}

export function detectBackToBackHREvents(
  event: AtBatEvent,
  previousAtBat: AtBatEvent | null,
): DetectedFameEvent[] {
  if (
    event.result !== "HR" ||
    !previousAtBat ||
    previousAtBat.result !== "HR" ||
    previousAtBat.inning !== event.inning ||
    previousAtBat.halfInning !== event.halfInning ||
    previousAtBat.batterTeamId !== event.batterTeamId ||
    previousAtBat.batterId === event.batterId
  ) {
    return [];
  }

  return [
    {
      detectionKey: `b2b-hr:${previousAtBat.eventId}:${previousAtBat.batterId}`,
      eventType: "BACK_TO_BACK_HR",
      playerId: previousAtBat.batterId,
      playerName: previousAtBat.batterName,
      inning: event.inning,
      halfInning: event.halfInning,
      leverageIndex: previousAtBat.leverageIndex,
    },
    {
      detectionKey: `b2b-hr:${event.eventId}:${event.batterId}`,
      eventType: "BACK_TO_BACK_HR",
      playerId: event.batterId,
      playerName: event.batterName,
      inning: event.inning,
      halfInning: event.halfInning,
      leverageIndex: event.leverageIndex,
    },
  ];
}

export function detectWalkOffHREvent(
  event: AtBatEvent,
  scheduledInnings: number,
): DetectedFameEvent[] {
  if (
    event.result !== "HR" ||
    !event.isWalkOff ||
    event.halfInning !== "BOTTOM" ||
    event.inning < scheduledInnings
  ) {
    return [];
  }

  return [
    {
      detectionKey: `walkoff-hr:${event.eventId}:${event.batterId}`,
      eventType: "WALK_OFF_HR",
      playerId: event.batterId,
      playerName: event.batterName,
      inning: event.inning,
      halfInning: event.halfInning,
      leverageIndex: event.leverageIndex,
    },
  ];
}

export interface RunnerTootblanContext {
  runnerId: string;
  runnerName: string;
  inning: number;
  halfInning: HalfInning;
  leverageIndex?: number;
  outsBefore: number;
  basesBefore: {
    first: boolean;
    second: boolean;
    third: boolean;
  };
  source: "pickoff" | "caught_stealing" | "out_advancing" | "explicit";
}

export function detectTootblanEvent(
  context: RunnerTootblanContext,
): DetectedFameEvent[] {
  const isObjectiveAutoDetect =
    context.source === "pickoff" || context.source === "explicit";

  if (!isObjectiveAutoDetect) {
    return [];
  }

  const runnerWasInScoringPosition =
    context.basesBefore.second || context.basesBefore.third;
  const eventType: FameEventType =
    runnerWasInScoringPosition && context.outsBefore === 2
      ? "TOOTBLAN_RALLY_KILLER"
      : "TOOTBLAN";

  return [
    {
      detectionKey: `tootblan:${context.source}:${context.runnerId}:${context.inning}:${context.halfInning}`,
      eventType,
      playerId: context.runnerId,
      playerName: context.runnerName,
      inning: context.inning,
      halfInning: context.halfInning,
      leverageIndex: context.leverageIndex ?? 1,
    },
  ];
}

export function buildSaveAppearanceStartContextFromAtBat(
  event: AtBatEvent,
  scheduledInnings: number,
): SaveAppearanceStartContext {
  return {
    inning: event.inning,
    halfInning: event.halfInning,
    outs: event.outs,
    bases: {
      first: !!event.runners.first,
      second: !!event.runners.second,
      third: !!event.runners.third,
    },
    score: {
      away: event.awayScore,
      home: event.homeScore,
    },
    scheduledInnings,
    teamSide: getDefensiveSide(event.halfInning),
  };
}

export function buildSaveAppearanceUpdateContextFromAtBat(
  event: AtBatEvent,
  scheduledInnings: number,
): SaveAppearanceUpdateContext {
  const defenseSide = getDefensiveSide(event.halfInning);
  const runsAllowed =
    defenseSide === "home"
      ? event.awayScoreAfter - event.awayScore
      : event.homeScoreAfter - event.homeScore;

  return {
    inning: event.inning,
    halfInning: event.halfInning,
    score: {
      away: event.awayScoreAfter,
      home: event.homeScoreAfter,
    },
    scheduledInnings,
    additionalOuts:
      event.outsRecorded ?? Math.max(0, event.outsAfter - event.outs),
    additionalRuns: Math.max(0, runsAllowed),
    leverageIndex: event.leverageIndex,
  };
}

export function buildSaveAppearanceUpdateContextFromRunnerEvent(input: {
  inning: number;
  halfInning: HalfInning;
  scoreBefore: {
    away: number;
    home: number;
  };
  scoreAfter: {
    away: number;
    home: number;
  };
  outsDelta: number;
  runsAllowed: number;
  scheduledInnings: number;
  leverageIndex?: number;
}): SaveAppearanceUpdateContext {
  return {
    inning: input.inning,
    halfInning: input.halfInning,
    score: input.scoreAfter,
    scheduledInnings: input.scheduledInnings,
    additionalOuts: input.outsDelta,
    additionalRuns: input.runsAllowed,
    leverageIndex: input.leverageIndex,
  };
}

export function getTeamWonFromFinalScore(
  teamSide: TeamSide,
  finalScore: { away: number; home: number },
): boolean {
  return teamSide === "home"
    ? finalScore.home > finalScore.away
    : finalScore.away > finalScore.home;
}

export function getRunsAllowedForSide(
  teamSide: TeamSide,
  scoreBefore: { away: number; home: number },
  scoreAfter: { away: number; home: number },
): number {
  return Math.max(
    0,
    teamSide === "home"
      ? scoreAfter.away - scoreBefore.away
      : scoreAfter.home - scoreBefore.home,
  );
}

export function getLeadForTeamSide(
  teamSide: TeamSide,
  score: { away: number; home: number },
): number {
  return getLeadForSide(score, teamSide);
}
