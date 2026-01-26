/**
 * Player Ratings Storage - IndexedDB
 * Per Ralph Framework S-A007, GAP-001
 *
 * Provides persistent storage for player ratings.
 * Supports CRUD operations for batter and pitcher ratings.
 */

// ============================================
// DATABASE SETUP
// ============================================

const DB_NAME = 'kbl-player-data';
const DB_VERSION = 1;

const STORES = {
  PLAYER_RATINGS: 'playerRatings',
} as const;

let dbInstance: IDBDatabase | null = null;

// ============================================
// TYPES
// ============================================

export interface BatterRatings {
  power: number;
  contact: number;
  speed: number;
  fielding: number;
  arm: number;
}

export interface PitcherRatings {
  velocity: number;
  junk: number;
  accuracy: number;
}

export interface PlayerRatings {
  playerId: string;
  batterRatings: BatterRatings;
  pitcherRatings?: PitcherRatings;
  isPitcher: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PlayerRatingsInput {
  playerId: string;
  batterRatings: BatterRatings;
  pitcherRatings?: PitcherRatings;
  isPitcher: boolean;
}

// ============================================
// DATABASE INITIALIZATION
// ============================================

/**
 * Initialize the player data database
 */
export async function initRatingsDB(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('[RatingsStorage] Failed to open database:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(STORES.PLAYER_RATINGS)) {
        const store = db.createObjectStore(STORES.PLAYER_RATINGS, { keyPath: 'playerId' });
        store.createIndex('by_updated', 'updatedAt', { unique: false });
        store.createIndex('by_pitcher', 'isPitcher', { unique: false });
      }
    };
  });
}

// ============================================
// VALIDATION
// ============================================

/**
 * Validate a rating value is in range 0-99
 */
export function isValidRating(value: number): boolean {
  return Number.isInteger(value) && value >= 0 && value <= 99;
}

/**
 * Validate all batter ratings
 */
function validateBatterRatings(ratings: BatterRatings): boolean {
  return (
    isValidRating(ratings.power) &&
    isValidRating(ratings.contact) &&
    isValidRating(ratings.speed) &&
    isValidRating(ratings.fielding) &&
    isValidRating(ratings.arm)
  );
}

/**
 * Validate all pitcher ratings
 */
function validatePitcherRatings(ratings: PitcherRatings): boolean {
  return (
    isValidRating(ratings.velocity) &&
    isValidRating(ratings.junk) &&
    isValidRating(ratings.accuracy)
  );
}

// ============================================
// CRUD OPERATIONS
// ============================================

/**
 * Create or update player ratings
 */
export async function savePlayerRatings(input: PlayerRatingsInput): Promise<PlayerRatings> {
  const db = await initRatingsDB();

  // Validate batter ratings
  if (!validateBatterRatings(input.batterRatings)) {
    throw new Error('Invalid batter ratings - all values must be integers 0-99');
  }

  // Validate pitcher ratings if provided
  if (input.pitcherRatings && !validatePitcherRatings(input.pitcherRatings)) {
    throw new Error('Invalid pitcher ratings - all values must be integers 0-99');
  }

  const now = new Date().toISOString();
  const existing = await getPlayerRatings(input.playerId);

  const entry: PlayerRatings = {
    playerId: input.playerId,
    batterRatings: input.batterRatings,
    pitcherRatings: input.pitcherRatings,
    isPitcher: input.isPitcher,
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.PLAYER_RATINGS, 'readwrite');
    const store = transaction.objectStore(STORES.PLAYER_RATINGS);
    const request = store.put(entry);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(entry);
  });
}

/**
 * Get ratings for a specific player
 */
export async function getPlayerRatings(playerId: string): Promise<PlayerRatings | null> {
  const db = await initRatingsDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.PLAYER_RATINGS, 'readonly');
    const store = transaction.objectStore(STORES.PLAYER_RATINGS);
    const request = store.get(playerId);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || null);
  });
}

/**
 * Get all player ratings
 */
export async function getAllPlayerRatings(): Promise<PlayerRatings[]> {
  const db = await initRatingsDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.PLAYER_RATINGS, 'readonly');
    const store = transaction.objectStore(STORES.PLAYER_RATINGS);
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || []);
  });
}

/**
 * Delete player ratings
 */
export async function deletePlayerRatings(playerId: string): Promise<boolean> {
  const db = await initRatingsDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.PLAYER_RATINGS, 'readwrite');
    const store = transaction.objectStore(STORES.PLAYER_RATINGS);
    const request = store.delete(playerId);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(true);
  });
}

/**
 * Check if ratings exist for a player
 */
export async function hasPlayerRatings(playerId: string): Promise<boolean> {
  const ratings = await getPlayerRatings(playerId);
  return ratings !== null;
}

/**
 * Get all pitcher ratings
 */
export async function getPitcherRatings(): Promise<PlayerRatings[]> {
  const all = await getAllPlayerRatings();
  return all.filter((r) => r.isPitcher);
}

/**
 * Get all batter ratings (non-pitchers)
 */
export async function getBatterRatings(): Promise<PlayerRatings[]> {
  const all = await getAllPlayerRatings();
  return all.filter((r) => !r.isPitcher);
}

/**
 * Clear all ratings (for testing/reset)
 */
export async function clearAllRatings(): Promise<void> {
  const db = await initRatingsDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.PLAYER_RATINGS, 'readwrite');
    const store = transaction.objectStore(STORES.PLAYER_RATINGS);
    const request = store.clear();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * Get ratings count
 */
export async function getRatingsCount(): Promise<number> {
  const db = await initRatingsDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.PLAYER_RATINGS, 'readonly');
    const store = transaction.objectStore(STORES.PLAYER_RATINGS);
    const request = store.count();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}
