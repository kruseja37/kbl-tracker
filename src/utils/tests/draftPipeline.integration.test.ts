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
import { deriveShillTeamIds } from '../../engines/cpuTeamRoles';
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
  getScoutProfilesForLeague,
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
  type Team,
  type TeamRoster,
} from '../leagueBuilderStorage';
import {
  LEAGUE_BUILDER_MANAGER_INSTANCE_ID,
  getManagerAssignment,
  getManagerProfile,
  resetManagerIdentityDatabaseForTests,
} from '../managerIdentityStorage';
import { getReporterForTeam } from '../reporterStorage';
import { resetTrackerDbForTests } from '../trackerDb';
import {
  deleteFranchise,
  getFranchiseConfig,
  listFranchises,
} from '../franchiseManager';
import {
  deepCopyLeagueToFranchise,
  deleteFranchiseDatabase,
  getAllFranchisePlayers,
  getAllFranchiseTeams,
} from '../franchisePlayerStorage';
import { getFranchiseFarmRecordsForSeason } from '../franchiseFarmStorage';
import { getFranchiseSeasonId } from '../franchisePersistenceContract';
import { initializeFranchise } from '../franchiseInitializer';
import { clearAllSchedules } from '../scheduleStorage';
import { deleteSeasonMetadata } from '../seasonStorage';
import {
  getFranchiseTrueValueRows,
} from '../franchiseTrueValueStorage';
import {
  listFranchiseMoraleSnapshots,
} from '../franchiseMoraleState';
import {
  buildLiveScoutPool,
  persistDraftStaffForLeague,
  persistScoutHiresForLeague,
} from '../../src_figma/app/utils/draftStaffingPersistence';

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

function makeCommitRegressionTeam(id: string, leagueId: string, controlledBy: Team['controlledBy']): Team {
  return {
    id,
    name: `${id} Team`,
    abbreviation: id.slice(0, 3).toUpperCase(),
    location: 'Commit',
    nickname: id,
    colors: { primary: '#000000', secondary: '#ffffff' },
    stadium: 'Commit Park',
    controlledBy,
    leagueIds: [leagueId],
    createdDate: '2026-01-01',
    lastModified: '2026-01-01',
  };
}

function makeCommitRegressionPlayer(id: string): Player {
  return {
    id,
    firstName: id,
    lastName: 'Winner',
    gender: 'M',
    age: 25,
    bats: 'R',
    throws: 'R',
    primaryPosition: 'CF',
    power: 70,
    contact: 70,
    speed: 70,
    fielding: 70,
    arm: 70,
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
    leagueAssignments: [],
    createdDate: '2026-01-01',
    lastModified: '2026-01-01',
    isCustom: true,
  };
}

function legalMlbPrimaryPosition(index: number): Player['primaryPosition'] {
  const positions = [
    'C',
    '1B',
    '2B',
    '3B',
    'SS',
    'LF',
    'CF',
    'RF',
    '1B',
    '2B',
    'SS',
    'LF',
    'RF',
    'SP',
    'SP',
    'SP',
    'SP',
    'RP',
    'RP',
    'RP',
    'CP',
    'RP',
  ] as const;
  return positions[index] ?? 'CF';
}

function makeCommitRegressionPlayerAt(
  id: string,
  primaryPosition: Player['primaryPosition'],
  secondaryPosition?: Player['secondaryPosition'],
): Player {
  return {
    ...makeCommitRegressionPlayer(id),
    primaryPosition,
    secondaryPosition,
  };
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
  overrides: {
    leagueId?: string;
    teamIds?: readonly string[];
    franchiseName?: string;
  } = {},
): FranchiseConfig {
  const leagueId = overrides.leagueId ?? LEAGUE_ID;
  const teamIds = overrides.teamIds ?? TEAM_IDS;
  const selectedTeams = controlOverrides?.selectedTeams ?? [teamIds[0]];
  return {
    franchiseName: overrides.franchiseName ?? 'Draft Pipeline Franchise',
    league: leagueId,
    leagueDetails: {
      name: 'Draft Pipeline Integration League',
      teams: teamIds.length,
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
      selectedTeams,
      mode: (controlOverrides?.selectedTeams?.length ?? 1) > 1 ? 'multiplayer' : 'single',
      playerAssignments: controlOverrides?.playerAssignments ?? {},
      seats: controlOverrides?.seats,
    },
    roster: {
      mode: 'existing',
    },
  };
}

