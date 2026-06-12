import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { StoredFranchiseConfig } from '../../types/franchise';
import type { Player, Team } from '../leagueBuilderStorage';
import {
  FRANCHISE_CURRENT_SALARY_CALCULATION_VERSION,
} from '../franchiseSalary';
import {
  buildFranchiseSalaryBaselineProofFromPlayers,
  upsertFranchiseSeasonSalariesFromValueInputReport,
} from '../franchiseSalarySystem';
import {
  FRANCHISE_VALUE_INPUT_CONTRACT_VERSION,
  type FranchiseValueInputReport,
  type FranchiseValueInputRow,
} from '../franchiseValueInputs';

const mocks = vi.hoisted(() => ({
  getAllFranchisePlayers: vi.fn(),
  getAllFranchiseTeams: vi.fn(),
  getFranchisePlayer: vi.fn(),
  saveFranchisePlayer: vi.fn(),
  getFranchiseConfig: vi.fn(),
  saveFranchiseConfig: vi.fn(),
}));

vi.mock('../franchisePlayerStorage', () => ({
  getAllFranchisePlayers: mocks.getAllFranchisePlayers,
  getAllFranchiseTeams: mocks.getAllFranchiseTeams,
  getFranchisePlayer: mocks.getFranchisePlayer,
  saveFranchisePlayer: mocks.saveFranchisePlayer,
}));

vi.mock('../franchiseManager', () => ({
  getFranchiseConfig: mocks.getFranchiseConfig,
  saveFranchiseConfig: mocks.saveFranchiseConfig,
}));

function player(overrides: Partial<Player> = {}): Player {
  return {
    id: 'player-1',
    firstName: 'Salary',
    lastName: 'System',
    gender: 'M',
    age: 27,
    bats: 'R',
    throws: 'R',
    primaryPosition: 'SS',
    power: 80,
    contact: 80,
    speed: 70,
    fielding: 80,
    arm: 80,
    velocity: 0,
    junk: 0,
    accuracy: 0,
    arsenal: [],
    overallGrade: 'B',
    personality: 'Competitive',
    chemistry: 'Competitive',
    morale: 50,
    mojo: 'Normal',
    fame: 100,
    salary: 1,
    leagueAssignments: [{ leagueId: 'league-1', teamId: 'team-1', rosterStatus: 'MLB' }],
    createdDate: '2026-01-01T00:00:00.000Z',
    lastModified: '2026-01-01T00:00:00.000Z',
    isCustom: false,
    editHistory: [],
    ...overrides,
  };
}

