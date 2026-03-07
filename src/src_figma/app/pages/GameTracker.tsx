import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate, useParams, useLocation } from "react-router";
import { Menu, ChevronUp } from "lucide-react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
// REMOVED: BUG-009 - BaserunnerDragDrop was a placeholder that did nothing
// import { BaserunnerDragDrop, type RunnerMoveData as LegacyRunnerMoveData } from "@/app/components/BaserunnerDragDrop";
import { EnhancedInteractiveField, type PlayData, type SpecialEventData } from "@/app/components/EnhancedInteractiveField";
import { type RunnerMoveData } from "@/app/components/RunnerDragDrop";
import { RunnerPopover, type RunnerBase } from "@/app/components/RunnerPopover";
import { FielderPopover, type FielderInfo, type BenchPlayerInfo } from "@/app/components/FielderPopover";
import { LineupCard, type SubstitutionData, type LineupPlayer, type BenchPlayer, type BullpenPitcher } from "@/app/components/LineupCard";
import { UndoButton, useUndoSystem, type GameSnapshot } from "@/app/components/UndoSystem";
import { TeamRoster, type Player, type Pitcher } from "@/app/components/TeamRoster";
import { MiniScoreboard } from "@/app/components/MiniScoreboard";
import { FenwayBoard } from "@/app/components/FenwayBoard";
import { QuickBar } from "@/app/components/QuickBar";
import { PlayLogPanel, type PlayLogEntry } from "@/app/components/PlayLogPanel";
import { getTeamColors, getFielderBorderColors } from "@/config/teamColors";

