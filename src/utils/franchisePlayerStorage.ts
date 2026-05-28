import {
  getAllPlayers,
  getAllTeams,
  getLeagueTemplate,
  getTeamRoster,
  type Player,
  type TeamRoster,
  type Team,
} from './leagueBuilderStorage';
import {
  markOptimalLineupSnapshotsStaleForChange,
  OPTIMAL_LINEUP_SNAPSHOT_FIELDS,
} from './optimalLineup';
import { getEffectivePlayer } from './playerOverrides';
import { syncEngine } from './syncEngine';
import {
  getFranchiseDatabaseName,
  getFranchiseSeasonId,
} from './franchisePersistenceContract';
import {
  deleteFranchiseFarmRecord,
  saveFranchiseFarmRecord,
  type FranchiseFarmRecord,
} from './franchiseFarmStorage';
import {
  FRANCHISE_INITIAL_SALARY_CALCULATION_VERSION,
  withInitialFranchiseSalary,
} from './franchiseSalary';
import { getDerivedParkFactorsIfAvailable } from '../engines/parkFactorDeriver';
import { getStableParkId } from '../data/parkLookup';
import type {
  FranchiseRosterRequirementSnapshot,
  FranchiseSalaryBaselineProof,
  FranchiseTeamControl,
  FranchiseTeamStadiumSnapshot,
} from '../types/franchise';

export type { Player, Team } from './leagueBuilderStorage';

const DB_VERSION = 1;

const STORES = {
  PLAYERS: 'players',
  TEAMS: 'teams',
} as const;

const franchiseDbPromises = new Map<string, Promise<IDBDatabase>>();
const franchiseDbInstances = new Map<string, IDBDatabase>();

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

