import type {
  AtBatEvent,
  BetweenPlayEvent,
  FieldingEvent,
  RunnerInfo,
} from "./eventLog";
import {
  getBetweenPlayEvents,
  getGameEvents,
  getGameFieldingEvents,
} from "./eventLog";
import type { CompletedGameRecord, PersistedGameState } from "./gameStorage";
import { getCompletedGameById } from "./gameStorage";

type PlayerSnapshotStats = PersistedGameState["playerStats"][string];
type PitcherSnapshotStats = PersistedGameState["pitcherGameStats"][number] & {
  inheritedRunners?: number;
};

export type ReplayAuditSeverity = "info" | "warning" | "error" | "critical";
export type ReplayAuditConfidence = "high" | "medium" | "low";

export interface ReplayAuditMismatch {
  category: "batting" | "pitching" | "fielding" | "identity" | "game";
  field: string;
  playerId?: string;
  eventId?: string;
  expected: unknown;
  actual: unknown;
  severity: ReplayAuditSeverity;
  message: string;
}

export interface ReplayAuditUnsupportedEvent {
  stream: "at_bat" | "between_play" | "fielding";
  eventId: string;
  type: string;
  severity: ReplayAuditSeverity;
  message: string;
}

export interface ReplayAuditMissingIdentity {
  stream: "completed_game" | "at_bat" | "between_play" | "fielding";
  eventId: string;
  fields: string[];
  severity: ReplayAuditSeverity;
}

export interface ReplayAuditIssue {
  category: "replay" | "identity" | "attribution";
  eventId?: string;
  severity: ReplayAuditSeverity;
  message: string;
}

export interface ReplayDerivedStats {
  playerStats: PersistedGameState["playerStats"];
  pitcherGameStats: PitcherSnapshotStats[];
}

export interface ReplayAuditReport {
  gameId: string;
  confidence: ReplayAuditConfidence;
  severity: ReplayAuditSeverity;
  matchedCategories: string[];
  mismatches: ReplayAuditMismatch[];
  unsupportedEventTypes: ReplayAuditUnsupportedEvent[];
  missingIdentityFields: ReplayAuditMissingIdentity[];
  issues: ReplayAuditIssue[];
  derivedStats: ReplayDerivedStats;
  snapshotStats: ReplayDerivedStats | null;
}

export interface ReplayAuditInput {
  gameId: string;
  completedGame?: CompletedGameRecord | null;
  atBatEvents: AtBatEvent[];
  betweenPlayEvents?: BetweenPlayEvent[];
  fieldingEvents?: FieldingEvent[];
}

const PLAYER_COMPARE_FIELDS: Array<keyof PlayerSnapshotStats> = [
  "pa",
  "ab",
  "h",
  "singles",
  "doubles",
  "triples",
  "hr",
  "rbi",
  "r",
  "bb",
  "hbp",
  "k",
  "sb",
  "cs",
  "sf",
  "sh",
  "gidp",
  "putouts",
  "assists",
  "fieldingErrors",
];

const OPTIONAL_PLAYER_COMPARE_FIELDS = [
  "d3kOutcomes",
  "divingCatches",
  "robberies",
  "nutshots",
] as const;

const PITCHER_COMPARE_FIELDS: Array<keyof PitcherSnapshotStats> = [
  "outsRecorded",
  "hitsAllowed",
  "runsAllowed",
  "earnedRuns",
  "walksAllowed",
  "strikeoutsThrown",
  "homeRunsAllowed",
  "hitBatters",
  "wildPitches",
  "pitchCount",
  "battersFaced",
  "inheritedRunners",
];

const HIT_RESULTS = new Set(["1B", "2B", "3B", "HR", "ITPHR", "GRD"]);
const WALK_RESULTS = new Set(["BB", "IBB"]);
const STRIKEOUT_RESULTS = new Set(["K", "Kc", "Ꝁ", "D3K", "WP_K", "PB_K"]);
const NON_AB_RESULTS = new Set(["BB", "IBB", "HBP", "SF", "SAC"]);
const SUPPORTED_AT_BAT_RESULTS = new Set([
  "1B",
  "2B",
  "3B",
  "HR",
  "ITPHR",
  "GRD",
  "BB",
  "IBB",
  "HBP",
  "K",
  "Kc",
  "Ꝁ",
  "D3K",
  "WP_K",
  "PB_K",
  "GO",
  "FO",
  "FLO",
  "LO",
  "PO",
  "DP",
  "TP",
  "SF",
  "SAC",
  "E",
  "FC",
]);
const SUPPORTED_BETWEEN_PLAY_TYPES = new Set<BetweenPlayEvent["type"]>([
  "stolen_base",
  "caught_stealing",
  "pickoff",
  "wild_pitch",
  "passed_ball",
  "defensive_indifference",
  "runner_advance",
  "pitcher_change",
  "substitution",
  "position_change",
  "pitch_count_update",
  "manager_moment",
  "manager_recommendation",
]);
const SUPPORTED_FIELDING_PLAY_TYPES = new Set<FieldingEvent["playType"]>([
  "putout",
  "assist",
  "error",
  "double_play_pivot",
  "outfield_assist",
]);
const LIMITED_WEB_GEM_SPECIAL_PLAYS = new Set([
  "Diving",
  "Leaping",
  "Sliding",
  "Over Shoulder",
  "Wall Catch",
]);

