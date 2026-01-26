/**
 * Team MVP & Franchise Cornerstone System
 * Per MILESTONE_SYSTEM_SPEC.md Section 5.2
 *
 * At the end of each season, the player with the highest WAR on each team
 * becomes the Team MVP and the team's Cornerstone for the next season.
 *
 * Legacy Status Tiers:
 * - Franchise Cornerstone: 2+ seasons, 5+ WAR with team
 * - Franchise Icon: 3+ seasons, 10+ WAR, 1+ major award
 * - Franchise Legend: 5+ seasons, 18+ WAR, 2+ awards, HOF-caliber
 */

import type { FameEventType, FameEvent, HalfInning } from '../types/game';
import { FAME_VALUES } from '../types/game';

// ============================================
// HELPERS
// ============================================

/**
 * Create a season-level Fame event (no specific game context)
 * Uses placeholder values for game-specific fields
 */
function createSeasonFameEvent(
  id: string,
  eventType: FameEventType,
  playerId: string,
  playerName: string,
  teamId: string,
  fameValue: number,
  isBonus: boolean,
  description: string,
  seasonId: string
): FameEvent {
  return {
    id,
    gameId: `season_${seasonId}`,  // Use season as pseudo-game ID
    inning: 0,                      // Placeholder - not game-specific
    halfInning: 'TOP' as HalfInning,
    timestamp: Date.now(),
    eventType,
    fameValue,
    fameType: isBonus ? 'bonus' : 'boner',
    playerId,
    playerName,
    playerTeam: teamId,
    autoDetected: true,
    description,
  };
}

// ============================================
// TYPES
// ============================================

/**
 * Team MVP designation for a season
 */
export interface TeamMVP {
  playerId: string;
  playerName: string;
  teamId: string;
  seasonId: string;
  war: number;
  isNewCornerstone: boolean;
  wasRetainedCornerstone: boolean;
}

/**
 * Team Ace designation for a season (best pitcher)
 */
export interface TeamAce {
  playerId: string;
  playerName: string;
  teamId: string;
  seasonId: string;
  pWAR: number;              // Pitching WAR
  wins: number;
  era: number;
  isNewAce: boolean;
  wasRetainedAce: boolean;
}

/**
 * Franchise legacy status tier (non-null values)
 */
export type NonNullLegacyTier = 'cornerstone' | 'icon' | 'legend';

/**
 * Franchise legacy status tier (includes null for "no tier")
 */
export type LegacyStatusTier = NonNullLegacyTier | null;

/**
 * A player's accumulated history with a single team
 */
export interface PlayerTeamHistory {
  playerId: string;
  playerName: string;
  teamId: string;
  seasonsWithTeam: number;
  warWithTeam: number;
  majorAwards: MajorAward[];
  isHofCaliber: boolean;
  currentLegacyTier: LegacyStatusTier;
  cornerstoneSeasons: string[];  // Season IDs where player was Cornerstone
  mvpSeasons: string[];          // Season IDs where player was Team MVP
  achievedTierAt?: {
    tier: LegacyStatusTier;
    seasonId: string;
    timestamp: number;
  };
}

/**
 * Major awards that count toward Icon/Legend status
 */
export type MajorAward =
  | 'MVP'
  | 'CY_YOUNG'
  | 'ROOKIE_OF_THE_YEAR'
  | 'ALL_STAR_MVP'
  | 'LCS_MVP'
  | 'WORLD_SERIES_MVP';

/**
 * Player season WAR data for MVP calculation
 */
export interface PlayerSeasonWAR {
  playerId: string;
  playerName: string;
  teamId: string;
  totalWAR: number;        // Combined WAR
  bWAR: number;            // Batting WAR
  pWAR: number;            // Pitching WAR
  fWAR: number;            // Fielding WAR
  rWAR: number;            // Baserunning WAR
  gamesPlayed: number;
}

// ============================================
// CONSTANTS - LEGACY STATUS REQUIREMENTS
// ============================================

