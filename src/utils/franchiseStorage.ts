/**
 * Franchise Storage Utility
 * Per MILESTONE_SYSTEM_SPEC.md - Section 6: Franchise Firsts & Leaders
 *
 * Provides IndexedDB storage for franchise-level tracking:
 * - Franchise Firsts: First-ever achievements in franchise history
 * - Franchise Leaders: Current and all-time statistical leaders
 */

// ============================================
// TYPES
// ============================================

/**
 * Record of a franchise "first" achievement
 */
export interface FranchiseFirst {
  milestoneKey: string;      // e.g., 'first_hr', 'first_career_hr_100'
  franchiseId: string;
  playerId: string;
  playerName: string;
  achievedAt: number;        // timestamp
  seasonId: string;
  gameId: string;
  value: number;             // The stat value when achieved
  description?: string;
}

/**
 * Tracker for all franchise firsts
 */
export interface FranchiseFirstsTracker {
  franchiseId: string;
  firsts: Record<string, FranchiseFirst>;
  lastUpdated: number;
}

/**
 * Current leader in a category
 */
export interface FranchiseLeaderEntry {
  playerId: string;
  playerName: string;
  value: number;
  sinceSeasonId: string;     // When they took the lead
  sinceTimestamp: number;
}

/**
 * Historical leader record
 */
export interface FranchiseLeaderHistoryEntry {
  playerId: string;
  playerName: string;
  finalValue: number;
  seasonsAsLeader: number;
  startSeasonId: string;
  endSeasonId: string;
}

/**
 * Complete franchise leaders tracking
 */
export interface FranchiseLeaders {
  franchiseId: string;
  lastUpdated: number;
  leaders: Record<string, {
    current: FranchiseLeaderEntry | null;
    allTime: FranchiseLeaderHistoryEntry[];
  }>;
}

/**
 * Event types for franchise leader changes
 */
export type FranchiseLeaderEventType =
  | 'took_lead'
  | 'retained_lead'
  | 'broke_record'
  | 'extended_record';

/**
 * Event when franchise leadership changes
 */
export interface FranchiseLeaderEvent {
  franchiseId: string;
  category: string;
  timestamp: number;
  type: FranchiseLeaderEventType;
  playerId: string;
  playerName: string;
  newValue: number;
  previousLeader?: {
    playerId: string;
    playerName: string;
    value: number;
  };
  fameBonus: number;
  seasonId: string;
  gameId: string;
}

// ============================================
// DATABASE SETUP
// ============================================

const DB_NAME = 'kbl-franchise';
const DB_VERSION = 1;

const STORES = {
  FRANCHISE_FIRSTS: 'franchiseFirsts',
  FRANCHISE_LEADERS: 'franchiseLeaders',
  LEADER_EVENTS: 'leaderEvents',
} as const;

let dbInstance: IDBDatabase | null = null;

/**
 * Initialize the franchise database
 */
export async function initFranchiseDB(): Promise<IDBDatabase> {
  if (dbInstance) return dbInstance;

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('[FranchiseStorage] Failed to open database:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Franchise Firsts store - keyed by franchiseId
      if (!db.objectStoreNames.contains(STORES.FRANCHISE_FIRSTS)) {
        db.createObjectStore(STORES.FRANCHISE_FIRSTS, { keyPath: 'franchiseId' });
      }

      // Franchise Leaders store - keyed by franchiseId
      if (!db.objectStoreNames.contains(STORES.FRANCHISE_LEADERS)) {
        db.createObjectStore(STORES.FRANCHISE_LEADERS, { keyPath: 'franchiseId' });
      }

      // Leader Events store - auto-increment with indexes
      if (!db.objectStoreNames.contains(STORES.LEADER_EVENTS)) {
        const eventsStore = db.createObjectStore(STORES.LEADER_EVENTS, {
          keyPath: 'id',
          autoIncrement: true,
        });
        eventsStore.createIndex('by_franchise', 'franchiseId', { unique: false });
        eventsStore.createIndex('by_player', 'playerId', { unique: false });
        eventsStore.createIndex('by_category', 'category', { unique: false });
      }
    };
  });
}

// ============================================
// FRANCHISE FIRSTS OPERATIONS
// ============================================

/**
 * Get the franchise firsts tracker, creating if needed
 */
