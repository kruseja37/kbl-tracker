import { describe, expect, test } from 'vitest';

import { toConstructionPlayer, type Player } from '../../hooks/useLeagueBuilderData';

function makePlayer(overrides: Partial<Player>): Player {
  return {
    id: 'player-id',
    firstName: 'Test',
    lastName: 'Player',
    gender: 'M',
    age: 25,
    bats: 'R',
    throws: 'R',
    primaryPosition: 'SS',
    power: 70,
    contact: 71,
    speed: 72,
    fielding: 73,
    arm: 74,
    velocity: 80,
    junk: 81,
    accuracy: 82,
    arsenal: ['4F'],
    overallGrade: 'B',
    personality: 'Competitive',
    chemistry: 'Competitive',
    morale: 50,
    mojo: 'Normal',
    fame: 0,
    salary: 100_000,
    createdDate: '2026-06-01T00:00:00.000Z',
    lastModified: '2026-06-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('toConstructionPlayer', () => {
  test('maps a hitter from flat stored ratings into ConstructionPlayer batting fields', () => {
    const player = makePlayer({
      id: 'hitter-1',
      primaryPosition: 'CF',
      power: 91,
      contact: 82,
      speed: 73,
      fielding: 64,
      arm: 55,
      velocity: 12,
      junk: 13,
      accuracy: 14,
    });

    expect(toConstructionPlayer(player)).toEqual({
      id: 'hitter-1',
      isPitcher: false,
      role: undefined,
      bat: {
        POW: 91,
        CON: 82,
        SPD: 73,
        FLD: 64,
        ARM: 55,
      },
      pit: undefined,
    });
  });

  test('maps a pitcher role and pitching fields while preserving batting fields', () => {
    const player = makePlayer({
      id: 'pitcher-1',
      primaryPosition: 'SP/RP',
      power: 31,
      contact: 32,
      speed: 33,
      fielding: 34,
      arm: 35,
      velocity: 96,
      junk: 87,
      accuracy: 78,
    });

    expect(toConstructionPlayer(player)).toEqual({
      id: 'pitcher-1',
      isPitcher: true,
      role: 'SP/RP',
      bat: {
        POW: 31,
        CON: 32,
        SPD: 33,
        FLD: 34,
        ARM: 35,
      },
      pit: {
        VEL: 96,
        JNK: 87,
        ACC: 78,
      },
    });
  });
});
