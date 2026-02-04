/**
 * PostGameSummary Component Tests
 *
 * Tests the post-game summary display with box scores and player of the game.
 * Per Ralph Framework S-B017
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PostGameSummary } from '../../app/pages/PostGameSummary';

// ============================================
// MOCKS
// ============================================

const mockNavigate = vi.fn();

vi.mock('react-router', () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock('@/config/teamColors', () => ({
  getTeamColors: (teamId: string) => ({
    primary: teamId === 'sox' ? '#FF0000' : '#FF6600',
    secondary: '#FFFFFF',
    stadium: teamId === 'sox' ? 'Sox Field' : 'Tiger Stadium',
  }),
}));

// ============================================
// TESTS
// ============================================

describe('PostGameSummary Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Header', () => {
    test('renders POST-GAME REPORT header', () => {
      render(<PostGameSummary />);
      expect(screen.getByText('POST-GAME REPORT')).toBeInTheDocument();
    });

    test('renders LIVE badge', () => {
      render(<PostGameSummary />);
      expect(screen.getByText('LIVE')).toBeInTheDocument();
    });

    test('renders Super Mega Baseball branding', () => {
      render(<PostGameSummary />);
      expect(screen.getByText('SUPER MEGA')).toBeInTheDocument();
      expect(screen.getByText('BASEBALL')).toBeInTheDocument();
    });
  });

  describe('Scoreboard', () => {
    test('renders team names', () => {
      render(<PostGameSummary />);
      expect(screen.getByText('TIGERS')).toBeInTheDocument();
      expect(screen.getByText('SOX')).toBeInTheDocument();
    });

    test('renders final score for away team', () => {
      render(<PostGameSummary />);
      // Away team score: 3 runs
      const threeElements = screen.getAllByText('3');
      expect(threeElements.length).toBeGreaterThan(0);
    });

    test('renders final score for home team', () => {
      render(<PostGameSummary />);
      // Home team score: 4 runs
      const fourElements = screen.getAllByText('4');
      expect(fourElements.length).toBeGreaterThan(0);
    });

    test('renders inning-by-inning scores', () => {
      render(<PostGameSummary />);
      // Inning headers 1-9 (may appear multiple times)
      expect(screen.getAllByText('1').length).toBeGreaterThan(0);
      expect(screen.getAllByText('2').length).toBeGreaterThan(0);
      expect(screen.getAllByText('9').length).toBeGreaterThan(0);
    });

    test('renders R H E headers', () => {
      render(<PostGameSummary />);
      expect(screen.getByText('R')).toBeInTheDocument();
      expect(screen.getByText('H')).toBeInTheDocument();
      expect(screen.getByText('E')).toBeInTheDocument();
    });

    test('renders SOX WIN message', () => {
      render(<PostGameSummary />);
      expect(screen.getByText(/SOX WIN/)).toBeInTheDocument();
    });
  });

  describe('Players of the Game', () => {
    test('renders POG 3 stars', () => {
      render(<PostGameSummary />);
      expect(screen.getByText('POG ★★★')).toBeInTheDocument();
    });

    test('renders POG 2 stars', () => {
      render(<PostGameSummary />);
      expect(screen.getByText('POG ★★')).toBeInTheDocument();
    });

    test('renders POG 1 star', () => {
      render(<PostGameSummary />);
      expect(screen.getByText('POG ★')).toBeInTheDocument();
    });

    test('renders 3-star POG player name', () => {
      render(<PostGameSummary />);
      expect(screen.getByText('J. MARTINEZ')).toBeInTheDocument();
    });

    test('renders 2-star POG player name', () => {
      render(<PostGameSummary />);
      expect(screen.getByText('T. WILLIAMS')).toBeInTheDocument();
    });

    test('renders 1-star POG player name', () => {
      render(<PostGameSummary />);
      expect(screen.getByText('R. JOHNSON')).toBeInTheDocument();
    });

    test('renders POG stats', () => {
      render(<PostGameSummary />);
      expect(screen.getByText('3-4 • 2 HR • 4 RBI')).toBeInTheDocument();
    });
  });

  describe('Box Score', () => {
    test('renders BOX SCORE button', () => {
      render(<PostGameSummary />);
      expect(screen.getByText('BOX SCORE')).toBeInTheDocument();
    });

    test('box score is collapsed by default', () => {
      render(<PostGameSummary />);
      // Look for expanded content that should NOT be visible
      expect(screen.queryByText('TIGERS BATTING')).not.toBeInTheDocument();
    });

    test('clicking BOX SCORE expands it', () => {
      render(<PostGameSummary />);
      fireEvent.click(screen.getByText('BOX SCORE'));
      expect(screen.getByText('TIGERS BATTING')).toBeInTheDocument();
    });

    test('expanded box score shows away batting', () => {
      render(<PostGameSummary />);
      fireEvent.click(screen.getByText('BOX SCORE'));
      expect(screen.getByText('TIGERS BATTING')).toBeInTheDocument();
    });

    test('expanded box score shows home batting', () => {
      render(<PostGameSummary />);
      fireEvent.click(screen.getByText('BOX SCORE'));
      expect(screen.getByText('SOX BATTING')).toBeInTheDocument();
    });

    test('expanded box score shows away pitching', () => {
      render(<PostGameSummary />);
      fireEvent.click(screen.getByText('BOX SCORE'));
      expect(screen.getByText('TIGERS PITCHING')).toBeInTheDocument();
    });

    test('expanded box score shows home pitching', () => {
      render(<PostGameSummary />);
      fireEvent.click(screen.getByText('BOX SCORE'));
      expect(screen.getByText('SOX PITCHING')).toBeInTheDocument();
    });

    test('expanded box score shows player names', () => {
      render(<PostGameSummary />);
      fireEvent.click(screen.getByText('BOX SCORE'));
      // Away batters - may appear multiple times (POG section + box score)
      expect(screen.getAllByText(/R\. JOHNSON/).length).toBeGreaterThan(0);
      expect(screen.getAllByText(/M\. DAVIS/).length).toBeGreaterThan(0);
    });

    test('clicking BOX SCORE again collapses it', () => {
      render(<PostGameSummary />);
      fireEvent.click(screen.getByText('BOX SCORE'));
      expect(screen.getByText('TIGERS BATTING')).toBeInTheDocument();

      fireEvent.click(screen.getByText('BOX SCORE'));
      expect(screen.queryByText('TIGERS BATTING')).not.toBeInTheDocument();
    });
  });

  describe('Box Score Headers', () => {
    test('shows batting stat headers when expanded', () => {
      render(<PostGameSummary />);
      fireEvent.click(screen.getByText('BOX SCORE'));

      expect(screen.getAllByText('AB').length).toBeGreaterThan(0);
      expect(screen.getAllByText('RBI').length).toBeGreaterThan(0);
      expect(screen.getAllByText('BB').length).toBeGreaterThan(0);
      expect(screen.getAllByText('SO').length).toBeGreaterThan(0);
      expect(screen.getAllByText('AVG').length).toBeGreaterThan(0);
    });

    test('shows pitching stat headers when expanded', () => {
      render(<PostGameSummary />);
      fireEvent.click(screen.getByText('BOX SCORE'));

      expect(screen.getAllByText('IP').length).toBeGreaterThan(0);
      expect(screen.getAllByText('ER').length).toBeGreaterThan(0);
    });
  });

  describe('Concessions Section', () => {
    test('renders CONCESSIONS section', () => {
      render(<PostGameSummary />);
      expect(screen.getByText('CONCESSIONS')).toBeInTheDocument();
    });

    test('renders hot dog price', () => {
      render(<PostGameSummary />);
      expect(screen.getByText('HOT DOG • 10¢')).toBeInTheDocument();
    });

    test('renders peanuts price', () => {
      render(<PostGameSummary />);
      expect(screen.getByText('PEANUTS • 5¢')).toBeInTheDocument();
    });

    test('renders Kruse Cola ad', () => {
      render(<PostGameSummary />);
      expect(screen.getByText('KRUSE COLA')).toBeInTheDocument();
    });
  });

  describe('Team Records', () => {
    test('renders team records', () => {
      render(<PostGameSummary />);
      expect(screen.getByText('47-38')).toBeInTheDocument();
      expect(screen.getByText('52-33')).toBeInTheDocument();
    });

    test('renders REC header', () => {
      render(<PostGameSummary />);
      expect(screen.getByText('REC')).toBeInTheDocument();
    });
  });
});