export async function getOrCreateFranchiseFirsts(
  franchiseId: string
): Promise<FranchiseFirstsTracker> {
  const db = await initFranchiseDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.FRANCHISE_FIRSTS, 'readwrite');
    const store = transaction.objectStore(STORES.FRANCHISE_FIRSTS);
    const request = store.get(franchiseId);

    request.onerror = () => reject(request.error);

    request.onsuccess = () => {
      if (request.result) {
        resolve(request.result as FranchiseFirstsTracker);
      } else {
        // Create new tracker
        const tracker: FranchiseFirstsTracker = {
          franchiseId,
          firsts: {},
          lastUpdated: Date.now(),
        };

        const putRequest = store.put(tracker);
        putRequest.onerror = () => reject(putRequest.error);
        putRequest.onsuccess = () => resolve(tracker);
      }
    };
  });
}

/**
 * Check if a milestone is a franchise first
 */
export async function isFranchiseFirst(
  franchiseId: string,
  milestoneKey: string
): Promise<boolean> {
  const tracker = await getOrCreateFranchiseFirsts(franchiseId);
  return !(milestoneKey in tracker.firsts);
}

/**
 * Record a franchise first
 * Returns the FranchiseFirst record if this was indeed a first, null otherwise
 */
export async function recordFranchiseFirst(
  franchiseId: string,
  milestoneKey: string,
  playerId: string,
  playerName: string,
  seasonId: string,
  gameId: string,
  value: number,
  description?: string
): Promise<FranchiseFirst | null> {
  const db = await initFranchiseDB();
  const tracker = await getOrCreateFranchiseFirsts(franchiseId);

  // Check if already achieved
  if (milestoneKey in tracker.firsts) {
    return null;  // Not a first
  }

  // Record the first
  const first: FranchiseFirst = {
    milestoneKey,
    franchiseId,
    playerId,
    playerName,
    achievedAt: Date.now(),
    seasonId,
    gameId,
    value,
    description,
  };

  tracker.firsts[milestoneKey] = first;
  tracker.lastUpdated = Date.now();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.FRANCHISE_FIRSTS, 'readwrite');
    const store = transaction.objectStore(STORES.FRANCHISE_FIRSTS);
    const request = store.put(tracker);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(first);
  });
}

/**
 * Get a specific franchise first
 */
export async function getFranchiseFirst(
  franchiseId: string,
  milestoneKey: string
): Promise<FranchiseFirst | null> {
  const tracker = await getOrCreateFranchiseFirsts(franchiseId);
  return tracker.firsts[milestoneKey] || null;
}

/**
 * Get all franchise firsts
 */
export async function getAllFranchiseFirsts(
  franchiseId: string
): Promise<FranchiseFirst[]> {
  const tracker = await getOrCreateFranchiseFirsts(franchiseId);
  return Object.values(tracker.firsts);
}

// ============================================
// FRANCHISE LEADERS OPERATIONS
// ============================================

/**
 * Categories for franchise leaders
 */
export const BATTING_LEADER_CATEGORIES = [
  'career_hr',
  'career_hits',
  'career_rbi',
  'career_runs',
  'career_sb',
  'career_doubles',
  'career_triples',
  'career_walks',
  'career_ba',      // Batting average (min PA)
  'career_ops',     // OPS (min PA)
] as const;

export const PITCHING_LEADER_CATEGORIES = [
  'career_wins',
  'career_saves',
  'career_strikeouts',
  'career_ip',
  'career_shutouts',
  'career_complete_games',
  'career_era',     // Lower is better
  'career_whip',    // Lower is better
] as const;

export const AGGREGATE_LEADER_CATEGORIES = [
  'career_war',
  'career_games',
  'career_allstar',
  'career_mvp',
  'career_cy_young',
] as const;

export type LeaderCategory =
  | typeof BATTING_LEADER_CATEGORIES[number]
  | typeof PITCHING_LEADER_CATEGORIES[number]
  | typeof AGGREGATE_LEADER_CATEGORIES[number];

// Categories where lower is better
const LOWER_IS_BETTER_CATEGORIES: LeaderCategory[] = ['career_era', 'career_whip'];

/**
 * Get the franchise leaders tracker, creating if needed
 */
