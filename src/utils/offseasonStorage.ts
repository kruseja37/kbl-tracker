/**
 * Offseason State Storage
 *
 * Manages the offseason state machine and persists all offseason decisions.
 * Per OFFSEASON_SYSTEM_SPEC.md - 10 phases in strict order.
 *
 * Phases:
 * 1. Finalize Standings
 * 2. Awards Ceremony
 * 3. Ratings Adjustments / Manager Bonuses
 * 4. Contraction/Expansion
 * 5. Retirements
 * 6. Free Agency
 * 7. Draft
 * 8. Trades
 * 9. Farm Transactions (Call-ups, Send-downs)
 * 10. Spring Training / Finalize
 */

// ============================================
// TYPES
// ============================================

export type OffseasonPhase =
  | 'STANDINGS_FINAL'
  | 'AWARDS'
  | 'RATINGS_ADJUSTMENTS'
  | 'CONTRACTION_EXPANSION'
  | 'RETIREMENTS'
  | 'FREE_AGENCY'
  | 'DRAFT'
  | 'TRADES'
  | 'FARM_TRANSACTIONS'
  | 'SPRING_TRAINING';

export const OFFSEASON_PHASES: OffseasonPhase[] = [
  'STANDINGS_FINAL',
  'AWARDS',
  'RATINGS_ADJUSTMENTS',
  'CONTRACTION_EXPANSION',
  'RETIREMENTS',
  'FREE_AGENCY',
  'DRAFT',
  'TRADES',
  'FARM_TRANSACTIONS',
  'SPRING_TRAINING',
];

export interface OffseasonState {
  id: string;
  seasonId: string;
  seasonNumber: number;
  currentPhase: OffseasonPhase;
  phasesCompleted: OffseasonPhase[];
  status: 'IN_PROGRESS' | 'COMPLETED';
  startedAt: number;
  completedAt?: number;
}

// ============================================
// AWARD TYPES
// ============================================

export interface AwardWinner {
  awardType: string;
  playerId: string;
  playerName: string;
  teamId: string;
  position?: string;
  league?: string;
  stats?: Record<string, number>;
  reward?: string;
}

export interface SeasonAwards {
  id: string;
  seasonId: string;
  seasonNumber: number;
  awards: AwardWinner[];
  createdAt: number;
}

// ============================================
// RATINGS ADJUSTMENT TYPES
// ============================================

export interface RatingAdjustment {
  playerId: string;
  playerName: string;
  teamId: string;
  isPitcher: boolean;
  previousRatings: Record<string, number>;
  newRatings: Record<string, number>;
  reason: 'AGE_DECLINE' | 'AGE_DEVELOPMENT' | 'INJURY' | 'MANUAL';
  adjustedAt: number;
}

export interface ManagerBonus {
  teamId: string;
  teamName: string;
  bonusType: 'PENNANT' | 'DIVISION' | 'PLAYOFF' | 'REGULAR_SEASON';
  amount: number; // +Fame for players
  appliedAt: number;
}

export interface RatingsPhaseData {
  id: string;
  seasonId: string;
  adjustments: RatingAdjustment[];
  managerBonuses: ManagerBonus[];
  completedAt: number;
}

// ============================================
// RETIREMENT TYPES
// ============================================

export interface RetirementDecision {
  playerId: string;
  playerName: string;
  teamId: string;
  age: number;
  finalOverall: string;
  careerWAR: number;
  reason: 'AGE' | 'INJURY' | 'VOLUNTARY' | 'RELEASED';
  hallOfFameEligible: boolean;
  retiredAt: number;
}

export interface RetirementPhaseData {
  id: string;
  seasonId: string;
  retirements: RetirementDecision[];
  completedAt: number;
}

// ============================================
// FREE AGENCY TYPES
// ============================================

export interface FreeAgentSigning {
  playerId: string;
  playerName: string;
  previousTeamId: string;
  newTeamId: string;
  contractYears: number;
  contractValue: number; // Total value
  signedAt: number;
}

export interface FreeAgencyPhaseData {
  id: string;
  seasonId: string;
  signings: FreeAgentSigning[];
  declinedPlayers: string[]; // playerIds who didn't sign
  completedAt: number;
}

