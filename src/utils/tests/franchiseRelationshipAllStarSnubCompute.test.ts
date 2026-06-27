import 'fake-indexeddb/auto';

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  syncEngine: {
    isSuppressed: vi.fn(() => false),
    upsert: vi.fn(),
    remove: vi.fn(),
  },
}));

vi.mock('../syncEngine', () => ({
  syncEngine: mocks.syncEngine,
}));

import { computeRelationshipIntensity } from '../../engines/relationshipIntensity';
import {
  computeAllStarSnubRivalryPairs,
  V1_ALL_STAR_ROSTER_CONFIG,
  type AllStarCandidate,
} from '../../engines/franchiseAllStarSelector';
import {
  ALL_STAR_SNUB_RIVALRY_TUNING,
  persistAllStarSnubRivalryEdges,
} from '../franchiseRelationshipAllStarSnubCompute';
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
const scope = {
  franchiseId: 'franchise-asg-snub',
  seasonId: 'season-asg-snub-1',
  statsScopeId: 'scope-asg-snub-1',
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
    gameId: 'game-asg-lock-36',
    scheduleGameId: 'schedule-asg-lock-36',
    savedAt: 1781990400000,
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

function chargedGameState(): PersistedGameState {
  return gameState({
    playerStats: {
      ...gameState().playerStats,
      'player-b': {
        ...gameState().playerStats['player-a'],
        playerName: 'Player B',
        teamId: 'team-home',
      },
    },
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
    formedAtGameNumber: 36,
    dissolvedAtGameNumber: null,
    createdAt: 123,
    updatedAt: 123,
    ...overrides,
  };
}

function candidate(overrides: Partial<AllStarCandidate> & Pick<AllStarCandidate, 'playerId'>): AllStarCandidate {
  return {
    playerId: overrides.playerId,
    teamId: `team-${overrides.playerId}`,
    rawPosition: 'C',
    hittingMerit: null,
    battingWar: null,
    startingMerit: null,
    reliefMerit: null,
    gamesStarted: 0,
    qualifiedAsHitter: false,
    qualifiedAsPitcher: false,
    fameHeat: 0,
    fameReachFloor: 0,
    ...overrides,
  };
}

describe('persistAllStarSnubRivalryEdges', () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    resetFranchiseRelationshipEdgesForTests();
    await deleteDatabase(DB_NAME);
    mocks.syncEngine.isSuppressed.mockReturnValue(false);
    mocks.syncEngine.upsert.mockReset();
    setFranchisePhase2L13EnabledForTests(null);
  });

  afterEach(async () => {
    await clearFranchiseRelationshipEdgesForTests();
    setFranchisePhase2L13EnabledForTests(null);
    vi.restoreAllMocks();
  });

  test('flag off is a dark no-op and writes no edge', async () => {
    setFranchisePhase2L13EnabledForTests(false);

    const result = await persistAllStarSnubRivalryEdges({
      gameState: gameState(),
      pairs: [{ snubbedPlayerId: 'player-a', selectedPlayerId: 'player-b' }],
      scope,
      lockGameNumber: 36,
      timestamp: 1781990400000,
    });

    expect(result).toEqual({ status: 'dark-noop', written: 0, reason: 'Phase-2 L13 disabled.' });
    expect(await getFranchiseRelationshipEdgesByScope(scope)).toEqual([]);
  });

  test('flag on writes one uncharged All-Star snub RIVALRY edge with lifecycle seed intensity', async () => {
    setFranchisePhase2L13EnabledForTests(true);

    const result = await persistAllStarSnubRivalryEdges({
      gameState: gameState(),
      pairs: [{ snubbedPlayerId: 'player-a', selectedPlayerId: 'player-b' }],
      scope,
      lockGameNumber: 36,
      timestamp: 1781990400000,
    });
    const id = franchiseRelationshipEdgeId(scope, 'player-a', 'player-b', 'RIVALRY');
    const row = await getFranchiseRelationshipEdge(id);

    expect(result).toEqual({ status: 'written', written: 1 });
    expect(row).toBeDefined();
    if (!row) throw new Error('Expected All-Star snub relationship edge row.');
    const expected = computeRelationshipIntensity(row, {
      gameNumber: 36,
      isChargedMatchup: false,
    });

    expect(row).toMatchObject({
      id,
      player1Id: 'player-a',
      player2Id: 'player-b',
      type: 'RIVALRY',
      formationSource: 'asg-snub',
      formedAtGameNumber: 36,
      accuracy: ALL_STAR_SNUB_RIVALRY_TUNING.accuracy,
      potential: false,
      dissolvedAtGameNumber: null,
    });
    expect(row.intensity).toBe(expected.intensity);
    expect(row.intensity).toBeGreaterThanOrEqual(0.72);
    expect(row.intensity).toBeLessThanOrEqual(0.9);
  });

  test('charged lock-game state writes the charged formation intensity', async () => {
    setFranchisePhase2L13EnabledForTests(true);

    const result = await persistAllStarSnubRivalryEdges({
      gameState: chargedGameState(),
      pairs: [{ snubbedPlayerId: 'player-a', selectedPlayerId: 'player-b' }],
      scope,
      lockGameNumber: 36,
      timestamp: 1781990400000,
    });
    const row = await getFranchiseRelationshipEdge(
      franchiseRelationshipEdgeId(scope, 'player-a', 'player-b', 'RIVALRY'),
    );

    expect(result).toEqual({ status: 'written', written: 1 });
    expect(row).toBeDefined();
    if (!row) throw new Error('Expected charged All-Star snub relationship edge row.');
    const expected = computeRelationshipIntensity(row, {
      gameNumber: 36,
      isChargedMatchup: true,
    });
    expect(row.intensity).toBe(expected.intensity);
    expect(row.intensity).toBeGreaterThan(0.9);
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

    const result = await persistAllStarSnubRivalryEdges({
      gameState: chargedGameState(),
      pairs: [{ snubbedPlayerId: 'player-a', selectedPlayerId: 'player-b' }],
      scope,
      lockGameNumber: 36,
      timestamp: 1781990400000,
    });
    const row = await getFranchiseRelationshipEdge(existing.id);

    expect(result).toEqual({ status: 'dark-noop', written: 0, reason: 'No new All-Star snub edges.' });
    expect(row).toEqual(existing);
  });

  test('deduplicates canonical pairs and skips self-pairs', async () => {
    setFranchisePhase2L13EnabledForTests(true);

    const result = await persistAllStarSnubRivalryEdges({
      gameState: gameState(),
      pairs: [
        { snubbedPlayerId: 'player-a', selectedPlayerId: 'player-b' },
        { snubbedPlayerId: 'player-b', selectedPlayerId: 'player-a' },
        { snubbedPlayerId: 'player-c', selectedPlayerId: 'player-c' },
      ],
      scope,
      lockGameNumber: 36,
      timestamp: 1781990400000,
    });
    const rows = await getFranchiseRelationshipEdgesByScope(scope);

    expect(result).toEqual({ status: 'written', written: 1 });
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe(franchiseRelationshipEdgeId(scope, 'player-a', 'player-b', 'RIVALRY'));
  });
});

