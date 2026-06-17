import { beforeEach, describe, expect, test, vi } from 'vitest';
import type { FranchiseConfig } from '../../../types/franchise';

const mocks = vi.hoisted(() => ({
  createFranchise: vi.fn(),
  saveFranchiseConfig: vi.fn(),
  getFranchiseConfig: vi.fn(),
  updateFranchiseMetadata: vi.fn(),
  setActiveFranchise: vi.fn(),
  deleteFranchise: vi.fn(),
  getLeagueTemplate: vi.fn(),
  getTeam: vi.fn(),
  generateSchedule: vi.fn(),
  initScheduleDatabase: vi.fn(),
  getAllGamesByFranchise: vi.fn(),
  deepCopyLeagueToFranchise: vi.fn(),
  deleteFranchiseDatabase: vi.fn(),
  getAllFranchisePlayers: vi.fn(),
  getAllFranchiseTeams: vi.fn(),
  saveFranchiseTeam: vi.fn(),
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
  getAllFranchisePlayers: mocks.getAllFranchisePlayers,
  getAllFranchiseTeams: mocks.getAllFranchiseTeams,
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
