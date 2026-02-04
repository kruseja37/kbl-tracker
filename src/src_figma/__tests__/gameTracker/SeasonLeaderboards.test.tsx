/**
 * SeasonLeaderboards Component Tests
 *
 * Tests season batting/pitching leaderboards and panel components.
 * Per Ralph Framework S-B017
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  SeasonBattingLeaderboard,
  SeasonPitchingLeaderboard,
  SeasonLeaderboardsPanel,
} from '../../../components/GameTracker/SeasonLeaderboards';
import type { BattingLeaderEntry, PitchingLeaderEntry } from '../../../hooks/useSeasonStats';

// ============================================
// MOCKS
// ============================================

const mockBattingLeaders: BattingLeaderEntry[] = [
  {
    playerId: 'p1',
    playerName: 'Shohei Ohtani',
    teamId: 'LAD',
    games: 50,
    pa: 220,
    ab: 190,
    hits: 70,
    singles: 35,
    doubles: 18,
    triples: 2,
    homeRuns: 15,
    rbi: 45,
    runs: 50,
    walks: 28,
    strikeouts: 45,
    hitByPitch: 2,
    sacFlies: 2,
    stolenBases: 12,
    caughtStealing: 2,
    groundedIntoDP: 4,
    avg: 0.368,
    obp: 0.450,
    slg: 0.658,
    ops: 1.108,
    fameNet: 15,
  },
  {
    playerId: 'p2',
    playerName: 'Mookie Betts',
    teamId: 'LAD',
    games: 48,
    pa: 210,
    ab: 185,
    hits: 62,
    singles: 30,
    doubles: 15,
    triples: 1,
    homeRuns: 16,
    rbi: 42,
    runs: 48,
    walks: 22,
    strikeouts: 38,
    hitByPitch: 3,
    sacFlies: 1,
    stolenBases: 8,
    caughtStealing: 1,
    groundedIntoDP: 3,
    avg: 0.335,
    obp: 0.410,
    slg: 0.622,
    ops: 1.032,
    fameNet: 10,
  },
];

const mockPitchingLeaders: PitchingLeaderEntry[] = [
  {
    playerId: 'pitcher1',
    playerName: 'Clayton Kershaw',
    teamId: 'LAD',
    games: 12,
    gamesStarted: 12,
    wins: 8,
    losses: 2,
    saves: 0,
    holds: 0,
    qualityStarts: 9,
    outs: 210,
    ip: '70.0',
    hitsAllowed: 48,
    runsAllowed: 18,
    earnedRuns: 16,
    walksAllowed: 12,
    strikeouts: 75,
    homeRunsAllowed: 6,
    hitByPitch: 2,
    wildPitches: 3,
    era: 2.06,
    whip: 0.86,
    fameNet: 12,
  },
  {
    playerId: 'pitcher2',
    playerName: 'Evan Phillips',
    teamId: 'LAD',
    games: 28,
    gamesStarted: 0,
    wins: 3,
    losses: 1,
    saves: 18,
    holds: 5,
    qualityStarts: 0,
    outs: 84,
    ip: '28.0',
    hitsAllowed: 18,
    runsAllowed: 6,
    earnedRuns: 5,
    walksAllowed: 8,
    strikeouts: 32,
    homeRunsAllowed: 2,
    hitByPitch: 1,
    wildPitches: 1,
    era: 1.61,
    whip: 0.93,
    fameNet: 8,
  },
];

let mockHookState = {
  isLoading: false,
  error: null as string | null,
  battingLeaders: mockBattingLeaders,
  pitchingLeaders: mockPitchingLeaders,
  refresh: vi.fn(),
  getBattingLeaders: vi.fn((sortBy: string, limit: number) => {
    const leaders = [...mockBattingLeaders];
    switch (sortBy) {
      case 'ops':
        return leaders.sort((a, b) => b.ops - a.ops).slice(0, limit);
      case 'avg':
        return leaders.sort((a, b) => b.avg - a.avg).slice(0, limit);
      case 'hr':
        return leaders.sort((a, b) => b.homeRuns - a.homeRuns).slice(0, limit);
      case 'rbi':
        return leaders.sort((a, b) => b.rbi - a.rbi).slice(0, limit);
      case 'sb':
        return leaders.sort((a, b) => b.stolenBases - a.stolenBases).slice(0, limit);
      case 'fameNet':
        return leaders.sort((a, b) => b.fameNet - a.fameNet).slice(0, limit);
      default:
        return leaders.slice(0, limit);
    }
  }),
  getPitchingLeaders: vi.fn((sortBy: string, limit: number) => {
    const leaders = [...mockPitchingLeaders];
    switch (sortBy) {
      case 'era':
        return leaders.sort((a, b) => a.era - b.era).slice(0, limit);
      case 'whip':
        return leaders.sort((a, b) => a.whip - b.whip).slice(0, limit);
      case 'wins':
        return leaders.sort((a, b) => b.wins - a.wins).slice(0, limit);
      case 'strikeouts':
        return leaders.sort((a, b) => b.strikeouts - a.strikeouts).slice(0, limit);
      case 'saves':
        return leaders.sort((a, b) => b.saves - a.saves).slice(0, limit);
      case 'fameNet':
        return leaders.sort((a, b) => b.fameNet - a.fameNet).slice(0, limit);
      default:
        return leaders.slice(0, limit);
    }
  }),
};

vi.mock('../../../hooks/useSeasonStats', () => ({
  useSeasonStats: () => mockHookState,
}));

// ============================================
// TESTS: SeasonBattingLeaderboard
// ============================================

describe('SeasonBattingLeaderboard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHookState = {
      isLoading: false,
      error: null,
      battingLeaders: mockBattingLeaders,
      pitchingLeaders: mockPitchingLeaders,
      refresh: vi.fn(),
      getBattingLeaders: vi.fn((sortBy: string, limit: number) => {
        return [...mockBattingLeaders].slice(0, limit);
      }),
      getPitchingLeaders: vi.fn((sortBy: string, limit: number) => {
        return [...mockPitchingLeaders].slice(0, limit);
      }),
    };
  });

  describe('Loading State', () => {
    test('shows loading message when loading', () => {
      mockHookState.isLoading = true;
      render(<SeasonBattingLeaderboard />);
      expect(screen.getByText('Loading season stats...')).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    test('shows error message and retry button', () => {
      mockHookState.error = 'Network error';
      render(<SeasonBattingLeaderboard />);
      expect(screen.getByText(/Error: Network error/)).toBeInTheDocument();
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });

    test('calls refresh when retry clicked', () => {
      mockHookState.error = 'Network error';
      render(<SeasonBattingLeaderboard />);
      fireEvent.click(screen.getByText('Retry'));
      expect(mockHookState.refresh).toHaveBeenCalled();
    });
  });

  describe('Empty State', () => {
    test('shows empty message when no data', () => {
      mockHookState.getBattingLeaders = vi.fn().mockReturnValue([]);
      render(<SeasonBattingLeaderboard />);
      expect(screen.getByText('No batting data yet. Play some games!')).toBeInTheDocument();
    });
  });

  describe('Data Display', () => {
    test('shows default OPS title', () => {
      render(<SeasonBattingLeaderboard />);
      expect(screen.getByText('OPS Leaders')).toBeInTheDocument();
    });

    test('shows custom title when provided', () => {
      render(<SeasonBattingLeaderboard title="Top Hitters" />);
      expect(screen.getByText('Top Hitters')).toBeInTheDocument();
    });

    test('shows AVG title when sortBy=avg', () => {
      render(<SeasonBattingLeaderboard sortBy="avg" />);
      expect(screen.getByText('Batting Average Leaders')).toBeInTheDocument();
    });

    test('shows HR title when sortBy=hr', () => {
      render(<SeasonBattingLeaderboard sortBy="hr" />);
      expect(screen.getByText('Home Run Leaders')).toBeInTheDocument();
    });

    test('shows player names', () => {
      render(<SeasonBattingLeaderboard />);
      expect(screen.getByText('Shohei Ohtani')).toBeInTheDocument();
      expect(screen.getByText('Mookie Betts')).toBeInTheDocument();
    });

    test('shows team IDs', () => {
      render(<SeasonBattingLeaderboard />);
      // Both players are on LAD
      expect(screen.getAllByText('LAD').length).toBeGreaterThan(0);
    });

    test('shows table headers', () => {
      render(<SeasonBattingLeaderboard />);
      expect(screen.getByText('#')).toBeInTheDocument();
      expect(screen.getByText('Player')).toBeInTheDocument();
      expect(screen.getByText('OPS')).toBeInTheDocument();
    });

    test('shows rank numbers', () => {
      render(<SeasonBattingLeaderboard />);
      expect(screen.getByText('1')).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    test('respects limit prop', () => {
      render(<SeasonBattingLeaderboard limit={1} />);
      expect(mockHookState.getBattingLeaders).toHaveBeenCalledWith('ops', 1);
    });

    test('calls onPlayerClick when row clicked', () => {
      const onPlayerClick = vi.fn();
      render(<SeasonBattingLeaderboard onPlayerClick={onPlayerClick} />);
      fireEvent.click(screen.getByText('Shohei Ohtani'));
      expect(onPlayerClick).toHaveBeenCalledWith('p1', 'Shohei Ohtani', 'LAD');
    });

    test('refresh button works', () => {
      render(<SeasonBattingLeaderboard />);
      const refreshButton = screen.getByTitle('Refresh');
      fireEvent.click(refreshButton);
      expect(mockHookState.refresh).toHaveBeenCalled();
    });
  });

  describe('Stat Headers', () => {
    test('shows OPS header for ops sort', () => {
      render(<SeasonBattingLeaderboard sortBy="ops" />);
      expect(screen.getByText('OPS')).toBeInTheDocument();
    });

    test('shows AVG header for avg sort', () => {
      render(<SeasonBattingLeaderboard sortBy="avg" />);
      expect(screen.getByText('AVG')).toBeInTheDocument();
    });

    test('shows HR header for hr sort', () => {
      render(<SeasonBattingLeaderboard sortBy="hr" />);
      expect(screen.getByText('HR')).toBeInTheDocument();
    });

    test('shows RBI header for rbi sort', () => {
      render(<SeasonBattingLeaderboard sortBy="rbi" />);
      expect(screen.getByText('RBI')).toBeInTheDocument();
    });

    test('shows SB header for sb sort', () => {
      render(<SeasonBattingLeaderboard sortBy="sb" />);
      expect(screen.getByText('SB')).toBeInTheDocument();
    });

    test('shows Fame header for fameNet sort', () => {
      render(<SeasonBattingLeaderboard sortBy="fameNet" />);
      expect(screen.getByText('Fame')).toBeInTheDocument();
    });
  });
});

// ============================================
// TESTS: SeasonPitchingLeaderboard
// ============================================

describe('SeasonPitchingLeaderboard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHookState = {
      isLoading: false,
      error: null,
      battingLeaders: mockBattingLeaders,
      pitchingLeaders: mockPitchingLeaders,
      refresh: vi.fn(),
      getBattingLeaders: vi.fn((sortBy: string, limit: number) => {
        return [...mockBattingLeaders].slice(0, limit);
      }),
      getPitchingLeaders: vi.fn((sortBy: string, limit: number) => {
        return [...mockPitchingLeaders].slice(0, limit);
      }),
    };
  });

  describe('Loading State', () => {
    test('shows loading message', () => {
      mockHookState.isLoading = true;
      render(<SeasonPitchingLeaderboard />);
      expect(screen.getByText('Loading season stats...')).toBeInTheDocument();
    });
  });

  describe('Error State', () => {
    test('shows error and retry button', () => {
      mockHookState.error = 'Database error';
      render(<SeasonPitchingLeaderboard />);
      expect(screen.getByText(/Error: Database error/)).toBeInTheDocument();
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    test('shows empty message when no data', () => {
      mockHookState.getPitchingLeaders = vi.fn().mockReturnValue([]);
      render(<SeasonPitchingLeaderboard />);
      expect(screen.getByText('No pitching data yet. Play some games!')).toBeInTheDocument();
    });
  });

  describe('Data Display', () => {
    test('shows default ERA title', () => {
      render(<SeasonPitchingLeaderboard />);
      expect(screen.getByText('ERA Leaders')).toBeInTheDocument();
    });

    test('shows Wins title when sortBy=wins', () => {
      render(<SeasonPitchingLeaderboard sortBy="wins" />);
      expect(screen.getByText('Wins Leaders')).toBeInTheDocument();
    });

    test('shows Strikeout title when sortBy=strikeouts', () => {
      render(<SeasonPitchingLeaderboard sortBy="strikeouts" />);
      expect(screen.getByText('Strikeout Leaders')).toBeInTheDocument();
    });

    test('shows Saves title when sortBy=saves', () => {
      render(<SeasonPitchingLeaderboard sortBy="saves" />);
      expect(screen.getByText('Saves Leaders')).toBeInTheDocument();
    });

    test('shows player names', () => {
      render(<SeasonPitchingLeaderboard />);
      expect(screen.getByText('Clayton Kershaw')).toBeInTheDocument();
      expect(screen.getByText('Evan Phillips')).toBeInTheDocument();
    });

    test('shows table headers', () => {
      render(<SeasonPitchingLeaderboard />);
      expect(screen.getByText('#')).toBeInTheDocument();
      expect(screen.getByText('Player')).toBeInTheDocument();
      expect(screen.getByText('ERA')).toBeInTheDocument();
    });

    test('calls onPlayerClick when row clicked', () => {
      const onPlayerClick = vi.fn();
      render(<SeasonPitchingLeaderboard onPlayerClick={onPlayerClick} />);
      fireEvent.click(screen.getByText('Clayton Kershaw'));
      expect(onPlayerClick).toHaveBeenCalledWith('pitcher1', 'Clayton Kershaw', 'LAD');
    });
  });

  describe('Stat Headers', () => {
    test('shows ERA header for era sort', () => {
      render(<SeasonPitchingLeaderboard sortBy="era" />);
      expect(screen.getByText('ERA')).toBeInTheDocument();
    });

    test('shows WHIP header for whip sort', () => {
      render(<SeasonPitchingLeaderboard sortBy="whip" />);
      expect(screen.getByText('WHIP')).toBeInTheDocument();
    });

    test('shows W header for wins sort', () => {
      render(<SeasonPitchingLeaderboard sortBy="wins" />);
      expect(screen.getByText('W')).toBeInTheDocument();
    });

    test('shows K header for strikeouts sort', () => {
      render(<SeasonPitchingLeaderboard sortBy="strikeouts" />);
      expect(screen.getByText('K')).toBeInTheDocument();
    });

    test('shows SV header for saves sort', () => {
      render(<SeasonPitchingLeaderboard sortBy="saves" />);
      expect(screen.getByText('SV')).toBeInTheDocument();
    });

    test('shows IP header for ip sort', () => {
      render(<SeasonPitchingLeaderboard sortBy="ip" />);
      expect(screen.getByText('IP')).toBeInTheDocument();
    });
  });
});

// ============================================
// TESTS: SeasonLeaderboardsPanel
// ============================================

describe('SeasonLeaderboardsPanel Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockHookState = {
      isLoading: false,
      error: null,
      battingLeaders: mockBattingLeaders,
      pitchingLeaders: mockPitchingLeaders,
      refresh: vi.fn(),
      getBattingLeaders: vi.fn((sortBy: string, limit: number) => {
        return [...mockBattingLeaders].slice(0, limit);
      }),
      getPitchingLeaders: vi.fn((sortBy: string, limit: number) => {
        return [...mockPitchingLeaders].slice(0, limit);
      }),
    };
  });

  describe('Tab Navigation', () => {
    test('defaults to batting tab', () => {
      render(<SeasonLeaderboardsPanel />);
      expect(screen.getByText('OPS Leaders')).toBeInTheDocument();
    });

    test('can start on pitching tab', () => {
      render(<SeasonLeaderboardsPanel defaultTab="pitching" />);
      expect(screen.getByText('ERA Leaders')).toBeInTheDocument();
    });

    test('shows both tab buttons', () => {
      render(<SeasonLeaderboardsPanel />);
      expect(screen.getByText(/Season Batting/)).toBeInTheDocument();
      expect(screen.getByText(/Season Pitching/)).toBeInTheDocument();
    });

    test('shows player count in tabs', () => {
      render(<SeasonLeaderboardsPanel />);
      // Both tabs should show counts
      expect(screen.getAllByText('(2)').length).toBe(2);
    });

    test('switches to pitching when tab clicked', () => {
      render(<SeasonLeaderboardsPanel />);
      fireEvent.click(screen.getByText(/Season Pitching/));
      expect(screen.getByText('ERA Leaders')).toBeInTheDocument();
      expect(screen.getByText('Clayton Kershaw')).toBeInTheDocument();
    });

    test('switches back to batting when tab clicked', () => {
      render(<SeasonLeaderboardsPanel defaultTab="pitching" />);
      fireEvent.click(screen.getByText(/Season Batting/));
      expect(screen.getByText('OPS Leaders')).toBeInTheDocument();
      expect(screen.getByText('Shohei Ohtani')).toBeInTheDocument();
    });
  });

  describe('Batting Sort Options', () => {
    test('shows batting sort options on batting tab', () => {
      render(<SeasonLeaderboardsPanel />);
      expect(screen.getByText('Sort by:')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'OPS' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'AVG' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'HR' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'RBI' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'SB' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Fame' })).toBeInTheDocument();
    });

    test('clicking AVG sort changes leaders', () => {
      render(<SeasonLeaderboardsPanel />);
      fireEvent.click(screen.getByRole('button', { name: 'AVG' }));
      expect(screen.getByText('Batting Average Leaders')).toBeInTheDocument();
    });

    test('clicking HR sort changes leaders', () => {
      render(<SeasonLeaderboardsPanel />);
      fireEvent.click(screen.getByRole('button', { name: 'HR' }));
      expect(screen.getByText('Home Run Leaders')).toBeInTheDocument();
    });

    test('clicking RBI sort changes leaders', () => {
      render(<SeasonLeaderboardsPanel />);
      fireEvent.click(screen.getByRole('button', { name: 'RBI' }));
      expect(screen.getByText('RBI Leaders')).toBeInTheDocument();
    });

    test('clicking SB sort changes leaders', () => {
      render(<SeasonLeaderboardsPanel />);
      fireEvent.click(screen.getByRole('button', { name: 'SB' }));
      expect(screen.getByText('Stolen Base Leaders')).toBeInTheDocument();
    });

    test('clicking Fame sort changes leaders', () => {
      render(<SeasonLeaderboardsPanel />);
      fireEvent.click(screen.getByRole('button', { name: 'Fame' }));
      expect(screen.getByText('Fame Leaders (Batting)')).toBeInTheDocument();
    });
  });

  describe('Pitching Sort Options', () => {
    test('shows pitching sort options on pitching tab', () => {
      render(<SeasonLeaderboardsPanel defaultTab="pitching" />);
      expect(screen.getByText('Sort by:')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'ERA' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'WHIP' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'W' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'K' })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'SV' })).toBeInTheDocument();
    });

    test('clicking WHIP sort changes leaders', () => {
      render(<SeasonLeaderboardsPanel defaultTab="pitching" />);
      fireEvent.click(screen.getByRole('button', { name: 'WHIP' }));
      expect(screen.getByText('WHIP Leaders')).toBeInTheDocument();
    });

    test('clicking W sort changes leaders', () => {
      render(<SeasonLeaderboardsPanel defaultTab="pitching" />);
      fireEvent.click(screen.getByRole('button', { name: 'W' }));
      expect(screen.getByText('Wins Leaders')).toBeInTheDocument();
    });

    test('clicking K sort changes leaders', () => {
      render(<SeasonLeaderboardsPanel defaultTab="pitching" />);
      fireEvent.click(screen.getByRole('button', { name: 'K' }));
      expect(screen.getByText('Strikeout Leaders')).toBeInTheDocument();
    });

    test('clicking SV sort changes leaders', () => {
      render(<SeasonLeaderboardsPanel defaultTab="pitching" />);
      fireEvent.click(screen.getByRole('button', { name: 'SV' }));
      expect(screen.getByText('Saves Leaders')).toBeInTheDocument();
    });
  });

  describe('Loading State', () => {
    test('hides count in tabs when loading', () => {
      mockHookState.isLoading = true;
      render(<SeasonLeaderboardsPanel />);
      expect(screen.queryByText('(2)')).not.toBeInTheDocument();
    });
  });

  describe('Player Click', () => {
    test('passes onPlayerClick to leaderboard', () => {
      const onPlayerClick = vi.fn();
      render(<SeasonLeaderboardsPanel onPlayerClick={onPlayerClick} />);
      fireEvent.click(screen.getByText('Shohei Ohtani'));
      expect(onPlayerClick).toHaveBeenCalledWith('p1', 'Shohei Ohtani', 'LAD');
    });
  });
});
