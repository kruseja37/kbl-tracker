import "fake-indexeddb/auto";

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { Player, Team } from "../leagueBuilderStorage";

interface StoreRow {
  id?: string;
  user_id: string;
  db_name: string;
  store_name: string;
  record_key: string;
  data: unknown;
  changed_at: number;
  deleted: boolean;
}

const mockState = vi.hoisted(() => ({
  cloudRows: [] as StoreRow[],
  localRows: [] as Array<{ key: string; data: unknown; deleted: boolean }>,
  kblStoreUpserts: [] as StoreRow[],
  updates: [] as Array<{ table: string; payload: unknown }>,
  reset() {
    this.cloudRows = [];
    this.localRows = [];
    this.kblStoreUpserts = [];
    this.updates = [];
  },
}));

function makeThenable<T>(resultFactory: () => T | Promise<T>) {
  return {
    eq() {
      return this;
    },
    gt() {
      return this;
    },
    limit() {
      return this;
    },
    order() {
      return this;
    },
    or() {
      return this;
    },
    maybeSingle() {
      return Promise.resolve({ data: null, error: null });
    },
    then<TResult1 = T, TResult2 = never>(
      onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | null,
      onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
    ) {
      return Promise.resolve()
        .then(resultFactory)
        .then(onfulfilled, onrejected);
    },
  };
}

vi.mock("../../supabase", () => ({
  supabase: {
    auth: {
      getSession: vi.fn(async () => ({
        data: { session: { user: { id: "user-1" } } },
      })),
    },
    from(table: string) {
      return {
        update(payload: unknown) {
          mockState.updates.push({ table, payload });
          return makeThenable(() => ({ data: null, error: null }));
        },
        upsert(payload: unknown) {
          const rows = Array.isArray(payload) ? payload : [payload];
          if (table === "kbl_stores") {
            mockState.kblStoreUpserts.push(...(rows as StoreRow[]));
          }
          return Promise.resolve({ data: null, error: null });
        },
        select() {
          if (table === "kbl_stores") {
            return makeThenable(() => ({ data: mockState.cloudRows, error: null }));
          }
          if (table === "kbl_local_storage") {
            return makeThenable(() => ({ data: mockState.localRows, error: null }));
          }
          return makeThenable(() => ({ data: null, error: null }));
        },
      };
    },
  },
}));

function deleteDatabase(name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error(`Delete blocked for ${name}`));
  });
}