// ============================================
// DRAFT TYPES
// ============================================

export interface DraftPick {
  round: number;
  pick: number;
  overallPick: number;
  teamId: string;
  playerId: string;
  playerName: string;
  position: string;
  grade: string;
  potential: string;
}

export interface DraftPhaseData {
  id: string;
  seasonId: string;
  draftOrder: string[]; // teamIds
  picks: DraftPick[];
  totalRounds: number;
  completedAt: number;
}

// ============================================
// TRADE TYPES
// ============================================

export interface Trade {
  id: string;
  seasonId: string;
  team1Id: string;
  team2Id: string;
  team1Receives: string[]; // playerIds
  team2Receives: string[]; // playerIds
  team1DraftPicks?: string[]; // draft pick descriptions
  team2DraftPicks?: string[];
  proposedBy: 'USER' | 'AI';
  status: 'PROPOSED' | 'ACCEPTED' | 'REJECTED' | 'COUNTERED';
  executedAt?: number;
}

export interface TradePhaseData {
  id: string;
  seasonId: string;
  trades: Trade[];
  completedAt: number;
}

// ============================================
// DATABASE SETUP
// ============================================

const DB_NAME = 'kbl-offseason';
const DB_VERSION = 1;

const STORES = {
  offseasonState: 'offseasonState',
  awards: 'awards',
  ratings: 'ratings',
  retirements: 'retirements',
  freeAgency: 'freeAgency',
  draft: 'draft',
  trades: 'trades',
};

let dbPromise: Promise<IDBDatabase> | null = null;

export async function initOffseasonDatabase(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Offseason state store
      if (!db.objectStoreNames.contains(STORES.offseasonState)) {
        db.createObjectStore(STORES.offseasonState, { keyPath: 'id' });
      }

      // Awards store
      if (!db.objectStoreNames.contains(STORES.awards)) {
        db.createObjectStore(STORES.awards, { keyPath: 'id' });
      }

      // Ratings adjustments store
      if (!db.objectStoreNames.contains(STORES.ratings)) {
        db.createObjectStore(STORES.ratings, { keyPath: 'id' });
      }

      // Retirements store
      if (!db.objectStoreNames.contains(STORES.retirements)) {
        db.createObjectStore(STORES.retirements, { keyPath: 'id' });
      }

      // Free agency store
      if (!db.objectStoreNames.contains(STORES.freeAgency)) {
        db.createObjectStore(STORES.freeAgency, { keyPath: 'id' });
      }

      // Draft store
      if (!db.objectStoreNames.contains(STORES.draft)) {
        db.createObjectStore(STORES.draft, { keyPath: 'id' });
      }

      // Trades store
      if (!db.objectStoreNames.contains(STORES.trades)) {
        db.createObjectStore(STORES.trades, { keyPath: 'id' });
      }
    };

    request.onsuccess = () => resolve(request.result);
  });

  return dbPromise;
}

// ============================================
// OFFSEASON STATE OPERATIONS
// ============================================

/**
 * Start a new offseason for a season
 */
export async function startOffseason(
  seasonId: string,
  seasonNumber: number
): Promise<OffseasonState> {
  const db = await initOffseasonDatabase();

  const state: OffseasonState = {
    id: `offseason-${seasonId}`,
    seasonId,
    seasonNumber,
    currentPhase: 'STANDINGS_FINAL',
    phasesCompleted: [],
    status: 'IN_PROGRESS',
    startedAt: Date.now(),
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.offseasonState, 'readwrite');
    const store = tx.objectStore(STORES.offseasonState);
    const request = store.put(state);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(state);
  });
}

/**
 * Get current offseason state for a season
 */
export async function getOffseasonState(
  seasonId: string
): Promise<OffseasonState | null> {
  const db = await initOffseasonDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.offseasonState, 'readonly');
    const store = tx.objectStore(STORES.offseasonState);
    const request = store.get(`offseason-${seasonId}`);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || null);
  });
}

/**
 * Advance to the next offseason phase
 */
