/**
 * Season Aggregator
 * Per STAT_TRACKING_ARCHITECTURE_SPEC.md - Phase 3: Season Stats Aggregation
 *
 * Aggregates completed game stats into season totals.
 * Now integrates with milestone detection (MILESTONE_SYSTEM_SPEC.md)
 */

import type { PersistedGameState } from './gameStorage';
import {
  getOrCreateBattingStats,
  getOrCreatePitchingStats,
  getOrCreateFieldingStats,
  updateBattingStats,
  updatePitchingStats,
  updateFieldingStats,
  incrementSeasonGames,
  getOrCreateSeason,
  type PlayerSeasonBatting,
  type PlayerSeasonPitching,
  type PlayerSeasonFielding,
} from './seasonStorage';
import {
  aggregateGameWithMilestones,
  type MilestoneAggregationResult,
} from './milestoneAggregator';
import type { MilestoneConfig } from './milestoneDetector';

// Default season ID if none is set
const DEFAULT_SEASON_ID = 'season-1';
const DEFAULT_SEASON_NUMBER = 1;
const DEFAULT_SEASON_NAME = 'Season 1';
const DEFAULT_TOTAL_GAMES = 162;

/**
 * Result returned from game aggregation including milestone detection
 */
export interface GameAggregationResult {
  milestones: MilestoneAggregationResult | null;
  success: boolean;
  error?: string;
}

/**
 * Options for game aggregation
 */
export interface GameAggregationOptions {
  seasonId?: string;
  detectMilestones?: boolean;
  milestoneConfig?: MilestoneConfig;
  // Franchise tracking options
  franchiseId?: string;           // Required for franchise firsts/leaders
  currentGame?: number;           // Game number in season (for leader tracking activation)
  currentSeason?: number;         // Season number (1 = first season)
}

/**
 * Aggregate a completed game's stats into the season totals
 * Now includes milestone detection for season and career stats
 *
 * @param gameState - The completed game state to aggregate
 * @param options - Aggregation options including season, milestone, and franchise settings
 */
export async function aggregateGameToSeason(
  gameState: PersistedGameState,
  options: GameAggregationOptions = {}
): Promise<GameAggregationResult> {
  const {
    seasonId = DEFAULT_SEASON_ID,
    detectMilestones = true,
    milestoneConfig,
    franchiseId,
    currentGame,
    currentSeason,
  } = options;
  try {
    // Ensure season exists
    await getOrCreateSeason(seasonId, DEFAULT_SEASON_NUMBER, DEFAULT_SEASON_NAME, DEFAULT_TOTAL_GAMES);

    // Aggregate batting stats for all players
    await aggregateBattingStats(gameState, seasonId);

    // Aggregate pitching stats for all pitchers
    await aggregatePitchingStats(gameState, seasonId);

    // Aggregate fielding stats for all players
    await aggregateFieldingStats(gameState, seasonId);

    // Aggregate Fame events from gameplay
    await aggregateFameEvents(gameState, seasonId);

    // Increment season game count
    await incrementSeasonGames(seasonId);

    // Run milestone detection if enabled
    let milestones: MilestoneAggregationResult | null = null;
    if (detectMilestones) {
      milestones = await aggregateGameWithMilestones(
        gameState,
        seasonId,
        milestoneConfig,
        { franchiseId, currentGame, currentSeason }
      );

      // Log milestone achievements for debugging/analytics
      if (milestones.seasonMilestones.length > 0 || milestones.careerMilestones.length > 0) {
        console.log(
          `[Milestones] Game ${gameState.gameId}: ` +
          `${milestones.seasonMilestones.length} season, ` +
          `${milestones.careerMilestones.length} career milestones detected`
        );
      }

      // Log franchise events
      if (milestones.franchiseFirsts.length > 0 || milestones.franchiseLeaderEvents.length > 0) {
        console.log(
          `[Franchise] Game ${gameState.gameId}: ` +
          `${milestones.franchiseFirsts.length} firsts, ` +
          `${milestones.franchiseLeaderEvents.length} leader changes`
        );
      }
    }

    return {
      milestones,
      success: true,
    };
  } catch (error) {
    console.error('[SeasonAggregator] Failed to aggregate game:', error);
    return {
      milestones: null,
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during aggregation',
    };
  }
}

