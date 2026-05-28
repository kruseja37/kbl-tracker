/**
 * FranchiseSetup Component Tests
 *
 * Tests the franchise setup wizard with step navigation.
 * Updated 2026-02-07: Aligned mocks with data-driven component (useLeagueBuilderData).
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { FranchiseSetup } from '../../app/pages/FranchiseSetup';

// ============================================
// MOCKS
// ============================================

const mockNavigate = vi.fn();
const mockRunStartupProspectDraftForLeague = vi.fn();
const mockRollbackStartupProspectDraftForLeague = vi.fn();
const mockInitializeFranchise = vi.fn();

vi.mock('react-router', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('../../../utils/franchiseStartupProspectDraft', () => ({
  runStartupProspectDraftForLeague: (...args: unknown[]) => mockRunStartupProspectDraftForLeague(...args),
  rollbackStartupProspectDraftForLeague: (...args: unknown[]) => mockRollbackStartupProspectDraftForLeague(...args),
}));

vi.mock('../../../utils/franchiseInitializer', () => ({
  initializeFranchise: (...args: unknown[]) => mockInitializeFranchise(...args),
}));

// Mock league data — FranchiseSetup uses { leagues, teams, isLoading, error } from this hook
vi.mock('../../hooks/useLeagueBuilderData', () => ({
  useLeagueBuilderData: vi.fn(() => ({
    leagues: [
      {
        id: 'kbl',
        name: 'Kruse Baseball League',
        description: 'The premier league',
        teamIds: Array.from({ length: 16 }, (_, i) => `team-${i + 1}`),
        conferences: [
          { id: 'conf-1', name: 'National', divisionIds: ['div-1', 'div-2'] },
          { id: 'conf-2', name: 'American', divisionIds: ['div-3', 'div-4'] },
        ],
        divisions: [
          { id: 'div-1', name: 'East', teamIds: ['team-1', 'team-2', 'team-3', 'team-4'] },
          { id: 'div-2', name: 'West', teamIds: ['team-5', 'team-6', 'team-7', 'team-8'] },
          { id: 'div-3', name: 'Central', teamIds: ['team-9', 'team-10', 'team-11', 'team-12'] },
          { id: 'div-4', name: 'South', teamIds: ['team-13', 'team-14', 'team-15', 'team-16'] },
        ],
        defaultRulesPreset: 'preset-1',
        createdDate: '2026-01-01',
        lastModified: '2026-01-01',
      },
      {
        id: 'summer',
        name: 'Summer League',
        description: 'Casual summer play',
        teamIds: ['team-17', 'team-18', 'team-19', 'team-20'],
        conferences: [],
        divisions: [],
        defaultRulesPreset: 'preset-1',
        createdDate: '2026-01-01',
        lastModified: '2026-01-01',
      },
    ],
    teams: Array.from({ length: 20 }, (_, i) => ({
      id: `team-${i + 1}`,
      name: `Team ${i + 1}`,
      abbreviation: `T${i + 1}`,
      location: 'City',
      nickname: `Nickname ${i + 1}`,
    })),
    players: [],
    rulesPresets: [],
    isLoading: false,
    error: null,
    // All required hook functions (not used by FranchiseSetup but must exist)
    getLeague: vi.fn(),
    createLeague: vi.fn(),
    updateLeague: vi.fn(),
    removeLeague: vi.fn(),
    duplicateLeague: vi.fn(),
    getTeamById: vi.fn(),
    createTeam: vi.fn(),
    updateTeam: vi.fn(),
    removeTeam: vi.fn(),
    getPlayerById: vi.fn(),
    getTeamPlayers: vi.fn(),
    createPlayer: vi.fn(),
    updatePlayer: vi.fn(),
    removePlayer: vi.fn(),
    getRulesById: vi.fn(),
    createRulesPreset: vi.fn(),
    updateRulesPreset: vi.fn(),
    removeRulesPreset: vi.fn(),
    getRoster: vi.fn(),
    updateRoster: vi.fn(),
    removeRoster: vi.fn(),
    seedSMB4Data: vi.fn(),
    isSMB4Seeded: vi.fn(() => Promise.resolve(false)),
    refresh: vi.fn(),
  })),
}));

// ============================================
// TESTS
// ============================================

describe('FranchiseSetup Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockRunStartupProspectDraftForLeague.mockResolvedValue({
      valid: true,
      picks: [],
      issues: [],
    });
    mockRollbackStartupProspectDraftForLeague.mockResolvedValue({ valid: true, errors: [] });
    mockInitializeFranchise.mockResolvedValue('franchise-1');
  });

  function selectLeagueAndAdvance(times = 1) {
    fireEvent.click(screen.getByText('KRUSE BASEBALL LEAGUE'));
    const next = () => fireEvent.click(screen.getByRole('button', { name: /NEXT/i }));
    for (let index = 0; index < times; index += 1) {
      next();
    }
  }

  describe('Header', () => {
    test('renders NEW FRANCHISE title', () => {
      render(<FranchiseSetup />);
      expect(screen.getByText('NEW FRANCHISE')).toBeInTheDocument();
    });

    test('shows step progress indicator', () => {
      render(<FranchiseSetup />);
      expect(screen.getByText(/Step 1 of 6/)).toBeInTheDocument();
    });
  });

  describe('Progress Indicators', () => {
    test('renders step labels', () => {
      render(<FranchiseSetup />);
      expect(screen.getByText('League')).toBeInTheDocument();
      expect(screen.getByText('Season')).toBeInTheDocument();
      expect(screen.getByText('Playoffs')).toBeInTheDocument();
      expect(screen.getByText('Teams')).toBeInTheDocument();
      expect(screen.getByText('Rosters')).toBeInTheDocument();
      expect(screen.getByText('Confirm')).toBeInTheDocument();
    });

    test('shows 6 progress step buttons', () => {
      render(<FranchiseSetup />);
      const stepButtons = screen.getAllByRole('button');
      // Should have 6 step buttons plus navigation buttons
      expect(stepButtons.length).toBeGreaterThanOrEqual(6);
    });
  });

  describe('Step 1 - League Selection', () => {
    test('shows SELECT A LEAGUE title', () => {
      render(<FranchiseSetup />);
      expect(screen.getByText('SELECT A LEAGUE')).toBeInTheDocument();
    });

    test('shows league options from hook data', () => {
      render(<FranchiseSetup />);
      // League names are uppercased in the component
      expect(screen.getByText('KRUSE BASEBALL LEAGUE')).toBeInTheDocument();
      expect(screen.getByText('SUMMER LEAGUE')).toBeInTheDocument();
    });

    test('shows league description text', () => {
      render(<FranchiseSetup />);
      expect(screen.getByText(/Choose the league template/i)).toBeInTheDocument();
    });
  });

  describe('Navigation', () => {
    test('CANCEL button navigates home', () => {
      render(<FranchiseSetup />);
      fireEvent.click(screen.getByRole('button', { name: /CANCEL/i }));
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });

    test('no BACK button on step 1', () => {
      render(<FranchiseSetup />);
      expect(screen.queryByRole('button', { name: /BACK/i })).not.toBeInTheDocument();
    });
  });

  describe('League Details', () => {
    test('shows team count in league info', () => {
      render(<FranchiseSetup />);
      // KBL has 16 teams in our mock data
      expect(screen.getByText(/16 teams/)).toBeInTheDocument();
    });

    test('shows Create New League option', () => {
      render(<FranchiseSetup />);
      expect(screen.getByText(/Create New League/i)).toBeInTheDocument();
    });

    test('shows conference info for KBL', () => {
      render(<FranchiseSetup />);
      expect(screen.getByText(/2 conferences/)).toBeInTheDocument();
    });

    test('shows divisions info for KBL', () => {
      render(<FranchiseSetup />);
      expect(screen.getByText(/4 divisions/)).toBeInTheDocument();
    });
  });

  describe('League Card Expansion', () => {
    test('shows expand button for leagues with structure', () => {
      render(<FranchiseSetup />);
      // KBL has conferences and should have expand button (▼ or ▲)
      const expandButtons = screen.getAllByRole('button').filter((btn) =>
        btn.textContent === '▼' || btn.textContent === '▲'
      );
      expect(expandButtons.length).toBeGreaterThan(0);
    });
  });

  describe('Franchise v1 release gates', () => {
    test('marks unsupported setup events as deferred instead of selectable', () => {
      render(<FranchiseSetup />);
      selectLeagueAndAdvance(1);

      expect(screen.getByRole('button', { name: /All-Star Game.*deferred in v1/i })).toBeDisabled();

      fireEvent.click(screen.getByRole('button', { name: /NEXT/i }));
      expect(screen.getByRole('button', { name: /Pool Play.*deferred/i })).toBeDisabled();
      expect(screen.getByRole('button', { name: /Best Record Bye.*deferred/i })).toBeDisabled();
    });

    test('keeps team control explicit with no AI or random team shortcut copy', () => {
      render(<FranchiseSetup />);
      selectLeagueAndAdvance(3);

      expect(screen.getByText(/Unselected teams remain uncontrolled/i)).toBeInTheDocument();
      expect(screen.getByText(/UNCONTROLLED:/i)).toBeInTheDocument();
      expect(screen.queryByText(/AI-CONTROLLED/i)).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Random 1/i })).not.toBeInTheDocument();
    });

    test('defers fantasy draft and enables startup prospect draft for farms', () => {
      render(<FranchiseSetup />);
      selectLeagueAndAdvance(3);
      fireEvent.click(screen.getAllByRole('button', { name: /Team 1/i })[0]);
      fireEvent.click(screen.getByRole('button', { name: /NEXT/i }));

      expect(screen.getByRole('button', { name: /Fantasy Draft.*Deferred/i })).toBeDisabled();
      expect(screen.getByText(/22 MLB \+ 10 FARM/i)).toBeInTheDocument();
      expect(screen.getByText(/Startup Prospect Draft fills missing FARM slots/i)).toBeInTheDocument();
      expect(screen.getByText(/auto-runs a 10-round snake prospect draft/i)).toBeInTheDocument();
      expect(screen.queryByText(/Generate new fictional players/i)).not.toBeInTheDocument();
    });

    test('runs startup prospect draft before franchise initialization', async () => {
      render(<FranchiseSetup />);
      selectLeagueAndAdvance(3);
      fireEvent.click(screen.getAllByRole('button', { name: /Team 1/i })[0]);
      fireEvent.click(screen.getByRole('button', { name: /NEXT/i }));
      fireEvent.click(screen.getByRole('button', { name: /NEXT/i }));
      fireEvent.click(screen.getByRole('button', { name: /START FRANCHISE/i }));

      await waitFor(() => {
        expect(mockInitializeFranchise).toHaveBeenCalled();
      });
      expect(mockRunStartupProspectDraftForLeague).toHaveBeenCalledWith('kbl', {
        rounds: 10,
        seasonNumber: 1,
      });
      expect(mockInitializeFranchise).toHaveBeenCalled();
      expect(mockRunStartupProspectDraftForLeague.mock.invocationCallOrder[0]).toBeLessThan(
        mockInitializeFranchise.mock.invocationCallOrder[0],
      );
    });

    test('blocks franchise initialization when startup prospect draft validation fails', async () => {
      mockRunStartupProspectDraftForLeague.mockResolvedValueOnce({
        valid: false,
        picks: [],
        issues: ['Team "team-1" FARM roster does not match player FARM assignments.'],
      });

      render(<FranchiseSetup />);
      selectLeagueAndAdvance(3);
      fireEvent.click(screen.getAllByRole('button', { name: /Team 1/i })[0]);
      fireEvent.click(screen.getByRole('button', { name: /NEXT/i }));
      fireEvent.click(screen.getByRole('button', { name: /NEXT/i }));
      fireEvent.click(screen.getByRole('button', { name: /START FRANCHISE/i }));

      expect(await screen.findByText(/Startup Prospect Draft blocked/i)).toBeInTheDocument();
      expect(mockInitializeFranchise).not.toHaveBeenCalled();
      expect(mockRollbackStartupProspectDraftForLeague).not.toHaveBeenCalled();
    });

    test('rolls back startup prospect picks when franchise initialization fails', async () => {
      const report = {
        valid: true,
        picks: [{ playerId: 'prospect-1', teamId: 'team-1' }],
        issues: [],
      };
      mockRunStartupProspectDraftForLeague.mockResolvedValueOnce(report);
      mockInitializeFranchise.mockRejectedValueOnce(new Error('copy failed'));

      render(<FranchiseSetup />);
      selectLeagueAndAdvance(3);
      fireEvent.click(screen.getAllByRole('button', { name: /Team 1/i })[0]);
      fireEvent.click(screen.getByRole('button', { name: /NEXT/i }));
      fireEvent.click(screen.getByRole('button', { name: /NEXT/i }));
      fireEvent.click(screen.getByRole('button', { name: /START FRANCHISE/i }));

      expect(await screen.findByText(/copy failed/i)).toBeInTheDocument();
      expect(mockRollbackStartupProspectDraftForLeague).toHaveBeenCalledWith('kbl', report);
    });
  });
});
