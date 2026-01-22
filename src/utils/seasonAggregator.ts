/**
 * Season Aggregator
 * Per STAT_TRACKING_ARCHITECTURE_SPEC.md - Phase 3: Season Stats Aggregation
 *
 * Aggregates completed game stats into season totals.
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

// Default season ID if none is set
const DEFAULT_SEASON_ID = 'season-1';
const DEFAULT_SEASON_NUMBER = 1;
const DEFAULT_SEASON_NAME = 'Season 1';
const DEFAULT_TOTAL_GAMES = 162;

/**
 * Aggregate a completed game's stats into the season totals
 */
export async function aggregateGameToSeason(
  gameState: PersistedGameState,
  seasonId: string = DEFAULT_SEASON_ID
): Promise<void> {
  // Ensure season exists
  await getOrCreateSeason(seasonId, DEFAULT_SEASON_NUMBER, DEFAULT_SEASON_NAME, DEFAULT_TOTAL_GAMES);

  // Aggregate batting stats for all players
  await aggregateBattingStats(gameState, seasonId);

  // Aggregate pitching stats for all pitchers
  await aggregatePitchingStats(gameState, seasonId);

  // Aggregate fielding stats for all players
  await aggregateFieldingStats(gameState, seasonId);

  // Aggregate Fame events
  await aggregateFameEvents(gameState, seasonId);

  // Increment season game count
  await incrementSeasonGames(seasonId);
}

/**
 * Aggregate batting stats from a game
 */
async function aggregateBattingStats(
  gameState: PersistedGameState,
  seasonId: string
): Promise<void> {
  for (const [playerId, gameStats] of Object.entries(gameState.playerStats)) {
    // Determine player name and team from game context
    // In a full implementation, this would come from roster data
    const playerName = playerId;  // Placeholder
    const teamId = gameState.awayTeamId;  // Placeholder - would need roster lookup

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
      stolenBases: seasonStats.stolenBases + gameStats.sb,
      caughtStealing: seasonStats.caughtStealing + gameStats.cs,
      // Note: HBP, SF, SAC, GIDP would need to be tracked in game stats
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
      // Note: W/L/SV/H/BS would need decision tracking
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
    const playerName = playerId;  // Placeholder
    const teamId = gameState.awayTeamId;  // Placeholder

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
