import 'fake-indexeddb/auto';
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
  mockGetFranchiseTeam: vi.fn(),
  mockSaveFranchiseTeam: vi.fn(),
  mockResolveManagerForTeam: vi.fn(),
  mockRepairFranchisePersistence: vi.fn(),
  mockUseOffseasonState: vi.fn(),
  mockCreateFranchiseSeasonSummary: vi.fn(),
  mockInitializeEmptyFranchiseSeasonSchedule: vi.fn(),
  mockClearFranchiseSeasonSchedule: vi.fn(),
  mockExecuteSeasonTransition: vi.fn(),
  mockCreateFranchisePlayerStorageAdapter: vi.fn(),
  mockUpdateFranchiseMetadata: vi.fn(),
  mockLoadFranchise: vi.fn(),
  mockDeleteSeasonMetadata: vi.fn(),
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
  useOffseasonState: mocks.mockUseOffseasonState,
}));

vi.mock('@/config/teamColors', () => ({
  getTeamColors: vi.fn().mockReturnValue({ primary: '#123456', secondary: '#abcdef' }),
}));

vi.mock('../../app/utils/franchiseGameTrackerRoster', async () => {
  const actual = await vi.importActual<typeof import('../../app/utils/franchiseGameTrackerRoster')>(
    '../../app/utils/franchiseGameTrackerRoster',
  );
  return {
    ...actual,
    buildFranchiseGameTrackerRoster: mocks.mockBuildFranchiseGameTrackerRoster,
    collectFranchiseRosterPlayerIds: mocks.mockCollectFranchiseRosterPlayerIds,
  };
});

vi.mock('../../../utils/leagueBuilderStorage', () => ({
  getTeam: mocks.mockGetTeam,
}));

vi.mock('../../../utils/franchisePlayerStorage', () => ({
  getFranchiseTeam: mocks.mockGetFranchiseTeam,
  saveFranchiseTeam: mocks.mockSaveFranchiseTeam,
  // L12-5e-1: processCompletedGame -> franchiseAllStarLockPayouts -> franchiseRaceSnubMorale imports
  // getFranchisePlayer; the partial mock must define it so the transitive module-load does not throw.
  getFranchisePlayer: vi.fn().mockResolvedValue(null),
}));

vi.mock('../../../utils/managerIdentityStorage', () => ({
  LEAGUE_BUILDER_MANAGER_INSTANCE_ID: 'league-builder',
  getManagerAssignment: vi.fn().mockResolvedValue(null),
  resolveManagerForTeam: mocks.mockResolveManagerForTeam,
}));

vi.mock('../../../utils/franchiseInitializer', () => ({
  initializeEmptyFranchiseSeasonSchedule: mocks.mockInitializeEmptyFranchiseSeasonSchedule,
  repairFranchisePersistence: mocks.mockRepairFranchisePersistence,
}));

vi.mock('../../../utils/franchiseSeasonSummaryStorage', () => ({
  createFranchiseSeasonSummary: mocks.mockCreateFranchiseSeasonSummary,
}));

vi.mock('../../../utils/franchiseManager', () => ({
  updateFranchiseMetadata: mocks.mockUpdateFranchiseMetadata,
  loadFranchise: mocks.mockLoadFranchise,
  // A1.5d-1b: the dark stadium-records tap (transitively imported via
  // processCompletedGame) reads getFranchiseConfig at module-load; stub it.
  getFranchiseConfig: vi.fn().mockResolvedValue(null),
}));

vi.mock('../../../utils/careerStorage', () => ({
  getAllCareerBatting: vi.fn().mockResolvedValue([]),
  getAllCareerPitching: vi.fn().mockResolvedValue([]),
}));

vi.mock('../../../utils/seasonStorage', () => ({
  deleteSeasonMetadata: mocks.mockDeleteSeasonMetadata,
  getActiveSeason: vi.fn().mockResolvedValue(null),
  getSeasonBattingStats: vi.fn().mockResolvedValue([]),
  getSeasonPitchingStats: vi.fn().mockResolvedValue([]),
  // L12-4d: processCompletedGame -> franchiseAllStarRosterCompute imports getSeasonMetadata; the
  // partial mock must define it so the transitive module-load does not throw (dark path; returns null).
  getSeasonMetadata: vi.fn().mockResolvedValue(null),
  markSeasonComplete: vi.fn(),
  calculateStandings: vi.fn().mockResolvedValue({}),
}));

vi.mock('../../../utils/scheduleStorage', () => ({
  clearFranchiseSeasonSchedule: mocks.mockClearFranchiseSeasonSchedule,
  getAllGames: vi.fn().mockResolvedValue([]),
  getAllGamesByFranchise: vi.fn().mockResolvedValue([]),
}));

vi.mock('../../utils/gameStorage', () => ({
  getRecentGames: vi.fn().mockResolvedValue([]),
}));

