/**
 * Player Data Hook
 * Per STORIES_GAP_CLOSERS.md NEW-008
 *
 * Provides React hook for loading individual player data with
 * career stats, ratings, and milestones.
 * Includes loading states and error handling.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  getPlayer,
  type UnifiedPlayer,
} from '../utils/unifiedPlayerStorage';
import {
  getCareerStats,
  type CareerStats,
} from '../utils/careerStorage';
import {
  getPlayerRatings,
  type PlayerRatings,
} from '../utils/ratingsStorage';

// ============================================
// TYPES
// ============================================

export interface PlayerProfile {
  player: UnifiedPlayer;
  careerStats: CareerStats | null;
  ratings: PlayerRatings | null;
}

export interface UsePlayerDataReturn {
  // State
  isLoading: boolean;
  error: string | null;
  profile: PlayerProfile | null;

  // Actions
  refresh: () => Promise<void>;
  loadPlayer: (playerId: string) => Promise<PlayerProfile | null>;
}

// ============================================
// HOOK
// ============================================

export function usePlayerData(playerId?: string): UsePlayerDataReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<PlayerProfile | null>(null);

  const loadPlayerProfile = useCallback(async (id: string): Promise<PlayerProfile | null> => {
    try {
      const player = await getPlayer(id);
      if (!player) return null;

      // Load career stats and ratings in parallel
      const [careerStats, ratings] = await Promise.all([
        getCareerStats(id).catch(() => null),
        getPlayerRatings(id).catch(() => null),
      ]);

      return {
        player,
        careerStats: careerStats ?? null,
        ratings: ratings ?? null,
      };
    } catch (err) {
      console.error('[usePlayerData] Error loading player:', err);
      return null;
    }
  }, []);

  const loadData = useCallback(async () => {
    if (!playerId) {
      setProfile(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const result = await loadPlayerProfile(playerId);
      if (!result) {
        setError(`Player ${playerId} not found`);
        setProfile(null);
      } else {
        setProfile(result);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load player data';
      console.error('[usePlayerData] Error:', message);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [playerId, loadPlayerProfile]);

  const loadPlayer = useCallback(async (id: string): Promise<PlayerProfile | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await loadPlayerProfile(id);
      if (result) {
        setProfile(result);
      }
      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load player data';
      setError(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [loadPlayerProfile]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    isLoading,
    error,
    profile,
    refresh: loadData,
    loadPlayer,
  };
}

export default usePlayerData;
