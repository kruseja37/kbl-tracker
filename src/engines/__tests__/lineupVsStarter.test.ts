import { describe, expect, test } from 'vitest';

import {
  LINEUP_VS_STARTER_ALGORITHM_VERSION,
  optimizeLineupVsStarter,
  type OpponentStarterProfile,
  type ScoutPlayer,
} from '../lineupVsStarter';

function player(overrides: Partial<ScoutPlayer>): ScoutPlayer {
  const position = overrides.primaryPosition ?? '1B';
  return {
    playerId: `player-${position}`,
    playerName: `Player ${position}`,
    bats: 'R',
    primaryPosition: position,
    currentPosition: position,
    power: 58,
    contact: 58,
    speed: 55,
    fielding: 70,
    arm: 70,
    mojo: 'Normal',
    fitness: 'FIT',
    traits: [],
    ...overrides,
  };
}

function starter(overrides: Partial<OpponentStarterProfile> = {}): OpponentStarterProfile {
  return {
    pitcherId: 'opp-sp',
    pitcherName: 'Opp Starter',
    throws: 'R',
    velocity: 60,
    junk: 60,
    accuracy: 60,
    traits: [],
    pitcherRole: 'SP',
    ...overrides,
  };
}

function roster(overrides: Partial<Record<string, Partial<ScoutPlayer>>> = {}): ScoutPlayer[] {
  return [
    player({ playerId: 'catcher', playerName: 'Catcher', primaryPosition: 'C', fielding: 78, arm: 82, ...overrides.C }),
    player({ playerId: 'first', playerName: 'First Base', primaryPosition: '1B', fielding: 62, arm: 60, ...overrides['1B'] }),
    player({ playerId: 'second', playerName: 'Second Base', primaryPosition: '2B', fielding: 76, arm: 72, ...overrides['2B'] }),
    player({ playerId: 'third', playerName: 'Third Base', primaryPosition: '3B', fielding: 74, arm: 80, ...overrides['3B'] }),
    player({ playerId: 'shortstop', playerName: 'Shortstop', primaryPosition: 'SS', fielding: 82, arm: 84, ...overrides.SS }),
    player({ playerId: 'left', playerName: 'Left Field', primaryPosition: 'LF', fielding: 68, arm: 66, ...overrides.LF }),
    player({ playerId: 'center', playerName: 'Center Field', primaryPosition: 'CF', fielding: 84, arm: 78, speed: 72, ...overrides.CF }),
    player({ playerId: 'right', playerName: 'Right Field', primaryPosition: 'RF', fielding: 70, arm: 78, ...overrides.RF }),
    player({ playerId: 'dh', playerName: 'Designated Hitter', primaryPosition: 'DH', power: 78, contact: 74, fielding: 35, arm: 35, ...overrides.DH }),
  ];
}

function snapshot(rosterInput = roster(), opponentStarter = starter()) {
  return optimizeLineupVsStarter({
    teamId: 'team-a',
    mode: 'franchise',
    instanceId: 'season-1',
    dhEnabled: true,
    roster: rosterInput,
    opponentStarter,
  });
}

describe('optimizeLineupVsStarter SCOUT-2', () => {
  test('returns valid OptimalLineupSnapshot content with identity unset', () => {
    const result = snapshot();
    const slotSum = result.slots.reduce((sum, slot) => sum + slot.projectedSlotKblWpa, 0);

    expect(result.slots.length).toBeGreaterThan(0);
    expect(result.slots.every((slot) => Number.isFinite(slot.projectedSlotKblWpa))).toBe(true);
    expect(result.projectedTeamLineupKblWpa).toBeCloseTo(Math.round(slotSum * 10000) / 10000, 8);
    expect(result.algorithmVersion).toBe(LINEUP_VS_STARTER_ALGORITHM_VERSION);
    expect(result.snapshotId).toBe('');
    expect(result.generatedAt).toBe(0);
  });

  test('uses the true-value fielding yardstick at a premium position', () => {
    const highGlove = optimizeLineupVsStarter({
      teamId: 'team-a',
      mode: 'franchise',
      dhEnabled: false,
      roster: roster({
        SS: { fielding: 96, arm: 94, power: 60, contact: 60 },
        DH: { unavailable: true },
      }),
      opponentStarter: starter(),
    });
    const lowGlove = optimizeLineupVsStarter({
      teamId: 'team-a',
      mode: 'franchise',
      dhEnabled: false,
      roster: roster({
        SS: { fielding: 12, arm: 18, power: 60, contact: 60 },
        DH: { unavailable: true },
      }),
      opponentStarter: starter(),
    });
    const highShortstopSlot = highGlove.slots.find((slot) => slot.playerId === 'shortstop');
    const lowShortstopSlot = lowGlove.slots.find((slot) => slot.playerId === 'shortstop');

    expect(highShortstopSlot?.defensivePosition).toBe('SS');
    expect(lowShortstopSlot?.defensivePosition).toBe('SS');
    expect(highShortstopSlot?.projectedSlotKblWpa).toBeGreaterThan(
      lowShortstopSlot?.projectedSlotKblWpa ?? Number.POSITIVE_INFINITY,
    );
  });

  test('changes at least one projected slot value when the actual starter changes', () => {
    const testRoster = roster({
      DH: { playerId: 'split-bat', playerName: 'Split Bat', trait1: 'CON vs RHP', contact: 56, power: 62 },
      RF: { playerId: 'neutral-bat', playerName: 'Neutral Bat', contact: 58, power: 62 },
    });

    const vsRighty = snapshot(testRoster, starter({ pitcherId: 'righty', throws: 'R' }));
    const vsLefty = snapshot(testRoster, starter({ pitcherId: 'lefty', throws: 'L' }));

    expect(
      vsRighty.slots.some((rightySlot) => {
        const leftySlot = vsLefty.slots.find((slot) => slot.playerId === rightySlot.playerId);
        return leftySlot !== undefined && leftySlot.projectedSlotKblWpa !== rightySlot.projectedSlotKblWpa;
      }),
    ).toBe(true);
  });

  test('is pure and deterministic for identical input', () => {
    const input = {
      teamId: 'team-a',
      mode: 'franchise' as const,
      instanceId: 'season-1',
      dhEnabled: true,
      roster: roster(),
      opponentStarter: starter(),
    };

    expect(JSON.stringify(optimizeLineupVsStarter(input))).toBe(
      JSON.stringify(optimizeLineupVsStarter(input)),
    );
  });
});
