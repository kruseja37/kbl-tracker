/**
 * Legacy & Dynasty Status Tracker (GAP-B10-007)
 * Per KBL_XHD_TRACKER_MASTER_SPEC_v3.md §19
 *
 * Player legacy status (Cornerstone/Icon/Legend) and team dynasty detection.
 */

// ============================================
// TYPES
// ============================================

export type LegacyStatus = 'FRANCHISE_CORNERSTONE' | 'FRANCHISE_ICON' | 'FRANCHISE_LEGEND' | null;
export type DynastyStatus = 'DYNASTY' | 'MINI_DYNASTY' | 'CONTENDER' | null;
export type PlayerOrigin = 'HOMEGROWN' | 'TRADE_ACQUISITION' | 'FREE_AGENT_SIGNING' | 'EXPANSION_DRAFT';

export interface PlayerTeamHistory {
  teamId: string;
  seasons: number;
  war: number;
  acquisitionType: PlayerOrigin;
  legacyStatus: LegacyStatus;
}

export interface TeamLegacy {
  teamId: string;
  dynastyStatus: DynastyStatus;
  legends: string[];      // Player IDs with FRANCHISE_LEGEND
  icons: string[];         // Player IDs with FRANCHISE_ICON
  cornerstones: string[];  // Player IDs with FRANCHISE_CORNERSTONE
  homegrownRatio: number;  // 0-1 percentage
}

// ============================================
// LEGACY THRESHOLDS (reduced for faster progression)
// ============================================

export const LEGACY_THRESHOLDS = {
  FRANCHISE_CORNERSTONE: {
    minSeasons: 2,
    minWAR: 5.0,
    minAwards: 0,
    description: '2+ seasons, 5+ WAR with team',
  },
  FRANCHISE_ICON: {
    minSeasons: 3,
    minWAR: 10.0,
    minAwards: 1, // MVP, Cy Young, or 2+ All-Stars
    description: '3+ seasons, 10+ WAR, at least 1 major award',
  },
  FRANCHISE_LEGEND: {
    minSeasons: 5,
    minWAR: 18.0,
    minAwards: 2,
    description: '5+ seasons, 18+ WAR, multiple awards',
  },
} as const;

export const LEGACY_LABELS: Record<NonNullable<LegacyStatus>, string> = {
  FRANCHISE_CORNERSTONE: 'Cornerstone',
  FRANCHISE_ICON: 'Franchise Icon',
  FRANCHISE_LEGEND: 'Legend',
};

export const DYNASTY_LABELS: Record<NonNullable<DynastyStatus>, string> = {
  DYNASTY: 'Dynasty',
  MINI_DYNASTY: 'Mini-Dynasty',
  CONTENDER: 'Perennial Contender',
};

// ============================================
// AWARD COUNTING FOR LEGACY
// ============================================

/**
 * Count "major awards" for legacy status determination.
 * 1 per MVP, 1 per Cy Young, 1 per 2 All-Stars, 1 per Championship MVP.
 */
export function countMajorAwards(player: {
  mvpAwards?: number;
  cyYoungAwards?: number;
  allStarSelections?: number;
  championshipMVPs?: number;
}): number {
  let count = 0;
  count += player.mvpAwards ?? 0;
  count += player.cyYoungAwards ?? 0;
  count += Math.floor((player.allStarSelections ?? 0) / 2);
  count += player.championshipMVPs ?? 0;
  return count;
}

// ============================================
// LEGACY STATUS CALCULATION
// ============================================

/**
 * Calculate a player's legacy status with a specific team.
 */
export function calculateLegacyStatus(
  seasonsWithTeam: number,
  warWithTeam: number,
  majorAwards: number,
): LegacyStatus {
  // Check from highest to lowest
  if (
    seasonsWithTeam >= LEGACY_THRESHOLDS.FRANCHISE_LEGEND.minSeasons &&
    warWithTeam >= LEGACY_THRESHOLDS.FRANCHISE_LEGEND.minWAR &&
    majorAwards >= LEGACY_THRESHOLDS.FRANCHISE_LEGEND.minAwards
  ) {
    return 'FRANCHISE_LEGEND';
  }

  if (
    seasonsWithTeam >= LEGACY_THRESHOLDS.FRANCHISE_ICON.minSeasons &&
    warWithTeam >= LEGACY_THRESHOLDS.FRANCHISE_ICON.minWAR &&
    majorAwards >= LEGACY_THRESHOLDS.FRANCHISE_ICON.minAwards
  ) {
    return 'FRANCHISE_ICON';
  }

  if (
    seasonsWithTeam >= LEGACY_THRESHOLDS.FRANCHISE_CORNERSTONE.minSeasons &&
    warWithTeam >= LEGACY_THRESHOLDS.FRANCHISE_CORNERSTONE.minWAR
  ) {
    return 'FRANCHISE_CORNERSTONE';
  }

  return null;
}

// ============================================
// DYNASTY DETECTION
// ============================================

export interface SeasonRecord {
  season: number;
  champion?: string;        // Team ID of champion
  playoffTeams: string[];   // Team IDs that made playoffs
}

/**
 * Check for dynasty status based on last 5 seasons.
 */
export function checkForDynasty(
  teamId: string,
  seasons: SeasonRecord[],
): DynastyStatus {
  const recentSeasons = seasons.slice(-5);
  if (recentSeasons.length < 2) return null;

  const championships = recentSeasons.filter(s => s.champion === teamId).length;
  const playoffAppearances = recentSeasons.filter(s => s.playoffTeams.includes(teamId)).length;

  if (championships >= 3) return 'DYNASTY';
  if (championships >= 2 && playoffAppearances >= 4) return 'MINI_DYNASTY';
  if (playoffAppearances >= 5) return 'CONTENDER';

  return null;
}

/**
 * Calculate homegrown ratio for a team.
 */
export function getHomegrownRatio(
  playerOrigins: PlayerOrigin[],
): { homegrown: number; acquired: number; ratio: number } {
  const homegrown = playerOrigins.filter(o => o === 'HOMEGROWN').length;
  const total = playerOrigins.length;
  return {
    homegrown,
    acquired: total - homegrown,
    ratio: total > 0 ? homegrown / total : 0,
  };
}

/**
 * Build complete team legacy summary.
 */
export function buildTeamLegacy(
  teamId: string,
  playerStatuses: Array<{ playerId: string; status: LegacyStatus }>,
  seasons: SeasonRecord[],
  playerOrigins: PlayerOrigin[],
): TeamLegacy {
  return {
    teamId,
    dynastyStatus: checkForDynasty(teamId, seasons),
    legends: playerStatuses.filter(p => p.status === 'FRANCHISE_LEGEND').map(p => p.playerId),
    icons: playerStatuses.filter(p => p.status === 'FRANCHISE_ICON').map(p => p.playerId),
    cornerstones: playerStatuses.filter(p => p.status === 'FRANCHISE_CORNERSTONE').map(p => p.playerId),
    homegrownRatio: getHomegrownRatio(playerOrigins).ratio,
  };
}
