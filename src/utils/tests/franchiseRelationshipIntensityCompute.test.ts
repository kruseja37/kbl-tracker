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

import { computeRelationshipIntensity } from '../../engines/relationshipIntensity';
import {
  getRelationshipParticipantTeams,
  isChargedRelationshipMatchup,
  persistDarkRelationshipIntensityForCompletedGame,
  type RelationshipIntensityScope,
} from '../franchiseRelationshipIntensityCompute';
import {
  clearFranchiseRelationshipEdgesForTests,
  franchiseRelationshipEdgeId,
  getFranchiseRelationshipEdgesByScope,
  putFranchiseRelationshipEdge,
  resetFranchiseRelationshipEdgesForTests,
  type RelationshipEdgeRow,
} from '../franchiseRelationshipEdgesStorage';
import { setFranchisePhase2L13EnabledForTests } from '../franchisePhase2Flags';
import type { PersistedGameState } from '../gameStorage';

const DB_NAME = 'kbl-tracker';
const scope: RelationshipIntensityScope = {
  franchiseId: 'franchise-l13-intensity',
  seasonId: 'season-l13-intensity',
  statsScopeId: 'scope-l13-intensity',
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
    franchiseId: overrides.franchiseId ?? scope.franchiseId,
    seasonId: overrides.seasonId ?? scope.seasonId,
    statsScopeId: overrides.statsScopeId ?? scope.statsScopeId,
    id: franchiseRelationshipEdgeId(scope, player1Id, player2Id, type),
    seasonNumber: scope.seasonNumber,
    player1Id,
    player2Id,
    type,
    intensity: 0.9,
    potential: false,
    accuracy: 0.88,
    formedAtGameNumber: 1,
    dissolvedAtGameNumber: null,
    createdAt: 1781990400000,
    updatedAt: 1781990400000,
    ...overrides,
  };
}

function gameState(overrides: Partial<PersistedGameState> = {}): PersistedGameState {
  return {
    id: 'current',
    gameId: 'game-l13-intensity-3',
    scheduleGameId: 'schedule-l13-intensity-3',
    savedAt: 1781990580000,
    inning: 9,
    halfInning: 'BOTTOM',
    outs: 3,
    homeScore: 5,
    awayScore: 2,
    bases: { first: null, second: null, third: null },
    currentBatterIndex: 0,
    atBatCount: 36,
    awayTeamId: 'team-away',
    homeTeamId: 'team-home',
    awayTeamName: 'Away',
    homeTeamName: 'Home',
    seasonNumber: scope.seasonNumber,
    seasonId: scope.seasonId,
    statsScopeId: scope.statsScopeId,
    franchiseId: scope.franchiseId,
    competitionType: 'franchise',
    competitionId: scope.franchiseId,
    playerStats: {
      'player-a': {
        playerName: 'Player A',
        teamId: 'team-away',
        pa: 4,
        ab: 4,
        h: 1,
        singles: 1,
        doubles: 0,
        triples: 0,
        hr: 0,
        rbi: 0,
        r: 1,
        bb: 0,
        hbp: 0,
        k: 1,
        sb: 0,
        cs: 0,
        sf: 0,
        sh: 0,
        gidp: 0,
        putouts: 0,
        assists: 0,
        fieldingErrors: 0,
      },
      'player-b': {
        playerName: 'Player B',
        teamId: 'team-home',
        pa: 4,
        ab: 4,
        h: 1,
        singles: 1,
        doubles: 0,
        triples: 0,
        hr: 0,
        rbi: 0,
        r: 0,
        bb: 0,
        hbp: 0,
        k: 1,
        sb: 0,
        cs: 0,
        sf: 0,
        sh: 0,
        gidp: 0,
        putouts: 0,
        assists: 0,
        fieldingErrors: 0,
      },
    },
    pitcherGameStats: [],
    awayLineup: [],
    homeLineup: [],
    fameEvents: [],
    lastHRBatterId: null,
    consecutiveHRCount: 0,
    inningStrikeouts: 0,
    maxDeficitAway: 0,
    maxDeficitHome: 0,
    activityLog: [],
    ...overrides,
  } as PersistedGameState;
}

function seedScheduleGame(gameNumber: number): void {
  mocks.getGame.mockResolvedValue({
    id: 'schedule-l13-intensity-3',
    gameNumber,
  });
}

async function readRowsJson(): Promise<string> {
  return JSON.stringify(await getFranchiseRelationshipEdgesByScope(scope));
}

