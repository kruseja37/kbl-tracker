/**
 * Season Storage Utility
 * Per STAT_TRACKING_ARCHITECTURE_SPEC.md - Phase 3: Season Stats Aggregation
 *
 * Provides IndexedDB storage for season-level statistics,
 * aggregating game stats into season totals.
 */

import { getTrackerDb } from './trackerDb';
import { syncEngine } from './syncEngine';
import { getScoreOnlyCompletedGamesBySeason } from './scheduleStorage';
import { getRecentGames, type CompletedGameRecord } from './gameStorage';
import { captureOptimizerConstantsSnapshot } from '../engines/optimizerConstantsSnapshot';

// Store names
const STORES = {
  PLAYER_SEASON_BATTING: 'playerSeasonBatting',
  PLAYER_SEASON_PITCHING: 'playerSeasonPitching',
  PLAYER_SEASON_FIELDING: 'playerSeasonFielding',
  SEASON_METADATA: 'seasonMetadata',
} as const;

// ============================================
// DATABASE INITIALIZATION
// ============================================

/**
 * Initialize the IndexedDB database with season stores.
 * Delegates to the shared trackerDb initializer to avoid version conflicts.
 */
export async function initSeasonDatabase(): Promise<IDBDatabase> {
  return getTrackerDb();
}

// ============================================
// TYPES
// ============================================

export interface PlayerSeasonBatting {
  seasonId: string;
  playerId: string;
  playerName: string;
  teamId: string;

  // Counting stats
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
  gidp: number;    // Grounded into double play
  d3kOutcomes?: number;

  // Fame
  fameBonuses: number;
  fameBoners: number;
  fameNet: number;

  // WAR components (populated by WAR orchestrator after calculation)
  bwar?: number;       // Batting WAR
  rwar?: number;       // Baserunning WAR
  fwar?: number;       // Fielding WAR
  totalWar?: number;   // Combined WAR (bwar + rwar + fwar)

  // Timestamps
  lastUpdated: number;
}

export interface PlayerSeasonPitching {
  seasonId: string;
  playerId: string;
  playerName: string;
  teamId: string;

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
  comebackerInjuries?: number;
  // balks removed — SMB4 has no balks (see kbl-gotchas.md)

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

  // WAR (populated by WAR orchestrator after calculation)
  pwar?: number;       // Pitching WAR

  // Timestamps
  lastUpdated: number;
}

export interface PlayerSeasonFielding {
  seasonId: string;
  playerId: string;
  playerName: string;
  teamId: string;

  // Counting stats
  games: number;
  putouts: number;
  assists: number;
  errors: number;
  doublePlays: number;
  divingCatches?: number;
  robberies?: number;
  nutshots?: number;

  // By position (games at each position)
  gamesByPosition: Record<string, number>;
  putoutsByPosition: Record<string, number>;
  assistsByPosition: Record<string, number>;
  errorsByPosition: Record<string, number>;

  // Timestamps
  lastUpdated: number;
}

export interface SeasonMetadata {
  seasonId: string;
  seasonNumber: number;
  seasonName: string;
  status: 'active' | 'completed';
  startDate: number;
  endDate?: number;
  gamesPlayed: number;
  totalGames: number;  // Scheduled games
  gamesPerTeam: number | null; // W1-B: per-team season length snapshot for WAR scaling
  optimizerConstantsVersion?: string;
  optimizerConstantsHash?: string;
}

// ============================================
// INITIAL VALUES
// ============================================

export function createInitialBattingStats(
  seasonId: string,
  playerId: string,
  playerName: string,
  teamId: string
): PlayerSeasonBatting {
  return {
    seasonId,
    playerId,
    playerName,
    teamId,
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
  d3kOutcomes: 0,
    fameBonuses: 0,
    fameBoners: 0,
    fameNet: 0,
    lastUpdated: Date.now(),
  };
}

export function createInitialPitchingStats(
  seasonId: string,
  playerId: string,
  playerName: string,
  teamId: string
): PlayerSeasonPitching {
  return {
    seasonId,
    playerId,
    playerName,
    teamId,
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
    comebackerInjuries: 0,
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
    lastUpdated: Date.now(),
  };
}

