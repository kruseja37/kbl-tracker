/**
 * Game Persistence Hook
 * Per STAT_TRACKING_ARCHITECTURE_SPEC.md - Phase 2: Game Persistence
 *
 * Provides auto-save and recovery for game state using IndexedDB.
 */

import { useEffect, useCallback, useRef, useState } from 'react';
import type { Bases, FameEvent, HalfInning } from '../types/game';
import {
  type PersistedGameState,
  loadCurrentGame,
  debouncedSaveCurrentGame,
  immediateSaveCurrentGame,
  clearCurrentGame,
  archiveCompletedGame,
  hasSavedGame,
  initDatabase,
} from '../utils/gameStorage';

// PlayerStats interface (matches GameTracker)
interface PlayerStats {
  playerName: string;
  teamId: string;
  pa: number;
  ab: number;
  h: number;
  singles: number;
  doubles: number;
  triples: number;
  hr: number;
  rbi: number;
  r: number;
  bb: number;
  hbp: number;   // MAJ-11: Hit by pitch
  k: number;
  sb: number;
  cs: number;
  sf: number;    // MAJ-11: Sacrifice flies
  sh: number;    // MAJ-11: Sacrifice bunts
  gidp: number;  // MAJ-11: Grounded into double play
  putouts: number;
  assists: number;
  fieldingErrors: number;
}

// PitcherGameStats interface (matches GameTracker)
interface PitcherGameStats {
  pitcherId: string;
  pitcherName: string;
  teamId: string;
  isStarter: boolean;
  entryInning: number;
  outsRecorded: number;
  hitsAllowed: number;
  runsAllowed: number;
  earnedRuns: number;
  walksAllowed: number;
  strikeoutsThrown: number;
  homeRunsAllowed: number;
  hitBatters: number;
  basesReachedViaError: number;
  wildPitches: number;
  pitchCount: number;
  battersFaced: number;
  consecutiveHRsAllowed: number;
  firstInningRuns: number;
  basesLoadedWalks: number;
  inningsComplete: number;
  // MAJ-08: Pitcher decisions
  decision: 'W' | 'L' | 'ND' | null;
  save: boolean;
  hold: boolean;
  blownSave: boolean;
}

// Per-inning pitch tracking for Immaculate Inning detection
interface InningPitchData {
  pitches: number;
  strikeouts: number;
  pitcherId: string;
}

// Game state that the hook tracks
export interface GameStateForPersistence {
  gameId: string;
  inning: number;
  halfInning: HalfInning;
  outs: number;
  homeScore: number;
  awayScore: number;
  bases: Bases;
  currentBatterIndex: number;
  atBatCount: number;
  awayTeamId: string;
  homeTeamId: string;
  awayTeamName: string;
  homeTeamName: string;
  playerStats: Record<string, PlayerStats>;
  pitcherGameStats: Map<string, PitcherGameStats>;
  fameEvents: FameEvent[];
  lastHRBatterId: string | null;
  consecutiveHRCount: number;
  inningStrikeouts: number;
  maxDeficitAway: number;
  maxDeficitHome: number;
  activityLog: string[];
  currentInningPitches?: InningPitchData | null;
  seasonNumber: number;
}

export interface UseGamePersistenceOptions {
  enabled?: boolean;
  autoSaveDelay?: number;
}

export interface UseGamePersistenceReturn {
  // State
  isLoading: boolean;
  hasSavedGame: boolean;
  lastSavedAt: number | null;

  // Actions
  saveGame: (state: GameStateForPersistence) => void;
  loadGame: () => Promise<GameStateForPersistence | null>;
  clearGame: () => Promise<void>;
  archiveGame: (state: GameStateForPersistence, finalScore: { away: number; home: number }) => Promise<void>;

  // Auto-save trigger (call this when state changes)
  triggerAutoSave: (state: GameStateForPersistence) => void;
}

/**
 * Convert Map to Array for storage
 */
function mapToArray(map: Map<string, PitcherGameStats>): PitcherGameStats[] {
  return Array.from(map.values());
}

