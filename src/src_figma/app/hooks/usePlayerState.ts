/**
 * usePlayerState Hook
 *
 * Per FIGMA_IMPLEMENTATION_PLAN.md Phase 5
 *
 * Provides unified player state management for Mojo, Fitness, and Clutch.
 * Handles state changes, notifications, and stat adjustments.
 */

import { useState, useCallback, useMemo } from 'react';
import type { MojoLevel, MojoTrigger, GameSituation } from '../../../engines/mojoEngine';
import type { FitnessState, GameActivity, PlayerPosition } from '../../../engines/fitnessEngine';
import {
  createCombinedPlayerState,
  adjustBattingStats,
  adjustPitchingStats,
  getStateBadge,
  getMultiplierIndicator,
  formatMultiplier,
  detectStateChanges,
  createGamePlayerState,
  updateGamePlayerState,
  type CombinedPlayerState,
  type BattingStats,
  type PitchingStats,
  type StateChangeNotification,
  type GamePlayerState,

  // Mojo functions
  clampMojo,
  getMojoDelta,
  applyMojoChange,
  calculateStartingMojo,
  getMojoStatMultiplier,

  // Fitness functions
  createFitnessProfile,
  applyFitnessDecay,
  applyRecovery,
  calculateInjuryRisk,
  getFitnessStatMultiplier,
  type PlayerFitnessProfile,
  type InjuryRisk,
} from '../engines/playerStateIntegration';

// ============================================
// HOOK TYPES
// ============================================

export interface PlayerStateData {
  playerId: string;
  playerName: string;
  position: PlayerPosition;
  gameState: GamePlayerState;
  fitnessProfile: PlayerFitnessProfile;
  combinedState: CombinedPlayerState;
  injuryRisk: InjuryRisk;
}

export interface UsePlayerStateOptions {
  gameId: string;
  isPlayoffs?: boolean;
}

// ============================================
// HOOK: usePlayerState
// ============================================

