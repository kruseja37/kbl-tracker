import 'fake-indexeddb/auto';

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import type { AtBatEvent } from '../eventLog';
import type { CompletedGameRecord, PersistedGameState } from '../gameStorage';
import { setFranchisePhase2StadiumRecordsEnabledForTests } from '../franchisePhase2Flags';
import {
  getHomeParkRival,
  resetHomeParkRivalDatabaseForTests,
} from '../franchiseHomeParkRivalStorage';
import {
  homeParkRivalTapSeam,
  persistDarkHomeParkRivalForCompletedGame,
} from '../franchiseHomeParkRivalTap';
import { buildFranchiseStadiumFoundationReport } from '../franchiseStadiumFoundation';
import {
  resetFranchiseStadiumRecordsDatabaseForTests,
  upsertFranchiseStadiumRecordsFromFoundationReport,
} from '../franchiseStadiumRecordsStorage';
import type { PersistedTrueValueScope } from '../processCompletedGame';
import * as trackerDb from '../trackerDb';

const TRACKER_DB_NAME = 'kbl-tracker';
const RIVAL_DB_NAME = 'kbl-franchise-home-park-rivals';
const STADIUM_RECORDS_DB_NAME = 'kbl-franchise-stadium-records';

const scope: PersistedTrueValueScope = {
  franchiseId: 'fr-home-rival',
  seasonId: 'fr-home-rival-season-1',
  statsScopeId: 'fr-home-rival-season-1',
  seasonNumber: 1,
};

const HOME = 'team-home';
const V1 = 'team-v1';
const V2 = 'team-v2';
const PARK = 'home-park';

function deleteDatabase(name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error(`Delete blocked for ${name}`));
  });
}

function gameState(gameId = 'game-state'): PersistedGameState {
  return {
    id: gameId,
    gameId,
    savedAt: 1_776_000_000_000,
    inning: 9,
    halfInning: 'BOTTOM',
    outs: 3,
    homeScore: 4,
    awayScore: 5,
    bases: { first: null, second: null, third: null },
    currentBatterIndex: 0,
    atBatCount: 36,
    awayTeamId: V1,
    homeTeamId: HOME,
    awayTeamName: 'Visitor One',
    homeTeamName: 'Home Club',
    seasonNumber: 1,
    playerStats: {},
    pitcherGameStats: [],
  } as unknown as PersistedGameState;
}

function atBat(overrides: Partial<AtBatEvent> = {}): AtBatEvent {
  const batterTeamId = overrides.batterTeamId ?? V2;
  const batterId = overrides.batterId ?? `${batterTeamId}-batter`;
  return {
    eventId: `${overrides.gameId ?? 'game'}-at-bat`,
    gameId: overrides.gameId ?? 'game',
    eventIndex: 1,
    timestamp: 1_000,
    batterId,
    batterName: `${batterId} Name`,
    batterTeamId,
    pitcherId: 'home-pitcher',
    pitcherName: 'Home Pitcher',
    pitcherTeamId: HOME,
    result: 'HR',
    rbiCount: 1,
    runsScored: [batterId],
    inning: 1,
    halfInning: 'TOP',
    outs: 0,
    runners: { first: null, second: null, third: null },
    awayScore: 0,
    homeScore: 0,
    outsAfter: 0,
    runnersAfter: { first: null, second: null, third: null },
    awayScoreAfter: 1,
    homeScoreAfter: 0,
    leverageIndex: 1,
    winProbabilityBefore: 0.5,
    winProbabilityAfter: 0.58,
    wpa: 0.08,
    ballInPlay: {
      trajectory: 'fly',
      zone: 5,
      velocity: 'hard',
      fielderIds: [],
    },
    fameEvents: [],
    isLeadoff: true,
    isClutch: false,
    isWalkOff: false,
    ...scope,
    parkContext: {
      stadiumId: PARK,
      stadiumName: 'Home Park',
      parkFactors: undefined,
    },
    teamContext: {
      battingTeam: { teamId: batterTeamId, teamName: batterTeamId },
      fieldingTeam: { teamId: HOME, teamName: 'Home Club' },
    },
    batterContext: {
      playerId: batterId,
      playerName: `${batterId} Name`,
      handedness: 'R',
    },
    pitcherContext: {
      playerId: 'home-pitcher',
      playerName: 'Home Pitcher',
      handedness: 'L',
    },
    enrichment: {
      hrDistance: 430,
      exitType: 'fly_ball',
    },
    ...overrides,
  } as AtBatEvent;
}

