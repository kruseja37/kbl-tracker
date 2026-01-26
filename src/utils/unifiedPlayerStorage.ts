/**
 * Unified Player Storage - IndexedDB
 * Per Ralph Framework GAP-003
 *
 * Provides unified storage for all players (custom and database).
 * Migrates legacy localStorage players on first load.
 */

import type { Position, BatterHand } from '../types/game';
import type { Gender, PlayerRole, PitcherRole, PlayerTraits } from '../data/playerDatabase';

// ============================================
// DATABASE SETUP
// ============================================

const DB_NAME = 'kbl-player-data';
const DB_VERSION = 2; // Bumped to add players store
const LEGACY_STORAGE_KEY = 'kbl-custom-players';

const STORES = {
  PLAYER_RATINGS: 'playerRatings',
  PLAYERS: 'players',
} as const;

let dbInstance: IDBDatabase | null = null;
let migrationComplete = false;

// ============================================
// TYPES
// ============================================

export type ThrowHand = 'L' | 'R';

export interface UnifiedPlayer {
  id: string;
  name: string;
  teamId: string;

  // Demographics
  age: number;
  gender: Gender;
  bats: BatterHand;
  throws: ThrowHand;

  // Position info
  position: Position;
  secondaryPosition?: Position;
  isPitcher: boolean;
  pitcherRole?: PitcherRole;
  role: PlayerRole;

  // Ratings
  overall: string;
  batterRatings: {
    power: number;
    contact: number;
    speed: number;
    fielding: number;
    arm: number;
  };
  pitcherRatings?: {
    velocity: number;
    junk: number;
    accuracy: number;
  };

  // Chemistry and traits
  chemistry: string;
  traits: PlayerTraits;

  // Arsenal (for pitchers)
  arsenal?: string[];

  // Salary
  salary: number;

  // Source tracking
  sourcePlayerId?: string;
  originalTeamId?: string;
  isCustom: boolean; // true for user-created, false for database imports

  // Timestamps
  createdAt: number;
  updatedAt: number;
}

// ============================================
// DATABASE INITIALIZATION
// ============================================

/**
 * Initialize the unified player database
 */
export async function initUnifiedPlayerDB(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('[UnifiedPlayerStorage] Failed to open database:', request.error);
      reject(request.error);
    };

    request.onsuccess = async () => {
      dbInstance = request.result;
      // Run migration after DB is open
      if (!migrationComplete) {
        await migrateFromLocalStorage();
        migrationComplete = true;
      }
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Player ratings store (from version 1)
      if (!db.objectStoreNames.contains(STORES.PLAYER_RATINGS)) {
        const ratingsStore = db.createObjectStore(STORES.PLAYER_RATINGS, { keyPath: 'playerId' });
        ratingsStore.createIndex('by_updated', 'updatedAt', { unique: false });
        ratingsStore.createIndex('by_pitcher', 'isPitcher', { unique: false });
      }

      // Unified players store (new in version 2)
      if (!db.objectStoreNames.contains(STORES.PLAYERS)) {
        const playersStore = db.createObjectStore(STORES.PLAYERS, { keyPath: 'id' });
        playersStore.createIndex('by_team', 'teamId', { unique: false });
        playersStore.createIndex('by_position', 'position', { unique: false });
        playersStore.createIndex('by_custom', 'isCustom', { unique: false });
        playersStore.createIndex('by_name', 'name', { unique: false });
      }
    };
  });
}

// ============================================
// MIGRATION
// ============================================

/**
 * Migrate players from localStorage to IndexedDB
 */
async function migrateFromLocalStorage(): Promise<void> {
  try {
    const stored = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!stored) return;

    const legacyPlayers = JSON.parse(stored) as Array<{
      id: string;
      name: string;
      teamId: string;
      age: number;
      gender: Gender;
      bats: BatterHand;
      throws: ThrowHand;
      position: Position;
      secondaryPosition?: Position;
      isPitcher: boolean;
      pitcherRole?: PitcherRole;
      role: PlayerRole;
      overall: string;
      batterRatings: {
        power: number;
        contact: number;
        speed: number;
        fielding: number;
        arm: number;
      };
      pitcherRatings?: {
        velocity: number;
        junk: number;
        accuracy: number;
      };
      chemistry: string;
      traits: PlayerTraits;
      arsenal?: string[];
      salary: number;
      sourcePlayerId?: string;
      originalTeamId?: string;
      createdAt: number;
    }>;

    if (legacyPlayers.length === 0) return;

    console.log(`[UnifiedPlayerStorage] Migrating ${legacyPlayers.length} players from localStorage`);

    const now = Date.now();
    for (const legacy of legacyPlayers) {
      const unified: UnifiedPlayer = {
        ...legacy,
        isCustom: true,
        updatedAt: legacy.createdAt || now,
      };

      await savePlayer(unified, true); // skipInit to avoid recursion
    }

    // Clear legacy storage after successful migration
    localStorage.removeItem(LEGACY_STORAGE_KEY);
    console.log('[UnifiedPlayerStorage] Migration complete, localStorage cleared');
  } catch (err) {
    console.error('[UnifiedPlayerStorage] Migration failed:', err);
  }
}

