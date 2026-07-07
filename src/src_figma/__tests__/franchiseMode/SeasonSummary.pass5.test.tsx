import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockGetFranchiseSeasonSummary: vi.fn(),
  mockUseFranchiseData: vi.fn(),
  mockUseScheduleData: vi.fn(),
  mockUsePlayoffData: vi.fn(),
  mockPreparePlayoffSeedingReview: vi.fn(),
  mockCreateNewPlayoff: vi.fn(),
  mockUseSeasonStats: vi.fn(),
  mockGetFranchiseAwardRowsByScope: vi.fn(),
  mockComputeFranchiseAwardsPreview: vi.fn(),
  mockGetAllFranchisePlayers: vi.fn(),
  mockListManagerProfiles: vi.fn(),
}));

vi.mock('react-router', () => ({
  useNavigate: () => mocks.mockNavigate,
  useParams: () => ({ franchiseId: 'franchise-1' }),
}));

vi.mock('../../../utils/franchiseSeasonSummaryStorage', () => ({
  getFranchiseSeasonSummary: mocks.mockGetFranchiseSeasonSummary,
}));

vi.mock('@/hooks/useFranchiseData', () => ({
  useFranchiseData: mocks.mockUseFranchiseData,
}));

vi.mock('@/hooks/useScheduleData', () => ({
  useScheduleData: mocks.mockUseScheduleData,
}));

vi.mock('@/hooks/usePlayoffData', () => ({
  usePlayoffData: mocks.mockUsePlayoffData,
}));

vi.mock('../../../hooks/useSeasonStats', () => ({
  useSeasonStats: mocks.mockUseSeasonStats,
}));

vi.mock('../../../utils/franchiseAwardsStorage', () => ({
  getFranchiseAwardRowsByScope: mocks.mockGetFranchiseAwardRowsByScope,
}));

vi.mock('../../../utils/franchiseAwardsEngine', () => ({
  computeFranchiseAwardsPreview: mocks.mockComputeFranchiseAwardsPreview,
}));

vi.mock('../../../utils/franchisePlayerStorage', () => ({
  getAllFranchisePlayers: mocks.mockGetAllFranchisePlayers,
}));

vi.mock('../../../utils/managerIdentityStorage', () => ({
  listManagerProfiles: mocks.mockListManagerProfiles,
}));

import { SeasonSummary } from '../../app/pages/SeasonSummary';

function makeSummary() {
  return {
    id: 'franchise-1-season-1',
    franchiseId: 'franchise-1',
    seasonNumber: 1,
    seasonId: 'franchise-1-season-1',
    statsScopeId: 'franchise-1-season-1',
    createdAt: 1,
    updatedAt: 1,
    handoff: {},
    seasonMetadata: null,
    schedule: {
      franchiseId: 'franchise-1',
      seasonNumber: 1,
      totalGames: 1,
      gameIds: ['schedule-1'],
      completedGameIds: ['schedule-1'],
      skippedGameIds: [],
      games: [],
    },
    completedGames: {
      query: { franchiseId: 'franchise-1', seasonId: 'franchise-1-season-1' },
      gameIds: ['completed-1'],
      games: [],
    },
    standings: {
      generatedAt: 1,
      teams: [
        {
          teamId: 'team-1',
          teamName: 'Snapshot Club',
          wins: 42,
          losses: 18,
          gamesBack: '-',
          winPct: 0.700,
          runsFor: 300,
          runsAgainst: 240,
          runDiff: 60,
          streak: 'W3',
          last10: '7-3',
        },
      ],
    },
    seasonStats: {
      batting: [
        {
          seasonId: 'franchise-1-season-1',
          playerId: 'snapshot-batter',
          playerName: 'Snapshot Slugger',
          teamId: 'team-1',
          games: 1,
          pa: 20,
          ab: 18,
          hits: 9,
          singles: 5,
          doubles: 2,
          triples: 0,
          homeRuns: 2,
          rbi: 8,
          runs: 7,
          walks: 2,
          strikeouts: 3,
          hitByPitch: 0,
          sacFlies: 0,
          sacBunts: 0,
          stolenBases: 1,
          caughtStealing: 0,
          gidp: 0,
          fameBonuses: 0,
          fameBoners: 0,
          fameNet: 0,
          bwar: 2.1,
          fwar: 0.4,
          rwar: 0.2,
          totalWar: 2.7,
          lastUpdated: 1,
        },
      ],
      pitching: [
        {
          seasonId: 'franchise-1-season-1',
          playerId: 'snapshot-pitcher',
          playerName: 'Snapshot Ace',
          teamId: 'team-1',
          games: 1,
          gamesStarted: 1,
          outsRecorded: 27,
          hitsAllowed: 3,
          runsAllowed: 1,
          earnedRuns: 1,
          walksAllowed: 1,
          strikeouts: 12,
          homeRunsAllowed: 0,
          hitBatters: 0,
          wildPitches: 0,
          wins: 1,
          losses: 0,
          saves: 0,
          holds: 0,
          blownSaves: 0,
          qualityStarts: 1,
          completeGames: 1,
          shutouts: 0,
          noHitters: 0,
          perfectGames: 0,
          fameBonuses: 0,
          fameBoners: 0,
          fameNet: 0,
          pwar: 1.4,
          lastUpdated: 1,
        },
      ],
      fielding: [],
    },
    playoffs: { status: 'none' },
    manifest: {
      contractVersion: 'franchise-season-summary-v2-awards-manifest-v1',
      generatedAt: 1,
      franchiseId: 'franchise-1',
      seasonId: 'franchise-1-season-1',
      statsScopeId: 'franchise-1-season-1',
      seasonNumber: 1,
      status: 'season-complete',
      readOnly: true,
      hiddenSafe: true,
      categories: [
        {
          key: 'final-standings',
          label: 'Final standings',
          status: 'trusted',
          detail: '1 team standing row(s) captured from the scoped season.',
          count: 1,
          blockers: [],
          warnings: [],
        },
        {
          key: 'awards-watchlists',
          label: 'Awards and watchlists',
          status: 'included',
          detail: '1 finalized award row(s) captured for this season scope.',
          count: 1,
          blockers: [],
          warnings: [],
        },
        {
          key: 'mode3-offseason-rollover',
          label: 'Mode 3/offseason and season rollover',
          status: 'blocked',
          detail: 'No Mode 3 execution, offseason execution, or season rollover path is enabled by this summary.',
          blockers: ['Season rollover storage and carryover policy are future work.'],
          warnings: [],
        },
      ],
      blockers: [],
      warnings: [],
      policyFlags: {
        awardsImplemented: true,
        watchlistsImplemented: true,
        finalTrueValueAllowed: false,
        valueDeltaTrusted: false,
        blockedDesignationPromotionAllowed: false,
        moraleAutomationAllowed: false,
        relationshipMutationAllowed: false,
        salaryMovementAllowed: false,
        mode3ExecutionAllowed: false,
        seasonRolloverAllowed: false,
        generatedSchedulesAllowed: false,
        aiSimulationAllowed: false,
        aiTradesAllowed: false,
      },
    },
    offseasonStateId: 'offseason-franchise-1-season-1',
    awards: {
      status: 'placeholder',
      reason: 'Awards are not finalized in Mode 2 v1 persisted season summaries.',
    },
    milestones: { status: 'placeholder', reason: 'not durable' },
    fanMorale: { status: 'placeholder', reason: 'not durable' },
    narrative: { status: 'placeholder', reason: 'not durable' },
    parkFactors: { status: 'placeholder', reason: 'not durable' },
  };
}

