/**
 * Schedule Storage Utility
 * Per SCHEDULE_SYSTEM_FIGMA_SPEC.md
 *
 * Provides IndexedDB storage for scheduled games:
 * - Add individual games or series
 * - Track game status (SCHEDULED, IN_PROGRESS, COMPLETED, SKIPPED)
 * - Filter by team or full league
 * - Auto-pull next scheduled game
 */

const DB_NAME = 'kbl-schedule';
const DB_VERSION = 2;

const STORES = {
  SCHEDULED_GAMES: 'scheduledGames',
  SCHEDULE_METADATA: 'scheduleMetadata',
} as const;

// ============================================
// TYPES
// ============================================

export type GameStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED';

export interface ScheduledGame {
  id: string;
  franchiseId?: string;         // Tags game to a franchise (multi-franchise isolation)
  seasonNumber: number;
  gameNumber: number;           // 1, 2, 3... (league-wide sequence)
  dayNumber: number;            // For display: Day 1, Day 2...
  date?: string;                // Optional: "July 12"
  time?: string;                // Optional: "7:00 PM"
  awayTeamId: string;
  homeTeamId: string;
  status: GameStatus;
  result?: {
    awayScore: number;
    homeScore: number;
    winningTeamId: string;
    losingTeamId: string;
  };
  gameLogId?: string;           // Links to full game data after completion
  createdAt: number;            // timestamp
  completedAt?: number;         // timestamp
}

export interface ScheduleMetadata {
  seasonNumber: number;
  totalGamesScheduled: number;
  totalGamesCompleted: number;
  lastUpdated: number;
}

export interface AddGameInput {
  franchiseId?: string;         // Tags game to a franchise
  seasonNumber: number;
  gameNumber?: number;          // Auto-increment if not provided
  dayNumber?: number;           // Auto-increment if not provided
  date?: string;
  time?: string;
  awayTeamId: string;
  homeTeamId: string;
}

export interface GameResult {
  awayScore: number;
  homeScore: number;
  winningTeamId: string;
  losingTeamId: string;
  gameLogId?: string;
}

// ============================================
// DATABASE INITIALIZATION
// ============================================

let dbInstance: IDBDatabase | null = null;

