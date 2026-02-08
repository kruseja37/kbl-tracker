/**
 * FranchiseSetup Component Tests
 *
 * Tests the franchise setup wizard with step navigation.
 * Updated 2026-02-07: Aligned mocks with data-driven component (useLeagueBuilderData).
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FranchiseSetup } from '../../app/pages/FranchiseSetup';

// ============================================
// MOCKS
// ============================================

const mockNavigate = vi.fn();

vi.mock('react-router', () => ({
  useNavigate: () => mockNavigate,
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
  });

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
});