/**
 * Aggregate batting stats from a game
 */
async function aggregateBattingStats(
  gameState: PersistedGameState,
  seasonId: string
): Promise<void> {
  for (const [playerId, gameStats] of Object.entries(gameState.playerStats)) {
    // Player name and team carried through from PersistedGameState
    const playerName = gameStats.playerName || playerId;
    const teamId = gameStats.teamId || gameState.awayTeamId;

    const seasonStats = await getOrCreateBattingStats(seasonId, playerId, playerName, teamId);

    // Aggregate counting stats
    const updated: PlayerSeasonBatting = {
      ...seasonStats,
      games: seasonStats.games + 1,
      pa: seasonStats.pa + gameStats.pa,
      ab: seasonStats.ab + gameStats.ab,
      hits: seasonStats.hits + gameStats.h,
      singles: seasonStats.singles + gameStats.singles,
      doubles: seasonStats.doubles + gameStats.doubles,
      triples: seasonStats.triples + gameStats.triples,
      homeRuns: seasonStats.homeRuns + gameStats.hr,
      rbi: seasonStats.rbi + gameStats.rbi,
      runs: seasonStats.runs + gameStats.r,
      walks: seasonStats.walks + gameStats.bb,
      strikeouts: seasonStats.strikeouts + gameStats.k,
      hitByPitch: seasonStats.hitByPitch + (gameStats.hbp || 0),    // MAJ-11
      sacFlies: seasonStats.sacFlies + (gameStats.sf || 0),          // MAJ-11
      sacBunts: seasonStats.sacBunts + (gameStats.sh || 0),          // MAJ-11
      stolenBases: seasonStats.stolenBases + gameStats.sb,
      caughtStealing: seasonStats.caughtStealing + gameStats.cs,
      gidp: seasonStats.gidp + (gameStats.gidp || 0),               // MAJ-11
    };

    await updateBattingStats(updated);
  }
}

/**
 * Aggregate pitching stats from a game
 */
async function aggregatePitchingStats(
  gameState: PersistedGameState,
  seasonId: string
): Promise<void> {
  for (const pitcherStats of gameState.pitcherGameStats) {
    const seasonStats = await getOrCreatePitchingStats(
      seasonId,
      pitcherStats.pitcherId,
      pitcherStats.pitcherName,
      pitcherStats.teamId
    );

    // Check for achievements
    const isQualityStart = pitcherStats.isStarter &&
                           pitcherStats.outsRecorded >= 18 &&  // 6+ IP
                           pitcherStats.earnedRuns <= 3;

    const isCompleteGame = pitcherStats.isStarter &&
                           pitcherStats.outsRecorded >= 27;  // 9+ IP

    const isShutout = isCompleteGame && pitcherStats.runsAllowed === 0;

    const isNoHitter = isCompleteGame && pitcherStats.hitsAllowed === 0;

    const isPerfectGame = isNoHitter &&
                          pitcherStats.walksAllowed === 0 &&
                          pitcherStats.hitBatters === 0 &&
                          pitcherStats.basesReachedViaError === 0;

    // Aggregate counting stats
    const updated: PlayerSeasonPitching = {
      ...seasonStats,
      games: seasonStats.games + 1,
      gamesStarted: seasonStats.gamesStarted + (pitcherStats.isStarter ? 1 : 0),
      outsRecorded: seasonStats.outsRecorded + pitcherStats.outsRecorded,
      hitsAllowed: seasonStats.hitsAllowed + pitcherStats.hitsAllowed,
      runsAllowed: seasonStats.runsAllowed + pitcherStats.runsAllowed,
      earnedRuns: seasonStats.earnedRuns + pitcherStats.earnedRuns,
      walksAllowed: seasonStats.walksAllowed + pitcherStats.walksAllowed,
      strikeouts: seasonStats.strikeouts + pitcherStats.strikeoutsThrown,
      homeRunsAllowed: seasonStats.homeRunsAllowed + pitcherStats.homeRunsAllowed,
      hitBatters: seasonStats.hitBatters + pitcherStats.hitBatters,
      wildPitches: seasonStats.wildPitches + pitcherStats.wildPitches,
      // Achievements
      qualityStarts: seasonStats.qualityStarts + (isQualityStart ? 1 : 0),
      completeGames: seasonStats.completeGames + (isCompleteGame ? 1 : 0),
      shutouts: seasonStats.shutouts + (isShutout ? 1 : 0),
      noHitters: seasonStats.noHitters + (isNoHitter ? 1 : 0),
      perfectGames: seasonStats.perfectGames + (isPerfectGame ? 1 : 0),
      // MAJ-08: Pitcher decisions (W/L/SV/H/BS)
      wins: seasonStats.wins + (pitcherStats.decision === 'W' ? 1 : 0),
      losses: seasonStats.losses + (pitcherStats.decision === 'L' ? 1 : 0),
      saves: seasonStats.saves + (pitcherStats.save ? 1 : 0),
      holds: seasonStats.holds + (pitcherStats.hold ? 1 : 0),
      blownSaves: seasonStats.blownSaves + (pitcherStats.blownSave ? 1 : 0),
    };

    await updatePitchingStats(updated);
  }
}

