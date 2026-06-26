import 'fake-indexeddb/auto';

import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('../syncEngine', () => ({
  syncEngine: {
    isSuppressed: vi.fn(() => false),
    upsert: vi.fn(),
  },
}));

import {
  FRANCHISE_RELATIONSHIP_EDGES_STORE_NAME,
  STORE_NAME,
  clearFranchiseRelationshipEdgesForTests,
  franchiseRelationshipEdgeId,
  getFranchiseRelationshipEdge,
  getFranchiseRelationshipEdgesByScope,
  initFranchiseRelationshipEdgeDatabase,
  putFranchiseRelationshipEdge,
  resetFranchiseRelationshipEdgesForTests,
  type RelationshipEdgeRow,
} from '../franchiseRelationshipEdgesStorage';
import { FRANCHISE_TRADE_DEMAND_STORE_NAME } from '../franchiseTradeDemandStorage';
import {
  exportAllData,
  KBL_BACKUP_VERSION,
  restoreAllData,
} from '../backupRestore';
import { syncEngine } from '../syncEngine';

const DB_NAME = 'kbl-tracker';

const scope = {
  franchiseId: 'franchise-relationships',
  seasonId: 'franchise-relationships-season-1',
  statsScopeId: 'franchise-relationships-season-1',
};

const legacyV24TrackerStores = [
  'almanacCanonicalPlayers',
  'careerMilestones',
  'commentaryFeedEntries',
  'completedGames',
  'currentGame',
  'eliminationAllTimePlayerStats',
  'eliminationRunFameAggregates',
  'franchiseAllStarRosters',
  'franchiseAwardsRows',
  'franchiseDesignationRows',
  'franchiseFameRecords',
  'franchiseFlashpointDecay',
  'franchiseL10Overlays',
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

function edge(overrides: Partial<RelationshipEdgeRow> = {}): RelationshipEdgeRow {
  const edgeScope = {
    franchiseId: overrides.franchiseId ?? scope.franchiseId,
    seasonId: overrides.seasonId ?? scope.seasonId,
    statsScopeId: overrides.statsScopeId ?? scope.statsScopeId,
  };
  const player1Id = overrides.player1Id ?? 'player-a';
  const player2Id = overrides.player2Id ?? 'player-b';
  const type = overrides.type ?? 'RIVALRY';

  return {
    ...edgeScope,
    id: franchiseRelationshipEdgeId(edgeScope, player1Id, player2Id, type),
    seasonNumber: 1,
    player1Id,
    player2Id,
    type,
    intensity: 0.65,
    potential: false,
    accuracy: 0.9,
    formedAtGameNumber: 12,
    dissolvedAtGameNumber: null,
    createdAt: 1781990400000,
    ...overrides,
  };
}

async function seedLegacyV24TrackerDb(): Promise<{
  currentGameRow: { id: string; gameId: string };
  allStarRosterRow: { id: string; franchiseId: string; seasonId: string; statsScopeId: string };
}> {
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 24);
    request.onerror = () => reject(request.error);
    request.onupgradeneeded = () => {
      const legacyDb = request.result;
      for (const storeName of legacyV24TrackerStores) {
        if (!legacyDb.objectStoreNames.contains(storeName)) {
          legacyDb.createObjectStore(storeName, { keyPath: 'id' });
        }
      }
    };
    request.onsuccess = () => resolve(request.result);
  });

  const currentGameRow = { id: 'current', gameId: 'legacy-v24-game' };
  const allStarRosterRow = {
    id: 'legacy-franchise:legacy-season:legacy-scope:allstar',
    franchiseId: 'legacy-franchise',
    seasonId: 'legacy-season',
    statsScopeId: 'legacy-scope',
  };

  const tx = db.transaction(['currentGame', 'franchiseAllStarRosters'], 'readwrite');
  tx.objectStore('currentGame').put(currentGameRow);
  tx.objectStore('franchiseAllStarRosters').put(allStarRosterRow);
  await transactionToPromise(tx);
  db.close();

  return { currentGameRow, allStarRosterRow };
}