function addLimitedReplayIssue(
  issues: ReplayAuditIssue[],
  eventId: string | undefined,
  message: string,
  severity: ReplayAuditSeverity = "info",
): void {
  issues.push({
    category: "replay",
    eventId,
    severity,
    message,
  });
}

function createEmptyPlayerStats(
  playerName: string,
  teamId: string,
): PlayerSnapshotStats {
  return {
    playerName,
    teamId,
    pa: 0,
    ab: 0,
    h: 0,
    singles: 0,
    doubles: 0,
    triples: 0,
    hr: 0,
    rbi: 0,
    r: 0,
    bb: 0,
    hbp: 0,
    k: 0,
    sb: 0,
    cs: 0,
    sf: 0,
    sh: 0,
    gidp: 0,
    putouts: 0,
    assists: 0,
    fieldingErrors: 0,
    grandSlams: 0,
  };
}

function createEmptyPitcherStats(
  pitcherId: string,
  pitcherName: string,
  teamId: string,
): PitcherSnapshotStats {
  return {
    pitcherId,
    pitcherName,
    teamId,
    isStarter: false,
    entryInning: 1,
    outsRecorded: 0,
    hitsAllowed: 0,
    runsAllowed: 0,
    earnedRuns: 0,
    walksAllowed: 0,
    strikeoutsThrown: 0,
    homeRunsAllowed: 0,
    hitBatters: 0,
    basesReachedViaError: 0,
    wildPitches: 0,
    pitchCount: 0,
    battersFaced: 0,
    consecutiveHRsAllowed: 0,
    firstInningRuns: 0,
    basesLoadedWalks: 0,
    inningsComplete: 0,
    decision: null,
    save: false,
    hold: false,
    blownSave: false,
    inheritedRunners: 0,
  };
}

function numericRunCount(runsScored: AtBatEvent["runsScored"]): number {
  return Array.isArray(runsScored) ? runsScored.length : Number(runsScored || 0);
}

function addMatched(matched: Set<string>, category: string): void {
  matched.add(category);
}

function getOrCreatePlayer(
  stats: PersistedGameState["playerStats"],
  playerId: string,
  playerName: string | undefined,
  teamId: string | undefined,
  snapshot?: CompletedGameRecord | null,
): PlayerSnapshotStats {
  if (!stats[playerId]) {
    const snapshotStats = snapshot?.playerStats?.[playerId];
    stats[playerId] = createEmptyPlayerStats(
      playerName || snapshotStats?.playerName || playerId,
      teamId || snapshotStats?.teamId || "unknown",
    );
  }
  return stats[playerId];
}

function getOrCreatePitcher(
  stats: Map<string, PitcherSnapshotStats>,
  pitcherId: string,
  pitcherName: string | undefined,
  teamId: string | undefined,
  snapshot?: CompletedGameRecord | null,
): PitcherSnapshotStats {
  const existing = stats.get(pitcherId);
  if (existing) return existing;
  const snapshotStats = snapshot?.pitcherGameStats?.find((pitcher) => pitcher.pitcherId === pitcherId) as
    | PitcherSnapshotStats
    | undefined;
  const next = createEmptyPitcherStats(
    pitcherId,
    pitcherName || snapshotStats?.pitcherName || pitcherId,
    teamId || snapshotStats?.teamId || "unknown",
  );
  if (snapshotStats?.isStarter) next.isStarter = true;
  if (typeof snapshotStats?.entryInning === "number") {
    next.entryInning = snapshotStats.entryInning;
  }
  stats.set(pitcherId, next);
  return next;
}

function resultHitField(
  result: string,
): "singles" | "doubles" | "triples" | "hr" | null {
  switch (result) {
    case "1B":
      return "singles";
    case "2B":
    case "GRD":
      return "doubles";
    case "3B":
      return "triples";
    case "HR":
    case "ITPHR":
      return "hr";
    default:
      return null;
  }
}

function deriveOutsRecorded(event: AtBatEvent): number {
  if (typeof event.outsRecorded === "number") {
    return Math.max(0, event.outsRecorded);
  }
  if (event.outsAfter >= event.outs) {
    return event.outsAfter - event.outs;
  }
  return Math.max(0, 3 - event.outs + event.outsAfter);
}

function runnerEntries(runners: AtBatEvent["runners"]): RunnerInfo[] {
  return [runners.first, runners.second, runners.third].filter(
    (runner): runner is RunnerInfo => Boolean(runner),
  );
}

