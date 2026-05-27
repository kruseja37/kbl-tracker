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
      teams: [
        expect.objectContaining({ teamId: 'team-a', teamName: 'Franchise Alpha', league: 'Eastern' }),
        expect.objectContaining({ teamId: 'team-b', teamName: 'Franchise Bravo', league: 'Eastern' }),
        expect.objectContaining({ teamId: 'team-c', teamName: 'Franchise Charlie', league: 'Western' }),
        expect.objectContaining({ teamId: 'team-d', teamName: 'Franchise Delta', league: 'Western' }),
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
});
