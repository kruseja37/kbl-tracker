import { describe, expect, test } from 'vitest';
import { FAME_VALUES } from '../../../types/game';
import {
  ELIMINATION_MODE_ROUND,
  addFameEvent,
  createGameFameTracker,
  formatFameEvent,
  resolveFamePlayoffContext,
} from '../../app/engines/fameIntegration';

describe('fameIntegration mode-aware multipliers', () => {
  test('exhibition mode keeps the base 1.0x multiplier', () => {
    const result = formatFameEvent('WALK_OFF', 1, 'exhibition');

    expect(result.playoffMultiplier).toBe(1);
    expect(result.finalFame).toBe(FAME_VALUES.WALK_OFF);
  });

  test('elimination mode uses the documented 1.25x run multiplier', () => {
    const result = formatFameEvent('WALK_OFF', 1, 'elimination');

    expect(ELIMINATION_MODE_ROUND).toBe('wild_card');
    expect(result.playoffMultiplier).toBe(1.25);
    expect(result.finalFame).toBe(FAME_VALUES.WALK_OFF * 1.25);
  });

  test('playoff mode preserves round-based multiplier logic', () => {
    const result = formatFameEvent('WALK_OFF', 1, 'playoff', {
      isPlayoffs: true,
      round: 'world_series',
      isClinchGame: true,
    });

    expect(result.playoffMultiplier).toBe(2.25);
    expect(result.finalFame).toBe(FAME_VALUES.WALK_OFF * 2.25);
  });

  test('franchise mode stays on the non-playoff path by default', () => {
    const result = formatFameEvent('WALK_OFF', 1, 'franchise');

    expect(result.playoffMultiplier).toBe(1);
    expect(result.finalFame).toBe(FAME_VALUES.WALK_OFF);
  });

  test('addFameEvent stores the mode-aware multiplier in tracker results', () => {
    const tracker = addFameEvent(
      createGameFameTracker('game-1'),
      'WALK_OFF',
      'player-1',
      'Slugger',
      9,
      'BOTTOM',
      1,
      'elimination'
    );

    expect(tracker.events).toHaveLength(1);
    expect(tracker.events[0].result.playoffMultiplier).toBe(1.25);
    expect(tracker.events[0].result.finalFame).toBe(FAME_VALUES.WALK_OFF * 1.25);
  });

  test('resolveFamePlayoffContext exposes the old broken path clearly', () => {
    expect(resolveFamePlayoffContext('exhibition')).toBeUndefined();
    expect(resolveFamePlayoffContext('elimination')).toEqual({
      isPlayoffs: true,
      round: 'wild_card',
    });
  });
});
