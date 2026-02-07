/**
 * Manager Storage Utility
 * Per MWAR_CALCULATION_SPEC.md
 *
 * Provides IndexedDB storage for manager profiles, decisions, and season stats.
 * Uses a separate database to avoid version conflicts with existing game/season stores.
 */

import type {
  ManagerDecision,
  ManagerSeasonStats,
  ManagerProfile,
} from '../engines/mwarCalculator';

import {
  createManagerSeasonStats,
  addDecisionToSeasonStats,
  recalculateSeasonStats,
} from '../engines/mwarCalculator';

const DB_NAME = 'kbl-manager';
const DB_VERSION = 1;

// Store names
const STORES = {
  MANAGER_PROFILES: 'managerProfiles',
  MANAGER_DECISIONS: 'managerDecisions',
  MANAGER_SEASON_STATS: 'managerSeasonStats',
} as const;

// ============================================
// DATABASE INITIALIZATION
// ============================================

let dbInstance: IDBDatabase | null = null;

/**
 * Initialize the manager IndexedDB database
 */
export async function initManagerDB(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('[managerStorage] Failed to open database:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Manager profiles (career data)
      if (!db.objectStoreNames.contains(STORES.MANAGER_PROFILES)) {
        const profileStore = db.createObjectStore(STORES.MANAGER_PROFILES, { keyPath: 'id' });
        profileStore.createIndex('teamId', 'teamId', { unique: false });
      }

      // Individual decisions per game
      if (!db.objectStoreNames.contains(STORES.MANAGER_DECISIONS)) {
        const decisionStore = db.createObjectStore(STORES.MANAGER_DECISIONS, { keyPath: 'decisionId' });
        decisionStore.createIndex('gameId', 'gameId', { unique: false });
        decisionStore.createIndex('managerId', 'managerId', { unique: false });
      }

      // Season-level aggregated stats
      if (!db.objectStoreNames.contains(STORES.MANAGER_SEASON_STATS)) {
        const seasonStore = db.createObjectStore(STORES.MANAGER_SEASON_STATS, { keyPath: ['seasonId', 'managerId'] });
        seasonStore.createIndex('seasonId', 'seasonId', { unique: false });
        seasonStore.createIndex('managerId', 'managerId', { unique: false });
      }
    };
  });
}

// ============================================
// MANAGER PROFILES (Career Data)
// ============================================

/**
 * Save or update a manager profile
 */
export async function saveManagerProfile(profile: ManagerProfile): Promise<void> {
  const db = await initManagerDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.MANAGER_PROFILES, 'readwrite');
    const store = tx.objectStore(STORES.MANAGER_PROFILES);
    const request = store.put(profile);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get a manager profile by ID
 */
export async function getManagerProfile(managerId: string): Promise<ManagerProfile | null> {
  const db = await initManagerDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.MANAGER_PROFILES, 'readonly');
    const store = tx.objectStore(STORES.MANAGER_PROFILES);
    const request = store.get(managerId);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get all manager profiles
 */
export async function getAllManagerProfiles(): Promise<ManagerProfile[]> {
  const db = await initManagerDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.MANAGER_PROFILES, 'readonly');
    const store = tx.objectStore(STORES.MANAGER_PROFILES);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

// ============================================
// MANAGER DECISIONS (Per-Game)
// ============================================

/**
 * Save an individual manager decision
 */
export async function saveManagerDecision(decision: ManagerDecision): Promise<void> {
  const db = await initManagerDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.MANAGER_DECISIONS, 'readwrite');
    const store = tx.objectStore(STORES.MANAGER_DECISIONS);
    const request = store.put(decision);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Save multiple decisions at once (batch for game-end persistence)
 */
export async function saveGameDecisions(decisions: ManagerDecision[]): Promise<void> {
  if (decisions.length === 0) return;
  const db = await initManagerDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.MANAGER_DECISIONS, 'readwrite');
    const store = tx.objectStore(STORES.MANAGER_DECISIONS);
    for (const decision of decisions) {
      store.put(decision);
    }
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Get all decisions for a specific game
 */
export async function getGameDecisions(gameId: string): Promise<ManagerDecision[]> {
  const db = await initManagerDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.MANAGER_DECISIONS, 'readonly');
    const store = tx.objectStore(STORES.MANAGER_DECISIONS);
    const index = store.index('gameId');
    const request = index.getAll(gameId);
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get all decisions for a specific manager
 */
