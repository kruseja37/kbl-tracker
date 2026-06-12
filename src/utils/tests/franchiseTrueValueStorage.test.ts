import 'fake-indexeddb/auto';

import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';
import type {
  FranchiseValueInputReport,
  FranchiseValueInputRow,
} from '../franchiseValueInputs';

const mocks = vi.hoisted(() => ({
  buildFranchiseValueInputRows: vi.fn(),
}));

vi.mock('../franchiseValueInputs', () => ({
  buildFranchiseValueInputRows: mocks.buildFranchiseValueInputRows,
}));

import {
  calculateAndPersistFranchiseTrueValueForSeason,
  clearFranchiseTrueValueDatabaseForTests,
  getFranchiseTrueValueRow,
  getFranchiseTrueValueRows,
  initFranchiseTrueValueDatabase,
  resetFranchiseTrueValueDatabaseForTests,
} from '../franchiseTrueValueStorage';

function row(overrides: Partial<FranchiseValueInputRow> = {}): FranchiseValueInputRow {
  return {
    contractVersion: 'franchise-mode2-value-inputs-v1-readonly',
    franchiseId: 'franchise-1',
    seasonId: 'season-1',
    statsScopeId: 'season-1',
    seasonNumber: 1,
    playerId: 'player-1',
    playerName: 'True Value Player',
    valuePosition: 'SS',
    currentTeamId: 'team-1',
    rosterStatus: 'MLB',
    salary: 1000,
    contractYears: 1,
    salaryBaselineCalculationVersion: 'salary-baseline-v1',
    teamSalaryBaseline: 1000,
    salaryBaselineAvailable: true,
    seasonStatsAvailability: { batting: true, pitching: false, fielding: true, any: true },
    warInputAvailability: {
      battingWar: true,
      pitchingWar: false,
      fieldingWar: true,
      baserunningWar: true,
      any: true,
      trustedForFinalValue: false,
    },
    warPreviewValues: {
      battingWar: 0.8,
      pitchingWar: null,
      fieldingWar: 0.1,
      baserunningWar: 0.1,
      totalWar: 1,
      totalWarSource: 'stat-row',
      trustedForFinalValue: false,
    },
    wpaInputAvailability: {
      playerWpa: false,
      managerWpa: false,
      archiveBacked: false,
      trustedForFinalValue: false,
    },
    seasonContext: {
      seasonId: 'season-1',
      statsScopeId: 'season-1',
      seasonNumber: 1,
      gamesPerTeam: 24,
      inningsPerGame: 6,
      seasonLengthSource: 'stored-franchise-config',
      scheduleRowCount: 0,
      scheduleRowsUsedAsSeasonLength: false,
      seasonMetadataTotalGames: 0,
    },
    stadiumId: 'stadium-1',
    parkFactorAvailability: {
      stadiumIdAvailable: true,
      seedParkFactorsAvailable: true,
      customParkFactorsAvailable: false,
      status: 'seed-only',
      parkAdjustedValueInputsAvailable: false,
    },
    limitations: [],
    ...overrides,
  };
}

function report(rows: FranchiseValueInputRow[]): FranchiseValueInputReport {
  return {
    contractVersion: 'franchise-mode2-value-inputs-v1-readonly',
    franchiseId: 'franchise-1',
    seasonId: 'season-1',
    statsScopeId: 'season-1',
    seasonNumber: 1,
    generatedAt: 1,
    seasonContext: {
      seasonId: 'season-1',
      statsScopeId: 'season-1',
      seasonNumber: 1,
      gamesPerTeam: 24,
      inningsPerGame: 6,
      seasonLengthSource: 'stored-franchise-config',
      scheduleRowCount: 0,
      scheduleRowsUsedAsSeasonLength: false,
      seasonMetadataTotalGames: 0,
    },
    rows,
    trueValuePolicy: {
      finalTrueValueCalculated: false,
      persistedTrueValueCreated: false,
    },
    designationPolicy: {
      finalDesignationsCalculated: false,
      persistedDesignationRecordsCreated: false,
      inventedDesignationTypes: [],
    },
    limitations: [],
  };
}

function peerLadder(targetWar: number): FranchiseValueInputRow[] {
  return [
    row({
      playerId: 'target',
      salary: 1000,
      warPreviewValues: {
        battingWar: targetWar,
        pitchingWar: null,
        fieldingWar: 0,
        baserunningWar: 0,
        totalWar: targetWar,
        totalWarSource: 'stat-row',
        trustedForFinalValue: false,
      },
    }),
    row({ playerId: 'peer-0', salary: 2000, warPreviewValues: { ...row().warPreviewValues, totalWar: 0 } }),
    row({ playerId: 'peer-2', salary: 3000, warPreviewValues: { ...row().warPreviewValues, totalWar: 2 } }),
    row({ playerId: 'peer-3', salary: 4000, warPreviewValues: { ...row().warPreviewValues, totalWar: 3 } }),
    row({ playerId: 'peer-4', salary: 5000, warPreviewValues: { ...row().warPreviewValues, totalWar: 4 } }),
    row({ playerId: 'peer-5', salary: 6000, warPreviewValues: { ...row().warPreviewValues, totalWar: 5 } }),
  ];
}

