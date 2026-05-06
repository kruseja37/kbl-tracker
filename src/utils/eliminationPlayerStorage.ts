import {
  getAllPlayers,
  getAllTeams,
  getLeagueTemplate,
  type Player,
  type Team,
} from './leagueBuilderStorage';
import { getEffectivePlayer } from './playerOverrides';

export type { Player, Team } from './leagueBuilderStorage';

const DB_VERSION = 1;

const STORES = {
  PLAYERS: 'players',
  TEAMS: 'teams',
} as const;

const eliminationDbPromises = new Map<string, Promise<IDBDatabase>>();
const eliminationDbInstances = new Map<string, IDBDatabase>();

function getEliminationDatabaseName(bracketId: string): string {
  return `kbl-elimination-${bracketId}`;
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

export async function initEliminationDatabase(bracketId: string): Promise<IDBDatabase> {
  const existingPromise = eliminationDbPromises.get(bracketId);
  if (existingPromise) {
    return existingPromise;
  }

  const dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(getEliminationDatabaseName(bracketId), DB_VERSION);

    request.onerror = () => {
      eliminationDbPromises.delete(bracketId);
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
      eliminationDbInstances.set(bracketId, db);
      db.onclose = () => {
        eliminationDbInstances.delete(bracketId);
        eliminationDbPromises.delete(bracketId);
      };
      db.onversionchange = () => {
        db.close();
        eliminationDbInstances.delete(bracketId);
        eliminationDbPromises.delete(bracketId);
      };
      resolve(db);
    };
  });

  eliminationDbPromises.set(bracketId, dbPromise);
  return dbPromise;
}

export async function getEliminationPlayer(bracketId: string, playerId: string): Promise<Player | null> {
  const db = await initEliminationDatabase(bracketId);
  const tx = db.transaction(STORES.PLAYERS, 'readonly');
  const store = tx.objectStore(STORES.PLAYERS);
  const player = await requestToPromise(store.get(playerId));
  return player ?? null;
}

export async function getAllEliminationPlayers(bracketId: string): Promise<Player[]> {
  const db = await initEliminationDatabase(bracketId);
  const tx = db.transaction(STORES.PLAYERS, 'readonly');
  const store = tx.objectStore(STORES.PLAYERS);
  const players = await requestToPromise(store.getAll());
  return players ?? [];
}

export async function getEliminationPlayersByTeam(bracketId: string, teamId: string): Promise<Player[]> {
  const players = await getAllEliminationPlayers(bracketId);
  return players.filter((player) =>
    player.leagueAssignments?.some((assignment) => assignment.teamId === teamId),
  );
}

/**
 * Reserved/internal API for creating immutable copied run-source records.
 * User-facing elimination roster edits should go through roster snapshots.
 */
export async function saveEliminationPlayer(
  bracketId: string,
  player: Omit<Player, 'id' | 'createdDate' | 'lastModified'> & { id?: string },
): Promise<Player> {
  const db = await initEliminationDatabase(bracketId);
  const now = nowISO();
  const existing = player.id ? await getEliminationPlayer(bracketId, player.id) : null;

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

  return fullPlayer;
}

export async function getEliminationTeam(bracketId: string, teamId: string): Promise<Team | null> {
  const db = await initEliminationDatabase(bracketId);
  const tx = db.transaction(STORES.TEAMS, 'readonly');
  const store = tx.objectStore(STORES.TEAMS);
  const team = await requestToPromise(store.get(teamId));
  return team ?? null;
}

export async function getAllEliminationTeams(bracketId: string): Promise<Team[]> {
  const db = await initEliminationDatabase(bracketId);
  const tx = db.transaction(STORES.TEAMS, 'readonly');
  const store = tx.objectStore(STORES.TEAMS);
  const teams = await requestToPromise(store.getAll());
  return teams ?? [];
}

/**
 * Reserved/internal API for creating immutable copied run-source records.
 * User-facing elimination team edits should go through roster snapshots.
 */
export async function saveEliminationTeam(
  bracketId: string,
  team: Omit<Team, 'id' | 'createdDate' | 'lastModified'> & { id?: string },
): Promise<Team> {
  const db = await initEliminationDatabase(bracketId);
  const now = nowISO();
  const existing = team.id ? await getEliminationTeam(bracketId, team.id) : null;

  const fullTeam: Team = {
    ...team,
    id: team.id || generateId('team'),
    createdDate: existing?.createdDate || now,
    lastModified: now,
  };

  const tx = db.transaction(STORES.TEAMS, 'readwrite');
  tx.objectStore(STORES.TEAMS).put(fullTeam);
  await transactionToPromise(tx);

  return fullTeam;
}

export async function deleteEliminationDatabase(bracketId: string): Promise<void> {
  const openPromise = eliminationDbPromises.get(bracketId);
  if (openPromise) {
    try {
      const db = await openPromise;
      db.close();
    } catch {
      // Ignore open failures and still attempt deletion.
    }
  } else {
    eliminationDbInstances.get(bracketId)?.close();
  }

  eliminationDbInstances.delete(bracketId);
  eliminationDbPromises.delete(bracketId);

  await new Promise<void>((resolve, reject) => {
    const request = indexedDB.deleteDatabase(getEliminationDatabaseName(bracketId));
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
    request.onblocked = () => reject(new Error(`Delete blocked for elimination database "${bracketId}"`));
  });
}

export async function deepCopyLeagueToBracket(bracketId: string, leagueId: string): Promise<void> {
  const leagueTemplate = await getLeagueTemplate(leagueId);
  if (!leagueTemplate) {
    throw new Error(`League template "${leagueId}" not found`);
  }

  const [allPlayers, allTeams, db] = await Promise.all([
    getAllPlayers(),
    getAllTeams(),
    initEliminationDatabase(bracketId),
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
}
