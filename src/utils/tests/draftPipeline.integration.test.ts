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
import { LUXURY_CAP_TABLES } from '../../data/tierParams';
import { selectTeamArchetype } from '../../engines/archetypeIdentity';
import { shiftLuxuryCaps } from '../../engines/leagueConstruction';
import {
  buildAuctionPlayers,
  buildAuctionTeams,
  commitCompletedFarmAuctionSessionToLeagueRosters,
  commitCompletedMlbAuctionSessionToLeagueRosters,
  MLB_AUCTION_SEASON,
} from '../leagueBuilderAuctionPipeline';
import { registerLeaguePoolForLeague } from '../leagueBuilderPoolRegistration';
import {
  addPlayersToLeaguePool,
  evaluatePoolSufficiency,
  importRosteredPlayersToLeaguePool,
  isPlayerInLeaguePool,
  lockLeaguePool,
  removePlayersFromLeaguePool,
  unlockLeaguePool,
} from '../leagueBuilderPoolBuilder';
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
  getRegisteredPool,
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
const HUB_ARCHETYPE_ID = 'murderers-row';
const HUB_CONFIGURED_TEAM_ID = TEAM_IDS[1];
const CREATED_FRANCHISE_IDS: string[] = [];

interface HubConfiguredTeamResult {
  teamId: string;
  archetypeId: string;
  persistedControlledBy: 'human' | 'ai' | undefined;
  rawShift: {
    POW: number;
    SPD: number;
  };
  baseCaps: {
    POW: number;
    SPD: number;
  };
  shiftedCaps: {
    POW: number;
    SPD: number;
  };
  franchiseControl?: string;
  franchiseRoster?: { MLB: number; FARM: number };
}

interface DraftPipelineResult {
  mlbSoldPlayerIds: string[];
  farmSoldPlayerIds: string[];
  rosterCounts: Record<string, { MLB: number; FARM: number }>;
  franchisePlayerCount: number;
  franchiseTeamCount: number;
  franchiseFarmRecordCount: number;
  registeredPoolSize: number;
  addedFreeAgentId: string;
  removedCuratedPlayerId: string;
  hubConfiguredTeam?: HubConfiguredTeamResult;
}

interface RunDraftPipelineOptions {
  configureHubTeam?: boolean;
  mirrorHubOwnershipToFranchise?: boolean;
}

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

async function configureHubTeamOutput(): Promise<HubConfiguredTeamResult> {
  const team = await getTeam(HUB_CONFIGURED_TEAM_ID);
  if (!team) throw new Error(`Hub-configured team ${HUB_CONFIGURED_TEAM_ID} was not found.`);

  const configured = await selectTeamArchetype(
    { ...team, controlledBy: 'human' },
    HUB_ARCHETYPE_ID,
  );
  if (!configured.capIdentity?.rawShift) {
    throw new Error('Hub-configured archetype did not produce a raw-shift cap identity.');
  }
  const rawShift = configured.capIdentity.rawShift;
  if (typeof rawShift.POW !== 'number' || typeof rawShift.SPD !== 'number') {
    throw new Error('Murderers Row raw-shift proof requires POW and SPD shifts.');
  }

  const baseCaps = LUXURY_CAP_TABLES.standard;
  const shiftedCaps = shiftLuxuryCaps(baseCaps, configured.capIdentity);
  const basePow = baseCaps.find((row) => row.group === 'hitters' && row.stat === 'POW');
  const baseSpeed = baseCaps.find((row) => row.group === 'hitters' && row.stat === 'SPD');
  const shiftedPow = shiftedCaps.find((row) => row.group === 'hitters' && row.stat === 'POW');
  const shiftedSpeed = shiftedCaps.find((row) => row.group === 'hitters' && row.stat === 'SPD');
  if (!basePow || !baseSpeed || !shiftedPow || !shiftedSpeed) {
    throw new Error('Standard luxury cap table is missing a hitters POW/SPD proof row.');
  }

  expect(rawShift.POW).toBeGreaterThan(0);
  expect(rawShift.SPD).toBeLessThan(0);
  expect(shiftedPow.cap).toBeCloseTo(basePow.cap * (1 + rawShift.POW));
  expect(shiftedSpeed.cap).toBeCloseTo(baseSpeed.cap * (1 + rawShift.SPD));
  await expect(getTeam(HUB_CONFIGURED_TEAM_ID)).resolves.toEqual(
    expect.objectContaining({
      controlledBy: 'human',
      mlbArchetypeKey: HUB_ARCHETYPE_ID,
      capIdentity: expect.objectContaining({
        rawShift: expect.objectContaining({
          POW: rawShift.POW,
          SPD: rawShift.SPD,
        }),
      }),
    }),
  );

  return {
    teamId: configured.id,
    archetypeId: HUB_ARCHETYPE_ID,
    persistedControlledBy: configured.controlledBy,
    rawShift: {
      POW: rawShift.POW,
      SPD: rawShift.SPD,
    },
    baseCaps: {
      POW: basePow.cap,
      SPD: baseSpeed.cap,
    },
    shiftedCaps: {
      POW: shiftedPow.cap,
      SPD: shiftedSpeed.cap,
    },
  };
}

