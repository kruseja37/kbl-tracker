import { describe, expect, test } from "vitest";

import { WPA_MODEL_VERSION } from "../../engines/wpaV2";
import type {
  ManagerLineupDeltaRecord,
  OptimalLineupGeneratedFrom,
  OptimalLineupSnapshot,
  OptimalLineupSourceConfidence,
} from "../../types/managerWpa";
import type {
  AtBatEvent,
  BetweenPlayEvent,
  FieldingEvent,
  GameHeader,
  RunnerInfo,
  RunnerState,
} from "../eventLog";
import {
  aggregateKblWpaCredits,
  deriveKblWpaCredits,
  type KblWpaCredit,
} from "../kblWpaAttribution";
import {
  deriveCommittedManagerDecisionState,
  type CommittedManagerDecisionState,
} from "../managerWpaGameState";
import { buildManagerValueTraceRows } from "../managerValueTrace";
import { rankPlayersOfTheGame } from "../playersOfTheGame";

const GAME_ID = "manager-value-golden";
const TOTAL_INNINGS = 9;
const TEAMS = {
  away: {
    teamId: "away",
    teamName: "Away Club",
    managerId: "away-manager",
  },
  home: {
    teamId: "home",
    teamName: "Home Club",
    managerId: "home-manager",
  },
} as const;

const STARTING_LINEUPS = {
  away: [
    {
      playerId: "away-leadoff",
      playerName: "Away Leadoff",
      position: "SS",
      battingOrder: 1,
    },
    {
      playerId: "away-cf",
      playerName: "Away Center",
      position: "CF",
      battingOrder: 2,
    },
    {
      playerId: "away-slugger",
      playerName: "Away Slugger",
      position: "1B",
      battingOrder: 3,
    },
    {
      playerId: "away-two-way",
      playerName: "Away Two-Way",
      position: "LF",
      battingOrder: 4,
    },
  ],
  home: [
    {
      playerId: "home-leadoff",
      playerName: "Home Leadoff",
      position: "2B",
      battingOrder: 1,
    },
    {
      playerId: "home-rf",
      playerName: "Home Right",
      position: "RF",
      battingOrder: 2,
    },
  ],
};

function runner(
  runnerId: string,
  runnerName = titleFromId(runnerId),
  responsiblePitcherId = "home-pitcher",
): RunnerInfo {
  return { runnerId, runnerName, responsiblePitcherId };
}

function emptyRunners(): RunnerState {
  return { first: null, second: null, third: null };
}

function runnerState(overrides: Partial<RunnerState>): RunnerState {
  return { ...emptyRunners(), ...overrides };
}

function gameHeader(overrides: Partial<GameHeader> = {}): GameHeader {
  return {
    gameId: GAME_ID,
    date: 1,
    awayTeamId: TEAMS.away.teamId,
    awayTeamName: TEAMS.away.teamName,
    homeTeamId: TEAMS.home.teamId,
    homeTeamName: TEAMS.home.teamName,
    startingLineups: STARTING_LINEUPS,
    startingPitchers: {
      away: { playerId: "away-pitcher", playerName: "Away Pitcher" },
      home: { playerId: "home-pitcher", playerName: "Home Pitcher" },
    },
    finalScore: null,
    finalInning: TOTAL_INNINGS,
    isComplete: false,
    aggregated: false,
    aggregatedAt: null,
    aggregationError: null,
    eventCount: 0,
    checksum: "",
    ...overrides,
  };
}

function atBat(overrides: Partial<AtBatEvent> = {}): AtBatEvent {
  const eventIndex = overrides.eventIndex ?? 1;
  const halfInning = overrides.halfInning ?? "TOP";
  const isTop = halfInning === "TOP";
  const batterTeamId =
    overrides.batterTeamId ?? (isTop ? TEAMS.away.teamId : TEAMS.home.teamId);
  const pitcherTeamId =
    overrides.pitcherTeamId ?? (isTop ? TEAMS.home.teamId : TEAMS.away.teamId);
  const batterId =
    overrides.batterId ?? (isTop ? "away-batter" : "home-batter");
  const pitcherId =
    overrides.pitcherId ?? (isTop ? "home-pitcher" : "away-pitcher");
  const awayScore = overrides.awayScore ?? 3;
  const homeScore = overrides.homeScore ?? 3;
  const outs = overrides.outs ?? 0;

  return {
    eventId: overrides.eventId ?? `${GAME_ID}_ab_${eventIndex}`,
    gameId: overrides.gameId ?? GAME_ID,
    eventIndex,
    timestamp: overrides.timestamp ?? eventIndex,
    batterId,
    batterName: overrides.batterName ?? titleFromId(batterId),
    batterTeamId,
    pitcherId,
    pitcherName: overrides.pitcherName ?? titleFromId(pitcherId),
    pitcherTeamId,
    result: "GO",
    rbiCount: 0,
    runsScored: [],
    inning: 7,
    halfInning,
    outs,
    runners: emptyRunners(),
    awayScore,
    homeScore,
    outsAfter: Math.min(3, outs + 1),
    runnersAfter: emptyRunners(),
    awayScoreAfter: awayScore,
    homeScoreAfter: homeScore,
    leverageIndex: 1.7,
    winProbabilityBefore: 0.5,
    winProbabilityAfter: 0.5,
    wpa: 0,
    ballInPlay: null,
    fameEvents: [],
    isLeadoff: false,
    isClutch: false,
    isWalkOff: false,
    totalInnings: TOTAL_INNINGS,
    ...overrides,
  };
}

function betweenPlay(
  overrides: Partial<BetweenPlayEvent> = {},
): BetweenPlayEvent {
  const eventIndex = overrides.eventIndex ?? 1;

  return {
    eventId: overrides.eventId ?? `${GAME_ID}_bp_${eventIndex}`,
    gameId: overrides.gameId ?? GAME_ID,
    eventIndex,
    timestamp: overrides.timestamp ?? eventIndex,
    type: "substitution",
    gameState: {
      inning: 7,
      halfInning: "TOP",
      outs: 0,
      score: { away: 3, home: 3 },
      runnersOn: {},
    },
    substitution: {
      subType: "pinch_hit",
      outPlayerId: "away-starter",
      outPlayerName: "Away Starter",
      inPlayerId: "away-bench",
      inPlayerName: "Away Bench",
    },
    ...overrides,
  };
}

