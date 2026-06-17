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
  FRANCHISE_FAME_RECORDS_STORE_NAME,
  clearFranchiseFameRecordsForTests,
  getFranchiseFameRecord,
  getFranchiseFameRecordRowsByScope,
  initFranchiseFameRecordsDatabase,
  replaceFranchiseFameRecordRowsForScope,
  resetFranchiseFameRecordsForTests,
  saveFranchiseFameRecordRows,
  upsertFranchiseFameRecordRow,
  type FranchiseFameRecordRow,
} from '../franchiseFameRecordsStorage';
import { syncEngine } from '../syncEngine';

const DB_NAME = 'kbl-tracker';

const scope = {
  franchiseId: 'franchise-fame',
  seasonId: 'franchise-fame-season-1',
  statsScopeId: 'franchise-fame-season-1',
};

function deleteDatabase(name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => resolve();
  });
}

function row(overrides: Partial<FranchiseFameRecordRow> = {}): FranchiseFameRecordRow {
  return {
    ...scope,
    playerId: 'player-fame',
    heat: 3.25,
    reachFloor: 2,
    wasNegative: false,
    channelTotal: 8.5,
    channelByChannel: {
      wpa_spine: 4,
      iconic_event: 2,
      status: 1,
      defensive: 1,
      role_player: 0.5,
    },
    defensiveFame: 1,
    rolePlayerFame: 0.5,
    updatedAtCheckpoint: '2026-06-17T00:00:00.000Z',
    ...overrides,
  };
}

describe('franchise fame records storage', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    resetFranchiseFameRecordsForTests();
    await deleteDatabase(DB_NAME);
  });

  afterEach(async () => {
    await clearFranchiseFameRecordsForTests();
    resetFranchiseFameRecordsForTests();
    await deleteDatabase(DB_NAME);
  });

  test('trackerDb migration creates the dark fame records store with by_scope index', async () => {
    const db = await initFranchiseFameRecordsDatabase();

    expect(db.objectStoreNames.contains(FRANCHISE_FAME_RECORDS_STORE_NAME)).toBe(true);

    const tx = db.transaction(FRANCHISE_FAME_RECORDS_STORE_NAME, 'readonly');
    expect(Array.from(tx.objectStore(FRANCHISE_FAME_RECORDS_STORE_NAME).indexNames)).toEqual(['by_scope']);
  });

  test('round-trips fame records by scope and exact composite key', async () => {
    const alpha = row({ playerId: 'player-alpha', heat: 6.25 });
    const beta = row({ playerId: 'player-beta', heat: -2.5, wasNegative: true });
    const otherScope = row({
      franchiseId: 'other-franchise',
      seasonId: 'other-season',
      statsScopeId: 'other-scope',
      playerId: 'player-other',
    });

    await saveFranchiseFameRecordRows([beta, alpha, otherScope]);

    expect(await getFranchiseFameRecordRowsByScope(scope)).toEqual([alpha, beta]);
    await expect(getFranchiseFameRecord(scope, 'player-alpha')).resolves.toEqual(alpha);
    expect(syncEngine.upsert).toHaveBeenCalledWith(
      DB_NAME,
      FRANCHISE_FAME_RECORDS_STORE_NAME,
      [alpha.franchiseId, alpha.seasonId, alpha.statsScopeId, alpha.playerId],
      alpha,
    );
  });

  test('upsert and replace-for-scope overwrite only the requested scope', async () => {
    await upsertFranchiseFameRecordRow(row({ heat: 1 }));
    await upsertFranchiseFameRecordRow(row({ heat: 2 }));
    await upsertFranchiseFameRecordRow(row({
      franchiseId: 'other-franchise',
      seasonId: 'other-season',
      statsScopeId: 'other-scope',
      playerId: 'player-other',
    }));

    expect(await getFranchiseFameRecordRowsByScope(scope)).toEqual([
      expect.objectContaining({ playerId: 'player-fame', heat: 2 }),
    ]);

    const replacement = row({
      playerId: 'player-replacement',
      heat: 9.75,
      reachFloor: 4,
      channelTotal: 12,
    });
    await replaceFranchiseFameRecordRowsForScope(scope, [replacement]);

    expect(await getFranchiseFameRecordRowsByScope(scope)).toEqual([replacement]);
    await expect(getFranchiseFameRecord(scope, 'player-fame')).resolves.toBeNull();
    await expect(getFranchiseFameRecord({
      franchiseId: 'other-franchise',
      seasonId: 'other-season',
      statsScopeId: 'other-scope',
    }, 'player-other')).resolves.toEqual(expect.objectContaining({ playerId: 'player-other' }));
  });

  test('fame records storage uses trackerDb instead of opening kbl-tracker directly', () => {
    const source = readFileSync('src/utils/franchiseFameRecordsStorage.ts', 'utf8');

    expect(source).toMatch(/getTrackerDb/);
    expect(source).not.toMatch(/indexedDB\.open|onupgradeneeded/);
  });
});
