/**
 * Offseason Phase Hook
 * Per Ralph Framework GAP-050
 *
 * Manages offseason phase progression state.
 * Enforces sequential completion order.
 */

import { useState, useCallback, useMemo } from 'react';

// ============================================
// TYPES
// ============================================

export interface OffseasonPhaseState {
  currentPhase: number;
  completedPhases: number[];
  seasonId: string;
}

export interface UseOffseasonPhaseReturn {
  // State
  currentPhase: number;
  completedPhases: number[];

  // Queries
  isPhaseAccessible: (phaseId: number) => boolean;
  isPhaseCompleted: (phaseId: number) => boolean;
  isPhaseLocked: (phaseId: number) => boolean;
  getNextPhase: () => number | null;
  getProgress: () => { completed: number; total: number; percentage: number };

  // Actions
  completePhase: (phaseId: number) => void;
  goToPhase: (phaseId: number) => boolean;
  resetOffseason: () => void;
}

// ============================================
// CONSTANTS
// ============================================

// Offseason phases - 11 phases per OFFSEASON_SYSTEM_SPEC.md §2
export const OFFSEASON_PHASES = {
  STANDINGS_FINAL: 1,
  AWARDS: 2,
  RATINGS_ADJUSTMENTS: 3,
  CONTRACTION_EXPANSION: 4,
  RETIREMENTS: 5,
  FREE_AGENCY: 6,
  DRAFT: 7,
  FARM_RECONCILIATION: 8,
  CHEMISTRY_REBALANCING: 9,
  TRADES: 10,
  SPRING_TRAINING: 11,
} as const;

export const TOTAL_PHASES = 11;

export const PHASE_NAMES: Record<number, string> = {
  1: 'Finalize Standings',
  2: 'Awards Ceremony',
  3: 'Ratings & Manager Bonuses',
  4: 'Contraction/Expansion',
  5: 'Retirements',
  6: 'Free Agency',
  7: 'Draft',
  8: 'Farm System Reconciliation',
  9: 'Chemistry Rebalancing',
  10: 'Trades',
  11: 'Spring Training',
};

// ============================================
// HOOK
// ============================================

export function useOffseasonPhase(initialPhase: number = 1): UseOffseasonPhaseReturn {
  const [currentPhase, setCurrentPhase] = useState(initialPhase);
  const [completedPhases, setCompletedPhases] = useState<number[]>([]);

  /**
   * Check if a phase is accessible (completed or current unlocked)
   */
  const isPhaseAccessible = useCallback(
    (phaseId: number): boolean => {
      // Completed phases are always accessible
      if (completedPhases.includes(phaseId)) return true;

      // Next phase after highest completed is accessible
      const highestCompleted = Math.max(...completedPhases, 0);
      return phaseId === highestCompleted + 1;
    },
    [completedPhases]
  );

  /**
   * Check if phase is completed
   */
  const isPhaseCompleted = useCallback(
    (phaseId: number): boolean => completedPhases.includes(phaseId),
    [completedPhases]
  );

  /**
   * Check if phase is locked
   */
  const isPhaseLocked = useCallback(
    (phaseId: number): boolean => !isPhaseAccessible(phaseId),
    [isPhaseAccessible]
  );

  /**
   * Get the next phase to complete
   */
  const getNextPhase = useCallback((): number | null => {
    const highestCompleted = Math.max(...completedPhases, 0);
    if (highestCompleted >= TOTAL_PHASES) return null;
    return highestCompleted + 1;
  }, [completedPhases]);

  /**
   * Get progress info
   */
  const getProgress = useCallback(() => {
    const completed = completedPhases.length;
    return {
      completed,
      total: TOTAL_PHASES,
      percentage: Math.round((completed / TOTAL_PHASES) * 100),
    };
  }, [completedPhases]);

  /**
   * Mark a phase as completed (AC-3: completion unlocks next)
   */
  const completePhase = useCallback(
    (phaseId: number) => {
      // Can only complete accessible phases
      if (!isPhaseAccessible(phaseId)) {
        console.warn(`[useOffseasonPhase] Cannot complete locked phase ${phaseId}`);
        return;
      }

      // Already completed
      if (completedPhases.includes(phaseId)) {
        console.warn(`[useOffseasonPhase] Phase ${phaseId} already completed`);
        return;
      }

      // Add to completed
      setCompletedPhases((prev) => [...prev, phaseId].sort((a, b) => a - b));

      // Auto-advance to next phase
      if (phaseId < TOTAL_PHASES) {
        setCurrentPhase(phaseId + 1);
      }
    },
    [completedPhases, isPhaseAccessible]
  );

  /**
   * Navigate to a phase (only if accessible)
   */
  const goToPhase = useCallback(
    (phaseId: number): boolean => {
      if (!isPhaseAccessible(phaseId)) {
        return false; // AC-1: locked phases do nothing
      }
      setCurrentPhase(phaseId);
      return true;
    },
    [isPhaseAccessible]
  );

  /**
   * Reset offseason state for new season
   */
  const resetOffseason = useCallback(() => {
    setCurrentPhase(1);
    setCompletedPhases([]);
  }, []);

  return {
    currentPhase,
    completedPhases,
    isPhaseAccessible,
    isPhaseCompleted,
    isPhaseLocked,
    getNextPhase,
    getProgress,
    completePhase,
    goToPhase,
    resetOffseason,
  };
}

export default useOffseasonPhase;
