import "fake-indexeddb/auto";

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import {
  DEFAULT_SEASON_EMISSION_CONFIG,
  loadSeasonEmissionConfig,
  saveSeasonEmissionConfig,
} from "../seasonEmissionConfigStorage";
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

describe("seasonEmissionConfigStorage", () => {
  beforeEach(async () => {
    trackerDb.resetTrackerDbForTests();
    await deleteDatabase(DB_NAME).catch(() => undefined);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    trackerDb.resetTrackerDbForTests();
    await deleteDatabase(DB_NAME).catch(() => undefined);
  });

  test("loadSeasonEmissionConfig returns the conservative default when no row exists", async () => {
    await expect(loadSeasonEmissionConfig()).resolves.toEqual(
      DEFAULT_SEASON_EMISSION_CONFIG,
    );
  });

  test("saveSeasonEmissionConfig merges a partial update into the default singleton row", async () => {
    vi.spyOn(Date, "now").mockReturnValue(12_345);
    const upsertSpy = vi
      .spyOn(syncEngine, "upsert")
      .mockImplementation(() => undefined);
    vi.spyOn(syncEngine, "isSuppressed").mockReturnValue(false);

    const saved = await saveSeasonEmissionConfig({
      marqueeOnly: false,
      perEventRate: { MILESTONE: 1 },
      raceTopN: 5,
    });

    expect(saved).toEqual({
      id: "default",
      marqueeOnly: false,
      perEventRate: { MILESTONE: 1 },
      raceTopN: 5,
      simWritable: true,
      lastModified: 12_345,
    });
    await expect(loadSeasonEmissionConfig()).resolves.toEqual(saved);
    expect(upsertSpy).toHaveBeenCalledWith(
      DB_NAME,
      "seasonEmissionConfig",
      "default",
      saved,
    );
  });
});
