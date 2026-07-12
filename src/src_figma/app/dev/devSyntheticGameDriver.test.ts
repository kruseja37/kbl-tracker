import "fake-indexeddb/auto";

import { afterAll, beforeAll, describe, expect, test, vi } from "vitest";
import {
  archiveCompletedGame,
  getCompletedGameById,
  type PersistedGameState,
} from "../../../utils/gameStorage";
import {
  createFranchise,
  updateFranchiseMetadata,
} from "../../../utils/franchiseManager";
import {
  saveFranchisePlayer,
  saveFranchiseTeam,
} from "../../../utils/franchisePlayerStorage";
import { getFranchiseSeasonId } from "../../../utils/franchisePersistenceContract";
import {
  savePlayer,
  saveTeam,
  type Player,
  type Position,
  type Team,
} from "../../../utils/leagueBuilderStorage";
import { saveSeasonMetadata } from "../../../utils/seasonStorage";
import { importFranchiseScheduleRows } from "../../../utils/scheduleStorage";
import { syncEngine } from "../../../utils/syncEngine";

import {
  fastForwardLivingSeasonTestDriveGames,
  getLivingSeasonTestDriveState,
  getLivingSeasonTestDriveReceipt,
  playLivingSeasonTestDriveScheduleGame,
  playNextLivingSeasonTestDriveGame,
  previewLivingSeasonTestDriveGame,
} from "./devSyntheticGameDriver";

const NOW = "2026-07-11T12:00:00.000Z";
const HITTER_POSITIONS: Position[] = ["C", "1B", "2B", "3B", "SS", "LF", "CF", "RF", "DH"];

interface SeededFranchise {
  franchiseId: string;
  leagueId: string;
  teamIds: [string, string];
  scheduleIds: string[];
  firstPlayerId: string;
}

function team(id: string, leagueId: string, index: number): Team {
  return {
    id,
    name: `Test Drive ${index === 0 ? "Away" : "Home"}`,
    abbreviation: index === 0 ? "TDA" : "TDH",
    location: "Testville",
    nickname: index === 0 ? "Away" : "Home",
    colors: { primary: index === 0 ? "#345995" : "#7d4f50", secondary: "#f2ead7" },
    stadium: "Apple Field",
    leagueIds: [leagueId],
    createdDate: NOW,
    lastModified: NOW,
  };
}

function player(
  id: string,
  leagueId: string,
  teamId: string,
  primaryPosition: Position,
  index: number,
): Player {
  const pitcher = ["SP", "RP", "CP", "SP/RP", "P", "TWO-WAY"].includes(primaryPosition);
  return {
    id,
    firstName: pitcher ? `Pitcher${index}` : `Batter${index}`,
    lastName: teamId.slice(-5),
    gender: "M",
    jerseyNumber: index + 1,
    age: 26,
    bats: "R",
    throws: "R",
    primaryPosition,
    secondaryPosition: pitcher ? "P" : "IF",
    power: pitcher ? 0 : 55 + index,
    contact: pitcher ? 0 : 60 + index,
    speed: pitcher ? 0 : 50 + index,
    fielding: 62,
    arm: 64,
    velocity: pitcher ? 75 : 0,
    junk: pitcher ? 70 : 0,
    accuracy: pitcher ? 72 : 0,
    arsenal: pitcher ? ["4F", "SL"] : [],
    overallGrade: "B",
    personality: "Competitive",
    chemistry: "Competitive",
    morale: 50,
    mojo: "Normal",
    fame: 0,
    salary: 1_000_000,
    leagueAssignments: [{ leagueId, teamId, rosterStatus: "MLB" }],
    createdDate: NOW,
    lastModified: NOW,
    isCustom: true,
  };
}

