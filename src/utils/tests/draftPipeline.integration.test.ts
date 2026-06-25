import 'fake-indexeddb/auto';
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest';

vi.mock('../syncEngine', () => ({
  syncEngine: {
    isSuppressed: () => true,
    upsert: vi.fn(),
    remove: vi.fn(),
  },
}));

import type { FranchiseConfig } from '../../types/franchise';
import {
  advanceLot,
  claimLoneSurvivor,
  getCurrentBidderTeamId,
  initAuctionSession,
  passBid,
  resolveLot,
  surfaceNextPlayer,
  type AuctionSession,
  type AuctionTransitionResult,
} from '../../engines/auctionStateMachine';
import type { CpuShillAuctionSession } from '../../engines/cpuShillBidding';
import { DEFAULT_AUCTION_SETUP_CONFIG } from '../../data/auctionEngineConstants';
import { LEAGUE_MINIMUM_SALARY } from '../../data/rosterEngineConstants';
import {
  buildAuctionPlayers,
  buildAuctionTeams,
  commitCompletedFarmAuctionSessionToLeagueRosters,
  commitCompletedMlbAuctionSessionToLeagueRosters,
  MLB_AUCTION_SEASON,
} from '../leagueBuilderAuctionPipeline';
import { registerLeaguePoolForLeague } from '../leagueBuilderPoolRegistration';
import { buildFarmAuctionSession } from '../farmAuctionSession';
import {
  clearAllLeagueBuilderData,
  clearTeamRoster,
  createEmptyTeamRoster,
  createAuctionSessionId,
  createFarmAuctionSessionId,
  deleteAuctionSession,
  getAllPlayers,
  getAuctionSession,
  getAuctionSessionById,
  getPlayer,
  getTeam,
  getTeamRoster,
  saveAuctionSession,
  saveAuctionSessionById,
  saveLeagueTemplate,
  savePlayer,
  saveScoutProfile,
  saveTeam,
  saveTeamRoster,
  seedFromMLBDatabase,
  __resetLeagueBuilderDatabaseForTests,
  type Player,
  type TeamRoster,
} from '../leagueBuilderStorage';
import {
  deleteFranchise,
  getFranchiseConfig,
} from '../franchiseManager';
import {
  deleteFranchiseDatabase,
  getAllFranchisePlayers,
  getAllFranchiseTeams,
} from '../franchisePlayerStorage';
import { getFranchiseFarmRecordsForSeason } from '../franchiseFarmStorage';
import { getFranchiseSeasonId } from '../franchisePersistenceContract';
import { initializeFranchise } from '../franchiseInitializer';
import { clearAllSchedules } from '../scheduleStorage';
import { deleteSeasonMetadata } from '../seasonStorage';

const LEAGUE_ID = 'draft-pipeline-integration-league';
const TEAM_IDS = ['yankees', 'dodgers', 'red-sox', 'cubs'] as const;
const MLB_AUCTION_SEED = 'draft-pipeline-mlb-auction-seed';
const FARM_AUCTION_SEED = 'draft-pipeline-farm-auction-seed';
const CREATED_FRANCHISE_IDS: string[] = [];

function transitionOrThrow(result: AuctionTransitionResult): CpuShillAuctionSession {
  if (!result.ok) throw new Error(`Auction transition rejected: ${result.reason}`);
  return result.session as CpuShillAuctionSession;
}