export const LEGACY_STATUS_REQUIREMENTS = {
  cornerstone: {
    minSeasons: 2,
    minWAR: 5.0,
    minAwards: 0,
    requiresHOF: false,
    fameBonus: 2.0,
  },
  icon: {
    minSeasons: 3,
    minWAR: 10.0,
    minAwards: 1,
    requiresHOF: false,
    fameBonus: 4.0,
  },
  legend: {
    minSeasons: 5,
    minWAR: 18.0,
    minAwards: 2,
    requiresHOF: true,
    fameBonus: 8.0,
  },
} as const;

/**
 * HOF-caliber requirements per spec
 * Player must meet ONE of these criteria:
 * - Career WAR >= 50
 * - 8+ All-Star selections
 * - 3+ MVP/Cy Young awards
 */
export const HOF_CALIBER_REQUIREMENTS = {
  careerWAR: 50,
  allStarSelections: 8,
  mvpCyYoungAwards: 3,
} as const;

/**
 * Fame bonuses for Team MVP / Cornerstone events
 */
export const TEAM_MVP_FAME = {
  TEAM_MVP: 1.5,             // Highest WAR on team; becomes Cornerstone
  RETAINED_CORNERSTONE: 0.5, // Remained team's best player for consecutive season
  NEW_CORNERSTONE: 1.0,      // Took over Cornerstone status from previous holder
} as const;

/**
 * Fame bonuses for Team Ace (best pitcher) events
 */
export const TEAM_ACE_FAME = {
  TEAM_ACE: 1.0,            // Highest pWAR among pitchers on team
  RETAINED_ACE: 0.3,        // Remained team's ace for consecutive season
  NEW_ACE: 0.5,             // Took over ace status from previous holder
} as const;

/**
 * Pitcher season stats for Ace calculation
 */
export interface PitcherSeasonStats {
  playerId: string;
  playerName: string;
  teamId: string;
  pWAR: number;              // Pitching WAR
  wins: number;
  losses: number;
  era: number;
  innings: number;
  strikeouts: number;
  saves: number;
  isPrimaryStarter: boolean; // Has enough starts to qualify
}

// ============================================
// TEAM MVP DETECTION
// ============================================

/**
 * Find the Team MVP (highest WAR player) for each team in a season
 *
 * @param playerWARs - All player WAR data for the season
 * @param previousCornerstones - Map of teamId -> playerId from previous season
 * @returns Map of teamId -> TeamMVP
 */
export function detectTeamMVPs(
  playerWARs: PlayerSeasonWAR[],
  previousCornerstones: Map<string, string>
): Map<string, TeamMVP> {
  const mvpByTeam = new Map<string, TeamMVP>();

  // Group players by team
  const playersByTeam = new Map<string, PlayerSeasonWAR[]>();
  for (const player of playerWARs) {
    const teamPlayers = playersByTeam.get(player.teamId) || [];
    teamPlayers.push(player);
    playersByTeam.set(player.teamId, teamPlayers);
  }

  // Find highest WAR player on each team
  for (const [teamId, teamPlayers] of Array.from(playersByTeam)) {
    if (teamPlayers.length === 0) continue;

    // Sort by total WAR descending
    teamPlayers.sort((a, b) => b.totalWAR - a.totalWAR);

    const topPlayer = teamPlayers[0];
    const previousCornerstoneId = previousCornerstones.get(teamId);

    const isNewCornerstone = previousCornerstoneId !== undefined &&
      previousCornerstoneId !== topPlayer.playerId;

    const wasRetainedCornerstone = previousCornerstoneId === topPlayer.playerId;

    mvpByTeam.set(teamId, {
      playerId: topPlayer.playerId,
      playerName: topPlayer.playerName,
      teamId,
      seasonId: '', // Will be filled in by caller
      war: topPlayer.totalWAR,
      isNewCornerstone,
      wasRetainedCornerstone,
    });
  }

  return mvpByTeam;
}

/**
 * Generate Fame events for Team MVP designations
 *
 * @param mvp - The Team MVP data
 * @param seasonId - Current season ID
 * @returns Array of Fame events to record
 */
