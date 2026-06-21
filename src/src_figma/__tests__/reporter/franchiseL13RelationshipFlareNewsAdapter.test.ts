import { describe, expect, test } from 'vitest';

import {
  buildFranchiseRelationshipFlareSeasonNewsEvent,
  type FranchiseRelationshipFlareNewsInput,
} from '../../app/engines/reporter/franchiseL13RelationshipFlareNewsAdapter';
import {
  buildRelationshipIntelTake,
} from '../../../utils/franchiseRelationshipIntel';
import {
  franchiseRelationshipEdgeId,
  type RelationshipEdgeRow,
} from '../../../utils/franchiseRelationshipEdgesStorage';

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
    intensity: 0.9,
    potential: false,
    accuracy: 0.8,
    formedAtGameNumber: 3,
    dissolvedAtGameNumber: null,
    createdAt: 1781990400000,
    updatedAt: 1781990400000,
    ...overrides,
  };
}

function input(overrides: Partial<FranchiseRelationshipFlareNewsInput> = {}): FranchiseRelationshipFlareNewsInput {
  const row = edge();
  return {
    franchiseId: scope.franchiseId,
    seasonId: scope.seasonId,
    seasonNumber: scope.seasonNumber,
    teamId: 'team-1',
    teamName: 'Moonstars',
    edge: row,
    take: buildRelationshipIntelTake(row, {
      franchiseId: scope.franchiseId,
      seasonId: scope.seasonId,
      moveId: 'move-430',
    }),
    trigger: 'pre-move',
    relationshipFlareSourceEventId: 'relationship-visible-fan-nudge:franchise-1:season-1:scope-1:edge:game-7',
    ...overrides,
  };
}

describe('buildFranchiseRelationshipFlareSeasonNewsEvent', () => {
  test('builds a deterministic SeasonNewsEvent without id or timestamps', () => {
    const first = buildFranchiseRelationshipFlareSeasonNewsEvent(input());
    const second = buildFranchiseRelationshipFlareSeasonNewsEvent(input());

    expect(second).toEqual(first);
    expect(Object.keys(first).sort()).toEqual(
      [
        'dramaticWeight',
        'eventType',
        'facts',
        'franchiseId',
        'seasonId',
        'seasonNumber',
        'subjectIds',
      ].sort(),
    );
    expect(first).not.toHaveProperty('id');
    expect(first).not.toHaveProperty('createdAt');
    expect(first).not.toHaveProperty('timestamp');
  });

  test('copies edge ground truth verbatim while only the take is hedged', () => {
    const row = edge({ type: 'FEUD', intensity: 0.9, accuracy: 0.8 });
    const event = buildFranchiseRelationshipFlareSeasonNewsEvent(input({
      edge: row,
      take: buildRelationshipIntelTake(row, {
        franchiseId: scope.franchiseId,
        seasonId: scope.seasonId,
        moveId: 'move-430',
      }),
    }));

    expect(event.eventType).toBe('RELATIONSHIP_FLARE');
    expect(event.subjectIds).toEqual(['player-a', 'player-b']);
    expect(event.facts).toMatchObject({
      edgeId: row.id,
      relationshipType: 'FEUD',
      intensity: 0.9,
      potential: false,
      edgeAccuracy: 0.8,
      relationshipIntelMoveId: 'move-430',
      relationshipIntelConfidence: 'unconfirmed',
      relationshipIntelUnconfirmed: true,
    });
  });
});
