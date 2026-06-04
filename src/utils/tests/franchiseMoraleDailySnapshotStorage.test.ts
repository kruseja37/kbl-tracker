import 'fake-indexeddb/auto';
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import {
  applyFranchiseMoraleEffect,
  clearFranchiseMoraleDatabaseForTests,
  FRANCHISE_MORALE_STATE_CONTRACT_VERSION,
  resetFranchiseMoraleDatabaseForTests,
  type FranchiseMoraleSnapshot,
} from '../franchiseMoraleState';
import {
  clearFranchiseMoraleDailySnapshotDatabaseForTests,
  getFranchiseMoraleDailySnapshot,
  listFranchiseMoraleDailySnapshots,
  resetFranchiseMoraleDailySnapshotDatabaseForTests,
  upsertFranchiseMoraleDailySnapshotsFromCanonicalState,
  upsertFranchiseMoraleDailySnapshotsFromMoraleSnapshots,
} from '../franchiseMoraleDailySnapshotStorage';
import { syncEngine } from '../syncEngine';

const scope = {
  franchiseId: 'franchise-1',
  seasonId: 'season-1',
  statsScopeId: 'season-1',
  seasonNumber: 1,
};

function manualSnapshot(overrides: Partial<FranchiseMoraleSnapshot> = {}): FranchiseMoraleSnapshot {
  return {
    id: 'manual-snapshot-1',
    contractVersion: FRANCHISE_MORALE_STATE_CONTRACT_VERSION,
    franchiseId: scope.franchiseId,
    seasonId: scope.seasonId,
    statsScopeId: scope.statsScopeId,
    seasonNumber: scope.seasonNumber,
    targetType: 'team-fan',
    teamId: 'team-1',
    baselineValue: 50,
    currentValue: 55,
    lastModified: '2026-01-01T15:00:00.000Z',
    history: [{
      id: 'history-1',
      sourceEventId: 'manual:team-1:one',
      sourceKind: 'manual-override',
      previousValue: 50,
      currentValue: 55,
      delta: 5,
      reason: 'Manual morale adjustment.',
      actorDisplayName: 'Tester',
      timestamp: '2026-01-01T15:00:00.000Z',
    }],
    ...overrides,
  };
}

