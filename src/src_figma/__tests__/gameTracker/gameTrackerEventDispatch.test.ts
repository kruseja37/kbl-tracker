import { describe, expect, test } from 'vitest';

import {
  buildRunnerEventDetails,
  deriveRunnerEventType,
  normalizeSpecialEventType,
} from '../../app/utils/gameTrackerEventDispatch';

describe('gameTrackerEventDispatch', () => {
  test('normalizes game tracker field special-event aliases to hook event types', () => {
    expect(normalizeSpecialEventType('KILLED_PITCHER')).toBe('KILLED');
    expect(normalizeSpecialEventType('NUT_SHOT')).toBe('NUTSHOT');
    expect(normalizeSpecialEventType('WEB_GEM')).toBe('WEB_GEM');
    expect(normalizeSpecialEventType('TOOTBLAN')).toBe('TOOTBLAN');
  });

  test('derives pickoff outcomes from runner drag-drop semantics', () => {
    expect(deriveRunnerEventType({
      from: 'first',
      to: 'first',
      outcome: 'safe',
      playType: 'PICK',
    })).toBe('PICK_SAFE');

    expect(deriveRunnerEventType({
      from: 'first',
      to: 'second',
      outcome: 'safe',
      playType: 'PICK',
    })).toBe('PICK_E');

    expect(deriveRunnerEventType({
      from: 'first',
      to: 'second',
      outcome: 'out',
      playType: 'PICK',
    })).toBe('PICK');
  });

  test('encodes runner outs as out destinations for ledger writes', () => {
    expect(buildRunnerEventDetails({
      from: 'second',
      to: 'third',
      outcome: 'out',
      playType: 'CS',
    }, 'runner-2', 'Runner Two')).toEqual({
      runnerId: 'runner-2',
      runnerName: 'Runner Two',
      fromBase: 'second',
      toBase: 'out',
      outcome: 'out',
      fielderPosition: undefined,
      fielderName: undefined,
    });
  });
});
