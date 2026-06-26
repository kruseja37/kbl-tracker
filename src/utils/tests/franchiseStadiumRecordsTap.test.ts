import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

import {
  persistDarkStadiumRecordsForCompletedGame,
  stadiumRecordsTapSeam,
} from '../franchiseStadiumRecordsTap';
import { setFranchisePhase2StadiumRecordsEnabledForTests } from '../franchisePhase2Flags';
import type { PersistedGameState, CompletedGameRecord } from '../gameStorage';
import type { PersistedTrueValueScope } from '../processCompletedGame';
import type { FranchiseStadiumFoundationReport } from '../franchiseStadiumFoundation';
import type {
  FranchiseStadiumRecord,
  FranchiseStadiumRecordChange,
  UpsertFranchiseStadiumRecordsResult,
} from '../franchiseStadiumRecordsStorage';
import type { StoredFranchiseConfig } from '../../types/franchise';

const scope: PersistedTrueValueScope = {
  franchiseId: 'franchise-stadium-tap',
  seasonId: 'season-stadium-tap',
  statsScopeId: 'scope-stadium-tap',
  seasonNumber: 1,
};

const gameState = {
  id: 'current',
  gameId: 'game-stadium-tap',
  savedAt: 1720000000000,
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
  seasonNumber: 1,
  playerStats: {},
  pitcherGameStats: [],
} as unknown as PersistedGameState;

const completedGame = {
  gameId: 'completed-game-1',
  date: 100,
  ...scope,
  competitionType: 'franchise',
  competitionId: scope.franchiseId,
  awayTeamId: 'team-away',
  homeTeamId: 'team-home',
  awayTeamName: 'Away',
  homeTeamName: 'Home',
  stadiumName: 'Apple Field',
  stadiumId: 'apple-field',
  finalScore: { away: 7, home: 4 },
  innings: 6,
  totalInnings: 6,
  fameEvents: [],
  playerStats: {},
  pitcherGameStats: [],
  aggregationStatus: 'aggregated',
} as unknown as CompletedGameRecord;

const stadiumSnapshot = {
  teamId: 'team-home',
  teamName: 'Home',
  stadiumId: 'apple-field',
  stadiumName: 'Apple Field',
} as StoredFranchiseConfig['stadiums'][number];

const report = {
  scope,
  sprayCharts: { rows: [] },
} as unknown as FranchiseStadiumFoundationReport;

const record = {
  id: 'record-1',
  stadiumId: 'apple-field',
  recordType: 'highest-team-runs-game',
  recordKey: 'overall',
  leaderPlayerIds: ['player-1'],
} as unknown as FranchiseStadiumRecord;

const change = {
  stadiumId: 'apple-field',
  recordType: 'highest-team-runs-game',
  recordKey: 'overall',
  changeKind: 'set',
  priorValue: null,
  priorLeaderPlayerIds: [],
  newValue: 7,
  newLeaderPlayerIds: ['player-1'],
} satisfies FranchiseStadiumRecordChange;

function upsertResult(
  overrides: Partial<UpsertFranchiseStadiumRecordsResult> = {},
): UpsertFranchiseStadiumRecordsResult {
  return {
    records: [],
    changes: [],
    policies: {
      adaptiveParkFactorPersistenceAllowed: false,
      parkAdjustedWarAllowed: false,
      moraleMutationAllowed: false,
      randomEventPromptAllowed: false,
      designationMutationAllowed: false,
      salaryMovementAllowed: false,
      relationshipMutationAllowed: false,
      mode3HandoffAllowed: false,
    },
    blockers: [],
    persisted: false,
    persistsAdaptiveParkFactors: false,
    allowsParkAdjustedWar: false,
    mutatesMorale: false,
    createsRandomEventPrompts: false,
    mutatesDesignations: false,
    movesSalary: false,
    mutatesRelationships: false,
    mode3HandoffAllowed: false,
    ...overrides,
  };
}

