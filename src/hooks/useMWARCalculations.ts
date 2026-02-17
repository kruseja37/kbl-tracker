/**
 * useMWARCalculations Hook
 * Per IMPLEMENTATION_PLAN.md v5 - Day 2: Wire mWAR Calculator
 *
 * Tracks manager decisions and calculates mWAR.
 * Auto-detects decisions from game events (pitching changes, pinch hitters, etc.)
 */

import { useState, useCallback, useMemo } from 'react';
import {
  createManagerDecision,
  resolveDecision,
  calculateSeasonMWAR,
  createManagerSeasonStats,
  addDecisionToSeasonStats,
  recalculateSeasonStats,
  getMWARRating,
  formatMWAR,
  getMWARColor,
  type DecisionType,
  type DecisionOutcome,
  type ManagerDecision,
  type ManagerSeasonStats,
  type MWARResult,
} from '../engines/mwarCalculator';
import type { GameStateForLI } from '../engines/leverageCalculator';
import type { HalfInning } from '../types/game';

// ============================================
// TYPES
// ============================================

export interface ManagerDecisionInput {
  decisionType: DecisionType;
  gameId: string;
  managerId: string;
  gameState: {
    inning: number;
    halfInning: HalfInning;
    outs: number;
    runners: { first: boolean; second: boolean; third: boolean };
    homeScore: number;
    awayScore: number;
  };
  involvedPlayers?: string[];
  notes?: string;
}

export interface DecisionResolutionInput {
  decisionId: string;
  outcome: DecisionOutcome;
}

export interface ManagerMWARDisplay {
  managerId: string;
  teamId: string;
  mWAR: number;
  mWARFormatted: string;
  rating: string;
  color: string;
  decisionCount: number;
  successRate: number;
  decisionWAR: number;
  overperformanceWAR: number;
}

export interface UseMWARCalculationsReturn {
  // Data
  managerStats: Map<string, ManagerSeasonStats>;
  pendingDecisions: ManagerDecision[];

  // Actions
  recordDecision: (input: ManagerDecisionInput) => string; // Returns decisionId
  resolveDecisionOutcome: (input: DecisionResolutionInput) => void;
  updateTeamRecord: (managerId: string, wins: number, losses: number, salaryScore: number) => void;

  // Getters
  getManagerMWAR: (managerId: string) => ManagerMWARDisplay | null;
  getMWARLeaderboard: () => ManagerMWARDisplay[];

  // State
  lastUpdated: number;
}

// ============================================
// DEFAULT VALUES
// ============================================

const DEFAULT_SEASON_GAMES = 50; // SMB4 default
const DEFAULT_SALARY_SCORE = 0.5; // Average team

// ============================================
// HOOK IMPLEMENTATION
// ============================================

