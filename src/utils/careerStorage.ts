/**
 * Career Storage Utility
 * Per MILESTONE_SYSTEM_SPEC.md - Phase 5: Career Stats Aggregation
 *
 * Provides IndexedDB storage for career-level statistics,
 * aggregating season/game stats into career totals.
 * Career stats are updated game-by-game (not end-of-season).
 */

const DB_NAME = 'kbl-tracker';
const DB_VERSION = 3;  // Bump version to add career stores

// Store names
const STORES = {
  // Existing stores
  CURRENT_GAME: 'currentGame',
  COMPLETED_GAMES: 'completedGames',
  PLAYER_SEASON_BATTING: 'playerSeasonBatting',
  PLAYER_SEASON_PITCHING: 'playerSeasonPitching',
  PLAYER_SEASON_FIELDING: 'playerSeasonFielding',
  SEASON_METADATA: 'seasonMetadata',
  // NEW: Career stores
  PLAYER_CAREER_BATTING: 'playerCareerBatting',
  PLAYER_CAREER_PITCHING: 'playerCareerPitching',
  PLAYER_CAREER_FIELDING: 'playerCareerFielding',
  CAREER_MILESTONES: 'careerMilestones',
} as const;

// ============================================
// DATABASE INITIALIZATION
// ============================================

let dbInstance: IDBDatabase | null = null;

/**
 * Initialize the IndexedDB database with career stores
 */
export async function initCareerDatabase(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('Failed to open database:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Existing stores from Phase 2 & 3 (preserved for upgrade path)
      if (!db.objectStoreNames.contains(STORES.CURRENT_GAME)) {
        db.createObjectStore(STORES.CURRENT_GAME, { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains(STORES.COMPLETED_GAMES)) {
        const completedStore = db.createObjectStore(STORES.COMPLETED_GAMES, { keyPath: 'gameId' });
        completedStore.createIndex('date', 'date', { unique: false });
        completedStore.createIndex('seasonId', 'seasonId', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.PLAYER_SEASON_BATTING)) {
        const battingStore = db.createObjectStore(STORES.PLAYER_SEASON_BATTING, {
          keyPath: ['seasonId', 'playerId']
        });
        battingStore.createIndex('playerId', 'playerId', { unique: false });
        battingStore.createIndex('seasonId', 'seasonId', { unique: false });
        battingStore.createIndex('teamId', 'teamId', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.PLAYER_SEASON_PITCHING)) {
        const pitchingStore = db.createObjectStore(STORES.PLAYER_SEASON_PITCHING, {
          keyPath: ['seasonId', 'playerId']
        });
        pitchingStore.createIndex('playerId', 'playerId', { unique: false });
        pitchingStore.createIndex('seasonId', 'seasonId', { unique: false });
        pitchingStore.createIndex('teamId', 'teamId', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.PLAYER_SEASON_FIELDING)) {
        const fieldingStore = db.createObjectStore(STORES.PLAYER_SEASON_FIELDING, {
          keyPath: ['seasonId', 'playerId']
        });
        fieldingStore.createIndex('playerId', 'playerId', { unique: false });
        fieldingStore.createIndex('seasonId', 'seasonId', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORES.SEASON_METADATA)) {
        const metaStore = db.createObjectStore(STORES.SEASON_METADATA, { keyPath: 'seasonId' });
        metaStore.createIndex('status', 'status', { unique: false });
      }

      // NEW: Career batting stats
      if (!db.objectStoreNames.contains(STORES.PLAYER_CAREER_BATTING)) {
        const careerBattingStore = db.createObjectStore(STORES.PLAYER_CAREER_BATTING, {
          keyPath: 'playerId'
        });
        careerBattingStore.createIndex('teamId', 'teamId', { unique: false });
        careerBattingStore.createIndex('homeRuns', 'homeRuns', { unique: false });
        careerBattingStore.createIndex('hits', 'hits', { unique: false });
      }

      // NEW: Career pitching stats
      if (!db.objectStoreNames.contains(STORES.PLAYER_CAREER_PITCHING)) {
        const careerPitchingStore = db.createObjectStore(STORES.PLAYER_CAREER_PITCHING, {
          keyPath: 'playerId'
        });
        careerPitchingStore.createIndex('teamId', 'teamId', { unique: false });
        careerPitchingStore.createIndex('wins', 'wins', { unique: false });
        careerPitchingStore.createIndex('strikeouts', 'strikeouts', { unique: false });
      }

      // NEW: Career fielding stats
      if (!db.objectStoreNames.contains(STORES.PLAYER_CAREER_FIELDING)) {
        const careerFieldingStore = db.createObjectStore(STORES.PLAYER_CAREER_FIELDING, {
          keyPath: 'playerId'
        });
        careerFieldingStore.createIndex('teamId', 'teamId', { unique: false });
      }

      // NEW: Career milestones achieved
      if (!db.objectStoreNames.contains(STORES.CAREER_MILESTONES)) {
        const milestoneStore = db.createObjectStore(STORES.CAREER_MILESTONES, {
          keyPath: 'id'
        });
        milestoneStore.createIndex('playerId', 'playerId', { unique: false });
        milestoneStore.createIndex('milestoneType', 'milestoneType', { unique: false });
        milestoneStore.createIndex('achievedDate', 'achievedDate', { unique: false });
      }
    };
  });
}

