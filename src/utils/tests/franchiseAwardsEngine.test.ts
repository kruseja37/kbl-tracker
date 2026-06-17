import 'fake-indexeddb/auto';

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  buildFranchiseValueInputRows: vi.fn(),
  getAllBattingStats: vi.fn(),
  getAllPitchingStats: vi.fn(),
  getCareerStats: vi.fn(),
  syncEngine: {
    isSuppressed: vi.fn(() => true),
    upsert: vi.fn(),
    remove: vi.fn(),
  },
}));

vi.mock('../franchiseValueInputs', () => ({
  buildFranchiseValueInputRows: mocks.buildFranchiseValueInputRows,
}));

vi.mock('../seasonStorage', () => ({
  getAllBattingStats: mocks.getAllBattingStats,
  getAllPitchingStats: mocks.getAllPitchingStats,
}));

vi.mock('../careerStorage', () => ({
  getCareerStats: mocks.getCareerStats,
}));

vi.mock('../syncEngine', () => ({
  syncEngine: mocks.syncEngine,
}));

import { deriveAdaptiveStandardsConfig } from '../franchiseAdaptiveStandards';
import {
  computeAndPersistFranchiseWarAwards,
  computeFranchiseWarAwards,
  type FranchiseWarAwardQualifierFacts,
} from '../franchiseAwardsEngine';
import {
  clearFranchiseAwardsDatabaseForTests,
  getFranchiseAwardRowsByScope,
  resetFranchiseAwardsDatabaseForTests,
} from '../franchiseAwardsStorage';
import {
  persistTrustedValueArtifact,
  type FranchiseTrustedValueArtifact,
} from '../franchiseTrustedValueStorage';
import {
  clearFranchiseTrueValueDatabaseForTests,
  saveFranchiseTrueValueRows,
  type FranchiseTrueValueRow,
} from '../franchiseTrueValueStorage';
import type {
  FranchiseValueInputReport,
  FranchiseValueInputRow,
} from '../franchiseValueInputs';
import type {
  PlayerSeasonBatting,
  PlayerSeasonPitching,
} from '../seasonStorage';

const DB_NAME = 'kbl-tracker';
const computedAt = '2026-06-17T12:00:00.000Z';
const scope = {
  franchiseId: 'franchise-d9b',
  seasonId: 'season-d9b',
  statsScopeId: 'season-d9b',
};

function deleteDatabase(name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => resolve();
  });
}

function valueRow(
  playerId: string,
  overrides: Partial<FranchiseValueInputRow> = {},
): FranchiseValueInputRow {
  const {
    warPreviewValues: _ignoredWarPreviewValues,
    warInputAvailability: _ignoredWarInputAvailability,
    ...rowOverrides
  } = overrides;
  const warPreviewValues = {
    battingWar: 0,
    pitchingWar: null,
    fieldingWar: 0,
    baserunningWar: 0,
    totalWar: 0,
    totalWarSource: 'stat-row' as const,
    trustedForFinalValue: true,
    ...overrides.warPreviewValues,
  };
  const warInputAvailability = {
    battingWar: warPreviewValues.battingWar !== null,
    pitchingWar: warPreviewValues.pitchingWar !== null,
    fieldingWar: warPreviewValues.fieldingWar !== null,
    baserunningWar: warPreviewValues.baserunningWar !== null,
    any: true,
    trustedForFinalValue: true,
    ...overrides.warInputAvailability,
  };

  return {
    contractVersion: 'franchise-mode2-value-inputs-v1-readonly',
    ...scope,
    seasonNumber: 1,
    playerId,
    playerName: playerId,
    valuePosition: 'SS',
    currentTeamId: 'team-a',
    rosterStatus: 'MLB',
    salary: 1,
    contractYears: 1,
    salaryBaselineCalculationVersion: 'salary-v1',
    teamSalaryBaseline: 50,
    salaryBaselineAvailable: true,
    seasonStatsAvailability: {
      batting: true,
      pitching: warPreviewValues.pitchingWar !== null,
      fielding: true,
      any: true,
    },
    warConsumerTrust: {
      teamMvpDesignations: true,
      aceDesignations: warPreviewValues.pitchingWar !== null,
      fanFavoriteAlbatrossDesignations: true,
      awards: true,
      salaryMovement: false,
      trueValue: true,
      morale: false,
      mode3Handoff: false,
      blockers: [],
      limitations: [],
    },
    wpaInputAvailability: {
      playerWpa: false,
      managerWpa: false,
      archiveBacked: false,
      trustedForFinalValue: false,
    },
    seasonContext: {
      seasonId: scope.seasonId,
      statsScopeId: scope.statsScopeId,
      seasonNumber: 1,
      gamesPerTeam: 32,
      inningsPerGame: 6,
      seasonLengthSource: 'stored-franchise-config',
      scheduleRowCount: 0,
      scheduleRowsUsedAsSeasonLength: false,
      seasonMetadataTotalGames: null,
    },
    stadiumId: 'stadium-a',
    parkFactorAvailability: {
      stadiumIdAvailable: true,
      seedParkFactorsAvailable: true,
      customParkFactorsAvailable: false,
      status: 'seed-only',
      parkAdjustedValueInputsAvailable: false,
    },
    limitations: [],
    ...rowOverrides,
    warPreviewValues,
    warInputAvailability,
  };
}

