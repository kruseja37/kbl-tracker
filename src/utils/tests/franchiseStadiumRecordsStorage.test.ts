import 'fake-indexeddb/auto';
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import type { ParkFactors } from '../../types/war';
import type { AtBatEvent, FieldingEvent } from '../eventLog';
import type { CompletedGameRecord } from '../gameStorage';
import {
  buildFranchiseStadiumFoundationReport,
} from '../franchiseStadiumFoundation';
import {
  clearFranchiseStadiumRecordsDatabaseForTests,
  getFranchiseStadiumRecord,
  listFranchiseStadiumRecords,
  resetFranchiseStadiumRecordsDatabaseForTests,
  upsertFranchiseStadiumRecordsFromFoundationReport,
} from '../franchiseStadiumRecordsStorage';

const scope = {
  franchiseId: 'franchise-1',
  seasonId: 'season-1',
  statsScopeId: 'season-1',
  seasonNumber: 1,
};

const seedParkFactors: ParkFactors = {
  stadiumId: 'apple-field',
  stadiumName: 'Apple Field',
  overall: 1,
  runs: 1,
  homeRuns: 1,
  hits: 1,
  doubles: 1,
  triples: 1,
  strikeouts: 1,
  walks: 1,
  leftHandedHR: 1,
  rightHandedHR: 1,
  leftHandedAVG: 1,
  rightHandedAVG: 1,
  gamesIncluded: 0,
  lastUpdated: 'seed',
  confidence: 'LOW',
  source: 'SEED',
};

function completedGame(overrides: Partial<CompletedGameRecord> = {}): CompletedGameRecord {
  return {
    gameId: 'game-1',
    date: 100,
    ...scope,
    competitionType: 'franchise',
    competitionId: 'franchise-1',
    awayTeamId: 'team-away',
    homeTeamId: 'team-home',
    awayTeamName: 'Away Club',
    homeTeamName: 'Home Club',
    stadiumName: 'Apple Field',
    stadiumId: 'apple-field',
    parkFactors: seedParkFactors,
    finalScore: { away: 8, home: 5 },
    innings: 6,
    totalInnings: 6,
    fameEvents: [],
    playerStats: {},
    pitcherGameStats: [],
    ...overrides,
  };
}

function atBat(overrides: Partial<AtBatEvent> = {}): AtBatEvent {
  return {
    eventId: 'at-bat-1',
    gameId: 'game-1',
    eventIndex: 1,
    timestamp: 101,
    batterId: 'batter-1',
    batterName: 'Batter One',
    batterTeamId: 'team-away',
    pitcherId: 'pitcher-1',
    pitcherName: 'Pitcher One',
    pitcherTeamId: 'team-home',
    result: '1B',
    rbiCount: 0,
    runsScored: [],
    inning: 1,
    halfInning: 'TOP',
    outs: 0,
    runners: { first: null, second: null, third: null },
    awayScore: 0,
    homeScore: 0,
    outsAfter: 0,
    runnersAfter: { first: null, second: null, third: null },
    awayScoreAfter: 0,
    homeScoreAfter: 0,
    leverageIndex: 1,
    winProbabilityBefore: 0.5,
    winProbabilityAfter: 0.52,
    wpa: 0.02,
    ballInPlay: {
      trajectory: 'line',
      zone: 0,
      velocity: 'hard',
      fielderIds: ['fielder-1'],
      primaryFielderId: 'fielder-1',
    },
    fameEvents: [],
    isLeadoff: true,
    isClutch: false,
    isWalkOff: false,
    ...scope,
    parkContext: {
      stadiumId: 'apple-field',
      stadiumName: 'Apple Field',
      parkFactors: seedParkFactors,
    },
    teamContext: {
      battingTeam: { teamId: 'team-away', teamName: 'Away Club' },
      fieldingTeam: { teamId: 'team-home', teamName: 'Home Club' },
    },
    batterContext: {
      playerId: 'batter-1',
      playerName: 'Batter One',
      handedness: 'R',
    },
    pitcherContext: {
      playerId: 'pitcher-1',
      playerName: 'Pitcher One',
      handedness: 'L',
    },
    enrichment: {
      fieldLocation: { x: 74, y: 48, zone: 'Z05' },
      exitType: 'line_drive',
    },
    ...overrides,
  } as AtBatEvent;
}

