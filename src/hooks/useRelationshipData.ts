/**
 * Relationship Data Hook
 * Per Ralph Framework GAP-041
 *
 * Provides React hook for loading and managing relationship data.
 * Includes loading states and error handling.
 */

import { useState, useEffect, useCallback } from 'react';
import type { Relationship, TradeWarning, RelationshipType } from '../engines/relationshipEngine';
import {
  calculateMoraleEffect,
  getMoraleBreakdown,
  generateTradeWarnings,
} from '../engines/relationshipEngine';
import {
  getActiveRelationships,
  getPlayerRelationships as getPlayerRels,
  addRelationship as addRel,
  endRelationship as endRel,
} from '../utils/relationshipStorage';

// ============================================
// TYPES
// ============================================

export interface UseRelationshipDataReturn {
  // State
  isLoading: boolean;
  error: string | null;
  relationships: Relationship[];

  // Actions
  refresh: () => Promise<void>;
  addRelationship: (
    player1Id: string,
    player2Id: string,
    type: RelationshipType
  ) => Promise<{ success: boolean; error?: string }>;
  endRelationship: (relationshipId: string) => Promise<boolean>;

  // Queries
  getPlayerRelationships: (playerId: string) => Relationship[];
  getPlayerMorale: (playerId: string) => number;
  getPlayerMoraleBreakdown: (playerId: string) => { relationship: Relationship; effect: number }[];
  getTradeWarnings: (playerId: string, getPlayerName?: (id: string) => string) => TradeWarning[];
}

// ============================================
// HOOK
// ============================================

export function useRelationshipData(): UseRelationshipDataReturn {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [relationships, setRelationships] = useState<Relationship[]>([]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const active = await getActiveRelationships();
      setRelationships(active);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load relationships';
      console.error('[useRelationshipData] Error:', message);
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const addRelationship = useCallback(
    async (player1Id: string, player2Id: string, type: RelationshipType) => {
      try {
        const result = await addRel(player1Id, player2Id, type);
        if (result.success) {
          await loadData(); // Refresh
        }
        return { success: result.success, error: result.error };
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to add relationship';
        return { success: false, error: message };
      }
    },
    [loadData]
  );

  const endRelationship = useCallback(
    async (relationshipId: string) => {
      try {
        const result = await endRel(relationshipId);
        if (result) {
          await loadData(); // Refresh
        }
        return result;
      } catch (err) {
        console.error('[useRelationshipData] Error ending relationship:', err);
        return false;
      }
    },
    [loadData]
  );

  const getPlayerRelationships = useCallback(
    (playerId: string): Relationship[] => {
      return relationships.filter(
        (r) => r.player1Id === playerId || r.player2Id === playerId
      );
    },
    [relationships]
  );

  const getPlayerMorale = useCallback(
    (playerId: string): number => {
      return calculateMoraleEffect(relationships, playerId);
    },
    [relationships]
  );

  const getPlayerMoraleBreakdown = useCallback(
    (playerId: string) => {
      return getMoraleBreakdown(relationships, playerId);
    },
    [relationships]
  );

  const getTradeWarnings = useCallback(
    (playerId: string, getPlayerName?: (id: string) => string): TradeWarning[] => {
      return generateTradeWarnings(relationships, playerId, getPlayerName);
    },
    [relationships]
  );

  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    isLoading,
    error,
    relationships,
    refresh: loadData,
    addRelationship,
    endRelationship,
    getPlayerRelationships,
    getPlayerMorale,
    getPlayerMoraleBreakdown,
    getTradeWarnings,
  };
}

export default useRelationshipData;
