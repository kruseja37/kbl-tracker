/**
 * useAgingData Hook
 * Per Ralph Framework S-F005, S-F006
 *
 * React hook for player aging, development tracking, and retirement.
 */

import { useState, useCallback, useMemo } from 'react';
import {
  // Types
  CareerPhase,
  type AgingResult,
  type AgeDisplayInfo,
  type DevelopmentPotential,
  type BatchAgingResult,

  // Functions
  getCareerPhase,
  getAgeDisplayInfo,
  calculateDevelopmentPotential,
  calculateRetirementProbability,
  shouldRetire,
  processEndOfSeasonAging,
  processTeamAging,
  getUpsideColor,
  formatRetirementRisk,
} from '../engines/agingIntegration';

// ============================================
// HOOK TYPES
// ============================================

export interface PlayerAgingState {
  playerId: string;
  age: number;
  overallRating: number;
  fame: number;
  displayInfo: AgeDisplayInfo;
  developmentPotential: DevelopmentPotential;
}

export interface UseAgingDataReturn {
  // Player tracking
  trackedPlayers: Map<string, PlayerAgingState>;

  // Individual player functions
  trackPlayer: (playerId: string, age: number, overallRating: number, fame?: number) => void;
  updatePlayer: (playerId: string, updates: Partial<{ age: number; overallRating: number; fame: number }>) => void;
  removePlayer: (playerId: string) => void;
  getPlayerAgingInfo: (playerId: string) => PlayerAgingState | null;

  // Career phase helpers
  getPhase: (age: number) => typeof CareerPhase[keyof typeof CareerPhase];
  getPhaseInfo: (playerId: string) => AgeDisplayInfo | null;

  // Development tracking
  getDevelopmentPotential: (playerId: string) => DevelopmentPotential | null;
  getPotentialColor: (upside: DevelopmentPotential['upside']) => string;

  // Retirement
  getRetirementProbability: (playerId: string) => number | null;
  checkShouldRetire: (playerId: string) => boolean;
  formatRetirementRisk: (probability: number) => string;

  // End of season processing
  processPlayerAging: (
    playerId: string,
    performanceModifier?: number
  ) => AgingResult | null;
  processAllAging: (performanceModifiers?: Map<string, number>) => BatchAgingResult;

  // Batch operations
  loadPlayers: (players: Array<{
    playerId: string;
    age: number;
    overallRating: number;
    fame?: number;
  }>) => void;
  clearPlayers: () => void;
}

// ============================================
// HOOK
// ============================================

