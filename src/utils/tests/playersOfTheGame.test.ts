import { describe, expect, test } from "vitest";

import { rankPlayersOfTheGame } from "../playersOfTheGame";
import type { KblWpaCredit } from "../kblWpaAttribution";

describe("rankPlayersOfTheGame", () => {
  test("admits pitcher-only KBL WPA candidates", () => {
    const credits: KblWpaCredit[] = [
      {
        eventId: "game-1_1",
        source: "at_bat",
        playerId: "home-pitcher",
        playerName: "Home Pitcher",
        teamId: "home",
        role: "pitching",
        wpa: 0.42,
        confidence: "high",
        basis: "Pitching WPA",
        allocationMode: "ratio",
      },
      {
        eventId: "game-1_2",
        source: "at_bat",
        playerId: "away-batter",
        playerName: "Away Batter",
        teamId: "away",
        role: "batting",
        wpa: 0.12,
        confidence: "high",
        basis: "Batting WPA",
        allocationMode: "ratio",
      },
    ];

    const ranked = rankPlayersOfTheGame(
      {
        awayTeamId: "away",
        homeTeamId: "home",
        playerStats: {
          "away-batter": {
            playerName: "Away Batter",
            teamId: "away",
            pa: 4,
            ab: 4,
            h: 1,
            hr: 0,
            rbi: 1,
            r: 0,
            bb: 0,
            k: 1,
          },
        },
        pitcherGameStats: [
          {
            pitcherId: "home-pitcher",
            pitcherName: "Home Pitcher",
            teamId: "home",
          },
        ],
      },
      [],
      credits,
    );

    expect(ranked[0]).toMatchObject({
      playerId: "home-pitcher",
      name: "Home Pitcher",
      wpa: 0.42,
    });
  });
});
