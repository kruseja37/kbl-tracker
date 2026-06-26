/**
 * PostGameSummary Component Tests
 *
 * Tests the post-game summary display with scoreboard, POG, and box score.
 * Updated 2026-02-07: Aligned with data-driven component (async load via getCompletedGameById).
 */

import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, within, waitFor } from '@testing-library/react';
import { PostGameSummary } from '../../app/pages/PostGameSummary';
import type { CompletedGameRecord } from '../../utils/gameStorage';
import type { KblWpaCredit } from '../../../utils/kblWpaAttribution';
import type {
  ManagerDecisionRecord,
  ManagerDeploymentStintRecord,
} from '../../../types/managerWpa';

// ============================================
// MOCKS
// ============================================

const {
  mockNavigate,
  mockGetBetweenPlayEvents,
  mockGetGameEvents,
  mockGetGameFieldingEvents,
  mockGetGameHeader,
  mockGetRunFameStandings,
  mockGetRunPromotionCandidates,
  mockListManagerProfiles,
  mockDeriveKblWpaCredits,
  mockAcceptFamePromotion,
  mockDismissFamePromotion,
  mockLocationState,
} = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockGetBetweenPlayEvents: vi.fn(() => Promise.resolve([])),
  mockGetGameEvents: vi.fn(() => Promise.resolve([])),
  mockGetGameFieldingEvents: vi.fn(() => Promise.resolve([])),
  mockGetGameHeader: vi.fn(() => Promise.resolve(null)),
  mockGetRunFameStandings: vi.fn(() => Promise.resolve([])),
  mockGetRunPromotionCandidates: vi.fn(() => Promise.resolve([])),
  mockListManagerProfiles: vi.fn(() => Promise.resolve([])),
  mockDeriveKblWpaCredits: vi.fn(() => []),
  mockAcceptFamePromotion: vi.fn(),
  mockDismissFamePromotion: vi.fn(),
  mockLocationState: {
    gameMode: 'franchise',
    franchiseId: '1',
  } as Record<string, unknown>,
}));