function transactionToPromise(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

function nowISO(): string {
  return new Date().toISOString();
}

const LINEUP_RELEVANT_PLAYER_FIELDS: Array<keyof Player> = [
  'power',
  'contact',
  'speed',
  'fielding',
  'arm',
  'primaryPosition',
  'secondaryPosition',
  'bats',
  'mojo',
  'overallGrade',
  'leagueAssignments',
];

function serializeComparablePlayerField(value: unknown): string {
  return JSON.stringify(value ?? null);
}

function getAssignedTeamIds(player: Player | null | undefined): string[] {
  return Array.from(
    new Set(
      (player?.leagueAssignments ?? [])
        .filter((assignment) => assignment.rosterStatus !== 'FREE_AGENT')
        .map((assignment) => assignment.teamId)
        .filter(Boolean),
    ),
  );
}

function hasLineupRelevantPlayerChange(previous: Player | null, next: Player): boolean {
  if (!previous) {
    return getAssignedTeamIds(next).length > 0;
  }

  return LINEUP_RELEVANT_PLAYER_FIELDS.some(
    (field) =>
      serializeComparablePlayerField(previous[field]) !==
      serializeComparablePlayerField(next[field]),
  );
}

async function markFranchiseTeamSnapshotsStaleForPlayerChange(
  franchiseId: string,
  previous: Player | null,
  next: Player,
): Promise<void> {
  if (!hasLineupRelevantPlayerChange(previous, next)) return;

  const teamIds = Array.from(
    new Set([...getAssignedTeamIds(previous), ...getAssignedTeamIds(next)]),
  );

  for (const teamId of teamIds) {
    const team = await getFranchiseTeam(franchiseId, teamId);
    if (!team) continue;
    await saveFranchiseTeam(
      franchiseId,
      markOptimalLineupSnapshotsStaleForChange(
        team,
        OPTIMAL_LINEUP_SNAPSHOT_FIELDS,
      ),
    );
  }
}

export async function initFranchiseDatabase(franchiseId: string): Promise<IDBDatabase> {
  const existingPromise = franchiseDbPromises.get(franchiseId);
  if (existingPromise) {
    return existingPromise;
  }

  const dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(getFranchiseDatabaseName(franchiseId), DB_VERSION);

    request.onerror = () => {
      franchiseDbPromises.delete(franchiseId);
      reject(request.error);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(STORES.PLAYERS)) {
        db.createObjectStore(STORES.PLAYERS, { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains(STORES.TEAMS)) {
        db.createObjectStore(STORES.TEAMS, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => {
      const db = request.result;
      franchiseDbInstances.set(franchiseId, db);
      db.onclose = () => {
        franchiseDbInstances.delete(franchiseId);
        franchiseDbPromises.delete(franchiseId);
      };
      db.onversionchange = () => {
        db.close();
        franchiseDbInstances.delete(franchiseId);
        franchiseDbPromises.delete(franchiseId);
      };
      resolve(db);
    };
  });

  franchiseDbPromises.set(franchiseId, dbPromise);
  return dbPromise;
}

export async function getFranchisePlayer(franchiseId: string, playerId: string): Promise<Player | null> {
  const db = await initFranchiseDatabase(franchiseId);
  const tx = db.transaction(STORES.PLAYERS, 'readonly');
  const store = tx.objectStore(STORES.PLAYERS);
  const player = await requestToPromise(store.get(playerId));
  return player ?? null;
}

export async function getAllFranchisePlayers(franchiseId: string): Promise<Player[]> {
  const db = await initFranchiseDatabase(franchiseId);
  const tx = db.transaction(STORES.PLAYERS, 'readonly');
  const store = tx.objectStore(STORES.PLAYERS);
  const players = await requestToPromise(store.getAll());
  return players ?? [];
}

export async function saveFranchisePlayer(
  franchiseId: string,
  player: Omit<Player, 'id' | 'createdDate' | 'lastModified'> & { id?: string },
): Promise<Player> {
  const db = await initFranchiseDatabase(franchiseId);
  const now = nowISO();
  const existing = player.id ? await getFranchisePlayer(franchiseId, player.id) : null;

  const fullPlayer: Player = {
    ...player,
    id: player.id || generateId('player'),
    createdDate: existing?.createdDate || now,
    lastModified: now,
    leagueAssignments: player.leagueAssignments ?? [],
    editHistory: player.editHistory ?? [],
  };

  const tx = db.transaction(STORES.PLAYERS, 'readwrite');
  tx.objectStore(STORES.PLAYERS).put(fullPlayer);
  await transactionToPromise(tx);

  if (!syncEngine.isSuppressed()) syncEngine.upsert(getFranchiseDatabaseName(franchiseId), 'players', fullPlayer.id, fullPlayer);

  await markFranchiseTeamSnapshotsStaleForPlayerChange(franchiseId, existing, fullPlayer);

  return fullPlayer;
}

export async function getFranchiseTeam(franchiseId: string, teamId: string): Promise<Team | null> {
  const db = await initFranchiseDatabase(franchiseId);
  const tx = db.transaction(STORES.TEAMS, 'readonly');
  const store = tx.objectStore(STORES.TEAMS);
  const team = await requestToPromise(store.get(teamId));
  return team ?? null;
}

export async function getAllFranchiseTeams(franchiseId: string): Promise<Team[]> {
  const db = await initFranchiseDatabase(franchiseId);
  const tx = db.transaction(STORES.TEAMS, 'readonly');
  const store = tx.objectStore(STORES.TEAMS);
  const teams = await requestToPromise(store.getAll());
  return teams ?? [];
}

export async function saveFranchiseTeam(
  franchiseId: string,
  team: Omit<Team, 'id' | 'createdDate' | 'lastModified'> & { id?: string },
): Promise<Team> {
  const db = await initFranchiseDatabase(franchiseId);
  const now = nowISO();
  const existing = team.id ? await getFranchiseTeam(franchiseId, team.id) : null;

  const fullTeam: Team = {
    ...team,
    id: team.id || generateId('team'),
    createdDate: existing?.createdDate || now,
    lastModified: now,
  };

  const tx = db.transaction(STORES.TEAMS, 'readwrite');
  tx.objectStore(STORES.TEAMS).put(fullTeam);
  await transactionToPromise(tx);

  if (!syncEngine.isSuppressed()) syncEngine.upsert(getFranchiseDatabaseName(franchiseId), 'teams', fullTeam.id, fullTeam);

  return fullTeam;
}

export async function deleteFranchiseDatabase(franchiseId: string): Promise<void> {
  const openPromise = franchiseDbPromises.get(franchiseId);
  if (openPromise) {
    try {
      const db = await openPromise;
      db.close();
    } catch {
      // Ignore open failures and still attempt deletion.
    }
  } else {
    franchiseDbInstances.get(franchiseId)?.close();
  }

  franchiseDbInstances.delete(franchiseId);
  franchiseDbPromises.delete(franchiseId);

  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(getFranchiseDatabaseName(franchiseId));
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error(`Delete blocked for franchise database "${franchiseId}"`));
  });
}

