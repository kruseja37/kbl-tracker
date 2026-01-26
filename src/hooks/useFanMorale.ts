/**
 * Fan Morale Hook
 *
 * Manages fan morale state for the current franchise/team.
 * Currently provides sensible defaults with localStorage persistence.
 *
 * Full integration with game completion events is TODO.
 *
 * @see FAN_MORALE_SYSTEM_SPEC.md
 * @see engines/fanMoraleEngine.ts
 */

import { useState, useCallback, useMemo } from 'react';
import {
  type FanMorale,
  type FanState,
  type MoraleTrend,
  type RiskLevel,
  type GameResult,
  type GameDate,
  initializeFanMorale,
  processMoraleEvent,
  createGameMoraleEvent,
  getFanState,
  getRiskLevel,
} from '../engines/fanMoraleEngine';

// ============================================
// TYPES
// ============================================

interface UseFanMoraleOptions {
  teamId?: string;
  seasonNumber?: number;
}

interface UseFanMoraleReturn {
  // Current state
  morale: FanMorale;

  // Quick accessors
  currentMorale: number;
  state: FanState;
  trend: MoraleTrend;
  trendStreak: number;
  riskLevel: RiskLevel;

  // Actions
  recordGameResult: (result: GameResult) => void;
  adjustMorale: (amount: number, reason?: string) => void;
  resetMorale: () => void;

  // Status
  isInitialized: boolean;
}

// ============================================
// LOCAL STORAGE
// ============================================

const MORALE_STORAGE_KEY = 'kbl-fan-morale';

function loadMoraleFromStorage(teamId: string): FanMorale | null {
  try {
    const stored = localStorage.getItem(`${MORALE_STORAGE_KEY}-${teamId}`);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.warn('[useFanMorale] Failed to load from storage:', e);
  }
  return null;
}

function saveMoraleToStorage(teamId: string, morale: FanMorale): void {
  try {
    localStorage.setItem(`${MORALE_STORAGE_KEY}-${teamId}`, JSON.stringify(morale));
  } catch (e) {
    console.warn('[useFanMorale] Failed to save to storage:', e);
  }
}

// ============================================
// HOOK
// ============================================

export function useFanMorale(options: UseFanMoraleOptions = {}): UseFanMoraleReturn {
  const {
    teamId = 'default-team',
    seasonNumber = 1,
  } = options;

  // Initialize or load morale state
  const [morale, setMorale] = useState<FanMorale>(() => {
    const stored = loadMoraleFromStorage(teamId);
    if (stored) {
      return stored;
    }
    // Initialize with CONTENT state (60)
    return initializeFanMorale(60, { season: seasonNumber, game: 1 });
  });

  const [isInitialized] = useState(true);

  // Record a game result
  const recordGameResult = useCallback((result: GameResult) => {
    setMorale(prev => {
      const gameDate: GameDate = {
        season: seasonNumber,
        game: prev.lastUpdated.game + 1,
      };

      // Create the event from game result
      const event = createGameMoraleEvent(result, gameDate);

      // Process the event
      const { updatedMorale } = processMoraleEvent(prev, event);

      saveMoraleToStorage(teamId, updatedMorale);
      return updatedMorale;
    });
  }, [teamId, seasonNumber]);

  // Simple manual adjustment (for testing/debugging)
  const adjustMorale = useCallback((amount: number, _reason?: string) => {
    setMorale(prev => {
      const newMorale = Math.max(0, Math.min(99, prev.current + amount));
      const updated: FanMorale = {
        ...prev,
        previous: prev.current,
        current: newMorale,
        state: getFanState(newMorale),
        riskLevel: getRiskLevel(newMorale),
        trend: amount > 0 ? 'RISING' : amount < 0 ? 'FALLING' : 'STABLE',
        trendStreak: amount !== 0 ? prev.trendStreak + 1 : 0,
        seasonHigh: Math.max(prev.seasonHigh, newMorale),
        seasonLow: Math.min(prev.seasonLow, newMorale),
        lastUpdated: { season: seasonNumber, game: prev.lastUpdated.game },
      };

      saveMoraleToStorage(teamId, updated);
      return updated;
    });
  }, [teamId, seasonNumber]);

  // Reset morale to default
  const resetMorale = useCallback(() => {
    const fresh = initializeFanMorale(60, { season: seasonNumber, game: 1 });
    setMorale(fresh);
    saveMoraleToStorage(teamId, fresh);
  }, [teamId, seasonNumber]);

  // Memoized return values
  const result = useMemo((): UseFanMoraleReturn => ({
    morale,
    currentMorale: morale.current,
    state: morale.state,
    trend: morale.trend,
    trendStreak: morale.trendStreak,
    riskLevel: morale.riskLevel,
    recordGameResult,
    adjustMorale,
    resetMorale,
    isInitialized,
  }), [morale, recordGameResult, adjustMorale, resetMorale, isInitialized]);

  return result;
}

export default useFanMorale;
