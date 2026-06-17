import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import {
  applyFranchiseMoraleMatrixConsequence,
  applyFranchiseMoraleEffect,
  getFranchiseMoraleSnapshot,
  resetFranchiseMoraleDatabaseForTests,
} from '../franchiseMoraleState';
import { setFranchisePhase2MoraleEnabledForTests } from '../franchisePhase2Flags';
import { syncEngine } from '../syncEngine';
import { composeMoraleConsequence } from '../../engines/masterMoraleMatrix';

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
    setFranchisePhase2MoraleEnabledForTests(null);
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

  test('matrix auto path is dark when the Phase-2 morale flag is disabled', async () => {
    setFranchisePhase2MoraleEnabledForTests(false);
    const consequence = composeMoraleConsequence(
      { type: 'FAN_FAVORITE_LOCKED' },
      'RELAXED',
      { loyalty: 50, ambition: 50, resilience: 50, charisma: 50 },
      50,
      50,
    );

    const result = await applyFranchiseMoraleMatrixConsequence({
      ...scope,
      playerId: 'player-matrix',
      teamId: 'team-matrix',
      consequence,
      sourceEventId: 'designation:event:dark',
      timestamp: '2026-01-03T00:00:00.000Z',
    });

    expect(result.status).toBe('dark-noop');
    await expect(getFranchiseMoraleSnapshot(scope, 'player', 'player-matrix')).resolves.toBeNull();
    await expect(getFranchiseMoraleSnapshot(scope, 'team-fan', 'team-matrix')).resolves.toBeNull();
  });

  test('matrix auto path writes player fan and touched-player history with source-event dedupe', async () => {
    setFranchisePhase2MoraleEnabledForTests(true);
    const consequence = composeMoraleConsequence(
      { type: 'FAN_FAVORITE_LOCKED' },
      'RELAXED',
      { loyalty: 50, ambition: 50, resilience: 50, charisma: 50 },
      50,
      50,
    );
    const input = {
      ...scope,
      playerId: 'player-matrix',
      teamId: 'team-matrix',
      consequence,
      sourceEventId: 'designation:event:auto',
      otherTouchedPlayerIds: ['player-teammate'],
      timestamp: '2026-01-04T00:00:00.000Z',
    };

    const first = await applyFranchiseMoraleMatrixConsequence(input);
    const duplicate = await applyFranchiseMoraleMatrixConsequence(input);

    expect(first.status).toBe('applied');
    expect(duplicate.status).toBe('skipped');

    const player = await getFranchiseMoraleSnapshot(scope, 'player', 'player-matrix');
    const fan = await getFranchiseMoraleSnapshot(scope, 'team-fan', 'team-matrix');
    const teammate = await getFranchiseMoraleSnapshot(scope, 'player', 'player-teammate');

    expect(player?.currentValue).toBeGreaterThan(50);
    expect(fan?.currentValue).toBeGreaterThan(50);
    expect(teammate?.currentValue).toBeGreaterThan(50);
    expect(player?.history).toHaveLength(1);
    expect(fan?.history).toHaveLength(1);
    expect(teammate?.history).toHaveLength(1);
    expect(player?.history[0]).toMatchObject({
      sourceEventId: 'designation:event:auto',
      sourceKind: 'matrix-auto',
      actorDisplayName: 'Master Morale Matrix',
    });
    expect(fan?.history[0]).toMatchObject({
      sourceEventId: 'designation:event:auto',
      sourceKind: 'matrix-auto',
    });
    expect(teammate?.history[0].sourceEventId).toBe('designation:event:auto:other:0:player-teammate');
    expect(teammate?.history[0].sourceKind).toBe('matrix-auto');
  });
});
