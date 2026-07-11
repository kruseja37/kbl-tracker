import { describe, expect, test } from 'vitest';
import {
  computeRelationshipFormationEdges,
  L13_3A_RELATIONSHIP_EDGE_TYPES,
  RELATIONSHIP_FORMATION_TUNING,
  relationshipFormationHazardProbability,
  relationshipFormationSeed,
  type RelationshipFormationContext,
  type RelationshipFormationPlayer,
} from '../relationshipFormation';

const CONTEXT: RelationshipFormationContext = {
  franchiseId: 'franchise-1',
  seasonId: 'season-1',
  statsScopeId: 'scope-1',
  gameNumber: 35,
};

function player(
  playerId: string,
  overrides: Partial<RelationshipFormationPlayer> = {},
): RelationshipFormationPlayer {
  return {
    playerId,
    teamId: 'team-1',
    personality: 'Relaxed',
    age: 27,
    modifiers: {
      loyalty: 50,
      ambition: 50,
      resilience: 50,
      charisma: 50,
    },
    ...overrides,
  };
}

describe('relationshipFormation', () => {
  test('forms rivalry only when the pair clears the personality/modifier threshold', () => {
    const hot = computeRelationshipFormationEdges([
      player('p1', { personality: 'Egotistical', modifiers: { loyalty: 0, ambition: 100, resilience: 50, charisma: 50 } }),
      player('p2', { personality: 'Competitive', modifiers: { loyalty: 0, ambition: 100, resilience: 50, charisma: 50 } }),
    ], CONTEXT);
    const cold = computeRelationshipFormationEdges([
      player('p1', { modifiers: { loyalty: 50, ambition: 50, resilience: 50, charisma: 50 } }),
      player('p2', { modifiers: { loyalty: 50, ambition: 50, resilience: 50, charisma: 50 } }),
    ], CONTEXT);

    expect(hot.some((edge) => edge.type === 'RIVALRY')).toBe(true);
    expect(cold.some((edge) => edge.type === 'RIVALRY')).toBe(false);
  });

  test('forms directional feud with the aggressor as player1', () => {
    const edges = computeRelationshipFormationEdges([
      player('target', { personality: 'Timid', modifiers: { loyalty: 50, ambition: 20, resilience: 40, charisma: 0 } }),
      player('aggressor', { personality: 'Egotistical', modifiers: { loyalty: 0, ambition: 100, resilience: 50, charisma: 50 } }),
    ], CONTEXT);
    const feud = edges.find((edge) => edge.type === 'FEUD');

    expect(feud?.player1Id).toBe('aggressor');
    expect(feud?.player2Id).toBe('target');
  });

  test('uses real age for mentorship young/veteran gating', () => {
    const mentor = player('mentor', {
      age: 34,
      personality: 'Jolly',
      modifiers: { loyalty: 100, ambition: 50, resilience: 100, charisma: 100 },
    });
    const young = player('young', { age: 22 });
    const olderProtege = player('older', { age: 25 });

    expect(computeRelationshipFormationEdges([mentor, young], CONTEXT).some((edge) => edge.type === 'MENTORSHIP')).toBe(true);
    expect(computeRelationshipFormationEdges([mentor, olderProtege], CONTEXT).some((edge) => edge.type === 'MENTORSHIP')).toBe(false);
  });

  test('forms friendship only when the pair clears the positive personality/modifier threshold', () => {
    const strong = computeRelationshipFormationEdges([
      player('p1', { personality: 'Relaxed', modifiers: { loyalty: 100, ambition: 50, resilience: 100, charisma: 100 } }),
      player('p2', { personality: 'Jolly', modifiers: { loyalty: 100, ambition: 50, resilience: 100, charisma: 100 } }),
    ], CONTEXT);
    const weak = computeRelationshipFormationEdges([
      player('p1', { personality: 'Egotistical', modifiers: { loyalty: 0, ambition: 100, resilience: 0, charisma: 0 } }),
      player('p2', { personality: 'Timid', modifiers: { loyalty: 0, ambition: 0, resilience: 0, charisma: 0 } }),
    ], CONTEXT);

    expect(strong.some((edge) => edge.type === 'FRIENDSHIP')).toBe(true);
    expect(weak.some((edge) => edge.type === 'FRIENDSHIP')).toBe(false);
  });

  test('marks non-co-rostered candidate relationships as potential', () => {
    const edges = computeRelationshipFormationEdges([
      player('p1', { teamId: 'team-1', modifiers: { loyalty: 100, ambition: 50, resilience: 100, charisma: 100 } }),
      player('p2', { teamId: 'team-2', modifiers: { loyalty: 100, ambition: 50, resilience: 100, charisma: 100 } }),
    ], CONTEXT);
    const friendship = edges.find((edge) => edge.type === 'FRIENDSHIP');

    expect(friendship?.potential).toBe(true);
  });

  test('is deterministic for the same per-game seed and only emits the L13-3a edge types', () => {
    const players = [
      player('p2', { personality: 'Jolly', age: 35, modifiers: { loyalty: 100, ambition: 50, resilience: 100, charisma: 100 } }),
      player('p1', { personality: 'Relaxed', age: 22, modifiers: { loyalty: 100, ambition: 50, resilience: 100, charisma: 100 } }),
    ];
    const first = computeRelationshipFormationEdges(players, CONTEXT);
    const second = computeRelationshipFormationEdges([...players].reverse(), CONTEXT);
    const changedGameContext = { ...CONTEXT, gameNumber: CONTEXT.gameNumber + 1 };

    expect(second).toEqual(first);
    expect(relationshipFormationSeed(changedGameContext, 'p1', 'p2', 'FRIENDSHIP')).not.toBe(
      relationshipFormationSeed(CONTEXT, 'p1', 'p2', 'FRIENDSHIP'),
    );
    expect(first.every((edge) => L13_3A_RELATIONSHIP_EDGE_TYPES.includes(edge.type))).toBe(true);
  });

  test('maps score margin to the ruled per-game hazard bands and caps', () => {
    const threshold = RELATIONSHIP_FORMATION_TUNING.thresholds.FRIENDSHIP;
    const window = RELATIONSHIP_FORMATION_TUNING.seededThresholdWindow;

    expect(relationshipFormationHazardProbability(threshold - window - 0.0001, 'FRIENDSHIP')).toBe(0);
    expect(relationshipFormationHazardProbability(threshold - window, 'FRIENDSHIP')).toBeCloseTo(0.03, 10);
    expect(relationshipFormationHazardProbability(threshold - 0.01, 'FRIENDSHIP')).toBeCloseTo(0.07, 10);
    expect(relationshipFormationHazardProbability(threshold, 'FRIENDSHIP')).toBeCloseTo(0.02, 10);
    expect(relationshipFormationHazardProbability(threshold + 0.1, 'FRIENDSHIP')).toBeCloseTo(0.32, 10);
    expect(relationshipFormationHazardProbability(threshold + 1, 'FRIENDSHIP')).toBe(0.35);
  });

  test('canonicalizes the seeded pair while retaining directional edge output', () => {
    expect(relationshipFormationSeed(CONTEXT, 'z', 'a', 'RIVALRY')).toBe(
      relationshipFormationSeed(CONTEXT, 'a', 'z', 'RIVALRY'),
    );
  });
});