async function seedFranchise(options: { livingSeason?: boolean; games?: number } = {}): Promise<SeededFranchise> {
  const franchiseId = await createFranchise("Test Drive Franchise", { livingSeason: options.livingSeason ?? true });
  const leagueId = `test-drive-league-${franchiseId}`;
  const teamIds = [`test-drive-away-${franchiseId}`, `test-drive-home-${franchiseId}`] as const;
  await updateFranchiseMetadata(franchiseId, {
    leagueId,
    leagueName: "Test Drive League",
    controlledTeamId: teamIds[0],
    controlledTeamName: "Test Drive Away",
    currentSeason: 1,
  });

  for (const [index, teamId] of teamIds.entries()) {
    const storedTeam = team(teamId, leagueId, index);
    await saveTeam(storedTeam);
    await saveFranchiseTeam(franchiseId, storedTeam);
    const roster = [
      ...HITTER_POSITIONS.map((position, playerIndex) => player(`${teamId}-b-${playerIndex}`, leagueId, teamId, position, playerIndex)),
      player(`${teamId}-sp`, leagueId, teamId, "SP", 10),
      player(`${teamId}-rp`, leagueId, teamId, "RP", 11),
    ];
    for (const storedPlayer of roster) {
      await savePlayer(storedPlayer);
      await saveFranchisePlayer(franchiseId, storedPlayer);
    }
  }

  const seasonId = getFranchiseSeasonId(franchiseId, 1);
  const games = options.games ?? 3;
  await saveSeasonMetadata({
    seasonId,
    seasonNumber: 1,
    seasonName: "Test Drive Season",
    status: "active",
    startDate: Date.UTC(2026, 6, 11),
    gamesPlayed: 0,
    totalGames: games,
    gamesPerTeam: games,
  });
  const scheduled = games > 0
    ? await importFranchiseScheduleRows({
        franchiseId,
        seasonNumber: 1,
        seasonId,
        statsScopeId: seasonId,
        rows: Array.from({ length: games }, (_value, index) => ({
          gameNumber: index + 1,
          dayNumber: index + 1,
          date: `2026-07-${String(12 + index).padStart(2, "0")}`,
          awayTeamId: index % 2 === 0 ? teamIds[0] : teamIds[1],
          homeTeamId: index % 2 === 0 ? teamIds[1] : teamIds[0],
        })),
      })
    : [];
  return {
    franchiseId,
    leagueId,
    teamIds,
    scheduleIds: scheduled.map((game) => game.id),
    firstPlayerId: `${teamIds[0]}-b-0`,
  };
}

beforeAll(() => {
  syncEngine.setEnabled(false);
  vi.spyOn(console, "log").mockImplementation(() => undefined);
  vi.spyOn(console, "warn").mockImplementation(() => undefined);
});

afterAll(() => {
  vi.restoreAllMocks();
});

