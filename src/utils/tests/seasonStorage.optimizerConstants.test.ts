import "fake-indexeddb/auto";

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { captureOptimizerConstantsSnapshot } from "../../engines/optimizerConstantsSnapshot";
import {
  getOrCreateSeason,
  getSeasonMetadata,
  saveSeasonMetadata,
} from "../seasonStorage";
import { resetTrackerDbForTests } from "../trackerDb";

const DB_NAME = "kbl-tracker";

function deleteDatabase(name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => resolve();
  });
}

describe("seasonStorage optimizer constants snapshot", () => {
  beforeEach(async () => {
    resetTrackerDbForTests();
    await deleteDatabase(DB_NAME);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    resetTrackerDbForTests();
    await deleteDatabase(DB_NAME);
  });

  test("stamps new season metadata with the live optimizer constants snapshot", async () => {
    const snapshot = captureOptimizerConstantsSnapshot();

    const season = await getOrCreateSeason(
      "optimizer-season-1",
      1,
      "Season 1",
      32,
      16,
    );

    expect(season).toMatchObject({
      optimizerConstantsVersion: snapshot.version,
      optimizerConstantsHash: snapshot.hash,
    });
    await expect(getSeasonMetadata("optimizer-season-1")).resolves.toMatchObject({
      optimizerConstantsVersion: snapshot.version,
      optimizerConstantsHash: snapshot.hash,
    });
  });

  test("does not overwrite an existing optimizer constants hash when live constants differ", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    await saveSeasonMetadata({
      seasonId: "optimizer-season-drift",
      seasonNumber: 1,
      seasonName: "Season Drift",
      status: "active",
      startDate: 1,
      gamesPlayed: 0,
      totalGames: 32,
      gamesPerTeam: 16,
      optimizerConstantsVersion: "kbl-optimizer-constants-v1",
      optimizerConstantsHash: "old-hash",
    });

    const first = await getOrCreateSeason(
      "optimizer-season-drift",
      1,
      "Season Drift",
      32,
      16,
    );
    const second = await getOrCreateSeason(
      "optimizer-season-drift",
      1,
      "Season Drift",
      32,
      16,
    );

    expect(first.optimizerConstantsHash).toBe("old-hash");
    expect(second.optimizerConstantsHash).toBe("old-hash");
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(
      "optimizer constants changed mid-season for season optimizer-season-drift; §9 lineup-delta benchmark may be non-comparable",
    );
  });
});