export function createInitialFieldingStats(
  seasonId: string,
  playerId: string,
  playerName: string,
  teamId: string
): PlayerSeasonFielding {
  return {
    seasonId,
    playerId,
    playerName,
    teamId,
    games: 0,
    putouts: 0,
    assists: 0,
    errors: 0,
    doublePlays: 0,
    divingCatches: 0,
    robberies: 0,
    nutshots: 0,
    gamesByPosition: {},
    putoutsByPosition: {},
    assistsByPosition: {},
    errorsByPosition: {},
    lastUpdated: Date.now(),
  };
}

// ============================================
// BATTING STATS CRUD
// ============================================

/**
 * Get or create batting stats for a player in a season
 */
export async function getOrCreateBattingStats(
  seasonId: string,
  playerId: string,
  playerName: string,
  teamId: string
): Promise<PlayerSeasonBatting> {
  const db = await initSeasonDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.PLAYER_SEASON_BATTING, 'readwrite');
    const store = transaction.objectStore(STORES.PLAYER_SEASON_BATTING);
    const request = store.get([seasonId, playerId]);

    request.onerror = () => reject(request.error);

    request.onsuccess = () => {
      if (request.result) {
        resolve(request.result);
      } else {
        // Create new stats
        const newStats = createInitialBattingStats(seasonId, playerId, playerName, teamId);
        const putRequest = store.put(newStats);
        putRequest.onerror = () => reject(putRequest.error);
        putRequest.onsuccess = () => {
          if (!syncEngine.isSuppressed()) syncEngine.upsert('kbl-tracker', 'playerSeasonBatting', [seasonId, playerId], newStats);
          resolve(newStats);
        };
      }
    };
  });
}

/**
 * Update batting stats for a player
 */
export async function updateBattingStats(stats: PlayerSeasonBatting): Promise<void> {
  const db = await initSeasonDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.PLAYER_SEASON_BATTING, 'readwrite');
    const store = transaction.objectStore(STORES.PLAYER_SEASON_BATTING);
    const record = { ...stats, lastUpdated: Date.now() };
    const request = store.put(record);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      if (!syncEngine.isSuppressed()) syncEngine.upsert('kbl-tracker', 'playerSeasonBatting', [stats.seasonId, stats.playerId], record);
      resolve();
    };
  });
}

/**
 * Get all batting stats for a season (for leaderboards)
 */
export async function getSeasonBattingStats(seasonId: string): Promise<PlayerSeasonBatting[]> {
  const db = await initSeasonDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.PLAYER_SEASON_BATTING, 'readonly');
    const store = transaction.objectStore(STORES.PLAYER_SEASON_BATTING);
    const index = store.index('seasonId');
    const request = index.getAll(seasonId);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || []);
  });
}

// ============================================
// PITCHING STATS CRUD
// ============================================

/**
 * Get or create pitching stats for a player in a season
 */
export async function getOrCreatePitchingStats(
  seasonId: string,
  playerId: string,
  playerName: string,
  teamId: string
): Promise<PlayerSeasonPitching> {
  const db = await initSeasonDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.PLAYER_SEASON_PITCHING, 'readwrite');
    const store = transaction.objectStore(STORES.PLAYER_SEASON_PITCHING);
    const request = store.get([seasonId, playerId]);

    request.onerror = () => reject(request.error);

    request.onsuccess = () => {
      if (request.result) {
        resolve(request.result);
      } else {
        const newStats = createInitialPitchingStats(seasonId, playerId, playerName, teamId);
        const putRequest = store.put(newStats);
        putRequest.onerror = () => reject(putRequest.error);
        putRequest.onsuccess = () => {
          if (!syncEngine.isSuppressed()) syncEngine.upsert('kbl-tracker', 'playerSeasonPitching', [seasonId, playerId], newStats);
          resolve(newStats);
        };
      }
    };
  });
}

/**
 * Update pitching stats for a player
 */