export async function advanceOffseasonPhase(
  seasonId: string
): Promise<OffseasonState> {
  const state = await getOffseasonState(seasonId);
  if (!state) throw new Error(`No offseason found for season ${seasonId}`);

  const currentIndex = OFFSEASON_PHASES.indexOf(state.currentPhase);
  if (currentIndex === -1) throw new Error('Invalid current phase');

  // Mark current phase as completed
  if (!state.phasesCompleted.includes(state.currentPhase)) {
    state.phasesCompleted.push(state.currentPhase);
  }

  // Check if this was the last phase
  if (currentIndex >= OFFSEASON_PHASES.length - 1) {
    state.status = 'COMPLETED';
    state.completedAt = Date.now();
  } else {
    state.currentPhase = OFFSEASON_PHASES[currentIndex + 1];
  }

  const db = await initOffseasonDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.offseasonState, 'readwrite');
    const store = tx.objectStore(STORES.offseasonState);
    const request = store.put(state);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(state);
  });
}

/**
 * Get phase display name
 */
export function getPhaseDisplayName(phase: OffseasonPhase): string {
  const names: Record<OffseasonPhase, string> = {
    STANDINGS_FINAL: 'Finalize Standings',
    AWARDS: 'Awards Ceremony',
    RATINGS_ADJUSTMENTS: 'Ratings & Manager Bonuses',
    CONTRACTION_EXPANSION: 'Contraction/Expansion',
    RETIREMENTS: 'Retirements',
    FREE_AGENCY: 'Free Agency',
    DRAFT: 'Draft',
    TRADES: 'Trades',
    FARM_TRANSACTIONS: 'Farm Transactions',
    SPRING_TRAINING: 'Spring Training',
  };
  return names[phase] || phase;
}

/**
 * Check if a phase is complete
 */
export function isPhaseComplete(
  state: OffseasonState,
  phase: OffseasonPhase
): boolean {
  return state.phasesCompleted.includes(phase);
}

/**
 * Check if we can advance (current phase is complete)
 */
export function canAdvancePhase(state: OffseasonState): boolean {
  // Can advance if current phase is in phasesCompleted
  return state.phasesCompleted.includes(state.currentPhase);
}

// ============================================
// AWARDS OPERATIONS
// ============================================

/**
 * Save awards for a season
 */
export async function saveSeasonAwards(
  seasonId: string,
  seasonNumber: number,
  awards: AwardWinner[]
): Promise<SeasonAwards> {
  const db = await initOffseasonDatabase();

  const data: SeasonAwards = {
    id: `awards-${seasonId}`,
    seasonId,
    seasonNumber,
    awards,
    createdAt: Date.now(),
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.awards, 'readwrite');
    const store = tx.objectStore(STORES.awards);
    const request = store.put(data);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(data);
  });
}

/**
 * Get awards for a season
 */
export async function getSeasonAwards(
  seasonId: string
): Promise<SeasonAwards | null> {
  const db = await initOffseasonDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.awards, 'readonly');
    const store = tx.objectStore(STORES.awards);
    const request = store.get(`awards-${seasonId}`);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || null);
  });
}

// ============================================
// RETIREMENT OPERATIONS
// ============================================

/**
 * Save retirement decisions for a season
 */
export async function saveRetirements(
  seasonId: string,
  retirements: RetirementDecision[]
): Promise<RetirementPhaseData> {
  const db = await initOffseasonDatabase();

  const data: RetirementPhaseData = {
    id: `retirements-${seasonId}`,
    seasonId,
    retirements,
    completedAt: Date.now(),
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.retirements, 'readwrite');
    const store = tx.objectStore(STORES.retirements);
    const request = store.put(data);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(data);
  });
}

/**
 * Get retirements for a season
 */
export async function getRetirements(
  seasonId: string
): Promise<RetirementPhaseData | null> {
  const db = await initOffseasonDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.retirements, 'readonly');
    const store = tx.objectStore(STORES.retirements);
    const request = store.get(`retirements-${seasonId}`);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || null);
  });
}

// ============================================
// RATINGS ADJUSTMENT OPERATIONS
// ============================================

/**
 * Save ratings adjustments for a season
 */
