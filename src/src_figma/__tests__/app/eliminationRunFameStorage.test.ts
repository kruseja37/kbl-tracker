import "fake-indexeddb/auto";

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

vi.mock("../../../utils/syncEngine", () => ({
  syncEngine: {
    isSuppressed: () => true,
    upsert: vi.fn(),
  },
}));

import {
  appendEliminationGameFameToRun,
  getPlayerRunFame,
  getRunFameStandings,
} from "../../../utils/eliminationRunFameStorage";
import { getTrackerDb, resetTrackerDbForTests } from "../../../utils/trackerDb";

const DB_NAME = "kbl-tracker";

function deleteDatabase(name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error(`Delete blocked for ${name}`));
  });
}

async function clearRunAggregateStore(): Promise<void> {
  const db = await getTrackerDb();

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction("eliminationRunFameAggregates", "readwrite");
    const request = tx.objectStore("eliminationRunFameAggregates").clear();
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function seedLegacyTrackerDatabase(): Promise<void> {
  resetTrackerDbForTests();
  await deleteDatabase(DB_NAME).catch(() => undefined);

  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 5);

    request.onupgradeneeded = () => {
      const db = request.result;
      db.createObjectStore("currentGame", { keyPath: "id" });
      db.createObjectStore("completedGames", { keyPath: "gameId" });
      db.createObjectStore("playerSeasonBatting", {
        keyPath: ["seasonId", "playerId"],
      });
      db.createObjectStore("playerSeasonPitching", {
        keyPath: ["seasonId", "playerId"],
      });
      db.createObjectStore("playerSeasonFielding", {
        keyPath: ["seasonId", "playerId"],
      });
      db.createObjectStore("seasonMetadata", { keyPath: "seasonId" });
      db.createObjectStore("playerCareerBatting", { keyPath: "playerId" });
      db.createObjectStore("playerCareerPitching", { keyPath: "playerId" });
      db.createObjectStore("playerCareerFielding", { keyPath: "playerId" });
      db.createObjectStore("careerMilestones", { keyPath: "id" });
      db.createObjectStore("rosterSnapshots", { keyPath: "key" });
      db.createObjectStore("mojoFitnessSnapshots", {
        keyPath: ["eliminationId", "playerId"],
      });
      db.createObjectStore("almanacCanonicalPlayers", {
        keyPath: "canonicalId",
      });
    };

    request.onsuccess = async () => {
      const db = request.result;
      const tx = db.transaction("completedGames", "readwrite");
      tx.objectStore("completedGames").put({
        gameId: "legacy-elim-game",
        date: Date.now(),
        competitionType: "elimination",
        competitionId: "elim-run-legacy",
        awayTeamId: "away",
        awayTeamName: "Away",
        homeTeamId: "home",
        homeTeamName: "Home",
        finalScore: { away: 4, home: 3 },
        innings: 9,
        fameEvents: [],
        playerStats: {},
        pitcherGameStats: [],
      });

      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => reject(tx.error);
    };

    request.onerror = () => reject(request.error);
  });
}

