import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getGame: vi.fn(),
}));

vi.mock('../scheduleStorage', () => ({
  getGame: mocks.getGame,
}));

import {
  buildRelationshipChargedMatchupEvent,
  buildRelationshipMoraleEvent,
  buildRelationshipRecoveryEvent,
  franchiseRelationshipMoraleSeam,
  persistDarkRelationshipMoraleForCompletedGame,
  relationshipChargedSourceEventId,
  relationshipHitSourceEventId,
  relationshipRecoverySourceEventId,
  type RelationshipMoraleRoster,
  type RelationshipMoraleScope,
} from '../franchiseRelationshipMoraleCompute';
import {
  franchiseRelationshipEdgeId,
  type RelationshipEdgeRow,
} from '../franchiseRelationshipEdgesStorage';
import {
  setFranchisePhase2L13EnabledForTests,
  setFranchisePhase2MoraleEnabledForTests,
} from '../franchisePhase2Flags';
import type { FranchiseMoraleSnapshot } from '../franchiseMoraleState';
import type { PersistedGameState } from '../gameStorage';

const scope: RelationshipMoraleScope = {
  franchiseId: 'franchise-l13-morale',
  seasonId: 'season-l13-morale',
  statsScopeId: 'scope-l13-morale',
  seasonNumber: 1,
};

function edge(overrides: Partial<RelationshipEdgeRow> = {}): RelationshipEdgeRow {
  const player1Id = overrides.player1Id ?? 'aggressor';
  const player2Id = overrides.player2Id ?? 'target';
  const type = overrides.type ?? 'FEUD';
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
    accuracy: 0.9,
    formedAtGameNumber: 2,
    dissolvedAtGameNumber: null,
    createdAt: 1781990400000,
    updatedAt: 1781990400000,
    ...overrides,
  };
}

function roster(entries: Array<{
  playerId: string;
  teamId: string | null;
  rosterStatus?: 'MLB' | 'FARM' | 'FREE_AGENT' | null;
  personality?: string;
  morale?: number;
}>): RelationshipMoraleRoster {
  return {
    byPlayerId: new Map(entries.map((entry) => [
      entry.playerId,
      {
        playerId: entry.playerId,
        teamId: entry.teamId,
        rosterStatus: entry.rosterStatus ?? 'MLB',
        personality: entry.personality ?? 'RELAXED',
        morale: entry.morale ?? 50,
        hiddenPersonalityModifiers: {
          loyalty: 50,
          ambition: 50,
          resilience: 50,
          charisma: 50,
        },
      },
    ])),
  };
}

