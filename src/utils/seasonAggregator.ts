/**
 * Season Aggregator
 * Per STAT_TRACKING_ARCHITECTURE_SPEC.md - Phase 3: Season Stats Aggregation
 *
 * Aggregates completed game stats into season totals.
 * Now integrates with milestone detection (MILESTONE_SYSTEM_SPEC.md)
 */

import type { PersistedGameState } from './gameStorage';
import { getGameFieldingEvents, type FieldingEvent } from './eventLog';
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
import { SMB4_DEFAULT_GAMES, type MilestoneConfig } from './milestoneDetector';
import {
  MLB_BASELINE_GAMES,
  MLB_BASELINE_INNINGS,
  MIN_QUALITY_START_OUTS,
  scaledGameInningsThreshold,
} from './franchiseAdaptiveStandards';

// Default season ID if none is set
const DEFAULT_SEASON_ID = 'season-1';
const DEFAULT_SEASON_NUMBER = 1;
const DEFAULT_SEASON_NAME = 'Season 1';
const DEFAULT_TOTAL_GAMES = MLB_BASELINE_GAMES;

export interface PitchingAchievementContext {
  scheduledInnings?: number;
}

export function getScaledQualityStartThresholds(
  scheduledInnings: number = MLB_BASELINE_INNINGS,
): { outsRecorded: number; earnedRuns: number } {
  const innings = Number.isFinite(scheduledInnings) && scheduledInnings > 0
    ? scheduledInnings
    : MLB_BASELINE_INNINGS;

  return {
    outsRecorded: Math.max(MIN_QUALITY_START_OUTS, scaledGameInningsThreshold(18, innings)),
    earnedRuns: Math.max(1, scaledGameInningsThreshold(3, innings)),
  };
}

export function isQualityStartByContext(
  pitcherStats: Pick<PersistedGameState['pitcherGameStats'][number], 'isStarter' | 'outsRecorded' | 'earnedRuns'>,
  context: PitchingAchievementContext = {},
): boolean {
  const thresholds = getScaledQualityStartThresholds(context.scheduledInnings);
  return pitcherStats.isStarter &&
    pitcherStats.outsRecorded >= thresholds.outsRecorded &&
    pitcherStats.earnedRuns <= thresholds.earnedRuns;
}

export function isCompleteGameByContext(
  pitcherStats: Pick<PersistedGameState['pitcherGameStats'][number], 'isStarter' | 'outsRecorded'>,
  context: PitchingAchievementContext = {},
): boolean {
  const scheduledInnings = Number.isFinite(context.scheduledInnings) && context.scheduledInnings && context.scheduledInnings > 0
    ? context.scheduledInnings
    : MLB_BASELINE_INNINGS;
  return pitcherStats.isStarter && pitcherStats.outsRecorded >= scheduledInnings * 3;
}

