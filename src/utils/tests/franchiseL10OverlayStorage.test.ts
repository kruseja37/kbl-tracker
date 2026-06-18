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
  FRANCHISE_L10_OVERLAY_STORE_NAME,
  clearFranchiseL10OverlaysForTests,
  deleteFranchiseL10Overlay,
  getFranchiseL10OverlaysByScope,
  getFranchiseL10OverlaysByTarget,
  initFranchiseL10OverlayDatabase,
  putFranchiseL10Overlay,
  resetFranchiseL10OverlaysForTests,
  type FranchiseL10OverlayRow,
} from '../franchiseL10OverlayStorage';
import { syncEngine } from '../syncEngine';

const DB_NAME = 'kbl-tracker';

const scope = {
  franchiseId: 'franchise-l10',
  seasonId: 'franchise-l10-season-1',
  statsScopeId: 'franchise-l10-season-1',
};

function deleteDatabase(name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => resolve();
  });
}

function row(overrides: Partial<FranchiseL10OverlayRow> = {}): FranchiseL10OverlayRow {
  const targetId = overrides.targetId ?? 'player-l10';
  const family = overrides.family ?? 'performance';
  const sourceEventId = overrides.sourceEventId ?? 'event-l10-1';
  return {
    ...scope,
    id: `${overrides.franchiseId ?? scope.franchiseId}:${overrides.seasonId ?? scope.seasonId}:${overrides.statsScopeId ?? scope.statsScopeId}:${targetId}:${family}:${sourceEventId}`,
    targetId,
    targetKind: 'player',
    family,
    eventType: 'hot_streak',
    valence: 'positive',
    magnitude: 1,
    probability: 0.42,
    confirmationStatus: 'pending',
    applied: false,
    source: 'l10_event_selection',
    sourceEventId,
    createdAtGameNumber: 12,
    createdAt: '2026-06-18T00:00:00.000Z',
    ...overrides,
  };
}

