/**
 * Season End Processor
 *
 * Coordinates all end-of-season processing:
 * - Team MVP / Cornerstone detection
 * - Team Ace detection
 * - Career milestone aggregation
 * - Legacy tier advancement
 * - Fame event generation
 *
 * Per MILESTONE_SYSTEM_SPEC.md and OFFSEASON_SYSTEM_SPEC.md
 */

import type { FameEvent } from '../types/game';
import type { CareerStats } from './careerStorage';
import type { PlayerSeasonBatting, PlayerSeasonPitching, SeasonMetadata } from './seasonStorage';
import {
  getSeasonBattingStats,
  getSeasonPitchingStats,
} from './seasonStorage';
import {
  processEndOfSeasonMVP,
  type PlayerSeasonWAR,
  type PitcherSeasonStats,
  type PlayerTeamHistory,
  type MajorAward,
  type TeamMVP,
  type TeamAce,
  type LegacyStatusTier,
  type EndOfSeasonMVPResult,
} from './teamMVP';
import {
  aggregateGameToCareer,
  getCareerStats,
  type SeasonStatsForCareer,
} from './careerStorage';

// ============================================
// TYPES
// ============================================

/**
 * Previous season state needed for continuity
 */
export interface PreviousSeasonState {
  cornerstones: Map<string, string>;  // teamId -> playerId
  aces: Map<string, string>;          // teamId -> playerId
  playerHistories: Map<string, PlayerTeamHistory>;  // playerId-teamId -> history
}

/**
 * Result of season-end processing
 */
export interface SeasonEndResult {
  seasonId: string;

  // Team designations
  teamMVPs: Map<string, TeamMVP>;
  teamAces: Map<string, TeamAce>;

  // Career updates
  careerUpdates: Array<{
    playerId: string;
    playerName: string;
    previousCareerStats: CareerStats | null;
    newCareerStats: CareerStats;
    careerMilestones: FameEvent[];
  }>;

  // Legacy achievements
  newLegacyAchievements: Array<{
    playerId: string;
    playerName: string;
    teamId: string;
    tier: LegacyStatusTier;
  }>;

  // All fame events generated
  fameEvents: FameEvent[];

  // State to carry forward
  newSeasonState: PreviousSeasonState;

  // Processing metadata
  processedAt: number;
  playersProcessed: number;
  teamsProcessed: number;
}

/**
 * Configuration for season end processing
 */
export interface SeasonEndConfig {
  seasonId: string;
  previousSeasonState: PreviousSeasonState;

  // Career stats lookup (playerId -> career stats)
  playerCareerStats: Map<string, {
    totalWAR: number;
    allStarSelections: number;
    mvpCyYoungCount: number;
  }>;

  // Awards earned this season
  seasonAwards: Map<string, MajorAward[]>;  // playerId -> awards
}

// ============================================
// WAR CALCULATION HELPERS
// ============================================

/**
 * Calculate batting WAR from season stats
 * Simplified calculation - full implementation in BWAR_CALCULATION_SPEC.md
 */
function calculateBattingWAR(batting: PlayerSeasonBatting): number {
  // Simplified wOBA-based calculation
  // Full implementation would use league context from ADAPTIVE_STANDARDS_ENGINE_SPEC.md

  const { pa, walks, hitByPitch, singles, doubles, triples, homeRuns, ab, sacFlies } = batting;

  if (pa === 0) return 0;

  // wOBA weights (simplified)
  const wOBA = (
    0.69 * walks +
    0.72 * hitByPitch +
    0.88 * singles +
    1.27 * doubles +
    1.62 * triples +
    2.10 * homeRuns
  ) / (ab + walks + sacFlies + hitByPitch);

  // Convert to runs above average (simplified)
  const wRAA = ((wOBA - 0.320) / 1.25) * pa;

  // Convert to WAR (10 runs = 1 WAR)
  const bWAR = wRAA / 10;

  return Math.round(bWAR * 100) / 100;
}

/**
 * Calculate pitching WAR from season stats
 * Simplified FIP-based calculation - full implementation in PWAR_CALCULATION_SPEC.md
 */