export async function initScheduleDatabase(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('[scheduleStorage] Failed to open database:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Scheduled games store
      if (!db.objectStoreNames.contains(STORES.SCHEDULED_GAMES)) {
        const gamesStore = db.createObjectStore(STORES.SCHEDULED_GAMES, { keyPath: 'id' });
        gamesStore.createIndex('seasonNumber', 'seasonNumber', { unique: false });
        gamesStore.createIndex('gameNumber', 'gameNumber', { unique: false });
        gamesStore.createIndex('status', 'status', { unique: false });
        gamesStore.createIndex('awayTeamId', 'awayTeamId', { unique: false });
        gamesStore.createIndex('homeTeamId', 'homeTeamId', { unique: false });
      }

      // v2: Add franchiseId index for multi-franchise isolation
      if (db.objectStoreNames.contains(STORES.SCHEDULED_GAMES)) {
        const gamesStore = (event.target as IDBOpenDBRequest).transaction!.objectStore(STORES.SCHEDULED_GAMES);
        if (!gamesStore.indexNames.contains('franchiseId')) {
          gamesStore.createIndex('franchiseId', 'franchiseId', { unique: false });
        }
      }

      // Schedule metadata store
      if (!db.objectStoreNames.contains(STORES.SCHEDULE_METADATA)) {
        db.createObjectStore(STORES.SCHEDULE_METADATA, { keyPath: 'seasonNumber' });
      }
    };
  });
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function generateGameId(): string {
  return `game-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================
// GAME OPERATIONS
// ============================================

/**
 * Get all scheduled games for a season
 */
export async function getAllGames(seasonNumber: number): Promise<ScheduledGame[]> {
  const db = await initScheduleDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.SCHEDULED_GAMES, 'readonly');
    const store = tx.objectStore(STORES.SCHEDULED_GAMES);
    const index = store.index('seasonNumber');
    const request = index.getAll(seasonNumber);

    request.onsuccess = () => {
      const games = request.result || [];
      // Sort by game number
      games.sort((a, b) => a.gameNumber - b.gameNumber);
      resolve(games);
    };

    request.onerror = () => reject(request.error);
  });
}

/**
 * Get games filtered by team
 */
export async function getGamesByTeam(seasonNumber: number, teamId: string): Promise<ScheduledGame[]> {
  const allGames = await getAllGames(seasonNumber);
  return allGames.filter(g => g.awayTeamId === teamId || g.homeTeamId === teamId);
}

/**
 * Get next scheduled game (for Today's Game auto-pull)
 */
export async function getNextScheduledGame(seasonNumber: number, teamFilter?: string): Promise<ScheduledGame | null> {
  const allGames = await getAllGames(seasonNumber);

  const scheduledGames = allGames
    .filter(g => g.status === 'SCHEDULED')
    .filter(g => !teamFilter || g.awayTeamId === teamFilter || g.homeTeamId === teamFilter);

  return scheduledGames[0] || null;
}

/**
 * Get the next game number (auto-increment)
 */
export async function getNextGameNumber(seasonNumber: number): Promise<number> {
  const allGames = await getAllGames(seasonNumber);
  if (allGames.length === 0) return 1;

  const maxGameNumber = Math.max(...allGames.map(g => g.gameNumber));
  return maxGameNumber + 1;
}

/**
 * Add a single game to the schedule
 */
export async function addGame(input: AddGameInput): Promise<ScheduledGame> {
  const db = await initScheduleDatabase();

  // Validate: away team !== home team
  if (input.awayTeamId === input.homeTeamId) {
    throw new Error('Away team cannot equal home team');
  }

  // Auto-increment game number if not provided
  const gameNumber = input.gameNumber ?? await getNextGameNumber(input.seasonNumber);
  const dayNumber = input.dayNumber ?? gameNumber;

  const game: ScheduledGame = {
    id: generateGameId(),
    franchiseId: input.franchiseId,
    seasonNumber: input.seasonNumber,
    gameNumber,
    dayNumber,
    date: input.date,
    time: input.time,
    awayTeamId: input.awayTeamId,
    homeTeamId: input.homeTeamId,
    status: 'SCHEDULED',
    createdAt: Date.now(),
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.SCHEDULED_GAMES, 'readwrite');
    const store = tx.objectStore(STORES.SCHEDULED_GAMES);
    const request = store.add(game);

    request.onsuccess = () => {
      updateMetadata(input.seasonNumber);
      resolve(game);
    };

    request.onerror = () => reject(request.error);
  });
}

/**
 * Add a series of games (same matchup, sequential)
 */
export async function addSeries(
  input: Omit<AddGameInput, 'gameNumber' | 'dayNumber'>,
  seriesLength: number = 3
): Promise<ScheduledGame[]> {
  const games: ScheduledGame[] = [];
  let nextGameNumber = await getNextGameNumber(input.seasonNumber);

  for (let i = 0; i < seriesLength; i++) {
    const game = await addGame({
      ...input,
      gameNumber: nextGameNumber + i,
      dayNumber: nextGameNumber + i,
    });
    games.push(game);
  }

  return games;
}

/**
 * Update a game's status
 */
export async function updateGameStatus(gameId: string, status: GameStatus): Promise<void> {
  const db = await initScheduleDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.SCHEDULED_GAMES, 'readwrite');
    const store = tx.objectStore(STORES.SCHEDULED_GAMES);
    const getRequest = store.get(gameId);

    getRequest.onsuccess = () => {
      const game = getRequest.result as ScheduledGame | undefined;
      if (!game) {
        reject(new Error(`Game ${gameId} not found`));
        return;
      }

      game.status = status;
      if (status === 'COMPLETED') {
        game.completedAt = Date.now();
      }

      const putRequest = store.put(game);
      putRequest.onsuccess = () => {
        updateMetadata(game.seasonNumber);
        resolve();
      };
      putRequest.onerror = () => reject(putRequest.error);
    };

    getRequest.onerror = () => reject(getRequest.error);
  });
}

/**
 * Complete a game with result
 */
export async function completeGame(gameId: string, result: GameResult): Promise<void> {
  const db = await initScheduleDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.SCHEDULED_GAMES, 'readwrite');
    const store = tx.objectStore(STORES.SCHEDULED_GAMES);
    const getRequest = store.get(gameId);

    getRequest.onsuccess = () => {
      const game = getRequest.result as ScheduledGame | undefined;
      if (!game) {
        reject(new Error(`Game ${gameId} not found`));
        return;
      }

      game.status = 'COMPLETED';
      game.completedAt = Date.now();
      game.result = result;
      game.gameLogId = result.gameLogId;

      const putRequest = store.put(game);
      putRequest.onsuccess = () => {
        updateMetadata(game.seasonNumber);
        resolve();
      };
      putRequest.onerror = () => reject(putRequest.error);
    };

    getRequest.onerror = () => reject(getRequest.error);
  });
}

/**
 * Delete a game from the schedule
 */
export async function deleteGame(gameId: string): Promise<void> {
  const db = await initScheduleDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.SCHEDULED_GAMES, 'readwrite');
    const store = tx.objectStore(STORES.SCHEDULED_GAMES);

    // First get the game to know its season
    const getRequest = store.get(gameId);
    getRequest.onsuccess = () => {
      const game = getRequest.result as ScheduledGame | undefined;
      const seasonNumber = game?.seasonNumber;

      const deleteRequest = store.delete(gameId);
      deleteRequest.onsuccess = () => {
        if (seasonNumber) {
          updateMetadata(seasonNumber);
        }
        resolve();
      };
      deleteRequest.onerror = () => reject(deleteRequest.error);
    };
    getRequest.onerror = () => reject(getRequest.error);
  });
}

/**
 * Get a specific game by ID
 */
export async function getGame(gameId: string): Promise<ScheduledGame | null> {
  const db = await initScheduleDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.SCHEDULED_GAMES, 'readonly');
    const store = tx.objectStore(STORES.SCHEDULED_GAMES);
    const request = store.get(gameId);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

// ============================================
// METADATA OPERATIONS
// ============================================

async function updateMetadata(seasonNumber: number): Promise<void> {
  const db = await initScheduleDatabase();
  const allGames = await getAllGames(seasonNumber);

  const metadata: ScheduleMetadata = {
    seasonNumber,
    totalGamesScheduled: allGames.length,
    totalGamesCompleted: allGames.filter(g => g.status === 'COMPLETED').length,
    lastUpdated: Date.now(),
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.SCHEDULE_METADATA, 'readwrite');
    const store = tx.objectStore(STORES.SCHEDULE_METADATA);
    const request = store.put(metadata);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getScheduleMetadata(seasonNumber: number): Promise<ScheduleMetadata | null> {
  const db = await initScheduleDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.SCHEDULE_METADATA, 'readonly');
    const store = tx.objectStore(STORES.SCHEDULE_METADATA);
    const request = store.get(seasonNumber);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

// ============================================
// TEAM STANDINGS HELPER
// ============================================

export interface TeamScheduleStats {
  teamId: string;
  wins: number;
  losses: number;
  winPct: number;
  gamesScheduled: number;
  gamesRemaining: number;
}

export async function getTeamScheduleStats(seasonNumber: number, teamId: string): Promise<TeamScheduleStats> {
  const games = await getGamesByTeam(seasonNumber, teamId);

  const completedGames = games.filter(g => g.status === 'COMPLETED');
  const wins = completedGames.filter(g => g.result?.winningTeamId === teamId).length;
  const losses = completedGames.length - wins;
  const winPct = completedGames.length > 0 ? wins / completedGames.length : 0;
  const gamesRemaining = games.filter(g => g.status === 'SCHEDULED').length;

  return {
    teamId,
    wins,
    losses,
    winPct,
    gamesScheduled: games.length,
    gamesRemaining,
  };
}

// ============================================
// CLEAR OPERATIONS
// ============================================

/**
 * Clear all games for a season
 */
export async function clearSeasonSchedule(seasonNumber: number): Promise<void> {
  const games = await getAllGames(seasonNumber);

  for (const game of games) {
    await deleteGame(game.id);
  }
}

/**
 * Clear entire schedule database
 */
export async function clearAllSchedules(): Promise<void> {
  const db = await initScheduleDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORES.SCHEDULED_GAMES, STORES.SCHEDULE_METADATA], 'readwrite');

    tx.objectStore(STORES.SCHEDULED_GAMES).clear();
    tx.objectStore(STORES.SCHEDULE_METADATA).clear();

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ============================================
// FRANCHISE-SCOPED OPERATIONS
// ============================================

/**
 * Get all games for a franchise and season, sorted by game number.
 */
export async function getAllGamesByFranchise(
  franchiseId: string,
  seasonNumber: number,
): Promise<ScheduledGame[]> {
  const db = await initScheduleDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.SCHEDULED_GAMES, 'readonly');
    const store = tx.objectStore(STORES.SCHEDULED_GAMES);
    const request = store.getAll();

    request.onsuccess = () => {
      const games = (request.result || [])
        .filter((g: ScheduledGame) => g.franchiseId === franchiseId && g.seasonNumber === seasonNumber)
        .sort((a: ScheduledGame, b: ScheduledGame) => a.gameNumber - b.gameNumber);
      resolve(games);
    };

    request.onerror = () => reject(request.error);
  });
}

/**
 * Get next scheduled game for a franchise/season.
 */
export async function getNextFranchiseGame(
  franchiseId: string,
  seasonNumber: number,
  teamFilter?: string,
): Promise<ScheduledGame | null> {
  const games = await getAllGamesByFranchise(franchiseId, seasonNumber);

  const scheduledGames = games
    .filter(g => g.status === 'SCHEDULED')
    .filter(g => !teamFilter || g.awayTeamId === teamFilter || g.homeTeamId === teamFilter);

  return scheduledGames[0] || null;
}

/**
 * Clear all schedule data for a franchise (all seasons).
 * Used when deleting a franchise.
 */
export async function clearFranchiseSchedule(franchiseId: string): Promise<void> {
  const db = await initScheduleDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.SCHEDULED_GAMES, 'readwrite');
    const store = tx.objectStore(STORES.SCHEDULED_GAMES);
    const request = store.getAll();

    request.onsuccess = () => {
      const games = (request.result || []).filter(
        (g: ScheduledGame) => g.franchiseId === franchiseId,
      );

      for (const game of games) {
        store.delete(game.id);
      }

      tx.oncomplete = () => resolve();
    };

    request.onerror = () => reject(request.error);
    tx.onerror = () => reject(tx.error);
  });
}
