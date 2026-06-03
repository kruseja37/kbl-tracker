import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import type { FranchiseRandomEventLogEntry, FranchiseRandomEventLogReport } from '../franchiseRandomEventLog';
import { FRANCHISE_RANDOM_EVENT_LOG_CONTRACT_VERSION } from '../franchiseRandomEventLog';
import {
  classifyFranchiseRandomEventSafeEffect,
  confirmFranchiseRandomEventLogRecord,
  dismissFranchiseRandomEventLogRecord,
  listFranchiseRandomEventLogRecords,
  resetFranchiseRandomEventLogDatabaseForTests,
  syncFranchiseRandomEventLogFromReport,
} from '../franchiseRandomEventLogStorage';
import {
  applyFranchiseMoraleEffect,
  getFranchiseMoraleSnapshot,
  listFranchiseMoraleSnapshots,
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

function entry(
  kind: FranchiseRandomEventLogEntry['kind'],
  suffix: string,
  evidenceExtras: Partial<FranchiseRandomEventLogEntry['evidenceReferences'][number]> = {},
): FranchiseRandomEventLogEntry {
  return {
    id: `${scope.franchiseId}:${scope.seasonId}:${scope.statsScopeId}:random-event:${kind}:${suffix}`,
    contractVersion: FRANCHISE_RANDOM_EVENT_LOG_CONTRACT_VERSION,
    kind,
    status: 'ready-for-review',
    ...scope,
    title: `${kind} prompt`,
    reason: 'Scoped evidence can be reviewed.',
    suggestedManualChange: {
      target: kind === 'score-only-context' ? 'fan-morale-draft' : 'story-note',
      summary: 'Review before confirming any manual change.',
      requiresUserConfirmation: true,
      automaticProfileMutationAllowed: false,
      automaticMoraleMutationAllowed: false,
      automaticRelationshipMutationAllowed: false,
    },
    evidenceReferences: [
      {
        type: kind === 'score-only-context' ? 'score-only-schedule-summary' : 'gametracker-archive-summary',
        description: 'Scoped evidence summary.',
        ...scope,
        count: 1,
        hiddenProspectTruth: false,
        ...evidenceExtras,
      },
    ],
    confirmation: {
      state: 'unconfirmed',
      checked: false,
      checkboxLabel: 'Manual change completed',
    },
    narrativeReadableStatus: 'Ready for user review.',
    hiddenSafe: true,
    persistable: false,
    mutable: false,
    automaticProfileMutationAllowed: false,
    automaticMoraleMutationAllowed: false,
    automaticRelationshipMutationAllowed: false,
    automaticStoryPersistenceAllowed: false,
    warnings: [],
    blockers: [],
  };
}

function report(entries: FranchiseRandomEventLogEntry[]): FranchiseRandomEventLogReport {
  return {
    contractVersion: FRANCHISE_RANDOM_EVENT_LOG_CONTRACT_VERSION,
    generatedAt: 100,
    ...scope,
    entries,
    readyForReview: entries.length,
    confirmedManualChanges: 0,
    dismissed: 0,
    blocked: 0,
    persistable: false,
    mutable: false,
    automaticProfileMutationAllowed: false,
    automaticMoraleMutationAllowed: false,
    automaticRelationshipMutationAllowed: false,
    automaticStoryPersistenceAllowed: false,
    hiddenSafe: true,
    blockers: [],
    warnings: [],
    limitations: [],
  };
}

describe('franchise random event durable log and morale effects', () => {
  beforeEach(async () => {
    resetFranchiseRandomEventLogDatabaseForTests();
    resetFranchiseMoraleDatabaseForTests();
    await deleteDatabase('kbl-franchise-random-events');
    await deleteDatabase('kbl-franchise-morale');
    vi.spyOn(syncEngine, 'isSuppressed').mockReturnValue(true);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    resetFranchiseRandomEventLogDatabaseForTests();
    resetFranchiseMoraleDatabaseForTests();
    await deleteDatabase('kbl-franchise-random-events');
    await deleteDatabase('kbl-franchise-morale');
  });

  test('syncs prompt records durably and preserves existing confirmation state', async () => {
    const prompt = entry('gametracker-archive-fact', 'archive');
    await syncFranchiseRandomEventLogFromReport(report([prompt]), '2026-01-01T00:00:00.000Z');

    await confirmFranchiseRandomEventLogRecord({
      recordId: prompt.id,
      targetTeamId: 'team-a',
      actorDisplayName: 'Tester',
      timestamp: '2026-01-01T00:01:00.000Z',
    });

    const resynced = await syncFranchiseRandomEventLogFromReport(report([prompt]), '2026-01-01T00:02:00.000Z');

    expect(resynced).toHaveLength(1);
    expect(resynced[0].confirmation.state).toBe('confirmed');
    expect(resynced[0].appliedEffect.state).toBe('applied');
    expect(resynced[0].appliedEffect.teamId).toBe('team-a');
  });

  test('re-confirming an applied record preserves the original applied effect state', async () => {
    const prompt = entry('gametracker-archive-fact', 'archive');
    await syncFranchiseRandomEventLogFromReport(report([prompt]), '2026-01-01T00:00:00.000Z');

    const first = await confirmFranchiseRandomEventLogRecord({
      recordId: prompt.id,
      targetTeamId: 'team-a',
      actorDisplayName: 'Tester',
      timestamp: '2026-01-01T00:01:00.000Z',
    });
    const second = await confirmFranchiseRandomEventLogRecord({
      recordId: prompt.id,
      targetTeamId: 'team-a',
      actorDisplayName: 'Retry',
      timestamp: '2026-01-01T00:02:00.000Z',
    });

    expect(first.appliedEffect.state).toBe('applied');
    expect(second.appliedEffect.state).toBe('applied');
    expect(second.appliedEffect.currentValue).toBe(first.appliedEffect.currentValue);
    const snapshot = await getFranchiseMoraleSnapshot(scope, 'team-fan', 'team-a');
    expect(snapshot?.history).toHaveLength(1);
  });

  test('list APIs require exact stats scope and season number', async () => {
    const scopedPrompt = entry('gametracker-archive-fact', 'archive');
    const wrongScopePrompt: FranchiseRandomEventLogEntry = {
      ...entry('score-only-context', 'wrong-scope'),
      id: `${scope.franchiseId}:${scope.seasonId}:wrong-scope:random-event:score-only-context:wrong-scope`,
      statsScopeId: 'wrong-scope',
      seasonNumber: 99,
    };
    await syncFranchiseRandomEventLogFromReport(report([scopedPrompt, wrongScopePrompt]));
    await applyFranchiseMoraleEffect({
      ...scope,
      targetType: 'team-fan',
      teamId: 'team-a',
      delta: 1,
      reason: 'Scoped event.',
      sourceEventId: 'scoped-event',
    });
    await applyFranchiseMoraleEffect({
      ...scope,
      statsScopeId: 'wrong-scope',
      seasonNumber: 99,
      targetType: 'team-fan',
      teamId: 'team-b',
      delta: 1,
      reason: 'Wrong-scope event.',
      sourceEventId: 'wrong-scope-event',
    });

    const records = await listFranchiseRandomEventLogRecords(
      scope.franchiseId,
      scope.seasonId,
      scope.statsScopeId,
      scope.seasonNumber,
    );
    const snapshots = await listFranchiseMoraleSnapshots(
      scope.franchiseId,
      scope.seasonId,
      scope.statsScopeId,
      scope.seasonNumber,
    );

    expect(records.map((record) => record.id)).toEqual([scopedPrompt.id]);
    expect(snapshots.map((snapshot) => snapshot.teamId)).toEqual(['team-a']);
  });

  test('confirmed score-only prompts apply team fan morale only', async () => {
    const prompt = entry('score-only-context', 'score-only', { scoreOnlyContextOnly: true });
    await syncFranchiseRandomEventLogFromReport(report([prompt]));

    const confirmed = await confirmFranchiseRandomEventLogRecord({
      recordId: prompt.id,
      targetTeamId: 'team-a',
      targetPlayerId: 'player-a',
      targetPlayerRevealState: 'revealed',
      actorDisplayName: 'Tester',
      timestamp: '2026-01-01T00:00:00.000Z',
    });

    expect(confirmed.confirmation.state).toBe('confirmed');
    expect(confirmed.appliedEffect.state).toBe('applied');
    expect(confirmed.appliedEffect.targetType).toBe('team-fan');
    expect(confirmed.appliedEffect.playerId).toBeUndefined();

    const fanSnapshot = await getFranchiseMoraleSnapshot(scope, 'team-fan', 'team-a');
    const playerSnapshot = await getFranchiseMoraleSnapshot(scope, 'player', 'player-a');
    expect(fanSnapshot?.currentValue).toBe(51);
    expect(playerSnapshot).toBeNull();
  });

  test('hidden player targets are blocked from player morale effects', async () => {
    const prompt = entry('gametracker-archive-fact', 'archive', { playerId: 'prospect-hidden' });
    await syncFranchiseRandomEventLogFromReport(report([prompt]));
    const [record] = await listFranchiseRandomEventLogRecords(
      scope.franchiseId,
      scope.seasonId,
      scope.statsScopeId,
      scope.seasonNumber,
    );

    const preview = classifyFranchiseRandomEventSafeEffect(record, {
      targetPlayerId: 'prospect-hidden',
      targetPlayerRevealState: 'hidden',
    });

    expect(preview.allowed).toBe(false);
    expect(preview.blockers.join(' ')).toContain('Unrevealed FARM/prospect hidden truth');
  });

  test('dismissal persists without morale effects', async () => {
    const prompt = entry('stadium-spray-context', 'stadium');
    await syncFranchiseRandomEventLogFromReport(report([prompt]));

    const dismissed = await dismissFranchiseRandomEventLogRecord(prompt.id, 'Tester');

    expect(dismissed.confirmation.state).toBe('dismissed');
    expect(dismissed.appliedEffect.state).toBe('skipped');
    expect(await getFranchiseMoraleSnapshot(scope, 'team-fan', 'team-a')).toBeNull();
  });

  test('morale snapshots clamp to the 0-99 scale and are idempotent by source event', async () => {
    const first = await applyFranchiseMoraleEffect({
      ...scope,
      targetType: 'team-fan',
      teamId: 'team-a',
      delta: 80,
      reason: 'Large confirmed swing.',
      sourceEventId: 'event-1',
      timestamp: '2026-01-01T00:00:00.000Z',
    });
    const duplicate = await applyFranchiseMoraleEffect({
      ...scope,
      targetType: 'team-fan',
      teamId: 'team-a',
      delta: 80,
      reason: 'Large confirmed swing.',
      sourceEventId: 'event-1',
      timestamp: '2026-01-01T00:01:00.000Z',
    });

    expect(first.status).toBe('applied');
    expect(first.currentValue).toBe(99);
    expect(duplicate.status).toBe('skipped');
    expect(duplicate.snapshot?.history).toHaveLength(1);
  });
});
