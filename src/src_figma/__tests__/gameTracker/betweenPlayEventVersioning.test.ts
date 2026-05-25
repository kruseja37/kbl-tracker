import 'fake-indexeddb/auto';

import { afterEach, describe, expect, test } from 'vitest';

import {
  createGameHeader,
  getBetweenPlayEvents,
  getGameEvents,
  getBetweenPlayEvent,
  logAtBatEvent,
  logBetweenPlayEvent,
  undoMostRecentGameAction,
  updateBetweenPlayEvent,
  type AtBatEvent,
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

function createAtBatEvent(overrides: Partial<AtBatEvent> = {}): AtBatEvent {
  return {
    eventId: 'game-between_1',
    gameId: 'game-between',
    eventIndex: 1,
    timestamp: 1,
    batterId: 'away-batter',
    batterName: 'Away Batter',
    batterTeamId: 'away-team',
    pitcherId: 'home-pitcher',
    pitcherName: 'Home Pitcher',
    pitcherTeamId: 'home-team',
    result: '1B',
    rbiCount: 0,
    runsScored: [],
    inning: 1,
    halfInning: 'TOP',
    outs: 0,
    runners: { first: null, second: null, third: null },
    awayScore: 0,
    homeScore: 0,
    outsAfter: 0,
    runnersAfter: {
      first: { runnerId: 'away-batter', runnerName: 'Away Batter' },
      second: null,
      third: null,
    },
    awayScoreAfter: 0,
    homeScoreAfter: 0,
    leverageIndex: 1,
    winProbabilityBefore: 0.5,
    winProbabilityAfter: 0.49,
    wpa: 0.01,
    ballInPlay: null,
    fameEvents: [],
    isLeadoff: true,
    isClutch: false,
    isWalkOff: false,
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

  test('generic undo targets player state changes newer than the last at-bat', async () => {
    await createGameHeader({
      gameId: 'game-undo-mojo',
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

    await logAtBatEvent(createAtBatEvent({
      eventId: 'game-undo-mojo_1',
      gameId: 'game-undo-mojo',
      eventIndex: 1,
      timestamp: 1,
    }));
    await logBetweenPlayEvent(createBetweenPlayEvent({
      eventId: 'game-undo-mojo_bp_mojo',
      gameId: 'game-undo-mojo',
      eventIndex: 1.001,
      timestamp: 2,
      type: 'mojo_change',
      runnerAction: undefined,
      stolenBase: undefined,
      playerStateChange: {
        playerId: 'away-batter',
        playerName: 'Away Batter',
        stateType: 'mojo',
        previousValue: 0,
        newValue: 1,
        reason: 'Lineup quick adjust',
      },
    }));

    const undone = await undoMostRecentGameAction('game-undo-mojo');
    const betweenPlayEvents = await getBetweenPlayEvents('game-undo-mojo', {
      includeUndone: true,
    });
    const remainingAtBats = await getGameEvents('game-undo-mojo');

    expect(undone).toMatchObject({
      kind: 'betweenPlay',
      eventId: 'game-undo-mojo_bp_mojo',
    });
    expect(betweenPlayEvents[0]?.undoneAt).toEqual(expect.any(Number));
    expect(remainingAtBats).toHaveLength(1);
  });

  test('generic undo follows between-play ordering for position changes after substitutions', async () => {
    await createGameHeader({
      gameId: 'game-undo-position-change',
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
      eventId: 'game-undo-position-change_bp_sub',
      gameId: 'game-undo-position-change',
      eventIndex: 1.001,
      timestamp: 2,
      type: 'substitution',
      runnerAction: undefined,
      stolenBase: undefined,
      substitution: {
        subType: 'defensive_replacement',
        outPlayerId: 'home-2b',
        inPlayerId: 'home-bench',
        inPosition: '2B',
      },
    }));
    await logBetweenPlayEvent(createBetweenPlayEvent({
      eventId: 'game-undo-position-change_bp_pos',
      gameId: 'game-undo-position-change',
      eventIndex: 1.002,
      timestamp: 3,
      type: 'position_change',
      runnerAction: undefined,
      stolenBase: undefined,
      substitution: {
        subType: 'position_change',
        outPlayerId: 'home-bench',
        inPlayerId: 'home-bench',
        previousPosition: '2B',
        inPosition: 'SS',
      },
    }));

    const undone = await undoMostRecentGameAction('game-undo-position-change');
    const events = await getBetweenPlayEvents('game-undo-position-change', {
      includeUndone: true,
    });

    expect(undone).toMatchObject({
      kind: 'betweenPlay',
      eventId: 'game-undo-position-change_bp_pos',
    });
    expect(events.find((event) => event.type === 'position_change')?.undoneAt).toEqual(
      expect.any(Number),
    );
    expect(events.find((event) => event.type === 'substitution')?.undoneAt).toBeUndefined();
  });

  test('generic undo marks grouped pitch-count confirmation and pitcher change together', async () => {
    await createGameHeader({
      gameId: 'game-undo-pitcher-change-group',
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
      eventId: 'game-undo-pitcher-change-group_bp_pitch_count',
      gameId: 'game-undo-pitcher-change-group',
      eventIndex: 1.001,
      timestamp: 2,
      type: 'pitch_count_update',
      eventGroupId: 'pitcher-change-group-1',
      runnerAction: undefined,
      stolenBase: undefined,
      pitchCountUpdate: {
        pitcherId: 'home-sp',
        pitchCount: 17,
        timing: 'pitcher_removed',
      },
    }));
    await logBetweenPlayEvent(createBetweenPlayEvent({
      eventId: 'game-undo-pitcher-change-group_bp_pitcher_change',
      gameId: 'game-undo-pitcher-change-group',
      eventIndex: 1.002,
      timestamp: 3,
      type: 'pitcher_change',
      eventGroupId: 'pitcher-change-group-1',
      runnerAction: undefined,
      stolenBase: undefined,
      pitcherChange: {
        outgoingPitcherId: 'home-sp',
        outgoingPitcherName: 'Home Starter',
        incomingPitcherId: 'home-rp',
        incomingPitcherName: 'Home Reliever',
        inheritedRunners: 0,
        outgoingPitchCount: 17,
      },
    }));

    const undone = await undoMostRecentGameAction('game-undo-pitcher-change-group');
    const events = await getBetweenPlayEvents('game-undo-pitcher-change-group', {
      includeUndone: true,
    });

    expect(undone).toMatchObject({
      kind: 'betweenPlay',
      eventId: 'game-undo-pitcher-change-group_bp_pitcher_change',
    });
    expect(events.find((event) => event.type === 'pitcher_change')?.undoneAt).toEqual(
      expect.any(Number),
    );
    expect(events.find((event) => event.type === 'pitch_count_update')?.undoneAt).toEqual(
      expect.any(Number),
    );
  });
});
