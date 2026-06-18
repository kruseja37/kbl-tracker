import 'fake-indexeddb/auto';

import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import {
  FRANCHISE_SEASON_LEDGER_CALCULATION_VERSION,
  FRANCHISE_SEASON_LEDGER_STORE_NAME,
  clearFranchiseSeasonLedgerDatabaseForTests,
  getFranchiseSeasonLedgerRow,
  getFranchiseSeasonLedgerRows,
  initFranchiseSeasonLedgerDatabase,
  replaceFranchiseSeasonLedgerRowsForScope,
  resetFranchiseSeasonLedgerDatabaseForTests,
  saveFranchiseSeasonLedgerRows,
  upsertFranchiseSeasonLedgerRow,
} from '../franchiseSeasonLedgerStorage';
import { TRACKER_DB_VERSION } from '../trackerDb';

const DB_NAME = 'kbl-tracker';

const scope = {
  franchiseId: 'franchise-ledger',
  seasonId: 'franchise-ledger-season-1',
  statsScopeId: 'franchise-ledger-season-1',
};

const expectedTrackerStores = [
  'almanacCanonicalPlayers',
  'careerMilestones',
  'commentaryFeedEntries',
  'completedGames',
  'currentGame',
  'eliminationAllTimePlayerStats',
  'eliminationRunFameAggregates',
  'franchiseAwardsRows',
  'franchiseDesignationRows',
  'franchiseFameRecords',
  'franchiseFlashpointDecay',
  'franchiseRatingsOverlays',
  'franchiseSeasonLedgerRows',
  'franchiseSeasonSummaries',
  'franchiseTraitOverlays',
  'franchiseTrueValueRows',
  'franchiseTrueValueSnapshots',
  'franchiseTrustedValueArtifacts',
  'gameStories',
  'llmUsageLog',
  'mojoFitnessSnapshots',
  'narrativeContext',
  'pitcherGameStats',
  'playerCareerBatting',
  'playerCareerFielding',
  'playerCareerPitching',
  'playerGameStats',
  'playerSeasonBatting',
  'playerSeasonFielding',
  'playerSeasonPitching',
  'reporterAlmanacEntries',
  'reporterLegacySummaryJobs',
  'reporterPlayerAlmanacCaches',
  'reporterTeamAlmanacCaches',
  'reporters',
  'rivalryScores',
  'rosterSnapshots',
  'seasonEmissionConfig',
  'seasonMetadata',
  'seasonNewsItems',
  'userPreferences',
];