async function seedCompleteFranchiseReadyLeague(
  leagueId: string,
  teamIds: readonly string[],
  draftFormat: 'auction' | 'snake' = 'auction',
): Promise<void> {
  await saveLeagueTemplate({
    id: leagueId,
    name: `${leagueId} Complete League`,
    teamIds: [...teamIds],
    conferences: [],
    divisions: [],
    defaultRulesPreset: 'standard',
    draftFormat,
    tier: 'standard',
    balanceMode: 'taxed',
  });

  const teams: Team[] = [];
  for (const [teamIndex, teamId] of teamIds.entries()) {
    const team = makeCommitRegressionTeam(teamId, leagueId, teamIndex === 0 ? 'human' : 'ai');
    await saveTeam(team);
    teams.push(team);

    const mlbIds = Array.from({ length: 22 }, (_, i) => `${teamId}-mlb-${i + 1}`);
    const farmIds = Array.from({ length: 10 }, (_, i) => `${teamId}-farm-${i + 1}`);
    for (const [index, id] of mlbIds.entries()) {
      await savePlayer({
        ...makeCommitRegressionPlayerAt(
          id,
          legalMlbPrimaryPosition(index),
          index === 8 ? 'C' : undefined,
        ),
        leagueAssignments: [{ leagueId, teamId, rosterStatus: 'MLB' }],
      });
    }
    for (const id of farmIds) {
      await savePlayer({
        ...makeCommitRegressionPlayer(id),
        draftedAsFarmProspect: true,
        leagueAssignments: [{ leagueId, teamId, rosterStatus: 'FARM' }],
      });
    }
    await saveTeamRoster({
      ...createEmptyTeamRoster(teamId),
      mlbRoster: mlbIds,
      farmRoster: farmIds,
    });
  }

  await persistScoutHiresForLeague({
    leagueId,
    teams,
    selectedScoutIdsByTeamId: {},
    pool: buildLiveScoutPool(leagueId, teams.length),
  });
}

async function normalizeCommittedMlbRostersToLegalPositionsForTest(
  leagueId: string,
  teamIds: readonly string[],
): Promise<void> {
  for (const teamId of teamIds) {
    const roster = await getTeamRoster(teamId);
    if (!roster) throw new Error(`Team ${teamId} roster missing before legal-position normalization.`);
    for (const [index, playerId] of roster.mlbRoster.entries()) {
      const player = await getPlayer(playerId);
      if (!player) throw new Error(`Player ${playerId} missing before legal-position normalization.`);
      await savePlayer({
        ...player,
        primaryPosition: legalMlbPrimaryPosition(index),
        secondaryPosition: index === 8 ? 'C' : undefined,
        leagueAssignments: player.leagueAssignments?.map((assignment) =>
          assignment.leagueId === leagueId && assignment.teamId === teamId && assignment.rosterStatus === 'MLB'
            ? { ...assignment, rosterStatus: 'MLB' as const }
            : assignment,
        ),
      });
    }
  }
}

function makeIncompleteAuctionSession(
  leagueId: string,
  teamIds: readonly string[],
  seed: string,
): CpuShillAuctionSession {
  return initAuctionSession({
    teams: teamIds.map((teamId) => ({
      teamId,
      budgetRemaining: 1_000_000,
      rosterSlotsRemaining: 22,
      minSalary: LEAGUE_MINIMUM_SALARY,
    })),
    players: [
      {
        playerId: `${teamIds[0]}-mlb-1`,
        iv: 10_000,
        ivPercentile: 50,
      },
    ],
    config: {
      ...DEFAULT_AUCTION_SETUP_CONFIG,
      nominationOrderSeed: seed,
      cpuShillCount: 0,
      bidIncrement: 1_000,
      turnTimerSeconds: null,
      excludeFromLeague: true,
      nominationWeightExponent: 2,
    },
  }) as CpuShillAuctionSession;
}

