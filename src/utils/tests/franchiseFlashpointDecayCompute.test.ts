import 'fake-indexeddb/auto';

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import type { PersistedGameState } from '../gameStorage';
import * as flashpointCompute from '../franchiseFlashpointDecayCompute';
import {
  persistDarkFlashpointDecayForCompletedGame,
  type FlashpointScope,
} from '../franchiseFlashpointDecayCompute';
import {
  clearFranchiseDesignationDatabaseForTests,
  resetFranchiseDesignationDatabaseForTests,
  saveFranchiseDesignationRows,
} from '../franchiseDesignationStorage';
import type { FranchisePlayerDesignationRecord } from '../franchiseDesignations';
import {
  clearFranchiseFlashpointDecayForTests,
  getFranchiseFlashpointDecayRow,
  resetFranchiseFlashpointDecayForTests,
} from '../franchiseFlashpointDecayStorage';
import {
  clearFranchiseTradeDemandForTests,
  resetFranchiseTradeDemandForTests,
  saveFranchiseTradeDemandRows,
  type FranchiseTradeDemandRow,
} from '../franchiseTradeDemandStorage';
import { setFranchisePhase2FlashpointEnabledForTests } from '../franchisePhase2Flags';
import { syncEngine } from '../syncEngine';

function deleteDatabase(name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => resolve();
  });
}

const scope: FlashpointScope = {
  franchiseId: 'franchise-flashpoint',
  seasonId: 'season-flashpoint-1',
  statsScopeId: 'season-flashpoint-1',
  seasonNumber: 1,
};

function albatrossDesignation(
  overrides: Partial<FranchisePlayerDesignationRecord> = {},
): FranchisePlayerDesignationRecord {
  return {
    ...scope,
    teamId: 'team-b',
    playerId: 'player-albatross',
    playerName: 'Al Batross',
    type: 'ALBATROSS',
    status: 'active',
    sourceInputs: {
      valueDelta: -12,
    },
    sourceEvidence: ['L7a fixture: active Albatross designation holder'],
    calculationVersion: 'test-flashpoint-designations',
    calculatedAt: '2026-06-17T00:00:00.000Z',
    lockedAt: null,
    carryover: {
      carriesOver: false,
      untilSeasonProgress: null,
      previousSeasonId: null,
      previousPlayerId: null,
      note: null,
    },
    ...overrides,
  };
}

function tradeDemandRow(overrides: Partial<FranchiseTradeDemandRow> = {}): FranchiseTradeDemandRow {
  return {
    ...scope,
    playerId: 'player-trade-demand',
    teamId: 'team-b',
    status: 'active',
    confirmedAtGameNumber: 1,
    confirmedAtCheckpoint: '1',
    confirmedAtIso: '2026-06-18T00:00:00.000Z',
    ...overrides,
  };
}

function gameState(overrides: Partial<PersistedGameState> = {}): PersistedGameState {
  return {
    id: 'current',
    gameId: 'flashpoint-game-1',
    savedAt: 1,
    inning: 9,
    halfInning: 'BOTTOM',
    outs: 3,
    homeScore: 5,
    awayScore: 2,
    bases: { first: null, second: null, third: null },
    currentBatterIndex: 0,
    atBatCount: 36,
    awayTeamId: 'team-a',
    homeTeamId: 'team-b',
    awayTeamName: 'Team A',
    homeTeamName: 'Team B',
    seasonNumber: 1,
    seasonId: scope.seasonId,
    statsScopeId: scope.statsScopeId,
    franchiseId: scope.franchiseId,
    competitionType: 'franchise',
    competitionId: scope.franchiseId,
    playerStats: {},
    pitcherGameStats: [],
    awayLineup: [],
    homeLineupState: {
      lineup: [],
      bench: [],
      usedPlayers: [],
      currentPitcher: null,
    },
    fameEvents: [],
    lastHRBatterId: null,
    consecutiveHRCount: 0,
    inningStrikeouts: 0,
    maxDeficitAway: 0,
    maxDeficitHome: 0,
    activityLog: [],
    ...overrides,
  };
}

