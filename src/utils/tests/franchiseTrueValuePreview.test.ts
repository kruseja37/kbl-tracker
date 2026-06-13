import { readFileSync } from 'node:fs';
import { describe, expect, test } from 'vitest';

import {
  buildFranchiseTrueValuePreviewReport,
  FRANCHISE_TRUE_VALUE_PREVIEW_CONTRACT_VERSION,
} from '../franchiseTrueValuePreview';
import {
  classifyFranchiseDesignationEligibility,
  type FranchiseDesignationEligibilityRecord,
} from '../franchiseDesignationEligibility';
import {
  FRANCHISE_VALUE_INPUT_CONTRACT_VERSION,
  type FranchiseValueInputReport,
  type FranchiseValueInputRow,
} from '../franchiseValueInputs';

function seasonContext(overrides: Partial<FranchiseValueInputRow['seasonContext']> = {}): FranchiseValueInputRow['seasonContext'] {
  return {
    seasonId: 'season-1',
    statsScopeId: 'season-1',
    seasonNumber: 1,
    gamesPerTeam: 24,
    inningsPerGame: 6,
    seasonLengthSource: 'stored-franchise-config',
    scheduleRowCount: 0,
    scheduleRowsUsedAsSeasonLength: false,
    seasonMetadataTotalGames: 0,
    ...overrides,
  };
}

function row(overrides: Partial<FranchiseValueInputRow> = {}): FranchiseValueInputRow {
  return {
    contractVersion: FRANCHISE_VALUE_INPUT_CONTRACT_VERSION,
    franchiseId: 'franchise-1',
    seasonId: 'season-1',
    statsScopeId: 'season-1',
    seasonNumber: 1,
    playerId: 'player-1',
    playerName: 'Preview Value',
    valuePosition: 'SS',
    currentTeamId: 'team-1',
    rosterStatus: 'MLB',
    salary: 8.5,
    contractYears: 1,
    salaryBaselineCalculationVersion: 'salary-baseline-v1',
    teamSalaryBaseline: 8.5,
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
      battingWar: 0.2,
      pitchingWar: null,
      fieldingWar: 0.1,
      baserunningWar: 0.1,
      totalWar: 0.4,
      totalWarSource: 'stat-row',
      trustedForFinalValue: false,
    },
    wpaInputAvailability: {
      playerWpa: false,
      managerWpa: false,
      archiveBacked: false,
      trustedForFinalValue: false,
    },
    seasonContext: seasonContext(),
    stadiumId: 'stadium-1',
    parkFactorAvailability: {
      stadiumIdAvailable: true,
      seedParkFactorsAvailable: true,
      customParkFactorsAvailable: false,
      status: 'seed-only',
      parkAdjustedValueInputsAvailable: false,
    },
    limitations: ['Final True Value and dynamic designations are not calculated by this read-only contract.'],
    ...overrides,
  };
}

