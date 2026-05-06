/**
 * Playoff Storage Utility
 *
 * Provides IndexedDB storage for playoff state:
 * - Playoff bracket configuration
 * - Series tracking (games, scores, advancement)
 * - Playoff stats (separate from regular season)
 * - Historical playoff data
 */

import {
  calculateFWARFromPersistedFieldingSet,
  type FWARResult,
  type Position as FWARPosition,
} from '../engines/fwarCalculator';
import { syncEngine } from './syncEngine';
import type { Position } from '../types/game';
import type { FieldingEvent as PersistedFieldingEvent, GameScopeQuery } from './eventLog';
import type { PersistedGameState } from './gameStorage';

const DB_NAME = 'kbl-playoffs';
const DB_VERSION = 2;

const STORES = {
  PLAYOFFS: 'playoffs',           // Playoff instances (one per season)
  SERIES: 'series',               // Individual series within playoffs
  PLAYOFF_GAMES: 'playoffGames',  // Games played in playoffs
  PLAYOFF_STATS: 'playoffStats',  // Player stats during playoffs
} as const;

// ============================================
// TYPES
// ============================================

export type PlayoffStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
export type SeriesStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';

export interface PlayoffConfig {
  id: string;
  seasonNumber: number;
  seasonId: string;
  status: PlayoffStatus;

  // Configuration
  teamsQualifying: number;        // Total teams in playoffs (e.g., 8, 12, 16)
  rounds: number;                  // Number of rounds
  gamesPerRound: number[];         // Best-of series for each round [5, 7, 7]
  inningsPerGame: number;
  useDH: boolean;
  /** @deprecated Legacy single-toggle field kept for backward compatibility. */
  beatReporterEnabled?: boolean;
  liveBeatReporterEnabled?: boolean;
  postGameColumnsEnabled?: boolean;

  // Structure
  leagues: ('Eastern' | 'Western')[];
  conferenceChampionship: boolean; // Do leagues play separate brackets?

  // Seeding
  teams: PlayoffTeam[];

  // State
  currentRound: number;
  champion?: string;               // Team ID of winner
  mvp?: PlayoffMVP;

  // Source discriminator (Elimination Mode coexistence)
  sourceType?: 'franchise' | 'elimination';  // Defaults to 'franchise' for existing records
  eliminationId?: string;                     // Links to elimination instance

  // Timestamps
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
}

export interface PlayoffTeam {
  teamId: string;
  teamName: string;
  seed: number;
  league: 'Eastern' | 'Western';
  regularSeasonRecord: { wins: number; losses: number };
  eliminated: boolean;
  eliminatedInRound?: number;
}

export interface PlayoffSeries {
  id: string;
  playoffId: string;
  round: number;                   // 1 = Wild Card, 2 = Division, 3 = Championship, etc.
  roundName: string;               // "Wild Card", "Division Series", "Championship"

  // Teams
  higherSeed: {
    teamId: string;
    teamName: string;
    seed: number;
  };
  lowerSeed: {
    teamId: string;
    teamName: string;
    seed: number;
  };

  // Status
  status: SeriesStatus;
  gamesRequired: number;           // (bestOf / 2) + 1 to win
  bestOf: number;                  // e.g., 7

  // Score
  higherSeedWins: number;
  lowerSeedWins: number;

  // Result
  winner?: string;                 // Team ID

  // Games
  games: SeriesGame[];

  // Next series (for bracket advancement)
  advancesToSeriesId?: string;

  createdAt: number;
  completedAt?: number;
}

export interface SeriesGame {
  gameNumber: number;              // 1, 2, 3, ...
  homeTeamId: string;
  awayTeamId: string;
  status: 'SCHEDULED' | 'COMPLETED';
  result?: {
    homeScore: number;
    awayScore: number;
    winnerId: string;
    innings: number;
  };
  gameLogId?: string;              // Link to full game data
  playedAt?: number;
}

export interface PlayoffMVP {
  playerId: string;
  playerName: string;
  teamId: string;
  stats: string;                   // Summary stat line
}

export interface PlayoffPlayerStats {
  id: string;
  playoffId: string;
  playerId: string;
  playerName: string;
  teamId: string;
  sourceType?: 'franchise' | 'elimination';  // Defaults to 'franchise' for existing records

  // Batting
  games: number;
  atBats: number;
  hits: number;
  doubles: number;
  triples: number;
  homeRuns: number;
  rbi: number;
  runs: number;
  walks: number;
  strikeouts: number;
  stolenBases: number;
  caughtStealing: number;
  hitByPitch?: number;
  sacrificeFlies?: number;

  // Derived
  avg: number;
  obp: number;
  slg: number;
  ops: number;

  // Pitching (if applicable)
  pitchingGames?: number;
  wins?: number;
  losses?: number;
  saves?: number;
  inningsPitched?: number;
  earnedRuns?: number;
  pitchingStrikeouts?: number;
  pitchingWalks?: number;
  hitsAllowed?: number;
  era?: number;
  whip?: number;

  // Fielding (derived from playoff-scoped event log when available)
  fieldingPrimaryPosition?: Position;
  fieldingRunsSaved?: number;
  fieldingWAR?: number;
  fieldingPlays?: number;
  fieldingErrors?: number;
}

interface PlayoffFieldingSummary {
  primaryPosition: Position;
  plays: number;
  errors: number;
  runsSaved: number;
  fWAR: number;
}