export function generateTeamMVPFameEvents(
  mvp: TeamMVP,
  seasonId: string
): FameEvent[] {
  const events: FameEvent[] = [];
  const timestamp = Date.now();

  // Team MVP Fame event
  events.push(createSeasonFameEvent(
    `team-mvp-${mvp.teamId}-${seasonId}-${timestamp}`,
    'TEAM_MVP' as FameEventType,
    mvp.playerId,
    mvp.playerName,
    mvp.teamId,
    TEAM_MVP_FAME.TEAM_MVP,
    true,
    `Team MVP with ${mvp.war.toFixed(1)} WAR`,
    seasonId
  ));

  // Cornerstone status Fame event
  if (mvp.wasRetainedCornerstone) {
    events.push(createSeasonFameEvent(
      `retained-cornerstone-${mvp.teamId}-${seasonId}-${timestamp}`,
      'RETAINED_CORNERSTONE' as FameEventType,
      mvp.playerId,
      mvp.playerName,
      mvp.teamId,
      TEAM_MVP_FAME.RETAINED_CORNERSTONE,
      true,
      'Retained Cornerstone status',
      seasonId
    ));
  } else if (mvp.isNewCornerstone) {
    events.push(createSeasonFameEvent(
      `new-cornerstone-${mvp.teamId}-${seasonId}-${timestamp}`,
      'NEW_CORNERSTONE' as FameEventType,
      mvp.playerId,
      mvp.playerName,
      mvp.teamId,
      TEAM_MVP_FAME.NEW_CORNERSTONE,
      true,
      'Became new team Cornerstone',
      seasonId
    ));
  }

  return events;
}

// ============================================
// TEAM ACE DETECTION
// ============================================

/**
 * Minimum pWAR to qualify as team ace
 * Prevents meaningless "ace" designation on teams with terrible pitching
 */
const MIN_ACE_PWAR = 0.5;

/**
 * Find the Team Ace (highest pWAR pitcher) for each team in a season
 *
 * @param pitcherStats - All pitcher season stats
 * @param previousAces - Map of teamId -> playerId from previous season
 * @returns Map of teamId -> TeamAce
 */
export function detectTeamAces(
  pitcherStats: PitcherSeasonStats[],
  previousAces: Map<string, string>
): Map<string, TeamAce> {
  const aceByTeam = new Map<string, TeamAce>();

  // Group pitchers by team
  const pitchersByTeam = new Map<string, PitcherSeasonStats[]>();
  for (const pitcher of pitcherStats) {
    const teamPitchers = pitchersByTeam.get(pitcher.teamId) || [];
    teamPitchers.push(pitcher);
    pitchersByTeam.set(pitcher.teamId, teamPitchers);
  }

  // Find highest pWAR pitcher on each team
  for (const [teamId, teamPitchers] of Array.from(pitchersByTeam)) {
    if (teamPitchers.length === 0) continue;

    // Sort by pWAR descending
    teamPitchers.sort((a, b) => b.pWAR - a.pWAR);

    const topPitcher = teamPitchers[0];

    // Must meet minimum pWAR to be considered an "ace"
    if (topPitcher.pWAR < MIN_ACE_PWAR) continue;

    const previousAceId = previousAces.get(teamId);

    const isNewAce = previousAceId !== undefined &&
      previousAceId !== topPitcher.playerId;

    const wasRetainedAce = previousAceId === topPitcher.playerId;

    aceByTeam.set(teamId, {
      playerId: topPitcher.playerId,
      playerName: topPitcher.playerName,
      teamId,
      seasonId: '', // Will be filled in by caller
      pWAR: topPitcher.pWAR,
      wins: topPitcher.wins,
      era: topPitcher.era,
      isNewAce,
      wasRetainedAce,
    });
  }

  return aceByTeam;
}

/**
 * Generate Fame events for Team Ace designations
 *
 * @param ace - The Team Ace data
 * @param seasonId - Current season ID
 * @returns Array of Fame events to record
 */
