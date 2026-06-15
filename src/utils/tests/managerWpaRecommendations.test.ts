import { describe, expect, test } from "vitest";

import {
  buildManagerRecommendationWatchEvent,
  buildPromptedManagerDecisionFromRecommendation,
  buildManagerRecommendationSuppressKey,
  generateManagerRecommendations,
  getPromptedDecisionTypeForRecommendationAction,
  type DefenderRecommendationPlayer,
  type HitterRecommendationPlayer,
  type ManagerRecommendationInput,
  type PitchingRecommendationPlayer,
} from "../managerWpaRecommendations";

const baseInput: ManagerRecommendationInput = {
  gameId: "game-1",
  inning: 7,
  half: "top",
  outs: 1,
  totalInnings: 9,
  leverageIndex: 2.1,
  count: { balls: 1, strikes: 1 },
  bases: { first: undefined, second: "runner-2", third: undefined },
  runnersOn: 1,
  risp: true,
  battingTeamId: "away",
  fieldingTeamId: "home",
  offensiveManagerId: "away-manager",
  defensiveManagerId: "home-manager",
};

function hitter(overrides: Partial<HitterRecommendationPlayer> = {}): HitterRecommendationPlayer {
  return {
    playerId: "hitter",
    playerName: "Hitter",
    battingOrder: 8,
    position: "DH",
    primaryPosition: "DH",
    battingHand: "R",
    bats: "R",
    throws: "R",
    power: 50,
    contact: 50,
    speed: 50,
    fieldingRating: 45,
    arm: 45,
    velocity: 0,
    junk: 0,
    accuracy: 0,
    mojo: "Normal",
    fitness: "FIT",
    ...overrides,
  };
}

function pitcher(overrides: Partial<PitchingRecommendationPlayer> = {}): PitchingRecommendationPlayer {
  return {
    playerId: "pitcher",
    playerName: "Pitcher",
    position: "SP",
    primaryPosition: "SP",
    role: "SP",
    pitcherRole: "SP",
    throws: "R",
    throwingHand: "R",
    power: 15,
    contact: 15,
    speed: 25,
    fieldingRating: 55,
    arm: 55,
    velocity: 55,
    junk: 55,
    accuracy: 55,
    pitchCount: 0,
    mojo: "Normal",
    fitness: "FIT",
    ...overrides,
  };
}

function defender(overrides: Partial<DefenderRecommendationPlayer> = {}): DefenderRecommendationPlayer {
  return {
    playerId: "defender",
    playerName: "Defender",
    position: "SS",
    primaryPosition: "SS",
    battingHand: "R",
    bats: "R",
    throws: "R",
    power: 35,
    contact: 35,
    speed: 45,
    fieldingRating: 45,
    arm: 45,
    velocity: 0,
    junk: 0,
    accuracy: 0,
    mojo: "Normal",
    fitness: "FIT",
    ...overrides,
  };
}

function pitchingRecInput(overrides: Partial<ManagerRecommendationInput> = {}): ManagerRecommendationInput {
  return {
    ...baseInput,
    currentBatter: hitter({
      playerId: "away-batter",
      playerName: "Away Batter",
      battingHand: "L",
      bats: "L",
    }),
    currentPitcher: pitcher({
      playerId: "home-pitcher",
      playerName: "Ace Starter",
      velocity: 58,
      junk: 56,
      accuracy: 54,
      pitchCount: 118,
      isStarter: true,
    }),
    availablePitchers: [
      pitcher({
        playerId: "home-reliever",
        playerName: "Fresh Arm",
        position: "RP",
        primaryPosition: "RP",
        role: "RP",
        pitcherRole: "RP",
        velocity: 88,
        junk: 86,
        accuracy: 84,
        pitchCount: 0,
        isStarter: false,
      }),
    ],
    ...overrides,
  };
}

