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
    createdAt: 1,
    result: {
      awayScore: 5,
      homeScore: 3,
      winningTeamId: 'TIGERS',
      losingTeamId: 'SOX',
    },
    completionSource: 'score-only' as const,
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
    createdAt: 2,
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
    createdAt: 3,
  },
];

const gameTrackerCompletedGame = {
  id: 'game-tracker-completed',
  seasonNumber: 2,
  gameNumber: 4,
  dayNumber: 4,
  date: 'July 15',
  time: '7:00 PM',
  awayTeamId: 'BEARS',
  homeTeamId: 'CROCS',
  status: 'COMPLETED' as const,
  createdAt: 4,
  result: {
    awayScore: 2,
    homeScore: 6,
    winningTeamId: 'CROCS',
    losingTeamId: 'BEARS',
  },
  completionSource: 'game-tracker' as const,
  gameLogId: 'completed-game-tracker-1',
};

const defaultProps = {
  games: mockGames,
  selectedTeam: 'FULL LEAGUE',
  onTeamChange: vi.fn(),
  availableTeams: ['TIGERS', 'SOX', 'BEARS', 'CROCS', 'MOOSE'],
  onAddGame: vi.fn(),
  dropdownOpen: false,
  setDropdownOpen: vi.fn(),
  stadiumMap: { TIGERS: 'Tiger Stadium', SOX: 'Sox Park', BEARS: 'Bear Field', CROCS: 'Croc Arena', MOOSE: 'Moose Dome' } as Record<string, string>,
  seasonNumber: 2,
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
      const seasonHeaders = screen.getAllByText(/SEASON 2 SCHEDULE/);
      expect(seasonHeaders.length).toBeGreaterThan(0);
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

    test('labels v1 schedule actions as user supplied with generated schedules off', () => {
      render(<ScheduleContent {...defaultProps} />);
      expect(screen.getByText(/V1 schedule is user-supplied only/i)).toBeInTheDocument();
      expect(screen.getByText(/Generated schedules are off/i)).toBeInTheDocument();
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

    test('marks score-only completed games distinctly', () => {
      render(<ScheduleContent {...defaultProps} />);
      expect(screen.getByText('SCORE ONLY')).toBeInTheDocument();
      expect(screen.getByText(/Schedule \+ standings only/i)).toBeInTheDocument();
      expect(screen.getByText(/May queue team-fan morale prompt; confirm in Random Event Log/i)).toBeInTheDocument();
      expect(screen.getByText(/No Game Detail archive, player stats, WPA, fame, milestones, awards, designations, relationships, or Almanac player evidence/i)).toBeInTheDocument();
    });

    test('links GameTracker-completed rows to Game Detail when a game archive exists', () => {
      render(<ScheduleContent {...defaultProps} games={[gameTrackerCompletedGame]} />);

      expect(screen.getByText('ARCHIVE')).toBeInTheDocument();
      expect(screen.getByRole('link', { name: /Game Detail/i })).toHaveAttribute(
        'href',
        '/almanac/games/completed-game-tracker-1',
      );
      expect(screen.queryByText('SCORE ONLY')).not.toBeInTheDocument();
    });

    test('does not link score-only completed rows to Game Detail', () => {
      render(<ScheduleContent {...defaultProps} games={[mockGames[0]]} />);

      expect(screen.getByText('SCORE ONLY')).toBeInTheDocument();
      expect(screen.queryByRole('link', { name: /Game Detail/i })).not.toBeInTheDocument();
    });

    test('completed rows do not expose edit delete or final score actions', () => {
      render(
        <ScheduleContent
          {...defaultProps}
          games={[mockGames[0]]}
          onEditGame={vi.fn()}
          onDeleteGame={vi.fn()}
          onEnterFinalScore={vi.fn()}
        />,
      );

      expect(screen.queryByTitle('Edit game')).not.toBeInTheDocument();
      expect(screen.queryByTitle('Remove game')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /Score Only/i })).not.toBeInTheDocument();
    });

    test('team-filtered completed rows show score-only label and stat-boundary copy', () => {
      render(<ScheduleContent {...defaultProps} selectedTeam="TIGERS" />);

      expect(screen.getByText('SCORE ONLY')).toBeInTheDocument();
      expect(screen.getByText(/Schedule \+ standings only/i)).toBeInTheDocument();
      expect(screen.getByText(/confirm in Random Event Log/i)).toBeInTheDocument();
      expect(screen.getByText(/No Game Detail archive, player stats, WPA, fame, milestones, awards, designations, relationships, or Almanac player evidence/i)).toBeInTheDocument();
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

    test('can request final-score-only entry for a scheduled game', () => {
      const onEnterFinalScore = vi.fn();
      render(<ScheduleContent {...defaultProps} onEnterFinalScore={onEnterFinalScore} />);

      fireEvent.click(screen.getAllByRole('button', { name: /Enter score-only final score/i })[0]);

      expect(onEnterFinalScore).toHaveBeenCalledWith(expect.objectContaining({
        id: 'game-2',
        status: 'SCHEDULED',
      }));
    });
  });

  describe('CSV Import', () => {
    test('labels CSV import as user-provided rows only', () => {
      render(<ScheduleContent {...defaultProps} onImportCsvRows={vi.fn()} />);

      expect(screen.getByText('CSV SCHEDULE IMPORT')).toBeInTheDocument();
      expect(screen.getByText(/User-provided rows only; import does not generate missing matchups/i)).toBeInTheDocument();
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
