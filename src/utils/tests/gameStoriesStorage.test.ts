import "fake-indexeddb/auto";

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import type { GameStory } from "../../types/reporter";
import {
  deleteGameStory,
  listGameStoriesForGame,
  listGameStoriesForTeam,
  listGameStoriesMentioningPlayer,
  persistGameStory,
} from "../gameStoriesStorage";
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

function createStory(overrides: Partial<GameStory> = {}): GameStory {
  return {
    id: "story-game-1-home",
    gameId: "game-1",
    reporterId: "reporter-home",
    teamId: "team-home",
    leagueId: "league-1",
    gameMode: "exhibition",
    headline: "HOMERUN WINS IT",
    body: "Three paragraphs of sparkling prose.",
    playersMentioned: ["Harry Backman", "Winnie Noelle"],
    gameDate: "2026-04-17",
    opponentTeamId: "team-away",
    createdAt: 5_000,
    changed_at: 5_000,
    ...overrides,
  };
}

describe("gameStoriesStorage", () => {
  beforeEach(async () => {
    trackerDb.resetTrackerDbForTests();
    await deleteDatabase(DB_NAME).catch(() => undefined);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    trackerDb.resetTrackerDbForTests();
    await deleteDatabase(DB_NAME).catch(() => undefined);
  });

  test("create + list round-trip by gameId returns both columns sorted by createdAt", async () => {
    vi.spyOn(syncEngine, "upsert").mockImplementation(() => undefined);
    vi.spyOn(syncEngine, "isSuppressed").mockReturnValue(false);

    const home = createStory({ id: "game-1-home", reporterId: "reporter-home", teamId: "team-home", createdAt: 5_000 });
    const away = createStory({
      id: "game-1-away",
      reporterId: "reporter-away",
      teamId: "team-away",
      opponentTeamId: "team-home",
      createdAt: 6_000,
      headline: "ROAD TRIP LOSS",
    });

    await persistGameStory(home);
    await persistGameStory(away);

    const results = await listGameStoriesForGame("game-1");
    expect(results).toEqual([home, away]);
  });

  test("listGameStoriesForTeam filters by team and optional gameMode, newest first", async () => {
    vi.spyOn(syncEngine, "upsert").mockImplementation(() => undefined);
    vi.spyOn(syncEngine, "isSuppressed").mockReturnValue(false);

    const exh = createStory({ id: "a", teamId: "team-home", gameMode: "exhibition", createdAt: 1_000 });
    const elim = createStory({ id: "b", teamId: "team-home", gameMode: "elimination", createdAt: 5_000 });
    const otherTeam = createStory({ id: "c", teamId: "team-other", gameMode: "exhibition", createdAt: 2_000 });

    await persistGameStory(exh);
    await persistGameStory(elim);
    await persistGameStory(otherTeam);

    const allForTeam = await listGameStoriesForTeam("team-home");
    expect(allForTeam.map((s) => s.id)).toEqual(["b", "a"]);

    const exhOnly = await listGameStoriesForTeam("team-home", "exhibition");
    expect(exhOnly.map((s) => s.id)).toEqual(["a"]);
  });

  test("franchise playoff stories retain franchise scope and do not appear as elimination stories", async () => {
    vi.spyOn(syncEngine, "upsert").mockImplementation(() => undefined);
    vi.spyOn(syncEngine, "isSuppressed").mockReturnValue(false);

    const franchisePlayoff = createStory({
      id: "franchise-playoff-story",
      gameMode: "franchise",
      competitionType: "playoff",
      competitionId: "playoff-franchise-1",
      playoffId: "playoff-franchise-1",
      playoffSeriesId: "series-1",
      playoffGameNumber: 2,
      franchiseId: "franchise-1",
      seasonId: "franchise-1-season-3",
      seasonNumber: 3,
      statsScopeId: "franchise-1-season-3",
      scheduleGameId: "schedule-game-1",
      createdAt: 5_000,
    });
    const elimination = createStory({
      id: "elimination-story",
      gameMode: "elimination",
      competitionType: "elimination",
      competitionId: "elim-1",
      eliminationId: "elim-1",
      statsScopeId: "elimination-elim-1",
      createdAt: 6_000,
    });

    await persistGameStory(franchisePlayoff);
    await persistGameStory(elimination);

    await expect(listGameStoriesForGame("game-1")).resolves.toEqual([
      franchisePlayoff,
      elimination,
    ]);
    await expect(listGameStoriesForTeam("team-home", "franchise")).resolves.toEqual([
      franchisePlayoff,
    ]);
    await expect(listGameStoriesForTeam("team-home", "elimination")).resolves.toEqual([
      elimination,
    ]);
  });

  test("listGameStoriesMentioningPlayer filters by playersMentioned array", async () => {
    vi.spyOn(syncEngine, "upsert").mockImplementation(() => undefined);
    vi.spyOn(syncEngine, "isSuppressed").mockReturnValue(false);

    const withBackman = createStory({
      id: "with-backman",
      playersMentioned: ["Harry Backman", "Winnie Noelle"],
      createdAt: 5_000,
    });
    const withoutBackman = createStory({
      id: "without-backman",
      playersMentioned: ["Billy LeBoink"],
      createdAt: 7_000,
    });

    await persistGameStory(withBackman);
    await persistGameStory(withoutBackman);

    await expect(
      listGameStoriesMentioningPlayer("Harry Backman"),
    ).resolves.toEqual([withBackman]);

    await expect(
      listGameStoriesMentioningPlayer("Ghost Player"),
    ).resolves.toEqual([]);
  });

  test("soft-delete hides the story from list queries", async () => {
    vi.spyOn(syncEngine, "upsert").mockImplementation(() => undefined);
    vi.spyOn(syncEngine, "isSuppressed").mockReturnValue(false);

    const story = createStory();
    await persistGameStory(story);
    await expect(listGameStoriesForGame("game-1")).resolves.toHaveLength(1);

    await deleteGameStory(story.id);

    await expect(listGameStoriesForGame("game-1")).resolves.toEqual([]);
    await expect(
      listGameStoriesForTeam(story.teamId),
    ).resolves.toEqual([]);
  });

  test("sync.upsert is called when sync is not suppressed", async () => {
    const upsertSpy = vi
      .spyOn(syncEngine, "upsert")
      .mockImplementation(() => undefined);
    vi.spyOn(syncEngine, "isSuppressed").mockReturnValue(false);

    const story = createStory();
    await persistGameStory(story);

    expect(upsertSpy).toHaveBeenCalledWith(
      DB_NAME,
      "gameStories",
      story.id,
      expect.objectContaining({ id: story.id, headline: story.headline }),
    );
  });

  test("sync.upsert is NOT called when sync is suppressed", async () => {
    const upsertSpy = vi
      .spyOn(syncEngine, "upsert")
      .mockImplementation(() => undefined);
    vi.spyOn(syncEngine, "isSuppressed").mockReturnValue(true);

    await persistGameStory(createStory());

    expect(upsertSpy).not.toHaveBeenCalled();
  });

  test("IDB errors surface as thrown Error with an informative prefix", async () => {
    vi.spyOn(trackerDb, "openTrackerDb").mockRejectedValue(
      new Error("boom"),
    );

    await expect(persistGameStory(createStory())).rejects.toThrow(
      /\[gameStoriesStorage\] Failed to persist game story/,
    );
  });
});