describe('franchise dark flashpoint-decay compute', () => {
  beforeEach(async () => {
    resetFranchiseFlashpointDecayForTests();
    resetFranchiseDesignationDatabaseForTests();
    resetFranchiseTradeDemandForTests();
    await deleteDatabase('kbl-tracker');
    vi.spyOn(syncEngine, 'isSuppressed').mockReturnValue(true);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    setFranchisePhase2FlashpointEnabledForTests(null);
    await clearFranchiseDesignationDatabaseForTests();
    await clearFranchiseTradeDemandForTests();
    await clearFranchiseFlashpointDecayForTests();
    resetFranchiseDesignationDatabaseForTests();
    resetFranchiseTradeDemandForTests();
    resetFranchiseFlashpointDecayForTests();
  });

  test('default-off writer gate returns dark-noop and writes nothing', async () => {
    setFranchisePhase2FlashpointEnabledForTests(false);

    const result = await persistDarkFlashpointDecayForCompletedGame(gameState(), scope);

    expect(result).toEqual({
      status: 'dark-noop',
      written: 0,
      reason: 'Phase-2 flashpoint disabled; per-game flashpoint-decay not written.',
    });
  });

  test('flag-ON but seam empty (no turned-on source until L7/L10/L13) STILL writes nothing', async () => {
    setFranchisePhase2FlashpointEnabledForTests(true);

    // No active|locked Albatross row or active trade-demander row is seeded.
    const result = await persistDarkFlashpointDecayForCompletedGame(gameState(), scope);

    expect(result.status).toBe('dark-noop');
    expect(result.written).toBe(0);
    await expect(getFranchiseFlashpointDecayRow(scope, 'player-albatross')).resolves.toBeNull();
  });

  test('flag-ON with an injected turned-on player accumulates a compounding tax and guards re-entry', async () => {
    setFranchisePhase2FlashpointEnabledForTests(true);

    // Inject the L7/L10/L13 seam locally (confined to this test).
    const seam = vi
      .spyOn(flashpointCompute.flashpointSeam, 'resolveTurnedOnPlayers')
      .mockResolvedValue([{ playerId: 'player-albatross', kind: 'albatross' }]);

    const firstGame = gameState({ gameId: 'flashpoint-game-1' });
    const secondGame = gameState({ gameId: 'flashpoint-game-2' });

    const firstResult = await persistDarkFlashpointDecayForCompletedGame(firstGame, scope);
    const firstRow = await getFranchiseFlashpointDecayRow(scope, 'player-albatross');

    expect(firstResult).toEqual({ status: 'written', written: 1 });
    expect(firstRow).toMatchObject({
      flashpointKind: 'albatross',
      consecutiveGamesUnresolved: 1,
      lastGameTax: -0.5,
      accumulatedFanMoraleTax: -0.5,
      updatedAtCheckpoint: 'flashpoint-game-1',
    });

    const secondResult = await persistDarkFlashpointDecayForCompletedGame(secondGame, scope);
    const secondRow = await getFranchiseFlashpointDecayRow(scope, 'player-albatross');

    expect(secondResult).toEqual({ status: 'written', written: 1 });
    // Game 2: compounding tax magnitude > game 1, accumulated total grows.
    expect(secondRow?.consecutiveGamesUnresolved).toBe(2);
    expect(Math.abs(secondRow?.lastGameTax ?? 0)).toBeGreaterThan(Math.abs(firstRow?.lastGameTax ?? 0));
    expect(secondRow?.accumulatedFanMoraleTax).toBeLessThan(firstRow?.accumulatedFanMoraleTax ?? 0);
    expect(secondRow?.updatedAtCheckpoint).toBe('flashpoint-game-2');

    // Re-entry guard: re-processing the same checkpoint does not double-accumulate.
    const duplicateResult = await persistDarkFlashpointDecayForCompletedGame(secondGame, scope);
    const duplicateRow = await getFranchiseFlashpointDecayRow(scope, 'player-albatross');

    expect(duplicateResult).toEqual({ status: 'written', written: 0 });
    expect(duplicateRow).toEqual(secondRow);

    seam.mockRestore();
  });

  test('on then off then on restarts the consecutive-game counter', async () => {
    setFranchisePhase2FlashpointEnabledForTests(true);
    vi.spyOn(flashpointCompute.flashpointSeam, 'resolveProcessedTeamPlayerIds')
      .mockResolvedValue(new Set(['player-albatross']));
    vi.spyOn(flashpointCompute.flashpointSeam, 'resolveTurnedOnPlayers')
      .mockResolvedValueOnce([{ playerId: 'player-albatross', kind: 'albatross' }])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ playerId: 'player-albatross', kind: 'albatross' }]);

    await persistDarkFlashpointDecayForCompletedGame(
      gameState({ gameId: 'flashpoint-game-on-1' }),
      scope,
    );
    await persistDarkFlashpointDecayForCompletedGame(
      gameState({ gameId: 'flashpoint-game-off' }),
      scope,
    );
    const resolvedRow = await getFranchiseFlashpointDecayRow(scope, 'player-albatross');
    await persistDarkFlashpointDecayForCompletedGame(
      gameState({ gameId: 'flashpoint-game-on-2' }),
      scope,
    );
    const retriggeredRow = await getFranchiseFlashpointDecayRow(scope, 'player-albatross');

    expect(resolvedRow).toMatchObject({
      flashpointKind: null,
      consecutiveGamesUnresolved: 0,
      lastGameTax: 0,
      accumulatedFanMoraleTax: -0.5,
      updatedAtCheckpoint: 'flashpoint-game-off',
    });
    expect(retriggeredRow).toMatchObject({
      flashpointKind: 'albatross',
      consecutiveGamesUnresolved: 1,
      lastGameTax: -0.5,
      accumulatedFanMoraleTax: -1,
      updatedAtCheckpoint: 'flashpoint-game-on-2',
    });
  });

  test('the live seam resolveTurnedOnPlayers returns [] when no active or locked Albatross is seeded', async () => {
    await expect(flashpointCompute.resolveTurnedOnPlayers(scope, gameState())).resolves.toEqual([]);
  });

  test('the live seam resolves active home-or-away Albatross designations but ignores projected rows', async () => {
    await saveFranchiseDesignationRows([
      albatrossDesignation({ playerId: 'home-albatross', teamId: 'team-b', status: 'active' }),
      albatrossDesignation({ playerId: 'away-projected', teamId: 'team-a', status: 'projected' }),
    ]);

    await expect(flashpointCompute.resolveTurnedOnPlayers(scope, gameState())).resolves.toEqual([
      { playerId: 'home-albatross', kind: 'albatross' },
    ]);

    await clearFranchiseDesignationDatabaseForTests();
    await saveFranchiseDesignationRows([
      albatrossDesignation({ playerId: 'home-projected', teamId: 'team-b', status: 'projected' }),
    ]);

    await expect(flashpointCompute.resolveTurnedOnPlayers(scope, gameState())).resolves.toEqual([]);
  });

  test('the live seam also treats a locked Albatross designation as turned-on', async () => {
    await saveFranchiseDesignationRows([
      albatrossDesignation({ playerId: 'away-locked', teamId: 'team-a', status: 'locked' }),
    ]);

    await expect(flashpointCompute.resolveTurnedOnPlayers(scope, gameState())).resolves.toEqual([
      { playerId: 'away-locked', kind: 'albatross' },
    ]);
  });

  test('the live seam resolves active trade-demanders on a playing team and compute accrues the shared tax', async () => {
    setFranchisePhase2FlashpointEnabledForTests(true);
    await saveFranchiseTradeDemandRows([
      tradeDemandRow({ playerId: 'home-demander', teamId: 'team-b' }),
    ]);

    await expect(flashpointCompute.resolveTurnedOnPlayers(scope, gameState())).resolves.toEqual([
      { playerId: 'home-demander', kind: 'trade_demander' },
    ]);

    const result = await persistDarkFlashpointDecayForCompletedGame(gameState(), scope);
    const row = await getFranchiseFlashpointDecayRow(scope, 'home-demander');

    expect(result).toEqual({ status: 'written', written: 1 });
    expect(row).toMatchObject({
      playerId: 'home-demander',
      flashpointKind: 'trade_demander',
      consecutiveGamesUnresolved: 1,
      lastGameTax: -0.5,
      accumulatedFanMoraleTax: -0.5,
      updatedAtCheckpoint: 'flashpoint-game-1',
    });
  });

  test('the live seam gives Albatross precedence when the same player is also a trade-demander', async () => {
    await saveFranchiseDesignationRows([
      albatrossDesignation({ playerId: 'dual-player', teamId: 'team-b', status: 'active' }),
    ]);
    await saveFranchiseTradeDemandRows([
      tradeDemandRow({ playerId: 'dual-player', teamId: 'team-b' }),
    ]);

    await expect(flashpointCompute.resolveTurnedOnPlayers(scope, gameState())).resolves.toEqual([
      { playerId: 'dual-player', kind: 'albatross' },
    ]);
  });

  test('the live seam excludes active trade-demanders whose team is not in the completed game', async () => {
    await saveFranchiseTradeDemandRows([
      tradeDemandRow({ playerId: 'idle-demander', teamId: 'team-c' }),
    ]);

    await expect(flashpointCompute.resolveTurnedOnPlayers(scope, gameState())).resolves.toEqual([]);
  });

  test('flag-ON with a real active Albatross designation writes one dark albatross row for the holder', async () => {
    setFranchisePhase2FlashpointEnabledForTests(true);
    await saveFranchiseDesignationRows([
      albatrossDesignation({ playerId: 'home-albatross', teamId: 'team-b', status: 'active' }),
    ]);

    const result = await persistDarkFlashpointDecayForCompletedGame(gameState(), scope);
    const row = await getFranchiseFlashpointDecayRow(scope, 'home-albatross');

    expect(result).toEqual({ status: 'written', written: 1 });
    expect(row).toMatchObject({
      playerId: 'home-albatross',
      flashpointKind: 'albatross',
      consecutiveGamesUnresolved: 1,
      lastGameTax: -0.5,
      accumulatedFanMoraleTax: -0.5,
      updatedAtCheckpoint: 'flashpoint-game-1',
    });
  });

  test('compute module source stays firewalled from reporter LLM and narrative imports', async () => {
    const source = await import('node:fs/promises').then((fs) =>
      fs.readFile('src/utils/franchiseFlashpointDecayCompute.ts', 'utf8'),
    );

    expect(source).not.toMatch(/from ['"].*(reporter|llm|narrative)/i);
  });

  test('compute module source does not open the schedule IndexedDB directly', async () => {
    const source = await import('node:fs/promises').then((fs) =>
      fs.readFile('src/utils/franchiseFlashpointDecayCompute.ts', 'utf8'),
    );

    expect(source).not.toMatch(/indexedDB\.open|onupgradeneeded/);
  });
});
