import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('../../../utils/syncEngine', () => ({
  syncEngine: {
    isSuppressed: () => true,
    upsert: vi.fn(),
    remove: vi.fn(),
  },
}));

import type { FranchiseConfig } from '../../../types/franchise';
import {
  __resetLeagueBuilderDatabaseForTests,
  clearAllLeagueBuilderData,
  saveLeagueTemplate,
  savePlayer,
  saveScoutProfile,
  saveTeam,
  saveTeamRoster,
  getTeam,
} from '../../../utils/leagueBuilderStorage';
import {
  getFranchiseConfig,
  deleteFranchise,
} from '../../../utils/franchiseManager';
import {
  deleteFranchiseDatabase,
  getAllFranchiseTeams,
} from '../../../utils/franchisePlayerStorage';
import {
  getAllGamesByFranchise,
  clearAllSchedules,
} from '../../../utils/scheduleStorage';
import {
  deleteSeasonMetadata,
  getSeasonMetadata,
} from '../../../utils/seasonStorage';
import {
  getFranchiseSeasonId,
} from '../../../utils/franchisePersistenceContract';
import {
  getFranchiseFarmRecordsForSeason,
} from '../../../utils/franchiseFarmStorage';
import {
  initializeEmptyFranchiseSeasonSchedule,
  initializeFranchise,
  repairFranchisePersistence,
} from '../../../utils/franchiseInitializer';
import { buildFranchiseGameTrackerRoster } from '../../app/utils/franchiseGameTrackerRoster';

type SavePlayerInput = Parameters<typeof savePlayer>[0];
type SaveTeamInput = Parameters<typeof saveTeam>[0];

const LEAGUE_ID = 'integration-league';
const AWAY_TEAM_ID = 'integration-away';
const HOME_TEAM_ID = 'integration-home';

const createdFranchiseIds: string[] = [];

function makePlayer(
  teamId: string,
  index: number,
  primaryPosition: SavePlayerInput['primaryPosition'],
  rosterStatus: 'MLB' | 'FARM' = 'MLB',
): SavePlayerInput {
  const isPitcher = ['SP', 'RP', 'CP', 'SP/RP', 'P', 'TWO-WAY'].includes(String(primaryPosition));

  return {
    id: `${teamId}-${rosterStatus.toLowerCase()}-${isPitcher ? 'p' : 'b'}-${index}`,
    firstName: rosterStatus === 'FARM' ? `Farm${index}` : isPitcher ? `Pitcher${index}` : `Batter${index}`,
    lastName: teamId,
    gender: 'M',
    jerseyNumber: index,
    age: 27,
    bats: index % 2 === 0 ? 'L' : 'R',
    throws: isPitcher ? 'R' : index % 2 === 0 ? 'L' : 'R',
    primaryPosition,
    secondaryPosition: isPitcher ? 'P' : 'IF',
    power: isPitcher ? 20 : 60 + index,
    contact: isPitcher ? 20 : 65 + index,
    speed: isPitcher ? 25 : 50 + index,
    fielding: 65,
    arm: 65,
    velocity: isPitcher ? 78 : 0,
    junk: isPitcher ? 72 : 0,
    accuracy: isPitcher ? 74 : 0,
    arsenal: isPitcher ? ['4F', 'SL', 'CH'] : [],
    overallGrade: 'B',
    personality: 'Competitive',
    chemistry: 'Competitive',
    morale: 50,
    mojo: 'Normal',
    fame: 0,
    salary: 1_000_000,
    leagueAssignments: [
      {
        leagueId: LEAGUE_ID,
        teamId,
        rosterStatus,
      },
    ],
    isCustom: true,
    sourceDatabase: 'integration-test',
  };
}

