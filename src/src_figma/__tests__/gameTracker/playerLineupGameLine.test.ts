import { describe, expect, test } from "vitest";

import {
  buildPlayerGemCounts,
  formatPlayerLineupGameLine,
} from "../../app/utils/playerLineupGameLine";

describe("playerLineupGameLine", () => {
  test("formats the default no-data line", () => {
    expect(formatPlayerLineupGameLine()).toBe("0 for 0");
  });

  test("formats a walk-only line", () => {
    expect(
      formatPlayerLineupGameLine({
        ab: 0,
        h: 0,
        doubles: 0,
        triples: 0,
        hr: 0,
        rbi: 0,
        bb: 2,
        hbp: 0,
        k: 0,
        sb: 0,
        cs: 0,
      }),
    ).toBe("0 for 0; 2 BB");
  });

  test("formats a mixed batting line in the requested token order", () => {
    expect(
      formatPlayerLineupGameLine({
        ab: 3,
        h: 2,
        doubles: 1,
        triples: 0,
        hr: 0,
        rbi: 3,
        bb: 0,
        hbp: 0,
        k: 0,
        sb: 1,
        cs: 0,
      }),
    ).toBe("2 for 3; 2B; 3 RBI; SB");
  });

  test("includes CS, HBP, Gems, and K with correct pluralization", () => {
    expect(
      formatPlayerLineupGameLine(
        {
          ab: 4,
          h: 1,
          doubles: 0,
          triples: 0,
          hr: 1,
          rbi: 2,
          bb: 0,
          hbp: 1,
          k: 2,
          sb: 0,
          cs: 1,
        },
        2,
      ),
    ).toBe("1 for 4; HR; 2 RBI; HBP; CS; 2 Gems; 2 K");
  });

  test("renders a single Gem label without a count prefix", () => {
    expect(
      formatPlayerLineupGameLine(
        {
          ab: 0,
          h: 0,
          doubles: 0,
          triples: 0,
          hr: 0,
          rbi: 0,
          bb: 0,
          hbp: 0,
          k: 0,
          sb: 0,
          cs: 0,
        },
        1,
      ),
    ).toBe("0 for 0; Gem");
  });

  test("counts only successful diving, leaping, and robbed home run plays", () => {
    expect(
      buildPlayerGemCounts([
        {
          id: "1",
          gameId: "game-1",
          atBatId: "ab-1",
          playerId: "fielder-1",
          playerName: "Fielder One",
          battingTeamId: "away",
          fieldingTeamId: "home",
          inning: 1,
          halfInning: "TOP",
          zone: "7",
          success: true,
          specialPlayType: "Diving",
          timestamp: 1,
          syncedAtBatVersion: 1,
        },
        {
          id: "2",
          gameId: "game-1",
          atBatId: "ab-2",
          playerId: "fielder-1",
          playerName: "Fielder One",
          battingTeamId: "away",
          fieldingTeamId: "home",
          inning: 1,
          halfInning: "TOP",
          zone: "8",
          success: true,
          specialPlayType: "Leaping",
          timestamp: 2,
          syncedAtBatVersion: 1,
        },
        {
          id: "3",
          gameId: "game-1",
          atBatId: "ab-3",
          playerId: "fielder-2",
          playerName: "Fielder Two",
          battingTeamId: "away",
          fieldingTeamId: "home",
          inning: 2,
          halfInning: "TOP",
          zone: "9",
          success: true,
          specialPlayType: "Robbed HR",
          timestamp: 3,
          syncedAtBatVersion: 1,
        },
        {
          id: "4",
          gameId: "game-1",
          atBatId: "ab-4",
          playerId: "fielder-1",
          playerName: "Fielder One",
          battingTeamId: "away",
          fieldingTeamId: "home",
          inning: 2,
          halfInning: "TOP",
          zone: "7",
          success: false,
          specialPlayType: "Diving",
          timestamp: 4,
          syncedAtBatVersion: 1,
        },
        {
          id: "5",
          gameId: "game-1",
          atBatId: "ab-5",
          playerId: "fielder-2",
          playerName: "Fielder Two",
          battingTeamId: "away",
          fieldingTeamId: "home",
          inning: 2,
          halfInning: "TOP",
          zone: "8",
          success: true,
          specialPlayType: "Missed Dive",
          timestamp: 5,
          syncedAtBatVersion: 1,
        },
      ]),
    ).toEqual({
      "fielder-1": 2,
      "fielder-2": 1,
    });
  });
});
