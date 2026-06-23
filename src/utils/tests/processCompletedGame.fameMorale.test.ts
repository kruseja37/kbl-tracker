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
import {
  clearFranchiseDesignationDatabaseForTests,
  resetFranchiseDesignationDatabaseForTests,
  saveFranchiseDesignationRows,
} from '../franchiseDesignationStorage';
import type { FranchisePlayerDesignationRecord } from '../franchiseDesignations';
import {
  clearFranchiseMoraleDatabaseForTests,
  getFranchiseMoraleSnapshot,
  resetFranchiseMoraleDatabaseForTests,
} from '../franchiseMoraleState';
import {
  setFranchisePhase2FameEnabledForTests,
  setFranchisePhase2MoraleEnabledForTests,
} from '../franchisePhase2Flags';
import {
  deleteFranchiseDatabase,
  saveFranchisePlayer,
  type Player,
} from '../franchisePlayerStorage';
import { getFranchiseDatabaseName } from '../franchisePersistenceContract';
import { persistFameMoraleConsequencesAfterFame } from '../processCompletedGame';
import {
  persistDarkChannelAFanMoraleForCompletedGame,
  persistDarkChannelBSteadyFanMoraleForCompletedGame,
} from '../processCompletedGame';
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
  franchiseId: 'franchise-fame-morale',
  seasonId: 'season-fame-morale-1',
  statsScopeId: 'season-fame-morale-1',
  seasonNumber: 1,
  rows: [],
};

