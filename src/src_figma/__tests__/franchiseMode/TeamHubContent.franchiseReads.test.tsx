import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  mockUseOffseasonData: vi.fn(),
  mockUseFranchiseDataContext: vi.fn(),
  mockUseSeasonStats: vi.fn(),
  mockGetFranchiseTeam: vi.fn(),
  mockGetAllFranchisePlayers: vi.fn(),
  mockGetFranchiseFarmRoster: vi.fn(),
  mockGetTransactionsByFranchiseSeason: vi.fn(),
  mockBuildFranchiseSalaryLifecycle: vi.fn(),
  mockBuildFranchiseDesignationEligibility: vi.fn(),
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
  getAllFranchisePlayers: mocks.mockGetAllFranchisePlayers,
  saveFranchiseTeam: mocks.mockSaveFranchiseTeam,
}));

vi.mock('../../../utils/franchiseFarmStorage', () => ({
  getFranchiseFarmRoster: mocks.mockGetFranchiseFarmRoster,
}));

vi.mock('../../../utils/transactionStorage', () => ({
  getTransactionsByFranchiseSeason: mocks.mockGetTransactionsByFranchiseSeason,
}));

vi.mock('../../../utils/franchiseSalaryLifecycle', () => ({
  buildFranchiseSalaryLifecycle: mocks.mockBuildFranchiseSalaryLifecycle,
}));

vi.mock('../../../utils/franchiseDesignationEligibility', () => ({
  buildFranchiseDesignationEligibility: mocks.mockBuildFranchiseDesignationEligibility,
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
    contractVersion: 'franchise-salary-lifecycle-v1-readonly',
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
    salaryBaselineCalculationVersion: 'franchise-initial-salary-v1-ratings-only',
    teamPayrollBaseline: 4000000,
    initialSalaryBaseline: {
      status: 'stable-baseline',
      persistable: false,
      recalculable: false,
      reasons: ['Stored franchise salary baseline is available from the Mode 1 handoff/franchise copy.'],
    },
    teamPayrollBaselineState: {
      status: 'stable-baseline',
      persistable: false,
      recalculable: false,
      reasons: ['Stored team payroll baseline is available from the franchise handoff.'],
    },
    performanceSalaryMovement: {
      status: 'blocked',
      persistable: false,
      recalculable: false,
      reasons: ['Performance salary movement is blocked because canonical True Value is unavailable.'],
    },
    offseasonSalaryRecalculation: {
      status: 'deferred',
      persistable: false,
      recalculable: false,
      reasons: ['Offseason salary recalculation is deferred for internal v1.'],
    },
    persistable: false,
    recalculable: false,
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
    contractVersion: 'franchise-salary-lifecycle-v1-readonly',
    franchiseId: 'franchise-1',
    seasonId: 'franchise-1-season-2',
    statsScopeId: 'franchise-1-season-2',
    seasonNumber: 2,
    valueInputContractVersion: 'franchise-mode2-value-inputs-v1-readonly',
    generatedAt: 1,
    playerRecords,
    teamRecords: [{
      contractVersion: 'franchise-salary-lifecycle-v1-readonly',
      franchiseId: 'franchise-1',
      seasonId: 'franchise-1-season-2',
      statsScopeId: 'franchise-1-season-2',
      seasonNumber: 2,
      teamId: 'team-1',
      payrollBaseline: 4000000,
      playerCount: 1,
      payrollBaselineState: {
        status: 'stable-baseline',
        persistable: false,
        recalculable: false,
        reasons: ['Stored team payroll baseline is available from the franchise handoff.'],
      },
      limitations: [],
    }],
    policies: {
      luxuryTax: { status: 'blocked', active: false, reasons: ['Luxury tax is inactive for Franchise internal v1.'] },
      salaryMatching: { status: 'blocked', active: false, reasons: ['Salary matching for trades is inactive for Franchise internal v1.'] },
      aiTradeSalaryValuation: { status: 'blocked', active: false, reasons: ['AI trade salary valuation is inactive for Franchise internal v1.'] },
    },
    anyPersistable: false,
    anyRecalculable: false,
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
    status: designationType === 'TEAM_MVP' || designationType === 'ACE' ? 'preview-only' : 'blocked',
    persistable: false,
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
      designationEligibilityRecord('CORNERSTONE', {
        reasons: ['CORNERSTONE is deferred because future value, contract trajectory, morale, and relationship inputs are not canonical in internal v1.'],
      }),
    ],
    anyPersistable: false,
    limitations: [],
    ...overrides,
  };
}

