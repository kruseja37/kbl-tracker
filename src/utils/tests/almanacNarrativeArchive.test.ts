import "fake-indexeddb/auto";

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import type { CommentaryFeedEntryRecord, GameStory } from "../../types/reporter";
import type { CompletedGameRecord } from "../gameStorage";
import { listAlmanacNarrativeArchive } from "../almanacNarrativeArchive";
import { persistCommentaryFeedEntry } from "../commentaryFeedStorage";
import { persistGameStory } from "../gameStoriesStorage";
import { syncEngine } from "../syncEngine";
import * as trackerDb from "../trackerDb";

const DB_NAME = "kbl-tracker";

function deleteDatabase(name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error(`Delete blocked for ${name}`));
  });
}

function createCompletedGame(
  overrides: Partial<CompletedGameRecord> = {},
): CompletedGameRecord {
  return {
    gameId: "game-1",
    date: 10_000,
    competitionType: "exhibition",
    leagueId: "league-1",
    awayTeamId: "team-away",
    homeTeamId: "team-home",
    awayTeamName: "Freebooters",
    homeTeamName: "Blowfish",
    finalScore: { away: 3, home: 4 },
    innings: 9,
    fameEvents: [],
    playerStats: {},
    pitcherGameStats: [],
    ...overrides,
  };
}

function createTidbitRecord(
  overrides: Partial<CommentaryFeedEntryRecord> = {},
): CommentaryFeedEntryRecord {
  return {
    id: "commentary-inning-game-1-home-1-1000",
    gameId: "game-1",
    leagueId: "league-1",
    reporterId: "reporter-home",
    commentaryText: "",
    halfInningLabel: "INNING 1",
    kind: "between-inning",
    historicalTidbit: {
      factId: "retrosheet-some-fact",
      text: "A verified note from the archive.",
      sourceLabel: "Retrosheet",
      sourceUrl: "https://www.retrosheet.org",
    },
    timestamp: 1_000,
    createdAt: 1_000,
    changed_at: 1_000,
    ...overrides,
  };
}

function createStory(overrides: Partial<GameStory> = {}): GameStory {
  return {
    id: "story-game-1-home",
    gameId: "game-1",
    reporterId: "reporter-home",
    teamId: "team-home",
    leagueId: "league-1",
    gameMode: "exhibition",
    headline: "HOME COLUMN",
    body: "A full game story.",
    playersMentioned: [],
    gameDate: "2026-04-23",
    createdAt: 2_000,
    changed_at: 2_000,
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

describe("almanacNarrativeArchive", () => {
  beforeEach(async () => {
    trackerDb.resetTrackerDbForTests();
    await deleteDatabase(DB_NAME).catch(() => undefined);
    vi.spyOn(syncEngine, "upsert").mockImplementation(() => undefined);
    vi.spyOn(syncEngine, "isSuppressed").mockReturnValue(false);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    trackerDb.resetTrackerDbForTests();
    await deleteDatabase(DB_NAME).catch(() => undefined);
  });

  test("aggregates historical tidbits and post-game stories with mode-aware metadata", async () => {
    await seedCompletedGame(
      createCompletedGame({
        gameId: "game-1",
        date: 10_000,
        competitionType: "franchise",
      }),
    );
    await seedCompletedGame(
      createCompletedGame({
        gameId: "game-2",
        date: 20_000,
        competitionType: "elimination",
        awayTeamName: "Moonshots",
        homeTeamName: "Steelheads",
      }),
    );

    await persistCommentaryFeedEntry(
      createTidbitRecord({
        gameId: "game-1",
        reporterId: "reporter-franchise",
      }),
    );
    await persistGameStory(
      createStory({
        id: "story-game-2-away",
        gameId: "game-2",
        gameMode: "elimination",
        headline: "ROAD COLUMN",
        body: "Elimination drama all the way down.",
      }),
    );

    const archive = await listAlmanacNarrativeArchive();

    expect(archive).toHaveLength(2);
    expect(archive[0]).toMatchObject({
      kind: "post-game-story",
      gameId: "game-2",
      gameMode: "elimination",
      awayTeamName: "Moonshots",
      homeTeamName: "Steelheads",
      headline: "ROAD COLUMN",
    });
    expect(archive[1]).toMatchObject({
      kind: "historical-tidbit",
      gameId: "game-1",
      gameMode: "franchise",
      awayTeamName: "Freebooters",
      homeTeamName: "Blowfish",
      sourceLabel: "Retrosheet",
      headline: "INNING 1 History Note",
    });
  });

  test("filters aggregated archive entries by mode and kind", async () => {
    await seedCompletedGame(
      createCompletedGame({
        gameId: "game-1",
        competitionType: "exhibition",
      }),
    );
    await seedCompletedGame(
      createCompletedGame({
        gameId: "game-2",
        competitionType: "franchise",
      }),
    );

    await persistCommentaryFeedEntry(
      createTidbitRecord({
        gameId: "game-1",
        gameMode: "exhibition",
      }),
    );
    await persistGameStory(
      createStory({
        id: "story-game-2-home",
        gameId: "game-2",
        gameMode: "franchise",
      }),
    );

    const exhibitionTidbits = await listAlmanacNarrativeArchive({
      kind: "historical-tidbit",
      gameMode: "exhibition",
    });
    const franchiseStories = await listAlmanacNarrativeArchive({
      kind: "post-game-story",
      gameMode: "franchise",
    });

    expect(exhibitionTidbits).toHaveLength(1);
    expect(exhibitionTidbits[0]).toMatchObject({
      kind: "historical-tidbit",
      gameMode: "exhibition",
    });

    expect(franchiseStories).toHaveLength(1);
    expect(franchiseStories[0]).toMatchObject({
      kind: "post-game-story",
      gameMode: "franchise",
    });
  });

  test("keeps franchise playoff archive entries franchise-scoped instead of elimination-scoped", async () => {
    await seedCompletedGame(
      createCompletedGame({
        gameId: "game-franchise-playoff",
        competitionType: "playoff",
        competitionId: "playoff-franchise-1",
        playoffId: "playoff-franchise-1",
        franchiseId: "franchise-1",
        seasonId: "franchise-1-season-2",
        statsScopeId: "franchise-1-season-2",
        seasonNumber: 2,
      }),
    );
    await seedCompletedGame(
      createCompletedGame({
        gameId: "game-elimination",
        competitionType: "elimination",
        competitionId: "elim-1",
      }),
    );

    await persistCommentaryFeedEntry(
      createTidbitRecord({
        id: "tidbit-franchise-playoff",
        gameId: "game-franchise-playoff",
      }),
    );
    await persistCommentaryFeedEntry(
      createTidbitRecord({
        id: "tidbit-elimination",
        gameId: "game-elimination",
      }),
    );

    const archive = await listAlmanacNarrativeArchive();
    const franchiseEntry = archive.find((entry) => entry.gameId === "game-franchise-playoff");
    const eliminationEntry = archive.find((entry) => entry.gameId === "game-elimination");

    expect(franchiseEntry).toMatchObject({
      gameMode: "franchise",
      competitionType: "playoff",
      competitionId: "playoff-franchise-1",
      playoffId: "playoff-franchise-1",
      franchiseId: "franchise-1",
      seasonId: "franchise-1-season-2",
      statsScopeId: "franchise-1-season-2",
    });
    expect(eliminationEntry).toMatchObject({
      gameMode: "elimination",
      competitionType: "elimination",
      competitionId: "elim-1",
      eliminationId: "elim-1",
    });
  });
});
