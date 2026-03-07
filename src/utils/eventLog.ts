/**
 * Event Log System
 *
 * BULLETPROOF DATA INTEGRITY
 *
 * This system captures every at-bat with full situational context, enabling:
 * 1. Complete game reconstruction (box scores)
 * 2. Full season stat recalculation from raw events
 * 3. Advanced metrics recalculation (WAR, Clutch, Leverage, WPA)
 * 4. Fame event recalculation
 * 5. Recovery from any crash or write failure
 *
 * STORAGE STRATEGY:
 * - Events written IMMEDIATELY after each at-bat (not debounced)
 * - Game marked "aggregated: false" until season aggregation succeeds
 * - On startup, any unaggregated games are re-processed
 * - Full event log preserved forever (enables historical analysis)
 *
 * STORAGE COST: ~500 bytes/at-bat × 70 at-bats/game = ~35KB/game
 * Total games per season = (numTeams × gamesPerTeam) / 2
 * Example: 8 teams × 128 games/team = 512 unique games × 35KB = ~18MB/season
 * (Configured via seasons.csv gamesPerTeam and league numTeams)
 */

import type { AtBatResult, Position, HalfInning, SpecialPlayType, MojoLevelLabel, FitnessLevelLabel, FameLevel, SpecPitcherRole, HiddenModifiers } from '../types/game';
import type { ParkFactors } from '../types/war';

// ============================================
// DATABASE SETUP
// ============================================

const DB_NAME = 'kbl-event-log';
const DB_VERSION = 3;

const STORES = {
  GAME_HEADERS: 'gameHeaders',      // Game metadata and aggregation status
  AT_BAT_EVENTS: 'atBatEvents',     // Individual at-bat events
  PITCHING_APPEARANCES: 'pitchingAppearances',  // Pitcher entry/exit for inherited runners
  FIELDING_EVENTS: 'fieldingEvents', // Fielding plays for FWAR
  BETWEEN_PLAY_EVENTS: 'betweenPlayEvents', // Between-play events (SB, WP, subs, etc.)
};

let dbInstance: IDBDatabase | null = null;

async function initEventLogDB(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('Failed to open event log database:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Game headers - metadata and aggregation status
      if (!db.objectStoreNames.contains(STORES.GAME_HEADERS)) {
        const gameStore = db.createObjectStore(STORES.GAME_HEADERS, { keyPath: 'gameId' });
        gameStore.createIndex('seasonId', 'seasonId', { unique: false });
        gameStore.createIndex('date', 'date', { unique: false });
        gameStore.createIndex('aggregated', 'aggregated', { unique: false });
        gameStore.createIndex('seasonId_aggregated', ['seasonId', 'aggregated'], { unique: false });
      }

      // At-bat events - the core event log
      if (!db.objectStoreNames.contains(STORES.AT_BAT_EVENTS)) {
        const eventStore = db.createObjectStore(STORES.AT_BAT_EVENTS, { keyPath: 'eventId' });
        eventStore.createIndex('gameId', 'gameId', { unique: false });
        eventStore.createIndex('gameId_eventIndex', ['gameId', 'eventIndex'], { unique: true });
        eventStore.createIndex('batterId', 'batterId', { unique: false });
        eventStore.createIndex('pitcherId', 'pitcherId', { unique: false });
      }

      // Pitching appearances - for inherited runner tracking
      if (!db.objectStoreNames.contains(STORES.PITCHING_APPEARANCES)) {
        const pitchingStore = db.createObjectStore(STORES.PITCHING_APPEARANCES, { keyPath: 'appearanceId' });
        pitchingStore.createIndex('gameId', 'gameId', { unique: false });
        pitchingStore.createIndex('pitcherId', 'pitcherId', { unique: false });
      }

      // Fielding events - for FWAR calculation
      if (!db.objectStoreNames.contains(STORES.FIELDING_EVENTS)) {
        const fieldingStore = db.createObjectStore(STORES.FIELDING_EVENTS, { keyPath: 'fieldingEventId' });
        fieldingStore.createIndex('gameId', 'gameId', { unique: false });
        fieldingStore.createIndex('playerId', 'playerId', { unique: false });
        fieldingStore.createIndex('atBatEventId', 'atBatEventId', { unique: false });
      }

      // Between-play events - SB, WP, substitutions, mojo/fitness changes, etc.
      if (!db.objectStoreNames.contains(STORES.BETWEEN_PLAY_EVENTS)) {
        const bpStore = db.createObjectStore(STORES.BETWEEN_PLAY_EVENTS, { keyPath: 'eventId' });
        bpStore.createIndex('gameId', 'gameId', { unique: false });
        bpStore.createIndex('type', 'type', { unique: false });
      }
    };
  });
}

