import { describe, expect, test } from "vitest";

import { calculateWPA } from "../../engines/wpaCalculator";
import { WPA_MODEL_VERSION } from "../../engines/wpaV2";
import type { AtBatEvent, BetweenPlayEvent, FieldingEvent } from "../eventLog";
import {
  aggregateKblWpaCredits,
  deriveKblWpaCredits,
} from "../kblWpaAttribution";
import {
  deriveManagerDecisionRecords,
  deriveManagerRecommendationWatchRecords,
  getHalfInningManagerContext,
  getManagerForTeam,
} from "../managerWpaDerivation";

const MANAGERS = {
  away: "away-manager",
  home: "home-manager",
};

function createAtBat(overrides: Partial<AtBatEvent> = {}): AtBatEvent {
  const halfInning = overrides.halfInning ?? "TOP";
  const isTop = halfInning === "TOP";
  const batterTeamId = isTop ? "away" : "home";
  const pitcherTeamId = isTop ? "home" : "away";
  const batterId = isTop ? "away-batter" : "home-batter";
  const pitcherId = isTop ? "home-pitcher" : "away-pitcher";

  return {
    eventId: `game-1_${overrides.eventIndex ?? 1}`,
    gameId: "game-1",
    eventIndex: overrides.eventIndex ?? 1,
    timestamp: overrides.timestamp ?? 1,
    batterId,
    batterName: isTop ? "Away Batter" : "Home Batter",
    batterTeamId,
    pitcherId,
    pitcherName: isTop ? "Home Pitcher" : "Away Pitcher",
    pitcherTeamId,
    result: "GO",
    rbiCount: 0,
    runsScored: 0,
    inning: 4,
    halfInning,
    outs: 1,
    runners: { first: null, second: null, third: null },
    awayScore: 2,
    homeScore: 2,
    outsAfter: 2,
    runnersAfter: { first: null, second: null, third: null },
    awayScoreAfter: 2,
    homeScoreAfter: 2,
    leverageIndex: 1.2,
    winProbabilityBefore: 0.5,
    winProbabilityAfter: 0.5,
    wpa: 0,
    ballInPlay: null,
    fameEvents: [],
    isLeadoff: false,
    isClutch: false,
    isWalkOff: false,
    ...overrides,
  };
}

function createBetweenPlay(
  overrides: Partial<BetweenPlayEvent> = {},
): BetweenPlayEvent {
  const halfInning = overrides.gameState?.halfInning ?? "TOP";
  return {
    eventId: `game-1_bp_${overrides.eventIndex ?? 1}`,
    gameId: "game-1",
    eventIndex: overrides.eventIndex ?? 1,
    timestamp: overrides.timestamp ?? 1,
    type: "pitcher_change",
    gameState: {
      inning: 5,
      halfInning,
      outs: 1,
      score: { away: 2, home: 2 },
      runnersOn: {},
    },
    pitcherChange: {
      outgoingPitcherId: halfInning === "TOP" ? "home-pitcher" : "away-pitcher",
      incomingPitcherId: halfInning === "TOP" ? "home-reliever" : "away-reliever",
      inheritedRunners: 0,
    },
    ...overrides,
  };
}

function createPromptedKeepCurrent(
  overrides: Partial<BetweenPlayEvent> & {
    decisionType?: "leave_pitcher_in" | "let_batter_hit";
    trackedPlayerId?: string;
    teamId?: string;
    managerId?: string;
    opponentTeamId?: string;
    provenanceKey?: string;
  } = {},
): BetweenPlayEvent {
  const decisionType = overrides.decisionType ?? "leave_pitcher_in";
  const trackedPlayerId =
    overrides.trackedPlayerId ??
    (decisionType === "leave_pitcher_in" ? "home-pitcher" : "away-batter");
  const teamId = overrides.teamId ?? (decisionType === "leave_pitcher_in" ? "home" : "away");
  const managerId =
    overrides.managerId ?? (teamId === "home" ? MANAGERS.home : MANAGERS.away);
  const opponentTeamId =
    overrides.opponentTeamId ?? (teamId === "home" ? "away" : "home");
  const action = decisionType === "leave_pitcher_in" ? "keep_pitcher" : "let_batter_hit";

  return createBetweenPlay({
    ...overrides,
    type: "manager_moment",
    pitcherChange: undefined,
    substitution: undefined,
    managerMoment: {
      leverageIndex: 2.1,
      decisionType,
      context: overrides.provenanceKey ?? `${decisionType}-prompt`,
    },
    promptedManagerDecision: {
      decisionType,
      action,
      source: "recommendation",
      decisionSource: "situational_prompt",
      confidence: "high",
      managerId,
      teamId,
      opponentTeamId,
      trackedPlayerIds: [trackedPlayerId],
      involvedPlayerIds: [trackedPlayerId],
      playerId: trackedPlayerId,
      leverageIndex: 2.1,
      recommendationId: `rec-${overrides.provenanceKey ?? decisionType}`,
      provenanceKey: overrides.provenanceKey ?? `${decisionType}:key`,
      resolution: {
        status: "pending",
        expectedEndpoint: "next_pa",
      },
    },
  });
}

function createRecommendationWatch(
  overrides: Partial<BetweenPlayEvent> & {
    recommendationType?:
      | "consider_pitching_change"
      | "consider_pinch_hitter"
      | "consider_defensive_replacement";
    trackedPlayerIds?: string[];
    teamId?: string;
    managerId?: string;
    opponentTeamId?: string;
    suppressKey?: string;
  } = {},
): BetweenPlayEvent {
  const recommendationType =
    overrides.recommendationType ?? "consider_pitching_change";
  const trackedPlayerIds =
    overrides.trackedPlayerIds ??
    (recommendationType === "consider_pitching_change"
      ? ["home-pitcher"]
      : recommendationType === "consider_pinch_hitter"
        ? ["away-batter", "away-bench-bat"]
        : ["home-defender", "home-glove"]);
  const teamId =
    overrides.teamId ??
    (recommendationType === "consider_pinch_hitter" ? "away" : "home");
  const managerId =
    overrides.managerId ?? (teamId === "home" ? MANAGERS.home : MANAGERS.away);
  const opponentTeamId =
    overrides.opponentTeamId ?? (teamId === "home" ? "away" : "home");
  const suppressKey =
    overrides.suppressKey ??
    `${recommendationType}:${trackedPlayerIds[0]}:5:top`;

  return createBetweenPlay({
    ...overrides,
    type: "manager_recommendation",
    pitcherChange: undefined,
    substitution: undefined,
    managerRecommendationWatch: {
      recommendationId: `rec-${suppressKey}`,
      type: recommendationType,
      managerId,
      teamId,
      opponentTeamId,
      confidence: "high",
      surface: "recommendation_card",
      trackedPlayerIds,
      primaryAction:
        recommendationType === "consider_pitching_change"
          ? "open_pitching_change"
          : recommendationType === "consider_pinch_hitter"
            ? "open_pinch_hit"
            : "open_defensive_sub",
      noChangeAction:
        recommendationType === "consider_pitching_change"
          ? "keep_pitcher"
          : recommendationType === "consider_pinch_hitter"
            ? "let_batter_hit"
            : "decline_defensive_sub",
      suppressKey,
      leverageIndex: 2.1,
      title: "Test recommendation",
      rationale: "Test rationale",
    },
  });
}

function createFieldingEvent(
  overrides: Partial<FieldingEvent> = {},
): FieldingEvent {
  return {
    fieldingEventId: "game-1_fld_1",
    gameId: "game-1",
    atBatEventId: "game-1_2",
    sequence: 1,
    playerId: "home-def-sub",
    playerName: "Home Defender",
    position: "CF",
    teamId: "home",
    playType: "putout",
    difficulty: "routine",
    ballInPlay: {
      trajectory: "fly",
      zone: 8,
      velocity: "medium",
      fielderIds: ["home-def-sub"],
      primaryFielderId: "home-def-sub",
    },
    success: true,
    runsPreventedOrAllowed: 0,
    ...overrides,
  };
}

function derive(
  atBatEvents: AtBatEvent[] = [],
  betweenPlayEvents: BetweenPlayEvent[] = [],
  fieldingEvents: FieldingEvent[] = [],
  options: {
    gameEnded?: boolean;
    totalInnings?: number;
    useGhostRunner?: boolean;
    extraInningRunner?: boolean;
    extraInningRunnerDelay?: 1 | 2;
  } = {},
) {
  return deriveManagerDecisionRecords({
    gameId: "game-1",
    atBatEvents,
    betweenPlayEvents,
    fieldingEvents,
    awayTeamId: "away",
    homeTeamId: "home",
    awayManagerId: MANAGERS.away,
    homeManagerId: MANAGERS.home,
    ...options,
  });
}

function requireIbbComponents(decision: ReturnType<typeof derive>[number]) {
  const components = decision.explanationMetadata?.intentionalWalk?.wpaComponents;
  expect(components).toBeDefined();
  return components!;
}

function expectIbbOfficialNetUnchanged(
  decision: ReturnType<typeof derive>[number],
) {
  const components = requireIbbComponents(decision);
  expect(components.netRawWpa).toBeCloseTo(decision.rawWindowWpa ?? 0, 4);
  expect(components.beforeIbbTeamWinProbability).toBe(
    decision.teamWinProbabilityBefore,
  );
  expect(components.finalTeamWinProbability).toBe(
    decision.teamWinProbabilityAfter,
  );
  expect(decision.managerWpa).toBeCloseTo(decision.rawWindowWpa ?? 0, 4);
  return components;
}

function requireOutAdvancingSendMetadata(
  decision: ReturnType<typeof derive>[number],
) {
  const metadata = decision.explanationMetadata?.outAdvancingSend;
  expect(metadata).toBeDefined();
  return metadata!;
}

function teamWpaDeltaForEvent(event: AtBatEvent, teamId: "away" | "home") {
  const wpa = calculateWPA(
    {
      inning: event.inning,
      isTop: event.halfInning === "TOP",
      outs: event.outs,
      bases: {
        first: Boolean(event.runners.first),
        second: Boolean(event.runners.second),
        third: Boolean(event.runners.third),
      },
      homeScore: event.homeScore,
      awayScore: event.awayScore,
      totalInnings: event.totalInnings,
    },
    {
      outs: event.outsAfter,
      bases: {
        first: Boolean(event.runnersAfter.first),
        second: Boolean(event.runnersAfter.second),
        third: Boolean(event.runnersAfter.third),
      },
      homeScore: event.homeScoreAfter,
      awayScore: event.awayScoreAfter,
    },
  );

  return teamId === "home"
    ? wpa.winProbabilityAfter - wpa.winProbabilityBefore
    : wpa.winProbabilityBefore - wpa.winProbabilityAfter;
}

function deriveWatches(
  atBatEvents: AtBatEvent[] = [],
  betweenPlayEvents: BetweenPlayEvent[] = [],
  fieldingEvents: FieldingEvent[] = [],
) {
  return deriveManagerRecommendationWatchRecords({
    gameId: "game-1",
    atBatEvents,
    betweenPlayEvents,
    fieldingEvents,
    awayTeamId: "away",
    homeTeamId: "home",
    awayManagerId: MANAGERS.away,
    homeManagerId: MANAGERS.home,
  });
}