export function useAgingData(): UseAgingDataReturn {
  // State
  const [trackedPlayers, setTrackedPlayers] = useState<Map<string, PlayerAgingState>>(new Map());

  // Track a player
  const trackPlayer = useCallback((
    playerId: string,
    age: number,
    overallRating: number,
    fame: number = 0
  ) => {
    const displayInfo = getAgeDisplayInfo(age, overallRating, fame);
    const developmentPotential = calculateDevelopmentPotential(age, overallRating);

    setTrackedPlayers(prev => {
      const newMap = new Map(prev);
      newMap.set(playerId, {
        playerId,
        age,
        overallRating,
        fame,
        displayInfo,
        developmentPotential,
      });
      return newMap;
    });
  }, []);

  // Update a player
  const updatePlayer = useCallback((
    playerId: string,
    updates: Partial<{ age: number; overallRating: number; fame: number }>
  ) => {
    setTrackedPlayers(prev => {
      const player = prev.get(playerId);
      if (!player) return prev;

      const newAge = updates.age ?? player.age;
      const newRating = updates.overallRating ?? player.overallRating;
      const newFame = updates.fame ?? player.fame;

      const displayInfo = getAgeDisplayInfo(newAge, newRating, newFame);
      const developmentPotential = calculateDevelopmentPotential(newAge, newRating);

      const newMap = new Map(prev);
      newMap.set(playerId, {
        ...player,
        age: newAge,
        overallRating: newRating,
        fame: newFame,
        displayInfo,
        developmentPotential,
      });
      return newMap;
    });
  }, []);

  // Remove a player
  const removePlayer = useCallback((playerId: string) => {
    setTrackedPlayers(prev => {
      const newMap = new Map(prev);
      newMap.delete(playerId);
      return newMap;
    });
  }, []);

  // Get player aging info
  const getPlayerAgingInfo = useCallback((playerId: string): PlayerAgingState | null => {
    return trackedPlayers.get(playerId) || null;
  }, [trackedPlayers]);

  // Get career phase
  const getPhase = useCallback((age: number) => {
    return getCareerPhase(age);
  }, []);

  // Get phase info for a player
  const getPhaseInfo = useCallback((playerId: string): AgeDisplayInfo | null => {
    const player = trackedPlayers.get(playerId);
    return player?.displayInfo || null;
  }, [trackedPlayers]);

  // Get development potential for a player
  const getDevelopmentPotentialFn = useCallback((playerId: string): DevelopmentPotential | null => {
    const player = trackedPlayers.get(playerId);
    return player?.developmentPotential || null;
  }, [trackedPlayers]);

  // Get upside color
  const getPotentialColor = useCallback((upside: DevelopmentPotential['upside']): string => {
    return getUpsideColor(upside);
  }, []);

  // Get retirement probability
  const getRetirementProbability = useCallback((playerId: string): number | null => {
    const player = trackedPlayers.get(playerId);
    if (!player) return null;
    return calculateRetirementProbability(player.age, player.overallRating, player.fame);
  }, [trackedPlayers]);

  // Check if should retire
  const checkShouldRetire = useCallback((playerId: string): boolean => {
    const player = trackedPlayers.get(playerId);
    if (!player) return false;
    return shouldRetire(player.age, player.overallRating, player.fame);
  }, [trackedPlayers]);

  // Process player aging
  const processPlayerAging = useCallback((
    playerId: string,
    performanceModifier: number = 0
  ): AgingResult | null => {
    const player = trackedPlayers.get(playerId);
    if (!player) return null;

    // Legacy API expects ratings as Record<string, number>
    const result = processEndOfSeasonAging(
      player.age,
      { overall: player.overallRating },
      player.fame,
      performanceModifier
    );

    // Calculate new overall rating from rating changes
    const totalChange = result.ratingChanges.reduce((sum, rc) => sum + rc.change, 0);
    const newRating = player.overallRating + totalChange;

    // Update the player state
    if (!result.shouldRetire) {
      updatePlayer(playerId, {
        age: result.newAge,
        overallRating: newRating,
      });
    }

    return result;
  }, [trackedPlayers, updatePlayer]);

  // Process all aging
  const processAllAging = useCallback((
    performanceModifiers: Map<string, number> = new Map()
  ): BatchAgingResult => {
    const players = Array.from(trackedPlayers.values()).map(p => ({
      playerId: p.playerId,
      currentAge: p.age,
      overallRating: p.overallRating,
      fame: p.fame,
      performanceModifier: performanceModifiers.get(p.playerId) || 0,
    }));

    const result = processTeamAging(players);

    // Update all players
    result.playerResults.forEach((agingResult, playerId) => {
      const player = trackedPlayers.get(playerId);
      if (!player) return;

      // Calculate new rating from rating changes
      const totalChange = agingResult.ratingChanges.reduce((sum, rc) => sum + rc.change, 0);
      const newRating = player.overallRating + totalChange;

      if (!agingResult.shouldRetire) {
        updatePlayer(playerId, {
          age: agingResult.newAge,
          overallRating: newRating,
        });
      } else {
        removePlayer(playerId);
      }
    });

    return result;
  }, [trackedPlayers, updatePlayer, removePlayer]);

  // Load players
  const loadPlayers = useCallback((players: Array<{
    playerId: string;
    age: number;
    overallRating: number;
    fame?: number;
  }>) => {
    const newMap = new Map<string, PlayerAgingState>();

    for (const player of players) {
      const fame = player.fame || 0;
      const displayInfo = getAgeDisplayInfo(player.age, player.overallRating, fame);
      const developmentPotential = calculateDevelopmentPotential(player.age, player.overallRating);

      newMap.set(player.playerId, {
        playerId: player.playerId,
        age: player.age,
        overallRating: player.overallRating,
        fame,
        displayInfo,
        developmentPotential,
      });
    }

    setTrackedPlayers(newMap);
  }, []);

  // Clear players
  const clearPlayers = useCallback(() => {
    setTrackedPlayers(new Map());
  }, []);

  return {
    trackedPlayers,
    trackPlayer,
    updatePlayer,
    removePlayer,
    getPlayerAgingInfo,
    getPhase,
    getPhaseInfo,
    getDevelopmentPotential: getDevelopmentPotentialFn,
    getPotentialColor,
    getRetirementProbability,
    checkShouldRetire,
    formatRetirementRisk,
    processPlayerAging,
    processAllAging,
    loadPlayers,
    clearPlayers,
  };
}

export default useAgingData;