function resolveFamePlayerMetadata(
  gameState: PersistedGameState,
  playerId: string,
  fallbackName?: string,
  fallbackTeamId?: string
): { playerName: string; teamId: string } {
  const battingStats = gameState.playerStats[playerId];
  if (battingStats) {
    return {
      playerName: battingStats.playerName || fallbackName || playerId,
      teamId: battingStats.teamId || fallbackTeamId || gameState.awayTeamId,
    };
  }

  const pitchingStats = gameState.pitcherGameStats.find((pitcher) => pitcher.pitcherId === playerId);
  if (pitchingStats) {
    return {
      playerName: pitchingStats.pitcherName || fallbackName || playerId,
      teamId: pitchingStats.teamId || fallbackTeamId || gameState.awayTeamId,
    };
  }

  return {
    playerName: fallbackName || playerId,
    teamId: fallbackTeamId || gameState.awayTeamId,
  };
}

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
  seasonNumber?: number;
  seasonName?: string;
  seasonTotalGames?: number;
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
    seasonNumber = DEFAULT_SEASON_NUMBER,
    seasonName = DEFAULT_SEASON_NAME,
    seasonTotalGames,
  } = options;
  try {
    // Ensure season exists
    await getOrCreateSeason(
      seasonId,
      seasonNumber,
      seasonName,
      seasonTotalGames ?? milestoneConfig?.gamesPerSeason ?? DEFAULT_TOTAL_GAMES,
    );

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
      const resolvedMilestoneConfig =
        milestoneConfig ??
        (gameState.totalInnings
          ? {
              gamesPerSeason: SMB4_DEFAULT_GAMES,
              inningsPerGame: gameState.totalInnings,
            }
          : undefined);
      milestones = await aggregateGameWithMilestones(
        gameState,
        seasonId,
        resolvedMilestoneConfig,
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
      d3kOutcomes: (seasonStats.d3kOutcomes ?? 0) + (gameStats.d3kOutcomes ?? 0),
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
  const pitchingWpaByPlayerId = new Map<string, number>();
  for (const playerWpa of gameState.playerWpaTotals ?? []) {
    if (Number.isFinite(playerWpa.pitchingWpa)) {
      pitchingWpaByPlayerId.set(playerWpa.playerId, playerWpa.pitchingWpa);
    }
  }

  for (const pitcherStats of gameState.pitcherGameStats) {
    const seasonStats = await getOrCreatePitchingStats(
      seasonId,
      pitcherStats.pitcherId,
      pitcherStats.pitcherName,
      pitcherStats.teamId
    );

    // Check for achievements
    const achievementContext = { scheduledInnings: gameState.totalInnings };
    const isQualityStart = isQualityStartByContext(pitcherStats, achievementContext);

    const isCompleteGame = isCompleteGameByContext(pitcherStats, achievementContext);

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
      comebackerInjuries: (seasonStats.comebackerInjuries ?? 0) + (pitcherStats.comebackerInjuries ?? 0),
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
      pitchingWpa: (seasonStats.pitchingWpa ?? 0) + (pitchingWpaByPlayerId.get(pitcherStats.pitcherId) ?? 0),
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
  const fieldingEvents = await getFieldingEventsForAggregation(gameState);
  const ofMap = new Map<string, { assists: number; held: number }>();

  for (const fieldingEvent of fieldingEvents) {
    const playerArmEvents = ofMap.get(fieldingEvent.playerId) ?? { assists: 0, held: 0 };
    if (fieldingEvent.playType === 'outfield_assist') {
      playerArmEvents.assists += 1;
    }
    if (isBaserunnerHeldEvent(fieldingEvent)) {
      playerArmEvents.held += 1;
    }
    ofMap.set(fieldingEvent.playerId, playerArmEvents);
  }

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
      divingCatches: (seasonStats.divingCatches ?? 0) + (gameStats.divingCatches ?? 0),
      robberies: (seasonStats.robberies ?? 0) + (gameStats.robberies ?? 0),
      nutshots: (seasonStats.nutshots ?? 0) + (gameStats.nutshots ?? 0),
      outfieldAssists: (seasonStats.outfieldAssists ?? 0) + (ofMap.get(playerId)?.assists ?? 0),
      baserunnersHeld: (seasonStats.baserunnersHeld ?? 0) + (ofMap.get(playerId)?.held ?? 0),
      // Note: DP, position-specific stats would need more tracking
    };

    await updateFieldingStats(updated);
  }
}

async function getFieldingEventsForAggregation(gameState: PersistedGameState): Promise<FieldingEvent[]> {
  const fieldingEventSource = gameState as PersistedGameState & { fieldingEvents?: FieldingEvent[] };
  if (Array.isArray(fieldingEventSource.fieldingEvents)) {
    return fieldingEventSource.fieldingEvents;
  }

  try {
    return await getGameFieldingEvents(gameState.gameId);
  } catch (error) {
    if (
      isMissingVitestMockExport(error, 'getGameFieldingEvents') ||
      isNonBrowserIndexedDbUnavailable(error)
    ) {
      return [];
    }
    throw error;
  }
}

function isMissingVitestMockExport(error: unknown, exportName: string): boolean {
  return error instanceof Error &&
    error.message.includes(`No "${exportName}" export is defined`) &&
    error.message.includes('[vitest]');
}

function isNonBrowserIndexedDbUnavailable(error: unknown): boolean {
  return error instanceof ReferenceError && error.message.includes('indexedDB is not defined');
}

function isBaserunnerHeldEvent(fieldingEvent: FieldingEvent): boolean {
  return fieldingEvent.playType === 'base_save';
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
  const fameMetadata = new Map<string, { playerName: string; teamId: string }>();

  for (const event of gameState.fameEvents) {
    const current = playerFame.get(event.playerId) || { bonuses: 0, boners: 0 };
    const metadata = resolveFamePlayerMetadata(
      gameState,
      event.playerId,
      event.playerName,
      event.playerTeam
    );

    if (event.fameType === 'bonus') {
      current.bonuses += event.fameValue;
    } else {
      current.boners += Math.abs(event.fameValue);
    }

    playerFame.set(event.playerId, current);
    fameMetadata.set(event.playerId, metadata);
  }

  // Update season stats for each player with Fame events
  for (const [playerId, fame] of playerFame) {
    // Update batting stats (most players are batters)
    try {
      const metadata = fameMetadata.get(playerId) || resolveFamePlayerMetadata(gameState, playerId);
      const battingStats = await getOrCreateBattingStats(
        seasonId,
        playerId,
        metadata.playerName,
        metadata.teamId
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
