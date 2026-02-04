/**
 * useFameTracking Hook
 *
 * Per FIGMA_IMPLEMENTATION_PLAN.md Phase 4
 *
 * Provides Fame tracking capabilities for the Figma GameTracker UI.
 * Wraps the Fame integration module with React state management.
 */

import { useState, useCallback, useMemo } from 'react';
import type { FameEventType } from '../../../types/game';
import {
  createGameFameTracker,
  addFameEvent,
  getPlayerGameFame,
  getPlayerGameEvents,
  getGameFameSummary,
  formatFameEvent,
  formatFameValue,
  getFameColor,
  getTierColor,
  getFameTier,
  getLITier,
  describeLIEffect,
  detectStrikeoutFameEvent,
  detectMultiHRFameEvent,
  detectMultiHitFameEvent,
  detectRBIFameEvent,
  detectPitcherKFameEvent,
  detectMeltdownFameEvent,
  type GameFameTracker,
  type FameEventDisplay,
  type PlayerFameSummary,
} from '../engines/fameIntegration';

// ============================================
// HOOK TYPES
// ============================================

export interface UseFameTrackingOptions {
  gameId: string;
  isPlayoffs?: boolean;
  playoffRound?: 'wild_card' | 'division_series' | 'championship_series' | 'world_series';
  isEliminationGame?: boolean;
  isClinchGame?: boolean;
}

export interface FameTrackingState {
  tracker: GameFameTracker;
  lastEvent: FameEventDisplay | null;
  showEventPopup: boolean;
  /** Track which milestone events have been recorded per player to prevent duplicates */
  recordedMilestones: Map<string, Set<FameEventType>>;
}

// ============================================
// HOOK: useFameTracking
// ============================================

