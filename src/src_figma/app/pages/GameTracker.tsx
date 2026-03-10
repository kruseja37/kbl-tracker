import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useNavigate, useParams, useLocation } from "react-router";
import { Menu, ChevronUp, X } from "lucide-react";
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
// D-9: MiniScoreboard removed from diamond zone — scoreboard now in FenwayBoard left panel
import { FenwayBoard } from "@/app/components/FenwayBoard";
import { QuickBar } from "@/app/components/QuickBar";
import { PlayLogPanel, type PlayLogEntry } from "@/app/components/PlayLogPanel";
import { EnrichmentPanel, PITCH_TYPES, type EnrichmentUpdate } from "@/app/components/EnrichmentPanel";
import {
  getAtBatEvent,
  getBetweenPlayEvents,
  getFieldingEventsForAtBat,
  getGameHeader,
  logFieldingEvent,
  updateAtBatEvent,
  updateAtBatEventWithFieldingSync,
  type AtBatEvent,
  type FieldingEvent,
  type GameHeader,
} from "../../../utils/eventLog";
import { getTeamColors, getFielderBorderColors } from "@/config/teamColors";
import { buildFallbackRuntimePlayerId, getRuntimeRosterEntityId } from "../utils/runtimePlayerIdentity";
import {
  buildRunnerEventDetails,
  deriveRunnerEventType,
  normalizeSpecialEventType,
} from "../utils/gameTrackerEventDispatch";
import { areRivals } from '../../../data/leagueStructure';
import { getParkNames } from "../../../data/parkLookup";
import { useGameState, type HitType, type OutType, type WalkType, type RunnerAdvancement, type PlayerGameStats, type PitcherGameStats, type PlateAppearanceAction } from "@/hooks/useGameState";
import { usePlayerState, type PlayerStateData, getStateBadge, formatMultiplier } from "@/app/hooks/usePlayerState";

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
// EXH-036: Import Mojo/Fitness types for PlayerCardModal editing
import type { MojoLevel } from "../../../engines/mojoEngine";
import type { FitnessState } from "../../../engines/fitnessEngine";
import { MOJO_STATES, getMojoColor } from "../../../engines/mojoEngine";
import { FITNESS_STATES } from "../../../engines/fitnessEngine";
import { useFameTracking, type FameEventDisplay, formatFameValue, getFameColor, getLITier } from "@/app/hooks/useFameTracking";
import { FielderCreditModal, type RunnerOutInfo, type FielderCredit } from "../components/modals/FielderCreditModal";
import { ErrorOnAdvanceModal, type RunnerAdvanceInfo, type ErrorOnAdvanceResult } from "../components/modals/ErrorOnAdvanceModal";
// MAJ-03: Wire detection system
import { runPlayDetections, type UIDetectionResult } from "../engines/detectionIntegration";
import { toMojoLabel, toFitnessLabel, type FameEventType, type Position } from "../../../types/game";
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
import {
  extractFieldingEvents,
  extractSupplementalAdvanceErrorEvents,
  extractSupplementalRunnerOutFieldingEvents,
  type FieldingExtractionContext,
} from '../utils/fieldingEventExtractor';
import { captureStartingLineups, type LineupEntry } from '../../../utils/gameStorage';
import { POSITION_MAP, POSITION_NUMBER } from '../components/fielderInference';
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

interface PendingErrorOnAdvanceAttribution {
  playData: PlayData;
  atBatEventId: string;
  atBatEventIndex: number;
}

interface PendingFielderCreditPlay {
  playData: PlayData;
  atBatEventId: string;
  atBatEventIndex: number;
}

interface HistoricalLineupSlot {
  playerId: string;
  playerName: string;
  position: Position;
}