export async function updatePitchingStats(stats: PlayerSeasonPitching): Promise<void> {
  const db = await initSeasonDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.PLAYER_SEASON_PITCHING, 'readwrite');
    const store = transaction.objectStore(STORES.PLAYER_SEASON_PITCHING);
    const record = { ...stats, lastUpdated: Date.now() };
    const request = store.put(record);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      if (!syncEngine.isSuppressed()) syncEngine.upsert('kbl-tracker', 'playerSeasonPitching', [stats.seasonId, stats.playerId], record);
      resolve();
    };
  });
}

/**
 * Get all pitching stats for a season (for leaderboards)
 */
export async function getSeasonPitchingStats(seasonId: string): Promise<PlayerSeasonPitching[]> {
  const db = await initSeasonDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.PLAYER_SEASON_PITCHING, 'readonly');
    const store = transaction.objectStore(STORES.PLAYER_SEASON_PITCHING);
    const index = store.index('seasonId');
    const request = index.getAll(seasonId);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || []);
  });
}

// ============================================
// FIELDING STATS CRUD
// ============================================

/**
 * Get or create fielding stats for a player in a season
 */
export async function getOrCreateFieldingStats(
  seasonId: string,
  playerId: string,
  playerName: string,
  teamId: string
): Promise<PlayerSeasonFielding> {
  const db = await initSeasonDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.PLAYER_SEASON_FIELDING, 'readwrite');
    const store = transaction.objectStore(STORES.PLAYER_SEASON_FIELDING);
    const request = store.get([seasonId, playerId]);

    request.onerror = () => reject(request.error);

    request.onsuccess = () => {
      if (request.result) {
        resolve(request.result);
      } else {
        const newStats = createInitialFieldingStats(seasonId, playerId, playerName, teamId);
        const putRequest = store.put(newStats);
        putRequest.onerror = () => reject(putRequest.error);
        putRequest.onsuccess = () => {
          if (!syncEngine.isSuppressed()) syncEngine.upsert('kbl-tracker', 'playerSeasonFielding', [seasonId, playerId], newStats);
          resolve(newStats);
        };
      }
    };
  });
}

/**
 * Update fielding stats for a player
 */
export async function updateFieldingStats(stats: PlayerSeasonFielding): Promise<void> {
  const db = await initSeasonDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.PLAYER_SEASON_FIELDING, 'readwrite');
    const store = transaction.objectStore(STORES.PLAYER_SEASON_FIELDING);
    const record = { ...stats, lastUpdated: Date.now() };
    const request = store.put(record);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      if (!syncEngine.isSuppressed()) syncEngine.upsert('kbl-tracker', 'playerSeasonFielding', [stats.seasonId, stats.playerId], record);
      resolve();
    };
  });
}

// ============================================
// SEASON METADATA
// ============================================

function normalizeGamesPerTeam(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null;
}

function normalizeSeasonMetadata(metadata: SeasonMetadata): SeasonMetadata {
  return {
    ...metadata,
    gamesPerTeam: normalizeGamesPerTeam((metadata as SeasonMetadata & { gamesPerTeam?: unknown }).gamesPerTeam),
  };
}

const optimizerConstantsDriftWarnedSeasonIds = new Set<string>();

function stampOptimizerConstantsSnapshot(metadata: SeasonMetadata): {
  metadata: SeasonMetadata;
  changed: boolean;
} {
  const snapshot = captureOptimizerConstantsSnapshot();

  if (!metadata.optimizerConstantsHash) {
    return {
      metadata: {
        ...metadata,
        optimizerConstantsVersion: snapshot.version,
        optimizerConstantsHash: snapshot.hash,
      },
      changed: true,
    };
  }

  if (
    metadata.optimizerConstantsHash !== snapshot.hash &&
    !optimizerConstantsDriftWarnedSeasonIds.has(metadata.seasonId)
  ) {
    optimizerConstantsDriftWarnedSeasonIds.add(metadata.seasonId);
    console.warn(
      `optimizer constants changed mid-season for season ${metadata.seasonId}; §9 lineup-delta benchmark may be non-comparable`,
    );
  }

  return { metadata, changed: false };
}

