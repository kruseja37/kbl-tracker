/**
 * Museum Storage Utility
 *
 * Provides IndexedDB storage for historical league data:
 * - Championship history
 * - Season records/standings
 * - Award winners
 * - Hall of Fame
 * - All-time records
 * - Legendary moments
 * - Retired jerseys
 */

const DB_NAME = 'kbl-museum';
const DB_VERSION = 1;

// Store names
const STORES = {
  CHAMPIONSHIPS: 'championships',
  SEASON_STANDINGS: 'seasonStandings',
  TEAM_RECORDS: 'teamRecords',
  AWARD_WINNERS: 'awardWinners',
  HALL_OF_FAME: 'hallOfFame',
  ALL_TIME_LEADERS: 'allTimeLeaders',
  RECORDS: 'records',
  MOMENTS: 'moments',
  RETIRED_JERSEYS: 'retiredJerseys',
  STADIUMS: 'stadiums',
} as const;

// ============================================
// TYPES
// ============================================

export interface ChampionshipRecord {
  year: number;
  champion: string;
  championId: string;
  runnerUp: string;
  runnerUpId: string;
  series: string; // e.g., "4-2"
  mvp?: string;
  mvpId?: string;
}

export interface SeasonStanding {
  year: number;
  teamId: string;
  teamName: string;
  wins: number;
  losses: number;
  standing: string; // e.g., "1st AL West"
  playoffResult: string; // e.g., "Champions", "Wild Card", "Missed"
  runsScored: number;
  runsAllowed: number;
}

export interface TeamAllTimeRecord {
  teamId: string;
  teamName: string;
  totalWins: number;
  totalLosses: number;
  winPct: number;
  championships: number;
  playoffAppearances: number;
  lastUpdated: number;
}

export interface AwardWinner {
  year: number;
  awardType: 'MVP' | 'CY_YOUNG' | 'ROY' | 'GOLD_GLOVE' | 'SILVER_SLUGGER' | 'RELIEVER' | 'MANAGER';
  playerId: string;
  playerName: string;
  teamId: string;
  teamName: string;
  stats?: string; // e.g., ".342 BA, 45 HR, 127 RBI"
}

export interface HallOfFamer {
  id: string;
  playerId: string;
  name: string;
  teamId: string; // Primary team
  teamName: string;
  position: string;
  jerseyNumber: number;
  inductedYear: number;
  careerYears: string; // e.g., "2018-2030"
  careerWar: number;
  highlights: string[];
}

export interface AllTimeLeader {
  id: string;
  playerId: string;
  name: string;
  teamId: string;
  teamName: string;
  category: 'batting' | 'pitching';
  war: number;
  pwar: number;
  bwar: number;
  rwar: number;
  fwar: number;
  // Batting stats
  avg?: number;
  hr?: number;
  rbi?: number;
  hits?: number;
  sb?: number;
  // Pitching stats
  era?: number;
  wins?: number;
  strikeouts?: number;
  saves?: number;
  lastUpdated: number;
}

export interface LeagueRecord {
  id: string;
  category: 'batting' | 'pitching' | 'fielding' | 'team';
  recordName: string; // e.g., "Most Career Home Runs"
  playerId?: string;
  playerName: string; // Can be team name for team records
  teamId: string;
  teamName: string;
  year: string; // e.g., "2023" or "2015-2025"
  value: string; // e.g., "389", ".312", "2.45"
  numericValue: number; // For sorting
  isCareer: boolean;
}

export interface LegendaryMoment {
  id: string;
  date: string;
  year: number;
  title: string;
  description: string;
  reporter?: string;
  playerId?: string;
  playerName?: string;
  teamId?: string;
  teamName?: string;
  tags: string[]; // e.g., ["perfect-game", "world-series", "walk-off"]
}

export interface RetiredJersey {
  id: string;
  teamId: string;
  teamName: string;
  number: number;
  playerId: string;
  playerName: string;
  position: string;
  years: string; // e.g., "2018-2030"
  retiredYear: number;
}

export interface StadiumData {
  id: string;
  teamId: string;
  name: string;
  opened: number;
  capacity: number;
  // Park factors (100 = neutral)
  overall: number;
  hr: number;
  doubles: number;
  triples: number;
}

// ============================================
// DATABASE INITIALIZATION
// ============================================

let dbInstance: IDBDatabase | null = null;

/**
 * Initialize the Museum IndexedDB database
 */