export async function saveRatingsAdjustments(
  seasonId: string,
  adjustments: RatingAdjustment[],
  managerBonuses: ManagerBonus[]
): Promise<RatingsPhaseData> {
  const db = await initOffseasonDatabase();

  const data: RatingsPhaseData = {
    id: `ratings-${seasonId}`,
    seasonId,
    adjustments,
    managerBonuses,
    completedAt: Date.now(),
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.ratings, 'readwrite');
    const store = tx.objectStore(STORES.ratings);
    const request = store.put(data);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(data);
  });
}

/**
 * Get ratings adjustments for a season
 */
export async function getRatingsAdjustments(
  seasonId: string
): Promise<RatingsPhaseData | null> {
  const db = await initOffseasonDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.ratings, 'readonly');
    const store = tx.objectStore(STORES.ratings);
    const request = store.get(`ratings-${seasonId}`);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || null);
  });
}

// ============================================
// FREE AGENCY OPERATIONS
// ============================================

/**
 * Save free agency signings for a season
 */
export async function saveFreeAgencySignings(
  seasonId: string,
  signings: FreeAgentSigning[],
  declinedPlayers: string[]
): Promise<FreeAgencyPhaseData> {
  const db = await initOffseasonDatabase();

  const data: FreeAgencyPhaseData = {
    id: `free-agency-${seasonId}`,
    seasonId,
    signings,
    declinedPlayers,
    completedAt: Date.now(),
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.freeAgency, 'readwrite');
    const store = tx.objectStore(STORES.freeAgency);
    const request = store.put(data);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(data);
  });
}

/**
 * Get free agency data for a season
 */
export async function getFreeAgencyData(
  seasonId: string
): Promise<FreeAgencyPhaseData | null> {
  const db = await initOffseasonDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.freeAgency, 'readonly');
    const store = tx.objectStore(STORES.freeAgency);
    const request = store.get(`free-agency-${seasonId}`);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || null);
  });
}

// ============================================
// DRAFT OPERATIONS
// ============================================

/**
 * Save draft results for a season
 */
export async function saveDraftResults(
  seasonId: string,
  draftOrder: string[],
  picks: DraftPick[],
  totalRounds: number
): Promise<DraftPhaseData> {
  const db = await initOffseasonDatabase();

  const data: DraftPhaseData = {
    id: `draft-${seasonId}`,
    seasonId,
    draftOrder,
    picks,
    totalRounds,
    completedAt: Date.now(),
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.draft, 'readwrite');
    const store = tx.objectStore(STORES.draft);
    const request = store.put(data);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(data);
  });
}

/**
 * Get draft data for a season
 */
export async function getDraftData(
  seasonId: string
): Promise<DraftPhaseData | null> {
  const db = await initOffseasonDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.draft, 'readonly');
    const store = tx.objectStore(STORES.draft);
    const request = store.get(`draft-${seasonId}`);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || null);
  });
}

// ============================================
// TRADE OPERATIONS
// ============================================

/**
 * Save trades for a season
 */
export async function saveTrades(
  seasonId: string,
  trades: Trade[]
): Promise<TradePhaseData> {
  const db = await initOffseasonDatabase();

  const data: TradePhaseData = {
    id: `trades-${seasonId}`,
    seasonId,
    trades,
    completedAt: Date.now(),
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.trades, 'readwrite');
    const store = tx.objectStore(STORES.trades);
    const request = store.put(data);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(data);
  });
}

/**
 * Get trades for a season
 */
export async function getTrades(
  seasonId: string
): Promise<TradePhaseData | null> {
  const db = await initOffseasonDatabase();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORES.trades, 'readonly');
    const store = tx.objectStore(STORES.trades);
    const request = store.get(`trades-${seasonId}`);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || null);
  });
}

/**
 * Add a single trade
 */
export async function addTrade(
  seasonId: string,
  trade: Omit<Trade, 'id' | 'seasonId'>
): Promise<Trade> {
  const existing = await getTrades(seasonId);
  const trades = existing?.trades || [];

  const newTrade: Trade = {
    ...trade,
    id: `trade-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    seasonId,
  };

  trades.push(newTrade);
  await saveTrades(seasonId, trades);

  return newTrade;
}