/**
 * Get or create season metadata
 */
export async function getOrCreateSeason(
  seasonId: string,
  seasonNumber: number,
  seasonName: string,
  totalGames: number,
  gamesPerTeam: number | null = null
): Promise<SeasonMetadata> {
  const db = await initSeasonDatabase();
  const normalizedGamesPerTeam = normalizeGamesPerTeam(gamesPerTeam);

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.SEASON_METADATA, 'readwrite');
    const store = transaction.objectStore(STORES.SEASON_METADATA);
    const request = store.get(seasonId);

    request.onerror = () => reject(request.error);

    request.onsuccess = () => {
      if (request.result) {
        const existing = normalizeSeasonMetadata(request.result);
        let updated = existing;
        if (normalizedGamesPerTeam !== null && existing.gamesPerTeam === null) {
          updated = { ...updated, gamesPerTeam: normalizedGamesPerTeam };
        }

        const stamped = stampOptimizerConstantsSnapshot(updated);
        updated = stamped.metadata;

        if (updated !== existing || stamped.changed) {
          const putRequest = store.put(updated);
          putRequest.onerror = () => reject(putRequest.error);
          putRequest.onsuccess = () => {
            if (!syncEngine.isSuppressed()) syncEngine.upsert('kbl-tracker', 'seasonMetadata', seasonId, updated);
            resolve(updated);
          };
          return;
        }
        resolve(existing);
      } else {
        const newSeason: SeasonMetadata = {
          seasonId,
          seasonNumber,
          seasonName,
          status: 'active',
          startDate: Date.now(),
          gamesPlayed: 0,
          totalGames,
          gamesPerTeam: normalizedGamesPerTeam,
        };
        const stamped = stampOptimizerConstantsSnapshot(newSeason);
        const putRequest = store.put(stamped.metadata);
        putRequest.onerror = () => reject(putRequest.error);
        putRequest.onsuccess = () => {
          if (!syncEngine.isSuppressed()) syncEngine.upsert('kbl-tracker', 'seasonMetadata', seasonId, stamped.metadata);
          resolve(stamped.metadata);
        };
      }
    };
  });
}

/**
 * Persist season metadata.
 */
export async function saveSeasonMetadata(metadata: SeasonMetadata): Promise<SeasonMetadata> {
  const db = await initSeasonDatabase();
  const normalized = normalizeSeasonMetadata(metadata);

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.SEASON_METADATA, 'readwrite');
    const store = transaction.objectStore(STORES.SEASON_METADATA);
    const request = store.put(normalized);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      if (!syncEngine.isSuppressed()) syncEngine.upsert('kbl-tracker', 'seasonMetadata', normalized.seasonId, normalized);
      resolve(normalized);
    };
  });
}

/**
 * Delete season metadata.
 */
export async function deleteSeasonMetadata(seasonId: string): Promise<void> {
  const db = await initSeasonDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.SEASON_METADATA, 'readwrite');
    const store = transaction.objectStore(STORES.SEASON_METADATA);
    const request = store.delete(seasonId);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      if (!syncEngine.isSuppressed()) syncEngine.remove('kbl-tracker', 'seasonMetadata', seasonId);
      resolve();
    };
  });
}

/**
 * Increment games played for a season
 */
export async function incrementSeasonGames(seasonId: string): Promise<void> {
  const db = await initSeasonDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.SEASON_METADATA, 'readwrite');
    const store = transaction.objectStore(STORES.SEASON_METADATA);
    const request = store.get(seasonId);

    request.onerror = () => reject(request.error);

    request.onsuccess = () => {
      if (request.result) {
        const updated = { ...normalizeSeasonMetadata(request.result), gamesPlayed: request.result.gamesPlayed + 1 };
        const putRequest = store.put(updated);
        putRequest.onerror = () => reject(putRequest.error);
        putRequest.onsuccess = () => {
          if (!syncEngine.isSuppressed()) syncEngine.upsert('kbl-tracker', 'seasonMetadata', seasonId, updated);
          resolve();
        };
      } else {
        resolve();  // Season doesn't exist, ignore
      }
    };
  });
}

