import "fake-indexeddb/auto";

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import {
  exportAllData,
  KBL_BACKUP_VERSION,
  restoreAllData,
  type BackupData,
} from "../backupRestore";
import {
  createElimination,
  getElimination,
  listActiveEliminations,
  listEliminations,
  updateElimination,
} from "../eliminationManager";
import {
  buildEliminationGameTrackerRoster,
  createRosterSnapshots,
  getAllEliminationRosterSnapshots,
} from "../eliminationRosterStorage";
import {
  deleteEliminationDatabase,
  getAllEliminationPlayers,
  getAllEliminationTeams,
  getEliminationTeam,
  saveEliminationPlayer,
  saveEliminationTeam,
} from "../eliminationPlayerStorage";
import {
  createPlayoff,
  createSeries,
  getPlayoffByElimination,
  getPlayoffStats,
  getSeriesByPlayoff,
  resetPlayoffDbConnection,
  type PlayoffConfig,
  type PlayoffPlayerStats,
  type PlayoffTeam,
} from "../playoffStorage";
import {
  createGameHeader,
  getFieldingEventsForAtBat,
  getGameFieldingEvents,
  logFieldingEvent,
  type FieldingEvent,
} from "../eventLog";
import { getAllCompletedGames, getRecentGames } from "../gameStorage";
import { getRunFameStandings } from "../eliminationRunFameStorage";
import { getEliminationAllTimePlayerStats } from "../eliminationAllTimeStatsStorage";
import { getTrackerDb, resetTrackerDbForTests } from "../trackerDb";
import {
  getManagerProfile,
  listManagerAssignments,
  resetManagerIdentityDatabaseForTests,
  saveManagerAssignment,
  saveManagerProfile,
} from "../managerIdentityStorage";
import {
  __resetLeagueBuilderDatabaseForTests,
  getAllOverridesForLeague,
  initLeagueBuilderDatabase,
  setLeaguePlayerOverride,
  type Player,
  type Team,
} from "../leagueBuilderStorage";
import { initMetaDatabase, resetMetaDb } from "../franchiseManager";

const ACTIVE_ELIMINATION_ID = "elim-backup-active";
const ARCHIVED_ELIMINATION_ID = "elim-backup-archived";
const EVENT_GAME_ID = `${ARCHIVED_ELIMINATION_ID}-event-game`;
const DYNAMIC_IDS = [ACTIVE_ELIMINATION_ID, ARCHIVED_ELIMINATION_ID];

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

function openDatabase(
  name: string,
  version?: number,
  onUpgradeNeeded?: (db: IDBDatabase) => void,
): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = typeof version === "number" ? indexedDB.open(name, version) : indexedDB.open(name);
    request.onupgradeneeded = () => onUpgradeNeeded?.(request.result);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error(`Open blocked for ${name}`));
  });
}

async function getStoreIndexNames(dbName: string, storeName: string): Promise<string[]> {
  const db = await openDatabase(dbName);
  const tx = db.transaction(storeName, "readonly");
  const indexNames = Array.from(tx.objectStore(storeName).indexNames);
  await transactionToPromise(tx);
  db.close();
  return indexNames;
}

async function createBrokenPlayoffDatabaseAtCurrentVersion(): Promise<void> {
  await deleteDatabase("kbl-playoffs");
  const db = await openDatabase("kbl-playoffs", 3, (upgradeDb) => {
    upgradeDb.createObjectStore("playoffs", { keyPath: "id" });
    upgradeDb.createObjectStore("series", { keyPath: "id" });
  });
  db.close();
}

function resetStorageConnections(): void {
  resetPlayoffDbConnection();
  resetTrackerDbForTests();
  resetManagerIdentityDatabaseForTests();
  __resetLeagueBuilderDatabaseForTests();
  resetMetaDb();
}

async function clearAppMeta(): Promise<void> {
  const db = await initMetaDatabase();
  const tx = db.transaction("eliminationList", "readwrite");
  tx.objectStore("eliminationList").clear();
  await transactionToPromise(tx);
}

