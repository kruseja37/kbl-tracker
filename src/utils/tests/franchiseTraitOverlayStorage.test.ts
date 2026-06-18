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
  FRANCHISE_TRAIT_OVERLAY_STORE_NAME,
  clearFranchiseTraitOverlaysForTests,
  deleteFranchiseTraitOverlay,
  getFranchiseTraitOverlaysByPlayer,
  getFranchiseTraitOverlaysByScope,
  initFranchiseTraitOverlayDatabase,
  putFranchiseTraitOverlay,
  resetFranchiseTraitOverlaysForTests,
  type FranchiseTraitOverlayRow,
} from '../franchiseTraitOverlayStorage';
import { syncEngine } from '../syncEngine';

const DB_NAME = 'kbl-tracker';

const scope = {
  franchiseId: 'franchise-traits',
  seasonId: 'franchise-traits-season-1',
  statsScopeId: 'franchise-traits-season-1',
};

function deleteDatabase(name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => resolve();
  });
}

function row(overrides: Partial<FranchiseTraitOverlayRow> = {}): FranchiseTraitOverlayRow {
  const playerId = overrides.playerId ?? 'player-traits';
  const traitName = overrides.traitName ?? 'Clutch';
  const sourceEventId = overrides.sourceEventId ?? 'event-traits-1';
  return {
    ...scope,
    id: `${overrides.franchiseId ?? scope.franchiseId}:${overrides.seasonId ?? scope.seasonId}:${overrides.statsScopeId ?? scope.statsScopeId}:${playerId}:${traitName}:${sourceEventId}`,
    playerId,
    valence: 'gain',
    traitName,
    displacesTraitName: null,
    realityPercentile: 0.86,
    probability: 0.78,
    confirmationStatus: 'pending',
    applied: false,
    source: 'trait_acquisition',
    sourceEventId,
    createdAtGameNumber: 12,
    createdAt: '2026-06-18T00:00:00.000Z',
    ...overrides,
  };
}

