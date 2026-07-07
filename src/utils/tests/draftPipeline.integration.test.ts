import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('../syncEngine', () => ({
  syncEngine: {
    isSuppressed: () => true,
    upsert: vi.fn(),
    remove: vi.fn(),
  },
}));

import { DEFAULT_AUCTION_SETUP_CONFIG } from '../../data/auctionEngineConstants';
import { LEAGUE_MINIMUM_SALARY } from '../../data/rosterEngineConstants';
import { initAuctionSession, type AuctionSession } from '../../engines/auctionStateMachine';
import type { CpuShillAuctionSession } from '../../engines/cpuShillBidding';
import type { FranchiseConfig } from '../../types/franchise';
import {
  buildLiveScoutPool,
  persistDraftStaffForLeague,
  persistScoutHiresForLeague,
} from '../../src_figma/app/utils/draftStaffingPersistence';
import {
  draftRouteForLeague,
  farmDraftRouteForLeague,
  scoutHireRouteForLeague,
  staffHireRouteForLeague,
} from '../../src_figma/app/utils/draftRouting';
import { buildFarmAuctionSession } from '../farmAuctionSession';
import { initializeFranchise } from '../franchiseInitializer';
import { deleteFranchise, initMetaDatabase, resetMetaDb } from '../franchiseManager';
import {
  deleteFranchiseDatabase,
  getAllFranchisePlayers,
  getAllFranchiseTeams,
} from '../franchisePlayerStorage';
import {
  __resetLeagueBuilderDatabaseForTests,
  clearAllLeagueBuilderData,
  createAuctionSessionId,
  createEmptyTeamRoster,
  createFarmAuctionSessionId,
  getAuctionSession,
  getAuctionSessionById,
  getPlayer,
  getScoutProfilesForLeague,
  getTeamRoster,
  saveAuctionSession,
  saveAuctionSessionById,
  saveLeagueTemplate,
  savePlayer,
  saveTeam,
  saveTeamRoster,
  type Player,
  type Team,
} from '../leagueBuilderStorage';
import {
  LEAGUE_BUILDER_MANAGER_INSTANCE_ID,
  getManagerAssignment,
  getManagerProfile,
  resetManagerIdentityDatabaseForTests,
} from '../managerIdentityStorage';
import { getReporterForTeam } from '../reporterStorage';
import { clearAllSchedules } from '../scheduleStorage';
import { resetTrackerDbForTests } from '../trackerDb';
import {
  commitCompletedFarmAuctionSessionToLeagueRosters,
  commitCompletedMlbAuctionSessionToLeagueRosters,
  MLB_AUCTION_SEASON,
} from '../leagueBuilderAuctionPipeline';

const LEAGUE_ID = 'draft-pipeline-integration-league';
const TEAM_IDS = ['draft-pipeline-alpha', 'draft-pipeline-bravo'] as const;
const CREATED_FRANCHISE_IDS: string[] = [];

function deleteDatabase(name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => resolve();
  });
}

function makeTeam(id: string, controlledBy: Team['controlledBy']): Team {
  return {
    id,
    name: id === TEAM_IDS[0] ? 'Pipeline Alpha' : 'Pipeline Bravo',
    abbreviation: id === TEAM_IDS[0] ? 'ALP' : 'BRV',
    location: 'Draft',
    nickname: id === TEAM_IDS[0] ? 'Alpha' : 'Bravo',
    colors: { primary: '#111111', secondary: '#eeeeee' },
    stadium: 'Pipeline Park',
    controlledBy,
    leagueIds: [LEAGUE_ID],
    createdDate: '2026-01-01T00:00:00.000Z',
    lastModified: '2026-01-01T00:00:00.000Z',
  };
}