// ============================================
// TYPES
// ============================================

/** Game header with aggregation status */
export interface GameHeader {
  gameId: string;
  seasonId: string;
  date: number;  // timestamp

  // Teams
  awayTeamId: string;
  awayTeamName: string;
  homeTeamId: string;
  homeTeamName: string;
  stadiumName?: string | null;

  // Final state
  finalScore: { away: number; home: number } | null;  // null if game in progress
  finalInning: number;
  isComplete: boolean;

  // Aggregation tracking
  aggregated: boolean;           // Has this game been aggregated to season stats?
  aggregatedAt: number | null;   // When was it aggregated?
  aggregationError: string | null;  // Last error if aggregation failed

  // Integrity
  eventCount: number;            // Number of at-bat events (for verification)
  checksum: string;              // Hash of all events (for integrity verification)
}

/** Full situational context for an at-bat */
export interface AtBatEvent {
  eventId: string;               // Unique ID: `${gameId}_${eventIndex}`
  gameId: string;
  eventIndex: number;            // 1, 2, 3... order within game
  timestamp: number;

  // Who
  batterId: string;
  batterName: string;
  batterTeamId: string;
  pitcherId: string;
  pitcherName: string;
  pitcherTeamId: string;

  // Result
  result: AtBatResult;
  rbiCount: number;
  runsScored: string[] | number;  // Spec: string[] of player IDs who scored; legacy: number count. Resolve to string[] only in Tier 1B+.

  // Situation BEFORE at-bat (for Leverage Index, Clutch)
  inning: number;
  halfInning: HalfInning;
  outs: number;
  runners: RunnerState;
  awayScore: number;
  homeScore: number;

  // Situation AFTER at-bat (for WPA calculation)
  outsAfter: number;
  runnersAfter: RunnerState;
  awayScoreAfter: number;
  homeScoreAfter: number;

  // Calculated metrics (can be recalculated but stored for efficiency)
  leverageIndex: number;         // Situation leverage before at-bat
  winProbabilityBefore: number;  // Home team win probability before
  winProbabilityAfter: number;   // Home team win probability after
  wpa: number;                   // Win probability added (from batter's team perspective)

  // Ball in play data (for fielding)
  ballInPlay: BallInPlayData | null;

  // Fame events triggered by this at-bat
  fameEvents: FameEventRecord[];

  // Special flags
  isLeadoff: boolean;            // First batter of inning
  isClutch: boolean;             // High leverage situation
  isWalkOff: boolean;            // Ended the game

  // === LAYER 1B: CONTEXT SNAPSHOT FIELDS (all optional) ===

  // 1.9 (GAP-GT-2-A): Identity fields
  seasonId?: string;
  franchiseId?: string;
  leagueId?: string;

  // 1.10 (GAP-GT-2-G): Park context
  parkContext?: {
    stadiumId: string;
    stadiumName: string;
    parkFactors?: ParkFactors;
    lighting?: 'day' | 'night';
  };

  // 1.11 (GAP-GT-2-C): Team context
  teamContext?: {
    battingTeam: {
      teamId: string;
      teamName: string;
      record?: { w: number; l: number };
      streak?: number;
      divisionRank?: number;
    };
    fieldingTeam: {
      teamId: string;
      teamName: string;
      record?: { w: number; l: number };
      streak?: number;
      divisionRank?: number;
    };
    isRivalryGame?: boolean;
    seriesContext?: {
      game: number;
      of: number;
      seriesScore?: { home: number; away: number };
    };
  };