describe('franchise True Value storage', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    resetFranchiseTrueValueDatabaseForTests();
    await clearFranchiseTrueValueDatabaseForTests();
  });

  afterEach(async () => {
    await clearFranchiseTrueValueDatabaseForTests();
    resetFranchiseTrueValueDatabaseForTests();
  });

  test('calculates and stores canonical keyed True Value rows', async () => {
    mocks.buildFranchiseValueInputRows.mockResolvedValue(report(peerLadder(1)));

    const result = await calculateAndPersistFranchiseTrueValueForSeason({
      franchiseId: 'franchise-1',
      seasonId: 'season-1',
      statsScopeId: 'season-1',
      seasonNumber: 1,
    }, {
      computedAt: '2026-06-12T00:00:00.000Z',
    });

    expect(result.persisted).toBe(true);
    expect(result.rows).toHaveLength(6);
    const target = await getFranchiseTrueValueRow({
      franchiseId: 'franchise-1',
      seasonId: 'season-1',
      statsScopeId: 'season-1',
      playerId: 'target',
    });
    expect(target).toMatchObject({
      playerId: 'target',
      trueValue: 3000,
      contractValue: 1000,
      valueDelta: 2000,
      warPercentile: 2 / 6,
      position: 'SS',
      peerPoolSize: 6,
      calculationVersion: 'true-value-step-percentile-v1',
      computedAt: '2026-06-12T00:00:00.000Z',
    });
  });

  test('round-trips rows through the shared tracker database', async () => {
    mocks.buildFranchiseValueInputRows.mockResolvedValue(report(peerLadder(1)));

    await calculateAndPersistFranchiseTrueValueForSeason({
      franchiseId: 'franchise-1',
      seasonId: 'season-1',
      statsScopeId: 'season-1',
      seasonNumber: 1,
    });

    const db = await initFranchiseTrueValueDatabase();
    expect(db.name).toBe('kbl-tracker');
    expect(Array.from(db.objectStoreNames)).toContain('franchiseTrueValueRows');
    await expect(getFranchiseTrueValueRow({
      franchiseId: 'franchise-1',
      seasonId: 'season-1',
      statsScopeId: 'season-1',
      playerId: 'target',
    })).resolves.toMatchObject({
      playerId: 'target',
      position: 'SS',
    });
  });

  test('skips non-canonical position labels with a reason naming the defect label', async () => {
    mocks.buildFranchiseValueInputRows.mockResolvedValue(report(peerLadder(1).map((candidate, index) =>
      index === 0 ? row({ playerId: 'pitcher-label', valuePosition: 'P' }) : candidate,
    )));

    const result = await calculateAndPersistFranchiseTrueValueForSeason({
      franchiseId: 'franchise-1',
      seasonId: 'season-1',
      statsScopeId: 'season-1',
      seasonNumber: 1,
    });

    expect(result.rows.some((candidate) => candidate.playerId === 'pitcher-label')).toBe(false);
    expect(result.skippedRows).toContainEqual({
      playerId: 'pitcher-label',
      reasons: [
        'Non-canonical True Value position "P" is a data defect; R-6 requires a canonical primary position.',
      ],
    });
  });

  test('accepts every R-6 canonical primary position', async () => {
    const canonicalPrimaries = ['SP', 'SP/RP', 'RP', 'CP', 'C', '1B', '2B', 'SS', '3B', 'LF', 'CF', 'RF'];
    mocks.buildFranchiseValueInputRows.mockResolvedValue(report(canonicalPrimaries.map((position, index) =>
      row({
        playerId: `canonical-${position}`,
        valuePosition: position,
        salary: 1000 + index,
        warPreviewValues: {
          ...row().warPreviewValues,
          totalWar: index,
        },
      }),
    )));

    const result = await calculateAndPersistFranchiseTrueValueForSeason({
      franchiseId: 'franchise-1',
      seasonId: 'season-1',
      statsScopeId: 'season-1',
      seasonNumber: 1,
    });

    expect(result.skippedRows).toEqual([]);
    expect(result.rows.map((candidate) => candidate.position).sort()).toEqual([...canonicalPrimaries].sort());
  });

  test('replaces scoped rows when a later completed game recomputes True Value', async () => {
    mocks.buildFranchiseValueInputRows.mockResolvedValueOnce(report(peerLadder(1)));
    await calculateAndPersistFranchiseTrueValueForSeason({
      franchiseId: 'franchise-1',
      seasonId: 'season-1',
      statsScopeId: 'season-1',
      seasonNumber: 1,
    }, {
      computedAt: '2026-06-12T00:00:00.000Z',
    });

    mocks.buildFranchiseValueInputRows.mockResolvedValueOnce(report(peerLadder(4.5)));
    await calculateAndPersistFranchiseTrueValueForSeason({
      franchiseId: 'franchise-1',
      seasonId: 'season-1',
      statsScopeId: 'season-1',
      seasonNumber: 1,
    }, {
      computedAt: '2026-06-12T00:01:00.000Z',
    });

    const rows = await getFranchiseTrueValueRows({
      franchiseId: 'franchise-1',
      seasonId: 'season-1',
      statsScopeId: 'season-1',
    });
    const target = rows.find((candidate) => candidate.playerId === 'target');
    expect(rows).toHaveLength(6);
    expect(target).toMatchObject({
      trueValue: 6000,
      valueDelta: 5000,
      computedAt: '2026-06-12T00:01:00.000Z',
    });
  });

  test('source never reads schedule total game fields for True Value calculation', () => {
    const storageSource = readFileSync('src/utils/franchiseTrueValueStorage.ts', 'utf8');
    const previewSource = readFileSync('src/utils/franchiseTrueValuePreview.ts', 'utf8');

    expect(storageSource).not.toMatch(/totalGames/);
    expect(previewSource).not.toMatch(/totalGames/);
  });
});
