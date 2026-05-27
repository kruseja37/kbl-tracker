import 'fake-indexeddb/auto';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  mockUseOffseasonData: vi.fn(),
  mockCreateFranchisePlayerStorageAdapter: vi.fn(),
  mockExecuteSeasonTransition: vi.fn(),
  mockUpdateFranchiseMetadata: vi.fn(),
  mockGetActiveFranchise: vi.fn(),
  mockInitializeEmptyFranchiseSeasonSchedule: vi.fn(),
  mockCreateFranchiseSeasonSummary: vi.fn(),
  mockClearFranchiseSeasonSchedule: vi.fn(),
  mockGetAllGamesByFranchise: vi.fn(),
  mockDeleteSeasonMetadata: vi.fn(),
  mockValidateFranchisePhase11RosterLock: vi.fn(),
  mockPlanFranchisePhase11Roster: vi.fn(),
  mockReleaseFranchisePhase11Player: vi.fn(),
  mockSignFranchisePhase11Player: vi.fn(),
  mockGetAllFranchisePlayers: vi.fn(),
}));

vi.mock('@/hooks/useOffseasonData', () => ({
  useOffseasonData: mocks.mockUseOffseasonData,
}));

vi.mock('../../../engines/seasonTransitionEngine', () => ({
  createFranchisePlayerStorageAdapter: mocks.mockCreateFranchisePlayerStorageAdapter,
  executeSeasonTransition: mocks.mockExecuteSeasonTransition,
}));

vi.mock('../../../utils/franchiseManager', () => ({
  getActiveFranchise: mocks.mockGetActiveFranchise,
  updateFranchiseMetadata: mocks.mockUpdateFranchiseMetadata,
}));

vi.mock('../../../utils/franchiseInitializer', () => ({
  initializeEmptyFranchiseSeasonSchedule: mocks.mockInitializeEmptyFranchiseSeasonSchedule,
}));

vi.mock('../../../utils/franchiseSeasonSummaryStorage', () => ({
  createFranchiseSeasonSummary: mocks.mockCreateFranchiseSeasonSummary,
}));

vi.mock('../../../utils/scheduleStorage', () => ({
  clearFranchiseSeasonSchedule: mocks.mockClearFranchiseSeasonSchedule,
  getAllGamesByFranchise: mocks.mockGetAllGamesByFranchise,
}));

vi.mock('../../../utils/seasonStorage', () => ({
  deleteSeasonMetadata: mocks.mockDeleteSeasonMetadata,
}));

vi.mock('../../../utils/franchiseRosterLockValidator', () => ({
  validateFranchisePhase11RosterLock: mocks.mockValidateFranchisePhase11RosterLock,
}));

vi.mock('../../../utils/franchisePhase11RosterPlanner', () => ({
  planFranchisePhase11Roster: mocks.mockPlanFranchisePhase11Roster,
}));

vi.mock('../../../utils/franchisePhase11RosterActions', () => ({
  releaseFranchisePhase11Player: mocks.mockReleaseFranchisePhase11Player,
  signFranchisePhase11Player: mocks.mockSignFranchisePhase11Player,
}));

vi.mock('../../../utils/franchisePlayerStorage', () => ({
  getAllFranchisePlayers: mocks.mockGetAllFranchisePlayers,
}));

vi.mock('@/app/components/SpringTrainingFlow', () => ({
  SpringTrainingFlow: () => <div data-testid="spring-training-flow" />,
}));

import { FinalizeAdvanceFlow } from '../../app/components/FinalizeAdvanceFlow';