function inferPrimaryPositionFromFieldingEvents(
  events: PersistedFieldingEvent[]
): FWARPosition | null {
  if (events.length === 0) return null;

  const counts = new Map<FWARPosition, { plays: number; runsSaved: number }>();
  for (const event of events) {
    const position = event.position as FWARPosition;
    const existing = counts.get(position) || { plays: 0, runsSaved: 0 };
    existing.plays += 1;
    existing.runsSaved += event.runsPreventedOrAllowed;
    counts.set(position, existing);
  }

  const ranked = [...counts.entries()].sort((a, b) => {
    if (b[1].plays !== a[1].plays) {
      return b[1].plays - a[1].plays;
    }
    return b[1].runsSaved - a[1].runsSaved;
  });

  return ranked[0]?.[0] ?? null;
}

function buildPlayoffFieldingSummary(
  playerStats: PlayoffPlayerStats,
  persistedEvents: PersistedFieldingEvent[],
  playoffGamesForTeam: number
): PlayoffFieldingSummary | null {
  const stableIdEvents = persistedEvents.filter((event) => event.playerId === playerStats.playerId);
  const primaryPosition = inferPrimaryPositionFromFieldingEvents(stableIdEvents);
  if (!primaryPosition) return null;

  const fieldingResult: FWARResult | null = calculateFWARFromPersistedFieldingSet(
    persistedEvents,
    playerStats.playerId,
    primaryPosition,
    Math.max(playerStats.games, playerStats.pitchingGames || 0, 1),
    Math.max(playoffGamesForTeam, 1),
    playerStats.teamId
  );
  if (!fieldingResult) return null;

  return {
    primaryPosition,
    plays: stableIdEvents.length,
    errors: stableIdEvents.filter((event) => event.playType === 'error').length,
    runsSaved: fieldingResult.totalRunsSaved,
    fWAR: fieldingResult.fWAR,
  };
}

export function buildPlayoffFieldingScopeQuery(playoff: PlayoffConfig): GameScopeQuery {
  if ((playoff.sourceType || 'franchise') === 'elimination') {
    return {
      statsScopeId: playoff.seasonId || (playoff.eliminationId ? `elimination-${playoff.eliminationId}` : undefined),
      competitionType: 'elimination',
      competitionId: playoff.eliminationId,
      isComplete: true,
    };
  }

  return {
    statsScopeId: playoff.seasonId,
    competitionType: 'playoff',
    isComplete: true,
  };
}

function buildPlayoffGamesByTeam(
  allStats: PlayoffPlayerStats[]
): Map<string, number> {
  const gamesByTeam = new Map<string, number>();

  for (const stat of allStats) {
    const observedGames = Math.max(stat.games, stat.pitchingGames || 0, 0);
    if (observedGames <= 0) continue;

    const existingGames = gamesByTeam.get(stat.teamId) || 0;
    gamesByTeam.set(stat.teamId, Math.max(existingGames, observedGames));
  }

  return gamesByTeam;
}

export function attachFieldingMetricsToPlayoffStats(
  allStats: PlayoffPlayerStats[],
  persistedEvents: PersistedFieldingEvent[]
): PlayoffPlayerStats[] {
  if (allStats.length === 0 || persistedEvents.length === 0) {
    return allStats;
  }

  const playoffGamesByTeam = buildPlayoffGamesByTeam(allStats);

  return allStats.map((stat) => {
    const summary = buildPlayoffFieldingSummary(
      stat,
      persistedEvents,
      playoffGamesByTeam.get(stat.teamId) || 0
    );

    if (!summary) {
      return stat;
    }

    return {
      ...stat,
      fieldingPrimaryPosition: summary.primaryPosition,
      fieldingRunsSaved: summary.runsSaved,
      fieldingWAR: summary.fWAR,
      fieldingPlays: summary.plays,
      fieldingErrors: summary.errors,
    };
  });
}

// ============================================
// DATABASE INITIALIZATION
// ============================================

let dbInstance: IDBDatabase | null = null;

export async function initPlayoffDatabase(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('[playoffStorage] Failed to open database:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      // Auto-invalidate singleton if the database is externally closed or version-changed
      dbInstance.onclose = () => { dbInstance = null; };
      dbInstance.onversionchange = () => {
        dbInstance?.close();
        dbInstance = null;
      };
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Playoffs store
      if (!db.objectStoreNames.contains(STORES.PLAYOFFS)) {
        const playoffsStore = db.createObjectStore(STORES.PLAYOFFS, { keyPath: 'id' });
        playoffsStore.createIndex('seasonNumber', 'seasonNumber', { unique: true });
        playoffsStore.createIndex('status', 'status', { unique: false });
      }

      // Series store
      if (!db.objectStoreNames.contains(STORES.SERIES)) {
        const seriesStore = db.createObjectStore(STORES.SERIES, { keyPath: 'id' });
        seriesStore.createIndex('playoffId', 'playoffId', { unique: false });
        seriesStore.createIndex('round', 'round', { unique: false });
        seriesStore.createIndex('status', 'status', { unique: false });
      }

      // Playoff games store
      if (!db.objectStoreNames.contains(STORES.PLAYOFF_GAMES)) {
        const gamesStore = db.createObjectStore(STORES.PLAYOFF_GAMES, { keyPath: 'id' });
        gamesStore.createIndex('playoffId', 'playoffId', { unique: false });
        gamesStore.createIndex('seriesId', 'seriesId', { unique: false });
      }

      // Playoff stats store
      if (!db.objectStoreNames.contains(STORES.PLAYOFF_STATS)) {
        const statsStore = db.createObjectStore(STORES.PLAYOFF_STATS, { keyPath: 'id' });
        statsStore.createIndex('playoffId', 'playoffId', { unique: false });
        statsStore.createIndex('playerId', 'playerId', { unique: false });
        statsStore.createIndex('teamId', 'teamId', { unique: false });
      }

      // ── v2 migration: Drop unique constraint on seasonNumber ──
      // Elimination brackets and franchise playoffs must coexist with
      // the same seasonNumber values. The unique index prevents this.
      if (event.oldVersion < 2) {
        const tx = (event.target as IDBOpenDBRequest).transaction!;
        const playoffsStore = tx.objectStore(STORES.PLAYOFFS);
        if (playoffsStore.indexNames.contains('seasonNumber')) {
          playoffsStore.deleteIndex('seasonNumber');
        }
        playoffsStore.createIndex('seasonNumber', 'seasonNumber', { unique: false });
      }
    };
  });
}