describe('TeamHubContent franchise-owned visible reads', () => {
  beforeEach(() => {
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
          leadership: 92,
          volatility: 12,
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
    mocks.mockBuildFranchiseSalaryLifecycle.mockResolvedValue(salaryLifecycleReport());
    mocks.mockBuildFranchiseDesignationEligibility.mockResolvedValue(designationEligibilityReport());
    mocks.mockSaveFranchiseTeam.mockImplementation(async (_franchiseId: string, team: unknown) => team);
  });

  test('shows copied franchise roster rows and read-only analyzer instead of global/static offseason rows', async () => {
    render(<TeamHubContent />);

    expect(await screen.findAllByText('Copied Alpha')).toHaveLength(2);
    expect(screen.queryByText('Mutable Alpha')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /ROSTER/i }));

    await waitFor(() => expect(screen.getByText('C. Player')).toBeInTheDocument());
    expect(screen.queryByText('G. Template')).not.toBeInTheDocument();
    const mlbTable = screen.getByRole('table', { name: /MLB roster table/i });
    expect(within(mlbTable).queryByText('Farm Hidden')).not.toBeInTheDocument();
    expect(within(mlbTable).queryByText('MORALE')).not.toBeInTheDocument();
    expect(within(mlbTable).queryByText('TRUE VAL')).not.toBeInTheDocument();
    expect(within(mlbTable).queryByText('NET DIFF')).not.toBeInTheDocument();
    expect(screen.getByTestId('franchise-v1-roster-value-gate')).toHaveTextContent(
      'Morale, True Value, and value-delta columns are deferred',
    );
    expect(await screen.findByText('READ-ONLY ROSTER ANALYZER')).toBeInTheDocument();
    expect(screen.getByText('MLB 1')).toBeInTheDocument();
    expect(screen.getByText('FARM 1')).toBeInTheDocument();
    expect(screen.getByText(/No call-ups, send-downs, or roster writes are executed here/)).toBeInTheDocument();
    expect(screen.getByText('Farm advisory only')).toBeInTheDocument();
    expect(screen.getAllByText(/Review farm OF coverage|Monitor Farm Hidden/).length).toBeGreaterThan(0);
    expect(mocks.mockGetFranchiseFarmRoster).toHaveBeenCalledWith('franchise-1', 'franchise-1-season-2', 'team-1');
    expect(mocks.mockSaveFranchiseTeam).not.toHaveBeenCalled();
  });

  test('shows read-only value salary and designation truth labels from lifecycle gates', async () => {
    render(<TeamHubContent />);

    fireEvent.click(await screen.findByRole('button', { name: /ROSTER/i }));
    const truthRegion = await screen.findByRole('region', { name: /Franchise v1 value salary designation truth labels/i });

    expect(within(truthRegion).getByText(/Player salary baseline: STABLE BASELINE/i)).toBeInTheDocument();
    expect(within(truthRegion).getByText(/Team payroll baseline: STABLE BASELINE/i)).toBeInTheDocument();
    expect(within(truthRegion).getByText(/Performance salary movement: BLOCKED/i)).toBeInTheDocument();
    expect(within(truthRegion).getByText(/Offseason salary recalculation: DEFERRED/i)).toBeInTheDocument();
    expect(within(truthRegion).getByText(/True Value \/ value delta: DEFERRED/i)).toBeInTheDocument();
    expect(within(truthRegion).getByText(/Luxury tax, salary matching, and AI salary valuation: BLOCKED \/ INACTIVE/i)).toBeInTheDocument();
    expect(within(truthRegion).getByText(/TEAM_MVP, ACE preview-only eligibility; not winners or saved designations/i)).toBeInTheDocument();
    expect(within(truthRegion).getByText(/FAN_FAVORITE blocked: FAN_FAVORITE requires canonical True Value and value-delta inputs/i)).toBeInTheDocument();
    expect(within(truthRegion).getByText(/ALBATROSS blocked: ALBATROSS requires canonical True Value and value-delta inputs/i)).toBeInTheDocument();
    expect(within(truthRegion).getByText(/No designation records are written from Team Hub/i)).toBeInTheDocument();
    expect(within(truthRegion).queryByText(/MVP winner/i)).not.toBeInTheDocument();
    expect(within(truthRegion).queryByText(/Ace winner/i)).not.toBeInTheDocument();
    expect(within(truthRegion).queryByText(/Fan Favorite designation/i)).not.toBeInTheDocument();
    expect(mocks.mockBuildFranchiseSalaryLifecycle).toHaveBeenCalledWith({
      franchiseId: 'franchise-1',
      seasonId: 'franchise-1-season-2',
      statsScopeId: 'franchise-1-season-2',
      seasonNumber: 2,
    });
    expect(mocks.mockBuildFranchiseDesignationEligibility).toHaveBeenCalled();
    expect(mocks.mockSaveFranchiseTeam).not.toHaveBeenCalled();
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

    expect(within(truthRegion).getByText(/Player salary baseline: PARTIAL \(1 stable \/ 1 missing\)/i)).toBeInTheDocument();
    expect(within(truthRegion).getByText(/Missing salary baseline: 1 players/i)).toBeInTheDocument();
    expect(within(truthRegion).queryByText(/Player salary baseline: STABLE BASELINE/i)).not.toBeInTheDocument();
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
        contractVersion: 'franchise-salary-lifecycle-v1-readonly',
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

    expect(within(truthRegion).getByText(/Player salary baseline: BLOCKED/i)).toBeInTheDocument();
    expect(within(truthRegion).getByText(/Missing salary baseline: 1 players/i)).toBeInTheDocument();
    expect(within(truthRegion).getByText(/Team payroll baseline: BLOCKED/i)).toBeInTheDocument();
    expect(within(truthRegion).getByText(/Team payroll baseline limitation: missing handoff payroll proof/i)).toBeInTheDocument();
    expect(within(truthRegion).getByText(/Team payroll baseline is unavailable for salary\/value designation checks/i)).toBeInTheDocument();
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
            'FARM player salary context is read-only; FARM players are not eligible for MLB salary movement in this slice.',
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

    expect(within(truthRegion).getByText(/FARM player salary context is read-only/i)).toBeInTheDocument();
    expect(within(truthRegion).getByText(/FAN_FAVORITE blocked: FAN_FAVORITE requires canonical True Value and value-delta inputs/i)).toBeInTheDocument();
    expect(within(truthRegion).queryByText(/trueGrade/i)).not.toBeInTheDocument();
    expect(within(truthRegion).queryByText(/hiddenPersonalityModifiers/i)).not.toBeInTheDocument();
    expect(mocks.mockSaveFranchiseTeam).not.toHaveBeenCalled();
  });

  test('renders hidden-safe FARM player inspection without MLB row leakage', async () => {
    render(<TeamHubContent />);

    fireEvent.click(await screen.findByRole('button', { name: /ROSTER/i }));

    const farmRegion = await screen.findByRole('region', { name: /Franchise FARM prospects/i });
    const mlbTable = screen.getByRole('table', { name: /MLB roster table/i });

    expect(within(farmRegion).getByText('Farm Hidden')).toBeInTheDocument();
    expect(within(farmRegion).getByText(/CF · Age 21 · B\/T L\/R/i)).toBeInTheDocument();
    expect(within(farmRegion).getByText(/Scouted:/i)).toBeInTheDocument();
    expect(within(farmRegion).getByText('B')).toBeInTheDocument();
    expect(within(farmRegion).getByText(/Potential:/i)).toBeInTheDocument();
    expect(within(farmRegion).getByText('A-')).toBeInTheDocument();
    expect(within(farmRegion).getByText(/Confidence: medium/i)).toBeInTheDocument();
    expect(within(farmRegion).getByText(/Chemistry: Spirited/i)).toBeInTheDocument();
    expect(within(farmRegion).getByText(/Personality: Jolly/i)).toBeInTheDocument();
    expect(within(farmRegion).getByText(/Traits: Sprinter/i)).toBeInTheDocument();
    expect(within(farmRegion).getByText(/Salary: \$1.0M/i)).toBeInTheDocument();
    expect(within(farmRegion).getByText(/Options used: 1/i)).toBeInTheDocument();
    expect(within(farmRegion).getByText(/Option dates: None/i)).toBeInTheDocument();
    expect(within(farmRegion).getAllByText(/^HIDDEN$/i).length).toBeGreaterThan(0);
    expect(within(mlbTable).queryByText('Farm Hidden')).not.toBeInTheDocument();
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
    expect(within(manager).getByText(/Starter Alpha \(SP\)/i)).toBeInTheDocument();
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