  // 1.12 (GAP-GT-2-D): Batter context snapshot
  batterContext?: {
    playerId: string;
    playerName: string;
    position?: string;
    battingOrder?: number;
    handedness?: 'L' | 'R' | 'S';
    enteredAs?: 'starter' | 'pinch_hit' | 'pinch_run' | 'defensive_replacement';
    replacedPlayer?: string;
    mojoState?: MojoLevelLabel;
    fitnessLevel?: FitnessLevelLabel;
    currentGameStats?: { ab: number; h: number; hr: number; rbi: number };
    currentSeasonAvg?: number;
    currentSeasonOPS?: number;
    currentStreak?: number;
    seasonHits?: number;
    seasonHR?: number;
    careerHits?: number;
    careerHR?: number;
    fameLevel?: FameLevel;
    personality?: string;
    hiddenModifiers?: HiddenModifiers;
  };

  // 1.13 (GAP-GT-2-E): Pitcher context snapshot
  pitcherContext?: {
    playerId: string;
    playerName: string;
    handedness?: 'L' | 'R';
    role?: SpecPitcherRole;
    mojoState?: MojoLevelLabel;
    fitnessLevel?: FitnessLevelLabel;
    pitchCount?: number;
    currentGameStats?: { ip: number; h: number; er: number; k: number; bb: number };
    currentSeasonERA?: number;
    currentSeasonWHIP?: number;
    seasonStrikeouts?: number;
    careerStrikeouts?: number;
    careerWins?: number;
    inheritedRunners?: number;
    fameLevel?: FameLevel;
    personality?: string;
    hiddenModifiers?: HiddenModifiers;
  };

  // 1.14 (GAP-GT-2-F): Matchup context
  matchupContext?: {
    platoonAdvantage?: 'batter' | 'pitcher' | 'neutral';
    isRivalry?: boolean;
    previousMatchupsThisGame?: { ab: number; h: number };
  };

  // 1.15 (GAP-GT-2-H): Computed fields
  runnerOutcomes?: Array<{
    runnerId: string;
    runnerName: string;
    fromBase: 'first' | 'second' | 'third';
    toBase: 'second' | 'third' | 'home' | 'out';
  }>;
  outsRecorded?: number;
  isQualityAtBat?: boolean;
  milestoneTriggered?: Array<{ type: string; description: string }>;

  // 1.16 (GAP-GT-2-J): Enrichment fields
  enrichment?: {
    fieldLocation?: { x: number; y: number; zone?: string };
    exitType?: 'ground_ball' | 'fly_ball' | 'line_drive' | 'popup' | 'bunt' | string;
    fieldingSequence?: number[];
    putouts?: number[];
    assists?: number[];
    errors?: Array<{ position: number; type: 'fielding' | 'throwing' | 'mental' }>;
    hrDistance?: number;
    pitchType?: string;
    pitchesInAtBat?: number;
    modifiers?: string[];
  };

  // 1.17 (GAP-GT-2-K): Versioning
  version?: number;
  editHistory?: Array<{
    field: string;
    oldValue: unknown;
    newValue: unknown;
    timestamp: number;
  }>;
}

// ============================================
// LAYER 1C: BETWEEN-PLAY EVENT (§2.2)
// ============================================

/** Discriminated union type for all between-play event types */
export type BetweenPlayEventType =
  | 'stolen_base' | 'caught_stealing' | 'pickoff'
  | 'wild_pitch' | 'passed_ball' | 'balk'
  | 'defensive_indifference'
  | 'pitcher_change' | 'substitution' | 'position_change'
  | 'mojo_change' | 'fitness_change' | 'injury'
  | 'pitch_count_update' | 'manager_moment';

/** Formal between-play event interface per spec §2.2 */
export interface BetweenPlayEvent {
  eventId: string;
  gameId: string;
  seasonId?: string;
  franchiseId?: string;
  timestamp: number;
  eventIndex: number;              // Interleaved with AtBatEvent indices

  type: BetweenPlayEventType;

  // Game state snapshot at time of event
  gameState?: {
    inning: number;
    halfInning: 'TOP' | 'BOTTOM';
    outs: number;
    score: { away: number; home: number };
    runnersOn?: {
      first?: string;
      second?: string;
      third?: string;
    };
  };

  // Type-specific payloads (only the one matching `type` is populated)
  stolenBase?: {
    runnerId: string;
    runnerName?: string;
    fromBase: 1 | 2 | 3;
    toBase: 2 | 3 | 4;
    isSuccessful: boolean;
    caughtBy?: number;           // Position number
  };

