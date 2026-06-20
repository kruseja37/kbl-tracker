import 'fake-indexeddb/auto';

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getGame: vi.fn(),
  getSeasonMetadata: vi.fn(),
  syncEngine: {
    isSuppressed: vi.fn(() => false),
    upsert: vi.fn(),
    remove: vi.fn(),
  },
}));

vi.mock('../scheduleStorage', () => ({
  getGame: mocks.getGame,
}));

vi.mock('../seasonStorage', () => ({
  getSeasonMetadata: mocks.getSeasonMetadata,
}));

vi.mock('../syncEngine', () => ({
  syncEngine: mocks.syncEngine,
}));

import {
  persistDarkRelationshipFormationForCompletedGame,
  relationshipFormationSeam,
  type RelationshipFormationRosterEntry,
  type RelationshipFormationScope,
} from '../franchiseRelationshipFormationCompute';
import {
  clearFranchiseRelationshipEdgesForTests,
  franchiseRelationshipEdgeId,
  getFranchiseRelationshipEdgesByScope,
  resetFranchiseRelationshipEdgesForTests,
} from '../franchiseRelationshipEdgesStorage';
import { setFranchisePhase2L13EnabledForTests } from '../franchisePhase2Flags';
import type { PersistedGameState } from '../gameStorage';

