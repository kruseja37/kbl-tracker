import 'fake-indexeddb/auto';

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import type { PersistedGameState } from '../gameStorage';
import type { ApplyFranchiseMoraleMatrixConsequenceInput } from '../franchiseMoraleState';
import type { PersistedTrueValueScope } from '../processCompletedGame';
import type { FranchiseStadiumRecordChange } from '../franchiseStadiumRecordsStorage';
import type { StoredFranchiseConfig } from '../../types/franchise';

const mocks = vi.hoisted(() => ({
  applyFranchiseMoraleMatrixConsequence: vi.fn(),
  getFranchiseConfig: vi.fn(),
}));

vi.mock('../franchiseManager', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../franchiseManager')>();
  return {
    ...actual,
    getFranchiseConfig: mocks.getFranchiseConfig,
  };
});

vi.mock('../franchiseMoraleState', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../franchiseMoraleState')>();
  mocks.applyFranchiseMoraleMatrixConsequence.mockImplementation(
    actual.applyFranchiseMoraleMatrixConsequence,
  );

  return {
    ...actual,
    applyFranchiseMoraleMatrixConsequence: mocks.applyFranchiseMoraleMatrixConsequence,
  };
});

import {
  clearFranchiseMoraleDatabaseForTests,
  getFranchiseMoraleSnapshot,
  resetFranchiseMoraleDatabaseForTests,
} from '../franchiseMoraleState';
import {
  setFranchisePhase2MoraleEnabledForTests,
} from '../franchisePhase2Flags';
import {
  deleteFranchiseDatabase,
  saveFranchisePlayer,
  type Player,
} from '../franchisePlayerStorage';
import { getFranchiseDatabaseName } from '../franchisePersistenceContract';
import { persistDarkParkRecordMoraleForCompletedGame } from '../processCompletedGame';

function deleteDatabase(name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => resolve();
  });
}

const scope: PersistedTrueValueScope = {
  franchiseId: 'franchise-park-record-morale',
  seasonId: 'season-park-record-morale-1',
  statsScopeId: 'season-park-record-morale-1',
  seasonNumber: 1,
};

function gameState(overrides: Partial<PersistedGameState> = {}): PersistedGameState {
  return {
    id: 'current',
    gameId: 'park-record-game-1',
    savedAt: '2026-06-26T05:00:00.000Z',
    inning: 9,
    halfInning: 'BOTTOM',
    outs: 3,
    homeScore: 6,
    awayScore: 4,
    bases: { first: null, second: null, third: null },
    currentBatterIndex: 0,
    atBatCount: 40,
    awayTeamId: 'team-away',
    homeTeamId: 'team-home',
    awayTeamName: 'Visitors',
    homeTeamName: 'Home Club',
    seasonNumber: scope.seasonNumber,
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

function playerTotal(playerId: string, teamId: string) {
  return {
    playerId,
    playerName: playerId,
    teamId,
    totalWpa: 1,
    battingWpa: 1,
    pitchingWpa: 0,
    catchingWpa: 0,
    fieldingWpa: 0,
    baserunningWpa: 0,
    managingWpa: 0,
  };
}

function player(overrides: Partial<Player> & Pick<Player, 'id'>): Player {
  return {
    id: overrides.id,
    firstName: 'Park',
    lastName: 'Record',
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
    personality: 'Tough',
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
      teamId: 'team-home',
      rosterStatus: 'MLB',
    }],
    editHistory: [],
    createdDate: '2026-01-01T00:00:00.000Z',
    lastModified: '2026-01-01T00:00:00.000Z',
    isCustom: false,
    ...overrides,
  } as Player;
}

function config(): StoredFranchiseConfig {
  return {
    franchiseId: scope.franchiseId,
    stadiums: [{
      teamId: 'team-home',
      teamName: 'Home Club',
      stadiumId: 'stadium-home',
      hasSeedParkFactors: true,
    }],
  } as StoredFranchiseConfig;
}

function stadiumChange(
  overrides: Partial<FranchiseStadiumRecordChange> = {},
): FranchiseStadiumRecordChange {
  return {
    stadiumId: 'stadium-home',
    recordType: 'farthest-hr-rhb',
    recordKey: 'season-1',
    changeKind: 'set',
    priorValue: null,
    priorLeaderPlayerIds: [],
    newValue: 471,
    newLeaderPlayerIds: ['player-home-holder'],
    ...overrides,
  };
}

