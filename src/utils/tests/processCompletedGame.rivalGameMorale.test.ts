import 'fake-indexeddb/auto';

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import type { PersistedGameState } from '../gameStorage';
import type { ApplyFranchiseMoraleMatrixConsequenceInput } from '../franchiseMoraleState';
import type { Player, Team } from '../franchisePlayerStorage';
import type { PersistedTrueValueScope } from '../processCompletedGame';

const mocks = vi.hoisted(() => ({
  applyFranchiseMoraleMatrixConsequence: vi.fn(),
}));

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
  setFranchisePhase2StadiumRecordsEnabledForTests,
} from '../franchisePhase2Flags';
import {
  deleteFranchiseDatabase,
  saveFranchisePlayer,
  saveFranchiseTeam,
} from '../franchisePlayerStorage';
import { getFranchiseDatabaseName } from '../franchisePersistenceContract';
import { persistDarkRivalGameMoraleForCompletedGame } from '../processCompletedGame';

function deleteDatabase(name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => resolve();
  });
}

const scope: PersistedTrueValueScope = {
  franchiseId: 'franchise-rival-game-morale',
  seasonId: 'season-rival-game-morale-1',
  statsScopeId: 'season-rival-game-morale-1',
  seasonNumber: 1,
};

function gameState(overrides: Partial<PersistedGameState> = {}): PersistedGameState {
  return {
    id: 'current',
    gameId: 'rival-game-1',
    savedAt: '2026-06-26T18:00:00.000Z',
    inning: 9,
    halfInning: 'TOP',
    outs: 3,
    homeScore: 7,
    awayScore: 4,
    bases: { first: null, second: null, third: null },
    currentBatterIndex: 0,
    atBatCount: 40,
    awayTeamId: 'team-away',
    homeTeamId: 'team-home',
    awayTeamName: 'Away Club',
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

function team(id: string, captainPlayerId: string | null): Omit<Team, 'createdDate' | 'lastModified'> {
  return {
    id,
    name: id,
    abbreviation: id.slice(-4).toUpperCase(),
    location: id,
    nickname: id,
    colors: {
      primary: '#111111',
      secondary: '#eeeeee',
    },
    stadium: `${id} Park`,
    leagueIds: ['league-1'],
    captainPlayerId,
  };
}

function player(id: string, teamId: string, overrides: Partial<Player> = {}): Player {
  return {
    id,
    firstName: id,
    lastName: 'Captain',
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
      teamId,
      rosterStatus: 'MLB',
    }],
    editHistory: [],
    createdDate: '2026-01-01T00:00:00.000Z',
    lastModified: '2026-01-01T00:00:00.000Z',
    isCustom: false,
    ...overrides,
  } as Player;
}

async function seedTeams(params: { homeCaptain?: string | null; awayCaptain?: string | null } = {}): Promise<void> {
  const homeCaptain = Object.prototype.hasOwnProperty.call(params, 'homeCaptain')
    ? params.homeCaptain ?? null
    : 'captain-home';
  const awayCaptain = Object.prototype.hasOwnProperty.call(params, 'awayCaptain')
    ? params.awayCaptain ?? null
    : 'captain-away';
  await saveFranchiseTeam(scope.franchiseId, team('team-home', homeCaptain));
  await saveFranchiseTeam(scope.franchiseId, team('team-away', awayCaptain));
  await saveFranchiseTeam(scope.franchiseId, team('team-third', null));
  if (homeCaptain !== null) {
    await saveFranchisePlayer(scope.franchiseId, player(homeCaptain, 'team-home'));
  }
  if (awayCaptain !== null) {
    await saveFranchisePlayer(scope.franchiseId, player(awayCaptain, 'team-away'));
  }
}

function callInputs(): ApplyFranchiseMoraleMatrixConsequenceInput[] {
  return mocks.applyFranchiseMoraleMatrixConsequence.mock.calls.map(
    (call) => call[0] as ApplyFranchiseMoraleMatrixConsequenceInput,
  );
}

