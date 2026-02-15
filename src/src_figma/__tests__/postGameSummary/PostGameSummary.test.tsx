/**
 * PostGameSummary Component Tests
 *
 * Tests the post-game summary display with scoreboard, POG, and box score.
 * Updated 2026-02-07: Aligned with data-driven component (async load via getCompletedGameById).
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { PostGameSummary } from '../../app/pages/PostGameSummary';

// ============================================
// MOCKS
// ============================================

const mockNavigate = vi.fn();

vi.mock('react-router', () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => ({
    state: {
      gameMode: 'franchise',
      franchiseId: '1',
    },
  }),
  useParams: () => ({ gameId: 'test-game-123' }),
}));

vi.mock('@/config/teamColors', () => ({
  getTeamColors: (teamId: string) => ({
    primary: teamId === 'sox' ? '#FF0000' : '#FF6600',
    secondary: '#FFFFFF',
    stadium: teamId === 'sox' ? 'Sox Field' : 'Tiger Stadium',
  }),
}));

// Build a complete CompletedGameRecord for mocking
const mockGameData = {
  gameId: 'test-game-123',
  date: Date.now(),
  awayTeamId: 'tigers',
  homeTeamId: 'sox',
  awayTeamName: 'Tigers',
  homeTeamName: 'Sox',
  finalScore: { away: 3, home: 4 },
  innings: 9,
  fameEvents: [],
  playerStats: {
    // Away batters (prefix: away-)
    'away-r-johnson': {
      pa: 4, ab: 4, h: 2, singles: 1, doubles: 1, triples: 0, hr: 0,
      rbi: 1, r: 1, bb: 0, hbp: 0, k: 1, sb: 0, cs: 0,
      putouts: 0, assists: 0, fieldingErrors: 0,
    },
    'away-m-davis': {
      pa: 4, ab: 4, h: 1, singles: 1, doubles: 0, triples: 0, hr: 0,
      rbi: 1, r: 0, bb: 0, hbp: 0, k: 2, sb: 0, cs: 0,
      putouts: 0, assists: 0, fieldingErrors: 0,
    },
    'away-k-smith': {
      pa: 4, ab: 3, h: 1, singles: 0, doubles: 0, triples: 0, hr: 1,
      rbi: 1, r: 1, bb: 1, hbp: 0, k: 0, sb: 0, cs: 0,
      putouts: 0, assists: 0, fieldingErrors: 0,
    },
    // Home batters (prefix: home-)
    'home-j-martinez': {
      pa: 5, ab: 4, h: 3, singles: 1, doubles: 0, triples: 0, hr: 2,
      rbi: 4, r: 2, bb: 1, hbp: 0, k: 0, sb: 0, cs: 0,
      putouts: 0, assists: 0, fieldingErrors: 0,
    },
    'home-t-williams': {
      pa: 4, ab: 4, h: 2, singles: 2, doubles: 0, triples: 0, hr: 0,
      rbi: 0, r: 1, bb: 0, hbp: 0, k: 1, sb: 1, cs: 0,
      putouts: 0, assists: 0, fieldingErrors: 0,
    },
    'home-b-anderson': {
      pa: 3, ab: 3, h: 1, singles: 1, doubles: 0, triples: 0, hr: 0,
      rbi: 0, r: 1, bb: 0, hbp: 0, k: 0, sb: 0, cs: 0,
      putouts: 0, assists: 0, fieldingErrors: 0,
    },
  },
  pitcherGameStats: [
    {
      pitcherId: 'away-p-garcia',
      pitcherName: 'P. Garcia',
      teamId: 'tigers',
      isStarter: true,
      entryInning: 1,
      outsRecorded: 18,
      hitsAllowed: 5,
      runsAllowed: 3,
      earnedRuns: 3,
      walksAllowed: 1,
      strikeoutsThrown: 5,
      homeRunsAllowed: 2,
      hitBatters: 0,
      basesReachedViaError: 0,
      wildPitches: 0,
      pitchCount: 85,
      battersFaced: 22,
      consecutiveHRsAllowed: 0,
      firstInningRuns: 0,
      basesLoadedWalks: 0,
      inningsComplete: 6,
    },
    {
      pitcherId: 'away-c-lee',
      pitcherName: 'C. Lee',
      teamId: 'tigers',
      isStarter: false,
      entryInning: 7,
      outsRecorded: 6,
      hitsAllowed: 1,
      runsAllowed: 1,
      earnedRuns: 1,
      walksAllowed: 0,
      strikeoutsThrown: 2,
      homeRunsAllowed: 0,
      hitBatters: 0,
      basesReachedViaError: 0,
      wildPitches: 0,
      pitchCount: 30,
      battersFaced: 8,
      consecutiveHRsAllowed: 0,
      firstInningRuns: 0,
      basesLoadedWalks: 0,
      inningsComplete: 2,
    },
    {
      pitcherId: 'home-a-rodriguez',
      pitcherName: 'A. Rodriguez',
      teamId: 'sox',
      isStarter: true,
      entryInning: 1,
      outsRecorded: 27,
      hitsAllowed: 4,
      runsAllowed: 3,
      earnedRuns: 3,
      walksAllowed: 1,
      strikeoutsThrown: 8,
      homeRunsAllowed: 1,
      hitBatters: 0,
      basesReachedViaError: 0,
      wildPitches: 0,
      pitchCount: 105,
      battersFaced: 30,
      consecutiveHRsAllowed: 0,
      firstInningRuns: 0,
      basesLoadedWalks: 0,
      inningsComplete: 9,
    },
  ],
  inningScores: [
    { away: 0, home: 1 },
    { away: 1, home: 0 },
    { away: 0, home: 0 },
    { away: 0, home: 2 },
    { away: 0, home: 0 },
    { away: 2, home: 0 },
    { away: 0, home: 0 },
    { away: 0, home: 1 },
    { away: 0, home: 0 },
  ],
};

vi.mock('../../utils/gameStorage', () => ({
  getCompletedGameById: vi.fn(() => Promise.resolve(mockGameData)),
}));

// ============================================
// TESTS
// ============================================

describe('PostGameSummary Component', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    // Re-mock to ensure fresh data each test
    const { getCompletedGameById } = await import('../../utils/gameStorage');
    vi.mocked(getCompletedGameById).mockResolvedValue(mockGameData);
  });

  describe('Header', () => {
    test('renders POST-GAME REPORT header', async () => {
      render(<PostGameSummary />);
      expect(await screen.findByText('POST-GAME REPORT')).toBeInTheDocument();
    });

    test('renders FINAL badge', async () => {
      render(<PostGameSummary />);
      expect(await screen.findByText('FINAL')).toBeInTheDocument();
    });

    test('renders Super Mega Baseball branding', async () => {
      render(<PostGameSummary />);
      expect(await screen.findByText('SUPER MEGA')).toBeInTheDocument();
      expect(screen.getByText('BASEBALL')).toBeInTheDocument();
    });
  });

  describe('Scoreboard', () => {
    test('renders team names', async () => {
      render(<PostGameSummary />);
      expect(await screen.findByText('TIGERS')).toBeInTheDocument();
      expect(screen.getByText('SOX')).toBeInTheDocument();
    });

    test('renders final score for away team', async () => {
      render(<PostGameSummary />);
      await screen.findByText('TIGERS');
      // Away team score: 3 runs
      const threeElements = screen.getAllByText('3');
      expect(threeElements.length).toBeGreaterThan(0);
    });

    test('renders final score for home team', async () => {
      render(<PostGameSummary />);
      await screen.findByText('SOX');
      // Home team score: 4 runs
      const fourElements = screen.getAllByText('4');
      expect(fourElements.length).toBeGreaterThan(0);
    });

    test('renders inning-by-inning scores', async () => {
      render(<PostGameSummary />);
      await screen.findByText('TIGERS');
      // Inning headers 1-9
      expect(screen.getAllByText('1').length).toBeGreaterThan(0);
      expect(screen.getAllByText('2').length).toBeGreaterThan(0);
      expect(screen.getAllByText('9').length).toBeGreaterThan(0);
    });

    test('renders R H E headers', async () => {
      render(<PostGameSummary />);
      await screen.findByText('TIGERS');
      expect(screen.getByText('R')).toBeInTheDocument();
      expect(screen.getByText('H')).toBeInTheDocument();
      expect(screen.getByText('E')).toBeInTheDocument();
    });

    test('renders SOX WIN message', async () => {
      render(<PostGameSummary />);
      expect(await screen.findByText(/SOX WIN/)).toBeInTheDocument();
    });
  });

  describe('Players of the Game', () => {
    test('renders POG 3 stars', async () => {
      render(<PostGameSummary />);
      expect(await screen.findByText('POG ★★★')).toBeInTheDocument();
    });

    test('renders POG 2 stars', async () => {
      render(<PostGameSummary />);
      expect(await screen.findByText('POG ★★')).toBeInTheDocument();
    });

    test('renders POG 1 star', async () => {
      render(<PostGameSummary />);
      expect(await screen.findByText('POG ★')).toBeInTheDocument();
    });

    test('renders 3-star POG player name', async () => {
      render(<PostGameSummary />);
      // J. Martinez: 3h, 4rbi, 2r → score = 3*2 + 4 + 2 = 12 (highest)
      expect(await screen.findByText('J Martinez')).toBeInTheDocument();
    });

    test('renders 2-star POG player name', async () => {
      render(<PostGameSummary />);
      // R. Johnson: 2h, 1rbi, 1r → score = 2*2 + 1 + 1 = 6
      await screen.findByText('J Martinez');
      expect(screen.getByText('R Johnson')).toBeInTheDocument();
    });

    test('renders 1-star POG player name', async () => {
      render(<PostGameSummary />);
      // T. Williams: 2h, 0rbi, 1r → score = 2*2 + 0 + 1 = 5
      await screen.findByText('J Martinez');
      expect(screen.getByText('T Williams')).toBeInTheDocument();
    });

    test('renders POG stats for top performer', async () => {
      render(<PostGameSummary />);
      // Component format: {h}-{ab} • {rbi} RBI • {r} R
      // J Martinez: 3-4 • 4 RBI • 2 R
      expect(await screen.findByText('3-4 • 4 RBI • 2 R')).toBeInTheDocument();
    });
  });

  describe('Box Score', () => {
    test('renders BOX SCORE button', async () => {
      render(<PostGameSummary />);
      expect(await screen.findByText('BOX SCORE')).toBeInTheDocument();
    });

    test('box score is collapsed by default', async () => {
      render(<PostGameSummary />);
      await screen.findByText('BOX SCORE');
      // Pitching sections should NOT be visible when collapsed
      expect(screen.queryByText('TIGERS PITCHING')).not.toBeInTheDocument();
    });

    test('clicking BOX SCORE expands it', async () => {
      render(<PostGameSummary />);
      await screen.findByText('BOX SCORE');
      fireEvent.click(screen.getByText('BOX SCORE'));
      expect(screen.getByText('TIGERS PITCHING')).toBeInTheDocument();
    });

    test('expanded box score shows away pitching', async () => {
      render(<PostGameSummary />);
      await screen.findByText('BOX SCORE');
      fireEvent.click(screen.getByText('BOX SCORE'));
      expect(screen.getByText('TIGERS PITCHING')).toBeInTheDocument();
    });

    test('expanded box score shows home pitching', async () => {
      render(<PostGameSummary />);
      await screen.findByText('BOX SCORE');
      fireEvent.click(screen.getByText('BOX SCORE'));
      expect(screen.getByText('SOX PITCHING')).toBeInTheDocument();
    });

    test('expanded box score shows pitcher names', async () => {
      render(<PostGameSummary />);
      await screen.findByText('BOX SCORE');
      fireEvent.click(screen.getByText('BOX SCORE'));
      expect(screen.getByText('P. Garcia')).toBeInTheDocument();
      expect(screen.getByText('C. Lee')).toBeInTheDocument();
      expect(screen.getByText('A. Rodriguez')).toBeInTheDocument();
    });

    test('clicking BOX SCORE again collapses it', async () => {
      render(<PostGameSummary />);
      await screen.findByText('BOX SCORE');
      fireEvent.click(screen.getByText('BOX SCORE'));
      expect(screen.getByText('TIGERS PITCHING')).toBeInTheDocument();

      fireEvent.click(screen.getByText('BOX SCORE'));
      expect(screen.queryByText('TIGERS PITCHING')).not.toBeInTheDocument();
    });
  });

  describe('Box Score Headers', () => {
    test('shows pitching stat headers when expanded', async () => {
      render(<PostGameSummary />);
      await screen.findByText('BOX SCORE');
      fireEvent.click(screen.getByText('BOX SCORE'));

      expect(screen.getAllByText('IP').length).toBeGreaterThan(0);
      expect(screen.getAllByText('ER').length).toBeGreaterThan(0);
      expect(screen.getAllByText('SO').length).toBeGreaterThan(0);
      expect(screen.getAllByText('BB').length).toBeGreaterThan(0);
    });
  });

  describe('Navigation', () => {
    test('CONTINUE button navigates to franchise home', async () => {
      render(<PostGameSummary />);
      const continueBtn = await screen.findByText('CONTINUE');
      fireEvent.click(continueBtn);
      expect(mockNavigate).toHaveBeenCalledWith(
        '/franchise/1',
        expect.objectContaining({
          state: expect.objectContaining({
            refreshAfterGame: true,
            refreshToken: expect.any(Number),
          }),
        })
      );
    });
  });

  describe('Loading State', () => {
    test('shows loading indicator while data loads', async () => {
      // Make the mock return a never-resolving promise to keep loading state
      const { getCompletedGameById } = await import('../../utils/gameStorage');
      vi.mocked(getCompletedGameById).mockReturnValue(new Promise(() => {}));

      render(<PostGameSummary />);
      expect(screen.getByText('Loading game summary...')).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    test('shows error when game not found', async () => {
      const { getCompletedGameById } = await import('../../utils/gameStorage');
      vi.mocked(getCompletedGameById).mockResolvedValue(null);

      render(<PostGameSummary />);
      expect(await screen.findByText('Game not found')).toBeInTheDocument();
    });

    test('shows error when load fails', async () => {
      const { getCompletedGameById } = await import('../../utils/gameStorage');
      vi.mocked(getCompletedGameById).mockRejectedValue(new Error('DB error'));

      render(<PostGameSummary />);
      expect(await screen.findByText('Failed to load game data')).toBeInTheDocument();
    });
  });

  describe('Stadium Name', () => {
    test('renders stadium name from team colors', async () => {
      render(<PostGameSummary />);
      // Home team is 'sox' → getTeamColors returns stadium: 'Sox Field'
      expect(await screen.findByText('Sox Field')).toBeInTheDocument();
    });
  });
});
