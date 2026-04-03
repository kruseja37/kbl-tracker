import { describe, expect, test } from 'vitest';

import { resolveSelectedPlayerCardState } from '../../app/utils/selectedPlayerState';

describe('resolveSelectedPlayerCardState', () => {
  test('uses the tracked player state and canonical player id when available', () => {
    expect(
      resolveSelectedPlayerCardState('fallback-home-j-doe', {
        playerData: {
          playerId: 'player-123',
          gameState: {
            currentMojo: 2,
          },
          fitnessProfile: {
            currentFitness: 'STRAINED',
          },
        },
        rosterMojo: 0,
        rosterFitness: 'FIT',
      }),
    ).toEqual({
      playerId: 'player-123',
      currentMojo: 2,
      currentFitness: 'STRAINED',
    });
  });

  test('falls back to roster state when the tracked player is unavailable', () => {
    expect(
      resolveSelectedPlayerCardState('fallback-home-j-doe', {
        rosterMojo: -1,
        rosterFitness: 'WELL',
      }),
    ).toEqual({
      playerId: 'fallback-home-j-doe',
      currentMojo: -1,
      currentFitness: 'WELL',
    });
  });
});
