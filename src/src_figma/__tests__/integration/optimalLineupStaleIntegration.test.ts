import { describe, expect, test } from "vitest";

import { staleFieldsForEliminationUpdate } from "../../app/components/EliminationTeamHub";
import { applyFranchiseTeamUpdateWithStaleOptimalSnapshots } from "../../app/components/TeamHubContent";
import {
  buildLineupSnapshotFromSlots,
  type OptimalLineupSnapshotField,
} from "../../../utils/optimalLineup";
import type { LineupSlot, Team } from "../../../utils/leagueBuilderStorage";

const lineup: LineupSlot[] = [
  { battingOrder: 1, playerId: "starter-ss", fieldingPosition: "SS" },
];

function snapshot(hand: "R" | "L", dhEnabled: boolean, generatedAt: number) {
  return buildLineupSnapshotFromSlots({
    teamId: "team-a",
    mode: "franchise",
    opposingPitcherHand: hand,
    candidates: [
      {
        playerId: "starter-ss",
        playerName: "Starter Shortstop",
        primaryPosition: "SS",
      },
    ],
    dhEnabled,
    generatedAt,
    generatedFrom: "team_hub",
    sourceConfidence: "engine_calculated",
    slots: [
      {
        playerId: "starter-ss",
        playerName: "Starter Shortstop",
        battingOrderSlot: 1,
        defensivePosition: "SS",
      },
    ],
  });
}

describe("optimal lineup stale integration paths", () => {
  test("franchise team updates stale affected lineup context and preserve fresh optimal writes", () => {
    const oldRhpDh = snapshot("R", true, 100);
    const freshLhpDh = snapshot("L", true, 200);
    const oldRhpNoDh = snapshot("R", false, 300);
    const team = {
      id: "team-a",
      name: "Team A",
      abbreviation: "TMA",
      colors: { primary: "#000000", secondary: "#ffffff" },
      lineupWithDH: lineup,
      lineupWithoutDH: lineup,
      optimalLineupVsRHPWithDH: oldRhpDh,
      optimalLineupVsLHPWithDH: snapshot("L", true, 101),
      optimalLineupVsRHPWithoutDH: oldRhpNoDh,
      optimalLineupVsLHPWithoutDH: snapshot("L", false, 301),
      lastModified: "before",
    } as Team;

    const next = applyFranchiseTeamUpdateWithStaleOptimalSnapshots(team, {
      lineupWithDH: [{ battingOrder: 1, playerId: "starter-ss", fieldingPosition: "2B" }],
      optimalLineupVsLHPWithDH: freshLhpDh,
    });

    expect(next.optimalLineupVsRHPWithDH?.sourceConfidence).toBe("stale_roster");
    expect(next.optimalLineupVsRHPWithDH?.confidence).toBe("low");
    expect(next.optimalLineupVsLHPWithDH).toBe(freshLhpDh);
    expect(next.optimalLineupVsRHPWithoutDH).toBe(oldRhpNoDh);
  });

  test("elimination roster updates mark the DH or no-DH optimal snapshot families", () => {
    expect(staleFieldsForEliminationUpdate({ lineup })).toEqual([
      "optimalLineupVsRHPWithDH",
      "optimalLineupVsLHPWithDH",
    ] satisfies OptimalLineupSnapshotField[]);

    expect(staleFieldsForEliminationUpdate({ lineupWithoutDH: lineup })).toEqual([
      "optimalLineupVsRHPWithoutDH",
      "optimalLineupVsLHPWithoutDH",
    ] satisfies OptimalLineupSnapshotField[]);

    expect(staleFieldsForEliminationUpdate({ startingRotation: ["starter-sp"] })).toEqual([
      "optimalLineupVsRHPWithoutDH",
      "optimalLineupVsLHPWithoutDH",
    ] satisfies OptimalLineupSnapshotField[]);
  });
});