// ============================================
// CRUD OPERATIONS
// ============================================

/**
 * Save a player (create or update)
 */
export async function savePlayer(player: UnifiedPlayer, skipInit = false): Promise<UnifiedPlayer> {
  const db = skipInit ? dbInstance! : await initUnifiedPlayerDB();

  const entry: UnifiedPlayer = {
    ...player,
    updatedAt: Date.now(),
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.PLAYERS, 'readwrite');
    const store = transaction.objectStore(STORES.PLAYERS);
    const request = store.put(entry);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(entry);
  });
}

/**
 * Get a specific player by ID
 */
export async function getPlayer(playerId: string): Promise<UnifiedPlayer | null> {
  const db = await initUnifiedPlayerDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.PLAYERS, 'readonly');
    const store = transaction.objectStore(STORES.PLAYERS);
    const request = store.get(playerId);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || null);
  });
}

/**
 * Get all players
 */
export async function getAllPlayers(): Promise<UnifiedPlayer[]> {
  const db = await initUnifiedPlayerDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.PLAYERS, 'readonly');
    const store = transaction.objectStore(STORES.PLAYERS);
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || []);
  });
}

/**
 * Get all custom (user-created) players
 */
export async function getCustomPlayers(): Promise<UnifiedPlayer[]> {
  const all = await getAllPlayers();
  return all.filter((p) => p.isCustom);
}

/**
 * Get players by team
 */
export async function getPlayersByTeam(teamId: string): Promise<UnifiedPlayer[]> {
  const db = await initUnifiedPlayerDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.PLAYERS, 'readonly');
    const store = transaction.objectStore(STORES.PLAYERS);
    const index = store.index('by_team');
    const request = index.getAll(teamId);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || []);
  });
}

/**
 * Get players by position
 */
export async function getPlayersByPosition(position: Position): Promise<UnifiedPlayer[]> {
  const db = await initUnifiedPlayerDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.PLAYERS, 'readonly');
    const store = transaction.objectStore(STORES.PLAYERS);
    const index = store.index('by_position');
    const request = index.getAll(position);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || []);
  });
}

/**
 * Delete a player
 */
export async function deletePlayer(playerId: string): Promise<boolean> {
  const db = await initUnifiedPlayerDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.PLAYERS, 'readwrite');
    const store = transaction.objectStore(STORES.PLAYERS);
    const request = store.delete(playerId);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(true);
  });
}

/**
 * Check if a player exists
 */
export async function hasPlayer(playerId: string): Promise<boolean> {
  const player = await getPlayer(playerId);
  return player !== null;
}

/**
 * Get player count
 */
export async function getPlayerCount(): Promise<number> {
  const db = await initUnifiedPlayerDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.PLAYERS, 'readonly');
    const store = transaction.objectStore(STORES.PLAYERS);
    const request = store.count();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

/**
 * Clear all players (for testing/reset)
 */
export async function clearAllPlayers(): Promise<void> {
  const db = await initUnifiedPlayerDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.PLAYERS, 'readwrite');
    const store = transaction.objectStore(STORES.PLAYERS);
    const request = store.clear();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * Search players by name (partial match)
 */
export async function searchPlayersByName(query: string): Promise<UnifiedPlayer[]> {
  const all = await getAllPlayers();
  const lowerQuery = query.toLowerCase();
  return all.filter((p) => p.name.toLowerCase().includes(lowerQuery));
}

/**
 * Generate a unique player ID
 */
export function generatePlayerId(): string {
  return `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Validate player data
 */
export function validatePlayer(player: Partial<UnifiedPlayer>): { valid: boolean; error?: string } {
  if (!player.name?.trim()) {
    return { valid: false, error: 'Player name is required' };
  }
  if (!player.position) {
    return { valid: false, error: 'Position is required' };
  }
  if (player.age !== undefined && (player.age < 18 || player.age > 50)) {
    return { valid: false, error: 'Age must be between 18 and 50' };
  }
  return { valid: true };
}
