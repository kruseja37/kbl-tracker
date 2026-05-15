import { describe, expect, test } from "vitest";

import {
  ALL_MANAGER_DECISION_TYPES,
  MANAGER_DECISION_REGISTRY,
  MANAGER_WPA_SHARE_BY_DECISION_TYPE,
  SUPPORTED_MANAGER_DECISION_TYPES,
} from "../managerDecisionRegistry";

describe("manager decision registry", () => {
  test("registers every manager decision type with coverage metadata", () => {
    for (const decisionType of ALL_MANAGER_DECISION_TYPES) {
      const entry = MANAGER_DECISION_REGISTRY[decisionType];

      expect(entry).toMatchObject({
        decisionType,
        label: expect.any(String),
        triggerSource: expect.any(String),
        actingTeam: expect.any(String),
        captureMode: expect.any(String),
        layer: expect.any(String),
        horizon: expect.any(String),
        resolutionEndpoint: expect.any(String),
        editable: expect.any(Boolean),
        doubleCountingExclusions: expect.any(Array),
      });
      expect(entry.label.length).toBeGreaterThan(0);
      expect(entry.triggerSource.length).toBeGreaterThan(0);
    }
  });

  test("keeps the SMB-supported universe closed without defensive alignment scoring", () => {
    expect(SUPPORTED_MANAGER_DECISION_TYPES).toEqual([
      "lineup_construction",
      "pitching_change",
      "leave_pitcher_in",
      "pinch_hitter",
      "let_batter_hit",
      "pinch_runner",
      "defensive_sub",
      "position_change",
      "intentional_walk",
      "steal_send",
      "runner_hold",
      "out_advancing_send",
      "bunt_call",
      "squeeze_call",
      "hit_and_run",
      "manual_note",
    ]);
    expect(MANAGER_DECISION_REGISTRY.defensive_alignment).toMatchObject({
      supported: false,
      captureMode: "unsupported",
      layer: "manual",
      horizon: "single_play",
      resolutionEndpoint: "same_event",
      doubleCountingExclusions: ["active_manager_value"],
    });
    expect(MANAGER_WPA_SHARE_BY_DECISION_TYPE.defensive_alignment).toBeUndefined();
  });

  test("assigns an explicit decision horizon to every supported decision", () => {
    expect(
      Object.fromEntries(
        SUPPORTED_MANAGER_DECISION_TYPES.map((decisionType) => [
          decisionType,
          MANAGER_DECISION_REGISTRY[decisionType].horizon,
        ]),
      ),
    ).toEqual({
      lineup_construction: "lineup_baseline",
      pitching_change: "matchup",
      leave_pitcher_in: "matchup",
      pinch_hitter: "matchup",
      let_batter_hit: "matchup",
      pinch_runner: "personnel_stint",
      defensive_sub: "matchup",
      position_change: "matchup",
      intentional_walk: "inning_consequence",
      steal_send: "single_play",
      runner_hold: "single_play",
      out_advancing_send: "single_play",
      bunt_call: "single_play",
      squeeze_call: "single_play",
      hit_and_run: "single_play",
      manual_note: "single_play",
    });
  });

  test("declares passive runner decisions without prompt-only capture", () => {
    expect(MANAGER_DECISION_REGISTRY.steal_send.captureMode).toBe("automatic");
    expect(MANAGER_DECISION_REGISTRY.bunt_call.captureMode).toBe("automatic");
    expect(MANAGER_DECISION_REGISTRY.squeeze_call.captureMode).toBe("automatic");
    expect(MANAGER_DECISION_REGISTRY.runner_hold.captureMode).toBe(
      "play_log_enhancement",
    );
    expect(MANAGER_DECISION_REGISTRY.out_advancing_send.captureMode).toBe(
      "play_log_enhancement",
    );
    expect(MANAGER_DECISION_REGISTRY.hit_and_run.captureMode).toBe(
      "play_log_enhancement",
    );
  });

  test("keeps prompted decisions limited to actionable keep-current forks", () => {
    expect(
      SUPPORTED_MANAGER_DECISION_TYPES.filter(
        (decisionType) =>
          MANAGER_DECISION_REGISTRY[decisionType].captureMode === "prompted",
      ),
    ).toEqual(["leave_pitcher_in", "let_batter_hit"]);
  });

  test("keeps hit-and-run at the agreed tactical share", () => {
    expect(MANAGER_WPA_SHARE_BY_DECISION_TYPE.hit_and_run).toBe(0.35);
  });

  test("tracks intentional walks as inning-consequence runner decisions", () => {
    expect(MANAGER_DECISION_REGISTRY.intentional_walk).toMatchObject({
      actingTeam: "defense",
      horizon: "inning_consequence",
      resolutionEndpoint: "runner_consequence",
      managerShare: 1,
      doubleCountingExclusions: ["player_kbl_wpa"],
    });
  });
});