describe("manager WPA derivation", () => {
  test("falls back to canonical default manager ID when no assignment is present", () => {
    expect(getManagerForTeam("sirloins")).toBe("sirloins-manager");
    expect(
      getManagerForTeam("sirloins", {
        managerAssignments: [
          {
            managerId: "inactive-manager",
            teamId: "sirloins",
            mode: "elimination",
            instanceId: "elim-1",
            endDate: "2026-05-12",
          },
        ],
        mode: "elimination",
        instanceId: "elim-1",
      }),
    ).toBe("sirloins-manager");
  });

  test("resolves offensive and defensive managers symmetrically by half inning", () => {
    const top = getHalfInningManagerContext("TOP", {
      awayTeamId: "away",
      homeTeamId: "home",
      awayManagerId: MANAGERS.away,
      homeManagerId: MANAGERS.home,
    });
    const bottom = getHalfInningManagerContext("BOTTOM", {
      awayTeamId: "away",
      homeTeamId: "home",
      awayManagerId: MANAGERS.away,
      homeManagerId: MANAGERS.home,
    });

    expect(top).toMatchObject({
      offensiveTeamId: "away",
      defensiveTeamId: "home",
      offensiveManagerId: MANAGERS.away,
      defensiveManagerId: MANAGERS.home,
    });
    expect(bottom).toMatchObject({
      offensiveTeamId: "home",
      defensiveTeamId: "away",
      offensiveManagerId: MANAGERS.home,
      defensiveManagerId: MANAGERS.away,
    });
  });

  test("attributes intentional walks to the defensive manager for home and away teams", () => {
    const topIbb = createAtBat({
      eventId: "game-1_1",
      eventIndex: 1,
      result: "IBB",
      runnersAfter: {
        first: {
          runnerId: "away-batter",
          runnerName: "Away Batter",
          responsiblePitcherId: "home-pitcher",
        },
        second: null,
        third: null,
      },
      outsAfter: 1,
    });
    const bottomIbb = createAtBat({
      eventId: "game-1_2",
      eventIndex: 2,
      halfInning: "BOTTOM",
      result: "IBB",
      runnersAfter: {
        first: {
          runnerId: "home-batter",
          runnerName: "Home Batter",
          responsiblePitcherId: "away-pitcher",
        },
        second: null,
        third: null,
      },
      outsAfter: 1,
    });

    const decisions = derive([topIbb, bottomIbb]);

    expect(decisions.find((decision) => decision.decisionEventId === "game-1_1")).toMatchObject({
      decisionType: "intentional_walk",
      managerId: MANAGERS.home,
      teamId: "home",
      opponentTeamId: "away",
    });
    expect(decisions.find((decision) => decision.decisionEventId === "game-1_2")).toMatchObject({
      decisionType: "intentional_walk",
      managerId: MANAGERS.away,
      teamId: "away",
      opponentTeamId: "home",
    });
  });

  test("attributes pitcher changes to the fielding manager and pinch hitters to the batting manager", () => {
    const topPitchingChange = createBetweenPlay({
      eventId: "game-1_bp_1",
      eventIndex: 1,
      gameState: {
        inning: 5,
        halfInning: "TOP",
        outs: 1,
        score: { away: 2, home: 2 },
        runnersOn: {},
      },
    });
    const bottomPitchingChange = createBetweenPlay({
      eventId: "game-1_bp_2",
      eventIndex: 2,
      gameState: {
        inning: 5,
        halfInning: "BOTTOM",
        outs: 1,
        score: { away: 2, home: 2 },
        runnersOn: {},
      },
    });
    const bottomPinchHitter = createBetweenPlay({
      eventId: "game-1_bp_3",
      eventIndex: 3,
      type: "substitution",
      gameState: {
        inning: 6,
        halfInning: "BOTTOM",
        outs: 0,
        score: { away: 3, home: 2 },
        runnersOn: { second: "home-runner" },
      },
      pitcherChange: undefined,
      substitution: {
        subType: "pinch_hit",
        outPlayerId: "home-batter-8",
        inPlayerId: "home-bench-bat",
      },
    });

    const decisions = derive([], [
      topPitchingChange,
      bottomPitchingChange,
      bottomPinchHitter,
    ]);

    expect(decisions.find((decision) => decision.decisionEventId === "game-1_bp_1")).toMatchObject({
      decisionType: "pitching_change",
      managerId: MANAGERS.home,
      teamId: "home",
    });
    expect(decisions.find((decision) => decision.decisionEventId === "game-1_bp_2")).toMatchObject({
      decisionType: "pitching_change",
      managerId: MANAGERS.away,
      teamId: "away",
    });
    expect(decisions.find((decision) => decision.decisionEventId === "game-1_bp_3")).toMatchObject({
      decisionType: "pinch_hitter",
      managerId: MANAGERS.home,
      teamId: "home",
      opponentTeamId: "away",
    });
  });

  test("infers a mislogged defensive replacement as a pinch hitter when the incoming player bats next", () => {
    const misloggedPinchHit = createBetweenPlay({
      eventId: "game-1_bp_4",
      eventIndex: 4,
      type: "substitution",
      gameState: {
        inning: 6,
        halfInning: "BOTTOM",
        outs: 0,
        score: { away: 9, home: 0 },
        runnersOn: {},
      },
      pitcherChange: undefined,
      substitution: {
        subType: "defensive_replacement",
        outPlayerId: "home-shortstop",
        outPlayerName: "Rafael Belliard",
        outPosition: "SS",
        inPlayerId: "home-jeff-blauser",
        inPlayerName: "Jeff Blauser",
        inPosition: "SS",
      },
    });
    const nextPa = createAtBat({
      eventId: "game-1_5",
      eventIndex: 5,
      inning: 6,
      halfInning: "BOTTOM",
      batterId: "home-jeff-blauser",
      batterName: "Jeff Blauser",
      result: "HR",
      runsScored: 1,
      awayScore: 9,
      homeScore: 0,
      awayScoreAfter: 9,
      homeScoreAfter: 1,
    });

    const [decision] = derive([nextPa], [misloggedPinchHit]);

    expect(decision).toMatchObject({
      decisionType: "pinch_hitter",
      managerId: MANAGERS.home,
      teamId: "home",
      confidence: "medium",
      resolved: true,
      resolvedAtEventId: "game-1_5",
      derivation: {
        derivedFromFields: ["substitution.subType", "nextAtBat.batterId"],
      },
    });
  });

  test("resolves IBB at inning end when the walked runner is stranded", () => {
    const ibb = createAtBat({
      eventId: "game-1_1",
      eventIndex: 1,
      inning: 4,
      outs: 2,
      result: "IBB",
      runnersAfter: {
        first: {
          runnerId: "away-batter",
          runnerName: "Away Batter",
          responsiblePitcherId: "home-pitcher",
        },
        second: null,
        third: null,
      },
      outsAfter: 2,
    });
    const nextPa = createAtBat({
      eventId: "game-1_2",
      eventIndex: 2,
      inning: 4,
      batterId: "away-next-batter",
      batterName: "Away Next Batter",
      runners: ibb.runnersAfter,
      result: "GO",
      runnersAfter: { first: null, second: null, third: null },
      outs: 2,
      outsAfter: 3,
    });

    const [decision] = derive([ibb, nextPa]);

    expect(decision).toMatchObject({
      decisionType: "intentional_walk",
      resolved: true,
      resolvedAtEventId: "game-1_2",
      resolutionWindow: {
        status: "resolved",
        expectedEndpoint: "runner_consequence",
        trackedRunnerIds: ["away-batter"],
        maxEventIndex: 2,
      },
      explanationMetadata: {
        intentionalWalk: {
          ibbEventId: "game-1_1",
          walkedRunnerId: "away-batter",
          nextBatterEventId: "game-1_2",
          nextBatterResult: "GO",
          finalConsequenceEventId: "game-1_2",
          finalConsequence: "stranded",
          inningEnded: true,
        },
      },
    });
    expect(decision.linkedEventIds).toEqual(["game-1_1", "game-1_2"]);
    expect(decision.managerWpa).toEqual(expect.any(Number));
    const components = expectIbbOfficialNetUnchanged(decision);
    expect(components.immediateRawWpa).toBeLessThan(0);
    expect(components.consequenceRawWpa).toBeGreaterThan(0);
  });

  test("stores bases-loaded IBB walked-in-run cost even when final net is positive", () => {
    const runnerFirst = {
      runnerId: "away-r1",
      runnerName: "Away Runner First",
      responsiblePitcherId: "home-pitcher",
    };
    const runnerSecond = {
      runnerId: "away-r2",
      runnerName: "Away Runner Second",
      responsiblePitcherId: "home-pitcher",
    };
    const runnerThird = {
      runnerId: "away-r3",
      runnerName: "Away Runner Third",
      responsiblePitcherId: "home-pitcher",
    };
    const walkedRunner = {
      runnerId: "away-ibb-batter",
      runnerName: "Away IBB Batter",
      responsiblePitcherId: "home-pitcher",
    };
    const ibb = createAtBat({
      eventId: "game-1_ibb_loaded",
      eventIndex: 1,
      inning: 7,
      outs: 1,
      result: "IBB",
      batterId: "away-ibb-batter",
      batterName: "Away IBB Batter",
      runners: {
        first: runnerFirst,
        second: runnerSecond,
        third: runnerThird,
      },
      runsScored: ["away-r3"],
      runnersAfter: {
        first: walkedRunner,
        second: runnerFirst,
        third: runnerSecond,
      },
      awayScore: 2,
      homeScore: 5,
      awayScoreAfter: 3,
      homeScoreAfter: 5,
      outsAfter: 1,
      totalInnings: 9,
    });
    const inningEndingDp = createAtBat({
      eventId: "game-1_loaded_dp",
      eventIndex: 2,
      inning: 7,
      outs: 1,
      batterId: "away-next-batter",
      batterName: "Away Next Batter",
      runners: ibb.runnersAfter,
      result: "GIDP",
      runnersAfter: { first: null, second: null, third: null },
      awayScore: 3,
      homeScore: 5,
      awayScoreAfter: 3,
      homeScoreAfter: 5,
      outsAfter: 3,
      totalInnings: 9,
    });

    const [decision] = derive([ibb, inningEndingDp], [], [], {
      totalInnings: 9,
    });

    expect(decision).toMatchObject({
      decisionType: "intentional_walk",
      resolved: true,
      resolvedAtEventId: "game-1_loaded_dp",
      explanationMetadata: {
        intentionalWalk: {
          nextBatterEventId: "game-1_loaded_dp",
          nextBatterResult: "GIDP",
          finalConsequence: "stranded",
        },
      },
    });
    const components = expectIbbOfficialNetUnchanged(decision);
    expect(components.immediateRawWpa).toBeLessThan(0);
    expect(components.consequenceRawWpa).toBeGreaterThan(0);
    expect(components.netRawWpa).toBeGreaterThan(0);
  });

  test("resolves IBB at a walk-off endpoint when another runner scores and the walked runner remains live", () => {
    const winningRunner = {
      runnerId: "home-winning-run",
      runnerName: "Home Winning Run",
      responsiblePitcherId: "away-pitcher",
    };
    const walkedRunner = {
      runnerId: "home-ibb-batter",
      runnerName: "Home IBB Batter",
      responsiblePitcherId: "away-pitcher",
    };
    const ibb = createAtBat({
      eventId: "game-1_1",
      eventIndex: 1,
      inning: 9,
      halfInning: "BOTTOM",
      outs: 1,
      batterId: "home-ibb-batter",
      batterName: "Home IBB Batter",
      result: "IBB",
      runners: { first: null, second: null, third: winningRunner },
      runnersAfter: { first: walkedRunner, second: null, third: winningRunner },
      awayScore: 2,
      homeScore: 2,
      awayScoreAfter: 2,
      homeScoreAfter: 2,
      outsAfter: 1,
      totalInnings: 9,
    });
    const walkOffSingle = createAtBat({
      eventId: "game-1_2",
      eventIndex: 2,
      inning: 9,
      halfInning: "BOTTOM",
      outs: 1,
      batterId: "home-next-batter",
      batterName: "Home Next Batter",
      runners: ibb.runnersAfter,
      result: "1B",
      runsScored: ["home-winning-run"],
      runnersAfter: {
        first: {
          runnerId: "home-next-batter",
          runnerName: "Home Next Batter",
          responsiblePitcherId: "away-pitcher",
        },
        second: walkedRunner,
        third: null,
      },
      awayScore: 2,
      homeScore: 2,
      awayScoreAfter: 2,
      homeScoreAfter: 3,
      outsAfter: 1,
      isWalkOff: true,
      totalInnings: 9,
    });

    const [decision] = derive([ibb, walkOffSingle], [], [], { totalInnings: 9 });

    expect(decision).toMatchObject({
      decisionType: "intentional_walk",
      managerId: MANAGERS.away,
      teamId: "away",
      resolved: true,
      resolvedAtEventId: "game-1_2",
      resolutionWindow: {
        status: "resolved",
        expectedEndpoint: "runner_consequence",
        trackedRunnerIds: ["home-ibb-batter"],
        maxEventIndex: 2,
      },
      explanationMetadata: {
        intentionalWalk: {
          walkedRunnerId: "home-ibb-batter",
          nextBatterEventId: "game-1_2",
          finalConsequenceEventId: "game-1_2",
          finalConsequence: "stranded",
          inningEnded: true,
        },
      },
    });
    expect(decision.managerWpa).toBeCloseTo(decision.rawWindowWpa ?? 0, 4);
    expect(decision.managerWpa).toBeLessThan(0);
    expectIbbOfficialNetUnchanged(decision);
  });

  test("resolves IBB at the final same-half endpoint when gameEnded is true without a third out", () => {
    const winningRunner = {
      runnerId: "home-winning-run",
      runnerName: "Home Winning Run",
      responsiblePitcherId: "away-pitcher",
    };
    const walkedRunner = {
      runnerId: "home-ibb-batter",
      runnerName: "Home IBB Batter",
      responsiblePitcherId: "away-pitcher",
    };
    const ibb = createAtBat({
      eventId: "game-1_1",
      eventIndex: 1,
      inning: 9,
      halfInning: "BOTTOM",
      outs: 1,
      batterId: "home-ibb-batter",
      batterName: "Home IBB Batter",
      result: "IBB",
      runners: { first: null, second: null, third: winningRunner },
      runnersAfter: { first: walkedRunner, second: null, third: winningRunner },
      awayScore: 2,
      homeScore: 2,
      awayScoreAfter: 2,
      homeScoreAfter: 2,
      outsAfter: 1,
      totalInnings: 9,
    });
    const finalPa = createAtBat({
      eventId: "game-1_2",
      eventIndex: 2,
      inning: 9,
      halfInning: "BOTTOM",
      outs: 1,
      batterId: "home-next-batter",
      batterName: "Home Next Batter",
      runners: ibb.runnersAfter,
      result: "1B",
      runsScored: ["home-winning-run"],
      runnersAfter: {
        first: {
          runnerId: "home-next-batter",
          runnerName: "Home Next Batter",
          responsiblePitcherId: "away-pitcher",
        },
        second: walkedRunner,
        third: null,
      },
      awayScore: 2,
      homeScore: 2,
      awayScoreAfter: 2,
      homeScoreAfter: 3,
      outsAfter: 1,
      totalInnings: 9,
    });

    const [decision] = derive([ibb, finalPa], [], [], {
      gameEnded: true,
      totalInnings: 9,
    });

    expect(decision).toMatchObject({
      decisionType: "intentional_walk",
      resolved: true,
      resolvedAtEventId: "game-1_2",
      explanationMetadata: {
        intentionalWalk: {
          finalConsequenceEventId: "game-1_2",
          finalConsequence: "stranded",
          inningEnded: true,
        },
      },
    });
    expect(decision.managerWpa).toBeLessThan(0);
    expectIbbOfficialNetUnchanged(decision);
  });

  test("resolves IBB on the same event when the intentional walk is game-ending", () => {
    const walkedRunner = {
      runnerId: "home-ibb-batter",
      runnerName: "Home IBB Batter",
      responsiblePitcherId: "away-pitcher",
    };
    const ibb = createAtBat({
      eventId: "game-1_1",
      eventIndex: 1,
      inning: 9,
      halfInning: "BOTTOM",
      outs: 1,
      batterId: "home-ibb-batter",
      batterName: "Home IBB Batter",
      result: "IBB",
      runners: {
        first: {
          runnerId: "home-runner-first",
          runnerName: "Home Runner First",
          responsiblePitcherId: "away-pitcher",
        },
        second: {
          runnerId: "home-runner-second",
          runnerName: "Home Runner Second",
          responsiblePitcherId: "away-pitcher",
        },
        third: {
          runnerId: "home-winning-run",
          runnerName: "Home Winning Run",
          responsiblePitcherId: "away-pitcher",
        },
      },
      runsScored: ["home-winning-run"],
      runnersAfter: {
        first: walkedRunner,
        second: {
          runnerId: "home-runner-first",
          runnerName: "Home Runner First",
          responsiblePitcherId: "away-pitcher",
        },
        third: {
          runnerId: "home-runner-second",
          runnerName: "Home Runner Second",
          responsiblePitcherId: "away-pitcher",
        },
      },
      awayScore: 2,
      homeScore: 2,
      awayScoreAfter: 2,
      homeScoreAfter: 3,
      outsAfter: 1,
      isWalkOff: true,
      totalInnings: 9,
    });

    const [decision] = derive([ibb], [], [], { totalInnings: 9 });

    expect(decision).toMatchObject({
      decisionType: "intentional_walk",
      managerId: MANAGERS.away,
      teamId: "away",
      resolved: true,
      resolvedAtEventId: "game-1_1",
      linkedEventIds: ["game-1_1"],
      resolutionWindow: {
        status: "resolved",
        expectedEndpoint: "runner_consequence",
        trackedRunnerIds: ["home-ibb-batter"],
        maxEventIndex: 1,
      },
      explanationMetadata: {
        intentionalWalk: {
          walkedRunnerId: "home-ibb-batter",
          finalConsequenceEventId: "game-1_1",
          finalConsequence: "stranded",
          inningEnded: true,
        },
      },
    });
    expect(decision.managerWpa).toBeCloseTo(decision.rawWindowWpa ?? 0, 4);
    expect(decision.managerWpa).toBeLessThan(0);
    expectIbbOfficialNetUnchanged(decision);
  });

  test("resolves IBB at the next batter HR when the walked runner scores", () => {
    const ibb = createAtBat({
      eventId: "game-1_1",
      eventIndex: 1,
      inning: 4,
      result: "IBB",
      runnersAfter: {
        first: {
          runnerId: "away-batter",
          runnerName: "Away Batter",
          responsiblePitcherId: "home-pitcher",
        },
        second: null,
        third: null,
      },
      outsAfter: 1,
    });
    const homer = createAtBat({
      eventId: "game-1_2",
      eventIndex: 2,
      inning: 4,
      batterId: "away-next-batter",
      batterName: "Away Next Batter",
      runners: ibb.runnersAfter,
      result: "HR",
      runsScored: ["away-batter", "away-next-batter"],
      runnersAfter: { first: null, second: null, third: null },
      awayScoreAfter: 4,
      outsAfter: 1,
    });

    const [decision] = derive([ibb, homer]);

    expect(decision).toMatchObject({
      decisionType: "intentional_walk",
      resolved: true,
      resolvedAtEventId: "game-1_2",
      resolutionWindow: {
        status: "resolved",
        expectedEndpoint: "runner_consequence",
        maxEventIndex: 2,
      },
      explanationMetadata: {
        intentionalWalk: {
          nextBatterEventId: "game-1_2",
          nextBatterResult: "HR",
          finalConsequenceEventId: "game-1_2",
          finalConsequence: "scored",
          inningEnded: false,
        },
      },
    });
    expect(decision.linkedEventIds).toEqual(["game-1_1", "game-1_2"]);
    expect(decision.managerWpa).toBeCloseTo(decision.rawWindowWpa ?? 0, 4);
    const components = expectIbbOfficialNetUnchanged(decision);
    expect(components.consequenceRawWpa).toBeLessThan(0);
  });

  test("resolves IBB at a runner terminal event before the next PA", () => {
    const ibb = createAtBat({
      eventId: "game-1_1",
      eventIndex: 1,
      inning: 4,
      outs: 1,
      result: "IBB",
      runnersAfter: {
        first: {
          runnerId: "away-batter",
          runnerName: "Away Batter",
          responsiblePitcherId: "home-pitcher",
        },
        second: null,
        third: null,
      },
      outsAfter: 1,
    });
    const pickoff = createBetweenPlay({
      eventId: "game-1_bp_pickoff",
      eventIndex: 2,
      type: "pickoff",
      pitcherChange: undefined,
      gameState: {
        inning: 4,
        halfInning: "TOP",
        outs: 1,
        score: { away: 2, home: 2 },
        runnersOn: { first: "away-batter" },
      },
      runnerAction: {
        runnerId: "away-batter",
        runnerName: "Away Batter",
        fromBase: 1,
        toBase: 1,
        outcome: "out",
        reason: "pickoff",
      },
    });

    const [decision] = derive([ibb], [pickoff]);

    expect(decision).toMatchObject({
      decisionType: "intentional_walk",
      resolved: true,
      resolvedAtEventId: "game-1_bp_pickoff",
      resolutionWindow: {
        status: "resolved",
        expectedEndpoint: "runner_consequence",
        maxEventIndex: 2,
      },
      explanationMetadata: {
        intentionalWalk: {
          finalConsequenceEventId: "game-1_bp_pickoff",
          finalConsequence: "out",
          inningEnded: false,
        },
      },
    });
    expect(decision.linkedEventIds).toEqual(["game-1_1", "game-1_bp_pickoff"]);
    const components = expectIbbOfficialNetUnchanged(decision);
    expect(components.consequenceRawWpa).toBeGreaterThan(0);
  });

  test("resolves IBB as removed when the walked runner is replaced", () => {
    const walkedRunner = {
      runnerId: "away-batter",
      runnerName: "Away Batter",
      responsiblePitcherId: "home-pitcher",
    };
    const ibb = createAtBat({
      eventId: "game-1_ibb_removed",
      eventIndex: 1,
      inning: 4,
      outs: 1,
      result: "IBB",
      batterId: "away-batter",
      batterName: "Away Batter",
      runnersAfter: {
        first: walkedRunner,
        second: null,
        third: null,
      },
      outsAfter: 1,
    });
    const pinchRun = createBetweenPlay({
      eventId: "game-1_bp_pr_for_ibb",
      eventIndex: 2,
      type: "substitution",
      pitcherChange: undefined,
      gameState: {
        inning: 4,
        halfInning: "TOP",
        outs: 1,
        score: { away: 2, home: 2 },
        runnersOn: { first: "away-batter" },
      },
      substitution: {
        subType: "pinch_run",
        outPlayerId: "away-batter",
        outPlayerName: "Away Batter",
        inPlayerId: "away-pr",
        inPlayerName: "Away PR",
      },
    });

    const [decision] = derive([ibb], [pinchRun]);

    expect(decision).toMatchObject({
      decisionType: "intentional_walk",
      resolved: true,
      resolvedAtEventId: "game-1_bp_pr_for_ibb",
      explanationMetadata: {
        intentionalWalk: {
          finalConsequence: "removed",
          finalConsequenceEventId: "game-1_bp_pr_for_ibb",
        },
      },
    });
    expectIbbOfficialNetUnchanged(decision);
  });

  test("distinguishes following-batter DP out from stranded when runner outcomes identify the walked runner", () => {
    const walkedRunner = {
      runnerId: "away-ibb-batter",
      runnerName: "Away IBB Batter",
      responsiblePitcherId: "home-pitcher",
    };
    const ibb = createAtBat({
      eventId: "game-1_ibb_dp",
      eventIndex: 1,
      inning: 4,
      outs: 1,
      result: "IBB",
      batterId: "away-ibb-batter",
      batterName: "Away IBB Batter",
      runnersAfter: {
        first: walkedRunner,
        second: null,
        third: null,
      },
      outsAfter: 1,
    });
    const dpWithRunnerOutcome = createAtBat({
      eventId: "game-1_dp_runner_out",
      eventIndex: 2,
      inning: 4,
      outs: 1,
      batterId: "away-next-batter",
      batterName: "Away Next Batter",
      runners: ibb.runnersAfter,
      result: "GIDP",
      runnerOutcomes: [
        {
          runnerId: "away-ibb-batter",
          runnerName: "Away IBB Batter",
          fromBase: "first",
          toBase: "out",
        },
      ],
      runnersAfter: { first: null, second: null, third: null },
      outsAfter: 3,
    });
    const dpWithoutRunnerOutcome = {
      ...dpWithRunnerOutcome,
      eventId: "game-1_dp_runner_stranded",
      runnerOutcomes: [],
    };

    expect(derive([ibb, dpWithRunnerOutcome])[0]).toMatchObject({
      explanationMetadata: {
        intentionalWalk: {
          finalConsequence: "out",
          nextBatterResult: "GIDP",
        },
      },
    });
    expect(derive([ibb, dpWithoutRunnerOutcome])[0]).toMatchObject({
      explanationMetadata: {
        intentionalWalk: {
          finalConsequence: "stranded",
          nextBatterResult: "GIDP",
        },
      },
    });
  });

  test("keeps IBB pending after the next batter out, then resolves when the walked runner later scores", () => {
    const ibb = createAtBat({
      eventId: "game-1_1",
      eventIndex: 1,
      inning: 4,
      outs: 0,
      result: "IBB",
      runnersAfter: {
        first: {
          runnerId: "away-batter",
          runnerName: "Away Batter",
          responsiblePitcherId: "home-pitcher",
        },
        second: null,
        third: null,
      },
      outsAfter: 0,
    });
    const nextPaOut = createAtBat({
      eventId: "game-1_2",
      eventIndex: 2,
      inning: 4,
      batterId: "away-next-batter",
      batterName: "Away Next Batter",
      runners: ibb.runnersAfter,
      result: "FO",
      runnersAfter: ibb.runnersAfter,
      outs: 0,
      outsAfter: 1,
    });
    const scoringPa = createAtBat({
      eventId: "game-1_3",
      eventIndex: 3,
      inning: 4,
      batterId: "away-third-batter",
      batterName: "Away Third Batter",
      runners: nextPaOut.runnersAfter,
      result: "2B",
      runsScored: ["away-batter"],
      runnersAfter: {
        first: null,
        second: {
          runnerId: "away-third-batter",
          runnerName: "Away Third Batter",
          responsiblePitcherId: "home-pitcher",
        },
        third: null,
      },
      awayScoreAfter: 3,
      outs: 1,
      outsAfter: 1,
    });

    const pending = derive([ibb, nextPaOut])[0];
    expect(pending).toMatchObject({
      decisionType: "intentional_walk",
      resolved: false,
      resolvedAtEventId: undefined,
      managerWpa: undefined,
      linkedEventIds: ["game-1_1", "game-1_2"],
      explanationMetadata: {
        intentionalWalk: {
          nextBatterEventId: "game-1_2",
          nextBatterResult: "FO",
        },
      },
    });

    const resolved = derive([ibb, nextPaOut, scoringPa])[0];
    expect(resolved).toMatchObject({
      decisionType: "intentional_walk",
      resolved: true,
      resolvedAtEventId: "game-1_3",
      linkedEventIds: ["game-1_1", "game-1_2", "game-1_3"],
      explanationMetadata: {
        intentionalWalk: {
          nextBatterEventId: "game-1_2",
          nextBatterResult: "FO",
          finalConsequenceEventId: "game-1_3",
          finalConsequence: "scored",
        },
      },
    });
    expect(resolved.teamWinProbabilityAfter).not.toBe(
      pending.teamWinProbabilityAfter,
    );
  });

  test("keeps IBB pending when the walked runner remains live and the half-inning is open", () => {
    const ibb = createAtBat({
      eventId: "game-1_1",
      eventIndex: 1,
      inning: 4,
      outs: 0,
      result: "IBB",
      runnersAfter: {
        first: {
          runnerId: "away-batter",
          runnerName: "Away Batter",
          responsiblePitcherId: "home-pitcher",
        },
        second: null,
        third: null,
      },
      outsAfter: 0,
    });
    const nextPa = createAtBat({
      eventId: "game-1_2",
      eventIndex: 2,
      inning: 4,
      batterId: "away-next-batter",
      batterName: "Away Next Batter",
      runners: ibb.runnersAfter,
      result: "GO",
      runnersAfter: ibb.runnersAfter,
      outs: 0,
      outsAfter: 1,
    });

    const [decision] = derive([ibb, nextPa]);

    expect(decision).toMatchObject({
      decisionType: "intentional_walk",
      resolved: false,
      resolvedAtEventId: undefined,
      managerWpa: undefined,
      resolutionWindow: {
        status: "pending",
        expectedEndpoint: "runner_consequence",
        trackedRunnerIds: ["away-batter"],
      },
      linkedEventIds: ["game-1_1", "game-1_2"],
      explanationMetadata: {
        intentionalWalk: {
          nextBatterEventId: "game-1_2",
          nextBatterResult: "GO",
          finalConsequenceEventId: undefined,
        },
      },
    });
  });

  test("keeps IBB pending when an unrelated runner scores and the half-inning remains open", () => {
    const scoringRunner = {
      runnerId: "away-runner-third",
      runnerName: "Away Runner Third",
      responsiblePitcherId: "home-pitcher",
    };
    const walkedRunner = {
      runnerId: "away-batter",
      runnerName: "Away Batter",
      responsiblePitcherId: "home-pitcher",
    };
    const ibb = createAtBat({
      eventId: "game-1_1",
      eventIndex: 1,
      inning: 4,
      outs: 1,
      result: "IBB",
      runners: { first: null, second: null, third: scoringRunner },
      runnersAfter: { first: walkedRunner, second: null, third: scoringRunner },
      outsAfter: 1,
    });
    const single = createAtBat({
      eventId: "game-1_2",
      eventIndex: 2,
      inning: 4,
      outs: 1,
      batterId: "away-next-batter",
      batterName: "Away Next Batter",
      runners: ibb.runnersAfter,
      result: "1B",
      runsScored: ["away-runner-third"],
      runnersAfter: {
        first: {
          runnerId: "away-next-batter",
          runnerName: "Away Next Batter",
          responsiblePitcherId: "home-pitcher",
        },
        second: walkedRunner,
        third: null,
      },
      awayScoreAfter: 3,
      outsAfter: 1,
    });

    const [decision] = derive([ibb, single]);

    expect(decision).toMatchObject({
      decisionType: "intentional_walk",
      resolved: false,
      resolvedAtEventId: undefined,
      managerWpa: undefined,
      resolutionWindow: {
        status: "pending",
        expectedEndpoint: "runner_consequence",
        trackedRunnerIds: ["away-batter"],
      },
      linkedEventIds: ["game-1_1", "game-1_2"],
      explanationMetadata: {
        intentionalWalk: {
          nextBatterEventId: "game-1_2",
          nextBatterResult: "1B",
          finalConsequenceEventId: undefined,
        },
      },
    });
  });

  test("scores batter out-advancing send against a counterfactual double, not the positive RBI PA", () => {
    const runner = {
      runnerId: "away-runner-second",
      runnerName: "Away Runner Second",
      responsiblePitcherId: "home-pitcher",
    };
    const event = createAtBat({
      eventId: "game-1_out_advancing_batter",
      eventIndex: 20,
      inning: 8,
      outs: 1,
      result: "2B",
      wpaModelVersion: WPA_MODEL_VERSION,
      runners: { first: null, second: runner, third: null },
      runsScored: ["away-runner-second"],
      rbiCount: 1,
      awayScore: 3,
      homeScore: 3,
      awayScoreAfter: 4,
      homeScoreAfter: 3,
      runnersAfter: { first: null, second: null, third: null },
      outsAfter: 2,
      runnerOutcomes: [
        {
          runnerId: "away-runner-second",
          runnerName: "Away Runner Second",
          fromBase: "second",
          toBase: "home",
        },
        {
          runnerId: "away-batter",
          runnerName: "Away Batter",
          fromBase: "batter",
          toBase: "out",
          isOutAdvancing: true,
          managerIntent: "manager_send",
          managerDecisionSource: "play_log_enhancement",
        },
      ],
    });

    const [decision] = derive([event]);
    const metadata = requireOutAdvancingSendMetadata(decision);
    const credits = deriveKblWpaCredits({ atBatEvents: [event] });
    const batterTotal = aggregateKblWpaCredits(credits).find(
      (entry) => entry.playerId === "away-batter",
    );

    expect(teamWpaDeltaForEvent(event, "away")).toBeGreaterThan(0);
    expect(decision).toMatchObject({
      decisionType: "out_advancing_send",
      resolved: true,
      teamWinProbabilityBefore: metadata.counterfactualTeamWinProbability,
      teamWinProbabilityAfter: metadata.actualTeamWinProbability,
    });
    expect(decision.rawWindowWpa).toBeLessThan(0);
    expect(decision.managerWpa).toBeCloseTo(
      Math.round(((decision.rawWindowWpa ?? 0) * 0.35) * 10000) / 10000,
      4,
    );
    expect(metadata).toMatchObject({
      inferredHoldBase: "second",
      holdBaseSource: "batter_safe_at_second",
      actualState: {
        outs: 2,
        awayScore: 4,
        bases: { first: false, second: false, third: false },
      },
      counterfactualState: {
        outs: 1,
        awayScore: 4,
        bases: { first: false, second: true, third: false },
      },
      rawCounterfactualWpa: decision.rawWindowWpa,
    });
    expect(batterTotal?.battingWpa ?? 0).toBeGreaterThan(0);
  });

  test("out-advancing counterfactual uses caller ghost-runner mapping when legacy event lacks it", () => {
    const runner = {
      runnerId: "away-runner-second",
      runnerName: "Away Runner Second",
      responsiblePitcherId: "home-pitcher",
    };
    const event = createAtBat({
      eventId: "game-1_out_advancing_ghost_policy",
      eventIndex: 21,
      inning: 10,
      outs: 1,
      result: "2B",
      runners: { first: null, second: runner, third: null },
      extraInningRunner: true,
      extraInningRunnerDelay: 1,
      runsScored: ["away-runner-second"],
      rbiCount: 1,
      awayScore: 3,
      homeScore: 3,
      awayScoreAfter: 4,
      homeScoreAfter: 3,
      runnersAfter: { first: null, second: null, third: null },
      outsAfter: 2,
      runnerOutcomes: [
        {
          runnerId: "away-runner-second",
          runnerName: "Away Runner Second",
          fromBase: "second",
          toBase: "home",
        },
        {
          runnerId: "away-batter",
          runnerName: "Away Batter",
          fromBase: "batter",
          toBase: "out",
          isOutAdvancing: true,
          managerIntent: "manager_send",
          managerDecisionSource: "play_log_enhancement",
        },
      ],
    });

    const [decision] = derive([event], [], [], {
      totalInnings: 9,
      useGhostRunner: false,
      extraInningRunner: true,
      extraInningRunnerDelay: 1,
    });
    const expectedNoGhostMapping = calculateWPA(
      {
        inning: 10,
        isTop: true,
        outs: 1,
        bases: { first: false, second: true, third: false },
        homeScore: 3,
        awayScore: 3,
        totalInnings: 9,
        useGhostRunner: false,
        extraInningRunner: true,
        extraInningRunnerDelay: 1,
      },
      {
        outs: 2,
        bases: { first: false, second: false, third: false },
        homeScore: 3,
        awayScore: 4,
      },
    );
    const counterfactualNoGhostMapping = calculateWPA(
      {
        inning: 10,
        isTop: true,
        outs: 1,
        bases: { first: false, second: true, third: false },
        homeScore: 3,
        awayScore: 3,
        totalInnings: 9,
        useGhostRunner: false,
        extraInningRunner: true,
        extraInningRunnerDelay: 1,
      },
      {
        outs: 1,
        bases: { first: false, second: true, third: false },
        homeScore: 3,
        awayScore: 4,
      },
    );
    const counterfactualGhostMapping = calculateWPA(
      {
        inning: 10,
        isTop: true,
        outs: 1,
        bases: { first: false, second: true, third: false },
        homeScore: 3,
        awayScore: 3,
        totalInnings: 9,
        extraInningRunner: true,
        extraInningRunnerDelay: 1,
      },
      {
        outs: 1,
        bases: { first: false, second: true, third: false },
        homeScore: 3,
        awayScore: 4,
      },
    );
    const expectedRawWpa =
      Math.round(
        ((1 - expectedNoGhostMapping.winProbabilityAfter) -
          (1 - counterfactualNoGhostMapping.winProbabilityAfter)) *
          10000,
      ) / 10000;
    const wrongRawWpa =
      Math.round(
        ((1 - expectedNoGhostMapping.winProbabilityAfter) -
          (1 - counterfactualGhostMapping.winProbabilityAfter)) *
          10000,
      ) / 10000;

    expect(decision.decisionType).toBe("out_advancing_send");
    expect(decision.rawWindowWpa).toBeCloseTo(expectedRawWpa, 4);
    expect(decision.rawWindowWpa).not.toBeCloseTo(wrongRawWpa, 4);
  });

  test("scores runner from second thrown out at home against a hold-at-third counterfactual", () => {
    const runner = {
      runnerId: "away-runner-second",
      runnerName: "Away Runner Second",
      responsiblePitcherId: "home-pitcher",
    };
    const event = createAtBat({
      eventId: "game-1_out_home",
      eventIndex: 21,
      inning: 8,
      outs: 1,
      result: "1B",
      runners: { first: null, second: runner, third: null },
      runnersAfter: {
        first: {
          runnerId: "away-batter",
          runnerName: "Away Batter",
          responsiblePitcherId: "home-pitcher",
        },
        second: null,
        third: null,
      },
      outsAfter: 2,
      runnerOutcomes: [
        {
          runnerId: "away-runner-second",
          runnerName: "Away Runner Second",
          fromBase: "second",
          toBase: "out",
          isOutAdvancing: true,
          managerIntent: "manager_send",
          managerDecisionSource: "play_log_enhancement",
        },
      ],
    });

    const [decision] = derive([event]);
    const metadata = requireOutAdvancingSendMetadata(decision);

    expect(decision).toMatchObject({
      decisionType: "out_advancing_send",
      resolved: true,
    });
    expect(decision.rawWindowWpa).toBeLessThan(0);
    expect(metadata).toMatchObject({
      inferredHoldBase: "third",
      holdBaseSource: "runner_from_second_safe_stop_third",
      actualState: {
        outs: 2,
        bases: { first: true, second: false, third: false },
      },
      counterfactualState: {
        outs: 1,
        bases: { first: true, second: false, third: true },
      },
    });
  });

  test("scores bottom-half home send from second using home-team counterfactual WPA perspective", () => {
    const runner = {
      runnerId: "home-runner-second",
      runnerName: "Home Runner Second",
      responsiblePitcherId: "away-pitcher",
    };
    const event = createAtBat({
      eventId: "game-1_home_out_home",
      eventIndex: 22,
      inning: 8,
      halfInning: "BOTTOM",
      outs: 1,
      result: "1B",
      runners: { first: null, second: runner, third: null },
      runnersAfter: {
        first: {
          runnerId: "home-batter",
          runnerName: "Home Batter",
          responsiblePitcherId: "away-pitcher",
        },
        second: null,
        third: null,
      },
      outsAfter: 2,
      runnerOutcomes: [
        {
          runnerId: "home-runner-second",
          runnerName: "Home Runner Second",
          fromBase: "second",
          toBase: "out",
          isOutAdvancing: true,
          managerIntent: "manager_send",
          managerDecisionSource: "play_log_enhancement",
        },
      ],
    });

    const [decision] = derive([event]);
    const metadata = requireOutAdvancingSendMetadata(decision);
    const wholeEventHomeWpa = teamWpaDeltaForEvent(event, "home");

    expect(decision).toMatchObject({
      decisionType: "out_advancing_send",
      teamId: "home",
      resolved: true,
    });
    expect(decision.rawWindowWpa).toBeLessThan(0);
    expect(decision.managerWpa).toBeLessThan(0);
    expect(decision.teamWinProbabilityBefore).toBe(
      metadata.counterfactualTeamWinProbability,
    );
    expect(decision.teamWinProbabilityAfter).toBe(
      metadata.actualTeamWinProbability,
    );
    expect(metadata.actualTeamWinProbability).toBeLessThan(
      metadata.counterfactualTeamWinProbability ?? 0,
    );
    expect(decision.rawWindowWpa).not.toBeCloseTo(wholeEventHomeWpa, 4);
    expect(metadata).toMatchObject({
      inferredHoldBase: "third",
      holdBaseSource: "runner_from_second_safe_stop_third",
      actualState: {
        outs: 2,
        homeScore: 2,
        bases: { first: true, second: false, third: false },
      },
      counterfactualState: {
        outs: 1,
        homeScore: 2,
        bases: { first: true, second: false, third: true },
      },
      rawCounterfactualWpa: decision.rawWindowWpa,
    });
  });

  test("scores runner from first thrown out at third against a hold-at-second counterfactual", () => {
    const runner = {
      runnerId: "away-runner-first",
      runnerName: "Away Runner First",
      responsiblePitcherId: "home-pitcher",
    };
    const event = createAtBat({
      eventId: "game-1_out_third",
      eventIndex: 22,
      inning: 8,
      outs: 1,
      result: "1B",
      runners: { first: runner, second: null, third: null },
      runnersAfter: {
        first: {
          runnerId: "away-batter",
          runnerName: "Away Batter",
          responsiblePitcherId: "home-pitcher",
        },
        second: null,
        third: null,
      },
      outsAfter: 2,
      runnerOutcomes: [
        {
          runnerId: "away-runner-first",
          runnerName: "Away Runner First",
          fromBase: "first",
          toBase: "out",
          isOutAdvancing: true,
          managerIntent: "manager_send",
          managerDecisionSource: "play_log_enhancement",
        },
      ],
    });

    const [decision] = derive([event]);
    const metadata = requireOutAdvancingSendMetadata(decision);

    expect(decision).toMatchObject({
      decisionType: "out_advancing_send",
      resolved: true,
    });
    expect(decision.rawWindowWpa).toBeLessThan(0);
    expect(metadata).toMatchObject({
      inferredHoldBase: "second",
      holdBaseSource: "runner_from_first_out_at_third_safe_stop_second",
      actualState: {
        outs: 2,
        bases: { first: true, second: false, third: false },
      },
      counterfactualState: {
        outs: 1,
        bases: { first: true, second: true, third: false },
      },
    });
  });

  test("leaves unprovable out-advancing sends unscored instead of using whole-event WPA", () => {
    const runner = {
      runnerId: "away-runner-first",
      runnerName: "Away Runner First",
      responsiblePitcherId: "home-pitcher",
    };
    const event = createAtBat({
      eventId: "game-1_out_unprovable",
      eventIndex: 23,
      inning: 8,
      outs: 1,
      result: "GO",
      runners: { first: runner, second: null, third: null },
      runnersAfter: { first: null, second: null, third: null },
      outsAfter: 2,
      runnerOutcomes: [
        {
          runnerId: "away-runner-first",
          runnerName: "Away Runner First",
          fromBase: "first",
          toBase: "out",
          isOutAdvancing: true,
          managerIntent: "manager_send",
          managerDecisionSource: "play_log_enhancement",
        },
      ],
    });

    const [decision] = derive([event]);
    const metadata = requireOutAdvancingSendMetadata(decision);

    expect(teamWpaDeltaForEvent(event, "away")).toBeLessThan(0);
    expect(decision).toMatchObject({
      decisionType: "out_advancing_send",
      resolved: false,
      teamWinProbabilityAfter: undefined,
      rawWindowWpa: undefined,
      managerWpa: undefined,
      resolutionWindow: {
        status: "pending",
      },
    });
    expect(metadata).toMatchObject({
      runnerId: "away-runner-first",
      unscoredReason: "missing_hit_context",
    });
  });

  test("keeps hit-and-run duplicate-send suppression when the runner is out advancing", () => {
    const runner = {
      runnerId: "away-runner-first",
      runnerName: "Away Runner First",
      responsiblePitcherId: "home-pitcher",
    };
    const event = createAtBat({
      eventId: "game-1_hit_run_out",
      eventIndex: 24,
      result: "1B",
      runners: { first: runner, second: null, third: null },
      runnersAfter: {
        first: {
          runnerId: "away-batter",
          runnerName: "Away Batter",
          responsiblePitcherId: "home-pitcher",
        },
        second: null,
        third: null,
      },
      outsAfter: 2,
      runnerOutcomes: [
        {
          runnerId: "away-runner-first",
          runnerName: "Away Runner First",
          fromBase: "first",
          toBase: "out",
          isOutAdvancing: true,
          managerRunPlay: "hit_and_run",
          managerIntent: "manager_send",
          managerDecisionSource: "play_log_enhancement",
        },
      ],
    });

    const decisions = derive([event]);

    expect(decisions.map((decision) => decision.decisionType)).toEqual([
      "hit_and_run",
    ]);
  });

  test("keeps runner hold scoring on the existing whole-event window", () => {
    const runner = {
      runnerId: "away-runner-second",
      runnerName: "Away Runner Second",
      responsiblePitcherId: "home-pitcher",
    };
    const event = createAtBat({
      eventId: "game-1_runner_hold",
      eventIndex: 25,
      inning: 8,
      outs: 1,
      result: "1B",
      runners: { first: null, second: runner, third: null },
      runnersAfter: {
        first: {
          runnerId: "away-batter",
          runnerName: "Away Batter",
          responsiblePitcherId: "home-pitcher",
        },
        second: null,
        third: runner,
      },
      outsAfter: 1,
      runnerOutcomes: [
        {
          runnerId: "away-runner-second",
          runnerName: "Away Runner Second",
          fromBase: "second",
          toBase: "third",
          managerIntent: "manager_hold",
          managerDecisionSource: "play_log_enhancement",
        },
      ],
    });

    const [decision] = derive([event]);
    const paTeamWpa = teamWpaDeltaForEvent(event, "away");

    expect(decision).toMatchObject({
      decisionType: "runner_hold",
      resolved: true,
      explanationMetadata: undefined,
    });
    expect(decision.rawWindowWpa).toBeCloseTo(paTeamWpa, 4);
    expect(decision.managerWpa).toBeCloseTo(paTeamWpa * 0.2, 4);
  });

  test("keeps pitching changes pending until the incoming pitcher's next completed PA", () => {
    const change = createBetweenPlay({
      eventId: "game-1_bp_1",
      eventIndex: 1,
      type: "pitcher_change",
      gameState: {
        inning: 5,
        halfInning: "TOP",
        outs: 1,
        score: { away: 2, home: 2 },
        runnersOn: {},
      },
      pitcherChange: {
        outgoingPitcherId: "home-pitcher",
        incomingPitcherId: "home-reliever",
        inheritedRunners: 0,
      },
    });
    const unrelatedPa = createAtBat({
      eventId: "game-1_2",
      eventIndex: 2,
      inning: 5,
      pitcherId: "home-pitcher",
      pitcherName: "Home Pitcher",
    });
    const relieverPa = createAtBat({
      eventId: "game-1_3",
      eventIndex: 3,
      inning: 5,
      pitcherId: "home-reliever",
      pitcherName: "Home Reliever",
      result: "K",
      outsAfter: 2,
    });

    expect(derive([], [change])[0]).toMatchObject({
      decisionType: "pitching_change",
      resolved: false,
      managerWpa: undefined,
      resolutionWindow: {
        status: "pending",
        expectedEndpoint: "next_pa",
        trackedPlayerIds: ["home-reliever"],
      },
    });

    const resolved = derive([unrelatedPa, relieverPa], [change])[0];
    expect(resolved).toMatchObject({
      decisionType: "pitching_change",
      resolved: true,
      resolvedAtEventId: "game-1_3",
      resolutionWindow: { status: "resolved", maxEventIndex: 3 },
    });
    expect(resolved.linkedEventIds).toEqual(
      expect.arrayContaining(["game-1_bp_1", "game-1_3"]),
    );
  });

  test("keeps pitching changes pending when no PA is faced before the inning ends", () => {
    const change = createBetweenPlay({
      eventId: "game-1_bp_1",
      eventIndex: 1,
      type: "pitcher_change",
      gameState: {
        inning: 5,
        halfInning: "TOP",
        outs: 1,
        score: { away: 2, home: 2 },
        runnersOn: {},
      },
      pitcherChange: {
        outgoingPitcherId: "home-pitcher",
        incomingPitcherId: "home-reliever",
        inheritedRunners: 0,
      },
    });
    const inningEndingPa = createAtBat({
      eventId: "game-1_2",
      eventIndex: 2,
      inning: 5,
      pitcherId: "home-pitcher",
      pitcherName: "Home Pitcher",
      outs: 2,
      outsAfter: 3,
    });

    const [decision] = derive([inningEndingPa], [change]);

    expect(decision).toMatchObject({
      decisionType: "pitching_change",
      resolved: false,
      resolvedAtEventId: undefined,
      managerWpa: undefined,
      resolutionWindow: {
        status: "pending",
        trackedPlayerIds: ["home-reliever"],
      },
    });
    expect(decision.linkedEventIds).toEqual(["game-1_bp_1"]);
  });

  test("keeps pinch hitters pending until the pinch hitter PA resolves", () => {
    const pinchHit = createBetweenPlay({
      eventId: "game-1_bp_1",
      eventIndex: 1,
      type: "substitution",
      pitcherChange: undefined,
      substitution: {
        subType: "pinch_hit",
        outPlayerId: "away-batter-8",
        inPlayerId: "away-ph",
      },
    });
    const phPa = createAtBat({
      eventId: "game-1_2",
      eventIndex: 2,
      inning: 5,
      batterId: "away-ph",
      batterName: "Away Pinch Hitter",
      result: "2B",
      runnersAfter: {
        first: null,
        second: {
          runnerId: "away-ph",
          runnerName: "Away Pinch Hitter",
          responsiblePitcherId: "home-pitcher",
        },
        third: null,
      },
    });

    expect(derive([], [pinchHit])[0]).toMatchObject({
      decisionType: "pinch_hitter",
      resolved: false,
      resolutionWindow: {
        status: "pending",
        expectedEndpoint: "next_pa",
        trackedPlayerIds: expect.arrayContaining(["away-ph"]),
      },
    });

    const resolved = derive([phPa], [pinchHit])[0];
    expect(resolved).toMatchObject({
      decisionType: "pinch_hitter",
      resolved: true,
      resolvedAtEventId: "game-1_2",
    });
  });

  test("keeps pinch hitters pending when the target PA never occurs", () => {
    const pinchHit = createBetweenPlay({
      eventId: "game-1_bp_1",
      eventIndex: 1,
      type: "substitution",
      pitcherChange: undefined,
      substitution: {
        subType: "pinch_hit",
        outPlayerId: "away-batter-8",
        inPlayerId: "away-ph",
      },
    });
    const inningEndingPa = createAtBat({
      eventId: "game-1_2",
      eventIndex: 2,
      inning: 5,
      batterId: "away-other",
      batterName: "Away Other",
      outs: 2,
      outsAfter: 3,
    });

    const [decision] = derive([inningEndingPa], [pinchHit]);

    expect(decision).toMatchObject({
      decisionType: "pinch_hitter",
      resolved: false,
      resolvedAtEventId: undefined,
      managerWpa: undefined,
      resolutionWindow: {
        status: "pending",
        trackedPlayerIds: expect.arrayContaining(["away-ph"]),
      },
    });
    expect(decision.linkedEventIds).toEqual(["game-1_bp_1"]);
  });

  test("derives prompted keep-pitcher decisions and keeps them pending until that pitcher faces a PA", () => {
    const prompt = createPromptedKeepCurrent({
      eventId: "game-1_bp_keep_pitcher",
      eventIndex: 1,
      decisionType: "leave_pitcher_in",
      trackedPlayerId: "home-pitcher",
      provenanceKey: "keep-home-pitcher",
      gameState: {
        inning: 5,
        halfInning: "TOP",
        outs: 1,
        score: { away: 2, home: 2 },
        runnersOn: {},
      },
    });
    const nextPa = createAtBat({
      eventId: "game-1_2",
      eventIndex: 2,
      inning: 5,
      halfInning: "TOP",
      pitcherId: "home-pitcher",
      pitcherName: "Home Pitcher",
      result: "HR",
      runsScored: ["away-batter"],
      awayScore: 2,
      homeScore: 2,
      awayScoreAfter: 3,
      homeScoreAfter: 2,
      outsAfter: 1,
    });

    const pending = derive([], [prompt])[0];
    expect(pending).toMatchObject({
      decisionType: "leave_pitcher_in",
      inferenceMethod: "prompted",
      decisionSource: "situational_prompt",
      managerId: MANAGERS.home,
      teamId: "home",
      involvedPlayerIds: ["home-pitcher"],
      resolved: false,
      managerWpa: undefined,
      resolutionWindow: {
        status: "pending",
        expectedEndpoint: "next_pa",
        trackedPlayerIds: ["home-pitcher"],
      },
    });

    const resolved = derive([nextPa], [prompt])[0];
    expect(resolved).toMatchObject({
      decisionType: "leave_pitcher_in",
      resolved: true,
      resolvedAtEventId: "game-1_2",
      resolutionWindow: { status: "resolved", maxEventIndex: 2 },
    });
    expect(resolved.linkedEventIds).toEqual(
      expect.arrayContaining(["game-1_bp_keep_pitcher", "game-1_2"]),
    );
    expect(resolved.managerWpa).toBeCloseTo((resolved.rawWindowWpa ?? 0) * 0.2, 4);
  });

  test("keeps leave-pitcher-in decisions pending when the target PA never occurs", () => {
    const prompt = createPromptedKeepCurrent({
      eventId: "game-1_bp_keep_pitcher",
      eventIndex: 1,
      decisionType: "leave_pitcher_in",
      trackedPlayerId: "home-pitcher",
      provenanceKey: "keep-home-pitcher",
      gameState: {
        inning: 5,
        halfInning: "TOP",
        outs: 2,
        score: { away: 2, home: 2 },
        runnersOn: { first: "away-runner" },
      },
    });
    const pickoff = createBetweenPlay({
      eventId: "game-1_bp_pickoff",
      eventIndex: 2,
      type: "pickoff",
      pitcherChange: undefined,
      gameState: {
        inning: 5,
        halfInning: "TOP",
        outs: 2,
        score: { away: 2, home: 2 },
        runnersOn: { first: "away-runner" },
      },
      runnerAction: {
        runnerId: "away-runner",
        runnerName: "Away Runner",
        fromBase: 1,
        toBase: 1,
        outcome: "out",
        reason: "pickoff",
      },
    });

    const [decision] = derive([], [prompt, pickoff]);

    expect(decision).toMatchObject({
      decisionType: "leave_pitcher_in",
      resolved: false,
      resolvedAtEventId: undefined,
      managerWpa: undefined,
      resolutionWindow: {
        status: "pending",
        trackedPlayerIds: ["home-pitcher"],
      },
    });
    expect(decision.linkedEventIds).toEqual(["game-1_bp_keep_pitcher"]);
  });

  test("between-play manager WPA uses event snapshot total innings before caller fallback", () => {
    const caughtStealing = createBetweenPlay({
      eventId: "game-1_bp_cs_snapshot_total",
      eventIndex: 1,
      type: "caught_stealing",
      pitcherChange: undefined,
      gameState: {
        inning: 8,
        halfInning: "TOP",
        outs: 0,
        totalInnings: 7,
        score: { away: 5, home: 5 },
        extraInningRunner: true,
        extraInningRunnerDelay: 1,
        runnersOn: { second: "away-runner" },
      },
      runnerAction: {
        runnerId: "away-runner",
        runnerName: "Away Runner",
        fromBase: 2,
        toBase: 3,
        outcome: "out",
        reason: "caught_stealing",
      },
    });

    const [decision] = derive([], [caughtStealing], [], {
      totalInnings: 9,
      extraInningRunner: true,
      extraInningRunnerDelay: 1,
    });
    const expectedSnapshotWpa = calculateWPA(
      {
        inning: 8,
        isTop: true,
        outs: 0,
        bases: { first: false, second: true, third: false },
        homeScore: 5,
        awayScore: 5,
        totalInnings: 7,
        extraInningRunner: true,
        extraInningRunnerDelay: 1,
      },
      {
        outs: 1,
        bases: { first: false, second: false, third: false },
        homeScore: 5,
        awayScore: 5,
      },
    ).battingTeamDelta;
    const fallbackNineInningWpa = calculateWPA(
      {
        inning: 8,
        isTop: true,
        outs: 0,
        bases: { first: false, second: true, third: false },
        homeScore: 5,
        awayScore: 5,
        totalInnings: 9,
        extraInningRunner: true,
        extraInningRunnerDelay: 1,
      },
      {
        outs: 1,
        bases: { first: false, second: false, third: false },
        homeScore: 5,
        awayScore: 5,
      },
    ).battingTeamDelta;

    expect(decision.decisionType).toBe("steal_send");
    expect(decision.rawWindowWpa).toBeCloseTo(expectedSnapshotWpa, 4);
    expect(decision.rawWindowWpa).not.toBeCloseTo(fallbackNineInningWpa, 4);
    expect(decision.managerWpa).toBeCloseTo(expectedSnapshotWpa * 0.35, 4);
  });

  test("old between-play manager WPA uses caller total innings fallback", () => {
    const caughtStealing = createBetweenPlay({
      eventId: "game-1_bp_cs_fallback_total",
      eventIndex: 1,
      type: "caught_stealing",
      pitcherChange: undefined,
      gameState: {
        inning: 8,
        halfInning: "TOP",
        outs: 0,
        score: { away: 5, home: 5 },
        extraInningRunner: true,
        extraInningRunnerDelay: 1,
        runnersOn: { second: "away-runner" },
      },
      runnerAction: {
        runnerId: "away-runner",
        runnerName: "Away Runner",
        fromBase: 2,
        toBase: 3,
        outcome: "out",
        reason: "caught_stealing",
      },
    });

    const [decision] = derive([], [caughtStealing], [], {
      totalInnings: 7,
      extraInningRunner: true,
      extraInningRunnerDelay: 1,
    });
    const expectedFallbackWpa = calculateWPA(
      {
        inning: 8,
        isTop: true,
        outs: 0,
        bases: { first: false, second: true, third: false },
        homeScore: 5,
        awayScore: 5,
        totalInnings: 7,
        extraInningRunner: true,
        extraInningRunnerDelay: 1,
      },
      {
        outs: 1,
        bases: { first: false, second: false, third: false },
        homeScore: 5,
        awayScore: 5,
      },
    ).battingTeamDelta;

    expect(decision.decisionType).toBe("steal_send");
    expect(decision.rawWindowWpa).toBeCloseTo(expectedFallbackWpa, 4);
    expect(decision.managerWpa).toBeCloseTo(expectedFallbackWpa * 0.35, 4);
  });

  test("derives prompted let-batter-hit decisions and waits for that batter's PA", () => {
    const prompt = createPromptedKeepCurrent({
      eventId: "game-1_bp_let_batter_hit",
      eventIndex: 1,
      decisionType: "let_batter_hit",
      trackedPlayerId: "away-hitter-8",
      teamId: "away",
      managerId: MANAGERS.away,
      opponentTeamId: "home",
      provenanceKey: "let-away-hitter-hit",
      gameState: {
        inning: 5,
        halfInning: "TOP",
        outs: 1,
        score: { away: 2, home: 2 },
        runnersOn: {},
      },
    });
    const unrelatedPa = createAtBat({
      eventId: "game-1_2",
      eventIndex: 2,
      inning: 5,
      batterId: "away-other",
      batterName: "Away Other",
      outsAfter: 2,
    });
    const targetPa = createAtBat({
      eventId: "game-1_3",
      eventIndex: 3,
      inning: 5,
      batterId: "away-hitter-8",
      batterName: "Away Hitter 8",
      result: "2B",
      awayScore: 2,
      homeScore: 2,
      awayScoreAfter: 3,
      homeScoreAfter: 2,
      outsAfter: 2,
      runnersAfter: {
        first: null,
        second: {
          runnerId: "away-hitter-8",
          runnerName: "Away Hitter 8",
          responsiblePitcherId: "home-pitcher",
        },
        third: null,
      },
    });

    expect(derive([unrelatedPa], [prompt])[0]).toMatchObject({
      decisionType: "let_batter_hit",
      resolved: false,
      managerWpa: undefined,
      resolutionWindow: {
        status: "pending",
        trackedPlayerIds: ["away-hitter-8"],
      },
    });

    const resolved = derive([unrelatedPa, targetPa], [prompt])[0];
    expect(resolved).toMatchObject({
      decisionType: "let_batter_hit",
      managerId: MANAGERS.away,
      teamId: "away",
      resolved: true,
      resolvedAtEventId: "game-1_3",
    });
    expect(resolved.managerWpa).toBeCloseTo((resolved.rawWindowWpa ?? 0) * 0.2, 4);
  });

  test("keeps let-batter-hit decisions pending when the target PA never occurs", () => {
    const prompt = createPromptedKeepCurrent({
      eventId: "game-1_bp_let_batter_hit",
      eventIndex: 1,
      decisionType: "let_batter_hit",
      trackedPlayerId: "away-hitter-8",
      teamId: "away",
      managerId: MANAGERS.away,
      opponentTeamId: "home",
      provenanceKey: "let-away-hitter-hit",
      gameState: {
        inning: 5,
        halfInning: "TOP",
        outs: 1,
        score: { away: 2, home: 2 },
        runnersOn: {},
      },
    });
    const inningEndingPa = createAtBat({
      eventId: "game-1_2",
      eventIndex: 2,
      inning: 5,
      batterId: "away-other",
      batterName: "Away Other",
      outs: 2,
      outsAfter: 3,
    });

    const [decision] = derive([inningEndingPa], [prompt]);

    expect(decision).toMatchObject({
      decisionType: "let_batter_hit",
      resolved: false,
      resolvedAtEventId: undefined,
      managerWpa: undefined,
      resolutionWindow: {
        status: "pending",
        trackedPlayerIds: ["away-hitter-8"],
      },
    });
    expect(decision.linkedEventIds).toEqual(["game-1_bp_let_batter_hit"]);
  });

  test("dedupes repeated prompted keep-current records by recommendation provenance", () => {
    const firstPrompt = createPromptedKeepCurrent({
      eventId: "game-1_bp_keep_1",
      eventIndex: 1,
      provenanceKey: "keep-home-pitcher",
    });
    const repeatedPrompt = createPromptedKeepCurrent({
      eventId: "game-1_bp_keep_2",
      eventIndex: 1.001,
      provenanceKey: "keep-home-pitcher",
    });

    const decisions = derive([], [firstPrompt, repeatedPrompt]).filter(
      (decision) => decision.decisionType === "leave_pitcher_in",
    );

    expect(decisions).toHaveLength(1);
    expect(decisions[0].decisionEventId).toBe("game-1_bp_keep_1");
  });

  test("infers leave-pitcher-in when a shown recommendation is ignored and the pitcher faces the next batter", () => {
    const watch = createRecommendationWatch({
      eventId: "game-1_bp_rec_pitcher",
      eventIndex: 1,
      recommendationType: "consider_pitching_change",
      trackedPlayerIds: ["home-pitcher"],
      suppressKey: "consider_pitching_change:home-pitcher:5:top",
      gameState: {
        inning: 5,
        halfInning: "TOP",
        outs: 1,
        score: { away: 2, home: 2 },
        runnersOn: {},
      },
    });
    const nextPa = createAtBat({
      eventId: "game-1_2",
      eventIndex: 2,
      inning: 5,
      halfInning: "TOP",
      pitcherId: "home-pitcher",
      pitcherName: "Home Pitcher",
      result: "2B",
      awayScoreAfter: 3,
      outsAfter: 1,
    });

    const [decision] = derive([nextPa], [watch]);

    expect(decision).toMatchObject({
      decisionType: "leave_pitcher_in",
      inferenceMethod: "passive",
      decisionSource: "situational_prompt",
      decisionEventId: "game-1_bp_rec_pitcher",
      resolved: true,
      resolvedAtEventId: "game-1_2",
      explanationMetadata: {
        recommendation: {
          response: "inferred_no_change",
          recommendationType: "consider_pitching_change",
          recommendedPlayerId: "home-pitcher",
        },
      },
    });
    expect(decision.managerWpa).toBeCloseTo((decision.rawWindowWpa ?? 0) * 0.2, 4);
  });

  test("resolves pitching recommendations to the first endpoint before later removals", () => {
    const watch = createRecommendationWatch({
      eventId: "game-1_bp_rec_pitcher",
      eventIndex: 1,
      recommendationType: "consider_pitching_change",
      trackedPlayerIds: ["home-pitcher"],
      suppressKey: "consider_pitching_change:home-pitcher:5:top",
      gameState: {
        inning: 5,
        halfInning: "TOP",
        outs: 1,
        score: { away: 2, home: 2 },
        runnersOn: {},
      },
    });
    const nextPa = createAtBat({
      eventId: "game-1_2",
      eventIndex: 2,
      inning: 5,
      halfInning: "TOP",
      pitcherId: "home-pitcher",
      pitcherName: "Home Pitcher",
      result: "1B",
      runnersAfter: {
        first: {
          runnerId: "away-batter",
          runnerName: "Away Batter",
          responsiblePitcherId: "home-pitcher",
        },
        second: null,
        third: null,
      },
      outsAfter: 1,
    });
    const laterRemoval = createBetweenPlay({
      eventId: "game-1_bp_later_pitching_change",
      eventIndex: 3,
      type: "pitcher_change",
      gameState: {
        inning: 5,
        halfInning: "TOP",
        outs: 1,
        score: { away: 2, home: 2 },
        runnersOn: { first: "away-batter" },
      },
      pitcherChange: {
        outgoingPitcherId: "home-pitcher",
        incomingPitcherId: "home-reliever",
        inheritedRunners: 1,
      },
    });

    const decisions = derive([nextPa], [watch, laterRemoval]);
    const keepDecision = decisions.find(
      (decision) => decision.decisionType === "leave_pitcher_in",
    );
    const removalDecision = decisions.find(
      (decision) => decision.decisionType === "pitching_change",
    );
    const [watchRecord] = deriveWatches([nextPa], [watch, laterRemoval]);

    expect(keepDecision).toMatchObject({
      decisionType: "leave_pitcher_in",
      resolvedAtEventId: "game-1_2",
      explanationMetadata: {
        recommendation: {
          response: "inferred_no_change",
          recommendationType: "consider_pitching_change",
        },
      },
    });
    expect(removalDecision?.explanationMetadata?.recommendation).toBeUndefined();
    expect(watchRecord).toMatchObject({
      status: "inferred_no_change",
      resolvedAtEventId: "game-1_2",
      resolutionDecisionType: "leave_pitcher_in",
    });
  });

  test("infers let-batter-hit when a shown recommendation is ignored and the batter hits", () => {
    const watch = createRecommendationWatch({
      eventId: "game-1_bp_rec_hitter",
      eventIndex: 1,
      recommendationType: "consider_pinch_hitter",
      trackedPlayerIds: ["away-batter", "away-bench-bat"],
      teamId: "away",
      managerId: MANAGERS.away,
      opponentTeamId: "home",
      suppressKey: "consider_pinch_hitter:away-batter:5:top",
      gameState: {
        inning: 5,
        halfInning: "TOP",
        outs: 1,
        score: { away: 2, home: 2 },
        runnersOn: {},
      },
    });
    const targetPa = createAtBat({
      eventId: "game-1_2",
      eventIndex: 2,
      inning: 5,
      halfInning: "TOP",
      batterId: "away-batter",
      batterName: "Away Batter",
      result: "1B",
      runnersAfter: {
        first: {
          runnerId: "away-batter",
          runnerName: "Away Batter",
          responsiblePitcherId: "home-pitcher",
        },
        second: null,
        third: null,
      },
      outsAfter: 1,
    });

    const [decision] = derive([targetPa], [watch]);

    expect(decision).toMatchObject({
      decisionType: "let_batter_hit",
      inferenceMethod: "passive",
      managerId: MANAGERS.away,
      teamId: "away",
      resolved: true,
      resolvedAtEventId: "game-1_2",
      explanationMetadata: {
        recommendation: {
          response: "inferred_no_change",
          recommendationType: "consider_pinch_hitter",
          suggestedPlayerId: "away-bench-bat",
        },
      },
    });
    expect(decision.managerWpa).toBeCloseTo((decision.rawWindowWpa ?? 0) * 0.2, 4);
  });

  test("resolves pinch-hit recommendations to the batter PA before later substitutions", () => {
    const watch = createRecommendationWatch({
      eventId: "game-1_bp_rec_hitter",
      eventIndex: 1,
      recommendationType: "consider_pinch_hitter",
      trackedPlayerIds: ["away-batter", "away-bench-bat"],
      teamId: "away",
      managerId: MANAGERS.away,
      opponentTeamId: "home",
      suppressKey: "consider_pinch_hitter:away-batter:5:top",
      gameState: {
        inning: 5,
        halfInning: "TOP",
        outs: 1,
        score: { away: 2, home: 2 },
        runnersOn: {},
      },
    });
    const targetPa = createAtBat({
      eventId: "game-1_2",
      eventIndex: 2,
      inning: 5,
      halfInning: "TOP",
      batterId: "away-batter",
      batterName: "Away Batter",
      result: "1B",
      runnersAfter: {
        first: {
          runnerId: "away-batter",
          runnerName: "Away Batter",
          responsiblePitcherId: "home-pitcher",
        },
        second: null,
        third: null,
      },
      outsAfter: 1,
    });
    const laterSub = createBetweenPlay({
      eventId: "game-1_bp_later_hitter_sub",
      eventIndex: 3,
      type: "substitution",
      pitcherChange: undefined,
      gameState: {
        inning: 5,
        halfInning: "TOP",
        outs: 1,
        score: { away: 2, home: 2 },
        runnersOn: { first: "away-batter" },
      },
      substitution: {
        subType: "pinch_hit",
        outPlayerId: "away-batter",
        inPlayerId: "away-later-bat",
      },
    });
    const replacementPa = createAtBat({
      eventId: "game-1_4",
      eventIndex: 4,
      inning: 5,
      halfInning: "TOP",
      batterId: "away-later-bat",
      batterName: "Away Later Bat",
      result: "FO",
      outsAfter: 2,
    });

    const decisions = derive([targetPa, replacementPa], [watch, laterSub]);
    const letHitDecision = decisions.find(
      (decision) => decision.decisionType === "let_batter_hit",
    );
    const laterSubDecision = decisions.find(
      (decision) => decision.decisionEventId === "game-1_bp_later_hitter_sub",
    );
    const [watchRecord] = deriveWatches(
      [targetPa, replacementPa],
      [watch, laterSub],
    );

    expect(letHitDecision).toMatchObject({
      decisionType: "let_batter_hit",
      resolvedAtEventId: "game-1_2",
      explanationMetadata: {
        recommendation: {
          response: "inferred_no_change",
          recommendationType: "consider_pinch_hitter",
        },
      },
    });
    expect(laterSubDecision?.explanationMetadata?.recommendation).toBeUndefined();
    expect(watchRecord).toMatchObject({
      status: "inferred_no_change",
      resolvedAtEventId: "game-1_2",
      resolutionDecisionType: "let_batter_hit",
    });
  });

  test("links substitution behavior to recommendation metadata without scoring accepted recommendation directly", () => {
    const watch = createRecommendationWatch({
      eventId: "game-1_bp_rec_hitter",
      eventIndex: 1,
      recommendationType: "consider_pinch_hitter",
      trackedPlayerIds: ["away-batter", "away-bench-bat"],
      teamId: "away",
      managerId: MANAGERS.away,
      opponentTeamId: "home",
      suppressKey: "consider_pinch_hitter:away-batter:5:top",
      gameState: {
        inning: 5,
        halfInning: "TOP",
        outs: 1,
        score: { away: 2, home: 2 },
        runnersOn: {},
      },
    });
    const pinchHit = createBetweenPlay({
      eventId: "game-1_bp_sub",
      eventIndex: 1.5,
      type: "substitution",
      pitcherChange: undefined,
      gameState: watch.gameState,
      substitution: {
        subType: "pinch_hit",
        outPlayerId: "away-batter",
        inPlayerId: "away-bench-alt",
      },
    });
    const pinchHitPa = createAtBat({
      eventId: "game-1_2",
      eventIndex: 2,
      inning: 5,
      batterId: "away-bench-alt",
      batterName: "Away Bench Alt",
      result: "HR",
      awayScoreAfter: 3,
      outsAfter: 1,
    });

    const decisions = derive([pinchHitPa], [watch, pinchHit]);
    const [watchRecord] = deriveWatches([pinchHitPa], [watch, pinchHit]);

    expect(decisions).toHaveLength(1);
    expect(decisions[0]).toMatchObject({
      decisionType: "pinch_hitter",
      decisionEventId: "game-1_bp_sub",
      resolved: true,
      explanationMetadata: {
        recommendation: {
          response: "action_taken_alternative",
          recommendationType: "consider_pinch_hitter",
          recommendedPlayerId: "away-batter",
          suggestedPlayerId: "away-bench-bat",
          actualPlayerId: "away-bench-alt",
          alternativePlayerId: "away-bench-alt",
        },
      },
    });
    expect(decisions[0].managerWpa).toBeCloseTo(
      (decisions[0].rawWindowWpa ?? 0) * 0.25,
      4,
    );
    expect(watchRecord).toMatchObject({
      status: "action_taken_alternative",
      resolvedAtEventId: "game-1_bp_sub",
      resolutionDecisionType: "pinch_hitter",
      actualPlayerId: "away-bench-alt",
      alternativePlayerId: "away-bench-alt",
    });
  });

  test("resolves defensive recommendations to the first fielding chance before later substitutions", () => {
    const watch = createRecommendationWatch({
      eventId: "game-1_bp_rec_defense",
      eventIndex: 1,
      recommendationType: "consider_defensive_replacement",
      trackedPlayerIds: ["home-defender", "home-glove"],
      teamId: "home",
      managerId: MANAGERS.home,
      opponentTeamId: "away",
      suppressKey: "consider_defensive_replacement:home-defender:5:top",
      gameState: {
        inning: 5,
        halfInning: "TOP",
        outs: 1,
        score: { away: 2, home: 2 },
        runnersOn: {},
      },
    });
    const fieldingPa = createAtBat({
      eventId: "game-1_2",
      eventIndex: 2,
      inning: 5,
      halfInning: "TOP",
      batterId: "away-batter",
      pitcherId: "home-pitcher",
      result: "GO",
      outsAfter: 2,
    });
    const keptDefenderFielding = createFieldingEvent({
      fieldingEventId: "game-1_fld_kept_defender",
      atBatEventId: "game-1_2",
      playerId: "home-defender",
      playerName: "Home Defender",
      teamId: "home",
      position: "SS",
      success: true,
    });
    const laterSub = createBetweenPlay({
      eventId: "game-1_bp_later_defensive_sub",
      eventIndex: 3,
      type: "substitution",
      pitcherChange: undefined,
      gameState: {
        inning: 5,
        halfInning: "TOP",
        outs: 2,
        score: { away: 2, home: 2 },
        runnersOn: {},
      },
      substitution: {
        subType: "defensive_replace",
        outPlayerId: "home-defender",
        inPlayerId: "home-glove",
        position: "SS",
      },
    });
    const laterPa = createAtBat({
      eventId: "game-1_4",
      eventIndex: 4,
      inning: 5,
      halfInning: "TOP",
      batterId: "away-next-batter",
      pitcherId: "home-pitcher",
      result: "GO",
      outs: 2,
      outsAfter: 3,
    });
    const replacementFielding = createFieldingEvent({
      fieldingEventId: "game-1_fld_replacement",
      atBatEventId: "game-1_4",
      playerId: "home-glove",
      playerName: "Home Glove",
      teamId: "home",
      position: "SS",
      success: true,
    });

    const decisions = derive(
      [fieldingPa, laterPa],
      [watch, laterSub],
      [keptDefenderFielding, replacementFielding],
    );
    const keepDecision = decisions.find(
      (decision) => decision.decisionType === "keep_defender_in",
    );
    const laterSubDecision = decisions.find(
      (decision) => decision.decisionEventId === "game-1_bp_later_defensive_sub",
    );
    const [watchRecord] = deriveWatches(
      [fieldingPa, laterPa],
      [watch, laterSub],
      [keptDefenderFielding, replacementFielding],
    );

    expect(keepDecision).toMatchObject({
      decisionType: "keep_defender_in",
      resolvedAtEventId: "game-1_fld_kept_defender",
      explanationMetadata: {
        recommendation: {
          response: "inferred_no_change",
          recommendationType: "consider_defensive_replacement",
        },
      },
    });
    expect(laterSubDecision?.explanationMetadata?.recommendation).toBeUndefined();
    expect(watchRecord).toMatchObject({
      status: "inferred_no_change",
      resolvedAtEventId: "game-1_fld_kept_defender",
      resolutionDecisionType: "keep_defender_in",
    });
  });

  test("does not resolve a recommendation as accepted when an unrelated substitution happens", () => {
    const watch = createRecommendationWatch({
      eventId: "game-1_bp_rec_hitter",
      eventIndex: 1,
      recommendationType: "consider_pinch_hitter",
      trackedPlayerIds: ["away-batter", "away-bench-bat"],
      teamId: "away",
      managerId: MANAGERS.away,
      opponentTeamId: "home",
      suppressKey: "consider_pinch_hitter:away-batter:5:top",
    });
    const unrelatedSub = createBetweenPlay({
      eventId: "game-1_bp_unrelated_sub",
      eventIndex: 1.5,
      type: "substitution",
      pitcherChange: undefined,
      gameState: watch.gameState,
      substitution: {
        subType: "pinch_run",
        outPlayerId: "away-runner",
        inPlayerId: "away-fast-runner",
      },
    });
    const targetPa = createAtBat({
      eventId: "game-1_2",
      eventIndex: 2,
      inning: 5,
      halfInning: "TOP",
      batterId: "away-batter",
      batterName: "Away Batter",
      outsAfter: 2,
    });

    const decisions = derive([targetPa], [watch, unrelatedSub]);
    const [watchRecord] = deriveWatches([targetPa], [watch, unrelatedSub]);

    expect(
      decisions.find(
        (decision) => decision.decisionEventId === "game-1_bp_unrelated_sub",
      )?.explanationMetadata?.recommendation,
    ).toBeUndefined();
    expect(
      decisions.some(
        (decision) =>
          decision.decisionType === "let_batter_hit" &&
          decision.explanationMetadata?.recommendation?.response ===
            "inferred_no_change",
      ),
    ).toBe(true);
    expect(watchRecord).toMatchObject({
      status: "inferred_no_change",
      resolvedAtEventId: "game-1_2",
      resolutionDecisionType: "let_batter_hit",
    });
  });

  test("keeps same-provenance prompted decisions from separate PA snapshots distinct", () => {
    const firstPrompt = createPromptedKeepCurrent({
      eventId: "game-1_bp_keep_1",
      eventIndex: 1,
      provenanceKey: "keep-home-pitcher",
      gameState: {
        inning: 5,
        halfInning: "TOP",
        outs: 0,
        score: { away: 2, home: 2 },
        runnersOn: {},
      },
    });
    const secondPrompt = createPromptedKeepCurrent({
      eventId: "game-1_bp_keep_2",
      eventIndex: 3,
      provenanceKey: "keep-home-pitcher",
      gameState: {
        inning: 5,
        halfInning: "TOP",
        outs: 1,
        score: { away: 2, home: 2 },
        runnersOn: {},
      },
    });

    const decisions = derive([], [firstPrompt, secondPrompt]).filter(
      (decision) => decision.decisionType === "leave_pitcher_in",
    );

    expect(decisions.map((decision) => decision.decisionEventId)).toEqual([
      "game-1_bp_keep_1",
      "game-1_bp_keep_2",
    ]);
  });

  test("ignores partial legacy prompted manager moments without tracked players", () => {
    const partialPrompt = createPromptedKeepCurrent({
      eventId: "game-1_bp_partial",
      eventIndex: 1,
    });
    partialPrompt.promptedManagerDecision = {
      ...partialPrompt.promptedManagerDecision!,
      trackedPlayerIds: undefined as never,
      involvedPlayerIds: undefined,
      playerId: undefined,
    };

    expect(derive([], [partialPrompt])).toEqual([]);
  });

  test("pinch-hit HR down big is positive through committed WPA v2 state", () => {
    const pinchHit = createBetweenPlay({
      eventId: "game-1_bp_hr",
      eventIndex: 10,
      type: "substitution",
      gameState: {
        inning: 2,
        halfInning: "BOTTOM",
        outs: 0,
        score: { away: 9, home: 0 },
        runnersOn: { first: "home-r1", second: "home-r2" },
      },
      pitcherChange: undefined,
      substitution: {
        subType: "pinch_hit",
        outPlayerId: "atl-belliard",
        outPlayerName: "Rafael Belliard",
        outPosition: "SS",
        inPlayerId: "atl-blauser",
        inPlayerName: "Jeff Blauser",
        inPosition: "SS",
      },
    });
    const homer = createAtBat({
      eventId: "game-1_11",
      eventIndex: 11,
      inning: 2,
      halfInning: "BOTTOM",
      outs: 0,
      batterId: "atl-blauser",
      batterName: "Jeff Blauser",
      result: "HR",
      runners: {
        first: {
          runnerId: "home-r1",
          runnerName: "Home Runner 1",
          responsiblePitcherId: "away-pitcher",
        },
        second: {
          runnerId: "home-r2",
          runnerName: "Home Runner 2",
          responsiblePitcherId: "away-pitcher",
        },
        third: null,
      },
      awayScore: 9,
      homeScore: 0,
      rbiCount: 3,
      runsScored: 3,
      awayScoreAfter: 9,
      homeScoreAfter: 3,
      runnersAfter: { first: null, second: null, third: null },
    });

    const [decision] = derive([homer], [pinchHit]);

    expect(decision).toMatchObject({
      decisionType: "pinch_hitter",
      managerId: MANAGERS.home,
      teamId: "home",
      resolved: true,
      resolvedAtEventId: "game-1_11",
      wpaModelVersion: WPA_MODEL_VERSION,
    });
    expect(decision.rawWindowWpa).toBeGreaterThan(0);
    expect(decision.managerWpa).toBeGreaterThan(0);
  });

  test("manager HR window uses committed score, outs, and runners after-state", () => {
    const pinchHit = createBetweenPlay({
      eventId: "game-1_bp_hr_committed",
      eventIndex: 10,
      type: "substitution",
      gameState: {
        inning: 2,
        halfInning: "BOTTOM",
        outs: 0,
        score: { away: 9, home: 0 },
        runnersOn: { first: "home-r1", second: "home-r2" },
      },
      pitcherChange: undefined,
      substitution: {
        subType: "pinch_hit",
        outPlayerId: "home-starter",
        inPlayerId: "home-ph",
      },
    });
    const committedHr = createAtBat({
      eventId: "game-1_11_committed",
      eventIndex: 11,
      inning: 2,
      halfInning: "BOTTOM",
      outs: 0,
      batterId: "home-ph",
      batterName: "Home PH",
      result: "HR",
      runners: {
        first: {
          runnerId: "home-r1",
          runnerName: "Home Runner 1",
          responsiblePitcherId: "away-pitcher",
        },
        second: {
          runnerId: "home-r2",
          runnerName: "Home Runner 2",
          responsiblePitcherId: "away-pitcher",
        },
        third: null,
      },
      awayScore: 9,
      homeScore: 0,
      rbiCount: 3,
      runsScored: 3,
      outsAfter: 1,
      awayScoreAfter: 9,
      homeScoreAfter: 1,
      runnersAfter: {
        first: {
          runnerId: "home-ph",
          runnerName: "Home PH",
          responsiblePitcherId: "away-pitcher",
        },
        second: null,
        third: null,
      },
    });
    const expected = calculateWPA(
      {
        inning: committedHr.inning,
        isTop: false,
        outs: committedHr.outs,
        bases: { first: true, second: true, third: false },
        homeScore: committedHr.homeScore,
        awayScore: committedHr.awayScore,
      },
      {
        outs: committedHr.outsAfter,
        bases: { first: true, second: false, third: false },
        homeScore: committedHr.homeScoreAfter,
        awayScore: committedHr.awayScoreAfter,
      },
    );

    const [decision] = derive([committedHr], [pinchHit]);

    expect(decision).toMatchObject({
      decisionType: "pinch_hitter",
      resolvedAtEventId: "game-1_11_committed",
    });
    expect(decision.rawWindowWpa).toBe(expected.homeDelta);
    expect(decision.managerWpa).toBeCloseTo(expected.homeDelta * 0.25, 4);
  });

  test("keeps pinch runners pending until a terminal runner event resolves", () => {
    const pinchRun = createBetweenPlay({
      eventId: "game-1_bp_1",
      eventIndex: 1,
      type: "substitution",
      pitcherChange: undefined,
      substitution: {
        subType: "pinch_run",
        outPlayerId: "away-runner",
        inPlayerId: "away-pr",
      },
    });
    const runnerScores = createAtBat({
      eventId: "game-1_2",
      eventIndex: 2,
      inning: 5,
      runnerOutcomes: [
        {
          runnerId: "away-pr",
          runnerName: "Away Pinch Runner",
          fromBase: "first",
          toBase: "home",
        },
      ],
      awayScoreAfter: 3,
    });

    expect(derive([], [pinchRun])[0]).toMatchObject({
      decisionType: "pinch_runner",
      resolved: false,
      managerWpa: undefined,
      resolutionWindow: {
        status: "pending",
        expectedEndpoint: "runner_terminal",
        trackedRunnerIds: ["away-pr"],
      },
    });

    const resolved = derive([runnerScores], [pinchRun])[0];
    expect(resolved).toMatchObject({
      decisionType: "pinch_runner",
      resolved: true,
      resolvedAtEventId: "game-1_2",
    });
  });

  test("keeps defensive substitutions pending, then resolves on first fielding event or explicit compatibility fallback", () => {
    const defensiveSub = createBetweenPlay({
      eventId: "game-1_bp_1",
      eventIndex: 1,
      type: "substitution",
      pitcherChange: undefined,
      substitution: {
        subType: "defensive_replacement",
        outPlayerId: "home-cf",
        inPlayerId: "home-def-sub",
      },
    });
    const flyOut = createAtBat({
      eventId: "game-1_2",
      eventIndex: 2,
      inning: 5,
      result: "FO",
      outs: 1,
      outsAfter: 2,
    });
    const fielding = createFieldingEvent({
      fieldingEventId: "game-1_fld_1",
      atBatEventId: "game-1_2",
      playerId: "home-def-sub",
    });
    const halfEndingOut = createAtBat({
      eventId: "game-1_3",
      eventIndex: 3,
      inning: 5,
      result: "GO",
      outs: 2,
      outsAfter: 3,
    });

    expect(derive([], [defensiveSub])[0]).toMatchObject({
      decisionType: "defensive_sub",
      resolved: false,
      resolutionWindow: {
        status: "pending",
        expectedEndpoint: "first_fielding_event",
        trackedPlayerIds: expect.arrayContaining(["home-def-sub"]),
      },
    });

    const fieldingResolved = derive([flyOut], [defensiveSub], [fielding])[0];
    expect(fieldingResolved).toMatchObject({
      decisionType: "defensive_sub",
      resolved: true,
      resolvedAtEventId: "game-1_fld_1",
    });
    expect(fieldingResolved.linkedEventIds).toEqual(
      expect.arrayContaining(["game-1_bp_1", "game-1_fld_1", "game-1_2"]),
    );

    const inningEndResolved = derive([flyOut, halfEndingOut], [defensiveSub])[0];
    expect(inningEndResolved).toMatchObject({
      decisionType: "defensive_sub",
      resolved: true,
      resolvedAtEventId: "game-1_3",
    });
  });

  test("preserves position-change half-inning fallback as an explicit first-fielding compatibility policy", () => {
    const positionChange = createBetweenPlay({
      eventId: "game-1_bp_position",
      eventIndex: 1,
      type: "position_change",
      pitcherChange: undefined,
      substitution: {
        subType: "position_change",
        outPlayerId: "home-fielder",
        inPlayerId: "home-fielder",
        previousPosition: "LF",
        inPosition: "CF",
      },
    });
    const flyOut = createAtBat({
      eventId: "game-1_2",
      eventIndex: 2,
      inning: 5,
      result: "FO",
      outs: 1,
      outsAfter: 2,
    });
    const halfEndingOut = createAtBat({
      eventId: "game-1_3",
      eventIndex: 3,
      inning: 5,
      result: "GO",
      outs: 2,
      outsAfter: 3,
    });

    const [decision] = derive([flyOut, halfEndingOut], [positionChange]);

    expect(decision).toMatchObject({
      decisionType: "position_change",
      resolved: true,
      resolvedAtEventId: "game-1_3",
      resolutionWindow: {
        status: "resolved",
        expectedEndpoint: "first_fielding_event",
        trackedPlayerIds: expect.arrayContaining(["home-fielder"]),
      },
    });
  });

  test("does not derive defensive alignment moments as scoring Manager WPA records", () => {
    const alignment = createBetweenPlay({
      eventId: "game-1_bp_align",
      eventIndex: 1,
      type: "manager_moment",
      pitcherChange: undefined,
      managerMoment: {
        leverageIndex: 1.9,
        decisionType: "defensive_alignment",
        context: "No doubles defense",
      },
    });
    const flyOut = createAtBat({
      eventId: "game-1_2",
      eventIndex: 2,
      inning: 5,
      result: "FO",
      outs: 1,
      outsAfter: 2,
    });
    const fielding = createFieldingEvent({
      fieldingEventId: "game-1_fld_align",
      atBatEventId: "game-1_2",
      playerId: "home-cf",
    });
    const halfEndingOut = createAtBat({
      eventId: "game-1_3",
      eventIndex: 3,
      inning: 5,
      result: "K",
      outs: 2,
      outsAfter: 3,
    });

    expect(derive([], [alignment])).toEqual([]);
    expect(derive([flyOut, halfEndingOut], [alignment])).toEqual([]);
    expect(derive([flyOut], [alignment], [fielding])).toEqual([]);
  });

  test("continues resolving same-event decisions immediately", () => {
    const bunt = createAtBat({
      eventId: "game-1_1",
      eventIndex: 1,
      enrichment: { exitType: "bunt" },
    });
    const steal = createBetweenPlay({
      eventId: "game-1_bp_2",
      eventIndex: 2,
      type: "stolen_base",
      pitcherChange: undefined,
      runnerAction: {
        runnerId: "away-r1",
        runnerName: "Away Runner",
        fromBase: 1,
        toBase: 2,
        outcome: "safe",
        reason: "stolen_base",
      },
    });

    const decisions = derive([bunt], [steal]);

    expect(decisions.find((decision) => decision.decisionType === "bunt_call")).toMatchObject({
      resolved: true,
      resolvedAtEventId: "game-1_1",
      resolutionWindow: {
        status: "resolved",
        expectedEndpoint: "same_event",
      },
    });
    expect(decisions.find((decision) => decision.decisionType === "steal_send")).toMatchObject({
      resolved: true,
      resolvedAtEventId: "game-1_bp_2",
      resolutionWindow: {
        status: "resolved",
        expectedEndpoint: "same_event",
      },
    });
  });
});
