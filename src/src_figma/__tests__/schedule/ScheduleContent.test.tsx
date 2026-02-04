/**
 * ScheduleContent Component Tests
 *
 * Tests the schedule display component with game list and filtering.
 * Per Ralph Framework S-B017
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ScheduleContent } from '../../app/components/ScheduleContent';

// ============================================
// MOCKS
// ============================================

vi.mock('@/config/stadiumData', () => ({
  getStadiumForTeam: vi.fn().mockReturnValue('Test Stadium'),
}));

// ============================================
// DEFAULT PROPS
// ============================================

const mockGames = [
  {
    id: 'game-1',
    seasonNumber: 2,
    gameNumber: 1,
    dayNumber: 1,
    date: 'July 12',
    time: '7:00 PM',
    awayTeamId: 'TIGERS',
    homeTeamId: 'SOX',
    status: 'COMPLETED' as const,
    result: {
      awayScore: 5,
      homeScore: 3,
      winningTeamId: 'TIGERS',
      losingTeamId: 'SOX',
    },
  },
  {
    id: 'game-2',
    seasonNumber: 2,
    gameNumber: 2,
    dayNumber: 2,
    date: 'July 13',
    time: '7:00 PM',
    awayTeamId: 'SOX',
    homeTeamId: 'TIGERS',
    status: 'SCHEDULED' as const,
  },
  {
    id: 'game-3',
    seasonNumber: 2,
    gameNumber: 3,
    dayNumber: 3,
    date: 'July 14',
    time: '7:00 PM',
    awayTeamId: 'BEARS',
    homeTeamId: 'CROCS',
    status: 'SCHEDULED' as const,
  },
];

const defaultProps = {
  games: mockGames,
  selectedTeam: 'FULL LEAGUE',
  onTeamChange: vi.fn(),
  availableTeams: ['TIGERS', 'SOX', 'BEARS', 'CROCS', 'MOOSE'],
  onAddGame: vi.fn(),
  dropdownOpen: false,
  setDropdownOpen: vi.fn(),
};

// ============================================
// TESTS
// ============================================

describe('ScheduleContent Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Header', () => {
    test('renders schedule header with season info', () => {
      render(<ScheduleContent {...defaultProps} />);
      // Header shows "📅 SEASON 2 SCHEDULE"
      expect(screen.getByText(/SEASON 2 SCHEDULE/)).toBeInTheDocument();
    });

    test('renders Add Game button', () => {
      render(<ScheduleContent {...defaultProps} />);
      expect(screen.getByText('Add Game')).toBeInTheDocument();
    });

    test('clicking Add Game calls onAddGame', () => {
      const onAddGame = vi.fn();
      render(<ScheduleContent {...defaultProps} onAddGame={onAddGame} />);
      fireEvent.click(screen.getByText('Add Game'));
      expect(onAddGame).toHaveBeenCalled();
    });

    test('shows games count for full league', () => {
      render(<ScheduleContent {...defaultProps} />);
      expect(screen.getByText(/3 games scheduled/)).toBeInTheDocument();
    });
  });

  describe('Team Filter Dropdown', () => {
    test('renders filter dropdown button', () => {
      render(<ScheduleContent {...defaultProps} />);
      expect(screen.getByText(/Filter: FULL LEAGUE/)).toBeInTheDocument();
    });

    test('clicking filter button calls setDropdownOpen', () => {
      const setDropdownOpen = vi.fn();
      render(<ScheduleContent {...defaultProps} setDropdownOpen={setDropdownOpen} />);
      fireEvent.click(screen.getByText(/Filter: FULL LEAGUE/));
      expect(setDropdownOpen).toHaveBeenCalledWith(true);
    });

    test('shows FULL LEAGUE option when dropdown open', () => {
      render(<ScheduleContent {...defaultProps} dropdownOpen={true} />);
      // There should be "FULL LEAGUE" in the dropdown options
      const fullLeagueElements = screen.getAllByText('FULL LEAGUE');
      expect(fullLeagueElements.length).toBeGreaterThan(0);
    });

    test('shows team names in dropdown when open', () => {
      render(<ScheduleContent {...defaultProps} dropdownOpen={true} />);
      // Should show the available teams
      expect(screen.getAllByText('TIGERS').length).toBeGreaterThan(0);
      expect(screen.getAllByText('SOX').length).toBeGreaterThan(0);
    });
  });

  describe('Filtered View', () => {
    test('shows team stats when filtered by team', () => {
      render(<ScheduleContent {...defaultProps} selectedTeam="TIGERS" />);
      // Should show TIGERS filter is active
      expect(screen.getByText(/Filter: TIGERS/)).toBeInTheDocument();
    });

    test('shows games count for filtered team', () => {
      render(<ScheduleContent {...defaultProps} selectedTeam="TIGERS" />);
      expect(screen.getByText(/Showing: 2 games/)).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    test('shows empty state when no games', () => {
      render(<ScheduleContent {...defaultProps} games={[]} />);
      expect(screen.getByText('NO GAMES SCHEDULED')).toBeInTheDocument();
    });

    test('empty state has Add Game button', () => {
      render(<ScheduleContent {...defaultProps} games={[]} />);
      const addButtons = screen.getAllByText(/Add Game|Add Series/);
      expect(addButtons.length).toBeGreaterThan(0);
    });

    test('empty state message mentions Season 2', () => {
      render(<ScheduleContent {...defaultProps} games={[]} />);
      expect(screen.getByText(/Season 2 schedule is empty/)).toBeInTheDocument();
    });
  });

  describe('Game List', () => {
    test('renders completed games date', () => {
      render(<ScheduleContent {...defaultProps} />);
      // Game 1 date
      expect(screen.getByText('July 12')).toBeInTheDocument();
    });

    test('shows team names in matchups', () => {
      render(<ScheduleContent {...defaultProps} />);
      expect(screen.getAllByText('TIGERS').length).toBeGreaterThan(0);
      expect(screen.getAllByText('SOX').length).toBeGreaterThan(0);
    });

    test('shows completed games section', () => {
      render(<ScheduleContent {...defaultProps} />);
      // There's a completed games indicator
      expect(screen.getByText(/COMPLETED GAMES/)).toBeInTheDocument();
    });
  });

  describe('Next Game Highlight', () => {
    test('shows NEXT GAME label for upcoming game', () => {
      render(<ScheduleContent {...defaultProps} />);
      expect(screen.getByText('NEXT GAME')).toBeInTheDocument();
    });

    test('shows game number for next game', () => {
      render(<ScheduleContent {...defaultProps} />);
      // Next game is game 2
      expect(screen.getByText('Game 2')).toBeInTheDocument();
    });
  });

  describe('Game Details', () => {
    test('shows AWAY and HOME labels', () => {
      render(<ScheduleContent {...defaultProps} />);
      expect(screen.getAllByText('(AWAY)').length).toBeGreaterThan(0);
      expect(screen.getAllByText('(HOME)').length).toBeGreaterThan(0);
    });

    test('shows @ symbol between teams', () => {
      render(<ScheduleContent {...defaultProps} />);
      expect(screen.getAllByText('@').length).toBeGreaterThan(0);
    });
  });

  describe('Filter Change', () => {
    test('selecting team from dropdown calls onTeamChange', () => {
      const onTeamChange = vi.fn();
      const setDropdownOpen = vi.fn();
      render(
        <ScheduleContent
          {...defaultProps}
          dropdownOpen={true}
          onTeamChange={onTeamChange}
          setDropdownOpen={setDropdownOpen}
        />
      );

      // Click on the MOOSE option in dropdown (MOOSE is only in availableTeams, not in games)
      const mooseOption = screen.getByText('MOOSE');
      fireEvent.click(mooseOption);

      expect(onTeamChange).toHaveBeenCalledWith('MOOSE');
      expect(setDropdownOpen).toHaveBeenCalledWith(false);
    });
  });
});