  pitcherChange?: {
    outgoingPitcherId: string;
    outgoingPitcherName?: string;
    incomingPitcherId: string;
    incomingPitcherName?: string;
    inheritedRunners: number;
    outgoingPitchCount?: number;
    outgoingIP?: number;
  };

  substitution?: {
    subType: 'pinch_hit' | 'pinch_run' | 'defensive_replacement' | 'position_change';
    outPlayerId: string;
    outPlayerName?: string;
    outPosition?: string;
    inPlayerId: string;
    inPlayerName?: string;
    inPosition?: string;
    previousPosition?: string;   // For position_change
  };

  playerStateChange?: {
    playerId: string;
    playerName?: string;
    stateType: 'mojo' | 'fitness';
    previousValue: string | number;
    newValue: string | number;
    reason?: string;
  };

  wildPitchOrPassedBall?: {
    wpOrPb: 'wild_pitch' | 'passed_ball';
    pitcherId: string;
    catcherId?: string;
    runnersAdvanced?: Array<{ runnerId: string; fromBase: number; toBase: number }>;
    runScored?: string;          // Player ID who scored
  };

  pitchCountUpdate?: {
    pitcherId: string;
    pitchCount: number;
    timing: 'end_of_half_inning' | 'pitcher_removed' | 'end_of_game';
  };

  managerMoment?: {
    leverageIndex: number;
    decisionType: string;
    context?: string;
    outcomeEventId?: string;
    outcomeWPA?: number;
  };
}

/** Runner state for situational tracking */
export interface RunnerState {
  first: RunnerInfo | null;
  second: RunnerInfo | null;
  third: RunnerInfo | null;
}

export interface RunnerInfo {
  runnerId: string;
  runnerName: string;
  responsiblePitcherId: string;  // For earned run attribution
}

/** Ball in play data for fielding */
export interface BallInPlayData {
  trajectory: 'ground' | 'line' | 'fly' | 'popup' | 'bunt';
  zone: number;                  // Field zone (1-6 or more detailed)
  velocity: 'soft' | 'medium' | 'hard';
  fielderIds: string[];          // Who fielded the ball
  primaryFielderId: string;      // Who gets primary credit/blame
}

/** Fame event linked to at-bat */
export interface FameEventRecord {
  eventType: string;
  fameType: 'bonus' | 'boner';
  fameValue: number;
  playerId: string;
  playerName: string;
  description: string;
}

/** Pitching appearance for inherited runner tracking */
export interface PitchingAppearance {
  appearanceId: string;          // `${gameId}_${pitcherId}_${entrySequence}`
  gameId: string;
  pitcherId: string;
  pitcherName: string;
  teamId: string;

  // Entry
  entryInning: number;
  entryHalfInning: HalfInning;
  entryOuts: number;
  entrySequence: number;         // At-bat sequence when entered
  isStarter: boolean;

  // Inherited runners
  inheritedRunners: RunnerInfo[];
  inheritedRunnersScored: number;

  // Exit (null if still pitching)
  exitInning: number | null;
  exitHalfInning: HalfInning | null;
  exitOuts: number | null;
  exitSequence: number | null;

  // Bequeathed runners
  bequeathedRunners: RunnerInfo[];
  bequeathedRunnersScored: number;

  // Game stats (accumulated)
  outsRecorded: number;
  hitsAllowed: number;
  runsAllowed: number;
  earnedRuns: number;
  walksAllowed: number;
  strikeouts: number;
  homeRunsAllowed: number;
  hitBatsmen: number;
  wildPitches: number;
  battersFaced: number;
}

/** Fielding event for FWAR */
export interface FieldingEvent {
  fieldingEventId: string;
  gameId: string;
  atBatEventId: string;
  sequence: number;

  // Fielder identification
  // NOTE: playerId/playerName may be position-based if lineup lookup unavailable
  // fWAR calculator should use position + teamId to resolve to actual player
  playerId: string;
  playerName: string;
  position: Position;
  teamId: string;  // Which team made the fielding play

  playType: 'putout' | 'assist' | 'error' | 'double_play_pivot' | 'outfield_assist';
  difficulty: 'routine' | 'likely' | '50-50' | 'unlikely' | 'spectacular';
  specialPlayType?: SpecialPlayType | null;

  // For range calculation
  ballInPlay: BallInPlayData;

