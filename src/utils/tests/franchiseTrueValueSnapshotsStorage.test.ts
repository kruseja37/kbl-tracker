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
  FRANCHISE_TRUE_VALUE_SNAPSHOTS_STORE_NAME,
  clearFranchiseTrueValueSnapshotsDatabaseForTests,
  getFranchiseTrueValueSnapshotRow,
  getFranchiseTrueValueSnapshotRowsByScope,
  initFranchiseTrueValueSnapshotsDatabase,
  replaceFranchiseTrueValueSnapshotRowsForScope,
  resetFranchiseTrueValueSnapshotsDatabaseForTests,
  saveFranchiseTrueValueSnapshotRows,
  upsertFranchiseTrueValueSnapshotRow,
  type FranchiseTrueValueSnapshotRow,
} from '../franchiseTrueValueSnapshotsStorage';
import { syncEngine } from '../syncEngine';

const DB_NAME = 'kbl-tracker';

const scope = {
  franchiseId: 'franchise-tv-snapshots',
  seasonId: 'franchise-tv-snapshots-season-1',
  statsScopeId: 'franchise-tv-snapshots-season-1',
};

function deleteDatabase(name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => resolve();
  });
}

function row(overrides: Partial<FranchiseTrueValueSnapshotRow> = {}): FranchiseTrueValueSnapshotRow {
  return {
    ...scope,
    playerId: 'player-tv',
    checkpoint: 1,
    trueValue: 9.25,
    valueDelta: 2.75,
    warPercentile: 0.71,
    computedAt: '2026-06-17T00:00:00.000Z',
    ...overrides,
  };
}

describe('franchise True Value snapshot storage', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    resetFranchiseTrueValueSnapshotsDatabaseForTests();
    await deleteDatabase(DB_NAME);
  });

  afterEach(async () => {
    await clearFranchiseTrueValueSnapshotsDatabaseForTests();
    resetFranchiseTrueValueSnapshotsDatabaseForTests();
    await deleteDatabase(DB_NAME);
  });

  test('trackerDb migration creates the dark snapshot store with by_scope index', async () => {
    const db = await initFranchiseTrueValueSnapshotsDatabase();

    expect(db.objectStoreNames.contains(FRANCHISE_TRUE_VALUE_SNAPSHOTS_STORE_NAME)).toBe(true);

    const tx = db.transaction(FRANCHISE_TRUE_VALUE_SNAPSHOTS_STORE_NAME, 'readonly');
    expect(Array.from(tx.objectStore(FRANCHISE_TRUE_VALUE_SNAPSHOTS_STORE_NAME).indexNames)).toEqual(['by_scope']);
  });

  test('round-trips snapshot rows by scope and exact checkpoint composite key', async () => {
    const gameOne = row();
    const gameTwo = row({ checkpoint: 2, trueValue: 10.5, valueDelta: 4 });
    const otherScope = row({
      franchiseId: 'other-franchise',
      seasonId: 'other-season',
      statsScopeId: 'other-scope',
      playerId: 'other-player',
      checkpoint: 1,
    });

    await saveFranchiseTrueValueSnapshotRows([gameTwo, otherScope, gameOne]);

    expect(await getFranchiseTrueValueSnapshotRowsByScope(scope)).toEqual([gameOne, gameTwo]);
    await expect(
      getFranchiseTrueValueSnapshotRow({ ...scope, playerId: 'player-tv', checkpoint: 2 }),
    ).resolves.toEqual(gameTwo);
    expect(syncEngine.upsert).toHaveBeenCalledWith(
      DB_NAME,
      FRANCHISE_TRUE_VALUE_SNAPSHOTS_STORE_NAME,
      [gameOne.franchiseId, gameOne.seasonId, gameOne.statsScopeId, gameOne.playerId, gameOne.checkpoint],
      gameOne,
    );
  });

  test('upsert and replace-for-scope overwrite only the requested scope', async () => {
    await upsertFranchiseTrueValueSnapshotRow(row({ trueValue: 8 }));
    await upsertFranchiseTrueValueSnapshotRow(row({ trueValue: 9.25 }));
    await upsertFranchiseTrueValueSnapshotRow(row({
      franchiseId: 'other-franchise',
      seasonId: 'other-season',
      statsScopeId: 'other-scope',
      playerId: 'other-player',
      checkpoint: 1,
    }));

    expect(await getFranchiseTrueValueSnapshotRowsByScope(scope)).toEqual([
      expect.objectContaining({ playerId: 'player-tv', checkpoint: 1, trueValue: 9.25 }),
    ]);

    const replacement = row({
      playerId: 'player-replacement',
      checkpoint: 3,
      trueValue: 11,
      valueDelta: 5,
      warPercentile: 0.9,
    });
    await replaceFranchiseTrueValueSnapshotRowsForScope(scope, [replacement]);

    expect(await getFranchiseTrueValueSnapshotRowsByScope(scope)).toEqual([replacement]);
    await expect(
      getFranchiseTrueValueSnapshotRow({ ...scope, playerId: 'player-tv', checkpoint: 1 }),
    ).resolves.toBeNull();
  });

  test('snapshot storage uses trackerDb instead of opening kbl-tracker directly', () => {
    const source = readFileSync('src/utils/franchiseTrueValueSnapshotsStorage.ts', 'utf8');

    expect(source).toMatch(/getTrackerDb/);
    expect(source).not.toMatch(/indexedDB\.open|onupgradeneeded/);
  });
});