function fieldingEvent(overrides: Partial<FieldingEvent> = {}): FieldingEvent {
  return {
    fieldingEventId: 'fielding-1',
    gameId: 'game-1',
    atBatEventId: 'at-bat-1',
    sequence: 0,
    playerId: 'fielder-1',
    playerName: 'Fielder One',
    position: 'RF',
    teamId: 'team-home',
    playType: 'putout',
    difficulty: 'routine',
    ballInPlay: {
      trajectory: 'fly',
      zone: 5,
      velocity: 'medium',
      fielderIds: ['fielder-1'],
      primaryFielderId: 'fielder-1',
    },
    success: true,
    runsPreventedOrAllowed: 0,
    ...overrides,
  };
}

function foundation(input: {
  completedGames?: CompletedGameRecord[];
  atBatEvents?: AtBatEvent[];
  fieldingEvents?: FieldingEvent[];
  scopeOverrides?: Partial<typeof scope>;
} = {}) {
  return buildFranchiseStadiumFoundationReport({
    ...scope,
    ...input.scopeOverrides,
    completedGames: input.completedGames ?? [completedGame()],
    atBatEvents: input.atBatEvents ?? [atBat()],
    fieldingEvents: input.fieldingEvents ?? [fieldingEvent()],
  });
}

describe('franchise stadium records storage', () => {
  beforeEach(async () => {
    resetFranchiseStadiumRecordsDatabaseForTests();
    await clearFranchiseStadiumRecordsDatabaseForTests();
  });

  afterEach(async () => {
    await clearFranchiseStadiumRecordsDatabaseForTests();
    resetFranchiseStadiumRecordsDatabaseForTests();
  });

  test('scoped completed archive games create team and game stadium records', async () => {
    const report = foundation({
      completedGames: [
        completedGame({ gameId: 'game-1', finalScore: { away: 8, home: 5 } }),
        completedGame({ gameId: 'game-2', finalScore: { away: 4, home: 9 } }),
      ],
      atBatEvents: [],
      fieldingEvents: [],
    });

    const result = await upsertFranchiseStadiumRecordsFromFoundationReport(report, {
      completedGames: [
        completedGame({ gameId: 'game-1', finalScore: { away: 8, home: 5 } }),
        completedGame({ gameId: 'game-2', finalScore: { away: 4, home: 9 } }),
      ],
      timestamp: '2026-01-01T00:00:00.000Z',
    });

    expect(result.persisted).toBe(true);
    expect(result.policies.adaptiveParkFactorPersistenceAllowed).toBe(false);
    expect(result.policies.parkAdjustedWarAllowed).toBe(false);
    expect(result.policies.mode3HandoffAllowed).toBe(false);

    const records = await listFranchiseStadiumRecords(scope);
    expect(records.map((record) => record.recordType)).toEqual([
      'highest-combined-runs-game',
      'highest-team-runs-game',
      'largest-run-differential-game',
    ]);
    expect(await getFranchiseStadiumRecord({
      ...scope,
      stadiumId: 'apple-field',
      recordType: 'highest-team-runs-game',
      recordKey: 'single-game',
    })).toMatchObject({
      value: 9,
      valueLabel: '9 runs',
      leaderTeamIds: ['team-home'],
      sourceGameIds: ['game-2'],
    });
    expect(await getFranchiseStadiumRecord({
      ...scope,
      stadiumId: 'apple-field',
      recordType: 'highest-combined-runs-game',
      recordKey: 'single-game',
    })).toMatchObject({
      value: 13,
      sourceGameIds: ['game-1', 'game-2'],
    });
  });

  test('spray rows create conservative batting pitching and fielding count records', async () => {
    const report = foundation({
      completedGames: [completedGame()],
      atBatEvents: [
        atBat({ eventId: 'at-bat-1', batterId: 'batter-1', batterName: 'Batter One' }),
        atBat({ eventId: 'at-bat-2', batterId: 'batter-1', batterName: 'Batter One', timestamp: 102 }),
      ],
      fieldingEvents: [
        fieldingEvent({ fieldingEventId: 'fielding-1', atBatEventId: 'at-bat-1' }),
        fieldingEvent({ fieldingEventId: 'fielding-2', atBatEventId: 'at-bat-2' }),
      ],
    });

    await upsertFranchiseStadiumRecordsFromFoundationReport(report, {
      completedGames: [completedGame()],
      timestamp: '2026-01-01T00:00:00.000Z',
    });

    expect(await getFranchiseStadiumRecord({
      ...scope,
      stadiumId: 'apple-field',
      recordType: 'most-batting-spray-events-player',
      recordKey: 'leader',
    })).toMatchObject({
      value: 2,
      leaderPlayerIds: ['batter-1'],
      evidenceIds: ['at-bat-1', 'at-bat-2'],
    });
    expect(await getFranchiseStadiumRecord({
      ...scope,
      stadiumId: 'apple-field',
      recordType: 'most-pitching-spray-events-pitcher',
      recordKey: 'leader',
    })).toMatchObject({
      value: 2,
      leaderPlayerIds: ['pitcher-1'],
    });
    expect(await getFranchiseStadiumRecord({
      ...scope,
      stadiumId: 'apple-field',
      recordType: 'most-fielding-spray-events-fielder',
      recordKey: 'leader',
    })).toMatchObject({
      value: 2,
      leaderPlayerIds: ['fielder-1'],
      evidenceIds: ['fielding-1', 'fielding-2'],
    });
  });

  test('upsert reports a set change when a new sole player holder is stored', async () => {
    const report = foundation({
      completedGames: [completedGame()],
      atBatEvents: [
        atBat({ eventId: 'at-bat-1', batterId: 'batter-1', batterName: 'Batter One' }),
        atBat({ eventId: 'at-bat-2', batterId: 'batter-1', batterName: 'Batter One', timestamp: 102 }),
      ],
      fieldingEvents: [],
    });

    const result = await upsertFranchiseStadiumRecordsFromFoundationReport(report, {
      completedGames: [completedGame()],
      timestamp: '2026-01-01T00:00:00.000Z',
    });

    expect(result.changes).toEqual(expect.arrayContaining([
      {
        stadiumId: 'apple-field',
        recordType: 'most-batting-spray-events-player',
        recordKey: 'leader',
        changeKind: 'set',
        priorValue: null,
        priorLeaderPlayerIds: [],
        newValue: 2,
        newLeaderPlayerIds: ['batter-1'],
      },
    ]));
  });

  test('upsert reports an overtake change when a different sole player holder takes a record', async () => {
    const firstReport = foundation({
      completedGames: [completedGame()],
      atBatEvents: [
        atBat({ eventId: 'at-bat-1', batterId: 'batter-a', batterName: 'Batter A' }),
      ],
      fieldingEvents: [],
    });
    const secondReport = foundation({
      completedGames: [completedGame()],
      atBatEvents: [
        atBat({ eventId: 'at-bat-2', batterId: 'batter-b', batterName: 'Batter B' }),
        atBat({ eventId: 'at-bat-3', batterId: 'batter-b', batterName: 'Batter B', timestamp: 103 }),
      ],
      fieldingEvents: [],
    });

    await upsertFranchiseStadiumRecordsFromFoundationReport(firstReport, {
      completedGames: [completedGame()],
      timestamp: '2026-01-01T00:00:00.000Z',
    });
    const result = await upsertFranchiseStadiumRecordsFromFoundationReport(secondReport, {
      completedGames: [completedGame()],
      timestamp: '2026-01-02T00:00:00.000Z',
    });

    expect(result.changes.filter((change) => change.recordType === 'most-batting-spray-events-player')).toEqual([
      {
        stadiumId: 'apple-field',
        recordType: 'most-batting-spray-events-player',
        recordKey: 'leader',
        changeKind: 'overtake',
        priorValue: 1,
        priorLeaderPlayerIds: ['batter-a'],
        newValue: 2,
        newLeaderPlayerIds: ['batter-b'],
      },
    ]);
  });

  test('upsert stays silent when the same sole player holder improves a record', async () => {
    const firstReport = foundation({
      completedGames: [completedGame()],
      atBatEvents: [
        atBat({ eventId: 'at-bat-1', batterId: 'batter-1', batterName: 'Batter One' }),
      ],
      fieldingEvents: [],
    });
    const secondReport = foundation({
      completedGames: [completedGame()],
      atBatEvents: [
        atBat({ eventId: 'at-bat-2', batterId: 'batter-1', batterName: 'Batter One' }),
        atBat({ eventId: 'at-bat-3', batterId: 'batter-1', batterName: 'Batter One', timestamp: 103 }),
      ],
      fieldingEvents: [],
    });

    await upsertFranchiseStadiumRecordsFromFoundationReport(firstReport, {
      completedGames: [completedGame()],
      timestamp: '2026-01-01T00:00:00.000Z',
    });
    const result = await upsertFranchiseStadiumRecordsFromFoundationReport(secondReport, {
      completedGames: [completedGame()],
      timestamp: '2026-01-02T00:00:00.000Z',
    });

    expect(result.changes).toEqual([]);
  });

  test('upsert stays silent when a player record has tied co-leaders', async () => {
    const report = foundation({
      completedGames: [completedGame()],
      atBatEvents: [
        atBat({
          eventId: 'at-bat-1',
          batterId: 'batter-1',
          batterName: 'Batter One',
          pitcherId: 'pitcher-1',
          pitcherName: 'Pitcher One',
        }),
        atBat({
          eventId: 'at-bat-2',
          batterId: 'batter-2',
          batterName: 'Batter Two',
          pitcherId: 'pitcher-2',
          pitcherName: 'Pitcher Two',
          timestamp: 102,
        }),
      ],
      fieldingEvents: [],
    });

    const result = await upsertFranchiseStadiumRecordsFromFoundationReport(report, {
      completedGames: [completedGame()],
      timestamp: '2026-01-01T00:00:00.000Z',
    });

    expect(result.changes).toEqual([]);
  });

  test('upsert stays silent for team-only stadium records without player leaders', async () => {
    const report = foundation({
      completedGames: [completedGame()],
      atBatEvents: [],
      fieldingEvents: [],
    });

    const result = await upsertFranchiseStadiumRecordsFromFoundationReport(report, {
      completedGames: [completedGame()],
      timestamp: '2026-01-01T00:00:00.000Z',
    });

    expect(result.records.map((record) => record.leaderPlayerIds)).toEqual([[], [], []]);
    expect(result.changes).toEqual([]);
  });

  test('no-hitter and perfect-game fame events create achievement context records', async () => {
    const game = completedGame({
      fameEvents: [
        {
          id: 'fame-no-hitter',
          gameId: 'game-1',
          eventType: 'NO_HITTER',
          playerId: 'pitcher-1',
          playerName: 'Pitcher One',
          playerTeam: 'team-home',
          fameValue: 3,
          fameType: 'bonus',
          inning: 6,
          halfInning: 'BOTTOM',
          timestamp: 120,
          autoDetected: true,
          description: 'Pitcher One threw a no-hitter.',
        },
        {
          id: 'fame-perfect-game',
          gameId: 'game-1',
          eventType: 'PERFECT_GAME',
          playerId: 'pitcher-2',
          playerName: 'Pitcher Two',
          playerTeam: 'team-away',
          fameValue: 5,
          fameType: 'bonus',
          inning: 6,
          halfInning: 'BOTTOM',
          timestamp: 121,
          autoDetected: true,
          description: 'Pitcher Two was perfect.',
        },
      ],
    });

    await upsertFranchiseStadiumRecordsFromFoundationReport(foundation({
      completedGames: [game],
      atBatEvents: [],
      fieldingEvents: [],
    }), {
      completedGames: [game],
      timestamp: '2026-01-01T00:00:00.000Z',
    });

    expect(await getFranchiseStadiumRecord({
      ...scope,
      stadiumId: 'apple-field',
      recordType: 'no-hitter',
      recordKey: 'fame-no-hitter',
    })).toMatchObject({
      value: 1,
      leaderPlayerIds: ['pitcher-1'],
      sourceGameIds: ['game-1'],
    });
    expect(await getFranchiseStadiumRecord({
      ...scope,
      stadiumId: 'apple-field',
      recordType: 'perfect-game',
      recordKey: 'fame-perfect-game',
    })).toMatchObject({
      value: 1,
      leaderPlayerIds: ['pitcher-2'],
      sourceGameIds: ['game-1'],
    });
  });

  test('mismatched missing and whitespace-only scope blocks storage', async () => {
    const whitespaceScopeResult = await upsertFranchiseStadiumRecordsFromFoundationReport({
      ...foundation(),
      scope: {
        ...foundation().scope,
        franchiseId: '   ',
      },
    });
    const wrongScopeGameResult = await upsertFranchiseStadiumRecordsFromFoundationReport(foundation({
      completedGames: [completedGame({ gameId: 'wrong-scope', franchiseId: 'other-franchise' })],
      atBatEvents: [],
      fieldingEvents: [],
    }), {
      completedGames: [completedGame({ gameId: 'wrong-scope', franchiseId: 'other-franchise' })],
    });

    expect(whitespaceScopeResult.persisted).toBe(false);
    expect(whitespaceScopeResult.blockers.join(' ')).toMatch(/non-empty franchise/i);
    expect(wrongScopeGameResult.persisted).toBe(false);
    expect(wrongScopeGameResult.blockers.join(' ')).toMatch(/scope mismatch/i);
    expect(await listFranchiseStadiumRecords(scope)).toEqual([]);
  });

  test('blank stadium id is blocked instead of deriving a durable record id from name', async () => {
    const game = completedGame({ stadiumId: '   ' });
    const result = await upsertFranchiseStadiumRecordsFromFoundationReport(foundation({
      completedGames: [game],
      atBatEvents: [],
      fieldingEvents: [],
    }), {
      completedGames: [game],
    });

    expect(result.persisted).toBe(false);
    expect(result.blockers.join(' ')).toMatch(/non-empty stadium id/i);
    expect(await listFranchiseStadiumRecords(scope)).toEqual([]);
  });

  test('orphan fielding evidence does not create fielding stadium records', async () => {
    const report = foundation({
      completedGames: [completedGame()],
      atBatEvents: [],
      fieldingEvents: [fieldingEvent({ atBatEventId: 'missing-at-bat' })],
    });

    await upsertFranchiseStadiumRecordsFromFoundationReport(report, {
      completedGames: [completedGame()],
    });

    expect(await getFranchiseStadiumRecord({
      ...scope,
      stadiumId: 'apple-field',
      recordType: 'most-fielding-spray-events-fielder',
      recordKey: 'leader',
    })).toBeNull();
    expect(report.sprayCharts.summary.fieldingRows).toBe(0);
  });

  test('rerunning storage is idempotent for the same stadium record identity', async () => {
    const report = foundation({ atBatEvents: [], fieldingEvents: [] });
    await upsertFranchiseStadiumRecordsFromFoundationReport(report, {
      completedGames: [completedGame()],
      timestamp: '2026-01-01T00:00:00.000Z',
    });
    await upsertFranchiseStadiumRecordsFromFoundationReport(report, {
      completedGames: [completedGame()],
      timestamp: '2026-01-02T00:00:00.000Z',
    });

    const records = await listFranchiseStadiumRecords(scope);
    expect(records).toHaveLength(3);
    expect(records[0].createdAt).toBe('2026-01-01T00:00:00.000Z');
    expect(records[0].updatedAt).toBe('2026-01-02T00:00:00.000Z');
  });

  test('storage utility imports no unsafe stadium or Mode 2 mutation APIs', () => {
    const source = readFileSync('src/utils/franchiseStadiumRecordsStorage.ts', 'utf8');

    expect(source).not.toMatch(/from '\.\/(syncEngine|franchiseMoraleState|franchiseRandomEventLog|franchiseRandomEventLogStorage|franchiseSalary|franchiseDesignations|eventLogStorage)'/);
    expect(source).not.toMatch(/applyFranchiseMoraleEffect|confirmFranchiseRandomEvent|persistFranchiseDesignations|saveFranchise|setParkFactors|saveParkFactors|persistParkFactors/);
  });
});