export async function initMuseumDatabase(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('[museumStorage] Failed to open database:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Championships store
      if (!db.objectStoreNames.contains(STORES.CHAMPIONSHIPS)) {
        const store = db.createObjectStore(STORES.CHAMPIONSHIPS, { keyPath: 'year' });
        store.createIndex('champion', 'championId', { unique: false });
      }

      // Season standings store
      if (!db.objectStoreNames.contains(STORES.SEASON_STANDINGS)) {
        const store = db.createObjectStore(STORES.SEASON_STANDINGS, {
          keyPath: ['year', 'teamId']
        });
        store.createIndex('year', 'year', { unique: false });
        store.createIndex('teamId', 'teamId', { unique: false });
      }

      // Team all-time records store
      if (!db.objectStoreNames.contains(STORES.TEAM_RECORDS)) {
        db.createObjectStore(STORES.TEAM_RECORDS, { keyPath: 'teamId' });
      }

      // Award winners store
      if (!db.objectStoreNames.contains(STORES.AWARD_WINNERS)) {
        const store = db.createObjectStore(STORES.AWARD_WINNERS, {
          keyPath: ['year', 'awardType']
        });
        store.createIndex('year', 'year', { unique: false });
        store.createIndex('playerId', 'playerId', { unique: false });
        store.createIndex('awardType', 'awardType', { unique: false });
      }

      // Hall of Fame store
      if (!db.objectStoreNames.contains(STORES.HALL_OF_FAME)) {
        const store = db.createObjectStore(STORES.HALL_OF_FAME, { keyPath: 'id' });
        store.createIndex('playerId', 'playerId', { unique: false });
        store.createIndex('inductedYear', 'inductedYear', { unique: false });
      }

      // All-time leaders store
      if (!db.objectStoreNames.contains(STORES.ALL_TIME_LEADERS)) {
        const store = db.createObjectStore(STORES.ALL_TIME_LEADERS, { keyPath: 'id' });
        store.createIndex('playerId', 'playerId', { unique: false });
        store.createIndex('category', 'category', { unique: false });
        store.createIndex('war', 'war', { unique: false });
      }

      // Records store
      if (!db.objectStoreNames.contains(STORES.RECORDS)) {
        const store = db.createObjectStore(STORES.RECORDS, { keyPath: 'id' });
        store.createIndex('category', 'category', { unique: false });
        store.createIndex('recordName', 'recordName', { unique: false });
      }

      // Legendary moments store
      if (!db.objectStoreNames.contains(STORES.MOMENTS)) {
        const store = db.createObjectStore(STORES.MOMENTS, { keyPath: 'id' });
        store.createIndex('year', 'year', { unique: false });
        store.createIndex('playerId', 'playerId', { unique: false });
      }

      // Retired jerseys store
      if (!db.objectStoreNames.contains(STORES.RETIRED_JERSEYS)) {
        const store = db.createObjectStore(STORES.RETIRED_JERSEYS, { keyPath: 'id' });
        store.createIndex('teamId', 'teamId', { unique: false });
        store.createIndex('playerId', 'playerId', { unique: false });
      }

      // Stadiums store
      if (!db.objectStoreNames.contains(STORES.STADIUMS)) {
        const store = db.createObjectStore(STORES.STADIUMS, { keyPath: 'id' });
        store.createIndex('teamId', 'teamId', { unique: false });
      }
    };
  });
}

// ============================================
// CHAMPIONSHIPS
// ============================================

export async function getChampionships(): Promise<ChampionshipRecord[]> {
  const db = await initMuseumDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.CHAMPIONSHIPS, 'readonly');
    const store = tx.objectStore(STORES.CHAMPIONSHIPS);
    const request = store.getAll();

    request.onsuccess = () => {
      const results = request.result.sort((a, b) => b.year - a.year);
      resolve(results);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function saveChampionship(record: ChampionshipRecord): Promise<void> {
  const db = await initMuseumDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.CHAMPIONSHIPS, 'readwrite');
    const store = tx.objectStore(STORES.CHAMPIONSHIPS);
    const request = store.put(record);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// ============================================
// SEASON STANDINGS
// ============================================

export async function getSeasonStandings(year?: number): Promise<SeasonStanding[]> {
  const db = await initMuseumDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.SEASON_STANDINGS, 'readonly');
    const store = tx.objectStore(STORES.SEASON_STANDINGS);

    if (year !== undefined) {
      const index = store.index('year');
      const request = index.getAll(year);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    } else {
      const request = store.getAll();
      request.onsuccess = () => {
        const results = request.result.sort((a, b) => b.year - a.year);
        resolve(results);
      };
      request.onerror = () => reject(request.error);
    }
  });
}

