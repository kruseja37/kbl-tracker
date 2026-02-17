/**
 * useMWARCalculations Hook
 * Per MWAR_CALCULATION_SPEC.md
 *
 * React hook for tracking manager decisions and calculating mWAR.
 * Provides Manager Moment prompts at high-leverage situations.
 */

import { useState, useCallback, useMemo } from 'react';
import {
  // Types
  type DecisionType,
  type DecisionOutcome,
  type ManagerDecision,
  type ManagerSeasonStats,
  type GameManagerStats,
  type ManagerMomentState,

  // Constants
  HIGH_LEVERAGE_THRESHOLD,

  // Functions
  createManagerDecision,
  resolveDecision,
  checkManagerMoment,
  createGameMWARState,
  recordManagerDecision,
  getMWARDisplayInfo,
  getLITierDescription,
  getLIColor,
  shouldShowManagerMoment,
  createManagerSeasonStats,
  addDecisionToSeasonStats,
  formatMWAR,
  getMWARRating,
} from '../engines/mwarIntegration';

import { getLeverageIndex, type GameStateForLI } from '../../../engines/leverageCalculator';

// ============================================
// HOOK TYPES
// ============================================

export interface UseMWARCalculationsReturn {
  // Current state
  gameStats: GameManagerStats | null;
  seasonStats: ManagerSeasonStats | null;
  managerMoment: ManagerMomentState;

  // Actions
  initializeGame: (gameId: string, managerId: string) => void;
  initializeSeason: (seasonId: string, managerId: string, teamId: string) => void;
  recordDecision: (
    decisionType: DecisionType,
    gameState: GameStateForLI,
    involvedPlayers: string[],
    notes?: string
  ) => string;  // Returns decisionId
  resolveDecisionOutcome: (decisionId: string, outcome: DecisionOutcome) => void;
  checkForManagerMoment: (gameState: GameStateForLI) => void;
  dismissManagerMoment: () => void;

  // Display helpers
  getCurrentLI: (gameState: GameStateForLI) => number;
  formatCurrentMWAR: () => string;
  getMWARStatus: () => { rating: string; color: string };
  getLIDisplay: (li: number) => { tier: string; color: string };
}

// ============================================
// HOOK
// ============================================

export function useMWARCalculations(
  initialSeasonId?: string,
  initialManagerId?: string,
  initialTeamId?: string
): UseMWARCalculationsReturn {
  // State
  const [gameStats, setGameStats] = useState<GameManagerStats | null>(null);
  const [seasonStats, setSeasonStats] = useState<ManagerSeasonStats | null>(() => {
    if (initialSeasonId && initialManagerId && initialTeamId) {
      return createManagerSeasonStats(initialSeasonId, initialManagerId, initialTeamId);
    }
    return null;
  });
  const [managerMoment, setManagerMoment] = useState<ManagerMomentState>({
    isTriggered: false,
    leverageIndex: 0,
    decisionType: null,
    context: '',
  });
  const [pendingDecisions, setPendingDecisions] = useState<Map<string, ManagerDecision>>(new Map());

  // Initialize game-level tracking
  const initializeGame = useCallback((gameId: string, managerId: string) => {
    const newGameStats = createGameMWARState(gameId, managerId);
    setGameStats(newGameStats);
    setPendingDecisions(new Map());
  }, []);

  // Initialize season-level tracking
  const initializeSeason = useCallback((seasonId: string, managerId: string, teamId: string) => {
    const newSeasonStats = createManagerSeasonStats(seasonId, managerId, teamId);
    setSeasonStats(newSeasonStats);
  }, []);

  // Record a new decision
  const recordDecision = useCallback((
    decisionType: DecisionType,
    gameState: GameStateForLI,
    involvedPlayers: string[],
    notes?: string
  ): string => {
    if (!gameStats) {
      console.warn('[useMWARCalculations] No game initialized');
      return '';
    }

    // NOTE: createManagerDecision calculates LI internally from gameState
    // Signature: createManagerDecision(gameId, managerId, decisionType, gameState, inferenceMethod, involvedPlayers, notes)
    const decision = createManagerDecision(
      gameStats.gameId,
      gameStats.managerId,
      decisionType,
      gameState,  // Pass gameState directly - function calculates LI internally
      'auto',     // inferenceMethod
      involvedPlayers,
      notes
    );

    // Add to pending decisions
    setPendingDecisions(prev => {
      const newMap = new Map(prev);
      newMap.set(decision.decisionId, decision);
      return newMap;
    });

    // Update game stats immutably before calling mutating helper
    setGameStats(prev => {
      if (!prev) return null;
      const nextGameStats = structuredClone(prev);
      return recordManagerDecision(nextGameStats, decision);
    });

    return decision.decisionId;
  }, [gameStats]);

  // Resolve a pending decision
  const resolveDecisionOutcome = useCallback((decisionId: string, outcome: DecisionOutcome) => {
    const decision = pendingDecisions.get(decisionId);
    if (!decision) {
      console.warn(`[useMWARCalculations] Decision ${decisionId} not found`);
      return;
    }

    const resolvedDecision = resolveDecision(decision, outcome);

    // Update pending decisions
    setPendingDecisions(prev => {
      const newMap = new Map(prev);
      newMap.delete(decisionId);
      return newMap;
    });

    // Update season stats immutably before calling mutating helper
    setSeasonStats(prev => {
      if (!prev) return null;
      const nextSeasonStats = structuredClone(prev);
      addDecisionToSeasonStats(nextSeasonStats, resolvedDecision);
      return nextSeasonStats;
    });
  }, [pendingDecisions]);

  // Check for Manager Moment
  const checkForManagerMoment = useCallback((gameState: GameStateForLI) => {
    const moment = checkManagerMoment(gameState);
    setManagerMoment(moment);
  }, []);

  // Dismiss Manager Moment prompt
  const dismissManagerMoment = useCallback(() => {
    setManagerMoment({
      isTriggered: false,
      leverageIndex: managerMoment.leverageIndex,
      decisionType: null,
      context: '',
    });
  }, [managerMoment.leverageIndex]);

  // Get current LI
  const getCurrentLI = useCallback((gameState: GameStateForLI): number => {
    return getLeverageIndex(gameState);
  }, []);

  // Format current mWAR
  const formatCurrentMWAR = useCallback((): string => {
    if (!seasonStats) return '+0.00';
    return formatMWAR(seasonStats.mWAR);
  }, [seasonStats]);

  // Get mWAR status
  const getMWARStatus = useCallback((): { rating: string; color: string } => {
    if (!seasonStats) {
      return { rating: 'N/A', color: '#6b7280' };
    }
    const info = getMWARDisplayInfo(seasonStats.mWAR);
    return { rating: info.rating, color: info.color };
  }, [seasonStats]);

  // Get LI display info
  const getLIDisplay = useCallback((li: number): { tier: string; color: string } => {
    return {
      tier: getLITierDescription(li),
      color: getLIColor(li),
    };
  }, []);

  return {
    gameStats,
    seasonStats,
    managerMoment,
    initializeGame,
    initializeSeason,
    recordDecision,
    resolveDecisionOutcome,
    checkForManagerMoment,
    dismissManagerMoment,
    getCurrentLI,
    formatCurrentMWAR,
    getMWARStatus,
    getLIDisplay,
  };
}

export default useMWARCalculations;
