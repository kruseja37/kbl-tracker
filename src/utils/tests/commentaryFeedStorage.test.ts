import "fake-indexeddb/auto";

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import type { CommentaryFeedEntryRecord } from "../../types/reporter";
import {
  deleteCommentaryFeedEntry,
  listCommentaryFeedEntriesForGame,
  persistCommentaryFeedEntry,
} from "../commentaryFeedStorage";
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

function createRecord(overrides: Partial<CommentaryFeedEntryRecord> = {}): CommentaryFeedEntryRecord {
  return {
    id: "commentary-game-1_1",
    gameId: "game-1",
    leagueId: "league-1",
    reporterId: "reporter-1",
    commentaryText: "The crowd wakes up in a hurry.",
    halfInningLabel: "B3",
    timestamp: 2_000,
    createdAt: 2_000,
    changed_at: 2_000,
    ...overrides,
  };
}

describe("commentaryFeedStorage", () => {
  beforeEach(async () => {
    trackerDb.resetTrackerDbForTests();
    await deleteDatabase(DB_NAME).catch(() => undefined);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    trackerDb.resetTrackerDbForTests();
    await deleteDatabase(DB_NAME).catch(() => undefined);
  });

  test("create + list round-trip returns non-deleted records sorted by timestamp", async () => {
    vi.spyOn(syncEngine, "upsert").mockImplementation(() => undefined);
    vi.spyOn(syncEngine, "isSuppressed").mockReturnValue(false);

    const later = createRecord({
      id: "commentary-game-1_2",
      commentaryText: "Later entry.",
      timestamp: 5_000,
      createdAt: 5_000,
      changed_at: 5_000,
    });
    const earlier = createRecord({
      id: "commentary-pre-game-1",
      commentaryText: "Pregame setup.",
      halfInningLabel: "PRE",
      timestamp: 0,
      createdAt: 1_000,
      changed_at: 1_000,
    });

    await persistCommentaryFeedEntry(later);
    await persistCommentaryFeedEntry(earlier);

    await expect(listCommentaryFeedEntriesForGame("game-1")).resolves.toEqual([
      earlier,
      later,
    ]);
  });

  test("round-trips historical tidbits inside the stored commentary payload", async () => {
    vi.spyOn(syncEngine, "upsert").mockImplementation(() => undefined);
    vi.spyOn(syncEngine, "isSuppressed").mockReturnValue(false);

    const record = createRecord({
      id: "commentary-inning-game-1-home-4-2000",
      kind: "between-inning",
      historicalTidbit: {
        factId: "mlb-johnny-vander-meer-back-to-back-no-hitters",
        text: "Johnny Vander Meer's back-to-back no-hitters in June 1938 still stand as the only consecutive no-hitters in Major League history.",
        sourceLabel: "MLB",
        sourceUrl:
          "https://www.mlb.com/news/75th-anniversary-of-vander-meers-back-to-back-no-hitters/c-50314542",
      },
    });

    await persistCommentaryFeedEntry(record);

    await expect(listCommentaryFeedEntriesForGame("game-1")).resolves.toEqual([
      record,
    ]);
  });

  test("soft-delete hides record from list", async () => {
    vi.spyOn(syncEngine, "upsert").mockImplementation(() => undefined);
    vi.spyOn(syncEngine, "isSuppressed").mockReturnValue(false);

    const record = createRecord();
    await persistCommentaryFeedEntry(record);
    await deleteCommentaryFeedEntry(record.id);

    await expect(listCommentaryFeedEntriesForGame(record.gameId)).resolves.toEqual([]);
  });

  test("sync.upsert called when not suppressed", async () => {
    const upsertSpy = vi.spyOn(syncEngine, "upsert").mockImplementation(() => undefined);
    vi.spyOn(syncEngine, "isSuppressed").mockReturnValue(false);

    const record = createRecord();
    await persistCommentaryFeedEntry(record);

    expect(upsertSpy).toHaveBeenCalledTimes(1);
    expect(upsertSpy).toHaveBeenCalledWith(
      DB_NAME,
      "commentaryFeedEntries",
      record.id,
      record,
    );
  });

  test("sync.upsert NOT called when suppressed", async () => {
    const upsertSpy = vi.spyOn(syncEngine, "upsert").mockImplementation(() => undefined);
    vi.spyOn(syncEngine, "isSuppressed").mockReturnValue(true);

    await persistCommentaryFeedEntry(createRecord());

    expect(upsertSpy).not.toHaveBeenCalled();
  });

  test("IDB error surfaces as thrown Error", async () => {
    vi.spyOn(trackerDb, "openTrackerDb").mockRejectedValue(new Error("boom"));

    await expect(persistCommentaryFeedEntry(createRecord())).rejects.toThrow(
      "[commentaryFeedStorage] Failed to persist commentary feed entry commentary-game-1_1: boom",
    );
  });
});
