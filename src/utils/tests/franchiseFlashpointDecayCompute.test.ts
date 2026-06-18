import 'fake-indexeddb/auto';

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import type { PersistedGameState } from '../gameStorage';
import * as flashpointCompute from '../franchiseFlashpointDecayCompute';
import {
  persistDarkFlashpointDecayForCompletedGame,
  type FlashpointScope,
} from '../franchiseFlashpointDecayCompute';
import {
  clearFranchiseFlashpointDecayForTests,
  getFranchiseFlashpointDecayRow,
  resetFranchiseFlashpointDecayForTests,
} from '../franchiseFlashpointDecayStorage';
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
    await deleteDatabase('kbl-tracker');
    vi.spyOn(syncEngine, 'isSuppressed').mockReturnValue(true);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    setFranchisePhase2FlashpointEnabledForTests(null);
    await clearFranchiseFlashpointDecayForTests();
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

    // The real resolveTurnedOnPlayers seam returns [] today.
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
      .mockReturnValue([{ playerId: 'player-albatross', kind: 'albatross' }]);

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

  test('the live seam resolveTurnedOnPlayers returns [] until L7/L10/L13', () => {
    expect(flashpointCompute.resolveTurnedOnPlayers(scope, gameState())).toEqual([]);
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
