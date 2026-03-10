import 'fake-indexeddb/auto';

import { afterEach, describe, expect, test } from 'vitest';

import {
  createGameHeader,
  generateBoxScore,
  logAtBatEvent,
  logFieldingEvent,
  type AtBatEvent,
  type FieldingEvent,
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

function createAtBatEvent(overrides: Partial<AtBatEvent>): AtBatEvent {
  return {
    eventId: 'game-box_ab_1',
    gameId: 'game-box',
    eventIndex: 1,
    timestamp: 1,
    batterId: 'away-batter-1',
    batterName: 'Away Batter',
    batterTeamId: 'away-team',
    pitcherId: 'home-pitcher-1',
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
      first: {
        runnerId: 'away-batter-1',
        runnerName: 'Away Batter',
        responsiblePitcherId: 'home-pitcher-1',
      },
      second: null,
      third: null,
    },
    awayScoreAfter: 0,
    homeScoreAfter: 0,
    leverageIndex: 1,
    winProbabilityBefore: 0.5,
    winProbabilityAfter: 0.5,
    wpa: 0,
    ballInPlay: null,
    fameEvents: [],
    isLeadoff: true,
    isClutch: false,
    isWalkOff: false,
    ...overrides,
  };
}

function createFieldingEvent(overrides: Partial<FieldingEvent>): FieldingEvent {
  return {
    fieldingEventId: 'game-box_fe_1',
    gameId: 'game-box',
    atBatEventId: 'game-box_ab_1',
    sequence: 0,
    playerId: 'fielder-1',
    playerName: 'Fielder One',
    position: 'SS',
    teamId: 'home-team',
    playType: 'error',
    difficulty: 'routine',
    ballInPlay: {
      trajectory: 'ground',
      zone: 6,
      velocity: 'medium',
      fielderIds: ['fielder-1'],
      primaryFielderId: 'fielder-1',
    },
    success: false,
    runsPreventedOrAllowed: -0.2,
    ...overrides,
  };
}

describe('generateBoxScore fielding error totals', () => {
  test('counts away and home errors by defensive team id', async () => {
    await createGameHeader({
      gameId: 'game-box',
      seasonId: 'season-1',
      date: Date.now(),
      awayTeamId: 'away-team',
      awayTeamName: 'Away Team',
      homeTeamId: 'home-team',
      homeTeamName: 'Home Team',
      finalScore: { away: 0, home: 0 },
      finalInning: 9,
      isComplete: true,
    });

    await logAtBatEvent(createAtBatEvent({}));
    await logFieldingEvent(createFieldingEvent({ fieldingEventId: 'home-error-1', teamId: 'home-team' }));
    await logFieldingEvent(createFieldingEvent({ fieldingEventId: 'home-error-2', playerId: 'fielder-2', teamId: 'home-team' }));
    await logFieldingEvent(createFieldingEvent({ fieldingEventId: 'away-error-1', playerId: 'fielder-3', teamId: 'away-team' }));

    const boxScore = await generateBoxScore('game-box');

    expect(boxScore).not.toBeNull();
    expect(boxScore?.awayTeam.errors).toBe(1);
    expect(boxScore?.homeTeam.errors).toBe(2);
  });
});