/**
 * Mark a season as complete (all games played/skipped).
 * Sets status to 'completed' and records the end date.
 */
export async function markSeasonComplete(seasonId: string): Promise<void> {
  const db = await initSeasonDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.SEASON_METADATA, 'readwrite');
    const store = transaction.objectStore(STORES.SEASON_METADATA);
    const request = store.get(seasonId);

    request.onerror = () => reject(request.error);

    request.onsuccess = () => {
      if (request.result) {
        const updated: SeasonMetadata = {
          ...normalizeSeasonMetadata(request.result),
          status: 'completed' as const,
          endDate: Date.now(),
        };
        const putRequest = store.put(updated);
        putRequest.onerror = () => reject(putRequest.error);
        putRequest.onsuccess = () => {
          if (!syncEngine.isSuppressed()) syncEngine.upsert('kbl-tracker', 'seasonMetadata', seasonId, updated);
          resolve();
        };
      } else {
        resolve(); // Season doesn't exist, ignore
      }
    };
  });
}

/**
 * Get active season
 */
export async function getActiveSeason(): Promise<SeasonMetadata | null> {
  const db = await initSeasonDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.SEASON_METADATA, 'readonly');
    const store = transaction.objectStore(STORES.SEASON_METADATA);
    const index = store.index('status');
    const request = index.get('active');

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result ? normalizeSeasonMetadata(request.result) : null);
  });
}

// ============================================
// DERIVED STATS CALCULATIONS
// ============================================

/**
 * Calculate batting average
 */
export function calcBattingAvg(stats: PlayerSeasonBatting): number {
  if (stats.ab === 0) return 0;
  return stats.hits / stats.ab;
}

/**
 * Calculate on-base percentage
 */
export function calcOBP(stats: PlayerSeasonBatting): number {
  const denom = stats.ab + stats.walks + stats.hitByPitch + stats.sacFlies;
  if (denom === 0) return 0;
  return (stats.hits + stats.walks + stats.hitByPitch) / denom;
}

/**
 * Calculate slugging percentage
 */
export function calcSLG(stats: PlayerSeasonBatting): number {
  if (stats.ab === 0) return 0;
  const totalBases = stats.singles + (stats.doubles * 2) + (stats.triples * 3) + (stats.homeRuns * 4);
  return totalBases / stats.ab;
}

/**
 * Calculate OPS
 */
export function calcOPS(stats: PlayerSeasonBatting): number {
  return calcOBP(stats) + calcSLG(stats);
}

/**
 * Calculate ERA
 */
export function calcERA(stats: PlayerSeasonPitching): number {
  const ip = stats.outsRecorded / 3;
  if (ip === 0) return 0;
  return (stats.earnedRuns / ip) * 9;
}

/**
 * Calculate WHIP
 */
export function calcWHIP(stats: PlayerSeasonPitching): number {
  const ip = stats.outsRecorded / 3;
  if (ip === 0) return 0;
  return (stats.walksAllowed + stats.hitsAllowed) / ip;
}

/**
 * Format innings pitched (e.g., 45.2 for 137 outs)
 */
export function formatIP(outsRecorded: number): string {
  const full = Math.floor(outsRecorded / 3);
  const partial = outsRecorded % 3;
  return `${full}.${partial}`;
}

// ============================================
// ALIASES FOR HOOK COMPATIBILITY
// ============================================

/**
 * Get all batting stats for a season (alias for getSeasonBattingStats)
 */
export const getAllBattingStats = getSeasonBattingStats;

/**
 * Get all pitching stats for a season (alias for getSeasonPitchingStats)
 */
export const getAllPitchingStats = getSeasonPitchingStats;

/**
 * Get all fielding stats for a season
 */
export async function getAllFieldingStats(seasonId: string): Promise<PlayerSeasonFielding[]> {
  const db = await initSeasonDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.PLAYER_SEASON_FIELDING, 'readonly');
    const store = transaction.objectStore(STORES.PLAYER_SEASON_FIELDING);
    const index = store.index('seasonId');
    const request = index.getAll(seasonId);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || []);
  });
}

