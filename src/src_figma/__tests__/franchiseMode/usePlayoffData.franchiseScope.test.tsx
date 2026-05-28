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

import { usePlayoffData } from '../../hooks/usePlayoffData';

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

    await act(async () => {
      await result.current.createNewPlayoff({
        seasonNumber: 3,
        seasonId: 'franchise-1-season-3',
        franchiseId: 'franchise-1',
        teamsQualifying: 4,
        gamesPerRound: [3, 5],
      });
    });

    expect(mocks.mockGetAllFranchiseTeams).toHaveBeenCalledWith('franchise-1');
    expect(mocks.mockGetFranchiseConfig).toHaveBeenCalledWith('franchise-1');
    expect(mocks.mockGetAllTeams).not.toHaveBeenCalled();
    expect(mocks.mockGetAllLeagueTemplates).not.toHaveBeenCalled();
  });

  test('uses franchise-owned team snapshots for playoff team names and leagues', async () => {
    const { result } = renderHook(() => usePlayoffData(3, { franchiseId: 'franchise-1' }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.createNewPlayoff({
        seasonNumber: 3,
        seasonId: 'franchise-1-season-3',
        franchiseId: 'franchise-1',
        teamsQualifying: 4,
        gamesPerRound: [3, 5],
      });
    });

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
    }));
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

    await act(async () => {
      await result.current.createNewPlayoff({
        seasonNumber: 3,
        seasonId: 'franchise-1-season-3',
        franchiseId: 'franchise-1',
        teamsQualifying: 4,
        gamesPerRound: [3, 5],
      });
    });

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
      await result.current.createNewPlayoff({
        seasonNumber: 3,
        seasonId: 'franchise-1-season-3',
        franchiseId: 'franchise-1',
        teamsQualifying: 4,
        gamesPerRound: [3, 5],
      });
    })).rejects.toThrow('Cannot create franchise playoff without franchise-owned team snapshots.');

    expect(mocks.mockGetAllTeams).not.toHaveBeenCalled();
    expect(mocks.mockGetAllLeagueTemplates).not.toHaveBeenCalled();
    expect(mocks.mockCreatePlayoff).not.toHaveBeenCalled();
    expect(mocks.mockGenerateBracket).not.toHaveBeenCalled();

    warnSpy.mockRestore();
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

    await act(async () => {
      await result.current.createNewPlayoff({
        seasonNumber: 3,
        seasonId: 'franchise-1-season-3',
        franchiseId: 'franchise-1',
        teamsQualifying: 4,
        gamesPerRound: [3, 5],
      });
    });

    const createdConfig = mocks.mockCreatePlayoff.mock.calls[0][0];
    expect(createdConfig.teams.map((team: { teamId: string; seed: number }) => [team.teamId, team.seed])).toEqual([
      ['team-b', 1],
      ['team-a', 2],
      ['team-c', 3],
      ['team-d', 4],
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
      await result.current.createNewPlayoff({
        seasonNumber: 3,
        seasonId: 'franchise-1-season-3',
        franchiseId: 'franchise-1',
        teamsQualifying: 4,
        gamesPerRound: [3, 5],
      });
    })).rejects.toThrow(/Manual playoff seeding resolution required/);

    expect(mocks.mockCreatePlayoff).not.toHaveBeenCalled();
    expect(mocks.mockGenerateBracket).not.toHaveBeenCalled();
  });

  test('reuses an existing franchise playoff instead of deleting and recreating it', async () => {
    const existing = {
      id: 'existing-playoff',
      seasonNumber: 3,
      seasonId: 'franchise-1-season-3',
      franchiseId: 'franchise-1',
      sourceType: 'franchise',
      status: 'IN_PROGRESS',
      teams: [],
      currentRound: 1,
      rounds: 2,
    };
    mocks.mockGetPlayoffByFranchiseSeason
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(existing);

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
});