function makePlayer(id: string, primaryPosition: Player['primaryPosition']): Player {
  return {
    id,
    firstName: id,
    lastName: 'Pipeline',
    gender: 'M',
    age: 25,
    bats: 'R',
    throws: 'R',
    primaryPosition,
    power: 60,
    contact: 60,
    speed: 60,
    fielding: 60,
    arm: 60,
    velocity: 30,
    junk: 30,
    accuracy: 30,
    arsenal: ['4F'],
    overallGrade: 'B',
    personality: 'Competitive',
    chemistry: 'Crafty',
    morale: 50,
    mojo: 'Normal',
    fame: 0,
    salary: 10_000,
    leagueAssignments: [{ leagueId: LEAGUE_ID, teamId: '', rosterStatus: 'FREE_AGENT' }],
    createdDate: '2026-01-01T00:00:00.000Z',
    lastModified: '2026-01-01T00:00:00.000Z',
    isCustom: true,
  };
}

function makeCompletedAuctionSession(input: {
  teamIds: readonly string[];
  seed: string;
  playerIdsByTeamId: Record<string, readonly string[]>;
  rosterSlotsPerTeam: number;
}): CpuShillAuctionSession {
  const players = Object.values(input.playerIdsByTeamId).flat().map((playerId, index) => ({
    playerId,
    iv: 100_000 - (index * 1_000),
    ivPercentile: 100 - index,
  }));
  const base = initAuctionSession({
    teams: input.teamIds.map((teamId) => ({
      teamId,
      budgetRemaining: 1_000_000,
      rosterSlotsRemaining: input.rosterSlotsPerTeam,
      minSalary: LEAGUE_MINIMUM_SALARY,
    })),
    players,
    config: {
      ...DEFAULT_AUCTION_SETUP_CONFIG,
      nominationOrderSeed: input.seed,
      cpuShillCount: 0,
      bidIncrement: 1_000,
      turnTimerSeconds: null,
      excludeFromLeague: true,
      nominationWeightExponent: 2,
    },
  }) as CpuShillAuctionSession;

  const sales = input.teamIds.flatMap((teamId) =>
    (input.playerIdsByTeamId[teamId] ?? []).map((playerId, index) => ({
      playerId,
      teamId,
      salary: LEAGUE_MINIMUM_SALARY + (index * 1_000),
    })),
  );

  return {
    ...base,
    state: 'AUCTION_COMPLETE',
    availablePlayerIds: [],
    currentLot: null,
    pendingClaim: null,
    teams: base.teams.map((team) => {
      const teamSales = sales.filter((sale) => sale.teamId === team.teamId);
      const spent = teamSales.reduce((sum, sale) => sum + sale.salary, 0);
      return {
        ...team,
        budgetRemaining: Math.max(0, team.budgetRemaining - spent),
        rosterSlotsRemaining: Math.max(0, team.rosterSlotsRemaining - teamSales.length),
        roster: teamSales.map((sale) => ({ playerId: sale.playerId, salary: sale.salary })),
      };
    }),
    results: sales.map((sale) => ({
      playerId: sale.playerId,
      disposition: 'SOLD' as const,
      nominatorTeamId: sale.teamId,
      winnerTeamId: sale.teamId,
      salary: sale.salary,
    })),
    saleCount: sales.length,
  } satisfies AuctionSession as CpuShillAuctionSession;
}

function makeFranchiseConfig(): FranchiseConfig {
  return {
    franchiseName: 'Draft Pipeline Franchise',
    league: LEAGUE_ID,
    leagueDetails: {
      name: 'Draft Pipeline Integration League',
      teams: TEAM_IDS.length,
      conferences: 0,
      divisions: 0,
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
      selectedTeams: [TEAM_IDS[0]],
      mode: 'single',
      playerAssignments: {},
    },
    roster: { mode: 'draft' },
  };
}

async function resetStorage(): Promise<void> {
  __resetLeagueBuilderDatabaseForTests();
  await clearAllLeagueBuilderData().catch(() => undefined);
  await clearAllSchedules().catch(() => undefined);

  for (const franchiseId of CREATED_FRANCHISE_IDS.splice(0)) {
    await deleteFranchise(franchiseId).catch(() => undefined);
    await deleteFranchiseDatabase(franchiseId).catch(() => undefined);
  }

  try {
    const metaDb = await initMetaDatabase();
    metaDb.close();
  } catch {
    // The meta DB may not exist yet.
  }
  resetMetaDb();
  resetManagerIdentityDatabaseForTests();
  resetTrackerDbForTests();
  await Promise.all([
    deleteDatabase('kbl-app-meta'),
    deleteDatabase('kbl-manager-identity'),
    deleteDatabase('kbl-tracker'),
  ].map((promise) => promise.catch(() => undefined)));
}

