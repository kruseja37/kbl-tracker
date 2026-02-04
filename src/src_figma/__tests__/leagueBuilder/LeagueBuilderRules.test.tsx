/**
 * LeagueBuilderRules Component Tests
 *
 * Tests the rules presets management page with CRUD operations.
 * Per Ralph Framework S-B017
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LeagueBuilderRules } from '../../app/pages/LeagueBuilderRules';

// ============================================
// MOCKS
// ============================================

const mockNavigate = vi.fn();

vi.mock('react-router', () => ({
  useNavigate: () => mockNavigate,
}));

const mockCreateRulesPreset = vi.fn().mockResolvedValue({ id: 'new-preset' });
const mockUpdateRulesPreset = vi.fn().mockResolvedValue(undefined);
const mockRemoveRulesPreset = vi.fn().mockResolvedValue(undefined);

vi.mock('../../hooks/useLeagueBuilderData', () => ({
  useLeagueBuilderData: vi.fn(() => ({
    rulesPresets: [
      {
        id: 'preset-1',
        name: 'Standard Rules',
        description: 'Default 9-inning rules',
        isDefault: true,
        isEditable: false,
        game: {
          inningsPerGame: 9,
          extraInningsRule: 'standard',
          mercyRule: { enabled: false, runDifferential: 10, afterInning: 7 },
          pitchCounts: { enabled: true, starterLimit: 100, relieverLimit: 40 },
          moundVisits: { enabled: true, perGame: 5 },
        },
        season: {
          gamesPerTeam: 50,
          scheduleType: 'balanced',
          allStarGame: true,
          allStarTiming: 0.5,
          tradeDeadline: { enabled: true, timing: 0.75 },
        },
        playoffs: {
          teamsQualifying: 4,
          format: 'bracket',
          seriesLengths: [5, 7, 7],
          homeFieldAdvantage: 'higher_seed',
        },
        createdDate: '2026-01-01T00:00:00.000Z',
        lastModified: '2026-01-15T00:00:00.000Z',
      },
      {
        id: 'preset-2',
        name: 'Quick Game',
        description: 'Fast-paced 6-inning games',
        isDefault: false,
        isEditable: true,
        game: {
          inningsPerGame: 6,
          extraInningsRule: 'runner_on_second',
          mercyRule: { enabled: true, runDifferential: 8, afterInning: 5 },
          pitchCounts: { enabled: true, starterLimit: 80, relieverLimit: 30 },
          moundVisits: { enabled: false, perGame: 3 },
        },
        season: {
          gamesPerTeam: 30,
          scheduleType: 'division_heavy',
          allStarGame: false,
          allStarTiming: 0.5,
          tradeDeadline: { enabled: false, timing: 0.75 },
        },
        playoffs: {
          teamsQualifying: 4,
          format: 'bracket',
          seriesLengths: [3, 5],
          homeFieldAdvantage: 'alternating',
        },
        createdDate: '2026-01-10T00:00:00.000Z',
        lastModified: '2026-01-20T00:00:00.000Z',
      },
    ],
    isLoading: false,
    error: null,
    createRulesPreset: mockCreateRulesPreset,
    updateRulesPreset: mockUpdateRulesPreset,
    removeRulesPreset: mockRemoveRulesPreset,
  })),
}));

// ============================================
// TESTS
// ============================================

describe('LeagueBuilderRules Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Header', () => {
    test('renders RULES PRESETS title', () => {
      render(<LeagueBuilderRules />);
      expect(screen.getByText('RULES PRESETS')).toBeInTheDocument();
    });

    test('renders back button', () => {
      render(<LeagueBuilderRules />);
      const buttons = screen.getAllByRole('button');
      expect(buttons[0]).toBeInTheDocument();
    });

    test('back button navigates to league builder', () => {
      render(<LeagueBuilderRules />);
      const buttons = screen.getAllByRole('button');
      fireEvent.click(buttons[0]);
      expect(mockNavigate).toHaveBeenCalledWith('/league-builder');
    });
  });

  describe('Create Button', () => {
    test('renders NEW PRESET button', () => {
      render(<LeagueBuilderRules />);
      expect(screen.getByText('NEW PRESET')).toBeInTheDocument();
    });

    test('clicking NEW PRESET opens modal', async () => {
      render(<LeagueBuilderRules />);
      fireEvent.click(screen.getByText('NEW PRESET'));
      await waitFor(() => {
        expect(screen.getByText('CREATE PRESET')).toBeInTheDocument();
      });
    });
  });

  describe('Presets List', () => {
    test('renders AVAILABLE PRESETS header', () => {
      render(<LeagueBuilderRules />);
      expect(screen.getByText('AVAILABLE PRESETS')).toBeInTheDocument();
    });

    test('renders preset names', () => {
      render(<LeagueBuilderRules />);
      expect(screen.getByText('Standard Rules')).toBeInTheDocument();
      expect(screen.getByText('Quick Game')).toBeInTheDocument();
    });

    test('renders preset descriptions', () => {
      render(<LeagueBuilderRules />);
      expect(screen.getByText('Default 9-inning rules')).toBeInTheDocument();
      expect(screen.getByText('Fast-paced 6-inning games')).toBeInTheDocument();
    });

    test('selects first preset by default', () => {
      render(<LeagueBuilderRules />);
      // First preset should show game rules section
      expect(screen.getByText('GAME RULES')).toBeInTheDocument();
    });
  });

  describe('Tabs', () => {
    test('renders game, season, playoffs tabs', () => {
      render(<LeagueBuilderRules />);
      expect(screen.getByRole('button', { name: 'GAME' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'SEASON' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'PLAYOFFS' })).toBeInTheDocument();
    });

    test('clicking season tab shows season settings', () => {
      render(<LeagueBuilderRules />);
      fireEvent.click(screen.getByRole('button', { name: 'SEASON' }));
      expect(screen.getByText('SEASON STRUCTURE')).toBeInTheDocument();
    });

    test('clicking playoffs tab shows playoff settings', () => {
      render(<LeagueBuilderRules />);
      fireEvent.click(screen.getByRole('button', { name: 'PLAYOFFS' }));
      expect(screen.getByText('PLAYOFF FORMAT')).toBeInTheDocument();
    });
  });

  describe('Game Settings Display', () => {
    test('shows innings per game setting', () => {
      render(<LeagueBuilderRules />);
      expect(screen.getByText('Innings Per Game')).toBeInTheDocument();
      expect(screen.getByText('9')).toBeInTheDocument();
    });

    test('shows extra innings rule', () => {
      render(<LeagueBuilderRules />);
      expect(screen.getByText('Extra Innings')).toBeInTheDocument();
      expect(screen.getByText('Standard')).toBeInTheDocument();
    });

    test('shows mercy rule status', () => {
      render(<LeagueBuilderRules />);
      expect(screen.getByText('Mercy Rule')).toBeInTheDocument();
      expect(screen.getByText('Disabled')).toBeInTheDocument();
    });
  });

  describe('Season Settings Display', () => {
    test('shows games per team', () => {
      render(<LeagueBuilderRules />);
      fireEvent.click(screen.getByRole('button', { name: 'SEASON' }));
      expect(screen.getByText('Games Per Team')).toBeInTheDocument();
      expect(screen.getByText('50')).toBeInTheDocument();
    });

    test('shows schedule type', () => {
      render(<LeagueBuilderRules />);
      fireEvent.click(screen.getByRole('button', { name: 'SEASON' }));
      expect(screen.getByText('Schedule Type')).toBeInTheDocument();
      expect(screen.getByText('Balanced')).toBeInTheDocument();
    });
  });

  describe('Playoff Settings Display', () => {
    test('shows teams qualifying', () => {
      render(<LeagueBuilderRules />);
      fireEvent.click(screen.getByRole('button', { name: 'PLAYOFFS' }));
      expect(screen.getByText('Teams Qualifying')).toBeInTheDocument();
      expect(screen.getByText('4')).toBeInTheDocument();
    });

    test('shows playoff format', () => {
      render(<LeagueBuilderRules />);
      fireEvent.click(screen.getByRole('button', { name: 'PLAYOFFS' }));
      expect(screen.getByText('Format')).toBeInTheDocument();
      expect(screen.getByText('Single Bracket')).toBeInTheDocument();
    });
  });

  describe('Preset Selection', () => {
    test('clicking preset selects it', () => {
      render(<LeagueBuilderRules />);
      fireEvent.click(screen.getByText('Quick Game'));
      // Quick Game has 6 innings
      expect(screen.getByText('6')).toBeInTheDocument();
    });
  });

  describe('Modal Form', () => {
    test('modal shows name input', async () => {
      render(<LeagueBuilderRules />);
      fireEvent.click(screen.getByText('NEW PRESET'));
      await waitFor(() => {
        expect(screen.getByText('PRESET NAME')).toBeInTheDocument();
      });
    });

    test('modal shows description input', async () => {
      render(<LeagueBuilderRules />);
      fireEvent.click(screen.getByText('NEW PRESET'));
      await waitFor(() => {
        expect(screen.getByText('DESCRIPTION')).toBeInTheDocument();
      });
    });

    test('modal has create button', async () => {
      render(<LeagueBuilderRules />);
      fireEvent.click(screen.getByText('NEW PRESET'));
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'CREATE' })).toBeInTheDocument();
      });
    });

    test('modal has cancel button', async () => {
      render(<LeagueBuilderRules />);
      fireEvent.click(screen.getByText('NEW PRESET'));
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'CANCEL' })).toBeInTheDocument();
      });
    });
  });

  describe('Loading State', () => {
    test('shows loading indicator when isLoading', async () => {
      const { useLeagueBuilderData } = await import('../../hooks/useLeagueBuilderData');
      vi.mocked(useLeagueBuilderData).mockReturnValue({
        rulesPresets: [],
        leagues: [],
        teams: [],
        players: [],
        isLoading: true,
        error: null,
        createRulesPreset: mockCreateRulesPreset,
        updateRulesPreset: mockUpdateRulesPreset,
        removeRulesPreset: mockRemoveRulesPreset,
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
        getRoster: vi.fn(),
        updateRoster: vi.fn(),
        refresh: vi.fn(),
      });

      render(<LeagueBuilderRules />);
      expect(screen.getByText('Loading rules presets...')).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    test('shows error message when error occurs', async () => {
      const { useLeagueBuilderData } = await import('../../hooks/useLeagueBuilderData');
      vi.mocked(useLeagueBuilderData).mockReturnValue({
        rulesPresets: [],
        leagues: [],
        teams: [],
        players: [],
        isLoading: false,
        error: 'Failed to load rules presets',
        createRulesPreset: mockCreateRulesPreset,
        updateRulesPreset: mockUpdateRulesPreset,
        removeRulesPreset: mockRemoveRulesPreset,
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
        getRoster: vi.fn(),
        updateRoster: vi.fn(),
        refresh: vi.fn(),
      });

      render(<LeagueBuilderRules />);
      expect(screen.getByText(/Failed to load rules presets/)).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    test('shows select preset message when no preset selected', async () => {
      const { useLeagueBuilderData } = await import('../../hooks/useLeagueBuilderData');
      vi.mocked(useLeagueBuilderData).mockReturnValue({
        rulesPresets: [],
        leagues: [],
        teams: [],
        players: [],
        isLoading: false,
        error: null,
        createRulesPreset: mockCreateRulesPreset,
        updateRulesPreset: mockUpdateRulesPreset,
        removeRulesPreset: mockRemoveRulesPreset,
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
        getRoster: vi.fn(),
        updateRoster: vi.fn(),
        refresh: vi.fn(),
      });

      render(<LeagueBuilderRules />);
      expect(screen.getByText('Select a preset to view details')).toBeInTheDocument();
    });
  });
});
