import { beforeEach, describe, expect, test, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createFranchise: vi.fn(),
  deleteFranchise: vi.fn(),
  saveFranchiseConfig: vi.fn(),
  getFranchiseConfig: vi.fn(),
  updateFranchiseMetadata: vi.fn(),
  setActiveFranchise: vi.fn(),
  getLeagueTemplate: vi.fn(),
  getTeam: vi.fn(),
  getAuctionSession: vi.fn(),
  getAuctionSessionById: vi.fn(),
  createFarmAuctionSessionId: vi.fn(),
  getPlayer: vi.fn(),
  getAllGamesByFranchise: vi.fn(),
  initScheduleDatabase: vi.fn(),
  deepCopyLeagueToFranchise: vi.fn(),
  deleteFranchiseDatabase: vi.fn(),
  getFranchisePlayer: vi.fn(),
  getAllFranchisePlayers: vi.fn(),
  getAllFranchiseTeams: vi.fn(),
  saveFranchisePlayer: vi.fn(),
  saveFranchiseTeam: vi.fn(),
  deleteSeasonMetadata: vi.fn(),
  getOrCreateSeason: vi.fn(),
  getSeasonMetadata: vi.fn(),
  saveSeasonMetadata: vi.fn(),
  carryOverFranchiseFarmRecordsToSeason: vi.fn(),
  deleteFranchiseFarmRecordsForSeason: vi.fn(),
  getFranchiseFarmRoster: vi.fn(),
}));

vi.mock('../franchiseManager', () => ({
  createFranchise: mocks.createFranchise,
  deleteFranchise: mocks.deleteFranchise,
  saveFranchiseConfig: mocks.saveFranchiseConfig,
  getFranchiseConfig: mocks.getFranchiseConfig,
  updateFranchiseMetadata: mocks.updateFranchiseMetadata,
  setActiveFranchise: mocks.setActiveFranchise,
}));

vi.mock('../leagueBuilderStorage', () => ({
  getLeagueTemplate: mocks.getLeagueTemplate,
  getTeam: mocks.getTeam,
  getAuctionSession: mocks.getAuctionSession,
  getAuctionSessionById: mocks.getAuctionSessionById,
  createFarmAuctionSessionId: mocks.createFarmAuctionSessionId,
  getPlayer: mocks.getPlayer,
}));

vi.mock('../scheduleStorage', () => ({
  getAllGamesByFranchise: mocks.getAllGamesByFranchise,
  initScheduleDatabase: mocks.initScheduleDatabase,
}));

vi.mock('../franchisePlayerStorage', () => ({
  deepCopyLeagueToFranchise: mocks.deepCopyLeagueToFranchise,
  deleteFranchiseDatabase: mocks.deleteFranchiseDatabase,
  getFranchisePlayer: mocks.getFranchisePlayer,
  getAllFranchisePlayers: mocks.getAllFranchisePlayers,
  getAllFranchiseTeams: mocks.getAllFranchiseTeams,
  saveFranchisePlayer: mocks.saveFranchisePlayer,
  saveFranchiseTeam: mocks.saveFranchiseTeam,
}));

vi.mock('../seasonStorage', () => ({
  deleteSeasonMetadata: mocks.deleteSeasonMetadata,
  getOrCreateSeason: mocks.getOrCreateSeason,
  getSeasonMetadata: mocks.getSeasonMetadata,
  saveSeasonMetadata: mocks.saveSeasonMetadata,
}));

vi.mock('../franchiseFarmStorage', () => ({
  carryOverFranchiseFarmRecordsToSeason: mocks.carryOverFranchiseFarmRecordsToSeason,
  deleteFranchiseFarmRecordsForSeason: mocks.deleteFranchiseFarmRecordsForSeason,
  getFranchiseFarmRoster: mocks.getFranchiseFarmRoster,
}));

import { initializeFranchise, repairFranchisePersistence } from '../franchiseInitializer';

function makeConfig(gamesPerTeam = 32) {
  return {
    league: 'league-1',
    franchiseName: 'Smoke Franchise',
    teams: {
      selectedTeams: ['team-a'],
      mode: 'solo',
    },
    season: {
      gamesPerTeam,
      inningsPerGame: 6,
      extraInningsRule: 'standard',
      scheduleType: 'manual',
      useDH: false,
      allStarGame: false,
      tradeDeadline: null,
      mercyRule: null,
    },
    playoffs: {
      teamsQualifying: 2,
      format: 'single-elimination',
      seriesLengths: {},
      homeFieldAdvantage: true,
    },
    roster: {},
  };
}