async function driveHotSeatAuctionToCompletion(
  initialSession: CpuShillAuctionSession,
  persist: (session: CpuShillAuctionSession) => Promise<void>,
): Promise<{ session: CpuShillAuctionSession; surfacedLots: number }> {
  let session = initialSession;
  let surfacedLots = 0;
  await persist(session);

  for (let step = 0; step < 2_000 && session.state !== 'AUCTION_COMPLETE'; step += 1) {
    if (session.state === 'NOMINATION') {
      session = transitionOrThrow(surfaceNextPlayer(session));
      surfacedLots += 1;
    } else if (session.state === 'OPEN_BIDDING') {
      const bidder = getCurrentBidderTeamId(session);
      session = bidder
        ? transitionOrThrow(passBid(session, bidder))
        : transitionOrThrow(resolveLot(session));
    } else if (session.state === 'RESOLVE') {
      session = session.pendingClaim
        ? transitionOrThrow(claimLoneSurvivor(session))
        : transitionOrThrow(resolveLot(session));
    } else if (session.state === 'SOLD' || session.state === 'PASSED') {
      session = transitionOrThrow(advanceLot(session));
    } else {
      throw new Error(`Unexpected auction state ${session.state}`);
    }
    await persist(session);
  }

  if (session.state !== 'AUCTION_COMPLETE') {
    throw new Error(`Auction did not complete; stopped at ${session.state}`);
  }

  return { session, surfacedLots };
}

function expectRosterToBeEmpty(roster: TeamRoster | null): void {
  expect(roster).toMatchObject({
    mlbRoster: [],
    farmRoster: [],
    lineupWithDH: [],
    lineupWithoutDH: [],
    startingRotation: [],
    longRelievers: [],
    closingPitcher: '',
    setupPitchers: [],
    pinchHitOrder: [],
    pinchRunOrder: [],
    defensiveSubOrder: [],
  });
  expect(roster?.depthChart).toEqual(createEmptyTeamRoster(roster?.teamId ?? 'empty').depthChart);
}

async function assignPlayerToLeague(
  player: Player,
  assignment: NonNullable<Player['leagueAssignments']>[number],
): Promise<void> {
  await savePlayer({
    ...player,
    leagueAssignments: [
      ...(player.leagueAssignments ?? []).filter((candidate) => candidate.leagueId !== assignment.leagueId),
      assignment,
    ],
  });
}

async function removePlayerFromLeague(player: Player, leagueId: string): Promise<void> {
  await savePlayer({
    ...player,
    leagueAssignments: (player.leagueAssignments ?? []).filter((assignment) => assignment.leagueId !== leagueId),
  });
}