// ============================================
// TYPES
// ============================================

export interface PlayerCareerBatting {
  playerId: string;
  playerName: string;
  teamId: string;  // Current/primary team

  // Season count
  seasonsPlayed: number;

  // Counting stats (career totals)
  games: number;
  pa: number;      // Plate appearances
  ab: number;      // At bats
  hits: number;
  singles: number;
  doubles: number;
  triples: number;
  homeRuns: number;
  rbi: number;
  runs: number;
  walks: number;
  strikeouts: number;
  hitByPitch: number;
  sacFlies: number;
  sacBunts: number;
  stolenBases: number;
  caughtStealing: number;
  gidp: number;
  grandSlams: number;

  // Fame (career totals)
  fameBonuses: number;
  fameBoners: number;
  fameNet: number;

  // Achievements
  allStarSelections: number;
  mvpAwards: number;
  battingTitles: number;
  silverSluggers: number;

  // WAR Components (career totals)
  bWAR: number;  // Batting WAR
  fWAR: number;  // Fielding WAR
  rWAR: number;  // Baserunning WAR
  totalWAR: number;  // Combined WAR for position players (bWAR + fWAR + rWAR)

  // Timestamps
  lastUpdated: number;
  lastGameId: string;
}

export interface PlayerCareerPitching {
  playerId: string;
  playerName: string;
  teamId: string;

  // Season count
  seasonsPlayed: number;

  // Counting stats
  games: number;
  gamesStarted: number;
  outsRecorded: number;  // IP = outsRecorded / 3
  hitsAllowed: number;
  runsAllowed: number;
  earnedRuns: number;
  walksAllowed: number;
  strikeouts: number;
  homeRunsAllowed: number;
  hitBatters: number;
  wildPitches: number;
  balks: number;

  // Decisions
  wins: number;
  losses: number;
  saves: number;
  holds: number;
  blownSaves: number;

  // Achievements
  qualityStarts: number;
  completeGames: number;
  shutouts: number;
  noHitters: number;
  perfectGames: number;

  // Fame
  fameBonuses: number;
  fameBoners: number;
  fameNet: number;

  // Awards
  allStarSelections: number;
  cyYoungAwards: number;

  // WAR Components (career totals)
  pWAR: number;  // Pitching WAR
  // Note: pitchers can also have bWAR, fWAR, rWAR if they bat (SMB4 pitchers hit!)

  // Timestamps
  lastUpdated: number;
  lastGameId: string;
}

export interface PlayerCareerFielding {
  playerId: string;
  playerName: string;
  teamId: string;

  // Season count
  seasonsPlayed: number;

  // Counting stats (career totals)
  games: number;
  putouts: number;
  assists: number;
  errors: number;
  doublePlays: number;
  passedBalls: number;  // For catchers

  // By position
  gamesByPosition: Record<string, number>;
  putoutsByPosition: Record<string, number>;
  assistsByPosition: Record<string, number>;
  errorsByPosition: Record<string, number>;

