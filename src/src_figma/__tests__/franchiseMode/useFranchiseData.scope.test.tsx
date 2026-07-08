import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  mockUseSeasonData: vi.fn(),
  mockUseSeasonStats: vi.fn(),
  mockCalculateStandings: vi.fn(),
  mockUseRelationshipData: vi.fn(),
  mockGetFranchiseConfig: vi.fn(),
  mockLoadFranchise: vi.fn(),
  mockGetHomeParkRival: vi.fn(),
  mockIsFranchisePhase2StadiumRecordsEnabled: vi.fn(),
  mockGetNextFranchiseGame: vi.fn(),
  mockGetAllTeams: vi.fn(),
  mockGetAllLeagueTemplates: vi.fn(),
  mockGetLeagueTemplate: vi.fn(),
  mockGetAllFranchiseTeams: vi.fn(),
}));

vi.mock('../../../hooks/useSeasonData', () => ({
  useSeasonData: mocks.mockUseSeasonData,
}));

vi.mock('../../../hooks/useSeasonStats', () => ({
  useSeasonStats: mocks.mockUseSeasonStats,
}));

vi.mock('../../../utils/seasonStorage', () => ({
  calculateStandings: mocks.mockCalculateStandings,
}));

vi.mock('../../app/hooks/useRelationshipData', () => ({
  useRelationshipData: mocks.mockUseRelationshipData,
}));

vi.mock('../../../utils/franchiseManager', () => ({
  getFranchiseConfig: mocks.mockGetFranchiseConfig,
  loadFranchise: mocks.mockLoadFranchise,
}));

vi.mock('../../../utils/franchiseHomeParkRivalStorage', () => ({
  getHomeParkRival: mocks.mockGetHomeParkRival,
}));

vi.mock('../../../utils/franchisePhase2Flags', () => ({
  isFranchisePhase2StadiumRecordsEnabled: mocks.mockIsFranchisePhase2StadiumRecordsEnabled,
}));

vi.mock('../../../utils/scheduleStorage', () => ({
  getNextFranchiseGame: mocks.mockGetNextFranchiseGame,
}));

vi.mock('../../../utils/leagueBuilderStorage', () => ({
  getAllTeams: mocks.mockGetAllTeams,
  getAllLeagueTemplates: mocks.mockGetAllLeagueTemplates,
  getLeagueTemplate: mocks.mockGetLeagueTemplate,
}));

vi.mock('../../../utils/franchisePlayerStorage', () => ({
  getAllFranchiseTeams: mocks.mockGetAllFranchiseTeams,
}));

import { useFranchiseData } from '../../hooks/useFranchiseData';