export async function getManagerDecisions(managerId: string): Promise<ManagerDecision[]> {
  const db = await initManagerDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.MANAGER_DECISIONS, 'readonly');
    const store = tx.objectStore(STORES.MANAGER_DECISIONS);
    const index = store.index('managerId');
    const request = index.getAll(managerId);
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

// ============================================
// MANAGER SEASON STATS
// ============================================

/**
 * Save or update manager season stats
 */
export async function saveManagerSeasonStats(stats: ManagerSeasonStats): Promise<void> {
  const db = await initManagerDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.MANAGER_SEASON_STATS, 'readwrite');
    const store = tx.objectStore(STORES.MANAGER_SEASON_STATS);
    const request = store.put(stats);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get season stats for a specific manager in a specific season
 */
export async function getManagerSeasonStats(
  seasonId: string,
  managerId: string,
): Promise<ManagerSeasonStats | null> {
  const db = await initManagerDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.MANAGER_SEASON_STATS, 'readonly');
    const store = tx.objectStore(STORES.MANAGER_SEASON_STATS);
    const request = store.get([seasonId, managerId]);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get all manager season stats for a given season (for MOY voting)
 */
export async function getAllManagerSeasonStatsForSeason(
  seasonId: string,
): Promise<ManagerSeasonStats[]> {
  const db = await initManagerDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.MANAGER_SEASON_STATS, 'readonly');
    const store = tx.objectStore(STORES.MANAGER_SEASON_STATS);
    const index = store.index('seasonId');
    const request = index.getAll(seasonId);
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

// ============================================
// AGGREGATION HELPERS
// ============================================

/**
 * Get or create manager season stats (initializes if not exists)
 */
export async function getOrCreateManagerSeasonStats(
  seasonId: string,
  managerId: string,
  teamId: string,
): Promise<ManagerSeasonStats> {
  const existing = await getManagerSeasonStats(seasonId, managerId);
  if (existing) return existing;

  const newStats = createManagerSeasonStats(seasonId, managerId, teamId);
  await saveManagerSeasonStats(newStats);
  return newStats;
}

/**
 * Aggregate a game's decisions into season stats and recalculate mWAR.
 *
 * Call this at game end after all decisions are saved.
 */
export async function aggregateManagerGameToSeason(
  gameId: string,
  seasonId: string,
  managerId: string,
  teamId: string,
  teamRecord: { wins: number; losses: number },
  teamSalaryScore: number,
  seasonGames: number,
): Promise<ManagerSeasonStats> {
  // 1. Get all decisions for this game
  const gameDecisions = await getGameDecisions(gameId);

  // 2. Get or create season stats
  const seasonStats = await getOrCreateManagerSeasonStats(seasonId, managerId, teamId);

  // 3. Add each decision to season stats
  for (const decision of gameDecisions) {
    addDecisionToSeasonStats(seasonStats, decision);
  }

  // 4. Recalculate mWAR with current team stats
  const teamStats = {
    wins: teamRecord.wins,
    losses: teamRecord.losses,
    salaryScore: teamSalaryScore,
  };
  recalculateSeasonStats(seasonStats, teamStats, seasonGames);

  // 5. Save updated season stats
  await saveManagerSeasonStats(seasonStats);

  return seasonStats;
}

/**
 * Update manager career profile after season ends.
 */
export async function updateManagerCareer(
  managerId: string,
  managerName: string,
  teamId: string,
  seasonStats: ManagerSeasonStats,
): Promise<ManagerProfile> {
  // Get or create profile
  let profile = await getManagerProfile(managerId);
  if (!profile) {
    profile = {
      id: managerId,
      name: managerName,
      teamId,
      careerRecord: { wins: 0, losses: 0 },
      careerMWAR: 0,
      seasonsManaged: 0,
    };
  }

  // Update career totals
  profile.careerRecord.wins += seasonStats.teamRecord?.wins ?? 0;
  profile.careerRecord.losses += seasonStats.teamRecord?.losses ?? 0;
  profile.careerMWAR += seasonStats.mWAR ?? 0;
  profile.seasonsManaged += 1;
  profile.currentSeasonStats = seasonStats;
  profile.teamId = teamId;
  profile.name = managerName;

  await saveManagerProfile(profile);
  return profile;
}