  // Awards
  goldGloves: number;

  // Timestamps
  lastUpdated: number;
  lastGameId: string;
}

export interface CareerMilestone {
  id: string;  // Unique ID for the milestone achievement
  playerId: string;
  playerName: string;
  milestoneType: string;  // e.g., 'CAREER_HR_500', 'CAREER_HITS_3000'
  statCategory: 'batting' | 'pitching' | 'fielding';
  statName: string;       // e.g., 'homeRuns', 'strikeouts', 'wins'
  thresholdValue: number; // The threshold crossed (e.g., 500, 3000)
  actualValue: number;    // Actual career value when achieved
  tier: number;           // Which tier (1, 2, 3, etc.)
  fameValue: number;      // Fame awarded for this milestone
  achievedDate: number;   // Timestamp
  gameId: string;         // Game where achieved
  seasonId: string;       // Season where achieved
  description: string;    // Human-readable description
}

// ============================================
// INITIAL VALUES
// ============================================

export function createInitialCareerBatting(
  playerId: string,
  playerName: string,
  teamId: string
): PlayerCareerBatting {
  return {
    playerId,
    playerName,
    teamId,
    seasonsPlayed: 0,
    games: 0,
    pa: 0,
    ab: 0,
    hits: 0,
    singles: 0,
    doubles: 0,
    triples: 0,
    homeRuns: 0,
    rbi: 0,
    runs: 0,
    walks: 0,
    strikeouts: 0,
    hitByPitch: 0,
    sacFlies: 0,
    sacBunts: 0,
    stolenBases: 0,
    caughtStealing: 0,
    gidp: 0,
    grandSlams: 0,
    fameBonuses: 0,
    fameBoners: 0,
    fameNet: 0,
    allStarSelections: 0,
    mvpAwards: 0,
    battingTitles: 0,
    silverSluggers: 0,
    bWAR: 0,
    fWAR: 0,
    rWAR: 0,
    totalWAR: 0,
    lastUpdated: Date.now(),
    lastGameId: '',
  };
}

export function createInitialCareerPitching(
  playerId: string,
  playerName: string,
  teamId: string
): PlayerCareerPitching {
  return {
    playerId,
    playerName,
    teamId,
    seasonsPlayed: 0,
    games: 0,
    gamesStarted: 0,
    outsRecorded: 0,
    hitsAllowed: 0,
    runsAllowed: 0,
    earnedRuns: 0,
    walksAllowed: 0,
    strikeouts: 0,
    homeRunsAllowed: 0,
    hitBatters: 0,
    wildPitches: 0,
    balks: 0,
    wins: 0,
    losses: 0,
    saves: 0,
    holds: 0,
    blownSaves: 0,
    qualityStarts: 0,
    completeGames: 0,
    shutouts: 0,
    noHitters: 0,
    perfectGames: 0,
    fameBonuses: 0,
    fameBoners: 0,
    fameNet: 0,
    allStarSelections: 0,
    cyYoungAwards: 0,
    pWAR: 0,
    lastUpdated: Date.now(),
    lastGameId: '',
  };
}

export function createInitialCareerFielding(
  playerId: string,
  playerName: string,
  teamId: string
): PlayerCareerFielding {
  return {
    playerId,
    playerName,
    teamId,
    seasonsPlayed: 0,
    games: 0,
    putouts: 0,
    assists: 0,
    errors: 0,
    doublePlays: 0,
    passedBalls: 0,
    gamesByPosition: {},
    putoutsByPosition: {},
    assistsByPosition: {},
    errorsByPosition: {},
    goldGloves: 0,
    lastUpdated: Date.now(),
    lastGameId: '',
  };
}

// ============================================
// CAREER BATTING STATS CRUD
// ============================================

/**
 * Get or create career batting stats for a player
 */