// ============================================
// PLAYOFF CRUD OPERATIONS
// ============================================

export async function createPlayoff(config: Omit<PlayoffConfig, 'id' | 'createdAt'>): Promise<PlayoffConfig> {
  const db = await initPlayoffDatabase();
  const newSourceType = config.sourceType || 'franchise';
  const replacementEliminationId = newSourceType === 'elimination' ? config.eliminationId : undefined;

  if (newSourceType === 'elimination' && !replacementEliminationId) {
    throw new Error('Elimination playoffs must include an eliminationId');
  }

  const playoff: PlayoffConfig = {
    ...config,
    id: `playoff-${config.seasonNumber}-${Date.now()}`,
    createdAt: Date.now(),
  };

  // Track replaced playoff IDs so we can cascade-delete their series/stats
  const replacedPlayoffIds: string[] = [];

  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORES.PLAYOFFS, 'readwrite');
    const store = tx.objectStore(STORES.PLAYOFFS);

    // Replacement rules differ by source:
    // - franchise: one bracket per season
    // - elimination: one bracket per elimination run
    const cursorReq = store.openCursor();
    cursorReq.onsuccess = () => {
      const cursor = cursorReq.result;
      if (cursor) {
        const record = cursor.value as PlayoffConfig;
        const existingSourceType = record.sourceType || 'franchise';
        const shouldReplace =
          newSourceType === 'elimination'
            ? existingSourceType === 'elimination' &&
              record.eliminationId === replacementEliminationId
            : existingSourceType === newSourceType &&
              record.seasonNumber === config.seasonNumber;

        if (shouldReplace) {
          replacedPlayoffIds.push(record.id);
          if (!syncEngine.isSuppressed()) syncEngine.remove('kbl-playoffs', 'playoffs', record.id);
          cursor.delete();
        }
        cursor.continue();
      } else {
        // All existing records for this season deleted, now add the new one
        const addReq = store.add(playoff);
        addReq.onsuccess = () => {
          if (!syncEngine.isSuppressed()) syncEngine.upsert('kbl-playoffs', 'playoffs', playoff.id, playoff);
          resolve();
        };
        addReq.onerror = () => reject(addReq.error);
      }
    };
    cursorReq.onerror = () => reject(cursorReq.error);
  });

  // Cascade-delete orphaned series and stats for replaced playoffs
  for (const oldId of replacedPlayoffIds) {
    await cascadeDeletePlayoffChildren(db, oldId);
  }

  return playoff;
}

export async function getPlayoff(playoffId: string): Promise<PlayoffConfig | null> {
  const db = await initPlayoffDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.PLAYOFFS, 'readonly');
    const store = tx.objectStore(STORES.PLAYOFFS);
    const request = store.get(playoffId);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

export async function getPlayoffBySeason(
  seasonNumber: number,
  sourceType?: 'franchise' | 'elimination'
): Promise<PlayoffConfig | null> {
  const db = await initPlayoffDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.PLAYOFFS, 'readonly');
    const store = tx.objectStore(STORES.PLAYOFFS);
    const index = store.index('seasonNumber');
    const request = index.openCursor(seasonNumber);

    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) {
        resolve(null);
        return;
      }

      const playoff = cursor.value as PlayoffConfig;
      if (!sourceType) {
        resolve(playoff);
        return;
      }

      const existingSourceType = playoff.sourceType || 'franchise';
      if (existingSourceType === sourceType) {
        resolve(playoff);
        return;
      }

      cursor.continue();
    };
    request.onerror = () => reject(request.error);
  });
}

export async function getPlayoffByElimination(eliminationId: string): Promise<PlayoffConfig | null> {
  const db = await initPlayoffDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.PLAYOFFS, 'readonly');
    const store = tx.objectStore(STORES.PLAYOFFS);
    const request = store.openCursor();

    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) {
        resolve(null);
        return;
      }

      const playoff = cursor.value as PlayoffConfig;
      if ((playoff.sourceType || 'franchise') === 'elimination' && playoff.eliminationId === eliminationId) {
        resolve(playoff);
        return;
      }

      cursor.continue();
    };
    request.onerror = () => reject(request.error);
  });
}