function deleteDatabase(name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => resolve();
  });
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transactionToPromise(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

async function seedLegacyV21TrackerDb(): Promise<{
  currentGameRow: { id: string; gameId: string };
  flashpointRow: {
    franchiseId: string;
    seasonId: string;
    statsScopeId: string;
    playerId: string;
    flashpointKind: string;
    consecutiveGamesUnresolved: number;
    accumulatedFanMoraleTax: number;
    lastGameTax: number;
    updatedAtCheckpoint: string;
  };
  ratingsOverlayRow: {
    id: string;
    franchiseId: string;
    seasonId: string;
    statsScopeId: string;
    playerId: string;
    ratingKey: string;
    delta: number;
    kind: string;
    expiresAtGameNumber: number | null;
    confirmationStatus: string;
    source: string;
    sourceEventId: string;
    createdAtGameNumber: number;
    createdAt: string;
  };
}> {
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 21);
    request.onerror = () => reject(request.error);
    request.onupgradeneeded = () => {
      const legacyDb = request.result;
      if (!legacyDb.objectStoreNames.contains('currentGame')) {
        legacyDb.createObjectStore('currentGame', { keyPath: 'id' });
      }
      if (!legacyDb.objectStoreNames.contains('franchiseFlashpointDecay')) {
        const flashpointStore = legacyDb.createObjectStore('franchiseFlashpointDecay', {
          keyPath: ['franchiseId', 'seasonId', 'statsScopeId', 'playerId'],
        });
        flashpointStore.createIndex('by_scope', ['franchiseId', 'seasonId', 'statsScopeId'], {
          unique: false,
        });
      }
      if (!legacyDb.objectStoreNames.contains('franchiseRatingsOverlays')) {
        const ratingsOverlayStore = legacyDb.createObjectStore('franchiseRatingsOverlays', {
          keyPath: 'id',
        });
        ratingsOverlayStore.createIndex('by_scope', ['franchiseId', 'seasonId', 'statsScopeId'], {
          unique: false,
        });
        ratingsOverlayStore.createIndex('by_player', ['franchiseId', 'seasonId', 'statsScopeId', 'playerId'], {
          unique: false,
        });
      }
    };
    request.onsuccess = () => resolve(request.result);
  });

  const currentGameRow = { id: 'current', gameId: 'legacy-v20-game' };
  const flashpointRow = {
    franchiseId: 'legacy-franchise',
    seasonId: 'legacy-season',
    statsScopeId: 'legacy-scope',
    playerId: 'legacy-player',
    flashpointKind: 'albatross',
    consecutiveGamesUnresolved: 2,
    accumulatedFanMoraleTax: -1.1,
    lastGameTax: -0.6,
    updatedAtCheckpoint: '2',
  };
  const ratingsOverlayRow = {
    id: 'legacy-franchise:legacy-season:legacy-scope:legacy-player:power:legacy-ratings',
    franchiseId: 'legacy-franchise',
    seasonId: 'legacy-season',
    statsScopeId: 'legacy-scope',
    playerId: 'legacy-player',
    ratingKey: 'power',
    delta: 2,
    kind: 'permanent',
    expiresAtGameNumber: null,
    confirmationStatus: 'pending',
    source: 'legacy-ratings',
    sourceEventId: 'legacy-ratings',
    createdAtGameNumber: 2,
    createdAt: '2026-06-17T00:00:00.000Z',
  };

  const tx = db.transaction(['currentGame', 'franchiseFlashpointDecay', 'franchiseRatingsOverlays'], 'readwrite');
  tx.objectStore('currentGame').put(currentGameRow);
  tx.objectStore('franchiseFlashpointDecay').put(flashpointRow);
  tx.objectStore('franchiseRatingsOverlays').put(ratingsOverlayRow);
  await transactionToPromise(tx);
  db.close();

  return { currentGameRow, flashpointRow, ratingsOverlayRow };
}

function row(overrides: Record<string, unknown> = {}) {
  return {
    ...scope,
    playerId: 'player-ledger',
    salary: 10_000,
    status: 'active' as const,
    capCharge: 10_000,
    calculationVersion: FRANCHISE_SEASON_LEDGER_CALCULATION_VERSION,
    computedAt: '2026-06-14T00:00:00.000Z',
    ...overrides,
  };
}

