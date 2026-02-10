/**
 * Award Emblems System (GAP-B10-005)
 * Per KBL_XHD_TRACKER_MASTER_SPEC_v3.md §24
 *
 * 16 award emblem types with priority ordering and count display.
 */

// ============================================
// TYPES
// ============================================

export type AwardType =
  | 'MVP' | 'CY_YOUNG' | 'ROOKIE_OF_YEAR' | 'RELIEVER_OF_YEAR'
  | 'GOLD_GLOVE' | 'PLATINUM_GLOVE' | 'BOOGER_GLOVE' | 'SILVER_SLUGGER'
  | 'BENCH_PLAYER' | 'KARA_KAWAGUCHI' | 'COMEBACK_PLAYER'
  | 'MANAGER_OF_YEAR' | 'BUST_OF_YEAR'
  | 'ALL_STAR' | 'WORLD_SERIES_MVP' | 'HALL_OF_FAME';

export interface PlayerAward {
  type: AwardType;
  seasons: number[];
  count: number;
}

export interface PlayerAwardProfile {
  playerId: string;
  awards: PlayerAward[];
}

// ============================================
// AWARD EMBLEMS (16 types)
// ============================================

export const AWARD_EMBLEMS: Record<AwardType, string> = {
  MVP: '🏆MVP',
  CY_YOUNG: '🏆CY',
  ROOKIE_OF_YEAR: '🌟ROY',
  RELIEVER_OF_YEAR: '🔥ROTY',
  GOLD_GLOVE: '🧤GG',
  PLATINUM_GLOVE: '🥇PG',
  BOOGER_GLOVE: '🤢BG',
  SILVER_SLUGGER: '⚾SS',
  BENCH_PLAYER: '🪑BP',
  KARA_KAWAGUCHI: '💎KK',
  COMEBACK_PLAYER: '🔄CB',
  MANAGER_OF_YEAR: '📋MOY',
  BUST_OF_YEAR: '💩BUST',
  ALL_STAR: '⭐AS',
  WORLD_SERIES_MVP: '🏆WSMVP',
  HALL_OF_FAME: '🎖️HOF',
};

/** Short labels without emoji for compact displays */
export const AWARD_SHORT_LABELS: Record<AwardType, string> = {
  MVP: 'MVP',
  CY_YOUNG: 'CY',
  ROOKIE_OF_YEAR: 'ROY',
  RELIEVER_OF_YEAR: 'ROTY',
  GOLD_GLOVE: 'GG',
  PLATINUM_GLOVE: 'PG',
  BOOGER_GLOVE: 'BG',
  SILVER_SLUGGER: 'SS',
  BENCH_PLAYER: 'BP',
  KARA_KAWAGUCHI: 'KK',
  COMEBACK_PLAYER: 'CB',
  MANAGER_OF_YEAR: 'MOY',
  BUST_OF_YEAR: 'BUST',
  ALL_STAR: 'AS',
  WORLD_SERIES_MVP: 'WSMVP',
  HALL_OF_FAME: 'HOF',
};

// ============================================
// PRIORITY ORDER (for space-limited displays)
// ============================================

export const AWARD_PRIORITY: AwardType[] = [
  'HALL_OF_FAME',
  'MVP',
  'CY_YOUNG',
  'WORLD_SERIES_MVP',
  'GOLD_GLOVE',
  'SILVER_SLUGGER',
  'ROOKIE_OF_YEAR',
  'ALL_STAR',
  'RELIEVER_OF_YEAR',
  'PLATINUM_GLOVE',
  'COMEBACK_PLAYER',
  'KARA_KAWAGUCHI',
  'MANAGER_OF_YEAR',
  'BENCH_PLAYER',
  'BOOGER_GLOVE',
  'BUST_OF_YEAR',
];

// ============================================
// CORE FUNCTIONS
// ============================================

/**
 * Get formatted emblem string for a player's awards.
 * Sorted by priority. Multi-year awards show count.
 *
 * Example: "🏆MVP 🧤GG(2) ⭐(3)"
 */
export function getPlayerEmblems(
  awards: PlayerAward[],
  options?: { maxEmblems?: number; showCounts?: boolean },
): string {
  const { maxEmblems, showCounts = true } = options ?? {};

  // Sort by priority
  const sorted = [...awards].sort(
    (a, b) => AWARD_PRIORITY.indexOf(a.type) - AWARD_PRIORITY.indexOf(b.type),
  );

  const limited = maxEmblems ? sorted.slice(0, maxEmblems) : sorted;

  return limited.map(award => {
    const emblem = AWARD_EMBLEMS[award.type];
    if (showCounts && award.count > 1) {
      return `${emblem}(${award.count})`;
    }
    return emblem;
  }).join(' ');
}

/**
 * Get compact emblem string (no emoji, just abbreviations with counts).
 * Example: "MVP GG(2) AS(3)"
 */
export function getPlayerEmblemsCompact(
  awards: PlayerAward[],
  maxEmblems?: number,
): string {
  const sorted = [...awards].sort(
    (a, b) => AWARD_PRIORITY.indexOf(a.type) - AWARD_PRIORITY.indexOf(b.type),
  );
  const limited = maxEmblems ? sorted.slice(0, maxEmblems) : sorted;

  return limited.map(award => {
    const label = AWARD_SHORT_LABELS[award.type];
    return award.count > 1 ? `${label}(${award.count})` : label;
  }).join(' ');
}

/**
 * Add an award to a player's profile. If award already exists, increments count.
 */
export function addAward(
  profile: PlayerAwardProfile,
  awardType: AwardType,
  season: number,
): void {
  const existing = profile.awards.find(a => a.type === awardType);
  if (existing) {
    existing.count++;
    existing.seasons.push(season);
  } else {
    profile.awards.push({
      type: awardType,
      seasons: [season],
      count: 1,
    });
  }
}

/**
 * Create an empty award profile for a player.
 */
export function createAwardProfile(playerId: string): PlayerAwardProfile {
  return { playerId, awards: [] };
}

/**
 * Check if player has a specific award.
 */
export function hasAward(profile: PlayerAwardProfile, awardType: AwardType): boolean {
  return profile.awards.some(a => a.type === awardType);
}

/**
 * Get the count of a specific award.
 */
export function getAwardCount(profile: PlayerAwardProfile, awardType: AwardType): number {
  return profile.awards.find(a => a.type === awardType)?.count ?? 0;
}

/**
 * Get total number of awards (sum of all counts).
 */
export function getTotalAwards(profile: PlayerAwardProfile): number {
  return profile.awards.reduce((sum, a) => sum + a.count, 0);
}
