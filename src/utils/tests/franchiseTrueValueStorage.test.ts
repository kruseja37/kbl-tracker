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
import {
  clearFranchiseTrustedValueDatabaseForTests,
  freezeTrustedValueArtifactForSeason,
  getTrustedValueArtifact,
} from '../franchiseTrustedValueStorage';

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
    trueValuePositioning: undefined,
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
    trustedValueArtifactFrozen: false,
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
    await clearFranchiseTrustedValueDatabaseForTests();
  });

  afterEach(async () => {
    await clearFranchiseTrustedValueDatabaseForTests();
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
      calculationVersion: 'true-value-effective-position-v2',
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

  test('persists D6 live trust artifact with hard peer-pool blocks and hidden/score-only exclusions', async () => {
    const hiddenFarm = row({
      playerId: 'hidden-farm',
      currentTeamId: 'farm-team',
      rosterStatus: 'FARM',
      limitations: ['Hidden FARM prospect salary uses draft/scouting-safe public context; true ratings and true grade are not salary inputs.'],
    });
    const scoreOnly = row({
      playerId: 'score-only-row',
      seasonStatsAvailability: { batting: false, pitching: false, fielding: false, any: false },
      warInputAvailability: {
        battingWar: false,
        pitchingWar: false,
        fieldingWar: false,
        baserunningWar: false,
        any: false,
        trustedForFinalValue: false,
      },
      warPreviewValues: {
        battingWar: null,
        pitchingWar: null,
        fieldingWar: null,
        baserunningWar: null,
        totalWar: null,
        totalWarSource: 'unavailable',
        trustedForFinalValue: false,
      },
      limitations: ['Score-only rows do not create player stats, WPA, WAR, awards, designations, or narrative/random-event inputs.'],
    });
    mocks.buildFranchiseValueInputRows.mockResolvedValue(report([
      row({ playerId: 'trusted-ss', valuePosition: 'SS' }),
      row({ playerId: 'ss-peer-1', valuePosition: 'SS', salary: 2000 }),
      row({ playerId: 'ss-peer-2', valuePosition: 'SS', salary: 3000 }),
      row({ playerId: 'blocked-c', valuePosition: 'C', salary: 4000 }),
      row({ playerId: 'c-peer-1', valuePosition: 'C', salary: 5000 }),
      hiddenFarm,
      scoreOnly,
    ]));

    await calculateAndPersistFranchiseTrueValueForSeason({
      franchiseId: 'franchise-1',
      seasonId: 'season-1',
      statsScopeId: 'season-1',
      seasonNumber: 1,
    }, {
      computedAt: '2026-06-16T00:00:00.000Z',
    });

    const artifact = await getTrustedValueArtifact('franchise-1', 'season-1', 'season-1');
    expect(artifact).toMatchObject({
      contractVersion: 'd6-v1',
      peerPoolMinThreshold: 2,
      trustedPlayerIds: ['ss-peer-1', 'ss-peer-2', 'trusted-ss'],
      blockedRows: [
        {
          playerId: 'blocked-c',
          reasons: ['Position C peer pool size 1 (< 2 required)'],
        },
        {
          playerId: 'c-peer-1',
          reasons: ['Position C peer pool size 1 (< 2 required)'],
        },
      ],
      frozen: false,
      frozenAt: null,
      computedAt: Date.parse('2026-06-16T00:00:00.000Z'),
    });
    expect(artifact?.trustedPlayerIds).not.toContain('hidden-farm');
    expect(artifact?.trustedPlayerIds).not.toContain('score-only-row');
    expect(artifact?.blockedRows.map((blocked) => blocked.playerId)).not.toContain('hidden-farm');
    expect(artifact?.blockedRows.map((blocked) => blocked.playerId)).not.toContain('score-only-row');
    expect(artifact?.rosterStateSnapshot).toContainEqual({
      playerId: 'hidden-farm',
      teamId: 'farm-team',
      rosterStatus: 'FARM',
    });
  });

  test('full-player blocks a two-way holder when any audited position has fewer than two peers', async () => {
    const twoWayPositioning: FranchiseValueInputRow['trueValuePositioning'] = {
      valuationMode: 'two-way-composite',
      valuePosition: 'CF',
      effectivePosition: 'CF',
      poolPosition: null,
      profilePosition: 'SP/RP',
      profilePitcherRole: 'SP/RP',
      starts: 0,
      currentTeamStarts: 0,
      teamCompletedGames: 0,
      startsShare: null,
      isReserve: false,
      twoWayTrait: 'Two Way (OF)',
      twoWayBatPosition: 'CF',
      twoWayArmPosition: 'SP/RP',
      startsSource: 'game-header-starting-lineups',
      reasons: [],
    };
    mocks.buildFranchiseValueInputRows.mockResolvedValue(report([
      row({
        playerId: 'two-way-holder',
        salary: 750,
        valuePosition: 'CF',
        trueValuePositioning: twoWayPositioning,
        warInputAvailability: {
          battingWar: true,
          pitchingWar: true,
          fieldingWar: true,
          baserunningWar: true,
          any: true,
          trustedForFinalValue: false,
        },
        warPreviewValues: {
          battingWar: 1.5,
          pitchingWar: 3,
          fieldingWar: 0.3,
          baserunningWar: 0.2,
          totalWar: 5,
          totalWarSource: 'stat-row',
          trustedForFinalValue: false,
        },
      }),
      row({ playerId: 'arm-peer-1', valuePosition: 'SP/RP', salary: 1000 }),
      row({ playerId: 'arm-peer-2', valuePosition: 'SP/RP', salary: 2000 }),
      row({ playerId: 'bat-peer-1', valuePosition: 'CF', salary: 3000 }),
    ]));

    await calculateAndPersistFranchiseTrueValueForSeason({
      franchiseId: 'franchise-1',
      seasonId: 'season-1',
      statsScopeId: 'season-1',
      seasonNumber: 1,
    });

    const artifact = await getTrustedValueArtifact('franchise-1', 'season-1', 'season-1');
    expect(artifact?.trustedPlayerIds).not.toContain('two-way-holder');
    expect(artifact?.blockedRows).toContainEqual({
      playerId: 'two-way-holder',
      reasons: ['Position CF peer pool size 1 (< 2 required)'],
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

  test('uses the EP1 Reserve peer pool when starts-share marks a position player reserve', async () => {
    const reservePositioning: FranchiseValueInputRow['trueValuePositioning'] = {
      valuationMode: 'reserve',
      valuePosition: 'SS',
      effectivePosition: 'SS',
      poolPosition: 'RESERVE',
      profilePosition: 'SS',
      profilePitcherRole: null,
      starts: 1,
      currentTeamStarts: 1,
      teamCompletedGames: 5,
      startsShare: 0.2,
      isReserve: true,
      twoWayTrait: null,
      twoWayBatPosition: null,
      twoWayArmPosition: null,
      startsSource: 'game-header-starting-lineups',
      reasons: [],
    };
    mocks.buildFranchiseValueInputRows.mockResolvedValue(report([
      row({
        playerId: 'reserve-target',
        salary: 1000,
        valuePosition: 'SS',
        trueValuePositioning: reservePositioning,
        warPreviewValues: { ...row().warPreviewValues, totalWar: 3 },
      }),
      ...[0, 1, 2, 4, 5].map((war, index) => row({
        playerId: `reserve-peer-${index}`,
        salary: 2000 + (index * 1000),
        valuePosition: '2B',
        trueValuePositioning: {
          ...reservePositioning,
          valuePosition: '2B',
          effectivePosition: '2B',
        },
        warPreviewValues: { ...row().warPreviewValues, totalWar: war },
      })),
      ...[0, 1, 2, 3, 4, 5].map((war, index) => row({
        playerId: `ss-peer-${index}`,
        salary: 10000 + (index * 1000),
        valuePosition: 'SS',
        warPreviewValues: { ...row().warPreviewValues, totalWar: war },
      })),
    ]));

    const result = await calculateAndPersistFranchiseTrueValueForSeason({
      franchiseId: 'franchise-1',
      seasonId: 'season-1',
      statsScopeId: 'season-1',
      seasonNumber: 1,
    });

    expect(result.rows.find((candidate) => candidate.playerId === 'reserve-target')).toMatchObject({
      trueValue: 5000,
      valueDelta: 4000,
      position: 'SS',
      effectivePosition: 'SS',
      poolPosition: 'RESERVE',
      valuationMode: 'reserve',
      peerPoolSize: 6,
    });
  });

  test('stores two-way True Value as arm plus bat-side components and excludes the holder from single peer pools', async () => {
    const twoWayPositioning: FranchiseValueInputRow['trueValuePositioning'] = {
      valuationMode: 'two-way-composite',
      valuePosition: 'CF',
      effectivePosition: 'CF',
      poolPosition: null,
      profilePosition: 'SP/RP',
      profilePitcherRole: 'SP/RP',
      starts: 0,
      currentTeamStarts: 0,
      teamCompletedGames: 0,
      startsShare: null,
      isReserve: false,
      twoWayTrait: 'Two Way (OF)',
      twoWayBatPosition: 'CF',
      twoWayArmPosition: 'SP/RP',
      startsSource: 'game-header-starting-lineups',
      reasons: [],
    };
    mocks.buildFranchiseValueInputRows.mockResolvedValue(report([
      row({
        playerId: 'two-way-holder',
        salary: 750,
        valuePosition: 'CF',
        trueValuePositioning: twoWayPositioning,
        warInputAvailability: {
          battingWar: true,
          pitchingWar: true,
          fieldingWar: true,
          baserunningWar: true,
          any: true,
          trustedForFinalValue: false,
        },
        warPreviewValues: {
          battingWar: 1.5,
          pitchingWar: 3,
          fieldingWar: 0.3,
          baserunningWar: 0.2,
          totalWar: 5,
          totalWarSource: 'stat-row',
          trustedForFinalValue: false,
        },
      }),
      ...[0, 1, 2, 3, 4, 5].map((war, index) => row({
        playerId: `arm-peer-${index}`,
        salary: 1000 + (index * 1000),
        valuePosition: 'SP/RP',
        warPreviewValues: {
          ...row().warPreviewValues,
          pitchingWar: war,
          totalWar: war,
        },
      })),
      ...[0, 1, 2, 3, 4, 5].map((war, index) => row({
        playerId: `bat-peer-${index}`,
        salary: 100 + (index * 100),
        valuePosition: 'CF',
        warPreviewValues: {
          ...row().warPreviewValues,
          battingWar: war,
          fieldingWar: 0,
          baserunningWar: 0,
          totalWar: war,
        },
      })),
    ]));

    const result = await calculateAndPersistFranchiseTrueValueForSeason({
      franchiseId: 'franchise-1',
      seasonId: 'season-1',
      statsScopeId: 'season-1',
      seasonNumber: 1,
    });

    const twoWay = result.rows.find((candidate) => candidate.playerId === 'two-way-holder');
    expect(twoWay).toMatchObject({
      trueValue: 5400,
      contractValue: 750,
      valueDelta: 4650,
      position: 'CF',
      effectivePosition: 'CF',
      valuationMode: 'two-way-composite',
      peerPoolSize: 12,
      trueValueComponents: {
        arm: {
          trueValue: 5000,
          position: 'SP/RP',
          poolPosition: 'SP/RP',
          seasonWAR: 3,
          peerPoolSize: 6,
        },
        bat: {
          trueValue: 400,
          position: 'CF',
          poolPosition: 'CF',
          seasonWAR: 2,
          peerPoolSize: 6,
        },
      },
    });
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

  test('does not recompute or rewrite True Value rows after the trusted artifact is frozen', async () => {
    const scope = {
      franchiseId: 'franchise-1',
      seasonId: 'season-1',
      statsScopeId: 'season-1',
      seasonNumber: 1,
    };
    mocks.buildFranchiseValueInputRows.mockResolvedValueOnce(report(peerLadder(1)));
    await calculateAndPersistFranchiseTrueValueForSeason(scope, {
      computedAt: '2026-06-12T00:00:00.000Z',
    });
    const rowsBeforeFreeze = await getFranchiseTrueValueRows(scope);
    const artifactBeforeFreeze = await getTrustedValueArtifact('franchise-1', 'season-1', 'season-1');
    expect(artifactBeforeFreeze).toMatchObject({
      frozen: false,
      frozenAt: null,
      trustedPlayerIds: ['peer-0', 'peer-2', 'peer-3', 'peer-4', 'peer-5', 'target'],
    });

    vi.spyOn(Date, 'now').mockReturnValue(1781654400000);
    await freezeTrustedValueArtifactForSeason(scope);
    const frozenArtifact = await getTrustedValueArtifact('franchise-1', 'season-1', 'season-1');
    expect(frozenArtifact).toMatchObject({
      frozen: true,
      frozenAt: 1781654400000,
      trustedPlayerIds: artifactBeforeFreeze?.trustedPlayerIds,
    });

    mocks.buildFranchiseValueInputRows.mockClear();
    mocks.buildFranchiseValueInputRows.mockResolvedValueOnce(report(peerLadder(4.5)));
    const result = await calculateAndPersistFranchiseTrueValueForSeason(scope, {
      computedAt: '2026-06-12T00:01:00.000Z',
    });

    expect(result).toEqual({
      rows: [],
      skippedRows: [],
      persisted: false,
      blockers: ['Trusted value artifact frozen for scope (D6b); recompute skipped.'],
    });
    expect(mocks.buildFranchiseValueInputRows).not.toHaveBeenCalled();
    await expect(getTrustedValueArtifact('franchise-1', 'season-1', 'season-1')).resolves.toEqual(frozenArtifact);
    await expect(getFranchiseTrueValueRows(scope)).resolves.toEqual(rowsBeforeFreeze);
  });

  test('source never reads schedule total game fields for True Value calculation', () => {
    const storageSource = readFileSync('src/utils/franchiseTrueValueStorage.ts', 'utf8');
    const previewSource = readFileSync('src/utils/franchiseTrueValuePreview.ts', 'utf8');

    expect(storageSource).not.toMatch(/totalGames/);
    expect(previewSource).not.toMatch(/totalGames/);
  });
});