const DB_NAME = 'kbl-tracker';
const scope: RelationshipFormationScope = {
  franchiseId: 'franchise-l13',
  seasonId: 'season-l13',
  statsScopeId: 'scope-l13',
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

function gameState(overrides: Partial<PersistedGameState> = {}): PersistedGameState {
  return {
    id: 'current',
    gameId: 'game-20',
    scheduleGameId: 'schedule-20',
    savedAt: 1781990400000,
    inning: 9,
    halfInning: 'BOTTOM',
    outs: 3,
    homeScore: 4,
    awayScore: 3,
    bases: { first: null, second: null, third: null },
    currentBatterIndex: 0,
    atBatCount: 42,
    awayTeamId: 'away',
    homeTeamId: 'home',
    awayTeamName: 'Away',
    homeTeamName: 'Home',
    seasonNumber: 1,
    seasonId: scope.seasonId,
    statsScopeId: scope.statsScopeId,
    franchiseId: scope.franchiseId,
    competitionType: 'franchise',
    competitionId: scope.franchiseId,
    playerStats: {},
    pitcherGameStats: [],
    ...overrides,
  } as unknown as PersistedGameState;
}

function seedCheckpointReads(
  gameNumber: number,
  metadataOverrides: Record<string, unknown> = {},
): void {
  mocks.getGame.mockResolvedValue({
    id: 'schedule-20',
    gameNumber,
  });
  mocks.getSeasonMetadata.mockResolvedValue({
    seasonId: scope.seasonId,
    seasonNumber: scope.seasonNumber,
    seasonName: 'L13 Season',
    status: 'active',
    startDate: 1,
    gamesPlayed: gameNumber,
    totalGames: 100,
    gamesPerTeam: null,
    ...metadataOverrides,
  });
}

function roster(): RelationshipFormationRosterEntry[] {
  return [
    {
      playerId: 'mentor',
      teamId: 'team-a',
      personality: 'Jolly',
      age: 35,
      modifiers: { loyalty: 100, ambition: 50, resilience: 100, charisma: 100 },
    },
    {
      playerId: 'young',
      teamId: 'team-a',
      personality: 'Relaxed',
      age: 22,
      modifiers: { loyalty: 100, ambition: 50, resilience: 100, charisma: 100 },
    },
    {
      playerId: 'aggressor',
      teamId: 'team-b',
      personality: 'Egotistical',
      age: 27,
      modifiers: { loyalty: 0, ambition: 100, resilience: 50, charisma: 50 },
    },
    {
      playerId: 'target',
      teamId: 'team-b',
      personality: 'Timid',
      age: 27,
      modifiers: { loyalty: 50, ambition: 20, resilience: 40, charisma: 0 },
    },
  ];
}

async function readRowsJson(): Promise<string> {
  return JSON.stringify(await getFranchiseRelationshipEdgesByScope(scope));
}

describe('persistDarkRelationshipFormationForCompletedGame', () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    resetFranchiseRelationshipEdgesForTests();
    await deleteDatabase(DB_NAME);
    mocks.getGame.mockReset();
    mocks.getSeasonMetadata.mockReset();
    mocks.syncEngine.isSuppressed.mockReturnValue(false);
    mocks.syncEngine.upsert.mockReset();
    setFranchisePhase2L13EnabledForTests(null);
  });

  afterEach(async () => {
    await clearFranchiseRelationshipEdgesForTests();
    setFranchisePhase2L13EnabledForTests(null);
    vi.restoreAllMocks();
  });

  test('flag off is a dark no-op before schedule or season reads', async () => {
    setFranchisePhase2L13EnabledForTests(false);
    vi.spyOn(relationshipFormationSeam, 'resolveRelationshipFormationRoster').mockResolvedValue(roster());

    const result = await persistDarkRelationshipFormationForCompletedGame(gameState(), scope);

    expect(result).toEqual({ status: 'dark-noop', written: 0, reason: 'Phase-2 L13 disabled.' });
    expect(mocks.getGame).not.toHaveBeenCalled();
    expect(mocks.getSeasonMetadata).not.toHaveBeenCalled();
    expect(await getFranchiseRelationshipEdgesByScope(scope)).toEqual([]);
  });

  test('standard cadence checkpoint writes deterministic active relationship rows idempotently', async () => {
    setFranchisePhase2L13EnabledForTests(true);
    seedCheckpointReads(20);
    vi.spyOn(relationshipFormationSeam, 'resolveRelationshipFormationRoster').mockResolvedValue(roster());

    const first = await persistDarkRelationshipFormationForCompletedGame(gameState(), scope);
    const firstRows = await getFranchiseRelationshipEdgesByScope(scope);
    const second = await persistDarkRelationshipFormationForCompletedGame(gameState(), scope);
    const secondRows = await getFranchiseRelationshipEdgesByScope(scope);

    expect(first.status).toBe('written');
    expect(first.written).toBeGreaterThan(0);
    expect(second.status).toBe('written');
    expect(secondRows).toEqual(firstRows);
    expect(new Set(secondRows.map((row) => row.id)).size).toBe(secondRows.length);
    expect(secondRows.every((row) => row.formedAtGameNumber === 20 && row.potential === false)).toBe(true);
    expect(secondRows.every((row) => row.id === franchiseRelationshipEdgeId(scope, row.player1Id, row.player2Id, row.type))).toBe(true);
  });

  test('withholds writes at non-checkpoint games', async () => {
    setFranchisePhase2L13EnabledForTests(true);
    seedCheckpointReads(19);
    vi.spyOn(relationshipFormationSeam, 'resolveRelationshipFormationRoster').mockResolvedValue(roster());

    const result = await persistDarkRelationshipFormationForCompletedGame(gameState(), scope);

    expect(result).toEqual({ status: 'not-checkpoint', written: 0 });
    expect(relationshipFormationSeam.resolveRelationshipFormationRoster).not.toHaveBeenCalled();
    expect(await getFranchiseRelationshipEdgesByScope(scope)).toEqual([]);
  });

  test('honors frequent checkpoint cadence at game 10 of 100', async () => {
    setFranchisePhase2L13EnabledForTests(true);
    seedCheckpointReads(10, { checkpointCadence: 'frequent' });
    vi.spyOn(relationshipFormationSeam, 'resolveRelationshipFormationRoster').mockResolvedValue(roster());

    const result = await persistDarkRelationshipFormationForCompletedGame(gameState(), scope);
    const rows = await getFranchiseRelationshipEdgesByScope(scope);

    expect(result.status).toBe('written');
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.every((row) => row.formedAtGameNumber === 10)).toBe(true);
  });

  test('same seed and checkpoint produce byte-identical rows after clearing the store', async () => {
    setFranchisePhase2L13EnabledForTests(true);
    seedCheckpointReads(20);
    vi.spyOn(relationshipFormationSeam, 'resolveRelationshipFormationRoster').mockResolvedValue(roster());

    await persistDarkRelationshipFormationForCompletedGame(gameState(), scope);
    const firstJson = await readRowsJson();
    await clearFranchiseRelationshipEdgesForTests();
    await persistDarkRelationshipFormationForCompletedGame(gameState(), scope);
    const secondJson = await readRowsJson();

    expect(secondJson).toBe(firstJson);
  });
});
