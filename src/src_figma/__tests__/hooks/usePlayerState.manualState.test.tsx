import { act, renderHook } from '@testing-library/react';
import { describe, expect, test } from 'vitest';

import { getFitnessValue } from '../../../engines/fitnessEngine';
import { usePlayerState } from '../../app/hooks/usePlayerState';

describe('usePlayerState manual player-card setters', () => {
  test('setFitness keeps tracked fitness state in sync for engine consumers', () => {
    const { result } = renderHook(() =>
      usePlayerState({
        gameId: 'manual-state-test',
      }),
    );

    act(() => {
      result.current.registerPlayer('player-1', 'Test Player', 'CF', 0, 'FIT');
    });

    act(() => {
      result.current.setFitness('player-1', 'WEAK');
    });

    const player = result.current.getPlayer('player-1');
    expect(player?.fitnessProfile.currentFitness).toBe('WEAK');
    expect(player?.fitnessProfile.currentValue).toBe(getFitnessValue('WEAK'));
    expect(player?.gameState.currentFitness).toBe('WEAK');

    expect(
      result.current.getAdjustedBattingStats('player-1', {
        power: 100,
        contact: 100,
        speed: 100,
        fielding: 100,
        arm: 100,
      }),
    ).toEqual({
      power: 70,
      contact: 70,
      speed: 70,
      fielding: 70,
      arm: 70,
    });
  });
});