function promptedKeepCurrent(
  overrides: Partial<BetweenPlayEvent> & {
    decisionType: "leave_pitcher_in" | "let_batter_hit";
    trackedPlayerId: string;
    trackedPlayerName?: string;
    teamId: string;
    managerId: string;
    opponentTeamId: string;
    provenanceKey: string;
  },
): BetweenPlayEvent {
  const action =
    overrides.decisionType === "leave_pitcher_in"
      ? "keep_pitcher"
      : "let_batter_hit";

  return betweenPlay({
    ...overrides,
    type: "manager_moment",
    substitution: undefined,
    pitcherChange: undefined,
    managerMoment: {
      leverageIndex: 2.4,
      decisionType: overrides.decisionType,
      context: overrides.provenanceKey,
    },
    promptedManagerDecision: {
      decisionType: overrides.decisionType,
      action,
      source: "recommendation",
      decisionSource: "situational_prompt",
      confidence: "high",
      managerId: overrides.managerId,
      teamId: overrides.teamId,
      opponentTeamId: overrides.opponentTeamId,
      trackedPlayerIds: [overrides.trackedPlayerId],
      involvedPlayerIds: [overrides.trackedPlayerId],
      playerId: overrides.trackedPlayerId,
      playerName:
        overrides.trackedPlayerName ?? titleFromId(overrides.trackedPlayerId),
      leverageIndex: 2.4,
      recommendationId: `rec-${overrides.provenanceKey}`,
      provenanceKey: overrides.provenanceKey,
      resolution: {
        status: "pending",
        expectedEndpoint: "next_pa",
      },
    },
  });
}

function fieldingEvent(
  overrides: Partial<FieldingEvent> & {
    atBatEventId: string;
    playerId: string;
    teamId: string;
  },
): FieldingEvent {
  return {
    fieldingEventId:
      overrides.fieldingEventId ??
      `${overrides.atBatEventId}_fielding_${overrides.playerId}`,
    gameId: overrides.gameId ?? GAME_ID,
    atBatEventId: overrides.atBatEventId,
    sequence: overrides.sequence ?? 1,
    playerId: overrides.playerId,
    playerName: overrides.playerName ?? titleFromId(overrides.playerId),
    position: overrides.position ?? "CF",
    teamId: overrides.teamId,
    playType: overrides.playType ?? "putout",
    difficulty: overrides.difficulty ?? "routine",
    ballInPlay: overrides.ballInPlay ?? {
      trajectory: "fly",
      zone: 8,
      velocity: "medium",
      fielderIds: [overrides.playerId],
      primaryFielderId: overrides.playerId,
    },
    success: overrides.success ?? true,
    runsPreventedOrAllowed: overrides.runsPreventedOrAllowed ?? 0,
    ...overrides,
  };
}

function sparseWpaEvent(input: {
  eventId: string;
  eventIndex?: number;
  playerId: string;
  playerName?: string;
  teamId: string;
  wpa: number;
}): AtBatEvent {
  return {
    eventId: input.eventId,
    gameId: GAME_ID,
    eventIndex:
      input.eventIndex ?? (Number(input.eventId.replace(/\D+/g, "")) || 1),
    timestamp: 1,
    batterId: input.playerId,
    batterName: input.playerName ?? titleFromId(input.playerId),
    batterTeamId: input.teamId,
    wpa: input.wpa,
  } as AtBatEvent;
}