export async function getOrCreateFranchiseLeaders(
  franchiseId: string
): Promise<FranchiseLeaders> {
  const db = await initFranchiseDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.FRANCHISE_LEADERS, 'readwrite');
    const store = transaction.objectStore(STORES.FRANCHISE_LEADERS);
    const request = store.get(franchiseId);

    request.onerror = () => reject(request.error);

    request.onsuccess = () => {
      if (request.result) {
        resolve(request.result as FranchiseLeaders);
      } else {
        // Create new tracker with all categories
        const leaders: FranchiseLeaders = {
          franchiseId,
          lastUpdated: Date.now(),
          leaders: {},
        };

        // Initialize all categories
        const allCategories = [
          ...BATTING_LEADER_CATEGORIES,
          ...PITCHING_LEADER_CATEGORIES,
          ...AGGREGATE_LEADER_CATEGORIES,
        ];

        for (const category of allCategories) {
          leaders.leaders[category] = {
            current: null,
            allTime: [],
          };
        }

        const putRequest = store.put(leaders);
        putRequest.onerror = () => reject(putRequest.error);
        putRequest.onsuccess = () => resolve(leaders);
      }
    };
  });
}

/**
 * Check if franchise leader tracking should be active
 * Per spec: First check after 50% of first season complete
 */
export function isLeaderTrackingActive(
  currentGame: number,
  gamesPerSeason: number,
  currentSeason: number
): boolean {
  const midpointGame = Math.floor(gamesPerSeason / 2);
  return currentSeason > 1 || currentGame >= midpointGame;
}

/**
 * Update franchise leaders store
 */
async function saveFranchiseLeaders(leaders: FranchiseLeaders): Promise<void> {
  const db = await initFranchiseDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.FRANCHISE_LEADERS, 'readwrite');
    const store = transaction.objectStore(STORES.FRANCHISE_LEADERS);
    const request = store.put(leaders);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * Record a franchise leader event
 */
async function recordLeaderEvent(event: Omit<FranchiseLeaderEvent, 'id'>): Promise<void> {
  const db = await initFranchiseDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.LEADER_EVENTS, 'readwrite');
    const store = transaction.objectStore(STORES.LEADER_EVENTS);
    const request = store.add(event);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

/**
 * Update franchise leader for a category
 * Returns a FranchiseLeaderEvent if leadership changed
 */
export async function updateFranchiseLeader(
  franchiseId: string,
  category: LeaderCategory,
  playerId: string,
  playerName: string,
  newValue: number,
  seasonId: string,
  gameId: string
): Promise<FranchiseLeaderEvent | null> {
  const leaders = await getOrCreateFranchiseLeaders(franchiseId);
  const categoryData = leaders.leaders[category];

  if (!categoryData) {
    console.error(`[FranchiseStorage] Unknown leader category: ${category}`);
    return null;
  }

  const lowerIsBetter = LOWER_IS_BETTER_CATEGORIES.includes(category);
  const currentLeader = categoryData.current;

  // Case 1: No current leader - this player becomes the leader
  if (!currentLeader) {
    categoryData.current = {
      playerId,
      playerName,
      value: newValue,
      sinceSeasonId: seasonId,
      sinceTimestamp: Date.now(),
    };

    leaders.lastUpdated = Date.now();
    await saveFranchiseLeaders(leaders);

    // No event for initial leader in empty category
    return null;
  }

  // Case 2: Same player - check if they extended their record
  if (currentLeader.playerId === playerId) {
    const improved = lowerIsBetter
      ? newValue < currentLeader.value
      : newValue > currentLeader.value;

    if (improved) {
      const oldValue = currentLeader.value;
      currentLeader.value = newValue;
      leaders.lastUpdated = Date.now();
      await saveFranchiseLeaders(leaders);

      // Check for significant extension (10%+)
      const extensionPercent = Math.abs(newValue - oldValue) / oldValue;
      if (extensionPercent >= 0.10) {
        const event: FranchiseLeaderEvent = {
          type: 'extended_record',
          category,
          franchiseId,
          playerId,
          playerName,
          newValue,
          previousLeader: {
            playerId: currentLeader.playerId,
            playerName: currentLeader.playerName,
            value: oldValue,
          },
          fameBonus: 0.5,  // Per spec: +0.5 for extending record by 10%+
          timestamp: Date.now(),
          seasonId,
          gameId,
        };

        await recordLeaderEvent(event);
        return event;
      }
    }
    return null;
  }

  // Case 3: Different player - check if they take the lead
  // Must exceed, not just tie (per spec)
  const takesLead = lowerIsBetter
    ? newValue < currentLeader.value
    : newValue > currentLeader.value;

  if (takesLead) {
    // Record the previous leader in history
    const historicalEntry: FranchiseLeaderHistoryEntry = {
      playerId: currentLeader.playerId,
      playerName: currentLeader.playerName,
      finalValue: currentLeader.value,
      seasonsAsLeader: 0,  // TODO: Calculate actual seasons
      startSeasonId: currentLeader.sinceSeasonId,
      endSeasonId: seasonId,
    };
    categoryData.allTime.push(historicalEntry);

    // Determine fame bonus based on category
    const fameBonus = getLeaderChangeFameBonus(category);

    // Create leader event
    const event: FranchiseLeaderEvent = {
      type: 'took_lead',
      category,
      franchiseId,
      playerId,
      playerName,
      newValue,
      previousLeader: {
        playerId: currentLeader.playerId,
        playerName: currentLeader.playerName,
        value: currentLeader.value,
      },
      fameBonus,
      timestamp: Date.now(),
      seasonId,
      gameId,
    };

    // Update current leader
    categoryData.current = {
      playerId,
      playerName,
      value: newValue,
      sinceSeasonId: seasonId,
      sinceTimestamp: Date.now(),
    };

    leaders.lastUpdated = Date.now();
    await saveFranchiseLeaders(leaders);
    await recordLeaderEvent(event);

    return event;
  }

  return null;
}