async function seedDraftLeagueWithRealMlbPlayers(): Promise<{
  addedFreeAgentId: string;
  removedCuratedPlayerId: string;
  initialRosterPlayerIdsByTeamId: Record<string, string[]>;
}> {
  await seedFromMLBDatabase(true);
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

  const initialRosterPlayerIdsByTeamId: Record<string, string[]> = {};
  for (const teamId of TEAM_IDS) {
    const team = await getTeam(teamId);
    if (!team) throw new Error(`Seeded MLB team ${teamId} was not found.`);
    await saveTeam({
      ...team,
      leagueIds: Array.from(new Set([...(team.leagueIds ?? []), LEAGUE_ID])),
      controlledBy: teamId === TEAM_IDS[0] ? 'human' : 'ai',
    });

    const seededRoster = await getTeamRoster(teamId);
    const seededMlbRoster = seededRoster?.mlbRoster ?? [];
    expect(seededMlbRoster.length).toBeGreaterThanOrEqual(22);
    const selectedRosterIds = seededMlbRoster.slice(0, 22);
    initialRosterPlayerIdsByTeamId[teamId] = selectedRosterIds;

    await saveTeamRoster({
      ...(seededRoster ?? createEmptyTeamRoster(teamId)),
      mlbRoster: selectedRosterIds,
      farmRoster: [],
    });

    for (const playerId of selectedRosterIds) {
      const player = await getPlayer(playerId);
      if (!player) throw new Error(`Seeded roster player ${playerId} was not found.`);
      expect(player.leagueAssignments ?? []).toEqual(
        expect.not.arrayContaining([
          expect.objectContaining({ leagueId: LEAGUE_ID }),
        ]),
      );
    }

    await saveScoutProfile({
      id: `${teamId}-draft-pipeline-scout`,
      leagueId: LEAGUE_ID,
      teamId,
      name: `${team.name} Pipeline Scout`,
      specialties: ['outfield'],
      weaknesses: ['CP'],
      accuracyByPosition: { CF: 84, SP: 80, CP: 55, '1B': 64 },
      seed: `${LEAGUE_ID}:${teamId}:scout`,
      hiredPick: { round: 1, pickNumber: TEAM_IDS.indexOf(teamId as typeof TEAM_IDS[number]) + 1, teamId },
    });
  }

  const initialRosterPlayerIds = new Set(Object.values(initialRosterPlayerIdsByTeamId).flat());
  const allRealPlayers = (await getAllPlayers())
    .filter((player) => player.sourceDatabase === 'SMB4')
    .filter((player) => !initialRosterPlayerIds.has(player.id))
    .sort((left, right) => right.salary - left.salary || left.id.localeCompare(right.id));
  const [addedFreeAgent, removedCuratedPlayer] = allRealPlayers;
  if (!addedFreeAgent || !removedCuratedPlayer) {
    throw new Error('At least two non-roster real SMB4 players are required for pool curation.');
  }

  expect(initialRosterPlayerIds.has(addedFreeAgent.id)).toBe(false);
  expect(initialRosterPlayerIds.has(removedCuratedPlayer.id)).toBe(false);

  await assignPlayerToLeague(addedFreeAgent, {
    leagueId: LEAGUE_ID,
    teamId: '',
    rosterStatus: 'FREE_AGENT',
  });
  await assignPlayerToLeague(removedCuratedPlayer, {
    leagueId: LEAGUE_ID,
    teamId: '',
    rosterStatus: 'FREE_AGENT',
  });
  await removePlayerFromLeague(removedCuratedPlayer, LEAGUE_ID);

  await expect(getPlayer(addedFreeAgent.id)).resolves.toEqual(
    expect.objectContaining({
      leagueAssignments: expect.arrayContaining([
        expect.objectContaining({ leagueId: LEAGUE_ID, teamId: '', rosterStatus: 'FREE_AGENT' }),
      ]),
    }),
  );
  await expect(getPlayer(removedCuratedPlayer.id)).resolves.toEqual(
    expect.objectContaining({
      leagueAssignments: expect.not.arrayContaining([
        expect.objectContaining({ leagueId: LEAGUE_ID }),
      ]),
    }),
  );

  for (const teamId of TEAM_IDS) {
    const roster = await getTeamRoster(teamId);
    expect(roster?.mlbRoster.length).toBeGreaterThan(0);
  }

  return {
    addedFreeAgentId: addedFreeAgent.id,
    removedCuratedPlayerId: removedCuratedPlayer.id,
    initialRosterPlayerIdsByTeamId,
  };
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
    roster: {
      mode: 'existing',
    },
  };
}

async function cleanup(): Promise<void> {
  for (const franchiseId of CREATED_FRANCHISE_IDS.splice(0)) {
    await deleteSeasonMetadata(getFranchiseSeasonId(franchiseId, 1)).catch(() => undefined);
    await deleteFranchise(franchiseId).catch(() => undefined);
    await deleteFranchiseDatabase(franchiseId).catch(() => undefined);
  }
  await clearAllSchedules().catch(() => undefined);
  await clearAllLeagueBuilderData().catch(() => undefined);
}