function makeCompleteEmptyAuctionSession(teamIds: readonly string[], seed: string): CpuShillAuctionSession {
  return initAuctionSession({
    teams: teamIds.map((teamId) => ({
      teamId,
      budgetRemaining: 0,
      rosterSlotsRemaining: 0,
      minSalary: LEAGUE_MINIMUM_SALARY,
    })),
    players: [],
    config: {
      ...DEFAULT_AUCTION_SETUP_CONFIG,
      nominationOrderSeed: seed,
      cpuShillCount: 0,
      bidIncrement: 1_000,
      turnTimerSeconds: null,
      excludeFromLeague: true,
      nominationWeightExponent: 2,
    },
  }) as CpuShillAuctionSession;
}

async function cleanup(): Promise<void> {
  for (const franchiseId of CREATED_FRANCHISE_IDS.splice(0)) {
    await deleteSeasonMetadata(getFranchiseSeasonId(franchiseId, 1)).catch(() => undefined);
    await deleteFranchise(franchiseId).catch(() => undefined);
    await deleteFranchiseDatabase(franchiseId).catch(() => undefined);
  }
  await clearAllSchedules().catch(() => undefined);
  await clearAllLeagueBuilderData().catch(() => undefined);
  resetManagerIdentityDatabaseForTests();
  resetTrackerDbForTests();
  await Promise.all([
    deleteIndexedDbForTests('kbl-manager-identity'),
    deleteIndexedDbForTests('kbl-tracker'),
  ]);
}