function calculatePitchingWAR(pitching: PlayerSeasonPitching): number {
  const ip = pitching.outsRecorded / 3;

  if (ip === 0) return 0;

  // FIP calculation
  const fip = ((13 * pitching.homeRunsAllowed) + (3 * (pitching.walksAllowed + pitching.hitBatters)) - (2 * pitching.strikeouts)) / ip + 3.10;

  // Convert to runs below average (simplified)
  const runsAboveAvg = (4.00 - fip) * ip / 9;

  // Convert to WAR (10 runs = 1 WAR)
  const pWAR = runsAboveAvg / 10;

  return Math.round(pWAR * 100) / 100;
}

/**
 * Calculate fielding WAR placeholder
 * Full implementation in FWAR_CALCULATION_SPEC.md
 */
function calculateFieldingWAR(_batting: PlayerSeasonBatting): number {
  // Placeholder - requires per-play OAA tracking
  // For now, return a small value based on games played
  return 0;
}

/**
 * Calculate baserunning WAR placeholder
 * Full implementation in RWAR_CALCULATION_SPEC.md
 */
function calculateBaserunningWAR(batting: PlayerSeasonBatting): number {
  // Placeholder - simplified based on SB/CS
  const { stolenBases, caughtStealing } = batting;

  // wSB = 0.2 * SB - 0.4 * CS (simplified)
  const wSB = 0.2 * stolenBases - 0.4 * caughtStealing;

  // Convert to WAR
  return Math.round((wSB / 10) * 100) / 100;
}

// ============================================
// DATA TRANSFORMATION
// ============================================

/**
 * Convert season batting stats to PlayerSeasonWAR format for MVP detection
 */
function convertToPlayerSeasonWAR(
  batting: PlayerSeasonBatting,
  pitching: PlayerSeasonPitching | null
): PlayerSeasonWAR {
  const bWAR = calculateBattingWAR(batting);
  const pWAR = pitching ? calculatePitchingWAR(pitching) : 0;
  const fWAR = calculateFieldingWAR(batting);
  const rWAR = calculateBaserunningWAR(batting);

  return {
    playerId: batting.playerId,
    playerName: batting.playerName,
    teamId: batting.teamId,
    totalWAR: bWAR + pWAR + fWAR + rWAR,
    bWAR,
    pWAR,
    fWAR,
    rWAR,
    gamesPlayed: batting.games,
  };
}

/**
 * Convert season pitching stats to PitcherSeasonStats format for Ace detection
 */
function convertToPitcherSeasonStats(pitching: PlayerSeasonPitching): PitcherSeasonStats {
  const ip = pitching.outsRecorded / 3;
  const era = ip > 0 ? (pitching.earnedRuns / ip) * 9 : 0;

  return {
    playerId: pitching.playerId,
    playerName: pitching.playerName,
    teamId: pitching.teamId,
    pWAR: calculatePitchingWAR(pitching),
    wins: pitching.wins,
    losses: pitching.losses,
    era: Math.round(era * 100) / 100,
    innings: ip,
    strikeouts: pitching.strikeouts,
    saves: pitching.saves,
    isPrimaryStarter: pitching.gamesStarted >= 10, // Simplified qualification
  };
}

/**
 * Convert season stats to career aggregation format
 */