vi.mock('react-router', () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => ({
    state: mockLocationState,
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

vi.mock('../../../utils/eventLog', () => ({
  getBetweenPlayEvents: mockGetBetweenPlayEvents,
  getGameEvents: mockGetGameEvents,
  getGameFieldingEvents: mockGetGameFieldingEvents,
  getGameHeader: mockGetGameHeader,
}));

vi.mock('../../../utils/managerIdentityStorage', () => ({
  listManagerProfiles: mockListManagerProfiles,
}));

vi.mock('../../../utils/kblWpaAttribution', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../../utils/kblWpaAttribution')>();
  return {
    ...actual,
    deriveKblWpaCredits: mockDeriveKblWpaCredits,
  };
});

vi.mock('../../../utils/eliminationRunFameStorage', () => ({
  getRunFameStandings: mockGetRunFameStandings,
}));

vi.mock('../../app/engines/famePromotion', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../app/engines/famePromotion')>();
  return {
    ...actual,
    getRunPromotionCandidates: mockGetRunPromotionCandidates,
    acceptFamePromotion: mockAcceptFamePromotion,
    dismissFamePromotion: mockDismissFamePromotion,
  };
});

// Build a complete CompletedGameRecord for mocking
const mockGameData = {
  gameId: 'test-game-123',
  date: Date.now(),
  stadiumName: 'Sox Field',
  seasonNumber: 1,
  awayTeamId: 'tigers',
  homeTeamId: 'sox',
  awayTeamName: 'Tigers',
  homeTeamName: 'Sox',
  finalScore: { away: 3, home: 4 },
  innings: 9,
  fameEvents: [],
  activityLog: ['Game saved to archive', 'MVP announced'],
  playerStats: {
    // Away batters (prefix: away-)
    'away-r-johnson': {
      playerName: 'R Johnson',
      teamId: 'tigers',
      pa: 4, ab: 4, h: 2, singles: 1, doubles: 1, triples: 0, hr: 0,
      rbi: 1, r: 1, bb: 0, hbp: 0, k: 1, sb: 0, cs: 0,
      putouts: 0, assists: 0, fieldingErrors: 0,
    },
    'away-m-davis': {
      playerName: 'M Davis',
      teamId: 'tigers',
      pa: 4, ab: 4, h: 1, singles: 1, doubles: 0, triples: 0, hr: 0,
      rbi: 1, r: 0, bb: 0, hbp: 0, k: 2, sb: 0, cs: 0,
      putouts: 0, assists: 0, fieldingErrors: 0,
    },
    'away-k-smith': {
      playerName: 'K Smith',
      teamId: 'tigers',
      pa: 4, ab: 3, h: 1, singles: 0, doubles: 0, triples: 0, hr: 1,
      rbi: 1, r: 1, bb: 1, hbp: 0, k: 0, sb: 0, cs: 0,
      putouts: 0, assists: 0, fieldingErrors: 0,
    },
    // Home batters (prefix: home-)
    'home-j-martinez': {
      playerName: 'J Martinez',
      teamId: 'sox',
      pa: 5, ab: 4, h: 3, singles: 1, doubles: 0, triples: 0, hr: 2,
      rbi: 4, r: 2, bb: 1, hbp: 0, k: 0, sb: 0, cs: 0,
      putouts: 0, assists: 0, fieldingErrors: 0,
    },
    'home-t-williams': {
      playerName: 'T Williams',
      teamId: 'sox',
      pa: 4, ab: 4, h: 2, singles: 2, doubles: 0, triples: 0, hr: 0,
      rbi: 0, r: 1, bb: 0, hbp: 0, k: 1, sb: 1, cs: 0,
      putouts: 0, assists: 0, fieldingErrors: 0,
    },
    'home-b-anderson': {
      playerName: 'B Anderson',
      teamId: 'sox',
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

const mockAtBatEvents = [
  { batterId: 'home-j-martinez', wpa: 0.300 },
  { batterId: 'away-r-johnson', wpa: 0.220 },
  { batterId: 'home-t-williams', wpa: 0.180 },
] as const;

const mockKblWpaCredits: KblWpaCredit[] = [
  {
    eventId: 'ab-1',
    source: 'at_bat',
    playerId: 'home-j-martinez',
    playerName: 'J Martinez',
    teamId: 'sox',
    role: 'batting',
    wpa: 0.3,
    confidence: 'high',
    basis: 'Batting WPA',
    allocationMode: 'ratio',
  },
  {
    eventId: 'ab-2',
    source: 'at_bat',
    playerId: 'away-r-johnson',
    playerName: 'R Johnson',
    teamId: 'tigers',
    role: 'batting',
    wpa: 0.22,
    confidence: 'high',
    basis: 'Batting WPA',
    allocationMode: 'ratio',
  },
  {
    eventId: 'ab-3',
    source: 'at_bat',
    playerId: 'home-t-williams',
    playerName: 'T Williams',
    teamId: 'sox',
    role: 'batting',
    wpa: 0.18,
    confidence: 'high',
    basis: 'Batting WPA',
    allocationMode: 'ratio',
  },
];

function createManagerDecision(
  overrides: Partial<ManagerDecisionRecord> = {},
): ManagerDecisionRecord {
  return {
    decisionId: overrides.decisionId ?? 'test-game-123:bp-1:pinch_hitter',
    gameId: 'test-game-123',
    managerId: 'sox-manager',
    teamId: 'sox',
    opponentTeamId: 'tigers',
    decisionType: 'pinch_hitter',
    inferenceMethod: 'automatic',
    decisionSource: 'user_action',
    confidence: 'high',
    inning: 7,
    half: 'bottom',
    outs: 1,
    baseState: '---',
    scoreDifferentialForTeam: 0,
    leverageIndex: 2.1,
    decisionEventId: 'bp-1',
    linkedEventIds: ['bp-1'],
    involvedPlayerIds: ['home-b-anderson'],
    teamWinProbabilityBefore: 0.5,
    teamWinProbabilityAfter: 0.684,
    managerWpa: 0.184,
    rawWindowWpa: 0.184,
    managerShare: 1,
    resolved: true,
    resolvedAtEventId: 'ab-9',
    displayTitle: 'Pinch hitter',
    displaySummary: 'Pinch hitter for sox',
    derivation: {
      derivedFromEventIds: ['bp-1'],
      derivedFromFields: ['substitution.subType'],
      manuallyPinned: false,
      stale: false,
    },
    ...overrides,
  };
}

const oneInningGame: CompletedGameRecord = {
  gameId: 'one-inning-game',
  date: Date.now(),
  stadiumName: 'Swagger Center',
  seasonNumber: 1,
  awayTeamId: 'moonstars',
  homeTeamId: 'heaters',
  awayTeamName: 'Moonstars',
  homeTeamName: 'Heaters',
  finalScore: { away: 1, home: 0 },
  innings: 1,
  fameEvents: [
    {
      id: 'fame-1',
      gameId: 'one-inning-game',
      eventType: 'HR',
      playerId: 'away-b-louis',
      playerName: 'B. Louis',
      playerTeam: 'moonstars',
      fameValue: 2,
      fameType: 'bonus',
      inning: 1,
      halfInning: 'TOP',
      timestamp: Date.now(),
      autoDetected: false,
      description: 'Moonstars HR',
    },
  ],
  activityLog: ['Moonstars HR! Swagger Center'],
  playerStats: {
    'away-b-louis': {
      playerName: 'B Louis',
      teamId: 'moonstars',
      pa: 2, ab: 2, h: 2, singles: 1, doubles: 0, triples: 0, hr: 1,
      rbi: 1, r: 1, bb: 0, hbp: 0, k: 0, sb: 0, cs: 0,
      putouts: 0, assists: 0, fieldingErrors: 0,
    },
    'home-b-fuller': {
      playerName: 'B Fuller',
      teamId: 'heaters',
      pa: 1, ab: 1, h: 0, singles: 0, doubles: 0, triples: 0, hr: 0,
      rbi: 0, r: 0, bb: 0, hbp: 0, k: 1, sb: 0, cs: 0,
      putouts: 0, assists: 0, fieldingErrors: 0,
    },
  },
  pitcherGameStats: [
    {
      pitcherId: 'away-p-lam',
      pitcherName: 'Moonstars Ace',
      teamId: 'moonstars',
      isStarter: true,
      entryInning: 1,
      outsRecorded: 3,
      hitsAllowed: 0,
      runsAllowed: 0,
      earnedRuns: 0,
      walksAllowed: 1,
      strikeoutsThrown: 3,
      homeRunsAllowed: 1,
      hitBatters: 0,
      basesReachedViaError: 0,
      wildPitches: 0,
      pitchCount: 18,
      battersFaced: 4,
      consecutiveHRsAllowed: 0,
      firstInningRuns: 0,
      basesLoadedWalks: 0,
      inningsComplete: 1,
    },
    {
      pitcherId: 'home-p-fuller',
      pitcherName: 'Heaters Turn',
      teamId: 'heaters',
      isStarter: true,
      entryInning: 1,
      outsRecorded: 3,
      hitsAllowed: 2,
      runsAllowed: 1,
      earnedRuns: 1,
      walksAllowed: 0,
      strikeoutsThrown: 3,
      homeRunsAllowed: 1,
      hitBatters: 0,
      basesReachedViaError: 0,
      wildPitches: 0,
      pitchCount: 20,
      battersFaced: 5,
      consecutiveHRsAllowed: 0,
      firstInningRuns: 1,
      basesLoadedWalks: 0,
      inningsComplete: 1,
    },
  ],
  inningScores: [{ away: 1, home: 0 }],
};

describe('Activity Log', () => {
  test('renders archived fixture details when legacy activity entries are present', async () => {
    render(<PostGameSummary />);

    expect(await screen.findByText('Sox Field')).toBeInTheDocument();
    expect(screen.getByText('★ SOX WIN! ★')).toBeInTheDocument();
    expect(screen.queryByText('Game saved to archive')).not.toBeInTheDocument();
  });
});

vi.mock('../../utils/gameStorage', () => ({
  getCompletedGameById: vi.fn(() => Promise.resolve(mockGameData)),
}));

// ============================================
// TESTS
// ============================================

describe('PostGameSummary Component', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    mockLocationState.gameMode = 'franchise';
    mockLocationState.franchiseId = '1';
    delete mockLocationState.eliminationId;
    delete mockLocationState.competitionId;
    // Re-mock to ensure fresh data each test
    const { getCompletedGameById } = await import('../../utils/gameStorage');
    vi.mocked(getCompletedGameById).mockResolvedValue(mockGameData);
    mockGetGameEvents.mockResolvedValue(mockAtBatEvents);
    mockGetGameFieldingEvents.mockResolvedValue([]);
    mockGetBetweenPlayEvents.mockResolvedValue([]);
    mockGetGameHeader.mockResolvedValue(null);
    mockDeriveKblWpaCredits.mockReturnValue(mockKblWpaCredits);
    mockListManagerProfiles.mockResolvedValue([
      { managerId: 'sox-manager', displayName: 'Sox Skipper' },
      { managerId: 'tigers-manager', displayName: 'Tigers Skipper' },
    ]);
    mockGetRunFameStandings.mockResolvedValue([]);
    mockGetRunPromotionCandidates.mockResolvedValue([]);
    mockAcceptFamePromotion.mockResolvedValue({});
    mockDismissFamePromotion.mockResolvedValue(undefined);
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

  describe('Run standings table', () => {
    test('renders elimination run standings when the summary is in elimination mode', async () => {
      const eliminationGame = {
        ...mockGameData,
        competitionType: 'elimination' as const,
        competitionId: 'elim-run-22',
      };

      mockLocationState.gameMode = 'elimination';
      mockLocationState.eliminationId = 'elim-run-22';
      mockLocationState.competitionId = 'elim-run-22';
      const { getCompletedGameById } = await import('../../utils/gameStorage');
      vi.mocked(getCompletedGameById).mockResolvedValue(eliminationGame);
      mockGetRunFameStandings.mockResolvedValue([
        {
          playerId: 'home-j-martinez',
          playerName: 'J Martinez',
          totalFame: 6.2,
          gamesPlayed: 3,
          events: [
            {
              id: 'run-1',
              gameId: 'test-game-123',
              eventType: 'GRAND_SLAM',
              playerId: 'home-j-martinez',
              playerName: 'J Martinez',
              playerTeam: 'sox',
              fameValue: 6.2,
              fameType: 'bonus',
              inning: 8,
              halfInning: 'BOTTOM',
              timestamp: 1,
              autoDetected: true,
            },
          ],
        },
      ]);

      render(<PostGameSummary />);

      const runStandingsTable = await screen.findByTestId('run-standings-table');
      expect(runStandingsTable).toBeInTheDocument();
      expect(within(runStandingsTable).getByText('RUN STANDINGS')).toBeInTheDocument();
      expect(within(runStandingsTable).getByText('J Martinez')).toBeInTheDocument();
      expect(within(runStandingsTable).getByText('+6.2')).toBeInTheDocument();
      expect(mockGetRunFameStandings).toHaveBeenCalledWith('elim-run-22');
    });

    test('renders promotion banner candidates and writes accepts in elimination summaries', async () => {
      const eliminationGame = {
        ...mockGameData,
        competitionType: 'elimination' as const,
        competitionId: 'elim-run-23',
      };

      mockLocationState.gameMode = 'elimination';
      mockLocationState.eliminationId = 'elim-run-23';
      mockLocationState.competitionId = 'elim-run-23';
      const { getCompletedGameById } = await import('../../utils/gameStorage');
      vi.mocked(getCompletedGameById).mockResolvedValue(eliminationGame);
      mockGetRunFameStandings.mockResolvedValue([
        {
          playerId: 'home-j-martinez',
          playerName: 'J Martinez',
          totalFame: 82.4,
          gamesPlayed: 4,
          events: [
            {
              id: 'run-promo-1',
              gameId: 'test-game-123',
              eventType: 'GRAND_SLAM',
              playerId: 'home-j-martinez',
              playerName: 'J Martinez',
              playerTeam: 'sox',
              fameValue: 82.4,
              fameType: 'bonus',
              inning: 8,
              halfInning: 'BOTTOM',
              timestamp: 1,
              autoDetected: true,
            },
          ],
        },
      ]);
      mockGetRunPromotionCandidates.mockResolvedValue([
        {
          playerId: 'home-j-martinez',
          playerName: 'J Martinez',
          teamId: 'sox',
          teamName: 'Sox',
          currentTier: 3,
          targetTier: 4,
          runTotalFame: 82.4,
          gamesPlayed: 4,
        },
      ]);

      render(<PostGameSummary />);

      const banner = await screen.findByTestId('fame-promotion-banner');
      expect(within(banner).getByText('J Martinez')).toBeInTheDocument();
      expect(within(banner).getByText('Veteran')).toBeInTheDocument();
      expect(within(banner).getByText('Captain')).toBeInTheDocument();

      fireEvent.click(within(banner).getByRole('button', { name: /accept/i }));

      await waitFor(() => {
        expect(mockAcceptFamePromotion).toHaveBeenCalledWith(
          'elim-run-23',
          'home-j-martinez',
          4,
        );
      });
      expect(mockGetRunPromotionCandidates).toHaveBeenCalledWith(
        'elim-run-23',
        expect.any(Array),
        {
          tigers: 'Tigers',
          sox: 'Sox',
        },
      );
    });

    test('does not render elimination run standings for exhibition summaries', async () => {
      mockLocationState.gameMode = 'exhibition';

      render(<PostGameSummary />);

      expect(await screen.findByText('POST-GAME REPORT')).toBeInTheDocument();
      expect(screen.queryByTestId('run-standings-table')).not.toBeInTheDocument();
      expect(screen.queryByTestId('fame-promotion-banner')).not.toBeInTheDocument();
      expect(mockGetRunFameStandings).not.toHaveBeenCalled();
    });
  });

  describe('Manager WPA overlay', () => {
    test('renders one committed manager overlay card per team with resolved totals and pending counts', async () => {
      const { getCompletedGameById } = await import('../../utils/gameStorage');
      vi.mocked(getCompletedGameById).mockResolvedValue({
        ...mockGameData,
        managerDecisions: [
          createManagerDecision({
            managerWpa: 0.184,
            displayTitle: 'Pinch hitter',
            resolved: true,
          }),
          createManagerDecision({
            decisionId: 'test-game-123:bp-2:pitching_change',
            decisionType: 'pitching_change',
            displayTitle: 'Pitching change',
            managerWpa: undefined,
            rawWindowWpa: undefined,
            teamWinProbabilityAfter: undefined,
            resolved: false,
            resolvedAtEventId: undefined,
          }),
          createManagerDecision({
            decisionId: 'test-game-123:bp-3:steal_send',
            managerId: 'tigers-manager',
            teamId: 'tigers',
            opponentTeamId: 'sox',
            decisionType: 'steal_send',
            decisionSource: 'event_semantics',
            displayTitle: 'Steal/send',
            managerWpa: -0.052,
            rawWindowWpa: -0.149,
            resolved: true,
          }),
        ],
      });

      render(<PostGameSummary />);

      const overlay = await screen.findByTestId('manager-wpa-overlay');
      expect(within(overlay).getByText('MANAGER WPA OVERLAY')).toBeInTheDocument();
      expect(within(overlay).getByText('Sox Skipper')).toBeInTheDocument();
      expect(screen.getByTestId('manager-wpa-total-sox')).toHaveTextContent('+0.0 pp');
      expect(screen.getByTestId('manager-wpa-total-tigers')).toHaveTextContent('+0.0 pp');
      expect(within(screen.getByTestId('manager-wpa-card-sox')).getByText('2 (1 pending)')).toBeInTheDocument();
      fireEvent.click(
        within(screen.getByTestId('manager-tactical-trace-details-sox')).getByRole(
          'button',
          { name: /open pinch hitter manager moment details for sox skipper/i },
        ),
      );
      const dialog = screen.getByRole('dialog', { name: /manager moment details/i });
      expect(dialog).toHaveTextContent('Sox Skipper / Sox');
      expect(dialog).toHaveTextContent('Tactical');
      expect(dialog).toHaveTextContent('Pinch Hitter');
      expect(dialog).toHaveTextContent('Raw WPA');
      expect(dialog).toHaveTextContent('+18.4 pp');
      expect(dialog).toHaveTextContent('Final Manager Value');
      expect(dialog).toHaveTextContent('+18.4 pp');
    });

    test('renders deployment stint recap details from committed manager records', async () => {
      const { getCompletedGameById } = await import('../../utils/gameStorage');
      const stint: ManagerDeploymentStintRecord = {
        stintId: 'test-game-123:bp-1:deployment:pinch-runner',
        gameId: 'test-game-123',
        managerId: 'sox-manager',
        teamId: 'sox',
        deploymentRole: 'pinch_runner',
        playerId: 'home-speed',
        playerName: 'Home Speed',
        sourceEventId: 'bp-1',
        openedAtEventIndex: 8,
        tacticalExclusionEventIds: ['ab-8'],
        closedAtEventId: 'ab-11',
        closedAtEventIndex: 11,
        closeReason: 'game_end',
        linkedEventIds: ['ab-10', 'ab-11'],
        rawLinkedWpa: 0.4,
        managerShare: 0.2,
        managerDeploymentWpa: 0.08,
        cap: 0.125,
        confidence: 'medium',
      };
      vi.mocked(getCompletedGameById).mockResolvedValue({
        ...mockGameData,
        managerDeploymentStints: [stint],
      });

      render(<PostGameSummary />);

      const details = await screen.findByTestId('manager-deployment-stint-details-sox');
      expect(screen.getByTestId('manager-deployment-wpa-sox')).toHaveTextContent('+8.0 pp');
      expect(screen.getByTestId('manager-wpa-total-sox')).toHaveTextContent('+8.0 pp');
      expect(details).toHaveTextContent(
        "Pinch runner Home Speed's remaining baserunning and fielding outcomes stay with the deployment choice.",
      );
      fireEvent.click(
        within(details).getByRole('button', {
          name: /open pinch runner manager moment details for sox skipper/i,
        }),
      );
      const dialog = screen.getByRole('dialog', { name: /manager moment details/i });
      expect(dialog).toHaveTextContent('Deployment');
      expect(dialog).toHaveTextContent('Pinch Runner');
      expect(dialog).toHaveTextContent('Linked Events');
      expect(dialog).toHaveTextContent('ab-10, ab-11');
      expect(dialog).toHaveTextContent('Raw WPA');
      expect(dialog).toHaveTextContent('+40.0 pp');
      expect(dialog).toHaveTextContent('Share');
      expect(dialog).toHaveTextContent('20%');
      expect(dialog).toHaveTextContent('Cap');
      expect(dialog).toHaveTextContent('+/-0.125');
      expect(dialog).toHaveTextContent('Final Manager Value');
      expect(dialog).toHaveTextContent('+8.0 pp');
    });

    test('keeps tactical managerDecisions out of the deployment-only manager total', async () => {
      const { getCompletedGameById } = await import('../../utils/gameStorage');
      vi.mocked(getCompletedGameById).mockResolvedValue({
        ...mockGameData,
        managerDecisions: [
          createManagerDecision({
            managerWpa: 9.999,
            rawWindowWpa: 9.999,
            displayTitle: 'Pinch hitter',
          }),
        ],
      });

      render(<PostGameSummary />);

      expect(await screen.findByText('+30.0 pp KBL WPA')).toBeInTheDocument();
      expect(screen.getByTestId('manager-wpa-total-sox')).toHaveTextContent('+0.0 pp');
    });

    test('does not derive manager overlay rows from event-log data when completed game has no committed managerDecisions', async () => {
      const { getCompletedGameById } = await import('../../utils/gameStorage');
      vi.mocked(getCompletedGameById).mockResolvedValue({
        ...mockGameData,
        managerDecisions: [],
      });

      render(<PostGameSummary />);

      const overlay = await screen.findByTestId('manager-wpa-overlay');
      expect(screen.getByTestId('manager-wpa-total-sox')).toHaveTextContent('+0.0 pp');
      expect(within(overlay).getAllByText('0')).toHaveLength(2);
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
    test('renders canonical Overall POG award with points', async () => {
      render(<PostGameSummary />);
      expect(await screen.findByText('Overall POG')).toBeInTheDocument();
      expect(screen.getByText('3 pts')).toBeInTheDocument();
    });

    test('renders canonical secondary award labels with points', async () => {
      render(<PostGameSummary />);
      expect(await screen.findByText('Best Hitter')).toBeInTheDocument();
      expect(screen.getByText('1 pt')).toBeInTheDocument();
    });

    test('renders canonical Overall POG player name and WPA value', async () => {
      render(<PostGameSummary />);
      const overallLabel = await screen.findByText('Overall POG');
      const card = overallLabel.closest('div[class*="border-2"]');
      expect(card).toBeTruthy();
      const withinCard = within(card!);
      expect(withinCard.getByText('J Martinez')).toBeInTheDocument();
      expect(withinCard.getByText('+30.0 pp KBL WPA')).toBeInTheDocument();
    });

    test('renders secondary award player name', async () => {
      render(<PostGameSummary />);
      const hitterLabel = await screen.findByText('Best Hitter');
      const card = hitterLabel.closest('div[class*="border-2"]');
      expect(card).toBeTruthy();
      expect(within(card!).getByText('R Johnson')).toBeInTheDocument();
    });

    test('renders Team Standouts as display-only recognition', async () => {
      render(<PostGameSummary />);

      expect(await screen.findByText('TEAM STANDOUTS')).toBeInTheDocument();
      const standoutLabels = await screen.findAllByText('Team Standout');
      expect(standoutLabels).toHaveLength(2);

      const johnsonCard = standoutLabels
        .map((label) => label.closest('div[class*="border-2"]'))
        .find((card) => card && within(card as HTMLElement).queryByText('R Johnson'));
      expect(johnsonCard).toBeTruthy();
      expect(within(johnsonCard as HTMLElement).getByText('Display only')).toBeInTheDocument();
      expect(within(johnsonCard as HTMLElement).getByText(/Recognition only/)).toBeInTheDocument();
    });

    test('renders POG stats for top performer', async () => {
      render(<PostGameSummary />);
      const pogLabel = await screen.findByText('Overall POG');
      const card = pogLabel.closest('div[class*="border-2"]');
      expect(card).toBeTruthy();
      const withinCard = within(card!);
      expect(withinCard.getByText('4 AB')).toBeInTheDocument();
      expect(withinCard.getByText('1 BB')).toBeInTheDocument();
      expect(withinCard.getByText('0 SO')).toBeInTheDocument();
      expect(withinCard.getByText('2 R')).toBeInTheDocument();
    });

    test('stored-only fallback renders a legacy Overall POG without role awards', async () => {
      const { getCompletedGameById } = await import('../../utils/gameStorage');
      vi.mocked(getCompletedGameById).mockResolvedValue({
        ...mockGameData,
        playersOfTheGame: {
          first: 'away-r-johnson',
          second: 'home-t-williams',
        },
      });
      mockGetGameEvents.mockResolvedValue([]);
      mockDeriveKblWpaCredits.mockReturnValue([]);

      render(<PostGameSummary />);

      const overallLabel = await screen.findByText('Overall POG');
      const card = overallLabel.closest('div[class*="border-2"]');
      expect(card).toBeTruthy();
      expect(within(card!).getByText('R Johnson')).toBeInTheDocument();
      expect(within(card!).getByText('Stored legacy POG')).toBeInTheDocument();
      expect(screen.queryByText('Best Hitter')).not.toBeInTheDocument();
    });

    test('stored POG ids do not override KBL WPA-derived Overall POG', async () => {
      const { getCompletedGameById } = await import('../../utils/gameStorage');
      vi.mocked(getCompletedGameById).mockResolvedValue({
        ...mockGameData,
        playersOfTheGame: {
          first: 'away-r-johnson',
          second: 'home-t-williams',
        },
      });

      render(<PostGameSummary />);

      const overallLabel = await screen.findByText('Overall POG');
      const card = overallLabel.closest('div[class*="border-2"]');
      expect(card).toBeTruthy();
      expect(within(card!).getByText('J Martinez')).toBeInTheDocument();
      expect(within(card!).queryByText('R Johnson')).not.toBeInTheDocument();
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

    test('expanded box score shows batting HR column', async () => {
      render(<PostGameSummary />);
      await screen.findByText('BOX SCORE');
      fireEvent.click(screen.getByText('BOX SCORE'));
      expect(screen.getAllByText('HR').length).toBeGreaterThan(0);
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

  describe('One-inning recap', () => {
    test('renders the one-inning fixture winner, stadium, and 1.0 IP pitching line', async () => {
      const { getCompletedGameById } = await import('../../utils/gameStorage');
      vi.mocked(getCompletedGameById).mockResolvedValueOnce(oneInningGame);

      render(<PostGameSummary gameId={oneInningGame.gameId} />);

      expect(await screen.findByText('Swagger Center')).toBeInTheDocument();
      expect(screen.getByText('★ MOONSTARS WIN! ★')).toBeInTheDocument();

      const boxScoreToggle = await screen.findByText('BOX SCORE');
      fireEvent.click(boxScoreToggle);

      const pitcherLabel = await screen.findByText('Moonstars Ace');
      const pitcherRow = pitcherLabel.closest('div[class*="grid-cols-8"]');
      expect(pitcherRow).toBeTruthy();
      expect(
        Array.from((pitcherRow as HTMLElement).children).map((cell) =>
          cell.textContent?.trim(),
        ),
      ).toEqual(['Moonstars Ace', '1.0', '0', '0', '0', '1', '3']);
    });
  });

  describe('Badge-driven activity log coverage', () => {
    test('renders concrete exhibition fame entries for short game archives', async () => {
      const { getCompletedGameById } = await import('../../utils/gameStorage');
      vi.mocked(getCompletedGameById).mockResolvedValueOnce(oneInningGame);
      mockLocationState.gameMode = 'exhibition';
      delete mockLocationState.franchiseId;

      render(<PostGameSummary gameId={oneInningGame.gameId} />);

      const awayColumn = await screen.findByTestId('fame-leaderboard-column-moonstars');
      expect(within(awayColumn).getByText('B. Louis')).toBeInTheDocument();
      expect(within(awayColumn).getByText('1 events')).toBeInTheDocument();
      expect(within(awayColumn).getByText('Run total +2.0')).toBeInTheDocument();
      expect(within(awayColumn).getByText('+2.0')).toBeInTheDocument();

      fireEvent.click(within(awayColumn).getByRole('button', { name: 'Show Events' }));

      expect(within(awayColumn).getByText('HR')).toBeInTheDocument();
      expect(within(awayColumn).getByText('Moonstars HR')).toBeInTheDocument();
    });

    test('renders the fixture-specific empty fame state for the opponent', async () => {
      const { getCompletedGameById } = await import('../../utils/gameStorage');
      vi.mocked(getCompletedGameById).mockResolvedValueOnce(oneInningGame);
      mockLocationState.gameMode = 'exhibition';
      delete mockLocationState.franchiseId;

      render(<PostGameSummary gameId={oneInningGame.gameId} />);

      const homeColumn = await screen.findByTestId('fame-leaderboard-column-heaters');
      expect(within(homeColumn).getByText('HEATERS')).toBeInTheDocument();
      expect(
        within(homeColumn).getByText('No Fame events recorded for Heaters.'),
      ).toBeInTheDocument();
    });
  });
});