async function franchiseControlFromSavedOwnership(): Promise<Pick<FranchiseConfig['teams'], 'selectedTeams' | 'playerAssignments' | 'seats'>> {
  const savedTeams = await Promise.all(TEAM_IDS.map((teamId) => getTeam(teamId)));
  const selectedTeams = savedTeams
    .filter((team): team is NonNullable<typeof team> => team?.controlledBy === 'human')
    .map((team) => team.id);
  const playerAssignments = Object.fromEntries(
    TEAM_IDS.map((teamId) => {
      const team = savedTeams.find((candidate) => candidate?.id === teamId);
      return [teamId, team?.controlledBy === 'human' ? 's1' : 'cpu'];
    }),
  );

  return {
    selectedTeams,
    playerAssignments,
    seats: [{ id: 's1', name: 'You' }],
  };
}

function makeFranchiseConfig(
  controlOverrides?: Pick<FranchiseConfig['teams'], 'selectedTeams' | 'playerAssignments' | 'seats'>,
): FranchiseConfig {
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
      selectedTeams: controlOverrides?.selectedTeams ?? [TEAM_IDS[0]],
      mode: (controlOverrides?.selectedTeams?.length ?? 1) > 1 ? 'multiplayer' : 'single',
      playerAssignments: controlOverrides?.playerAssignments ?? {},
      seats: controlOverrides?.seats,
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

async function runDraftPipeline(options: RunDraftPipelineOptions = {}): Promise<DraftPipelineResult> {
  const curatedFixture = await seedDraftLeagueWithRealMlbPlayers();
  const hubConfiguredTeam = options.configureHubTeam ? await configureHubTeamOutput() : undefined;
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

  const controlOverrides = options.mirrorHubOwnershipToFranchise
    ? await franchiseControlFromSavedOwnership()
    : undefined;
  const franchiseId = await initializeFranchise(makeFranchiseConfig(controlOverrides));
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

  if (hubConfiguredTeam) {
    hubConfiguredTeam.franchiseControl = storedConfig?.teamControl?.[hubConfiguredTeam.teamId];
    hubConfiguredTeam.franchiseRoster = rosterCounts[hubConfiguredTeam.teamId];
  }

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
    hubConfiguredTeam,
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

  test('assembles the pool with the bulk builder + lock, matching the proven contract and enforcing the lock', async () => {
    const { addedFreeAgentId, removedCuratedPlayerId, initialRosterPlayerIdsByTeamId } =
      await seedDraftLeagueWithRealMlbPlayers();
    const mlbSlots = TEAM_IDS.length * 22;

    // Pool mode (a): import the players rostered on the league's branded teams (4 × 22 = 88).
    const importedCount = await importRosteredPlayersToLeaguePool(LEAGUE_ID);
    expect(importedCount).toBe(mlbSlots);

    // Live in/out membership: 88 imported + the 1 free agent already curated at seed = 89.
    const inPoolAfterImport = (await getAllPlayers()).filter((player) =>
      isPlayerInLeaguePool(player, LEAGUE_ID),
    );
    expect(inPoolAfterImport).toHaveLength(mlbSlots + 1);
    expect(inPoolAfterImport.map((player) => player.id)).toContain(addedFreeAgentId);
    expect(inPoolAfterImport.map((player) => player.id)).not.toContain(removedCuratedPlayerId);

    // Registration parity: the bulk-built pool reproduces the proven 89-id contract.
    const registered = await registerLeaguePoolForLeague(LEAGUE_ID);
    expect(new Set(registered.players.map((player) => player.id)).size).toBe(registered.players.length);
    expect(registered.players).toHaveLength(mlbSlots + 1);
    // Every entry carries a finite IV — the auction's hard precondition.
    expect(registered.players.every((player) => Number.isFinite(player.iv))).toBe(true);

    // Sufficiency: 89 pool vs 88 MLB slots → meets the floor with a small surplus.
    const sufficiency = evaluatePoolSufficiency(registered.players.length, TEAM_IDS.length);
    expect(sufficiency.mlbSlots).toBe(mlbSlots);
    expect(sufficiency.meetsFloor).toBe(true);
    expect(sufficiency.surplus).toBe(1);

    // Bulk add/remove round-trips through registration (removed-curated player is off-roster).
    await addPlayersToLeaguePool([removedCuratedPlayerId], LEAGUE_ID);
    expect((await registerLeaguePoolForLeague(LEAGUE_ID)).players).toHaveLength(mlbSlots + 2);
    await removePlayersFromLeaguePool([removedCuratedPlayerId], LEAGUE_ID);
    expect((await registerLeaguePoolForLeague(LEAGUE_ID)).players).toHaveLength(mlbSlots + 1);

    // Removing a ROSTERED player must STICK: registration unions team rosters, so removal must
    // also pull the player off the roster or it would reappear in the locked snapshot.
    const rosteredId = initialRosterPlayerIdsByTeamId[TEAM_IDS[0]][0];
    expect(rosteredId).toBeTruthy();
    await removePlayersFromLeaguePool([rosteredId], LEAGUE_ID);
    const afterRosteredRemove = await registerLeaguePoolForLeague(LEAGUE_ID);
    expect(afterRosteredRemove.players).toHaveLength(mlbSlots); // 89 → 88, did NOT bounce back
    expect(afterRosteredRemove.players.map((player) => player.id)).not.toContain(rosteredId);
    // Restore the pool to 89 for the lock assertions below (re-add as an explicit assignment).
    await addPlayersToLeaguePool([rosteredId], LEAGUE_ID);
    expect((await registerLeaguePoolForLeague(LEAGUE_ID)).players).toHaveLength(mlbSlots + 1);

    // Lock: freezes membership + IV and stamps the lock.
    const locked = await lockLeaguePool(LEAGUE_ID);
    expect(locked.locked).toBe(true);
    expect(typeof locked.lockedAt).toBe('number');
    expect(locked.lockedAt as number).toBeGreaterThan(0);
    expect(locked.players).toHaveLength(mlbSlots + 1);
    expect((await getRegisteredPool(LEAGUE_ID))?.locked).toBe(true);

    // The LOCKED snapshot is what the auction consumes (useAuctionDraft prefers it): it must feed
    // buildAuctionPlayers cleanly — same membership, every IV finite (the auction's hard guard).
    const lockedSnapshot = await getRegisteredPool(LEAGUE_ID);
    const auctionPlayers = buildAuctionPlayers(lockedSnapshot!);
    expect(auctionPlayers).toHaveLength(lockedSnapshot!.players.length);
    expect(auctionPlayers.every((player) => Number.isFinite(player.iv))).toBe(true);

    // Lock is enforced at the data layer — pool edits are rejected until unlocked.
    await expect(addPlayersToLeaguePool([removedCuratedPlayerId], LEAGUE_ID)).rejects.toThrow(/locked/i);
    await expect(removePlayersFromLeaguePool([addedFreeAgentId], LEAGUE_ID)).rejects.toThrow(/locked/i);
    expect((await getRegisteredPool(LEAGUE_ID))?.players).toHaveLength(mlbSlots + 1);

    // Unlock re-opens the pool for editing.
    const unlocked = await unlockLeaguePool(LEAGUE_ID);
    expect(unlocked?.locked).toBe(false);
    await expect(addPlayersToLeaguePool([removedCuratedPlayerId], LEAGUE_ID)).resolves.toBeUndefined();
    expect((await registerLeaguePoolForLeague(LEAGUE_ID)).players).toHaveLength(mlbSlots + 2);
  }, 30_000);

  test('carries hub-configured archetype and ownership through cap math and franchise launch rosters', async () => {
    const result = await runDraftPipeline({
      configureHubTeam: true,
      mirrorHubOwnershipToFranchise: true,
    });

    expect(result.hubConfiguredTeam).toEqual(
      expect.objectContaining({
        teamId: HUB_CONFIGURED_TEAM_ID,
        archetypeId: HUB_ARCHETYPE_ID,
        persistedControlledBy: 'human',
        franchiseControl: 'human',
        franchiseRoster: { MLB: 22, FARM: 10 },
      }),
    );
    expect(result.hubConfiguredTeam?.shiftedCaps.POW).toBeCloseTo(
      result.hubConfiguredTeam!.baseCaps.POW * (1 + result.hubConfiguredTeam!.rawShift.POW),
    );
    expect(result.hubConfiguredTeam?.shiftedCaps.SPD).toBeCloseTo(
      result.hubConfiguredTeam!.baseCaps.SPD * (1 + result.hubConfiguredTeam!.rawShift.SPD),
    );
    expect(result.franchisePlayerCount).toBe(TEAM_IDS.length * 32);
  }, 30_000);
});
