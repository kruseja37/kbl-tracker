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
        salary: 2,
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
        salary: 10,
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
      salary: 2,
      valuePosition: 'SS',
      warPreviewTotal: 3,
      previewValueEstimate: 10,
      valueDeltaEstimate: 8,
      valueDeltaTrustedForDesignations: false,
      expectedWinsTrusted: false,
      salaryMovementAllowed: false,
      designationFinalizationAllowed: false,
      persistable: false,
    });
    expect(lowWar).toMatchObject({
      status: 'preview-only',
      salary: 10,
      previewValueEstimate: 2,
      valueDeltaEstimate: -8,
    });
    expect(highWar?.limitations.join(' ')).toMatch(/position-relative percentile estimate is preview-only/i);
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
    expect(output.playerRows.find((previewRow) => previewRow.playerId === 'small-peer-pool')?.reasons.join(' ')).toMatch(/At least two current MLB C peers/i);
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
        salary: 8.5,
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
        salary: 3.5,
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
      row({ playerId: 'blocked', salary: null, salaryBaselineAvailable: false }),
    ]));

    expect(output.teamSummaries).toHaveLength(1);
    expect(output.teamSummaries[0]).toMatchObject({
      teamId: 'team-1',
      previewPlayerCount: 2,
      blockedPlayerCount: 1,
      salaryTotal: 12,
      previewValueEstimateTotal: 12,
      valueDeltaEstimateTotal: 0,
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
