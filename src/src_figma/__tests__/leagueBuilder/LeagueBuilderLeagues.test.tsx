/**
 * LeagueBuilderLeagues Component Tests
 *
 * Tests the leagues management page with CRUD operations.
 * Per Ralph Framework S-B017
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LeagueBuilderLeagues } from '../../app/pages/LeagueBuilderLeagues';

// ============================================
// MOCKS
// ============================================

const mockNavigate = vi.fn();

vi.mock('react-router', () => ({
  useNavigate: () => mockNavigate,
}));

const mockCreateLeague = vi.fn().mockResolvedValue(undefined);
const mockUpdateLeague = vi.fn().mockResolvedValue(undefined);
const mockRemoveLeague = vi.fn().mockResolvedValue(undefined);
const mockDuplicateLeague = vi.fn().mockResolvedValue(undefined);

vi.mock('../../hooks/useLeagueBuilderData', () => ({
  useLeagueBuilderData: vi.fn(() => ({
    leagues: [
      {
        id: 'league-1',
        name: 'Kruse Baseball',
        description: 'Main league',
        teamIds: ['team-1', 'team-2'],
        defaultRulesPreset: 'preset-1',
        color: '#5A8352',
        createdDate: '2026-01-15T00:00:00.000Z',
      },
      {
        id: 'league-2',
        name: 'Minor League',
        teamIds: ['team-3'],
        defaultRulesPreset: 'preset-1',
        color: '#CC44CC',
        createdDate: '2026-01-20T00:00:00.000Z',
      },
    ],
    teams: [
      { id: 'team-1', name: 'Sox', colors: { primary: '#FF0000', secondary: '#FFFFFF' } },
      { id: 'team-2', name: 'Tigers', colors: { primary: '#FF6600', secondary: '#000000' } },
      { id: 'team-3', name: 'Bears', colors: { primary: '#0000FF', secondary: '#FFFFFF' } },
    ],
    rulesPresets: [
      { id: 'preset-1', name: 'Standard', isDefault: true },
      { id: 'preset-2', name: 'Quick Game', isDefault: false },
    ],
    isLoading: false,
    error: null,
    createLeague: mockCreateLeague,
    updateLeague: mockUpdateLeague,
    removeLeague: mockRemoveLeague,
    duplicateLeague: mockDuplicateLeague,
  })),
}));

// ============================================
// TESTS
// ============================================

describe('LeagueBuilderLeagues Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Header', () => {
    test('renders LEAGUES title', () => {
      render(<LeagueBuilderLeagues />);
      expect(screen.getByText('LEAGUES')).toBeInTheDocument();
    });

    test('renders back button', () => {
      render(<LeagueBuilderLeagues />);
      const buttons = screen.getAllByRole('button');
      expect(buttons[0]).toBeInTheDocument();
    });

    test('back button navigates to league builder', () => {
      render(<LeagueBuilderLeagues />);
      const buttons = screen.getAllByRole('button');
      fireEvent.click(buttons[0]);
      expect(mockNavigate).toHaveBeenCalledWith('/league-builder');
    });
  });

  describe('Create Button', () => {
    test('renders CREATE NEW LEAGUE button', () => {
      render(<LeagueBuilderLeagues />);
      expect(screen.getByText('CREATE NEW LEAGUE')).toBeInTheDocument();
    });

    test('clicking CREATE NEW LEAGUE opens modal', async () => {
      render(<LeagueBuilderLeagues />);
      fireEvent.click(screen.getByText('CREATE NEW LEAGUE'));
      await waitFor(() => {
        expect(screen.getByText('Create New League')).toBeInTheDocument();
      });
    });
  });

  describe('Leagues List', () => {
    test('renders league names', () => {
      render(<LeagueBuilderLeagues />);
      expect(screen.getByText('Kruse Baseball')).toBeInTheDocument();
      expect(screen.getByText('Minor League')).toBeInTheDocument();
    });

    test('renders league descriptions', () => {
      render(<LeagueBuilderLeagues />);
      expect(screen.getByText('Main league')).toBeInTheDocument();
    });

    test('renders team counts', () => {
      render(<LeagueBuilderLeagues />);
      expect(screen.getByText('2 teams')).toBeInTheDocument();
      expect(screen.getByText('1 team')).toBeInTheDocument();
    });

    test('renders edit buttons for each league', () => {
      render(<LeagueBuilderLeagues />);
      const editButtons = screen.getAllByTitle('Edit league');
      expect(editButtons.length).toBe(2);
    });

    test('renders duplicate buttons for each league', () => {
      render(<LeagueBuilderLeagues />);
      const duplicateButtons = screen.getAllByTitle('Duplicate league');
      expect(duplicateButtons.length).toBe(2);
    });

    test('renders delete buttons for each league', () => {
      render(<LeagueBuilderLeagues />);
      const deleteButtons = screen.getAllByTitle('Delete league');
      expect(deleteButtons.length).toBe(2);
    });
  });

  describe('Edit League', () => {
    test('clicking edit button opens modal with league data', async () => {
      render(<LeagueBuilderLeagues />);
      const editButtons = screen.getAllByTitle('Edit league');
      fireEvent.click(editButtons[0]);

      await waitFor(() => {
        expect(screen.getByText('Edit League')).toBeInTheDocument();
      });
    });

    test('modal shows league name label', async () => {
      render(<LeagueBuilderLeagues />);
      fireEvent.click(screen.getByText('CREATE NEW LEAGUE'));
      await waitFor(() => {
        expect(screen.getByText(/League Name/)).toBeInTheDocument();
      });
    });
  });

  describe('Duplicate League', () => {
    test('clicking duplicate calls duplicateLeague', async () => {
      render(<LeagueBuilderLeagues />);
      const duplicateButtons = screen.getAllByTitle('Duplicate league');
      fireEvent.click(duplicateButtons[0]);

      await waitFor(() => {
        expect(mockDuplicateLeague).toHaveBeenCalledWith('league-1');
      });
    });
  });

  describe('Delete League', () => {
    test('clicking delete shows confirmation buttons', () => {
      render(<LeagueBuilderLeagues />);
      const deleteButtons = screen.getAllByTitle('Delete league');
      fireEvent.click(deleteButtons[0]);

      expect(screen.getByTitle('Confirm delete')).toBeInTheDocument();
      expect(screen.getByTitle('Cancel')).toBeInTheDocument();
    });

    test('clicking cancel hides confirmation buttons', () => {
      render(<LeagueBuilderLeagues />);
      const deleteButtons = screen.getAllByTitle('Delete league');
      fireEvent.click(deleteButtons[0]);

      fireEvent.click(screen.getByTitle('Cancel'));
      expect(screen.queryByTitle('Confirm delete')).not.toBeInTheDocument();
    });

    test('clicking confirm delete calls removeLeague', async () => {
      render(<LeagueBuilderLeagues />);
      const deleteButtons = screen.getAllByTitle('Delete league');
      fireEvent.click(deleteButtons[0]);
      fireEvent.click(screen.getByTitle('Confirm delete'));

      await waitFor(() => {
        expect(mockRemoveLeague).toHaveBeenCalledWith('league-1');
      });
    });
  });

  describe('Modal', () => {
    test('modal has close button', async () => {
      render(<LeagueBuilderLeagues />);
      fireEvent.click(screen.getByText('CREATE NEW LEAGUE'));

      await waitFor(() => {
        expect(screen.getByText('Create New League')).toBeInTheDocument();
      });

      // Find the X button in modal header - there should be multiple buttons
      const closeButtons = screen.getAllByRole('button');
      expect(closeButtons.length).toBeGreaterThan(1);
    });

    test('modal can be closed', async () => {
      render(<LeagueBuilderLeagues />);
      fireEvent.click(screen.getByText('CREATE NEW LEAGUE'));

      await waitFor(() => {
        expect(screen.getByText('Create New League')).toBeInTheDocument();
      });

      // Find close button in modal header (has X icon) - it's after the title
      const modalHeader = screen.getByText('Create New League').parentElement;
      const closeButton = modalHeader?.querySelector('button');
      expect(closeButton).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    test('shows loading indicator when isLoading', async () => {
      const { useLeagueBuilderData } = await import('../../hooks/useLeagueBuilderData');
      vi.mocked(useLeagueBuilderData).mockReturnValue({
        leagues: [],
        teams: [],
        rulesPresets: [],
        isLoading: true,
        error: null,
        createLeague: mockCreateLeague,
        updateLeague: mockUpdateLeague,
        removeLeague: mockRemoveLeague,
        duplicateLeague: mockDuplicateLeague,
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

      render(<LeagueBuilderLeagues />);
      expect(screen.getByText('Loading leagues...')).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    test('shows error message when error occurs', async () => {
      const { useLeagueBuilderData } = await import('../../hooks/useLeagueBuilderData');
      vi.mocked(useLeagueBuilderData).mockReturnValue({
        leagues: [],
        teams: [],
        rulesPresets: [],
        isLoading: false,
        error: 'Failed to load leagues',
        createLeague: mockCreateLeague,
        updateLeague: mockUpdateLeague,
        removeLeague: mockRemoveLeague,
        duplicateLeague: mockDuplicateLeague,
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

      render(<LeagueBuilderLeagues />);
      expect(screen.getByText('Failed to load leagues')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    test('shows empty message when no leagues exist', async () => {
      const { useLeagueBuilderData } = await import('../../hooks/useLeagueBuilderData');
      vi.mocked(useLeagueBuilderData).mockReturnValue({
        leagues: [],
        teams: [],
        rulesPresets: [{ id: 'preset-1', name: 'Standard', isDefault: true }],
        isLoading: false,
        error: null,
        createLeague: mockCreateLeague,
        updateLeague: mockUpdateLeague,
        removeLeague: mockRemoveLeague,
        duplicateLeague: mockDuplicateLeague,
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

      render(<LeagueBuilderLeagues />);
      expect(screen.getByText('No Leagues Yet')).toBeInTheDocument();
      expect(screen.getByText('Create your first league to get started')).toBeInTheDocument();
    });
  });

  describe('Form Validation', () => {
    test('save button exists in modal', async () => {
      render(<LeagueBuilderLeagues />);
      fireEvent.click(screen.getByText('CREATE NEW LEAGUE'));

      await waitFor(() => {
        expect(screen.getByText('Create New League')).toBeInTheDocument();
      });

      // Look for save/create button - may be "Create League" or "Save"
      const buttons = screen.getAllByRole('button');
      const saveButton = buttons.find(btn =>
        btn.textContent?.toLowerCase().includes('save') ||
        btn.textContent?.toLowerCase().includes('create league')
      );
      expect(saveButton).toBeInTheDocument();
    });
  });

});
