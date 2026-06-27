import 'fake-indexeddb/auto';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import {
  applyFranchiseMoraleEffect,
  clearFranchiseMoraleDatabaseForTests,
  getFranchiseMoraleSnapshot,
  resetFranchiseMoraleDatabaseForTests,
} from '../../../utils/franchiseMoraleState';
import {
  clearFranchiseRandomEventLogDatabaseForTests,
  resetFranchiseRandomEventLogDatabaseForTests,
} from '../../../utils/franchiseRandomEventLogStorage';

const mocks = vi.hoisted(() => ({
  mockUseOffseasonData: vi.fn(),
  mockUseFranchiseDataContext: vi.fn(),
  mockUseSeasonStats: vi.fn(),
  mockGetFranchiseTeam: vi.fn(),
  mockGetFranchisePlayer: vi.fn(),
  mockGetAllFranchisePlayers: vi.fn(),
  mockSaveFranchisePlayer: vi.fn(),
  mockGetFranchiseFarmRoster: vi.fn(),
  mockGetTransactionsByFranchiseSeason: vi.fn(),
  mockGetRecentGames: vi.fn(),
  mockGetGameEvents: vi.fn(),
  mockGetGameFieldingEvents: vi.fn(),
  mockGetAllGamesByFranchise: vi.fn(),
  mockBuildFranchiseValueInputRows: vi.fn(),
  mockBuildFranchiseSalaryLifecycle: vi.fn(),
  mockBuildFranchiseDesignationEligibility: vi.fn(),
  mockGetFranchiseDesignationRows: vi.fn(),
  mockGetFranchiseTrueValueRows: vi.fn(),
  mockSaveFranchiseTeam: vi.fn(),
}));

vi.mock('@/hooks/useOffseasonData', () => ({
  useOffseasonData: mocks.mockUseOffseasonData,
}));

vi.mock('@/app/pages/FranchiseHome', () => ({
  useFranchiseDataContext: mocks.mockUseFranchiseDataContext,
}));

vi.mock('../../../hooks/useSeasonStats', () => ({
  useSeasonStats: mocks.mockUseSeasonStats,
}));

vi.mock('../../../utils/franchisePlayerStorage', () => ({
  getFranchiseTeam: mocks.mockGetFranchiseTeam,
  getFranchisePlayer: mocks.mockGetFranchisePlayer,
  getAllFranchisePlayers: mocks.mockGetAllFranchisePlayers,
  saveFranchisePlayer: mocks.mockSaveFranchisePlayer,
  saveFranchiseTeam: mocks.mockSaveFranchiseTeam,
}));

vi.mock('../../../utils/franchiseFarmStorage', () => ({
  getFranchiseFarmRoster: mocks.mockGetFranchiseFarmRoster,
}));

vi.mock('../../../utils/transactionStorage', () => ({
  getTransactionsByFranchiseSeason: mocks.mockGetTransactionsByFranchiseSeason,
}));

vi.mock('../../../utils/gameStorage', () => ({
  getRecentGames: mocks.mockGetRecentGames,
}));

vi.mock('../../../utils/eventLog', () => ({
  getGameEvents: mocks.mockGetGameEvents,
  getGameFieldingEvents: mocks.mockGetGameFieldingEvents,
}));

vi.mock('../../../utils/scheduleStorage', () => ({
  getAllGamesByFranchise: mocks.mockGetAllGamesByFranchise,
}));

vi.mock('../../../utils/franchiseValueInputs', () => ({
  buildFranchiseValueInputRows: mocks.mockBuildFranchiseValueInputRows,
}));

vi.mock('../../../utils/franchiseSalaryLifecycle', () => ({
  buildFranchiseSalaryLifecycle: mocks.mockBuildFranchiseSalaryLifecycle,
}));

vi.mock('../../../utils/franchiseDesignationEligibility', () => ({
  buildFranchiseDesignationEligibility: mocks.mockBuildFranchiseDesignationEligibility,
}));

vi.mock('../../../utils/franchiseDesignationStorage', () => ({
  getFranchiseDesignationRows: mocks.mockGetFranchiseDesignationRows,
}));

vi.mock('../../../utils/franchiseTrueValueStorage', () => ({
  getFranchiseTrueValueRows: mocks.mockGetFranchiseTrueValueRows,
}));

import { TeamHubContent } from '../../app/components/TeamHubContent';

function franchisePlayer(
  id: string,
  firstName: string,
  lastName: string,
  primaryPosition: string,
  overrides: Record<string, unknown> = {},
) {
  const isPitcher = ['SP', 'RP', 'CP', 'SP/RP', 'P'].includes(primaryPosition);
  return {
    id,
    firstName,
    lastName,
    gender: 'M',
    age: 26,
    bats: 'R',
    throws: 'R',
    primaryPosition,
    secondaryPosition: isPitcher ? 'P' : 'DH',
    power: isPitcher ? 10 : 60,
    contact: isPitcher ? 10 : 60,
    speed: isPitcher ? 20 : 60,
    fielding: 60,
    arm: 60,
    velocity: isPitcher ? 88 : 0,
    junk: isPitcher ? 75 : 0,
    accuracy: isPitcher ? 72 : 0,
    arsenal: isPitcher ? ['4F', 'SL'] : [],
    overallGrade: 'B',
    personality: 'Jolly',
    chemistry: 'Spirited',
    morale: 55,
    mojo: 'Normal',
    fame: 0,
    salary: 3000000,
    leagueAssignments: [{ leagueId: 'league-1', teamId: 'team-1', rosterStatus: 'MLB' }],
    createdDate: '2026-01-01T00:00:00.000Z',
    lastModified: '2026-01-01T00:00:00.000Z',
    isCustom: false,
    ...overrides,
  };
}

function lineupManagerPlayers() {
  return [
    franchisePlayer('batter-1', 'Batter', 'One', 'C'),
    franchisePlayer('batter-2', 'Batter', 'Two', '1B'),
    franchisePlayer('batter-3', 'Batter', 'Three', '2B'),
    franchisePlayer('batter-4', 'Batter', 'Four', 'SS'),
    franchisePlayer('batter-5', 'Batter', 'Five', '3B'),
    franchisePlayer('batter-6', 'Batter', 'Six', 'LF'),
    franchisePlayer('batter-7', 'Batter', 'Seven', 'CF'),
    franchisePlayer('batter-8', 'Batter', 'Eight', 'RF'),
    franchisePlayer('batter-9', 'Batter', 'Nine', 'DH'),
    franchisePlayer('starter-a', 'Starter', 'Alpha', 'SP'),
    franchisePlayer('starter-b', 'Starter', 'Beta', 'SP'),
    franchisePlayer('farm-hidden', 'Farm', 'Hidden', 'CF', {
      leagueAssignments: [{ leagueId: 'league-1', teamId: 'team-1', rosterStatus: 'FARM' }],
    }),
  ];
}

function salaryLifecycleRecord(overrides: Record<string, unknown> = {}) {
  return {
    contractVersion: 'franchise-salary-lifecycle-v1-current-salary',
    franchiseId: 'franchise-1',
    seasonId: 'franchise-1-season-2',
    statsScopeId: 'franchise-1-season-2',
    seasonNumber: 2,
    playerId: 'copied-player',
    playerName: 'Copied Player',
    teamId: 'team-1',
    rosterStatus: 'MLB',
    salary: 3000000,
    contractYears: 2,
    salaryBaselineCalculationVersion: 'franchise-initial-salary-v1-ratings-and-hidden-prospect-safe',
    teamPayrollBaseline: 4000000,
    initialSalaryBaseline: {
      status: 'stable-baseline',
      persistable: true,
      recalculable: true,
      reasons: ['Stored franchise salary is available from the Mode 1 handoff or current salary sync.'],
    },
    teamPayrollBaselineState: {
      status: 'stable-baseline',
      persistable: true,
      recalculable: true,
      reasons: ['Stored team payroll proof is available from the franchise salary baseline.'],
    },
    currentSalaryCalculation: {
      status: 'active',
      persistable: true,
      recalculable: true,
      reasons: ['Current salary calculation uses base ratings, position, age, traits, personality context, neutral fame, and scoped season-stat performance when available.'],
    },
    performanceSalaryMovement: {
      status: 'active',
      persistable: true,
      recalculable: true,
      reasons: ['Performance salary modifier is active from scoped current-season WAR-like stat inputs.'],
    },
    offseasonSalaryRecalculation: {
      status: 'deferred',
      persistable: false,
      recalculable: false,
      reasons: ['Offseason salary recalculation is deferred for internal v1.'],
    },
    persistable: true,
    recalculable: true,
    sourceInputs: {
      salaryBaselineAvailable: true,
      teamPayrollBaselineAvailable: true,
      seasonStatsAvailable: true,
      warPreviewInputAvailable: true,
      wpaAvailable: false,
      trustedFinalWarWpaAvailable: false,
      trueValueAvailable: false,
      parkAdjustedValueInputsAvailable: false,
      luxuryTaxActive: false,
      salaryMatchingActive: false,
      aiTradeValuationActive: false,
    },
    limitations: ['Final True Value salary movement is unavailable in internal v1.'],
    ...overrides,
  };
}

function salaryLifecycleReport(overrides: Record<string, unknown> = {}) {
  const playerRecords = overrides.playerRecords ?? [salaryLifecycleRecord()];
  return {
    contractVersion: 'franchise-salary-lifecycle-v1-current-salary',
    franchiseId: 'franchise-1',
    seasonId: 'franchise-1-season-2',
    statsScopeId: 'franchise-1-season-2',
    seasonNumber: 2,
    valueInputContractVersion: 'franchise-mode2-value-inputs-v1-readonly',
    generatedAt: 1,
    playerRecords,
    teamRecords: [{
      contractVersion: 'franchise-salary-lifecycle-v1-current-salary',
      franchiseId: 'franchise-1',
      seasonId: 'franchise-1-season-2',
      statsScopeId: 'franchise-1-season-2',
      seasonNumber: 2,
      teamId: 'team-1',
      payrollBaseline: 4000000,
      playerCount: 1,
      payrollBaselineState: {
        status: 'stable-baseline',
        persistable: true,
        recalculable: true,
        reasons: ['Stored team payroll proof is available from current franchise salary data.'],
      },
      limitations: [],
    }],
    policies: {
      luxuryTax: { status: 'blocked', active: false, reasons: ['Luxury tax is inactive for Franchise internal v1.'] },
      salaryMatching: { status: 'blocked', active: false, reasons: ['Salary matching for trades is inactive for Franchise internal v1.'] },
      aiTradeSalaryValuation: { status: 'blocked', active: false, reasons: ['AI trade salary valuation is inactive for Franchise internal v1.'] },
    },
    salarySystemSync: null,
    anyPersistable: true,
    anyRecalculable: true,
    limitations: [],
    ...overrides,
  };
}

