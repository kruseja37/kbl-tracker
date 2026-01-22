/**
 * Live Stats Hook
 * Loads season stats once at game start, then provides real-time stat calculations
 * by merging stored season stats with current game stats.
 *
 * Zero DB writes during gameplay - purely in-memory calculation.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  type PlayerSeasonBatting,
  type PlayerSeasonPitching,
  getAllBattingStats,
  getAllPitchingStats,
} from '../utils/seasonStorage';
import {
  type GameBattingStats,
  type GamePitchingStats,
  type LiveBattingStats,
  type LivePitchingStats,
  calculateLiveBatting,
  calculateLivePitching,
  emptySeasonBatting,
  emptySeasonPitching,
} from '../utils/liveStatsCalculator';

// Default season ID
const DEFAULT_SEASON_ID = 'season-1';

// ============================================
// TYPES
// ============================================

export interface UseLiveStatsOptions {
  seasonId?: string;
  /** Whether to auto-load stats on mount */
  autoLoad?: boolean;
}

export interface UseLiveStatsReturn {
  /** Whether season stats are still loading */
  isLoading: boolean;

  /** Any error that occurred during loading */
  error: string | null;

  /** Whether season stats have been loaded */
  isLoaded: boolean;

  /** Load/reload season stats from IndexedDB */
  loadSeasonStats: () => Promise<void>;

  /**
   * Get live batting stats for a player.
   * Merges stored season stats with provided current game stats.
   */
  getLiveBatting: (playerId: string, gameStats: GameBattingStats | null) => LiveBattingStats;

  /**
   * Get live pitching stats for a pitcher.
   * Merges stored season stats with provided current game stats.
   */
  getLivePitching: (playerId: string, gameStats: GamePitchingStats | null) => LivePitchingStats;

  /**
   * Check if a player has any season batting history
   */
  hasSeasonBatting: (playerId: string) => boolean;

  /**
   * Check if a player has any season pitching history
   */
  hasSeasonPitching: (playerId: string) => boolean;
}

// ============================================
// HOOK
// ============================================

export function useLiveStats(options: UseLiveStatsOptions = {}): UseLiveStatsReturn {
  const { seasonId = DEFAULT_SEASON_ID, autoLoad = true } = options;

  const [isLoading, setIsLoading] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Season stats indexed by player ID for O(1) lookup
  const [battingByPlayer, setBattingByPlayer] = useState<Map<string, PlayerSeasonBatting>>(new Map());
  const [pitchingByPlayer, setPitchingByPlayer] = useState<Map<string, PlayerSeasonPitching>>(new Map());

  // Load season stats from IndexedDB
  const loadSeasonStats = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Load all batting and pitching stats for the season
      const [battingStats, pitchingStats] = await Promise.all([
        getAllBattingStats(seasonId),
        getAllPitchingStats(seasonId),
      ]);

      // Index by player ID
      const battingMap = new Map<string, PlayerSeasonBatting>();
      for (const stats of battingStats) {
        battingMap.set(stats.playerId, stats);
      }

      const pitchingMap = new Map<string, PlayerSeasonPitching>();
      for (const stats of pitchingStats) {
        pitchingMap.set(stats.playerId, stats);
      }

      setBattingByPlayer(battingMap);
      setPitchingByPlayer(pitchingMap);
      setIsLoaded(true);
    } catch (err) {
      console.error('Failed to load season stats for live display:', err);
      setError(err instanceof Error ? err.message : 'Failed to load stats');
    } finally {
      setIsLoading(false);
    }
  }, [seasonId]);

  // Auto-load on mount if enabled
  useEffect(() => {
    if (autoLoad && !isLoaded && !isLoading) {
      loadSeasonStats();
    }
  }, [autoLoad, isLoaded, isLoading, loadSeasonStats]);

  // Get live batting stats for a player
  const getLiveBatting = useCallback((playerId: string, gameStats: GameBattingStats | null): LiveBattingStats => {
    const seasonStats = battingByPlayer.get(playerId) || null;
    return calculateLiveBatting(seasonStats, gameStats);
  }, [battingByPlayer]);

  // Get live pitching stats for a pitcher
  const getLivePitching = useCallback((playerId: string, gameStats: GamePitchingStats | null): LivePitchingStats => {
    const seasonStats = pitchingByPlayer.get(playerId) || null;
    return calculateLivePitching(seasonStats, gameStats);
  }, [pitchingByPlayer]);

  // Check if player has season batting history
  const hasSeasonBatting = useCallback((playerId: string): boolean => {
    return battingByPlayer.has(playerId);
  }, [battingByPlayer]);

  // Check if player has season pitching history
  const hasSeasonPitching = useCallback((playerId: string): boolean => {
    return pitchingByPlayer.has(playerId);
  }, [pitchingByPlayer]);

  return {
    isLoading,
    error,
    isLoaded,
    loadSeasonStats,
    getLiveBatting,
    getLivePitching,
    hasSeasonBatting,
    hasSeasonPitching,
  };
}

// ============================================
// HELPER: Convert GameTracker stats to hook format
// ============================================

/**
 * Convert playerStats from GameTracker to GameBattingStats format.
 * This bridges the existing GameTracker state to the live stats system.
 */
export function toGameBattingStats(playerStats: {
  odlcli: string;
  plateAppearances: number;
  atBats: number;
  hits: number;
  singles: number;
  doubles: number;
  triples: number;
  homeRuns: number;
  rbi: number;
  runs: number;
  walks: number;
  strikeouts: number;
  hitByPitch: number;
  sacFlies: number;
  sacBunts: number;
  stolenBases: number;
  caughtStealing: number;
}): GameBattingStats {
  return {
    odlcli: playerStats.odlcli,
    plateAppearances: playerStats.plateAppearances,
    atBats: playerStats.atBats,
    hits: playerStats.hits,
    singles: playerStats.singles,
    doubles: playerStats.doubles,
    triples: playerStats.triples,
    homeRuns: playerStats.homeRuns,
    rbi: playerStats.rbi,
    runs: playerStats.runs,
    walks: playerStats.walks,
    strikeouts: playerStats.strikeouts,
    hitByPitch: playerStats.hitByPitch,
    sacFlies: playerStats.sacFlies,
    sacBunts: playerStats.sacBunts,
    stolenBases: playerStats.stolenBases,
    caughtStealing: playerStats.caughtStealing,
  };
}

/**
 * Convert PitcherGameStats from GameTracker to GamePitchingStats format.
 * This bridges the existing GameTracker state to the live stats system.
 */
export function toGamePitchingStats(pitcherStats: {
  pitcherId: string;
  pitcherName: string;
  outsRecorded: number;
  hitsAllowed: number;
  walksAllowed: number;
  strikeouts: number;
  homeRunsAllowed: number;
  runsAllowed: number;
  earnedRuns: number;
  hitBatsmen: number;
  wildPitches: number;
  basesReachedViaError: number;
}): GamePitchingStats {
  return {
    odlcli: pitcherStats.pitcherId,
    pitcherName: pitcherStats.pitcherName,
    outsRecorded: pitcherStats.outsRecorded,
    hitsAllowed: pitcherStats.hitsAllowed,
    walksAllowed: pitcherStats.walksAllowed,
    strikeouts: pitcherStats.strikeouts,
    homeRunsAllowed: pitcherStats.homeRunsAllowed,
    runsAllowed: pitcherStats.runsAllowed,
    earnedRuns: pitcherStats.earnedRuns,
    hitBatsmen: pitcherStats.hitBatsmen,
    wildPitches: pitcherStats.wildPitches,
    basesReachedViaError: pitcherStats.basesReachedViaError,
  };
}
