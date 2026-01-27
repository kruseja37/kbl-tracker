/**
 * useMojoState Hook
 * Per IMPLEMENTATION_PLAN v5 - Day 3: Wire Mojo Engine
 *
 * Manages in-game mojo state for all players.
 * Bridges game events to the mojoEngine functions.
 *
 * Mojo is per-game state that changes after at-bat events.
 * 5-level scale: -2 (Rattled) to +2 (Jacked)
 *
 * @see MOJO_FITNESS_SYSTEM_SPEC.md Section 2
 */

import { useState, useCallback } from 'react';
import {
  type MojoLevel,
  type MojoState,
  type MojoTrigger,
  type MojoChangeEvent,
  type GameSituation,
  type PlayResultForMojo,
  getMojoState,
  inferMojoTriggers,
  processMojoTriggers,
  clampMojo,
  MOJO_STATES,
} from '../engines/mojoEngine';
import type { AtBatResult } from '../types/game';

// ============================================
// TYPES
// ============================================

export interface MojoDisplayInfo {
  level: MojoLevel;
  state: MojoState;
}

export interface MojoChangeResult {
  previousLevel: MojoLevel;
  newLevel: MojoLevel;
  triggers: MojoTrigger[];
  events: MojoChangeEvent[];
}

export interface UseMojoStateReturn {
  /** Map of playerId → current MojoLevel */
  playerMojo: Map<string, MojoLevel>;

  /** Record mojo change for a batter after at-bat */
  recordBatterMojo: (
    playerId: string,
    gameId: string,
    result: AtBatResult,
    rbiCount: number,
    situation: GameSituation
  ) => MojoChangeResult;

  /** Record mojo change for a pitcher after at-bat */
  recordPitcherMojo: (
    pitcherId: string,
    gameId: string,
    result: AtBatResult,
    situation: GameSituation,
    isCleanInning?: boolean,
  ) => MojoChangeResult;

  /** Record mojo change for a fielder after play */
  recordFielderMojo: (
    fielderId: string,
    gameId: string,
    isError: boolean,
    isGreatPlay: boolean,
    situation: GameSituation
  ) => MojoChangeResult;

  /** Get mojo display info for a player */
  getPlayerMojo: (playerId: string) => MojoDisplayInfo;

  /** Initialize a player's mojo (e.g., when entering game as sub) */
  initializePlayer: (playerId: string, startingMojo?: MojoLevel) => void;

  /** All mojo change events this game (for activity log) */
  mojoEvents: MojoChangeEvent[];
}

// ============================================
// HOOK IMPLEMENTATION
// ============================================

