import "fake-indexeddb/auto";

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import {
  createNextRoundSeries,
  createPlayoff,
  createSeries,
  aggregateGameToPlayoffStats,
  getEliminationRoundName,
  getAllPlayoffs,
  getPlayoffLeaders,
  getPlayoffByElimination,
  getPlayoffBySeason,
  initPlayoffDatabase,
  recordSeriesGame,
  resetPlayoffDbConnection,
  deletePlayoffBySeason,
  type PlayoffConfig,
  type PlayoffTeam,
} from "../playoffStorage";
import { createEliminationRun } from "../eliminationManager";
import { syncEngine } from "../syncEngine";
import type { PersistedGameState } from "../gameStorage";

const DB_NAME = "kbl-playoffs";

function deleteDatabase(name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error(`Delete blocked for ${name}`));
  });
}

function buildTeam(seed: number): PlayoffTeam {
  return {
    teamId: `team-${seed}`,
    teamName: `Team ${seed}`,
    seed,
    league: "Eastern",
    regularSeasonRecord: { wins: 10 - seed, losses: seed },
    eliminated: false,
  };
}

function createLegacyV1Database(records: PlayoffConfig[] = []): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      const playoffsStore = db.createObjectStore("playoffs", { keyPath: "id" });
      playoffsStore.createIndex("seasonNumber", "seasonNumber", { unique: true });
      playoffsStore.createIndex("status", "status", { unique: false });
      records.forEach((record) => playoffsStore.put(record));
    };
    request.onsuccess = () => {
      request.result.close();
      resolve();
    };
    request.onerror = () => reject(request.error);
  });
}

function buildLegacyFranchisePlayoff(): PlayoffConfig {
  const teams = [buildTeam(1), buildTeam(2), buildTeam(3), buildTeam(4)];

  return {
    id: "legacy-franchise-playoff",
    seasonNumber: 1,
    seasonId: "season-1",
    status: "NOT_STARTED",
    teamsQualifying: 4,
    rounds: 2,
    gamesPerRound: [3, 5],
    inningsPerGame: 9,
    useDH: true,
    leagues: ["Eastern"],
    conferenceChampionship: false,
    teams,
    currentRound: 0,
    sourceType: "franchise",
    liveBeatReporterEnabled: false,
    postGameColumnsEnabled: true,
    beatReporterEnabled: true,
    createdAt: 1,
  };
}

function buildEliminationPlayoffConfig(
  eliminationId: string,
): Omit<PlayoffConfig, "id" | "createdAt"> {
  const teams = [buildTeam(1), buildTeam(2), buildTeam(3), buildTeam(4)];

  return {
    seasonNumber: 1,
    seasonId: `elimination-${eliminationId}`,
    status: "NOT_STARTED",
    teamsQualifying: 4,
    rounds: 2,
    gamesPerRound: [3, 5],
    inningsPerGame: 9,
    useDH: true,
    leagues: ["Eastern"],
    conferenceChampionship: false,
    teams,
    currentRound: 0,
    sourceType: "elimination",
    eliminationId,
    liveBeatReporterEnabled: false,
    postGameColumnsEnabled: true,
    beatReporterEnabled: true,
  };
}

function buildBattingStats(
  playerName: string,
  teamId: string,
  overrides: Partial<PersistedGameState["playerStats"][string]> = {},
): PersistedGameState["playerStats"][string] {
  return {
    playerName,
    teamId,
    pa: 0,
    ab: 0,
    h: 0,
    singles: 0,
    doubles: 0,
    triples: 0,
    hr: 0,
    rbi: 0,
    r: 0,
    bb: 0,
    hbp: 0,
    k: 0,
    sb: 0,
    cs: 0,
    sf: 0,
    sh: 0,
    gidp: 0,
    putouts: 0,
    assists: 0,
    fieldingErrors: 0,
    ...overrides,
  };
}

