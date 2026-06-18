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
  'franchiseSeasonLedgerRows',
  'franchiseSeasonSummaries',
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

    expect(TRACKER_DB_VERSION).toBe(20);
    expect(db.name).toBe(DB_NAME);
    expect(db.version).toBe(TRACKER_DB_VERSION);
    expect(Array.from(db.objectStoreNames).sort()).toEqual(expectedTrackerStores);

    const tx = db.transaction(FRANCHISE_SEASON_LEDGER_STORE_NAME, 'readonly');
    expect(Array.from(tx.objectStore(FRANCHISE_SEASON_LEDGER_STORE_NAME).indexNames)).toEqual(['by_scope']);
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
