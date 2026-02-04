/**
 * Franchise Storage - Stub file
 *
 * NOTE (2026-02-03): This file was missing and causing build failures.
 * The milestoneAggregator.ts imports from it, but it was never created.
 * This stub provides minimal implementations to allow the build to pass.
 *
 * TODO: Implement full franchise first/leader tracking when needed.
 */

// ============================================
// TYPES
// ============================================

export type FranchiseFirstKey =
  | 'FIRST_HR'
  | 'FIRST_GRAND_SLAM'
  | 'FIRST_CYCLE'
  | 'FIRST_NO_HITTER'
  | 'FIRST_PERFECT_GAME'
  | 'FIRST_SAVE'
  | 'FIRST_20_WIN_SEASON'
  | 'FIRST_50_HR_SEASON'
  | 'FIRST_100_RBI_SEASON'
  | 'FIRST_200_K_SEASON';

export interface FranchiseFirst {
  key: FranchiseFirstKey;
  franchiseId: string;  // Added for milestoneAggregator
  playerId: string;
  playerName: string;
  teamId: string;
  seasonId: string;
  gameId: string;
  value: number;
  timestamp: number;
  description: string;
}

// All categories used by milestoneAggregator
export type LeaderCategory =
  // Batting
  | 'career_hr'
  | 'career_hits'
  | 'career_rbi'
  | 'career_runs'
  | 'career_sb'
  | 'career_doubles'
  | 'career_triples'
  | 'career_walks'
  | 'career_games'
  // Pitching
  | 'career_wins'
  | 'career_saves'
  | 'career_strikeouts'
  | 'career_ip'
  | 'career_shutouts'
  | 'career_complete_games'
  | 'career_era'
  | 'career_whip';

export interface FranchiseLeaderEvent {
  category: LeaderCategory;
  type: 'new_leader' | 'extended_lead' | 'took_lead';  // Added took_lead for milestoneAggregator
  franchiseId: string;
  playerId: string;
  playerName: string;
  newValue: number;
  previousLeaderId: string | null;
  previousLeaderValue: number | null;
  fameBonus: number;  // Added for milestoneAggregator
}

// ============================================
// CONSTANTS
// ============================================

export const FRANCHISE_FIRST_FAME_VALUES: Record<FranchiseFirstKey, number> = {
  FIRST_HR: 0.5,
  FIRST_GRAND_SLAM: 1.0,
  FIRST_CYCLE: 2.0,
  FIRST_NO_HITTER: 3.0,
  FIRST_PERFECT_GAME: 5.0,
  FIRST_SAVE: 0.5,
  FIRST_20_WIN_SEASON: 1.5,
  FIRST_50_HR_SEASON: 2.0,
  FIRST_100_RBI_SEASON: 1.5,
  FIRST_200_K_SEASON: 1.5,
};

// ============================================
// FUNCTIONS (STUBS)
// ============================================

/**
 * Get the franchise first key for a milestone event type
 * Returns null if this milestone type doesn't have a franchise first
 */
export function getMilestoneFirstKey(_eventType: string): FranchiseFirstKey | null {
  // TODO: Implement mapping from event types to franchise first keys
  return null;
}

/**
 * Check if this is the first time this milestone has been achieved in the franchise
 * Returns the recorded first if this is indeed a first, null otherwise
 *
 * Signature per milestoneAggregator.ts lines 497-506:
 * recordFranchiseFirst(franchiseId, firstKey, playerId, playerName, seasonId, gameId, value, description)
 */
export async function recordFranchiseFirst(
  _franchiseId: string,
  _key: FranchiseFirstKey,
  _playerId: string,
  _playerName: string,
  _seasonId: string,
  _gameId: string,
  _value: number,
  _description: string
): Promise<FranchiseFirst | null> {
  // TODO: Implement IndexedDB storage for franchise firsts
  // For now, return null to indicate no first was recorded
  return null;
}

/**
 * Update franchise leader for a category
 * Returns an event if the leader changed
 *
 * Signature per milestoneAggregator.ts lines 563-571:
 * updateFranchiseLeader(franchiseId, category, playerId, playerName, value, seasonId, gameId)
 */
export async function updateFranchiseLeader(
  _franchiseId: string,
  _category: LeaderCategory,
  _playerId: string,
  _playerName: string,
  _value: number,
  _seasonId: string,
  _gameId: string
): Promise<FranchiseLeaderEvent | null> {
  // TODO: Implement IndexedDB storage for franchise leaders
  // For now, return null to indicate no change
  return null;
}

/**
 * Check if leader tracking should be active
 * Leader tracking starts after 10% of the season
 */
export function isLeaderTrackingActive(
  currentGame: number,
  totalGames: number,
  _currentSeason: number
): boolean {
  return currentGame >= totalGames * 0.1;
}
