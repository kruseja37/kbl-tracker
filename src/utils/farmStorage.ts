/**
 * Farm System Storage - IndexedDB
 * Per Ralph Framework GAP-051
 *
 * Provides persistent storage for minor league (farm) rosters.
 * Tracks players assigned to farm system separate from MLB roster.
 */

// ============================================
// TYPES
// ============================================

export type RosterLevel = 'MLB' | 'AAA' | 'AA' | 'A';

export interface FarmPlayer {
  playerId: string;
  playerName: string;
  teamId: string;
  level: RosterLevel;
  assignedAt: Date;
  developmentNotes?: string;
}

export interface FarmRoster {
  teamId: string;
  players: FarmPlayer[];
  lastUpdated: Date;
}

// ============================================
// DATABASE SETUP
// ============================================

const DB_NAME = 'kbl-farm';
const DB_VERSION = 1;

const STORES = {
  FARM_PLAYERS: 'farmPlayers',
} as const;

let dbInstance: IDBDatabase | null = null;

// ============================================
// DATABASE INITIALIZATION
// ============================================

/**
 * Initialize the farm database
 */
export async function initFarmDB(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('[FarmStorage] Failed to open database:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(STORES.FARM_PLAYERS)) {
        const store = db.createObjectStore(STORES.FARM_PLAYERS, { keyPath: 'playerId' });
        store.createIndex('by_team', 'teamId', { unique: false });
        store.createIndex('by_level', 'level', { unique: false });
      }
    };
  });
}

// ============================================
// CRUD OPERATIONS
// ============================================

/**
 * Assign a player to farm system
 */
export async function assignToFarm(
  playerId: string,
  playerName: string,
  teamId: string,
  level: RosterLevel = 'AAA'
): Promise<FarmPlayer> {
  const db = await initFarmDB();

  const farmPlayer: FarmPlayer = {
    playerId,
    playerName,
    teamId,
    level,
    assignedAt: new Date(),
  };

  // Convert Date for storage
  const stored = {
    ...farmPlayer,
    assignedAt: farmPlayer.assignedAt.getTime(),
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.FARM_PLAYERS, 'readwrite');
    const store = transaction.objectStore(STORES.FARM_PLAYERS);
    const request = store.put(stored);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(farmPlayer);
  });
}

/**
 * Get a farm player by ID
 */
export async function getFarmPlayer(playerId: string): Promise<FarmPlayer | null> {
  const db = await initFarmDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.FARM_PLAYERS, 'readonly');
    const store = transaction.objectStore(STORES.FARM_PLAYERS);
    const request = store.get(playerId);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      if (request.result) {
        resolve({
          ...request.result,
          assignedAt: new Date(request.result.assignedAt),
        });
      } else {
        resolve(null);
      }
    };
  });
}

/**
 * Get all farm players
 */
export async function getAllFarmPlayers(): Promise<FarmPlayer[]> {
  const db = await initFarmDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.FARM_PLAYERS, 'readonly');
    const store = transaction.objectStore(STORES.FARM_PLAYERS);
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const results = (request.result || []).map(
        (r: FarmPlayer & { assignedAt: number }) => ({
          ...r,
          assignedAt: new Date(r.assignedAt),
        })
      );
      resolve(results);
    };
  });
}

/**
 * Get farm players for a specific team (AC-3: separate from MLB)
 */
export async function getTeamFarmPlayers(teamId: string): Promise<FarmPlayer[]> {
  const all = await getAllFarmPlayers();
  return all.filter((p) => p.teamId === teamId);
}

/**
 * Get farm players at a specific level
 */
export async function getPlayersByLevel(level: RosterLevel): Promise<FarmPlayer[]> {
  const all = await getAllFarmPlayers();
  return all.filter((p) => p.level === level);
}

/**
 * Get team farm roster organized by level
 */
export async function getTeamFarmRoster(teamId: string): Promise<FarmRoster> {
  const players = await getTeamFarmPlayers(teamId);

  return {
    teamId,
    players,
    lastUpdated: new Date(),
  };
}

/**
 * Check if player is on farm (AC-3: distinct lists)
 */
export async function isPlayerOnFarm(playerId: string): Promise<boolean> {
  const player = await getFarmPlayer(playerId);
  return player !== null;
}

/**
 * Call up player from farm (remove from farm system)
 */
export async function callUpPlayer(playerId: string): Promise<boolean> {
  const db = await initFarmDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.FARM_PLAYERS, 'readwrite');
    const store = transaction.objectStore(STORES.FARM_PLAYERS);
    const request = store.delete(playerId);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(true);
  });
}

/**
 * Update player's farm level
 */
export async function updateFarmLevel(
  playerId: string,
  newLevel: RosterLevel
): Promise<FarmPlayer | null> {
  const player = await getFarmPlayer(playerId);
  if (!player) return null;

  const updated = { ...player, level: newLevel };
  const db = await initFarmDB();

  const stored = {
    ...updated,
    assignedAt: updated.assignedAt.getTime(),
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.FARM_PLAYERS, 'readwrite');
    const store = transaction.objectStore(STORES.FARM_PLAYERS);
    const request = store.put(stored);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(updated);
  });
}

/**
 * Add development notes to farm player
 */
export async function updateDevelopmentNotes(
  playerId: string,
  notes: string
): Promise<FarmPlayer | null> {
  const player = await getFarmPlayer(playerId);
  if (!player) return null;

  const updated = { ...player, developmentNotes: notes };
  const db = await initFarmDB();

  const stored = {
    ...updated,
    assignedAt: updated.assignedAt.getTime(),
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.FARM_PLAYERS, 'readwrite');
    const store = transaction.objectStore(STORES.FARM_PLAYERS);
    const request = store.put(stored);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(updated);
  });
}

/**
 * Clear all farm data (for testing/reset)
 */
export async function clearAllFarmData(): Promise<void> {
  const db = await initFarmDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.FARM_PLAYERS, 'readwrite');
    const store = transaction.objectStore(STORES.FARM_PLAYERS);
    const request = store.clear();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * Get farm player count
 */
export async function getFarmPlayerCount(): Promise<number> {
  const db = await initFarmDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.FARM_PLAYERS, 'readonly');
    const store = transaction.objectStore(STORES.FARM_PLAYERS);
    const request = store.count();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

/**
 * Get farm roster counts by level for a team
 */
export async function getTeamFarmCounts(
  teamId: string
): Promise<Record<RosterLevel, number>> {
  const players = await getTeamFarmPlayers(teamId);

  const counts: Record<RosterLevel, number> = {
    MLB: 0, // Should always be 0 in farm
    AAA: 0,
    AA: 0,
    A: 0,
  };

  for (const player of players) {
    counts[player.level]++;
  }

  return counts;
}
