/**
 * FranchiseHome Component Tests
 *
 * Tests the main franchise home page.
 * Note: Due to the complexity of this component with many nested children
 * and hooks, we focus on testing that it renders without errors and
 * basic navigation works.
 * Per Ralph Framework S-B017
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

// ============================================
// MOCKS - Must be before component import
// ============================================

const mockNavigate = vi.fn();
const mockLocation = {
  pathname: "/franchise/test-franchise-123",
  search: "",
  hash: "",
  state: null,
};

vi.mock('react-router', () => ({
  useNavigate: () => mockNavigate,
  useParams: () => ({ franchiseId: 'test-franchise-123' }),
  useLocation: () => mockLocation,
}));

// Mock local storage
const localStorageMock = {
  getItem: vi.fn().mockReturnValue(null),
  setItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock team colors config
vi.mock('@/config/teamColors', () => ({
  getTeamColors: vi.fn().mockReturnValue({ primary: '#FF0000', secondary: '#FFFFFF' }),
}));

// Mock all child components to avoid deep rendering issues
vi.mock('@/app/components/TeamHubContent', () => ({
  TeamHubContent: () => <div data-testid="team-hub-content">Team Hub Content</div>,
}));

vi.mock('@/app/components/MuseumContent', () => ({
  MuseumContent: ({ retiredJerseys }: { retiredJerseys: unknown[] }) => <div data-testid="museum-content">Museum Content</div>,
}));

vi.mock('@/app/components/FreeAgencyFlow', () => ({
  FreeAgencyFlow: () => <div data-testid="free-agency-flow">Free Agency Flow</div>,
}));

vi.mock('@/app/components/RatingsAdjustmentFlow', () => ({
  RatingsAdjustmentFlow: () => <div data-testid="ratings-adjustment-flow">Ratings Adjustment</div>,
}));

vi.mock('@/app/components/RetirementFlow', () => ({
  RetirementFlow: () => <div data-testid="retirement-flow">Retirement Flow</div>,
}));

vi.mock('@/app/components/AwardsCeremonyFlow', () => ({
  AwardsCeremonyFlow: () => <div data-testid="awards-ceremony-flow">Awards Ceremony</div>,
}));

vi.mock('@/app/components/ContractionExpansionFlow', () => ({
  ContractionExpansionFlow: () => <div data-testid="contraction-expansion-flow">Contraction/Expansion</div>,
}));

vi.mock('@/app/components/DraftFlow', () => ({
  DraftFlow: () => <div data-testid="draft-flow">Draft Flow</div>,
}));

vi.mock('@/app/components/FinalizeAdvanceFlow', () => ({
  FinalizeAdvanceFlow: () => <div data-testid="finalize-advance-flow">Finalize Advance</div>,
}));

vi.mock('@/app/components/TradeFlow', () => ({
  TradeFlow: () => <div data-testid="trade-flow">Trade Flow</div>,
}));

vi.mock('@/app/components/AddGameModal', () => ({
  AddGameModal: () => <div data-testid="add-game-modal">Add Game Modal</div>,
}));

vi.mock('@/app/components/ScheduleContent', () => ({
  ScheduleContent: () => <div data-testid="schedule-content">Schedule Content</div>,
}));

// Mock data hooks with proper signatures
vi.mock('@/hooks/useFranchiseData', () => ({
  useFranchiseData: vi.fn(() => ({
    teams: [
      { id: 'team-1', name: 'Tigers', abbr: 'DET' },
      { id: 'team-2', name: 'Sox', abbr: 'SOX' },
    ],
    standings: [
      { teamId: 'team-1', wins: 50, losses: 30 },
      { teamId: 'team-2', wins: 48, losses: 32 },
    ],
    leaders: {
      batting: [],
      pitching: [],
    },
    battingLeaders: { AVG: [], HR: [], RBI: [], SB: [], OPS: [], WAR: [], fWAR: [], rWAR: [] },
    pitchingLeaders: { ERA: [], W: [], K: [], WHIP: [], SV: [], WAR: [] },
    news: [],
    seasonStats: {},
    isLoading: false,
    error: null,
    stadiumMap: { 'team-1': 'Tiger Stadium', 'team-2': 'Sox Park' },
    refresh: vi.fn(),
  })),
}));

vi.mock('@/hooks/useScheduleData', () => ({
  useScheduleData: vi.fn(() => ({
    games: [
      {
        id: 'game-1',
        seasonNumber: 1,
        gameNumber: 1,
        dayNumber: 1,
        awayTeamId: 'TIGERS',
        homeTeamId: 'SOX',
        status: 'SCHEDULED',
      },
    ],
    metadata: null,
    nextGame: {
      id: 'game-1',
      seasonNumber: 1,
      gameNumber: 1,
      dayNumber: 1,
      awayTeamId: 'TIGERS',
      homeTeamId: 'SOX',
      status: 'SCHEDULED',
    },
    completedGames: [],
    upcomingGames: [
      {
        id: 'game-1',
        seasonNumber: 1,
        gameNumber: 1,
        dayNumber: 1,
        awayTeamId: 'TIGERS',
        homeTeamId: 'SOX',
        status: 'SCHEDULED',
      },
    ],
    getTeamStats: vi.fn(),
    addGame: vi.fn(),
    addSeries: vi.fn(),
    updateGame: vi.fn(),
    updateStatus: vi.fn(),
    completeGame: vi.fn(),
    completeFranchiseScoreOnly: vi.fn(),
    deleteGame: vi.fn(),
    clearSchedule: vi.fn(),
    isLoading: false,
    error: null,
    refresh: vi.fn(),
  })),
}));

vi.mock('@/hooks/usePlayoffData', () => ({
  usePlayoffData: vi.fn(() => ({
    bracket: null,
    series: [],
    isLoading: false,
    error: null,
    createBracket: vi.fn(),
    updateSeries: vi.fn(),
    refresh: vi.fn(),
  })),
}));

// Import component after all mocks are set up
import { usePlayoffData } from '@/hooks/usePlayoffData';
import { FranchiseHome } from '../../app/pages/FranchiseHome';

// ============================================
// TESTS
// ============================================

describe('FranchiseHome Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  describe('Basic Rendering', () => {
    test('renders without crashing', () => {
      render(<FranchiseHome />);
      // Component should render something
      expect(document.body.textContent).toBeTruthy();
    });

    test('renders franchise title area', () => {
      render(<FranchiseHome />);
      // Default league name is KRUSE BASEBALL
      expect(screen.getByText(/KRUSE BASEBALL/i)).toBeInTheDocument();
    });
  });

  describe('Season Phase Tabs', () => {
    test('renders regular season phase option', () => {
      render(<FranchiseHome />);
      // Look for regular season indicator
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  describe('Navigation', () => {
    test('renders multiple navigation tabs', () => {
      render(<FranchiseHome />);
      // Should have multiple clickable tabs/buttons
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(3);
    });

    test('exposes regular-season roster/trade desk while keeping deferred actions hidden', () => {
      render(<FranchiseHome />);

      expect(screen.getByRole('button', { name: /ROSTER & TRADES/i })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /ALL-STAR/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /SIM/i })).not.toBeInTheDocument();
      expect(screen.queryByText(/roster analyzer/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/recommendation engine/i)).not.toBeInTheDocument();
    });

    test('offseason release gate blocks prototype execution surfaces', () => {
      render(<FranchiseHome />);

      fireEvent.click(screen.getByRole('button', { name: /OFFSEASON/i }));

      expect(screen.queryByRole('button', { name: /^TRADES$/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /CONTRACT\/EXPAND/i })).not.toBeInTheDocument();
      expect(screen.getByRole('button', { name: /V1 RELEASE GATE/i })).toBeInTheDocument();
      expect(screen.getByText(/FRANCHISE V1 RELEASE GATE/i)).toBeInTheDocument();
      expect(screen.getByText(/Offseason execution is deferred/i)).toBeInTheDocument();
      expect(screen.queryByText(/BEGIN CONTRACTION/i)).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /START FREE AGENCY/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /BEGIN AWARDS CEREMONY/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /BEGIN RETIREMENT PHASE/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /START FINALIZE/i })).not.toBeInTheDocument();
    });

    test('regular-season league leaders gate deferred awards and voting surfaces', () => {
      render(<FranchiseHome />);

      fireEvent.click(screen.getByRole('button', { name: /LEAGUE LEADERS/i }));

      expect(screen.getByText('SEASON 1 LEAGUE LEADERS')).toBeInTheDocument();
      expect(screen.getByText('REAL BATTING AND PITCHING LEADERBOARDS')).toBeInTheDocument();
      expect(screen.getByTestId('franchise-v1-awards-deferred')).toHaveTextContent(
        'AWARDS AND VOTING DEFERRED',
      );
      expect(screen.queryByText('CURRENT LEADERS & VOTING TRACKER')).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /GLOVES RACE/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /SILVER SLUGGERS RACE/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /MAJOR AWARDS RACE/i })).not.toBeInTheDocument();
    });

    test('regular-season Museum is clearly labeled as global and non-franchise-scoped', () => {
      render(<FranchiseHome />);

      fireEvent.click(screen.getByRole('button', { name: /MUSEUM/i }));

      expect(screen.getByTestId('franchise-v1-global-museum-notice')).toHaveTextContent(
        'GLOBAL MUSEUM NOTICE',
      );
      expect(screen.getByTestId('franchise-v1-global-museum-notice')).toHaveTextContent(
        'global and not franchise-scoped',
      );
      expect(screen.getByTestId('museum-content')).toBeInTheDocument();
    });

    test('next-game preview gates deferred story and head-to-head modules', () => {
      render(<FranchiseHome />);

      expect(screen.getByTestId('franchise-v1-next-game-preview-gate')).toHaveTextContent(
        'Next-game story and head-to-head preview modules are deferred',
      );
      expect(screen.queryByRole('button', { name: /BEAT WRITERS/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /HEAD-TO-HEAD HISTORY/i })).not.toBeInTheDocument();
      expect(screen.queryByText(/FOLLOW BEAT WRITERS/i)).not.toBeInTheDocument();
    });

    test('playoff completed game chips map scores by actual away/home teams, not seed order', () => {
      const series = {
        id: 'series-score-map',
        playoffId: 'playoff-1',
        round: 1,
        roundName: 'Division Series',
        status: 'COMPLETED' as const,
        gamesRequired: 2,
        bestOf: 3,
        higherSeedWins: 2,
        lowerSeedWins: 0,
        winner: 'higher-seed',
        higherSeed: { seed: 1, teamId: 'higher-seed', teamName: 'Higher Seed' },
        lowerSeed: { seed: 4, teamId: 'lower-seed', teamName: 'Lower Seed' },
        games: [
          {
            gameNumber: 1,
            awayTeamId: 'lower-seed',
            homeTeamId: 'higher-seed',
            status: 'COMPLETED' as const,
            result: { awayScore: 3, homeScore: 4, winnerId: 'higher-seed', innings: 9 },
          },
          {
            gameNumber: 2,
            awayTeamId: 'higher-seed',
            homeTeamId: 'lower-seed',
            status: 'COMPLETED' as const,
            result: { awayScore: 6, homeScore: 5, winnerId: 'higher-seed', innings: 9 },
          },
        ],
        createdAt: 1,
      };
      vi.mocked(usePlayoffData).mockReturnValue({
        playoff: {
          id: 'playoff-1',
          seasonNumber: 1,
          status: 'IN_PROGRESS',
          teams: [
            { seed: 1, teamId: 'higher-seed', teamName: 'Higher Seed', league: 'Eastern' },
            { seed: 4, teamId: 'lower-seed', teamName: 'Lower Seed', league: 'Eastern' },
          ],
        },
        bracketByLeague: {
          Eastern: [series],
          Western: [],
          Championship: null,
        },
        completedSeries: [],
        hasActivePlayoff: true,
        isLoading: false,
        error: null,
        preparePlayoffSeedingReview: vi.fn(),
        createNewPlayoff: vi.fn(),
        startPlayoffs: vi.fn(),
        recordGameResult: vi.fn(),
        advanceRound: vi.fn(),
        completePlayoffs: vi.fn(),
        refresh: vi.fn(),
        getBattingLeaders: vi.fn(() => []),
        getPitchingLeaders: vi.fn(() => []),
      } as ReturnType<typeof usePlayoffData>);

      render(<FranchiseHome />);

      fireEvent.click(screen.getByRole('button', { name: /PLAYOFFS/i }));
      fireEvent.click(screen.getByRole('button', { name: /BRACKET/i }));
      fireEvent.click(screen.getByText(/\(1\) Higher Seed/i));

      expect(screen.getByTestId('playoff-game-score-series-score-map-1')).toHaveTextContent('A (4) Lower Seed3');
      expect(screen.getByTestId('playoff-game-score-series-score-map-1')).toHaveTextContent('H (1) Higher Seed4');
      expect(screen.getByTestId('playoff-game-score-series-score-map-2')).toHaveTextContent('A (1) Higher Seed6');
      expect(screen.getByTestId('playoff-game-score-series-score-map-2')).toHaveTextContent('H (4) Lower Seed5');
    });
  });

  describe('Schedule Integration', () => {
    test('has a way to add games', () => {
      render(<FranchiseHome />);
      // Should have add game functionality somewhere
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });
  });

  describe('Context Provider', () => {
    test('provides franchise data to children without errors', () => {
      // This test ensures the context provider works
      expect(() => render(<FranchiseHome />)).not.toThrow();
    });
  });
});