function trueValueRow(
  playerId: string,
  trueValue = 10,
): FranchiseTrueValueRow {
  return {
    ...scope,
    playerId,
    trueValue,
    contractValue: 1,
    valueDelta: trueValue - 1,
    warPercentile: trueValue / 100,
    position: 'SS',
    effectivePosition: 'SS',
    poolPosition: 'SS',
    valuationMode: 'single-position',
    peerPoolSize: 4,
    calculationVersion: 'true-value-v1',
    computedAt,
  };
}

function artifact(playerIds: string[]): FranchiseTrustedValueArtifact {
  return {
    ...scope,
    seasonNumber: 1,
    contractVersion: 'd6-v1',
    peerPoolMinThreshold: 2,
    trustedPlayerIds: [...playerIds].sort(),
    blockedRows: [],
    rosterStateSnapshot: playerIds.map((playerId) => ({
      playerId,
      teamId: 'team-a',
      rosterStatus: 'MLB',
    })),
    frozen: true,
    frozenAt: 1781654400000,
    computedAt: 1781654300000,
  };
}

function report(rows: FranchiseValueInputRow[]): FranchiseValueInputReport {
  return {
    contractVersion: 'franchise-mode2-value-inputs-v1-readonly',
    ...scope,
    seasonNumber: 1,
    generatedAt: 1781654300000,
    seasonContext: {
      seasonId: scope.seasonId,
      statsScopeId: scope.statsScopeId,
      seasonNumber: 1,
      gamesPerTeam: 32,
      inningsPerGame: 6,
      seasonLengthSource: 'stored-franchise-config',
      scheduleRowCount: 0,
      scheduleRowsUsedAsSeasonLength: false,
      seasonMetadataTotalGames: null,
    },
    trustedValueArtifactFrozen: true,
    rows,
    trueValuePolicy: {
      finalTrueValueCalculated: true,
      persistedTrueValueCreated: true,
    },
    designationPolicy: {
      finalDesignationsCalculated: false,
      persistedDesignationRecordsCreated: false,
      inventedDesignationTypes: [],
    },
    limitations: [],
  };
}

function qualifierFacts(
  overrides: Record<string, Partial<FranchiseWarAwardQualifierFacts>> = {},
): FranchiseWarAwardQualifierFacts[] {
  return [
    'mvp',
    'slugger',
    'glove',
    'pitcher',
    'rookie',
    'non-rookie',
    'untrusted',
    'below-pa',
    'below-ip',
    'live-only',
  ].map((playerId) => ({
    playerId,
    plateAppearances: 120,
    inningsPitched: 25,
    ...overrides[playerId],
  }));
}

