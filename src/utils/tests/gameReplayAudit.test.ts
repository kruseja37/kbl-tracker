import "fake-indexeddb/auto";

import { describe, expect, test, vi } from "vitest";

import {
  auditCompletedGameReplayById,
  auditReplayAgainstSnapshot,
} from "../gameReplayAudit";
import {
  logAtBatEvent,
  logBetweenPlayEvent,
  logFieldingEvent,
  type AtBatEvent,
  type BetweenPlayEvent,
  type FieldingEvent,
} from "../eventLog";
import {
  archiveCompletedGame,
  getCompletedGameById,
  type CompletedGameRecord,
  type PersistedGameState,
} from "../gameStorage";

vi.mock("../syncEngine", () => ({
  syncEngine: {
    isSuppressed: () => true,
    upsert: vi.fn(),
    remove: vi.fn(),
  },
}));

function playerStats(
  playerName: string,
  teamId: string,
  overrides: Partial<PersistedGameState["playerStats"][string]> = {},
): PersistedGameState["playerStats"][string] {
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
    ...overrides,
  };
}

function pitcherStats(
  pitcherId: string,
  pitcherName: string,
  teamId: string,
  overrides: Partial<PersistedGameState["pitcherGameStats"][number]> & {
    inheritedRunners?: number;
  } = {},
): PersistedGameState["pitcherGameStats"][number] & {
  inheritedRunners?: number;
} {
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
    ...overrides,
  };
}

function completedGame(
  gameId: string,
  overrides: Partial<CompletedGameRecord> = {},
): CompletedGameRecord {
  return {
    gameId,
    date: 1,
    seasonId: "franchise-a-season-1",
    statsScopeId: "franchise-a-season-1",
    competitionType: "franchise",
    competitionId: "franchise-a",
    franchiseId: "franchise-a",
    scheduleGameId: `${gameId}-schedule`,
    seasonNumber: 1,
    awayTeamId: "away",
    homeTeamId: "home",
    awayTeamName: "Away",
    homeTeamName: "Home",
    finalScore: { away: 0, home: 0 },
    innings: 1,
    fameEvents: [],
    playerStats: {},
    pitcherGameStats: [],
    activityLog: [],
    inningScores: [],
    aggregationStatus: "aggregated",
    ...overrides,
  };
}

function atBat(
  gameId: string,
  eventIndex: number,
  overrides: Partial<AtBatEvent>,
): AtBatEvent {
  return {
    eventId: `${gameId}-ab-${eventIndex}`,
    gameId,
    eventIndex,
    timestamp: eventIndex,
    batterId: `batter-${eventIndex}`,
    batterName: `Batter ${eventIndex}`,
    batterTeamId: "away",
    pitcherId: "home-p1",
    pitcherName: "Home Pitcher",
    pitcherTeamId: "home",
    result: "GO",
    rbiCount: 0,
    runsScored: [],
    inning: 1,
    halfInning: "TOP",
    outs: 0,
    runners: { first: null, second: null, third: null },
    awayScore: 0,
    homeScore: 0,
    outsAfter: 1,
    runnersAfter: { first: null, second: null, third: null },
    awayScoreAfter: 0,
    homeScoreAfter: 0,
    leverageIndex: 1,
    winProbabilityBefore: 0.5,
    winProbabilityAfter: 0.49,
    wpa: -0.01,
    ballInPlay: null,
    fameEvents: [],
    isLeadoff: eventIndex === 1,
    isClutch: false,
    isWalkOff: false,
    seasonId: "franchise-a-season-1",
    seasonNumber: 1,
    statsScopeId: "franchise-a-season-1",
    competitionType: "franchise",
    competitionId: "franchise-a",
    franchiseId: "franchise-a",
    scheduleGameId: `${gameId}-schedule`,
    ...overrides,
  };
}

function betweenPlay(
  gameId: string,
  eventIndex: number,
  overrides: Partial<BetweenPlayEvent>,
): BetweenPlayEvent {
  return {
    eventId: `${gameId}-bp-${eventIndex}`,
    gameId,
    eventIndex,
    timestamp: eventIndex,
    type: "runner_advance",
    seasonId: "franchise-a-season-1",
    seasonNumber: 1,
    statsScopeId: "franchise-a-season-1",
    competitionType: "franchise",
    competitionId: "franchise-a",
    franchiseId: "franchise-a",
    scheduleGameId: `${gameId}-schedule`,
    ...overrides,
  };
}

function fieldingEvent(
  gameId: string,
  overrides: Partial<FieldingEvent>,
): FieldingEvent {
  return {
    fieldingEventId: `${gameId}-f-1`,
    gameId,
    atBatEventId: `${gameId}-ab-1`,
    sequence: 1,
    playerId: "home-3b",
    playerName: "Home Third",
    position: "3B",
    teamId: "home",
    playType: "error",
    difficulty: "routine",
    ballInPlay: {
      trajectory: "ground",
      zone: 5,
      velocity: "medium",
      fielderIds: ["home-3b"],
      primaryFielderId: "home-3b",
    },
    success: false,
    runsPreventedOrAllowed: -1,
    ...overrides,
  };
}

