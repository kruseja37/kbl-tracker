import 'fake-indexeddb/auto';

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getGame: vi.fn(),
  syncEngine: {
    isSuppressed: vi.fn(() => false),
    upsert: vi.fn(),
    remove: vi.fn(),
  },
}));

vi.mock('../scheduleStorage', () => ({
  getGame: mocks.getGame,
}));

vi.mock('../syncEngine', () => ({
  syncEngine: mocks.syncEngine,
}));

import type { PersistedGameState } from '../gameStorage';
import {
  OVERTAKE_RIVALRY_TUNING,
  persistDarkRelationshipOvertakeForCompletedGame,
} from '../franchiseRelationshipOvertakeCompute';
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
import type { FranchiseStadiumRecordChange } from '../franchiseStadiumRecordsStorage';

const DB_NAME = 'kbl-tracker';
const scope = {
  franchiseId: 'franchise-overtake',
  seasonId: 'season-overtake-1',
  statsScopeId: 'scope-overtake-1',
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
    gameId: 'game-overtake-7',
    scheduleGameId: 'schedule-overtake-7',
    savedAt: 1781990400000,
    inning: 9,
    halfInning: 'BOTTOM',
    outs: 3,
    homeScore: 5,
    awayScore: 4,
    bases: { first: null, second: null, third: null },
    currentBatterIndex: 0,
    atBatCount: 39,
    awayTeamId: 'away',
    homeTeamId: 'home',
    awayTeamName: 'Away',
    homeTeamName: 'Home',
    seasonNumber: scope.seasonNumber,
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

function seedScheduleGame(gameNumber: number): void {
  mocks.getGame.mockResolvedValue({
    id: 'schedule-overtake-7',
    gameNumber,
  });
}

function stadiumChange(overrides: Partial<FranchiseStadiumRecordChange> = {}): FranchiseStadiumRecordChange {
  return {
    stadiumId: 'stadium-overtake',
    recordType: 'farthest-hr-rhb',
    recordKey: 'overall',
    changeKind: 'overtake',
    priorValue: 410,
    priorLeaderPlayerIds: ['player-a'],
    newValue: 425,
    newLeaderPlayerIds: ['player-b'],
    ...overrides,
  };
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
    intensity: 0.9,
    potential: false,
    accuracy: 0.8,
    formedAtGameNumber: 3,
    dissolvedAtGameNumber: null,
    createdAt: 123,
    updatedAt: 123,
    ...overrides,
  };
}

describe('persistDarkRelationshipOvertakeForCompletedGame', () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    resetFranchiseRelationshipEdgesForTests();
    await deleteDatabase(DB_NAME);
    mocks.getGame.mockReset();
    mocks.syncEngine.isSuppressed.mockReturnValue(false);
    mocks.syncEngine.upsert.mockReset();
    setFranchisePhase2L13EnabledForTests(null);
  });

  afterEach(async () => {
    await clearFranchiseRelationshipEdgesForTests();
    setFranchisePhase2L13EnabledForTests(null);
    vi.restoreAllMocks();
  });

  test('flag off is a dark no-op and writes no relationship edge', async () => {
    setFranchisePhase2L13EnabledForTests(false);

    const result = await persistDarkRelationshipOvertakeForCompletedGame(
      gameState(),
      scope,
      [stadiumChange()],
    );

    expect(result).toEqual({ status: 'dark-noop', written: 0, reason: 'Phase-2 L13 disabled.' });
    expect(mocks.getGame).not.toHaveBeenCalled();
    expect(await getFranchiseRelationshipEdgesByScope(scope)).toEqual([]);
  });

  test('flag on writes one event-driven RIVALRY edge for a sole-holder overtake', async () => {
    setFranchisePhase2L13EnabledForTests(true);
    seedScheduleGame(7);

    const result = await persistDarkRelationshipOvertakeForCompletedGame(
      gameState(),
      scope,
      [stadiumChange()],
    );
    const id = franchiseRelationshipEdgeId(scope, 'player-a', 'player-b', 'RIVALRY');
    const row = await getFranchiseRelationshipEdge(id);

    expect(result).toEqual({ status: 'written', written: 1 });
    expect(row).toMatchObject({
      id,
      player1Id: 'player-a',
      player2Id: 'player-b',
      type: 'RIVALRY',
      intensity: OVERTAKE_RIVALRY_TUNING.intensity,
      accuracy: OVERTAKE_RIVALRY_TUNING.accuracy,
      potential: false,
      formedAtGameNumber: 7,
      dissolvedAtGameNumber: null,
      formationSource: 'overtake',
    });
  });

  test('set changes do not write overtake relationship edges', async () => {
    setFranchisePhase2L13EnabledForTests(true);
    seedScheduleGame(7);

    const result = await persistDarkRelationshipOvertakeForCompletedGame(
      gameState(),
      scope,
      [stadiumChange({ changeKind: 'set', priorValue: null, priorLeaderPlayerIds: [] })],
    );

    expect(result).toEqual({ status: 'dark-noop', written: 0, reason: 'No qualifying overtake changes.' });
    expect(await getFranchiseRelationshipEdgesByScope(scope)).toEqual([]);
  });

  test('an existing All-Star snub rivalry survives a later overtake untouched', async () => {
    setFranchisePhase2L13EnabledForTests(true);
    seedScheduleGame(7);
    const existing = edge({
      formationSource: 'asg-snub',
      intensity: 0.9,
      accuracy: 0.9,
      formedAtGameNumber: 3,
    });
    await putFranchiseRelationshipEdge(existing);

    const result = await persistDarkRelationshipOvertakeForCompletedGame(
      gameState(),
      scope,
      [stadiumChange()],
    );
    const row = await getFranchiseRelationshipEdge(existing.id);

    expect(result).toEqual({ status: 'written', written: 0 });
    expect(row).toEqual(existing);
  });

  test('deduplicates repeated same-pair overtakes in one completed game', async () => {
    setFranchisePhase2L13EnabledForTests(true);
    seedScheduleGame(7);

    const result = await persistDarkRelationshipOvertakeForCompletedGame(
      gameState(),
      scope,
      [
        stadiumChange({ recordKey: 'overall' }),
        stadiumChange({ recordKey: 'left-field', priorLeaderPlayerIds: ['player-b'], newLeaderPlayerIds: ['player-a'] }),
      ],
    );
    const rows = await getFranchiseRelationshipEdgesByScope(scope);

    expect(result).toEqual({ status: 'written', written: 1 });
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe(franchiseRelationshipEdgeId(scope, 'player-a', 'player-b', 'RIVALRY'));
  });
});