  // Result
  success: boolean;
  runsPreventedOrAllowed: number;  // Positive = prevented, negative = allowed
}

// ============================================
// WRITE OPERATIONS
// ============================================

/**
 * Create a new game header
 * Called at game start
 */
export async function createGameHeader(header: Omit<GameHeader, 'aggregated' | 'aggregatedAt' | 'aggregationError' | 'eventCount' | 'checksum'>): Promise<void> {
  const db = await initEventLogDB();

  const fullHeader: GameHeader = {
    ...header,
    aggregated: false,
    aggregatedAt: null,
    aggregationError: null,
    eventCount: 0,
    checksum: '',
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.GAME_HEADERS, 'readwrite');
    const store = transaction.objectStore(STORES.GAME_HEADERS);
    const request = store.put(fullHeader);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * Log an at-bat event
 * Called IMMEDIATELY after each at-bat (not debounced)
 */
export async function logAtBatEvent(event: AtBatEvent): Promise<void> {
  const db = await initEventLogDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.AT_BAT_EVENTS, STORES.GAME_HEADERS], 'readwrite');

    // Add the event
    const eventStore = transaction.objectStore(STORES.AT_BAT_EVENTS);
    eventStore.put(event);

    // Increment event count in header
    const headerStore = transaction.objectStore(STORES.GAME_HEADERS);
    const headerRequest = headerStore.get(event.gameId);

    headerRequest.onsuccess = () => {
      const header = headerRequest.result as GameHeader;
      if (header) {
        header.eventCount += 1;
        headerStore.put(header);
      }
    };

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

/**
 * Log a pitching appearance
 */
export async function logPitchingAppearance(appearance: PitchingAppearance): Promise<void> {
  const db = await initEventLogDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.PITCHING_APPEARANCES, 'readwrite');
    const store = transaction.objectStore(STORES.PITCHING_APPEARANCES);
    const request = store.put(appearance);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * Log a fielding event
 */
export async function logFieldingEvent(event: FieldingEvent): Promise<void> {
  const db = await initEventLogDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.FIELDING_EVENTS, 'readwrite');
    const store = transaction.objectStore(STORES.FIELDING_EVENTS);
    const request = store.put(event);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * Log a between-play event (SB, WP, substitution, mojo change, etc.)
 */
export async function logBetweenPlayEvent(event: BetweenPlayEvent): Promise<void> {
  const db = await initEventLogDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.BETWEEN_PLAY_EVENTS, 'readwrite');
    const store = transaction.objectStore(STORES.BETWEEN_PLAY_EVENTS);
    const request = store.put(event);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * Update an existing AtBatEvent in IndexedDB (for post-hoc enrichment).
 * Uses put() which overwrites the record at the same eventId key.
 */
export async function updateAtBatEvent(
  eventId: string,
  updates: Partial<Pick<AtBatEvent, 'enrichment' | 'result' | 'isQualityAtBat' | 'version' | 'editHistory'>>
): Promise<void> {
  const db = await initEventLogDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.AT_BAT_EVENTS, 'readwrite');
    const store = transaction.objectStore(STORES.AT_BAT_EVENTS);
    const getRequest = store.get(eventId);

    getRequest.onsuccess = () => {
      const existing = getRequest.result as AtBatEvent | undefined;
      if (!existing) {
        reject(new Error(`AtBatEvent not found: ${eventId}`));
        return;
      }

      // Merge enrichment (shallow merge into existing enrichment object)
      if (updates.enrichment) {
        existing.enrichment = { ...(existing.enrichment || {}), ...updates.enrichment };
      }
      // Direct field updates
      if (updates.result !== undefined) existing.result = updates.result;
      if (updates.isQualityAtBat !== undefined) existing.isQualityAtBat = updates.isQualityAtBat;
      if (updates.version !== undefined) existing.version = updates.version;

      // Append to edit history
      if (updates.editHistory) {
        existing.editHistory = [...(existing.editHistory || []), ...updates.editHistory];
      }

      store.put(existing);
    };

    getRequest.onerror = () => reject(getRequest.error);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

/**
 * Mark game as complete
 */
