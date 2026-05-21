import { describe, expect, test } from "vitest";

import { buildAvailablePitchingCandidates } from "../../app/utils/pitchingCandidates";

const getRosterEntityId = (
  entity: { name: string; playerId?: string },
  team: "away" | "home",
) => entity.playerId || `${team}-${entity.name.toLowerCase().replace(/\s+/g, "-")}`;

describe("buildAvailablePitchingCandidates", () => {
  test("keeps active defenders out of emergency pitcher candidates", () => {
    const candidates = buildAvailablePitchingCandidates({
      fieldingTeam: "home",
      currentPitcherId: "home-sp",
      getRosterEntityId,
      fieldingSnapshot: {
        lineup: [
          { playerId: "home-ss", playerName: "Starting Shortstop" },
          { playerId: "home-cf", playerName: "Starting Center" },
        ],
        currentPitcher: { playerId: "home-sp", playerName: "Starter" },
      },
      pitchers: [
        { playerId: "home-sp", name: "Starter", throwingHand: "R", isActive: true },
        { playerId: "home-rp", name: "Reliever", throwingHand: "L" },
      ],
      positionPlayers: [
        { playerId: "home-ss", name: "Starting Shortstop", throws: "R" },
        { playerId: "home-cf", name: "Starting Center", throws: "L" },
        { playerId: "home-bench", name: "Bench Utility", throws: "R" },
      ],
    });

    expect(candidates).toEqual([
      {
        id: "home-rp",
        name: "Reliever",
        hand: "L",
        source: "pitcher",
      },
      {
        id: "home-bench",
        name: "Bench Utility",
        hand: "R",
        source: "bench_position_player",
      },
    ]);
  });
});
