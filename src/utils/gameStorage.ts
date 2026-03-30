/**
 * Game Storage Utility
 * Per STAT_TRACKING_ARCHITECTURE_SPEC.md - Phase 2: Game Persistence
 *
 * Provides IndexedDB storage for game state, allowing recovery after page refresh.
 */

import type {
  Chemistry,
  Grade,
  MojoState,
  Personality,
  PitchType,
  Position,
} from "./leagueBuilderStorage";
import { getTrackerDb } from "./trackerDb";

export type CompetitionType =
  | "exhibition"
  | "franchise"
  | "playoff"
  | "elimination";

// Store names
const STORES = {
  CURRENT_GAME: "currentGame",
  COMPLETED_GAMES: "completedGames",
  PLAYER_GAME_STATS: "playerGameStats",
  PITCHER_GAME_STATS: "pitcherGameStats",
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
  id: string; // Always 'current' for the active game
  gameId: string;
  savedAt: number;

  // Core game state
  inning: number;
  halfInning: "TOP" | "BOTTOM";
  outs: number;
  homeScore: number;
  awayScore: number;
  bases: {
    first: {
      playerId: string;
      playerName: string;
      inheritedFrom?: string | null;
    } | null;
    second: {
      playerId: string;
      playerName: string;
      inheritedFrom?: string | null;
    } | null;
    third: {
      playerId: string;
      playerName: string;
      inheritedFrom?: string | null;
    } | null;
  };
  currentBatterIndex: number;
  atBatCount: number;

  // Team info
  awayTeamId: string;
  homeTeamId: string;
  awayTeamName: string;
  homeTeamName: string;
  seasonNumber: number;
  stadiumName?: string | null;
  currentBatterId?: string;
  currentBatterName?: string;
  currentPitcherId?: string;
  currentPitcherName?: string;

  // Player stats (batting)
  playerStats: Record<
    string,
    {
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
      hbp: number;
      k: number;
      sb: number;
      cs: number;
      sf: number;
      sh: number;
      gidp: number;
      putouts: number;
      assists: number;
      fieldingErrors: number;
      // --- NEW SMB4 METRICS ---
      d3kOutcomes?: number;
      divingCatches?: number;
      robberies?: number;
      nutshots?: number;
    }
  >;

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
    decision: "W" | "L" | "ND" | null;
    save: boolean;
    hold: boolean;
    blownSave: boolean;
    // --- NEW SMB4 METRICS ---
    comebackerInjuries?: number;
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
    fameType: "bonus" | "boner";
    inning: number;
    halfInning: "TOP" | "BOTTOM";
    timestamp: number;
    autoDetected: boolean;
    description?: string;
  }>;

  // --- NEW: ADVANCED TRACKING ARRAYS ---
  managerDecisions?: Array<{
    managerId: string;
    decisionType: string;
    mwarImpact: number;
    description: string;
  }>;

  moraleShifts?: Array<{
    teamId: string;
    shiftAmount: number;
    triggerEvent: string;
  }>;

  // Fame detection state
  lastHRBatterId: string | null;
  consecutiveHRCount: number;
  inningStrikeouts: number;
  maxDeficitAway: number;
  maxDeficitHome: number;

  // Activity log (recent entries)
  activityLog: string[];

  // Per-inning pitch tracking (for Immaculate Inning detection)
  currentInningPitches?: {
    pitches: number;
    strikeouts: number;
    pitcherId: string;
  } | null;

  // Optional live snapshot fields for in-progress rehydration.
  // These are ignored by season aggregation/end-game archives.
  scoreboard?: {
    innings: Array<{ away: number | undefined; home: number | undefined }>;
    away: { runs: number; hits: number; errors: number };
    home: { runs: number; hits: number; errors: number };
  };
  awayBatterIndex?: number;
  homeBatterIndex?: number;
  seasonId?: string;
  statsScopeId?: string;
  competitionType?: CompetitionType;
  competitionId?: string;
  // R3: Exhibition game config (lost on refresh without these)
  totalInnings?: number;
  awayUsesDh?: boolean;
  homeUsesDh?: boolean;
  awayLineup?: Array<{
    playerId: string;
    playerName: string;
    position: string;
  }>;
  homeLineup?: Array<{
    playerId: string;
    playerName: string;
    position: string;
  }>;
  awayLineupState?: {
    lineup: Array<{
      playerId: string;
      playerName: string;
      position: string;
      battingOrder: number;
      enteredInning: number;
      enteredFor?: string;
      isStarter: boolean;
    }>;
    bench: Array<{
      playerId: string;
      playerName: string;
      positions: string[];
      isAvailable: boolean;
    }>;
    usedPlayers: string[];
    currentPitcher: {
      playerId: string;
      playerName: string;
      position: string;
      battingOrder: number;
      enteredInning: number;
      enteredFor?: string;
      isStarter: boolean;
    } | null;
  };
  homeLineupState?: {
    lineup: Array<{
      playerId: string;
      playerName: string;
      position: string;
      battingOrder: number;
      enteredInning: number;
      enteredFor?: string;
      isStarter: boolean;
    }>;
    bench: Array<{
      playerId: string;
      playerName: string;
      positions: string[];
      isAvailable: boolean;
    }>;
    usedPlayers: string[];
    currentPitcher: {
      playerId: string;
      playerName: string;
      position: string;
      battingOrder: number;
      enteredInning: number;
      enteredFor?: string;
      isStarter: boolean;
    } | null;
  };
  runnerTrackerSnapshot?: {
    runners: Array<{
      runnerId: string;
      runnerName: string;
      currentBase: "1B" | "2B" | "3B" | "HOME" | "OUT" | null;
      startingBase: "1B" | "2B" | "3B" | "HOME";
      howReached: string;
      responsiblePitcherId: string;
      responsiblePitcherName: string;
      isInherited: boolean;
      inheritedFromPitcherId: string | null;
      inningReached: number;
      atBatReached: number;
    }>;
    currentPitcherId: string;
    currentPitcherName: string;
    pitcherStatsEntries: Array<[string, unknown]>;
    inning: number;
    atBatNumber: number;
  };
  pitcherNamesEntries?: Array<[string, string]>;
  substitutionLog?: Array<{
    type: string;
    inning: number;
    halfInning: "TOP" | "BOTTOM";
    outgoingPlayerId: string;
    outgoingPlayerName: string;
    incomingPlayerId: string;
    incomingPlayerName: string;
    timestamp: number;
  }>;
  playerRatingsSnapshots?: Record<string, PlayerRatingsSnapshot>;

  // R3-T0: Persist exhibition config that lives only in navigationState
  extraInningRunner?: boolean;
  extraInningRunnerDelay?: 1 | 2;

  // R3-T0: Persist team colors (from team DB, not static config)
  awayTeamColor?: string;
  awayTeamBorderColor?: string;
  homeTeamColor?: string;
  homeTeamBorderColor?: string;

  // R3-T0: Persist mojo/fitness state per player (lost on refresh otherwise)
  playerMojoFitness?: Record<string, { mojo: number; fitness: string }>;

  // R3-T0: Persist game start time for elapsed timer
  gameStartTimestamp?: number;
}

