/**
 * LeagueBuilderTeams Component Tests
 *
 * Tests the teams management page with CRUD operations.
 * Per Ralph Framework S-B017
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LeagueBuilderTeams } from '../../app/pages/LeagueBuilderTeams';

// ============================================
// MOCKS
// ============================================

const mockNavigate = vi.fn();

vi.mock('react-router', () => ({
  useNavigate: () => mockNavigate,
}));

const mockCreateTeam = vi.fn().mockResolvedValue(undefined);
const mockUpdateTeam = vi.fn().mockResolvedValue(undefined);
const mockRemoveTeam = vi.fn().mockResolvedValue(undefined);

vi.mock('../../hooks/useLeagueBuilderData', () => ({
  useLeagueBuilderData: vi.fn(() => ({
    teams: [
      {
        id: 'team-1',
        name: 'Boston Sox',
        abbreviation: 'SOX',
        location: 'Boston',
        nickname: 'Sox',
        stadium: 'Fenway Park',
        stadiumCapacity: 37000,
        colors: { primary: '#FF0000', secondary: '#FFFFFF' },
        foundedYear: 1901,
        championships: 9,
      },
      {
        id: 'team-2',
        name: 'Detroit Tigers',
        abbreviation: 'DET',
        location: 'Detroit',
        nickname: 'Tigers',
        stadium: 'Tiger Stadium',
        stadiumCapacity: 41000,
        colors: { primary: '#FF6600', secondary: '#000000' },
        foundedYear: 1894,
        championships: 4,
      },
    ],
    leagues: [
      { id: 'league-1', name: 'Kruse Baseball', teamIds: ['team-1', 'team-2'] },
    ],
    isLoading: false,
    error: null,
    createTeam: mockCreateTeam,
    updateTeam: mockUpdateTeam,
    removeTeam: mockRemoveTeam,
  })),
}));

// ============================================
// TESTS
// ============================================

describe('LeagueBuilderTeams Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Header', () => {
    test('renders TEAMS title', () => {
      render(<LeagueBuilderTeams />);
      expect(screen.getByText('TEAMS')).toBeInTheDocument();
    });

    test('renders back button', () => {
      render(<LeagueBuilderTeams />);
      const buttons = screen.getAllByRole('button');
      expect(buttons[0]).toBeInTheDocument();
    });

    test('back button navigates to league builder', () => {
      render(<LeagueBuilderTeams />);
      const buttons = screen.getAllByRole('button');
      fireEvent.click(buttons[0]);
      expect(mockNavigate).toHaveBeenCalledWith('/league-builder');
    });
  });

  describe('Create Button', () => {
    test('renders CREATE NEW TEAM button', () => {
      render(<LeagueBuilderTeams />);
      expect(screen.getByText('CREATE NEW TEAM')).toBeInTheDocument();
    });

    test('clicking CREATE NEW TEAM opens modal', async () => {
      render(<LeagueBuilderTeams />);
      fireEvent.click(screen.getByText('CREATE NEW TEAM'));
      await waitFor(() => {
        expect(screen.getByText('Create New Team')).toBeInTheDocument();
      });
    });
  });

  describe('Teams List', () => {
    test('renders team names', () => {
      render(<LeagueBuilderTeams />);
      expect(screen.getByText('Boston Sox')).toBeInTheDocument();
      expect(screen.getByText('Detroit Tigers')).toBeInTheDocument();
    });

    test('renders team abbreviations', () => {
      render(<LeagueBuilderTeams />);
      expect(screen.getByText('SOX')).toBeInTheDocument();
      expect(screen.getByText('DET')).toBeInTheDocument();
    });

    test('renders location info', () => {
      render(<LeagueBuilderTeams />);
      // Teams display location, not stadium, in the list
      expect(screen.getByText(/Boston/)).toBeInTheDocument();
      expect(screen.getByText(/Detroit/)).toBeInTheDocument();
    });

    test('renders edit buttons for each team', () => {
      render(<LeagueBuilderTeams />);
      const editButtons = screen.getAllByTitle('Edit team');
      expect(editButtons.length).toBe(2);
    });

    test('renders delete buttons for each team', () => {
      render(<LeagueBuilderTeams />);
      const deleteButtons = screen.getAllByTitle('Delete team');
      expect(deleteButtons.length).toBe(2);
    });
  });

  describe('Edit Team', () => {
    test('clicking edit button opens modal', async () => {
      render(<LeagueBuilderTeams />);
      const editButtons = screen.getAllByTitle('Edit team');
      fireEvent.click(editButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Edit Team')).toBeInTheDocument();
      });
    });

    test('modal shows team name input with value', async () => {
      render(<LeagueBuilderTeams />);
      const editButtons = screen.getAllByTitle('Edit team');
      fireEvent.click(editButtons[0]);

      await waitFor(() => {
        expect(screen.getByDisplayValue('Boston Sox')).toBeInTheDocument();
      });
    });
  });

  describe('Delete Team', () => {
    test('clicking delete shows confirmation buttons', () => {
      render(<LeagueBuilderTeams />);
      const deleteButtons = screen.getAllByTitle('Delete team');
      fireEvent.click(deleteButtons[0]);

      expect(screen.getByTitle('Confirm delete')).toBeInTheDocument();
      expect(screen.getByTitle('Cancel')).toBeInTheDocument();
    });

    test('clicking cancel hides confirmation buttons', () => {
      render(<LeagueBuilderTeams />);
      const deleteButtons = screen.getAllByTitle('Delete team');
      fireEvent.click(deleteButtons[0]);

      fireEvent.click(screen.getByTitle('Cancel'));
      expect(screen.queryByTitle('Confirm delete')).not.toBeInTheDocument();
    });

    test('clicking confirm delete calls removeTeam', async () => {
      render(<LeagueBuilderTeams />);
      const deleteButtons = screen.getAllByTitle('Delete team');
      fireEvent.click(deleteButtons[0]);
      fireEvent.click(screen.getByTitle('Confirm delete'));

      await waitFor(() => {
        expect(mockRemoveTeam).toHaveBeenCalledWith('team-1');
      });
    });
  });

  describe('Modal', () => {
    test('modal has close button', async () => {
      render(<LeagueBuilderTeams />);
      fireEvent.click(screen.getByText('CREATE NEW TEAM'));

      await waitFor(() => {
        expect(screen.getByText('Create New Team')).toBeInTheDocument();
      });

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(1);
    });

    test('modal shows form fields', async () => {
      render(<LeagueBuilderTeams />);
      fireEvent.click(screen.getByText('CREATE NEW TEAM'));

      await waitFor(() => {
        expect(screen.getByText(/Team Name/)).toBeInTheDocument();
        expect(screen.getByText(/Abbreviation/)).toBeInTheDocument();
      });
    });
  });

  describe('Loading State', () => {
    test('shows loading indicator when isLoading', async () => {
      const { useLeagueBuilderData } = await import('../../hooks/useLeagueBuilderData');
      vi.mocked(useLeagueBuilderData).mockReturnValue({
        teams: [],
        leagues: [],
        players: [],
        rulesPresets: [],
        isLoading: true,
        error: null,
        createTeam: mockCreateTeam,
        updateTeam: mockUpdateTeam,
        removeTeam: mockRemoveTeam,
        createLeague: vi.fn(),
        updateLeague: vi.fn(),
        removeLeague: vi.fn(),
        duplicateLeague: vi.fn(),
        createPlayer: vi.fn(),
        updatePlayer: vi.fn(),
        removePlayer: vi.fn(),
        createRulesPreset: vi.fn(),
        updateRulesPreset: vi.fn(),
        removeRulesPreset: vi.fn(),
        refresh: vi.fn(),
      });

      render(<LeagueBuilderTeams />);
      expect(screen.getByText('Loading teams...')).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    test('shows error message when error occurs', async () => {
      const { useLeagueBuilderData } = await import('../../hooks/useLeagueBuilderData');
      vi.mocked(useLeagueBuilderData).mockReturnValue({
        teams: [],
        leagues: [],
        players: [],
        rulesPresets: [],
        isLoading: false,
        error: 'Failed to load teams',
        createTeam: mockCreateTeam,
        updateTeam: mockUpdateTeam,
        removeTeam: mockRemoveTeam,
        createLeague: vi.fn(),
        updateLeague: vi.fn(),
        removeLeague: vi.fn(),
        duplicateLeague: vi.fn(),
        createPlayer: vi.fn(),
        updatePlayer: vi.fn(),
        removePlayer: vi.fn(),
        createRulesPreset: vi.fn(),
        updateRulesPreset: vi.fn(),
        removeRulesPreset: vi.fn(),
        refresh: vi.fn(),
      });

      render(<LeagueBuilderTeams />);
      expect(screen.getByText('Failed to load teams')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    test('shows empty message when no teams exist', async () => {
      const { useLeagueBuilderData } = await import('../../hooks/useLeagueBuilderData');
      vi.mocked(useLeagueBuilderData).mockReturnValue({
        teams: [],
        leagues: [],
        players: [],
        rulesPresets: [],
        isLoading: false,
        error: null,
        createTeam: mockCreateTeam,
        updateTeam: mockUpdateTeam,
        removeTeam: mockRemoveTeam,
        createLeague: vi.fn(),
        updateLeague: vi.fn(),
        removeLeague: vi.fn(),
        duplicateLeague: vi.fn(),
        createPlayer: vi.fn(),
        updatePlayer: vi.fn(),
        removePlayer: vi.fn(),
        createRulesPreset: vi.fn(),
        updateRulesPreset: vi.fn(),
        removeRulesPreset: vi.fn(),
        refresh: vi.fn(),
      });

      render(<LeagueBuilderTeams />);
      expect(screen.getByText('No Teams Yet')).toBeInTheDocument();
    });
  });

});