function standardRows(): FranchiseValueInputRow[] {
  return [
    valueRow('mvp', {
      warPreviewValues: { totalWar: 6, battingWar: 3, fieldingWar: 1, pitchingWar: null, baserunningWar: 2, totalWarSource: 'stat-row', trustedForFinalValue: true },
    }),
    valueRow('slugger', {
      warPreviewValues: { totalWar: 5.7, battingWar: 4.8, fieldingWar: 0.2, pitchingWar: null, baserunningWar: 0.7, totalWarSource: 'stat-row', trustedForFinalValue: true },
    }),
    valueRow('glove', {
      warPreviewValues: { totalWar: 4.2, battingWar: 1.1, fieldingWar: 2.9, pitchingWar: null, baserunningWar: 0.2, totalWarSource: 'stat-row', trustedForFinalValue: true },
    }),
    valueRow('pitcher', {
      warPreviewValues: { totalWar: 4.9, battingWar: null, fieldingWar: null, pitchingWar: 4.6, baserunningWar: null, totalWarSource: 'stat-row', trustedForFinalValue: true },
    }),
    valueRow('rookie', {
      warPreviewValues: { totalWar: 4.4, battingWar: 2.5, fieldingWar: 1.4, pitchingWar: null, baserunningWar: 0.5, totalWarSource: 'stat-row', trustedForFinalValue: true },
    }),
    valueRow('non-rookie', {
      warPreviewValues: { totalWar: 5.8, battingWar: 3.4, fieldingWar: 1.8, pitchingWar: null, baserunningWar: 0.6, totalWarSource: 'stat-row', trustedForFinalValue: true },
    }),
  ];
}

function compute(rows = standardRows(), trustedIds = rows.map((row) => row.playerId)) {
  return computeFranchiseWarAwards({
    ...scope,
    valueRows: rows,
    trueValueRows: trustedIds.map((playerId, index) => trueValueRow(playerId, 100 - index)),
    trustedValueArtifact: artifact(trustedIds),
    adaptiveStandardsConfig: deriveAdaptiveStandardsConfig({
      gamesPerTeam: 32,
      inningsPerGame: 6,
    }),
    qualifierFacts: qualifierFacts(),
    rookiePlayerIds: new Set(['rookie']),
    trustedForAwards: true,
    computedAt,
  });
}

function battingStats(playerId: string, pa = 120): PlayerSeasonBatting {
  return {
    seasonId: scope.statsScopeId,
    playerId,
    playerName: playerId,
    teamId: 'team-a',
    games: 32,
    pa,
    ab: pa,
    hits: 0,
    singles: 0,
    doubles: 0,
    triples: 0,
    homeRuns: 0,
    rbi: 0,
    runs: 0,
    walks: 0,
    strikeouts: 0,
    hitByPitch: 0,
    sacFlies: 0,
    sacBunts: 0,
    stolenBases: 0,
    caughtStealing: 0,
    gidp: 0,
    fameBonuses: 0,
    fameBoners: 0,
    fameNet: 0,
    lastUpdated: 1781654300000,
  };
}

function pitchingStats(playerId: string, innings = 25): PlayerSeasonPitching {
  return {
    seasonId: scope.statsScopeId,
    playerId,
    playerName: playerId,
    teamId: 'team-a',
    games: 10,
    gamesStarted: 10,
    outsRecorded: innings * 3,
    hitsAllowed: 0,
    runsAllowed: 0,
    earnedRuns: 0,
    walksAllowed: 0,
    strikeouts: 0,
    homeRunsAllowed: 0,
    hitBatters: 0,
    wildPitches: 0,
    wins: 0,
    losses: 0,
    saves: 0,
    holds: 0,
    blownSaves: 0,
    qualityStarts: 0,
    completeGames: 0,
    shutouts: 0,
    noHitters: 0,
    perfectGames: 0,
    pwar: 0,
    fameBonuses: 0,
    fameBoners: 0,
    fameNet: 0,
    lastUpdated: 1781654300000,
  };
}

