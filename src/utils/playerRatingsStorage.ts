// Storage for player ratings that users input manually
// These override the database defaults when calculating salary

const STORAGE_KEY = 'kbl-player-ratings';

export interface BatterRatings {
  power: number;
  contact: number;
  speed: number;
  fielding: number;
  arm: number;
}

export interface PitcherRatings {
  velocity: number;
  junk: number;
  accuracy: number;
}

export interface PlayerRatingsEntry {
  playerId: string;
  batterRatings?: BatterRatings;
  pitcherRatings?: PitcherRatings;
  updatedAt: number;
}

type RatingsStore = Record<string, PlayerRatingsEntry>;

/**
 * Load all player ratings from localStorage
 */
export function loadAllRatings(): RatingsStore {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return {};
    return JSON.parse(stored) as RatingsStore;
  } catch (err) {
    console.warn('[playerRatingsStorage] Failed to load ratings:', err);
    return {};
  }
}

/**
 * Get ratings for a specific player
 */
export function getPlayerRatings(playerId: string): PlayerRatingsEntry | null {
  const all = loadAllRatings();
  return all[playerId] ?? null;
}

/**
 * Save ratings for a specific player
 */
export function savePlayerRatings(entry: PlayerRatingsEntry): void {
  try {
    const all = loadAllRatings();
    all[entry.playerId] = {
      ...entry,
      updatedAt: Date.now(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch (err) {
    console.warn('[playerRatingsStorage] Failed to save ratings:', err);
  }
}

/**
 * Delete ratings for a specific player (revert to database defaults)
 */
export function deletePlayerRatings(playerId: string): void {
  try {
    const all = loadAllRatings();
    delete all[playerId];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
  } catch (err) {
    console.warn('[playerRatingsStorage] Failed to delete ratings:', err);
  }
}

/**
 * Clear all custom ratings
 */
export function clearAllRatings(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.warn('[playerRatingsStorage] Failed to clear ratings:', err);
  }
}

/**
 * Validate rating value (0-99)
 */
export function isValidRating(value: number): boolean {
  return Number.isInteger(value) && value >= 0 && value <= 99;
}
