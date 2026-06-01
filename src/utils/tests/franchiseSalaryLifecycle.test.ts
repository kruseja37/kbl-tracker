import { beforeEach, describe, expect, test, vi } from 'vitest';
import {
  buildFranchiseSalaryLifecycle,
  classifyFranchiseSalaryLifecycle,
  type FranchisePlayerSalaryLifecycleRecord,
} from '../franchiseSalaryLifecycle';
import {
  FRANCHISE_VALUE_INPUT_CONTRACT_VERSION,
  type BuildFranchiseValueInputRowsInput,
  type FranchiseValueInputReport,
  type FranchiseValueInputRow,
} from '../franchiseValueInputs';

const mocks = vi.hoisted(() => ({
  buildFranchiseValueInputRows: vi.fn(),
  saveFranchisePlayer: vi.fn(),
  saveFranchiseTeam: vi.fn(),
  saveFranchiseConfig: vi.fn(),
  withInitialFranchiseSalary: vi.fn(),
}));

vi.mock('../franchiseValueInputs', () => ({
  FRANCHISE_VALUE_INPUT_CONTRACT_VERSION: 'franchise-mode2-value-inputs-v1-readonly',
  buildFranchiseValueInputRows: mocks.buildFranchiseValueInputRows,
}));

vi.mock('../franchisePlayerStorage', () => ({
  saveFranchisePlayer: mocks.saveFranchisePlayer,
  saveFranchiseTeam: mocks.saveFranchiseTeam,
}));

vi.mock('../franchiseManager', () => ({
  saveFranchiseConfig: mocks.saveFranchiseConfig,
}));

vi.mock('../franchiseSalary', () => ({
  withInitialFranchiseSalary: mocks.withInitialFranchiseSalary,
}));