function team(overrides: Partial<Team> = {}): Team {
  return {
    id: 'team-1',
    name: 'Salary Club',
    abbreviation: 'SC',
    location: 'Salary',
    nickname: 'Club',
    colors: { primary: '#111', secondary: '#eee' },
    stadium: 'Salary Field',
    leagueIds: ['league-1'],
    createdDate: '2026-01-01T00:00:00.000Z',
    lastModified: '2026-01-01T00:00:00.000Z',
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
    playerName: 'Salary System',
    valuePosition: 'SS',
    currentTeamId: 'team-1',
    rosterStatus: 'MLB',
    salary: 1,
    contractYears: 2,
    salaryBaselineCalculationVersion: 'old-salary',
    teamSalaryBaseline: 1,
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
      battingWar: 2,
      pitchingWar: null,
      fieldingWar: 0.2,
      baserunningWar: 0.1,
      totalWar: 2.3,
      totalWarSource: 'derived-from-components',
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
      gamesPerTeam: 32,
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
    contractVersion: FRANCHISE_VALUE_INPUT_CONTRACT_VERSION,
    franchiseId: 'franchise-1',
    seasonId: 'season-1',
    statsScopeId: 'season-1',
    seasonNumber: 1,
    generatedAt: 1,
    seasonContext: rows[0]?.seasonContext ?? row().seasonContext,
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

function config(overrides: Partial<StoredFranchiseConfig> = {}): StoredFranchiseConfig {
  const salaryBaseline = {
    calculationVersion: 'old-salary',
    playerCount: 1,
    salariedPlayerCount: 1,
    totalSalary: 1,
    teamPayrolls: { 'team-1': 1 },
  };
  return {
    franchiseId: 'franchise-1',
    createdAt: 1,
    franchiseType: 'single-team',
    league: 'league-1',
    leagueDetails: null,
    season: {
      gamesPerTeam: 32,
      inningsPerGame: 6,
      extraInningsRule: 'standard',
      scheduleType: 'manual',
      allStarGame: false,
      tradeDeadline: false,
      mercyRule: false,
    },
    playoffs: {
      teamsQualifying: 4,
      format: 'bracket',
      seriesLengths: {
        wildCard: '1',
        divisionSeries: '3',
        championship: '3',
        worldSeries: '3',
      },
      homeFieldAdvantage: 'higher-seed',
    },
    teamControl: {},
    controlledTeams: [],
    rulesSnapshot: { useDH: false, inningsPerGame: 6 },
    playoffSetupSnapshot: { teamsQualifying: 4, format: 'bracket' },
    seasonLength: { gamesPerTeam: 32, inningsPerGame: 6, metadataVersion: 'test' },
    schedulePolicy: {
      policy: 'empty-manual-user-supplied',
      generatedSchedulesAllowed: false,
      initialScheduleRows: 0,
      allowedSources: ['manual', 'csv'],
    },
    rosterRequirements: {
      mlbPlayersPerTeam: 22,
      farmPlayersPerTeam: 10,
      validationStatus: 'passed',
      teamCounts: {},
    },
    stadiums: [],
    salaryBaseline,
    handoffContract: {
      version: 'mode1-mode2-v1',
      franchiseType: 'single-team',
      teamControl: { mode: 'single-team', controlledTeams: [] },
      rulesSnapshot: { useDH: false, inningsPerGame: 6 },
      playoffSetupSnapshot: { teamsQualifying: 4, format: 'bracket' },
      seasonLength: { gamesPerTeam: 32, inningsPerGame: 6, metadataVersion: 'test' },
      schedulePolicy: {
        policy: 'empty-manual-user-supplied',
        generatedSchedulesAllowed: false,
        initialScheduleRows: 0,
        allowedSources: ['manual', 'csv'],
      },
      rosterRequirements: {
        mlbPlayersPerTeam: 22,
        farmPlayersPerTeam: 10,
        validationStatus: 'passed',
        teamCounts: {},
      },
      stadiums: [],
      salaryBaseline,
    },
    ...overrides,
  } as StoredFranchiseConfig;
}

describe('franchise salary system persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('upserts scoped current salary values and recalculates team payroll proof', async () => {
    const sourcePlayer = player();
    const sourceTeam = team();
    mocks.getFranchiseConfig.mockResolvedValue(config());
    mocks.getAllFranchiseTeams.mockResolvedValue([sourceTeam]);
    mocks.getAllFranchisePlayers.mockResolvedValue([sourcePlayer]);
    mocks.getFranchisePlayer.mockResolvedValue(sourcePlayer);
    mocks.saveFranchisePlayer.mockImplementation(async (_franchiseId, nextPlayer) => nextPlayer);

    const result = await upsertFranchiseSeasonSalariesFromValueInputReport(report([row()]));
    const savedPlayer = mocks.saveFranchisePlayer.mock.calls[0]?.[1] as Player;
    const savedConfig = mocks.saveFranchiseConfig.mock.calls[0]?.[0] as StoredFranchiseConfig;

    expect(result.persisted).toBe(true);
    expect(result.updatedPlayerCount).toBe(1);
    expect(savedPlayer.salary).toBeGreaterThan(1);
    expect(savedPlayer.salaryCalculationVersion).toBe(FRANCHISE_CURRENT_SALARY_CALCULATION_VERSION);
    expect(savedPlayer.salarySeasonId).toBe('season-1');
    expect(savedPlayer.salaryStatsScopeId).toBe('season-1');
    expect(savedPlayer.salaryFactors).toEqual(expect.objectContaining({
      source: 'multifactor-current-season',
      fameModifier: 1,
      actualWar: 2.3,
      gamesPerSeason: 32,
      inningsPerGame: 6,
    }));
    expect(savedConfig.salaryBaseline.calculationVersion).toBe(FRANCHISE_CURRENT_SALARY_CALCULATION_VERSION);
    expect(savedConfig.salaryBaseline.teamPayrolls['team-1']).toBeCloseTo(savedPlayer.salary);
    expect(savedConfig.handoffContract.salaryBaseline.teamPayrolls['team-1']).toBeCloseTo(savedPlayer.salary);
    expect(result.policies).toEqual(expect.objectContaining({
      salaryValuesPersisted: true,
      teamPayrollPersisted: true,
      fameModifierActive: false,
      trueValueCalculated: false,
      designationFinalizationAllowed: false,
      salaryMatchingActive: false,
      moraleMutationAllowed: false,
      mode3HandoffAllowed: false,
    }));
  });

  test('hidden FARM salary persistence uses public draft context instead of true ratings', async () => {
    const highTrueRatings = player({
      id: 'hidden-high',
      salary: 42,
      power: 99,
      contact: 99,
      speed: 99,
      fielding: 99,
      arm: 99,
      ratingRevealState: 'hidden',
      leagueAssignments: [{ leagueId: 'league-1', teamId: 'team-1', rosterStatus: 'FARM' }],
      prospectProfile: {
        draftRound: 2,
        scoutedGrade: 'B',
        potentialGrade: 'A-',
        trueGrade: 'A',
      },
    } as Partial<Player> & Record<string, unknown>);
    const lowTrueRatings = player({
      id: 'hidden-low',
      salary: 0.5,
      power: 10,
      contact: 10,
      speed: 10,
      fielding: 10,
      arm: 10,
      ratingRevealState: 'hidden',
      leagueAssignments: [{ leagueId: 'league-1', teamId: 'team-1', rosterStatus: 'FARM' }],
      prospectProfile: {
        draftRound: 2,
        scoutedGrade: 'B',
        potentialGrade: 'A-',
        trueGrade: 'D',
      },
    } as Partial<Player> & Record<string, unknown>);
    mocks.getFranchiseConfig.mockResolvedValue(config({
      salaryBaseline: {
        calculationVersion: 'old-salary',
        playerCount: 2,
        salariedPlayerCount: 2,
        totalSalary: 43,
        teamPayrolls: { 'team-1': 43 },
      },
    }));
    mocks.getAllFranchiseTeams.mockResolvedValue([team()]);
    mocks.getAllFranchisePlayers.mockResolvedValue([highTrueRatings, lowTrueRatings]);
    mocks.getFranchisePlayer.mockImplementation(async (_franchiseId, playerId) =>
      playerId === 'hidden-high' ? highTrueRatings : lowTrueRatings,
    );
    mocks.saveFranchisePlayer.mockImplementation(async (_franchiseId, nextPlayer) => nextPlayer);

    await upsertFranchiseSeasonSalariesFromValueInputReport(report([
      row({ playerId: 'hidden-high', rosterStatus: 'FARM', salary: 3999.57 }),
      row({ playerId: 'hidden-low', rosterStatus: 'FARM', salary: 3999.57 }),
    ]));

    const savedSalaries = mocks.saveFranchisePlayer.mock.calls.map((call) => (call[1] as Player).salary);
    const savedFactors = mocks.saveFranchisePlayer.mock.calls.map((call) => (call[1] as Player).salaryFactors);
    const savedHigh = mocks.saveFranchisePlayer.mock.calls[0]?.[1] as Player & { prospectProfile?: Record<string, unknown> };
    expect(savedSalaries).toEqual([3999.57, 3999.57]);
    expect(savedHigh.prospectProfile?.trueGrade).toBe('A');
    expect(savedHigh.salaryFactors).toEqual({
      source: 'hidden-farm-public-context',
      gamesPerSeason: 32,
      inningsPerGame: 6,
    });
    expect(JSON.stringify(savedFactors)).not.toContain('trueGrade');
    expect(JSON.stringify(savedFactors)).not.toContain('99');
  });

  test('missing season metadata skips salary persistence instead of falling back to defaults', async () => {
    const sourcePlayer = player();
    mocks.getFranchiseConfig.mockResolvedValue(config());
    mocks.getAllFranchiseTeams.mockResolvedValue([team()]);
    mocks.getAllFranchisePlayers.mockResolvedValue([sourcePlayer]);
    mocks.getFranchisePlayer.mockResolvedValue(sourcePlayer);

    const result = await upsertFranchiseSeasonSalariesFromValueInputReport(report([
      row({
        seasonContext: {
          ...row().seasonContext,
          gamesPerTeam: null,
          inningsPerGame: null,
          seasonLengthSource: 'missing',
        },
      }),
    ]));

    expect(result.persisted).toBe(false);
    expect(result.updatedPlayerCount).toBe(0);
    expect(result.skippedPlayerCount).toBe(1);
    expect(result.salaryBaseline).toBeNull();
    expect(result.blockers.join(' ')).toMatch(/games-per-team/i);
    expect(result.blockers.join(' ')).toMatch(/innings-per-game/i);
    expect(result.limitations.join(' ')).toMatch(/No current salary or payroll writes occur/i);
    expect(result.policies).toEqual(expect.objectContaining({
      salaryValuesPersisted: false,
      teamPayrollPersisted: false,
      fameModifierActive: false,
      trueValueCalculated: false,
      salaryMatchingActive: false,
      mode3HandoffAllowed: false,
    }));
    expect(mocks.saveFranchisePlayer).not.toHaveBeenCalled();
    expect(mocks.saveFranchiseConfig).not.toHaveBeenCalled();
  });

  test('mixed valid and missing-metadata rows persist only valid scoped salary rows', async () => {
    const valid = player({ id: 'valid-player' });
    const missingMetadata = player({ id: 'missing-metadata-player' });
    mocks.getFranchiseConfig.mockResolvedValue(config({
      salaryBaseline: {
        calculationVersion: 'old-salary',
        playerCount: 2,
        salariedPlayerCount: 2,
        totalSalary: 2,
        teamPayrolls: { 'team-1': 2 },
      },
    }));
    mocks.getAllFranchiseTeams.mockResolvedValue([team()]);
    mocks.getAllFranchisePlayers.mockResolvedValue([valid, missingMetadata]);
    mocks.getFranchisePlayer.mockImplementation(async (_franchiseId, playerId) =>
      playerId === 'valid-player' ? valid : missingMetadata,
    );
    mocks.saveFranchisePlayer.mockImplementation(async (_franchiseId, nextPlayer) => nextPlayer);

    const result = await upsertFranchiseSeasonSalariesFromValueInputReport(report([
      row({ playerId: 'valid-player' }),
      row({
        playerId: 'missing-metadata-player',
        seasonContext: {
          ...row().seasonContext,
          inningsPerGame: null,
          seasonLengthSource: 'missing',
        },
      }),
    ]));

    expect(result.persisted).toBe(true);
    expect(result.updatedPlayerCount).toBe(1);
    expect(result.skippedPlayerCount).toBe(1);
    expect(result.blockers.join(' ')).toMatch(/missing-metadata-player.*innings-per-game/i);
    expect(mocks.saveFranchisePlayer).toHaveBeenCalledTimes(1);
    expect((mocks.saveFranchisePlayer.mock.calls[0][1] as Player).id).toBe('valid-player');
  });

  test('baseline proof includes copied MLB and FARM salaries but not unassigned players', () => {
    const proof = buildFranchiseSalaryBaselineProofFromPlayers('league-1', [team()], [
      player({ id: 'mlb', salary: 4, leagueAssignments: [{ leagueId: 'league-1', teamId: 'team-1', rosterStatus: 'MLB' }] }),
      player({
        id: 'farm',
        salary: 3999.57,
        ratingRevealState: 'hidden',
        leagueAssignments: [{ leagueId: 'league-1', teamId: 'team-1', rosterStatus: 'FARM' }],
        prospectProfile: {
          draftRound: 2,
          scoutedGrade: 'B',
        },
      } as Partial<Player> & Record<string, unknown>),
      player({ id: 'free', salary: 9, leagueAssignments: [{ leagueId: 'league-1', rosterStatus: 'FREE_AGENT' }] }),
    ]);

    expect(proof.playerCount).toBe(3);
    expect(proof.salariedPlayerCount).toBe(3);
    expect(proof.teamPayrolls['team-1']).toBeCloseTo(4003.57, 2);
    expect(proof.totalSalary).toBeCloseTo(4003.57, 2);
  });

  test('missing report scope blocks persistence without writes', async () => {
    const result = await upsertFranchiseSeasonSalariesFromValueInputReport({
      ...report([row()]),
      franchiseId: ' ',
    });

    expect(result.persisted).toBe(false);
    expect(result.blockers.join(' ')).toMatch(/scope/i);
    expect(mocks.saveFranchisePlayer).not.toHaveBeenCalled();
    expect(mocks.saveFranchiseConfig).not.toHaveBeenCalled();
  });
});
