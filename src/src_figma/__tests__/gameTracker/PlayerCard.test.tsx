/**
 * PlayerCard Component Tests
 *
 * Tests the player card display with stats, WAR, fame, and salary.
 * Per Ralph Framework S-B017
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { PlayerCard, PlayerCardModal } from '../../../components/GameTracker/PlayerCard';

// ============================================
// MOCKS
// ============================================

// Mock hooks
vi.mock('../../../hooks/useWARCalculations', () => ({
  useWARCalculations: () => ({
    isLoading: false,
    getPlayerBWAR: vi.fn().mockReturnValue({
      bWAR: 2.5,
      offWAR: 1.5,
      defWAR: 0.5,
      baserunWAR: 0.5,
    }),
    getPlayerPWAR: vi.fn().mockReturnValue(null),
  }),
  formatWAR: (war: number) => war.toFixed(1),
  getWARColor: () => '#22c55e',
  adjustWARForCondition: (war: number) => war,
}));

vi.mock('../../../hooks/useSeasonStats', () => ({
  useSeasonStats: () => ({
    isLoading: false,
    battingStats: [],
    pitchingStats: [],
  }),
}));

vi.mock('../../../hooks/useCareerStats', () => ({
  useCareerStats: () => ({
    isLoading: false,
    careerBatting: [],
    careerPitching: [],
  }),
}));

vi.mock('../../../utils/seasonStorage', () => ({
  getAllBattingStats: vi.fn().mockResolvedValue([
    {
      playerId: 'player1',
      seasonId: 'season-1',
      games: 50,
      pa: 200,
      ab: 180,
      hits: 54,
      doubles: 10,
      triples: 2,
      homeRuns: 15,
      rbi: 45,
      runs: 40,
      walks: 20,
      strikeouts: 40,
      fameNet: 5,
    },
  ]),
  getAllPitchingStats: vi.fn().mockResolvedValue([]),
  calculateBattingDerived: (stats: any) => ({
    avg: stats.hits / stats.ab,
    obp: (stats.hits + stats.walks) / stats.pa,
    slg: (stats.hits + stats.doubles + stats.triples * 2 + stats.homeRuns * 3) / stats.ab,
    ops: 0.800,
  }),
  calculatePitchingDerived: vi.fn().mockReturnValue({
    era: 3.50,
    whip: 1.20,
  }),
}));

vi.mock('../../../utils/careerStorage', () => ({
  getCareerStats: vi.fn().mockResolvedValue(null),
}));

vi.mock('../../../engines/fameEngine', () => ({
  getFameTier: vi.fn().mockReturnValue({ label: 'Rising Star', threshold: 5, emoji: '⭐' }),
}));

vi.mock('../../../engines/salaryCalculator', () => ({
  formatSalary: (salary: number) => `$${salary.toFixed(1)}M`,
  getSalaryColor: () => '#22c55e',
  getSalaryTier: () => 'Solid Contract',
  calculateSimpleROI: () => ({
    roiWARPerMillion: 0.5,
    roiTier: 'GREAT_VALUE',
    valueRating: 4,
  }),
  getROITierDisplay: () => 'Great Value ⭐⭐⭐⭐',
  calculateSalaryWithBreakdown: vi.fn().mockReturnValue({
    baseSalary: 10.0,
    positionMultiplier: 1.0,
    traitModifier: 1.0,
    ageFactor: 1.0,
    performanceModifier: 1.0,
    fameModifier: 1.0,
    personalityModifier: 1.0,
    components: {},
    finalSalary: 10.0,
  }),
}));

vi.mock('../../../data/playerDatabase', () => ({
  getPlayer: vi.fn().mockReturnValue({
    id: 'player1',
    name: 'Test Player',
    isPitcher: false,
    primaryPosition: 'SS',
    secondaryPosition: '2B',
    bats: 'R',
    throws: 'R',
    age: 27,
    traits: { trait1: 'Contact Hitter', trait2: 'Speedy' },
    batterRatings: {
      power: 75,
      contact: 80,
      speed: 70,
      fielding: 85,
      arm: 72,
    },
  }),
  getPlayerByName: vi.fn().mockReturnValue(null),
  getAllTeams: vi.fn().mockReturnValue([]),
}));

vi.mock('../../../utils/leagueConfig', () => ({
  buildDHContext: vi.fn().mockReturnValue({ isDHLeague: false }),
  getLeagues: vi.fn().mockReturnValue([]),
  getSeasonDHConfig: vi.fn().mockReturnValue(null),
  initializeDefaultLeagues: vi.fn(),
}));

vi.mock('../../../engines/mojoEngine', () => ({
  MOJO_STATES: {
    '-2': { displayName: 'Rattled', emoji: '😰', statMultiplier: 0.82 },
    '-1': { displayName: 'Down', emoji: '😐', statMultiplier: 0.91 },
    '0': { displayName: 'Normal', emoji: '😊', statMultiplier: 1.0 },
    '1': { displayName: 'Locked In', emoji: '😎', statMultiplier: 1.09 },
    '2': { displayName: 'Jacked', emoji: '🔥', statMultiplier: 1.18 },
  },
  getMojoColor: () => '#22c55e',
}));

vi.mock('../../../engines/fitnessEngine', () => ({
  FITNESS_STATES: {
    JUICED: { displayName: 'Juiced', emoji: '💉', color: '#a855f7', multiplier: 1.20 },
    FIT: { displayName: 'Fit', emoji: '💪', color: '#22c55e', multiplier: 1.0 },
    WELL: { displayName: 'Well', emoji: '👍', color: '#84cc16', multiplier: 0.95 },
    STRAINED: { displayName: 'Strained', emoji: '🤕', color: '#f59e0b', multiplier: 0.85 },
    WEAK: { displayName: 'Weak', emoji: '😓', color: '#ef4444', multiplier: 0.70 },
    HURT: { displayName: 'Hurt', emoji: '🩹', color: '#991b1b', multiplier: 0.0 },
  },
}));

// Mock the RelationshipPanel and AgingDisplay components
vi.mock('../../../components/RelationshipPanel', () => ({
  default: () => <div data-testid="relationship-panel">Relationships</div>,
}));

vi.mock('../../../components/AgingDisplay', () => ({
  default: ({ age }: { age: number }) => <div data-testid="aging-display">Age: {age}</div>,
}));

// ============================================
// TESTS
// ============================================

describe('PlayerCard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Loading State', () => {
    test('renders component without crashing', async () => {
      // Just verify the component can be rendered
      render(
        <PlayerCard
          playerId="player1"
          playerName="Test Player"
          teamId="team1"
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Test Player')).toBeInTheDocument();
      });
    });
  });

  describe('Header', () => {
    test('renders player name and team', async () => {
      render(
        <PlayerCard
          playerId="player1"
          playerName="Test Player"
          teamId="team1"
        />
      );

      await waitFor(() => {
        expect(screen.getByText('Test Player')).toBeInTheDocument();
        expect(screen.getByText('team1')).toBeInTheDocument();
      });
    });

    test('renders close button when onClose provided', async () => {
      const onClose = vi.fn();
      render(
        <PlayerCard
          playerId="player1"
          playerName="Test Player"
          teamId="team1"
          onClose={onClose}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('✕')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('✕'));
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('WAR Display', () => {
    test('shows total WAR', async () => {
      render(
        <PlayerCard
          playerId="player1"
          playerName="Test Player"
          teamId="team1"
        />
      );

      await waitFor(() => {
        expect(screen.getByText('TOTAL WAR')).toBeInTheDocument();
        // There may be multiple 2.5 values (total and bWAR), use getAllByText
        expect(screen.getAllByText('2.5').length).toBeGreaterThan(0);
      });
    });

    test('shows bWAR when batting stats exist', async () => {
      render(
        <PlayerCard
          playerId="player1"
          playerName="Test Player"
          teamId="team1"
        />
      );

      await waitFor(() => {
        expect(screen.getByText('bWAR')).toBeInTheDocument();
      });
    });
  });

  describe('Fame Display', () => {
    test('shows fame total and tier', async () => {
      render(
        <PlayerCard
          playerId="player1"
          playerName="Test Player"
          teamId="team1"
        />
      );

      await waitFor(() => {
        expect(screen.getByText('FAME')).toBeInTheDocument();
        expect(screen.getByText('+5')).toBeInTheDocument();
        expect(screen.getByText('(Rising Star)')).toBeInTheDocument();
      });
    });
  });

  describe('Mojo & Fitness Display', () => {
    test('shows mojo level when provided', async () => {
      render(
        <PlayerCard
          playerId="player1"
          playerName="Test Player"
          teamId="team1"
          mojoLevel={1}
        />
      );

      await waitFor(() => {
        expect(screen.getByText('MOJO')).toBeInTheDocument();
        expect(screen.getByText(/Locked In/)).toBeInTheDocument();
      });
    });

    test('shows fitness state when provided', async () => {
      render(
        <PlayerCard
          playerId="player1"
          playerName="Test Player"
          teamId="team1"
          fitnessState="FIT"
        />
      );

      await waitFor(() => {
        expect(screen.getByText('FITNESS')).toBeInTheDocument();
        expect(screen.getByText(/Fit/)).toBeInTheDocument();
      });
    });

    test('hides mojo/fitness section when not provided', async () => {
      render(
        <PlayerCard
          playerId="player1"
          playerName="Test Player"
          teamId="team1"
        />
      );

      await waitFor(() => {
        expect(screen.queryByText('MOJO')).not.toBeInTheDocument();
        expect(screen.queryByText('FITNESS')).not.toBeInTheDocument();
      });
    });
  });

  describe('Salary Display', () => {
    test('shows estimated salary', async () => {
      render(
        <PlayerCard
          playerId="player1"
          playerName="Test Player"
          teamId="team1"
        />
      );

      await waitFor(() => {
        expect(screen.getByText('EST. VALUE')).toBeInTheDocument();
        expect(screen.getByText('$10.0M')).toBeInTheDocument();
        expect(screen.getByText('Solid Contract')).toBeInTheDocument();
      });
    });

    test('shows ROI tier when WAR is positive', async () => {
      render(
        <PlayerCard
          playerId="player1"
          playerName="Test Player"
          teamId="team1"
        />
      );

      await waitFor(() => {
        expect(screen.getByText(/Great Value/)).toBeInTheDocument();
      });
    });
  });

  describe('Season Batting Stats', () => {
    test('shows batting stats section', async () => {
      render(
        <PlayerCard
          playerId="player1"
          playerName="Test Player"
          teamId="team1"
        />
      );

      await waitFor(() => {
        expect(screen.getByText('SEASON BATTING')).toBeInTheDocument();
      });
    });

    test('shows key batting stats', async () => {
      render(
        <PlayerCard
          playerId="player1"
          playerName="Test Player"
          teamId="team1"
        />
      );

      await waitFor(() => {
        // Should show G, PA, AVG, HR, RBI, etc.
        expect(screen.getByText('G')).toBeInTheDocument();
        expect(screen.getByText('PA')).toBeInTheDocument();
        expect(screen.getByText('AVG')).toBeInTheDocument();
        expect(screen.getByText('HR')).toBeInTheDocument();
        expect(screen.getByText('RBI')).toBeInTheDocument();
      });
    });
  });

  describe('Aging Display', () => {
    test('shows aging display when player data exists', async () => {
      render(
        <PlayerCard
          playerId="player1"
          playerName="Test Player"
          teamId="team1"
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('aging-display')).toBeInTheDocument();
      });
    });
  });

  describe('Relationships Panel', () => {
    test('shows relationships when provided', async () => {
      const relationships = [
        {
          player1Id: 'player1',
          player2Id: 'player2',
          type: 'FRIEND' as const,
          strength: 5,
          sharedGames: 10,
        },
      ];

      render(
        <PlayerCard
          playerId="player1"
          playerName="Test Player"
          teamId="team1"
          relationships={relationships}
        />
      );

      await waitFor(() => {
        expect(screen.getByTestId('relationship-panel')).toBeInTheDocument();
      });
    });

    test('hides relationships when empty', async () => {
      render(
        <PlayerCard
          playerId="player1"
          playerName="Test Player"
          teamId="team1"
          relationships={[]}
        />
      );

      await waitFor(() => {
        expect(screen.queryByTestId('relationship-panel')).not.toBeInTheDocument();
      });
    });
  });
});

// ============================================
// PLAYER CARD MODAL TESTS
// ============================================

describe('PlayerCardModal Component', () => {
  test('renders nothing when not open', () => {
    const { container } = render(
      <PlayerCardModal
        isOpen={false}
        playerId="player1"
        playerName="Test Player"
        teamId="team1"
        onClose={vi.fn()}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  test('renders card when open', async () => {
    render(
      <PlayerCardModal
        isOpen={true}
        playerId="player1"
        playerName="Test Player"
        teamId="team1"
        onClose={vi.fn()}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Test Player')).toBeInTheDocument();
    });
  });

  test('calls onClose when overlay clicked', async () => {
    const onClose = vi.fn();
    render(
      <PlayerCardModal
        isOpen={true}
        playerId="player1"
        playerName="Test Player"
        teamId="team1"
        onClose={onClose}
      />
    );

    // Find the overlay (background)
    const overlay = document.querySelector('.fixed.inset-0');
    if (overlay) {
      fireEvent.click(overlay);
      expect(onClose).toHaveBeenCalled();
    }
  });

  test('passes mojo and fitness to PlayerCard', async () => {
    render(
      <PlayerCardModal
        isOpen={true}
        playerId="player1"
        playerName="Test Player"
        teamId="team1"
        onClose={vi.fn()}
        mojoLevel={2}
        fitnessState="JUICED"
      />
    );

    await waitFor(() => {
      expect(screen.getByText('MOJO')).toBeInTheDocument();
      expect(screen.getByText('FITNESS')).toBeInTheDocument();
    });
  });
});

// ============================================
// HELPER COMPONENT TESTS
// ============================================

describe('StatItem and RatingItem helpers', () => {
  // These are internal components but we can verify they render correctly
  // through the PlayerCard
  test('stat items render label and value', async () => {
    render(
      <PlayerCard
        playerId="player1"
        playerName="Test Player"
        teamId="team1"
      />
    );

    await waitFor(() => {
      // Check that stat labels are present
      expect(screen.getByText('G')).toBeInTheDocument();
      expect(screen.getByText('50')).toBeInTheDocument();
    });
  });
});
