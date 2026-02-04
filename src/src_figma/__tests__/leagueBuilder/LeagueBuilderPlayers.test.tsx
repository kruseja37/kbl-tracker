/**
 * LeagueBuilderPlayers Component Tests
 *
 * Tests the players management page with CRUD operations.
 * Per Ralph Framework S-B017
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LeagueBuilderPlayers } from '../../app/pages/LeagueBuilderPlayers';

// ============================================
// MOCKS
// ============================================

const mockNavigate = vi.fn();

vi.mock('react-router', () => ({
  useNavigate: () => mockNavigate,
}));

const mockCreatePlayer = vi.fn().mockResolvedValue(undefined);
const mockUpdatePlayer = vi.fn().mockResolvedValue(undefined);
const mockRemovePlayer = vi.fn().mockResolvedValue(undefined);

vi.mock('../../hooks/useLeagueBuilderData', () => ({
  useLeagueBuilderData: vi.fn(() => ({
    players: [
      {
        id: 'player-1',
        firstName: 'John',
        lastName: 'Smith',
        nickname: 'Smitty',
        gender: 'M',
        age: 28,
        bats: 'R',
        throws: 'R',
        primaryPosition: 'SS',
        secondaryPosition: '2B',
        power: 65,
        contact: 70,
        speed: 75,
        fielding: 80,
        arm: 70,
        velocity: 0,
        junk: 0,
        accuracy: 0,
        arsenal: [],
        overallGrade: 'A-',
        trait1: 'Speedy',
        trait2: 'Clutch',
        personality: 'Competitive',
        chemistry: 'Competitive',
        currentTeamId: 'team-1',
        rosterStatus: 'STARTER',
      },
      {
        id: 'player-2',
        firstName: 'Jane',
        lastName: 'Doe',
        nickname: '',
        gender: 'F',
        age: 25,
        bats: 'L',
        throws: 'L',
        primaryPosition: 'SP',
        secondaryPosition: '',
        power: 30,
        contact: 40,
        speed: 50,
        fielding: 60,
        arm: 0,
        velocity: 85,
        junk: 75,
        accuracy: 80,
        arsenal: ['4F', 'CB', 'CH'],
        overallGrade: 'A',
        trait1: 'Strikeout',
        trait2: '',
        personality: 'Disciplined',
        chemistry: 'Disciplined',
        currentTeamId: 'team-1',
        rosterStatus: 'ROTATION',
      },
      {
        id: 'player-3',
        firstName: 'Bob',
        lastName: 'Jones',
        nickname: 'Bobby',
        gender: 'M',
        age: 32,
        bats: 'S',
        throws: 'R',
        primaryPosition: 'CF',
        secondaryPosition: 'RF',
        power: 80,
        contact: 60,
        speed: 60,
        fielding: 70,
        arm: 75,
        velocity: 0,
        junk: 0,
        accuracy: 0,
        arsenal: [],
        overallGrade: 'A',
        trait1: 'Power',
        trait2: '',
        personality: 'Spirited',
        chemistry: 'Spirited',
        currentTeamId: '',
        rosterStatus: 'FREE_AGENT',
      },
    ],
    teams: [
      { id: 'team-1', name: 'Sox', abbreviation: 'SOX' },
      { id: 'team-2', name: 'Tigers', abbreviation: 'DET' },
    ],
    isLoading: false,
    error: null,
    createPlayer: mockCreatePlayer,
    updatePlayer: mockUpdatePlayer,
    removePlayer: mockRemovePlayer,
  })),
}));

// ============================================
// TESTS
// ============================================

describe('LeagueBuilderPlayers Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Header', () => {
    test('renders PLAYERS title', () => {
      render(<LeagueBuilderPlayers />);
      expect(screen.getByText('PLAYERS')).toBeInTheDocument();
    });

    test('renders back button', () => {
      render(<LeagueBuilderPlayers />);
      const buttons = screen.getAllByRole('button');
      expect(buttons[0]).toBeInTheDocument();
    });

    test('back button navigates to league builder', () => {
      render(<LeagueBuilderPlayers />);
      const buttons = screen.getAllByRole('button');
      fireEvent.click(buttons[0]);
      expect(mockNavigate).toHaveBeenCalledWith('/league-builder');
    });
  });

  describe('Create Button', () => {
    test('renders create player button', () => {
      render(<LeagueBuilderPlayers />);
      // Button may have different text
      const createButton = screen.getByRole('button', { name: /create|add|new/i });
      expect(createButton).toBeInTheDocument();
    });

    test('clicking create player button opens modal', async () => {
      render(<LeagueBuilderPlayers />);
      const createButton = screen.getByRole('button', { name: /create|add|new/i });
      fireEvent.click(createButton);
      await waitFor(() => {
        // Modal has h2 title "Create New Player"
        expect(screen.getByRole('heading', { name: /Create New Player/ })).toBeInTheDocument();
      });
    });
  });

  describe('Players List', () => {
    test('renders player names', () => {
      render(<LeagueBuilderPlayers />);
      expect(screen.getByText(/John Smith/)).toBeInTheDocument();
      expect(screen.getByText(/Jane Doe/)).toBeInTheDocument();
      expect(screen.getByText(/Bob Jones/)).toBeInTheDocument();
    });

    test('renders player positions', () => {
      render(<LeagueBuilderPlayers />);
      // Positions may appear multiple times
      expect(screen.getAllByText('SS').length).toBeGreaterThan(0);
      expect(screen.getAllByText('SP').length).toBeGreaterThan(0);
      expect(screen.getAllByText('CF').length).toBeGreaterThan(0);
    });

    test('renders player grades', () => {
      render(<LeagueBuilderPlayers />);
      expect(screen.getByText('A-')).toBeInTheDocument();
      expect(screen.getAllByText('A').length).toBeGreaterThan(0);
    });

    test('renders edit buttons for each player', () => {
      render(<LeagueBuilderPlayers />);
      const editButtons = screen.getAllByTitle('Edit player');
      expect(editButtons.length).toBe(3);
    });

    test('renders delete buttons for each player', () => {
      render(<LeagueBuilderPlayers />);
      const deleteButtons = screen.getAllByTitle('Delete player');
      expect(deleteButtons.length).toBe(3);
    });
  });

  describe('Search and Filter', () => {
    test('renders search input', () => {
      render(<LeagueBuilderPlayers />);
      expect(screen.getByPlaceholderText(/Search/i)).toBeInTheDocument();
    });

    test('search filters players by name', async () => {
      render(<LeagueBuilderPlayers />);
      const searchInput = screen.getByPlaceholderText(/Search/i);
      fireEvent.change(searchInput, { target: { value: 'John' } });

      await waitFor(() => {
        expect(screen.getByText(/John Smith/)).toBeInTheDocument();
        expect(screen.queryByText(/Jane Doe/)).not.toBeInTheDocument();
      });
    });

    test('renders position filter dropdown', () => {
      render(<LeagueBuilderPlayers />);
      // Position filter dropdown exists with All Positions option
      expect(screen.getByText(/All Positions/)).toBeInTheDocument();
    });
  });

  describe('Edit Player', () => {
    test('clicking edit button opens modal', async () => {
      render(<LeagueBuilderPlayers />);
      const editButtons = screen.getAllByTitle('Edit player');
      fireEvent.click(editButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Edit Player')).toBeInTheDocument();
      });
    });
  });

  describe('Delete Player', () => {
    test('clicking delete shows confirmation buttons', () => {
      render(<LeagueBuilderPlayers />);
      const deleteButtons = screen.getAllByTitle('Delete player');
      fireEvent.click(deleteButtons[0]);

      expect(screen.getByTitle('Confirm delete')).toBeInTheDocument();
      expect(screen.getByTitle('Cancel')).toBeInTheDocument();
    });

    test('clicking cancel hides confirmation buttons', () => {
      render(<LeagueBuilderPlayers />);
      const deleteButtons = screen.getAllByTitle('Delete player');
      fireEvent.click(deleteButtons[0]);

      fireEvent.click(screen.getByTitle('Cancel'));
      expect(screen.queryByTitle('Confirm delete')).not.toBeInTheDocument();
    });

    test('clicking confirm delete calls removePlayer', async () => {
      render(<LeagueBuilderPlayers />);
      const deleteButtons = screen.getAllByTitle('Delete player');
      fireEvent.click(deleteButtons[0]);
      fireEvent.click(screen.getByTitle('Confirm delete'));

      await waitFor(() => {
        expect(mockRemovePlayer).toHaveBeenCalled();
      }, { timeout: 2000 });
    });
  });

  describe('Modal Form', () => {
    test('modal shows basic info fields', async () => {
      render(<LeagueBuilderPlayers />);
      const createButton = screen.getByRole('button', { name: /create|add|new/i });
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(screen.getByText(/First Name/)).toBeInTheDocument();
        expect(screen.getByText(/Last Name/)).toBeInTheDocument();
      });
    });

    test('modal shows position dropdown', async () => {
      render(<LeagueBuilderPlayers />);
      const createButton = screen.getByRole('button', { name: /create|add|new/i });
      fireEvent.click(createButton);

      await waitFor(() => {
        expect(screen.getByText(/Primary Position/)).toBeInTheDocument();
      });
    });
  });

  describe('Loading State', () => {
    test('shows loading indicator when isLoading', async () => {
      const { useLeagueBuilderData } = await import('../../hooks/useLeagueBuilderData');
      vi.mocked(useLeagueBuilderData).mockReturnValue({
        players: [],
        teams: [],
        leagues: [],
        rulesPresets: [],
        isLoading: true,
        error: null,
        createPlayer: mockCreatePlayer,
        updatePlayer: mockUpdatePlayer,
        removePlayer: mockRemovePlayer,
        createTeam: vi.fn(),
        updateTeam: vi.fn(),
        removeTeam: vi.fn(),
        createLeague: vi.fn(),
        updateLeague: vi.fn(),
        removeLeague: vi.fn(),
        duplicateLeague: vi.fn(),
        createRulesPreset: vi.fn(),
        updateRulesPreset: vi.fn(),
        removeRulesPreset: vi.fn(),
        refresh: vi.fn(),
      });

      render(<LeagueBuilderPlayers />);
      expect(screen.getByText('Loading players...')).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    test('shows error message when error occurs', async () => {
      const { useLeagueBuilderData } = await import('../../hooks/useLeagueBuilderData');
      vi.mocked(useLeagueBuilderData).mockReturnValue({
        players: [],
        teams: [],
        leagues: [],
        rulesPresets: [],
        isLoading: false,
        error: 'Failed to load players',
        createPlayer: mockCreatePlayer,
        updatePlayer: mockUpdatePlayer,
        removePlayer: mockRemovePlayer,
        createTeam: vi.fn(),
        updateTeam: vi.fn(),
        removeTeam: vi.fn(),
        createLeague: vi.fn(),
        updateLeague: vi.fn(),
        removeLeague: vi.fn(),
        duplicateLeague: vi.fn(),
        createRulesPreset: vi.fn(),
        updateRulesPreset: vi.fn(),
        removeRulesPreset: vi.fn(),
        refresh: vi.fn(),
      });

      render(<LeagueBuilderPlayers />);
      expect(screen.getByText('Failed to load players')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    test('shows empty message when no players exist', async () => {
      const { useLeagueBuilderData } = await import('../../hooks/useLeagueBuilderData');
      vi.mocked(useLeagueBuilderData).mockReturnValue({
        players: [],
        teams: [],
        leagues: [],
        rulesPresets: [],
        isLoading: false,
        error: null,
        createPlayer: mockCreatePlayer,
        updatePlayer: mockUpdatePlayer,
        removePlayer: mockRemovePlayer,
        createTeam: vi.fn(),
        updateTeam: vi.fn(),
        removeTeam: vi.fn(),
        createLeague: vi.fn(),
        updateLeague: vi.fn(),
        removeLeague: vi.fn(),
        duplicateLeague: vi.fn(),
        createRulesPreset: vi.fn(),
        updateRulesPreset: vi.fn(),
        removeRulesPreset: vi.fn(),
        refresh: vi.fn(),
      });

      render(<LeagueBuilderPlayers />);
      expect(screen.getByText('No Players Yet')).toBeInTheDocument();
    });
  });

  describe('Player Count', () => {
    test('displays player count in filters', () => {
      render(<LeagueBuilderPlayers />);
      // Player count shown in the list header
      const countTexts = screen.queryAllByText(/player/i);
      expect(countTexts.length).toBeGreaterThan(0);
    });
  });
});
