import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams, useLocation } from "react-router";
import { Menu, ChevronUp } from "lucide-react";
import { DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";
import { BaserunnerDragDrop, type RunnerMoveData as LegacyRunnerMoveData } from "@/app/components/BaserunnerDragDrop";
import { InteractiveField } from "@/app/components/DragDropGameTracker";
import { EnhancedInteractiveField, type PlayData, type SpecialEventData } from "@/app/components/EnhancedInteractiveField";
import { type RunnerMoveData } from "@/app/components/RunnerDragDrop";
import { LineupCard, type SubstitutionData, type LineupPlayer, type BenchPlayer, type BullpenPitcher } from "@/app/components/LineupCard";
import { UndoButton, useUndoSystem, type GameSnapshot } from "@/app/components/UndoSystem";
import { TeamRoster, type Player, type Pitcher } from "@/app/components/TeamRoster";
import { MiniScoreboard } from "@/app/components/MiniScoreboard";
import { getTeamColors, getFielderBorderColors } from "@/config/teamColors";
import { defaultTigersPlayers, defaultTigersPitchers, defaultSoxPlayers, defaultSoxPitchers } from "@/data/defaultRosters";
import { useGameState, type HitType, type OutType, type WalkType } from "@/hooks/useGameState";

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

  // Get rosters from navigation state or use defaults
  const navigationState = location.state as {
    awayPlayers?: Player[];
    awayPitchers?: Pitcher[];
    homePlayers?: Player[];
    homePitchers?: Pitcher[];
  } | null;

  // Team IDs - in production these would come from game data
  const homeTeamId = 'sox';
  const awayTeamId = 'tigers';

  // Use the game state hook for real data persistence
  const {
    gameState,
    scoreboard,
    playerStats,
    pitcherStats,
    recordHit,
    recordOut,
    recordWalk,
    recordEvent,
    advanceRunner,
    makeSubstitution,
    changePitcher,
    advanceCount,
    resetCount,
    endInning,
    endGame: hookEndGame,
    initializeGame,
    loadExistingGame,
    restoreState,
    isLoading,
    isSaving,
  } = useGameState(gameId);

  // Track selected hit/out/walk details for the two-step record flow
  const [pendingOutcome, setPendingOutcome] = useState<{
    type: 'hit' | 'out' | 'walk';
    subType: string;
    direction?: string;
    rbi?: number;
  } | null>(null);

  // Player card modal state
  const [selectedPlayer, setSelectedPlayer] = useState<{ name: string; type: 'batter' | 'pitcher' } | null>(null);

  // End game confirmation state
  const [showEndGameConfirmation, setShowEndGameConfirmation] = useState(false);

  // Enhanced field toggle - use new FieldCanvas-based interactive field
  const [useEnhancedField, setUseEnhancedField] = useState(true);

  // Scoreboard minimization toggle - allows field to expand
  const [isScoreboardMinimized, setIsScoreboardMinimized] = useState(false);

  // Undo system - restore game state on undo
  const handleUndo = useCallback((snapshot: GameSnapshot) => {
    console.log("Restoring game state from snapshot:", snapshot.playDescription);
    // The snapshot.gameState contains { gameState, scoreboard } - cast and extract
    const storedState = snapshot.gameState as { gameState: typeof gameState; scoreboard: typeof scoreboard } | null;
    if (storedState && storedState.gameState && storedState.scoreboard) {
      restoreState({
        gameState: storedState.gameState,
        scoreboard: storedState.scoreboard,
      });
      console.log("State restored successfully");
    } else {
      console.warn("Incomplete snapshot - cannot restore", snapshot);
    }
  }, [restoreState]);

  const undoSystem = useUndoSystem(5, handleUndo);

  // Keep undo system current state in sync with game state
  useEffect(() => {
    undoSystem.setCurrentState({
      gameState,
      scoreboard,
    });
  }, [gameState, scoreboard]);

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
  
  // Get team colors
  const battingTeamColors = getTeamColors(battingTeamId);
  const fieldingTeamColors = getTeamColors(fieldingTeamId);
  const [fielderColor1, fielderColor2] = getFielderBorderColors(fieldingTeamId);

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

  // LineupCard data derived from current team data
  const lineupCardData: LineupPlayer[] = currentLineup.map((player, idx) => ({
    id: `lineup-${idx}`,
    name: player.name,
    position: player.pos,
    battingOrder: idx + 1,
    isCurrentBatter: player.batting,
    battingHand: 'R', // Would come from player data
  }));

  const benchCardData: BenchPlayer[] = benchPlayers.map((player, idx) => ({
    id: `bench-${idx}`,
    name: player.name,
    positions: [player.pos],
    battingHand: player.hand as 'L' | 'R' | 'S',
    isUsed: false,
  }));

  const bullpenCardData: BullpenPitcher[] = availablePitchers.map((pitcher, idx) => ({
    id: `bullpen-${idx}`,
    name: pitcher.name,
    throwingHand: pitcher.hand as 'L' | 'R',
    fitness: 'FIT' as const,
    isUsed: false,
    isCurrentPitcher: false,
  }));

  const currentPitcherData: BullpenPitcher = {
    id: 'current-pitcher',
    name: 'R. LOPEZ',
    throwingHand: 'R',
    fitness: 'FIT',
    isCurrentPitcher: true,
  };

  // Field positions (defense) with SVG coordinates
  const fieldPositions: FieldPosition[] = [
    { name: "SMITH", position: "CF", number: "8", svgX: 200, svgY: 60 },
    { name: "JONES", position: "LF", number: "7", svgX: 72, svgY: 72 },
    { name: "DAVIS", position: "RF", number: "9", svgX: 328, svgY: 72 },
    { name: "BROWN", position: "SS", number: "6", svgX: 144, svgY: 120 },
    { name: "WILSON", position: "2B", number: "4", svgX: 256, svgY: 120 },
    { name: "GARCIA", position: "3B", number: "5", svgX: 110, svgY: 152 },
    { name: "MARTIN", position: "1B", number: "3", svgX: 290, svgY: 152 },
    { name: "LOPEZ", position: "C", number: "2", svgX: 200, svgY: 259 },
    { name: "PITCHER", position: "P", number: "1", svgX: 200, svgY: 165 },
  ];

  // Roster data - use navigation state if available, otherwise use defaults with some at-bats
  const awayTeamPlayers = navigationState?.awayPlayers || [
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
  ];

  const awayTeamPitchers = navigationState?.awayPitchers || [
    { name: 'R. LOPEZ', stats: { ip: '4.2', h: 4, r: 4, er: 4, bb: 2, k: 3, pitches: 67 }, throwingHand: 'R' as const, isStarter: true, isActive: true },
    { name: 'T. JOHNSON', stats: { ip: '0.0', h: 0, r: 0, er: 0, bb: 0, k: 0, pitches: 0 }, throwingHand: 'R' as const },
    { name: 'M. WILLIAMS', stats: { ip: '0.0', h: 0, r: 0, er: 0, bb: 0, k: 0, pitches: 0 }, throwingHand: 'L' as const },
    { name: 'K. DAVIS', stats: { ip: '0.0', h: 0, r: 0, er: 0, bb: 0, k: 0, pitches: 0 }, throwingHand: 'R' as const },
  ];

  // Mock roster data for Home Team (Sox)
  const homeTeamPlayers = navigationState?.homePlayers || [
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
  ];

  const homeTeamPitchers = navigationState?.homePitchers || [
    { name: 'S. WHITE', stats: { ip: '5.0', h: 3, r: 3, er: 3, bb: 1, k: 4, pitches: 72 }, throwingHand: 'R' as const, isStarter: true, isActive: true },
    { name: 'U. PARKER', stats: { ip: '0.0', h: 0, r: 0, er: 0, bb: 0, k: 0, pitches: 0 }, throwingHand: 'L' as const },
    { name: 'V. TURNER', stats: { ip: '0.0', h: 0, r: 0, er: 0, bb: 0, k: 0, pitches: 0 }, throwingHand: 'R' as const },
    { name: 'W. COLLINS', stats: { ip: '0.0', h: 0, r: 0, er: 0, bb: 0, k: 0, pitches: 0 }, throwingHand: 'R' as const },
  ];

  // Get current pitcher numbers
  const awayPitcher = awayTeamPitchers.find(p => p.isActive);
  const homePitcher = homeTeamPitchers.find(p => p.isActive);
  
  // Find pitcher numbers from player rosters
  const awayPitcherPlayer = awayTeamPlayers.find(p => p.name === awayPitcher?.name);
  const homePitcherPlayer = homeTeamPlayers.find(p => p.name === homePitcher?.name);
  
  // Get current batter's lineup position
  const battingTeamPlayers = gameState.isTop ? awayTeamPlayers : homeTeamPlayers;
  const currentBatterData = battingTeamPlayers.find(p => p.battingOrder && p.name === gameState.currentBatterName);
  const currentBatterPosition = currentBatterData?.battingOrder || 1;
  const currentBatterPositionStr = currentBatterPosition.toString();
  const atBatDigit1 = currentBatterPositionStr.length > 1 ? currentBatterPositionStr[0] : '';
  const atBatDigit2 = currentBatterPositionStr.length > 1 ? currentBatterPositionStr[1] : currentBatterPositionStr[0];

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

  // Legacy handler for BaserunnerDragDrop
  const handleLegacyRunnerMove = (data: LegacyRunnerMoveData) => {
    console.log("Legacy runner move data:", data);
    advanceRunner(
      data.from as 'first' | 'second' | 'third',
      data.to as 'second' | 'third' | 'home',
      data.outcome
    );
  };

  // Handler for lineup card substitutions (Phase 6)
  const handleLineupCardSubstitution = useCallback((sub: SubstitutionData) => {
    console.log("LineupCard substitution:", sub);

    // Capture snapshot for undo
    undoSystem.captureSnapshot(`${sub.type}: ${sub.incomingPlayerId} for ${sub.outgoingPlayerId}`);

    if (sub.type === 'pitching_change') {
      changePitcher(sub.incomingPlayerId, sub.outgoingPlayerId);
    } else if (sub.type === 'player_sub' || sub.type === 'double_switch') {
      makeSubstitution(sub.incomingPlayerId, sub.outgoingPlayerId);
    }
    // position_swap would need additional handling
  }, [changePitcher, makeSubstitution]);

  const handlePlayComplete = (playData: any) => {
    console.log("Play complete:", playData);
    // Update game state based on play data
    // This would update bases, outs, scores, etc.
  };

  // Enhanced play handler for the new drag-drop field
  const handleEnhancedPlayComplete = useCallback(async (playData: PlayData) => {
    console.log("Enhanced play complete:", playData);

    try {
      // Calculate RBI for hits based on runners on base
      // This is a simplified calculation - in reality would need to track actual runner movement
      const calculateHitRBI = (hitType: string): number => {
        const { first, second, third } = gameState.bases;
        const runnersOnBase = (first ? 1 : 0) + (second ? 1 : 0) + (third ? 1 : 0);

        if (hitType === 'HR') {
          // Home run: batter + all runners score
          return 1 + runnersOnBase;
        }
        // For other hits, assume runner on third scores on any hit
        // This is simplified - real implementation would track actual runner movement
        return third ? 1 : 0;
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

      // Map play types to existing recording functions
      if (playData.type === 'hr') {
        // Home run - RBI = 1 (batter) + runners on base
        const rbi = calculateHitRBI('HR');
        await recordHit('HR', rbi);
        console.log(`HR recorded: ${playData.hrDistance}ft, type: ${playData.hrType}, sector: ${playData.spraySector}, RBI: ${rbi}`);
      } else if (playData.type === 'hit') {
        // Use the hitType from the modal selection
        const hitType = playData.hitType || '1B';
        const rbi = calculateHitRBI(hitType);
        await recordHit(hitType as HitType, rbi);
        console.log(`Hit recorded: ${hitType}, sector: ${playData.spraySector}, sequence: ${playData.fieldingSequence.join('-')}, RBI: ${rbi}`);
      } else if (playData.type === 'out') {
        // Use the outType from the modal selection
        const outType = playData.outType || 'GO';
        await recordOut(outType as OutType);
        console.log(`Out recorded: ${outType}, sequence: ${playData.fieldingSequence.join('-')}, sector: ${playData.spraySector}`);
      } else if (playData.type === 'foul_out') {
        // Foul out
        await recordOut('FO');
        console.log(`Foul out recorded: ${playData.foulType}, fielder: ${playData.fieldingSequence[0]}`);
      } else if (playData.type === 'foul_ball') {
        // Foul ball (just a strike)
        await advanceCount('strike');
        console.log(`Foul ball (strike) recorded`);
      }

      // TODO: Store spray chart data (ballLocation, spraySector, fieldingSequence)
      // This would require extending the database schema or adding a separate spray chart table
      // For now, just log it
      if (playData.ballLocation) {
        console.log(`Spray chart: x=${playData.ballLocation.x.toFixed(3)}, y=${playData.ballLocation.y.toFixed(3)}, sector=${playData.spraySector}`);
      }
    } catch (error) {
      console.error('Failed to record enhanced play:', error);
    }
  }, [recordHit, recordOut, advanceCount, gameState.bases, undoSystem]);

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

  const handleSubstitution = (teamType: 'away' | 'home', benchPlayerName: string, lineupPlayerName: string) => {
    console.log(`Substitution: ${benchPlayerName} replacing ${lineupPlayerName} on ${teamType} team`);
    // In a real app, you would update the game state and persist the substitution
  };

  const handlePitcherSubstitution = (teamType: 'away' | 'home', newPitcherName: string, replacedName: string, replacedType: 'player' | 'pitcher') => {
    console.log(`Pitcher Substitution: ${newPitcherName} replacing ${replacedName} (${replacedType}) on ${teamType} team`);
    // In a real app, you would update the game state and persist the pitcher substitution
  };

  const handlePositionSwap = (teamType: 'away' | 'home', player1Name: string, player2Name: string) => {
    console.log(`Position Swap: ${player1Name} and ${player2Name} swapping positions on ${teamType} team`);
    // In a real app, you would update the game state and persist the position swap
  };

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
  }, [endInning]);

  // Handle end game with navigation
  const handleEndGame = useCallback(async () => {
    await hookEndGame();
    navigate(`/post-game/${gameId}`);
  }, [hookEndGame, navigate, gameId]);

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="min-h-screen bg-[#6B9462] text-white overflow-y-auto">
        {/* Scoreboard - toggleable between full and mini */}
        {isScoreboardMinimized ? (
          <MiniScoreboard
            awayTeamName="TIGERS"
            homeTeamName="SOX"
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
            <div className="flex items-center justify-between bg-[rgb(133,181,229)] border-[4px] border-[#1a3020] p-2">
              {/* Super Mega Baseball Logo + Minimize Button */}
              <div className="flex items-center gap-2">
                <div className="bg-white border-[4px] border-[#0066FF] px-[12px] py-[6px] shadow-[4px_4px_0px_0px_#DD0000]">
                  <div className="text-xs text-[#DD0000] tracking-wide leading-tight">SUPER MEGA</div>
                  <div className="text-sm text-[#0066FF] tracking-wide leading-tight">BASEBALL</div>
                </div>
                <button
                  onClick={() => setIsScoreboardMinimized(true)}
                  className="flex items-center gap-1 px-2 py-1 bg-[#3d5240] border-2 border-[#2a3a2d] hover:bg-[#4a6a4a] transition-colors"
                  title="Minimize Scoreboard"
                >
                  <ChevronUp className="w-4 h-4 text-[#E8E8D8]" />
                  <span className="text-[#E8E8D8] text-[10px] font-bold">MINI</span>
                </button>
              </div>

              {/* Fenway-style scoreboard in the middle */}
              <div className="mx-4">
                <div className="bg-[#556B55] border-[4px] border-[#3d5240] p-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.5)]">
                  {/* Stadium name header */}
                  <div className="text-center text-[#E8E8D8] text-xs font-bold tracking-[0.3em] mb-1">
                    {getTeamColors(homeTeamId).stadium || 'BALLPARK'}
                  </div>
                  
                  {/* Scoreboard grid */}
                  <div className="grid gap-[1px] mb-2" style={{ gridTemplateColumns: '26px 90px repeat(9, 24px) 24px 6px 28px 28px 28px 6px 50px 8px auto' }}>
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
                    <div className="bg-[#3d5240] border-2 border-[#2a3a2d] min-h-[20px] flex items-center justify-center">
                      <span className="text-[#E8E8D8] text-xs font-bold">{awayPitcherPlayer?.battingOrder || '1'}</span>
                    </div>
                    <div className="text-[#E8E8D8] text-[11px] font-bold flex items-center pl-2" style={{ 
                      textShadow: '1px 1px 0px rgba(0,0,0,0.7)'
                    }}>TIGERS</div>
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
                    <div className="bg-[#3d5240] border-2 border-[#2a3a2d] text-[#E8E8D8] text-[9px] font-bold flex items-center justify-center">47-38</div>
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
                    <div className="bg-[#3d5240] border-2 border-[#2a3a2d] min-h-[20px] flex items-center justify-center">
                      <span className="text-[#E8E8D8] text-xs font-bold">{homePitcherPlayer?.battingOrder || '1'}</span>
                    </div>
                    <div className="text-[#E8E8D8] text-[11px] font-bold flex items-center pl-2" style={{ 
                      textShadow: '1px 1px 0px rgba(0,0,0,0.7)'
                    }}>SOX</div>
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
                    <div className="bg-[#3d5240] border-2 border-[#2a3a2d] text-[#E8E8D8] text-[9px] font-bold flex items-center justify-center">52-33</div>
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
                    <span>JAN 27, 2026 • GAME #12</span>
                    <span>TIME: 1:47</span>
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
            <div className="bg-[#6B9462] relative w-full" style={{ height: isScoreboardMinimized ? 'calc(100vh - 52px)' : 'calc(100vh - 240px)', minHeight: '400px' }}>
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
                  fielderBorderColors={[fielderColor1, fielderColor2]}
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

              {/* Draggable Baserunners - Lower z-index (40) so modals (z-100) appear above */}
              <div className="absolute inset-0" style={{ zIndex: 40, pointerEvents: 'none' }}>
                <div style={{ pointerEvents: 'auto' }}>
                  <BaserunnerDragDrop
                    bases={gameState.bases}
                    onRunnerMove={handleLegacyRunnerMove}
                    isAtBatInProgress={true}
                  />
                </div>
              </div>
            </div>
            )}
          </div>

          {/* Content below field - scrollable */}
          <div className="p-4 space-y-4">
          {/* Player info boxes - reorganized */}
          <div className="grid grid-cols-3 gap-3">
            {/* Current Batter - clickable */}
            <button 
              onClick={() => setSelectedPlayer({ name: 'J. MARTINEZ', type: 'batter' })}
              className="bg-[#4A6A42] border-[4px] border-[#E8E8D8] p-2 text-left hover:scale-105 transition-transform cursor-pointer shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)] relative"
            >
              <div className="absolute top-1 right-2 text-[7px] text-[#E8E8D8] font-bold" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>
                {gameState.isTop ? 'TIGERS' : 'SOX'}
              </div>
              <div className="text-[7px] text-[#E8E8D8]" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>▶ AT BAT</div>
              <div className="text-xs text-[#E8E8D8] font-bold" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>J. MARTINEZ</div>
              <div className="text-[7px] text-[#E8E8D8]" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>SS • A | 0-0</div>
            </button>

            {/* Score/Inning Display - Shrunken version */}
            <div className="bg-[#556B55] border-[4px] border-[#E8E8D8] p-1 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)]">
              <div className="flex items-center justify-center gap-4 text-[8px]">
                <div className="text-center">
                  <div className="font-bold text-sm text-[#E8E8D8]" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>TIGERS</div>
                  <div className="text-base text-[#E8E8D8] font-bold" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>{gameState.awayScore}</div>
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
                  <div className="font-bold text-sm text-[#E8E8D8]" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>SOX</div>
                  <div className="text-base text-[#E8E8D8] font-bold" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>{gameState.homeScore}</div>
                </div>
              </div>
            </div>

            {/* Current Pitcher - clickable */}
            <button 
              onClick={() => setSelectedPlayer({ name: 'R. SMITH', type: 'pitcher' })}
              className="bg-[#4A6A42] border-[4px] border-[#E8E8D8] p-2 text-left hover:scale-105 transition-transform cursor-pointer shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)] relative"
            >
              <div className="absolute top-1 right-2 text-[7px] text-[#E8E8D8] font-bold" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>
                {gameState.isTop ? 'SOX' : 'TIGERS'}
              </div>
              <div className="text-[7px] text-[#E8E8D8]" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>PITCHING</div>
              <div className="text-xs text-[#E8E8D8] font-bold" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>R. SMITH</div>
              <div className="text-[7px] text-[#E8E8D8]" style={{ textShadow: '1px 1px 0px rgba(0,0,0,0.3)' }}>67 Pitches • ⚪</div>
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

          {/* Team Rosters */}
          <div className="grid grid-cols-2 gap-3">
            <TeamRoster
              teamName="TIGERS"
              teamColor={getTeamColors(awayTeamId).primary}
              teamBorderColor={getTeamColors(awayTeamId).secondary}
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
            />
            <TeamRoster
              teamName="SOX"
              teamColor={getTeamColors(homeTeamId).primary}
              teamBorderColor={getTeamColors(homeTeamId).secondary}
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
              <LineupCard
                lineup={lineupCardData}
                bench={benchCardData}
                bullpen={bullpenCardData}
                currentPitcher={currentPitcherData}
                onSubstitution={handleLineupCardSubstitution}
                isExpanded={true}
              />
            </ExpandablePanel>
          </div>
          )}

          {/* Control buttons - Simplified to UNDO and END GAME only */}
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

        {/* Player Card Modal */}
        {selectedPlayer && (
          <PlayerCardModal 
            player={selectedPlayer} 
            onClose={() => setSelectedPlayer(null)} 
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
      </div>
    </DndProvider>
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
  player: { name: string; type: 'batter' | 'pitcher' };
  onClose: () => void;
}

function PlayerCardModal({ player, onClose }: PlayerCardModalProps) {
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