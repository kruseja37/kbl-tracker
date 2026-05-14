/**
 * LeagueBuilderRosters Component Tests
 *
 * Tests the rosters management page with team roster operations.
 * Per Ralph Framework S-B017
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LeagueBuilderRosters } from '../../app/pages/LeagueBuilderRosters';
import { buildLineupSnapshotFromSlots } from '../../../utils/optimalLineup';

// ============================================
// MOCKS
// ============================================

const mockNavigate = vi.fn();

vi.mock('react-router', () => ({
  useNavigate: () => mockNavigate,
}));

const mockGetRoster = vi.fn().mockResolvedValue(null);
const mockUpdateRoster = vi.fn().mockResolvedValue(undefined);

vi.mock('../../hooks/useLeagueBuilderData', () => ({
  useLeagueBuilderData: vi.fn(() => ({
    leagues: [
      { id: 'league-1', name: 'League One', teamIds: ['team-1', 'team-2'] },
    ],
    teams: [
      {
        id: 'team-1',
        name: 'Boston Sox',
        abbreviation: 'SOX',
        colors: { primary: '#FF0000', secondary: '#FFFFFF' },
        leagueIds: ['league-1'],
      },
      {
        id: 'team-2',
        name: 'Detroit Tigers',
        abbreviation: 'DET',
        colors: { primary: '#FF6600', secondary: '#000000' },
        leagueIds: ['league-1'],
      },
    ],
    players: [
      {
        id: 'player-1',
        firstName: 'John',
        lastName: 'Smith',
        primaryPosition: 'SS',
        secondaryPosition: '2B',
        overallGrade: 'A-',
        leagueAssignments: [{ leagueId: 'league-1', teamId: 'team-1', rosterStatus: 'MLB' }],
      },
      {
        id: 'player-2',
        firstName: 'Jane',
        lastName: 'Doe',
        primaryPosition: 'SP',
        secondaryPosition: '',
        overallGrade: 'A',
        leagueAssignments: [{ leagueId: 'league-1', teamId: 'team-1', rosterStatus: 'MLB' }],
      },
      {
        id: 'player-3',
        firstName: 'Bob',
        lastName: 'Jones',
        primaryPosition: 'CF',
        secondaryPosition: 'RF',
        overallGrade: 'A',
        leagueAssignments: [{ leagueId: 'league-1', teamId: 'team-2', rosterStatus: 'MLB' }],
      },
    ],
    isLoading: false,
    error: null,
    getRoster: mockGetRoster,
    updateRoster: mockUpdateRoster,
  })),
}));

// ============================================
// TESTS
// ============================================

describe('LeagueBuilderRosters Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Header', () => {
    test('renders ROSTERS title', () => {
      render(<LeagueBuilderRosters />);
      expect(screen.getByText('ROSTERS')).toBeInTheDocument();
    });

    test('renders back button', () => {
      render(<LeagueBuilderRosters />);
      const buttons = screen.getAllByRole('button');
      expect(buttons[0]).toBeInTheDocument();
    });

    test('back button navigates to league builder', () => {
      render(<LeagueBuilderRosters />);
      const buttons = screen.getAllByRole('button');
      fireEvent.click(buttons[0]);
      expect(mockNavigate).toHaveBeenCalledWith('/league-builder');
    });
  });

  describe('Teams List', () => {
    test('renders TEAMS header with count', () => {
      render(<LeagueBuilderRosters />);
      expect(screen.getByText('TEAMS (2)')).toBeInTheDocument();
    });

    test('renders team names', () => {
      render(<LeagueBuilderRosters />);
      expect(screen.getByText('Boston Sox')).toBeInTheDocument();
      expect(screen.getByText('Detroit Tigers')).toBeInTheDocument();
    });

    test('renders player counts for teams', () => {
      render(<LeagueBuilderRosters />);
      expect(screen.getByText('2 players')).toBeInTheDocument();
      expect(screen.getByText('1 players')).toBeInTheDocument();
    });
  });

  describe('Team Selection', () => {
    test('clicking team selects it', async () => {
      render(<LeagueBuilderRosters />);
      fireEvent.click(screen.getByText('Boston Sox'));

      await waitFor(() => {
        // Should show roster tabs when team selected
        expect(screen.getByRole('button', { name: 'ROSTER' })).toBeInTheDocument();
      });
    });

    test('shows team header when selected', async () => {
      render(<LeagueBuilderRosters />);
      fireEvent.click(screen.getByText('Boston Sox'));

      await waitFor(() => {
        // Team name appears in header
        expect(screen.getAllByText('Boston Sox').length).toBeGreaterThan(0);
      });
    });
  });

  describe('Tabs', () => {
    test('renders roster, lineup, rotation, depth tabs', async () => {
      render(<LeagueBuilderRosters />);
      fireEvent.click(screen.getByText('Boston Sox'));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'ROSTER' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'LINEUP' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'ROTATION' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'DEPTH' })).toBeInTheDocument();
      });
    });

    test('clicking lineup tab shows lineup view', async () => {
      render(<LeagueBuilderRosters />);
      fireEvent.click(screen.getByText('Boston Sox'));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'LINEUP' })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: 'LINEUP' }));

      await waitFor(() => {
        // Lineup tab shows DH/No DH options
        expect(screen.getByText('DH')).toBeInTheDocument();
        expect(screen.getByText('No DH')).toBeInTheDocument();
      });
    });

    test('clicking rotation tab shows pitching rotation', async () => {
      render(<LeagueBuilderRosters />);
      fireEvent.click(screen.getByText('Boston Sox'));

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'ROTATION' })).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: 'ROTATION' }));

      await waitFor(() => {
        expect(screen.getByText('STARTERS (0)')).toBeInTheDocument();
        expect(screen.getByText('CLOSER')).toBeInTheDocument();
      });
    });
  });

  describe('Roster Tab', () => {
    test('shows MLB roster section', async () => {
      render(<LeagueBuilderRosters />);
      fireEvent.click(screen.getByText('Boston Sox'));

      await waitFor(() => {
        expect(screen.getByText('MLB ROSTER (0)')).toBeInTheDocument();
      });
    });

    test('shows AAA roster section', async () => {
      render(<LeagueBuilderRosters />);
      fireEvent.click(screen.getByText('Boston Sox'));

      await waitFor(() => {
        expect(screen.getByText('AAA ROSTER (0)')).toBeInTheDocument();
      });
    });

    test('shows unassigned section', async () => {
      render(<LeagueBuilderRosters />);
      fireEvent.click(screen.getByText('Boston Sox'));

      await waitFor(() => {
        expect(screen.getByText('UNASSIGNED (2)')).toBeInTheDocument();
      });
    });

    test('marks saved optimal lineup snapshots stale when roster membership changes', async () => {
      const savedOptimal = buildLineupSnapshotFromSlots({
        teamId: 'team-1',
        mode: 'exhibition',
        opposingPitcherHand: 'R',
        candidates: [
          {
            playerId: 'player-1',
            playerName: 'John Smith',
            primaryPosition: 'SS',
          },
        ],
        dhEnabled: true,
        generatedAt: 100,
        generatedFrom: 'user_registered_smb4_optimal',
        sourceConfidence: 'user_registered',
        slots: [
          {
            playerId: 'player-1',
            playerName: 'John Smith',
            battingOrderSlot: 1,
            defensivePosition: 'SS',
          },
        ],
      });
      mockGetRoster.mockResolvedValueOnce({
        teamId: 'team-1',
        mlbRoster: ['player-1', 'player-2'],
        farmRoster: [],
        lineupWithDH: [{ battingOrder: 1, playerId: 'player-1', fieldingPosition: 'SS' }],
        lineupWithoutDH: [],
        optimalLineupVsRHPWithDH: savedOptimal,
        optimalLineupVsLHPWithDH: undefined,
        optimalLineupVsRHPWithoutDH: undefined,
        optimalLineupVsLHPWithoutDH: undefined,
        startingRotation: ['player-2'],
        longRelievers: [],
        closingPitcher: '',
        setupPitchers: [],
        depthChart: {
          C: [],
          '1B': [],
          '2B': [],
          SS: ['player-1'],
          '3B': [],
          LF: [],
          CF: [],
          RF: [],
          DH: [],
          SP: ['player-2'],
          RP: [],
          CP: [],
        },
        pinchHitOrder: [],
        pinchRunOrder: [],
        defensiveSubOrder: [],
        lastModified: 'roster-v1',
      });

      render(<LeagueBuilderRosters />);
      fireEvent.click(screen.getByText('Boston Sox'));

      await screen.findByText('MLB ROSTER (2)');
      fireEvent.click(screen.getAllByRole('button', { name: /AAA/ })[0]);
      fireEvent.click(screen.getByRole('button', { name: /SAVE/ }));

      await waitFor(() => expect(mockUpdateRoster).toHaveBeenCalled());
      const savedRoster = mockUpdateRoster.mock.calls.at(-1)?.[0];
      expect(savedRoster.optimalLineupVsRHPWithDH.sourceConfidence).toBe('stale_roster');
      expect(savedRoster.optimalLineupVsRHPWithDH.confidence).toBe('low');
      expect(savedRoster.optimalLineupVsRHPWithDH.slots).toEqual(savedOptimal.slots);
    });
  });

  describe('Empty State', () => {
    test('shows select team message when no team selected', () => {
      render(<LeagueBuilderRosters />);
      expect(screen.getByText('Select a team to manage their roster')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    test('shows loading indicator when isLoading', async () => {
      const { useLeagueBuilderData } = await import('../../hooks/useLeagueBuilderData');
      vi.mocked(useLeagueBuilderData).mockReturnValue({
        teams: [],
        players: [],
        leagues: [],
        rulesPresets: [],
        isLoading: true,
        error: null,
        getRoster: mockGetRoster,
        updateRoster: mockUpdateRoster,
        createLeague: vi.fn(),
        updateLeague: vi.fn(),
        removeLeague: vi.fn(),
        duplicateLeague: vi.fn(),
        createTeam: vi.fn(),
        updateTeam: vi.fn(),
        removeTeam: vi.fn(),
        createPlayer: vi.fn(),
        updatePlayer: vi.fn(),
        removePlayer: vi.fn(),
        createRulesPreset: vi.fn(),
        updateRulesPreset: vi.fn(),
        removeRulesPreset: vi.fn(),
        refresh: vi.fn(),
      });

      render(<LeagueBuilderRosters />);
      expect(screen.getByText('Loading rosters...')).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    test('shows error message when error occurs', async () => {
      const { useLeagueBuilderData } = await import('../../hooks/useLeagueBuilderData');
      vi.mocked(useLeagueBuilderData).mockReturnValue({
        teams: [],
        players: [],
        leagues: [],
        rulesPresets: [],
        isLoading: false,
        error: 'Failed to load rosters',
        getRoster: mockGetRoster,
        updateRoster: mockUpdateRoster,
        createLeague: vi.fn(),
        updateLeague: vi.fn(),
        removeLeague: vi.fn(),
        duplicateLeague: vi.fn(),
        createTeam: vi.fn(),
        updateTeam: vi.fn(),
        removeTeam: vi.fn(),
        createPlayer: vi.fn(),
        updatePlayer: vi.fn(),
        removePlayer: vi.fn(),
        createRulesPreset: vi.fn(),
        updateRulesPreset: vi.fn(),
        removeRulesPreset: vi.fn(),
        refresh: vi.fn(),
      });

      render(<LeagueBuilderRosters />);
      expect(screen.getByText(/Failed to load rosters/)).toBeInTheDocument();
    });
  });

  describe('No Teams State', () => {
    test('shows no teams message when teams empty', async () => {
      const { useLeagueBuilderData } = await import('../../hooks/useLeagueBuilderData');
      vi.mocked(useLeagueBuilderData).mockReturnValue({
        teams: [],
        players: [],
        leagues: [],
        rulesPresets: [],
        isLoading: false,
        error: null,
        getRoster: mockGetRoster,
        updateRoster: mockUpdateRoster,
        createLeague: vi.fn(),
        updateLeague: vi.fn(),
        removeLeague: vi.fn(),
        duplicateLeague: vi.fn(),
        createTeam: vi.fn(),
        updateTeam: vi.fn(),
        removeTeam: vi.fn(),
        createPlayer: vi.fn(),
        updatePlayer: vi.fn(),
        removePlayer: vi.fn(),
        createRulesPreset: vi.fn(),
        updateRulesPreset: vi.fn(),
        removeRulesPreset: vi.fn(),
        refresh: vi.fn(),
      });

      render(<LeagueBuilderRosters />);
      expect(screen.getByText('No teams created yet')).toBeInTheDocument();
    });
  });
});
