import { describe, expect, test } from 'vitest';

import {
  CHEMISTRY_CODES,
  CHEMISTRY_CODE_TO_WORD,
  CHEMISTRY_TARGET_DISTRIBUTION,
  CHEMISTRY_TARGET_SOURCE_TOLERANCE,
} from '../../data/chemistryCanonical';
import type { Player } from '../../utils/leagueBuilderStorage';
import { PERSONALITY_POOL, PERSONALITY_WEIGHTS } from '../../utils/prospectScoutingDraftEngine';
import { regenerateLeaguePoolPlayerAxes } from '../leaguePoolAxisRegen';

// Same-order tolerance as the chemistry distribution test above — wide enough to be flake-proof
// under a fixed seed while still documenting the JK-ruled tilt away from Droopy/Timid.
const PERSONALITY_TARGET_SOURCE_TOLERANCE = 0.03;

function makePlayer(id: string, overrides: Partial<Player> = {}): Player {
  return {
    id,
    firstName: `First${id}`,
    lastName: `Last${id}`,
    gender: 'M',
    age: 25,
    bats: 'R',
    throws: 'R',
    primaryPosition: 'CF',
    power: 70,
    contact: 68,
    speed: 66,
    fielding: 64,
    arm: 62,
    velocity: 30,
    junk: 31,
    accuracy: 32,
    arsenal: ['4F'],
    overallGrade: 'B',
    personality: 'Competitive',
    chemistry: 'Competitive',
    morale: 50,
    mojo: 'Normal',
    fame: 0,
    salary: 10_000,
    leagueAssignments: [{ leagueId: 'league-axis', teamId: 'team-a', rosterStatus: 'MLB' }],
    createdDate: '2026-01-01',
    lastModified: '2026-01-01',
    isCustom: true,
    ...overrides,
  };
}

function makePlayers(count: number): Player[] {
  return Array.from({ length: count }, (_, index) => makePlayer(`player-${index}`));
}

function chemistryCounts(players: readonly Player[]): Record<string, number> {
  return players.reduce<Record<string, number>>((counts, player) => {
    counts[player.chemistry] = (counts[player.chemistry] ?? 0) + 1;
    return counts;
  }, {});
}

