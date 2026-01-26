/**
 * Transaction Storage Utility
 * Per KBL_XHD_TRACKER_MASTER_SPEC_v3.md Section 27
 *
 * Provides IndexedDB storage for all transaction logging:
 * - Game flow events
 * - Trades
 * - Player updates
 * - Awards
 * - Offseason events
 * - User actions
 *
 * Supports rollback capability via previousState snapshots.
 */

// ============================================
// DATABASE SETUP
// ============================================

const DB_NAME = 'kbl-transactions';
const DB_VERSION = 1;

const STORES = {
  TRANSACTIONS: 'transactions',
} as const;

let dbInstance: IDBDatabase | null = null;

// ============================================
// TYPES
// ============================================

/**
 * Actor who initiated the transaction
 */
export type TransactionActor = 'SYSTEM' | 'USER';

/**
 * Game phase when transaction occurred
 */
export type GamePhase =
  | 'PRE_SEASON'
  | 'REGULAR_SEASON'
  | 'PLAYOFFS'
  | 'CHAMPIONSHIP'
  | 'OFFSEASON';

/**
 * Transaction types per spec
 */
export type TransactionType =
  // Game Flow
  | 'GAME_START'
  | 'GAME_COMPLETE'
  | 'STAT_RECORDED'
  // Trades
  | 'TRADE_EXECUTED'
  | 'TRADE_WINDOW_CLOSED'
  // Player Updates
  | 'NICKNAME_EARNED'
  | 'NICKNAME_CHANGED'
  | 'LEGACY_STATUS_CHANGE'
  | 'PERSONALITY_CHANGE'
  | 'TRAIT_ASSIGNED'
  | 'EOS_ADJUSTMENT'
  // Awards
  | 'AWARD_WON'
  | 'ALL_STAR_SELECTED'
  | 'SALARY_BONUS_APPLIED'
  | 'TEAM_MVP'
  // Team Updates
  | 'RIVALRY_UPDATED'
  | 'FAN_MORALE_CHANGE'
  | 'CONTRACTION_WARNING'
  | 'TEAM_CONTRACTED'
  // Offseason
  | 'RETIREMENT'
  | 'HOF_INDUCTION'
  | 'FA_SIGNING'
  | 'DRAFT_PICK'
  // Memorable Moments
  | 'MOMENT_RECORDED'
  // Season Management
  | 'SEASON_START'
  | 'SEASON_ARCHIVED'
  | 'CHAMPIONSHIP'
  // User Actions
  | 'UNDO_ACTION'
  | 'MANUAL_EDIT';

/**
 * Transaction log entry - the main record
 */
export interface TransactionLogEntry {
  id: string;                    // Unique transaction ID (txn_XXXXXX)
  timestamp: string;             // ISO 8601 timestamp
  season: number;                // Season number
  gameNumber: number | null;     // null if offseason
  phase: GamePhase;              // Current game phase

  type: TransactionType;         // Transaction type
  actor: TransactionActor;       // Who initiated

  data: Record<string, unknown>; // Type-specific payload

  // For rollback capability
  previousState: Record<string, unknown> | null;

  // Metadata
  undone: boolean;
  undoneAt: string | null;
  undoneBy: TransactionActor | null;
}

/**
 * Input for creating a new transaction
 */
export interface TransactionInput {
  type: TransactionType;
  actor?: TransactionActor;      // Defaults to 'SYSTEM'
  season: number;
  gameNumber?: number | null;
  phase?: GamePhase;
  data: Record<string, unknown>;
  previousState?: Record<string, unknown> | null;
}

// ============================================
// DATABASE INITIALIZATION
// ============================================

/**
 * Generate unique transaction ID
 */
function generateTransactionId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let id = 'txn_';
  for (let i = 0; i < 12; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

/**
 * Initialize the transaction database
 */
export async function initTransactionDB(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('[TransactionStorage] Failed to open database:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(STORES.TRANSACTIONS)) {
        const store = db.createObjectStore(STORES.TRANSACTIONS, { keyPath: 'id' });

        // Indexes for common queries
        store.createIndex('by_timestamp', 'timestamp', { unique: false });
        store.createIndex('by_season', 'season', { unique: false });
        store.createIndex('by_type', 'type', { unique: false });
        store.createIndex('by_phase', 'phase', { unique: false });
        store.createIndex('by_actor', 'actor', { unique: false });

        // Composite index for season + game
        store.createIndex('by_season_game', ['season', 'gameNumber'], { unique: false });
      }
    };
  });
}

// ============================================
// TRANSACTION CRUD OPERATIONS
// ============================================

/**
 * Log a new transaction
 */