export async function completeGame(
  gameId: string,
  finalScore: { away: number; home: number },
  finalInning: number
): Promise<void> {
  const db = await initEventLogDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.GAME_HEADERS, 'readwrite');
    const store = transaction.objectStore(STORES.GAME_HEADERS);
    const request = store.get(gameId);

    request.onsuccess = () => {
      const header = request.result as GameHeader;
      if (header) {
        header.finalScore = finalScore;
        header.finalInning = finalInning;
        header.isComplete = true;
        store.put(header);
      }
    };

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

/**
 * Mark game as aggregated to season stats
 */
export async function markGameAggregated(gameId: string): Promise<void> {
  const db = await initEventLogDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.GAME_HEADERS, 'readwrite');
    const store = transaction.objectStore(STORES.GAME_HEADERS);
    const request = store.get(gameId);

    request.onsuccess = () => {
      const header = request.result as GameHeader;
      if (header) {
        header.aggregated = true;
        header.aggregatedAt = Date.now();
        header.aggregationError = null;
        store.put(header);
      }
    };

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

/**
 * Mark aggregation as failed with error
 */
export async function markAggregationFailed(gameId: string, error: string): Promise<void> {
  const db = await initEventLogDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.GAME_HEADERS, 'readwrite');
    const store = transaction.objectStore(STORES.GAME_HEADERS);
    const request = store.get(gameId);

    request.onsuccess = () => {
      const header = request.result as GameHeader;
      if (header) {
        header.aggregationError = error;
        store.put(header);
      }
    };

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

// ============================================
// READ OPERATIONS
// ============================================

/**
 * Get all unaggregated games (for recovery on startup)
 */
export async function getUnaggregatedGames(seasonId?: string): Promise<GameHeader[]> {
  const db = await initEventLogDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.GAME_HEADERS, 'readonly');
    const store = transaction.objectStore(STORES.GAME_HEADERS);

    // Get all games and filter in JavaScript (simpler than boolean indexing in IndexedDB)
    let request: IDBRequest;
    if (seasonId) {
      const index = store.index('seasonId');
      request = index.getAll(seasonId);
    } else {
      request = store.getAll();
    }

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      // Filter to only complete but unaggregated games
      const games = (request.result as GameHeader[]).filter(g => g.isComplete && !g.aggregated);
      resolve(games);
    };
  });
}

/**
 * Get all at-bat events for a game
 */
export async function getGameEvents(gameId: string): Promise<AtBatEvent[]> {
  const db = await initEventLogDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.AT_BAT_EVENTS, 'readonly');
    const store = transaction.objectStore(STORES.AT_BAT_EVENTS);
    const index = store.index('gameId');
    const request = index.getAll(gameId);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      // Sort by eventIndex
      const events = (request.result as AtBatEvent[]).sort((a, b) => a.eventIndex - b.eventIndex);
      resolve(events);
    };
  });
}

/**
 * Get pitching appearances for a game
 */
export async function getGamePitchingAppearances(gameId: string): Promise<PitchingAppearance[]> {
  const db = await initEventLogDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.PITCHING_APPEARANCES, 'readonly');
    const store = transaction.objectStore(STORES.PITCHING_APPEARANCES);
    const index = store.index('gameId');
    const request = index.getAll(gameId);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result as PitchingAppearance[]);
  });
}

/**
 * Get fielding events for a game
 */
export async function getGameFieldingEvents(gameId: string): Promise<FieldingEvent[]> {
  const db = await initEventLogDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.FIELDING_EVENTS, 'readonly');
    const store = transaction.objectStore(STORES.FIELDING_EVENTS);
    const index = store.index('gameId');
    const request = index.getAll(gameId);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result as FieldingEvent[]);
  });
}

/**
 * Get between-play events for a game
 */
export async function getBetweenPlayEvents(gameId: string): Promise<BetweenPlayEvent[]> {
  const db = await initEventLogDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.BETWEEN_PLAY_EVENTS, 'readonly');
    const store = transaction.objectStore(STORES.BETWEEN_PLAY_EVENTS);
    const index = store.index('gameId');
    const request = index.getAll(gameId);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const events = (request.result as BetweenPlayEvent[]).sort((a, b) => a.eventIndex - b.eventIndex);
      resolve(events);
    };
  });
}

/**
 * Get game header
 */
export async function getGameHeader(gameId: string): Promise<GameHeader | null> {
  const db = await initEventLogDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.GAME_HEADERS, 'readonly');
    const store = transaction.objectStore(STORES.GAME_HEADERS);
    const request = store.get(gameId);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || null);
  });
}