/**
 * Convert Array back to Map after loading
 */
function arrayToMap(arr: PitcherGameStats[]): Map<string, PitcherGameStats> {
  const map = new Map<string, PitcherGameStats>();
  for (const stats of arr) {
    map.set(stats.pitcherId, stats);
  }
  return map;
}

/**
 * Convert game state to persisted format
 */
function toPersistedState(state: GameStateForPersistence): PersistedGameState {
  return {
    id: 'current',
    gameId: state.gameId,
    savedAt: Date.now(),
    inning: state.inning,
    halfInning: state.halfInning,
    outs: state.outs,
    homeScore: state.homeScore,
    awayScore: state.awayScore,
  bases: {
    first: state.bases.first
      ? {
          playerId: state.bases.first.playerId,
          playerName: state.bases.first.playerName,
          inheritedFrom: state.bases.first.inheritedFrom ?? null,
        }
      : null,
    second: state.bases.second
      ? {
          playerId: state.bases.second.playerId,
          playerName: state.bases.second.playerName,
          inheritedFrom: state.bases.second.inheritedFrom ?? null,
        }
      : null,
    third: state.bases.third
      ? {
          playerId: state.bases.third.playerId,
          playerName: state.bases.third.playerName,
          inheritedFrom: state.bases.third.inheritedFrom ?? null,
        }
      : null,
  },
    currentBatterIndex: state.currentBatterIndex,
    atBatCount: state.atBatCount,
    awayTeamId: state.awayTeamId,
    homeTeamId: state.homeTeamId,
    awayTeamName: state.awayTeamName,
    homeTeamName: state.homeTeamName,
    seasonNumber: state.seasonNumber,
  playerStats: state.playerStats,
  pitcherGameStats: mapToArray(state.pitcherGameStats),
    fameEvents: state.fameEvents.map(e => ({
      id: e.id,
      gameId: e.gameId,
      eventType: e.eventType,
      playerId: e.playerId,
      playerName: e.playerName,
      playerTeam: e.playerTeam,
      fameValue: e.fameValue,
      fameType: e.fameType,
      inning: e.inning,
      halfInning: e.halfInning,
      timestamp: e.timestamp,
      autoDetected: e.autoDetected,
      description: e.description,
    })),
    lastHRBatterId: state.lastHRBatterId,
    consecutiveHRCount: state.consecutiveHRCount,
    inningStrikeouts: state.inningStrikeouts,
    maxDeficitAway: state.maxDeficitAway,
    maxDeficitHome: state.maxDeficitHome,
  activityLog: state.activityLog.slice(0, 20),  // Keep last 20 entries
  currentInningPitches: state.currentInningPitches ?? null,
};
}

/**
 * Convert persisted state back to game state format
 */
function fromPersistedState(persisted: PersistedGameState): GameStateForPersistence {
  const mapPersistedRunner = (
    runner: PersistedGameState['bases']['first']
  ): Bases['first'] => {
    if (!runner) return null;
    return {
      playerId: runner.playerId,
      playerName: runner.playerName,
      inheritedFrom: runner.inheritedFrom ?? null,
    };
  };

  return {
    gameId: persisted.gameId,
    inning: persisted.inning,
    halfInning: persisted.halfInning,
    outs: persisted.outs,
    homeScore: persisted.homeScore,
    awayScore: persisted.awayScore,
    bases: {
      first: mapPersistedRunner(persisted.bases.first),
      second: mapPersistedRunner(persisted.bases.second),
      third: mapPersistedRunner(persisted.bases.third),
    },
    currentBatterIndex: persisted.currentBatterIndex,
    atBatCount: persisted.atBatCount,
    awayTeamId: persisted.awayTeamId,
    homeTeamId: persisted.homeTeamId,
    awayTeamName: persisted.awayTeamName,
    homeTeamName: persisted.homeTeamName,
    seasonNumber: persisted.seasonNumber,
    playerStats: persisted.playerStats,
    pitcherGameStats: arrayToMap(persisted.pitcherGameStats),
    fameEvents: persisted.fameEvents as FameEvent[],
    lastHRBatterId: persisted.lastHRBatterId,
    consecutiveHRCount: persisted.consecutiveHRCount,
    inningStrikeouts: persisted.inningStrikeouts,
    maxDeficitAway: persisted.maxDeficitAway,
    maxDeficitHome: persisted.maxDeficitHome,
    activityLog: persisted.activityLog,
    currentInningPitches: persisted.currentInningPitches ?? null,
  };
}

