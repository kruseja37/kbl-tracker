import { describe, expect, test } from 'vitest';
import {
  getRotationStarterId,
  resolveOpponentStarterProfile,
} from '../franchiseRotationResolver';

describe('franchise rotation resolver', () => {
  test('cycles through a four-man rotation from completed games played', () => {
    const rotation = ['sp-0', 'sp-1', 'sp-2', 'sp-3'];

    expect(getRotationStarterId(rotation, 0)).toBe('sp-0');
    expect(getRotationStarterId(rotation, 1)).toBe('sp-1');
    expect(getRotationStarterId(rotation, 3)).toBe('sp-3');
    expect(getRotationStarterId(rotation, 4)).toBe('sp-0');
  });

  test('returns null for an empty rotation and guards negative games played', () => {
    expect(getRotationStarterId([], 0)).toBeNull();
    expect(getRotationStarterId(['sp-0', 'sp-1', 'sp-2', 'sp-3'], -1)).toBe('sp-3');
  });

  test('honors manual rotation reorder at the same derived index', () => {
    expect(getRotationStarterId(['sp-0', 'sp-1', 'sp-2', 'sp-3'], 1)).toBe('sp-1');
    expect(getRotationStarterId(['sp-3', 'sp-0', 'sp-1', 'sp-2'], 1)).toBe('sp-0');
  });

  test('maps the opponent next starter to the lineup optimizer profile shape', () => {
    const profile = resolveOpponentStarterProfile('opponent-team', 1, {
      teams: {
        'opponent-team': {
          startingRotation: ['sp-a', 'sp-b', 'sp-c', 'sp-d'],
        },
      },
      players: {
        'sp-b': {
          id: 'sp-b',
          firstName: 'Bree',
          lastName: 'Breaker',
          throws: 'L',
          velocity: 91,
          junk: 84,
          accuracy: 79,
          trait1: 'K Collector',
          trait2: 'Composed',
          arsenal: ['4F', 'SL', 'CH'],
          armSlot: 'Low',
          primaryPosition: 'SP/RP',
        },
      },
    });

    expect(profile).toEqual({
      pitcherId: 'sp-b',
      pitcherName: 'Bree Breaker',
      throws: 'L',
      velocity: 91,
      junk: 84,
      accuracy: 79,
      trait1: 'K Collector',
      trait2: 'Composed',
      traits: ['K Collector', 'Composed'],
      arsenal: ['4F', 'SL', 'CH'],
      armSlot: 'Low',
      pitcherRole: 'SP/RP',
    });
  });

  test('returns null when the derived starter cannot produce a full profile', () => {
    expect(resolveOpponentStarterProfile('opponent-team', 0, {
      teams: { 'opponent-team': { startingRotation: [] } },
      players: {},
    })).toBeNull();

    expect(resolveOpponentStarterProfile('opponent-team', 0, {
      teams: { 'opponent-team': { startingRotation: ['missing-sp'] } },
      players: {},
    })).toBeNull();

    expect(resolveOpponentStarterProfile('opponent-team', 0, {
      teams: { 'opponent-team': { startingRotation: ['sp-a'] } },
      players: { 'sp-a': { id: 'sp-a', throws: 'S' } },
    })).toBeNull();
  });
});