describe('W1-FIX franchise season metadata gamesPerTeam fuel line', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createFranchise.mockResolvedValue('franchise-1');
    mocks.getLeagueTemplate.mockResolvedValue({
      id: 'league-1',
      name: 'League One',
      teamIds: ['team-a', 'team-b'],
    });
    mocks.getTeam.mockImplementation((teamId: string) => Promise.resolve({
      id: teamId,
      name: teamId === 'team-a' ? 'Team A' : 'Team B',
    }));
    mocks.getAuctionSession.mockResolvedValue(null);
    mocks.getAuctionSessionById.mockResolvedValue(null);
    mocks.getPlayer.mockResolvedValue(null);
    mocks.createFarmAuctionSessionId.mockImplementation((leagueId: string, seasonNumber = 1) =>
      `${leagueId}::startup-farm-auction-draft::${seasonNumber}`,
    );
    mocks.deepCopyLeagueToFranchise.mockResolvedValue({
      rosterRequirements: {},
      stadiums: [],
      salaryBaseline: null,
    });
    mocks.getSeasonMetadata.mockResolvedValue(null);
    mocks.getOrCreateSeason.mockImplementation((
      seasonId: string,
      seasonNumber: number,
      seasonName: string,
      totalGames: number,
      gamesPerTeam: number | null,
    ) => Promise.resolve({
      seasonId,
      seasonNumber,
      seasonName,
      status: 'active',
      startDate: 1,
      gamesPlayed: 0,
      totalGames,
      gamesPerTeam,
    }));
    mocks.saveSeasonMetadata.mockImplementation((metadata) => Promise.resolve(metadata));
    mocks.getAllGamesByFranchise.mockResolvedValue([{}, {}, {}]);
    mocks.getFranchiseFarmRoster.mockResolvedValue([]);
    mocks.getFranchisePlayer.mockResolvedValue(null);
    mocks.getAllFranchisePlayers.mockResolvedValue([{
      id: 'player-1',
      hiddenPersonalityModifiers: {
        loyalty: 80,
        ambition: 50,
        resilience: 50,
        charisma: 80,
      },
      leagueAssignments: [{ leagueId: 'league-1', teamId: 'team-a', rosterStatus: 'MLB' }],
    }]);
    mocks.getAllFranchiseTeams.mockResolvedValue([{ id: 'team-a' }]);
    mocks.saveFranchisePlayer.mockImplementation((_franchiseId, player) => Promise.resolve({
      ...player,
      id: player.id ?? 'player-saved',
    }));
    mocks.saveFranchiseTeam.mockImplementation((_franchiseId, team) => Promise.resolve({
      ...team,
      id: team.id ?? 'team-saved',
    }));
  });

  test('initializeFranchise creates season metadata with config gamesPerTeam', async () => {
    await initializeFranchise(makeConfig(40) as never);

    expect(mocks.getOrCreateSeason).toHaveBeenCalledWith(
      'franchise-1-season-1',
      1,
      'Season 1',
      0,
      40,
      'standard',
    );
    expect(mocks.saveFranchiseTeam).toHaveBeenCalledWith(
      'franchise-1',
      expect.objectContaining({
        id: 'team-a',
        captainPlayerId: 'player-1',
      }),
    );
    expect(mocks.initScheduleDatabase.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.getAllFranchisePlayers.mock.invocationCallOrder[0],
    );
    expect(mocks.saveFranchiseTeam.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.getOrCreateSeason.mock.invocationCallOrder[0],
    );
  });

  test('repairFranchisePersistence backfills null gamesPerTeam from config without deriving from schedule count', async () => {
    mocks.getFranchiseConfig.mockResolvedValue(makeConfig(32));
    mocks.getSeasonMetadata.mockResolvedValue({
      seasonId: 'franchise-1-season-1',
      seasonNumber: 1,
      seasonName: 'Season 1',
      status: 'active',
      startDate: 1,
      gamesPlayed: 0,
      totalGames: 3,
      gamesPerTeam: null,
    });

    await repairFranchisePersistence('franchise-1', 1);

    expect(mocks.saveSeasonMetadata).toHaveBeenCalledWith(expect.objectContaining({
      seasonId: 'franchise-1-season-1',
      totalGames: 3,
      gamesPerTeam: 32,
    }));
  });

  test('repairFranchisePersistence preserves non-null gamesPerTeam snapshot even if config changes', async () => {
    mocks.getFranchiseConfig.mockResolvedValue(makeConfig(80));
    mocks.getSeasonMetadata.mockResolvedValue({
      seasonId: 'franchise-1-season-1',
      seasonNumber: 1,
      seasonName: 'Season 1',
      status: 'active',
      startDate: 1,
      gamesPlayed: 0,
      totalGames: 3,
      gamesPerTeam: 32,
    });

    await repairFranchisePersistence('franchise-1', 1);

    expect(mocks.saveSeasonMetadata).not.toHaveBeenCalled();
  });
});
