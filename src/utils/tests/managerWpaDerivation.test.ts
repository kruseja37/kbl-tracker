import { describe, expect, test } from "vitest";

import { calculateWPA } from "../../engines/wpaCalculator";
import type { AtBatEvent, BetweenPlayEvent, FieldingEvent } from "../eventLog";
import {
  deriveManagerDecisionRecords,
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

  test("keeps IBB pending until the next batter PA resolves the window", () => {
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
    const nextPa = createAtBat({
      eventId: "game-1_2",
      eventIndex: 2,
      inning: 4,
      batterId: "away-next-batter",
      batterName: "Away Next Batter",
      runners: ibb.runnersAfter,
      result: "1B",
      runsScored: ["away-batter"],
      runnersAfter: { first: null, second: null, third: null },
      awayScoreAfter: 3,
      outsAfter: 1,
    });

    const pending = derive([ibb])[0];
    expect(pending).toMatchObject({
      decisionType: "intentional_walk",
      resolved: false,
      resolvedAtEventId: undefined,
      resolutionWindow: {
        status: "pending",
        expectedEndpoint: "next_pa",
      },
    });
    expect(pending.managerWpa).toBeUndefined();

    const resolved = derive([ibb, nextPa])[0];
    expect(resolved).toMatchObject({
      decisionType: "intentional_walk",
      resolved: true,
      resolvedAtEventId: "game-1_2",
      resolutionWindow: {
        status: "resolved",
        expectedEndpoint: "next_pa",
        maxEventIndex: 2,
      },
    });
    expect(resolved.linkedEventIds).toEqual(
      expect.arrayContaining(["game-1_1", "game-1_2"]),
    );
    expect(resolved.managerWpa).toEqual(expect.any(Number));
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
      wpaModelVersion: "kbl-wpa-v2",
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

  test("keeps defensive substitutions pending, then resolves on first fielding event or half-inning end", () => {
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