describe("generateManagerRecommendations", () => {
  test("fires a high-confidence pinch-hit rec for a clearly better IV-of-effectiveRatings bench bat", () => {
    const recommendations = generateManagerRecommendations({
      ...baseInput,
      currentBatter: hitter({
        playerId: "away-hitter-8",
        playerName: "Eight Hitter",
        power: 30,
        contact: 30,
        speed: 30,
      }),
      opposingPitcher: pitcher({
        playerId: "home-current-pitcher",
        playerName: "Current Pitcher",
        throws: "R",
        throwingHand: "R",
      }),
      benchHitters: [
        hitter({
          playerId: "away-bench-bat",
          playerName: "Bench Bat",
          power: 96,
          contact: 94,
          speed: 72,
        }),
      ],
    });

    expect(recommendations).toContainEqual(
      expect.objectContaining({
        type: "consider_pinch_hitter",
        managerId: "away-manager",
        teamId: "away",
        confidence: "high",
        surface: "recommendation_card",
        primaryAction: "open_pinch_hit",
        noChangeAction: "let_batter_hit",
        trackedPlayerIds: ["away-hitter-8", "away-bench-bat"],
      }),
    );
    expect(recommendations[0].rationale).toContain("IV delta");
  });

  test("does not fire a pinch-hit rec for a marginal IV delta", () => {
    const recommendations = generateManagerRecommendations({
      ...baseInput,
      currentBatter: hitter({
        playerId: "away-hitter-8",
        playerName: "Eight Hitter",
        power: 60,
        contact: 60,
      }),
      opposingPitcher: pitcher({ playerId: "home-current-pitcher" }),
      benchHitters: [
        hitter({
          playerId: "away-marginal-bat",
          playerName: "Marginal Bat",
          power: 61,
          contact: 61,
        }),
      ],
    });

    expect(recommendations.some((recommendation) => recommendation.type === "consider_pinch_hitter")).toBe(false);
  });

  test("top-six hitters can still trigger when the pure IV delta clears threshold", () => {
    const recommendations = generateManagerRecommendations({
      ...baseInput,
      currentBatter: hitter({
        playerId: "away-hitter-5",
        playerName: "Five Hitter",
        battingOrder: 5,
        power: 30,
        contact: 30,
      }),
      opposingPitcher: pitcher({ playerId: "home-current-pitcher" }),
      benchHitters: [
        hitter({
          playerId: "away-bench-bat",
          playerName: "Bench Bat",
          power: 96,
          contact: 94,
          speed: 72,
        }),
      ],
    });

    expect(recommendations).toContainEqual(
      expect.objectContaining({
        type: "consider_pinch_hitter",
        trackedPlayerIds: ["away-hitter-5", "away-bench-bat"],
      }),
    );
  });

  test("pitcher fatigue in effectiveRatings lets a fresh arm clear the IV-delta gate", () => {
    const recommendations = generateManagerRecommendations(pitchingRecInput());

    expect(recommendations).toContainEqual(
      expect.objectContaining({
        type: "consider_pitching_change",
        managerId: "home-manager",
        teamId: "home",
        primaryAction: "open_pitching_change",
        noChangeAction: "keep_pitcher",
        trackedPlayerIds: ["home-pitcher", "home-reliever"],
      }),
    );
    expect(recommendations[0].rationale).toContain("IV delta");
  });

  test("pitcher meltdown fields alone do not fire without a positive IV delta", () => {
    const recommendations = generateManagerRecommendations(pitchingRecInput({
      leverageIndex: 4,
      currentPitcher: pitcher({
        playerId: "home-pitcher",
        playerName: "Calm Ace",
        velocity: 92,
        junk: 90,
        accuracy: 88,
        pitchCount: 20,
        isStarter: true,
        runsAllowedInInning: 6,
        consecutiveBaserunners: 6,
        consecutiveWalks: 4,
      }),
      availablePitchers: [
        pitcher({
          playerId: "home-low-arm",
          playerName: "Low Arm",
          position: "RP",
          primaryPosition: "RP",
          role: "RP",
          pitcherRole: "RP",
          velocity: 35,
          junk: 35,
          accuracy: 35,
        }),
      ],
    }));

    expect(recommendations.some((recommendation) => recommendation.type === "consider_pitching_change")).toBe(false);
  });

  test("trait justification from the T9a engine is surfaced in the manager rationale", () => {
    const recommendations = generateManagerRecommendations({
      ...baseInput,
      currentBatter: hitter({
        playerId: "away-hitter-8",
        playerName: "Eight Hitter",
        power: 45,
        contact: 45,
      }),
      opposingPitcher: pitcher({ playerId: "home-current-pitcher" }),
      benchHitters: [
        hitter({
          playerId: "away-pinch-perfect",
          playerName: "Pinch Perfect Bat",
          power: 72,
          contact: 72,
          trait1: "Pinch Perfect",
        }),
      ],
    });

    expect(recommendations[0]).toMatchObject({
      type: "consider_pinch_hitter",
      trackedPlayerIds: ["away-hitter-8", "away-pinch-perfect"],
    });
    expect(recommendations[0].rationale).toContain("Pinch Perfect active");
  });

  test("mojo justification from the T9a engine is surfaced in the manager rationale", () => {
    const recommendations = generateManagerRecommendations({
      ...baseInput,
      currentBatter: hitter({
        playerId: "away-hitter-8",
        playerName: "Eight Hitter",
        power: 50,
        contact: 50,
      }),
      opposingPitcher: pitcher({ playerId: "home-current-pitcher" }),
      benchHitters: [
        hitter({
          playerId: "away-hot-bat",
          playerName: "Hot Bat",
          power: 72,
          contact: 72,
          mojo: "On Fire",
        }),
      ],
    });

    expect(recommendations[0]).toMatchObject({
      type: "consider_pinch_hitter",
      trackedPlayerIds: ["away-hitter-8", "away-hot-bat"],
    });
    expect(recommendations[0].rationale).toContain("On Fire mojo");
  });

  test("defensive replacement can fire from pure IV delta without late-lead or error gates", () => {
    const recommendations = generateManagerRecommendations({
      ...baseInput,
      inning: 3,
      leverageIndex: 0.7,
      scoreDifferentialForFieldingTeam: -5,
      currentBatter: hitter({ playerId: "away-batter" }),
      defenders: [
        defender({
          playerId: "home-ss",
          playerName: "Shaky Shortstop",
          fieldingErrors: 0,
          fieldingRating: 25,
          arm: 25,
          speed: 35,
        }),
      ],
      benchDefenders: [
        {
          ...defender({
            playerId: "home-glove",
            playerName: "Clean Glove",
            fieldingRating: 98,
            arm: 96,
            speed: 90,
          }),
          positions: ["SS"],
          isAvailable: true,
        },
      ],
    });

    expect(recommendations).toContainEqual(
      expect.objectContaining({
        type: "consider_defensive_replacement",
        managerId: "home-manager",
        teamId: "home",
        primaryAction: "open_defensive_sub",
        noChangeAction: "decline_defensive_sub",
        trackedPlayerIds: ["home-ss", "home-glove"],
      }),
    );
  });

  test("defensive replacement does not fire for a marginal IV delta", () => {
    const recommendations = generateManagerRecommendations({
      ...baseInput,
      defenders: [
        defender({
          playerId: "home-ss",
          playerName: "Steady Shortstop",
          fieldingRating: 70,
          arm: 70,
        }),
      ],
      benchDefenders: [
        {
          ...defender({
            playerId: "home-same-glove",
            playerName: "Same Glove",
            fieldingRating: 71,
            arm: 71,
          }),
          positions: ["SS"],
          isAvailable: true,
        },
      ],
    });

    expect(recommendations.some((recommendation) => recommendation.type === "consider_defensive_replacement")).toBe(false);
  });

  test("suppresses repeated recommendations for the same chosen sub in the same half inning", () => {
    const suppressKey = buildManagerRecommendationSuppressKey(
      "consider_pitching_change",
      "home-reliever",
      7,
      "top",
    );

    const recommendations = generateManagerRecommendations({
      ...pitchingRecInput(),
      suppressedRecommendationKeys: [suppressKey],
    });

    expect(recommendations.some((recommendation) => recommendation.type === "consider_pitching_change")).toBe(false);
  });

  test("dedupes repeated recommendation inputs to one row per suppress key", () => {
    const recommendations = generateManagerRecommendations({
      ...baseInput,
      defenders: [
        defender({
          playerId: "home-ss",
          playerName: "Shaky Shortstop",
          fieldingRating: 25,
          arm: 25,
        }),
        defender({
          playerId: "home-ss",
          playerName: "Shaky Shortstop",
          fieldingRating: 20,
          arm: 20,
        }),
      ],
      benchDefenders: [
        {
          ...defender({
            playerId: "home-glove",
            playerName: "Clean Glove",
            fieldingRating: 98,
            arm: 96,
          }),
          positions: ["SS"],
          isAvailable: true,
        },
      ],
    });

    const defensiveRecommendations = recommendations.filter(
      (recommendation) => recommendation.type === "consider_defensive_replacement",
    );
    expect(defensiveRecommendations).toHaveLength(1);
  });

  test("maps keep-pitcher recommendation action to a prompted leave-pitcher-in record", () => {
    const [recommendation] = generateManagerRecommendations(pitchingRecInput());

    const prompted = buildPromptedManagerDecisionFromRecommendation({
      recommendation,
      action: "keep_pitcher",
      opponentTeamId: "away",
    });

    expect(getPromptedDecisionTypeForRecommendationAction("keep_pitcher")).toBe("leave_pitcher_in");
    expect(prompted).toMatchObject({
      decisionType: "leave_pitcher_in",
      action: "keep_pitcher",
      source: "recommendation",
      decisionSource: "situational_prompt",
      managerId: "home-manager",
      teamId: "home",
      opponentTeamId: "away",
      trackedPlayerIds: ["home-pitcher"],
      involvedPlayerIds: ["home-pitcher", "home-reliever"],
      recommendationId: recommendation.recommendationId,
      provenanceKey: recommendation.suppressKey,
      resolution: { status: "pending", expectedEndpoint: "next_pa" },
    });
  });

  test("maps let-batter-hit recommendation action to a prompted let-batter-hit record", () => {
    const [recommendation] = generateManagerRecommendations({
      ...baseInput,
      currentBatter: hitter({
        playerId: "away-hitter-8",
        playerName: "Eight Hitter",
        power: 30,
        contact: 30,
      }),
      opposingPitcher: pitcher({ playerId: "home-current-pitcher" }),
      benchHitters: [
        hitter({
          playerId: "away-bench-bat",
          playerName: "Bench Bat",
          power: 96,
          contact: 94,
          speed: 72,
        }),
      ],
    });

    const prompted = buildPromptedManagerDecisionFromRecommendation({
      recommendation,
      action: "let_batter_hit",
      opponentTeamId: "home",
    });

    expect(getPromptedDecisionTypeForRecommendationAction("let_batter_hit")).toBe("let_batter_hit");
    expect(prompted).toMatchObject({
      decisionType: "let_batter_hit",
      action: "let_batter_hit",
      source: "recommendation",
      decisionSource: "situational_prompt",
      managerId: "away-manager",
      teamId: "away",
      opponentTeamId: "home",
      trackedPlayerIds: ["away-hitter-8"],
      involvedPlayerIds: ["away-hitter-8", "away-bench-bat"],
      recommendationId: recommendation.recommendationId,
      provenanceKey: recommendation.suppressKey,
      resolution: { status: "pending", expectedEndpoint: "next_pa" },
    });
  });

  test("maps defensive-decline recommendation action to a prompted keep-defender record", () => {
    const [recommendation] = generateManagerRecommendations({
      ...baseInput,
      defenders: [
        defender({
          playerId: "home-ss",
          playerName: "Shaky Shortstop",
          fieldingRating: 25,
          arm: 25,
        }),
      ],
      benchDefenders: [
        {
          ...defender({
            playerId: "home-glove",
            playerName: "Clean Glove",
            fieldingRating: 98,
            arm: 96,
          }),
          positions: ["SS"],
          isAvailable: true,
        },
      ],
    });

    const prompted = buildPromptedManagerDecisionFromRecommendation({
      recommendation,
      action: "decline_defensive_sub",
      opponentTeamId: "away",
    });

    expect(getPromptedDecisionTypeForRecommendationAction("decline_defensive_sub")).toBe("keep_defender_in");
    expect(prompted).toMatchObject({
      decisionType: "keep_defender_in",
      action: "decline_defensive_sub",
      source: "recommendation",
      managerId: "home-manager",
      teamId: "home",
      opponentTeamId: "away",
      trackedPlayerIds: ["home-ss"],
      involvedPlayerIds: ["home-ss", "home-glove"],
      resolution: { status: "pending", expectedEndpoint: "first_fielding_event" },
    });
  });

  test("builds durable watch metadata for shown recommendations", () => {
    const [recommendation] = generateManagerRecommendations(pitchingRecInput());

    expect(
      buildManagerRecommendationWatchEvent({
        recommendation,
        opponentTeamId: "away",
      }),
    ).toMatchObject({
      recommendationId: recommendation.recommendationId,
      type: "consider_pitching_change",
      managerId: "home-manager",
      teamId: "home",
      opponentTeamId: "away",
      trackedPlayerIds: ["home-pitcher", "home-reliever"],
      suppressKey: recommendation.suppressKey,
    });
  });

  test("primary substitution actions do not create keep-current records", () => {
    const [recommendation] = generateManagerRecommendations(pitchingRecInput());

    expect(
      buildPromptedManagerDecisionFromRecommendation({
        recommendation,
        action: "open_pitching_change",
        opponentTeamId: "away",
      }),
    ).toBeNull();
    expect(getPromptedDecisionTypeForRecommendationAction("open_pinch_hit")).toBeNull();
  });
});