vi.mock('../../../engines/seasonTransitionEngine', () => ({
  createFranchisePlayerStorageAdapter: mocks.mockCreateFranchisePlayerStorageAdapter,
  executeSeasonTransition: mocks.mockExecuteSeasonTransition,
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

import { FranchiseHome, resolveFranchiseExtraInnings, resolveFranchiseGameUseDH } from '../../app/pages/FranchiseHome';

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
  sourceConfidence: 'user_confirmed_engine',
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

function makeFranchiseConfig(
  useDH?: boolean,
  seasonOverrides: {
    extraInningsRule?: string;
    extraInningsRunnerDelay?: 1 | 2;
    inningsPerGame?: number;
  } = {},
) {
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
      ...seasonOverrides,
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

function makeFranchiseData(
  useDH?: boolean,
  seasonOverrides: {
    extraInningsRule?: string;
    extraInningsRunnerDelay?: 1 | 2;
    inningsPerGame?: number;
  } = {},
) {
  return {
    isLoading: false,
    error: null,
    franchiseConfig: makeFranchiseConfig(useDH, seasonOverrides),
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

function makeScheduleData(completedGames = []) {
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
    completedGames,
    upcomingGames: [game],
    getTeamStats: vi.fn(),
    addGame: vi.fn(),
    addSeries: vi.fn(),
    importFranchiseRows: vi.fn(),
    updateStatus: vi.fn(),
    completeGame: vi.fn(),
    completeFranchiseScoreOnly: vi.fn(),
    deleteGame: vi.fn(),
    refresh: vi.fn(),
    clearSchedule: vi.fn(),
  };
}

function makeEmptyScheduleData() {
  return {
    games: [],
    isLoading: false,
    error: null,
    metadata: { seasonNumber: 1, totalGamesScheduled: 0, totalGamesCompleted: 0, lastUpdated: 1 },
    nextGame: null,
    completedGames: [],
    upcomingGames: [],
    getTeamStats: vi.fn(),
    addGame: vi.fn(),
    addSeries: vi.fn(),
    importFranchiseRows: vi.fn(),
    updateStatus: vi.fn(),
    completeGame: vi.fn(),
    completeFranchiseScoreOnly: vi.fn(),
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
      seasonId: 'franchise-1-season-1',
      franchiseId: 'franchise-1',
      status: 'IN_PROGRESS',
      useDH,
      teamsQualifying: 2,
      teams: [
        { seed: 1, teamId: 'higher-seed', teamName: 'Higher Seed', league: 'Eastern' },
        { seed: 4, teamId: 'lower-seed', teamName: 'Lower Seed', league: 'Eastern' },
      ],
      seedingConfirmation: {
        confirmedAt: 1234,
        confirmedBy: 'user',
        source: 'season-end-review',
        tiebreakerPolicy: 'record-then-run-differential',
        teamsQualifying: 2,
        teams: [
          { teamId: 'higher-seed', teamName: 'Higher Seed', seed: 1, wins: 10, losses: 2, runDiff: 21, qualifying: true, eliminated: false, tiebreakerNote: 'Ordered by regular-season record.' },
          { teamId: 'lower-seed', teamName: 'Lower Seed', seed: 2, wins: 9, losses: 3, runDiff: 12, qualifying: true, eliminated: false, tiebreakerNote: 'Ordered by regular-season record.' },
        ],
        tieGroups: [],
      },
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
    preparePlayoffSeedingReview: vi.fn(),
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

function makeStartedUnconfirmedPlayoffData(useDH = true) {
  const playoffData = makePlayoffData(useDH);
  playoffData.playoff = {
    ...playoffData.playoff,
    id: 'playoff-unconfirmed-started',
  };
  delete (playoffData.playoff as Record<string, unknown>).seedingConfirmation;
  return playoffData;
}

function makeNoPlayoffData() {
  return {
    playoff: null,
    series: [],
    isLoading: false,
    error: null,
    currentRoundSeries: [],
    completedSeries: [],
    inProgressSeries: [],
    pendingSeries: [],
    bracketByRound: new Map(),
    bracketByLeague: {
      Eastern: [],
      Western: [],
      Championship: null,
    },
    hasActivePlayoff: false,
    getRoundName: vi.fn((round: number) => `Round ${round}`),
    getSeriesForTeam: vi.fn(() => null),
    preparePlayoffSeedingReview: vi.fn(),
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

function makeUnconfirmedPlayoffData() {
  return {
    ...makeNoPlayoffData(),
    playoff: {
      id: 'playoff-unconfirmed',
      seasonNumber: 1,
      seasonId: 'franchise-1-season-1',
      franchiseId: 'franchise-1',
      status: 'NOT_STARTED',
      useDH: false,
      teamsQualifying: 4,
      teams: [
        { seed: 1, teamId: 'higher-seed', teamName: 'Higher Seed', league: 'Eastern' },
        { seed: 2, teamId: 'lower-seed', teamName: 'Lower Seed', league: 'Eastern' },
      ],
    },
    hasActivePlayoff: true,
  };
}

function makeSeedingReview() {
  const teams = [
    { teamId: 'higher-seed', teamName: 'Higher Seed', seed: 1, league: 'Eastern' as const, wins: 10, losses: 2, runDiff: 21, winPct: 0.833, qualifying: true, eliminated: false, tiebreakerNote: 'Ordered by regular-season record.' },
    { teamId: 'lower-seed', teamName: 'Lower Seed', seed: 2, league: 'Eastern' as const, wins: 9, losses: 3, runDiff: 12, winPct: 0.75, qualifying: true, eliminated: false, tiebreakerNote: 'Ordered by regular-season record.' },
    { teamId: 'away-team', teamName: 'Away Team', seed: 3, league: 'Western' as const, wins: 8, losses: 4, runDiff: 4, winPct: 0.667, qualifying: true, eliminated: false, tiebreakerNote: 'Ordered by regular-season record.' },
    { teamId: 'home-team', teamName: 'Home Team', seed: 4, league: 'Western' as const, wins: 7, losses: 5, runDiff: -2, winPct: 0.583, qualifying: true, eliminated: false, tiebreakerNote: 'Ordered by regular-season record.' },
  ];
  return {
    franchiseId: 'franchise-1',
    seasonId: 'franchise-1-season-1',
    statsScopeId: 'franchise-1-season-1',
    seasonNumber: 1,
    teamsQualifying: 4,
    tiebreakerPolicy: 'record-then-run-differential' as const,
    teams,
    qualifiedTeams: teams,
    eliminatedTeams: [],
    tieGroups: [],
    blockers: [],
    generatedAt: 1234,
  };
}

function makeOffseasonState(overrides: Record<string, unknown> = {}) {
  return {
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
    ...overrides,
  };
}

function makeRoster(teamId: keyof typeof snapshotsByTeam, useDH: boolean) {
  const positions = useDH
    ? ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH']
    : ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'P'];
  const players = positions.map((position, index) => ({
    playerId: position === 'P' ? `${teamId}-starter` : `${teamId}-batter-${index + 1}`,
    name: position === 'P' ? `${teamId} Starter` : `${teamId} Batter ${index + 1}`,
    battingOrder: index + 1,
    fieldingPosition: position,
    position,
    primaryPosition: position === 'DH' ? '1B' : position,
    stats: { ab: 0, h: 0, r: 0, rbi: 0, bb: 0, k: 0 },
    battingHand: index % 2 === 0 ? 'R' : 'L',
  }));

  return {
    players,
    pitchers: [
      {
        playerId: `${teamId}-starter`,
        name: `${teamId} Starter`,
        stats: { ip: '0.0', h: 0, r: 0, er: 0, bb: 0, k: 0, pitches: 0 },
        throwingHand: starterHands[teamId],
        position: 'SP',
        isStarter: true,
        isActive: true,
      },
    ],
    optimalLineups: useDH ? snapshotsByTeam[teamId].dh : snapshotsByTeam[teamId].noDh,
  };
}

function makeNoDhRosterWithStarterOverride(teamId: keyof typeof snapshotsByTeam) {
  const roster = makeRoster(teamId, false);
  const first = roster.players[0];
  const second = roster.players[1];
  roster.players = [
    { ...second, battingOrder: 1 },
    { ...first, battingOrder: 2 },
    ...roster.players.slice(2, 8),
    {
      ...roster.players[8],
      playerId: `${teamId}-starter-a`,
      name: `${teamId} Starter A`,
      battingOrder: 9,
      position: 'P',
      primaryPosition: 'P',
    },
  ];
  roster.pitchers = [
    {
      playerId: `${teamId}-starter-a`,
      name: `${teamId} Starter A`,
      stats: { ip: '0.0', h: 0, r: 0, er: 0, bb: 0, k: 0, pitches: 0 },
      throwingHand: starterHands[teamId],
      isStarter: true,
      isActive: true,
      power: 11,
      contact: 12,
    },
    {
      playerId: `${teamId}-starter-b`,
      name: `${teamId} Starter B`,
      stats: { ip: '0.0', h: 0, r: 0, er: 0, bb: 0, k: 0, pitches: 0 },
      throwingHand: teamId === 'home-team' ? 'R' : 'L',
      isStarter: false,
      isActive: false,
      power: 21,
      contact: 22,
    },
  ];
  return roster;
}

async function startRegularSeasonGame() {
  render(<FranchiseHome />);

  fireEvent.click(screen.getByRole('button', { name: 'SCORE GAME' }));
  fireEvent.click(screen.getByRole('button', { name: 'CONFIRM' }));

  await screen.findByText('PRE-GAME LINEUP');

  fireEvent.click(screen.getByRole('button', { name: 'START GAME' }));
}

describe('FranchiseHome launch optimal lineup snapshots', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
    mocks.mockUseFranchiseData.mockReturnValue(makeFranchiseData(false));
    mocks.mockUseScheduleData.mockReturnValue(makeScheduleData());
    mocks.mockUsePlayoffData.mockReturnValue(makePlayoffData());
    mocks.mockUseOffseasonState.mockReturnValue(makeOffseasonState());
    mocks.mockCollectFranchiseRosterPlayerIds.mockReturnValue([]);
    mocks.mockCreateFranchiseSeasonSummary.mockResolvedValue({ seasonId: 'franchise-1-season-1' });
    mocks.mockInitializeEmptyFranchiseSeasonSchedule.mockResolvedValue(0);
    mocks.mockCreateFranchisePlayerStorageAdapter.mockReturnValue({ storage: 'franchise' });
    mocks.mockExecuteSeasonTransition.mockResolvedValue({
      success: true,
      steps: [],
      summary: {
        playersAged: 0,
        salariesRecalculated: 0,
        mojosReset: 0,
        rookiesApplied: 0,
        serviceIncremented: 0,
        previousSeason: 1,
        newSeason: 2,
      },
    });
    mocks.mockUpdateFranchiseMetadata.mockResolvedValue(undefined);
    mocks.mockLoadFranchise.mockResolvedValue({ id: 'franchise-1', currentSeason: 1 });
    mocks.mockGetTeam.mockImplementation((teamId: string) =>
      Promise.resolve({
        id: teamId,
        abbreviation: teamId.slice(0, 3).toUpperCase(),
        colors: { primary: '#112233', secondary: '#445566' },
        managerId: `${teamId}-team-manager`,
        managerName: `${teamId} Team Manager`,
      }),
    );
    mocks.mockGetFranchiseTeam.mockImplementation((_franchiseId: string, teamId: string) =>
      Promise.resolve({
        id: teamId,
        name: `${teamId} Copied Team`,
        abbreviation: teamId.slice(0, 3).toUpperCase(),
        colors: { primary: '#aa0000', secondary: '#00aa00' },
        managerId: `${teamId}-franchise-manager`,
        managerName: `${teamId} Franchise Manager`,
      }),
    );
    mocks.mockSaveFranchiseTeam.mockResolvedValue({});
    mocks.mockClearFranchiseSeasonSchedule.mockResolvedValue(undefined);
    mocks.mockDeleteSeasonMetadata.mockResolvedValue(undefined);
    mocks.mockResolveManagerForTeam.mockImplementation(({ team }: { team: { id: string; name: string } }) =>
      Promise.resolve({
        managerId: `${team.id}-assigned-manager`,
        managerName: `${team.name} Assigned Manager`,
        profile: {
          managerId: `${team.id}-assigned-manager`,
          displayName: `${team.name} Assigned Manager`,
          createdByUser: true,
          defaultManager: false,
        },
      }),
    );
    mocks.mockRepairFranchisePersistence.mockResolvedValue({
      franchiseId: 'franchise-1',
      seasonNumber: 1,
      rosterBackfilled: false,
      seasonMetadataCreated: false,
      seasonMetadataUpdated: false,
      totalGames: 1,
    });
    mocks.mockBuildFranchiseGameTrackerRoster.mockImplementation(
      (teamId: keyof typeof snapshotsByTeam, context?: { useDH?: boolean }) =>
        Promise.resolve(makeRoster(teamId, context?.useDH ?? false)),
    );
  });

  test('regular-season launch uses no-DH snapshots selected by opposing starter hand', async () => {
    await startRegularSeasonGame();

    expect(mocks.mockUseScheduleData).toHaveBeenCalledWith(
      1,
      expect.objectContaining({ franchiseId: 'franchise-1' }),
    );
    expect(mocks.mockRepairFranchisePersistence).toHaveBeenCalledWith('franchise-1', 1);
    expect(mocks.mockBuildFranchiseGameTrackerRoster).toHaveBeenCalledWith(
      'away-team',
      expect.objectContaining({ franchiseId: 'franchise-1', leagueId: 'league-1', useDH: false }),
    );
    expect(mocks.mockBuildFranchiseGameTrackerRoster).toHaveBeenCalledWith(
      'home-team',
      expect.objectContaining({ franchiseId: 'franchise-1', leagueId: 'league-1', useDH: false }),
    );
    expect(mocks.mockGetFranchiseTeam).toHaveBeenCalledWith('franchise-1', 'away-team');
    expect(mocks.mockGetFranchiseTeam).toHaveBeenCalledWith('franchise-1', 'home-team');
    expect(mocks.mockGetTeam).not.toHaveBeenCalled();

    await waitFor(() => expect(mocks.mockNavigate).toHaveBeenCalled());
    const state = mocks.mockNavigate.mock.calls.at(-1)?.[1]?.state;

    expect(state.useDH).toBe(false);
    expect(state.scheduleGameId).toBe('game-7');
    expect(state.awayTeamColor).toBe('#aa0000');
    expect(state.awayTeamBorderColor).toBe('#00aa00');
    expect(state.homeTeamColor).toBe('#aa0000');
    expect(state.homeTeamBorderColor).toBe('#00aa00');
    expect(state).toMatchObject({
      franchiseId: 'franchise-1',
      seasonNumber: 1,
      seasonId: 'franchise-1-season-1',
      statsScopeId: 'franchise-1-season-1',
      competitionType: 'franchise',
      competitionId: 'franchise-1',
    });
    expect(state.optimalLineupSnapshots.away).toBe(snapshotsByTeam['away-team'].noDh.vsLHP);
    expect(state.optimalLineupSnapshots.home).toBe(snapshotsByTeam['home-team'].noDh.vsRHP);
  });

  test('regular-season launch passes schedule-derived team games played for rotation selection', async () => {
    mocks.mockUseScheduleData.mockReturnValue(makeScheduleData([
      {
        id: 'completed-away-1',
        seasonNumber: 1,
        gameNumber: 1,
        dayNumber: 1,
        awayTeamId: 'away-team',
        homeTeamId: 'other-team',
        status: 'COMPLETED',
      },
      {
        id: 'completed-home-1',
        seasonNumber: 1,
        gameNumber: 2,
        dayNumber: 1,
        awayTeamId: 'home-team',
        homeTeamId: 'other-team',
        status: 'COMPLETED',
      },
      {
        id: 'completed-home-2',
        seasonNumber: 1,
        gameNumber: 3,
        dayNumber: 1,
        awayTeamId: 'other-team',
        homeTeamId: 'home-team',
        status: 'COMPLETED',
      },
    ]));

    await startRegularSeasonGame();

    expect(mocks.mockBuildFranchiseGameTrackerRoster).toHaveBeenCalledWith(
      'away-team',
      expect.objectContaining({ teamGamesPlayed: 1 }),
    );
    expect(mocks.mockBuildFranchiseGameTrackerRoster).toHaveBeenCalledWith(
      'home-team',
      expect.objectContaining({ teamGamesPlayed: 2 }),
    );
  });

  test('resolveFranchiseGameUseDH reads the persisted no-DH franchise seal', () => {
    expect(resolveFranchiseGameUseDH(makeFranchiseConfig(false) as never)).toBe(false);
  });

  test('resolveFranchiseExtraInnings maps Runner on 2nd with an explicit delay', () => {
    expect(
      resolveFranchiseExtraInnings(
        makeFranchiseConfig(false, {
          extraInningsRule: 'Runner on 2nd',
          extraInningsRunnerDelay: 2,
        }) as never,
      ),
    ).toEqual({ extraInningRunner: true, extraInningRunnerDelay: 2 });
  });

  test('resolveFranchiseExtraInnings defaults missing Runner on 2nd delay for migrated franchises', () => {
    expect(
      resolveFranchiseExtraInnings(
        makeFranchiseConfig(false, {
          extraInningsRule: 'Runner on 2nd',
        }) as never,
      ),
    ).toEqual({ extraInningRunner: true, extraInningRunnerDelay: 1 });
  });

  test.sequential.each([
    { extraInningsRule: 'Standard', expected: { extraInningRunner: false, extraInningRunnerDelay: 1 } },
    { extraInningsRule: 'Sudden Death', expected: { extraInningRunner: false, extraInningRunnerDelay: 1 } },
    { extraInningsRule: 'standard', expected: { extraInningRunner: false, extraInningRunnerDelay: 1 } },
  ])('resolveFranchiseExtraInnings maps $extraInningsRule to no ghost runner', ({ extraInningsRule, expected }) => {
    expect(
      resolveFranchiseExtraInnings(
        makeFranchiseConfig(false, {
          extraInningsRule,
          extraInningsRunnerDelay: 2,
        }) as never,
      ),
    ).toEqual(expected);
  });

  test('resolveFranchiseExtraInnings maps null config to no ghost runner', () => {
    expect(resolveFranchiseExtraInnings(null)).toEqual({
      extraInningRunner: false,
      extraInningRunnerDelay: 1,
    });
  });

  test.sequential.each([
    {
      extraInningsRule: 'Standard',
      expectedRunner: false,
      expectedDelay: 1,
    },
    {
      extraInningsRule: 'Runner on 2nd',
      extraInningsRunnerDelay: 2 as const,
      expectedRunner: true,
      expectedDelay: 2,
    },
    {
      extraInningsRule: 'Sudden Death',
      extraInningsRunnerDelay: 2 as const,
      expectedRunner: false,
      expectedDelay: 1,
    },
  ])(
    'regular-season launch passes extra innings nav-state for $extraInningsRule',
    async ({ extraInningsRule, extraInningsRunnerDelay, expectedRunner, expectedDelay }) => {
      mocks.mockUseFranchiseData.mockReturnValue(
        makeFranchiseData(false, {
          extraInningsRule,
          ...(extraInningsRunnerDelay === undefined ? {} : { extraInningsRunnerDelay }),
        }),
      );

      await startRegularSeasonGame();

      await waitFor(() => {
        const state = mocks.mockNavigate.mock.calls.at(-1)?.[1]?.state;
        expect(state).toMatchObject({
          totalInnings: 9,
          extraInningRunner: expectedRunner,
          extraInningRunnerDelay: expectedDelay,
        });
      });
    },
  );

  test('playoff bracket creation is disabled until seeding review is confirmed', async () => {
    const playoffData = makeNoPlayoffData();
    const review = makeSeedingReview();
    playoffData.preparePlayoffSeedingReview.mockResolvedValue(review);
    mocks.mockUseScheduleData.mockReturnValue(makeEmptyScheduleData());
    mocks.mockUsePlayoffData.mockReturnValue(playoffData);

    render(<FranchiseHome />);

    fireEvent.click(screen.getByRole('button', { name: 'PLAYOFFS' }));
    fireEvent.click(screen.getByRole('button', { name: 'BRACKET' }));

    fireEvent.click(screen.getByRole('button', { name: 'REVIEW STANDINGS' }));
    await screen.findByText('CONFIRMED-SEEDING REVIEW');

    expect(screen.getByRole('button', { name: 'CREATE CONFIRMED BRACKET' })).toHaveAttribute('disabled');
    expect(playoffData.createNewPlayoff).not.toHaveBeenCalled();
  });

  test('confirmed playoff seeding creates bracket from confirmed review context', async () => {
    const playoffData = makeNoPlayoffData();
    const review = makeSeedingReview();
    playoffData.preparePlayoffSeedingReview.mockResolvedValue(review);
    playoffData.createNewPlayoff.mockResolvedValue({ id: 'playoff-created' });
    mocks.mockUseScheduleData.mockReturnValue(makeEmptyScheduleData());
    mocks.mockUsePlayoffData.mockReturnValue(playoffData);

    render(<FranchiseHome />);

    fireEvent.click(screen.getByRole('button', { name: 'PLAYOFFS' }));
    fireEvent.click(screen.getByRole('button', { name: 'BRACKET' }));
    fireEvent.click(screen.getByRole('button', { name: 'REVIEW STANDINGS' }));
    await screen.findByText('CONFIRMED-SEEDING REVIEW');

    fireEvent.click(screen.getByRole('button', { name: 'CONFIRM SEEDING' }));
    await screen.findByRole('button', { name: 'SEEDING CONFIRMED' });
    fireEvent.click(screen.getByRole('button', { name: 'CREATE CONFIRMED BRACKET' }));

    await waitFor(() =>
      expect(playoffData.createNewPlayoff).toHaveBeenCalledWith(expect.objectContaining({
        seasonNumber: 1,
        seasonId: 'franchise-1-season-1',
        franchiseId: 'franchise-1',
        teamsQualifying: 4,
        useDH: false,
        confirmedSeedingReview: review,
      })),
    );
    expect(playoffData.startPlayoffs).not.toHaveBeenCalled();
  });

  test('existing unconfirmed playoff shows seeding repair before bracket start', async () => {
    const playoffData = makeUnconfirmedPlayoffData();
    const review = makeSeedingReview();
    playoffData.preparePlayoffSeedingReview.mockResolvedValue(review);
    playoffData.createNewPlayoff.mockResolvedValue({ id: 'playoff-repaired' });
    mocks.mockUseScheduleData.mockReturnValue(makeEmptyScheduleData());
    mocks.mockUsePlayoffData.mockReturnValue(playoffData);

    render(<FranchiseHome />);

    fireEvent.click(screen.getByRole('button', { name: 'PLAYOFFS' }));
    fireEvent.click(screen.getByRole('button', { name: 'BRACKET' }));

    expect(screen.getByText('Playoff Seeding Needs Confirmation')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'REVIEW STANDINGS' }));
    await screen.findByText('CONFIRMED-SEEDING REVIEW');
    fireEvent.click(screen.getByRole('button', { name: 'CONFIRM SEEDING' }));
    await screen.findByRole('button', { name: 'SEEDING CONFIRMED' });
    fireEvent.click(screen.getByRole('button', { name: 'CREATE CONFIRMED BRACKET' }));

    await waitFor(() =>
      expect(playoffData.createNewPlayoff).toHaveBeenCalledWith(expect.objectContaining({
        confirmedSeedingReview: review,
      })),
    );
    expect(playoffData.startPlayoffs).not.toHaveBeenCalled();
  });

  test('already-started unconfirmed legacy playoff is blocked from GameTracker launch', () => {
    const playoffData = makeStartedUnconfirmedPlayoffData();
    mocks.mockUseScheduleData.mockReturnValue(makeEmptyScheduleData());
    mocks.mockUsePlayoffData.mockReturnValue(playoffData);

    render(<FranchiseHome />);

    fireEvent.click(screen.getByRole('button', { name: 'PLAYOFFS' }));
    fireEvent.click(screen.getByRole('button', { name: 'BRACKET' }));

    expect(screen.getByText('LEGACY PLAYOFF BLOCKED')).toBeInTheDocument();
    expect(screen.getByText(/already started without confirmed seeding/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /PLAY GAME/i })).toBeNull();
    expect(screen.getByText('PLAY BLOCKED - missing confirmed seeding')).toBeInTheDocument();
    expect(mocks.mockNavigate).not.toHaveBeenCalled();
    expect(mocks.mockBuildFranchiseGameTrackerRoster).not.toHaveBeenCalled();
  });

  test('Mode 2 v1 regular-season actions expose score and single-game skip only', () => {
    render(<FranchiseHome />);

    expect(screen.getByRole('button', { name: 'SCORE GAME' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'SKIP GAME' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'PLAY GAME' })).toBeNull();
    expect(screen.queryByRole('button', { name: /SIM/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /SKIP TODAY/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /SKIP WEEK/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /SKIP SEASON/i })).toBeNull();
    expect(screen.queryByRole('button', { name: 'TRADES' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'ALL-STAR' })).toBeNull();
  });

  test('Franchise Home handles empty manual schedule state without matchup actions', () => {
    mocks.mockUseScheduleData.mockReturnValue(makeEmptyScheduleData());

    render(<FranchiseHome />);

    expect(screen.getByText('NO GAMES SCHEDULED')).toBeInTheDocument();
    expect(screen.getByText(/Season 1 starts empty/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add Game' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'SCORE GAME' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'SKIP GAME' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'BEAT WRITERS' })).toBeNull();
  });

  test('direct offseason start is release-gated before season summary creation', () => {
    mocks.mockUseOffseasonState.mockReturnValue(makeOffseasonState({
      state: { id: 'offseason-franchise-1-season-1' },
      currentPhase: 'SPRING_TRAINING',
      currentPhaseIndex: 10,
      phaseName: 'Spring Training',
      progress: 100,
      isOffseasonComplete: true,
    }));
    mocks.mockCreateFranchiseSeasonSummary.mockRejectedValueOnce(new Error('summary unavailable'));

    render(<FranchiseHome />);
    fireEvent.click(screen.getByRole('button', { name: 'OFFSEASON' }));

    expect(screen.getByText('FRANCHISE V1 RELEASE GATE')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'START SEASON 2' })).not.toBeInTheDocument();
    expect(mocks.mockCreateFranchiseSeasonSummary).not.toHaveBeenCalled();
    expect(mocks.mockExecuteSeasonTransition).not.toHaveBeenCalled();
    expect(mocks.mockUpdateFranchiseMetadata).not.toHaveBeenCalled();
    expect(mocks.mockInitializeEmptyFranchiseSeasonSchedule).not.toHaveBeenCalled();
  });

  test('direct offseason start is release-gated before season transition execution', () => {
    mocks.mockUseOffseasonState.mockReturnValue(makeOffseasonState({
      state: { id: 'offseason-franchise-1-season-1' },
      currentPhase: 'SPRING_TRAINING',
      currentPhaseIndex: 10,
      phaseName: 'Spring Training',
      progress: 100,
      isOffseasonComplete: true,
    }));
    mocks.mockExecuteSeasonTransition.mockResolvedValueOnce({
      success: false,
      steps: [{ name: 'Increment Ages', status: 'error', error: 'age step failed' }],
      summary: {
        playersAged: 0,
        salariesRecalculated: 0,
        mojosReset: 0,
        rookiesApplied: 0,
        serviceIncremented: 0,
        previousSeason: 1,
        newSeason: 2,
      },
    });

    render(<FranchiseHome />);
    fireEvent.click(screen.getByRole('button', { name: 'OFFSEASON' }));

    expect(screen.getByText('FRANCHISE V1 RELEASE GATE')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'START SEASON 2' })).not.toBeInTheDocument();
    expect(mocks.mockCreateFranchiseSeasonSummary).not.toHaveBeenCalled();
    expect(mocks.mockExecuteSeasonTransition).not.toHaveBeenCalled();
    expect(mocks.mockUpdateFranchiseMetadata).not.toHaveBeenCalled();
    expect(mocks.mockInitializeEmptyFranchiseSeasonSchedule).not.toHaveBeenCalled();
  });

  test('direct offseason start is release-gated before new-season schedule initialization', () => {
    mocks.mockUseOffseasonState.mockReturnValue(makeOffseasonState({
      state: { id: 'offseason-franchise-1-season-1' },
      currentPhase: 'SPRING_TRAINING',
      currentPhaseIndex: 10,
      phaseName: 'Spring Training',
      progress: 100,
      isOffseasonComplete: true,
    }));
    mocks.mockInitializeEmptyFranchiseSeasonSchedule.mockRejectedValueOnce(new Error('schedule unavailable'));

    render(<FranchiseHome />);
    fireEvent.click(screen.getByRole('button', { name: 'OFFSEASON' }));

    expect(screen.getByText('FRANCHISE V1 RELEASE GATE')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'START SEASON 2' })).not.toBeInTheDocument();
    expect(mocks.mockCreateFranchiseSeasonSummary).not.toHaveBeenCalled();
    expect(mocks.mockExecuteSeasonTransition).not.toHaveBeenCalled();
    expect(mocks.mockInitializeEmptyFranchiseSeasonSchedule).not.toHaveBeenCalled();
    expect(mocks.mockUpdateFranchiseMetadata).not.toHaveBeenCalled();
    expect(mocks.mockClearFranchiseSeasonSchedule).not.toHaveBeenCalled();
    expect(mocks.mockDeleteSeasonMetadata).not.toHaveBeenCalled();
  });

  test('regular-season launch blocks when a scheduled team has no usable franchise roster', async () => {
    mocks.mockBuildFranchiseGameTrackerRoster.mockImplementation(
      (teamId: keyof typeof snapshotsByTeam, context?: { useDH?: boolean }) => {
        if (teamId === 'home-team') {
          return Promise.resolve({
            players: [],
            pitchers: [],
            optimalLineups: {},
          });
        }
        return Promise.resolve(makeRoster(teamId, context?.useDH ?? false));
      },
    );

    render(<FranchiseHome />);

    fireEvent.click(screen.getByRole('button', { name: 'SCORE GAME' }));
    fireEvent.click(screen.getByRole('button', { name: 'CONFIRM' }));

    await screen.findByText(
      'Franchise roster data is incomplete for HOME TEAM. Game launch blocked.',
    );

    expect(mocks.mockRepairFranchisePersistence).toHaveBeenCalledWith('franchise-1', 1);
    expect(screen.queryByText('PRE-GAME LINEUP')).toBeNull();
    expect(mocks.mockNavigate).not.toHaveBeenCalled();
  });

  test('regular-season launch surfaces roster build failures instead of leaving confirmation stuck', async () => {
    mocks.mockBuildFranchiseGameTrackerRoster.mockRejectedValueOnce(
      new Error('franchise roster adapter failed'),
    );

    render(<FranchiseHome />);

    fireEvent.click(screen.getByRole('button', { name: 'SCORE GAME' }));
    fireEvent.click(screen.getByRole('button', { name: 'CONFIRM' }));

    await screen.findByText(/GameTracker launch blocked: franchise roster adapter failed/i);

    expect(screen.queryByText('ARE YOU SURE?')).toBeNull();
    expect(screen.queryByText('PRE-GAME LINEUP')).toBeNull();
    expect(mocks.mockNavigate).not.toHaveBeenCalled();
  });

  test('regular-season pregame warns but allows start when a benchmark is missing or stale', async () => {
    mocks.mockBuildFranchiseGameTrackerRoster.mockImplementation(
      (teamId: keyof typeof snapshotsByTeam, context?: { useDH?: boolean }) => {
        const roster = makeRoster(teamId, context?.useDH ?? false);
        if (teamId === 'away-team') {
          return Promise.resolve({
            ...roster,
            optimalLineups: {
              ...roster.optimalLineups,
              vsLHP: undefined,
            },
          });
        }
        if (teamId === 'home-team') {
          return Promise.resolve({
            ...roster,
            optimalLineups: {
              ...roster.optimalLineups,
              vsRHP: {
                ...roster.optimalLineups.vsRHP,
                sourceConfidence: 'stale_roster',
              },
            },
          });
        }
        return Promise.resolve(roster);
      },
    );

    render(<FranchiseHome />);

    fireEvent.click(screen.getByRole('button', { name: 'SCORE GAME' }));
    fireEvent.click(screen.getByRole('button', { name: 'CONFIRM' }));

    await screen.findByText('PRE-GAME LINEUP');

    expect(screen.getByText('LINEUP DELTA BENCHMARKS')).toBeTruthy();
    expect(screen.getByText(/AWAY TEAM vs LHP \(no DH\): not set/)).toBeTruthy();
    expect(screen.getByText(/HOME TEAM vs RHP \(no DH\): needs confirmation\/recalculation/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'START GAME' })).not.toHaveAttribute('disabled');

    fireEvent.click(screen.getByRole('button', { name: 'START GAME' }));

    await waitFor(() => expect(mocks.mockNavigate).toHaveBeenCalled());
    const state = mocks.mockNavigate.mock.calls.at(-1)?.[1]?.state;
    expect(state.optimalLineupSnapshots.away).toBeUndefined();
    expect(state.optimalLineupSnapshots.home).toMatchObject({
      sourceConfidence: 'stale_roster',
    });
  });

  test('regular-season pregame blocks benchmark registration when current lineups are incomplete', async () => {
    mocks.mockBuildFranchiseGameTrackerRoster.mockImplementation(
      (teamId: keyof typeof snapshotsByTeam, context?: { useDH?: boolean }) =>
        Promise.resolve({
          ...makeRoster(teamId, context?.useDH ?? false),
          players: makeRoster(teamId, context?.useDH ?? false).players.slice(0, 1),
          optimalLineups: {},
        }),
    );

    render(<FranchiseHome />);

    fireEvent.click(screen.getByRole('button', { name: 'SCORE GAME' }));
    fireEvent.click(screen.getByRole('button', { name: 'CONFIRM' }));

    await screen.findByText('PRE-GAME LINEUP');

    expect(screen.getByTestId('franchise-pregame-readiness')).toHaveTextContent(
      'LINEUP READINESS REQUIRED',
    );
    expect(screen.getByText(/AWAY TEAM: needs 9 batting-order players for GameTracker start; found 1\./)).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'REGISTER CURRENT LINEUPS' })).toBeNull();
    expect(screen.getByRole('button', { name: 'START GAME' })).toHaveAttribute('disabled');
    expect(mocks.mockNavigate).not.toHaveBeenCalled();
  });

  test('regular-season pregame blocks launch with official benchmarks when current lineups are incomplete', async () => {
    mocks.mockBuildFranchiseGameTrackerRoster.mockImplementation(
      (teamId: keyof typeof snapshotsByTeam, context?: { useDH?: boolean }) =>
        Promise.resolve({
          ...makeRoster(teamId, context?.useDH ?? false),
          players: makeRoster(teamId, context?.useDH ?? false).players.slice(0, 1),
        }),
    );

    render(<FranchiseHome />);

    fireEvent.click(screen.getByRole('button', { name: 'SCORE GAME' }));
    fireEvent.click(screen.getByRole('button', { name: 'CONFIRM' }));

    await screen.findByText('PRE-GAME LINEUP');

    const startButton = screen.getByRole('button', { name: 'START GAME' });
    expect(startButton).toHaveAttribute('disabled');
    fireEvent.click(startButton);

    expect(screen.getByText(/HOME TEAM: needs 8 non-pitcher lineup slots for no-DH benchmark; found 1\./)).toBeTruthy();
    expect(mocks.mockNavigate).not.toHaveBeenCalled();
  });

  test('regular-season pregame can register current lineups as required benchmarks', async () => {
    mocks.mockBuildFranchiseGameTrackerRoster.mockImplementation(
      (teamId: keyof typeof snapshotsByTeam, context?: { useDH?: boolean }) =>
        Promise.resolve({
          ...makeRoster(teamId, context?.useDH ?? false),
          optimalLineups: {},
        }),
    );

    render(<FranchiseHome />);

    fireEvent.click(screen.getByRole('button', { name: 'SCORE GAME' }));
    fireEvent.click(screen.getByRole('button', { name: 'CONFIRM' }));

    await screen.findByText('PRE-GAME LINEUP');
    fireEvent.click(screen.getByRole('button', { name: 'REGISTER CURRENT LINEUPS' }));

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'START GAME' })).not.toHaveAttribute('disabled'),
    );
    fireEvent.click(screen.getByRole('button', { name: 'START GAME' }));

    await waitFor(() => expect(mocks.mockNavigate).toHaveBeenCalled());
    const state = mocks.mockNavigate.mock.calls.at(-1)?.[1]?.state;

    expect(state.optimalLineupSnapshots.away).toMatchObject({
      sourceConfidence: 'user_registered',
      opposingPitcherHand: 'L',
    });
    expect(state.optimalLineupSnapshots.home).toMatchObject({
      sourceConfidence: 'user_registered',
      opposingPitcherHand: 'R',
    });
  });

  test('regular-season launch passes assigned Franchise manager IDs', async () => {
    await startRegularSeasonGame();

    await waitFor(() => expect(mocks.mockNavigate).toHaveBeenCalled());
    const state = mocks.mockNavigate.mock.calls.at(-1)?.[1]?.state;

    expect(mocks.mockResolveManagerForTeam).toHaveBeenCalledWith(
      expect.objectContaining({
        team: expect.objectContaining({
          id: 'away-team',
          managerId: 'away-team-franchise-manager',
          managerName: 'away-team Franchise Manager',
        }),
        mode: 'franchise',
        instanceId: 'franchise-1',
        fallbackMode: 'franchise',
        fallbackInstanceId: 'league-builder',
        persistAssignment: true,
      }),
    );
    expect(mocks.mockResolveManagerForTeam).toHaveBeenCalledWith(
      expect.objectContaining({
        team: expect.objectContaining({
          id: 'home-team',
          managerId: 'home-team-franchise-manager',
          managerName: 'home-team Franchise Manager',
        }),
        mode: 'franchise',
        instanceId: 'franchise-1',
        fallbackMode: 'franchise',
        fallbackInstanceId: 'league-builder',
        persistAssignment: true,
      }),
    );
    expect(state).toMatchObject({
      awayManagerId: 'away-team-assigned-manager',
      awayManagerName: 'AWAY TEAM Assigned Manager',
      homeManagerId: 'home-team-assigned-manager',
      homeManagerName: 'HOME TEAM Assigned Manager',
    });
    expect(state.awayManagerId).not.toBe('away-team-manager');
    expect(state.homeManagerId).not.toBe('home-team-manager');
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

  test('regular-season no-DH launch uses Team Hub lineup order and reconciles game-only starter override', async () => {
    mocks.mockUseFranchiseData.mockReturnValue(makeFranchiseData(false));
    mocks.mockBuildFranchiseGameTrackerRoster.mockImplementation(
      (teamId: keyof typeof snapshotsByTeam) => Promise.resolve(makeNoDhRosterWithStarterOverride(teamId)),
    );

    render(<FranchiseHome />);

    fireEvent.click(screen.getByRole('button', { name: 'SCORE GAME' }));
    fireEvent.click(screen.getByRole('button', { name: 'CONFIRM' }));

    await screen.findByText('PRE-GAME LINEUP');
    expect(screen.getByText(/Lineup order and rotation source from Team Hub/i)).toBeInTheDocument();

    fireEvent.change(screen.getByRole('combobox', { name: /Home starter override/i }), {
      target: { value: '1' },
    });

    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'START GAME' })).not.toHaveAttribute('disabled'),
    );
    fireEvent.click(screen.getByRole('button', { name: 'START GAME' }));

    await waitFor(() => expect(mocks.mockNavigate).toHaveBeenCalled());
    const state = mocks.mockNavigate.mock.calls.at(-1)?.[1]?.state;

    expect(state.awayPlayers.slice(0, 2).map((player: { playerId: string }) => player.playerId)).toEqual([
      'away-team-batter-2',
      'away-team-batter-1',
    ]);
    expect(state.homePlayers.slice(0, 2).map((player: { playerId: string }) => player.playerId)).toEqual([
      'home-team-batter-2',
      'home-team-batter-1',
    ]);
    expect(state.homePitchers).toEqual([
      expect.objectContaining({ playerId: 'home-team-starter-a', isStarter: false, isActive: false }),
      expect.objectContaining({ playerId: 'home-team-starter-b', isStarter: true, isActive: true }),
    ]);
    expect(state.homePlayers[0]).toMatchObject({ playerId: 'home-team-batter-2', battingOrder: 1 });
    expect(state.homePlayers[8]).toMatchObject({
      playerId: 'home-team-starter-b',
      position: 'P',
      battingOrder: 9,
      power: 21,
      contact: 22,
    });
    expect(state.homePlayers.find((player: { playerId: string }) => player.playerId === 'home-team-starter-a')).toBeUndefined();
    expect(mocks.mockSaveFranchiseTeam).not.toHaveBeenCalled();
    expect(state.optimalLineupSnapshots.away).toBe(snapshotsByTeam['away-team'].noDh.vsRHP);
    expect(state.optimalLineupSnapshots.home).toBe(snapshotsByTeam['home-team'].noDh.vsRHP);
  });

  test('playoff launch uses no-DH snapshots selected by opposing starter hand', async () => {
    mocks.mockUseFranchiseData.mockReturnValue(makeFranchiseData(false));
    mocks.mockUsePlayoffData.mockReturnValue(makePlayoffData(false));

    render(<FranchiseHome />);

    fireEvent.click(screen.getByRole('button', { name: 'PLAYOFFS' }));
    fireEvent.click(screen.getByRole('button', { name: 'BRACKET' }));
    fireEvent.click(screen.getByRole('button', { name: /PLAY GAME 1/ }));

    await waitFor(() => expect(mocks.mockNavigate).toHaveBeenCalled());

    expect(mocks.mockBuildFranchiseGameTrackerRoster).toHaveBeenCalledWith(
      'lower-seed',
      expect.objectContaining({ franchiseId: 'franchise-1', leagueId: 'league-1', useDH: false }),
    );
    expect(mocks.mockBuildFranchiseGameTrackerRoster).toHaveBeenCalledWith(
      'higher-seed',
      expect.objectContaining({ franchiseId: 'franchise-1', leagueId: 'league-1', useDH: false }),
    );
    expect(mocks.mockGetFranchiseTeam).toHaveBeenCalledWith('franchise-1', 'lower-seed');
    expect(mocks.mockGetFranchiseTeam).toHaveBeenCalledWith('franchise-1', 'higher-seed');
    expect(mocks.mockGetTeam).not.toHaveBeenCalled();

    const state = mocks.mockNavigate.mock.calls.at(-1)?.[1]?.state;

    expect(state.useDH).toBe(false);
    expect(state.awayTeamName).toBe('LOWER-SEED COPIED TEAM');
    expect(state.homeTeamName).toBe('HIGHER-SEED COPIED TEAM');
    expect(state.awayTeamColor).toBe('#aa0000');
    expect(state.homeTeamColor).toBe('#aa0000');
    expect(state.stadiumName).toBe('Higher Park');
    expect(state).toMatchObject({
      franchiseId: 'franchise-1',
      seasonNumber: 1,
      seasonId: 'franchise-1-season-1',
      statsScopeId: 'franchise-1-season-1',
      competitionType: 'playoff',
      competitionId: 'playoff-1',
      playoffId: 'playoff-1',
      playoffSeriesId: 'series-1',
      playoffGameNumber: 1,
    });
    expect(state.optimalLineupSnapshots.away).toBe(snapshotsByTeam['lower-seed'].noDh.vsLHP);
    expect(state.optimalLineupSnapshots.home).toBe(snapshotsByTeam['higher-seed'].noDh.vsRHP);
    expect(state).toMatchObject({
      awayManagerId: 'lower-seed-assigned-manager',
      homeManagerId: 'higher-seed-assigned-manager',
    });
    expect(state.awayManagerId).not.toBe('lower-seed-manager');
    expect(state.homeManagerId).not.toBe('higher-seed-manager');
  });

  test('playoff launch succeeds when Lineup Delta benchmark metadata is missing or stale', async () => {
    mocks.mockUseFranchiseData.mockReturnValue(makeFranchiseData(false));
    mocks.mockUsePlayoffData.mockReturnValue(makePlayoffData(false));
    mocks.mockBuildFranchiseGameTrackerRoster.mockImplementation(
      (teamId: keyof typeof snapshotsByTeam, context?: { useDH?: boolean }) => {
        const roster = makeRoster(teamId, context?.useDH ?? false);
        if (teamId === 'lower-seed') {
          return Promise.resolve({
            ...roster,
            optimalLineups: {
              ...roster.optimalLineups,
              vsLHP: undefined,
            },
          });
        }
        if (teamId === 'higher-seed') {
          return Promise.resolve({
            ...roster,
            optimalLineups: {
              ...roster.optimalLineups,
              vsRHP: {
                ...roster.optimalLineups.vsRHP,
                sourceConfidence: 'stale_roster',
              },
            },
          });
        }
        return Promise.resolve(roster);
      },
    );

    render(<FranchiseHome />);

    fireEvent.click(screen.getByRole('button', { name: 'PLAYOFFS' }));
    fireEvent.click(screen.getByRole('button', { name: 'BRACKET' }));
    fireEvent.click(screen.getByRole('button', { name: /PLAY GAME 1/ }));

    await waitFor(() => expect(mocks.mockNavigate).toHaveBeenCalled());
    const state = mocks.mockNavigate.mock.calls.at(-1)?.[1]?.state;

    expect(state).toMatchObject({
      franchiseId: 'franchise-1',
      seasonNumber: 1,
      seasonId: 'franchise-1-season-1',
      statsScopeId: 'franchise-1-season-1',
      competitionType: 'playoff',
      playoffId: 'playoff-1',
      playoffSeriesId: 'series-1',
      playoffGameNumber: 1,
    });
    expect(state.awayPlayers).toHaveLength(9);
    expect(state.awayPitchers).toHaveLength(1);
    expect(state.homePlayers).toHaveLength(9);
    expect(state.homePitchers).toHaveLength(1);
    expect(state.optimalLineupSnapshots.away).toBeUndefined();
    expect(state.optimalLineupSnapshots.home).toMatchObject({
      sourceConfidence: 'stale_roster',
    });
  });

  test('playoff launch blocks when away roster readiness is incomplete', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    mocks.mockUseFranchiseData.mockReturnValue(makeFranchiseData(false));
    mocks.mockUsePlayoffData.mockReturnValue(makePlayoffData(false));
    mocks.mockBuildFranchiseGameTrackerRoster.mockImplementation(
      (teamId: keyof typeof snapshotsByTeam, context?: { useDH?: boolean }) => {
        const roster = makeRoster(teamId, context?.useDH ?? false);
        if (teamId === 'lower-seed') {
          return Promise.resolve({
            ...roster,
            players: roster.players.slice(0, 1),
          });
        }
        return Promise.resolve(roster);
      },
    );

    render(<FranchiseHome />);

    fireEvent.click(screen.getByRole('button', { name: 'PLAYOFFS' }));
    fireEvent.click(screen.getByRole('button', { name: 'BRACKET' }));
    fireEvent.click(screen.getByRole('button', { name: /PLAY GAME 1/ }));

    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining('GameTracker playoff launch blocked')),
    );
    expect(alertSpy.mock.calls[0][0]).toContain('lower-seed Copied Team: needs 9 batting-order players');
    expect(mocks.mockNavigate).not.toHaveBeenCalled();
  });

  test('playoff launch blocks when home starter readiness is incomplete', async () => {
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
    mocks.mockUseFranchiseData.mockReturnValue(makeFranchiseData(false));
    mocks.mockUsePlayoffData.mockReturnValue(makePlayoffData(false));
    mocks.mockBuildFranchiseGameTrackerRoster.mockImplementation(
      (teamId: keyof typeof snapshotsByTeam, context?: { useDH?: boolean }) => {
        const roster = makeRoster(teamId, context?.useDH ?? false);
        if (teamId === 'higher-seed') {
          return Promise.resolve({
            ...roster,
            pitchers: [],
          });
        }
        return Promise.resolve(roster);
      },
    );

    render(<FranchiseHome />);

    fireEvent.click(screen.getByRole('button', { name: 'PLAYOFFS' }));
    fireEvent.click(screen.getByRole('button', { name: 'BRACKET' }));
    fireEvent.click(screen.getByRole('button', { name: /PLAY GAME 1/ }));

    await waitFor(() =>
      expect(alertSpy).toHaveBeenCalledWith(expect.stringContaining('GameTracker playoff launch blocked')),
    );
    expect(alertSpy.mock.calls[0][0]).toContain('higher-seed Copied Team: select a starting pitcher');
    expect(mocks.mockNavigate).not.toHaveBeenCalled();
  });
});
