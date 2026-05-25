import { describe, expect, test } from "vitest";

import type {
  ManagerDecisionRecord,
  ManagerDeploymentStintRecord,
  ManagerLineupDeltaRecord,
} from "../../types/managerWpa";
import type { KblWpaCredit, KblWpaRole } from "../kblWpaAttribution";
import {
  getGamePogAwardSet,
  getPogAwardStatLineItems,
  MIN_POSITIVE_WPA,
  type PogAward,
  type PogAwardType,
} from "../pogAwards";

function createCredit(overrides: {
  playerId: string;
  playerName?: string;
  teamId?: string;
  role: KblWpaRole;
  wpa: number;
  confidence?: KblWpaCredit["confidence"];
  basis?: string;
}): KblWpaCredit {
  return {
    eventId: `event-${overrides.playerId}-${overrides.role}-${overrides.wpa}`,
    source: "at_bat",
    playerId: overrides.playerId,
    playerName: overrides.playerName ?? overrides.playerId,
    teamId: overrides.teamId ?? "away",
    role: overrides.role,
    wpa: overrides.wpa,
    confidence: overrides.confidence ?? "high",
    basis: overrides.basis ?? `${overrides.role} WPA`,
    allocationMode: "ratio",
  };
}

function award(
  awards: ReturnType<typeof getGamePogAwardSet>,
  awardType: PogAwardType,
): PogAward | undefined {
  return awards.awards.find((entry) => entry.awardType === awardType);
}

