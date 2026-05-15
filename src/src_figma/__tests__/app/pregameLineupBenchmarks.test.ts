import { describe, expect, test } from "vitest";
import type { OptimalLineupSnapshot } from "../../../types/managerWpa";
import {
  buildPregameBenchmarkIssues,
  buildPregameBenchmarkRows,
} from "../../app/utils/pregameLineupBenchmarks";

function snapshot(
  sourceConfidence: OptimalLineupSnapshot["sourceConfidence"],
): OptimalLineupSnapshot {
  return {
    snapshotId: `snap-${sourceConfidence}`,
    teamId: "team-a",
    mode: "exhibition",
    opposingPitcherHand: "R",
    algorithmVersion: "test",
    generatedAt: 1,
    generatedFrom: "user_registered_smb4_optimal",
    sourceConfidence,
    dhEnabled: true,
    slots: [],
    projectedTeamLineupKblWpa: 0,
    confidence: sourceConfidence === "stale_roster" ? "low" : "high",
  };
}

describe("pregame lineup benchmark helpers", () => {
  test("builds readable checklist rows and issue copy", () => {
    const rows = buildPregameBenchmarkRows([
      {
        teamName: "Away Club",
        opposingPitcherHand: "L",
        dhEnabled: true,
        snapshot: undefined,
      },
      {
        teamName: "Home Club",
        opposingPitcherHand: "R",
        dhEnabled: false,
        snapshot: snapshot("user_registered"),
      },
      {
        teamName: "Stale Club",
        opposingPitcherHand: "R",
        dhEnabled: true,
        snapshot: snapshot("stale_roster"),
      },
    ]);

    expect(rows.map((row) => [row.teamName, row.contextLabel, row.statusLabel])).toEqual([
      ["Away Club", "vs LHP (DH)", "Missing"],
      ["Home Club", "vs RHP (no DH)", "Ready"],
      ["Stale Club", "vs RHP (DH)", "Needs update"],
    ]);
    expect(buildPregameBenchmarkIssues(rows)).toEqual([
      "Away Club vs LHP (DH): not set",
      "Stale Club vs RHP (DH): needs confirmation/recalculation",
    ]);
  });
});
