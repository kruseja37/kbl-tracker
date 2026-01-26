/**
 * Roster Data Hook
 * Per Ralph Framework GAP-004
 *
 * Provides React hook for loading roster data from IndexedDB.
 * Includes loading states and error handling.
 */

import { useState, useEffect, useCallback } from 'react';
import {
  getAllPlayers,
  getPlayersByTeam,
  getCustomPlayers,
  type UnifiedPlayer,
} from '../utils/unifiedPlayerStorage';

// ============================================
// TYPES
// ============================================

export interface UseRosterDataReturn {
  // State
  isLoading: boolean;
  error: string | null;
  players: UnifiedPlayer[];
  customPlayers: UnifiedPlayer[];

  // Actions
  refresh: () => Promise<void>;
  getByTeam: (teamId: string) => Promise<UnifiedPlayer[]>;
}

// ============================================
// HOOK
// ============================================

export function useRosterData(teamId?: string): UseRosterDataReturn {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [players, setPlayers] = useState<UnifiedPlayer[]>([]);
  const [customPlayers, setCustomPlayers] = useState<UnifiedPlayer[]>([]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      if (teamId) {
        const teamPlayers = await getPlayersByTeam(teamId);
        setPlayers(teamPlayers);
      } else {
        const allPlayers = await getAllPlayers();
        setPlayers(allPlayers);
      }

      const custom = await getCustomPlayers();
      setCustomPlayers(custom);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load roster data';
      console.error('[useRosterData] Error:', message);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [teamId]);

  const getByTeam = useCallback(async (id: string): Promise<UnifiedPlayer[]> => {
    try {
      return await getPlayersByTeam(id);
    } catch (err) {
      console.error('[useRosterData] Error loading team:', err);
      return [];
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    isLoading,
    error,
    players,
    customPlayers,
    refresh: loadData,
    getByTeam,
  };
}

export default useRosterData;