export interface DeepCopyLeagueToFranchiseOptions {
  seasonId?: string;
  seasonNumber?: number;
  teamControl?: Record<string, FranchiseTeamControl>;
}

export interface DeepCopyLeagueToFranchiseResult {
  rosterRequirements: FranchiseRosterRequirementSnapshot;
  salaryBaseline: FranchiseSalaryBaselineProof;
  stadiums: FranchiseTeamStadiumSnapshot[];
}

const REQUIRED_MLB_PLAYERS_PER_TEAM = 22;
const REQUIRED_FARM_PLAYERS_PER_TEAM = 10;

function rosterStatusFromTeamRoster(
  player: Player,
  leagueId: string,
  teamRostersByTeamId: Map<string, TeamRoster | null>,
): 'MLB' | 'FARM' | undefined {
  const assignment = player.leagueAssignments?.find((candidate) => candidate.leagueId === leagueId);
  const teamId = assignment?.teamId;
  if (!teamId) return undefined;

  const roster = teamRostersByTeamId.get(teamId);
  if (!roster) return undefined;
  if (roster.farmRoster.includes(player.id)) return 'FARM';
  if (roster.mlbRoster.includes(player.id)) return 'MLB';
  return undefined;
}

function applyFranchiseRosterStatus(
  player: Player,
  leagueId: string,
  teamRostersByTeamId: Map<string, TeamRoster | null>,
): Player {
  const rosterStatus = rosterStatusFromTeamRoster(player, leagueId, teamRostersByTeamId);
  if (!rosterStatus) return player;

  return {
    ...player,
    leagueAssignments: (player.leagueAssignments ?? []).map((assignment) =>
      assignment.leagueId === leagueId
        ? { ...assignment, rosterStatus }
        : assignment,
    ),
  };
}

export function withFranchiseTeamParkIdentity(team: Team): Team {
  const parkFactors = getDerivedParkFactorsIfAvailable(team.stadium);
  return {
    ...team,
    stadiumId: team.stadium ? getStableParkId(team.stadium) : team.stadiumId,
    parkFactors,
  };
}

function mergeTeamRosterIntoTeam(
  team: Team,
  roster: TeamRoster | null,
  controlledBy?: FranchiseTeamControl,
): Team {
  const withStadiumIdentity = withFranchiseTeamParkIdentity(team);
  const withControl = {
    ...withStadiumIdentity,
    controlledBy: controlledBy ?? 'ai',
  };

  if (!roster) return withControl;

  return {
    ...withControl,
    lineupWithDH: roster.lineupWithDH,
    lineupWithoutDH: roster.lineupWithoutDH,
    startingRotation: roster.startingRotation,
    optimalLineupVsRHPWithDH: roster.optimalLineupVsRHPWithDH,
    optimalLineupVsLHPWithDH: roster.optimalLineupVsLHPWithDH,
    optimalLineupVsRHPWithoutDH: roster.optimalLineupVsRHPWithoutDH,
    optimalLineupVsLHPWithoutDH: roster.optimalLineupVsLHPWithoutDH,
  };
}

function getTeamAssignment(
  player: Player,
  leagueId: string,
  teamId: string,
): NonNullable<Player['leagueAssignments']>[number] | undefined {
  return player.leagueAssignments?.find((assignment) =>
    assignment.leagueId === leagueId &&
    assignment.teamId === teamId &&
    (assignment.rosterStatus === 'MLB' || assignment.rosterStatus === 'FARM'),
  );
}