describe('computeAllStarSnubRivalryPairs', () => {
  test('pairs hitter first-out to position starter and pitcher first-out to marginal selected pitcher', () => {
    const pairs = computeAllStarSnubRivalryPairs(
      [
        candidate({
          playerId: 'cf-starter',
          rawPosition: 'CF',
          hittingMerit: 1,
          battingWar: 1,
          qualifiedAsHitter: true,
        }),
        candidate({
          playerId: 'combo-of-first-out',
          rawPosition: 'OF',
          hittingMerit: 9,
          battingWar: 9,
          qualifiedAsHitter: true,
        }),
        candidate({
          playerId: 'combo-of-second-out',
          rawPosition: 'IF/OF',
          hittingMerit: 8,
          battingWar: 8,
          qualifiedAsHitter: true,
        }),
        candidate({
          playerId: 'sp-last-in',
          rawPosition: 'SP',
          startingMerit: 4,
          gamesStarted: 8,
          qualifiedAsPitcher: true,
        }),
        candidate({
          playerId: 'sp-first-out',
          rawPosition: 'SP',
          startingMerit: 7,
          gamesStarted: 8,
          qualifiedAsPitcher: true,
        }),
        candidate({
          playerId: 'sp-second-out',
          rawPosition: 'SP',
          startingMerit: 6,
          gamesStarted: 8,
          qualifiedAsPitcher: true,
        }),
      ],
      [
        { playerId: 'cf-starter', position: 'CF', role: 'starter', selectionScore: 0.95 },
        { playerId: 'sp-ace', position: 'SP', role: 'starter', selectionScore: 9 },
        { playerId: 'sp-last-in', position: 'SP', role: 'reserve', selectionScore: 4 },
      ],
      {
        ...V1_ALL_STAR_ROSTER_CONFIG,
        positionStarters: ['CF'],
        positionBackups: [],
        startingPitchers: 0,
        backupStartingPitchers: 0,
        relievers: 0,
        backupRelievers: 0,
        wildcards: 0,
      },
    );

    expect(pairs).toEqual([
      { snubbedPlayerId: 'combo-of-first-out', selectedPlayerId: 'cf-starter' },
      { snubbedPlayerId: 'sp-first-out', selectedPlayerId: 'sp-last-in' },
    ]);
  });
});
