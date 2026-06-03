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
import { buildGeneratedFranchiseRandomEventLogReport } from '../franchiseRandomEventGenerator';
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

  test('generated candidate log sync preserves confirm dismiss and idempotency', async () => {
    const generated = buildGeneratedFranchiseRandomEventLogReport({
      ...scope,
      seed: 'storage-generated-seed',
      scoreOnlyScheduleRows: [{
        id: 'score-only-generated-1',
        ...scope,
        gameNumber: 1,
        dayNumber: 1,
        awayTeamId: 'team-a',
        homeTeamId: 'team-b',
        status: 'COMPLETED',
        result: {
          awayScore: 5,
          homeScore: 2,
          winningTeamId: 'team-a',
          losingTeamId: 'team-b',
        },
        completionSource: 'score-only',
        scoreOnlyResultId: 'score-only-1',
        resultEnteredAt: 100,
        completedAt: 100,
        createdAt: 1,
        source: 'manual',
      }],
      completedGames: [{
        gameId: 'archive-generated-1',
        date: 100,
        ...scope,
        franchiseId: scope.franchiseId,
        competitionType: 'franchise',
        competitionId: scope.franchiseId,
        awayTeamId: 'team-a',
        homeTeamId: 'team-b',
        awayTeamName: 'A',
        homeTeamName: 'B',
        finalScore: { away: 1, home: 4 },
        innings: 6,
        totalInnings: 6,
        fameEvents: [],
        playerStats: {},
        pitcherGameStats: [],
        activityLog: [],
        inningScores: [],
        aggregationStatus: 'aggregated',
      }],
    });

    expect(generated.entries.map((entry) => entry.kind)).toEqual([
      'gametracker-archive-fact',
      'gametracker-archive-fact',
      'score-only-context',
      'score-only-context',
    ]);

    await syncFranchiseRandomEventLogFromReport(generated, '2026-01-01T00:00:00.000Z');
    const records = await listFranchiseRandomEventLogRecords(
      scope.franchiseId,
      scope.seasonId,
      scope.statsScopeId,
      scope.seasonNumber,
    );
    const archiveRecord = records.find((record) => record.kind === 'gametracker-archive-fact')!;
    const scoreOnlyRecord = records.find((record) =>
      record.kind === 'score-only-context' && record.entry.safeEffectPreview?.targetId === 'team-a'
    )!;

    await confirmFranchiseRandomEventLogRecord({
      recordId: scoreOnlyRecord.id,
      targetTeamId: 'team-a',
      actorDisplayName: 'Tester',
      timestamp: '2026-01-01T00:01:00.000Z',
    });
    await dismissFranchiseRandomEventLogRecord(archiveRecord.id, 'Tester', '2026-01-01T00:02:00.000Z');

    const resynced = await syncFranchiseRandomEventLogFromReport(generated, '2026-01-01T00:03:00.000Z');
    const confirmed = resynced.find((record) => record.id === scoreOnlyRecord.id);
    const dismissed = resynced.find((record) => record.id === archiveRecord.id);

    expect(confirmed?.confirmation.state).toBe('confirmed');
    expect(confirmed?.appliedEffect.state).toBe('applied');
    expect(dismissed?.confirmation.state).toBe('dismissed');
    expect(dismissed?.appliedEffect.state).toBe('skipped');

    const snapshot = await getFranchiseMoraleSnapshot(scope, 'team-fan', 'team-a');
    expect(snapshot?.history).toHaveLength(1);
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

  test('generated game-result prompts apply persisted positive and negative formula deltas', async () => {
    const generated = buildGeneratedFranchiseRandomEventLogReport({
      ...scope,
      seed: 'signed-delta-seed',
      completedGames: [{
        gameId: 'archive-signed-1',
        date: 100,
        ...scope,
        franchiseId: scope.franchiseId,
        competitionType: 'franchise',
        competitionId: scope.franchiseId,
        awayTeamId: 'team-a',
        homeTeamId: 'team-b',
        awayTeamName: 'A',
        homeTeamName: 'B',
        finalScore: { away: 0, home: 3 },
        innings: 6,
        totalInnings: 6,
        fameEvents: [],
        playerStats: {},
        pitcherGameStats: [],
        activityLog: [],
        inningScores: [],
        aggregationStatus: 'aggregated',
      }],
    });
    const winnerPrompt = generated.entries.find((entry) => entry.safeEffectPreview?.targetId === 'team-b');
    const loserPrompt = generated.entries.find((entry) => entry.safeEffectPreview?.targetId === 'team-a');

    expect(winnerPrompt?.safeEffectPreview).toMatchObject({ targetType: 'team-fan', targetId: 'team-b', delta: 2 });
    expect(loserPrompt?.safeEffectPreview).toMatchObject({ targetType: 'team-fan', targetId: 'team-a', delta: -2 });

    await syncFranchiseRandomEventLogFromReport(generated);
    await confirmFranchiseRandomEventLogRecord({
      recordId: winnerPrompt!.id,
      targetTeamId: 'team-b',
      actorDisplayName: 'Tester',
      timestamp: '2026-01-01T00:00:00.000Z',
    });
    await confirmFranchiseRandomEventLogRecord({
      recordId: loserPrompt!.id,
      targetTeamId: 'team-a',
      actorDisplayName: 'Tester',
      timestamp: '2026-01-01T00:01:00.000Z',
    });

    const winnerSnapshot = await getFranchiseMoraleSnapshot(scope, 'team-fan', 'team-b');
    const loserSnapshot = await getFranchiseMoraleSnapshot(scope, 'team-fan', 'team-a');
    expect(winnerSnapshot?.currentValue).toBe(52);
    expect(loserSnapshot?.currentValue).toBe(48);
  });

  test('generated streak prompts apply persisted signed deltas', async () => {
    const generated = buildGeneratedFranchiseRandomEventLogReport({
      ...scope,
      seed: 'streak-storage-seed',
      completedGames: [
        {
          gameId: 'archive-streak-1',
          date: 1,
          ...scope,
          franchiseId: scope.franchiseId,
          competitionType: 'franchise',
          competitionId: scope.franchiseId,
          awayTeamId: 'team-a',
          homeTeamId: 'team-b',
          awayTeamName: 'A',
          homeTeamName: 'B',
          finalScore: { away: 5, home: 1 },
          innings: 6,
          totalInnings: 6,
          fameEvents: [],
          playerStats: {},
          pitcherGameStats: [],
          activityLog: [],
          inningScores: [],
          aggregationStatus: 'aggregated',
        },
        {
          gameId: 'archive-streak-2',
          date: 2,
          ...scope,
          franchiseId: scope.franchiseId,
          competitionType: 'franchise',
          competitionId: scope.franchiseId,
          awayTeamId: 'team-a',
          homeTeamId: 'team-b',
          awayTeamName: 'A',
          homeTeamName: 'B',
          finalScore: { away: 4, home: 2 },
          innings: 6,
          totalInnings: 6,
          fameEvents: [],
          playerStats: {},
          pitcherGameStats: [],
          activityLog: [],
          inningScores: [],
          aggregationStatus: 'aggregated',
        },
        {
          gameId: 'archive-streak-3',
          date: 3,
          ...scope,
          franchiseId: scope.franchiseId,
          competitionType: 'franchise',
          competitionId: scope.franchiseId,
          awayTeamId: 'team-a',
          homeTeamId: 'team-b',
          awayTeamName: 'A',
          homeTeamName: 'B',
          finalScore: { away: 3, home: 1 },
          innings: 6,
          totalInnings: 6,
          fameEvents: [],
          playerStats: {},
          pitcherGameStats: [],
          activityLog: [],
          inningScores: [],
          aggregationStatus: 'aggregated',
        },
      ],
    });
    const positiveStreak = generated.entries.find((entry) =>
      entry.safeEffectPreview?.targetId === 'team-a' &&
      entry.safeEffectPreview.delta === 2 &&
      entry.title.includes('win streak 3')
    );
    const negativeStreak = generated.entries.find((entry) =>
      entry.safeEffectPreview?.targetId === 'team-b' &&
      entry.safeEffectPreview.delta === -2 &&
      entry.title.includes('loss streak 3')
    );

    expect(positiveStreak).toBeDefined();
    expect(negativeStreak).toBeDefined();

    await syncFranchiseRandomEventLogFromReport(generated);
    await confirmFranchiseRandomEventLogRecord({
      recordId: positiveStreak!.id,
      actorDisplayName: 'Tester',
      timestamp: '2026-01-01T00:00:00.000Z',
    });
    await confirmFranchiseRandomEventLogRecord({
      recordId: negativeStreak!.id,
      actorDisplayName: 'Tester',
      timestamp: '2026-01-01T00:01:00.000Z',
    });

    const positiveSnapshot = await getFranchiseMoraleSnapshot(scope, 'team-fan', 'team-a');
    const negativeSnapshot = await getFranchiseMoraleSnapshot(scope, 'team-fan', 'team-b');
    expect(positiveSnapshot?.currentValue).toBe(52);
    expect(negativeSnapshot?.currentValue).toBe(48);
  });

  test('generated blowout prompts apply persisted signed deltas idempotently', async () => {
    const generated = buildGeneratedFranchiseRandomEventLogReport({
      ...scope,
      seed: 'blowout-storage-seed',
      completedGames: [{
        gameId: 'archive-blowout-1',
        date: 1,
        ...scope,
        franchiseId: scope.franchiseId,
        competitionType: 'franchise',
        competitionId: scope.franchiseId,
        awayTeamId: 'team-a',
        homeTeamId: 'team-b',
        awayTeamName: 'A',
        homeTeamName: 'B',
        finalScore: { away: 11, home: 2 },
        innings: 6,
        totalInnings: 6,
        fameEvents: [],
        playerStats: {},
        pitcherGameStats: [],
        activityLog: [],
        inningScores: [],
        aggregationStatus: 'aggregated',
      }],
    });
    const positiveBlowout = generated.entries.find((entry) =>
      entry.safeEffectPreview?.targetId === 'team-a' &&
      entry.safeEffectPreview.delta === 1 &&
      entry.title.includes('blowout win')
    );
    const negativeBlowout = generated.entries.find((entry) =>
      entry.safeEffectPreview?.targetId === 'team-b' &&
      entry.safeEffectPreview.delta === -1 &&
      entry.title.includes('blowout loss')
    );

    expect(positiveBlowout).toBeDefined();
    expect(negativeBlowout).toBeDefined();

    await syncFranchiseRandomEventLogFromReport(generated);
    await confirmFranchiseRandomEventLogRecord({
      recordId: positiveBlowout!.id,
      actorDisplayName: 'Tester',
      timestamp: '2026-01-01T00:00:00.000Z',
    });
    await confirmFranchiseRandomEventLogRecord({
      recordId: positiveBlowout!.id,
      actorDisplayName: 'Tester',
      timestamp: '2026-01-01T00:01:00.000Z',
    });
    await confirmFranchiseRandomEventLogRecord({
      recordId: negativeBlowout!.id,
      actorDisplayName: 'Tester',
      timestamp: '2026-01-01T00:02:00.000Z',
    });

    const positiveSnapshot = await getFranchiseMoraleSnapshot(scope, 'team-fan', 'team-a');
    const negativeSnapshot = await getFranchiseMoraleSnapshot(scope, 'team-fan', 'team-b');
    expect(positiveSnapshot?.currentValue).toBe(51);
    expect(positiveSnapshot?.history).toHaveLength(1);
    expect(negativeSnapshot?.currentValue).toBe(49);
  });

  test('generated achievement prompts apply persisted signed deltas idempotently', async () => {
    const generated = buildGeneratedFranchiseRandomEventLogReport({
      ...scope,
      seed: 'achievement-storage-seed',
      completedGames: [{
        gameId: 'archive-achievement-1',
        date: 1,
        ...scope,
        franchiseId: scope.franchiseId,
        competitionType: 'franchise',
        competitionId: scope.franchiseId,
        awayTeamId: 'team-a',
        homeTeamId: 'team-b',
        awayTeamName: 'A',
        homeTeamName: 'B',
        finalScore: { away: 3, home: 0 },
        innings: 6,
        totalInnings: 6,
        fameEvents: [{
          id: 'fame-perfect-1',
          gameId: 'archive-achievement-1',
          eventType: 'PERFECT_GAME',
          playerId: 'pitcher-a',
          playerName: 'Ace Alpha',
          playerTeam: 'team-a',
          fameValue: 7,
          fameType: 'bonus',
          inning: 6,
          halfInning: 'BOTTOM',
          timestamp: 1,
          autoDetected: true,
          description: 'Perfect game',
        }],
        playerStats: {},
        pitcherGameStats: [],
        activityLog: [],
        inningScores: [],
        aggregationStatus: 'aggregated',
      }],
    });
    const positiveAchievement = generated.entries.find((entry) =>
      entry.safeEffectPreview?.targetId === 'team-a' &&
      entry.safeEffectPreview.delta === 7 &&
      entry.title.includes('perfect game')
    );
    const negativeAchievement = generated.entries.find((entry) =>
      entry.safeEffectPreview?.targetId === 'team-b' &&
      entry.safeEffectPreview.delta === -4 &&
      entry.title.includes('getting perfect gamed')
    );

    expect(positiveAchievement).toBeDefined();
    expect(negativeAchievement).toBeDefined();

    await syncFranchiseRandomEventLogFromReport(generated);
    await confirmFranchiseRandomEventLogRecord({
      recordId: positiveAchievement!.id,
      actorDisplayName: 'Tester',
      timestamp: '2026-01-01T00:00:00.000Z',
    });
    await confirmFranchiseRandomEventLogRecord({
      recordId: positiveAchievement!.id,
      actorDisplayName: 'Tester',
      timestamp: '2026-01-01T00:01:00.000Z',
    });
    await confirmFranchiseRandomEventLogRecord({
      recordId: negativeAchievement!.id,
      actorDisplayName: 'Tester',
      timestamp: '2026-01-01T00:02:00.000Z',
    });

    const positiveSnapshot = await getFranchiseMoraleSnapshot(scope, 'team-fan', 'team-a');
    const negativeSnapshot = await getFranchiseMoraleSnapshot(scope, 'team-fan', 'team-b');
    expect(positiveSnapshot?.currentValue).toBe(57);
    expect(positiveSnapshot?.history).toHaveLength(1);
    expect(negativeSnapshot?.currentValue).toBe(46);
  });

  test('legacy entries without safe-effect preview still fall back safely', async () => {
    const prompt = entry('gametracker-archive-fact', 'legacy', { teamId: 'team-a' });
    await syncFranchiseRandomEventLogFromReport(report([prompt]));

    const confirmed = await confirmFranchiseRandomEventLogRecord({
      recordId: prompt.id,
      targetTeamId: 'team-a',
      actorDisplayName: 'Tester',
      timestamp: '2026-01-01T00:00:00.000Z',
    });

    expect(confirmed.appliedEffect.delta).toBe(1);
    const snapshot = await getFranchiseMoraleSnapshot(scope, 'team-fan', 'team-a');
    expect(snapshot?.currentValue).toBe(51);
  });

  test('generated player prompts carry target metadata and apply player morale without a UI-selected team target', async () => {
    const generated = buildGeneratedFranchiseRandomEventLogReport({
      ...scope,
      seed: 'player-target-seed',
      completedGames: [{
        gameId: 'archive-player-1',
        date: 100,
        ...scope,
        franchiseId: scope.franchiseId,
        competitionType: 'franchise',
        competitionId: scope.franchiseId,
        awayTeamId: 'team-a',
        homeTeamId: 'team-b',
        awayTeamName: 'A',
        homeTeamName: 'B',
        finalScore: { away: 6, home: 2 },
        innings: 6,
        totalInnings: 6,
        fameEvents: [],
        playerStats: {
          'player-a': {
            playerName: 'Player Alpha',
            teamId: 'team-a',
          },
        },
        pitcherGameStats: [],
        activityLog: [],
        inningScores: [],
        aggregationStatus: 'aggregated',
      }],
      players: [{
        id: 'player-a',
        ...scope,
        firstName: 'Player',
        lastName: 'Alpha',
        ratingRevealState: 'revealed',
        leagueAssignments: [{ leagueId: 'league-1', teamId: 'team-a', rosterStatus: 'MLB' }],
      }],
    });
    const playerPrompt = generated.entries.find((candidate) =>
      candidate.evidenceReferences.some((reference) => reference.targetType === 'player'),
    );

    expect(playerPrompt?.evidenceReferences[0]).toMatchObject({
      playerId: 'player-a',
      targetType: 'player',
      targetId: 'player-a',
      targetPlayerRevealState: 'revealed',
      targetPlayerCurrent: true,
    });

    await syncFranchiseRandomEventLogFromReport(generated);
    const confirmed = await confirmFranchiseRandomEventLogRecord({
      recordId: playerPrompt!.id,
      actorDisplayName: 'Tester',
      timestamp: '2026-01-01T00:00:00.000Z',
    });

    expect(confirmed.appliedEffect.state).toBe('applied');
    expect(confirmed.appliedEffect.targetType).toBe('player');
    expect(confirmed.appliedEffect.playerId).toBe('player-a');
    expect(confirmed.appliedEffect.teamId).toBeUndefined();

    const playerSnapshot = await getFranchiseMoraleSnapshot(scope, 'player', 'player-a');
    const fanSnapshot = await getFranchiseMoraleSnapshot(scope, 'team-fan', 'team-a');
    expect(playerSnapshot?.currentValue).toBe(51);
    expect(fanSnapshot).toBeNull();
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
