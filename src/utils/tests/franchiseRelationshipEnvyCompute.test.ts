import 'fake-indexeddb/auto';

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getSeasonMetadata: vi.fn(),
  syncEngine: {
    isSuppressed: vi.fn(() => false),
    upsert: vi.fn(),
    remove: vi.fn(),
  },
}));

vi.mock('../seasonStorage', () => ({
  getSeasonMetadata: mocks.getSeasonMetadata,
}));

vi.mock('../syncEngine', () => ({
  syncEngine: mocks.syncEngine,
}));

import { computeRelationshipIntensity } from '../../engines/relationshipIntensity';
import {
  ENVY_RIVALRY_TUNING,
  persistRaceSnubRivalryEdges,
} from '../franchiseRelationshipEnvyCompute';
import {
  clearFranchiseRelationshipEdgesForTests,
  franchiseRelationshipEdgeId,
  getFranchiseRelationshipEdge,
  getFranchiseRelationshipEdgesByScope,
  putFranchiseRelationshipEdge,
  resetFranchiseRelationshipEdgesForTests,
  type RelationshipEdgeRow,
} from '../franchiseRelationshipEdgesStorage';
import { setFranchisePhase2L13EnabledForTests } from '../franchisePhase2Flags';

const DB_NAME = 'kbl-tracker';
const scope = {
  franchiseId: 'franchise-envy',
  seasonId: 'season-envy-1',
  statsScopeId: 'scope-envy-1',
  seasonNumber: 1,
};

function deleteDatabase(name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => resolve();
  });
}

function edge(overrides: Partial<RelationshipEdgeRow> = {}): RelationshipEdgeRow {
  const player1Id = overrides.player1Id ?? 'player-a';
  const player2Id = overrides.player2Id ?? 'player-b';
  const type = overrides.type ?? 'RIVALRY';
  return {
    franchiseId: scope.franchiseId,
    seasonId: scope.seasonId,
    statsScopeId: scope.statsScopeId,
    id: franchiseRelationshipEdgeId(scope, player1Id, player2Id, type),
    seasonNumber: scope.seasonNumber,
    player1Id,
    player2Id,
    type,
    intensity: 0.5,
    potential: false,
    accuracy: 0.8,
    formedAtGameNumber: 12,
    dissolvedAtGameNumber: null,
    createdAt: 123,
    updatedAt: 123,
    ...overrides,
  };
}

describe('persistRaceSnubRivalryEdges', () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    resetFranchiseRelationshipEdgesForTests();
    await deleteDatabase(DB_NAME);
    mocks.getSeasonMetadata.mockReset();
    mocks.getSeasonMetadata.mockResolvedValue({ totalGames: 60 });
    mocks.syncEngine.isSuppressed.mockReturnValue(false);
    mocks.syncEngine.upsert.mockReset();
    setFranchisePhase2L13EnabledForTests(null);
  });

  afterEach(async () => {
    await clearFranchiseRelationshipEdgesForTests();
    setFranchisePhase2L13EnabledForTests(null);
    vi.restoreAllMocks();
  });

  test('flag off is a dark no-op and does not read season metadata', async () => {
    setFranchisePhase2L13EnabledForTests(false);

    const result = await persistRaceSnubRivalryEdges({
      pairs: [{ snubbedPlayerId: 'player-a', honoredPlayerId: 'player-b' }],
      scope,
      timestamp: 1781990400000,
    });

    expect(result).toEqual({ status: 'dark-noop', written: 0, reason: 'Phase-2 L13 disabled.' });
    expect(mocks.getSeasonMetadata).not.toHaveBeenCalled();
    expect(await getFranchiseRelationshipEdgesByScope(scope)).toEqual([]);
  });

  test('flag on writes one finalize-formed envy RIVALRY edge with lifecycle seed intensity', async () => {
    setFranchisePhase2L13EnabledForTests(true);

    const result = await persistRaceSnubRivalryEdges({
      pairs: [{ snubbedPlayerId: 'player-a', honoredPlayerId: 'player-b' }],
      scope,
      timestamp: 1781990400000,
    });
    const id = franchiseRelationshipEdgeId(scope, 'player-a', 'player-b', 'RIVALRY');
    const row = await getFranchiseRelationshipEdge(id);

    expect(result).toEqual({ status: 'written', written: 1 });
    expect(row).toBeDefined();
    if (!row) throw new Error('Expected envy relationship edge row.');
    const expected = computeRelationshipIntensity(row, {
      gameNumber: 60,
      isChargedMatchup: false,
    });

    expect(row).toMatchObject({
      id,
      player1Id: 'player-a',
      player2Id: 'player-b',
      type: 'RIVALRY',
      accuracy: ENVY_RIVALRY_TUNING.accuracy,
      potential: false,
      formedAtGameNumber: 60,
      dissolvedAtGameNumber: null,
      formationSource: 'envy',
    });
    expect(row.intensity).toBe(expected.intensity);
    expect(row.intensity).toBeGreaterThanOrEqual(0.72);
    expect(row.intensity).toBeLessThanOrEqual(0.9);
  });

  test('deduplicates pairs that canonical-collapse to the same rivalry edge', async () => {
    setFranchisePhase2L13EnabledForTests(true);

    const result = await persistRaceSnubRivalryEdges({
      pairs: [
        { snubbedPlayerId: 'player-a', honoredPlayerId: 'player-b' },
        { snubbedPlayerId: 'player-b', honoredPlayerId: 'player-a' },
      ],
      scope,
      timestamp: 1781990400000,
    });
    const rows = await getFranchiseRelationshipEdgesByScope(scope);

    expect(result).toEqual({ status: 'written', written: 1 });
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe(franchiseRelationshipEdgeId(scope, 'player-a', 'player-b', 'RIVALRY'));
  });

  test('create-if-absent preserves an existing relationship edge untouched', async () => {
    setFranchisePhase2L13EnabledForTests(true);
    const existing = edge({
      formationSource: 'formation',
      intensity: 0.5,
      accuracy: 0.7,
      formedAtGameNumber: 20,
    });
    await putFranchiseRelationshipEdge(existing);

    const result = await persistRaceSnubRivalryEdges({
      pairs: [{ snubbedPlayerId: 'player-a', honoredPlayerId: 'player-b' }],
      scope,
      timestamp: 1781990400000,
    });
    const row = await getFranchiseRelationshipEdge(existing.id);

    expect(result).toEqual({ status: 'dark-noop', written: 0, reason: 'No new envy edges.' });
    expect(row).toEqual(existing);
  });

  test('self-pair guards do not write an envy rivalry edge', async () => {
    setFranchisePhase2L13EnabledForTests(true);

    const result = await persistRaceSnubRivalryEdges({
      pairs: [{ snubbedPlayerId: 'player-a', honoredPlayerId: 'player-a' }],
      scope,
      timestamp: 1781990400000,
    });

    expect(result).toEqual({ status: 'dark-noop', written: 0, reason: 'No new envy edges.' });
    expect(await getFranchiseRelationshipEdgesByScope(scope)).toEqual([]);
  });
});