export async function getTeamSeasonHistory(teamId: string): Promise<SeasonStanding[]> {
  const db = await initMuseumDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.SEASON_STANDINGS, 'readonly');
    const store = tx.objectStore(STORES.SEASON_STANDINGS);
    const index = store.index('teamId');
    const request = index.getAll(teamId);

    request.onsuccess = () => {
      const results = request.result.sort((a, b) => b.year - a.year);
      resolve(results);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function saveSeasonStanding(standing: SeasonStanding): Promise<void> {
  const db = await initMuseumDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.SEASON_STANDINGS, 'readwrite');
    const store = tx.objectStore(STORES.SEASON_STANDINGS);
    const request = store.put(standing);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// ============================================
// TEAM ALL-TIME RECORDS
// ============================================

export async function getTeamRecords(): Promise<TeamAllTimeRecord[]> {
  const db = await initMuseumDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.TEAM_RECORDS, 'readonly');
    const store = tx.objectStore(STORES.TEAM_RECORDS);
    const request = store.getAll();

    request.onsuccess = () => {
      const results = request.result.sort((a, b) => b.winPct - a.winPct);
      resolve(results);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function getTeamRecord(teamId: string): Promise<TeamAllTimeRecord | null> {
  const db = await initMuseumDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.TEAM_RECORDS, 'readonly');
    const store = tx.objectStore(STORES.TEAM_RECORDS);
    const request = store.get(teamId);

    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

export async function saveTeamRecord(record: TeamAllTimeRecord): Promise<void> {
  const db = await initMuseumDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.TEAM_RECORDS, 'readwrite');
    const store = tx.objectStore(STORES.TEAM_RECORDS);
    const request = store.put({ ...record, lastUpdated: Date.now() });

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// ============================================
// AWARD WINNERS
// ============================================

export async function getAwardWinners(year?: number): Promise<AwardWinner[]> {
  const db = await initMuseumDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.AWARD_WINNERS, 'readonly');
    const store = tx.objectStore(STORES.AWARD_WINNERS);

    if (year !== undefined) {
      const index = store.index('year');
      const request = index.getAll(year);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    } else {
      const request = store.getAll();
      request.onsuccess = () => {
        const results = request.result.sort((a, b) => b.year - a.year);
        resolve(results);
      };
      request.onerror = () => reject(request.error);
    }
  });
}

export async function getPlayerAwards(playerId: string): Promise<AwardWinner[]> {
  const db = await initMuseumDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.AWARD_WINNERS, 'readonly');
    const store = tx.objectStore(STORES.AWARD_WINNERS);
    const index = store.index('playerId');
    const request = index.getAll(playerId);

    request.onsuccess = () => {
      const results = request.result.sort((a, b) => b.year - a.year);
      resolve(results);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function saveAwardWinner(award: AwardWinner): Promise<void> {
  const db = await initMuseumDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.AWARD_WINNERS, 'readwrite');
    const store = tx.objectStore(STORES.AWARD_WINNERS);
    const request = store.put(award);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// ============================================
// HALL OF FAME
// ============================================

export async function getHallOfFamers(): Promise<HallOfFamer[]> {
  const db = await initMuseumDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.HALL_OF_FAME, 'readonly');
    const store = tx.objectStore(STORES.HALL_OF_FAME);
    const request = store.getAll();

    request.onsuccess = () => {
      const results = request.result.sort((a, b) => b.inductedYear - a.inductedYear);
      resolve(results);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function saveHallOfFamer(member: HallOfFamer): Promise<void> {
  const db = await initMuseumDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.HALL_OF_FAME, 'readwrite');
    const store = tx.objectStore(STORES.HALL_OF_FAME);
    const request = store.put(member);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function removeHallOfFamer(id: string): Promise<void> {
  const db = await initMuseumDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.HALL_OF_FAME, 'readwrite');
    const store = tx.objectStore(STORES.HALL_OF_FAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// ============================================
// ALL-TIME LEADERS
// ============================================

export async function getAllTimeLeaders(category?: 'batting' | 'pitching'): Promise<AllTimeLeader[]> {
  const db = await initMuseumDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.ALL_TIME_LEADERS, 'readonly');
    const store = tx.objectStore(STORES.ALL_TIME_LEADERS);

    if (category) {
      const index = store.index('category');
      const request = index.getAll(category);
      request.onsuccess = () => {
        const results = request.result.sort((a, b) => b.war - a.war);
        resolve(results);
      };
      request.onerror = () => reject(request.error);
    } else {
      const request = store.getAll();
      request.onsuccess = () => {
        const results = request.result.sort((a, b) => b.war - a.war);
        resolve(results);
      };
      request.onerror = () => reject(request.error);
    }
  });
}

