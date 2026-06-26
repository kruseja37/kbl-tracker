import "fake-indexeddb/auto";

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import type { AtBatEvent } from "../eventLog";
import type { CompletedGameRecord } from "../gameStorage";
import { buildFranchiseSeasonSummary } from "../franchiseSeasonSummaryStorage";
import { setFranchisePhase2StadiumRecordsEnabledForTests } from "../franchisePhase2Flags";
import { buildFranchiseStadiumFoundationReport } from "../franchiseStadiumFoundation";
import {
  FRANCHISE_STADIUM_RECORD_TYPE_POLARITY,
  clearFranchiseStadiumRecordsDatabaseForTests,
  listFranchiseStadiumRecords,
  resetFranchiseStadiumRecordsDatabaseForTests,
  upsertFranchiseStadiumRecordsFromFoundationReport,
} from "../franchiseStadiumRecordsStorage";
vi.mock("../franchiseManager", () => ({
  getFranchiseConfig: vi.fn(async () => null),
}));

vi.mock("../franchisePlayerStorage", () => ({
  getAllFranchisePlayers: vi.fn(async () => []),
  getAllFranchiseTeams: vi.fn(async () => []),
}));

vi.mock("../scheduleStorage", () => ({
  getAllGamesByFranchise: vi.fn(async () => []),
}));

vi.mock("../gameStorage", () => ({
  getRecentGames: vi.fn(async () => []),
}));

vi.mock("../seasonStorage", () => ({
  calculateStandings: vi.fn(async () => []),
  getAllFieldingStats: vi.fn(async () => []),
  getSeasonBattingStats: vi.fn(async () => []),
  getSeasonMetadata: vi.fn(async () => null),
  getSeasonPitchingStats: vi.fn(async () => []),
}));

vi.mock("../playoffStorage", () => ({
  getPlayoff: vi.fn(async () => null),
  getPlayoffByFranchiseSeason: vi.fn(async () => null),
  getPlayoffStats: vi.fn(async () => []),
}));

vi.mock("../offseasonStorage", () => ({
  getOffseasonState: vi.fn(async () => null),
}));

vi.mock("../transactionStorage", () => ({
  getTransactionsByFranchiseSeason: vi.fn(async () => []),
}));

vi.mock("../franchiseAwardsStorage", () => ({
  getFranchiseAwardRowsByScope: vi.fn(async () => []),
}));

vi.mock("../franchiseDesignationStorage", () => ({
  getFranchiseDesignationRows: vi.fn(async () => []),
}));

const scope = {
  franchiseId: "fr-1",
  seasonId: "fr-1-season-1",
  statsScopeId: "fr-1-season-1",
  seasonNumber: 1,
};

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

describe("franchise season summary stadium records", () => {
  beforeEach(async () => {
    resetFranchiseStadiumRecordsDatabaseForTests();
    await clearFranchiseStadiumRecordsDatabaseForTests();
  });

  afterEach(async () => {
    setFranchisePhase2StadiumRecordsEnabledForTests(null);
    await clearFranchiseStadiumRecordsDatabaseForTests();
    resetFranchiseStadiumRecordsDatabaseForTests();
  });

  test("omits stadiumRecords while the stadium-records flag is disabled", async () => {
    await seedStadiumRecord();
    setFranchisePhase2StadiumRecordsEnabledForTests(false);

    const summary = await buildFranchiseSeasonSummary({
      franchiseId: scope.franchiseId,
      seasonNumber: scope.seasonNumber,
    });

    expect(summary.stadiumRecords).toBeUndefined();
  });

  test("embeds trimmed stadium-record snapshots while the stadium-records flag is enabled", async () => {
    const record = await seedStadiumRecord();
    setFranchisePhase2StadiumRecordsEnabledForTests(true);

    const summary = await buildFranchiseSeasonSummary({
      franchiseId: scope.franchiseId,
      seasonNumber: scope.seasonNumber,
    });

    expect(summary.stadiumRecords?.status).toBe("present");
    if (summary.stadiumRecords?.status !== "present") {
      throw new Error("Expected stadium records to be present");
    }
    expect(summary.stadiumRecords.records.length).toBeGreaterThanOrEqual(1);

    const snapshot = summary.stadiumRecords.records.find((entry) =>
      entry.leaderPlayerIds.includes("player-1"),
    );
    expect(snapshot).toMatchObject({
      stadiumId: record.stadiumId,
      stadiumName: record.stadiumName,
      recordType: record.recordType,
      recordKey: record.recordKey,
      value: record.value,
      valueLabel: record.valueLabel,
      polarity: FRANCHISE_STADIUM_RECORD_TYPE_POLARITY[record.recordType],
      leaderTeamIds: record.leaderTeamIds,
      leaderPlayerIds: record.leaderPlayerIds,
      leaderPlayerNames: record.leaderPlayerNames,
      evidenceSummary: record.evidenceSummary,
    });
    expect(snapshot && "policies" in snapshot).toBe(false);
    expect(snapshot && "storageVersion" in snapshot).toBe(false);
  });
});