export function usePlayerState(options: UsePlayerStateOptions) {
  const { gameId, isPlayoffs = false } = options;

  // Player state map
  const [players, setPlayers] = useState<Map<string, PlayerStateData>>(new Map());

  // Notifications queue
  const [notifications, setNotifications] = useState<StateChangeNotification[]>([]);

  /**
   * Register a player for state tracking
   */
  const registerPlayer = useCallback((
    playerId: string,
    playerName: string,
    position: PlayerPosition,
    startingMojo: MojoLevel = 0,
    startingFitness: FitnessState = 'FIT',
    traits: string[] = [],
    age: number = 25
  ) => {
    setPlayers(prev => {
      const newMap = new Map(prev);

      const fitnessProfile = createFitnessProfile(
        playerId,
        position,
        traits,
        age,
        startingFitness
      );

      const gameState = createGamePlayerState(playerId, startingMojo, startingFitness);

      const combinedState = createCombinedPlayerState(
        playerId,
        playerName,
        startingMojo,
        fitnessProfile
      );

      const injuryRisk = calculateInjuryRisk(fitnessProfile);

      newMap.set(playerId, {
        playerId,
        playerName,
        position,
        gameState,
        fitnessProfile,
        combinedState,
        injuryRisk,
      });

      return newMap;
    });
  }, []);

  /**
   * Update player Mojo based on a trigger
   */
  const updateMojo = useCallback((
    playerId: string,
    trigger: MojoTrigger,
    situation?: GameSituation
  ) => {
    setPlayers(prev => {
      const player = prev.get(playerId);
      if (!player) return prev;

      const { newMojo, actualDelta } = applyMojoChange(
        player.gameState.currentMojo,
        trigger,
        situation
      );

      if (actualDelta === 0) return prev;

      // Detect state changes for notifications
      const changes = detectStateChanges(
        playerId,
        player.playerName,
        player.gameState.currentMojo,
        newMojo,
        player.gameState.currentFitness,
        player.gameState.currentFitness
      );

      if (changes.length > 0) {
        setNotifications(n => [...n, ...changes]);
      }

      // Update state
      const newGameState = updateGamePlayerState(player.gameState, { newMojo });

      const newCombinedState = createCombinedPlayerState(
        playerId,
        player.playerName,
        newMojo,
        player.fitnessProfile
      );

      const newMap = new Map(prev);
      newMap.set(playerId, {
        ...player,
        gameState: newGameState,
        combinedState: newCombinedState,
      });

      return newMap;
    });
  }, []);

  /**
   * Update player Fitness after game activity
   */
  const updateFitness = useCallback((
    playerId: string,
    activity: GameActivity,
    gameDate: string
  ) => {
    setPlayers(prev => {
      const player = prev.get(playerId);
      if (!player) return prev;

      const previousFitness = player.fitnessProfile.currentFitness;
      const newFitnessProfile = applyFitnessDecay(
        player.fitnessProfile,
        activity,
        gameDate
      );

      // Detect state changes
      const changes = detectStateChanges(
        playerId,
        player.playerName,
        player.gameState.currentMojo,
        player.gameState.currentMojo,
        previousFitness,
        newFitnessProfile.currentFitness
      );

      if (changes.length > 0) {
        setNotifications(n => [...n, ...changes]);
      }

      // Update state
      const newGameState = updateGamePlayerState(player.gameState, {
        newFitness: newFitnessProfile.currentFitness,
        addedInnings: activity.inningsPlayed,
        addedPitches: activity.pitchCount,
      });

      const newCombinedState = createCombinedPlayerState(
        playerId,
        player.playerName,
        player.gameState.currentMojo,
        newFitnessProfile
      );

      const newInjuryRisk = calculateInjuryRisk(newFitnessProfile);

      const newMap = new Map(prev);
      newMap.set(playerId, {
        ...player,
        gameState: newGameState,
        fitnessProfile: newFitnessProfile,
        combinedState: newCombinedState,
        injuryRisk: newInjuryRisk,
      });

      return newMap;
    });
  }, []);

  /**
   * Apply rest day recovery
   */
  const applyRestRecovery = useCallback((
    playerId: string,
    date: string
  ) => {
    setPlayers(prev => {
      const player = prev.get(playerId);
      if (!player) return prev;

      const previousFitness = player.fitnessProfile.currentFitness;
      const newFitnessProfile = applyRecovery(player.fitnessProfile, date);

      // Detect recovery notifications
      const changes = detectStateChanges(
        playerId,
        player.playerName,
        player.gameState.currentMojo,
        player.gameState.currentMojo,
        previousFitness,
        newFitnessProfile.currentFitness
      );

      if (changes.length > 0) {
        setNotifications(n => [...n, ...changes]);
      }

      // Update state
      const newCombinedState = createCombinedPlayerState(
        playerId,
        player.playerName,
        player.gameState.currentMojo,
        newFitnessProfile
      );

      const newInjuryRisk = calculateInjuryRisk(newFitnessProfile);

      const newMap = new Map(prev);
      newMap.set(playerId, {
        ...player,
        fitnessProfile: newFitnessProfile,
        combinedState: newCombinedState,
        injuryRisk: newInjuryRisk,
      });

      return newMap;
    });
  }, []);

  /**
   * Get adjusted stats for a player
   */
  const getAdjustedBattingStats = useCallback((
    playerId: string,
    baseStats: BattingStats
  ): BattingStats | null => {
    const player = players.get(playerId);
    if (!player) return null;

    return adjustBattingStats(
      baseStats,
      player.gameState.currentMojo,
      player.gameState.currentFitness
    );
  }, [players]);

  /**
   * Get adjusted pitching stats for a player
   */
  const getAdjustedPitchingStats = useCallback((
    playerId: string,
    baseStats: PitchingStats
  ): PitchingStats | null => {
    const player = players.get(playerId);
    if (!player) return null;

    return adjustPitchingStats(
      baseStats,
      player.gameState.currentMojo,
      player.gameState.currentFitness
    );
  }, [players]);

  /**
   * Get player state data
   */
  const getPlayer = useCallback((playerId: string): PlayerStateData | undefined => {
    return players.get(playerId);
  }, [players]);

  /**
   * Get all players
   */
  const getAllPlayers = useCallback((): PlayerStateData[] => {
    return Array.from(players.values());
  }, [players]);

  /**
   * Dismiss a notification
   */
  const dismissNotification = useCallback((index: number) => {
    setNotifications(prev => prev.filter((_, i) => i !== index));
  }, []);

  /**
   * Clear all notifications
   */
  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  /**
   * Calculate next game starting Mojo for all players
   */
  const calculateCarryover = useCallback((): Map<string, MojoLevel> => {
    const carryover = new Map<string, MojoLevel>();

    players.forEach((player, playerId) => {
      const startingMojo = calculateStartingMojo(player.gameState.currentMojo);
      carryover.set(playerId, startingMojo);
    });

    return carryover;
  }, [players]);

  /**
   * Reset all player states for new game
   */
  const resetForNewGame = useCallback((
    newGameId: string,
    mojoCarryover?: Map<string, MojoLevel>
  ) => {
    setPlayers(prev => {
      const newMap = new Map<string, PlayerStateData>();

      prev.forEach((player, playerId) => {
        const startingMojo = mojoCarryover?.get(playerId) ?? calculateStartingMojo(player.gameState.currentMojo);

        const newGameState = createGamePlayerState(
          playerId,
          startingMojo,
          player.fitnessProfile.currentFitness
        );

        const newCombinedState = createCombinedPlayerState(
          playerId,
          player.playerName,
          startingMojo,
          player.fitnessProfile
        );

        newMap.set(playerId, {
          ...player,
          gameState: newGameState,
          combinedState: newCombinedState,
        });
      });

      return newMap;
    });

    setNotifications([]);
  }, []);

  return {
    // State
    players,
    notifications,

    // Player management
    registerPlayer,
    getPlayer,
    getAllPlayers,

    // State updates
    updateMojo,
    updateFitness,
    applyRestRecovery,

    // Stats
    getAdjustedBattingStats,
    getAdjustedPitchingStats,

    // Notifications
    dismissNotification,
    clearNotifications,

    // Game management
    calculateCarryover,
    resetForNewGame,

    // Utility re-exports
    getStateBadge,
    getMultiplierIndicator,
    formatMultiplier,
  };
}

// ============================================
// RE-EXPORT TYPES AND UTILITIES
// ============================================

export type {
  CombinedPlayerState,
  BattingStats,
  PitchingStats,
  StateChangeNotification,
  GamePlayerState,
};

export {
  getStateBadge,
  getMultiplierIndicator,
  formatMultiplier,
};