function createDecision(
  overrides: Partial<ManagerDecisionRecord> = {},
): ManagerDecisionRecord {
  return {
    decisionId: overrides.decisionId ?? "game-1:away:steal",
    gameId: overrides.gameId ?? "game-1",
    managerId: overrides.managerId ?? "away-manager",
    teamId: overrides.teamId ?? "away",
    opponentTeamId: overrides.opponentTeamId ?? "home",
    decisionType: overrides.decisionType ?? "steal_send",
    inferenceMethod: "automatic",
    decisionSource: "user_action",
    confidence: "high",
    inning: 6,
    half: "top",
    outs: 1,
    baseState: "1--",
    scoreDifferentialForTeam: 0,
    leverageIndex: 1.8,
    decisionEventId: "event-1",
    linkedEventIds: ["event-1"],
    involvedPlayerIds: ["runner-1"],
    teamWinProbabilityBefore: 0.5,
    teamWinProbabilityAfter: 0.7,
    managerWpa: 0.02,
    rawWindowWpa: 0.02,
    managerShare: 1,
    resolved: true,
    resolvedAtEventId: "event-2",
    displayTitle: "Steal send",
    displaySummary: "Sent the runner",
    derivation: {
      derivedFromEventIds: ["event-1"],
      derivedFromFields: ["runnerAction"],
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
    stintId: overrides.stintId ?? "game-1:away:deployment",
    gameId: overrides.gameId ?? "game-1",
    managerId: overrides.managerId ?? "away-manager",
    teamId: overrides.teamId ?? "away",
    deploymentRole: overrides.deploymentRole ?? "pinch_hitter_remaining",
    playerId: "bench-1",
    playerName: "Bench One",
    sourceEventId: "bp-1",
    openedAtEventIndex: 1,
    tacticalExclusionEventIds: ["event-1"],
    closeReason: "game_end",
    linkedEventIds: ["event-2"],
    rawLinkedWpa: 0.02,
    managerShare: 0.15,
    managerDeploymentWpa: 0.002,
    cap: 0.15,
    confidence: "medium",
    ...overrides,
  };
}

function createLineupDelta(
  overrides: Partial<ManagerLineupDeltaRecord> = {},
): ManagerLineupDeltaRecord {
  return {
    decisionId: overrides.decisionId ?? "game-1:away:lineup",
    gameId: overrides.gameId ?? "game-1",
    managerId: overrides.managerId ?? "away-manager",
    teamId: overrides.teamId ?? "away",
    decisionType: "lineup_construction",
    inferenceMethod: "automatic",
    confidence: "low",
    starterPlayerId: "starter-1",
    starterPlayerName: "Starter One",
    battingOrderSlot: 1,
    defensivePosition: "SS",
    starterRole: "position_player",
    actualPlayerKblWpa: 0.4,
    replacementExpectedKblWpa: 0.05,
    replacementBaselineSource: "optimal_lineup_v2",
    replacementBaselineConfidence: "medium",
    rawPerformanceDelta: 0.4,
    managerShare: 0.25,
    managerWpa: 0.002,
    ...overrides,
  };
}

describe("getGamePogAwardSet", () => {
  test("pitcher can win Overall POG over hitter by total player WPA", () => {
    const awards = getGamePogAwardSet({
      kblWpaCredits: [
        createCredit({
          playerId: "home-pitcher",
          playerName: "Home Pitcher",
          teamId: "home",
          role: "pitching",
          wpa: 0.42,
        }),
        createCredit({
          playerId: "away-hitter",
          playerName: "Away Hitter",
          role: "batting",
          wpa: 0.36,
        }),
      ],
    });

    expect(awards.overall).toMatchObject({
      awardType: "overall",
      playerId: "home-pitcher",
      points: 3,
      value: 0.42,
    });
    expect(award(awards, "best_hitter")?.playerId).toBe("away-hitter");
    expect(awards.overall?.statRole).toBe("pitcher");
    expect(award(awards, "best_hitter")?.statRole).toBe("hitter");
  });

  test("mixed/two-way player can win Overall POG from combined roles", () => {
    const awards = getGamePogAwardSet({
      kblWpaCredits: [
        createCredit({
          playerId: "two-way",
          playerName: "Two Way",
          role: "batting",
          wpa: 0.12,
        }),
        createCredit({
          playerId: "two-way",
          playerName: "Two Way",
          role: "pitching",
          wpa: 0.12,
        }),
        createCredit({
          playerId: "pure-hitter",
          playerName: "Pure Hitter",
          role: "batting",
          wpa: 0.2,
        }),
      ],
    });

    expect(awards.overall?.playerId).toBe("two-way");
    expect(awards.overall?.value).toBe(0.24);
    expect(award(awards, "best_hitter")?.playerId).toBe("pure-hitter");
  });

  test("Overall POG is excluded from all secondary player awards", () => {
    const awards = getGamePogAwardSet({
      kblWpaCredits: [
        createCredit({ playerId: "overall", role: "batting", wpa: 0.4 }),
        createCredit({ playerId: "overall", role: "pitching", wpa: 0.2 }),
        createCredit({ playerId: "overall", role: "baserunning", wpa: 0.2 }),
        createCredit({ playerId: "overall", role: "fielding", wpa: 0.2 }),
        createCredit({ playerId: "hitter", role: "batting", wpa: 0.08 }),
        createCredit({ playerId: "pitcher", role: "pitching", wpa: 0.07 }),
        createCredit({ playerId: "runner", role: "baserunning", wpa: 0.06 }),
        createCredit({ playerId: "fielder", role: "fielding", wpa: 0.05 }),
      ],
    });

    expect(awards.overall?.playerId).toBe("overall");
    expect(awards.playerRoleAwards.map((entry) => entry.playerId)).toEqual([
      "hitter",
      "pitcher",
      "runner",
      "fielder",
    ]);
    expect(
      awards.playerRoleAwards.every((entry) => entry.playerId !== "overall"),
    ).toBe(true);
  });

  test("secondary role award skips zero, negative, and noise value", () => {
    const awards = getGamePogAwardSet({
      kblWpaCredits: [
        createCredit({ playerId: "overall", role: "pitching", wpa: 0.2 }),
        createCredit({
          playerId: "noise-hitter",
          role: "batting",
          wpa: MIN_POSITIVE_WPA,
        }),
        createCredit({ playerId: "zero-hitter", role: "batting", wpa: 0 }),
        createCredit({ playerId: "negative-hitter", role: "batting", wpa: -0.1 }),
      ],
    });

    expect(awards.overall?.playerId).toBe("overall");
    expect(award(awards, "best_hitter")).toBeUndefined();
  });

  test("Best Fielder uses fieldingWpa plus catchingWpa", () => {
    const awards = getGamePogAwardSet({
      kblWpaCredits: [
        createCredit({ playerId: "overall", role: "batting", wpa: 0.2 }),
        createCredit({ playerId: "combo-fielder", role: "fielding", wpa: 0.004 }),
        createCredit({ playerId: "combo-fielder", role: "catching", wpa: 0.004 }),
        createCredit({ playerId: "fielding-only", role: "fielding", wpa: 0.006 }),
      ],
    });

    expect(awards.overall?.playerId).toBe("overall");
    expect(award(awards, "best_fielder")).toMatchObject({
      playerId: "combo-fielder",
      statRole: "fielder",
      value: 0.008,
    });
  });

  test("role award thresholds apply to pitcher, baserunner, and fielder", () => {
    const awards = getGamePogAwardSet({
      kblWpaCredits: [
        createCredit({ playerId: "overall", role: "batting", wpa: 0.2 }),
        createCredit({
          playerId: "noise-pitcher",
          role: "pitching",
          wpa: MIN_POSITIVE_WPA,
        }),
        createCredit({ playerId: "noise-runner", role: "baserunning", wpa: 0.004 }),
        createCredit({ playerId: "noise-fielder", role: "fielding", wpa: 0.003 }),
        createCredit({ playerId: "noise-fielder", role: "catching", wpa: 0.002 }),
      ],
    });

    expect(award(awards, "best_pitcher")).toBeUndefined();
    expect(award(awards, "best_baserunner")).toBeUndefined();
    expect(award(awards, "best_fielder")).toBeUndefined();
  });

  test("Best Manager requires positive committed Manager Value", () => {
    const tooSmall = getGamePogAwardSet({
      managerDecisions: [createDecision({ managerWpa: 0.004 })],
    });
    const positive = getGamePogAwardSet({
      managerDecisions: [createDecision({ managerWpa: 0.002 })],
      managerDeploymentStints: [
        createDeploymentStint({ managerDeploymentWpa: 0.002 }),
      ],
      managerLineupDeltas: [createLineupDelta({ managerWpa: 0.002 })],
    });

    expect(tooSmall.managerAward).toBeUndefined();
    expect(positive.managerAward).toMatchObject({
      awardType: "best_manager",
      managerId: "away-manager",
      points: 1,
      statRole: "manager",
      value: 0.006,
    });
  });

  test("manager-only positive data returns manager_value source and Best Manager award", () => {
    const awards = getGamePogAwardSet({
      managerDecisions: [createDecision({ managerWpa: 0.006 })],
    });

    expect(awards.dataQuality.source).toBe("manager_value");
    expect(awards.overall).toBeUndefined();
    expect(awards.playerRoleAwards).toEqual([]);
    expect(awards.managerAward).toMatchObject({
      awardType: "best_manager",
      managerId: "away-manager",
      value: 0.006,
    });
    expect(awards.awards).toHaveLength(1);
  });

  test("manager-only non-positive data returns manager_value source but no award", () => {
    const awards = getGamePogAwardSet({
      managerDecisions: [createDecision({ managerWpa: -0.01 })],
    });

    expect(awards.dataQuality.source).toBe("manager_value");
    expect(awards.overall).toBeUndefined();
    expect(awards.managerAward).toBeUndefined();
    expect(awards.managerTotals).toEqual([
      expect.objectContaining({
        managerId: "away-manager",
        managerValue: -0.01,
      }),
    ]);
    expect(awards.dataQuality.warnings).toContain(
      "Manager Value records were available, but no manager cleared the meaningful positive threshold for Best Manager.",
    );
  });

  test("Manager Value does not affect player Overall POG", () => {
    const awards = getGamePogAwardSet({
      kblWpaCredits: [
        createCredit({ playerId: "modest-player", role: "batting", wpa: 0.02 }),
        createCredit({ playerId: "best-player", role: "pitching", wpa: 0.03 }),
      ],
      managerDecisions: [createDecision({ managerWpa: 0.5 })],
    });

    expect(awards.overall?.playerId).toBe("best-player");
    expect(awards.managerAward?.managerId).toBe("away-manager");
    expect(awards.managerAward?.value).toBe(0.5);
  });

  test("stored-only fallback gives first player 3 points but creates no role awards", () => {
    const awards = getGamePogAwardSet({
      playersOfTheGame: {
        first: "stored-first",
        second: "stored-second",
        third: "stored-third",
      },
      playerStats: {
        "stored-first": { playerName: "Stored First", teamId: "away" },
        "stored-second": { playerName: "Stored Second", teamId: "home" },
        "stored-third": { playerName: "Stored Third", teamId: "away" },
      },
    });

    expect(awards.dataQuality.source).toBe("stored_pog");
    expect(awards.overall).toMatchObject({
      awardType: "overall",
      playerId: "stored-first",
      playerName: "Stored First",
      points: 3,
      source: "stored_pog",
    });
    expect(awards.playerRoleAwards).toEqual([]);
    expect(awards.legacyContext.map((entry) => entry.playerId)).toEqual([
      "stored-second",
      "stored-third",
    ]);
  });

  test("full KBL WPA takes precedence over stored POG ids", () => {
    const awards = getGamePogAwardSet({
      playersOfTheGame: {
        first: "stored-first",
        second: "stored-second",
        third: "stored-third",
      },
      kblWpaCredits: [
        createCredit({ playerId: "stored-first", role: "batting", wpa: 0.01 }),
        createCredit({ playerId: "kbl-winner", role: "pitching", wpa: 0.4 }),
      ],
    });

    expect(awards.dataQuality.source).toBe("kbl_wpa");
    expect(awards.overall?.playerId).toBe("kbl-winner");
    expect(awards.legacyContext).toEqual([]);
  });

  test("legacy_at_bat_wpa fallback cannot create secondary role awards", () => {
    const awards = getGamePogAwardSet({
      kblWpaCredits: [
        createCredit({
          playerId: "archived-batter",
          playerName: "Archived Batter",
          role: "batting",
          wpa: 0.14,
          confidence: "low",
          basis: "Archived batting WPA fallback",
        }),
      ],
    });

    expect(awards.dataQuality.source).toBe("legacy_at_bat_wpa");
    expect(awards.overall).toMatchObject({
      playerId: "archived-batter",
      points: 3,
      source: "legacy_at_bat_wpa",
    });
    expect(award(awards, "best_hitter")).toBeUndefined();
    expect(awards.playerRoleAwards).toEqual([]);
  });

  test("empty/no usable data returns an honest unavailable award set", () => {
    const awards = getGamePogAwardSet({});

    expect(awards.dataQuality.source).toBe("unavailable");
    expect(awards.awards).toEqual([]);
    expect(awards.overall).toBeUndefined();
    expect(awards.playerRoleAwards).toEqual([]);
    expect(awards.managerAward).toBeUndefined();
  });

  test("POG stat lines follow the award role before generic player stats", () => {
    const awards = getGamePogAwardSet({
      kblWpaCredits: [
        createCredit({ playerId: "overall", role: "batting", wpa: 0.2 }),
        createCredit({
          playerId: "pitcher-hitter",
          playerName: "Pitcher Hitter",
          role: "pitching",
          wpa: 0.08,
        }),
        createCredit({
          playerId: "runner",
          role: "baserunning",
          wpa: 0.06,
        }),
        createCredit({
          playerId: "fielder",
          role: "fielding",
          wpa: 0.05,
        }),
      ],
      managerDecisions: [
        createDecision({
          managerId: "manager-1",
          managerWpa: 0.006,
        }),
      ],
    });
    const pitcherAward = award(awards, "best_pitcher");
    const runnerAward = award(awards, "best_baserunner");
    const fielderAward = award(awards, "best_fielder");
    const managerAward = award(awards, "best_manager");

    expect(pitcherAward).toBeDefined();
    expect(
      getPogAwardStatLineItems(pitcherAward!, {
        battingStats: { h: 3, ab: 4, bb: 0, k: 1, rbi: 2, r: 1 },
        pitchingStats: {
          outsRecorded: 17,
          strikeoutsThrown: 8,
          earnedRuns: 1,
          walksAllowed: 2,
        },
      }),
    ).toEqual(["5.2 IP", "8 K", "1 ER"]);

    expect(runnerAward).toBeDefined();
    expect(getPogAwardStatLineItems(runnerAward!)).toEqual([
      "Baserunning +6.0 pp KBL WPA",
    ]);

    expect(fielderAward).toBeDefined();
    expect(getPogAwardStatLineItems(fielderAward!)).toEqual([
      "Fielding +5.0 pp KBL WPA",
    ]);

    expect(managerAward).toBeDefined();
    expect(getPogAwardStatLineItems(managerAward!)).toEqual([
      "+0.6 pp Manager Value",
    ]);
  });
});
