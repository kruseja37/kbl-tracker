/**
 * CareerDisplay Component Tests
 *
 * Tests career batting/pitching leaderboards and panel components.
 * Per Ralph Framework S-B017
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import {
  CareerBattingLeaderboard,
  CareerPitchingLeaderboard,
  CareerPanel,
} from '../../../components/GameTracker/CareerDisplay';
import type { CareerBattingLeader, CareerPitchingLeader } from '../../../hooks/useCareerStats';

// ============================================
// MOCKS
// ============================================

const mockBattingLeaders: CareerBattingLeader[] = [
  {
    playerId: 'p1',
    playerName: 'Mike Trout',
    teamId: 'team1',
    games: 150,
    pa: 600,
    ab: 500,
    hits: 180,
    singles: 100,
    doubles: 40,
    triples: 5,
    homeRuns: 35,
    rbi: 100,
    runs: 110,
    walks: 90,
    strikeouts: 120,
    hitByPitch: 10,
    sacFlies: 5,
    sacBunts: 0,
    stolenBases: 15,
    caughtStealing: 3,
    groundedIntoDP: 8,
    totalWAR: 8.5,
    bWAR: 6.0,
    fWAR: 1.5,
    rWAR: 1.0,
    avg: 0.360,
    obp: 0.450,
    slg: 0.680,
    ops: 1.130,
  },
  {
    playerId: 'p2',
    playerName: 'Aaron Judge',
    teamId: 'team2',
    games: 140,
    pa: 550,
    ab: 480,
    hits: 150,
    singles: 80,
    doubles: 25,
    triples: 2,
    homeRuns: 43,
    rbi: 95,
    runs: 105,
    walks: 65,
    strikeouts: 150,
    hitByPitch: 5,
    sacFlies: 3,
    sacBunts: 0,
    stolenBases: 5,
    caughtStealing: 2,
    groundedIntoDP: 10,
    totalWAR: 7.2,
    bWAR: 5.5,
    fWAR: 1.2,
    rWAR: 0.5,
    avg: 0.312,
    obp: 0.390,
    slg: 0.620,
    ops: 1.010,
  },
];

const mockPitchingLeaders: CareerPitchingLeader[] = [
  {
    playerId: 'pitcher1',
    playerName: 'Sandy Koufax',
    teamId: 'team1',
    games: 30,
    gamesStarted: 30,
    wins: 20,
    losses: 5,
    saves: 0,
    holds: 0,
    qualityStarts: 22,
    outsRecorded: 600,
    hitsAllowed: 150,
    runsAllowed: 55,
    earnedRuns: 50,
    walksAllowed: 45,
    strikeouts: 280,
    homeRunsAllowed: 15,
    battersHitByPitch: 5,
    wildPitches: 8,
    balks: 0,
    pWAR: 7.5,
    ip: 200,
    era: 2.25,
    whip: 0.975,
  },
  {
    playerId: 'pitcher2',
    playerName: 'Mariano Rivera',
    teamId: 'team2',
    games: 60,
    gamesStarted: 0,
    wins: 5,
    losses: 2,
    saves: 45,
    holds: 10,
    qualityStarts: 0,
    outsRecorded: 210,
    hitsAllowed: 55,
    runsAllowed: 20,
    earnedRuns: 18,
    walksAllowed: 15,
    strikeouts: 85,
    homeRunsAllowed: 5,
    battersHitByPitch: 2,
    wildPitches: 3,
    balks: 0,
    pWAR: 4.0,
    ip: 70,
    era: 2.31,
    whip: 1.00,
  },
];

const mockLeaderboards = {
  battingByWAR: mockBattingLeaders,
  battingByHR: [...mockBattingLeaders].sort((a, b) => b.homeRuns - a.homeRuns),
  battingByHits: [...mockBattingLeaders].sort((a, b) => b.hits - a.hits),
  battingByRBI: [...mockBattingLeaders].sort((a, b) => b.rbi - a.rbi),
  pitchingByWAR: mockPitchingLeaders,
  pitchingByWins: [...mockPitchingLeaders].sort((a, b) => b.wins - a.wins),
  pitchingByStrikeouts: [...mockPitchingLeaders].sort((a, b) => b.strikeouts - a.strikeouts),
  pitchingBySaves: [...mockPitchingLeaders].sort((a, b) => b.saves - a.saves),
};

// Default mock - can be overridden per test
let mockHookState = {
  isLoading: false,
  error: null as string | null,
  leaderboards: mockLeaderboards,
  refresh: vi.fn(),
  getPlayerCareer: vi.fn(),
};

vi.mock('../../../hooks/useCareerStats', () => ({
  useCareerStats: () => mockHookState,
  formatAvg: (avg: number) => avg.toFixed(3).replace(/^0/, ''),
  formatERA: (era: number) => era.toFixed(2),
  formatIP: (ip: number) => {
    const whole = Math.floor(ip);
    const partial = Math.round((ip - whole) * 3);
    return partial > 0 ? `${whole}.${partial}` : `${whole}.0`;
  },
  formatWAR: (war: number) => (war >= 0 ? `+${war.toFixed(1)}` : war.toFixed(1)),
  getCareerTierColor: (stat: string, value: number) => {
    if (value >= 400) return '#fbbf24';
    if (value >= 250) return '#8b5cf6';
    if (value >= 100) return '#3b82f6';
    if (value >= 50) return '#10b981';
    return '#6b7280';
  },
}));

// ============================================
// TESTS: CareerBattingLeaderboard
// ============================================

describe('CareerBattingLeaderboard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHookState = {
      isLoading: false,
      error: null,
      leaderboards: mockLeaderboards,
      refresh: vi.fn(),
      getPlayerCareer: vi.fn(),
    };
  });

  describe('Loading State', () => {
    test('shows loading message when loading', () => {
      mockHookState.isLoading = true;
      render(<CareerBattingLeaderboard />);
      expect(screen.getByText('Loading career stats...')).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    test('shows error message and retry button', () => {
      mockHookState.error = 'Failed to load data';
      render(<CareerBattingLeaderboard />);
      expect(screen.getByText(/Error: Failed to load data/)).toBeInTheDocument();
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });

    test('calls refresh when retry clicked', () => {
      mockHookState.error = 'Failed to load data';
      render(<CareerBattingLeaderboard />);
      fireEvent.click(screen.getByText('Retry'));
      expect(mockHookState.refresh).toHaveBeenCalled();
    });
  });

  describe('Empty State', () => {
    test('shows empty message when no data', () => {
      mockHookState.leaderboards = {
        ...mockLeaderboards,
        battingByWAR: [],
        battingByHR: [],
        battingByHits: [],
        battingByRBI: [],
      };
      render(<CareerBattingLeaderboard />);
      expect(screen.getByText('No career batting data yet. Play some games!')).toBeInTheDocument();
    });
  });

  describe('Data Display', () => {
    test('shows default WAR title', () => {
      render(<CareerBattingLeaderboard />);
      expect(screen.getByText('Career WAR Leaders')).toBeInTheDocument();
    });

    test('shows custom title when provided', () => {
      render(<CareerBattingLeaderboard title="All-Time Batting Leaders" />);
      expect(screen.getByText('All-Time Batting Leaders')).toBeInTheDocument();
    });

    test('shows HR title when sortBy=hr', () => {
      render(<CareerBattingLeaderboard sortBy="hr" />);
      expect(screen.getByText('Career HR Leaders')).toBeInTheDocument();
    });

    test('shows player names', () => {
      render(<CareerBattingLeaderboard />);
      expect(screen.getByText('Mike Trout')).toBeInTheDocument();
      expect(screen.getByText('Aaron Judge')).toBeInTheDocument();
    });

    test('shows team IDs', () => {
      render(<CareerBattingLeaderboard />);
      expect(screen.getByText('team1')).toBeInTheDocument();
      expect(screen.getByText('team2')).toBeInTheDocument();
    });

    test('shows games played', () => {
      render(<CareerBattingLeaderboard />);
      // Mike Trout has 150 games, which also matches his hits count
      // Aaron Judge has 140 games, 150 hits - so 150 appears twice
      expect(screen.getAllByText('150').length).toBeGreaterThan(0);
      expect(screen.getByText('140')).toBeInTheDocument();
    });

    test('shows home runs', () => {
      render(<CareerBattingLeaderboard />);
      expect(screen.getByText('35')).toBeInTheDocument();
      expect(screen.getByText('43')).toBeInTheDocument();
    });

    test('shows WAR values with + prefix', () => {
      render(<CareerBattingLeaderboard />);
      expect(screen.getByText('+8.5')).toBeInTheDocument();
      expect(screen.getByText('+7.2')).toBeInTheDocument();
    });

    test('shows formatted AVG', () => {
      render(<CareerBattingLeaderboard />);
      expect(screen.getByText('.360')).toBeInTheDocument();
      expect(screen.getByText('.312')).toBeInTheDocument();
    });

    test('shows table headers', () => {
      render(<CareerBattingLeaderboard />);
      expect(screen.getByText('#')).toBeInTheDocument();
      expect(screen.getByText('Player')).toBeInTheDocument();
      expect(screen.getByText('G')).toBeInTheDocument();
      expect(screen.getByText('HR')).toBeInTheDocument();
      expect(screen.getByText('H')).toBeInTheDocument();
      expect(screen.getByText('RBI')).toBeInTheDocument();
      expect(screen.getByText('AVG')).toBeInTheDocument();
      expect(screen.getByText('WAR')).toBeInTheDocument();
    });

    test('shows rank numbers', () => {
      render(<CareerBattingLeaderboard />);
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    test('respects limit prop', () => {
      render(<CareerBattingLeaderboard limit={1} />);
      expect(screen.getByText('Mike Trout')).toBeInTheDocument();
      expect(screen.queryByText('Aaron Judge')).not.toBeInTheDocument();
    });

    test('refresh button works', () => {
      render(<CareerBattingLeaderboard />);
      const refreshButton = screen.getByTitle('Refresh career stats');
      fireEvent.click(refreshButton);
      expect(mockHookState.refresh).toHaveBeenCalled();
    });
  });
});

// ============================================
// TESTS: CareerPitchingLeaderboard
// ============================================

describe('CareerPitchingLeaderboard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHookState = {
      isLoading: false,
      error: null,
      leaderboards: mockLeaderboards,
      refresh: vi.fn(),
      getPlayerCareer: vi.fn(),
    };
  });

  describe('Loading State', () => {
    test('shows loading message', () => {
      mockHookState.isLoading = true;
      render(<CareerPitchingLeaderboard />);
      expect(screen.getByText('Loading career stats...')).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    test('shows error and retry button', () => {
      mockHookState.error = 'Network error';
      render(<CareerPitchingLeaderboard />);
      expect(screen.getByText(/Error: Network error/)).toBeInTheDocument();
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    test('shows empty message when no data', () => {
      mockHookState.leaderboards = {
        ...mockLeaderboards,
        pitchingByWAR: [],
        pitchingByWins: [],
        pitchingByStrikeouts: [],
        pitchingBySaves: [],
      };
      render(<CareerPitchingLeaderboard />);
      expect(screen.getByText('No career pitching data yet. Play some games!')).toBeInTheDocument();
    });
  });

  describe('Data Display', () => {
    test('shows default pWAR title', () => {
      render(<CareerPitchingLeaderboard />);
      expect(screen.getByText('Career pWAR Leaders')).toBeInTheDocument();
    });

    test('shows Wins title when sortBy=wins', () => {
      render(<CareerPitchingLeaderboard sortBy="wins" />);
      expect(screen.getByText('Career Wins Leaders')).toBeInTheDocument();
    });

    test('shows Strikeouts title when sortBy=strikeouts', () => {
      render(<CareerPitchingLeaderboard sortBy="strikeouts" />);
      expect(screen.getByText('Career Strikeouts Leaders')).toBeInTheDocument();
    });

    test('shows Saves title when sortBy=saves', () => {
      render(<CareerPitchingLeaderboard sortBy="saves" />);
      expect(screen.getByText('Career Saves Leaders')).toBeInTheDocument();
    });

    test('shows player names', () => {
      render(<CareerPitchingLeaderboard />);
      expect(screen.getByText('Sandy Koufax')).toBeInTheDocument();
      expect(screen.getByText('Mariano Rivera')).toBeInTheDocument();
    });

    test('shows wins', () => {
      render(<CareerPitchingLeaderboard />);
      expect(screen.getByText('20')).toBeInTheDocument();
      expect(screen.getByText('5')).toBeInTheDocument();
    });

    test('shows strikeouts', () => {
      render(<CareerPitchingLeaderboard />);
      expect(screen.getByText('280')).toBeInTheDocument();
      expect(screen.getByText('85')).toBeInTheDocument();
    });

    test('shows ERA', () => {
      render(<CareerPitchingLeaderboard />);
      expect(screen.getByText('2.25')).toBeInTheDocument();
      expect(screen.getByText('2.31')).toBeInTheDocument();
    });

    test('shows pWAR values', () => {
      render(<CareerPitchingLeaderboard />);
      expect(screen.getByText('+7.5')).toBeInTheDocument();
      expect(screen.getByText('+4.0')).toBeInTheDocument();
    });

    test('shows table headers', () => {
      render(<CareerPitchingLeaderboard />);
      expect(screen.getByText('#')).toBeInTheDocument();
      expect(screen.getByText('Player')).toBeInTheDocument();
      expect(screen.getByText('G')).toBeInTheDocument();
      expect(screen.getByText('W')).toBeInTheDocument();
      expect(screen.getByText('IP')).toBeInTheDocument();
      expect(screen.getByText('K')).toBeInTheDocument();
      expect(screen.getByText('ERA')).toBeInTheDocument();
      expect(screen.getByText('WAR')).toBeInTheDocument();
    });

    test('respects limit prop', () => {
      render(<CareerPitchingLeaderboard limit={1} />);
      expect(screen.getByText('Sandy Koufax')).toBeInTheDocument();
      expect(screen.queryByText('Mariano Rivera')).not.toBeInTheDocument();
    });
  });
});

// ============================================
// TESTS: CareerPanel
// ============================================

describe('CareerPanel Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHookState = {
      isLoading: false,
      error: null,
      leaderboards: mockLeaderboards,
      refresh: vi.fn(),
      getPlayerCareer: vi.fn(),
    };
  });

  describe('Tab Navigation', () => {
    test('defaults to batting tab', () => {
      render(<CareerPanel />);
      expect(screen.getByText('Career WAR Leaders')).toBeInTheDocument();
    });

    test('can start on pitching tab', () => {
      render(<CareerPanel defaultTab="pitching" />);
      expect(screen.getByText('Career pWAR Leaders')).toBeInTheDocument();
    });

    test('shows both tab buttons', () => {
      render(<CareerPanel />);
      expect(screen.getByText(/Career Batting/)).toBeInTheDocument();
      expect(screen.getByText(/Career Pitching/)).toBeInTheDocument();
    });

    test('shows player count in tabs', () => {
      render(<CareerPanel />);
      // Both tabs show count of 2 players
      expect(screen.getAllByText('(2)').length).toBe(2);
    });

    test('switches to pitching when tab clicked', () => {
      render(<CareerPanel />);
      fireEvent.click(screen.getByText(/Career Pitching/));
      expect(screen.getByText('Career pWAR Leaders')).toBeInTheDocument();
      expect(screen.getByText('Sandy Koufax')).toBeInTheDocument();
    });

    test('switches back to batting when tab clicked', () => {
      render(<CareerPanel defaultTab="pitching" />);
      fireEvent.click(screen.getByText(/Career Batting/));
      expect(screen.getByText('Career WAR Leaders')).toBeInTheDocument();
      expect(screen.getByText('Mike Trout')).toBeInTheDocument();
    });
  });

  describe('Sort Options', () => {
    test('shows batting sort options on batting tab', () => {
      render(<CareerPanel />);
      expect(screen.getByText('Sort by:')).toBeInTheDocument();
      // WAR and HR appear in sort buttons and table headers
      expect(screen.getAllByText('WAR').length).toBeGreaterThan(0);
      expect(screen.getAllByText('HR').length).toBeGreaterThan(0);
      expect(screen.getByRole('button', { name: 'Hits' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'RBI' })).toBeInTheDocument();
    });

    test('shows pitching sort options on pitching tab', () => {
      render(<CareerPanel defaultTab="pitching" />);
      expect(screen.getByText('Sort by:')).toBeInTheDocument();
      expect(screen.getByText('Wins')).toBeInTheDocument();
      expect(screen.getAllByText('K').length).toBeGreaterThan(0);
      expect(screen.getByText('Saves')).toBeInTheDocument();
    });

    test('clicking HR sort changes to HR leaders', () => {
      render(<CareerPanel />);
      // Aaron Judge has more HRs (43 vs 35)
      const hrButton = screen.getByRole('button', { name: 'HR' });
      fireEvent.click(hrButton);
      expect(screen.getByText('Career HR Leaders')).toBeInTheDocument();
    });

    test('clicking Hits sort changes to Hits leaders', () => {
      render(<CareerPanel />);
      const hitsButton = screen.getByRole('button', { name: 'Hits' });
      fireEvent.click(hitsButton);
      expect(screen.getByText('Career HITS Leaders')).toBeInTheDocument();
    });

    test('clicking RBI sort changes to RBI leaders', () => {
      render(<CareerPanel />);
      const rbiButton = screen.getByRole('button', { name: 'RBI' });
      fireEvent.click(rbiButton);
      expect(screen.getByText('Career RBI Leaders')).toBeInTheDocument();
    });

    test('clicking Wins sort on pitching tab', () => {
      render(<CareerPanel defaultTab="pitching" />);
      const winsButton = screen.getByRole('button', { name: 'Wins' });
      fireEvent.click(winsButton);
      expect(screen.getByText('Career Wins Leaders')).toBeInTheDocument();
    });

    test('clicking Saves sort on pitching tab', () => {
      render(<CareerPanel defaultTab="pitching" />);
      const savesButton = screen.getByRole('button', { name: 'Saves' });
      fireEvent.click(savesButton);
      expect(screen.getByText('Career Saves Leaders')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    test('hides count in tabs when loading', () => {
      mockHookState.isLoading = true;
      render(<CareerPanel />);
      // Should not show count
      expect(screen.queryByText('(2)')).not.toBeInTheDocument();
    });
  });
});

// ============================================
// TESTS: Formatting Utilities
// ============================================

describe('Career Formatting Utilities', () => {
  beforeEach(() => {
    // Reset mock state for formatting tests
    mockHookState = {
      isLoading: false,
      error: null,
      leaderboards: mockLeaderboards,
      refresh: vi.fn(),
      getPlayerCareer: vi.fn(),
    };
  });

  test('AVG formatting removes leading zero', () => {
    render(<CareerBattingLeaderboard />);
    // .360 not 0.360
    expect(screen.getByText('.360')).toBeInTheDocument();
  });

  test('WAR formatting adds + for positive', () => {
    render(<CareerBattingLeaderboard />);
    expect(screen.getByText('+8.5')).toBeInTheDocument();
  });

  test('ERA formatting shows 2 decimal places', () => {
    render(<CareerPitchingLeaderboard />);
    expect(screen.getByText('2.25')).toBeInTheDocument();
  });
});
