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
  getFranchiseRelationshipEdge,
  getFranchiseRelationshipEdgesByScope,
  putFranchiseRelationshipEdge,
  resetFranchiseRelationshipEdgesForTests,
  type RelationshipEdgeRow,
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

function deterministicEdge(gameNumber: number, potential = false) {
  return {
    player1Id: 'mentor',
    player2Id: 'young',
    type: 'FRIENDSHIP' as const,
    intensity: potential ? 0.72 : 0.9,
    potential,
    accuracy: 0.9,
    score: 0.9,
    threshold: 0.84,
    seededRoll: 0,
    seed: `formation-game-${gameNumber}`,
  };
}

function neutralOrganicRoster(): RelationshipFormationRosterEntry[] {
  return Array.from({ length: 10 }, (_, index) => ({
    playerId: `neutral-${String(index + 1).padStart(2, '0')}`,
    teamId: 'team-neutral',
    personality: 'Relaxed',
    age: 27,
    modifiers: { loyalty: 92, ambition: 50, resilience: 92, charisma: 92 },
  }));
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

  test('same-game replay leaves byte-identical rows and a stable formedAtGameNumber', async () => {
    setFranchisePhase2L13EnabledForTests(true);
    seedCheckpointReads(19);
    vi.spyOn(relationshipFormationSeam, 'resolveRelationshipFormationRoster').mockResolvedValue(roster());
    vi.spyOn(relationshipFormationSeam, 'computeRelationshipFormationEdges').mockImplementation((_players, context) => [
      deterministicEdge(context.gameNumber),
    ]);

    const first = await persistDarkRelationshipFormationForCompletedGame(gameState(), scope);
    const firstJson = await readRowsJson();
    const second = await persistDarkRelationshipFormationForCompletedGame(gameState(), scope);
    const secondJson = await readRowsJson();
    const secondRows = await getFranchiseRelationshipEdgesByScope(scope);

    expect(first.status).toBe('written');
    expect(first.written).toBe(1);
    expect(second).toEqual({ status: 'written', written: 0 });
    expect(secondJson).toBe(firstJson);
    expect(new Set(secondRows.map((row) => row.id)).size).toBe(secondRows.length);
    expect(secondRows.every((row) => row.formedAtGameNumber === 19 && row.potential === false)).toBe(true);
    expect(secondRows.every((row) => row.id === franchiseRelationshipEdgeId(scope, row.player1Id, row.player2Id, row.type))).toBe(true);
  });

  test('existing active edge is never rewritten', async () => {
    setFranchisePhase2L13EnabledForTests(true);
    seedCheckpointReads(20);
    vi.spyOn(relationshipFormationSeam, 'resolveRelationshipFormationRoster').mockResolvedValue(roster());
    vi.spyOn(relationshipFormationSeam, 'computeRelationshipFormationEdges').mockReturnValue([{
      player1Id: 'mentor',
      player2Id: 'young',
      type: 'RIVALRY',
      intensity: 0.8,
      potential: false,
      accuracy: 0.9,
      score: 0.9,
      threshold: 0.78,
      seededRoll: 0,
      seed: 'formation-retry',
    }]);
    const id = franchiseRelationshipEdgeId(scope, 'mentor', 'young', 'RIVALRY');
    const existing: RelationshipEdgeRow = {
      id,
      ...scope,
      player1Id: 'mentor',
      player2Id: 'young',
      type: 'RIVALRY',
      formationSource: 'overtake',
      intensity: 0.5,
      potential: false,
      accuracy: 1,
      formedAtGameNumber: 7,
      dissolvedAtGameNumber: null,
      createdAt: 700,
      updatedAt: 700,
    };
    await putFranchiseRelationshipEdge(existing);
    mocks.syncEngine.upsert.mockReset();

    const result = await persistDarkRelationshipFormationForCompletedGame(gameState(), scope);
    const row = await getFranchiseRelationshipEdge(id);

    expect(result).toEqual({ status: 'written', written: 0 });
    expect(row).toEqual(existing);
    expect(mocks.syncEngine.upsert).not.toHaveBeenCalled();
  });

  test('formation occurs on a non-boundary completed game', async () => {
    setFranchisePhase2L13EnabledForTests(true);
    seedCheckpointReads(19);
    vi.spyOn(relationshipFormationSeam, 'resolveRelationshipFormationRoster').mockResolvedValue(roster());
    vi.spyOn(relationshipFormationSeam, 'computeRelationshipFormationEdges').mockImplementation((_players, context) => [
      deterministicEdge(context.gameNumber),
    ]);

    const result = await persistDarkRelationshipFormationForCompletedGame(gameState(), scope);
    const rows = await getFranchiseRelationshipEdgesByScope(scope);

    expect(result).toEqual({ status: 'written', written: 1 });
    expect(relationshipFormationSeam.resolveRelationshipFormationRoster).toHaveBeenCalledOnce();
    expect(rows).toHaveLength(1);
    expect(rows[0].formedAtGameNumber).toBe(19);
  });

  test('identical season fixture produces identical rows at standard and frequent checkpoint cadence', async () => {
    setFranchisePhase2L13EnabledForTests(true);
    vi.spyOn(relationshipFormationSeam, 'resolveRelationshipFormationRoster').mockResolvedValue(neutralOrganicRoster());

    async function runFixture(checkpointCadence: 'standard' | 'frequent'): Promise<string> {
      await clearFranchiseRelationshipEdgesForTests();
      for (let gameNumber = 1; gameNumber <= 20; gameNumber += 1) {
        seedCheckpointReads(gameNumber, { checkpointCadence });
        await persistDarkRelationshipFormationForCompletedGame(
          gameState({ savedAt: 1781990400000 + gameNumber }),
          scope,
        );
      }
      return readRowsJson();
    }

    const standardRows = await runFixture('standard');
    const frequentRows = await runFixture('frequent');

    expect(frequentRows).toBe(standardRows);
    expect(JSON.parse(standardRows)).toHaveLength((10 * 9) / 2);
  });

  test('potential edge upgrades to active at the upgrade game while preserving createdAt', async () => {
    setFranchisePhase2L13EnabledForTests(true);
    seedCheckpointReads(19);
    vi.spyOn(relationshipFormationSeam, 'resolveRelationshipFormationRoster').mockResolvedValue(roster());
    vi.spyOn(relationshipFormationSeam, 'computeRelationshipFormationEdges').mockImplementation((_players, context) => [
      deterministicEdge(context.gameNumber),
    ]);
    const id = franchiseRelationshipEdgeId(scope, 'mentor', 'young', 'FRIENDSHIP');
    const potential: RelationshipEdgeRow = {
      id,
      ...scope,
      player1Id: 'mentor',
      player2Id: 'young',
      type: 'FRIENDSHIP',
      formationSource: 'formation',
      intensity: 0.4,
      potential: true,
      accuracy: 0.7,
      formedAtGameNumber: null,
      dissolvedAtGameNumber: null,
      createdAt: 1234,
      updatedAt: 1234,
    };
    await putFranchiseRelationshipEdge(potential);

    const result = await persistDarkRelationshipFormationForCompletedGame(gameState(), scope);
    const upgraded = await getFranchiseRelationshipEdge(id);

    expect(result).toEqual({ status: 'written', written: 1 });
    expect(upgraded).toEqual({
      ...potential,
      intensity: 0.9,
      potential: false,
      accuracy: 0.9,
      formedAtGameNumber: 19,
      createdAt: 1234,
      updatedAt: gameState().savedAt,
    });
  });

  test('organic neutral fixture spreads formation across games and leaves candidates unformed', async () => {
    setFranchisePhase2L13EnabledForTests(true);
    vi.spyOn(relationshipFormationSeam, 'resolveRelationshipFormationRoster').mockResolvedValue(neutralOrganicRoster());

    for (let gameNumber = 1; gameNumber <= 3; gameNumber += 1) {
      seedCheckpointReads(gameNumber);
      await persistDarkRelationshipFormationForCompletedGame(
        gameState({ savedAt: 1781990400000 + gameNumber }),
        scope,
      );
    }

    const rows = await getFranchiseRelationshipEdgesByScope(scope);
    const friendshipCandidateCount = (10 * 9) / 2;
    const formedAtGameNumbers = new Set(rows.map((row) => row.formedAtGameNumber));

    expect(formedAtGameNumbers.size).toBeGreaterThanOrEqual(3);
    expect(rows.length).toBeGreaterThan(0);
    expect(rows.length).toBeLessThan(friendshipCandidateCount);
    expect(rows.every((row) => row.type === 'FRIENDSHIP' && row.potential === false)).toBe(true);
  });
});
