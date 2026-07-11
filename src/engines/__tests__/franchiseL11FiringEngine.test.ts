import { describe, expect, test } from 'vitest';

import {
  FRANCHISE_L11_FIRING_TUNING,
  computeFranchiseL11Firing,
  type FranchiseL11FiringPlayer,
} from '../franchiseL11FiringEngine';

function player(overrides: Partial<FranchiseL11FiringPlayer> = {}): FranchiseL11FiringPlayer {
  return {
    id: 'player-1',
    valueDelta: -100000,
    personality: 'COMPETITIVE',
    loyalty: 50,
    resilience: 50,
    ...overrides,
  };
}

function firingDelta(overrides: Partial<FranchiseL11FiringPlayer> = {}): number {
  return computeFranchiseL11Firing({
    teamFanMorale: 50,
    players: [player(overrides)],
  }).playerRipples[0].moraleDelta;
}

describe('franchiseL11FiringEngine L11-1 pure manager-firing engine', () => {
  test('net-positive player is untouchable with zero morale ripple', () => {
    const report = computeFranchiseL11Firing({
      teamFanMorale: 50,
      players: [player({ id: 'positive-player', valueDelta: 1 })],
    });

    expect(report.playerRipples).toEqual([
      {
        playerId: 'positive-player',
        moraleDelta: 0,
        untouchable: true,
      },
    ]);
  });

  test('net-negative player receives a negative morale ripple and is not untouchable', () => {
    const report = computeFranchiseL11Firing({
      teamFanMorale: 50,
      players: [player({ id: 'negative-player', valueDelta: -100000 })],
    });

    expect(report.playerRipples[0]).toMatchObject({
      playerId: 'negative-player',
      untouchable: false,
    });
    expect(report.playerRipples[0].moraleDelta).toBeLessThan(0);
  });

  test('severity is monotonic: a more-underwater valueDelta yields a larger-magnitude hit', () => {
    const mild = firingDelta({ valueDelta: -50000 });
    const severe = firingDelta({ valueDelta: -150000 });

    expect(Math.abs(severe)).toBeGreaterThan(Math.abs(mild));
  });

  test('loyal players take a bigger hit than disloyal players', () => {
    const disloyal = firingDelta({ loyalty: 0 });
    const loyal = firingDelta({ loyalty: 100 });

    expect(Math.abs(loyal)).toBeGreaterThan(Math.abs(disloyal));
  });

  test('resilient players take a smaller hit than non-resilient players', () => {
    const nonResilient = firingDelta({ resilience: 0 });
    const resilient = firingDelta({ resilience: 100 });

    expect(Math.abs(resilient)).toBeLessThan(Math.abs(nonResilient));
  });

  test('EGOTISTICAL players take a smaller hit than TIMID and DROOPY players', () => {
    const egotistical = firingDelta({ personality: 'EGOTISTICAL' });
    const timid = firingDelta({ personality: 'TIMID' });
    const droopy = firingDelta({ personality: 'DROOPY' });

    expect(Math.abs(egotistical)).toBeLessThan(Math.abs(timid));
    expect(Math.abs(egotistical)).toBeLessThan(Math.abs(droopy));
  });

  test('relief scales up as team fan morale drops and clamps at reliefMax', () => {
    const neutral = computeFranchiseL11Firing({ teamFanMorale: 50, players: [] });
    const struggling = computeFranchiseL11Firing({ teamFanMorale: 25, players: [] });
    const bottomed = computeFranchiseL11Firing({ teamFanMorale: -100, players: [] });

    expect(neutral.reliefBumpDelta).toBe(0);
    expect(struggling.reliefBumpDelta).toBeGreaterThan(neutral.reliefBumpDelta);
    expect(struggling.reliefBumpDelta).toBe(8);
    expect(bottomed.reliefBumpDelta).toBe(FRANCHISE_L11_FIRING_TUNING.reliefMax);
  });

  test('firing a beloved manager causes continuously scaled fan backlash', () => {
    const neutral = computeFranchiseL11Firing({ teamFanMorale: 50, players: [] });
    const liked = computeFranchiseL11Firing({ teamFanMorale: 80, players: [] });
    const adored = computeFranchiseL11Firing({ teamFanMorale: 100, players: [] });

    expect(neutral.reliefBumpDelta).toBe(0);
    expect(liked.reliefBumpDelta).toBeLessThan(0);
    expect(adored.reliefBumpDelta).toBeLessThan(liked.reliefBumpDelta);
    expect(computeFranchiseL11Firing({ teamFanMorale: 25, players: [] }).reliefBumpDelta).toBe(8);
  });

  test('extreme valueDelta respects rippleFloor', () => {
    const report = computeFranchiseL11Firing(
      {
        teamFanMorale: 50,
        players: [player({ valueDelta: -100000000, personality: 'TIMID', loyalty: 100, resilience: 0 })],
      },
      {
        ...FRANCHISE_L11_FIRING_TUNING,
        rippleBase: -10,
      },
    );

    expect(report.playerRipples[0].moraleDelta).toBe(FRANCHISE_L11_FIRING_TUNING.rippleFloor);
  });

  test('same input produces a deeply equal deterministic report sorted by playerId', () => {
    const input = {
      teamFanMorale: 25,
      players: [
        player({ id: 'z-player', valueDelta: -50000, personality: 'DROOPY' }),
        player({ id: 'a-player', valueDelta: 0, personality: 'RELAXED' }),
      ],
      reason: 'user' as const,
    };

    const first = computeFranchiseL11Firing(input);
    const second = computeFranchiseL11Firing(input);

    expect(second).toEqual(first);
    expect(first.playerRipples.map((ripple) => ripple.playerId)).toEqual(['a-player', 'z-player']);
  });

  test('absent loyalty and resilience are treated as neutral 50', () => {
    const absent = firingDelta({ loyalty: undefined, resilience: undefined });
    const explicitNeutral = firingDelta({ loyalty: 50, resilience: 50 });

    expect(absent).toBe(explicitNeutral);
  });
});
