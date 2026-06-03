import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import {
  applyFranchiseMoraleEffect,
  getFranchiseMoraleSnapshot,
  resetFranchiseMoraleDatabaseForTests,
} from '../franchiseMoraleState';
import { syncEngine } from '../syncEngine';

function deleteDatabase(name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => resolve();
  });
}

const scope = {
  franchiseId: 'franchise-1',
  seasonId: 'franchise-1-season-1',
  statsScopeId: 'franchise-1-season-1',
  seasonNumber: 1,
};

describe('franchise morale state', () => {
  beforeEach(async () => {
    resetFranchiseMoraleDatabaseForTests();
    await deleteDatabase('kbl-franchise-morale');
    vi.spyOn(syncEngine, 'isSuppressed').mockReturnValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    resetFranchiseMoraleDatabaseForTests();
  });

  test('manual player morale overrides start at 50 clamp to 0-99 and remain idempotent by source event', async () => {
    const first = await applyFranchiseMoraleEffect({
      ...scope,
      targetType: 'player',
      playerId: 'player-1',
      delta: 60,
      reason: 'Manual player morale confidence boost.',
      sourceEventId: 'manual:player:player-1:one',
      sourceKind: 'manual-override',
      actorDisplayName: 'Tester',
      timestamp: '2026-01-01T00:00:00.000Z',
    });
    const duplicate = await applyFranchiseMoraleEffect({
      ...scope,
      targetType: 'player',
      playerId: 'player-1',
      delta: 60,
      reason: 'Duplicate manual player morale confidence boost.',
      sourceEventId: 'manual:player:player-1:one',
      sourceKind: 'manual-override',
      actorDisplayName: 'Tester',
      timestamp: '2026-01-01T00:01:00.000Z',
    });
    const second = await applyFranchiseMoraleEffect({
      ...scope,
      targetType: 'player',
      playerId: 'player-1',
      delta: -120,
      reason: 'Manual player morale correction.',
      sourceEventId: 'manual:player:player-1:two',
      sourceKind: 'manual-override',
      actorDisplayName: 'Tester',
      timestamp: '2026-01-02T00:00:00.000Z',
    });

    expect(first.status).toBe('applied');
    expect(first.previousValue).toBe(50);
    expect(first.currentValue).toBe(99);
    expect(first.delta).toBe(49);
    expect(duplicate.status).toBe('skipped');
    expect(second.status).toBe('applied');
    expect(second.previousValue).toBe(99);
    expect(second.currentValue).toBe(0);
    expect(second.delta).toBe(-99);

    const snapshot = await getFranchiseMoraleSnapshot(scope, 'player', 'player-1');
    expect(snapshot?.baselineValue).toBe(50);
    expect(snapshot?.currentValue).toBe(0);
    expect(snapshot?.history).toHaveLength(2);
    expect(snapshot?.history.map((entry) => entry.sourceKind)).toEqual(['manual-override', 'manual-override']);
  });
});