export async function getOrCreateCareerBatting(
  playerId: string,
  playerName: string,
  teamId: string
): Promise<PlayerCareerBatting> {
  const db = await initCareerDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.PLAYER_CAREER_BATTING, 'readwrite');
    const store = transaction.objectStore(STORES.PLAYER_CAREER_BATTING);
    const request = store.get(playerId);

    request.onerror = () => reject(request.error);

    request.onsuccess = () => {
      if (request.result) {
        resolve(request.result);
      } else {
        const newStats = createInitialCareerBatting(playerId, playerName, teamId);
        const putRequest = store.put(newStats);
        putRequest.onerror = () => reject(putRequest.error);
        putRequest.onsuccess = () => resolve(newStats);
      }
    };
  });
}

/**
 * Update career batting stats for a player
 */
export async function updateCareerBatting(stats: PlayerCareerBatting): Promise<void> {
  const db = await initCareerDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.PLAYER_CAREER_BATTING, 'readwrite');
    const store = transaction.objectStore(STORES.PLAYER_CAREER_BATTING);
    const request = store.put({ ...stats, lastUpdated: Date.now() });

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * Get all career batting stats (for all-time leaderboards)
 */
export async function getAllCareerBatting(): Promise<PlayerCareerBatting[]> {
  const db = await initCareerDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.PLAYER_CAREER_BATTING, 'readonly');
    const store = transaction.objectStore(STORES.PLAYER_CAREER_BATTING);
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || []);
  });
}

// ============================================
// CAREER PITCHING STATS CRUD
// ============================================

/**
 * Get or create career pitching stats for a player
 */
export async function getOrCreateCareerPitching(
  playerId: string,
  playerName: string,
  teamId: string
): Promise<PlayerCareerPitching> {
  const db = await initCareerDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.PLAYER_CAREER_PITCHING, 'readwrite');
    const store = transaction.objectStore(STORES.PLAYER_CAREER_PITCHING);
    const request = store.get(playerId);

    request.onerror = () => reject(request.error);

    request.onsuccess = () => {
      if (request.result) {
        resolve(request.result);
      } else {
        const newStats = createInitialCareerPitching(playerId, playerName, teamId);
        const putRequest = store.put(newStats);
        putRequest.onerror = () => reject(putRequest.error);
        putRequest.onsuccess = () => resolve(newStats);
      }
    };
  });
}

/**
 * Update career pitching stats for a player
 */
export async function updateCareerPitching(stats: PlayerCareerPitching): Promise<void> {
  const db = await initCareerDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.PLAYER_CAREER_PITCHING, 'readwrite');
    const store = transaction.objectStore(STORES.PLAYER_CAREER_PITCHING);
    const request = store.put({ ...stats, lastUpdated: Date.now() });

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * Get all career pitching stats (for all-time leaderboards)
 */
export async function getAllCareerPitching(): Promise<PlayerCareerPitching[]> {
  const db = await initCareerDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.PLAYER_CAREER_PITCHING, 'readonly');
    const store = transaction.objectStore(STORES.PLAYER_CAREER_PITCHING);
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || []);
  });
}

// ============================================
// CAREER FIELDING STATS CRUD
// ============================================

/**
 * Get or create career fielding stats for a player
 */
export async function getOrCreateCareerFielding(
  playerId: string,
  playerName: string,
  teamId: string
): Promise<PlayerCareerFielding> {
  const db = await initCareerDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.PLAYER_CAREER_FIELDING, 'readwrite');
    const store = transaction.objectStore(STORES.PLAYER_CAREER_FIELDING);
    const request = store.get(playerId);

    request.onerror = () => reject(request.error);

    request.onsuccess = () => {
      if (request.result) {
        resolve(request.result);
      } else {
        const newStats = createInitialCareerFielding(playerId, playerName, teamId);
        const putRequest = store.put(newStats);
        putRequest.onerror = () => reject(putRequest.error);
        putRequest.onsuccess = () => resolve(newStats);
      }
    };
  });
}

/**
 * Update career fielding stats for a player
 */
export async function updateCareerFielding(stats: PlayerCareerFielding): Promise<void> {
  const db = await initCareerDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.PLAYER_CAREER_FIELDING, 'readwrite');
    const store = transaction.objectStore(STORES.PLAYER_CAREER_FIELDING);
    const request = store.put({ ...stats, lastUpdated: Date.now() });

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