export function useFameTracking(options: UseFameTrackingOptions) {
  const { gameId, isPlayoffs = false, playoffRound, isEliminationGame, isClinchGame } = options;

  const [state, setState] = useState<FameTrackingState>({
    tracker: createGameFameTracker(gameId),
    lastEvent: null,
    showEventPopup: false,
    recordedMilestones: new Map(),
  });

  // Playoff context for Fame calculations
  const playoffContext = useMemo(() => {
    if (!isPlayoffs) return undefined;
    return {
      isPlayoffs,
      round: playoffRound,
      isEliminationGame,
      isClinchGame,
    };
  }, [isPlayoffs, playoffRound, isEliminationGame, isClinchGame]);

  /**
   * Record a Fame event
   */
  const recordFameEvent = useCallback((
    eventType: FameEventType,
    playerId: string,
    playerName: string,
    inning: number,
    halfInning: 'TOP' | 'BOTTOM',
    leverageIndex: number = 1.0
  ) => {
    setState(prev => {
      const newTracker = addFameEvent(
        prev.tracker,
        eventType,
        playerId,
        playerName,
        inning,
        halfInning,
        leverageIndex,
        playoffContext
      );

      const display = formatFameEvent(eventType, leverageIndex, playoffContext);

      return {
        ...prev,
        tracker: newTracker,
        lastEvent: display,
        showEventPopup: true,
      };
    });
  }, [playoffContext]);

  /**
   * Dismiss the event popup
   */
  const dismissEventPopup = useCallback(() => {
    setState(prev => ({ ...prev, showEventPopup: false }));
  }, []);

  /**
   * Get Fame for a specific player
   */
  const getPlayerFame = useCallback((playerId: string): number => {
    return getPlayerGameFame(state.tracker, playerId);
  }, [state.tracker]);

  /**
   * Get Fame events for a specific player
   */
  const getPlayerEvents = useCallback((playerId: string): FameEventDisplay[] => {
    return getPlayerGameEvents(state.tracker, playerId);
  }, [state.tracker]);

  /**
   * Get game summary
   */
  const getGameSummary = useCallback(() => {
    return getGameFameSummary(state.tracker);
  }, [state.tracker]);

  /**
   * Auto-detect batter Fame events based on game stats
   * FIX: Only record NEW events - prevent duplicates on subsequent at-bats
   */
  const checkBatterFameEvents = useCallback((
    playerId: string,
    playerName: string,
    gameStats: {
      hits: number;
      homeRuns: number;
      strikeouts: number;
      rbi: number;
    },
    inning: number,
    halfInning: 'TOP' | 'BOTTOM',
    leverageIndex: number = 1.0
  ): FameEventType[] => {
    const detectedEvents: FameEventType[] = [];

    // Check multi-hit
    const hitEvent = detectMultiHitFameEvent(gameStats.hits);
    if (hitEvent) detectedEvents.push(hitEvent);

    // Check multi-HR
    const hrEvent = detectMultiHRFameEvent(gameStats.homeRuns);
    if (hrEvent) detectedEvents.push(hrEvent);

    // Check strikeout shame
    const kEvent = detectStrikeoutFameEvent(gameStats.strikeouts);
    if (kEvent) detectedEvents.push(kEvent);

    // Check RBI
    const rbiEvent = detectRBIFameEvent(gameStats.rbi);
    if (rbiEvent) detectedEvents.push(rbiEvent);

    // Filter out events that have already been recorded for this player
    const playerMilestones = state.recordedMilestones.get(playerId) || new Set();
    const newEvents = detectedEvents.filter(event => !playerMilestones.has(event));

    // Record only NEW events and update the milestones tracker
    if (newEvents.length > 0) {
      // Update milestones in state
      setState(prev => {
        const newMilestones = new Map(prev.recordedMilestones);
        const playerSet = new Set(newMilestones.get(playerId) || []);
        for (const event of newEvents) {
          playerSet.add(event);
        }
        newMilestones.set(playerId, playerSet);
        return { ...prev, recordedMilestones: newMilestones };
      });

      // Record the fame events
      for (const event of newEvents) {
        console.log(`[Fame] Recording NEW event: ${event} for ${playerName}`);
        recordFameEvent(event, playerId, playerName, inning, halfInning, leverageIndex);
      }
    }

    return newEvents;
  }, [recordFameEvent, state.recordedMilestones]);

  /**
   * Auto-detect pitcher Fame events based on game stats
   * FIX: Only record NEW events - prevent duplicates on subsequent batters faced
   */
  const checkPitcherFameEvents = useCallback((
    pitcherId: string,
    pitcherName: string,
    gameStats: {
      strikeouts: number;
      runsAllowed: number;
      hitsAllowed: number;
      inningsPitched: number;
    },
    inning: number,
    halfInning: 'TOP' | 'BOTTOM',
    leverageIndex: number = 1.0
  ): FameEventType[] => {
    const detectedEvents: FameEventType[] = [];

    // Check K performance
    const kEvent = detectPitcherKFameEvent(gameStats.strikeouts);
    if (kEvent) detectedEvents.push(kEvent);

    // Check meltdown
    const meltdownEvent = detectMeltdownFameEvent(gameStats.runsAllowed);
    if (meltdownEvent) detectedEvents.push(meltdownEvent);

    // Filter out events that have already been recorded for this pitcher
    const pitcherMilestones = state.recordedMilestones.get(pitcherId) || new Set();
    const newEvents = detectedEvents.filter(event => !pitcherMilestones.has(event));

    // Record only NEW events and update the milestones tracker
    if (newEvents.length > 0) {
      // Update milestones in state
      setState(prev => {
        const newMilestones = new Map(prev.recordedMilestones);
        const pitcherSet = new Set(newMilestones.get(pitcherId) || []);
        for (const event of newEvents) {
          pitcherSet.add(event);
        }
        newMilestones.set(pitcherId, pitcherSet);
        return { ...prev, recordedMilestones: newMilestones };
      });

      // Record the fame events
      for (const event of newEvents) {
        console.log(`[Fame] Recording NEW event: ${event} for ${pitcherName}`);
        recordFameEvent(event, pitcherId, pitcherName, inning, halfInning, leverageIndex);
      }
    }

    return newEvents;
  }, [recordFameEvent, state.recordedMilestones]);

  /**
   * Reset tracker for a new game
   */
  const resetTracker = useCallback((newGameId?: string) => {
    setState({
      tracker: createGameFameTracker(newGameId || gameId),
      lastEvent: null,
      showEventPopup: false,
      recordedMilestones: new Map(), // Clear milestone tracking for new game
    });
  }, [gameId]);

  return {
    // State
    tracker: state.tracker,
    lastEvent: state.lastEvent,
    showEventPopup: state.showEventPopup,

    // Event recording
    recordFameEvent,
    dismissEventPopup,

    // Player queries
    getPlayerFame,
    getPlayerEvents,

    // Game summary
    getGameSummary,

    // Auto-detection
    checkBatterFameEvents,
    checkPitcherFameEvents,

    // Management
    resetTracker,

    // Utility re-exports
    formatFameValue,
    getFameColor,
    getTierColor,
    getLITier,
    describeLIEffect,
    getFameTier,
  };
}

// ============================================
// RE-EXPORT TYPES AND UTILITIES
// ============================================

export type {
  FameEventDisplay,
  PlayerFameSummary,
  GameFameTracker,
};

export {
  formatFameEvent,
  formatFameValue,
  getFameColor,
  getTierColor,
  getFameTier,
  getLITier,
  describeLIEffect,
};
