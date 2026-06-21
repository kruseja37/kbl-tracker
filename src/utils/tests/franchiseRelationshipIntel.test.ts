import { describe, expect, test } from 'vitest';

import {
  buildPreMoveRelationshipAdvisory,
  buildRelationshipIntelTake,
  fnv1aRelationshipIntelSeed,
  isRelationshipIntelUnconfirmed,
  relationshipIntelRoll,
  relationshipIntelSeed,
} from '../franchiseRelationshipIntel';
import {
  franchiseRelationshipEdgeId,
  type RelationshipEdgeRow,
} from '../franchiseRelationshipEdgesStorage';

const scope = {
  franchiseId: 'franchise-1',
  seasonId: 'season-1',
  statsScopeId: 'scope-1',
  seasonNumber: 1,
};

function edge(overrides: Partial<RelationshipEdgeRow> = {}): RelationshipEdgeRow {
  const player1Id = overrides.player1Id ?? 'player-a';
  const player2Id = overrides.player2Id ?? 'player-b';
  const type = overrides.type ?? 'FEUD';
  return {
    ...scope,
    id: franchiseRelationshipEdgeId(scope, player1Id, player2Id, type),
    player1Id,
    player2Id,
    type,
    intensity: 0.91,
    potential: false,
    accuracy: 0.83,
    formedAtGameNumber: 4,
    dissolvedAtGameNumber: null,
    createdAt: 1781990400000,
    updatedAt: 1781990400000,
    ...overrides,
  };
}

describe('franchise relationship intel REP-4', () => {
  test('uses deterministic FNV-1a seed and flat ten-percent hedge flag', () => {
    const input = {
      franchiseId: scope.franchiseId,
      seasonId: scope.seasonId,
      moveId: 'move-430',
    };

    expect(relationshipIntelSeed(input)).toBe('franchise-1:season-1:move-430');
    expect(fnv1aRelationshipIntelSeed(relationshipIntelSeed(input))).toBe(6322316);
    expect(relationshipIntelRoll(input)).toBe(0.0014720289036631584);
    expect(isRelationshipIntelUnconfirmed(input)).toBe(true);
    expect(isRelationshipIntelUnconfirmed({ ...input, moveId: 'move-1' })).toBe(false);
  });

  test('make-or-break: unconfirmed intel never mutates or distorts the stored edge', () => {
    const row = edge({ type: 'FEUD', intensity: 0.91, accuracy: 0.83 });
    const before = { ...row };

    const take = buildRelationshipIntelTake(row, {
      franchiseId: scope.franchiseId,
      seasonId: scope.seasonId,
      moveId: 'move-430',
    });

    expect(take.unconfirmed).toBe(true);
    expect(take.confidence).toBe('unconfirmed');
    expect(take.type).toBe('FEUD');
    expect(take.intensity).toBe(0.91);
    expect(take.edgeAccuracy).toBe(0.83);
    expect(row).toEqual(before);
  });

  test('pre-move advisory returns active and potential intel but never blocks the move', () => {
    const active = edge({ player1Id: 'moving-player', player2Id: 'teammate', potential: false, intensity: 0.8 });
    const potential = edge({
      player1Id: 'future-player',
      player2Id: 'moving-player',
      type: 'FRIENDSHIP',
      potential: true,
      intensity: 0.05,
      formedAtGameNumber: null,
    });
    const dissolved = edge({
      player1Id: 'moving-player',
      player2Id: 'old-edge',
      type: 'RIVALRY',
      dissolvedAtGameNumber: 8,
      intensity: 0.95,
    });

    const report = buildPreMoveRelationshipAdvisory({
      franchiseId: scope.franchiseId,
      seasonId: scope.seasonId,
      moveId: 'move-1',
      movedPlayerIds: ['moving-player'],
      edges: [dissolved, potential, active],
    });

    expect(report.status).toBe('checked');
    expect(report.blocked).toBe(false);
    expect(report.advisoryOnly).toBe(true);
    expect(report.intel.map((take) => take.edgeId)).toEqual([potential.id, active.id]);
    expect(report.intel.every((take) => take.confidence === 'confirmed')).toBe(true);
  });
});
