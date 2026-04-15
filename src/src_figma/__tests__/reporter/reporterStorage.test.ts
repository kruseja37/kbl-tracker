import "fake-indexeddb/auto";

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import type { BeatReporter } from "../../../types/reporter";
import {
  createReporter,
  getReporter,
  getReporterForTeam,
  listReporters,
  updateReporterMood,
} from "../../../utils/reporterStorage";
import { syncEngine } from "../../../utils/syncEngine";
import { resetTrackerDbForTests } from "../../../utils/trackerDb";

const DB_NAME = "kbl-tracker";

function deleteDatabase(name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error(`Delete blocked for ${name}`));
  });
}

function reporterInput(overrides: Partial<Omit<BeatReporter, "id" | "changed_at">> = {}): Omit<BeatReporter, "id" | "changed_at"> {
  return {
    teamId: "team-1",
    leagueId: "league-1",
    name: "Howard Kessler",
    personality: "BALANCED",
    voiceStyle: "THE_GRINDER",
    eraFlavor: "CLASSIC_TV",
    avatarEra: "headset",
    avatarColors: {
      primary: "#112233",
      secondary: "#AABBCC",
    },
    currentMood: "BALANCED",
    moodMomentum: 0,
    createdAt: 1_000,
    updatedAt: 1_000,
    ...overrides,
  };
}

describe("reporterStorage", () => {
  beforeEach(async () => {
    resetTrackerDbForTests();
    await deleteDatabase(DB_NAME).catch(() => undefined);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    resetTrackerDbForTests();
    await deleteDatabase(DB_NAME).catch(() => undefined);
  });

  test("round-trips create, get, list, and updateReporterMood through IndexedDB and sync spy", async () => {
    const upsertSpy = vi.spyOn(syncEngine, "upsert").mockImplementation(() => undefined);
    vi.spyOn(syncEngine, "isSuppressed").mockReturnValue(false);
    let now = 10_000;
    vi.spyOn(Date, "now").mockImplementation(() => {
      now += 1_000;
      return now;
    });

    const created = await createReporter(reporterInput());
    const fetched = await getReporter(created.id);
    const listed = await listReporters({ leagueId: "league-1" });
    const updated = await updateReporterMood(created.id, {
      currentMood: "DRAMATIC",
      moodMomentum: 4,
    });

    expect(fetched).toEqual(created);
    expect(listed).toEqual([created]);
    expect(updated).toMatchObject({
      id: created.id,
      currentMood: "DRAMATIC",
      moodMomentum: 4,
    });
    expect(updated.changed_at).toBeGreaterThan(created.changed_at);
    expect(updated.updatedAt).toBe(updated.changed_at);

    expect(upsertSpy).toHaveBeenCalledTimes(2);
    expect(upsertSpy).toHaveBeenNthCalledWith(1, DB_NAME, "reporters", created.id, created);
    expect(upsertSpy).toHaveBeenNthCalledWith(2, DB_NAME, "reporters", updated.id, updated);

    console.log("[G2] reporter sync spy round-trip", {
      dbName: DB_NAME,
      storeName: "reporters",
      key: updated.id,
      calls: upsertSpy.mock.calls.length,
    });
  });

  test("getReporterForTeam returns null when no reporter exists", async () => {
    await expect(getReporterForTeam("missing-team", "league-1")).resolves.toBeNull();
  });

  test("getReporterForTeam and listReporters respect team and league filters", async () => {
    vi.spyOn(syncEngine, "upsert").mockImplementation(() => undefined);
    vi.spyOn(syncEngine, "isSuppressed").mockReturnValue(false);

    const leagueOneReporter = await createReporter(reporterInput({ teamId: "team-1", leagueId: "league-1" }));
    await createReporter(reporterInput({ teamId: "team-1", leagueId: "league-2", name: "Jack Brennan" }));
    await createReporter(reporterInput({ teamId: "team-2", leagueId: "league-1", name: "Don Castellano" }));

    await expect(getReporterForTeam("team-1", "league-1")).resolves.toEqual(leagueOneReporter);
    await expect(listReporters({ teamId: "team-1" })).resolves.toHaveLength(2);
    await expect(listReporters({ leagueId: "league-1" })).resolves.toHaveLength(2);
  });

  test("does not call syncEngine.upsert when sync is suppressed", async () => {
    const upsertSpy = vi.spyOn(syncEngine, "upsert").mockImplementation(() => undefined);
    vi.spyOn(syncEngine, "isSuppressed").mockReturnValue(true);

    await createReporter(reporterInput());

    expect(upsertSpy).not.toHaveBeenCalled();
  });
});
