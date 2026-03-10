import { describe, expect, it } from 'vitest';

import { extractFieldingEvents, type FieldingExtractionContext } from '../../app/utils/fieldingEventExtractor';
import type { PlayData } from '../../app/components/EnhancedInteractiveField';

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
      atBatSequence: 42,
      defendersByPosition: {
        SS: { playerId: 'home-ss-12', playerName: 'Sam Short' },
        '2B': { playerId: 'home-2b-4', playerName: 'Ben Turn' },
        '1B': { playerId: 'home-1b-9', playerName: 'Ian Scoop' },
      },
    };

    const events = extractFieldingEvents(playData, context);

    expect(events).toHaveLength(3);
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
      atBatSequence: 7,
    };

    const events = extractFieldingEvents(playData, context);

    expect(events).toHaveLength(1);
    expect(events[0].playerId).toBe('3B');
    expect(events[0].playerName).toBe('3B');
    expect(events[0].position).toBe('3B');
  });
});
