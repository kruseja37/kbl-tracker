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
import { isLegalRoster } from '../../data/rosterConstruction';
import { LUXURY_CAP_TABLES, TIER_CAPS } from '../../data/tierParams';
import {
  buildSnakeOrder,
  derivePickValueChart,
  type ConstructionPlayer,
  type RegisteredPool,
} from '../../engines/leagueConstruction';
import {
  createFarmSnakeSession,
  FARM_SNAKE_SESSION_NUMBER,
  farmPickSalary,
} from '../../engines/snakeFarmSlots';
import { executeSnakeGuidePackage, searchSnakeGuidePackage } from '../../engines/snakeGuideTrade';
import { applySnakePickWithCorrection, restoreLatestSnakeCorrection } from '../../engines/snakeSession';
import {
  proveSimultaneousSnakeSeating,
  type SimultaneousSnakeSeatingInput,
  type SnakeSeatingPlayer,
} from '../../engines/snakeSeatingProof';
import { toRosterSlotPlayer } from '../../engines/rosterNeed';
import { buildDraftFreezeInputs } from '../draftFreezeInputs';
import { buildFarmAuctionPool } from '../farmAuctionPool';
import { computeFarmTierCap, computeMlbToFarmCarryover } from '../farmAuctionWallet';
import { initializeFranchise } from '../franchiseInitializer';
import { deleteFranchise, getFranchiseConfig } from '../franchiseManager';
import { deleteFranchiseDatabase, getAllFranchisePlayers, getAllFranchiseTeams } from '../franchisePlayerStorage';
import { getFranchiseFarmRecordsForSeason } from '../franchiseFarmStorage';
import { getFranchiseSeasonId } from '../franchisePersistenceContract';
import { listFranchiseMoraleSnapshots } from '../franchiseMoraleState';
import { getFranchiseTrueValueRows } from '../franchiseTrueValueStorage';
import { deriveSnakeMlbUnspentByTeamId } from '../mlbDraftCompletion';
import {
  addGame,
  clearAllSchedules,
  getAllGamesByFranchise,
  importFranchiseScheduleRows,
} from '../scheduleStorage';
import { deleteSeasonMetadata } from '../seasonStorage';
import {
  clearAllLeagueBuilderData,
  createEmptyTeamRoster,
  createMlbDraftSessionId,
  freezeMlbDraftRoomSessionWithRegisteredPool,
  getLeagueTemplate,
  getMlbDraftSession,
  getPlayer,
  getRegisteredPool,
  getScoutProfilesForLeague,
  getTeamRoster,
  markSnakeRosterHandoff,
  recoverCanonicalMlbSnakePickOrder,
  saveLeagueTemplate,
  saveMlbDraftSession,
  savePlayer,
  saveRegisteredPool,
  saveTeam,
  saveTeamRoster,
  __resetLeagueBuilderDatabaseForTests,
  type LeagueBuilderMlbDraftSession,
  type Player,
  type Team,
} from '../leagueBuilderStorage';
import {
  commitCompletedSnakeFarmSessionToLeagueRosters,
  commitCompletedSnakeSessionToLeagueRosters,
} from '../leagueBuilderAuctionPipeline';
import {
  LEAGUE_BUILDER_MANAGER_INSTANCE_ID,
  getManagerAssignment,
  resetManagerIdentityDatabaseForTests,
} from '../managerIdentityStorage';
import { getReporterForTeam } from '../reporterStorage';
import { resetTrackerDbForTests } from '../trackerDb';
import {
  buildLiveScoutPool,
  persistDraftStaffForLeague,
  persistScoutHiresForLeague,
} from '../../src_figma/app/utils/draftStaffingPersistence';
import { staffHireRouteForLeague } from '../../src_figma/app/utils/draftRouting';
import { freezeSnakeDraftSession, readSnakeDraftTruth } from '../snakeDraftManifest';

const LEAGUE_ID = 's7-snake-season-gauntlet';
const TEAM_IDS = Array.from({ length: 8 }, (_, index) => `s7-club-${index + 1}`);
const SALARY_CAP = TIER_CAPS.standard.tierCap;
const LEGEND_SOURCE_ID = 'lahman:ruthba01';
const LEGEND_SELECTED_ID = 's7-babe-ruth-1927';
const LEGEND_SIBLING_ID = 's7-babe-ruth-1918';
const CREATED_FRANCHISE_IDS: string[] = [];

