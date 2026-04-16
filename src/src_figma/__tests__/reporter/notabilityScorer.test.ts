import { describe, expect, test } from "vitest";

import { INITIAL_MOOD_STATE, type MoodState } from "../../../engines/moodEngine";
import { scoreNotability, type NotabilityPlayContext } from "../../../engines/notabilityScorer";

function play(overrides: Partial<NotabilityPlayContext> = {}): NotabilityPlayContext {
  return {
    inning: 6,
    halfInning: "TOP",
    outsBefore: 1,
    outsAfter: 1,
    basesBefore: { first: false, second: false, third: false },
    basesAfter: { first: false, second: false, third: false },
    homeScoreBefore: 2,
    awayScoreBefore: 2,
    homeScoreAfter: 2,
    awayScoreAfter: 2,
    result: "GROUND_OUT",
    ...overrides,
  };
}

function mood(moodScore: number): MoodState {
  return {
    ...INITIAL_MOOD_STATE,
    moodScore,
  };
}

describe("notabilityScorer", () => {
  describe("bypass rules", () => {
    test("HR is always notable", () => {
      const result = scoreNotability(
        play({
          result: "HOME_RUN",
          homeScoreAfter: 2,
          awayScoreAfter: 3,
          runsScored: 1,
        }),
        INITIAL_MOOD_STATE,
      );

      expect(result.shouldComment).toBe(true);
      expect(result.reason).toBe("HR");
      expect(result.score).toBeGreaterThanOrEqual(0.05);
    });

    test("error is always notable", () => {
      const result = scoreNotability(
        play({
          result: "FIELDING_ERROR",
          isError: true,
          basesAfter: { first: true, second: false, third: false },
        }),
        INITIAL_MOOD_STATE,
      );

      expect(result.shouldComment).toBe(true);
      expect(result.reason).toBe("ERROR");
    });

    test("hit streak of 3 or more is always notable", () => {
      const result = scoreNotability(
        play({
          result: "SINGLE",
          basesAfter: { first: true, second: false, third: false },
          batterHitStreak: 3,
        }),
        INITIAL_MOOD_STATE,
      );

      expect(result.shouldComment).toBe(true);
      expect(result.reason).toBe("HIT_STREAK");
    });

    test("first AB of the game is always notable", () => {
      const result = scoreNotability(
        play({
          inning: 1,
          outsBefore: 0,
          outsAfter: 1,
          isFirstAB: true,
        }),
        INITIAL_MOOD_STATE,
      );

      expect(result.shouldComment).toBe(true);
      expect(result.reason).toBe("FIRST_AB");
    });

    test("walk-off situation is always notable", () => {
      const result = scoreNotability(
        play({
          inning: 9,
          halfInning: "BOTTOM",
          outsBefore: 1,
          outsAfter: 1,
          homeScoreBefore: 4,
          awayScoreBefore: 4,
          homeScoreAfter: 5,
          awayScoreAfter: 4,
          result: "SINGLE",
          runsScored: 1,
        }),
        INITIAL_MOOD_STATE,
      );

      expect(result.shouldComment).toBe(true);
      expect(result.reason).toBe("WALK_OFF");
    });

    test("no-hitter progress is always notable", () => {
      const result = scoreNotability(
        play({
          inning: 7,
          outsBefore: 2,
          outsAfter: 3,
          isNoHitterActive: true,
          result: "STRIKEOUT",
        }),
        INITIAL_MOOD_STATE,
      );

      expect(result.shouldComment).toBe(true);
      expect(result.reason).toBe("PITCHING_MILESTONE");
    });
  });

  describe("WPA thresholds", () => {
    test("high WPA play is notable", () => {
      const result = scoreNotability(
        play({
          inning: 9,
          halfInning: "BOTTOM",
          outsBefore: 1,
          outsAfter: 2,
          basesBefore: { first: true, second: true, third: true },
          basesAfter: { first: false, second: false, third: false },
          homeScoreBefore: 5,
          awayScoreBefore: 5,
          homeScoreAfter: 5,
          awayScoreAfter: 5,
          result: "DOUBLE_PLAY",
        }),
        INITIAL_MOOD_STATE,
      );

      expect(result.score).toBeGreaterThanOrEqual(0.05);
      expect(result.shouldComment).toBe(true);
      expect(["HIGH_WPA", "BIG_WPA", "WPA"]).toContain(result.reason);
    });

    test("low WPA play is not notable", () => {
      const result = scoreNotability(
        play({
          inning: 2,
          halfInning: "TOP",
          outsBefore: 0,
          outsAfter: 1,
          homeScoreBefore: 0,
          awayScoreBefore: 0,
          homeScoreAfter: 0,
          awayScoreAfter: 0,
          result: "GROUND_OUT",
        }),
        INITIAL_MOOD_STATE,
      );

      expect(result.score).toBeLessThan(0.05);
      expect(result.shouldComment).toBe(false);
      expect(result.reason).toBe("LOW_WPA");
    });

    test("boundary behavior comments at the exact threshold and stays quiet just below it", () => {
      const exactThreshold = scoreNotability(
        play({
          wpaOverride: 0.05,
        }),
        INITIAL_MOOD_STATE,
      );

      const justBelowThreshold = scoreNotability(
        play({
          wpaOverride: 0.0499,
        }),
        INITIAL_MOOD_STATE,
      );

      expect(exactThreshold.score).toBe(0.05);
      expect(exactThreshold.shouldComment).toBe(true);
      expect(justBelowThreshold.score).toBeLessThan(exactThreshold.score);
      expect(justBelowThreshold.shouldComment).toBe(false);
    });
  });

  describe("mood scaling", () => {
    test("same play comments when euphoric, stays quiet when frustrated, and is baseline silent when neutral", () => {
      const candidatePlay = play({
        wpaOverride: 0.0401,
      });

      const euphoric = scoreNotability(candidatePlay, mood(4));
      const neutral = scoreNotability(candidatePlay, mood(0));
      const frustrated = scoreNotability(candidatePlay, mood(-2));

      expect(euphoric.score).toBe(neutral.score);
      expect(neutral.score).toBe(frustrated.score);
      expect(euphoric.shouldComment).toBe(true);
      expect(neutral.shouldComment).toBe(false);
      expect(frustrated.shouldComment).toBe(false);
    });
  });

  describe("purity", () => {
    test("same inputs produce the same outputs", () => {
      const candidatePlay = play({
        inning: 8,
        halfInning: "BOTTOM",
        outsBefore: 2,
        outsAfter: 3,
        basesBefore: { first: true, second: false, third: true },
        basesAfter: { first: false, second: false, third: false },
        homeScoreBefore: 3,
        awayScoreBefore: 4,
        homeScoreAfter: 3,
        awayScoreAfter: 4,
        result: "FLY_OUT",
      });

      expect(scoreNotability(candidatePlay, INITIAL_MOOD_STATE)).toEqual(
        scoreNotability(candidatePlay, INITIAL_MOOD_STATE),
      );
    });

    test("input objects are not mutated", () => {
      const candidatePlay = play({
        inning: 7,
        halfInning: "BOTTOM",
        outsBefore: 1,
        outsAfter: 1,
        basesBefore: { first: true, second: true, third: false },
        basesAfter: { first: true, second: false, third: false },
        homeScoreBefore: 2,
        awayScoreBefore: 3,
        homeScoreAfter: 3,
        awayScoreAfter: 3,
        result: "SINGLE",
        runsScored: 1,
      });
      const candidateMood = mood(0);
      const playSnapshot = structuredClone(candidatePlay);
      const moodSnapshot = structuredClone(candidateMood);

      scoreNotability(candidatePlay, candidateMood);

      expect(candidatePlay).toEqual(playSnapshot);
      expect(candidateMood).toEqual(moodSnapshot);
    });
  });

  describe("score range", () => {
    test("score always stays within 0 and 1", () => {
      const cases = [
        play({
          inning: 2,
          halfInning: "TOP",
          outsBefore: 0,
          outsAfter: 1,
          result: "GROUND_OUT",
        }),
        play({
          inning: 9,
          halfInning: "BOTTOM",
          outsBefore: 1,
          outsAfter: 1,
          homeScoreBefore: 4,
          awayScoreBefore: 4,
          homeScoreAfter: 5,
          awayScoreAfter: 4,
          result: "HOME_RUN",
          runsScored: 1,
        }),
      ];

      for (const candidate of cases) {
        const result = scoreNotability(candidate, INITIAL_MOOD_STATE);
        expect(result.score).toBeGreaterThanOrEqual(0);
        expect(result.score).toBeLessThanOrEqual(1);
      }
    });

    test("bypass plays still return a meaningful score at or above the threshold", () => {
      const result = scoreNotability(
        play({
          result: "FIELDING_ERROR",
          isError: true,
        }),
        mood(-2),
      );

      expect(result.shouldComment).toBe(true);
      expect(result.reason).toBe("ERROR");
      expect(result.score).toBeGreaterThanOrEqual(0.06);
    });
  });
});