/**
 * Get all games for a season (for box score access)
 */
export async function getSeasonGames(seasonId: string): Promise<GameHeader[]> {
  const db = await initEventLogDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.GAME_HEADERS, 'readonly');
    const store = transaction.objectStore(STORES.GAME_HEADERS);
    const index = store.index('seasonId');
    const request = index.getAll(seasonId);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      // Sort by date
      const games = (request.result as GameHeader[]).sort((a, b) => a.date - b.date);
      resolve(games);
    };
  });
}

// ============================================
// BOX SCORE GENERATION
// ============================================

export interface BoxScoreBatter {
  playerId: string;
  playerName: string;
  battingOrder: number;
  ab: number;
  runs: number;
  hits: number;
  rbi: number;
  walks: number;
  strikeouts: number;
  avg: string;  // Formatted
}

export interface BoxScorePitcher {
  playerId: string;
  playerName: string;
  ip: string;  // Formatted: "5.2"
  hits: number;
  runs: number;
  earnedRuns: number;
  walks: number;
  strikeouts: number;
  homeRuns: number;
  pitchCount?: number;
  decision?: 'W' | 'L' | 'S' | 'H' | 'BS';
}

export interface BoxScore {
  gameId: string;
  date: number;
  awayTeam: {
    id: string;
    name: string;
    runs: number;
    hits: number;
    errors: number;
    batters: BoxScoreBatter[];
    pitchers: BoxScorePitcher[];
  };
  homeTeam: {
    id: string;
    name: string;
    runs: number;
    hits: number;
    errors: number;
    batters: BoxScoreBatter[];
    pitchers: BoxScorePitcher[];
  };
  lineScore: {
    away: number[];  // Runs per inning
    home: number[];
  };
  fameEvents: FameEventRecord[];
}

/**
 * Generate a full box score from event log
 */