function buildPitcherStats(
  pitcherId: string,
  pitcherName: string,
  teamId: string,
  overrides: Partial<PersistedGameState["pitcherGameStats"][number]> = {},
): PersistedGameState["pitcherGameStats"][number] {
  return {
    pitcherId,
    pitcherName,
    teamId,
    isStarter: true,
    entryInning: 1,
    outsRecorded: 0,
    hitsAllowed: 0,
    runsAllowed: 0,
    earnedRuns: 0,
    walksAllowed: 0,
    strikeoutsThrown: 0,
    homeRunsAllowed: 0,
    hitBatters: 0,
    basesReachedViaError: 0,
    wildPitches: 0,
    pitchCount: 0,
    battersFaced: 0,
    consecutiveHRsAllowed: 0,
    firstInningRuns: 0,
    basesLoadedWalks: 0,
    inningsComplete: 0,
    decision: null,
    save: false,
    hold: false,
    blownSave: false,
    ...overrides,
  };
}

function buildPersistedGameState(
  overrides: Partial<PersistedGameState>,
): PersistedGameState {
  return {
    id: "current",
    gameId: "game-1",
    savedAt: 1700000000000,
    inning: 9,
    halfInning: "BOTTOM",
    outs: 3,
    homeScore: 5,
    awayScore: 3,
    bases: { first: null, second: null, third: null },
    currentBatterIndex: 0,
    atBatCount: 0,
    awayTeamId: "team-2",
    homeTeamId: "team-1",
    awayTeamName: "Team 2",
    homeTeamName: "Team 1",
    seasonNumber: 1,
    playerStats: {},
    pitcherGameStats: [],
    fameEvents: [],
    lastHRBatterId: null,
    consecutiveHRCount: 0,
    inningStrikeouts: 0,
    maxDeficitAway: 0,
    maxDeficitHome: 0,
    activityLog: [],
    ...overrides,
  };
}