async function deleteIndexedDbForTests(name: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => resolve();
  });
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

  await normalizeCommittedMlbRostersToLegalPositionsForTest(LEAGUE_ID, TEAM_IDS);

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

  test('blocks franchise launch before metadata when a saved MLB auction is not finished', async () => {
    const leagueId = `${LEAGUE_ID}-guard-mlb`;
    const teamIds = ['guard-mlb-a', 'guard-mlb-b'] as const;
    await seedCompleteFranchiseReadyLeague(leagueId, teamIds);

    const incompleteMlbSession = makeIncompleteAuctionSession(leagueId, teamIds, 'guard-incomplete-mlb');
    expect(incompleteMlbSession.state).not.toBe('AUCTION_COMPLETE');
    await saveAuctionSession({
      id: createAuctionSessionId(leagueId, MLB_AUCTION_SEASON),
      leagueId,
      seasonNumber: MLB_AUCTION_SEASON,
      seed: incompleteMlbSession.config.nominationOrderSeed,
      session: incompleteMlbSession,
    });

    const before = await listFranchises();
    await expect(initializeFranchise(makeFranchiseConfig(undefined, {
      leagueId,
      teamIds,
      franchiseName: 'Guard MLB Incomplete',
    }))).rejects.toThrow("Your draft isn't finished yet - finish the auction before starting the season.");
    const after = await listFranchises();

    expect(after).toEqual(before);
    expect(after.map((franchise) => franchise.name)).not.toContain('Guard MLB Incomplete');
  }, 30_000);

  test('blocks franchise launch before metadata when MLB is complete but saved farm auction is not finished', async () => {
    const leagueId = `${LEAGUE_ID}-guard-farm`;
    const teamIds = ['guard-farm-a', 'guard-farm-b'] as const;
    await seedCompleteFranchiseReadyLeague(leagueId, teamIds);

    const completedMlbSession = makeCompleteEmptyAuctionSession(teamIds, 'guard-complete-mlb');
    expect(completedMlbSession.state).toBe('AUCTION_COMPLETE');
    await saveAuctionSession({
      id: createAuctionSessionId(leagueId, MLB_AUCTION_SEASON),
      leagueId,
      seasonNumber: MLB_AUCTION_SEASON,
      seed: completedMlbSession.config.nominationOrderSeed,
      session: completedMlbSession,
    });

    const incompleteFarmSession = makeIncompleteAuctionSession(leagueId, teamIds, 'guard-incomplete-farm');
    expect(incompleteFarmSession.state).not.toBe('AUCTION_COMPLETE');
    await saveAuctionSessionById({
      id: createFarmAuctionSessionId(leagueId, 1),
      leagueId,
      seasonNumber: 1,
      seed: incompleteFarmSession.config.nominationOrderSeed,
      session: incompleteFarmSession,
    });

    const before = await listFranchises();
    await expect(initializeFranchise(makeFranchiseConfig(undefined, {
      leagueId,
      teamIds,
      franchiseName: 'Guard Farm Incomplete',
    }))).rejects.toThrow("Your draft isn't finished yet - finish the auction before starting the season.");
    const after = await listFranchises();

    expect(after).toEqual(before);
    expect(after.map((franchise) => franchise.name)).not.toContain('Guard Farm Incomplete');
  }, 30_000);

  test('allows franchise launch without auction sessions for complete non-auction rosters and keeps neutral baselines', async () => {
    const leagueId = `${LEAGUE_ID}-guard-absent`;
    const teamIds = ['guard-absent-a', 'guard-absent-b'] as const;
    await seedCompleteFranchiseReadyLeague(leagueId, teamIds, 'snake');
    await expect(getAuctionSession(leagueId, MLB_AUCTION_SEASON)).resolves.toBeNull();
    await expect(getAuctionSessionById(createFarmAuctionSessionId(leagueId, 1))).resolves.toBeNull();

    const franchiseId = await initializeFranchise(makeFranchiseConfig(undefined, {
      leagueId,
      teamIds,
      franchiseName: 'Guard Session Absent',
    }));
    CREATED_FRANCHISE_IDS.push(franchiseId);
    const seasonId = getFranchiseSeasonId(franchiseId, 1);

    const [
      storedConfig,
      franchisePlayers,
      moraleSnapshots,
      draftBaselineRows,
    ] = await Promise.all([
      getFranchiseConfig(franchiseId),
      getAllFranchisePlayers(franchiseId),
      listFranchiseMoraleSnapshots(franchiseId, seasonId, seasonId, 1),
      getFranchiseTrueValueRows({
        franchiseId,
        seasonId,
        statsScopeId: 'draft-baseline',
      }),
    ]);

    expect(storedConfig?.rosterRequirements).toMatchObject({
      validationStatus: 'passed',
      teamCounts: {
        [teamIds[0]]: { MLB: 22, FARM: 10 },
        [teamIds[1]]: { MLB: 22, FARM: 10 },
      },
    });
    expect(franchisePlayers).toHaveLength(teamIds.length * 32);
    expect(franchisePlayers.every((player) => player.morale === 50)).toBe(true);
    expect(moraleSnapshots).toHaveLength(0);
    expect(draftBaselineRows).toHaveLength(0);
  }, 30_000);

  test('persists scout-hire and staff-hire selections through the live draft ceremony stores', async () => {
    await seedDraftLeagueWithRealMlbPlayers();
    const leagueTeams = await Promise.all(TEAM_IDS.map(async (teamId) => {
      const team = await getTeam(teamId);
      if (!team) throw new Error(`Team ${teamId} missing after seed.`);
      return team;
    }));
    const humanTeam = leagueTeams.find((team) => team.controlledBy === 'human') ?? leagueTeams[0];
    const scoutPool = buildLiveScoutPool(LEAGUE_ID, leagueTeams.length);
    const selectedScout = scoutPool[2];

    const savedScouts = await persistScoutHiresForLeague({
      leagueId: LEAGUE_ID,
      teams: leagueTeams,
      selectedScoutIdsByTeamId: {
        [humanTeam.id]: selectedScout.id,
      },
      pool: scoutPool,
    });
    const scoutsByTeam = await getScoutProfilesForLeague(LEAGUE_ID);

    expect(savedScouts).toHaveLength(TEAM_IDS.length);
    expect(scoutsByTeam).toHaveLength(TEAM_IDS.length);
    expect(new Set(scoutsByTeam.map((scout) => scout.teamId)).size).toBe(TEAM_IDS.length);
    expect(scoutsByTeam.find((scout) => scout.teamId === humanTeam.id)).toEqual(
      expect.objectContaining({
        id: selectedScout.id,
        leagueId: LEAGUE_ID,
        teamId: humanTeam.id,
        hiredPick: expect.objectContaining({ teamId: humanTeam.id }),
      }),
    );

    const staffResult = await persistDraftStaffForLeague({
      leagueId: LEAGUE_ID,
      staff: [{
        team: humanTeam,
        managerName: 'A. Builder',
        managerStyle: 'Analytics',
        reporterName: 'R. Wire',
        reporterPersona: 'Straight shooter',
        reporterAvatar: 'headset',
      }],
    });
    const managerAssignment = await getManagerAssignment({
      teamId: humanTeam.id,
      mode: 'franchise',
      instanceId: LEAGUE_BUILDER_MANAGER_INSTANCE_ID,
    });

    expect(staffResult.managers[0]).toEqual(expect.objectContaining({ displayName: 'A. Builder' }));
    expect(managerAssignment).toEqual(expect.objectContaining({
      managerId: staffResult.managers[0].managerId,
      teamId: humanTeam.id,
      mode: 'franchise',
      instanceId: LEAGUE_BUILDER_MANAGER_INSTANCE_ID,
    }));
    if (!managerAssignment) throw new Error('Manager assignment was not saved.');
    await expect(getManagerProfile(managerAssignment.managerId)).resolves.toEqual(
      expect.objectContaining({ displayName: 'A. Builder' }),
    );
    await expect(getTeam(humanTeam.id)).resolves.toEqual(
      expect.objectContaining({
        managerId: staffResult.managers[0].managerId,
        managerName: 'A. Builder',
      }),
    );
    await expect(getReporterForTeam(humanTeam.id, LEAGUE_ID)).resolves.toEqual(
      expect.objectContaining({
        leagueId: LEAGUE_ID,
        teamId: humanTeam.id,
        name: 'R. Wire',
        personality: 'BALANCED',
        voiceStyle: 'THE_CALLER',
        avatarEra: 'headset',
      }),
    );
  }, 30_000);

  test('commits real CPU auction winners while excluding pure shill winners from league rosters', async () => {
    const leagueId = `${LEAGUE_ID}-mixed-commit`;
    const humanTeamId = 'mixed-human';
    const cpuTeamId = 'mixed-cpu';
    const shillTeamId = '__auction_shill__mixed__1';
    const humanPlayerId = 'mixed-human-player';
    const cpuPlayerId = 'mixed-cpu-player';
    const shillPlayerId = 'mixed-shill-player';

    await saveLeagueTemplate({
      id: leagueId,
      name: 'Mixed Commit League',
      teamIds: [humanTeamId, cpuTeamId],
      conferences: [],
      divisions: [],
      defaultRulesPreset: 'standard',
      draftFormat: 'auction',
      tier: 'standard',
      balanceMode: 'taxed',
    });
    await saveTeam(makeCommitRegressionTeam(humanTeamId, leagueId, 'human'));
    await saveTeam(makeCommitRegressionTeam(cpuTeamId, leagueId, 'ai'));
    await saveTeamRoster(createEmptyTeamRoster(humanTeamId));
    await saveTeamRoster(createEmptyTeamRoster(cpuTeamId));
    await savePlayer(makeCommitRegressionPlayer(humanPlayerId));
    await savePlayer(makeCommitRegressionPlayer(cpuPlayerId));
    await savePlayer(makeCommitRegressionPlayer(shillPlayerId));

    const completedSession = {
      ...(initAuctionSession({
        teams: [
          {
            teamId: humanTeamId,
            budgetRemaining: 990_000,
            rosterSlotsRemaining: 21,
            minSalary: LEAGUE_MINIMUM_SALARY,
            roster: [{ playerId: humanPlayerId, salary: 10_000 }],
          },
          {
            teamId: cpuTeamId,
            budgetRemaining: 988_000,
            rosterSlotsRemaining: 21,
            minSalary: LEAGUE_MINIMUM_SALARY,
            roster: [{ playerId: cpuPlayerId, salary: 12_000 }],
          },
          {
            teamId: shillTeamId,
            budgetRemaining: 987_000,
            rosterSlotsRemaining: 21,
            minSalary: LEAGUE_MINIMUM_SALARY,
            roster: [{ playerId: shillPlayerId, salary: 13_000 }],
          },
        ],
        players: [
          { playerId: humanPlayerId, iv: 10_000, ivPercentile: 90 },
          { playerId: cpuPlayerId, iv: 12_000, ivPercentile: 80 },
          { playerId: shillPlayerId, iv: 13_000, ivPercentile: 70 },
        ],
        config: {
          ...DEFAULT_AUCTION_SETUP_CONFIG,
          nominationOrderSeed: 'mixed-cpu-shill-commit',
          cpuShillCount: 0,
          bidIncrement: 1_000,
          turnTimerSeconds: null,
          excludeFromLeague: true,
          nominationWeightExponent: 2,
        },
      }) as CpuShillAuctionSession),
      state: 'AUCTION_COMPLETE' as const,
      availablePlayerIds: [],
      currentLot: null,
      pendingClaim: null,
      results: [
        {
          playerId: humanPlayerId,
          disposition: 'SOLD' as const,
          nominatorTeamId: humanTeamId,
          winnerTeamId: humanTeamId,
          salary: 10_000,
        },
        {
          playerId: cpuPlayerId,
          disposition: 'SOLD' as const,
          nominatorTeamId: cpuTeamId,
          winnerTeamId: cpuTeamId,
          salary: 12_000,
        },
        {
          playerId: shillPlayerId,
          disposition: 'SOLD' as const,
          nominatorTeamId: shillTeamId,
          winnerTeamId: shillTeamId,
          salary: 13_000,
        },
      ],
      saleCount: 3,
      cpuShills: {
        [shillTeamId]: {
          teamId: shillTeamId,
          personality: 'sniper' as const,
          bandPriorities: {
            Power: 1,
            Contact: 3,
            Speed: 1,
            Defense: 2,
            Rotation: 2,
            Bullpen: 1,
          },
        },
      },
    } satisfies CpuShillAuctionSession;

    const leagueTeams = [
      await getTeam(humanTeamId),
      await getTeam(cpuTeamId),
    ].filter((team): team is Team => Boolean(team));
    const excludeTeamIds = deriveShillTeamIds(completedSession, leagueTeams);
    expect(excludeTeamIds).toEqual([shillTeamId]);

    const report = await commitCompletedMlbAuctionSessionToLeagueRosters({
      leagueId,
      session: completedSession,
      excludeTeamIds,
    });

    await expect(getTeamRoster(humanTeamId)).resolves.toEqual(
      expect.objectContaining({ mlbRoster: [humanPlayerId] }),
    );
    await expect(getTeamRoster(cpuTeamId)).resolves.toEqual(
      expect.objectContaining({ mlbRoster: [cpuPlayerId] }),
    );
    await expect(getPlayer(humanPlayerId)).resolves.toEqual(
      expect.objectContaining({
        settledSalary: 10_000,
        leagueAssignments: expect.arrayContaining([
          expect.objectContaining({ leagueId, teamId: humanTeamId, rosterStatus: 'MLB' }),
        ]),
      }),
    );
    await expect(getPlayer(cpuPlayerId)).resolves.toEqual(
      expect.objectContaining({
        settledSalary: 12_000,
        leagueAssignments: expect.arrayContaining([
          expect.objectContaining({ leagueId, teamId: cpuTeamId, rosterStatus: 'MLB' }),
        ]),
      }),
    );
    const shillPlayer = await getPlayer(shillPlayerId);
    expect(shillPlayer).toEqual(
      expect.objectContaining({
        salary: 10_000,
        leagueAssignments: expect.not.arrayContaining([
          expect.objectContaining({ leagueId }),
        ]),
      }),
    );
    expect(shillPlayer?.settledSalary).toBeUndefined();
    expect(report).toMatchObject({
      leagueId,
      rosterStatus: 'MLB',
      committedPlayerIds: [humanPlayerId, cpuPlayerId],
      teamRosterCounts: {
        [humanTeamId]: 1,
        [cpuTeamId]: 1,
        [shillTeamId]: 1,
      },
    });
  });

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

    // CHEM-POTENCY ruling 5 (JK 2026-07-02): the lock regenerates the league-scoped player
    // axes, so hidden personality modifiers exist at draft-pool time for BOTH draft formats
    // (the franchise-freeze backfill is a no-op guard from here on).
    const lockedLeaguePlayers = (await getAllPlayers()).filter((player) =>
      player.leagueAssignments?.some((assignment) => assignment.leagueId === LEAGUE_ID),
    );
    expect(lockedLeaguePlayers.length).toBeGreaterThan(0);
    expect(lockedLeaguePlayers.every((player) => player.hiddenPersonalityModifiers)).toBe(true);

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

  test('FS-3 regression (FABLE-C3): a shill>0 league passes the franchise launch gate — shill wins never block the 22/10 validation', async () => {
    // The FS-3 chain (audit 2026-07-01): shills win players → the commit EXCLUDES them (pinned by
    // the mixed-commit test above) → those players carry NO league assignment → the strict launch
    // validation over the league-template teams must still pass with every REAL team at 22/10.
    // This drives the exact throw site (`validateV1RosterHandoff` inside deepCopyLeagueToFranchise)
    // against a post-shill-draft league state. The auction-side guarantees (a shill>0 draft
    // COMPLETES under the end-checkpoint) are covered by auctionEndCheckpoint.test.ts and the
    // opt-in pool-sizing sweep.
    const leagueId = `${LEAGUE_ID}-fs3-launch`;
    const franchiseId = 'franchise-fs3-launch';
    const teamIds = ['fs3-team-a', 'fs3-team-b'];
    const shillWonPlayerIds = ['fs3-shill-won-1', 'fs3-shill-won-2'];

    await saveLeagueTemplate({
      id: leagueId,
      name: 'FS-3 Launch League',
      teamIds,
      conferences: [],
      divisions: [],
      defaultRulesPreset: 'standard',
      draftFormat: 'auction',
      tier: 'standard',
      balanceMode: 'taxed',
    });

    const teams = [] as Team[];
    for (const teamId of teamIds) {
      const team = makeCommitRegressionTeam(teamId, leagueId, 'human');
      await saveTeam(team);
      teams.push(team);

      const mlbIds = Array.from({ length: 22 }, (_, i) => `${teamId}-mlb-${i + 1}`);
      const farmIds = Array.from({ length: 10 }, (_, i) => `${teamId}-farm-${i + 1}`);
      for (const [index, id] of mlbIds.entries()) {
        await savePlayer({
          ...makeCommitRegressionPlayerAt(
            id,
            legalMlbPrimaryPosition(index),
            index === 8 ? 'C' : undefined,
          ),
          leagueAssignments: [{ leagueId, teamId, rosterStatus: 'MLB' }],
        });
      }
      for (const id of farmIds) {
        await savePlayer({
          ...makeCommitRegressionPlayer(id),
          draftedAsFarmProspect: true,
          leagueAssignments: [{ leagueId, teamId, rosterStatus: 'FARM' }],
        });
      }
      await saveTeamRoster({
        ...createEmptyTeamRoster(teamId),
        mlbRoster: mlbIds,
        farmRoster: farmIds,
      });
    }

    // The shills' spoils: committed-with-exclusion players hold NO assignment for this league.
    for (const id of shillWonPlayerIds) {
      await savePlayer(makeCommitRegressionPlayer(id));
    }

    // The launch gate also demands exactly one hired scout per team.
    const scoutPool = buildLiveScoutPool(leagueId, teams.length);
    await persistScoutHiresForLeague({
      leagueId,
      teams,
      selectedScoutIdsByTeamId: {},
      pool: scoutPool,
    });

    // THE GATE: before the C3 chain this configuration was the FS-3 launch blocker.
    const copyResult = await deepCopyLeagueToFranchise(franchiseId, leagueId, {});

    expect(copyResult.rosterRequirements.validationStatus).toBe('passed');
    const franchisePlayers = await getAllFranchisePlayers(franchiseId);
    // Every real roster copied (2 × 32); the shill-won players are NOT part of the franchise.
    expect(franchisePlayers).toHaveLength(teamIds.length * 32);
    const franchiseIds = new Set(franchisePlayers.map((player) => player.id));
    for (const id of shillWonPlayerIds) {
      expect(franchiseIds.has(id)).toBe(false);
    }

    await deleteFranchiseDatabase(franchiseId);
  }, 30_000);
});
