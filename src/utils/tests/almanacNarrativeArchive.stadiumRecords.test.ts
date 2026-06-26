import "fake-indexeddb/auto";

import { afterEach, beforeEach, describe, expect, test } from "vitest";

import type { AtBatEvent } from "../eventLog";
import type { CompletedGameRecord } from "../gameStorage";
import { listAlmanacNarrativeArchive } from "../almanacNarrativeArchive";
import { setFranchisePhase2StadiumRecordsEnabledForTests } from "../franchisePhase2Flags";
import { buildFranchiseStadiumFoundationReport } from "../franchiseStadiumFoundation";
import {
  clearFranchiseStadiumRecordsDatabaseForTests,
  listFranchiseStadiumRecords,
  resetFranchiseStadiumRecordsDatabaseForTests,
  upsertFranchiseStadiumRecordsFromFoundationReport,
} from "../franchiseStadiumRecordsStorage";
import * as trackerDb from "../trackerDb";

const DB_NAME = "kbl-tracker";
const scope = {
  franchiseId: "fr-1",
  seasonId: "fr-1-season-1",
  statsScopeId: "fr-1-season-1",
  seasonNumber: 1,
};

function deleteDatabase(name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error(`Delete blocked for ${name}`));
  });
}

function atBat(overrides: Partial<AtBatEvent> = {}): AtBatEvent {
  return {
    eventId: "at-bat-1",
    gameId: "game-1",
    eventIndex: 1,
    timestamp: 1_000,
    batterId: "player-1",
    batterName: "Player One",
    batterTeamId: "team-away",
    pitcherId: "pitcher-1",
    pitcherName: "Pitcher One",
    pitcherTeamId: "team-home",
    result: "HR",
    rbiCount: 1,
    runsScored: ["player-1"],
    inning: 1,
    halfInning: "TOP",
    outs: 0,
    runners: { first: null, second: null, third: null },
    awayScore: 0,
    homeScore: 0,
    outsAfter: 0,
    runnersAfter: { first: null, second: null, third: null },
    awayScoreAfter: 1,
    homeScoreAfter: 0,
    leverageIndex: 1,
    winProbabilityBefore: 0.5,
    winProbabilityAfter: 0.58,
    wpa: 0.08,
    ballInPlay: {
      trajectory: "fly",
      zone: 5,
      velocity: "hard",
      fielderIds: [],
    },
    fameEvents: [],
    isLeadoff: true,
    isClutch: false,
    isWalkOff: false,
    ...scope,
    parkContext: {
      stadiumId: "park-1",
      stadiumName: "Apple Field",
      parkFactors: undefined,
    },
    teamContext: {
      battingTeam: { teamId: "team-away", teamName: "Away Club" },
      fieldingTeam: { teamId: "team-home", teamName: "Home Club" },
    },
    batterContext: {
      playerId: "player-1",
      playerName: "Player One",
      handedness: "R",
    },
    pitcherContext: {
      playerId: "pitcher-1",
      playerName: "Pitcher One",
      handedness: "L",
    },
    enrichment: {
      hrDistance: 432,
      exitType: "fly_ball",
    },
    ...overrides,
  } as AtBatEvent;
}

function completedGame(overrides: Partial<CompletedGameRecord> = {}): CompletedGameRecord {
  return {
    gameId: "game-1",
    date: 10_000,
    ...scope,
    competitionType: "franchise",
    competitionId: "fr-1",
    aggregationStatus: "complete",
    awayTeamId: "team-away",
    homeTeamId: "team-home",
    awayTeamName: "Away Club",
    homeTeamName: "Home Club",
    stadiumId: "park-1",
    stadiumName: "Apple Field",
    finalScore: { away: 6, home: 4 },
    innings: 9,
    totalInnings: 9,
    fameEvents: [],
    playerStats: {},
    pitcherGameStats: [],
    atBatEvents: [atBat()],
    ...overrides,
  };
}