function validateV1RosterHandoff(
  leagueId: string,
  teams: Team[],
  players: Player[],
): FranchiseRosterRequirementSnapshot {
  const teamCounts: Record<string, { MLB: number; FARM: number }> = {};
  const issues: string[] = [];

  for (const team of teams) {
    let MLB = 0;
    let FARM = 0;
    for (const player of players) {
      const assignment = getTeamAssignment(player, leagueId, team.id);
      if (assignment?.rosterStatus === 'MLB') MLB += 1;
      if (assignment?.rosterStatus === 'FARM') FARM += 1;
    }

    teamCounts[team.id] = { MLB, FARM };
    if (MLB !== REQUIRED_MLB_PLAYERS_PER_TEAM || FARM !== REQUIRED_FARM_PLAYERS_PER_TEAM) {
      issues.push(
        `${team.name}: expected ${REQUIRED_MLB_PLAYERS_PER_TEAM} MLB and ${REQUIRED_FARM_PLAYERS_PER_TEAM} FARM players; found ${MLB} MLB and ${FARM} FARM.`,
      );
    }
  }

  if (issues.length > 0) {
    throw new Error(`Invalid Mode 1 roster handoff. ${issues.join(' ')}`);
  }

  return {
    mlbPlayersPerTeam: REQUIRED_MLB_PLAYERS_PER_TEAM,
    farmPlayersPerTeam: REQUIRED_FARM_PLAYERS_PER_TEAM,
    validationStatus: 'passed',
    teamCounts,
  };
}

function buildSalaryBaselineProof(
  leagueId: string,
  teams: Team[],
  players: Player[],
): FranchiseSalaryBaselineProof {
  const teamIds = new Set(teams.map((team) => team.id));
  const teamPayrolls: Record<string, number> = {};
  for (const team of teams) teamPayrolls[team.id] = 0;

  for (const player of players) {
    const assignment = player.leagueAssignments?.find((candidate) =>
      candidate.leagueId === leagueId &&
      candidate.teamId &&
      teamIds.has(candidate.teamId) &&
      (candidate.rosterStatus === 'MLB' || candidate.rosterStatus === 'FARM'),
    );
    if (!assignment?.teamId) continue;
    teamPayrolls[assignment.teamId] += Number(player.salary) || 0;
  }

  const totalSalary = Object.values(teamPayrolls).reduce((sum, salary) => sum + salary, 0);
  const salariedPlayerCount = players.filter((player) =>
    Number.isFinite(Number(player.salary)) && Number(player.salary) > 0,
  ).length;

  return {
    calculationVersion: FRANCHISE_INITIAL_SALARY_CALCULATION_VERSION,
    playerCount: players.length,
    salariedPlayerCount,
    totalSalary,
    teamPayrolls,
  };
}

function buildTeamStadiumSnapshots(teams: Team[]): FranchiseTeamStadiumSnapshot[] {
  return teams.map((team) => ({
    teamId: team.id,
    teamName: team.name,
    stadium: team.stadium,
    stadiumId: team.stadiumId,
    hasSeedParkFactors: Boolean(team.parkFactors),
  }));
}