function completedGame(overrides: Partial<CompletedGameRecord> = {}): CompletedGameRecord {
  const gameId = overrides.gameId ?? 'game-1';
  return {
    gameId,
    date: 10_000,
    ...scope,
    competitionType: 'franchise',
    competitionId: scope.franchiseId,
    aggregationStatus: 'aggregated',
    awayTeamId: V1,
    homeTeamId: HOME,
    awayTeamName: 'Visitor One',
    homeTeamName: 'Home Club',
    stadiumId: PARK,
    stadiumName: 'Home Park',
    finalScore: { away: 5, home: 4 },
    innings: 9,
    totalInnings: 9,
    fameEvents: [],
    playerStats: {},
    pitcherGameStats: [],
    atBatEvents: [],
    ...overrides,
  } as unknown as CompletedGameRecord;
}

async function seedCompletedGame(record: CompletedGameRecord): Promise<void> {
  const db = await trackerDb.openTrackerDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction('completedGames', 'readwrite');
    tx.objectStore('completedGames').put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

async function seedPlayerStadiumRecord(teamId: string): Promise<void> {
  const game = completedGame({
    gameId: `record-${teamId}`,
    awayTeamId: teamId,
    awayTeamName: teamId,
    finalScore: { away: 8, home: 2 },
    atBatEvents: [atBat({ gameId: `record-${teamId}`, batterTeamId: teamId })],
  });
  const report = buildFranchiseStadiumFoundationReport({
    ...scope,
    stadiumSnapshots: [{ teamId: HOME, teamName: 'Home Club', stadiumId: PARK, hasSeedParkFactors: false }],
    completedGames: [game],
    atBatEvents: game.atBatEvents ?? [],
    fieldingEvents: [],
  });
  const result = await upsertFranchiseStadiumRecordsFromFoundationReport(report, {
    completedGames: [game],
    timestamp: '2026-01-01T00:00:00.000Z',
  });
  expect(result.persisted).toBe(true);
}

describe('persistDarkHomeParkRivalForCompletedGame', () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    setFranchisePhase2StadiumRecordsEnabledForTests(null);
    trackerDb.resetTrackerDbForTests();
    resetFranchiseStadiumRecordsDatabaseForTests();
    resetHomeParkRivalDatabaseForTests();
    await deleteDatabase(TRACKER_DB_NAME).catch(() => undefined);
    await deleteDatabase(STADIUM_RECORDS_DB_NAME).catch(() => undefined);
    await deleteDatabase(RIVAL_DB_NAME).catch(() => undefined);
    vi.spyOn(homeParkRivalTapSeam, 'getFranchiseConfig').mockResolvedValue({
      stadiums: [{ teamId: HOME, teamName: 'Home Club', stadiumId: PARK, hasSeedParkFactors: false }],
    } as never);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    setFranchisePhase2StadiumRecordsEnabledForTests(null);
    trackerDb.resetTrackerDbForTests();
    resetFranchiseStadiumRecordsDatabaseForTests();
    resetHomeParkRivalDatabaseForTests();
    await deleteDatabase(TRACKER_DB_NAME).catch(() => undefined);
    await deleteDatabase(STADIUM_RECORDS_DB_NAME).catch(() => undefined);
    await deleteDatabase(RIVAL_DB_NAME).catch(() => undefined);
  });

  test('flag off returns dark-noop without opening the rival database', async () => {
    setFranchisePhase2StadiumRecordsEnabledForTests(false);
    const getConfig = vi.spyOn(homeParkRivalTapSeam, 'getFranchiseConfig');
    const put = vi.spyOn(homeParkRivalTapSeam, 'putHomeParkRival');

    const result = await persistDarkHomeParkRivalForCompletedGame(gameState(), scope);

    expect(result).toEqual({ status: 'dark-noop', rivalTeamId: null });
    expect(getConfig).not.toHaveBeenCalled();
    expect(put).not.toHaveBeenCalled();
    const databases = await indexedDB.databases?.();
    expect(databases?.some((database) => database.name === RIVAL_DB_NAME)).toBe(false);
  });

  test('crowns a clear wins leader with zero player records', async () => {
    setFranchisePhase2StadiumRecordsEnabledForTests(true);
    await seedCompletedGame(completedGame({
      gameId: 'v1-win',
      date: 100,
      awayTeamId: V1,
      finalScore: { away: 5, home: 4 },
    }));
    await seedCompletedGame(completedGame({
      gameId: 'v2-loss',
      date: 200,
      awayTeamId: V2,
      finalScore: { away: 2, home: 4 },
    }));

    const result = await persistDarkHomeParkRivalForCompletedGame(gameState('v1-win'), scope);
    const row = await getHomeParkRival(scope, HOME);

    expect(result).toEqual({ status: 'updated', rivalTeamId: V1 });
    expect(row?.rivalTeamId).toBe(V1);
    expect(row?.rivalWinsAtPark).toBe(1);
    expect(row?.rivalRecordsHeld).toBe(0);
  });

  test('uses player-attributable records as an equal-wins tiebreaker', async () => {
    setFranchisePhase2StadiumRecordsEnabledForTests(true);
    await seedCompletedGame(completedGame({
      gameId: 'v1-win',
      date: 100,
      awayTeamId: V1,
      finalScore: { away: 5, home: 4 },
    }));
    await seedCompletedGame(completedGame({
      gameId: 'v2-win',
      date: 200,
      awayTeamId: V2,
      finalScore: { away: 6, home: 4 },
    }));
    await seedPlayerStadiumRecord(V2);

    await persistDarkHomeParkRivalForCompletedGame(gameState('v2-win'), scope);
    const row = await getHomeParkRival(scope, HOME);

    expect(row?.rivalTeamId).toBe(V2);
    expect(row?.rivalWinsAtPark).toBe(1);
    expect(row?.rivalRecordsHeld).toBeGreaterThan(0);
  });

  test('retains incumbent on a tie, then overtakes when the challenger passes in wins', async () => {
    setFranchisePhase2StadiumRecordsEnabledForTests(true);
    await seedCompletedGame(completedGame({
      gameId: 'v1-win',
      date: 100,
      awayTeamId: V1,
      finalScore: { away: 5, home: 4 },
    }));
    await seedCompletedGame(completedGame({
      gameId: 'v2-loss',
      date: 200,
      awayTeamId: V2,
      finalScore: { away: 2, home: 4 },
    }));

    await persistDarkHomeParkRivalForCompletedGame(gameState('v1-win'), scope);
    expect((await getHomeParkRival(scope, HOME))?.rivalTeamId).toBe(V1);

    await seedCompletedGame(completedGame({
      gameId: 'v2-first-win',
      date: 300,
      awayTeamId: V2,
      finalScore: { away: 7, home: 4 },
    }));
    const tieResult = await persistDarkHomeParkRivalForCompletedGame(gameState('v2-first-win'), scope);
    expect(tieResult).toEqual({ status: 'unchanged', rivalTeamId: V1 });
    expect((await getHomeParkRival(scope, HOME))?.rivalTeamId).toBe(V1);

    await seedCompletedGame(completedGame({
      gameId: 'v2-second-win',
      date: 400,
      awayTeamId: V2,
      finalScore: { away: 8, home: 4 },
    }));
    const overtakeResult = await persistDarkHomeParkRivalForCompletedGame(gameState('v2-second-win'), scope);
    const row = await getHomeParkRival(scope, HOME);

    expect(overtakeResult).toEqual({ status: 'updated', rivalTeamId: V2 });
    expect(row?.rivalTeamId).toBe(V2);
    expect(row?.rivalWinsAtPark).toBe(2);
  });
});