describe("devSyntheticGameDriver", () => {
  test("creates a byte-identical ratings-aware game for the same stored franchise state", async () => {
    const seeded = await seedFranchise();
    const first = await previewLivingSeasonTestDriveGame(seeded.franchiseId, seeded.scheduleIds[0]);
    const second = await previewLivingSeasonTestDriveGame(seeded.franchiseId, seeded.scheduleIds[0]);

    expect(first.seed).toBe(`${seeded.franchiseId}:${seeded.scheduleIds[0]}`);
    expect(JSON.stringify(first)).toBe(JSON.stringify(second));

    const existing = await import("../../../utils/franchisePlayerStorage").then((module) => module.getFranchisePlayer(seeded.franchiseId, seeded.firstPlayerId));
    if (!existing) throw new Error("Seeded player missing");
    await saveFranchisePlayer(seeded.franchiseId, { ...existing, contact: 100 });
    const afterMirrorConfirm = await previewLivingSeasonTestDriveGame(seeded.franchiseId, seeded.scheduleIds[0]);
    expect(JSON.stringify(afterMirrorConfirm.gameState)).not.toBe(JSON.stringify(first.gameState));
  }, 20_000);

  test("keeps the durable living-season receipt byte-identical when read from the same seed", async () => {
    const seeded = await seedFranchise({ games: 1 });
    const played = await playNextLivingSeasonTestDriveGame(seeded.franchiseId);
    expect(played.kind).toBe("processed");
    if (played.kind !== "processed") return;
    const firstReceipt = await getLivingSeasonTestDriveReceipt(
      played.receipt.gameId,
      played.receipt.scheduleGameId,
      played.receipt.seed,
    );
    const secondReceipt = await getLivingSeasonTestDriveReceipt(
      played.receipt.gameId,
      played.receipt.scheduleGameId,
      played.receipt.seed,
    );
    expect(JSON.stringify(secondReceipt)).toBe(JSON.stringify(firstReceipt));
    expect(firstReceipt).toEqual(played.receipt);
  }, 20_000);

  test("uses the real pipeline, stamps only dev archives, and advances the matching schedule row", async () => {
    const seeded = await seedFranchise({ games: 2 });
    const played = await playNextLivingSeasonTestDriveGame(seeded.franchiseId);
    expect(played.kind).toBe("processed");
    if (played.kind !== "processed") return;

    const archive = await getCompletedGameById(played.receipt.gameId);
    expect(archive?.devSynthetic).toBe(true);
    expect(archive?.scheduleGameId).toBe(seeded.scheduleIds[0]);
    expect(archive?.statsScopeId).toBe(archive?.seasonId);
    expect(played.receipt.livingSeasonProcessing).not.toBeNull();
    expect(played.state.nextGame?.id).toBe(seeded.scheduleIds[1]);

    const handScored: PersistedGameState = {
      ...(await previewLivingSeasonTestDriveGame(seeded.franchiseId, seeded.scheduleIds[1])).gameState,
      gameId: `hand-scored-${seeded.franchiseId}`,
    };
    await archiveCompletedGame(handScored, { away: 3, home: 2 }, [], handScored.seasonId, {
      statsScopeId: handScored.statsScopeId,
      competitionType: "franchise",
      competitionId: seeded.franchiseId,
      franchiseId: seeded.franchiseId,
      scheduleGameId: seeded.scheduleIds[1],
      completedCivilDate: handScored.completedCivilDate,
    });
    expect((await getCompletedGameById(handScored.gameId))?.devSynthetic).toBeUndefined();
  }, 20_000);

  test("fast-forward processes the same deterministic per-game sequence as repeated single plays", async () => {
    const sequential = await seedFranchise({ games: 2 });
    const accelerated = await seedFranchise({ games: 2 });

    const sequentialExpected = await Promise.all(sequential.scheduleIds.map(async (scheduleGameId) => {
      const preview = await previewLivingSeasonTestDriveGame(sequential.franchiseId, scheduleGameId);
      return `${preview.gameState.awayScore}-${preview.gameState.homeScore}`;
    }));
    const acceleratedExpected = await Promise.all(accelerated.scheduleIds.map(async (scheduleGameId) => {
      const preview = await previewLivingSeasonTestDriveGame(accelerated.franchiseId, scheduleGameId);
      return `${preview.gameState.awayScore}-${preview.gameState.homeScore}`;
    }));
    const singleReceipts: string[] = [];
    for (let index = 0; index < 2; index += 1) {
      const result = await playNextLivingSeasonTestDriveGame(sequential.franchiseId);
      expect(result.kind).toBe("processed");
      if (result.kind === "processed") {
        singleReceipts.push(`${result.receipt.away.score}-${result.receipt.home.score}`);
      }
    }
    const result = await fastForwardLivingSeasonTestDriveGames(accelerated.franchiseId, 2);
    expect(result.stopped).toBe(false);
    expect(singleReceipts).toEqual(sequentialExpected);
    expect(result.receipts.map((receipt) => `${receipt.away.score}-${receipt.home.score}`)).toEqual(acceleratedExpected);
    expect(result.state.availability).toBe("season-complete");
  }, 60_000);

  test("returns explanatory refusal states for non-franchise, legacy, empty, and completed schedules", async () => {
    const missing = await getLivingSeasonTestDriveState("missing-franchise");
    expect(missing.availability).toBe("not-franchise");

    const legacy = await seedFranchise({ livingSeason: false });
    expect((await getLivingSeasonTestDriveState(legacy.franchiseId)).availability).toBe("legacy-franchise");
    expect((await playNextLivingSeasonTestDriveGame(legacy.franchiseId)).kind).toBe("refused");

    const empty = await seedFranchise({ games: 0 });
    expect((await getLivingSeasonTestDriveState(empty.franchiseId)).availability).toBe("no-schedule");

    const completed = await seedFranchise({ games: 1 });
    const played = await playNextLivingSeasonTestDriveGame(completed.franchiseId);
    expect(played.kind).toBe("processed");
    const duplicate = await playLivingSeasonTestDriveScheduleGame(completed.franchiseId, completed.scheduleIds[0]);
    expect(duplicate.kind).toBe("refused");
    expect(duplicate.state.message).toMatch(/already completed/i);
  }, 30_000);
});
