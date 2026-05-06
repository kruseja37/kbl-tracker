import "fake-indexeddb/auto";

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import {
  createNextRoundSeries,
  createPlayoff,
  createSeries,
  getEliminationRoundName,
  getAllPlayoffs,
  getPlayoffByElimination,
  recordSeriesGame,
  resetPlayoffDbConnection,
  type PlayoffTeam,
} from "../playoffStorage";
import { syncEngine } from "../syncEngine";

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

describe("playoffStorage elimination wiring", () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    vi.spyOn(syncEngine, "isSuppressed").mockReturnValue(true);
    resetPlayoffDbConnection();
    await deleteDatabase(DB_NAME).catch(() => undefined);
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
});
