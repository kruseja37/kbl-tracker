import "fake-indexeddb/auto";

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { initMetaDatabase } from "../franchiseManager";
import {
  __resetLeagueBuilderDatabaseForTests,
  getAllOverridesForLeague,
  setLeaguePlayerOverride,
  type Player,
  type Team,
} from "../leagueBuilderStorage";
import {
  createElimination,
  getElimination,
  isEliminationHiddenFromSelector,
  listActiveEliminations,
  listEliminations,
  purgeElimination,
  removeEliminationFromSelector,
  updateElimination,
} from "../eliminationManager";
import {
  getAllEliminationPlayers,
  getAllEliminationTeams,
  saveEliminationPlayer,
  saveEliminationTeam,
  deleteEliminationDatabase,
} from "../eliminationPlayerStorage";
import {
  createRosterSnapshots,
  getAllEliminationRosterSnapshots,
} from "../eliminationRosterStorage";
import {
  createPlayoff,
  createSeries,
  getPlayoffByElimination,
  getSeriesByPlayoff,
  resetPlayoffDbConnection,
  type PlayoffConfig,
  type PlayoffPlayerStats,
  type PlayoffTeam,
} from "../playoffStorage";
import {
  listManagerAssignments,
  resetManagerIdentityDatabaseForTests,
  saveManagerAssignment,
} from "../managerIdentityStorage";
import { getAllCompletedGames } from "../gameStorage";
import { getRunFameStandings } from "../eliminationRunFameStorage";
import { getEliminationAllTimePlayerStats } from "../eliminationAllTimeStatsStorage";
import { resetTrackerDbForTests, getTrackerDb } from "../trackerDb";
import { syncEngine } from "../syncEngine";

const DYNAMIC_IDS = [
  "elim-completed-archive",
  "elim-progress-discard",
  "elim-setup-purge",
  "elim-active",
  "elim-archived",
];

function deleteDatabase(name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error(`Delete blocked for ${name}`));
  });
}

