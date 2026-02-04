/**
 * Playoff Storage Utility
 *
 * Provides IndexedDB storage for playoff state:
 * - Playoff bracket configuration
 * - Series tracking (games, scores, advancement)
 * - Playoff stats (separate from regular season)
 * - Historical playoff data
 */

const DB_NAME = 'kbl-playoffs';
const DB_VERSION = 1;

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

  // Structure
  leagues: ('Eastern' | 'Western')[];
  conferenceChampionship: boolean; // Do leagues play separate brackets?

  // Seeding
  teams: PlayoffTeam[];

  // State
  currentRound: number;
  champion?: string;               // Team ID of winner
  mvp?: PlayoffMVP;

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
  era?: number;
  whip?: number;
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
    };
  });
}

// ============================================
// PLAYOFF CRUD OPERATIONS
// ============================================

export async function createPlayoff(config: Omit<PlayoffConfig, 'id' | 'createdAt'>): Promise<PlayoffConfig> {
  const db = await initPlayoffDatabase();

  const playoff: PlayoffConfig = {
    ...config,
    id: `playoff-${config.seasonNumber}-${Date.now()}`,
    createdAt: Date.now(),
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.PLAYOFFS, 'readwrite');
    const store = tx.objectStore(STORES.PLAYOFFS);
    const request = store.add(playoff);

    request.onsuccess = () => resolve(playoff);
    request.onerror = () => reject(request.error);
  });
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

export async function getPlayoffBySeason(seasonNumber: number): Promise<PlayoffConfig | null> {
  const db = await initPlayoffDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.PLAYOFFS, 'readonly');
    const store = tx.objectStore(STORES.PLAYOFFS);
    const index = store.index('seasonNumber');
    const request = index.get(seasonNumber);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

export async function getCurrentPlayoff(): Promise<PlayoffConfig | null> {
  const db = await initPlayoffDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.PLAYOFFS, 'readonly');
    const store = tx.objectStore(STORES.PLAYOFFS);
    const index = store.index('status');
    const request = index.get('IN_PROGRESS');

    request.onsuccess = () => resolve(request.result || null);
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

    request.onsuccess = () => resolve(updated);
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

export async function createSeries(series: Omit<PlayoffSeries, 'id' | 'createdAt'>): Promise<PlayoffSeries> {
  const db = await initPlayoffDatabase();

  const newSeries: PlayoffSeries = {
    ...series,
    id: `series-${series.playoffId}-r${series.round}-${Date.now()}`,
    createdAt: Date.now(),
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.SERIES, 'readwrite');
    const store = tx.objectStore(STORES.SERIES);
    const request = store.add(newSeries);

    request.onsuccess = () => resolve(newSeries);
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

    request.onsuccess = () => resolve(updated);
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
// PLAYOFF STATS
// ============================================

export async function getPlayoffStats(playoffId: string): Promise<PlayoffPlayerStats[]> {
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

export async function deletePlayoff(playoffId: string): Promise<void> {
  const db = await initPlayoffDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(
      [STORES.PLAYOFFS, STORES.SERIES, STORES.PLAYOFF_GAMES, STORES.PLAYOFF_STATS],
      'readwrite'
    );

    // Delete playoff
    tx.objectStore(STORES.PLAYOFFS).delete(playoffId);

    // Delete related series
    const seriesStore = tx.objectStore(STORES.SERIES);
    const seriesIndex = seriesStore.index('playoffId');
    const seriesCursor = seriesIndex.openCursor(playoffId);
    seriesCursor.onsuccess = () => {
      const cursor = seriesCursor.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };

    // Delete related stats
    const statsStore = tx.objectStore(STORES.PLAYOFF_STATS);
    const statsIndex = statsStore.index('playoffId');
    const statsCursor = statsIndex.openCursor(playoffId);
    statsCursor.onsuccess = () => {
      const cursor = statsCursor.result;
      if (cursor) {
        cursor.delete();
        cursor.continue();
      }
    };

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