export function useMWARCalculations(seasonId: string = 'current'): UseMWARCalculationsReturn {
  const [managerStats, setManagerStats] = useState<Map<string, ManagerSeasonStats>>(new Map());
  const [pendingDecisions, setPendingDecisions] = useState<ManagerDecision[]>([]);
  const [lastUpdated, setLastUpdated] = useState(Date.now());

  /**
   * Ensure manager has stats entry
   */
  const ensureManagerStats = useCallback((managerId: string, teamId: string = 'unknown') => {
    setManagerStats(prev => {
      if (prev.has(managerId)) return prev;

      const newStats = new Map(prev);
      newStats.set(managerId, createManagerSeasonStats(seasonId, managerId, teamId));
      return newStats;
    });
  }, [seasonId]);

  /**
   * Record a manager decision
   */
  const recordDecision = useCallback((input: ManagerDecisionInput): string => {
    const { decisionType, gameId, managerId, gameState, involvedPlayers, notes } = input;

    // Convert game state for decision creation
    const liGameState: GameStateForLI = {
      inning: gameState.inning,
      halfInning: gameState.halfInning,
      outs: gameState.outs as 0 | 1 | 2,
      runners: gameState.runners,
      homeScore: gameState.homeScore,
      awayScore: gameState.awayScore,
    };

    // Create the decision
    const decision = createManagerDecision(
      gameId,
      managerId,
      decisionType,
      liGameState,
      'auto',
      involvedPlayers ?? [],
      notes
    );

    // Add to pending decisions (awaiting resolution)
    setPendingDecisions(prev => [...prev, decision]);

    // Ensure manager has stats
    ensureManagerStats(managerId);

    setLastUpdated(Date.now());

    return decision.decisionId;
  }, [ensureManagerStats]);

  /**
   * Resolve a pending decision with its outcome
   */
  const resolveDecisionOutcome = useCallback((input: DecisionResolutionInput) => {
    const { decisionId, outcome } = input;

    setPendingDecisions(prev => {
      const decisionIndex = prev.findIndex(d => d.decisionId === decisionId);
      if (decisionIndex === -1) return prev;

      const decision = prev[decisionIndex];
      const resolvedDecision = resolveDecision(decision, outcome);

      // Add resolved decision to manager stats
      setManagerStats(prevStats => {
        const newStats = new Map(prevStats);
        const managerStat = newStats.get(decision.managerId);

        if (managerStat) {
          const nextManagerStat = structuredClone(managerStat);
          addDecisionToSeasonStats(nextManagerStat, resolvedDecision);
          newStats.set(decision.managerId, nextManagerStat);
        }

        return newStats;
      });

      // Remove from pending
      return prev.filter((_, i) => i !== decisionIndex);
    });

    setLastUpdated(Date.now());
  }, []);

  /**
   * Update team record for mWAR calculation
   */
  const updateTeamRecord = useCallback((
    managerId: string,
    wins: number,
    losses: number,
    salaryScore: number = DEFAULT_SALARY_SCORE
  ) => {
    setManagerStats(prev => {
      const newStats = new Map(prev);
      const managerStat = newStats.get(managerId);

      if (managerStat) {
        const nextManagerStat = structuredClone(managerStat);
        const teamStats = { wins, losses, salaryScore };
        recalculateSeasonStats(nextManagerStat, teamStats, DEFAULT_SEASON_GAMES);
        newStats.set(managerId, nextManagerStat);
      }

      return newStats;
    });

    setLastUpdated(Date.now());
  }, []);

  /**
   * Get display data for a manager's mWAR
   */
  const getManagerMWAR = useCallback((managerId: string): ManagerMWARDisplay | null => {
    const stats = managerStats.get(managerId);
    if (!stats) return null;

    return {
      managerId,
      teamId: stats.teamId,
      mWAR: stats.mWAR,
      mWARFormatted: formatMWAR(stats.mWAR),
      rating: getMWARRating(stats.mWAR),
      color: getMWARColor(getMWARRating(stats.mWAR)),
      decisionCount: stats.decisionCounts.total,
      successRate: stats.decisionCounts.total > 0
        ? stats.decisionCounts.successes / stats.decisionCounts.total
        : 0,
      decisionWAR: stats.decisionWAR,
      overperformanceWAR: stats.overperformanceWAR,
    };
  }, [managerStats]);

  /**
   * Get mWAR leaderboard (sorted by mWAR)
   */
  const getMWARLeaderboard = useCallback((): ManagerMWARDisplay[] => {
    const displays: ManagerMWARDisplay[] = [];

    managerStats.forEach((stats, managerId) => {
      displays.push({
        managerId,
        teamId: stats.teamId,
        mWAR: stats.mWAR,
        mWARFormatted: formatMWAR(stats.mWAR),
        rating: getMWARRating(stats.mWAR),
        color: getMWARColor(getMWARRating(stats.mWAR)),
        decisionCount: stats.decisionCounts.total,
        successRate: stats.decisionCounts.total > 0
          ? stats.decisionCounts.successes / stats.decisionCounts.total
          : 0,
        decisionWAR: stats.decisionWAR,
        overperformanceWAR: stats.overperformanceWAR,
      });
    });

    // Sort by mWAR (descending)
    displays.sort((a, b) => b.mWAR - a.mWAR);

    return displays;
  }, [managerStats]);

  return {
    managerStats,
    pendingDecisions,
    recordDecision,
    resolveDecisionOutcome,
    updateTeamRecord,
    getManagerMWAR,
    getMWARLeaderboard,
    lastUpdated,
  };
}

// ============================================
// HELPER: Auto-detect decision type from game events
// ============================================

/**
 * Detect decision type from game event
 */
export function detectDecisionType(event: string): DecisionType | null {
  const eventMapping: Record<string, DecisionType> = {
    'PITCH_CHANGE': 'pitching_change',
    'PINCH_HIT': 'pinch_hitter',
    'PINCH_RUN': 'pinch_runner',
    'DEF_SUB': 'defensive_sub',
    'IBB': 'intentional_walk',
  };

  return eventMapping[event] ?? null;
}

/**
 * Determine outcome based on subsequent at-bat result (for pinch hitters)
 */
export function evaluatePinchHitterOutcome(result: string): DecisionOutcome {
  const successResults = ['1B', '2B', '3B', 'HR', 'BB', 'HBP', 'SF', 'SAC'];
  const failureResults = ['K', 'KL', 'DP'];

  if (successResults.includes(result)) return 'success';
  if (failureResults.includes(result)) return 'failure';
  return 'neutral'; // GO, FO, LO, PO, E, FC
}