export async function getCurrentPlayoff(
  sourceType?: 'franchise' | 'elimination'
): Promise<PlayoffConfig | null> {
  const db = await initPlayoffDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.PLAYOFFS, 'readonly');
    const store = tx.objectStore(STORES.PLAYOFFS);
    const index = store.index('status');
    const request = index.openCursor('IN_PROGRESS');

    request.onsuccess = () => {
      const cursor = request.result;
      if (!cursor) {
        resolve(null);
        return;
      }

      const playoff = cursor.value as PlayoffConfig;
      if (!sourceType || (playoff.sourceType || 'franchise') === sourceType) {
        resolve(playoff);
        return;
      }

      cursor.continue();
    };
    request.onerror = () => reject(request.error);
  });
}

export async function updatePlayoff(playoffId: string, updates: Partial<PlayoffConfig>): Promise<PlayoffConfig> {
  const db = await initPlayoffDatabase();
  const existing = await getPlayoff(playoffId);

  if (!existing) {
    throw new Error(`Playoff ${playoffId} not found`);
  }

  const updated: PlayoffConfig = { ...existing, ...updates };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.PLAYOFFS, 'readwrite');
    const store = tx.objectStore(STORES.PLAYOFFS);
    const request = store.put(updated);

    request.onsuccess = () => {
      if (!syncEngine.isSuppressed()) syncEngine.upsert('kbl-playoffs', 'playoffs', updated.id, updated);
      resolve(updated);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function startPlayoff(playoffId: string): Promise<PlayoffConfig> {
  return updatePlayoff(playoffId, {
    status: 'IN_PROGRESS',
    startedAt: Date.now(),
    currentRound: 1,
  });
}

export async function completePlayoff(playoffId: string, championId: string, mvp?: PlayoffMVP): Promise<PlayoffConfig> {
  return updatePlayoff(playoffId, {
    status: 'COMPLETED',
    completedAt: Date.now(),
    champion: championId,
    mvp,
  });
}

// ============================================
// SERIES CRUD OPERATIONS
// ============================================

let seriesCounter = 0;

export async function createSeries(series: Omit<PlayoffSeries, 'id' | 'createdAt'>): Promise<PlayoffSeries> {
  const db = await initPlayoffDatabase();

  const newSeries: PlayoffSeries = {
    ...series,
    id: `series-${series.playoffId}-r${series.round}-${Date.now()}-${seriesCounter++}`,
    createdAt: Date.now(),
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.SERIES, 'readwrite');
    const store = tx.objectStore(STORES.SERIES);
    const request = store.add(newSeries);

    request.onsuccess = () => {
      if (!syncEngine.isSuppressed()) syncEngine.upsert('kbl-playoffs', 'series', newSeries.id, newSeries);
      resolve(newSeries);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function getSeries(seriesId: string): Promise<PlayoffSeries | null> {
  const db = await initPlayoffDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.SERIES, 'readonly');
    const store = tx.objectStore(STORES.SERIES);
    const request = store.get(seriesId);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

export async function getSeriesByPlayoff(playoffId: string): Promise<PlayoffSeries[]> {
  const db = await initPlayoffDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.SERIES, 'readonly');
    const store = tx.objectStore(STORES.SERIES);
    const index = store.index('playoffId');
    const request = index.getAll(playoffId);

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

export async function getSeriesByRound(playoffId: string, round: number): Promise<PlayoffSeries[]> {
  const allSeries = await getSeriesByPlayoff(playoffId);
  return allSeries.filter(s => s.round === round);
}

export async function updateSeries(seriesId: string, updates: Partial<PlayoffSeries>): Promise<PlayoffSeries> {
  const db = await initPlayoffDatabase();
  const existing = await getSeries(seriesId);

  if (!existing) {
    throw new Error(`Series ${seriesId} not found`);
  }

  const updated: PlayoffSeries = { ...existing, ...updates };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.SERIES, 'readwrite');
    const store = tx.objectStore(STORES.SERIES);
    const request = store.put(updated);

    request.onsuccess = () => {
      if (!syncEngine.isSuppressed()) syncEngine.upsert('kbl-playoffs', 'series', updated.id, updated);
      resolve(updated);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function recordSeriesGame(
  seriesId: string,
  game: SeriesGame
): Promise<PlayoffSeries> {
  const series = await getSeries(seriesId);
  if (!series) {
    throw new Error(`Series ${seriesId} not found`);
  }

  if (game.status === 'COMPLETED' && game.result?.homeScore === game.result?.awayScore) {
    throw new Error('Tied playoff games cannot determine a series winner');
  }

  // Update games array
  const games = [...series.games];
  const existingIdx = games.findIndex(g => g.gameNumber === game.gameNumber);
  if (existingIdx >= 0) {
    games[existingIdx] = game;
  } else {
    games.push(game);
  }

  // Recalculate series score
  let higherSeedWins = 0;
  let lowerSeedWins = 0;
  for (const g of games) {
    if (g.status === 'COMPLETED' && g.result) {
      if (g.result.winnerId === series.higherSeed.teamId) {
        higherSeedWins++;
      } else if (g.result.winnerId === series.lowerSeed.teamId) {
        lowerSeedWins++;
      }
    }
  }

  // Check if series is complete
  const gamesNeeded = series.gamesRequired;
  let status: SeriesStatus = 'IN_PROGRESS';
  let winner: string | undefined;
  let completedAt: number | undefined;

  if (higherSeedWins >= gamesNeeded) {
    status = 'COMPLETED';
    winner = series.higherSeed.teamId;
    completedAt = Date.now();
  } else if (lowerSeedWins >= gamesNeeded) {
    status = 'COMPLETED';
    winner = series.lowerSeed.teamId;
    completedAt = Date.now();
  }

  return updateSeries(seriesId, {
    games,
    higherSeedWins,
    lowerSeedWins,
    status,
    winner,
    completedAt,
  });
}

// ============================================
// BRACKET GENERATION
// ============================================

export function getRoundName(round: number, totalRounds: number): string {
  const remaining = totalRounds - round + 1;
  if (remaining === 1) return 'Championship';
  if (remaining === 2) return 'Conference Championship';
  if (remaining === 3) return 'Division Series';
  if (remaining === 4) return 'Wild Card';
  return `Round ${round}`;
}

export function getEliminationRoundName(round: number, totalRounds: number): string {
  const remaining = totalRounds - round + 1;
  if (remaining === 1) return 'Championship';
  if (remaining === 2) return 'Semi-Finals';
  if (remaining === 3) return 'Quarter-Finals';
  return `Round ${round}`;
}

function getPlayoffRoundName(playoff: PlayoffConfig, round: number): string {
  return (playoff.sourceType || 'franchise') === 'elimination'
    ? getEliminationRoundName(round, playoff.rounds)
    : getRoundName(round, playoff.rounds);
}

export async function generateBracket(
  playoffId: string,
  teams: PlayoffTeam[],
  gamesPerRound: number[]
): Promise<PlayoffSeries[]> {
  // Sort teams by seed within each league
  const eastern = teams.filter(t => t.league === 'Eastern').sort((a, b) => a.seed - b.seed);
  const western = teams.filter(t => t.league === 'Western').sort((a, b) => a.seed - b.seed);

  const allSeries: PlayoffSeries[] = [];
  const totalRounds = gamesPerRound.length;

  // Generate first round matchups (1v8, 4v5, 2v7, 3v6)
  const createFirstRoundMatchups = async (leagueTeams: PlayoffTeam[], round: number) => {
    const matchups: [number, number][] = [];
    const n = leagueTeams.length;

    // Standard seeding: 1v8, 4v5, 2v7, 3v6 for 8 teams
    for (let i = 0; i < n / 2; i++) {
      matchups.push([i, n - 1 - i]);
    }

    for (const [topIdx, bottomIdx] of matchups) {
      const series = await createSeries({
        playoffId,
        round,
        roundName: getRoundName(round, totalRounds),
        higherSeed: {
          teamId: leagueTeams[topIdx].teamId,
          teamName: leagueTeams[topIdx].teamName,
          seed: leagueTeams[topIdx].seed,
        },
        lowerSeed: {
          teamId: leagueTeams[bottomIdx].teamId,
          teamName: leagueTeams[bottomIdx].teamName,
          seed: leagueTeams[bottomIdx].seed,
        },
        status: 'PENDING',
        bestOf: gamesPerRound[round - 1] || 7,
        gamesRequired: Math.ceil((gamesPerRound[round - 1] || 7) / 2),
        higherSeedWins: 0,
        lowerSeedWins: 0,
        games: [],
      });
      allSeries.push(series);
    }
  };

  // Generate first round for both leagues
  await createFirstRoundMatchups(eastern, 1);
  await createFirstRoundMatchups(western, 1);

  return allSeries;
}

// ============================================
// BRACKET ADVANCEMENT
// ============================================

/**
 * Create next-round series from completed round's winners.
 *
 * Matchup logic:
 * - Within a conference: highest remaining seed vs lowest remaining seed
 * - Championship round: Eastern champion vs Western champion (higher seed = home)
 *
 * @param playoffId - The playoff instance ID
 * @param completedRound - The round number that just completed
 * @param playoff - The current playoff config (for team league lookup + gamesPerRound)
 * @returns The newly created series for the next round
 */
export async function createNextRoundSeries(
  playoffId: string,
  completedRound: number,
  playoff: PlayoffConfig
): Promise<PlayoffSeries[]> {
  const nextRound = completedRound + 1;

  if (nextRound > playoff.rounds) {
    throw new Error(`Cannot advance past final round (${playoff.rounds})`);
  }

  // Get all completed series from the round that just finished
  const completedSeries = await getSeriesByRound(playoffId, completedRound);
  const winners = completedSeries
    .filter(s => s.status === 'COMPLETED' && s.winner)
    .map(s => {
      const isHigherSeedWinner = s.winner === s.higherSeed.teamId;
      return {
        teamId: s.winner!,
        teamName: isHigherSeedWinner ? s.higherSeed.teamName : s.lowerSeed.teamName,
        seed: isHigherSeedWinner ? s.higherSeed.seed : s.lowerSeed.seed,
      };
    });

  const bestOf = playoff.gamesPerRound[nextRound - 1] || 7;
  const gamesRequired = Math.ceil(bestOf / 2);
  const totalRounds = playoff.rounds;
  const isSingleBracket =
    !playoff.conferenceChampionship ||
    playoff.leagues.length <= 1 ||
    new Set(playoff.teams.map((team) => team.league)).size <= 1;

  if (winners.length === 0) {
    throw new Error(`No completed winners found for playoff ${playoffId} round ${completedRound}`);
  }

  if (isSingleBracket) {
    const bracketWinners = winners.sort((a, b) => a.seed - b.seed);
    if (bracketWinners.length % 2 !== 0) {
      throw new Error(
        `Single-bracket advancement requires an even number of winners, got ${bracketWinners.length}`,
      );
    }

    const newSeries: PlayoffSeries[] = [];
    for (let i = 0; i < bracketWinners.length / 2; i++) {
      const higher = bracketWinners[i];
      const lower = bracketWinners[bracketWinners.length - 1 - i];
      const createdSeries = await createSeries({
        playoffId,
        round: nextRound,
        roundName: getPlayoffRoundName(playoff, nextRound),
        higherSeed: { teamId: higher.teamId, teamName: higher.teamName, seed: higher.seed },
        lowerSeed: { teamId: lower.teamId, teamName: lower.teamName, seed: lower.seed },
        status: 'IN_PROGRESS',
        bestOf,
        gamesRequired,
        higherSeedWins: 0,
        lowerSeedWins: 0,
        games: [],
      });
      newSeries.push(createdSeries);
    }

    return newSeries;
  }

  // Determine if this is the championship round (final round)
  const isChampionship = nextRound === playoff.rounds;

  if (isChampionship) {
    // Championship: match conference champions against each other
    // Find which conference each winner belongs to
    const teamLeagueMap = new Map(playoff.teams.map(t => [t.teamId, t.league]));

    const easternWinners = winners.filter(w => teamLeagueMap.get(w.teamId) === 'Eastern');
    const westernWinners = winners.filter(w => teamLeagueMap.get(w.teamId) === 'Western');

    if (easternWinners.length !== 1 || westernWinners.length !== 1) {
      throw new Error(`Expected 1 winner per conference for championship, got Eastern: ${easternWinners.length}, Western: ${westernWinners.length}`);
    }

    const eastern = easternWinners[0];
    const western = westernWinners[0];

    // Higher seed gets home field
    const higherSeed = eastern.seed <= western.seed ? eastern : western;
    const lowerSeed = eastern.seed <= western.seed ? western : eastern;

    const champSeries = await createSeries({
      playoffId,
      round: nextRound,
      roundName: getPlayoffRoundName(playoff, nextRound),
      higherSeed: { teamId: higherSeed.teamId, teamName: higherSeed.teamName, seed: higherSeed.seed },
      lowerSeed: { teamId: lowerSeed.teamId, teamName: lowerSeed.teamName, seed: lowerSeed.seed },
      status: 'IN_PROGRESS',
      bestOf,
      gamesRequired,
      higherSeedWins: 0,
      lowerSeedWins: 0,
      games: [],
    });

    return [champSeries];
  } else {
    // Non-championship: match winners within each conference (highest seed vs lowest seed)
    const teamLeagueMap = new Map(playoff.teams.map(t => [t.teamId, t.league]));
    const newSeries: PlayoffSeries[] = [];

    for (const league of ['Eastern', 'Western'] as const) {
      const leagueWinners = winners
        .filter(w => teamLeagueMap.get(w.teamId) === league)
        .sort((a, b) => a.seed - b.seed); // Sort by seed ascending

      // Pair highest vs lowest seed
      const pairs: [typeof leagueWinners[0], typeof leagueWinners[0]][] = [];
      for (let i = 0; i < leagueWinners.length / 2; i++) {
        pairs.push([leagueWinners[i], leagueWinners[leagueWinners.length - 1 - i]]);
      }

      for (const [higher, lower] of pairs) {
        const s = await createSeries({
          playoffId,
          round: nextRound,
          roundName: getPlayoffRoundName(playoff, nextRound),
          higherSeed: { teamId: higher.teamId, teamName: higher.teamName, seed: higher.seed },
          lowerSeed: { teamId: lower.teamId, teamName: lower.teamName, seed: lower.seed },
          status: 'IN_PROGRESS',
          bestOf,
          gamesRequired,
          higherSeedWins: 0,
          lowerSeedWins: 0,
          games: [],
        });
        newSeries.push(s);
      }
    }

    return newSeries;
  }
}

// ============================================
// PLAYOFF STATS
// ============================================

async function getStoredPlayoffStats(playoffId: string): Promise<PlayoffPlayerStats[]> {
  const db = await initPlayoffDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.PLAYOFF_STATS, 'readonly');
    const store = tx.objectStore(STORES.PLAYOFF_STATS);
    const index = store.index('playoffId');
    const request = index.getAll(playoffId);

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

export async function getPlayoffStats(playoffId: string): Promise<PlayoffPlayerStats[]> {
  const [storedStats, playoff] = await Promise.all([
    getStoredPlayoffStats(playoffId),
    getPlayoff(playoffId),
  ]);

  if (!playoff || storedStats.length === 0) {
    return storedStats;
  }

  const { getFieldingEventsForScope } = await import('./eventLog');
  const persistedEvents = await getFieldingEventsForScope(buildPlayoffFieldingScopeQuery(playoff));
  return attachFieldingMetricsToPlayoffStats(storedStats, persistedEvents);
}

export async function getPlayoffLeaders(
  playoffId: string,
  stat: keyof PlayoffPlayerStats,
  limit: number = 5
): Promise<PlayoffPlayerStats[]> {
  const allStats = await getPlayoffStats(playoffId);

  // Sort by the requested stat
  return allStats
    .sort((a, b) => {
      const aVal = a[stat] as number || 0;
      const bVal = b[stat] as number || 0;
      // For ERA and WHIP, lower is better
      if (stat === 'era' || stat === 'whip') {
        return aVal - bVal;
      }
      return bVal - aVal;
    })
    .slice(0, limit);
}

export async function aggregateGameToPlayoffStats(
  playoffId: string,
  gameState: PersistedGameState
): Promise<void> {
  const [db, playoff] = await Promise.all([
    initPlayoffDatabase(),
    getPlayoff(playoffId),
  ]);
  const sourceType = playoff?.sourceType;

  const battingByPlayer = new Map<string, {
    playerName: string;
    teamId: string;
    games: number;
    atBats: number;
    hits: number;
    doubles: number;
    triples: number;
    homeRuns: number;
    rbi: number;
    runs: number;
    walks: number;
    strikeouts: number;
    stolenBases: number;
    caughtStealing: number;
    hitByPitch: number;
    sacrificeFlies: number;
  }>();

  for (const [playerId, stats] of Object.entries(gameState.playerStats)) {
    battingByPlayer.set(playerId, {
      playerName: stats.playerName,
      teamId: stats.teamId,
      games: 1,
      atBats: stats.ab,
      hits: stats.h,
      doubles: stats.doubles,
      triples: stats.triples,
      homeRuns: stats.hr,
      rbi: stats.rbi,
      runs: stats.r,
      walks: stats.bb,
      strikeouts: stats.k,
      stolenBases: stats.sb,
      caughtStealing: stats.cs,
      hitByPitch: stats.hbp,
      sacrificeFlies: stats.sf,
    });
  }

  const pitchingByPlayer = new Map<string, {
    pitcherName: string;
    teamId: string;
    pitchingGames: number;
    wins: number;
    losses: number;
    saves: number;
    inningsPitched: number;
    earnedRuns: number;
    pitchingStrikeouts: number;
    pitchingWalks: number;
    hitsAllowed: number;
  }>();

  for (const stats of gameState.pitcherGameStats) {
    const existing = pitchingByPlayer.get(stats.pitcherId);
    if (existing) {
      existing.pitchingGames += 1;
      existing.wins += stats.decision === 'W' ? 1 : 0;
      existing.losses += stats.decision === 'L' ? 1 : 0;
      existing.saves += stats.save ? 1 : 0;
      existing.inningsPitched += stats.outsRecorded / 3;
      existing.earnedRuns += stats.earnedRuns;
      existing.pitchingStrikeouts += stats.strikeoutsThrown;
      existing.pitchingWalks += stats.walksAllowed;
      existing.hitsAllowed += stats.hitsAllowed;
      continue;
    }

    pitchingByPlayer.set(stats.pitcherId, {
      pitcherName: stats.pitcherName,
      teamId: stats.teamId,
      pitchingGames: 1,
      wins: stats.decision === 'W' ? 1 : 0,
      losses: stats.decision === 'L' ? 1 : 0,
      saves: stats.save ? 1 : 0,
      inningsPitched: stats.outsRecorded / 3,
      earnedRuns: stats.earnedRuns,
      pitchingStrikeouts: stats.strikeoutsThrown,
      pitchingWalks: stats.walksAllowed,
      hitsAllowed: stats.hitsAllowed,
    });
  }

  const allPlayerIds = new Set([
    ...battingByPlayer.keys(),
    ...pitchingByPlayer.keys(),
  ]);

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.PLAYOFF_STATS, 'readwrite');
    const store = tx.objectStore(STORES.PLAYOFF_STATS);
    const index = store.index('playoffId');
    const request = index.getAll(playoffId);

    request.onsuccess = () => {
      const existingByPlayerId = new Map<string, PlayoffPlayerStats>(
        (request.result || []).map(record => [record.playerId, record])
      );

      for (const playerId of allPlayerIds) {
        const batting = battingByPlayer.get(playerId);
        const pitching = pitchingByPlayer.get(playerId);
        const existing = existingByPlayerId.get(playerId);

        const updated: PlayoffPlayerStats = {
          id: existing?.id || `${playoffId}-${playerId}`,
          playoffId,
          playerId,
          playerName: batting?.playerName || pitching?.pitcherName || existing?.playerName || 'Unknown Player',
          teamId: batting?.teamId || pitching?.teamId || existing?.teamId || 'unknown',
          sourceType: existing?.sourceType ?? sourceType,
          games: (existing?.games || 0) + (batting?.games || 0),
          atBats: (existing?.atBats || 0) + (batting?.atBats || 0),
          hits: (existing?.hits || 0) + (batting?.hits || 0),
          doubles: (existing?.doubles || 0) + (batting?.doubles || 0),
          triples: (existing?.triples || 0) + (batting?.triples || 0),
          homeRuns: (existing?.homeRuns || 0) + (batting?.homeRuns || 0),
          rbi: (existing?.rbi || 0) + (batting?.rbi || 0),
          runs: (existing?.runs || 0) + (batting?.runs || 0),
          walks: (existing?.walks || 0) + (batting?.walks || 0),
          strikeouts: (existing?.strikeouts || 0) + (batting?.strikeouts || 0),
          stolenBases: (existing?.stolenBases || 0) + (batting?.stolenBases || 0),
          caughtStealing: (existing?.caughtStealing || 0) + (batting?.caughtStealing || 0),
          hitByPitch: (existing?.hitByPitch || 0) + (batting?.hitByPitch || 0),
          sacrificeFlies: (existing?.sacrificeFlies || 0) + (batting?.sacrificeFlies || 0),
          avg: 0,
          obp: 0,
          slg: 0,
          ops: 0,
          pitchingGames: (existing?.pitchingGames || 0) + (pitching?.pitchingGames || 0),
          wins: (existing?.wins || 0) + (pitching?.wins || 0),
          losses: (existing?.losses || 0) + (pitching?.losses || 0),
          saves: (existing?.saves || 0) + (pitching?.saves || 0),
          inningsPitched: (existing?.inningsPitched || 0) + (pitching?.inningsPitched || 0),
          earnedRuns: (existing?.earnedRuns || 0) + (pitching?.earnedRuns || 0),
          pitchingStrikeouts: (existing?.pitchingStrikeouts || 0) + (pitching?.pitchingStrikeouts || 0),
          pitchingWalks: (existing?.pitchingWalks || 0) + (pitching?.pitchingWalks || 0),
          hitsAllowed: (existing?.hitsAllowed || 0) + (pitching?.hitsAllowed || 0),
          era: 0,
          whip: 0,
        };

        const totalBases =
          (updated.hits - updated.doubles - updated.triples - updated.homeRuns) +
          (updated.doubles * 2) +
          (updated.triples * 3) +
          (updated.homeRuns * 4);
        const obpDenominator =
          updated.atBats +
          updated.walks +
          (updated.hitByPitch || 0) +
          (updated.sacrificeFlies || 0);

        updated.avg = updated.atBats > 0 ? updated.hits / updated.atBats : 0;
        updated.obp = obpDenominator > 0
          ? (updated.hits + updated.walks + (updated.hitByPitch || 0)) / obpDenominator
          : 0;
        updated.slg = updated.atBats > 0 ? totalBases / updated.atBats : 0;
        updated.ops = updated.obp + updated.slg;

        const inningsPitched = updated.inningsPitched || 0;
        updated.era = inningsPitched > 0 ? (updated.earnedRuns || 0) * 9 / inningsPitched : 0;
        updated.whip = inningsPitched > 0
          ? (((updated.hitsAllowed || 0) + (updated.pitchingWalks || 0)) / inningsPitched)
          : 0;

        store.put(updated);
        if (!syncEngine.isSuppressed()) syncEngine.upsert('kbl-playoffs', 'playoffStats', updated.id, updated);
      }
    };

    request.onerror = () => reject(request.error);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

export async function getAllPlayoffs(): Promise<PlayoffConfig[]> {
  const db = await initPlayoffDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.PLAYOFFS, 'readonly');
    const store = tx.objectStore(STORES.PLAYOFFS);
    const request = store.getAll();

    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Reset the database connection singleton.
 * Call this if the database was externally modified (e.g., cleared via devtools).
 */
export function resetPlayoffDbConnection(): void {
  dbInstance?.close();
  dbInstance = null;
}

export async function deletePlayoffBySeason(
  seasonNumber: number,
  sourceType?: 'franchise' | 'elimination'
): Promise<void> {
  const existing = await getPlayoffBySeason(seasonNumber, sourceType);
  if (existing) {
    await deletePlayoff(existing.id);
  }
}

/**
 * Delete series, playoffGames, and playoffStats for a given playoff ID.
 * Used by both deletePlayoff (full cascade) and createPlayoff (replacing old playoff).
 */
async function cascadeDeletePlayoffChildren(db: IDBDatabase, playoffId: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(
      [STORES.SERIES, STORES.PLAYOFF_GAMES, STORES.PLAYOFF_STATS],
      'readwrite'
    );

    const seriesStore = tx.objectStore(STORES.SERIES);
    const seriesCursor = seriesStore.index('playoffId').openCursor(playoffId);
    seriesCursor.onsuccess = () => {
      const cursor = seriesCursor.result;
      if (cursor) {
        if (!syncEngine.isSuppressed()) syncEngine.remove('kbl-playoffs', 'series', (cursor.value as { id: string }).id);
        cursor.delete();
        cursor.continue();
      }
    };

    const gamesStore = tx.objectStore(STORES.PLAYOFF_GAMES);
    const gamesCursor = gamesStore.index('playoffId').openCursor(playoffId);
    gamesCursor.onsuccess = () => {
      const cursor = gamesCursor.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };

    const statsStore = tx.objectStore(STORES.PLAYOFF_STATS);
    const statsCursor = statsStore.index('playoffId').openCursor(playoffId);
    statsCursor.onsuccess = () => {
      const cursor = statsCursor.result;
      if (cursor) {
        if (!syncEngine.isSuppressed()) syncEngine.remove('kbl-playoffs', 'playoffStats', (cursor.value as { id: string }).id);
        cursor.delete();
        cursor.continue();
      }
    };

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function deletePlayoff(playoffId: string): Promise<void> {
  const db = await initPlayoffDatabase();

  // Delete the playoff record itself
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORES.PLAYOFFS, 'readwrite');
    tx.objectStore(STORES.PLAYOFFS).delete(playoffId);
    if (!syncEngine.isSuppressed()) syncEngine.remove('kbl-playoffs', 'playoffs', playoffId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });

  // Cascade-delete series, playoffGames, and stats
  await cascadeDeletePlayoffChildren(db, playoffId);
}