export async function logTransaction(input: TransactionInput): Promise<TransactionLogEntry> {
  const db = await initTransactionDB();

  const entry: TransactionLogEntry = {
    id: generateTransactionId(),
    timestamp: new Date().toISOString(),
    season: input.season,
    gameNumber: input.gameNumber ?? null,
    phase: input.phase ?? 'REGULAR_SEASON',
    type: input.type,
    actor: input.actor ?? 'SYSTEM',
    data: input.data,
    previousState: input.previousState ?? null,
    undone: false,
    undoneAt: null,
    undoneBy: null,
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.TRANSACTIONS, 'readwrite');
    const store = transaction.objectStore(STORES.TRANSACTIONS);
    const request = store.add(entry);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(entry);
  });
}

/**
 * Get a transaction by ID
 */
export async function getTransaction(id: string): Promise<TransactionLogEntry | null> {
  const db = await initTransactionDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.TRANSACTIONS, 'readonly');
    const store = transaction.objectStore(STORES.TRANSACTIONS);
    const request = store.get(id);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || null);
  });
}

/**
 * Get transactions by season
 */
export async function getTransactionsBySeason(season: number): Promise<TransactionLogEntry[]> {
  const db = await initTransactionDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.TRANSACTIONS, 'readonly');
    const store = transaction.objectStore(STORES.TRANSACTIONS);
    const index = store.index('by_season');
    const request = index.getAll(season);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || []);
  });
}

/**
 * Get transactions by type
 */
export async function getTransactionsByType(type: TransactionType): Promise<TransactionLogEntry[]> {
  const db = await initTransactionDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.TRANSACTIONS, 'readonly');
    const store = transaction.objectStore(STORES.TRANSACTIONS);
    const index = store.index('by_type');
    const request = index.getAll(type);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || []);
  });
}

/**
 * Get transactions for a specific game
 */
export async function getTransactionsByGame(
  season: number,
  gameNumber: number
): Promise<TransactionLogEntry[]> {
  const db = await initTransactionDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.TRANSACTIONS, 'readonly');
    const store = transaction.objectStore(STORES.TRANSACTIONS);
    const index = store.index('by_season_game');
    const request = index.getAll([season, gameNumber]);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || []);
  });
}

/**
 * Get recent transactions (most recent first)
 */
export async function getRecentTransactions(limit: number = 50): Promise<TransactionLogEntry[]> {
  const db = await initTransactionDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.TRANSACTIONS, 'readonly');
    const store = transaction.objectStore(STORES.TRANSACTIONS);
    const index = store.index('by_timestamp');

    const results: TransactionLogEntry[] = [];
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

/**
 * Get offseason transactions
 */
export async function getOffseasonTransactions(season: number): Promise<TransactionLogEntry[]> {
  const db = await initTransactionDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.TRANSACTIONS, 'readonly');
    const store = transaction.objectStore(STORES.TRANSACTIONS);
    const index = store.index('by_phase');
    const request = index.getAll('OFFSEASON');

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const all = request.result as TransactionLogEntry[];
      resolve(all.filter(t => t.season === season));
    };
  });
}

// ============================================
// UNDO OPERATIONS
// ============================================

/**
 * Mark a transaction as undone
 */
export async function undoTransaction(
  id: string,
  actor: TransactionActor = 'USER'
): Promise<TransactionLogEntry | null> {
  const db = await initTransactionDB();
  const existing = await getTransaction(id);

  if (!existing) {
    console.error(`[TransactionStorage] Transaction not found: ${id}`);
    return null;
  }

  if (existing.undone) {
    console.warn(`[TransactionStorage] Transaction already undone: ${id}`);
    return existing;
  }

  if (!existing.previousState) {
    console.error(`[TransactionStorage] No previousState for rollback: ${id}`);
    return null;
  }

  const updated: TransactionLogEntry = {
    ...existing,
    undone: true,
    undoneAt: new Date().toISOString(),
    undoneBy: actor,
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.TRANSACTIONS, 'readwrite');
    const store = transaction.objectStore(STORES.TRANSACTIONS);
    const request = store.put(updated);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      // Log the undo action as its own transaction
      logTransaction({
        type: 'UNDO_ACTION',
        actor,
        season: existing.season,
        gameNumber: existing.gameNumber,
        phase: existing.phase,
        data: {
          originalTransactionId: id,
          originalType: existing.type,
          restoredState: existing.previousState,
        },
      });
      resolve(updated);
    };
  });
}

// ============================================
// CONVENIENCE LOGGERS
// ============================================

/**
 * Log a game start event
 */
export function logGameStart(
  season: number,
  gameNumber: number,
  homeTeam: string,
  awayTeam: string,
  gameDate: string
): Promise<TransactionLogEntry> {
  return logTransaction({
    type: 'GAME_START',
    season,
    gameNumber,
    phase: 'REGULAR_SEASON',
    data: { gameNumber, homeTeam, awayTeam, gameDate },
  });
}

