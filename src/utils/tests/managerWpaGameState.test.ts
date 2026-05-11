import "fake-indexeddb/auto";
import { describe, expect, test } from "vitest";

import type { AtBatEvent, BetweenPlayEvent } from "../eventLog";
import {
  aggregateKblWpaCredits,
  deriveKblWpaCredits,
} from "../kblWpaAttribution";
import {
  logAtBatEvent,
  updateAtBatEvent,
} from "../eventLog";
import {
  deriveCommittedManagerDecisionState,
  deriveManagerLineupDeltaRecords,
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

function derive(
  atBatEvents: AtBatEvent[] = [],
  betweenPlayEvents: BetweenPlayEvent[] = [],
) {
  return deriveCommittedManagerDecisionState({
    gameId: "game-1",
    atBatEvents,
    betweenPlayEvents,
    awayTeamId: "away",
    homeTeamId: "home",
    awayManagerId: "away-manager",
    homeManagerId: "home-manager",
    totalInnings: 9,
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
      resolved: true,
      resolvedAtEventId: `${gameId}_2`,
      linkedEventIds: expect.arrayContaining([`${gameId}_1`, `${gameId}_2`]),
    });

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
    });
    expect(updatedDecision?.managerWpa).not.toBe(initialDecision?.managerWpa);
  });

  test("completed-game archive stores manager decisions and lineup deltas separately", async () => {
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
        replacementExpectedKblWpa: 0,
        replacementBaselineSource: "v1_zero_default" as const,
        replacementBaselineConfidence: "low" as const,
        rawPerformanceDelta: 0.4,
        managerShare: 0.25,
        managerWpa: 0.1,
      },
    ];

    await archiveCompletedGame(
      {
        ...createPersistedGameState(gameId),
        managerDecisions: tacticalState.managerDecisions,
        managerLineupDeltas: lineupDeltas,
      },
      { away: 3, home: 2 },
      [],
      "season-1",
    );

    const archived = await getCompletedGameById(gameId);
    expect(archived?.managerDecisions).toEqual(tacticalState.managerDecisions);
    expect(archived?.managerLineupDeltas).toEqual(lineupDeltas);
  });

  test("derives starter lineup delta math with v1 zero replacement baseline", () => {
    const deltas = deriveLineupDeltas([
      createSparseKblWpaEvent({
        eventId: "game-1_wpa_1",
        playerId: "away-starter-1",
        playerName: "Away Starter 1",
        teamId: "away",
        wpa: 0.4,
      }),
    ]);

    expect(deltas.find((delta) => delta.starterPlayerId === "away-starter-1")).toMatchObject({
      managerId: "away-manager",
      teamId: "away",
      starterPlayerName: "Away Starter 1",
      starterRole: "position_player",
      actualPlayerKblWpa: 0.4,
      replacementExpectedKblWpa: 0,
      replacementBaselineSource: "v1_zero_default",
      replacementBaselineConfidence: "low",
      rawPerformanceDelta: 0.4,
      managerShare: 0.25,
      managerWpa: 0.1,
    });
  });

  test("caps each starter lineup delta to +/-0.250", () => {
    const deltas = deriveLineupDeltas([
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
    const deltas = deriveLineupDeltas([
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
    const deltas = deriveLineupDeltas([
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
    const deltas = deriveLineupDeltas(atBatEvents);
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
});