// ============================================
// CAREER MILESTONES CRUD
// ============================================

/**
 * Record a career milestone achievement
 */
export async function recordCareerMilestone(milestone: CareerMilestone): Promise<void> {
  const db = await initCareerDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.CAREER_MILESTONES, 'readwrite');
    const store = transaction.objectStore(STORES.CAREER_MILESTONES);
    const request = store.put(milestone);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * Get all milestones for a player
 */
export async function getPlayerMilestones(playerId: string): Promise<CareerMilestone[]> {
  const db = await initCareerDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.CAREER_MILESTONES, 'readonly');
    const store = transaction.objectStore(STORES.CAREER_MILESTONES);
    const index = store.index('playerId');
    const request = index.getAll(playerId);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || []);
  });
}

/**
 * Check if a specific milestone has already been achieved
 */
export async function hasMilestoneBeenAchieved(
  playerId: string,
  milestoneType: string
): Promise<boolean> {
  const milestones = await getPlayerMilestones(playerId);
  return milestones.some(m => m.milestoneType === milestoneType);
}

/**
 * Get all milestones of a specific type (for history/records)
 */
export async function getMilestonesByType(milestoneType: string): Promise<CareerMilestone[]> {
  const db = await initCareerDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.CAREER_MILESTONES, 'readonly');
    const store = transaction.objectStore(STORES.CAREER_MILESTONES);
    const index = store.index('milestoneType');
    const request = index.getAll(milestoneType);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || []);
  });
}

/**
 * Get recent milestones (for activity feed)
 */
export async function getRecentMilestones(limit: number = 10): Promise<CareerMilestone[]> {
  const db = await initCareerDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.CAREER_MILESTONES, 'readonly');
    const store = transaction.objectStore(STORES.CAREER_MILESTONES);
    const index = store.index('achievedDate');

    // Open cursor in reverse order (most recent first)
    const results: CareerMilestone[] = [];
    const request = index.openCursor(null, 'prev');

    request.onerror = () => reject(request.error);
    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
      if (cursor && results.length < limit) {
        results.push(cursor.value);
        cursor.continue();
      } else {
        resolve(results);
      }
    };
  });
}

// ============================================
// DERIVED STATS CALCULATIONS
// ============================================

/**
 * Calculate career batting average
 */
export function calcCareerBattingAvg(stats: PlayerCareerBatting): number {
  if (stats.ab === 0) return 0;
  return stats.hits / stats.ab;
}

/**
 * Calculate career OBP
 */
export function calcCareerOBP(stats: PlayerCareerBatting): number {
  const denom = stats.ab + stats.walks + stats.hitByPitch + stats.sacFlies;
  if (denom === 0) return 0;
  return (stats.hits + stats.walks + stats.hitByPitch) / denom;
}

/**
 * Calculate career SLG
 */
export function calcCareerSLG(stats: PlayerCareerBatting): number {
  if (stats.ab === 0) return 0;
  const totalBases = stats.singles + (stats.doubles * 2) + (stats.triples * 3) + (stats.homeRuns * 4);
  return totalBases / stats.ab;
}

/**
 * Calculate career OPS
 */
export function calcCareerOPS(stats: PlayerCareerBatting): number {
  return calcCareerOBP(stats) + calcCareerSLG(stats);
}

/**
 * Calculate career ERA
 */
export function calcCareerERA(stats: PlayerCareerPitching): number {
  const ip = stats.outsRecorded / 3;
  if (ip === 0) return 0;
  return (stats.earnedRuns / ip) * 9;
}

/**
 * Calculate career WHIP
 */
export function calcCareerWHIP(stats: PlayerCareerPitching): number {
  const ip = stats.outsRecorded / 3;
  if (ip === 0) return 0;
  return (stats.walksAllowed + stats.hitsAllowed) / ip;
}

/**
 * Calculate career winning percentage
 */
export function calcCareerWinPct(stats: PlayerCareerPitching): number {
  const decisions = stats.wins + stats.losses;
  if (decisions === 0) return 0;
  return stats.wins / decisions;
}

/**
 * Format career innings pitched (e.g., 1500.2)
 */