async function clearEventLog(): Promise<void> {
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open("kbl-event-log");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });

  const storeNames = [
    "gameHeaders",
    "atBatEvents",
    "pitchingAppearances",
    "fieldingEvents",
    "betweenPlayEvents",
  ].filter((storeName) => db.objectStoreNames.contains(storeName));

  if (storeNames.length === 0) {
    db.close();
    return;
  }

  const tx = db.transaction(storeNames, "readwrite");
  for (const storeName of storeNames) {
    tx.objectStore(storeName).clear();
  }
  await transactionToPromise(tx);
  db.close();
}

async function clearLeagueBuilderOverrides(): Promise<void> {
  const db = await initLeagueBuilderDatabase();
  const tx = db.transaction("leaguePlayerOverrides", "readwrite");
  tx.objectStore("leaguePlayerOverrides").clear();
  await transactionToPromise(tx);
}

async function wipeRestorableData(): Promise<void> {
  resetStorageConnections();
  await Promise.allSettled(DYNAMIC_IDS.map((id) => deleteEliminationDatabase(id)));
  resetStorageConnections();
  await Promise.allSettled([
    deleteDatabase("kbl-tracker"),
    deleteDatabase("kbl-playoffs"),
    deleteDatabase("kbl-manager-identity"),
    ...DYNAMIC_IDS.map((id) => deleteDatabase(`kbl-elimination-${id}`)),
  ]);
  await clearLeagueBuilderOverrides();
  await clearAppMeta();
  await clearEventLog();
  resetStorageConnections();
}

function buildPlayoffTeam(seed: number): PlayoffTeam {
  return {
    teamId: `team-${seed}`,
    teamName: `Team ${seed}`,
    seed,
    league: "Eastern",
    regularSeasonRecord: { wins: 0, losses: 0 },
    eliminated: false,
  };
}