export function generateTeamAceFameEvents(
  ace: TeamAce,
  seasonId: string
): FameEvent[] {
  const events: FameEvent[] = [];
  const timestamp = Date.now();

  // Team Ace Fame event
  events.push(createSeasonFameEvent(
    `team-ace-${ace.teamId}-${seasonId}-${timestamp}`,
    'TEAM_ACE' as FameEventType,
    ace.playerId,
    ace.playerName,
    ace.teamId,
    TEAM_ACE_FAME.TEAM_ACE,
    true,
    `Team Ace with ${ace.pWAR.toFixed(1)} pWAR, ${ace.wins} wins`,
    seasonId
  ));

  // Ace status Fame event
  if (ace.wasRetainedAce) {
    events.push(createSeasonFameEvent(
      `retained-ace-${ace.teamId}-${seasonId}-${timestamp}`,
      'RETAINED_ACE' as FameEventType,
      ace.playerId,
      ace.playerName,
      ace.teamId,
      TEAM_ACE_FAME.RETAINED_ACE,
      true,
      'Retained Ace status',
      seasonId
    ));
  } else if (ace.isNewAce) {
    events.push(createSeasonFameEvent(
      `new-ace-${ace.teamId}-${seasonId}-${timestamp}`,
      'NEW_ACE' as FameEventType,
      ace.playerId,
      ace.playerName,
      ace.teamId,
      TEAM_ACE_FAME.NEW_ACE,
      true,
      'Became new team Ace',
      seasonId
    ));
  }

  return events;
}

// ============================================
// LEGACY STATUS DETECTION
// ============================================

/**
 * Check if a player meets HOF-caliber requirements
 * Per spec: Career WAR >= 50 OR 8+ All-Star OR 3+ MVP/Cy Young
 *
 * @param careerWAR - Player's total career WAR
 * @param allStarSelections - Number of All-Star selections
 * @param mvpCyYoungCount - Number of MVP + Cy Young awards
 */
export function isHofCaliber(
  careerWAR: number,
  allStarSelections: number,
  mvpCyYoungCount: number
): boolean {
  return (
    careerWAR >= HOF_CALIBER_REQUIREMENTS.careerWAR ||
    allStarSelections >= HOF_CALIBER_REQUIREMENTS.allStarSelections ||
    mvpCyYoungCount >= HOF_CALIBER_REQUIREMENTS.mvpCyYoungAwards
  );
}

/**
 * Determine the highest legacy status tier a player qualifies for
 *
 * @param history - Player's accumulated history with the team
 * @returns The highest tier achieved, or null if none
 */
export function determineLegacyTier(history: PlayerTeamHistory): LegacyStatusTier {
  const { seasonsWithTeam, warWithTeam, majorAwards, isHofCaliber: hofCaliber } = history;

  // Check Legend first (highest tier)
  if (
    seasonsWithTeam >= LEGACY_STATUS_REQUIREMENTS.legend.minSeasons &&
    warWithTeam >= LEGACY_STATUS_REQUIREMENTS.legend.minWAR &&
    majorAwards.length >= LEGACY_STATUS_REQUIREMENTS.legend.minAwards &&
    hofCaliber
  ) {
    return 'legend';
  }

  // Check Icon
  if (
    seasonsWithTeam >= LEGACY_STATUS_REQUIREMENTS.icon.minSeasons &&
    warWithTeam >= LEGACY_STATUS_REQUIREMENTS.icon.minWAR &&
    majorAwards.length >= LEGACY_STATUS_REQUIREMENTS.icon.minAwards
  ) {
    return 'icon';
  }

  // Check Cornerstone
  if (
    seasonsWithTeam >= LEGACY_STATUS_REQUIREMENTS.cornerstone.minSeasons &&
    warWithTeam >= LEGACY_STATUS_REQUIREMENTS.cornerstone.minWAR
  ) {
    return 'cornerstone';
  }

  return null;
}

/**
 * Check if a player has achieved a new legacy tier
 *
 * @param history - Player's current history
 * @param previousTier - The tier they had before this season
 * @returns New tier if achieved, null otherwise
 */
