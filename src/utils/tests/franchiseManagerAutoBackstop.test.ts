import 'fake-indexeddb/auto';

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getGame: vi.fn(),
  getSeasonGames: vi.fn(),
  getGameEvents: vi.fn(),
}));

vi.mock('../scheduleStorage', () => ({
  getGame: mocks.getGame,
}));

vi.mock('../eventLog', async () => {
  const actual = await vi.importActual<typeof import('../eventLog')>('../eventLog');
  return {
    ...actual,
    getSeasonGames: mocks.getSeasonGames,
    getGameEvents: mocks.getGameEvents,
  };
});

import {
  autoBackstopSeam,
  persistDarkL11AutoBackstopForCompletedGame,
  type L11AutoBackstopScope,
} from '../franchiseManagerAutoBackstop';
import { setFranchisePhase2L11EnabledForTests } from '../franchisePhase2Flags';
import type { PersistedGameState } from '../gameStorage';
import { LEAGUE_BUILDER_MANAGER_INSTANCE_ID } from '../managerIdentityStorage';

const scope: L11AutoBackstopScope = {
  franchiseId: 'franchise-l11',
  seasonId: 'season-l11',
  statsScopeId: 'scope-l11',
  seasonNumber: 1,
};

const gameState = {
  id: 'current',
  gameId: 'game-42',
  scheduleGameId: 'schedule-42',
  savedAt: 111,
  inning: 9,
  halfInning: 'BOTTOM',
  outs: 3,
  homeScore: 2,
  awayScore: 1,
  bases: { first: null, second: null, third: null },
  currentBatterIndex: 0,
  atBatCount: 0,
  awayTeamId: 'team-away',
  homeTeamId: 'team-home',
  awayTeamName: 'Away',
  homeTeamName: 'Home',
  seasonNumber: 1,
  playerStats: {},
  pitcherGameStats: [],
} as unknown as PersistedGameState;

const headerTimestamp = Date.UTC(2026, 5, 19, 2, 0, 0);
const atBatTimestamp = Date.UTC(2026, 5, 19, 2, 45, 0);

function seedCompletedGameReads(gameNumber = 42): void {
  mocks.getGame.mockResolvedValue({ id: 'schedule-42', gameNumber });
  mocks.getSeasonGames.mockResolvedValue([
    {
      gameId: gameState.gameId,
      seasonId: scope.seasonId,
      date: headerTimestamp,
      awayTeamId: gameState.awayTeamId,
      awayTeamName: gameState.awayTeamName,
      homeTeamId: gameState.homeTeamId,
      homeTeamName: gameState.homeTeamName,
      finalScore: { away: gameState.awayScore, home: gameState.homeScore },
      finalInning: 9,
      isComplete: true,
      aggregated: true,
      aggregatedAt: headerTimestamp,
      aggregationError: null,
      eventCount: 1,
      checksum: 'checksum',
    },
  ]);
  mocks.getGameEvents.mockResolvedValue([
    { eventId: 'game-42_1', gameId: gameState.gameId, eventIndex: 1, timestamp: atBatTimestamp },
  ]);
}

