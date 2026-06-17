import "fake-indexeddb/auto";

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import {
  exportAllData,
  restoreAllData,
  STATIC_DATABASE_SCHEMAS,
  type BackupData,
} from "../backupRestore";
import { getTrackerDb, resetTrackerDbForTests } from "../trackerDb";

const TRACKER_DB_NAME = "kbl-tracker";

const trueValueRow = {
  franchiseId: "franchise-d2",
  seasonId: "season-d2",
  statsScopeId: "scope-d2",
  playerId: "player-tv",
  trueValue: 11.25,
  contractValue: 7.5,
  valueDelta: 3.75,
  warPercentile: 0.82,
  position: "SS",
  effectivePosition: "SS",
  poolPosition: "SS",
  valuationMode: "single-position",
  peerPoolSize: 8,
  calculationVersion: "true-value-test-version",
  computedAt: "2026-06-16T00:00:00.000Z",
};

const designationRow = {
  franchiseId: "franchise-d2",
  seasonId: "season-d2",
  statsScopeId: "scope-d2",
  teamId: "team-d2",
  type: "TEAM_MVP",
  playerId: "player-designation",
  playerName: "Dani Designation",
  status: "projected",
  computedAt: "2026-06-16T00:00:00.000Z",
  calculationVersion: "designation-test-version",
};

const ledgerRow = {
  franchiseId: "franchise-d2",
  seasonId: "season-d2",
  statsScopeId: "scope-d2",
  playerId: "player-ledger",
  salary: 12000000,
  status: "MLB",
  capCharge: 12000000,
  calculationVersion: "ledger-test-version",
  computedAt: "2026-06-16T00:00:00.000Z",
};

const trustedValueArtifact = {
  franchiseId: "franchise-d2",
  seasonId: "season-d2",
  statsScopeId: "scope-d2",
  seasonNumber: 1,
  contractVersion: "d6-v1",
  peerPoolMinThreshold: 2,
  trustedPlayerIds: ["player-tv"],
  blockedRows: [{ playerId: "player-blocked", reasons: ["Position SS peer pool size 1 (< 2 required)"] }],
  rosterStateSnapshot: [
    { playerId: "player-tv", teamId: "team-d2", rosterStatus: "MLB" },
    { playerId: "player-blocked", teamId: "team-d2", rosterStatus: "MLB" },
  ],
  frozen: false,
  frozenAt: null,
  computedAt: 1781568000000,
};

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

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function wipeTrackerDb(): Promise<void> {
  resetTrackerDbForTests();
  await deleteDatabase(TRACKER_DB_NAME);
  resetTrackerDbForTests();
}

async function seedFranchiseEconomyRows(): Promise<void> {
  const db = await getTrackerDb();
  const tx = db.transaction(
    ["franchiseTrueValueRows", "franchiseDesignationRows", "franchiseSeasonLedgerRows", "franchiseTrustedValueArtifacts"],
    "readwrite",
  );

  tx.objectStore("franchiseTrueValueRows").put(trueValueRow);
  tx.objectStore("franchiseDesignationRows").put(designationRow);
  tx.objectStore("franchiseSeasonLedgerRows").put(ledgerRow);
  tx.objectStore("franchiseTrustedValueArtifacts").put(trustedValueArtifact);

  await transactionToPromise(tx);
}

async function readRecord<T>(storeName: string, key: IDBValidKey): Promise<T | undefined> {
  const db = await getTrackerDb();
  const tx = db.transaction(storeName, "readonly");
  const record = await requestToPromise<T | undefined>(tx.objectStore(storeName).get(key));
  await transactionToPromise(tx);
  return record;
}

async function exportThenWipeAndRestore(): Promise<BackupData> {
  const backup = await exportAllData();
  resetTrackerDbForTests();
  await wipeTrackerDb();
  const result = await restoreAllData(backup);
  expect(result).toMatchObject({ success: true });
  resetTrackerDbForTests();
  return backup;
}

describe("backup/restore kbl-tracker franchise economy parity", () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    await wipeTrackerDb();
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await wipeTrackerDb();
  });

  test("keeps the static kbl-tracker backup registry structurally aligned with trackerDb", async () => {
    resetTrackerDbForTests();
    const db = await getTrackerDb();

    const trackerDbStores = Array.from(db.objectStoreNames).sort();
    const backupRegistryStores = Object.keys(STATIC_DATABASE_SCHEMAS[TRACKER_DB_NAME].stores).sort();

    expect(backupRegistryStores).toEqual(trackerDbStores);
  });

  test("round-trips franchise True Value, designation, season ledger, and trusted-value artifact rows", async () => {
    await seedFranchiseEconomyRows();

    const backup = await exportThenWipeAndRestore();

    expect(backup.databases[TRACKER_DB_NAME].franchiseTrueValueRows).toEqual([trueValueRow]);
    expect(backup.databases[TRACKER_DB_NAME].franchiseDesignationRows).toEqual([designationRow]);
    expect(backup.databases[TRACKER_DB_NAME].franchiseSeasonLedgerRows).toEqual([ledgerRow]);
    expect(backup.databases[TRACKER_DB_NAME].franchiseTrustedValueArtifacts).toEqual([trustedValueArtifact]);

    await expect(
      readRecord("franchiseTrueValueRows", [
        trueValueRow.franchiseId,
        trueValueRow.seasonId,
        trueValueRow.statsScopeId,
        trueValueRow.playerId,
      ]),
    ).resolves.toEqual(trueValueRow);
    await expect(
      readRecord("franchiseDesignationRows", [
        designationRow.franchiseId,
        designationRow.seasonId,
        designationRow.statsScopeId,
        designationRow.teamId,
        designationRow.type,
      ]),
    ).resolves.toEqual(designationRow);
    await expect(
      readRecord("franchiseSeasonLedgerRows", [
        ledgerRow.franchiseId,
        ledgerRow.seasonId,
        ledgerRow.statsScopeId,
        ledgerRow.playerId,
      ]),
    ).resolves.toEqual(ledgerRow);
    await expect(
      readRecord("franchiseTrustedValueArtifacts", [
        trustedValueArtifact.franchiseId,
        trustedValueArtifact.seasonId,
        trustedValueArtifact.statsScopeId,
      ]),
    ).resolves.toEqual(trustedValueArtifact);
  });
});