export function checkLegacyTierAdvancement(
  history: PlayerTeamHistory,
  previousTier: LegacyStatusTier
): LegacyStatusTier | null {
  const newTier = determineLegacyTier(history);

  // No tier achieved
  if (!newTier) return null;

  // Check if this is an advancement
  const tierOrder: LegacyStatusTier[] = [null, 'cornerstone', 'icon', 'legend'];
  const previousIndex = tierOrder.indexOf(previousTier);
  const newIndex = tierOrder.indexOf(newTier);

  // Only return if it's an advancement
  return newIndex > previousIndex ? newTier : null;
}

/**
 * Generate Fame events for legacy tier advancement
 *
 * @param playerId - Player ID
 * @param playerName - Player name
 * @param teamId - Team ID
 * @param tier - The new tier achieved
 * @param seasonId - Current season ID
 * @param history - Player's team history
 */
export function generateLegacyTierFameEvent(
  playerId: string,
  playerName: string,
  teamId: string,
  tier: LegacyStatusTier,
  seasonId: string,
  history: PlayerTeamHistory
): FameEvent | null {
  if (!tier) return null;

  const requirements = LEGACY_STATUS_REQUIREMENTS[tier];

  const tierNames: Record<NonNullLegacyTier, string> = {
    cornerstone: 'Franchise Cornerstone',
    icon: 'Franchise Icon',
    legend: 'Franchise Legend',
  };

  const eventTypes: Record<NonNullLegacyTier, FameEventType> = {
    cornerstone: 'FRANCHISE_CORNERSTONE' as FameEventType,
    icon: 'FRANCHISE_ICON' as FameEventType,
    legend: 'FRANCHISE_LEGEND' as FameEventType,
  };

  return createSeasonFameEvent(
    `legacy-${tier}-${teamId}-${playerId}-${Date.now()}`,
    eventTypes[tier]!,
    playerId,
    playerName,
    teamId,
    requirements.fameBonus,
    true,
    `Achieved ${tierNames[tier]} status (${history.seasonsWithTeam} seasons, ${history.warWithTeam.toFixed(1)} WAR)`,
    seasonId
  );
}

// ============================================
// PLAYER TEAM HISTORY MANAGEMENT
// ============================================

/**
 * Create a new player team history record
 */
export function createPlayerTeamHistory(
  playerId: string,
  playerName: string,
  teamId: string
): PlayerTeamHistory {
  return {
    playerId,
    playerName,
    teamId,
    seasonsWithTeam: 0,
    warWithTeam: 0,
    majorAwards: [],
    isHofCaliber: false,
    currentLegacyTier: null,
    cornerstoneSeasons: [],
    mvpSeasons: [],
  };
}

/**
 * Update player team history after a season
 *
 * @param history - Current history
 * @param seasonWAR - WAR earned this season
 * @param seasonId - Current season ID
 * @param wasTeamMVP - Whether player was Team MVP
 * @param wasCornerstone - Whether player was Cornerstone
 * @param newAwards - Any major awards earned this season
 * @param careerStats - Career stats for HOF check
 */
export function updatePlayerTeamHistory(
  history: PlayerTeamHistory,
  seasonWAR: number,
  seasonId: string,
  wasTeamMVP: boolean,
  wasCornerstone: boolean,
  newAwards: MajorAward[],
  careerStats: {
    totalWAR: number;
    allStarSelections: number;
    mvpCyYoungCount: number;
  }
): PlayerTeamHistory {
  const updatedHistory = {
    ...history,
    seasonsWithTeam: history.seasonsWithTeam + 1,
    warWithTeam: history.warWithTeam + seasonWAR,
    majorAwards: [...history.majorAwards, ...newAwards],
    mvpSeasons: wasTeamMVP ? [...history.mvpSeasons, seasonId] : history.mvpSeasons,
    cornerstoneSeasons: wasCornerstone
      ? [...history.cornerstoneSeasons, seasonId]
      : history.cornerstoneSeasons,
    isHofCaliber: isHofCaliber(
      careerStats.totalWAR,
      careerStats.allStarSelections,
      careerStats.mvpCyYoungCount
    ),
  };

  // Check for legacy tier advancement
  const previousTier = history.currentLegacyTier;
  const newTier = determineLegacyTier(updatedHistory);

  if (newTier && newTier !== previousTier) {
    updatedHistory.currentLegacyTier = newTier;
    updatedHistory.achievedTierAt = {
      tier: newTier,
      seasonId,
      timestamp: Date.now(),
    };
  }

  return updatedHistory;
}

