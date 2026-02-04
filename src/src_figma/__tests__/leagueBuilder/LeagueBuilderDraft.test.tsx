/**
 * LeagueBuilderDraft Component Tests
 *
 * Tests the draft setup page with configuration and prospect generation.
 * Per Ralph Framework S-B017
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LeagueBuilderDraft } from '../../app/pages/LeagueBuilderDraft';

// ============================================
// MOCKS
// ============================================

const mockNavigate = vi.fn();

vi.mock('react-router', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('../../hooks/useLeagueBuilderData', () => ({
  useLeagueBuilderData: vi.fn(() => ({
    teams: [
      {
        id: 'team-1',
        name: 'Boston Sox',
        abbreviation: 'SOX',
        colors: { primary: '#FF0000', secondary: '#FFFFFF' },
      },
      {
        id: 'team-2',
        name: 'Detroit Tigers',
        abbreviation: 'DET',
        colors: { primary: '#FF6600', secondary: '#000000' },
      },
    ],
    players: [
      {
        id: 'player-inactive-1',
        firstName: 'Mike',
        lastName: 'Retired',
        primaryPosition: 'SS',
        overallGrade: 'B-',
        currentTeamId: null,
      },
      {
        id: 'player-inactive-2',
        firstName: 'Steve',
        lastName: 'Released',
        primaryPosition: 'SP',
        overallGrade: 'C+',
        currentTeamId: null,
      },
    ],
    isLoading: false,
    error: null,
  })),
}));

// ============================================
// TESTS
// ============================================

describe('LeagueBuilderDraft Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Header', () => {
    test('renders DRAFT SETUP title', () => {
      render(<LeagueBuilderDraft />);
      expect(screen.getByText('DRAFT SETUP')).toBeInTheDocument();
    });

    test('renders back button', () => {
      render(<LeagueBuilderDraft />);
      const buttons = screen.getAllByRole('button');
      expect(buttons[0]).toBeInTheDocument();
    });

    test('back button navigates to league builder', () => {
      render(<LeagueBuilderDraft />);
      const buttons = screen.getAllByRole('button');
      fireEvent.click(buttons[0]);
      expect(mockNavigate).toHaveBeenCalledWith('/league-builder');
    });
  });

  describe('Tabs', () => {
    test('renders settings, prospects, inactive tabs', () => {
      render(<LeagueBuilderDraft />);
      expect(screen.getByText('SETTINGS')).toBeInTheDocument();
      // PROSPECTS appears in tab and button, use more specific selector
      expect(screen.getByRole('button', { name: /PROSPECTS \(0\)/ })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /INACTIVE \(2\)/ })).toBeInTheDocument();
    });

    test('settings tab is active by default', () => {
      render(<LeagueBuilderDraft />);
      expect(screen.getByText('DRAFT CONFIGURATION')).toBeInTheDocument();
    });
  });

  describe('Settings Tab', () => {
    test('shows draft order dropdown', () => {
      render(<LeagueBuilderDraft />);
      expect(screen.getByText('DRAFT ORDER')).toBeInTheDocument();
    });

    test('shows rounds slider', () => {
      render(<LeagueBuilderDraft />);
      expect(screen.getByText(/ROUNDS/)).toBeInTheDocument();
    });

    test('shows pick timer slider', () => {
      render(<LeagueBuilderDraft />);
      expect(screen.getByText(/PICK TIMER/)).toBeInTheDocument();
    });

    test('shows CPU auto-pick option', () => {
      render(<LeagueBuilderDraft />);
      expect(screen.getByText('CPU AUTO-PICK')).toBeInTheDocument();
    });

    test('shows participating teams section', () => {
      render(<LeagueBuilderDraft />);
      expect(screen.getByText('PARTICIPATING TEAMS (2)')).toBeInTheDocument();
    });

    test('shows team names in participating teams', () => {
      render(<LeagueBuilderDraft />);
      expect(screen.getByText('Boston Sox')).toBeInTheDocument();
      expect(screen.getByText('Detroit Tigers')).toBeInTheDocument();
    });
  });

  describe('Draft Class Overview', () => {
    test('shows draft class overview section', () => {
      render(<LeagueBuilderDraft />);
      expect(screen.getByText('DRAFT CLASS OVERVIEW')).toBeInTheDocument();
    });

    test('shows no draft class message initially', () => {
      render(<LeagueBuilderDraft />);
      expect(screen.getByText('No draft class generated yet')).toBeInTheDocument();
    });

    test('shows generate prospects button', () => {
      render(<LeagueBuilderDraft />);
      expect(screen.getByText('GENERATE PROSPECTS')).toBeInTheDocument();
    });

    test('clicking generate prospects creates draft class', async () => {
      render(<LeagueBuilderDraft />);
      fireEvent.click(screen.getByText('GENERATE PROSPECTS'));

      await waitFor(() => {
        // After generating, should show total prospects count
        expect(screen.getByText('TOTAL PROSPECTS')).toBeInTheDocument();
      });
    });
  });

  describe('Prospects Tab', () => {
    test('shows generate message when no prospects', () => {
      render(<LeagueBuilderDraft />);
      fireEvent.click(screen.getByRole('button', { name: /PROSPECTS \(0\)/ }));
      expect(screen.getByText('Generate a draft class to see prospects')).toBeInTheDocument();
    });

    test('shows prospects after generation', async () => {
      render(<LeagueBuilderDraft />);
      fireEvent.click(screen.getByText('GENERATE PROSPECTS'));

      await waitFor(() => {
        expect(screen.getByText('TOTAL PROSPECTS')).toBeInTheDocument();
      });

      // After generation, prospects tab will have count > 0
      const prospectsTab = screen.getByRole('button', { name: /PROSPECTS/ });
      fireEvent.click(prospectsTab);

      await waitFor(() => {
        expect(screen.getByText(/DRAFT CLASS/)).toBeInTheDocument();
      });
    });
  });

  describe('Inactive Tab', () => {
    test('shows inactive players section', () => {
      render(<LeagueBuilderDraft />);
      fireEvent.click(screen.getByText(/INACTIVE/));
      expect(screen.getByText('INACTIVE PLAYERS (B or below)')).toBeInTheDocument();
    });

    test('shows inactive player names', () => {
      render(<LeagueBuilderDraft />);
      fireEvent.click(screen.getByText(/INACTIVE/));
      expect(screen.getByText('Mike Retired')).toBeInTheDocument();
      expect(screen.getByText('Steve Released')).toBeInTheDocument();
    });

    test('allows selecting inactive players', () => {
      render(<LeagueBuilderDraft />);
      fireEvent.click(screen.getByText(/INACTIVE/));

      const checkboxes = screen.getAllByRole('checkbox');
      fireEvent.click(checkboxes[0]);

      expect(screen.getByText('1 selected for draft')).toBeInTheDocument();
    });
  });

  describe('Info Panel', () => {
    test('shows farm-first draft info', () => {
      render(<LeagueBuilderDraft />);
      expect(screen.getByText('Farm-First Draft Model')).toBeInTheDocument();
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
        getRoster: vi.fn(),
        updateRoster: vi.fn(),
        refresh: vi.fn(),
      });

      render(<LeagueBuilderDraft />);
      expect(screen.getByText('Loading draft configuration...')).toBeInTheDocument();
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
        error: 'Failed to load draft configuration',
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
        getRoster: vi.fn(),
        updateRoster: vi.fn(),
        refresh: vi.fn(),
      });

      render(<LeagueBuilderDraft />);
      expect(screen.getByText(/Failed to load draft configuration/)).toBeInTheDocument();
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
        getRoster: vi.fn(),
        updateRoster: vi.fn(),
        refresh: vi.fn(),
      });

      render(<LeagueBuilderDraft />);
      expect(screen.getByText('No teams created yet. Create teams first to set up a draft.')).toBeInTheDocument();
    });
  });

  describe('No Inactive Players State', () => {
    test('shows no inactive players message when none eligible', async () => {
      const { useLeagueBuilderData } = await import('../../hooks/useLeagueBuilderData');
      vi.mocked(useLeagueBuilderData).mockReturnValue({
        teams: [{ id: 'team-1', name: 'Sox', colors: { primary: '#FF0000', secondary: '#FFFFFF' } }],
        players: [],
        leagues: [],
        rulesPresets: [],
        isLoading: false,
        error: null,
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
        getRoster: vi.fn(),
        updateRoster: vi.fn(),
        refresh: vi.fn(),
      });

      render(<LeagueBuilderDraft />);
      fireEvent.click(screen.getByText(/INACTIVE/));
      expect(screen.getByText('No inactive players eligible for draft')).toBeInTheDocument();
    });
  });
});
