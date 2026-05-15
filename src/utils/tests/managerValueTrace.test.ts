import { describe, expect, test } from "vitest";

import type {
  ManagerDecisionRecord,
  ManagerDeploymentStintRecord,
  ManagerLineupDeltaRecord,
} from "../../types/managerWpa";
import {
  buildManagerValueTraceRows,
  isActiveScoringManagerDecision,
} from "../managerValueTrace";

function createDecision(
  overrides: Partial<ManagerDecisionRecord> = {},
): ManagerDecisionRecord {
  const decisionType = overrides.decisionType ?? "pinch_hitter";

  return {
    decisionId: overrides.decisionId ?? `game-1:bp-1:${decisionType}`,
    gameId: "game-1",
    managerId: overrides.managerId ?? "away-manager",
    teamId: overrides.teamId ?? "away",
    opponentTeamId: overrides.opponentTeamId ?? "home",
    decisionType,
    inferenceMethod: "automatic",
    decisionSource: "user_action",
    confidence: "high",
    inning: 7,
    half: "top",
    outs: 1,
    baseState: "---",
    scoreDifferentialForTeam: 0,
    leverageIndex: 2.1,
    decisionEventId: overrides.decisionEventId ?? "bp-1",
    linkedEventIds: overrides.linkedEventIds ?? ["bp-1", "ab-8"],
    involvedPlayerIds: ["bench-bat"],
    teamWinProbabilityBefore: 0.5,
    teamWinProbabilityAfter: 0.58,
    managerWpa: 0.02,
    rawWindowWpa: 0.08,
    managerShare: 0.25,
    resolved: true,
    resolvedAtEventId: "ab-8",
    displayTitle: overrides.displayTitle ?? "Pinch hitter",
    displaySummary: "Pinch hitter for away",
    derivation: {
      derivedFromEventIds: overrides.linkedEventIds ?? ["bp-1", "ab-8"],
      derivedFromFields: ["substitution.subType"],
      manuallyPinned: false,
      stale: false,
    },
    ...overrides,
  };
}

function createDeploymentStint(
  overrides: Partial<ManagerDeploymentStintRecord> = {},
): ManagerDeploymentStintRecord {
  return {
    stintId: overrides.stintId ?? "game-1:bp-2:deployment:kept",
    gameId: "game-1",
    managerId: overrides.managerId ?? "away-manager",
    teamId: overrides.teamId ?? "away",
    deploymentRole: overrides.deploymentRole ?? "kept_position_player_in",
    playerId: "starter-one",
    playerName: "Starter One",
    sourceEventId: "bp-2",
    openedAtEventIndex: 8,
    tacticalExclusionEventIds: ["ab-8"],
    closedAtEventId: "ab-11",
    closedAtEventIndex: 11,
    closeReason: "game_end",
    linkedEventIds: ["ab-10", "ab-9"],
    linkedOutcomes: [
      {
        eventId: "ab-10",
        source: "at_bat",
        role: "fielding",
        rawWpa: 0.04,
        weight: 0.75,
        weightedWpa: 0.03,
      },
      {
        eventId: "ab-9",
        source: "at_bat",
        role: "batting",
        rawWpa: 0.05,
        weight: 1,
        weightedWpa: 0.05,
      },
    ],
    rawLinkedWpa: 0.08,
    managerShare: 0.15,
    managerDeploymentWpa: 0.012,
    cap: 0.15,
    confidence: "medium",
    ...overrides,
  };
}

function createLineupDelta(
  overrides: Partial<ManagerLineupDeltaRecord> = {},
): ManagerLineupDeltaRecord {
  return {
    decisionId: overrides.decisionId ?? "game-1:away:starter:optimal:lineup",
    gameId: "game-1",
    managerId: overrides.managerId ?? "away-manager",
    teamId: overrides.teamId ?? "away",
    decisionType: "lineup_construction",
    inferenceMethod: "automatic",
    confidence: "medium",
    starterPlayerId: "starter-one",
    starterPlayerName: "Starter One",
    battingOrderSlot: 1,
    defensivePosition: "SS",
    starterRole: "position_player",
    actualPlayerKblWpa: 0.4,
    replacementExpectedKblWpa: 0.2,
    replacementBaselineSource: "optimal_lineup_v2",
    replacementBaselineConfidence: "medium",
    rawPerformanceDelta: 0.2,
    managerShare: 0.25,
    managerWpa: 0.05,
    chosenPlayerId: "starter-one",
    chosenPlayerName: "Starter One",
    chosenBattingOrderSlot: 1,
    chosenDefensivePosition: "SS",
    optimalPlayerId: "optimal-one",
    optimalPlayerName: "Optimal One",
    optimalBattingOrderSlot: 4,
    optimalDefensivePosition: "CF",
    chosenProjectedKblWpa: 0.1,
    optimalProjectedKblWpa: 0.2,
    projectedOpportunityCost: -0.1,
    actualChosenKblWpa: 0.4,
    actualVsOptimalProjection: 0.2,
    ...overrides,
  };
}

