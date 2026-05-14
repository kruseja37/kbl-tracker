import "fake-indexeddb/auto";
import { describe, expect, test } from "vitest";

import type { AtBatEvent, BetweenPlayEvent, FieldingEvent } from "../eventLog";
import type {
  ManagerDeploymentRole,
  OptimalLineupSnapshot,
} from "../../types/managerWpa";
import { WPA_MODEL_VERSION } from "../../engines/wpaV2";
import {
  aggregateKblWpaCredits,
  deriveKblWpaCredits,
} from "../kblWpaAttribution";
import {
  logAtBatEvent,
  updateAtBatEvent,
} from "../eventLog";
import {
  calculateManagerDeploymentWpa,
  deriveCommittedManagerDecisionState,
  deriveManagerLineupDeltaRecords,
  MANAGER_DEPLOYMENT_CAP_BY_ROLE,
  MANAGER_DEPLOYMENT_SHARE_BY_ROLE,
  refreshCurrentGameManagerDecisionState,
} from "../managerWpaGameState";
import {
  archiveCompletedGame,
  clearCurrentGame,
  getCompletedGameById,
  loadCurrentGame,
  saveCurrentGame,
  type PersistedGameState,
} from "../gameStorage";
import { rankPlayersOfTheGame } from "../playersOfTheGame";

