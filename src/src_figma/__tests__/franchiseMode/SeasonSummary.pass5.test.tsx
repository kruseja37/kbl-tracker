import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockGetFranchiseSeasonSummary: vi.fn(),
  mockUseFranchiseData: vi.fn(),
  mockUseScheduleData: vi.fn(),
  mockUsePlayoffData: vi.fn(),
  mockCreateNewPlayoff: vi.fn(),
  mockUseSeasonStats: vi.fn(),
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
      createNewPlayoff: mocks.mockCreateNewPlayoff,
    });
    mocks.mockUseSeasonStats.mockReturnValue({
      isLoading: false,
      getBattingLeaders: vi.fn(() => [{ playerId: 'live-batter', playerName: 'Live Mutable Batter' }]),
      getPitchingLeaders: vi.fn(() => [{ playerId: 'live-pitcher', playerName: 'Live Mutable Pitcher' }]),
      getFieldingLeaders: vi.fn(() => []),
    });
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
    expect(screen.getByText('Awards are not finalized in Mode 2 v1 persisted season summaries.')).toBeInTheDocument();
    expect(liveStats.getBattingLeaders).not.toHaveBeenCalled();
    expect(liveStats.getPitchingLeaders).not.toHaveBeenCalled();
    expect(liveStats.getFieldingLeaders).not.toHaveBeenCalled();
  });

  test('starts playoffs with stored no-DH franchise rules from the season summary route', async () => {
    mocks.mockCreateNewPlayoff.mockResolvedValue({ id: 'playoff-created' });

    render(<SeasonSummary />);

    await screen.findByText('SEASON 1 SUMMARY');
    fireEvent.click(screen.getByRole('button', { name: /START PLAYOFFS/i }));

    await waitFor(() =>
      expect(mocks.mockCreateNewPlayoff).toHaveBeenCalledWith(expect.objectContaining({
        franchiseId: 'franchise-1',
        seasonId: 'franchise-1-season-1',
        seasonNumber: 1,
        teamsQualifying: 2,
        inningsPerGame: 7,
        useDH: false,
      })),
    );
    expect(mocks.mockNavigate).toHaveBeenCalledWith('/franchise/franchise-1?tab=bracket');
  });
});
