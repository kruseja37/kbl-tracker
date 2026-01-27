/**
 * useMojoState Hook
 * Per IMPLEMENTATION_PLAN v5 - Day 3: Wire Mojo Engine
 *
 * Manages in-game mojo state for all players.
 * Mojo is USER-CONTROLLED ONLY — the user sets each player's mojo
 * from the in-game roster view. No automatic changes.
 *
 * 5-level scale: -2 (Rattled) to +2 (Jacked)
 *
 * @see MOJO_FITNESS_SYSTEM_SPEC.md Section 2
 */

import { useState, useCallback } from 'react';
import {
  type MojoLevel,
  type MojoState,
  getMojoState,
  clampMojo,
} from '../engines/mojoEngine';

// ============================================
// TYPES
// ============================================

export interface MojoDisplayInfo {
  level: MojoLevel;
  state: MojoState;
}

export interface UseMojoStateReturn {
  /** Map of playerId → current MojoLevel */
  playerMojo: Map<string, MojoLevel>;

  /** Get mojo display info for a player (defaults to Normal/0) */
  getPlayerMojo: (playerId: string) => MojoDisplayInfo;

  /** Set a player's mojo level (user-controlled) */
  setPlayerMojo: (playerId: string, level: MojoLevel) => void;

  /** Adjust mojo by delta (clamped to -2..+2), returns new level */
  adjustPlayerMojo: (playerId: string, delta: number) => MojoLevel;
}

// ============================================
// HOOK IMPLEMENTATION
// ============================================

export function useMojoState(): UseMojoStateReturn {
  const [playerMojo, setPlayerMojoMap] = useState<Map<string, MojoLevel>>(new Map());

  /**
   * Get display info for a player's current mojo
   */
  const getPlayerMojo = useCallback((playerId: string): MojoDisplayInfo => {
    const level = playerMojo.get(playerId) ?? (0 as MojoLevel);
    return {
      level,
      state: getMojoState(level),
    };
  }, [playerMojo]);

  /**
   * Set a player's mojo to an exact level (user-controlled)
   */
  const setPlayerMojo = useCallback((playerId: string, level: MojoLevel) => {
    setPlayerMojoMap(prev => {
      const newMap = new Map(prev);
      newMap.set(playerId, level);
      return newMap;
    });
  }, []);

  /**
   * Adjust a player's mojo by delta (clamped), returns new level
   */
  const adjustPlayerMojo = useCallback((playerId: string, delta: number): MojoLevel => {
    let newLevel: MojoLevel = 0;
    setPlayerMojoMap(prev => {
      const newMap = new Map(prev);
      const current = newMap.get(playerId) ?? (0 as MojoLevel);
      newLevel = clampMojo(current + delta);
      newMap.set(playerId, newLevel);
      return newMap;
    });
    return newLevel;
  }, []);

  return {
    playerMojo,
    getPlayerMojo,
    setPlayerMojo,
    adjustPlayerMojo,
  };
}