async function seedLeague(): Promise<Team[]> {
  const teams = [
    makeTeam(TEAM_IDS[0], 'human'),
    makeTeam(TEAM_IDS[1], 'ai'),
  ];

  await saveLeagueTemplate({
    id: LEAGUE_ID,
    name: 'Draft Pipeline Integration League',
    teamIds: [...TEAM_IDS],
    conferences: [],
    divisions: [],
    defaultRulesPreset: 'standard',
    draftFormat: 'auction',
    tier: 'standard',
    balanceMode: 'taxed',
  });

  for (const team of teams) {
    await saveTeam(team);
    await saveTeamRoster(createEmptyTeamRoster(team.id));
  }

  for (const [index, teamId] of TEAM_IDS.entries()) {
    await savePlayer(makePlayer(`${teamId}-mlb-1`, index === 0 ? 'CF' : 'SS'));
    await savePlayer(makePlayer(`${teamId}-mlb-2`, index === 0 ? 'SP' : '1B'));
  }

  return teams;
}

beforeEach(async () => {
  vi.spyOn(Date, 'now').mockReturnValue(1_787_126_400_000);
  vi.spyOn(Math, 'random').mockReturnValue(0.123456789);
  await resetStorage();
});

afterEach(async () => {
  vi.restoreAllMocks();
  await resetStorage();
});

