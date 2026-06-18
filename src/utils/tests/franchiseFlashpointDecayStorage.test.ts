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
  FRANCHISE_FLASHPOINT_DECAY_STORE_NAME,
  clearFranchiseFlashpointDecayForTests,
  getFranchiseFlashpointDecayRow,
  getFranchiseFlashpointDecayRowsByScope,
  initFranchiseFlashpointDecayDatabase,
  replaceFranchiseFlashpointDecayRowsForScope,
  resetFranchiseFlashpointDecayForTests,
  saveFranchiseFlashpointDecayRows,
  upsertFranchiseFlashpointDecayRow,
  type FranchiseFlashpointDecayRow,
} from '../franchiseFlashpointDecayStorage';
import { syncEngine } from '../syncEngine';

const DB_NAME = 'kbl-tracker';

const scope = {
  franchiseId: 'franchise-flashpoint',
  seasonId: 'franchise-flashpoint-season-1',
  statsScopeId: 'franchise-flashpoint-season-1',
};

function deleteDatabase(name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => resolve();
  });
}

function row(overrides: Partial<FranchiseFlashpointDecayRow> = {}): FranchiseFlashpointDecayRow {
  return {
    ...scope,
    playerId: 'player-flashpoint',
    flashpointKind: 'albatross',
    consecutiveGamesUnresolved: 2,
    accumulatedFanMoraleTax: -1.05,
    lastGameTax: -0.55,
    updatedAtCheckpoint: '2',
    ...overrides,
  };
}

describe('franchise flashpoint-decay storage', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    resetFranchiseFlashpointDecayForTests();
    await deleteDatabase(DB_NAME);
  });

  afterEach(async () => {
    await clearFranchiseFlashpointDecayForTests();
    resetFranchiseFlashpointDecayForTests();
    await deleteDatabase(DB_NAME);
  });

  test('trackerDb migration creates the dark flashpoint store with by_scope index', async () => {
    const db = await initFranchiseFlashpointDecayDatabase();

    expect(db.objectStoreNames.contains(FRANCHISE_FLASHPOINT_DECAY_STORE_NAME)).toBe(true);

    const tx = db.transaction(FRANCHISE_FLASHPOINT_DECAY_STORE_NAME, 'readonly');
    expect(Array.from(tx.objectStore(FRANCHISE_FLASHPOINT_DECAY_STORE_NAME).indexNames)).toEqual(['by_scope']);
  });

  test('round-trips flashpoint rows by scope and exact composite key', async () => {
    const alpha = row({ playerId: 'player-alpha', accumulatedFanMoraleTax: -0.5 });
    const beta = row({ playerId: 'player-beta', flashpointKind: 'trade_demander', accumulatedFanMoraleTax: -1.65 });
    const otherScope = row({
      franchiseId: 'other-franchise',
      seasonId: 'other-season',
      statsScopeId: 'other-scope',
      playerId: 'player-other',
    });

    await saveFranchiseFlashpointDecayRows([beta, alpha, otherScope]);

    expect(await getFranchiseFlashpointDecayRowsByScope(scope)).toEqual([alpha, beta]);
    await expect(getFranchiseFlashpointDecayRow(scope, 'player-alpha')).resolves.toEqual(alpha);
    expect(syncEngine.upsert).toHaveBeenCalledWith(
      DB_NAME,
      FRANCHISE_FLASHPOINT_DECAY_STORE_NAME,
      [alpha.franchiseId, alpha.seasonId, alpha.statsScopeId, alpha.playerId],
      alpha,
    );
  });

  test('upsert and replace-for-scope overwrite only the requested scope', async () => {
    await upsertFranchiseFlashpointDecayRow(row({ accumulatedFanMoraleTax: -0.5 }));
    await upsertFranchiseFlashpointDecayRow(row({ accumulatedFanMoraleTax: -1.05 }));
    await upsertFranchiseFlashpointDecayRow(row({
      franchiseId: 'other-franchise',
      seasonId: 'other-season',
      statsScopeId: 'other-scope',
      playerId: 'player-other',
    }));

    expect(await getFranchiseFlashpointDecayRowsByScope(scope)).toEqual([
      expect.objectContaining({ playerId: 'player-flashpoint', accumulatedFanMoraleTax: -1.05 }),
    ]);

    const replacement = row({
      playerId: 'player-replacement',
      flashpointKind: 'trade_demander',
      consecutiveGamesUnresolved: 5,
      accumulatedFanMoraleTax: -3.5,
    });
    await replaceFranchiseFlashpointDecayRowsForScope(scope, [replacement]);

    expect(await getFranchiseFlashpointDecayRowsByScope(scope)).toEqual([replacement]);
    await expect(getFranchiseFlashpointDecayRow(scope, 'player-flashpoint')).resolves.toBeNull();
    await expect(getFranchiseFlashpointDecayRow({
      franchiseId: 'other-franchise',
      seasonId: 'other-season',
      statsScopeId: 'other-scope',
    }, 'player-other')).resolves.toEqual(expect.objectContaining({ playerId: 'player-other' }));
  });

  test('flashpoint storage uses trackerDb instead of opening kbl-tracker directly', () => {
    const source = readFileSync('src/utils/franchiseFlashpointDecayStorage.ts', 'utf8');

    expect(source).toMatch(/getTrackerDb/);
    expect(source).not.toMatch(/indexedDB\.open|onupgradeneeded/);
  });
});
