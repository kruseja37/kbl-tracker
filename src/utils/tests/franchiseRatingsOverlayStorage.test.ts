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
  FRANCHISE_RATINGS_OVERLAY_STORE_NAME,
  clearFranchiseRatingsOverlaysForTests,
  deleteFranchiseRatingsOverlay,
  getFranchiseRatingsOverlaysByPlayer,
  getFranchiseRatingsOverlaysByScope,
  initFranchiseRatingsOverlayDatabase,
  putFranchiseRatingsOverlay,
  resetFranchiseRatingsOverlaysForTests,
  type FranchiseRatingsOverlayRow,
} from '../franchiseRatingsOverlayStorage';
import { syncEngine } from '../syncEngine';

const DB_NAME = 'kbl-tracker';

const scope = {
  franchiseId: 'franchise-ratings',
  seasonId: 'franchise-ratings-season-1',
  statsScopeId: 'franchise-ratings-season-1',
};

function deleteDatabase(name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => resolve();
  });
}

function row(overrides: Partial<FranchiseRatingsOverlayRow> = {}): FranchiseRatingsOverlayRow {
  const playerId = overrides.playerId ?? 'player-ratings';
  const ratingKey = overrides.ratingKey ?? 'power';
  const sourceEventId = overrides.sourceEventId ?? 'event-ratings-1';
  return {
    ...scope,
    id: `${overrides.franchiseId ?? scope.franchiseId}:${overrides.seasonId ?? scope.seasonId}:${overrides.statsScopeId ?? scope.statsScopeId}:${playerId}:${ratingKey}:${sourceEventId}`,
    playerId,
    ratingKey,
    delta: 4,
    kind: 'permanent',
    expiresAtGameNumber: null,
    confirmationStatus: 'pending',
    source: 'development_checkpoint',
    sourceEventId,
    createdAtGameNumber: 12,
    createdAt: '2026-06-17T00:00:00.000Z',
    ...overrides,
  };
}

describe('franchise ratings overlay storage', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    resetFranchiseRatingsOverlaysForTests();
    await deleteDatabase(DB_NAME);
  });

  afterEach(async () => {
    await clearFranchiseRatingsOverlaysForTests();
    resetFranchiseRatingsOverlaysForTests();
    await deleteDatabase(DB_NAME);
  });

  test('trackerDb migration creates the dark ratings overlay store with id keyPath and scope/player indexes', async () => {
    const db = await initFranchiseRatingsOverlayDatabase();

    expect(db.objectStoreNames.contains(FRANCHISE_RATINGS_OVERLAY_STORE_NAME)).toBe(true);

    const tx = db.transaction(FRANCHISE_RATINGS_OVERLAY_STORE_NAME, 'readonly');
    const store = tx.objectStore(FRANCHISE_RATINGS_OVERLAY_STORE_NAME);
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

  test('round-trips permanent and temporary overlays by player', async () => {
    const permanent = row({ ratingKey: 'power', delta: 5, sourceEventId: 'event-permanent' });
    const temporary = row({
      ratingKey: 'speed',
      delta: -3,
      kind: 'temporary',
      expiresAtGameNumber: 18,
      confirmationStatus: 'confirmed',
      source: 'trait_event',
      sourceEventId: 'event-temporary',
      createdAtGameNumber: 13,
      createdAt: '2026-06-17T00:01:00.000Z',
    });

    await putFranchiseRatingsOverlay(temporary);
    await putFranchiseRatingsOverlay(permanent);

    expect(await getFranchiseRatingsOverlaysByPlayer(scope, 'player-ratings')).toEqual([
      permanent,
      temporary,
    ]);
  });

  test('stores multiple overlays per player under distinct ids', async () => {
    const power = row({ ratingKey: 'power', sourceEventId: 'event-power', delta: 2 });
    const contact = row({ ratingKey: 'contact', sourceEventId: 'event-contact', delta: 3 });
    const secondPower = row({ ratingKey: 'power', sourceEventId: 'event-power-2', delta: -1 });

    await putFranchiseRatingsOverlay(power);
    await putFranchiseRatingsOverlay(contact);
    await putFranchiseRatingsOverlay(secondPower);

    expect(await getFranchiseRatingsOverlaysByPlayer(scope, 'player-ratings')).toEqual([
      contact,
      power,
      secondPower,
    ]);
  });

  test('isolates overlays by scope and player', async () => {
    const matching = row({ playerId: 'player-alpha', ratingKey: 'power', sourceEventId: 'event-alpha' });
    const otherPlayer = row({ playerId: 'player-beta', ratingKey: 'power', sourceEventId: 'event-beta' });
    const otherScope = row({
      franchiseId: 'other-franchise',
      seasonId: 'other-season',
      statsScopeId: 'other-scope',
      playerId: 'player-alpha',
      ratingKey: 'power',
      sourceEventId: 'event-other-scope',
    });

    await putFranchiseRatingsOverlay(matching);
    await putFranchiseRatingsOverlay(otherPlayer);
    await putFranchiseRatingsOverlay(otherScope);

    expect(await getFranchiseRatingsOverlaysByPlayer(scope, 'player-alpha')).toEqual([matching]);
  });

  test('returns all overlays in a scope across players and deletes by id', async () => {
    const alpha = row({ playerId: 'player-alpha', ratingKey: 'power', sourceEventId: 'event-alpha' });
    const beta = row({ playerId: 'player-beta', ratingKey: 'contact', sourceEventId: 'event-beta' });
    const otherScope = row({
      franchiseId: 'other-franchise',
      seasonId: 'other-season',
      statsScopeId: 'other-scope',
      playerId: 'player-gamma',
      sourceEventId: 'event-other',
    });

    await putFranchiseRatingsOverlay(beta);
    await putFranchiseRatingsOverlay(otherScope);
    await putFranchiseRatingsOverlay(alpha);

    expect(await getFranchiseRatingsOverlaysByScope(scope)).toEqual([alpha, beta]);

    await deleteFranchiseRatingsOverlay(alpha.id);

    expect(await getFranchiseRatingsOverlaysByScope(scope)).toEqual([beta]);
    expect(syncEngine.remove).toHaveBeenCalledWith(DB_NAME, FRANCHISE_RATINGS_OVERLAY_STORE_NAME, alpha.id);
  });

  test('syncEngine upsert is called on put with the id key', async () => {
    const overlay = row({ ratingKey: 'arm', sourceEventId: 'event-arm' });

    await putFranchiseRatingsOverlay(overlay);

    expect(syncEngine.upsert).toHaveBeenCalledWith(
      DB_NAME,
      FRANCHISE_RATINGS_OVERLAY_STORE_NAME,
      overlay.id,
      overlay,
    );
  });

  test('ratings overlay storage uses trackerDb, caller timestamps, and no production-only imports', () => {
    const source = readFileSync('src/utils/franchiseRatingsOverlayStorage.ts', 'utf8');

    expect(source).toMatch(/getTrackerDb/);
    expect(source).toMatch(/const DB_NAME = 'kbl-tracker'/);
    expect(source).not.toMatch(/indexedDB\.open|onupgradeneeded/);
    expect(source).not.toMatch(/Date\.now|new Date/);
    expect(source).not.toMatch(/reporter|llm|react/i);
  });
});
