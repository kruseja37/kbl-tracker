/**
 * Schedule Data Hook
 *
 * Connects scheduleStorage to Figma UI components with:
 * - Loading states
 * - CRUD operations
 * - Auto-refresh on changes
 */

import { useState, useEffect, useCallback } from 'react';
import {
  initScheduleDatabase,
  getAllGames,
  getGamesByTeam,
  getNextScheduledGame,
  getNextGameNumber,
  addGame,
  addSeries,
  updateGameStatus,
  completeGame,
  deleteGame,
  getGame,
  getScheduleMetadata,
  getTeamScheduleStats,
  clearSeasonSchedule,
  type ScheduledGame,
  type AddGameInput,
  type GameResult,
  type GameStatus,
  type ScheduleMetadata,
  type TeamScheduleStats,
} from '../../utils/scheduleStorage';

// Re-export types for convenience
export type {
  ScheduledGame,
  AddGameInput,
  GameResult,
  GameStatus,
  ScheduleMetadata,
  TeamScheduleStats,
};

// ============================================
// HOOK INTERFACE
// ============================================

export interface UseScheduleDataReturn {
  // State
  games: ScheduledGame[];
  isLoading: boolean;
  error: string | null;
  metadata: ScheduleMetadata | null;

  // Queries
  nextGame: ScheduledGame | null;
  completedGames: ScheduledGame[];
  upcomingGames: ScheduledGame[];
  getTeamStats: (teamId: string) => Promise<TeamScheduleStats>;

  // Actions
  addGame: (input: Omit<AddGameInput, 'seasonNumber'>) => Promise<ScheduledGame>;
  addSeries: (input: Omit<AddGameInput, 'seasonNumber' | 'gameNumber' | 'dayNumber'>, seriesLength?: number) => Promise<ScheduledGame[]>;
  updateStatus: (gameId: string, status: GameStatus) => Promise<void>;
  completeGame: (gameId: string, result: GameResult) => Promise<void>;
  deleteGame: (gameId: string) => Promise<void>;
  refresh: () => Promise<void>;
  clearSchedule: () => Promise<void>;
}

// ============================================
// HOOK IMPLEMENTATION
// ============================================

export function useScheduleData(seasonNumber: number = 1): UseScheduleDataReturn {
  const [games, setGames] = useState<ScheduledGame[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<ScheduleMetadata | null>(null);

  // Derived state
  const completedGames = games.filter(g => g.status === 'COMPLETED');
  const upcomingGames = games.filter(g => g.status === 'SCHEDULED');
  const nextGame = upcomingGames[0] || null;

  // Load initial data
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      await initScheduleDatabase();
      const [gamesData, metaData] = await Promise.all([
        getAllGames(seasonNumber),
        getScheduleMetadata(seasonNumber),
      ]);

      setGames(gamesData);
      setMetadata(metaData);
    } catch (err) {
      console.error('[useScheduleData] Failed to load data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load schedule');
    } finally {
      setIsLoading(false);
    }
  }, [seasonNumber]);

  // Initial load
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Refresh function
  const refresh = useCallback(async () => {
    await loadData();
  }, [loadData]);

  // Get team stats
  const getTeamStats = useCallback(async (teamId: string): Promise<TeamScheduleStats> => {
    return getTeamScheduleStats(seasonNumber, teamId);
  }, [seasonNumber]);

  // Add a single game
  const handleAddGame = useCallback(async (input: Omit<AddGameInput, 'seasonNumber'>): Promise<ScheduledGame> => {
    try {
      const game = await addGame({ ...input, seasonNumber });
      await refresh();
      return game;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add game';
      setError(message);
      throw err;
    }
  }, [seasonNumber, refresh]);

  // Add a series
  const handleAddSeries = useCallback(async (
    input: Omit<AddGameInput, 'seasonNumber' | 'gameNumber' | 'dayNumber'>,
    seriesLength: number = 3
  ): Promise<ScheduledGame[]> => {
    try {
      const games = await addSeries({ ...input, seasonNumber }, seriesLength);
      await refresh();
      return games;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add series';
      setError(message);
      throw err;
    }
  }, [seasonNumber, refresh]);

  // Update game status
  const handleUpdateStatus = useCallback(async (gameId: string, status: GameStatus): Promise<void> => {
    try {
      await updateGameStatus(gameId, status);
      await refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update status';
      setError(message);
      throw err;
    }
  }, [refresh]);

  // Complete a game with result
  const handleCompleteGame = useCallback(async (gameId: string, result: GameResult): Promise<void> => {
    try {
      await completeGame(gameId, result);
      await refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to complete game';
      setError(message);
      throw err;
    }
  }, [refresh]);

  // Delete a game
  const handleDeleteGame = useCallback(async (gameId: string): Promise<void> => {
    try {
      await deleteGame(gameId);
      await refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete game';
      setError(message);
      throw err;
    }
  }, [refresh]);

  // Clear schedule
  const handleClearSchedule = useCallback(async (): Promise<void> => {
    try {
      await clearSeasonSchedule(seasonNumber);
      await refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to clear schedule';
      setError(message);
      throw err;
    }
  }, [seasonNumber, refresh]);

  return {
    // State
    games,
    isLoading,
    error,
    metadata,

    // Queries
    nextGame,
    completedGames,
    upcomingGames,
    getTeamStats,

    // Actions
    addGame: handleAddGame,
    addSeries: handleAddSeries,
    updateStatus: handleUpdateStatus,
    completeGame: handleCompleteGame,
    deleteGame: handleDeleteGame,
    refresh,
    clearSchedule: handleClearSchedule,
  };
}

export default useScheduleData;
