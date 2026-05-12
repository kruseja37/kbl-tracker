import { describe, expect, test } from "vitest";

import { resolveGameTrackerManagerIds } from "../../app/utils/gameTrackerManagerIdentity";
import { withPregameManagerNavigationState } from "../../app/utils/pregameNavigationState";

describe("pregame manager navigation state", () => {
  test("Exhibition state carries selected away and home manager identities", () => {
    const state = withPregameManagerNavigationState(
      {
        gameMode: "exhibition" as const,
        awayTeamId: "sirloins",
        homeTeamId: "beewolves",
      },
      {
        awayManagerId: "manager-away",
        awayManagerName: "Away Boss",
        homeManagerId: "manager-home",
        homeManagerName: "Home Boss",
      },
    );

    expect(state).toMatchObject({
      gameMode: "exhibition",
      awayManagerId: "manager-away",
      awayManagerName: "Away Boss",
      homeManagerId: "manager-home",
      homeManagerName: "Home Boss",
    });
  });

  test("Elimination state carries launch managers for the selected matchup", () => {
    const state = withPregameManagerNavigationState(
      {
        gameMode: "elimination" as const,
        eliminationId: "elim-1",
        awayTeamId: "wildpigs",
        homeTeamId: "crocs",
      },
      {
        awayManagerId: "wildpigs-manager-custom",
        homeManagerId: "crocs-manager-custom",
      },
    );

    expect(state).toMatchObject({
      eliminationId: "elim-1",
      awayManagerId: "wildpigs-manager-custom",
      homeManagerId: "crocs-manager-custom",
    });
  });

  test("GameTracker manager IDs fall back to team default IDs", () => {
    expect(
      resolveGameTrackerManagerIds({
        awayTeamId: "nemesis",
        homeTeamId: "overdogs",
      }),
    ).toEqual({
      awayManagerId: "nemesis-manager",
      homeManagerId: "overdogs-manager",
    });
  });
});