describe('franchise L10 overlay storage', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    resetFranchiseL10OverlaysForTests();
    await deleteDatabase(DB_NAME);
  });

  afterEach(async () => {
    await clearFranchiseL10OverlaysForTests();
    resetFranchiseL10OverlaysForTests();
    await deleteDatabase(DB_NAME);
  });

  test('trackerDb migration creates the dark L10 overlay store with id keyPath and scope/target indexes', async () => {
    const db = await initFranchiseL10OverlayDatabase();

    expect(db.objectStoreNames.contains(FRANCHISE_L10_OVERLAY_STORE_NAME)).toBe(true);

    const tx = db.transaction(FRANCHISE_L10_OVERLAY_STORE_NAME, 'readonly');
    const store = tx.objectStore(FRANCHISE_L10_OVERLAY_STORE_NAME);
    expect(store.keyPath).toBe('id');
    expect(Array.from(store.indexNames)).toEqual(['by_scope', 'by_target']);
    expect(store.index('by_scope').keyPath).toEqual(['franchiseId', 'seasonId', 'statsScopeId']);
    expect(store.index('by_target').keyPath).toEqual([
      'franchiseId',
      'seasonId',
      'statsScopeId',
      'targetId',
    ]);
  });

  test('round-trips team and player overlays by target and scope', async () => {
    const teamEvent = row({
      targetId: 'team-l10',
      targetKind: 'team',
      family: 'team',
      eventType: 'stadium_change',
      valence: 'neutral',
      magnitude: 2,
      sourceEventId: 'event-team',
      createdAt: '2026-06-18T00:01:00.000Z',
    });
    const playerEvent = row({
      targetId: 'player-l10',
      targetKind: 'player',
      family: 'performance',
      eventType: 'hot_streak',
      valence: 'positive',
      sourceEventId: 'event-player',
      createdAt: '2026-06-18T00:02:00.000Z',
    });

    await putFranchiseL10Overlay(playerEvent);
    await putFranchiseL10Overlay(teamEvent);

    expect(await getFranchiseL10OverlaysByTarget(scope, 'team-l10')).toEqual([teamEvent]);
    expect(await getFranchiseL10OverlaysByTarget(scope, 'player-l10')).toEqual([playerEvent]);
    expect(await getFranchiseL10OverlaysByScope(scope)).toEqual([playerEvent, teamEvent]);
  });

  test('stores multiple overlays per target under distinct ids with deterministic L10 sort', async () => {
    const roleLater = row({ family: 'role', sourceEventId: 'event-role-2' });
    const performance = row({ family: 'performance', sourceEventId: 'event-performance' });
    const roleEarlier = row({ family: 'role', sourceEventId: 'event-role-1' });

    await putFranchiseL10Overlay(roleLater);
    await putFranchiseL10Overlay(performance);
    await putFranchiseL10Overlay(roleEarlier);

    expect(await getFranchiseL10OverlaysByTarget(scope, 'player-l10')).toEqual([
      performance,
      roleEarlier,
      roleLater,
    ]);
  });

  test('isolates overlays by scope and target', async () => {
    const matching = row({ targetId: 'target-alpha', family: 'performance', sourceEventId: 'event-alpha' });
    const otherTarget = row({ targetId: 'target-beta', family: 'performance', sourceEventId: 'event-beta' });
    const otherScope = row({
      franchiseId: 'other-franchise',
      seasonId: 'other-season',
      statsScopeId: 'other-scope',
      targetId: 'target-alpha',
      family: 'performance',
      sourceEventId: 'event-other-scope',
    });

    await putFranchiseL10Overlay(matching);
    await putFranchiseL10Overlay(otherTarget);
    await putFranchiseL10Overlay(otherScope);

    expect(await getFranchiseL10OverlaysByTarget(scope, 'target-alpha')).toEqual([matching]);
  });

  test('returns all overlays in a scope across targets and deletes by id', async () => {
    const alpha = row({ targetId: 'target-alpha', family: 'performance', sourceEventId: 'event-alpha' });
    const beta = row({ targetId: 'target-beta', family: 'team', targetKind: 'team', sourceEventId: 'event-beta' });
    const otherScope = row({
      franchiseId: 'other-franchise',
      seasonId: 'other-season',
      statsScopeId: 'other-scope',
      targetId: 'target-gamma',
      sourceEventId: 'event-other',
    });

    await putFranchiseL10Overlay(beta);
    await putFranchiseL10Overlay(otherScope);
    await putFranchiseL10Overlay(alpha);

    expect(await getFranchiseL10OverlaysByScope(scope)).toEqual([alpha, beta]);

    await deleteFranchiseL10Overlay(alpha.id);

    expect(await getFranchiseL10OverlaysByScope(scope)).toEqual([beta]);
    expect(syncEngine.remove).toHaveBeenCalledWith(DB_NAME, FRANCHISE_L10_OVERLAY_STORE_NAME, alpha.id);
  });

  test('clear removes rows without changing caller-supplied timestamps', async () => {
    const overlay = row({
      family: 'wildcard',
      sourceEventId: 'event-timestamp',
      createdAt: '2026-06-18T12:34:56.789Z',
    });

    await putFranchiseL10Overlay(overlay);

    expect(await getFranchiseL10OverlaysByScope(scope)).toEqual([overlay]);

    await clearFranchiseL10OverlaysForTests();

    expect(await getFranchiseL10OverlaysByScope(scope)).toEqual([]);
  });

  test('syncEngine upsert is called on put with the id key', async () => {
    const overlay = row({ family: 'roster', sourceEventId: 'event-roster' });

    await putFranchiseL10Overlay(overlay);

    expect(syncEngine.upsert).toHaveBeenCalledWith(
      DB_NAME,
      FRANCHISE_L10_OVERLAY_STORE_NAME,
      overlay.id,
      overlay,
    );
  });

  test('L10 overlay storage uses trackerDb, caller timestamps, and no production-only imports', () => {
    const source = readFileSync('src/utils/franchiseL10OverlayStorage.ts', 'utf8');

    expect(source).toMatch(/getTrackerDb/);
    expect(source).toMatch(/const DB_NAME = 'kbl-tracker'/);
    expect(source).not.toMatch(/indexedDB\.open|onupgradeneeded/);
    expect(source).not.toMatch(/Date\.now|new Date/);
    expect(source).not.toMatch(/reporter|llm|react/i);
  });
});