describe('processCompletedGame rival-game morale emitter', () => {
  beforeEach(async () => {
    resetFranchiseMoraleDatabaseForTests();
    mocks.applyFranchiseMoraleMatrixConsequence.mockClear();
    await deleteDatabase('kbl-franchise-morale');
    await deleteDatabase(getFranchiseDatabaseName(scope.franchiseId));
  });

  afterEach(async () => {
    setFranchisePhase2MoraleEnabledForTests(null);
    setFranchisePhase2StadiumRecordsEnabledForTests(null);
    await clearFranchiseMoraleDatabaseForTests();
    resetFranchiseMoraleDatabaseForTests();
    await deleteFranchiseDatabase(scope.franchiseId).catch(() => undefined);
  });

  test('morale flag off leaves rival-game morale dark', async () => {
    setFranchisePhase2MoraleEnabledForTests(false);
    await seedTeams();

    await persistDarkRivalGameMoraleForCompletedGame(
      gameState(),
      scope,
      new Map([['team-home', 'team-away']]),
    );

    expect(mocks.applyFranchiseMoraleMatrixConsequence).not.toHaveBeenCalled();
  });

  test('bilateral rival game writes one signed consequence per qualifying team', async () => {
    setFranchisePhase2MoraleEnabledForTests(true);
    await seedTeams();

    await persistDarkRivalGameMoraleForCompletedGame(
      gameState(),
      scope,
      new Map([
        ['team-home', 'team-away'],
        ['team-away', 'team-home'],
      ]),
      { context: { scheduleGameId: 'schedule-rival-1' } },
    );

    expect(mocks.applyFranchiseMoraleMatrixConsequence).toHaveBeenCalledTimes(2);
    const homeInput = callInputs().find((input) => input.teamId === 'team-home');
    const awayInput = callInputs().find((input) => input.teamId === 'team-away');

    expect(homeInput).toMatchObject({
      playerId: 'captain-home',
      teamId: 'team-home',
      sourceEventId: [
        'rival-grudge',
        scope.franchiseId,
        scope.seasonId,
        scope.statsScopeId,
        'schedule-rival-1',
        'team-home',
        'team-away',
        'won',
      ].join(':'),
    });
    expect(homeInput?.consequence.eventType).toBe('RIVAL_GAME_WIN');
    expect(homeInput?.consequence.teamFanMoraleDelta).toBe(2);
    expect(homeInput?.consequence.selfPlayerMoraleDelta).toBe(1);
    expect(homeInput?.consequence.totalPlayerMoraleDelta).toBe(1);

    expect(awayInput?.consequence.eventType).toBe('RIVAL_GAME_LOSS');
    expect(awayInput?.consequence.teamFanMoraleDelta).toBeLessThan(0);
    expect(awayInput?.consequence.selfPlayerMoraleDelta).toBeLessThan(0);
    expect(awayInput?.consequence.totalPlayerMoraleDelta).toBeLessThan(0);

    await expect(getFranchiseMoraleSnapshot(scope, 'team-fan', 'team-home')).resolves.toMatchObject({ currentValue: 52 });
    await expect(getFranchiseMoraleSnapshot(scope, 'player', 'captain-home')).resolves.toMatchObject({ currentValue: 51 });
    await expect(getFranchiseMoraleSnapshot(scope, 'team-fan', 'team-away')).resolves.toMatchObject({ currentValue: 48 });
    await expect(getFranchiseMoraleSnapshot(scope, 'player', 'captain-away')).resolves.toMatchObject({ currentValue: 49 });
  });

  test('non-rival game writes no grudge consequence', async () => {
    setFranchisePhase2MoraleEnabledForTests(true);
    await seedTeams();

    await persistDarkRivalGameMoraleForCompletedGame(
      gameState(),
      scope,
      new Map([
        ['team-home', 'team-third'],
        ['team-away', null],
      ]),
    );

    expect(mocks.applyFranchiseMoraleMatrixConsequence).not.toHaveBeenCalled();
    await expect(getFranchiseMoraleSnapshot(scope, 'team-fan', 'team-home')).resolves.toBeNull();
  });

  test('away-team qualification is asymmetric', async () => {
    setFranchisePhase2MoraleEnabledForTests(true);
    await seedTeams();

    await persistDarkRivalGameMoraleForCompletedGame(
      gameState(),
      scope,
      new Map([
        ['team-home', 'team-third'],
        ['team-away', 'team-home'],
      ]),
    );

    expect(mocks.applyFranchiseMoraleMatrixConsequence).toHaveBeenCalledTimes(1);
    const input = callInputs()[0];
    expect(input.teamId).toBe('team-away');
    expect(input.consequence.eventType).toBe('RIVAL_GAME_LOSS');
    await expect(getFranchiseMoraleSnapshot(scope, 'team-fan', 'team-home')).resolves.toBeNull();
    await expect(getFranchiseMoraleSnapshot(scope, 'team-fan', 'team-away')).resolves.toMatchObject({ currentValue: 48 });
  });

  test('null captain writes fan-only and no player morale row', async () => {
    setFranchisePhase2MoraleEnabledForTests(true);
    await seedTeams({ homeCaptain: null });

    await persistDarkRivalGameMoraleForCompletedGame(
      gameState(),
      scope,
      new Map([['team-home', 'team-away']]),
    );

    expect(mocks.applyFranchiseMoraleMatrixConsequence).toHaveBeenCalledTimes(1);
    const input = callInputs()[0];
    expect(input.teamId).toBe('team-home');
    expect(input.consequence.eventType).toBe('RIVAL_GAME_WIN');
    expect(input.consequence.teamFanMoraleDelta).toBeGreaterThan(0);
    expect(input.consequence.totalPlayerMoraleDelta).toBe(0);
    await expect(getFranchiseMoraleSnapshot(scope, 'team-fan', 'team-home')).resolves.toMatchObject({ currentValue: 52 });
    await expect(getFranchiseMoraleSnapshot(scope, 'player', 'captain-home')).resolves.toBeNull();
    await expect(getFranchiseMoraleSnapshot(scope, 'player', input.playerId ?? '')).resolves.toBeNull();
  });

  test('stable rival-grudge sourceEventId dedupes repeated identical invocations', async () => {
    setFranchisePhase2MoraleEnabledForTests(true);
    await seedTeams();
    const completedGame = gameState({ gameId: 'rival-dedupe-game', savedAt: 67890 });
    const preGameRivals = new Map([['team-home', 'team-away']]);

    await persistDarkRivalGameMoraleForCompletedGame(completedGame, scope, preGameRivals);
    await persistDarkRivalGameMoraleForCompletedGame(completedGame, scope, preGameRivals);

    expect(mocks.applyFranchiseMoraleMatrixConsequence).toHaveBeenCalledTimes(2);
    const fanSnapshot = await getFranchiseMoraleSnapshot(scope, 'team-fan', 'team-home');
    const captainSnapshot = await getFranchiseMoraleSnapshot(scope, 'player', 'captain-home');
    expect(fanSnapshot?.currentValue).toBe(52);
    expect(fanSnapshot?.history).toHaveLength(1);
    expect(captainSnapshot?.currentValue).toBe(51);
    expect(captainSnapshot?.history).toHaveLength(1);
    expect(fanSnapshot?.history[0].sourceEventId).toBe(
      [
        'rival-grudge',
        scope.franchiseId,
        scope.seasonId,
        scope.statsScopeId,
        'rival-dedupe-game',
        'team-home',
        'team-away',
        'won',
      ].join(':'),
    );
  });

  test('stadium-records flag off produces no grudge because no pre-game rival snapshot exists', async () => {
    setFranchisePhase2MoraleEnabledForTests(true);
    setFranchisePhase2StadiumRecordsEnabledForTests(false);
    await seedTeams();

    await persistDarkRivalGameMoraleForCompletedGame(
      gameState(),
      scope,
      new Map(),
    );

    expect(mocks.applyFranchiseMoraleMatrixConsequence).not.toHaveBeenCalled();
  });
});
