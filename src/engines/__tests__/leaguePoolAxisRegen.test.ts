import { describe, expect, test } from 'vitest';

import { HISTORICAL_LEGENDS_SOURCE_DATABASE } from '../../data/historicalLegendsAppData';
import type { Player } from '../../utils/leagueBuilderStorage';
import { PERSONALITY_POOL, PERSONALITY_WEIGHTS } from '../../utils/prospectScoutingDraftEngine';
import { initializeDraftPoolPlayerAxes } from '../leaguePoolAxisRegen';

const PERSONALITY_TARGET_SOURCE_TOLERANCE = 0.04;

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
    chemistry: 'Spirited',
    morale: 50,
    mojo: 'Normal',
    fame: 0,
    salary: 10_000,
    leagueAssignments: [{ leagueId: 'league-axis', teamId: 'team-a', rosterStatus: 'MLB' }],
    createdDate: '2026-01-01',
    lastModified: '2026-01-01',
    isCustom: false,
    sourceDatabase: 'SMB4',
    ...overrides,
  };
}

function makePlayers(count: number): Player[] {
  return Array.from({ length: count }, (_, index) => makePlayer(`player-${index}`));
}

describe('draft pool personality initialization', () => {
  test('same player identity is deterministic across input order and league locks', () => {
    const players = makePlayers(37);

    const first = initializeDraftPoolPlayerAxes(players, 'league-a');
    const second = initializeDraftPoolPlayerAxes(players, 'league-b');
    const reversed = initializeDraftPoolPlayerAxes([...players].reverse(), 'league-c');
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

  test('initializes non-Legends once, preserves source chemistry, and later locks are no-ops', () => {
    const [initialized] = initializeDraftPoolPlayerAxes([makePlayer('ordinary')], 'league-a');
    expect(PERSONALITY_POOL).toContain(initialized.personality);
    expect(initialized.chemistry).toBe('Spirited');
    expect(initialized.hiddenPersonalityModifiers).toBeDefined();

    const [relocked] = initializeDraftPoolPlayerAxes([initialized], 'league-b');
    expect(relocked).toEqual(initialized);
  });

  test('large imported pool retains the canonical visible-personality weighting', () => {
    const playerCount = 600;
    const initialized = initializeDraftPoolPlayerAxes(makePlayers(playerCount), 'league-axis-personality');
    const counts = initialized.reduce<Record<string, number>>((acc, player) => {
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
  });

  test('Legends keep visible canon and curated hidden modifiers', () => {
    const curated = { loyalty: 91, ambition: 72, resilience: 88, charisma: 96 };
    const legend = makePlayer('hl:ruthb101:career', {
      sourceDatabase: HISTORICAL_LEGENDS_SOURCE_DATABASE,
      historicalSourceId: 'historical:ruthb101',
      personality: 'Egotistical',
      chemistry: 'Competitive',
      hiddenPersonalityModifiers: curated,
    });

    const [initialized] = initializeDraftPoolPlayerAxes([legend], 'league-a');
    expect(initialized.personality).toBe('Egotistical');
    expect(initialized.chemistry).toBe('Competitive');
    expect(initialized.hiddenPersonalityModifiers).toEqual(curated);
  });

  test('Legend card versions share a deterministic person-level fallback without changing personality', () => {
    const career = makePlayer('hl:aaroh101:career', {
      sourceDatabase: HISTORICAL_LEGENDS_SOURCE_DATABASE,
      historicalSourceId: 'historical:aaroh101',
      personality: 'Tough',
    });
    const peak = makePlayer('hl:aaroh101:peak', {
      sourceDatabase: HISTORICAL_LEGENDS_SOURCE_DATABASE,
      historicalSourceId: 'historical:aaroh101',
      personality: 'Tough',
    });

    const [careerResult, peakResult] = initializeDraftPoolPlayerAxes([career, peak], 'league-a');
    expect(careerResult.personality).toBe('Tough');
    expect(peakResult.personality).toBe('Tough');
    expect(careerResult.hiddenPersonalityModifiers).toEqual(peakResult.hiddenPersonalityModifiers);
  });

  test('custom visible personality survives while missing hidden modifiers initialize once', () => {
    const custom = makePlayer('custom', {
      isCustom: true,
      sourceDatabase: undefined,
      personality: 'Jolly',
    });
    const [initialized] = initializeDraftPoolPlayerAxes([custom], 'league-a');
    expect(initialized.personality).toBe('Jolly');
    expect(initialized.chemistry).toBe(custom.chemistry);
    expect(initialized.hiddenPersonalityModifiers).toBeDefined();
  });

  test('generated FARM prospect axes pass through byte-identically', () => {
    const prospect = makePlayer('farm-prospect', {
      draftedAsFarmProspect: true,
      personality: 'Relaxed',
      chemistry: 'Crafty',
      hiddenPersonalityModifiers: { loyalty: 44, ambition: 82, resilience: 71, charisma: 63 },
    });
    const [initialized] = initializeDraftPoolPlayerAxes([prospect], 'league-a');
    expect(initialized).toEqual(prospect);
  });

  test('non-axis fields and input objects remain unchanged', () => {
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

    const [initialized] = initializeDraftPoolPlayerAxes([source], 'league-axis');
    expect(initialized).toMatchObject({
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
      chemistry: source.chemistry,
    });
    expect(source.hiddenPersonalityModifiers).toBeUndefined();
    expect(source.personality).toBe('Competitive');
  });
});