function makePlayers(teamId: string) {
  const positions = ['SP', 'RP', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'] as const;
  return Array.from({ length: 32 }, (_, index) => ({
    id: `${teamId}-player-${index + 1}`,
    name: `Player ${index + 1}`,
    position: positions[index % positions.length],
    grade: 'B' as const,
    personality: 'COMPETITIVE' as const,
    salary: 1,
    teamId,
    age: 25,
    seasons: 1,
    war: 1,
    jerseyNumber: index + 1,
    awards: [],
    careerStats: '',
  }));
}

function makePhase11Plan(overrides: Partial<any> = {}) {
  return {
    valid: false,
    franchiseId: 'franchise-1',
    seasonId: 'franchise-1-season-1',
    checkedTeamIds: ['team-a'],
    totals: {
      mlbCount: 23,
      farmCount: 9,
      totalCount: 32,
      requiredCuts: 1,
      requiredSignings: 1,
      requiredFarmCorrections: 0,
    },
    teams: [
      {
        teamId: 'team-a',
        teamName: 'Team A',
        mlbCount: 23,
        farmCount: 9,
        totalCount: 32,
        requiredCuts: 1,
        requiredSignings: 1,
        requiredFarmCorrections: 0,
        requirements: [
          {
            teamId: 'team-a',
            action: 'CUT_MLB',
            count: 1,
            message: 'team-a must cut or release 1 MLB player.',
          },
          {
            teamId: 'team-a',
            action: 'SIGN_FARM',
            count: 1,
            message: 'team-a must sign or assign 1 farm player.',
          },
        ],
        lockIssues: [
          {
            code: 'MLB_COUNT_MISMATCH',
            severity: 'error',
            teamId: 'team-a',
            message: 'team-a has 23 MLB players.',
          },
        ],
      },
    ],
    blockingLockIssues: [
      {
        code: 'MLB_COUNT_MISMATCH',
        severity: 'error',
        teamId: 'team-a',
        message: 'team-a has 23 MLB players.',
      },
    ],
    warnings: ['released players are excluded from lock counts'],
    limitations: [
      'Phase 11 planner is read-only and does not choose players to cut, release, sign, or move.',
    ],
    ...overrides,
  };
}

function makeFranchisePlayers() {
  return [
    {
      id: 'release-player',
      firstName: 'Release',
      lastName: 'Candidate',
      leagueAssignments: [{ leagueId: 'league-1', teamId: 'team-a', rosterStatus: 'MLB' }],
    },
    {
      id: 'sign-player',
      firstName: 'Sign',
      lastName: 'Candidate',
      leagueAssignments: [{ leagueId: 'league-1', teamId: '', rosterStatus: 'FREE_AGENT' }],
    },
    {
      id: 'inactive-player',
      firstName: 'Inactive',
      lastName: 'Blocked',
      leagueAssignments: [{ leagueId: 'league-1', teamId: '', rosterStatus: 'INACTIVE' }],
    },
  ];
}

async function startFinalizeTransition() {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Continue to Advance →' }));
  });
  await screen.findByText(/ROSTER STATUS:/);
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Continue →' }));
  });
  await screen.findByText(/TRANSACTION REPORT/);
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Continue to Advance →' }));
  });
}

