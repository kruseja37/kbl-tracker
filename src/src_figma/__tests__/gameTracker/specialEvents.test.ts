/**
 * Special Events Logging (BUG-014: logFieldingEvent + activity log/fame integration)
 * @franchise-game-tracker
 */

import 'fake-indexeddb/auto';
import { describe, test, expect, afterEach } from 'vitest';
import { logFieldingEvent, type FieldingEvent } from '../../../utils/eventLog';

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

const getFieldingEvents = (): Promise<FieldingEvent[]> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('kbl-event-log', 1);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const transaction = db.transaction('fieldingEvents', 'readonly');
      const store = transaction.objectStore('fieldingEvents');
      const getAll = store.getAll();
      getAll.onerror = () => reject(getAll.error);
      getAll.onsuccess = () => resolve(getAll.result as FieldingEvent[]);
    };
  });
};

afterEach(async () => {
  await deleteEventLogDB();
});

describe('@franchise-game-tracker logFieldingEvent persistence', () => {
  test('@franchise-game-tracker stores special-play metadata in fieldingEvents store', async () => {
    const sampleEvent: FieldingEvent = {
      fieldingEventId: 'f-special-001',
      gameId: 'game-special',
      atBatEventId: 'game-special_1',
      sequence: 1,
      playerId: 'player-9',
      playerName: 'Robinson Dive',
      position: 'CF',
      teamId: 'home-1',
      playType: 'putout',
      difficulty: 'spectacular',
      specialPlayType: 'Diving',
      ballInPlay: {
        trajectory: 'fly',
        zone: 5,
        velocity: 'hard',
        fielderIds: ['player-9'],
      },
      success: true,
      runsPreventedOrAllowed: 0,
    };

    await logFieldingEvent(sampleEvent);

    const events = await getFieldingEvents();
    expect(events.length).toBe(1);
    expect(events[0].specialPlayType).toBe('Diving');
  });
});