describe('persistDarkStadiumRecordsForCompletedGame', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    setFranchisePhase2StadiumRecordsEnabledForTests(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    setFranchisePhase2StadiumRecordsEnabledForTests(null);
  });

  test('flag off returns dark-noop before any seam loads', async () => {
    const getRecentGames = vi.spyOn(stadiumRecordsTapSeam, 'getRecentGames');
    const getFranchiseConfig = vi.spyOn(stadiumRecordsTapSeam, 'getFranchiseConfig');
    const buildReport = vi.spyOn(stadiumRecordsTapSeam, 'buildFranchiseStadiumFoundationReport');
    const upsert = vi.spyOn(stadiumRecordsTapSeam, 'upsertFranchiseStadiumRecordsFromFoundationReport');

    const result = await persistDarkStadiumRecordsForCompletedGame(gameState, scope);

    expect(result).toEqual({
      status: 'dark-noop',
      written: 0,
      changes: 0,
      changeList: [],
      reason: 'Phase-2 stadium-records disabled.',
    });
    expect(getRecentGames).not.toHaveBeenCalled();
    expect(getFranchiseConfig).not.toHaveBeenCalled();
    expect(buildReport).not.toHaveBeenCalled();
    expect(upsert).not.toHaveBeenCalled();
  });

  test('flag on builds the foundation report and returns written counts', async () => {
    setFranchisePhase2StadiumRecordsEnabledForTests(true);
    const getRecentGames = vi.spyOn(stadiumRecordsTapSeam, 'getRecentGames')
      .mockResolvedValue([completedGame]);
    const getFranchiseConfig = vi.spyOn(stadiumRecordsTapSeam, 'getFranchiseConfig')
      .mockResolvedValue({ stadiums: [stadiumSnapshot] } as StoredFranchiseConfig);
    const buildReport = vi.spyOn(stadiumRecordsTapSeam, 'buildFranchiseStadiumFoundationReport')
      .mockReturnValue(report);
    const upsert = vi.spyOn(stadiumRecordsTapSeam, 'upsertFranchiseStadiumRecordsFromFoundationReport')
      .mockResolvedValue(upsertResult({
        records: [record],
        changes: [change],
        persisted: true,
      }));

    const result = await persistDarkStadiumRecordsForCompletedGame(gameState, scope);

    expect(result).toEqual({
      status: 'written',
      written: 1,
      changes: 1,
      changeList: [change],
      reason: undefined,
    });
    expect(getRecentGames).toHaveBeenCalledWith(1000, {
      franchiseId: scope.franchiseId,
      seasonId: scope.seasonId,
    });
    expect(getFranchiseConfig).toHaveBeenCalledWith(scope.franchiseId);
    expect(buildReport).toHaveBeenCalledWith({
      franchiseId: scope.franchiseId,
      seasonId: scope.seasonId,
      statsScopeId: scope.statsScopeId,
      seasonNumber: scope.seasonNumber,
      stadiumSnapshots: [stadiumSnapshot],
      completedGames: [completedGame],
    });
    expect(upsert).toHaveBeenCalledWith(report, { completedGames: [completedGame] });
  });

  test('flag on returns dark-noop when the upsert persists no records', async () => {
    setFranchisePhase2StadiumRecordsEnabledForTests(true);
    vi.spyOn(stadiumRecordsTapSeam, 'getRecentGames').mockResolvedValue([completedGame]);
    vi.spyOn(stadiumRecordsTapSeam, 'getFranchiseConfig')
      .mockResolvedValue({ stadiums: [stadiumSnapshot] } as StoredFranchiseConfig);
    vi.spyOn(stadiumRecordsTapSeam, 'buildFranchiseStadiumFoundationReport').mockReturnValue(report);
    vi.spyOn(stadiumRecordsTapSeam, 'upsertFranchiseStadiumRecordsFromFoundationReport')
      .mockResolvedValue(upsertResult({
        records: [],
        changes: [],
        persisted: false,
        blockers: [],
      }));

    const result = await persistDarkStadiumRecordsForCompletedGame(gameState, scope);

    expect(result).toEqual({
      status: 'dark-noop',
      written: 0,
      changes: 0,
      changeList: [],
      reason: 'No stadium records to persist.',
    });
  });
});