/**
 * Get fame bonus for taking franchise lead in a category
 * Per spec Section 6.2
 */
function getLeaderChangeFameBonus(category: LeaderCategory): number {
  const bonuses: Partial<Record<LeaderCategory, number>> = {
    career_hr: 1.0,
    career_hits: 1.0,
    career_rbi: 0.75,
    career_sb: 0.75,
    career_wins: 1.0,
    career_saves: 0.75,
    career_strikeouts: 1.0,
    career_war: 1.5,
  };
  return bonuses[category] ?? 0.5;
}

/**
 * Get current franchise leader for a category
 */
export async function getFranchiseLeader(
  franchiseId: string,
  category: LeaderCategory
): Promise<FranchiseLeaderEntry | null> {
  const leaders = await getOrCreateFranchiseLeaders(franchiseId);
  return leaders.leaders[category]?.current ?? null;
}

/**
 * Get all current franchise leaders
 */
export async function getAllFranchiseLeaders(
  franchiseId: string
): Promise<Record<LeaderCategory, FranchiseLeaderEntry | null>> {
  const leaders = await getOrCreateFranchiseLeaders(franchiseId);
  const result: Partial<Record<LeaderCategory, FranchiseLeaderEntry | null>> = {};

  for (const category of Object.keys(leaders.leaders) as LeaderCategory[]) {
    result[category] = leaders.leaders[category]?.current ?? null;
  }

  return result as Record<LeaderCategory, FranchiseLeaderEntry | null>;
}

// ============================================
// LEADER EVENT OPERATIONS
// ============================================

/**
 * Get leader events for a franchise
 */
export async function getFranchiseLeaderEvents(
  franchiseId: string,
  limit: number = 50
): Promise<FranchiseLeaderEvent[]> {
  const db = await initFranchiseDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.LEADER_EVENTS, 'readonly');
    const store = transaction.objectStore(STORES.LEADER_EVENTS);
    const index = store.index('by_franchise');
    const request = index.getAll(franchiseId);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const events = request.result as FranchiseLeaderEvent[];
      // Return most recent first
      resolve(
        events
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, limit)
      );
    };
  });
}

/**
 * Get leader events for a player
 */
export async function getPlayerLeaderEvents(
  playerId: string,
  limit: number = 50
): Promise<FranchiseLeaderEvent[]> {
  const db = await initFranchiseDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORES.LEADER_EVENTS, 'readonly');
    const store = transaction.objectStore(STORES.LEADER_EVENTS);
    const index = store.index('by_player');
    const request = index.getAll(playerId);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const events = request.result as FranchiseLeaderEvent[];
      resolve(
        events
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, limit)
      );
    };
  });
}

// ============================================
// FRANCHISE FIRSTS MILESTONE KEYS
// ============================================

/**
 * Standard franchise first keys
 */
