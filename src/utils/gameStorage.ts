/**
 * Game Storage Utility
 * Per STAT_TRACKING_ARCHITECTURE_SPEC.md - Phase 2: Game Persistence
 *
 * Provides IndexedDB storage for game state, allowing recovery after page refresh.
 */

import { getTrackerDb } from './trackerDb';

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

/**
 * Initialize the IndexedDB database.
 * Delegates to the shared trackerDb initializer to avoid version conflicts.
 */
export async function initDatabase(): Promise<IDBDatabase> {
  return getTrackerDb();
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
    playerName: string;
    teamId: string;
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
    hbp: number;  // MAJ-11: Hit by pitch (batter)
    k: number;
    sb: number;
    cs: number;
    sf: number;   // MAJ-11: Sacrifice flies
    sh: number;   // MAJ-11: Sacrifice bunts
    gidp: number; // MAJ-11: Grounded into double play
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
    // MAJ-08: Pitcher decisions
    decision: 'W' | 'L' | 'ND' | null;
    save: boolean;
    hold: boolean;
    blownSave: boolean;
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
  finalScore: { away: number; home: number },
  seasonId?: string
): Promise<void> {
  const db = await initDatabase();

  const record: CompletedGameRecord = {
    gameId: gameState.gameId,
    date: Date.now(),
    seasonId: seasonId || 'season-1',
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
 * Archive a batch-simulated game (lightweight — no full game state needed).
 * Writes directly to the completedGames store so calculateStandings can find it.
 */
export async function archiveBatchGameResult(params: {
  awayTeamId: string;
  homeTeamId: string;
  awayScore: number;
  homeScore: number;
  seasonId?: string;
}): Promise<void> {
  const db = await initDatabase();

  const record: CompletedGameRecord = {
    gameId: `batch-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    date: Date.now(),
    seasonId: params.seasonId || 'season-1',
    awayTeamId: params.awayTeamId,
    homeTeamId: params.homeTeamId,
    awayTeamName: params.awayTeamId,
    homeTeamName: params.homeTeamId,
    finalScore: { away: params.awayScore, home: params.homeScore },
    innings: 9,
    fameEvents: [],
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.COMPLETED_GAMES, 'readwrite');
    const store = transaction.objectStore(STORES.COMPLETED_GAMES);
    const request = store.put(record);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
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
