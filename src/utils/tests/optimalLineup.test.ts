import { describe, expect, test } from "vitest";

import {
  buildLineupSnapshotFromSlots,
  buildOptimalLineupSnapshot,
  mapLineupSnapshotDeviations,
} from "../optimalLineup";
import type { OptimalLineupCandidate } from "../optimalLineup";

const candidates: OptimalLineupCandidate[] = [
  {
    playerId: "elite-ss",
    playerName: "Elite Shortstop",
    bats: "R",
    primaryPosition: "SS",
    power: 80,
    contact: 85,
    speed: 70,
    fielding: 92,
    arm: 88,
  },
  {
    playerId: "bench-cf",
    playerName: "Bench Center",
    bats: "L",
    primaryPosition: "CF",
    power: 72,
    contact: 78,
    speed: 84,
    fielding: 88,
    arm: 82,
  },
  {
    playerId: "starter-cf",
    playerName: "Starter Center",
    bats: "R",
    primaryPosition: "CF",
    power: 42,
    contact: 48,
    speed: 55,
    fielding: 55,
    arm: 52,
  },
  {
    playerId: "catcher",
    playerName: "Catcher",
    bats: "S",
    primaryPosition: "C",
    power: 50,
    contact: 55,
    speed: 30,
    fielding: 82,
    arm: 78,
  },
  {
    playerId: "first-base",
    playerName: "First Base",
    bats: "L",
    primaryPosition: "1B",
    power: 76,
    contact: 64,
    speed: 34,
    fielding: 55,
    arm: 45,
  },
  {
    playerId: "second-base",
    playerName: "Second Base",
    bats: "R",
    primaryPosition: "2B",
    power: 50,
    contact: 70,
    speed: 68,
    fielding: 78,
    arm: 70,
  },
  {
    playerId: "third-base",
    playerName: "Third Base",
    bats: "R",
    primaryPosition: "3B",
    power: 65,
    contact: 60,
    speed: 45,
    fielding: 65,
    arm: 72,
  },
  {
    playerId: "left-field",
    playerName: "Left Field",
    bats: "L",
    primaryPosition: "LF",
    power: 68,
    contact: 62,
    speed: 60,
    fielding: 60,
    arm: 58,
  },
  {
    playerId: "right-field",
    playerName: "Right Field",
    bats: "R",
    primaryPosition: "RF",
    power: 58,
    contact: 66,
    speed: 62,
    fielding: 64,
    arm: 68,
  },
  {
    playerId: "pitcher",
    playerName: "Pitcher",
    primaryPosition: "SP",
    power: 15,
    contact: 20,
  },
];

describe("optimal lineup engine", () => {
  test("builds deterministic whole-roster snapshots and excludes pitchers", () => {
    const snapshot = buildOptimalLineupSnapshot({
      teamId: "team-a",
      mode: "exhibition",
      opposingPitcherHand: "R",
      candidates,
      dhEnabled: true,
      generatedAt: 100,
      generatedFrom: "league_builder",
      sourceConfidence: "engine_calculated",
    });

    expect(snapshot.algorithmVersion).toBe("kbl-optimal-lineup-v2-greedy-1");
    expect(snapshot.slots).toHaveLength(9);
    expect(snapshot.slots.some((slot) => slot.playerId === "pitcher")).toBe(false);
    expect(snapshot.slots.some((slot) => slot.playerId === "bench-cf")).toBe(true);
  });

  test("maps chosen lineup deviations without double-using chosen or optimal slots", () => {
    const optimal = buildOptimalLineupSnapshot({
      teamId: "team-a",
      mode: "exhibition",
      opposingPitcherHand: "R",
      candidates,
      dhEnabled: false,
      generatedAt: 100,
      generatedFrom: "game_lock",
      sourceConfidence: "engine_calculated",
    });
    const chosen = buildLineupSnapshotFromSlots({
      teamId: "team-a",
      mode: "exhibition",
      opposingPitcherHand: "R",
      candidates,
      dhEnabled: false,
      generatedAt: 100,
      slots: [
        { playerId: "starter-cf", playerName: "Starter Center", battingOrderSlot: 1, defensivePosition: "CF" },
        { playerId: "elite-ss", playerName: "Elite Shortstop", battingOrderSlot: 2, defensivePosition: "SS" },
        { playerId: "catcher", playerName: "Catcher", battingOrderSlot: 3, defensivePosition: "C" },
        { playerId: "first-base", playerName: "First Base", battingOrderSlot: 4, defensivePosition: "1B" },
        { playerId: "second-base", playerName: "Second Base", battingOrderSlot: 5, defensivePosition: "2B" },
        { playerId: "third-base", playerName: "Third Base", battingOrderSlot: 6, defensivePosition: "3B" },
        { playerId: "left-field", playerName: "Left Field", battingOrderSlot: 7, defensivePosition: "LF" },
        { playerId: "right-field", playerName: "Right Field", battingOrderSlot: 8, defensivePosition: "RF" },
      ],
    });

    const deviations = mapLineupSnapshotDeviations({ chosen, optimal });
    const chosenKeys = new Set(
      deviations.map((deviation) => `${deviation.chosenSlot.playerId}:${deviation.chosenSlot.battingOrderSlot}`),
    );
    const optimalKeys = new Set(
      deviations.map((deviation) => `${deviation.optimalSlot.playerId}:${deviation.optimalSlot.battingOrderSlot}`),
    );

    expect(deviations.length).toBeGreaterThan(0);
    expect(chosenKeys.size).toBe(deviations.length);
    expect(optimalKeys.size).toBe(deviations.length);
  });
});