describe('persistDarkRelationshipIntensityForCompletedGame', () => {
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

  test('flag off is a dark no-op before schedule reads', async () => {
    await putFranchiseRelationshipEdge(edge());
    setFranchisePhase2L13EnabledForTests(false);

    const before = await readRowsJson();
    const result = await persistDarkRelationshipIntensityForCompletedGame(gameState(), scope);
    const after = await readRowsJson();

    expect(result).toEqual({
      status: 'dark-noop',
      written: 0,
      chargedMatchups: 0,
      dissolved: 0,
      reason: 'Phase-2 L13 disabled.',
    });
    expect(mocks.getGame).not.toHaveBeenCalled();
    expect(after).toBe(before);
  });

  test('detects charged matchups only when both edge players appear on opposing teams', () => {
    const participants = getRelationshipParticipantTeams(gameState());
    expect(isChargedRelationshipMatchup(edge(), participants)).toBe(true);

    const sameTeamParticipants = getRelationshipParticipantTeams(gameState({
      playerStats: {
        ...gameState().playerStats,
        'player-b': {
          ...gameState().playerStats['player-b'],
          teamId: 'team-away',
        },
      },
    }));
    expect(isChargedRelationshipMatchup(edge(), sameTeamParticipants)).toBe(false);

    expect(isChargedRelationshipMatchup(edge({ player2Id: 'missing-player' }), participants)).toBe(false);
  });

  test('flag on recomputes each edge intensity, applies charged bump, and overwrites deterministically', async () => {
    setFranchisePhase2L13EnabledForTests(true);
    seedScheduleGame(3);
    const row = edge({ intensity: 0.99, formedAtGameNumber: 1 });
    await putFranchiseRelationshipEdge(row);

    const result = await persistDarkRelationshipIntensityForCompletedGame(gameState(), scope);
    const rows = await getFranchiseRelationshipEdgesByScope(scope);
    const expected = computeRelationshipIntensity(row, {
      gameNumber: 3,
      isChargedMatchup: true,
    });

    expect(result).toEqual({
      status: 'written',
      written: 1,
      chargedMatchups: 1,
      dissolved: 0,
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      intensity: expected.intensity,
      dissolvedAtGameNumber: null,
      updatedAt: 1781990580000,
    });
  });

  test('same-team participants get the lapsed intensity without a charged bump', async () => {
    setFranchisePhase2L13EnabledForTests(true);
    seedScheduleGame(3);
    const row = edge({ intensity: 0.99, formedAtGameNumber: 1 });
    await putFranchiseRelationshipEdge(row);
    const sameTeamGame = gameState({
      playerStats: {
        ...gameState().playerStats,
        'player-b': {
          ...gameState().playerStats['player-b'],
          teamId: 'team-away',
        },
      },
    });

    const result = await persistDarkRelationshipIntensityForCompletedGame(sameTeamGame, scope);
    const rows = await getFranchiseRelationshipEdgesByScope(scope);
    const expected = computeRelationshipIntensity(row, {
      gameNumber: 3,
      isChargedMatchup: false,
    });

    expect(result.chargedMatchups).toBe(0);
    expect(rows[0].intensity).toBe(expected.intensity);
  });

  test('sets dissolvedAtGameNumber when lapse decay falls below the dissolve threshold', async () => {
    setFranchisePhase2L13EnabledForTests(true);
    seedScheduleGame(100);
    const row = edge({ formedAtGameNumber: 1 });
    await putFranchiseRelationshipEdge(row);

    const result = await persistDarkRelationshipIntensityForCompletedGame(gameState(), scope);
    const rows = await getFranchiseRelationshipEdgesByScope(scope);

    expect(result.dissolved).toBe(1);
    expect(rows[0].dissolvedAtGameNumber).toBe(100);
    expect(rows[0].intensity).toBe(
      computeRelationshipIntensity(row, { gameNumber: 100, isChargedMatchup: true }).intensity,
    );
  });

  test('replaying the same completed game writes byte-identical rows without double-decay', async () => {
    setFranchisePhase2L13EnabledForTests(true);
    seedScheduleGame(3);
    await putFranchiseRelationshipEdge(edge({ formedAtGameNumber: 1 }));

    await persistDarkRelationshipIntensityForCompletedGame(gameState(), scope);
    const firstJson = await readRowsJson();
    await persistDarkRelationshipIntensityForCompletedGame(gameState(), scope);
    const replayJson = await readRowsJson();

    expect(replayJson).toBe(firstJson);
  });
});
