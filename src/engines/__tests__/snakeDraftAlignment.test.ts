import { describe, expect, test } from 'vitest';

import { HISTORICAL_ARCHETYPES } from '../../data/historicalArchetypes';
import type { LeagueBuilderMlbDraftSession, Player } from '../../utils/leagueBuilderStorage';
import {
  buildSnakeDraftAlignmentInputs,
  computeSnakeDraftAlignment,
  snakeDraftAlignmentGrade,
  snakeDraftAlignmentRoomRank,
  snakePlayerArchetypeFitMultiplier,
} from '../snakeDraftAlignment';

function player(id: string, position: Player['primaryPosition'], rating: number): Player {
  return {
    id, firstName: id, lastName: 'Player', gender: 'M', age: 25, bats: 'R', throws: 'R',
    primaryPosition: position, power: rating, contact: rating, speed: rating, fielding: rating,
    arm: rating, velocity: rating, junk: rating, accuracy: rating, arsenal: [], overallGrade: 'B',
    personality: 'Competitive', chemistry: 'Competitive', morale: 50, mojo: 'Normal', fame: 0,
    salary: 10_000, leagueAssignments: [], createdDate: '2026-01-01', lastModified: '2026-01-01',
    isCustom: false,
  };
}

describe('Snake draft archetype alignment', () => {
  test('eight teams receive a curved best boost, worst nerf, and ordered middle', () => {
    const teams = Array.from({ length: 8 }, (_, index) => ({
      teamId: `team-${index}`,
      fitMultipliers: [0.93 + (index * 0.02)],
    }));
    const results = computeSnakeDraftAlignment(teams);
    expect(results[0]).toMatchObject({ normalizedRank: 0, delta: -15, startingFanMorale: 35 });
    expect(results[7]).toMatchObject({ normalizedRank: 1, delta: 15, startingFanMorale: 65 });
    expect(results.map((row) => row.startingFanMorale)).toEqual(
      [...results].sort((left, right) => left.alignmentScore - right.alignmentScore)
        .map((row) => row.startingFanMorale),
    );
  });

  test('ties split the tied rank and all-equal rooms stay neutral', () => {
    const tied = computeSnakeDraftAlignment([
      { teamId: 'a', fitMultipliers: [0.9] },
      { teamId: 'b', fitMultipliers: [1.1] },
      { teamId: 'c', fitMultipliers: [1.1] },
    ]);
    expect(tied.find((row) => row.teamId === 'b')?.normalizedRank).toBe(0.75);
    expect(tied.find((row) => row.teamId === 'c')?.normalizedRank).toBe(0.75);
    expect(snakeDraftAlignmentRoomRank(tied, 'b')).toBe(1);
    expect(snakeDraftAlignmentRoomRank(tied, 'c')).toBe(1);
    expect(snakeDraftAlignmentRoomRank(tied, 'a')).toBe(3);

    expect(computeSnakeDraftAlignment([
      { teamId: 'a', fitMultipliers: [1] },
      { teamId: 'b', fitMultipliers: [1] },
    ])).toEqual([
      expect.objectContaining({ teamId: 'a', delta: 0, startingFanMorale: 50 }),
      expect.objectContaining({ teamId: 'b', delta: 0, startingFanMorale: 50 }),
    ]);
  });

  test('cumulative score is the equal-weight mean and empty clubs are neutral', () => {
    const results = computeSnakeDraftAlignment([
      { teamId: 'picked', fitMultipliers: [1.08, 1.04, 0.98] },
      { teamId: 'empty', fitMultipliers: [] },
    ]);
    expect(results.find((row) => row.teamId === 'picked')).toMatchObject({ pickCount: 3, alignmentScore: 1.0333 });
    expect(results.find((row) => row.teamId === 'empty')).toMatchObject({ pickCount: 0, alignmentScore: 1 });
  });

  test('grade thresholds share the room fit law', () => {
    expect(snakeDraftAlignmentGrade(1.04)).toBe('STRONG');
    expect(snakeDraftAlignmentGrade(1.0399)).toBe('SOLID');
    expect(snakeDraftAlignmentGrade(0.9601)).toBe('SOLID');
    expect(snakeDraftAlignmentGrade(0.96)).toBe('WEAK');
  });

  test('missing/balanced archetype degrades to neutral fit', () => {
    expect(snakePlayerArchetypeFitMultiplier(player('p', 'CF', 99), null)).toBe(1);
    expect(snakePlayerArchetypeFitMultiplier(player('p', 'CF', 99), 'missing')).toBe(1);
  });

  test('role-specific pitcher ratings produce a non-neutral exact fit', () => {
    const bullpenArchetype = HISTORICAL_ARCHETYPES.find((archetype) => (
      archetype.boosts.some((stat) => stat.startsWith('PEN_'))
    ));
    expect(bullpenArchetype).toBeDefined();
    const fit = snakePlayerArchetypeFitMultiplier(player('rp', 'RP', 99), bullpenArchetype!.id);
    expect(fit).not.toBe(1);
  });

  test('session builder applies each club archetype only to its own drafted players', () => {
    const archetypeIds = HISTORICAL_ARCHETYPES.slice(0, 2).map((archetype) => archetype.id);
    const session = {
      id: 'session', leagueId: 'league', seasonNumber: 1, seed: 'seed',
      workflowVersion: 'snake', engineMethodVersion: 'snake', tier: 'standard', balanceMode: 'taxed',
      rounds: 1,
      pickOrder: [
        { round: 1, pick: 1, teamId: 'a' },
        { round: 1, pick: 2, teamId: 'b' },
      ],
      completedPicks: [
        { round: 1, pick: 1, teamId: 'a', playerId: 'pa' },
        { round: 1, pick: 2, teamId: 'b', playerId: 'pb' },
      ],
      currentPickIndex: 2,
      snakeSetup: { clubs: [
        { teamId: 'a', archetypeId: archetypeIds[0], gmName: null, hotseat: false },
        { teamId: 'b', archetypeId: archetypeIds[1], gmName: null, hotseat: false },
      ] },
      createdDate: '2026-01-01', lastModified: '2026-01-01',
    } as LeagueBuilderMlbDraftSession;
    const inputs = buildSnakeDraftAlignmentInputs({
      session,
      playersById: new Map([
        ['pa', player('pa', 'CF', 90)],
        ['pb', player('pb', 'RP', 90)],
      ]),
    });
    expect(inputs).toHaveLength(2);
    expect(inputs.every((input) => input.fitMultipliers.length === 1)).toBe(true);
  });

  test('session builder fails closed when a drafted player is missing', () => {
    const session = {
      id: 'session', leagueId: 'league', seasonNumber: 1, seed: 'seed',
      workflowVersion: 'snake', engineMethodVersion: 'snake', tier: 'standard', balanceMode: 'taxed',
      rounds: 1, pickOrder: [{ round: 1, pick: 1, teamId: 'a' }],
      completedPicks: [{ round: 1, pick: 1, teamId: 'a', playerId: 'missing' }],
      currentPickIndex: 1, createdDate: '2026-01-01', lastModified: '2026-01-01',
    } as LeagueBuilderMlbDraftSession;
    expect(() => buildSnakeDraftAlignmentInputs({ session, playersById: new Map() }))
      .toThrow(/missing drafted player/i);
  });
});
