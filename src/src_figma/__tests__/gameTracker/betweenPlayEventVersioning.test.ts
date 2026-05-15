import 'fake-indexeddb/auto';

import { afterEach, describe, expect, test } from 'vitest';

import {
  createGameHeader,
  getBetweenPlayEvents,
  getBetweenPlayEvent,
  logBetweenPlayEvent,
  undoMostRecentGameAction,
  updateBetweenPlayEvent,
  type BetweenPlayEvent,
} from '../../../utils/eventLog';

const deleteEventLogDB = () => new Promise<void>((resolve) => {
  const request = indexedDB.deleteDatabase('kbl-event-log');
  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    resolve();
  };
  request.onsuccess = finish;
  request.onerror = finish;
  request.onblocked = finish;
  setTimeout(finish, 50);
});

afterEach(async () => {
  await deleteEventLogDB();
});

function createBetweenPlayEvent(overrides: Partial<BetweenPlayEvent> = {}): BetweenPlayEvent {
  return {
    eventId: 'game-between_2_bp_stolen_base',
    gameId: 'game-between',
    seasonId: 'season-1',
    statsScopeId: 'season-1-regular',
    competitionType: 'regular_season',
    timestamp: 2,
    eventIndex: 2,
    type: 'stolen_base',
    gameState: {
      inning: 1,
      halfInning: 'TOP',
      outs: 1,
      score: { away: 0, home: 0 },
      runnersOn: {
        first: 'runner-1',
      },
    },
    runnerAction: {
      runnerId: 'runner-1',
      runnerName: 'Runner One',
      fromBase: 1,
      toBase: 2,
      outcome: 'safe',
      reason: 'stolen_base',
    },
    stolenBase: {
      runnerId: 'runner-1',
      runnerName: 'Runner One',
      fromBase: 1,
      toBase: 2,
      isSuccessful: true,
      caughtBy: 2,
    },
    ...overrides,
  };
}

describe('BetweenPlayEvent versioning', () => {
  test('logBetweenPlayEvent defaults version and edit history', async () => {
    await createGameHeader({
      gameId: 'game-between',
      seasonId: 'season-1',
      statsScopeId: 'season-1-regular',
      competitionType: 'regular_season',
      date: Date.now(),
      awayTeamId: 'away-team',
      awayTeamName: 'Away Team',
      homeTeamId: 'home-team',
      homeTeamName: 'Home Team',
      finalScore: null,
      finalInning: 1,
      isComplete: false,
    });

    await logBetweenPlayEvent(createBetweenPlayEvent());

    const event = await getBetweenPlayEvent('game-between_2_bp_stolen_base');

    expect(event?.version).toBe(1);
    expect(event?.editHistory).toEqual([]);
  });

  test('updateBetweenPlayEvent increments version and appends edit history', async () => {
    await createGameHeader({
      gameId: 'game-between',
      seasonId: 'season-1',
      statsScopeId: 'season-1-regular',
      competitionType: 'regular_season',
      date: Date.now(),
      awayTeamId: 'away-team',
      awayTeamName: 'Away Team',
      homeTeamId: 'home-team',
      homeTeamName: 'Home Team',
      finalScore: null,
      finalInning: 1,
      isComplete: false,
    });

    await logBetweenPlayEvent(createBetweenPlayEvent({
      version: 1,
      editHistory: [{
        field: 'runnerAction.toBase',
        oldValue: 1,
        newValue: 2,
        timestamp: 2,
      }],
    }));

    await updateBetweenPlayEvent('game-between_2_bp_stolen_base', {
      version: 2,
      editHistory: [{
        field: 'runnerAction.toBase',
        oldValue: 2,
        newValue: 3,
        timestamp: 3,
      }],
      runnerAction: {
        runnerId: 'runner-1',
        runnerName: 'Runner One',
        fromBase: 1,
        toBase: 3,
        outcome: 'safe',
        reason: 'advance',
      },
      stolenBase: {
        runnerId: 'runner-1',
        runnerName: 'Runner One',
        fromBase: 1,
        toBase: 3,
        isSuccessful: true,
        caughtBy: 2,
      },
    });

    const event = await getBetweenPlayEvent('game-between_2_bp_stolen_base');

    expect(event?.version).toBe(2);
    expect(event?.runnerAction?.toBase).toBe(3);
    expect(event?.runnerAction?.reason).toBe('advance');
    expect(event?.stolenBase?.toBase).toBe(3);
    expect(event?.editHistory).toEqual([
      {
        field: 'runnerAction.toBase',
        oldValue: 1,
        newValue: 2,
        timestamp: 2,
      },
      {
        field: 'runnerAction.toBase',
        oldValue: 2,
        newValue: 3,
        timestamp: 3,
      },
    ]);
  });

  test('generic undo skips manager recommendation observations', async () => {
    await createGameHeader({
      gameId: 'game-undo-recommendation',
      seasonId: 'season-1',
      statsScopeId: 'season-1-regular',
      competitionType: 'regular_season',
      date: Date.now(),
      awayTeamId: 'away-team',
      awayTeamName: 'Away Team',
      homeTeamId: 'home-team',
      homeTeamName: 'Home Team',
      finalScore: null,
      finalInning: 1,
      isComplete: false,
    });

    await logBetweenPlayEvent(createBetweenPlayEvent({
      eventId: 'game-undo-recommendation_1_bp_stolen_base',
      gameId: 'game-undo-recommendation',
      eventIndex: 1,
      timestamp: 1,
    }));
    await logBetweenPlayEvent(createBetweenPlayEvent({
      eventId: 'game-undo-recommendation_2_bp_recommendation',
      gameId: 'game-undo-recommendation',
      eventIndex: 2,
      timestamp: 2,
      type: 'manager_recommendation',
      runnerAction: undefined,
      stolenBase: undefined,
      managerRecommendationWatch: {
        recommendationId: 'rec-keep-pitcher',
        type: 'consider_pitching_change',
        managerId: 'home-manager',
        teamId: 'home-team',
        opponentTeamId: 'away-team',
        confidence: 'high',
        surface: 'recommendation_card',
        trackedPlayerIds: ['home-pitcher'],
        primaryAction: 'open_pitching_change',
        noChangeAction: 'keep_pitcher',
        suppressKey: 'consider_pitching_change:home-pitcher:1:top',
      },
    }));

    const undone = await undoMostRecentGameAction('game-undo-recommendation');
    const events = await getBetweenPlayEvents('game-undo-recommendation', {
      includeUndone: true,
    });
    const stolenBase = events.find(
      (event) => event.eventId === 'game-undo-recommendation_1_bp_stolen_base',
    );
    const recommendation = events.find(
      (event) => event.eventId === 'game-undo-recommendation_2_bp_recommendation',
    );

    expect(undone).toMatchObject({
      kind: 'betweenPlay',
      eventId: 'game-undo-recommendation_1_bp_stolen_base',
    });
    expect(stolenBase?.undoneAt).toEqual(expect.any(Number));
    expect(recommendation?.undoneAt).toBeUndefined();
  });
});
