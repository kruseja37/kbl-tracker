/**
 * Offseason State Hook
 *
 * Manages the offseason state machine for UI components.
 * Tracks current phase, completed phases, and phase-specific data.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  initOffseasonDatabase,
  startOffseason,
  getOffseasonState,
  advanceOffseasonPhase,
  getPhaseDisplayName,
  isPhaseComplete,
  canAdvancePhase,
  saveSeasonAwards,
  getSeasonAwards,
  saveRetirements,
  getRetirements,
  saveRatingsAdjustments,
  getRatingsAdjustments,
  saveFreeAgencySignings,
  getFreeAgencyData,
  saveDraftResults,
  getDraftData,
  saveTrades,
  getTrades,
  addTrade,
  OFFSEASON_PHASES,
  type OffseasonState,
  type OffseasonPhase,
  type AwardWinner,
  type SeasonAwards,
  type RetirementDecision,
  type RetirementPhaseData,
  type RatingAdjustment,
  type ManagerBonus,
  type RatingsPhaseData,
  type FreeAgentSigning,
  type FreeAgencyPhaseData,
  type DraftPick,
  type DraftPhaseData,
  type Trade,
  type TradePhaseData,
} from '../../utils/offseasonStorage';

// Re-export types
export type {
  OffseasonState,
  OffseasonPhase,
  AwardWinner,
  SeasonAwards,
  RetirementDecision,
  RetirementPhaseData,
  RatingAdjustment,
  ManagerBonus,
  RatingsPhaseData,
  FreeAgentSigning,
  FreeAgencyPhaseData,
  DraftPick,
  DraftPhaseData,
  Trade,
  TradePhaseData,
};

// ============================================
// HOOK INTERFACE
// ============================================

export interface UseOffseasonStateReturn {
  // State
  state: OffseasonState | null;
  isLoading: boolean;
  error: string | null;

  // Phase info
  currentPhase: OffseasonPhase | null;
  currentPhaseIndex: number;
  totalPhases: number;
  phaseName: string;
  progress: number; // 0-100

  // Phase status
  isPhaseComplete: (phase: OffseasonPhase) => boolean;
  canAdvance: boolean;
  isOffseasonComplete: boolean;

  // Phase data
  awards: SeasonAwards | null;
  retirements: RetirementPhaseData | null;
  ratings: RatingsPhaseData | null;
  freeAgency: FreeAgencyPhaseData | null;
  draft: DraftPhaseData | null;
  trades: TradePhaseData | null;

  // Actions
  startNewOffseason: () => Promise<void>;
  completeCurrentPhase: () => Promise<void>;
  advanceToNextPhase: () => Promise<void>;

  // Phase-specific saves
  saveAwards: (awards: AwardWinner[]) => Promise<void>;
  saveRetirementDecisions: (retirements: RetirementDecision[]) => Promise<void>;
  saveRatingChanges: (adjustments: RatingAdjustment[], bonuses: ManagerBonus[]) => Promise<void>;
  saveFreeAgentSignings: (signings: FreeAgentSigning[], declined: string[]) => Promise<void>;
  saveDraft: (order: string[], picks: DraftPick[], rounds: number) => Promise<void>;
  addNewTrade: (trade: Omit<Trade, 'id' | 'seasonId'>) => Promise<Trade>;

  // Utilities
  refresh: () => Promise<void>;
  getPhaseDisplayName: (phase: OffseasonPhase) => string;
}

// ============================================
// HOOK IMPLEMENTATION
// ============================================

export function useOffseasonState(
  seasonId: string,
  seasonNumber: number = 1
): UseOffseasonStateReturn {
  const [state, setState] = useState<OffseasonState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Phase-specific data
  const [awards, setAwards] = useState<SeasonAwards | null>(null);
  const [retirements, setRetirements] = useState<RetirementPhaseData | null>(null);
  const [ratings, setRatings] = useState<RatingsPhaseData | null>(null);
  const [freeAgency, setFreeAgency] = useState<FreeAgencyPhaseData | null>(null);
  const [draft, setDraft] = useState<DraftPhaseData | null>(null);
  const [trades, setTrades] = useState<TradePhaseData | null>(null);

  // Load all data
  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      await initOffseasonDatabase();

      // Load state
      const offseasonState = await getOffseasonState(seasonId);
      setState(offseasonState);

      // Load phase data if state exists
      if (offseasonState) {
        const [
          awardsData,
          retirementsData,
          ratingsData,
          freeAgencyData,
          draftData,
          tradesData,
        ] = await Promise.all([
          getSeasonAwards(seasonId),
          getRetirements(seasonId),
          getRatingsAdjustments(seasonId),
          getFreeAgencyData(seasonId),
          getDraftData(seasonId),
          getTrades(seasonId),
        ]);

        setAwards(awardsData);
        setRetirements(retirementsData);
        setRatings(ratingsData);
        setFreeAgency(freeAgencyData);
        setDraft(draftData);
        setTrades(tradesData);
      }
    } catch (err) {
      console.error('[useOffseasonState] Failed to load data:', err);
      setError(err instanceof Error ? err.message : 'Failed to load offseason data');
    } finally {
      setIsLoading(false);
    }
  }, [seasonId]);

  // Initial load
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Derived state
  const currentPhase = state?.currentPhase ?? null;
  const currentPhaseIndex = currentPhase ? OFFSEASON_PHASES.indexOf(currentPhase) : -1;
  const totalPhases = OFFSEASON_PHASES.length;
  const phaseName = currentPhase ? getPhaseDisplayName(currentPhase) : 'Not Started';
  const progress = state ? ((state.phasesCompleted.length / totalPhases) * 100) : 0;
  const canAdvance = state ? canAdvancePhase(state) : false;
  const isOffseasonComplete = state?.status === 'COMPLETED';

  // Phase complete check
  const checkPhaseComplete = useCallback((phase: OffseasonPhase): boolean => {
    if (!state) return false;
    return isPhaseComplete(state, phase);
  }, [state]);

  // Start new offseason
  const startNewOffseason = useCallback(async () => {
    try {
      setIsLoading(true);
      const newState = await startOffseason(seasonId, seasonNumber);
      setState(newState);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start offseason';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [seasonId, seasonNumber]);

  // Mark current phase complete (for phases without specific data)
  const completeCurrentPhase = useCallback(async () => {
    if (!state) throw new Error('No offseason in progress');

    try {
      // Add current phase to completed list
      if (!state.phasesCompleted.includes(state.currentPhase)) {
        state.phasesCompleted.push(state.currentPhase);
        setState({ ...state });

        // Persist the update
        await advanceOffseasonPhase(seasonId);
        // But we need to reload to get the new current phase
        await loadData();
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to complete phase';
      setError(message);
      throw err;
    }
  }, [state, seasonId, loadData]);

  // Advance to next phase
  const advanceToNextPhase = useCallback(async () => {
    if (!state) throw new Error('No offseason in progress');
    if (!canAdvancePhase(state)) throw new Error('Cannot advance - current phase not complete');

    try {
      setIsLoading(true);
      const newState = await advanceOffseasonPhase(seasonId);
      setState(newState);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to advance phase';
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [state, seasonId]);

  // Save awards and mark phase complete
  const saveAwardsAction = useCallback(async (awardsList: AwardWinner[]) => {
    if (!state) throw new Error('No offseason in progress');

    try {
      const savedAwards = await saveSeasonAwards(seasonId, seasonNumber, awardsList);
      setAwards(savedAwards);

      // Mark phase complete
      if (!state.phasesCompleted.includes('AWARDS')) {
        state.phasesCompleted.push('AWARDS');
        setState({ ...state });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save awards';
      setError(message);
      throw err;
    }
  }, [state, seasonId, seasonNumber]);

  // Save retirements
  const saveRetirementDecisions = useCallback(async (retirementList: RetirementDecision[]) => {
    if (!state) throw new Error('No offseason in progress');

    try {
      const savedRetirements = await saveRetirements(seasonId, retirementList);
      setRetirements(savedRetirements);

      // Mark phase complete
      if (!state.phasesCompleted.includes('RETIREMENTS')) {
        state.phasesCompleted.push('RETIREMENTS');
        setState({ ...state });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save retirements';
      setError(message);
      throw err;
    }
  }, [state, seasonId]);

  // Save rating changes
  const saveRatingChanges = useCallback(async (
    adjustments: RatingAdjustment[],
    bonuses: ManagerBonus[]
  ) => {
    if (!state) throw new Error('No offseason in progress');

    try {
      const savedRatings = await saveRatingsAdjustments(seasonId, adjustments, bonuses);
      setRatings(savedRatings);

      // Mark phase complete
      if (!state.phasesCompleted.includes('RATINGS_ADJUSTMENTS')) {
        state.phasesCompleted.push('RATINGS_ADJUSTMENTS');
        setState({ ...state });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save rating adjustments';
      setError(message);
      throw err;
    }
  }, [state, seasonId]);

  // Save free agent signings
  const saveFASignings = useCallback(async (
    signings: FreeAgentSigning[],
    declined: string[]
  ) => {
    if (!state) throw new Error('No offseason in progress');

    try {
      const savedFA = await saveFreeAgencySignings(seasonId, signings, declined);
      setFreeAgency(savedFA);

      // Mark phase complete
      if (!state.phasesCompleted.includes('FREE_AGENCY')) {
        state.phasesCompleted.push('FREE_AGENCY');
        setState({ ...state });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save free agency data';
      setError(message);
      throw err;
    }
  }, [state, seasonId]);

  // Save draft
  const saveDraftAction = useCallback(async (
    order: string[],
    picks: DraftPick[],
    rounds: number
  ) => {
    if (!state) throw new Error('No offseason in progress');

    try {
      const savedDraft = await saveDraftResults(seasonId, order, picks, rounds);
      setDraft(savedDraft);

      // Mark phase complete
      if (!state.phasesCompleted.includes('DRAFT')) {
        state.phasesCompleted.push('DRAFT');
        setState({ ...state });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save draft results';
      setError(message);
      throw err;
    }
  }, [state, seasonId]);

  // Add trade
  const addNewTrade = useCallback(async (
    trade: Omit<Trade, 'id' | 'seasonId'>
  ): Promise<Trade> => {
    if (!state) throw new Error('No offseason in progress');

    try {
      const newTrade = await addTrade(seasonId, trade);

      // Reload trades
      const tradesData = await getTrades(seasonId);
      setTrades(tradesData);

      return newTrade;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to add trade';
      setError(message);
      throw err;
    }
  }, [state, seasonId]);

  return {
    // State
    state,
    isLoading,
    error,

    // Phase info
    currentPhase,
    currentPhaseIndex,
    totalPhases,
    phaseName,
    progress,

    // Phase status
    isPhaseComplete: checkPhaseComplete,
    canAdvance,
    isOffseasonComplete,

    // Phase data
    awards,
    retirements,
    ratings,
    freeAgency,
    draft,
    trades,

    // Actions
    startNewOffseason,
    completeCurrentPhase,
    advanceToNextPhase,

    // Phase-specific saves
    saveAwards: saveAwardsAction,
    saveRetirementDecisions,
    saveRatingChanges,
    saveFreeAgentSignings: saveFASignings,
    saveDraft: saveDraftAction,
    addNewTrade,

    // Utilities
    refresh: loadData,
    getPhaseDisplayName,
  };
}

export default useOffseasonState;
