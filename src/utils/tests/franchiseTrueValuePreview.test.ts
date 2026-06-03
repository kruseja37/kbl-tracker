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
  test('creates salary-anchored preview-only value and value-delta rows for stable MLB value inputs', () => {
    const output = buildFranchiseTrueValuePreviewReport(report([row()]));

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
    expect(output.playerRows[0]).toMatchObject({
      status: 'preview-only',
      salary: 8.5,
      previewValueEstimate: 8.5,
      valueDeltaEstimate: 0,
      valueDeltaTrustedForDesignations: false,
      expectedWinsTrusted: false,
      salaryMovementAllowed: false,
      designationFinalizationAllowed: false,
      persistable: false,
    });
    expect(output.playerRows[0].limitations.join(' ')).toMatch(/salary-anchored/i);
  });

  test('blocks missing salary missing WAR missing season metadata FARM and unassigned rows', () => {
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
      }),
      row({ playerId: 'missing-season', seasonContext: seasonContext({ gamesPerTeam: null, inningsPerGame: null }) }),
      row({ playerId: 'farm', rosterStatus: 'FARM' }),
      row({ playerId: 'unassigned', currentTeamId: null, rosterStatus: null }),
    ]));

    expect(output.playerRows.every((previewRow) => previewRow.status === 'blocked')).toBe(true);
    expect(output.playerRows.find((previewRow) => previewRow.playerId === 'missing-salary')?.reasons.join(' ')).toMatch(/salary baseline/i);
    expect(output.playerRows.find((previewRow) => previewRow.playerId === 'missing-war')?.reasons.join(' ')).toMatch(/WAR-like preview inputs/i);
    expect(output.playerRows.find((previewRow) => previewRow.playerId === 'missing-season')?.reasons.join(' ')).toMatch(/season length and innings metadata/i);
    expect(output.playerRows.find((previewRow) => previewRow.playerId === 'farm')?.reasons.join(' ')).toMatch(/Current MLB roster status/i);
    expect(output.playerRows.find((previewRow) => previewRow.playerId === 'unassigned')?.reasons.join(' ')).toMatch(/Current team id/i);
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
      row({ playerId: 'one', salary: 8.5 }),
      row({ playerId: 'two', salary: 3.5 }),
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