describe('processCompletedGame park-record morale emitter', () => {
  beforeEach(async () => {
    resetFranchiseMoraleDatabaseForTests();
    mocks.applyFranchiseMoraleMatrixConsequence.mockClear();
    mocks.getFranchiseConfig.mockReset();
    mocks.getFranchiseConfig.mockResolvedValue(config());
    await deleteDatabase('kbl-franchise-morale');
    await deleteDatabase(getFranchiseDatabaseName(scope.franchiseId));
  });

  afterEach(async () => {
    setFranchisePhase2MoraleEnabledForTests(null);
    await clearFranchiseMoraleDatabaseForTests();
    resetFranchiseMoraleDatabaseForTests();
    await deleteFranchiseDatabase(scope.franchiseId).catch(() => undefined);
  });

  test('flag off leaves park-record morale dark and never applies the matrix consequence', async () => {
    setFranchisePhase2MoraleEnabledForTests(false);

    await persistDarkParkRecordMoraleForCompletedGame(
      gameState(),
      scope,
      [stadiumChange()],
    );

    expect(mocks.getFranchiseConfig).not.toHaveBeenCalled();
    expect(mocks.applyFranchiseMoraleMatrixConsequence).not.toHaveBeenCalled();
  });

  test('home-team sole holder writes PARK_RECORD_SET fan buzz with self delta guarded at zero', async () => {
    setFranchisePhase2MoraleEnabledForTests(true);
    await saveFranchisePlayer(scope.franchiseId, player({ id: 'player-home-holder' }));
    const completedGame = gameState({
      playerWpaTotals: [playerTotal('player-home-holder', 'team-home')],
    });

    await persistDarkParkRecordMoraleForCompletedGame(
      completedGame,
      scope,
      [stadiumChange()],
      { context: { scheduleGameId: 'schedule-game-park-1' } },
    );

    expect(mocks.applyFranchiseMoraleMatrixConsequence).toHaveBeenCalledTimes(1);
    const input = mocks.applyFranchiseMoraleMatrixConsequence.mock.calls[0]?.[0] as
      | ApplyFranchiseMoraleMatrixConsequenceInput
      | undefined;
    expect(input).toMatchObject({
      franchiseId: scope.franchiseId,
      seasonId: scope.seasonId,
      statsScopeId: scope.statsScopeId,
      seasonNumber: scope.seasonNumber,
      playerId: 'player-home-holder',
      teamId: 'team-home',
      sourceEventId: [
        'park-record-set',
        scope.franchiseId,
        scope.seasonId,
        scope.statsScopeId,
        'schedule-game-park-1',
        'stadium-home',
        'farthest-hr-rhb',
        'season-1',
        'set',
        'player-home-holder',
      ].join(':'),
      timestamp: '2026-06-26T05:00:00.000Z',
    });
    expect(input?.consequence.eventType).toBe('PARK_RECORD_SET');
    expect(input?.consequence.selfPlayerMoraleDelta).toBe(0);
    expect(input?.consequence.teamFanMoraleDelta).toBe(4);
    expect(input?.consequence.base.reason).toBe('achievement.park_record_set');

    const fanSnapshot = await getFranchiseMoraleSnapshot(scope, 'team-fan', 'team-home');
    expect(fanSnapshot?.currentValue).toBe(54);
    expect(fanSnapshot?.history[0].sourceEventId).toBe(input?.sourceEventId);
    await expect(getFranchiseMoraleSnapshot(scope, 'player', 'player-home-holder')).resolves.toBeNull();
  });

  test('visitor sole holder earns no home-crowd buzz', async () => {
    setFranchisePhase2MoraleEnabledForTests(true);
    await saveFranchisePlayer(scope.franchiseId, player({
      id: 'player-away-holder',
      leagueAssignments: [{
        leagueId: 'league-1',
        teamId: 'team-away',
        rosterStatus: 'MLB',
      }],
    }));
    const completedGame = gameState({
      playerWpaTotals: [playerTotal('player-away-holder', 'team-away')],
    });

    await persistDarkParkRecordMoraleForCompletedGame(
      completedGame,
      scope,
      [stadiumChange({ newLeaderPlayerIds: ['player-away-holder'] })],
    );

    expect(mocks.applyFranchiseMoraleMatrixConsequence).not.toHaveBeenCalled();
    await expect(getFranchiseMoraleSnapshot(scope, 'team-fan', 'team-home')).resolves.toBeNull();
  });

  test('tied new leaders do not fire a park-record morale event', async () => {
    setFranchisePhase2MoraleEnabledForTests(true);

    await persistDarkParkRecordMoraleForCompletedGame(
      gameState(),
      scope,
      [stadiumChange({ newLeaderPlayerIds: ['player-one', 'player-two'] })],
    );

    expect(mocks.applyFranchiseMoraleMatrixConsequence).not.toHaveBeenCalled();
  });

  test('stable park-record sourceEventId dedupes repeated identical invocations', async () => {
    setFranchisePhase2MoraleEnabledForTests(true);
    await saveFranchisePlayer(scope.franchiseId, player({ id: 'player-home-holder' }));
    const completedGame = gameState({
      gameId: 'park-record-dedupe-game',
      savedAt: 67890,
      playerWpaTotals: [playerTotal('player-home-holder', 'team-home')],
    });

    await persistDarkParkRecordMoraleForCompletedGame(completedGame, scope, [stadiumChange()]);
    await persistDarkParkRecordMoraleForCompletedGame(completedGame, scope, [stadiumChange()]);

    expect(mocks.applyFranchiseMoraleMatrixConsequence).toHaveBeenCalledTimes(2);
    const fanSnapshot = await getFranchiseMoraleSnapshot(scope, 'team-fan', 'team-home');
    expect(fanSnapshot?.currentValue).toBe(54);
    expect(fanSnapshot?.history).toHaveLength(1);
    expect(fanSnapshot?.history[0].sourceEventId).toBe(
      [
        'park-record-set',
        scope.franchiseId,
        scope.seasonId,
        scope.statsScopeId,
        'park-record-dedupe-game',
        'stadium-home',
        'farthest-hr-rhb',
        'season-1',
        'set',
        'player-home-holder',
      ].join(':'),
    );
  });
});
