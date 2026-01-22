/**
 * Game Storage Utility
 * Per STAT_TRACKING_ARCHITECTURE_SPEC.md - Phase 2: Game Persistence
 *
 * Provides IndexedDB storage for game state, allowing recovery after page refresh.
 */

const DB_NAME = 'kbl-tracker';
const DB_VERSION = 1;

// Store names
const STORES = {
  CURRENT_GAME: 'currentGame',
  COMPLETED_GAMES: 'completedGames',
  PLAYER_GAME_STATS: 'playerGameStats',
  PITCHER_GAME_STATS: 'pitcherGameStats',
} as const;

// ============================================
// DATABASE INITIALIZATION
// ============================================

let dbInstance: IDBDatabase | null = null;

/**
 * Initialize the IndexedDB database
 */
export async function initDatabase(): Promise<IDBDatabase> {
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

      // Current game state (single record, overwritten)
      if (!db.objectStoreNames.contains(STORES.CURRENT_GAME)) {
        db.createObjectStore(STORES.CURRENT_GAME, { keyPath: 'id' });
      }

      // Completed games archive
      if (!db.objectStoreNames.contains(STORES.COMPLETED_GAMES)) {
        const completedStore = db.createObjectStore(STORES.COMPLETED_GAMES, { keyPath: 'gameId' });
        completedStore.createIndex('date', 'date', { unique: false });
        completedStore.createIndex('seasonId', 'seasonId', { unique: false });
      }

      // Player game stats (for historical lookup)
      if (!db.objectStoreNames.contains(STORES.PLAYER_GAME_STATS)) {
        const playerStore = db.createObjectStore(STORES.PLAYER_GAME_STATS, { keyPath: ['gameId', 'playerId'] });
        playerStore.createIndex('playerId', 'playerId', { unique: false });
        playerStore.createIndex('gameId', 'gameId', { unique: false });
      }

      // Pitcher game stats
      if (!db.objectStoreNames.contains(STORES.PITCHER_GAME_STATS)) {
        const pitcherStore = db.createObjectStore(STORES.PITCHER_GAME_STATS, { keyPath: ['gameId', 'pitcherId'] });
        pitcherStore.createIndex('pitcherId', 'pitcherId', { unique: false });
        pitcherStore.createIndex('gameId', 'gameId', { unique: false });
      }
    };
  });
}

// ============================================
// CURRENT GAME STATE
// ============================================

/**
 * Game state that gets persisted
 */
export interface PersistedGameState {
  id: string;  // Always 'current' for the active game
  gameId: string;
  savedAt: number;

  // Core game state
  inning: number;
  halfInning: 'TOP' | 'BOTTOM';
  outs: number;
  homeScore: number;
  awayScore: number;
  bases: {
    first: { playerId: string; playerName: string } | null;
    second: { playerId: string; playerName: string } | null;
    third: { playerId: string; playerName: string } | null;
  };
  currentBatterIndex: number;
  atBatCount: number;

  // Team info
  awayTeamId: string;
  homeTeamId: string;
  awayTeamName: string;
  homeTeamName: string;

  // Player stats (batting)
  playerStats: Record<string, {
    pa: number;
    ab: number;
    h: number;
    singles: number;
    doubles: number;
    triples: number;
    hr: number;
    rbi: number;
    r: number;
    bb: number;
    k: number;
    sb: number;
    cs: number;
    putouts: number;
    assists: number;
    fieldingErrors: number;
  }>;

  // Pitcher stats (accumulated)
  pitcherGameStats: Array<{
    pitcherId: string;
    pitcherName: string;
    teamId: string;
    isStarter: boolean;
    entryInning: number;
    outsRecorded: number;
    hitsAllowed: number;
    runsAllowed: number;
    earnedRuns: number;
    walksAllowed: number;
    strikeoutsThrown: number;
    homeRunsAllowed: number;
    hitBatters: number;
    basesReachedViaError: number;
    wildPitches: number;
    pitchCount: number;
    battersFaced: number;
    consecutiveHRsAllowed: number;
    firstInningRuns: number;
    basesLoadedWalks: number;
    inningsComplete: number;
  }>;

  // Fame tracking
  fameEvents: Array<{
    id: string;
    gameId: string;
    eventType: string;
    playerId: string;
    playerName: string;
    playerTeam: string;
    fameValue: number;
    fameType: 'bonus' | 'boner';
    inning: number;
    halfInning: 'TOP' | 'BOTTOM';
    timestamp: number;
    autoDetected: boolean;
    description?: string;
  }>;