const ordinalSuffix = (num: number) => {
  if (num % 100 >= 11 && num % 100 <= 13) return "th";
  switch (num % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
};

const formatInningLabel = (isTop: boolean, inning: number) => {
  const half = isTop ? "Top" : "Bottom";
  return `${half} ${inning}${ordinalSuffix(inning)}`;
};
import { areRivals } from '../../../data/leagueStructure';
import { getParkNames } from "../../../data/parkLookup";
import { useGameState, type HitType, type OutType, type WalkType, type RunnerAdvancement, type PlayerGameStats, type PitcherGameStats } from "@/hooks/useGameState";
import { usePlayerState, type PlayerStateData, getStateBadge, formatMultiplier } from "@/app/hooks/usePlayerState";
// EXH-036: Import Mojo/Fitness types for PlayerCardModal editing
import type { MojoLevel } from "../../../engines/mojoEngine";
import type { FitnessState } from "../../../engines/fitnessEngine";
import { MOJO_STATES, getMojoColor } from "../../../engines/mojoEngine";
import { FITNESS_STATES } from "../../../engines/fitnessEngine";
import { useFameTracking, type FameEventDisplay, formatFameValue, getFameColor, getLITier } from "@/app/hooks/useFameTracking";
import { FielderCreditModal, type RunnerOutInfo, type FielderCredit } from "../components/modals/FielderCreditModal";
import type { PitcherRunnerStats } from "../engines/inheritedRunnerTracker";
import { ErrorOnAdvanceModal, type RunnerAdvanceInfo, type ErrorOnAdvanceResult } from "../components/modals/ErrorOnAdvanceModal";
// MAJ-03: Wire detection system
import { runPlayDetections, type UIDetectionResult } from "../engines/detectionIntegration";
import { toMojoLabel, toFitnessLabel, type FameEventType } from "../../../types/game";
// MAJ-02: Wire fan morale to UI
import { useFanMorale, type GameResult as FanMoraleGameResult } from "../hooks/useFanMorale";
// MAJ-04: Wire narrative engine
import { generateGameRecap } from "../engines/narrativeIntegration";
// mWAR: Manager decision tracking
import { useMWARCalculations } from "../hooks/useMWARCalculations";
import type { GameStateForLI } from "../../../engines/leverageCalculator";
import { saveGameDecisions, aggregateManagerGameToSeason } from '../../../utils/managerStorage';
// T0-05: Schedule persistence — mark played games as COMPLETED
import { completeGame as completeScheduleGame } from '../../../utils/scheduleStorage';
// Fielding pipeline: extract fielding events from PlayData and log to IndexedDB
import { extractFieldingEvents, type FieldingExtractionContext } from '../utils/fieldingEventExtractor';
import { logFieldingEvent } from '../../../utils/eventLog';
import { captureStartingLineups, type LineupEntry } from '../../../utils/gameStorage';
import { POSITION_MAP } from '../components/fielderInference';
import { calculateRunnerDefaults, type RunnerDefaults } from '../components/runnerDefaults';

// Note: Using GameState from useGameState hook instead of local interface
// This interface is deprecated but kept for reference during migration
interface _DeprecatedGameState {
  homeScore: number;
  awayScore: number;
  inning: number;
  isTop: boolean;
  outs: number;
  balls: number;
  strikes: number;
  bases: { first: boolean; second: boolean; third: boolean };
  currentBatter: string;
  currentPitcher: string;
}

interface FieldPosition {
  name: string;
  position: string;
  number: string;
  svgX: number;
  svgY: number;
}

export function GameTracker() {
  const navigate = useNavigate();
  const { gameId } = useParams();
  const location = useLocation();

  // Get rosters and team info from navigation state or use defaults
  const navigationState = location.state as {
    awayPlayers?: Player[];
    awayPitchers?: Pitcher[];
    homePlayers?: Player[];
    homePitchers?: Pitcher[];
    awayTeamName?: string;
    homeTeamName?: string;
    awayTeamId?: string;
    homeTeamId?: string;
    // Team colors from database (passed from ExhibitionGame)
    awayTeamColor?: string;
    awayTeamBorderColor?: string;
    homeTeamColor?: string;
    homeTeamBorderColor?: string;
    stadiumName?: string;
    awayRecord?: string;
    homeRecord?: string;
    gameMode?: 'exhibition' | 'franchise' | 'playoff';
    leagueId?: string;
    homeManagerId?: string;
    homeManagerName?: string;
    awayManagerId?: string;
    awayManagerName?: string;
    userTeamSide?: 'home' | 'away';
    // Playoff context (for recording series results)
    playoffSeriesId?: string;
    playoffGameNumber?: number;
    franchiseId?: string;
    seasonId?: string;
    // T0-05: Schedule persistence context
    scheduleGameId?: string;
    seasonNumber?: number;
    // T0-01: Total innings for auto game-end detection
    totalInnings?: number;
  } | null;

  // Team IDs - use navigation state or standalone defaults
  const homeTeamId = navigationState?.homeTeamId || 'home';
  const awayTeamId = navigationState?.awayTeamId || 'away';
  const homeTeamName = navigationState?.homeTeamName || 'HOME';
  const awayTeamName = navigationState?.awayTeamName || 'AWAY';
  const parkNames = useMemo(() => getParkNames(), []);
  const [selectedStadium, setSelectedStadium] = useState<string | null>(() =>
    navigationState?.stadiumName || parkNames[0] || null
  );
  const showStadiumSelector = !navigationState?.stadiumName;
  const awayRecord = navigationState?.awayRecord || '0-0'; // MAJ-15: Reads actual record from route state; defaults 0-0 for exhibition
  const homeRecord = navigationState?.homeRecord || '0-0'; // MAJ-15: Reads actual record from route state; defaults 0-0 for exhibition
  const leagueId = navigationState?.leagueId || 'sml';
  const homeManagerId = navigationState?.homeManagerId || `${homeTeamId}-manager`;
  const awayManagerId = navigationState?.awayManagerId || `${awayTeamId}-manager`;
  const userTeamSide = navigationState?.userTeamSide || 'home';

  // Team colors - prefer navigation state (from database), fall back to static config
  const awayTeamColor = navigationState?.awayTeamColor || getTeamColors(awayTeamId).primary;
  const awayTeamBorderColor = navigationState?.awayTeamBorderColor || getTeamColors(awayTeamId).secondary;
  const homeTeamColor = navigationState?.homeTeamColor || getTeamColors(homeTeamId).primary;
  const homeTeamBorderColor = navigationState?.homeTeamBorderColor || getTeamColors(homeTeamId).secondary;

  // Game timer state
  const [gameStartTime] = useState(() => new Date());
  const [elapsedMinutes, setElapsedMinutes] = useState(0);

  // T1-08 FIX: Guard against double end-game execution
  // The auto-end useEffect can re-fire due to volatile deps in handleEndGame's useCallback.
  // This ref ensures handleEndGame only executes once per game.
  const gameEndingRef = useRef(false);

  // Layer 1C: Captured starting lineups for GameRecord archive
  const startingLineupsRef = useRef<{ away: LineupEntry[]; home: LineupEntry[] } | null>(null);

  // Update elapsed time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const diff = Math.floor((now.getTime() - gameStartTime.getTime()) / 60000);
      setElapsedMinutes(diff);
    }, 60000);
    return () => clearInterval(interval);
  }, [gameStartTime]);

  // Use the game state hook for real data persistence
  const {
    gameState,
    scoreboard,
    playerStats,
    pitcherStats,
    recordHit,
    recordOut,
    recordWalk,
    recordD3K,
    recordError,
    recordEvent,
    advanceRunner,
    advanceRunnersBatch,
    makeSubstitution,
    switchPositions,
    changePitcher,
    advanceCount,
    resetCount,
    endInning,
    endGame: hookEndGame,
    pitchCountPrompt,
    confirmPitchCount,
    dismissPitchCountPrompt,
    initializeGame,
    loadExistingGame,
    restoreState,
    getRunnerTrackerSnapshot,
    getBaseRunnerNames,
    runnerIdentityVersion,
    isLoading,
    isSaving,
    // T0-01: Auto game-end detection
    showAutoEndPrompt,
    dismissAutoEndPrompt,
    setPlayoffContext,
    setStadiumName,
    setNextEventEnrichment,
  } = useGameState(gameId);
  const [gameInitialized, setGameInitialized] = useState(false);

  // Set playoff context from navigation state (if this is a playoff game)
  const isPlayoffGame = navigationState?.gameMode === 'playoff';
  useEffect(() => {
    if (navigationState?.playoffSeriesId) {
      setPlayoffContext(
        navigationState.playoffSeriesId,
        navigationState.playoffGameNumber ?? null
      );
    }
  }, [navigationState?.playoffSeriesId, navigationState?.playoffGameNumber, setPlayoffContext]);

  useEffect(() => {
    const navStadium = navigationState?.stadiumName;
    if (navStadium && navStadium !== selectedStadium) {
      setSelectedStadium(navStadium);
    }
  }, [navigationState?.stadiumName, selectedStadium]);

  useEffect(() => {
    setStadiumName(selectedStadium);
  }, [selectedStadium, setStadiumName]);

  const scoreboardStadiumLabel =
    selectedStadium || getTeamColors(homeTeamId).stadium || 'BALLPARK';

  const [activityLog, setActivityLog] = useState<string[]>([]);
  const pushActivityLog = useCallback((entry: string) => {
    setActivityLog(prev => [entry, ...prev].slice(0, 20));
  }, []);
  const inningLabel = useCallback(() => {
    return formatInningLabel(gameState.isTop, Math.max(1, gameState.inning));
  }, [gameState.inning, gameState.isTop]);

  // §4.2 Structured Play Log — parallel to activityLog (which other systems still use)
  const [playLogEntries, setPlayLogEntries] = useState<PlayLogEntry[]>([]);
  const shortInningLabel = useCallback(() => {
    return `${gameState.isTop ? 'T' : 'B'}${Math.max(1, gameState.inning)}`;
  }, [gameState.isTop, gameState.inning]);

  const pushPlayLogEntry = useCallback((entry: Omit<PlayLogEntry, 'id' | 'timestamp'>) => {
    setPlayLogEntries(prev => [...prev, {
      ...entry,
      id: `play-${Date.now()}-${prev.length}`,
      timestamp: Date.now(),
    }]);
  }, []);

  const logAction = useCallback((entry: string) => {
    pushActivityLog(`${inningLabel()}: ${entry}`);
  }, [inningLabel, pushActivityLog]);

  // Player state management (Mojo, Fitness, Clutch)
  const playerStateHook = usePlayerState({
    gameId: gameId || 'demo-game',
    isPlayoffs: isPlayoffGame,
  });

  // Fame tracking
  const fameTrackingHook = useFameTracking({
    gameId: gameId || 'demo-game',
    isPlayoffs: isPlayoffGame,
  });

  const lastFameKeyRef = useRef<string>('');
  useEffect(() => {
    const event = fameTrackingHook.lastEvent;
    if (!event) {
      lastFameKeyRef.current = '';
      return;
    }
    const key = `${event.label}-${event.finalFame}-${event.icon}`;
    if (lastFameKeyRef.current === key) return;
    lastFameKeyRef.current = key;
    pushActivityLog(`✨ ${event.label} (${formatFameValue(event.finalFame)} Fame)`);
  }, [fameTrackingHook.lastEvent, formatFameValue, pushActivityLog]);

  // MAJ-02: Fan morale tracking — one hook per team for dual-team franchise support
  // In exhibition mode these are instantiated but never called (no morale in exhibition)
  const gameMode = navigationState?.gameMode || 'exhibition';
  const homeFanMorale = useFanMorale(homeTeamId);
  const awayFanMorale = useFanMorale(awayTeamId);

  // mWAR: Manager decision tracking
  const mwarHook = useMWARCalculations();

  // Initialize mWAR tracking at game start
  useEffect(() => {
    if (gameId) {
      mwarHook.initializeGame(gameId, homeManagerId);
      mwarHook.initializeSeason('season-1', homeManagerId, homeTeamId);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId]);

  // Helper to build GameStateForLI from current game state for mWAR/LI calculations
  const buildGameStateForLI = useCallback((): GameStateForLI => ({
    inning: gameState?.inning ?? 1,
    halfInning: gameState?.isTop ? 'TOP' : 'BOTTOM',
    outs: (gameState?.outs ?? 0) as 0 | 1 | 2,
    runners: {
      first: !!gameState?.bases?.first,
      second: !!gameState?.bases?.second,
      third: !!gameState?.bases?.third,
    },
    homeScore: gameState?.homeScore ?? 0,
    awayScore: gameState?.awayScore ?? 0,
  }), [gameState]);

  // Track pending mWAR decisions for outcome resolution
  const [pendingMWARDecisions, setPendingMWARDecisions] = useState<Map<string, {
    decisionId: string;
    decisionType: string;
    involvedPlayers: string[];
    resolveAfterNextPlay: boolean;
  }>>(new Map());

  // Track selected hit/out/walk details for the two-step record flow
  const [pendingOutcome, setPendingOutcome] = useState<{
    type: 'hit' | 'out' | 'walk';
    subType: string;
    direction?: string;
    rbi?: number;
    modifiers?: { ifr?: boolean }; // GAP-GT-4-H: IFR flag
  } | null>(null);

  // GAP-GT-6-A: Time play override — when user indicates the 3rd-out tag occurred before the runner scored
  const [timePlayNoRun, setTimePlayNoRun] = useState(false);

  // GAP-GT-7-C: Track pending PH — PH must bat before they can be removed from lineup
  const [pendingPH, setPendingPH] = useState<string | null>(null);

  // Player card modal state - EXH-036: Added playerId for mojo/fitness editing
  const [selectedPlayer, setSelectedPlayer] = useState<{ name: string; type: 'batter' | 'pitcher'; playerId: string } | null>(null);

  // End game confirmation state
  const [showEndGameConfirmation, setShowEndGameConfirmation] = useState(false);

  // EXH-016: Fielder credit modal state for thrown-out runners
  const [fielderCreditModalOpen, setFielderCreditModalOpen] = useState(false);
  const [pendingPlayForFielderCredit, setPendingPlayForFielderCredit] = useState<PlayData | null>(null);
  const [runnersOutForCredit, setRunnersOutForCredit] = useState<RunnerOutInfo[]>([]);

  // EXH-025: Error on advance modal state
  const [errorOnAdvanceModalOpen, setErrorOnAdvanceModalOpen] = useState(false);
  const [pendingPlayForErrorOnAdvance, setPendingPlayForErrorOnAdvance] = useState<PlayData | null>(null);
  const [runnersWithExtraAdvance, setRunnersWithExtraAdvance] = useState<RunnerAdvanceInfo[]>([]);

  // Runner names tracking - who is on each base
  // Updated when batters reach base via hit, walk, error, etc.
  const [runnerNames, setRunnerNames] = useState<{
    first?: string;
    second?: string;
    third?: string;
  }>({});

  // T1-02/03/04 FIX: Sync runnerNames from the runner tracker whenever bases change.
  // The tracker is the single source of truth for runner identity (handles SB, WP, PB,
  // pinch runners, thrown-out-advancing, etc.). Without this sync, runnerNames would
  // fall out of sync and show "R1"/"R2"/"R3" or ghost runners.
  useEffect(() => {
    const trackerNames = getBaseRunnerNames();
    setRunnerNames(prev => {
      // Only update if different to avoid infinite render loops
      if (prev.first !== trackerNames.first ||
          prev.second !== trackerNames.second ||
          prev.third !== trackerNames.third) {
        return trackerNames;
      }
      return prev;
    });
  }, [gameState.bases.first, gameState.bases.second, gameState.bases.third, runnerIdentityVersion, getBaseRunnerNames]);

  // ============================================
  // POPOVER STATE — Runner & Fielder tap menus (Layer 4)
  // ============================================
  const [activeRunnerPopover, setActiveRunnerPopover] = useState<{
    base: RunnerBase;
    anchorPosition: { left: string; top: string };
  } | null>(null);
  const [activeFielderPopover, setActiveFielderPopover] = useState<{
    fielder: FielderInfo;
    anchorPosition: { left: string; top: string };
  } | null>(null);

  // MAJ-03: Detection system state — pending prompts for user confirmation
  const [pendingDetections, setPendingDetections] = useState<UIDetectionResult[]>([]);

  // Scoreboard minimization toggle - allows field to expand
  const [isScoreboardMinimized, setIsScoreboardMinimized] = useState(false);

  // Field zoom level (0-1): 0 = full field, 1 = zoomed on infield
  // When scoreboard is minimized, auto-zoom to 0.35 for better infield visibility
  const fieldZoomLevel = isScoreboardMinimized ? 0.35 : 0;

  // Undo system - restore game state on undo
  // CRIT-01 fix: Now restores playerStats, pitcherStats Maps, and runner tracker alongside gameState/scoreboard
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleUndo = useCallback((snapshot: GameSnapshot) => {
    console.log("Restoring game state from snapshot:", snapshot.playDescription);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const storedState = snapshot.gameState as any;
    if (storedState && storedState.gameState && storedState.scoreboard) {
      // Reconstruct runner tracker from serialized snapshot (Map from entries)
      // Note: Types are loosened due to JSON serialization; restoreState validates internally
      const runnerTrackerState = storedState.runnerTrackerSnapshot
        ? {
            runners: storedState.runnerTrackerSnapshot.runners,
            currentPitcherId: storedState.runnerTrackerSnapshot.currentPitcherId as string,
            currentPitcherName: storedState.runnerTrackerSnapshot.currentPitcherName as string,
            pitcherStats: new Map(storedState.runnerTrackerSnapshot.pitcherStatsEntries) as Map<string, PitcherRunnerStats>,
            inning: storedState.runnerTrackerSnapshot.inning as number,
            atBatNumber: storedState.runnerTrackerSnapshot.atBatNumber as number,
          }
        : undefined;

      restoreState({
        gameState: storedState.gameState,
        scoreboard: storedState.scoreboard,
        // Reconstruct Maps from serialized entries (Maps don't survive JSON.stringify)
        playerStats: storedState.playerStatsEntries
          ? new Map(storedState.playerStatsEntries)
          : undefined,
        pitcherStats: storedState.pitcherStatsEntries
          ? new Map(storedState.pitcherStatsEntries)
          : undefined,
        // Restore runner tracker for correct ER attribution after undo
        runnerTrackerState,
      });
      console.log("State restored successfully (including player/pitcher stats + runner tracker)");
      // §4.2: Pop last play log entry on undo
      setPlayLogEntries(prev => prev.length > 0 ? prev.slice(0, -1) : prev);
    } else {
      console.warn("Incomplete snapshot - cannot restore", snapshot);
    }
  }, [restoreState]);

  const undoSystem = useUndoSystem(10, handleUndo); // GAP-GT-3-B: increased from 5 to 10

  // Keep undo system current state in sync with game state
  // CRIT-01 fix: Include playerStats and pitcherStats as serializable entries
  // (Maps don't survive JSON.parse(JSON.stringify(...)) used by UndoSystem deep clone)
  useEffect(() => {
    if (!gameInitialized) return;
    undoSystem.setCurrentState({
      gameState,
      scoreboard,
      playerStatsEntries: Array.from(playerStats.entries()),
      pitcherStatsEntries: Array.from(pitcherStats.entries()),
      runnerTrackerSnapshot: getRunnerTrackerSnapshot(),
    });
  }, [gameInitialized, gameState, scoreboard, playerStats, pitcherStats, getRunnerTrackerSnapshot]);

  // Expandable sections state
  const [expandedSections, setExpandedSections] = useState({
    hits: false,
    outs: false,
    walks: false,
    events: false,
    substitutions: false,
  });
  const [expandedOutcome, setExpandedOutcome] = useState<string | null>(null);

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const toggleOutcomeDetail = (outcome: string) => {
    setExpandedOutcome(prev => prev === outcome ? null : outcome);
  };

  // Determine which team is batting and which is fielding
  const battingTeamId = gameState.isTop ? awayTeamId : homeTeamId;
  const fieldingTeamId = gameState.isTop ? homeTeamId : awayTeamId;

  // GAP-GT-6-G / GAP-GT-6-C: Derived runner state for button availability
  const hasRunners = !!(gameState.bases.first || gameState.bases.second || gameState.bases.third);
  const runnerCount = (gameState.bases.first ? 1 : 0) + (gameState.bases.second ? 1 : 0) + (gameState.bases.third ? 1 : 0);

  // Get team colors - use navigation state (from database) if available, fall back to static config
  // This ensures teams loaded from IndexedDB show correct colors
  const battingTeamColors = gameState.isTop
    ? { primary: awayTeamColor, secondary: awayTeamBorderColor }
    : { primary: homeTeamColor, secondary: homeTeamBorderColor };
  const fieldingTeamColors = gameState.isTop
    ? { primary: homeTeamColor, secondary: homeTeamBorderColor }
    : { primary: awayTeamColor, secondary: awayTeamBorderColor };

  // Fielder border colors alternate between primary and secondary
  const fielderColor1 = fieldingTeamColors.primary;
  const fielderColor2 = fieldingTeamColors.secondary;

  // EXH-036: Helper to generate consistent player IDs (must match playerStateHook registration)
  const generatePlayerId = (name: string, team: 'home' | 'away') =>
    `${team}-${name.replace(/\s+/g, '-').toLowerCase()}`;

  // EXH-036: Determine current team batting (for ID generation)
  // When it's top of inning, away team bats; bottom of inning, home team bats
  const battingTeam: 'home' | 'away' = gameState.isTop ? 'away' : 'home';
  const fieldingTeam: 'home' | 'away' = gameState.isTop ? 'home' : 'away';

  // Roster data - use navigation state if available, otherwise use defaults with ZERO stats (new game)
  // Use useState so we can update the roster when substitutions are made
  const [awayTeamPlayers, setAwayTeamPlayers] = useState<Player[]>(navigationState?.awayPlayers || [
    { name: 'J. MARTINEZ', position: 'SS', battingOrder: 1, stats: { ab: 0, h: 0, r: 0, rbi: 0, bb: 0, k: 0 }, battingHand: 'R' as const },
    { name: 'A. SMITH', position: 'CF', battingOrder: 2, stats: { ab: 0, h: 0, r: 0, rbi: 0, bb: 0, k: 0 }, battingHand: 'L' as const },
    { name: 'D. JONES', position: 'LF', battingOrder: 3, stats: { ab: 0, h: 0, r: 0, rbi: 0, bb: 0, k: 0 }, battingHand: 'R' as const },
    { name: 'B. DAVIS', position: 'RF', battingOrder: 4, stats: { ab: 0, h: 0, r: 0, rbi: 0, bb: 0, k: 0 }, battingHand: 'R' as const },
    { name: 'T. BROWN', position: '1B', battingOrder: 5, stats: { ab: 0, h: 0, r: 0, rbi: 0, bb: 0, k: 0 }, battingHand: 'L' as const },
    { name: 'C. WILSON', position: '2B', battingOrder: 6, stats: { ab: 0, h: 0, r: 0, rbi: 0, bb: 0, k: 0 }, battingHand: 'R' as const },
    { name: 'M. GARCIA', position: '3B', battingOrder: 7, stats: { ab: 0, h: 0, r: 0, rbi: 0, bb: 0, k: 0 }, battingHand: 'S' as const },
    { name: 'J. MARTIN', position: 'C', battingOrder: 8, stats: { ab: 0, h: 0, r: 0, rbi: 0, bb: 0, k: 0 }, battingHand: 'R' as const },
    { name: 'R. LOPEZ', position: 'P', battingOrder: 9, stats: { ab: 0, h: 0, r: 0, rbi: 0, bb: 0, k: 0 }, battingHand: 'R' as const },
    // Bench players
    { name: 'A. TAYLOR', position: 'C', stats: { ab: 0, h: 0, r: 0, rbi: 0, bb: 0, k: 0 }, battingHand: 'R' as const },
    { name: 'B. ANDERSON', position: 'IF', stats: { ab: 0, h: 0, r: 0, rbi: 0, bb: 0, k: 0 }, battingHand: 'L' as const },
    { name: 'C. THOMAS', position: 'OF', stats: { ab: 0, h: 0, r: 0, rbi: 0, bb: 0, k: 0 }, battingHand: 'R' as const },
  ]);

  const awayTeamPitchers = navigationState?.awayPitchers || [
    { name: 'R. LOPEZ', stats: { ip: '0.0', h: 0, r: 0, er: 0, bb: 0, k: 0, pitches: 0 }, throwingHand: 'R' as const, isStarter: true, isActive: true },
    { name: 'T. JOHNSON', stats: { ip: '0.0', h: 0, r: 0, er: 0, bb: 0, k: 0, pitches: 0 }, throwingHand: 'R' as const },
    { name: 'M. WILLIAMS', stats: { ip: '0.0', h: 0, r: 0, er: 0, bb: 0, k: 0, pitches: 0 }, throwingHand: 'L' as const },
    { name: 'K. DAVIS', stats: { ip: '0.0', h: 0, r: 0, er: 0, bb: 0, k: 0, pitches: 0 }, throwingHand: 'R' as const },
  ];

  // Fallback roster data for Home Team (exhibition mode) — ZERO stats for new game
  // Use useState so we can update the roster when substitutions are made
  const [homeTeamPlayers, setHomeTeamPlayers] = useState<Player[]>(navigationState?.homePlayers || [
    { name: 'P. HERNANDEZ', position: 'CF', battingOrder: 1, stats: { ab: 0, h: 0, r: 0, rbi: 0, bb: 0, k: 0 }, battingHand: 'L' as const },
    { name: 'K. WASHINGTON', position: 'SS', battingOrder: 2, stats: { ab: 0, h: 0, r: 0, rbi: 0, bb: 0, k: 0 }, battingHand: 'R' as const },
    { name: 'L. RODRIGUEZ', position: 'LF', battingOrder: 3, stats: { ab: 0, h: 0, r: 0, rbi: 0, bb: 0, k: 0 }, battingHand: 'L' as const },
    { name: 'M. JACKSON', position: 'RF', battingOrder: 4, stats: { ab: 0, h: 0, r: 0, rbi: 0, bb: 0, k: 0 }, battingHand: 'R' as const },
    { name: 'N. MARTINEZ', position: '1B', battingOrder: 5, stats: { ab: 0, h: 0, r: 0, rbi: 0, bb: 0, k: 0 }, battingHand: 'R' as const },
    { name: 'O. THOMPSON', position: '3B', battingOrder: 6, stats: { ab: 0, h: 0, r: 0, rbi: 0, bb: 0, k: 0 }, battingHand: 'S' as const },
    { name: 'Q. GONZALEZ', position: '2B', battingOrder: 7, stats: { ab: 0, h: 0, r: 0, rbi: 0, bb: 0, k: 0 }, battingHand: 'R' as const },
    { name: 'R. ADAMS', position: 'C', battingOrder: 8, stats: { ab: 0, h: 0, r: 0, rbi: 0, bb: 0, k: 0 }, battingHand: 'R' as const },
    { name: 'S. WHITE', position: 'P', battingOrder: 9, stats: { ab: 0, h: 0, r: 0, rbi: 0, bb: 0, k: 0 }, battingHand: 'R' as const },
    // Bench players
    { name: 'E. CLARK', position: 'OF', stats: { ab: 0, h: 0, r: 0, rbi: 0, bb: 0, k: 0 }, battingHand: 'L' as const },
    { name: 'F. MILLER', position: 'IF', stats: { ab: 0, h: 0, r: 0, rbi: 0, bb: 0, k: 0 }, battingHand: 'R' as const },
    { name: 'G. EVANS', position: 'C', stats: { ab: 0, h: 0, r: 0, rbi: 0, bb: 0, k: 0 }, battingHand: 'R' as const },
  ]);

  const homeTeamPitchers = navigationState?.homePitchers || [
    { name: 'S. WHITE', stats: { ip: '0.0', h: 0, r: 0, er: 0, bb: 0, k: 0, pitches: 0 }, throwingHand: 'R' as const, isStarter: true, isActive: true },
    { name: 'U. PARKER', stats: { ip: '0.0', h: 0, r: 0, er: 0, bb: 0, k: 0, pitches: 0 }, throwingHand: 'L' as const },
    { name: 'V. TURNER', stats: { ip: '0.0', h: 0, r: 0, er: 0, bb: 0, k: 0, pitches: 0 }, throwingHand: 'R' as const },
    { name: 'W. COLLINS', stats: { ip: '0.0', h: 0, r: 0, er: 0, bb: 0, k: 0, pitches: 0 }, throwingHand: 'R' as const },
  ];

  // T0-08: Derive lineup/bench/bullpen from actual team data (dynamic, not hardcoded)
  const battingTeamPlayersRaw = gameState.isTop ? awayTeamPlayers : homeTeamPlayers;
  const fieldingTeamPitchersRaw = gameState.isTop ? homeTeamPitchers : awayTeamPitchers;

  const currentLineup = battingTeamPlayersRaw
    .filter(p => p.battingOrder !== undefined && !p.isOutOfGame)
    .sort((a, b) => (a.battingOrder || 0) - (b.battingOrder || 0))
    .map((p) => ({
      name: p.name,
      pos: p.position || 'DH',
      batting: p.name === gameState.currentBatterName,
    }));

  // GAP-GT-7-B: Lineup size validation — warn if lineup is not exactly 9 (or 10 with DH)
  const lineupSizeOk = currentLineup.length >= 9 && currentLineup.length <= 10;
  if (!lineupSizeOk && currentLineup.length > 0) {
    console.warn(`[GameTracker] Lineup size ${currentLineup.length} — expected 9 or 10 (with DH)`);
  }

  // GAP-GT-7-D: Include isOutOfGame players — they display with ❌ so user can see who was used
  const benchPlayers = battingTeamPlayersRaw
    .filter(p => p.battingOrder === undefined)
    .map(p => ({
      name: p.name,
      pos: p.position || 'UT',
      hand: p.battingHand,
      avg: '.000',
      isOutOfGame: p.isOutOfGame || false,
    }));

  const availablePitchers = fieldingTeamPitchersRaw
    .filter(p => !p.isActive && !p.isOutOfGame)
    .map(p => ({
      name: p.name,
      hand: p.throwingHand,
      fitness: '🟢',
    }));

  // LineupCard data derived from current team data
  // EXH-036: Use consistent IDs that match playerStateHook registration
  const lineupCardData: LineupPlayer[] = currentLineup.map((player, idx) => ({
    id: generatePlayerId(player.name, battingTeam),
    name: player.name,
    position: player.pos,
    battingOrder: idx + 1,
    isCurrentBatter: player.batting,
    battingHand: (battingTeamPlayersRaw.find(p => p.name === player.name)?.battingHand || 'R') as 'L' | 'R' | 'S',
  }));

  const benchCardData: BenchPlayer[] = benchPlayers.map((player) => ({
    id: generatePlayerId(player.name, battingTeam),
    name: player.name,
    positions: [player.pos],
    battingHand: player.hand as 'L' | 'R' | 'S',
    isUsed: player.isOutOfGame, // GAP-GT-7-D: ❌ for players already used/out of game
  }));

  const bullpenCardData: BullpenPitcher[] = availablePitchers.map((pitcher) => ({
    id: generatePlayerId(pitcher.name, fieldingTeam),
    name: pitcher.name,
    throwingHand: pitcher.hand as 'L' | 'R',
    fitness: 'FIT' as const,
    isUsed: false,
    isCurrentPitcher: false,
  }));

  // Derive current pitcher from actual pitcher data
  const activePitcher = fieldingTeamPitchersRaw.find(p => p.isActive) || fieldingTeamPitchersRaw.find(p => p.isStarter) || fieldingTeamPitchersRaw[0];
  const currentPitcherData: BullpenPitcher = {
    id: generatePlayerId(activePitcher?.name || 'PITCHER', fieldingTeam),
    name: activePitcher?.name || 'PITCHER',
    throwingHand: (activePitcher?.throwingHand || 'R') as 'L' | 'R',
    fitness: 'FIT',
    isCurrentPitcher: true,
  };

  // Field positions (defense) with SVG coordinates - dynamically built from fielding team's lineup
  // When isTop = true, home team is fielding; when isTop = false, away team is fielding
  const fieldingTeamPlayers = fieldingTeam === 'home' ? homeTeamPlayers : awayTeamPlayers;

  // Map position abbreviations to position numbers and SVG coordinates
  const positionMap: Record<string, { number: string; svgX: number; svgY: number }> = {
    'P': { number: '1', svgX: 200, svgY: 165 },
    'C': { number: '2', svgX: 200, svgY: 259 },
    '1B': { number: '3', svgX: 290, svgY: 152 },
    '2B': { number: '4', svgX: 256, svgY: 120 },
    '3B': { number: '5', svgX: 110, svgY: 152 },
    'SS': { number: '6', svgX: 144, svgY: 120 },
    'LF': { number: '7', svgX: 72, svgY: 72 },
    'CF': { number: '8', svgX: 200, svgY: 60 },
    'RF': { number: '9', svgX: 328, svgY: 72 },
  };

  // Build field positions from fielding team's lineup (first 9 players with valid positions)
  const fieldPositions: FieldPosition[] = fieldingTeamPlayers
    .filter(player => player.position && positionMap[player.position])
    .slice(0, 9)
    .map(player => {
      const posData = positionMap[player.position!];
      // Extract last name for display (e.g., "J. MARTINEZ" -> "MARTINEZ")
      const lastName = player.name.split(' ').pop() || player.name;
      return {
        name: lastName.toUpperCase(),
        position: player.position!,
        number: posData.number,
        svgX: posData.svgX,
        svgY: posData.svgY,
      };
    });

  // Get current pitcher numbers
  const awayPitcher = awayTeamPitchers.find(p => p.isActive);
  const homePitcher = homeTeamPitchers.find(p => p.isActive);

  // Find pitcher numbers from player rosters
  const awayPitcherPlayer = awayTeamPlayers.find(p => p.name === awayPitcher?.name);
  const homePitcherPlayer = homeTeamPlayers.find(p => p.name === homePitcher?.name);

  // Initialize game with lineup data on mount
  // FIX: BUG-007 - Try loading existing game first, only create new if none found
  // This ensures each batter has a unique ID and stats are tracked separately
  const initInProgressRef = useRef(false);
  useEffect(() => {
    if (gameInitialized || initInProgressRef.current) return;
    initInProgressRef.current = true;
    let cancelled = false;

    const initializeOrLoadGame = async () => {
      try {
        // Try to load existing game first (handles page refresh)
        const hasExistingGame = await loadExistingGame();
        if (cancelled) return;

        if (hasExistingGame) {
          console.log('[GameTracker] Loaded existing game from IndexedDB');
          setGameInitialized(true);
          return;
        }

        // No existing game found - create new one
        console.log('[GameTracker] No existing game found, initializing new game');

        // Convert roster to lineup format required by initializeGame
        const awayLineup = awayTeamPlayers
          .filter(p => p.battingOrder && p.position) // Only players in batting order with positions
          .sort((a, b) => (a.battingOrder || 0) - (b.battingOrder || 0))
          .map(p => ({
            playerId: `away-${p.name.replace(/\s+/g, '-').toLowerCase()}`,
            playerName: p.name,
            position: p.position!, // Safe - filtered above
          }));

        const homeLineup = homeTeamPlayers
          .filter(p => p.battingOrder && p.position) // Only players in batting order with positions
          .sort((a, b) => (a.battingOrder || 0) - (b.battingOrder || 0))
          .map(p => ({
            playerId: `home-${p.name.replace(/\s+/g, '-').toLowerCase()}`,
            playerName: p.name,
            position: p.position!, // Safe - filtered above
          }));

        // MAJ-09: Extract bench players (players without batting order = not in starting lineup)
        const awayStarterIds = new Set(awayLineup.map(p => p.playerId));
        const awayBench = awayTeamPlayers
          .filter(p => !awayStarterIds.has(`away-${p.name.replace(/\s+/g, '-').toLowerCase()}`))
          .filter(p => !p.isOutOfGame) // Don't include already-removed players
          .map(p => ({
            playerId: `away-${p.name.replace(/\s+/g, '-').toLowerCase()}`,
            playerName: p.name,
            positions: [p.position || 'DH'].filter(Boolean),
          }));

        const homeStarterIds = new Set(homeLineup.map(p => p.playerId));
        const homeBench = homeTeamPlayers
          .filter(p => !homeStarterIds.has(`home-${p.name.replace(/\s+/g, '-').toLowerCase()}`))
          .filter(p => !p.isOutOfGame)
          .map(p => ({
            playerId: `home-${p.name.replace(/\s+/g, '-').toLowerCase()}`,
            playerName: p.name,
            positions: [p.position || 'DH'].filter(Boolean),
          }));

        console.log('[GameTracker] Initializing game with lineups:', {
          away: awayLineup.map(p => p.playerName),
          home: homeLineup.map(p => p.playerName),
          awayBench: awayBench.map(p => p.playerName),
          homeBench: homeBench.map(p => p.playerName),
        });

        await initializeGame({
          gameId: gameId || `game-${Date.now()}`,
          seasonId: navigationState?.franchiseId
            ? `${navigationState.franchiseId}-season-${navigationState?.seasonNumber || 1}`
            : 'season-1',
          awayTeamId: awayTeamId,
          awayTeamName: awayTeamName,
          homeTeamId: homeTeamId,
          homeTeamName: homeTeamName,
          awayLineup,
          homeLineup,
          awayBench,
          homeBench,
          awayStartingPitcherId: `away-${awayPitcher?.name.replace(/\s+/g, '-').toLowerCase() || 'pitcher'}`,
          awayStartingPitcherName: awayPitcher?.name || 'Pitcher',
          homeStartingPitcherId: `home-${homePitcher?.name.replace(/\s+/g, '-').toLowerCase() || 'pitcher'}`,
          homeStartingPitcherName: homePitcher?.name || 'Pitcher',
          // T0-01: Pass total innings for auto game-end detection (default 9 for exhibition)
          totalInnings: navigationState?.totalInnings || 9,
          seasonNumber: navigationState?.seasonNumber || 1,
          stadiumName: selectedStadium || undefined,
          // Layer 1B: Context snapshot config
          franchiseId: navigationState?.franchiseId,
          leagueId: navigationState?.leagueId || 'sml',
          awayRecord: (() => { const [w, l] = awayRecord.split('-').map(Number); return { w: w || 0, l: l || 0 }; })(),
          homeRecord: (() => { const [w, l] = homeRecord.split('-').map(Number); return { w: w || 0, l: l || 0 }; })(),
        });

        // Layer 1C: Snapshot starting lineups for GameRecord archive
        startingLineupsRef.current = captureStartingLineups(awayLineup, homeLineup);

        if (!cancelled) {
          setGameInitialized(true);
        }
      } catch (err) {
        console.error('[GameTracker] Failed to initialize/load game:', err);
        // Fail-open so a transient persistence error cannot black-screen the UI.
        if (!cancelled) {
          setGameInitialized(true);
        }
      } finally {
        initInProgressRef.current = false;
      }
    };

    initializeOrLoadGame();
    return () => {
      cancelled = true;
      initInProgressRef.current = false;
    };
  }, [gameInitialized, awayTeamPlayers, homeTeamPlayers, awayPitcher, homePitcher, awayTeamId, homeTeamId, gameId, initializeGame, loadExistingGame, selectedStadium, navigationState?.franchiseId, navigationState?.seasonNumber, navigationState?.totalInnings, awayTeamName, homeTeamName]);

  // EXH-036: Register players with playerStateHook for mojo/fitness tracking
  // This runs once after game is initialized to set up all players with default states
  useEffect(() => {
    if (!gameInitialized) return;

    // Helper to get player ID from name (consistent with how gameState creates IDs)
    const getPlayerId = (name: string, teamPrefix: string) =>
      `${teamPrefix}-${name.replace(/\s+/g, '-').toLowerCase()}`;

    // Register all away team batters
    awayTeamPlayers.forEach((player) => {
      const playerId = getPlayerId(player.name, 'away');
      // Only register if not already registered
      if (!playerStateHook.getPlayer(playerId)) {
        playerStateHook.registerPlayer(
          playerId,
          player.name,
          (player.position || 'DH') as import('../../../engines/fitnessEngine').PlayerPosition,
          0, // Starting mojo: Normal
          'FIT', // Starting fitness: FIT
          [], // Traits (not available in current Player type)
          25 // Default age
        );
      }
    });

    // Register all home team batters
    homeTeamPlayers.forEach((player) => {
      const playerId = getPlayerId(player.name, 'home');
      if (!playerStateHook.getPlayer(playerId)) {
        playerStateHook.registerPlayer(
          playerId,
          player.name,
          (player.position || 'DH') as import('../../../engines/fitnessEngine').PlayerPosition,
          0,
          'FIT',
          [],
          25
        );
      }
    });

    // Register pitchers
    if (awayPitcher) {
      const pitcherId = getPlayerId(awayPitcher.name, 'away');
      if (!playerStateHook.getPlayer(pitcherId)) {
        playerStateHook.registerPlayer(
          pitcherId,
          awayPitcher.name,
          'SP',
          0,
          'FIT',
          [],
          25
        );
      }
    }
    if (homePitcher) {
      const pitcherId = getPlayerId(homePitcher.name, 'home');
      if (!playerStateHook.getPlayer(pitcherId)) {
        playerStateHook.registerPlayer(
          pitcherId,
          homePitcher.name,
          'SP',
          0,
          'FIT',
          [],
          25
        );
      }
    }

    console.log('[GameTracker] Registered players with playerStateHook for mojo/fitness tracking');
  }, [gameInitialized, awayTeamPlayers, homeTeamPlayers, awayPitcher, homePitcher, playerStateHook]);

  // EXH-036: Helper functions to get/set mojo/fitness by player name and team
  // These are used by TeamRoster components to enable mojo/fitness editing in player cards
  const getPlayerIdFromName = useCallback((name: string, team: 'away' | 'home') => {
    return `${team}-${name.replace(/\s+/g, '-').toLowerCase()}`;
  }, []);

  const getPlayerMojoByName = useCallback((name: string, team: 'away' | 'home') => {
    const playerId = getPlayerIdFromName(name, team);
    const playerData = playerStateHook.getPlayer(playerId);
    return playerData?.gameState.currentMojo;
  }, [getPlayerIdFromName, playerStateHook]);

  const getPlayerFitnessByName = useCallback((name: string, team: 'away' | 'home') => {
    const playerId = getPlayerIdFromName(name, team);
    const playerData = playerStateHook.getPlayer(playerId);
    return playerData?.fitnessProfile.currentFitness;
  }, [getPlayerIdFromName, playerStateHook]);

  const setPlayerMojoByName = useCallback((name: string, team: 'away' | 'home', newMojo: MojoLevel) => {
    const playerId = getPlayerIdFromName(name, team);
    playerStateHook.setMojo(playerId, newMojo);
  }, [getPlayerIdFromName, playerStateHook]);

  const setPlayerFitnessByName = useCallback((name: string, team: 'away' | 'home', newFitness: FitnessState) => {
    const playerId = getPlayerIdFromName(name, team);
    playerStateHook.setFitness(playerId, newFitness);
  }, [getPlayerIdFromName, playerStateHook]);

  // Get current batter's lineup position
  const battingTeamPlayers = gameState.isTop ? awayTeamPlayers : homeTeamPlayers;
  const pitchingTeamPlayers = gameState.isTop ? homeTeamPlayers : awayTeamPlayers;
  const currentBatterData = battingTeamPlayers.find(p => p.battingOrder && p.name === gameState.currentBatterName);
  const currentBatterPosition = currentBatterData?.battingOrder || 1;
  const currentBatterPositionStr = currentBatterPosition.toString();
  const atBatDigit1 = currentBatterPositionStr.length > 1 ? currentBatterPositionStr[0] : '';
  const atBatDigit2 = currentBatterPositionStr.length > 1 ? currentBatterPositionStr[1] : currentBatterPositionStr[0];

  // Get current batter's game stats from the playerStats Map
  const currentBatterStats = playerStats.get(gameState.currentBatterId);
  const batterHits = currentBatterStats?.h ?? 0;
  const batterAB = currentBatterStats?.ab ?? 0;

  // Get current pitcher's game stats from the pitcherStats Map
  const currentPitcherStats = pitcherStats.get(gameState.currentPitcherId);
  const pitcherPitchCount = currentPitcherStats?.pitchCount ?? 0;

  // Format display name: "J. MARTINEZ" -> show as is, or "John Martinez" -> "J. MARTINEZ"
  const formatDisplayName = (name: string | undefined): string => {
    if (!name) return 'UNKNOWN';
    // If already in "F. LAST" format, return as-is
    if (name.match(/^[A-Z]\.\s[A-Z]+$/)) return name;
    // Otherwise, format "First Last" to "F. LAST"
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return `${parts[0][0]}. ${parts[parts.length - 1].toUpperCase()}`;
    }
    return name.toUpperCase();
  };

  const currentBatterDisplayName = formatDisplayName(gameState.currentBatterName);
  const currentPitcherDisplayName = formatDisplayName(gameState.currentPitcherName);

  // Get current batter's fielding position (e.g., "SS", "CF")
  const batterFieldingPosition = currentBatterData?.position || '?';

  // Get batter's grade (from player data if available)
  const batterGrade = 'A'; // TODO: Get from player database when available

  // Handler for enhanced runner drag-drop (Phase 5)
  const handleEnhancedRunnerMove = useCallback((data: RunnerMoveData) => {
    console.log("Enhanced runner move:", data);

    // Capture snapshot for undo before making the change
    undoSystem.captureSnapshot(`Runner ${data.playType}: ${data.from} → ${data.to} (${data.outcome})`);

    // Use the hook's advanceRunner function
    const fromBase = data.from;
    const toBase = data.to as 'second' | 'third' | 'home';
    advanceRunner(fromBase, toBase, data.outcome);

    // Log the play type for potential event recording
    if (data.playType === 'SB' || data.playType === 'CS') {
      console.log(`Record ${data.playType}: ${data.outcome === 'safe' ? 'Success' : 'Out'}`);
    }
  }, [advanceRunner]);

  // Handler for batch runner moves (SB/CS/PK/TBL with multiple runners)
  // This processes all runner movements atomically to avoid race conditions
  const handleBatchRunnerMove = useCallback((
    movements: Array<{ from: 'first' | 'second' | 'third'; to: 'second' | 'third' | 'home' | 'out'; outcome: 'safe' | 'out' }>,
    playType: string
  ) => {
    console.log("Batch runner move:", movements, "type:", playType);

    // Capture snapshot for undo
    const moveDesc = movements.map(m => `${m.from}→${m.to}`).join(', ');
    undoSystem.captureSnapshot(`Runner ${playType}: ${moveDesc}`);

    // Use the batch function to process all movements atomically
    advanceRunnersBatch(movements);
  }, [advanceRunnersBatch]);

  // REMOVED: BUG-009 - handleLegacyRunnerMove was for deprecated BaserunnerDragDrop placeholder
  // Runner moves are now handled by handleRunnerMove for EnhancedInteractiveField

  // Handler for lineup card substitutions (Phase 6)
  const handleLineupCardSubstitution = useCallback((sub: SubstitutionData) => {
    console.log("LineupCard substitution:", sub);

    // GAP-GT-7-C: Block substitution if the outgoing player is a pending PH who hasn't batted yet
    if (pendingPH && pendingPH === sub.outgoingPlayerId) {
      console.warn(`[GameTracker] Substitution blocked: PH ${sub.outgoingPlayerName} must bat before being replaced`);
      // TODO: Show UI toast to user
      return;
    }

    // Capture snapshot for undo
    undoSystem.captureSnapshot(`${sub.type}: ${sub.incomingPlayerId} for ${sub.outgoingPlayerId}`);

    if (sub.type === 'pitching_change') {
      changePitcher(sub.incomingPlayerId, sub.outgoingPlayerId, sub.incomingPlayerName, sub.outgoingPlayerName);
      // mWAR: Record pitching change decision
      try {
        const gsLI = buildGameStateForLI();
        const decisionId = mwarHook.recordDecision('pitching_change', gsLI, [sub.incomingPlayerId, sub.outgoingPlayerId], `Replaced ${sub.outgoingPlayerName} with ${sub.incomingPlayerName}`);
        setPendingMWARDecisions(prev => new Map(prev).set(decisionId, { decisionId, decisionType: 'pitching_change', involvedPlayers: [sub.incomingPlayerId], resolveAfterNextPlay: true }));
        console.log(`[mWAR] Recorded pitching_change decision: ${decisionId}`);
      } catch (e) { console.warn('[mWAR] Decision recording error (non-blocking):', e); }
    } else if (sub.type === 'position_swap') {
      // MAJ-06: Position-only switch — no new players enter
      switchPositions([
        { playerId: sub.incomingPlayerId, newPosition: sub.newPosition || '' },
        { playerId: sub.outgoingPlayerId, newPosition: '' }, // Will be set by the swap logic
      ]);
    } else if (sub.type === 'player_sub' || sub.type === 'double_switch') {
      // MAJ-06: Pass enriched options to makeSubstitution
      // MAJ-09: Check validation result before proceeding
      const subResult = makeSubstitution(sub.incomingPlayerId, sub.outgoingPlayerId, sub.incomingPlayerName, sub.outgoingPlayerName, {
        subType: sub.type === 'double_switch' ? 'double_switch' : 'player_sub',
        newPosition: sub.newPosition,
      });
      if (!subResult.success) {
        console.warn(`[GameTracker] Substitution rejected: ${subResult.error}`);
        // TODO: Show UI toast/notification to user
        return;
      }

      // mWAR: Infer decision type — pinch hitter if outgoing is current batter, otherwise defensive sub
      try {
        const gsLI = buildGameStateForLI();
        const isPinchHitter = sub.outgoingPlayerId === gameState?.currentBatterId;
        const decisionType = isPinchHitter ? 'pinch_hitter' : 'defensive_sub';
        const decisionId = mwarHook.recordDecision(decisionType as any, gsLI, [sub.incomingPlayerId, sub.outgoingPlayerId], `${isPinchHitter ? 'PH' : 'Def sub'}: ${sub.incomingPlayerName} for ${sub.outgoingPlayerName}`);
        if (isPinchHitter) {
          // Resolve pinch hitter after next AB
          setPendingMWARDecisions(prev => new Map(prev).set(decisionId, { decisionId, decisionType: 'pinch_hitter', involvedPlayers: [sub.incomingPlayerId], resolveAfterNextPlay: true }));
          // GAP-GT-7-C: Mark PH as pending — they must bat before being removed
          setPendingPH(sub.incomingPlayerId);
        }
        console.log(`[mWAR] Recorded ${decisionType} decision: ${decisionId}`);
      } catch (e) { console.warn('[mWAR] Decision recording error (non-blocking):', e); }

      // EXH-018 FIX: Also update local player arrays so UI reflects the substitution
      // Find which team the outgoing player is on and update that team's roster
      const updateTeamRoster = (players: Player[], setPlayers: React.Dispatch<React.SetStateAction<Player[]>>) => {
        const outgoingIndex = players.findIndex(p => p.name === sub.outgoingPlayerName);
        const incomingIndex = players.findIndex(p => p.name === sub.incomingPlayerName);

        if (outgoingIndex >= 0 && incomingIndex >= 0) {
          setPlayers(prev => {
            const updated = [...prev];
            // Transfer batting order from outgoing to incoming player
            const outgoingBattingOrder = updated[outgoingIndex].battingOrder;
            const outgoingPosition = sub.newPosition || updated[outgoingIndex].position;

            // Incoming player takes the batting order and position
            updated[incomingIndex] = {
              ...updated[incomingIndex],
              battingOrder: outgoingBattingOrder,
              position: outgoingPosition,
            };

            // Outgoing player loses batting order and is marked as out of game
            updated[outgoingIndex] = {
              ...updated[outgoingIndex],
              battingOrder: undefined,
              isOutOfGame: true,
            };

            return updated;
          });
          return true;
        }
        return false;
      };

      // Try away team first, then home team
      if (!updateTeamRoster(awayTeamPlayers, setAwayTeamPlayers)) {
        updateTeamRoster(homeTeamPlayers, setHomeTeamPlayers);
      }
    }
  }, [changePitcher, makeSubstitution, switchPositions, awayTeamPlayers, homeTeamPlayers, pendingPH, setPendingPH]);

  // T1-05: Auto-infer fielder credits from fieldingSequence
  // Standard baseball rules: last fielder = putout, others = assists
  // For DP/TP: distribute putouts across the bases where outs occur
  const inferFielderCredits = useCallback((
    runnersOut: RunnerOutInfo[],
    fieldingSequence: number[],
    outType?: string
  ): FielderCredit[] | null => {
    if (fieldingSequence.length === 0) return null; // No sequence = can't infer

    const posLabel = (n: number): string => POSITION_MAP[n] || `P${n}`;

    // Single out: last fielder = putout, rest = assists
    if (runnersOut.length === 1) {
      const putoutBy = posLabel(fieldingSequence[fieldingSequence.length - 1]);
      const assistBy = fieldingSequence.slice(0, -1).map(n => posLabel(n));
      return [{
        ...runnersOut[0],
        putoutBy,
        assistBy,
      }];
    }

    // DP: Two outs. In a standard 6-4-3 DP:
    //   - Force out at 2B: putout by 4 (2B), assist by 6 (SS)
    //   - Batter out at 1B: putout by 3 (1B), assist by 4 (2B)
    // General rule: middle fielder(s) get putout on lead runner,
    // last fielder gets putout on batter
    if (runnersOut.length === 2 && (outType === 'DP' || outType === 'GO') && fieldingSequence.length >= 3) {
      const assists = fieldingSequence.slice(0, -2).map(n => posLabel(n));
      const midFielder = posLabel(fieldingSequence[fieldingSequence.length - 2]);
      const lastFielder = posLabel(fieldingSequence[fieldingSequence.length - 1]);
      return [
        // Lead runner out (force at next base)
        { ...runnersOut[0], putoutBy: midFielder, assistBy: assists },
        // Trailing runner/batter out
        { ...runnersOut[1], putoutBy: lastFielder, assistBy: [...assists, midFielder] },
      ];
    }

    // Fallback: can't confidently infer for 3+ outs or unusual sequences
    return null;
  }, []);

  // Enhanced play handler for the new drag-drop field
  const handleEnhancedPlayComplete = useCallback(async (playData: PlayData) => {
    console.log("Enhanced play complete:", playData);
    console.log("Runner outcomes:", playData.runnerOutcomes);

    // T1-06: Clear stale error-on-advance state from previous plays
    // Use local variable to track within this function call (avoids stale React state in closure)
    let localExtraAdvances: RunnerAdvanceInfo[] = [];
    setRunnersWithExtraAdvance([]);
    setPendingPlayForErrorOnAdvance(null);

    // ============================================
    // EXH-016: Check for thrown-out runners and prompt for fielder credit
    // Skip for strikeouts (no fielding play on runner) and HRs (everyone scores)
    // ============================================
    if (playData.runnerOutcomes && playData.type !== 'hr') {
      const outcomes = playData.runnerOutcomes;
      const runnersOut: RunnerOutInfo[] = [];

      // Check each runner position for outs (excluding batter)
      if (outcomes.first?.to === 'out') {
        runnersOut.push({
          runnerName: runnerNames.first || 'R1',
          fromBase: '1B',
          outAtBase: '2B', // R1 typically thrown out at 2B
        });
      }
      if (outcomes.second?.to === 'out') {
        runnersOut.push({
          runnerName: runnerNames.second || 'R2',
          fromBase: '2B',
          outAtBase: '3B', // R2 typically thrown out at 3B
        });
      }
      if (outcomes.third?.to === 'out') {
        runnersOut.push({
          runnerName: runnerNames.third || 'R3',
          fromBase: '3B',
          outAtBase: 'HOME', // R3 typically thrown out at home
        });
      }

      // If there are runners out, try to auto-infer credits from fieldingSequence
      if (runnersOut.length > 0) {
        const autoCredits = inferFielderCredits(runnersOut, playData.fieldingSequence, playData.outType);
        if (autoCredits) {
          // T1-05: Auto-inferred — skip modal, log credits directly
          console.log('[EXH-016] Auto-inferred fielder credits:', autoCredits);
          // Continue processing — credits are logged but play proceeds without modal
        } else {
          // Can't auto-infer — fall back to manual modal
          console.log('[EXH-016] Cannot auto-infer, prompting for fielder credit:', runnersOut);
          setRunnersOutForCredit(runnersOut);
          setPendingPlayForFielderCredit(playData);
          setFielderCreditModalOpen(true);
          return; // Exit early - will continue in handleFielderCreditConfirm
        }
      }

      // ============================================
      // EXH-025: Check for extra runner advancement (possible error)
      // Compare actual outcome to expected outcome based on hit type
      // ============================================
      const extraAdvances: RunnerAdvanceInfo[] = [];

      // Expected advancement per hit type (minimum standard advancement)
      const getExpectedBase = (fromBase: '1B' | '2B' | '3B', hitType: string): '2B' | '3B' | 'HOME' => {
        if (hitType === '1B') {
          // Single: R1→2B, R2→3B, R3→HOME
          if (fromBase === '1B') return '2B';
          if (fromBase === '2B') return '3B';
          return 'HOME';
        }
        if (hitType === '2B') {
          // Double: R1→3B (or HOME), R2→HOME, R3→HOME
          if (fromBase === '1B') return '3B';
          return 'HOME';
        }
        if (hitType === '3B' || hitType === 'HR') {
          // Triple/HR: Everyone scores
          return 'HOME';
        }
        // Default: advance one base
        if (fromBase === '1B') return '2B';
        if (fromBase === '2B') return '3B';
        return 'HOME';
      };

      // Map outcome.to to base format
      const outcomeToBase = (to: string): '2B' | '3B' | 'HOME' | null => {
        if (to === 'second') return '2B';
        if (to === 'third') return '3B';
        if (to === 'home') return 'HOME';
        return null;
      };

      // Check if outcome exceeds expected (for hits only)
      if (playData.type === 'hit' && playData.hitType) {
        // R1 check
        if (outcomes.first && outcomes.first.to !== 'first' && outcomes.first.to !== 'out') {
          const actualBase = outcomeToBase(outcomes.first.to);
          const expectedBase = getExpectedBase('1B', playData.hitType);
          if (actualBase && actualBase !== expectedBase) {
            // Check if actual is further than expected
            const baseOrder = ['2B', '3B', 'HOME'];
            const actualIdx = baseOrder.indexOf(actualBase);
            const expectedIdx = baseOrder.indexOf(expectedBase);
            if (actualIdx > expectedIdx) {
              extraAdvances.push({
                runnerName: runnerNames.first || 'R1',
                fromBase: '1B',
                toBase: actualBase,
                expectedBase,
              });
            }
          }
        }

        // R2 check
        if (outcomes.second && outcomes.second.to !== 'second' && outcomes.second.to !== 'out') {
          const actualBase = outcomeToBase(outcomes.second.to);
          const expectedBase = getExpectedBase('2B', playData.hitType);
          if (actualBase && actualBase !== expectedBase) {
            const baseOrder = ['2B', '3B', 'HOME'];
            const actualIdx = baseOrder.indexOf(actualBase);
            const expectedIdx = baseOrder.indexOf(expectedBase);
            if (actualIdx > expectedIdx) {
              extraAdvances.push({
                runnerName: runnerNames.second || 'R2',
                fromBase: '2B',
                toBase: actualBase,
                expectedBase,
              });
            }
          }
        }

        // R3 - can't advance beyond home, so no extra check needed
      }

      // If there are extra advances, queue the error prompt modal to show AFTER play is recorded
      // NOTE: We no longer return early - the play is recorded normally, modal is informational
      // T1-06: Use local variable + state together to avoid stale closure reads
      if (extraAdvances.length > 0) {
        console.log('[EXH-025] Extra advances detected - will prompt for error attribution after play:', extraAdvances);
        setRunnersWithExtraAdvance(extraAdvances);
        setPendingPlayForErrorOnAdvance(playData);
        localExtraAdvances = extraAdvances;
        // Modal will be shown after play recording completes (see end of function)
      }
    }

    try {
      // ============================================
      // STEP 1: Calculate RBI from ACTUAL runner outcomes
      // This replaces the old simplified calculation
      // ============================================
      const calculateRBIFromOutcomes = (): number => {
        if (!playData.runnerOutcomes) {
          // Fallback to old logic if no runner outcomes (shouldn't happen)
          console.warn('[RBI] No runner outcomes - using fallback calculation');
          const { first, second, third } = gameState.bases;
          if (playData.type === 'hr') {
            return 1 + (first ? 1 : 0) + (second ? 1 : 0) + (third ? 1 : 0);
          }
          return third ? 1 : 0;
        }

        let rbi = 0;
        const outcomes = playData.runnerOutcomes;

        // Check each runner outcome - count those who scored (to: 'home' and outcome is safe)
        if (outcomes.third?.to === 'home') rbi++;
        if (outcomes.second?.to === 'home') rbi++;
        if (outcomes.first?.to === 'home') rbi++;
        // Batter scoring (HR or inside-the-park HR)
        if (outcomes.batter?.to === 'home') rbi++;

        console.log(`[RBI] Calculated from runner outcomes: ${rbi}`);
        return rbi;
      };

      // Capture undo snapshot BEFORE recording the play
      const playDescription = playData.type === 'hr'
        ? `HR (${playData.hrDistance}ft)`
        : playData.type === 'hit'
        ? `${playData.hitType} to ${playData.spraySector}`
        : playData.type === 'out'
        ? `${playData.outType} (${playData.fieldingSequence.join('-')})`
        : playData.type;
      undoSystem.captureSnapshot(playDescription);

      // ============================================
      // STEP 3: Convert runner outcomes to RunnerAdvancement format
      // recordHit/recordOut expect this format to properly update bases
      // ============================================
      const convertToRunnerAdvancement = (): RunnerAdvancement | undefined => {
        if (!playData.runnerOutcomes) return undefined;

        const outcomes = playData.runnerOutcomes;
        const advancement: RunnerAdvancement = {};

        // Convert each runner's outcome to the RunnerAdvancement format
        // RunnerAdvancement uses: fromFirst, fromSecond, fromThird → destination
        if (outcomes.first && outcomes.first.to !== 'first') {
          // Runner moved from first
          advancement.fromFirst = outcomes.first.to === 'out' ? 'out' :
                                  outcomes.first.to as 'second' | 'third' | 'home';
        }
        if (outcomes.second && outcomes.second.to !== 'second') {
          // Runner moved from second
          advancement.fromSecond = outcomes.second.to === 'out' ? 'out' :
                                   outcomes.second.to as 'third' | 'home';
        }
        if (outcomes.third && outcomes.third.to !== 'third') {
          // Runner moved from third
          advancement.fromThird = outcomes.third.to === 'out' ? 'out' :
                                  outcomes.third.to as 'home';
        }

        console.log('[RunnerAdvancement] Converted:', advancement);
        return Object.keys(advancement).length > 0 ? advancement : undefined;
      };

      const runnerAdvancement = convertToRunnerAdvancement();

      // Check if batter actually reached base (important for D3K, FC, E)
      const batterReached = playData.runnerOutcomes?.batter?.to !== 'out' &&
                            playData.runnerOutcomes?.batter?.to !== undefined;

      // ============================================
      // STEP 3.5: Inject enrichment data before record call (Layer 1B §1.16)
      // ============================================
      setNextEventEnrichment({
        fieldLocation: playData.ballLocation
          ? { x: playData.ballLocation.x, y: playData.ballLocation.y, zone: playData.spraySector }
          : undefined,
        exitType: playData.hrType || undefined,
        fieldingSequence: playData.fieldingSequence?.length ? playData.fieldingSequence : undefined,
        hrDistance: playData.hrDistance || undefined,
      });

      // ============================================
      // STEP 4: Record the play type (hit/out/etc)
      // CRITICAL: Pass runnerAdvancement so recordHit/recordOut properly updates bases!
      // ============================================
      if (playData.type === 'hr') {
        const rbi = calculateRBIFromOutcomes();
        await recordHit('HR', rbi, runnerAdvancement);
        console.log(`HR recorded: ${playData.hrDistance}ft, type: ${playData.hrType}, sector: ${playData.spraySector}, RBI: ${rbi}`);
        logAction(`HR (${playData.hrDistance ?? '??'}ft${playData.spraySector ? ` ${playData.spraySector}` : ''}) — ${rbi} RBI`);
      } else if (playData.type === 'hit') {
        const hitType = playData.hitType || '1B';
        const rbi = calculateRBIFromOutcomes();
        await recordHit(hitType as HitType, rbi, runnerAdvancement);
        console.log(`Hit recorded: ${hitType}, sector: ${playData.spraySector}, sequence: ${playData.fieldingSequence.join('-')}, RBI: ${rbi}`);
        logAction(`${hitType} hit${playData.spraySector ? ` to ${playData.spraySector}` : ''} — ${rbi} RBI`);
      } else if (playData.type === 'out') {
        const outType = playData.outType || 'GO';

        // D3K Special Case: If batter reached, it's a K stat but NOT an out
        // FIX: BUG-004 - Use proper recordD3K() instead of recordWalk workaround
        // D3K is legal when: first base empty OR 2 outs
        if (outType === 'K' && batterReached) {
          // This is D3K where batter reached first
          // recordD3K correctly: counts K for both batter and pitcher, NO out, batter reaches 1B
          await recordD3K(true);
          console.log(`D3K recorded: Batter reached first (K stat counted, no out recorded)`);
          logAction(`D3K (batter reached first)`);
        } else if (outType === 'K' || outType === 'Kc') {
          // Normal strikeout OR D3K where batter didn't reach (thrown out at first)
          // Check if this is D3K thrown out scenario - D3K has catcher throwing to first: [2, 3]
          // Regular strikeouts have empty fieldingSequence []
          const isD3KThrownOut = playData.fieldingSequence.length >= 2 &&
                                  playData.fieldingSequence[0] === 2 &&
                                  playData.fieldingSequence[1] === 3;
          if (isD3KThrownOut && !batterReached) {
            // D3K where batter was thrown out - still counts K for batter/pitcher, but also out
            await recordD3K(false);
            console.log(`D3K recorded: Batter thrown out (K stat counted, out recorded)`);
            logAction(`D3K (batter thrown out)`);
          } else {
            // Normal strikeout
            await recordOut(outType as OutType, runnerAdvancement);
            console.log(`Strikeout recorded: ${outType}`);
            logAction(`Strikeout (${outType})`);
          }
        } else {
          // Normal out (non-strikeout)
          await recordOut(outType as OutType, runnerAdvancement);
          console.log(`Out recorded: ${outType}, sequence: ${playData.fieldingSequence.join('-')}, sector: ${playData.spraySector}`);
          logAction(`Out (${outType})${playData.fieldingSequence.length ? ` via ${playData.fieldingSequence.join('-')}` : ''}`);
        }
      } else if (playData.type === 'foul_out') {
        await recordOut('FO', runnerAdvancement);
        console.log(`Foul out recorded: ${playData.foulType}, fielder: ${playData.fieldingSequence[0]}`);
        logAction(`Foul out (${playData.foulType})`);
      } else if (playData.type === 'foul_ball') {
        await advanceCount('strike');
        console.log(`Foul ball (strike) recorded`);
        logAction('Foul ball (strike)');
      } else if (playData.type === 'walk') {
        // FIX: BUG-001/002/003 - Walks now properly route to recordWalk()
        // This correctly tracks PA without AB or H
        const walkType = playData.walkType || 'BB';
        await recordWalk(walkType as WalkType);
        console.log(`Walk recorded: ${walkType}`);
        logAction(`${walkType} walk`);
      } else if (playData.type === 'error') {
        // ROE (Reached On Error) - batter reaches base, no out, AB counted, no hit
        const rbi = calculateRBIFromOutcomes();
        await recordError(rbi, runnerAdvancement);
        console.log(`Error recorded: ${playData.errorType} error by fielder #${playData.errorFielder}, RBI: ${rbi}`);
        logAction(`${playData.errorType} error by fielder ${playData.errorFielder} — ${rbi} RBI`);
      }

      // Note: Runner outcomes are now handled by runnerAdvancement parameter
      // No need to call applyRunnerOutcomes() separately

      // §4.2: Push structured play log entry for enhanced field plays
      // Skip foul balls — they aren't at-bat results
      if (playData.type !== 'foul_ball') {
        const efResultMap: Record<string, string> = {
          'hr': 'HR', 'hit': playData.hitType || '1B', 'out': playData.outType || 'GO',
          'foul_out': 'FO', 'walk': playData.walkType || 'BB', 'error': 'E',
        };
        const efResult = efResultMap[playData.type] || playData.type;
        const efCategory: PlayLogEntry['resultCategory'] =
          playData.type === 'hr' || playData.type === 'hit' ? 'hit' :
          playData.type === 'walk' ? 'walk' :
          playData.type === 'error' ? 'error' :
          'out';
        const efNonEnrichable = ['BB', 'HBP', 'IBB'];
        const efFieldingSeq = playData.fieldingSequence?.length > 0
          ? playData.fieldingSequence.join('-')
          : undefined;

        // Count runs scored from runner outcomes
        let efRunsScored = 0;
        if (playData.runnerOutcomes) {
          if (playData.runnerOutcomes.first?.to === 'home') efRunsScored++;
          if (playData.runnerOutcomes.second?.to === 'home') efRunsScored++;
          if (playData.runnerOutcomes.third?.to === 'home') efRunsScored++;
          if (playData.runnerOutcomes.batter?.to === 'home') efRunsScored++;
        }

        pushPlayLogEntry({
          inningLabel: shortInningLabel(),
          batterName: gameState.currentBatterName,
          result: efResult,
          resultCategory: efCategory,
          rbi: playData.type === 'hr' || playData.type === 'hit' || playData.type === 'error'
            ? (efRunsScored > 0 ? efRunsScored : 0) : 0,
          runsScored: efRunsScored,
          hasFieldingData: (playData.fieldingSequence?.length ?? 0) > 0,
          hasLocationData: !!playData.ballLocation,
          hasKType: playData.outType === 'Kc',
          isEnrichable: !efNonEnrichable.includes(efResult),
          fieldingSequence: efFieldingSeq,
        });
      }

      // ============================================
      // STEP 4.5: Log fielding events for fWAR pipeline
      // Extracts putouts/assists/errors from PlayData and writes to IndexedDB
      // ============================================
      if (playData.type !== 'walk' && playData.type !== 'foul_ball') {
        try {
          const fieldingContext: FieldingExtractionContext = {
            gameId: gameState.gameId,
            defensiveTeamId: gameState.isTop ? gameState.homeTeamId : gameState.awayTeamId,
            atBatSequence: Date.now(), // Unique per at-bat
          };
          const fieldingEvents = extractFieldingEvents(playData, fieldingContext);
        for (const fe of fieldingEvents) {
          await logFieldingEvent(fe);
        }
        if (fieldingEvents.length > 0) {
          console.log(`[Fielding] Logged ${fieldingEvents.length} fielding event(s) for ${playData.type}`);
          pushActivityLog(`[Fielding] Logged ${fieldingEvents.length} event(s) for ${playData.type}`);
        }
      } catch (err) {
          console.error('[Fielding] Failed to log fielding events:', err);
        }
      }

      // ============================================
      // UPDATE RUNNER NAMES based on outcomes
      // Tracks WHO is on each base for display purposes
      // ============================================
      if (playData.runnerOutcomes) {
        const outcomes = playData.runnerOutcomes;
        const newRunnerNames: { first?: string; second?: string; third?: string } = {};

        // Process runners in reverse order (third -> second -> first) to handle cascading
        // Runner from third -> goes home (scored) or stays, or out
        if (outcomes.third) {
          if (outcomes.third.to === 'third') {
            // Runner stayed on third
            newRunnerNames.third = runnerNames.third;
          }
          // If to === 'home' or 'out', they're no longer on base
        } else if (gameState.bases.third && runnerNames.third) {
          // No outcome specified but base was occupied - preserve runner
          newRunnerNames.third = runnerNames.third;
        }

        // Runner from second -> may go to third, home, or out
        if (outcomes.second) {
          if (outcomes.second.to === 'third') {
            newRunnerNames.third = runnerNames.second;
          } else if (outcomes.second.to === 'second') {
            // Runner stayed on second
            newRunnerNames.second = runnerNames.second;
          }
          // If to === 'home' or 'out', they're no longer on base
        } else if (gameState.bases.second && runnerNames.second) {
          // No outcome specified but base was occupied - preserve runner
          newRunnerNames.second = runnerNames.second;
        }

        // Runner from first -> may go to second, third, home, or out
        if (outcomes.first) {
          if (outcomes.first.to === 'second') {
            newRunnerNames.second = runnerNames.first;
          } else if (outcomes.first.to === 'third') {
            newRunnerNames.third = runnerNames.first;
          } else if (outcomes.first.to === 'first') {
            // Runner stayed on first
            newRunnerNames.first = runnerNames.first;
          }
          // If to === 'home' or 'out', they're no longer on base
        } else if (gameState.bases.first && runnerNames.first) {
          // No outcome specified but base was occupied - preserve runner
          newRunnerNames.first = runnerNames.first;
        }

        // Now add the batter to their destination base
        const batterName = gameState.currentBatterName;
        if (outcomes.batter?.to === 'first') {
          newRunnerNames.first = batterName;
        } else if (outcomes.batter?.to === 'second') {
          newRunnerNames.second = batterName;
        } else if (outcomes.batter?.to === 'third') {
          newRunnerNames.third = batterName;
        }
        // If batter goes home (HR) or out, they're not on base

        setRunnerNames(newRunnerNames);
        console.log('[RunnerNames] Updated:', newRunnerNames);
      }

      // Log spray chart data
      if (playData.ballLocation) {
        console.log(`Spray chart: x=${playData.ballLocation.x.toFixed(3)}, y=${playData.ballLocation.y.toFixed(3)}, sector=${playData.spraySector}`);
      }

      // ============================================
      // STEP 5: Check for Fame events and update Mojo
      // Uses the new hooks wired in this session
      // ============================================

      // Get current stats for batter (from playerStats map)
      const batterStats = playerStats.get(gameState.currentBatterId);
      if (batterStats) {
        // Check for batter fame events (multi-hit, multi-HR, golden sombrero, big RBI day)
        fameTrackingHook.checkBatterFameEvents(
          gameState.currentBatterId,
          gameState.currentBatterName,
          {
            hits: batterStats.h,
            homeRuns: batterStats.hr,
            strikeouts: batterStats.k,
            rbi: batterStats.rbi,
          },
          gameState.inning,
          gameState.isTop ? 'TOP' : 'BOTTOM',
          playData.leverageIndex || 1.0
        );
      }

      // Get current stats for pitcher
      const currentPitcherStats = pitcherStats.get(gameState.currentPitcherId);
      if (currentPitcherStats) {
        // Check for pitcher fame events (high K game, meltdown)
        fameTrackingHook.checkPitcherFameEvents(
          gameState.currentPitcherId,
          gameState.currentPitcherName,
          {
            strikeouts: currentPitcherStats.strikeoutsThrown,
            runsAllowed: currentPitcherStats.runsAllowed,
            hitsAllowed: currentPitcherStats.hitsAllowed,
            inningsPitched: currentPitcherStats.outsRecorded / 3,
          },
          gameState.inning,
          gameState.isTop ? 'TOP' : 'BOTTOM',
          playData.leverageIndex || 1.0
        );
      }

      // Update batter Mojo based on result
      // GameSituation uses 'isPlayoff' not 'isPlayoffs', and uses specific MojoTrigger values
      const gameSituation = {
        inning: gameState.inning,
        isBottom: !gameState.isTop,
        outs: gameState.outs,
        runnersOn: [
          ...(gameState.bases.first ? [1] : []),
          ...(gameState.bases.second ? [2] : []),
          ...(gameState.bases.third ? [3] : []),
        ],
        scoreDiff: gameState.homeScore - gameState.awayScore,
        isPlayoff: isPlayoffGame, // MAJ-13: Use actual playoff state from route
      };

      // DISABLED: Auto-updating mojo based on play outcomes
      // Per user request, mojo should only change via manual user input through the PlayerCard
      // The updateMojo calls below have been commented out:
      //
      // if (playData.type === 'hr') {
      //   playerStateHook.updateMojo(gameState.currentBatterId, 'HOME_RUN', gameSituation);
      // } else if (playData.type === 'hit') {
      //   const hitTrigger = playData.hitType === '2B' ? 'DOUBLE'
      //     : playData.hitType === '3B' ? 'TRIPLE'
      //     : 'SINGLE';
      //   playerStateHook.updateMojo(gameState.currentBatterId, hitTrigger, gameSituation);
      // } else if (playData.type === 'out' && (playData.outType === 'K' || playData.outType === 'Kc')) {
      //   playerStateHook.updateMojo(gameState.currentBatterId, 'STRIKEOUT', gameSituation);
      // }

      // ============================================
      // STEP 6: MAJ-03 — Run play detection system
      // Auto-detects fame events (web gem, robbery, triple play, etc.)
      // Prompt detections are shown as notifications for user confirmation
      // ============================================
      try {
        const detectionResults = runPlayDetections(
          playData,
          { id: gameState.currentBatterId, name: gameState.currentBatterName },
          { id: gameState.currentPitcherId, name: gameState.currentPitcherName },
          {
            inning: gameState.inning,
            isTop: gameState.isTop,
            outs: gameState.outs,
            bases: gameState.bases,
            homeScore: gameState.homeScore,
            awayScore: gameState.awayScore,
          },
          {
            gameId: gameId || 'demo-game',
            leverageIndex: playData.leverageIndex,
            isPlayoffs: isPlayoffGame, // MAJ-13: Use actual playoff state from route
            rbi: calculateRBIFromOutcomes(),
          }
        );

        if (detectionResults.length > 0) {
          console.log(`[MAJ-03] Detection results:`, detectionResults.map(d => `${d.icon} ${d.eventType}`));

          // Auto-detected events: record as Fame events immediately
          const autoDetected = detectionResults.filter(d => !d.requiresConfirmation);
          for (const detection of autoDetected) {
            fameTrackingHook.recordFameEvent(
              detection.eventType as FameEventType,
              gameState.currentBatterId,
              gameState.currentBatterName,
              gameState.inning,
              gameState.isTop ? 'TOP' : 'BOTTOM',
              playData.leverageIndex || 1.0
            );
            console.log(`[MAJ-03] Auto-detected fame event: ${detection.eventType}`);
          }

          // Prompt detections: queue for user confirmation
          const promptDetections = detectionResults.filter(d => d.requiresConfirmation);
          if (promptDetections.length > 0) {
            setPendingDetections(prev => [...prev, ...promptDetections]);
            console.log(`[MAJ-03] Queued ${promptDetections.length} detections for user confirmation`);
          }
        }
      } catch (detectionError) {
        // Detection is non-critical — never block play recording
        console.warn('[MAJ-03] Detection system error (non-blocking):', detectionError);
      }

      // ============================================
      // mWAR: IBB detection + outcome resolution + Manager Moment check
      // ============================================
      try {
        const gsLI = buildGameStateForLI();

        // Auto-detect IBB decisions
        if (playData.type === 'walk' && playData.walkType === 'IBB') {
          const decisionId = mwarHook.recordDecision('intentional_walk', gsLI, [gameState?.currentBatterId || ''], `IBB issued`);
          // IBB resolves after next batter
          setPendingMWARDecisions(prev => new Map(prev).set(decisionId, { decisionId, decisionType: 'intentional_walk', involvedPlayers: [], resolveAfterNextPlay: true }));
          console.log(`[mWAR] Recorded IBB decision: ${decisionId}`);
        }

        // Resolve pending decisions that should resolve after this play
        if (pendingMWARDecisions.size > 0) {
          const toResolve = Array.from(pendingMWARDecisions.values()).filter(d => d.resolveAfterNextPlay);
          for (const pending of toResolve) {
            let outcome: 'success' | 'failure' | 'neutral' = 'neutral';
            if (pending.decisionType === 'pinch_hitter') {
              // PH success: hit, walk, HBP; failure: K, GIDP
              const isHit = playData.type === 'hit' || playData.type === 'hr';
              const isWalk = playData.type === 'walk';
              const isK = playData.type === 'out' && (playData.outType === 'K' || playData.outType === 'Kc');
              outcome = isHit || isWalk ? 'success' : isK ? 'failure' : 'neutral';
            } else if (pending.decisionType === 'pitching_change') {
              // Pitching change success: out recorded; failure: hit/walk/run scored
              const isOut = playData.type === 'out' || playData.type === 'foul_out';
              const isHit = playData.type === 'hit' || playData.type === 'hr';
              outcome = isOut ? 'success' : isHit ? 'failure' : 'neutral';
            } else if (pending.decisionType === 'intentional_walk') {
              // IBB success: next batter makes out; failure: hit or walk
              const isOut = playData.type === 'out' || playData.type === 'foul_out';
              const isHit = playData.type === 'hit' || playData.type === 'hr';
              outcome = isOut ? 'success' : isHit ? 'failure' : 'neutral';
            }
            mwarHook.resolveDecisionOutcome(pending.decisionId, outcome);
            console.log(`[mWAR] Resolved ${pending.decisionType} → ${outcome}`);
          }
          // Remove resolved decisions
          setPendingMWARDecisions(prev => {
            const next = new Map(prev);
            for (const d of toResolve) next.delete(d.decisionId);
            return next;
          });
        }

        // Check for Manager Moment (high leverage situation)
        mwarHook.checkForManagerMoment(gsLI);
      } catch (mwarError) {
        console.warn('[mWAR] Decision tracking error (non-blocking):', mwarError);
      }

      // ============================================
      // EXH-025: Show error attribution modal AFTER play is recorded
      // This is informational - the play has already been processed
      // T1-06: Use local variable (not stale React state from closure)
      // ============================================
      if (localExtraAdvances.length > 0) {
        console.log('[EXH-025] Opening error attribution modal after play recorded');
        setErrorOnAdvanceModalOpen(true);
      }

    } catch (error) {
      console.error('Failed to record enhanced play:', error);
    }
  }, [recordHit, recordOut, recordWalk, recordError, advanceCount, gameState, undoSystem, playerStats, pitcherStats, fameTrackingHook, playerStateHook, runnerNames, buildGameStateForLI, mwarHook, pendingMWARDecisions, inferFielderCredits, pushPlayLogEntry, shortInningLabel, setNextEventEnrichment]);

  // ══════════════════════════════════════════════════════════════
  // QUICK BAR HANDLER — §3.2 one-tap execution flow
  // Tap → snapshot context → calculateRunnerDefaults → capture undo
  // → calculate RBI → record play → log → update diamond
  // EnhancedInteractiveField remains as alternate input path.
  // ══════════════════════════════════════════════════════════════

  // Outcome classification for Quick Bar buttons
  const QUICK_BAR_HITS: readonly string[] = ['1B', '2B', '3B', 'HR', 'GRD']; // GRD = Ground Rule Double
  const QUICK_BAR_OUTS: readonly string[] = ['K', 'GO', 'FO', 'LO', 'PO', 'DP', 'TP', 'SF', 'SAC'];
  const QUICK_BAR_WALKS: readonly string[] = ['BB', 'HBP', 'IBB'];

  const handleQuickBarOutcome = useCallback(async (outcome: string) => {
    if (!gameInitialized) return;

    // 1. Snapshot current context
    const bases = { ...gameState.bases };
    const outs = gameState.outs;

    // 2. Build a minimal PlayData for calculateRunnerDefaults
    const buildPlayData = () => {
      if (QUICK_BAR_HITS.includes(outcome)) {
        if (outcome === 'HR') {
          return { type: 'hr' as const, hitType: 'HR' as const, outType: undefined, fieldingSequence: [] as number[] };
        }
        if (outcome === 'GRD') {
          // Ground Rule Double: batter to 2B, runners advance 2 bases (same defaults as 2B)
          return { type: 'hit' as const, hitType: '2B' as const, outType: undefined, fieldingSequence: [] as number[] };
        }
        return { type: 'hit' as const, hitType: outcome as '1B' | '2B' | '3B', outType: undefined, fieldingSequence: [] as number[] };
      }
      if (QUICK_BAR_OUTS.includes(outcome)) {
        return { type: 'out' as const, hitType: undefined, outType: outcome as PlayData['outType'], fieldingSequence: [] as number[] };
      }
      // Walk/HBP/IBB — handled separately below
      return { type: 'walk' as const, hitType: undefined, outType: undefined, fieldingSequence: [] as number[] };
    };

    // 3. Calculate runner defaults
    const minimalPlay = buildPlayData();
    const defaults: RunnerDefaults = calculateRunnerDefaults(
      minimalPlay as PlayData,
      bases,
      outs
    );

    // 4. Calculate RBI from defaults (count runners scoring)
    const calculateRBI = (): number => {
      let rbi = 0;
      if (defaults.third?.to === 'home') rbi++;
      if (defaults.second?.to === 'home') rbi++;
      if (defaults.first?.to === 'home') rbi++;
      if (defaults.batter?.to === 'home') rbi++;
      return rbi;
    };

    // 5. Convert RunnerDefaults to RunnerAdvancement for recordHit/recordOut
    const toRunnerAdvancement = (): RunnerAdvancement | undefined => {
      const adv: RunnerAdvancement = {};
      if (defaults.first && defaults.first.to !== 'first') {
        adv.fromFirst = defaults.first.to === 'out' ? 'out' : defaults.first.to as 'second' | 'third' | 'home';
      }
      if (defaults.second && defaults.second.to !== 'second') {
        adv.fromSecond = defaults.second.to === 'out' ? 'out' : defaults.second.to as 'third' | 'home';
      }
      if (defaults.third && defaults.third.to !== 'third') {
        adv.fromThird = defaults.third.to === 'out' ? 'out' : defaults.third.to as 'home';
      }
      return Object.keys(adv).length > 0 ? adv : undefined;
    };

    // 6. Capture undo snapshot
    undoSystem.captureSnapshot(`Quick: ${outcome}`);

    try {
      const runnerAdv = toRunnerAdvancement();
      const rbi = calculateRBI();

      // 7. Route to correct recording function
      if (QUICK_BAR_HITS.includes(outcome)) {
        await recordHit(outcome as HitType, rbi, runnerAdv);
        logAction(`${outcome}${rbi > 0 ? ` — ${rbi} RBI` : ''}`);

      } else if (QUICK_BAR_WALKS.includes(outcome)) {
        await recordWalk(outcome as WalkType);
        logAction(`${outcome}`);

      } else if (outcome === 'E') {
        // Error: recordError(rbi, runnerAdv) — minimal for now
        await recordError(0, undefined);
        logAction('E (reached on error)');

      } else if (outcome === 'FC') {
        // Fielder's Choice: batter reaches, lead runner out
        await recordOut('FC' as OutType, runnerAdv);
        logAction('FC');

      } else if (outcome === 'D3K') {
        // Dropped 3rd strike — batter reached (1B empty or 2 outs)
        const d3kLegal = !bases.first || outs >= 2;
        await recordD3K(d3kLegal);
        logAction(d3kLegal ? 'D3K (batter reached)' : 'D3K (batter out)');

      } else if (outcome === 'WP_K' || outcome === 'PB_K') {
        // Wild pitch / passed ball strikeout — K but batter reaches
        await recordD3K(true);
        logAction(`${outcome} (K, batter reached)`);

      } else if (QUICK_BAR_OUTS.includes(outcome)) {
        await recordOut(outcome as OutType, runnerAdv);
        logAction(`${outcome}`);

      } else {
        // Unknown — just log
        logAction(`[QB] ${outcome}`);
      }

      // §4.2: Push structured play log entry for Quick Bar plays
      const qbResultCategory: PlayLogEntry['resultCategory'] =
        QUICK_BAR_HITS.includes(outcome) ? 'hit' :
        QUICK_BAR_WALKS.includes(outcome) ? 'walk' :
        outcome === 'E' ? 'error' :
        (outcome === 'D3K' || outcome === 'WP_K' || outcome === 'PB_K') ? 'special' : 'out';
      const qbNonEnrichable = ['BB', 'HBP', 'IBB', 'K', 'Kc'];
      pushPlayLogEntry({
        inningLabel: shortInningLabel(),
        batterName: gameState.currentBatterName,
        result: outcome,
        resultCategory: qbResultCategory,
        rbi: QUICK_BAR_HITS.includes(outcome) ? rbi : 0,
        runsScored: rbi, // Quick Bar: runs scored = RBI (no separate tracking)
        hasFieldingData: false,
        hasLocationData: false,
        hasKType: outcome === 'Kc', // Kc is already typed; plain K needs distinction
        isEnrichable: !qbNonEnrichable.includes(outcome),
      });

      // 8. Update runner names from defaults
      const newNames: { first?: string; second?: string; third?: string } = {};
      const batterName = gameState.currentBatterName;

      // Map existing runners to their new positions
      if (defaults.third?.to === 'third') newNames.third = runnerNames.third;
      if (defaults.second?.to === 'second') newNames.second = runnerNames.second;
      if (defaults.second?.to === 'third') newNames.third = runnerNames.second;
      if (defaults.first?.to === 'first') newNames.first = runnerNames.first;
      if (defaults.first?.to === 'second') newNames.second = runnerNames.first;
      if (defaults.first?.to === 'third') newNames.third = runnerNames.first;

      // Place batter
      if (defaults.batter?.to === 'first') newNames.first = batterName;
      else if (defaults.batter?.to === 'second') newNames.second = batterName;
      else if (defaults.batter?.to === 'third') newNames.third = batterName;

      setRunnerNames(newNames);

      console.log(`[QuickBar] Recorded: ${outcome}, RBI: ${rbi}, runners:`, newNames);

    } catch (error) {
      console.error(`[QuickBar] Failed to record ${outcome}:`, error);
    }
  }, [gameInitialized, gameState, recordHit, recordOut, recordWalk, recordError, recordD3K, undoSystem, logAction, runnerNames, pushPlayLogEntry, shortInningLabel]);

  // EXH-016: Handle fielder credit confirmation - continue processing the play with credits
  const handleFielderCreditConfirm = useCallback(async (credits: FielderCredit[]) => {
    console.log('[EXH-016] Fielder credits confirmed:', credits);
    setFielderCreditModalOpen(false);

    // Get the pending play data
    const playData = pendingPlayForFielderCredit;
    if (!playData) {
      console.error('[EXH-016] No pending play data for fielder credit');
      return;
    }

    // Store the fielder credits with the play data for later processing
    // TODO: Integrate credits into player stats (assists, putouts)
    // For now, we log them and continue with the play

    // Clear the pending state
    setPendingPlayForFielderCredit(null);
    setRunnersOutForCredit([]);

    // Re-call the enhanced play handler with the same play data
    // The modal is now closed, so it won't trigger again
    // Actually, we need to process the play directly here to avoid infinite loop
    // Let's extract the core play processing logic

    try {
      // RBI calculation (copied from handleEnhancedPlayComplete)
      const calculateRBIFromOutcomes = (): number => {
        if (!playData.runnerOutcomes) {
          const { first, second, third } = gameState.bases;
          if (playData.type === 'hr') {
            return 1 + (first ? 1 : 0) + (second ? 1 : 0) + (third ? 1 : 0);
          }
          return third ? 1 : 0;
        }

        let rbi = 0;
        const outcomes = playData.runnerOutcomes;
        if (outcomes.third?.to === 'home') rbi++;
        if (outcomes.second?.to === 'home') rbi++;
        if (outcomes.first?.to === 'home') rbi++;
        if (outcomes.batter?.to === 'home') rbi++;
        return rbi;
      };

      // Capture undo snapshot
      const playDescription = playData.type === 'hr'
        ? `HR (${playData.hrDistance}ft)`
        : playData.type === 'hit'
        ? `${playData.hitType} to ${playData.spraySector}`
        : playData.type === 'out'
        ? `${playData.outType} (${playData.fieldingSequence.join('-')})`
        : playData.type;
      undoSystem.captureSnapshot(playDescription);

      // Convert runner outcomes to RunnerAdvancement format
      const convertToRunnerAdvancement = (): RunnerAdvancement | undefined => {
        if (!playData.runnerOutcomes) return undefined;

        const outcomes = playData.runnerOutcomes;
        const advancement: RunnerAdvancement = {};

        if (outcomes.first && outcomes.first.to !== 'first') {
          advancement.fromFirst = outcomes.first.to === 'out' ? 'out' :
                                  outcomes.first.to as 'second' | 'third' | 'home';
        }
        if (outcomes.second && outcomes.second.to !== 'second') {
          advancement.fromSecond = outcomes.second.to === 'out' ? 'out' :
                                   outcomes.second.to as 'third' | 'home';
        }
        if (outcomes.third && outcomes.third.to !== 'third') {
          advancement.fromThird = outcomes.third.to === 'out' ? 'out' :
                                  outcomes.third.to as 'home';
        }

        return Object.keys(advancement).length > 0 ? advancement : undefined;
      };

      const runnerAdvancement = convertToRunnerAdvancement();
      const batterReached = playData.runnerOutcomes?.batter?.to !== 'out' &&
                            playData.runnerOutcomes?.batter?.to !== undefined;

      // Layer 1B: Inject enrichment before record call (same as handleEnhancedPlayComplete)
      setNextEventEnrichment({
        fieldLocation: playData.ballLocation
          ? { x: playData.ballLocation.x, y: playData.ballLocation.y, zone: playData.spraySector }
          : undefined,
        exitType: playData.hrType || undefined,
        fieldingSequence: playData.fieldingSequence?.length ? playData.fieldingSequence : undefined,
        hrDistance: playData.hrDistance || undefined,
      });

      // Record the play
      if (playData.type === 'hr') {
        const rbi = calculateRBIFromOutcomes();
        await recordHit('HR', rbi, runnerAdvancement);
      } else if (playData.type === 'hit') {
        const hitType = playData.hitType || '1B';
        const rbi = calculateRBIFromOutcomes();
        await recordHit(hitType as HitType, rbi, runnerAdvancement);
      } else if (playData.type === 'out') {
        const outType = playData.outType || 'GO';
        if (outType === 'K' && batterReached) {
          await recordD3K(true);
        } else if (outType === 'K' || outType === 'Kc') {
          const isD3KThrownOut = playData.fieldingSequence.length >= 2 &&
                                  playData.fieldingSequence[0] === 2 &&
                                  playData.fieldingSequence[1] === 3;
          if (isD3KThrownOut && !batterReached) {
            await recordD3K(false);
          } else {
            await recordOut(outType as OutType, runnerAdvancement);
          }
        } else {
          await recordOut(outType as OutType, runnerAdvancement);
        }
      } else if (playData.type === 'foul_out') {
        await recordOut('FO', runnerAdvancement);
      } else if (playData.type === 'walk') {
        const walkType = playData.walkType || 'BB';
        await recordWalk(walkType as WalkType);
      }

      // Log fielding events for fWAR pipeline (same as handleEnhancedPlayComplete)
      if (playData.type !== 'walk' && playData.type !== 'foul_ball') {
        try {
          const fieldingContext: FieldingExtractionContext = {
            gameId: gameState.gameId,
            defensiveTeamId: gameState.isTop ? gameState.homeTeamId : gameState.awayTeamId,
            atBatSequence: Date.now(),
          };
          const fieldingEvents = extractFieldingEvents(playData, fieldingContext);
          for (const fe of fieldingEvents) {
            await logFieldingEvent(fe);
          }
          if (fieldingEvents.length > 0) {
            console.log(`[Fielding] Logged ${fieldingEvents.length} fielding event(s) via fielder credit path`);
            pushActivityLog(`[Fielding] Logged ${fieldingEvents.length} event(s) via fielder credit path`);
          }
        } catch (err) {
          console.error('[Fielding] Failed to log fielding events:', err);
        }
      }

      console.log('[EXH-016] Play recorded with fielder credits');
    } catch (error) {
      console.error('[EXH-016] Failed to record play:', error);
    }
  }, [pendingPlayForFielderCredit, gameState, undoSystem, recordHit, recordOut, recordD3K, recordWalk, setNextEventEnrichment]);

  // EXH-016: Handle fielder credit modal close (skip credits)
  const handleFielderCreditClose = useCallback(() => {
    // If user closes modal without confirming, still process the play with default credits
    handleFielderCreditConfirm(runnersOutForCredit.map(runner => ({
      ...runner,
      putoutBy: runner.outAtBase === 'HOME' ? 'C' : runner.outAtBase === '3B' ? '3B' : 'SS',
      assistBy: [],
    })));
  }, [runnersOutForCredit, handleFielderCreditConfirm]);

  // EXH-025: Handle error on advance modal confirmation
  const handleErrorOnAdvanceConfirm = useCallback((results: ErrorOnAdvanceResult[]) => {
    setErrorOnAdvanceModalOpen(false);

    // Log error attributions for now (full integration will record to game state)
    results.forEach(result => {
      if (result.wasError && result.errorType && result.errorFielder) {
        console.log(`[EXH-025] Error on advance: ${result.runnerName} ${result.fromBase} → ${result.toBase}, ` +
          `${result.errorType} error by ${result.errorFielder}`);
      } else {
        console.log(`[EXH-025] No error: ${result.runnerName} ${result.fromBase} → ${result.toBase} (good baserunning)`);
      }
    });

    // Process the pending play now that we have error attribution
    if (pendingPlayForErrorOnAdvance) {
      // TODO: Add error attribution to play data before recording
      // For now, the play was already processed - this modal is informational
    }

    setPendingPlayForErrorOnAdvance(null);
    setRunnersWithExtraAdvance([]);
  }, [pendingPlayForErrorOnAdvance]);

  // EXH-025: Handle error on advance modal close (assume no errors)
  const handleErrorOnAdvanceClose = useCallback(() => {
    setErrorOnAdvanceModalOpen(false);
    setPendingPlayForErrorOnAdvance(null);
    setRunnersWithExtraAdvance([]);
    console.log('[EXH-025] Modal closed - assuming no errors on advancement');
  }, []);

  // MAJ-03: Handle detection prompt confirmation — user confirms a detected event
  const handleDetectionConfirm = useCallback((detection: UIDetectionResult) => {
    // Record as Fame event
    fameTrackingHook.recordFameEvent(
      detection.eventType as FameEventType,
      gameState.currentBatterId,
      gameState.currentBatterName,
      gameState.inning,
      gameState.isTop ? 'TOP' : 'BOTTOM',
      1.0 // Default LI — detection was triggered per-play
    );
    // Remove from pending
    setPendingDetections(prev => prev.filter(d => d !== detection));
    console.log(`[MAJ-03] User confirmed detection: ${detection.eventType}`);
  }, [fameTrackingHook, gameState]);

  // MAJ-03: Handle detection prompt dismissal — user declines a detected event
  const handleDetectionDismiss = useCallback((detection: UIDetectionResult) => {
    setPendingDetections(prev => prev.filter(d => d !== detection));
    console.log(`[MAJ-03] User dismissed detection: ${detection.eventType}`);
  }, []);

  // Handle special events (Web Gem, Robbery, TOOTBLAN, etc.) from EnhancedInteractiveField
  // Phase 5B: Extended to handle all contextual button events
  const handleSpecialEvent = useCallback(async (event: SpecialEventData) => {
    console.log("Special event:", event);

    try {
      // Capture undo snapshot before recording
      const eventLabel = event.eventType.replace(/_/g, ' ');
      const actor = event.fielderName || event.runnerId || 'player';
      undoSystem.captureSnapshot(`${eventLabel} by ${actor}`);

      // All special events are recorded through recordEvent
      // The useGameState hook handles the Fame integration with LI weighting
      await recordEvent(event.eventType as 'WEB_GEM' | 'ROBBERY');
      console.log(`${event.eventType} recorded - fielder: ${event.fielderName}, position: ${event.fielderPosition}, runner: ${event.runnerId}`);
    } catch (error) {
      console.error('Failed to record special event:', error);
    }
  }, [recordEvent, undoSystem]);

  const handleSubstitution = useCallback((teamType: 'away' | 'home', benchPlayerName: string, lineupPlayerName: string) => {
    console.log(`Substitution: ${benchPlayerName} replacing ${lineupPlayerName} on ${teamType} team`);

    // Generate player IDs in same format as initializeGame
    const benchPlayerId = `${teamType}-${benchPlayerName.replace(/\s+/g, '-').toLowerCase()}`;
    const lineupPlayerId = `${teamType}-${lineupPlayerName.replace(/\s+/g, '-').toLowerCase()}`;

    // MAJ-06: Call with enriched options for proper sub type logging
    // MAJ-09: Check validation result before updating UI
    const subResult = makeSubstitution(benchPlayerId, lineupPlayerId, benchPlayerName, lineupPlayerName, {
      subType: 'player_sub',
    });
    if (!subResult.success) {
      console.warn(`[GameTracker] Substitution rejected: ${subResult.error}`);
      // TODO: Show UI toast/notification to user
      return;
    }

    // Update local player state for UI display
    const players = teamType === 'away' ? awayTeamPlayers : homeTeamPlayers;
    const setPlayers = teamType === 'away' ? setAwayTeamPlayers : setHomeTeamPlayers;

    const outgoingIndex = players.findIndex(p => p.name === lineupPlayerName);
    const incomingIndex = players.findIndex(p => p.name === benchPlayerName);

    if (outgoingIndex >= 0 && incomingIndex >= 0) {
      setPlayers(prev => {
        const updated = [...prev];
        // Transfer batting order and position from outgoing to incoming player
        const outgoingBattingOrder = updated[outgoingIndex].battingOrder;
        const outgoingPosition = updated[outgoingIndex].position;

        // Incoming player takes the batting order and position
        updated[incomingIndex] = {
          ...updated[incomingIndex],
          battingOrder: outgoingBattingOrder,
          position: outgoingPosition,
        };

        // Outgoing player loses batting order, position, and is marked as out of game
        updated[outgoingIndex] = {
          ...updated[outgoingIndex],
          battingOrder: undefined,
          position: undefined, // Remove position so they don't show in field
          isOutOfGame: true,
        };

        return updated;
      });
    }
  }, [makeSubstitution, awayTeamPlayers, homeTeamPlayers]);

  const handlePitcherSubstitution = (teamType: 'away' | 'home', newPitcherName: string, replacedName: string, replacedType: 'player' | 'pitcher') => {
    console.log(`Pitcher Substitution: ${newPitcherName} replacing ${replacedName} (${replacedType}) on ${teamType} team`);

    // Generate player IDs in same format as initializeGame
    const newPitcherId = `${teamType}-${newPitcherName.replace(/\s+/g, '-').toLowerCase()}`;
    const exitingPitcherId = `${teamType}-${replacedName.replace(/\s+/g, '-').toLowerCase()}`;

    // Call the hook's changePitcher function which will:
    // 1. Show pitch count prompt for exiting pitcher
    // 2. After confirmation, update currentPitcherId/currentPitcherName
    changePitcher(newPitcherId, exitingPitcherId, newPitcherName, replacedName);

    // mWAR: Record pitching change decision
    try {
      const gsLI = buildGameStateForLI();
      const decisionId = mwarHook.recordDecision('pitching_change', gsLI, [newPitcherId, exitingPitcherId], `Replaced ${replacedName} with ${newPitcherName}`);
      setPendingMWARDecisions(prev => new Map(prev).set(decisionId, { decisionId, decisionType: 'pitching_change', involvedPlayers: [newPitcherId], resolveAfterNextPlay: true }));
      console.log(`[mWAR] Recorded pitching_change decision: ${decisionId}`);
    } catch (e) { console.warn('[mWAR] Decision recording error (non-blocking):', e); }
  };

  const handlePositionSwap = useCallback((teamType: 'away' | 'home', player1Name: string, player2Name: string) => {
    console.log(`Position Swap: ${player1Name} and ${player2Name} swapping positions on ${teamType} team`);

    // Update local player state for UI display
    const setPlayers = teamType === 'away' ? setAwayTeamPlayers : setHomeTeamPlayers;

    setPlayers(prev => {
      const updated = [...prev];
      const player1Index = updated.findIndex(p => p.name === player1Name);
      const player2Index = updated.findIndex(p => p.name === player2Name);

      if (player1Index >= 0 && player2Index >= 0) {
        // Swap positions only (not batting order) during live game
        const player1Position = updated[player1Index].position;
        const player2Position = updated[player2Index].position;

        updated[player1Index] = { ...updated[player1Index], position: player2Position };
        updated[player2Index] = { ...updated[player2Index], position: player1Position };
      }

      return updated;
    });
  }, []);

  // ============================================
  // RUNNER POPOVER HANDLERS (Layer 4 — tickets 4.1, 4.2, 4.4)
  // ============================================

  const handleRunnerTap = useCallback((base: 'first' | 'second' | 'third', anchorPosition: { left: string; top: string }) => {
    setActiveFielderPopover(null); // Close any open fielder popover
    setActiveRunnerPopover({ base, anchorPosition });
  }, []);

  const closeRunnerPopover = useCallback(() => {
    setActiveRunnerPopover(null);
  }, []);

  const nextBaseMap: Record<RunnerBase, 'second' | 'third' | 'home'> = {
    first: 'second', second: 'third', third: 'home',
  };

  const handleRunnerSteal = useCallback((base: RunnerBase) => {
    undoSystem.captureSnapshot(`SB: ${base} → ${nextBaseMap[base]}`);
    advanceRunner(base, nextBaseMap[base], 'safe');
    recordEvent('SB');
    setActiveRunnerPopover(null);
  }, [advanceRunner, recordEvent, undoSystem]);

  const handleRunnerAdvance = useCallback((base: RunnerBase) => {
    undoSystem.captureSnapshot(`Advance: ${base} → ${nextBaseMap[base]}`);
    advanceRunner(base, nextBaseMap[base], 'safe');
    setActiveRunnerPopover(null);
  }, [advanceRunner, undoSystem]);

  const handleRunnerWP = useCallback((base: RunnerBase, dest?: 'second' | 'third' | 'home') => {
    const to = dest || nextBaseMap[base];
    undoSystem.captureSnapshot(`WP: ${base} → ${to}`);
    advanceRunner(base, to, 'safe');
    recordEvent('WP');
    setActiveRunnerPopover(null);
  }, [advanceRunner, recordEvent, undoSystem]);

  const handleRunnerPB = useCallback((base: RunnerBase, dest?: 'second' | 'third' | 'home') => {
    const to = dest || nextBaseMap[base];
    undoSystem.captureSnapshot(`PB: ${base} → ${to}`);
    advanceRunner(base, to, 'safe');
    recordEvent('PB');
    setActiveRunnerPopover(null);
  }, [advanceRunner, recordEvent, undoSystem]);

  const handleRunnerPickoff = useCallback((base: RunnerBase) => {
    undoSystem.captureSnapshot(`Pickoff: ${base}`);
    // Pickoff = runner is out at their current base
    advanceRunner(base, nextBaseMap[base], 'out');
    recordEvent('PICK');
    setActiveRunnerPopover(null);
  }, [advanceRunner, recordEvent, undoSystem]);

  const handleRunnerSubstitute = useCallback((base: RunnerBase) => {
    // Close runner popover — user will use the LineupCard for the actual pinch runner selection
    // TODO: Could open a dedicated pinch-runner picker modal inline
    setActiveRunnerPopover(null);
    console.log(`[GameTracker] Pinch runner requested at ${base} — use LineupCard to complete`);
  }, []);

  // ============================================
  // FIELDER POPOVER HANDLERS (Layer 4 — tickets 4.3, 4.5)
  // ============================================

  const handleFielderTap = useCallback((positionNumber: number, playerName: string, anchorPosition: { left: string; top: string }) => {
    setActiveRunnerPopover(null); // Close any open runner popover
    // Map position number to label
    const posLabels: Record<number, string> = { 1: 'P', 2: 'C', 3: '1B', 4: '2B', 5: '3B', 6: 'SS', 7: 'LF', 8: 'CF', 9: 'RF' };
    const positionLabel = posLabels[positionNumber] || `P${positionNumber}`;
    const playerId = generatePlayerId(playerName, fieldingTeam);
    const isCurrentBatter = playerName === gameState.currentBatterName;

    setActiveFielderPopover({
      fielder: { positionNumber, positionLabel, playerName, playerId, isCurrentBatter },
      anchorPosition,
    });
  }, [fieldingTeam, gameState.currentBatterName, generatePlayerId]);

  const closeFielderPopover = useCallback(() => {
    setActiveFielderPopover(null);
  }, []);

  const handleFielderSubstitute = useCallback((benchPlayerId: string, benchPlayerName: string, fielderId: string, fielderName: string) => {
    handleSubstitution(fieldingTeam, benchPlayerName, fielderName);
    setActiveFielderPopover(null);
  }, [fieldingTeam, handleSubstitution]);

  const handleFielderPinchHit = useCallback((benchPlayerId: string, benchPlayerName: string, fielderId: string, fielderName: string) => {
    // Pinch hit = batting team sub (current batter replaced)
    handleSubstitution(battingTeam, benchPlayerName, fielderName);
    setActiveFielderPopover(null);
  }, [battingTeam, handleSubstitution]);

  const handleFielderMovePosition = useCallback((playerId: string, newPosition: string) => {
    switchPositions([{ playerId, newPosition }]);
    setActiveFielderPopover(null);
  }, [switchPositions]);

  // ============================================
  // PITCHER TAP HANDLER (Layer 4 — ticket 4.6)
  // ============================================

  const handlePitcherTap = useCallback(() => {
    // If there are available pitchers, trigger pitching change
    if (availablePitchers.length > 0) {
      const firstAvailable = availablePitchers[0];
      // Use existing handlePitcherSubstitution with the first available pitcher
      // In future, could open a pitcher picker modal. For now, log the intent.
      console.log('[GameTracker] Pitcher tap — available pitchers:', availablePitchers.map(p => p.name).join(', '));
      // Open a simple pitcher picker by triggering the lineup card's bullpen section
      // For now, trigger the change with the first available pitcher
      handlePitcherSubstitution(fieldingTeam, firstAvailable.name, gameState.currentPitcherName, 'pitcher');
    }
  }, [availablePitchers, fieldingTeam, gameState.currentPitcherName, handlePitcherSubstitution]);

  // Bench players for fielder popover (fielding team bench)
  const fielderPopoverBenchPlayers: BenchPlayerInfo[] = useMemo(() => {
    const fieldingPlayers = fieldingTeam === 'home' ? homeTeamPlayers : awayTeamPlayers;
    return fieldingPlayers
      .filter(p => p.battingOrder === undefined)
      .map(p => ({
        id: generatePlayerId(p.name, fieldingTeam),
        name: p.name,
        position: p.position || 'UT',
        isUsed: p.isOutOfGame || false,
      }));
  }, [fieldingTeam, homeTeamPlayers, awayTeamPlayers, generatePlayerId]);

  // ============================================
  // OUTCOME RECORDING HANDLERS
  // ============================================

  // Start recording a hit - sets pending state, waits for RECORD button
  const handleHitSelect = useCallback((hitType: HitType) => {
    setPendingOutcome({
      type: 'hit',
      subType: hitType,
      rbi: hitType === 'HR' ? 1 : 0, // Default 1 RBI for HR, 0 for others
    });
    // Keep the outcome detail panel open
  }, []);

  // Start recording an out
  const handleOutSelect = useCallback((outType: OutType) => {
    setPendingOutcome({
      type: 'out',
      subType: outType,
    });
  }, []);

  // Start recording a walk
  const handleWalkSelect = useCallback((walkType: WalkType) => {
    setPendingOutcome({
      type: 'walk',
      subType: walkType,
    });
  }, []);

  // Update RBI count for pending outcome
  const handleRbiChange = useCallback((rbi: number) => {
    setPendingOutcome(prev => prev ? { ...prev, rbi } : null);
  }, []);

  // Record the pending outcome to IndexedDB
  const handleRecordOutcome = useCallback(async () => {
    if (!pendingOutcome) return;

    try {
      if (pendingOutcome.type === 'hit') {
        await recordHit(
          pendingOutcome.subType as HitType,
          pendingOutcome.rbi || 0
        );
        logAction(`${pendingOutcome.subType} (manual) — ${pendingOutcome.rbi || 0} RBI`);
      } else if (pendingOutcome.type === 'out') {
        // GAP-GT-6-A: Pass forceNoRuns when user has toggled the time play override
        await recordOut(pendingOutcome.subType as OutType, undefined, undefined, timePlayNoRun ? { forceNoRuns: true } : undefined);
        logAction(`Out (${pendingOutcome.subType}) (manual entry)${timePlayNoRun ? ' [time play — no run]' : ''}`);
        setTimePlayNoRun(false); // Reset time play toggle after recording
      } else if (pendingOutcome.type === 'walk') {
        await recordWalk(pendingOutcome.subType as WalkType);
        logAction(`${pendingOutcome.subType} walk (manual)`);
      }

      // GAP-GT-7-C: Clear pendingPH after any at-bat result — the PH has batted
      setPendingPH(null);

      // Clear pending outcome and close panels
      setPendingOutcome(null);
      setExpandedOutcome(null);
    } catch (error) {
      console.error('Failed to record outcome:', error);
    }
  }, [pendingOutcome, recordHit, recordOut, recordWalk, timePlayNoRun]);

  // Cancel pending outcome
  const handleCancelOutcome = useCallback(() => {
    setPendingOutcome(null);
    setExpandedOutcome(null);
    setTimePlayNoRun(false); // GAP-GT-6-A: Always reset on cancel
  }, []);

  // Handle end of inning
  const handleEndInning = useCallback(() => {
    endInning();
    // Clear runner names when inning ends (bases are cleared)
    setRunnerNames({});
  }, [endInning]);

  // Handle end game with navigation
  const handleEndGame = useCallback(async () => {
    // T1-08 FIX: Prevent double execution from useEffect re-firing
    if (gameEndingRef.current) {
      console.log('[T1-08] handleEndGame already in progress — skipping duplicate call');
      return;
    }
    gameEndingRef.current = true;
    let endGameCompleted = false;

    try {
      // MAJ-09: End-of-game achievement detection (No-Hitter, Perfect Game, Maddux, CG, Shutout)
      try {
        const totalGameOuts = gameState.inning * 3; // Approximate from current inning
        for (const [pitcherId, pStats] of pitcherStats.entries()) {
          if (!pStats.isStarter) continue; // Only starters can have CG/NH/PG

          const ipOuts = pStats.outsRecorded;
          // Complete game: starter must have pitched the entire game (≥ scheduled innings × 3 outs)
          const scheduledOuts = 9 * 3; // 9-inning game standard
          const isCompleteGame = ipOuts >= scheduledOuts;
          if (!isCompleteGame) continue;

          const pitcherName = pitcherId; // ID contains name info from game state tracking
          const isShutout = isCompleteGame && pStats.runsAllowed === 0;
          const isNoHitter = isShutout && pStats.hitsAllowed === 0;
          const isPerfectGame = isNoHitter && pStats.walksAllowed === 0 && (pStats.hitByPitch || 0) === 0;
          const isMaddux = isShutout && pStats.pitchCount < 100;

          if (isPerfectGame) {
            fameTrackingHook.recordFameEvent('PERFECT_GAME' as FameEventType, pitcherId, pitcherName, gameState.inning, gameState.isTop ? 'TOP' : 'BOTTOM', 1.0);
            console.log(`[MAJ-09] Perfect Game detected for ${pitcherId}`);
          } else if (isNoHitter) {
            fameTrackingHook.recordFameEvent('NO_HITTER' as FameEventType, pitcherId, pitcherName, gameState.inning, gameState.isTop ? 'TOP' : 'BOTTOM', 1.0);
            console.log(`[MAJ-09] No-Hitter detected for ${pitcherId}`);
          } else if (isMaddux) {
            fameTrackingHook.recordFameEvent('MADDUX' as FameEventType, pitcherId, pitcherName, gameState.inning, gameState.isTop ? 'TOP' : 'BOTTOM', 1.0);
            console.log(`[MAJ-09] Maddux detected for ${pitcherId}`);
          } else if (isShutout) {
            fameTrackingHook.recordFameEvent('SHUTOUT' as FameEventType, pitcherId, pitcherName, gameState.inning, gameState.isTop ? 'TOP' : 'BOTTOM', 1.0);
            console.log(`[MAJ-09] Complete Game Shutout detected for ${pitcherId}`);
          } else {
            fameTrackingHook.recordFameEvent('COMPLETE_GAME' as FameEventType, pitcherId, pitcherName, gameState.inning, gameState.isTop ? 'TOP' : 'BOTTOM', 1.0);
            console.log(`[MAJ-09] Complete Game detected for ${pitcherId}`);
          }
        }
      } catch (detectionError) {
        console.warn('[MAJ-09] End-of-game detection error (non-blocking):', detectionError);
      }

      // MAJ-02: Update fan morale at game end (franchise/playoff only — no morale in exhibition)
      if (gameMode !== 'exhibition') {
        try {
          const homeWon = gameState.homeScore > gameState.awayScore;
          const homeRunDiff = gameState.homeScore - gameState.awayScore;
          const isBlowout = Math.abs(homeRunDiff) >= 7;
          const isRivalMatchup = areRivals(leagueId, homeTeamId, awayTeamId);

          // Check for special game results from pitcher stats
          let isNoHitter = false;
          let isShutout = false;
          for (const [, pStats] of pitcherStats.entries()) {
            if (pStats.isStarter && pStats.outsRecorded >= 27) {
              if (pStats.hitsAllowed === 0 && pStats.runsAllowed === 0) isNoHitter = true;
              if (pStats.runsAllowed === 0) isShutout = true;
            }
          }

          // MAJ-14: Walk-off = home team wins in the bottom half (scored go-ahead run in their last at-bat)
          const isWalkOff = homeWon && !gameState.isTop;

          // Home team perspective
          const homeResult: FanMoraleGameResult = {
            gameId: gameId || 'demo-game',
            won: homeWon,
            isWalkOff, // MAJ-14: Use real walk-off detection
            isNoHitter: isNoHitter && homeWon, // Only counts for the winning side
            isShutout: isShutout && homeWon,
            isBlowout,
            vsRival: isRivalMatchup,
            runDifferential: homeRunDiff,
            playerPerformances: [],
          };
          homeFanMorale.processGameResult(homeResult, { season: 1, game: 1 }, isRivalMatchup ? awayTeamName : undefined);

          // Away team perspective (opposite won/runDiff, mirrored no-hitter/shutout)
          const awayResult: FanMoraleGameResult = {
            gameId: gameId || 'demo-game',
            won: !homeWon,
            isWalkOff, // MAJ-14: Same walk-off flag (away team experienced it too)
            isNoHitter: isNoHitter && !homeWon,
            isShutout: isShutout && !homeWon,
            isBlowout,
            vsRival: isRivalMatchup,
            runDifferential: -homeRunDiff,
            playerPerformances: [],
          };
          awayFanMorale.processGameResult(awayResult, { season: 1, game: 1 }, isRivalMatchup ? homeTeamName : undefined);

          console.log(`[MAJ-02] Fan morale updated (both teams) — homeWon: ${homeWon}, diff: ${homeRunDiff}, shutout: ${isShutout}`);
        } catch (moraleError) {
          console.warn('[MAJ-02] Fan morale update error (non-blocking):', moraleError);
        }
      }

      // MAJ-04: Generate game recap narratives (dual perspective)
      let gameNarrative = null;
      let awayNarrative = null;
      try {
        const homeWonForNarrative = gameState.homeScore > gameState.awayScore;
        // Home team perspective
        gameNarrative = generateGameRecap({
          teamName: homeTeamName,
          opponentName: awayTeamName,
          teamScore: gameState.homeScore,
          opponentScore: gameState.awayScore,
          isShutout: gameState.awayScore === 0 && homeWonForNarrative,
        });
        // Away team perspective
        awayNarrative = generateGameRecap({
          teamName: awayTeamName,
          opponentName: homeTeamName,
          teamScore: gameState.awayScore,
          opponentScore: gameState.homeScore,
          isShutout: gameState.homeScore === 0 && !homeWonForNarrative,
        });
        console.log(`[MAJ-04] Dual narratives: Home "${gameNarrative.headline}", Away "${awayNarrative.headline}"`);
      } catch (narrativeError) {
        console.warn('[MAJ-04] Narrative generation error (non-blocking):', narrativeError);
      }

      // mWAR: Persist decisions and aggregate to season
      try {
        if (mwarHook.gameStats && mwarHook.gameStats.decisions.length > 0) {
          await saveGameDecisions(mwarHook.gameStats.decisions);
          // Aggregate to season with default team stats (actual record comes from season data)
          await aggregateManagerGameToSeason(
            gameId || 'demo-game',
            'season-1',
            homeManagerId,
            homeTeamId,
            { wins: parseInt(homeRecord.split('-')[0]) || 0, losses: parseInt(homeRecord.split('-')[1]) || 0 }, // MAJ-15: Use actual team record from route state
            0.5, // Default salary score
            50, // Default season games
          );
          console.log(`[mWAR] Persisted ${mwarHook.gameStats.decisions.length} decisions, mWAR: ${mwarHook.formatCurrentMWAR()}`);
          // GAP-GT-5-D: Log best/worst decisions by clutchImpact for later aggregation verification
          const resolvedDecisions = mwarHook.gameStats.decisions.filter(d => d.resolved);
          if (resolvedDecisions.length > 0) {
            const sorted = [...resolvedDecisions].sort((a, b) => b.clutchImpact - a.clutchImpact);
            const best = sorted[0];
            const worst = sorted[sorted.length - 1];
            console.log(`[mWAR-WPA] Best decision: ${best.decisionType} (LI=${best.leverageIndex.toFixed(2)}, clutchImpact=${best.clutchImpact.toFixed(3)})`);
            console.log(`[mWAR-WPA] Worst decision: ${worst.decisionType} (LI=${worst.leverageIndex.toFixed(2)}, clutchImpact=${worst.clutchImpact.toFixed(3)})`);
          }
        }
      } catch (mwarError) {
        console.warn('[mWAR] Persistence error (non-blocking):', mwarError);
      }

      const computedSeasonId = navigationState?.seasonId
        ?? (navigationState?.franchiseId
          ? `${navigationState.franchiseId}-season-${navigationState?.seasonNumber ?? 1}`
          : `season-${navigationState?.seasonNumber ?? 1}`);
      pushActivityLog(
        `[Game End] ${homeTeamName} ${gameState.homeScore} - ${awayTeamName} ${gameState.awayScore} (Inning ${gameState.inning})`
      );
    const endGameOptions = {
      activityLog,
      seasonId: computedSeasonId,
      franchiseId: navigationState?.franchiseId,
      currentSeason: navigationState?.seasonNumber ?? 1,
      stadiumName: selectedStadium,
    };
      await hookEndGame(endGameOptions);

      // T0-05 FIX: Mark the schedule game as COMPLETED (franchise mode only)
      // The SIM path does this in FranchiseHome.tsx, but the PLAY path was missing it entirely.
      // This updates standings (wins/losses) and advances the schedule to the next game.
      if (navigationState?.scheduleGameId && (navigationState?.gameMode === 'franchise' || navigationState?.gameMode === 'playoff')) {
        try {
          const winnerId = gameState.homeScore > gameState.awayScore ? homeTeamId : awayTeamId;
          const loserId = gameState.homeScore > gameState.awayScore ? awayTeamId : homeTeamId;
          await completeScheduleGame(navigationState.scheduleGameId, {
            homeScore: gameState.homeScore,
            awayScore: gameState.awayScore,
            winningTeamId: winnerId,
            losingTeamId: loserId,
            gameLogId: gameId,
          });
          console.log(`[T0-05] Schedule game ${navigationState.scheduleGameId} marked COMPLETED — winner: ${winnerId}`);
        } catch (schedErr) {
          console.error('[T0-05] Schedule completion failed:', schedErr);
        }
      }

      // GAP-GT-3-J: Clear undo stack — game is over, undo must not be possible after navigation
      undoSystem.clearHistory();

      // Pass game mode and narratives so PostGameSummary can display them
      navigate(`/post-game/${gameId}`, {
        state: {
          gameMode: navigationState?.gameMode || 'franchise',
          franchiseId: navigationState?.franchiseId || gameId?.replace('franchise-', '') || '1',
          gameNarrative,
          awayNarrative,
        }
      });
      endGameCompleted = true;
    } catch (err) {
      console.error('[GameTracker] End game flow failed:', err);
    } finally {
      // Release the guard lock if end-game did not complete, so user can retry.
      if (!endGameCompleted) {
        gameEndingRef.current = false;
      }
    }
  }, [hookEndGame, navigate, gameId, navigationState?.gameMode, gameMode, gameState, pitcherStats, fameTrackingHook, homeFanMorale, awayFanMorale, homeTeamName, awayTeamName, mwarHook, homeManagerId, homeTeamId, activityLog, pushActivityLog]);

  // T0-01: Auto-trigger endGame when regulation ends
  useEffect(() => {
    if (showAutoEndPrompt) {
      console.log('[T0-01] Auto game-end detected — triggering handleEndGame');
      dismissAutoEndPrompt();
      handleEndGame();
    }
  }, [showAutoEndPrompt, dismissAutoEndPrompt, handleEndGame]);

  if (isLoading || !gameInitialized) {
    return (
      <div className="min-h-screen bg-[#6B9462] flex items-center justify-center">
        <div className="bg-[#1a3020] border-4 border-[#C4A853] px-6 py-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.4)]">
          <div className="text-[#E8E8D8] text-sm font-bold tracking-wide">Loading game...</div>
        </div>
      </div>
    );
  }

  return (
    <DndProvider backend={HTML5Backend}>
      {/* Fame Event Popup - Shows when fame events are detected */}
      {fameTrackingHook.showEventPopup && fameTrackingHook.lastEvent && (
        <div
          className="fixed top-20 right-4 z-50 animate-bounce"
          onClick={() => fameTrackingHook.dismissEventPopup()}
        >
          <div
            className="px-4 py-3 border-4 border-[#FFD700] shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)] cursor-pointer"
            style={{ backgroundColor: getFameColor(fameTrackingHook.lastEvent.finalFame) }}
          >
            <div className="flex items-center gap-2">
              <span className="text-xl">{fameTrackingHook.lastEvent.icon}</span>
              <div>
                <div className="text-white font-bold text-sm">
                  {fameTrackingHook.lastEvent.label}
                </div>
                <div className="text-white/80 text-xs">
                  {formatFameValue(fameTrackingHook.lastEvent.finalFame)} Fame
                  {fameTrackingHook.lastEvent.liMultiplier > 1.0 && (
                    <span className="ml-1">
                      ({getLITier(fameTrackingHook.lastEvent.liMultiplier).label})
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* mWAR: Manager Moment Notification — shows at LI ≥ 2.0 */}
      {mwarHook.managerMoment.isTriggered && (
        <div className="fixed bottom-4 left-4 right-4 z-50 max-w-md mx-auto">
          <div className="bg-[#4A6A42] border-4 border-[#FFD700] p-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)]">
            <div className="flex items-center justify-between mb-1">
              <div className="text-xs font-bold text-[#FFD700]">
                ⚡ MANAGER MOMENT (LI: {mwarHook.managerMoment.leverageIndex.toFixed(1)})
              </div>
              <button
                onClick={() => mwarHook.dismissManagerMoment()}
                className="text-[#E8E8D8]/60 hover:text-[#E8E8D8] text-xs px-1"
              >
                ✕
              </button>
            </div>
            <div className="text-sm text-[#E8E8D8] mb-2">{mwarHook.managerMoment.context}</div>
            {mwarHook.managerMoment.decisionType && (
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const gsLI = buildGameStateForLI();
                    const decisionId = mwarHook.recordDecision(mwarHook.managerMoment.decisionType!, gsLI, [], mwarHook.managerMoment.suggestedAction || '');
                    setPendingMWARDecisions(prev => new Map(prev).set(decisionId, { decisionId, decisionType: mwarHook.managerMoment.decisionType!, involvedPlayers: [], resolveAfterNextPlay: true }));
                    mwarHook.dismissManagerMoment();
                    console.log(`[mWAR] User called ${mwarHook.managerMoment.decisionType}: ${decisionId}`);
                  }}
                  className="flex-1 py-1.5 text-xs bg-[#FFD700] text-[#2A3A22] font-bold border-2 border-[#B8960A] hover:bg-[#E8C400] active:scale-95 transition-transform"
                >
                  Call {mwarHook.managerMoment.decisionType?.replace(/_/g, ' ')}
                </button>
                <button
                  onClick={() => mwarHook.dismissManagerMoment()}
                  className="flex-1 py-1.5 text-xs bg-[#5A8352] text-[#E8E8D8] border-2 border-[#4A6844] hover:bg-[#4F7D4B] active:scale-95 transition-transform"
                >
                  Skip
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Player State Notifications - Shows Mojo/Fitness changes */}
      {playerStateHook.notifications.length > 0 && (
        <div className="fixed top-20 left-4 z-50 space-y-2">
          {playerStateHook.notifications.slice(0, 3).map((notification, idx) => (
            <div
              key={idx}
              className={`px-3 py-2 bg-[#333] border-2 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.5)] cursor-pointer ${
                notification.severity === 'critical' ? 'border-red-500' :
                notification.severity === 'warning' ? 'border-yellow-500' :
                'border-[#C4A853]'
              }`}
              onClick={() => playerStateHook.dismissNotification(idx)}
            >
              <div className="flex items-center gap-2">
                <span className="text-lg">{notification.icon}</span>
                <div className="text-[#E8E8D8] text-xs">
                  {notification.message}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
           §3.7 FIVE-ZONE CSS GRID LAYOUT (Layer 2A: Grid Scaffold)
           ┌─────────────────────────────┬───────────────────────┬──────┐
           │ FENWAY BOARD (top-left)     │ DIAMOND (center)      │ PLAY │
           │ scoreboard + context cards  │ EnhancedInteractive   │ LOG  │
           │                             │ Field                 │(right│
           │                             │                       │panel)│
           ├─────────────────────────────┼───────────────────────┤      │
           │ QUICK BAR (bottom-left)     │ MODIFIERS (bot-right) │      │
           │ outcome buttons             │ undo + end game       │      │
           └─────────────────────────────┴───────────────────────┴──────┘
           ═══════════════════════════════════════════════════════════════ */}
      <div
        className="h-screen bg-[#6B9462] text-white overflow-hidden"
        style={{
          display: 'grid',
          gridTemplateColumns: '320px 1fr 180px',
          gridTemplateRows: '1fr auto',
          gap: '0px',
        }}
      >
        {/* ZONE 1: Fenway Board — top left */}
        <div style={{ gridColumn: '1', gridRow: '1' }}>
          <FenwayBoard
            awayTeamName={awayTeamName.toUpperCase()}
            homeTeamName={homeTeamName.toUpperCase()}
            awayRuns={scoreboard.away.runs}
            homeRuns={scoreboard.home.runs}
            awayErrors={scoreboard.away.errors}
            homeErrors={scoreboard.home.errors}
            inning={gameState.inning}
            isTop={gameState.isTop}
            outs={gameState.outs}
            currentBatterName={gameState.currentBatterName}
            currentPitcherName={gameState.currentPitcherName}
            batterStats={currentBatterStats ? {
              ab: currentBatterStats.ab,
              h: currentBatterStats.h,
              hr: currentBatterStats.hr,
              rbi: currentBatterStats.rbi,
              bb: currentBatterStats.bb,
              k: currentBatterStats.k,
            } : undefined}
            batterAvg={batterAB > 0 ? (batterHits / batterAB).toFixed(3).replace(/^0/, '') : '.000'}
            batterMojo={(() => {
              const team = gameState.isTop ? 'away' : 'home';
              const mojo = getPlayerMojoByName(gameState.currentBatterName, team);
              return mojo !== undefined ? toMojoLabel(mojo) : undefined;
            })()}
            batterMojoColor={(() => {
              const team = gameState.isTop ? 'away' : 'home';
              const mojo = getPlayerMojoByName(gameState.currentBatterName, team);
              return mojo !== undefined ? getMojoColor(mojo) : undefined;
            })()}
            batterFitness={(() => {
              const team = gameState.isTop ? 'away' : 'home';
              const fitness = getPlayerFitnessByName(gameState.currentBatterName, team);
              return fitness ? toFitnessLabel(fitness) : undefined;
            })()}
            batterHand={currentBatterData?.battingHand}
            pitcherPitchCount={pitcherPitchCount}
            pitcherGameERA={(() => {
              if (!currentPitcherStats) return undefined;
              const outsRec = currentPitcherStats.outsRecorded;
              if (outsRec === 0) return '-.--';
              return ((currentPitcherStats.earnedRuns / outsRec) * 27).toFixed(2);
            })()}
            pitcherOuts={currentPitcherStats?.outsRecorded}
            pitcherHits={currentPitcherStats?.hitsAllowed}
            pitcherK={currentPitcherStats?.strikeoutsThrown}
            pitcherBB={currentPitcherStats?.walksAllowed}
            pitcherMojo={(() => {
              const team = gameState.isTop ? 'home' : 'away';
              const mojo = getPlayerMojoByName(gameState.currentPitcherName, team);
              return mojo !== undefined ? toMojoLabel(mojo) : undefined;
            })()}
            pitcherMojoColor={(() => {
              const team = gameState.isTop ? 'home' : 'away';
              const mojo = getPlayerMojoByName(gameState.currentPitcherName, team);
              return mojo !== undefined ? getMojoColor(mojo) : undefined;
            })()}
            pitcherFitness={(() => {
              const team = gameState.isTop ? 'home' : 'away';
              const fitness = getPlayerFitnessByName(gameState.currentPitcherName, team);
              return fitness ? toFitnessLabel(fitness) : undefined;
            })()}
            pitcherHand={(() => {
              const pitcher = gameState.isTop ? homePitcher : awayPitcher;
              return pitcher?.throwingHand;
            })()}
            onPitcherTap={availablePitchers.length > 0 ? handlePitcherTap : undefined}
          />
        </div>

        {/* ZONE 2: Diamond — center (EnhancedInteractiveField, same props) */}
        <div style={{ gridColumn: '2', gridRow: '1' }} className="bg-[#6B9462] relative overflow-hidden">
          <EnhancedInteractiveField
            gameSituation={{
              outs: gameState.outs,
              bases: gameState.bases,
              inning: gameState.inning,
              isTop: gameState.isTop,
            }}
            fieldPositions={fieldPositions}
            onPlayComplete={handleEnhancedPlayComplete}
            onSpecialEvent={handleSpecialEvent}
            onRunnerMove={handleEnhancedRunnerMove}
            onBatchRunnerMove={handleBatchRunnerMove}
            fielderBorderColors={[fielderColor1, fielderColor2]}
            batterBackgroundColor={battingTeamColors.primary}
            batterBorderColor={battingTeamColors.secondary}
            playerNames={{
              1: fieldPositions.find(fp => fp.number === '1')?.name || 'P',
              2: fieldPositions.find(fp => fp.number === '2')?.name || 'C',
              3: fieldPositions.find(fp => fp.number === '3')?.name || '1B',
              4: fieldPositions.find(fp => fp.number === '4')?.name || '2B',
              5: fieldPositions.find(fp => fp.number === '5')?.name || '3B',
              6: fieldPositions.find(fp => fp.number === '6')?.name || 'SS',
              7: fieldPositions.find(fp => fp.number === '7')?.name || 'LF',
              8: fieldPositions.find(fp => fp.number === '8')?.name || 'CF',
              9: fieldPositions.find(fp => fp.number === '9')?.name || 'RF',
            }}
            runnerNames={runnerNames}
            currentBatterName={gameState.currentBatterName}
            zoomLevel={fieldZoomLevel}
            onRunnerTap={handleRunnerTap}
            onFielderTap={handleFielderTap}
          />

          {/* Runner Popover — tap runner on diamond → action menu (§5.1) */}
          {activeRunnerPopover && (
            <RunnerPopover
              base={activeRunnerPopover.base}
              runnerName={runnerNames[activeRunnerPopover.base] || `R${activeRunnerPopover.base === 'first' ? '1' : activeRunnerPopover.base === 'second' ? '2' : '3'}`}
              anchorPosition={activeRunnerPopover.anchorPosition}
              onSteal={handleRunnerSteal}
              onAdvance={handleRunnerAdvance}
              onWildPitch={handleRunnerWP}
              onPassedBall={handleRunnerPB}
              onPickoff={handleRunnerPickoff}
              onSubstitute={handleRunnerSubstitute}
              onClose={closeRunnerPopover}
            />
          )}

          {/* Fielder Popover — tap fielder on diamond → substitution menu (§7.2) */}
          {activeFielderPopover && (
            <FielderPopover
              fielder={activeFielderPopover.fielder}
              anchorPosition={activeFielderPopover.anchorPosition}
              benchPlayers={fielderPopoverBenchPlayers}
              onSubstitute={handleFielderSubstitute}
              onPinchHit={handleFielderPinchHit}
              onMovePosition={handleFielderMovePosition}
              onClose={closeFielderPopover}
            />
          )}
        </div>

        {/* ZONE 3: Play Log — right panel, spans both rows */}
        <div style={{ gridColumn: '3', gridRow: '1 / 3' }}>
          <PlayLogPanel entries={playLogEntries} />
        </div>

        {/* ZONE 4: Quick Bar — bottom left */}
        <div style={{ gridColumn: '1', gridRow: '2' }}>
          <QuickBar disabled={!gameInitialized} onOutcome={handleQuickBarOutcome} />
        </div>

        {/* ZONE 5: Modifiers + Actions — bottom center */}
        <div style={{ gridColumn: '2', gridRow: '2' }} className="bg-[#2a3a2d] border-t-[3px] border-[#3d5240]">
          <div className="flex gap-2 p-2 items-center justify-end h-full">
            <undoSystem.UndoButtonComponent />
            <button
              onClick={() => setShowEndGameConfirmation(true)}
              className="bg-[#DD0000] border-[3px] border-white px-4 py-2.5 text-white text-sm font-bold
                         shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)] active:scale-95 transition-transform
                         hover:bg-[#FF0000]"
            >
              END
            </button>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════════════════
             BELOW: Modals and overlays render inside the grid container
             but are position:fixed so they float above. Also the disabled
             reference code block from the old layout.
           ══════════════════════════════════════════════════════════════ */}

        {/* Player Card Modal - EXH-036: Now with mojo/fitness editing */}
        {selectedPlayer && (
          <PlayerCardModal
            player={selectedPlayer}
            onClose={() => setSelectedPlayer(null)}
            currentMojo={playerStateHook.getPlayer(selectedPlayer.playerId)?.gameState.currentMojo}
            currentFitness={playerStateHook.getPlayer(selectedPlayer.playerId)?.fitnessProfile.currentFitness}
            onMojoChange={(newMojo) => playerStateHook.setMojo(selectedPlayer.playerId, newMojo)}
            onFitnessChange={(newFitness) => playerStateHook.setFitness(selectedPlayer.playerId, newFitness)}
          />
        )}

        {/* Play Location Overlay - REMOVED (now using drag-drop interface) */}

        {/* End Game Confirmation */}
        {showEndGameConfirmation && (
          <div
            className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50"
            onClick={() => setShowEndGameConfirmation(false)}
          >
            <div
              className="bg-[#556B55] border-[6px] border-[#4A6844] p-4 w-[340px] shadow-[8px_8px_0px_0px_rgba(0,0,0,0.8)]"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="bg-[#3d5240] border-[4px] border-[#E8E8D8] p-2 mb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-[#E8E8D8] font-bold">END GAME CONFIRMATION</div>
                  </div>
                  <button
                    onClick={() => setShowEndGameConfirmation(false)}
                    className="bg-[#5A8352] border-[3px] border-[#E8E8D8] px-2 py-1 text-[#E8E8D8] text-xs hover:bg-[#4A6844]"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {/* Confirmation Message */}
              <div className="text-[8px] text-[#E8E8D8] font-bold mb-4">
                Are you sure you want to end the game? This action cannot be undone.
              </div>

              {/* Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => setShowEndGameConfirmation(false)}
                  className="flex-1 bg-[#3d5240] border-[5px] border-[#E8E8D8] py-4 text-[#E8E8D8] text-sm hover:bg-[#4A6844] active:scale-95 transition-transform"
                >
                  CANCEL
                </button>
                <button
                  onClick={handleEndGame}
                  className="flex-1 bg-[#DD0000] border-[5px] border-white py-4 text-white text-sm hover:bg-[#FF0000] active:scale-95 transition-transform"
                >
                  END GAME
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Undo toast notification */}
        <undoSystem.ToastComponent />

        {/* Pitch Count Prompt Modal (per PITCH_COUNT_TRACKING_SPEC.md) */}
        {pitchCountPrompt && (
          <PitchCountModal
            prompt={pitchCountPrompt}
            onConfirm={(pitcherId: string, finalCount: number) => {
              const result = confirmPitchCount(pitcherId, finalCount);
              if (result.immaculateInning) {
                fameTrackingHook.recordFameEvent(
                  'IMMACULATE_INNING' as FameEventType,
                  result.immaculateInning.pitcherId,
                  result.immaculateInning.pitcherName,
                  gameState.inning,
                  gameState.isTop ? 'TOP' : 'BOTTOM',
                  1.0
                );
              }
            }}
            onDismiss={dismissPitchCountPrompt}
          />
        )}

        {/* EXH-016: Fielder Credit Modal for thrown-out runners */}
        <FielderCreditModal
          isOpen={fielderCreditModalOpen}
          onClose={handleFielderCreditClose}
          onConfirm={handleFielderCreditConfirm}
          runnersOut={runnersOutForCredit}
        />

        {/* EXH-025: Error on Advance Modal for extra base advancement */}
        <ErrorOnAdvanceModal
          isOpen={errorOnAdvanceModalOpen}
          onClose={handleErrorOnAdvanceClose}
          onConfirm={handleErrorOnAdvanceConfirm}
          runnersWithExtraAdvance={runnersWithExtraAdvance}
        />

        {/* MAJ-03: Detection prompt notifications */}
        {pendingDetections.length > 0 && (
          <div className="fixed bottom-24 right-4 z-50 flex flex-col gap-2 max-w-[320px]">
            {pendingDetections.map((detection, idx) => (
              <div
                key={`${detection.eventType}-${idx}`}
                className="bg-[#1a1a1a] border-2 border-[#C4A853] rounded-lg p-3 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.4)] animate-fade-in"
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{detection.icon}</span>
                  <span className="text-xs font-bold text-[#C4A853] uppercase tracking-wider">
                    {detection.eventType.replace(/_/g, ' ')}
                  </span>
                </div>
                <p className="text-[11px] text-[#ccc] mb-2">{detection.message}</p>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleDetectionConfirm(detection)}
                    className="flex-1 px-3 py-1.5 bg-[#2E7D32] text-white text-[10px] font-bold uppercase rounded border border-[#4CAF50] hover:bg-[#388E3C] active:scale-95 transition-all"
                  >
                    Confirm
                  </button>
                  <button
                    onClick={() => handleDetectionDismiss(detection)}
                    className="flex-1 px-3 py-1.5 bg-[#333] text-[#888] text-[10px] font-bold uppercase rounded border border-[#555] hover:bg-[#444] active:scale-95 transition-all"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>{/* Close 5-zone grid */}

      {/* ══════════════════════════════════════════════════════════════
           PRESERVED: Old below-field content (disabled reference code).
           Kept as reference for future Layer 2 sessions that will
           wire the Quick Bar to these handlers.
         ══════════════════════════════════════════════════════════════ */}
      {false && (<div>
          {/* Expandable sections - REMOVED, replaced with drag-drop interface */}
          {/* The game tracker now uses direct field interaction instead of buttons */}
          {false && (
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {/* HITS Section */}
            <ExpandablePanel 
              title="HITS" 
              isExpanded={expandedSections.hits}
              onToggle={() => toggleSection('hits')}
            >
              <div className="space-y-1">
                <div className="grid grid-cols-5 gap-1">
                  <OutcomeButton
                    label="1B"
                    color="lightblue"
                    isExpanded={expandedOutcome === '1B'}
                    onClick={() => { toggleOutcomeDetail('1B'); handleHitSelect('1B'); }}
                  />
                  <OutcomeButton
                    label="2B"
                    color="lightblue"
                    isExpanded={expandedOutcome === '2B'}
                    onClick={() => { toggleOutcomeDetail('2B'); handleHitSelect('2B'); }}
                  />
                  <OutcomeButton
                    label="3B"
                    color="lightblue"
                    isExpanded={expandedOutcome === '3B'}
                    onClick={() => { toggleOutcomeDetail('3B'); handleHitSelect('3B'); }}
                  />
                  <OutcomeButton
                    label="HR"
                    color="magenta"
                    isExpanded={expandedOutcome === 'HR'}
                    onClick={() => { toggleOutcomeDetail('HR'); handleHitSelect('HR'); }}
                  />
                  <OutcomeButton
                    label="E"
                    color="purple"
                    isExpanded={expandedOutcome === 'E'}
                    onClick={() => toggleOutcomeDetail('E')}
                  />
                </div>
                
                {/* HR Details */}
                {expandedOutcome === 'HR' && (
                  <OutcomeDetailPanel title="HOME RUN DETAILS">
                    <div className="space-y-2">
                      <div>
                        <div className="text-[7px] text-white mb-1">DIRECTION:</div>
                        <div className="grid grid-cols-5 gap-1">
                          <DetailButton label="L" onClick={() => {}} />
                          <DetailButton label="LC" onClick={() => {}} />
                          <DetailButton label="C" onClick={() => {}} />
                          <DetailButton label="RC" onClick={() => {}} />
                          <DetailButton label="R" onClick={() => {}} />
                        </div>
                      </div>
                      <div>
                        <div className="text-[7px] text-white mb-1">DISTANCE (FT):</div>
                        <input
                          type="number"
                          placeholder="e.g., 420"
                          className="w-full bg-[#1A1A2E] border-2 border-white text-white text-xs p-1"
                        />
                      </div>
                      <div>
                        <div className="text-[7px] text-white mb-1">HOW DID IT CLEAR:</div>
                        <div className="grid grid-cols-3 gap-1">
                          <DetailButton label="FENCE" onClick={() => {}} />
                          <DetailButton label="ROBBED" onClick={() => {}} />
                          <DetailButton label="WALL" onClick={() => {}} />
                        </div>
                      </div>
                      {/* RBI Selection */}
                      <div>
                        <div className="text-[7px] text-white mb-1">RBI:</div>
                        <div className="grid grid-cols-5 gap-1">
                          {[1, 2, 3, 4].map(num => (
                            <DetailButton
                              key={num}
                              label={num.toString()}
                              isSelected={pendingOutcome?.rbi === num}
                              onClick={() => handleRbiChange(num)}
                            />
                          ))}
                        </div>
                      </div>
                      {/* RECORD Button */}
                      <div className="grid grid-cols-2 gap-2 pt-2">
                        <button
                          onClick={handleCancelOutcome}
                          className="bg-gray-600 text-white text-xs py-2 px-4 border-2 border-gray-400 hover:bg-gray-500"
                        >
                          CANCEL
                        </button>
                        <button
                          onClick={handleRecordOutcome}
                          disabled={isSaving}
                          className="bg-green-600 text-white text-xs py-2 px-4 border-2 border-green-400 hover:bg-green-500 disabled:opacity-50"
                        >
                          {isSaving ? 'SAVING...' : 'RECORD HR'}
                        </button>
                      </div>
                    </div>
                  </OutcomeDetailPanel>
                )}

                {/* 1B, 2B, 3B Details */}
                {(expandedOutcome === '1B' || expandedOutcome === '2B' || expandedOutcome === '3B') && (
                  <OutcomeDetailPanel title={`${expandedOutcome} DETAILS`}>
                    <div className="space-y-2">
                      <div>
                        <div className="text-[7px] text-white mb-1">DIRECTION:</div>
                        <div className="grid grid-cols-5 gap-1">
                          <DetailButton label="L" onClick={() => {}} />
                          <DetailButton label="LC" onClick={() => {}} />
                          <DetailButton label="C" onClick={() => {}} />
                          <DetailButton label="RC" onClick={() => {}} />
                          <DetailButton label="R" onClick={() => {}} />
                        </div>
                      </div>
                      <div>
                        <div className="text-[7px] text-white mb-1">HIT TYPE:</div>
                        <div className="grid grid-cols-3 gap-1">
                          <DetailButton label="GROUND" onClick={() => {}} />
                          <DetailButton label="LINE" onClick={() => {}} />
                          <DetailButton label="FLY" onClick={() => {}} />
                        </div>
                      </div>
                      {/* RBI Selection */}
                      <div>
                        <div className="text-[7px] text-white mb-1">RBI:</div>
                        <div className="grid grid-cols-5 gap-1">
                          {[0, 1, 2, 3, 4].map(num => (
                            <DetailButton
                              key={num}
                              label={num.toString()}
                              isSelected={pendingOutcome?.rbi === num}
                              onClick={() => handleRbiChange(num)}
                            />
                          ))}
                        </div>
                      </div>
                      {/* RECORD Button */}
                      <div className="grid grid-cols-2 gap-2 pt-2">
                        <button
                          onClick={handleCancelOutcome}
                          className="bg-gray-600 text-white text-xs py-2 px-4 border-2 border-gray-400 hover:bg-gray-500"
                        >
                          CANCEL
                        </button>
                        <button
                          onClick={handleRecordOutcome}
                          disabled={isSaving}
                          className="bg-green-600 text-white text-xs py-2 px-4 border-2 border-green-400 hover:bg-green-500 disabled:opacity-50"
                        >
                          {isSaving ? 'SAVING...' : `RECORD ${expandedOutcome}`}
                        </button>
                      </div>
                    </div>
                  </OutcomeDetailPanel>
                )}

                {/* Error Details — T0-04 FIX: Wire position buttons to recordError */}
                {expandedOutcome === 'E' && (
                  <OutcomeDetailPanel title="ERROR DETAILS">
                    <div className="space-y-2">
                      <div>
                        <div className="text-[7px] text-white mb-1">FIELDED BY:</div>
                        <div className="grid grid-cols-5 gap-1">
                          <DetailButton label="P" onClick={() => { recordError(0); setExpandedOutcome(null); }} />
                          <DetailButton label="C" onClick={() => { recordError(0); setExpandedOutcome(null); }} />
                          <DetailButton label="1B" onClick={() => { recordError(0); setExpandedOutcome(null); }} />
                          <DetailButton label="2B" onClick={() => { recordError(0); setExpandedOutcome(null); }} />
                          <DetailButton label="3B" onClick={() => { recordError(0); setExpandedOutcome(null); }} />
                        </div>
                        <div className="grid grid-cols-4 gap-1 mt-1">
                          <DetailButton label="SS" onClick={() => { recordError(0); setExpandedOutcome(null); }} />
                          <DetailButton label="LF" onClick={() => { recordError(0); setExpandedOutcome(null); }} />
                          <DetailButton label="CF" onClick={() => { recordError(0); setExpandedOutcome(null); }} />
                          <DetailButton label="RF" onClick={() => { recordError(0); setExpandedOutcome(null); }} />
                        </div>
                      </div>
                    </div>
                  </OutcomeDetailPanel>
                )}

                <div className="grid grid-cols-2 gap-1">
                  <OutcomeButton
                    label="BB"
                    color="blue"
                    isExpanded={expandedOutcome === 'BB'}
                    onClick={() => { toggleOutcomeDetail('BB'); handleWalkSelect('BB'); }}
                  />
                  <OutcomeButton
                    label="HBP"
                    color="blue"
                    isExpanded={expandedOutcome === 'HBP'}
                    onClick={() => { toggleOutcomeDetail('HBP'); handleWalkSelect('HBP'); }}
                  />
                </div>

                {/* BB/HBP Quick Record */}
                {(expandedOutcome === 'BB' || expandedOutcome === 'HBP') && (
                  <OutcomeDetailPanel title={expandedOutcome === 'BB' ? 'WALK' : 'HIT BY PITCH'}>
                    <div className="grid grid-cols-2 gap-2 pt-2">
                      <button
                        onClick={handleCancelOutcome}
                        className="bg-gray-600 text-white text-xs py-2 px-4 border-2 border-gray-400 hover:bg-gray-500"
                      >
                        CANCEL
                      </button>
                      <button
                        onClick={handleRecordOutcome}
                        disabled={isSaving}
                        className="bg-green-600 text-white text-xs py-2 px-4 border-2 border-green-400 hover:bg-green-500 disabled:opacity-50"
                      >
                        {isSaving ? 'SAVING...' : `RECORD ${expandedOutcome}`}
                      </button>
                    </div>
                  </OutcomeDetailPanel>
                )}
              </div>
            </ExpandablePanel>

            {/* OUTS Section */}
            <ExpandablePanel 
              title="OUTS" 
              isExpanded={expandedSections.outs}
              onToggle={() => toggleSection('outs')}
            >
              <div className="space-y-1">
                <div className="grid grid-cols-5 gap-1">
                  <OutcomeButton
                    label="K"
                    color="red"
                    isExpanded={expandedOutcome === 'K'}
                    onClick={() => { toggleOutcomeDetail('K'); handleOutSelect('K'); }}
                  />
                  <OutcomeButton
                    label="Kc"
                    color="red"
                    isExpanded={expandedOutcome === 'Kc'}
                    onClick={() => { toggleOutcomeDetail('Kc'); handleOutSelect('Kc'); }}
                  />
                  <OutcomeButton
                    label="GO"
                    color="red"
                    isExpanded={expandedOutcome === 'GO'}
                    onClick={() => { toggleOutcomeDetail('GO'); handleOutSelect('GO'); }}
                  />
                  <OutcomeButton
                    label="FO"
                    color="red"
                    isExpanded={expandedOutcome === 'FO'}
                    onClick={() => { toggleOutcomeDetail('FO'); handleOutSelect('FO'); }}
                  />
                  <OutcomeButton
                    label="LO"
                    color="red"
                    isExpanded={expandedOutcome === 'LO'}
                    onClick={() => { toggleOutcomeDetail('LO'); handleOutSelect('LO'); }}
                  />
                </div>

                {/* K/KL Quick Record (no additional details needed) */}
                {(expandedOutcome === 'K' || expandedOutcome === 'Kc') && (
                  <OutcomeDetailPanel title={expandedOutcome === 'K' ? 'STRIKEOUT (SWINGING)' : 'STRIKEOUT (LOOKING)'}>
                    <div className="grid grid-cols-2 gap-2 pt-2">
                      <button
                        onClick={handleCancelOutcome}
                        className="bg-gray-600 text-white text-xs py-2 px-4 border-2 border-gray-400 hover:bg-gray-500"
                      >
                        CANCEL
                      </button>
                      <button
                        onClick={handleRecordOutcome}
                        disabled={isSaving}
                        className="bg-green-600 text-white text-xs py-2 px-4 border-2 border-green-400 hover:bg-green-500 disabled:opacity-50"
                      >
                        {isSaving ? 'SAVING...' : `RECORD ${expandedOutcome}`}
                      </button>
                    </div>
                  </OutcomeDetailPanel>
                )}

                {/* FO Details */}
                {expandedOutcome === 'FO' && (
                  <OutcomeDetailPanel title="FLY OUT DETAILS">
                    <div className="space-y-2">
                      <div>
                        <div className="text-[7px] text-white mb-1">DIRECTION:</div>
                        <div className="grid grid-cols-5 gap-1">
                          <DetailButton label="L" onClick={() => {}} />
                          <DetailButton label="LC" onClick={() => {}} />
                          <DetailButton label="C" onClick={() => {}} />
                          <DetailButton label="RC" onClick={() => {}} />
                          <DetailButton label="R" onClick={() => {}} />
                        </div>
                      </div>
                      <div>
                        <div className="text-[7px] text-white mb-1">FIELDED BY:</div>
                        <div className="grid grid-cols-5 gap-1">
                          <DetailButton label="P" onClick={() => {}} />
                          <DetailButton label="C" onClick={() => {}} />
                          <DetailButton label="1B" onClick={() => {}} />
                          <DetailButton label="2B" onClick={() => {}} />
                          <DetailButton label="3B" onClick={() => {}} />
                        </div>
                        <div className="grid grid-cols-4 gap-1 mt-1">
                          <DetailButton label="SS" onClick={() => {}} />
                          <DetailButton label="LF" onClick={() => {}} />
                          <DetailButton label="CF" onClick={() => {}} />
                          <DetailButton label="RF" onClick={() => {}} />
                        </div>
                      </div>
                      <div>
                        <div className="text-[7px] text-white mb-1">SPECIAL PLAY:</div>
                        <div className="grid grid-cols-3 gap-1">
                          <DetailButton label="ROUTINE" onClick={() => {}} />
                          <DetailButton label="DIVING" onClick={() => {}} />
                          <DetailButton label="WALL" onClick={() => {}} />
                        </div>
                        <div className="grid grid-cols-2 gap-1 mt-1">
                          <DetailButton label="RUNNING" onClick={() => {}} />
                          <DetailButton label="LEAPING" onClick={() => {}} />
                        </div>
                      </div>
                      {/* GAP-GT-3-H: Sac fly prompt — FO with R3 occupied and <2 outs */}
                      {gameState.bases.third && gameState.outs < 2 && (
                        <div className="p-1 bg-[#2a4a2a] border border-[#44AA44] mt-1">
                          <div className="text-[8px] text-[#88FF88] font-bold mb-1">🏃 RUNNER ON 3RD — SAC FLY?</div>
                          <button
                            onClick={async () => {
                              // Record as SF directly (cleaner than mutating pendingOutcome)
                              try {
                                await recordOut('SF');
                                logAction('SF (sac fly via prompt)');
                                setPendingOutcome(null);
                                setExpandedOutcome(null);
                              } catch (e) { console.error('Failed to record SF:', e); }
                            }}
                            disabled={isSaving}
                            className="w-full text-[9px] py-1 bg-[#336633] border border-[#44AA44] text-[#88FF88] font-bold hover:bg-[#447744] disabled:opacity-50"
                          >
                            RECORD AS SAC FLY (SF)
                          </button>
                        </div>
                      )}
                      {/* GAP-GT-6-A: Time play toggle — only relevant on 3rd out with runners */}
                      {gameState.outs === 2 && hasRunners && (
                        <div className="p-1 bg-[#3a2a1a] border border-[#AA6644] mt-1">
                          <div className="text-[8px] text-[#FFAA66] font-bold mb-1">⏱ TIME PLAY — 3RD OUT</div>
                          <button
                            onClick={() => setTimePlayNoRun(prev => !prev)}
                            className={`w-full text-[9px] py-1 border font-bold ${timePlayNoRun ? 'bg-[#8B4513] border-[#AA6644] text-[#FFD700]' : 'bg-[#333] border-[#555] text-[#AAA]'}`}
                          >
                            {timePlayNoRun ? '✓ OUT BEFORE RUN — NO RUNS COUNT' : 'Runner scored before out? (tap to negate)'}
                          </button>
                        </div>
                      )}
                      {/* RECORD Button */}
                      <div className="grid grid-cols-2 gap-2 pt-2">
                        <button
                          onClick={handleCancelOutcome}
                          className="bg-gray-600 text-white text-xs py-2 px-4 border-2 border-gray-400 hover:bg-gray-500"
                        >
                          CANCEL
                        </button>
                        <button
                          onClick={handleRecordOutcome}
                          disabled={isSaving}
                          className="bg-green-600 text-white text-xs py-2 px-4 border-2 border-green-400 hover:bg-green-500 disabled:opacity-50"
                        >
                          {isSaving ? 'SAVING...' : 'RECORD FO'}
                        </button>
                      </div>
                    </div>
                  </OutcomeDetailPanel>
                )}

                {/* GO, LO Details */}
                {(expandedOutcome === 'GO' || expandedOutcome === 'LO') && (
                  <OutcomeDetailPanel title={`${expandedOutcome === 'GO' ? 'GROUND' : 'LINE'} OUT DETAILS`}>
                    <div className="space-y-2">
                      <div>
                        <div className="text-[7px] text-white mb-1">FIELDED BY:</div>
                        <div className="grid grid-cols-5 gap-1">
                          <DetailButton label="P" onClick={() => {}} />
                          <DetailButton label="C" onClick={() => {}} />
                          <DetailButton label="1B" onClick={() => {}} />
                          <DetailButton label="2B" onClick={() => {}} />
                          <DetailButton label="3B" onClick={() => {}} />
                        </div>
                        <div className="grid grid-cols-4 gap-1 mt-1">
                          <DetailButton label="SS" onClick={() => {}} />
                          <DetailButton label="LF" onClick={() => {}} />
                          <DetailButton label="CF" onClick={() => {}} />
                          <DetailButton label="RF" onClick={() => {}} />
                        </div>
                      </div>
                      {/* GAP-GT-6-A: Time play toggle — only relevant on 3rd out with runners */}
                      {gameState.outs === 2 && hasRunners && (
                        <div className="p-1 bg-[#3a2a1a] border border-[#AA6644]">
                          <div className="text-[8px] text-[#FFAA66] font-bold mb-1">⏱ TIME PLAY — 3RD OUT</div>
                          <button
                            onClick={() => setTimePlayNoRun(prev => !prev)}
                            className={`w-full text-[9px] py-1 border font-bold ${timePlayNoRun ? 'bg-[#8B4513] border-[#AA6644] text-[#FFD700]' : 'bg-[#333] border-[#555] text-[#AAA]'}`}
                          >
                            {timePlayNoRun ? '✓ OUT BEFORE RUN — NO RUNS COUNT' : 'Runner scored before out? (tap to negate)'}
                          </button>
                        </div>
                      )}
                      {/* RECORD Button */}
                      <div className="grid grid-cols-2 gap-2 pt-2">
                        <button
                          onClick={handleCancelOutcome}
                          className="bg-gray-600 text-white text-xs py-2 px-4 border-2 border-gray-400 hover:bg-gray-500"
                        >
                          CANCEL
                        </button>
                        <button
                          onClick={handleRecordOutcome}
                          disabled={isSaving}
                          className="bg-green-600 text-white text-xs py-2 px-4 border-2 border-green-400 hover:bg-green-500 disabled:opacity-50"
                        >
                          {isSaving ? 'SAVING...' : `RECORD ${expandedOutcome}`}
                        </button>
                      </div>
                    </div>
                  </OutcomeDetailPanel>
                )}

                {/* GAP-GT-6-G / GAP-GT-6-C: Button availability enforcement */}
                <div className="grid grid-cols-5 gap-1">
                  <OutcomeButton
                    label="PO"
                    color="red"
                    isExpanded={expandedOutcome === 'PO'}
                    onClick={() => { toggleOutcomeDetail('PO'); handleOutSelect('PO'); }}
                  />
                  <OutcomeButton
                    label="DP"
                    color="red"
                    isExpanded={expandedOutcome === 'DP'}
                    onClick={() => { toggleOutcomeDetail('DP'); handleOutSelect('DP'); }}
                    disabled={gameState.outs >= 2} // DP impossible with 2 outs
                  />
                  <OutcomeButton
                    label="FC"
                    color="purple"
                    isExpanded={expandedOutcome === 'FC'}
                    onClick={() => { toggleOutcomeDetail('FC'); handleOutSelect('FC'); }}
                  />
                  <OutcomeButton
                    label="SF"
                    color="purple"
                    isExpanded={expandedOutcome === 'SF'}
                    onClick={() => { toggleOutcomeDetail('SF'); handleOutSelect('SF'); }}
                    disabled={gameState.outs >= 2} // SF impossible with 2 outs
                  />
                  <OutcomeButton
                    label="SH"
                    color="purple"
                    isExpanded={expandedOutcome === 'SH'}
                    onClick={() => { toggleOutcomeDetail('SH'); handleOutSelect('SH'); }}
                    disabled={!hasRunners} // GAP-GT-6-C: SAC requires runners
                  />
                </div>

                {/* TP button — needs ≥2 runners AND 0 outs (GAP-GT-6-G) */}
                <div className="grid grid-cols-2 gap-1">
                  <OutcomeButton
                    label="TP"
                    color="red"
                    isExpanded={expandedOutcome === 'TP'}
                    onClick={() => { toggleOutcomeDetail('TP'); handleOutSelect('TP'); }}
                    disabled={runnerCount < 2 || gameState.outs > 0}
                  />
                  <OutcomeButton
                    label="D3K"
                    color="purple"
                    isExpanded={expandedOutcome === 'D3K'}
                    onClick={() => { toggleOutcomeDetail('D3K'); handleOutSelect('D3K'); }}
                    disabled={!!gameState.bases.first && gameState.outs < 2} // D3K illegal when 1B occupied & <2 outs
                  />
                </div>

                {/* PO/DP/FC/SF/SH/TP Quick Record */}
                {(expandedOutcome === 'PO' || expandedOutcome === 'DP' || expandedOutcome === 'FC' || expandedOutcome === 'SF' || expandedOutcome === 'SH' || expandedOutcome === 'TP') && (
                  <OutcomeDetailPanel title={`${expandedOutcome} DETAILS`}>
                    {/* GAP-GT-4-H: IFR auto-prompt when PO + R1+R2 (or loaded) + <2 outs */}
                    {expandedOutcome === 'PO' && runnerCount >= 2 && gameState.outs < 2 && (
                      <div className="mb-2 p-1 bg-[#2a2a4a] border border-[#8888FF]">
                        <div className="text-[8px] text-[#AAAAFF] font-bold mb-1">⚑ INFIELD FLY RULE?</div>
                        <div className="grid grid-cols-2 gap-1">
                          <button
                            onClick={() => {
                              setPendingOutcome(prev => prev ? { ...prev, modifiers: { ...prev.modifiers, ifr: true } } as typeof prev : prev);
                            }}
                            className={`text-[9px] py-1 border font-bold ${(pendingOutcome as { modifiers?: { ifr?: boolean } })?.modifiers?.ifr ? 'bg-[#6666FF] border-[#4444DD] text-white' : 'bg-[#333] border-[#555] text-[#AAA]'}`}
                          >
                            YES — IFR
                          </button>
                          <button
                            onClick={() => {
                              setPendingOutcome(prev => prev ? { ...prev, modifiers: { ...prev.modifiers, ifr: false } } as typeof prev : prev);
                            }}
                            className={`text-[9px] py-1 border font-bold ${(pendingOutcome as { modifiers?: { ifr?: boolean } })?.modifiers?.ifr === false ? 'bg-[#555] border-[#777] text-white' : 'bg-[#333] border-[#555] text-[#AAA]'}`}
                          >
                            NO
                          </button>
                        </div>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-2 pt-2">
                      <button
                        onClick={handleCancelOutcome}
                        className="bg-gray-600 text-white text-xs py-2 px-4 border-2 border-gray-400 hover:bg-gray-500"
                      >
                        CANCEL
                      </button>
                      <button
                        onClick={handleRecordOutcome}
                        disabled={isSaving}
                        className="bg-green-600 text-white text-xs py-2 px-4 border-2 border-green-400 hover:bg-green-500 disabled:opacity-50"
                      >
                        {isSaving ? 'SAVING...' : `RECORD ${expandedOutcome}`}
                      </button>
                    </div>
                  </OutcomeDetailPanel>
                )}

                {/* D3K Quick Record */}
                {expandedOutcome === 'D3K' && (
                  <OutcomeDetailPanel title="DROPPED 3RD STRIKE">
                    <div className="text-[8px] text-[#AAAACC] mb-1">
                      {gameState.bases.first && gameState.outs < 2
                        ? '⚠ D3K disabled: 1B occupied with <2 outs (batter is automatically out)'
                        : 'Batter may run to 1B'}
                    </div>
                    <div className="grid grid-cols-2 gap-2 pt-2">
                      <button
                        onClick={handleCancelOutcome}
                        className="bg-gray-600 text-white text-xs py-2 px-4 border-2 border-gray-400 hover:bg-gray-500"
                      >
                        CANCEL
                      </button>
                      <button
                        onClick={handleRecordOutcome}
                        disabled={isSaving}
                        className="bg-green-600 text-white text-xs py-2 px-4 border-2 border-green-400 hover:bg-green-500 disabled:opacity-50"
                      >
                        {isSaving ? 'SAVING...' : 'RECORD D3K'}
                      </button>
                    </div>
                  </OutcomeDetailPanel>
                )}
              </div>
            </ExpandablePanel>

            {/* EVENTS Section */}
            <ExpandablePanel 
              title="EVENTS" 
              isExpanded={expandedSections.events}
              onToggle={() => toggleSection('events')}
            >
              <div className="space-y-1">
                <div className="grid grid-cols-4 gap-1">
                  <OutcomeButton 
                    label="SB" 
                    color="lightblue" 
                    isExpanded={expandedOutcome === 'SB'}
                    onClick={() => toggleOutcomeDetail('SB')} 
                  />
                  <OutcomeButton 
                    label="CS" 
                    color="red" 
                    isExpanded={expandedOutcome === 'CS'}
                    onClick={() => toggleOutcomeDetail('CS')} 
                  />
                  <OutcomeButton 
                    label="WP" 
                    color="purple" 
                    isExpanded={expandedOutcome === 'WP'}
                    onClick={() => toggleOutcomeDetail('WP')} 
                  />
                  <OutcomeButton 
                    label="PB" 
                    color="purple" 
                    isExpanded={expandedOutcome === 'PB'}
                    onClick={() => toggleOutcomeDetail('PB')} 
                  />
                </div>
                <div className="grid grid-cols-3 gap-1">
                  <OutcomeButton 
                    label="PICK" 
                    color="red" 
                    isExpanded={expandedOutcome === 'PICK'}
                    onClick={() => toggleOutcomeDetail('PICK')} 
                  />
                  <OutcomeButton 
                    label="KILLED" 
                    color="purple" 
                    isExpanded={expandedOutcome === 'KILLED'}
                    onClick={() => toggleOutcomeDetail('KILLED')} 
                  />
                  <OutcomeButton 
                    label="NUTSHOT" 
                    color="purple" 
                    isExpanded={expandedOutcome === 'NUTSHOT'}
                    onClick={() => toggleOutcomeDetail('NUTSHOT')} 
                  />
                </div>
              </div>
            </ExpandablePanel>

            {/* LINEUP Section - Drag-and-Drop Only */}
            <ExpandablePanel
              title="LINEUP"
              isExpanded={expandedSections.substitutions}
              onToggle={() => toggleSection('substitutions')}
            >
              {/* GAP-GT-7-B: Lineup size warning — display if not 9 or 10 players */}
              {!lineupSizeOk && currentLineup.length > 0 && (
                <div className="mb-1 px-2 py-1 bg-[#4A2A00] border border-[#FF8800] text-[#FFAA44] text-[8px] font-bold">
                  ⚠ LINEUP SIZE: {currentLineup.length} — expected 9 (or 10 with DH)
                </div>
              )}
              {/* LineupCard - Drag-drop substitution interface (Per spec: no buttons) */}
              {/* EXH-036: Added onPlayerClick to allow mojo/fitness editing from lineup cards */}
              <LineupCard
                lineup={lineupCardData}
                bench={benchCardData}
                bullpen={bullpenCardData}
                currentPitcher={currentPitcherData}
                onSubstitution={handleLineupCardSubstitution}
                isExpanded={true}
                onPlayerClick={(playerId, playerName, type) => setSelectedPlayer({ name: playerName, type, playerId })}
              />
            </ExpandablePanel>
          </div>
          )}

          {/* Control buttons - UNDO and END GAME */}
          <div className="flex gap-3 items-center">
            <button
              className="flex-1 bg-[#808080] border-[5px] border-white py-4 text-white text-base font-bold hover:bg-[#999999] active:scale-95 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]"
            >
              ⟲ UNDO
            </button>

            {/* Logo between buttons */}
            <div className="bg-white border-[4px] border-[#0066FF] px-3 py-1 shadow-[4px_4px_0px_0px_#DD0000]">
              <div className="text-xs text-[#DD0000] tracking-wide leading-tight">SUPER MEGA</div>
              <div className="text-sm text-[#0066FF] tracking-wide leading-tight">BASEBALL</div>
            </div>

            <button
              onClick={() => setShowEndGameConfirmation(true)}
              className="flex-1 bg-[#DD0000] border-[5px] border-white py-4 text-white text-base font-bold hover:bg-[#FF0000] active:scale-95 transition-transform shadow-[4px_4px_0px_0px_#0066FF]"
            >
              🏁 END GAME
            </button>
          </div>
      </div>)}{/* Close outer {false && (<div>)} disabled reference block */}
    </DndProvider>
  );
}

// Pitch Count Modal Component (per PITCH_COUNT_TRACKING_SPEC.md §5)
interface PitchCountModalProps {
  prompt: {
    type: 'pitching_change' | 'end_game' | 'end_inning';
    pitcherId: string;
    pitcherName: string;
    currentCount: number;
    lastVerifiedInning: number;
  };
  onConfirm: (pitcherId: string, finalCount: number) => void;
  onDismiss: () => void;
}

function PitchCountModal({ prompt, onConfirm, onDismiss }: PitchCountModalProps) {
  const [pitchCount, setPitchCount] = React.useState(prompt.currentCount.toString());

  const handleConfirm = () => {
    const count = parseInt(pitchCount, 10);
    if (!isNaN(count) && count >= 0) {
      onConfirm(prompt.pitcherId, count);
    }
  };

  const title = prompt.type === 'pitching_change'
    ? '⚠️ PITCHING CHANGE - PITCH COUNT REQUIRED'
    : prompt.type === 'end_game'
    ? '🏁 FINAL PITCH COUNT'
    : '📊 END OF INNING - UPDATE PITCH COUNT?';

  const isRequired = prompt.type !== 'end_inning';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-[#556B55] border-4 border-[#3d5240] p-4 max-w-md w-full mx-4 shadow-lg">
        <div className="text-[#FFD700] text-sm font-bold mb-3">{title}</div>

        <div className="bg-[#3d5240] p-3 mb-3">
          <div className="text-[#E8E8D8] text-xs mb-1">
            {prompt.type === 'pitching_change' ? 'Outgoing Pitcher' : 'Pitcher'}:
          </div>
          <div className="text-white font-bold">{prompt.pitcherName}</div>
        </div>

        <div className="text-[#E8E8D8] text-xs mb-2">
          Last recorded: <span className="text-white font-bold">{prompt.currentCount}</span> pitches
          (after inning {prompt.lastVerifiedInning})
        </div>

        <div className="mb-4">
          <label className="text-[#E8E8D8] text-xs block mb-1">
            Enter CURRENT pitch count:
          </label>
          <input
            type="number"
            min={prompt.currentCount}
            value={pitchCount}
            onChange={(e) => setPitchCount(e.target.value)}
            className="w-full bg-[#2a3a2d] border-2 border-[#1a3020] text-white text-lg font-bold p-2 text-center"
            autoFocus
          />
          <div className="text-[#88AA88] text-[10px] mt-1">
            💡 Check the broadcast or scoreboard for current count
          </div>
        </div>

        {isRequired && (
          <div className="text-[#FF6666] text-xs mb-3">
            ⚠️ Cannot proceed without pitch count.
          </div>
        )}

        <div className="flex gap-2">
          {!isRequired && (
            <button
              onClick={onDismiss}
              className="flex-1 bg-[#3d5240] border-2 border-[#2a3a2d] text-[#E8E8D8] py-2 px-4 font-bold hover:bg-[#4a6a4a]"
            >
              Skip
            </button>
          )}
          <button
            onClick={handleConfirm}
            className="flex-1 bg-[#FFD700] border-2 border-[#CC9900] text-[#1a3020] py-2 px-4 font-bold hover:bg-[#FFE44D]"
          >
            {isRequired ? 'Confirm & Continue' : 'Update'}
          </button>
          {isRequired && (
            <button
              onClick={onDismiss}
              className="bg-[#663333] border-2 border-[#4a2424] text-[#E8E8D8] py-2 px-4 font-bold hover:bg-[#884444]"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

interface PlayerBoxProps {
  name: string;
  number: string;
  position: string;
  style?: React.CSSProperties;
  highlighted?: boolean;
}

function PlayerBox({ name, number, position, style, highlighted = false }: PlayerBoxProps) {
  return (
    <div
      className="absolute pointer-events-auto cursor-pointer bg-[#3366FF] border-[#5599FF] border-[3px] px-3 py-2 text-[9px] text-white hover:scale-110 transition-transform"
      style={style}
    >
      <div className="whitespace-nowrap font-bold">{name}</div>
      <div className="text-[8px] text-white">{position} {number}</div>
    </div>
  );
}

interface SNESButtonProps {
  label: string;
  color: "blue" | "red" | "purple" | "lightblue" | "magenta";
  onClick: () => void;
}

function SNESButton({ label, color, onClick }: SNESButtonProps) {
  const colorClasses = {
    blue: "bg-[#3366FF] border-[#1A44BB] text-white hover:bg-[#4477FF]",
    red: "bg-[#DD0000] border-[#AA0000] text-white hover:bg-[#FF0000]",
    purple: "bg-[#7733DD] border-[#5522AA] text-white hover:bg-[#8844EE]",
    lightblue: "bg-[#5599FF] border-[#3366CC] text-white hover:bg-[#66AAFF]",
    magenta: "bg-[#CC44CC] border-[#992299] text-white hover:bg-[#DD55DD]",
  };

  return (
    <button
      onClick={onClick}
      className={`${colorClasses[color]} border-[5px] py-4 text-base active:scale-95 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]`}
    >
      {label}
    </button>
  );
}

interface ExpandablePanelProps {
  title: string;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function ExpandablePanel({ title, isExpanded, onToggle, children }: ExpandablePanelProps) {
  return (
    <div className="bg-[#3366FF] border-[4px] border-white p-2">
      <div className="flex items-center justify-between cursor-pointer" onClick={onToggle}>
        <div className="text-[8px] text-white font-bold">{title}</div>
        <div className="text-[8px] text-white font-bold">{isExpanded ? "▲" : "▼"}</div>
      </div>
      {isExpanded && (
        <div className="mt-2">
          {children}
        </div>
      )}
    </div>
  );
}

interface PlayerCardModalProps {
  player: { name: string; type: 'batter' | 'pitcher'; playerId: string };
  onClose: () => void;
  // EXH-036: Mojo/Fitness editing
  currentMojo?: MojoLevel;
  currentFitness?: FitnessState;
  onMojoChange?: (newMojo: MojoLevel) => void;
  onFitnessChange?: (newFitness: FitnessState) => void;
}

function PlayerCardModal({
  player,
  onClose,
  currentMojo,
  currentFitness,
  onMojoChange,
  onFitnessChange
}: PlayerCardModalProps) {
  // EXH-036: State for editing mode
  const [isEditingMojo, setIsEditingMojo] = useState(false);
  const [isEditingFitness, setIsEditingFitness] = useState(false);

  // T0-09: Zero stats for player card — no phantom data
  // TODO: Wire to actual game state (playerStats/pitcherStats Maps) for live stats
  const batterStats = {
    position: 'SS',
    battingHand: 'R',
    throwingHand: 'R',
    avg: '.000',
    hr: 0,
    rbi: 0,
    sb: 0,
    gameStats: {
      ab: 0,
      hits: 0,
      bb: 0,
      so: 0,
    }
  };

  const pitcherStats = {
    throwingHand: 'R',
    era: '0.00',
    wins: 0,
    losses: 0,
    so: 0,
    gameStats: {
      pitches: 0,
      strikes: 0,
      balls: 0,
      fitness: 'Fresh',
    }
  };

  const stats = player.type === 'batter' ? batterStats : pitcherStats;

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div 
        className="bg-[#6B9462] border-[6px] border-[#E8E8D8] p-4 w-[340px] shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#6B9462] border-[4px] border-[#E8E8D8] p-2 mb-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-[#E8E8D8] font-bold" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>{player.name}</div>
              <div className="text-[8px] text-[#E8E8D8]" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>
                {player.type === 'batter' ? `${batterStats.position} • ${batterStats.battingHand}/${batterStats.throwingHand}` : `P • ${pitcherStats.throwingHand}HP`}
              </div>
            </div>
            <button
              onClick={onClose}
              className="bg-[#E8E8D8] border-[3px] border-[#6B9462] px-2 py-1 text-[#6B9462] text-xs hover:bg-white"
            >
              ✕
            </button>
          </div>
        </div>

        {player.type === 'batter' ? (
          <>
            {/* Season Stats */}
            <div className="bg-[#6B9462] border-[4px] border-[#E8E8D8] p-2 mb-2">
              <div className="text-[8px] text-[#E8E8D8] font-bold mb-1" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>SEASON STATS</div>
              <div className="grid grid-cols-4 gap-2 text-center">
                <div>
                  <div className="text-xs text-[#E8E8D8] font-bold" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>{batterStats.avg}</div>
                  <div className="text-[7px] text-[#E8E8D8]" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>AVG</div>
                </div>
                <div>
                  <div className="text-xs text-[#E8E8D8] font-bold" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>{batterStats.hr}</div>
                  <div className="text-[7px] text-[#E8E8D8]" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>HR</div>
                </div>
                <div>
                  <div className="text-xs text-[#E8E8D8] font-bold" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>{batterStats.rbi}</div>
                  <div className="text-[7px] text-[#E8E8D8]" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>RBI</div>
                </div>
                <div>
                  <div className="text-xs text-[#E8E8D8] font-bold" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>{batterStats.sb}</div>
                  <div className="text-[7px] text-[#E8E8D8]" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>SB</div>
                </div>
              </div>
            </div>

            {/* Game Stats */}
            <div className="bg-[#6B9462] border-[4px] border-[#E8E8D8] p-2">
              <div className="text-[8px] text-[#E8E8D8] font-bold mb-1" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>TODAY'S GAME</div>
              <div className="grid grid-cols-4 gap-2 text-center">
                <div>
                  <div className="text-xs text-[#E8E8D8] font-bold" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>{batterStats.gameStats.ab}</div>
                  <div className="text-[7px] text-[#E8E8D8]" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>AB</div>
                </div>
                <div>
                  <div className="text-xs text-[#E8E8D8] font-bold" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>{batterStats.gameStats.hits}</div>
                  <div className="text-[7px] text-[#E8E8D8]" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>H</div>
                </div>
                <div>
                  <div className="text-xs text-[#E8E8D8] font-bold" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>{batterStats.gameStats.bb}</div>
                  <div className="text-[7px] text-[#E8E8D8]" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>BB</div>
                </div>
                <div>
                  <div className="text-xs text-[#E8E8D8] font-bold" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>{batterStats.gameStats.so}</div>
                  <div className="text-[7px] text-[#E8E8D8]" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>SO</div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Season Stats */}
            <div className="bg-[#6B9462] border-[4px] border-[#E8E8D8] p-2 mb-2">
              <div className="text-[8px] text-[#E8E8D8] font-bold mb-1" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>SEASON STATS</div>
              <div className="grid grid-cols-4 gap-2 text-center">
                <div>
                  <div className="text-xs text-[#E8E8D8] font-bold" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>{pitcherStats.era}</div>
                  <div className="text-[7px] text-[#E8E8D8]" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>ERA</div>
                </div>
                <div>
                  <div className="text-xs text-[#E8E8D8] font-bold" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>{pitcherStats.wins}</div>
                  <div className="text-[7px] text-[#E8E8D8]" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>W</div>
                </div>
                <div>
                  <div className="text-xs text-[#E8E8D8] font-bold" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>{pitcherStats.losses}</div>
                  <div className="text-[7px] text-[#E8E8D8]" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>L</div>
                </div>
                <div>
                  <div className="text-xs text-[#E8E8D8] font-bold" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>{pitcherStats.so}</div>
                  <div className="text-[7px] text-[#E8E8D8]" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>SO</div>
                </div>
              </div>
            </div>

            {/* Game Stats */}
            <div className="bg-[#6B9462] border-[4px] border-[#E8E8D8] p-2">
              <div className="text-[8px] text-[#E8E8D8] font-bold mb-1" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>TODAY'S GAME</div>
              <div className="grid grid-cols-4 gap-2 text-center">
                <div>
                  <div className="text-xs text-[#E8E8D8] font-bold" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>{pitcherStats.gameStats.pitches}</div>
                  <div className="text-[7px] text-[#E8E8D8]" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>PITCH</div>
                </div>
                <div>
                  <div className="text-xs text-[#E8E8D8] font-bold" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>{pitcherStats.gameStats.strikes}</div>
                  <div className="text-[7px] text-[#E8E8D8]" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>STR</div>
                </div>
                <div>
                  <div className="text-xs text-[#E8E8D8] font-bold" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>{pitcherStats.gameStats.balls}</div>
                  <div className="text-[7px] text-[#E8E8D8]" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>BALL</div>
                </div>
                <div>
                  <div className="text-xs text-[#E8E8D8] font-bold" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>🟢</div>
                  <div className="text-[7px] text-[#E8E8D8]" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>{pitcherStats.gameStats.fitness}</div>
                </div>
              </div>
            </div>
          </>
        )}

        {/* EXH-036: Mojo/Fitness Editing Section */}
        {(currentMojo !== undefined || currentFitness !== undefined) && (
          <div className="bg-[#5A7A52] border-[4px] border-[#E8E8D8] p-2 mt-2 space-y-2">
            <div className="text-[8px] text-[#E8E8D8] font-bold mb-1" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>
              CONDITION
            </div>

            {/* Mojo Row */}
            {currentMojo !== undefined && onMojoChange && (
              <div className="flex items-center gap-2">
                <span className="text-[7px] text-[#E8E8D8] w-12" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>MOJO</span>
                {isEditingMojo ? (
                  <div className="flex gap-1 flex-wrap">
                    {([-2, -1, 0, 1, 2] as MojoLevel[]).map((level) => (
                      <button
                        key={level}
                        onClick={() => {
                          onMojoChange(level);
                          setIsEditingMojo(false);
                        }}
                        className={`px-2 py-1 text-[8px] font-bold border-2 transition-all ${
                          level === currentMojo
                            ? 'border-[#C4A853] bg-[#C4A853]/30'
                            : 'border-[#E8E8D8]/50 hover:border-[#E8E8D8]'
                        }`}
                        style={{ color: getMojoColor(level) }}
                      >
                        {MOJO_STATES[level].emoji} {MOJO_STATES[level].displayName}
                      </button>
                    ))}
                    <button
                      onClick={() => setIsEditingMojo(false)}
                      className="px-1 text-[#E8E8D8]/70 hover:text-[#E8E8D8]"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <div
                    className="flex items-center gap-1 cursor-pointer hover:bg-[#6B9462] px-1 rounded"
                    onClick={() => setIsEditingMojo(true)}
                  >
                    <span
                      className="text-xs font-bold"
                      style={{ color: getMojoColor(currentMojo), textShadow: '1px 1px 0px rgba(0,0,0,0.5)' }}
                    >
                      {MOJO_STATES[currentMojo].emoji} {MOJO_STATES[currentMojo].displayName}
                    </span>
                    <span className="text-[8px] text-[#E8E8D8]/70">
                      ({MOJO_STATES[currentMojo].statMultiplier.toFixed(2)}x)
                    </span>
                    <span className="text-[8px] text-[#C4A853]">✏️</span>
                  </div>
                )}
              </div>
            )}

            {/* Fitness Row */}
            {currentFitness !== undefined && onFitnessChange && (
              <div className="flex items-center gap-2">
                <span className="text-[7px] text-[#E8E8D8] w-12" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>FITNESS</span>
                {isEditingFitness ? (
                  <div className="flex gap-1 flex-wrap">
                    {(['JUICED', 'FIT', 'WELL', 'STRAINED', 'WEAK', 'HURT'] as FitnessState[]).map((state) => (
                      <button
                        key={state}
                        onClick={() => {
                          onFitnessChange(state);
                          setIsEditingFitness(false);
                        }}
                        className={`px-2 py-1 text-[8px] font-bold border-2 transition-all ${
                          state === currentFitness
                            ? 'border-[#C4A853] bg-[#C4A853]/30'
                            : 'border-[#E8E8D8]/50 hover:border-[#E8E8D8]'
                        }`}
                        style={{ color: FITNESS_STATES[state].color }}
                      >
                        {FITNESS_STATES[state].emoji} {FITNESS_STATES[state].displayName}
                      </button>
                    ))}
                    <button
                      onClick={() => setIsEditingFitness(false)}
                      className="px-1 text-[#E8E8D8]/70 hover:text-[#E8E8D8]"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <div
                    className="flex items-center gap-1 cursor-pointer hover:bg-[#6B9462] px-1 rounded"
                    onClick={() => setIsEditingFitness(true)}
                  >
                    <span
                      className="text-xs font-bold"
                      style={{ color: FITNESS_STATES[currentFitness].color, textShadow: '1px 1px 0px rgba(0,0,0,0.5)' }}
                    >
                      {FITNESS_STATES[currentFitness].emoji} {FITNESS_STATES[currentFitness].displayName}
                    </span>
                    <span className="text-[8px] text-[#E8E8D8]/70">
                      ({FITNESS_STATES[currentFitness].multiplier.toFixed(2)}x)
                    </span>
                    <span className="text-[8px] text-[#C4A853]">✏️</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

interface OutcomeButtonProps {
  label: string;
  color: "blue" | "red" | "purple" | "lightblue" | "magenta";
  isExpanded: boolean;
  onClick: () => void;
  disabled?: boolean; // GAP-GT-6-G / GAP-GT-6-C: button availability enforcement
}

function OutcomeButton({ label, color, isExpanded, onClick, disabled }: OutcomeButtonProps) {
  const colorClasses = {
    blue: "bg-[#3366FF] border-[#1A44BB] text-white hover:bg-[#4477FF]",
    red: "bg-[#DD0000] border-[#AA0000] text-white hover:bg-[#FF0000]",
    purple: "bg-[#7733DD] border-[#5522AA] text-white hover:bg-[#8844EE]",
    lightblue: "bg-[#5599FF] border-[#3366CC] text-white hover:bg-[#66AAFF]",
    magenta: "bg-[#CC44CC] border-[#992299] text-white hover:bg-[#DD55DD]",
  };

  if (disabled) {
    return (
      <button
        disabled
        className="bg-[#333] border-[#444] text-[#555] border-[5px] py-4 text-base cursor-not-allowed shadow-none opacity-50"
        title={`${label} not available in this situation`}
      >
        {label}
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className={`${colorClasses[color]} border-[5px] py-4 text-base active:scale-95 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)] ${isExpanded ? 'border-[#FF0000]' : ''}`}
    >
      {label}
    </button>
  );
}

interface OutcomeDetailPanelProps {
  title: string;
  children: React.ReactNode;
}

function OutcomeDetailPanel({ title, children }: OutcomeDetailPanelProps) {
  return (
    <div className="bg-[#3366FF] border-[4px] border-white p-2 mt-1">
      <div className="text-[8px] text-white font-bold mb-1">{title}</div>
      {children}
    </div>
  );
}

interface DetailButtonProps {
  label: string;
  onClick: () => void;
  isSelected?: boolean;
}

function DetailButton({ label, onClick, isSelected }: DetailButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`${isSelected ? 'bg-[#FFD700] border-[#CC9900] text-black' : 'bg-[#5599FF] border-[#3366CC] text-white hover:bg-[#66AAFF]'} border-[5px] py-4 text-base active:scale-95 transition-transform shadow-[4px_4px_0px_0px_rgba(0,0,0,0.8)]`}
    >
      {label}
    </button>
  );
}