function resolveRunPitcher(
  event: AtBatEvent,
  runnerId: string,
): { pitcherId: string; pitcherName?: string; teamId: string; fallback: boolean } {
  if (
    runnerId === event.batterId &&
    (event.result === "HR" || event.result === "ITPHR")
  ) {
    return {
      pitcherId: event.pitcherId,
      pitcherName: event.pitcherName,
      teamId: event.pitcherTeamId,
      fallback: false,
    };
  }
  const responsibleRunner = runnerEntries(event.runners).find(
    (runner) => runner.runnerId === runnerId,
  );
  if (responsibleRunner?.responsiblePitcherId) {
    return {
      pitcherId: responsibleRunner.responsiblePitcherId,
      teamId: event.pitcherTeamId,
      fallback: false,
    };
  }
  return {
    pitcherId: event.pitcherId,
    pitcherName: event.pitcherName,
    teamId: event.pitcherTeamId,
    fallback: true,
  };
}

function issueForRunAttribution(
  event: AtBatEvent,
  message: string,
): ReplayAuditIssue {
  return {
    category: "attribution",
    eventId: event.eventId,
    severity: "warning",
    message,
  };
}

function applyAtBatEvent(
  event: AtBatEvent,
  derived: ReplayDerivedStats,
  pitcherStats: Map<string, PitcherSnapshotStats>,
  snapshot: CompletedGameRecord | null | undefined,
  reportParts: {
    matched: Set<string>;
    issues: ReplayAuditIssue[];
    unsupportedEventTypes: ReplayAuditUnsupportedEvent[];
  },
): void {
  const result = event.result;
  if (!SUPPORTED_AT_BAT_RESULTS.has(result)) {
    reportParts.unsupportedEventTypes.push({
      stream: "at_bat",
      eventId: event.eventId,
      type: result,
      severity: "warning",
      message: `At-bat result ${result} is not replayed by the Pass 2B-1 audit harness yet.`,
    });
    return;
  }

  const batter = getOrCreatePlayer(
    derived.playerStats,
    event.batterId,
    event.batterName,
    event.batterTeamId,
    snapshot,
  );
  const pitcher = getOrCreatePitcher(
    pitcherStats,
    event.pitcherId,
    event.pitcherName,
    event.pitcherTeamId,
    snapshot,
  );

  batter.pa += 1;
  pitcher.battersFaced += 1;
  addMatched(reportParts.matched, "plateAppearances");

  if (!NON_AB_RESULTS.has(result)) {
    batter.ab += 1;
  }

  const hitField = resultHitField(result);
  if (hitField) {
    batter.h += 1;
    batter[hitField] = Number(batter[hitField] || 0) + 1;
    pitcher.hitsAllowed += 1;
    if (hitField === "hr") {
      pitcher.homeRunsAllowed += 1;
    }
    addMatched(reportParts.matched, "hits");
  }

  if (WALK_RESULTS.has(result)) {
    batter.bb += 1;
    if (result === "BB") {
      pitcher.walksAllowed += 1;
    }
    addMatched(reportParts.matched, "walks");
  }

  if (result === "HBP") {
    batter.hbp += 1;
    pitcher.hitBatters += 1;
    addMatched(reportParts.matched, "hitByPitch");
  }

  if (STRIKEOUT_RESULTS.has(result)) {
    batter.k += 1;
    pitcher.strikeoutsThrown += 1;
    if (result === "D3K" || result === "WP_K" || result === "PB_K") {
      batter.d3kOutcomes = Number(batter.d3kOutcomes || 0) + 1;
      addMatched(reportParts.matched, "droppedThirdStrikeOutcomes");
    }
    addMatched(reportParts.matched, "strikeouts");
  }

  if (result === "SF") {
    batter.sf += 1;
    addMatched(reportParts.matched, "sacrificeFlies");
  }
  if (result === "SAC") {
    batter.sh += 1;
    addMatched(reportParts.matched, "sacrificeBunts");
  }
  if (result === "DP") {
    batter.gidp += 1;
    addMatched(reportParts.matched, "doublePlays");
  }
  if (result === "FC") {
    addMatched(reportParts.matched, "fieldersChoicesObserved");
  }
  if (result === "E") {
    pitcher.basesReachedViaError += 1;
    if (numericRunCount(event.runsScored) > 0) {
      reportParts.issues.push(
        issueForRunAttribution(
          event,
          "Runs on error plays are counted as runs allowed in replay, but earned-run reconstruction is not supported yet.",
        ),
      );
    }
  }

  const outsRecorded = deriveOutsRecorded(event);
  pitcher.outsRecorded += outsRecorded;
  if (outsRecorded > 0) {
    addMatched(reportParts.matched, "outsRecorded");
  }

  batter.rbi += event.rbiCount || 0;
  if (event.rbiCount) {
    addMatched(reportParts.matched, "rbi");
  }

  if (Array.isArray(event.runsScored)) {
    for (const runnerId of event.runsScored) {
      const runner =
        runnerEntries(event.runners).find((entry) => entry.runnerId === runnerId) ??
        (runnerId === event.batterId
          ? {
              runnerId: event.batterId,
              runnerName: event.batterName,
              responsiblePitcherId: event.pitcherId,
            }
          : null);
      const scoringPlayer = getOrCreatePlayer(
        derived.playerStats,
        runnerId,
        runner?.runnerName,
        runnerId === event.batterId ? event.batterTeamId : undefined,
        snapshot,
      );
      scoringPlayer.r += 1;
      const runPitcher = resolveRunPitcher(event, runnerId);
      const chargedPitcher = getOrCreatePitcher(
        pitcherStats,
        runPitcher.pitcherId,
        runPitcher.pitcherName,
        runPitcher.teamId,
        snapshot,
      );
      chargedPitcher.runsAllowed += 1;
      if (result !== "E" && !event.batterReachedOnError) {
        chargedPitcher.earnedRuns += 1;
      }
      if (runPitcher.fallback) {
        reportParts.issues.push(
          issueForRunAttribution(
            event,
            `Run scored by ${runnerId} did not include a responsible pitcher in event runners; current pitcher was used as a replay fallback.`,
          ),
        );
      }
    }
    if (event.runsScored.length > 0) {
      addMatched(reportParts.matched, "runs");
    }
  } else if (event.runsScored > 0) {
    reportParts.issues.push(
      issueForRunAttribution(
        event,
        "Legacy numeric runsScored cannot attribute player runs or responsible pitchers during replay.",
      ),
    );
    pitcher.runsAllowed += event.runsScored;
    if (result !== "E" && !event.batterReachedOnError) {
      pitcher.earnedRuns += event.runsScored;
    }
  }

  if (typeof event.enrichment?.pitchesInAtBat === "number") {
    pitcher.pitchCount += event.enrichment.pitchesInAtBat;
    addMatched(reportParts.matched, "pitchCount");
  }

  if (event.isClutch || Math.abs(Number(event.wpa || 0)) >= 0.1) {
    addMatched(reportParts.matched, "clutchWpaContextObserved");
    addLimitedReplayIssue(
      reportParts.issues,
      event.eventId,
      "WPA/clutch context is preserved on at-bat rows, but the Pass 2B audit harness does not recompute WPA or clutch classifications from game state.",
      "info",
    );
  }
}

