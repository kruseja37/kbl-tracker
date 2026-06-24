import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { FranchiseConfig } from '../../../types/franchise';
import type { AuctionResult, AuctionSession } from '../../../engines/auctionStateMachine';
import { TRUE_VALUE_CALCULATION_VERSION } from '../../../engines/salaryCalculator';
import { TRACKER_DB_VERSION } from '../../../utils/trackerDb';

const mocks = vi.hoisted(() => ({
  createFranchise: vi.fn(),
  saveFranchiseConfig: vi.fn(),
  getFranchiseConfig: vi.fn(),
  updateFranchiseMetadata: vi.fn(),
  setActiveFranchise: vi.fn(),
  deleteFranchise: vi.fn(),
  getLeagueTemplate: vi.fn(),
  getTeam: vi.fn(),
  getAuctionSession: vi.fn(),
  getAuctionSessionById: vi.fn(),
  createFarmAuctionSessionId: vi.fn(),
  getPlayer: vi.fn(),
  savePlayer: vi.fn(),
  generateSchedule: vi.fn(),
  initScheduleDatabase: vi.fn(),
  getAllGamesByFranchise: vi.fn(),
  deepCopyLeagueToFranchise: vi.fn(),
  deleteFranchiseDatabase: vi.fn(),
  getFranchisePlayer: vi.fn(),
  getAllFranchisePlayers: vi.fn(),
  getAllFranchiseTeams: vi.fn(),
  saveFranchisePlayer: vi.fn(),
  saveFranchiseTeam: vi.fn(),
  seedFranchiseMoraleBaseline: vi.fn(),
  saveFranchiseTrueValueRows: vi.fn(),
  getOrCreateSeason: vi.fn(),
  getSeasonMetadata: vi.fn(),
  saveSeasonMetadata: vi.fn(),
  deleteSeasonMetadata: vi.fn(),
  carryOverFranchiseFarmRecordsToSeason: vi.fn(),
  deleteFranchiseFarmRecordsForSeason: vi.fn(),
  getFranchiseFarmRoster: vi.fn(),
}));

vi.mock('../../../utils/franchiseManager', () => ({
  createFranchise: mocks.createFranchise,
  saveFranchiseConfig: mocks.saveFranchiseConfig,
  getFranchiseConfig: mocks.getFranchiseConfig,
  updateFranchiseMetadata: mocks.updateFranchiseMetadata,
  setActiveFranchise: mocks.setActiveFranchise,
  deleteFranchise: mocks.deleteFranchise,
}));

vi.mock('../../../utils/leagueBuilderStorage', () => ({
  getLeagueTemplate: mocks.getLeagueTemplate,
  getTeam: mocks.getTeam,
  getAuctionSession: mocks.getAuctionSession,
  getAuctionSessionById: mocks.getAuctionSessionById,
  createFarmAuctionSessionId: mocks.createFarmAuctionSessionId,
  getPlayer: mocks.getPlayer,
  savePlayer: mocks.savePlayer,
}));

vi.mock('../../../utils/scheduleGenerator', () => ({
  generateSchedule: mocks.generateSchedule,
}));

vi.mock('../../../utils/scheduleStorage', () => ({
  getAllGamesByFranchise: mocks.getAllGamesByFranchise,
  initScheduleDatabase: mocks.initScheduleDatabase,
}));

vi.mock('../../../utils/franchisePlayerStorage', () => ({
  deepCopyLeagueToFranchise: mocks.deepCopyLeagueToFranchise,
  deleteFranchiseDatabase: mocks.deleteFranchiseDatabase,
  getFranchisePlayer: mocks.getFranchisePlayer,
  getAllFranchisePlayers: mocks.getAllFranchisePlayers,
  getAllFranchiseTeams: mocks.getAllFranchiseTeams,
  saveFranchisePlayer: mocks.saveFranchisePlayer,
  saveFranchiseTeam: mocks.saveFranchiseTeam,
}));