describe('SeasonSummary Pass 5 persisted-summary fidelity', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mockGetFranchiseSeasonSummary.mockResolvedValue(makeSummary());
    mocks.mockUseFranchiseData.mockReturnValue({
      franchiseConfig: {
        teams: { selectedTeams: ['team-1'] },
        playoffSetupSnapshot: {
          teamsQualifying: 2,
          format: 'conference',
          seriesLengths: {
            wildCard: 'best-of-3',
            divisionSeries: 'best-of-5',
            championship: 'best-of-7',
            worldSeries: 'best-of-7',
          },
          homeFieldAdvantage: 'higher-seed',
        },
        rulesSnapshot: { useDH: false, inningsPerGame: 7 },
        seasonLength: { inningsPerGame: 7 },
        season: { gamesPerTeam: 60, inningsPerGame: 9, useDH: true },
      },
      standings: {},
      leagueName: 'Snapshot League',
      isLoading: false,
      error: null,
    });
    mocks.mockUseScheduleData.mockReturnValue({
      games: [],
      completedGames: [],
      isLoading: false,
      error: null,
    });
    mocks.mockUsePlayoffData.mockReturnValue({
      hasActivePlayoff: false,
      isLoading: false,
      error: null,
      preparePlayoffSeedingReview: mocks.mockPreparePlayoffSeedingReview,
      createNewPlayoff: mocks.mockCreateNewPlayoff,
    });
    mocks.mockUseSeasonStats.mockReturnValue({
      isLoading: false,
      getBattingLeaders: vi.fn(() => [{ playerId: 'live-batter', playerName: 'Live Mutable Batter' }]),
      getPitchingLeaders: vi.fn(() => [{ playerId: 'live-pitcher', playerName: 'Live Mutable Pitcher' }]),
      getFieldingLeaders: vi.fn(() => []),
    });
    mocks.mockGetFranchiseAwardRowsByScope.mockResolvedValue([
      {
        franchiseId: 'franchise-1',
        seasonId: 'franchise-1-season-1',
        statsScopeId: 'franchise-1-season-1',
        category: 'MVP',
        winnerPlayerId: 'snapshot-batter',
        candidates: [
          { playerId: 'snapshot-batter', score: 7.25, marginToWinner: 0 },
        ],
        goldGloveSplit: null,
        voteWeight: null,
        finalized: true,
        computedAt: '2026-06-17T12:00:00.000Z',
      },
    ]);
    mocks.mockComputeFranchiseAwardsPreview.mockResolvedValue([]);
    mocks.mockGetAllFranchisePlayers.mockResolvedValue([
      { id: 'snapshot-batter', firstName: 'Snapshot', lastName: 'Slugger' },
    ]);
    mocks.mockListManagerProfiles.mockResolvedValue([]);
  });

  test('uses persisted summary snapshots/placeholders instead of live mutable leaders or awards', async () => {
    render(<SeasonSummary />);

    await screen.findByText('SEASON 1 SUMMARY');
    const liveStats = mocks.mockUseSeasonStats.mock.results[0].value;

    await waitFor(() => {
      expect(liveStats.getBattingLeaders).not.toHaveBeenCalled();
      expect(liveStats.getPitchingLeaders).not.toHaveBeenCalled();
      expect(liveStats.getFieldingLeaders).not.toHaveBeenCalled();
    });

    fireEvent.click(screen.getByRole('button', { name: /League Leaders/i }));
    expect(screen.getAllByText(/Snapshot Slugger/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Snapshot Ace/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/Live Mutable/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Awards/i }));
    await screen.findByTestId('awards-watchlist');
    expect(await screen.findByText(/Final awards from the season-end D9 awards store/i)).toBeInTheDocument();
    expect(screen.getByTestId('award-winner-MVP')).toHaveTextContent('Snapshot Slugger');
    expect(liveStats.getBattingLeaders).not.toHaveBeenCalled();
    expect(liveStats.getPitchingLeaders).not.toHaveBeenCalled();
    expect(liveStats.getFieldingLeaders).not.toHaveBeenCalled();
  });

  test('routes to confirmed playoff seeding review instead of creating a bracket from the season summary route', async () => {
    render(<SeasonSummary />);

    await screen.findByText('SEASON 1 SUMMARY');
    fireEvent.click(screen.getByRole('button', { name: /REVIEW PLAYOFF SEEDING/i }));

    expect(mocks.mockNavigate).toHaveBeenCalledWith('/franchise/franchise-1?tab=bracket');
    expect(mocks.mockPreparePlayoffSeedingReview).not.toHaveBeenCalled();
    expect(mocks.mockCreateNewPlayoff).not.toHaveBeenCalled();
  });

  test('keeps the season-complete manifest out of the player view', async () => {
    render(<SeasonSummary />);

    await screen.findByText('SEASON 1 SUMMARY');
    expect(screen.queryByRole('button', { name: /Season Complete Manifest/i })).not.toBeInTheDocument();
    expect(screen.queryByText(/Read-only awards-aware handoff package/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Mode 3|Offseason|Season Rollover/i })).not.toBeInTheDocument();
  });

  test('labels live WAR-derived awards fallback as read-only leader previews, not finalized awards', async () => {
    mocks.mockGetFranchiseSeasonSummary.mockResolvedValue(null);
    mocks.mockGetFranchiseAwardRowsByScope.mockResolvedValue([]);
    mocks.mockComputeFranchiseAwardsPreview.mockResolvedValue([]);
    mocks.mockUseSeasonStats.mockReturnValue({
      isLoading: false,
      getBattingLeaders: vi.fn((sortBy: string) => {
        if (sortBy === 'totalWAR') {
          return [{
            playerId: 'live-batter',
            playerName: 'Live Preview Batter',
            teamId: 'team-1',
            totalWAR: 3.2,
            fWAR: 0.7,
          }];
        }
        return [];
      }),
      getPitchingLeaders: vi.fn((sortBy: string) => {
        if (sortBy === 'pWAR') {
          return [{
            playerId: 'live-pitcher',
            playerName: 'Live Preview Pitcher',
            teamId: 'team-1',
            pWAR: 2.1,
          }];
        }
        return [];
      }),
      getFieldingLeaders: vi.fn(() => [{
        playerId: 'live-batter',
        playerName: 'Live Preview Batter',
        gamesByPosition: { SS: 12 },
      }]),
    });

    render(<SeasonSummary />);

    await screen.findByText('SEASON 1 SUMMARY');
    fireEvent.click(screen.getByRole('button', { name: /Awards Status/i }));

    expect(screen.getByText(/League awards finalize from the season-end awards store/i)).toBeInTheDocument();
    expect(await screen.findByText(/Projected awards are pending WAR-like season evidence/i)).toBeInTheDocument();
    expect(screen.getByText('TOP POSITION PLAYER PREVIEW')).toBeInTheDocument();
    expect(screen.getByText('TOP PITCHER PREVIEW')).toBeInTheDocument();
    expect(screen.getByText('FIELDING LEADER PREVIEW')).toBeInTheDocument();
    expect(screen.queryByText('MOST VALUABLE PLAYER')).not.toBeInTheDocument();
    expect(screen.queryByText('CY YOUNG AWARD')).not.toBeInTheDocument();
    expect(screen.queryByText('GOLD GLOVE AWARDS')).not.toBeInTheDocument();
  });
});