async function runDraftPipeline(): Promise<{
  mlbSoldPlayerIds: string[];
  farmSoldPlayerIds: string[];
  rosterCounts: Record<string, { MLB: number; FARM: number }>;
  franchisePlayerCount: number;
  franchiseTeamCount: number;
  franchiseFarmRecordCount: number;
  registeredPoolSize: number;
  addedFreeAgentId: string;
  removedCuratedPlayerId: string;
}> {
  const curatedFixture = await seedDraftLeagueWithRealMlbPlayers();
  const rosterPoolPlayerIds = Object.values(curatedFixture.initialRosterPlayerIdsByTeamId).flat();

  const staleComplete = initAuctionSession({
    teams: TEAM_IDS.map((teamId) => ({
      teamId,
      budgetRemaining: 0,
      rosterSlotsRemaining: 0,
    })),
    players: [],
    config: { nominationOrderSeed: 'stale-vacuous-complete' },
  }) as CpuShillAuctionSession;
  expect(staleComplete.state).toBe('AUCTION_COMPLETE');
  expect(staleComplete.saleCount).toBe(0);
  await saveAuctionSession({
    id: createAuctionSessionId(LEAGUE_ID, MLB_AUCTION_SEASON),
    leagueId: LEAGUE_ID,
    seasonNumber: MLB_AUCTION_SEASON,
    seed: staleComplete.config.nominationOrderSeed,
    session: staleComplete,
  });
  await expect(getAuctionSession(LEAGUE_ID, MLB_AUCTION_SEASON)).resolves.toMatchObject({
    session: { state: 'AUCTION_COMPLETE', saleCount: 0 },
  });

  const pool = await registerLeaguePoolForLeague(LEAGUE_ID);
  const poolIds = pool.players.map((player) => player.id);
  expect(new Set(poolIds).size).toBe(poolIds.length);
  expect(rosterPoolPlayerIds).toHaveLength(TEAM_IDS.length * 22);
  expect(poolIds).toHaveLength((TEAM_IDS.length * 22) + 1);
  expect(poolIds.length).toBeGreaterThanOrEqual(TEAM_IDS.length * 22);
  expect(poolIds).toEqual(expect.arrayContaining(rosterPoolPlayerIds));
  expect(poolIds).toContain(curatedFixture.addedFreeAgentId);
  expect(poolIds).not.toContain(curatedFixture.removedCuratedPlayerId);

  for (const teamId of TEAM_IDS) {
    await clearTeamRoster(teamId, LEAGUE_ID);
    expectRosterToBeEmpty(await getTeamRoster(teamId));
  }

  await deleteAuctionSession(LEAGUE_ID, MLB_AUCTION_SEASON);
  await expect(getAuctionSession(LEAGUE_ID, MLB_AUCTION_SEASON)).resolves.toBeNull();

  const leagueTeams = await Promise.all(TEAM_IDS.map(async (teamId) => {
    const team = await getTeam(teamId);
    if (!team) throw new Error(`Team ${teamId} missing after seed.`);
    return team;
  }));
  const auctionTeams = await buildAuctionTeams({
    leagueTeams,
    pool,
    getRoster: getTeamRoster,
  });
  const auctionPlayers = buildAuctionPlayers(pool);
  const initialMlbSession = initAuctionSession({
    teams: auctionTeams,
    players: auctionPlayers,
    config: {
      ...DEFAULT_AUCTION_SETUP_CONFIG,
      nominationOrderSeed: MLB_AUCTION_SEED,
      cpuShillCount: 0,
      bidIncrement: 1_000,
      turnTimerSeconds: null,
      excludeFromLeague: true,
      nominationWeightExponent: 2,
    },
  }) as CpuShillAuctionSession;

  expect(initialMlbSession.state).toBe('NOMINATION');

  const { session: completedMlbSession, surfacedLots: mlbSurfacedLots } =
    await driveHotSeatAuctionToCompletion(initialMlbSession, async (session) => {
      await saveAuctionSession({
        id: createAuctionSessionId(LEAGUE_ID, MLB_AUCTION_SEASON),
        leagueId: LEAGUE_ID,
        seasonNumber: MLB_AUCTION_SEASON,
        seed: session.config.nominationOrderSeed,
        session,
      });
    });

  expect(mlbSurfacedLots).toBeGreaterThan(0);
  expect(completedMlbSession.saleCount).toBeGreaterThan(0);
  expect(completedMlbSession.results.filter((result) => result.disposition === 'SOLD')).toHaveLength(TEAM_IDS.length * 22);
  expect(completedMlbSession.results).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        playerId: curatedFixture.addedFreeAgentId,
        disposition: 'SOLD',
      }),
    ]),
  );
  expect(completedMlbSession.results.map((result) => result.playerId)).not.toContain(curatedFixture.removedCuratedPlayerId);
  await commitCompletedMlbAuctionSessionToLeagueRosters({
    leagueId: LEAGUE_ID,
    session: completedMlbSession,
  });
  await expect(getAuctionSession(LEAGUE_ID, MLB_AUCTION_SEASON)).resolves.toMatchObject({
    session: {
      state: 'AUCTION_COMPLETE',
      saleCount: TEAM_IDS.length * 22,
    },
  });

  for (const teamId of TEAM_IDS) {
    const roster = await getTeamRoster(teamId);
    expect(roster?.mlbRoster).toHaveLength(22);
    expect(roster?.farmRoster).toHaveLength(0);
  }

  const farmTeams = await Promise.all(TEAM_IDS.map(async (teamId) => {
    const roster = await getTeamRoster(teamId);
    if (!roster) throw new Error(`Team ${teamId} roster missing before farm auction.`);
    return {
      teamId,
      teamName: (await getTeam(teamId))?.name ?? teamId,
      farmRosterPlayerIds: roster.farmRoster,
      committedFarmSalaries: 0,
      mlbBudgetCarryover: 0,
    };
  }));
  const farmInit = buildFarmAuctionSession({
    leagueId: LEAGUE_ID,
    seasonNumber: 1,
    teams: farmTeams,
    seed: FARM_AUCTION_SEED,
    poolMultiplier: 1,
    config: {
      ...DEFAULT_AUCTION_SETUP_CONFIG,
      nominationOrderSeed: FARM_AUCTION_SEED,
      cpuShillCount: 0,
      bidIncrement: 500,
      turnTimerSeconds: null,
      excludeFromLeague: true,
      nominationWeightExponent: 3,
      flatReserveFloor: LEAGUE_MINIMUM_SALARY,
    },
  });

  expect(farmInit.session.state).toBe('NOMINATION');

  const { session: completedFarmSession, surfacedLots: farmSurfacedLots } =
    await driveHotSeatAuctionToCompletion(farmInit.session, async (session) => {
      await saveAuctionSessionById({
        id: createFarmAuctionSessionId(LEAGUE_ID, 1),
        leagueId: LEAGUE_ID,
        seasonNumber: 1,
        seed: session.config.nominationOrderSeed,
        session,
        pool: farmInit.pool,
      });
    });

  expect(farmSurfacedLots).toBeGreaterThan(0);
  expect(completedFarmSession.saleCount).toBe(TEAM_IDS.length * 10);
  await commitCompletedFarmAuctionSessionToLeagueRosters({
    leagueId: LEAGUE_ID,
    session: completedFarmSession,
    pool: farmInit.pool,
  });
  await expect(getAuctionSessionById(createFarmAuctionSessionId(LEAGUE_ID, 1))).resolves.toMatchObject({
    session: {
      state: 'AUCTION_COMPLETE',
      saleCount: TEAM_IDS.length * 10,
    },
  });

  for (const teamId of TEAM_IDS) {
    const roster = await getTeamRoster(teamId);
    expect(roster?.mlbRoster).toHaveLength(22);
    expect(roster?.farmRoster).toHaveLength(10);
  }

  const firstMlbWinner = completedMlbSession.results.find((result) => result.disposition === 'SOLD');
  expect(firstMlbWinner?.winnerTeamId).toEqual(expect.any(String));
  await expect(getPlayer(firstMlbWinner!.playerId)).resolves.toEqual(
    expect.objectContaining({
      settledSalary: firstMlbWinner!.salary,
      leagueAssignments: expect.arrayContaining([
        expect.objectContaining({
          leagueId: LEAGUE_ID,
          teamId: firstMlbWinner!.winnerTeamId,
          rosterStatus: 'MLB',
        }),
      ]),
    }),
  );

  const franchiseId = await initializeFranchise(makeFranchiseConfig());
  CREATED_FRANCHISE_IDS.push(franchiseId);
  const seasonId = getFranchiseSeasonId(franchiseId, 1);
  const [
    franchisePlayers,
    franchiseTeams,
    farmRecords,
    storedConfig,
  ] = await Promise.all([
    getAllFranchisePlayers(franchiseId),
    getAllFranchiseTeams(franchiseId),
    getFranchiseFarmRecordsForSeason(franchiseId, seasonId),
    getFranchiseConfig(franchiseId),
  ]);

  const rosterCounts = Object.fromEntries(TEAM_IDS.map((teamId) => {
    const MLB = franchisePlayers.filter((player) =>
      player.leagueAssignments?.some((assignment) =>
        assignment.leagueId === LEAGUE_ID &&
        assignment.teamId === teamId &&
        assignment.rosterStatus === 'MLB',
      ),
    ).length;
    const FARM = franchisePlayers.filter((player) =>
      player.leagueAssignments?.some((assignment) =>
        assignment.leagueId === LEAGUE_ID &&
        assignment.teamId === teamId &&
        assignment.rosterStatus === 'FARM',
      ),
    ).length;
    return [teamId, { MLB, FARM }];
  })) as Record<string, { MLB: number; FARM: number }>;

  expect(franchiseId).toEqual(expect.any(String));
  expect(franchiseTeams).toHaveLength(TEAM_IDS.length);
  expect(franchisePlayers).toHaveLength(TEAM_IDS.length * 32);
  expect(farmRecords).toHaveLength(TEAM_IDS.length * 10);
  expect(franchisePlayers.map((player) => player.id)).toEqual(
    expect.arrayContaining([
      curatedFixture.addedFreeAgentId,
      ...completedMlbSession.results
        .filter((result) => result.disposition === 'SOLD')
        .map((result) => result.playerId),
      ...completedFarmSession.results
        .filter((result) => result.disposition === 'SOLD')
        .map((result) => result.playerId),
    ]),
  );
  expect(franchisePlayers.map((player) => player.id)).not.toContain(curatedFixture.removedCuratedPlayerId);
  expect(storedConfig?.rosterRequirements).toMatchObject({
    validationStatus: 'passed',
    teamCounts: rosterCounts,
  });
  expect(Object.values(rosterCounts)).toEqual(
    Array.from({ length: TEAM_IDS.length }, () => ({ MLB: 22, FARM: 10 })),
  );

  return {
    mlbSoldPlayerIds: completedMlbSession.results
      .filter((result) => result.disposition === 'SOLD')
      .map((result) => result.playerId),
    farmSoldPlayerIds: completedFarmSession.results
      .filter((result) => result.disposition === 'SOLD')
      .map((result) => result.playerId),
    rosterCounts,
    franchisePlayerCount: franchisePlayers.length,
    franchiseTeamCount: franchiseTeams.length,
    franchiseFarmRecordCount: farmRecords.length,
    registeredPoolSize: pool.players.length,
    addedFreeAgentId: curatedFixture.addedFreeAgentId,
    removedCuratedPlayerId: curatedFixture.removedCuratedPlayerId,
  };
}

describe('draft pipeline integration', () => {
  beforeEach(async () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_787_126_400_000);
    vi.spyOn(Math, 'random').mockReturnValue(0.123456789);
    __resetLeagueBuilderDatabaseForTests();
    await cleanup();
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    __resetLeagueBuilderDatabaseForTests();
    await cleanup();
  });

  test('runs MLB auction to farm auction to franchise launch with real seeded players and deterministic storage results', async () => {
    const first = await runDraftPipeline();

    await cleanup();
    __resetLeagueBuilderDatabaseForTests();

    const second = await runDraftPipeline();

    expect(second).toEqual(first);
    expect(first.mlbSoldPlayerIds).toHaveLength(TEAM_IDS.length * 22);
    expect(first.farmSoldPlayerIds).toHaveLength(TEAM_IDS.length * 10);
    expect(first.franchisePlayerCount).toBe(TEAM_IDS.length * 32);
    expect(first.franchiseTeamCount).toBe(TEAM_IDS.length);
    expect(first.franchiseFarmRecordCount).toBe(TEAM_IDS.length * 10);
  }, 30_000);
});