export function formatCareerIP(outsRecorded: number): string {
  const full = Math.floor(outsRecorded / 3);
  const partial = outsRecorded % 3;
  return `${full}.${partial}`;
}

/**
 * Calculate career fielding percentage
 */
export function calcCareerFieldingPct(stats: PlayerCareerFielding): number {
  const totalChances = stats.putouts + stats.assists + stats.errors;
  if (totalChances === 0) return 0;
  return (stats.putouts + stats.assists) / totalChances;
}

// ============================================
// CAREER AGGREGATION (used by seasonEndProcessor)
// ============================================

/**
 * Combined career stats for milestone detection
 */
export interface CareerStats {
  batting: PlayerCareerBatting | null;
  pitching: PlayerCareerPitching | null;
  fielding: PlayerCareerFielding | null;
}

/**
 * Season stats format for career aggregation
 */
export interface SeasonStatsForCareer {
  playerId: string;
  playerName: string;
  teamId: string;
  seasonId: string;
  batting?: {
    games: number;
    pa: number;
    ab: number;
    hits: number;
    singles: number;
    doubles: number;
    triples: number;
    homeRuns: number;
    rbi: number;
    runs: number;
    walks: number;
    strikeouts: number;
    hitByPitch: number;
    sacFlies: number;
    sacBunts: number;
    stolenBases: number;
    caughtStealing: number;
    gidp: number;
    bWAR: number;
    fWAR: number;
    rWAR: number;
    fameBonuses: number;
    fameBoners: number;
  };
  pitching?: {
    games: number;
    gamesStarted: number;
    outsRecorded: number;
    hitsAllowed: number;
    runsAllowed: number;
    earnedRuns: number;
    walksAllowed: number;
    strikeouts: number;
    homeRunsAllowed: number;
    hitBatters: number;
    wildPitches: number;
    wins: number;
    losses: number;
    saves: number;
    holds: number;
    blownSaves: number;
    qualityStarts: number;
    completeGames: number;
    shutouts: number;
    noHitters: number;
    perfectGames: number;
    pWAR: number;
    fameBonuses: number;
    fameBoners: number;
  };
}

/**
 * Get career stats for a player
 */
export async function getCareerStats(playerId: string): Promise<CareerStats> {
  const db = await initCareerDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([
      STORES.PLAYER_CAREER_BATTING,
      STORES.PLAYER_CAREER_PITCHING,
      STORES.PLAYER_CAREER_FIELDING,
    ], 'readonly');

    const battingStore = transaction.objectStore(STORES.PLAYER_CAREER_BATTING);
    const pitchingStore = transaction.objectStore(STORES.PLAYER_CAREER_PITCHING);
    const fieldingStore = transaction.objectStore(STORES.PLAYER_CAREER_FIELDING);

    const results: CareerStats = {
      batting: null,
      pitching: null,
      fielding: null,
    };

    const battingRequest = battingStore.get(playerId);
    battingRequest.onsuccess = () => {
      results.batting = battingRequest.result || null;
    };

    const pitchingRequest = pitchingStore.get(playerId);
    pitchingRequest.onsuccess = () => {
      results.pitching = pitchingRequest.result || null;
    };

    const fieldingRequest = fieldingStore.get(playerId);
    fieldingRequest.onsuccess = () => {
      results.fielding = fieldingRequest.result || null;
    };

    transaction.oncomplete = () => resolve(results);
    transaction.onerror = () => reject(transaction.error);
  });
}

/**
 * Configuration for career aggregation
 */
export interface CareerAggregationConfig {
  enableCareerMilestones?: boolean;
  enableFranchiseFirsts?: boolean;
  enableFranchiseLeaders?: boolean;
}

// Use FameEvent from types/game
import type { FameEvent } from '../types/game';

/**
 * Result of career aggregation
 */
export interface CareerAggregationResult {
  current: CareerStats;
  fameEvents: FameEvent[];
}

/**
 * Aggregate season stats to career totals
 * Called after each game or at end of season
 */
