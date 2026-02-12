import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams, useLocation } from "react-router";
import { Menu, ChevronUp } from "lucide-react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
// REMOVED: BUG-009 - BaserunnerDragDrop was a placeholder that did nothing
// import { BaserunnerDragDrop, type RunnerMoveData as LegacyRunnerMoveData } from "@/app/components/BaserunnerDragDrop";
import { InteractiveField } from "@/app/components/DragDropGameTracker";
import { EnhancedInteractiveField, type PlayData, type SpecialEventData } from "@/app/components/EnhancedInteractiveField";
import { type RunnerMoveData } from "@/app/components/RunnerDragDrop";
import { LineupCard, type SubstitutionData, type LineupPlayer, type BenchPlayer, type BullpenPitcher } from "@/app/components/LineupCard";
import { UndoButton, useUndoSystem, type GameSnapshot } from "@/app/components/UndoSystem";
import { TeamRoster, type Player, type Pitcher } from "@/app/components/TeamRoster";
import { MiniScoreboard } from "@/app/components/MiniScoreboard";
import { getTeamColors, getFielderBorderColors } from "@/config/teamColors";
import { defaultTigersPlayers, defaultTigersPitchers, defaultSoxPlayers, defaultSoxPitchers } from "@/data/defaultRosters";
import { areRivals } from '../../../data/leagueStructure';
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
import type { FameEventType } from "../../../types/game";
// MAJ-02: Wire fan morale to UI
import { useFanMorale, type GameResult as FanMoraleGameResult } from "../hooks/useFanMorale";
// MAJ-04: Wire narrative engine
import { generateGameRecap } from "../engines/narrativeIntegration";
// mWAR: Manager decision tracking
import { useMWARCalculations } from "../hooks/useMWARCalculations";
import type { GameStateForLI } from "../../../engines/leverageCalculator";
import { saveGameDecisions, aggregateManagerGameToSeason } from '../../../utils/managerStorage';
// Fielding pipeline: extract fielding events from PlayData and log to IndexedDB
import { extractFieldingEvents, type FieldingExtractionContext } from '../utils/fieldingEventExtractor';
import { logFieldingEvent } from '../../../utils/eventLog';

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
  } | null;

  // Team IDs - use navigation state or standalone defaults
  const homeTeamId = navigationState?.homeTeamId || 'home';
  const awayTeamId = navigationState?.awayTeamId || 'away';
  const homeTeamName = navigationState?.homeTeamName || 'HOME';
  const awayTeamName = navigationState?.awayTeamName || 'AWAY';
  const stadiumName = navigationState?.stadiumName;
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
    isLoading,
    isSaving,
    setPlayoffContext,
  } = useGameState(gameId);

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
  } | null>(null);

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

  // MAJ-03: Detection system state — pending prompts for user confirmation
  const [pendingDetections, setPendingDetections] = useState<UIDetectionResult[]>([]);

  // Enhanced field toggle - use new FieldCanvas-based interactive field
  const [useEnhancedField, setUseEnhancedField] = useState(true);

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
    } else {
      console.warn("Incomplete snapshot - cannot restore", snapshot);
    }
  }, [restoreState]);

  const undoSystem = useUndoSystem(5, handleUndo);

  // Keep undo system current state in sync with game state
  // CRIT-01 fix: Include playerStats and pitcherStats as serializable entries
  // (Maps don't survive JSON.parse(JSON.stringify(...)) used by UndoSystem deep clone)
  useEffect(() => {
    undoSystem.setCurrentState({
      gameState,
      scoreboard,
      playerStatsEntries: Array.from(playerStats.entries()),
      pitcherStatsEntries: Array.from(pitcherStats.entries()),
      runnerTrackerSnapshot: getRunnerTrackerSnapshot(),
    });
  }, [gameState, scoreboard, playerStats, pitcherStats, getRunnerTrackerSnapshot]);

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

  // Mock roster data - in production this would come from your game state
  const availablePitchers = [
    { name: 'T. JOHNSON', hand: 'R', fitness: '🟢' },
    { name: 'M. WILLIAMS', hand: 'L', fitness: '🟢' },
    { name: 'K. DAVIS', hand: 'R', fitness: '🟡' },
    { name: 'S. RODRIGUEZ', hand: 'L', fitness: '🟢' },
  ];

  const benchPlayers = [
    { name: 'A. TAYLOR', pos: 'C', hand: 'R', avg: '.267' },
    { name: 'B. ANDERSON', pos: 'IF', hand: 'L', avg: '.234' },
    { name: 'C. THOMAS', pos: 'OF', hand: 'R', avg: '.289' },
    { name: 'D. HARRIS', pos: 'IF', hand: 'R', avg: '.251' },
    { name: 'E. CLARK', pos: 'OF', hand: 'L', avg: '.276' },
  ];

  const currentLineup = [
    { name: 'J. MARTINEZ', pos: 'SS', batting: true },
    { name: 'A. SMITH', pos: 'CF', batting: false },
    { name: 'D. JONES', pos: 'LF', batting: false },
    { name: 'B. DAVIS', pos: 'RF', batting: false },
    { name: 'T. BROWN', pos: 'SS', batting: false },
    { name: 'C. WILSON', pos: '2B', batting: false },
    { name: 'M. GARCIA', pos: '3B', batting: false },
    { name: 'J. MARTIN', pos: '1B', batting: false },
    { name: 'R. LOPEZ', pos: 'C', batting: false },
  ];

  // EXH-036: Helper to generate consistent player IDs (must match playerStateHook registration)
  const generatePlayerId = (name: string, team: 'home' | 'away') =>
    `${team}-${name.replace(/\s+/g, '-').toLowerCase()}`;

  // EXH-036: Determine current team batting (for ID generation)
  // When it's top of inning, away team bats; bottom of inning, home team bats
  const battingTeam: 'home' | 'away' = gameState.isTop ? 'away' : 'home';
  const fieldingTeam: 'home' | 'away' = gameState.isTop ? 'home' : 'away';

  // LineupCard data derived from current team data
  // EXH-036: Use consistent IDs that match playerStateHook registration
  const lineupCardData: LineupPlayer[] = currentLineup.map((player, idx) => ({
    id: generatePlayerId(player.name, battingTeam),
    name: player.name,
    position: player.pos,
    battingOrder: idx + 1,
    isCurrentBatter: player.batting,
    battingHand: 'R', // Would come from player data
  }));

  const benchCardData: BenchPlayer[] = benchPlayers.map((player) => ({
    id: generatePlayerId(player.name, battingTeam),
    name: player.name,
    positions: [player.pos],
    battingHand: player.hand as 'L' | 'R' | 'S',
    isUsed: false,
  }));

  const bullpenCardData: BullpenPitcher[] = availablePitchers.map((pitcher) => ({
    id: generatePlayerId(pitcher.name, fieldingTeam),
    name: pitcher.name,
    throwingHand: pitcher.hand as 'L' | 'R',
    fitness: 'FIT' as const,
    isUsed: false,
    isCurrentPitcher: false,
  }));

  const currentPitcherData: BullpenPitcher = {
    id: generatePlayerId('R. LOPEZ', fieldingTeam),
    name: 'R. LOPEZ',
    throwingHand: 'R',
    fitness: 'FIT',
    isCurrentPitcher: true,
  };

  // Roster data - use navigation state if available, otherwise use defaults with some at-bats
  // Use useState so we can update the roster when substitutions are made
  const [awayTeamPlayers, setAwayTeamPlayers] = useState<Player[]>(navigationState?.awayPlayers || [
    { name: 'J. MARTINEZ', position: 'SS', battingOrder: 1, stats: { ab: 2, h: 0, r: 0, rbi: 0, bb: 0, k: 1 }, battingHand: 'R' as const },
    { name: 'A. SMITH', position: 'CF', battingOrder: 2, stats: { ab: 2, h: 1, r: 1, rbi: 0, bb: 0, k: 0 }, battingHand: 'L' as const },
    { name: 'D. JONES', position: 'LF', battingOrder: 3, stats: { ab: 2, h: 1, r: 0, rbi: 1, bb: 0, k: 0 }, battingHand: 'R' as const },
    { name: 'B. DAVIS', position: 'RF', battingOrder: 4, stats: { ab: 2, h: 0, r: 0, rbi: 0, bb: 0, k: 2 }, battingHand: 'R' as const },
    { name: 'T. BROWN', position: '1B', battingOrder: 5, stats: { ab: 2, h: 1, r: 1, rbi: 0, bb: 0, k: 0 }, battingHand: 'L' as const },
    { name: 'C. WILSON', position: '2B', battingOrder: 6, stats: { ab: 2, h: 0, r: 0, rbi: 1, bb: 0, k: 1 }, battingHand: 'R' as const },
    { name: 'M. GARCIA', position: '3B', battingOrder: 7, stats: { ab: 1, h: 0, r: 0, rbi: 0, bb: 1, k: 0 }, battingHand: 'S' as const },
    { name: 'J. MARTIN', position: 'C', battingOrder: 8, stats: { ab: 2, h: 1, r: 0, rbi: 1, bb: 0, k: 0 }, battingHand: 'R' as const },
    { name: 'R. LOPEZ', position: 'P', battingOrder: 9, stats: { ab: 1, h: 0, r: 0, rbi: 0, bb: 0, k: 1 }, battingHand: 'R' as const },
    // Bench players
    { name: 'A. TAYLOR', position: 'C', stats: { ab: 0, h: 0, r: 0, rbi: 0, bb: 0, k: 0 }, battingHand: 'R' as const },
    { name: 'B. ANDERSON', position: 'IF', stats: { ab: 0, h: 0, r: 0, rbi: 0, bb: 0, k: 0 }, battingHand: 'L' as const },
    { name: 'C. THOMAS', position: 'OF', stats: { ab: 0, h: 0, r: 0, rbi: 0, bb: 0, k: 0 }, battingHand: 'R' as const },
  ]);

  const awayTeamPitchers = navigationState?.awayPitchers || [
    { name: 'R. LOPEZ', stats: { ip: '4.2', h: 4, r: 4, er: 4, bb: 2, k: 3, pitches: 67 }, throwingHand: 'R' as const, isStarter: true, isActive: true },
    { name: 'T. JOHNSON', stats: { ip: '0.0', h: 0, r: 0, er: 0, bb: 0, k: 0, pitches: 0 }, throwingHand: 'R' as const },
    { name: 'M. WILLIAMS', stats: { ip: '0.0', h: 0, r: 0, er: 0, bb: 0, k: 0, pitches: 0 }, throwingHand: 'L' as const },
    { name: 'K. DAVIS', stats: { ip: '0.0', h: 0, r: 0, er: 0, bb: 0, k: 0, pitches: 0 }, throwingHand: 'R' as const },
  ];

  // Mock roster data for Home Team (Sox)
  // Use useState so we can update the roster when substitutions are made
  const [homeTeamPlayers, setHomeTeamPlayers] = useState<Player[]>(navigationState?.homePlayers || [
    { name: 'P. HERNANDEZ', position: 'CF', battingOrder: 1, stats: { ab: 2, h: 1, r: 1, rbi: 0, bb: 0, k: 0 }, battingHand: 'L' as const },
    { name: 'K. WASHINGTON', position: 'SS', battingOrder: 2, stats: { ab: 2, h: 1, r: 1, rbi: 1, bb: 0, k: 0 }, battingHand: 'R' as const },
    { name: 'L. RODRIGUEZ', position: 'LF', battingOrder: 3, stats: { ab: 2, h: 1, r: 1, rbi: 2, bb: 0, k: 1 }, battingHand: 'L' as const },
    { name: 'M. JACKSON', position: 'RF', battingOrder: 4, stats: { ab: 2, h: 0, r: 0, rbi: 0, bb: 0, k: 1 }, battingHand: 'R' as const },
    { name: 'N. MARTINEZ', position: '1B', battingOrder: 5, stats: { ab: 2, h: 1, r: 0, rbi: 1, bb: 0, k: 0 }, battingHand: 'R' as const },
    { name: 'O. THOMPSON', position: '3B', battingOrder: 6, stats: { ab: 1, h: 0, r: 0, rbi: 0, bb: 1, k: 0 }, battingHand: 'S' as const },
    { name: 'Q. GONZALEZ', position: '2B', battingOrder: 7, stats: { ab: 2, h: 0, r: 0, rbi: 0, bb: 0, k: 2 }, battingHand: 'R' as const },
    { name: 'R. ADAMS', position: 'C', battingOrder: 8, stats: { ab: 2, h: 0, r: 1, rbi: 0, bb: 0, k: 1 }, battingHand: 'R' as const },
    { name: 'S. WHITE', position: 'P', battingOrder: 9, stats: { ab: 1, h: 0, r: 0, rbi: 0, bb: 0, k: 1 }, battingHand: 'R' as const },
    // Bench players
    { name: 'E. CLARK', position: 'OF', stats: { ab: 0, h: 0, r: 0, rbi: 0, bb: 0, k: 0 }, battingHand: 'L' as const },
    { name: 'F. MILLER', position: 'IF', stats: { ab: 0, h: 0, r: 0, rbi: 0, bb: 0, k: 0 }, battingHand: 'R' as const },
    { name: 'G. EVANS', position: 'C', stats: { ab: 0, h: 0, r: 0, rbi: 0, bb: 0, k: 0 }, battingHand: 'R' as const },
  ]);

  const homeTeamPitchers = navigationState?.homePitchers || [
    { name: 'S. WHITE', stats: { ip: '5.0', h: 3, r: 3, er: 3, bb: 1, k: 4, pitches: 72 }, throwingHand: 'R' as const, isStarter: true, isActive: true },
    { name: 'U. PARKER', stats: { ip: '0.0', h: 0, r: 0, er: 0, bb: 0, k: 0, pitches: 0 }, throwingHand: 'L' as const },
    { name: 'V. TURNER', stats: { ip: '0.0', h: 0, r: 0, er: 0, bb: 0, k: 0, pitches: 0 }, throwingHand: 'R' as const },
    { name: 'W. COLLINS', stats: { ip: '0.0', h: 0, r: 0, er: 0, bb: 0, k: 0, pitches: 0 }, throwingHand: 'R' as const },
  ];

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
  const [gameInitialized, setGameInitialized] = useState(false);
  useEffect(() => {
    if (gameInitialized) return;

    const initializeOrLoadGame = async () => {
      // Try to load existing game first (handles page refresh)
      const hasExistingGame = await loadExistingGame();

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

      console.log('[GameTracker] Initializing game with lineups:', {
        away: awayLineup.map(p => p.playerName),
        home: homeLineup.map(p => p.playerName),
      });

      await initializeGame({
        gameId: gameId || `game-${Date.now()}`,
        seasonId: 'season-2024',
        awayTeamId: awayTeamId,
        awayTeamName: 'Tigers',
        homeTeamId: homeTeamId,
        homeTeamName: 'Sox',
        awayLineup,
        homeLineup,
        awayStartingPitcherId: `away-${awayPitcher?.name.replace(/\s+/g, '-').toLowerCase() || 'pitcher'}`,
        awayStartingPitcherName: awayPitcher?.name || 'Pitcher',
        homeStartingPitcherId: `home-${homePitcher?.name.replace(/\s+/g, '-').toLowerCase() || 'pitcher'}`,
        homeStartingPitcherName: homePitcher?.name || 'Pitcher',
      });

      setGameInitialized(true);
    };

    initializeOrLoadGame();
  }, [gameInitialized, awayTeamPlayers, homeTeamPlayers, awayPitcher, homePitcher, awayTeamId, homeTeamId, gameId, initializeGame, loadExistingGame]);

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
      makeSubstitution(sub.incomingPlayerId, sub.outgoingPlayerId, sub.incomingPlayerName, sub.outgoingPlayerName, {
        subType: sub.type === 'double_switch' ? 'double_switch' : 'player_sub',
        newPosition: sub.newPosition,
      });

      // mWAR: Infer decision type — pinch hitter if outgoing is current batter, otherwise defensive sub
      try {
        const gsLI = buildGameStateForLI();
        const isPinchHitter = sub.outgoingPlayerId === gameState?.currentBatterId;
        const decisionType = isPinchHitter ? 'pinch_hitter' : 'defensive_sub';
        const decisionId = mwarHook.recordDecision(decisionType as any, gsLI, [sub.incomingPlayerId, sub.outgoingPlayerId], `${isPinchHitter ? 'PH' : 'Def sub'}: ${sub.incomingPlayerName} for ${sub.outgoingPlayerName}`);
        if (isPinchHitter) {
          // Resolve pinch hitter after next AB
          setPendingMWARDecisions(prev => new Map(prev).set(decisionId, { decisionId, decisionType: 'pinch_hitter', involvedPlayers: [sub.incomingPlayerId], resolveAfterNextPlay: true }));
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
  }, [changePitcher, makeSubstitution, switchPositions, awayTeamPlayers, homeTeamPlayers]);

  const handlePlayComplete = (playData: any) => {
    console.log("Play complete:", playData);
    // Update game state based on play data
    // This would update bases, outs, scores, etc.
  };

  // Enhanced play handler for the new drag-drop field
  const handleEnhancedPlayComplete = useCallback(async (playData: PlayData) => {
    console.log("Enhanced play complete:", playData);
    console.log("Runner outcomes:", playData.runnerOutcomes);

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

      // If there are runners out, show the fielder credit modal
      if (runnersOut.length > 0) {
        console.log('[EXH-016] Runners out - prompting for fielder credit:', runnersOut);
        setRunnersOutForCredit(runnersOut);
        setPendingPlayForFielderCredit(playData);
        setFielderCreditModalOpen(true);
        return; // Exit early - will continue in handleFielderCreditConfirm
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
      if (extraAdvances.length > 0) {
        console.log('[EXH-025] Extra advances detected - will prompt for error attribution after play:', extraAdvances);
        setRunnersWithExtraAdvance(extraAdvances);
        setPendingPlayForErrorOnAdvance(playData);
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
      // STEP 4: Record the play type (hit/out/etc)
      // CRITICAL: Pass runnerAdvancement so recordHit/recordOut properly updates bases!
      // ============================================
      if (playData.type === 'hr') {
        const rbi = calculateRBIFromOutcomes();
        await recordHit('HR', rbi, runnerAdvancement);
        console.log(`HR recorded: ${playData.hrDistance}ft, type: ${playData.hrType}, sector: ${playData.spraySector}, RBI: ${rbi}`);
      } else if (playData.type === 'hit') {
        const hitType = playData.hitType || '1B';
        const rbi = calculateRBIFromOutcomes();
        await recordHit(hitType as HitType, rbi, runnerAdvancement);
        console.log(`Hit recorded: ${hitType}, sector: ${playData.spraySector}, sequence: ${playData.fieldingSequence.join('-')}, RBI: ${rbi}`);
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
        } else if (outType === 'K' || outType === 'KL') {
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
          } else {
            // Normal strikeout
            await recordOut(outType as OutType, runnerAdvancement);
            console.log(`Strikeout recorded: ${outType}`);
          }
        } else {
          // Normal out (non-strikeout)
          await recordOut(outType as OutType, runnerAdvancement);
          console.log(`Out recorded: ${outType}, sequence: ${playData.fieldingSequence.join('-')}, sector: ${playData.spraySector}`);
        }
      } else if (playData.type === 'foul_out') {
        await recordOut('FO', runnerAdvancement);
        console.log(`Foul out recorded: ${playData.foulType}, fielder: ${playData.fieldingSequence[0]}`);
      } else if (playData.type === 'foul_ball') {
        await advanceCount('strike');
        console.log(`Foul ball (strike) recorded`);
      } else if (playData.type === 'walk') {
        // FIX: BUG-001/002/003 - Walks now properly route to recordWalk()
        // This correctly tracks PA without AB or H
        const walkType = playData.walkType || 'BB';
        await recordWalk(walkType as WalkType);
        console.log(`Walk recorded: ${walkType}`);
      } else if (playData.type === 'error') {
        // ROE (Reached On Error) - batter reaches base, no out, AB counted, no hit
        const rbi = calculateRBIFromOutcomes();
        await recordError(rbi, runnerAdvancement);
        console.log(`Error recorded: ${playData.errorType} error by fielder #${playData.errorFielder}, RBI: ${rbi}`);
      }

      // Note: Runner outcomes are now handled by runnerAdvancement parameter
      // No need to call applyRunnerOutcomes() separately

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
      // } else if (playData.type === 'out' && (playData.outType === 'K' || playData.outType === 'KL')) {
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
              const isK = playData.type === 'out' && (playData.outType === 'K' || playData.outType === 'KL');
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
      // ============================================
      if (runnersWithExtraAdvance.length > 0) {
        console.log('[EXH-025] Opening error attribution modal after play recorded');
        setErrorOnAdvanceModalOpen(true);
      }

    } catch (error) {
      console.error('Failed to record enhanced play:', error);
    }
  }, [recordHit, recordOut, recordWalk, recordError, advanceCount, gameState, undoSystem, playerStats, pitcherStats, fameTrackingHook, playerStateHook, runnerNames, buildGameStateForLI, mwarHook, pendingMWARDecisions]);

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
        } else if (outType === 'K' || outType === 'KL') {
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
          }
        } catch (err) {
          console.error('[Fielding] Failed to log fielding events:', err);
        }
      }

      console.log('[EXH-016] Play recorded with fielder credits');
    } catch (error) {
      console.error('[EXH-016] Failed to record play:', error);
    }
  }, [pendingPlayForFielderCredit, gameState, undoSystem, recordHit, recordOut, recordD3K, recordWalk]);

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
    makeSubstitution(benchPlayerId, lineupPlayerId, benchPlayerName, lineupPlayerName, {
      subType: 'player_sub',
    });

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
      } else if (pendingOutcome.type === 'out') {
        await recordOut(pendingOutcome.subType as OutType);
      } else if (pendingOutcome.type === 'walk') {
        await recordWalk(pendingOutcome.subType as WalkType);
      }

      // Clear pending outcome and close panels
      setPendingOutcome(null);
      setExpandedOutcome(null);
    } catch (error) {
      console.error('Failed to record outcome:', error);
    }
  }, [pendingOutcome, recordHit, recordOut, recordWalk]);

  // Cancel pending outcome
  const handleCancelOutcome = useCallback(() => {
    setPendingOutcome(null);
    setExpandedOutcome(null);
  }, []);

  // Handle end of inning
  const handleEndInning = useCallback(() => {
    endInning();
    // Clear runner names when inning ends (bases are cleared)
    setRunnerNames({});
  }, [endInning]);

  // Handle end game with navigation
  const handleEndGame = useCallback(async () => {
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
      }
    } catch (mwarError) {
      console.warn('[mWAR] Persistence error (non-blocking):', mwarError);
    }

    await hookEndGame();
    // Pass game mode and narratives so PostGameSummary can display them
    navigate(`/post-game/${gameId}`, {
      state: {
        gameMode: navigationState?.gameMode || 'franchise',
        franchiseId: navigationState?.franchiseId || gameId?.replace('franchise-', '') || '1',
        gameNarrative,
        awayNarrative,
      }
    });
  }, [hookEndGame, navigate, gameId, navigationState?.gameMode, gameMode, gameState, pitcherStats, fameTrackingHook, homeFanMorale, awayFanMorale, homeTeamName, awayTeamName, mwarHook, homeManagerId, homeTeamId]);

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

      <div className="min-h-screen bg-[#6B9462] text-white overflow-y-auto">
        {/* Scoreboard - toggleable between full and mini */}
        {isScoreboardMinimized ? (
          <MiniScoreboard
            awayTeamName={awayTeamName.toUpperCase()}
            homeTeamName={homeTeamName.toUpperCase()}
            awayRuns={scoreboard.away.runs}
            homeRuns={scoreboard.home.runs}
            inning={gameState.inning}
            isTop={gameState.isTop}
            outs={gameState.outs}
            onExpand={() => setIsScoreboardMinimized(false)}
          />
        ) : (
        /* Game header with scoreboard - compact sticky header */
        <div className="bg-[#6B9462] border-b-[4px] border-[#3d5240] px-4 py-2 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto">
            {/* Scoreboard row */}
            <div className="relative flex items-center justify-between bg-[rgb(133,181,229)] border-[4px] border-[#1a3020] p-2">
              {/* Mini button - absolute positioned top-right */}
              <button
                onClick={() => setIsScoreboardMinimized(true)}
                className="absolute top-1 right-1 flex items-center gap-1 px-2 py-0.5 bg-[#3d5240] border-2 border-[#2a3a2d] hover:bg-[#4a6a4a] transition-colors z-10"
                title="Minimize Scoreboard"
              >
                <ChevronUp className="w-3 h-3 text-[#E8E8D8]" />
                <span className="text-[#E8E8D8] text-[8px] font-bold">MINI</span>
              </button>

              {/* Super Mega Baseball Logo */}
              <div className="flex items-center gap-2">
                <div className="bg-white border-[4px] border-[#0066FF] px-[10px] py-[4px] shadow-[3px_3px_0px_0px_#DD0000]">
                  <div className="text-[10px] text-[#DD0000] tracking-wide leading-tight">SUPER MEGA</div>
                  <div className="text-xs text-[#0066FF] tracking-wide leading-tight">BASEBALL</div>
                </div>
              </div>

              {/* Fenway-style scoreboard in the middle - compact for more field visibility */}
              <div className="mx-2">
                <div className="bg-[#556B55] border-[3px] border-[#3d5240] p-1.5 shadow-[3px_3px_0px_0px_rgba(0,0,0,0.5)]">
                  {/* Stadium name header */}
                  <div className="text-center text-[#E8E8D8] text-xs font-bold tracking-[0.3em] mb-1">
                    {stadiumName || getTeamColors(homeTeamId).stadium || 'BALLPARK'}
                  </div>
                  
                  {/* Scoreboard grid */}
                  <div className="grid gap-[1px] mb-2" style={{ gridTemplateColumns: '26px 110px repeat(9, 22px) 22px 6px 26px 26px 26px 6px 48px 8px auto' }}>
                    {/* Header row */}
                    <div className="text-[#E8E8D8] text-[9px] font-bold">P</div>
                    <div></div>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(inning => (
                      <div key={inning} className="text-[#E8E8D8] text-[9px] font-bold text-center">{inning}</div>
                    ))}
                    <div className="text-[#E8E8D8] text-[9px] font-bold text-center">10</div>
                    <div></div>
                    <div className="text-[#E8E8D8] text-[9px] font-bold text-center">R</div>
                    <div className="text-[#E8E8D8] text-[9px] font-bold text-center">H</div>
                    <div className="text-[#E8E8D8] text-[9px] font-bold text-center">E</div>
                    <div></div>
                    <div className="text-[#E8E8D8] text-[9px] font-bold text-center">REC</div>
                    <div></div>
                    <div></div>
                    
                    {/* Away team row */}
                    {/* P column: shows pitcher position number (1) - jersey numbers not yet in data model */}
                    <div className="bg-[#3d5240] border-2 border-[#2a3a2d] min-h-[20px] flex items-center justify-center">
                      <span className="text-[#E8E8D8] text-xs font-bold">1</span>
                    </div>
                    <div
                      className="text-[#E8E8D8] font-bold flex items-center pl-1 overflow-hidden whitespace-nowrap text-ellipsis"
                      style={{
                        textShadow: '1px 1px 0px rgba(0,0,0,0.7)',
                        fontSize: awayTeamName.length > 12 ? '8px' : awayTeamName.length > 9 ? '9px' : awayTeamName.length > 6 ? '10px' : '11px',
                      }}
                    >{awayTeamName.toUpperCase()}</div>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(inning => {
                      const awayScore = scoreboard.innings[inning - 1]?.away;
                      const isCurrentInning = gameState.inning === inning && gameState.isTop;
                      return (
                        <div key={inning} className={`bg-[#3d5240] border-2 border-[#2a3a2d] ${isCurrentInning ? 'text-[#FFD700]' : 'text-[#E8E8D8]'} text-xs font-bold min-h-[20px] flex items-center justify-center`}>
                          {awayScore !== undefined ? awayScore : ''}
                        </div>
                      );
                    })}
                    <div className="bg-[#3d5240] border-2 border-[#2a3a2d] min-h-[20px]"></div>
                    <div></div>
                    <div className="bg-[#3d5240] border-2 border-[#2a3a2d] text-[#E8E8D8] text-xs font-bold flex items-center justify-center">{scoreboard.away.runs}</div>
                    <div className="bg-[#3d5240] border-2 border-[#2a3a2d] text-[#E8E8D8] text-xs font-bold flex items-center justify-center">{scoreboard.away.hits}</div>
                    <div className="bg-[#3d5240] border-2 border-[#2a3a2d] text-[#E8E8D8] text-xs font-bold flex items-center justify-center">{scoreboard.away.errors}</div>
                    <div></div>
                    <div className="bg-[#3d5240] border-2 border-[#2a3a2d] text-[#E8E8D8] text-[9px] font-bold flex items-center justify-center">{awayRecord}</div>
                    <div></div>
                    <div className="row-span-2 flex items-center gap-3 px-[15px] py-[0px]">
                      {/* Concessions Section */}
                      <div className="flex flex-col items-start justify-center">
                        <div className="text-[#C4A853] text-[8px] font-bold tracking-wider mb-0.5" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.8)' }}>CONCESSIONS</div>
                        <div className="text-[#E8E8D8] text-[9px] leading-tight" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.8)' }}>HOT DOG • 10¢</div>
                        <div className="text-[#E8E8D8] text-[9px] leading-tight" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.8)' }}>PEANUTS • 5¢</div>
                        <div className="text-[#E8E8D8] text-[9px] leading-tight" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.8)' }}>CRACKER JACK • 15¢</div>
                      </div>
                      
                      {/* Kruse Cola Ad */}
                      <div className="border-2 border-[#E8E8D8] px-3 py-2">
                        <div className="text-[#E8E8D8] text-[10px] font-bold tracking-wider text-center" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.8)' }}>KRUSE COLA</div>
                        <div className="text-[#C4A853] text-[7px] font-bold text-center mt-0.5" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.8)' }}>ICE COLD • 5¢</div>
                      </div>
                    </div>
                    
                    {/* Home team row */}
                    {/* P column: shows pitcher position number (1) - jersey numbers not yet in data model */}
                    <div className="bg-[#3d5240] border-2 border-[#2a3a2d] min-h-[20px] flex items-center justify-center">
                      <span className="text-[#E8E8D8] text-xs font-bold">1</span>
                    </div>
                    <div
                      className="text-[#E8E8D8] font-bold flex items-center pl-1 overflow-hidden whitespace-nowrap text-ellipsis"
                      style={{
                        textShadow: '1px 1px 0px rgba(0,0,0,0.7)',
                        fontSize: homeTeamName.length > 12 ? '8px' : homeTeamName.length > 9 ? '9px' : homeTeamName.length > 6 ? '10px' : '11px',
                      }}
                    >{homeTeamName.toUpperCase()}</div>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(inning => {
                      const homeScore = scoreboard.innings[inning - 1]?.home;
                      const isCurrentInning = gameState.inning === inning && !gameState.isTop;
                      return (
                        <div key={inning} className={`bg-[#3d5240] border-2 border-[#2a3a2d] ${isCurrentInning ? 'text-[#FFD700]' : 'text-[#E8E8D8]'} text-xs font-bold min-h-[20px] flex items-center justify-center`}>
                          {homeScore !== undefined ? homeScore : ''}
                        </div>
                      );
                    })}
                    <div className="bg-[#3d5240] border-2 border-[#2a3a2d] min-h-[20px]"></div>
                    <div></div>
                    <div className="bg-[#3d5240] border-2 border-[#2a3a2d] text-[#E8E8D8] text-xs font-bold flex items-center justify-center">{scoreboard.home.runs}</div>
                    <div className="bg-[#3d5240] border-2 border-[#2a3a2d] text-[#E8E8D8] text-xs font-bold flex items-center justify-center">{scoreboard.home.hits}</div>
                    <div className="bg-[#3d5240] border-2 border-[#2a3a2d] text-[#E8E8D8] text-xs font-bold flex items-center justify-center">{scoreboard.home.errors}</div>
                    <div></div>
                    <div className="bg-[#3d5240] border-2 border-[#2a3a2d] text-[#E8E8D8] text-[9px] font-bold flex items-center justify-center">{homeRecord}</div>
                    <div></div>
                  </div>
                  
                  {/* Bottom indicator row */}
                  <div className="border-t-2 border-[#E8E8D8] pt-2 flex items-center gap-3 text-[#E8E8D8]">
                    {/* AT BAT */}
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold tracking-wide" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.7)' }}>AT BAT</span>
                      <span className="text-[#E8E8D8] text-lg">—</span>
                      <div className="flex gap-0.5">
                        {atBatDigit1 && (
                          <div className="bg-[#1a1a1a] border-2 border-[#2a3a2d] px-1.5 py-1 min-w-[20px]">
                            <span className="text-[#E8E8D8] text-sm font-bold">{atBatDigit1}</span>
                          </div>
                        )}
                        <div className="bg-[#1a1a1a] border-2 border-[#2a3a2d] px-1.5 py-1 min-w-[20px]">
                          <span className="text-[#E8E8D8] text-sm font-bold">{atBatDigit2}</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* BALL */}
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold tracking-wide" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.7)' }}>BALL</span>
                      <span className="text-[#E8E8D8] text-lg">—</span>
                      <div className="flex gap-1.5">
                        {[0, 1, 2].map((i) => (
                          <div
                            key={i}
                            className="w-6 h-6 rounded-full border-2 bg-[#1a1a1a] border-[#2a3a2d]"
                          />
                        ))}
                      </div>
                    </div>
                    
                    {/* STRIKE */}
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold tracking-wide" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.7)' }}>STRIKE</span>
                      <span className="text-[#E8E8D8] text-lg">—</span>
                      <div className="flex gap-1.5">
                        {[0, 1, 2].map((i) => (
                          <div
                            key={i}
                            className="w-6 h-6 rounded-full border-2 bg-[#1a1a1a] border-[#2a3a2d]"
                          />
                        ))}
                      </div>
                    </div>
                    
                    {/* OUT */}
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold tracking-wide" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.7)' }}>OUT</span>
                      <span className="text-[#E8E8D8] text-lg">—</span>
                      <div className="flex gap-1.5">
                        {[0, 1, 2].map((i) => (
                          <div
                            key={i}
                            className={`w-6 h-6 rounded-full border-2 ${
                              i < gameState.outs
                                ? 'bg-[#DC3545] border-[#2a3a2d] shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)]'
                                : 'bg-[#1a1a1a] border-[#2a3a2d]'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                    
                    {/* Home indicator */}
                    <div className="flex items-center gap-1.5 ml-2">
                      <span className="text-[10px] font-bold">(H)</span>
                      <div className={`w-6 h-6 rounded-full border-2 ${
                        !gameState.isTop
                          ? 'bg-[#4CAF50] border-[#2a3a2d] shadow-[inset_0_2px_4px_rgba(0,0,0,0.3)]'
                          : 'bg-[#1a1a1a] border-[#2a3a2d]'
                      }`} />
                    </div>
                    
                    {/* Error indicator */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold">—</span>
                      <span className="text-[10px] font-bold">(E)</span>
                      <div className="bg-[#1a1a1a] border-2 border-[#2a3a2d] px-2 py-1 min-w-[24px] text-center">
                      </div>
                    </div>
                  </div>
                  
                  {/* Game info below scoreboard */}
                  <div className="mt-2 flex justify-between items-center text-[7px] text-[#E8E8D8]">
                    <span>{gameStartTime.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase()}</span>
                    <span>TIME: {Math.floor(elapsedMinutes / 60)}:{(elapsedMinutes % 60).toString().padStart(2, '0')}</span>
                  </div>
                </div>
              </div>

              {/* Menu button */}
              <button className="p-2 hover:bg-[#3d6444] border-2 border-[#C4A853] bg-[#1a3020] transition-colors">
                <Menu className="w-5 h-5 text-[#C4A853]" />
              </button>
            </div>{/* Close flex items-center justify-between */}
          </div>{/* Close max-w-7xl mx-auto */}
        </div>
        )}

        {/* Field Section - FULL WIDTH, PRIMARY ELEMENT */}
        <div className="bg-[#6B9462]">
          {/* Field controls - floating over field */}
          <div className="absolute top-4 left-4 z-30 flex gap-2">
            <undoSystem.UndoButtonComponent />
            <button
              onClick={() => setUseEnhancedField(!useEnhancedField)}
              className={`text-[8px] px-2 py-0.5 border-2 font-bold transition-colors ${
                useEnhancedField
                  ? 'bg-[#4CAF50] border-white text-white'
                  : 'bg-[#666] border-[#999] text-[#ccc]'
              }`}
            >
              {useEnhancedField ? 'ENHANCED FIELD ✓' : 'LEGACY FIELD'}
            </button>
          </div>

          {useEnhancedField ? (
            /* Enhanced Interactive Field - FULL VIEWPORT, field spans entire screen
               Stands should extend to edges of viewport
               Height adjusts based on scoreboard state: mini (52px) vs full (240px) */
            <div className="bg-[#6B9462] relative w-full" style={{ height: isScoreboardMinimized ? 'calc(100vh - 52px)' : 'calc(100vh - 200px)', minHeight: '400px' }}>
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
                />
              </div>
            ) : (
            <div className="bg-[#6B9462] relative" style={{ aspectRatio: "4/3" }}>
              {/* Baseball diamond - Legacy SVG */}
              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 300" preserveAspectRatio="none">
                {/* Outfield grass - darker chalky green */}
                <rect x="0" y="0" width="400" height="300" fill="#6B9462" opacity="0.8" />
                
                {/* Warning track / stands area beyond fence - darker chalky brown */}
                <path
                  d="M 0 0 L 0 60 L 100 28 L 150 18 L 250 18 L 300 28 L 400 60 L 400 0 Z"
                  fill="#3d5240"
                  opacity="0.7"
                />
                
                {/* Infield dirt - darker chalky tan/brown */}
                <path
                  d="M 200 237 L 267 178 L 200 119 L 133 178 Z"
                  fill="#B8935F"
                  stroke="#E8E8D8"
                  strokeWidth="2"
                  opacity="0.8"
                />
                
                {/* Foul lines - chalky white */}
                <line x1="200" y1="237" x2="0" y2="60" stroke="#E8E8D8" strokeWidth="3" opacity="0.8" />
                <line x1="200" y1="237" x2="400" y2="60" stroke="#E8E8D8" strokeWidth="3" opacity="0.8" />
                
                {/* Outfield fence - bright gold chalk */}
                {/* Left field line (left foul pole to left-center gap) */}
                <line
                  x1="0" y1="60"
                  x2="100" y2="28"
                  stroke="#E8C547"
                  strokeWidth="4"
                  opacity="1.0"
                />
                {/* Left-center line (left-center gap to deep left-center) */}
                <line
                  x1="100" y1="28"
                  x2="150" y2="18"
                  stroke="#E8C547"
                  strokeWidth="4"
                  opacity="1.0"
                />
                {/* Center field wall (deep left-center to deep right-center) - deepest part */}
                <line
                  x1="150" y1="18"
                  x2="250" y2="18"
                  stroke="#E8C547"
                  strokeWidth="4"
                  opacity="1.0"
                />
                {/* Right-center line (deep right-center to right-center gap) */}
                <line
                  x1="250" y1="18"
                  x2="300" y2="28"
                  stroke="#E8C547"
                  strokeWidth="4"
                  opacity="1.0"
                />
                {/* Right field line (right-center gap to right foul pole) */}
                <line
                  x1="300" y1="28"
                  x2="400" y2="60"
                  stroke="#E8C547"
                  strokeWidth="4"
                  opacity="1.0"
                />
                
                {/* Rounded connection points at fence corners */}
                <circle cx="100" cy="28" r="1.9" fill="#E8C547" opacity="1.0" />
                <circle cx="150" cy="18" r="1.9" fill="#E8C547" opacity="1.0" />
                <circle cx="250" cy="18" r="1.9" fill="#E8C547" opacity="1.0" />
                <circle cx="300" cy="28" r="1.9" fill="#E8C547" opacity="1.0" />
                
                {/* Bases - chalky white */}
                <rect x="195" y="232" width="10" height="10" fill="#E8E8D8" transform="rotate(45 200 237)" opacity="0.9" />
                <rect x="262" y="173" width="8" height="8" fill="#E8E8D8" transform="rotate(45 267 178)" opacity="0.9" />
                <rect x="195" y="114" width="8" height="8" fill="#E8E8D8" transform="rotate(45 200 119)" opacity="0.9" />
                <rect x="128" y="173" width="8" height="8" fill="#E8E8D8" transform="rotate(45 133 178)" opacity="0.9" />
                
                {/* Pitcher's mound - darker chalky brown */}
                <circle cx="200" cy="178" r="10" fill="#8B6F47" stroke="#E8E8D8" strokeWidth="2" opacity="0.7" />
                <circle cx="200" cy="178" r="5" fill="#B8935F" opacity="0.8" />
                
                {/* Pitcher's rubber - chalky white */}
                <rect x="194" y="177" width="12" height="2" fill="#E8E8D8" opacity="0.9" />
              </svg>

              {/* Interactive Field with Drag & Drop */}
              <div id="interactive-field-container" className="absolute inset-0" style={{ zIndex: 45 }}>
                <InteractiveField
                  gameSituation={{
                    outs: gameState.outs,
                    bases: gameState.bases,
                    inning: gameState.inning,
                    isTop: gameState.isTop,
                  }}
                  fieldPositions={fieldPositions}
                  onPlayComplete={handlePlayComplete}
                  fielderBorderColors={[fielderColor1, fielderColor2]}
                />
              </div>

              {/* REMOVED: BUG-009 - BaserunnerDragDrop was a placeholder that returned null
                  Runner drag-drop is handled by EnhancedInteractiveField using RunnerDragDrop component
              */}
            </div>
            )}
          </div>

          {/* Content below field - scrollable */}
          <div className="p-4 space-y-4">
          {/* Player info boxes - reorganized */}
          <div className="grid grid-cols-3 gap-3">
            {/* Current Batter - clickable - shows LIVE data from gameState */}
            <button
              onClick={() => setSelectedPlayer({ name: gameState.currentBatterName || 'Unknown', type: 'batter', playerId: gameState.currentBatterId })}
              className="bg-[#4A6A42] border-[4px] border-[#E8E8D8] p-2 text-left hover:scale-105 transition-transform cursor-pointer shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)] relative"
            >
              <div className="absolute top-1 right-2 text-[7px] text-[#E8E8D8] font-bold" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>
                {gameState.isTop ? awayTeamName.toUpperCase() : homeTeamName.toUpperCase()}
              </div>
              <div className="text-[7px] text-[#E8E8D8]" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>▶ AT BAT</div>
              <div className="text-xs text-[#E8E8D8] font-bold" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>{currentBatterDisplayName}</div>
              <div className="text-[7px] text-[#E8E8D8]" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>{batterFieldingPosition} • {batterGrade} | {batterHits}-{batterAB}</div>
            </button>

            {/* Score/Inning Display - Shrunken version */}
            <div className="bg-[#556B55] border-[4px] border-[#E8E8D8] p-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)]">
              <div className="flex items-center justify-center gap-4 text-[8px]">
                <div className="text-center">
                  <div className="font-bold text-sm text-[#E8E8D8]" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>
                    {awayTeamName.toUpperCase()}
                  </div>
                  <div className="text-base text-[#E8E8D8] font-bold mt-1" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>{gameState.awayScore}</div>
                </div>

                <div className="text-center px-4">
                  <div className="text-[#E8E8D8] text-sm font-bold mb-1" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>{gameState.isTop ? "▲" : "▼"} {gameState.inning}</div>
                  <div className="flex gap-1 justify-center items-center">
                    <div className="text-[#E8E8D8] text-[8px]" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>OUTS</div>
                    <div className="flex gap-[2px]">
                      <div className={`w-2 h-2 rounded-full ${gameState.outs >= 1 ? 'bg-[#E8E8D8]' : 'bg-black'}`} />
                      <div className={`w-2 h-2 rounded-full ${gameState.outs >= 2 ? 'bg-[#E8E8D8]' : 'bg-black'}`} />
                      <div className={`w-2 h-2 rounded-full ${gameState.outs >= 3 ? 'bg-[#E8E8D8]' : 'bg-black'}`} />
                    </div>
                  </div>
                </div>

                <div className="text-center">
                  <div className="font-bold text-sm text-[#E8E8D8]" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>
                    {homeTeamName.toUpperCase()}
                  </div>
                  <div className="text-base text-[#E8E8D8] font-bold mt-1" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>{gameState.homeScore}</div>
                </div>
              </div>
            </div>

            {/* Current Pitcher - clickable - shows LIVE data from gameState */}
            <button
              onClick={() => setSelectedPlayer({ name: gameState.currentPitcherName || 'Unknown', type: 'pitcher', playerId: gameState.currentPitcherId })}
              className="bg-[#4A6A42] border-[4px] border-[#E8E8D8] p-2 text-left hover:scale-105 transition-transform cursor-pointer shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)] relative"
            >
              <div className="absolute top-1 right-2 text-[7px] text-[#E8E8D8] font-bold" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>
                {gameState.isTop ? homeTeamName.toUpperCase() : awayTeamName.toUpperCase()}
              </div>
              <div className="text-[7px] text-[#E8E8D8]" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>PITCHING</div>
              <div className="text-xs text-[#E8E8D8] font-bold" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>{currentPitcherDisplayName}</div>
              <div className="text-[7px] text-[#E8E8D8]" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>{pitcherPitchCount} Pitches • ⚪</div>
            </button>
          </div>

          {/* Beat Reporters Feed */}
          <div className="bg-black border-[4px] border-white p-3">
            <div className="text-[8px] text-white font-bold mb-2 flex items-center gap-1">
              <span>𝕏</span> BEAT REPORTERS
            </div>
            <div className="space-y-2">
              {/* Tigers Beat Reporter */}
              <div className="bg-white border-[2px] border-[#333] p-2">
                <div className="flex items-start gap-2 mb-1">
                  <div className="w-6 h-6 bg-[#DD0000] border-[2px] border-black flex items-center justify-center text-white text-[8px] font-bold flex-shrink-0">
                    TR
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[8px] text-black font-bold leading-tight">@TigersInsider</div>
                    <div className="text-[7px] text-[#666] leading-tight">2m ago</div>
                  </div>
                </div>
                <div className="text-[8px] text-black leading-snug">
                  R. LOPEZ struggling in the 5th. Tigers down 4-3. Bullpen warming up.
                </div>
              </div>

              {/* Sox Beat Reporter */}
              <div className="bg-white border-[2px] border-[#333] p-2">
                <div className="flex items-start gap-2 mb-1">
                  <div className="w-6 h-6 bg-[#0066FF] border-[2px] border-black flex items-center justify-center text-white text-[8px] font-bold flex-shrink-0">
                    SB
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[8px] text-black font-bold leading-tight">@SoxBeatWriter</div>
                    <div className="text-[7px] text-[#666] leading-tight">5m ago</div>
                  </div>
                </div>
                <div className="text-[8px] text-black leading-snug">
                  S. WHITE dealing through 5 IP. 4 K's, only 1 BB. Sox offense showing signs of life.
                </div>
              </div>

              {/* Tigers Beat Reporter 2 */}
              <div className="bg-white border-[2px] border-[#333] p-2">
                <div className="flex items-start gap-2 mb-1">
                  <div className="w-6 h-6 bg-[#DD0000] border-[2px] border-black flex items-center justify-center text-white text-[8px] font-bold flex-shrink-0">
                    TR
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[8px] text-black font-bold leading-tight">@TigersInsider</div>
                    <div className="text-[7px] text-[#666] leading-tight">8m ago</div>
                  </div>
                </div>
                <div className="text-[8px] text-black leading-snug">
                  MARTINEZ with a clutch RBI double in the 4th. That's his 2nd hit today.
                </div>
              </div>
            </div>
          </div>

          {/* Team Rosters - EXH-036: Now with mojo/fitness editing support */}
          <div className="grid grid-cols-2 gap-3">
            <TeamRoster
              teamName={awayTeamName.toUpperCase()}
              teamColor={awayTeamColor}
              teamBorderColor={awayTeamBorderColor}
              players={awayTeamPlayers}
              pitchers={awayTeamPitchers}
              isAway={true}
              isInGame={true}
              onSubstitution={(benchPlayerName, lineupPlayerName) =>
                handleSubstitution('away', benchPlayerName, lineupPlayerName)
              }
              onPitcherSubstitution={(newPitcherName, replacedName, replacedType) =>
                handlePitcherSubstitution('away', newPitcherName, replacedName, replacedType)
              }
              onPositionSwap={(player1Name, player2Name) =>
                handlePositionSwap('away', player1Name, player2Name)
              }
              getPlayerMojo={(playerName) => getPlayerMojoByName(playerName, 'away')}
              getPlayerFitness={(playerName) => getPlayerFitnessByName(playerName, 'away')}
              onMojoChange={(playerName, newMojo) => setPlayerMojoByName(playerName, 'away', newMojo)}
              onFitnessChange={(playerName, newFitness) => setPlayerFitnessByName(playerName, 'away', newFitness)}
            />
            <TeamRoster
              teamName={homeTeamName.toUpperCase()}
              teamColor={homeTeamColor}
              teamBorderColor={homeTeamBorderColor}
              players={homeTeamPlayers}
              pitchers={homeTeamPitchers}
              isAway={false}
              isInGame={true}
              onSubstitution={(benchPlayerName, lineupPlayerName) =>
                handleSubstitution('home', benchPlayerName, lineupPlayerName)
              }
              onPitcherSubstitution={(newPitcherName, replacedName, replacedType) =>
                handlePitcherSubstitution('home', newPitcherName, replacedName, replacedType)
              }
              onPositionSwap={(player1Name, player2Name) =>
                handlePositionSwap('home', player1Name, player2Name)
              }
              getPlayerMojo={(playerName) => getPlayerMojoByName(playerName, 'home')}
              getPlayerFitness={(playerName) => getPlayerFitnessByName(playerName, 'home')}
              onMojoChange={(playerName, newMojo) => setPlayerMojoByName(playerName, 'home', newMojo)}
              onFitnessChange={(playerName, newFitness) => setPlayerFitnessByName(playerName, 'home', newFitness)}
            />
          </div>

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

                {/* Error Details - Placeholder */}
                {expandedOutcome === 'E' && (
                  <OutcomeDetailPanel title="ERROR DETAILS">
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
                    label="KL"
                    color="red"
                    isExpanded={expandedOutcome === 'KL'}
                    onClick={() => { toggleOutcomeDetail('KL'); handleOutSelect('KL'); }}
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
                {(expandedOutcome === 'K' || expandedOutcome === 'KL') && (
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
                  />
                  <OutcomeButton
                    label="SH"
                    color="purple"
                    isExpanded={expandedOutcome === 'SH'}
                    onClick={() => { toggleOutcomeDetail('SH'); handleOutSelect('SH'); }}
                  />
                </div>

                {/* PO/DP/FC/SF/SH Quick Record */}
                {(expandedOutcome === 'PO' || expandedOutcome === 'DP' || expandedOutcome === 'FC' || expandedOutcome === 'SF' || expandedOutcome === 'SH') && (
                  <OutcomeDetailPanel title={`${expandedOutcome} DETAILS`}>
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

                <div className="grid grid-cols-1 gap-1">
                  <OutcomeButton
                    label="D3K"
                    color="purple"
                    isExpanded={expandedOutcome === 'D3K'}
                    onClick={() => { toggleOutcomeDetail('D3K'); handleOutSelect('D3K'); }}
                  />
                </div>

                {/* D3K Quick Record */}
                {expandedOutcome === 'D3K' && (
                  <OutcomeDetailPanel title="DROPPED 3RD STRIKE">
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
          </div>{/* Close p-4 space-y-4 wrapper */}

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
            onConfirm={confirmPitchCount}
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
      </div>
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

  // Mock player data - in production this would come from your game state
  const batterStats = {
    position: 'SS',
    battingHand: 'R',
    throwingHand: 'R',
    avg: '.289',
    hr: 12,
    rbi: 45,
    sb: 8,
    gameStats: {
      ab: 2,
      hits: 0,
      bb: 0,
      so: 1,
    }
  };

  const pitcherStats = {
    throwingHand: 'R',
    era: '3.45',
    wins: 8,
    losses: 4,
    so: 87,
    gameStats: {
      pitches: 67,
      strikes: 42,
      balls: 25,
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
}

function OutcomeButton({ label, color, isExpanded, onClick }: OutcomeButtonProps) {
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