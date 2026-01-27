/**
 * useFitnessState Hook
 * Per IMPLEMENTATION_PLAN v5 - Day 3: Wire Fitness Engine
 *
 * Manages fitness state for players in current game.
 * Fitness doesn't change DURING a game — it decays between games.
 * This hook provides read access during gameplay and decay application at game end.
 *
 * @see MOJO_FITNESS_SYSTEM_SPEC.md Section 3
 */

import { useState, useCallback } from 'react';
import {
  type FitnessState,
  type FitnessDefinition,
  getFitnessDefinition,
  FITNESS_STATES,
} from '../engines/fitnessEngine';

// ============================================
// TYPES
// ============================================

export interface FitnessDisplayInfo {
  state: FitnessState;
  definition: FitnessDefinition;
}

export interface UseFitnessStateReturn {
  /** Map of playerId → current FitnessState */
  playerFitness: Map<string, FitnessState>;

  /** Get fitness display info for a player */
  getPlayerFitness: (playerId: string) => FitnessDisplayInfo;

  /** Set a player's fitness state (for manual overrides or between-game updates) */
  setPlayerFitness: (playerId: string, state: FitnessState) => void;

  /** Initialize all players from roster (defaults to FIT) */
  initializeFromRoster: (playerIds: string[]) => void;
}

// ============================================
// HOOK IMPLEMENTATION
// ============================================

export function useFitnessState(): UseFitnessStateReturn {
  const [playerFitness, setPlayerFitness] = useState<Map<string, FitnessState>>(new Map());

  /**
   * Get fitness display info for a player.
   * Defaults to 'FIT' if no state is set.
   */
  const getPlayerFitness = useCallback((playerId: string): FitnessDisplayInfo => {
    const state = playerFitness.get(playerId) ?? 'FIT';
    return {
      state,
      definition: getFitnessDefinition(state),
    };
  }, [playerFitness]);

  /**
   * Set a player's fitness state
   */
  const setPlayerFitnessState = useCallback((playerId: string, state: FitnessState) => {
    setPlayerFitness(prev => {
      const newMap = new Map(prev);
      newMap.set(playerId, state);
      return newMap;
    });
  }, []);

  /**
   * Initialize fitness for all roster players (all start as FIT for now)
   */
  const initializeFromRoster = useCallback((playerIds: string[]) => {
    setPlayerFitness(prev => {
      const newMap = new Map(prev);
      for (const id of playerIds) {
        if (!newMap.has(id)) {
          newMap.set(id, 'FIT');
        }
      }
      return newMap;
    });
  }, []);

  return {
    playerFitness,
    getPlayerFitness,
    setPlayerFitness: setPlayerFitnessState,
    initializeFromRoster,
  };
}