function transactionToPromise(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

function openAppMetaDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("kbl-app-meta", 3);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("franchiseList")) {
        db.createObjectStore("franchiseList", { keyPath: "franchiseId" });
      }
      if (!db.objectStoreNames.contains("appSettings")) {
        db.createObjectStore("appSettings", { keyPath: "key" });
      }
      if (!db.objectStoreNames.contains("franchiseConfigs")) {
        db.createObjectStore("franchiseConfigs", { keyPath: "franchiseId" });
      }
      if (!db.objectStoreNames.contains("eliminationList")) {
        db.createObjectStore("eliminationList", { keyPath: "eliminationId" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function seedEliminationMeta(eliminationId: string): Promise<void> {
  const db = await openAppMetaDb();
  const tx = db.transaction("eliminationList", "readwrite");
  tx.objectStore("eliminationList").put({
    eliminationId,
    name: "Cloud Cup",
    leagueId: "league-1",
    leagueName: "League One",
    status: "IN_PROGRESS",
    createdAt: 1,
    lastPlayedAt: 1,
    teamsCount: 4,
    currentRound: 1,
  });
  await transactionToPromise(tx);
  db.close();
}

async function seedFranchiseMeta(franchiseId: string): Promise<void> {
  const db = await openAppMetaDb();
  const tx = db.transaction("franchiseList", "readwrite");
  tx.objectStore("franchiseList").put({
    franchiseId,
    name: "Franchise",
    createdAt: 1,
    lastPlayedAt: 1,
    schemaVersion: 1,
    appVersionCreated: "1.0.0",
  });
  await transactionToPromise(tx);
  db.close();
}

function buildPlayer(id: string, teamId: string): Player {
  return {
    id,
    firstName: "Ivy",
    lastName: "Runner",
    baseFameTier: 4,
    gender: "F",
    age: 24,
    bats: "R",
    throws: "R",
    primaryPosition: "SS",
    power: 70,
    contact: 71,
    speed: 72,
    fielding: 73,
    arm: 74,
    velocity: 50,
    junk: 50,
    accuracy: 50,
    arsenal: [],
    overallGrade: "B",
    personality: "Relaxed",
    chemistry: "Disciplined",
    morale: 0,
    mojo: "Normal",
    fame: 0,
    salary: 1000000,
    leagueAssignments: [{ leagueId: "league-1", teamId, rosterStatus: "MLB" }],
    createdDate: "2026-01-01T00:00:00.000Z",
    lastModified: "2026-01-01T00:00:00.000Z",
    isCustom: true,
    editHistory: [],
  };
}

function buildTeam(id: string): Team {
  return {
    id,
    name: "Cloud Captains",
    abbreviation: "CLC",
    location: "Denver",
    nickname: "Captains",
    colors: { primary: "#112233", secondary: "#445566" },
    stadium: "Cloud Park",
    leagueIds: ["league-1"],
    managerId: "manager-cloud",
    managerName: "Casey Cloud",
    createdDate: "2026-01-01T00:00:00.000Z",
    lastModified: "2026-01-01T00:00:00.000Z",
  };
}

async function getAllRecords<T>(dbName: string, storeName: string): Promise<T[]> {
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(dbName);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  if (!db.objectStoreNames.contains(storeName)) {
    db.close();
    return [];
  }
  const records = await new Promise<T[]>((resolve, reject) => {
    const tx = db.transaction(storeName, "readonly");
    const request = tx.objectStore(storeName).getAll();
    request.onsuccess = () => {
      const result = request.result as T[];
      db.close();
      resolve(result);
    };
    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
  return records;
}

async function seedCopiedDb(
  dbName: string,
  players: Player[] = [],
  teams: Team[] = [],
): Promise<void> {
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(dbName, 1);
    request.onupgradeneeded = () => {
      const upgradeDb = request.result;
      if (!upgradeDb.objectStoreNames.contains("players")) {
        upgradeDb.createObjectStore("players", { keyPath: "id" });
      }
      if (!upgradeDb.objectStoreNames.contains("teams")) {
        upgradeDb.createObjectStore("teams", { keyPath: "id" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  const tx = db.transaction(["players", "teams"], "readwrite");
  for (const player of players) tx.objectStore("players").put(player);
  for (const team of teams) tx.objectStore("teams").put(team);
  await transactionToPromise(tx);
  db.close();
}

async function loadFreshSyncEngine() {
  vi.resetModules();
  const { syncEngine } = await import("../syncEngine");
  return syncEngine;
}

describe("syncEngine dynamic elimination copied DBs", () => {
  beforeEach(async () => {
    mockState.reset();
    vi.doUnmock("../leagueBuilderStorage");
    vi.doUnmock("../playerOverrides");
    localStorage.clear();
    await Promise.allSettled([
      deleteDatabase("kbl-app-meta"),
      deleteDatabase("kbl-elimination-elim-copy"),
      deleteDatabase("kbl-elimination-elim-sync"),
      deleteDatabase("kbl-elimination-elim-cloud"),
      deleteDatabase("kbl-elimination-elim-stale"),
      deleteDatabase("kbl-franchise-franchise-cloud"),
    ]);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    vi.doUnmock("../leagueBuilderStorage");
    vi.doUnmock("../playerOverrides");
    await Promise.allSettled([
      deleteDatabase("kbl-app-meta"),
      deleteDatabase("kbl-elimination-elim-copy"),
      deleteDatabase("kbl-elimination-elim-sync"),
      deleteDatabase("kbl-elimination-elim-cloud"),
      deleteDatabase("kbl-elimination-elim-stale"),
      deleteDatabase("kbl-franchise-franchise-cloud"),
    ]);
  });

  test("replaceCloudWithLocal uploads copied elimination players and teams", async () => {
    await seedEliminationMeta("elim-sync");
    await seedCopiedDb(
      "kbl-elimination-elim-sync",
      [buildPlayer("player-sync", "team-sync")],
      [buildTeam("team-sync")],
    );
    const syncEngine = await loadFreshSyncEngine();

    await syncEngine.replaceCloudWithLocal();

    expect(mockState.kblStoreUpserts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          db_name: "kbl-elimination-elim-sync",
          store_name: "players",
          record_key: JSON.stringify("player-sync"),
          data: expect.objectContaining({ id: "player-sync", firstName: "Ivy" }),
          deleted: false,
        }),
        expect.objectContaining({
          db_name: "kbl-elimination-elim-sync",
          store_name: "teams",
          record_key: JSON.stringify("team-sync"),
          data: expect.objectContaining({ id: "team-sync", name: "Cloud Captains" }),
          deleted: false,
        }),
      ]),
    );
  });

  test("copied elimination save and delete helpers queue incremental sync operations", async () => {
    const syncEngine = await loadFreshSyncEngine();
    vi.spyOn(syncEngine, "isSuppressed").mockReturnValue(false);
    const upsertSpy = vi.spyOn(syncEngine, "upsert");
    const removeSpy = vi.spyOn(syncEngine, "remove");
    const {
      deleteEliminationDatabase,
      saveEliminationPlayer,
      saveEliminationTeam,
    } = await import("../eliminationPlayerStorage");

    await saveEliminationPlayer("elim-sync", buildPlayer("player-sync", "team-sync"));
    await saveEliminationTeam("elim-sync", buildTeam("team-sync"));

    expect(upsertSpy).toHaveBeenCalledWith(
      "kbl-elimination-elim-sync",
      "players",
      "player-sync",
      expect.objectContaining({ id: "player-sync" }),
    );
    expect(upsertSpy).toHaveBeenCalledWith(
      "kbl-elimination-elim-sync",
      "teams",
      "team-sync",
      expect.objectContaining({ id: "team-sync" }),
    );

    await deleteEliminationDatabase("elim-sync");

    expect(removeSpy).toHaveBeenCalledWith("kbl-elimination-elim-sync", "players", "player-sync");
    expect(removeSpy).toHaveBeenCalledWith("kbl-elimination-elim-sync", "teams", "team-sync");
  });

  test("deepCopyLeagueToBracket queues copied elimination replacements", async () => {
    vi.doMock("../leagueBuilderStorage", () => ({
      getAllPlayers: vi.fn(async () => [buildPlayer("player-copy", "team-copy")]),
      getAllTeams: vi.fn(async () => [buildTeam("team-copy")]),
      getLeagueTemplate: vi.fn(async () => ({
        id: "league-1",
        name: "League One",
        createdDate: "2026-01-01T00:00:00.000Z",
        lastModified: "2026-01-01T00:00:00.000Z",
        teamIds: ["team-copy"],
        conferences: [],
        divisions: [],
        defaultRulesPreset: "rules-1",
      })),
    }));
    vi.doMock("../playerOverrides", () => ({
      getEffectivePlayer: vi.fn(async () => buildPlayer("player-copy", "team-copy")),
    }));
    await seedCopiedDb(
      "kbl-elimination-elim-copy",
      [buildPlayer("old-player", "team-copy")],
      [buildTeam("old-team")],
    );
    const syncEngine = await loadFreshSyncEngine();
    vi.spyOn(syncEngine, "isSuppressed").mockReturnValue(false);
    const upsertSpy = vi.spyOn(syncEngine, "upsert");
    const removeSpy = vi.spyOn(syncEngine, "remove");
    const { deepCopyLeagueToBracket } = await import("../eliminationPlayerStorage");

    await deepCopyLeagueToBracket("elim-copy", "league-1");

    expect(removeSpy).toHaveBeenCalledWith("kbl-elimination-elim-copy", "players", "old-player");
    expect(removeSpy).toHaveBeenCalledWith("kbl-elimination-elim-copy", "teams", "old-team");
    expect(upsertSpy).toHaveBeenCalledWith(
      "kbl-elimination-elim-copy",
      "players",
      "player-copy",
      expect.objectContaining({ id: "player-copy" }),
    );
    expect(upsertSpy).toHaveBeenCalledWith(
      "kbl-elimination-elim-copy",
      "teams",
      "team-copy",
      expect.objectContaining({ id: "team-copy" }),
    );
  });

  test("replaceLocalWithCloud recreates elimination copied DBs in an empty local environment", async () => {
    mockState.cloudRows = [
      {
        id: "remote-player",
        user_id: "user-1",
        db_name: "kbl-elimination-elim-cloud",
        store_name: "players",
        record_key: JSON.stringify("player-cloud"),
        data: buildPlayer("player-cloud", "team-cloud"),
        changed_at: 10,
        deleted: false,
      },
      {
        id: "remote-team",
        user_id: "user-1",
        db_name: "kbl-elimination-elim-cloud",
        store_name: "teams",
        record_key: JSON.stringify("team-cloud"),
        data: buildTeam("team-cloud"),
        changed_at: 11,
        deleted: false,
      },
    ];
    const syncEngine = await loadFreshSyncEngine();

    await syncEngine.replaceLocalWithCloud();

    await expect(getAllRecords<Player>("kbl-elimination-elim-cloud", "players")).resolves.toEqual([
      expect.objectContaining({ id: "player-cloud", firstName: "Ivy" }),
    ]);
    await expect(getAllRecords<Team>("kbl-elimination-elim-cloud", "teams")).resolves.toEqual([
      expect.objectContaining({ id: "team-cloud", name: "Cloud Captains" }),
    ]);
  });

  test("replaceLocalWithCloud clears stale copied elimination rows before applying cloud rows", async () => {
    await seedEliminationMeta("elim-stale");
    await seedCopiedDb(
      "kbl-elimination-elim-stale",
      [buildPlayer("stale-player", "team-stale")],
      [],
    );
    mockState.cloudRows = [
      {
        id: "remote-fresh-player",
        user_id: "user-1",
        db_name: "kbl-elimination-elim-stale",
        store_name: "players",
        record_key: JSON.stringify("fresh-player"),
        data: buildPlayer("fresh-player", "team-stale"),
        changed_at: 10,
        deleted: false,
      },
    ];
    const syncEngine = await loadFreshSyncEngine();

    await syncEngine.replaceLocalWithCloud();

    await expect(getAllRecords<Player>("kbl-elimination-elim-stale", "players")).resolves.toEqual([
      expect.objectContaining({ id: "fresh-player" }),
    ]);
  });

  test("replaceLocalWithCloud still creates dynamic franchise copied DB stores", async () => {
    mockState.cloudRows = [
      {
        id: "remote-franchise-player",
        user_id: "user-1",
        db_name: "kbl-franchise-franchise-cloud",
        store_name: "players",
        record_key: JSON.stringify("franchise-player"),
        data: buildPlayer("franchise-player", "team-franchise"),
        changed_at: 10,
        deleted: false,
      },
    ];
    await seedFranchiseMeta("franchise-cloud");
    const syncEngine = await loadFreshSyncEngine();

    await syncEngine.replaceLocalWithCloud();

    await expect(getAllRecords<Player>("kbl-franchise-franchise-cloud", "players")).resolves.toEqual([
      expect.objectContaining({ id: "franchise-player" }),
    ]);
  });
});
