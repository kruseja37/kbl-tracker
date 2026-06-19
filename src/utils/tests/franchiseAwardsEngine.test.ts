import 'fake-indexeddb/auto';

import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  buildFranchiseValueInputRows: vi.fn(),
  getAllBattingStats: vi.fn(),
  getAllPitchingStats: vi.fn(),
  calculateStandings: vi.fn(),
  getCareerStats: vi.fn(),
  getRecentGames: vi.fn(),
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
  calculateStandings: mocks.calculateStandings,
  getAllBattingStats: mocks.getAllBattingStats,
  getAllPitchingStats: mocks.getAllPitchingStats,
}));

vi.mock('../gameStorage', () => ({
  getRecentGames: mocks.getRecentGames,
}));

vi.mock('../careerStorage', () => ({
  getCareerStats: mocks.getCareerStats,
}));

vi.mock('../syncEngine', () => ({
  syncEngine: mocks.syncEngine,
}));

import { deriveAdaptiveStandardsConfig } from '../franchiseAdaptiveStandards';
import {
  aggregateManagerAwardInputsFromGames,
  computeAndPersistFranchiseWarAwards,
  computeFranchiseAwardsPreview,
  computeFranchiseManagerOfYear,
  computeFranchiseRaceCandidateRows,
  computeFranchiseWarAwards,
  type FranchiseManagerAwardAggregate,
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
  getFranchiseTrueValueRows,
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
  TeamStanding,
} from '../seasonStorage';
import type { CompletedGameRecord } from '../gameStorage';

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