export async function deepCopyLeagueToFranchise(
  franchiseId: string,
  leagueId: string,
  options: DeepCopyLeagueToFranchiseOptions = {},
): Promise<DeepCopyLeagueToFranchiseResult> {
  const leagueTemplate = await getLeagueTemplate(leagueId);
  if (!leagueTemplate) {
    throw new Error(`League template "${leagueId}" not found`);
  }

  const [allPlayers, allTeams, db] = await Promise.all([
    getAllPlayers(),
    getAllTeams(),
    initFranchiseDatabase(franchiseId),
  ]);

  const sourceTeams = leagueTemplate.teamIds.map((teamId) => {
    const team = allTeams.find((candidate) => candidate.id === teamId);
    if (!team) {
      throw new Error(`Team "${teamId}" not found for league "${leagueId}"`);
    }
    return team;
  });

  const teamRosterEntries = await Promise.all(
    sourceTeams.map(async (team) => [team.id, await getTeamRoster(team.id)] as const),
  );
  const teamRostersByTeamId = new Map(teamRosterEntries);
  const teamsToCopy = sourceTeams.map((team) =>
    mergeTeamRosterIntoTeam(
      team,
      teamRostersByTeamId.get(team.id) ?? null,
      options.teamControl?.[team.id],
    ),
  );

  const playersInLeague = allPlayers.filter((player) =>
    player.leagueAssignments?.some((assignment) => assignment.leagueId === leagueId),
  );

  const playersToCopy = await Promise.all(
    playersInLeague.map(async (player) => {
      const effectivePlayer = await getEffectivePlayer(player.id, leagueId);
      if (!effectivePlayer) {
        throw new Error(`Player "${player.id}" could not be resolved for league "${leagueId}"`);
      }

      const franchisePlayer = withInitialFranchiseSalary({
        ...effectivePlayer,
        leagueAssignments: (effectivePlayer.leagueAssignments ?? []).filter(
          (assignment) => assignment.leagueId === leagueId,
        ),
        editHistory: [],
      } satisfies Player);

      return applyFranchiseRosterStatus(franchisePlayer, leagueId, teamRostersByTeamId);
    }),
  );

  const rosterRequirements = validateV1RosterHandoff(leagueId, teamsToCopy, playersToCopy);
  const salaryBaseline = buildSalaryBaselineProof(leagueId, teamsToCopy, playersToCopy);
  const stadiums = buildTeamStadiumSnapshots(teamsToCopy);

  // Push tombstones for existing records before clearing
  if (!syncEngine.isSuppressed()) {
    const dbName = getFranchiseDatabaseName(franchiseId);
    const existingPlayers = await getAllFranchisePlayers(franchiseId);
    const existingTeams = await getAllFranchiseTeams(franchiseId);
    for (const p of existingPlayers) syncEngine.remove(dbName, 'players', p.id);
    for (const t of existingTeams) syncEngine.remove(dbName, 'teams', t.id);
  }

  const tx = db.transaction([STORES.PLAYERS, STORES.TEAMS], 'readwrite');
  const playerStore = tx.objectStore(STORES.PLAYERS);
  const teamStore = tx.objectStore(STORES.TEAMS);

  playerStore.clear();
  teamStore.clear();

  for (const player of playersToCopy) {
    playerStore.put(player);
  }

  for (const team of teamsToCopy) {
    teamStore.put(team);
  }

  await transactionToPromise(tx);

  if (!syncEngine.isSuppressed()) {
    const dbName = getFranchiseDatabaseName(franchiseId);
    for (const player of playersToCopy) syncEngine.upsert(dbName, 'players', player.id, player);
    for (const team of teamsToCopy) syncEngine.upsert(dbName, 'teams', team.id, team);
  }

  const seasonNumber = options.seasonNumber ?? 1;
  const seasonId = options.seasonId ?? getFranchiseSeasonId(franchiseId, seasonNumber);
  const farmPlayers = playersToCopy.filter((player) =>
    player.leagueAssignments?.some((assignment) =>
      assignment.leagueId === leagueId &&
      assignment.teamId &&
      assignment.rosterStatus === 'FARM',
    ),
  );

  const createdFarmRecords: FranchiseFarmRecord[] = [];
  try {
    for (const player of farmPlayers) {
      const assignment = player.leagueAssignments?.find((candidate) =>
        candidate.leagueId === leagueId &&
        candidate.teamId &&
        candidate.rosterStatus === 'FARM',
      );
      if (!assignment?.teamId) continue;
      const record = await saveFranchiseFarmRecord({
        franchiseId,
        seasonId,
        seasonNumber,
        teamId: assignment.teamId,
        playerId: player.id,
        rosterLevel: 'AAA',
        optionsUsed: player.optionsUsedBySeason?.[seasonId] ?? 0,
        optionDates: player.optionDatesBySeason?.[seasonId] ?? [],
        ratingRevealState: player.ratingRevealState ?? 'hidden',
      });
      createdFarmRecords.push(record);
    }
  } catch (error) {
    for (const record of createdFarmRecords) {
      await deleteFranchiseFarmRecord(
        record.franchiseId,
        record.seasonId,
        record.teamId,
        record.playerId,
      );
    }
    throw error;
  }

  return {
    rosterRequirements,
    salaryBaseline,
    stadiums,
  };
}