async function seedLeagueTeam(teamId: string, name: string): Promise<void> {
  const lineupPositions = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH'] as const;
  const benchPositions = ['C', 'IF', 'OF', '1B/OF'] as const;
  const pitcherPositions = ['SP', 'SP', 'SP', 'SP', 'RP', 'RP', 'RP', 'CP', 'SP/RP'] as const;
  const farmPositions = ['C', '1B', '2B', 'SS', '3B', 'LF', 'CF', 'RF', 'SP', 'RP'] as const;
  const batterIds = lineupPositions.map((_, index) => `${teamId}-mlb-b-${index + 1}`);
  const benchIds = benchPositions.map((_, index) => `${teamId}-mlb-b-${lineupPositions.length + index + 1}`);
  const pitcherIds = pitcherPositions.map((_, index) => `${teamId}-mlb-p-${index + 1}`);
  const farmIds = farmPositions.map((position, index) =>
    `${teamId}-farm-${['SP', 'RP', 'CP', 'SP/RP', 'P', 'TWO-WAY'].includes(position) ? 'p' : 'b'}-${index + 1}`,
  );
  const starterId = pitcherIds[0];

  const team: SaveTeamInput = {
    id: teamId,
    name,
    abbreviation: teamId === AWAY_TEAM_ID ? 'AWY' : 'HME',
    location: 'Test City',
    nickname: name,
    colors: {
      primary: '#123456',
      secondary: '#abcdef',
    },
    stadium: `${name} Park`,
    leagueIds: [LEAGUE_ID],
    lineupWithDH: lineupPositions.map((fieldingPosition, index) => ({
      battingOrder: index + 1,
      playerId: batterIds[index],
      fieldingPosition,
    })),
    lineupWithoutDH: [
      ...lineupPositions.slice(0, 8).map((fieldingPosition, index) => ({
        battingOrder: index + 1,
        playerId: batterIds[index],
        fieldingPosition,
      })),
      {
        battingOrder: 9,
        playerId: starterId,
        fieldingPosition: 'P',
      },
    ],
    startingRotation: [starterId],
  };

  await saveTeam(team);

  for (const [index, position] of lineupPositions.entries()) {
    await savePlayer(makePlayer(teamId, index + 1, position));
  }
  for (const [index, position] of benchPositions.entries()) {
    await savePlayer(makePlayer(teamId, lineupPositions.length + index + 1, position));
  }
  for (const [index, position] of pitcherPositions.entries()) {
    await savePlayer(makePlayer(teamId, index + 1, position));
  }
  for (const [index, position] of farmPositions.entries()) {
    await savePlayer(makePlayer(teamId, index + 1, position, 'FARM'));
  }
  for (let index = 1; index <= 2; index += 1) {
    await saveScoutProfile({
      id: `${teamId}-scout-${index}`,
      leagueId: LEAGUE_ID,
      teamId,
      name: `${name} Scout ${index}`,
      specialties: index === 1 ? ['outfield'] : ['pitching'],
      weaknesses: index === 1 ? ['CP'] : ['1B'],
      accuracyByPosition: { CF: 84, SP: 80, CP: 55, '1B': 64 },
      seed: `${teamId}:scout:${index}`,
      hiredPick: { round: index, pickNumber: index, teamId },
    });
  }
  await saveTeamRoster({
    teamId,
    mlbRoster: [...batterIds, ...benchIds, ...pitcherIds],
    farmRoster: farmIds,
    lineupWithDH: team.lineupWithDH ?? [],
    lineupWithoutDH: team.lineupWithoutDH ?? [],
    startingRotation: [starterId],
    longRelievers: [],
    closingPitcher: pitcherIds[7],
    setupPitchers: [pitcherIds[6]],
    depthChart: {
      C: [],
      '1B': [],
      '2B': [],
      SS: [],
      '3B': [],
      LF: [],
      CF: [],
      RF: [],
      DH: [],
      SP: [],
      RP: [],
      CP: [],
    },
    pinchHitOrder: benchIds,
    pinchRunOrder: benchIds,
    defensiveSubOrder: benchIds,
    lastModified: new Date().toISOString(),
  });
}

function makeFranchiseConfig(): FranchiseConfig {
  return {
    franchiseName: 'Integration Franchise',
    league: LEAGUE_ID,
    leagueDetails: {
      name: 'Integration League',
      teams: 2,
      conferences: 1,
      divisions: 1,
    },
    season: {
      gamesPerTeam: 1,
      inningsPerGame: 9,
      extraInningsRule: 'standard',
      scheduleType: 'balanced',
      useDH: true,
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
      selectedTeams: [AWAY_TEAM_ID],
      mode: 'single',
      playerAssignments: {},
    },
    roster: {
      mode: 'existing',
    },
  };
}

