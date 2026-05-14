import { describe, expect, test } from "vitest";

import { normalizeLiveSubstitutionType } from "../../app/utils/gameTrackerSubstitutionIntent";

describe("normalizeLiveSubstitutionType", () => {
  test("treats a live replacement for the current batter as a pinch hit", () => {
    expect(
      normalizeLiveSubstitutionType({
        requestedSubType: "player_sub",
        lineupPlayerId: "rafael-belliard",
        currentBatterId: "rafael-belliard",
        gamePhase: "LIVE",
      }),
    ).toBe("pinch_hit");
  });

  test("keeps live bench moves away from the current batter defensive", () => {
    expect(
      normalizeLiveSubstitutionType({
        requestedSubType: "player_sub",
        lineupPlayerId: "defensive-shortstop",
        currentBatterId: "current-batter",
        gamePhase: "LIVE",
      }),
    ).toBe("player_sub");
  });

  test("does not turn pregame lineup edits into pinch-hit events", () => {
    expect(
      normalizeLiveSubstitutionType({
        requestedSubType: "player_sub",
        lineupPlayerId: "lineup-player",
        currentBatterId: "lineup-player",
        gamePhase: "PRE_GAME",
      }),
    ).toBe("player_sub");
  });
});