function gameState(overrides: Partial<PersistedGameState> = {}): PersistedGameState {
  return {
    id: 'current',
    gameId: 'game-l13-morale-7',
    scheduleGameId: 'schedule-l13-morale-7',
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
    playerStats: {},
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

function playerSnapshot(
  playerId: string,
  currentValue: number,
  history: FranchiseMoraleSnapshot['history'],
): FranchiseMoraleSnapshot {
  return {
    id: `${scope.franchiseId}:${scope.seasonId}:${scope.statsScopeId}:morale:player:${playerId}`,
    contractVersion: 'franchise-morale-state-v1',
    franchiseId: scope.franchiseId,
    seasonId: scope.seasonId,
    statsScopeId: scope.statsScopeId,
    seasonNumber: scope.seasonNumber,
    targetType: 'player',
    playerId,
    baselineValue: 50,
    currentValue,
    lastModified: '2026-06-20T00:00:00.000Z',
    history,
  };
}

describe('franchise relationship morale compute', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mocks.getGame.mockReset();
    mocks.getGame.mockResolvedValue({ id: 'schedule-l13-morale-7', gameNumber: 7 });
    setFranchisePhase2L13EnabledForTests(null);
    setFranchisePhase2MoraleEnabledForTests(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    setFranchisePhase2L13EnabledForTests(null);
    setFranchisePhase2MoraleEnabledForTests(null);
  });

  test('relationship morale events use kind routing and recovery events carry exact deltas', () => {
    expect(buildRelationshipMoraleEvent(edge(), 'player2')).toEqual({
      kind: 'relationship',
      type: 'FEUD',
      relationshipRole: 'player2',
    });
    expect(buildRelationshipRecoveryEvent(12.5)).toEqual({
      kind: 'relationship',
      type: 'relationship.recovery',
      exactSelfPlayerMoraleDelta: 12.5,
    });
    expect(buildRelationshipChargedMatchupEvent(edge({ type: 'RIVALRY' }), 'win')).toEqual({
      kind: 'relationship',
      type: 'RIVALRY',
      chargedMatchupResult: 'win',
    });
  });

  test('flag off returns dark-noop before edge or roster reads', async () => {
    setFranchisePhase2L13EnabledForTests(false);
    setFranchisePhase2MoraleEnabledForTests(true);
    const getEdges = vi.spyOn(franchiseRelationshipMoraleSeam, 'getEdges');
    const resolveRoster = vi.spyOn(franchiseRelationshipMoraleSeam, 'resolveRoster');
    const applyConsequence = vi.spyOn(franchiseRelationshipMoraleSeam, 'applyConsequence');

    const result = await persistDarkRelationshipMoraleForCompletedGame(gameState(), scope);

    expect(result).toEqual({
      status: 'dark-noop',
      hitCount: 0,
      recoveryCount: 0,
      chargedCount: 0,
      reason: 'Phase-2 L13 disabled.',
    });
    expect(getEdges).not.toHaveBeenCalled();
    expect(resolveRoster).not.toHaveBeenCalled();
    expect(applyConsequence).not.toHaveBeenCalled();
  });

  test('co-rostered active edge applies one per-game matrix hit to each participant', async () => {
    setFranchisePhase2L13EnabledForTests(true);
    setFranchisePhase2MoraleEnabledForTests(true);
    const row = edge();
    vi.spyOn(franchiseRelationshipMoraleSeam, 'getEdges').mockResolvedValue([row]);
    vi.spyOn(franchiseRelationshipMoraleSeam, 'resolveRoster').mockResolvedValue(roster([
      { playerId: 'aggressor', teamId: 'team-a', personality: 'EGOTISTICAL' },
      { playerId: 'target', teamId: 'team-a', personality: 'TIMID' },
    ]));
    vi.spyOn(franchiseRelationshipMoraleSeam, 'getSnapshot').mockResolvedValue(null);
    const applyConsequence = vi.spyOn(franchiseRelationshipMoraleSeam, 'applyConsequence')
      .mockResolvedValue({
        status: 'applied',
        applied: [],
        skipped: [],
        failed: [],
        reason: 'stubbed matrix write',
        blockers: [],
      });

    const result = await persistDarkRelationshipMoraleForCompletedGame(gameState(), scope);
    const hitSourceId = relationshipHitSourceEventId(scope, row, 'game-7');

    expect(result).toEqual({ status: 'applied', hitCount: 2, recoveryCount: 0, chargedCount: 0 });
    expect(applyConsequence).toHaveBeenCalledTimes(2);
    expect(applyConsequence.mock.calls[0][0]).toMatchObject({
      ...scope,
      playerId: 'aggressor',
      teamId: 'team-a',
      sourceEventId: hitSourceId,
      timestamp: new Date(1781990580000).toISOString(),
    });
    expect(applyConsequence.mock.calls[1][0]).toMatchObject({
      ...scope,
      playerId: 'target',
      teamId: 'team-a',
      sourceEventId: hitSourceId,
    });
    expect(applyConsequence.mock.calls[0][0].consequence).toMatchObject({
      eventType: 'FEUD',
      isNeutral: false,
      base: {
        selfPlayerMoraleDelta: 3,
        teamFanMoraleDelta: 0,
        otherTouched: [],
        reason: 'relationship.feud.player1',
      },
    });
    expect(applyConsequence.mock.calls[1][0].consequence).toMatchObject({
      eventType: 'FEUD',
      isNeutral: false,
      base: {
        selfPlayerMoraleDelta: -10,
        teamFanMoraleDelta: 0,
        otherTouched: [],
        reason: 'relationship.feud.player2',
      },
    });
  });

  test('broken co-rostering applies exact equal-and-opposite recovery from morale history', async () => {
    setFranchisePhase2L13EnabledForTests(true);
    setFranchisePhase2MoraleEnabledForTests(true);
    const row = edge();
    const hitSourceId = relationshipHitSourceEventId(scope, row, 'game-6');
    const recoverySourceId = relationshipRecoverySourceEventId(scope, row, 'game-7');
    vi.spyOn(franchiseRelationshipMoraleSeam, 'getEdges').mockResolvedValue([row]);
    vi.spyOn(franchiseRelationshipMoraleSeam, 'resolveRoster').mockResolvedValue(roster([
      { playerId: 'aggressor', teamId: 'team-b' },
      { playerId: 'target', teamId: 'team-a', personality: 'TIMID', morale: 38 },
    ]));
    vi.spyOn(franchiseRelationshipMoraleSeam, 'getSnapshot').mockImplementation(async (_scope, targetType, targetId) => {
      if (targetType === 'player' && targetId === 'target') {
        return playerSnapshot('target', 37.5, [{
          id: 'history-hit',
          sourceEventId: hitSourceId,
          sourceKind: 'matrix-auto',
          previousValue: 50,
          currentValue: 37.5,
          delta: -12.5,
          reason: 'Master morale matrix: relationship.feud.player2',
          actorDisplayName: 'Master Morale Matrix',
          timestamp: '2026-06-20T00:00:00.000Z',
        }]);
      }
      return null;
    });
    const applyConsequence = vi.spyOn(franchiseRelationshipMoraleSeam, 'applyConsequence')
      .mockResolvedValue({
        status: 'applied',
        applied: [],
        skipped: [],
        failed: [],
        reason: 'stubbed matrix write',
        blockers: [],
      });

    const result = await persistDarkRelationshipMoraleForCompletedGame(gameState(), scope);

    expect(result).toEqual({ status: 'applied', hitCount: 0, recoveryCount: 1, chargedCount: 0 });
    expect(applyConsequence).toHaveBeenCalledTimes(1);
    expect(applyConsequence.mock.calls[0][0]).toMatchObject({
      ...scope,
      playerId: 'target',
      teamId: 'team-a',
      sourceEventId: recoverySourceId,
    });
    expect(applyConsequence.mock.calls[0][0].consequence).toMatchObject({
      eventType: 'relationship.recovery',
      isNeutral: false,
      selfPlayerMoraleDelta: 12.5,
      fanMoraleToPlayerMoraleDelta: 0,
      totalPlayerMoraleDelta: 12.5,
      teamFanMoraleDelta: 0,
      reason: 'relationship.recovery',
    });
  });

  test('recovery is idempotent when history is already net-zero', async () => {
    setFranchisePhase2L13EnabledForTests(true);
    setFranchisePhase2MoraleEnabledForTests(true);
    const row = edge();
    const hitSourceId = relationshipHitSourceEventId(scope, row, 'game-6');
    const recoverySourceId = relationshipRecoverySourceEventId(scope, row, 'game-7');
    vi.spyOn(franchiseRelationshipMoraleSeam, 'getEdges').mockResolvedValue([row]);
    vi.spyOn(franchiseRelationshipMoraleSeam, 'resolveRoster').mockResolvedValue(roster([
      { playerId: 'aggressor', teamId: 'team-b' },
      { playerId: 'target', teamId: 'team-a' },
    ]));
    vi.spyOn(franchiseRelationshipMoraleSeam, 'getSnapshot').mockImplementation(async (_scope, targetType, targetId) => {
      if (targetType === 'player' && targetId === 'target') {
        return playerSnapshot('target', 50, [
          {
            id: 'history-hit',
            sourceEventId: hitSourceId,
            sourceKind: 'matrix-auto',
            previousValue: 50,
            currentValue: 40,
            delta: -10,
            reason: 'Master morale matrix: relationship.feud.player2',
            actorDisplayName: 'Master Morale Matrix',
            timestamp: '2026-06-20T00:00:00.000Z',
          },
          {
            id: 'history-recovery',
            sourceEventId: recoverySourceId,
            sourceKind: 'matrix-auto',
            previousValue: 40,
            currentValue: 50,
            delta: 10,
            reason: 'Master morale matrix: relationship.recovery',
            actorDisplayName: 'Master Morale Matrix',
            timestamp: '2026-06-20T00:01:00.000Z',
          },
        ]);
      }
      return null;
    });
    const applyConsequence = vi.spyOn(franchiseRelationshipMoraleSeam, 'applyConsequence');

    const result = await persistDarkRelationshipMoraleForCompletedGame(gameState(), scope);

    expect(result).toEqual({ status: 'applied', hitCount: 0, recoveryCount: 0, chargedCount: 0 });
    expect(applyConsequence).not.toHaveBeenCalled();
  });

  test('cross-team charged matchup applies result-aligned personality-scaled morale to both participants', async () => {
    setFranchisePhase2L13EnabledForTests(true);
    setFranchisePhase2MoraleEnabledForTests(true);
    const row = edge({
      type: 'RIVALRY',
      player1Id: 'away-rival',
      player2Id: 'home-rival',
    });
    vi.spyOn(franchiseRelationshipMoraleSeam, 'getEdges').mockResolvedValue([row]);
    vi.spyOn(franchiseRelationshipMoraleSeam, 'resolveRoster').mockResolvedValue(roster([
      { playerId: 'away-rival', teamId: 'team-away', personality: 'EGOTISTICAL' },
      { playerId: 'home-rival', teamId: 'team-home', personality: 'RELAXED' },
    ]));
    vi.spyOn(franchiseRelationshipMoraleSeam, 'getSnapshot').mockResolvedValue(null);
    const applyConsequence = vi.spyOn(franchiseRelationshipMoraleSeam, 'applyConsequence')
      .mockResolvedValue({
        status: 'applied',
        applied: [],
        skipped: [],
        failed: [],
        reason: 'stubbed matrix write',
        blockers: [],
      });

    const result = await persistDarkRelationshipMoraleForCompletedGame(gameState({
      homeScore: 6,
      awayScore: 3,
      playerStats: {
        'away-rival': {
          playerName: 'Away Rival',
          teamId: 'team-away',
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
          putouts: 1,
          assists: 0,
          fieldingErrors: 0,
          grandSlams: 0,
          d3kOutcomes: 0,
          divingCatches: 0,
          robberies: 0,
          nutshots: 0,
        },
        'home-rival': {
          playerName: 'Home Rival',
          teamId: 'team-home',
          pa: 4,
          ab: 4,
          h: 2,
          singles: 1,
          doubles: 1,
          triples: 0,
          hr: 0,
          rbi: 1,
          r: 1,
          bb: 0,
          hbp: 0,
          k: 0,
          sb: 0,
          cs: 0,
          sf: 0,
          sh: 0,
          gidp: 0,
          putouts: 1,
          assists: 0,
          fieldingErrors: 0,
          grandSlams: 0,
          d3kOutcomes: 0,
          divingCatches: 0,
          robberies: 0,
          nutshots: 0,
        },
      },
    }), scope);
    const chargedSourceId = relationshipChargedSourceEventId(scope, row, 'game-7');

    expect(result).toEqual({ status: 'applied', hitCount: 0, recoveryCount: 0, chargedCount: 2 });
    expect(applyConsequence).toHaveBeenCalledTimes(2);
    expect(applyConsequence.mock.calls[0][0]).toMatchObject({
      ...scope,
      playerId: 'away-rival',
      teamId: 'team-away',
      sourceEventId: chargedSourceId,
    });
    expect(applyConsequence.mock.calls[0][0].consequence).toMatchObject({
      eventType: 'RIVALRY',
      isNeutral: false,
      base: {
        selfPlayerMoraleDelta: -1,
        teamFanMoraleDelta: 0,
        otherTouched: [],
        reason: 'relationship.charged_matchup.loss',
      },
    });
    expect(applyConsequence.mock.calls[0][0].consequence.selfPlayerMoraleDelta).toBeLessThan(-1);
    expect(applyConsequence.mock.calls[1][0]).toMatchObject({
      ...scope,
      playerId: 'home-rival',
      teamId: 'team-home',
      sourceEventId: chargedSourceId,
    });
    expect(applyConsequence.mock.calls[1][0].consequence).toMatchObject({
      eventType: 'RIVALRY',
      isNeutral: false,
      base: {
        selfPlayerMoraleDelta: 1,
        teamFanMoraleDelta: 0,
        otherTouched: [],
        reason: 'relationship.charged_matchup.win',
      },
    });
    expect(applyConsequence.mock.calls[1][0].consequence.selfPlayerMoraleDelta).toBeLessThan(1);
    expect(relationshipChargedSourceEventId(scope, row, 'game-7')).toBe(chargedSourceId);
  });
});
