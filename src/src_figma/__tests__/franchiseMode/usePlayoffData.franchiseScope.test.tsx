import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  mockInitPlayoffDatabase: vi.fn(),
  mockGetPlayoffBySeason: vi.fn(),
  mockGetPlayoffByFranchiseSeason: vi.fn(),
  mockGetCurrentPlayoff: vi.fn(),
  mockCreatePlayoff: vi.fn(),
  mockUpdatePlayoff: vi.fn(),
  mockStartPlayoff: vi.fn(),
  mockCompletePlayoff: vi.fn(),
  mockGetSeriesByPlayoff: vi.fn(),
  mockGetSeriesByRound: vi.fn(),
  mockUpdateSeries: vi.fn(),
  mockRecordSeriesGame: vi.fn(),
  mockGenerateBracket: vi.fn(),
  mockGetPlayoffLeaders: vi.fn(),
  mockDeletePlayoffBySeason: vi.fn(),
  mockCalculateStandings: vi.fn(),
  mockQualifyTeams: vi.fn(),
  mockGetAllLeagueTemplates: vi.fn(),
  mockGetAllTeams: vi.fn(),
  mockGetAllFranchiseTeams: vi.fn(),
  mockGetFranchiseConfig: vi.fn(),
  mockGetAllGamesByFranchise: vi.fn(),
}));

vi.mock('../../../utils/playoffStorage', () => ({
  initPlayoffDatabase: mocks.mockInitPlayoffDatabase,
  getPlayoffBySeason: mocks.mockGetPlayoffBySeason,
  getPlayoffByFranchiseSeason: mocks.mockGetPlayoffByFranchiseSeason,
  getCurrentPlayoff: mocks.mockGetCurrentPlayoff,
  createPlayoff: mocks.mockCreatePlayoff,
  updatePlayoff: mocks.mockUpdatePlayoff,
  startPlayoff: mocks.mockStartPlayoff,
  completePlayoff: mocks.mockCompletePlayoff,
  getSeriesByPlayoff: mocks.mockGetSeriesByPlayoff,
  getSeriesByRound: mocks.mockGetSeriesByRound,
  updateSeries: mocks.mockUpdateSeries,
  recordSeriesGame: mocks.mockRecordSeriesGame,
  generateBracket: mocks.mockGenerateBracket,
  getPlayoffLeaders: mocks.mockGetPlayoffLeaders,
  getRoundName: (round: number) => `Round ${round}`,
  deletePlayoffBySeason: mocks.mockDeletePlayoffBySeason,
}));

vi.mock('../../../utils/seasonStorage', () => ({
  calculateStandings: mocks.mockCalculateStandings,
}));

vi.mock('../../../engines/playoffEngine', () => ({
  qualifyTeams: mocks.mockQualifyTeams,
}));

vi.mock('../../../utils/leagueBuilderStorage', () => ({
  getAllLeagueTemplates: mocks.mockGetAllLeagueTemplates,
  getAllTeams: mocks.mockGetAllTeams,
}));

vi.mock('../../../utils/franchisePlayerStorage', () => ({
  getAllFranchiseTeams: mocks.mockGetAllFranchiseTeams,
}));

vi.mock('../../../utils/franchiseManager', () => ({
  getFranchiseConfig: mocks.mockGetFranchiseConfig,
}));

vi.mock('../../../utils/scheduleStorage', () => ({
  getAllGamesByFranchise: mocks.mockGetAllGamesByFranchise,
}));

import { usePlayoffData } from '../../hooks/usePlayoffData';
import type { FranchisePlayoffSeedingReview } from '../../../utils/franchisePlayoffSeedingReview';

function mockStandings() {
  return [
    { teamId: 'team-a', teamName: 'Global Alpha', wins: 91, losses: 71, runDiff: 75 },
    { teamId: 'team-b', teamName: 'Global Bravo', wins: 88, losses: 74, runDiff: 52 },
    { teamId: 'team-c', teamName: 'Global Charlie', wins: 86, losses: 76, runDiff: 24 },
    { teamId: 'team-d', teamName: 'Global Delta', wins: 84, losses: 78, runDiff: 12 },
  ];
}

