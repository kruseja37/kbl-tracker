import 'fake-indexeddb/auto';

import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('../syncEngine', () => ({
  syncEngine: {
    isSuppressed: vi.fn(() => false),
    upsert: vi.fn(),
    remove: vi.fn(),
  },
}));

import {
  FRANCHISE_AWARDS_STORE_NAME,
  clearFranchiseAwardsDatabaseForTests,
  getFranchiseAwardRow,
  getFranchiseAwardRowsByScope,
  initFranchiseAwardsDatabase,
  replaceFranchiseAwardRowsForScope,
  resetFranchiseAwardsDatabaseForTests,
  saveFranchiseAwardRows,
  upsertFranchiseAwardRow,
  type FranchiseAwardRow,
} from '../franchiseAwardsStorage';
import { syncEngine } from '../syncEngine';

const DB_NAME = 'kbl-tracker';

const scope = {
  franchiseId: 'franchise-awards',
  seasonId: 'franchise-awards-season-1',
  statsScopeId: 'franchise-awards-season-1',
};

function deleteDatabase(name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => resolve();
  });
}

function row(overrides: Partial<FranchiseAwardRow> = {}): FranchiseAwardRow {
  return {
    ...scope,
    category: 'MVP',
    winnerPlayerId: 'player-mvp',
    candidates: [
      { playerId: 'player-mvp', score: 10, marginToWinner: 0 },
      { playerId: 'player-runner-up', score: 8.5, marginToWinner: 1.5 },
    ],
    goldGloveSplit: null,
    voteWeight: null,
    finalized: false,
    computedAt: '2026-06-17T00:00:00.000Z',
    ...overrides,
  };
}

describe('franchise awards storage', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    resetFranchiseAwardsDatabaseForTests();
    await deleteDatabase(DB_NAME);
  });

  afterEach(async () => {
    await clearFranchiseAwardsDatabaseForTests();
    resetFranchiseAwardsDatabaseForTests();
    await deleteDatabase(DB_NAME);
  });

  test('trackerDb migration creates the dark awards store with by_scope index', async () => {
    const db = await initFranchiseAwardsDatabase();

    expect(db.objectStoreNames.contains(FRANCHISE_AWARDS_STORE_NAME)).toBe(true);

    const tx = db.transaction(FRANCHISE_AWARDS_STORE_NAME, 'readonly');
    expect(Array.from(tx.objectStore(FRANCHISE_AWARDS_STORE_NAME).indexNames)).toEqual(['by_scope']);
  });

  test('round-trips award rows by scope and exact composite key', async () => {
    const mvp = row();
    const cyYoung = row({ category: 'CY_YOUNG', winnerPlayerId: 'player-cy' });
    const otherScope = row({
      franchiseId: 'other-franchise',
      seasonId: 'other-season',
      statsScopeId: 'other-scope',
      category: 'MVP',
      winnerPlayerId: 'other-player',
    });

    await saveFranchiseAwardRows([mvp, cyYoung, otherScope]);

    expect(await getFranchiseAwardRowsByScope(scope)).toEqual([cyYoung, mvp]);
    await expect(getFranchiseAwardRow({ ...scope, category: 'MVP' })).resolves.toEqual(mvp);
    expect(syncEngine.upsert).toHaveBeenCalledWith(
      DB_NAME,
      FRANCHISE_AWARDS_STORE_NAME,
      [mvp.franchiseId, mvp.seasonId, mvp.statsScopeId, mvp.category],
      mvp,
    );
  });

  test('upsert and replace-for-scope overwrite only the requested scope', async () => {
    await upsertFranchiseAwardRow(row({ finalized: false }));
    await upsertFranchiseAwardRow(row({ finalized: true }));
    await upsertFranchiseAwardRow(row({
      franchiseId: 'other-franchise',
      seasonId: 'other-season',
      statsScopeId: 'other-scope',
      category: 'MVP',
      winnerPlayerId: 'other-player',
    }));

    expect(await getFranchiseAwardRowsByScope(scope)).toEqual([
      expect.objectContaining({ category: 'MVP', finalized: true }),
    ]);

    const replacement = row({
      category: 'GOLD_GLOVE',
      winnerPlayerId: 'player-glove',
      goldGloveSplit: { fWar: 3.1, totalWar: 5.4 },
    });
    await replaceFranchiseAwardRowsForScope(scope, [replacement]);

    expect(await getFranchiseAwardRowsByScope(scope)).toEqual([replacement]);
    await expect(getFranchiseAwardRow({ ...scope, category: 'MVP' })).resolves.toBeNull();
  });

  test('awards storage uses trackerDb instead of opening kbl-tracker directly', () => {
    const source = readFileSync('src/utils/franchiseAwardsStorage.ts', 'utf8');

    expect(source).toMatch(/getTrackerDb/);
    expect(source).not.toMatch(/indexedDB\.open|onupgradeneeded/);
  });
});
