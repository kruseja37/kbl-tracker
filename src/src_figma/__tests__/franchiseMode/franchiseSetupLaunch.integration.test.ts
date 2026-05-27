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
  saveTeam,
} from '../../../utils/leagueBuilderStorage';
import {
  deleteFranchise,
} from '../../../utils/franchiseManager';
import {
  deleteFranchiseDatabase,
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
): SavePlayerInput {
  const isPitcher = primaryPosition === 'SP';

  return {
    id: `${teamId}-${isPitcher ? 'sp' : 'batter'}-${index}`,
    firstName: isPitcher ? 'Starter' : `Batter${index}`,
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
        rosterStatus: 'MLB',
      },
    ],
    isCustom: true,
    sourceDatabase: 'integration-test',
  };
}

async function seedLeagueTeam(teamId: string, name: string): Promise<void> {
  const lineupPositions = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', 'DH'] as const;
  const batterIds = lineupPositions.map((_, index) => `${teamId}-batter-${index + 1}`);
  const starterId = `${teamId}-sp-1`;

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
  await savePlayer(makePlayer(teamId, 1, 'SP'));
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

    await clearAllLeagueBuilderData();

    const [awayRoster, homeRoster] = await Promise.all([
      buildFranchiseGameTrackerRoster(AWAY_TEAM_ID, {
        franchiseId,
        leagueId: LEAGUE_ID,
        useDH: true,
      }),
      buildFranchiseGameTrackerRoster(HOME_TEAM_ID, {
        franchiseId,
        leagueId: LEAGUE_ID,
        useDH: true,
      }),
    ]);

    expect(awayRoster.players.length).toBeGreaterThan(0);
    expect(awayRoster.pitchers.length).toBeGreaterThan(0);
    expect(homeRoster.players.length).toBeGreaterThan(0);
    expect(homeRoster.pitchers.length).toBeGreaterThan(0);
    expect(awayRoster.players[0].playerId).toContain(AWAY_TEAM_ID);
    expect(homeRoster.pitchers[0].playerId).toContain(HOME_TEAM_ID);
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
