import { useState, useCallback, useEffect, useRef } from 'react';
import type {
  AtBatResult,
  GameEvent,
  Bases,
  Runner,
  HalfInning,
  AtBatFlowState,
  RunnerOutcome,
  EventResult,
  LineupState,
  LineupPlayer,
  BenchPlayer,
  SubstitutionEvent,
  PitchingChangeEvent,
  PinchHitterEvent,
  PinchRunnerEvent,
  DefensiveSubEvent,
  Position,
  FameEvent,
  FameEventType,
  FameAutoDetectionSettings,
} from '../../types/game';
import {
  createEmptyBases,
  updateSituationalContext,
  isOut,
  isHit,
  reachesBase,
  applySubstitution,
  DEFAULT_FAME_SETTINGS,
} from '../../types/game';

import Scoreboard from './Scoreboard';
import Diamond from './Diamond';
import AtBatButtons from './AtBatButtons';
import AtBatFlow from './AtBatFlow';
import EventFlow from './EventFlow';
import PitchingChangeModal from './PitchingChangeModal';
import PinchHitterModal from './PinchHitterModal';
import PinchRunnerModal from './PinchRunnerModal';
import DefensiveSubModal from './DefensiveSubModal';
import { FameEventModal, QuickFameButtons } from './FameEventModal';
import { FamePanel, FameToastContainer, EndGameFameSummary } from './FameDisplay';
import { useFameDetection } from '../../hooks/useFameDetection';
import { useGamePersistence, type GameStateForPersistence } from '../../hooks/useGamePersistence';
import { aggregateGameToSeason } from '../../utils/seasonAggregator';
import { useLiveStats, toGameBattingStats, toGamePitchingStats } from '../../hooks/useLiveStats';
import { formatAvg, formatERA, formatBatterGameLine, formatPitcherGameLine } from '../../utils/liveStatsCalculator';

// Demo lineup data (will be replaced with real data)
// NOTE: In SMB4, pitchers bat - no DH. Pitcher is in the lineup at position 9.
const demoLineup = [
  { id: '1', name: 'Willie Mays', position: 'CF' as const, grade: 'A+', jerseyNumber: 24 },
  { id: '2', name: 'Hank Aaron', position: 'RF' as const, grade: 'A', jerseyNumber: 44 },
  { id: '3', name: 'Mickey Mantle', position: 'LF' as const, grade: 'A', jerseyNumber: 7 },
  { id: '4', name: 'Ted Williams', position: '3B' as const, grade: 'A+', jerseyNumber: 9 },
  { id: '5', name: 'Lou Gehrig', position: '1B' as const, grade: 'A', jerseyNumber: 4 },
  { id: '6', name: 'Joe DiMaggio', position: '2B' as const, grade: 'A-', jerseyNumber: 5 },
  { id: '7', name: 'Roberto Clemente', position: 'SS' as const, grade: 'A-', jerseyNumber: 21 },
  { id: '8', name: 'Johnny Bench', position: 'C' as const, grade: 'B+', jerseyNumber: 5 },
  { id: '9', name: 'Nolan Ryan', position: 'P' as const, grade: 'A', jerseyNumber: 34 },
];

// Demo bench players
const demoBench: BenchPlayer[] = [
  { playerId: 'b1', playerName: 'Sandy Koufax', positions: ['P'], isAvailable: true, batterHand: 'L' },
  { playerId: 'b2', playerName: 'Bob Gibson', positions: ['P'], isAvailable: true, batterHand: 'R' },
  { playerId: 'b3', playerName: 'Mariano Rivera', positions: ['P'], isAvailable: true, batterHand: 'R' },
  { playerId: 'b4', playerName: 'Rickey Henderson', positions: ['LF', 'CF'], isAvailable: true, batterHand: 'R' },
  { playerId: 'b5', playerName: 'Brooks Robinson', positions: ['3B', '1B'], isAvailable: true, batterHand: 'R' },
  { playerId: 'b6', playerName: 'Ozzie Smith', positions: ['SS', '2B'], isAvailable: true, batterHand: 'S' },
  { playerId: 'b7', playerName: 'Carlton Fisk', positions: ['C'], isAvailable: true, batterHand: 'R' },
  { playerId: 'b8', playerName: 'Ernie Banks', positions: ['SS', '1B'], isAvailable: true, batterHand: 'R' },
];

// Create initial lineup state from demo data
function createInitialLineupState(): LineupState {
  const lineup: LineupPlayer[] = demoLineup.map((p, idx) => ({
    playerId: p.id,
    playerName: p.name,
    position: p.position,
    battingOrder: idx + 1,
    enteredInning: 1,
    isStarter: true,
  }));

  // Find the pitcher in the lineup
  const pitcher = lineup.find((p) => p.position === 'P') || null;

  return {
    lineup,
    bench: demoBench,
    usedPlayers: [],
    currentPitcher: pitcher,
  };
}

interface PlayerStats {
  pa: number;
  ab: number;
  h: number;
  singles: number;   // 1B
  doubles: number;   // 2B
  triples: number;   // 3B
  hr: number;
  rbi: number;
  r: number;
  bb: number;
  k: number;
  sb: number;
  cs: number;        // Caught stealing
  // Fielding stats
  putouts: number;
  assists: number;
  fieldingErrors: number;  // Renamed from 'errors' to avoid confusion with reaching on error
}

const initialStats: PlayerStats = {
  pa: 0, ab: 0, h: 0, singles: 0, doubles: 0, triples: 0, hr: 0, rbi: 0, r: 0, bb: 0, k: 0, sb: 0, cs: 0,
  putouts: 0, assists: 0, fieldingErrors: 0,
};

// ============================================
// PITCHER GAME STATS (Accumulated per game)
// Per STAT_TRACKING_ARCHITECTURE_SPEC.md
// ============================================
interface PitcherGameStats {
  pitcherId: string;
  pitcherName: string;
  teamId: string;
  isStarter: boolean;
  entryInning: number;

  // Accumulated pitching stats
  outsRecorded: number;
  hitsAllowed: number;
  runsAllowed: number;
  earnedRuns: number;
  walksAllowed: number;
  strikeoutsThrown: number;
  homeRunsAllowed: number;
  hitBatters: number;
  basesReachedViaError: number;  // Runners reaching on ANY defensive error
  wildPitches: number;
  pitchCount: number;
  battersFaced: number;

  // Tracking for specific detections
  consecutiveHRsAllowed: number;
  firstInningRuns: number;
  basesLoadedWalks: number;
  inningsComplete: number;
}

const createInitialPitcherStats = (
  pitcherId: string,
  pitcherName: string,
  teamId: string,
  isStarter: boolean,
  entryInning: number
): PitcherGameStats => ({
  pitcherId,
  pitcherName,
  teamId,
  isStarter,
  entryInning,
  outsRecorded: 0,
  hitsAllowed: 0,
  runsAllowed: 0,
  earnedRuns: 0,
  walksAllowed: 0,
  strikeoutsThrown: 0,
  homeRunsAllowed: 0,
  hitBatters: 0,
  basesReachedViaError: 0,
  wildPitches: 0,
  pitchCount: 0,
  battersFaced: 0,
  consecutiveHRsAllowed: 0,
  firstInningRuns: 0,
  basesLoadedWalks: 0,
  inningsComplete: 0,
});

