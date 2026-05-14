import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { OptimalLineupSnapshot } from '../../../types/managerWpa';

const mocks = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockUseFranchiseData: vi.fn(),
  mockUseScheduleData: vi.fn(),
  mockUsePlayoffData: vi.fn(),
  mockBuildFranchiseGameTrackerRoster: vi.fn(),
  mockCollectFranchiseRosterPlayerIds: vi.fn(),
  mockGetTeam: vi.fn(),
}));

vi.mock('react-router', () => ({
  useNavigate: () => mocks.mockNavigate,
  useParams: () => ({ franchiseId: 'franchise-1' }),
  useLocation: () => ({
    pathname: '/franchise/franchise-1',
    search: '',
    hash: '',
    state: null,
  }),
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

vi.mock('@/hooks/useOffseasonState', () => ({
  useOffseasonState: () => ({
    state: null,
    isLoading: false,
    error: null,
    currentPhase: null,
    currentPhaseIndex: 0,
    totalPhases: 11,
    phaseName: '',
    progress: 0,
    isPhaseComplete: vi.fn(() => false),
    canAdvance: false,
    isOffseasonComplete: false,
    awards: null,
    retirements: null,
    ratings: null,
    freeAgency: null,
    draft: null,
    trades: null,
    startNewOffseason: vi.fn(),
    completeCurrentPhase: vi.fn(),
    advanceToNextPhase: vi.fn(),
    saveAwards: vi.fn(),
    saveRetirementDecisions: vi.fn(),
    saveRatingChanges: vi.fn(),
    saveFreeAgentSignings: vi.fn(),
    saveDraft: vi.fn(),
    addNewTrade: vi.fn(),
    refresh: vi.fn(),
    getPhaseDisplayName: vi.fn((phase: string) => phase),
  }),
}));

vi.mock('@/config/teamColors', () => ({
  getTeamColors: vi.fn().mockReturnValue({ primary: '#123456', secondary: '#abcdef' }),
}));

vi.mock('../../app/utils/franchiseGameTrackerRoster', () => ({
  buildFranchiseGameTrackerRoster: mocks.mockBuildFranchiseGameTrackerRoster,
  collectFranchiseRosterPlayerIds: mocks.mockCollectFranchiseRosterPlayerIds,
}));

vi.mock('../../../utils/leagueBuilderStorage', () => ({
  getTeam: mocks.mockGetTeam,
}));

vi.mock('../../../utils/careerStorage', () => ({
  getAllCareerBatting: vi.fn().mockResolvedValue([]),
  getAllCareerPitching: vi.fn().mockResolvedValue([]),
}));

vi.mock('../../../utils/seasonStorage', () => ({
  getActiveSeason: vi.fn().mockResolvedValue(null),
  getSeasonBattingStats: vi.fn().mockResolvedValue([]),
  getSeasonPitchingStats: vi.fn().mockResolvedValue([]),
  markSeasonComplete: vi.fn(),
  calculateStandings: vi.fn().mockResolvedValue({}),
}));

vi.mock('../../../utils/scheduleStorage', () => ({
  getAllGames: vi.fn().mockResolvedValue([]),
}));

vi.mock('../../utils/gameStorage', () => ({
  getRecentGames: vi.fn().mockResolvedValue([]),
}));

vi.mock('../../../engines/seasonTransitionEngine', () => ({
  createFranchisePlayerStorageAdapter: vi.fn(),
  executeSeasonTransition: vi.fn(),
}));

vi.mock('../../../utils/milestoneDetector', () => ({
  SMB4_DEFAULT_GAMES: 48,
  SMB4_DEFAULT_INNINGS: 9,
  getApproachingMilestones: vi.fn(() => []),
}));

vi.mock('@/app/components/LineupPreview', () => ({
  LineupPreview: ({ teamName }: { teamName: string }) => <div data-testid="lineup-preview">{teamName}</div>,
}));

vi.mock('@/app/components/MilestoneWatchPanel', () => ({
  MilestoneWatchPanel: () => <div data-testid="milestone-watch-panel" />,
}));

vi.mock('@/app/components/SimulationOverlay', () => ({
  SimulationOverlay: () => null,
}));

vi.mock('@/app/components/BatchOperationOverlay', () => ({
  BatchOperationOverlay: () => null,
}));

vi.mock('@/app/components/TeamHubContent', () => ({
  TeamHubContent: () => <div data-testid="team-hub-content" />,
}));

vi.mock('@/app/components/MuseumContent', () => ({
  MuseumContent: () => <div data-testid="museum-content" />,
}));

vi.mock('@/app/components/FreeAgencyFlow', () => ({
  FreeAgencyFlow: () => <div data-testid="free-agency-flow" />,
}));

vi.mock('@/app/components/SeasonEndFlow', () => ({
  SeasonEndFlow: () => <div data-testid="season-end-flow" />,
}));

vi.mock('@/app/components/PlayoffSeedingFlow', () => ({
  PlayoffSeedingFlow: () => <div data-testid="playoff-seeding-flow" />,
}));

vi.mock('@/app/components/RatingsAdjustmentFlow', () => ({
  RatingsAdjustmentFlow: () => <div data-testid="ratings-adjustment-flow" />,
}));

vi.mock('@/app/components/RetirementFlow', () => ({
  RetirementFlow: () => <div data-testid="retirement-flow" />,
}));

vi.mock('@/app/components/AwardsCeremonyFlow', () => ({
  AwardsCeremonyFlow: () => <div data-testid="awards-ceremony-flow" />,
}));

vi.mock('@/app/components/ContractionExpansionFlow', () => ({
  ContractionExpansionFlow: () => <div data-testid="contraction-expansion-flow" />,
}));

vi.mock('@/app/components/DraftFlow', () => ({
  DraftFlow: () => <div data-testid="draft-flow" />,
}));

vi.mock('@/app/components/FinalizeAdvanceFlow', () => ({
  FinalizeAdvanceFlow: () => <div data-testid="finalize-advance-flow" />,
}));

vi.mock('@/app/components/TradeFlow', () => ({
  TradeFlow: () => <div data-testid="trade-flow" />,
}));

vi.mock('@/app/components/SpringTrainingFlow', () => ({
  SpringTrainingFlow: () => <div data-testid="spring-training-flow" />,
}));

vi.mock('@/app/components/AddGameModal', () => ({
  AddGameModal: () => <div data-testid="add-game-modal" />,
}));

vi.mock('@/app/components/ScheduleContent', () => ({
  ScheduleContent: () => <div data-testid="schedule-content" />,
}));

import { FranchiseHome } from '../../app/pages/FranchiseHome';

const snapshot = (
  snapshotId: string,
  teamId: string,
  opposingPitcherHand: 'R' | 'L',
  dhEnabled: boolean,
): OptimalLineupSnapshot => ({
  snapshotId,
  teamId,
  mode: 'franchise',
  opposingPitcherHand,
  algorithmVersion: 'test',
  generatedAt: 1,
  generatedFrom: 'team_hub',
  sourceConfidence: 'engine_calculated',
  dhEnabled,
  slots: [],
  projectedTeamLineupKblWpa: 0,
  confidence: 'high',
});

const snapshotsByTeam = {
  'away-team': {
    dh: {
      vsRHP: snapshot('away-dh-rhp', 'away-team', 'R', true),
      vsLHP: snapshot('away-dh-lhp', 'away-team', 'L', true),
    },
    noDh: {
      vsRHP: snapshot('away-no-dh-rhp', 'away-team', 'R', false),
      vsLHP: snapshot('away-no-dh-lhp', 'away-team', 'L', false),
    },
  },
  'home-team': {
    dh: {
      vsRHP: snapshot('home-dh-rhp', 'home-team', 'R', true),
      vsLHP: snapshot('home-dh-lhp', 'home-team', 'L', true),
    },
    noDh: {
      vsRHP: snapshot('home-no-dh-rhp', 'home-team', 'R', false),
      vsLHP: snapshot('home-no-dh-lhp', 'home-team', 'L', false),
    },
  },
  'lower-seed': {
    dh: {
      vsRHP: snapshot('lower-dh-rhp', 'lower-seed', 'R', true),
      vsLHP: snapshot('lower-dh-lhp', 'lower-seed', 'L', true),
    },
    noDh: {
      vsRHP: snapshot('lower-no-dh-rhp', 'lower-seed', 'R', false),
      vsLHP: snapshot('lower-no-dh-lhp', 'lower-seed', 'L', false),
    },
  },
  'higher-seed': {
    dh: {
      vsRHP: snapshot('higher-dh-rhp', 'higher-seed', 'R', true),
      vsLHP: snapshot('higher-dh-lhp', 'higher-seed', 'L', true),
    },
    noDh: {
      vsRHP: snapshot('higher-no-dh-rhp', 'higher-seed', 'R', false),
      vsLHP: snapshot('higher-no-dh-lhp', 'higher-seed', 'L', false),
    },
  },
} as const;

const starterHands: Record<string, 'R' | 'L'> = {
  'away-team': 'R',
  'home-team': 'L',
  'lower-seed': 'R',
  'higher-seed': 'L',
};

function makeFranchiseConfig(useDH?: boolean) {
  return {
    franchiseId: 'franchise-1',
    createdAt: 1,
    franchiseName: 'Test Franchise',
    league: 'league-1',
    leagueDetails: null,
    season: {
      gamesPerTeam: 1,
      inningsPerGame: 9,
      extraInningsRule: 'standard',
      scheduleType: 'balanced',
      ...(useDH === undefined ? {} : { useDH }),
      allStarGame: false,
      tradeDeadline: false,
      mercyRule: false,
    },
    playoffs: {
      teamsQualifying: 4,
      format: 'conference',
      seriesLengths: {
        wildCard: 'best-of-3',
        divisionSeries: 'best-of-5',
        championship: 'best-of-7',
        worldSeries: 'best-of-7',
      },
      homeFieldAdvantage: 'higher-seed',
    },
    teams: {
      selectedTeams: ['away-team', 'home-team', 'lower-seed', 'higher-seed'],
      mode: 'single',
      playerAssignments: {},
    },
    roster: {
      mode: 'existing',
    },
  };
}

function makeFranchiseData(useDH?: boolean) {
  return {
    isLoading: false,
    error: null,
    franchiseConfig: makeFranchiseConfig(useDH),
    leagueName: 'KRUSE BASEBALL',
    seasonNumber: 1,
    seasonName: 'Season 1',
    currentWeek: 1,
    gamesPlayed: 0,
    totalGames: 1,
    standings: {
      Eastern: {
        Division: [
          { team: 'away-team', wins: 0, losses: 0 },
          { team: 'home-team', wins: 0, losses: 0 },
        ],
      },
    },
    battingLeaders: { hits: [], homeRuns: [], battingAverage: [] },
    pitchingLeaders: { wins: [], era: [], strikeouts: [] },
    nextGame: null,
    hasRealData: true,
    stadiumMap: {
      'home-team': 'Home Park',
      'higher-seed': 'Higher Park',
    },
    teamNameMap: {
      'away-team': 'Away Team',
      'home-team': 'Home Team',
      'lower-seed': 'Lower Seed',
      'higher-seed': 'Higher Seed',
    },
    relationshipData: {},
    refresh: vi.fn(),
  };
}

function makeScheduleData() {
  const game = {
    id: 'game-7',
    seasonNumber: 1,
    gameNumber: 7,
    dayNumber: 1,
    awayTeamId: 'away-team',
    homeTeamId: 'home-team',
    status: 'SCHEDULED',
  };
  return {
    games: [game],
    isLoading: false,
    error: null,
    metadata: null,
    nextGame: game,
    completedGames: [],
    upcomingGames: [game],
    getTeamStats: vi.fn(),
    addGame: vi.fn(),
    addSeries: vi.fn(),
    updateStatus: vi.fn(),
    completeGame: vi.fn(),
    deleteGame: vi.fn(),
    refresh: vi.fn(),
    clearSchedule: vi.fn(),
  };
}

function makePlayoffData(useDH = true) {
  const series = {
    id: 'series-1',
    round: 1,
    roundName: 'Division Series',
    bestOf: 5,
    status: 'IN_PROGRESS',
    higherSeed: { seed: 1, teamId: 'higher-seed', teamName: 'Higher Seed' },
    lowerSeed: { seed: 4, teamId: 'lower-seed', teamName: 'Lower Seed' },
    higherSeedWins: 0,
    lowerSeedWins: 0,
    games: [],
  };
  return {
    playoff: {
      id: 'playoff-1',
      seasonNumber: 1,
      status: 'IN_PROGRESS',
      useDH,
      teams: [
        { seed: 1, teamId: 'higher-seed', teamName: 'Higher Seed', league: 'Eastern' },
        { seed: 4, teamId: 'lower-seed', teamName: 'Lower Seed', league: 'Eastern' },
      ],
    },
    series: [series],
    isLoading: false,
    error: null,
    currentRoundSeries: [series],
    completedSeries: [],
    inProgressSeries: [series],
    pendingSeries: [],
    bracketByRound: new Map([[1, [series]]]),
    bracketByLeague: {
      Eastern: [series],
      Western: [],
      Championship: null,
    },
    hasActivePlayoff: true,
    getRoundName: vi.fn(() => 'Division Series'),
    getSeriesForTeam: vi.fn(() => series),
    createNewPlayoff: vi.fn(),
    startPlayoffs: vi.fn(),
    recordGameResult: vi.fn(),
    advanceRound: vi.fn(),
    completePlayoffs: vi.fn(),
    refresh: vi.fn(),
    getBattingLeaders: vi.fn(),
    getPitchingLeaders: vi.fn(),
  };
}

function makeRoster(teamId: keyof typeof snapshotsByTeam, useDH: boolean) {
  return {
    players: [
      {
        playerId: `${teamId}-batter-1`,
        name: `${teamId} Batter`,
        battingOrder: 1,
        fieldingPosition: 'C',
        position: 'C',
      },
    ],
    pitchers: [
      {
        playerId: `${teamId}-starter`,
        name: `${teamId} Starter`,
        throwingHand: starterHands[teamId],
        position: 'SP',
        isStarter: true,
        isActive: true,
      },
    ],
    optimalLineups: useDH ? snapshotsByTeam[teamId].dh : snapshotsByTeam[teamId].noDh,
  };
}

async function startRegularSeasonGame() {
  render(<FranchiseHome />);

  fireEvent.click(screen.getByRole('button', { name: 'PLAY GAME' }));
  fireEvent.click(screen.getByRole('button', { name: 'CONFIRM' }));

  await screen.findByText('PRE-GAME LINEUP');

  fireEvent.click(screen.getByRole('button', { name: 'START GAME' }));
}

describe('FranchiseHome launch optimal lineup snapshots', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    mocks.mockUseFranchiseData.mockReturnValue(makeFranchiseData(true));
    mocks.mockUseScheduleData.mockReturnValue(makeScheduleData());
    mocks.mockUsePlayoffData.mockReturnValue(makePlayoffData());
    mocks.mockCollectFranchiseRosterPlayerIds.mockReturnValue([]);
    mocks.mockGetTeam.mockImplementation((teamId: string) =>
      Promise.resolve({
        id: teamId,
        abbreviation: teamId.slice(0, 3).toUpperCase(),
        colors: { primary: '#112233', secondary: '#445566' },
      }),
    );
    mocks.mockBuildFranchiseGameTrackerRoster.mockImplementation(
      (teamId: keyof typeof snapshotsByTeam, context?: { useDH?: boolean }) =>
        Promise.resolve(makeRoster(teamId, context?.useDH ?? false)),
    );
  });

  test('regular-season launch with DH enabled passes DH snapshots selected by opposing starter hand', async () => {
    await startRegularSeasonGame();

    expect(mocks.mockBuildFranchiseGameTrackerRoster).toHaveBeenCalledWith(
      'away-team',
      expect.objectContaining({ franchiseId: 'franchise-1', leagueId: 'league-1', useDH: true }),
    );
    expect(mocks.mockBuildFranchiseGameTrackerRoster).toHaveBeenCalledWith(
      'home-team',
      expect.objectContaining({ franchiseId: 'franchise-1', leagueId: 'league-1', useDH: true }),
    );

    await waitFor(() => expect(mocks.mockNavigate).toHaveBeenCalled());
    const state = mocks.mockNavigate.mock.calls.at(-1)?.[1]?.state;

    expect(state.useDH).toBe(true);
    expect(state.optimalLineupSnapshots.away).toBe(snapshotsByTeam['away-team'].dh.vsLHP);
    expect(state.optimalLineupSnapshots.home).toBe(snapshotsByTeam['home-team'].dh.vsRHP);
  });

  test('regular-season launch without an explicit DH setting keeps the no-DH snapshot set', async () => {
    mocks.mockUseFranchiseData.mockReturnValue(makeFranchiseData());

    await startRegularSeasonGame();

    expect(mocks.mockBuildFranchiseGameTrackerRoster).toHaveBeenCalledWith(
      'away-team',
      expect.objectContaining({ useDH: false }),
    );
    expect(mocks.mockBuildFranchiseGameTrackerRoster).toHaveBeenCalledWith(
      'home-team',
      expect.objectContaining({ useDH: false }),
    );

    await waitFor(() => expect(mocks.mockNavigate).toHaveBeenCalled());
    const state = mocks.mockNavigate.mock.calls.at(-1)?.[1]?.state;

    expect(state.useDH).toBe(false);
    expect(state.optimalLineupSnapshots.away).toBe(snapshotsByTeam['away-team'].noDh.vsLHP);
    expect(state.optimalLineupSnapshots.home).toBe(snapshotsByTeam['home-team'].noDh.vsRHP);
  });

  test('playoff launch with DH enabled passes DH snapshots selected by opposing starter hand', async () => {
    mocks.mockUseFranchiseData.mockReturnValue(makeFranchiseData(false));
    mocks.mockUsePlayoffData.mockReturnValue(makePlayoffData(true));

    render(<FranchiseHome />);

    fireEvent.click(screen.getByRole('button', { name: 'PLAYOFFS' }));
    fireEvent.click(screen.getByRole('button', { name: 'BRACKET' }));
    fireEvent.click(screen.getByRole('button', { name: /PLAY GAME 1/ }));

    await waitFor(() => expect(mocks.mockNavigate).toHaveBeenCalled());

    expect(mocks.mockBuildFranchiseGameTrackerRoster).toHaveBeenCalledWith(
      'lower-seed',
      expect.objectContaining({ franchiseId: 'franchise-1', leagueId: 'league-1', useDH: true }),
    );
    expect(mocks.mockBuildFranchiseGameTrackerRoster).toHaveBeenCalledWith(
      'higher-seed',
      expect.objectContaining({ franchiseId: 'franchise-1', leagueId: 'league-1', useDH: true }),
    );

    const state = mocks.mockNavigate.mock.calls.at(-1)?.[1]?.state;

    expect(state.useDH).toBe(true);
    expect(state.optimalLineupSnapshots.away).toBe(snapshotsByTeam['lower-seed'].dh.vsLHP);
    expect(state.optimalLineupSnapshots.home).toBe(snapshotsByTeam['higher-seed'].dh.vsRHP);
  });
});