const LEGAL_POSITIONS = [
  'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF', '1B', '2B', 'SS', 'LF', 'RF',
  'SP', 'SP', 'SP', 'SP', 'RP', 'RP', 'RP', 'CP', 'RP',
] as const satisfies readonly Player['primaryPosition'][];

type VersionIdentity = { playerId: string; sourceId: string };

function makeTeam(teamId: string, index: number): Team {
  return {
    id: teamId,
    name: `S7 Club ${index + 1}`,
    abbreviation: `S${index + 1}`,
    location: 'Gauntlet',
    nickname: `Club ${index + 1}`,
    colors: { primary: '#16324f', secondary: '#f5c542', accent: '#f04e30' },
    stadium: 'Gauntlet Park',
    controlledBy: 'human',
    leagueIds: [LEAGUE_ID],
    capIdentity: 'balanced' as Team['capIdentity'],
    mlbArchetypeKey: 'balanced',
    farmArchetypeKey: index % 2 === 0 ? 'web-gems' : 'bomba-squad',
    createdDate: '2026-07-10',
    lastModified: '2026-07-10',
  };
}

function makePlayer(input: {
  id: string;
  position: Player['primaryPosition'];
  secondaryPosition?: Player['secondaryPosition'];
  firstName?: string;
  lastName?: string;
}): Player {
  const pitcher = input.position === 'SP' || input.position === 'RP' || input.position === 'CP';
  return {
    id: input.id,
    firstName: input.firstName ?? input.id,
    lastName: input.lastName ?? 'Gauntlet',
    gender: 'M',
    age: 25,
    bats: 'R',
    throws: 'R',
    primaryPosition: input.position,
    secondaryPosition: input.secondaryPosition,
    power: pitcher ? 20 : 55,
    contact: pitcher ? 20 : 55,
    speed: pitcher ? 20 : 55,
    fielding: 55,
    arm: 55,
    velocity: pitcher ? 55 : 0,
    junk: pitcher ? 55 : 0,
    accuracy: pitcher ? 55 : 0,
    arsenal: pitcher ? ['4F'] : [],
    overallGrade: 'B',
    personality: 'Competitive',
    chemistry: 'Competitive',
    morale: 50,
    mojo: 'Normal',
    fame: 0,
    salary: 10_000,
    leagueAssignments: [{ leagueId: LEAGUE_ID, teamId: '', rosterStatus: 'FREE_AGENT' }],
    hiddenPersonalityModifiers: { loyalty: 50, ambition: 50, resilience: 50, charisma: 50 },
    createdDate: '2026-07-10',
    lastModified: '2026-07-10',
    isCustom: true,
  };
}

function toConstruction(player: Player): ConstructionPlayer {
  const isPitcher = player.primaryPosition === 'SP' || player.primaryPosition === 'RP' || player.primaryPosition === 'CP';
  return {
    id: player.id,
    isPitcher,
    role: isPitcher ? player.primaryPosition : undefined,
    bat: {
      POW: player.power,
      CON: player.contact,
      SPD: player.speed,
      FLD: player.fielding,
      ARM: player.arm,
    },
    ...(isPitcher ? { pit: { VEL: player.velocity, JNK: player.junk, ACC: player.accuracy } } : {}),
  };
}

function toSeatingPlayer(player: Player, sourceId: string, price: number): SnakeSeatingPlayer {
  return {
    playerId: player.id,
    sourceId,
    price,
    shape: toRosterSlotPlayer({
      primaryPosition: player.primaryPosition,
      secondaryPosition: player.secondaryPosition,
      traits: [player.trait1, player.trait2],
    }),
    construction: toConstruction(player),
  };
}

function franchiseConfig(): FranchiseConfig {
  return {
    franchiseName: 'S7 Snake Season Gauntlet Franchise',
    league: LEAGUE_ID,
    leagueDetails: { name: 'S7 Snake Season Gauntlet', teams: TEAM_IDS.length, conferences: 0, divisions: 0 },
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
      playerAssignments: { [TEAM_IDS[0]]: 's1' },
      seats: [{ id: 's1', name: 'You' }],
    },
    roster: { mode: 'existing' },
  };
}