function trueValuePositioning(
  isReserve: boolean,
): NonNullable<FranchiseValueInputRow['trueValuePositioning']> {
  return {
    valuationMode: isReserve ? 'reserve' : 'single-position',
    valuePosition: 'SS',
    effectivePosition: 'SS',
    poolPosition: isReserve ? 'RESERVE' : 'SS',
    profilePosition: 'SS',
    profilePitcherRole: null,
    starts: isReserve ? 1 : 5,
    currentTeamStarts: isReserve ? 1 : 5,
    teamCompletedGames: 8,
    startsShare: isReserve ? 0.125 : 0.625,
    isReserve,
    twoWayTrait: null,
    twoWayBatPosition: null,
    twoWayArmPosition: null,
    startsSource: 'game-header-starting-lineups',
    reasons: [],
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

function artifactWithTeams(
  entries: Array<{ playerId: string; teamId: string }>,
): FranchiseTrustedValueArtifact {
  return {
    ...scope,
    seasonNumber: 1,
    contractVersion: 'd6-v1',
    peerPoolMinThreshold: 2,
    trustedPlayerIds: entries.map((entry) => entry.playerId).sort(),
    blockedRows: [],
    rosterStateSnapshot: entries.map((entry) => ({
      playerId: entry.playerId,
      teamId: entry.teamId,
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

function standing(teamId: string, wins: number, losses = 0): TeamStanding {
  return {
    teamId,
    teamName: teamId,
    wins,
    losses,
    winPct: wins + losses > 0 ? wins / (wins + losses) : 0,
    runsScored: 0,
    runsAllowed: 0,
    runDiff: 0,
    streak: { type: 'W', count: 0 },
    lastTenWins: 0,
    homeRecord: { wins: 0, losses: 0 },
    awayRecord: { wins: 0, losses: 0 },
    gamesBack: 0,
  };
}

function completedGame(managerWpaTotals?: CompletedGameRecord['managerWpaTotals']): CompletedGameRecord {
  return {
    gameId: 'game-test',
    date: 1781654300000,
    homeTeamId: 'team-a',
    awayTeamId: 'team-b',
    homeTeamName: 'Team A',
    awayTeamName: 'Team B',
    finalScore: { home: 1, away: 0 },
    duration: 1,
    totalPlays: 1,
    isComplete: true,
    aggregationStatus: 'complete',
    franchiseId: scope.franchiseId,
    seasonId: scope.seasonId,
    statsScopeId: scope.statsScopeId,
    managerWpaTotals,
  } as CompletedGameRecord;
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

  test('season-aggregates manager WPA totals across games and null-guards missing manager totals', () => {
    const aggregates = aggregateManagerAwardInputsFromGames([
      completedGame([
        {
          managerId: 'mgr-a',
          managerName: 'Manager A',
          teamId: 'team-a',
          tacticalManagerWpa: 0.125,
          deploymentWpa: 0.0625,
          lineupDeltaWpa: -0.03125,
          managerValue: 0.15625,
        },
        {
          managerId: 'mgr-b',
          managerName: 'Manager B',
          teamId: 'team-b',
          tacticalManagerWpa: 0.25,
          deploymentWpa: 0.125,
          lineupDeltaWpa: 0.0625,
          managerValue: 0.4375,
        },
      ]),
      completedGame(undefined),
      completedGame([
        {
          managerId: 'mgr-a',
          managerName: 'Manager A',
          teamId: 'team-a',
          tacticalManagerWpa: 0.375,
          deploymentWpa: -0.03125,
          lineupDeltaWpa: 0.09375,
          managerValue: 0.4375,
        },
      ]),
    ]);

    expect(aggregates).toEqual([
      {
        managerId: 'mgr-a',
        teamId: 'team-a',
        tacticalManagerWpa: 0.5,
        deploymentWpa: 0.03125,
        lineupDeltaWpa: 0.0625,
      },
      {
        managerId: 'mgr-b',
        teamId: 'team-b',
        tacticalManagerWpa: 0.25,
        deploymentWpa: 0.125,
        lineupDeltaWpa: 0.0625,
      },
    ]);
  });

  test('computes Manager of the Year from frozen value-share expected wins and ignores non-frozen live value rows', () => {
    const managerAggregates: FranchiseManagerAwardAggregate[] = [
      {
        managerId: 'mgr-a',
        teamId: 'team-a',
        tacticalManagerWpa: 2,
        deploymentWpa: 1,
        lineupDeltaWpa: 0,
      },
      {
        managerId: 'mgr-b',
        teamId: 'team-b',
        tacticalManagerWpa: 0,
        deploymentWpa: 1,
        lineupDeltaWpa: 1,
      },
    ];
    const frozenArtifact = artifactWithTeams([
      { playerId: 'a-1', teamId: 'team-a' },
      { playerId: 'a-2', teamId: 'team-a' },
      { playerId: 'b-1', teamId: 'team-b' },
    ]);
    const trueValueRows = [
      trueValueRow('a-1', 40),
      trueValueRow('a-2', 30),
      trueValueRow('b-1', 30),
      trueValueRow('live-non-frozen', 999),
    ];

    const award = computeFranchiseManagerOfYear({
      ...scope,
      managerAggregates,
      trueValueRows,
      trustedValueArtifact: frozenArtifact,
      standings: [
        standing('team-a', 12, 8),
        standing('team-b', 8, 12),
      ],
      gamesPerTeam: 20,
      trustedForAwards: true,
      computedAt,
    });
    const perturbed = computeFranchiseManagerOfYear({
      ...scope,
      managerAggregates,
      trueValueRows: trueValueRows.map((row) =>
        row.playerId === 'live-non-frozen'
          ? { ...row, trueValue: 1_000_000 }
          : row,
      ),
      trustedValueArtifact: frozenArtifact,
      standings: [
        standing('team-a', 12, 8),
        standing('team-b', 8, 12),
      ],
      gamesPerTeam: 20,
      trustedForAwards: true,
      computedAt,
    });

    expect(perturbed).toEqual(award);
    expect(award).toMatchObject({
      category: 'MANAGER_OF_YEAR',
      winnerPlayerId: 'mgr-b',
      goldGloveSplit: null,
      managerActualWins: 8,
      managerExpectedWins: 6,
      voteWeight: null,
      finalized: false,
    });
    expect(award?.candidates).toEqual([
      { playerId: 'mgr-b', score: 0.625, marginToWinner: 0 },
      { playerId: 'mgr-a', score: 0.375, marginToWinner: -0.25 },
    ]);
    expect(award).not.toHaveProperty('fameWeight');
  });

  test('Manager of the Year uses midpoint normalization for flat or single-manager pools', () => {
    const award = computeFranchiseManagerOfYear({
      ...scope,
      managerAggregates: [{
        managerId: 'mgr-only',
        teamId: 'team-a',
        tacticalManagerWpa: 0.2,
        deploymentWpa: 0.2,
        lineupDeltaWpa: 0.2,
      }],
      trueValueRows: [trueValueRow('only-player', 50)],
      trustedValueArtifact: artifactWithTeams([{ playerId: 'only-player', teamId: 'team-a' }]),
      standings: [standing('team-a', 9, 1)],
      gamesPerTeam: 20,
      trustedForAwards: true,
      computedAt,
    });

    expect(award?.winnerPlayerId).toBe('mgr-only');
    expect(award?.candidates).toEqual([
      { playerId: 'mgr-only', score: 0.5, marginToWinner: 0 },
    ]);
    expect(award?.managerActualWins).toBe(9);
    expect(award?.managerExpectedWins).toBe(9);
  });

  test('returns no Manager of the Year row when the D8 trustedForAwards gate is off', () => {
    expect(computeFranchiseManagerOfYear({
      ...scope,
      managerAggregates: [{
        managerId: 'mgr-a',
        teamId: 'team-a',
        tacticalManagerWpa: 1,
        deploymentWpa: 1,
        lineupDeltaWpa: 1,
      }],
      trueValueRows: [trueValueRow('player-a', 10)],
      trustedValueArtifact: artifactWithTeams([{ playerId: 'player-a', teamId: 'team-a' }]),
      standings: [standing('team-a', 10)],
      gamesPerTeam: 20,
      trustedForAwards: false,
      computedAt,
    })).toBeNull();
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
    mocks.getRecentGames.mockResolvedValue([
      completedGame([{
        managerId: 'team-a-manager',
        managerName: 'Team A Manager',
        teamId: 'team-a',
        tacticalManagerWpa: 0.25,
        deploymentWpa: 0.125,
        lineupDeltaWpa: 0.0625,
        managerValue: 0.4375,
      }]),
    ]);
    mocks.calculateStandings.mockResolvedValue([
      standing('team-a', 18, 14),
    ]);
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
    expect(stored).toHaveLength(6);
    expect(stored.every((row) => row.finalized)).toBe(true);
    expect(stored.find((row) => row.category === 'MVP')?.winnerPlayerId).toBe('mvp');
    expect(stored.find((row) => row.category === 'GOLD_GLOVE')?.goldGloveSplit).toEqual({
      fWar: 2.9,
      totalWar: 4.2,
    });
    expect(stored.find((row) => row.category === 'MANAGER_OF_YEAR')).toMatchObject({
      winnerPlayerId: 'team-a-manager',
      managerActualWins: 18,
      managerExpectedWins: 18,
      voteWeight: null,
      finalized: true,
    });
    expect(mocks.buildFranchiseValueInputRows).toHaveBeenCalledWith({
      ...scope,
      seasonNumber: 1,
    });
    expect(mocks.getRecentGames).toHaveBeenCalledWith(1000, {
      franchiseId: scope.franchiseId,
      seasonId: scope.seasonId,
      statsScopeId: scope.statsScopeId,
    });
    expect(mocks.calculateStandings).toHaveBeenCalledWith(scope.seasonId);
    expect(stored.map((row) => row.category).sort()).toEqual([
      'CY_YOUNG',
      'GOLD_GLOVE',
      'MANAGER_OF_YEAR',
      'MVP',
      'ROOKIE_OF_YEAR',
      'SILVER_SLUGGER',
    ]);
  });

  test('computeFranchiseAwardsPreview ranks current rows under the looser preview gate without persisting', async () => {
    const rows = standardRows().map((row) => ({
      ...row,
      warConsumerTrust: {
        ...row.warConsumerTrust,
        awards: false,
      },
    }));
    mocks.buildFranchiseValueInputRows.mockResolvedValue({
      ...report(rows),
      trustedValueArtifactFrozen: false,
    });
    mocks.getAllBattingStats.mockResolvedValue(rows.map((row) => battingStats(row.playerId)));
    mocks.getAllPitchingStats.mockResolvedValue([pitchingStats('pitcher')]);
    mocks.getRecentGames.mockResolvedValue([
      completedGame([{
        managerId: 'preview-manager',
        managerName: 'Preview Manager',
        teamId: 'team-a',
        tacticalManagerWpa: 0.25,
        deploymentWpa: 0.125,
        lineupDeltaWpa: 0.0625,
        managerValue: 0.4375,
      }]),
    ]);
    mocks.calculateStandings.mockResolvedValue([
      standing('team-a', 12, 4),
    ]);
    mocks.getCareerStats.mockImplementation(async (playerId: string) => ({
      batting: playerId === 'rookie' ? { seasonsPlayed: 0 } : { seasonsPlayed: 1 },
      pitching: null,
      fielding: null,
    }));
    await persistTrustedValueArtifact({
      ...artifact(rows.map((row) => row.playerId)),
      frozen: false,
      frozenAt: null,
    });
    await saveFranchiseTrueValueRows(rows.map((row, index) => trueValueRow(row.playerId, 100 - index)));
    await expect(getFranchiseTrueValueRows(scope)).resolves.toHaveLength(rows.length);

    expect(computeFranchiseWarAwards({
      ...scope,
      valueRows: rows,
      trueValueRows: rows.map((row) => trueValueRow(row.playerId)),
      trustedValueArtifact: {
        ...artifact(rows.map((row) => row.playerId)),
        frozen: false,
        frozenAt: null,
      },
      adaptiveStandardsConfig: deriveAdaptiveStandardsConfig({
        gamesPerTeam: 32,
        inningsPerGame: 6,
      }),
      qualifierFacts: qualifierFacts(),
      rookiePlayerIds: new Set(['rookie']),
      trustedForAwards: false,
      computedAt,
    })).toEqual([]);

    const preview = await computeFranchiseAwardsPreview({
      ...scope,
      seasonNumber: 1,
      computedAt,
    });
    const stored = await getFranchiseAwardRowsByScope(scope);

    expect(preview).toHaveLength(6);
    expect(preview.every((row) => row.finalized === false)).toBe(true);
    expect(preview.find((row) => row.category === 'MVP')?.winnerPlayerId).toBe('mvp');
    expect(preview.find((row) => row.category === 'MANAGER_OF_YEAR')?.winnerPlayerId).toBe('preview-manager');
    expect(stored).toEqual([]);
  });

  test('computeFranchiseRaceCandidateRows exports requested rows and applies Bench and Booger eligibility', async () => {
    const rows = [
      valueRow('bench-reserve', {
        trueValuePositioning: trueValuePositioning(true),
        warPreviewValues: { totalWar: 2.4, battingWar: 1.8, fieldingWar: 0.2, pitchingWar: null, baserunningWar: 0.4, totalWarSource: 'stat-row', trustedForFinalValue: true },
      }),
      valueRow('bench-starter', {
        trueValuePositioning: trueValuePositioning(false),
        warPreviewValues: { totalWar: 8.5, battingWar: 6, fieldingWar: 0.1, pitchingWar: null, baserunningWar: 2.4, totalWarSource: 'stat-row', trustedForFinalValue: true },
      }),
      valueRow('bench-too-few-pa', {
        trueValuePositioning: trueValuePositioning(true),
        warPreviewValues: { totalWar: 9, battingWar: 7, fieldingWar: -3, pitchingWar: null, baserunningWar: 2, totalWarSource: 'stat-row', trustedForFinalValue: true },
      }),
      valueRow('booger-worst', {
        warPreviewValues: { totalWar: 1, battingWar: 3, fieldingWar: -2.4, pitchingWar: null, baserunningWar: 0.4, totalWarSource: 'stat-row', trustedForFinalValue: true },
      }),
      valueRow('booger-next', {
        warPreviewValues: { totalWar: 1.5, battingWar: 2, fieldingWar: -0.6, pitchingWar: null, baserunningWar: 0.1, totalWarSource: 'stat-row', trustedForFinalValue: true },
      }),
      valueRow('booger-best', {
        warPreviewValues: { totalWar: 3.2, battingWar: 1.5, fieldingWar: 1.2, pitchingWar: null, baserunningWar: 0.5, totalWarSource: 'stat-row', trustedForFinalValue: true },
      }),
    ];
    const paByPlayerId: Record<string, number> = {
      'bench-reserve': 98,
      'bench-too-few-pa': 20,
    };
    mocks.buildFranchiseValueInputRows.mockResolvedValue({
      ...report(rows),
      trustedValueArtifactFrozen: false,
    });
    mocks.getAllBattingStats.mockResolvedValue(rows.map((row) =>
      battingStats(row.playerId, paByPlayerId[row.playerId] ?? 120),
    ));
    mocks.getAllPitchingStats.mockResolvedValue([]);
    mocks.getCareerStats.mockResolvedValue({
      batting: { seasonsPlayed: 1 },
      pitching: { seasonsPlayed: 1 },
      fielding: { seasonsPlayed: 1 },
    });
    await persistTrustedValueArtifact({
      ...artifact(rows.map((row) => row.playerId)),
      frozen: false,
      frozenAt: null,
    });
    await saveFranchiseTrueValueRows(rows.map((row, index) => trueValueRow(row.playerId, 100 - index)));

    const candidates = await computeFranchiseRaceCandidateRows({
      ...scope,
      seasonNumber: 1,
      computedAt,
    }, ['MVP', 'BENCH_PLAYER', 'BOOGER_GLOVE']);

    expect(Object.keys(candidates).sort()).toEqual([
      'BENCH_PLAYER',
      'BOOGER_GLOVE',
      'MVP',
    ]);
    expect(candidates.CY_YOUNG).toBeUndefined();
    expect(candidates.MVP?.map((candidate) => candidate.playerId)).not.toContain('bench-reserve');
    expect(candidates.BENCH_PLAYER).toEqual([
      { playerId: 'bench-reserve', score: 2.4, marginToWinner: 0 },
    ]);
    expect(candidates.BENCH_PLAYER?.map((candidate) => candidate.playerId)).not.toEqual(expect.arrayContaining([
      'bench-starter',
      'bench-too-few-pa',
    ]));
    expect(candidates.BOOGER_GLOVE?.slice(0, 2)).toEqual([
      { playerId: 'booger-worst', score: 2.4, marginToWinner: 0 },
      { playerId: 'booger-next', score: 0.6, marginToWinner: -1.8 },
    ]);
    expect(mocks.getRecentGames).not.toHaveBeenCalled();
    expect(mocks.calculateStandings).not.toHaveBeenCalled();
  });
});
