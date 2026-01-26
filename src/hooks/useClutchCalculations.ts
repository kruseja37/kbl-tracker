/**
 * useClutchCalculations Hook
 * Per IMPLEMENTATION_PLAN.md v5 - Day 2: Wire Clutch Calculator
 *
 * Bridges game events to the clutchCalculator engine.
 * Provides accumulated clutch stats for players.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  getActiveSeason,
  getSeasonBattingStats,
  type PlayerSeasonBatting,
} from '../utils/seasonStorage';
import {
  createPlayerClutchStats,
  accumulateClutchEvent,
  getClutchTier,
  shouldDisplayClutchRating,
  type PlayerClutchStats,
  type PlayResult,
  type PlayAttribution,
  getBatterBaseValue,
  getPitcherBaseValue,
  calculateParticipantClutch,
  getContactQualityFromUI,
  type ExitType,
  type TrajectoryModifier,
} from '../engines/clutchCalculator';
import { getLeverageIndex, type GameStateForLI } from '../engines/leverageCalculator';
import type { AtBatResult, Direction, ExitType as GameExitType, HalfInning, FieldingData } from '../types/game';

// ============================================
// TYPES
// ============================================

export interface ClutchEventInput {
  gameId: string;
  playerId: string;
  playerName: string;
  teamId: string;
  role: 'batter' | 'pitcher';
  result: AtBatResult;
  direction?: Direction;
  exitType?: GameExitType;
  rbiCount?: number;
  isWalkoff?: boolean;
  fieldingData?: FieldingData;
  gameState: {
    inning: number;
    halfInning: HalfInning;
    outs: number;
    runners: { first: boolean; second: boolean; third: boolean };
    homeScore: number;
    awayScore: number;
  };
}

export interface PlayerClutchDisplay {
  playerId: string;
  playerName: string;
  teamId: string;
  stats: PlayerClutchStats;
  tier: { tier: string; icon: string; color: string };
  shouldDisplay: boolean;
  clutchRating: string;
}

export interface UseClutchCalculationsReturn {
  // Data
  playerClutchStats: Map<string, PlayerClutchStats>;
  clutchLeaderboard: PlayerClutchDisplay[];

  // Actions
  recordClutchEvent: (event: ClutchEventInput) => void;
  getPlayerClutch: (playerId: string) => PlayerClutchDisplay | null;

  // State
  isLoading: boolean;
  lastUpdated: number;
}

// ============================================
// RESULT MAPPING
// ============================================

/**
 * Map AtBatResult to PlayResult for clutch calculator
 */
function mapResultToPlayResult(result: AtBatResult): PlayResult {
  const mapping: Record<AtBatResult, PlayResult> = {
    '1B': 'single',
    '2B': 'double',
    '3B': 'triple',
    'HR': 'HR',
    'BB': 'walk',
    'IBB': 'intentional_walk',
    'K': 'strikeout_swinging',
    'KL': 'strikeout_looking',
    'GO': 'ground_out',
    'FO': 'fly_out',
    'LO': 'line_out',
    'PO': 'popup_out',
    'DP': 'gidp',
    'SF': 'sac_fly',
    'SAC': 'sac_bunt',
    'HBP': 'hbp',
    'E': 'error',
    'FC': 'fielders_choice',
    'D3K': 'strikeout_swinging', // Dropped third strike
  };
  return mapping[result] || 'ground_out';
}

/**
 * Map GameExitType to clutch calculator ExitType
 */
function mapExitType(exitType?: GameExitType): ExitType {
  if (!exitType) return 'Ground Ball';
  const mapping: Record<string, ExitType> = {
    'Ground': 'Ground Ball',
    'Line Drive': 'Line Drive',
    'Fly Ball': 'Fly Ball',
    'Pop Up': 'Popup',
  };
  return mapping[exitType] || 'Ground Ball';
}

/**
 * Calculate contact quality from result and exit type
 */
function getContactQuality(result: AtBatResult, exitType?: GameExitType): number {
  // Home runs are always high quality
  if (result === 'HR') return 1.0;

  // Map exit type for contact quality
  const mappedExitType = mapExitType(exitType);
  return getContactQualityFromUI(mappedExitType);
}

// ============================================
// HOOK IMPLEMENTATION
// ============================================