/**
 * Aggregate fielding stats from a game
 */
async function aggregateFieldingStats(
  gameState: PersistedGameState,
  seasonId: string
): Promise<void> {
  for (const [playerId, gameStats] of Object.entries(gameState.playerStats)) {
    // Player name and team carried through from PersistedGameState
    const playerName = gameStats.playerName || playerId;
    const teamId = gameStats.teamId || gameState.awayTeamId;

    const seasonStats = await getOrCreateFieldingStats(seasonId, playerId, playerName, teamId);

    // Aggregate counting stats
    const updated: PlayerSeasonFielding = {
      ...seasonStats,
      games: seasonStats.games + 1,
      putouts: seasonStats.putouts + gameStats.putouts,
      assists: seasonStats.assists + gameStats.assists,
      errors: seasonStats.errors + gameStats.fieldingErrors,
      // Note: DP, position-specific stats would need more tracking
    };

    await updateFieldingStats(updated);
  }
}

/**
 * Aggregate Fame events from a game
 */
async function aggregateFameEvents(
  gameState: PersistedGameState,
  seasonId: string
): Promise<void> {
  // Group Fame events by player
  const playerFame = new Map<string, { bonuses: number; boners: number }>();

  for (const event of gameState.fameEvents) {
    const current = playerFame.get(event.playerId) || { bonuses: 0, boners: 0 };

    if (event.fameType === 'bonus') {
      current.bonuses += event.fameValue;
    } else {
      current.boners += Math.abs(event.fameValue);
    }

    playerFame.set(event.playerId, current);
  }

  // Update season stats for each player with Fame events
  for (const [playerId, fame] of playerFame) {
    // Update batting stats (most players are batters)
    try {
      const battingStats = await getOrCreateBattingStats(
        seasonId,
        playerId,
        playerId,  // Placeholder name
        gameState.awayTeamId  // Placeholder team
      );

      await updateBattingStats({
        ...battingStats,
        fameBonuses: battingStats.fameBonuses + fame.bonuses,
        fameBoners: battingStats.fameBoners + fame.boners,
        fameNet: battingStats.fameNet + fame.bonuses - fame.boners,
      });
    } catch (err) {
      console.error(`Failed to update Fame for player ${playerId}:`, err);
    }
  }
}

/**
 * Get current season ID (or create default)
 */
export async function getCurrentSeasonId(): Promise<string> {
  // In a full implementation, this would check for active season
  // For now, return the default
  await getOrCreateSeason(DEFAULT_SEASON_ID, DEFAULT_SEASON_NUMBER, DEFAULT_SEASON_NAME, DEFAULT_TOTAL_GAMES);
  return DEFAULT_SEASON_ID;
}

/**
 * Aggregate game and get just the milestone results
 * Convenience function when you only care about milestones
 */
export async function getGameMilestones(
  gameState: PersistedGameState,
  seasonId: string = DEFAULT_SEASON_ID,
  milestoneConfig?: MilestoneConfig
): Promise<MilestoneAggregationResult> {
  return aggregateGameWithMilestones(gameState, seasonId, milestoneConfig);
}

// Re-export milestone types for consumers
export type { MilestoneAggregationResult, MilestoneConfig };