function createAtBat(overrides: Partial<AtBatEvent> = {}): AtBatEvent {
  const halfInning = overrides.halfInning ?? "TOP";
  const isTop = halfInning === "TOP";

  return {
    eventId: overrides.eventId ?? `game-1_${overrides.eventIndex ?? 1}`,
    gameId: "game-1",
    eventIndex: overrides.eventIndex ?? 1,
    timestamp: overrides.timestamp ?? 1,
    batterId: isTop ? "away-batter" : "home-batter",
    batterName: isTop ? "Away Batter" : "Home Batter",
    batterTeamId: isTop ? "away" : "home",
    pitcherId: isTop ? "home-pitcher" : "away-pitcher",
    pitcherName: isTop ? "Home Pitcher" : "Away Pitcher",
    pitcherTeamId: isTop ? "home" : "away",
    result: "GO",
    rbiCount: 0,
    runsScored: 0,
    inning: 6,
    halfInning,
    outs: 1,
    runners: { first: null, second: null, third: null },
    awayScore: 2,
    homeScore: 2,
    outsAfter: 2,
    runnersAfter: { first: null, second: null, third: null },
    awayScoreAfter: 2,
    homeScoreAfter: 2,
    leverageIndex: 1.3,
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
  return {
    eventId: overrides.eventId ?? `game-1_bp_${overrides.eventIndex ?? 1}`,
    gameId: "game-1",
    eventIndex: overrides.eventIndex ?? 1,
    timestamp: overrides.timestamp ?? 1,
    type: "substitution",
    gameState: {
      inning: 6,
      halfInning: "TOP",
      outs: 1,
      score: { away: 2, home: 2 },
      runnersOn: {},
    },
    substitution: {
      subType: "pinch_hit",
      outPlayerId: "away-batter",
      inPlayerId: "away-bench",
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
  const decisionType = overrides.decisionType ?? "let_batter_hit";
  const trackedPlayerId =
    overrides.trackedPlayerId ??
    (decisionType === "leave_pitcher_in" ? "home-pitcher" : "away-batter");
  const teamId = overrides.teamId ?? (decisionType === "leave_pitcher_in" ? "home" : "away");
  const managerId =
    overrides.managerId ?? (teamId === "home" ? "home-manager" : "away-manager");
  const opponentTeamId =
    overrides.opponentTeamId ?? (teamId === "home" ? "away" : "home");

  return createBetweenPlay({
    ...overrides,
    type: "manager_moment",
    substitution: undefined,
    managerMoment: {
      leverageIndex: 2.1,
      decisionType,
      context: overrides.provenanceKey ?? `${decisionType}:prompt`,
    },
    promptedManagerDecision: {
      decisionType,
      action: decisionType === "leave_pitcher_in" ? "keep_pitcher" : "let_batter_hit",
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

function derive(
  atBatEvents: AtBatEvent[] = [],
  betweenPlayEvents: BetweenPlayEvent[] = [],
  options: {
    fieldingEvents?: FieldingEvent[];
    gameEnded?: boolean;
  } = {},
) {
  return deriveCommittedManagerDecisionState({
    gameId: "game-1",
    atBatEvents,
    betweenPlayEvents,
    fieldingEvents: options.fieldingEvents,
    awayTeamId: "away",
    homeTeamId: "home",
    awayManagerId: "away-manager",
    homeManagerId: "home-manager",
    totalInnings: 9,
    gameEnded: options.gameEnded,
  });
}

const startingLineups = {
  away: [
    { playerId: "away-starter-1", playerName: "Away Starter 1", position: "SS", battingOrder: 1 },
    { playerId: "away-starter-2", playerName: "Away Starter 2", position: "CF", battingOrder: 2 },
    { playerId: "away-starter-3", playerName: "Away Starter 3", position: "DH", battingOrder: 3 },
    { playerId: "away-starter-4", playerName: "Away Starter 4", position: "1B", battingOrder: 4 },
  ],
  home: [
    { playerId: "home-starter-1", playerName: "Home Starter 1", position: "2B", battingOrder: 1 },
    { playerId: "home-starter-2", playerName: "Home Starter 2", position: "RF", battingOrder: 2 },
  ],
};

function createLineupSnapshot(input: {
  teamId: string;
  snapshotId: string;
  slots: Array<{
    playerId: string;
    playerName: string;
    battingOrderSlot: number;
    defensivePosition: string;
    projectedSlotKblWpa: number;
  }>;
}): OptimalLineupSnapshot {
  return {
    snapshotId: input.snapshotId,
    teamId: input.teamId,
    mode: "exhibition",
    opposingPitcherHand: "R",
    algorithmVersion: "test-optimal-v2",
    generatedAt: 1,
    generatedFrom: "game_lock",
    sourceConfidence: "engine_calculated",
    dhEnabled: false,
    slots: input.slots.map((slot) => ({
      ...slot,
      projectedValueScore: 60,
      positionalFitScore: 1,
      confidence: "medium" as const,
    })),
    projectedTeamLineupKblWpa: input.slots.reduce(
      (sum, slot) => sum + slot.projectedSlotKblWpa,
      0,
    ),
    confidence: "medium",
  };
}

function createSparseKblWpaEvent(input: {
  eventId: string;
  playerId: string;
  playerName?: string;
  teamId: string;
  wpa: number;
}): AtBatEvent {
  return {
    eventId: input.eventId,
    gameId: "game-1",
    eventIndex: Number(input.eventId.replace(/\D+/g, "")) || 1,
    timestamp: 1,
    batterId: input.playerId,
    batterName: input.playerName ?? input.playerId,
    batterTeamId: input.teamId,
    wpa: input.wpa,
  } as AtBatEvent;
}

function deriveLineupDeltas(atBatEvents: AtBatEvent[]) {
  return deriveManagerLineupDeltaRecords({
    gameId: "game-1",
    atBatEvents,
    betweenPlayEvents: [],
    fieldingEvents: [],
    startingLineups,
    awayTeamId: "away",
    homeTeamId: "home",
    awayManagerId: "away-manager",
    homeManagerId: "home-manager",
    totalInnings: 9,
    gameEnded: true,
  });
}

function defaultLineupDeltaSnapshots(): {
  optimalLineupSnapshots: { away: OptimalLineupSnapshot; home: OptimalLineupSnapshot };
  chosenLineupSnapshots: { away: OptimalLineupSnapshot; home: OptimalLineupSnapshot };
} {
  return {
    optimalLineupSnapshots: {
      away: createLineupSnapshot({
        teamId: "away",
        snapshotId: "away-optimal-default",
        slots: startingLineups.away.map((starter) => ({
          playerId: `optimal-${starter.playerId}`,
          playerName: `Optimal ${starter.playerName}`,
          battingOrderSlot: starter.battingOrder,
          defensivePosition: starter.position,
          projectedSlotKblWpa: 0,
        })),
      }),
      home: createLineupSnapshot({
        teamId: "home",
        snapshotId: "home-optimal-default",
        slots: startingLineups.home.map((starter) => ({
          playerId: `optimal-${starter.playerId}`,
          playerName: `Optimal ${starter.playerName}`,
          battingOrderSlot: starter.battingOrder,
          defensivePosition: starter.position,
          projectedSlotKblWpa: 0,
        })),
      }),
    },
    chosenLineupSnapshots: {
      away: createLineupSnapshot({
        teamId: "away",
        snapshotId: "away-chosen-default",
        slots: startingLineups.away.map((starter) => ({
          playerId: starter.playerId,
          playerName: starter.playerName,
          battingOrderSlot: starter.battingOrder,
          defensivePosition: starter.position,
          projectedSlotKblWpa: 0,
        })),
      }),
      home: createLineupSnapshot({
        teamId: "home",
        snapshotId: "home-chosen-default",
        slots: startingLineups.home.map((starter) => ({
          playerId: starter.playerId,
          playerName: starter.playerName,
          battingOrderSlot: starter.battingOrder,
          defensivePosition: starter.position,
          projectedSlotKblWpa: 0,
        })),
      }),
    },
  };
}

function deriveLineupDeltasWithSnapshots(atBatEvents: AtBatEvent[]) {
  return deriveManagerLineupDeltaRecords({
    gameId: "game-1",
    atBatEvents,
    betweenPlayEvents: [],
    fieldingEvents: [],
    startingLineups,
    ...defaultLineupDeltaSnapshots(),
    awayTeamId: "away",
    homeTeamId: "home",
    awayManagerId: "away-manager",
    homeManagerId: "home-manager",
    totalInnings: 9,
    gameEnded: true,
  });
}

function createPersistedGameState(gameId: string): PersistedGameState {
  return {
    id: "current",
    gameId,
    savedAt: Date.now(),
    inning: 1,
    halfInning: "TOP",
    outs: 0,
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
  } as PersistedGameState;
}

describe("committed manager WPA game state", () => {
  test("recomputes from committed contact-quality bunt changes and removes stale decisions", () => {
    const noBunt = createAtBat();
    const committedBunt = createAtBat({
      enrichment: { exitType: "bunt" },
    });
    const removedBunt = createAtBat({
      enrichment: {},
    });

    expect(derive([noBunt]).managerDecisions).toEqual([]);

    const buntState = derive([committedBunt]);
    expect(buntState.managerLineupDeltas).toEqual([]);
    expect(buntState.managerDecisions).toHaveLength(1);
    expect(buntState.managerDecisions[0]).toMatchObject({
      decisionType: "bunt_call",
      managerId: "away-manager",
      teamId: "away",
      decisionSource: "play_log_enhancement",
    });

    expect(derive([removedBunt]).managerDecisions).toEqual([]);
  });

  test("recomputes bunt versus squeeze when the R3 home attempt changes", () => {
    const squeeze = createAtBat({
      runners: {
        first: null,
        second: null,
        third: {
          runnerId: "away-r3",
          runnerName: "Away R3",
          responsiblePitcherId: "home-pitcher",
        },
      },
      enrichment: { exitType: "bunt" },
      runnerOutcomes: [
        {
          runnerId: "away-r3",
          runnerName: "Away R3",
          fromBase: "third",
          toBase: "home",
        },
      ],
    });
    const bunt = createAtBat({
      ...squeeze,
      runnerOutcomes: [
        {
          runnerId: "away-r3",
          runnerName: "Away R3",
          fromBase: "third",
          toBase: "third",
        },
      ],
    });

    expect(derive([squeeze]).managerDecisions[0]).toMatchObject({
      decisionType: "squeeze_call",
    });
    expect(derive([bunt]).managerDecisions[0]).toMatchObject({
      decisionType: "bunt_call",
    });
  });

  test("recomputes runner-choice, manager-send, and manager-hold edits from committed outcomes", () => {
    const runnerChoice = createAtBat({
      runnerOutcomes: [
        {
          runnerId: "away-r1",
          runnerName: "Away R1",
          fromBase: "first",
          toBase: "out",
          isOutAdvancing: true,
          managerIntent: "runner_choice",
        },
      ],
    });
    const managerSend = createAtBat({
      ...runnerChoice,
      runnerOutcomes: [
        {
          runnerId: "away-r1",
          runnerName: "Away R1",
          fromBase: "first",
          toBase: "out",
          isOutAdvancing: true,
          managerIntent: "manager_send",
          managerDecisionSource: "play_log_enhancement",
        },
      ],
    });
    const managerHold = createAtBat({
      ...runnerChoice,
      runnerOutcomes: [
        {
          runnerId: "away-r1",
          runnerName: "Away R1",
          fromBase: "first",
          toBase: "first",
          managerIntent: "manager_hold",
          managerDecisionSource: "play_log_enhancement",
        },
      ],
    });

    expect(derive([runnerChoice]).managerDecisions).toEqual([]);
    expect(derive([managerSend]).managerDecisions).toHaveLength(1);
    expect(derive([managerSend]).managerDecisions[0]).toMatchObject({
      decisionType: "out_advancing_send",
      managerId: "away-manager",
      teamId: "away",
    });
    expect(derive([runnerChoice]).managerDecisions).toEqual([]);
    expect(derive([managerHold]).managerDecisions[0]).toMatchObject({
      decisionType: "runner_hold",
      managerId: "away-manager",
      teamId: "away",
    });
  });

  test("derives one hit-and-run decision per plate appearance and suppresses duplicate manager-send", () => {
    const hitAndRun = createAtBat({
      result: "1B",
      runnerOutcomes: [
        {
          runnerId: "away-r1",
          runnerName: "Away R1",
          fromBase: "first",
          toBase: "third",
          managerRunPlay: "hit_and_run",
          managerIntent: "manager_send",
          managerDecisionSource: "play_log_enhancement",
        },
        {
          runnerId: "away-r2",
          runnerName: "Away R2",
          fromBase: "second",
          toBase: "home",
          managerRunPlay: "hit_and_run",
          managerDecisionSource: "play_log_enhancement",
        },
      ],
    });

    const decisions = derive([hitAndRun]).managerDecisions;

    expect(decisions).toHaveLength(1);
    expect(decisions[0]).toMatchObject({
      decisionType: "hit_and_run",
      managerId: "away-manager",
      teamId: "away",
      managerShare: 0.35,
      decisionSource: "play_log_enhancement",
      resolved: true,
    });
    expect(decisions[0].involvedPlayerIds).toEqual([
      "away-batter",
      "away-r1",
      "away-r2",
    ]);
  });

  test.each([
    ["second"],
    ["third"],
    ["home"],
    ["out"],
  ] as const)("scores hit-and-run enrichment when the runner ends at %s", (toBase) => {
    const event = createAtBat({
      result: "1B",
      runnerOutcomes: [
        {
          runnerId: "away-r1",
          runnerName: "Away R1",
          fromBase: "first",
          toBase,
          managerRunPlay: "hit_and_run",
          managerDecisionSource: "play_log_enhancement",
        },
      ],
    });

    expect(derive([event]).managerDecisions[0]).toMatchObject({
      decisionType: "hit_and_run",
      teamId: "away",
    });
  });

  test.each([
    ["pinch_hitter_remaining", 0.15, 0.1],
    ["pinch_runner", 0.2, 0.125],
    ["pitcher", 0.15, 0.2],
    ["defensive_position", 0.2, 0.15],
    ["kept_position_player_in", 0.15, 0.15],
    ["kept_pitcher_in", 0.15, 0.15],
    ["kept_in", 0.15, 0.15],
    ["manual_deployment", 0.1, 0.1],
  ] satisfies Array<[ManagerDeploymentRole, number, number]>)(
    "uses the spec deployment share and cap for %s",
    (role, expectedShare, expectedCap) => {
      expect(MANAGER_DEPLOYMENT_SHARE_BY_ROLE[role]).toBe(expectedShare);
      expect(MANAGER_DEPLOYMENT_CAP_BY_ROLE[role]).toBe(expectedCap);

      expect(calculateManagerDeploymentWpa(role, 2)).toMatchObject({
        managerShare: expectedShare,
        cap: expectedCap,
        managerDeploymentWpa: expectedCap,
      });
      expect(calculateManagerDeploymentWpa(role, -2)).toMatchObject({
        managerShare: expectedShare,
        cap: expectedCap,
        managerDeploymentWpa: -expectedCap,
      });
    },
  );

  test("opens a deployment stint for a pinch hitter and excludes the tactical PA", () => {
    const pinchHit = createBetweenPlay({
      eventId: "game-1_bp_1",
      eventIndex: 1,
      substitution: {
        subType: "pinch_hit",
        outPlayerId: "away-starter",
        inPlayerId: "away-bench",
        inPlayerName: "Away Bench",
      },
    });
    const tacticalPa = createAtBat({
      eventId: "game-1_2",
      eventIndex: 2,
      batterId: "away-bench",
      batterName: "Away Bench",
      batterTeamId: "away",
      wpa: 0.5,
    });
    const laterPa = createAtBat({
      eventId: "game-1_3",
      eventIndex: 3,
      batterId: "away-bench",
      batterName: "Away Bench",
      batterTeamId: "away",
      wpa: 0.2,
    });

    const stint = derive([tacticalPa, laterPa], [pinchHit], {
      gameEnded: true,
    }).managerDeploymentStints[0];

    expect(stint).toMatchObject({
      deploymentRole: "pinch_hitter_remaining",
      playerId: "away-bench",
      managerId: "away-manager",
      teamId: "away",
      sourceEventId: "game-1_bp_1",
      openedAtEventIndex: 2,
      tacticalExclusionEventIds: ["game-1_2"],
      linkedEventIds: ["game-1_3"],
      rawLinkedWpa: 0.2,
      managerShare: 0.15,
      managerDeploymentWpa: 0.03,
    });
  });

  test("opens a pitching deployment stint only after the first PA faced", () => {
    const pitchingChange = createBetweenPlay({
      eventId: "game-1_bp_pitching",
      eventIndex: 1,
      type: "pitcher_change",
      substitution: undefined,
      pitcherChange: {
        outgoingPitcherId: "home-starter",
        incomingPitcherId: "home-rp",
        incomingPitcherName: "Home RP",
        inheritedRunners: 0,
      },
    });
    const tacticalPa = createAtBat({
      eventId: "game-1_2",
      eventIndex: 2,
      pitcherId: "home-rp",
      pitcherName: "Home RP",
      pitcherTeamId: "home",
      wpaModelVersion: WPA_MODEL_VERSION,
      wpa: 0.4,
    });
    const laterPa = createAtBat({
      eventId: "game-1_3",
      eventIndex: 3,
      pitcherId: "home-rp",
      pitcherName: "Home RP",
      pitcherTeamId: "home",
      wpaModelVersion: WPA_MODEL_VERSION,
      wpa: -0.2,
    });

    const stint = derive([tacticalPa, laterPa], [pitchingChange], {
      gameEnded: true,
    })
      .managerDeploymentStints[0];

    expect(stint).toMatchObject({
      deploymentRole: "pitcher",
      playerId: "home-rp",
      managerId: "home-manager",
      teamId: "home",
      sourceEventId: "game-1_bp_pitching",
      openedAtEventIndex: 2,
      tacticalExclusionEventIds: ["game-1_2"],
      linkedEventIds: ["game-1_3"],
    });
  });

  test("opens a defensive-sub deployment stint only after the first fielding endpoint", () => {
    const defensiveSub = createBetweenPlay({
      eventId: "game-1_bp_defense",
      eventIndex: 1,
      type: "substitution",
      substitution: {
        subType: "defensive_replacement",
        outPlayerId: "home-left-old",
        outPlayerName: "Home Left Old",
        inPlayerId: "home-glove",
        inPlayerName: "Home Glove",
        inPosition: "LF",
      },
    });
    const tacticalFieldingPlay = createAtBat({
      eventId: "game-1_2",
      eventIndex: 2,
      wpaModelVersion: WPA_MODEL_VERSION,
      wpa: -0.2,
    });
    const laterFieldingPlay = createAtBat({
      eventId: "game-1_3",
      eventIndex: 3,
      wpaModelVersion: WPA_MODEL_VERSION,
      wpa: -0.1,
    });
    const fieldingEvents: FieldingEvent[] = [
      {
        fieldingEventId: "fielding-defense-1",
        gameId: "game-1",
        atBatEventId: "game-1_2",
        sequence: 1,
        playerId: "home-glove",
        playerName: "Home Glove",
        position: "LF",
        teamId: "home",
        playType: "putout",
        difficulty: "routine",
        ballInPlay: { trajectory: "fly", zone: 7 },
        success: true,
        runsPreventedOrAllowed: 0,
      },
      {
        fieldingEventId: "fielding-defense-2",
        gameId: "game-1",
        atBatEventId: "game-1_3",
        sequence: 1,
        playerId: "home-glove",
        playerName: "Home Glove",
        position: "LF",
        teamId: "home",
        playType: "putout",
        difficulty: "routine",
        ballInPlay: { trajectory: "fly", zone: 7 },
        success: true,
        runsPreventedOrAllowed: 0,
      },
    ];

    const stint = deriveCommittedManagerDecisionState({
      gameId: "game-1",
      atBatEvents: [tacticalFieldingPlay, laterFieldingPlay],
      betweenPlayEvents: [defensiveSub],
      fieldingEvents,
      awayTeamId: "away",
      homeTeamId: "home",
      awayManagerId: "away-manager",
      homeManagerId: "home-manager",
      totalInnings: 9,
      gameEnded: true,
    }).managerDeploymentStints[0];

    expect(stint).toMatchObject({
      deploymentRole: "defensive_position",
      playerId: "home-glove",
      managerId: "home-manager",
      teamId: "home",
      sourceEventId: "game-1_bp_defense",
      openedAtEventIndex: 2,
      tacticalExclusionEventIds: ["game-1_2"],
      linkedEventIds: ["game-1_3"],
    });
  });

  test("opens typed let-batter-hit deployment after the tactical PA and applies role weights", () => {
    const keepBatter = createPromptedKeepCurrent({
      eventId: "game-1_bp_keep_batter",
      eventIndex: 1,
      decisionType: "let_batter_hit",
      trackedPlayerId: "away-batter",
      teamId: "away",
      managerId: "away-manager",
      opponentTeamId: "home",
      provenanceKey: "let-away-batter-hit",
    });
    const tacticalPa = createAtBat({
      eventId: "game-1_2",
      eventIndex: 2,
      batterId: "away-batter",
      batterName: "Away Batter",
      batterTeamId: "away",
      wpa: 0.5,
    });
    const laterBattingPa = createAtBat({
      eventId: "game-1_3",
      eventIndex: 3,
      batterId: "away-batter",
      batterName: "Away Batter",
      batterTeamId: "away",
      wpa: 0.2,
    });
    const laterBaserunningPa = createAtBat({
      eventId: "game-1_4",
      eventIndex: 4,
      result: "1B",
      batterId: "away-other",
      batterName: "Away Other",
      batterTeamId: "away",
      runners: {
        first: {
          runnerId: "away-batter",
          runnerName: "Away Batter",
          responsiblePitcherId: "home-pitcher",
        },
        second: null,
        third: null,
      },
      runnerOutcomes: [
        {
          runnerId: "away-batter",
          runnerName: "Away Batter",
          fromBase: "first",
          toBase: "home",
        },
      ],
      runsScored: ["away-batter"],
      awayScoreAfter: 3,
      wpaModelVersion: WPA_MODEL_VERSION,
    });
    const laterFieldingPa = createAtBat({
      eventId: "game-1_5",
      eventIndex: 5,
      halfInning: "BOTTOM",
      result: "GO",
      batterId: "home-batter",
      batterName: "Home Batter",
      batterTeamId: "home",
      pitcherId: "away-pitcher",
      pitcherName: "Away Pitcher",
      pitcherTeamId: "away",
      wpaModelVersion: WPA_MODEL_VERSION,
    });
    const fieldingEvents: FieldingEvent[] = [
      {
        fieldingEventId: "fielding-kept-position",
        gameId: "game-1",
        atBatEventId: "game-1_5",
        sequence: 1,
        playerId: "away-batter",
        playerName: "Away Batter",
        position: "SS",
        teamId: "away",
        playType: "putout",
        difficulty: "routine",
        ballInPlay: { trajectory: "ground", zone: 6 },
        success: true,
        runsPreventedOrAllowed: 0,
      },
    ];

    const atBatEvents = [
      tacticalPa,
      laterBattingPa,
      laterBaserunningPa,
      laterFieldingPa,
    ];
    const stint = derive(atBatEvents, [keepBatter], {
      fieldingEvents,
      gameEnded: true,
    }).managerDeploymentStints[0];
    const credits = deriveKblWpaCredits({
      atBatEvents,
      fieldingEvents,
      awayTeamId: "away",
      homeTeamId: "home",
      totalInnings: 9,
    });
    const battingWpa = credits
      .filter(
        (credit) =>
          credit.playerId === "away-batter" &&
          credit.teamId === "away" &&
          credit.role === "batting" &&
          credit.eventId === "game-1_3",
      )
      .reduce((sum, credit) => sum + credit.wpa, 0);
    const baserunningWpa = credits
      .filter(
        (credit) =>
          credit.playerId === "away-batter" &&
          credit.teamId === "away" &&
          credit.role === "baserunning" &&
          credit.eventId === "game-1_4",
      )
      .reduce((sum, credit) => sum + credit.wpa, 0);
    const fieldingWpa = credits
      .filter(
        (credit) =>
          credit.playerId === "away-batter" &&
          credit.teamId === "away" &&
          credit.role === "fielding" &&
          credit.eventId === "game-1_5",
      )
      .reduce((sum, credit) => sum + credit.wpa, 0);
    const expectedRawLinkedWpa =
      Math.round((battingWpa + baserunningWpa + fieldingWpa * 0.75) * 10000) /
      10000;

    expect(stint).toMatchObject({
      deploymentRole: "kept_position_player_in",
      playerId: "away-batter",
      managerId: "away-manager",
      teamId: "away",
      sourceEventId: "game-1_bp_keep_batter",
      openedAtEventIndex: 2,
      tacticalExclusionEventIds: ["game-1_2"],
      closeReason: "game_end",
      managerShare: 0.15,
    });
    expect(stint.linkedEventIds).toEqual([
      "game-1_3",
      "game-1_4",
      "game-1_5",
    ]);
    expect(stint.linkedOutcomes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          eventId: "game-1_3",
          role: "batting",
          weight: 1,
        }),
        expect.objectContaining({
          eventId: "game-1_4",
          role: "baserunning",
          weight: 1,
        }),
        expect.objectContaining({
          eventId: "game-1_5",
          role: "fielding",
          weight: 0.75,
        }),
      ]),
    );
    expect(battingWpa).not.toBe(0);
    expect(baserunningWpa).not.toBe(0);
    expect(fieldingWpa).not.toBe(0);
    expect(stint.rawLinkedWpa).toBeCloseTo(expectedRawLinkedWpa, 5);
    expect(stint.managerDeploymentWpa).toBeCloseTo(
      calculateManagerDeploymentWpa(
        "kept_position_player_in",
        expectedRawLinkedWpa,
      ).managerDeploymentWpa,
      5,
    );
  });

  test("does not stack overlapping let-batter-hit stints or count later tactical endpoints as deployment value", () => {
    const firstKeep = createPromptedKeepCurrent({
      eventId: "game-1_bp_keep_1",
      eventIndex: 1,
      decisionType: "let_batter_hit",
      trackedPlayerId: "away-batter",
      teamId: "away",
      managerId: "away-manager",
      opponentTeamId: "home",
      provenanceKey: "let-away-batter-hit",
      gameState: {
        inning: 6,
        halfInning: "TOP",
        outs: 0,
        score: { away: 2, home: 2 },
        runnersOn: {},
      },
    });
    const firstTacticalPa = createAtBat({
      eventId: "game-1_2",
      eventIndex: 2,
      batterId: "away-batter",
      batterName: "Away Batter",
      batterTeamId: "away",
      outs: 0,
      outsAfter: 1,
      wpa: 0.5,
    });
    const secondKeep = createPromptedKeepCurrent({
      eventId: "game-1_bp_keep_2",
      eventIndex: 3,
      decisionType: "let_batter_hit",
      trackedPlayerId: "away-batter",
      teamId: "away",
      managerId: "away-manager",
      opponentTeamId: "home",
      provenanceKey: "let-away-batter-hit",
      gameState: {
        inning: 6,
        halfInning: "TOP",
        outs: 1,
        score: { away: 2, home: 2 },
        runnersOn: {},
      },
    });
    const secondTacticalPa = createAtBat({
      eventId: "game-1_4",
      eventIndex: 4,
      batterId: "away-batter",
      batterName: "Away Batter",
      batterTeamId: "away",
      outs: 1,
      outsAfter: 2,
      wpa: 0.4,
    });
    const laterPa = createAtBat({
      eventId: "game-1_5",
      eventIndex: 5,
      batterId: "away-batter",
      batterName: "Away Batter",
      batterTeamId: "away",
      outs: 2,
      outsAfter: 3,
      wpa: 0.2,
    });

    const state = derive(
      [firstTacticalPa, secondTacticalPa, laterPa],
      [firstKeep, secondKeep],
      { gameEnded: true },
    );
    const keptInStints = state.managerDeploymentStints.filter(
      (stint) => stint.deploymentRole === "kept_position_player_in",
    );

    expect(keptInStints).toHaveLength(1);
    expect(keptInStints[0]).toMatchObject({
      tacticalExclusionEventIds: ["game-1_2", "game-1_4"],
      linkedEventIds: ["game-1_5"],
      rawLinkedWpa: 0.2,
      managerDeploymentWpa: 0.03,
    });
  });

  test("let-batter-hit typed deployment ignores same-player pitching credit", () => {
    const keepBatter = createPromptedKeepCurrent({
      eventId: "game-1_bp_keep_batter",
      eventIndex: 1,
      decisionType: "let_batter_hit",
      trackedPlayerId: "away-two-way",
      teamId: "away",
      managerId: "away-manager",
      opponentTeamId: "home",
      provenanceKey: "let-two-way-hit",
    });
    const tacticalPa = createAtBat({
      eventId: "game-1_2",
      eventIndex: 2,
      batterId: "away-two-way",
      batterName: "Away Two-Way",
      batterTeamId: "away",
      wpa: 0.3,
    });
    const laterPitchingPa = createAtBat({
      eventId: "game-1_3",
      eventIndex: 3,
      halfInning: "BOTTOM",
      result: "GO",
      pitcherId: "away-two-way",
      pitcherName: "Away Two-Way",
      pitcherTeamId: "away",
      wpaModelVersion: WPA_MODEL_VERSION,
    });

    const atBatEvents = [tacticalPa, laterPitchingPa];
    const state = derive(atBatEvents, [keepBatter], { gameEnded: true });
    const credits = deriveKblWpaCredits({
      atBatEvents,
      awayTeamId: "away",
      homeTeamId: "home",
      totalInnings: 9,
    });
    const samePlayerPitchingWpa = credits
      .filter(
        (credit) =>
          credit.playerId === "away-two-way" &&
          credit.teamId === "away" &&
          credit.role === "pitching" &&
          credit.eventId === "game-1_3",
      )
      .reduce((sum, credit) => sum + credit.wpa, 0);
    const stint = state.managerDeploymentStints[0];

    expect(samePlayerPitchingWpa).not.toBe(0);
    expect(stint).toMatchObject({
      deploymentRole: "kept_position_player_in",
      linkedEventIds: [],
      rawLinkedWpa: 0,
      managerDeploymentWpa: 0,
    });
  });

  test("leave-pitcher-in typed deployment excludes the tactical PA and links only later pitching", () => {
    const keepPitcher = createPromptedKeepCurrent({
      eventId: "game-1_bp_keep_pitcher",
      eventIndex: 1,
      decisionType: "leave_pitcher_in",
      trackedPlayerId: "home-pitcher",
      teamId: "home",
      managerId: "home-manager",
      opponentTeamId: "away",
      provenanceKey: "keep-home-pitcher",
    });
    const tacticalPa = createAtBat({
      eventId: "game-1_2",
      eventIndex: 2,
      pitcherId: "home-pitcher",
      pitcherName: "Home Pitcher",
      pitcherTeamId: "home",
      wpaModelVersion: WPA_MODEL_VERSION,
    });
    const laterPitchingPa = createAtBat({
      eventId: "game-1_3",
      eventIndex: 3,
      pitcherId: "home-pitcher",
      pitcherName: "Home Pitcher",
      pitcherTeamId: "home",
      outs: 2,
      outsAfter: 3,
      wpaModelVersion: WPA_MODEL_VERSION,
    });
    const laterBattingPa = createAtBat({
      eventId: "game-1_4",
      eventIndex: 4,
      halfInning: "BOTTOM",
      batterId: "home-pitcher",
      batterName: "Home Pitcher",
      batterTeamId: "home",
      wpa: 0.4,
    });
    const laterFieldingPa = createAtBat({
      eventId: "game-1_5",
      eventIndex: 5,
      result: "GO",
      pitcherId: "home-other-pitcher",
      pitcherName: "Home Other Pitcher",
      pitcherTeamId: "home",
      wpaModelVersion: WPA_MODEL_VERSION,
    });
    const fieldingEvents: FieldingEvent[] = [
      {
        fieldingEventId: "fielding-kept-pitcher",
        gameId: "game-1",
        atBatEventId: "game-1_5",
        sequence: 1,
        playerId: "home-pitcher",
        playerName: "Home Pitcher",
        position: "P",
        teamId: "home",
        playType: "putout",
        difficulty: "routine",
        ballInPlay: { trajectory: "ground", zone: 1 },
        success: true,
        runsPreventedOrAllowed: 0,
      },
    ];
    const atBatEvents = [
      tacticalPa,
      laterPitchingPa,
      laterBattingPa,
      laterFieldingPa,
    ];
    const stint = derive(atBatEvents, [keepPitcher], {
      fieldingEvents,
      gameEnded: true,
    }).managerDeploymentStints[0];
    const credits = deriveKblWpaCredits({
      atBatEvents,
      fieldingEvents,
      awayTeamId: "away",
      homeTeamId: "home",
      totalInnings: 9,
    });
    const laterPitchingWpa = credits
      .filter(
        (credit) =>
          credit.playerId === "home-pitcher" &&
          credit.teamId === "home" &&
          credit.role === "pitching" &&
          credit.eventId === "game-1_3",
      )
      .reduce((sum, credit) => sum + credit.wpa, 0);
    const ignoredBattingWpa = credits
      .filter(
        (credit) =>
          credit.playerId === "home-pitcher" &&
          credit.teamId === "home" &&
          credit.role === "batting" &&
          credit.eventId === "game-1_4",
      )
      .reduce((sum, credit) => sum + credit.wpa, 0);
    const ignoredFieldingWpa = credits
      .filter(
        (credit) =>
          credit.playerId === "home-pitcher" &&
          credit.teamId === "home" &&
          credit.role === "fielding" &&
          credit.eventId === "game-1_5",
      )
      .reduce((sum, credit) => sum + credit.wpa, 0);

    expect(laterPitchingWpa).not.toBe(0);
    expect(ignoredBattingWpa).not.toBe(0);
    expect(ignoredFieldingWpa).not.toBe(0);
    expect(stint).toMatchObject({
      deploymentRole: "kept_pitcher_in",
      playerId: "home-pitcher",
      managerId: "home-manager",
      teamId: "home",
      openedAtEventIndex: 2,
      tacticalExclusionEventIds: ["game-1_2"],
      linkedEventIds: ["game-1_3"],
      managerShare: 0.15,
    });
    expect(stint.linkedOutcomes).toEqual([
      expect.objectContaining({
        eventId: "game-1_3",
        role: "pitching",
        weight: 1,
      }),
    ]);
    expect(stint.rawLinkedWpa).toBeCloseTo(laterPitchingWpa, 5);
    expect(stint.managerDeploymentWpa).toBeCloseTo(
      calculateManagerDeploymentWpa("kept_pitcher_in", laterPitchingWpa)
        .managerDeploymentWpa,
      5,
    );
  });

  test("does not stack overlapping leave-pitcher-in typed stints", () => {
    const firstKeep = createPromptedKeepCurrent({
      eventId: "game-1_bp_keep_pitcher_1",
      eventIndex: 1,
      decisionType: "leave_pitcher_in",
      trackedPlayerId: "home-pitcher",
      teamId: "home",
      managerId: "home-manager",
      opponentTeamId: "away",
      provenanceKey: "keep-home-pitcher",
      gameState: {
        inning: 6,
        halfInning: "TOP",
        outs: 0,
        score: { away: 2, home: 2 },
        runnersOn: {},
      },
    });
    const firstTacticalPa = createAtBat({
      eventId: "game-1_2",
      eventIndex: 2,
      pitcherId: "home-pitcher",
      pitcherName: "Home Pitcher",
      pitcherTeamId: "home",
      outs: 0,
      outsAfter: 1,
      wpaModelVersion: WPA_MODEL_VERSION,
    });
    const secondKeep = createPromptedKeepCurrent({
      eventId: "game-1_bp_keep_pitcher_2",
      eventIndex: 3,
      decisionType: "leave_pitcher_in",
      trackedPlayerId: "home-pitcher",
      teamId: "home",
      managerId: "home-manager",
      opponentTeamId: "away",
      provenanceKey: "keep-home-pitcher",
      gameState: {
        inning: 6,
        halfInning: "TOP",
        outs: 1,
        score: { away: 2, home: 2 },
        runnersOn: {},
      },
    });
    const secondTacticalPa = createAtBat({
      eventId: "game-1_4",
      eventIndex: 4,
      pitcherId: "home-pitcher",
      pitcherName: "Home Pitcher",
      pitcherTeamId: "home",
      outs: 1,
      outsAfter: 2,
      wpaModelVersion: WPA_MODEL_VERSION,
    });
    const laterPitchingPa = createAtBat({
      eventId: "game-1_5",
      eventIndex: 5,
      pitcherId: "home-pitcher",
      pitcherName: "Home Pitcher",
      pitcherTeamId: "home",
      outs: 2,
      outsAfter: 3,
      wpaModelVersion: WPA_MODEL_VERSION,
    });

    const stints = derive(
      [firstTacticalPa, secondTacticalPa, laterPitchingPa],
      [firstKeep, secondKeep],
      { gameEnded: true },
    ).managerDeploymentStints.filter(
      (stint) => stint.deploymentRole === "kept_pitcher_in",
    );

    expect(stints).toHaveLength(1);
    expect(stints[0]).toMatchObject({
      tacticalExclusionEventIds: ["game-1_2", "game-1_4"],
      linkedEventIds: ["game-1_5"],
    });
  });

  test("active mid-game typed kept-in stint remains unscored", () => {
    const keepBatter = createPromptedKeepCurrent({
      eventId: "game-1_bp_keep_batter",
      eventIndex: 1,
      decisionType: "let_batter_hit",
      trackedPlayerId: "away-batter",
      teamId: "away",
      managerId: "away-manager",
      opponentTeamId: "home",
      provenanceKey: "let-away-batter-hit",
    });
    const tacticalPa = createAtBat({
      eventId: "game-1_2",
      eventIndex: 2,
      batterId: "away-batter",
      batterName: "Away Batter",
      batterTeamId: "away",
      wpa: 0.5,
    });
    const laterPa = createAtBat({
      eventId: "game-1_3",
      eventIndex: 3,
      batterId: "away-batter",
      batterName: "Away Batter",
      batterTeamId: "away",
      wpa: 0.2,
    });

    const stint = derive([tacticalPa, laterPa], [keepBatter], {
      gameEnded: false,
    }).managerDeploymentStints[0];

    expect(stint).toMatchObject({
      deploymentRole: "kept_position_player_in",
      linkedEventIds: [],
      linkedOutcomes: [],
      rawLinkedWpa: 0,
      managerDeploymentWpa: 0,
    });
    expect(stint.closedAtEventId).toBeUndefined();
    expect(stint.closeReason).toBeUndefined();
  });

  function createLiveDeploymentFixture() {
    const pinchHit = createBetweenPlay({
      eventId: "game-1_bp_ph",
      eventIndex: 1,
      substitution: {
        subType: "pinch_hit",
        outPlayerId: "away-starter",
        inPlayerId: "away-bench",
        inPlayerName: "Away Bench",
      },
    });
    const phTacticalPa = createAtBat({
      eventId: "game-1_2",
      eventIndex: 2,
      batterId: "away-bench",
      batterName: "Away Bench",
      batterTeamId: "away",
      wpa: 0.1,
    });
    const phLaterPa = createAtBat({
      eventId: "game-1_3",
      eventIndex: 3,
      batterId: "away-bench",
      batterName: "Away Bench",
      batterTeamId: "away",
      wpa: 0.4,
    });
    const pitchingChange = createBetweenPlay({
      eventId: "game-1_bp_pitcher",
      eventIndex: 4,
      type: "pitcher_change",
      substitution: undefined,
      pitcherChange: {
        outgoingPitcherId: "home-starter",
        incomingPitcherId: "home-rp",
        incomingPitcherName: "Home RP",
        inheritedRunners: 0,
      },
    });
    const pitcherTacticalPa = createAtBat({
      eventId: "game-1_5",
      eventIndex: 5,
      pitcherId: "home-rp",
      pitcherName: "Home RP",
      pitcherTeamId: "home",
      outs: 0,
      outsAfter: 1,
      wpaModelVersion: WPA_MODEL_VERSION,
    });
    const pitcherLaterPa = createAtBat({
      eventId: "game-1_6",
      eventIndex: 6,
      pitcherId: "home-rp",
      pitcherName: "Home RP",
      pitcherTeamId: "home",
      outs: 1,
      outsAfter: 2,
      wpaModelVersion: WPA_MODEL_VERSION,
    });
    const pinchRun = createBetweenPlay({
      eventId: "game-1_bp_pr",
      eventIndex: 7,
      substitution: {
        subType: "pinch_run",
        outPlayerId: "away-runner",
        inPlayerId: "away-speed",
        inPlayerName: "Away Speed",
      },
    });
    const prTacticalTerminal = createAtBat({
      eventId: "game-1_8",
      eventIndex: 8,
      result: "1B",
      runnerOutcomes: [
        {
          runnerId: "away-speed",
          runnerName: "Away Speed",
          fromBase: "first",
          toBase: "home",
        },
      ],
      awayScoreAfter: 3,
      runsScored: ["away-speed"],
      wpa: 0.3,
    });
    const prLaterPa = createAtBat({
      eventId: "game-1_9",
      eventIndex: 9,
      batterId: "away-speed",
      batterName: "Away Speed",
      batterTeamId: "away",
      wpa: 0.2,
    });

    return {
      atBatEvents: [
        phTacticalPa,
        phLaterPa,
        pitcherTacticalPa,
        pitcherLaterPa,
        prTacticalTerminal,
        prLaterPa,
      ],
      betweenPlayEvents: [pinchHit, pitchingChange, pinchRun],
    };
  }

  test("mid-game PH, pitcher, and PR deployments remain active and unscored", () => {
    const fixture = createLiveDeploymentFixture();
    const state = derive(fixture.atBatEvents, fixture.betweenPlayEvents, {
      gameEnded: false,
    });

    expect(state.managerDeploymentStints).toHaveLength(3);
    expect(
      state.managerDeploymentStints.map((stint) => stint.deploymentRole).sort(),
    ).toEqual(["pinch_hitter_remaining", "pinch_runner", "pitcher"]);
    expect(
      state.managerDeploymentStints.every(
        (stint) =>
          stint.closedAtEventId === undefined &&
          stint.closedAtEventIndex === undefined &&
          stint.closeReason === undefined &&
          stint.linkedEventIds.length === 0 &&
          stint.rawLinkedWpa === 0 &&
          stint.managerDeploymentWpa === 0,
      ),
    ).toBe(true);
  });

  test("same deployment fixture closes and scores when gameEnded is true", () => {
    const fixture = createLiveDeploymentFixture();
    const state = derive(fixture.atBatEvents, fixture.betweenPlayEvents, {
      gameEnded: true,
    });

    const byRole = new Map(
      state.managerDeploymentStints.map((stint) => [stint.deploymentRole, stint]),
    );

    expect(byRole.get("pinch_hitter_remaining")).toMatchObject({
      closeReason: "game_end",
      linkedEventIds: ["game-1_3"],
      rawLinkedWpa: 0.4,
      managerDeploymentWpa: 0.06,
    });
    expect(byRole.get("pitcher")).toMatchObject({
      closeReason: "game_end",
      linkedEventIds: ["game-1_6"],
    });
    expect(byRole.get("pitcher")?.managerDeploymentWpa).not.toBe(0);
    expect(byRole.get("pinch_runner")).toMatchObject({
      closeReason: "game_end",
      linkedEventIds: ["game-1_9"],
      rawLinkedWpa: 0.2,
      managerDeploymentWpa: 0.04,
    });
  });

  test("closes deployment stints on removal and does not link later player events", () => {
    const pinchHit = createBetweenPlay({
      eventId: "game-1_bp_1",
      eventIndex: 1,
      substitution: {
        subType: "pinch_hit",
        outPlayerId: "away-starter",
        inPlayerId: "away-bench",
        inPlayerName: "Away Bench",
      },
    });
    const removal = createBetweenPlay({
      eventId: "game-1_bp_4",
      eventIndex: 4,
      substitution: {
        subType: "defensive_replacement",
        outPlayerId: "away-bench",
        inPlayerId: "away-glove",
        inPlayerName: "Away Glove",
      },
    });
    const tacticalPa = createAtBat({
      eventId: "game-1_2",
      eventIndex: 2,
      batterId: "away-bench",
      batterTeamId: "away",
      wpa: 0.4,
    });
    const countedPa = createAtBat({
      eventId: "game-1_3",
      eventIndex: 3,
      batterId: "away-bench",
      batterTeamId: "away",
      wpa: 0.1,
    });
    const afterRemoval = createAtBat({
      eventId: "game-1_5",
      eventIndex: 5,
      batterId: "away-bench",
      batterTeamId: "away",
      wpa: 0.3,
    });

    const stint = derive(
      [tacticalPa, countedPa, afterRemoval],
      [pinchHit, removal],
    ).managerDeploymentStints.find(
      (row) => row.playerId === "away-bench",
    );

    expect(stint).toMatchObject({
      closeReason: "removed",
      closedAtEventId: "game-1_bp_4",
      linkedEventIds: ["game-1_3"],
      rawLinkedWpa: 0.1,
      managerDeploymentWpa: 0.015,
    });
  });

  test("closes deployment stints on role change and scores the closed window", () => {
    const defensiveSub = createBetweenPlay({
      eventId: "game-1_bp_defense",
      eventIndex: 1,
      type: "substitution",
      substitution: {
        subType: "defensive_replacement",
        outPlayerId: "home-left-old",
        outPlayerName: "Home Left Old",
        inPlayerId: "home-glove",
        inPlayerName: "Home Glove",
        inPosition: "LF",
      },
    });
    const roleChange = createBetweenPlay({
      eventId: "game-1_bp_role_change",
      eventIndex: 4,
      type: "position_change",
      substitution: {
        subType: "position_change",
        outPlayerId: "home-glove",
        outPlayerName: "Home Glove",
        inPlayerId: "home-glove",
        inPlayerName: "Home Glove",
        previousPosition: "LF",
        inPosition: "CF",
      },
    });
    const tacticalFieldingPlay = createAtBat({
      eventId: "game-1_2",
      eventIndex: 2,
      outs: 0,
      outsAfter: 1,
      wpaModelVersion: WPA_MODEL_VERSION,
    });
    const countedFieldingPlay = createAtBat({
      eventId: "game-1_3",
      eventIndex: 3,
      outs: 1,
      outsAfter: 2,
      wpaModelVersion: WPA_MODEL_VERSION,
    });
    const fieldingEvents: FieldingEvent[] = [
      {
        fieldingEventId: "fielding-role-1",
        gameId: "game-1",
        atBatEventId: "game-1_2",
        sequence: 1,
        playerId: "home-glove",
        playerName: "Home Glove",
        position: "LF",
        teamId: "home",
        playType: "putout",
        difficulty: "routine",
        ballInPlay: { trajectory: "fly", zone: 7 },
        success: true,
        runsPreventedOrAllowed: 0,
      },
      {
        fieldingEventId: "fielding-role-2",
        gameId: "game-1",
        atBatEventId: "game-1_3",
        sequence: 1,
        playerId: "home-glove",
        playerName: "Home Glove",
        position: "LF",
        teamId: "home",
        playType: "putout",
        difficulty: "routine",
        ballInPlay: { trajectory: "fly", zone: 7 },
        success: true,
        runsPreventedOrAllowed: 0,
      },
    ];

    const state = deriveCommittedManagerDecisionState({
      gameId: "game-1",
      atBatEvents: [tacticalFieldingPlay, countedFieldingPlay],
      betweenPlayEvents: [defensiveSub, roleChange],
      fieldingEvents,
      awayTeamId: "away",
      homeTeamId: "home",
      awayManagerId: "away-manager",
      homeManagerId: "home-manager",
      totalInnings: 9,
      gameEnded: false,
    });
    const closed = state.managerDeploymentStints.find(
      (stint) =>
        stint.playerId === "home-glove" &&
        stint.trackedPosition === "LF",
    );

    expect(closed).toMatchObject({
      closeReason: "role_change",
      closedAtEventId: "game-1_bp_role_change",
      linkedEventIds: ["game-1_3"],
    });
    expect(closed?.managerDeploymentWpa).not.toBe(0);
  });

  test("position change closes a kept-position-player stint and opens the explicit defensive role", () => {
    const keepBatter = createPromptedKeepCurrent({
      eventId: "game-1_bp_keep_batter",
      eventIndex: 1,
      decisionType: "let_batter_hit",
      trackedPlayerId: "away-batter",
      teamId: "away",
      managerId: "away-manager",
      opponentTeamId: "home",
      provenanceKey: "let-away-batter-hit",
    });
    const tacticalPa = createAtBat({
      eventId: "game-1_2",
      eventIndex: 2,
      batterId: "away-batter",
      batterName: "Away Batter",
      batterTeamId: "away",
      wpa: 0.5,
    });
    const countedPa = createAtBat({
      eventId: "game-1_3",
      eventIndex: 3,
      batterId: "away-batter",
      batterName: "Away Batter",
      batterTeamId: "away",
      wpa: 0.2,
    });
    const positionChange = createBetweenPlay({
      eventId: "game-1_bp_position_change",
      eventIndex: 4,
      type: "position_change",
      gameState: {
        inning: 6,
        halfInning: "BOTTOM",
        outs: 0,
        score: { away: 2, home: 2 },
        runnersOn: {},
      },
      substitution: {
        subType: "position_change",
        outPlayerId: "away-batter",
        outPlayerName: "Away Batter",
        inPlayerId: "away-batter",
        inPlayerName: "Away Batter",
        previousPosition: "LF",
        inPosition: "CF",
      },
    });
    const tacticalFieldingPa = createAtBat({
      eventId: "game-1_5",
      eventIndex: 5,
      halfInning: "BOTTOM",
      result: "FO",
      wpaModelVersion: WPA_MODEL_VERSION,
    });
    const laterFieldingPa = createAtBat({
      eventId: "game-1_6",
      eventIndex: 6,
      halfInning: "BOTTOM",
      result: "FO",
      outs: 1,
      outsAfter: 2,
      wpaModelVersion: WPA_MODEL_VERSION,
    });
    const fieldingEvents: FieldingEvent[] = [
      {
        fieldingEventId: "fielding-position-change-1",
        gameId: "game-1",
        atBatEventId: "game-1_5",
        sequence: 1,
        playerId: "away-batter",
        playerName: "Away Batter",
        position: "CF",
        teamId: "away",
        playType: "putout",
        difficulty: "routine",
        ballInPlay: { trajectory: "fly", zone: 8 },
        success: true,
        runsPreventedOrAllowed: 0,
      },
      {
        fieldingEventId: "fielding-position-change-2",
        gameId: "game-1",
        atBatEventId: "game-1_6",
        sequence: 1,
        playerId: "away-batter",
        playerName: "Away Batter",
        position: "CF",
        teamId: "away",
        playType: "putout",
        difficulty: "routine",
        ballInPlay: { trajectory: "fly", zone: 8 },
        success: true,
        runsPreventedOrAllowed: 0,
      },
    ];

    const stints = derive(
      [tacticalPa, countedPa, tacticalFieldingPa, laterFieldingPa],
      [keepBatter, positionChange],
      { fieldingEvents, gameEnded: true },
    ).managerDeploymentStints;
    const keptStint = stints.find(
      (stint) => stint.deploymentRole === "kept_position_player_in",
    );
    const defensiveStint = stints.find(
      (stint) => stint.deploymentRole === "defensive_position",
    );

    expect(keptStint).toMatchObject({
      closeReason: "role_change",
      closedAtEventId: "game-1_bp_position_change",
      linkedEventIds: ["game-1_3"],
      rawLinkedWpa: 0.2,
    });
    expect(defensiveStint).toMatchObject({
      sourceEventId: "game-1_bp_position_change",
      playerId: "away-batter",
      trackedPosition: "CF",
      openedAtEventIndex: 5,
      tacticalExclusionEventIds: ["game-1_5"],
      linkedEventIds: ["game-1_6"],
    });
  });

  test("closes pinch-runner deployment at the terminal runner outcome", () => {
    const pinchRun = createBetweenPlay({
      eventId: "game-1_bp_1",
      eventIndex: 1,
      substitution: {
        subType: "pinch_run",
        outPlayerId: "away-runner",
        inPlayerId: "away-speed",
        inPlayerName: "Away Speed",
      },
    });
    const firstRunnerWindowEvent = createAtBat({
      eventId: "game-1_2",
      eventIndex: 2,
      result: "1B",
      runnerOutcomes: [
        {
          runnerId: "away-speed",
          runnerName: "Away Speed",
          fromBase: "first",
          toBase: "second",
        },
      ],
      wpa: 0.2,
    });
    const terminalRunnerWindowEvent = createAtBat({
      eventId: "game-1_3",
      eventIndex: 3,
      result: "1B",
      runnerOutcomes: [
        {
          runnerId: "away-speed",
          runnerName: "Away Speed",
          fromBase: "second",
          toBase: "home",
        },
      ],
      awayScoreAfter: 3,
      runsScored: ["away-speed"],
      wpa: 0.3,
    });
    const laterPlateAppearance = createAtBat({
      eventId: "game-1_4",
      eventIndex: 4,
      batterId: "away-other",
      batterName: "Away Other",
      batterTeamId: "away",
      wpa: 0.4,
    });

    const stint = derive(
      [firstRunnerWindowEvent, terminalRunnerWindowEvent, laterPlateAppearance],
      [pinchRun],
      { gameEnded: true },
    ).managerDeploymentStints[0];

    expect(stint).toMatchObject({
      deploymentRole: "pinch_runner",
      playerId: "away-speed",
      openedAtEventIndex: 3,
      closeReason: "runner_terminal",
      closedAtEventId: "game-1_3",
      tacticalExclusionEventIds: ["game-1_2", "game-1_3"],
      linkedEventIds: [],
      rawLinkedWpa: 0,
      managerDeploymentWpa: 0,
    });
  });

  test("keeps a pinch-runner deployment stint open after scoring when the player remains active", () => {
    const pinchRun = createBetweenPlay({
      eventId: "game-1_bp_1",
      eventIndex: 1,
      substitution: {
        subType: "pinch_run",
        outPlayerId: "away-runner",
        inPlayerId: "away-speed",
        inPlayerName: "Away Speed",
      },
    });
    const terminalRunnerWindowEvent = createAtBat({
      eventId: "game-1_2",
      eventIndex: 2,
      result: "1B",
      runnerOutcomes: [
        {
          runnerId: "away-speed",
          runnerName: "Away Speed",
          fromBase: "first",
          toBase: "home",
        },
      ],
      awayScoreAfter: 3,
      runsScored: ["away-speed"],
      wpa: 0.3,
    });
    const laterPlateAppearance = createAtBat({
      eventId: "game-1_3",
      eventIndex: 3,
      batterId: "away-speed",
      batterName: "Away Speed",
      batterTeamId: "away",
      wpa: 0.4,
    });

    const stint = derive(
      [terminalRunnerWindowEvent, laterPlateAppearance],
      [pinchRun],
      { gameEnded: true },
    ).managerDeploymentStints[0];

    expect(stint).toMatchObject({
      deploymentRole: "pinch_runner",
      playerId: "away-speed",
      openedAtEventIndex: 2,
      closeReason: "game_end",
      tacticalExclusionEventIds: ["game-1_2"],
      linkedEventIds: ["game-1_3"],
      rawLinkedWpa: 0.4,
      managerDeploymentWpa: 0.08,
    });
  });

  test("opens deployment stints for committed position-change events", () => {
    const positionChange = createBetweenPlay({
      eventId: "game-1_bp_1",
      eventIndex: 1,
      type: "position_change",
      substitution: {
        subType: "position_change",
        outPlayerId: "home-fielder",
        outPlayerName: "Home Fielder",
        inPlayerId: "home-fielder",
        inPlayerName: "Home Fielder",
        inPosition: "LF",
        previousPosition: "CF",
      },
    });
    const tacticalFieldingPlay = createAtBat({
      eventId: "game-1_2",
      eventIndex: 2,
      wpaModelVersion: WPA_MODEL_VERSION,
      wpa: -0.2,
    });
    const laterFieldingPlay = createAtBat({
      eventId: "game-1_3",
      eventIndex: 3,
      wpaModelVersion: WPA_MODEL_VERSION,
      wpa: -0.1,
    });
    const fieldingEvents: FieldingEvent[] = [
      {
        fieldingEventId: "fielding-1",
        gameId: "game-1",
        atBatEventId: "game-1_2",
        sequence: 1,
        playerId: "home-fielder",
        playerName: "Home Fielder",
        position: "LF",
        teamId: "home",
        playType: "putout",
        difficulty: "routine",
        ballInPlay: { trajectory: "fly", zone: 7 },
        success: true,
        runsPreventedOrAllowed: 0,
      },
      {
        fieldingEventId: "fielding-2",
        gameId: "game-1",
        atBatEventId: "game-1_3",
        sequence: 1,
        playerId: "home-fielder",
        playerName: "Home Fielder",
        position: "LF",
        teamId: "home",
        playType: "putout",
        difficulty: "routine",
        ballInPlay: { trajectory: "fly", zone: 7 },
        success: true,
        runsPreventedOrAllowed: 0,
      },
    ];

    const state = deriveCommittedManagerDecisionState({
      gameId: "game-1",
      atBatEvents: [tacticalFieldingPlay, laterFieldingPlay],
      betweenPlayEvents: [positionChange],
      fieldingEvents,
      awayTeamId: "away",
      homeTeamId: "home",
      awayManagerId: "away-manager",
      homeManagerId: "home-manager",
      totalInnings: 9,
      gameEnded: true,
    });

    expect(state.managerDeploymentStints[0]).toMatchObject({
      deploymentRole: "defensive_position",
      playerId: "home-fielder",
      managerId: "home-manager",
      teamId: "home",
      sourceEventId: "game-1_bp_1",
      openedAtEventIndex: 2,
      tacticalExclusionEventIds: ["game-1_2"],
      linkedEventIds: ["game-1_3"],
    });
  });

  test("recomputes substitution subtype changes from committed between-play events", () => {
    const pinchHit = createBetweenPlay({
      substitution: {
        subType: "pinch_hit",
        outPlayerId: "away-batter",
        inPlayerId: "away-bench",
      },
    });
    const pinchRun = createBetweenPlay({
      ...pinchHit,
      substitution: {
        subType: "pinch_run",
        outPlayerId: "away-runner",
        inPlayerId: "away-bench-runner",
      },
    });
    const positionChange = createBetweenPlay({
      ...pinchHit,
      substitution: {
        subType: "position_change",
        outPlayerId: "away-fielder",
        inPlayerId: "away-fielder",
      },
    });

    expect(derive([], [pinchHit]).managerDecisions[0]).toMatchObject({
      decisionType: "pinch_hitter",
      managerId: "away-manager",
    });
    expect(derive([], [pinchRun]).managerDecisions[0]).toMatchObject({
      decisionType: "pinch_runner",
      managerId: "away-manager",
    });
    expect(derive([], [positionChange]).managerDecisions[0]).toMatchObject({
      decisionType: "position_change",
      managerId: "home-manager",
    });
  });

  test("refreshes current-game storage after committed event-log patches", async () => {
    const gameId = "game-manager-wpa-refresh";
    const event = createAtBat({
      gameId,
      eventId: `${gameId}_1`,
      enrichment: { exitType: "bunt" },
    });

    await clearCurrentGame();
    await saveCurrentGame(createPersistedGameState(gameId));
    await logAtBatEvent(event);

    await refreshCurrentGameManagerDecisionState({
      gameId,
      awayTeamId: "away",
      homeTeamId: "home",
      awayManagerId: "away-manager",
      homeManagerId: "home-manager",
    });
    expect((await loadCurrentGame())?.managerDecisions).toMatchObject([
      { decisionType: "bunt_call" },
    ]);

    await updateAtBatEvent(event.eventId, {
      enrichment: {
        exitType: undefined,
      } as NonNullable<AtBatEvent["enrichment"]>,
      version: 2,
    });
    await refreshCurrentGameManagerDecisionState({
      gameId,
      awayTeamId: "away",
      homeTeamId: "home",
      awayManagerId: "away-manager",
      homeManagerId: "home-manager",
    });

    expect((await loadCurrentGame())?.managerDecisions).toEqual([]);
  });

  test("refresh recomputes decision windows when linked outcome events are edited", async () => {
    const gameId = "game-manager-wpa-linked-window-refresh";
    const ibb = createAtBat({
      gameId,
      eventId: `${gameId}_1`,
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
    const nextPa = createAtBat({
      gameId,
      eventId: `${gameId}_2`,
      eventIndex: 2,
      batterId: "away-next",
      batterName: "Away Next",
      runners: ibb.runnersAfter,
      result: "GO",
      runnersAfter: ibb.runnersAfter,
      outs: 1,
      outsAfter: 2,
      awayScore: 2,
      homeScore: 2,
      awayScoreAfter: 2,
      homeScoreAfter: 2,
    });

    await clearCurrentGame();
    await saveCurrentGame(createPersistedGameState(gameId));
    await logAtBatEvent(ibb);
    await logAtBatEvent(nextPa);

    await refreshCurrentGameManagerDecisionState({
      gameId,
      awayTeamId: "away",
      homeTeamId: "home",
      awayManagerId: "away-manager",
      homeManagerId: "home-manager",
    });
    const initialDecision = (await loadCurrentGame())?.managerDecisions?.[0];
    expect(initialDecision).toMatchObject({
      decisionType: "intentional_walk",
      resolved: false,
      resolvedAtEventId: undefined,
      linkedEventIds: expect.arrayContaining([`${gameId}_1`, `${gameId}_2`]),
      resolutionWindow: {
        expectedEndpoint: "runner_consequence",
        status: "pending",
      },
    });
    expect(initialDecision?.managerWpa).toBeUndefined();

    await updateAtBatEvent(nextPa.eventId, {
      result: "HR",
      runsScored: ["away-batter", "away-next"],
      outsAfter: 1,
      runnersAfter: { first: null, second: null, third: null },
      awayScoreAfter: 4,
      homeScoreAfter: 2,
      version: 2,
    });
    await refreshCurrentGameManagerDecisionState({
      gameId,
      awayTeamId: "away",
      homeTeamId: "home",
      awayManagerId: "away-manager",
      homeManagerId: "home-manager",
    });

    const updatedDecision = (await loadCurrentGame())?.managerDecisions?.[0];
    expect(updatedDecision).toMatchObject({
      decisionType: "intentional_walk",
      resolved: true,
      resolvedAtEventId: `${gameId}_2`,
      linkedEventIds: expect.arrayContaining([`${gameId}_1`, `${gameId}_2`]),
      explanationMetadata: {
        intentionalWalk: {
          finalConsequence: "scored",
          nextBatterResult: "HR",
        },
      },
    });
    expect(updatedDecision?.managerWpa).toEqual(expect.any(Number));
  });

  test("completed-game archive stores manager decisions, deployment stints, and lineup deltas separately", async () => {
    const gameId = "game-manager-wpa-archive";
    const tacticalState = deriveCommittedManagerDecisionState({
      gameId,
      atBatEvents: [
        createAtBat({
          gameId,
          eventId: `${gameId}_1`,
          enrichment: { exitType: "bunt" },
        }),
      ],
      betweenPlayEvents: [],
      awayTeamId: "away",
      homeTeamId: "home",
      awayManagerId: "away-manager",
      homeManagerId: "home-manager",
      totalInnings: 9,
    });
    const lineupDeltas = [
      {
        decisionId: `${gameId}:away:away-starter-1:lineup_delta`,
        gameId,
        managerId: "away-manager",
        teamId: "away",
        decisionType: "lineup_construction" as const,
        inferenceMethod: "automatic" as const,
        confidence: "low" as const,
        starterPlayerId: "away-starter-1",
        starterPlayerName: "Away Starter 1",
        battingOrderSlot: 1,
        defensivePosition: "SS",
        starterRole: "position_player" as const,
        actualPlayerKblWpa: 0.4,
        replacementExpectedKblWpa: 0.3,
        replacementBaselineSource: "optimal_lineup_v2" as const,
        replacementBaselineConfidence: "medium" as const,
        rawPerformanceDelta: 0.4,
        managerShare: 0.25,
        managerWpa: 0.1,
      },
    ];
    const deploymentStints: NonNullable<
      PersistedGameState["managerDeploymentStints"]
    > = [
      {
        stintId: `${gameId}:bp-1:deployment:pitcher:home-rp`,
        gameId,
        managerId: "home-manager",
        teamId: "home",
        deploymentRole: "pitcher",
        playerId: "home-rp",
        playerName: "Home RP",
        sourceEventId: "bp-1",
        openedAtEventIndex: 1,
        tacticalExclusionEventIds: ["pa-1"],
        closedAtEventId: "pa-3",
        closedAtEventIndex: 3,
        closeReason: "game_end",
        linkedEventIds: ["pa-2", "pa-3"],
        rawLinkedWpa: 0.3,
        managerShare: 0.15,
        managerDeploymentWpa: 0.045,
        cap: 0.15,
        confidence: "medium",
      },
    ];

    await archiveCompletedGame(
      {
        ...createPersistedGameState(gameId),
        managerDecisions: tacticalState.managerDecisions,
        managerDeploymentStints: deploymentStints,
        managerLineupDeltas: lineupDeltas,
      },
      { away: 3, home: 2 },
      [],
      "season-1",
    );

    const archived = await getCompletedGameById(gameId);
    expect(archived?.managerDecisions).toEqual(tacticalState.managerDecisions);
    expect(archived?.managerDeploymentStints).toEqual(deploymentStints);
    expect(archived?.managerLineupDeltas).toEqual(lineupDeltas);
  });

  test("completed Franchise manager records use assigned manager IDs instead of team defaults", () => {
    const optimal = createLineupSnapshot({
      teamId: "away",
      snapshotId: "away-optimal-assigned-manager",
      slots: [
        {
          playerId: "away-optimal-cf",
          playerName: "Away Optimal CF",
          battingOrderSlot: 1,
          defensivePosition: "CF",
          projectedSlotKblWpa: 0.1,
        },
      ],
    });
    const chosen = createLineupSnapshot({
      teamId: "away",
      snapshotId: "away-chosen-assigned-manager",
      slots: [
        {
          playerId: "away-starter-1",
          playerName: "Away Starter 1",
          battingOrderSlot: 1,
          defensivePosition: "SS",
          projectedSlotKblWpa: 0,
        },
      ],
    });
    const pinchHit = createBetweenPlay({
      eventId: "game-1_bp_assigned",
      eventIndex: 1,
      substitution: {
        subType: "pinch_hit",
        outPlayerId: "away-starter-2",
        inPlayerId: "away-bench",
        inPlayerName: "Away Bench",
      },
    });
    const pinchHitPa = createAtBat({
      eventId: "game-1_2",
      eventIndex: 2,
      batterId: "away-bench",
      batterName: "Away Bench",
      batterTeamId: "away",
      wpa: 0.1,
    });
    const intentionalWalk = createAtBat({
      eventId: "game-1_3",
      eventIndex: 3,
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
    const lineupEvent = createSparseKblWpaEvent({
      eventId: "game-1_wpa_assigned",
      playerId: "away-starter-1",
      playerName: "Away Starter 1",
      teamId: "away",
      wpa: -0.2,
    });

    const state = deriveCommittedManagerDecisionState({
      gameId: "game-1",
      atBatEvents: [pinchHitPa, intentionalWalk, lineupEvent],
      betweenPlayEvents: [pinchHit],
      fieldingEvents: [],
      startingLineups,
      optimalLineupSnapshots: { away: optimal },
      chosenLineupSnapshots: { away: chosen },
      awayTeamId: "away",
      homeTeamId: "home",
      managerAssignments: [
        {
          managerId: "assigned-away-manager",
          teamId: "away",
          mode: "franchise",
          instanceId: "franchise-1",
        },
        {
          managerId: "assigned-home-manager",
          teamId: "home",
          mode: "franchise",
          instanceId: "franchise-1",
        },
      ],
      mode: "franchise",
      instanceId: "franchise-1",
      totalInnings: 9,
      gameEnded: true,
    });

    expect(
      state.managerDecisions.find(
        (decision) => decision.decisionType === "pinch_hitter",
      )?.managerId,
    ).toBe("assigned-away-manager");
    expect(
      state.managerDecisions.find(
        (decision) => decision.decisionType === "intentional_walk",
      )?.managerId,
    ).toBe("assigned-home-manager");
    expect(state.managerDeploymentStints[0]?.managerId).toBe(
      "assigned-away-manager",
    );
    expect(state.managerLineupDeltas[0]?.managerId).toBe(
      "assigned-away-manager",
    );
    expect(
      [
        ...state.managerDecisions.map((record) => record.managerId),
        ...state.managerDeploymentStints.map((record) => record.managerId),
        ...state.managerLineupDeltas.map((record) => record.managerId),
      ],
    ).not.toContain("away-manager");
    expect(
      [
        ...state.managerDecisions.map((record) => record.managerId),
        ...state.managerDeploymentStints.map((record) => record.managerId),
        ...state.managerLineupDeltas.map((record) => record.managerId),
      ],
    ).not.toContain("home-manager");
  });

  test("missing snapshots create no official Lineup Delta records", () => {
    const deltas = deriveLineupDeltas([
      createSparseKblWpaEvent({
        eventId: "game-1_wpa_1",
        playerId: "away-starter-1",
        playerName: "Away Starter 1",
        teamId: "away",
        wpa: 0.4,
      }),
    ]);

    expect(deltas).toEqual([]);
  });

  test("uses Optimal Lineup v2 snapshots and skips exact optimal even when starters underperform", () => {
    const optimal = createLineupSnapshot({
      teamId: "away",
      snapshotId: "away-optimal",
      slots: [
        {
          playerId: "away-starter-1",
          playerName: "Away Starter 1",
          battingOrderSlot: 1,
          defensivePosition: "SS",
          projectedSlotKblWpa: 0.04,
        },
        {
          playerId: "away-starter-2",
          playerName: "Away Starter 2",
          battingOrderSlot: 2,
          defensivePosition: "CF",
          projectedSlotKblWpa: 0.02,
        },
      ],
    });

    const state = deriveCommittedManagerDecisionState({
      gameId: "game-1",
      atBatEvents: [
        createSparseKblWpaEvent({
          eventId: "game-1_wpa_underperform",
          playerId: "away-starter-1",
          playerName: "Away Starter 1",
          teamId: "away",
          wpa: -0.5,
        }),
      ],
      betweenPlayEvents: [],
      fieldingEvents: [],
      startingLineups,
      optimalLineupSnapshots: { away: optimal },
      chosenLineupSnapshots: { away: optimal },
      awayTeamId: "away",
      homeTeamId: "home",
      awayManagerId: "away-manager",
      homeManagerId: "home-manager",
      gameEnded: true,
    });

    expect(state.managerLineupDeltas.filter((delta) => delta.teamId === "away")).toEqual([]);
  });

  test("starting pitcher WPA never creates Lineup Delta records", () => {
    const optimal = createLineupSnapshot({
      teamId: "away",
      snapshotId: "away-optimal-sp",
      slots: [
        {
          playerId: "optimal-sp",
          playerName: "Optimal Starter",
          battingOrderSlot: 9,
          defensivePosition: "P",
          projectedSlotKblWpa: 0.2,
        },
      ],
    });
    const chosen = createLineupSnapshot({
      teamId: "away",
      snapshotId: "away-chosen-sp",
      slots: [
        {
          playerId: "away-sp",
          playerName: "Away Starter Pitcher",
          battingOrderSlot: 9,
          defensivePosition: "P",
          projectedSlotKblWpa: -0.2,
        },
      ],
    });
    const deltas = deriveManagerLineupDeltaRecords({
      gameId: "game-1",
      atBatEvents: [
        createSparseKblWpaEvent({
          eventId: "game-1_wpa_sp",
          playerId: "away-sp",
          playerName: "Away Starter Pitcher",
          teamId: "away",
          wpa: -1,
        }),
      ],
      betweenPlayEvents: [],
      fieldingEvents: [],
      startingLineups: {
        away: [
          {
            playerId: "away-sp",
            playerName: "Away Starter Pitcher",
            position: "P",
            battingOrder: 9,
          },
        ],
        home: [],
      },
      optimalLineupSnapshots: { away: optimal },
      chosenLineupSnapshots: { away: chosen },
      awayTeamId: "away",
      homeTeamId: "home",
      awayManagerId: "away-manager",
      homeManagerId: "home-manager",
      gameEnded: true,
    });

    expect(deltas).toEqual([]);
  });

  test("scores lineup deviations against Optimal Lineup projection rather than chosen projection", () => {
    const optimal = createLineupSnapshot({
      teamId: "away",
      snapshotId: "away-optimal",
      slots: [
        {
          playerId: "optimal-cf",
          playerName: "Optimal CF",
          battingOrderSlot: 1,
          defensivePosition: "CF",
          projectedSlotKblWpa: 0.05,
        },
      ],
    });
    const chosen = createLineupSnapshot({
      teamId: "away",
      snapshotId: "away-chosen",
      slots: [
        {
          playerId: "away-starter-2",
          playerName: "Away Starter 2",
          battingOrderSlot: 1,
          defensivePosition: "CF",
          projectedSlotKblWpa: -0.05,
        },
      ],
    });
    const deltas = deriveManagerLineupDeltaRecords({
      gameId: "game-1",
      atBatEvents: [
        createSparseKblWpaEvent({
          eventId: "game-1_wpa_1",
          playerId: "away-starter-2",
          playerName: "Away Starter 2",
          teamId: "away",
          wpa: 0,
        }),
      ],
      betweenPlayEvents: [],
      fieldingEvents: [],
      startingLineups,
      optimalLineupSnapshots: { away: optimal },
      chosenLineupSnapshots: { away: chosen },
      awayTeamId: "away",
      homeTeamId: "home",
      awayManagerId: "away-manager",
      homeManagerId: "home-manager",
      gameEnded: true,
    });

    const awayDeltas = deltas.filter((delta) => delta.teamId === "away");

    expect(awayDeltas).toHaveLength(1);
    expect(awayDeltas[0]).toMatchObject({
      replacementBaselineSource: "optimal_lineup_v2",
      optimalSnapshotId: "away-optimal",
      chosenPlayerId: "away-starter-2",
      optimalPlayerId: "optimal-cf",
      projectedOpportunityCost: -0.1,
      realizedVsChosenProjection: 0.05,
      actualVsOptimalProjection: -0.05,
      managerWpa: -0.0125,
    });
  });

  test("caps each starter lineup delta to +/-0.250", () => {
    const deltas = deriveLineupDeltasWithSnapshots([
      createSparseKblWpaEvent({
        eventId: "game-1_wpa_1",
        playerId: "away-starter-1",
        teamId: "away",
        wpa: 2,
      }),
      createSparseKblWpaEvent({
        eventId: "game-1_wpa_2",
        playerId: "home-starter-1",
        teamId: "home",
        wpa: -2,
      }),
    ]);

    expect(deltas.find((delta) => delta.starterPlayerId === "away-starter-1")?.managerWpa).toBe(0.25);
    expect(deltas.find((delta) => delta.starterPlayerId === "home-starter-1")?.managerWpa).toBe(-0.25);
  });

  test("caps each team's lineup delta total to +/-0.750", () => {
    const deltas = deriveLineupDeltasWithSnapshots([
      ...[1, 2, 3, 4].map((slot) =>
        createSparseKblWpaEvent({
          eventId: `game-1_wpa_${slot}`,
          playerId: `away-starter-${slot}`,
          teamId: "away",
          wpa: 2,
        }),
      ),
    ]);
    const awayTotal = deltas
      .filter((delta) => delta.teamId === "away")
      .reduce((sum, delta) => sum + delta.managerWpa, 0);

    expect(awayTotal).toBeCloseTo(0.75, 4);
    expect(
      deltas
        .filter((delta) => delta.teamId === "away")
        .every((delta) => Math.abs(delta.managerWpa) <= 0.25),
    ).toBe(true);
  });

  test("derives lineup deltas for both managers", () => {
    const deltas = deriveLineupDeltasWithSnapshots([
      createSparseKblWpaEvent({
        eventId: "game-1_wpa_1",
        playerId: "away-starter-1",
        teamId: "away",
        wpa: 0.2,
      }),
      createSparseKblWpaEvent({
        eventId: "game-1_wpa_2",
        playerId: "home-starter-1",
        teamId: "home",
        wpa: 0.2,
      }),
    ]);

    expect(deltas.some((delta) => delta.managerId === "away-manager")).toBe(true);
    expect(deltas.some((delta) => delta.managerId === "home-manager")).toBe(true);
    expect(deltas.filter((delta) => delta.teamId === "away")).toHaveLength(4);
    expect(deltas.filter((delta) => delta.teamId === "home")).toHaveLength(2);
  });

  test("does not derive lineup deltas until game end", () => {
    const state = deriveCommittedManagerDecisionState({
      gameId: "game-1",
      atBatEvents: [],
      startingLineups,
      awayTeamId: "away",
      homeTeamId: "home",
      awayManagerId: "away-manager",
      homeManagerId: "home-manager",
      gameEnded: false,
    });

    expect(state.managerLineupDeltas).toEqual([]);
  });

  test("keeps lineup delta separate from collapsed player KBL WPA leaderboard totals", () => {
    const atBatEvents = [
      createSparseKblWpaEvent({
        eventId: "game-1_wpa_1",
        playerId: "away-starter-1",
        playerName: "Away Starter 1",
        teamId: "away",
        wpa: 0.4,
      }),
    ];
    const deltas = deriveLineupDeltasWithSnapshots(atBatEvents);
    const credits = deriveKblWpaCredits({
      atBatEvents,
      startingLineups,
      awayTeamId: "away",
      homeTeamId: "home",
    });
    const leaderboard = aggregateKblWpaCredits(credits);

    expect(deltas.find((delta) => delta.starterPlayerId === "away-starter-1")?.managerWpa).toBe(0.1);
    expect(leaderboard.find((entry) => entry.playerId === "away-starter-1")?.totalWpa).toBe(0.4);
    expect(leaderboard.some((entry) => entry.playerId.includes("manager"))).toBe(false);
  });

  test("keeps deployment WPA separate from player KBL WPA leaderboards and Player of the Game", () => {
    const pinchHit = createBetweenPlay({
      eventId: "game-1_bp_1",
      eventIndex: 1,
      substitution: {
        subType: "pinch_hit",
        outPlayerId: "away-starter",
        inPlayerId: "away-bench",
        inPlayerName: "Away Bench",
      },
    });
    const tacticalPa = createAtBat({
      eventId: "game-1_2",
      eventIndex: 2,
      batterId: "away-bench",
      batterName: "Away Bench",
      batterTeamId: "away",
      wpa: 0.1,
    });
    const countedPa = createAtBat({
      eventId: "game-1_3",
      eventIndex: 3,
      batterId: "away-bench",
      batterName: "Away Bench",
      batterTeamId: "away",
      wpa: 0.4,
    });
    const state = derive([tacticalPa, countedPa], [pinchHit], {
      gameEnded: true,
    });
    const credits = deriveKblWpaCredits({
      atBatEvents: [tacticalPa, countedPa],
      betweenPlayEvents: [pinchHit],
      awayTeamId: "away",
      homeTeamId: "home",
      startingLineups,
    });
    const leaderboard = aggregateKblWpaCredits(credits);
    const playerTotal = leaderboard.find(
      (entry) => entry.playerId === "away-bench",
    )?.totalWpa;
    const playersOfTheGame = rankPlayersOfTheGame(
      {
        awayTeamId: "away",
        homeTeamId: "home",
        playerStats: {
          "away-bench": {
            playerName: "Away Bench",
            teamId: "away",
            pa: 2,
            ab: 2,
            h: 1,
            hr: 0,
            rbi: 0,
            r: 0,
            bb: 0,
            k: 0,
          },
        },
        pitcherGameStats: [],
      },
      [tacticalPa, countedPa],
      credits,
    );

    expect(state.managerDeploymentStints[0].managerDeploymentWpa).toBe(0.06);
    expect(playerTotal).toBeCloseTo(0.5, 5);
    expect(playerTotal).not.toBeCloseTo(
      0.5 + state.managerDeploymentStints[0].managerDeploymentWpa,
      5,
    );
    expect(leaderboard.some((entry) => entry.playerId.includes("manager"))).toBe(false);
    expect(playersOfTheGame[0]?.playerId).toBe("away-bench");
  });

  test("keeps IBB manager WPA separate from player KBL WPA leaderboards and Player of the Game", () => {
    const ibb = createAtBat({
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
    const homer = createAtBat({
      eventId: "game-1_2",
      eventIndex: 2,
      batterId: "away-next",
      batterName: "Away Next",
      batterTeamId: "away",
      runners: ibb.runnersAfter,
      result: "HR",
      runsScored: ["away-batter", "away-next"],
      rbiCount: 2,
      awayScoreAfter: 4,
      runnersAfter: { first: null, second: null, third: null },
      outsAfter: 1,
    });
    const state = derive([ibb, homer]);
    const ibbDecision = state.managerDecisions.find(
      (decision) => decision.decisionType === "intentional_walk",
    );
    const credits = deriveKblWpaCredits({
      atBatEvents: [ibb, homer],
      awayTeamId: "away",
      homeTeamId: "home",
      startingLineups,
    });
    const leaderboard = aggregateKblWpaCredits(credits);
    const playersOfTheGame = rankPlayersOfTheGame(
      {
        awayTeamId: "away",
        homeTeamId: "home",
        playerStats: {
          "away-next": {
            playerName: "Away Next",
            teamId: "away",
            pa: 1,
            ab: 1,
            h: 1,
            hr: 1,
            rbi: 2,
            r: 1,
            bb: 0,
            k: 0,
          },
          "away-batter": {
            playerName: "Away Batter",
            teamId: "away",
            pa: 1,
            ab: 0,
            h: 0,
            hr: 0,
            rbi: 0,
            r: 1,
            bb: 1,
            k: 0,
          },
        },
        pitcherGameStats: [],
      },
      [ibb, homer],
      credits,
    );

    expect(ibbDecision).toMatchObject({
      resolved: true,
      resolvedAtEventId: "game-1_2",
      managerWpa: expect.any(Number),
    });
    expect(leaderboard.some((entry) => entry.playerId.includes("manager"))).toBe(false);
    expect(playersOfTheGame.some((entry) => entry.playerId.includes("manager"))).toBe(false);
  });
});