function lineupSnapshot(input: {
  teamId: string;
  snapshotId: string;
  generatedFrom?: OptimalLineupGeneratedFrom;
  sourceConfidence?: OptimalLineupSourceConfidence;
  slots: Array<{
    playerId: string;
    playerName?: string;
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
    algorithmVersion: "golden-optimal-v2",
    generatedAt: 1,
    generatedFrom: input.generatedFrom ?? "user_registered_smb4_optimal",
    sourceConfidence: input.sourceConfidence ?? "user_registered",
    dhEnabled: false,
    slots: input.slots.map((slot) => ({
      playerId: slot.playerId,
      playerName: slot.playerName ?? titleFromId(slot.playerId),
      battingOrderSlot: slot.battingOrderSlot,
      defensivePosition: slot.defensivePosition,
      projectedSlotKblWpa: slot.projectedSlotKblWpa,
      projectedValueScore: 60,
      positionalFitScore: 1,
      confidence: "medium",
    })),
    projectedTeamLineupKblWpa: roundWpa(
      input.slots.reduce((sum, slot) => sum + slot.projectedSlotKblWpa, 0),
    ),
    confidence: "medium",
  };
}

function deriveState(input: {
  atBatEvents?: AtBatEvent[];
  betweenPlayEvents?: BetweenPlayEvent[];
  fieldingEvents?: FieldingEvent[];
  startingLineups?: GameHeader["startingLineups"];
  optimalLineupSnapshots?: GameHeader["optimalLineupSnapshots"];
  chosenLineupSnapshots?: GameHeader["chosenLineupSnapshots"];
  gameEnded?: boolean;
}): CommittedManagerDecisionState {
  const header = gameHeader({
    startingLineups: input.startingLineups ?? STARTING_LINEUPS,
    optimalLineupSnapshots: input.optimalLineupSnapshots,
    chosenLineupSnapshots: input.chosenLineupSnapshots,
    isComplete: input.gameEnded ?? false,
  });

  return deriveCommittedManagerDecisionState({
    gameId: header.gameId,
    atBatEvents: input.atBatEvents ?? [],
    betweenPlayEvents: input.betweenPlayEvents ?? [],
    fieldingEvents: input.fieldingEvents ?? [],
    startingLineups: header.startingLineups,
    startingPitchers: header.startingPitchers,
    optimalLineupSnapshots: header.optimalLineupSnapshots,
    chosenLineupSnapshots: header.chosenLineupSnapshots,
    awayTeamId: header.awayTeamId,
    homeTeamId: header.homeTeamId,
    awayManagerId: TEAMS.away.managerId,
    homeManagerId: TEAMS.home.managerId,
    totalInnings: TOTAL_INNINGS,
    gameEnded: input.gameEnded ?? false,
  });
}

function requireDecision(
  state: CommittedManagerDecisionState,
  decisionType: string,
  decisionEventId?: string,
) {
  const record = state.managerDecisions.find(
    (decision) =>
      decision.decisionType === decisionType &&
      (!decisionEventId || decision.decisionEventId === decisionEventId),
  );
  expect(record).toBeDefined();
  return record!;
}

function requireStint(
  state: CommittedManagerDecisionState,
  predicate: (stint: CommittedManagerDecisionState["managerDeploymentStints"][number]) => boolean,
) {
  const record = state.managerDeploymentStints.find(predicate);
  expect(record).toBeDefined();
  return record!;
}

function layerTotals(state: CommittedManagerDecisionState, managerId: string) {
  return {
    tactical: roundWpa(
      state.managerDecisions
        .filter((decision) => decision.managerId === managerId)
        .reduce((sum, decision) => sum + (decision.managerWpa ?? 0), 0),
    ),
    deployment: roundWpa(
      state.managerDeploymentStints
        .filter((stint) => stint.managerId === managerId)
        .reduce((sum, stint) => sum + stint.managerDeploymentWpa, 0),
    ),
    lineup: roundWpa(
      state.managerLineupDeltas
        .filter((delta) => delta.managerId === managerId)
        .reduce((sum, delta) => sum + delta.managerWpa, 0),
    ),
  };
}

function expectLayerTotals(
  state: CommittedManagerDecisionState,
  managerId: string,
  expected: Partial<ReturnType<typeof layerTotals>>,
) {
  const actual = layerTotals(state, managerId);
  for (const [layer, expectedValue] of Object.entries(expected)) {
    expect(actual[layer as keyof typeof actual]).toBeCloseTo(expectedValue, 5);
  }
}

function expectStableTraceRows(state: CommittedManagerDecisionState) {
  const first = buildManagerValueTraceRows({
    managerDecisions: state.managerDecisions,
    managerDeploymentStints: state.managerDeploymentStints,
    managerLineupDeltas: state.managerLineupDeltas,
  });
  const second = buildManagerValueTraceRows({
    managerLineupDeltas: [...state.managerLineupDeltas].reverse(),
    managerDeploymentStints: [...state.managerDeploymentStints].reverse(),
    managerDecisions: [...state.managerDecisions].reverse(),
  });

  expect(first).toEqual(second);
  for (const row of first) {
    expect(row.description.trim().length).toBeGreaterThan(0);
  }
  return first;
}

function playerTotalMap(credits: KblWpaCredit[]): Record<string, number> {
  return Object.fromEntries(
    aggregateKblWpaCredits(credits).map((entry) => [
      entry.playerId,
      entry.totalWpa,
    ]),
  );
}

function expectPlayerKblWpaGuardrails(input: {
  atBatEvents: AtBatEvent[];
  betweenPlayEvents?: BetweenPlayEvent[];
  fieldingEvents?: FieldingEvent[];
}) {
  const baseCredits = deriveKblWpaCredits({
    ...input,
    awayTeamId: TEAMS.away.teamId,
    homeTeamId: TEAMS.home.teamId,
    startingLineups: STARTING_LINEUPS,
    totalInnings: TOTAL_INNINGS,
  });
  const overlayCredits = deriveKblWpaCredits({
    ...input,
    awayTeamId: TEAMS.away.teamId,
    homeTeamId: TEAMS.home.teamId,
    startingLineups: STARTING_LINEUPS,
    totalInnings: TOTAL_INNINGS,
    includeManagerOverlays: true,
  });

  expect(overlayCredits.some((credit) => credit.isOverlay)).toBe(true);
  expect(playerTotalMap(overlayCredits)).toEqual(playerTotalMap(baseCredits));
  expect(
    aggregateKblWpaCredits(overlayCredits).some((entry) =>
      entry.playerId.includes("manager"),
    ),
  ).toBe(false);

  return { baseCredits, overlayCredits };
}

function officialDeviationSnapshots(
  overrides: Partial<{
    optimalGeneratedFrom: OptimalLineupGeneratedFrom;
    optimalSourceConfidence: OptimalLineupSourceConfidence;
  }> = {},
) {
  return {
    optimal: lineupSnapshot({
      teamId: TEAMS.away.teamId,
      snapshotId: "away-official-optimal",
      generatedFrom: overrides.optimalGeneratedFrom,
      sourceConfidence: overrides.optimalSourceConfidence,
      slots: [
        {
          playerId: "away-optimal-cf",
          playerName: "Away Optimal CF",
          battingOrderSlot: 1,
          defensivePosition: "CF",
          projectedSlotKblWpa: 0.05,
        },
      ],
    }),
    chosen: lineupSnapshot({
      teamId: TEAMS.away.teamId,
      snapshotId: "away-chosen-deviation",
      slots: [
        {
          playerId: "away-cf",
          playerName: "Away Center",
          battingOrderSlot: 1,
          defensivePosition: "CF",
          projectedSlotKblWpa: -0.05,
        },
      ],
    }),
  };
}

function awayLineupDeltas(
  state: CommittedManagerDecisionState,
): ManagerLineupDeltaRecord[] {
  return state.managerLineupDeltas.filter(
    (delta) => delta.teamId === TEAMS.away.teamId,
  );
}

function titleFromId(value: string): string {
  return value
    .split(/[-_:]+/)
    .filter(Boolean)
    .map((part) => part[0]?.toUpperCase() + part.slice(1))
    .join(" ");
}

function roundWpa(value: number): number {
  return Math.round(value * 10000) / 10000;
}

describe("Manager Value golden fixtures", () => {
  test.each([
    {
      label: "walked runner scores after the next batter is retired",
      finalConsequence: "scored" as const,
    },
    {
      label: "walked runner is stranded when the half-inning ends",
      finalConsequence: "stranded" as const,
    },
  ])(
    "IBB inning consequence resolves at final consequence when $label",
    ({ finalConsequence }) => {
      const walkedRunner = runner("away-slugger", "Away Slugger");
      const ibb = atBat({
        eventId: `${GAME_ID}_ibb`,
        eventIndex: 10,
        result: "IBB",
        batterId: "away-slugger",
        batterName: "Away Slugger",
        pitcherId: "home-pitcher",
        pitcherName: "Home Pitcher",
        outs: 1,
        outsAfter: 1,
        runnersAfter: runnerState({ first: walkedRunner }),
        wpaModelVersion: WPA_MODEL_VERSION,
      });
      const nextBatterOut = atBat({
        eventId: `${GAME_ID}_after_ibb_out`,
        eventIndex: 11,
        result: "GO",
        batterId: "away-next",
        batterName: "Away Next",
        outs: 1,
        outsAfter: 2,
        runners: ibb.runnersAfter,
        runnersAfter: ibb.runnersAfter,
        wpaModelVersion: WPA_MODEL_VERSION,
      });
      const finalEvent =
        finalConsequence === "scored"
          ? atBat({
              eventId: `${GAME_ID}_ibb_runner_scores`,
              eventIndex: 12,
              result: "2B",
              batterId: "away-third",
              batterName: "Away Third",
              outs: 2,
              outsAfter: 2,
              runners: nextBatterOut.runnersAfter,
              runnersAfter: runnerState({
                second: runner("away-third", "Away Third"),
              }),
              runnerOutcomes: [
                {
                  runnerId: "away-slugger",
                  runnerName: "Away Slugger",
                  fromBase: "first",
                  toBase: "home",
                },
              ],
              runsScored: ["away-slugger"],
              rbiCount: 1,
              awayScoreAfter: 4,
              wpaModelVersion: WPA_MODEL_VERSION,
            })
          : atBat({
              eventId: `${GAME_ID}_ibb_runner_stranded`,
              eventIndex: 12,
              result: "FO",
              batterId: "away-third",
              batterName: "Away Third",
              outs: 2,
              outsAfter: 3,
              runners: nextBatterOut.runnersAfter,
              runnersAfter: emptyRunners(),
              wpaModelVersion: WPA_MODEL_VERSION,
            });

      const state = deriveState({
        atBatEvents: [ibb, nextBatterOut, finalEvent],
        gameEnded: finalConsequence === "stranded",
      });
      const decision = requireDecision(state, "intentional_walk", ibb.eventId);

      expect(decision).toMatchObject({
        managerId: TEAMS.home.managerId,
        teamId: TEAMS.home.teamId,
        opponentTeamId: TEAMS.away.teamId,
        resolved: true,
        resolvedAtEventId: finalEvent.eventId,
        resolutionWindow: {
          expectedEndpoint: "runner_consequence",
          status: "resolved",
        },
      });
      expect(decision.linkedEventIds).toEqual([
        ibb.eventId,
        nextBatterOut.eventId,
        finalEvent.eventId,
      ]);
      expect(decision.explanationMetadata?.intentionalWalk).toMatchObject({
        walkedRunnerId: "away-slugger",
        nextBatterEventId: nextBatterOut.eventId,
        finalConsequenceEventId: finalEvent.eventId,
        finalConsequence,
      });
      expect(decision.managerWpa).toEqual(expect.any(Number));
      if (finalConsequence === "scored") {
        expect(decision.managerWpa).toBeLessThan(0);
      } else {
        expect(decision.managerWpa).toBeGreaterThan(0);
      }

      const [trace] = buildManagerValueTraceRows({
        managerDecisions: [decision],
      });
      expect(trace.endpointEventId).toBe(finalEvent.eventId);
      expect(trace.description).toContain(
        finalConsequence === "scored"
          ? "the walked runner scored"
          : "the walked runner was stranded",
      );
    },
  );

  test("leave-pitcher-in resolves the immediate PA and scores only later kept-pitcher deployment", () => {
    const prompt = promptedKeepCurrent({
      eventId: `${GAME_ID}_keep_pitcher_prompt`,
      eventIndex: 20,
      decisionType: "leave_pitcher_in",
      trackedPlayerId: "home-starter",
      trackedPlayerName: "Home Starter",
      teamId: TEAMS.home.teamId,
      managerId: TEAMS.home.managerId,
      opponentTeamId: TEAMS.away.teamId,
      provenanceKey: "golden-keep-home-starter",
      gameState: {
        inning: 7,
        halfInning: "TOP",
        outs: 0,
        score: { away: 3, home: 3 },
        runnersOn: { first: "away-runner" },
      },
    });
    const tacticalPa = atBat({
      eventId: `${GAME_ID}_keep_pitcher_tactical`,
      eventIndex: 21,
      result: "GO",
      pitcherId: "home-starter",
      pitcherName: "Home Starter",
      outs: 0,
      outsAfter: 1,
      runners: runnerState({ first: runner("away-runner", "Away Runner") }),
      runnersAfter: runnerState({
        second: runner("away-runner", "Away Runner"),
      }),
      wpaModelVersion: WPA_MODEL_VERSION,
    });
    const laterPa = atBat({
      eventId: `${GAME_ID}_keep_pitcher_later`,
      eventIndex: 22,
      result: "K",
      pitcherId: "home-starter",
      pitcherName: "Home Starter",
      outs: 1,
      outsAfter: 2,
      wpaModelVersion: WPA_MODEL_VERSION,
    });

    const state = deriveState({
      atBatEvents: [tacticalPa, laterPa],
      betweenPlayEvents: [prompt],
      gameEnded: true,
    });
    const decision = requireDecision(state, "leave_pitcher_in", prompt.eventId);
    const stint = requireStint(
      state,
      (record) => record.deploymentRole === "kept_pitcher_in",
    );

    expect(decision).toMatchObject({
      resolved: true,
      resolvedAtEventId: tacticalPa.eventId,
      teamId: TEAMS.home.teamId,
    });
    expect(stint).toMatchObject({
      deploymentRole: "kept_pitcher_in",
      playerId: "home-starter",
      managerId: TEAMS.home.managerId,
      openedAtEventIndex: tacticalPa.eventIndex,
      tacticalExclusionEventIds: [tacticalPa.eventId],
      linkedEventIds: [laterPa.eventId],
    });
    expect(stint.linkedOutcomes).toEqual([
      expect.objectContaining({
        eventId: laterPa.eventId,
        role: "pitching",
        weight: 1,
      }),
    ]);
    expect(stint.rawLinkedWpa).not.toBe(0);
    expectLayerTotals(state, TEAMS.home.managerId, {
      deployment: stint.managerDeploymentWpa,
    });
  });

  test("let-batter-hit creates kept-position-player deployment for later batting, running, and fielding but not pitching", () => {
    const prompt = promptedKeepCurrent({
      eventId: `${GAME_ID}_let_batter_prompt`,
      eventIndex: 30,
      decisionType: "let_batter_hit",
      trackedPlayerId: "away-two-way",
      trackedPlayerName: "Away Two-Way",
      teamId: TEAMS.away.teamId,
      managerId: TEAMS.away.managerId,
      opponentTeamId: TEAMS.home.teamId,
      provenanceKey: "golden-let-two-way-hit",
      gameState: {
        inning: 7,
        halfInning: "TOP",
        outs: 0,
        score: { away: 3, home: 3 },
        runnersOn: {},
      },
    });
    const tacticalPa = atBat({
      eventId: `${GAME_ID}_let_batter_tactical`,
      eventIndex: 31,
      result: "K",
      batterId: "away-two-way",
      batterName: "Away Two-Way",
      outs: 0,
      outsAfter: 1,
      wpaModelVersion: WPA_MODEL_VERSION,
    });
    const laterBatting = atBat({
      eventId: `${GAME_ID}_let_batter_later_bat`,
      eventIndex: 32,
      result: "2B",
      batterId: "away-two-way",
      batterName: "Away Two-Way",
      outs: 1,
      outsAfter: 1,
      runnersAfter: runnerState({
        second: runner("away-two-way", "Away Two-Way"),
      }),
      wpaModelVersion: WPA_MODEL_VERSION,
    });
    const laterBaserunning = atBat({
      eventId: `${GAME_ID}_let_batter_later_run`,
      eventIndex: 33,
      result: "1B",
      batterId: "away-cleanup",
      batterName: "Away Cleanup",
      outs: 1,
      outsAfter: 1,
      runners: runnerState({
        second: runner("away-two-way", "Away Two-Way"),
      }),
      runnersAfter: runnerState({
        first: runner("away-cleanup", "Away Cleanup"),
      }),
      runnerOutcomes: [
        {
          runnerId: "away-two-way",
          runnerName: "Away Two-Way",
          fromBase: "second",
          toBase: "home",
        },
      ],
      runsScored: ["away-two-way"],
      rbiCount: 1,
      awayScoreAfter: 4,
      wpaModelVersion: WPA_MODEL_VERSION,
    });
    const laterFielding = atBat({
      eventId: `${GAME_ID}_let_batter_later_field`,
      eventIndex: 34,
      halfInning: "BOTTOM",
      result: "GO",
      batterId: "home-batter",
      batterName: "Home Batter",
      batterTeamId: TEAMS.home.teamId,
      pitcherId: "away-pitcher",
      pitcherName: "Away Pitcher",
      pitcherTeamId: TEAMS.away.teamId,
      outs: 0,
      outsAfter: 1,
      ballInPlay: {
        trajectory: "ground",
        zone: 6,
        velocity: "medium",
        fielderIds: ["away-two-way"],
        primaryFielderId: "away-two-way",
      },
      enrichment: { fieldingSequence: [6], fieldingPlayType: "routine" },
      wpaModelVersion: WPA_MODEL_VERSION,
    });
    const laterPitching = atBat({
      eventId: `${GAME_ID}_let_batter_later_pitch`,
      eventIndex: 35,
      halfInning: "BOTTOM",
      result: "K",
      batterId: "home-other",
      batterName: "Home Other",
      batterTeamId: TEAMS.home.teamId,
      pitcherId: "away-two-way",
      pitcherName: "Away Two-Way",
      pitcherTeamId: TEAMS.away.teamId,
      outs: 1,
      outsAfter: 2,
      wpaModelVersion: WPA_MODEL_VERSION,
    });
    const fieldingEvents = [
      fieldingEvent({
        fieldingEventId: `${GAME_ID}_field_kept_position`,
        atBatEventId: laterFielding.eventId,
        playerId: "away-two-way",
        playerName: "Away Two-Way",
        position: "SS",
        teamId: TEAMS.away.teamId,
        ballInPlay: laterFielding.ballInPlay!,
      }),
    ];
    const atBatEvents = [
      tacticalPa,
      laterBatting,
      laterBaserunning,
      laterFielding,
      laterPitching,
    ];
    const state = deriveState({
      atBatEvents,
      betweenPlayEvents: [prompt],
      fieldingEvents,
      gameEnded: true,
    });
    const credits = deriveKblWpaCredits({
      atBatEvents,
      fieldingEvents,
      awayTeamId: TEAMS.away.teamId,
      homeTeamId: TEAMS.home.teamId,
      totalInnings: TOTAL_INNINGS,
    });
    const roleTotal = (role: string, eventId?: string) =>
      credits
        .filter(
          (credit) =>
            credit.playerId === "away-two-way" &&
            credit.teamId === TEAMS.away.teamId &&
            credit.role === role &&
            (!eventId || credit.eventId === eventId),
        )
        .reduce((sum, credit) => sum + credit.wpa, 0);
    const stint = requireStint(
      state,
      (record) => record.deploymentRole === "kept_position_player_in",
    );

    expect(requireDecision(state, "let_batter_hit", prompt.eventId)).toMatchObject({
      resolved: true,
      resolvedAtEventId: tacticalPa.eventId,
    });
    expect(roleTotal("batting", laterBatting.eventId)).not.toBe(0);
    expect(roleTotal("baserunning", laterBaserunning.eventId)).not.toBe(0);
    expect(roleTotal("fielding", laterFielding.eventId)).not.toBe(0);
    expect(roleTotal("pitching", laterPitching.eventId)).not.toBe(0);
    expect(stint).toMatchObject({
      deploymentRole: "kept_position_player_in",
      tacticalExclusionEventIds: [tacticalPa.eventId],
    });
    expect(stint.linkedEventIds).toEqual([
      laterBatting.eventId,
      laterBaserunning.eventId,
      laterFielding.eventId,
    ]);
    expect(stint.linkedOutcomes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          eventId: laterBatting.eventId,
          role: "batting",
          weight: 1,
        }),
        expect.objectContaining({
          eventId: laterBaserunning.eventId,
          role: "baserunning",
          weight: 1,
        }),
        expect.objectContaining({
          eventId: laterFielding.eventId,
          role: "fielding",
          weight: 0.75,
        }),
      ]),
    );
    expect(
      stint.linkedOutcomes?.some(
        (outcome) =>
          outcome.eventId === laterPitching.eventId &&
          outcome.role === "pitching",
      ),
    ).toBe(false);
  });

  test("PH to PR chain keeps tactical windows out of later deployment value", () => {
    const pinchHit = betweenPlay({
      eventId: `${GAME_ID}_ph`,
      eventIndex: 40,
      substitution: {
        subType: "pinch_hit",
        outPlayerId: "away-starter",
        outPlayerName: "Away Starter",
        inPlayerId: "away-ph",
        inPlayerName: "Away PH",
      },
    });
    const phTacticalPa = atBat({
      eventId: `${GAME_ID}_ph_tactical_triple`,
      eventIndex: 41,
      result: "3B",
      batterId: "away-ph",
      batterName: "Away PH",
      outs: 0,
      outsAfter: 0,
      runnersAfter: runnerState({
        third: runner("away-ph", "Away PH"),
      }),
      wpa: 0.35,
    });
    const pinchRun = betweenPlay({
      eventId: `${GAME_ID}_pr`,
      eventIndex: 42,
      substitution: {
        subType: "pinch_run",
        outPlayerId: "away-ph",
        outPlayerName: "Away PH",
        inPlayerId: "away-pr",
        inPlayerName: "Away PR",
      },
      gameState: {
        inning: 7,
        halfInning: "TOP",
        outs: 0,
        score: { away: 3, home: 3 },
        runnersOn: { third: "away-ph" },
      },
    });
    const stealHome = betweenPlay({
      eventId: `${GAME_ID}_pr_steal_home`,
      eventIndex: 43,
      type: "stolen_base",
      substitution: undefined,
      gameState: {
        inning: 7,
        halfInning: "TOP",
        outs: 0,
        score: { away: 3, home: 3 },
        runnersOn: { third: "away-pr" },
      },
      runnerAction: {
        runnerId: "away-pr",
        runnerName: "Away PR",
        fromBase: 3,
        toBase: 4,
        outcome: "safe",
        reason: "stolen_base",
      },
      stolenBase: {
        runnerId: "away-pr",
        runnerName: "Away PR",
        fromBase: 3,
        toBase: 4,
        isSuccessful: true,
      },
    });
    const prLaterPa = atBat({
      eventId: `${GAME_ID}_pr_later_bat`,
      eventIndex: 44,
      result: "1B",
      batterId: "away-pr",
      batterName: "Away PR",
      outs: 0,
      outsAfter: 0,
      awayScore: 4,
      homeScore: 3,
      awayScoreAfter: 4,
      homeScoreAfter: 3,
      runnersAfter: runnerState({
        first: runner("away-pr", "Away PR"),
      }),
      wpa: 0.25,
    });

    const state = deriveState({
      atBatEvents: [phTacticalPa, prLaterPa],
      betweenPlayEvents: [pinchHit, pinchRun, stealHome],
      gameEnded: true,
    });
    const phDecision = requireDecision(state, "pinch_hitter", pinchHit.eventId);
    const prDecision = requireDecision(state, "pinch_runner", pinchRun.eventId);
    const phStint = requireStint(
      state,
      (record) => record.deploymentRole === "pinch_hitter_remaining",
    );
    const prStint = requireStint(
      state,
      (record) => record.deploymentRole === "pinch_runner",
    );

    expect(phDecision).toMatchObject({
      resolved: true,
      resolvedAtEventId: phTacticalPa.eventId,
    });
    expect(prDecision).toMatchObject({
      resolved: true,
      resolvedAtEventId: stealHome.eventId,
    });
    expect(phStint).toMatchObject({
      closeReason: "removed",
      closedAtEventId: pinchRun.eventId,
      tacticalExclusionEventIds: [phTacticalPa.eventId],
      linkedEventIds: [],
      rawLinkedWpa: 0,
    });
    expect(prStint).toMatchObject({
      closeReason: "game_end",
      tacticalExclusionEventIds: [stealHome.eventId],
      linkedEventIds: [prLaterPa.eventId],
      rawLinkedWpa: 0.25,
      managerDeploymentWpa: 0.05,
    });
  });

  test("defensive sub and position-change stints transition after first fielding chances", () => {
    const defensiveSub = betweenPlay({
      eventId: `${GAME_ID}_def_sub`,
      eventIndex: 50,
      type: "substitution",
      substitution: {
        subType: "defensive_replacement",
        outPlayerId: "home-lf-old",
        outPlayerName: "Home LF Old",
        inPlayerId: "home-glove",
        inPlayerName: "Home Glove",
        inPosition: "LF",
      },
    });
    const lfTactical = atBat({
      eventId: `${GAME_ID}_lf_tactical`,
      eventIndex: 51,
      result: "FO",
      outs: 0,
      outsAfter: 1,
      ballInPlay: {
        trajectory: "fly",
        zone: 7,
        velocity: "medium",
        fielderIds: ["home-glove"],
        primaryFielderId: "home-glove",
      },
      enrichment: { fieldingSequence: [7], fieldingPlayType: "routine" },
      wpaModelVersion: WPA_MODEL_VERSION,
    });
    const lfLater = atBat({
      eventId: `${GAME_ID}_lf_later`,
      eventIndex: 52,
      result: "FO",
      outs: 1,
      outsAfter: 2,
      ballInPlay: {
        trajectory: "fly",
        zone: 7,
        velocity: "medium",
        fielderIds: ["home-glove"],
        primaryFielderId: "home-glove",
      },
      enrichment: { fieldingSequence: [7], fieldingPlayType: "routine" },
      wpaModelVersion: WPA_MODEL_VERSION,
    });
    const positionChange = betweenPlay({
      eventId: `${GAME_ID}_position_change`,
      eventIndex: 53,
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
      gameState: {
        inning: 7,
        halfInning: "TOP",
        outs: 2,
        score: { away: 3, home: 3 },
        runnersOn: {},
      },
    });
    const cfTactical = atBat({
      eventId: `${GAME_ID}_cf_tactical`,
      eventIndex: 54,
      result: "1B",
      outs: 2,
      outsAfter: 2,
      runnersAfter: runnerState({
        first: runner("away-batter", "Away Batter"),
      }),
      ballInPlay: {
        trajectory: "line",
        zone: 8,
        velocity: "hard",
        fielderIds: ["home-glove"],
        primaryFielderId: "home-glove",
      },
      wpaModelVersion: WPA_MODEL_VERSION,
    });
    const cfLater = atBat({
      eventId: `${GAME_ID}_cf_later`,
      eventIndex: 55,
      result: "FO",
      outs: 2,
      outsAfter: 3,
      ballInPlay: {
        trajectory: "fly",
        zone: 8,
        velocity: "medium",
        fielderIds: ["home-glove"],
        primaryFielderId: "home-glove",
      },
      enrichment: { fieldingSequence: [8], fieldingPlayType: "routine" },
      wpaModelVersion: WPA_MODEL_VERSION,
    });
    const fieldingEvents = [
      fieldingEvent({
        fieldingEventId: `${GAME_ID}_field_lf_tactical`,
        atBatEventId: lfTactical.eventId,
        playerId: "home-glove",
        playerName: "Home Glove",
        position: "LF",
        teamId: TEAMS.home.teamId,
        ballInPlay: lfTactical.ballInPlay!,
      }),
      fieldingEvent({
        fieldingEventId: `${GAME_ID}_field_lf_later`,
        atBatEventId: lfLater.eventId,
        playerId: "home-glove",
        playerName: "Home Glove",
        position: "LF",
        teamId: TEAMS.home.teamId,
        ballInPlay: lfLater.ballInPlay!,
      }),
      fieldingEvent({
        fieldingEventId: `${GAME_ID}_field_cf_tactical`,
        atBatEventId: cfTactical.eventId,
        playerId: "home-glove",
        playerName: "Home Glove",
        position: "CF",
        teamId: TEAMS.home.teamId,
        ballInPlay: cfTactical.ballInPlay!,
      }),
      fieldingEvent({
        fieldingEventId: `${GAME_ID}_field_cf_later`,
        atBatEventId: cfLater.eventId,
        playerId: "home-glove",
        playerName: "Home Glove",
        position: "CF",
        teamId: TEAMS.home.teamId,
        ballInPlay: cfLater.ballInPlay!,
      }),
    ];

    const state = deriveState({
      atBatEvents: [lfTactical, lfLater, cfTactical, cfLater],
      betweenPlayEvents: [defensiveSub, positionChange],
      fieldingEvents,
      gameEnded: true,
    });
    const subDecision = requireDecision(
      state,
      "defensive_sub",
      defensiveSub.eventId,
    );
    const changeDecision = requireDecision(
      state,
      "position_change",
      positionChange.eventId,
    );
    const lfStint = requireStint(
      state,
      (record) =>
        record.deploymentRole === "defensive_position" &&
        record.trackedPosition === "LF",
    );
    const cfStint = requireStint(
      state,
      (record) =>
        record.deploymentRole === "defensive_position" &&
        record.trackedPosition === "CF",
    );

    expect(subDecision).toMatchObject({
      resolved: true,
      resolvedAtEventId: `${GAME_ID}_field_lf_tactical`,
    });
    expect(changeDecision).toMatchObject({
      resolved: true,
      resolvedAtEventId: `${GAME_ID}_field_cf_tactical`,
    });
    expect(lfStint).toMatchObject({
      closeReason: "role_change",
      closedAtEventId: positionChange.eventId,
      tacticalExclusionEventIds: [lfTactical.eventId],
      linkedEventIds: [lfLater.eventId],
    });
    expect(cfStint).toMatchObject({
      closeReason: "game_end",
      openedAtEventIndex: cfTactical.eventIndex,
      tacticalExclusionEventIds: [cfTactical.eventId],
      linkedEventIds: [cfLater.eventId],
    });
  });

  test("Lineup Delta officiality distinguishes valid benchmarks, exact optimal, display-only snapshots, and batting-order deviations", () => {
    const lineupEvents = [
      sparseWpaEvent({
        eventId: `${GAME_ID}_lineup_wpa`,
        playerId: "away-cf",
        playerName: "Away Center",
        teamId: TEAMS.away.teamId,
        wpa: 0,
      }),
    ];
    const userRegistered = officialDeviationSnapshots();
    const userConfirmed = officialDeviationSnapshots({
      optimalGeneratedFrom: "team_hub",
      optimalSourceConfidence: "user_confirmed_engine",
    });

    for (const { optimal, chosen } of [userRegistered, userConfirmed]) {
      const state = deriveState({
        atBatEvents: lineupEvents,
        optimalLineupSnapshots: { away: optimal },
        chosenLineupSnapshots: { away: chosen },
        gameEnded: true,
      });
      const [delta] = awayLineupDeltas(state);

      expect(delta).toMatchObject({
        decisionType: "lineup_construction",
        replacementBaselineSource: "optimal_lineup_v2",
        optimalSnapshotId: optimal.snapshotId,
        confidence: "high",
      });
      expectLayerTotals(state, TEAMS.away.managerId, {
        lineup: delta.managerWpa,
      });
    }

    const exactOptimal = lineupSnapshot({
      teamId: TEAMS.away.teamId,
      snapshotId: "away-exact-optimal",
      slots: [
        {
          playerId: "away-cf",
          playerName: "Away Center",
          battingOrderSlot: 1,
          defensivePosition: "CF",
          projectedSlotKblWpa: 0.05,
        },
      ],
    });
    expect(
      awayLineupDeltas(
        deriveState({
          atBatEvents: [
            sparseWpaEvent({
              eventId: `${GAME_ID}_exact_underperform`,
              playerId: "away-cf",
              playerName: "Away Center",
              teamId: TEAMS.away.teamId,
              wpa: -0.5,
            }),
          ],
          optimalLineupSnapshots: { away: exactOptimal },
          chosenLineupSnapshots: { away: exactOptimal },
          gameEnded: true,
        }),
      ),
    ).toEqual([]);

    const displayOnlyCases: Array<{
      name: string;
      optimal?: OptimalLineupSnapshot;
    }> = [
      { name: "missing" },
      {
        name: "fallback",
        optimal: officialDeviationSnapshots({
          optimalGeneratedFrom: "league_builder",
          optimalSourceConfidence: "fallback",
        }).optimal,
      },
      {
        name: "stale",
        optimal: officialDeviationSnapshots({
          optimalGeneratedFrom: "team_hub",
          optimalSourceConfidence: "stale_roster",
        }).optimal,
      },
      {
        name: "game lock",
        optimal: officialDeviationSnapshots({
          optimalGeneratedFrom: "game_lock",
          optimalSourceConfidence: "user_registered",
        }).optimal,
      },
    ];

    for (const { name, optimal } of displayOnlyCases) {
      const state = deriveState({
        atBatEvents: lineupEvents,
        optimalLineupSnapshots: optimal ? { away: optimal } : undefined,
        chosenLineupSnapshots: {
          away: officialDeviationSnapshots().chosen,
        },
        gameEnded: true,
      });

      expect(awayLineupDeltas(state), name).toEqual([]);
    }

    const optimalOrder = lineupSnapshot({
      teamId: TEAMS.away.teamId,
      snapshotId: "away-optimal-order",
      slots: [
        {
          playerId: "away-leadoff",
          playerName: "Away Leadoff",
          battingOrderSlot: 1,
          defensivePosition: "SS",
          projectedSlotKblWpa: 0.04,
        },
        {
          playerId: "away-cf",
          playerName: "Away Center",
          battingOrderSlot: 2,
          defensivePosition: "CF",
          projectedSlotKblWpa: 0.02,
        },
      ],
    });
    const chosenOrder = lineupSnapshot({
      teamId: TEAMS.away.teamId,
      snapshotId: "away-chosen-order",
      slots: [
        {
          playerId: "away-cf",
          playerName: "Away Center",
          battingOrderSlot: 1,
          defensivePosition: "CF",
          projectedSlotKblWpa: 0.025,
        },
        {
          playerId: "away-leadoff",
          playerName: "Away Leadoff",
          battingOrderSlot: 2,
          defensivePosition: "SS",
          projectedSlotKblWpa: 0.035,
        },
      ],
    });
    const orderState = deriveState({
      atBatEvents: [
        sparseWpaEvent({
          eventId: `${GAME_ID}_order_leadoff`,
          playerId: "away-leadoff",
          playerName: "Away Leadoff",
          teamId: TEAMS.away.teamId,
          wpa: 0.1,
        }),
        sparseWpaEvent({
          eventId: `${GAME_ID}_order_cf`,
          playerId: "away-cf",
          playerName: "Away Center",
          teamId: TEAMS.away.teamId,
          wpa: 0.1,
        }),
      ],
      optimalLineupSnapshots: { away: optimalOrder },
      chosenLineupSnapshots: { away: chosenOrder },
      gameEnded: true,
    });
    const orderDeltas = awayLineupDeltas(orderState);

    expect(orderDeltas).toHaveLength(2);
    expect(new Set(orderDeltas.map((delta) => delta.chosenPlayerId))).toEqual(
      new Set(["away-leadoff", "away-cf"]),
    );
    expect(orderDeltas.every((delta) => delta.confidence === "high")).toBe(true);
  });

  test("guardrail game keeps high Manager Value records out of player KBL WPA, leaderboard, and POTG paths", () => {
    const walkedRunner = runner("away-slugger", "Away Slugger");
    const ibb = atBat({
      eventId: `${GAME_ID}_guardrail_ibb`,
      eventIndex: 70,
      result: "IBB",
      batterId: "away-slugger",
      batterName: "Away Slugger",
      pitcherId: "home-pitcher",
      pitcherName: "Home Pitcher",
      outs: 0,
      outsAfter: 0,
      runnersAfter: runnerState({ first: walkedRunner }),
      wpaModelVersion: WPA_MODEL_VERSION,
    });
    const homer = atBat({
      eventId: `${GAME_ID}_guardrail_hr`,
      eventIndex: 71,
      result: "HR",
      batterId: "away-next",
      batterName: "Away Next",
      outs: 0,
      outsAfter: 0,
      runners: ibb.runnersAfter,
      runnersAfter: emptyRunners(),
      runnerOutcomes: [
        {
          runnerId: "away-slugger",
          runnerName: "Away Slugger",
          fromBase: "first",
          toBase: "home",
        },
      ],
      runsScored: ["away-slugger", "away-next"],
      rbiCount: 2,
      awayScoreAfter: 5,
      wpaModelVersion: WPA_MODEL_VERSION,
    });
    const pinchHit = betweenPlay({
      eventId: `${GAME_ID}_guardrail_ph`,
      eventIndex: 72,
      substitution: {
        subType: "pinch_hit",
        outPlayerId: "away-starter",
        outPlayerName: "Away Starter",
        inPlayerId: "away-bench",
        inPlayerName: "Away Bench",
      },
      gameState: {
        inning: 7,
        halfInning: "TOP",
        outs: 0,
        score: { away: 5, home: 3 },
        runnersOn: {},
      },
    });
    const phTactical = atBat({
      eventId: `${GAME_ID}_guardrail_ph_tactical`,
      eventIndex: 73,
      result: "K",
      batterId: "away-bench",
      batterName: "Away Bench",
      awayScore: 5,
      homeScore: 3,
      awayScoreAfter: 5,
      homeScoreAfter: 3,
      wpa: -0.1,
    });
    const phLater = atBat({
      eventId: `${GAME_ID}_guardrail_ph_later`,
      eventIndex: 74,
      result: "HR",
      batterId: "away-bench",
      batterName: "Away Bench",
      outs: 1,
      outsAfter: 1,
      awayScore: 5,
      homeScore: 3,
      awayScoreAfter: 6,
      homeScoreAfter: 3,
      wpa: 0.6,
    });
    const chosen = lineupSnapshot({
      teamId: TEAMS.away.teamId,
      snapshotId: "away-guardrail-chosen",
      slots: [
        {
          playerId: "away-slugger",
          playerName: "Away Slugger",
          battingOrderSlot: 3,
          defensivePosition: "1B",
          projectedSlotKblWpa: -0.2,
        },
      ],
    });
    const optimal = lineupSnapshot({
      teamId: TEAMS.away.teamId,
      snapshotId: "away-guardrail-optimal",
      slots: [
        {
          playerId: "away-optimal-1b",
          playerName: "Away Optimal 1B",
          battingOrderSlot: 3,
          defensivePosition: "1B",
          projectedSlotKblWpa: 0.2,
        },
      ],
    });
    const atBatEvents = [ibb, homer, phTactical, phLater];
    const betweenPlayEvents = [pinchHit];
    const state = deriveState({
      atBatEvents,
      betweenPlayEvents,
      optimalLineupSnapshots: { away: optimal },
      chosenLineupSnapshots: { away: chosen },
      gameEnded: true,
    });

    expect(requireDecision(state, "intentional_walk", ibb.eventId).managerWpa).not.toBe(0);
    expect(requireStint(state, (record) => record.playerId === "away-bench")).toMatchObject({
      linkedEventIds: [phLater.eventId],
      managerDeploymentWpa: 0.09,
    });
    expect(awayLineupDeltas(state)).toHaveLength(1);
    expect(layerTotals(state, TEAMS.home.managerId).tactical).not.toBe(0);
    expect(layerTotals(state, TEAMS.away.managerId).deployment).not.toBe(0);
    expect(layerTotals(state, TEAMS.away.managerId).lineup).not.toBe(0);

    const traceRows = expectStableTraceRows(state);
    expect(new Set(traceRows.map((row) => row.layer))).toEqual(
      new Set(["tactical", "deployment", "lineup"]),
    );
    expect(
      traceRows.some(
        (row) =>
          row.layer === "tactical" &&
          row.description.includes("the walked runner scored"),
      ),
    ).toBe(true);

    const { overlayCredits } = expectPlayerKblWpaGuardrails({
      atBatEvents,
      betweenPlayEvents,
    });
    expect(
      aggregateKblWpaCredits(overlayCredits, {
        includeManager: true,
        includeOverlays: true,
      }).some((entry) => entry.playerId === "home:manager"),
    ).toBe(true);

    const leaderboard = aggregateKblWpaCredits(overlayCredits);
    const playersOfTheGame = rankPlayersOfTheGame(
      {
        awayTeamId: TEAMS.away.teamId,
        homeTeamId: TEAMS.home.teamId,
        playerStats: {
          "away-next": {
            playerName: "Away Next",
            teamId: TEAMS.away.teamId,
            pa: 1,
            ab: 1,
            h: 1,
            hr: 1,
            rbi: 2,
            r: 1,
            bb: 0,
            k: 0,
          },
          "away-bench": {
            playerName: "Away Bench",
            teamId: TEAMS.away.teamId,
            pa: 2,
            ab: 2,
            h: 1,
            hr: 1,
            rbi: 1,
            r: 1,
            bb: 0,
            k: 1,
          },
          "away-slugger": {
            playerName: "Away Slugger",
            teamId: TEAMS.away.teamId,
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
        pitcherGameStats: [
          {
            pitcherId: "home-pitcher",
            pitcherName: "Home Pitcher",
            teamId: TEAMS.home.teamId,
          },
        ],
      },
      atBatEvents,
      overlayCredits,
    );

    expect(
      leaderboard.every((entry) => !entry.playerId.includes("manager")),
    ).toBe(true);
    expect(
      playersOfTheGame.every((entry) => !entry.playerId.includes("manager")),
    ).toBe(true);
    expect(playersOfTheGame[0]?.playerId).not.toContain("manager");
  });
});
