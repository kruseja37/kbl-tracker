import 'fake-indexeddb/auto';

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import type { PersistedGameState } from '../gameStorage';
import {
  persistDarkFameRecordsForCompletedGame,
  type PersistedTrueValueResult,
} from '../franchiseFameCompute';
import {
  clearFranchiseFameRecordsForTests,
  getFranchiseFameRecord,
  resetFranchiseFameRecordsForTests,
} from '../franchiseFameRecordsStorage';
import type { FranchiseStadiumRecordChange } from '../franchiseStadiumRecordsStorage';
import { setFranchisePhase2FameEnabledForTests } from '../franchisePhase2Flags';
import { syncEngine } from '../syncEngine';

function deleteDatabase(name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => resolve();
  });
}

const scope: PersistedTrueValueResult = {
  franchiseId: 'franchise-fame',
  seasonId: 'season-fame-1',
  statsScopeId: 'season-fame-1',
  seasonNumber: 1,
  rows: [],
};

function gameState(overrides: Partial<PersistedGameState> = {}): PersistedGameState {
  return {
    id: 'current',
    gameId: 'fame-game-1',
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

function playerTotal(playerId: string, totalWpa: number) {
  return {
    playerId,
    playerName: playerId,
    teamId: 'team-a',
    totalWpa,
    battingWpa: totalWpa,
    pitchingWpa: 0,
    catchingWpa: 0,
    fieldingWpa: 0,
    baserunningWpa: 0,
    managingWpa: 0,
  };
}

function fameEvent(
  playerId: string,
  eventType: string,
  fameValue: number,
): PersistedGameState['fameEvents'][number] {
  return {
    id: `${playerId}:${eventType}`,
    gameId: 'fame-game-1',
    eventType,
    playerId,
    playerName: playerId,
    playerTeam: 'away',
    teamId: 'team-a',
    fameValue,
    fameType: fameValue >= 0 ? 'bonus' : 'boner',
    inning: 9,
    halfInning: 'BOTTOM',
    timestamp: 1,
    autoDetected: true,
  };
}

function stadiumChange(
  overrides: Partial<FranchiseStadiumRecordChange> & {
    recordType: FranchiseStadiumRecordChange['recordType'];
    changeKind: FranchiseStadiumRecordChange['changeKind'];
    newLeaderPlayerIds: string[];
  },
): FranchiseStadiumRecordChange {
  return {
    stadiumId: 'stadium-fame',
    recordType: overrides.recordType,
    recordKey: 'overall',
    changeKind: overrides.changeKind,
    priorValue: overrides.priorValue ?? (overrides.changeKind === 'set' ? null : 400),
    priorLeaderPlayerIds: overrides.priorLeaderPlayerIds ?? [],
    newValue: overrides.newValue ?? 425,
    newLeaderPlayerIds: overrides.newLeaderPlayerIds,
  };
}

describe('franchise dark fame compute', () => {
  beforeEach(async () => {
    resetFranchiseFameRecordsForTests();
    await deleteDatabase('kbl-tracker');
    vi.spyOn(syncEngine, 'isSuppressed').mockReturnValue(true);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    setFranchisePhase2FameEnabledForTests(null);
    await clearFranchiseFameRecordsForTests();
    resetFranchiseFameRecordsForTests();
  });

  test('default-off writer gate returns dark-noop and writes no would-be fame rows', async () => {
    setFranchisePhase2FameEnabledForTests(false);
    const completedGame = gameState({
      playerWpaTotals: [
        playerTotal('player-wpa-only', 0.4),
        playerTotal('player-both', 0.2),
      ],
      fameEvents: [
        fameEvent('player-event-only', 'WEB_GEM', 1),
        fameEvent('player-both', 'WALK_OFF', 2),
      ],
    });

    const result = await persistDarkFameRecordsForCompletedGame(completedGame, scope);

    expect(result).toEqual({
      status: 'dark-noop',
      written: 0,
      playerHeatDeltas: [],
      reason: 'Phase-2 fame disabled; per-game fame compute not written.',
    });
    await expect(getFranchiseFameRecord(scope, 'player-wpa-only')).resolves.toBeNull();
    await expect(getFranchiseFameRecord(scope, 'player-event-only')).resolves.toBeNull();
    await expect(getFranchiseFameRecord(scope, 'player-both')).resolves.toBeNull();
  });

  test('flag-on path decays on write, ratchets reach floor upward only, latches negative heat, and skips checkpoint re-entry', async () => {
    setFranchisePhase2FameEnabledForTests(true);
    const firstGame = gameState({
      gameId: 'fame-game-1',
      playerWpaTotals: [playerTotal('player-1', 0.9)],
      fameEvents: [fameEvent('player-1', 'WEB_GEM', 1)],
    });
    const secondGame = gameState({
      gameId: 'fame-game-2',
      playerWpaTotals: [playerTotal('player-1', -1.1)],
      fameEvents: [fameEvent('player-1', 'FAILED_ROBBERY', -1)],
    });

    const firstResult = await persistDarkFameRecordsForCompletedGame(firstGame, scope);
    const firstRow = await getFranchiseFameRecord(scope, 'player-1');

    expect(firstResult).toEqual({
      status: 'written',
      written: 1,
      playerHeatDeltas: [{ playerId: 'player-1', heatDelta: 10 }],
    });
    expect(firstRow).toMatchObject({
      heat: 10,
      reachFloor: 2,
      wasNegative: false,
      channelTotal: 10,
      defensiveFame: 1,
      rolePlayerFame: 0,
      updatedAtCheckpoint: 'fame-game-1',
    });
    expect(firstRow?.channelByChannel).toMatchObject({
      wpa_spine: 9,
      defensive: 1,
      iconic_event: 0,
    });

    const secondResult = await persistDarkFameRecordsForCompletedGame(secondGame, scope);
    const secondRow = await getFranchiseFameRecord(scope, 'player-1');

    expect(secondResult).toEqual({
      status: 'written',
      written: 1,
      playerHeatDeltas: [{ playerId: 'player-1', heatDelta: -13.5 }],
    });
    expect(secondRow).toMatchObject({
      heat: -3.5,
      reachFloor: 2,
      wasNegative: true,
      channelTotal: -12,
      defensiveFame: -1,
      rolePlayerFame: 0,
      updatedAtCheckpoint: 'fame-game-2',
    });
    expect(secondRow?.reachFloor).toBe(firstRow?.reachFloor);

    const duplicateResult = await persistDarkFameRecordsForCompletedGame(secondGame, scope);
    const duplicateRow = await getFranchiseFameRecord(scope, 'player-1');

    expect(duplicateResult).toEqual({ status: 'written', written: 0, playerHeatDeltas: [] });
    expect(duplicateRow).toEqual(secondRow);
  });

  test('flag-on path applies the WAR legitimacy floor only as an upward lift', async () => {
    setFranchisePhase2FameEnabledForTests(true);
    const completedGame = gameState({
      gameId: 'fame-game-war-floor',
      playerWpaTotals: [playerTotal('player-1', 0.1)],
    });

    await persistDarkFameRecordsForCompletedGame(completedGame, { ...scope, rows: [] });
    const baselineHeat = (await getFranchiseFameRecord(scope, 'player-1'))?.heat;
    expect(baselineHeat).toBeTypeOf('number');

    await clearFranchiseFameRecordsForTests();
    resetFranchiseFameRecordsForTests();
    await persistDarkFameRecordsForCompletedGame(completedGame, {
      ...scope,
      rows: [{ playerId: 'player-1', warPercentile: 0.95 } as PersistedTrueValueResult['rows'][number]],
    });
    const eliteMeritHeat = (await getFranchiseFameRecord(scope, 'player-1'))?.heat;

    await clearFranchiseFameRecordsForTests();
    resetFranchiseFameRecordsForTests();
    await persistDarkFameRecordsForCompletedGame(completedGame, {
      ...scope,
      rows: [{ playerId: 'player-1', warPercentile: 0.05 } as PersistedTrueValueResult['rows'][number]],
    });
    const lowMeritHeat = (await getFranchiseFameRecord(scope, 'player-1'))?.heat;

    expect(eliteMeritHeat).toBeTypeOf('number');
    expect(lowMeritHeat).toBeTypeOf('number');
    expect(eliteMeritHeat).toBeGreaterThan(baselineHeat as number);
    expect(lowMeritHeat as number).toBeLessThanOrEqual(baselineHeat as number);
  });

  test('folds a positive stadium-record SET bump into the active new holder heat write', async () => {
    setFranchisePhase2FameEnabledForTests(true);
    const completedGame = gameState({
      gameId: 'fame-game-stadium-set',
      playerWpaTotals: [playerTotal('player-park-hero', 0.4)],
    });

    const result = await persistDarkFameRecordsForCompletedGame(
      completedGame,
      scope,
      undefined,
      [
        stadiumChange({
          recordType: 'farthest-hr-rhb',
          changeKind: 'set',
          newLeaderPlayerIds: ['player-park-hero'],
        }),
      ],
    );
    const row = await getFranchiseFameRecord(scope, 'player-park-hero');

    expect(result).toEqual({
      status: 'written',
      written: 1,
      playerHeatDeltas: [{ playerId: 'player-park-hero', heatDelta: 7 }],
    });
    expect(row).toMatchObject({
      heat: 7,
      channelTotal: 4,
      updatedAtCheckpoint: 'fame-game-stadium-set',
    });
  });

  test('writes a fame row for a dethroned prior holder who did not play this game', async () => {
    setFranchisePhase2FameEnabledForTests(true);
    const completedGame = gameState({
      gameId: 'fame-game-stadium-overtake',
      playerWpaTotals: [playerTotal('new-park-holder', 0)],
    });

    const result = await persistDarkFameRecordsForCompletedGame(
      completedGame,
      scope,
      undefined,
      [
        stadiumChange({
          recordType: 'farthest-hr-rhb',
          changeKind: 'overtake',
          priorLeaderPlayerIds: ['dethroned-holder'],
          newLeaderPlayerIds: ['new-park-holder'],
        }),
      ],
    );
    const dethronedRow = await getFranchiseFameRecord(scope, 'dethroned-holder');

    expect(result).toEqual({
      status: 'written',
      written: 2,
      playerHeatDeltas: [
        { playerId: 'new-park-holder', heatDelta: 2.25 },
        { playerId: 'dethroned-holder', heatDelta: -1.5 },
      ],
    });
    expect(dethronedRow).toMatchObject({
      heat: -1.5,
      wasNegative: true,
      channelTotal: 0,
      defensiveFame: 0,
      rolePlayerFame: 0,
      updatedAtCheckpoint: 'fame-game-stadium-overtake',
    });
    expect(dethronedRow?.channelByChannel).toMatchObject({
      wpa_spine: 0,
      iconic_event: 0,
      defensive: 0,
      role_player: 0,
    });
  });

  test('compute module source stays firewalled from reporter LLM and narrative imports', async () => {
    const source = await import('node:fs/promises').then((fs) =>
      fs.readFile('src/utils/franchiseFameCompute.ts', 'utf8'),
    );

    expect(source).not.toMatch(/from ['"].*(reporter|llm|narrative)/i);
  });

  test('compute module source does not open the schedule IndexedDB directly', async () => {
    const source = await import('node:fs/promises').then((fs) =>
      fs.readFile('src/utils/franchiseFameCompute.ts', 'utf8'),
    );

    expect(source).not.toMatch(/indexedDB\.open|onupgradeneeded/);
  });
});
