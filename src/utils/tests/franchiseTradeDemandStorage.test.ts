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
  FRANCHISE_TRADE_DEMAND_STORE_NAME,
  clearFranchiseTradeDemandForTests,
  deleteFranchiseTradeDemandForScope,
  getFranchiseTradeDemandRow,
  getFranchiseTradeDemandRowsByScope,
  initFranchiseTradeDemandDatabase,
  resetFranchiseTradeDemandForTests,
  saveFranchiseTradeDemandRows,
  upsertFranchiseTradeDemandRow,
  type FranchiseTradeDemandRow,
} from '../franchiseTradeDemandStorage';
import { syncEngine } from '../syncEngine';
import { TRACKER_DB_VERSION } from '../trackerDb';

const DB_NAME = 'kbl-tracker';

const scope = {
  franchiseId: 'franchise-trade-demand',
  seasonId: 'franchise-trade-demand-season-1',
  statsScopeId: 'franchise-trade-demand-season-1',
};

function deleteDatabase(name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => resolve();
  });
}

function row(overrides: Partial<FranchiseTradeDemandRow> = {}): FranchiseTradeDemandRow {
  return {
    ...scope,
    playerId: 'player-trade-demand',
    teamId: 'team-trade-demand',
    status: 'active',
    confirmedAtGameNumber: 12,
    confirmedAtCheckpoint: '12',
    confirmedAtIso: '2026-06-18T00:00:00.000Z',
    ...overrides,
  };
}

describe('franchise trade-demand storage', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    resetFranchiseTradeDemandForTests();
    await deleteDatabase(DB_NAME);
  });

  afterEach(async () => {
    await clearFranchiseTradeDemandForTests();
    resetFranchiseTradeDemandForTests();
    await deleteDatabase(DB_NAME);
  });

  test('trackerDb migration creates the v26 trade-demand store with by_scope index', async () => {
    const db = await initFranchiseTradeDemandDatabase();

    expect(TRACKER_DB_VERSION).toBe(26);
    expect(db.version).toBe(26);
    expect(db.objectStoreNames.contains(FRANCHISE_TRADE_DEMAND_STORE_NAME)).toBe(true);

    const tx = db.transaction(FRANCHISE_TRADE_DEMAND_STORE_NAME, 'readonly');
    expect(Array.from(tx.objectStore(FRANCHISE_TRADE_DEMAND_STORE_NAME).indexNames)).toEqual(['by_scope']);
  });

  test('round-trips trade-demand rows by scope and exact composite key sorted by playerId', async () => {
    const alpha = row({ playerId: 'player-alpha', teamId: 'team-alpha', confirmedAtGameNumber: 4 });
    const beta = row({ playerId: 'player-beta', teamId: 'team-beta', confirmedAtGameNumber: 7 });
    const otherScope = row({
      franchiseId: 'other-franchise',
      seasonId: 'other-season',
      statsScopeId: 'other-scope',
      playerId: 'player-other',
      teamId: 'team-other',
    });

    await saveFranchiseTradeDemandRows([beta, otherScope, alpha]);

    expect(await getFranchiseTradeDemandRowsByScope(scope)).toEqual([alpha, beta]);
    await expect(getFranchiseTradeDemandRow(scope, 'player-alpha')).resolves.toEqual(alpha);
    expect(syncEngine.upsert).toHaveBeenCalledWith(
      DB_NAME,
      FRANCHISE_TRADE_DEMAND_STORE_NAME,
      [alpha.franchiseId, alpha.seasonId, alpha.statsScopeId, alpha.playerId],
      alpha,
    );
  });

  test('upsert and delete-for-scope isolate franchise-season scopes', async () => {
    await upsertFranchiseTradeDemandRow(row({ confirmedAtGameNumber: 4 }));
    await upsertFranchiseTradeDemandRow(row({ confirmedAtGameNumber: 9, confirmedAtCheckpoint: '9' }));
    await upsertFranchiseTradeDemandRow(row({
      franchiseId: 'other-franchise',
      seasonId: 'other-season',
      statsScopeId: 'other-scope',
      playerId: 'player-other',
      teamId: 'team-other',
    }));

    expect(await getFranchiseTradeDemandRowsByScope(scope)).toEqual([
      expect.objectContaining({ playerId: 'player-trade-demand', confirmedAtGameNumber: 9 }),
    ]);

    await deleteFranchiseTradeDemandForScope(scope);
    await expect(getFranchiseTradeDemandRowsByScope(scope)).resolves.toEqual([]);
    await expect(getFranchiseTradeDemandRow({
      franchiseId: 'other-franchise',
      seasonId: 'other-season',
      statsScopeId: 'other-scope',
    }, 'player-other')).resolves.toEqual(expect.objectContaining({ playerId: 'player-other' }));
  });

  test('trade-demand storage uses trackerDb instead of opening kbl-tracker directly', () => {
    const source = readFileSync('src/utils/franchiseTradeDemandStorage.ts', 'utf8');

    expect(source).toMatch(/getTrackerDb/);
    expect(source).not.toMatch(/indexedDB\.open|onupgradeneeded/);
    expect(source).not.toMatch(/Date\.now|Math\.random/);
  });
});