/**
 * Get season metadata by ID
 */
export async function getSeasonMetadata(seasonId: string): Promise<SeasonMetadata | null> {
  const db = await initSeasonDatabase();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.SEASON_METADATA, 'readonly');
    const store = transaction.objectStore(STORES.SEASON_METADATA);
    const request = store.get(seasonId);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result ? normalizeSeasonMetadata(request.result) : null);
  });
}

// ============================================
// DERIVED STATS FOR LEADERBOARDS
// ============================================

export interface BattingDerived {
  avg: number;
  obp: number;
  slg: number;
  ops: number;
}

export interface PitchingDerived {
  era: number;
  whip: number;
  ip: string;
}

export interface FieldingDerived {
  fieldingPct: number;
}

/**
 * Calculate derived batting stats from raw counting stats
 */
export function calculateBattingDerived(stats: PlayerSeasonBatting): BattingDerived {
  return {
    avg: calcBattingAvg(stats),
    obp: calcOBP(stats),
    slg: calcSLG(stats),
    ops: calcOPS(stats),
  };
}

/**
 * Calculate derived pitching stats from raw counting stats
 */
export function calculatePitchingDerived(stats: PlayerSeasonPitching): PitchingDerived {
  return {
    era: calcERA(stats),
    whip: calcWHIP(stats),
    ip: formatIP(stats.outsRecorded),
  };
}

/**
 * Calculate derived fielding stats from raw counting stats
 */
export function calculateFieldingDerived(stats: PlayerSeasonFielding): FieldingDerived {
  const totalChances = stats.putouts + stats.assists + stats.errors;
  const fieldingPct = totalChances === 0 ? 0 : (stats.putouts + stats.assists) / totalChances;
  return {
    fieldingPct,
  };
}

// ============================================
// STANDINGS CALCULATION
// ============================================

export interface TeamStanding {
  teamId: string;
  teamName: string;
  wins: number;
  losses: number;
  winPct: number;
  runsScored: number;
  runsAllowed: number;
  runDiff: number;
  streak: { type: 'W' | 'L'; count: number };
  lastTenWins: number;
  homeRecord: { wins: number; losses: number };
  awayRecord: { wins: number; losses: number };
  gamesBack: number;
}

function isRegularSeasonCompletedGame(game: CompletedGameRecord): boolean {
  return (
    game.competitionType !== 'playoff' &&
    game.competitionType !== 'elimination' &&
    !game.playoffId &&
    !game.playoffSeriesId &&
    game.playoffGameNumber === undefined &&
    game.isEliminationGame !== true
  );
}

/**
 * Calculate standings from completed games for a season
 */