function persistedGameState(
  gameId: string,
  overrides: Partial<PersistedGameState> = {},
): PersistedGameState {
  return {
    id: "current",
    gameId,
    savedAt: 1,
    inning: 1,
    halfInning: "BOTTOM",
    outs: 3,
    homeScore: 0,
    awayScore: 0,
    bases: { first: null, second: null, third: null },
    currentBatterIndex: 0,
    atBatCount: 0,
    awayTeamId: "away",
    homeTeamId: "home",
    awayTeamName: "Away",
    homeTeamName: "Home",
    seasonNumber: 1,
    playerStats: {},
    pitcherGameStats: [],
    fameEvents: [],
    lastHRBatterId: null,
    consecutiveHRCount: 0,
    inningStrikeouts: 0,
    maxDeficitAway: 0,
    maxDeficitHome: 0,
    activityLog: [],
    ...overrides,
  };
}

describe("Pass 2B-1 game replay audit harness", () => {
  test("matches a simple hit, walk, strikeout, out, and scoring golden fixture", () => {
    const gameId = "pass2b-simple";
    const events = [
      atBat(gameId, 1, {
        batterId: "away-1",
        batterName: "Away One",
        result: "1B",
        outs: 0,
        outsAfter: 0,
        runnersAfter: {
          first: { runnerId: "away-1", runnerName: "Away One", responsiblePitcherId: "home-p1" },
          second: null,
          third: null,
        },
      }),
      atBat(gameId, 2, {
        batterId: "away-2",
        batterName: "Away Two",
        result: "BB",
        outs: 0,
        outsAfter: 0,
        runners: {
          first: { runnerId: "away-1", runnerName: "Away One", responsiblePitcherId: "home-p1" },
          second: null,
          third: null,
        },
      }),
      atBat(gameId, 3, {
        batterId: "away-3",
        batterName: "Away Three",
        result: "K",
        outs: 0,
        outsAfter: 1,
      }),
      atBat(gameId, 4, {
        batterId: "away-4",
        batterName: "Away Four",
        result: "HR",
        rbiCount: 3,
        runsScored: ["away-1", "away-2", "away-4"],
        outs: 1,
        outsAfter: 1,
        runners: {
          first: { runnerId: "away-2", runnerName: "Away Two", responsiblePitcherId: "home-p1" },
          second: { runnerId: "away-1", runnerName: "Away One", responsiblePitcherId: "home-p1" },
          third: null,
        },
        awayScore: 0,
        awayScoreAfter: 3,
      }),
      atBat(gameId, 5, {
        batterId: "away-5",
        batterName: "Away Five",
        result: "GO",
        outs: 1,
        outsAfter: 2,
      }),
      atBat(gameId, 6, {
        batterId: "away-6",
        batterName: "Away Six",
        result: "FO",
        outs: 2,
        outsAfter: 3,
      }),
    ];

    const report = auditReplayAgainstSnapshot({
      gameId,
      completedGame: completedGame(gameId, {
        finalScore: { away: 3, home: 0 },
        playerStats: {
          "away-1": playerStats("Away One", "away", { pa: 1, ab: 1, h: 1, singles: 1, r: 1 }),
          "away-2": playerStats("Away Two", "away", { pa: 1, bb: 1, r: 1 }),
          "away-3": playerStats("Away Three", "away", { pa: 1, ab: 1, k: 1 }),
          "away-4": playerStats("Away Four", "away", { pa: 1, ab: 1, h: 1, hr: 1, r: 1, rbi: 3 }),
          "away-5": playerStats("Away Five", "away", { pa: 1, ab: 1 }),
          "away-6": playerStats("Away Six", "away", { pa: 1, ab: 1 }),
        },
        pitcherGameStats: [
          pitcherStats("home-p1", "Home Pitcher", "home", {
            isStarter: true,
            battersFaced: 6,
            hitsAllowed: 2,
            runsAllowed: 3,
            earnedRuns: 3,
            walksAllowed: 1,
            strikeoutsThrown: 1,
            homeRunsAllowed: 1,
            outsRecorded: 3,
          }),
        ],
      }),
      atBatEvents: events,
    });

    expect(report.severity).toBe("info");
    expect(report.confidence).toBe("high");
    expect(report.mismatches).toEqual([]);
    expect(report.unsupportedEventTypes).toEqual([]);
    expect(report.matchedCategories).toEqual(
      expect.arrayContaining(["hits", "runs", "rbi", "walks", "strikeouts", "outsRecorded"]),
    );
  });

  test("matches substitutions, pitcher change, inherited runners, runner events, and fielding error fixture", () => {
    const gameId = "pass2b-between";
    const events = [
      atBat(gameId, 1, {
        batterId: "away-1",
        batterName: "Away One",
        result: "BB",
        pitcherId: "home-p1",
        pitcherName: "Home Starter",
        outs: 0,
        outsAfter: 0,
      }),
      atBat(gameId, 2, {
        batterId: "away-2",
        batterName: "Away Two",
        result: "1B",
        pitcherId: "home-p2",
        pitcherName: "Home Reliever",
        outs: 0,
        outsAfter: 0,
        runners: {
          first: { runnerId: "away-1", runnerName: "Away One", responsiblePitcherId: "home-p1" },
          second: null,
          third: null,
        },
      }),
      atBat(gameId, 3, {
        batterId: "away-3",
        batterName: "Away Three",
        result: "E",
        pitcherId: "home-p2",
        pitcherName: "Home Reliever",
        outs: 0,
        outsAfter: 0,
      }),
    ];
    const between = [
      betweenPlay(gameId, 10, {
        type: "pitcher_change",
        pitcherChange: {
          outgoingPitcherId: "home-p1",
          outgoingPitcherName: "Home Starter",
          incomingPitcherId: "home-p2",
          incomingPitcherName: "Home Reliever",
          inheritedRunners: 1,
          outgoingPitchCount: 12,
        },
      }),
      betweenPlay(gameId, 11, {
        type: "substitution",
        substitution: {
          subType: "defensive_replacement",
          outPlayerId: "home-ss",
          inPlayerId: "home-bench",
          inPosition: "SS",
        },
      }),
      betweenPlay(gameId, 12, {
        type: "stolen_base",
        stolenBase: {
          runnerId: "away-2",
          runnerName: "Away Two",
          fromBase: 1,
          toBase: 2,
          isSuccessful: true,
        },
      }),
      betweenPlay(gameId, 13, {
        type: "wild_pitch",
        wildPitchOrPassedBall: {
          wpOrPb: "wild_pitch",
          pitcherId: "home-p2",
          runnersAdvanced: [{ runnerId: "away-2", fromBase: 2, toBase: 3 }],
        },
      }),
      betweenPlay(gameId, 14, {
        type: "passed_ball",
        wildPitchOrPassedBall: {
          wpOrPb: "passed_ball",
          pitcherId: "home-p2",
          catcherId: "home-c",
        },
      }),
      betweenPlay(gameId, 15, {
        type: "pitch_count_update",
        pitchCountUpdate: {
          pitcherId: "home-p2",
          pitchCount: 9,
          timing: "end_of_half_inning",
        },
      }),
    ];
    const fielding = [fieldingEvent(gameId, { playerId: "home-3b", playerName: "Home Third" })];

    const report = auditReplayAgainstSnapshot({
      gameId,
      completedGame: completedGame(gameId, {
        playerStats: {
          "away-1": playerStats("Away One", "away", { pa: 1, bb: 1 }),
          "away-2": playerStats("Away Two", "away", { pa: 1, ab: 1, h: 1, singles: 1, sb: 1 }),
          "away-3": playerStats("Away Three", "away", { pa: 1, ab: 1 }),
          "home-3b": playerStats("Home Third", "home", { fieldingErrors: 1 }),
        },
        pitcherGameStats: [
          pitcherStats("home-p1", "Home Starter", "home", {
            battersFaced: 1,
            walksAllowed: 1,
            pitchCount: 12,
          }),
          pitcherStats("home-p2", "Home Reliever", "home", {
            battersFaced: 2,
            hitsAllowed: 1,
            wildPitches: 1,
            pitchCount: 9,
            inheritedRunners: 1,
          }),
        ],
      }),
      atBatEvents: events,
      betweenPlayEvents: between,
      fieldingEvents: fielding,
    });

    expect(report.severity).toBe("info");
    expect(report.mismatches).toEqual([]);
    expect(report.unsupportedEventTypes).toEqual([]);
    expect(report.matchedCategories).toEqual(
      expect.arrayContaining([
        "pitcherChanges",
        "lineupChanges",
        "stolenBases",
        "wildPitches",
        "passedBallsObserved",
        "pitchCount",
        "fieldingEvents",
      ]),
    );
  });

  test("reports unsupported event types instead of failing silently", () => {
    const gameId = "pass2b-unsupported";
    const report = auditReplayAgainstSnapshot({
      gameId,
      atBatEvents: [],
      betweenPlayEvents: [
        betweenPlay(gameId, 1, {
          type: "balk",
        }),
      ],
    });

    expect(report.severity).toBe("warning");
    expect(report.confidence).toBe("medium");
    expect(report.unsupportedEventTypes).toEqual([
      expect.objectContaining({
        stream: "between_play",
        eventId: `${gameId}-bp-1`,
        type: "balk",
      }),
    ]);
  });

  test("reports declared but limited between-play rows instead of silently matching them", () => {
    const gameId = "pass2b-limited-between";
    const report = auditReplayAgainstSnapshot({
      gameId,
      completedGame: completedGame(gameId),
      atBatEvents: [],
      betweenPlayEvents: [
        betweenPlay(gameId, 1, {
          type: "pickoff",
          runnerAction: {
            runnerId: "away-1",
            runnerName: "Away One",
            fromBase: 1,
            toBase: 1,
            outcome: "out",
            reason: "pickoff",
          },
        }),
        betweenPlay(gameId, 2, {
          type: "defensive_indifference",
          runnerAction: {
            runnerId: "away-2",
            runnerName: "Away Two",
            fromBase: 1,
            toBase: 2,
            outcome: "safe",
            reason: "advance",
          },
        }),
        betweenPlay(gameId, 3, {
          type: "runner_advance",
          runnerAction: {
            runnerId: "away-3",
            runnerName: "Away Three",
            fromBase: 2,
            toBase: 3,
            outcome: "safe",
            reason: "advance",
          },
        }),
        betweenPlay(gameId, 4, {
          type: "manager_moment",
          managerMoment: {
            leverageIndex: 2.1,
            decisionType: "let_batter_hit",
          },
        }),
        betweenPlay(gameId, 5, {
          type: "manager_recommendation",
          managerRecommendationWatch: {
            recommendationId: "rec-1",
            type: "consider_pitching_change",
            managerId: "manager-1",
            teamId: "home",
            opponentTeamId: "away",
            confidence: "medium",
            surface: "feed_passive",
            trackedPlayerIds: ["home-p1"],
            primaryAction: "open_pitching_change",
            noChangeAction: "keep_pitcher",
            suppressKey: "fixture-rec",
          },
        }),
      ],
    });

    expect(report.severity).toBe("warning");
    expect(report.confidence).toBe("medium");
    expect(report.unsupportedEventTypes).toEqual([]);
    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ eventId: `${gameId}-bp-1`, severity: "warning" }),
        expect.objectContaining({ eventId: `${gameId}-bp-2`, severity: "info" }),
        expect.objectContaining({ eventId: `${gameId}-bp-3`, severity: "info" }),
        expect.objectContaining({ eventId: `${gameId}-bp-4`, severity: "info" }),
        expect.objectContaining({ eventId: `${gameId}-bp-5`, severity: "info" }),
      ]),
    );
    expect(report.matchedCategories).toEqual(
      expect.arrayContaining([
        "pickoffsObserved",
        "defensiveIndifferenceObserved",
        "runnerAdvancesObserved",
        "managerContextObserved",
      ]),
    );
  });

  test("reports base_save fielding rows as limited instead of fully matched fielding replay", () => {
    const gameId = "pass2b-base-save";
    const report = auditReplayAgainstSnapshot({
      gameId,
      completedGame: completedGame(gameId),
      atBatEvents: [],
      fieldingEvents: [
        fieldingEvent(gameId, {
          fieldingEventId: `${gameId}-f-base-save`,
          playType: "base_save",
          success: true,
          runsPreventedOrAllowed: 0.35,
        }),
      ],
    });

    expect(report.severity).toBe("warning");
    expect(report.unsupportedEventTypes).toEqual([]);
    expect(report.issues).toEqual([
      expect.objectContaining({
        eventId: `${gameId}-f-base-save`,
        severity: "warning",
        message: expect.stringContaining("base_save"),
      }),
    ]);
    expect(report.matchedCategories).toContain("fieldingBaseSavesObserved");
    expect(report.matchedCategories).not.toContain("fieldingEvents");
  });

  test("matches special batting result semantics for FC, DP, sacrifices, and dropped-third-strike outcomes", () => {
    const gameId = "pass2b-special-batting";
    const events = [
      atBat(gameId, 1, {
        batterId: "away-fc",
        batterName: "Away FC",
        result: "FC",
        outs: 0,
        outsAfter: 1,
      }),
      atBat(gameId, 2, {
        batterId: "away-dp",
        batterName: "Away DP",
        result: "DP",
        outs: 1,
        outsAfter: 3,
      }),
      atBat(gameId, 3, {
        batterId: "away-sac",
        batterName: "Away Sac",
        result: "SAC",
        outs: 0,
        outsAfter: 1,
      }),
      atBat(gameId, 4, {
        batterId: "away-sf",
        batterName: "Away SF",
        result: "SF",
        rbiCount: 1,
        runsScored: ["away-runner"],
        outs: 0,
        outsAfter: 1,
        runners: {
          first: null,
          second: null,
          third: {
            runnerId: "away-runner",
            runnerName: "Away Runner",
            responsiblePitcherId: "home-p1",
          },
        },
      }),
      atBat(gameId, 5, {
        batterId: "away-d3k",
        batterName: "Away D3K",
        result: "D3K",
        outs: 1,
        outsAfter: 2,
      }),
      atBat(gameId, 6, {
        batterId: "away-wpk",
        batterName: "Away WP K",
        result: "WP_K",
        outs: 2,
        outsAfter: 2,
      }),
      atBat(gameId, 7, {
        batterId: "away-pbk",
        batterName: "Away PB K",
        result: "PB_K",
        outs: 2,
        outsAfter: 2,
      }),
    ];

    const report = auditReplayAgainstSnapshot({
      gameId,
      completedGame: completedGame(gameId, {
        finalScore: { away: 1, home: 0 },
        playerStats: {
          "away-fc": playerStats("Away FC", "away", { pa: 1, ab: 1 }),
          "away-dp": playerStats("Away DP", "away", { pa: 1, ab: 1, gidp: 1 }),
          "away-sac": playerStats("Away Sac", "away", { pa: 1, sh: 1 }),
          "away-sf": playerStats("Away SF", "away", { pa: 1, sf: 1, rbi: 1 }),
          "away-runner": playerStats("Away Runner", "away", { r: 1 }),
          "away-d3k": playerStats("Away D3K", "away", { pa: 1, ab: 1, k: 1, d3kOutcomes: 1 }),
          "away-wpk": playerStats("Away WP K", "away", { pa: 1, ab: 1, k: 1, d3kOutcomes: 1 }),
          "away-pbk": playerStats("Away PB K", "away", { pa: 1, ab: 1, k: 1, d3kOutcomes: 1 }),
        },
        pitcherGameStats: [
          pitcherStats("home-p1", "Home Pitcher", "home", {
            battersFaced: 7,
            outsRecorded: 6,
            strikeoutsThrown: 3,
            runsAllowed: 1,
            earnedRuns: 1,
          }),
        ],
      }),
      atBatEvents: events,
    });

    expect(report.severity).toBe("info");
    expect(report.mismatches).toEqual([]);
    expect(report.unsupportedEventTypes).toEqual([]);
    expect(report.matchedCategories).toEqual(
      expect.arrayContaining([
        "fieldersChoicesObserved",
        "doublePlays",
        "sacrificeBunts",
        "sacrificeFlies",
        "droppedThirdStrikeOutcomes",
      ]),
    );
  });

  test("reports run-attribution uncertainty for legacy numeric runs, scoring runner advances, and error-run plays", () => {
    const gameId = "pass2b-run-attribution";
    const events = [
      atBat(gameId, 1, {
        batterId: "away-legacy",
        batterName: "Away Legacy",
        result: "2B",
        rbiCount: 2,
        runsScored: 2,
        outs: 0,
        outsAfter: 0,
      }),
      atBat(gameId, 2, {
        batterId: "away-error",
        batterName: "Away Error",
        result: "E",
        runsScored: ["away-runner"],
        outs: 0,
        outsAfter: 0,
        runners: {
          first: null,
          second: null,
          third: {
            runnerId: "away-runner",
            runnerName: "Away Runner",
            responsiblePitcherId: "home-p1",
          },
        },
      }),
    ];
    const between = [
      betweenPlay(gameId, 3, {
        type: "runner_advance",
        runnerAction: {
          runnerId: "away-runner-2",
          runnerName: "Away Runner Two",
          fromBase: 3,
          toBase: 4,
          outcome: "safe",
          reason: "advance",
        },
      }),
    ];

    const report = auditReplayAgainstSnapshot({
      gameId,
      completedGame: completedGame(gameId, {
        finalScore: { away: 3, home: 0 },
        playerStats: {
          "away-legacy": playerStats("Away Legacy", "away", { pa: 1, ab: 1, h: 1, doubles: 1, rbi: 2 }),
          "away-error": playerStats("Away Error", "away", { pa: 1, ab: 1 }),
          "away-runner": playerStats("Away Runner", "away", { r: 1 }),
        },
        pitcherGameStats: [
          pitcherStats("home-p1", "Home Pitcher", "home", {
            battersFaced: 2,
            hitsAllowed: 1,
            runsAllowed: 3,
            earnedRuns: 2,
          }),
        ],
      }),
      atBatEvents: events,
      betweenPlayEvents: between,
    });

    expect(report.severity).toBe("warning");
    expect(report.mismatches).toEqual([]);
    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          eventId: `${gameId}-ab-1`,
          message: expect.stringContaining("Legacy numeric runsScored"),
        }),
        expect.objectContaining({
          eventId: `${gameId}-ab-2`,
          message: expect.stringContaining("earned-run reconstruction"),
        }),
        expect.objectContaining({
          eventId: `${gameId}-bp-3`,
          message: expect.stringContaining("Generic runner advance"),
        }),
      ]),
    );
  });

  test("distinguishes caught stealing from pickoff outs in runner decision replay", () => {
    const gameId = "pass2b-runner-decisions";
    const report = auditReplayAgainstSnapshot({
      gameId,
      completedGame: completedGame(gameId, {
        playerStats: {
          "away-cs": playerStats("Away CS", "away", { cs: 1 }),
        },
      }),
      atBatEvents: [],
      betweenPlayEvents: [
        betweenPlay(gameId, 1, {
          type: "caught_stealing",
          runnerAction: {
            runnerId: "away-cs",
            runnerName: "Away CS",
            fromBase: 1,
            toBase: 2,
            outcome: "out",
            reason: "caught_stealing",
          },
        }),
        betweenPlay(gameId, 2, {
          type: "pickoff",
          runnerAction: {
            runnerId: "away-pickoff",
            runnerName: "Away Pickoff",
            fromBase: 1,
            toBase: 1,
            outcome: "out",
            reason: "pickoff",
          },
        }),
      ],
    });

    expect(report.severity).toBe("warning");
    expect(report.mismatches).toEqual([]);
    expect(report.derivedStats.playerStats["away-cs"].cs).toBe(1);
    expect(report.derivedStats.playerStats["away-pickoff"]).toBeUndefined();
    expect(report.matchedCategories).toEqual(
      expect.arrayContaining(["caughtStealing", "pickoffsObserved"]),
    );
    expect(report.issues).toEqual([
      expect.objectContaining({ eventId: `${gameId}-bp-2`, severity: "warning" }),
    ]);
  });

  test("matches wild-pitch and passed-ball strikeout edge rows when represented by at-bat plus between-play events", () => {
    const gameId = "pass2b-wp-pb-k";
    const report = auditReplayAgainstSnapshot({
      gameId,
      completedGame: completedGame(gameId, {
        playerStats: {
          "away-wpk": playerStats("Away WP K", "away", { pa: 1, ab: 1, k: 1, d3kOutcomes: 1 }),
          "away-pbk": playerStats("Away PB K", "away", { pa: 1, ab: 1, k: 1, d3kOutcomes: 1 }),
        },
        pitcherGameStats: [
          pitcherStats("home-p1", "Home Pitcher", "home", {
            battersFaced: 2,
            strikeoutsThrown: 2,
            wildPitches: 1,
          }),
        ],
      }),
      atBatEvents: [
        atBat(gameId, 1, {
          batterId: "away-wpk",
          batterName: "Away WP K",
          result: "WP_K",
          outs: 0,
          outsAfter: 0,
        }),
        atBat(gameId, 2, {
          batterId: "away-pbk",
          batterName: "Away PB K",
          result: "PB_K",
          outs: 0,
          outsAfter: 0,
        }),
      ],
      betweenPlayEvents: [
        betweenPlay(gameId, 3, {
          type: "wild_pitch",
          wildPitchOrPassedBall: {
            wpOrPb: "wild_pitch",
            pitcherId: "home-p1",
          },
        }),
        betweenPlay(gameId, 4, {
          type: "passed_ball",
          wildPitchOrPassedBall: {
            wpOrPb: "passed_ball",
            pitcherId: "home-p1",
            catcherId: "home-c",
          },
        }),
      ],
    });

    expect(report.severity).toBe("info");
    expect(report.mismatches).toEqual([]);
    expect(report.matchedCategories).toEqual(
      expect.arrayContaining([
        "droppedThirdStrikeOutcomes",
        "strikeouts",
        "wildPitches",
        "passedBallsObserved",
      ]),
    );
  });

  test("matches fielding assists and robbery totals while reporting web-gem and base-save limits", () => {
    const gameId = "pass2b-fielding-edge";
    const report = auditReplayAgainstSnapshot({
      gameId,
      completedGame: completedGame(gameId, {
        playerStats: {
          "home-2b": playerStats("Home Second", "home", { assists: 1 }),
          "home-rf": playerStats("Home Right", "home", { assists: 1 }),
          "home-cf": playerStats("Home Center", "home", { putouts: 1, robberies: 1 }),
          "home-lf": playerStats("Home Left", "home", { putouts: 1 }),
        },
      }),
      atBatEvents: [],
      fieldingEvents: [
        fieldingEvent(gameId, {
          fieldingEventId: `${gameId}-f-dp`,
          playerId: "home-2b",
          playerName: "Home Second",
          position: "2B",
          playType: "double_play_pivot",
          success: true,
        }),
        fieldingEvent(gameId, {
          fieldingEventId: `${gameId}-f-ofa`,
          playerId: "home-rf",
          playerName: "Home Right",
          position: "RF",
          playType: "outfield_assist",
          success: true,
        }),
        fieldingEvent(gameId, {
          fieldingEventId: `${gameId}-f-robbery`,
          playerId: "home-cf",
          playerName: "Home Center",
          position: "CF",
          playType: "putout",
          specialPlayType: "Robbed HR",
          success: true,
        }),
        fieldingEvent(gameId, {
          fieldingEventId: `${gameId}-f-web-gem`,
          playerId: "home-lf",
          playerName: "Home Left",
          position: "LF",
          playType: "putout",
          specialPlayType: "Diving",
          success: true,
        }),
        fieldingEvent(gameId, {
          fieldingEventId: `${gameId}-f-base-save`,
          playerId: "home-1b",
          playerName: "Home First",
          position: "1B",
          playType: "base_save",
          success: true,
        }),
      ],
    });

    expect(report.severity).toBe("warning");
    expect(report.mismatches).toEqual([]);
    expect(report.unsupportedEventTypes).toEqual([]);
    expect(report.matchedCategories).toEqual(
      expect.arrayContaining([
        "fieldingEvents",
        "fieldingRobberies",
        "fieldingWebGemsObserved",
        "fieldingBaseSavesObserved",
      ]),
    );
    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          eventId: `${gameId}-f-web-gem`,
          message: expect.stringContaining("web-gem context"),
        }),
        expect.objectContaining({
          eventId: `${gameId}-f-base-save`,
          message: expect.stringContaining("base_save"),
        }),
      ]),
    );
  });

  test("reports clutch and WPA context as observed but not replay-derived", () => {
    const gameId = "pass2b-clutch-wpa";
    const report = auditReplayAgainstSnapshot({
      gameId,
      completedGame: completedGame(gameId, {
        finalScore: { away: 1, home: 0 },
        playerStats: {
          "away-clutch": playerStats("Away Clutch", "away", {
            pa: 1,
            ab: 1,
            h: 1,
            hr: 1,
            r: 1,
            rbi: 1,
          }),
        },
        pitcherGameStats: [
          pitcherStats("home-p1", "Home Pitcher", "home", {
            battersFaced: 1,
            hitsAllowed: 1,
            homeRunsAllowed: 1,
            runsAllowed: 1,
            earnedRuns: 1,
          }),
        ],
      }),
      atBatEvents: [
        atBat(gameId, 1, {
          batterId: "away-clutch",
          batterName: "Away Clutch",
          result: "HR",
          rbiCount: 1,
          runsScored: ["away-clutch"],
          outs: 2,
          outsAfter: 2,
          leverageIndex: 2.7,
          winProbabilityBefore: 0.35,
          winProbabilityAfter: 0.62,
          wpa: 0.27,
          isClutch: true,
        }),
      ],
    });

    expect(report.mismatches).toEqual([]);
    expect(report.matchedCategories).toContain("clutchWpaContextObserved");
    expect(report.issues).toEqual([
      expect.objectContaining({
        eventId: `${gameId}-ab-1`,
        message: expect.stringContaining("does not recompute WPA or clutch"),
      }),
    ]);
  });

  test("replays active corrected at-bat rows and reports skipped undone rows", () => {
    const gameId = "pass2b-correction-audit";
    const originalUndone = atBat(gameId, 1, {
      eventId: `${gameId}-ab-original`,
      batterId: "away-corrected",
      batterName: "Away Corrected",
      result: "1B",
      outs: 0,
      outsAfter: 0,
      undoneAt: 2,
      version: 1,
    });
    const activeCorrected = atBat(gameId, 2, {
      eventId: `${gameId}-ab-corrected`,
      batterId: "away-corrected",
      batterName: "Away Corrected",
      result: "HR",
      rbiCount: 1,
      runsScored: ["away-corrected"],
      outs: 0,
      outsAfter: 0,
      version: 2,
      editHistory: [
        {
          field: "result",
          oldValue: "1B",
          newValue: "HR",
          timestamp: 3,
        },
      ],
    });

    const report = auditReplayAgainstSnapshot({
      gameId,
      completedGame: completedGame(gameId, {
        finalScore: { away: 1, home: 0 },
        playerStats: {
          "away-corrected": playerStats("Away Corrected", "away", {
            pa: 1,
            ab: 1,
            h: 1,
            hr: 1,
            r: 1,
            rbi: 1,
          }),
        },
        pitcherGameStats: [
          pitcherStats("home-p1", "Home Pitcher", "home", {
            battersFaced: 1,
            hitsAllowed: 1,
            homeRunsAllowed: 1,
            runsAllowed: 1,
            earnedRuns: 1,
          }),
        ],
      }),
      atBatEvents: [originalUndone, activeCorrected],
    });

    expect(report.mismatches).toEqual([]);
    expect(report.derivedStats.playerStats["away-corrected"]).toMatchObject({
      pa: 1,
      h: 1,
      hr: 1,
      r: 1,
      rbi: 1,
    });
    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          eventId: `${gameId}-ab-original`,
          message: expect.stringContaining("Undone at-bat row was skipped"),
        }),
        expect.objectContaining({
          eventId: `${gameId}-ab-corrected`,
          message: expect.stringContaining("Corrected at-bat row was replayed"),
        }),
      ]),
    );
  });

  test("reports missing canonical identity fields for franchise replay rows", () => {
    const gameId = "pass2b-missing-identity";
    const event = atBat(gameId, 1, {
      scheduleGameId: undefined,
      franchiseId: undefined,
    });
    const report = auditReplayAgainstSnapshot({
      gameId,
      completedGame: completedGame(gameId),
      atBatEvents: [event],
    });

    expect(report.missingIdentityFields).toEqual([
      expect.objectContaining({
        stream: "at_bat",
        eventId: `${gameId}-ab-1`,
        fields: expect.arrayContaining(["franchiseId", "scheduleGameId"]),
      }),
    ]);
    expect(report.severity).toBe("error");
  });

  test("flags damaged franchise completed-game archives missing canonical identity", () => {
    const gameId = "pass2b-damaged-franchise-archive";
    const damagedArchive = {
      ...completedGame(gameId),
      franchiseId: undefined,
      seasonId: undefined,
      statsScopeId: undefined,
      scheduleGameId: undefined,
    } as CompletedGameRecord;

    const report = auditReplayAgainstSnapshot({
      gameId,
      completedGame: damagedArchive,
      atBatEvents: [],
    });

    expect(report.missingIdentityFields).toEqual([
      expect.objectContaining({
        stream: "completed_game",
        eventId: gameId,
        fields: expect.arrayContaining([
          "franchiseId",
          "seasonId",
          "statsScopeId",
          "scheduleGameId",
        ]),
        severity: "error",
      }),
    ]);
    expect(report.severity).toBe("error");
    expect(report.confidence).toBe("low");
  });

  test("does not require franchise identity on legacy non-franchise archives", () => {
    const gameId = "pass2b-legacy-exhibition-archive";
    const legacyArchive = {
      ...completedGame(gameId, {
        competitionType: "exhibition",
        competitionId: "exhibition",
      }),
      franchiseId: undefined,
      seasonId: undefined,
      statsScopeId: undefined,
      scheduleGameId: undefined,
    } as CompletedGameRecord;

    const report = auditReplayAgainstSnapshot({
      gameId,
      completedGame: legacyArchive,
      atBatEvents: [],
    });

    expect(report.missingIdentityFields).toEqual([]);
    expect(report.severity).toBe("info");
  });

  test("can run by completed game id without mutating completed-game archive", async () => {
    const gameId = "pass2b-by-id";
    const gameState = persistedGameState(gameId, {
      awayScore: 1,
      seasonId: "franchise-a-season-1",
      statsScopeId: "franchise-a-season-1",
      competitionType: "franchise",
      competitionId: "franchise-a",
      franchiseId: "franchise-a",
      scheduleGameId: `${gameId}-schedule`,
      playerStats: {
        "away-1": playerStats("Away One", "away", {
          pa: 1,
          ab: 1,
          h: 1,
          hr: 1,
          r: 1,
          rbi: 1,
        }),
        "home-cf": playerStats("Home Center", "home", { putouts: 1 }),
      },
      pitcherGameStats: [
        pitcherStats("home-p1", "Home Pitcher", "home", {
          battersFaced: 1,
          hitsAllowed: 1,
          runsAllowed: 1,
          earnedRuns: 1,
          homeRunsAllowed: 1,
        }),
      ],
    });
    await logAtBatEvent(
      atBat(gameId, 1, {
        batterId: "away-1",
        batterName: "Away One",
        result: "HR",
        rbiCount: 1,
        runsScored: ["away-1"],
        outsAfter: 0,
      }),
    );
    await logBetweenPlayEvent(
      betweenPlay(gameId, 2, {
        type: "manager_moment",
        managerMoment: {
          leverageIndex: 2,
          decisionType: "let_batter_hit",
        },
      }),
    );
    await logFieldingEvent(
      fieldingEvent(gameId, {
        fieldingEventId: `${gameId}-f-1`,
        playType: "putout",
        playerId: "home-cf",
        playerName: "Home Center",
        teamId: "home",
      }),
    );
    await archiveCompletedGame(
      gameState,
      { away: 1, home: 0 },
      [{ away: 1, home: 0 }],
      "franchise-a-season-1",
      {
        statsScopeId: "franchise-a-season-1",
        competitionType: "franchise",
        competitionId: "franchise-a",
        franchiseId: "franchise-a",
        scheduleGameId: `${gameId}-schedule`,
      },
    );

    const before = await getCompletedGameById(gameId);
    const report = await auditCompletedGameReplayById(gameId);
    const after = await getCompletedGameById(gameId);

    expect(report.severity).toBe("info");
    expect(report.mismatches).toEqual([]);
    expect(after).toEqual(before);
  });
});