export function useMojoState(): UseMojoStateReturn {
  const [playerMojo, setPlayerMojo] = useState<Map<string, MojoLevel>>(new Map());
  const [mojoEvents, setMojoEvents] = useState<MojoChangeEvent[]>([]);

  /**
   * Ensure a player has an entry, defaulting to 0 (Normal)
   */
  const ensurePlayer = useCallback((map: Map<string, MojoLevel>, playerId: string): MojoLevel => {
    if (!map.has(playerId)) {
      map.set(playerId, 0);
    }
    return map.get(playerId)!;
  }, []);

  /**
   * Record batter mojo change after at-bat
   */
  const recordBatterMojo = useCallback((
    playerId: string,
    gameId: string,
    result: AtBatResult,
    rbiCount: number,
    situation: GameSituation
  ): MojoChangeResult => {
    const playResult: PlayResultForMojo = {
      type: 'BATTING',
      result,
      rbis: rbiCount,
    };

    const triggers = inferMojoTriggers(playResult);

    let changeResult: MojoChangeResult = {
      previousLevel: 0 as MojoLevel,
      newLevel: 0 as MojoLevel,
      triggers,
      events: [],
    };

    setPlayerMojo(prev => {
      const newMap = new Map(prev);
      const currentMojo = ensurePlayer(newMap, playerId);

      changeResult.previousLevel = currentMojo;

      if (triggers.length === 0) {
        changeResult.newLevel = currentMojo;
        return prev; // No change
      }

      const triggerInputs = triggers.map(t => ({ trigger: t, situation }));
      const { finalMojo, events } = processMojoTriggers(currentMojo, triggerInputs, gameId, playerId);

      newMap.set(playerId, finalMojo);
      changeResult.newLevel = finalMojo;
      changeResult.events = events;

      return newMap;
    });

    // Append events to history
    if (changeResult.events.length > 0) {
      setMojoEvents(prev => [...prev, ...changeResult.events]);
    }

    return changeResult;
  }, [ensurePlayer]);

  /**
   * Record pitcher mojo change after at-bat
   */
  const recordPitcherMojo = useCallback((
    pitcherId: string,
    gameId: string,
    result: AtBatResult,
    situation: GameSituation,
    isCleanInning?: boolean,
  ): MojoChangeResult => {
    const playResult: PlayResultForMojo = {
      type: 'PITCHING',
      result,
      isCleanInning,
    };

    const triggers = inferMojoTriggers(playResult);

    let changeResult: MojoChangeResult = {
      previousLevel: 0 as MojoLevel,
      newLevel: 0 as MojoLevel,
      triggers,
      events: [],
    };

    setPlayerMojo(prev => {
      const newMap = new Map(prev);
      const currentMojo = ensurePlayer(newMap, pitcherId);

      changeResult.previousLevel = currentMojo;

      if (triggers.length === 0) {
        changeResult.newLevel = currentMojo;
        return prev;
      }

      const triggerInputs = triggers.map(t => ({ trigger: t, situation }));
      const { finalMojo, events } = processMojoTriggers(currentMojo, triggerInputs, gameId, pitcherId);

      newMap.set(pitcherId, finalMojo);
      changeResult.newLevel = finalMojo;
      changeResult.events = events;

      return newMap;
    });

    if (changeResult.events.length > 0) {
      setMojoEvents(prev => [...prev, ...changeResult.events]);
    }

    return changeResult;
  }, [ensurePlayer]);

  /**
   * Record fielder mojo change
   */
  const recordFielderMojo = useCallback((
    fielderId: string,
    gameId: string,
    isError: boolean,
    isGreatPlay: boolean,
    situation: GameSituation
  ): MojoChangeResult => {
    const playResult: PlayResultForMojo = {
      type: 'FIELDING',
      result: isGreatPlay ? 'GREAT_PLAY' : (isError ? 'ERROR' : 'ROUTINE'),
      isError,
    };

    const triggers = inferMojoTriggers(playResult);

    let changeResult: MojoChangeResult = {
      previousLevel: 0 as MojoLevel,
      newLevel: 0 as MojoLevel,
      triggers,
      events: [],
    };

    setPlayerMojo(prev => {
      const newMap = new Map(prev);
      const currentMojo = ensurePlayer(newMap, fielderId);

      changeResult.previousLevel = currentMojo;

      if (triggers.length === 0) {
        changeResult.newLevel = currentMojo;
        return prev;
      }

      const triggerInputs = triggers.map(t => ({ trigger: t, situation }));
      const { finalMojo, events } = processMojoTriggers(currentMojo, triggerInputs, gameId, fielderId);

      newMap.set(fielderId, finalMojo);
      changeResult.newLevel = finalMojo;
      changeResult.events = events;

      return newMap;
    });

    if (changeResult.events.length > 0) {
      setMojoEvents(prev => [...prev, ...changeResult.events]);
    }

    return changeResult;
  }, [ensurePlayer]);

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
   * Initialize a player (e.g. substitute entering game)
   */
  const initializePlayer = useCallback((playerId: string, startingMojo: MojoLevel = 0) => {
    setPlayerMojo(prev => {
      const newMap = new Map(prev);
      newMap.set(playerId, startingMojo);
      return newMap;
    });
  }, []);

  return {
    playerMojo,
    recordBatterMojo,
    recordPitcherMojo,
    recordFielderMojo,
    getPlayerMojo,
    initializePlayer,
    mojoEvents,
  };
}