export function useClutchCalculations(): UseClutchCalculationsReturn {
  const [playerClutchStats, setPlayerClutchStats] = useState<Map<string, PlayerClutchStats>>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(Date.now());

  // Initialize from stored season data
  useEffect(() => {
    const initializeClutchStats = async () => {
      try {
        const activeSeason = await getActiveSeason();
        if (!activeSeason) {
          setIsLoading(false);
          return;
        }

        // Get all batting stats to initialize player list
        const battingStats = await getSeasonBattingStats(activeSeason.seasonId);
        const newStats = new Map<string, PlayerClutchStats>();

        // Initialize empty clutch stats for each player
        // Actual clutch events are accumulated during gameplay
        battingStats.forEach(player => {
          newStats.set(player.playerId, createPlayerClutchStats(player.playerId));
        });

        setPlayerClutchStats(newStats);
        setIsLoading(false);
      } catch (err) {
        console.error('Failed to initialize clutch stats:', err);
        setIsLoading(false);
      }
    };

    initializeClutchStats();
  }, []);

  /**
   * Record a clutch event for a player
   */
  const recordClutchEvent = useCallback((event: ClutchEventInput) => {
    setPlayerClutchStats(prev => {
      const newStats = new Map(prev);

      // Ensure player has stats entry
      if (!newStats.has(event.playerId)) {
        newStats.set(event.playerId, createPlayerClutchStats(event.playerId));
      }

      const playerStats = newStats.get(event.playerId)!;

      // Convert game state for LI calculation
      const liGameState: GameStateForLI = {
        inning: event.gameState.inning,
        halfInning: event.gameState.halfInning,
        outs: event.gameState.outs as 0 | 1 | 2,
        runners: event.gameState.runners,
        homeScore: event.gameState.homeScore,
        awayScore: event.gameState.awayScore,
      };

      // Calculate leverage index
      const leverageIndex = getLeverageIndex(liGameState);

      // Map result to play result
      const playResult = mapResultToPlayResult(event.result);
      const contactQuality = getContactQuality(event.result, event.exitType);

      // Calculate base value based on role
      let baseValue = 0;
      if (event.role === 'batter') {
        const config = getBatterBaseValue(playResult, contactQuality);
        baseValue = config.base;
        if (config.useCQ) {
          baseValue = config.modifier === 'multiply'
            ? baseValue * contactQuality
            : baseValue * (1 - contactQuality);
        }
      } else {
        const config = getPitcherBaseValue(playResult, contactQuality);
        baseValue = config.base;
        if (config.useCQ) {
          baseValue = config.modifier === 'multiply'
            ? baseValue * contactQuality
            : baseValue * (1 - contactQuality);
        }
      }

      // Apply LI weight and calculate clutch value
      const clutchValue = calculateParticipantClutch(baseValue, leverageIndex);

      // Walk-off bonus
      const finalClutchValue = event.isWalkoff ? clutchValue * 1.5 : clutchValue;

      // Accumulate the event
      accumulateClutchEvent(playerStats, finalClutchValue, leverageIndex, false);

      return newStats;
    });

    setLastUpdated(Date.now());
  }, []);

  /**
   * Get clutch display data for a player
   */
  const getPlayerClutch = useCallback((playerId: string): PlayerClutchDisplay | null => {
    const stats = playerClutchStats.get(playerId);
    if (!stats) return null;

    const tier = getClutchTier(stats.netClutch);
    const shouldDisplay = shouldDisplayClutchRating(stats);

    // Format clutch rating string
    const sign = stats.netClutch >= 0 ? '+' : '';
    const clutchRating = `${sign}${stats.netClutch.toFixed(1)}`;

    return {
      playerId,
      playerName: '', // Would be filled from another source
      teamId: '',
      stats,
      tier,
      shouldDisplay,
      clutchRating,
    };
  }, [playerClutchStats]);

  /**
   * Get clutch leaderboard (sorted by net clutch)
   */
  const clutchLeaderboard = useMemo((): PlayerClutchDisplay[] => {
    const displays: PlayerClutchDisplay[] = [];

    playerClutchStats.forEach((stats, playerId) => {
      const tier = getClutchTier(stats.netClutch);
      const shouldDisplay = shouldDisplayClutchRating(stats);

      if (shouldDisplay || stats.plateAppearances >= 10) {
        const sign = stats.netClutch >= 0 ? '+' : '';
        displays.push({
          playerId,
          playerName: '', // Would be filled from player data
          teamId: '',
          stats,
          tier,
          shouldDisplay,
          clutchRating: `${sign}${stats.netClutch.toFixed(1)}`,
        });
      }
    });

    // Sort by net clutch (descending)
    displays.sort((a, b) => b.stats.netClutch - a.stats.netClutch);

    return displays;
  }, [playerClutchStats]);

  return {
    playerClutchStats,
    clutchLeaderboard,
    recordClutchEvent,
    getPlayerClutch,
    isLoading,
    lastUpdated,
  };
}
