/**
 * Aging Data Hook
 * Per Ralph Framework GAP-042
 *
 * Provides React hook for player age and retirement display.
 */

import { useCallback } from 'react';
import {
  getCareerPhase,
  getCareerPhaseDisplayName,
  getCareerPhaseColor,
  calculateRetirementProbability,
  getYearsRemainingEstimate,
  type CareerPhase,
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

export interface UseAgingDataReturn {
  // Queries (no state, just calculations)
  getPlayerAgingInfo: (
    playerId: string,
    playerName: string,
    age: number,
    overallRating: number,
    fame?: number
  ) => PlayerAgingInfo;

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
    getRetirementCandidates,
    getCareerPhase,
    getCareerPhaseDisplayName,
    getCareerPhaseColor,
  };
}

export default useAgingData;