export async function calculateStandings(seasonId?: string): Promise<TeamStanding[]> {
  // Get all completed games (up to 500 for a full season)
  const [games, scoreOnlyScheduleGames] = await Promise.all([
    getRecentGames(500, seasonId ? { seasonId } : {}),
    seasonId ? getScoreOnlyCompletedGamesBySeason(seasonId) : Promise.resolve([]),
  ]);

  // Filter by seasonId if provided
  const completedGameStandingsInputs = seasonId
    ? games.filter(g => g.seasonId === seasonId && isRegularSeasonCompletedGame(g))
    : games.filter(isRegularSeasonCompletedGame);
  const seasonGames = [
    ...completedGameStandingsInputs.map((game) => ({
      date: game.date,
      awayTeamId: game.awayTeamId,
      homeTeamId: game.homeTeamId,
      awayTeamName: game.awayTeamName,
      homeTeamName: game.homeTeamName,
      finalScore: game.finalScore,
    })),
    ...scoreOnlyScheduleGames.map((game) => ({
      date: game.completedAt ?? game.resultEnteredAt ?? game.createdAt,
      awayTeamId: game.awayTeamId,
      homeTeamId: game.homeTeamId,
      awayTeamName: game.awayTeamId,
      homeTeamName: game.homeTeamId,
      finalScore: {
        away: game.result?.awayScore ?? 0,
        home: game.result?.homeScore ?? 0,
      },
    })),
  ];

  // Build team records
  const teamMap = new Map<string, {
    teamId: string;
    teamName: string;
    wins: number;
    losses: number;
    runsScored: number;
    runsAllowed: number;
    homeWins: number;
    homeLosses: number;
    awayWins: number;
    awayLosses: number;
    recentResults: ('W' | 'L')[];
  }>();

  // Process games in chronological order (oldest first for streak calculation)
  const sortedGames = [...seasonGames].sort((a, b) => a.date - b.date);

  for (const game of sortedGames) {
    const homeWon = game.finalScore.home > game.finalScore.away;

    // Update home team
    let homeTeam = teamMap.get(game.homeTeamId);
    if (!homeTeam) {
      homeTeam = {
        teamId: game.homeTeamId,
        teamName: game.homeTeamName,
        wins: 0, losses: 0, runsScored: 0, runsAllowed: 0,
        homeWins: 0, homeLosses: 0, awayWins: 0, awayLosses: 0,
        recentResults: [],
      };
      teamMap.set(game.homeTeamId, homeTeam);
    }
    homeTeam.runsScored += game.finalScore.home;
    homeTeam.runsAllowed += game.finalScore.away;
    if (homeWon) {
      homeTeam.wins++;
      homeTeam.homeWins++;
      homeTeam.recentResults.push('W');
    } else {
      homeTeam.losses++;
      homeTeam.homeLosses++;
      homeTeam.recentResults.push('L');
    }

    // Update away team
    let awayTeam = teamMap.get(game.awayTeamId);
    if (!awayTeam) {
      awayTeam = {
        teamId: game.awayTeamId,
        teamName: game.awayTeamName,
        wins: 0, losses: 0, runsScored: 0, runsAllowed: 0,
        homeWins: 0, homeLosses: 0, awayWins: 0, awayLosses: 0,
        recentResults: [],
      };
      teamMap.set(game.awayTeamId, awayTeam);
    }
    awayTeam.runsScored += game.finalScore.away;
    awayTeam.runsAllowed += game.finalScore.home;
    if (!homeWon) {
      awayTeam.wins++;
      awayTeam.awayWins++;
      awayTeam.recentResults.push('W');
    } else {
      awayTeam.losses++;
      awayTeam.awayLosses++;
      awayTeam.recentResults.push('L');
    }
  }

  // Convert to standings array
  const standings: TeamStanding[] = [];

  for (const team of teamMap.values()) {
    const totalGames = team.wins + team.losses;
    const winPct = totalGames > 0 ? team.wins / totalGames : 0;

    // Calculate streak from most recent games
    let streakType: 'W' | 'L' = 'W';
    let streakCount = 0;
    if (team.recentResults.length > 0) {
      streakType = team.recentResults[team.recentResults.length - 1];
      for (let i = team.recentResults.length - 1; i >= 0; i--) {
        if (team.recentResults[i] === streakType) {
          streakCount++;
        } else {
          break;
        }
      }
    }

    // Last 10 games
    const lastTen = team.recentResults.slice(-10);
    const lastTenWins = lastTen.filter(r => r === 'W').length;

    standings.push({
      teamId: team.teamId,
      teamName: team.teamName,
      wins: team.wins,
      losses: team.losses,
      winPct: Math.round(winPct * 1000) / 1000,
      runsScored: team.runsScored,
      runsAllowed: team.runsAllowed,
      runDiff: team.runsScored - team.runsAllowed,
      streak: { type: streakType, count: streakCount },
      lastTenWins,
      homeRecord: { wins: team.homeWins, losses: team.homeLosses },
      awayRecord: { wins: team.awayWins, losses: team.awayLosses },
      gamesBack: 0, // Will be calculated after sorting
    });
  }

  // Sort by win percentage (descending)
  standings.sort((a, b) => b.winPct - a.winPct || b.runDiff - a.runDiff);

  // Calculate games back from leader
  if (standings.length > 0) {
    const leader = standings[0];
    for (const team of standings) {
      team.gamesBack = ((leader.wins - team.wins) + (team.losses - leader.losses)) / 2;
    }
  }

  return standings;
}
