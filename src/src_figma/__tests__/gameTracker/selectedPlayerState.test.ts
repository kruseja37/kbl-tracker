import { describe, expect, test } from 'vitest';

import {
  buildSelectedLineupPlayerCard,
  findRunnerBaseForSelectedPlayer,
  resolveSelectedPlayerCardState,
} from '../../app/utils/selectedPlayerState';

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

describe('buildSelectedLineupPlayerCard', () => {
  test('preserves pitcher card behavior while exposing runner actions when the pitcher is on base', () => {
    expect(
      buildSelectedLineupPlayerCard({
        playerId: 'away-sp',
        playerName: 'Away Starter',
        isPitcher: true,
        runnerBase: 'second',
      }),
    ).toEqual({
      name: 'Away Starter',
      type: 'pitcher',
      playerId: 'away-sp',
      runnerBase: 'second',
    });
  });
});

describe('findRunnerBaseForSelectedPlayer', () => {
  test('does not match same-name runners when both selected player and runner have different ids', () => {
    expect(
      findRunnerBaseForSelectedPlayer(
        {
          second: { playerId: 'runner-1', name: 'Sam Lee' },
        },
        'pitcher-1',
        'Sam Lee',
      ),
    ).toBeNull();
  });

  test('matches a pitcher baserunner by id even when preserving pitcher card type', () => {
    const runnerBase = findRunnerBaseForSelectedPlayer(
      {
        second: { playerId: 'pitcher-1', name: 'Sam Lee' },
      },
      'pitcher-1',
      'Sam Lee',
    );

    expect(runnerBase).toBe('second');
    expect(
      buildSelectedLineupPlayerCard({
        playerId: 'pitcher-1',
        playerName: 'Sam Lee',
        isPitcher: true,
        runnerBase: runnerBase || undefined,
      }),
    ).toEqual({
      name: 'Sam Lee',
      type: 'pitcher',
      playerId: 'pitcher-1',
      runnerBase: 'second',
    });
  });
});