describe('draft pipeline integration', () => {
  test('runs scout hire to MLB auction to farm auction to staff hire to franchise seed', async () => {
    const teams = await seedLeague();
    const leagueRouteInput = { id: LEAGUE_ID, draftFormat: 'auction' as const };

    expect(scoutHireRouteForLeague(leagueRouteInput, { shillCount: 2 })).toBe(
      '/league-builder/scout-hire?leagueId=draft-pipeline-integration-league&shills=2',
    );
    expect(draftRouteForLeague(leagueRouteInput, { shillCount: 2 })).toBe(
      '/league-builder/auction-draft?leagueId=draft-pipeline-integration-league&shills=2',
    );
    expect(farmDraftRouteForLeague(leagueRouteInput)).toBe(
      '/league-builder/farm-auction-draft?leagueId=draft-pipeline-integration-league',
    );
    expect(staffHireRouteForLeague(leagueRouteInput)).toBe(
      '/league-builder/staff-hire?leagueId=draft-pipeline-integration-league',
    );

    const scoutPool = buildLiveScoutPool(LEAGUE_ID, teams.length);
    await persistScoutHiresForLeague({
      leagueId: LEAGUE_ID,
      teams,
      selectedScoutIdsByTeamId: {
        [TEAM_IDS[0]]: scoutPool[1].id,
      },
      pool: scoutPool,
    });
    expect(await getScoutProfilesForLeague(LEAGUE_ID)).toHaveLength(TEAM_IDS.length);

    const mlbSession = makeCompletedAuctionSession({
      teamIds: TEAM_IDS,
      seed: 'draft-pipeline-mlb',
      rosterSlotsPerTeam: 2,
      playerIdsByTeamId: {
        [TEAM_IDS[0]]: [`${TEAM_IDS[0]}-mlb-1`, `${TEAM_IDS[0]}-mlb-2`],
        [TEAM_IDS[1]]: [`${TEAM_IDS[1]}-mlb-1`, `${TEAM_IDS[1]}-mlb-2`],
      },
    });
    await saveAuctionSession({
      id: createAuctionSessionId(LEAGUE_ID, MLB_AUCTION_SEASON),
      leagueId: LEAGUE_ID,
      seasonNumber: MLB_AUCTION_SEASON,
      seed: mlbSession.config.nominationOrderSeed,
      session: mlbSession,
    });
    await commitCompletedMlbAuctionSessionToLeagueRosters({
      leagueId: LEAGUE_ID,
      session: mlbSession,
    });
    await expect(getAuctionSession(LEAGUE_ID, MLB_AUCTION_SEASON)).resolves.toMatchObject({
      session: { state: 'AUCTION_COMPLETE', saleCount: 4 },
    });

    const farmInit = buildFarmAuctionSession({
      leagueId: LEAGUE_ID,
      seasonNumber: 1,
      teams: TEAM_IDS.map((teamId) => ({ teamId, teamName: teamId })),
      seed: 'draft-pipeline-farm',
      poolMultiplier: 1,
      config: {
        ...DEFAULT_AUCTION_SETUP_CONFIG,
        cpuShillCount: 0,
        bidIncrement: 500,
        turnTimerSeconds: null,
        excludeFromLeague: true,
        nominationWeightExponent: 3,
        flatReserveFloor: LEAGUE_MINIMUM_SALARY,
      },
    });
    const farmSession = makeCompletedAuctionSession({
      teamIds: TEAM_IDS,
      seed: 'draft-pipeline-farm',
      rosterSlotsPerTeam: 2,
      playerIdsByTeamId: {
        [TEAM_IDS[0]]: farmInit.pool.prospects.slice(0, 2).map((prospect) => prospect.id),
        [TEAM_IDS[1]]: farmInit.pool.prospects.slice(2, 4).map((prospect) => prospect.id),
      },
    });
    await saveAuctionSessionById({
      id: createFarmAuctionSessionId(LEAGUE_ID, 1),
      leagueId: LEAGUE_ID,
      seasonNumber: 1,
      seed: farmSession.config.nominationOrderSeed,
      session: farmSession,
      pool: farmInit.pool,
    });
    await commitCompletedFarmAuctionSessionToLeagueRosters({
      leagueId: LEAGUE_ID,
      session: farmSession,
      pool: farmInit.pool,
    });
    await expect(getAuctionSessionById(createFarmAuctionSessionId(LEAGUE_ID, 1))).resolves.toMatchObject({
      session: { state: 'AUCTION_COMPLETE', saleCount: 4 },
    });

    for (const teamId of TEAM_IDS) {
      const roster = await getTeamRoster(teamId);
      expect(roster?.mlbRoster).toHaveLength(2);
      expect(roster?.farmRoster).toHaveLength(2);
    }

    const staff = await persistDraftStaffForLeague({
      leagueId: LEAGUE_ID,
      staff: [{
        team: teams[0],
        managerName: 'A. Builder',
        managerStyle: 'Analytics',
        reporterName: 'Casey Wire',
        reporterPersona: 'Straight shooter',
        reporterAvatar: 'cap',
      }],
    });
    expect(await getManagerProfile(staff.managers[0].managerId)).toMatchObject({ displayName: 'A. Builder' });
    expect(await getManagerAssignment({
      managerId: staff.managers[0].managerId,
      teamId: TEAM_IDS[0],
      mode: 'franchise',
      instanceId: LEAGUE_BUILDER_MANAGER_INSTANCE_ID,
    })).toBeTruthy();
    expect(await getReporterForTeam(TEAM_IDS[0], LEAGUE_ID)).toMatchObject({ name: 'Casey Wire' });

    const franchiseId = await initializeFranchise(makeFranchiseConfig());
    CREATED_FRANCHISE_IDS.push(franchiseId);
    const [franchisePlayers, franchiseTeams] = await Promise.all([
      getAllFranchisePlayers(franchiseId),
      getAllFranchiseTeams(franchiseId),
    ]);

    expect(franchiseTeams.map((team) => team.id).sort()).toEqual([...TEAM_IDS].sort());
    expect(franchisePlayers).toHaveLength(8);
    expect(franchisePlayers.map((player) => player.id)).toEqual(
      expect.arrayContaining([
        `${TEAM_IDS[0]}-mlb-1`,
        `${TEAM_IDS[0]}-mlb-2`,
        `${TEAM_IDS[1]}-mlb-1`,
        `${TEAM_IDS[1]}-mlb-2`,
        ...farmSession.results.map((result) => result.playerId),
      ]),
    );
    expect(await getPlayer(farmSession.results[0].playerId)).toMatchObject({
      draftedAsFarmProspect: true,
      leagueAssignments: expect.arrayContaining([
        expect.objectContaining({ leagueId: LEAGUE_ID, rosterStatus: 'FARM' }),
      ]),
    });
  });
});
