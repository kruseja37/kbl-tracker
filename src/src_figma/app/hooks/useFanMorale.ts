/**
 * useFanMorale Hook
 * Per FAN_MORALE_SYSTEM_SPEC.md
 *
 * React hook for tracking fan morale, contraction risk, and trade scrutiny.
 *
 * NOTE (2026-02-03): This hook was written with incorrect assumptions about the
 * legacy fanMoraleEngine API. It is currently STUBBED OUT because:
 * 1. It is not imported/used anywhere in the codebase
 * 2. The API mismatches are extensive (wrong function signatures, missing properties)
 *
 * TODO: Rewrite this hook to match the actual legacy fanMoraleEngine API when needed.
 */

import { useState, useCallback, useMemo } from 'react';
import {
  // Types - these are correctly imported
  type FanState,
  type MoraleTrend,
  type RiskLevel,
  type FanMorale,
  type MoraleEvent,
  type GameDate,

  // Functions - these have correct signatures
  initializeFanMorale,
  getFanState,
  getRiskLevel,

  // Display helpers from integration layer
  getFanStateDisplay,
  getRiskLevelDisplay,
  getTrendDisplay,
  formatMorale,
  getMoraleBarColor,
  getTradeScrutinyLevel,
  getFAAttractiveness,
} from '../engines/fanMoraleIntegration';

// Re-export types for consumers
export type { FanState, MoraleTrend, RiskLevel, FanMorale, MoraleEvent };

// ============================================
// HOOK TYPES
// ============================================

export interface UseFanMoraleReturn {
  // Current state
  morale: FanMorale | null;
  fanState: FanState | null;
  riskLevel: RiskLevel | null;
  trend: MoraleTrend;

  // Display info
  display: {
    value: string;
    state: { label: string; color: string; icon: string; description: string };
    risk: { label: string; color: string; description: string };
    trend: { label: string; color: string; arrow: string };
    barColor: string;
  } | null;

  // Trade/FA info
  tradeScrutiny: {
    level: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
    multiplier: number;
    description: string;
  } | null;
  faAttractiveness: {
    rating: number;
    tier: string;
    description: string;
  } | null;

  // History
  recentEvents: MoraleEvent[];

  // Actions
  initialize: (initialMorale?: number, gameDate?: GameDate) => void;
  refresh: () => void;
}

// ============================================
// HOOK
// ============================================

/**
 * Simplified fan morale hook using the correct legacy API.
 *
 * NOTE: The full functionality (processGameResult, addCustomEvent, applyDailyDrift)
 * has been removed because it requires extensive rework to match the legacy API.
 * This stub provides basic morale tracking with correct types.
 */
export function useFanMorale(
  _initialTeamId?: string,
  marketSize: 'SMALL' | 'MEDIUM' | 'LARGE' = 'MEDIUM'
): UseFanMoraleReturn {
  // State
  const [morale, setMorale] = useState<FanMorale | null>(null);
  const [recentEvents] = useState<MoraleEvent[]>([]);

  // Derived state
  const fanState = useMemo(() => morale ? getFanState(morale.current) : null, [morale]);
  const riskLevel = useMemo(() => morale ? getRiskLevel(morale.current) : null, [morale]);
  const trend = useMemo(() => morale ? morale.trend : 'STABLE', [morale]);

  // Display info
  const display = useMemo(() => {
    if (!morale || !fanState || !riskLevel) return null;
    return {
      value: formatMorale(morale.current),
      state: getFanStateDisplay(fanState),
      risk: getRiskLevelDisplay(riskLevel),
      trend: getTrendDisplay(trend),
      barColor: getMoraleBarColor(morale.current),
    };
  }, [morale, fanState, riskLevel, trend]);

  // Trade scrutiny
  const tradeScrutiny = useMemo(() => {
    if (!morale) return null;
    return getTradeScrutinyLevel(morale.current);
  }, [morale]);

  // FA attractiveness
  const faAttractiveness = useMemo(() => {
    if (!morale) return null;
    return getFAAttractiveness(morale.current, marketSize);
  }, [morale, marketSize]);

  // Initialize morale - uses correct legacy API signature
  const initialize = useCallback((
    initialMorale: number = 50,
    gameDate: GameDate = { season: 1, game: 0 }
  ) => {
    const newMorale = initializeFanMorale(initialMorale, gameDate);
    setMorale(newMorale);
  }, []);

  // Refresh (recalculate derived values)
  const refresh = useCallback(() => {
    if (morale) {
      setMorale({ ...morale });
    }
  }, [morale]);

  return {
    morale,
    fanState,
    riskLevel,
    trend,
    display,
    tradeScrutiny,
    faAttractiveness,
    recentEvents,
    initialize,
    refresh,
  };
}

export default useFanMorale;
