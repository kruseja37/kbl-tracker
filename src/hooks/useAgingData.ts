/**
 * Aging Data Hook
 * Per Ralph Framework GAP-042
 *
 * Provides React hook for player aging calculations.
 * Includes development projections and retirement probability.
 */

import { useState, useCallback, useMemo } from 'react';
import {
  getCareerPhase,
  getCareerPhaseDisplayName,
  getCareerPhaseColor,
  calculateRetirementProbability,
  processEndOfSeasonAging,
  getYearsRemainingEstimate,
  type CareerPhase,
  type AgingResult,
} from '../engines/agingEngine';

// ============================================
// TYPES
// ============================================

export interface PlayerAgingInfo {
  playerId: string;
  playerName: string;
  currentAge: number;
  careerPhase: CareerPhase;
  careerPhaseDisplay: string;
  careerPhaseColor: string;
  yearsRemainingEstimate: string;
  retirementProbability: number;
  retirementPercentage: string; // Formatted as "5%"
}

export interface SeasonAgingResult {
  playerId: string;
  playerName: string;
  result: AgingResult;
}

export interface UseAgingDataReturn {
  // Queries (no state, just calculations)
  getPlayerAgingInfo: (
    playerId: string,
    playerName: string,
    age: number,
    overallRating: number,
    fame?: number
  ) => PlayerAgingInfo;

  // Batch processing
  processSeasonEnd: (
    players: {
      playerId: string;
      playerName: string;
      age: number;
      ratings: Record<string, number>;
      fame?: number;
      performanceModifier?: number;
    }[]
  ) => SeasonAgingResult[];

  // Get players likely to retire
  getRetirementCandidates: (
    players: { playerId: string; playerName: string; age: number; overallRating: number; fame?: number }[]
  ) => PlayerAgingInfo[];

  // Career phase helpers
  getCareerPhase: typeof getCareerPhase;
  getCareerPhaseDisplayName: typeof getCareerPhaseDisplayName;
  getCareerPhaseColor: typeof getCareerPhaseColor;
}

// ============================================
// HOOK
// ============================================

export function useAgingData(): UseAgingDataReturn {
  /**
   * Get detailed aging info for a player
   */
  const getPlayerAgingInfo = useCallback(
    (
      playerId: string,
      playerName: string,
      age: number,
      overallRating: number,
      fame: number = 0
    ): PlayerAgingInfo => {
      const careerPhase = getCareerPhase(age);
      const retirementProb = calculateRetirementProbability(age, overallRating, fame);

      return {
        playerId,
        playerName,
        currentAge: age,
        careerPhase,
        careerPhaseDisplay: getCareerPhaseDisplayName(careerPhase),
        careerPhaseColor: getCareerPhaseColor(careerPhase),
        yearsRemainingEstimate: getYearsRemainingEstimate(age),
        retirementProbability: retirementProb,
        retirementPercentage: `${Math.round(retirementProb * 100)}%`,
      };
    },
    []
  );

  /**
   * Process season end aging for multiple players
   */
  const processSeasonEnd = useCallback(
    (
      players: {
        playerId: string;
        playerName: string;
        age: number;
        ratings: Record<string, number>;
        fame?: number;
        performanceModifier?: number;
      }[]
    ): SeasonAgingResult[] => {
      return players.map((player) => ({
        playerId: player.playerId,
        playerName: player.playerName,
        result: processEndOfSeasonAging(
          player.age,
          player.ratings,
          player.fame || 0,
          player.performanceModifier || 0
        ),
      }));
    },
    []
  );

  /**
   * Get players with non-zero retirement probability
   */
  const getRetirementCandidates = useCallback(
    (
      players: {
        playerId: string;
        playerName: string;
        age: number;
        overallRating: number;
        fame?: number;
      }[]
    ): PlayerAgingInfo[] => {
      return players
        .filter((p) => p.age >= 35)
        .map((p) => getPlayerAgingInfo(p.playerId, p.playerName, p.age, p.overallRating, p.fame))
        .sort((a, b) => b.retirementProbability - a.retirementProbability);
    },
    [getPlayerAgingInfo]
  );

  return {
    getPlayerAgingInfo,
    processSeasonEnd,
    getRetirementCandidates,
    getCareerPhase,
    getCareerPhaseDisplayName,
    getCareerPhaseColor,
  };
}

export default useAgingData;