function transactionToPromise(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

async function clearEliminationMeta(): Promise<void> {
  const db = await initMetaDatabase();
  const tx = db.transaction("eliminationList", "readwrite");
  tx.objectStore("eliminationList").clear();
  await transactionToPromise(tx);
}

function buildTeam(seed: number): PlayoffTeam {
  return {
    teamId: `team-${seed}`,
    teamName: `Team ${seed}`,
    seed,
    league: "Eastern",
    regularSeasonRecord: { wins: 0, losses: 0 },
    eliminated: false,
  };
}

function buildPlayer(id: string, teamId: string): Player {
  return {
    id,
    firstName: "Ivy",
    lastName: "Runner",
    baseFameTier: 4,
    gender: "F",
    age: 24,
    bats: "R",
    throws: "R",
    primaryPosition: "SS",
    power: 70,
    contact: 71,
    speed: 72,
    fielding: 73,
    arm: 74,
    velocity: 50,
    junk: 50,
    accuracy: 50,
    arsenal: [],
    overallGrade: "B",
    personality: "Relaxed",
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

function buildCopiedTeam(id: string): Team {
  return {
    id,
    name: "Cloud Captains",
    abbreviation: "CLC",
    location: "Denver",
    nickname: "Captains",
    colors: { primary: "#112233", secondary: "#445566" },
    stadium: "Cloud Park",
    leagueIds: ["league-1"],
    managerId: "manager-cloud",
    managerName: "Casey Cloud",
    createdDate: "2026-01-01T00:00:00.000Z",
    lastModified: "2026-01-01T00:00:00.000Z",
  };
}

async function createEliminationPlayoff(
  eliminationId: string,
  status: PlayoffConfig["status"] = "IN_PROGRESS",
): Promise<PlayoffConfig> {
  const teams = [buildTeam(1), buildTeam(2), buildTeam(3), buildTeam(4)];
  return createPlayoff({
    seasonNumber: 1,
    seasonId: `elimination-${eliminationId}`,
    status,
    teamsQualifying: 4,
    rounds: 2,
    gamesPerRound: [1, 1],
    inningsPerGame: 9,
    useDH: true,
    leagues: ["Eastern"],
    conferenceChampionship: false,
    teams,
    currentRound: 1,
    champion: status === "COMPLETED" ? "team-1" : undefined,
    sourceType: "elimination",
    eliminationId,
    liveBeatReporterEnabled: false,
    postGameColumnsEnabled: true,
    beatReporterEnabled: true,
  });
}

async function seedSeries(playoffId: string): Promise<void> {
  await createSeries({
    playoffId,
    round: 1,
    roundName: "Semi-Finals",
    higherSeed: { teamId: "team-1", teamName: "Team 1", seed: 1 },
    lowerSeed: { teamId: "team-4", teamName: "Team 4", seed: 4 },
    status: "COMPLETED",
    gamesRequired: 1,
    bestOf: 1,
    higherSeedWins: 1,
    lowerSeedWins: 0,
    winner: "team-1",
    games: [
      {
        gameNumber: 1,
        homeTeamId: "team-1",
        awayTeamId: "team-4",
        status: "COMPLETED",
        result: { homeScore: 4, awayScore: 2, winnerId: "team-1", innings: 9 },
        gameLogId: "elim-game-1",
        playedAt: 10,
      },
    ],
  });
}

async function putTrackerRecord(storeName: string, record: unknown): Promise<void> {
  const db = await getTrackerDb();
  const tx = db.transaction(storeName, "readwrite");
  tx.objectStore(storeName).put(record);
  await transactionToPromise(tx);
}

async function seedCompletedGame(eliminationId: string, gameId = `${eliminationId}-game`): Promise<void> {
  await putTrackerRecord("completedGames", {
    gameId,
    date: 20,
    seasonId: `elimination-${eliminationId}`,
    statsScopeId: `elimination-${eliminationId}`,
    competitionType: "elimination",
    competitionId: eliminationId,
    competitionName: "Cloud Cup",
    seasonNumber: 1,
    awayTeamId: "team-4",
    homeTeamId: "team-1",
    awayTeamName: "Team 4",
    homeTeamName: "Team 1",
    finalScore: { away: 2, home: 4 },
    innings: 9,
    fameEvents: [],
    playerStats: {},
    pitcherGameStats: [],
    activityLog: ["Game archived"],
    inningScores: [],
  });
}

async function seedRunFame(eliminationId: string): Promise<void> {
  await putTrackerRecord("eliminationRunFameAggregates", {
    runId: eliminationId,
    playerFame: {
      "player-1": {
        playerName: "Ivy Runner",
        totalFame: 8,
        events: [],
        gamesPlayed: 1,
        gameIds: [`${eliminationId}-game`],
      },
    },
    promotionDecisions: {},
    processedGameIds: [`${eliminationId}-game`],
    lastUpdatedAt: 30,
  });
}

async function seedAllTimeStats(): Promise<void> {
  await putTrackerRecord("eliminationAllTimePlayerStats", {
    playerId: "player-1",
    playerName: "Ivy Runner",
    battingGames: 1,
    atBats: 4,
    hits: 2,
    runs: 1,
    doubles: 0,
    triples: 0,
    homeRuns: 1,
    rbi: 2,
    stolenBases: 0,
    walks: 0,
    strikeouts: 1,
    pitchingGames: 0,
    outsRecorded: 0,
    hitsAllowed: 0,
    runsAllowed: 0,
    earnedRuns: 0,
    walksAllowed: 0,
    pitchingStrikeouts: 0,
    wins: 0,
    losses: 0,
    saves: 0,
    completeGames: 0,
    shutouts: 0,
    processedGameIds: ["elim-completed-archive-game"],
    lastUpdatedAt: 40,
  });
}

async function seedPlayoffStats(playoffId: string): Promise<void> {
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("kbl-playoffs");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  const tx = db.transaction("playoffStats", "readwrite");
  const stat: PlayoffPlayerStats = {
    id: `${playoffId}-player-1`,
    playoffId,
    playerId: "player-1",
    playerName: "Ivy Runner",
    teamId: "team-1",
    sourceType: "elimination",
    games: 1,
    atBats: 4,
    hits: 2,
    doubles: 0,
    triples: 0,
    homeRuns: 1,
    rbi: 2,
    runs: 1,
    walks: 0,
    strikeouts: 1,
    stolenBases: 0,
    caughtStealing: 0,
    avg: 0.5,
    obp: 0.5,
    slg: 1.25,
    ops: 1.75,
  };
  tx.objectStore("playoffStats").put(stat);
  await transactionToPromise(tx);
  db.close();
}

async function getStoredPlayoffStats(playoffId: string): Promise<PlayoffPlayerStats[]> {
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("kbl-playoffs");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  const tx = db.transaction("playoffStats", "readonly");
  const rows = await new Promise<PlayoffPlayerStats[]>((resolve, reject) => {
    const request = tx.objectStore("playoffStats").index("playoffId").getAll(playoffId);
    request.onsuccess = () => resolve(request.result as PlayoffPlayerStats[]);
    request.onerror = () => reject(request.error);
  });
  await transactionToPromise(tx);
  db.close();
  return rows;
}

async function seedCopiedIdentity(eliminationId: string): Promise<void> {
  await saveEliminationTeam(eliminationId, buildCopiedTeam("team-1"));
  await saveEliminationPlayer(eliminationId, buildPlayer("player-1", "team-1"));
  await createRosterSnapshots(eliminationId, ["team-1"]);
  await saveManagerAssignment({
    managerId: "manager-cloud",
    teamId: "team-1",
    mode: "elimination",
    instanceId: eliminationId,
  });
  await setLeaguePlayerOverride(
    eliminationId,
    "player-1",
    { power: 90 },
    { fameTierOverride: 5 },
  );
}

describe("elimination selector archive semantics", () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    resetPlayoffDbConnection();
    resetTrackerDbForTests();
    resetManagerIdentityDatabaseForTests();
    __resetLeagueBuilderDatabaseForTests();
    await Promise.allSettled([
      deleteDatabase("kbl-playoffs"),
      deleteDatabase("kbl-tracker"),
      deleteDatabase("kbl-manager-identity"),
      deleteDatabase("kbl-league-builder"),
      ...DYNAMIC_IDS.map((id) => deleteDatabase(`kbl-elimination-${id}`)),
    ]);
    await clearEliminationMeta();
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await Promise.allSettled(DYNAMIC_IDS.map((id) => deleteEliminationDatabase(id)));
    await clearEliminationMeta();
    resetPlayoffDbConnection();
    resetTrackerDbForTests();
    resetManagerIdentityDatabaseForTests();
    __resetLeagueBuilderDatabaseForTests();
    await Promise.allSettled([
      deleteDatabase("kbl-playoffs"),
      deleteDatabase("kbl-tracker"),
      deleteDatabase("kbl-manager-identity"),
      deleteDatabase("kbl-league-builder"),
      ...DYNAMIC_IDS.map((id) => deleteDatabase(`kbl-elimination-${id}`)),
    ]);
  });

  test("completed selector remove hides the bracket and preserves archive-facing data", async () => {
    const eliminationId = "elim-completed-archive";
    await createElimination({
      eliminationId,
      name: "Cloud Cup",
      leagueId: "league-1",
      leagueName: "League One",
      teamsCount: 4,
      status: "COMPLETED",
      currentRound: 2,
    });
    await seedCopiedIdentity(eliminationId);
    await setLeaguePlayerOverride(
      eliminationId,
      "player-1",
      { contact: 88 },
      { fameTierOverride: 5 },
    );
    await seedCompletedGame(eliminationId);
    await seedRunFame(eliminationId);
    await seedAllTimeStats();
    const playoff = await createEliminationPlayoff(eliminationId, "COMPLETED");
    await seedSeries(playoff.id);
    await seedPlayoffStats(playoff.id);
    await updateElimination(eliminationId, {
      champion: "Team 1",
      awards: [
        {
          category: "Postseason MVP",
          playerId: "player-1",
          playerName: "Ivy Runner",
          teamId: "team-1",
          statLine: "1.750 OPS, 2 H, 2 RBI",
        },
      ],
    });
    const upsertSpy = vi.spyOn(syncEngine, "upsert");
    const removeSpy = vi.spyOn(syncEngine, "remove");

    await expect(removeEliminationFromSelector(eliminationId)).resolves.toBe("archived");

    const metadata = await getElimination(eliminationId);
    expect(metadata).toMatchObject({
      eliminationId,
      status: "COMPLETED",
      selectorState: "ARCHIVED",
      awards: [{ category: "Postseason MVP", playerId: "player-1", playerName: "Ivy Runner" }],
    });
    expect(metadata?.archivedAt).toEqual(expect.any(Number));
    expect(isEliminationHiddenFromSelector(metadata!)).toBe(true);
    await expect(listActiveEliminations()).resolves.not.toEqual(
      expect.arrayContaining([expect.objectContaining({ eliminationId })]),
    );
    await expect(listEliminations()).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ eliminationId })]),
    );
    await expect(getPlayoffByElimination(eliminationId)).resolves.toMatchObject({ id: playoff.id });
    await expect(getSeriesByPlayoff(playoff.id)).resolves.toHaveLength(1);
    await expect(getStoredPlayoffStats(playoff.id)).resolves.toHaveLength(1);
    await expect(getAllCompletedGames()).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ competitionId: eliminationId })]),
    );
    await expect(getRunFameStandings(eliminationId)).resolves.toEqual([
      expect.objectContaining({ playerId: "player-1", totalFame: 8 }),
    ]);
    await expect(getEliminationAllTimePlayerStats("player-1")).resolves.toMatchObject({
      playerId: "player-1",
      homeRuns: 1,
    });
    await expect(getAllEliminationRosterSnapshots(eliminationId)).resolves.toHaveLength(1);
    await expect(getAllEliminationPlayers(eliminationId)).resolves.toHaveLength(1);
    await expect(getAllEliminationTeams(eliminationId)).resolves.toHaveLength(1);
    await expect(
      listManagerAssignments({ mode: "elimination", instanceId: eliminationId }),
    ).resolves.toHaveLength(1);
    await expect(getAllOverridesForLeague(eliminationId)).resolves.toHaveLength(1);
    expect(upsertSpy).toHaveBeenCalledWith(
      "kbl-app-meta",
      "eliminationList",
      eliminationId,
      expect.objectContaining({ selectorState: "ARCHIVED" }),
    );
    expect(removeSpy).not.toHaveBeenCalledWith("kbl-app-meta", "eliminationList", eliminationId);
  });

  test("in-progress selector discard hides metadata without deleting completed games", async () => {
    const eliminationId = "elim-progress-discard";
    await createElimination({
      eliminationId,
      name: "Interrupted Cup",
      leagueId: "league-1",
      leagueName: "League One",
      teamsCount: 4,
      status: "IN_PROGRESS",
      currentRound: 1,
    });
    const playoff = await createEliminationPlayoff(eliminationId, "IN_PROGRESS");
    await seedSeries(playoff.id);
    await seedCompletedGame(eliminationId);

    await expect(removeEliminationFromSelector(eliminationId)).resolves.toBe("discarded");

    await expect(getElimination(eliminationId)).resolves.toMatchObject({
      selectorState: "DISCARDED",
      status: "IN_PROGRESS",
    });
    await expect(listActiveEliminations()).resolves.not.toEqual(
      expect.arrayContaining([expect.objectContaining({ eliminationId })]),
    );
    await expect(getPlayoffByElimination(eliminationId)).resolves.toMatchObject({ id: playoff.id });
    await expect(getAllCompletedGames()).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ competitionId: eliminationId })]),
    );
  });

  test("setup-only selector remove still purges brackets with no historical games", async () => {
    const eliminationId = "elim-setup-purge";
    await createElimination({
      eliminationId,
      name: "Empty Cup",
      leagueId: "league-1",
      leagueName: "League One",
      teamsCount: 4,
      status: "SETUP",
      currentRound: 0,
    });
    const playoff = await createEliminationPlayoff(eliminationId, "NOT_STARTED");
    const removeSpy = vi.spyOn(syncEngine, "remove");

    await expect(removeEliminationFromSelector(eliminationId)).resolves.toBe("purged");

    await expect(getElimination(eliminationId)).resolves.toBeNull();
    await expect(getPlayoffByElimination(eliminationId)).resolves.toBeNull();
    await expect(getSeriesByPlayoff(playoff.id)).resolves.toHaveLength(0);
    expect(removeSpy).toHaveBeenCalledWith("kbl-app-meta", "eliminationList", eliminationId);
  });

  test("active selector list filters archived rows while full metadata remains available", async () => {
    await createElimination({
      eliminationId: "elim-active",
      name: "Active Cup",
      leagueId: "league-1",
      leagueName: "League One",
      teamsCount: 4,
      status: "IN_PROGRESS",
      currentRound: 1,
    });
    await createElimination({
      eliminationId: "elim-archived",
      name: "Archived Cup",
      leagueId: "league-1",
      leagueName: "League One",
      teamsCount: 4,
      status: "COMPLETED",
      currentRound: 2,
    });
    await removeEliminationFromSelector("elim-archived");

    await expect(listActiveEliminations()).resolves.toEqual([
      expect.objectContaining({ eliminationId: "elim-active" }),
    ]);
    await expect(listEliminations()).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ eliminationId: "elim-active" }),
        expect.objectContaining({ eliminationId: "elim-archived", selectorState: "ARCHIVED" }),
      ]),
    );
  });

  test("explicit purge remains available for internal permanent cleanup", async () => {
    const eliminationId = "elim-completed-archive";
    await createElimination({
      eliminationId,
      name: "Permanent Cleanup Cup",
      leagueId: "league-1",
      leagueName: "League One",
      teamsCount: 4,
      status: "COMPLETED",
      currentRound: 2,
    });
    const removeSpy = vi.spyOn(syncEngine, "remove");

    await purgeElimination(eliminationId);

    await expect(getElimination(eliminationId)).resolves.toBeNull();
    expect(removeSpy).toHaveBeenCalledWith("kbl-app-meta", "eliminationList", eliminationId);
  });
});
