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
  getAllGamesByFranchise,
  addGame,
  addSeries,
  importFranchiseScheduleRows,
  updateGame,
  updateGameStatus,
  completeGame,
  deleteGame,
  getScheduleMetadata,
  getScheduleMetadataByFranchise,
  getTeamScheduleStats,
  getTeamScheduleStatsForFranchise,
  clearSeasonSchedule,
  clearFranchiseSeasonSchedule,
  type ScheduledGame,
  type AddGameInput,
  type FranchiseScheduleImportRow,
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
  importFranchiseRows: (rows: FranchiseScheduleImportRow[], scope?: { seasonId?: string; statsScopeId?: string }) => Promise<ScheduledGame[]>;
  updateGame: (gameId: string, input: Omit<AddGameInput, 'seasonNumber' | 'franchiseId' | 'seasonId' | 'statsScopeId' | 'source' | 'importedAt'>) => Promise<ScheduledGame>;
  updateStatus: (gameId: string, status: GameStatus) => Promise<void>;
  completeGame: (gameId: string, result: GameResult) => Promise<void>;
  deleteGame: (gameId: string) => Promise<void>;
  refresh: () => Promise<void>;
  clearSchedule: () => Promise<void>;
}

export interface UseScheduleDataOptions {
  franchiseId?: string;
}

// ============================================
// HOOK IMPLEMENTATION
// ============================================

export function useScheduleData(
  seasonNumber: number = 1,
  options: UseScheduleDataOptions = {},
): UseScheduleDataReturn {
  const [games, setGames] = useState<ScheduledGame[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [metadata, setMetadata] = useState<ScheduleMetadata | null>(null);
  const franchiseId = options.franchiseId;

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
      const [gamesData, metaData] = franchiseId
        ? await Promise.all([
            getAllGamesByFranchise(franchiseId, seasonNumber),
            getScheduleMetadataByFranchise(franchiseId, seasonNumber),
          ])
        : await Promise.all([
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
  }, [franchiseId, seasonNumber]);

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
    if (franchiseId) {
      return getTeamScheduleStatsForFranchise(franchiseId, seasonNumber, teamId);
    }
    return getTeamScheduleStats(seasonNumber, teamId);
  }, [franchiseId, seasonNumber]);

  // Add a single game
  const handleAddGame = useCallback(async (input: Omit<AddGameInput, 'seasonNumber'>): Promise<ScheduledGame> => {
    try {
      const game = await addGame({
        ...input,
        franchiseId: input.franchiseId ?? franchiseId,
        seasonNumber,
      });
      await refresh();
      return game;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add game';
      setError(message);
      throw err;
    }
  }, [franchiseId, seasonNumber, refresh]);

  // Add a series
  const handleAddSeries = useCallback(async (
    input: Omit<AddGameInput, 'seasonNumber' | 'gameNumber' | 'dayNumber'>,
    seriesLength: number = 3
  ): Promise<ScheduledGame[]> => {
    try {
      const games = await addSeries({
        ...input,
        franchiseId: input.franchiseId ?? franchiseId,
        seasonNumber,
      }, seriesLength);
      await refresh();
      return games;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add series';
      setError(message);
      throw err;
    }
  }, [franchiseId, seasonNumber, refresh]);

  const handleImportFranchiseRows = useCallback(async (
    rows: FranchiseScheduleImportRow[],
    scope: { seasonId?: string; statsScopeId?: string } = {},
  ): Promise<ScheduledGame[]> => {
    if (!franchiseId) {
      throw new Error('Franchise schedule import requires a franchiseId');
    }

    try {
      const imported = await importFranchiseScheduleRows({
        franchiseId,
        seasonNumber,
        seasonId: scope.seasonId,
        statsScopeId: scope.statsScopeId ?? scope.seasonId,
        rows,
      });
      await refresh();
      return imported;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to import schedule';
      setError(message);
      throw err;
    }
  }, [franchiseId, seasonNumber, refresh]);

  const handleUpdateGame = useCallback(async (
    gameId: string,
    input: Omit<AddGameInput, 'seasonNumber' | 'franchiseId' | 'seasonId' | 'statsScopeId' | 'source' | 'importedAt'>,
  ): Promise<ScheduledGame> => {
    try {
      const game = await updateGame(gameId, input);
      await refresh();
      return game;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update game';
      setError(message);
      throw err;
    }
  }, [refresh]);

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
      if (franchiseId) {
        await clearFranchiseSeasonSchedule(franchiseId, seasonNumber);
      } else {
        await clearSeasonSchedule(seasonNumber);
      }
      await refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to clear schedule';
      setError(message);
      throw err;
    }
  }, [franchiseId, seasonNumber, refresh]);

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
    importFranchiseRows: handleImportFranchiseRows,
    updateGame: handleUpdateGame,
    updateStatus: handleUpdateStatus,
    completeGame: handleCompleteGame,
    deleteGame: handleDeleteGame,
    refresh,
    clearSchedule: handleClearSchedule,
  };
}

export default useScheduleData;
