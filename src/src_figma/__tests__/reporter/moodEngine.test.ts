import { describe, expect, test } from "vitest";

import {
  INITIAL_MOOD_STATE,
  applyDriftTriggers,
  decayMomentum,
  resolveMood,
  type MoodDriftEvent,
  type MoodState,
} from "../../../engines/moodEngine";

function state(overrides: Partial<MoodState> = {}): MoodState {
  return {
    ...INITIAL_MOOD_STATE,
    ...overrides,
  };
}

describe("moodEngine", () => {
  test.each([
    [
      "HOME_PITCHER_STRIKEOUT_STREAK",
      { type: "HOME_PITCHER_STRIKEOUT_STREAK", consecutiveStrikeouts: 3 },
      { moodMomentum: 2, moodScore: 1.5 },
    ],
    [
      "HOME_TEAM_DOWN_BIG",
      { type: "HOME_TEAM_DOWN_BIG", homeDeficit: 6 },
      { moodMomentum: -2, moodScore: -2 },
    ],
    [
      "WALK_OFF_SITUATION",
      {
        type: "WALK_OFF_SITUATION",
        inning: 9,
        halfInning: "BOTTOM",
        tyingOrGoAheadRunOnBase: true,
      },
      { moodMomentum: 2, moodScore: 2 },
    ],
    ["BLOWOUT_LEAD", { type: "BLOWOUT_LEAD", homeLead: 8 }, { moodMomentum: -1, moodScore: -0.5 }],
    [
      "RIVALRY_CLOSE_GAME",
      { type: "RIVALRY_CLOSE_GAME", rivalryIntensity: 8, scoreDifferential: 1 },
      { moodMomentum: 2, moodScore: 1.5 },
    ],
    ["HOME_TEAM_RALLY", { type: "HOME_TEAM_RALLY", consecutiveHits: 3 }, { moodMomentum: 3, moodScore: 2.5 }],
    [
      "HOME_TEAM_CRUCIAL_ERROR",
      { type: "HOME_TEAM_CRUCIAL_ERROR", isCrucial: true },
      { moodMomentum: -3, moodScore: -2.5 },
    ],
  ] satisfies [string, MoodDriftEvent, Partial<MoodState>][])(
    "%s produces the expected deterministic state delta",
    (_name, event, expected) => {
      const next = applyDriftTriggers(state(), event);

      expect(next).toMatchObject({
        ...expected,
        currentMood: "BALANCED",
        driftActive: false,
        driftScore: 0.2,
      });
    },
  );

  test("non-qualifying triggers decay instead of applying trigger deltas", () => {
    expect(
      applyDriftTriggers(state({ moodMomentum: 2, moodScore: 2 }), {
        type: "HOME_PITCHER_STRIKEOUT_STREAK",
        consecutiveStrikeouts: 2,
      }),
    ).toMatchObject({
      moodMomentum: 1,
      moodScore: 1,
      currentMood: "BALANCED",
    });
  });

  test("momentum decays one point toward neutral across at least three cycles", () => {
    const first = decayMomentum(state({ moodMomentum: 5, moodScore: 4 }));
    const second = decayMomentum(first);
    const third = decayMomentum(second);

    expect(first.moodMomentum).toBe(4);
    expect(second.moodMomentum).toBe(3);
    expect(third.moodMomentum).toBe(2);
    expect(third.moodScore).toBe(1);
  });

  test.each([
    ["euphoric boundary minus", 3.99, "optimistic"],
    ["euphoric boundary exact", 4, "euphoric"],
    ["optimistic boundary minus", 1.49, "neutral"],
    ["optimistic boundary exact", 1.5, "optimistic"],
    ["frustrated boundary minus", -1.5, "frustrated"],
    ["frustrated boundary just above", -1.49, "neutral"],
    ["bitter boundary minus", -4, "bitter"],
    ["bitter boundary just above", -3.99, "frustrated"],
  ] as const)("resolveMood cutoff: %s", (_label, moodScore, expected) => {
    expect(resolveMood(state({ moodScore }))).toBe(expected);
  });

  test("repeated trigger pressure eventually activates deterministic drift", () => {
    let next = state({ baseMood: "PESSIMIST", currentMood: "PESSIMIST" });

    for (let i = 0; i < 5; i += 1) {
      next = applyDriftTriggers(next, {
        type: "HOME_TEAM_RALLY",
        consecutiveHits: 3,
      });
    }

    expect(next).toMatchObject({
      driftActive: true,
      driftScore: 1,
      currentMood: "OPTIMIST",
      moodMomentum: 5,
      energyModifier: "electric",
    });
  });

  test("after a single neutral event, state tends back toward archetype baseline", () => {
    const next = applyDriftTriggers(
      state({
        baseMood: "PESSIMIST",
        currentMood: "OPTIMIST",
        driftActive: true,
        driftScore: 1,
        driftExpiresAfterAtBats: 1,
        moodMomentum: 2,
        moodScore: 2,
      }),
      { type: "NEUTRAL_AT_BAT" },
    );

    expect(next).toMatchObject({
      currentMood: "PESSIMIST",
      driftActive: false,
      driftExpiresAfterAtBats: 0,
      moodMomentum: 1,
      moodScore: 1,
    });
  });

  test("engine functions are pure and do not mutate input state", () => {
    const input = state({
      baseMood: "HOMER",
      currentMood: "HOMER",
      moodMomentum: 1,
      moodScore: 1,
    });
    const snapshot = structuredClone(input);
    const event: MoodDriftEvent = { type: "RIVALRY_CLOSE_GAME", rivalryIntensity: 5, scoreDifferential: 0 };

    expect(applyDriftTriggers(input, event)).toEqual(applyDriftTriggers(input, event));
    expect(input).toEqual(snapshot);
    expect(decayMomentum(input)).toEqual(decayMomentum(input));
    expect(input).toEqual(snapshot);
  });
});