function report(rows: FranchiseValueInputRow[]): FranchiseValueInputReport {
  return {
    contractVersion: FRANCHISE_VALUE_INPUT_CONTRACT_VERSION,
    franchiseId: 'franchise-1',
    seasonId: 'season-1',
    statsScopeId: 'season-1',
    seasonNumber: 1,
    generatedAt: 100,
    seasonContext: seasonContext(),
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

function findDesignation(
  records: FranchiseDesignationEligibilityRecord[],
  designationType: FranchiseDesignationEligibilityRecord['designationType'],
): FranchiseDesignationEligibilityRecord {
  const record = records.find((candidate) => candidate.designationType === designationType);
  expect(record).toBeTruthy();
  return record!;
}

describe('franchise true value preview contract', () => {
  test('creates position-relative preview-only value and value-delta rows for same-position MLB peers', () => {
    const output = buildFranchiseTrueValuePreviewReport(report([
      row({
        playerId: 'high-war-low-salary',
        playerName: 'High WAR Low Salary',
        salary: 2000,
        warPreviewValues: {
          battingWar: 2,
          pitchingWar: null,
          fieldingWar: 0.6,
          baserunningWar: 0.4,
          totalWar: 3,
          totalWarSource: 'stat-row',
          trustedForFinalValue: false,
        },
      }),
      row({
        playerId: 'low-war-high-salary',
        playerName: 'Low WAR High Salary',
        salary: 10000,
        warPreviewValues: {
          battingWar: 0.4,
          pitchingWar: null,
          fieldingWar: 0.1,
          baserunningWar: 0,
          totalWar: 0.5,
          totalWarSource: 'stat-row',
          trustedForFinalValue: false,
        },
      }),
      row({
        playerId: 'peer-one',
        playerName: 'Peer One',
        salary: 4000,
        warPreviewValues: {
          battingWar: 0.8,
          pitchingWar: null,
          fieldingWar: 0.1,
          baserunningWar: 0.1,
          totalWar: 1,
          totalWarSource: 'stat-row',
          trustedForFinalValue: false,
        },
      }),
      row({
        playerId: 'peer-two',
        playerName: 'Peer Two',
        salary: 6000,
        warPreviewValues: {
          battingWar: 1.6,
          pitchingWar: null,
          fieldingWar: 0.2,
          baserunningWar: 0.2,
          totalWar: 2,
          totalWarSource: 'stat-row',
          trustedForFinalValue: false,
        },
      }),
      row({
        playerId: 'peer-three',
        playerName: 'Peer Three',
        salary: 8000,
        warPreviewValues: {
          battingWar: 3.2,
          pitchingWar: null,
          fieldingWar: 0.4,
          baserunningWar: 0.4,
          totalWar: 4,
          totalWarSource: 'stat-row',
          trustedForFinalValue: false,
        },
      }),
      row({
        playerId: 'peer-four',
        playerName: 'Peer Four',
        salary: 12000,
        warPreviewValues: {
          battingWar: 4,
          pitchingWar: null,
          fieldingWar: 0.5,
          baserunningWar: 0.5,
          totalWar: 5,
          totalWarSource: 'stat-row',
          trustedForFinalValue: false,
        },
      }),
    ]));

    expect(output.contractVersion).toBe(FRANCHISE_TRUE_VALUE_PREVIEW_CONTRACT_VERSION);
    expect(output.policies).toEqual({
      finalTrueValueCalculated: false,
      persistedTrueValueCreated: false,
      valueDeltaTrustedForDesignations: false,
      expectedWinsTrusted: false,
      salaryMovementAllowed: false,
      designationFinalizationAllowed: false,
      moraleMutationAllowed: false,
    });
    const highWar = output.playerRows.find((previewRow) => previewRow.playerId === 'high-war-low-salary');
    const lowWar = output.playerRows.find((previewRow) => previewRow.playerId === 'low-war-high-salary');

    expect(highWar).toMatchObject({
      status: 'preview-only',
      salary: 2000,
      valuePosition: 'SS',
      warPreviewTotal: 3,
      previewValueEstimate: 10000,
      valueDeltaEstimate: 8000,
      valueDeltaTrustedForDesignations: false,
      expectedWinsTrusted: false,
      salaryMovementAllowed: false,
      designationFinalizationAllowed: false,
      persistable: false,
    });
    expect(lowWar).toMatchObject({
      status: 'preview-only',
      salary: 10000,
      previewValueEstimate: 4000,
      valueDeltaEstimate: -6000,
    });
    expect(highWar?.limitations.join(' ')).toMatch(/step-percentile.*canonical/i);
  });

  test('documents the canonical step shift from the old interpolated preview behavior', () => {
    const output = buildFranchiseTrueValuePreviewReport(report([
      row({
        playerId: 'step-shift',
        salary: 20000,
        warPreviewValues: {
          battingWar: 0.8,
          pitchingWar: null,
          fieldingWar: 0.1,
          baserunningWar: 0.1,
          totalWar: 1,
          totalWarSource: 'stat-row',
          trustedForFinalValue: false,
        },
      }),
      row({
        playerId: 'war-zero',
        salary: 10000,
        warPreviewValues: {
          battingWar: 0,
          pitchingWar: null,
          fieldingWar: 0,
          baserunningWar: 0,
          totalWar: 0,
          totalWarSource: 'stat-row',
          trustedForFinalValue: false,
        },
      }),
      row({
        playerId: 'war-two',
        salary: 40000,
        warPreviewValues: {
          battingWar: 1.6,
          pitchingWar: null,
          fieldingWar: 0.2,
          baserunningWar: 0.2,
          totalWar: 2,
          totalWarSource: 'stat-row',
          trustedForFinalValue: false,
        },
      }),
      row({
        playerId: 'war-three',
        salary: 80000,
        warPreviewValues: {
          battingWar: 2.4,
          pitchingWar: null,
          fieldingWar: 0.3,
          baserunningWar: 0.3,
          totalWar: 3,
          totalWarSource: 'stat-row',
          trustedForFinalValue: false,
        },
      }),
      row({
        playerId: 'war-four',
        salary: 160000,
        warPreviewValues: {
          battingWar: 3.2,
          pitchingWar: null,
          fieldingWar: 0.4,
          baserunningWar: 0.4,
          totalWar: 4,
          totalWarSource: 'stat-row',
          trustedForFinalValue: false,
        },
      }),
    ]));

    const shifted = output.playerRows.find((previewRow) => previewRow.playerId === 'step-shift');
    expect(shifted).toMatchObject({
      status: 'preview-only',
      previewValueEstimate: 40000,
      valueDeltaEstimate: 20000,
    });
  });

  test('previews Reserve rows against the EP1 Reserve peer pool', () => {
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
    const output = buildFranchiseTrueValuePreviewReport(report([
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

    expect(output.playerRows.find((previewRow) => previewRow.playerId === 'reserve-target')).toMatchObject({
      status: 'preview-only',
      previewValueEstimate: 5000,
      valueDeltaEstimate: 4000,
      effectivePosition: 'SS',
      poolPosition: 'RESERVE',
      valuationMode: 'reserve',
    });
  });

  test('previews two-way rows as arm plus bat-side True Value components', () => {
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
    const output = buildFranchiseTrueValuePreviewReport(report([
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

    expect(output.playerRows.find((previewRow) => previewRow.playerId === 'two-way-holder')).toMatchObject({
      status: 'preview-only',
      previewValueEstimate: 5400,
      valueDeltaEstimate: 4650,
      effectivePosition: 'CF',
      poolPosition: null,
      valuationMode: 'two-way-composite',
    });
  });

  test('blocks missing salary missing numeric WAR missing team position season metadata FARM unassigned and small peer pool rows', () => {
    const output = buildFranchiseTrueValuePreviewReport(report([
      row({ playerId: 'missing-salary', salary: null, salaryBaselineAvailable: false }),
      row({
        playerId: 'missing-war',
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
      }),
      row({ playerId: 'missing-team', currentTeamId: null }),
      row({ playerId: 'missing-position', valuePosition: null }),
      row({ playerId: 'missing-season', seasonContext: seasonContext({ gamesPerTeam: null, inningsPerGame: null }) }),
      row({ playerId: 'farm', rosterStatus: 'FARM' }),
      row({ playerId: 'unassigned', currentTeamId: null, rosterStatus: null }),
      row({ playerId: 'small-peer-pool', valuePosition: 'C' }),
    ]));

    expect(output.playerRows.every((previewRow) => previewRow.status === 'blocked')).toBe(true);
    expect(output.playerRows.find((previewRow) => previewRow.playerId === 'missing-salary')?.reasons.join(' ')).toMatch(/salary baseline/i);
    expect(output.playerRows.find((previewRow) => previewRow.playerId === 'missing-war')?.reasons.join(' ')).toMatch(/Numeric WAR preview total/i);
    expect(output.playerRows.find((previewRow) => previewRow.playerId === 'missing-team')?.reasons.join(' ')).toMatch(/Current team id/i);
    expect(output.playerRows.find((previewRow) => previewRow.playerId === 'missing-position')?.reasons.join(' ')).toMatch(/Primary\/value position/i);
    expect(output.playerRows.find((previewRow) => previewRow.playerId === 'missing-season')?.reasons.join(' ')).toMatch(/season length and innings metadata/i);
    expect(output.playerRows.find((previewRow) => previewRow.playerId === 'farm')?.reasons.join(' ')).toMatch(/Current MLB roster status/i);
    expect(output.playerRows.find((previewRow) => previewRow.playerId === 'unassigned')?.reasons.join(' ')).toMatch(/Current team id/i);
    expect(output.playerRows.find((previewRow) => previewRow.playerId === 'small-peer-pool')?.reasons.join(' ')).toMatch(/At least two current MLB players/i);
  });

  test('blocks missing and mismatched scope', () => {
    const missingScope = buildFranchiseTrueValuePreviewReport({
      ...report([row()]),
      franchiseId: '',
      seasonId: '',
      statsScopeId: '',
      seasonNumber: 0,
    });
    expect(missingScope.playerRows[0].status).toBe('blocked');
    expect(missingScope.playerRows[0].reasons.join(' ')).toMatch(/Explicit franchise, season, stats scope/i);

    const mismatched = buildFranchiseTrueValuePreviewReport(report([
      row({ franchiseId: 'other-franchise' }),
    ]));
    expect(mismatched.playerRows[0].status).toBe('blocked');
    expect(mismatched.playerRows[0].reasons.join(' ')).toMatch(/row scope does not match/i);
  });

  test('team summary aggregates preview rows but remains preview-only and untrusted', () => {
    const output = buildFranchiseTrueValuePreviewReport(report([
      row({
        playerId: 'one',
        salary: 8500,
        warPreviewValues: {
          battingWar: 2,
          pitchingWar: null,
          fieldingWar: 0.5,
          baserunningWar: 0.5,
          totalWar: 3,
          totalWarSource: 'stat-row',
          trustedForFinalValue: false,
        },
      }),
      row({
        playerId: 'two',
        salary: 3500,
        warPreviewValues: {
          battingWar: 0.8,
          pitchingWar: null,
          fieldingWar: 0.1,
          baserunningWar: 0.1,
          totalWar: 1,
          totalWarSource: 'stat-row',
          trustedForFinalValue: false,
        },
      }),
      row({
        playerId: 'three',
        salary: 5000,
        warPreviewValues: {
          battingWar: 0.4,
          pitchingWar: null,
          fieldingWar: 0.1,
          baserunningWar: 0,
          totalWar: 0.5,
          totalWarSource: 'stat-row',
          trustedForFinalValue: false,
        },
      }),
      row({
        playerId: 'four',
        salary: 6500,
        warPreviewValues: {
          battingWar: 1.6,
          pitchingWar: null,
          fieldingWar: 0.2,
          baserunningWar: 0.2,
          totalWar: 2,
          totalWarSource: 'stat-row',
          trustedForFinalValue: false,
        },
      }),
      row({
        playerId: 'five',
        salary: 7500,
        warPreviewValues: {
          battingWar: 3.2,
          pitchingWar: null,
          fieldingWar: 0.4,
          baserunningWar: 0.4,
          totalWar: 4,
          totalWarSource: 'stat-row',
          trustedForFinalValue: false,
        },
      }),
      row({
        playerId: 'six',
        salary: 10000,
        warPreviewValues: {
          battingWar: 4,
          pitchingWar: null,
          fieldingWar: 0.5,
          baserunningWar: 0.5,
          totalWar: 5,
          totalWarSource: 'stat-row',
          trustedForFinalValue: false,
        },
      }),
      row({ playerId: 'blocked', salary: null, salaryBaselineAvailable: false }),
    ]));

    expect(output.teamSummaries).toHaveLength(1);
    expect(output.teamSummaries[0]).toMatchObject({
      teamId: 'team-1',
      previewPlayerCount: 6,
      blockedPlayerCount: 1,
      salaryTotal: 41000,
      previewValueEstimateTotal: 47500,
      valueDeltaEstimateTotal: 6500,
      expectedWinsTrusted: false,
      valueDeltaTrustedForDesignations: false,
      salaryMovementAllowed: false,
    });
  });

  test('Fan Favorite and Albatross remain blocked because preview value delta is not trusted final input', () => {
    const valueReport = report([row()]);
    const preview = buildFranchiseTrueValuePreviewReport(valueReport);
    const eligibility = classifyFranchiseDesignationEligibility(valueReport);

    expect(preview.policies.valueDeltaTrustedForDesignations).toBe(false);
    expect(findDesignation(eligibility.records, 'FAN_FAVORITE').status).toBe('blocked');
    expect(findDesignation(eligibility.records, 'FAN_FAVORITE').reasons.join(' ')).toMatch(/True Value and value-delta inputs/i);
    expect(findDesignation(eligibility.records, 'ALBATROSS').status).toBe('blocked');
    expect(findDesignation(eligibility.records, 'ALBATROSS').reasons.join(' ')).toMatch(/True Value and value-delta inputs/i);
  });

  test('utility imports no storage save set persist or mutation APIs', () => {
    const source = readFileSync('src/utils/franchiseTrueValuePreview.ts', 'utf8');
    const output = buildFranchiseTrueValuePreviewReport(report([row()]));

    expect(source).not.toMatch(/indexedDB|syncEngine|save[A-Z]|set[A-Z]|persist[A-Z]|put\(|delete\(|applyFranchiseMoraleEffect|confirmFranchiseRandomEvent|saveFranchisePlayer|saveFranchiseTeam/);
    expect(output.policies.persistedTrueValueCreated).toBe(false);
    expect(output.policies.salaryMovementAllowed).toBe(false);
    expect(output.policies.designationFinalizationAllowed).toBe(false);
  });
});