function applyBetweenPlayEvent(
  event: BetweenPlayEvent,
  derived: ReplayDerivedStats,
  pitcherStats: Map<string, PitcherSnapshotStats>,
  snapshot: CompletedGameRecord | null | undefined,
  reportParts: {
    matched: Set<string>;
    unsupportedEventTypes: ReplayAuditUnsupportedEvent[];
    issues: ReplayAuditIssue[];
  },
): void {
  if (!SUPPORTED_BETWEEN_PLAY_TYPES.has(event.type)) {
    reportParts.unsupportedEventTypes.push({
      stream: "between_play",
      eventId: event.eventId,
      type: event.type,
      severity: "warning",
      message: `Between-play event type ${event.type} is not replayed by the Pass 2B-1 audit harness yet.`,
    });
    return;
  }

  const runnerAction = event.runnerAction;
  if (event.type === "stolen_base" || runnerAction?.reason === "stolen_base") {
    const payload = event.stolenBase;
    const runnerId = payload?.runnerId || runnerAction?.runnerId;
    if (runnerId) {
      const runner = getOrCreatePlayer(
        derived.playerStats,
        runnerId,
        payload?.runnerName || runnerAction?.runnerName,
        undefined,
        snapshot,
      );
      runner.sb += 1;
      addMatched(reportParts.matched, "stolenBases");
    }
    return;
  }

  if (event.type === "caught_stealing" || runnerAction?.reason === "caught_stealing") {
    const runnerId = runnerAction?.runnerId || event.stolenBase?.runnerId;
    if (runnerId) {
      const runner = getOrCreatePlayer(
        derived.playerStats,
        runnerId,
        runnerAction?.runnerName || event.stolenBase?.runnerName,
        undefined,
        snapshot,
      );
      runner.cs += 1;
      addMatched(reportParts.matched, "caughtStealing");
    }
    return;
  }

  if (event.type === "pickoff" || runnerAction?.reason === "pickoff") {
    addMatched(reportParts.matched, "pickoffsObserved");
    addLimitedReplayIssue(
      reportParts.issues,
      event.eventId,
      "Pickoff between-play rows are recognized, but the v1 snapshot stat model has no dedicated pickoff counting field to replay.",
      "warning",
    );
    return;
  }

  if (event.type === "defensive_indifference") {
    addMatched(reportParts.matched, "defensiveIndifferenceObserved");
    addLimitedReplayIssue(
      reportParts.issues,
      event.eventId,
      "Defensive indifference is recognized as a no-steal runner movement and is not applied to counting stats by the replay audit.",
      "info",
    );
    return;
  }

  if (event.type === "runner_advance") {
    addMatched(reportParts.matched, "runnerAdvancesObserved");
    addLimitedReplayIssue(
      reportParts.issues,
      event.eventId,
      "Generic runner advance rows are recognized, but replay only audits their presence because v1 snapshots do not expose a durable generic runner-advance stat.",
      runnerAction?.outcome === "out" ? "warning" : "info",
    );
    return;
  }

  if (event.type === "wild_pitch" || event.wildPitchOrPassedBall?.wpOrPb === "wild_pitch") {
    const pitcherId = event.wildPitchOrPassedBall?.pitcherId || event.runnerAttribution?.pitcherId;
    if (pitcherId) {
      const pitcher = getOrCreatePitcher(
        pitcherStats,
        pitcherId,
        event.runnerAttribution?.pitcherName,
        undefined,
        snapshot,
      );
      pitcher.wildPitches += 1;
      addMatched(reportParts.matched, "wildPitches");
    }
    return;
  }

  if (event.type === "pitch_count_update" && event.pitchCountUpdate) {
    const pitcher = getOrCreatePitcher(
      pitcherStats,
      event.pitchCountUpdate.pitcherId,
      undefined,
      undefined,
      snapshot,
    );
    pitcher.pitchCount = event.pitchCountUpdate.pitchCount;
    addMatched(reportParts.matched, "pitchCount");
    return;
  }

  if (event.type === "pitcher_change" && event.pitcherChange) {
    const incoming = getOrCreatePitcher(
      pitcherStats,
      event.pitcherChange.incomingPitcherId,
      event.pitcherChange.incomingPitcherName,
      undefined,
      snapshot,
    );
    incoming.inheritedRunners = event.pitcherChange.inheritedRunners;
    const outgoing = getOrCreatePitcher(
      pitcherStats,
      event.pitcherChange.outgoingPitcherId,
      event.pitcherChange.outgoingPitcherName,
      undefined,
      snapshot,
    );
    if (typeof event.pitcherChange.outgoingPitchCount === "number") {
      outgoing.pitchCount = event.pitcherChange.outgoingPitchCount;
    }
    addMatched(reportParts.matched, "pitcherChanges");
    return;
  }

  if (event.type === "substitution" || event.type === "position_change") {
    addMatched(reportParts.matched, "lineupChanges");
    return;
  }

  if (event.type === "passed_ball") {
    addMatched(reportParts.matched, "passedBallsObserved");
    return;
  }

  if (event.type === "manager_moment" || event.type === "manager_recommendation") {
    addMatched(reportParts.matched, "managerContextObserved");
    addLimitedReplayIssue(
      reportParts.issues,
      event.eventId,
      `${event.type} rows are preserved as manager context but do not produce replay-derived game-level counting stats.`,
      "info",
    );
  }
}