/**
 * Hook for game persistence
 */
export function useGamePersistence(
  options: UseGamePersistenceOptions = {}
): UseGamePersistenceReturn {
  const { enabled = true, autoSaveDelay = 500 } = options;

  const [isLoading, setIsLoading] = useState(true);
  const [hasSaved, setHasSaved] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);

  // Track if we've initialized
  const initializedRef = useRef(false);

  // Initialize database on mount
  useEffect(() => {
    if (!enabled) {
      setIsLoading(false);
      return;
    }

    const init = async () => {
      try {
        await initDatabase();
        const saved = await hasSavedGame();
        setHasSaved(saved);
      } catch (err) {
        console.error('Failed to initialize game persistence:', err);
      } finally {
        setIsLoading(false);
        initializedRef.current = true;
      }
    };

    init();
  }, [enabled]);

  // Save before page unload
  const lastStateRef = useRef<GameStateForPersistence | null>(null);

  useEffect(() => {
    if (!enabled) return;

    const handleBeforeUnload = () => {
      if (lastStateRef.current) {
        immediateSaveCurrentGame(toPersistedState(lastStateRef.current));
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden && lastStateRef.current) {
        immediateSaveCurrentGame(toPersistedState(lastStateRef.current));
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [enabled]);

  // Save game (immediate)
  const saveGame = useCallback((state: GameStateForPersistence) => {
    if (!enabled) return;

    lastStateRef.current = state;
    const persisted = toPersistedState(state);
    immediateSaveCurrentGame(persisted);
    setLastSavedAt(Date.now());
    setHasSaved(true);
  }, [enabled]);

  // Trigger auto-save (debounced)
  const triggerAutoSave = useCallback((state: GameStateForPersistence) => {
    if (!enabled) return;

    lastStateRef.current = state;
    const persisted = toPersistedState(state);
    debouncedSaveCurrentGame(persisted, autoSaveDelay);
  }, [enabled, autoSaveDelay]);

  // Load game
  const loadGame = useCallback(async (): Promise<GameStateForPersistence | null> => {
    if (!enabled) return null;

    try {
      const persisted = await loadCurrentGame();
      if (persisted) {
        setLastSavedAt(persisted.savedAt);
        return fromPersistedState(persisted);
      }
      return null;
    } catch (err) {
      console.error('Failed to load game:', err);
      return null;
    }
  }, [enabled]);

  // Clear game
  const clearGame = useCallback(async () => {
    if (!enabled) return;

    try {
      await clearCurrentGame();
      setHasSaved(false);
      setLastSavedAt(null);
      lastStateRef.current = null;
    } catch (err) {
      console.error('Failed to clear game:', err);
    }
  }, [enabled]);

  // Archive completed game
  const archiveGame = useCallback(async (
    state: GameStateForPersistence,
    finalScore: { away: number; home: number }
  ) => {
    if (!enabled) return;

    try {
      const persisted = toPersistedState(state);
      await archiveCompletedGame(persisted, finalScore);
      await clearCurrentGame();
      setHasSaved(false);
      setLastSavedAt(null);
      lastStateRef.current = null;
    } catch (err) {
      console.error('Failed to archive game:', err);
    }
  }, [enabled]);

  return {
    isLoading,
    hasSavedGame: hasSaved,
    lastSavedAt,
    saveGame,
    loadGame,
    clearGame,
    archiveGame,
    triggerAutoSave,
  };
}