describe('FinalizeAdvanceFlow Pass 1A rollback safety', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mockUseOffseasonData.mockReturnValue({
      teams: [
        {
          id: 'team-a',
          name: 'Team A',
          shortName: 'A',
          stadium: 'Park',
          record: { wins: 0, losses: 0 },
          primaryColor: '#111111',
          secondaryColor: '#222222',
        },
      ],
      players: makePlayers('team-a'),
      hasRealData: true,
      isLoading: false,
      error: null,
      getTeamById: vi.fn(),
      getPlayerById: vi.fn(),
      getTeamRoster: vi.fn(),
      retirementCandidates: [],
      getRetirementProbability: vi.fn(() => 0),
      freeAgents: [],
      refresh: vi.fn().mockResolvedValue(undefined),
    });
    mocks.mockCreateFranchisePlayerStorageAdapter.mockReturnValue({ storage: 'franchise' });
    mocks.mockCreateFranchiseSeasonSummary.mockResolvedValue({ seasonId: 'franchise-1-season-1' });
    mocks.mockExecuteSeasonTransition.mockResolvedValue({
      success: true,
      steps: [],
      summary: {
        playersAged: 0,
        salariesRecalculated: 0,
        mojosReset: 0,
        rookiesApplied: 0,
        serviceIncremented: 0,
        previousSeason: 1,
        newSeason: 2,
      },
    });
    mocks.mockUpdateFranchiseMetadata.mockResolvedValue(undefined);
    mocks.mockGetActiveFranchise.mockResolvedValue('franchise-1');
    mocks.mockInitializeEmptyFranchiseSeasonSchedule.mockResolvedValue(0);
    mocks.mockGetAllGamesByFranchise.mockResolvedValue([]);
    mocks.mockClearFranchiseSeasonSchedule.mockResolvedValue(undefined);
    mocks.mockDeleteSeasonMetadata.mockResolvedValue(undefined);
    mocks.mockValidateFranchisePhase11RosterLock.mockResolvedValue({
      valid: true,
      franchiseId: 'franchise-1',
      seasonId: 'franchise-1-season-1',
      checkedTeamIds: ['team-a'],
      countsByTeam: [{ teamId: 'team-a', mlbCount: 22, farmCount: 10, totalCount: 32, excludedCount: 0 }],
      issues: [],
    });
    mocks.mockPlanFranchisePhase11Roster.mockResolvedValue(makePhase11Plan());
    mocks.mockGetAllFranchisePlayers.mockResolvedValue(makeFranchisePlayers());
    mocks.mockReleaseFranchisePhase11Player.mockResolvedValue({
      success: true,
      action: 'release',
      affectedPlayerId: 'release-player',
      affectedTeamId: 'team-a',
      phaseContext: 'PHASE_11_FINALIZE',
      transactionId: 'txn-release',
    });
    mocks.mockSignFranchisePhase11Player.mockResolvedValue({
      success: true,
      action: 'sign',
      affectedPlayerId: 'sign-player',
      affectedTeamId: 'team-a',
      phaseContext: 'PHASE_11_FINALIZE',
      transactionId: 'txn-sign',
    });
  });

  test('does not advance franchise metadata when empty schedule initialization fails', async () => {
    mocks.mockInitializeEmptyFranchiseSeasonSchedule.mockRejectedValueOnce(new Error('schedule failed'));

    render(
      <FinalizeAdvanceFlow
        franchiseId="franchise-1"
        seasonNumber={1}
        seasonId="franchise-1-season-1"
        onClose={vi.fn()}
        onAdvanceComplete={vi.fn()}
      />,
    );

    await startFinalizeTransition();

    await waitFor(() => {
      expect(screen.getByText(/schedule failed/)).toBeInTheDocument();
    });
    expect(screen.getByText(/SEASON TRANSITION NEEDS ATTENTION/)).toBeInTheDocument();
    expect(screen.queryByText('PROCESSING SEASON TRANSITION')).toBeNull();
    expect(screen.queryByText(/Please wait while we prepare Season 2/)).toBeNull();
    expect(mocks.mockCreateFranchiseSeasonSummary).toHaveBeenCalledWith({
      franchiseId: 'franchise-1',
      seasonNumber: 1,
      playoffId: undefined,
    });
    expect(mocks.mockInitializeEmptyFranchiseSeasonSchedule).toHaveBeenCalledWith('franchise-1', 2);
    expect(mocks.mockUpdateFranchiseMetadata).not.toHaveBeenCalled();
    expect(mocks.mockClearFranchiseSeasonSchedule).toHaveBeenCalledWith('franchise-1', 2);
    expect(mocks.mockDeleteSeasonMetadata).toHaveBeenCalledWith('franchise-1-season-2');
  });

  test('does not stage schedule or advance metadata when transition returns failure', async () => {
    mocks.mockExecuteSeasonTransition.mockResolvedValueOnce({
      success: false,
      steps: [{ name: 'Increment Ages', status: 'error', error: 'age step failed' }],
      summary: {
        playersAged: 0,
        salariesRecalculated: 0,
        mojosReset: 0,
        rookiesApplied: 0,
        serviceIncremented: 0,
        previousSeason: 1,
        newSeason: 2,
      },
    });

    render(
      <FinalizeAdvanceFlow
        franchiseId="franchise-1"
        seasonNumber={1}
        seasonId="franchise-1-season-1"
        onClose={vi.fn()}
        onAdvanceComplete={vi.fn()}
      />,
    );

    await startFinalizeTransition();

    await waitFor(() => {
      expect(screen.getByText(/age step failed/)).toBeInTheDocument();
    });
    expect(mocks.mockCreateFranchiseSeasonSummary).toHaveBeenCalledWith({
      franchiseId: 'franchise-1',
      seasonNumber: 1,
      playoffId: undefined,
    });
    expect(mocks.mockInitializeEmptyFranchiseSeasonSchedule).not.toHaveBeenCalled();
    expect(mocks.mockUpdateFranchiseMetadata).not.toHaveBeenCalled();
    expect(mocks.mockClearFranchiseSeasonSchedule).not.toHaveBeenCalled();
    expect(mocks.mockDeleteSeasonMetadata).not.toHaveBeenCalled();
  });

  test('blocks franchise finalization when durable Phase 11 roster lock fails', async () => {
    mocks.mockValidateFranchisePhase11RosterLock.mockResolvedValueOnce({
      valid: false,
      franchiseId: 'franchise-1',
      seasonId: 'franchise-1-season-1',
      checkedTeamIds: ['team-a'],
      countsByTeam: [{ teamId: 'team-a', mlbCount: 21, farmCount: 10, totalCount: 31, excludedCount: 0 }],
      issues: [{ code: 'MLB_COUNT_MISMATCH', severity: 'error', message: 'team-a has 21 MLB players.' }],
    });

    render(
      <FinalizeAdvanceFlow
        franchiseId="franchise-1"
        seasonNumber={1}
        seasonId="franchise-1-season-1"
        onClose={vi.fn()}
        onAdvanceComplete={vi.fn()}
      />,
    );

    await startFinalizeTransition();

    await waitFor(() => {
      expect(screen.getByText(/Franchise Phase 11 roster lock failed/i)).toBeInTheDocument();
    });
    expect(mocks.mockExecuteSeasonTransition).not.toHaveBeenCalled();
    expect(mocks.mockInitializeEmptyFranchiseSeasonSchedule).not.toHaveBeenCalled();
    expect(mocks.mockUpdateFranchiseMetadata).not.toHaveBeenCalled();
  });

  test('renders Phase 11 correction surface with planner counts and structured issues', async () => {
    mocks.mockValidateFranchisePhase11RosterLock.mockResolvedValueOnce({
      valid: false,
      franchiseId: 'franchise-1',
      seasonId: 'franchise-1-season-1',
      checkedTeamIds: ['team-a'],
      countsByTeam: [{ teamId: 'team-a', mlbCount: 23, farmCount: 9, totalCount: 32, excludedCount: 0 }],
      issues: [{ code: 'MLB_COUNT_MISMATCH', severity: 'error', message: 'team-a has 23 MLB players.' }],
    });

    render(
      <FinalizeAdvanceFlow
        franchiseId="franchise-1"
        seasonNumber={1}
        seasonId="franchise-1-season-1"
        onClose={vi.fn()}
        onAdvanceComplete={vi.fn()}
      />,
    );

    await startFinalizeTransition();

    expect(await screen.findByText(/PHASE 11 FINAL ROSTER CORRECTION/i)).toBeInTheDocument();
    expect(screen.getByText(/23 MLB \| 9 FARM \| 32 Total/i)).toBeInTheDocument();
    expect(screen.getAllByText(/MLB_COUNT_MISMATCH/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/not free agency, draft, trade, retirement execution/i)).toBeInTheDocument();
    expect(screen.getByText(/compensating rollback, not true cross-store atomicity/i)).toBeInTheDocument();
    expect(mocks.mockPlanFranchisePhase11Roster).toHaveBeenCalledWith({
      franchiseId: 'franchise-1',
      seasonId: 'franchise-1-season-1',
    });
    expect(mocks.mockGetAllFranchisePlayers).toHaveBeenCalledWith('franchise-1');
  });

  test('release correction requires confirmation, calls durable primitive, refreshes plan, and does not auto-finalize', async () => {
    mocks.mockValidateFranchisePhase11RosterLock.mockResolvedValueOnce({
      valid: false,
      franchiseId: 'franchise-1',
      seasonId: 'franchise-1-season-1',
      checkedTeamIds: ['team-a'],
      countsByTeam: [{ teamId: 'team-a', mlbCount: 23, farmCount: 9, totalCount: 32, excludedCount: 0 }],
      issues: [{ code: 'MLB_COUNT_MISMATCH', severity: 'error', message: 'team-a has 23 MLB players.' }],
    });
    mocks.mockPlanFranchisePhase11Roster
      .mockResolvedValueOnce(makePhase11Plan())
      .mockResolvedValueOnce(makePhase11Plan({
        valid: true,
        totals: { mlbCount: 22, farmCount: 10, totalCount: 32, requiredCuts: 0, requiredSignings: 0, requiredFarmCorrections: 0 },
        teams: [{
          ...makePhase11Plan().teams[0],
          mlbCount: 22,
          farmCount: 10,
          totalCount: 32,
          requirements: [],
          lockIssues: [],
        }],
        blockingLockIssues: [],
        warnings: [],
      }));

    render(
      <FinalizeAdvanceFlow
        franchiseId="franchise-1"
        seasonNumber={1}
        seasonId="franchise-1-season-1"
        onClose={vi.fn()}
        onAdvanceComplete={vi.fn()}
      />,
    );

    await startFinalizeTransition();
    await screen.findByText(/PHASE 11 FINAL ROSTER CORRECTION/i);

    fireEvent.click(screen.getByRole('button', { name: 'Release' }));
    expect(screen.getAllByText(/Confirm Phase 11 correction/i).length).toBeGreaterThan(0);
    expect(mocks.mockReleaseFranchisePhase11Player).not.toHaveBeenCalled();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Confirm Phase 11 Correction/i }));
    });

    expect(mocks.mockReleaseFranchisePhase11Player).toHaveBeenCalledWith({
      franchiseId: 'franchise-1',
      seasonId: 'franchise-1-season-1',
      statsScopeId: 'franchise-1-season-1',
      seasonNumber: 1,
      offseasonStateId: 'offseason-franchise-1-season-1',
      teamId: 'team-a',
      playerId: 'release-player',
      actor: 'USER',
      reason: 'Phase 11 final roster correction',
    });
    expect(await screen.findByText(/Phase 11 correction saved/i)).toBeInTheDocument();
    expect(screen.getByText(/Durable Phase 11 roster lock is valid/i)).toBeInTheDocument();
    expect(mocks.mockPlanFranchisePhase11Roster).toHaveBeenCalledTimes(2);
    expect(mocks.mockExecuteSeasonTransition).not.toHaveBeenCalled();
  });

  test('sign correction requires confirmation and only exposes eligible franchise-owned candidates', async () => {
    mocks.mockValidateFranchisePhase11RosterLock.mockResolvedValueOnce({
      valid: false,
      franchiseId: 'franchise-1',
      seasonId: 'franchise-1-season-1',
      checkedTeamIds: ['team-a'],
      countsByTeam: [{ teamId: 'team-a', mlbCount: 21, farmCount: 10, totalCount: 31, excludedCount: 0 }],
      issues: [{ code: 'MLB_COUNT_MISMATCH', severity: 'error', message: 'team-a has 21 MLB players.' }],
    });

    render(
      <FinalizeAdvanceFlow
        franchiseId="franchise-1"
        seasonNumber={1}
        seasonId="franchise-1-season-1"
        onClose={vi.fn()}
        onAdvanceComplete={vi.fn()}
      />,
    );

    await startFinalizeTransition();
    await screen.findByText(/PHASE 11 FINAL ROSTER CORRECTION/i);

    expect(screen.getByText(/Sign Candidate/i)).toBeInTheDocument();
    expect(screen.queryByText(/Inactive Blocked/i)).toBeNull();
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Sign FARM' }));
    });
    expect(screen.getAllByText(/Confirm Phase 11 correction/i).length).toBeGreaterThan(0);

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Confirm Phase 11 Correction/i }));
    });

    expect(mocks.mockSignFranchisePhase11Player).toHaveBeenCalledWith({
      franchiseId: 'franchise-1',
      seasonId: 'franchise-1-season-1',
      statsScopeId: 'franchise-1-season-1',
      seasonNumber: 1,
      offseasonStateId: 'offseason-franchise-1-season-1',
      teamId: 'team-a',
      playerId: 'sign-player',
      actor: 'USER',
      targetRosterStatus: 'FARM',
    });
  });

  test('failed Phase 11 action displays structured errors and rollback details', async () => {
    mocks.mockValidateFranchisePhase11RosterLock.mockResolvedValueOnce({
      valid: false,
      franchiseId: 'franchise-1',
      seasonId: 'franchise-1-season-1',
      checkedTeamIds: ['team-a'],
      countsByTeam: [{ teamId: 'team-a', mlbCount: 23, farmCount: 9, totalCount: 32, excludedCount: 0 }],
      issues: [{ code: 'MLB_COUNT_MISMATCH', severity: 'error', message: 'team-a has 23 MLB players.' }],
    });
    mocks.mockReleaseFranchisePhase11Player.mockResolvedValueOnce({
      success: false,
      action: 'release',
      affectedPlayerId: 'release-player',
      affectedTeamId: 'team-a',
      phaseContext: 'PHASE_11_FINALIZE',
      errorCode: 'ROLLBACK_FAILED',
      errorMessage: 'transaction failed',
      rollbackStatus: {
        attempted: true,
        success: false,
        errors: ['player rollback failed: rollback write failed'],
      },
    });

    render(
      <FinalizeAdvanceFlow
        franchiseId="franchise-1"
        seasonNumber={1}
        seasonId="franchise-1-season-1"
        onClose={vi.fn()}
        onAdvanceComplete={vi.fn()}
      />,
    );

    await startFinalizeTransition();
    await screen.findByText(/PHASE 11 FINAL ROSTER CORRECTION/i);
    fireEvent.click(screen.getByRole('button', { name: 'Release' }));
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Confirm Phase 11 Correction/i }));
    });

    expect(await screen.findByText(/Phase 11 correction failed/i)).toBeInTheDocument();
    expect(screen.getByText(/ROLLBACK_FAILED: transaction failed/i)).toBeInTheDocument();
    expect(screen.getByText(/Rollback attempted: yes/i)).toBeInTheDocument();
    expect(screen.getByText(/player rollback failed: rollback write failed/i)).toBeInTheDocument();
  });
});
