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

export const OFFSEASON_PHASES = {
  AWARDS: 1,
  EOS_RATINGS: 2,
  RETIREMENTS: 3,
  FA_PROTECTION: 4,
  FREE_AGENCY_1: 5,
  FREE_AGENCY_2: 6,
  FREE_AGENCY_3: 7,
  DRAFT: 8,
  TRADES: 9,
  SPRING_TRAINING: 10,
  SCHEDULE: 11,
} as const;

export const TOTAL_PHASES = 11;

export const PHASE_NAMES: Record<number, string> = {
  1: 'Awards Ceremony',
  2: 'End of Season Ratings',
  3: 'Retirements',
  4: 'FA Protection',
  5: 'Free Agency Round 1',
  6: 'Free Agency Round 2',
  7: 'Free Agency Round 3',
  8: 'Draft',
  9: 'Trade Period',
  10: 'Spring Training',
  11: 'Schedule Release',
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
