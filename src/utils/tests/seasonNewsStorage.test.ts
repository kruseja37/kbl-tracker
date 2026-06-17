import "fake-indexeddb/auto";

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import type { SeasonNewsItem } from "../../types/reporter";
import {
  deleteSeasonNewsItem,
  listSeasonNewsItemsByEvent,
  listSeasonNewsItemsForFranchiseSeason,
  persistSeasonNewsItem,
} from "../seasonNewsStorage";
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

function createSeasonNewsItem(
  overrides: Partial<SeasonNewsItem> = {},
): SeasonNewsItem {
  return {
    id: "news-1",
    franchiseId: "franchise-1",
    seasonId: "season-1",
    seasonNumber: 1,
    eventType: "MILESTONE",
    subjectIds: ["player-1"],
    facts: { milestone: "50th home run" },
    headline: "Milestone Night",
    body: "The slugger reached a new mark.",
    reporterId: "reporter-1",
    dramaticWeight: 0.84,
    createdAt: 5_000,
    changed_at: 5_000,
    ...overrides,
  };
}

describe("seasonNewsStorage", () => {
  beforeEach(async () => {
    trackerDb.resetTrackerDbForTests();
    await deleteDatabase(DB_NAME).catch(() => undefined);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    trackerDb.resetTrackerDbForTests();
    await deleteDatabase(DB_NAME).catch(() => undefined);
  });

  test("round-trips franchise season news and filters by event", async () => {
    vi.spyOn(syncEngine, "upsert").mockImplementation(() => undefined);
    vi.spyOn(syncEngine, "isSuppressed").mockReturnValue(false);

    const older = createSeasonNewsItem({
      id: "older",
      eventType: "MILESTONE",
      createdAt: 1_000,
    });
    const newer = createSeasonNewsItem({
      id: "newer",
      eventType: "PLAYOFF_RACE",
      createdAt: 3_000,
      headline: "Race Tightens",
    });
    const otherSeason = createSeasonNewsItem({
      id: "other-season",
      seasonId: "season-2",
      createdAt: 9_000,
    });

    await persistSeasonNewsItem(older);
    await persistSeasonNewsItem(newer);
    await persistSeasonNewsItem(otherSeason);

    await expect(
      listSeasonNewsItemsForFranchiseSeason("franchise-1", "season-1"),
    ).resolves.toEqual([newer, older]);

    await expect(
      listSeasonNewsItemsByEvent("franchise-1", "season-1", "MILESTONE"),
    ).resolves.toEqual([older]);
  });

  test("soft-delete hides the item from list queries", async () => {
    vi.spyOn(syncEngine, "upsert").mockImplementation(() => undefined);
    vi.spyOn(syncEngine, "isSuppressed").mockReturnValue(false);

    const item = createSeasonNewsItem();
    await persistSeasonNewsItem(item);
    await expect(
      listSeasonNewsItemsForFranchiseSeason(item.franchiseId, item.seasonId),
    ).resolves.toEqual([item]);

    await deleteSeasonNewsItem(item.franchiseId, item.seasonId, item.id);

    await expect(
      listSeasonNewsItemsForFranchiseSeason(item.franchiseId, item.seasonId),
    ).resolves.toEqual([]);
    await expect(
      listSeasonNewsItemsByEvent(item.franchiseId, item.seasonId, item.eventType),
    ).resolves.toEqual([]);
  });

  test("sync.upsert uses the compound season-news key when sync is not suppressed", async () => {
    const upsertSpy = vi
      .spyOn(syncEngine, "upsert")
      .mockImplementation(() => undefined);
    vi.spyOn(syncEngine, "isSuppressed").mockReturnValue(false);

    const item = createSeasonNewsItem();
    await persistSeasonNewsItem(item);

    expect(upsertSpy).toHaveBeenCalledWith(
      DB_NAME,
      "seasonNewsItems",
      [item.franchiseId, item.seasonId, item.id],
      expect.objectContaining({ id: item.id, headline: item.headline }),
    );
  });

  test("sync.upsert is NOT called when sync is suppressed", async () => {
    const upsertSpy = vi
      .spyOn(syncEngine, "upsert")
      .mockImplementation(() => undefined);
    vi.spyOn(syncEngine, "isSuppressed").mockReturnValue(true);

    await persistSeasonNewsItem(createSeasonNewsItem());

    expect(upsertSpy).not.toHaveBeenCalled();
  });
});