function convertToSeasonStatsForCareer(
  batting: PlayerSeasonBatting,
  pitching: PlayerSeasonPitching | null
): SeasonStatsForCareer {
  const bWAR = calculateBattingWAR(batting);
  const fWAR = calculateFieldingWAR(batting);
  const rWAR = calculateBaserunningWAR(batting);

  const result: SeasonStatsForCareer = {
    playerId: batting.playerId,
    playerName: batting.playerName,
    teamId: batting.teamId,
    seasonId: batting.seasonId,
    batting: {
      games: batting.games,
      pa: batting.pa,
      ab: batting.ab,
      hits: batting.hits,
      singles: batting.singles,
      doubles: batting.doubles,
      triples: batting.triples,
      homeRuns: batting.homeRuns,
      rbi: batting.rbi,
      runs: batting.runs,
      walks: batting.walks,
      strikeouts: batting.strikeouts,
      hitByPitch: batting.hitByPitch,
      sacFlies: batting.sacFlies,
      sacBunts: batting.sacBunts,
      stolenBases: batting.stolenBases,
      caughtStealing: batting.caughtStealing,
      gidp: batting.gidp,
      bWAR,
      fWAR,
      rWAR,
      fameBonuses: batting.fameBonuses,
      fameBoners: batting.fameBoners,
    },
  };

  if (pitching && pitching.games > 0) {
    const pWAR = calculatePitchingWAR(pitching);
    result.pitching = {
      games: pitching.games,
      gamesStarted: pitching.gamesStarted,
      outsRecorded: pitching.outsRecorded,
      hitsAllowed: pitching.hitsAllowed,
      runsAllowed: pitching.runsAllowed,
      earnedRuns: pitching.earnedRuns,
      walksAllowed: pitching.walksAllowed,
      strikeouts: pitching.strikeouts,
      homeRunsAllowed: pitching.homeRunsAllowed,
      hitBatters: pitching.hitBatters,
      wildPitches: pitching.wildPitches,
      wins: pitching.wins,
      losses: pitching.losses,
      saves: pitching.saves,
      holds: pitching.holds,
      blownSaves: pitching.blownSaves,
      qualityStarts: pitching.qualityStarts,
      completeGames: pitching.completeGames,
      shutouts: pitching.shutouts,
      noHitters: pitching.noHitters,
      perfectGames: pitching.perfectGames,
      pWAR,
      fameBonuses: pitching.fameBonuses,
      fameBoners: pitching.fameBoners,
    };
  }

  return result;
}

// ============================================
// MAIN PROCESSING FUNCTION
// ============================================

/**
 * Process all end-of-season calculations and updates
 *
 * This is the main entry point for season-end processing.
 * Call this when the season is complete.
 */
