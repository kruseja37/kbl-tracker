import { describe, expect, test } from "vitest";

import {
  buildManagerRecommendationSuppressKey,
  generateManagerRecommendations,
  type ManagerRecommendationInput,
} from "../managerWpaRecommendations";

const baseInput: ManagerRecommendationInput = {
  gameId: "game-1",
  inning: 7,
  half: "top",
  outs: 1,
  totalInnings: 9,
  leverageIndex: 2.1,
  battingTeamId: "away",
  fieldingTeamId: "home",
  offensiveManagerId: "away-manager",
  defensiveManagerId: "home-manager",
};

describe("generateManagerRecommendations", () => {
  test("creates a high-confidence pitching-change card when the current pitcher is urgent in leverage", () => {
    const recommendations = generateManagerRecommendations({
      ...baseInput,
      currentPitcher: {
        playerId: "home-pitcher",
        playerName: "Ace Starter",
        pitchCount: 108,
        isStarter: true,
      },
      availablePitchers: [{ playerId: "home-reliever", playerName: "Fresh Arm" }],
    });

    expect(recommendations).toContainEqual(
      expect.objectContaining({
        type: "consider_pitching_change",
        managerId: "home-manager",
        teamId: "home",
        confidence: "high",
        surface: "recommendation_card",
        primaryAction: "open_pitching_change",
        noChangeAction: "keep_pitcher",
        trackedPlayerIds: ["home-pitcher"],
      }),
    );
  });

  test("uses game-length weighted standards for a seven-inning pitching watch", () => {
    const recommendations = generateManagerRecommendations({
      ...baseInput,
      inning: 5,
      totalInnings: 7,
      leverageIndex: 1.6,
      currentPitcher: {
        playerId: "home-pitcher",
        playerName: "Short Game Starter",
        pitchCount: 76,
        isStarter: true,
      },
      availablePitchers: [{ playerId: "home-reliever", playerName: "Fresh Arm" }],
    });

    expect(recommendations).toContainEqual(
      expect.objectContaining({
        type: "consider_pitching_change",
        confidence: "medium",
        surface: "feed_quick_action",
      }),
    );
  });

  test("creates a pinch-hit recommendation for a bottom-third hitter in high leverage", () => {
    const recommendations = generateManagerRecommendations({
      ...baseInput,
      currentBatter: {
        playerId: "away-hitter-8",
        playerName: "Eight Hitter",
        battingOrder: 8,
        contact: 38,
        power: 42,
      },
      benchHitters: [
        {
          playerId: "away-bench-bat",
          playerName: "Bench Bat",
          contact: 74,
          power: 70,
        },
      ],
    });

    expect(recommendations).toContainEqual(
      expect.objectContaining({
        type: "consider_pinch_hitter",
        managerId: "away-manager",
        teamId: "away",
        confidence: "high",
        primaryAction: "open_pinch_hit",
        noChangeAction: "let_batter_hit",
        trackedPlayerIds: ["away-hitter-8", "away-bench-bat"],
      }),
    );
  });

  test("does not recommend pinch hitting for a top-six hitter", () => {
    const recommendations = generateManagerRecommendations({
      ...baseInput,
      currentBatter: {
        playerId: "away-hitter-5",
        playerName: "Five Hitter",
        battingOrder: 5,
        contact: 38,
        power: 42,
      },
      benchHitters: [
        {
          playerId: "away-bench-bat",
          playerName: "Bench Bat",
          contact: 80,
          power: 80,
        },
      ],
    });

    expect(
      recommendations.some(
        (recommendation) => recommendation.type === "consider_pinch_hitter",
      ),
    ).toBe(false);
  });

  test("creates a defensive replacement recommendation after repeated errors", () => {
    const recommendations = generateManagerRecommendations({
      ...baseInput,
      leverageIndex: 1,
      defenders: [
        {
          playerId: "home-ss",
          playerName: "Shaky Shortstop",
          position: "SS",
          fieldingErrors: 2,
          fieldingRating: 42,
          arm: 50,
        },
      ],
      benchDefenders: [
        {
          playerId: "home-glove",
          playerName: "Clean Glove",
          positions: ["SS"],
          fieldingRating: 75,
          arm: 65,
        },
      ],
    });

    expect(recommendations).toContainEqual(
      expect.objectContaining({
        type: "consider_defensive_replacement",
        managerId: "home-manager",
        teamId: "home",
        confidence: "high",
        primaryAction: "open_defensive_sub",
        noChangeAction: "decline_defensive_sub",
        trackedPlayerIds: ["home-ss", "home-glove"],
      }),
    );
  });

  test("creates a defensive replacement recommendation for a late close lead", () => {
    const recommendations = generateManagerRecommendations({
      ...baseInput,
      inning: 8,
      scoreDifferentialForFieldingTeam: 2,
      defenders: [
        {
          playerId: "home-lf",
          playerName: "Big Bat Left",
          position: "LF",
          fieldingRating: 45,
          arm: 45,
        },
      ],
      benchDefenders: [
        {
          playerId: "home-defense",
          playerName: "Late Glove",
          positions: ["LF", "CF", "RF"],
          fieldingRating: 68,
          arm: 65,
        },
      ],
    });

    expect(recommendations).toContainEqual(
      expect.objectContaining({
        type: "consider_defensive_replacement",
        confidence: "high",
        surface: "recommendation_card",
      }),
    );
  });

  test("suppresses repeated recommendations for the same player in the same half inning", () => {
    const suppressKey = buildManagerRecommendationSuppressKey(
      "consider_pitching_change",
      "home-pitcher",
      7,
      "top",
    );

    const recommendations = generateManagerRecommendations({
      ...baseInput,
      currentPitcher: {
        playerId: "home-pitcher",
        playerName: "Ace Starter",
        pitchCount: 108,
        isStarter: true,
      },
      availablePitchers: [{ playerId: "home-reliever", playerName: "Fresh Arm" }],
      suppressedRecommendationKeys: [suppressKey],
    });

    expect(
      recommendations.some(
        (recommendation) =>
          recommendation.type === "consider_pitching_change",
      ),
    ).toBe(false);
  });

  test("dedupes repeated recommendation inputs to one row per suppress key", () => {
    const recommendations = generateManagerRecommendations({
      ...baseInput,
      defenders: [
        {
          playerId: "home-ss",
          playerName: "Shaky Shortstop",
          position: "SS",
          fieldingErrors: 2,
          fieldingRating: 42,
        },
        {
          playerId: "home-ss",
          playerName: "Shaky Shortstop",
          position: "SS",
          fieldingErrors: 2,
          fieldingRating: 40,
        },
      ],
      benchDefenders: [
        {
          playerId: "home-glove",
          playerName: "Clean Glove",
          positions: ["SS"],
          fieldingRating: 75,
        },
      ],
    });

    const defensiveRecommendations = recommendations.filter(
      (recommendation) =>
        recommendation.type === "consider_defensive_replacement",
    );
    expect(defensiveRecommendations).toHaveLength(1);
  });
});
