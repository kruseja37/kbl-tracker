import { describe, expect, test } from "vitest";

import type { Pitcher, Player } from "../../app/components/TeamRoster";
import type { TeamLineupSnapshot } from "../../hooks/useGameState";
import { buildDefensiveColumnPlayersForDisplay } from "../../app/pages/GameTracker";

const player = (
  name: string,
  battingOrder: number,
  position: string,
  playerId: string,
  options?: Partial<Player>,
): Player => ({
  name,
  playerId,
  position,
  battingOrder,
  stats: { ab: 0, h: 0, r: 0, rbi: 0, bb: 0, k: 0 },
  battingHand: "R",
  ...options,
});

const pitcher = (
  name: string,
  playerId: string,
  options?: Partial<Pitcher>,
): Pitcher => ({
  name,
  playerId,
  stats: { ip: "0.0", h: 0, r: 0, er: 0, bb: 0, k: 0, pitches: 0 },
  throwingHand: "R",
  isStarter: true,
  isActive: true,
  isOutOfGame: false,
  ...options,
});

describe("defensive column projection", () => {
  test("builds DH defense from eight non-DH hitters plus the active pitcher", () => {
    const players: Player[] = [
      player("Lead Off", 1, "CF", "p1"),
      player("Two Hole", 2, "SS", "p2"),
      player("Three Hole", 3, "1B", "p3"),
      player("Cleanup", 4, "DH", "p4"),
      player("Five Spot", 5, "RF", "p5"),
      player("Six Spot", 6, "LF", "p6"),
      player("Seven Spot", 7, "3B", "p7"),
      player("Eight Spot", 8, "2B", "p8"),
      player("Nine Spot", 9, "C", "p9"),
      player("Starting Pitcher", 9, "P", "p10"),
    ];
    const pitchers = [pitcher("Starting Pitcher", "p10")];
    const pitcherStats = new Map([["p10", { pitchCount: 57 }]]);

    const result = buildDefensiveColumnPlayersForDisplay({
      players,
      pitchers,
      fieldingTeam: "home",
      pitcherStats: pitcherStats as never,
      getRosterEntityId: (entity) => entity.playerId || entity.name,
      explicitUseDh: true,
    });

    expect(result).toHaveLength(9);
    expect(result.filter((entry) => entry.position !== "P")).toHaveLength(8);
    expect(result.map((entry) => entry.position)).toEqual(
      expect.arrayContaining(["CF", "SS", "1B", "RF", "LF", "3B", "2B", "C", "P"]),
    );
    expect(result.find((entry) => entry.playerId === "p10")).toMatchObject({
      position: "P",
      isPitcher: true,
      pitchCount: 57,
    });
    expect(result.some((entry) => entry.position === "DH")).toBe(false);
  });

  test("keeps the standard nine-man defense in non-DH games", () => {
    const players: Player[] = [
      player("Lead Off", 1, "CF", "p1"),
      player("Two Hole", 2, "SS", "p2"),
      player("Three Hole", 3, "1B", "p3"),
      player("Cleanup", 4, "RF", "p4"),
      player("Five Spot", 5, "LF", "p5"),
      player("Six Spot", 6, "3B", "p6"),
      player("Seven Spot", 7, "2B", "p7"),
      player("Eight Spot", 8, "C", "p8"),
      player("Pitcher", 9, "P", "p9"),
    ];
    const pitchers = [pitcher("Pitcher", "p9")];

    const result = buildDefensiveColumnPlayersForDisplay({
      players,
      pitchers,
      fieldingTeam: "away",
      pitcherStats: new Map() as never,
      getRosterEntityId: (entity) => entity.playerId || entity.name,
      explicitUseDh: false,
    });

    expect(result).toHaveLength(9);
    expect(result.map((entry) => entry.position)).toEqual([
      "CF",
      "SS",
      "1B",
      "RF",
      "LF",
      "3B",
      "2B",
      "C",
      "P",
    ]);
  });

  test("prefers the lineup snapshot so DH defense still shows the catcher even if the display roster drifts", () => {
    const players: Player[] = [
      player("Lead Off", 1, "CF", "p1"),
      player("Two Hole", 2, "SS", "p2"),
      player("Three Hole", 3, "1B", "p3"),
      player("Cleanup", 4, "DH", "p4"),
      player("Five Spot", 5, "RF", "p5"),
      player("Six Spot", 6, "LF", "p6"),
      player("Seven Spot", 7, "3B", "p7"),
      player("Eight Spot", 8, "2B", "p8"),
    ];
    const pitchers = [pitcher("Starting Pitcher", "p10")];
    const lineupSnapshot: TeamLineupSnapshot = {
      lineup: [
        { playerId: "p1", playerName: "Lead Off", position: "CF", battingOrder: 1, enteredInning: 1, isStarter: true },
        { playerId: "p2", playerName: "Two Hole", position: "SS", battingOrder: 2, enteredInning: 1, isStarter: true },
        { playerId: "p3", playerName: "Three Hole", position: "1B", battingOrder: 3, enteredInning: 1, isStarter: true },
        { playerId: "p4", playerName: "Cleanup", position: "DH", battingOrder: 4, enteredInning: 1, isStarter: true },
        { playerId: "p5", playerName: "Five Spot", position: "RF", battingOrder: 5, enteredInning: 1, isStarter: true },
        { playerId: "p6", playerName: "Six Spot", position: "LF", battingOrder: 6, enteredInning: 1, isStarter: true },
        { playerId: "p7", playerName: "Seven Spot", position: "3B", battingOrder: 7, enteredInning: 1, isStarter: true },
        { playerId: "p8", playerName: "Eight Spot", position: "2B", battingOrder: 8, enteredInning: 1, isStarter: true },
        { playerId: "p9", playerName: "Catcher", position: "C", battingOrder: 9, enteredInning: 1, isStarter: true },
      ],
      bench: [],
      usedPlayers: [],
      currentPitcher: {
        playerId: "p10",
        playerName: "Starting Pitcher",
        position: "P",
        battingOrder: 9,
        enteredInning: 1,
        isStarter: true,
      },
    };

    const result = buildDefensiveColumnPlayersForDisplay({
      players,
      pitchers,
      fieldingTeam: "home",
      pitcherStats: new Map() as never,
      getRosterEntityId: (entity) => entity.playerId || entity.name,
      explicitUseDh: true,
      lineupSnapshot,
    });

    expect(result).toHaveLength(9);
    expect(result.some((entry) => entry.position === "C")).toBe(true);
    expect(result.some((entry) => entry.position === "DH")).toBe(false);
    expect(result.some((entry) => entry.position === "P")).toBe(true);
  });

  test("infers DH from the lineup snapshot when older restores lack persisted DH flags", () => {
    const players: Player[] = [
      player("Lead Off", 1, "CF", "p1"),
      player("Two Hole", 2, "SS", "p2"),
      player("Three Hole", 3, "1B", "p3"),
      player("Cleanup", 4, "DH", "p4"),
      player("Five Spot", 5, "RF", "p5"),
      player("Six Spot", 6, "LF", "p6"),
      player("Seven Spot", 7, "3B", "p7"),
      player("Eight Spot", 8, "2B", "p8"),
      player("Nine Spot", 9, "C", "p9"),
      // Restored display rosters inject the active pitcher alongside the DH.
      player("Starting Pitcher", 1, "P", "p10"),
    ];
    const pitchers = [pitcher("Starting Pitcher", "p10")];
    const lineupSnapshot: TeamLineupSnapshot = {
      lineup: [
        { playerId: "p1", playerName: "Lead Off", position: "CF", battingOrder: 1, enteredInning: 1, isStarter: true },
        { playerId: "p2", playerName: "Two Hole", position: "SS", battingOrder: 2, enteredInning: 1, isStarter: true },
        { playerId: "p3", playerName: "Three Hole", position: "1B", battingOrder: 3, enteredInning: 1, isStarter: true },
        { playerId: "p4", playerName: "Cleanup", position: "DH", battingOrder: 4, enteredInning: 1, isStarter: true },
        { playerId: "p5", playerName: "Five Spot", position: "RF", battingOrder: 5, enteredInning: 1, isStarter: true },
        { playerId: "p6", playerName: "Six Spot", position: "LF", battingOrder: 6, enteredInning: 1, isStarter: true },
        { playerId: "p7", playerName: "Seven Spot", position: "3B", battingOrder: 7, enteredInning: 1, isStarter: true },
        { playerId: "p8", playerName: "Eight Spot", position: "2B", battingOrder: 8, enteredInning: 1, isStarter: true },
        { playerId: "p9", playerName: "Nine Spot", position: "C", battingOrder: 9, enteredInning: 1, isStarter: true },
      ],
      bench: [],
      usedPlayers: [],
      currentPitcher: {
        playerId: "p10",
        playerName: "Starting Pitcher",
        position: "P",
        battingOrder: 1,
        enteredInning: 1,
        isStarter: true,
      },
    };

    const result = buildDefensiveColumnPlayersForDisplay({
      players,
      pitchers,
      fieldingTeam: "home",
      pitcherStats: new Map() as never,
      getRosterEntityId: (entity) => entity.playerId || entity.name,
      lineupSnapshot,
    });

    expect(result).toHaveLength(9);
    expect(result.some((entry) => entry.position === "DH")).toBe(false);
    expect(result.some((entry) => entry.position === "P")).toBe(true);
    expect(result.find((entry) => entry.playerId === "p10")).toMatchObject({
      name: "Starting Pitcher",
      position: "P",
      isPitcher: true,
    });
  });

  test("carries jersey number and hometown through snapshot-based defensive rows", () => {
    const players: Player[] = [
      player("Lead Off", 1, "CF", "p1", {
        jerseyNumber: 7,
        hometown: { city: "Denver", state: "CO" },
      }),
      player("Designated Hitter", 2, "DH", "p2", {
        jerseyNumber: 20,
        hometown: { city: "Lakewood", state: "CO" },
      }),
    ];
    const pitchers = [
      pitcher("Starting Pitcher", "p10", {
        jerseyNumber: 31,
        hometown: { city: "Boulder", state: "CO" },
      }),
    ];
    const lineupSnapshot: TeamLineupSnapshot = {
      lineup: [
        { playerId: "p1", playerName: "Lead Off", position: "CF", battingOrder: 1, enteredInning: 1, isStarter: true },
        { playerId: "p2", playerName: "Designated Hitter", position: "DH", battingOrder: 2, enteredInning: 1, isStarter: true },
      ],
      bench: [],
      usedPlayers: [],
      currentPitcher: {
        playerId: "p10",
        playerName: "Starting Pitcher",
        position: "P",
        battingOrder: 2,
        enteredInning: 1,
        isStarter: true,
      },
    };

    const result = buildDefensiveColumnPlayersForDisplay({
      players,
      pitchers,
      fieldingTeam: "home",
      pitcherStats: new Map([["p10", { pitchCount: 12 }]]) as never,
      getRosterEntityId: (entity) => entity.playerId || entity.name,
      explicitUseDh: true,
      lineupSnapshot,
    });

    expect(result.find((entry) => entry.playerId === "p1")).toMatchObject({
      jerseyNumber: 7,
      hometown: { city: "Denver", state: "CO" },
    });
    expect(result.find((entry) => entry.playerId === "p10")).toMatchObject({
      jerseyNumber: 31,
      hometown: { city: "Boulder", state: "CO" },
      isPitcher: true,
      pitchCount: 12,
    });
  });
});