function applyFieldingEvent(
  event: FieldingEvent,
  derived: ReplayDerivedStats,
  snapshot: CompletedGameRecord | null | undefined,
  reportParts: {
    matched: Set<string>;
    unsupportedEventTypes: ReplayAuditUnsupportedEvent[];
    issues: ReplayAuditIssue[];
  },
): void {
  if (!SUPPORTED_FIELDING_PLAY_TYPES.has(event.playType)) {
    if (event.playType === "base_save") {
      addMatched(reportParts.matched, "fieldingBaseSavesObserved");
      addLimitedReplayIssue(
        reportParts.issues,
        event.fieldingEventId,
        "Fielding base_save rows are recognized as fWAR/context inputs, but the replay audit does not map them to snapshot counting stats yet.",
        "warning",
      );
    } else {
      reportParts.unsupportedEventTypes.push({
        stream: "fielding",
        eventId: event.fieldingEventId,
        type: event.playType,
        severity: "warning",
        message: `Fielding play type ${event.playType} is not replayed by the Pass 2B-1 audit harness yet.`,
      });
    }
    return;
  }

  const fielder = getOrCreatePlayer(
    derived.playerStats,
    event.playerId,
    event.playerName,
    event.teamId,
    snapshot,
  );
  if (event.playType === "putout") {
    fielder.putouts += 1;
  } else if (
    event.playType === "assist" ||
    event.playType === "outfield_assist" ||
    event.playType === "double_play_pivot"
  ) {
    fielder.assists += 1;
  } else if (event.playType === "error") {
    fielder.fieldingErrors += 1;
  }

  if (event.specialPlayType === "Robbed HR") {
    fielder.robberies = Number(fielder.robberies || 0) + 1;
    addMatched(reportParts.matched, "fieldingRobberies");
  } else if (event.specialPlayType && LIMITED_WEB_GEM_SPECIAL_PLAYS.has(event.specialPlayType)) {
    addMatched(reportParts.matched, "fieldingWebGemsObserved");
    addLimitedReplayIssue(
      reportParts.issues,
      event.fieldingEventId,
      `Fielding special play ${event.specialPlayType} is preserved as web-gem context, but the replay audit only derives explicit robbery totals today.`,
      "warning",
    );
  }

  addMatched(reportParts.matched, "fieldingEvents");
}

function buildSnapshotStats(
  game: CompletedGameRecord | null | undefined,
): ReplayDerivedStats | null {
  if (!game) return null;
  return {
    playerStats: game.playerStats || {},
    pitcherGameStats: (game.pitcherGameStats || []) as PitcherSnapshotStats[],
  };
}