export async function saveAllTimeLeader(leader: AllTimeLeader): Promise<void> {
  const db = await initMuseumDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.ALL_TIME_LEADERS, 'readwrite');
    const store = tx.objectStore(STORES.ALL_TIME_LEADERS);
    const request = store.put({ ...leader, lastUpdated: Date.now() });

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// ============================================
// RECORDS
// ============================================

export async function getRecords(category?: 'batting' | 'pitching' | 'fielding' | 'team'): Promise<LeagueRecord[]> {
  const db = await initMuseumDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.RECORDS, 'readonly');
    const store = tx.objectStore(STORES.RECORDS);

    if (category) {
      const index = store.index('category');
      const request = index.getAll(category);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    } else {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    }
  });
}

export async function saveRecord(record: LeagueRecord): Promise<void> {
  const db = await initMuseumDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.RECORDS, 'readwrite');
    const store = tx.objectStore(STORES.RECORDS);
    const request = store.put(record);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// ============================================
// LEGENDARY MOMENTS
// ============================================

export async function getMoments(): Promise<LegendaryMoment[]> {
  const db = await initMuseumDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.MOMENTS, 'readonly');
    const store = tx.objectStore(STORES.MOMENTS);
    const request = store.getAll();

    request.onsuccess = () => {
      const results = request.result.sort((a, b) => b.year - a.year);
      resolve(results);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function saveMoment(moment: LegendaryMoment): Promise<void> {
  const db = await initMuseumDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.MOMENTS, 'readwrite');
    const store = tx.objectStore(STORES.MOMENTS);
    const request = store.put(moment);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function removeMoment(id: string): Promise<void> {
  const db = await initMuseumDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.MOMENTS, 'readwrite');
    const store = tx.objectStore(STORES.MOMENTS);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// ============================================
// RETIRED JERSEYS
// ============================================

export async function getRetiredJerseys(teamId?: string): Promise<RetiredJersey[]> {
  const db = await initMuseumDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.RETIRED_JERSEYS, 'readonly');
    const store = tx.objectStore(STORES.RETIRED_JERSEYS);

    if (teamId) {
      const index = store.index('teamId');
      const request = index.getAll(teamId);
      request.onsuccess = () => {
        const results = request.result.sort((a, b) => a.number - b.number);
        resolve(results);
      };
      request.onerror = () => reject(request.error);
    } else {
      const request = store.getAll();
      request.onsuccess = () => {
        const results = request.result.sort((a, b) => a.number - b.number);
        resolve(results);
      };
      request.onerror = () => reject(request.error);
    }
  });
}

export async function saveRetiredJersey(jersey: RetiredJersey): Promise<void> {
  const db = await initMuseumDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.RETIRED_JERSEYS, 'readwrite');
    const store = tx.objectStore(STORES.RETIRED_JERSEYS);
    const request = store.put(jersey);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function removeRetiredJersey(id: string): Promise<void> {
  const db = await initMuseumDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.RETIRED_JERSEYS, 'readwrite');
    const store = tx.objectStore(STORES.RETIRED_JERSEYS);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// ============================================
// STADIUMS
// ============================================

export async function getStadiums(): Promise<StadiumData[]> {
  const db = await initMuseumDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.STADIUMS, 'readonly');
    const store = tx.objectStore(STORES.STADIUMS);
    const request = store.getAll();

    request.onsuccess = () => {
      const results = request.result.sort((a, b) => a.name.localeCompare(b.name));
      resolve(results);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function saveStadium(stadium: StadiumData): Promise<void> {
  const db = await initMuseumDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.STADIUMS, 'readwrite');
    const store = tx.objectStore(STORES.STADIUMS);
    const request = store.put(stadium);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Check if museum has any data
 */
export async function hasMuseumData(): Promise<boolean> {
  try {
    const championships = await getChampionships();
    return championships.length > 0;
  } catch {
    return false;
  }
}

/**
 * Clear all museum data (for testing/reset)
 */
export async function clearAllMuseumData(): Promise<void> {
  const db = await initMuseumDatabase();

  const storeNames = Object.values(STORES);

  for (const storeName of storeNames) {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }
}

/**
 * Generate unique ID for museum records
 */
export function generateMuseumId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