describe('franchise relationship edges storage', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    resetFranchiseRelationshipEdgesForTests();
    await deleteDatabase(DB_NAME);
  });

  afterEach(async () => {
    await clearFranchiseRelationshipEdgesForTests();
    resetFranchiseRelationshipEdgesForTests();
    await deleteDatabase(DB_NAME);
  });

  test('trackerDb migration creates the dark relationship edge store with id keyPath and edge indexes', async () => {
    const db = await initFranchiseRelationshipEdgeDatabase();

    expect(STORE_NAME).toBe(FRANCHISE_RELATIONSHIP_EDGES_STORE_NAME);
    expect(db.objectStoreNames.contains(FRANCHISE_RELATIONSHIP_EDGES_STORE_NAME)).toBe(true);

    const tx = db.transaction(FRANCHISE_RELATIONSHIP_EDGES_STORE_NAME, 'readonly');
    const store = tx.objectStore(FRANCHISE_RELATIONSHIP_EDGES_STORE_NAME);
    expect(store.keyPath).toBe('id');
    expect(Array.from(store.indexNames)).toEqual(['by_pair', 'by_scope']);
    expect(store.index('by_scope').keyPath).toEqual(['franchiseId', 'seasonId', 'statsScopeId']);
    expect(store.index('by_pair').keyPath).toEqual(['player1Id', 'player2Id']);
  });

  test('builds deterministic edge ids and canonicalizes unordered player pairs', () => {
    expect(franchiseRelationshipEdgeId(scope, 'player-b', 'player-a', 'RIVALRY')).toBe(
      'franchise-relationships:franchise-relationships-season-1:franchise-relationships-season-1:player-a:player-b:RIVALRY',
    );
    expect(franchiseRelationshipEdgeId(scope, 'player-a', 'player-b', 'RIVALRY')).toBe(
      franchiseRelationshipEdgeId(scope, 'player-b', 'player-a', 'RIVALRY'),
    );
    expect(franchiseRelationshipEdgeId(scope, 'player-a', 'player-b', 'FRIENDSHIP')).not.toBe(
      franchiseRelationshipEdgeId(scope, 'player-a', 'player-b', 'RIVALRY'),
    );
  });

  test('round-trips an edge row by deterministic id and by scope', async () => {
    const relationshipEdge = edge();

    await putFranchiseRelationshipEdge(relationshipEdge);

    expect(await getFranchiseRelationshipEdge(relationshipEdge.id)).toEqual(relationshipEdge);
    expect(await getFranchiseRelationshipEdgesByScope(scope)).toEqual([relationshipEdge]);
  });

  test('returns empty defaults for unknown or incomplete scopes and ids', async () => {
    expect(await getFranchiseRelationshipEdge('missing-edge')).toBeUndefined();
    expect(await getFranchiseRelationshipEdge('')).toBeUndefined();
    expect(await getFranchiseRelationshipEdgesByScope(scope)).toEqual([]);
    expect(await getFranchiseRelationshipEdgesByScope({ ...scope, statsScopeId: '' })).toEqual([]);
  });

  test('isolates rows by scope and keeps deterministic sort order', async () => {
    const laterSortEdge = edge({
      player1Id: 'player-a',
      player2Id: 'player-c',
      type: 'HISTORY',
      createdAt: 1781990400001,
    });
    const earlierSortEdge = edge({
      player1Id: 'player-a',
      player2Id: 'player-b',
      type: 'FEUD',
      createdAt: 1781990400002,
    });
    const otherScopeEdge = edge({
      franchiseId: 'other-franchise',
      seasonId: 'other-season',
      statsScopeId: 'other-scope',
      player1Id: 'player-a',
      player2Id: 'player-b',
      type: 'FRIENDSHIP',
      createdAt: 1781990400003,
    });

    await putFranchiseRelationshipEdge(laterSortEdge);
    await putFranchiseRelationshipEdge(otherScopeEdge);
    await putFranchiseRelationshipEdge(earlierSortEdge);

    expect(await getFranchiseRelationshipEdgesByScope(scope)).toEqual([earlierSortEdge, laterSortEdge]);
  });

  test('stores the contracted row shape without changing caller-supplied timestamps', async () => {
    const relationshipEdge = edge({
      intensity: 0.25,
      potential: true,
      accuracy: 0.72,
      formedAtGameNumber: null,
      dissolvedAtGameNumber: 33,
      updatedAt: 1781990400123,
    });

    await putFranchiseRelationshipEdge(relationshipEdge);

    expect(await getFranchiseRelationshipEdge(relationshipEdge.id)).toMatchObject({
      id: relationshipEdge.id,
      franchiseId: scope.franchiseId,
      seasonId: scope.seasonId,
      statsScopeId: scope.statsScopeId,
      seasonNumber: 1,
      player1Id: 'player-a',
      player2Id: 'player-b',
      type: 'RIVALRY',
      intensity: 0.25,
      potential: true,
      accuracy: 0.72,
      formedAtGameNumber: null,
      dissolvedAtGameNumber: 33,
      createdAt: 1781990400000,
      updatedAt: 1781990400123,
    });
  });

  test('syncEngine upsert is called on put with the id key', async () => {
    const relationshipEdge = edge();

    await putFranchiseRelationshipEdge(relationshipEdge);

    expect(syncEngine.upsert).toHaveBeenCalledWith(
      DB_NAME,
      FRANCHISE_RELATIONSHIP_EDGES_STORE_NAME,
      relationshipEdge.id,
      relationshipEdge,
    );
  });

  test('relationship edge storage uses trackerDb, caller timestamps, and no production-only imports', () => {
    const source = readFileSync('src/utils/franchiseRelationshipEdgesStorage.ts', 'utf8');

    expect(source).toMatch(/getTrackerDb/);
    expect(source).toMatch(/const DB_NAME = 'kbl-tracker'/);
    expect(source).not.toMatch(/indexedDB\.open|onupgradeneeded/);
    expect(source).not.toMatch(/Date\.now|Math\.random/);
  });

  test('v24 to v26 migration adds relationship edges and trade-demand state without losing prior tracker stores or data', async () => {
    const { currentGameRow, allStarRosterRow } = await seedLegacyV24TrackerDb();
    resetFranchiseRelationshipEdgesForTests();

    const db = await initFranchiseRelationshipEdgeDatabase();

    expect(db.version).toBe(26);
    expect(Array.from(db.objectStoreNames).sort()).toEqual(
      [...legacyV24TrackerStores, FRANCHISE_RELATIONSHIP_EDGES_STORE_NAME, FRANCHISE_TRADE_DEMAND_STORE_NAME].sort(),
    );

    const tx = db.transaction(
      ['currentGame', 'franchiseAllStarRosters', FRANCHISE_RELATIONSHIP_EDGES_STORE_NAME, FRANCHISE_TRADE_DEMAND_STORE_NAME],
      'readonly',
    );
    await expect(requestToPromise(tx.objectStore('currentGame').get('current'))).resolves.toEqual(currentGameRow);
    await expect(
      requestToPromise(tx.objectStore('franchiseAllStarRosters').get(allStarRosterRow.id)),
    ).resolves.toEqual(allStarRosterRow);
    const relationshipEdgeStore = tx.objectStore(FRANCHISE_RELATIONSHIP_EDGES_STORE_NAME);
    expect(relationshipEdgeStore.keyPath).toBe('id');
    expect(Array.from(relationshipEdgeStore.indexNames)).toEqual(['by_pair', 'by_scope']);
    const tradeDemandStore = tx.objectStore(FRANCHISE_TRADE_DEMAND_STORE_NAME);
    expect(tradeDemandStore.keyPath).toEqual(['franchiseId', 'seasonId', 'statsScopeId', 'playerId']);
    expect(Array.from(tradeDemandStore.indexNames)).toEqual(['by_scope']);
    await transactionToPromise(tx);
  });

  test('backup export and restore round-trips relationship edge rows without bumping KBL backup version', async () => {
    const relationshipEdge = edge({ updatedAt: 1781990400123 });
    await putFranchiseRelationshipEdge(relationshipEdge);

    const backup = await exportAllData();

    expect(KBL_BACKUP_VERSION).toBe(2);
    expect(backup.kblBackupVersion).toBe(KBL_BACKUP_VERSION);
    expect(backup.databases[DB_NAME].franchiseRelationshipEdges).toEqual([relationshipEdge]);

    resetFranchiseRelationshipEdgesForTests();
    await deleteDatabase(DB_NAME);
    const result = await restoreAllData(backup);
    expect(result).toMatchObject({ success: true });
    resetFranchiseRelationshipEdgesForTests();

    await expect(getFranchiseRelationshipEdge(relationshipEdge.id)).resolves.toEqual(relationshipEdge);
  });
});
