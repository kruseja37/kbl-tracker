/**
 * WARDisplay Component Tests
 *
 * Tests the WAR display components including badges, cards, and leaderboards.
 * Per IMPLEMENTATION_PLAN.md v2 - Day 2: WAR Pipeline
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  WARBadge,
  PlayerWARCard,
  WARLeaderboard,
  WARPanel,
} from '../../../components/GameTracker/WARDisplay';
import * as useWARCalculations from '../../../hooks/useWARCalculations';
import * as useClutchCalculations from '../../../hooks/useClutchCalculations';

// ============================================
// MOCKS
// ============================================

vi.mock('../../../hooks/useWARCalculations', () => ({
  useWARCalculations: vi.fn(),
  formatWAR: (war: number) => war.toFixed(1),
  getWARColor: (war: number) => war > 0 ? '#10b981' : war < 0 ? '#ef4444' : '#6b7280',
  getWARTier: (war: number, _games: number) => {
    if (war > 4) return 'MVP';
    if (war > 2) return 'All-Star';
    if (war > 1) return 'Starter';
    if (war > 0) return 'Role Player';
    return 'Replacement';
  },
}));

vi.mock('../../../hooks/useClutchCalculations', () => ({
  useClutchCalculations: vi.fn(),
}));

const mockUseWARCalculations = vi.mocked(useWARCalculations.useWARCalculations);
const mockUseClutchCalculations = vi.mocked(useClutchCalculations.useClutchCalculations);

// ============================================
// WAR BADGE TESTS
// ============================================

describe('WARBadge Component', () => {
  test('renders WAR value', () => {
    render(<WARBadge war={2.5} />);
    expect(screen.getByText('2.5')).toBeInTheDocument();
  });

  test('renders default label', () => {
    render(<WARBadge war={2.5} />);
    expect(screen.getByText('WAR')).toBeInTheDocument();
  });

  test('renders custom label', () => {
    render(<WARBadge war={2.5} label="bWAR" />);
    expect(screen.getByText('bWAR')).toBeInTheDocument();
  });

  test('shows tier when showTier is true', () => {
    render(<WARBadge war={2.5} showTier={true} />);
    expect(screen.getByText(/All-Star/)).toBeInTheDocument();
  });

  test('does not show tier by default', () => {
    render(<WARBadge war={2.5} />);
    expect(screen.queryByText(/All-Star/)).not.toBeInTheDocument();
  });

  test('handles negative WAR', () => {
    render(<WARBadge war={-0.5} />);
    expect(screen.getByText('-0.5')).toBeInTheDocument();
  });

  test('handles zero WAR', () => {
    render(<WARBadge war={0} />);
    expect(screen.getByText('0.0')).toBeInTheDocument();
  });

  test('handles high MVP-level WAR', () => {
    render(<WARBadge war={5.0} showTier={true} />);
    expect(screen.getByText(/MVP/)).toBeInTheDocument();
  });
});

// ============================================
// PLAYER WAR CARD TESTS
// ============================================

describe('PlayerWARCard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('shows loading state', () => {
    mockUseWARCalculations.mockReturnValue({
      leaderboards: {
        battingWAR: [],
        pitchingWAR: [],
        fieldingWAR: [],
        baserunningWAR: [],
        totalWAR: [],
      },
      seasonGames: 48,
      isLoading: true,
      error: null,
      refresh: vi.fn(),
      getPlayerBWAR: vi.fn().mockReturnValue(null),
      getPlayerPWAR: vi.fn().mockReturnValue(null),
    } as any);

    render(<PlayerWARCard playerId="p1" playerName="Test Player" />);
    expect(screen.getByText(/Loading WAR/)).toBeInTheDocument();
  });

  test('shows no data message when no WAR data', () => {
    mockUseWARCalculations.mockReturnValue({
      leaderboards: {
        battingWAR: [],
        pitchingWAR: [],
        fieldingWAR: [],
        baserunningWAR: [],
        totalWAR: [],
      },
      seasonGames: 48,
      isLoading: false,
      error: null,
      refresh: vi.fn(),
      getPlayerBWAR: vi.fn().mockReturnValue(null),
      getPlayerPWAR: vi.fn().mockReturnValue(null),
    } as any);

    render(<PlayerWARCard playerId="p1" playerName="Test Player" />);
    expect(screen.getByText(/No WAR data/)).toBeInTheDocument();
  });

  test('shows player name', () => {
    mockUseWARCalculations.mockReturnValue({
      leaderboards: {
        battingWAR: [],
        pitchingWAR: [],
        fieldingWAR: [],
        baserunningWAR: [],
        totalWAR: [],
      },
      seasonGames: 48,
      isLoading: false,
      error: null,
      refresh: vi.fn(),
      getPlayerBWAR: vi.fn().mockReturnValue({
        playerId: 'p1',
        playerName: 'Test Hitter',
        teamId: 'team1',
        bWAR: 2.5,
        wOBA: 0.380,
        wRAA: 15.5,
        pa: 200,
      }),
      getPlayerPWAR: vi.fn().mockReturnValue(null),
    } as any);

    render(<PlayerWARCard playerId="p1" playerName="Test Hitter" />);
    expect(screen.getByText('Test Hitter')).toBeInTheDocument();
  });

  test('shows bWAR badge for batters', () => {
    mockUseWARCalculations.mockReturnValue({
      leaderboards: {
        battingWAR: [],
        pitchingWAR: [],
        fieldingWAR: [],
        baserunningWAR: [],
        totalWAR: [],
      },
      seasonGames: 48,
      isLoading: false,
      error: null,
      refresh: vi.fn(),
      getPlayerBWAR: vi.fn().mockReturnValue({
        playerId: 'p1',
        playerName: 'Test Hitter',
        teamId: 'team1',
        bWAR: 2.5,
        wOBA: 0.380,
        wRAA: 15.5,
        pa: 200,
      }),
      getPlayerPWAR: vi.fn().mockReturnValue(null),
    } as any);

    render(<PlayerWARCard playerId="p1" playerName="Test Hitter" />);
    expect(screen.getByText('bWAR')).toBeInTheDocument();
  });

  test('shows pWAR badge for pitchers', () => {
    mockUseWARCalculations.mockReturnValue({
      leaderboards: {
        battingWAR: [],
        pitchingWAR: [],
        fieldingWAR: [],
        baserunningWAR: [],
        totalWAR: [],
      },
      seasonGames: 48,
      isLoading: false,
      error: null,
      refresh: vi.fn(),
      getPlayerBWAR: vi.fn().mockReturnValue(null),
      getPlayerPWAR: vi.fn().mockReturnValue({
        playerId: 'p1',
        playerName: 'Test Pitcher',
        teamId: 'team1',
        pWAR: 3.0,
        fip: 3.25,
        ip: 100.0,
        role: 'SP',
      }),
    } as any);

    render(<PlayerWARCard playerId="p1" playerName="Test Pitcher" />);
    expect(screen.getByText('pWAR')).toBeInTheDocument();
  });

  test('shows breakdown when requested', () => {
    mockUseWARCalculations.mockReturnValue({
      leaderboards: {
        battingWAR: [],
        pitchingWAR: [],
        fieldingWAR: [],
        baserunningWAR: [],
        totalWAR: [],
      },
      seasonGames: 48,
      isLoading: false,
      error: null,
      refresh: vi.fn(),
      getPlayerBWAR: vi.fn().mockReturnValue({
        playerId: 'p1',
        playerName: 'Test Hitter',
        teamId: 'team1',
        bWAR: 2.5,
        wOBA: 0.380,
        wRAA: 15.5,
        pa: 200,
      }),
      getPlayerPWAR: vi.fn().mockReturnValue(null),
    } as any);

    render(<PlayerWARCard playerId="p1" playerName="Test Hitter" showBreakdown={true} />);
    expect(screen.getByText(/wOBA: 0.380/)).toBeInTheDocument();
    expect(screen.getByText(/wRAA: 15.5/)).toBeInTheDocument();
    expect(screen.getByText(/PA: 200/)).toBeInTheDocument();
  });
});

// ============================================
// WAR LEADERBOARD TESTS
// ============================================

describe('WARLeaderboard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('shows loading state', () => {
    mockUseWARCalculations.mockReturnValue({
      leaderboards: {
        battingWAR: [],
        pitchingWAR: [],
        fieldingWAR: [],
        baserunningWAR: [],
        totalWAR: [],
      },
      seasonGames: 48,
      isLoading: true,
      error: null,
      refresh: vi.fn(),
      getPlayerBWAR: vi.fn(),
      getPlayerPWAR: vi.fn(),
    } as any);

    render(<WARLeaderboard type="batting" />);
    expect(screen.getByText(/Loading leaderboard/)).toBeInTheDocument();
  });

  test('shows error state with retry button', () => {
    const mockRefresh = vi.fn();
    mockUseWARCalculations.mockReturnValue({
      leaderboards: {
        battingWAR: [],
        pitchingWAR: [],
        fieldingWAR: [],
        baserunningWAR: [],
        totalWAR: [],
      },
      seasonGames: 48,
      isLoading: false,
      error: 'Failed to load',
      refresh: mockRefresh,
      getPlayerBWAR: vi.fn(),
      getPlayerPWAR: vi.fn(),
    } as any);

    render(<WARLeaderboard type="batting" />);
    expect(screen.getByText(/Error: Failed to load/)).toBeInTheDocument();
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  test('calls refresh when Retry clicked', () => {
    const mockRefresh = vi.fn();
    mockUseWARCalculations.mockReturnValue({
      leaderboards: {
        battingWAR: [],
        pitchingWAR: [],
        fieldingWAR: [],
        baserunningWAR: [],
        totalWAR: [],
      },
      seasonGames: 48,
      isLoading: false,
      error: 'Failed to load',
      refresh: mockRefresh,
      getPlayerBWAR: vi.fn(),
      getPlayerPWAR: vi.fn(),
    } as any);

    render(<WARLeaderboard type="batting" />);
    fireEvent.click(screen.getByText('Retry'));
    expect(mockRefresh).toHaveBeenCalled();
  });

  test('shows no data message when empty', () => {
    mockUseWARCalculations.mockReturnValue({
      leaderboards: {
        battingWAR: [],
        pitchingWAR: [],
        fieldingWAR: [],
        baserunningWAR: [],
        totalWAR: [],
      },
      seasonGames: 48,
      isLoading: false,
      error: null,
      refresh: vi.fn(),
      getPlayerBWAR: vi.fn(),
      getPlayerPWAR: vi.fn(),
    } as any);

    render(<WARLeaderboard type="batting" />);
    expect(screen.getByText(/No batting data yet/)).toBeInTheDocument();
  });

  test('shows default batting title', () => {
    mockUseWARCalculations.mockReturnValue({
      leaderboards: {
        battingWAR: [
          { playerId: 'p1', playerName: 'Player 1', teamId: 'team1', bWAR: 3.0, wOBA: 0.400, wRAA: 20, pa: 250 },
        ],
        pitchingWAR: [],
        fieldingWAR: [],
        baserunningWAR: [],
        totalWAR: [],
      },
      seasonGames: 48,
      isLoading: false,
      error: null,
      refresh: vi.fn(),
      getPlayerBWAR: vi.fn(),
      getPlayerPWAR: vi.fn(),
    } as any);

    render(<WARLeaderboard type="batting" />);
    expect(screen.getByText('Batting WAR Leaders')).toBeInTheDocument();
  });

  test('shows default pitching title', () => {
    mockUseWARCalculations.mockReturnValue({
      leaderboards: {
        battingWAR: [],
        pitchingWAR: [
          { playerId: 'p1', playerName: 'Pitcher 1', teamId: 'team1', pWAR: 4.0, fip: 2.50, ip: 150, role: 'SP' },
        ],
        fieldingWAR: [],
        baserunningWAR: [],
        totalWAR: [],
      },
      seasonGames: 48,
      isLoading: false,
      error: null,
      refresh: vi.fn(),
      getPlayerBWAR: vi.fn(),
      getPlayerPWAR: vi.fn(),
    } as any);

    render(<WARLeaderboard type="pitching" />);
    expect(screen.getByText('Pitching WAR Leaders')).toBeInTheDocument();
  });

  test('shows custom title', () => {
    mockUseWARCalculations.mockReturnValue({
      leaderboards: {
        battingWAR: [
          { playerId: 'p1', playerName: 'Player 1', teamId: 'team1', bWAR: 3.0, wOBA: 0.400, wRAA: 20, pa: 250 },
        ],
        pitchingWAR: [],
        fieldingWAR: [],
        baserunningWAR: [],
        totalWAR: [],
      },
      seasonGames: 48,
      isLoading: false,
      error: null,
      refresh: vi.fn(),
      getPlayerBWAR: vi.fn(),
      getPlayerPWAR: vi.fn(),
    } as any);

    render(<WARLeaderboard type="batting" title="Custom Title" />);
    expect(screen.getByText('Custom Title')).toBeInTheDocument();
  });

  test('renders batting leaderboard rows', () => {
    mockUseWARCalculations.mockReturnValue({
      leaderboards: {
        battingWAR: [
          { playerId: 'p1', playerName: 'Top Hitter', teamId: 'team1', bWAR: 3.5, wOBA: 0.420, wRAA: 25, pa: 300 },
          { playerId: 'p2', playerName: 'Second Hitter', teamId: 'team2', bWAR: 2.5, wOBA: 0.380, wRAA: 15, pa: 250 },
        ],
        pitchingWAR: [],
        fieldingWAR: [],
        baserunningWAR: [],
        totalWAR: [],
      },
      seasonGames: 48,
      isLoading: false,
      error: null,
      refresh: vi.fn(),
      getPlayerBWAR: vi.fn(),
      getPlayerPWAR: vi.fn(),
    } as any);

    render(<WARLeaderboard type="batting" />);
    expect(screen.getByText('Top Hitter')).toBeInTheDocument();
    expect(screen.getByText('Second Hitter')).toBeInTheDocument();
  });

  test('respects limit prop', () => {
    mockUseWARCalculations.mockReturnValue({
      leaderboards: {
        battingWAR: [
          { playerId: 'p1', playerName: 'Player 1', teamId: 't1', bWAR: 3.0, wOBA: 0.400, wRAA: 20, pa: 250 },
          { playerId: 'p2', playerName: 'Player 2', teamId: 't2', bWAR: 2.5, wOBA: 0.380, wRAA: 15, pa: 250 },
          { playerId: 'p3', playerName: 'Player 3', teamId: 't3', bWAR: 2.0, wOBA: 0.360, wRAA: 10, pa: 250 },
        ],
        pitchingWAR: [],
        fieldingWAR: [],
        baserunningWAR: [],
        totalWAR: [],
      },
      seasonGames: 48,
      isLoading: false,
      error: null,
      refresh: vi.fn(),
      getPlayerBWAR: vi.fn(),
      getPlayerPWAR: vi.fn(),
    } as any);

    render(<WARLeaderboard type="batting" limit={2} />);
    expect(screen.getByText('Player 1')).toBeInTheDocument();
    expect(screen.getByText('Player 2')).toBeInTheDocument();
    expect(screen.queryByText('Player 3')).not.toBeInTheDocument();
  });

  test('shows PA and wOBA columns for batting', () => {
    mockUseWARCalculations.mockReturnValue({
      leaderboards: {
        battingWAR: [
          { playerId: 'p1', playerName: 'Hitter', teamId: 't1', bWAR: 3.0, wOBA: 0.400, wRAA: 20, pa: 250 },
        ],
        pitchingWAR: [],
        fieldingWAR: [],
        baserunningWAR: [],
        totalWAR: [],
      },
      seasonGames: 48,
      isLoading: false,
      error: null,
      refresh: vi.fn(),
      getPlayerBWAR: vi.fn(),
      getPlayerPWAR: vi.fn(),
    } as any);

    render(<WARLeaderboard type="batting" />);
    expect(screen.getByText('PA')).toBeInTheDocument();
    expect(screen.getByText('wOBA')).toBeInTheDocument();
  });

  test('shows IP and FIP columns for pitching', () => {
    mockUseWARCalculations.mockReturnValue({
      leaderboards: {
        battingWAR: [],
        pitchingWAR: [
          { playerId: 'p1', playerName: 'Pitcher', teamId: 't1', pWAR: 3.0, fip: 3.00, ip: 150, role: 'SP' },
        ],
        fieldingWAR: [],
        baserunningWAR: [],
        totalWAR: [],
      },
      seasonGames: 48,
      isLoading: false,
      error: null,
      refresh: vi.fn(),
      getPlayerBWAR: vi.fn(),
      getPlayerPWAR: vi.fn(),
    } as any);

    render(<WARLeaderboard type="pitching" />);
    expect(screen.getByText('IP')).toBeInTheDocument();
    expect(screen.getByText('FIP')).toBeInTheDocument();
  });
});

// ============================================
// WAR PANEL TESTS
// ============================================

describe('WARPanel Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseWARCalculations.mockReturnValue({
      leaderboards: {
        battingWAR: [
          { playerId: 'p1', playerName: 'Hitter', teamId: 't1', bWAR: 3.0, wOBA: 0.400, wRAA: 20, pa: 250 },
        ],
        pitchingWAR: [
          { playerId: 'p2', playerName: 'Pitcher', teamId: 't1', pWAR: 2.5, fip: 3.25, ip: 100, role: 'SP' },
        ],
        fieldingWAR: [],
        baserunningWAR: [],
        totalWAR: [
          { playerId: 'p1', playerName: 'Hitter', teamId: 't1', totalWAR: 4.0, bWAR: 3.0, pWAR: 0, fWAR: 0.5, rWAR: 0.5 },
        ],
      },
      seasonGames: 48,
      isLoading: false,
      error: null,
      refresh: vi.fn(),
      getPlayerBWAR: vi.fn(),
      getPlayerPWAR: vi.fn(),
    } as any);

    mockUseClutchCalculations.mockReturnValue({
      clutchLeaderboard: [],
      isLoading: false,
    } as any);
  });

  test('renders all tabs', () => {
    render(<WARPanel />);
    // Use getAllByText since some text may appear multiple times
    expect(screen.getAllByText(/Total/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Batting/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Pitching/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Fielding/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Baserunning/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Clutch/).length).toBeGreaterThan(0);
  });

  test('defaults to total tab', () => {
    render(<WARPanel />);
    expect(screen.getByText('Total WAR Leaders')).toBeInTheDocument();
  });

  test('respects defaultTab prop', () => {
    render(<WARPanel defaultTab="batting" />);
    expect(screen.getByText('Batting WAR Leaders')).toBeInTheDocument();
  });

  test('switches tabs when clicked', () => {
    render(<WARPanel />);

    // Click on Pitching tab
    fireEvent.click(screen.getByText(/Pitching/));
    expect(screen.getByText('Pitching WAR Leaders')).toBeInTheDocument();
  });

  test('shows player count in tabs', () => {
    render(<WARPanel />);
    // Should show count for each tab - (1) appears multiple times
    const countElements = screen.getAllByText(/\(1\)/);
    expect(countElements.length).toBeGreaterThan(0);
  });
});