describe('regenerateLeaguePoolPlayerAxes RB-0b-1', () => {
  test('same players and leagueId produce identical output', () => {
    const players = makePlayers(37);

    const first = regenerateLeaguePoolPlayerAxes(players, 'league-axis');
    const second = regenerateLeaguePoolPlayerAxes(players, 'league-axis');
    const reversed = regenerateLeaguePoolPlayerAxes([...players].reverse(), 'league-axis');
    const axesById = new Map(first.map((player) => [
      player.id,
      {
        personality: player.personality,
        chemistry: player.chemistry,
        hiddenPersonalityModifiers: player.hiddenPersonalityModifiers,
      },
    ]));

    expect(second).toEqual(first);
    for (const player of reversed) {
      expect({
        personality: player.personality,
        chemistry: player.chemistry,
        hiddenPersonalityModifiers: player.hiddenPersonalityModifiers,
      }).toEqual(axesById.get(player.id));
    }
  });

  test('sets personality, hidden modifiers, and chemistry on every player', () => {
    const personalitySet = new Set(PERSONALITY_POOL);
    const chemistrySet = new Set(Object.values(CHEMISTRY_CODE_TO_WORD));

    const regenerated = regenerateLeaguePoolPlayerAxes(makePlayers(25), 'league-axis');

    for (const player of regenerated) {
      expect(personalitySet.has(player.personality)).toBe(true);
      expect(chemistrySet.has(player.chemistry)).toBe(true);
      expect(player.hiddenPersonalityModifiers).toBeDefined();

      for (const value of Object.values(player.hiddenPersonalityModifiers ?? {})) {
        expect(Number.isFinite(value)).toBe(true);
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThanOrEqual(100);
      }
    }
  });

  test('large pool chemistry distribution lands within target tolerance', () => {
    const playerCount = 250;
    const regenerated = regenerateLeaguePoolPlayerAxes(makePlayers(playerCount), 'league-axis');
    const counts = chemistryCounts(regenerated);

    for (const code of CHEMISTRY_CODES) {
      const word = CHEMISTRY_CODE_TO_WORD[code];
      const actualShare = (counts[word] ?? 0) / playerCount;
      expect(Math.abs(actualShare - CHEMISTRY_TARGET_DISTRIBUTION[code]))
        .toBeLessThanOrEqual(CHEMISTRY_TARGET_SOURCE_TOLERANCE);
    }
  });

  test('large pool personality distribution tilts away from Droopy/Timid per JK-ruled weights', () => {
    const playerCount = 600;
    const regenerated = regenerateLeaguePoolPlayerAxes(makePlayers(playerCount), 'league-axis-personality');
    const counts = regenerated.reduce<Record<string, number>>((acc, player) => {
      acc[player.personality] = (acc[player.personality] ?? 0) + 1;
      return acc;
    }, {});
    const totalWeight = PERSONALITY_WEIGHTS.reduce((sum, [, weight]) => sum + weight, 0);

    expect(Object.keys(counts).sort()).toEqual([...PERSONALITY_POOL].sort());

    for (const [personality, weight] of PERSONALITY_WEIGHTS) {
      const target = weight / totalWeight;
      const actualShare = (counts[personality] ?? 0) / playerCount;
      expect(Math.abs(actualShare - target)).toBeLessThanOrEqual(PERSONALITY_TARGET_SOURCE_TOLERANCE);
    }

    // Droopy and Timid (the tilted-away-from personalities) must each land below every other
    // personality's share — documents the JK ruling, not just the raw tolerance band.
    const droopyShare = (counts['Droopy'] ?? 0) / playerCount;
    const timidShare = (counts['Timid'] ?? 0) / playerCount;
    for (const personality of PERSONALITY_POOL) {
      if (personality === 'Droopy' || personality === 'Timid') continue;
      const share = (counts[personality] ?? 0) / playerCount;
      expect(droopyShare).toBeLessThan(share);
      expect(timidShare).toBeLessThan(share);
    }
  });

  test('small pool preserves quota integrity without crashing', () => {
    const playerCount = 23;
    const regenerated = regenerateLeaguePoolPlayerAxes(makePlayers(playerCount), 'small-league');
    const counts = chemistryCounts(regenerated);

    expect(regenerated).toHaveLength(playerCount);
    expect(Object.values(counts).reduce((sum, count) => sum + count, 0)).toBe(playerCount);
    expect(Object.values(counts).every((count) => Number.isInteger(count) && count >= 0)).toBe(true);
  });

  test('non-axis fields are unchanged and input objects are not mutated', () => {
    const source = makePlayer('field-check', {
      lastName: 'Original',
      primaryPosition: 'SS',
      secondaryPosition: '2B',
      power: 91,
      contact: 82,
      speed: 73,
      fielding: 64,
      arm: 55,
      velocity: 46,
      junk: 37,
      accuracy: 28,
      salary: 123_456,
    });

    const [regenerated] = regenerateLeaguePoolPlayerAxes([source], 'league-axis');

    expect(regenerated).not.toBe(source);
    expect(regenerated).toMatchObject({
      id: source.id,
      firstName: source.firstName,
      lastName: source.lastName,
      primaryPosition: source.primaryPosition,
      secondaryPosition: source.secondaryPosition,
      power: source.power,
      contact: source.contact,
      speed: source.speed,
      fielding: source.fielding,
      arm: source.arm,
      velocity: source.velocity,
      junk: source.junk,
      accuracy: source.accuracy,
      salary: source.salary,
    });
    expect(source.hiddenPersonalityModifiers).toBeUndefined();
    expect(source.personality).toBe('Competitive');
    expect(source.chemistry).toBe('Competitive');
  });
});
