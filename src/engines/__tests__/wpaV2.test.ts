import { describe, expect, test } from "vitest";

import { calculateWpaV2, type WpaGameState } from "../wpaV2";
import { getHomeWinExpectancyV2 } from "../winExpectancyModelV2";

const EMPTY = { first: false, second: false, third: false };
const LOADED = { first: true, second: true, third: true };

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

    expect(result.modelVersion).toBe("kbl-wpa-v2");
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

  test("extra innings use stable final-inning behavior", () => {
    const tiedTopExtra = getHomeWinExpectancyV2(
      state({
        inning: 10,
        halfInning: "TOP",
        outs: 0,
        homeScore: 5,
        awayScore: 5,
      }),
    ).homeWinProbability;
    const walkOffExtra = calculateWpaV2(
      state({ inning: 10, halfInning: "BOTTOM", outs: 1, homeScore: 5, awayScore: 5 }),
      { outs: 1, bases: EMPTY, homeScore: 6, awayScore: 5 },
    );
    const tiedBottomExtraThirdOut = calculateWpaV2(
      state({ inning: 10, halfInning: "BOTTOM", outs: 2, homeScore: 5, awayScore: 5 }),
      { outs: 3, bases: EMPTY, homeScore: 5, awayScore: 5 },
    );

    expect(tiedTopExtra).toBeGreaterThan(0);
    expect(tiedTopExtra).toBeLessThan(1);
    expect(walkOffExtra.homeWinProbabilityAfter).toBe(1);
    expect(tiedBottomExtraThirdOut.homeWinProbabilityAfter).toBeGreaterThan(0);
    expect(tiedBottomExtraThirdOut.homeWinProbabilityAfter).toBeLessThan(1);
  });
});