vi.mock('../../../utils/seasonStorage', () => ({
  deleteSeasonMetadata: mocks.deleteSeasonMetadata,
  getOrCreateSeason: mocks.getOrCreateSeason,
  getSeasonMetadata: mocks.getSeasonMetadata,
  saveSeasonMetadata: mocks.saveSeasonMetadata,
}));

vi.mock('../../../utils/franchiseFarmStorage', () => ({
  carryOverFranchiseFarmRecordsToSeason: mocks.carryOverFranchiseFarmRecordsToSeason,
  deleteFranchiseFarmRecordsForSeason: mocks.deleteFranchiseFarmRecordsForSeason,
  getFranchiseFarmRoster: mocks.getFranchiseFarmRoster,
}));

vi.mock('../../../utils/franchiseMoraleState', () => ({
  seedFranchiseMoraleBaseline: mocks.seedFranchiseMoraleBaseline,
}));

vi.mock('../../../utils/franchiseTrueValueStorage', () => ({
  saveFranchiseTrueValueRows: mocks.saveFranchiseTrueValueRows,
}));

import {
  initializeEmptyFranchiseSeasonSchedule,
  initializeFranchise,
  repairFranchisePersistence,
} from '../../../utils/franchiseInitializer';

const franchiseConfig: FranchiseConfig = {
  franchiseName: 'Wave One',
  league: 'league-1',
  leagueDetails: {
    name: 'League One',
    teams: 2,
    conferences: 1,
    divisions: 1,
  },
  season: {
    gamesPerTeam: 1,
    inningsPerGame: 9,
    extraInningsRule: 'standard',
    scheduleType: 'balanced',
    allStarGame: false,
    tradeDeadline: false,
    mercyRule: false,
  },
  playoffs: {
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
  teams: {
    selectedTeams: ['team-away'],
    mode: 'single',
    playerAssignments: {},
  },
  roster: {
    mode: 'existing',
  },
};

const copyResult = {
  rosterRequirements: {
    mlbPlayersPerTeam: 22,
    farmPlayersPerTeam: 10,
    validationStatus: 'passed' as const,
    teamCounts: {
      'team-away': { MLB: 22, FARM: 10 },
      'team-home': { MLB: 22, FARM: 10 },
    },
  },
  salaryBaseline: {
    calculationVersion: 'franchise-initial-salary-v1-ratings-and-hidden-prospect-safe',
    playerCount: 64,
    salariedPlayerCount: 64,
    totalSalary: 320,
    teamPayrolls: {
      'team-away': 160,
      'team-home': 160,
    },
  },
  stadiums: [
    {
      teamId: 'team-away',
      teamName: 'Away Club',
      stadium: 'Apple Field',
      stadiumId: 'apple-field',
      hasSeedParkFactors: true,
    },
    {
      teamId: 'team-home',
      teamName: 'Home Club',
      stadium: 'Home Park',
      stadiumId: 'home-park',
      hasSeedParkFactors: false,
    },
  ],
};

function sold(playerId: string, winnerTeamId: string, salary: number): AuctionResult {
  return {
    playerId,
    disposition: 'SOLD',
    nominatorTeamId: 'team-away',
    winnerTeamId,
    salary,
  };
}

function auctionSession(
  players: Record<string, { playerId: string; iv: number; ivPercentile: number }>,
  results: AuctionResult[],
): AuctionSession {
  return {
    state: 'AUCTION_COMPLETE',
    config: { cpuShillCount: 0 } as AuctionSession['config'],
    teams: [],
    nominationOrder: ['team-away', 'team-home'],
    nominationIndex: 0,
    nominationRound: 0,
    players,
    playerOrder: Object.keys(players),
    availablePlayerIds: [],
    currentLot: null,
    pendingClaim: null,
    results,
    saleCount: results.filter((result) => result.disposition === 'SOLD').length,
  };
}

describe('franchiseInitializer Wave 1 persistence handoff', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.createFranchise.mockResolvedValue('franchise-1');
    mocks.getFranchiseConfig.mockResolvedValue({
      ...franchiseConfig,
      franchiseId: 'franchise-1',
      createdAt: 1,
    });
    mocks.getLeagueTemplate.mockResolvedValue({
      id: 'league-1',
      name: 'League One',
      teamIds: ['team-away', 'team-home'],
    });
    mocks.getTeam.mockImplementation((teamId: string) =>
      Promise.resolve({
        id: teamId,
        name: teamId === 'team-away' ? 'Away Club' : 'Home Club',
      }),
    );
    mocks.getAuctionSession.mockResolvedValue(null);
    mocks.getAuctionSessionById.mockResolvedValue(null);
    mocks.getPlayer.mockResolvedValue(null);
    mocks.savePlayer.mockImplementation(async (player: unknown) => player);
    mocks.createFarmAuctionSessionId.mockImplementation((leagueId: string, seasonNumber = 1) =>
      `${leagueId}::startup-farm-auction-draft::${seasonNumber}`,
    );
    mocks.generateSchedule.mockReturnValue([
      {
        gameNumber: 1,
        awayTeamId: 'team-away',
        homeTeamId: 'team-home',
      },
      {
        gameNumber: 2,
        awayTeamId: 'team-home',
        homeTeamId: 'team-away',
      },
    ]);
    mocks.initScheduleDatabase.mockResolvedValue(undefined);
    mocks.saveFranchiseConfig.mockResolvedValue(undefined);
    mocks.updateFranchiseMetadata.mockResolvedValue(undefined);
    mocks.setActiveFranchise.mockResolvedValue(undefined);
    mocks.deepCopyLeagueToFranchise.mockResolvedValue(copyResult);
    mocks.getOrCreateSeason.mockResolvedValue(undefined);
    mocks.getSeasonMetadata.mockResolvedValue(null);
    mocks.saveSeasonMetadata.mockImplementation(async (metadata: unknown) => metadata);
    mocks.deleteSeasonMetadata.mockResolvedValue(undefined);
    mocks.deleteFranchise.mockResolvedValue(undefined);
    mocks.deleteFranchiseDatabase.mockResolvedValue(undefined);
    mocks.getFranchisePlayer.mockResolvedValue(null);
    mocks.saveFranchisePlayer.mockImplementation(async (_franchiseId: string, player: unknown) => player);
    mocks.seedFranchiseMoraleBaseline.mockResolvedValue(undefined);
    mocks.saveFranchiseTrueValueRows.mockImplementation(async (rows: unknown[]) => rows);
    mocks.carryOverFranchiseFarmRecordsToSeason.mockResolvedValue({
      fromSeasonId: 'franchise-1-season-1',
      toSeasonId: 'franchise-1-season-2',
      carriedPlayerIds: [],
    });
    mocks.deleteFranchiseFarmRecordsForSeason.mockResolvedValue(0);
    mocks.getFranchiseFarmRoster.mockResolvedValue([]);
    mocks.getAllGamesByFranchise.mockResolvedValue([]);
    mocks.getAllFranchisePlayers.mockResolvedValue([]);
    mocks.getAllFranchiseTeams.mockResolvedValue([]);
    mocks.saveFranchiseTeam.mockImplementation(async (_franchiseId: string, team: unknown) => team);
  });

  test('initial setup copies league data into the franchise DB, writes zero schedule rows, and creates season metadata', async () => {
    const franchiseId = await initializeFranchise(franchiseConfig);

    expect(franchiseId).toBe('franchise-1');
    expect(mocks.deepCopyLeagueToFranchise).toHaveBeenCalledWith(
      'franchise-1',
      'league-1',
      {
        seasonId: 'franchise-1-season-1',
        seasonNumber: 1,
        teamControl: {
          'team-away': 'human',
          'team-home': 'ai',
        },
      },
    );
    expect(mocks.generateSchedule).not.toHaveBeenCalled();
    expect(mocks.initScheduleDatabase).toHaveBeenCalled();
    expect(mocks.getOrCreateSeason).toHaveBeenCalledWith(
      'franchise-1-season-1',
      1,
      'Season 1',
      0,
      1,
      'standard',
    );
    expect(mocks.deepCopyLeagueToFranchise.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.setActiveFranchise.mock.invocationCallOrder[0],
    );
    expect(mocks.saveFranchiseConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        franchiseId: 'franchise-1',
        franchiseType: 'solo',
        teamControl: {
          'team-away': 'human',
          'team-home': 'ai',
        },
        controlledTeams: [
          {
            teamId: 'team-away',
            teamName: 'Away Club',
            controlledBy: 'human',
          },
        ],
        rulesSnapshot: expect.objectContaining({
          gamesPerTeam: 1,
          inningsPerGame: 9,
          scheduleType: 'balanced',
        }),
        playoffSetupSnapshot: franchiseConfig.playoffs,
        seasonLength: {
          gamesPerTeam: 1,
          expectedRegularSeasonGamesPerTeam: 1,
          inningsPerGame: 9,
          adaptiveStandardsInningsPerGame: 9,
        },
        schedulePolicy: {
          policy: 'empty-manual-user-supplied',
          generatedSchedulesAllowed: false,
          initialScheduleRows: 0,
          allowedSources: ['manual', 'csv'],
        },
        rosterRequirements: copyResult.rosterRequirements,
        stadiums: copyResult.stadiums,
        salaryBaseline: copyResult.salaryBaseline,
        handoffContract: expect.objectContaining({
          version: 'mode1-mode2-v1',
          franchiseType: 'solo',
          rosterRequirements: copyResult.rosterRequirements,
          salaryBaseline: copyResult.salaryBaseline,
        }),
      }),
    );
  });

  test('stamps draft-baseline true value rows for MLB players and farm prospects without a DB version bump', async () => {
    const mlbPlayer = {
      id: 'mlb-drafted',
      primaryPosition: 'CF',
      personality: 'Competitive',
      hiddenPersonalityModifiers: {
        loyalty: 60,
        ambition: 50,
        resilience: 55,
        charisma: 65,
      },
      leagueAssignments: [{ leagueId: 'league-1', teamId: 'team-away', rosterStatus: 'MLB' }],
    };
    const farmPlayer = {
      id: 'farm-drafted',
      primaryPosition: 'SP',
      personality: 'Relaxed',
      salary: 3.99957,
      settledSalary: 3.99957,
      hiddenPersonalityModifiers: {
        loyalty: 50,
        ambition: 50,
        resilience: 50,
        charisma: 50,
      },
    };
    const cpuFarmPlayer = {
      id: 'cpu-farm-drafted',
      primaryPosition: 'SS',
      personality: 'Competitive',
      salary: 2.33308,
      hiddenPersonalityModifiers: {
        loyalty: 55,
        ambition: 60,
        resilience: 50,
        charisma: 45,
      },
    };
    const shillFarmPlayer = {
      id: 'shill-farm-drafted',
      primaryPosition: 'CF',
      personality: 'Disciplined',
      salary: 2.33308,
    };
    mocks.getAllFranchisePlayers.mockResolvedValueOnce([mlbPlayer]);
    mocks.getTeam.mockImplementation((teamId: string) =>
      Promise.resolve({
        id: teamId,
        name: teamId === 'team-away' ? 'Away Club' : 'Home Club',
        controlledBy: teamId === 'team-home' ? 'ai' : 'human',
      }),
    );
    mocks.getAuctionSession.mockResolvedValueOnce({
      session: auctionSession(
        {
          'mlb-drafted': { playerId: 'mlb-drafted', iv: 125, ivPercentile: 0.75 },
        },
        [sold('mlb-drafted', 'team-away', 90)],
      ),
    });
    mocks.getAuctionSessionById.mockResolvedValueOnce({
      session: {
        ...auctionSession(
          {
            'farm-drafted': { playerId: 'farm-drafted', iv: 40, ivPercentile: 0.25 },
            'cpu-farm-drafted': { playerId: 'cpu-farm-drafted', iv: 55, ivPercentile: 0.4 },
            'shill-farm-drafted': { playerId: 'shill-farm-drafted', iv: 45, ivPercentile: 0.3 },
          },
          [
            sold('farm-drafted', 'team-away', 25),
            sold('cpu-farm-drafted', 'team-home', 27),
            sold('shill-farm-drafted', 'ghost-shill', 29),
          ],
        ),
        config: { cpuShillCount: 2 },
        nominationOrder: ['team-away', 'team-home', 'ghost-shill'],
      },
    });
    mocks.getFranchisePlayer.mockImplementation(async (_franchiseId: string, playerId: string) => (
      playerId === 'mlb-drafted' ? { ...mlbPlayer, settledSalary: 80 } : null
    ));
    mocks.getPlayer.mockImplementation(async (playerId: string) => (
      playerId === 'farm-drafted' ? farmPlayer :
        playerId === 'cpu-farm-drafted' ? cpuFarmPlayer :
          playerId === 'shill-farm-drafted' ? shillFarmPlayer :
            null
    ));

    await initializeFranchise(franchiseConfig);

    expect(TRACKER_DB_VERSION).toBe(25);
    expect(mocks.saveFranchisePlayer).toHaveBeenCalledWith(
      'franchise-1',
      expect.objectContaining({
        id: 'mlb-drafted',
        settledSalary: 90,
      }),
    );
    expect(mocks.savePlayer).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'farm-drafted',
        salary: 25,
        settledSalary: 25,
      }),
    );
    expect(mocks.savePlayer).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'cpu-farm-drafted',
        salary: 27,
        settledSalary: 27,
      }),
    );
    expect(mocks.savePlayer).not.toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'shill-farm-drafted',
      }),
    );
    expect(mocks.getPlayer).toHaveBeenCalledWith('farm-drafted');
    expect(mocks.getPlayer).toHaveBeenCalledWith('cpu-farm-drafted');
    expect(mocks.getPlayer).not.toHaveBeenCalledWith('shill-farm-drafted');
    expect(mocks.saveFranchiseTrueValueRows).toHaveBeenCalledTimes(1);
    expect(mocks.saveFranchiseTrueValueRows).toHaveBeenCalledWith([
      expect.objectContaining({
        franchiseId: 'franchise-1',
        seasonId: 'franchise-1-season-1',
        statsScopeId: 'draft-baseline',
        playerId: 'mlb-drafted',
        trueValue: 125,
        contractValue: 90,
        valueDelta: 35,
        warPercentile: 0,
        position: 'CF',
        peerPoolSize: 0,
        calculationVersion: TRUE_VALUE_CALCULATION_VERSION,
        computedAt: expect.any(String),
      }),
      expect.objectContaining({
        franchiseId: 'franchise-1',
        seasonId: 'franchise-1-season-1',
        statsScopeId: 'draft-baseline',
        playerId: 'farm-drafted',
        trueValue: 40,
        contractValue: 25,
        valueDelta: 15,
        warPercentile: 0,
        position: 'SP',
        peerPoolSize: 0,
        calculationVersion: TRUE_VALUE_CALCULATION_VERSION,
        computedAt: expect.any(String),
      }),
      expect.objectContaining({
        franchiseId: 'franchise-1',
        seasonId: 'franchise-1-season-1',
        statsScopeId: 'draft-baseline',
        playerId: 'cpu-farm-drafted',
        trueValue: 55,
        contractValue: 27,
        valueDelta: 28,
        warPercentile: 0,
        position: 'SS',
        peerPoolSize: 0,
        calculationVersion: TRUE_VALUE_CALCULATION_VERSION,
        computedAt: expect.any(String),
      }),
    ]);
  });

  test('new season schedule initialization writes zero schedule rows by default', async () => {
    mocks.getAllFranchiseTeams.mockResolvedValueOnce([
      { id: 'team-away' },
      { id: 'team-home' },
    ]);

    const scheduledCount = await initializeEmptyFranchiseSeasonSchedule('franchise-1', 2);

    expect(scheduledCount).toBe(0);
    expect(mocks.generateSchedule).not.toHaveBeenCalled();
    expect(mocks.getLeagueTemplate).not.toHaveBeenCalled();
    expect(mocks.initScheduleDatabase).toHaveBeenCalled();
    expect(mocks.getOrCreateSeason).toHaveBeenCalledWith(
      'franchise-1-season-2',
      2,
      'Season 2',
      0,
      null,
      'standard',
    );
    expect(mocks.carryOverFranchiseFarmRecordsToSeason).toHaveBeenCalledWith({
      franchiseId: 'franchise-1',
      fromSeasonId: 'franchise-1-season-1',
      toSeasonId: 'franchise-1-season-2',
      toSeasonNumber: 2,
    });
  });

  test('rolls back franchise metadata and season metadata when setup fails after metadata creation', async () => {
    mocks.saveFranchiseConfig.mockRejectedValueOnce(new Error('config write failed'));

    await expect(initializeFranchise(franchiseConfig)).rejects.toThrow('config write failed');

    expect(mocks.deleteSeasonMetadata).toHaveBeenCalledWith('franchise-1-season-1');
    expect(mocks.deleteFranchiseFarmRecordsForSeason).toHaveBeenCalledWith('franchise-1', 'franchise-1-season-1');
    expect(mocks.deleteFranchise).toHaveBeenCalledWith('franchise-1');
    expect(mocks.deleteFranchiseDatabase).toHaveBeenCalledWith('franchise-1');
  });

  test('repair backfills missing franchise DB data and ensures canonical season metadata', async () => {
    mocks.getAllGamesByFranchise.mockResolvedValueOnce([
      { id: 'g1' },
      { id: 'g2' },
      { id: 'g3' },
    ]);
    mocks.getOrCreateSeason.mockResolvedValueOnce({
      seasonId: 'franchise-1-season-1',
      seasonNumber: 1,
      seasonName: 'Season 1',
      status: 'active',
      startDate: 1,
      gamesPlayed: 0,
      totalGames: 3,
    });

    const result = await repairFranchisePersistence('franchise-1', 1);

    expect(result).toMatchObject({
      rosterBackfilled: true,
      seasonMetadataCreated: true,
      totalGames: 3,
    });
    expect(mocks.deepCopyLeagueToFranchise).toHaveBeenCalledWith('franchise-1', 'league-1', {
      seasonId: 'franchise-1-season-1',
      seasonNumber: 1,
      teamControl: undefined,
    });
    expect(mocks.getOrCreateSeason).toHaveBeenCalledWith(
      'franchise-1-season-1',
      1,
      'Season 1',
      3,
      1,
      'standard',
    );
  });

  test('repair does not recopy a non-empty franchise DB when the source league template changes', async () => {
    mocks.getLeagueTemplate.mockRejectedValueOnce(new Error('source template deleted'));
    mocks.getAllFranchisePlayers.mockResolvedValueOnce([
      {
        id: 'franchise-player-1',
        leagueAssignments: [
          { leagueId: 'league-1', teamId: 'team-away', rosterStatus: 'MLB' },
        ],
      },
    ]);
    mocks.getAllFranchiseTeams.mockResolvedValueOnce([
      { id: 'team-away' },
      { id: 'team-home' },
    ]);

    const result = await repairFranchisePersistence('franchise-1', 1);

    expect(result.rosterBackfilled).toBe(false);
    expect(mocks.getLeagueTemplate).not.toHaveBeenCalled();
    expect(mocks.deepCopyLeagueToFranchise).not.toHaveBeenCalled();
    expect(mocks.getOrCreateSeason).toHaveBeenCalledWith(
      'franchise-1-season-1',
      1,
      'Season 1',
      0,
      1,
      'standard',
    );
    expect(mocks.generateSchedule).not.toHaveBeenCalled();
  });

  test('empty new-season initialization fails from missing franchise-owned teams without touching League Builder', async () => {
    mocks.getAllFranchiseTeams.mockResolvedValueOnce([{ id: 'team-away' }]);

    await expect(
      initializeEmptyFranchiseSeasonSchedule('franchise-1', 2),
    ).rejects.toThrow('Need at least 2 franchise-owned teams');

    expect(mocks.getLeagueTemplate).not.toHaveBeenCalled();
    expect(mocks.generateSchedule).not.toHaveBeenCalled();
    expect(mocks.initScheduleDatabase).not.toHaveBeenCalled();
  });
});