function buildPlayer(id: string, teamId: string, firstName = "Ivy"): Player {
  return {
    id,
    firstName,
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

function buildTeam(id: string, managerId = "manager-cloud"): Team {
  return {
    id,
    name: `Cloud ${id}`,
    abbreviation: id.slice(-3).toUpperCase(),
    location: "Denver",
    nickname: "Captains",
    colors: { primary: "#112233", secondary: "#445566" },
    stadium: "Cloud Park",
    leagueIds: ["league-1"],
    managerId,
    managerName: managerId === "manager-cloud" ? "Casey Cloud" : "Morgan Mist",
    createdDate: "2026-01-01T00:00:00.000Z",
    lastModified: "2026-01-01T00:00:00.000Z",
  };
}

async function createEliminationPlayoff(
  eliminationId: string,
  status: PlayoffConfig["status"] = "IN_PROGRESS",
): Promise<PlayoffConfig> {
  const teams = [buildPlayoffTeam(1), buildPlayoffTeam(2), buildPlayoffTeam(3), buildPlayoffTeam(4)];
  return createPlayoff({
    seasonNumber: 1,
    seasonId: `elimination-${eliminationId}`,
    status,
    teamsQualifying: 4,
    rounds: 2,
    gamesPerRound: [1, 1],
    inningsPerGame: 9,
    useDH: true,
    liveBeatReporterEnabled: false,
    postGameColumnsEnabled: true,
    beatReporterEnabled: true,
    leagues: ["Eastern"],
    conferenceChampionship: false,
    teams,
    currentRound: status === "NOT_STARTED" ? 0 : 1,
    champion: status === "COMPLETED" ? "team-1" : undefined,
    sourceType: "elimination",
    eliminationId,
    completedAt: status === "COMPLETED" ? 1000 : undefined,
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
        gameLogId: EVENT_GAME_ID,
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

async function seedCopiedIdentity(eliminationId: string): Promise<void> {
  await saveEliminationTeam(eliminationId, buildTeam("team-1"));
  await saveEliminationTeam(eliminationId, buildTeam("team-4", "manager-mist"));
  await saveEliminationPlayer(eliminationId, buildPlayer("player-1", "team-1", "Ivy"));
  await saveEliminationPlayer(eliminationId, buildPlayer("player-4", "team-4", "Nova"));
  await createRosterSnapshots(eliminationId, ["team-1", "team-4"]);
}

async function seedManagerIdentity(eliminationId: string): Promise<void> {
  await saveManagerProfile({
    managerId: "manager-cloud",
    displayName: "Casey Cloud",
    createdByUser: true,
    defaultManager: false,
    managementStyle: { label: "Bullpen Tactician" },
  });
  await saveManagerAssignment({
    managerId: "manager-cloud",
    teamId: "team-1",
    mode: "elimination",
    instanceId: eliminationId,
  });
}

async function seedCompletedGame(eliminationId: string): Promise<void> {
  await putTrackerRecord("completedGames", {
    gameId: `${eliminationId}-game`,
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
    fameEvents: [
      {
        id: "fame-1",
        gameId: `${eliminationId}-game`,
        eventType: "big_blast",
        playerId: "player-1",
        playerName: "Ivy Runner",
        playerTeam: "team-1",
        fameValue: 8,
        fameType: "bonus",
        inning: 9,
        halfInning: "BOTTOM",
        timestamp: 20,
        autoDetected: true,
      },
    ],
    playerStats: {},
    pitcherGameStats: [],
    activityLog: ["Game archived"],
    inningScores: [],
    managerDecisions: [
      {
        id: "decision-1",
        gameId: `${eliminationId}-game`,
        managerId: "manager-cloud",
        teamId: "team-1",
        opponentTeamId: "team-4",
        decisionType: "let_batter_hit",
        inning: 9,
        halfInning: "BOTTOM",
        leverageIndex: 2,
        winProbabilityBefore: 0.5,
        winProbabilityAfter: 0.6,
        managerWpa: 0.1,
        description: "Let Ivy hit.",
        timestamp: 20,
      },
    ],
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
    promotionDecisions: {
      "player-1": { acceptedTier: 5, lastUpdatedAt: 30 },
    },
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
    processedGameIds: [`${ARCHIVED_ELIMINATION_ID}-game`],
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

async function seedFieldingEvent(): Promise<void> {
  await createGameHeader({
    gameId: EVENT_GAME_ID,
    seasonId: `elimination-${ARCHIVED_ELIMINATION_ID}`,
    statsScopeId: `elimination-${ARCHIVED_ELIMINATION_ID}`,
    competitionType: "elimination",
    competitionId: ARCHIVED_ELIMINATION_ID,
    date: 50,
    awayTeamId: "team-4",
    awayTeamName: "Team 4",
    homeTeamId: "team-1",
    homeTeamName: "Team 1",
    finalScore: { away: 2, home: 4 },
    finalInning: 9,
    isComplete: true,
  });

  const event: FieldingEvent = {
    fieldingEventId: `${EVENT_GAME_ID}-fielding-1`,
    gameId: EVENT_GAME_ID,
    atBatEventId: `${EVENT_GAME_ID}-ab-1`,
    sequence: 1,
    playerId: "player-1",
    playerName: "Ivy Runner",
    position: "SS",
    teamId: "team-1",
    playType: "putout",
    difficulty: "routine",
    ballInPlay: {
      trajectory: "ground",
      zone: 4,
      velocity: "medium",
      fielderIds: ["player-1"],
      primaryFielderId: "player-1",
    },
    success: true,
    runsPreventedOrAllowed: 0.2,
  };
  await logFieldingEvent(event);
}

async function seedActiveRun(): Promise<PlayoffConfig> {
  await createElimination({
    eliminationId: ACTIVE_ELIMINATION_ID,
    name: "Active Cloud Cup",
    leagueId: "league-1",
    leagueName: "League One",
    teamsCount: 4,
    status: "IN_PROGRESS",
    currentRound: 1,
  });
  await seedCopiedIdentity(ACTIVE_ELIMINATION_ID);
  await seedManagerIdentity(ACTIVE_ELIMINATION_ID);
  await setLeaguePlayerOverride(ACTIVE_ELIMINATION_ID, "player-1", { power: 90 }, { fameTierOverride: 5 });
  const playoff = await createEliminationPlayoff(ACTIVE_ELIMINATION_ID, "IN_PROGRESS");
  await seedSeries(playoff.id);
  return playoff;
}

async function seedArchivedRun(): Promise<PlayoffConfig> {
  await createElimination({
    eliminationId: ARCHIVED_ELIMINATION_ID,
    name: "Archived Cloud Cup",
    leagueId: "league-1",
    leagueName: "League One",
    teamsCount: 4,
    status: "COMPLETED",
    currentRound: 2,
  });
  await seedCopiedIdentity(ARCHIVED_ELIMINATION_ID);
  await seedManagerIdentity(ARCHIVED_ELIMINATION_ID);
  await setLeaguePlayerOverride(ARCHIVED_ELIMINATION_ID, "player-1", { contact: 88 }, { fameTierOverride: 5 });
  await seedCompletedGame(ARCHIVED_ELIMINATION_ID);
  await seedRunFame(ARCHIVED_ELIMINATION_ID);
  await seedAllTimeStats();
  await seedFieldingEvent();
  const playoff = await createEliminationPlayoff(ARCHIVED_ELIMINATION_ID, "COMPLETED");
  await seedSeries(playoff.id);
  await seedPlayoffStats(playoff.id);
  await updateElimination(ARCHIVED_ELIMINATION_ID, {
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
    archivedAt: 2000,
    selectorState: "ARCHIVED",
  });
  return playoff;
}

async function exportThenWipeAndRestore(): Promise<BackupData> {
  const backup = await exportAllData();
  await wipeRestorableData();
  const result = await restoreAllData(backup);
  expect(result).toMatchObject({ success: true });
  resetStorageConnections();
  return backup;
}

describe("modern manual backup/restore for elimination data", () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    await wipeRestorableData();
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await wipeRestorableData();
  });

  test("exports the modern v2 backup format and rejects legacy backup JSON", async () => {
    await seedActiveRun();

    const backup = await exportAllData();

    expect(backup.kblBackupVersion).toBe(KBL_BACKUP_VERSION);
    expect(backup.databases["kbl-app-meta"].eliminationList).toEqual([
      expect.objectContaining({ eliminationId: ACTIVE_ELIMINATION_ID }),
    ]);
    expect(backup.databases[`kbl-elimination-${ACTIVE_ELIMINATION_ID}`].players).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: "player-1" })]),
    );

    await expect(
      restoreAllData({
        version: 1,
        exportedAt: new Date().toISOString(),
        databases: {},
      } as unknown as BackupData),
    ).resolves.toMatchObject({
      success: false,
      error: "Legacy backup format is not supported for modern v2 restore.",
    });
  });

  test("rejects dynamic elimination backups missing copied player or team payloads", async () => {
    await seedActiveRun();

    const backup = await exportAllData();
    const missingPlayersBackup = JSON.parse(JSON.stringify(backup)) as BackupData;
    const missingTeamsBackup = JSON.parse(JSON.stringify(backup)) as BackupData;
    delete missingPlayersBackup.databases[`kbl-elimination-${ACTIVE_ELIMINATION_ID}`].players;
    delete missingTeamsBackup.databases[`kbl-elimination-${ACTIVE_ELIMINATION_ID}`].teams;
    await wipeRestorableData();

    await expect(restoreAllData(missingPlayersBackup)).resolves.toMatchObject({
      success: false,
      error: `Backup is missing required store payload kbl-elimination-${ACTIVE_ELIMINATION_ID}.players`,
    });
    await expect(restoreAllData(missingTeamsBackup)).resolves.toMatchObject({
      success: false,
      error: `Backup is missing required store payload kbl-elimination-${ACTIVE_ELIMINATION_ID}.teams`,
    });
  });

  test("rejects static backups missing required store payloads", async () => {
    await seedArchivedRun();

    const backup = await exportAllData();
    delete backup.databases["kbl-playoffs"].series;
    await wipeRestorableData();

    await expect(restoreAllData(backup)).resolves.toMatchObject({
      success: false,
      error: "Backup is missing required store payload kbl-playoffs.series",
    });
  });

  test("repairs current-version databases missing required stores and indexes", async () => {
    const playoff = await seedArchivedRun();
    const backup = await exportAllData();
    await wipeRestorableData();
    await createBrokenPlayoffDatabaseAtCurrentVersion();
    resetStorageConnections();

    await expect(restoreAllData(backup)).resolves.toMatchObject({ success: true });

    await expect(getSeriesByPlayoff(playoff.id)).resolves.toHaveLength(1);
    await expect(getPlayoffStats(playoff.id)).resolves.toEqual([
      expect.objectContaining({ playoffId: playoff.id, playerId: "player-1" }),
    ]);
    await expect(getStoreIndexNames("kbl-playoffs", "series")).resolves.toEqual(
      expect.arrayContaining(["playoffId", "round", "status"]),
    );
    await expect(getStoreIndexNames("kbl-playoffs", "playoffStats")).resolves.toEqual(
      expect.arrayContaining(["playoffId", "playerId", "teamId"]),
    );
  });

  test("restores active elimination launch source data", async () => {
    const playoff = await seedActiveRun();

    const backup = await exportThenWipeAndRestore();

    expect(backup.databases).toHaveProperty(`kbl-elimination-${ACTIVE_ELIMINATION_ID}`);
    await expect(getElimination(ACTIVE_ELIMINATION_ID)).resolves.toMatchObject({
      eliminationId: ACTIVE_ELIMINATION_ID,
      status: "IN_PROGRESS",
    });
    await expect(getPlayoffByElimination(ACTIVE_ELIMINATION_ID)).resolves.toMatchObject({
      id: playoff.id,
      sourceType: "elimination",
    });
    await expect(getSeriesByPlayoff(playoff.id)).resolves.toHaveLength(1);
    await expect(getEliminationTeam(ACTIVE_ELIMINATION_ID, "team-1")).resolves.toMatchObject({
      id: "team-1",
      managerId: "manager-cloud",
    });
    await expect(buildEliminationGameTrackerRoster(ACTIVE_ELIMINATION_ID, "team-1", true)).resolves.toMatchObject({
      players: expect.arrayContaining([expect.objectContaining({ playerId: "player-1" })]),
    });
  });

  test("restores completed archived elimination history source data", async () => {
    const playoff = await seedArchivedRun();

    await exportThenWipeAndRestore();

    await expect(getElimination(ARCHIVED_ELIMINATION_ID)).resolves.toMatchObject({
      selectorState: "ARCHIVED",
      awards: [expect.objectContaining({ category: "Postseason MVP", playerId: "player-1" })],
    });
    await expect(listActiveEliminations()).resolves.not.toEqual(
      expect.arrayContaining([expect.objectContaining({ eliminationId: ARCHIVED_ELIMINATION_ID })]),
    );
    await expect(listEliminations()).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ eliminationId: ARCHIVED_ELIMINATION_ID })]),
    );
    await expect(getPlayoffByElimination(ARCHIVED_ELIMINATION_ID)).resolves.toMatchObject({
      id: playoff.id,
      status: "COMPLETED",
    });
    await expect(getAllCompletedGames()).resolves.toEqual(
      expect.arrayContaining([expect.objectContaining({ competitionId: ARCHIVED_ELIMINATION_ID })]),
    );
    await expect(getRunFameStandings(ARCHIVED_ELIMINATION_ID)).resolves.toEqual([
      expect.objectContaining({ playerId: "player-1", totalFame: 8 }),
    ]);
    await expect(getEliminationAllTimePlayerStats("player-1")).resolves.toMatchObject({
      playerId: "player-1",
      homeRuns: 1,
    });
    await expect(getPlayoffStats(playoff.id)).resolves.toEqual([
      expect.objectContaining({ playoffId: playoff.id, playerId: "player-1", homeRuns: 1 }),
    ]);
    await expect(getAllEliminationRosterSnapshots(ARCHIVED_ELIMINATION_ID)).resolves.toHaveLength(2);
  });

  test("restores required indexes through public storage APIs", async () => {
    const activePlayoff = await seedActiveRun();
    const archivedPlayoff = await seedArchivedRun();

    await exportThenWipeAndRestore();

    await expect(getStoreIndexNames("kbl-playoffs", "series")).resolves.toEqual(
      expect.arrayContaining(["playoffId", "round", "status"]),
    );
    await expect(getStoreIndexNames("kbl-playoffs", "playoffStats")).resolves.toEqual(
      expect.arrayContaining(["playoffId", "playerId", "teamId"]),
    );
    await expect(getStoreIndexNames("kbl-tracker", "completedGames")).resolves.toEqual(
      expect.arrayContaining(["date", "seasonId"]),
    );
    await expect(getStoreIndexNames("kbl-event-log", "gameHeaders")).resolves.toEqual(
      expect.arrayContaining(["seasonId", "date", "aggregated", "seasonId_aggregated"]),
    );
    await expect(getStoreIndexNames("kbl-event-log", "fieldingEvents")).resolves.toEqual(
      expect.arrayContaining(["gameId", "playerId", "atBatEventId"]),
    );
    await expect(getStoreIndexNames("kbl-manager-identity", "managerAssignments")).resolves.toEqual(
      expect.arrayContaining(["managerId", "teamId", "mode_instanceId"]),
    );
    await expect(getRecentGames(1)).resolves.toEqual([
      expect.objectContaining({ competitionId: ARCHIVED_ELIMINATION_ID }),
    ]);
    await expect(getSeriesByPlayoff(activePlayoff.id)).resolves.toHaveLength(1);
    await expect(getPlayoffStats(archivedPlayoff.id)).resolves.toHaveLength(1);
    await expect(getAllEliminationRosterSnapshots(ACTIVE_ELIMINATION_ID)).resolves.toHaveLength(2);
    await expect(
      listManagerAssignments({ mode: "elimination", instanceId: ACTIVE_ELIMINATION_ID }),
    ).resolves.toEqual([
      expect.objectContaining({ managerId: "manager-cloud", teamId: "team-1" }),
    ]);
    await expect(getManagerProfile("manager-cloud")).resolves.toMatchObject({
      managerId: "manager-cloud",
      displayName: "Casey Cloud",
    });
    await expect(getAllOverridesForLeague(ACTIVE_ELIMINATION_ID)).resolves.toEqual([
      expect.objectContaining({ leagueId: ACTIVE_ELIMINATION_ID, playerId: "player-1" }),
    ]);
  });

  test("restores dynamic copied elimination player and team databases", async () => {
    await seedActiveRun();

    await exportThenWipeAndRestore();

    await expect(getAllEliminationPlayers(ACTIVE_ELIMINATION_ID)).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "player-1", firstName: "Ivy" }),
        expect.objectContaining({ id: "player-4", firstName: "Nova" }),
      ]),
    );
    await expect(getAllEliminationTeams(ACTIVE_ELIMINATION_ID)).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "team-1", name: "Cloud team-1" }),
        expect.objectContaining({ id: "team-4", name: "Cloud team-4" }),
      ]),
    );
  });

  test("restores manager identity profiles and assignments", async () => {
    await seedActiveRun();

    await exportThenWipeAndRestore();

    await expect(
      listManagerAssignments({ mode: "elimination", instanceId: ACTIVE_ELIMINATION_ID }),
    ).resolves.toEqual([
      expect.objectContaining({ managerId: "manager-cloud", teamId: "team-1" }),
    ]);
  });

  test("restores event-log fielding data", async () => {
    await seedArchivedRun();

    await exportThenWipeAndRestore();

    await expect(getGameFieldingEvents(EVENT_GAME_ID)).resolves.toEqual([
      expect.objectContaining({ fieldingEventId: `${EVENT_GAME_ID}-fielding-1`, playerId: "player-1" }),
    ]);
    await expect(getFieldingEventsForAtBat(`${EVENT_GAME_ID}-ab-1`)).resolves.toEqual([
      expect.objectContaining({ fieldingEventId: `${EVENT_GAME_ID}-fielding-1`, playerId: "player-1" }),
    ]);
  });
});
