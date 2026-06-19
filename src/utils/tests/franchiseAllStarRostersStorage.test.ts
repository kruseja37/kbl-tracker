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
  FRANCHISE_ALL_STAR_ROSTERS_STORE_NAME,
  clearFranchiseAllStarRostersForTests,
  franchiseAllStarRosterId,
  getFranchiseAllStarRoster,
  getFranchiseAllStarRostersByScope,
  initFranchiseAllStarRosterDatabase,
  putFranchiseAllStarRoster,
  resetFranchiseAllStarRostersForTests,
  type FranchiseAllStarRosterRow,
} from '../franchiseAllStarRostersStorage';
import { syncEngine } from '../syncEngine';

const DB_NAME = 'kbl-tracker';

const scope = {
  franchiseId: 'franchise-allstar',
  seasonId: 'franchise-allstar-season-1',
  statsScopeId: 'franchise-allstar-season-1',
};

function deleteDatabase(name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => resolve();
  });
}

function row(overrides: Partial<FranchiseAllStarRosterRow> = {}): FranchiseAllStarRosterRow {
  const rowScope = {
    franchiseId: overrides.franchiseId ?? scope.franchiseId,
    seasonId: overrides.seasonId ?? scope.seasonId,
    statsScopeId: overrides.statsScopeId ?? scope.statsScopeId,
  };
  return {
    ...rowScope,
    id: franchiseAllStarRosterId(rowScope),
    seasonNumber: 1,
    selections: [
      {
        playerId: 'player-starter',
        teamId: 'team-allstar',
        position: 'SS',
        role: 'starter',
        selectionScore: 0.92,
      },
      {
        playerId: 'player-reserve',
        teamId: 'team-allstar',
        position: 'RP',
        role: 'reserve',
      },
    ],
    lockedAtGameNumber: null,
    locked: false,
    createdAt: 1781990400000,
    ...overrides,
  };
}

describe('franchise All-Star roster storage', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    resetFranchiseAllStarRostersForTests();
    await deleteDatabase(DB_NAME);
  });

  afterEach(async () => {
    await clearFranchiseAllStarRostersForTests();
    resetFranchiseAllStarRostersForTests();
    await deleteDatabase(DB_NAME);
  });

  test('trackerDb migration creates the dark All-Star roster store with id keyPath and scope index', async () => {
    const db = await initFranchiseAllStarRosterDatabase();

    expect(db.objectStoreNames.contains(FRANCHISE_ALL_STAR_ROSTERS_STORE_NAME)).toBe(true);

    const tx = db.transaction(FRANCHISE_ALL_STAR_ROSTERS_STORE_NAME, 'readonly');
    const store = tx.objectStore(FRANCHISE_ALL_STAR_ROSTERS_STORE_NAME);
    expect(store.keyPath).toBe('id');
    expect(Array.from(store.indexNames)).toEqual(['by_scope']);
    expect(store.index('by_scope').keyPath).toEqual(['franchiseId', 'seasonId', 'statsScopeId']);
  });

  test('builds one deterministic roster id per franchise season scope', () => {
    expect(franchiseAllStarRosterId(scope)).toBe(
      'franchise-allstar:franchise-allstar-season-1:franchise-allstar-season-1:allstar',
    );
  });

  test('round-trips a roster row by deterministic id and by scope', async () => {
    const roster = row();

    await putFranchiseAllStarRoster(roster);

    expect(await getFranchiseAllStarRoster(scope)).toEqual(roster);
    expect(await getFranchiseAllStarRostersByScope(scope)).toEqual([roster]);
  });

  test('returns empty defaults for unknown or incomplete scopes', async () => {
    expect(await getFranchiseAllStarRoster(scope)).toBeUndefined();
    expect(await getFranchiseAllStarRostersByScope(scope)).toEqual([]);
    expect(await getFranchiseAllStarRoster({ ...scope, statsScopeId: '' })).toBeUndefined();
    expect(await getFranchiseAllStarRostersByScope({ ...scope, statsScopeId: '' })).toEqual([]);
  });

  test('isolates rows by scope and keeps deterministic sort order', async () => {
    const matching = row({ seasonNumber: 2, createdAt: 1781990400001 });
    const other = row({
      franchiseId: 'other-franchise',
      seasonId: 'other-season',
      statsScopeId: 'other-scope',
      seasonNumber: 1,
      createdAt: 1781990400002,
    });

    await putFranchiseAllStarRoster(other);
    await putFranchiseAllStarRoster(matching);

    expect(await getFranchiseAllStarRoster(scope)).toEqual(matching);
    expect(await getFranchiseAllStarRostersByScope(scope)).toEqual([matching]);
  });

  test('stores the contracted row shape without changing caller-supplied timestamps', async () => {
    const roster = row({
      locked: true,
      lockedAtGameNumber: 60,
      updatedAt: 1781990400123,
    });

    await putFranchiseAllStarRoster(roster);

    expect(await getFranchiseAllStarRoster(scope)).toMatchObject({
      id: roster.id,
      franchiseId: scope.franchiseId,
      seasonId: scope.seasonId,
      statsScopeId: scope.statsScopeId,
      seasonNumber: 1,
      selections: roster.selections,
      lockedAtGameNumber: 60,
      locked: true,
      createdAt: 1781990400000,
      updatedAt: 1781990400123,
    });
  });

  test('syncEngine upsert is called on put with the id key', async () => {
    const roster = row();

    await putFranchiseAllStarRoster(roster);

    expect(syncEngine.upsert).toHaveBeenCalledWith(
      DB_NAME,
      FRANCHISE_ALL_STAR_ROSTERS_STORE_NAME,
      roster.id,
      roster,
    );
  });

  test('All-Star roster storage uses trackerDb, caller timestamps, and no production-only imports', () => {
    const source = readFileSync('src/utils/franchiseAllStarRostersStorage.ts', 'utf8');

    expect(source).toMatch(/getTrackerDb/);
    expect(source).toMatch(/const DB_NAME = 'kbl-tracker'/);
    expect(source).not.toMatch(/indexedDB\.open|onupgradeneeded/);
    expect(source).not.toMatch(/Date\.now|Math\.random/);
  });
});