export interface PlayerRatingsSnapshot {
  playerId: string;
  firstName: string;
  lastName: string;
  nickname?: string;
  hometown?: { city: string; state: string };
  age: number;
  gender: "M" | "F";
  bats: "L" | "R" | "S";
  throws: "L" | "R";
  primaryPosition: Position;
  secondaryPosition?: Position;
  power: number;
  contact: number;
  speed: number;
  fielding: number;
  arm: number;
  velocity: number;
  junk: number;
  accuracy: number;
  arsenal: PitchType[];
  overallGrade: Grade;
  trait1?: string;
  trait2?: string;
  personality: Personality;
  chemistry: Chemistry;
  morale: number;
  mojo: MojoState;
  fame: number;
  salary: number;
}

export async function saveCurrentGame(
  state: PersistedGameState,
): Promise<void> {
  const db = await initDatabase();
  const record: PersistedGameState = {
    ...state,
    id: "current",
    savedAt: Date.now(),
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.CURRENT_GAME, "readwrite");
    const store = transaction.objectStore(STORES.CURRENT_GAME);
    const request = store.put(record);

    request.onerror = () => {
      console.error("Failed to save current game:", request.error);
      reject(request.error);
    };
    request.onsuccess = () => resolve();
  });
}

export async function loadCurrentGame(): Promise<PersistedGameState | null> {
  const db = await initDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.CURRENT_GAME, "readonly");
    const store = transaction.objectStore(STORES.CURRENT_GAME);
    const request = store.get("current");

    request.onerror = () => {
      console.error("Failed to load current game:", request.error);
      reject(request.error);
    };
    request.onsuccess = () => {
      resolve((request.result as PersistedGameState) || null);
    };
  });
}

