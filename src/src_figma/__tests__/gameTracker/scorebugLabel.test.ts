import { describe, expect, test } from "vitest";

import { getScorebugTeamLabel } from "../../app/utils/scorebugLabel";

describe("getScorebugTeamLabel", () => {
  test("prefers the saved team abbreviation", () => {
    expect(getScorebugTeamLabel("nyy", "New York Yankees")).toBe("NYY");
  });

  test("falls back to the full team name when no abbreviation exists", () => {
    expect(getScorebugTeamLabel(undefined, "New York Yankees")).toBe("New York Yankees");
  });

  test("returns a safe placeholder when both inputs are empty", () => {
    expect(getScorebugTeamLabel("   ", "   ")).toBe("TEAM");
  });
});