function makeSeasonContext(overrides: Partial<FranchiseValueInputRow['seasonContext']> = {}): FranchiseValueInputRow['seasonContext'] {
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

function makeRow(overrides: Partial<FranchiseValueInputRow> = {}): FranchiseValueInputRow {
  return {
    contractVersion: FRANCHISE_VALUE_INPUT_CONTRACT_VERSION,
    franchiseId: 'franchise-1',
    seasonId: 'season-1',
    statsScopeId: 'season-1',
    seasonNumber: 1,
    playerId: 'player-1',
    playerName: 'Salary Baseline',
    currentTeamId: 'team-1',
    rosterStatus: 'MLB',
    salary: 8.5,
    contractYears: 2,
    salaryBaselineCalculationVersion: 'franchise-initial-salary-v1-ratings-only',
    teamSalaryBaseline: 42,
    salaryBaselineAvailable: true,
    seasonStatsAvailability: {
      batting: false,
      pitching: false,
      fielding: false,
      any: false,
    },
    warInputAvailability: {
      battingWar: false,
      pitchingWar: false,
      fieldingWar: false,
      baserunningWar: false,
      any: false,
      trustedForFinalValue: false,
    },
    wpaInputAvailability: {
      playerWpa: false,
      managerWpa: false,
      archiveBacked: false,
      trustedForFinalValue: false,
    },
    seasonContext: makeSeasonContext(),
    stadiumId: 'stadium-apple-field',
    parkFactorAvailability: {
      stadiumIdAvailable: true,
      seedParkFactorsAvailable: true,
      customParkFactorsAvailable: false,
      status: 'seed-only',
      parkAdjustedValueInputsAvailable: false,
    },
    limitations: [
      'Final True Value and dynamic designations are not calculated by this read-only contract.',
    ],
    ...overrides,
  };
}

function makeReport(rows: FranchiseValueInputRow[]): FranchiseValueInputReport {
  return {
    contractVersion: FRANCHISE_VALUE_INPUT_CONTRACT_VERSION,
    franchiseId: 'franchise-1',
    seasonId: 'season-1',
    statsScopeId: 'season-1',
    seasonNumber: 1,
    generatedAt: 1,
    seasonContext: makeSeasonContext(),
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
    limitations: rows.flatMap((row) => row.limitations),
  };
}

function playerRecord(
  records: FranchisePlayerSalaryLifecycleRecord[],
  playerId: string,
): FranchisePlayerSalaryLifecycleRecord {
  const record = records.find((candidate) => candidate.playerId === playerId);
  expect(record).toBeTruthy();
  return record!;
}

describe('franchise salary lifecycle adapter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('initial salary baseline is stable when stored franchise salary exists', () => {
    const report = classifyFranchiseSalaryLifecycle(makeReport([makeRow()]));
    const record = playerRecord(report.playerRecords, 'player-1');

    expect(record.initialSalaryBaseline).toEqual(expect.objectContaining({
      status: 'stable-baseline',
      persistable: false,
      recalculable: false,
    }));
    expect(record.salary).toBe(8.5);
    expect(record.salaryBaselineCalculationVersion).toBe('franchise-initial-salary-v1-ratings-only');
    expect(report.anyPersistable).toBe(false);
    expect(report.anyRecalculable).toBe(false);
  });

  test('missing salary baseline blocks stable salary classification', () => {
    const report = classifyFranchiseSalaryLifecycle(makeReport([
      makeRow({
        salary: null,
        salaryBaselineCalculationVersion: null,
        salaryBaselineAvailable: false,
        limitations: ['Salary baseline proof is missing or incomplete for this player.'],
      }),
    ]));
    const record = playerRecord(report.playerRecords, 'player-1');

    expect(record.initialSalaryBaseline.status).toBe('blocked');
    expect(record.initialSalaryBaseline.reasons.join(' ')).toContain('Stored player salary baseline is missing');
    expect(record.persistable).toBe(false);
    expect(record.recalculable).toBe(false);
  });

  test('team payroll baseline is reported when present and limited when missing', () => {
    const report = classifyFranchiseSalaryLifecycle(makeReport([
      makeRow({ playerId: 'with-payroll', currentTeamId: 'team-1', teamSalaryBaseline: 42 }),
      makeRow({
        playerId: 'missing-payroll',
        currentTeamId: 'team-2',
        teamSalaryBaseline: null,
        limitations: ['Team payroll baseline is missing for this player/team.'],
      }),
    ]));

    const withPayroll = playerRecord(report.playerRecords, 'with-payroll');
    const missingPayroll = playerRecord(report.playerRecords, 'missing-payroll');
    const teamOne = report.teamRecords.find((team) => team.teamId === 'team-1');
    const teamTwo = report.teamRecords.find((team) => team.teamId === 'team-2');

    expect(withPayroll.teamPayrollBaselineState.status).toBe('stable-baseline');
    expect(withPayroll.teamPayrollBaseline).toBe(42);
    expect(missingPayroll.teamPayrollBaselineState.status).toBe('blocked');
    expect(missingPayroll.teamPayrollBaselineState.reasons.join(' ')).toContain('Team payroll baseline is missing');
    expect(teamOne).toEqual(expect.objectContaining({
      teamId: 'team-1',
      payrollBaseline: 42,
      playerCount: 1,
    }));
    expect(teamOne?.payrollBaselineState.status).toBe('stable-baseline');
    expect(teamTwo?.payrollBaselineState.status).toBe('blocked');
    expect(teamTwo?.limitations).toContain('Team payroll baseline is unavailable for this team.');
  });

  test('performance salary movement is blocked without canonical True Value and trusted final WAR/WPA', () => {
    const report = classifyFranchiseSalaryLifecycle(makeReport([
      makeRow({
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
          playerWpa: true,
          managerWpa: true,
          archiveBacked: true,
          trustedForFinalValue: false,
        },
      }),
    ]));
    const record = playerRecord(report.playerRecords, 'player-1');

    expect(record.performanceSalaryMovement.status).toBe('blocked');
    expect(record.performanceSalaryMovement.reasons.join(' ')).toContain('canonical True Value is unavailable');
    expect(record.performanceSalaryMovement.reasons.join(' ')).toContain('Trusted final WAR/WPA salary inputs are unavailable');
    expect(record.sourceInputs).toEqual(expect.objectContaining({
      warPreviewInputAvailable: true,
      wpaAvailable: true,
      trustedFinalWarWpaAvailable: false,
      trueValueAvailable: false,
    }));
  });

  test('luxury tax, salary matching, and AI trade salary valuation are inactive and blocked', () => {
    const report = classifyFranchiseSalaryLifecycle(makeReport([makeRow()]));

    expect(report.policies.luxuryTax).toEqual(expect.objectContaining({
      status: 'blocked',
      active: false,
    }));
    expect(report.policies.luxuryTax.reasons.join(' ')).toContain('Luxury tax is inactive');
    expect(report.policies.salaryMatching).toEqual(expect.objectContaining({
      status: 'blocked',
      active: false,
    }));
    expect(report.policies.salaryMatching.reasons.join(' ')).toContain('Salary matching for trades is inactive');
    expect(report.policies.aiTradeSalaryValuation).toEqual(expect.objectContaining({
      status: 'blocked',
      active: false,
    }));
    expect(report.policies.aiTradeSalaryValuation.reasons.join(' ')).toContain('AI trade salary valuation is inactive');
  });

  test('FARM, free-agent, and unassigned players carry explicit salary-context limitations', () => {
    const report = classifyFranchiseSalaryLifecycle(makeReport([
      makeRow({ playerId: 'farm-player', rosterStatus: 'FARM' }),
      makeRow({ playerId: 'free-agent', currentTeamId: null, rosterStatus: null, teamSalaryBaseline: null }),
      makeRow({ playerId: 'unassigned', currentTeamId: null, rosterStatus: null, teamSalaryBaseline: null }),
    ]));

    expect(playerRecord(report.playerRecords, 'farm-player').limitations).toContain(
      'FARM player salary context is read-only; FARM players are not eligible for MLB salary movement in this slice.',
    );
    expect(playerRecord(report.playerRecords, 'free-agent').limitations).toContain(
      'Free-agent or unassigned salary context is incomplete for franchise team payroll decisions.',
    );
    expect(playerRecord(report.playerRecords, 'unassigned').teamPayrollBaselineState.status).toBe('blocked');
  });

  test('offseason salary recalculation is deferred and no salary output is persistable or recalculable', () => {
    const report = classifyFranchiseSalaryLifecycle(makeReport([
      makeRow({
        seasonContext: makeSeasonContext({ gamesPerTeam: null, inningsPerGame: null, seasonLengthSource: 'missing' }),
      }),
    ]));
    const record = playerRecord(report.playerRecords, 'player-1');

    expect(record.offseasonSalaryRecalculation.status).toBe('deferred');
    expect(record.offseasonSalaryRecalculation.reasons.join(' ')).toContain('Offseason salary recalculation is deferred');
    expect(record.offseasonSalaryRecalculation.reasons.join(' ')).toContain('Stored season length and innings metadata are missing');
    expect(report.playerRecords.every((candidate) => candidate.persistable === false && candidate.recalculable === false)).toBe(true);
    expect(report.anyPersistable).toBe(false);
    expect(report.anyRecalculable).toBe(false);
  });

  test('async adapter consumes the value-input contract and does not call save/set/persist APIs', async () => {
    const input: BuildFranchiseValueInputRowsInput = {
      franchiseId: 'franchise-1',
      seasonId: 'season-1',
      seasonNumber: 1,
    };
    mocks.buildFranchiseValueInputRows.mockResolvedValue(makeReport([makeRow()]));

    const report = await buildFranchiseSalaryLifecycle(input);

    expect(mocks.buildFranchiseValueInputRows).toHaveBeenCalledWith(input);
    expect(mocks.saveFranchisePlayer).not.toHaveBeenCalled();
    expect(mocks.saveFranchiseTeam).not.toHaveBeenCalled();
    expect(mocks.saveFranchiseConfig).not.toHaveBeenCalled();
    expect(mocks.withInitialFranchiseSalary).not.toHaveBeenCalled();
    expect(report.playerRecords.every((record) => record.persistable === false && record.recalculable === false)).toBe(true);
  });
});