async function seedCompletedGame(record: CompletedGameRecord): Promise<void> {
  const db = await trackerDb.openTrackerDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction("completedGames", "readwrite");
    tx.objectStore("completedGames").put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

async function seedStadiumRecord(game = completedGame()) {
  const report = buildFranchiseStadiumFoundationReport({
    ...scope,
    completedGames: [game],
    atBatEvents: game.atBatEvents ?? [],
    fieldingEvents: [],
  });
  const result = await upsertFranchiseStadiumRecordsFromFoundationReport(report, {
    completedGames: [game],
    timestamp: "2026-01-01T00:00:00.000Z",
  });
  expect(result.persisted).toBe(true);
  const records = await listFranchiseStadiumRecords(scope);
  const record = records.find((entry) => entry.leaderPlayerIds.includes("player-1"));
  expect(record).toBeDefined();
  return record!;
}

describe("almanacNarrativeArchive stadium records", () => {
  beforeEach(async () => {
    trackerDb.resetTrackerDbForTests();
    resetFranchiseStadiumRecordsDatabaseForTests();
    await deleteDatabase(DB_NAME).catch(() => undefined);
    await clearFranchiseStadiumRecordsDatabaseForTests();
  });

  afterEach(async () => {
    setFranchisePhase2StadiumRecordsEnabledForTests(null);
    trackerDb.resetTrackerDbForTests();
    await deleteDatabase(DB_NAME).catch(() => undefined);
    await clearFranchiseStadiumRecordsDatabaseForTests();
    resetFranchiseStadiumRecordsDatabaseForTests();
  });

  test("derives park-record entries when the stadium-records flag is enabled", async () => {
    const game = completedGame();
    await seedCompletedGame(game);
    const record = await seedStadiumRecord(game);

    setFranchisePhase2StadiumRecordsEnabledForTests(true);

    const archive = await listAlmanacNarrativeArchive({
      franchiseId: scope.franchiseId,
      seasonId: scope.seasonId,
    });
    const entry = archive.find((candidate) => candidate.id === `park-record:${record.identityKey}`);

    expect(entry).toMatchObject({
      kind: "park-record",
      gameMode: "franchise",
      franchiseId: scope.franchiseId,
      seasonId: scope.seasonId,
      seasonNumber: scope.seasonNumber,
      statsScopeId: scope.statsScopeId,
      playerIds: record.leaderPlayerIds,
      teamIds: record.leaderTeamIds,
    });
    expect(entry?.headline).toContain("Apple Field Record");
    expect(entry?.body).toContain(record.evidenceSummary);
    expect(entry?.body).toContain(record.valueLabel);
    expect(Number.isFinite(entry?.timestamp)).toBe(true);

    const parkRecords = await listAlmanacNarrativeArchive({
      franchiseId: scope.franchiseId,
      seasonId: scope.seasonId,
      kind: "park-record",
    });
    expect(parkRecords.map((candidate) => candidate.id)).toContain(entry?.id);

    const transactionHistory = await listAlmanacNarrativeArchive({
      franchiseId: scope.franchiseId,
      seasonId: scope.seasonId,
      kind: "transaction-history",
    });
    expect(transactionHistory.map((candidate) => candidate.id)).not.toContain(entry?.id);
  });

  test("reads park-record entries from the franchise season scope when the completed game statsScopeId diverges", async () => {
    const record = await seedStadiumRecord(completedGame());
    await seedCompletedGame(completedGame({ statsScopeId: "divergent-stats-scope" }));

    setFranchisePhase2StadiumRecordsEnabledForTests(true);

    const archive = await listAlmanacNarrativeArchive({
      franchiseId: scope.franchiseId,
      seasonId: scope.seasonId,
    });

    expect(archive.map((entry) => entry.id)).toContain(`park-record:${record.identityKey}`);
  });

  test("omits park-record entries when the stadium-records flag is disabled", async () => {
    const game = completedGame();
    await seedCompletedGame(game);
    await seedStadiumRecord(game);

    setFranchisePhase2StadiumRecordsEnabledForTests(false);

    const archive = await listAlmanacNarrativeArchive({
      franchiseId: scope.franchiseId,
      seasonId: scope.seasonId,
    });

    expect(archive.some((entry) => entry.kind === "park-record")).toBe(false);
  });
});