/**
 * Log a game complete event
 */
export function logGameComplete(
  season: number,
  gameNumber: number,
  homeTeam: string,
  awayTeam: string,
  homeScore: number,
  awayScore: number,
  pogPlayerId?: string
): Promise<TransactionLogEntry> {
  return logTransaction({
    type: 'GAME_COMPLETE',
    season,
    gameNumber,
    phase: 'REGULAR_SEASON',
    data: {
      gameNumber,
      homeTeam,
      awayTeam,
      score: { home: homeScore, away: awayScore },
      pog: pogPlayerId,
    },
  });
}

/**
 * Log a trade execution
 */
export function logTrade(
  season: number,
  gameNumber: number | null,
  team1: string,
  team2: string,
  playersFromTeam1: string[],
  playersFromTeam2: string[],
  cash?: number
): Promise<TransactionLogEntry> {
  return logTransaction({
    type: 'TRADE_EXECUTED',
    season,
    gameNumber,
    phase: gameNumber ? 'REGULAR_SEASON' : 'OFFSEASON',
    data: {
      team1,
      team2,
      playersFromTeam1,
      playersFromTeam2,
      cash: cash ?? 0,
    },
  });
}

/**
 * Log a player retirement
 */
export function logRetirement(
  season: number,
  playerId: string,
  playerName: string,
  careerStats: Record<string, unknown>
): Promise<TransactionLogEntry> {
  return logTransaction({
    type: 'RETIREMENT',
    season,
    gameNumber: null,
    phase: 'OFFSEASON',
    data: { playerId, playerName, careerStats },
  });
}

/**
 * Log a Hall of Fame induction
 */
export function logHOFInduction(
  season: number,
  playerId: string,
  playerName: string,
  votes: number,
  yearsPending: number
): Promise<TransactionLogEntry> {
  return logTransaction({
    type: 'HOF_INDUCTION',
    season,
    gameNumber: null,
    phase: 'OFFSEASON',
    data: { playerId, playerName, votes, yearsPending },
  });
}

/**
 * Log a free agent signing
 */
export function logFASigning(
  season: number,
  playerId: string,
  playerName: string,
  oldTeam: string | null,
  newTeam: string,
  salary: number
): Promise<TransactionLogEntry> {
  return logTransaction({
    type: 'FA_SIGNING',
    season,
    gameNumber: null,
    phase: 'OFFSEASON',
    data: { playerId, playerName, oldTeam, newTeam, salary },
  });
}

/**
 * Log a draft pick
 */
export function logDraftPick(
  season: number,
  playerId: string,
  playerName: string,
  teamId: string,
  round: number,
  pick: number
): Promise<TransactionLogEntry> {
  return logTransaction({
    type: 'DRAFT_PICK',
    season,
    gameNumber: null,
    phase: 'OFFSEASON',
    data: { playerId, playerName, teamId, round, pick },
  });
}

/**
 * Log an award
 */
export function logAward(
  season: number,
  playerId: string,
  playerName: string,
  awardType: string,
  votes?: number
): Promise<TransactionLogEntry> {
  return logTransaction({
    type: 'AWARD_WON',
    season,
    gameNumber: null,
    phase: 'OFFSEASON',
    data: { playerId, playerName, awardType, votes },
  });
}

/**
 * Log a manual edit
 */
export function logManualEdit(
  season: number,
  entityType: string,
  entityId: string,
  field: string,
  oldValue: unknown,
  newValue: unknown
): Promise<TransactionLogEntry> {
  return logTransaction({
    type: 'MANUAL_EDIT',
    actor: 'USER',
    season,
    phase: 'REGULAR_SEASON',
    data: { entityType, entityId, field, oldValue, newValue },
    previousState: { [field]: oldValue },
  });
}

// ============================================
// QUERY HELPERS
// ============================================

/**
 * Get all transactions of a specific type for a season
 */
export async function getSeasonTransactionsByType(
  season: number,
  type: TransactionType
): Promise<TransactionLogEntry[]> {
  const all = await getTransactionsBySeason(season);
  return all.filter(t => t.type === type);
}

/**
 * Get count of transactions by type for a season
 */
export async function getTransactionCounts(
  season: number
): Promise<Record<TransactionType, number>> {
  const all = await getTransactionsBySeason(season);
  const counts: Partial<Record<TransactionType, number>> = {};

  for (const txn of all) {
    counts[txn.type] = (counts[txn.type] || 0) + 1;
  }

  return counts as Record<TransactionType, number>;
}

/**
 * Check if a transaction can be undone
 */
export async function canUndo(id: string): Promise<boolean> {
  const txn = await getTransaction(id);
  return txn !== null && !txn.undone && txn.previousState !== null;
}