export async function clearCurrentGame(): Promise<void> {
  const db = await initDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.CURRENT_GAME, "readwrite");
    const store = transaction.objectStore(STORES.CURRENT_GAME);
    const request = store.delete("current");

    request.onerror = () => {
      console.error("Failed to clear current game:", request.error);
      reject(request.error);
    };
    request.onsuccess = () => resolve();
  });
}

export async function hasSavedGame(): Promise<boolean> {
  const saved = await loadCurrentGame();
  return !!saved;
}

// ============================================
// COMPLETED GAMES ARCHIVE
// ============================================

export interface CompletedGameRecord {
  gameId: string;
  date: number;
  seasonId?: string;
  statsScopeId?: string;
  competitionType?: CompetitionType;
  competitionId?: string;
  leagueId?: string;
  seasonNumber?: number;
  stadiumName?: string | null;
  awayTeamId: string;
  homeTeamId: string;
  awayTeamName: string;
  homeTeamName: string;
  finalScore: { away: number; home: number };
  innings: number;
  fameEvents: PersistedGameState["fameEvents"];
  playerStats: PersistedGameState["playerStats"];
  pitcherGameStats: PersistedGameState["pitcherGameStats"];
  activityLog?: string[];
  inningScores?: { away: number; home: number }[];
  // --- NEW: CATCH THE ADVANCED ARRAYS ---
  managerDecisions?: PersistedGameState["managerDecisions"];
  moraleShifts?: PersistedGameState["moraleShifts"];
  playerRatingsSnapshots?: PersistedGameState["playerRatingsSnapshots"];
}

// ============================================
// LAYER 1C: GAME RECORD & LINEUP ENTRY (§2.4)
// ============================================

/** Lineup slot snapshot captured at game start */
export interface LineupEntry {
  playerId: string;
  playerName: string;
  battingOrder: number; // 1-9
  fieldPosition: string; // Position on field (e.g. 'SS', 'CF')
  primaryPosition?: string; // Roster position (for display context)
}

/**
 * Extended game record with enriched metadata.
 * Extends CompletedGameRecord with lineup snapshots, narrative fields,
 * and cross-references. All new fields are optional so existing records
 * remain valid.
 */
export interface GameRecord extends CompletedGameRecord {
  // Cross-references
  franchiseId?: string;
  leagueId?: string;
  scheduleGameId?: string;

  // Starting lineup snapshots (captured at game init)
  startingLineups?: {
    away: LineupEntry[];
    home: LineupEntry[];
  };

  // Starting pitcher snapshot
  startingPitchers?: {
    away: { playerId: string; playerName: string };
    home: { playerId: string; playerName: string };
  };

  // Game environment
  lighting?: "day" | "night" | "hazy";

  // Narrative enrichment (populated at game end)
  playersOfTheGame?: {
    first: string;
    second?: string;
    third?: string;
  };
  gameStoryArc?:
    | "blowout"
    | "pitchers_duel"
    | "comeback"
    | "walk_off"
    | "extra_innings"
    | "slugfest";
  topMoments?: { eventId: string; wpa: number; description: string }[];
  managerMoments?: string[];
  beatReporterRecap?: string;
  depthScore?: number;
}

/**
 * Capture starting lineups from the lineup state at game initialization.
 * Returns a startingLineups object suitable for GameRecord.
 */
export function captureStartingLineups(
  awayLineup: Array<{
    playerId: string;
    playerName: string;
    position: string;
    battingOrder?: number;
  }>,
  homeLineup: Array<{
    playerId: string;
    playerName: string;
    position: string;
    battingOrder?: number;
  }>,
): { away: LineupEntry[]; home: LineupEntry[] } {
  const mapToLineupEntry = (
    players: Array<{
      playerId: string;
      playerName: string;
      position: string;
      battingOrder?: number;
    }>,
  ): LineupEntry[] =>
    players.map((p, i) => ({
      playerId: p.playerId,
      playerName: p.playerName,
      battingOrder: p.battingOrder ?? i + 1,
      fieldPosition: p.position,
    }));

  return {
    away: mapToLineupEntry(awayLineup),
    home: mapToLineupEntry(homeLineup),
  };
}

/**
 * Archive a completed game
 */