export function replayGameStatsFromEvents(input: ReplayAuditInput): ReplayDerivedStats {
  const derived: ReplayDerivedStats = {
    playerStats: {},
    pitcherGameStats: [],
  };
  const pitcherStats = new Map<string, PitcherSnapshotStats>();
  const matched = new Set<string>();
  const reportParts = {
    matched,
    issues: [] as ReplayAuditIssue[],
    unsupportedEventTypes: [] as ReplayAuditUnsupportedEvent[],
  };

  for (const event of input.atBatEvents.filter((event) => !event.undoneAt)) {
    applyAtBatEvent(
      event,
      derived,
      pitcherStats,
      input.completedGame,
      reportParts,
    );
  }

  for (const event of (input.betweenPlayEvents || []).filter((event) => !event.undoneAt)) {
    applyBetweenPlayEvent(
      event,
      derived,
      pitcherStats,
      input.completedGame,
      {
        matched,
        unsupportedEventTypes: reportParts.unsupportedEventTypes,
        issues: reportParts.issues,
      },
    );
  }

  for (const event of input.fieldingEvents || []) {
    applyFieldingEvent(event, derived, input.completedGame, reportParts);
  }

  derived.pitcherGameStats = Array.from(pitcherStats.values()).sort((a, b) =>
    a.pitcherId.localeCompare(b.pitcherId),
  );
  return derived;
}

function addMismatch(
  mismatches: ReplayAuditMismatch[],
  mismatch: ReplayAuditMismatch,
): void {
  mismatches.push(mismatch);
}

