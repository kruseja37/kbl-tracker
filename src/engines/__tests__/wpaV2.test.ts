import { describe, expect, test } from "vitest";

import savantArtifact from "../data/mlbSavantWpa2016_2025.json";
import { calculateWpaV2, WPA_MODEL_VERSION, type WpaGameState } from "../wpaV2";
import { getHomeWinExpectancyV2 } from "../winExpectancyModelV2";
import {
  getMlbSavantWpaArtifactMetadata,
  mapKblInningToSavant,
} from "../mlbSavantWinExpectancy";

const EMPTY = { first: false, second: false, third: false };
const SECOND = { first: false, second: true, third: false };
const LOADED = { first: true, second: true, third: true };
const SAVANT_DIFF_SUFFIXES = [
  "minus_5",
  "minus_4",
  "minus_3",
  "minus_2",
  "minus_1",
  "0",
  "1",
  "2",
  "3",
  "4",
  "5",
] as const;

function state(overrides: Partial<WpaGameState> = {}): WpaGameState {
  return {
    inning: 7,
    halfInning: "BOTTOM",
    outs: 1,
    bases: EMPTY,
    homeScore: 3,
    awayScore: 3,
    scheduledInnings: 9,
    ...overrides,
  };
}

describe("WPA v2 engine", () => {
  test("uses the versioned MLB Savant WPA model", () => {
    expect(WPA_MODEL_VERSION).toBe("mlb-savant-wpa-2016-2025-v1");
  });

  test("loads a complete vendored Savant matrix", () => {
    expect(getMlbSavantWpaArtifactMetadata()).toMatchObject({
      modelVersion: WPA_MODEL_VERSION,
      rowCount: 480,
      endpointTypes: ["winexp"],
      regularSeasonYears: [2016, 2025],
    });
  });

  test("vendored Savant matrix has complete finite WP and LI cells", () => {
    const rows = savantArtifact.rows;
    const keys = new Set<string>();

    for (const row of rows) {
      keys.add(`${row.inning}|${row.bottom_top}|${row.outs}|${row.bases_cd}`);
      for (const suffix of SAVANT_DIFF_SUFFIXES) {
        const winProbability = row[`bat_wins_${suffix}`];
        const leverageIndex = row[`leverage_index_${suffix}`];

        expect(Number.isFinite(winProbability)).toBe(true);
        expect(winProbability).toBeGreaterThanOrEqual(0);
        expect(winProbability).toBeLessThanOrEqual(1);
        expect(Number.isFinite(leverageIndex)).toBe(true);
        expect(leverageIndex).toBeGreaterThanOrEqual(0);
        if (leverageIndex === 0) {
          expect(winProbability === 0 || winProbability === 1).toBe(true);
        }
      }
    }

    expect(rows).toHaveLength(480);
    expect(keys.size).toBe(480);
    for (const inning of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
      for (const half of ["Bottom", "Top"]) {
        for (const outs of [0, 1, 2]) {
          for (const basesCd of [0, 1, 2, 3, 4, 5, 6, 7]) {
            expect(keys.has(`${inning}|${half}|${outs}|${basesCd}`)).toBe(
              true,
            );
          }
        }
      }
    }
  });

  test("matches the published Savant runner-on-third example", () => {
    const result = getHomeWinExpectancyV2(
      state({
        inning: 7,
        halfInning: "BOTTOM",
        outs: 2,
        bases: { first: false, second: false, third: true },
        homeScore: 4,
        awayScore: 0,
      }),
    );

    expect(result.homeWinProbability).toBeCloseTo(0.97, 3);
    expect(result.trace.modelVersion).toBe(WPA_MODEL_VERSION);
    expect("rowKey" in result.trace ? result.trace.rowKey : "").toBe(
      "7|Bottom|2|4|batDiff=4",
    );
  });

  test("HR down 9 to down 6 is positive for the batting team", () => {
    const result = calculateWpaV2(
      state({
        inning: 2,
        halfInning: "BOTTOM",
        outs: 0,
        bases: { first: true, second: true, third: false },
        homeScore: 0,
        awayScore: 9,
      }),
      {
        outs: 0,
        bases: EMPTY,
        homeScore: 3,
        awayScore: 9,
      },
    );

    expect(result.modelVersion).toBe(WPA_MODEL_VERSION);
    expect(result.battingTeamDelta).toBeGreaterThan(0);
  });

  test("batting-team HR that scores and creates no out is never negative", () => {
    const situations = [
      state({ halfInning: "TOP", homeScore: 9, awayScore: 0, bases: EMPTY }),
      state({ halfInning: "TOP", homeScore: 9, awayScore: 0, bases: LOADED }),
      state({ halfInning: "BOTTOM", homeScore: 0, awayScore: 9, bases: EMPTY }),
      state({ halfInning: "BOTTOM", homeScore: 0, awayScore: 9, bases: LOADED }),
    ];

    for (const before of situations) {
      const runs = 1 + Number(before.bases.first) + Number(before.bases.second) + Number(before.bases.third);
      const result = calculateWpaV2(before, {
        outs: before.outs,
        bases: EMPTY,
        homeScore: before.halfInning === "BOTTOM" ? before.homeScore + runs : before.homeScore,
        awayScore: before.halfInning === "TOP" ? before.awayScore + runs : before.awayScore,
      });

      expect(result.battingTeamDelta).toBeGreaterThanOrEqual(0);
    }
  });

  test("grand slam down 6 to down 2 beats a solo HR in the same inning state", () => {
    const grandSlam = calculateWpaV2(
      state({ inning: 7, bases: LOADED, homeScore: 0, awayScore: 6 }),
      { outs: 1, bases: EMPTY, homeScore: 4, awayScore: 6 },
    );
    const solo = calculateWpaV2(
      state({ inning: 7, bases: EMPTY, homeScore: 0, awayScore: 6 }),
      { outs: 1, bases: EMPTY, homeScore: 1, awayScore: 6 },
    );

    expect(grandSlam.battingTeamDelta).toBeGreaterThan(0);
    expect(grandSlam.battingTeamDelta).toBeGreaterThan(solo.battingTeamDelta);
  });

  test("terminal final-inning states resolve correctly", () => {
    const walkOff = calculateWpaV2(
      state({ inning: 9, halfInning: "BOTTOM", outs: 2, homeScore: 4, awayScore: 4 }),
      { outs: 2, bases: EMPTY, homeScore: 5, awayScore: 4 },
    );
    const topFinalHomeAhead = calculateWpaV2(
      state({ inning: 9, halfInning: "TOP", outs: 2, homeScore: 5, awayScore: 3 }),
      { outs: 3, bases: EMPTY, homeScore: 5, awayScore: 3 },
    );
    const bottomFinalAwayAhead = calculateWpaV2(
      state({ inning: 9, halfInning: "BOTTOM", outs: 2, homeScore: 3, awayScore: 5 }),
      { outs: 3, bases: EMPTY, homeScore: 3, awayScore: 5 },
    );
    const tiedBottomFinal = calculateWpaV2(
      state({ inning: 9, halfInning: "BOTTOM", outs: 2, homeScore: 5, awayScore: 5 }),
      { outs: 3, bases: EMPTY, homeScore: 5, awayScore: 5 },
    );

    expect(walkOff.homeWinProbabilityAfter).toBe(1);
    expect(topFinalHomeAhead.homeWinProbabilityAfter).toBe(1);
    expect(bottomFinalAwayAhead.homeWinProbabilityAfter).toBe(0);
    expect(tiedBottomFinal.homeWinProbabilityAfter).toBeGreaterThan(0);
    expect(tiedBottomFinal.homeWinProbabilityAfter).toBeLessThan(1);
  });

  test("comfortable final-inning leads do not create oversized routine pitching credit", () => {
    const firstOut = calculateWpaV2(
      state({ inning: 9, halfInning: "TOP", outs: 0, bases: EMPTY, homeScore: 4, awayScore: 0 }),
      { outs: 1, bases: EMPTY, homeScore: 4, awayScore: 0 },
    );
    const secondOut = calculateWpaV2(
      state({ inning: 9, halfInning: "TOP", outs: 1, bases: EMPTY, homeScore: 4, awayScore: 0 }),
      { outs: 2, bases: EMPTY, homeScore: 4, awayScore: 0 },
    );
    const finalOut = calculateWpaV2(
      state({ inning: 9, halfInning: "TOP", outs: 2, bases: EMPTY, homeScore: 4, awayScore: 0 }),
      { outs: 3, bases: EMPTY, homeScore: 4, awayScore: 0 },
    );

    expect(firstOut.homeWinProbabilityBefore).toBeGreaterThan(0.98);
    expect(firstOut.fieldingTeamDelta).toBeLessThan(0.01);
    expect(secondOut.fieldingTeamDelta).toBeLessThan(0.006);
    expect(finalOut.fieldingTeamDelta).toBeLessThan(0.002);
    expect(
      firstOut.fieldingTeamDelta +
        secondOut.fieldingTeamDelta +
        finalOut.fieldingTeamDelta,
    ).toBeLessThan(0.02);
  });

  test("one-run final-inning save with bases loaded remains high leverage", () => {
    const result = getHomeWinExpectancyV2(
      state({
        inning: 9,
        halfInning: "TOP",
        outs: 1,
        bases: LOADED,
        homeScore: 5,
        awayScore: 4,
      }),
    );

    expect(result.homeWinProbability).toBeGreaterThan(0.5);
    expect(result.homeWinProbability).toBeLessThan(0.6);
    expect(
      "leverageIndex" in result.trace ? result.trace.leverageIndex : 0,
    ).toBeGreaterThan(5);
  });

  test("home/away team deltas conserve to zero", () => {
    const result = calculateWpaV2(
      state({ halfInning: "TOP", homeScore: 4, awayScore: 3, bases: { first: false, second: true, third: false } }),
      { outs: 1, bases: { first: true, second: false, third: false }, homeScore: 4, awayScore: 4 },
    );

    expect(result.battingTeamDelta + result.fieldingTeamDelta).toBeCloseTo(0, 10);
    expect(result.homeDelta).toBeCloseTo(
      result.homeWinProbabilityAfter - result.homeWinProbabilityBefore,
      10,
    );
  });

  test("directional batting WPA follows home WP movement", () => {
    const awayHit = calculateWpaV2(
      state({
        inning: 6,
        halfInning: "TOP",
        outs: 1,
        bases: { first: false, second: true, third: false },
        homeScore: 3,
        awayScore: 3,
      }),
      {
        outs: 1,
        bases: { first: true, second: false, third: false },
        homeScore: 3,
        awayScore: 4,
      },
    );
    const homeHit = calculateWpaV2(
      state({
        inning: 6,
        halfInning: "BOTTOM",
        outs: 1,
        bases: { first: false, second: true, third: false },
        homeScore: 3,
        awayScore: 3,
      }),
      {
        outs: 1,
        bases: { first: true, second: false, third: false },
        homeScore: 4,
        awayScore: 3,
      },
    );

    expect(awayHit.homeDelta).toBeLessThan(0);
    expect(awayHit.battingTeamDelta).toBeGreaterThan(0);
    expect(homeHit.homeDelta).toBeGreaterThan(0);
    expect(homeHit.battingTeamDelta).toBeGreaterThan(0);
  });

  test("home win expectancy is monotonic by score differential from -15 through +15", () => {
    let previous = -Infinity;
    for (let diff = -15; diff <= 15; diff += 1) {
      const homeScore = Math.max(diff, 0);
      const awayScore = Math.max(-diff, 0);
      const we = getHomeWinExpectancyV2(
        state({
          inning: 5,
          halfInning: "TOP",
          outs: 1,
          bases: EMPTY,
          homeScore,
          awayScore,
        }),
      ).homeWinProbability;

      expect(we).toBeGreaterThanOrEqual(previous);
      previous = we;
    }
  });

  test("base/out state is monotonic for the batting team", () => {
    const battingWe = (before: WpaGameState) =>
      before.halfInning === "BOTTOM"
        ? getHomeWinExpectancyV2(before).homeWinProbability
        : 1 - getHomeWinExpectancyV2(before).homeWinProbability;

    const empty0 = battingWe(state({ outs: 0, bases: EMPTY }));
    const empty1 = battingWe(state({ outs: 1, bases: EMPTY }));
    const empty2 = battingWe(state({ outs: 2, bases: EMPTY }));
    const first0 = battingWe(state({ outs: 0, bases: { first: true, second: false, third: false } }));
    const second0 = battingWe(state({ outs: 0, bases: { first: false, second: true, third: false } }));
    const loaded0 = battingWe(state({ outs: 0, bases: LOADED }));

    expect(empty0).toBeGreaterThan(empty1);
    expect(empty1).toBeGreaterThan(empty2);
    expect(first0).toBeGreaterThan(empty0);
    expect(second0).toBeGreaterThan(first0);
    expect(loaded0).toBeGreaterThan(second0);
  });

  test("scheduled innings 1 through 9 all treat their final inning as final", () => {
    for (let scheduledInnings = 1; scheduledInnings <= 9; scheduledInnings += 1) {
      const result = calculateWpaV2(
        state({
          inning: scheduledInnings,
          halfInning: "TOP",
          outs: 2,
          homeScore: 2,
          awayScore: 1,
          scheduledInnings,
        }),
        { outs: 3, bases: EMPTY, homeScore: 2, awayScore: 1 },
      );

      expect(result.homeWinProbabilityAfter).toBe(1);
    }
  });

  test("short scheduled games map their final inning to Savant 9th inning logic", () => {
    expect(mapKblInningToSavant(5, 5)).toBe(9);
    expect(mapKblInningToSavant(7, 7)).toBe(9);

    const fiveInningFinal = getHomeWinExpectancyV2(
      state({
        inning: 5,
        halfInning: "TOP",
        outs: 0,
        scheduledInnings: 5,
        homeScore: 4,
        awayScore: 3,
      }),
    );
    const sevenInningFinal = getHomeWinExpectancyV2(
      state({
        inning: 7,
        halfInning: "TOP",
        outs: 0,
        scheduledInnings: 7,
        homeScore: 4,
        awayScore: 3,
      }),
    );

    expect(
      "savantInning" in fiveInningFinal.trace
        ? fiveInningFinal.trace.savantInning
        : 0,
    ).toBe(9);
    expect(
      "savantInning" in sevenInningFinal.trace
        ? sevenInningFinal.trace.savantInning
        : 0,
    ).toBe(9);
  });

  test("score differentials beyond Savant range use explicit fallback trace", () => {
    const result = getHomeWinExpectancyV2(
      state({
        inning: 5,
        halfInning: "TOP",
        outs: 1,
        bases: EMPTY,
        homeScore: 8,
        awayScore: 1,
      }),
    );

    expect("fallback" in result.trace ? result.trace.fallback : undefined).toBe(
      "score-diff-out-of-savant-range",
    );
    expect(
      "fallbackModelVersion" in result.trace
        ? result.trace.fallbackModelVersion
        : undefined,
    ).toBe("kbl-wpa-v3");
    expect("rowKey" in result.trace ? result.trace.rowKey : "").toContain(
      "batDiff=-7",
    );
  });

  test("extra innings use Savant 9th inning logic when the automatic runner is inactive", () => {
    const tiedTopExtraNoRunner = getHomeWinExpectancyV2(
      state({
        inning: 10,
        halfInning: "TOP",
        outs: 0,
        homeScore: 5,
        awayScore: 5,
        extraInningRunner: false,
      }),
    );
    const tiedTopExtraDelayedRunner = getHomeWinExpectancyV2(
      state({
        inning: 10,
        halfInning: "TOP",
        outs: 0,
        homeScore: 5,
        awayScore: 5,
        extraInningRunner: true,
        extraInningRunnerDelay: 2,
      }),
    );

    expect(mapKblInningToSavant(10, 9)).toBe(9);
    expect(tiedTopExtraNoRunner.homeWinProbability).toBeCloseTo(0.5, 3);
    expect(
      "savantInningMappingReason" in tiedTopExtraNoRunner.trace
        ? tiedTopExtraNoRunner.trace.savantInningMappingReason
        : "",
    ).toBe("extra-inning-no-automatic-runner");
    expect(tiedTopExtraDelayedRunner.homeWinProbability).toBeCloseTo(0.5, 3);
  });

  test("extra innings use Savant 10th inning logic when the automatic runner is active", () => {
    const tiedTopExtraWithRunner = getHomeWinExpectancyV2(
      state({
        inning: 10,
        halfInning: "TOP",
        outs: 0,
        bases: EMPTY,
        homeScore: 5,
        awayScore: 5,
        extraInningRunner: true,
        extraInningRunnerDelay: 1,
      }),
    );

    expect(mapKblInningToSavant(10, 9, { extraInningRunner: true })).toBe(10);
    expect(tiedTopExtraWithRunner.homeWinProbability).toBeCloseTo(0.667, 3);
    expect(
      "savantInningMappingReason" in tiedTopExtraWithRunner.trace
        ? tiedTopExtraWithRunner.trace.savantInningMappingReason
        : "",
    ).toBe("extra-inning-automatic-runner");
  });

  test("third out into automatic-runner extras starts the next half with runner on second", () => {
    const bottomFinalThirdOut = calculateWpaV2(
      state({
        inning: 9,
        halfInning: "BOTTOM",
        outs: 2,
        bases: EMPTY,
        homeScore: 5,
        awayScore: 5,
        extraInningRunner: true,
        extraInningRunnerDelay: 1,
      }),
      { outs: 3, bases: EMPTY, homeScore: 5, awayScore: 5 },
    );

    expect(bottomFinalThirdOut.homeWinProbabilityAfter).toBeCloseTo(0.5, 3);
    expect(bottomFinalThirdOut.battingTeamDelta).toBeLessThan(0);
    expect(
      "rowKey" in bottomFinalThirdOut.winExpectancyTraceAfter
        ? bottomFinalThirdOut.winExpectancyTraceAfter.rowKey
        : "",
    ).toBe("10|Top|0|2|batDiff=0");
  });

  test("top extra third out gives the home half its automatic runner", () => {
    const topExtraThirdOut = calculateWpaV2(
      state({
        inning: 10,
        halfInning: "TOP",
        outs: 2,
        bases: SECOND,
        homeScore: 5,
        awayScore: 5,
        extraInningRunner: true,
        extraInningRunnerDelay: 1,
      }),
      { outs: 3, bases: EMPTY, homeScore: 5, awayScore: 5 },
    );

    expect(topExtraThirdOut.homeWinProbabilityAfter).toBeCloseTo(0.805, 3);
    expect(topExtraThirdOut.battingTeamDelta).toBeLessThan(0);
    expect(
      "rowKey" in topExtraThirdOut.winExpectancyTraceAfter
        ? topExtraThirdOut.winExpectancyTraceAfter.rowKey
        : "",
    ).toBe("10|Bottom|0|2|batDiff=0");
  });

  test("delayed automatic runner starts on the configured extra inning", () => {
    const firstExtra = calculateWpaV2(
      state({
        inning: 9,
        halfInning: "BOTTOM",
        outs: 2,
        homeScore: 5,
        awayScore: 5,
        extraInningRunner: true,
        extraInningRunnerDelay: 2,
      }),
      { outs: 3, bases: EMPTY, homeScore: 5, awayScore: 5 },
    );
    const secondExtra = calculateWpaV2(
      state({
        inning: 10,
        halfInning: "BOTTOM",
        outs: 2,
        homeScore: 5,
        awayScore: 5,
        extraInningRunner: true,
        extraInningRunnerDelay: 2,
      }),
      { outs: 3, bases: EMPTY, homeScore: 5, awayScore: 5 },
    );

    expect(
      "rowKey" in firstExtra.winExpectancyTraceAfter
        ? firstExtra.winExpectancyTraceAfter.rowKey
        : "",
    ).toBe("9|Top|0|0|batDiff=0");
    expect(
      "rowKey" in secondExtra.winExpectancyTraceAfter
        ? secondExtra.winExpectancyTraceAfter.rowKey
        : "",
    ).toBe("10|Top|0|2|batDiff=0");
  });

  test("extra innings keep terminal behavior", () => {
    const walkOffExtra = calculateWpaV2(
      state({ inning: 10, halfInning: "BOTTOM", outs: 1, homeScore: 5, awayScore: 5 }),
      { outs: 1, bases: EMPTY, homeScore: 6, awayScore: 5 },
    );
    const tiedBottomExtraThirdOut = calculateWpaV2(
      state({ inning: 10, halfInning: "BOTTOM", outs: 2, homeScore: 5, awayScore: 5 }),
      { outs: 3, bases: EMPTY, homeScore: 5, awayScore: 5 },
    );

    expect(walkOffExtra.homeWinProbabilityAfter).toBe(1);
    expect(tiedBottomExtraThirdOut.homeWinProbabilityAfter).toBeGreaterThan(0);
    expect(tiedBottomExtraThirdOut.homeWinProbabilityAfter).toBeLessThan(1);
  });
});
