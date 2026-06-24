import { describe, expect, test } from 'vitest';

import {
  extractContactQualityTag,
  tallyContactQualityByPlayer,
  type ContactQualityKeyedEvent,
} from '../contactQualityAggregator';

describe('contactQuality tally helpers RA-2CQ-2b', () => {
  test('extractContactQualityTag accepts only persisted contact-quality tags', () => {
    expect(extractContactQualityTag('hard')).toBe('hard');
    expect(extractContactQualityTag('ground_ball')).toBeNull();
    expect(extractContactQualityTag(undefined)).toBeNull();
  });

  test('tallyContactQualityByPlayer groups counts by key and skips excluded events', () => {
    const events: ContactQualityKeyedEvent[] = [
      { key: 'batter-a', result: 'GO', contactType: 'hard' },
      { key: 'batter-a', result: 'FO', contactType: 'normal' },
      { key: 'batter-a', result: 'K', contactType: 'hard' },
      { key: 'batter-a', result: '1B', contactType: 'bunt' },
      { key: 'batter-b', result: 'GO', contactType: 'weak' },
      { key: 'batter-b', result: 'FLO', contactType: 'bloop' },
      { key: 'batter-b', result: 'PO', contactType: 'hard' },
    ];

    const tallies = tallyContactQualityByPlayer(events);

    expect(tallies.get('batter-a')).toEqual({
      rate: null,
      trackedCount: 2,
      goodCount: 1,
      neutralCount: 1,
      weakCount: 0,
    });
    expect(tallies.get('batter-b')).toEqual({
      rate: null,
      trackedCount: 3,
      goodCount: 0,
      neutralCount: 1,
      weakCount: 2,
    });
  });
});
