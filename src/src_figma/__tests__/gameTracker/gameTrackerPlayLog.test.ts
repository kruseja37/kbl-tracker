import { describe, expect, test } from 'vitest';

import type { AtBatEvent, BetweenPlayEvent } from '../../../utils/eventLog';
import { buildPlayLogEntries, mapBetweenPlayEventToPlayLogEntry } from '../../app/utils/gameTrackerPlayLog';

function createAtBatEvent(overrides: Partial<AtBatEvent> = {}): AtBatEvent {
  return {
    eventId: 'game-1_1',
    gameId: 'game-1',
    eventIndex: 1,
    timestamp: 100,
    batterId: 'batter-1',
    batterName: 'Johnson',
    batterTeamId: 'away',
    pitcherId: 'pitcher-1',
    pitcherName: 'Anderson',
    pitcherTeamId: 'home',
    result: 'SH' as AtBatEvent['result'],
    rbiCount: 1,
    runsScored: ['runner-2'],
    inning: 1,
    halfInning: 'TOP',
    outs: 0,
    runners: { first: null, second: null, third: null },
    awayScore: 0,
    homeScore: 0,
    outsAfter: 1,
    runnersAfter: { first: null, second: null, third: null },
    awayScoreAfter: 1,
    homeScoreAfter: 0,
    leverageIndex: 1,
    winProbabilityBefore: 0.5,
    winProbabilityAfter: 0.55,
    wpa: 0.05,
    ballInPlay: null,
    fameEvents: [],
    isLeadoff: true,
    isClutch: false,
    isWalkOff: false,
    isQualityAtBat: true,
    enrichment: {
      fieldingSequence: [6, 3],
      pitchType: 'SL',
      pitchesInAtBat: 8,
    },
    ...overrides,
  };
}

function createBetweenPlayEvent(overrides: Partial<BetweenPlayEvent> = {}): BetweenPlayEvent {
  return {
    eventId: 'game-1_bp_1_1_101',
    gameId: 'game-1',
    timestamp: 101,
    eventIndex: 1.001,
    type: 'stolen_base',
    gameState: {
      inning: 1,
      halfInning: 'TOP',
      outs: 1,
      score: { away: 1, home: 0 },
      runnersOn: { first: 'runner-1' },
    },
    runnerAction: {
      runnerId: 'runner-1',
      runnerName: 'Garcia',
      fromBase: 1,
      toBase: 2,
      outcome: 'safe',
      reason: 'stolen_base',
    },
    stolenBase: {
      runnerId: 'runner-1',
      runnerName: 'Garcia',
      fromBase: 1,
      toBase: 2,
      isSuccessful: true,
    },
    ...overrides,
  };
}

describe('gameTrackerPlayLog', () => {
  test('maps at-bat rows with stable display fields from persisted data', () => {
    const [entry] = buildPlayLogEntries([createAtBatEvent()], []);

    expect(entry.eventType).toBe('at_bat');
    expect(entry.result).toBe('SAC');
    expect(entry.fieldingSequence).toBe('6-3');
    expect(entry.hasPitchType).toBe(true);
    expect(entry.hasPitchCount).toBe(true);
    expect(entry.isQAB).toBe(true);
    expect(entry.runsScored).toBe(1);
  });

  test('maps between-play runner events into default-visible play log rows', () => {
    const entry = mapBetweenPlayEventToPlayLogEntry(createBetweenPlayEvent());

    expect(entry).toMatchObject({
      eventType: 'stolen_base',
      editorType: 'runner',
      visibility: 'default',
      result: 'SB',
      batterName: 'Garcia',
      description: '1B -> 2B',
    });
  });

  test('keeps system rows behind toggle visibility while preserving interleaved order', () => {
    const entries = buildPlayLogEntries(
      [createAtBatEvent()],
      [
        createBetweenPlayEvent(),
        createBetweenPlayEvent({
          eventId: 'game-1_bp_1_2_102',
          eventIndex: 1.002,
          timestamp: 102,
          type: 'manager_moment',
          runnerAction: undefined,
          stolenBase: undefined,
          managerMoment: {
            leverageIndex: 2.2,
            decisionType: 'pitching_change',
            context: 'High leverage',
          },
        }),
      ],
    );

    expect(entries.map((entry) => entry.result)).toEqual(['SAC', 'SB', 'MM']);
    expect(entries[2].visibility).toBe('system');
  });

  test('maps manual context rows into default-visible play log entries', () => {
    const entry = mapBetweenPlayEventToPlayLogEntry(createBetweenPlayEvent({
      eventId: 'game-1_bp_ctx_1',
      eventIndex: 1.003,
      timestamp: 103,
      type: 'mojo_change',
      runnerAction: undefined,
      stolenBase: undefined,
      playerStateChange: {
        playerId: 'runner-1',
        playerName: 'Garcia',
        stateType: 'mojo',
        previousValue: 0,
        newValue: 1,
        reason: 'Player card adjustment',
      },
    }));

    expect(entry).toMatchObject({
      eventType: 'mojo_change',
      editorType: 'context_modifiers',
      visibility: 'default',
      result: 'MOJO',
      batterName: 'Garcia',
      description: '0 -> 1',
    });
  });

  test('surfaces killed-pitcher context rows with causing batter detail', () => {
    const injuryEntry = mapBetweenPlayEventToPlayLogEntry(createBetweenPlayEvent({
      eventId: 'game-1_bp_ctx_2',
      eventIndex: 1.004,
      timestamp: 104,
      type: 'injury',
      runnerAction: undefined,
      stolenBase: undefined,
      playerStateChange: {
        playerId: 'pitcher-1',
        playerName: 'Anderson',
        stateType: 'injury',
        previousValue: 'FIT',
        newValue: 'WEAK',
        sourceEventType: 'KILLED_PITCHER',
        causedByPlayerName: 'Johnson',
        stayedIn: false,
      },
    }));

    const fitnessEntry = mapBetweenPlayEventToPlayLogEntry(createBetweenPlayEvent({
      eventId: 'game-1_bp_ctx_3',
      eventIndex: 1.005,
      timestamp: 105,
      type: 'fitness_change',
      runnerAction: undefined,
      stolenBase: undefined,
      playerStateChange: {
        playerId: 'pitcher-1',
        playerName: 'Anderson',
        stateType: 'fitness',
        previousValue: 'FIT',
        newValue: 'WEAK',
        sourceEventType: 'KILLED_PITCHER',
        causedByPlayerName: 'Johnson',
        stayedIn: false,
      },
    }));

    expect(injuryEntry).toMatchObject({
      eventType: 'injury',
      description: 'KILLED PITCHER by Johnson (left game)',
    });
    expect(fitnessEntry).toMatchObject({
      eventType: 'fitness_change',
      description: 'FIT -> WEAK from KILLED PITCHER by Johnson (left game)',
    });
  });
});
