import { describe, expect, test } from "vitest";

import { loadTeamLineup } from "../../utils/lineupLoader";
import type {
  Player as LeagueBuilderPlayer,
  TeamRoster,
} from "../../../utils/leagueBuilderStorage";

const depthChart = {
  C: [],
  "1B": [],
  "2B": [],
  SS: [],
  "3B": [],
  LF: [],
  CF: [],
  RF: [],
  DH: [],
  SP: [],
  RP: [],
  CP: [],
};

function makePlayer(
  id: string,
  firstName: string,
  lastName: string,
  primaryPosition: LeagueBuilderPlayer["primaryPosition"],
  overrides: Partial<LeagueBuilderPlayer> = {},
): LeagueBuilderPlayer {
  return {
    id,
    firstName,
    lastName,
    gender: "M",
    age: 28,
    bats: "R",
    throws: "R",
    primaryPosition,
    power: 50,
    contact: 50,
    speed: 50,
    fielding: 50,
    arm: 50,
    velocity: 50,
    junk: 50,
    accuracy: 50,
    arsenal: [],
    overallGrade: "C",
    personality: "Competitive",
    chemistry: "Neutral",
    morale: 75,
    mojo: "Normal",
    fame: 0,
    salary: 0,
    leagueAssignments: [],
    createdDate: "2026-04-21T00:00:00.000Z",
    lastModified: "2026-04-21T00:00:00.000Z",
    isCustom: false,
    ...overrides,
  };
}

describe("loadTeamLineup", () => {
  test("passes jersey number and hometown into game-ready players and pitchers", async () => {
    const teamPlayers = [
      makePlayer("p1", "Corey", "Seager", "SS", {
        jerseyNumber: 5,
        hometown: { city: "Charlotte", state: "NC" },
      }),
      makePlayer("p2", "Prince", "Fielder", "1B"),
      makePlayer("p3", "Josh", "Hamilton", "LF"),
      makePlayer("p4", "Jim", "Sundberg", "C"),
      makePlayer("p5", "Johnson", "Swanson", "2B"),
      makePlayer("p6", "Jake", "Burger", "3B"),
      makePlayer("p7", "Josh", "Smith", "CF"),
      makePlayer("p8", "Withers", "Dixon", "RF"),
      makePlayer("p9", "Jacob", "deGrom", "DH"),
      makePlayer("sp1", "Andrew", "Pettitte", "SP", {
        jerseyNumber: 46,
        hometown: { city: "Baton Rouge", state: "LA" },
      }),
    ];
    const roster: TeamRoster = {
      teamId: "texas-rangers",
      mlbRoster: teamPlayers.map((player) => player.id),
      farmRoster: [],
      lineupWithDH: teamPlayers.slice(0, 9).map((player, index) => ({
        playerId: player.id,
        battingOrder: index + 1,
        fieldingPosition: player.primaryPosition,
      })),
      lineupWithoutDH: [],
      startingRotation: ["sp1"],
      longRelievers: [],
      closingPitcher: "",
      setupPitchers: [],
      depthChart,
      pinchHitOrder: [],
      pinchRunOrder: [],
      defensiveSubOrder: [],
      lastModified: "2026-04-21T00:00:00.000Z",
    };

    const result = await loadTeamLineup(
      "texas-rangers",
      teamPlayers,
      async () => roster,
      true,
    );

    expect(result.players[0]).toMatchObject({
      playerId: "p1",
      jerseyNumber: 5,
      hometown: { city: "Charlotte", state: "NC" },
    });
    expect(result.pitchers[0]).toMatchObject({
      playerId: "sp1",
      jerseyNumber: 46,
      hometown: { city: "Baton Rouge", state: "LA" },
    });
  });
});