interface HistoricalPitcher {
  playerId: string;
  playerName: string;
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
    gameMode?: 'exhibition' | 'franchise' | 'playoff' | 'elimination';
    leagueId?: string;
    homeManagerId?: string;
    homeManagerName?: string;
    awayManagerId?: string;
    awayManagerName?: string;
    userTeamSide?: 'home' | 'away';
    // Playoff context (for recording series results)
    playoffSeriesId?: string;
    playoffGameNumber?: number;
    playoffId?: string;
    franchiseId?: string;
    eliminationId?: string;
    seasonId?: string;
    statsScopeId?: string;
    competitionType?: 'exhibition' | 'franchise' | 'playoff' | 'elimination';
    competitionId?: string;
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
  const competitionType =
    navigationState?.competitionType ||
    navigationState?.gameMode ||
    'exhibition';
  const competitionId =
    navigationState?.competitionId ||
    (competitionType === 'elimination'
      ? navigationState?.eliminationId
      : navigationState?.franchiseId);
  const statsScopeId =
    navigationState?.statsScopeId ||
    (competitionType === 'elimination' && navigationState?.eliminationId
      ? `elimination-${navigationState.eliminationId}`
      : navigationState?.seasonId);

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
    commitPlateAppearance,
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
    undoLastAction,
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
    atBatSequence,
  } = useGameState(gameId);
  const [gameInitialized, setGameInitialized] = useState(false);

  // Set playoff context from navigation state (if this is a playoff game)
  const isPlayoffGame = navigationState?.gameMode === 'playoff' || navigationState?.gameMode === 'elimination';
  useEffect(() => {
    if (navigationState?.playoffSeriesId) {
      setPlayoffContext(
        navigationState.playoffSeriesId,
        navigationState.playoffGameNumber ?? null,
        navigationState.playoffId ?? null
      );
    }
  }, [navigationState?.playoffSeriesId, navigationState?.playoffGameNumber, navigationState?.playoffId, setPlayoffContext]);

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

  // Layer 5: Enrichment Panel state
  const [enrichingEntry, setEnrichingEntry] = useState<PlayLogEntry | null>(null);
  const [enrichmentCache, setEnrichmentCache] = useState<Record<string, NonNullable<import('../../../utils/eventLog').AtBatEvent['enrichment']>>>({});
  // Between-inning enrichment prompt
  const [showEnrichmentPrompt, setShowEnrichmentPrompt] = useState(false);
  const [unenrichedCount, setUnenrichedCount] = useState(0);
  // Post-game enrichment prompt
  const [showPostGameEnrichPrompt, setShowPostGameEnrichPrompt] = useState(false);
  const [postGameUnenrichedCount, setPostGameUnenrichedCount] = useState(0);

  const logAction = useCallback((entry: string) => {
    pushActivityLog(`${inningLabel()}: ${entry}`);
  }, [inningLabel, pushActivityLog]);

  const buildPlateAppearanceActionFromPlayData = useCallback((
    playData: PlayData,
    runnerAdvancement?: RunnerAdvancement,
  ): PlateAppearanceAction => {
    const batterReached = playData.runnerOutcomes?.batter?.to !== 'out' &&
      playData.runnerOutcomes?.batter?.to !== undefined;
    const isDroppedThirdStrike = (playData.outType === 'K' || playData.outType === 'Kc') &&
      playData.fieldingSequence.length >= 2 &&
      playData.fieldingSequence[0] === 2 &&
      playData.fieldingSequence[1] === 3;

    switch (playData.type) {
      case 'hr':
        return {
          type: 'hit',
          hitType: 'HR',
          rbi: 0,
          runnerAdvancement,
        };
      case 'hit':
        return {
          type: 'hit',
          hitType: playData.hitType || '1B',
          rbi: 0,
          runnerAdvancement,
        };
      case 'out':
        return {
          type: 'out',
          outType: playData.outType || 'GO',
          runnerAdvancement,
          batterReached,
          isDroppedThirdStrike,
        };
      case 'foul_out':
        return {
          type: 'out',
          outType: 'FO',
          runnerAdvancement,
        };
      case 'foul_ball':
        return {
          type: 'foul_ball',
        };
      case 'walk':
        return {
          type: 'walk',
          walkType: playData.walkType || 'BB',
        };
      case 'error':
        return {
          type: 'error',
          rbi: 0,
          runnerAdvancement,
        };
    }
  }, []);

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
  const [pendingPlayForFielderCredit, setPendingPlayForFielderCredit] = useState<PendingFielderCreditPlay | null>(null);
  const [runnersOutForCredit, setRunnersOutForCredit] = useState<RunnerOutInfo[]>([]);

  // EXH-025: Error on advance modal state
  const [errorOnAdvanceModalOpen, setErrorOnAdvanceModalOpen] = useState(false);
  const [pendingPlayForErrorOnAdvance, setPendingPlayForErrorOnAdvance] = useState<PendingErrorOnAdvanceAttribution | null>(null);
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
    runnerName: string;
    playerId: string;
    anchorPosition: { left: string; top: string };
  } | null>(null);
  const [activeFielderPopover, setActiveFielderPopover] = useState<{
    fielder: FielderInfo;
    anchorPosition: { left: string; top: string };
  } | null>(null);
  const [showLineupOverlay, setShowLineupOverlay] = useState(false);
  const [lineupOverlayHint, setLineupOverlayHint] = useState<string | null>(null);
  const [showModifierTray, setShowModifierTray] = useState(false);
  const [showManagerMomentPanel, setShowManagerMomentPanel] = useState(false);

  // MAJ-03: Detection system state — pending prompts for user confirmation
  const [pendingDetections, setPendingDetections] = useState<UIDetectionResult[]>([]);

  // D-4: HR inline prompt state (distance + pitch type before recording)
  const [hrPrompt, setHrPrompt] = useState<{
    rbi: number;
    runnerAdv: RunnerAdvancement | undefined;
    defaults: RunnerDefaults;
    distance: string;
    pitchType: string;
  } | null>(null);

  // D-3: Error flow prompt state (base → fielder → type)
  const [errorFlow, setErrorFlow] = useState<{
    step: 'base' | 'fielder' | 'type';
    baseReached: '1B' | '2B' | '3B';
    fielderPosition: number;
    defaults: RunnerDefaults;
  } | null>(null);

  // D-5: SF prompt state — shown when FO + R3 + <2 outs
  const [sfPrompt, setSfPrompt] = useState<{
    runnerAdv: RunnerAdvancement | undefined;
    defaults: RunnerDefaults;
  } | null>(null);

  // D-6: GO→DP prompt state — shown when GO + runner out detected
  const [dpPrompt, setDpPrompt] = useState<{
    runnerAdv: RunnerAdvancement | undefined;
    rbi: number;
    defaults: RunnerDefaults;
  } | null>(null);

  // D-7: IFR prompt state — shown when PO + R1+R2 or loaded + <2 outs
  const [ifrPrompt, setIfrPrompt] = useState<{
    runnerAdv: RunnerAdvancement | undefined;
    defaults: RunnerDefaults;
  } | null>(null);

  // Scoreboard minimization toggle - allows field to expand
  const [isScoreboardMinimized, setIsScoreboardMinimized] = useState(true);

  // Field zoom level tuned for the spec's iPad landscape layout.
  // Keep the playable field prominent while retaining enough outfield for taps/enrichment.
  const fieldZoomLevel = isScoreboardMinimized ? 1 : 0.82;

  // Undo system - restore game state on undo
  const handleUndo = useCallback((snapshot: GameSnapshot) => {
    console.log("Undoing durable game action:", snapshot.playDescription);
    void (async () => {
      const undone = await undoLastAction();
      if (!undone) {
        console.warn("No durable action available to undo");
        return;
      }
      setPlayLogEntries(prev => prev.length > 0 ? prev.slice(0, -1) : prev);
    })();
  }, [undoLastAction]);

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

  const getRosterEntityId = useCallback((entity: { name: string; playerId?: string }, team: 'away' | 'home') => {
    return getRuntimeRosterEntityId(entity, team);
  }, []);

  const rosterIdLookups = useMemo(() => ({
    away: {
      players: new Map(awayTeamPlayers.map((player) => [player.name, getRosterEntityId(player, 'away')])),
      pitchers: new Map(awayTeamPitchers.map((pitcher) => [pitcher.name, getRosterEntityId(pitcher, 'away')])),
    },
    home: {
      players: new Map(homeTeamPlayers.map((player) => [player.name, getRosterEntityId(player, 'home')])),
      pitchers: new Map(homeTeamPitchers.map((pitcher) => [pitcher.name, getRosterEntityId(pitcher, 'home')])),
    },
  }), [awayTeamPitchers, awayTeamPlayers, getRosterEntityId, homeTeamPitchers, homeTeamPlayers]);

  const getRosterIdFromName = useCallback((
    name: string,
    team: 'away' | 'home',
    role: 'any' | 'player' | 'pitcher' = 'any'
  ) => {
    const teamLookups = rosterIdLookups[team];
    if (role === 'player') {
      return teamLookups.players.get(name) || buildFallbackRuntimePlayerId(name, team);
    }
    if (role === 'pitcher') {
      return teamLookups.pitchers.get(name) || teamLookups.players.get(name) || buildFallbackRuntimePlayerId(name, team);
    }
    return teamLookups.players.get(name) || teamLookups.pitchers.get(name) || buildFallbackRuntimePlayerId(name, team);
  }, [rosterIdLookups]);

  const rosterNameById = useMemo(() => {
    const entries: Array<[string, string]> = [];
    for (const player of awayTeamPlayers) {
      entries.push([getRosterEntityId(player, 'away'), player.name]);
    }
    for (const player of homeTeamPlayers) {
      entries.push([getRosterEntityId(player, 'home'), player.name]);
    }
    for (const pitcher of awayTeamPitchers) {
      entries.push([getRosterEntityId(pitcher, 'away'), pitcher.name]);
    }
    for (const pitcher of homeTeamPitchers) {
      entries.push([getRosterEntityId(pitcher, 'home'), pitcher.name]);
    }
    return new Map(entries);
  }, [awayTeamPitchers, awayTeamPlayers, getRosterEntityId, homeTeamPitchers, homeTeamPlayers]);

  const resolveRosterNameByGameId = useCallback((playerId?: string): string | undefined => {
    if (!playerId) return undefined;
    return rosterNameById.get(playerId);
  }, [rosterNameById]);

  const resolvedCurrentBatterName =
    gameState.currentBatterName ||
    resolveRosterNameByGameId(gameState.currentBatterId) ||
    'BATTER';
  const resolvedCurrentPitcherName =
    gameState.currentPitcherName ||
    resolveRosterNameByGameId(gameState.currentPitcherId) ||
    'PITCHER';

  // T0-08: Derive lineup/bench/bullpen from actual team data (dynamic, not hardcoded)
  const battingTeamPlayersRaw = gameState.isTop ? awayTeamPlayers : homeTeamPlayers;
  const fieldingTeamPitchersRaw = gameState.isTop ? homeTeamPitchers : awayTeamPitchers;

  const currentLineup = battingTeamPlayersRaw
    .filter(p => p.battingOrder !== undefined && !p.isOutOfGame)
    .sort((a, b) => (a.battingOrder || 0) - (b.battingOrder || 0))
    .map((p) => ({
      name: p.name,
      pos: p.position || 'DH',
      batting: p.name === resolvedCurrentBatterName,
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
    id: getRosterIdFromName(player.name, battingTeam),
    name: player.name,
    position: player.pos,
    battingOrder: idx + 1,
    isCurrentBatter: player.batting,
    battingHand: (battingTeamPlayersRaw.find(p => p.name === player.name)?.battingHand || 'R') as 'L' | 'R' | 'S',
  }));

  const benchCardData: BenchPlayer[] = benchPlayers.map((player) => ({
    id: getRosterIdFromName(player.name, battingTeam),
    name: player.name,
    positions: [player.pos],
    battingHand: player.hand as 'L' | 'R' | 'S',
    isUsed: player.isOutOfGame, // GAP-GT-7-D: ❌ for players already used/out of game
  }));

  const bullpenCardData: BullpenPitcher[] = availablePitchers.map((pitcher) => ({
    id: getRosterIdFromName(pitcher.name, fieldingTeam, 'pitcher'),
    name: pitcher.name,
    throwingHand: pitcher.hand as 'L' | 'R',
    fitness: 'FIT' as const,
    isUsed: false,
    isCurrentPitcher: false,
  }));

  // Derive current pitcher from actual pitcher data
  const activePitcher = fieldingTeamPitchersRaw.find(p => p.isActive) || fieldingTeamPitchersRaw.find(p => p.isStarter) || fieldingTeamPitchersRaw[0];
  const currentPitcherData: BullpenPitcher = {
    id: activePitcher
      ? getRosterEntityId(activePitcher, fieldingTeam)
      : buildFallbackRuntimePlayerId('pitcher', fieldingTeam),
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

  const defensiveAlignmentByPosition = useMemo(() => {
    const alignment: Partial<Record<Position, { playerId: string; playerName: string }>> = {};

    for (const player of fieldingTeamPlayers) {
      if (!player.position || !positionMap[player.position]) continue;
      alignment[player.position as Position] = {
        playerId: getRosterEntityId(player, fieldingTeam),
        playerName: player.name,
      };
    }

    if (activePitcher) {
      alignment.P = {
        playerId: getRosterEntityId(activePitcher, fieldingTeam),
        playerName: activePitcher.name,
      };
    }

    return alignment;
  }, [activePitcher, fieldingTeam, fieldingTeamPlayers, getRosterEntityId]);

  const getPendingAtBatIdentity = useCallback(() => {
    const nextAtBatIndex = atBatSequence + 1;
    return {
      atBatEventIndex: nextAtBatIndex,
      atBatEventId: `${gameState.gameId}_${nextAtBatIndex}`,
    };
  }, [atBatSequence, gameState.gameId]);

  const buildFieldingContext = useCallback((atBatIdentity: { atBatEventId: string; atBatEventIndex: number }): FieldingExtractionContext => ({
    gameId: gameState.gameId,
    defensiveTeamId: gameState.isTop ? gameState.homeTeamId : gameState.awayTeamId,
    atBatEventId: atBatIdentity.atBatEventId,
    atBatEventIndex: atBatIdentity.atBatEventIndex,
    defendersByPosition: defensiveAlignmentByPosition,
  }), [defensiveAlignmentByPosition, gameState.awayTeamId, gameState.gameId, gameState.homeTeamId, gameState.isTop]);

  const persistFieldingEventsForPlayData = useCallback(async (
    playData: PlayData,
    sourceLabel?: string,
    atBatIdentity = getPendingAtBatIdentity(),
  ) => {
    if (playData.type === 'walk' || playData.type === 'foul_ball') {
      return;
    }

    const fieldingContext = buildFieldingContext(atBatIdentity);
    const fieldingEvents = extractFieldingEvents(playData, fieldingContext);
    for (const fe of fieldingEvents) {
      await logFieldingEvent(fe);
    }
    if (fieldingEvents.length > 0) {
      const contextLabel = sourceLabel ? ` via ${sourceLabel}` : '';
      console.log(`[Fielding] Logged ${fieldingEvents.length} fielding event(s)${contextLabel}`);
      pushActivityLog(`[Fielding] Logged ${fieldingEvents.length} event(s)${contextLabel}`);
    }
  }, [buildFieldingContext, getPendingAtBatIdentity, pushActivityLog]);

  const persistRunnerOutCredits = useCallback(async (
    playData: PlayData,
    credits: FielderCredit[],
    atBatIdentity: { atBatEventId: string; atBatEventIndex: number },
    options?: { recordUserEdit?: boolean },
  ) => {
    if (credits.length === 0) {
      return;
    }

    const fieldingContext = buildFieldingContext(atBatIdentity);
    const startingSequence = extractFieldingEvents(playData, fieldingContext).length;
    const supplementalEvents = extractSupplementalRunnerOutFieldingEvents(
      playData,
      credits
        .filter((credit) =>
          credit.putoutBy in POSITION_NUMBER &&
          credit.assistBy.every((position) => position in POSITION_NUMBER),
        )
        .map((credit) => ({
          putoutBy: credit.putoutBy as Position,
          assistBy: credit.assistBy as Position[],
        })),
      fieldingContext,
      startingSequence,
    );

    const enrichmentUpdate = {
      fieldingSequence: supplementalEvents.map((event) => POSITION_NUMBER[event.position as keyof typeof POSITION_NUMBER]),
      putouts: credits
        .filter((credit) => credit.putoutBy in POSITION_NUMBER)
        .map((credit) => POSITION_NUMBER[credit.putoutBy as keyof typeof POSITION_NUMBER]),
      assists: credits.flatMap((credit) =>
        credit.assistBy
          .filter((position) => position in POSITION_NUMBER)
          .map((position) => POSITION_NUMBER[position as keyof typeof POSITION_NUMBER]),
      ),
    } as NonNullable<import('../../../utils/eventLog').AtBatEvent['enrichment']>;

    if (options?.recordUserEdit) {
      const existingAtBat = await getAtBatEvent(atBatIdentity.atBatEventId);
      const existingFieldingEvents = await getFieldingEventsForAtBat(atBatIdentity.atBatEventId);
      if (existingAtBat) {
        const timestamp = Date.now();
        const nextVersion = (existingAtBat.version ?? 1) + 1;
        await updateAtBatEventWithFieldingSync(
          atBatIdentity.atBatEventId,
          {
            enrichment: enrichmentUpdate,
            version: nextVersion,
            editHistory: [
              {
                field: 'enrichment.fieldingSequence',
                oldValue: existingAtBat.enrichment?.fieldingSequence ?? null,
                newValue: enrichmentUpdate.fieldingSequence,
                timestamp,
              },
              {
                field: 'enrichment.putouts',
                oldValue: existingAtBat.enrichment?.putouts ?? null,
                newValue: enrichmentUpdate.putouts,
                timestamp,
              },
              {
                field: 'enrichment.assists',
                oldValue: existingAtBat.enrichment?.assists ?? null,
                newValue: enrichmentUpdate.assists,
                timestamp,
              },
            ],
          },
          [...existingFieldingEvents, ...supplementalEvents],
        );
      }
    } else {
      for (const event of supplementalEvents) {
        await logFieldingEvent(event);
      }

      await updateAtBatEvent(atBatIdentity.atBatEventId, {
        enrichment: enrichmentUpdate,
      });
    }

    setEnrichmentCache((prev) => ({
      ...prev,
      [atBatIdentity.atBatEventId]: {
        ...(prev[atBatIdentity.atBatEventId] || {}),
        ...enrichmentUpdate,
      },
    }));

    pushActivityLog(`[Fielding] Logged ${supplementalEvents.length} runner-out credit event(s)`);
  }, [buildFieldingContext, pushActivityLog]);

  const buildPlayDataFromAtBatEvent = useCallback((
    atBatEvent: AtBatEvent,
    fieldingSequence: number[],
  ): PlayData | null => {
    const enrichment = atBatEvent.enrichment || {};
    const ballLocation = enrichment.fieldLocation
      ? { x: enrichment.fieldLocation.x, y: enrichment.fieldLocation.y }
      : undefined;
    const exitType = enrichment.exitType === 'ground_ball' ? 'Ground'
      : enrichment.exitType === 'line_drive' ? 'Line Drive'
      : enrichment.exitType === 'fly_ball' ? 'Fly Ball'
      : enrichment.exitType === 'popup' ? 'Pop Up'
      : undefined;
    const common = {
      fieldingSequence,
      ballLocation,
      spraySector: enrichment.fieldLocation?.zone,
      exitType,
    } as const;

    if (['1B', '2B', '3B', 'GRD'].includes(atBatEvent.result)) {
      return {
        ...common,
        type: 'hit',
        hitType: (atBatEvent.result === 'GRD' ? '2B' : atBatEvent.result) as PlayData['hitType'],
      };
    }
    if (atBatEvent.result === 'HR') {
      return {
        ...common,
        type: 'hr',
        hitType: 'HR',
      };
    }
    if (['GO', 'FO', 'LO', 'PO', 'DP', 'TP', 'FC', 'SF', 'SAC', 'K', 'Kc'].includes(atBatEvent.result)) {
      return {
        ...common,
        type: 'out',
        outType: atBatEvent.result as PlayData['outType'],
      };
    }
    if (atBatEvent.result === 'E') {
      return {
        ...common,
        type: 'error',
        errorFielder: atBatEvent.enrichment?.errors?.[0]?.position,
        errorType: atBatEvent.enrichment?.errors?.[0]?.type?.toUpperCase() as PlayData['errorType'],
      };
    }
    return null;
  }, []);

  const buildHistoricalDefensiveAlignment = useCallback(async (
    atBatEvent: AtBatEvent,
    linkedFieldingEvents: FieldingEvent[],
  ) => {
    const header = await getGameHeader(atBatEvent.gameId);
    const fallbackAlignment = linkedFieldingEvents.reduce<Partial<Record<Position, { playerId: string; playerName: string }>>>((acc, event) => {
      acc[event.position] = {
        playerId: event.playerId,
        playerName: event.playerName,
      };
      return acc;
    }, {});

    if (!header?.startingLineups) {
      return fallbackAlignment;
    }

    const toSlots = (players: NonNullable<GameHeader['startingLineups']>['away']): HistoricalLineupSlot[] =>
      players
        .slice()
        .sort((a, b) => a.battingOrder - b.battingOrder)
        .map((player) => ({
          playerId: player.playerId,
          playerName: player.playerName,
          position: player.position as Position,
        }));

    let awayLineup = toSlots(header.startingLineups.away);
    let homeLineup = toSlots(header.startingLineups.home);
    let awayPitcher: HistoricalPitcher | null = header.startingPitchers?.away || null;
    let homePitcher: HistoricalPitcher | null = header.startingPitchers?.home || null;
    const awayBenchIds = new Set((header.benchRosters?.away || []).map((player) => player.playerId));
    const homeBenchIds = new Set((header.benchRosters?.home || []).map((player) => player.playerId));
    const betweenPlayEvents = await getBetweenPlayEvents(atBatEvent.gameId);

    const findTeamSide = (playerId?: string) => {
      if (!playerId) return null;
      if (awayLineup.some((player) => player.playerId === playerId) || awayBenchIds.has(playerId) || awayPitcher?.playerId === playerId) return 'away' as const;
      if (homeLineup.some((player) => player.playerId === playerId) || homeBenchIds.has(playerId) || homePitcher?.playerId === playerId) return 'home' as const;
      return null;
    };

    betweenPlayEvents
      .filter((event) =>
        event.eventIndex < atBatEvent.eventIndex ||
        (event.eventIndex === atBatEvent.eventIndex && event.timestamp <= atBatEvent.timestamp)
      )
      .forEach((event) => {
        if (event.type === 'substitution' && event.substitution) {
          const side = findTeamSide(event.substitution.outPlayerId) || findTeamSide(event.substitution.inPlayerId);
          if (!side) return;
          const lineup = side === 'away' ? awayLineup : homeLineup;
          const lineupIndex = lineup.findIndex((player) => player.playerId === event.substitution.outPlayerId);
          if (lineupIndex >= 0) {
            lineup[lineupIndex] = {
              playerId: event.substitution.inPlayerId,
              playerName: event.substitution.inPlayerName || event.substitution.inPlayerId,
              position: (event.substitution.inPosition || event.substitution.outPosition || lineup[lineupIndex].position) as Position,
            };
          }
          return;
        }

        if (event.type === 'position_change' && event.substitution) {
          const side = findTeamSide(event.substitution.inPlayerId) || findTeamSide(event.substitution.outPlayerId);
          if (!side) return;
          const lineup = side === 'away' ? awayLineup : homeLineup;
          const lineupIndex = lineup.findIndex((player) => player.playerId === event.substitution.inPlayerId);
          if (lineupIndex >= 0) {
            lineup[lineupIndex] = {
              ...lineup[lineupIndex],
              position: (event.substitution.inPosition || lineup[lineupIndex].position) as Position,
            };
          }
          return;
        }

        if (event.type === 'pitcher_change' && event.pitcherChange) {
          const side = event.gameState?.halfInning === 'TOP' ? 'home' : 'away';
          const nextPitcher = {
            playerId: event.pitcherChange.incomingPitcherId,
            playerName: event.pitcherChange.incomingPitcherName || event.pitcherChange.incomingPitcherId,
          };
          if (side === 'away') awayPitcher = nextPitcher;
          else homePitcher = nextPitcher;
        }
      });

    const defensiveSide = atBatEvent.halfInning === 'TOP' ? 'home' : 'away';
    const alignment = (defensiveSide === 'away' ? awayLineup : homeLineup).reduce<Partial<Record<Position, { playerId: string; playerName: string }>>>((acc, player) => {
      acc[player.position] = {
        playerId: player.playerId,
        playerName: player.playerName,
      };
      return acc;
    }, {});
    const activePitcher = defensiveSide === 'away' ? awayPitcher : homePitcher;
    if (activePitcher) {
      alignment.P = {
        playerId: activePitcher.playerId,
        playerName: activePitcher.playerName,
      };
    }

    return {
      ...alignment,
      ...fallbackAlignment,
    };
  }, []);

  const buildFieldingSyncEventsForSequenceEdit = useCallback(async (
    atBatEvent: AtBatEvent,
    nextFieldingSequence: number[],
  ) => {
    const linkedFieldingEvents = await getFieldingEventsForAtBat(atBatEvent.eventId);
    const defendersByPosition = await buildHistoricalDefensiveAlignment(atBatEvent, linkedFieldingEvents);
    const fieldingContext: FieldingExtractionContext = {
      gameId: atBatEvent.gameId,
      defensiveTeamId: atBatEvent.pitcherTeamId,
      atBatEventId: atBatEvent.eventId,
      atBatEventIndex: atBatEvent.eventIndex,
      defendersByPosition,
    };
    const previousPlayData = buildPlayDataFromAtBatEvent(
      atBatEvent,
      atBatEvent.enrichment?.fieldingSequence || [],
    );
    const nextPlayData = buildPlayDataFromAtBatEvent(atBatEvent, nextFieldingSequence);
    const previousBaseCount = previousPlayData
      ? extractFieldingEvents(previousPlayData, fieldingContext).length
      : 0;
    const nextBaseEvents = nextPlayData
      ? extractFieldingEvents(nextPlayData, fieldingContext)
      : [];

    const preservedSupplementals = linkedFieldingEvents
      .filter((event) => event.sequence >= previousBaseCount)
      .map((event, index) => {
        const sequence = nextBaseEvents.length + index;
        return {
          ...event,
          sequence,
          fieldingEventId: `${atBatEvent.gameId}_${atBatEvent.eventIndex}_fe_${sequence}`,
        };
      });

    return [...nextBaseEvents, ...preservedSupplementals];
  }, [buildHistoricalDefensiveAlignment, buildPlayDataFromAtBatEvent]);

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
            playerId: getRosterEntityId(p, 'away'),
            playerName: p.name,
            position: p.position!, // Safe - filtered above
          }));

        const homeLineup = homeTeamPlayers
          .filter(p => p.battingOrder && p.position) // Only players in batting order with positions
          .sort((a, b) => (a.battingOrder || 0) - (b.battingOrder || 0))
          .map(p => ({
            playerId: getRosterEntityId(p, 'home'),
            playerName: p.name,
            position: p.position!, // Safe - filtered above
          }));

        // MAJ-09: Extract bench players (players without batting order = not in starting lineup)
        const awayStarterIds = new Set(awayLineup.map(p => p.playerId));
        const awayBench = awayTeamPlayers
          .filter(p => !awayStarterIds.has(getRosterEntityId(p, 'away')))
          .filter(p => !p.isOutOfGame) // Don't include already-removed players
          .map(p => ({
            playerId: getRosterEntityId(p, 'away'),
            playerName: p.name,
            positions: [p.position || 'DH'].filter(Boolean),
          }));

        const homeStarterIds = new Set(homeLineup.map(p => p.playerId));
        const homeBench = homeTeamPlayers
          .filter(p => !homeStarterIds.has(getRosterEntityId(p, 'home')))
          .filter(p => !p.isOutOfGame)
          .map(p => ({
            playerId: getRosterEntityId(p, 'home'),
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
          seasonId: competitionType === 'elimination'
            ? undefined
            : (navigationState?.franchiseId
              ? `${navigationState.franchiseId}-season-${navigationState?.seasonNumber || 1}`
              : 'season-1'),
          statsScopeId: statsScopeId || (navigationState?.franchiseId
            ? `${navigationState.franchiseId}-season-${navigationState?.seasonNumber || 1}`
            : 'season-1'),
          competitionType,
          competitionId,
          awayTeamId: awayTeamId,
          awayTeamName: awayTeamName,
          homeTeamId: homeTeamId,
          homeTeamName: homeTeamName,
          awayLineup,
          homeLineup,
          awayBench,
          homeBench,
          awayStartingPitcherId: awayPitcher
            ? getRosterEntityId(awayPitcher, 'away')
            : buildFallbackRuntimePlayerId('pitcher', 'away'),
          awayStartingPitcherName: awayPitcher?.name || 'Pitcher',
          homeStartingPitcherId: homePitcher
            ? getRosterEntityId(homePitcher, 'home')
            : buildFallbackRuntimePlayerId('pitcher', 'home'),
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
  }, [competitionId, competitionType, gameId, gameInitialized, getRosterEntityId, homePitcher, homeTeamId, homeTeamName, homeTeamPlayers, initializeGame, loadExistingGame, navigationState?.franchiseId, navigationState?.seasonNumber, navigationState?.totalInnings, selectedStadium, statsScopeId, awayPitcher, awayTeamId, awayTeamName, awayTeamPlayers]);

  // EXH-036: Register players with playerStateHook for mojo/fitness tracking
  // This runs once after game is initialized to set up all players with default states
  useEffect(() => {
    if (!gameInitialized) return;
    let cancelled = false;

    const registerPlayersWithSnapshots = async () => {
      // Load mojo/fitness from snapshots for elimination games (inter-game persistence per §8)
      let mojoFitnessMap: Map<string, { mojoLevel: MojoLevel; fitnessState: FitnessState }> | null = null;
      if (navigationState?.gameMode === 'elimination' && navigationState?.eliminationId) {
        try {
          const { loadMojoFitnessSnapshots } = await import('../../../utils/mojoFitnessStorage');
          const snapshots = await loadMojoFitnessSnapshots(navigationState.eliminationId);
          if (cancelled) return;
          mojoFitnessMap = new Map(
            snapshots.map((s) => [
              s.playerId,
              { mojoLevel: s.mojoLevel, fitnessState: s.fitnessState },
            ])
          );
          console.log(`[Elimination] Loaded mojo/fitness snapshots for ${snapshots.length} players`);
        } catch (err) {
          console.error('[Elimination] Failed to load mojo/fitness snapshots:', err);
        }
      }

      if (cancelled) return;

      // Register all away team batters
      // Step 0: Pass real traits and age from League Builder data (no longer hardcoded)
      awayTeamPlayers.forEach((player) => {
        const playerId = getRosterEntityId(player, 'away');
        if (!playerStateHook.getPlayer(playerId)) {
          const traits = [player.trait1, player.trait2].filter((t): t is string => !!t);
          const snapshot = mojoFitnessMap?.get(playerId);
          playerStateHook.registerPlayer(
            playerId,
            player.name,
            (player.position || 'DH') as import('../../../engines/fitnessEngine').PlayerPosition,
            snapshot?.mojoLevel ?? 0,
            snapshot?.fitnessState ?? 'FIT',
            traits,
            player.age ?? 25
          );
        }
      });

      // Register all home team batters
      homeTeamPlayers.forEach((player) => {
        const playerId = getRosterEntityId(player, 'home');
        if (!playerStateHook.getPlayer(playerId)) {
          const traits = [player.trait1, player.trait2].filter((t): t is string => !!t);
          const snapshot = mojoFitnessMap?.get(playerId);
          playerStateHook.registerPlayer(
            playerId,
            player.name,
            (player.position || 'DH') as import('../../../engines/fitnessEngine').PlayerPosition,
            snapshot?.mojoLevel ?? 0,
            snapshot?.fitnessState ?? 'FIT',
            traits,
            player.age ?? 25
          );
        }
      });

      // Register pitchers
      if (awayPitcher) {
        const pitcherId = getRosterEntityId(awayPitcher, 'away');
        if (!playerStateHook.getPlayer(pitcherId)) {
          const traits = [awayPitcher.trait1, awayPitcher.trait2].filter((t): t is string => !!t);
          const snapshot = mojoFitnessMap?.get(pitcherId);
          playerStateHook.registerPlayer(
            pitcherId,
            awayPitcher.name,
            'SP',
            snapshot?.mojoLevel ?? 0,
            snapshot?.fitnessState ?? 'FIT',
            traits,
            awayPitcher.age ?? 25
          );
        }
      }
      if (homePitcher) {
        const pitcherId = getRosterEntityId(homePitcher, 'home');
        if (!playerStateHook.getPlayer(pitcherId)) {
          const traits = [homePitcher.trait1, homePitcher.trait2].filter((t): t is string => !!t);
          const snapshot = mojoFitnessMap?.get(pitcherId);
          playerStateHook.registerPlayer(
            pitcherId,
            homePitcher.name,
            'SP',
            snapshot?.mojoLevel ?? 0,
            snapshot?.fitnessState ?? 'FIT',
            traits,
            homePitcher.age ?? 25
          );
        }
      }

      console.log('[GameTracker] Registered players with playerStateHook for mojo/fitness tracking');
    };

    void registerPlayersWithSnapshots();

    return () => {
      cancelled = true;
    };
  }, [awayPitcher, awayTeamPlayers, gameInitialized, getRosterEntityId, homePitcher, homeTeamPlayers, navigationState?.eliminationId, navigationState?.gameMode, playerStateHook]);

  // EXH-036: Helper functions to get/set mojo/fitness by player name and team
  // These are used by TeamRoster components to enable mojo/fitness editing in player cards
  const getPlayerIdFromName = useCallback((name: string, team: 'away' | 'home') => {
    return getRosterIdFromName(name, team);
  }, [getRosterIdFromName]);

  const getPitcherIdFromName = useCallback((name: string, team: 'away' | 'home') => {
    return getRosterIdFromName(name, team, 'pitcher');
  }, [getRosterIdFromName]);

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
  const currentBatterData = battingTeamPlayers.find(
    p => (p.battingOrder && p.name === resolvedCurrentBatterName) || getRosterIdFromName(p.name, battingTeam) === gameState.currentBatterId
  );
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

  const currentBatterDisplayName = formatDisplayName(resolvedCurrentBatterName);
  const currentPitcherDisplayName = formatDisplayName(resolvedCurrentPitcherName);
  const openPlayerCard = useCallback((playerName: string, team: 'away' | 'home', type: 'batter' | 'pitcher' = 'batter') => {
    const playerId = type === 'pitcher'
      ? getPitcherIdFromName(playerName, team)
      : getPlayerIdFromName(playerName, team);
    setSelectedPlayer({ name: playerName, type, playerId });
  }, [getPitcherIdFromName, getPlayerIdFromName]);

  // Get current batter's fielding position (e.g., "SS", "CF")
  const batterFieldingPosition = currentBatterData?.position || '?';

  // Get batter's grade (from player data if available)
  const batterGrade = 'A'; // TODO: Get from player database when available

  const getRunnerIdentityForBase = useCallback((base: RunnerBase | 'first' | 'second' | 'third') => {
    const runnerName = runnerNames[base] || `R${base === 'first' ? '1' : base === 'second' ? '2' : '3'}`;
    return {
      runnerName,
      runnerId: getPlayerIdFromName(runnerName, battingTeam),
    };
  }, [battingTeam, getPlayerIdFromName, runnerNames]);

  const getLeadRunnerIdentity = useCallback(() => {
    const leadRunnerBase = gameState.bases.third ? 'third' : gameState.bases.second ? 'second' : gameState.bases.first ? 'first' : null;
    if (!leadRunnerBase) {
      return { runnerId: undefined, runnerName: undefined };
    }
    return getRunnerIdentityForBase(leadRunnerBase);
  }, [gameState.bases.first, gameState.bases.second, gameState.bases.third, getRunnerIdentityForBase]);

  // Handler for enhanced runner drag-drop (Phase 5)
  const handleEnhancedRunnerMove = useCallback((data: RunnerMoveData) => {
    console.log("Enhanced runner move:", data);

    // Capture snapshot for undo before making the change
    undoSystem.captureSnapshot(`Runner ${data.playType}: ${data.from} → ${data.to} (${data.outcome})`);

    // Use the hook's advanceRunner function
    const fromBase = data.from;
    const toBase = (data.to === 'first' ? 'second' : data.to) as 'second' | 'third' | 'home';
    const runnerIdentity = getRunnerIdentityForBase(fromBase);
    advanceRunner(fromBase, toBase, data.outcome);

    void recordEvent(
      deriveRunnerEventType(data),
      runnerIdentity.runnerId,
      buildRunnerEventDetails(data, runnerIdentity.runnerId, runnerIdentity.runnerName),
    );
  }, [advanceRunner, getRunnerIdentityForBase, recordEvent, undoSystem]);

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

    const movementContext = movements.map((movement) => {
      const runnerIdentity = getRunnerIdentityForBase(movement.from);
      const moveData: RunnerMoveData = {
        from: movement.from,
        to: movement.to === 'out' ? movement.from : movement.to,
        outcome: movement.outcome,
        playType: playType === 'PK' ? 'PICK' : playType === 'TBL' ? 'ADV' : playType as RunnerMoveData['playType'],
      };
      return { movement, moveData, runnerIdentity };
    });

    // Use the batch function to process all movements atomically
    advanceRunnersBatch(movements);

    void (async () => {
      for (const entry of movementContext) {
        await recordEvent(
          deriveRunnerEventType(entry.moveData),
          entry.runnerIdentity.runnerId,
          buildRunnerEventDetails(entry.moveData, entry.runnerIdentity.runnerId, entry.runnerIdentity.runnerName),
        );

        if (playType === 'TBL' && entry.movement.outcome === 'out') {
          await recordEvent('TOOTBLAN', entry.runnerIdentity.runnerId, {
            runnerId: entry.runnerIdentity.runnerId,
            runnerName: entry.runnerIdentity.runnerName,
            fromBase: entry.movement.from,
            toBase: 'out',
            outcome: 'out',
          });
        }
      }
    })();
  }, [advanceRunnersBatch, getRunnerIdentityForBase, recordEvent, undoSystem]);

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
    const pendingAtBatIdentity = getPendingAtBatIdentity();

    // T1-06: Clear stale error-on-advance state from previous plays
    // Use local variable to track within this function call (avoids stale React state in closure)
    let localExtraAdvances: RunnerAdvanceInfo[] = [];
    let localFielderCredits: FielderCredit[] = [];
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
          // T1-05: Auto-inferred — persist credits against the same at-bat after recording.
          console.log('[EXH-016] Auto-inferred fielder credits:', autoCredits);
          localFielderCredits = autoCredits;
        } else {
          // Can't auto-infer — fall back to manual modal
          console.log('[EXH-016] Cannot auto-infer, prompting for fielder credit:', runnersOut);
          setRunnersOutForCredit(runnersOut);
          setPendingPlayForFielderCredit({
            playData,
            atBatEventId: pendingAtBatIdentity.atBatEventId,
            atBatEventIndex: pendingAtBatIdentity.atBatEventIndex,
          });
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
      const baseAction = buildPlateAppearanceActionFromPlayData(playData, runnerAdvancement);

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
        await commitPlateAppearance({ ...baseAction, type: 'hit', hitType: 'HR', rbi });
        console.log(`HR recorded: ${playData.hrDistance}ft, type: ${playData.hrType}, sector: ${playData.spraySector}, RBI: ${rbi}`);
        logAction(`HR (${playData.hrDistance ?? '??'}ft${playData.spraySector ? ` ${playData.spraySector}` : ''}) — ${rbi} RBI`);
      } else if (playData.type === 'hit') {
        const hitType = playData.hitType || '1B';
        const rbi = calculateRBIFromOutcomes();
        await commitPlateAppearance({ ...baseAction, type: 'hit', hitType: hitType as HitType, rbi });
        console.log(`Hit recorded: ${hitType}, sector: ${playData.spraySector}, sequence: ${playData.fieldingSequence.join('-')}, RBI: ${rbi}`);
        logAction(`${hitType} hit${playData.spraySector ? ` to ${playData.spraySector}` : ''} — ${rbi} RBI`);
      } else if (playData.type === 'out') {
        const outType = playData.outType || 'GO';
        const isDroppedThirdStrike = baseAction.type === 'out' && baseAction.isDroppedThirdStrike;
        const batterReached = baseAction.type === 'out' && baseAction.batterReached;
        await commitPlateAppearance(baseAction);
        if ((outType === 'K' || outType === 'Kc') && (batterReached || isDroppedThirdStrike)) {
          console.log(`D3K recorded: Batter ${batterReached ? 'reached first' : 'thrown out'} (K stat counted)`);
          logAction(`D3K (${batterReached ? 'batter reached first' : 'batter thrown out'})`);
        } else {
          console.log(`Out recorded: ${outType}, sequence: ${playData.fieldingSequence.join('-')}, sector: ${playData.spraySector}`);
          if (outType === 'K' || outType === 'Kc') {
            logAction(`Strikeout (${outType})`);
          } else {
            logAction(`Out (${outType})${playData.fieldingSequence.length ? ` via ${playData.fieldingSequence.join('-')}` : ''}`);
          }
        }
      } else if (playData.type === 'foul_out') {
        await commitPlateAppearance(baseAction);
        console.log(`Foul out recorded: ${playData.foulType}, fielder: ${playData.fieldingSequence[0]}`);
        logAction(`Foul out (${playData.foulType})`);
      } else if (playData.type === 'foul_ball') {
        await commitPlateAppearance(baseAction);
        console.log(`Foul ball (strike) recorded`);
        logAction('Foul ball (strike)');
      } else if (playData.type === 'walk') {
        await commitPlateAppearance(baseAction);
        const walkType = playData.walkType || 'BB';
        console.log(`Walk recorded: ${walkType}`);
        logAction(`${walkType} walk`);
      } else if (playData.type === 'error') {
        const rbi = calculateRBIFromOutcomes();
        await commitPlateAppearance({ ...baseAction, type: 'error', rbi });
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
          eventId: pendingAtBatIdentity.atBatEventId,
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
          hasPitchCount: false,
          hasPitchType: false,
          isEnrichable: !efNonEnrichable.includes(efResult),
          isQAB: ['BB', 'IBB', 'HBP'].includes(efResult) || efCategory === 'hit',
          fieldingSequence: efFieldingSeq,
        });
      }

      // ============================================
      // STEP 4.5: Log fielding events for fWAR pipeline
      // Extracts putouts/assists/errors from PlayData and writes to IndexedDB
      // ============================================
      if (playData.type !== 'walk' && playData.type !== 'foul_ball') {
        try {
          await persistFieldingEventsForPlayData(playData, playData.type, pendingAtBatIdentity);
        } catch (err) {
          console.error('[Fielding] Failed to log fielding events:', err);
        }
      }

      if (localFielderCredits.length > 0) {
        try {
          await persistRunnerOutCredits(playData, localFielderCredits, pendingAtBatIdentity);
        } catch (err) {
          console.error('[Fielding] Failed to log runner-out credits:', err);
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
      // The play is already recorded; the modal persists any supplemental error attribution.
      // T1-06: Use local variable (not stale React state from closure)
      // ============================================
      if (localExtraAdvances.length > 0) {
        console.log('[EXH-025] Opening error attribution modal after play recorded');
        setPendingPlayForErrorOnAdvance({
          playData,
          atBatEventId: pendingAtBatIdentity.atBatEventId,
          atBatEventIndex: pendingAtBatIdentity.atBatEventIndex,
        });
        setErrorOnAdvanceModalOpen(true);
      }

    } catch (error) {
      console.error('Failed to record enhanced play:', error);
    }
  }, [buildPlateAppearanceActionFromPlayData, commitPlateAppearance, gameState, undoSystem, playerStats, pitcherStats, fameTrackingHook, playerStateHook, runnerNames, buildGameStateForLI, mwarHook, pendingMWARDecisions, inferFielderCredits, pushPlayLogEntry, shortInningLabel, setNextEventEnrichment, getPendingAtBatIdentity, persistFieldingEventsForPlayData, persistRunnerOutCredits]);

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
      if (outcome === 'HR') {
        // D-4: Show inline HR prompt for distance + pitch type before recording
        setHrPrompt({ rbi, runnerAdv, defaults, distance: '', pitchType: '' });
        return; // Recording deferred to handleHrPromptDone

      } else if (outcome === 'E') {
        // D-3: Show error flow prompts (base → fielder → type)
        setErrorFlow({ step: 'base', baseReached: '1B', fielderPosition: 0, defaults });
        return; // Recording deferred to handleErrorFlowComplete

      } else if (outcome === 'FO' && bases.third && outs < 2) {
        // D-5: FO with R3 + <2 outs → SF prompt
        setSfPrompt({ runnerAdv, defaults });
        return; // Deferred to handleSfPromptAnswer

      } else if (outcome === 'GO' && (bases.first || bases.second || bases.third) && outs < 2) {
        // D-6: GO with runners + <2 outs → check if runner default shows out → DP prompt
        const hasRunnerOut = (defaults.first?.to === 'out') || (defaults.second?.to === 'out') || (defaults.third?.to === 'out');
        if (hasRunnerOut) {
          setDpPrompt({ runnerAdv, rbi, defaults });
          return; // Deferred to handleDpPromptAnswer
        }
        // No runner out in defaults → standard GO, fall through
        await commitPlateAppearance({ type: 'out', outType: 'GO', runnerAdvancement: runnerAdv });
        logAction('GO');

      } else if (outcome === 'PO' && outs < 2 && bases.first && bases.second) {
        // D-7: PO with R1+R2 (or loaded) + <2 outs → IFR prompt
        setIfrPrompt({ runnerAdv, defaults });
        return; // Deferred to handleIfrPromptAnswer

      } else if (QUICK_BAR_HITS.includes(outcome)) {
        await commitPlateAppearance({ type: 'hit', hitType: outcome as HitType, rbi, runnerAdvancement: runnerAdv });
        logAction(`${outcome}${rbi > 0 ? ` — ${rbi} RBI` : ''}`);

      } else if (QUICK_BAR_WALKS.includes(outcome)) {
        await commitPlateAppearance({ type: 'walk', walkType: outcome as WalkType });
        logAction(`${outcome}`);

      } else if (outcome === 'FC') {
        // Fielder's Choice: batter reaches, lead runner out
        await commitPlateAppearance({ type: 'out', outType: 'FC', runnerAdvancement: runnerAdv });
        logAction('FC');

      } else if (outcome === 'D3K') {
        // Dropped 3rd strike — batter reached (1B empty or 2 outs)
        const d3kLegal = !bases.first || outs >= 2;
        await commitPlateAppearance({ type: 'out', outType: 'K', batterReached: d3kLegal, isDroppedThirdStrike: true });
        logAction(d3kLegal ? 'D3K (batter reached)' : 'D3K (batter out)');

      } else if (outcome === 'WP_K' || outcome === 'PB_K') {
        // Wild pitch / passed ball strikeout — K but batter reaches
        await commitPlateAppearance({ type: 'out', outType: 'K', batterReached: true, isDroppedThirdStrike: true });
        logAction(`${outcome} (K, batter reached)`);

      } else if (QUICK_BAR_OUTS.includes(outcome)) {
        await commitPlateAppearance({ type: 'out', outType: outcome as 'K' | 'GO' | 'FO' | 'LO' | 'PO' | 'DP' | 'TP' | 'SF' | 'SAC', runnerAdvancement: runnerAdv });
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
        eventId: getPendingAtBatIdentity().atBatEventId,
        inningLabel: shortInningLabel(),
        batterName: gameState.currentBatterName,
        result: outcome,
        resultCategory: qbResultCategory,
        rbi: QUICK_BAR_HITS.includes(outcome) ? rbi : 0,
        runsScored: rbi, // Quick Bar: runs scored = RBI (no separate tracking)
        hasFieldingData: false,
        hasLocationData: false,
        hasKType: outcome === 'Kc', // Kc is already typed; plain K needs distinction
        hasPitchCount: false,
        hasPitchType: false,
        isEnrichable: !qbNonEnrichable.includes(outcome),
        isQAB: ['BB', 'IBB', 'HBP'].includes(outcome) || QUICK_BAR_HITS.includes(outcome),
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
  }, [commitPlateAppearance, gameInitialized, gameState, undoSystem, logAction, runnerNames, pushPlayLogEntry, shortInningLabel, getPendingAtBatIdentity]);

  // ═══════════════════════════════════════════════════════════
  // D-4: HR inline prompt completion
  // ═══════════════════════════════════════════════════════════
  const handleHrPromptDone = useCallback(async () => {
    if (!hrPrompt) return;
    const { rbi, runnerAdv, defaults, distance, pitchType } = hrPrompt;

    // Attach enrichment if distance or pitch type provided
    if (distance || pitchType) {
      const enrichment: Record<string, unknown> = {};
      if (distance) enrichment.hrDistance = parseInt(distance, 10);
      if (pitchType) enrichment.pitchType = pitchType;
      setNextEventEnrichment(enrichment as NonNullable<import('../../../utils/eventLog').AtBatEvent['enrichment']>);
    }

    try {
      await commitPlateAppearance({ type: 'hit', hitType: 'HR', rbi, runnerAdvancement: runnerAdv });
      logAction(`HR${rbi > 0 ? ` — ${rbi} RBI` : ''}${distance ? ` (${distance} ft)` : ''}`);

      pushPlayLogEntry({
        eventId: getPendingAtBatIdentity().atBatEventId,
        inningLabel: shortInningLabel(),
        batterName: gameState.currentBatterName,
        result: 'HR',
        resultCategory: 'hit',
        rbi,
        runsScored: rbi,
        hasFieldingData: false,
        hasLocationData: false,
        hasKType: false,
        hasPitchCount: false,
        hasPitchType: !!pitchType,
        isEnrichable: true,
        isQAB: true,
      });

      // Update runner names (HR: all score, batter scores)
      setRunnerNames({});
    } catch (error) {
      console.error('[D-4] Failed to record HR:', error);
    }
    setHrPrompt(null);
  }, [commitPlateAppearance, gameState, hrPrompt, logAction, pushPlayLogEntry, setNextEventEnrichment, shortInningLabel, getPendingAtBatIdentity]);

  const handleHrPromptSkip = useCallback(async () => {
    if (!hrPrompt) return;
    const { rbi, runnerAdv } = hrPrompt;
    try {
      await commitPlateAppearance({ type: 'hit', hitType: 'HR', rbi, runnerAdvancement: runnerAdv });
      logAction(`HR${rbi > 0 ? ` — ${rbi} RBI` : ''}`);

      pushPlayLogEntry({
        eventId: getPendingAtBatIdentity().atBatEventId,
        inningLabel: shortInningLabel(),
        batterName: gameState.currentBatterName,
        result: 'HR',
        resultCategory: 'hit',
        rbi,
        runsScored: rbi,
        hasFieldingData: false,
        hasLocationData: false,
        hasKType: false,
        hasPitchCount: false,
        hasPitchType: false,
        isEnrichable: true,
        isQAB: true,
      });
      setRunnerNames({});
    } catch (error) {
      console.error('[D-4] Failed to record HR (skip):', error);
    }
    setHrPrompt(null);
  }, [commitPlateAppearance, gameState, hrPrompt, logAction, pushPlayLogEntry, shortInningLabel, getPendingAtBatIdentity]);

  const handleQuickErrorDetail = useCallback(async (positionLabel: keyof typeof POSITION_NUMBER) => {
    const fielderPosition = POSITION_NUMBER[positionLabel];
    const eventId = getPendingAtBatIdentity().atBatEventId;

    setNextEventEnrichment({
      fieldingSequence: [fielderPosition],
      errorFielder: fielderPosition,
    } as NonNullable<import('../../../utils/eventLog').AtBatEvent['enrichment']>);

    try {
      await commitPlateAppearance({ type: 'error', rbi: 0 });
      await persistFieldingEventsForPlayData({
        type: 'error',
        fieldingSequence: [fielderPosition],
        errorFielder: fielderPosition,
      }, 'quick error');
      logAction(`E${positionLabel}`);
      pushPlayLogEntry({
        eventId,
        inningLabel: shortInningLabel(),
        batterName: gameState.currentBatterName,
        result: 'E',
        resultCategory: 'error',
        rbi: 0,
        runsScored: 0,
        hasFieldingData: true,
        hasLocationData: false,
        hasKType: false,
        hasPitchCount: false,
        hasPitchType: false,
        isEnrichable: true,
        isQAB: false,
      });
    } catch (error) {
      console.error('[Quick Error] Failed to record error detail:', error);
    } finally {
      setExpandedOutcome(null);
    }
  }, [commitPlateAppearance, gameState.currentBatterName, getPendingAtBatIdentity, logAction, persistFieldingEventsForPlayData, pushPlayLogEntry, setNextEventEnrichment, shortInningLabel]);

  // ═══════════════════════════════════════════════════════════
  // D-3: Error flow prompt completion
  // ═══════════════════════════════════════════════════════════
  const handleErrorFlowComplete = useCallback(async (
    baseReached: string,
    fielderPosition: number,
    errorType: string,
  ) => {
    if (!errorFlow) return;

    undoSystem.captureSnapshot('Quick: E');

    // Build runner advancement for error (batter reaches specified base)
    // Runners use standard defaults for the error
    const runnerAdv: RunnerAdvancement = {};
    const bases = gameState.bases;
    // On error, advance existing runners by 1 base (standard default)
    if (bases.third) runnerAdv.fromThird = 'home';
    if (bases.second) runnerAdv.fromSecond = 'third';
    if (bases.first) runnerAdv.fromFirst = 'second';

    const rbi = 0; // Errors never get RBI per baseball rules

    // Set enrichment with fielder and error type info
    const enrichment: Record<string, unknown> = {};
    if (fielderPosition > 0) {
      enrichment.fieldingSequence = [fielderPosition];
      enrichment.errorFielder = fielderPosition;
    }
    if (errorType) enrichment.errorType = errorType;
    setNextEventEnrichment(enrichment as NonNullable<import('../../../utils/eventLog').AtBatEvent['enrichment']>);

    try {
      await commitPlateAppearance({ type: 'error', rbi, runnerAdvancement: runnerAdv });
      await persistFieldingEventsForPlayData({
        type: 'error',
        fieldingSequence: fielderPosition > 0 ? [fielderPosition] : [],
        errorFielder: fielderPosition || undefined,
        errorType: errorType || undefined,
      });
      logAction(`E${fielderPosition || ''}${errorType ? ` (${errorType})` : ''} — batter to ${baseReached}`);

      pushPlayLogEntry({
        eventId: getPendingAtBatIdentity().atBatEventId,
        inningLabel: shortInningLabel(),
        batterName: gameState.currentBatterName,
        result: 'E',
        resultCategory: 'error',
        rbi: 0,
        runsScored: bases.third ? 1 : 0,
        hasFieldingData: fielderPosition > 0,
        hasLocationData: false,
        hasKType: false,
        hasPitchCount: false,
        hasPitchType: false,
        isEnrichable: true,
        isQAB: false,
      });

      // Update runner names
      const newNames: { first?: string; second?: string; third?: string } = {};
      const batterName = gameState.currentBatterName;
      if (bases.second && !bases.third) newNames.third = runnerNames.second;
      if (bases.first && !bases.second) newNames.second = runnerNames.first;
      // Place batter
      if (baseReached === '1B') newNames.first = batterName;
      else if (baseReached === '2B') newNames.second = batterName;
      else if (baseReached === '3B') newNames.third = batterName;
      setRunnerNames(newNames);
    } catch (error) {
      console.error('[D-3] Failed to record error:', error);
    }
    setErrorFlow(null);
  }, [commitPlateAppearance, errorFlow, gameState, logAction, pushPlayLogEntry, runnerNames, setNextEventEnrichment, shortInningLabel, undoSystem, getPendingAtBatIdentity, persistFieldingEventsForPlayData]);

  // ═══════════════════════════════════════════════════════════
  // D-5: SF prompt answer — "Sac fly — run scores?"
  // ═══════════════════════════════════════════════════════════
  const handleSfPromptAnswer = useCallback(async (isYes: boolean) => {
    if (!sfPrompt) return;
    const { runnerAdv, defaults } = sfPrompt;
    try {
      if (isYes) {
        // SF: runner scores from 3rd, batter out, not an AB
        const sfAdv: RunnerAdvancement = { ...runnerAdv, fromThird: 'home' };
        await commitPlateAppearance({ type: 'out', outType: 'SF', runnerAdvancement: sfAdv });
        logAction('SF — run scores');

        pushPlayLogEntry({
          eventId: getPendingAtBatIdentity().atBatEventId,
          inningLabel: shortInningLabel(),
          batterName: gameState.currentBatterName,
          result: 'SF',
          resultCategory: 'out',
          rbi: 1,
          runsScored: 1,
          hasFieldingData: false, hasLocationData: false, hasKType: false,
          hasPitchCount: false, hasPitchType: false,
          isEnrichable: true, isQAB: false,
        });
      } else {
        // FO: runner holds, standard fly out
        const foAdv: RunnerAdvancement = { ...runnerAdv, fromThird: undefined };
        await commitPlateAppearance({ type: 'out', outType: 'FO', runnerAdvancement: Object.keys(foAdv).length > 0 ? foAdv : undefined });
        logAction('FO (R3 held)');

        pushPlayLogEntry({
          eventId: getPendingAtBatIdentity().atBatEventId,
          inningLabel: shortInningLabel(),
          batterName: gameState.currentBatterName,
          result: 'FO',
          resultCategory: 'out',
          rbi: 0, runsScored: 0,
          hasFieldingData: false, hasLocationData: false, hasKType: false,
          hasPitchCount: false, hasPitchType: false,
          isEnrichable: true, isQAB: false,
        });
      }

      // Update runner names
      const newNames: { first?: string; second?: string; third?: string } = {};
      if (isYes) {
        // R3 scored, others hold on FO (tag-up default)
        if (defaults.second?.to === 'second') newNames.second = runnerNames.second;
        if (defaults.first?.to === 'first') newNames.first = runnerNames.first;
      } else {
        // R3 held
        newNames.third = runnerNames.third;
        if (defaults.second?.to === 'second') newNames.second = runnerNames.second;
        if (defaults.first?.to === 'first') newNames.first = runnerNames.first;
      }
      setRunnerNames(newNames);
    } catch (error) {
      console.error('[D-5] Failed to record SF/FO:', error);
    }
    setSfPrompt(null);
  }, [commitPlateAppearance, gameState, logAction, pushPlayLogEntry, runnerNames, sfPrompt, shortInningLabel, getPendingAtBatIdentity]);

  // ═══════════════════════════════════════════════════════════
  // D-6: GO→DP prompt answer — "Double play?"
  // ═══════════════════════════════════════════════════════════
  const handleDpPromptAnswer = useCallback(async (isDP: boolean) => {
    if (!dpPrompt) return;
    const { runnerAdv, rbi, defaults } = dpPrompt;
    try {
      if (isDP) {
        await commitPlateAppearance({ type: 'out', outType: 'DP', runnerAdvancement: runnerAdv });
        logAction(`DP${rbi > 0 ? ` — ${rbi} RBI` : ''}`);

        pushPlayLogEntry({
          eventId: getPendingAtBatIdentity().atBatEventId,
          inningLabel: shortInningLabel(),
          batterName: gameState.currentBatterName,
          result: 'DP',
          resultCategory: 'out',
          rbi: 0, runsScored: 0, // DP never gets RBI
          hasFieldingData: false, hasLocationData: false, hasKType: false,
          hasPitchCount: false, hasPitchType: false,
          isEnrichable: true, isQAB: false,
        });
      } else {
        // Standard GO, no DP
        await commitPlateAppearance({ type: 'out', outType: 'GO', runnerAdvancement: runnerAdv });
        logAction('GO');

        pushPlayLogEntry({
          eventId: getPendingAtBatIdentity().atBatEventId,
          inningLabel: shortInningLabel(),
          batterName: gameState.currentBatterName,
          result: 'GO',
          resultCategory: 'out',
          rbi: rbi > 0 ? rbi : 0,
          runsScored: rbi,
          hasFieldingData: false, hasLocationData: false, hasKType: false,
          hasPitchCount: false, hasPitchType: false,
          isEnrichable: true, isQAB: false,
        });
      }

      // Update runner names from defaults
      const newNames: { first?: string; second?: string; third?: string } = {};
      if (defaults.third?.to === 'third') newNames.third = runnerNames.third;
      if (defaults.second?.to === 'second') newNames.second = runnerNames.second;
      if (defaults.second?.to === 'third') newNames.third = runnerNames.second;
      if (defaults.first?.to === 'first') newNames.first = runnerNames.first;
      if (defaults.first?.to === 'second') newNames.second = runnerNames.first;
      setRunnerNames(newNames);
    } catch (error) {
      console.error('[D-6] Failed to record GO/DP:', error);
    }
    setDpPrompt(null);
  }, [commitPlateAppearance, dpPrompt, gameState, logAction, pushPlayLogEntry, runnerNames, shortInningLabel, getPendingAtBatIdentity]);

  // ═══════════════════════════════════════════════════════════
  // D-7: IFR prompt answer — "Infield Fly Rule?"
  // ═══════════════════════════════════════════════════════════
  const handleIfrPromptAnswer = useCallback(async (isIFR: boolean) => {
    if (!ifrPrompt) return;
    const { runnerAdv, defaults } = ifrPrompt;
    try {
      if (isIFR) {
        // IFR: batter OUT immediately, removes force on runners
        // Set enrichment with IFR modifier
        setNextEventEnrichment({ modifiers: ['ifr'] } as NonNullable<import('../../../utils/eventLog').AtBatEvent['enrichment']>);
      }
      // Either way it's a PO — IFR just adds the modifier
      await commitPlateAppearance({ type: 'out', outType: 'PO', runnerAdvancement: runnerAdv });
      logAction(`PO${isIFR ? ' (IFR)' : ''}`);

      pushPlayLogEntry({
        eventId: getPendingAtBatIdentity().atBatEventId,
        inningLabel: shortInningLabel(),
        batterName: gameState.currentBatterName,
        result: 'PO',
        resultCategory: 'out',
        rbi: 0, runsScored: 0,
        hasFieldingData: false, hasLocationData: false, hasKType: false,
        hasPitchCount: false, hasPitchType: false,
        isEnrichable: true, isQAB: false,
      });

      // Update runner names (runners hold on PO)
      const newNames: { first?: string; second?: string; third?: string } = {};
      if (defaults.third?.to === 'third') newNames.third = runnerNames.third;
      if (defaults.second?.to === 'second') newNames.second = runnerNames.second;
      if (defaults.first?.to === 'first') newNames.first = runnerNames.first;
      setRunnerNames(newNames);
    } catch (error) {
      console.error('[D-7] Failed to record PO/IFR:', error);
    }
    setIfrPrompt(null);
  }, [commitPlateAppearance, gameState, ifrPrompt, logAction, pushPlayLogEntry, runnerNames, setNextEventEnrichment, shortInningLabel, getPendingAtBatIdentity]);

  // EXH-016: Handle fielder credit confirmation - continue processing the play with credits
  const handleFielderCreditConfirm = useCallback(async (credits: FielderCredit[]) => {
    console.log('[EXH-016] Fielder credits confirmed:', credits);
    setFielderCreditModalOpen(false);

    // Get the pending play data
    const pendingPlay = pendingPlayForFielderCredit;
    if (!pendingPlay) {
      console.error('[EXH-016] No pending play data for fielder credit');
      return;
    }
    const { playData, atBatEventId, atBatEventIndex } = pendingPlay;

    // Clear the pending state
    setPendingPlayForFielderCredit(null);
    setRunnersOutForCredit([]);

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
      const atBatIdentity = { atBatEventId, atBatEventIndex };

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
        await commitPlateAppearance({ type: 'hit', hitType: 'HR', rbi, runnerAdvancement });
      } else if (playData.type === 'hit') {
        const hitType = playData.hitType || '1B';
        const rbi = calculateRBIFromOutcomes();
        await commitPlateAppearance({ type: 'hit', hitType: hitType as HitType, rbi, runnerAdvancement });
      } else if (playData.type === 'out') {
        await commitPlateAppearance(buildPlateAppearanceActionFromPlayData(playData, runnerAdvancement));
      } else if (playData.type === 'foul_out') {
        await commitPlateAppearance({ type: 'out', outType: 'FO', runnerAdvancement });
      } else if (playData.type === 'walk') {
        await commitPlateAppearance({ type: 'walk', walkType: playData.walkType || 'BB' });
      }

      // Log fielding events for fWAR pipeline (same as handleEnhancedPlayComplete)
      if (playData.type !== 'walk' && playData.type !== 'foul_ball') {
        try {
          await persistFieldingEventsForPlayData(playData, 'fielder credit path', atBatIdentity);
          await persistRunnerOutCredits(playData, credits, atBatIdentity, { recordUserEdit: true });
        } catch (err) {
          console.error('[Fielding] Failed to log fielding events:', err);
        }
      }

      console.log('[EXH-016] Play recorded with fielder credits');
    } catch (error) {
      console.error('[EXH-016] Failed to record play:', error);
    }
  }, [buildPlateAppearanceActionFromPlayData, commitPlateAppearance, gameState, pendingPlayForFielderCredit, setNextEventEnrichment, undoSystem, persistFieldingEventsForPlayData, persistRunnerOutCredits]);

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
  const handleErrorOnAdvanceConfirm = useCallback(async (results: ErrorOnAdvanceResult[]) => {
    setErrorOnAdvanceModalOpen(false);

    const attributedErrors = results.filter((result) =>
      result.wasError &&
      !!result.errorType &&
      !!result.errorFielder &&
      result.errorFielder in POSITION_NUMBER
    );

    results.forEach((result) => {
      if (result.wasError && result.errorType && result.errorFielder) {
        console.log(`[EXH-025] Error on advance: ${result.runnerName} ${result.fromBase} → ${result.toBase}, ` +
          `${result.errorType} error by ${result.errorFielder}`);
      } else {
        console.log(`[EXH-025] No error: ${result.runnerName} ${result.fromBase} → ${result.toBase} (good baserunning)`);
      }
    });

    if (pendingPlayForErrorOnAdvance && attributedErrors.length > 0) {
      try {
        const existingAtBat = await getAtBatEvent(pendingPlayForErrorOnAdvance.atBatEventId);
        const fieldingContext = buildFieldingContext(pendingPlayForErrorOnAdvance);
        const startingSequence = extractFieldingEvents(
          pendingPlayForErrorOnAdvance.playData,
          fieldingContext,
        ).length;
        const supplementalEvents = extractSupplementalAdvanceErrorEvents(
          pendingPlayForErrorOnAdvance.playData,
          attributedErrors.map((result, index) => ({
            errorFielder: result.errorFielder as Position,
            errorType: result.errorType,
            sequence: startingSequence + index,
          })),
          fieldingContext,
        );
        const enrichmentErrors = attributedErrors.map((result) => ({
          position: POSITION_NUMBER[result.errorFielder as keyof typeof POSITION_NUMBER],
          type: result.errorType!.toLowerCase() as 'fielding' | 'throwing' | 'mental',
        }));
        const existingFieldingEvents = await getFieldingEventsForAtBat(pendingPlayForErrorOnAdvance.atBatEventId);
        if (existingAtBat) {
          const timestamp = Date.now();
          await updateAtBatEventWithFieldingSync(
            pendingPlayForErrorOnAdvance.atBatEventId,
            {
              enrichment: {
                errors: enrichmentErrors,
              },
              version: (existingAtBat.version ?? 1) + 1,
              editHistory: [{
                field: 'enrichment.errors',
                oldValue: existingAtBat.enrichment?.errors ?? null,
                newValue: enrichmentErrors,
                timestamp,
              }],
            },
            [...existingFieldingEvents, ...supplementalEvents],
          );
        }

        setEnrichmentCache((prev) => ({
          ...prev,
          [pendingPlayForErrorOnAdvance.atBatEventId]: {
            ...(prev[pendingPlayForErrorOnAdvance.atBatEventId] || {}),
            errors: enrichmentErrors,
          },
        }));

        pushActivityLog(`[Fielding] Logged ${supplementalEvents.length} advancement error attribution event(s)`);
      } catch (error) {
        console.error('[EXH-025] Failed to persist advancement error attribution:', error);
      }
    }

    setPendingPlayForErrorOnAdvance(null);
    setRunnersWithExtraAdvance([]);
  }, [buildFieldingContext, pendingPlayForErrorOnAdvance, pushActivityLog]);

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

      const normalizedEventType = normalizeSpecialEventType(event.eventType);
      if (!normalizedEventType) {
        return;
      }

      const leadRunner = getLeadRunnerIdentity();
      const resolvedRunnerId = event.runnerId || (normalizedEventType === 'TOOTBLAN' ? leadRunner.runnerId : undefined);
      const resolvedRunnerName = normalizedEventType === 'TOOTBLAN' ? leadRunner.runnerName : undefined;
      const fielderId = event.fielderName
        ? getRosterIdFromName(event.fielderName, fieldingTeam, event.fielderPosition === 1 ? 'pitcher' : 'player')
        : undefined;
      const actorId = normalizedEventType === 'WEB_GEM' || normalizedEventType === 'ROBBERY'
        ? fielderId
        : resolvedRunnerId;

      await recordEvent(normalizedEventType, actorId, {
        runnerId: resolvedRunnerId,
        runnerName: resolvedRunnerName,
        fielderId,
        fielderName: event.fielderName,
        fielderPosition: event.fielderPosition,
      });
      console.log(`${event.eventType} recorded - fielder: ${event.fielderName}, position: ${event.fielderPosition}, runner: ${event.runnerId}`);
    } catch (error) {
      console.error('Failed to record special event:', error);
    }
  }, [fieldingTeam, getLeadRunnerIdentity, getRosterIdFromName, recordEvent, undoSystem]);

  const triggerManualSpecialEvent = useCallback((eventType: SpecialEventData['eventType']) => {
    const leadRunner = getLeadRunnerIdentity();
    void handleSpecialEvent({
      eventType,
      runnerId: eventType === 'TOOTBLAN' ? leadRunner.runnerId : undefined,
      fielderPosition: eventType === 'KILLED_PITCHER' || eventType === 'NUT_SHOT' ? 1 : undefined,
      fielderName: eventType === 'KILLED_PITCHER' || eventType === 'NUT_SHOT' ? resolvedCurrentPitcherName : undefined,
    });
  }, [getLeadRunnerIdentity, handleSpecialEvent, resolvedCurrentPitcherName]);

  const handleSubstitution = useCallback((teamType: 'away' | 'home', benchPlayerName: string, lineupPlayerName: string) => {
    console.log(`Substitution: ${benchPlayerName} replacing ${lineupPlayerName} on ${teamType} team`);

    const benchPlayerId = getPlayerIdFromName(benchPlayerName, teamType);
    const lineupPlayerId = getPlayerIdFromName(lineupPlayerName, teamType);

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
  }, [awayTeamPlayers, getPlayerIdFromName, homeTeamPlayers, makeSubstitution]);

  const handlePitcherSubstitution = (teamType: 'away' | 'home', newPitcherName: string, replacedName: string, replacedType: 'player' | 'pitcher') => {
    console.log(`Pitcher Substitution: ${newPitcherName} replacing ${replacedName} (${replacedType}) on ${teamType} team`);

    const newPitcherId = getPitcherIdFromName(newPitcherName, teamType);
    const exitingPitcherId = getPitcherIdFromName(replacedName, teamType);

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
    const runnerName = runnerNames[base] || `R${base === 'first' ? '1' : base === 'second' ? '2' : '3'}`;
    setActiveRunnerPopover({
      base,
      runnerName,
      playerId: getPlayerIdFromName(runnerName, battingTeam),
      anchorPosition,
    });
  }, [battingTeam, getPlayerIdFromName, runnerNames]);

  const closeRunnerPopover = useCallback(() => {
    setActiveRunnerPopover(null);
  }, []);

  const nextBaseMap: Record<RunnerBase, 'second' | 'third' | 'home'> = {
    first: 'second', second: 'third', third: 'home',
  };

  const handleRunnerSteal = useCallback((base: RunnerBase) => {
    undoSystem.captureSnapshot(`SB: ${base} → ${nextBaseMap[base]}`);
    advanceRunner(base, nextBaseMap[base], 'safe');
    void recordEvent('SB', activeRunnerPopover?.playerId, {
      runnerId: activeRunnerPopover?.playerId,
      runnerName: activeRunnerPopover?.runnerName,
      fromBase: base,
      toBase: nextBaseMap[base],
      outcome: 'safe',
    });
    setActiveRunnerPopover(null);
  }, [activeRunnerPopover?.playerId, activeRunnerPopover?.runnerName, advanceRunner, recordEvent, undoSystem]);

  const handleRunnerAdvance = useCallback((base: RunnerBase, dest?: 'second' | 'third' | 'home') => {
    const to = dest || nextBaseMap[base];
    undoSystem.captureSnapshot(`Advance: ${base} → ${to}`);
    advanceRunner(base, to, 'safe');
    void recordEvent('ADVANCE', activeRunnerPopover?.playerId, {
      runnerId: activeRunnerPopover?.playerId,
      runnerName: activeRunnerPopover?.runnerName,
      fromBase: base,
      toBase: to,
      outcome: 'safe',
    });
    setActiveRunnerPopover(null);
  }, [activeRunnerPopover?.playerId, activeRunnerPopover?.runnerName, advanceRunner, recordEvent, undoSystem]);

  const handleRunnerWP = useCallback((base: RunnerBase, dest?: 'second' | 'third' | 'home') => {
    const to = dest || nextBaseMap[base];
    undoSystem.captureSnapshot(`WP: ${base} → ${to}`);
    advanceRunner(base, to, 'safe');
    void recordEvent('WP', activeRunnerPopover?.playerId, {
      runnerId: activeRunnerPopover?.playerId,
      runnerName: activeRunnerPopover?.runnerName,
      fromBase: base,
      toBase: to,
      outcome: 'safe',
    });
    setActiveRunnerPopover(null);
  }, [activeRunnerPopover?.playerId, activeRunnerPopover?.runnerName, advanceRunner, recordEvent, undoSystem]);

  const handleRunnerPB = useCallback((base: RunnerBase, dest?: 'second' | 'third' | 'home') => {
    const to = dest || nextBaseMap[base];
    undoSystem.captureSnapshot(`PB: ${base} → ${to}`);
    advanceRunner(base, to, 'safe');
    void recordEvent('PB', activeRunnerPopover?.playerId, {
      runnerId: activeRunnerPopover?.playerId,
      runnerName: activeRunnerPopover?.runnerName,
      fromBase: base,
      toBase: to,
      outcome: 'safe',
    });
    setActiveRunnerPopover(null);
  }, [activeRunnerPopover?.playerId, activeRunnerPopover?.runnerName, advanceRunner, recordEvent, undoSystem]);

  const handleRunnerPickoff = useCallback((base: RunnerBase, outcome: 'safe' | 'out' | 'error') => {
    undoSystem.captureSnapshot(`Pickoff ${outcome}: ${base}`);
    if (outcome === 'out') {
      // D-2: Runner is out at their current base
      advanceRunner(base, nextBaseMap[base], 'out');
      void recordEvent('PICK', activeRunnerPopover?.playerId, {
        runnerId: activeRunnerPopover?.playerId,
        runnerName: activeRunnerPopover?.runnerName,
        fromBase: base,
        toBase: 'out',
        outcome: 'out',
      });
    } else if (outcome === 'error') {
      // D-2: Error on pickoff — runner advances one base
      advanceRunner(base, nextBaseMap[base], 'safe');
      void recordEvent('PICK_E', activeRunnerPopover?.playerId, {
        runnerId: activeRunnerPopover?.playerId,
        runnerName: activeRunnerPopover?.runnerName,
        fromBase: base,
        toBase: nextBaseMap[base],
        outcome: 'safe',
      });
    } else {
      // D-2: Safe — attempt logged, runner stays
      void recordEvent('PICK_SAFE', activeRunnerPopover?.playerId, {
        runnerId: activeRunnerPopover?.playerId,
        runnerName: activeRunnerPopover?.runnerName,
        fromBase: base,
        toBase: base,
        outcome: 'safe',
      });
    }
    setActiveRunnerPopover(null);
  }, [activeRunnerPopover?.playerId, activeRunnerPopover?.runnerName, advanceRunner, recordEvent, undoSystem]);

  const handleRunnerSubstitute = useCallback((base: RunnerBase) => {
    setActiveRunnerPopover(null);
    setLineupOverlayHint(`Pinch runner requested for ${base.toUpperCase()}. Use the LINEUP panel to complete the substitution.`);
    setShowLineupOverlay(true);
  }, []);

  // ============================================
  // FIELDER POPOVER HANDLERS (Layer 4 — tickets 4.3, 4.5)
  // ============================================

  const handleFielderTap = useCallback((positionNumber: number, playerName: string, anchorPosition: { left: string; top: string }) => {
    setActiveRunnerPopover(null); // Close any open runner popover
    // Map position number to label
    const posLabels: Record<number, string> = { 1: 'P', 2: 'C', 3: '1B', 4: '2B', 5: '3B', 6: 'SS', 7: 'LF', 8: 'CF', 9: 'RF' };
    const positionLabel = posLabels[positionNumber] || `P${positionNumber}`;
    const playerId = getRosterIdFromName(playerName, fieldingTeam);
    const isCurrentBatter = playerName === resolvedCurrentBatterName;

    setActiveFielderPopover({
      fielder: { positionNumber, positionLabel, playerName, playerId, isCurrentBatter },
      anchorPosition,
    });
  }, [fieldingTeam, getRosterIdFromName, resolvedCurrentBatterName]);

  const handleFielderPlayerCard = useCallback(() => {
    if (!activeFielderPopover) return;
    openPlayerCard(activeFielderPopover.fielder.playerName, fieldingTeam, activeFielderPopover.fielder.positionNumber === 1 ? 'pitcher' : 'batter');
    setActiveFielderPopover(null);
  }, [activeFielderPopover, fieldingTeam, openPlayerCard]);

  const handleRunnerPlayerCard = useCallback(() => {
    if (!activeRunnerPopover) return;
    setSelectedPlayer({ name: activeRunnerPopover.runnerName, type: 'batter', playerId: activeRunnerPopover.playerId });
    setActiveRunnerPopover(null);
  }, [activeRunnerPopover]);

  const closeFielderPopover = useCallback(() => {
    setActiveFielderPopover(null);
  }, []);

  const handleFielderSubstitute = useCallback((benchPlayerId: string, benchPlayerName: string, fielderId: string, fielderName: string) => {
    const fieldingPlayers = fieldingTeam === 'home' ? homeTeamPlayers : awayTeamPlayers;
    const outgoingPlayer = fieldingPlayers.find((player) => player.name === fielderName);

    handleLineupCardSubstitution({
      type: 'player_sub',
      incomingPlayerId: benchPlayerId,
      incomingPlayerName: benchPlayerName,
      outgoingPlayerId: fielderId,
      outgoingPlayerName: fielderName,
      newPosition: outgoingPlayer?.position,
      lineupSpot: outgoingPlayer?.battingOrder,
    });
    setActiveFielderPopover(null);
  }, [awayTeamPlayers, fieldingTeam, handleLineupCardSubstitution, homeTeamPlayers]);

  const handleFielderPinchHit = useCallback((benchPlayerId: string, benchPlayerName: string, fielderId: string, fielderName: string) => {
    const battingPlayers = battingTeam === 'home' ? homeTeamPlayers : awayTeamPlayers;
    const outgoingPlayer = battingPlayers.find((player) => player.name === fielderName);

    handleLineupCardSubstitution({
      type: 'player_sub',
      incomingPlayerId: benchPlayerId,
      incomingPlayerName: benchPlayerName,
      outgoingPlayerId: fielderId,
      outgoingPlayerName: fielderName,
      newPosition: outgoingPlayer?.position,
      lineupSpot: outgoingPlayer?.battingOrder,
    });
    setActiveFielderPopover(null);
  }, [awayTeamPlayers, battingTeam, handleLineupCardSubstitution, homeTeamPlayers]);

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
      handlePitcherSubstitution(fieldingTeam, firstAvailable.name, resolvedCurrentPitcherName, 'pitcher');
    }
  }, [availablePitchers, fieldingTeam, handlePitcherSubstitution, resolvedCurrentPitcherName]);

  const handleBatterTap = useCallback(() => {
    openPlayerCard(resolvedCurrentBatterName, battingTeam, 'batter');
  }, [battingTeam, openPlayerCard, resolvedCurrentBatterName]);

  // Bench players for fielder popover (fielding team bench)
  const fielderPopoverBenchPlayers: BenchPlayerInfo[] = useMemo(() => {
    const fieldingPlayers = fieldingTeam === 'home' ? homeTeamPlayers : awayTeamPlayers;
    return fieldingPlayers
      .filter(p => p.battingOrder === undefined)
      .map(p => ({
        id: getRosterIdFromName(p.name, fieldingTeam),
        name: p.name,
        position: p.position || 'UT',
        isUsed: p.isOutOfGame || false,
      }));
  }, [awayTeamPlayers, fieldingTeam, getRosterIdFromName, homeTeamPlayers]);

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
        await commitPlateAppearance({
          type: 'hit',
          hitType: pendingOutcome.subType as HitType,
          rbi: pendingOutcome.rbi || 0,
        });
        logAction(`${pendingOutcome.subType} (manual) — ${pendingOutcome.rbi || 0} RBI`);
      } else if (pendingOutcome.type === 'out') {
        // GAP-GT-6-A: Pass forceNoRuns when user has toggled the time play override
        await commitPlateAppearance({
          type: 'out',
          outType: pendingOutcome.subType as OutType,
          forceNoRuns: timePlayNoRun,
        });
        logAction(`Out (${pendingOutcome.subType}) (manual entry)${timePlayNoRun ? ' [time play — no run]' : ''}`);
        setTimePlayNoRun(false); // Reset time play toggle after recording
      } else if (pendingOutcome.type === 'walk') {
        await commitPlateAppearance({ type: 'walk', walkType: pendingOutcome.subType as WalkType });
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
  }, [commitPlateAppearance, logAction, pendingOutcome, timePlayNoRun]);

  // Cancel pending outcome
  const handleCancelOutcome = useCallback(() => {
    setPendingOutcome(null);
    setExpandedOutcome(null);
    setTimePlayNoRun(false); // GAP-GT-6-A: Always reset on cancel
  }, []);

  // Handle end of inning
  const handleEndInning = useCallback(() => {
    // Layer 5 (§4.4): Check for unenriched plays before transitioning
    const currentHalfPlays = playLogEntries.filter(e => e.inningLabel === shortInningLabel());
    const unenriched = currentHalfPlays.filter(e =>
      e.isEnrichable && (!e.hasPitchType || !e.hasLocationData || !e.hasFieldingData)
    );
    if (unenriched.length > 0) {
      setUnenrichedCount(unenriched.length);
      setShowEnrichmentPrompt(true);
    }

    endInning();
    // Clear runner names when inning ends (bases are cleared)
    setRunnerNames({});
  }, [endInning, playLogEntries, shortInningLabel]);

  // ══════════════════════════════════════════════════════════════
  // LAYER 5: ENRICHMENT HANDLERS
  // ══════════════════════════════════════════════════════════════

  // 5.1: Open enrichment panel for a play log entry
  const handleEntryTap = useCallback((entry: PlayLogEntry) => {
    if (!entry.isEnrichable) return;
    setEnrichingEntry(prev => prev?.id === entry.id ? null : entry);
  }, []);

  const canUseMainFieldLocation = !!enrichingEntry && ['1B', '2B', '3B', 'GRD', 'HR', 'GO', 'FO', 'LO', 'PO', 'DP', 'TP', 'FC', 'SF', 'SAC'].includes(enrichingEntry.result);

  // 5.1: Save enrichment field immediately (auto-save on change)
  const handleEnrichmentUpdate = useCallback(async (field: keyof EnrichmentUpdate, value: unknown) => {
    if (!enrichingEntry?.eventId) return;

    const update: Partial<import('../../../utils/eventLog').AtBatEvent['enrichment']> = {
      [field]: value,
    };

    try {
      const existingAtBat = await getAtBatEvent(enrichingEntry.eventId);
      if (!existingAtBat) {
        return;
      }

      const timestamp = Date.now();
      const nextVersion = (existingAtBat.version ?? 1) + 1;
      const editHistory: NonNullable<AtBatEvent['editHistory']> = [{
        field: `enrichment.${String(field)}`,
        oldValue: existingAtBat.enrichment?.[field as keyof NonNullable<AtBatEvent['enrichment']>] ?? null,
        newValue: value,
        timestamp,
      }];
      const shouldMarkQualityAtBat = field === 'pitchesInAtBat' && (value as number) >= 7 && !existingAtBat.isQualityAtBat;
      if (shouldMarkQualityAtBat) {
        editHistory.push({
          field: 'isQualityAtBat',
          oldValue: existingAtBat.isQualityAtBat ?? false,
          newValue: true,
          timestamp,
        });
      }

      if (field === 'fieldingSequence') {
        const syncedFieldingEvents = await buildFieldingSyncEventsForSequenceEdit(
          existingAtBat,
          value as number[],
        );
        await updateAtBatEventWithFieldingSync(
          enrichingEntry.eventId,
          {
            enrichment: update as NonNullable<AtBatEvent['enrichment']>,
            version: nextVersion,
            editHistory,
            ...(shouldMarkQualityAtBat ? { isQualityAtBat: true } : {}),
          },
          syncedFieldingEvents,
        );
      } else {
        await updateAtBatEvent(enrichingEntry.eventId, {
          enrichment: update as NonNullable<AtBatEvent['enrichment']>,
          version: nextVersion,
          editHistory,
          ...(shouldMarkQualityAtBat ? { isQualityAtBat: true } : {}),
        });
      }

      // Update local cache
      setEnrichmentCache(prev => ({
        ...prev,
        [enrichingEntry.eventId!]: { ...(prev[enrichingEntry.eventId!] || {}), ...update },
      }));

      // Update PlayLogEntry flags
      setPlayLogEntries(prev => prev.map(e => {
        if (e.id !== enrichingEntry.id) return e;
        const updated = { ...e };
        if (field === 'fieldLocation') updated.hasLocationData = true;
        if (field === 'fieldingSequence') updated.hasFieldingData = true;
        if (field === 'pitchType') updated.hasPitchType = true;
        if (field === 'pitchesInAtBat') {
          updated.hasPitchCount = true;
          if (shouldMarkQualityAtBat) {
            updated.isQAB = true;
          }
        }
        return updated;
      }));

      // Update the enrichingEntry itself so panel reflects changes
      setEnrichingEntry(prev => prev ? { ...prev,
        hasLocationData: field === 'fieldLocation' ? true : prev.hasLocationData,
        hasFieldingData: field === 'fieldingSequence' ? true : prev.hasFieldingData,
        hasPitchType: field === 'pitchType' ? true : prev.hasPitchType,
        hasPitchCount: field === 'pitchesInAtBat' ? true : prev.hasPitchCount,
        isQAB: shouldMarkQualityAtBat ? true : prev.isQAB,
      } : null);

    } catch (err) {
      console.error('[Enrichment] Failed to save:', err);
    }
  }, [buildFieldingSyncEventsForSequenceEdit, enrichingEntry]);

  const handleMainFieldLocationPick = useCallback((coord: { x: number; y: number }) => {
    if (!canUseMainFieldLocation || !enrichingEntry) return;
    void handleEnrichmentUpdate('fieldLocation', {
      x: Math.round(coord.x * 100),
      y: Math.round((1 - coord.y) * 100),
    });
  }, [canUseMainFieldLocation, enrichingEntry, handleEnrichmentUpdate]);

  // 5.2: K/Kc toggle — updates result field on AtBatEvent
  const handleKToggle = useCallback(async (entry: PlayLogEntry) => {
    if (!entry.eventId) return;
    const newResult = entry.result === 'K' ? 'Kc' : 'K';
    try {
      const existingAtBat = await getAtBatEvent(entry.eventId);
      if (!existingAtBat) {
        return;
      }
      const timestamp = Date.now();
      await updateAtBatEvent(entry.eventId, {
        result: newResult as import('../../../types/game').AtBatResult,
        version: (existingAtBat.version ?? 1) + 1,
        editHistory: [{ field: 'result', oldValue: existingAtBat.result, newValue: newResult, timestamp }],
      });
      setPlayLogEntries(prev => prev.map(e =>
        e.id === entry.id ? { ...e, result: newResult, hasKType: true } : e
      ));
    } catch (err) {
      console.error('[K Toggle] Failed:', err);
    }
  }, []);

  // 5.1: Close enrichment panel
  const handleEnrichmentClose = useCallback(() => {
    setEnrichingEntry(null);
  }, []);

  // 5.7: Dismiss between-inning enrichment prompt
  const handleEnrichmentPromptYes = useCallback(() => {
    setShowEnrichmentPrompt(false);
    // Find first unenriched play and open its panel
    const firstUnenriched = playLogEntries.find(e =>
      e.isEnrichable && (!e.hasPitchType || !e.hasLocationData || !e.hasFieldingData)
    );
    if (firstUnenriched) {
      setEnrichingEntry(firstUnenriched);
    }
  }, [playLogEntries]);

  const handleEnrichmentPromptSkip = useCallback(() => {
    setShowEnrichmentPrompt(false);
  }, []);

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

      const computedSeasonId = competitionType === 'elimination'
        ? undefined
        : (navigationState?.seasonId
          ?? (navigationState?.franchiseId
            ? `${navigationState.franchiseId}-season-${navigationState?.seasonNumber ?? 1}`
            : `season-${navigationState?.seasonNumber ?? 1}`));
      const computedStatsScopeId = statsScopeId
        ?? computedSeasonId
        ?? `season-${navigationState?.seasonNumber ?? 1}`;
      pushActivityLog(
        `[Game End] ${homeTeamName} ${gameState.homeScore} - ${awayTeamName} ${gameState.awayScore} (Inning ${gameState.inning})`
      );
    const endGameOptions = {
      activityLog,
      seasonId: computedSeasonId,
      statsScopeId: computedStatsScopeId,
      competitionType,
      competitionId,
      franchiseId: navigationState?.franchiseId,
      currentSeason: navigationState?.seasonNumber ?? 1,
      stadiumName: selectedStadium,
      };
      await hookEndGame(endGameOptions);

      // Save mojo/fitness snapshots for elimination inter-game persistence
      if (navigationState?.gameMode === 'elimination' && navigationState?.eliminationId) {
        try {
          const { saveMojoFitnessSnapshots } = await import('../../../utils/mojoFitnessStorage');
          const allPlayers = playerStateHook.getAllPlayers();
          await saveMojoFitnessSnapshots(
            navigationState.eliminationId,
            allPlayers.map((p) => ({
              playerId: p.playerId,
              mojoLevel: p.gameState.currentMojo,
              fitnessState: p.fitnessProfile.currentFitness,
            }))
          );
          console.log(`[Elimination] Saved mojo/fitness snapshots for ${allPlayers.length} players`);
        } catch (err) {
          console.error('[Elimination] Failed to save mojo/fitness snapshots:', err);
        }
      }

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
          eliminationId: navigationState?.eliminationId,
          seasonId: computedSeasonId,
          statsScopeId: computedStatsScopeId,
          competitionType,
          competitionId,
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
  }, [hookEndGame, navigate, gameId, navigationState?.gameMode, navigationState?.eliminationId, navigationState?.franchiseId, navigationState?.seasonId, navigationState?.seasonNumber, gameMode, gameState, pitcherStats, fameTrackingHook, homeFanMorale, awayFanMorale, homeTeamName, awayTeamName, mwarHook, homeManagerId, homeTeamId, activityLog, pushActivityLog, playerStateHook, competitionType, competitionId, statsScopeId, selectedStadium]);

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

      {/* D-17: Manager Moment — now a subtle indicator on QuickBar (see QuickBar managerMomentActive prop) */}
      {/* The inline Call/Skip panel opens in ZONE 4 when user taps the lightning indicator */}

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
          gridTemplateColumns: 'minmax(248px, 300px) 1fr minmax(184px, 228px)',
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
            currentBatterName={currentBatterDisplayName}
            currentPitcherName={currentPitcherDisplayName}
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
              const mojo = getPlayerMojoByName(resolvedCurrentBatterName, team);
              return mojo !== undefined ? toMojoLabel(mojo) : undefined;
            })()}
            batterMojoColor={(() => {
              const team = gameState.isTop ? 'away' : 'home';
              const mojo = getPlayerMojoByName(resolvedCurrentBatterName, team);
              return mojo !== undefined ? getMojoColor(mojo) : undefined;
            })()}
            batterFitness={(() => {
              const team = gameState.isTop ? 'away' : 'home';
              const fitness = getPlayerFitnessByName(resolvedCurrentBatterName, team);
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
              const mojo = getPlayerMojoByName(resolvedCurrentPitcherName, team);
              return mojo !== undefined ? toMojoLabel(mojo) : undefined;
            })()}
            pitcherMojoColor={(() => {
              const team = gameState.isTop ? 'home' : 'away';
              const mojo = getPlayerMojoByName(resolvedCurrentPitcherName, team);
              return mojo !== undefined ? getMojoColor(mojo) : undefined;
            })()}
            pitcherFitness={(() => {
              const team = gameState.isTop ? 'home' : 'away';
              const fitness = getPlayerFitnessByName(resolvedCurrentPitcherName, team);
              return fitness ? toFitnessLabel(fitness) : undefined;
            })()}
            pitcherHand={(() => {
              const pitcher = gameState.isTop ? homePitcher : awayPitcher;
              return pitcher?.throwingHand;
            })()}
            showScoreboard={true}
            onBatterTap={handleBatterTap}
            onPitcherTap={availablePitchers.length > 0 ? handlePitcherTap : undefined}
          />
        </div>

        {/* ZONE 2: Diamond — center (D-9: scoreboard moved to FenwayBoard left panel) */}
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
            currentBatterName={currentBatterDisplayName}
            zoomLevel={fieldZoomLevel}
            onRunnerTap={handleRunnerTap}
            onFielderTap={handleFielderTap}
            onBatterTap={handleBatterTap}
            onFieldTap={(coord) => handleMainFieldLocationPick(coord)}
            hideActionSelector={true}
          />

          {/* Runner Popover — tap runner on diamond → action menu (§5.1) */}
          {activeRunnerPopover && (
            <RunnerPopover
              base={activeRunnerPopover.base}
              runnerName={activeRunnerPopover.runnerName}
              anchorPosition={activeRunnerPopover.anchorPosition}
              onSteal={handleRunnerSteal}
              onAdvance={handleRunnerAdvance}
              onWildPitch={handleRunnerWP}
              onPassedBall={handleRunnerPB}
              onPickoff={handleRunnerPickoff}
              onSubstitute={handleRunnerSubstitute}
              onViewPlayerCard={handleRunnerPlayerCard}
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
              onViewPlayerCard={handleFielderPlayerCard}
              onClose={closeFielderPopover}
            />
          )}
        </div>

        {/* ZONE 3: Play Log + Enrichment Panel — right panel, spans both rows */}
        <div style={{ gridColumn: '3', gridRow: '1 / 3' }} className="flex flex-col h-full overflow-hidden">
          {/* Between-inning enrichment prompt (Ticket 5.7) */}
          {showEnrichmentPrompt && (
            <div className="bg-[#C4A853]/20 border-b border-[#C4A853] px-2 py-1 flex items-center gap-1 flex-shrink-0">
              <span className="text-[8px] text-[#C4A853] flex-1">
                {unenrichedCount} play{unenrichedCount !== 1 ? 's' : ''} unenriched
              </span>
              <button
                onClick={handleEnrichmentPromptYes}
                className="text-[7px] text-[#34d399] bg-[#064e3b]/60 px-1.5 py-0.5 rounded hover:bg-[#064e3b]"
              >
                Enrich
              </button>
              <button
                onClick={handleEnrichmentPromptSkip}
                className="text-[7px] text-[#6b7280] bg-[#1f2937]/60 px-1.5 py-0.5 rounded hover:bg-[#1f2937]"
              >
                Skip
              </button>
            </div>
          )}

          {enrichingEntry !== null ? (
            /* Enrichment panel replaces play log when active */
            <EnrichmentPanel
              entry={enrichingEntry}
              currentEnrichment={enrichingEntry.eventId ? enrichmentCache[enrichingEntry.eventId] : undefined}
              onUpdate={handleEnrichmentUpdate}
              onClose={handleEnrichmentClose}
              useMainFieldForLocation={canUseMainFieldLocation}
            />
          ) : (
            <PlayLogPanel
              entries={playLogEntries}
              onEntryTap={handleEntryTap}
              onKToggle={handleKToggle}
            />
          )}
        </div>

        {/* ZONE 4: Quick Bar — bottom left */}
        <div style={{ gridColumn: '1', gridRow: '2' }} className="relative">
          <QuickBar
            disabled={!gameInitialized}
            onOutcome={handleQuickBarOutcome}
            gameSituation={{ outs: gameState.outs, bases: gameState.bases }}
            managerMomentActive={mwarHook.managerMoment.isTriggered}
            onManagerMomentTap={() => setShowManagerMomentPanel(prev => !prev)}
          />
          {/* D-17: Manager Moment inline Call/Skip panel — non-blocking */}
          {showManagerMomentPanel && mwarHook.managerMoment.isTriggered && (
            <div className="absolute bottom-full left-0 right-0 mb-1 bg-[#4A6A42] border-[3px] border-[#FFD700] p-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.6)] z-40">
              <div className="text-[9px] text-[#FFD700] font-bold mb-1">
                MANAGER MOMENT (LI: {mwarHook.managerMoment.leverageIndex.toFixed(1)})
              </div>
              <div className="text-[10px] text-[#E8E8D8] mb-2">{mwarHook.managerMoment.context}</div>
              {mwarHook.managerMoment.decisionType && (
                <div className="flex gap-1.5">
                  <button
                    onClick={() => {
                      const gsLI = buildGameStateForLI();
                      const decisionId = mwarHook.recordDecision(mwarHook.managerMoment.decisionType!, gsLI, [], mwarHook.managerMoment.suggestedAction || '');
                      setPendingMWARDecisions(prev => new Map(prev).set(decisionId, { decisionId, decisionType: mwarHook.managerMoment.decisionType!, involvedPlayers: [], resolveAfterNextPlay: true }));
                      mwarHook.dismissManagerMoment();
                      setShowManagerMomentPanel(false);
                      console.log(`[mWAR] User called ${mwarHook.managerMoment.decisionType}: ${decisionId}`);
                    }}
                    className="flex-1 py-1.5 text-[10px] bg-[#FFD700] text-[#2A3A22] font-bold border-2 border-[#B8960A] hover:bg-[#E8C400] active:scale-95 transition-transform"
                  >
                    Call {mwarHook.managerMoment.decisionType?.replace(/_/g, ' ')}
                  </button>
                  <button
                    onClick={() => {
                      mwarHook.dismissManagerMoment();
                      setShowManagerMomentPanel(false);
                    }}
                    className="flex-1 py-1.5 text-[10px] bg-[#5A8352] text-[#E8E8D8] border-2 border-[#4A6844] hover:bg-[#4F7D4B] active:scale-95 transition-transform"
                  >
                    Skip
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ZONE 5: Modifiers + Actions — bottom center */}
        <div style={{ gridColumn: '2', gridRow: '2' }} className="bg-[#2a3a2d] border-t-[3px] border-[#3d5240]">
          <div className="relative flex gap-2 p-2 items-center justify-between h-full">
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  onClick={() => {
                    setLineupOverlayHint('Use LINEUP for batting order, bench players, pinch runners, and pitching changes.');
                    setShowLineupOverlay(true);
                  }}
                  className="bg-[#1a5276] border-[3px] border-[#5dade2] px-4 py-2.5 text-white text-sm font-bold
                             shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)] active:scale-95 transition-transform
                             hover:bg-[#21618c]"
                >
                  LINEUP
                </button>
                <button
                  onClick={() => {
                    const firstUnenriched = [...playLogEntries].reverse().find(entry =>
                      entry.isEnrichable &&
                      (!entry.hasFieldingData || !entry.hasLocationData || !entry.hasPitchType || !entry.hasPitchCount)
                    );
                    if (firstUnenriched) {
                      setEnrichingEntry(firstUnenriched);
                    }
                    setLineupOverlayHint('Tap the main field to set spray/location. Use the play log panel for pitch and sequence edits.');
                  }}
                  className="bg-[#4A6844] border-[3px] border-[#88AA88] px-3 py-2.5 text-white text-xs font-bold
                             shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)] active:scale-95 transition-transform
                             hover:bg-[#5A8352]"
                >
                  +FLD
                </button>
                <button
                  onClick={() => setShowModifierTray(prev => !prev)}
                  className="bg-[#6c3483] border-[3px] border-[#af7ac5] px-3 py-2.5 text-white text-xs font-bold
                             shadow-[2px_2px_0px_0px_rgba(0,0,0,0.5)] active:scale-95 transition-transform
                             hover:bg-[#7d3c98]"
                >
                  +MOD
                </button>
              </div>
              <div className="text-[8px] text-[#C4A853] min-w-0 truncate">
                {canUseMainFieldLocation
                  ? 'Location enrichment is active: tap the main field. K/Kc stays in the play log.'
                  : lineupOverlayHint ?? 'Tap a play to enrich. Use the main field for +loc and LINEUP for substitutions.'}
              </div>
            </div>
            <div className="flex items-center gap-2">
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
            {showModifierTray && (
              <div className="absolute bottom-full left-2 right-2 mb-2 bg-[#1a1a1a]/95 border-[3px] border-[#C4A853] p-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.6)] z-30">
                <div className="text-[8px] text-[#C4A853] font-bold tracking-[0.12em] mb-2">MODIFIERS + ENHANCEMENTS</div>
                <div className="grid grid-cols-4 gap-1">
                  {/* D-14: WG removed — contextual WEB GEM button lives in EnhancedInteractiveField */}
                  {[
                    ['7+', 'SEVEN_PLUS_PITCH_AB'],
                    ['ROB', 'ROBBERY'],
                    ['KP', 'KILLED_PITCHER'],
                    ['NUT', 'NUT_SHOT'],
                    ['BT', 'BEAT_THROW'],
                    ['BUNT', 'BUNT'],
                    ['TBL', 'TOOTBLAN'],
                  ].map(([label, eventType]) => (
                    <button
                      key={label}
                      onClick={() => triggerManualSpecialEvent(eventType as SpecialEventData['eventType'])}
                      className="bg-[#333] border-[2px] border-[#C4A853] px-2 py-2 text-[10px] font-bold text-[#E8E8D8] hover:bg-[#444] active:scale-95 transition-transform"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}
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

        {showLineupOverlay && (
          <div
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
            onClick={() => setShowLineupOverlay(false)}
          >
            <div
              className="w-full max-w-[980px] max-h-[90vh] bg-[#2a3a2d] border-[6px] border-[#3d5240]
                         shadow-[8px_8px_0_rgba(0,0,0,0.7)] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-4 py-3 bg-[#3d5240] border-b-[3px] border-[#1a2a1d]">
                <div>
                  <div className="text-sm font-bold text-[#E8E8D8]">LINEUP</div>
                  <div className="text-[9px] text-[#C4A853]">
                    {lineupOverlayHint ?? 'Manage batting order, bench players, and pitching changes.'}
                  </div>
                </div>
                <button
                  onClick={() => setShowLineupOverlay(false)}
                  className="bg-[#556B55] border-[3px] border-[#E8E8D8] px-2 py-1 text-[#E8E8D8] hover:bg-[#6a846a]"
                  title="Close lineup"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-4 overflow-y-auto">
                {!lineupSizeOk && currentLineup.length > 0 && (
                  <div className="mb-2 px-2 py-1 bg-[#4A2A00] border border-[#FF8800] text-[#FFAA44] text-[10px] font-bold">
                    LINEUP SIZE: {currentLineup.length} — expected 9 (or 10 with DH)
                  </div>
                )}
                <LineupCard
                  lineup={lineupCardData}
                  bench={benchCardData}
                  bullpen={bullpenCardData}
                  currentPitcher={currentPitcherData}
                  onSubstitution={handleLineupCardSubstitution}
                  isExpanded={true}
                  onPlayerClick={(playerId, playerName, type) => setSelectedPlayer({ name: playerName, type, playerId })}
                />
              </div>
            </div>
          </div>
        )}

        {/* Play Location Overlay - REMOVED (now using drag-drop interface) */}

        {/* End Game Confirmation — with post-game enrichment prompt (Ticket 5.8) */}
        {showEndGameConfirmation && !showPostGameEnrichPrompt && (
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

              {/* Unenriched count (Ticket 5.8) */}
              {(() => {
                const totalEnrichable = playLogEntries.filter(e => e.isEnrichable).length;
                const unenriched = playLogEntries.filter(e =>
                  e.isEnrichable && (!e.hasPitchType || !e.hasLocationData)
                ).length;
                return unenriched > 0 ? (
                  <div className="text-[8px] text-[#C4A853] mb-3">
                    {unenriched} of {totalEnrichable} plays unenriched.
                  </div>
                ) : null;
              })()}

              {/* Buttons */}
              <div className="flex gap-2">
                <button
                  onClick={() => setShowEndGameConfirmation(false)}
                  className="flex-1 bg-[#3d5240] border-[5px] border-[#E8E8D8] py-4 text-[#E8E8D8] text-sm hover:bg-[#4A6844] active:scale-95 transition-transform"
                >
                  CANCEL
                </button>
                <button
                  onClick={() => {
                    // Check for unenriched plays
                    const unenriched = playLogEntries.filter(e =>
                      e.isEnrichable && (!e.hasPitchType || !e.hasLocationData)
                    ).length;
                    if (unenriched > 0) {
                      setPostGameUnenrichedCount(unenriched);
                      setShowPostGameEnrichPrompt(true);
                    } else {
                      handleEndGame();
                    }
                  }}
                  className="flex-1 bg-[#DD0000] border-[5px] border-white py-4 text-white text-sm hover:bg-[#FF0000] active:scale-95 transition-transform"
                >
                  END GAME
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Post-game enrichment prompt (Ticket 5.8) */}
        {showPostGameEnrichPrompt && (
          <div
            className="fixed inset-0 bg-black bg-opacity-80 flex items-center justify-center z-50"
            onClick={() => { setShowPostGameEnrichPrompt(false); handleEndGame(); }}
          >
            <div
              className="bg-[#556B55] border-[6px] border-[#4A6844] p-4 w-[340px] shadow-[8px_8px_0px_0px_rgba(0,0,0,0.8)]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-[#3d5240] border-[4px] border-[#E8E8D8] p-2 mb-3">
                <div className="text-xs text-[#E8E8D8] font-bold">ENRICHMENT</div>
              </div>
              <div className="text-[9px] text-[#E8E8D8] mb-4">
                {postGameUnenrichedCount} play{postGameUnenrichedCount !== 1 ? 's' : ''} unenriched. Enrich now or continue?
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowPostGameEnrichPrompt(false);
                    setShowEndGameConfirmation(false);
                    // Open enrichment on first unenriched play
                    const firstUnenriched = playLogEntries.find(e =>
                      e.isEnrichable && (!e.hasPitchType || !e.hasLocationData)
                    );
                    if (firstUnenriched) setEnrichingEntry(firstUnenriched);
                  }}
                  className="flex-1 bg-[#3d5240] border-[5px] border-[#C4A853] py-3 text-[#C4A853] text-sm hover:bg-[#4A6844] active:scale-95 transition-transform"
                >
                  ENRICH
                </button>
                <button
                  onClick={() => { setShowPostGameEnrichPrompt(false); handleEndGame(); }}
                  className="flex-1 bg-[#DD0000] border-[5px] border-white py-3 text-white text-sm hover:bg-[#FF0000] active:scale-95 transition-transform"
                >
                  CONTINUE
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

        {/* D-4: HR Inline Prompt — distance + pitch type (both optional) */}
        {hrPrompt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
               onClick={handleHrPromptSkip}>
            <div className="bg-[#1a2a1d] border-[3px] border-[#C4A853] rounded-lg p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.6)] w-[280px]"
                 onClick={(e) => e.stopPropagation()}>
              <div className="text-xs font-bold text-[#C4A853] tracking-wider mb-3">HOME RUN</div>
              <div className="mb-3">
                <label className="text-[9px] text-[#88AA88] font-bold tracking-wider block mb-1">DISTANCE (ft)</label>
                <input
                  type="number"
                  min={200} max={600}
                  value={hrPrompt.distance}
                  onChange={(e) => setHrPrompt(p => p ? { ...p, distance: e.target.value } : p)}
                  placeholder="e.g. 420"
                  className="w-full bg-[#0d1a0f] border-2 border-[#3d5240] text-white text-sm px-2 py-1.5 rounded focus:border-[#C4A853] outline-none"
                  autoFocus
                />
              </div>
              <div className="mb-3">
                <label className="text-[9px] text-[#88AA88] font-bold tracking-wider block mb-1">PITCH TYPE</label>
                <div className="flex flex-wrap gap-1">
                  {PITCH_TYPES.filter(pt => pt.abbr !== 'UNK').map((pt) => (
                    <button key={pt.abbr}
                      onClick={() => setHrPrompt(p => p ? { ...p, pitchType: p.pitchType === pt.abbr ? '' : pt.abbr } : p)}
                      className={`text-[8px] px-1.5 py-0.5 rounded border transition-colors
                        ${hrPrompt.pitchType === pt.abbr
                          ? 'bg-[#C4A853]/30 border-[#C4A853] text-[#C4A853]'
                          : 'bg-[#333] border-[#555] text-[#888] hover:border-[#777]'}`}
                    >{pt.abbr}</button>
                  ))}
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={handleHrPromptDone}
                  className="flex-1 px-3 py-1.5 bg-[#6c3483] text-white text-[10px] font-bold uppercase rounded border border-[#af7ac5] hover:bg-[#7d3c98] active:scale-95 transition-all">
                  Done
                </button>
                <button onClick={handleHrPromptSkip}
                  className="flex-1 px-3 py-1.5 bg-[#333] text-[#888] text-[10px] font-bold uppercase rounded border border-[#555] hover:bg-[#444] active:scale-95 transition-all">
                  Skip
                </button>
              </div>
            </div>
          </div>
        )}

        {/* D-3: Error Flow Prompt — base → fielder → type */}
        {errorFlow && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-[#1a2a1d] border-[3px] border-[#f4d03f] rounded-lg p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.6)] w-[280px]">
              <div className="text-xs font-bold text-[#f4d03f] tracking-wider mb-3">ERROR</div>

              {errorFlow.step === 'base' && (
                <>
                  <div className="text-[10px] text-[#ccc] mb-2">Batter reached which base?</div>
                  <div className="flex gap-2">
                    {(['1B', '2B', '3B'] as const).map((b) => (
                      <button key={b}
                        onClick={() => setErrorFlow(f => f ? { ...f, step: 'fielder', baseReached: b } : f)}
                        className="flex-1 px-3 py-2 bg-[#7d6608] text-white text-xs font-bold rounded border-2 border-[#f4d03f] hover:bg-[#8d7618] active:scale-95 transition-all">
                        {b}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {errorFlow.step === 'fielder' && (
                <>
                  <div className="text-[10px] text-[#ccc] mb-2">Error by which fielder?</div>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { pos: 1, label: 'P' }, { pos: 2, label: 'C' }, { pos: 3, label: '1B' },
                      { pos: 4, label: '2B' }, { pos: 5, label: '3B' }, { pos: 6, label: 'SS' },
                      { pos: 7, label: 'LF' }, { pos: 8, label: 'CF' }, { pos: 9, label: 'RF' },
                    ].map(({ pos, label }) => (
                      <button key={pos}
                        onClick={() => setErrorFlow(f => f ? { ...f, step: 'type', fielderPosition: pos } : f)}
                        className="px-2 py-1.5 bg-[#333] text-white text-[10px] font-bold rounded border border-[#555] hover:border-[#f4d03f] hover:bg-[#444] active:scale-95 transition-all">
                        {pos} {label}
                      </button>
                    ))}
                  </div>
                </>
              )}

              {errorFlow.step === 'type' && (
                <>
                  <div className="text-[10px] text-[#ccc] mb-2">Error type?</div>
                  <div className="flex gap-2">
                    {['Fielding', 'Throwing', 'Mental'].map((t) => (
                      <button key={t}
                        onClick={() => handleErrorFlowComplete(errorFlow.baseReached, errorFlow.fielderPosition, t.toLowerCase())}
                        className="flex-1 px-2 py-2 bg-[#7d6608] text-white text-[10px] font-bold rounded border-2 border-[#f4d03f] hover:bg-[#8d7618] active:scale-95 transition-all">
                        {t}
                      </button>
                    ))}
                  </div>
                </>
              )}

              <button
                onClick={() => setErrorFlow(null)}
                className="w-full mt-3 px-3 py-1 bg-[#333] text-[#888] text-[9px] font-bold uppercase rounded border border-[#555] hover:bg-[#444] active:scale-95 transition-all">
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* D-5: SF Prompt — "Sac fly — run scores?" */}
        {sfPrompt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-[#1a2a1d] border-[3px] border-[#FF4444] rounded-lg p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.6)] w-[260px]">
              <div className="text-xs font-bold text-[#FF4444] tracking-wider mb-2">FLY OUT + R3</div>
              <div className="text-[11px] text-[#ccc] mb-3">Sac fly — run scores?</div>
              <div className="flex gap-2">
                <button onClick={() => handleSfPromptAnswer(true)}
                  className="flex-1 px-3 py-2 bg-[#2E7D32] text-white text-xs font-bold uppercase rounded border border-[#4CAF50] hover:bg-[#388E3C] active:scale-95 transition-all">
                  Yes — SF
                </button>
                <button onClick={() => handleSfPromptAnswer(false)}
                  className="flex-1 px-3 py-2 bg-[#8B0000] text-white text-xs font-bold uppercase rounded border border-[#FF4444] hover:bg-[#a00] active:scale-95 transition-all">
                  No — FO
                </button>
              </div>
            </div>
          </div>
        )}

        {/* D-6: GO→DP Prompt — "Double play?" */}
        {dpPrompt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-[#1a2a1d] border-[3px] border-[#FF4444] rounded-lg p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.6)] w-[260px]">
              <div className="text-xs font-bold text-[#FF4444] tracking-wider mb-2">GROUND OUT + RUNNER OUT</div>
              <div className="text-[11px] text-[#ccc] mb-3">Double play?</div>
              <div className="flex gap-2">
                <button onClick={() => handleDpPromptAnswer(true)}
                  className="flex-1 px-3 py-2 bg-[#8B0000] text-white text-xs font-bold uppercase rounded border border-[#FF4444] hover:bg-[#a00] active:scale-95 transition-all">
                  Yes — DP
                </button>
                <button onClick={() => handleDpPromptAnswer(false)}
                  className="flex-1 px-3 py-2 bg-[#333] text-white text-xs font-bold uppercase rounded border border-[#555] hover:bg-[#444] active:scale-95 transition-all">
                  No — GO
                </button>
              </div>
            </div>
          </div>
        )}

        {/* D-7: IFR Prompt — "Infield Fly Rule?" */}
        {ifrPrompt && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-[#1a2a1d] border-[3px] border-[#6666FF] rounded-lg p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.6)] w-[260px]">
              <div className="text-xs font-bold text-[#AAAAFF] tracking-wider mb-2">POP OUT — R1 + R2</div>
              <div className="text-[11px] text-[#ccc] mb-3">Infield Fly Rule?</div>
              <div className="flex gap-2">
                <button onClick={() => handleIfrPromptAnswer(true)}
                  className="flex-1 px-3 py-2 bg-[#4444AA] text-white text-xs font-bold uppercase rounded border border-[#6666FF] hover:bg-[#5555BB] active:scale-95 transition-all">
                  Yes — IFR
                </button>
                <button onClick={() => handleIfrPromptAnswer(false)}
                  className="flex-1 px-3 py-2 bg-[#333] text-white text-xs font-bold uppercase rounded border border-[#555] hover:bg-[#444] active:scale-95 transition-all">
                  No — PO
                </button>
              </div>
            </div>
          </div>
        )}

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
                          <DetailButton label="P" onClick={() => { void handleQuickErrorDetail('P'); }} />
                          <DetailButton label="C" onClick={() => { void handleQuickErrorDetail('C'); }} />
                          <DetailButton label="1B" onClick={() => { void handleQuickErrorDetail('1B'); }} />
                          <DetailButton label="2B" onClick={() => { void handleQuickErrorDetail('2B'); }} />
                          <DetailButton label="3B" onClick={() => { void handleQuickErrorDetail('3B'); }} />
                        </div>
                        <div className="grid grid-cols-4 gap-1 mt-1">
                          <DetailButton label="SS" onClick={() => { void handleQuickErrorDetail('SS'); }} />
                          <DetailButton label="LF" onClick={() => { void handleQuickErrorDetail('LF'); }} />
                          <DetailButton label="CF" onClick={() => { void handleQuickErrorDetail('CF'); }} />
                          <DetailButton label="RF" onClick={() => { void handleQuickErrorDetail('RF'); }} />
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
                                await commitPlateAppearance({ type: 'out', outType: 'SF' });
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