export async function aggregateGameToCareer(
  playerId: string,
  playerName: string,
  teamId: string,
  seasonStats: SeasonStatsForCareer,
  _config?: CareerAggregationConfig
): Promise<CareerAggregationResult | null> {

  let battingCareer: PlayerCareerBatting | null = null;
  let pitchingCareer: PlayerCareerPitching | null = null;

  // Aggregate batting stats
  if (seasonStats.batting) {
    const career = await getOrCreateCareerBatting(playerId, playerName, teamId);

    // Add season totals (this is incremental, call with delta or full season)
    // For now, this is designed to be called with full season stats at season end
    career.games += seasonStats.batting.games;
    career.pa += seasonStats.batting.pa;
    career.ab += seasonStats.batting.ab;
    career.hits += seasonStats.batting.hits;
    career.singles += seasonStats.batting.singles;
    career.doubles += seasonStats.batting.doubles;
    career.triples += seasonStats.batting.triples;
    career.homeRuns += seasonStats.batting.homeRuns;
    career.rbi += seasonStats.batting.rbi;
    career.runs += seasonStats.batting.runs;
    career.walks += seasonStats.batting.walks;
    career.strikeouts += seasonStats.batting.strikeouts;
    career.hitByPitch += seasonStats.batting.hitByPitch;
    career.sacFlies += seasonStats.batting.sacFlies;
    career.sacBunts += seasonStats.batting.sacBunts;
    career.stolenBases += seasonStats.batting.stolenBases;
    career.caughtStealing += seasonStats.batting.caughtStealing;
    career.gidp += seasonStats.batting.gidp;
    career.bWAR += seasonStats.batting.bWAR;
    career.fWAR += seasonStats.batting.fWAR;
    career.rWAR += seasonStats.batting.rWAR;
    career.totalWAR = career.bWAR + career.fWAR + career.rWAR;
    career.fameBonuses += seasonStats.batting.fameBonuses;
    career.fameBoners += seasonStats.batting.fameBoners;
    career.fameNet = career.fameBonuses - career.fameBoners;
    career.lastGameId = seasonStats.seasonId;

    await updateCareerBatting(career);
    battingCareer = career;
  }

  // Aggregate pitching stats
  if (seasonStats.pitching) {
    const career = await getOrCreateCareerPitching(playerId, playerName, teamId);

    career.games += seasonStats.pitching.games;
    career.gamesStarted += seasonStats.pitching.gamesStarted;
    career.outsRecorded += seasonStats.pitching.outsRecorded;
    career.hitsAllowed += seasonStats.pitching.hitsAllowed;
    career.runsAllowed += seasonStats.pitching.runsAllowed;
    career.earnedRuns += seasonStats.pitching.earnedRuns;
    career.walksAllowed += seasonStats.pitching.walksAllowed;
    career.strikeouts += seasonStats.pitching.strikeouts;
    career.homeRunsAllowed += seasonStats.pitching.homeRunsAllowed;
    career.hitBatters += seasonStats.pitching.hitBatters;
    career.wildPitches += seasonStats.pitching.wildPitches;
    career.wins += seasonStats.pitching.wins;
    career.losses += seasonStats.pitching.losses;
    career.saves += seasonStats.pitching.saves;
    career.holds += seasonStats.pitching.holds;
    career.blownSaves += seasonStats.pitching.blownSaves;
    career.qualityStarts += seasonStats.pitching.qualityStarts;
    career.completeGames += seasonStats.pitching.completeGames;
    career.shutouts += seasonStats.pitching.shutouts;
    career.noHitters += seasonStats.pitching.noHitters;
    career.perfectGames += seasonStats.pitching.perfectGames;
    career.pWAR += seasonStats.pitching.pWAR;
    career.fameBonuses += seasonStats.pitching.fameBonuses;
    career.fameBoners += seasonStats.pitching.fameBoners;
    career.fameNet = career.fameBonuses - career.fameBoners;
    career.lastGameId = seasonStats.seasonId;

    await updateCareerPitching(career);
    pitchingCareer = career;
  }

  // Return the result
  return {
    current: {
      batting: battingCareer,
      pitching: pitchingCareer,
      fielding: null,
    },
    fameEvents: [], // TODO: Implement milestone detection
  };
}
