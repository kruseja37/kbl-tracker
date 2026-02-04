/**
 * LeagueBuilder Component Tests
 *
 * Tests the main LeagueBuilder page with module cards and league list.
 * Per Ralph Framework S-B017
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LeagueBuilder } from '../../app/pages/LeagueBuilder';

// ============================================
// MOCKS
// ============================================

const mockNavigate = vi.fn();

vi.mock('react-router', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('../../hooks/useLeagueBuilderData', () => ({
  useLeagueBuilderData: vi.fn(() => ({
    leagues: [
      { id: 'league-1', name: 'Kruse Baseball', teamIds: ['team-1', 'team-2'], defaultRulesPreset: 'preset-1' },
      { id: 'league-2', name: 'Minor League', teamIds: ['team-3'], defaultRulesPreset: 'preset-1' },
    ],
    teams: [
      { id: 'team-1', name: 'Sox' },
      { id: 'team-2', name: 'Tigers' },
      { id: 'team-3', name: 'Bears' },
    ],
    players: [
      { id: 'player-1', name: 'John Smith' },
      { id: 'player-2', name: 'Jane Doe' },
    ],
    rulesPresets: [
      { id: 'preset-1', name: 'Standard', isDefault: true },
    ],
    isLoading: false,
    error: null,
  })),
}));

// ============================================
// TESTS
// ============================================

describe('LeagueBuilder Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Header', () => {
    test('renders LEAGUE BUILDER title', () => {
      render(<LeagueBuilder />);
      expect(screen.getByText('LEAGUE BUILDER')).toBeInTheDocument();
    });

    test('renders back button', () => {
      render(<LeagueBuilder />);
      // Back button is the first button with ArrowLeft icon
      const buttons = screen.getAllByRole('button');
      expect(buttons[0]).toBeInTheDocument();
    });

    test('back button navigates to home', () => {
      render(<LeagueBuilder />);
      const buttons = screen.getAllByRole('button');
      fireEvent.click(buttons[0]);
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });

  describe('Module Cards', () => {
    test('renders LEAGUES module card', () => {
      render(<LeagueBuilder />);
      expect(screen.getByText('LEAGUES')).toBeInTheDocument();
      expect(screen.getByText('Create, edit, and organize league templates')).toBeInTheDocument();
    });

    test('renders TEAMS module card', () => {
      render(<LeagueBuilder />);
      expect(screen.getByText('TEAMS')).toBeInTheDocument();
      expect(screen.getByText('Manage team roster pool and branding')).toBeInTheDocument();
    });

    test('renders PLAYERS module card', () => {
      render(<LeagueBuilder />);
      expect(screen.getByText('PLAYERS')).toBeInTheDocument();
      expect(screen.getByText('Player database, ratings, and traits')).toBeInTheDocument();
    });

    test('renders ROSTERS module card', () => {
      render(<LeagueBuilder />);
      expect(screen.getByText('ROSTERS')).toBeInTheDocument();
      expect(screen.getByText('Assign players to teams and set lineups')).toBeInTheDocument();
    });

    test('renders DRAFT module card', () => {
      render(<LeagueBuilder />);
      expect(screen.getByText('DRAFT')).toBeInTheDocument();
      expect(screen.getByText('Fantasy snake draft configuration')).toBeInTheDocument();
    });

    test('renders RULES module card', () => {
      render(<LeagueBuilder />);
      expect(screen.getByText('RULES')).toBeInTheDocument();
      expect(screen.getByText('Game, season, and simulation settings')).toBeInTheDocument();
    });

    test('shows league count', () => {
      render(<LeagueBuilder />);
      expect(screen.getByText('2 leagues')).toBeInTheDocument();
    });

    test('shows team count', () => {
      render(<LeagueBuilder />);
      expect(screen.getByText('3 teams')).toBeInTheDocument();
    });

    test('shows player count', () => {
      render(<LeagueBuilder />);
      expect(screen.getByText('2 players')).toBeInTheDocument();
    });

    test('shows roster count', () => {
      render(<LeagueBuilder />);
      expect(screen.getByText('3 rosters')).toBeInTheDocument();
    });

    test('shows preset count', () => {
      render(<LeagueBuilder />);
      expect(screen.getByText('1 preset')).toBeInTheDocument();
    });

    test('shows Configure for draft', () => {
      render(<LeagueBuilder />);
      expect(screen.getByText('Configure')).toBeInTheDocument();
    });
  });

  describe('Module Card Navigation', () => {
    test('LEAGUES card navigates to leagues page', () => {
      render(<LeagueBuilder />);
      fireEvent.click(screen.getByText('LEAGUES'));
      expect(mockNavigate).toHaveBeenCalledWith('/league-builder/leagues');
    });

    test('TEAMS card navigates to teams page', () => {
      render(<LeagueBuilder />);
      fireEvent.click(screen.getByText('TEAMS'));
      expect(mockNavigate).toHaveBeenCalledWith('/league-builder/teams');
    });

    test('PLAYERS card navigates to players page', () => {
      render(<LeagueBuilder />);
      fireEvent.click(screen.getByText('PLAYERS'));
      expect(mockNavigate).toHaveBeenCalledWith('/league-builder/players');
    });

    test('ROSTERS card navigates to rosters page', () => {
      render(<LeagueBuilder />);
      fireEvent.click(screen.getByText('ROSTERS'));
      expect(mockNavigate).toHaveBeenCalledWith('/league-builder/rosters');
    });

    test('DRAFT card navigates to draft page', () => {
      render(<LeagueBuilder />);
      fireEvent.click(screen.getByText('DRAFT'));
      expect(mockNavigate).toHaveBeenCalledWith('/league-builder/draft');
    });

    test('RULES card navigates to rules page', () => {
      render(<LeagueBuilder />);
      fireEvent.click(screen.getByText('RULES'));
      expect(mockNavigate).toHaveBeenCalledWith('/league-builder/rules');
    });
  });

  describe('Current Leagues Section', () => {
    test('renders CURRENT LEAGUES header', () => {
      render(<LeagueBuilder />);
      expect(screen.getByText(/CURRENT LEAGUES/)).toBeInTheDocument();
    });

    test('renders league rows', () => {
      render(<LeagueBuilder />);
      expect(screen.getByText('KRUSE BASEBALL')).toBeInTheDocument();
      expect(screen.getByText('MINOR LEAGUE')).toBeInTheDocument();
    });

    test('shows team count for each league', () => {
      render(<LeagueBuilder />);
      expect(screen.getByText('2 teams')).toBeInTheDocument();
      expect(screen.getByText('1 team')).toBeInTheDocument();
    });

    test('clicking league row navigates to league detail', () => {
      render(<LeagueBuilder />);
      fireEvent.click(screen.getByText('KRUSE BASEBALL'));
      expect(mockNavigate).toHaveBeenCalledWith('/league-builder/leagues?id=league-1');
    });

    test('renders CREATE NEW LEAGUE button', () => {
      render(<LeagueBuilder />);
      expect(screen.getByText('+ CREATE NEW LEAGUE')).toBeInTheDocument();
    });

    test('CREATE NEW LEAGUE button navigates with new flag', () => {
      render(<LeagueBuilder />);
      fireEvent.click(screen.getByText('+ CREATE NEW LEAGUE'));
      expect(mockNavigate).toHaveBeenCalledWith('/league-builder/leagues?new=true');
    });
  });

  describe('Loading State', () => {
    test('shows loading indicator when isLoading', async () => {
      const { useLeagueBuilderData } = await import('../../hooks/useLeagueBuilderData');
      vi.mocked(useLeagueBuilderData).mockReturnValue({
        leagues: [],
        teams: [],
        players: [],
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
        refresh: vi.fn(),
      });

      render(<LeagueBuilder />);
      expect(screen.getByText('Loading leagues...')).toBeInTheDocument();
    });

    test('shows ... for counts when loading', async () => {
      const { useLeagueBuilderData } = await import('../../hooks/useLeagueBuilderData');
      vi.mocked(useLeagueBuilderData).mockReturnValue({
        leagues: [],
        teams: [],
        players: [],
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
        refresh: vi.fn(),
      });

      render(<LeagueBuilder />);
      const ellipses = screen.getAllByText('...');
      expect(ellipses.length).toBeGreaterThan(0);
    });
  });

  describe('Error State', () => {
    test('shows error message when error occurs', async () => {
      const { useLeagueBuilderData } = await import('../../hooks/useLeagueBuilderData');
      vi.mocked(useLeagueBuilderData).mockReturnValue({
        leagues: [],
        teams: [],
        players: [],
        rulesPresets: [],
        isLoading: false,
        error: 'Failed to load data',
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

      render(<LeagueBuilder />);
      expect(screen.getByText('Error: Failed to load data')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    test('shows empty message when no leagues exist', async () => {
      const { useLeagueBuilderData } = await import('../../hooks/useLeagueBuilderData');
      vi.mocked(useLeagueBuilderData).mockReturnValue({
        leagues: [],
        teams: [],
        players: [],
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
        refresh: vi.fn(),
      });

      render(<LeagueBuilder />);
      expect(screen.getByText('No leagues created yet. Create your first league below!')).toBeInTheDocument();
    });
  });

  describe('Singular/Plural Counts', () => {
    test('shows singular "league" for 1 league', async () => {
      const { useLeagueBuilderData } = await import('../../hooks/useLeagueBuilderData');
      vi.mocked(useLeagueBuilderData).mockReturnValue({
        leagues: [{ id: 'league-1', name: 'Test', teamIds: [], defaultRulesPreset: '' }],
        teams: [],
        players: [],
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
        refresh: vi.fn(),
      });

      render(<LeagueBuilder />);
      expect(screen.getByText('1 league')).toBeInTheDocument();
    });

    test('shows singular "team" for 1 team in league row', async () => {
      const { useLeagueBuilderData } = await import('../../hooks/useLeagueBuilderData');
      vi.mocked(useLeagueBuilderData).mockReturnValue({
        leagues: [{ id: 'league-1', name: 'Test', teamIds: ['team-1'], defaultRulesPreset: '' }],
        teams: [{ id: 'team-1', name: 'Sox' }],
        players: [],
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
        refresh: vi.fn(),
      });

      render(<LeagueBuilder />);
      // The league row shows "1 team" (not "1 teams")
      const teamTexts = screen.getAllByText('1 team');
      expect(teamTexts.length).toBeGreaterThan(0);
    });
  });
});
