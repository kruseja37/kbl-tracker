import { describe, expect, test } from "vitest";

import type { AtBatEvent, BetweenPlayEvent, FieldingEvent } from "../eventLog";
import {
  aggregateKblWpaCredits,
  deriveActualAtBatWpa,
  deriveKblWpaCredits,
} from "../kblWpaAttribution";

function createAtBat(overrides: Partial<AtBatEvent> = {}): AtBatEvent {
  return {
    eventId: "game-1_1",
    gameId: "game-1",
    eventIndex: 1,
    timestamp: 1,
    batterId: "away-batter",
    batterName: "Away Batter",
    batterTeamId: "away",
    pitcherId: "home-pitcher",
    pitcherName: "Home Pitcher",
    pitcherTeamId: "home",
    result: "GO",
    rbiCount: 0,
    runsScored: 0,
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
    winProbabilityAfter: 0.5,
    wpa: 0,
    wpaModelVersion: "kbl-wpa-v2",
    ballInPlay: null,
    fameEvents: [],
    isLeadoff: true,
    isClutch: false,
    isWalkOff: false,
    ...overrides,
  };
}

function createFielder(position: FieldingEvent["position"], overrides: Partial<FieldingEvent> = {}): FieldingEvent {
  const playerIdByPosition: Record<string, string> = {
    P: "home-pitcher",
    C: "home-catcher",
    "1B": "home-first",
    "2B": "home-second",
    "3B": "home-third",
    SS: "home-short",
    LF: "home-left",
    CF: "home-center",
    RF: "home-right",
  };
  const playerNameByPosition: Record<string, string> = {
    P: "Home Pitcher",
    C: "Home Catcher",
    "1B": "Home First",
    "2B": "Home Second",
    "3B": "Home Third",
    SS: "Home Short",
    LF: "Home Left",
    CF: "Home Center",
    RF: "Home Right",
  };

  return {
    fieldingEventId: `game-1_1_fe_${overrides.sequence ?? 0}`,
    gameId: "game-1",
    atBatEventId: "game-1_1",
    sequence: 0,
    playerId: playerIdByPosition[position] ?? position,
    playerName: playerNameByPosition[position] ?? position,
    position,
    teamId: "home",
    playType: "assist",
    difficulty: "routine",
    specialPlayType: null,
    ballInPlay: {
      trajectory: "ground",
      zone: 6,
      velocity: "medium",
      fielderIds: [],
      primaryFielderId: playerIdByPosition[position] ?? position,
    },
    success: true,
    runsPreventedOrAllowed: 0,
    ...overrides,
  };
}

function totalFor(credits: ReturnType<typeof deriveKblWpaCredits>, playerId: string): number {
  return aggregateKblWpaCredits(credits).find((entry) => entry.playerId === playerId)?.totalWpa ?? 0;
}

function sumCredits(credits: ReturnType<typeof deriveKblWpaCredits>, teamId: string): number {
  return credits
    .filter((credit) => credit.teamId === teamId && !credit.isOverlay && credit.role !== "managing")
    .reduce((sum, credit) => sum + credit.wpa, 0);
}