describe("manager value trace", () => {
  test("builds deterministic trace rows from committed manager records", () => {
    const decision = createDecision();
    const stint = createDeploymentStint();
    const delta = createLineupDelta();

    const first = buildManagerValueTraceRows({
      managerLineupDeltas: [delta],
      managerDeploymentStints: [stint],
      managerDecisions: [decision],
    });
    const second = buildManagerValueTraceRows({
      managerDecisions: [decision],
      managerDeploymentStints: [stint],
      managerLineupDeltas: [delta],
    });

    expect(first).toEqual(second);
    expect(first.map((row) => `${row.layer}:${row.recordId}`)).toEqual([
      `tactical:${decision.decisionId}`,
      `deployment:${stint.stintId}`,
      `lineup:${delta.decisionId}`,
    ]);
  });

  test("includes IBB inning consequence details", () => {
    const [trace] = buildManagerValueTraceRows({
      managerDecisions: [
        createDecision({
          decisionId: "game-1:ab-7:intentional_walk",
          decisionType: "intentional_walk",
          displayTitle: "Intentional walk",
          decisionEventId: "ab-7",
          linkedEventIds: ["ab-7", "ab-8", "ab-9"],
          rawWindowWpa: -0.12,
          managerShare: 1,
          managerWpa: -0.12,
          resolvedAtEventId: "ab-9",
          explanationMetadata: {
            intentionalWalk: {
              ibbEventId: "ab-7",
              walkedRunnerId: "slugger",
              walkedRunnerName: "Walked Star",
              nextBatterEventId: "ab-8",
              nextBatterId: "next-batter",
              nextBatterName: "Next Batter",
              nextBatterResult: "2B",
              finalConsequenceEventId: "ab-9",
              finalConsequence: "scored",
              inningEnded: false,
            },
          },
        }),
      ],
    });

    expect(trace).toMatchObject({
      decisionType: "intentional_walk",
      sourceEventId: "ab-7",
      endpointEventId: "ab-9",
      linkedEventIds: ["ab-7", "ab-8", "ab-9"],
      rawWpa: -0.12,
      share: 1,
      cap: undefined,
      finalValue: -0.12,
      description:
        "IBB put Walked Star on base to face Next Batter, who ended with 2B; the walked runner scored.",
    });
  });

  test("includes typed kept-in deployment linked outcomes and weights", () => {
    const [trace] = buildManagerValueTraceRows({
      managerDeploymentStints: [createDeploymentStint()],
    });

    expect(trace).toMatchObject({
      layer: "deployment",
      deploymentRole: "kept_position_player_in",
      sourceEventId: "bp-2",
      endpointEventId: "ab-11",
      linkedEventIds: ["ab-10", "ab-9"],
      rawWpa: 0.08,
      share: 0.15,
      cap: 0.15,
      finalValue: 0.012,
    });
    expect(trace.linkedOutcomes).toEqual([
      expect.objectContaining({
        eventId: "ab-10",
        role: "fielding",
        weight: 0.75,
        weightedWpa: 0.03,
      }),
      expect.objectContaining({
        eventId: "ab-9",
        role: "batting",
        weight: 1,
        weightedWpa: 0.05,
      }),
    ]);
    expect(trace.description).toContain("fielding 75%");
    expect(trace.description).toContain("batting 100%");
  });

  test("explains Lineup Delta chosen versus optimal", () => {
    const [trace] = buildManagerValueTraceRows({
      managerLineupDeltas: [createLineupDelta()],
    });

    expect(trace).toMatchObject({
      layer: "lineup",
      decisionType: "lineup_construction",
      rawWpa: 0.2,
      share: 0.25,
      finalValue: 0.05,
      description:
        "Lineup Delta: chose #1 SS Starter One instead of optimal #4 CF Optimal One; actual value was compared to the optimal projection.",
    });
  });

  test("marks legacy defensive alignment records as non-scoring compatibility notes", () => {
    const legacy = createDecision({
      decisionId: "game-1:bp-align:defensive_alignment",
      decisionType: "defensive_alignment",
      displayTitle: "Defensive alignment",
      decisionEventId: "bp-align",
      linkedEventIds: ["bp-align", "ab-field"],
      rawWindowWpa: 0.4,
      managerShare: 0.1,
      managerWpa: 0.04,
      resolvedAtEventId: "ab-field",
    });
    const [trace] = buildManagerValueTraceRows({
      managerDecisions: [legacy],
    });

    expect(isActiveScoringManagerDecision(legacy)).toBe(false);
    expect(trace).toMatchObject({
      decisionType: "defensive_alignment",
      rawWpa: undefined,
      share: undefined,
      cap: undefined,
      finalValue: undefined,
      scoring: false,
      compatibilityOnly: true,
      description: "Legacy defensive alignment note only; no Manager Value scoring.",
    });
  });
});