function valueInputRow(overrides: Record<string, unknown> = {}) {
  return {
    contractVersion: 'franchise-mode2-value-inputs-v1-readonly',
    franchiseId: 'franchise-1',
    seasonId: 'franchise-1-season-2',
    statsScopeId: 'franchise-1-season-2',
    seasonNumber: 2,
    playerId: 'copied-player',
    playerName: 'Copied Player',
    valuePosition: 'SS',
    currentTeamId: 'team-1',
    rosterStatus: 'MLB',
    salary: 3000000,
    contractYears: 2,
    salaryBaselineCalculationVersion: 'franchise-initial-salary-v1-ratings-and-hidden-prospect-safe',
    teamSalaryBaseline: 4000000,
    salaryBaselineAvailable: true,
    seasonStatsAvailability: {
      batting: true,
      pitching: false,
      fielding: true,
      any: true,
    },
    warInputAvailability: {
      battingWar: true,
      pitchingWar: false,
      fieldingWar: true,
      baserunningWar: false,
      any: true,
      trustedForFinalValue: false,
    },
    warPreviewValues: {
      battingWar: 0.2,
      pitchingWar: null,
      fieldingWar: 0.1,
      baserunningWar: null,
      totalWar: 0.3,
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
      seasonId: 'franchise-1-season-2',
      statsScopeId: 'franchise-1-season-2',
      seasonNumber: 2,
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

function valueInputReport(overrides: Record<string, unknown> = {}) {
  const rows = overrides.rows ?? [valueInputRow()];
  return {
    contractVersion: 'franchise-mode2-value-inputs-v1-readonly',
    franchiseId: 'franchise-1',
    seasonId: 'franchise-1-season-2',
    statsScopeId: 'franchise-1-season-2',
    seasonNumber: 2,
    generatedAt: 1,
    seasonContext: valueInputRow().seasonContext,
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
    ...overrides,
  };
}

function designationEligibilityRecord(designationType: string, overrides: Record<string, unknown> = {}) {
  return {
    contractVersion: 'franchise-designation-eligibility-v1-readonly',
    franchiseId: 'franchise-1',
    seasonId: 'franchise-1-season-2',
    statsScopeId: 'franchise-1-season-2',
    seasonNumber: 2,
    playerId: 'copied-player',
    playerName: 'Copied Player',
    teamId: 'team-1',
    rosterStatus: 'MLB',
    designationType,
    status: designationType === 'TEAM_MVP' || designationType === 'ACE' ? 'active' : 'blocked',
    persistable: designationType === 'TEAM_MVP' || designationType === 'ACE',
    reasons: designationType === 'FAN_FAVORITE'
      ? ['FAN_FAVORITE requires canonical True Value and value-delta inputs, which are unavailable in internal v1.']
      : ['Final designation persistence is blocked until trusted final value/designation inputs exist.'],
    limitations: [],
    sourceInputs: {
      salaryBaselineAvailable: true,
      teamSalaryBaselineAvailable: true,
      seasonStatsAvailable: true,
      warPreviewInputAvailable: true,
      pitchingWarPreviewInputAvailable: designationType === 'ACE',
      totalWar: designationType === 'TEAM_MVP' ? 1.6 : null,
      pitchingWar: designationType === 'ACE' ? 1.1 : null,
      teamMvpWarTrusted: designationType === 'TEAM_MVP',
      aceWarTrusted: designationType === 'ACE',
      wpaAvailable: false,
      wpaTrustedForFinalValue: false,
      trueValueAvailable: false,
      moraleAvailable: false,
      relationshipInputsAvailable: false,
      awardInputsFinalized: false,
      seedParkFactorsAvailable: true,
      parkAdjustedValueInputsAvailable: false,
      seasonMetadataAvailable: true,
    },
    ...overrides,
  };
}

function designationEligibilityReport(overrides: Record<string, unknown> = {}) {
  return {
    contractVersion: 'franchise-designation-eligibility-v1-readonly',
    franchiseId: 'franchise-1',
    seasonId: 'franchise-1-season-2',
    statsScopeId: 'franchise-1-season-2',
    seasonNumber: 2,
    valueInputContractVersion: 'franchise-mode2-value-inputs-v1-readonly',
    generatedAt: 1,
    records: [
      designationEligibilityRecord('TEAM_MVP'),
      designationEligibilityRecord('ACE'),
      designationEligibilityRecord('FAN_FAVORITE'),
      designationEligibilityRecord('ALBATROSS', {
        reasons: ['ALBATROSS requires canonical True Value and value-delta inputs, which are unavailable in internal v1.'],
      }),
      designationEligibilityRecord('CAPTAIN', {
        reasons: ['CAPTAIN is deferred because leadership, morale, and relationship inputs are not canonical in internal v1.'],
      }),
      designationEligibilityRecord('FAN_HOPEFUL', {
        reasons: ['FAN_HOPEFUL is deferred because fan, morale, and True Value inputs are not canonical in internal v1.'],
      }),
    ],
    anyPersistable: true,
    limitations: [],
    ...overrides,
  };
}

function projectedDesignationRow(type: string, overrides: Record<string, unknown> = {}) {
  return {
    franchiseId: 'franchise-1',
    seasonId: 'franchise-1-season-2',
    statsScopeId: 'franchise-1-season-2',
    seasonNumber: 2,
    teamId: 'team-1',
    playerId: 'copied-player',
    playerName: 'Copied Player',
    type,
    status: 'projected',
    sourceInputs: {
      peerPoolLimitation: 'EP1 R-8 peer pools use starts-derived effective positions/Reserve; pitchers pool by profile role in v1; two-way holders are valued compositionally with CALIBRATE trait anchors.',
    },
    sourceEvidence: [`MODE_2_CANON §17 ${type} projected fixture.`],
    calculationVersion: 'franchise-designations-v2-projected-canonical',
    calculatedAt: '2026-06-12T00:00:00.000Z',
    lockedAt: null,
    carryover: {
      carriesOver: false,
      untilSeasonProgress: type === 'FAN_FAVORITE' || type === 'ALBATROSS' ? 0.1 : null,
      previousSeasonId: null,
      previousPlayerId: null,
      note: null,
    },
    ...overrides,
  };
}

function projectedDesignationRows(overrides: Record<string, unknown> = {}) {
  return [
    projectedDesignationRow('TEAM_MVP'),
    projectedDesignationRow('ACE'),
    projectedDesignationRow('FAN_FAVORITE'),
    projectedDesignationRow('ALBATROSS'),
  ].map((row) => ({ ...row, ...overrides }));
}

describe('TeamHubContent franchise-owned visible reads', () => {
  beforeEach(async () => {
    resetFranchiseRandomEventLogDatabaseForTests();
    resetFranchiseMoraleDatabaseForTests();
    await clearFranchiseRandomEventLogDatabaseForTests();
    await clearFranchiseMoraleDatabaseForTests();
    vi.clearAllMocks();
    mocks.mockUseOffseasonData.mockReturnValue({
      teams: [{ id: 'team-1', name: 'Mutable Alpha', stadium: 'Mutable Park' }],
      players: [{
        id: 'global-player',
        name: 'Global Template',
        teamId: 'team-1',
        position: 'SS',
        age: 28,
        grade: 'A',
        salary: 9000000,
      }],
      hasRealData: true,
      isLoading: false,
      error: null,
      refresh: vi.fn(),
    });
    mocks.mockUseFranchiseDataContext.mockReturnValue({
      franchiseConfig: {
        franchiseId: 'franchise-1',
        league: 'league-1',
      },
      seasonNumber: 2,
      standings: {},
      teamNameMap: { 'team-1': 'Copied Alpha' },
      stadiumMap: { 'team-1': 'Copied Park' },
    });
    mocks.mockUseSeasonStats.mockReturnValue({
      isLoading: false,
      getBattingLeaders: vi.fn(() => []),
      getPitchingLeaders: vi.fn(() => []),
    });
    mocks.mockGetFranchiseTeam.mockResolvedValue({
      id: 'team-1',
      name: 'Copied Alpha',
      leagueIds: ['league-1'],
      lineupWithDH: [],
      lineupWithoutDH: [{ battingOrder: 1, playerId: 'copied-player', fieldingPosition: 'SS' }],
      startingRotation: [],
      lastModified: '2026-01-01T00:00:00.000Z',
    });
    mocks.mockGetAllFranchisePlayers.mockResolvedValue([
      {
        id: 'copied-player',
        firstName: 'Copied',
        lastName: 'Player',
        gender: 'M',
        age: 26,
        bats: 'R',
        throws: 'R',
        primaryPosition: 'SS',
        secondaryPosition: '2B',
        power: 60,
        contact: 60,
        speed: 70,
        fielding: 80,
        arm: 75,
        velocity: 0,
        junk: 0,
        accuracy: 0,
        arsenal: [],
        overallGrade: 'B+',
        personality: 'Jolly',
        chemistry: 'Spirited',
        morale: 55,
        mojo: 'Normal',
        fame: 0,
        salary: 3000000,
        leagueAssignments: [{ leagueId: 'league-1', teamId: 'team-1', rosterStatus: 'MLB' }],
        createdDate: '2026-01-01T00:00:00.000Z',
        lastModified: '2026-01-01T00:00:00.000Z',
        isCustom: false,
      },
      {
        id: 'farm-player',
        firstName: 'Farm',
        lastName: 'Hidden',
        gender: 'M',
        age: 21,
        bats: 'L',
        throws: 'R',
        primaryPosition: 'CF',
        secondaryPosition: 'OF',
        power: 50,
        contact: 50,
        speed: 80,
        fielding: 60,
        arm: 60,
        velocity: 0,
        junk: 0,
        accuracy: 0,
        arsenal: [],
        overallGrade: 'C',
        personality: 'Jolly',
        chemistry: 'Spirited',
        morale: 50,
        mojo: 'Normal',
        fame: 0,
        salary: 1000000,
        leagueAssignments: [{ leagueId: 'league-1', teamId: 'team-1', rosterStatus: 'FARM' }],
        ratingRevealState: 'hidden',
        prospectProfile: {
          source: 'league-builder-startup-prospect-draft',
          methodVersion: 'league-builder-startup-prospect-scouting-draft-v1',
          draftYear: 1,
          draftRound: 2,
          draftPick: 7,
          teamId: 'team-1',
          trueGrade: 'A',
          scoutedGrade: 'B',
          potentialGrade: 'A-',
          scoutConfidence: 'medium',
        },
        hiddenPersonalityModifiers: {
          loyalty: 92,
          ambition: 12,
        },
        trait1: 'Sprinter',
        createdDate: '2026-01-01T00:00:00.000Z',
        lastModified: '2026-01-01T00:00:00.000Z',
        isCustom: false,
      },
    ]);
    mocks.mockGetFranchiseFarmRoster.mockResolvedValue([
      {
        id: 'franchise-1:franchise-1-season-2:team-1:farm-player',
        franchiseId: 'franchise-1',
        seasonId: 'franchise-1-season-2',
        seasonNumber: 2,
        teamId: 'team-1',
        playerId: 'farm-player',
        rosterLevel: 'AAA',
        rosterStatus: 'FARM',
        optionsUsed: 1,
        optionDates: [],
        ratingRevealState: 'hidden',
        assignedAt: '2026-01-01T00:00:00.000Z',
        lastModified: '2026-01-01T00:00:00.000Z',
      },
    ]);
    mocks.mockGetTransactionsByFranchiseSeason.mockResolvedValue([]);
    mocks.mockGetRecentGames.mockResolvedValue([]);
    mocks.mockGetGameEvents.mockResolvedValue([]);
    mocks.mockGetGameFieldingEvents.mockResolvedValue([]);
    mocks.mockGetAllGamesByFranchise.mockResolvedValue([]);
    mocks.mockBuildFranchiseValueInputRows.mockResolvedValue(valueInputReport());
    mocks.mockBuildFranchiseSalaryLifecycle.mockResolvedValue(salaryLifecycleReport());
    mocks.mockBuildFranchiseDesignationEligibility.mockResolvedValue(designationEligibilityReport());
    mocks.mockGetFranchiseDesignationRows.mockResolvedValue(projectedDesignationRows());
    mocks.mockGetFranchiseTrueValueRows.mockResolvedValue([{ playerId: 'copied-player', valueDelta: -2000 }]);
    mocks.mockSaveFranchiseTeam.mockImplementation(async (_franchiseId: string, team: unknown) => team);
  });

  test('shows copied franchise roster rows and read-only analyzer instead of global/static offseason rows', async () => {
    render(<TeamHubContent />);

    expect(await screen.findAllByText('Copied Alpha')).toHaveLength(2);
    expect(screen.queryByText('Mutable Alpha')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /ROSTER/i }));

    expect(screen.queryByText('G. Template')).not.toBeInTheDocument();
    const mlbTable = screen.getByRole('table', { name: /Franchise roster scan table/i });
    expect(within(mlbTable).getByText('Copied Player')).toBeInTheDocument();
    expect(within(mlbTable).getByText('Farm Hidden')).toBeInTheDocument();
    expect(within(mlbTable).getByText('MORALE')).toBeInTheDocument();
    expect(within(mlbTable).getByText('SALARY')).toBeInTheDocument();
    expect(within(mlbTable).getByText('STATS')).toBeInTheDocument();
    expect(within(mlbTable).getByText('DESIGNATION')).toBeInTheDocument();
    expect(within(mlbTable).queryByText('TRUE VAL')).not.toBeInTheDocument();
    expect(within(mlbTable).queryByText('NET DIFF')).not.toBeInTheDocument();
    expect(screen.getByTestId('franchise-v1-roster-value-gate')).toHaveTextContent(
      'safe salary, morale, stats, and projected canonical designation context only',
    );
    expect(await screen.findByText('READ-ONLY ROSTER ANALYZER')).toBeInTheDocument();
    expect(screen.getByText('MLB 1')).toBeInTheDocument();
    expect(screen.getByText('FARM 1')).toBeInTheDocument();
    expect(screen.getByText(/No call-ups, send-downs, or roster writes are executed here/)).toBeInTheDocument();
    expect(screen.getByText('Farm advisory only')).toBeInTheDocument();
    expect(screen.getAllByText(/Call-up advice: review farm OF coverage|Call-up advice: monitor Farm Hidden/).length).toBeGreaterThan(0);
    expect(mocks.mockGetFranchiseFarmRoster).toHaveBeenCalledWith('franchise-1', 'franchise-1-season-2', 'team-1');
    expect(mocks.mockGetFranchiseTrueValueRows).toHaveBeenCalledWith({
      franchiseId: 'franchise-1',
      seasonId: 'franchise-1-season-2',
      statsScopeId: 'franchise-1-season-2',
      seasonNumber: 2,
    });
    expect(mocks.mockSaveFranchiseTeam).not.toHaveBeenCalled();
  });

  test('roster scan displays salary, neutral morale, safe stats, and projected designation summaries', async () => {
    mocks.mockUseSeasonStats.mockReturnValue({
      isLoading: false,
      getBattingLeaders: vi.fn(() => [{
        playerId: 'copied-player',
        playerName: 'Copied Player',
        teamId: 'team-1',
        avg: 0.321,
        ops: 0.901,
        homeRuns: 7,
        rbi: 21,
        stolenBases: 4,
        bWAR: 1.1,
        rWAR: 0.2,
        fWAR: 0.3,
        totalWAR: 1.6,
      }]),
      getPitchingLeaders: vi.fn(() => []),
    });

    render(<TeamHubContent />);

    fireEvent.click(await screen.findByRole('button', { name: /ROSTER/i }));
    const rosterTable = await screen.findByRole('table', { name: /Franchise roster scan table/i });

    expect(within(rosterTable).getByText('Copied Player')).toBeInTheDocument();
    expect(within(rosterTable).getByText('MLB')).toBeInTheDocument();
    expect(within(rosterTable).getByText('$3.00M')).toBeInTheDocument();
    expect(within(rosterTable).getAllByText('50').length).toBeGreaterThan(0);
    expect(within(rosterTable).getAllByText('Neutral').length).toBeGreaterThan(0);
    expect(within(rosterTable).getByText('1.6 WAR · 7 HR · 21 RBI')).toBeInTheDocument();
    expect(within(rosterTable).getByText('Proj. MVP, Proj. Ace, Proj. Fan Favorite, Proj. Albatross projected')).toBeInTheDocument();
  });

  test('roster scan sorts salary and morale deterministically', async () => {
    await applyFranchiseMoraleEffect({
      franchiseId: 'franchise-1',
      seasonId: 'franchise-1-season-2',
      statsScopeId: 'franchise-1-season-2',
      seasonNumber: 2,
      targetType: 'player',
      playerId: 'copied-player',
      delta: 30,
      reason: 'Test morale sort lift.',
      sourceKind: 'manual-override',
      sourceEventId: 'test-morale-sort',
    });
    render(<TeamHubContent />);

    fireEvent.click(await screen.findByRole('button', { name: /ROSTER/i }));
    const rosterTable = await screen.findByRole('table', { name: /Franchise roster scan table/i });
    const namesInOrder = () => within(rosterTable)
      .getAllByRole('row')
      .slice(1)
      .map((row) => within(row).getAllByRole('button')[0].textContent ?? '');

    fireEvent.click(within(rosterTable).getByRole('columnheader', { name: /SALARY/i }));
    await waitFor(() => expect(namesInOrder()).toEqual(['Farm Hidden', 'Copied Player']));
    fireEvent.click(within(rosterTable).getByRole('columnheader', { name: /SALARY/i }));
    await waitFor(() => expect(namesInOrder()).toEqual(['Copied Player', 'Farm Hidden']));

    fireEvent.click(within(rosterTable).getByRole('columnheader', { name: /MORALE/i }));
    await waitFor(() => expect(namesInOrder()).toEqual(['Farm Hidden', 'Copied Player']));
    fireEvent.click(within(rosterTable).getByRole('columnheader', { name: /MORALE/i }));
    await waitFor(() => expect(namesInOrder()).toEqual(['Copied Player', 'Farm Hidden']));
  });

  test('hidden FARM roster scan row does not leak hidden prospect truth', async () => {
    render(<TeamHubContent />);

    fireEvent.click(await screen.findByRole('button', { name: /ROSTER/i }));
    const rosterTable = await screen.findByRole('table', { name: /Franchise roster scan table/i });
    const farmRow = within(rosterTable).getByText('Farm Hidden').closest('tr');

    expect(farmRow).not.toBeNull();
    expect(within(farmRow as HTMLElement).getByText('FARM')).toBeInTheDocument();
    expect(within(farmRow as HTMLElement).getAllByText('Hidden').length).toBeGreaterThanOrEqual(2);
    expect(within(farmRow as HTMLElement).getByText('$4.0K')).toBeInTheDocument();
    expect(within(farmRow as HTMLElement).getByText('50')).toBeInTheDocument();
    expect(farmRow as HTMLElement).not.toHaveTextContent(/A-|trueGrade|loyalty|92|Sprinter|B scout|scout truth/i);
    expect(within(rosterTable).queryByText(/hiddenPersonalityModifiers/i)).not.toBeInTheDocument();
  });

  test('shows read-only value salary and designation truth labels from lifecycle gates', async () => {
    mocks.mockBuildFranchiseValueInputRows.mockResolvedValue(valueInputReport({
      trustedValueArtifactFrozen: true,
      trueValuePolicy: {
        finalTrueValueCalculated: true,
        persistedTrueValueCreated: true,
      },
    }));

    render(<TeamHubContent />);

    fireEvent.click(await screen.findByRole('button', { name: /ROSTER/i }));
    const truthRegion = await screen.findByRole('region', { name: /Franchise v1 value salary designation truth labels/i });

    expect(within(truthRegion).getByText(/Player salary state: STABLE BASELINE/i)).toBeInTheDocument();
    expect(within(truthRegion).getByText(/Team payroll proof: STABLE BASELINE/i)).toBeInTheDocument();
    expect(within(truthRegion).getByText(/Performance salary formula: ACTIVE/i)).toBeInTheDocument();
    expect(within(truthRegion).getByText(/Offseason salary recalculation: DEFERRED/i)).toBeInTheDocument();
    expect(within(truthRegion).getByText(/True Value \/ value delta: TRUSTED \(frozen artifact; now also feeds Albatross\/Fan Favorite \+ awards\)/i)).toBeInTheDocument();
    expect(within(truthRegion).getByText(/Luxury tax, salary matching, and AI salary valuation: BLOCKED \/ INACTIVE/i)).toBeInTheDocument();
    expect(within(truthRegion).getByText(/Proj. MVP, Proj. Ace, Proj. Fan Favorite, Proj. Albatross canonical projected designation\(s\); season-end locking and carryover remain blocked/i)).toBeInTheDocument();
    expect(within(truthRegion).getByText(/Designation persistence: live engine designation rows can be ACTIVE; non-live rows remain PROJECTED/i)).toBeInTheDocument();
    expect(within(truthRegion).getByText(/Season-end locks, morale effects, and trade discounts remain blocked/i)).toBeInTheDocument();
    expect(within(truthRegion).queryByText(/MVP winner/i)).not.toBeInTheDocument();
    expect(within(truthRegion).queryByText(/Ace winner/i)).not.toBeInTheDocument();
    expect(within(truthRegion).queryByText(/Fan Favorite designation/i)).not.toBeInTheDocument();
    expect(mocks.mockBuildFranchiseSalaryLifecycle).toHaveBeenCalledWith({
      franchiseId: 'franchise-1',
      seasonId: 'franchise-1-season-2',
      statsScopeId: 'franchise-1-season-2',
      seasonNumber: 2,
    }, { syncCurrentSalaries: true });
    expect(mocks.mockBuildFranchiseDesignationEligibility).toHaveBeenCalled();
    expect(mocks.mockSaveFranchiseTeam).not.toHaveBeenCalled();
  });

  test('renders read-only Mode 2 foundation statuses without mutation actions or hidden prospect leakage', async () => {
    mocks.mockGetRecentGames.mockResolvedValueOnce([
      {
        gameId: 'game-archive-1',
        date: 100,
        franchiseId: 'franchise-1',
        seasonId: 'franchise-1-season-2',
        statsScopeId: 'franchise-1-season-2',
        competitionType: 'franchise',
        competitionId: 'franchise-1',
        seasonNumber: 2,
        awayTeamId: 'team-1',
        homeTeamId: 'team-2',
        awayTeamName: 'Copied Alpha',
        homeTeamName: 'Copied Beta',
        finalScore: { away: 4, home: 2 },
        innings: 6,
        totalInnings: 6,
        fameEvents: [{
          id: 'fame-no-hitter-1',
          gameId: 'game-archive-1',
          eventType: 'NO_HITTER',
          playerId: 'pitcher-1',
          playerName: 'Ace One',
          playerTeam: 'team-1',
          fameValue: 5,
          fameType: 'bonus',
          inning: 6,
          halfInning: 'BOTTOM',
          timestamp: 100,
          autoDetected: true,
          description: 'No-hitter',
        }],
        playerStats: {},
        pitcherGameStats: [],
        activityLog: [],
        inningScores: [],
        aggregationStatus: 'aggregated',
      },
      {
        gameId: 'game-archive-2',
        date: 101,
        franchiseId: 'franchise-1',
        seasonId: 'franchise-1-season-2',
        statsScopeId: 'franchise-1-season-2',
        competitionType: 'franchise',
        competitionId: 'franchise-1',
        seasonNumber: 2,
        awayTeamId: 'team-1',
        homeTeamId: 'team-2',
        awayTeamName: 'Copied Alpha',
        homeTeamName: 'Copied Beta',
        finalScore: { away: 3, home: 1 },
        innings: 6,
        totalInnings: 6,
        fameEvents: [],
        playerStats: {},
        pitcherGameStats: [],
        activityLog: [],
        inningScores: [],
        aggregationStatus: 'aggregated',
      },
    ]);
    mocks.mockGetAllGamesByFranchise.mockResolvedValueOnce([{
      id: 'schedule-score-only-1',
      franchiseId: 'franchise-1',
      seasonId: 'franchise-1-season-2',
      statsScopeId: 'franchise-1-season-2',
      seasonNumber: 2,
      gameNumber: 2,
      dayNumber: 2,
      awayTeamId: 'team-1',
      homeTeamId: 'team-2',
      status: 'COMPLETED',
      result: {
        awayScore: 11,
        homeScore: 3,
        winningTeamId: 'team-1',
        losingTeamId: 'team-2',
      },
      completionSource: 'score-only',
      resultEnteredAt: 100,
      scoreOnlyResultId: 'score-only-1',
      createdAt: 1,
      completedAt: 100,
      source: 'manual',
    }]);

    render(<TeamHubContent />);

    fireEvent.click(await screen.findByRole('button', { name: /ROSTER/i }));
    const foundationRegion = await screen.findByRole('region', { name: /Mode 2 Foundation Status/i });
    const randomEventRegion = await screen.findByRole('region', { name: /Franchise random event log preview/i });

    expect(within(foundationRegion).getByText('MODE 2 FOUNDATION STATUS')).toBeInTheDocument();
    expect(within(foundationRegion).getByText('STATS / ARCHIVE / SCOPE')).toBeInTheDocument();
    expect(within(foundationRegion).getByText(/2 scoped archive-backed game\(s\), 1 stat row\(s\)/i)).toBeInTheDocument();
    expect(within(foundationRegion).getByText('VALUE INPUTS')).toBeInTheDocument();
    expect(within(foundationRegion).getByText(/1 canonical player row\(s\)/i)).toBeInTheDocument();
    expect(within(foundationRegion).getByText('SALARY LIFECYCLE')).toBeInTheDocument();
    expect(within(foundationRegion).getByText(/1\/1 current salary row\(s\)/i)).toBeInTheDocument();
    expect(within(foundationRegion).getByText('DESIGNATION ELIGIBILITY')).toBeInTheDocument();
    expect(within(foundationRegion).getByText(/4 projected canonical row\(s\)/i)).toBeInTheDocument();
    expect(within(foundationRegion).getByText('MORALE / RELATIONSHIPS')).toBeInTheDocument();
    expect(within(foundationRegion).getByText(/Morale state changes: BLOCKED/i)).toBeInTheDocument();
    expect(within(foundationRegion).getByText(/Relationship state changes: BLOCKED/i)).toBeInTheDocument();
    expect(within(foundationRegion).getByText(/Narrative\/random event generation: BLOCKED/i)).toBeInTheDocument();
    expect(within(foundationRegion).getByText(/Story persistence: BLOCKED/i)).toBeInTheDocument();
    expect(within(foundationRegion).getByText(/Awards persistence: LIVE \(finalized at season end; effects dormant\)/i)).toBeInTheDocument();
    expect(within(foundationRegion).getByText(/Mode 3\/offseason execution: DEFERRED/i)).toBeInTheDocument();
    expect(within(foundationRegion).getByText(/True ratings, true grade, hidden scout truth, and hidden personality modifiers are not surfaced/i)).toBeInTheDocument();
    const valueWinsRegion = within(foundationRegion).getByRole('region', { name: /Team True Value and Expected Wins/i });
    expect(within(valueWinsRegion).getByText('TRUE VALUE + EXPECTED WINS')).toBeInTheDocument();
    expect(within(valueWinsRegion).getByText('EXPECTED WINS ESTIMATE')).toBeInTheDocument();
    expect(within(valueWinsRegion).getByText('CURRENT SALARY CONTEXT')).toBeInTheDocument();
    expect(within(valueWinsRegion).getByText('NO SALARY MOVEMENT')).toBeInTheDocument();
    expect(within(valueWinsRegion).getByText('Team payroll proof')).toBeInTheDocument();
    expect(within(valueWinsRegion).getByText('$4.00M')).toBeInTheDocument();
    expect(within(valueWinsRegion).getByText('Roster salary sum')).toBeInTheDocument();
    expect(within(valueWinsRegion).getByText('$3.00M')).toBeInTheDocument();
    expect(within(valueWinsRegion).getByText('Current salary rows')).toBeInTheDocument();
    expect(within(valueWinsRegion).getByText('Contract years proof')).toBeInTheDocument();
    expect(within(valueWinsRegion).getAllByText('1/1').length).toBeGreaterThanOrEqual(2);
    expect(within(valueWinsRegion).getByText(/Blocked: .*At least two teams/i)).toBeInTheDocument();
    expect(within(valueWinsRegion).getByText(/Blocked: expected-wins persistence, final True Value handoff authority, salary movement, morale\/relationship mutation, offseason, Mode 3/i)).toBeInTheDocument();
    expect(within(valueWinsRegion).queryByRole('button')).not.toBeInTheDocument();
    expect(within(foundationRegion).queryByText(/hiddenPersonalityModifiers/i)).not.toBeInTheDocument();
    expect(within(foundationRegion).queryByText(/loyalty: 92/i)).not.toBeInTheDocument();
    expect(within(foundationRegion).queryByRole('button')).not.toBeInTheDocument();
    await waitFor(() => expect(within(randomEventRegion).getByText('RANDOM EVENT LOG')).toBeInTheDocument());
    expect(within(randomEventRegion).getByText(/Durable Franchise v1 prompt records/i)).toBeInTheDocument();
    const workflow = within(randomEventRegion).getByLabelText(/Random event manual review workflow/i);
    expect(within(workflow).getByText('1. EVIDENCE')).toBeInTheDocument();
    expect(within(workflow).getByText('2. SAFE EFFECT')).toBeInTheDocument();
    expect(within(workflow).getByText('3. DECISION')).toBeInTheDocument();
    expect(within(workflow).getByText('4. VERIFY')).toBeInTheDocument();
    await waitFor(() => expect(within(randomEventRegion).getByText(/12 durable prompt\(s\) ready for manual review/i)).toBeInTheDocument());
    expect(within(randomEventRegion).queryByText('TEAM_MVP preview recognition candidate')).not.toBeInTheDocument();
    expect(within(randomEventRegion).queryByText('ACE preview recognition candidate')).not.toBeInTheDocument();
    expect(within(randomEventRegion).getAllByText(/Source:/i).length).toBeGreaterThan(0);
    expect(within(randomEventRegion).queryByText(/Fan Favorite negative fan reaction prompt/i)).not.toBeInTheDocument();
    expect(within(randomEventRegion).queryByText(/Albatross relief fan morale prompt/i)).not.toBeInTheDocument();
    expect(within(randomEventRegion).queryByText(/Cornerstone moved fan morale prompt/i)).not.toBeInTheDocument();
    expect(within(randomEventRegion).queryByText(/Fan Hopeful prospect-safe morale prompt/i)).not.toBeInTheDocument();
    expect(within(randomEventRegion).getAllByText('no hitter fan reaction').length).toBeGreaterThan(0);
    expect(within(randomEventRegion).getAllByText('getting no hit fan reaction').length).toBeGreaterThan(0);
    expect(within(randomEventRegion).getAllByText('Archive-backed win fan reaction').length).toBeGreaterThan(0);
    expect(within(randomEventRegion).getAllByText('Archive-backed loss fan reaction').length).toBeGreaterThan(0);
    expect(within(randomEventRegion).getAllByText('Score-only win fan reaction').length).toBeGreaterThan(0);
    expect(within(randomEventRegion).getAllByText('Score-only loss fan reaction').length).toBeGreaterThan(0);
    expect(within(randomEventRegion).getAllByText('blowout win fan reaction').length).toBeGreaterThan(0);
    expect(within(randomEventRegion).getAllByText('blowout loss fan reaction').length).toBeGreaterThan(0);
    expect(within(randomEventRegion).getByText('win streak 3 fan reaction')).toBeInTheDocument();
    expect(within(randomEventRegion).getByText('loss streak 3 fan reaction')).toBeInTheDocument();
    expect(within(randomEventRegion).getAllByText(/GameTracker archive/i).length).toBeGreaterThan(0);
    expect(within(randomEventRegion).getAllByText(/Score-only schedule; confirm team-fan morale only/i).length).toBeGreaterThan(0);
    expect(within(randomEventRegion).getAllByText(/Safe target:/i).length).toBeGreaterThan(0);
    expect(within(randomEventRegion).getAllByText(/Team fan morale target: Copied Alpha/i).length).toBeGreaterThan(0);
    expect(within(randomEventRegion).getAllByText(/Team fan morale target: team-2/i).length).toBeGreaterThan(0);
    expect(within(randomEventRegion).getAllByText(/On confirm: Team fan morale \+1/i).length).toBeGreaterThan(0);
    expect(within(randomEventRegion).getAllByText(/On confirm: Team fan morale -1/i).length).toBeGreaterThan(0);
    expect(within(randomEventRegion).getAllByText(/On confirm: Team fan morale \+2/i).length).toBeGreaterThan(0);
    expect(within(randomEventRegion).getAllByText(/On confirm: Team fan morale -2/i).length).toBeGreaterThan(0);
    expect(within(randomEventRegion).getAllByText(/On confirm: Team fan morale \+5/i).length).toBeGreaterThan(0);
    expect(within(randomEventRegion).getAllByText(/On confirm: Team fan morale -4/i).length).toBeGreaterThan(0);
    expect(within(randomEventRegion).getAllByText(/Manual smoke: after confirm, open Fan Morale and check Event-Backed History/i).length).toBeGreaterThan(0);
    expect(within(randomEventRegion).getAllByText(/Checkbox state: Manual change completed unchecked/i).length).toBeGreaterThan(0);
    expect(within(randomEventRegion).getAllByText(/Score-only evidence has no player archive, player stats, WPA, WAR, player morale, fame, milestones, awards, designations, relationships, or Game Detail archive authority/i).length).toBeGreaterThan(0);
    expect(within(randomEventRegion).getAllByText(/team-fan morale can change only after Random Event Log confirmation/i).length).toBeGreaterThan(0);
    expect(within(randomEventRegion).getByText(/confirmations persist to the random-event log and can apply scoped morale only/i)).toBeInTheDocument();
    expect(within(randomEventRegion).getAllByRole('button', { name: 'CONFIRM' }).length).toBeGreaterThan(0);
    expect(within(randomEventRegion).getAllByRole('button', { name: 'DISMISS' }).length).toBeGreaterThan(0);
    expect(within(randomEventRegion).queryByText(/hiddenPersonalityModifiers/i)).not.toBeInTheDocument();
    expect(within(randomEventRegion).queryByText(/loyalty: 92/i)).not.toBeInTheDocument();
    expect(mocks.mockSaveFranchiseTeam).not.toHaveBeenCalled();
    expect(mocks.mockSaveFranchisePlayer).not.toHaveBeenCalled();

    const noHitterPrompt = within(randomEventRegion).getAllByText('no hitter fan reaction')[0].closest('article');
    expect(noHitterPrompt).toBeTruthy();
    fireEvent.click(within(noHitterPrompt as HTMLElement).getByRole('button', { name: 'CONFIRM' }));
    await waitFor(() => expect(within(randomEventRegion).getByText(/APPLIED:/i)).toBeInTheDocument());

    fireEvent.click(screen.getByRole('button', { name: /FAN MORALE/i }));
    expect(await screen.findByText(/Canonical Franchise v1 morale comes from confirmed random-event/i)).toBeInTheDocument();
    expect(screen.getByText('55')).toBeInTheDocument();
    expect(within(screen.getByRole('region', { name: /Fan morale history/i })).getByText(/EVENT-BACKED HISTORY/i)).toBeInTheDocument();
    const fanSpecRegion = screen.getByRole('region', { name: /Fan morale spec alignment status/i });
    expect(within(fanSpecRegion).getByText(/FAN MORALE SPEC ALIGNMENT/i)).toBeInTheDocument();
    expect(within(fanSpecRegion).getByText(/State: CONTENT/i)).toBeInTheDocument();
    expect(within(fanSpecRegion).getByText(/Trend: RISING/i)).toBeInTheDocument();
    expect(within(fanSpecRegion).getByText(/Risk: SAFE/i)).toBeInTheDocument();
    expect(within(fanSpecRegion).getByText(/Canonical scoped storage: IMPLEMENTED/i)).toBeInTheDocument();
    expect(within(fanSpecRegion).getByText(/Expected wins baseline: PARTIAL/i)).toBeInTheDocument();
    expect(within(fanSpecRegion).getByText(/Roster composition formula: DEFERRED/i)).toBeInTheDocument();
    expect(within(fanSpecRegion).getByText(/Random-event weighting: PARTIAL/i)).toBeInTheDocument();
    expect(within(fanSpecRegion).getByText(/True Value inputs: BLOCKED/i)).toBeInTheDocument();
    expect(within(fanSpecRegion).getByText(/Beat reporter sentiment: BLOCKED/i)).toBeInTheDocument();
    expect(within(fanSpecRegion).getByText(/Free-agency consequences: DEFERRED/i)).toBeInTheDocument();
    expect(within(fanSpecRegion).getByText(/Daily snapshots \/ high-low-average summaries: IMPLEMENTED/i)).toBeInTheDocument();
    expect(within(fanSpecRegion).getByText(/Player morale influence\/coupling: DEFERRED/i)).toBeInTheDocument();
    expect(within(fanSpecRegion).queryByRole('button')).not.toBeInTheDocument();
  });

  test('shows selected-team payroll baseline and roster salary sum consistently with roster rows', async () => {
    mocks.mockBuildFranchiseSalaryLifecycle.mockResolvedValueOnce(salaryLifecycleReport({
      playerRecords: [
        salaryLifecycleRecord(),
        salaryLifecycleRecord({
          playerId: 'farm-hidden',
          playerName: 'Farm Hidden',
          rosterStatus: 'FARM',
          salary: 3999.57,
        }),
      ],
      teamRecords: [{
        contractVersion: 'franchise-salary-lifecycle-v1-readonly',
        franchiseId: 'franchise-1',
        seasonId: 'franchise-1-season-2',
        statsScopeId: 'franchise-1-season-2',
        seasonNumber: 2,
        teamId: 'team-1',
        payrollBaseline: 3003999.57,
        playerCount: 2,
        payrollBaselineState: {
          status: 'stable-baseline',
          persistable: false,
          recalculable: false,
          reasons: ['Stored team payroll baseline is available from the franchise handoff.'],
        },
        limitations: [],
      }],
    }));

    render(<TeamHubContent />);

    fireEvent.click(await screen.findByRole('button', { name: /ROSTER/i }));
    const rosterTable = await screen.findByRole('table', { name: /Franchise roster scan table/i });
    const valueWinsRegion = await screen.findByRole('region', { name: /Team True Value and Expected Wins/i });

    expect(within(rosterTable).getByText('$3.00M')).toBeInTheDocument();
    expect(within(rosterTable).getByText('$4.0K')).toBeInTheDocument();
    expect(within(valueWinsRegion).getByText('Team payroll proof')).toBeInTheDocument();
    expect(within(valueWinsRegion).getAllByText('$3.00M').length).toBeGreaterThanOrEqual(2);
    expect(within(valueWinsRegion).getByText('Roster salary sum')).toBeInTheDocument();
    expect(within(valueWinsRegion).getByText('MATCHES PAYROLL BASELINE')).toBeInTheDocument();
    expect(within(valueWinsRegion).getByText('Current salary rows')).toBeInTheDocument();
    expect(within(valueWinsRegion).getByText('Contract years proof')).toBeInTheDocument();
    expect(within(valueWinsRegion).getAllByText('2/2').length).toBeGreaterThanOrEqual(2);
    expect(within(valueWinsRegion).queryByText(/Salary blocker/i)).not.toBeInTheDocument();
  });

  test('does not treat stable salary baseline as contract-years proof when contract years are missing', async () => {
    mocks.mockBuildFranchiseSalaryLifecycle.mockResolvedValueOnce(salaryLifecycleReport({
      playerRecords: [
        salaryLifecycleRecord({
          playerId: 'stable-no-contract-years',
          playerName: 'Stable No Contract Years',
          contractYears: null,
          initialSalaryBaseline: {
            status: 'stable-baseline',
            persistable: false,
            recalculable: false,
            reasons: ['Stored franchise salary baseline is available from the Mode 1 handoff/franchise copy.'],
          },
        }),
      ],
    }));

    render(<TeamHubContent />);

    fireEvent.click(await screen.findByRole('button', { name: /ROSTER/i }));
    const valueWinsRegion = await screen.findByRole('region', { name: /Team True Value and Expected Wins/i });

    expect(within(valueWinsRegion).getByText('Current salary rows')).toBeInTheDocument();
    expect(within(valueWinsRegion).getByText('1/1')).toBeInTheDocument();
    expect(within(valueWinsRegion).getByText('Contract years proof')).toBeInTheDocument();
    expect(within(valueWinsRegion).getByText('0/1')).toBeInTheDocument();
    expect(within(valueWinsRegion).queryByText('Stable contracts')).not.toBeInTheDocument();
    expect(valueWinsRegion).toHaveTextContent(/Salary blocker:/i);
    expect(valueWinsRegion).toHaveTextContent(/Contract years missing for 1 salary row/i);
    expect(mocks.mockSaveFranchiseTeam).not.toHaveBeenCalled();
    expect(mocks.mockSaveFranchisePlayer).not.toHaveBeenCalled();
  });

  test('manual fan morale adjustment writes scoped team fan morale history without unrelated mutation', async () => {
    render(<TeamHubContent />);

    fireEvent.click(await screen.findByRole('button', { name: /FAN MORALE/i }));
    const selectedTeamRegion = await screen.findByRole('region', { name: /Selected team fan morale/i });
    const beforeSnapshot = await getFranchiseMoraleSnapshot({
      franchiseId: 'franchise-1',
      seasonId: 'franchise-1-season-2',
      statsScopeId: 'franchise-1-season-2',
    }, 'team-fan', 'team-1');
    const beforeValue = beforeSnapshot?.currentValue ?? 50;
    expect(within(selectedTeamRegion).getByText(String(beforeValue))).toBeInTheDocument();
    const manualRegion = screen.getByRole('region', { name: /MANUAL FAN MORALE ADJUSTMENT manual adjustment/i });
    fireEvent.change(within(manualRegion).getByLabelText(/Fan morale delta/i), { target: { value: '4' } });
    fireEvent.change(within(manualRegion).getByLabelText(/Fan morale reason/i), { target: { value: 'Manual fan sentiment note.' } });
    fireEvent.click(within(manualRegion).getByRole('button', { name: 'APPLY' }));

    const afterValue = Math.min(99, beforeValue + 4);
    await waitFor(() => expect(within(manualRegion).getByText(new RegExp(`Manual morale adjustment applied: ${beforeValue} → ${afterValue} \\(\\+4\\)`, 'i'))).toBeInTheDocument());
    await waitFor(() => expect(within(selectedTeamRegion).getByText(String(afterValue))).toBeInTheDocument());
    const historyRegion = screen.getByRole('region', { name: /Fan morale history/i });
    expect(within(historyRegion).getByText(/Manual fan sentiment note/i)).toBeInTheDocument();

    const snapshot = await getFranchiseMoraleSnapshot({
      franchiseId: 'franchise-1',
      seasonId: 'franchise-1-season-2',
      statsScopeId: 'franchise-1-season-2',
    }, 'team-fan', 'team-1');
    expect(snapshot?.currentValue).toBe(afterValue);
    expect(snapshot?.history[0]?.sourceKind).toBe('manual-override');
    expect(mocks.mockSaveFranchisePlayer).not.toHaveBeenCalled();
    expect(mocks.mockSaveFranchiseTeam).not.toHaveBeenCalled();
  });

  test('renders team True Value and expected wins preview when peer inputs are available', async () => {
    mocks.mockUseFranchiseDataContext.mockReturnValue({
      franchiseConfig: {
        franchiseId: 'franchise-1',
        league: 'league-1',
      },
      seasonNumber: 2,
      standings: {},
      teamNameMap: { 'team-1': 'Copied Alpha', 'team-2': 'Copied Beta' },
      stadiumMap: { 'team-1': 'Copied Park', 'team-2': 'Beta Park' },
    });
    mocks.mockBuildFranchiseValueInputRows.mockResolvedValue(valueInputReport({
      trueValuePolicy: {
        finalTrueValueCalculated: true,
        persistedTrueValueCreated: true,
      },
      rows: [
        valueInputRow({
          playerId: 'team-1-high-war-low-salary',
          playerName: 'High WAR Low Salary',
          currentTeamId: 'team-1',
          salary: 2,
          teamSalaryBaseline: 2,
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
        valueInputRow({
          playerId: 'team-2-low-war-high-salary',
          playerName: 'Low WAR High Salary',
          currentTeamId: 'team-2',
          salary: 10,
          teamSalaryBaseline: 10,
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
      ],
    }));

    render(<TeamHubContent />);

    fireEvent.click(await screen.findByRole('button', { name: /ROSTER/i }));
    const valueWinsRegion = await screen.findByRole('region', { name: /Team True Value and Expected Wins/i });

    expect(within(valueWinsRegion).getByText('TRUE VALUE PROJECTED')).toBeInTheDocument();
    expect(within(valueWinsRegion).getByText('PROJECTED')).toBeInTheDocument();
    expect(within(valueWinsRegion).getByText('EXPECTED WINS ESTIMATE')).toBeInTheDocument();
    expect(within(valueWinsRegion).getByText('CURRENT SALARY CONTEXT')).toBeInTheDocument();
    expect(within(valueWinsRegion).getByText('NO SALARY MOVEMENT')).toBeInTheDocument();
    expect(within(valueWinsRegion).getByText('Copied Alpha')).toBeInTheDocument();
    expect(within(valueWinsRegion).getByText('Team salary total')).toBeInTheDocument();
    expect(within(valueWinsRegion).getByText('2.0')).toBeInTheDocument();
    expect(within(valueWinsRegion).getByText('Value total')).toBeInTheDocument();
    expect(within(valueWinsRegion).getByText('10.0')).toBeInTheDocument();
    expect(within(valueWinsRegion).getByText('Value delta')).toBeInTheDocument();
    expect(within(valueWinsRegion).getByText('8.0')).toBeInTheDocument();
    expect(within(valueWinsRegion).getByText('Expected wins estimate')).toBeInTheDocument();
    expect(within(valueWinsRegion).getByText('12.0')).toBeInTheDocument();
    expect(within(valueWinsRegion).getByText(/League average value baseline: 10.0/i)).toBeInTheDocument();
    expect(within(valueWinsRegion).getByText(/Blocked: expected-wins persistence, final True Value handoff authority, salary movement, morale\/relationship mutation, offseason, Mode 3/i)).toBeInTheDocument();
    expect(within(valueWinsRegion).queryByText(/Blocked: At least two teams/i)).not.toBeInTheDocument();
    expect(within(valueWinsRegion).queryByRole('button')).not.toBeInTheDocument();
    expect(mocks.mockSaveFranchisePlayer).not.toHaveBeenCalled();
    expect(mocks.mockSaveFranchiseTeam).not.toHaveBeenCalled();
  });

  test('confirms generated archive-backed player prompts as player morale instead of selected-team fan morale', async () => {
    mocks.mockGetRecentGames.mockResolvedValueOnce([{
      gameId: 'game-player-prompt-1',
      date: 100,
      franchiseId: 'franchise-1',
      seasonId: 'franchise-1-season-2',
      statsScopeId: 'franchise-1-season-2',
      competitionType: 'franchise',
      competitionId: 'franchise-1',
      seasonNumber: 2,
      awayTeamId: 'team-1',
      homeTeamId: 'team-2',
      awayTeamName: 'Copied Alpha',
      homeTeamName: 'Copied Beta',
      finalScore: { away: 4, home: 2 },
      innings: 6,
      totalInnings: 6,
      fameEvents: [],
      playerStats: {
        'copied-player': {
          playerName: 'Copied Player',
          teamId: 'team-1',
        },
      },
      pitcherGameStats: [],
      activityLog: [],
      inningScores: [],
      aggregationStatus: 'aggregated',
    }]);

    render(<TeamHubContent />);

    fireEvent.click(await screen.findByRole('button', { name: /ROSTER/i }));
    const randomEventRegion = await screen.findByRole('region', { name: /Franchise random event log preview/i });
    await waitFor(() => expect(within(randomEventRegion).getByText('Archive-backed revealed player morale prompt')).toBeInTheDocument());
    const playerPromptArticle = within(randomEventRegion)
      .getByText('Archive-backed revealed player morale prompt')
      .closest('article');
    expect(playerPromptArticle).not.toBeNull();
    expect(within(playerPromptArticle as HTMLElement).getByText(/Player morale \+1/i)).toBeInTheDocument();
    expect(playerPromptArticle as HTMLElement).toHaveTextContent(/Source:\s*GameTracker archive/i);
    expect(playerPromptArticle as HTMLElement).toHaveTextContent(/Safe target:\s*Player morale target: copied-player/i);
    expect(within(playerPromptArticle as HTMLElement).getByText(/Manual smoke: after confirm, open the player profile and check Player Morale History/i)).toBeInTheDocument();
    const scope = {
      franchiseId: 'franchise-1',
      seasonId: 'franchise-1-season-2',
      statsScopeId: 'franchise-1-season-2',
      seasonNumber: 2,
    };
    const teamSnapshotBefore = await getFranchiseMoraleSnapshot(scope, 'team-fan', 'team-1');

    fireEvent.click(within(playerPromptArticle as HTMLElement).getByRole('button', { name: 'CONFIRM' }));
    await waitFor(() =>
      expect(within(playerPromptArticle as HTMLElement).getByText(/APPLIED: Copied Player has archive-backed player stat evidence/i)).toBeInTheDocument(),
    );

    const playerSnapshot = await getFranchiseMoraleSnapshot(scope, 'player', 'copied-player');
    const teamSnapshot = await getFranchiseMoraleSnapshot(scope, 'team-fan', 'team-1');

    expect(playerSnapshot?.currentValue).toBe(51);
    expect(teamSnapshot?.currentValue ?? 50).toBe(teamSnapshotBefore?.currentValue ?? 50);
    expect(teamSnapshot?.history.length ?? 0).toBe(teamSnapshotBefore?.history.length ?? 0);
  });

  test('renders read-only stadium foundation and archive-backed spray evidence', async () => {
    mocks.mockUseFranchiseDataContext.mockReturnValue({
      franchiseConfig: {
        franchiseId: 'franchise-1',
        league: 'league-1',
      },
      seasonNumber: 2,
      standings: {},
      teamNameMap: { 'team-1': 'Copied Alpha' },
      stadiumMap: { 'team-1': 'Apple Field' },
    });
    const parkFactors = {
      stadiumId: 'apple-field',
      stadiumName: 'Apple Field',
      overall: 1.02,
      runs: 1.01,
      homeRuns: 0.99,
      hits: 1,
      doubles: 1,
      triples: 1,
      strikeouts: 1,
      walks: 1,
      leftHandedHR: 1,
      rightHandedHR: 1,
      leftHandedAVG: 1,
      rightHandedAVG: 1,
      gamesIncluded: 0,
      lastUpdated: 'seed',
      confidence: 'LOW',
      source: 'SEED',
    };
    mocks.mockGetRecentGames.mockResolvedValueOnce([{
      gameId: 'game-archive-1',
      date: 100,
      franchiseId: 'franchise-1',
      seasonId: 'franchise-1-season-2',
      statsScopeId: 'franchise-1-season-2',
      competitionType: 'franchise',
      competitionId: 'franchise-1',
      seasonNumber: 2,
      awayTeamId: 'team-2',
      homeTeamId: 'team-1',
      awayTeamName: 'Copied Beta',
      homeTeamName: 'Copied Alpha',
      stadiumName: 'Apple Field',
      stadiumId: 'apple-field',
      parkFactors,
      finalScore: { away: 4, home: 2 },
      innings: 6,
      totalInnings: 6,
      fameEvents: [],
      playerStats: {},
      pitcherGameStats: [],
      activityLog: [],
      inningScores: [],
      aggregationStatus: 'aggregated',
    }]);
    mocks.mockGetGameEvents.mockResolvedValueOnce([{
      eventId: 'game-archive-1-1',
      gameId: 'game-archive-1',
      eventIndex: 1,
      timestamp: 101,
      batterId: 'batter-1',
      batterName: 'Batter One',
      batterTeamId: 'team-2',
      pitcherId: 'pitcher-1',
      pitcherName: 'Pitcher One',
      pitcherTeamId: 'team-1',
      result: '1B',
      rbiCount: 0,
      runsScored: [],
      inning: 1,
      halfInning: 'TOP',
      outs: 0,
      runners: { first: null, second: null, third: null },
      awayScore: 0,
      homeScore: 0,
      outsAfter: 0,
      runnersAfter: { first: null, second: null, third: null },
      awayScoreAfter: 0,
      homeScoreAfter: 0,
      leverageIndex: 1,
      winProbabilityBefore: 0.5,
      winProbabilityAfter: 0.48,
      wpa: 0.02,
      ballInPlay: {
        trajectory: 'line',
        zone: 0,
        velocity: 'hard',
        fielderIds: ['fielder-1'],
        primaryFielderId: 'fielder-1',
      },
      fameEvents: [],
      isLeadoff: true,
      isClutch: false,
      isWalkOff: false,
      franchiseId: 'franchise-1',
      seasonId: 'franchise-1-season-2',
      statsScopeId: 'franchise-1-season-2',
      seasonNumber: 2,
      parkContext: {
        stadiumId: 'Apple Field',
        stadiumName: 'Apple Field',
        parkFactors,
      },
      teamContext: {
        battingTeam: { teamId: 'team-2', teamName: 'Copied Beta' },
        fieldingTeam: { teamId: 'team-1', teamName: 'Copied Alpha' },
      },
      batterContext: {
        playerId: 'batter-1',
        playerName: 'Batter One',
        handedness: 'R',
      },
      pitcherContext: {
        playerId: 'pitcher-1',
        playerName: 'Pitcher One',
        handedness: 'L',
      },
      enrichment: {
        fieldLocation: { x: 74, y: 48, zone: 'Z05' },
        exitType: 'line_drive',
      },
    }, {
      eventId: 'wrong-scope-1',
      gameId: 'wrong-scope-game',
      eventIndex: 1,
      timestamp: 201,
      batterId: 'wrong-scope-batter',
      batterName: 'Wrong Scope Batter',
      batterTeamId: 'team-2',
      pitcherId: 'wrong-scope-pitcher',
      pitcherName: 'Wrong Scope Pitcher',
      pitcherTeamId: 'team-1',
      result: 'HR',
      rbiCount: 0,
      runsScored: [],
      inning: 1,
      halfInning: 'TOP',
      outs: 0,
      runners: { first: null, second: null, third: null },
      awayScore: 0,
      homeScore: 0,
      outsAfter: 0,
      runnersAfter: { first: null, second: null, third: null },
      awayScoreAfter: 0,
      homeScoreAfter: 0,
      leverageIndex: 1,
      winProbabilityBefore: 0.5,
      winProbabilityAfter: 0.48,
      wpa: 0.02,
      ballInPlay: {
        trajectory: 'fly',
        zone: 0,
        velocity: 'hard',
        fielderIds: ['wrong-scope-fielder'],
        primaryFielderId: 'wrong-scope-fielder',
      },
      fameEvents: [],
      isLeadoff: true,
      isClutch: false,
      isWalkOff: false,
      franchiseId: 'other-franchise',
      seasonId: 'other-season',
      statsScopeId: 'other-season',
      seasonNumber: 2,
      parkContext: {
        stadiumId: 'apple-field',
        stadiumName: 'Apple Field',
        parkFactors,
      },
      teamContext: {
        battingTeam: { teamId: 'team-2', teamName: 'Copied Beta' },
        fieldingTeam: { teamId: 'team-1', teamName: 'Copied Alpha' },
      },
      batterContext: {
        playerId: 'wrong-scope-batter',
        playerName: 'Wrong Scope Batter',
        handedness: 'L',
      },
      pitcherContext: {
        playerId: 'wrong-scope-pitcher',
        playerName: 'Wrong Scope Pitcher',
        handedness: 'R',
      },
      enrichment: {
        fieldLocation: { x: 30, y: 30, zone: 'Z03' },
        exitType: 'fly_ball',
      },
    }]);
    mocks.mockGetGameFieldingEvents.mockResolvedValueOnce([
      {
        fieldingEventId: 'fielding-1',
        gameId: 'game-archive-1',
        atBatEventId: 'game-archive-1-1',
        sequence: 0,
        playerId: 'fielder-1',
        playerName: 'Fielder One',
        position: 'RF',
        teamId: 'team-1',
        playType: 'putout',
        difficulty: 'routine',
        ballInPlay: {
          trajectory: 'fly',
          zone: 5,
          velocity: 'medium',
          fielderIds: ['fielder-1'],
          primaryFielderId: 'fielder-1',
        },
        success: true,
        runsPreventedOrAllowed: 0,
      },
      {
        fieldingEventId: 'orphan-fielding',
        gameId: 'game-archive-1',
        atBatEventId: 'missing-at-bat',
        sequence: 1,
        playerId: 'orphan-fielder',
        playerName: 'Orphan Fielder',
        position: 'CF',
        teamId: 'team-1',
        playType: 'assist',
        difficulty: 'routine',
        ballInPlay: {
          trajectory: 'ground',
          zone: 4,
          velocity: 'medium',
          fielderIds: ['orphan-fielder'],
          primaryFielderId: 'orphan-fielder',
        },
        success: true,
        runsPreventedOrAllowed: 0,
      },
    ]);

    render(<TeamHubContent />);

    fireEvent.click(await screen.findByRole('button', { name: /STADIUM/i }));
    const stadiumRegion = await screen.findByRole('region', { name: /Franchise stadium foundation/i });

    expect(within(stadiumRegion).getByText('STADIUM FOUNDATION')).toBeInTheDocument();
    expect(within(stadiumRegion).getAllByText('Apple Field').length).toBeGreaterThan(0);
    expect(within(stadiumRegion).getByText('SOURCE OF TRUTH')).toBeInTheDocument();
    expect(within(stadiumRegion).getByText(/Copied from Mode 1\/League Builder/i)).toBeInTheDocument();
    expect(within(stadiumRegion).getByText('Mode 2 copy')).toBeInTheDocument();
    expect(within(stadiumRegion).getByText('SMB4 dimensions matched')).toBeInTheDocument();
    expect(within(stadiumRegion).getByText('Seed factors trusted')).toBeInTheDocument();
    expect(within(stadiumRegion).getByText('Custom dimensions blocked')).toBeInTheDocument();
    expect(within(stadiumRegion).getByText('SEED / STATIC FACTORS')).toBeInTheDocument();
    expect(within(stadiumRegion).getByText(/Seed park factors are trusted as v1 stadium inputs/i)).toBeInTheDocument();
    expect(within(stadiumRegion).getByText('ADAPTIVE FACTORS')).toBeInTheDocument();
    expect(within(stadiumRegion).getByText(/1 scoped archive game\(s\). Preview-only; not persisted/i)).toBeInTheDocument();
    expect(within(stadiumRegion).getByText('LF 337')).toBeInTheDocument();
    expect(within(stadiumRegion).getByText('CF 419')).toBeInTheDocument();
    expect(within(stadiumRegion).getByText('RF 347')).toBeInTheDocument();
    expect(within(stadiumRegion).getByText(/Archive rows: 1. Spray rows: 3/i)).toBeInTheDocument();
    expect(within(stadiumRegion).getByText(/3 selected-stadium row\(s\): batting 1, pitching 1, fielding 1/i)).toBeInTheDocument();
    expect(within(stadiumRegion).getByText('SPRAY CHART')).toBeInTheDocument();
    expect(within(stadiumRegion).getByText(/Graphic plot from scoped completed-game spray evidence/i)).toBeInTheDocument();
    expect(within(stadiumRegion).getByTestId('team-hub-stadium-spray-chart')).toBeInTheDocument();
    expect(within(stadiumRegion).getAllByTestId('spray-point-batting')).toHaveLength(1);
    expect(within(stadiumRegion).getAllByTestId('spray-point-pitching')).toHaveLength(1);
    expect(within(stadiumRegion).getAllByTestId('spray-point-fielding')).toHaveLength(1);
    expect(within(stadiumRegion).getByText('EVIDENCE FILTERS')).toBeInTheDocument();
    expect(within(stadiumRegion).getByTestId('spray-scope-filter-summary')).toHaveTextContent('Franchise franchise-1');
    expect(within(stadiumRegion).getByTestId('spray-scope-filter-summary')).toHaveTextContent('Season franchise-1-season-2');
    expect(within(stadiumRegion).getByTestId('spray-scope-filter-summary')).toHaveTextContent('Stats franchise-1-season-2');
    expect(within(stadiumRegion).getByRole('combobox', { name: /Spray stadium filter/i })).toBeInTheDocument();
    expect(within(stadiumRegion).getByRole('combobox', { name: /Spray sort filter/i })).toHaveTextContent('Frequency');
    expect(within(stadiumRegion).getByText('STADIUM STATS / ADVANCED METRICS')).toBeInTheDocument();
    expect(within(stadiumRegion).getAllByText('STADIUM RECORDS').length).toBeGreaterThan(0);
    expect(within(stadiumRegion).getByText('SPRAY EVIDENCE DETAILS')).toBeInTheDocument();
    expect(within(stadiumRegion).getByText(/Compact audit list for the plotted evidence above/i)).toBeInTheDocument();
    expect(within(stadiumRegion).getByText(/3 POINT\(S\) · READ ONLY/i)).toBeInTheDocument();
    expect(within(stadiumRegion).getByText(/3 ROW\(S\) · READ ONLY/i)).toBeInTheDocument();
    expect(within(stadiumRegion).getByText('Batter One')).toBeInTheDocument();
    expect(within(stadiumRegion).getByText('Pitcher One')).toBeInTheDocument();
    expect(within(stadiumRegion).getByText('Fielder One')).toBeInTheDocument();
    expect(within(stadiumRegion).getAllByText(/1B · Shallow RF · oppo \/ shallow · Hand R/i).length).toBeGreaterThan(0);
    expect(within(stadiumRegion).getAllByText(/Source game game-archive-1 · Evidence game-archive-1-1 · Source at-bat-event/i).length).toBeGreaterThan(0);
    expect(within(stadiumRegion).getByText(/Source game game-archive-1 · Evidence fielding-1 · Source fielding-event/i)).toBeInTheDocument();
    expect(within(stadiumRegion).queryByText('Wrong Scope Batter')).not.toBeInTheDocument();
    expect(within(stadiumRegion).queryByText('Orphan Fielder')).not.toBeInTheDocument();
    expect(within(stadiumRegion).queryByText(/hiddenPersonalityModifiers|trueGrade|hidden scout truth/i)).not.toBeInTheDocument();

    fireEvent.change(within(stadiumRegion).getByRole('combobox', { name: /Spray stadium filter/i }), {
      target: { value: 'all' },
    });
    expect(within(stadiumRegion).getByText(/3 ROW\(S\) · READ ONLY/i)).toBeInTheDocument();

    fireEvent.change(within(stadiumRegion).getByRole('combobox', { name: /Spray player filter/i }), {
      target: { value: 'pitcher-1' },
    });
    let filteredArticles = within(stadiumRegion).getAllByRole('article');
    expect(filteredArticles).toHaveLength(1);
    expect(within(filteredArticles[0]).getByText('Pitcher One')).toBeInTheDocument();
    expect(filteredArticles[0]).not.toHaveTextContent('Batter One');

    fireEvent.change(within(stadiumRegion).getByRole('combobox', { name: /Spray player filter/i }), {
      target: { value: 'all' },
    });
    fireEvent.change(within(stadiumRegion).getByRole('combobox', { name: /Spray team filter/i }), {
      target: { value: 'team-1' },
    });
    filteredArticles = within(stadiumRegion).getAllByRole('article');
    expect(filteredArticles).toHaveLength(2);
    expect(filteredArticles.map((article) => article.textContent ?? '').join(' ')).toContain('Pitcher One');
    expect(filteredArticles.map((article) => article.textContent ?? '').join(' ')).toContain('Fielder One');

    fireEvent.change(within(stadiumRegion).getByRole('combobox', { name: /Spray team filter/i }), {
      target: { value: 'all' },
    });
    fireEvent.change(within(stadiumRegion).getByRole('combobox', { name: /Spray hand filter/i }), {
      target: { value: 'R' },
    });
    expect(within(stadiumRegion).getByText(/3 ROW\(S\) · READ ONLY/i)).toBeInTheDocument();

    fireEvent.change(within(stadiumRegion).getByRole('combobox', { name: /Spray sort filter/i }), {
      target: { value: 'frequency' },
    });
    expect(within(stadiumRegion).getByRole('combobox', { name: /Spray sort filter/i })).toHaveValue('frequency');

    fireEvent.change(within(stadiumRegion).getByRole('combobox', { name: /Spray role filter/i }), {
      target: { value: 'batting' },
    });
    filteredArticles = within(stadiumRegion).getAllByRole('article');
    expect(filteredArticles).toHaveLength(1);
    expect(within(filteredArticles[0]).getByText('Batter One')).toBeInTheDocument();
    expect(filteredArticles[0]).not.toHaveTextContent('Pitcher One');
    expect(filteredArticles[0]).not.toHaveTextContent('Fielder One');
    expect(within(stadiumRegion).getByText(/1 ROW\(S\) · READ ONLY/i)).toBeInTheDocument();
    expect(within(stadiumRegion).getByText(/1 POINT\(S\) · READ ONLY/i)).toBeInTheDocument();
    expect(within(stadiumRegion).getAllByTestId('spray-point-batting')).toHaveLength(1);
    expect(within(stadiumRegion).queryByTestId('spray-point-pitching')).not.toBeInTheDocument();
    expect(within(stadiumRegion).queryByTestId('spray-point-fielding')).not.toBeInTheDocument();

    fireEvent.change(within(stadiumRegion).getByRole('combobox', { name: /Spray outcome filter/i }), {
      target: { value: 'putout' },
    });
    expect(within(stadiumRegion).getByText('NO SCOPED SPRAY POINTS')).toBeInTheDocument();
    expect(within(stadiumRegion).getByText(/No spray rows match the current read-only filters/i)).toBeInTheDocument();

    expect(within(stadiumRegion).getByText(/Storage boundary exists. Evidence-only records/i)).toBeInTheDocument();
    expect(within(stadiumRegion).getByText(/writes no stadium records, adaptive factors, random events, morale changes, designations, salary changes, relationship changes, stories, offseason state, or player-profile automation/i)).toBeInTheDocument();
    expect(within(stadiumRegion).queryByRole('button', { name: /generate|persist|confirm|dismiss|save|delete|offseason|mode 3/i })).not.toBeInTheDocument();
    expect(mocks.mockSaveFranchiseTeam).not.toHaveBeenCalled();
    expect(mocks.mockSaveFranchisePlayer).not.toHaveBeenCalled();
  });

  test('renders selected-stadium spray evidence from completed-game archive embedded events when event-log rows are unavailable', async () => {
    mocks.mockUseFranchiseDataContext.mockReturnValue({
      franchiseConfig: {
        franchiseId: 'franchise-1',
        league: 'league-1',
      },
      seasonNumber: 2,
      standings: {},
      teamNameMap: { 'team-1': 'Copied Alpha', 'team-2': 'Copied Beta' },
      stadiumMap: { 'team-1': 'Apple Field' },
    });
    const parkFactors = {
      stadiumId: 'apple-field',
      stadiumName: 'Apple Field',
      overall: 1.02,
      runs: 1.01,
      homeRuns: 0.99,
      hits: 1,
      doubles: 1,
      triples: 1,
      strikeouts: 1,
      walks: 1,
      leftHandedHR: 1,
      rightHandedHR: 1,
      leftHandedAVG: 1,
      rightHandedAVG: 1,
      gamesIncluded: 0,
      lastUpdated: 'seed',
      confidence: 'LOW',
      source: 'SEED',
    };
    mocks.mockGetRecentGames.mockResolvedValueOnce([{
      gameId: 'archive-embedded-spray-1',
      date: 100,
      franchiseId: 'franchise-1',
      seasonId: 'franchise-1-season-2',
      statsScopeId: 'franchise-1-season-2',
      competitionType: 'franchise',
      competitionId: 'franchise-1',
      seasonNumber: 2,
      awayTeamId: 'team-2',
      homeTeamId: 'team-1',
      awayTeamName: 'Copied Beta',
      homeTeamName: 'Copied Alpha',
      stadiumName: 'Apple Field',
      stadiumId: 'apple-field',
      parkFactors,
      finalScore: { away: 4, home: 2 },
      innings: 6,
      totalInnings: 6,
      fameEvents: [],
      playerStats: {},
      pitcherGameStats: [],
      activityLog: [],
      inningScores: [],
      aggregationStatus: 'aggregated',
      atBatEvents: [{
        eventId: 'archive-embedded-spray-1-1',
        gameId: 'archive-embedded-spray-1',
        eventIndex: 1,
        timestamp: 101,
        batterId: 'batter-1',
        batterName: 'Batter One',
        batterTeamId: 'team-2',
        pitcherId: 'pitcher-1',
        pitcherName: 'Pitcher One',
        pitcherTeamId: 'team-1',
        result: '1B',
        rbiCount: 0,
        runsScored: [],
        inning: 1,
        halfInning: 'TOP',
        outs: 0,
        runners: { first: null, second: null, third: null },
        awayScore: 0,
        homeScore: 0,
        outsAfter: 0,
        runnersAfter: { first: null, second: null, third: null },
        awayScoreAfter: 0,
        homeScoreAfter: 0,
        leverageIndex: 1,
        winProbabilityBefore: 0.5,
        winProbabilityAfter: 0.48,
        wpa: 0.02,
        ballInPlay: {
          trajectory: 'line',
          zone: 0,
          velocity: 'hard',
          fielderIds: ['fielder-1'],
          primaryFielderId: 'fielder-1',
        },
        fameEvents: [],
        isLeadoff: true,
        isClutch: false,
        isWalkOff: false,
        franchiseId: 'franchise-1',
        seasonId: 'franchise-1-season-2',
        statsScopeId: 'franchise-1-season-2',
        seasonNumber: 2,
        parkContext: {
          stadiumId: 'apple-field',
          stadiumName: 'Apple Field',
          parkFactors,
        },
        batterContext: {
          playerId: 'batter-1',
          playerName: 'Batter One',
          handedness: 'R',
        },
        pitcherContext: {
          playerId: 'pitcher-1',
          playerName: 'Pitcher One',
          handedness: 'L',
        },
        enrichment: {
          fieldLocation: { x: 74, y: 48, zone: 'Z05' },
          exitType: 'line_drive',
        },
      }],
    }]);
    mocks.mockGetGameEvents.mockResolvedValue([]);
    mocks.mockGetGameFieldingEvents.mockResolvedValue([]);

    render(<TeamHubContent />);

    fireEvent.click(await screen.findByRole('button', { name: /STADIUM/i }));
    const stadiumRegion = await screen.findByRole('region', { name: /Franchise stadium foundation/i });

    expect(within(stadiumRegion).getByText(/2 selected-stadium row\(s\): batting 1, pitching 1, fielding 0/i)).toBeInTheDocument();
    expect(within(stadiumRegion).getByText(/Archive rows: 1. Spray rows: 2/i)).toBeInTheDocument();
    expect(within(stadiumRegion).getByTestId('team-hub-stadium-spray-chart')).toBeInTheDocument();
    expect(within(stadiumRegion).getAllByTestId('spray-point-batting')).toHaveLength(1);
    expect(within(stadiumRegion).getAllByTestId('spray-point-pitching')).toHaveLength(1);
    expect(within(stadiumRegion).queryByTestId('spray-point-fielding')).not.toBeInTheDocument();
    expect(within(stadiumRegion).getByText(/2 POINT\(S\) · READ ONLY/i)).toBeInTheDocument();
    expect(within(stadiumRegion).getByText(/2 ROW\(S\) · READ ONLY/i)).toBeInTheDocument();
    expect(within(stadiumRegion).getByText('Batter One')).toBeInTheDocument();
    expect(within(stadiumRegion).getByText('Pitcher One')).toBeInTheDocument();
    expect(within(stadiumRegion).queryByText(/No scoped spray event detail yet/i)).not.toBeInTheDocument();
    expect(mocks.mockGetGameEvents).toHaveBeenCalledWith('archive-embedded-spray-1');
    expect(mocks.mockSaveFranchiseTeam).not.toHaveBeenCalled();
    expect(mocks.mockSaveFranchisePlayer).not.toHaveBeenCalled();
  });

  test('renders empty spray chart state for archive samples without event detail', async () => {
    mocks.mockUseFranchiseDataContext.mockReturnValue({
      franchiseConfig: {
        franchiseId: 'franchise-1',
        league: 'league-1',
      },
      seasonNumber: 2,
      standings: {},
      teamNameMap: { 'team-1': 'Copied Alpha', 'team-2': 'Copied Beta' },
      stadiumMap: { 'team-1': 'Apple Field' },
    });
    const parkFactors = {
      stadiumId: 'apple-field',
      stadiumName: 'Apple Field',
      overall: 1.02,
      runs: 1.01,
      homeRuns: 0.99,
      hits: 1,
      doubles: 1,
      triples: 1,
      strikeouts: 1,
      walks: 1,
      leftHandedHR: 1,
      rightHandedHR: 1,
      leftHandedAVG: 1,
      rightHandedAVG: 1,
      gamesIncluded: 0,
      lastUpdated: 'seed',
      confidence: 'LOW',
      source: 'SEED',
    };
    mocks.mockGetRecentGames.mockResolvedValueOnce([{
      gameId: 'archive-no-spray-1',
      date: 100,
      franchiseId: 'franchise-1',
      seasonId: 'franchise-1-season-2',
      statsScopeId: 'franchise-1-season-2',
      competitionType: 'franchise',
      competitionId: 'franchise-1',
      seasonNumber: 2,
      awayTeamId: 'team-2',
      homeTeamId: 'team-1',
      awayTeamName: 'Copied Beta',
      homeTeamName: 'Copied Alpha',
      stadiumName: 'Apple Field',
      stadiumId: 'apple-field',
      parkFactors,
      finalScore: { away: 4, home: 2 },
      innings: 6,
      totalInnings: 6,
      fameEvents: [],
      playerStats: {},
      pitcherGameStats: [],
      activityLog: [],
      inningScores: [],
      aggregationStatus: 'aggregated',
    }]);
    mocks.mockGetGameEvents.mockResolvedValue([]);
    mocks.mockGetGameFieldingEvents.mockResolvedValue([]);

    render(<TeamHubContent />);

    fireEvent.click(await screen.findByRole('button', { name: /STADIUM/i }));
    const stadiumRegion = await screen.findByRole('region', { name: /Franchise stadium foundation/i });

    expect(within(stadiumRegion).getByTestId('team-hub-stadium-spray-chart')).toBeInTheDocument();
    expect(within(stadiumRegion).getByText('NO SCOPED SPRAY POINTS')).toBeInTheDocument();
    expect(within(stadiumRegion).getByText(/0 selected-stadium row\(s\): batting 0, pitching 0, fielding 0/i)).toBeInTheDocument();
    expect(within(stadiumRegion).getByText(/Archive rows: 1. Spray rows: 0/i)).toBeInTheDocument();
    expect(within(stadiumRegion).getAllByText(/No scoped spray event detail yet/i).length).toBeGreaterThan(0);
    expect(within(stadiumRegion).queryByTestId('spray-point-batting')).not.toBeInTheDocument();
    expect(within(stadiumRegion).queryByTestId('spray-point-pitching')).not.toBeInTheDocument();
    expect(within(stadiumRegion).queryByTestId('spray-point-fielding')).not.toBeInTheDocument();
    expect(mocks.mockSaveFranchiseTeam).not.toHaveBeenCalled();
    expect(mocks.mockSaveFranchisePlayer).not.toHaveBeenCalled();
  });

  test('labels mixed salary baselines as partial instead of fully stable', async () => {
    mocks.mockBuildFranchiseSalaryLifecycle.mockResolvedValueOnce(salaryLifecycleReport({
      playerRecords: [
        salaryLifecycleRecord({ playerId: 'stable-player', playerName: 'Stable Player' }),
        salaryLifecycleRecord({
          playerId: 'missing-player',
          playerName: 'Missing Player',
          salary: null,
          initialSalaryBaseline: {
            status: 'blocked',
            persistable: false,
            recalculable: false,
            reasons: ['Stored player salary baseline is missing or incomplete.'],
          },
          currentSalaryCalculation: {
            status: 'blocked',
            persistable: false,
            recalculable: false,
            reasons: ['Current salary calculation is blocked until stored salary and season metadata are available.'],
          },
          limitations: [
            'Stored player salary baseline is missing or incomplete.',
            'Final True Value salary movement is unavailable in internal v1.',
          ],
        }),
      ],
    }));

    render(<TeamHubContent />);

    fireEvent.click(await screen.findByRole('button', { name: /ROSTER/i }));
    const truthRegion = await screen.findByRole('region', { name: /Franchise v1 value salary designation truth labels/i });
    const foundationRegion = await screen.findByRole('region', { name: /Mode 2 Foundation Status/i });

    expect(within(truthRegion).getByText(/Player salary state: PARTIAL \(1 stable \/ 1 missing\)/i)).toBeInTheDocument();
    expect(within(truthRegion).getByText(/Missing salary baseline: 1 players/i)).toBeInTheDocument();
    expect(within(truthRegion).queryByText(/Player salary state: STABLE BASELINE/i)).not.toBeInTheDocument();
    const salaryFoundationCard = within(foundationRegion).getByText('SALARY LIFECYCLE').closest('div.border-2');
    expect(salaryFoundationCard).not.toBeNull();
    expect(within(salaryFoundationCard as HTMLElement).getByText('PARTIAL')).toBeInTheDocument();
    expect(within(salaryFoundationCard as HTMLElement).getByText(/1\/2 current salary row\(s\)/i)).toBeInTheDocument();
    expect(within(foundationRegion).queryByText(/2\/2 current salary row\(s\)/i)).not.toBeInTheDocument();
    expect(mocks.mockSaveFranchiseTeam).not.toHaveBeenCalled();
  });

  test('shows missing payroll and salary context limitations from salary lifecycle gate', async () => {
    mocks.mockBuildFranchiseSalaryLifecycle.mockResolvedValueOnce(salaryLifecycleReport({
      playerRecords: [
        salaryLifecycleRecord({
          playerId: 'copied-player',
          teamPayrollBaseline: null,
          initialSalaryBaseline: {
            status: 'blocked',
            persistable: false,
            recalculable: false,
            reasons: ['Stored player salary baseline is missing or incomplete.'],
          },
          currentSalaryCalculation: {
            status: 'blocked',
            persistable: false,
            recalculable: false,
            reasons: ['Current salary calculation is blocked until stored salary and season metadata are available.'],
          },
          teamPayrollBaselineState: {
            status: 'blocked',
            persistable: false,
            recalculable: false,
            reasons: ['Team payroll baseline is missing for this player/team context.'],
          },
          limitations: [
            'Team payroll baseline is unavailable for salary/value designation checks.',
            'Final True Value salary movement is unavailable in internal v1.',
          ],
        }),
      ],
      teamRecords: [{
        contractVersion: 'franchise-salary-lifecycle-v1-current-salary',
        franchiseId: 'franchise-1',
        seasonId: 'franchise-1-season-2',
        statsScopeId: 'franchise-1-season-2',
        seasonNumber: 2,
        teamId: 'team-1',
        payrollBaseline: null,
        playerCount: 1,
        payrollBaselineState: {
          status: 'blocked',
          persistable: false,
          recalculable: false,
          reasons: ['Team payroll baseline is missing for this team.'],
        },
        limitations: ['Team payroll baseline is unavailable for this team.'],
      }],
    }));

    render(<TeamHubContent />);

    fireEvent.click(await screen.findByRole('button', { name: /ROSTER/i }));
    const truthRegion = await screen.findByRole('region', { name: /Franchise v1 value salary designation truth labels/i });

    expect(within(truthRegion).getByText(/Player salary state: BLOCKED/i)).toBeInTheDocument();
    expect(within(truthRegion).getByText(/Missing salary baseline: 1 players/i)).toBeInTheDocument();
    expect(within(truthRegion).getByText(/Team payroll proof: BLOCKED/i)).toBeInTheDocument();
    expect(within(truthRegion).getByText(/Team payroll proof limitation: missing handoff payroll proof/i)).toBeInTheDocument();
    expect(within(truthRegion).getByText(/Team payroll baseline is unavailable for salary\/value designation checks/i)).toBeInTheDocument();
    const valueWinsRegion = await screen.findByRole('region', { name: /Team True Value and Expected Wins/i });
    expect(within(valueWinsRegion).getByText('Team payroll proof')).toBeInTheDocument();
    expect(valueWinsRegion).toHaveTextContent(/Salary blocker:/i);
    expect(valueWinsRegion).toHaveTextContent(/Team payroll proof is missing for this selected team/i);
    expect(mocks.mockSaveFranchiseTeam).not.toHaveBeenCalled();
  });

  test('surfaces FARM salary and designation limitations without revealing hidden prospect data', async () => {
    mocks.mockBuildFranchiseSalaryLifecycle.mockResolvedValueOnce(salaryLifecycleReport({
      playerRecords: [
        salaryLifecycleRecord(),
        salaryLifecycleRecord({
          playerId: 'farm-player',
          playerName: 'Farm Hidden',
          rosterStatus: 'FARM',
          salary: 1000000,
          limitations: [
            'FARM player salary context uses public draft/scouting-safe salary or revealed known salary; hidden true ratings remain blocked.',
          ],
        }),
      ],
    }));
    mocks.mockBuildFranchiseDesignationEligibility.mockResolvedValueOnce(designationEligibilityReport({
      records: [
        designationEligibilityRecord('TEAM_MVP', {
          playerId: 'farm-player',
          playerName: 'Farm Hidden',
          rosterStatus: 'FARM',
          status: 'blocked',
          reasons: ['Current MLB roster status is required; found FARM.'],
        }),
        designationEligibilityRecord('FAN_FAVORITE', {
          playerId: 'farm-player',
          playerName: 'Farm Hidden',
          rosterStatus: 'FARM',
          status: 'blocked',
          reasons: ['FAN_FAVORITE requires canonical True Value and value-delta inputs, which are unavailable in internal v1.'],
        }),
      ],
    }));

    render(<TeamHubContent />);

    fireEvent.click(await screen.findByRole('button', { name: /ROSTER/i }));
    const truthRegion = await screen.findByRole('region', { name: /Franchise v1 value salary designation truth labels/i });
    const valueWinsRegion = await screen.findByRole('region', { name: /Team True Value and Expected Wins/i });

    expect(within(truthRegion).getByText(/FARM player salary context uses public draft\/scouting-safe salary/i)).toBeInTheDocument();
    expect(within(truthRegion).getByText(/Proj. Fan Favorite/i)).toBeInTheDocument();
    expect(within(truthRegion).getByText(/Proj. Albatross/i)).toBeInTheDocument();
    expect(within(valueWinsRegion).getByText('Roster salary sum')).toBeInTheDocument();
    expect(within(valueWinsRegion).queryByText(/trueGrade/i)).not.toBeInTheDocument();
    expect(within(truthRegion).queryByText(/trueGrade/i)).not.toBeInTheDocument();
    expect(within(truthRegion).queryByText(/hiddenPersonalityModifiers/i)).not.toBeInTheDocument();
    expect(mocks.mockSaveFranchiseTeam).not.toHaveBeenCalled();
  });

  test('renders hidden-safe FARM player inspection without MLB row leakage', async () => {
    render(<TeamHubContent />);

    fireEvent.click(await screen.findByRole('button', { name: /ROSTER/i }));

    const farmRegion = await screen.findByRole('region', { name: /Franchise FARM prospects/i });
    const rosterTable = screen.getByRole('table', { name: /Franchise roster scan table/i });

    expect(within(farmRegion).getByText('Farm Hidden')).toBeInTheDocument();
    expect(within(farmRegion).getByText(/CF · Age 21 · B\/T L\/R/i)).toBeInTheDocument();
    expect(within(farmRegion).getByText(/Scouted:/i)).toBeInTheDocument();
    expect(within(farmRegion).getByText('B')).toBeInTheDocument();
    expect(within(farmRegion).getByText(/Potential:/i)).toBeInTheDocument();
    expect(within(farmRegion).getByText('A-')).toBeInTheDocument();
    expect(within(farmRegion).getByText(/Confidence: medium/i)).toBeInTheDocument();
    expect(within(farmRegion).getByText(/Salary: \$4\.0K/i)).toBeInTheDocument();
    expect(within(farmRegion).queryByText(/Salary: \$1\.0M/i)).not.toBeInTheDocument();
    expect(within(farmRegion).getByText(/Chemistry: Spirited/i)).toBeInTheDocument();
    expect(within(farmRegion).getByText(/Personality: Jolly/i)).toBeInTheDocument();
    expect(within(farmRegion).getByText(/Traits: Sprinter/i)).toBeInTheDocument();
    expect(within(farmRegion).getByText(/Salary: \$4\.0K/i)).toBeInTheDocument();
    expect(within(farmRegion).getByText(/Options used: 1/i)).toBeInTheDocument();
    expect(within(farmRegion).getByText(/Option dates: None/i)).toBeInTheDocument();
    expect(within(farmRegion).getAllByText(/^HIDDEN$/i).length).toBeGreaterThan(0);
    const farmScanRow = within(rosterTable).getByText('Farm Hidden').closest('tr');
    expect(farmScanRow).not.toBeNull();
    expect(farmScanRow as HTMLElement).toHaveTextContent(/FARM/);
    expect(farmScanRow as HTMLElement).toHaveTextContent(/Hidden/);
    expect(within(farmRegion).queryByText(/Power/i)).not.toBeInTheDocument();
    expect(within(farmRegion).queryByText(/Contact/i)).not.toBeInTheDocument();
    expect(within(farmRegion).queryByText(/Velocity/i)).not.toBeInTheDocument();
    expect(within(farmRegion).queryByText(/Junk/i)).not.toBeInTheDocument();
    expect(within(farmRegion).queryByText(/Accuracy/i)).not.toBeInTheDocument();
    expect(within(farmRegion).queryByText(/Leadership/i)).not.toBeInTheDocument();
    expect(within(farmRegion).queryByText(/Volatility/i)).not.toBeInTheDocument();
    expect(within(farmRegion).queryByText(/hiddenPersonalityModifiers/i)).not.toBeInTheDocument();
    expect(within(farmRegion).queryByText(/trueGrade/i)).not.toBeInTheDocument();
    expect(mocks.mockSaveFranchiseTeam).not.toHaveBeenCalled();
  });

  test('directory lists MLB and FARM franchise-owned players with hidden-safe row grades', async () => {
    render(<TeamHubContent />);

    fireEvent.click(await screen.findByRole('button', { name: /DIRECTORY/i }));
    const directory = await screen.findByRole('region', { name: /Franchise player directory/i });

    expect(within(directory).getByText('FRANCHISE PLAYER DIRECTORY')).toBeInTheDocument();
    expect(within(directory).getByText('Copied Player')).toBeInTheDocument();
    expect(within(directory).getByText('Farm Hidden')).toBeInTheDocument();
    expect(within(directory).getAllByText('MLB').length).toBeGreaterThan(0);
    expect(within(directory).getAllByText('FARM').length).toBeGreaterThan(0);
    expect(within(directory).getByText('B+')).toBeInTheDocument();
    expect(within(directory).getByText(/Scouted B \/ Pot A-/i)).toBeInTheDocument();
    expect(within(directory).queryByText(/trueGrade/i)).not.toBeInTheDocument();
    expect(within(directory).queryByText(/hiddenPersonalityModifiers/i)).not.toBeInTheDocument();
    expect(within(directory).queryByText(/Leadership/i)).not.toBeInTheDocument();
    expect(mocks.mockSaveFranchisePlayer).not.toHaveBeenCalled();
    expect(mocks.mockSaveFranchiseTeam).not.toHaveBeenCalled();
  });

  test('directory search filters by player name', async () => {
    render(<TeamHubContent />);

    fireEvent.click(await screen.findByRole('button', { name: /DIRECTORY/i }));
    const directory = await screen.findByRole('region', { name: /Franchise player directory/i });
    fireEvent.change(within(directory).getByLabelText(/Search player name/i), { target: { value: 'Farm' } });

    expect(within(directory).getByText('Farm Hidden')).toBeInTheDocument();
    expect(within(directory).queryByText('Copied Player')).not.toBeInTheDocument();
  });

  test('directory filters by roster status and hidden reveal state', async () => {
    render(<TeamHubContent />);

    fireEvent.click(await screen.findByRole('button', { name: /DIRECTORY/i }));
    const directory = await screen.findByRole('region', { name: /Franchise player directory/i });
    fireEvent.change(within(directory).getByLabelText(/Roster status/i), { target: { value: 'FARM' } });
    fireEvent.change(within(directory).getByLabelText(/Reveal state/i), { target: { value: 'HIDDEN' } });

    expect(within(directory).getByText('Farm Hidden')).toBeInTheDocument();
    expect(within(directory).queryByText('Copied Player')).not.toBeInTheDocument();
  });

  test('directory opens existing profile modal from a row', async () => {
    render(<TeamHubContent />);

    fireEvent.click(await screen.findByRole('button', { name: /DIRECTORY/i }));
    const directory = await screen.findByRole('region', { name: /Franchise player directory/i });
    fireEvent.click(within(directory).getByRole('button', { name: /Open profile for Copied Player/i }));

    const dialog = await screen.findByRole('dialog', { name: /Franchise player profile for Copied Player/i });
    expect(within(dialog).getByText('FRANCHISE PLAYER PROFILE')).toBeInTheDocument();
    expect(within(dialog).getByText('PLAYER CONTINUITY')).toBeInTheDocument();
    expect(mocks.mockSaveFranchisePlayer).not.toHaveBeenCalled();
    expect(mocks.mockSaveFranchiseTeam).not.toHaveBeenCalled();
  });

  test('directory hidden FARM row and profile do not expose hidden prospect truth', async () => {
    render(<TeamHubContent />);

    fireEvent.click(await screen.findByRole('button', { name: /DIRECTORY/i }));
    const directory = await screen.findByRole('region', { name: /Franchise player directory/i });
    expect(within(directory).getByText(/Scouted B \/ Pot A-/i)).toBeInTheDocument();
    expect(within(directory).queryByText(/trueGrade/i)).not.toBeInTheDocument();
    expect(within(directory).queryByText(/Leadership/i)).not.toBeInTheDocument();

    fireEvent.click(within(directory).getByRole('button', { name: /Open profile for Farm Hidden/i }));
    const dialog = await screen.findByRole('dialog', { name: /Franchise player profile for Farm Hidden/i });
    expect(within(dialog).getByText(/FARM · HIDDEN · Read-only/i)).toBeInTheDocument();
    expect(within(dialog).getByText('VISIBLE SCOUTING REPORT')).toBeInTheDocument();
    expect(within(dialog).queryByText('BASEBALL DETAILS')).not.toBeInTheDocument();
    expect(within(dialog).queryByText('POW')).not.toBeInTheDocument();
    expect(within(dialog).queryByText(/trueGrade/i)).not.toBeInTheDocument();
    expect(within(dialog).queryByText(/hiddenPersonalityModifiers/i)).not.toBeInTheDocument();
    expect(within(dialog).queryByText(/Leadership/i)).not.toBeInTheDocument();
    expect(mocks.mockSaveFranchisePlayer).not.toHaveBeenCalled();
    expect(mocks.mockSaveFranchiseTeam).not.toHaveBeenCalled();
  });

  test('opens read-only player profile from MLB roster row', async () => {
    render(<TeamHubContent />);

    fireEvent.click(await screen.findByRole('button', { name: /ROSTER/i }));
    fireEvent.click(await screen.findByRole('button', { name: /Open profile for Copied Player/i }));

    const dialog = await screen.findByRole('dialog', { name: /Franchise player profile for Copied Player/i });
    expect(within(dialog).getByText('FRANCHISE PLAYER PROFILE')).toBeInTheDocument();
    expect(within(dialog).getByText('Copied Player')).toBeInTheDocument();
    expect(within(dialog).getByText(/MLB · REVEALED · Read-only/i)).toBeInTheDocument();
    expect(within(dialog).getByText('PROJECTED DESIGNATIONS')).toBeInTheDocument();
    expect(within(dialog).getByText('Proj. MVP')).toBeInTheDocument();
    expect(within(dialog).getByText('Proj. Ace')).toBeInTheDocument();
    expect(mocks.mockSaveFranchisePlayer).not.toHaveBeenCalled();
    expect(within(dialog).getByText('BASEBALL DETAILS')).toBeInTheDocument();
    expect(within(dialog).getByText('PRIMARY POSITION')).toBeInTheDocument();
    expect(within(dialog).getByText('SECONDARY POSITION')).toBeInTheDocument();
    expect(within(dialog).getByText('SS')).toBeInTheDocument();
    expect(within(dialog).getByText('2B')).toBeInTheDocument();
    expect(within(dialog).getByText('ANALYZER GRADE')).toBeInTheDocument();
    expect(within(dialog).getByText('STORED GRADE')).toBeInTheDocument();
    expect(within(dialog).getAllByText('B+').length).toBeGreaterThanOrEqual(2);
    expect(within(dialog).getByText('POW')).toBeInTheDocument();
    expect(within(dialog).getByText('CON')).toBeInTheDocument();
    expect(within(dialog).getByText('SPD')).toBeInTheDocument();
    expect(within(dialog).queryByText('VEL')).not.toBeInTheDocument();
    expect(within(dialog).queryByText('JNK')).not.toBeInTheDocument();
    expect(within(dialog).queryByText('ACC')).not.toBeInTheDocument();
    expect(within(dialog).queryByText('ARSENAL')).not.toBeInTheDocument();
    expect(within(dialog).getByText(/Pitching ratings hidden for non-pitcher/i)).toBeInTheDocument();
    expect(within(dialog).getByText(/\$3\.00M/i)).toBeInTheDocument();
    expect(within(dialog).getByText('PROFILE EDIT HISTORY')).toBeInTheDocument();
    expect(within(dialog).getByText(/No player-local profile edits recorded/i)).toBeInTheDocument();
    const moraleRegion = within(dialog).getByRole('region', { name: /Player morale spec alignment/i });
    expect(within(moraleRegion).getByText('PLAYER MORALE HISTORY')).toBeInTheDocument();
    expect(within(moraleRegion).getByText('50')).toBeInTheDocument();
    expect(within(moraleRegion).getByText(/State: CONTENT/i)).toBeInTheDocument();
    expect(within(moraleRegion).getByText(/Neutral 50 baseline: IMPLEMENTED/i)).toBeInTheDocument();
    expect(within(moraleRegion).getByLabelText(/Player morale delta/i)).toBeInTheDocument();
    expect(within(moraleRegion).getByLabelText(/Player morale reason/i)).toBeInTheDocument();
    expect(within(dialog).getByText('MANUAL OVERRIDE PREVIEW')).toBeInTheDocument();
    expect(within(dialog).queryByText(/SAVE PLAYER MORALE/i)).not.toBeInTheDocument();
    expect(mocks.mockSaveFranchisePlayer).not.toHaveBeenCalled();
    expect(mocks.mockSaveFranchiseTeam).not.toHaveBeenCalled();
  });

  test('profile modal shows pitching ratings and arsenal for TWO-WAY player', async () => {
    mocks.mockGetAllFranchisePlayers.mockResolvedValueOnce([
      franchisePlayer('two-way-player', 'Two', 'Way', 'TWO-WAY', {
        secondaryPosition: 'OF',
        velocity: 82,
        junk: 81,
        accuracy: 79,
        arsenal: ['4F', 'CH', 'SL'],
      }),
    ]);
    mocks.mockGetFranchiseFarmRoster.mockResolvedValueOnce([]);

    render(<TeamHubContent />);

    fireEvent.click(await screen.findByRole('button', { name: /DIRECTORY/i }));
    const directory = await screen.findByRole('region', { name: /Franchise player directory/i });
    fireEvent.click(within(directory).getByRole('button', { name: /Open profile for Two Way/i }));

    const dialog = await screen.findByRole('dialog', { name: /Franchise player profile for Two Way/i });
    expect(within(dialog).getByText('PRIMARY POSITION')).toBeInTheDocument();
    expect(within(dialog).getByText('TWO-WAY')).toBeInTheDocument();
    expect(within(dialog).getByText('SECONDARY POSITION')).toBeInTheDocument();
    expect(within(dialog).getByText('OF')).toBeInTheDocument();
    expect(within(dialog).getByText('VEL')).toBeInTheDocument();
    expect(within(dialog).getByText('JNK')).toBeInTheDocument();
    expect(within(dialog).getByText('ACC')).toBeInTheDocument();
    expect(within(dialog).getByText('ARSENAL')).toBeInTheDocument();
    expect(within(dialog).getByText('82')).toBeInTheDocument();
    expect(within(dialog).getByText('81')).toBeInTheDocument();
    expect(within(dialog).getByText('79')).toBeInTheDocument();
    expect(within(dialog).getByText(/4F, CH, SL/i)).toBeInTheDocument();
    expect(within(dialog).queryByText(/Pitching ratings hidden/i)).not.toBeInTheDocument();
    expect(mocks.mockSaveFranchisePlayer).not.toHaveBeenCalled();
    expect(mocks.mockSaveFranchiseTeam).not.toHaveBeenCalled();
  });

  test('revealed FARM profile can use manual player morale controls', async () => {
    mocks.mockGetAllFranchisePlayers.mockResolvedValueOnce([
      franchisePlayer('farm-revealed', 'Farm', 'Revealed', 'CF', {
        ratingRevealState: 'revealed',
        leagueAssignments: [{ leagueId: 'league-1', teamId: 'team-1', rosterStatus: 'FARM' }],
      }),
    ]);
    mocks.mockGetFranchiseFarmRoster.mockResolvedValueOnce([
      {
        id: 'franchise-1:franchise-1-season-2:team-1:farm-revealed',
        franchiseId: 'franchise-1',
        seasonId: 'franchise-1-season-2',
        seasonNumber: 2,
        teamId: 'team-1',
        playerId: 'farm-revealed',
        rosterLevel: 'AAA',
        rosterStatus: 'FARM',
        optionsUsed: 0,
        optionDates: [],
        ratingRevealState: 'revealed',
        assignedAt: '2026-01-01T00:00:00.000Z',
        lastModified: '2026-01-01T00:00:00.000Z',
      },
    ]);

    render(<TeamHubContent />);

    fireEvent.click(await screen.findByRole('button', { name: /DIRECTORY/i }));
    const directory = await screen.findByRole('region', { name: /Franchise player directory/i });
    fireEvent.click(within(directory).getByRole('button', { name: /Open profile for Farm Revealed/i }));

    const dialog = await screen.findByRole('dialog', { name: /Franchise player profile for Farm Revealed/i });
    expect(within(dialog).getByText(/FARM · REVEALED · Read-only/i)).toBeInTheDocument();
    const moraleRegion = within(dialog).getByRole('region', { name: /Player morale spec alignment/i });
    expect(within(moraleRegion).getByLabelText(/Player morale delta/i)).toBeInTheDocument();
    expect(within(moraleRegion).getByLabelText(/Player morale reason/i)).toBeInTheDocument();
  });

  test('free-agent and unknown profiles do not show manual player morale controls', async () => {
    mocks.mockGetAllFranchisePlayers.mockResolvedValueOnce([
      franchisePlayer('free-agent-player', 'Free', 'Agent', 'SS', {
        leagueAssignments: [{ leagueId: 'league-1', teamId: '', rosterStatus: 'FREE_AGENT' }],
      }),
      franchisePlayer('unknown-player', 'Unknown', 'Player', 'CF', {
        leagueAssignments: [],
      }),
    ]);
    mocks.mockGetFranchiseFarmRoster.mockResolvedValueOnce([]);

    render(<TeamHubContent />);

    fireEvent.click(await screen.findByRole('button', { name: /DIRECTORY/i }));
    const directory = await screen.findByRole('region', { name: /Franchise player directory/i });
    fireEvent.click(within(directory).getByRole('button', { name: /Open profile for Free Agent/i }));

    let dialog = await screen.findByRole('dialog', { name: /Franchise player profile for Free Agent/i });
    let moraleRegion = within(dialog).getByRole('region', { name: /Player morale spec alignment/i });
    expect(within(moraleRegion).queryByLabelText(/Player morale delta/i)).not.toBeInTheDocument();
    expect(within(moraleRegion).queryByLabelText(/Player morale reason/i)).not.toBeInTheDocument();
    expect(within(moraleRegion).getByText(/Manual player morale controls are hidden until the player is revealed\/current/i)).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole('button', { name: 'CLOSE' }));
    fireEvent.click(within(directory).getByRole('button', { name: /Open profile for Unknown Player/i }));

    dialog = await screen.findByRole('dialog', { name: /Franchise player profile for Unknown Player/i });
    moraleRegion = within(dialog).getByRole('region', { name: /Player morale spec alignment/i });
    expect(within(moraleRegion).queryByLabelText(/Player morale delta/i)).not.toBeInTheDocument();
    expect(within(moraleRegion).queryByLabelText(/Player morale reason/i)).not.toBeInTheDocument();
    expect(within(moraleRegion).getByText(/Manual player morale controls are hidden until the player is revealed\/current/i)).toBeInTheDocument();
  });

  test('profile modal shows read-only manual override preview for MLB/revealed player', async () => {
    render(<TeamHubContent />);

    fireEvent.click(await screen.findByRole('button', { name: /ROSTER/i }));
    fireEvent.click(await screen.findByRole('button', { name: /Open profile for Copied Player/i }));

    const dialog = await screen.findByRole('dialog', { name: /Franchise player profile for Copied Player/i });
    const preview = within(dialog).getByRole('region', { name: /Manual Override Preview/i });

    expect(within(preview).getByText('MANUAL OVERRIDE PREVIEW')).toBeInTheDocument();
    expect(within(preview).getByText(/Draft-only validator preview/i)).toBeInTheDocument();
    expect(within(preview).getByText(/creates no morale state, relationship state, approval record, or transaction/i)).toBeInTheDocument();
    expect(within(preview).getByText('VALID DRAFT')).toBeInTheDocument();
    expect(within(preview).getByText('PROPOSAL KIND')).toBeInTheDocument();
    expect(within(preview).getByText('player-morale')).toBeInTheDocument();
    expect(within(preview).getByText('TARGET PLAYER')).toBeInTheDocument();
    expect(within(preview).getByText(/Copied Player \(copied-player\)/i)).toBeInTheDocument();
    expect(within(preview).getByText('ACTOR / SOURCE')).toBeInTheDocument();
    expect(within(preview).getByText('Internal v1 manual preview')).toBeInTheDocument();
    expect(within(preview).getByText('PROPOSED EFFECT')).toBeInTheDocument();
    expect(within(preview).getByText(/context-only: Preview-only context note/i)).toBeInTheDocument();
    expect(within(preview).getByText(/Proposal is valid as a draft-only manual override contract/i)).toBeInTheDocument();
    expect(within(preview).getByText(/No draft blockers/i)).toBeInTheDocument();
    expect(within(preview).queryByRole('button')).not.toBeInTheDocument();
    expect(within(preview).queryByRole('textbox')).not.toBeInTheDocument();
    expect(within(preview).queryByText(/submit/i)).not.toBeInTheDocument();
    expect(within(preview).queryByText(/approve/i)).not.toBeInTheDocument();
    expect(mocks.mockSaveFranchisePlayer).not.toHaveBeenCalled();
    expect(mocks.mockSaveFranchiseTeam).not.toHaveBeenCalled();
  });

  test('profile modal shows read-only relationship context boundaries for MLB/revealed player', async () => {
    render(<TeamHubContent />);

    fireEvent.click(await screen.findByRole('button', { name: /ROSTER/i }));
    fireEvent.click(await screen.findByRole('button', { name: /Open profile for Copied Player/i }));

    const dialog = await screen.findByRole('dialog', { name: /Franchise player profile for Copied Player/i });
    const relationshipRegion = within(dialog).getByRole('region', { name: /Relationship Context/i });

    expect(within(relationshipRegion).getByText('RELATIONSHIP CONTEXT')).toBeInTheDocument();
    expect(within(relationshipRegion).getByText(/Read-only \/ draft-only proposal context/i)).toBeInTheDocument();
    expect(within(relationshipRegion).getByText(/No durable relationship state exists in Franchise v1/i)).toBeInTheDocument();
    expect(within(relationshipRegion).getByText(/Player-player relationship proposal boundary/i)).toBeInTheDocument();
    expect(within(relationshipRegion).getByText(/Fan\/team relationship proposal boundary/i)).toBeInTheDocument();
    expect(within(relationshipRegion).getByText(/player relationship overrides require relatedPlayerId/i)).toBeInTheDocument();
    expect(within(relationshipRegion).getAllByText(/Score-only data is team\/schedule context only, not player relationship authority/i).length).toBeGreaterThan(0);
    expect(within(relationshipRegion).getByText(/GameTracker\/archive facts may be factual context only/i)).toBeInTheDocument();
    expect(within(relationshipRegion).getByText(/Relationship mutation, morale mutation from relationships, profile automation, salary movement, designation mutation, story persistence, offseason, and Mode 3 remain blocked/i)).toBeInTheDocument();
    expect(within(relationshipRegion).queryByRole('button')).not.toBeInTheDocument();
    expect(within(relationshipRegion).queryByRole('textbox')).not.toBeInTheDocument();
    expect(mocks.mockSaveFranchisePlayer).not.toHaveBeenCalled();
    expect(mocks.mockSaveFranchiseTeam).not.toHaveBeenCalled();
  });

  test('manual player morale adjustment writes scoped player morale history without profile mutation', async () => {
    render(<TeamHubContent />);

    fireEvent.click(await screen.findByRole('button', { name: /ROSTER/i }));
    fireEvent.click(await screen.findByRole('button', { name: /Open profile for Copied Player/i }));

    const dialog = await screen.findByRole('dialog', { name: /Franchise player profile for Copied Player/i });
    const moraleRegion = within(dialog).getByRole('region', { name: /Player morale spec alignment/i });
    fireEvent.change(within(moraleRegion).getByLabelText(/Player morale delta/i), { target: { value: '-6' } });
    fireEvent.change(within(moraleRegion).getByLabelText(/Player morale reason/i), { target: { value: 'Manual confidence correction.' } });
    fireEvent.click(within(moraleRegion).getByRole('button', { name: 'APPLY' }));

    await waitFor(() => expect(within(moraleRegion).getByText(/Manual morale adjustment applied: 50 → 44 \(-6\)/i)).toBeInTheDocument());
    await waitFor(() => expect(within(moraleRegion).getByText(/State: FRUSTRATED/i)).toBeInTheDocument());
    expect(within(moraleRegion).getAllByText(/Manual confidence correction/i).length).toBeGreaterThan(0);
    expect(within(moraleRegion).getByText(/Source: manual-override/i)).toBeInTheDocument();

    const snapshot = await getFranchiseMoraleSnapshot({
      franchiseId: 'franchise-1',
      seasonId: 'franchise-1-season-2',
      statsScopeId: 'franchise-1-season-2',
    }, 'player', 'copied-player');
    expect(snapshot?.currentValue).toBe(44);
    expect(snapshot?.history[0]?.sourceKind).toBe('manual-override');
    expect(mocks.mockSaveFranchisePlayer).not.toHaveBeenCalled();
    expect(mocks.mockSaveFranchiseTeam).not.toHaveBeenCalled();
  });

  test('shows player-local profile edit history without official history wording', async () => {
    mocks.mockGetAllFranchisePlayers.mockResolvedValueOnce([
      franchisePlayer('copied-player', 'Copied', 'Player', 'SS', {
        editHistory: [
          {
            date: '2026-04-01T12:00:00.000Z',
            field: 'nickname',
            oldValue: 'Old Nick',
            newValue: 'New Nick',
            context: 'base',
          },
          {
            date: '2026-04-02T12:00:00.000Z',
            field: 'power',
            oldValue: 60,
            newValue: 77,
            context: 'base',
          },
        ],
      }),
    ]);

    render(<TeamHubContent />);

    fireEvent.click(await screen.findByRole('button', { name: /ROSTER/i }));
    fireEvent.click(await screen.findByRole('button', { name: /Open profile for Copied Player/i }));

    const dialog = await screen.findByRole('dialog', { name: /Franchise player profile for Copied Player/i });
    expect(within(dialog).getByText('PROFILE EDIT HISTORY')).toBeInTheDocument();
    expect(within(dialog).getByText(/Player-local profile changes only/i)).toBeInTheDocument();
    expect(within(dialog).getByText('power')).toBeInTheDocument();
    expect(within(dialog).getAllByText(/60.*77/i).length).toBeGreaterThan(0);
    expect(within(dialog).getByText('nickname')).toBeInTheDocument();
    expect(within(dialog).getAllByText(/Old Nick.*New Nick/i).length).toBeGreaterThan(0);
    const editHistorySection = within(dialog).getByText('PROFILE EDIT HISTORY').closest('section');
    expect(editHistorySection).toBeTruthy();
    expect(within(editHistorySection as HTMLElement).queryByText(/trade/i)).not.toBeInTheDocument();
    expect(within(editHistorySection as HTMLElement).queryByText(/call-up/i)).not.toBeInTheDocument();
    expect(within(editHistorySection as HTMLElement).queryByText(/official log/i)).not.toBeInTheDocument();
    expect(mocks.mockSaveFranchisePlayer).not.toHaveBeenCalled();
  });

  test('profile continuity separates player edits roster events archive evidence score-only rows and team stints', async () => {
    mocks.mockGetAllFranchisePlayers.mockResolvedValueOnce([
      franchisePlayer('copied-player', 'Copied', 'Player', 'SS', {
        editHistory: [{
          date: '2026-04-01T12:00:00.000Z',
          field: 'nickname',
          oldValue: '',
          newValue: 'Continuity',
          context: 'base',
        }],
      }),
    ]);
    mocks.mockGetTransactionsByFranchiseSeason.mockResolvedValueOnce([
      {
        id: 'trade-copied-player',
        timestamp: '2026-04-02T12:00:00.000Z',
        season: 2,
        gameNumber: null,
        phase: 'REGULAR_SEASON',
        franchiseId: 'franchise-1',
        seasonId: 'franchise-1-season-2',
        statsScopeId: 'franchise-1-season-2',
        type: 'trade',
        actor: 'USER',
        data: {
          sourceTeamId: 'team-old',
          targetTeamId: 'team-1',
          playerIds: ['copied-player', 'other-player'],
          playersFromSource: ['copied-player'],
        },
        previousState: null,
        undone: false,
        undoneAt: null,
        undoneBy: null,
      },
    ]);
    mocks.mockGetRecentGames.mockResolvedValueOnce([
      {
        gameId: 'archive-game-1',
        date: 1000,
        seasonId: 'franchise-1-season-2',
        statsScopeId: 'franchise-1-season-2',
        franchiseId: 'franchise-1',
        competitionType: 'franchise',
        competitionId: 'franchise-1',
        scheduleGameId: 'schedule-archive-1',
        seasonNumber: 2,
        awayTeamId: 'team-1',
        homeTeamId: 'team-2',
        awayTeamName: 'Copied Alpha',
        homeTeamName: 'Beta',
        finalScore: { away: 5, home: 3 },
        innings: 9,
        totalInnings: 9,
        fameEvents: [],
        playerStats: {
          'copied-player': {
            playerName: 'Copied Player',
            teamId: 'team-1',
            pa: 4,
            ab: 4,
            h: 1,
            singles: 1,
            doubles: 0,
            triples: 0,
            hr: 0,
            rbi: 0,
            r: 1,
            bb: 0,
            hbp: 0,
            k: 1,
            sb: 0,
            cs: 0,
            sf: 0,
            sh: 0,
            gidp: 0,
            putouts: 1,
            assists: 2,
            fieldingErrors: 0,
          },
        },
        pitcherGameStats: [],
        activityLog: [],
        inningScores: [],
        aggregationStatus: 'aggregated',
      },
    ]);
    mocks.mockGetAllGamesByFranchise.mockResolvedValueOnce([
      {
        id: 'schedule-score-only-1',
        franchiseId: 'franchise-1',
        seasonId: 'franchise-1-season-2',
        statsScopeId: 'franchise-1-season-2',
        seasonNumber: 2,
        gameNumber: 2,
        dayNumber: 2,
        awayTeamId: 'team-old',
        homeTeamId: 'team-2',
        status: 'COMPLETED',
        result: {
          awayScore: 3,
          homeScore: 1,
          winningTeamId: 'team-old',
          losingTeamId: 'team-2',
        },
        completionSource: 'score-only',
        scoreOnlyResultId: 'score-only-1',
        resultEnteredAt: 1100,
        completedAt: 1100,
        createdAt: 1,
        source: 'manual',
      },
    ]);

    render(<TeamHubContent />);

    fireEvent.click(await screen.findByRole('button', { name: /ROSTER/i }));
    fireEvent.click(await screen.findByRole('button', { name: /Open profile for Copied Player/i }));

    const dialog = await screen.findByRole('dialog', { name: /Franchise player profile for Copied Player/i });
    expect(await within(dialog).findByText('PLAYER CONTINUITY')).toBeInTheDocument();
    expect(within(dialog).getByText(/Read-only playerId projection/i)).toBeInTheDocument();
    expect(within(dialog).getByText('PROFILE EDITS')).toBeInTheDocument();
    expect(within(dialog).getByText(/nickname: .*Continuity/i)).toBeInTheDocument();
    expect(within(dialog).getByText('ROSTER EVENTS')).toBeInTheDocument();
    expect(within(dialog).getByText(/trade: team-old → team-1/i)).toBeInTheDocument();
    expect(within(dialog).getByText('GAME / STAT EVIDENCE')).toBeInTheDocument();
    expect(within(dialog).getByText(/archive-game-1: team-1 vs team-2/i)).toBeInTheDocument();
    expect(within(dialog).getByText('SCORE-ONLY TEAM RESULTS')).toBeInTheDocument();
    expect(within(dialog).getByText(/Game 2: team-old 3 @ team-2 1; no player archive\/player stats/i)).toBeInTheDocument();
    expect(within(dialog).getByText('TEAM STINTS')).toBeInTheDocument();
    expect(within(dialog).getByText(/team-1: 1 game \(archive-game-1\)/i)).toBeInTheDocument();
    expect(within(dialog).getByText('KNOWN TEAMS')).toBeInTheDocument();
    expect(within(dialog).getByText('team-old')).toBeInTheDocument();
    expect(mocks.mockSaveFranchisePlayer).not.toHaveBeenCalled();
    expect(mocks.mockSaveFranchiseTeam).not.toHaveBeenCalled();
  });

  test('edits MLB/revealed profile through franchise-owned save path and refreshes display', async () => {
    const freshPlayer = franchisePlayer('copied-player', 'Copied', 'Current', 'SS', {
      secondaryPosition: '2B',
      power: 60,
      overallGrade: 'B+',
      editHistory: [],
    });
    mocks.mockGetFranchisePlayer.mockResolvedValueOnce(freshPlayer);
    mocks.mockSaveFranchisePlayer.mockImplementationOnce(async (_franchiseId: string, player: unknown) => ({
      ...(player as Record<string, unknown>),
      lastModified: '2026-02-01T00:00:00.000Z',
    }));

    render(<TeamHubContent />);

    fireEvent.click(await screen.findByRole('button', { name: /ROSTER/i }));
    fireEvent.click(await screen.findByRole('button', { name: /Open profile for Copied Player/i }));
    const dialog = await screen.findByRole('dialog', { name: /Franchise player profile for Copied Player/i });
    fireEvent.click(within(dialog).getByRole('button', { name: /EDIT PROFILE/i }));
    fireEvent.change(within(dialog).getByLabelText('FIRST NAME'), { target: { value: 'Manual' } });
    fireEvent.change(within(dialog).getByLabelText('AGE'), { target: { value: '29' } });
    expect(within(dialog).getByLabelText('PRIMARY POSITION')).toBeInTheDocument();
    fireEvent.change(within(dialog).getByLabelText('SECONDARY POSITION'), { target: { value: '' } });
    fireEvent.change(within(dialog).getByLabelText('POW'), { target: { value: '77' } });
    expect(within(dialog).queryByLabelText('VEL')).not.toBeInTheDocument();
    expect(within(dialog).queryByLabelText('JNK')).not.toBeInTheDocument();
    expect(within(dialog).queryByLabelText('ACC')).not.toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: /SAVE PROFILE/i }));

    await waitFor(() => expect(mocks.mockSaveFranchisePlayer).toHaveBeenCalledTimes(1));
    expect(mocks.mockGetFranchisePlayer).toHaveBeenCalledWith('franchise-1', 'copied-player');
    const [franchiseId, savedPlayer] = mocks.mockSaveFranchisePlayer.mock.calls[0];
    expect(franchiseId).toBe('franchise-1');
    expect(savedPlayer).toEqual(expect.objectContaining({
      id: 'copied-player',
      firstName: 'Manual',
      lastName: 'Current',
      age: 29,
      secondaryPosition: undefined,
      power: 77,
      salary: 3000000,
      leagueAssignments: [{ leagueId: 'league-1', teamId: 'team-1', rosterStatus: 'MLB' }],
    }));
    expect((savedPlayer.editHistory as Array<{ field: string }>).map((entry) => entry.field)).toEqual(expect.arrayContaining([
      'firstName',
      'age',
      'secondaryPosition',
      'power',
    ]));
    expect(await within(dialog).findByText(/Profile saved to franchise-owned player record/i)).toBeInTheDocument();
    expect(within(dialog).getByText('Manual Current')).toBeInTheDocument();
    expect(within(dialog).getByText('PROFILE EDIT HISTORY')).toBeInTheDocument();
    expect(within(dialog).getByText('power')).toBeInTheDocument();
    expect(within(dialog).getAllByText(/60.*77/i).length).toBeGreaterThan(0);
    expect(within(dialog).queryByLabelText('FIRST NAME')).not.toBeInTheDocument();
    expect(within(dialog).getByLabelText(/Player morale reason/i)).toBeInTheDocument();
    expect(mocks.mockSaveFranchiseTeam).not.toHaveBeenCalled();
    expect(mocks.mockBuildFranchiseSalaryLifecycle).toHaveBeenCalledTimes(1);
    expect(mocks.mockBuildFranchiseDesignationEligibility).toHaveBeenCalledTimes(1);
    expect(mocks.mockGetTransactionsByFranchiseSeason).toHaveBeenCalledTimes(1);
  });

  test('opens hidden-safe read-only player profile from FARM prospect section', async () => {
    render(<TeamHubContent />);

    fireEvent.click(await screen.findByRole('button', { name: /ROSTER/i }));
    fireEvent.click(await screen.findByRole('button', { name: /Open profile for Farm Hidden/i }));

    const dialog = await screen.findByRole('dialog', { name: /Franchise player profile for Farm Hidden/i });
    expect(within(dialog).getByText(/FARM · HIDDEN · Read-only/i)).toBeInTheDocument();
    expect(within(dialog).getByText('VISIBLE SCOUTING REPORT')).toBeInTheDocument();
    expect(within(dialog).getByText(/Hidden prospect details stay unavailable/i)).toBeInTheDocument();
    expect(within(dialog).getByText('SCOUTED GRADE')).toBeInTheDocument();
    expect(within(dialog).getByText('POTENTIAL')).toBeInTheDocument();
    expect(within(dialog).getByText('CONFIDENCE')).toBeInTheDocument();
    expect(within(dialog).getByText('B')).toBeInTheDocument();
    expect(within(dialog).getByText('A-')).toBeInTheDocument();
    expect(within(dialog).getByText('medium')).toBeInTheDocument();
    expect(within(dialog).getByText(/\$4\.0K/i)).toBeInTheDocument();
    expect(within(dialog).getByText('PROFILE EDIT HISTORY')).toBeInTheDocument();
    expect(within(dialog).getByText(/No player-local profile edits recorded/i)).toBeInTheDocument();
    expect(within(dialog).getByText('MANUAL OVERRIDE PREVIEW')).toBeInTheDocument();
    const relationshipRegion = within(dialog).getByRole('region', { name: /Relationship Context/i });
    expect(within(relationshipRegion).getByText(/Scout\/prospect relationship proposal boundary/i)).toBeInTheDocument();
    expect(within(relationshipRegion).getByText(/Visible scouting report context only; hidden scout truth is blocked/i)).toBeInTheDocument();
    expect(within(relationshipRegion).getByText(/HIDDEN TRUTH RELATIONSHIP GUARD: INVALID/i)).toBeInTheDocument();
    expect(within(relationshipRegion).getByText(/Hidden FARM\/prospect truth is blocked from relationship evidence/i)).toBeInTheDocument();
    expect(within(dialog).queryByText('BASEBALL DETAILS')).not.toBeInTheDocument();
    expect(within(dialog).queryByText('POW')).not.toBeInTheDocument();
    expect(within(dialog).queryByText('CON')).not.toBeInTheDocument();
    expect(within(dialog).queryByText('VEL')).not.toBeInTheDocument();
    expect(within(dialog).queryByText(/Leadership/i)).not.toBeInTheDocument();
    expect(within(dialog).queryByText(/Volatility/i)).not.toBeInTheDocument();
    expect(within(dialog).queryByText(/hiddenPersonalityModifiers/i)).not.toBeInTheDocument();
    expect(within(dialog).queryByText(/trueGrade/i)).not.toBeInTheDocument();
    expect(within(relationshipRegion).queryByText(/hiddenPersonalityModifiers/i)).not.toBeInTheDocument();
    expect(within(relationshipRegion).queryByText(/trueGrade/i)).not.toBeInTheDocument();
    expect(within(relationshipRegion).queryByRole('button')).not.toBeInTheDocument();
    expect(within(dialog).queryByRole('textbox')).not.toBeInTheDocument();
    expect(mocks.mockSaveFranchisePlayer).not.toHaveBeenCalled();
    expect(mocks.mockSaveFranchiseTeam).not.toHaveBeenCalled();
  });

  test('unrevealed FARM manual override preview stays hidden-safe and blocks hidden truth evidence', async () => {
    render(<TeamHubContent />);

    fireEvent.click(await screen.findByRole('button', { name: /ROSTER/i }));
    fireEvent.click(await screen.findByRole('button', { name: /Open profile for Farm Hidden/i }));

    const dialog = await screen.findByRole('dialog', { name: /Franchise player profile for Farm Hidden/i });
    const preview = within(dialog).getByRole('region', { name: /Manual Override Preview/i });

    expect(within(preview).getByText('VALID DRAFT')).toBeInTheDocument();
    expect(within(preview).getByText(/Farm Hidden \(farm-player\)/i)).toBeInTheDocument();
    expect(within(preview).getByText(/Visible scouting\/profile context only; hidden prospect truth is not included/i)).toBeInTheDocument();
    expect(within(preview).getByText(/HIDDEN TRUTH EVIDENCE GUARD: INVALID/i)).toBeInTheDocument();
    expect(within(preview).getByText(/Hidden ratings, true grade, hidden scout truth, and hidden personality modifiers are blocked as evidence/i)).toBeInTheDocument();
    expect(within(preview).getByText(/Unrevealed FARM\/prospect hidden truth cannot be used/i)).toBeInTheDocument();
    expect(within(preview).queryByText(/hiddenPersonalityModifiers/i)).not.toBeInTheDocument();
    expect(within(preview).queryByText(/loyalty/i)).not.toBeInTheDocument();
    expect(within(preview).queryByText(/trueGrade/i)).not.toBeInTheDocument();
    expect(within(preview).queryByText(/^A$/)).not.toBeInTheDocument();
    expect(within(preview).queryByRole('button')).not.toBeInTheDocument();
    expect(within(preview).queryByText(/submit/i)).not.toBeInTheDocument();
    expect(within(preview).queryByText(/approve/i)).not.toBeInTheDocument();
    expect(mocks.mockSaveFranchisePlayer).not.toHaveBeenCalled();
    expect(mocks.mockSaveFranchiseTeam).not.toHaveBeenCalled();
  });

  test('hidden FARM profile edit history omits rating, true-grade, and hidden modifier values', async () => {
    mocks.mockGetAllFranchisePlayers.mockResolvedValueOnce([
      franchisePlayer('farm-player', 'Farm', 'Hidden', 'CF', {
        secondaryPosition: 'OF',
        salary: 1000000,
        power: 95,
        ratingRevealState: 'hidden',
        leagueAssignments: [{ leagueId: 'league-1', teamId: 'team-1', rosterStatus: 'FARM' }],
        prospectProfile: {
          trueGrade: 'A',
          scoutedGrade: 'B',
          potentialGrade: 'A-',
          scoutConfidence: 'medium',
        },
        hiddenPersonalityModifiers: { loyalty: 92 },
        editHistory: [
          {
            date: '2026-04-01T12:00:00.000Z',
            field: 'firstName',
            oldValue: 'Farm',
            newValue: 'Visible',
            context: 'base',
          },
          {
            date: '2026-04-02T12:00:00.000Z',
            field: 'power',
            oldValue: 30,
            newValue: 99,
            context: 'base',
          },
          {
            date: '2026-04-03T12:00:00.000Z',
            field: 'trueGrade',
            oldValue: 'C',
            newValue: 'S',
            context: 'base',
          },
          {
            date: '2026-04-04T12:00:00.000Z',
            field: 'hiddenPersonalityModifiers',
            oldValue: { loyalty: 10 },
            newValue: { loyalty: 99 },
            context: 'base',
          },
        ],
      }),
    ]);

    render(<TeamHubContent />);

    fireEvent.click(await screen.findByRole('button', { name: /ROSTER/i }));
    fireEvent.click(await screen.findByRole('button', { name: /Open profile for Farm Hidden/i }));

    const dialog = await screen.findByRole('dialog', { name: /Franchise player profile for Farm Hidden/i });
    expect(within(dialog).getByText('PROFILE EDIT HISTORY')).toBeInTheDocument();
    expect(within(dialog).getByText('firstName')).toBeInTheDocument();
    expect(within(dialog).getAllByText(/Farm.*Visible/i).length).toBeGreaterThan(0);
    expect(within(dialog).getByText('PLAYER CONTINUITY')).toBeInTheDocument();
    expect(within(dialog).getByText(/Unrevealed FARM continuity is hidden-safe/i)).toBeInTheDocument();
    expect(within(dialog).queryByText('power')).not.toBeInTheDocument();
    expect(within(dialog).queryByText(/30.*99/i)).not.toBeInTheDocument();
    expect(within(dialog).queryByText(/trueGrade/i)).not.toBeInTheDocument();
    expect(within(dialog).queryByText(/^S$/i)).not.toBeInTheDocument();
    expect(within(dialog).queryByText(/hiddenPersonalityModifiers/i)).not.toBeInTheDocument();
    expect(within(dialog).queryByText(/loyalty/i)).not.toBeInTheDocument();
    expect(mocks.mockSaveFranchisePlayer).not.toHaveBeenCalled();
  });

  test('edits unrevealed FARM profile with visible identity fields only', async () => {
    const freshFarmPlayer = franchisePlayer('farm-player', 'Farm', 'Hidden', 'CF', {
      secondaryPosition: 'OF',
      salary: 1000000,
      power: 95,
      ratingRevealState: 'hidden',
      leagueAssignments: [{ leagueId: 'league-1', teamId: 'team-1', rosterStatus: 'FARM' }],
      prospectProfile: {
        trueGrade: 'A',
        scoutedGrade: 'B',
        potentialGrade: 'A-',
        scoutConfidence: 'medium',
      },
      hiddenPersonalityModifiers: { loyalty: 92 },
      editHistory: [],
    });
    mocks.mockGetFranchisePlayer.mockResolvedValueOnce(freshFarmPlayer);
    mocks.mockSaveFranchisePlayer.mockImplementationOnce(async (_franchiseId: string, player: unknown) => ({
      ...(player as Record<string, unknown>),
      lastModified: '2026-02-01T00:00:00.000Z',
    }));

    render(<TeamHubContent />);

    fireEvent.click(await screen.findByRole('button', { name: /ROSTER/i }));
    fireEvent.click(await screen.findByRole('button', { name: /Open profile for Farm Hidden/i }));
    const dialog = await screen.findByRole('dialog', { name: /Franchise player profile for Farm Hidden/i });
    fireEvent.click(within(dialog).getByRole('button', { name: /LIMITED EDIT/i }));
    expect(within(dialog).getByText(/Limited edit: visible identity only/i)).toBeInTheDocument();
    expect(within(dialog).queryByLabelText('POW')).not.toBeInTheDocument();
    fireEvent.change(within(dialog).getByLabelText('FIRST NAME'), { target: { value: 'Visible' } });
    fireEvent.change(within(dialog).getByLabelText('AGE'), { target: { value: '22' } });
    fireEvent.change(within(dialog).getByLabelText('TRAIT 1'), { target: { value: 'Clutch' } });
    fireEvent.click(within(dialog).getByRole('button', { name: /SAVE PROFILE/i }));

    await waitFor(() => expect(mocks.mockSaveFranchisePlayer).toHaveBeenCalledTimes(1));
    const [, savedPlayer] = mocks.mockSaveFranchisePlayer.mock.calls[0];
    expect(savedPlayer).toEqual(expect.objectContaining({
      id: 'farm-player',
      firstName: 'Visible',
      lastName: 'Hidden',
      age: 22,
      trait1: 'Clutch',
      power: 95,
      salary: 1000000,
      ratingRevealState: 'hidden',
      leagueAssignments: [{ leagueId: 'league-1', teamId: 'team-1', rosterStatus: 'FARM' }],
    }));
    expect((savedPlayer.editHistory as Array<{ field: string }>).map((entry) => entry.field)).toEqual(expect.arrayContaining([
      'firstName',
      'age',
    ]));
    expect(await within(dialog).findByText(/Profile saved to franchise-owned player record/i)).toBeInTheDocument();
    expect(within(dialog).getByText('Visible Hidden')).toBeInTheDocument();
    expect(within(dialog).queryByText('BASEBALL DETAILS')).not.toBeInTheDocument();
    expect(within(dialog).queryByText('POW')).not.toBeInTheDocument();
    expect(within(dialog).queryByText(/hiddenPersonalityModifiers/i)).not.toBeInTheDocument();
    expect(within(dialog).queryByText(/trueGrade/i)).not.toBeInTheDocument();
    expect(mocks.mockSaveFranchiseTeam).not.toHaveBeenCalled();
  });

  test('renders scoped transaction rows read-only outside the transaction desk', async () => {
    mocks.mockGetTransactionsByFranchiseSeason.mockResolvedValueOnce([
      {
        id: 'txn-call-up-visible',
        timestamp: '2026-05-28T12:00:00.000Z',
        season: 2,
        gameNumber: null,
        phase: 'REGULAR_SEASON',
        franchiseId: 'franchise-1',
        seasonId: 'franchise-1-season-2',
        statsScopeId: 'franchise-1-season-2',
        type: 'call_up',
        actor: 'USER',
        data: {
          playerId: 'farm-player',
          playerName: 'Farm Hidden',
          sourceTeamId: 'team-1',
          targetTeamId: 'team-1',
          sourceRosterStatus: 'FARM',
          targetRosterStatus: 'MLB',
        },
        previousState: null,
        undone: false,
        undoneAt: null,
        undoneBy: null,
      },
      {
        id: 'txn-send-down-visible',
        timestamp: '2026-05-28T13:00:00.000Z',
        season: 2,
        gameNumber: null,
        phase: 'REGULAR_SEASON',
        franchiseId: 'franchise-1',
        seasonId: 'franchise-1-season-2',
        statsScopeId: 'franchise-1-season-2',
        type: 'send_down',
        actor: 'USER',
        data: {
          playerId: 'copied-player',
          playerName: 'Copied Player',
          sourceTeamId: 'team-1',
          targetTeamId: 'team-1',
          sourceRosterStatus: 'MLB',
          targetRosterStatus: 'FARM',
        },
        previousState: null,
        undone: false,
        undoneAt: null,
        undoneBy: null,
      },
      {
        id: 'txn-cross-franchise',
        timestamp: '2026-05-28T14:00:00.000Z',
        season: 2,
        gameNumber: null,
        phase: 'REGULAR_SEASON',
        franchiseId: 'franchise-2',
        seasonId: 'franchise-1-season-2',
        statsScopeId: 'franchise-1-season-2',
        type: 'call_up',
        actor: 'USER',
        data: { playerName: 'Cross Franchise' },
        previousState: null,
        undone: false,
        undoneAt: null,
        undoneBy: null,
      },
      {
        id: 'txn-orphan',
        timestamp: '2026-05-28T15:00:00.000Z',
        season: 2,
        gameNumber: null,
        phase: 'REGULAR_SEASON',
        seasonId: 'franchise-1-season-2',
        statsScopeId: 'franchise-1-season-2',
        type: 'send_down',
        actor: 'USER',
        data: { playerName: 'Orphan Row' },
        previousState: null,
        undone: false,
        undoneAt: null,
        undoneBy: null,
      },
      {
        id: 'txn-wrong-scope',
        timestamp: '2026-05-28T16:00:00.000Z',
        season: 2,
        gameNumber: null,
        phase: 'REGULAR_SEASON',
        franchiseId: 'franchise-1',
        seasonId: 'franchise-1-season-2',
        statsScopeId: 'other-scope',
        type: 'call_up',
        actor: 'USER',
        data: { playerName: 'Wrong Scope' },
        previousState: null,
        undone: false,
        undoneAt: null,
        undoneBy: null,
      },
    ]);

    render(<TeamHubContent />);
    fireEvent.click(await screen.findByRole('button', { name: /ROSTER/i }));

    const historyRegion = await screen.findByRole('region', { name: /Read-only franchise transaction history/i });
    expect(await within(historyRegion).findByText(/CALL UP/i)).toBeInTheDocument();
    expect(within(historyRegion).getByText(/SEND DOWN/i)).toBeInTheDocument();
    expect(within(historyRegion).getByText(/Farm Hidden \(farm-player\)/i)).toBeInTheDocument();
    expect(within(historyRegion).getByText(/Copied Player \(copied-player\)/i)).toBeInTheDocument();
    expect(within(historyRegion).getByText(/FARM -> MLB/i)).toBeInTheDocument();
    expect(within(historyRegion).getByText(/MLB -> FARM/i)).toBeInTheDocument();
    expect(within(historyRegion).queryByText(/Cross Franchise/i)).not.toBeInTheDocument();
    expect(within(historyRegion).queryByText(/Orphan Row/i)).not.toBeInTheDocument();
    expect(within(historyRegion).queryByText(/Wrong Scope/i)).not.toBeInTheDocument();
    expect(within(historyRegion).queryByRole('button')).not.toBeInTheDocument();
    expect(mocks.mockGetTransactionsByFranchiseSeason).toHaveBeenCalledWith('franchise-1', 'franchise-1-season-2');
    expect(mocks.mockSaveFranchiseTeam).not.toHaveBeenCalled();
  });

  test('renders trade history by playerId across team changes', async () => {
    mocks.mockGetTransactionsByFranchiseSeason.mockResolvedValueOnce([
      {
        id: 'txn-trade-player-id',
        timestamp: '2026-05-28T12:00:00.000Z',
        season: 2,
        gameNumber: null,
        phase: 'REGULAR_SEASON',
        franchiseId: 'franchise-1',
        seasonId: 'franchise-1-season-2',
        statsScopeId: 'franchise-1-season-2',
        type: 'trade',
        actor: 'USER',
        data: {
          sourceTeamId: 'old-team',
          targetTeamId: 'team-1',
          sourcePlayers: [
            {
              playerId: 'copied-player',
              playerName: 'Copied Player',
              previousTeamId: 'old-team',
              newTeamId: 'team-1',
              rosterStatus: 'MLB',
            },
          ],
          targetPlayers: [
            {
              playerId: 'farm-player',
              playerName: 'Farm Hidden',
              previousTeamId: 'team-1',
              newTeamId: 'old-team',
              rosterStatus: 'FARM',
            },
          ],
        },
        previousState: null,
        undone: false,
        undoneAt: null,
        undoneBy: null,
      },
    ]);

    render(<TeamHubContent />);
    fireEvent.click(await screen.findByRole('button', { name: /ROSTER/i }));

    const historyRegion = await screen.findByRole('region', { name: /Read-only franchise transaction history/i });
    expect(await within(historyRegion).findByText(/^TRADE$/i)).toBeInTheDocument();
    expect(within(historyRegion).getByText(/Copied Player \(copied-player, MLB\) old-team -> team-1/i)).toBeInTheDocument();
    expect(within(historyRegion).getByText(/Farm Hidden \(farm-player, FARM\) team-1 -> old-team/i)).toBeInTheDocument();
    expect(within(historyRegion).getByText(/Player ids retained across teams/i)).toBeInTheDocument();
    expect(mocks.mockSaveFranchiseTeam).not.toHaveBeenCalled();
  });

  test('surfaces missing and orphan FARM record warnings', async () => {
    mocks.mockGetFranchiseFarmRoster.mockResolvedValueOnce([
      {
        id: 'franchise-1:franchise-1-season-2:team-1:orphan-farm-player',
        franchiseId: 'franchise-1',
        seasonId: 'franchise-1-season-2',
        seasonNumber: 2,
        teamId: 'team-1',
        playerId: 'orphan-farm-player',
        rosterLevel: 'AAA',
        rosterStatus: 'FARM',
        optionsUsed: 0,
        optionDates: [],
        ratingRevealState: 'hidden',
        assignedAt: '2026-01-01T00:00:00.000Z',
        lastModified: '2026-01-01T00:00:00.000Z',
      },
    ]);

    render(<TeamHubContent />);
    fireEvent.click(await screen.findByRole('button', { name: /ROSTER/i }));

    expect(await screen.findByText(/Missing FARM record for FARM-assigned player Farm Hidden/i)).toBeInTheDocument();
    expect(screen.getByText(/FARM record exists without matching player: orphan-farm-player/i)).toBeInTheDocument();
    expect(mocks.mockSaveFranchiseTeam).not.toHaveBeenCalled();
  });

  test('renders empty FARM state', async () => {
    mocks.mockGetAllFranchisePlayers.mockResolvedValueOnce([
      {
        id: 'copied-player',
        firstName: 'Copied',
        lastName: 'Player',
        gender: 'M',
        age: 26,
        bats: 'R',
        throws: 'R',
        primaryPosition: 'SS',
        power: 60,
        contact: 60,
        speed: 70,
        fielding: 80,
        arm: 75,
        velocity: 0,
        junk: 0,
        accuracy: 0,
        arsenal: [],
        overallGrade: 'B+',
        personality: 'Jolly',
        chemistry: 'Spirited',
        morale: 55,
        mojo: 'Normal',
        fame: 0,
        salary: 3000000,
        leagueAssignments: [{ leagueId: 'league-1', teamId: 'team-1', rosterStatus: 'MLB' }],
        createdDate: '2026-01-01T00:00:00.000Z',
        lastModified: '2026-01-01T00:00:00.000Z',
        isCustom: false,
      },
    ]);
    mocks.mockGetFranchiseFarmRoster.mockResolvedValueOnce([]);

    render(<TeamHubContent />);
    fireEvent.click(await screen.findByRole('button', { name: /ROSTER/i }));

    expect(await screen.findByText(/No FARM players are assigned to this franchise team/i)).toBeInTheDocument();
    expect(mocks.mockSaveFranchiseTeam).not.toHaveBeenCalled();
  });

  test('renders franchise MLB lineup and rotation controls without FARM candidates', async () => {
    mocks.mockGetAllFranchisePlayers.mockResolvedValueOnce(lineupManagerPlayers());
    mocks.mockGetFranchiseTeam.mockResolvedValueOnce({
      id: 'team-1',
      name: 'Copied Alpha',
      leagueIds: ['league-1'],
      lineupWithoutDH: [
        { battingOrder: 1, playerId: 'batter-1', fieldingPosition: 'C' },
        { battingOrder: 2, playerId: 'batter-2', fieldingPosition: '1B' },
      ],
      startingRotation: ['starter-a', 'starter-b'],
      lastModified: '2026-01-01T00:00:00.000Z',
    });
    mocks.mockGetFranchiseFarmRoster.mockResolvedValueOnce([]);

    render(<TeamHubContent />);
    fireEvent.click(await screen.findByRole('button', { name: /ROSTER/i }));

    const manager = await screen.findByRole('region', { name: /Franchise lineup and rotation manager/i });
    expect(within(manager).getByRole('combobox', { name: /Lineup slot 1 player/i })).toHaveValue('batter-1');
    // Rotation is now a 4-man set of pitcher dropdowns (JK 2026-06-26); the first slot holds the MLB starter.
    expect(within(manager).getByRole('combobox', { name: /Rotation slot 1 pitcher/i })).toHaveValue('starter-a');
    expect(within(manager).queryByRole('option', { name: /Farm Hidden/i })).not.toBeInTheDocument();
    expect(mocks.mockSaveFranchiseTeam).not.toHaveBeenCalled();
  });

  test('saves reordered lineup and franchise-owned rotation fields', async () => {
    mocks.mockGetAllFranchisePlayers.mockResolvedValueOnce(lineupManagerPlayers());
    mocks.mockGetFranchiseTeam.mockResolvedValueOnce({
      id: 'team-1',
      name: 'Copied Alpha',
      leagueIds: ['league-1'],
      lineupWithoutDH: [
        { battingOrder: 1, playerId: 'batter-1', fieldingPosition: 'C' },
        { battingOrder: 2, playerId: 'batter-2', fieldingPosition: '1B' },
        { battingOrder: 3, playerId: 'batter-3', fieldingPosition: '2B' },
        { battingOrder: 4, playerId: 'batter-4', fieldingPosition: 'SS' },
        { battingOrder: 5, playerId: 'batter-5', fieldingPosition: '3B' },
        { battingOrder: 6, playerId: 'batter-6', fieldingPosition: 'LF' },
        { battingOrder: 7, playerId: 'batter-7', fieldingPosition: 'CF' },
        { battingOrder: 8, playerId: 'batter-8', fieldingPosition: 'RF' },
        { battingOrder: 9, playerId: 'starter-a', fieldingPosition: 'P' },
      ],
      startingRotation: ['starter-a', 'starter-b'],
      lastModified: '2026-01-01T00:00:00.000Z',
    });
    mocks.mockGetFranchiseFarmRoster.mockResolvedValueOnce([]);

    render(<TeamHubContent />);
    fireEvent.click(await screen.findByRole('button', { name: /ROSTER/i }));
    const manager = await screen.findByRole('region', { name: /Franchise lineup and rotation manager/i });

    fireEvent.click(within(manager).getByRole('button', { name: /Move lineup slot 2 up/i }));
    fireEvent.click(within(manager).getByRole('button', { name: /SAVE LINEUP \+ ROTATION/i }));

    await waitFor(() => expect(mocks.mockSaveFranchiseTeam).toHaveBeenCalled());
    const savedTeam = mocks.mockSaveFranchiseTeam.mock.calls[0][1];
    expect(savedTeam.lineupWithoutDH.map((slot: { playerId: string }) => slot.playerId).slice(0, 3)).toEqual([
      'batter-2',
      'batter-1',
      'batter-3',
    ]);
    expect(savedTeam.lineupWithoutDH[8]).toMatchObject({ playerId: 'starter-a', fieldingPosition: 'P' });
    expect(savedTeam.startingRotation).toEqual(['starter-a', 'starter-b']);
  });

  test('saves reordered starting rotation to franchise-owned team state', async () => {
    mocks.mockGetAllFranchisePlayers.mockResolvedValueOnce(lineupManagerPlayers());
    mocks.mockGetFranchiseTeam.mockResolvedValueOnce({
      id: 'team-1',
      name: 'Copied Alpha',
      leagueIds: ['league-1'],
      lineupWithoutDH: [],
      startingRotation: ['starter-a', 'starter-b'],
      lastModified: '2026-01-01T00:00:00.000Z',
    });
    mocks.mockGetFranchiseFarmRoster.mockResolvedValueOnce([]);

    render(<TeamHubContent />);
    fireEvent.click(await screen.findByRole('button', { name: /ROSTER/i }));
    const manager = await screen.findByRole('region', { name: /Franchise lineup and rotation manager/i });

    fireEvent.click(within(manager).getByRole('button', { name: /Move rotation pitcher 2 up/i }));
    fireEvent.click(within(manager).getByRole('button', { name: /SAVE LINEUP \+ ROTATION/i }));

    await waitFor(() => expect(mocks.mockSaveFranchiseTeam).toHaveBeenCalled());
    const savedTeam = mocks.mockSaveFranchiseTeam.mock.calls[0][1];
    expect(savedTeam.startingRotation).toEqual(['starter-b', 'starter-a']);
    expect(savedTeam.lineupWithoutDH[8]).toMatchObject({ playerId: 'starter-b', fieldingPosition: 'P' });
  });

  test('detects stale saved lineup and rotation references and rebuilds from current MLB assignments', async () => {
    mocks.mockGetAllFranchisePlayers.mockResolvedValueOnce(lineupManagerPlayers());
    mocks.mockGetFranchiseTeam.mockResolvedValueOnce({
      id: 'team-1',
      name: 'Copied Alpha',
      leagueIds: ['league-1'],
      lineupWithoutDH: [
        { battingOrder: 1, playerId: 'traded-player', fieldingPosition: 'SS' },
        { battingOrder: 2, playerId: 'batter-1', fieldingPosition: 'C' },
        { battingOrder: 3, playerId: 'batter-1', fieldingPosition: '1B' },
      ],
      startingRotation: ['missing-starter', 'starter-a', 'starter-a'],
      lastModified: '2026-01-01T00:00:00.000Z',
    });
    mocks.mockGetFranchiseFarmRoster.mockResolvedValueOnce([]);

    render(<TeamHubContent />);
    fireEvent.click(await screen.findByRole('button', { name: /ROSTER/i }));
    const manager = await screen.findByRole('region', { name: /Franchise lineup and rotation manager/i });

    expect(within(manager).getByText(/Saved lineup includes non-current MLB players: traded-player/i)).toBeInTheDocument();
    expect(within(manager).getByText(/Saved lineup includes duplicate players: batter-1/i)).toBeInTheDocument();
    expect(within(manager).getByText(/Saved rotation includes non-current MLB pitchers: missing-starter/i)).toBeInTheDocument();
    expect(within(manager).getByText(/Saved rotation includes duplicate pitchers: starter-a/i)).toBeInTheDocument();

    fireEvent.click(within(manager).getByRole('button', { name: /REBUILD FROM MLB ASSIGNMENTS/i }));
    fireEvent.click(within(manager).getByRole('button', { name: /SAVE LINEUP \+ ROTATION/i }));

    await waitFor(() => expect(mocks.mockSaveFranchiseTeam).toHaveBeenCalled());
    const savedTeam = mocks.mockSaveFranchiseTeam.mock.calls[0][1];
    const savedLineupIds = savedTeam.lineupWithoutDH.map((slot: { playerId: string }) => slot.playerId);
    expect(savedLineupIds).not.toContain('traded-player');
    expect(new Set(savedLineupIds).size).toBe(savedLineupIds.length);
    expect(savedTeam.startingRotation).toEqual(['starter-a', 'starter-b']);
  });

  test('blocks duplicate manual lineup selections before saving', async () => {
    mocks.mockGetAllFranchisePlayers.mockResolvedValueOnce(lineupManagerPlayers());
    mocks.mockGetFranchiseTeam.mockResolvedValueOnce({
      id: 'team-1',
      name: 'Copied Alpha',
      leagueIds: ['league-1'],
      lineupWithoutDH: [
        { battingOrder: 1, playerId: 'batter-1', fieldingPosition: 'C' },
        { battingOrder: 2, playerId: 'batter-2', fieldingPosition: '1B' },
      ],
      startingRotation: ['starter-a', 'starter-b'],
      lastModified: '2026-01-01T00:00:00.000Z',
    });
    mocks.mockGetFranchiseFarmRoster.mockResolvedValueOnce([]);

    render(<TeamHubContent />);
    fireEvent.click(await screen.findByRole('button', { name: /ROSTER/i }));
    const manager = await screen.findByRole('region', { name: /Franchise lineup and rotation manager/i });

    fireEvent.change(within(manager).getByRole('combobox', { name: /Lineup slot 2 player/i }), {
      target: { value: 'batter-1' },
    });

    expect(within(manager).getByText(/Lineup has duplicate players: batter-1/i)).toBeInTheDocument();
    expect(within(manager).getByRole('button', { name: /SAVE LINEUP \+ ROTATION/i })).toBeDisabled();
    expect(mocks.mockSaveFranchiseTeam).not.toHaveBeenCalled();
  });

  test('blocks duplicate defensive positions before saving durable lineup', async () => {
    mocks.mockGetAllFranchisePlayers.mockResolvedValueOnce(lineupManagerPlayers());
    mocks.mockGetFranchiseTeam.mockResolvedValueOnce({
      id: 'team-1',
      name: 'Copied Alpha',
      leagueIds: ['league-1'],
      lineupWithoutDH: [
        { battingOrder: 1, playerId: 'batter-1', fieldingPosition: 'C' },
        { battingOrder: 2, playerId: 'batter-2', fieldingPosition: '1B' },
        { battingOrder: 3, playerId: 'batter-3', fieldingPosition: '2B' },
        { battingOrder: 4, playerId: 'batter-4', fieldingPosition: 'SS' },
        { battingOrder: 5, playerId: 'batter-5', fieldingPosition: '3B' },
        { battingOrder: 6, playerId: 'batter-6', fieldingPosition: 'LF' },
        { battingOrder: 7, playerId: 'batter-7', fieldingPosition: 'CF' },
        { battingOrder: 8, playerId: 'batter-8', fieldingPosition: 'RF' },
        { battingOrder: 9, playerId: 'starter-a', fieldingPosition: 'P' },
      ],
      startingRotation: ['starter-a', 'starter-b'],
      lastModified: '2026-01-01T00:00:00.000Z',
    });
    mocks.mockGetFranchiseFarmRoster.mockResolvedValueOnce([]);

    render(<TeamHubContent />);
    fireEvent.click(await screen.findByRole('button', { name: /ROSTER/i }));
    const manager = await screen.findByRole('region', { name: /Franchise lineup and rotation manager/i });

    fireEvent.change(within(manager).getByRole('combobox', { name: /Lineup slot 2 position/i }), {
      target: { value: 'C' },
    });

    expect(within(manager).getByText(/Lineup has duplicate defensive positions: C/i)).toBeInTheDocument();
    expect(within(manager).getByRole('button', { name: /SAVE LINEUP \+ ROTATION/i })).toBeDisabled();
    expect(mocks.mockSaveFranchiseTeam).not.toHaveBeenCalled();
  });
});
