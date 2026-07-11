import "fake-indexeddb/auto";

import { describe, expect, test } from "vitest";

import {
  createGameHeader,
  getAtBatEvent,
  logAtBatEvent,
  updateAtBatEvent,
  type AtBatEvent,
  type BetweenPlayEvent,
  type FieldingEvent,
} from "../eventLog";
import {
  aggregateKblWpaCredits,
  deriveActualAtBatWpa,
  deriveKblWpaCredits,
} from "../kblWpaAttribution";
import { calculateWPA } from "../../engines/wpaCalculator";
import { WPA_MODEL_VERSION } from "../../engines/wpaV2";

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
    wpaModelVersion: WPA_MODEL_VERSION,
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

    expect(actual.wpaModelVersion).toBe(WPA_MODEL_VERSION);
    expect(actual.battingTeamDelta).toBeGreaterThan(0);
    expect(sumCredits(credits, "away")).toBeCloseTo(actual.battingTeamDelta, 5);
    expect(sumCredits(credits, "home")).toBeCloseTo(actual.fieldingTeamDelta, 5);
    expect(sumCredits(credits, "away") + sumCredits(credits, "home")).toBeCloseTo(0, 5);
  });

  test("complete archived legacy events keep stored batting WPA unless explicitly recomputed", () => {
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
    expect(totalFor(credits, "away-batter")).toBeGreaterThan(0);
    expect(totalFor(credits, "away-batter")).toBe(0.1234);
    expect(sumCredits(credits, "home")).toBeCloseTo(actual.fieldingTeamDelta, 5);
  });

  test("unknown non-current WPA model versions keep finite stored WPA as legacy archive policy", () => {
    const unknownVersionEvent = createAtBat({
      result: "HR",
      wpaModelVersion: "mlb-savant-wpa-typo",
      wpa: 0.4321,
      winProbabilityBefore: 0.2,
      winProbabilityAfter: 0.1,
      awayScore: 0,
      homeScore: 9,
      awayScoreAfter: 3,
      homeScoreAfter: 9,
      runsScored: 3,
      rbiCount: 3,
    });

    const actual = deriveActualAtBatWpa(unknownVersionEvent);
    const credits = deriveKblWpaCredits({
      atBatEvents: [unknownVersionEvent],
    });

    expect(actual.wpaModelVersion).toBe("mlb-savant-wpa-typo");
    expect(actual.battingTeamDelta).toBe(0.4321);
    expect(totalFor(credits, "away-batter")).toBe(0.4321);
  });

  test("sparse archived legacy events keep stored batting WPA fallback", () => {
    const sparseLegacyEvent = {
      ...createAtBat({
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
      }),
      outsAfter: undefined,
    } as unknown as AtBatEvent;

    const actual = deriveActualAtBatWpa(sparseLegacyEvent);
    const credits = deriveKblWpaCredits({ atBatEvents: [sparseLegacyEvent] });

    expect(actual.wpaModelVersion).toBe("legacy-stored");
    expect(actual.battingTeamDelta).toBe(0.1234);
    expect(totalFor(credits, "away-batter")).toBe(0.1234);
    expect(sumCredits(credits, "home")).toBe(0);
  });

  test("current-model top-half strikeouts by the same pitcher cannot become negative pitching WPA", () => {
    const franzContext = {
      pitcherId: "franz-zilla",
      pitcherName: "Franz Zilla",
      pitcherTeamId: "home",
      catcherContext: {
        playerId: "home-catcher",
        playerName: "Home Catcher",
        teamId: "home",
        position: "C" as const,
      },
      wpaModelVersion: WPA_MODEL_VERSION,
    };
    const firstStrikeout = createAtBat({
      ...franzContext,
      eventId: "game-1_1",
      eventIndex: 1,
      result: "K",
      outs: 0,
      outsAfter: 1,
      // Simulates an older stored home-team delta. Recomputed KBL WPA must ignore this sign.
      wpa: 0.018,
      winProbabilityBefore: 0.55,
      winProbabilityAfter: 0.568,
    });
    const secondStrikeout = createAtBat({
      ...franzContext,
      eventId: "game-1_2",
      eventIndex: 2,
      result: "Kc",
      outs: 1,
      outsAfter: 2,
      wpa: 0.012,
      winProbabilityBefore: 0.568,
      winProbabilityAfter: 0.58,
    });

    const credits = deriveKblWpaCredits({ atBatEvents: [firstStrikeout, secondStrikeout] });
    const totals = aggregateKblWpaCredits(credits);
    const franzTotal = totals.find((entry) => entry.playerId === "franz-zilla");

    expect(deriveActualAtBatWpa(firstStrikeout).battingTeamDelta).toBeLessThan(0);
    expect(deriveActualAtBatWpa(secondStrikeout).battingTeamDelta).toBeLessThan(0);
    expect(franzTotal?.pitchingWpa).toBeGreaterThan(0);
    expect(franzTotal?.totalWpa).toBeGreaterThan(0);
  });

  test("current-model archived events can inherit game-level extra-runner policy", () => {
    const automaticRunner = {
      runnerId: "away-previous-batter",
      runnerName: "Away Previous Batter",
      responsiblePitcherId: "home-pitcher",
    };
    const eventWithoutStoredPolicy = createAtBat({
      inning: 10,
      halfInning: "TOP",
      outs: 0,
      runners: { first: null, second: automaticRunner, third: null },
      awayScore: 5,
      homeScore: 5,
      outsAfter: 1,
      runnersAfter: { first: null, second: automaticRunner, third: null },
      awayScoreAfter: 5,
      homeScoreAfter: 5,
      totalInnings: undefined,
      extraInningRunner: undefined,
      extraInningRunnerDelay: undefined,
      wpaModelVersion: WPA_MODEL_VERSION,
    });

    const noPolicy = deriveActualAtBatWpa(eventWithoutStoredPolicy, 9);
    const gamePolicy = deriveActualAtBatWpa(eventWithoutStoredPolicy, 9, {
      extraInningRunner: true,
      extraInningRunnerDelay: 1,
    });

    expect(noPolicy.winProbabilityBefore).toBeCloseTo(0.333, 3);
    expect(gamePolicy.winProbabilityBefore).toBeCloseTo(0.5, 3);
    expect(
      gamePolicy.winExpectancyTraceBefore &&
        "rowKey" in gamePolicy.winExpectancyTraceBefore
        ? gamePolicy.winExpectancyTraceBefore.rowKey
        : "",
    ).toBe("10|Top|0|2|batDiff=0");

    const noGhostRunnerPolicy = deriveActualAtBatWpa(eventWithoutStoredPolicy, 9, {
      useGhostRunner: false,
      extraInningRunner: true,
      extraInningRunnerDelay: 1,
    });

    expect(
      noGhostRunnerPolicy.winExpectancyTraceBefore &&
        "rowKey" in noGhostRunnerPolicy.winExpectancyTraceBefore
        ? noGhostRunnerPolicy.winExpectancyTraceBefore.rowKey
        : "",
    ).toBe("9|Top|0|2|batDiff=0");
  });

  test("event edit refresh hydrates missing extra-runner policy from game header", async () => {
    const gameId = "game-extra-policy-refresh";
    const eventId = `${gameId}_1`;
    const automaticRunner = {
      runnerId: "away-previous-batter",
      runnerName: "Away Previous Batter",
      responsiblePitcherId: "home-pitcher",
    };

    await createGameHeader({
      gameId,
      date: 1,
      awayTeamId: "away",
      awayTeamName: "Away",
      homeTeamId: "home",
      homeTeamName: "Home",
      finalScore: null,
      finalInning: 9,
      totalInnings: 9,
      extraInningRunner: true,
      extraInningRunnerDelay: 1,
      isComplete: false,
    });
    await logAtBatEvent(createAtBat({
      eventId,
      gameId,
      inning: 10,
      halfInning: "TOP",
      outs: 0,
      runners: { first: null, second: automaticRunner, third: null },
      awayScore: 5,
      homeScore: 5,
      outsAfter: 1,
      runnersAfter: { first: null, second: automaticRunner, third: null },
      awayScoreAfter: 5,
      homeScoreAfter: 5,
      totalInnings: undefined,
      extraInningRunner: undefined,
      extraInningRunnerDelay: undefined,
      wpaModelVersion: WPA_MODEL_VERSION,
    }));

    await updateAtBatEvent(eventId, {
      result: "Kc",
      version: 2,
      editHistory: [
        {
          field: "result",
          oldValue: "GO",
          newValue: "Kc",
          timestamp: 2,
        },
      ],
    });
    const persisted = await getAtBatEvent(eventId);

    expect(persisted?.extraInningRunner).toBe(true);
    expect(persisted?.extraInningRunnerDelay).toBe(1);
    expect(persisted?.winProbabilityBefore).toBeCloseTo(0.5, 3);
  });

  test("direct WPA field edits recompute from the current model instead of trusting caller values", async () => {
    const gameId = "direct-wpa-update-game";
    const eventId = `${gameId}_1`;
    const event = createAtBat({
      eventId,
      gameId,
      result: "GO",
      inning: 7,
      halfInning: "TOP",
      outs: 1,
      runners: { first: null, second: null, third: null },
      awayScore: 2,
      homeScore: 3,
      outsAfter: 2,
      runnersAfter: { first: null, second: null, third: null },
      awayScoreAfter: 2,
      homeScoreAfter: 3,
      totalInnings: 9,
      extraInningRunner: false,
      extraInningRunnerDelay: 1,
      wpaModelVersion: WPA_MODEL_VERSION,
    });
    const expected = calculateWPA(
      {
        inning: event.inning,
        isTop: event.halfInning === "TOP",
        outs: event.outs,
        bases: { first: false, second: false, third: false },
        homeScore: event.homeScore,
        awayScore: event.awayScore,
        totalInnings: event.totalInnings,
        extraInningRunner: event.extraInningRunner,
        extraInningRunnerDelay: event.extraInningRunnerDelay,
      },
      {
        outs: event.outsAfter,
        bases: { first: false, second: false, third: false },
        homeScore: event.homeScoreAfter,
        awayScore: event.awayScoreAfter,
      },
    );

    await logAtBatEvent(event);
    await updateAtBatEvent(eventId, {
      wpa: 0.999,
      winProbabilityBefore: 0.999,
      winProbabilityAfter: 0.001,
      wpaModelVersion: "manual-poison",
      homeDelta: -0.998,
      battingTeamDelta: 0.999,
      fieldingTeamDelta: -0.999,
    });
    const persisted = await getAtBatEvent(eventId);

    expect(persisted?.wpaModelVersion).toBe(WPA_MODEL_VERSION);
    expect(persisted?.winProbabilityBefore).toBeCloseTo(expected.winProbabilityBefore, 5);
    expect(persisted?.winProbabilityAfter).toBeCloseTo(expected.winProbabilityAfter, 5);
    expect(persisted?.wpa).toBeCloseTo(expected.wpa, 5);
    expect(persisted?.homeDelta).toBeCloseTo(expected.homeDelta, 5);
    expect(persisted?.battingTeamDelta).toBeCloseTo(expected.battingTeamDelta, 5);
    expect(persisted?.fieldingTeamDelta).toBeCloseTo(expected.fieldingTeamDelta, 5);
    expect(persisted?.wpa).not.toBe(0.999);
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

  test("missing-id caught stealing reconstructs the current pitcher and conserves WPA", () => {
    const starterAtBat = createAtBat({ eventIndex: 1, pitcherId: "home-starter", pitcherName: "Home Starter" });
    const change: BetweenPlayEvent = {
      eventId: "game-1_bp_change",
      gameId: "game-1",
      timestamp: 2,
      eventIndex: 2,
      type: "pitcher_change",
      gameState: { inning: 6, halfInning: "TOP", outs: 0, score: { away: 2, home: 2 }, runnersOn: {} },
      pitcherChange: {
        outgoingPitcherId: "home-starter",
        incomingPitcherId: "home-reliever",
        incomingPitcherName: "Home Reliever",
        inheritedRunners: 0,
      },
    };
    const orphan: BetweenPlayEvent = {
      eventId: "game-1_bp_orphan_cs",
      gameId: "game-1",
      timestamp: 3,
      eventIndex: 3,
      type: "caught_stealing",
      gameState: { inning: 6, halfInning: "TOP", outs: 1, score: { away: 2, home: 2 }, runnersOn: { first: "away-runner" } },
      runnerAction: {
        runnerId: "away-runner",
        runnerName: "Away Runner",
        fromBase: 1,
        toBase: 2,
        outcome: "out",
        reason: "caught_stealing",
      },
    };

    const credits = deriveKblWpaCredits({
      atBatEvents: [starterAtBat],
      betweenPlayEvents: [change, orphan],
      awayTeamId: "away",
      homeTeamId: "home",
    });

    expect(totalFor(credits, "home-reliever")).toBeGreaterThan(0);
    expect(sumCredits(credits, "away") + sumCredits(credits, "home")).toBeCloseTo(0, 5);
    expect(credits.unattributedDefensiveWpa).toBe(0);
  });

  test("unresolvable orphaned defensive WPA is exposed exactly", () => {
    const orphan: BetweenPlayEvent = {
      eventId: "game-1_bp_unresolved_sb",
      gameId: "game-1",
      timestamp: 1,
      eventIndex: 1,
      type: "stolen_base",
      gameState: { inning: 6, halfInning: "TOP", outs: 1, score: { away: 2, home: 2 }, runnersOn: { first: "away-runner" } },
      runnerAction: {
        runnerId: "away-runner",
        runnerName: "Away Runner",
        fromBase: 1,
        toBase: 2,
        outcome: "safe",
        reason: "stolen_base",
      },
    };
    const credits = deriveKblWpaCredits({
      atBatEvents: [],
      betweenPlayEvents: [orphan],
      awayTeamId: "away",
      homeTeamId: "home",
    });

    expect(sumCredits(credits, "home")).toBe(0);
    expect(credits.unattributedDefensiveWpa).toBeCloseTo(-sumCredits(credits, "away"), 5);
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

  test("between-play WPA uses event snapshot total innings before caller fallback", () => {
    const event: BetweenPlayEvent = {
      eventId: "game-1_bp_4",
      gameId: "game-1",
      timestamp: 5,
      eventIndex: 5,
      type: "pickoff",
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
        toBase: 2,
        outcome: "out",
        reason: "pickoff",
      },
      runnerAttribution: {
        pitcherId: "home-pitcher",
        pitcherName: "Home Pitcher",
      },
    };
    const credits = deriveKblWpaCredits({
      atBatEvents: [],
      betweenPlayEvents: [event],
      awayTeamId: "away",
      homeTeamId: "home",
      totalInnings: 9,
      extraInningRunner: true,
      extraInningRunnerDelay: 1,
    });
    const expectedEventSnapshotWpa = calculateWPA(
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

    expect(totalFor(credits, "away-runner")).toBeCloseTo(
      expectedEventSnapshotWpa,
      5,
    );
    expect(totalFor(credits, "away-runner")).not.toBeCloseTo(
      fallbackNineInningWpa,
      5,
    );
  });

  test("old between-play records without snapshot total innings use caller fallback", () => {
    const event: BetweenPlayEvent = {
      eventId: "game-1_bp_5",
      gameId: "game-1",
      timestamp: 6,
      eventIndex: 6,
      type: "pickoff",
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
        toBase: 2,
        outcome: "out",
        reason: "pickoff",
      },
      runnerAttribution: {
        pitcherId: "home-pitcher",
        pitcherName: "Home Pitcher",
      },
    };
    const credits = deriveKblWpaCredits({
      atBatEvents: [],
      betweenPlayEvents: [event],
      awayTeamId: "away",
      homeTeamId: "home",
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

    expect(totalFor(credits, "away-runner")).toBeCloseTo(
      expectedFallbackWpa,
      5,
    );
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