export default function GameTracker() {
  // Game state
  const [inning, setInning] = useState(1);
  const [halfInning, setHalfInning] = useState<HalfInning>('TOP');
  const [outs, setOuts] = useState(0);
  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);
  const [bases, setBases] = useState<Bases>(createEmptyBases());
  const [currentBatterIndex, setCurrentBatterIndex] = useState(0);

  // Player stats
  const [playerStats, setPlayerStats] = useState<Record<string, PlayerStats>>(
    Object.fromEntries(demoLineup.map(p => [p.id, { ...initialStats }]))
  );

  // Activity log
  const [activityLog, setActivityLog] = useState<string[]>([]);

  // At-bat flow state
  const [pendingResult, setPendingResult] = useState<AtBatResult | null>(null);

  // Event flow state
  const [pendingEvent, setPendingEvent] = useState<GameEvent | null>(null);

  // Substitution state
  const [lineupState, setLineupState] = useState<LineupState>(createInitialLineupState());
  const [substitutionHistory, setSubstitutionHistory] = useState<SubstitutionEvent[]>([]);

  // Pending substitution modals
  const [pendingSubType, setPendingSubType] = useState<'PITCH_CHANGE' | 'PINCH_HIT' | 'PINCH_RUN' | 'DEF_SUB' | null>(null);

  // Undo stack
  const [undoStack, setUndoStack] = useState<string[]>([]);

  // ============================================
  // FAME SYSTEM STATE
  // Per FAN_HAPPINESS_SPEC.md
  // ============================================
  const [fameEvents, setFameEvents] = useState<FameEvent[]>([]);
  const [fameToasts, setFameToasts] = useState<FameEvent[]>([]);
  const [fameModalOpen, setFameModalOpen] = useState(false);
  // Fame settings with toggle functions
  const [fameSettings, setFameSettings] = useState<FameAutoDetectionSettings>(DEFAULT_FAME_SETTINGS);

  // Toggle Fame toast notifications
  const toggleFameToasts = useCallback(() => {
    setFameSettings(prev => ({ ...prev, showToasts: !prev.showToasts }));
  }, []);
  const [endGameFameSummaryOpen, setEndGameFameSummaryOpen] = useState(false);
  const [preSelectedFameEvent, setPreSelectedFameEvent] = useState<FameEventType | undefined>(undefined);

  // Game ID for Fame events (would come from game setup in full implementation)
  const gameId = 'demo-game';

  // Team identifiers
  const awayTeamId = 'away';
  const homeTeamId = 'home';
  const awayTeamName = 'AWAY';
  const homeTeamName = 'HOME';

  // Fame auto-detection tracking state
  const [lastHRBatterId, setLastHRBatterId] = useState<string | null>(null);
  const [consecutiveHRCount, setConsecutiveHRCount] = useState(0);
  const [atBatCount, setAtBatCount] = useState(0);
  const [inningStrikeouts, setInningStrikeouts] = useState(0);
  // Track max deficit each team has faced (for comeback detection)
  const [maxDeficitAway, setMaxDeficitAway] = useState(0);  // Max runs away team trailed by
  const [maxDeficitHome, setMaxDeficitHome] = useState(0);  // Max runs home team trailed by

  // ============================================
  // PITCHER GAME STATS (Accumulated per game)
  // Per STAT_TRACKING_ARCHITECTURE_SPEC.md
  // ============================================
  // Track each pitcher's accumulated stats throughout the game
  // Key: pitcherId, Value: accumulated stats
  const [pitcherGameStats, setPitcherGameStats] = useState<Map<string, PitcherGameStats>>(() => {
    // Initialize with placeholder starting pitchers (would be set during game setup)
    const initialMap = new Map<string, PitcherGameStats>();
    initialMap.set('home_pitcher', createInitialPitcherStats('home_pitcher', 'Home Starter', 'home', true, 1));
    initialMap.set('away_pitcher', createInitialPitcherStats('away_pitcher', 'Away Starter', 'away', true, 1));
    return initialMap;
  });

  // Get current pitcher based on half inning
  const getCurrentPitcherId = useCallback(() => {
    // When TOP of inning, home team is pitching; when BOTTOM, away team is pitching
    return halfInning === 'TOP' ? 'home_pitcher' : 'away_pitcher';
  }, [halfInning]);

  // Initialize Fame detection hook
  const fameDetection = useFameDetection({
    settings: fameSettings,
    onFameDetected: (result) => {
      addFameEvent(result.event);
    }
  });

  // ============================================
  // GAME PERSISTENCE (Phase 2)
  // Per STAT_TRACKING_ARCHITECTURE_SPEC.md
  // ============================================
  const gamePersistence = useGamePersistence({ enabled: true, autoSaveDelay: 500 });

  // Track if we've attempted to restore from saved state
  const hasAttemptedRestore = useRef(false);
  const [showRecoveryPrompt, setShowRecoveryPrompt] = useState(false);

  // Check for saved game on mount
  useEffect(() => {
    if (hasAttemptedRestore.current || gamePersistence.isLoading) return;
    hasAttemptedRestore.current = true;

    if (gamePersistence.hasSavedGame) {
      setShowRecoveryPrompt(true);
    }
  }, [gamePersistence.isLoading, gamePersistence.hasSavedGame]);

  // Build current state for persistence
  const buildPersistenceState = useCallback((): GameStateForPersistence => {
    return {
      gameId,
      inning,
      halfInning,
      outs,
      homeScore,
      awayScore,
      bases,
      currentBatterIndex,
      atBatCount,
      awayTeamId,
      homeTeamId,
      awayTeamName,
      homeTeamName,
      playerStats,
      pitcherGameStats,
      fameEvents,
      lastHRBatterId,
      consecutiveHRCount,
      inningStrikeouts,
      maxDeficitAway,
      maxDeficitHome,
      activityLog,
    };
  }, [
    gameId, inning, halfInning, outs, homeScore, awayScore, bases,
    currentBatterIndex, atBatCount, awayTeamId, homeTeamId, awayTeamName, homeTeamName,
    playerStats, pitcherGameStats, fameEvents, lastHRBatterId, consecutiveHRCount,
    inningStrikeouts, maxDeficitAway, maxDeficitHome, activityLog
  ]);

  // Auto-save when key game state changes
  useEffect(() => {
    // Don't save during initial load or if recovery prompt is shown
    if (gamePersistence.isLoading || showRecoveryPrompt) return;
    // Don't save if game hasn't started (no at-bats yet)
    if (atBatCount === 0 && inning === 1 && outs === 0) return;

    gamePersistence.triggerAutoSave(buildPersistenceState());
  }, [
    inning, halfInning, outs, homeScore, awayScore, atBatCount,
    buildPersistenceState, gamePersistence, showRecoveryPrompt
  ]);

  // Restore game from saved state
  const handleRestoreGame = useCallback(async () => {
    const savedState = await gamePersistence.loadGame();
    if (savedState) {
      // Restore all state from saved game
      setInning(savedState.inning);
      setHalfInning(savedState.halfInning);
      setOuts(savedState.outs);
      setHomeScore(savedState.homeScore);
      setAwayScore(savedState.awayScore);
      setBases(savedState.bases);
      setCurrentBatterIndex(savedState.currentBatterIndex);
      setAtBatCount(savedState.atBatCount);
      setPlayerStats(savedState.playerStats);
      setPitcherGameStats(savedState.pitcherGameStats);
      setFameEvents(savedState.fameEvents);
      setLastHRBatterId(savedState.lastHRBatterId);
      setConsecutiveHRCount(savedState.consecutiveHRCount);
      setInningStrikeouts(savedState.inningStrikeouts);
      setMaxDeficitAway(savedState.maxDeficitAway);
      setMaxDeficitHome(savedState.maxDeficitHome);
      setActivityLog(savedState.activityLog);

      // Add recovery message to log
      setActivityLog(prev => [`📂 Game restored from save`, ...prev.slice(0, 9)]);
    }
    setShowRecoveryPrompt(false);
  }, [gamePersistence]);

  // Start new game (discard saved)
  const handleDiscardSave = useCallback(async () => {
    await gamePersistence.clearGame();
    setShowRecoveryPrompt(false);
  }, [gamePersistence]);

  // ============================================
  // LIVE STATS (Phase 3 Enhancement)
  // Loads season stats once, then calculates live stats by merging with game stats
  // ============================================
  const liveStats = useLiveStats({ autoLoad: true });

  // Get live batting stats for a player (season + current game)
  const getPlayerLiveBatting = useCallback((playerId: string) => {
    const gameStats = playerStats[playerId];
    if (!gameStats) return null;
    return liveStats.getLiveBatting(playerId, toGameBattingStats(gameStats));
  }, [liveStats, playerStats]);

  // Get live pitching stats for a pitcher (season + current game)
  const getPitcherLivePitching = useCallback((pitcherId: string) => {
    const gameStats = pitcherGameStats.get(pitcherId);
    if (!gameStats) return null;
    // Map PitcherGameStats fields to expected format
    return liveStats.getLivePitching(pitcherId, toGamePitchingStats({
      pitcherId: gameStats.pitcherId,
      pitcherName: gameStats.pitcherName,
      outsRecorded: gameStats.outsRecorded,
      hitsAllowed: gameStats.hitsAllowed,
      walksAllowed: gameStats.walksAllowed,
      strikeouts: gameStats.strikeoutsThrown,
      homeRunsAllowed: gameStats.homeRunsAllowed,
      runsAllowed: gameStats.runsAllowed,
      earnedRuns: gameStats.earnedRuns,
      hitBatsmen: gameStats.hitBatters,
      wildPitches: gameStats.wildPitches,
      basesReachedViaError: gameStats.basesReachedViaError,
    }));
  }, [liveStats, pitcherGameStats]);

  // Create player list for Fame modal
  const awayPlayers = demoLineup.map(p => ({
    playerId: p.id,
    playerName: p.name,
    position: p.position,
    teamId: awayTeamId
  }));
  const homePlayers = demoLineup.map(p => ({
    playerId: `home_${p.id}`,
    playerName: `${p.name} (H)`,
    position: p.position,
    teamId: homeTeamId
  }));

  // Add Fame event
  const addFameEvent = useCallback((event: FameEvent) => {
    setFameEvents(prev => [...prev, event]);

    // Show toast if enabled
    if (fameSettings.showToasts) {
      setFameToasts(prev => [...prev, event]);
    }

    // Add to activity log
    const symbol = event.fameType === 'bonus' ? '⭐' : '💀';
    const valueStr = event.fameValue > 0 ? `+${event.fameValue}` : `${event.fameValue}`;
    setActivityLog(prev => [
      `${symbol} ${event.playerName}: ${event.description || event.eventType} (${valueStr} Fame)`,
      ...prev.slice(0, 9)
    ]);
  }, [fameSettings.showToasts]);

  // Dismiss Fame toast
  const dismissFameToast = useCallback((eventId: string) => {
    setFameToasts(prev => prev.filter(e => e.id !== eventId));
  }, []);

  // ============================================
  // UPDATE PITCHER STATS (Accumulate on each at-bat)
  // Per STAT_TRACKING_ARCHITECTURE_SPEC.md
  // ============================================
  const updatePitcherStats = useCallback((
    result: AtBatResult,
    outsOnPlay: number,
    runsScored: number,
    basesLoaded: boolean
  ) => {
    const pitcherId = getCurrentPitcherId();

    setPitcherGameStats(prev => {
      const newMap = new Map(prev);
      const stats = newMap.get(pitcherId);
      if (!stats) return prev;

      const updated = { ...stats };

      // Always increment batters faced
      updated.battersFaced += 1;

      // Update based on result
      switch (result) {
        case '1B':
        case '2B':
        case '3B':
          updated.hitsAllowed += 1;
          updated.consecutiveHRsAllowed = 0;
          break;
        case 'HR':
          updated.hitsAllowed += 1;
          updated.homeRunsAllowed += 1;
          updated.consecutiveHRsAllowed += 1;
          break;
        case 'K':
        case 'KL':
          updated.strikeoutsThrown += 1;
          updated.outsRecorded += 1;
          break;
        case 'BB':
          updated.walksAllowed += 1;
          if (basesLoaded) {
            updated.basesLoadedWalks += 1;
          }
          break;
        case 'IBB':
          // IBB doesn't count toward walks for pitching stats
          break;
        case 'HBP':
          updated.hitBatters += 1;
          break;
        case 'E':
          updated.basesReachedViaError += 1;  // KEY: This accumulates!
          break;
        case 'GO':
        case 'FO':
        case 'LO':
        case 'PO':
        case 'SF':
        case 'SAC':
          updated.outsRecorded += outsOnPlay;
          updated.consecutiveHRsAllowed = 0;
          break;
        case 'DP':
          updated.outsRecorded += outsOnPlay;  // Usually 2
          updated.consecutiveHRsAllowed = 0;
          break;
        case 'FC':
          updated.outsRecorded += outsOnPlay;  // Usually 1 (runner out)
          updated.consecutiveHRsAllowed = 0;
          break;
        case 'D3K':
          updated.strikeoutsThrown += 1;
          // Runner may or may not be out - outsOnPlay handles it
          updated.outsRecorded += outsOnPlay;
          break;
      }

      // Track runs allowed
      updated.runsAllowed += runsScored;

      // Track first inning runs
      if (stats.isStarter && stats.entryInning === 1) {
        // This is simplified - would need to track which inning we're in
        // For now, just track all runs for starter
        updated.firstInningRuns += runsScored;
      }

      newMap.set(pitcherId, updated);
      return newMap;
    });
  }, [getCurrentPitcherId]);

  // Open Fame modal with optional pre-selected event type
  const openFameModal = useCallback((eventType?: FameEventType) => {
    setPreSelectedFameEvent(eventType);
    setFameModalOpen(true);
  }, []);

  // Current batter - use lineupState for live substitutions, fall back to demo for initial
  const currentBatterFromLineup = lineupState.lineup.find(
    (p) => p.battingOrder === currentBatterIndex + 1
  );
  const currentBatter = currentBatterFromLineup
    ? {
        id: currentBatterFromLineup.playerId,
        name: currentBatterFromLineup.playerName,
        position: currentBatterFromLineup.position,
        grade: 'A', // Grade not tracked in lineup state
        jerseyNumber: 0, // Jersey not tracked in lineup state
      }
    : demoLineup[currentBatterIndex];

  // Save state for undo
  const saveStateForUndo = () => {
    const state = JSON.stringify({
      inning, halfInning, outs, homeScore, awayScore, bases,
      currentBatterIndex, playerStats, activityLog,
      lineupState, substitutionHistory  // Include lineup state for proper undo
    });
    setUndoStack(prev => [...prev.slice(-9), state]);
  };

  // Handle undo
  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const prevState = JSON.parse(undoStack[undoStack.length - 1]);
    setInning(prevState.inning);
    setHalfInning(prevState.halfInning);
    setOuts(prevState.outs);
    setHomeScore(prevState.homeScore);
    setAwayScore(prevState.awayScore);
    setBases(prevState.bases);
    setCurrentBatterIndex(prevState.currentBatterIndex);
    setPlayerStats(prevState.playerStats);
    setActivityLog(prevState.activityLog);
    // Restore lineup state if present (for backward compatibility with existing undo stack)
    if (prevState.lineupState) {
      setLineupState(prevState.lineupState);
    }
    if (prevState.substitutionHistory) {
      setSubstitutionHistory(prevState.substitutionHistory);
    }
    setUndoStack(prev => prev.slice(0, -1));
  };

  // Calculate situational context
  const situationalContext = updateSituationalContext(
    { away: awayScore, home: homeScore },
    inning,
    halfInning,
    bases
  );

  // Infield Fly Rule is in effect when:
  // 1. Less than 2 outs
  // 2. Runners on 1st and 2nd, OR bases loaded
  const isInfieldFlyRule = outs < 2 && bases.first && bases.second;

  // Advance to next batter
  const advanceBatter = () => {
    setCurrentBatterIndex((currentBatterIndex + 1) % demoLineup.length);
  };

  // Handle end of game - run Fame detection for game-level achievements
  const handleEndGame = useCallback(() => {
    // Build game context for end-game detection
    const gameContext = {
      gameId,
      inning,
      halfInning,
      outs,
      score: { away: awayScore, home: homeScore },
      bases,
      isGameOver: true,
      scheduledInnings: 9,
      maxDeficitOvercome: awayScore > homeScore ? maxDeficitAway : maxDeficitHome,
      lastHRBatterId,
      consecutiveHRCount,
      isFirstAtBatOfGame: false,
      leadChanges: 0,
      previousLeadTeam: (awayScore > homeScore ? 'away' : homeScore > awayScore ? 'home' : 'tie') as 'away' | 'home' | 'tie',
      maxLeadBlown: { away: 0, home: 0 }
    };

    // Build pitcher stats for end-game detection FROM ACCUMULATED GAME STATS
    // Per STAT_TRACKING_ARCHITECTURE_SPEC.md - uses persistent game state
    const allPitchers = Array.from(pitcherGameStats.values()).map(accumulated => ({
      playerId: accumulated.pitcherId,
      playerName: accumulated.pitcherName,
      teamId: accumulated.teamId,
      position: 'P' as Position,
      hits: { '1B': 0, '2B': 0, '3B': 0, 'HR': 0 },
      strikeouts: 0,
      walks: 0,
      atBats: 0,
      runnersLeftOnBase: 0,
      gidp: 0,
      totalHits: 0,
      isPinchHitter: false,
      battingOrderPosition: 9,
      // USE ACCUMULATED STATS for end-game detection (no-hitter, perfect game, etc.)
      runsAllowed: accumulated.runsAllowed,
      hitsAllowed: accumulated.hitsAllowed,
      walksAllowed: accumulated.walksAllowed,
      hitBatters: accumulated.hitBatters,
      outs: accumulated.outsRecorded,
      homeRunsAllowed: accumulated.homeRunsAllowed,
      consecutiveHRsAllowed: accumulated.consecutiveHRsAllowed,
      pitchCount: accumulated.pitchCount,
      isStarter: accumulated.isStarter,
      inningsComplete: accumulated.inningsComplete,
      strikeoutsThrown: accumulated.strikeoutsThrown,
      firstInningRuns: accumulated.firstInningRuns,
      basesLoadedWalks: accumulated.basesLoadedWalks,
      basesReachedViaError: accumulated.basesReachedViaError,  // ACCUMULATED - critical for perfect game!
      errors: 0,
      outfieldAssistsAtHome: 0
    }));

    // Run end-game Fame detection
    fameDetection.checkEndGameFame(gameContext, allPitchers);

    // Check for comeback win (team-level)
    // Use the winning team's max deficit they overcame
    const winningTeamDeficit = awayScore > homeScore ? maxDeficitAway : maxDeficitHome;
    if (winningTeamDeficit >= 3) {
      const winningTeamId = awayScore > homeScore ? awayTeamId : homeTeamId;
      const winningTeamName = awayScore > homeScore ? awayTeamName : homeTeamName;
      fameDetection.detectComebackWin(gameContext, winningTeamId, winningTeamName);
    }

    // Archive completed game and clear saved state
    const persistedState = buildPersistenceState();
    gamePersistence.archiveGame(persistedState, { away: awayScore, home: homeScore });

    // Aggregate game stats into season totals (Phase 3)
    aggregateGameToSeason(persistedState).catch(err => {
      console.error('Failed to aggregate game stats to season:', err);
    });

    // Open the end-game Fame summary
    setEndGameFameSummaryOpen(true);
  }, [
    gameId, inning, halfInning, outs, awayScore, homeScore, bases,
    maxDeficitAway, maxDeficitHome, lastHRBatterId, consecutiveHRCount,
    pitcherGameStats, fameDetection, awayTeamId, homeTeamId, awayTeamName, homeTeamName,
    gamePersistence, buildPersistenceState
  ]);

  // Check if game should end based on score and inning
  const checkGameEnd = useCallback((
    currentInning: number,
    currentHalf: HalfInning,
    away: number,
    home: number
  ): boolean => {
    // Game must be at least in 9th inning
    if (currentInning < 9) return false;

    // After top of 9th+: If home team is ahead, game ends (no need to bat)
    if (currentHalf === 'TOP' && home > away) {
      return true;
    }

    // After bottom of 9th+: If home team is ahead OR away is ahead, game ends
    if (currentHalf === 'BOTTOM') {
      // Home took the lead (walk-off) - handled separately in scoreRun
      // Away is ahead after bottom completes
      if (away > home) return true;
      // Home is ahead (completed their at-bat)
      if (home > away) return true;
    }

    return false;
  }, []);

  // Flip inning
  const flipInning = useCallback(() => {
    // Check if game should end BEFORE flipping
    const gameEnds = checkGameEnd(inning, halfInning, awayScore, homeScore);

    if (gameEnds) {
      // Trigger end-game Fame detection
      handleEndGame();
      return; // Don't flip - game is over
    }

    // Special case: After top of 9th+, if home is ahead, don't flip to bottom
    if (halfInning === 'TOP' && inning >= 9 && homeScore > awayScore) {
      handleEndGame();
      return;
    }

    setOuts(0);
    setBases(createEmptyBases());
    setInningStrikeouts(0);  // Reset strikeout counter for new half-inning
    setConsecutiveHRCount(0); // Reset consecutive HR count
    setLastHRBatterId(null);  // Reset last HR batter
    if (halfInning === 'TOP') {
      setHalfInning('BOTTOM');
    } else {
      setHalfInning('TOP');
      setInning(i => i + 1);
    }
  }, [halfInning, inning, awayScore, homeScore, checkGameEnd, handleEndGame]);

  // Add outs and check for inning end
  const addOuts = (numOuts: number) => {
    const newOuts = outs + numOuts;
    if (newOuts >= 3) {
      flipInning();
    } else {
      setOuts(newOuts);
    }
  };

  // Score a run
  const scoreRun = (runnerId: string) => {
    if (halfInning === 'TOP') {
      setAwayScore(s => {
        const newAwayScore = s + 1;
        // Track max deficit for home team (they're now further behind)
        const homeDeficit = newAwayScore - homeScore;
        if (homeDeficit > maxDeficitHome) {
          setMaxDeficitHome(homeDeficit);
        }
        return newAwayScore;
      });
    } else {
      setHomeScore(s => {
        const newHomeScore = s + 1;
        // Track max deficit for away team (they're now further behind)
        const awayDeficit = newHomeScore - awayScore;
        if (awayDeficit > maxDeficitAway) {
          setMaxDeficitAway(awayDeficit);
        }
        return newHomeScore;
      });
    }
    setPlayerStats(prev => ({
      ...prev,
      [runnerId]: { ...prev[runnerId], r: prev[runnerId].r + 1 }
    }));
  };

  // Find player ID by defensive position (for fielding stat credit)
  const getPlayerIdByPosition = (position: Position): string | null => {
    const player = lineupState.lineup.find(p => p.position === position);
    return player?.playerId || null;
  };

  // Credit fielding stats (putout, assist)
  const creditFieldingStats = (putoutPosition: Position | null, assistPositions: Position[]) => {
    setPlayerStats(prev => {
      const updated = { ...prev };

      // Credit putout
      if (putoutPosition) {
        const putoutPlayerId = getPlayerIdByPosition(putoutPosition);
        if (putoutPlayerId && updated[putoutPlayerId]) {
          updated[putoutPlayerId] = {
            ...updated[putoutPlayerId],
            putouts: (updated[putoutPlayerId].putouts || 0) + 1,
          };
        }
      }

      // Credit assists
      for (const assistPos of assistPositions) {
        const assistPlayerId = getPlayerIdByPosition(assistPos);
        if (assistPlayerId && updated[assistPlayerId]) {
          updated[assistPlayerId] = {
            ...updated[assistPlayerId],
            assists: (updated[assistPlayerId].assists || 0) + 1,
          };
        }
      }

      return updated;
    });
  };

  // Check if a runner outcome is a force out
  // Force outs occur when a runner is REQUIRED to advance and is put out at the next base
  const isForceOut = (
    outcome: RunnerOutcome | null,
    fromBase: 'first' | 'second' | 'third',
    currentBases: Bases
  ): boolean => {
    if (!outcome) return false;
    
    // Force out scenarios:
    // - Runner on 1st out at 2B is ALWAYS a force (batter forces them)
    if (fromBase === 'first' && outcome === 'OUT_2B') {
      return true;
    }
    
    // - Runner on 2nd out at 3B is a force ONLY if 1st was also occupied (chain force)
    if (fromBase === 'second' && outcome === 'OUT_3B' && currentBases.first) {
      return true;
    }
    
    // - Runner on 3rd out at home is a force ONLY if 1st AND 2nd were occupied (bases loaded)
    if (fromBase === 'third' && outcome === 'OUT_HOME' && currentBases.first && currentBases.second) {
      return true;
    }
    
    return false;
  };

  // Process runner outcomes from at-bat flow
  // CRITICAL: Implements force out third out rule - no runs score if 3rd out is a force out
  const processRunnerOutcomes = (
    flowState: AtBatFlowState,
    newBases: Bases,
    batterResult: AtBatResult
  ): { updatedBases: Bases; runsScored: string[]; outsRecorded: number } => {
    const { runnerOutcomes } = flowState;
    let updatedBases = { ...newBases };
    const runsToScore: string[] = []; // Player IDs of runners who would score
    let runnerOutsRecorded = 0;
    
    // First pass: determine what WOULD happen (don't execute yet)
    // Track which runners would score and which would be out
    const runnerResults: {
      third?: { action: 'score' | 'out' | 'advance' | 'hold'; isForceOut: boolean };
      second?: { action: 'score' | 'out' | 'advance' | 'hold'; isForceOut: boolean };
      first?: { action: 'score' | 'out' | 'advance' | 'hold'; isForceOut: boolean };
    } = {};
    
    if (bases.third && runnerOutcomes.third) {
      const forceOut = isForceOut(runnerOutcomes.third, 'third', bases);
      if (runnerOutcomes.third === 'SCORED') {
        runnerResults.third = { action: 'score', isForceOut: false };
        runsToScore.push(bases.third.playerId);
      } else if (runnerOutcomes.third === 'OUT_HOME') {
        runnerResults.third = { action: 'out', isForceOut: forceOut };
        runnerOutsRecorded++;
      } else if (runnerOutcomes.third === 'HELD') {
        runnerResults.third = { action: 'hold', isForceOut: false };
      }
    }
    
    if (bases.second && runnerOutcomes.second) {
      const forceOut = isForceOut(runnerOutcomes.second, 'second', bases);
      if (runnerOutcomes.second === 'SCORED') {
        runnerResults.second = { action: 'score', isForceOut: false };
        runsToScore.push(bases.second.playerId);
      } else if (runnerOutcomes.second === 'TO_3B') {
        runnerResults.second = { action: 'advance', isForceOut: false };
      } else if (runnerOutcomes.second === 'OUT_HOME' || runnerOutcomes.second === 'OUT_3B') {
        runnerResults.second = { action: 'out', isForceOut: forceOut };
        runnerOutsRecorded++;
      } else if (runnerOutcomes.second === 'HELD') {
        runnerResults.second = { action: 'hold', isForceOut: false };
      }
    }
    
    if (bases.first && runnerOutcomes.first) {
      const forceOut = isForceOut(runnerOutcomes.first, 'first', bases);
      if (runnerOutcomes.first === 'SCORED') {
        runnerResults.first = { action: 'score', isForceOut: false };
        runsToScore.push(bases.first.playerId);
      } else if (runnerOutcomes.first === 'TO_3B') {
        runnerResults.first = { action: 'advance', isForceOut: false };
      } else if (runnerOutcomes.first === 'TO_2B') {
        runnerResults.first = { action: 'advance', isForceOut: false };
      } else if (['OUT_HOME', 'OUT_3B', 'OUT_2B'].includes(runnerOutcomes.first)) {
        runnerResults.first = { action: 'out', isForceOut: forceOut };
        runnerOutsRecorded++;
      } else if (runnerOutcomes.first === 'HELD') {
        runnerResults.first = { action: 'hold', isForceOut: false };
      }
    }
    
    // Calculate total outs on this play
    const batterOuts = isOut(batterResult) ? (batterResult === 'DP' ? 2 : 1) : 0;
    const totalOutsOnPlay = batterOuts + runnerOutsRecorded;
    const finalOutCount = outs + totalOutsOnPlay;
    
    // CRITICAL CHECK: If we reach 3+ outs AND any out is a force out, NO runs score
    // MLB Rule 5.08(a): A run does NOT score if third out is made by:
    // (1) batter-runner before touching first base (GO)
    // (2) any runner being forced out
    // (3) preceding runner missing a base (appeal)
    const hasForceOut = 
      (runnerResults.third?.isForceOut) ||
      (runnerResults.second?.isForceOut) ||
      (runnerResults.first?.isForceOut) ||
      // Batter out at first on GO/DP/FC = rule 5.08(a)(1)
      (batterResult === 'GO' || batterResult === 'DP' || batterResult === 'FC');
    
    const runsNegatedByForceOut = finalOutCount >= 3 && hasForceOut;
    
    // Second pass: execute the outcomes
    const validRunsScored: string[] = [];
    
    // Process third base runner
    if (bases.third && runnerResults.third) {
      if (runnerResults.third.action === 'score' && !runsNegatedByForceOut) {
        validRunsScored.push(bases.third.playerId);
      }
      if (runnerResults.third.action === 'score' || runnerResults.third.action === 'out') {
        updatedBases.third = null;
      }
    }
    
    // Process second base runner
    if (bases.second && runnerResults.second) {
      if (runnerResults.second.action === 'score' && !runsNegatedByForceOut) {
        validRunsScored.push(bases.second.playerId);
      }
      if (runnerResults.second.action === 'advance') {
        updatedBases.third = bases.second;
        updatedBases.second = null;
      } else if (runnerResults.second.action === 'score' || runnerResults.second.action === 'out') {
        updatedBases.second = null;
      }
    }
    
    // Process first base runner
    if (bases.first && runnerResults.first) {
      if (runnerResults.first.action === 'score' && !runsNegatedByForceOut) {
        validRunsScored.push(bases.first.playerId);
      }
      if (runnerOutcomes.first === 'TO_3B') {
        updatedBases.third = bases.first;
        updatedBases.first = null;
      } else if (runnerOutcomes.first === 'TO_2B') {
        updatedBases.second = bases.first;
        updatedBases.first = null;
      } else if (runnerResults.first.action === 'score' || runnerResults.first.action === 'out') {
        updatedBases.first = null;
      }
    }
    
    return {
      updatedBases,
      runsScored: validRunsScored,
      outsRecorded: runnerOutsRecorded
    };
  };

  // Handle at-bat result selection
  const handleResultSelect = (result: AtBatResult) => {
    saveStateForUndo();

    if (['K', 'KL'].includes(result) && !bases.first && !bases.second && !bases.third) {
      setPlayerStats(prev => ({
        ...prev,
        [currentBatter.id]: {
          ...prev[currentBatter.id],
          pa: prev[currentBatter.id].pa + 1,
          ab: prev[currentBatter.id].ab + 1,
          k: prev[currentBatter.id].k + 1,
        }
      }));
      setActivityLog(prev => [
        `${currentBatter.name} strikes out${result === 'KL' ? ' looking' : ''}.`,
        ...prev.slice(0, 9)
      ]);
      addOuts(1);
      advanceBatter();
      return;
    }

    setPendingResult(result);
  };

  // Handle at-bat flow completion
  const handleAtBatFlowComplete = (flowState: AtBatFlowState) => {
    const { result, rbiCount } = flowState;
    if (!result) return;

    const stats = { ...playerStats[currentBatter.id] };
    stats.pa++;

    if (!['BB', 'IBB', 'HBP', 'SF', 'SAC'].includes(result)) {
      stats.ab++;
    }

    if (isHit(result)) {
      stats.h++;
      // Track specific hit types
      if (result === '1B') stats.singles++;
      else if (result === '2B') stats.doubles++;
      else if (result === '3B') stats.triples++;
      else if (result === 'HR') stats.hr++;
    }

    if (['K', 'KL'].includes(result)) {
      stats.k++;
    }

    if (['BB', 'IBB'].includes(result)) {
      stats.bb++;
    }

    // Process base states
    let newBases: Bases = { ...bases };
    let totalOutsToAdd = 0;
    // RBI will be set after processing runner outcomes (may be adjusted for force out)
    let actualRbiCount = rbiCount;

    // Handle HR - clears bases, batter scores (HR can never be negated by force out)
    if (result === 'HR') {
      if (bases.third) scoreRun(bases.third.playerId);
      if (bases.second) scoreRun(bases.second.playerId);
      if (bases.first) scoreRun(bases.first.playerId);
      scoreRun(currentBatter.id);
      newBases = createEmptyBases();
    } else {
      // Use new processRunnerOutcomes that handles force out third out rule
      const runnerResult = processRunnerOutcomes(flowState, newBases, result);
      newBases = runnerResult.updatedBases;
      
      // Score the valid runs (already filtered for force out rule)
      runnerResult.runsScored.forEach(playerId => scoreRun(playerId));
      
      // If runs were negated by force out, adjust RBI count
      const runsRequested = [
        flowState.runnerOutcomes.first === 'SCORED' ? 1 : 0,
        flowState.runnerOutcomes.second === 'SCORED' ? 1 : 0,
        flowState.runnerOutcomes.third === 'SCORED' ? 1 : 0,
      ].reduce((a, b) => a + b, 0);
      
      if (runnerResult.runsScored.length < runsRequested) {
        // Some runs were negated - adjust RBI (force out negates RBI)
        actualRbiCount = runnerResult.runsScored.length;
      }
      
      // Track runner outs for total out count
      totalOutsToAdd += runnerResult.outsRecorded;

      // Place batter on base if they reached (HR already handled above)
      // EXCEPTION: If batter was out advancing (e.g., double but out stretching to 3B),
      // they get credit for the hit but do NOT end up on base
      if (reachesBase(result) && !flowState.batterOutAdvancing) {
        const newRunner: Runner = {
          playerId: currentBatter.id,
          playerName: currentBatter.name,
          inheritedFrom: null,
        };

        if (result === '3B') {
          newBases.third = newRunner;
        } else if (result === '2B') {
          newBases.second = newRunner;
        } else {
          newBases.first = newRunner;
        }
      }

      // If batter was thrown out advancing (e.g., double but out at 3B), add an out
      // and credit fielding stats (putout + assists)
      if (flowState.batterOutAdvancing) {
        totalOutsToAdd += 1;
        // Credit the fielders who made the play
        creditFieldingStats(
          flowState.batterOutAdvancing.putoutBy,
          flowState.batterOutAdvancing.assistBy
        );
        // TODO: Fame tracking - Aggressive baserunning that failed = -1 Fame Boner
        // This is NOT a TOOTBLAN (per SPECIAL_EVENTS_SPEC: "Thrown out stretching a double
        // to triple (aggressive, not stupid)" is explicitly NOT a TOOTBLAN)
        // When Fame system is implemented:
        // addFameEvent(currentBatter.id, 'BONER', -1, 'Thrown out stretching hit');
      }
    }

    // Update stats with actual RBI count (may be adjusted for force out)
    stats.rbi = stats.rbi - rbiCount + actualRbiCount;
    setPlayerStats(prev => ({
      ...prev,
      [currentBatter.id]: stats
    }));

    setBases(newBases);

    // Add outs from the batter result
    if (isOut(result)) {
      totalOutsToAdd += result === 'DP' ? 2 : 1;
    }
    
    // Add all outs at once
    if (totalOutsToAdd > 0) {
      addOuts(totalOutsToAdd);
    }

    // Process extra events (SB, WP, PB, E, BALK during the at-bat)
    const extraEventLogs: string[] = [];
    if (flowState.extraEvents && flowState.extraEvents.length > 0) {
      for (const extraEvent of flowState.extraEvents) {
        // Update stats for stolen bases
        if (extraEvent.event === 'SB') {
          // Find the runner's player ID to update their SB stat
          const runnerBase = extraEvent.from === '1B' ? 'first' : extraEvent.from === '2B' ? 'second' : 'third';
          const runner = bases[runnerBase];
          if (runner) {
            setPlayerStats(prev => ({
              ...prev,
              [runner.playerId]: {
                ...prev[runner.playerId],
                sb: (prev[runner.playerId]?.sb || 0) + 1
              }
            }));
          }
          extraEventLogs.push(`${extraEvent.runner}: Steals ${extraEvent.to === 'HOME' ? 'home' : extraEvent.to}`);
        } else if (extraEvent.event === 'WP') {
          extraEventLogs.push(`Wild Pitch: ${extraEvent.runner} advances to ${extraEvent.to === 'HOME' ? 'home' : extraEvent.to}`);
        } else if (extraEvent.event === 'PB') {
          extraEventLogs.push(`Passed Ball: ${extraEvent.runner} advances to ${extraEvent.to === 'HOME' ? 'home' : extraEvent.to}`);
        } else if (extraEvent.event === 'E') {
          extraEventLogs.push(`Error: ${extraEvent.runner} advances to ${extraEvent.to === 'HOME' ? 'home' : extraEvent.to}`);
        } else if (extraEvent.event === 'BALK') {
          extraEventLogs.push(`Balk: ${extraEvent.runner} advances to ${extraEvent.to === 'HOME' ? 'home' : extraEvent.to}`);
        }
      }
    }

    // Generate main at-bat log entry
    const logEntry = generateActivityLog(flowState, currentBatter.name);

    // Add all log entries (extra events first, then main result)
    // This shows the sequence: extra event happened, then the at-bat result
    const allLogEntries = [...extraEventLogs, logEntry];
    setActivityLog(prev => [...allLogEntries, ...prev.slice(0, 10 - allLogEntries.length)]);

    // ============================================
    // UPDATE PITCHER STATS (Accumulate)
    // Per STAT_TRACKING_ARCHITECTURE_SPEC.md
    // ============================================
    const basesLoaded = !!(bases.first && bases.second && bases.third);

    // Calculate runs scored on this play for pitcher stats
    let runsOnThisPlay = 0;
    if (result === 'HR') {
      // HR: batter + all runners on base
      runsOnThisPlay = 1 + (bases.first ? 1 : 0) + (bases.second ? 1 : 0) + (bases.third ? 1 : 0);
    } else {
      // Use actualRbiCount as proxy for runs scored (close enough for most cases)
      runsOnThisPlay = actualRbiCount;
    }

    // Update accumulated pitcher stats BEFORE detection
    updatePitcherStats(result, totalOutsToAdd, runsOnThisPlay, basesLoaded);

    // ============================================
    // FAME AUTO-DETECTION
    // ============================================
    const currentTeamId = halfInning === 'TOP' ? awayTeamId : homeTeamId;

    // Build batter stats for detection
    const batterStatsForFame = {
      playerId: currentBatter.id,
      playerName: currentBatter.name,
      teamId: currentTeamId,
      position: currentBatter.position as Position,
      hits: {
        '1B': stats.singles,
        '2B': stats.doubles,
        '3B': stats.triples,
        'HR': stats.hr
      },
      strikeouts: stats.k,
      walks: stats.bb,
      atBats: stats.ab,
      runnersLeftOnBase: 0,  // Would track per-game LOB
      gidp: 0,               // Would track GIDP count
      totalHits: stats.h,
      isPinchHitter: false,  // Would check from lineup state
      battingOrderPosition: currentBatterIndex + 1,
      runsAllowed: 0,
      hitsAllowed: 0,
      walksAllowed: 0,
      hitBatters: 0,
      outs: 0,
      homeRunsAllowed: 0,
      consecutiveHRsAllowed: 0,
      pitchCount: 0,
      isStarter: true,
      inningsComplete: 0,
      strikeoutsThrown: 0,
      firstInningRuns: 0,
      basesLoadedWalks: 0,
      basesReachedViaError: 0,
      errors: 0,
      outfieldAssistsAtHome: 0
    };

    // Build pitcher stats for detection FROM ACCUMULATED GAME STATS
    // Per STAT_TRACKING_ARCHITECTURE_SPEC.md - uses persistent game state
    const currentPitcherId = getCurrentPitcherId();
    const accumulatedPitcherStats = pitcherGameStats.get(currentPitcherId);

    const pitcherStatsForFame = {
      playerId: accumulatedPitcherStats?.pitcherId || 'pitcher',
      playerName: accumulatedPitcherStats?.pitcherName || 'Pitcher',
      teamId: halfInning === 'TOP' ? homeTeamId : awayTeamId,
      position: 'P' as Position,
      hits: { '1B': 0, '2B': 0, '3B': 0, 'HR': 0 },
      strikeouts: 0,
      walks: 0,
      atBats: 0,
      runnersLeftOnBase: 0,
      gidp: 0,
      totalHits: 0,
      isPinchHitter: false,
      battingOrderPosition: 9,
      // USE ACCUMULATED STATS (these persist across at-bats!)
      runsAllowed: accumulatedPitcherStats?.runsAllowed || 0,
      hitsAllowed: accumulatedPitcherStats?.hitsAllowed || 0,
      walksAllowed: accumulatedPitcherStats?.walksAllowed || 0,
      hitBatters: accumulatedPitcherStats?.hitBatters || 0,
      outs: accumulatedPitcherStats?.outsRecorded || 0,
      homeRunsAllowed: accumulatedPitcherStats?.homeRunsAllowed || 0,
      consecutiveHRsAllowed: accumulatedPitcherStats?.consecutiveHRsAllowed || 0,
      pitchCount: accumulatedPitcherStats?.pitchCount || 0,
      isStarter: accumulatedPitcherStats?.isStarter ?? true,
      inningsComplete: accumulatedPitcherStats?.inningsComplete || 0,
      strikeoutsThrown: accumulatedPitcherStats?.strikeoutsThrown || 0,
      firstInningRuns: accumulatedPitcherStats?.firstInningRuns || 0,
      basesLoadedWalks: accumulatedPitcherStats?.basesLoadedWalks || 0,
      basesReachedViaError: accumulatedPitcherStats?.basesReachedViaError || 0,  // ACCUMULATED - persists!
      errors: 0,  // Fielding errors - separate tracking
      outfieldAssistsAtHome: 0
    };

    // Build game context
    // For mid-game detection, use current batting team's deficit
    const currentTeamDeficit = halfInning === 'TOP' ? maxDeficitAway : maxDeficitHome;
    const gameContext = {
      gameId,
      inning,
      halfInning,
      outs,
      score: { away: awayScore, home: homeScore },
      bases,
      isGameOver: false,
      scheduledInnings: 9,
      maxDeficitOvercome: currentTeamDeficit,
      lastHRBatterId,
      consecutiveHRCount,
      isFirstAtBatOfGame: atBatCount === 0,
      leadChanges: 0,
      previousLeadTeam: (awayScore > homeScore ? 'away' : homeScore > awayScore ? 'home' : 'tie') as 'away' | 'home' | 'tie',
      maxLeadBlown: { away: 0, home: 0 }
    };

    // Run fame detection
    fameDetection.checkForFameEvents(
      gameContext,
      batterStatsForFame,
      pitcherStatsForFame,
      result,
      actualRbiCount,
      basesLoaded,
      inningStrikeouts
    );

    // Track HR for back-to-back detection
    if (result === 'HR') {
      if (lastHRBatterId && lastHRBatterId !== currentBatter.id) {
        setConsecutiveHRCount(prev => prev + 1);
      } else {
        setConsecutiveHRCount(1);
      }
      setLastHRBatterId(currentBatter.id);
    } else {
      setConsecutiveHRCount(0);
      setLastHRBatterId(null);
    }

    // Track strikeouts for "strike out the side" detection
    if (['K', 'KL'].includes(result)) {
      setInningStrikeouts(prev => prev + 1);
    }

    // Increment at-bat count
    setAtBatCount(prev => prev + 1);

    advanceBatter();
    setPendingResult(null);
  };

  // Generate activity log entry
  const generateActivityLog = (flowState: AtBatFlowState, batterName: string): string => {
    const { result, rbiCount, direction, hrDistance } = flowState;
    let log = `${batterName}: `;

    switch (result) {
      case 'HR':
        log += `HOME RUN${hrDistance ? ` (${hrDistance} ft)` : ''}${direction ? ` to ${direction}` : ''}! ${rbiCount} RBI.`;
        break;
      case '3B':
        log += `Triple${direction ? ` to ${direction}` : ''}`;
        if (flowState.batterOutAdvancing) {
          log += `, OUT at home stretching for inside-the-park HR (-1 Fame)`;
        }
        log += `. ${rbiCount} RBI.`;
        break;
      case '2B':
        log += `Double${direction ? ` to ${direction}` : ''}`;
        if (flowState.batterOutAdvancing) {
          log += `, OUT at 3B stretching (-1 Fame)`;
        }
        log += `. ${rbiCount} RBI.`;
        break;
      case '1B':
        log += `Single${direction ? ` to ${direction}` : ''}`;
        if (flowState.batterOutAdvancing) {
          log += `, OUT at 2B stretching (-1 Fame)`;
        }
        log += `. ${rbiCount > 0 ? `${rbiCount} RBI.` : ''}`;
        break;
      case 'BB':
        log += 'Walks.';
        break;
      case 'IBB':
        log += 'Intentionally walked.';
        break;
      case 'K':
        log += 'Strikes out swinging.';
        break;
      case 'KL':
        log += 'Strikes out looking.';
        break;
      case 'GO':
        log += `Grounds out to ${flowState.fielder || 'infield'}.`;
        break;
      case 'FO':
        log += `Flies out to ${flowState.fielder || 'outfield'}.`;
        break;
      case 'LO':
        log += `Lines out to ${flowState.fielder || 'field'}.`;
        break;
      case 'PO':
        log += `Pops out to ${flowState.fielder || 'infield'}.`;
        break;
      case 'DP':
        log += 'Grounds into double play.';
        break;
      case 'SF':
        log += `Sacrifice fly. ${rbiCount} RBI.`;
        break;
      case 'SAC':
        log += 'Sacrifice bunt.';
        break;
      case 'HBP':
        log += 'Hit by pitch.';
        break;
      case 'E':
        log += 'Reaches on error.';
        break;
      case 'FC':
        log += "Fielder's choice.";
        break;
      case 'D3K':
        log += 'Reaches on dropped 3rd strike.';
        break;
      default:
        log += result;
    }

    return log;
  };

  // Handle game events (non-at-bat)
  const handleEvent = (event: GameEvent) => {
    const hasRunners = bases.first || bases.second || bases.third;

    // Runner-dependent events require runners
    if (!hasRunners && ['SB', 'CS', 'WP', 'PB', 'PK', 'BALK'].includes(event)) {
      return;
    }

    // Pinch runner requires runners
    if (event === 'PINCH_RUN' && !hasRunners) {
      return;
    }

    saveStateForUndo();

    switch (event) {
      case 'SB':
        setPendingEvent('SB');
        break;
      case 'CS':
        setPendingEvent('CS');
        break;
      case 'WP':
        setPendingEvent('WP');
        break;
      case 'PB':
        setPendingEvent('PB');
        break;
      case 'PK':
        setPendingEvent('PK');
        break;
      case 'BALK':
        handleBalk();
        break;
      // Substitution events
      case 'PITCH_CHANGE':
        setPendingSubType('PITCH_CHANGE');
        break;
      case 'PINCH_HIT':
        setPendingSubType('PINCH_HIT');
        break;
      case 'PINCH_RUN':
        setPendingSubType('PINCH_RUN');
        break;
      case 'DEF_SUB':
        setPendingSubType('DEF_SUB');
        break;
      default:
        break;
    }
  };

  // Handle substitution completion
  const handleSubstitutionComplete = (event: SubstitutionEvent) => {
    // Apply the substitution to lineup state
    const newLineupState = applySubstitution(lineupState, event, inning);
    setLineupState(newLineupState);

    // Initialize stats for any new players entering the game
    const newPlayerIds: string[] = [];
    if (event.eventType === 'PINCH_HIT') {
      newPlayerIds.push((event as PinchHitterEvent).pinchHitterId);
    } else if (event.eventType === 'PINCH_RUN') {
      newPlayerIds.push((event as PinchRunnerEvent).pinchRunnerId);
    } else if (event.eventType === 'DEF_SUB') {
      newPlayerIds.push(...(event as DefensiveSubEvent).substitutions.map((s) => s.playerInId));
    } else if (event.eventType === 'PITCH_CHANGE') {
      newPlayerIds.push((event as PitchingChangeEvent).incomingPitcherId);
    }

    // Add stats entries for new players
    if (newPlayerIds.length > 0) {
      setPlayerStats((prev) => {
        const updated = { ...prev };
        for (const id of newPlayerIds) {
          if (!updated[id]) {
            updated[id] = { ...initialStats };
          }
        }
        return updated;
      });
    }

    // Add to history
    setSubstitutionHistory((prev) => [...prev, event]);

    // Generate activity log
    let logEntry = '';
    switch (event.eventType) {
      case 'PITCH_CHANGE': {
        const pc = event as PitchingChangeEvent;
        logEntry = `Pitching change: ${pc.incomingPitcherName} replaces ${pc.outgoingPitcherName} (${pc.outgoingPitchCount} pitches)`;
        if (pc.inheritedRunners > 0) {
          logEntry += ` - ${pc.inheritedRunners} inherited runner${pc.inheritedRunners > 1 ? 's' : ''}`;
        }
        break;
      }
      case 'PINCH_HIT': {
        const ph = event as PinchHitterEvent;
        logEntry = `Pinch hitter: ${ph.pinchHitterName} batting for ${ph.replacedPlayerName}`;
        break;
      }
      case 'PINCH_RUN': {
        const pr = event as PinchRunnerEvent;
        logEntry = `Pinch runner: ${pr.pinchRunnerName} running for ${pr.replacedPlayerName} at ${pr.base}`;
        break;
      }
      case 'DEF_SUB': {
        const ds = event as DefensiveSubEvent;
        logEntry = `Defensive sub: ${ds.substitutions.map((s) => `${s.playerInName} for ${s.playerOutName} at ${s.position}`).join(', ')}`;
        break;
      }
    }

    if (logEntry) {
      setActivityLog((prev) => [logEntry, ...prev.slice(0, 9)]);
    }

    // Update bases if pinch runner (replace runner reference)
    if (event.eventType === 'PINCH_RUN') {
      const pr = event as PinchRunnerEvent;
      const newBases = { ...bases };
      const newRunner: Runner = {
        playerId: pr.pinchRunnerId,
        playerName: pr.pinchRunnerName,
        inheritedFrom: pr.pitcherResponsible, // Maintain pitcher responsibility
      };
      if (pr.base === '1B') newBases.first = newRunner;
      else if (pr.base === '2B') newBases.second = newRunner;
      else if (pr.base === '3B') newBases.third = newRunner;
      setBases(newBases);
    }

    // Close modal
    setPendingSubType(null);
  };

  // Handle balk
  const handleBalk = () => {
    let newBases = { ...bases };

    if (bases.third) {
      scoreRun(bases.third.playerId);
      newBases.third = null;
    }

    if (bases.second) {
      newBases.third = bases.second;
      newBases.second = null;
    }

    if (bases.first) {
      newBases.second = bases.first;
      newBases.first = null;
    }

    setBases(newBases);
    setActivityLog(prev => ['Balk - all runners advance one base.', ...prev.slice(0, 9)]);
  };

  // Handle event flow completion
  const handleEventFlowComplete = (result: EventResult) => {
    const { event, runner, outcome, toBase } = result;
    let newBases = { ...bases };
    const runnerInfo = bases[runner];
    const runnerName = runnerInfo?.playerName?.split(' ').pop() || 'Runner';

    if (outcome === 'OUT') {
      newBases[runner] = null;
      addOuts(1);
      const eventName = event === 'SB' ? 'caught stealing' : event === 'PK' ? 'picked off' : 'out';
      setActivityLog(prev => [`${runnerName} ${eventName} at ${toBase || 'base'}.`, ...prev.slice(0, 9)]);
    } else if (outcome === 'SCORE') {
      if (runnerInfo) {
        scoreRun(runnerInfo.playerId);
      }
      newBases[runner] = null;
      const eventName = event === 'SB' ? 'steals home!' : `scores on ${event}`;
      setActivityLog(prev => [`${runnerName} ${eventName}`, ...prev.slice(0, 9)]);
    } else if (outcome === 'ADVANCE') {
      if (toBase === 'second') {
        newBases.second = runnerInfo;
        newBases.first = null;
      } else if (toBase === 'third') {
        newBases.third = runner === 'first' ? runnerInfo : bases.second;
        if (runner === 'first') newBases.first = null;
        else newBases.second = null;
      }
      const eventName = event === 'SB' ? `steals ${toBase}` : `advances to ${toBase} on ${event}`;
      setActivityLog(prev => [`${runnerName} ${eventName}.`, ...prev.slice(0, 9)]);
    }

    setBases(newBases);
    setPendingEvent(null);
  };

  // Handle base click
  const handleBaseClick = (base: 'first' | 'second' | 'third' | 'home') => {
    console.log('Base clicked:', base);
  };

  // Get due up batters
  const getDueUp = () => {
    const dueUp = [];
    for (let i = 1; i <= 3; i++) {
      const idx = (currentBatterIndex + i) % demoLineup.length;
      dueUp.push(demoLineup[idx]);
    }
    return dueUp;
  };

  // Show loading state while checking for saved game
  if (gamePersistence.isLoading) {
    return (
      <div style={{ ...styles.container, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ textAlign: 'center', color: '#fff' }}>
          <div style={{ fontSize: '24px', marginBottom: '16px' }}>⚾</div>
          <div>Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Game Recovery Prompt Modal */}
      {showRecoveryPrompt && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.8)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            backgroundColor: '#1a1a2e',
            padding: '32px',
            borderRadius: '12px',
            border: '2px solid #4a9eff',
            maxWidth: '400px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📂</div>
            <h2 style={{ color: '#fff', marginBottom: '16px' }}>Game In Progress</h2>
            <p style={{ color: '#aaa', marginBottom: '24px' }}>
              A saved game was found. Would you like to continue where you left off?
            </p>
            {gamePersistence.lastSavedAt && (
              <p style={{ color: '#666', fontSize: '12px', marginBottom: '24px' }}>
                Last saved: {new Date(gamePersistence.lastSavedAt).toLocaleString()}
              </p>
            )}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button
                onClick={handleRestoreGame}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#4a9eff',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                }}
              >
                Continue Game
              </button>
              <button
                onClick={handleDiscardSave}
                style={{
                  padding: '12px 24px',
                  backgroundColor: '#333',
                  color: '#fff',
                  border: '1px solid #555',
                  borderRadius: '6px',
                  cursor: 'pointer',
                }}
              >
                Start Fresh
              </button>
            </div>
          </div>
        </div>
      )}

      <Scoreboard
        awayName="AWAY"
        homeName="HOME"
        awayScore={awayScore}
        homeScore={homeScore}
        inning={inning}
        halfInning={halfInning}
        outs={outs}
        gameNumber={1}
      />

      <div style={styles.mainContent}>
        <div style={styles.leftPanel}>
          <Diamond bases={bases} onBaseClick={handleBaseClick} />

          <div style={styles.dueUp}>
            <div style={styles.dueUpLabel}>DUE UP:</div>
            {getDueUp().map((player, i) => (
              <div key={player.id} style={styles.dueUpPlayer}>
                {currentBatterIndex + i + 2}. {player.name}
              </div>
            ))}
          </div>
        </div>

        <div style={styles.rightPanel}>
          <div style={styles.atBatCard}>
            <div style={styles.atBatHeader}>CURRENT AT-BAT</div>

            <div style={styles.batterName}>
              #{currentBatter.jerseyNumber} {currentBatter.name}
            </div>
            <div style={styles.batterInfo}>
              {currentBatter.position} | {currentBatter.grade} |{' '}
              {playerStats[currentBatter.id].h}-{playerStats[currentBatter.id].ab}
            </div>

            <div style={styles.badges}>
              {situationalContext.isClutchSituation && (
                <span style={styles.clutchBadge}>⚠️ CLUTCH</span>
              )}
              {situationalContext.isRISP && (
                <span style={styles.rispBadge}>RISP</span>
              )}
              {situationalContext.isWalkOffOpportunity && (
                <span style={styles.walkoffBadge}>🎆 WALK-OFF OPP</span>
              )}
              {isInfieldFlyRule && (
                <span style={styles.ifrBadge}>IFR</span>
              )}
            </div>
          </div>
        </div>
      </div>

      <AtBatButtons
        onResult={handleResultSelect}
        onEvent={handleEvent}
        disabled={pendingResult !== null || pendingEvent !== null}
        outs={outs}
        bases={bases}
      />

      <div style={styles.activityLog}>
        <div style={styles.activityHeader}>
          <span>📻 ACTIVITY LOG</span>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button style={styles.undoButton} onClick={handleUndo} disabled={undoStack.length === 0}>
              ↩ Undo
            </button>
            <button
              style={{ ...styles.undoButton, backgroundColor: '#4CAF50', color: '#000' }}
              onClick={handleEndGame}
            >
              🏁 End Game
            </button>
          </div>
        </div>
        {activityLog.length === 0 ? (
          <div style={styles.activityEmpty}>No plays recorded yet.</div>
        ) : (
          activityLog.map((entry, i) => (
            <div key={i} style={styles.activityEntry}>{entry}</div>
          ))
        )}
      </div>

      {pendingResult && (
        <AtBatFlow
          result={pendingResult}
          bases={bases}
          batterName={currentBatter.name}
          outs={outs}
          onComplete={handleAtBatFlowComplete}
          onCancel={() => setPendingResult(null)}
        />
      )}

      {pendingEvent && (
        <EventFlow
          event={pendingEvent}
          bases={bases}
          onComplete={handleEventFlowComplete}
          onCancel={() => setPendingEvent(null)}
        />
      )}

      {/* Substitution Modals */}
      {pendingSubType === 'PITCH_CHANGE' && (
        <PitchingChangeModal
          lineupState={lineupState}
          bases={bases}
          inning={inning}
          halfInning={halfInning}
          outs={outs}
          gameId="demo-game"
          onComplete={handleSubstitutionComplete}
          onCancel={() => setPendingSubType(null)}
        />
      )}

      {pendingSubType === 'PINCH_HIT' && (
        <PinchHitterModal
          lineupState={lineupState}
          currentBatterId={currentBatter.id}
          currentBatterName={currentBatter.name}
          currentBatterPosition={currentBatter.position}
          battingOrder={currentBatterIndex + 1}
          inning={inning}
          halfInning={halfInning}
          outs={outs}
          gameId="demo-game"
          onComplete={handleSubstitutionComplete}
          onCancel={() => setPendingSubType(null)}
        />
      )}

      {pendingSubType === 'PINCH_RUN' && (
        <PinchRunnerModal
          lineupState={lineupState}
          bases={bases}
          inning={inning}
          halfInning={halfInning}
          outs={outs}
          gameId="demo-game"
          currentPitcherId={lineupState.currentPitcher?.playerId}
          onComplete={handleSubstitutionComplete}
          onCancel={() => setPendingSubType(null)}
        />
      )}

      {pendingSubType === 'DEF_SUB' && (
        <DefensiveSubModal
          lineupState={lineupState}
          inning={inning}
          halfInning={halfInning}
          outs={outs}
          gameId="demo-game"
          onComplete={handleSubstitutionComplete}
          onCancel={() => setPendingSubType(null)}
        />
      )}

      {/* ============================================ */}
      {/* FAME SYSTEM UI                              */}
      {/* Per FAN_HAPPINESS_SPEC.md                   */}
      {/* ============================================ */}

      {/* Fame Panel - Shows game Fame summary */}
      {fameEvents.length > 0 && (
        <div style={{ marginTop: '12px' }}>
          <FamePanel
            fameEvents={fameEvents}
            awayTeamName={awayTeamName}
            homeTeamName={homeTeamName}
            awayTeamId={awayTeamId}
            homeTeamId={homeTeamId}
          />
        </div>
      )}

      {/* Quick Fame Buttons */}
      <div style={{ marginTop: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <QuickFameButtons onOpenModal={openFameModal} />
          <button
            onClick={toggleFameToasts}
            style={{
              padding: '4px 8px',
              fontSize: '12px',
              backgroundColor: fameSettings.showToasts ? '#4A5568' : '#2D3748',
              color: fameSettings.showToasts ? '#68D391' : '#A0AEC0',
              border: `1px solid ${fameSettings.showToasts ? '#68D391' : '#4A5568'}`,
              borderRadius: '4px',
              cursor: 'pointer',
            }}
            title={fameSettings.showToasts ? 'Click to disable Fame toast notifications' : 'Click to enable Fame toast notifications'}
          >
            🔔 {fameSettings.showToasts ? 'Toasts ON' : 'Toasts OFF'}
          </button>
        </div>
      </div>

      {/* Fame Event Modal */}
      <FameEventModal
        isOpen={fameModalOpen}
        onClose={() => {
          setFameModalOpen(false);
          setPreSelectedFameEvent(undefined);
        }}
        onSubmit={addFameEvent}
        gameId={gameId}
        inning={inning}
        halfInning={halfInning}
        awayPlayers={awayPlayers}
        homePlayers={homePlayers}
        awayTeamName={awayTeamName}
        homeTeamName={homeTeamName}
        preSelectedEventType={preSelectedFameEvent}
        preSelectedTeam={halfInning === 'TOP' ? 'away' : 'home'}
      />

      {/* Fame Toast Notifications */}
      {fameSettings.showToasts && fameToasts.length > 0 && (
        <FameToastContainer
          toasts={fameToasts}
          onDismiss={dismissFameToast}
        />
      )}

      {/* End Game Fame Summary */}
      <EndGameFameSummary
        isOpen={endGameFameSummaryOpen}
        onClose={() => setEndGameFameSummaryOpen(false)}
        fameEvents={fameEvents}
        awayTeamName={awayTeamName}
        homeTeamName={homeTeamName}
        awayTeamId={awayTeamId}
        homeTeamId={homeTeamId}
        winner={null} // Would be set when game ends
      />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '600px',
    margin: '0 auto',
    padding: '12px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    backgroundColor: '#1a1a2e',
    minHeight: '100vh',
    color: '#fff',
  },
  mainContent: {
    display: 'flex',
    gap: '12px',
    marginBottom: '12px',
  },
  leftPanel: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
  },
  rightPanel: {
    flex: 1,
  },
  dueUp: {
    backgroundColor: '#16213e',
    padding: '8px 12px',
    borderRadius: '8px',
    width: '100%',
  },
  dueUpLabel: {
    fontSize: '10px',
    color: '#888',
    letterSpacing: '1px',
    marginBottom: '4px',
  },
  dueUpPlayer: {
    fontSize: '12px',
    color: '#aaa',
    padding: '2px 0',
  },
  atBatCard: {
    backgroundColor: '#0f3460',
    padding: '16px',
    borderRadius: '12px',
  },
  atBatHeader: {
    fontSize: '10px',
    color: '#4CAF50',
    letterSpacing: '1px',
    marginBottom: '8px',
  },
  batterName: {
    fontSize: '20px',
    fontWeight: 'bold',
    marginBottom: '4px',
  },
  batterInfo: {
    fontSize: '13px',
    color: '#aaa',
    marginBottom: '8px',
  },
  badges: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  clutchBadge: {
    backgroundColor: '#f44336',
    color: '#fff',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 'bold',
  },
  rispBadge: {
    backgroundColor: '#FF9800',
    color: '#000',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 'bold',
  },
  walkoffBadge: {
    backgroundColor: '#9C27B0',
    color: '#fff',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 'bold',
  },
  ifrBadge: {
    backgroundColor: '#00BCD4',
    color: '#000',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 'bold',
  },
  activityLog: {
    backgroundColor: '#16213e',
    borderRadius: '12px',
    padding: '12px',
  },
  activityHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '12px',
    color: '#888',
    marginBottom: '8px',
  },
  undoButton: {
    background: 'none',
    border: '1px solid #444',
    color: '#aaa',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    cursor: 'pointer',
  },
  activityEmpty: {
    fontSize: '13px',
    color: '#666',
    textAlign: 'center',
    padding: '12px',
  },
  activityEntry: {
    fontSize: '13px',
    color: '#ccc',
    padding: '6px 0',
    borderBottom: '1px solid #333',
  },
};
