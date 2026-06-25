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

  it('keeps automatic gem credit on the primary fielder while allowing explicit extra credit', () => {
    const playData: PlayData = {
      type: 'hit',
      hitType: '1B',
      fieldingSequence: [7, 2],
      extraGemCreditPositions: [2],
      fieldingPlayType: 'diving',
      exitType: 'Line Drive',
      spraySector: 'Left',
    };
    const context: FieldingExtractionContext = {
      gameId: 'game-4c',
      defensiveTeamId: 'TEAM-H',
      atBatEventId: 'game-4c_17',
      atBatEventIndex: 17,
      defendersByPosition: {
        LF: { playerId: 'home-lf-7', playerName: 'Lou Left' },
        C: { playerId: 'home-c-2', playerName: 'Cal Catch' },
      },
    };

    const events = extractSupplementalRunnerOutFieldingEvents(
      playData,
      [{ assistBy: ['LF'], putoutBy: 'C' }],
      context,
    );

    expect(events).toHaveLength(2);
    expect(events[0].playerId).toBe('home-lf-7');
    expect(events[0].specialPlayType).toBe('Diving');
    expect(events[1].playerId).toBe('home-c-2');
    expect(events[1].specialPlayType).toBe('Diving');
  });

  it('[M3-2-fix] persists a saved-run missed dive as a failed non-base-save attempt', () => {
    const playData: PlayData = {
      type: 'hit',
      hitType: '1B',
      fieldingSequence: [8],
      exitType: 'Line Drive',
      spraySector: 'Center',
      fieldingPlayType: 'missed_dive',
      savedRun: true,
    };
    const context: FieldingExtractionContext = {
      gameId: 'game-4b',
      defensiveTeamId: 'TEAM-H',
      atBatEventId: 'game-4b_16',
      atBatEventIndex: 16,
      defendersByPosition: {
        CF: { playerId: 'home-cf-8', playerName: 'Casey Center' },
      },
    };

    const events = extractFieldingEvents(playData, context);

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      atBatEventId: 'game-4b_16',
      fieldingEventId: 'game-4b_16_fe_0',
      playerId: 'home-cf-8',
      playerName: 'Casey Center',
      position: 'CF',
      playType: 'putout',
      specialPlayType: 'Missed Dive',
      success: false,
      runsPreventedOrAllowed: 0,
    });
  });

  it('persists a plain-hit missed leap as a failed non-base-save attempt', () => {
    const playData: PlayData = {
      type: 'hit',
      hitType: '2B',
      fieldingSequence: [7],
      exitType: 'Fly Ball',
      spraySector: 'Left',
      fieldingPlayType: 'missed_leap',
    };
    const context: FieldingExtractionContext = {
      gameId: 'game-4d',
      defensiveTeamId: 'TEAM-H',
      atBatEventId: 'game-4d_18',
      atBatEventIndex: 18,
      defendersByPosition: {
        LF: { playerId: 'home-lf-7', playerName: 'Lou Left' },
      },
    };

    const events = extractFieldingEvents(playData, context);

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      atBatEventId: 'game-4d_18',
      fieldingEventId: 'game-4d_18_fe_0',
      playerId: 'home-lf-7',
      playerName: 'Lou Left',
      position: 'LF',
      playType: 'putout',
      specialPlayType: 'Missed Leap',
      success: false,
      runsPreventedOrAllowed: 0,
    });
  });

  it('persists a missed spectacular attempt alongside the recorded out', () => {
    const playData: PlayData = {
      type: 'out',
      outType: 'FO',
      fieldingSequence: [8, 4],
      exitType: 'Fly Ball',
      spraySector: 'Center',
      fieldingPlayType: 'missed_dive',
    };
    const context: FieldingExtractionContext = {
      gameId: 'game-4e',
      defensiveTeamId: 'TEAM-H',
      atBatEventId: 'game-4e_19',
      atBatEventIndex: 19,
      defendersByPosition: {
        CF: { playerId: 'home-cf-8', playerName: 'Casey Center' },
        '2B': { playerId: 'home-2b-4', playerName: 'Ben Turn' },
      },
    };

    const events = extractFieldingEvents(playData, context);

    expect(events).toHaveLength(3);
    expect(events[0]).toMatchObject({
      fieldingEventId: 'game-4e_19_fe_0',
      playerId: 'home-cf-8',
      playType: 'putout',
      specialPlayType: 'Missed Dive',
      success: false,
    });
    expect(events[1]).toMatchObject({
      fieldingEventId: 'game-4e_19_fe_1',
      playerId: 'home-cf-8',
      playType: 'outfield_assist',
      specialPlayType: null,
      success: true,
    });
    expect(events[2]).toMatchObject({
      fieldingEventId: 'game-4e_19_fe_2',
      playerId: 'home-2b-4',
      playType: 'putout',
      specialPlayType: null,
      success: true,
    });
  });

  it('persists failed robbery as a first-class failed spectacular attempt', () => {
    const playData: PlayData = {
      type: 'hr',
      hitType: 'HR',
      fieldingSequence: [9],
      exitType: 'Fly Ball',
      spraySector: 'Right',
      fieldingPlayType: 'failed_robbery',
    };
    const context: FieldingExtractionContext = {
      gameId: 'game-4f',
      defensiveTeamId: 'TEAM-H',
      atBatEventId: 'game-4f_20',
      atBatEventIndex: 20,
      defendersByPosition: {
        RF: { playerId: 'home-rf-9', playerName: 'Riley Right' },
      },
    };

    const events = extractFieldingEvents(playData, context);

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      fieldingEventId: 'game-4f_20_fe_0',
      playerId: 'home-rf-9',
      position: 'RF',
      playType: 'putout',
      difficulty: 'spectacular',
      specialPlayType: 'Failed Robbery',
      success: false,
    });
  });

  it('keeps made saved-run diving gems on the existing base-save path', () => {
    const playData: PlayData = {
      type: 'hit',
      hitType: '1B',
      fieldingSequence: [8],
      exitType: 'Line Drive',
      spraySector: 'Center',
      fieldingPlayType: 'diving',
      savedRun: true,
    };
    const context: FieldingExtractionContext = {
      gameId: 'game-4g',
      defensiveTeamId: 'TEAM-H',
      atBatEventId: 'game-4g_21',
      atBatEventIndex: 21,
      defendersByPosition: {
        CF: { playerId: 'home-cf-8', playerName: 'Casey Center' },
      },
    };

    const events = extractFieldingEvents(playData, context);

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      fieldingEventId: 'game-4g_21_fe_0',
      playerId: 'home-cf-8',
      playType: 'base_save',
      specialPlayType: 'Diving',
      success: true,
      runsPreventedOrAllowed: 1,
    });
  });

  it('maps fielding play type enrichment into special play metadata and persisted difficulty', () => {
    const playData: PlayData = {
      type: 'out',
      outType: 'FO',
      fieldingSequence: [8],
      fieldingPlayType: 'robbed_hr',
      exitType: 'Fly Ball',
      spraySector: 'Center',
    };
    const context: FieldingExtractionContext = {
      gameId: 'game-5',
      defensiveTeamId: 'TEAM-H',
      atBatEventId: 'game-5_21',
      atBatEventIndex: 21,
      defendersByPosition: {
        CF: { playerId: 'home-cf-8', playerName: 'Casey Center' },
      },
    };

    const events = extractFieldingEvents(playData, context);

    expect(events).toHaveLength(1);
    expect(events[0].difficulty).toBe('spectacular');
    expect(events[0].specialPlayType).toBe('Robbed HR');
  });

  it('[M3-3-universal] creates a charged fielder error event from runner-level enrichment', () => {
    const playData: PlayData = {
      type: 'hit',
      hitType: '1B',
      fieldingSequence: [7, 6],
      exitType: 'Line Drive',
      spraySector: 'Left',
      persistedRunnerOutcomes: [
        {
          runnerId: 'runner-1',
          runnerName: 'Garcia',
          fromBase: 'first',
          toBase: 'second',
          errorType: 'throwing',
          errorChargedTo: 6,
        },
      ],
    };
    const context: FieldingExtractionContext = {
      gameId: 'game-5b',
      defensiveTeamId: 'TEAM-H',
      atBatEventId: 'game-5b_22',
      atBatEventIndex: 22,
      defendersByPosition: {
        LF: { playerId: 'home-lf-7', playerName: 'Lou Left' },
        SS: { playerId: 'home-ss-6', playerName: 'Sam Short' },
      },
    };

    const events = extractFieldingEvents(playData, context);

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      atBatEventId: 'game-5b_22',
      fieldingEventId: 'game-5b_22_fe_0',
      playerId: 'home-ss-6',
      playerName: 'Sam Short',
      position: 'SS',
      playType: 'error',
      success: false,
    });
    expect(events[0].ballInPlay.fielderIds).toEqual(['home-lf-7', 'home-ss-6']);
    expect(events[0].ballInPlay.primaryFielderId).toBe('home-ss-6');
  });

  it('[M3-3-batter-error] creates a charged fielder error event from batter-level correction metadata', () => {
    const playData: PlayData = {
      type: 'error',
      fieldingSequence: [6, 3],
      batterReachedOnError: true,
      batterErrorType: 'THROWING',
      batterErrorChargedToPosition: 6,
    };
    const context: FieldingExtractionContext = {
      gameId: 'game-5c',
      defensiveTeamId: 'TEAM-H',
      atBatEventId: 'game-5c_23',
      atBatEventIndex: 23,
      defendersByPosition: {
        SS: { playerId: 'home-ss-6', playerName: 'Sam Short' },
        '1B': { playerId: 'home-1b-3', playerName: 'Ian Scoop' },
      },
    };

    const events = extractFieldingEvents(playData, context);

    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      atBatEventId: 'game-5c_23',
      fieldingEventId: 'game-5c_23_fe_0',
      playerId: 'home-ss-6',
      playerName: 'Sam Short',
      position: 'SS',
      playType: 'error',
      success: false,
    });
    expect(events[0].ballInPlay.fielderIds).toEqual(['home-ss-6', 'home-1b-3']);
    expect(events[0].ballInPlay.primaryFielderId).toBe('home-ss-6');
  });

  it('[M2-2] keeps plain home runs empty but persists robbed-HR fielding credit', () => {
    const context: FieldingExtractionContext = {
      gameId: 'game-6',
      defensiveTeamId: 'TEAM-H',
      atBatEventId: 'game-6_8',
      atBatEventIndex: 8,
      defendersByPosition: {
        CF: { playerId: 'home-cf-8', playerName: 'Casey Center' },
      },
    };

    const plainHrEvents = extractFieldingEvents(
      {
        type: 'hr',
        hitType: 'HR',
        fieldingSequence: [],
      },
      context,
    );

    expect(plainHrEvents).toHaveLength(0);

    const robbedHrEvents = extractFieldingEvents(
      {
        type: 'hr',
        hitType: 'HR',
        fieldingSequence: [8],
        fieldingPlayType: 'robbed_hr',
        exitType: 'Fly Ball',
        spraySector: 'Center',
      },
      context,
    );

    expect(robbedHrEvents).toHaveLength(1);
    expect(robbedHrEvents[0].playType).toBe('putout');
    expect(robbedHrEvents[0].playerId).toBe('home-cf-8');
    expect(robbedHrEvents[0].difficulty).toBe('spectacular');
    expect(robbedHrEvents[0].specialPlayType).toBe('Robbed HR');
  });
});