function normalizeNumber(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function comparePlayerStats(
  derived: PersistedGameState["playerStats"],
  snapshot: PersistedGameState["playerStats"],
): ReplayAuditMismatch[] {
  const mismatches: ReplayAuditMismatch[] = [];
  const playerIds = new Set([...Object.keys(derived), ...Object.keys(snapshot)]);

  for (const playerId of playerIds) {
    const derivedStats = derived[playerId];
    const snapshotStats = snapshot[playerId];
    if (!derivedStats || !snapshotStats) {
      addMismatch(mismatches, {
        category: "batting",
        field: "playerStats",
        playerId,
        expected: snapshotStats ?? null,
        actual: derivedStats ?? null,
        severity: "error",
        message: `Player ${playerId} exists in only one stat source.`,
      });
      continue;
    }
    for (const field of PLAYER_COMPARE_FIELDS) {
      const expected = normalizeNumber(snapshotStats[field]);
      const actual = normalizeNumber(derivedStats[field]);
      if (expected !== actual) {
        addMismatch(mismatches, {
          category:
            field === "putouts" || field === "assists" || field === "fieldingErrors"
              ? "fielding"
              : "batting",
          field,
          playerId,
          expected,
          actual,
          severity: "error",
          message: `Player ${playerId} ${field} mismatch: snapshot=${expected}, replay=${actual}.`,
        });
      }
    }
    for (const field of OPTIONAL_PLAYER_COMPARE_FIELDS) {
      const expected = normalizeNumber(snapshotStats[field]);
      const actual = normalizeNumber(derivedStats[field]);
      if ((expected !== 0 || actual !== 0) && expected !== actual) {
        addMismatch(mismatches, {
          category: "fielding",
          field,
          playerId,
          expected,
          actual,
          severity: "warning",
          message: `Player ${playerId} optional ${field} mismatch: snapshot=${expected}, replay=${actual}.`,
        });
      }
    }
  }

  return mismatches;
}

function comparePitcherStats(
  derived: PitcherSnapshotStats[],
  snapshot: PitcherSnapshotStats[],
): ReplayAuditMismatch[] {
  const mismatches: ReplayAuditMismatch[] = [];
  const byId = (pitchers: PitcherSnapshotStats[]) =>
    new Map(pitchers.map((pitcher) => [pitcher.pitcherId, pitcher]));
  const derivedById = byId(derived);
  const snapshotById = byId(snapshot);
  const pitcherIds = new Set([...derivedById.keys(), ...snapshotById.keys()]);

  for (const pitcherId of pitcherIds) {
    const derivedStats = derivedById.get(pitcherId);
    const snapshotStats = snapshotById.get(pitcherId);
    if (!derivedStats || !snapshotStats) {
      addMismatch(mismatches, {
        category: "pitching",
        field: "pitcherGameStats",
        playerId: pitcherId,
        expected: snapshotStats ?? null,
        actual: derivedStats ?? null,
        severity: "error",
        message: `Pitcher ${pitcherId} exists in only one stat source.`,
      });
      continue;
    }

    for (const field of PITCHER_COMPARE_FIELDS) {
      const expected = normalizeNumber(snapshotStats[field]);
      const actual = normalizeNumber(derivedStats[field]);
      if (expected !== actual) {
        addMismatch(mismatches, {
          category: "pitching",
          field,
          playerId: pitcherId,
          expected,
          actual,
          severity:
            field === "pitchCount" || field === "inheritedRunners"
              ? "warning"
              : "error",
          message: `Pitcher ${pitcherId} ${field} mismatch: snapshot=${expected}, replay=${actual}.`,
        });
      }
    }
  }

  return mismatches;
}

function requiredIdentityFields(game: CompletedGameRecord | null | undefined): string[] {
  if (!game) return ["gameId"];
  return [
    "seasonId",
    "statsScopeId",
    "competitionType",
    "competitionId",
    "franchiseId",
    "scheduleGameId",
    "playoffId",
    "playoffSeriesId",
    "playoffGameNumber",
  ].filter((field) => game[field as keyof CompletedGameRecord] !== undefined && game[field as keyof CompletedGameRecord] !== null);
}

function collectMissingIdentity(
  stream: ReplayAuditMissingIdentity["stream"],
  event: AtBatEvent | BetweenPlayEvent | FieldingEvent,
  fields: string[],
): ReplayAuditMissingIdentity | null {
  const missing = fields.filter((field) => {
    if (field === "gameId") return !event.gameId;
    return (event as unknown as Record<string, unknown>)[field] === undefined;
  });
  if (missing.length === 0) return null;
  return {
    stream,
    eventId: "eventId" in event ? event.eventId : event.fieldingEventId,
    fields: missing,
    severity: "warning",
  };
}

function completedGameIdentityRequirements(
  game: CompletedGameRecord | null | undefined,
): string[] {
  if (!game) return [];
  const isFranchiseRegularSeason =
    game.competitionType === "franchise" || Boolean(game.franchiseId);
  const isFranchisePostseason =
    game.competitionType === "playoff" &&
    Boolean(game.franchiseId || game.playoffId || game.playoffSeriesId);

  if (!isFranchiseRegularSeason && !isFranchisePostseason) return [];

  const fields = ["franchiseId", "seasonId", "statsScopeId"];
  if (game.competitionType === "franchise") fields.push("scheduleGameId");
  return fields;
}

function collectCompletedGameMissingIdentity(
  game: CompletedGameRecord | null | undefined,
): ReplayAuditMissingIdentity | null {
  const fields = completedGameIdentityRequirements(game);
  if (!game || fields.length === 0) return null;

  const missing = fields.filter(
    (field) => game[field as keyof CompletedGameRecord] === undefined || game[field as keyof CompletedGameRecord] === null,
  );
  if (missing.length === 0) return null;

  return {
    stream: "completed_game",
    eventId: game.gameId,
    fields: missing,
    severity: "error",
  };
}

function collectCorrectionReplayIssues(
  atBatEvents: AtBatEvent[],
  betweenPlayEvents: BetweenPlayEvent[],
): ReplayAuditIssue[] {
  const issues: ReplayAuditIssue[] = [];

  for (const event of atBatEvents) {
    if (event.undoneAt) {
      addLimitedReplayIssue(
        issues,
        event.eventId,
        "Undone at-bat row was skipped during replay; audit output is based on active event rows.",
        "info",
      );
    } else if ((event.version ?? 1) > 1 || (event.editHistory?.length || 0) > 0) {
      addLimitedReplayIssue(
        issues,
        event.eventId,
        "Corrected at-bat row was replayed from its active version; original edit history is audited as metadata, not physically replayed.",
        "info",
      );
    }
  }

  for (const event of betweenPlayEvents) {
    if (event.undoneAt) {
      addLimitedReplayIssue(
        issues,
        event.eventId,
        "Undone between-play row was skipped during replay; audit output is based on active event rows.",
        "info",
      );
    } else if ((event.version ?? 1) > 1 || (event.editHistory?.length || 0) > 0) {
      addLimitedReplayIssue(
        issues,
        event.eventId,
        "Corrected between-play row was replayed from its active version; original edit history is audited as metadata, not physically replayed.",
        "info",
      );
    }
  }

  return issues;
}

function compareIdentity(
  game: CompletedGameRecord | null | undefined,
  atBatEvents: AtBatEvent[],
  betweenPlayEvents: BetweenPlayEvent[],
  fieldingEvents: FieldingEvent[],
): {
  missingIdentityFields: ReplayAuditMissingIdentity[];
  mismatches: ReplayAuditMismatch[];
} {
  const fields = requiredIdentityFields(game);
  const missingIdentityFields: ReplayAuditMissingIdentity[] = [];
  const mismatches: ReplayAuditMismatch[] = [];
  const completedGameMissing = collectCompletedGameMissingIdentity(game);
  if (completedGameMissing) missingIdentityFields.push(completedGameMissing);

  for (const event of atBatEvents) {
    const missing = collectMissingIdentity("at_bat", event, fields);
    if (missing) missingIdentityFields.push(missing);
  }
  for (const event of betweenPlayEvents) {
    const missing = collectMissingIdentity("between_play", event, fields);
    if (missing) missingIdentityFields.push(missing);
  }
  for (const event of fieldingEvents) {
    const missing = collectMissingIdentity("fielding", event, ["gameId"]);
    if (missing) missingIdentityFields.push(missing);
  }

  if (!game) return { missingIdentityFields, mismatches };

  for (const event of [...atBatEvents, ...betweenPlayEvents]) {
    const eventRecord = event as unknown as Record<string, unknown>;
    for (const field of fields) {
      const expected = game[field as keyof CompletedGameRecord];
      const actual = eventRecord[field];
      if (actual !== undefined && actual !== expected) {
        addMismatch(mismatches, {
          category: "identity",
          field,
          eventId: event.eventId,
          expected,
          actual,
          severity: "error",
          message: `Event ${event.eventId} has ${field}=${String(actual)} but completed game has ${String(expected)}.`,
        });
      }
    }
  }

  return { missingIdentityFields, mismatches };
}

function reportSeverity(report: {
  mismatches: ReplayAuditMismatch[];
  unsupportedEventTypes: ReplayAuditUnsupportedEvent[];
  missingIdentityFields: ReplayAuditMissingIdentity[];
  issues: ReplayAuditIssue[];
}): ReplayAuditSeverity {
  const severities = [
    ...report.mismatches.map((mismatch) => mismatch.severity),
    ...report.unsupportedEventTypes.map((event) => event.severity),
    ...report.missingIdentityFields.map((identity) => identity.severity),
    ...report.issues.map((issue) => issue.severity),
  ];
  if (severities.includes("critical")) return "critical";
  if (severities.includes("error")) return "error";
  if (severities.includes("warning")) return "warning";
  return "info";
}

function reportConfidence(severity: ReplayAuditSeverity): ReplayAuditConfidence {
  if (severity === "critical" || severity === "error") return "low";
  if (severity === "warning") return "medium";
  return "high";
}

export function auditReplayAgainstSnapshot(input: ReplayAuditInput): ReplayAuditReport {
  const derivedStats = replayGameStatsFromEvents(input);
  const snapshotStats = buildSnapshotStats(input.completedGame);
  const matched = new Set<string>();
  const replayParts = {
    matched,
    issues: collectCorrectionReplayIssues(
      input.atBatEvents,
      input.betweenPlayEvents || [],
    ),
    unsupportedEventTypes: [] as ReplayAuditUnsupportedEvent[],
  };

  // Re-run with report side effects so callers get unsupported/issue details
  const reportedDerived: ReplayDerivedStats = {
    playerStats: {},
    pitcherGameStats: [],
  };
  const reportedPitchers = new Map<string, PitcherSnapshotStats>();
  for (const event of input.atBatEvents.filter((event) => !event.undoneAt)) {
    applyAtBatEvent(event, reportedDerived, reportedPitchers, input.completedGame, replayParts);
  }
  for (const event of (input.betweenPlayEvents || []).filter((event) => !event.undoneAt)) {
    applyBetweenPlayEvent(
      event,
      reportedDerived,
      reportedPitchers,
      input.completedGame,
      {
        matched,
        unsupportedEventTypes: replayParts.unsupportedEventTypes,
        issues: replayParts.issues,
      },
    );
  }
  for (const event of input.fieldingEvents || []) {
    applyFieldingEvent(event, reportedDerived, input.completedGame, replayParts);
  }

  const statMismatches = snapshotStats
    ? [
        ...comparePlayerStats(derivedStats.playerStats, snapshotStats.playerStats),
        ...comparePitcherStats(
          derivedStats.pitcherGameStats as PitcherSnapshotStats[],
          snapshotStats.pitcherGameStats as PitcherSnapshotStats[],
        ),
      ]
    : [];
  const identity = compareIdentity(
    input.completedGame,
    input.atBatEvents,
    input.betweenPlayEvents || [],
    input.fieldingEvents || [],
  );
  const mismatches = [...statMismatches, ...identity.mismatches];
  const severity = reportSeverity({
    mismatches,
    unsupportedEventTypes: replayParts.unsupportedEventTypes,
    missingIdentityFields: identity.missingIdentityFields,
    issues: replayParts.issues,
  });

  return {
    gameId: input.gameId,
    confidence: reportConfidence(severity),
    severity,
    matchedCategories: Array.from(matched).sort(),
    mismatches,
    unsupportedEventTypes: replayParts.unsupportedEventTypes,
    missingIdentityFields: identity.missingIdentityFields,
    issues: replayParts.issues,
    derivedStats,
    snapshotStats,
  };
}

export async function auditCompletedGameReplayById(
  gameId: string,
): Promise<ReplayAuditReport> {
  const [completedGame, atBatEvents, betweenPlayEvents, fieldingEvents] =
    await Promise.all([
      getCompletedGameById(gameId),
      getGameEvents(gameId),
      getBetweenPlayEvents(gameId),
      getGameFieldingEvents(gameId),
    ]);

  return auditReplayAgainstSnapshot({
    gameId,
    completedGame,
    atBatEvents,
    betweenPlayEvents,
    fieldingEvents,
  });
}