describe('franchise WAR awards engine', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    resetFranchiseAwardsDatabaseForTests();
    await deleteDatabase(DB_NAME);
  });

  afterEach(async () => {
    await clearFranchiseAwardsDatabaseForTests();
    await clearFranchiseTrueValueDatabaseForTests();
    resetFranchiseAwardsDatabaseForTests();
    await deleteDatabase(DB_NAME);
  });

  test('computes deterministic winners and ignores rows outside the frozen trusted spine', () => {
    const first = compute();
    const second = compute();
    const mutatedLiveRows = [
      ...standardRows().map((row) =>
        row.playerId === 'slugger'
          ? { ...row, playerName: 'mutated live label', salary: 999 }
          : row,
      ),
      valueRow('live-only', {
        warPreviewValues: { totalWar: 99, battingWar: 99, fieldingWar: 99, pitchingWar: 99, baserunningWar: 0, totalWarSource: 'stat-row', trustedForFinalValue: false },
      }),
    ];
    const mutated = compute(mutatedLiveRows, standardRows().map((row) => row.playerId));

    expect(second).toEqual(first);
    expect(mutated).toEqual(first);
    expect(first.map((row) => [row.category, row.winnerPlayerId])).toEqual([
      ['MVP', 'mvp'],
      ['CY_YOUNG', 'pitcher'],
      ['ROOKIE_OF_YEAR', 'rookie'],
      ['GOLD_GLOVE', 'glove'],
      ['SILVER_SLUGGER', 'slugger'],
    ]);
    expect(first.find((row) => row.category === 'MVP')?.candidates.map((candidate) => candidate.marginToWinner))
      .toEqual([0, -0.2, -0.3, -1.1, -1.6, -1.8]);
  });

  test('excludes untrusted score-only FARM and sub-peer rows through trusted artifact membership', () => {
    const rows = [
      ...standardRows(),
      valueRow('untrusted', {
        rosterStatus: 'FARM',
        limitations: ['score-only boundary row', 'Position SS peer pool size 1 (< 2 required)'],
        warPreviewValues: { totalWar: 99, battingWar: 99, fieldingWar: 99, pitchingWar: null, baserunningWar: 0, totalWarSource: 'stat-row', trustedForFinalValue: false },
      }),
    ];
    const awards = compute(rows, standardRows().map((row) => row.playerId));

    expect(awards.flatMap((row) => row.candidates.map((candidate) => candidate.playerId)))
      .not.toContain('untrusted');
  });

  test('applies adaptive PA and IP qualifiers without fixed full-season thresholds', () => {
    const rows = [
      valueRow('below-pa', {
        warPreviewValues: { totalWar: 8, battingWar: 8, fieldingWar: 1, pitchingWar: null, baserunningWar: 0, totalWarSource: 'stat-row', trustedForFinalValue: true },
      }),
      valueRow('below-ip', {
        warPreviewValues: { totalWar: 7, battingWar: null, fieldingWar: null, pitchingWar: 7, baserunningWar: null, totalWarSource: 'stat-row', trustedForFinalValue: true },
      }),
      ...standardRows(),
    ];

    const awards = computeFranchiseWarAwards({
      ...scope,
      valueRows: rows,
      trueValueRows: rows.map((row) => trueValueRow(row.playerId)),
      trustedValueArtifact: artifact(rows.map((row) => row.playerId)),
      adaptiveStandardsConfig: deriveAdaptiveStandardsConfig({
        gamesPerTeam: 32,
        inningsPerGame: 6,
      }),
      qualifierFacts: qualifierFacts({
        'below-pa': { plateAppearances: 98 },
        'below-ip': { plateAppearances: null, inningsPitched: 20 },
      }),
      rookiePlayerIds: new Set(['rookie']),
      trustedForAwards: true,
      computedAt,
    });

    expect(awards.find((row) => row.category === 'MVP')?.winnerPlayerId).toBe('mvp');
    expect(awards.find((row) => row.category === 'CY_YOUNG')?.winnerPlayerId).toBe('pitcher');

    const shortSeasonQualified = computeFranchiseWarAwards({
      ...scope,
      valueRows: rows,
      trueValueRows: rows.map((row) => trueValueRow(row.playerId)),
      trustedValueArtifact: artifact(rows.map((row) => row.playerId)),
      adaptiveStandardsConfig: deriveAdaptiveStandardsConfig({
        gamesPerTeam: 16,
        inningsPerGame: 6,
      }),
      qualifierFacts: qualifierFacts({
        'below-pa': { plateAppearances: 98 },
        'below-ip': { plateAppearances: null, inningsPitched: 20 },
      }),
      rookiePlayerIds: new Set(['rookie']),
      trustedForAwards: true,
      computedAt,
    });

    expect(shortSeasonQualified.find((row) => row.category === 'MVP')?.winnerPlayerId).toBe('below-pa');
    expect(shortSeasonQualified.find((row) => row.category === 'CY_YOUNG')?.winnerPlayerId).toBe('below-ip');
  });

  test('returns no winners when the D8 trustedForAwards gate is off', () => {
    expect(computeFranchiseWarAwards({
      ...scope,
      valueRows: standardRows(),
      trueValueRows: standardRows().map((row) => trueValueRow(row.playerId)),
      trustedValueArtifact: artifact(standardRows().map((row) => row.playerId)),
      adaptiveStandardsConfig: deriveAdaptiveStandardsConfig({
        gamesPerTeam: 32,
        inningsPerGame: 6,
      }),
      qualifierFacts: qualifierFacts(),
      rookiePlayerIds: new Set(['rookie']),
      trustedForAwards: false,
      computedAt,
    })).toEqual([]);
  });

  test('uses rookiePlayerIds for Rookie of the Year and carries the Gold Glove split seam', () => {
    const awards = compute();
    const roy = awards.find((row) => row.category === 'ROOKIE_OF_YEAR');
    const goldGlove = awards.find((row) => row.category === 'GOLD_GLOVE');

    expect(roy?.winnerPlayerId).toBe('rookie');
    expect(roy?.candidates.map((candidate) => candidate.playerId)).toEqual(['rookie']);
    expect(goldGlove).toMatchObject({
      winnerPlayerId: 'glove',
      goldGloveSplit: {
        fWar: 2.9,
        totalWar: 4.2,
      },
      voteWeight: null,
      finalized: false,
    });
    expect(awards.map((row) => row.category)).toEqual([
      'MVP',
      'CY_YOUNG',
      'ROOKIE_OF_YEAR',
      'GOLD_GLOVE',
      'SILVER_SLUGGER',
    ]);
    expect(awards.map((row) => row.category)).not.toEqual(expect.arrayContaining([
      'MANAGER_OF_YEAR',
      'KARA_KAWAGUCHI',
      'COMEBACK_PLAYER',
      'BUST_OF_YEAR',
    ]));
  });

  test('computeAndPersistFranchiseWarAwards writes finalized rows through the D9a awards store', async () => {
    const rows = standardRows();
    mocks.buildFranchiseValueInputRows.mockResolvedValue(report(rows));
    mocks.getAllBattingStats.mockResolvedValue(rows.map((row) => battingStats(row.playerId)));
    mocks.getAllPitchingStats.mockResolvedValue([pitchingStats('pitcher')]);
    mocks.getCareerStats.mockImplementation(async (playerId: string) => ({
      batting: playerId === 'rookie' ? { seasonsPlayed: 0 } : { seasonsPlayed: 1 },
      pitching: null,
      fielding: null,
    }));
    await persistTrustedValueArtifact(artifact(rows.map((row) => row.playerId)));
    await saveFranchiseTrueValueRows(rows.map((row, index) => trueValueRow(row.playerId, 100 - index)));

    const persisted = await computeAndPersistFranchiseWarAwards({
      ...scope,
      seasonNumber: 1,
      computedAt,
    });
    const stored = await getFranchiseAwardRowsByScope(scope);

    expect([...persisted].sort((left, right) => left.category.localeCompare(right.category))).toEqual(stored);
    expect(stored).toHaveLength(5);
    expect(stored.every((row) => row.finalized)).toBe(true);
    expect(stored.find((row) => row.category === 'MVP')?.winnerPlayerId).toBe('mvp');
    expect(stored.find((row) => row.category === 'GOLD_GLOVE')?.goldGloveSplit).toEqual({
      fWar: 2.9,
      totalWar: 4.2,
    });
    expect(mocks.buildFranchiseValueInputRows).toHaveBeenCalledWith({
      ...scope,
      seasonNumber: 1,
    });
  });
});
