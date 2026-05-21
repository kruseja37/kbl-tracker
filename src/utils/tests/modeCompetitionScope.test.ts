import { describe, expect, test } from "vitest";

import {
  getEliminationStatsScopeId,
  validateModeCompetitionScope,
} from "../modeCompetitionScope";

describe("mode competition scope guardrails", () => {
  test("accepts explicit exhibition, franchise, playoff, and elimination scopes", () => {
    expect(
      validateModeCompetitionScope({ competitionType: "exhibition" }),
    ).toEqual([]);
    expect(
      validateModeCompetitionScope({
        competitionType: "franchise",
        competitionId: "franchise-a",
        franchiseId: "franchise-a",
        seasonId: "franchise-a-season-1",
        statsScopeId: "franchise-a-season-1",
      }),
    ).toEqual([]);
    expect(
      validateModeCompetitionScope({
        competitionType: "playoff",
        competitionId: "playoff-a",
        playoffId: "playoff-a",
        franchiseId: "franchise-a",
        seasonId: "franchise-a-season-1",
        statsScopeId: "franchise-a-season-1",
      }),
    ).toEqual([]);
    expect(
      validateModeCompetitionScope({
        competitionType: "elimination",
        competitionId: "elim-a",
        eliminationId: "elim-a",
        statsScopeId: getEliminationStatsScopeId("elim-a"),
      }),
    ).toEqual([]);
  });

  test("rejects identity crossover between franchise playoffs and elimination runs", () => {
    expect(
      validateModeCompetitionScope({
        competitionType: "playoff",
        competitionId: "playoff-a",
        playoffId: "playoff-a",
        franchiseId: "franchise-a",
        seasonId: "franchise-a-season-1",
        statsScopeId: "franchise-a-season-1",
        eliminationId: "elim-a",
      }),
    ).toEqual(expect.arrayContaining(["franchise playoff scope must not include eliminationId"]));

    expect(
      validateModeCompetitionScope({
        competitionType: "elimination",
        competitionId: "elim-a",
        eliminationId: "elim-a",
        franchiseId: "franchise-a",
        seasonId: "franchise-a-season-1",
        statsScopeId: "franchise-a-season-1",
      }),
    ).toEqual(
      expect.arrayContaining([
        "elimination scope must not include franchiseId",
        "elimination scope must not include franchise seasonId",
        "elimination scope requires canonical statsScopeId",
      ]),
    );
  });
});