async function deleteIndexedDb(name: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => resolve();
  });
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
    deleteIndexedDb('kbl-manager-identity'),
    deleteIndexedDb('kbl-tracker'),
  ]);
}

describe('S7 snake draft to season closing gauntlet', () => {
  beforeEach(async () => {
    __resetLeagueBuilderDatabaseForTests();
    await cleanup();
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    __resetLeagueBuilderDatabaseForTests();
    await cleanup();
  });

  test('drives an 8-club snake setup, both drafts, staffing, franchise initialization, and season readiness through real storage', async () => {
    const teams = TEAM_IDS.map(makeTeam);
    await saveLeagueTemplate({
      id: LEAGUE_ID,
      name: 'S7 Snake Season Gauntlet',
      teamIds: [...TEAM_IDS],
      conferences: [],
      divisions: [],
      defaultRulesPreset: 'standard',
      draftFormat: 'snake',
      tier: 'standard',
      balanceMode: 'taxed',
      salaryCap: SALARY_CAP,
    });
    for (const team of teams) {
      await saveTeam(team);
      await saveTeamRoster(createEmptyTeamRoster(team.id));
    }

    const players: Player[] = [];
    const identities: VersionIdentity[] = [];
    const registeredRows: RegisteredPool['players'] = [];
    const draftQueuesByTeamId = new Map<string, string[]>();
    for (let setIndex = 0; setIndex < 16; setIndex += 1) {
      const ownerTeamId = TEAM_IDS[setIndex % TEAM_IDS.length];
      const ids: string[] = [];
      for (const [positionIndex, position] of LEGAL_POSITIONS.entries()) {
        const isSelectedLegend = setIndex === 0 && positionIndex === 0;
        const id = isSelectedLegend
          ? LEGEND_SELECTED_ID
          : `s7-pool-${setIndex + 1}-${positionIndex + 1}`;
        const player = makePlayer({
          id,
          position,
          secondaryPosition: positionIndex === 8 ? 'C' : undefined,
          firstName: isSelectedLegend ? 'Babe' : undefined,
          lastName: isSelectedLegend ? 'Ruth' : undefined,
        });
        const sourceId = isSelectedLegend ? LEGEND_SOURCE_ID : `stock:${id}`;
        const iv = 18_000 + ((players.length * 137) % 7_000);
        players.push(player);
        identities.push({ playerId: id, sourceId });
        registeredRows.push({ id, iv, salary: player.salary });
        if (setIndex < TEAM_IDS.length) ids.push(id);
      }
      if (setIndex < TEAM_IDS.length) draftQueuesByTeamId.set(ownerTeamId, ids);
    }
    const legendSibling = makePlayer({
      id: LEGEND_SIBLING_ID,
      position: 'SP',
      firstName: 'Babe',
      lastName: 'Ruth',
    });
    players.push(legendSibling);
    identities.push({ playerId: LEGEND_SIBLING_ID, sourceId: LEGEND_SOURCE_ID });
    registeredRows.push({ id: LEGEND_SIBLING_ID, iv: 25_000, salary: legendSibling.salary });
    for (const player of players) await savePlayer(player);

    const pool: RegisteredPool = {
      leagueId: LEAGUE_ID,
      tier: 'standard',
      balanceMode: 'taxed',
      players: registeredRows,
      tierCap: SALARY_CAP,
      luxuryCaps: LUXURY_CAP_TABLES.standard,
      pickValueChart: derivePickValueChart(
        registeredRows.map((row) => row.iv),
        TEAM_IDS.length * 22,
        TEAM_IDS.length,
      ),
      totalSlots: TEAM_IDS.length * 22,
      poolSurplusWarning: true,
      locked: true,
      lockedAt: Date.now(),
    };
    await saveRegisteredPool(pool);

    const pickOrder = buildSnakeOrder([...TEAM_IDS], 22);
    let mlbSession: LeagueBuilderMlbDraftSession = await saveMlbDraftSession({
      id: createMlbDraftSessionId(LEAGUE_ID, 1),
      leagueId: LEAGUE_ID,
      seasonNumber: 1,
      seed: 's7-production-default-8-clubs',
      workflowVersion: 'startup-mlb-draft-v1',
      engineMethodVersion: 'snakeFoundations.v1',
      tier: 'standard',
      balanceMode: 'taxed',
      rounds: 22,
      draftPhase: 'MLB',
      pickOrder,
      completedPicks: [],
      currentPickIndex: 0,
      revision: 0,
      versionState: { draftedPlayerIdByGroupId: {}, retiredPlayerIdsByGroupId: {} },
      snakeSetup: {
        poolPlayerIds: identities.filter((row) => row.playerId !== LEGEND_SIBLING_ID).map((row) => row.playerId),
        versionSelections: { 'source:ruthba01': LEGEND_SELECTED_ID },
        clubs: TEAM_IDS.map((teamId, index) => ({
          teamId,
          gmName: `GM ${index + 1}`,
          hotseat: true,
          archetypeId: 'balanced',
        })),
        orderSeed: 's7-production-default-8-clubs',
      },
    });

    const seatingPool = players.map((player) => {
      const identity = identities.find((row) => row.playerId === player.id)!;
      const registered = registeredRows.find((row) => row.id === player.id)!;
      return toSeatingPlayer(player, identity.sourceId, registered.iv);
    });
    const seatingProofInput: SimultaneousSnakeSeatingInput = {
      clubs: TEAM_IDS.map((teamId) => ({ teamId, roster: [], budgetRemaining: SALARY_CAP })),
      pool: seatingPool,
      baseCaps: LUXURY_CAP_TABLES.standard,
      realTeamCount: TEAM_IDS.length,
      versionState: mlbSession.versionState,
    };
    expect(proveSimultaneousSnakeSeating(seatingProofInput).feasible).toBe(true);

    const buyerTeamId = pickOrder[1].teamId;
    const targetPick = pickOrder[0].pick;
    const guide = searchSnakeGuidePackage({
      session: mlbSession,
      buyerTeamId,
      targetPick,
      pickValueChart: pool.pickValueChart,
      seatingProofInput,
    });
    expect(guide.package).not.toBeNull();
    const traded = executeSnakeGuidePackage({
      session: mlbSession,
      proposal: guide.package!,
      pickValueChart: pool.pickValueChart,
      seatingProofInput,
    });
    expect(traded.valid).toBe(true);
    mlbSession = await saveMlbDraftSession(traded.proposedSession!);
    mlbSession = (await getMlbDraftSession(LEAGUE_ID, 1))!;
    expect(mlbSession.trades).toHaveLength(1);

    const identityById = new Map(identities.map((identity) => [identity.playerId, identity]));
    const ivById = new Map(registeredRows.map((row) => [row.id, row.iv]));
    const versionPool = identities;
    let correctionProved = false;
    while (mlbSession.currentPickIndex < mlbSession.pickOrder.length) {
      const slot = mlbSession.pickOrder[mlbSession.currentPickIndex];
      const playerId = draftQueuesByTeamId.get(slot.teamId)?.shift();
      if (!playerId) throw new Error(`No legal MLB pick remains for ${slot.teamId}.`);
      const next = applySnakePickWithCorrection({
        session: mlbSession,
        player: identityById.get(playerId)!,
        settledSalary: ivById.get(playerId)!,
        marginalTax: 0,
        versionPool,
      });
      mlbSession = await saveMlbDraftSession(next);

      if (!correctionProved && mlbSession.currentPickIndex === 48) {
        const correctedPlayerId = playerId;
        const restored = restoreLatestSnakeCorrection((await getMlbDraftSession(LEAGUE_ID, 1))!);
        mlbSession = await saveMlbDraftSession(restored);
        mlbSession = (await getMlbDraftSession(LEAGUE_ID, 1))!;
        expect(mlbSession.completedPicks.some((pick) => pick.playerId === correctedPlayerId)).toBe(false);
        draftQueuesByTeamId.get(slot.teamId)!.unshift(correctedPlayerId);
        correctionProved = true;
      }
    }
    expect(correctionProved).toBe(true);
    mlbSession = (await getMlbDraftSession(LEAGUE_ID, 1))!;
    expect(mlbSession.currentPickIndex).toBe(176);
    expect(mlbSession.completedPicks).toHaveLength(176);
    expect(mlbSession.versionState?.draftedPlayerIdByGroupId['source:ruthba01']).toBe(LEGEND_SELECTED_ID);
    expect(mlbSession.versionState?.retiredPlayerIdsByGroupId['source:ruthba01']).toEqual([LEGEND_SIBLING_ID]);

    const selectedPoolIds = new Set(mlbSession.snakeSetup?.poolPlayerIds ?? pool.players.map((player) => player.id));
    const exactPool = { ...pool, players: pool.players.filter((player) => selectedPoolIds.has(player.id)) };
    await saveRegisteredPool(exactPool);
    const frozenMlbSession = freezeSnakeDraftSession({
      session: mlbSession,
      expectedPhase: 'MLB',
      poolPlayerIds: exactPool.players.map((player) => player.id),
      salaryByPlayerId: new Map(exactPool.players.map((player) => [player.id, player.iv])),
      frozenAt: '2026-07-12T12:00:00.000Z',
    });
    mlbSession = await freezeMlbDraftRoomSessionWithRegisteredPool({
      session: frozenMlbSession,
      registeredPool: exactPool,
      expectedRevision: mlbSession.revision ?? 0,
    });
    await commitCompletedSnakeSessionToLeagueRosters({ leagueId: LEAGUE_ID, session: mlbSession, pool: exactPool });
    mlbSession = await markSnakeRosterHandoff({
      leagueId: LEAGUE_ID,
      seasonNumber: mlbSession.seasonNumber,
      phase: 'MLB',
      sourceSessionId: mlbSession.draftManifest!.source.sessionId,
      manifestPoolIdentity: mlbSession.draftManifest!.pool.identity,
      committedAt: '2026-07-12T12:00:01.000Z',
    });
    for (const teamId of TEAM_IDS) {
      const roster = await getTeamRoster(teamId);
      const storedPlayers = await Promise.all((roster?.mlbRoster ?? []).map((playerId) => getPlayer(playerId)));
      expect(roster?.mlbRoster).toHaveLength(22);
      expect(isLegalRoster(storedPlayers.map((player) => toRosterSlotPlayer({
        primaryPosition: player!.primaryPosition,
        secondaryPosition: player!.secondaryPosition,
        traits: [player!.trait1, player!.trait2],
      })))).toBe(true);
      for (const player of storedPlayers) {
        expect(player?.settledSalary).toBe(ivById.get(player!.id));
      }
    }
    const storedMlbRosterIds = (await Promise.all(TEAM_IDS.map((teamId) => getTeamRoster(teamId))))
      .flatMap((roster) => roster?.mlbRoster ?? []);
    expect(storedMlbRosterIds.filter((playerId) => [LEGEND_SELECTED_ID, LEGEND_SIBLING_ID].includes(playerId))).toEqual([LEGEND_SELECTED_ID]);

    const scoutCandidates = buildLiveScoutPool(LEAGUE_ID, teams);
    await persistScoutHiresForLeague({
      leagueId: LEAGUE_ID,
      teams,
      selectedScoutIdsByTeamId: {},
      pool: scoutCandidates,
    });
    const storedScouts = await getScoutProfilesForLeague(LEAGUE_ID);
    expect(storedScouts).toHaveLength(TEAM_IDS.length);

    const scoutByTeamId = Object.fromEntries(storedScouts.map((scout) => [scout.teamId!, {
      scoutId: scout.id,
      scoutName: scout.name,
      specialties: scout.specialties,
      weaknesses: scout.weaknesses,
    }]));
    const farmPool = buildFarmAuctionPool({
      leagueId: LEAGUE_ID,
      seasonNumber: 1,
      seed: `${mlbSession.seed}:farm`,
      teamDraftOrder: teams.map((team) => ({ teamId: team.id, teamName: team.name })),
      scoutsByTeamId: scoutByTeamId,
    });
    const farmTierCap = computeFarmTierCap(farmPool.auctionPlayers.map((player) => player.iv));
    const unspentByTeamId = deriveSnakeMlbUnspentByTeamId({ session: mlbSession, pool, salaryCap: SALARY_CAP });
    const farmBudgetsByTeamId = Object.fromEntries(TEAM_IDS.map((teamId) => [
      teamId,
      farmTierCap + computeMlbToFarmCarryover(unspentByTeamId.get(teamId) ?? 0),
    ]));
    for (const teamId of TEAM_IDS) {
      expect(farmBudgetsByTeamId[teamId]).toBe(
        farmTierCap + ((SALARY_CAP - mlbSession.completedPicks
          .filter((pick) => pick.teamId === teamId)
          .reduce((sum, pick) => sum + ivById.get(pick.playerId)!, 0)) * 0.5),
      );
    }

    let farmSession = await saveMlbDraftSession(createFarmSnakeSession({
      mlbSession,
      teamOrder: recoverCanonicalMlbSnakePickOrder(mlbSession)
        .filter((slot) => slot.round === 1)
        .map((slot) => slot.teamId),
      existingFarmRosterCountsByTeamId: Object.fromEntries(TEAM_IDS.map((teamId) => [teamId, 0])),
      farmBudgetsByTeamId,
      farmArchetypeIdByTeamId: Object.fromEntries(teams.map((team) => [team.id, team.farmArchetypeKey])),
      prospectIds: farmPool.prospects.map((prospect) => prospect.id),
      prospects: farmPool.prospects,
      now: '2026-07-10T00:00:00.000Z',
    }), { phaseTransition: 'MLB_TO_FARM' });
    expect(farmSession.id).not.toBe(mlbSession.id);
    expect((await getMlbDraftSession(LEAGUE_ID, 1))?.completedPicks).toHaveLength(176);
    expect(farmSession.trades).toEqual([]);
    expect(farmSession.openTradeOffers ?? []).toEqual([]);

    const farmIdentities = farmPool.prospects.map((prospect) => ({
      playerId: prospect.id,
      sourceId: `farm:${prospect.id}`,
    }));
    let farmPlayerIndex = 0;
    while (farmSession.currentPickIndex < farmSession.pickOrder.length) {
      const identity = farmIdentities[farmPlayerIndex++];
      farmSession = await saveMlbDraftSession(applySnakePickWithCorrection({
        session: farmSession,
        player: identity,
        settledSalary: farmPickSalary(farmSession, farmSession.currentPickIndex + 1),
        marginalTax: 0,
        versionPool: farmIdentities,
      }));
    }
    farmSession = (await getMlbDraftSession(LEAGUE_ID, FARM_SNAKE_SESSION_NUMBER))!;
    farmSession = await saveMlbDraftSession(freezeSnakeDraftSession({
      session: farmSession,
      expectedPhase: 'FARM',
      poolPlayerIds: farmPool.prospects.map((prospect) => prospect.id),
      frozenAt: '2026-07-12T12:00:00.000Z',
    }));
    await commitCompletedSnakeFarmSessionToLeagueRosters({ leagueId: LEAGUE_ID, session: farmSession, pool: farmPool });
    farmSession = await markSnakeRosterHandoff({
      leagueId: LEAGUE_ID,
      seasonNumber: farmSession.seasonNumber,
      phase: 'FARM',
      sourceSessionId: farmSession.draftManifest!.source.sessionId,
      manifestPoolIdentity: farmSession.draftManifest!.pool.identity,
      committedAt: '2026-07-12T12:00:01.000Z',
    });
    for (const teamId of TEAM_IDS) {
      const roster = await getTeamRoster(teamId);
      expect(roster?.farmRoster).toHaveLength(10);
    }
    for (const pick of farmSession.completedPicks) {
      const stored = await getPlayer(pick.playerId);
      expect(stored).toMatchObject({
        salary: farmPickSalary(farmSession, pick.pick),
        settledSalary: farmPickSalary(farmSession, pick.pick),
        ratingRevealState: 'hidden',
      });
    }

    const storedLeague = await getLeagueTemplate(LEAGUE_ID);
    expect(storedLeague).not.toBeNull();
    expect(staffHireRouteForLeague(storedLeague!)).toBe(`/league-builder/staff-hire?leagueId=${LEAGUE_ID}`);
    await persistDraftStaffForLeague({
      leagueId: LEAGUE_ID,
      staff: teams.map((team, index) => ({
        team,
        managerName: `Manager ${index + 1}`,
        managerStyle: 'Balanced',
        reporterName: `Reporter ${index + 1}`,
        reporterPersona: 'Straight shooter',
        reporterAvatar: 'headset',
      })),
    });
    for (const teamId of TEAM_IDS) {
      expect(await getManagerAssignment({
        teamId,
        mode: 'franchise',
        instanceId: LEAGUE_BUILDER_MANAGER_INSTANCE_ID,
      })).not.toBeNull();
      expect(await getReporterForTeam(teamId, LEAGUE_ID)).not.toBeNull();
    }

    const storedPool = await getRegisteredPool(LEAGUE_ID);
    const storedMlbSession = await getMlbDraftSession(LEAGUE_ID, 1);
    expect(storedPool).not.toBeNull();
    expect(storedMlbSession?.completedPicks).toHaveLength(176);
    const storedMlbPlayers = (await Promise.all(storedMlbSession!.completedPicks.map((pick) => getPlayer(pick.playerId)))) as Player[];
    const freezeInputs = buildDraftFreezeInputs({
      mlbSession: null,
      mlbSnakeSession: storedMlbSession,
      mlbRegisteredPool: storedPool,
      farmSession: null,
      metaByPlayerId: new Map(storedMlbPlayers.map((player) => [player.id, {
        personality: player.personality,
        modifiers: player.hiddenPersonalityModifiers!,
        position: player.primaryPosition,
      }])),
    });
    expect(freezeInputs).toHaveLength(176);
    expect(freezeInputs.every((input) => input.settledSalary === ivById.get(input.playerId))).toBe(true);
    expect(freezeInputs.some((input) => input.payClassOverride === 'above')).toBe(true);
    expect(freezeInputs.some((input) => input.payClassOverride === 'below')).toBe(true);

    await saveMlbDraftSession({
      ...storedMlbSession!,
      currentPickIndex: 0,
      pickOrder: [],
      completedPicks: [],
      workflowVersion: 'mutated-after-freeze',
    });
    const farmBytesBeforeRejectedMutation = JSON.stringify(farmSession);
    await expect(saveMlbDraftSession({
      ...farmSession,
      currentPickIndex: 0,
      pickOrder: [],
      completedPicks: [],
      farmSlotSalaries: [],
    })).rejects.toThrow(/frozen FARM creation envelope/i);
    expect(JSON.stringify(await getMlbDraftSession(LEAGUE_ID, FARM_SNAKE_SESSION_NUMBER)))
      .toBe(farmBytesBeforeRejectedMutation);

    const franchiseId = await initializeFranchise(franchiseConfig());
    CREATED_FRANCHISE_IDS.push(franchiseId);
    const seasonId = getFranchiseSeasonId(franchiseId, 1);
    const [storedConfig, franchisePlayers, franchiseTeams, farmRecords, moraleSnapshots, draftBaselineRows, scheduleRows] = await Promise.all([
      getFranchiseConfig(franchiseId),
      getAllFranchisePlayers(franchiseId),
      getAllFranchiseTeams(franchiseId),
      getFranchiseFarmRecordsForSeason(franchiseId, seasonId),
      listFranchiseMoraleSnapshots(franchiseId, seasonId, seasonId, 1),
      getFranchiseTrueValueRows({ franchiseId, seasonId, statsScopeId: 'draft-baseline' }),
      getAllGamesByFranchise(franchiseId, 1),
    ]);
    expect(storedConfig?.rosterRequirements).toMatchObject({
      validationStatus: 'passed',
      teamCounts: Object.fromEntries(TEAM_IDS.map((teamId) => [teamId, { MLB: 22, FARM: 10 }])),
    });
    expect(storedConfig?.schedulePolicy).toMatchObject({
      policy: 'empty-manual-user-supplied',
      generatedSchedulesAllowed: false,
      initialScheduleRows: 0,
    });
    expect(scheduleRows).toEqual([]);

    const manualGame = await addGame({
      franchiseId,
      seasonId,
      statsScopeId: seasonId,
      seasonNumber: 1,
      gameNumber: 1,
      dayNumber: 1,
      awayTeamId: TEAM_IDS[0],
      homeTeamId: TEAM_IDS[1],
      source: 'manual',
    });
    const importedGames = await importFranchiseScheduleRows({
      franchiseId,
      seasonId,
      statsScopeId: seasonId,
      seasonNumber: 1,
      rows: [
        { gameNumber: 2, dayNumber: 2, awayTeamId: TEAM_IDS[2], homeTeamId: TEAM_IDS[3] },
        { gameNumber: 3, dayNumber: 3, awayTeamId: TEAM_IDS[4], homeTeamId: TEAM_IDS[5] },
      ],
    });
    expect(manualGame).toMatchObject({
      franchiseId,
      seasonId,
      statsScopeId: seasonId,
      source: 'manual',
      gameNumber: 1,
    });
    expect(importedGames).toHaveLength(2);
    expect(await getAllGamesByFranchise(franchiseId, 1)).toMatchObject([
      { gameNumber: 1, source: 'manual', awayTeamId: TEAM_IDS[0], homeTeamId: TEAM_IDS[1] },
      { gameNumber: 2, source: 'csv-import', awayTeamId: TEAM_IDS[2], homeTeamId: TEAM_IDS[3] },
      { gameNumber: 3, source: 'csv-import', awayTeamId: TEAM_IDS[4], homeTeamId: TEAM_IDS[5] },
    ]);
    expect(storedConfig?.snakeDraftProvenance).toMatchObject({
      mlb: { phase: 'MLB', completedPicks: { length: 176 } },
      farm: { phase: 'FARM', completedPicks: { length: 80 } },
    });
    expect(storedConfig?.handoffContract.snakeDraftProvenance).toEqual(storedConfig?.snakeDraftProvenance);
    const franchiseTeamById = new Map(franchiseTeams.map((team) => [team.id, team]));
    for (const club of storedConfig!.snakeDraftProvenance!.mlb.lockedClubs) {
      expect(club.archetypeId).toBe(franchiseTeamById.get(club.teamId)?.mlbArchetypeKey ?? null);
    }
    for (const club of storedConfig!.snakeDraftProvenance!.farm.lockedClubs) {
      expect(club.archetypeId).toBe(franchiseTeamById.get(club.teamId)?.farmArchetypeKey ?? null);
    }
    const frozenMlbPicks = readSnakeDraftTruth((await getMlbDraftSession(LEAGUE_ID, 1))!, 'MLB').completedPicks;
    const frozenFarmPicks = readSnakeDraftTruth((await getMlbDraftSession(LEAGUE_ID, FARM_SNAKE_SESSION_NUMBER))!, 'FARM').completedPicks;
    const committedRosterIds = new Set([
      ...frozenMlbPicks.map((pick) => pick.playerId),
      ...frozenFarmPicks.map((pick) => pick.playerId),
    ]);
    const franchisePlayerIds = new Set(franchisePlayers.map((player) => player.id));
    expect(committedRosterIds.size).toBe(TEAM_IDS.length * 32);
    for (const playerId of committedRosterIds) expect(franchisePlayerIds.has(playerId)).toBe(true);
    expect(farmRecords).toHaveLength(TEAM_IDS.length * 10);
    expect(draftBaselineRows).toHaveLength(176);

    const moralePlayerIds = new Set(
      moraleSnapshots.filter((snapshot) => snapshot.targetType === 'player').map((snapshot) => snapshot.playerId),
    );
    for (const pick of frozenMlbPicks) expect(moralePlayerIds.has(pick.playerId)).toBe(true);
    // The season handoff is not complete unless farm slot-vs-talent morale survives the real
    // farm-snake storage record into franchise initialization too.
    expect(
      moralePlayerIds.size,
      'franchise initialization must seed draft-day morale for 176 MLB and 80 farm snake picks',
    ).toBe(TEAM_IDS.length * 32);
    for (const pick of frozenFarmPicks) {
      expect(moralePlayerIds.has(pick.playerId), `missing farm-snake morale for ${pick.playerId}`).toBe(true);
    }
  }, 120_000);
});
