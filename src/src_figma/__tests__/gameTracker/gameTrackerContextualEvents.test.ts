import { describe, expect, test } from 'vitest';

import {
  CONTEXTUAL_BUTTONS_TIMEOUT,
  getEventEmoji,
  getEventLabel,
  inferContextualButtons,
  type PlayContext,
} from '../../app/utils/gameTrackerContextualEvents';

describe('gameTrackerContextualEvents', () => {
  test('infers robbery and web gem for deep outfield catches', () => {
    const context: PlayContext = {
      playType: 'FO',
      firstFielder: 8,
      ballLocationY: 0.95,
      throwSequence: [8],
      runnerOut: false,
      throwTarget: null,
      timestamp: Date.now(),
    };

    expect(inferContextualButtons(context)).toEqual([
      'ROBBERY',
      'WEB_GEM',
      'TOOTBLAN',
    ]);
  });

  test('adds pitcher contact and infield-hit modifiers when appropriate', () => {
    const context: PlayContext = {
      playType: '1B',
      firstFielder: 1,
      ballLocationY: 0.4,
      throwSequence: [1, 3],
      runnerOut: false,
      throwTarget: 3,
      timestamp: Date.now(),
    };

    expect(inferContextualButtons(context)).toEqual([
      'KILLED_PITCHER',
      'NUT_SHOT',
      'BEAT_THROW',
      'BUNT',
    ]);
  });

  test('formats event display helpers consistently', () => {
    expect(CONTEXTUAL_BUTTONS_TIMEOUT).toBe(3000);
    expect(getEventEmoji('WEB_GEM')).toBe('⭐');
    expect(getEventLabel('KILLED_PITCHER')).toBe('KILLED');
  });
});