describe('franchise trait overlay storage', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    resetFranchiseTraitOverlaysForTests();
    await deleteDatabase(DB_NAME);
  });

  afterEach(async () => {
    await clearFranchiseTraitOverlaysForTests();
    resetFranchiseTraitOverlaysForTests();
    await deleteDatabase(DB_NAME);
  });

  test('trackerDb migration creates the dark trait overlay store with id keyPath and scope/player indexes', async () => {
    const db = await initFranchiseTraitOverlayDatabase();

    expect(db.objectStoreNames.contains(FRANCHISE_TRAIT_OVERLAY_STORE_NAME)).toBe(true);

    const tx = db.transaction(FRANCHISE_TRAIT_OVERLAY_STORE_NAME, 'readonly');
    const store = tx.objectStore(FRANCHISE_TRAIT_OVERLAY_STORE_NAME);
    expect(store.keyPath).toBe('id');
    expect(Array.from(store.indexNames)).toEqual(['by_player', 'by_scope']);
    expect(store.index('by_scope').keyPath).toEqual(['franchiseId', 'seasonId', 'statsScopeId']);
    expect(store.index('by_player').keyPath).toEqual([
      'franchiseId',
      'seasonId',
      'statsScopeId',
      'playerId',
    ]);
  });

  test('round-trips gain and lose overlays by player', async () => {
    const gain = row({
      traitName: 'Clutch',
      displacesTraitName: 'Choker',
      sourceEventId: 'event-gain',
      createdAt: '2026-06-18T00:01:00.000Z',
    });
    const lose = row({
      valence: 'lose',
      traitName: 'Bad Jumps',
      displacesTraitName: null,
      realityPercentile: 0.12,
      probability: 0.29,
      confirmationStatus: 'confirmed',
      applied: true,
      sourceEventId: 'event-lose',
      createdAtGameNumber: 13,
      createdAt: '2026-06-18T00:02:00.000Z',
    });

    await putFranchiseTraitOverlay(lose);
    await putFranchiseTraitOverlay(gain);

    expect(await getFranchiseTraitOverlaysByPlayer(scope, 'player-traits')).toEqual([
      lose,
      gain,
    ]);
  });

  test('stores multiple overlays per player under distinct ids with deterministic trait sort', async () => {
    const stealerLater = row({ traitName: 'Stealer', sourceEventId: 'event-stealer-2' });
    const clutch = row({ traitName: 'Clutch', sourceEventId: 'event-clutch' });
    const stealerEarlier = row({ traitName: 'Stealer', sourceEventId: 'event-stealer-1' });

    await putFranchiseTraitOverlay(stealerLater);
    await putFranchiseTraitOverlay(clutch);
    await putFranchiseTraitOverlay(stealerEarlier);

    expect(await getFranchiseTraitOverlaysByPlayer(scope, 'player-traits')).toEqual([
      clutch,
      stealerEarlier,
      stealerLater,
    ]);
  });

  test('isolates overlays by scope and player', async () => {
    const matching = row({ playerId: 'player-alpha', traitName: 'Clutch', sourceEventId: 'event-alpha' });
    const otherPlayer = row({ playerId: 'player-beta', traitName: 'Clutch', sourceEventId: 'event-beta' });
    const otherScope = row({
      franchiseId: 'other-franchise',
      seasonId: 'other-season',
      statsScopeId: 'other-scope',
      playerId: 'player-alpha',
      traitName: 'Clutch',
      sourceEventId: 'event-other-scope',
    });

    await putFranchiseTraitOverlay(matching);
    await putFranchiseTraitOverlay(otherPlayer);
    await putFranchiseTraitOverlay(otherScope);

    expect(await getFranchiseTraitOverlaysByPlayer(scope, 'player-alpha')).toEqual([matching]);
  });

  test('returns all overlays in a scope across players and deletes by id', async () => {
    const alpha = row({ playerId: 'player-alpha', traitName: 'Stealer', sourceEventId: 'event-alpha' });
    const beta = row({ playerId: 'player-beta', traitName: 'Clutch', sourceEventId: 'event-beta' });
    const otherScope = row({
      franchiseId: 'other-franchise',
      seasonId: 'other-season',
      statsScopeId: 'other-scope',
      playerId: 'player-gamma',
      sourceEventId: 'event-other',
    });

    await putFranchiseTraitOverlay(beta);
    await putFranchiseTraitOverlay(otherScope);
    await putFranchiseTraitOverlay(alpha);

    expect(await getFranchiseTraitOverlaysByScope(scope)).toEqual([alpha, beta]);

    await deleteFranchiseTraitOverlay(alpha.id);

    expect(await getFranchiseTraitOverlaysByScope(scope)).toEqual([beta]);
    expect(syncEngine.remove).toHaveBeenCalledWith(DB_NAME, FRANCHISE_TRAIT_OVERLAY_STORE_NAME, alpha.id);
  });

  test('clear removes rows without changing caller-supplied timestamps', async () => {
    const overlay = row({
      traitName: 'RBI Hero',
      sourceEventId: 'event-timestamp',
      createdAt: '2026-06-18T12:34:56.789Z',
    });

    await putFranchiseTraitOverlay(overlay);

    expect(await getFranchiseTraitOverlaysByScope(scope)).toEqual([overlay]);

    await clearFranchiseTraitOverlaysForTests();

    expect(await getFranchiseTraitOverlaysByScope(scope)).toEqual([]);
  });

  test('syncEngine upsert is called on put with the id key', async () => {
    const overlay = row({ traitName: 'Cannon Arm', sourceEventId: 'event-cannon' });

    await putFranchiseTraitOverlay(overlay);

    expect(syncEngine.upsert).toHaveBeenCalledWith(
      DB_NAME,
      FRANCHISE_TRAIT_OVERLAY_STORE_NAME,
      overlay.id,
      overlay,
    );
  });

  test('trait overlay storage uses trackerDb, caller timestamps, and no production-only imports', () => {
    const source = readFileSync('src/utils/franchiseTraitOverlayStorage.ts', 'utf8');

    expect(source).toMatch(/getTrackerDb/);
    expect(source).toMatch(/const DB_NAME = 'kbl-tracker'/);
    expect(source).not.toMatch(/indexedDB\.open|onupgradeneeded/);
    expect(source).not.toMatch(/Date\.now|new Date/);
    expect(source).not.toMatch(/reporter|llm|react/i);
  });
});
