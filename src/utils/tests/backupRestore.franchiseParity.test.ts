import "fake-indexeddb/auto";

import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import {
  applyFranchiseMoraleEffect,
  getFranchiseMoraleSnapshot,
  initFranchiseMoraleDatabase,
  resetFranchiseMoraleDatabaseForTests,
} from "../franchiseMoraleState";
import {
  exportAllData,
  restoreAllData,
  STATIC_DATABASE_SCHEMAS,
  type BackupData,
} from "../backupRestore";
import { getTrackerDb, resetTrackerDbForTests } from "../trackerDb";
import { syncEngine } from "../syncEngine";

const TRACKER_DB_NAME = "kbl-tracker";
const MORALE_DB_NAME = "kbl-franchise-morale";

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
  frozen: true,
  frozenAt: 1781654400000,
  computedAt: 1781568000000,
};

const awardsRow = {
  franchiseId: "franchise-d2",
  seasonId: "season-d2",
  statsScopeId: "scope-d2",
  category: "MVP",
  winnerPlayerId: "player-tv",
  candidates: [
    { playerId: "player-tv", score: 8.25, marginToWinner: 0 },
    { playerId: "player-runner-up", score: 7.5, marginToWinner: 0.75 },
  ],
  goldGloveSplit: null,
  voteWeight: null,
  finalized: false,
  computedAt: "2026-06-16T00:00:00.000Z",
};

const trueValueSnapshotRow = {
  franchiseId: "franchise-d2",
  seasonId: "season-d2",
  statsScopeId: "scope-d2",
  playerId: "player-tv",
  checkpoint: 1,
  trueValue: 9.75,
  valueDelta: 2.25,
  warPercentile: 0.72,
  computedAt: "2026-06-16T00:00:00.000Z",
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

async function wipeMoraleDb(): Promise<void> {
  resetFranchiseMoraleDatabaseForTests();
  await deleteDatabase(MORALE_DB_NAME);
  resetFranchiseMoraleDatabaseForTests();
}

async function seedFranchiseEconomyRows(): Promise<void> {
  const db = await getTrackerDb();
  const tx = db.transaction(
    [
      "franchiseTrueValueRows",
      "franchiseDesignationRows",
      "franchiseSeasonLedgerRows",
      "franchiseTrustedValueArtifacts",
      "franchiseAwardsRows",
      "franchiseTrueValueSnapshots",
    ],
    "readwrite",
  );

  tx.objectStore("franchiseTrueValueRows").put(trueValueRow);
  tx.objectStore("franchiseDesignationRows").put(designationRow);
  tx.objectStore("franchiseSeasonLedgerRows").put(ledgerRow);
  tx.objectStore("franchiseTrustedValueArtifacts").put(trustedValueArtifact);
  tx.objectStore("franchiseAwardsRows").put(awardsRow);
  tx.objectStore("franchiseTrueValueSnapshots").put(trueValueSnapshotRow);

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
  resetFranchiseMoraleDatabaseForTests();
  await wipeTrackerDb();
  await wipeMoraleDb();
  const result = await restoreAllData(backup);
  expect(result).toMatchObject({ success: true });
  resetTrackerDbForTests();
  resetFranchiseMoraleDatabaseForTests();
  return backup;
}

describe("backup/restore kbl-tracker franchise economy parity", () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    vi.spyOn(syncEngine, "isSuppressed").mockReturnValue(true);
    await wipeTrackerDb();
    await wipeMoraleDb();
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await wipeTrackerDb();
    await wipeMoraleDb();
  });

  test("keeps the static kbl-tracker backup registry structurally aligned with trackerDb", async () => {
    resetTrackerDbForTests();
    const db = await getTrackerDb();

    const trackerDbStores = Array.from(db.objectStoreNames).sort();
    const backupRegistryStores = Object.keys(STATIC_DATABASE_SCHEMAS[TRACKER_DB_NAME].stores).sort();

    expect(backupRegistryStores).toEqual(trackerDbStores);
  });

  test("keeps the static kbl-franchise-morale backup registry structurally aligned with the morale DB", async () => {
    resetFranchiseMoraleDatabaseForTests();
    const db = await initFranchiseMoraleDatabase();

    const moraleDbStores = Array.from(db.objectStoreNames).sort();
    const backupRegistryStores = Object.keys(STATIC_DATABASE_SCHEMAS[MORALE_DB_NAME].stores).sort();

    expect(backupRegistryStores).toEqual(moraleDbStores);
  });

  test("round-trips franchise True Value, designation, ledger, trusted-value artifact, awards, and TV snapshot rows", async () => {
    await seedFranchiseEconomyRows();

    const backup = await exportThenWipeAndRestore();

    expect(backup.databases[TRACKER_DB_NAME].franchiseTrueValueRows).toEqual([trueValueRow]);
    expect(backup.databases[TRACKER_DB_NAME].franchiseDesignationRows).toEqual([designationRow]);
    expect(backup.databases[TRACKER_DB_NAME].franchiseSeasonLedgerRows).toEqual([ledgerRow]);
    expect(backup.databases[TRACKER_DB_NAME].franchiseTrustedValueArtifacts).toEqual([trustedValueArtifact]);
    expect(backup.databases[TRACKER_DB_NAME].franchiseAwardsRows).toEqual([awardsRow]);
    expect(backup.databases[TRACKER_DB_NAME].franchiseTrueValueSnapshots).toEqual([trueValueSnapshotRow]);

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
    await expect(
      readRecord("franchiseAwardsRows", [
        awardsRow.franchiseId,
        awardsRow.seasonId,
        awardsRow.statsScopeId,
        awardsRow.category,
      ]),
    ).resolves.toEqual(awardsRow);
    await expect(
      readRecord("franchiseTrueValueSnapshots", [
        trueValueSnapshotRow.franchiseId,
        trueValueSnapshotRow.seasonId,
        trueValueSnapshotRow.statsScopeId,
        trueValueSnapshotRow.playerId,
        trueValueSnapshotRow.checkpoint,
      ]),
    ).resolves.toEqual(trueValueSnapshotRow);
  });

  test("round-trips kbl-franchise-morale snapshots and embedded history", async () => {
    const result = await applyFranchiseMoraleEffect({
      franchiseId: "franchise-d2",
      seasonId: "season-d2",
      statsScopeId: "scope-d2",
      seasonNumber: 1,
      targetType: "player",
      playerId: "morale-player",
      delta: 7,
      reason: "Parity guard morale row.",
      sourceEventId: "morale:parity:one",
      sourceKind: "matrix-auto",
      actorDisplayName: "Master Morale Matrix",
      timestamp: "2026-06-17T00:00:00.000Z",
    });
    expect(result.status).toBe("applied");

    const backup = await exportThenWipeAndRestore();
    const restored = await getFranchiseMoraleSnapshot(
      { franchiseId: "franchise-d2", seasonId: "season-d2", statsScopeId: "scope-d2" },
      "player",
      "morale-player",
    );

    expect(backup.databases[MORALE_DB_NAME].moraleSnapshots).toHaveLength(1);
    expect(restored).toMatchObject({
      franchiseId: "franchise-d2",
      seasonId: "season-d2",
      statsScopeId: "scope-d2",
      playerId: "morale-player",
      currentValue: 57,
      history: [
        expect.objectContaining({
          sourceEventId: "morale:parity:one",
          sourceKind: "matrix-auto",
        }),
      ],
    });
  });
});
