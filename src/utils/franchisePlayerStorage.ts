import {
  getAllPlayers,
  getAllTeams,
  getLeagueTemplate,
  type Player,
  type Team,
} from './leagueBuilderStorage';
import {
  markOptimalLineupSnapshotsStaleForChange,
  OPTIMAL_LINEUP_SNAPSHOT_FIELDS,
} from './optimalLineup';
import { getEffectivePlayer } from './playerOverrides';
import { syncEngine } from './syncEngine';

export type { Player, Team } from './leagueBuilderStorage';

const DB_VERSION = 1;

const STORES = {
  PLAYERS: 'players',
  TEAMS: 'teams',
} as const;

const franchiseDbPromises = new Map<string, Promise<IDBDatabase>>();
const franchiseDbInstances = new Map<string, IDBDatabase>();

function getFranchiseDatabaseName(franchiseId: string): string {
  return `kbl-franchise-${franchiseId}`;
}

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

  if (!syncEngine.isSuppressed()) syncEngine.upsert(`kbl-franchise-${franchiseId}`, 'players', fullPlayer.id, fullPlayer);

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

  if (!syncEngine.isSuppressed()) syncEngine.upsert(`kbl-franchise-${franchiseId}`, 'teams', fullTeam.id, fullTeam);

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

export async function deepCopyLeagueToFranchise(franchiseId: string, leagueId: string): Promise<void> {
  const leagueTemplate = await getLeagueTemplate(leagueId);
  if (!leagueTemplate) {
    throw new Error(`League template "${leagueId}" not found`);
  }

  const [allPlayers, allTeams, db] = await Promise.all([
    getAllPlayers(),
    getAllTeams(),
    initFranchiseDatabase(franchiseId),
  ]);

  const teamsToCopy = leagueTemplate.teamIds.map((teamId) => {
    const team = allTeams.find((candidate) => candidate.id === teamId);
    if (!team) {
      throw new Error(`Team "${teamId}" not found for league "${leagueId}"`);
    }
    return team;
  });

  const playersInLeague = allPlayers.filter((player) =>
    player.leagueAssignments?.some((assignment) => assignment.leagueId === leagueId),
  );

  const playersToCopy = await Promise.all(
    playersInLeague.map(async (player) => {
      const effectivePlayer = await getEffectivePlayer(player.id, leagueId);
      if (!effectivePlayer) {
        throw new Error(`Player "${player.id}" could not be resolved for league "${leagueId}"`);
      }

      return {
        ...effectivePlayer,
        leagueAssignments: (effectivePlayer.leagueAssignments ?? []).filter(
          (assignment) => assignment.leagueId === leagueId,
        ),
        editHistory: [],
      } satisfies Player;
    }),
  );

  // Push tombstones for existing records before clearing
  if (!syncEngine.isSuppressed()) {
    const dbName = `kbl-franchise-${franchiseId}`;
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
    const dbName = `kbl-franchise-${franchiseId}`;
    for (const player of playersToCopy) syncEngine.upsert(dbName, 'players', player.id, player);
    for (const team of teamsToCopy) syncEngine.upsert(dbName, 'teams', team.id, team);
  }
}