describe("eliminationRunFameStorage", () => {
  beforeEach(async () => {
    resetTrackerDbForTests();
    await deleteDatabase(DB_NAME).catch(() => undefined);
    await clearRunAggregateStore();
  });

  afterEach(() => {
    resetTrackerDbForTests();
  });

  test("accumulates the first elimination game's Fame into a new run aggregate", async () => {
    await appendEliminationGameFameToRun("elim-run-1", "game-1", [
      {
        id: "fame-1",
        gameId: "game-1",
        eventType: "WALK_OFF",
        playerId: "player-1",
        playerName: "Maya Vega",
        playerTeam: "PRESS",
        fameValue: 1.5,
        fameType: "bonus",
        inning: 9,
        halfInning: "BOTTOM",
        timestamp: 1,
        autoDetected: true,
      },
      {
        id: "fame-2",
        gameId: "game-1",
        eventType: "TOOTBLAN",
        playerId: "player-2",
        playerName: "Rico Hale",
        playerTeam: "PRESS",
        fameValue: -1,
        fameType: "boner",
        inning: 8,
        halfInning: "TOP",
        timestamp: 2,
        autoDetected: true,
      },
    ]);

    await expect(getPlayerRunFame("elim-run-1", "player-1")).resolves.toEqual({
      totalFame: 1.5,
      events: [
        expect.objectContaining({
          eventType: "WALK_OFF",
          playerId: "player-1",
        }),
      ],
      gamesPlayed: 1,
    });

    await expect(getRunFameStandings("elim-run-1")).resolves.toEqual([
      expect.objectContaining({
        playerId: "player-1",
        totalFame: 1.5,
        gamesPlayed: 1,
      }),
      expect.objectContaining({
        playerId: "player-2",
        totalFame: -1,
        gamesPlayed: 1,
      }),
    ]);
  });

  test("accumulates Fame across multiple games and keeps prior-game players in standings", async () => {
    await appendEliminationGameFameToRun("elim-run-2", "game-1", [
      {
        id: "fame-1",
        gameId: "game-1",
        eventType: "WEB_GEM",
        playerId: "player-1",
        playerName: "Maya Vega",
        playerTeam: "PRESS",
        fameValue: 0.5,
        fameType: "bonus",
        inning: 4,
        halfInning: "TOP",
        timestamp: 1,
        autoDetected: true,
      },
    ]);
    await appendEliminationGameFameToRun("elim-run-2", "game-2", [
      {
        id: "fame-2",
        gameId: "game-2",
        eventType: "GO_AHEAD_HR",
        playerId: "player-2",
        playerName: "Rico Hale",
        playerTeam: "PRESS",
        fameValue: 1.9,
        fameType: "bonus",
        inning: 8,
        halfInning: "BOTTOM",
        timestamp: 2,
        autoDetected: true,
      },
      {
        id: "fame-3",
        gameId: "game-2",
        eventType: "BACK_TO_BACK_HR",
        playerId: "player-2",
        playerName: "Rico Hale",
        playerTeam: "PRESS",
        fameValue: 0.75,
        fameType: "bonus",
        inning: 8,
        halfInning: "BOTTOM",
        timestamp: 3,
        autoDetected: true,
      },
    ]);

    await expect(getPlayerRunFame("elim-run-2", "player-2")).resolves.toEqual({
      totalFame: 2.65,
      events: [
        expect.objectContaining({ eventType: "GO_AHEAD_HR" }),
        expect.objectContaining({ eventType: "BACK_TO_BACK_HR" }),
      ],
      gamesPlayed: 1,
    });

    const standings = await getRunFameStandings("elim-run-2");
    expect(standings.map((entry) => entry.playerId)).toEqual([
      "player-2",
      "player-1",
    ]);
    expect(standings[1]).toMatchObject({
      playerId: "player-1",
      totalFame: 0.5,
      gamesPlayed: 1,
    });
  });

  test("dedupes repeated writes for the same elimination game", async () => {
    const fameEvents = [
      {
        id: "fame-1",
        gameId: "game-1",
        eventType: "WALK_OFF_HR",
        playerId: "player-1",
        playerName: "Maya Vega",
        playerTeam: "PRESS",
        fameValue: 2,
        fameType: "bonus" as const,
        inning: 9,
        halfInning: "BOTTOM" as const,
        timestamp: 1,
        autoDetected: true,
      },
    ];

    await appendEliminationGameFameToRun("elim-run-3", "game-1", fameEvents);
    await appendEliminationGameFameToRun("elim-run-3", "game-1", fameEvents);

    await expect(getPlayerRunFame("elim-run-3", "player-1")).resolves.toEqual({
      totalFame: 2,
      events: [expect.objectContaining({ eventType: "WALK_OFF_HR" })],
      gamesPlayed: 1,
    });
  });

  test("upgrades an existing tracker database and returns empty run data by default", async () => {
    await seedLegacyTrackerDatabase();

    await expect(getRunFameStandings("elim-run-legacy")).resolves.toEqual([]);
    await expect(getPlayerRunFame("elim-run-legacy", "player-1")).resolves.toEqual({
      totalFame: 0,
      events: [],
      gamesPlayed: 0,
    });

    const db = await getTrackerDb();
    expect(Array.from(db.objectStoreNames)).toContain(
      "eliminationRunFameAggregates",
    );

    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("completedGames", "readonly");
      const request = tx.objectStore("completedGames").get("legacy-elim-game");
      request.onsuccess = () => {
        expect(request.result).toMatchObject({
          gameId: "legacy-elim-game",
          competitionType: "elimination",
        });
        resolve();
      };
      request.onerror = () => reject(request.error);
    });
  });
});