export async function archiveCompletedGame(
  gameState: PersistedGameState,
  finalScore: { away: number; home: number },
  inningScores: { away: number; home: number }[] = [],
  seasonId?: string,
  context?: {
    statsScopeId?: string;
    competitionType?: CompetitionType;
    competitionId?: string;
    leagueId?: string;
  },
): Promise<void> {
  const db = await initDatabase();

  const record: CompletedGameRecord = {
    gameId: gameState.gameId,
    date: Date.now(),
    seasonId,
    statsScopeId: context?.statsScopeId ?? gameState.statsScopeId ?? seasonId,
    competitionType: context?.competitionType ?? gameState.competitionType,
    competitionId: context?.competitionId ?? gameState.competitionId,
    leagueId: context?.leagueId,
    seasonNumber: gameState.seasonNumber,
    stadiumName: gameState.stadiumName ?? null,
    awayTeamId: gameState.awayTeamId,
    homeTeamId: gameState.homeTeamId,
    awayTeamName: gameState.awayTeamName,
    homeTeamName: gameState.homeTeamName,
    finalScore,
    innings: gameState.inning,
    fameEvents: gameState.fameEvents,
    playerStats: gameState.playerStats,
    pitcherGameStats: gameState.pitcherGameStats,
    activityLog: gameState.activityLog,
    inningScores,
    // --- NEW: ARCHIVE THE ADVANCED ARRAYS ---
    managerDecisions: gameState.managerDecisions || [],
    moraleShifts: gameState.moraleShifts || [],
    playerRatingsSnapshots: gameState.playerRatingsSnapshots,
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.COMPLETED_GAMES, "readwrite");
    const store = transaction.objectStore(STORES.COMPLETED_GAMES);
    const request = store.put(record);

    transaction.onerror = () => {
      console.error("Failed to archive game transaction:", transaction.error);
      reject(transaction.error);
    };

    transaction.onabort = () => {
      console.error("Archive game transaction aborted:", transaction.error);
      reject(
        transaction.error ?? new Error("Archive game transaction aborted"),
      );
    };

    request.onerror = () => {
      console.error("Failed to archive game:", request.error);
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
    seasonId: params.seasonId || "season-1",
    seasonNumber: 1,
    stadiumName: null,
    awayTeamId: params.awayTeamId,
    homeTeamId: params.homeTeamId,
    awayTeamName: params.awayTeamId,
    homeTeamName: params.homeTeamId,
    finalScore: { away: params.awayScore, home: params.homeScore },
    innings: 9,
    fameEvents: [],
    playerStats: {},
    pitcherGameStats: [],
    activityLog: [],
    inningScores: [],
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.COMPLETED_GAMES, "readwrite");
    const store = transaction.objectStore(STORES.COMPLETED_GAMES);
    const request = store.put(record);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * Get recent completed games
 */
export async function getRecentGames(
  limit: number = 10,
): Promise<CompletedGameRecord[]> {
  const db = await initDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.COMPLETED_GAMES, "readonly");
    const store = transaction.objectStore(STORES.COMPLETED_GAMES);
    const index = store.index("date");
    const request = index.openCursor(null, "prev"); // Descending by date

    const results: CompletedGameRecord[] = [];

    request.onerror = () => {
      console.error("Failed to get recent games:", request.error);
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

export async function getCompletedGameById(
  gameId: string,
): Promise<CompletedGameRecord | null> {
  const db = await initDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.COMPLETED_GAMES, "readonly");
    const store = transaction.objectStore(STORES.COMPLETED_GAMES);
    const request = store.get(gameId);

    request.onerror = () => {
      console.error("Failed to load completed game:", request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result || null);
    };
  });
}

export async function getAllCompletedGames(): Promise<CompletedGameRecord[]> {
  const db = await initDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.COMPLETED_GAMES, "readonly");
    const store = transaction.objectStore(STORES.COMPLETED_GAMES);
    const request = store.getAll();

    request.onerror = () => {
      console.error("Failed to load completed games:", request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve((request.result || []).sort((a, b) => b.date - a.date));
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
export function debouncedSaveCurrentGame(
  state: PersistedGameState,
  delay: number = 500,
): void {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }

  saveTimeout = setTimeout(() => {
    saveCurrentGame(state).catch((err) => {
      console.error("Auto-save failed:", err);
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

  saveCurrentGame(state).catch((err) => {
    console.error("Immediate save failed:", err);
  });
}
