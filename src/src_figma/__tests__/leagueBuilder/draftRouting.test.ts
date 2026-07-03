import { describe, expect, test } from "vitest";

import {
  draftRouteForLeague,
  farmDraftRouteForFormat,
  farmDraftRouteForLeague,
  mlbDraftRouteForFormat,
} from "../../app/utils/draftRouting";

describe("draftRouting", () => {
  test("routes every MLB draft format to auction", () => {
    expect(mlbDraftRouteForFormat("auction")).toBe("/league-builder/auction-draft");
    expect(mlbDraftRouteForFormat("snake")).toBe("/league-builder/auction-draft");
    expect(mlbDraftRouteForFormat(undefined)).toBe("/league-builder/auction-draft");
  });

  test("routes every farm draft format to farm auction", () => {
    expect(farmDraftRouteForFormat("auction")).toBe("/league-builder/farm-auction-draft");
    expect(farmDraftRouteForFormat("snake")).toBe("/league-builder/farm-auction-draft");
    expect(farmDraftRouteForFormat(undefined)).toBe("/league-builder/farm-auction-draft");
  });

  test("threads legacy snake league ids through auction fallback routes", () => {
    expect(draftRouteForLeague({ id: "legacy-snake", draftFormat: "snake" })).toBe(
      "/league-builder/auction-draft?leagueId=legacy-snake",
    );
    expect(farmDraftRouteForLeague({ id: "legacy-snake", draftFormat: "snake" })).toBe(
      "/league-builder/farm-auction-draft?leagueId=legacy-snake",
    );
  });
});