describe("playoffStorage elimination wiring", () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    vi.spyOn(syncEngine, "isSuppressed").mockReturnValue(true);
    resetPlayoffDbConnection();
    await deleteDatabase(DB_NAME).catch(() => undefined);
  });

  test("createEliminationRun rejects invalid inning counts instead of normalizing them", async () => {
    await expect(
      createEliminationRun({
        name: "Invalid Innings",
        leagueId: "league-1",
        leagueName: "League 1",
        teamsCount: 4,
        seededTeams: [
          { id: "team-1", name: "Team 1" },
          { id: "team-2", name: "Team 2" },
          { id: "team-3", name: "Team 3" },
          { id: "team-4", name: "Team 4" },
        ],
        seriesLengths: [3, 3],
        inningsPerGame: 10,
        useDH: true,
        liveBeatReporterEnabled: false,
        postGameColumnsEnabled: true,
      }),
    ).rejects.toThrow("between 3 and 9 innings");
  });

  test("names single-bracket elimination rounds without conference semantics", () => {
    expect(getEliminationRoundName(1, 2)).toBe("Semi-Finals");
    expect(getEliminationRoundName(2, 2)).toBe("Championship");
    expect(getEliminationRoundName(1, 3)).toBe("Quarter-Finals");
    expect(getEliminationRoundName(2, 3)).toBe("Semi-Finals");
    expect(getEliminationRoundName(3, 3)).toBe("Championship");
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    resetPlayoffDbConnection();
    await deleteDatabase(DB_NAME).catch(() => undefined);
  });

  test("elimination brackets coexist across runs with the same season number", async () => {
    const teams = [buildTeam(1), buildTeam(2), buildTeam(3), buildTeam(4)];
    vi.spyOn(Date, "now").mockReturnValue(1700000000000);

    const first = await createPlayoff({
      seasonNumber: 1,
      seasonId: "elimination-elim-a",
      status: "NOT_STARTED",
      teamsQualifying: 4,
      rounds: 2,
      gamesPerRound: [3, 5],
      inningsPerGame: 9,
      useDH: true,
      leagues: ["Eastern"],
      conferenceChampionship: false,
      teams,
      currentRound: 0,
      sourceType: "elimination",
      eliminationId: "elim-a",
      liveBeatReporterEnabled: false,
      postGameColumnsEnabled: true,
      beatReporterEnabled: true,
    });

    const second = await createPlayoff({
      seasonNumber: 1,
      seasonId: "elimination-elim-b",
      status: "NOT_STARTED",
      teamsQualifying: 4,
      rounds: 2,
      gamesPerRound: [3, 5],
      inningsPerGame: 9,
      useDH: true,
      leagues: ["Eastern"],
      conferenceChampionship: false,
      teams,
      currentRound: 0,
      sourceType: "elimination",
      eliminationId: "elim-b",
      liveBeatReporterEnabled: true,
      postGameColumnsEnabled: false,
      beatReporterEnabled: true,
    });

    const allPlayoffs = await getAllPlayoffs();
    expect(
      allPlayoffs.filter((playoff) => playoff.sourceType === "elimination"),
    ).toHaveLength(2);

    await expect(getPlayoffByElimination("elim-a")).resolves.toMatchObject({
      id: first.id,
      eliminationId: "elim-a",
    });
    await expect(getPlayoffByElimination("elim-b")).resolves.toMatchObject({
      id: second.id,
      eliminationId: "elim-b",
    });
  });

  test("franchise and elimination playoffs with the same numeric season do not cross scopes", async () => {
    const teams = [buildTeam(1), buildTeam(2), buildTeam(3), buildTeam(4)];
    const franchisePlayoff = await createPlayoff({
      seasonNumber: 1,
      seasonId: "franchise-a-season-1",
      status: "IN_PROGRESS",
      teamsQualifying: 4,
      rounds: 2,
      gamesPerRound: [3, 5],
      inningsPerGame: 9,
      useDH: true,
      leagues: ["Eastern"],
      conferenceChampionship: false,
      teams,
      currentRound: 1,
      sourceType: "franchise",
      franchiseId: "franchise-a",
    });
    const eliminationPlayoff = await createPlayoff({
      ...buildEliminationPlayoffConfig("elim-same-season"),
      status: "IN_PROGRESS",
    });

    await expect(getPlayoffBySeason(1, "franchise", "franchise-a")).resolves.toMatchObject({
      id: franchisePlayoff.id,
      sourceType: "franchise",
      franchiseId: "franchise-a",
    });
    await expect(getPlayoffByElimination("elim-same-season")).resolves.toMatchObject({
      id: eliminationPlayoff.id,
      sourceType: "elimination",
      eliminationId: "elim-same-season",
    });
    await expect(getPlayoffBySeason(1, "elimination")).rejects.toThrow(
      /getPlayoffByElimination/,
    );

    await expect(
      aggregateGameToPlayoffStats(
        eliminationPlayoff.id,
        buildPersistedGameState({
          competitionType: "playoff",
          competitionId: franchisePlayoff.id,
          franchiseId: "franchise-a",
          playerStats: {
            "franchise-player": buildBattingStats("Franchise Player", "team-1", { ab: 1, h: 1 }),
          },
        }),
      ),
    ).rejects.toThrow(/non-elimination game/);
    await expect(
      aggregateGameToPlayoffStats(
        franchisePlayoff.id,
        buildPersistedGameState({
          competitionType: "elimination",
          competitionId: "elim-same-season",
          playerStats: {
            "elim-player": buildBattingStats("Elim Player", "team-1", { ab: 1, h: 1 }),
          },
        }),
      ),
    ).rejects.toThrow(/elimination game/);

    await expect(
      aggregateGameToPlayoffStats(
        franchisePlayoff.id,
        buildPersistedGameState({
          competitionType: "playoff",
          competitionId: franchisePlayoff.id,
          seasonId: "franchise-b-season-1",
          statsScopeId: "franchise-b-season-1",
          franchiseId: "franchise-a",
          playerStats: {
            "wrong-season-player": buildBattingStats("Wrong Season", "team-1", { ab: 1, h: 1 }),
          },
        }),
      ),
    ).rejects.toThrow(/different franchise season/);

    await expect(
      aggregateGameToPlayoffStats(
        franchisePlayoff.id,
        buildPersistedGameState({
          competitionType: "playoff",
          competitionId: franchisePlayoff.id,
          seasonId: "franchise-a-season-1",
          statsScopeId: "franchise-a-season-1",
          playerStats: {
            "missing-franchise-player": buildBattingStats("Missing Franchise", "team-1", { ab: 1, h: 1 }),
          },
        }),
      ),
    ).rejects.toThrow(/without franchise identity/);

    await expect(
      aggregateGameToPlayoffStats(
        franchisePlayoff.id,
        buildPersistedGameState({
          competitionType: "playoff",
          competitionId: franchisePlayoff.id,
          seasonId: "franchise-a-season-1",
          franchiseId: "franchise-a",
          playerStats: {
            "missing-scope-player": buildBattingStats("Missing Scope", "team-1", { ab: 1, h: 1 }),
          },
        }),
      ),
    ).rejects.toThrow(/without canonical stats scope/);

    await deletePlayoffBySeason(1, "franchise", "franchise-a");
    await expect(getPlayoffBySeason(1, "franchise", "franchise-a")).resolves.toBeNull();
    await expect(getPlayoffByElimination("elim-same-season")).resolves.toMatchObject({
      id: eliminationPlayoff.id,
    });
  });

  test("ambiguous elimination deletes by season are rejected", async () => {
    const playoff = await createPlayoff(buildEliminationPlayoffConfig("elim-delete-scope"));

    await expect(deletePlayoffBySeason(1, "elimination")).rejects.toThrow(
      /eliminationId/,
    );
    await expect(getPlayoffByElimination("elim-delete-scope")).resolves.toMatchObject({
      id: playoff.id,
    });
  });

  test("migrates legacy unique seasonNumber indexes for elimination coexistence", async () => {
    await createLegacyV1Database([buildLegacyFranchisePlayoff()]);
    resetPlayoffDbConnection();

    const db = await initPlayoffDatabase();
    const playoffsStore = db.transaction("playoffs", "readonly").objectStore("playoffs");
    expect(
      playoffsStore.indexNames.contains("seasonNumber")
        ? playoffsStore.index("seasonNumber").unique
        : false,
    ).toBe(false);

    const first = await createPlayoff(buildEliminationPlayoffConfig("elim-legacy-a"));
    const second = await createPlayoff(buildEliminationPlayoffConfig("elim-legacy-b"));

    const allPlayoffs = await getAllPlayoffs();
    expect(allPlayoffs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "legacy-franchise-playoff" }),
      ]),
    );
    expect(
      allPlayoffs.filter((playoff) => playoff.sourceType === "elimination"),
    ).toHaveLength(2);
    expect(first.eliminationId).toBe("elim-legacy-a");
    expect(second.eliminationId).toBe("elim-legacy-b");
  });

  test("single-bracket elimination advances to a seeded final without conference assumptions", async () => {
    const teams = [buildTeam(1), buildTeam(2), buildTeam(3), buildTeam(4)];
    const playoff = await createPlayoff({
      seasonNumber: 1,
      seasonId: "elimination-elim-finals",
      status: "IN_PROGRESS",
      teamsQualifying: 4,
      rounds: 2,
      gamesPerRound: [1, 1],
      inningsPerGame: 9,
      useDH: true,
      leagues: ["Eastern"],
      conferenceChampionship: false,
      teams,
      currentRound: 1,
      sourceType: "elimination",
      eliminationId: "elim-finals",
    });

    const semifinalA = await createSeries({
      playoffId: playoff.id,
      round: 1,
      roundName: "Semi-Finals",
      higherSeed: { teamId: "team-1", teamName: "Team 1", seed: 1 },
      lowerSeed: { teamId: "team-4", teamName: "Team 4", seed: 4 },
      status: "IN_PROGRESS",
      bestOf: 1,
      gamesRequired: 1,
      higherSeedWins: 0,
      lowerSeedWins: 0,
      games: [],
    });
    const semifinalB = await createSeries({
      playoffId: playoff.id,
      round: 1,
      roundName: "Semi-Finals",
      higherSeed: { teamId: "team-2", teamName: "Team 2", seed: 2 },
      lowerSeed: { teamId: "team-3", teamName: "Team 3", seed: 3 },
      status: "IN_PROGRESS",
      bestOf: 1,
      gamesRequired: 1,
      higherSeedWins: 0,
      lowerSeedWins: 0,
      games: [],
    });

    await recordSeriesGame(semifinalA.id, {
      gameNumber: 1,
      homeTeamId: "team-1",
      awayTeamId: "team-4",
      status: "COMPLETED",
      result: {
        homeScore: 5,
        awayScore: 1,
        winnerId: "team-1",
        innings: 9,
      },
    });
    await recordSeriesGame(semifinalB.id, {
      gameNumber: 1,
      homeTeamId: "team-2",
      awayTeamId: "team-3",
      status: "COMPLETED",
      result: {
        homeScore: 4,
        awayScore: 2,
        winnerId: "team-2",
        innings: 9,
      },
    });

    const nextRound = await createNextRoundSeries(playoff.id, 1, playoff);
    expect(nextRound).toHaveLength(1);
    expect(nextRound[0]).toMatchObject({
      round: 2,
      roundName: "Championship",
      status: "IN_PROGRESS",
      higherSeed: { teamId: "team-1", seed: 1 },
      lowerSeed: { teamId: "team-2", seed: 2 },
    });
  });

  test("single-bracket 8-team elimination advances quarter-finals to semi-finals", async () => {
    const teams = Array.from({ length: 8 }, (_, index) => buildTeam(index + 1));
    const playoff = await createPlayoff({
      seasonNumber: 1,
      seasonId: "elimination-elim-semis",
      status: "IN_PROGRESS",
      teamsQualifying: 8,
      rounds: 3,
      gamesPerRound: [1, 1, 1],
      inningsPerGame: 9,
      useDH: true,
      leagues: ["Eastern"],
      conferenceChampionship: false,
      teams,
      currentRound: 1,
      sourceType: "elimination",
      eliminationId: "elim-semis",
    });

    const pairings = [
      [1, 8],
      [2, 7],
      [3, 6],
      [4, 5],
    ] as const;
    const quarterFinals = await Promise.all(
      pairings.map(([higherSeed, lowerSeed]) =>
        createSeries({
          playoffId: playoff.id,
          round: 1,
          roundName: "Quarter-Finals",
          higherSeed: {
            teamId: `team-${higherSeed}`,
            teamName: `Team ${higherSeed}`,
            seed: higherSeed,
          },
          lowerSeed: {
            teamId: `team-${lowerSeed}`,
            teamName: `Team ${lowerSeed}`,
            seed: lowerSeed,
          },
          status: "IN_PROGRESS",
          bestOf: 1,
          gamesRequired: 1,
          higherSeedWins: 0,
          lowerSeedWins: 0,
          games: [],
        }),
      ),
    );

    for (const series of quarterFinals) {
      await recordSeriesGame(series.id, {
        gameNumber: 1,
        homeTeamId: series.higherSeed.teamId,
        awayTeamId: series.lowerSeed.teamId,
        status: "COMPLETED",
        result: {
          homeScore: 5,
          awayScore: 1,
          winnerId: series.higherSeed.teamId,
          innings: 9,
        },
      });
    }

    const nextRound = await createNextRoundSeries(playoff.id, 1, playoff);
    expect(nextRound).toHaveLength(2);
    expect(nextRound.map((series) => series.roundName)).toEqual([
      "Semi-Finals",
      "Semi-Finals",
    ]);
    expect(nextRound[0]).toMatchObject({
      higherSeed: { teamId: "team-1", seed: 1 },
      lowerSeed: { teamId: "team-4", seed: 4 },
    });
    expect(nextRound[1]).toMatchObject({
      higherSeed: { teamId: "team-2", seed: 2 },
      lowerSeed: { teamId: "team-3", seed: 3 },
    });
  });

  test("does not record tied games as series decisions", async () => {
    const teams = [buildTeam(1), buildTeam(2)];
    const playoff = await createPlayoff({
      seasonNumber: 1,
      seasonId: "elimination-elim-tie",
      status: "IN_PROGRESS",
      teamsQualifying: 2,
      rounds: 1,
      gamesPerRound: [1],
      inningsPerGame: 9,
      useDH: true,
      leagues: ["Eastern"],
      conferenceChampionship: false,
      teams,
      currentRound: 1,
      sourceType: "elimination",
      eliminationId: "elim-tie",
    });
    const series = await createSeries({
      playoffId: playoff.id,
      round: 1,
      roundName: "Championship",
      higherSeed: { teamId: "team-1", teamName: "Team 1", seed: 1 },
      lowerSeed: { teamId: "team-2", teamName: "Team 2", seed: 2 },
      status: "IN_PROGRESS",
      bestOf: 1,
      gamesRequired: 1,
      higherSeedWins: 0,
      lowerSeedWins: 0,
      games: [],
    });

    await expect(
      recordSeriesGame(series.id, {
        gameNumber: 1,
        homeTeamId: "team-1",
        awayTeamId: "team-2",
        status: "COMPLETED",
        result: {
          homeScore: 4,
          awayScore: 4,
          winnerId: "team-2",
          innings: 9,
        },
      }),
    ).rejects.toThrow(/Tied playoff games/);
  });

  test("elimination leaders require real opportunities for the requested stat", async () => {
    const playoff = await createPlayoff(buildEliminationPlayoffConfig("elim-leaders"));

    await aggregateGameToPlayoffStats(
      playoff.id,
      buildPersistedGameState({
        playerStats: {
          "slugger-1": buildBattingStats("Slugger One", "team-1", {
            pa: 4,
            ab: 4,
            h: 2,
            singles: 1,
            hr: 1,
            rbi: 3,
            r: 1,
          }),
          "bench-1": buildBattingStats("Bench One", "team-1"),
        },
        pitcherGameStats: [
          buildPitcherStats("pitcher-1", "Pitcher One", "team-1", {
            outsRecorded: 9,
            hitsAllowed: 2,
            earnedRuns: 1,
            runsAllowed: 1,
            walksAllowed: 1,
            strikeoutsThrown: 4,
            decision: "W",
          }),
        ],
      }),
    );

    await expect(getPlayoffLeaders(playoff.id, "era", 5)).resolves.toEqual([
      expect.objectContaining({ playerId: "pitcher-1", pitchingGames: 1 }),
    ]);
    await expect(getPlayoffLeaders(playoff.id, "avg", 5)).resolves.toEqual([
      expect.objectContaining({ playerId: "slugger-1", atBats: 4 }),
    ]);
    await expect(getPlayoffLeaders(playoff.id, "homeRuns", 5)).resolves.toEqual([
      expect.objectContaining({ playerId: "slugger-1", homeRuns: 1 }),
    ]);
  });

  test("rate-stat elimination leaders use sample size as a tie-breaker", async () => {
    const playoff = await createPlayoff(buildEliminationPlayoffConfig("elim-rate-tie"));

    await aggregateGameToPlayoffStats(
      playoff.id,
      buildPersistedGameState({
        playerStats: {
          "two-at-bats": buildBattingStats("Two Atbats", "team-1", {
            pa: 2,
            ab: 2,
            h: 1,
            singles: 1,
          }),
          "six-at-bats": buildBattingStats("Six Atbats", "team-2", {
            pa: 6,
            ab: 6,
            h: 3,
            singles: 3,
          }),
        },
      }),
    );

    await expect(getPlayoffLeaders(playoff.id, "avg", 5)).resolves.toEqual([
      expect.objectContaining({ playerId: "six-at-bats", atBats: 6 }),
      expect.objectContaining({ playerId: "two-at-bats", atBats: 2 }),
    ]);
  });
});
