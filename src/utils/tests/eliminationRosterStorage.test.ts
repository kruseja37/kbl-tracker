import "fake-indexeddb/auto";

import { afterEach, beforeEach, describe, expect, test } from "vitest";

import {
  __resetLeagueBuilderDatabaseForTests,
  type Player,
  type Team,
} from "../leagueBuilderStorage";
import {
  deleteEliminationDatabase,
  saveEliminationPlayer,
  saveEliminationTeam,
} from "../eliminationPlayerStorage";
import {
  buildEliminationGameTrackerRoster,
  createRosterSnapshots,
  getEliminationRosterSnapshot,
  getNormalizedEliminationLineup,
  updateEliminationRosterSnapshot,
} from "../eliminationRosterStorage";
import { resetTrackerDbForTests } from "../trackerDb";

const ELIMINATION_ID = "elim-roster-lineup";

function deleteDatabase(name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error(`Delete blocked for ${name}`));
  });
}

async function resetDatabases(): Promise<void> {
  resetTrackerDbForTests();
  __resetLeagueBuilderDatabaseForTests();
  await Promise.allSettled([
    deleteDatabase("kbl-tracker"),
    deleteDatabase("kbl-league-builder"),
    deleteEliminationDatabase(ELIMINATION_ID),
  ]);
}

describe("elimination roster snapshots", () => {
  beforeEach(async () => {
    await resetDatabases();
  });

  afterEach(async () => {
    await resetDatabases();
  });

  test("keeps legacy P pitchers out of elimination lineups and GameTracker position bench", async () => {
    await saveEliminationTeam(ELIMINATION_ID, buildTeam("sawteeth"));

    const positionPlayers: Array<[string, string, string, Player["primaryPosition"]]> = [
      ["swt-nutmeg", "Handley", "Nutmeg", "C"],
      ["swt-trips", "Slash", "Trips", "1B"],
      ["swt-bags", "Jack", "Bags", "2B"],
      ["swt-ronero", "Mario", "Ronero", "SS"],
      ["swt-hammock", "Billy", "Hammock", "3B"],
      ["swt-mcfreddy", "Marvin", "McFreddy", "LF"],
      ["swt-gasser", "Sturdy", "Gasser", "CF"],
      ["swt-baker", "Buster", "Baker", "RF"],
      ["swt-bash", "Bash", "Bransky", "DH"],
      ["swt-bronco", "Lester", "Bronco", "OF"],
    ];

    for (const [id, firstName, lastName, position] of positionPlayers) {
      await saveEliminationPlayer(ELIMINATION_ID, buildPlayer(id, "sawteeth", firstName, lastName, position));
    }
    await saveEliminationPlayer(
      ELIMINATION_ID,
      buildLegacyPitcher("swt-southpalm", "sawteeth", "Lefty", "Southpalm", "SP"),
    );
    await saveEliminationPlayer(
      ELIMINATION_ID,
      buildLegacyPitcher("swt-fabulo", "sawteeth", "Fabio", "Fabulo", "SP"),
    );
    await saveEliminationPlayer(
      ELIMINATION_ID,
      buildLegacyPitcher("swt-moods", "sawteeth", "Steamboat", "Moods", "RP"),
    );

    await createRosterSnapshots(ELIMINATION_ID, ["sawteeth"]);
    const snapshot = await getEliminationRosterSnapshot(ELIMINATION_ID, "sawteeth");
    expect(snapshot).not.toBeNull();
    const lineup = getNormalizedEliminationLineup(snapshot!, true);
    const lineupIds = lineup.map((slot) => slot.playerId);

    expect(lineup).toHaveLength(9);
    expect(lineupIds).not.toContain("swt-southpalm");
    expect(lineupIds).not.toContain("swt-fabulo");
    expect(lineupIds).not.toContain("swt-moods");

    await updateEliminationRosterSnapshot(ELIMINATION_ID, "sawteeth", {
      startingRotation: ["swt-southpalm", "swt-fabulo"],
    });
    const roster = await buildEliminationGameTrackerRoster(ELIMINATION_ID, "sawteeth", true);
    expect(roster.players.map((player) => player.playerId)).toContain("swt-bronco");
    expect(roster.players.map((player) => player.playerId)).not.toContain("swt-southpalm");
    expect(roster.pitchers).toEqual([
      expect.objectContaining({ playerId: "swt-southpalm", name: "Lefty Southpalm", isActive: true }),
      expect.objectContaining({ playerId: "swt-fabulo", name: "Fabio Fabulo", isActive: false }),
      expect.objectContaining({ playerId: "swt-moods", name: "Steamboat Moods", isActive: false }),
    ]);
  });
});

function buildTeam(id: string): Team {
  return {
    id,
    name: "Sawteeth",
    abbreviation: "SAW",
    location: "Denver",
    nickname: "Sawteeth",
    colors: { primary: "#112233", secondary: "#445566" },
    stadium: "Cloud Park",
    leagueIds: ["league-1"],
    createdDate: "2026-01-01T00:00:00.000Z",
    lastModified: "2026-01-01T00:00:00.000Z",
  };
}

function buildPlayer(
  id: string,
  teamId: string,
  firstName: string,
  lastName: string,
  primaryPosition: Player["primaryPosition"],
): Player {
  return {
    id,
    firstName,
    lastName,
    baseFameTier: 3,
    gender: "M",
    age: 27,
    bats: "R",
    throws: "R",
    primaryPosition,
    power: 70,
    contact: 72,
    speed: 68,
    fielding: 70,
    arm: 70,
    velocity: 64,
    junk: 62,
    accuracy: 63,
    arsenal: primaryPosition === "SP" ? ["4F"] : [],
    overallGrade: "B",
    personality: "Focused",
    chemistry: "Disciplined",
    morale: 0,
    mojo: "Normal",
    fame: 0,
    salary: 1000000,
    leagueAssignments: [{ leagueId: "league-1", teamId, rosterStatus: "MLB" }],
    createdDate: "2026-01-01T00:00:00.000Z",
    lastModified: "2026-01-01T00:00:00.000Z",
    isCustom: true,
    editHistory: [],
  };
}

function buildLegacyPitcher(
  id: string,
  teamId: string,
  firstName: string,
  lastName: string,
  pitcherRole: "SP" | "RP" | "CP" | "SP/RP",
): Player {
  return {
    ...buildPlayer(id, teamId, firstName, lastName, "P"),
    isPitcher: true,
    pitcherRole,
    role: pitcherRole === "SP" ? "ROTATION" : "BULLPEN",
    arsenal: ["4F"],
  } as Player;
}
