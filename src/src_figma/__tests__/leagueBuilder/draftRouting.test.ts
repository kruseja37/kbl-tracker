import { describe, expect, test } from "vitest";

import {
  draftArcRouteChainForLeague,
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

  test("routes snake-format farms into the shared snake room while preserving auction byte-for-byte", () => {
    expect(farmDraftRouteForFormat("auction")).toBe("/league-builder/farm-auction-draft");
    expect(farmDraftRouteForFormat("snake")).toBe("/snake-room");
    expect(farmDraftRouteForFormat(undefined)).toBe("/league-builder/farm-auction-draft");
  });

  test("threads legacy snake league ids through auction fallback routes", () => {
    expect(draftRouteForLeague({ id: "legacy-snake", draftFormat: "snake" })).toBe(
      "/league-builder/auction-draft?leagueId=legacy-snake",
    );
    expect(farmDraftRouteForLeague({ id: "legacy-snake", draftFormat: "snake" })).toBe(
      "/snake-room?leagueId=legacy-snake&phase=farm",
    );
  });

  test("P11 orders the draft arc with scout reveal after MLB auction and before farm auction", () => {
    expect(
      draftArcRouteChainForLeague(
        { id: "league-p11", draftFormat: "auction" },
        { shillCount: 4, reservePriceK: 0.65 },
      ),
    ).toEqual([
      "/league-builder/draft-setup?leagueId=league-p11&shills=4&reserveK=0.65",
      "/league-builder/auction-draft?leagueId=league-p11&shills=4&reserveK=0.65",
      "/league-builder/scout-hire?leagueId=league-p11&shills=4&reserveK=0.65",
      "/league-builder/farm-auction-draft?leagueId=league-p11",
      "/league-builder/staff-hire?leagueId=league-p11",
      "/franchise/setup?leagueId=league-p11",
    ]);
  });
});
