import { describe, expect, it } from 'vitest';

import {
  extractFieldingEvents,
  extractSupplementalAdvanceErrorEvents,
  extractSupplementalRunnerOutFieldingEvents,
  type FieldingExtractionContext,
} from '../../app/utils/fieldingEventExtractor';
import type { PlayData } from '../../app/utils/gameTrackerFieldTypes';

describe('extractFieldingEvents', () => {
  it('uses runtime defender identity when alignment data is available', () => {
    const playData: PlayData = {
      type: 'out',
      outType: 'DP',
      fieldingSequence: [6, 4, 3],
    };
    const context: FieldingExtractionContext = {
      gameId: 'game-1',
      defensiveTeamId: 'TEAM-H',
      atBatEventId: 'game-1_42',
      atBatEventIndex: 42,
      defendersByPosition: {
        SS: { playerId: 'home-ss-12', playerName: 'Sam Short' },
        '2B': { playerId: 'home-2b-4', playerName: 'Ben Turn' },
        '1B': { playerId: 'home-1b-9', playerName: 'Ian Scoop' },
      },
    };

    const events = extractFieldingEvents(playData, context);

    expect(events).toHaveLength(3);
    expect(events[0].atBatEventId).toBe('game-1_42');
    expect(events[0].fieldingEventId).toBe('game-1_42_fe_0');
    expect(events.map((event) => event.playerId)).toEqual([
      'home-ss-12',
      'home-2b-4',
      'home-1b-9',
    ]);
    expect(events.map((event) => event.playerName)).toEqual([
      'Sam Short',
      'Ben Turn',
      'Ian Scoop',
    ]);
    expect(events[0].ballInPlay.fielderIds).toEqual([
      'home-ss-12',
      'home-2b-4',
      'home-1b-9',
    ]);
    expect(events[0].ballInPlay.primaryFielderId).toBe('home-ss-12');
  });

  it('falls back to position identity when runtime defenders are unavailable', () => {
    const playData: PlayData = {
      type: 'error',
      fieldingSequence: [5],
      errorFielder: 5,
      errorType: 'THROWING',
    };
    const context: FieldingExtractionContext = {
      gameId: 'game-2',
      defensiveTeamId: 'TEAM-A',
      atBatEventId: 'game-2_7',
      atBatEventIndex: 7,
    };

    const events = extractFieldingEvents(playData, context);

    expect(events).toHaveLength(1);
    expect(events[0].playerId).toBe('3B');
    expect(events[0].playerName).toBe('3B');
    expect(events[0].position).toBe('3B');
  });

  it('creates supplemental extra-advance errors against the canonical at-bat id', () => {
    const playData: PlayData = {
      type: 'hit',
      hitType: '1B',
      fieldingSequence: [7, 6],
      exitType: 'Line Drive',
      spraySector: 'Left',
      playDifficulty: 'likely',
    };
    const context: FieldingExtractionContext = {
      gameId: 'game-3',
      defensiveTeamId: 'TEAM-H',
      atBatEventId: 'game-3_12',
      atBatEventIndex: 12,
      defendersByPosition: {
        LF: { playerId: 'home-lf-7', playerName: 'Lou Left' },
        SS: { playerId: 'home-ss-6', playerName: 'Sid Short' },
      },
    };

    const events = extractSupplementalAdvanceErrorEvents(
      playData,
      [
        { errorFielder: 'LF', errorType: 'THROWING', sequence: 0 },
        { errorFielder: 'SS', errorType: 'FIELDING', sequence: 1 },
      ],
      context,
    );

    expect(events).toHaveLength(2);
    expect(events.map((event) => event.atBatEventId)).toEqual(['game-3_12', 'game-3_12']);
    expect(events.map((event) => event.fieldingEventId)).toEqual([
      'game-3_12_fe_0',
      'game-3_12_fe_1',
    ]);
    expect(events.map((event) => event.playerId)).toEqual(['home-lf-7', 'home-ss-6']);
    expect(events.map((event) => event.playType)).toEqual(['error', 'error']);
    expect(events[0].ballInPlay.fielderIds).toEqual(['home-lf-7', 'home-ss-6']);
    expect(events[0].ballInPlay.primaryFielderId).toBe('home-lf-7');
    expect(events[1].ballInPlay.primaryFielderId).toBe('home-ss-6');
  });

  it('creates supplemental runner-out credits against the canonical at-bat id', () => {
    const playData: PlayData = {
      type: 'hit',
      hitType: '1B',
      fieldingSequence: [7, 2],
      exitType: 'Line Drive',
      spraySector: 'Left',
      playDifficulty: 'likely',
    };
    const context: FieldingExtractionContext = {
      gameId: 'game-4',
      defensiveTeamId: 'TEAM-H',
      atBatEventId: 'game-4_15',
      atBatEventIndex: 15,
      defendersByPosition: {
        LF: { playerId: 'home-lf-7', playerName: 'Lou Left' },
        C: { playerId: 'home-c-2', playerName: 'Cal Catch' },
        SS: { playerId: 'home-ss-6', playerName: 'Sid Short' },
      },
    };

    const events = extractSupplementalRunnerOutFieldingEvents(
      playData,
      [
        { assistBy: ['LF'], putoutBy: 'C' },
        { assistBy: ['LF', 'SS'], putoutBy: 'C' },
      ],
      context,
    );

    expect(events).toHaveLength(5);
    expect(events.map((event) => event.atBatEventId)).toEqual([
      'game-4_15',
      'game-4_15',
      'game-4_15',
      'game-4_15',
      'game-4_15',
    ]);
    expect(events.map((event) => event.fieldingEventId)).toEqual([
      'game-4_15_fe_0',
      'game-4_15_fe_1',
      'game-4_15_fe_2',
      'game-4_15_fe_3',
      'game-4_15_fe_4',
    ]);
    expect(events.map((event) => event.playType)).toEqual([
      'outfield_assist',
      'putout',
      'outfield_assist',
      'assist',
      'putout',
    ]);
    expect(events[0].playerId).toBe('home-lf-7');
    expect(events[1].playerId).toBe('home-c-2');
    expect(events[3].playerId).toBe('home-ss-6');
    expect(events[4].ballInPlay.fielderIds).toEqual(['home-lf-7', 'home-ss-6', 'home-c-2']);
  });
});