  // Fame detection state
  lastHRBatterId: string | null;
  consecutiveHRCount: number;
  inningStrikeouts: number;
  maxDeficitAway: number;
  maxDeficitHome: number;

  // Activity log (recent entries)
  activityLog: string[];
}

/**
 * Save current game state to IndexedDB
 */
export async function saveCurrentGame(state: PersistedGameState): Promise<void> {
  const db = await initDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.CURRENT_GAME, 'readwrite');
    const store = transaction.objectStore(STORES.CURRENT_GAME);

    // Always use 'current' as the key so we overwrite the same record
    const stateToSave = { ...state, id: 'current', savedAt: Date.now() };
    const request = store.put(stateToSave);

    request.onerror = () => {
      console.error('Failed to save game state:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve();
    };
  });
}

/**
 * Load current game state from IndexedDB
 */
export async function loadCurrentGame(): Promise<PersistedGameState | null> {
  const db = await initDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.CURRENT_GAME, 'readonly');
    const store = transaction.objectStore(STORES.CURRENT_GAME);
    const request = store.get('current');

    request.onerror = () => {
      console.error('Failed to load game state:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result || null);
    };
  });
}

/**
 * Clear current game state (when starting new game or game completed)
 */
export async function clearCurrentGame(): Promise<void> {
  const db = await initDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.CURRENT_GAME, 'readwrite');
    const store = transaction.objectStore(STORES.CURRENT_GAME);
    const request = store.delete('current');

    request.onerror = () => {
      console.error('Failed to clear game state:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve();
    };
  });
}

/**
 * Check if there's a saved game in progress
 */
export async function hasSavedGame(): Promise<boolean> {
  const saved = await loadCurrentGame();
  return saved !== null;
}

// ============================================
// COMPLETED GAMES ARCHIVE
// ============================================

export interface CompletedGameRecord {
  gameId: string;
  date: number;
  seasonId?: string;
  awayTeamId: string;
  homeTeamId: string;
  awayTeamName: string;
  homeTeamName: string;
  finalScore: { away: number; home: number };
  innings: number;
  fameEvents: PersistedGameState['fameEvents'];
}

/**
 * Archive a completed game
 */
export async function archiveCompletedGame(
  gameState: PersistedGameState,
  finalScore: { away: number; home: number }
): Promise<void> {
  const db = await initDatabase();

  const record: CompletedGameRecord = {
    gameId: gameState.gameId,
    date: Date.now(),
    awayTeamId: gameState.awayTeamId,
    homeTeamId: gameState.homeTeamId,
    awayTeamName: gameState.awayTeamName,
    homeTeamName: gameState.homeTeamName,
    finalScore,
    innings: gameState.inning,
    fameEvents: gameState.fameEvents,
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.COMPLETED_GAMES, 'readwrite');
    const store = transaction.objectStore(STORES.COMPLETED_GAMES);
    const request = store.put(record);

    request.onerror = () => {
      console.error('Failed to archive game:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve();
    };
  });
}

/**
 * Get recent completed games
 */
export async function getRecentGames(limit: number = 10): Promise<CompletedGameRecord[]> {
  const db = await initDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.COMPLETED_GAMES, 'readonly');
    const store = transaction.objectStore(STORES.COMPLETED_GAMES);
    const index = store.index('date');
    const request = index.openCursor(null, 'prev');  // Descending by date

    const results: CompletedGameRecord[] = [];

    request.onerror = () => {
      console.error('Failed to get recent games:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      const cursor = request.result;
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
// UTILITY: DEBOUNCED SAVE
// ============================================

let saveTimeout: ReturnType<typeof setTimeout> | null = null;

/**
 * Debounced save - prevents excessive writes during rapid state changes
 */
export function debouncedSaveCurrentGame(state: PersistedGameState, delay: number = 500): void {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }

  saveTimeout = setTimeout(() => {
    saveCurrentGame(state).catch(err => {
      console.error('Auto-save failed:', err);
    });
  }, delay);
}

/**
 * Immediate save - use when user navigates away or on critical state changes
 */
export function immediateSaveCurrentGame(state: PersistedGameState): void {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
    saveTimeout = null;
  }

  saveCurrentGame(state).catch(err => {
    console.error('Immediate save failed:', err);
  });
}
