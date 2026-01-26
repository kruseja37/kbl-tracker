/**
 * Season Data Hook
 * Per Ralph Framework GAP-004
 *
 * Provides React hook for loading season metadata and standings.
 * Includes loading states and error handling.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  getSeasonMetadata,
  getOrCreateSeason,
  type SeasonMetadata,
} from '../utils/seasonStorage';

// ============================================
// TYPES
// ============================================

export interface TeamStanding {
  teamId: string;
  teamName: string;
  wins: number;
  losses: number;
  winPct: number;
  gamesBack: number;
  streak: string;
}

export interface UseSeasonDataReturn {
  // State
  isLoading: boolean;
  error: string | null;
  seasonMetadata: SeasonMetadata | null;
  standings: TeamStanding[];
  currentGameNumber: number;

  // Actions
  refresh: () => Promise<void>;
  initializeSeason: (seasonId: string, seasonNumber: number, seasonName: string, totalGames: number) => Promise<void>;
}

// Default values
const DEFAULT_SEASON_ID = 'season-1';
const DEFAULT_SEASON_NUMBER = 1;
const DEFAULT_SEASON_NAME = 'Season 1';
const DEFAULT_TOTAL_GAMES = 64;

// ============================================
// HOOK
// ============================================

export function useSeasonData(seasonId: string = DEFAULT_SEASON_ID): UseSeasonDataReturn {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [seasonMetadata, setSeasonMetadata] = useState<SeasonMetadata | null>(null);
  const [standings, setStandings] = useState<TeamStanding[]>([]);
  const [currentGameNumber, setCurrentGameNumber] = useState(1);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      let metadata = await getSeasonMetadata(seasonId);

      // Initialize season if it doesn't exist
      if (!metadata) {
        metadata = await getOrCreateSeason(
          seasonId,
          DEFAULT_SEASON_NUMBER,
          DEFAULT_SEASON_NAME,
          DEFAULT_TOTAL_GAMES
        );
      }

      setSeasonMetadata(metadata);
      setCurrentGameNumber(metadata.gamesPlayed + 1);

      // TODO: Load actual standings from completed games
      // For now, return empty standings
      setStandings([]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load season data';
      console.error('[useSeasonData] Error:', message);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [seasonId]);

  const initializeSeason = useCallback(
    async (id: string, number: number, name: string, totalGames: number) => {
      setIsLoading(true);
      setError(null);

      try {
        const metadata = await getOrCreateSeason(id, number, name, totalGames);
        setSeasonMetadata(metadata);
        setCurrentGameNumber(1);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to initialize season';
        console.error('[useSeasonData] Error:', message);
        setError(message);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    isLoading,
    error,
    seasonMetadata,
    standings,
    currentGameNumber,
    refresh: loadData,
    initializeSeason,
  };
}

export default useSeasonData;