describe("KBL WPA attribution", () => {
  test("routine 5-3 gives the first baseman no receiving WPA", () => {
    const event = createAtBat({ enrichment: { fieldingSequence: [5, 3], fieldingPlayType: "routine" } });
    const fieldingEvents = [
      createFielder("3B", { sequence: 0 }),
      createFielder("1B", { sequence: 1, playType: "putout" }),
    ];
    const credits = deriveKblWpaCredits({ atBatEvents: [event], fieldingEvents });
    const defensiveBudget = -deriveActualAtBatWpa(event).wpa;

    expect(totalFor(credits, "home-pitcher")).toBeCloseTo(defensiveBudget * 0.95, 5);
    expect(totalFor(credits, "home-third")).toBeCloseTo(defensiveBudget * 0.05, 5);
    expect(totalFor(credits, "home-first")).toBeCloseTo(0, 5);
    expect(credits.find((credit) => credit.playerId === "home-third")?.allocationMode).toBe("ratio");
    expect(sumCredits(credits, "home")).toBeCloseTo(defensiveBudget, 5);
  });

  test("routine 5-3 with rescued throw uses raw units", () => {
    const event = createAtBat({
      enrichment: {
        fieldingSequence: [5, 3],
        fieldingPlayType: "routine",
        rescuedThrow: true,
      },
    });
    const fieldingEvents = [
      createFielder("3B", { sequence: 0 }),
      createFielder("1B", { sequence: 1, playType: "putout", specialPlayType: "Diving" }),
    ];
    const credits = deriveKblWpaCredits({ atBatEvents: [event], fieldingEvents });
    const defensiveBudget = -deriveActualAtBatWpa(event).wpa;

    expect(totalFor(credits, "home-first")).toBeGreaterThan(0);
    expect(totalFor(credits, "home-third")).toBeLessThan(0);
    expect(credits.find((credit) => credit.playerId === "home-first")?.allocationMode).toBe("raw_unit");
    expect(sumCredits(credits, "home")).toBeCloseTo(defensiveBudget, 5);
  });

  test("primary-fielder gem gives the receiving first baseman no routine WPA", () => {
    const event = createAtBat({
      enrichment: { fieldingSequence: [5, 3], fieldingPlayType: "diving" },
    });
    const fieldingEvents = [
      createFielder("3B", { sequence: 0, specialPlayType: "Diving", difficulty: "50-50" }),
      createFielder("1B", { sequence: 1, playType: "putout" }),
    ];
    const credits = deriveKblWpaCredits({ atBatEvents: [event], fieldingEvents });
    const defensiveBudget = -deriveActualAtBatWpa(event).wpa;

    expect(totalFor(credits, "home-third")).toBeCloseTo(defensiveBudget * 0.75, 5);
    expect(totalFor(credits, "home-first")).toBeCloseTo(0, 5);
    expect(sumCredits(credits, "home")).toBeCloseTo(defensiveBudget, 5);
  });

  test("strikeouts give catcher five percent when catcher identity is durable", () => {
    const event = createAtBat({
      result: "K",
      enrichment: undefined,
      catcherContext: {
        playerId: "home-catcher",
        playerName: "Home Catcher",
        teamId: "home",
        position: "C",
      },
    });
    const credits = deriveKblWpaCredits({ atBatEvents: [event] });
    const defensiveBudget = -deriveActualAtBatWpa(event).wpa;

    expect(totalFor(credits, "home-pitcher")).toBeCloseTo(defensiveBudget * 0.95, 5);
    expect(totalFor(credits, "home-catcher")).toBeCloseTo(defensiveBudget * 0.05, 5);
  });

  test("strikeouts can fall back to the defensive starting catcher when event context is missing", () => {
    const event = createAtBat({ result: "Kc", enrichment: undefined });
    const credits = deriveKblWpaCredits({
      atBatEvents: [event],
      awayTeamId: "away",
      homeTeamId: "home",
      startingLineups: {
        away: [],
        home: [{ playerId: "home-catcher", playerName: "Home Catcher", position: "C" }],
      },
    });
    const defensiveBudget = -deriveActualAtBatWpa(event).wpa;

    expect(totalFor(credits, "home-pitcher")).toBeCloseTo(defensiveBudget * 0.95, 5);
    expect(totalFor(credits, "home-catcher")).toBeCloseTo(defensiveBudget * 0.05, 5);
  });

  test("robbed homers use counterfactual pitcher debit and fielder surplus credit", () => {
    const event = createAtBat({
      result: "FO",
      inning: 9,
      outs: 1,
      awayScore: 2,
      homeScore: 2,
      outsAfter: 2,
      enrichment: { fieldingSequence: [7], fieldingPlayType: "robbed_hr" },
    });
    const fieldingEvents = [
      createFielder("LF", { playType: "putout", specialPlayType: "Robbed HR", difficulty: "spectacular" }),
    ];
    const credits = deriveKblWpaCredits({ atBatEvents: [event], fieldingEvents });
    const defensiveBudget = -deriveActualAtBatWpa(event).wpa;

    expect(totalFor(credits, "home-pitcher")).toBeLessThan(0);
    expect(totalFor(credits, "home-left")).toBeGreaterThan(defensiveBudget);
    expect(credits.find((credit) => credit.playerId === "home-left")?.allocationMode).toBe("counterfactual");
    expect(sumCredits(credits, "home")).toBeCloseTo(defensiveBudget, 5);
  });

  test("runner scoring from first on a single receives baserunning delta credit", () => {
    const event = createAtBat({
      result: "1B",
      runners: {
        first: { runnerId: "away-runner", runnerName: "Away Runner", responsiblePitcherId: "home-pitcher" },
        second: null,
        third: null,
      },
      runnersAfter: {
        first: { runnerId: "away-batter", runnerName: "Away Batter", responsiblePitcherId: "home-pitcher" },
        second: null,
        third: null,
      },
      awayScoreAfter: 1,
      runnerOutcomes: [
        {
          runnerId: "away-runner",
          runnerName: "Away Runner",
          fromBase: "first",
          toBase: "home",
        },
      ],
    });
    const credits = deriveKblWpaCredits({ atBatEvents: [event] });
    const battingBudget = deriveActualAtBatWpa(event).wpa;

    expect(totalFor(credits, "away-runner")).toBeGreaterThan(0);
    expect(totalFor(credits, "away-batter")).toBeGreaterThan(0);
    expect(sumCredits(credits, "away")).toBeCloseTo(battingBudget, 5);
  });

  test("batting and defensive budgets conserve to zero for player KBL WPA", () => {
    const event = createAtBat({
      result: "HR",
      inning: 4,
      outs: 0,
      awayScore: 0,
      homeScore: 9,
      runners: {
        first: { runnerId: "away-r1", runnerName: "Away Runner 1", responsiblePitcherId: "home-pitcher" },
        second: { runnerId: "away-r2", runnerName: "Away Runner 2", responsiblePitcherId: "home-pitcher" },
        third: null,
      },
      awayScoreAfter: 3,
      homeScoreAfter: 9,
      runnersAfter: { first: null, second: null, third: null },
      rbiCount: 3,
      runsScored: 3,
    });

    const credits = deriveKblWpaCredits({ atBatEvents: [event] });
    const actual = deriveActualAtBatWpa(event);

    expect(actual.wpaModelVersion).toBe("kbl-wpa-v2");
    expect(actual.battingTeamDelta).toBeGreaterThan(0);
    expect(sumCredits(credits, "away")).toBeCloseTo(actual.battingTeamDelta, 5);
    expect(sumCredits(credits, "home")).toBeCloseTo(actual.fieldingTeamDelta, 5);
    expect(sumCredits(credits, "away") + sumCredits(credits, "home")).toBeCloseTo(0, 5);
  });

  test("complete archived legacy events keep stored WPA unless recomputed", () => {
    const legacyEvent = createAtBat({
      result: "HR",
      wpaModelVersion: undefined,
      wpa: 0.1234,
      winProbabilityBefore: 0.2,
      winProbabilityAfter: 0.1,
      awayScore: 0,
      homeScore: 9,
      awayScoreAfter: 3,
      homeScoreAfter: 9,
      runsScored: 3,
      rbiCount: 3,
    });

    const actual = deriveActualAtBatWpa(legacyEvent);
    const credits = deriveKblWpaCredits({ atBatEvents: [legacyEvent] });

    expect(actual.wpaModelVersion).toBe("legacy-stored");
    expect(actual.battingTeamDelta).toBe(0.1234);
    expect(totalFor(credits, "away-batter")).toBe(0.1234);
    expect(sumCredits(credits, "home")).toBe(0);
  });

  test("saved bases use counterfactual fielder credit instead of fixed raw units", () => {
    const event = createAtBat({
      result: "1B",
      inning: 7,
      outs: 2,
      awayScore: 2,
      homeScore: 2,
      runners: {
        first: null,
        second: { runnerId: "away-runner", runnerName: "Away Runner", responsiblePitcherId: "home-pitcher" },
        third: null,
      },
      runnersAfter: {
        first: { runnerId: "away-batter", runnerName: "Away Batter", responsiblePitcherId: "home-pitcher" },
        second: null,
        third: { runnerId: "away-runner", runnerName: "Away Runner", responsiblePitcherId: "home-pitcher" },
      },
      enrichment: { savedRun: true, basesSaved: 2 },
      runnerOutcomes: [
        {
          runnerId: "away-runner",
          runnerName: "Away Runner",
          fromBase: "second",
          toBase: "third",
          heldByOf: true,
          baseSaved: "HOME",
        },
      ],
    });
    const fieldingEvents = [createFielder("RF", { sequence: 0, playType: "base_save", runsPreventedOrAllowed: 1 })];
    const credits = deriveKblWpaCredits({ atBatEvents: [event], fieldingEvents });
    const defensiveBudget = -deriveActualAtBatWpa(event).wpa;

    expect(totalFor(credits, "home-right")).toBeGreaterThan(0);
    expect(totalFor(credits, "home-pitcher")).toBeLessThan(defensiveBudget);
    expect(credits.find((credit) => credit.playerId === "home-right")?.allocationMode).toBe("counterfactual");
    expect(sumCredits(credits, "home")).toBeCloseTo(defensiveBudget, 5);
  });

  test("IBB manager credit is overlay-only when requested and absent from collapsed totals by default", () => {
    const event = createAtBat({
      result: "IBB",
      outsAfter: 0,
      runnersAfter: {
        first: { runnerId: "away-batter", runnerName: "Away Batter", responsiblePitcherId: "home-pitcher" },
        second: null,
        third: null,
      },
    });
    const defaultCredits = deriveKblWpaCredits({ atBatEvents: [event] });
    const overlayCredits = deriveKblWpaCredits({ atBatEvents: [event], includeManagerOverlays: true });
    const defensiveBudget = -deriveActualAtBatWpa(event).wpa;

    expect(defaultCredits.some((credit) => credit.role === "managing")).toBe(false);
    expect(defaultCredits.find((credit) => credit.role === "pitching")?.wpa).toBeCloseTo(defensiveBudget, 5);
    expect(sumCredits(defaultCredits, "home")).toBeCloseTo(defensiveBudget, 5);
    expect(overlayCredits.some((credit) => credit.role === "managing" && credit.isOverlay)).toBe(true);
    expect(overlayCredits.find((credit) => credit.role === "managing")?.allocationMode).toBe("overlay");
    expect(aggregateKblWpaCredits(overlayCredits).some((entry) => entry.playerId.endsWith(":manager"))).toBe(false);
    expect(
      aggregateKblWpaCredits(overlayCredits, { includeManager: true }).some((entry) =>
        entry.playerId.endsWith(":manager"),
      ),
    ).toBe(false);
    expect(
      aggregateKblWpaCredits(overlayCredits, { includeOverlays: true }).some((entry) =>
        entry.playerId.endsWith(":manager"),
      ),
    ).toBe(false);

    const managerInclusiveTotals = aggregateKblWpaCredits(overlayCredits, {
      includeManager: true,
      includeOverlays: true,
    });
    const managerTotal = managerInclusiveTotals.find((entry) => entry.playerId.endsWith(":manager"));
    expect(managerTotal?.teamId).toBe("home");
    expect(managerTotal?.managingWpa).toBeCloseTo(defensiveBudget, 5);
  });

  test("walk results ignore impossible fielding-error rows", () => {
    const event = createAtBat({
      result: "BB",
      outsAfter: 0,
      runnersAfter: {
        first: { runnerId: "away-batter", runnerName: "Away Batter", responsiblePitcherId: "home-pitcher" },
        second: null,
        third: null,
      },
    });
    const fieldingEvents = [createFielder("SS", { playType: "error" })];
    const credits = deriveKblWpaCredits({ atBatEvents: [event], fieldingEvents });
    const defensiveBudget = -deriveActualAtBatWpa(event).wpa;

    expect(totalFor(credits, "home-short")).toBeCloseTo(0, 5);
    expect(totalFor(credits, "home-pitcher")).toBeCloseTo(defensiveBudget, 5);
    expect(sumCredits(credits, "home")).toBeCloseTo(defensiveBudget, 5);
  });

  test("caught stealing splits defensive credit to catcher and pitcher", () => {
    const event: BetweenPlayEvent = {
      eventId: "game-1_bp_1",
      gameId: "game-1",
      timestamp: 2,
      eventIndex: 2,
      type: "caught_stealing",
      gameState: {
        inning: 6,
        halfInning: "TOP",
        outs: 1,
        score: { away: 2, home: 2 },
        runnersOn: { first: "away-runner" },
      },
      runnerAction: {
        runnerId: "away-runner",
        runnerName: "Away Runner",
        fromBase: 1,
        toBase: 2,
        outcome: "out",
        reason: "caught_stealing",
      },
      runnerAttribution: {
        pitcherId: "home-pitcher",
        pitcherName: "Home Pitcher",
        catcherId: "home-catcher",
        catcherName: "Home Catcher",
      },
    };
    const credits = deriveKblWpaCredits({
      atBatEvents: [],
      betweenPlayEvents: [event],
      awayTeamId: "away",
      homeTeamId: "home",
    });

    expect(totalFor(credits, "away-runner")).toBeLessThan(0);
    expect(totalFor(credits, "home-catcher")).toBeGreaterThan(totalFor(credits, "home-pitcher"));
    expect(sumCredits(credits, "away") + sumCredits(credits, "home")).toBeCloseTo(0, 5);
  });

  test("between-play safe advancements still get WPA when the stored snapshot is post-move", () => {
    const event: BetweenPlayEvent = {
      eventId: "game-1_bp_2",
      gameId: "game-1",
      timestamp: 3,
      eventIndex: 3,
      type: "wild_pitch",
      gameState: {
        inning: 2,
        halfInning: "BOTTOM",
        outs: 0,
        score: { away: 0, home: 1 },
        runnersOn: { second: "home-runner" },
      },
      runnerAction: {
        runnerId: "home-runner",
        runnerName: "Home Runner",
        fromBase: 1,
        toBase: 2,
        outcome: "safe",
        reason: "wild_pitch",
      },
      runnerAttribution: {
        pitcherId: "away-pitcher",
        pitcherName: "Away Pitcher",
      },
    };
    const credits = deriveKblWpaCredits({
      atBatEvents: [],
      betweenPlayEvents: [event],
      awayTeamId: "away",
      homeTeamId: "home",
      totalInnings: 3,
    });

    expect(totalFor(credits, "home-runner")).toBeGreaterThan(0);
    expect(totalFor(credits, "away-pitcher")).toBeLessThan(0);
    expect(sumCredits(credits, "away") + sumCredits(credits, "home")).toBeCloseTo(0, 5);
  });

  test("between-play scoring advances reconstruct WPA from post-score snapshots", () => {
    const event: BetweenPlayEvent = {
      eventId: "game-1_bp_3",
      gameId: "game-1",
      timestamp: 4,
      eventIndex: 4,
      type: "wild_pitch",
      gameState: {
        inning: 2,
        halfInning: "BOTTOM",
        outs: 0,
        score: { away: 0, home: 1 },
        runnersOn: {},
      },
      runnerAction: {
        runnerId: "home-runner",
        runnerName: "Home Runner",
        fromBase: 3,
        toBase: 4,
        outcome: "safe",
        reason: "wild_pitch",
      },
      runnerAttribution: {
        pitcherId: "away-pitcher",
        pitcherName: "Away Pitcher",
      },
    };
    const credits = deriveKblWpaCredits({
      atBatEvents: [],
      betweenPlayEvents: [event],
      awayTeamId: "away",
      homeTeamId: "home",
      totalInnings: 3,
    });

    expect(totalFor(credits, "home-runner")).toBeGreaterThan(0);
    expect(totalFor(credits, "away-pitcher")).toBeLessThan(0);
    expect(sumCredits(credits, "away") + sumCredits(credits, "home")).toBeCloseTo(0, 5);
  });

  test("prompted keep-current manager decisions do not change player KBL WPA totals", () => {
    const atBat = createAtBat({
      eventId: "game-1_1",
      eventIndex: 1,
      result: "HR",
      runsScored: ["away-batter"],
      awayScoreAfter: 1,
      homeScoreAfter: 0,
      wpa: 0.2,
    });
    const prompt: BetweenPlayEvent = {
      eventId: "game-1_bp_keep",
      gameId: "game-1",
      timestamp: 2,
      eventIndex: 0.5,
      type: "manager_moment",
      gameState: {
        inning: 1,
        halfInning: "TOP",
        outs: 0,
        score: { away: 0, home: 0 },
        runnersOn: {},
      },
      managerMoment: {
        leverageIndex: 2.1,
        decisionType: "leave_pitcher_in",
      },
      promptedManagerDecision: {
        decisionType: "leave_pitcher_in",
        action: "keep_pitcher",
        source: "recommendation",
        decisionSource: "situational_prompt",
        managerId: "home-manager",
        teamId: "home",
        opponentTeamId: "away",
        trackedPlayerIds: ["home-pitcher"],
        involvedPlayerIds: ["home-pitcher"],
        recommendationId: "rec-keep",
        provenanceKey: "keep-home-pitcher",
        resolution: {
          status: "pending",
          expectedEndpoint: "next_pa",
        },
      },
    };

    const withoutPrompt = aggregateKblWpaCredits(
      deriveKblWpaCredits({ atBatEvents: [atBat] }),
    );
    const withPrompt = aggregateKblWpaCredits(
      deriveKblWpaCredits({
        atBatEvents: [atBat],
        betweenPlayEvents: [prompt],
      }),
    );

    expect(withPrompt).toEqual(withoutPrompt);
  });
});