/**
 * Reset player team history when traded
 * Player starts fresh with new team
 */
export function resetForNewTeam(
  playerId: string,
  playerName: string,
  newTeamId: string
): PlayerTeamHistory {
  return createPlayerTeamHistory(playerId, playerName, newTeamId);
}

// ============================================
// END OF SEASON PROCESSING
// ============================================

/**
 * Result of end-of-season MVP/Cornerstone/Ace processing
 */
export interface EndOfSeasonMVPResult {
  teamMVPs: Map<string, TeamMVP>;
  teamAces: Map<string, TeamAce>;
  fameEvents: FameEvent[];
  updatedHistories: PlayerTeamHistory[];
  newLegacyAchievements: Array<{
    playerId: string;
    playerName: string;
    teamId: string;
    tier: LegacyStatusTier;
  }>;
}

/**
 * Process end-of-season Team MVP / Cornerstone / Ace designations
 *
 * @param playerWARs - All player WAR data for the season
 * @param pitcherStats - All pitcher season stats for Ace detection
 * @param previousCornerstones - Map of teamId -> playerId from previous season
 * @param previousAces - Map of teamId -> playerId from previous season
 * @param playerHistories - Map of playerId-teamId -> PlayerTeamHistory
 * @param seasonId - Current season ID
 * @param playerCareerStats - Map of playerId -> career stats for HOF check
 * @param newAwardsByPlayer - Map of playerId -> major awards earned this season
 */
export function processEndOfSeasonMVP(
  playerWARs: PlayerSeasonWAR[],
  pitcherStats: PitcherSeasonStats[],
  previousCornerstones: Map<string, string>,
  previousAces: Map<string, string>,
  playerHistories: Map<string, PlayerTeamHistory>,
  seasonId: string,
  playerCareerStats: Map<string, {
    totalWAR: number;
    allStarSelections: number;
    mvpCyYoungCount: number;
  }>,
  newAwardsByPlayer: Map<string, MajorAward[]> = new Map()
): EndOfSeasonMVPResult {
  const fameEvents: FameEvent[] = [];
  const updatedHistories: PlayerTeamHistory[] = [];
  const newLegacyAchievements: Array<{
    playerId: string;
    playerName: string;
    teamId: string;
    tier: LegacyStatusTier;
  }> = [];

  // 1. Detect Team MVPs
  const teamMVPs = detectTeamMVPs(playerWARs, previousCornerstones);

  // Fill in season IDs for MVPs
  for (const mvp of Array.from(teamMVPs.values())) {
    mvp.seasonId = seasonId;
  }

  // 2. Detect Team Aces
  const teamAces = detectTeamAces(pitcherStats, previousAces);

  // Fill in season IDs for Aces
  for (const ace of Array.from(teamAces.values())) {
    ace.seasonId = seasonId;
  }

  // 3. Generate MVP Fame events
  for (const mvp of Array.from(teamMVPs.values())) {
    const mvpEvents = generateTeamMVPFameEvents(mvp, seasonId);
    fameEvents.push(...mvpEvents);
  }

  // 4. Generate Ace Fame events
  for (const ace of Array.from(teamAces.values())) {
    const aceEvents = generateTeamAceFameEvents(ace, seasonId);
    fameEvents.push(...aceEvents);
  }

  // 5. Update all player histories and check for legacy advancement
  for (const playerWAR of playerWARs) {
    const historyKey = `${playerWAR.playerId}-${playerWAR.teamId}`;
    let history = playerHistories.get(historyKey);

    // Create new history if this is player's first season with team
    if (!history) {
      history = createPlayerTeamHistory(
        playerWAR.playerId,
        playerWAR.playerName,
        playerWAR.teamId
      );
    }

    const teamMVP = teamMVPs.get(playerWAR.teamId);
    const wasTeamMVP = teamMVP?.playerId === playerWAR.playerId;
    const wasCornerstone = wasTeamMVP; // Cornerstone = Team MVP

    const careerStats = playerCareerStats.get(playerWAR.playerId) || {
      totalWAR: playerWAR.totalWAR,
      allStarSelections: 0,
      mvpCyYoungCount: 0,
    };

    const newAwards = newAwardsByPlayer.get(playerWAR.playerId) || [];

    const previousTier = history.currentLegacyTier;
    const updatedHistory = updatePlayerTeamHistory(
      history,
      playerWAR.totalWAR,
      seasonId,
      wasTeamMVP,
      wasCornerstone,
      newAwards,
      careerStats
    );

    updatedHistories.push(updatedHistory);

    // Check for legacy tier advancement
    const advancedTier = checkLegacyTierAdvancement(
      updatedHistory,
      previousTier
    );

    if (advancedTier) {
      newLegacyAchievements.push({
        playerId: playerWAR.playerId,
        playerName: playerWAR.playerName,
        teamId: playerWAR.teamId,
        tier: advancedTier,
      });

      const legacyEvent = generateLegacyTierFameEvent(
        playerWAR.playerId,
        playerWAR.playerName,
        playerWAR.teamId,
        advancedTier,
        seasonId,
        updatedHistory
      );

      if (legacyEvent) {
        fameEvents.push(legacyEvent);
      }
    }
  }

  return {
    teamMVPs,
    teamAces,
    fameEvents,
    updatedHistories,
    newLegacyAchievements,
  };
}

