import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  mockUseOffseasonData: vi.fn(),
  mockUseFranchiseDataContext: vi.fn(),
  mockUseSeasonStats: vi.fn(),
  mockGetFranchiseTeam: vi.fn(),
  mockGetAllFranchisePlayers: vi.fn(),
  mockGetFranchiseFarmRoster: vi.fn(),
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

import { TeamHubContent } from '../../app/components/TeamHubContent';

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
  });

  test('shows copied franchise roster rows and read-only analyzer instead of global/static offseason rows', async () => {
    render(<TeamHubContent />);

    expect(await screen.findAllByText('Copied Alpha')).toHaveLength(2);
    expect(screen.queryByText('Mutable Alpha')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /ROSTER/i }));

    await waitFor(() => expect(screen.getByText('C. Player')).toBeInTheDocument());
    expect(screen.queryByText('G. Template')).not.toBeInTheDocument();
    expect(within(screen.getByRole('table', { name: /MLB roster table/i })).queryByText('Farm Hidden')).not.toBeInTheDocument();
    expect(await screen.findByText('READ-ONLY ROSTER ANALYZER')).toBeInTheDocument();
    expect(screen.getByText('MLB 1')).toBeInTheDocument();
    expect(screen.getByText('FARM 1')).toBeInTheDocument();
    expect(screen.getByText(/No call-ups, send-downs, or roster writes are executed here/)).toBeInTheDocument();
    expect(screen.getByText('Farm advisory only')).toBeInTheDocument();
    expect(screen.getAllByText(/Review farm OF coverage|Monitor Farm Hidden/).length).toBeGreaterThan(0);
    expect(mocks.mockGetFranchiseFarmRoster).toHaveBeenCalledWith('franchise-1', 'franchise-1-season-2', 'team-1');
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
});