export async function generateBoxScore(gameId: string): Promise<BoxScore | null> {
  const header = await getGameHeader(gameId);
  if (!header) return null;

  const events = await getGameEvents(gameId);
  const pitchingAppearances = await getGamePitchingAppearances(gameId);
  const fieldingEvents = await getGameFieldingEvents(gameId);

  // Aggregate batter stats
  const batterStats = new Map<string, BoxScoreBatter & { teamId: string }>();
  const lineScore = { away: [] as number[], home: [] as number[] };
  const allFameEvents: FameEventRecord[] = [];

  // Track runs per inning for line score
  let currentInning = 1;
  let awayInningRuns = 0;
  let homeInningRuns = 0;

  for (const event of events) {
    // Batter stats
    const batterId = event.batterId;
    if (!batterStats.has(batterId)) {
      batterStats.set(batterId, {
        playerId: batterId,
        playerName: event.batterName,
        teamId: event.batterTeamId,
        battingOrder: 0,
        ab: 0,
        runs: 0,
        hits: 0,
        rbi: 0,
        walks: 0,
        strikeouts: 0,
        avg: '.000',
      });
    }
    const batter = batterStats.get(batterId)!;

    // Count at-bat (walks, HBP, IBB, sac don't count as AB)
    // GAP-GT-6-F: Added IBB, changed SH→SAC (AtBatResult uses 'SAC' not 'SH')
    const isAB = !['BB', 'IBB', 'HBP', 'SF', 'SAC'].includes(event.result);
    if (isAB) batter.ab++;

    // Count hit
    const isHit = ['1B', '2B', '3B', 'HR'].includes(event.result);
    if (isHit) batter.hits++;

    // Other stats
    batter.rbi += event.rbiCount;
    if (event.result === 'BB' || event.result === 'IBB') batter.walks++;
    if (event.result === 'K' || event.result === 'Kc') batter.strikeouts++;

    // Line score tracking
    if (event.inning > currentInning) {
      // Save previous inning
      lineScore.away.push(awayInningRuns);
      lineScore.home.push(homeInningRuns);
      awayInningRuns = 0;
      homeInningRuns = 0;
      currentInning = event.inning;
    }

    if (event.halfInning === 'TOP') {
      awayInningRuns += event.awayScoreAfter - event.awayScore;
    } else {
      homeInningRuns += event.homeScoreAfter - event.homeScore;
    }

    // Collect fame events
    allFameEvents.push(...event.fameEvents);
  }

  // Push final inning
  lineScore.away.push(awayInningRuns);
  lineScore.home.push(homeInningRuns);

  // Calculate averages
  for (const batter of batterStats.values()) {
    if (batter.ab > 0) {
      batter.avg = (batter.hits / batter.ab).toFixed(3).replace(/^0/, '');
    }
  }

  // Count team errors from fielding events
  const awayErrors = fieldingEvents.filter(f => !f.success && f.playType === 'error').length;
  const homeErrors = fieldingEvents.filter(f => !f.success && f.playType === 'error').length;

  // Split batters and pitchers by team
  const awayBatters = Array.from(batterStats.values())
    .filter(b => b.teamId === header.awayTeamId)
    .map(({ teamId, ...rest }) => rest);
  const homeBatters = Array.from(batterStats.values())
    .filter(b => b.teamId === header.homeTeamId)
    .map(({ teamId, ...rest }) => rest);

  const awayPitchers = pitchingAppearances
    .filter(p => p.teamId === header.awayTeamId)
    .map(app => ({
      playerId: app.pitcherId,
      playerName: app.pitcherName,
      ip: formatInningsPitched(app.outsRecorded),
      hits: app.hitsAllowed,
      runs: app.runsAllowed,
      earnedRuns: app.earnedRuns,
      walks: app.walksAllowed,
      strikeouts: app.strikeouts,
      homeRuns: app.homeRunsAllowed,
    }));

  const homePitchers = pitchingAppearances
    .filter(p => p.teamId === header.homeTeamId)
    .map(app => ({
      playerId: app.pitcherId,
      playerName: app.pitcherName,
      ip: formatInningsPitched(app.outsRecorded),
      hits: app.hitsAllowed,
      runs: app.runsAllowed,
      earnedRuns: app.earnedRuns,
      walks: app.walksAllowed,
      strikeouts: app.strikeouts,
      homeRuns: app.homeRunsAllowed,
    }));

  return {
    gameId,
    date: header.date,
    awayTeam: {
      id: header.awayTeamId,
      name: header.awayTeamName,
      runs: header.finalScore?.away ?? 0,
      hits: awayBatters.reduce((sum, b) => sum + b.hits, 0),
      errors: awayErrors,
      batters: awayBatters,
      pitchers: awayPitchers,
    },
    homeTeam: {
      id: header.homeTeamId,
      name: header.homeTeamName,
      runs: header.finalScore?.home ?? 0,
      hits: homeBatters.reduce((sum, b) => sum + b.hits, 0),
      errors: homeErrors,
      batters: homeBatters,
      pitchers: homePitchers,
    },
    lineScore,
    fameEvents: allFameEvents,
  };
}

function formatInningsPitched(outs: number): string {
  const full = Math.floor(outs / 3);
  const partial = outs % 3;
  return `${full}.${partial}`;
}

// ============================================
// INTEGRITY & RECOVERY
// ============================================

/**
 * Check data integrity on app startup
 * Returns list of games needing re-aggregation
 */
export async function checkDataIntegrity(): Promise<{
  needsAggregation: GameHeader[];
  hasErrors: GameHeader[];
  incompleteGames: GameHeader[];
}> {
  const db = await initEventLogDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.GAME_HEADERS, 'readonly');
    const store = transaction.objectStore(STORES.GAME_HEADERS);
    const request = store.getAll();

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const games = request.result as GameHeader[];

      const needsAggregation = games.filter(g => g.isComplete && !g.aggregated);
      const hasErrors = games.filter(g => g.aggregationError !== null);
      const incompleteGames = games.filter(g => !g.isComplete);

      resolve({ needsAggregation, hasErrors, incompleteGames });
    };
  });
}

/**
 * Verify event count matches stored count
 */
export async function verifyGameIntegrity(gameId: string): Promise<{
  valid: boolean;
  storedCount: number;
  actualCount: number;
}> {
  const header = await getGameHeader(gameId);
  if (!header) return { valid: false, storedCount: 0, actualCount: 0 };

  const events = await getGameEvents(gameId);

  return {
    valid: header.eventCount === events.length,
    storedCount: header.eventCount,
    actualCount: events.length,
  };
}