export const FRANCHISE_FIRST_KEYS = {
  // Single-game firsts
  FIRST_HR: 'first_hr',
  FIRST_GRAND_SLAM: 'first_grand_slam',
  FIRST_CYCLE: 'first_cycle',
  FIRST_WALKOFF_HR: 'first_walkoff_hr',
  FIRST_NO_HITTER: 'first_no_hitter',
  FIRST_PERFECT_GAME: 'first_perfect_game',

  // Season firsts
  FIRST_30_30: 'first_season_30_30',
  FIRST_40_40: 'first_season_40_40',
  FIRST_TRIPLE_CROWN_BATTING: 'first_season_triple_crown_batting',
  FIRST_TRIPLE_CROWN_PITCHING: 'first_season_triple_crown_pitching',
  FIRST_20_WIN: 'first_season_20_win',
  FIRST_40_SAVE: 'first_season_40_save',

  // Career firsts (tiers)
  FIRST_CAREER_HR_100: 'first_career_hr_100',
  FIRST_CAREER_HR_200: 'first_career_hr_200',
  FIRST_CAREER_HR_300: 'first_career_hr_300',
  FIRST_CAREER_HR_400: 'first_career_hr_400',
  FIRST_CAREER_HR_500: 'first_career_hr_500',
  FIRST_CAREER_HITS_1000: 'first_career_hits_1000',
  FIRST_CAREER_HITS_2000: 'first_career_hits_2000',
  FIRST_CAREER_HITS_3000: 'first_career_hits_3000',
  FIRST_CAREER_WINS_100: 'first_career_wins_100',
  FIRST_CAREER_WINS_200: 'first_career_wins_200',
  FIRST_CAREER_WINS_300: 'first_career_wins_300',
  FIRST_CAREER_K_1000: 'first_career_k_1000',
  FIRST_CAREER_K_2000: 'first_career_k_2000',
  FIRST_CAREER_K_3000: 'first_career_k_3000',
} as const;

export type FranchiseFirstKey = typeof FRANCHISE_FIRST_KEYS[keyof typeof FRANCHISE_FIRST_KEYS];

/**
 * Fame bonus values for franchise firsts
 * Per MILESTONE_SYSTEM_SPEC.md Section 6.1
 */
export const FRANCHISE_FIRST_FAME_VALUES: Record<FranchiseFirstKey, number> = {
  // Single-game firsts
  [FRANCHISE_FIRST_KEYS.FIRST_HR]: 0.5,
  [FRANCHISE_FIRST_KEYS.FIRST_GRAND_SLAM]: 1.0,
  [FRANCHISE_FIRST_KEYS.FIRST_CYCLE]: 1.0,
  [FRANCHISE_FIRST_KEYS.FIRST_WALKOFF_HR]: 0.75,
  [FRANCHISE_FIRST_KEYS.FIRST_NO_HITTER]: 2.0,
  [FRANCHISE_FIRST_KEYS.FIRST_PERFECT_GAME]: 3.0,

  // Season firsts
  [FRANCHISE_FIRST_KEYS.FIRST_30_30]: 1.5,
  [FRANCHISE_FIRST_KEYS.FIRST_40_40]: 2.5,
  [FRANCHISE_FIRST_KEYS.FIRST_TRIPLE_CROWN_BATTING]: 2.0,
  [FRANCHISE_FIRST_KEYS.FIRST_TRIPLE_CROWN_PITCHING]: 2.0,
  [FRANCHISE_FIRST_KEYS.FIRST_20_WIN]: 1.0,
  [FRANCHISE_FIRST_KEYS.FIRST_40_SAVE]: 1.0,

  // Career firsts
  [FRANCHISE_FIRST_KEYS.FIRST_CAREER_HR_100]: 0.5,
  [FRANCHISE_FIRST_KEYS.FIRST_CAREER_HR_200]: 0.75,
  [FRANCHISE_FIRST_KEYS.FIRST_CAREER_HR_300]: 1.0,
  [FRANCHISE_FIRST_KEYS.FIRST_CAREER_HR_400]: 1.0,
  [FRANCHISE_FIRST_KEYS.FIRST_CAREER_HR_500]: 1.25,
  [FRANCHISE_FIRST_KEYS.FIRST_CAREER_HITS_1000]: 0.75,
  [FRANCHISE_FIRST_KEYS.FIRST_CAREER_HITS_2000]: 1.5,
  [FRANCHISE_FIRST_KEYS.FIRST_CAREER_HITS_3000]: 2.0,
  [FRANCHISE_FIRST_KEYS.FIRST_CAREER_WINS_100]: 0.75,
  [FRANCHISE_FIRST_KEYS.FIRST_CAREER_WINS_200]: 1.5,
  [FRANCHISE_FIRST_KEYS.FIRST_CAREER_WINS_300]: 2.0,
  [FRANCHISE_FIRST_KEYS.FIRST_CAREER_K_1000]: 0.75,
  [FRANCHISE_FIRST_KEYS.FIRST_CAREER_K_2000]: 1.5,
  [FRANCHISE_FIRST_KEYS.FIRST_CAREER_K_3000]: 2.0,
};