function gameState(overrides: Partial<PersistedGameState> = {}): PersistedGameState {
  return {
    id: 'current',
    gameId: 'fame-morale-game-1',
    savedAt: 12345,
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

function playerTotal(playerId: string, totalWpa: number, teamId = 'team-a') {
  return {
    playerId,
    playerName: playerId,
    teamId,
    totalWpa,
    battingWpa: totalWpa,
    pitchingWpa: 0,
    catchingWpa: 0,
    fieldingWpa: 0,
    baserunningWpa: 0,
    managingWpa: 0,
  };
}

function designation(
  overrides: Partial<FranchisePlayerDesignationRecord> = {},
): FranchisePlayerDesignationRecord {
  return {
    franchiseId: scope.franchiseId,
    seasonId: scope.seasonId,
    statsScopeId: scope.statsScopeId,
    seasonNumber: scope.seasonNumber,
    teamId: 'team-a',
    playerId: 'player-fame',
    playerName: 'Fame Target',
    type: 'FAN_FAVORITE',
    status: 'active',
    sourceInputs: {},
    sourceEvidence: ['A1.2c test fixture'],
    calculationVersion: 'a1.2c-test',
    calculatedAt: '2026-06-23T00:00:00.000Z',
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

function player(overrides: Partial<Player> & Pick<Player, 'id'>): Player {
  return {
    id: overrides.id,
    firstName: 'Fame',
    lastName: 'Target',
    gender: 'M',
    age: 28,
    bats: 'R',
    throws: 'R',
    primaryPosition: 'CF',
    power: 50,
    contact: 50,
    speed: 50,
    fielding: 50,
    arm: 50,
    velocity: 50,
    junk: 50,
    accuracy: 50,
    arsenal: [],
    overallGrade: 'B',
    personality: 'Egotistical',
    chemistry: 'Competitive',
    hiddenPersonalityModifiers: {
      loyalty: 50,
      ambition: 50,
      resilience: 50,
      charisma: 50,
    },
    morale: 50,
    mojo: 'Normal',
    fame: 0,
    salary: 1000,
    leagueAssignments: [{
      leagueId: 'league-1',
      teamId: 'team-a',
      rosterStatus: 'MLB',
    }],
    editHistory: [],
    createdDate: '2026-01-01T00:00:00.000Z',
    lastModified: '2026-01-01T00:00:00.000Z',
    isCustom: false,
    ...overrides,
  } as Player;
}

describe('processCompletedGame fame morale emitter', () => {
  beforeEach(async () => {
    resetFranchiseFameRecordsForTests();
    resetFranchiseDesignationDatabaseForTests();
    resetFranchiseMoraleDatabaseForTests();
    await deleteDatabase('kbl-tracker');
    await deleteDatabase('kbl-franchise-morale');
    await deleteDatabase(getFranchiseDatabaseName(scope.franchiseId));
    vi.spyOn(syncEngine, 'isSuppressed').mockReturnValue(true);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    setFranchisePhase2FameEnabledForTests(null);
    setFranchisePhase2MoraleEnabledForTests(null);
    await clearFranchiseFameRecordsForTests();
    await clearFranchiseDesignationDatabaseForTests();
    await clearFranchiseMoraleDatabaseForTests();
    resetFranchiseFameRecordsForTests();
    resetFranchiseDesignationDatabaseForTests();
    resetFranchiseMoraleDatabaseForTests();
    await deleteFranchiseDatabase(scope.franchiseId).catch(() => undefined);
  });

  test('fame flag on and morale flag off writes fame rows but leaves morale store dark', async () => {
    setFranchisePhase2FameEnabledForTests(true);
    setFranchisePhase2MoraleEnabledForTests(false);
    await saveFranchisePlayer(scope.franchiseId, player({ id: 'player-fame' }));
    const completedGame = gameState({
      playerWpaTotals: [playerTotal('player-fame', 0.4)],
    });

    const fameResult = await persistDarkFameRecordsForCompletedGame(completedGame, scope);
    await persistFameMoraleConsequencesAfterFame(completedGame, scope, fameResult.playerHeatDeltas);

    expect(fameResult).toEqual({
      status: 'written',
      written: 1,
      playerHeatDeltas: [{ playerId: 'player-fame', heatDelta: 4 }],
    });
    await expect(getFranchiseFameRecord(scope, 'player-fame')).resolves.toMatchObject({
      heat: 4,
      updatedAtCheckpoint: 'fame-morale-game-1',
    });
    await expect(getFranchiseMoraleSnapshot(scope, 'player', 'player-fame')).resolves.toBeNull();
    await expect(getFranchiseMoraleSnapshot(scope, 'team-fan', 'team-a')).resolves.toBeNull();
  });

  test('stable fame sourceEventId dedupes morale and duplicate checkpoint skips fame loop', async () => {
    setFranchisePhase2FameEnabledForTests(true);
    setFranchisePhase2MoraleEnabledForTests(true);
    await saveFranchisePlayer(scope.franchiseId, player({ id: 'player-fame' }));
    const completedGame = gameState({
      gameId: 'fame-morale-dedupe-game',
      playerWpaTotals: [playerTotal('player-fame', 1)],
    });

    const firstFameResult = await persistDarkFameRecordsForCompletedGame(completedGame, scope);
    await persistFameMoraleConsequencesAfterFame(completedGame, scope, firstFameResult.playerHeatDeltas);
    await persistFameMoraleConsequencesAfterFame(completedGame, scope, firstFameResult.playerHeatDeltas);
    const duplicateFameResult = await persistDarkFameRecordsForCompletedGame(completedGame, scope);
    await persistFameMoraleConsequencesAfterFame(completedGame, scope, duplicateFameResult.playerHeatDeltas);

    expect(firstFameResult).toEqual({
      status: 'written',
      written: 1,
      playerHeatDeltas: [{ playerId: 'player-fame', heatDelta: 10 }],
    });
    expect(duplicateFameResult).toEqual({
      status: 'written',
      written: 0,
      playerHeatDeltas: [],
    });

    const moraleSnapshot = await getFranchiseMoraleSnapshot(scope, 'player', 'player-fame');
    expect(moraleSnapshot?.history).toHaveLength(1);
    expect(moraleSnapshot?.history[0].sourceEventId).toBe(
      'fame:franchise-fame-morale:season-fame-morale-1:season-fame-morale-1:fame-morale-dedupe-game:player-fame:heat-delta',
    );
    await expect(getFranchiseFameRecord(scope, 'player-fame')).resolves.toMatchObject({
      heat: 10,
      updatedAtCheckpoint: 'fame-morale-dedupe-game',
    });
  });

  test('Channel A and B are dark no-ops when morale flag is off', async () => {
    setFranchisePhase2MoraleEnabledForTests(false);
    const completedGame = gameState({
      playerWpaTotals: [
        playerTotal('player-home', 1, 'team-b'),
        playerTotal('player-away', 1, 'team-a'),
      ],
    });
    await saveFranchiseDesignationRows([
      designation({
        teamId: 'team-b',
        playerId: 'player-home',
        playerName: 'Home Star',
        type: 'FAN_FAVORITE',
      }),
    ]);

    await expect(persistDarkChannelAFanMoraleForCompletedGame(completedGame, scope))
      .resolves.toMatchObject({ status: 'dark-noop', written: 0 });
    await expect(persistDarkChannelBSteadyFanMoraleForCompletedGame(completedGame, scope))
      .resolves.toMatchObject({ status: 'dark-noop', written: 0 });

    await expect(getFranchiseMoraleSnapshot(scope, 'team-fan', 'team-a')).resolves.toBeNull();
    await expect(getFranchiseMoraleSnapshot(scope, 'team-fan', 'team-b')).resolves.toBeNull();
  });

  test('Channel A writes one team-fan swing per team and dedupes by checkpoint sourceEventId', async () => {
    setFranchisePhase2MoraleEnabledForTests(true);
    setFranchisePhase2FameEnabledForTests(false);
    const completedGame = gameState({
      gameId: 'channel-a-game-7',
      homeScore: 5,
      awayScore: 2,
      halfInning: 'BOTTOM',
      playerWpaTotals: [
        playerTotal('player-away-low', -0.2, 'team-a'),
        playerTotal('player-away-top', 0.4, 'team-a'),
        playerTotal('player-home-top', 1.1, 'team-b'),
      ],
    });
    await saveFranchiseDesignationRows([
      designation({
        teamId: 'team-b',
        playerId: 'player-home-top',
        playerName: 'Home Star',
        type: 'FAN_FAVORITE',
      }),
    ]);

    await expect(persistDarkChannelAFanMoraleForCompletedGame(completedGame, scope))
      .resolves.toEqual({ status: 'written', written: 2 });
    await expect(persistDarkChannelAFanMoraleForCompletedGame(completedGame, scope))
      .resolves.toEqual({ status: 'written', written: 0 });

    const home = await getFranchiseMoraleSnapshot(scope, 'team-fan', 'team-b');
    const away = await getFranchiseMoraleSnapshot(scope, 'team-fan', 'team-a');
    expect(home?.history).toHaveLength(1);
    expect(away?.history).toHaveLength(1);
    expect(home?.history[0].sourceEventId).toBe('channel-a-game-swing:channel-a-game-7:team-b');
    expect(away?.history[0].sourceEventId).toBe('channel-a-game-swing:channel-a-game-7:team-a');
    expect(home?.history[0].reason).toContain('fan_morale.channel_a.walk_off_win');
    expect(away?.history[0].reason).toContain('fan_morale.channel_a.walk_off_loss');
  });

  test('Channel B writes held Fan Favorite warmth once and never emits Albatross steady warmth', async () => {
    setFranchisePhase2MoraleEnabledForTests(true);
    const completedGame = gameState({
      gameId: 'channel-b-game-3',
      playerWpaTotals: [
        playerTotal('player-away', 0.4, 'team-a'),
        playerTotal('player-home', 0.7, 'team-b'),
      ],
    });
    await saveFranchiseDesignationRows([
      designation({
        teamId: 'team-a',
        playerId: 'player-fan-favorite',
        playerName: 'Fan Favorite',
        type: 'FAN_FAVORITE',
        status: 'locked',
      }),
      designation({
        teamId: 'team-b',
        playerId: 'player-albatross',
        playerName: 'Albatross',
        type: 'ALBATROSS',
        status: 'locked',
      }),
    ]);

    await expect(persistDarkChannelBSteadyFanMoraleForCompletedGame(completedGame, scope))
      .resolves.toEqual({ status: 'written', written: 1 });
    await expect(persistDarkChannelBSteadyFanMoraleForCompletedGame(completedGame, scope))
      .resolves.toEqual({ status: 'written', written: 0 });

    const fanFavoriteTeam = await getFranchiseMoraleSnapshot(scope, 'team-fan', 'team-a');
    const albatrossTeam = await getFranchiseMoraleSnapshot(scope, 'team-fan', 'team-b');
    expect(fanFavoriteTeam?.history).toHaveLength(1);
    expect(fanFavoriteTeam?.history[0].sourceEventId).toBe(
      'designation-steady-fan:channel-b-game-3:team-a:FAN_FAVORITE',
    );
    expect(fanFavoriteTeam?.history[0].reason).toContain('fan_morale.channel_b.fan_favorite_steady');
    expect(albatrossTeam).toBeNull();
  });
});
