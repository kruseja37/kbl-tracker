import 'fake-indexeddb/auto';

import { afterEach, describe, expect, test } from 'vitest';

import {
  createGameHeader,
  getAtBatEvent,
  getFieldingEventsForAtBat,
  logAtBatEvent,
  logFieldingEvent,
  updateAtBatEventWithFieldingSync,
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
    eventId: 'game-sync_1',
    gameId: 'game-sync',
    eventIndex: 1,
    timestamp: 1,
    batterId: 'away-batter-1',
    batterName: 'Away Batter',
    batterTeamId: 'away-team',
    pitcherId: 'home-pitcher-1',
    pitcherName: 'Home Pitcher',
    pitcherTeamId: 'home-team',
    result: 'GO',
    rbiCount: 0,
    runsScored: [],
    inning: 1,
    halfInning: 'TOP',
    outs: 0,
    runners: { first: null, second: null, third: null },
    awayScore: 0,
    homeScore: 0,
    outsAfter: 1,
    runnersAfter: { first: null, second: null, third: null },
    awayScoreAfter: 0,
    homeScoreAfter: 0,
    leverageIndex: 1,
    winProbabilityBefore: 0.5,
    winProbabilityAfter: 0.48,
    wpa: -0.02,
    ballInPlay: null,
    fameEvents: [],
    isLeadoff: true,
    isClutch: false,
    isWalkOff: false,
    enrichment: {
      fieldingSequence: [6, 3],
    },
    version: 1,
    ...overrides,
  };
}

function createFieldingEvent(overrides: Partial<FieldingEvent>): FieldingEvent {
  return {
    fieldingEventId: 'game-sync_1_fe_0',
    gameId: 'game-sync',
    atBatEventId: 'game-sync_1',
    sequence: 0,
    playerId: 'home-ss-1',
    playerName: 'Home Shortstop',
    position: 'SS',
    teamId: 'home-team',
    playType: 'assist',
    difficulty: 'routine',
    ballInPlay: {
      trajectory: 'ground',
      zone: 6,
      velocity: 'medium',
      fielderIds: ['home-ss-1', 'home-1b-3'],
      primaryFielderId: 'home-ss-1',
    },
    success: true,
    runsPreventedOrAllowed: 0.1,
    ...overrides,
  };
}

describe('updateAtBatEventWithFieldingSync', () => {
  test('updates the at-bat version and replaces linked fielding rows together', async () => {
    await createGameHeader({
      gameId: 'game-sync',
      seasonId: 'season-1',
      date: Date.now(),
      awayTeamId: 'away-team',
      awayTeamName: 'Away Team',
      homeTeamId: 'home-team',
      homeTeamName: 'Home Team',
      finalScore: null,
      finalInning: 1,
      isComplete: false,
    });

    await logAtBatEvent(createAtBatEvent({}));
    await logFieldingEvent(createFieldingEvent({ fieldingEventId: 'game-sync_1_fe_0', sequence: 0 }));
    await logFieldingEvent(createFieldingEvent({
      fieldingEventId: 'game-sync_1_fe_1',
      sequence: 1,
      playerId: 'home-1b-3',
      playerName: 'Home First',
      position: '1B',
      playType: 'putout',
      ballInPlay: {
        trajectory: 'ground',
        zone: 6,
        velocity: 'medium',
        fielderIds: ['home-ss-1', 'home-1b-3'],
        primaryFielderId: 'home-ss-1',
      },
    }));

    await updateAtBatEventWithFieldingSync(
      'game-sync_1',
      {
        enrichment: { fieldingSequence: [5, 3] },
        version: 2,
        editHistory: [{
          field: 'enrichment.fieldingSequence',
          oldValue: [6, 3],
          newValue: [5, 3],
          timestamp: 10,
        }],
      },
      [
        createFieldingEvent({
          fieldingEventId: 'game-sync_1_fe_0',
          sequence: 0,
          playerId: 'home-3b-5',
          playerName: 'Home Third',
          position: '3B',
          ballInPlay: {
            trajectory: 'ground',
            zone: 5,
            velocity: 'medium',
            fielderIds: ['home-3b-5', 'home-1b-3'],
            primaryFielderId: 'home-3b-5',
          },
        }),
        createFieldingEvent({
          fieldingEventId: 'game-sync_1_fe_1',
          sequence: 1,
          playerId: 'home-1b-3',
          playerName: 'Home First',
          position: '1B',
          playType: 'putout',
          ballInPlay: {
            trajectory: 'ground',
            zone: 5,
            velocity: 'medium',
            fielderIds: ['home-3b-5', 'home-1b-3'],
            primaryFielderId: 'home-3b-5',
          },
        }),
      ],
    );

    const atBat = await getAtBatEvent('game-sync_1');
    const fieldingEvents = await getFieldingEventsForAtBat('game-sync_1');

    expect(atBat?.version).toBe(2);
    expect(atBat?.enrichment?.fieldingSequence).toEqual([5, 3]);
  expect(atBat?.editHistory).toHaveLength(1);
  expect(fieldingEvents.map((event) => event.position)).toEqual(['3B', '1B']);
  expect(fieldingEvents[0].ballInPlay.fielderIds).toEqual(['home-3b-5', 'home-1b-3']);
  });
});