/**
 * Map milestone event types to franchise first keys
 * Used by milestone aggregator to check for franchise firsts
 */
export function getMilestoneFirstKey(milestoneEventType: string): FranchiseFirstKey | null {
  const mapping: Record<string, FranchiseFirstKey> = {
    // Single-game milestones
    'GAME_HR': FRANCHISE_FIRST_KEYS.FIRST_HR,
    'GAME_GRAND_SLAM': FRANCHISE_FIRST_KEYS.FIRST_GRAND_SLAM,
    'GAME_CYCLE': FRANCHISE_FIRST_KEYS.FIRST_CYCLE,
    'GAME_WALKOFF_HR': FRANCHISE_FIRST_KEYS.FIRST_WALKOFF_HR,
    'GAME_NO_HITTER': FRANCHISE_FIRST_KEYS.FIRST_NO_HITTER,
    'GAME_PERFECT_GAME': FRANCHISE_FIRST_KEYS.FIRST_PERFECT_GAME,

    // Season milestones
    'SEASON_30_30': FRANCHISE_FIRST_KEYS.FIRST_30_30,
    'SEASON_40_40': FRANCHISE_FIRST_KEYS.FIRST_40_40,
    'SEASON_TRIPLE_CROWN_BATTING': FRANCHISE_FIRST_KEYS.FIRST_TRIPLE_CROWN_BATTING,
    'SEASON_TRIPLE_CROWN_PITCHING': FRANCHISE_FIRST_KEYS.FIRST_TRIPLE_CROWN_PITCHING,
    'SEASON_20_WINS': FRANCHISE_FIRST_KEYS.FIRST_20_WIN,
    'SEASON_40_SAVES': FRANCHISE_FIRST_KEYS.FIRST_40_SAVE,

    // Career milestones
    'CAREER_HR_100': FRANCHISE_FIRST_KEYS.FIRST_CAREER_HR_100,
    'CAREER_HR_200': FRANCHISE_FIRST_KEYS.FIRST_CAREER_HR_200,
    'CAREER_HR_300': FRANCHISE_FIRST_KEYS.FIRST_CAREER_HR_300,
    'CAREER_HR_400': FRANCHISE_FIRST_KEYS.FIRST_CAREER_HR_400,
    'CAREER_HR_500': FRANCHISE_FIRST_KEYS.FIRST_CAREER_HR_500,
    'CAREER_HITS_1000': FRANCHISE_FIRST_KEYS.FIRST_CAREER_HITS_1000,
    'CAREER_HITS_2000': FRANCHISE_FIRST_KEYS.FIRST_CAREER_HITS_2000,
    'CAREER_HITS_3000': FRANCHISE_FIRST_KEYS.FIRST_CAREER_HITS_3000,
    'CAREER_WINS_100': FRANCHISE_FIRST_KEYS.FIRST_CAREER_WINS_100,
    'CAREER_WINS_200': FRANCHISE_FIRST_KEYS.FIRST_CAREER_WINS_200,
    'CAREER_WINS_300': FRANCHISE_FIRST_KEYS.FIRST_CAREER_WINS_300,
    'CAREER_K_1000': FRANCHISE_FIRST_KEYS.FIRST_CAREER_K_1000,
    'CAREER_K_2000': FRANCHISE_FIRST_KEYS.FIRST_CAREER_K_2000,
    'CAREER_K_3000': FRANCHISE_FIRST_KEYS.FIRST_CAREER_K_3000,
  };

  return mapping[milestoneEventType] || null;
}