describe('franchise season salary ledger storage', () => {
  beforeEach(async () => {
    resetFranchiseSeasonLedgerDatabaseForTests();
    await deleteDatabase(DB_NAME);
  });

  afterEach(async () => {
    await clearFranchiseSeasonLedgerDatabaseForTests();
    resetFranchiseSeasonLedgerDatabaseForTests();
    await deleteDatabase(DB_NAME);
  });

  test('trackerDb migration creates the ledger store and preserves every prior tracker store', async () => {
    const db = await initFranchiseSeasonLedgerDatabase();

    expect(TRACKER_DB_VERSION).toBe(22);
    expect(db.name).toBe(DB_NAME);
    expect(db.version).toBe(TRACKER_DB_VERSION);
    expect(Array.from(db.objectStoreNames).sort()).toEqual(expectedTrackerStores);

    const tx = db.transaction(FRANCHISE_SEASON_LEDGER_STORE_NAME, 'readonly');
    expect(Array.from(tx.objectStore(FRANCHISE_SEASON_LEDGER_STORE_NAME).indexNames)).toEqual(['by_scope']);
  });

  test('v21 to v22 migration adds trait overlays without losing prior stores or data', async () => {
    const { currentGameRow, flashpointRow, ratingsOverlayRow } = await seedLegacyV21TrackerDb();
    resetFranchiseSeasonLedgerDatabaseForTests();

    const db = await initFranchiseSeasonLedgerDatabase();

    expect(db.version).toBe(22);
    expect(Array.from(db.objectStoreNames).sort()).toEqual(expectedTrackerStores);

    const tx = db.transaction(
      ['currentGame', 'franchiseFlashpointDecay', 'franchiseRatingsOverlays', 'franchiseTraitOverlays'],
      'readonly',
    );
    await expect(requestToPromise(tx.objectStore('currentGame').get('current'))).resolves.toEqual(currentGameRow);
    await expect(
      requestToPromise(tx.objectStore('franchiseFlashpointDecay').get([
        flashpointRow.franchiseId,
        flashpointRow.seasonId,
        flashpointRow.statsScopeId,
        flashpointRow.playerId,
      ])),
    ).resolves.toEqual(flashpointRow);
    const ratingsOverlayStore = tx.objectStore('franchiseRatingsOverlays');
    expect(ratingsOverlayStore.keyPath).toBe('id');
    expect(Array.from(ratingsOverlayStore.indexNames)).toEqual(['by_player', 'by_scope']);
    await expect(requestToPromise(ratingsOverlayStore.get(ratingsOverlayRow.id))).resolves.toEqual(ratingsOverlayRow);
    const traitOverlayStore = tx.objectStore('franchiseTraitOverlays');
    expect(traitOverlayStore.keyPath).toBe('id');
    expect(Array.from(traitOverlayStore.indexNames)).toEqual(['by_player', 'by_scope']);
    await transactionToPromise(tx);
  });

  test('round-trips and replaces season-scoped ledger rows', async () => {
    await saveFranchiseSeasonLedgerRows([
      row({ playerId: 'active', salary: 10_000, status: 'active', capCharge: 10_000 }),
      row({ playerId: 'dead', salary: 10_000, status: 'deadMoney', capCharge: 7_500 }),
      row({
        franchiseId: 'other-franchise',
        seasonId: 'other-franchise-season-1',
        statsScopeId: 'other-franchise-season-1',
        playerId: 'other',
      }),
    ]);

    expect(await getFranchiseSeasonLedgerRows(scope)).toEqual([
      expect.objectContaining({ playerId: 'active', status: 'active', capCharge: 10_000 }),
      expect.objectContaining({ playerId: 'dead', status: 'deadMoney', capCharge: 7_500 }),
    ]);
    await expect(getFranchiseSeasonLedgerRow({ ...scope, playerId: 'active' }))
      .resolves.toEqual(expect.objectContaining({ playerId: 'active', salary: 10_000 }));

    await replaceFranchiseSeasonLedgerRowsForScope(scope, [
      row({ playerId: 'replacement', salary: 20_000, status: 'unrostered', capCharge: 0 }),
    ]);
    expect(await getFranchiseSeasonLedgerRows(scope)).toEqual([
      expect.objectContaining({ playerId: 'replacement', status: 'unrostered', capCharge: 0 }),
    ]);
  });

  test('upsert-one overwrites the same player row without stacking transaction charges', async () => {
    await upsertFranchiseSeasonLedgerRow(row({ status: 'deadMoney', capCharge: 7_500 }));
    await upsertFranchiseSeasonLedgerRow(row({ status: 'active', capCharge: 10_000 }));

    expect(await getFranchiseSeasonLedgerRows(scope)).toEqual([
      expect.objectContaining({ playerId: 'player-ledger', status: 'active', capCharge: 10_000 }),
    ]);
  });

  test('ledger storage uses trackerDb instead of opening kbl-tracker directly', () => {
    const source = readFileSync('src/utils/franchiseSeasonLedgerStorage.ts', 'utf8');

    expect(source).toMatch(/getTrackerDb/);
    expect(source).not.toMatch(/indexedDB\.open|DB_NAME\s*=\s*['"]kbl-tracker['"]/);
  });
});