describe('franchise morale daily snapshot storage', () => {
  beforeEach(async () => {
    resetFranchiseMoraleDatabaseForTests();
    resetFranchiseMoraleDailySnapshotDatabaseForTests();
    await clearFranchiseMoraleDatabaseForTests();
    await clearFranchiseMoraleDailySnapshotDatabaseForTests();
    vi.spyOn(syncEngine, 'isSuppressed').mockReturnValue(true);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await clearFranchiseMoraleDatabaseForTests();
    await clearFranchiseMoraleDailySnapshotDatabaseForTests();
    resetFranchiseMoraleDatabaseForTests();
    resetFranchiseMoraleDailySnapshotDatabaseForTests();
  });

  test('creates daily team fan summaries from canonical confirmed morale history', async () => {
    await applyFranchiseMoraleEffect({
      ...scope,
      targetType: 'team-fan',
      teamId: 'team-1',
      delta: 10,
      reason: 'Confirmed archive-backed fan lift.',
      sourceEventId: 'random-event:team-1:archive-win',
      sourceKind: 'random-event-confirmation',
      actorDisplayName: 'Tester',
      timestamp: '2026-01-01T12:00:00.000Z',
    });
    await applyFranchiseMoraleEffect({
      ...scope,
      targetType: 'team-fan',
      teamId: 'team-1',
      delta: -5,
      reason: 'Manual correction later the same day.',
      sourceEventId: 'manual:team-1:correction',
      sourceKind: 'manual-override',
      actorDisplayName: 'Tester',
      timestamp: '2026-01-01T18:00:00.000Z',
    });

    const result = await upsertFranchiseMoraleDailySnapshotsFromCanonicalState(scope, {
      timestamp: '2026-01-02T00:00:00.000Z',
    });

    expect(result.persisted).toBe(true);
    expect(result.snapshots).toHaveLength(1);
    expect(result.policies.moraleMutationAllowed).toBe(false);
    expect(result.policies.automaticDriftAllowed).toBe(false);
    expect(result.policies.mode3HandoffAllowed).toBe(false);

    const [snapshot] = await listFranchiseMoraleDailySnapshots(scope);
    expect(snapshot).toMatchObject({
      franchiseId: 'franchise-1',
      seasonId: 'season-1',
      statsScopeId: 'season-1',
      seasonNumber: 1,
      targetType: 'team-fan',
      targetId: 'team-1',
      teamId: 'team-1',
      dateKey: '2026-01-01',
      openingValue: 50,
      closingValue: 55,
      highValue: 60,
      lowValue: 50,
      averageValue: 55,
      changeCount: 2,
    });
    expect(snapshot.sourceKinds).toEqual(['random-event-confirmation', 'manual-override']);
    expect(snapshot.sourceEventIds).toEqual(['random-event:team-1:archive-win', 'manual:team-1:correction']);
  });

  test('creates player morale daily summaries without creating team fan rows', async () => {
    await applyFranchiseMoraleEffect({
      ...scope,
      targetType: 'player',
      playerId: 'player-1',
      delta: 7,
      reason: 'Manual player morale lift.',
      sourceEventId: 'manual:player-1:lift',
      sourceKind: 'manual-override',
      actorDisplayName: 'Tester',
      timestamp: '2026-01-03T10:00:00.000Z',
    });

    await upsertFranchiseMoraleDailySnapshotsFromCanonicalState(scope, {
      timestamp: '2026-01-04T00:00:00.000Z',
    });

    const snapshots = await listFranchiseMoraleDailySnapshots(scope);
    expect(snapshots).toHaveLength(1);
    expect(snapshots[0]).toMatchObject({
      targetType: 'player',
      targetId: 'player-1',
      playerId: 'player-1',
      dateKey: '2026-01-03',
      openingValue: 50,
      closingValue: 57,
    });
  });

  test('groups one target into separate daily records by history date', async () => {
    const result = await upsertFranchiseMoraleDailySnapshotsFromMoraleSnapshots(scope, [
      manualSnapshot({
        history: [
          {
            id: 'history-1',
            sourceEventId: 'event-1',
            sourceKind: 'manual-override',
            previousValue: 50,
            currentValue: 53,
            delta: 3,
            reason: 'Day one lift.',
            actorDisplayName: 'Tester',
            timestamp: '2026-01-01T12:00:00.000Z',
          },
          {
            id: 'history-2',
            sourceEventId: 'event-2',
            sourceKind: 'manual-override',
            previousValue: 53,
            currentValue: 48,
            delta: -5,
            reason: 'Day two dip.',
            actorDisplayName: 'Tester',
            timestamp: '2026-01-02T12:00:00.000Z',
          },
        ],
      }),
    ], { timestamp: '2026-01-03T00:00:00.000Z' });

    expect(result.snapshots).toHaveLength(2);
    expect((await listFranchiseMoraleDailySnapshots(scope)).map((snapshot) => snapshot.dateKey)).toEqual([
      '2026-01-01',
      '2026-01-02',
    ]);
  });

  test('clamps observed values to the canonical 0-99 morale scale', async () => {
    await upsertFranchiseMoraleDailySnapshotsFromMoraleSnapshots(scope, [
      manualSnapshot({
        history: [{
          id: 'history-clamped',
          sourceEventId: 'event-clamped',
          sourceKind: 'manual-override',
          previousValue: -20,
          currentValue: 125,
          delta: 145,
          reason: 'Malformed external values are clamped.',
          actorDisplayName: 'Tester',
          timestamp: '2026-01-01T12:00:00.000Z',
        }],
      }),
    ], { timestamp: '2026-01-02T00:00:00.000Z' });

    const snapshot = await getFranchiseMoraleDailySnapshot({
      ...scope,
      targetType: 'team-fan',
      targetId: 'team-1',
      dateKey: '2026-01-01',
    });

    expect(snapshot).toMatchObject({
      openingValue: 0,
      closingValue: 99,
      highValue: 99,
      lowValue: 0,
      averageValue: 49.5,
    });
  });

  test('rerunning the same morale history is idempotent by scope target and date', async () => {
    const snapshots = [manualSnapshot()];
    await upsertFranchiseMoraleDailySnapshotsFromMoraleSnapshots(scope, snapshots, {
      timestamp: '2026-01-02T00:00:00.000Z',
    });
    await upsertFranchiseMoraleDailySnapshotsFromMoraleSnapshots(scope, snapshots, {
      timestamp: '2026-01-03T00:00:00.000Z',
    });

    const records = await listFranchiseMoraleDailySnapshots(scope);
    expect(records).toHaveLength(1);
    expect(records[0].createdAt).toBe('2026-01-02T00:00:00.000Z');
    expect(records[0].updatedAt).toBe('2026-01-03T00:00:00.000Z');
  });

  test('missing mismatched or whitespace-only scope blocks storage', async () => {
    const missingScopeResult = await upsertFranchiseMoraleDailySnapshotsFromMoraleSnapshots({
      franchiseId: '   ',
      seasonId: 'season-1',
      statsScopeId: 'season-1',
      seasonNumber: 1,
    }, [manualSnapshot()]);
    const mismatchedResult = await upsertFranchiseMoraleDailySnapshotsFromMoraleSnapshots(scope, [
      manualSnapshot({ seasonId: 'other-season' }),
    ]);

    expect(missingScopeResult.persisted).toBe(false);
    expect(missingScopeResult.blockers.join(' ')).toMatch(/non-empty franchise/i);
    expect(mismatchedResult.persisted).toBe(false);
    expect(mismatchedResult.blockers.join(' ')).toMatch(/scope mismatch/i);
    expect(await listFranchiseMoraleDailySnapshots(scope)).toEqual([]);
  });

  test('whitespace-only target ids and history-free snapshots are skipped', async () => {
    const result = await upsertFranchiseMoraleDailySnapshotsFromMoraleSnapshots(scope, [
      manualSnapshot({ teamId: '   ' }),
      manualSnapshot({ teamId: 'team-no-history', history: [] }),
    ], { timestamp: '2026-01-02T00:00:00.000Z' });

    expect(result.persisted).toBe(false);
    expect(result.snapshots).toEqual([]);
    expect(result.blockers.join(' ')).toMatch(/non-empty target id/i);
    expect(result.blockers.join(' ')).toMatch(/morale history is required/i);
  });

  test('malformed runtime target types are skipped even with valid player or team ids', async () => {
    const result = await upsertFranchiseMoraleDailySnapshotsFromMoraleSnapshots(scope, [
      manualSnapshot({
        targetType: 'coach' as never,
        teamId: undefined,
        playerId: 'player-with-invalid-target',
      }),
      manualSnapshot({
        targetType: 'fanbase' as never,
        teamId: 'team-with-invalid-target',
        playerId: undefined,
      }),
    ], { timestamp: '2026-01-02T00:00:00.000Z' });

    expect(result.persisted).toBe(false);
    expect(result.snapshots).toEqual([]);
    expect(result.policies.moraleMutationAllowed).toBe(false);
    expect(result.blockers.join(' ')).toMatch(/target type must be team-fan or player/i);
    expect(await listFranchiseMoraleDailySnapshots(scope)).toEqual([]);
  });

  test('score-only fan context remains team fan summary evidence only', async () => {
    await upsertFranchiseMoraleDailySnapshotsFromMoraleSnapshots(scope, [
      manualSnapshot({
        targetType: 'team-fan',
        teamId: 'team-score-only',
        history: [{
          id: 'score-only-history',
          sourceEventId: 'score-only:schedule-game-1',
          sourceKind: 'random-event-confirmation',
          previousValue: 50,
          currentValue: 51,
          delta: 1,
          reason: 'Confirmed score-only team fan reaction.',
          actorDisplayName: 'Tester',
          timestamp: '2026-01-01T12:00:00.000Z',
        }],
      }),
    ], { timestamp: '2026-01-02T00:00:00.000Z' });

    const snapshots = await listFranchiseMoraleDailySnapshots(scope);
    expect(snapshots).toHaveLength(1);
    expect(snapshots[0].targetType).toBe('team-fan');
    expect(snapshots[0].playerId).toBeUndefined();
    expect(snapshots[0].sourceEventIds).toEqual(['score-only:schedule-game-1']);
  });

  test('storage utility imports no unsafe mutation or prompt APIs', () => {
    const source = readFileSync('src/utils/franchiseMoraleDailySnapshotStorage.ts', 'utf8');

    expect(source).not.toMatch(/from '\.\/(franchiseRandomEventLog|franchiseRandomEventLogStorage|franchiseSalary|franchiseDesignations|gameStorage|eventLog|syncEngine)'/);
    expect(source).not.toMatch(/applyFranchiseMoraleEffect|confirmFranchiseRandomEvent|syncFranchiseRandomEventLogFromReport|saveFranchise|persistFranchiseDesignations/);
  });
});