async function resetTestData(): Promise<void> {
  for (const franchiseId of createdFranchiseIds.splice(0)) {
    await deleteSeasonMetadata(getFranchiseSeasonId(franchiseId, 1)).catch(() => undefined);
    await deleteSeasonMetadata(getFranchiseSeasonId(franchiseId, 2)).catch(() => undefined);
    await deleteFranchise(franchiseId).catch(() => undefined);
    await deleteFranchiseDatabase(franchiseId).catch(() => undefined);
  }
  await clearAllSchedules();
  await clearAllLeagueBuilderData();
}

describe('franchise setup-to-launch persistence integration', () => {
  beforeEach(async () => {
    __resetLeagueBuilderDatabaseForTests();
    await resetTestData();
  });

  afterEach(async () => {
    __resetLeagueBuilderDatabaseForTests();
    await resetTestData();
  });

  test('initializeFranchise copies league rosters into the franchise DB used by GameTracker launch', async () => {
    await seedLeagueTeam(AWAY_TEAM_ID, 'Away Club');
    await seedLeagueTeam(HOME_TEAM_ID, 'Home Club');
    await saveLeagueTemplate({
      id: LEAGUE_ID,
      name: 'Integration League',
      teamIds: [AWAY_TEAM_ID, HOME_TEAM_ID],
      conferences: [],
      divisions: [],
      defaultRulesPreset: 'default',
    });

    const franchiseId = await initializeFranchise(makeFranchiseConfig());
    createdFranchiseIds.push(franchiseId);

    const scheduledGames = await getAllGamesByFranchise(franchiseId, 1);
    expect(scheduledGames).toHaveLength(0);

    const seasonId = getFranchiseSeasonId(franchiseId, 1);
    await expect(getSeasonMetadata(seasonId)).resolves.toMatchObject({
      seasonId,
      seasonNumber: 1,
      totalGames: 0,
    });

    const storedConfig = await getFranchiseConfig(franchiseId);
    expect(storedConfig).toMatchObject({
      franchiseType: 'solo',
      teamControl: {
        [AWAY_TEAM_ID]: 'human',
        [HOME_TEAM_ID]: 'ai',
      },
      controlledTeams: [
        {
          teamId: AWAY_TEAM_ID,
          teamName: 'Away Club',
          controlledBy: 'human',
        },
      ],
      rulesSnapshot: {
        gamesPerTeam: 1,
        inningsPerGame: 9,
        extraInningsRule: 'standard',
        scheduleType: 'balanced',
        useDH: false,
        allStarGame: false,
        tradeDeadline: false,
        mercyRule: false,
      },
      season: expect.objectContaining({
        useDH: false,
      }),
      playoffSetupSnapshot: makeFranchiseConfig().playoffs,
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
      rosterRequirements: {
        mlbPlayersPerTeam: 22,
        farmPlayersPerTeam: 10,
        validationStatus: 'passed',
        teamCounts: {
          [AWAY_TEAM_ID]: { MLB: 22, FARM: 10 },
          [HOME_TEAM_ID]: { MLB: 22, FARM: 10 },
        },
      },
      salaryBaseline: {
        calculationVersion: 'franchise-salary-v1-spec-multifactor-hidden-safe',
        playerCount: 64,
        salariedPlayerCount: 64,
      },
      handoffContract: {
        version: 'mode1-mode2-v1',
        franchiseType: 'solo',
      },
    });
    expect(storedConfig?.salaryBaseline.totalSalary).toBeGreaterThan(0);
    expect(storedConfig?.stadiums).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          teamId: AWAY_TEAM_ID,
          teamName: 'Away Club',
          stadium: 'Away Club Park',
          stadiumId: expect.any(String),
        }),
      ]),
    );

    const franchiseTeams = await getAllFranchiseTeams(franchiseId);
    expect(franchiseTeams).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: AWAY_TEAM_ID, controlledBy: 'human' }),
        expect.objectContaining({ id: HOME_TEAM_ID, controlledBy: 'ai' }),
      ]),
    );
    await expect(getTeam(AWAY_TEAM_ID)).resolves.not.toHaveProperty('controlledBy');

    const farmRecords = await getFranchiseFarmRecordsForSeason(franchiseId, seasonId);
    expect(farmRecords).toHaveLength(20);
    expect(farmRecords.filter((record) => record.teamId === AWAY_TEAM_ID)).toHaveLength(10);
    expect(farmRecords.filter((record) => record.teamId === HOME_TEAM_ID)).toHaveLength(10);

    await clearAllLeagueBuilderData();

    const [awayRoster, homeRoster] = await Promise.all([
      buildFranchiseGameTrackerRoster(AWAY_TEAM_ID, {
        franchiseId,
        leagueId: LEAGUE_ID,
        useDH: storedConfig?.season.useDH ?? false,
      }),
      buildFranchiseGameTrackerRoster(HOME_TEAM_ID, {
        franchiseId,
        leagueId: LEAGUE_ID,
        useDH: storedConfig?.season.useDH ?? false,
      }),
    ]);

    expect(awayRoster.players.length).toBeGreaterThan(0);
    expect(awayRoster.pitchers.length).toBeGreaterThan(0);
    expect(homeRoster.players.length).toBeGreaterThan(0);
    expect(homeRoster.pitchers.length).toBeGreaterThan(0);
    expect(awayRoster.players[0].playerId).toContain(AWAY_TEAM_ID);
    expect(homeRoster.pitchers[0].playerId).toContain(HOME_TEAM_ID);
  });

  test('initializeFranchise blocks invalid MLB/farm handoff without writing schedule rows', async () => {
    await seedLeagueTeam(AWAY_TEAM_ID, 'Away Club');
    await seedLeagueTeam(HOME_TEAM_ID, 'Home Club');
    await savePlayer({
      ...makePlayer(HOME_TEAM_ID, 99, 'C', 'FARM'),
      id: `${HOME_TEAM_ID}-extra-farm`,
    });
    await saveLeagueTemplate({
      id: LEAGUE_ID,
      name: 'Integration League',
      teamIds: [AWAY_TEAM_ID, HOME_TEAM_ID],
      conferences: [],
      divisions: [],
      defaultRulesPreset: 'default',
    });

    await expect(initializeFranchise(makeFranchiseConfig())).rejects.toThrow(
      /Invalid Mode 1 roster handoff/,
    );
    await expect(getAllGamesByFranchise('franchise-1', 1)).resolves.toHaveLength(0);
  });

  test('repair and next-season empty schedule initialization use copied franchise data after source templates are cleared', async () => {
    await seedLeagueTeam(AWAY_TEAM_ID, 'Away Club');
    await seedLeagueTeam(HOME_TEAM_ID, 'Home Club');
    await saveLeagueTemplate({
      id: LEAGUE_ID,
      name: 'Integration League',
      teamIds: [AWAY_TEAM_ID, HOME_TEAM_ID],
      conferences: [],
      divisions: [],
      defaultRulesPreset: 'default',
    });

    const franchiseId = await initializeFranchise(makeFranchiseConfig());
    createdFranchiseIds.push(franchiseId);

    await clearAllLeagueBuilderData();

    await expect(repairFranchisePersistence(franchiseId, 1)).resolves.toMatchObject({
      franchiseId,
      seasonNumber: 1,
      rosterBackfilled: false,
      totalGames: 0,
    });
    await expect(initializeEmptyFranchiseSeasonSchedule(franchiseId, 2)).resolves.toBe(0);
    await expect(getAllGamesByFranchise(franchiseId, 2)).resolves.toHaveLength(0);
    await expect(getSeasonMetadata(getFranchiseSeasonId(franchiseId, 2))).resolves.toMatchObject({
      seasonId: getFranchiseSeasonId(franchiseId, 2),
      seasonNumber: 2,
      totalGames: 0,
    });
  });
});