export async function processSeasonEnd(
  config: SeasonEndConfig
): Promise<SeasonEndResult> {
  const { seasonId, previousSeasonState, playerCareerStats, seasonAwards } = config;

  console.log(`[SeasonEnd] Starting season-end processing for ${seasonId}`);
  const startTime = Date.now();

  // 1. Load all season stats
  const [battingStats, pitchingStats] = await Promise.all([
    getSeasonBattingStats(seasonId),
    getSeasonPitchingStats(seasonId),
  ]);

  console.log(`[SeasonEnd] Loaded ${battingStats.length} batters, ${pitchingStats.length} pitchers`);

  // Create lookup maps
  const pitchingByPlayer = new Map(
    pitchingStats.map(p => [p.playerId, p])
  );

  // 2. Convert to WAR format
  const playerWARs: PlayerSeasonWAR[] = battingStats.map(batting =>
    convertToPlayerSeasonWAR(batting, pitchingByPlayer.get(batting.playerId) || null)
  );

  // 3. Convert pitching stats for Ace detection
  const pitcherStatsForAce: PitcherSeasonStats[] = pitchingStats.map(
    convertToPitcherSeasonStats
  );

  // 4. Process Team MVP / Cornerstone / Ace
  const mvpResult: EndOfSeasonMVPResult = processEndOfSeasonMVP(
    playerWARs,
    pitcherStatsForAce,
    previousSeasonState.cornerstones,
    previousSeasonState.aces,
    previousSeasonState.playerHistories,
    seasonId,
    playerCareerStats,
    seasonAwards
  );

  console.log(`[SeasonEnd] MVP/Ace detection complete: ${mvpResult.teamMVPs.size} MVPs, ${mvpResult.teamAces.size} Aces`);

  // 5. Aggregate to career stats and check career milestones
  const careerUpdates: SeasonEndResult['careerUpdates'] = [];

  for (const batting of battingStats) {
    const pitching = pitchingByPlayer.get(batting.playerId) || null;
    const seasonStats = convertToSeasonStatsForCareer(batting, pitching);

    // Get previous career stats
    const previousCareerStats = await getCareerStats(batting.playerId);

    // Aggregate season to career
    const aggregationResult = await aggregateGameToCareer(
      batting.playerId,
      batting.playerName,
      batting.teamId,
      seasonStats,
      {
        enableCareerMilestones: true,
        enableFranchiseFirsts: true,
        enableFranchiseLeaders: true,
      }
    );

    if (aggregationResult) {
      careerUpdates.push({
        playerId: batting.playerId,
        playerName: batting.playerName,
        previousCareerStats,
        newCareerStats: aggregationResult.current,
        careerMilestones: aggregationResult.fameEvents,
      });
    }
  }

  console.log(`[SeasonEnd] Career aggregation complete: ${careerUpdates.length} players updated`);

  // 6. Collect all fame events
  const allFameEvents: FameEvent[] = [
    ...mvpResult.fameEvents,
    ...careerUpdates.flatMap(u => u.careerMilestones),
  ];

  // 7. Build new season state for next season
  const newCornerstones = new Map<string, string>();
  for (const [teamId, mvp] of Array.from(mvpResult.teamMVPs)) {
    newCornerstones.set(teamId, mvp.playerId);
  }

  const newAces = new Map<string, string>();
  for (const [teamId, ace] of Array.from(mvpResult.teamAces)) {
    newAces.set(teamId, ace.playerId);
  }

  const newPlayerHistories = new Map<string, PlayerTeamHistory>();
  for (const history of mvpResult.updatedHistories) {
    const key = `${history.playerId}-${history.teamId}`;
    newPlayerHistories.set(key, history);
  }

  // 8. Get unique teams processed
  const teamsProcessed = new Set(battingStats.map(b => b.teamId)).size;

  const result: SeasonEndResult = {
    seasonId,
    teamMVPs: mvpResult.teamMVPs,
    teamAces: mvpResult.teamAces,
    careerUpdates,
    newLegacyAchievements: mvpResult.newLegacyAchievements,
    fameEvents: allFameEvents,
    newSeasonState: {
      cornerstones: newCornerstones,
      aces: newAces,
      playerHistories: newPlayerHistories,
    },
    processedAt: Date.now(),
    playersProcessed: battingStats.length,
    teamsProcessed,
  };

  const duration = Date.now() - startTime;
  console.log(`[SeasonEnd] Processing complete in ${duration}ms`);
  console.log(`[SeasonEnd] Generated ${allFameEvents.length} fame events`);
  console.log(`[SeasonEnd] ${mvpResult.newLegacyAchievements.length} new legacy achievements`);

  return result;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Create empty previous season state (for first season)
 */
export function createEmptyPreviousSeasonState(): PreviousSeasonState {
  return {
    cornerstones: new Map(),
    aces: new Map(),
    playerHistories: new Map(),
  };
}

/**
 * Serialize season state for storage
 */
export function serializeSeasonState(state: PreviousSeasonState): string {
  return JSON.stringify({
    cornerstones: Array.from(state.cornerstones.entries()),
    aces: Array.from(state.aces.entries()),
    playerHistories: Array.from(state.playerHistories.entries()),
  });
}

/**
 * Deserialize season state from storage
 */
export function deserializeSeasonState(json: string): PreviousSeasonState {
  const data = JSON.parse(json);
  return {
    cornerstones: new Map(data.cornerstones),
    aces: new Map(data.aces),
    playerHistories: new Map(data.playerHistories),
  };
}

/**
 * Get summary of season-end results for display
 */
export function getSeasonEndSummary(result: SeasonEndResult): string {
  const lines: string[] = [
    `Season ${result.seasonId} End Processing Summary`,
    `=========================================`,
    ``,
    `Processed: ${result.playersProcessed} players across ${result.teamsProcessed} teams`,
    ``,
    `Team MVPs:`,
  ];

  for (const [teamId, mvp] of Array.from(result.teamMVPs)) {
    lines.push(`  ${teamId}: ${mvp.playerName} (${mvp.war.toFixed(1)} WAR)`);
  }

  lines.push(``);
  lines.push(`Team Aces:`);

  for (const [teamId, ace] of Array.from(result.teamAces)) {
    lines.push(`  ${teamId}: ${ace.playerName} (${ace.pWAR.toFixed(1)} pWAR, ${ace.wins}W, ${ace.era.toFixed(2)} ERA)`);
  }

  if (result.newLegacyAchievements.length > 0) {
    lines.push(``);
    lines.push(`New Legacy Achievements:`);
    for (const achievement of result.newLegacyAchievements) {
      lines.push(`  ${achievement.playerName}: ${achievement.tier} (${achievement.teamId})`);
    }
  }

  lines.push(``);
  lines.push(`Total Fame Events Generated: ${result.fameEvents.length}`);

  return lines.join('\n');
}