// ============================================
// DISPLAY HELPERS
// ============================================

/**
 * Get display name for legacy tier
 */
export function getLegacyTierDisplayName(tier: LegacyStatusTier): string {
  if (!tier) return '';

  const names: Record<NonNullLegacyTier, string> = {
    cornerstone: 'Franchise Cornerstone',
    icon: 'Franchise Icon',
    legend: 'Franchise Legend',
  };

  return names[tier as NonNullLegacyTier] || '';
}

/**
 * Get display color for legacy tier
 */
export function getLegacyTierColor(tier: LegacyStatusTier): string {
  if (!tier) return '#6b7280'; // Gray

  const colors: Record<NonNullLegacyTier, string> = {
    cornerstone: '#22c55e', // Green
    icon: '#3b82f6',        // Blue
    legend: '#a855f7',      // Purple
  };

  return colors[tier as NonNullLegacyTier] || '#6b7280';
}

/**
 * Get progress toward next legacy tier
 */
export function getLegacyTierProgress(history: PlayerTeamHistory): {
  currentTier: LegacyStatusTier;
  nextTier: LegacyStatusTier;
  progress: {
    seasons: { current: number; required: number; complete: boolean };
    war: { current: number; required: number; complete: boolean };
    awards: { current: number; required: number; complete: boolean };
    hofCaliber?: { complete: boolean };
  };
} | null {
  const tierOrder: LegacyStatusTier[] = ['cornerstone', 'icon', 'legend'];
  const currentTier = history.currentLegacyTier;

  // Find next tier
  let nextTier: LegacyStatusTier = null;
  if (!currentTier) {
    nextTier = 'cornerstone';
  } else {
    const currentIndex = tierOrder.indexOf(currentTier);
    if (currentIndex < tierOrder.length - 1) {
      nextTier = tierOrder[currentIndex + 1] || null;
    }
  }

  if (!nextTier) {
    return null; // Already at legend tier
  }

  const requirements = LEGACY_STATUS_REQUIREMENTS[nextTier];

  return {
    currentTier,
    nextTier,
    progress: {
      seasons: {
        current: history.seasonsWithTeam,
        required: requirements.minSeasons,
        complete: history.seasonsWithTeam >= requirements.minSeasons,
      },
      war: {
        current: history.warWithTeam,
        required: requirements.minWAR,
        complete: history.warWithTeam >= requirements.minWAR,
      },
      awards: {
        current: history.majorAwards.length,
        required: requirements.minAwards,
        complete: history.majorAwards.length >= requirements.minAwards,
      },
      ...(requirements.requiresHOF
        ? { hofCaliber: { complete: history.isHofCaliber } }
        : {}),
    },
  };
}