function mockFranchiseTeams() {
  return [
    { id: 'team-a', name: 'Franchise Alpha', conference: 'Eastern' },
    { id: 'team-b', name: 'Franchise Bravo', conference: 'Eastern' },
    { id: 'team-c', name: 'Franchise Charlie', conference: 'Western' },
    { id: 'team-d', name: 'Franchise Delta', conference: 'Western' },
  ];
}

function mockFranchiseConfig(overrides: Record<string, unknown> = {}) {
  return {
    playoffSetupSnapshot: {
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
    rulesSnapshot: {
      inningsPerGame: 7,
      useDH: false,
    },
    seasonLength: {
      inningsPerGame: 7,
    },
    season: {
      inningsPerGame: 9,
      useDH: true,
    },
    ...overrides,
  };
}

function mockCompleteScheduleRows() {
  return [
    {
      id: 'schedule-game-1',
      franchiseId: 'franchise-1',
      seasonId: 'franchise-1-season-3',
      statsScopeId: 'franchise-1-season-3',
      seasonNumber: 3,
      gameNumber: 1,
      dayNumber: 1,
      awayTeamId: 'team-a',
      homeTeamId: 'team-b',
      status: 'COMPLETED',
      completionSource: 'score-only',
      result: { awayScore: 5, homeScore: 3, winningTeamId: 'team-a', losingTeamId: 'team-b' },
      createdAt: 1000,
      completedAt: 1100,
    },
    {
      id: 'schedule-game-2',
      franchiseId: 'franchise-1',
      seasonId: 'franchise-1-season-3',
      statsScopeId: 'franchise-1-season-3',
      seasonNumber: 3,
      gameNumber: 2,
      dayNumber: 2,
      awayTeamId: 'team-c',
      homeTeamId: 'team-d',
      status: 'COMPLETED',
      completionSource: 'game-tracker',
      gameLogId: 'archive-game-2',
      result: { awayScore: 2, homeScore: 4, winningTeamId: 'team-d', losingTeamId: 'team-c' },
      createdAt: 1200,
      completedAt: 1300,
    },
  ];
}

async function prepareConfirmedReview(
  result: { current: ReturnType<typeof usePlayoffData> },
  overrides: {
    seasonNumber?: number;
    seasonId?: string;
    franchiseId?: string;
    teamsQualifying?: number;
  } = {},
): Promise<FranchisePlayoffSeedingReview> {
  let review: FranchisePlayoffSeedingReview | undefined;
  await act(async () => {
    review = await result.current.preparePlayoffSeedingReview({
      seasonNumber: overrides.seasonNumber ?? 3,
      seasonId: overrides.seasonId ?? 'franchise-1-season-3',
      franchiseId: overrides.franchiseId ?? 'franchise-1',
      teamsQualifying: overrides.teamsQualifying ?? 4,
    });
  });
  return review!;
}

async function createConfirmedPlayoff(
  result: { current: ReturnType<typeof usePlayoffData> },
  overrides: {
    seasonNumber?: number;
    seasonId?: string;
    franchiseId?: string;
    teamsQualifying?: number;
    gamesPerRound?: number[];
  } = {},
): Promise<FranchisePlayoffSeedingReview> {
  const review = await prepareConfirmedReview(result, overrides);
  await act(async () => {
    await result.current.createNewPlayoff({
      seasonNumber: overrides.seasonNumber ?? 3,
      seasonId: overrides.seasonId ?? 'franchise-1-season-3',
      franchiseId: overrides.franchiseId ?? 'franchise-1',
      teamsQualifying: overrides.teamsQualifying ?? 4,
      gamesPerRound: overrides.gamesPerRound ?? [3, 5],
      confirmedSeedingReview: review,
    });
  });
  return review;
}

describe('usePlayoffData franchise-scoped playoff seeding', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.mockInitPlayoffDatabase.mockResolvedValue(undefined);
    mocks.mockGetPlayoffByFranchiseSeason.mockResolvedValue(null);
    mocks.mockGetPlayoffBySeason.mockResolvedValue(null);
    mocks.mockGetCurrentPlayoff.mockResolvedValue(null);
    mocks.mockGetSeriesByPlayoff.mockResolvedValue([]);
    mocks.mockCreatePlayoff.mockImplementation(async (config) => ({
      ...config,
      id: 'playoff-created',
      createdAt: '2026-05-21T00:00:00.000Z',
      updatedAt: '2026-05-21T00:00:00.000Z',
    }));
    mocks.mockGenerateBracket.mockResolvedValue(undefined);
    mocks.mockDeletePlayoffBySeason.mockResolvedValue(undefined);
    mocks.mockCalculateStandings.mockResolvedValue(mockStandings());
    mocks.mockGetAllGamesByFranchise.mockResolvedValue(mockCompleteScheduleRows());
    mocks.mockGetAllFranchiseTeams.mockResolvedValue(mockFranchiseTeams());
    mocks.mockGetAllTeams.mockResolvedValue([
      { id: 'team-a', name: 'Mutable Template Alpha' },
      { id: 'team-b', name: 'Mutable Template Bravo' },
      { id: 'team-c', name: 'Mutable Template Charlie' },
      { id: 'team-d', name: 'Mutable Template Delta' },
    ]);
    mocks.mockGetAllLeagueTemplates.mockResolvedValue([
      { id: 'league-global', conferences: [], divisions: [] },
    ]);
    mocks.mockGetFranchiseConfig.mockResolvedValue(mockFranchiseConfig());
  });

  test('does not call League Builder globals for franchise playoff creation without preseeded teams', async () => {
    const { result } = renderHook(() => usePlayoffData(3, { franchiseId: 'franchise-1' }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await createConfirmedPlayoff(result);

    expect(mocks.mockGetAllFranchiseTeams).toHaveBeenCalledWith('franchise-1');
    expect(mocks.mockGetFranchiseConfig).toHaveBeenCalledWith('franchise-1');
    expect(mocks.mockGetAllTeams).not.toHaveBeenCalled();
    expect(mocks.mockGetAllLeagueTemplates).not.toHaveBeenCalled();
  });

  test('uses franchise-owned team snapshots for playoff team names and leagues', async () => {
    const { result } = renderHook(() => usePlayoffData(3, { franchiseId: 'franchise-1' }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const review = await createConfirmedPlayoff(result);

    expect(mocks.mockCreatePlayoff).toHaveBeenCalledWith(expect.objectContaining({
      franchiseId: 'franchise-1',
      seasonId: 'franchise-1-season-3',
      sourceType: 'franchise',
      teamsQualifying: 4,
      gamesPerRound: [7, 7],
      inningsPerGame: 7,
      useDH: false,
      teams: [
        expect.objectContaining({ teamId: 'team-a', teamName: 'Franchise Alpha', league: 'Eastern' }),
        expect.objectContaining({ teamId: 'team-b', teamName: 'Franchise Bravo', league: 'Eastern' }),
        expect.objectContaining({ teamId: 'team-c', teamName: 'Franchise Charlie', league: 'Western' }),
        expect.objectContaining({ teamId: 'team-d', teamName: 'Franchise Delta', league: 'Western' }),
      ],
      seedingConfirmation: expect.objectContaining({
        source: 'season-end-review',
        tiebreakerPolicy: 'record-then-run-differential',
        teamsQualifying: 4,
        teams: expect.arrayContaining([
          expect.objectContaining({ teamId: 'team-a', seed: 1, qualifying: true }),
        ]),
      }),
    }));
    expect(review.eliminatedTeams).toEqual([]);
  });

  test('derives a single championship round for a stored two-team franchise playoff setup', async () => {
    mocks.mockGetFranchiseConfig.mockResolvedValue(mockFranchiseConfig({
      playoffSetupSnapshot: {
        teamsQualifying: 2,
        format: 'conference',
        seriesLengths: {
          wildCard: 'best-of-3',
          divisionSeries: 'best-of-5',
          championship: 'best-of-7',
          worldSeries: 'best-of-9',
        },
        homeFieldAdvantage: 'higher-seed',
      },
    }));

    const { result } = renderHook(() => usePlayoffData(3, { franchiseId: 'franchise-1' }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await createConfirmedPlayoff(result);

    expect(mocks.mockCreatePlayoff).toHaveBeenCalledWith(expect.objectContaining({
      teamsQualifying: 2,
      rounds: 1,
      gamesPerRound: [9],
      teams: [
        expect.objectContaining({ teamId: 'team-a', seed: 1 }),
        expect.objectContaining({ teamId: 'team-b', seed: 2 }),
      ],
    }));
  });

  test('fails safely when franchise team snapshots are missing instead of falling back to globals', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    mocks.mockGetAllFranchiseTeams.mockResolvedValue([]);

    const { result } = renderHook(() => usePlayoffData(3, { franchiseId: 'franchise-1' }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await expect(act(async () => {
      await result.current.preparePlayoffSeedingReview({
        seasonNumber: 3,
        seasonId: 'franchise-1-season-3',
        franchiseId: 'franchise-1',
        teamsQualifying: 4,
      });
    })).rejects.toThrow('Cannot review playoff seeding without franchise-owned team snapshots.');

    expect(mocks.mockGetAllTeams).not.toHaveBeenCalled();
    expect(mocks.mockGetAllLeagueTemplates).not.toHaveBeenCalled();
    expect(mocks.mockCreatePlayoff).not.toHaveBeenCalled();
    expect(mocks.mockGenerateBracket).not.toHaveBeenCalled();

    warnSpy.mockRestore();
  });

  test('blocks seeding review until the franchise regular-season schedule is complete', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    mocks.mockGetAllGamesByFranchise.mockResolvedValue([
      ...mockCompleteScheduleRows(),
      {
        id: 'schedule-game-3',
        franchiseId: 'franchise-1',
        seasonId: 'franchise-1-season-3',
        statsScopeId: 'franchise-1-season-3',
        seasonNumber: 3,
        gameNumber: 3,
        dayNumber: 3,
        awayTeamId: 'team-a',
        homeTeamId: 'team-c',
        status: 'SCHEDULED',
        createdAt: 1400,
      },
    ]);

    const { result } = renderHook(() => usePlayoffData(3, { franchiseId: 'franchise-1' }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await expect(act(async () => {
      await result.current.preparePlayoffSeedingReview({
        seasonNumber: 3,
        seasonId: 'franchise-1-season-3',
        franchiseId: 'franchise-1',
        teamsQualifying: 4,
      });
    })).rejects.toThrow('Cannot review playoff seeding until all regular-season schedule rows are completed (1 incomplete).');

    expect(mocks.mockCreatePlayoff).not.toHaveBeenCalled();
    expect(mocks.mockGenerateBracket).not.toHaveBeenCalled();

    warnSpy.mockRestore();
  });

  test('allows seeding review when score-only and GameTracker schedule rows are completed', async () => {
    const { result } = renderHook(() => usePlayoffData(3, { franchiseId: 'franchise-1' }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const review = await prepareConfirmedReview(result);

    expect(mocks.mockGetAllGamesByFranchise).toHaveBeenCalledWith('franchise-1', 3);
    expect(review.blockers).toEqual([]);
    expect(review.qualifiedTeams).toHaveLength(4);
  });

  test('uses run differential to seed teams with identical records', async () => {
    mocks.mockCalculateStandings.mockResolvedValue([
      { teamId: 'team-a', teamName: 'Global Alpha', wins: 90, losses: 72, runDiff: 10 },
      { teamId: 'team-b', teamName: 'Global Bravo', wins: 90, losses: 72, runDiff: 45 },
      { teamId: 'team-c', teamName: 'Global Charlie', wins: 88, losses: 74, runDiff: 24 },
      { teamId: 'team-d', teamName: 'Global Delta', wins: 84, losses: 78, runDiff: 12 },
    ]);

    const { result } = renderHook(() => usePlayoffData(3, { franchiseId: 'franchise-1' }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const review = await createConfirmedPlayoff(result);

    const createdConfig = mocks.mockCreatePlayoff.mock.calls[0][0];
    expect(createdConfig.teams.map((team: { teamId: string; seed: number }) => [team.teamId, team.seed])).toEqual([
      ['team-b', 1],
      ['team-a', 2],
      ['team-c', 3],
      ['team-d', 4],
    ]);
    expect(review.tieGroups).toEqual([
      expect.objectContaining({
        wins: 90,
        losses: 72,
        teamIds: ['team-b', 'team-a'],
        resolvedByRunDifferential: true,
        unresolved: false,
      }),
    ]);
  });

  test('blocks playoff creation when record and run differential cannot resolve a seeding tie', async () => {
    mocks.mockCalculateStandings.mockResolvedValue([
      { teamId: 'team-a', teamName: 'Global Alpha', wins: 90, losses: 72, runDiff: 45 },
      { teamId: 'team-b', teamName: 'Global Bravo', wins: 90, losses: 72, runDiff: 45 },
      { teamId: 'team-c', teamName: 'Global Charlie', wins: 88, losses: 74, runDiff: 24 },
      { teamId: 'team-d', teamName: 'Global Delta', wins: 84, losses: 78, runDiff: 12 },
    ]);

    const { result } = renderHook(() => usePlayoffData(3, { franchiseId: 'franchise-1' }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await expect(act(async () => {
      await result.current.preparePlayoffSeedingReview({
        seasonNumber: 3,
        seasonId: 'franchise-1-season-3',
        franchiseId: 'franchise-1',
        teamsQualifying: 4,
      });
    })).rejects.toThrow(/Manual playoff seeding resolution required/);

    expect(mocks.mockCreatePlayoff).not.toHaveBeenCalled();
    expect(mocks.mockGenerateBracket).not.toHaveBeenCalled();
  });

  test('blocks franchise bracket creation until seeding review is confirmed', async () => {
    const { result } = renderHook(() => usePlayoffData(3, { franchiseId: 'franchise-1' }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await expect(act(async () => {
      await result.current.createNewPlayoff({
        seasonNumber: 3,
        seasonId: 'franchise-1-season-3',
        franchiseId: 'franchise-1',
        teamsQualifying: 4,
        gamesPerRound: [3, 5],
      });
    })).rejects.toThrow('Confirm playoff seeding before creating the bracket.');

    expect(mocks.mockCreatePlayoff).not.toHaveBeenCalled();
    expect(mocks.mockGenerateBracket).not.toHaveBeenCalled();
  });

  test('revalidates schedule completion before creating bracket from a stale confirmed review', async () => {
    const { result } = renderHook(() => usePlayoffData(3, { franchiseId: 'franchise-1' }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const review = await prepareConfirmedReview(result);
    mocks.mockGetAllGamesByFranchise.mockResolvedValue([
      ...mockCompleteScheduleRows(),
      {
        id: 'schedule-game-3',
        franchiseId: 'franchise-1',
        seasonId: 'franchise-1-season-3',
        statsScopeId: 'franchise-1-season-3',
        seasonNumber: 3,
        gameNumber: 3,
        dayNumber: 3,
        awayTeamId: 'team-a',
        homeTeamId: 'team-c',
        status: 'SCHEDULED',
        createdAt: 1400,
      },
    ]);

    await expect(act(async () => {
      await result.current.createNewPlayoff({
        seasonNumber: 3,
        seasonId: 'franchise-1-season-3',
        franchiseId: 'franchise-1',
        teamsQualifying: 4,
        gamesPerRound: [3, 5],
        confirmedSeedingReview: review,
      });
    })).rejects.toThrow('Cannot review playoff seeding until all regular-season schedule rows are completed (1 incomplete).');

    expect(mocks.mockCreatePlayoff).not.toHaveBeenCalled();
    expect(mocks.mockGenerateBracket).not.toHaveBeenCalled();
  });

  test('keeps eliminated teams out of bracket teams while preserving confirmation evidence', async () => {
    mocks.mockCalculateStandings.mockResolvedValue([
      { teamId: 'team-a', teamName: 'Global Alpha', wins: 91, losses: 71, runDiff: 75 },
      { teamId: 'team-b', teamName: 'Global Bravo', wins: 88, losses: 74, runDiff: 52 },
      { teamId: 'team-c', teamName: 'Global Charlie', wins: 86, losses: 76, runDiff: 24 },
      { teamId: 'team-d', teamName: 'Global Delta', wins: 84, losses: 78, runDiff: 12 },
    ]);
    mocks.mockGetFranchiseConfig.mockResolvedValue(mockFranchiseConfig({
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
    }));

    const { result } = renderHook(() => usePlayoffData(3, { franchiseId: 'franchise-1' }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const review = await createConfirmedPlayoff(result);
    const createdConfig = mocks.mockCreatePlayoff.mock.calls[0][0];

    expect(createdConfig.teams.map((team: { teamId: string }) => team.teamId)).toEqual([
      'team-a',
      'team-b',
    ]);
    expect(createdConfig.seedingConfirmation.teams).toEqual(expect.arrayContaining([
      expect.objectContaining({ teamId: 'team-c', seed: null, qualifying: false, eliminated: true }),
      expect.objectContaining({ teamId: 'team-d', seed: null, qualifying: false, eliminated: true }),
    ]));
    expect(review.eliminatedTeams.map((team) => team.teamId)).toEqual(['team-c', 'team-d']);
  });

  test('reuses an existing confirmed franchise playoff instead of deleting and recreating it', async () => {
    const existing = {
      id: 'existing-playoff',
      seasonNumber: 3,
      seasonId: 'franchise-1-season-3',
      franchiseId: 'franchise-1',
      sourceType: 'franchise',
      status: 'IN_PROGRESS',
      teamsQualifying: 4,
      teams: [],
      currentRound: 1,
      rounds: 2,
      seedingConfirmation: {
        confirmedAt: 1000,
        confirmedBy: 'user',
        source: 'season-end-review',
        tiebreakerPolicy: 'record-then-run-differential',
        teamsQualifying: 4,
        teams: [],
        tieGroups: [],
      },
    };
    mocks.mockGetPlayoffByFranchiseSeason
      .mockResolvedValue(existing)
      .mockResolvedValueOnce(null);

    const { result } = renderHook(() => usePlayoffData(3, { franchiseId: 'franchise-1' }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let returned: unknown;
    await act(async () => {
      returned = await result.current.createNewPlayoff({
        seasonNumber: 3,
        seasonId: 'franchise-1-season-3',
        franchiseId: 'franchise-1',
        teamsQualifying: 4,
        gamesPerRound: [3, 5],
      });
    });

    expect(returned).toBe(existing);
    expect(mocks.mockGetFranchiseConfig).not.toHaveBeenCalled();
    expect(mocks.mockCalculateStandings).not.toHaveBeenCalled();
    expect(mocks.mockCreatePlayoff).not.toHaveBeenCalled();
    expect(mocks.mockDeletePlayoffBySeason).not.toHaveBeenCalled();
    expect(mocks.mockGenerateBracket).not.toHaveBeenCalled();
  });

  test('repairs an existing unconfirmed NOT_STARTED franchise playoff from confirmed seeding review', async () => {
    const existing = {
      id: 'existing-unconfirmed-playoff',
      seasonNumber: 3,
      seasonId: 'franchise-1-season-3',
      franchiseId: 'franchise-1',
      sourceType: 'franchise',
      status: 'NOT_STARTED',
      teamsQualifying: 4,
      teams: [
        { seed: 1, teamId: 'legacy-team', teamName: 'Legacy Team', league: 'Eastern' },
      ],
      currentRound: 0,
      rounds: 2,
    };
    mocks.mockGetPlayoffByFranchiseSeason
      .mockResolvedValue(existing)
      .mockResolvedValueOnce(null);

    const { result } = renderHook(() => usePlayoffData(3, { franchiseId: 'franchise-1' }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    const review = await prepareConfirmedReview(result);
    await act(async () => {
      await result.current.createNewPlayoff({
        seasonNumber: 3,
        seasonId: 'franchise-1-season-3',
        franchiseId: 'franchise-1',
        teamsQualifying: 4,
        gamesPerRound: [3, 5],
        confirmedSeedingReview: review,
      });
    });

    expect(mocks.mockCreatePlayoff).toHaveBeenCalledWith(expect.objectContaining({
      franchiseId: 'franchise-1',
      seasonId: 'franchise-1-season-3',
      teams: expect.arrayContaining([
        expect.objectContaining({ teamId: 'team-a', seed: 1 }),
      ]),
      seedingConfirmation: expect.objectContaining({
        source: 'season-end-review',
        teamsQualifying: 4,
      }),
    }));
    expect(mocks.mockGenerateBracket).toHaveBeenCalledWith('playoff-created', expect.any(Array), [7, 7]);
  });

  test('blocks recording games for already-started unconfirmed legacy franchise playoffs', async () => {
    const existing = {
      id: 'existing-unconfirmed-started-playoff',
      seasonNumber: 3,
      seasonId: 'franchise-1-season-3',
      franchiseId: 'franchise-1',
      sourceType: 'franchise',
      status: 'IN_PROGRESS',
      teamsQualifying: 4,
      teams: [],
      currentRound: 1,
      rounds: 2,
    };
    mocks.mockGetPlayoffByFranchiseSeason.mockResolvedValue(existing);

    const { result } = renderHook(() => usePlayoffData(3, { franchiseId: 'franchise-1' }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await expect(act(async () => {
      await result.current.recordGameResult('series-legacy', {
        gameNumber: 1,
        homeTeamId: 'team-a',
        awayTeamId: 'team-b',
        status: 'COMPLETED',
        result: { homeScore: 4, awayScore: 2, winnerId: 'team-a', innings: 9 },
      });
    })).rejects.toThrow('Confirm playoff seeding before recording franchise playoff games.');

    expect(mocks.mockRecordSeriesGame).not.toHaveBeenCalled();
    expect(mocks.mockUpdatePlayoff).not.toHaveBeenCalled();
  });

  test('starting playoffs persists bracket confirmation and requires confirmed seeding', async () => {
    const playoff = {
      id: 'playoff-confirmed',
      seasonNumber: 3,
      seasonId: 'franchise-1-season-3',
      franchiseId: 'franchise-1',
      sourceType: 'franchise',
      status: 'NOT_STARTED',
      teams: [
        { seed: 1, teamId: 'team-a', teamName: 'Franchise Alpha', league: 'Eastern' },
        { seed: 2, teamId: 'team-b', teamName: 'Franchise Bravo', league: 'Eastern' },
      ],
      teamsQualifying: 2,
      currentRound: 0,
      rounds: 1,
      seedingConfirmation: {
        confirmedAt: 1000,
        confirmedBy: 'user',
        source: 'season-end-review',
        tiebreakerPolicy: 'record-then-run-differential',
        teamsQualifying: 2,
        teams: [
          { teamId: 'team-a', teamName: 'Franchise Alpha', seed: 1, wins: 91, losses: 71, runDiff: 75, qualifying: true, eliminated: false, tiebreakerNote: 'Ordered by regular-season record.' },
          { teamId: 'team-b', teamName: 'Franchise Bravo', seed: 2, wins: 88, losses: 74, runDiff: 52, qualifying: true, eliminated: false, tiebreakerNote: 'Ordered by regular-season record.' },
        ],
        tieGroups: [],
      },
    };
    const firstRoundSeries = [
      {
        id: 'series-1',
        round: 1,
        higherSeed: { seed: 1, teamId: 'team-a', teamName: 'Franchise Alpha' },
        lowerSeed: { seed: 2, teamId: 'team-b', teamName: 'Franchise Bravo' },
        status: 'NOT_STARTED',
        games: [],
      },
    ];
    mocks.mockGetPlayoffByFranchiseSeason.mockResolvedValue(playoff);
    mocks.mockGetSeriesByPlayoff.mockResolvedValue(firstRoundSeries);
    mocks.mockGetSeriesByRound.mockResolvedValue(firstRoundSeries);

    const { result } = renderHook(() => usePlayoffData(3, { franchiseId: 'franchise-1' }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.startPlayoffs();
    });

    expect(mocks.mockUpdatePlayoff).toHaveBeenCalledWith('playoff-confirmed', {
      bracketConfirmation: expect.objectContaining({
        confirmedBy: 'user',
        source: 'confirmed-seeding',
        teamCount: 2,
        seriesCount: 1,
      }),
    });
    expect(mocks.mockStartPlayoff).toHaveBeenCalledWith('playoff-confirmed');
    expect(mocks.mockUpdateSeries).toHaveBeenCalledWith('series-1', { status: 'IN_PROGRESS' });
  });

  test('starting playoffs blocks when seeding confirmation is missing', async () => {
    const playoff = {
      id: 'playoff-unconfirmed',
      seasonNumber: 3,
      seasonId: 'franchise-1-season-3',
      franchiseId: 'franchise-1',
      sourceType: 'franchise',
      status: 'NOT_STARTED',
      teams: [
        { seed: 1, teamId: 'team-a', teamName: 'Franchise Alpha', league: 'Eastern' },
        { seed: 2, teamId: 'team-b', teamName: 'Franchise Bravo', league: 'Eastern' },
      ],
      teamsQualifying: 2,
      currentRound: 0,
      rounds: 1,
    };
    mocks.mockGetPlayoffByFranchiseSeason.mockResolvedValue(playoff);

    const { result } = renderHook(() => usePlayoffData(3, { franchiseId: 'franchise-1' }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await expect(act(async () => {
      await result.current.startPlayoffs();
    })).rejects.toThrow('Confirm playoff seeding and bracket before starting playoffs.');

    expect(mocks.mockUpdatePlayoff).not.toHaveBeenCalled();
    expect(mocks.mockStartPlayoff).not.toHaveBeenCalled();
  });
});