describe('useFranchiseData franchise scoped reads', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.mockUseSeasonData.mockReturnValue({
      seasonMetadata: {
        seasonNumber: 1,
        seasonName: 'Season 1',
        gamesPlayed: 0,
        totalGames: 48,
      },
      isLoading: false,
      error: null,
      refresh: vi.fn().mockResolvedValue(undefined),
    });
    mocks.mockUseSeasonStats.mockReturnValue({
      battingLeaders: [],
      pitchingLeaders: [],
      isLoading: false,
      error: null,
      refresh: vi.fn().mockResolvedValue(undefined),
      getBattingLeaders: vi.fn(() => []),
      getPitchingLeaders: vi.fn(() => []),
    });
    mocks.mockCalculateStandings.mockResolvedValue([]);
    mocks.mockUseRelationshipData.mockReturnValue({});
    mocks.mockGetFranchiseConfig.mockResolvedValue({
      franchiseId: 'franchise-1',
      league: 'league-1',
      leagueDetails: {
        name: 'Copied League',
        teams: 2,
        conferences: 2,
        divisions: 2,
      },
      season: {
        gamesPerTeam: 48,
        inningsPerGame: 9,
        extraInningsRule: 'standard',
        scheduleType: 'round-robin',
        allStarGame: false,
        tradeDeadline: false,
        mercyRule: false,
      },
      playoffs: {
        teamsQualifying: 4,
        format: 'bracket',
        seriesLengths: {
          wildCard: '1',
          divisionSeries: '3',
          championship: '3',
          worldSeries: '5',
        },
        homeFieldAdvantage: 'higher-seed',
      },
      teams: {
        selectedTeams: ['team-a', 'team-b'],
        mode: 'single',
        playerAssignments: {},
      },
      controlledTeams: [{ teamId: 'team-a', teamName: 'Copied Apples', controlledBy: 'human' }],
      roster: { mode: 'existing' },
      franchiseName: 'Franchise 1',
      createdAt: 1,
    });
    mocks.mockGetHomeParkRival.mockResolvedValue({
      id: 'rival-row',
      franchiseId: 'franchise-1',
      seasonId: 'franchise-1-season-1',
      statsScopeId: 'franchise-1-season-1',
      seasonNumber: 1,
      homeTeamId: 'team-a',
      rivalTeamId: 'team-b',
      rivalWinsAtPark: 3,
      rivalRecordsHeld: 0,
      scopeKey: 'franchise-1:franchise-1-season-1:franchise-1-season-1:1',
      updatedAt: '2026-06-26T00:00:00.000Z',
      updatedAtGameId: 'game-1',
    });
    mocks.mockIsFranchisePhase2StadiumRecordsEnabled.mockReturnValue(true);
    mocks.mockLoadFranchise.mockResolvedValue({ leagueName: 'Copied League' });
    mocks.mockGetNextFranchiseGame.mockResolvedValue(null);
    mocks.mockGetAllFranchiseTeams.mockResolvedValue([
      {
        id: 'team-a',
        name: 'Copied Apples',
        abbreviation: 'APP',
        location: 'Copy',
        nickname: 'Apples',
        colors: { primary: '#111111', secondary: '#222222' },
        stadium: 'Copied Orchard',
        leagueIds: ['league-1'],
        createdDate: '2026-01-01T00:00:00.000Z',
        lastModified: '2026-01-01T00:00:00.000Z',
      },
      {
        id: 'team-b',
        name: 'Copied Bears',
        abbreviation: 'BER',
        location: 'Copy',
        nickname: 'Bears',
        colors: { primary: '#333333', secondary: '#444444' },
        stadium: 'Copied Den',
        leagueIds: ['league-1'],
        createdDate: '2026-01-01T00:00:00.000Z',
        lastModified: '2026-01-01T00:00:00.000Z',
      },
    ]);
    mocks.mockGetAllTeams.mockResolvedValue([
      {
        id: 'team-a',
        name: 'Mutable Template Apples',
        stadium: 'Mutable Template Stadium',
      },
    ]);
    mocks.mockGetAllLeagueTemplates.mockResolvedValue([
      {
        id: 'league-1',
        name: 'Mutable Template League',
        teamIds: ['team-a'],
        conferences: [],
        divisions: [],
      },
    ]);
    mocks.mockGetLeagueTemplate.mockResolvedValue({
      id: 'league-1',
      name: 'Copied League',
      teamIds: ['team-a', 'team-b'],
      conferences: [
        { id: 'conf-north', name: 'North Circuit', abbreviation: 'NC', divisionIds: ['division-conf-north'] },
        { id: 'conf-south', name: 'South Circuit', abbreviation: 'SC', divisionIds: ['division-conf-south'] },
      ],
      divisions: [
        { id: 'division-conf-north', name: 'North Circuit', conferenceId: 'conf-north', teamIds: ['team-a'] },
        { id: 'division-conf-south', name: 'South Circuit', conferenceId: 'conf-south', teamIds: ['team-b'] },
      ],
      defaultRulesPreset: 'preset-1',
      createdDate: '2026-01-01T00:00:00.000Z',
      lastModified: '2026-01-01T00:00:00.000Z',
    });
  });

  test('uses franchise-owned team snapshots and source league conferences for visible standings', async () => {
    const { result } = renderHook(() => useFranchiseData('franchise-1', 1));

    await waitFor(() => {
      expect(result.current.stadiumMap['team-a']).toBe('Copied Orchard');
      expect(result.current.teamNameMap['team-a']).toBe('Copied Apples');
    });

    expect(result.current.leagueName).toBe('Copied League');
    expect(result.current.standings.Eastern['North Circuit'][0].team).toBe('Copied Apples');
    expect(result.current.standings.Eastern['North Circuit'][0].teamId).toBe('team-a');
    expect(result.current.standings.Western['South Circuit'][0].team).toBe('Copied Bears');
    expect(result.current.standings.Western['South Circuit'][0].teamId).toBe('team-b');
    expect(result.current.lensTeamId).toBe('team-a');
    expect(result.current.rivalTeamId).toBe('team-b');
    expect(mocks.mockGetHomeParkRival).toHaveBeenCalledWith(
      {
        franchiseId: 'franchise-1',
        seasonId: 'franchise-1-season-1',
        statsScopeId: 'franchise-1-season-1',
        seasonNumber: 1,
      },
      'team-a',
    );
    expect(mocks.mockGetAllFranchiseTeams).toHaveBeenCalledWith('franchise-1');
    expect(mocks.mockGetLeagueTemplate).toHaveBeenCalledWith('league-1');
    expect(mocks.mockGetAllTeams).not.toHaveBeenCalled();
    expect(mocks.mockGetAllLeagueTemplates).not.toHaveBeenCalled();
  });
});