describe('persistDarkL11AutoBackstopForCompletedGame', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.clearAllMocks();
    setFranchisePhase2L11EnabledForTests(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    setFranchisePhase2L11EnabledForTests(null);
  });

  test('flag off returns dark-noop without loading schedule, events, morale, or firing', async () => {
    setFranchisePhase2L11EnabledForTests(false);
    const resolveSpy = vi.spyOn(autoBackstopSeam, 'resolveLeagueAndInstance');
    const moraleSpy = vi.spyOn(autoBackstopSeam, 'getTeamFanMorale');
    const fireSpy = vi.spyOn(autoBackstopSeam, 'fireManager');

    const result = await persistDarkL11AutoBackstopForCompletedGame(gameState, scope);

    expect(result).toEqual({
      status: 'dark-noop',
      fired: 0,
      checked: 0,
      reason: 'Phase-2 L11 disabled.',
    });
    expect(mocks.getGame).not.toHaveBeenCalled();
    expect(mocks.getSeasonGames).not.toHaveBeenCalled();
    expect(mocks.getGameEvents).not.toHaveBeenCalled();
    expect(resolveSpy).not.toHaveBeenCalled();
    expect(moraleSpy).not.toHaveBeenCalled();
    expect(fireSpy).not.toHaveBeenCalled();
  });

  test('flag on with cratered morale and a roll hit fires the manager for that team', async () => {
    setFranchisePhase2L11EnabledForTests(true);
    seedCompletedGameReads();
    vi.spyOn(autoBackstopSeam, 'resolveLeagueAndInstance').mockResolvedValue({
      leagueId: 'league-l11',
      instanceId: LEAGUE_BUILDER_MANAGER_INSTANCE_ID,
    });
    vi.spyOn(autoBackstopSeam, 'getTeamFanMorale').mockImplementation(async (_scope, teamId) =>
      teamId === 'team-home' ? 20 : 50,
    );
    vi.spyOn(autoBackstopSeam, 'getManagerAssignment').mockResolvedValue({
      managerId: 'manager-home',
      teamId: 'team-home',
      mode: 'franchise',
      instanceId: LEAGUE_BUILDER_MANAGER_INSTANCE_ID,
    });
    vi.spyOn(autoBackstopSeam, 'rollManagerBackstop').mockReturnValue(0.001);
    const fireSpy = vi.spyOn(autoBackstopSeam, 'fireManager').mockResolvedValue({
      status: 'fired',
      reliefApplied: false,
      ripplesApplied: 0,
    });

    const result = await persistDarkL11AutoBackstopForCompletedGame(gameState, scope);

    expect(result).toEqual({ status: 'checked', fired: 1, checked: 2 });
    expect(fireSpy).toHaveBeenCalledTimes(1);
    expect(fireSpy).toHaveBeenCalledWith({
      ...scope,
      leagueId: 'league-l11',
      teamId: 'team-home',
      mode: 'franchise',
      instanceId: LEAGUE_BUILDER_MANAGER_INSTANCE_ID,
      reason: 'auto-backstop',
      endDate: new Date(atBatTimestamp).toISOString(),
      expectedManagerId: 'manager-home',
      executionGameId: gameState.gameId,
    });
  });

  test('flag on with healthy morale skips without rolling or firing', async () => {
    setFranchisePhase2L11EnabledForTests(true);
    seedCompletedGameReads();
    vi.spyOn(autoBackstopSeam, 'resolveLeagueAndInstance').mockResolvedValue({
      leagueId: 'league-l11',
      instanceId: LEAGUE_BUILDER_MANAGER_INSTANCE_ID,
    });
    vi.spyOn(autoBackstopSeam, 'getTeamFanMorale').mockResolvedValue(25);
    const rollSpy = vi.spyOn(autoBackstopSeam, 'rollManagerBackstop');
    const fireSpy = vi.spyOn(autoBackstopSeam, 'fireManager');

    const result = await persistDarkL11AutoBackstopForCompletedGame(gameState, scope);

    expect(result).toEqual({ status: 'checked', fired: 0, checked: 2 });
    expect(rollSpy).not.toHaveBeenCalled();
    expect(fireSpy).not.toHaveBeenCalled();
  });

  test('flag on with cratered morale and a roll miss does not fire', async () => {
    setFranchisePhase2L11EnabledForTests(true);
    seedCompletedGameReads();
    vi.spyOn(autoBackstopSeam, 'resolveLeagueAndInstance').mockResolvedValue({
      leagueId: 'league-l11',
      instanceId: LEAGUE_BUILDER_MANAGER_INSTANCE_ID,
    });
    vi.spyOn(autoBackstopSeam, 'getTeamFanMorale').mockResolvedValue(10);
    vi.spyOn(autoBackstopSeam, 'rollManagerBackstop').mockReturnValue(0.9);
    const fireSpy = vi.spyOn(autoBackstopSeam, 'fireManager');

    const result = await persistDarkL11AutoBackstopForCompletedGame(gameState, scope);

    expect(result).toEqual({ status: 'checked', fired: 0, checked: 2 });
    expect(fireSpy).not.toHaveBeenCalled();
  });

  test('deterministic backstop roll is stable for the same seed and bounded', () => {
    const seed = `${scope.franchiseId}:${scope.seasonId}:42:team-home:manager-backstop`;

    const first = autoBackstopSeam.rollManagerBackstop(seed);
    const second = autoBackstopSeam.rollManagerBackstop(seed);

    expect(second).toBe(first);
    expect(first).toBeGreaterThanOrEqual(0);
    expect(first).toBeLessThan(1);
    expect(autoBackstopSeam.rollManagerBackstop(`${seed}:different`)).not.toBe(first);
  });
});
