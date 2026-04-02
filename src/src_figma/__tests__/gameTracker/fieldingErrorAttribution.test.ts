import { describe, expect, it } from 'vitest';

import {
  buildFieldingErrorAdjustments,
  resolveChargedPlayerIdFromDefensiveAlignment,
} from '../../app/utils/fieldingErrorAttribution';

describe('fieldingErrorAttribution', () => {
  it('[M3-3-batter-error] resolves a charged batter error to the defender at that position', () => {
    expect(
      resolveChargedPlayerIdFromDefensiveAlignment(6, {
        SS: { playerId: 'home-ss-6', playerName: 'Sam Short' },
        '1B': { playerId: 'home-1b-3', playerName: 'Ian Scoop' },
      }),
    ).toBe('home-ss-6');
  });

  it('[M3-3-batter-error] emits the live fielding-error delta when a batter error is added or removed', () => {
    expect(
      buildFieldingErrorAdjustments(null, 'home-ss-6'),
    ).toEqual([{ playerId: 'home-ss-6', delta: 1 }]);

    expect(
      buildFieldingErrorAdjustments('home-ss-6', null),
    ).toEqual([{ playerId: 'home-ss-6', delta: -1 }]);
  });
});
