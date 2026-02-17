import { useState, useReducer, useCallback, useEffect } from 'react';
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
  PositionSwitchEvent,
  Position,
  FameEvent,
  FameEventType,
  FameAutoDetectionSettings,
  FieldingData,
  Direction,
  SpecialPlayType,
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
import PositionSwitchModal from './PositionSwitchModal';
import { FameEventModal, QuickFameButtons } from './FameEventModal';
import { FamePanel, FameToastContainer, EndGameFameSummary } from './FameDisplay';
import { WARPanel } from './WARDisplay';
import { CareerPanel } from './CareerDisplay';
import { SeasonLeaderboardsPanel } from './SeasonLeaderboards';
import { PlayerCardModal } from './PlayerCard';
import LineupPanel from './LineupPanel';
import { SeasonSummaryModal } from './SeasonSummary';
import InningEndSummary from './InningEndSummary';
import PitcherExitPrompt from './PitcherExitPrompt';
import WalkoffCelebration from './WalkoffCelebration';
import FanMoralePanel from '../FanMoralePanel';
import type { WalkoffResult } from '../../utils/walkoffDetector';
import { detectWalkoff, getWalkoffFameBonus } from '../../utils/walkoffDetector';
import { PlayerNameWithMorale } from './PlayerNameWithMorale';
import { MOJO_STATES, type MojoLevel } from '../../engines/mojoEngine';
import { FITNESS_STATES, type FitnessState } from '../../engines/fitnessEngine';
import { useMojoState } from '../../hooks/useMojoState';
import { useFitnessState } from '../../hooks/useFitnessState';
import { useFameDetection, type PlayerStats as FamePlayerStats } from '../../hooks/useFameDetection';
import { useGamePersistence, type GameStateForPersistence } from '../../hooks/useGamePersistence';
import { aggregateGameToSeason } from '../../utils/seasonAggregator';
import { getOrCreateSeason } from '../../utils/seasonStorage';
import type { PersistedGameState } from '../../utils/gameStorage';
import { useLiveStats, toGameBattingStats, toGamePitchingStats } from '../../hooks/useLiveStats';
import { formatAvg, formatERA, formatBatterGameLine, formatPitcherGameLine } from '../../utils/liveStatsCalculator';
import {
  logAtBatEvent,
  logFieldingEvent,
  createGameHeader,
  completeGame,
  markGameAggregated,
  markAggregationFailed,
  type AtBatEvent as EventLogAtBat,
  type FieldingEvent as EventLogFielding,
  type RunnerState,
  type RunnerInfo,
  type FameEventRecord,
  type BallInPlayData,
} from '../../utils/eventLog';
import {
  calculateLeverageIndex,
  isClutchSituation,
  type LeverageGameState,
} from '../../utils/mojoSystem';
import { useClutchCalculations, type ClutchEventInput } from '../../hooks/useClutchCalculations';
import { useMWARCalculations, detectDecisionType, evaluatePinchHitterOutcome, type ManagerDecisionInput } from '../../hooks/useMWARCalculations';
import {
  processRunnerOutcomes,
  updatePitcherStats as applyPitcherStatsUpdate,
  calculateSimpleWinProbability,
  calculateLOB,
} from './gameEngine';

// Team lineup generation - uses real player database
// NOTE: In SMB4, pitchers bat - no DH. Pitcher is in the lineup at position 9.
import {
  generateTeamLineup,
  generateTeamBench,
  getTeamRotation,
  getTeam,
  type GameLineupSlot,
  type GameBenchPlayer,
} from '../../data/playerDatabase';

// Default teams for testing - Sirloins vs Beewolves
const DEFAULT_AWAY_TEAM = 'sirloins';
const DEFAULT_HOME_TEAM = 'beewolves';

// Generate lineups from database
function getTeamLineupData(teamId: string): { lineup: GameLineupSlot[]; bench: GameBenchPlayer[] } {
  const rotation = getTeamRotation(teamId);
  const startingPitcherId = rotation[0]?.id;
  return {
    lineup: generateTeamLineup(teamId, startingPitcherId),
    bench: generateTeamBench(teamId, startingPitcherId),
  };
}

// Get default lineups (Away = Sirloins, Home = Beewolves)
const awayData = getTeamLineupData(DEFAULT_AWAY_TEAM);
const homeData = getTeamLineupData(DEFAULT_HOME_TEAM);

// Use away team as the "current" team for now (batting first)
const demoLineup = awayData.lineup;
const demoBench: BenchPlayer[] = awayData.bench.map(p => ({
  playerId: p.playerId,
  playerName: p.playerName,
  positions: p.positions,
  isAvailable: p.isAvailable,
  batterHand: p.batterHand,
}));

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
  playerName: string;
  teamId: string;
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
  hbp: number;       // MAJ-11: Hit by pitch
  k: number;
  sb: number;
  cs: number;        // Caught stealing
  sf: number;        // MAJ-11: Sacrifice flies
  sh: number;        // MAJ-11: Sacrifice bunts
  gidp: number;      // MAJ-11: Grounded into double play
  // Fielding stats
  putouts: number;
  assists: number;
  fieldingErrors: number;  // Renamed from 'errors' to avoid confusion with reaching on error
}

const initialStats: PlayerStats = {
  playerName: '', teamId: '',
  pa: 0, ab: 0, h: 0, singles: 0, doubles: 0, triples: 0, hr: 0, rbi: 0, r: 0, bb: 0, hbp: 0, k: 0, sb: 0, cs: 0,
  sf: 0, sh: 0, gidp: 0,
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

  // MAJ-08: Pitcher decisions
  decision: 'W' | 'L' | 'ND' | null;
  save: boolean;
  hold: boolean;
  blownSave: boolean;
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
  decision: null,
  save: false,
  hold: false,
  blownSave: false,
});

const MAX_UNDO_STACK = 20;

type NonAtBatEvent = 'SB' | 'CS' | 'WP' | 'PB' | 'PK' | 'BALK';

interface GameState {
  inning: number;
  halfInning: HalfInning;
  outs: number;
  homeScore: number;
  awayScore: number;
  bases: Bases;
  currentBatterIndex: number;
  atBatCount: number;
  inningStrikeouts: number;
  consecutiveHRCount: number;
  lastHRBatterId: string | null;
  maxDeficitAway: number;
  maxDeficitHome: number;
  undoStack: GameState[];
  lastPitcherUpdate: { pitcherId: string; stats: PitcherGameStats } | null;
}

type PersistedReducerState = Omit<GameState, 'undoStack' | 'lastPitcherUpdate'>;

type GameAction =
  | {
      type: 'RECORD_AT_BAT';
      flowState: AtBatFlowState;
      batterId: string;
      batterName: string;
      lineupSize: number;
      currentPitcherId: string;
      currentPitcherStats: PitcherGameStats | null;
    }
  | {
      type: 'RECORD_EVENT';
      event: NonAtBatEvent;
      result?: EventResult;
    }
  | {
      type: 'FLIP_INNING';
    }
  | {
      type: 'UNDO';
    }
  | {
      type: 'SYNC_PERSISTENCE';
      state: PersistedReducerState;
    }
  | {
      type: 'REHYDRATE_STATE';
      state: GameState;
    };

const createStateSnapshot = (state: GameState): GameState => ({
  ...state,
  bases: { ...state.bases },
  undoStack: [],
  lastPitcherUpdate: null,
});

const withUndoSnapshot = (current: GameState, next: GameState): GameState => ({
  ...next,
  undoStack: [...current.undoStack, createStateSnapshot(current)].slice(-MAX_UNDO_STACK),
});

const applyFlipInningState = (state: GameState): GameState => ({
  ...state,
  outs: 0,
  bases: createEmptyBases(),
  inningStrikeouts: 0,
  consecutiveHRCount: 0,
  lastHRBatterId: null,
  halfInning: state.halfInning === 'TOP' ? 'BOTTOM' : 'TOP',
  inning: state.halfInning === 'BOTTOM' ? state.inning + 1 : state.inning,
  lastPitcherUpdate: null,
});

const initialGameState: GameState = {
  inning: 1,
  halfInning: 'TOP',
  outs: 0,
  homeScore: 0,
  awayScore: 0,
  bases: createEmptyBases(),
  currentBatterIndex: 0,
  atBatCount: 0,
  inningStrikeouts: 0,
  consecutiveHRCount: 0,
  lastHRBatterId: null,
  maxDeficitAway: 0,
  maxDeficitHome: 0,
  undoStack: [],
  lastPitcherUpdate: null,
};

const gameReducer = (state: GameState, action: GameAction): GameState => {
  switch (action.type) {
    case 'RECORD_AT_BAT': {
      const { flowState, batterId, batterName, lineupSize, currentPitcherId, currentPitcherStats } = action;
      const result = flowState.result;
      if (!result || lineupSize <= 0) return state;

      let updatedBases: Bases = { ...state.bases };
      let runsScored = 0;
      let totalOutsToAdd = 0;

      if (result === 'HR') {
        runsScored = 1 + (state.bases.first ? 1 : 0) + (state.bases.second ? 1 : 0) + (state.bases.third ? 1 : 0);
        updatedBases = createEmptyBases();
      } else {
        const runnerResolution = processRunnerOutcomes({
          flowState,
          batterResult: result,
          bases: state.bases,
          currentOuts: state.outs,
        });

        updatedBases = runnerResolution.updatedBases;
        runsScored = runnerResolution.runsScored.length;
        totalOutsToAdd += runnerResolution.outsRecorded;

        if (reachesBase(result) && !flowState.batterOutAdvancing) {
          const batterRunner: Runner = {
            playerId: batterId,
            playerName: batterName,
            inheritedFrom: null,
          };
          if (result === '3B') updatedBases.third = batterRunner;
          else if (result === '2B') updatedBases.second = batterRunner;
          else updatedBases.first = batterRunner;
        }

        if (flowState.batterOutAdvancing) {
          totalOutsToAdd += 1;
        }
      }

      if (isOut(result)) {
        if (result === 'DP') totalOutsToAdd += 2;
        else if (result === 'TP') totalOutsToAdd += 3;
        else totalOutsToAdd += 1;
      }

      const nextOuts = Math.min(state.outs + totalOutsToAdd, 3);

      let nextAwayScore = state.awayScore;
      let nextHomeScore = state.homeScore;
      let nextMaxDeficitAway = state.maxDeficitAway;
      let nextMaxDeficitHome = state.maxDeficitHome;

      if (runsScored > 0) {
        if (state.halfInning === 'TOP') {
          nextAwayScore += runsScored;
          nextMaxDeficitHome = Math.max(nextMaxDeficitHome, nextAwayScore - nextHomeScore);
        } else {
          nextHomeScore += runsScored;
          nextMaxDeficitAway = Math.max(nextMaxDeficitAway, nextHomeScore - nextAwayScore);
        }
      }

      const isStrikeout = result === 'K' || result === 'KL';
      const nextInningStrikeouts = isStrikeout ? state.inningStrikeouts + 1 : state.inningStrikeouts;

      let nextConsecutiveHRCount = 0;
      let nextLastHRBatterId: string | null = null;
      if (result === 'HR') {
        nextConsecutiveHRCount =
          state.lastHRBatterId && state.lastHRBatterId !== batterId
            ? state.consecutiveHRCount + 1
            : 1;
        nextLastHRBatterId = batterId;
      }

      const basesLoadedBeforePlay = !!(state.bases.first && state.bases.second && state.bases.third);
      const updatedPitcherStats = currentPitcherStats
        ? applyPitcherStatsUpdate({
            stats: currentPitcherStats,
            result,
            outsOnPlay: totalOutsToAdd,
            runsScored,
            basesLoaded: basesLoadedBeforePlay,
            inning: state.inning,
          })
        : null;

      const nextState: GameState = {
        ...state,
        outs: nextOuts,
        homeScore: nextHomeScore,
        awayScore: nextAwayScore,
        bases: updatedBases,
        currentBatterIndex: (state.currentBatterIndex + 1) % lineupSize,
        atBatCount: state.atBatCount + 1,
        inningStrikeouts: nextInningStrikeouts,
        consecutiveHRCount: nextConsecutiveHRCount,
        lastHRBatterId: nextLastHRBatterId,
        maxDeficitAway: nextMaxDeficitAway,
        maxDeficitHome: nextMaxDeficitHome,
        lastPitcherUpdate: updatedPitcherStats
          ? { pitcherId: currentPitcherId, stats: updatedPitcherStats }
          : null,
      };

      return withUndoSnapshot(state, nextState);
    }

    case 'RECORD_EVENT': {
      let updatedBases: Bases = { ...state.bases };
      let nextOuts = state.outs;
      let nextAwayScore = state.awayScore;
      let nextHomeScore = state.homeScore;
      let nextMaxDeficitAway = state.maxDeficitAway;
      let nextMaxDeficitHome = state.maxDeficitHome;

      if (action.event === 'BALK') {
        if (updatedBases.third) {
          if (state.halfInning === 'TOP') {
            nextAwayScore += 1;
            nextMaxDeficitHome = Math.max(nextMaxDeficitHome, nextAwayScore - nextHomeScore);
          } else {
            nextHomeScore += 1;
            nextMaxDeficitAway = Math.max(nextMaxDeficitAway, nextHomeScore - nextAwayScore);
          }
          updatedBases.third = null;
        }
        if (updatedBases.second) {
          updatedBases.third = updatedBases.second;
          updatedBases.second = null;
        }
        if (updatedBases.first) {
          updatedBases.second = updatedBases.first;
          updatedBases.first = null;
        }
      } else if (action.result) {
        const { runner, outcome, toBase } = action.result;
        const runnerInfo = updatedBases[runner];

        if (outcome === 'OUT') {
          updatedBases[runner] = null;
          nextOuts = Math.min(state.outs + 1, 3);
        } else if (outcome === 'SCORE') {
          if (runnerInfo) {
            if (state.halfInning === 'TOP') {
              nextAwayScore += 1;
              nextMaxDeficitHome = Math.max(nextMaxDeficitHome, nextAwayScore - nextHomeScore);
            } else {
              nextHomeScore += 1;
              nextMaxDeficitAway = Math.max(nextMaxDeficitAway, nextHomeScore - nextAwayScore);
            }
          }
          updatedBases[runner] = null;
        } else if (outcome === 'ADVANCE') {
          if (toBase === 'second') {
            updatedBases.second = runnerInfo;
            updatedBases.first = null;
          } else if (toBase === 'third') {
            updatedBases.third = runner === 'first' ? runnerInfo : updatedBases.second;
            if (runner === 'first') updatedBases.first = null;
            else updatedBases.second = null;
          }
        }
      }

      return withUndoSnapshot(state, {
        ...state,
        outs: nextOuts,
        awayScore: nextAwayScore,
        homeScore: nextHomeScore,
        bases: updatedBases,
        maxDeficitAway: nextMaxDeficitAway,
        maxDeficitHome: nextMaxDeficitHome,
        lastPitcherUpdate: null,
      });
    }

    case 'FLIP_INNING':
      return withUndoSnapshot(state, applyFlipInningState(state));

    case 'UNDO': {
      if (state.undoStack.length === 0) return state;
      const previousState = state.undoStack[state.undoStack.length - 1];
      const remainingStack = state.undoStack.slice(0, -1);
      return {
        ...previousState,
        undoStack: remainingStack,
        lastPitcherUpdate: null,
      };
    }

    case 'SYNC_PERSISTENCE': {
      const nextState: GameState = {
        ...state,
        ...action.state,
        bases: { ...action.state.bases },
        lastPitcherUpdate: null,
      };
      return withUndoSnapshot(state, nextState);
    }

    case 'REHYDRATE_STATE':
      return {
        ...action.state,
        bases: { ...action.state.bases },
        undoStack: [],
        lastPitcherUpdate: null,
      };

    default:
      return state;
  }
};

// Props interface for GameTracker
interface GameTrackerProps {
  onGameEnd?: (data: {
    awayTeamId: string;
    homeTeamId: string;
    awayScore: number;
    homeScore: number;
    innings: number;
    isWalkoff: boolean;
    topBatters: Array<{ name: string; stats: string; teamId: string }>;
    topPitchers: Array<{ name: string; stats: string; decision: 'W' | 'L' | 'S' | 'H' | null; teamId: string }>;
    playerOfGame: { name: string; teamId: string; stats: string; fameBonus: number } | null;
  }) => void;
}

export default function GameTracker({ onGameEnd }: GameTrackerProps = {}) {
  const [state, dispatch] = useReducer(gameReducer, initialGameState);
  const {
    inning,
    halfInning,
    outs,
    homeScore,
    awayScore,
    bases,
    currentBatterIndex,
    atBatCount,
    inningStrikeouts,
    consecutiveHRCount,
    lastHRBatterId,
    maxDeficitAway,
    maxDeficitHome,
    undoStack,
  } = state;

  const syncReducerState = useCallback((partial: Partial<PersistedReducerState>) => {
    dispatch({
      type: 'SYNC_PERSISTENCE',
      state: {
        inning: state.inning,
        halfInning: state.halfInning,
        outs: state.outs,
        homeScore: state.homeScore,
        awayScore: state.awayScore,
        bases: state.bases,
        currentBatterIndex: state.currentBatterIndex,
        atBatCount: state.atBatCount,
        inningStrikeouts: state.inningStrikeouts,
        consecutiveHRCount: state.consecutiveHRCount,
        lastHRBatterId: state.lastHRBatterId,
        maxDeficitAway: state.maxDeficitAway,
        maxDeficitHome: state.maxDeficitHome,
        ...partial,
      },
    });
  }, [state]);

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
  const [pendingSubType, setPendingSubType] = useState<'PITCH_CHANGE' | 'PINCH_HIT' | 'PINCH_RUN' | 'DEF_SUB' | 'POS_SWITCH' | null>(null);

  // ============================================
  // FAME SYSTEM STATE
  // Per FAN_HAPPINESS_SPEC.md
  // ============================================
  const [fameEvents, setFameEvents] = useState<FameEvent[]>([]);
  const [fameToasts, setFameToasts] = useState<FameEvent[]>([]);
  const [fameModalOpen, setFameModalOpen] = useState(false);
  // Fame settings with toggle functions
  const [fameSettings, setFameSettings] = useState<FameAutoDetectionSettings>(DEFAULT_FAME_SETTINGS);

  // Player Card modal state
  const [playerCardOpen, setPlayerCardOpen] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<{ playerId: string; playerName: string; teamId: string } | null>(null);

  // Handler to open player card when clicking on a player in leaderboards
  const handlePlayerClick = useCallback((playerId: string, playerName: string, teamId: string) => {
    setSelectedPlayer({ playerId, playerName, teamId });
    setPlayerCardOpen(true);
  }, []);

  // Season Summary modal state
  const [seasonSummaryOpen, setSeasonSummaryOpen] = useState(false);

  // Lineup Panel state
  const [showLineupPanel, setShowLineupPanel] = useState(false);

  // ============================================
  // INNING END SUMMARY STATE
  // Per Ralph Framework S-B011
  // ============================================
  const [showInningEndSummary, setShowInningEndSummary] = useState(false);
  const [halfInningRuns, setHalfInningRuns] = useState(0);
  const [halfInningHits, setHalfInningHits] = useState(0);
  // Data captured at inning flip for display
  interface InningEndData {
    inning: number;
    halfInning: HalfInning;
    teamName: string;
    runs: number;
    hits: number;
    lob: number;
  }
  const [inningEndData, setInningEndData] = useState<InningEndData | null>(null);

  // ============================================
  // PITCHER EXIT PROMPT STATE
  // Per Ralph Framework S-B012
  // ============================================
  const [showPitcherExitPrompt, setShowPitcherExitPrompt] = useState(false);
  // Track which thresholds have been acknowledged for each pitcher
  // Key: pitcherId, Value: highest threshold shown (85, 100, 115)
  const [acknowledgedPitchThresholds, setAcknowledgedPitchThresholds] = useState<Record<string, number>>({});
  const PITCH_THRESHOLDS = [85, 100, 115] as const;

  // ============================================
  // WALKOFF CELEBRATION STATE
  // Per Ralph Framework S-B016
  // ============================================
  const [showWalkoffCelebration, setShowWalkoffCelebration] = useState(false);
  const [walkoffResult, setWalkoffResult] = useState<WalkoffResult | null>(null);

  // Mojo/Fitness: User-controlled only. Hooks manage the Map state;
  // these callbacks delegate to the hooks so LineupPanel edits are
  // reflected everywhere (Scoreboard, PlayerCard, pitcher bar, etc.)
  // NOTE: mojoState / fitnessState hooks are instantiated below (line ~459)
  // and are referenced in handleMojoChange / handleFitnessChange via closure.

  // Toggle Fame toast notifications
  const toggleFameToasts = useCallback(() => {
    setFameSettings(prev => ({ ...prev, showToasts: !prev.showToasts }));
  }, []);
  const [endGameFameSummaryOpen, setEndGameFameSummaryOpen] = useState(false);
  const [preSelectedFameEvent, setPreSelectedFameEvent] = useState<FameEventType | undefined>(undefined);

  // Fan morale state (would be loaded from team data in full implementation)
  const [fanMorale, setFanMorale] = useState(60); // Default: CONTENT
  const [moraleTrend, setMoraleTrend] = useState<'rising' | 'falling' | 'stable'>('stable');

  // Game ID for Fame events (would come from game setup in full implementation)
  const gameId = 'demo-game';

  // Team identifiers - get actual team names from database (GAP-033)
  const awayTeamId = DEFAULT_AWAY_TEAM;
  const homeTeamId = DEFAULT_HOME_TEAM;
  const awayTeamName = getTeam(DEFAULT_AWAY_TEAM)?.name || 'Away';
  const homeTeamName = getTeam(DEFAULT_HOME_TEAM)?.name || 'Home';

  // Fame auto-detection tracking state now lives in reducer

  // ============================================
  // PER-INNING PITCH TRACKING (for Immaculate Inning detection)
  // Per MILESTONE_SYSTEM_SPEC.md - Immaculate Inning = 3K on exactly 9 pitches
  // ============================================
  interface InningPitchData {
    pitches: number;
    strikeouts: number;
    pitcherId: string;
  }
  const [currentInningPitches, setCurrentInningPitches] = useState<InningPitchData>({
    pitches: 0,
    strikeouts: 0,
    pitcherId: ''
  });

  // Event log sequence counter (for bulletproof data integrity)
  const [eventSequence, setEventSequence] = useState(0);
  const [gameHeaderCreated, setGameHeaderCreated] = useState(false);

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

  useEffect(() => {
    if (!state.lastPitcherUpdate) return;
    const { pitcherId, stats } = state.lastPitcherUpdate;
    setPitcherGameStats(prev => {
      const next = new Map(prev);
      next.set(pitcherId, stats);
      return next;
    });
  }, [state.lastPitcherUpdate]);

  // Get current pitcher based on half inning and lineup state
  const getCurrentPitcherId = useCallback(() => {
    // Use actual current pitcher from lineup state if available (updated by pitching changes)
    // Fall back to default IDs if no pitcher tracked yet
    if (lineupState.currentPitcher) {
      return lineupState.currentPitcher.playerId;
    }
    // When TOP of inning, home team is pitching; when BOTTOM, away team is pitching
    return halfInning === 'TOP' ? 'home_pitcher' : 'away_pitcher';
  }, [halfInning, lineupState.currentPitcher]);

  // Initialize Fame detection hook
  // Note: We don't use onFameDetected callback because we explicitly capture
  // and handle results where checkForFameEvents is called (avoiding duplicates)
  const fameDetection = useFameDetection({
    settings: fameSettings
  });

  // ============================================
  // CLUTCH & MWAR CALCULATIONS (Day 2 Wire-up)
  // Per IMPLEMENTATION_PLAN.md v5 - Day 2
  // ============================================
  const clutchCalculations = useClutchCalculations();
  const mwarCalculations = useMWARCalculations();

  // ============================================
  // MOJO & FITNESS STATE (Day 3 Wire-up)
  // Per IMPLEMENTATION_PLAN.md v5 - Day 3
  // ============================================
  const mojoState = useMojoState();
  const fitnessState = useFitnessState();

  // Callbacks to adjust mojo/fitness from LineupPanel (delegates to hooks)
  const handleMojoChange = useCallback((playerId: string, newLevel: MojoLevel) => {
    mojoState.setPlayerMojo(playerId, newLevel);
  }, [mojoState.setPlayerMojo]);

  const handleFitnessChange = useCallback((playerId: string, newState: FitnessState) => {
    fitnessState.setPlayerFitness(playerId, newState);
  }, [fitnessState.setPlayerFitness]);

  // ============================================
  // GAME PERSISTENCE (Phase 2)
  // Per STAT_TRACKING_ARCHITECTURE_SPEC.md
  // ============================================
  const gamePersistence = useGamePersistence({ enabled: true, autoSaveDelay: 500 });

  // Rehydration handshake flag: blocks render + autosave until persistence sync finishes
  const [isRehydrated, setIsRehydrated] = useState(false);
  const [rehydrationDispatchDone, setRehydrationDispatchDone] = useState(false);

  // Auto-rehydrate once persistence init completes
  useEffect(() => {
    if (gamePersistence.isLoading) return;
    if (isRehydrated) return;
    if (rehydrationDispatchDone) return;

    let cancelled = false;
    const rehydrate = async () => {
      if (!gamePersistence.hasSavedGame) {
        if (!cancelled) {
          setIsRehydrated(true);
        }
        return;
      }

      const savedState = await gamePersistence.loadGame();
      if (cancelled || !savedState) {
        return;
      }

      const rehydratedState: GameState = {
        ...initialGameState,
        inning: savedState.inning,
        halfInning: savedState.halfInning,
        outs: savedState.outs,
        homeScore: savedState.homeScore,
        awayScore: savedState.awayScore,
        bases: savedState.bases,
        currentBatterIndex: savedState.currentBatterIndex,
        atBatCount: savedState.atBatCount,
        inningStrikeouts: savedState.inningStrikeouts,
        consecutiveHRCount: savedState.consecutiveHRCount,
        lastHRBatterId: savedState.lastHRBatterId,
        maxDeficitAway: savedState.maxDeficitAway,
        maxDeficitHome: savedState.maxDeficitHome,
      };

      dispatch({ type: 'REHYDRATE_STATE', state: rehydratedState });
      setPlayerStats(savedState.playerStats);
      setPitcherGameStats(savedState.pitcherGameStats);
      setFameEvents(savedState.fameEvents);
      setActivityLog([`📂 Game restored from save`, ...savedState.activityLog.slice(0, 9)]);
      if (savedState.currentInningPitches) {
        setCurrentInningPitches(savedState.currentInningPitches);
      }

      if (!cancelled) {
        setRehydrationDispatchDone(true);
      }
    };

    rehydrate();
    return () => {
      cancelled = true;
    };
  }, [
    gamePersistence.isLoading,
    gamePersistence.hasSavedGame,
    gamePersistence.loadGame,
    isRehydrated,
    rehydrationDispatchDone,
  ]);

  // Mark rehydration complete only after dispatch has been processed.
  useEffect(() => {
    if (!rehydrationDispatchDone) return;
    setIsRehydrated(true);
    setRehydrationDispatchDone(false);
  }, [rehydrationDispatchDone]);

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
      currentInningPitches,
      seasonNumber: 1,
    };
  }, [
    gameId, inning, halfInning, outs, homeScore, awayScore, bases,
    currentBatterIndex, atBatCount, awayTeamId, homeTeamId, awayTeamName, homeTeamName,
    playerStats, pitcherGameStats, fameEvents, lastHRBatterId, consecutiveHRCount,
    inningStrikeouts, maxDeficitAway, maxDeficitHome, activityLog, currentInningPitches
  ]);

  // Auto-save when key game state changes
  useEffect(() => {
    if (!isRehydrated) return;
    // Don't save during initial load
    if (gamePersistence.isLoading) return;
    // Don't save if game hasn't started (no at-bats yet)
    if (atBatCount === 0 && inning === 1 && outs === 0) return;

    gamePersistence.triggerAutoSave(buildPersistenceState());
  }, [
    inning, halfInning, outs, homeScore, awayScore, atBatCount,
    buildPersistenceState, gamePersistence, isRehydrated
  ]);

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
        batterHand: demoLineup.find(p => p.id === currentBatterFromLineup.playerId)?.batterHand || ('R' as const),
      }
    : demoLineup[currentBatterIndex];

  // Handle undo
  const handleUndo = () => {
    if (undoStack.length === 0) return;
    dispatch({ type: 'UNDO' });
  };

  // Calculate situational context
  const situationalContext = updateSituationalContext(
    { away: awayScore, home: homeScore },
    inning,
    halfInning,
    bases
  );

  // Calculate current Leverage Index for display
  // Per LEVERAGE_INDEX_SPEC.md - LI measures game state importance
  const currentLeverageIndex = calculateLeverageIndex({
    inning,
    halfInning,
    outs: outs as 0 | 1 | 2,
    runners: {
      first: !!bases.first,
      second: !!bases.second,
      third: !!bases.third,
    },
    homeScore,
    awayScore,
  });

  // Infield Fly Rule is in effect when:
  // 1. Less than 2 outs
  // 2. Runners on 1st and 2nd, OR bases loaded
  const isInfieldFlyRule = outs < 2 && bases.first && bases.second;

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
      inningsPerGame: 9,
      maxDeficitOvercome: awayScore > homeScore ? maxDeficitAway : maxDeficitHome,
      lastHRBatterId,
      consecutiveHRCount,
      isFirstAtBatOfGame: false,
      leadChanges: 0,
      previousLeadTeam: (awayScore > homeScore ? 'away' : homeScore > awayScore ? 'home' : 'tie') as 'away' | 'home' | 'tie',
      maxLeadBlown: { away: 0, home: 0 },
      // End-game pitcher mojo/fitness (for CG, shutout, no-hitter, Maddux)
      pitcherMojo: mojoState.getPlayerMojo(getCurrentPitcherId()).level,
      pitcherFitness: fitnessState.getPlayerFitness(getCurrentPitcherId()).state,
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

    // Run end-game Fame detection and capture results
    const endGameFameResults = fameDetection.checkEndGameFame(gameContext, allPitchers as unknown as FamePlayerStats[]);

    // Explicitly add end-game Fame events to state
    endGameFameResults.forEach(detection => {
      addFameEvent(detection.event);
    });

    // Check for comeback win (team-level)
    // Use the winning team's max deficit they overcame
    const winningTeamDeficit = awayScore > homeScore ? maxDeficitAway : maxDeficitHome;
    if (winningTeamDeficit >= 3) {
      const winningTeamId = awayScore > homeScore ? awayTeamId : homeTeamId;
      const winningTeamName = awayScore > homeScore ? awayTeamName : homeTeamName;
      const comebackResult = fameDetection.detectComebackWin(gameContext, winningTeamId, winningTeamName);
      if (comebackResult) {
        addFameEvent(comebackResult.event);
      }
    }

    // Archive completed game and clear saved state
    const persistedState = buildPersistenceState();
    gamePersistence.archiveGame(persistedState, { away: awayScore, home: homeScore });

    // ============================================
    // EVENT LOG: Mark game complete and aggregate (Phase 4)
    // Per STAT_TRACKING_ARCHITECTURE_SPEC.md
    // ============================================
    (async () => {
      try {
        // Mark game as complete in event log
        await completeGame(gameId, { away: awayScore, home: homeScore }, inning);
        console.log('[EventLog] Game marked complete:', gameId);

        // Aggregate game stats into season totals (Phase 3)
        await aggregateGameToSeason(persistedState as unknown as PersistedGameState);
        console.log('[EventLog] Season aggregation successful');

        // Mark as aggregated in event log
        await markGameAggregated(gameId);
        console.log('[EventLog] Game marked as aggregated:', gameId);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Unknown error';
        console.error('[EventLog] Failed to complete game processing:', errorMsg);

        // Mark aggregation as failed (will retry on next startup)
        try {
          await markAggregationFailed(gameId, errorMsg);
        } catch (markErr) {
          console.error('[EventLog] Failed to mark aggregation failure:', markErr);
        }
      }
    })();

    // Open the end-game Fame summary
    setEndGameFameSummaryOpen(true);

    // ============================================
    // Calculate top performers for PostGameScreen
    // ============================================
    if (onGameEnd) {
      // Build batter stats by combining playerStats with demoLineup for names
      // Both away and home lineups are stored in demoLineup for now (away team)
      // and awayData/homeData for home team
      const allBatterStats: Array<{
        playerId: string;
        name: string;
        teamId: string;
        hits: number;
        atBats: number;
        rbi: number;
        runs: number;
        hrs: number;
        doubles: number;
        triples: number;
        walks: number;
        score: number;
      }> = [];

      // Get batters from demoLineup (tracks all players with stats)
      // In the current implementation, demoLineup contains away team players
      demoLineup.forEach(player => {
        const stats = playerStats[player.id];
        if (stats && stats.ab > 0) {
          allBatterStats.push({
            playerId: player.id,
            name: player.name,
            teamId: awayTeamId,
            hits: stats.h,
            atBats: stats.ab,
            rbi: stats.rbi,
            runs: stats.r,
            hrs: stats.hr,
            doubles: stats.doubles,
            triples: stats.triples,
            walks: stats.bb,
            score: stats.h + (stats.hr * 2) + (stats.rbi * 1.5) + (stats.r * 0.5),
          });
        }
      });

      // Also check lineup state for home team players (current lineup)
      lineupState.lineup.forEach((player: LineupPlayer) => {
        // Skip if already added from demoLineup
        if (allBatterStats.some(b => b.playerId === player.playerId)) return;
        const stats = playerStats[player.playerId];
        if (stats && stats.ab > 0) {
          allBatterStats.push({
            playerId: player.playerId,
            name: player.playerName,
            teamId: homeTeamId,
            hits: stats.h,
            atBats: stats.ab,
            rbi: stats.rbi,
            runs: stats.r,
            hrs: stats.hr,
            doubles: stats.doubles,
            triples: stats.triples,
            walks: stats.bb,
            score: stats.h + (stats.hr * 2) + (stats.rbi * 1.5) + (stats.r * 0.5),
          });
        }
      });

      // Sort by performance score
      allBatterStats.sort((a, b) => b.score - a.score);

      // Top 3 batters
      const topBatters = allBatterStats.slice(0, 3).map(b => {
        const extras: string[] = [];
        if (b.hrs > 0) extras.push(`${b.hrs} HR`);
        if (b.doubles > 0) extras.push(`${b.doubles} 2B`);
        if (b.triples > 0) extras.push(`${b.triples} 3B`);
        const statsLine = `${b.hits}-${b.atBats}${b.rbi > 0 ? `, ${b.rbi} RBI` : ''}${extras.length > 0 ? `, ${extras.join(', ')}` : ''}`;
        return { name: b.name, stats: statsLine, teamId: b.teamId };
      });

      // Get pitcher stats
      const allPitcherStats = Array.from(pitcherGameStats.values())
        .map(p => ({
          pitcherId: p.pitcherId,
          name: p.pitcherName,
          teamId: p.teamId,
          ip: (p.outsRecorded / 3).toFixed(1),
          outsRecorded: p.outsRecorded,
          er: p.runsAllowed, // Using runs as ER approximation
          hits: p.hitsAllowed,
          walks: p.walksAllowed,
          k: p.strikeoutsThrown,
          isStarter: p.isStarter,
        }))
        .filter(p => p.outsRecorded > 0);

      // Determine W/L/S for pitchers
      const winningTeamId = awayScore > homeScore ? awayTeamId : homeTeamId;
      const losingTeamId = awayScore > homeScore ? homeTeamId : awayTeamId;

      // Find winning pitcher (starter or first reliever for winning team with good stats)
      const winningTeamPitchers = allPitcherStats.filter(p => p.teamId === winningTeamId);
      const losingTeamPitchers = allPitcherStats.filter(p => p.teamId === losingTeamId);

      // Simple logic: Starter who pitched 5+ IP and team won gets W, last pitcher for loser with earned runs gets L
      const winnerStarter = winningTeamPitchers.find(p => p.isStarter && p.outsRecorded >= 15);
      const loserStarter = losingTeamPitchers.find(p => p.isStarter);

      const topPitchers = allPitcherStats.slice(0, 3).map(p => {
        let decision: 'W' | 'L' | 'S' | 'H' | null = null;
        if (winnerStarter && p.pitcherId === winnerStarter.pitcherId) decision = 'W';
        else if (loserStarter && p.pitcherId === loserStarter.pitcherId) decision = 'L';

        const statsLine = `${p.ip} IP, ${p.er} ER, ${p.k} K`;
        return { name: p.name, stats: statsLine, decision, teamId: p.teamId };
      });

      // Determine Player of the Game (highest performing batter or a dominant pitcher)
      let playerOfGame: { name: string; teamId: string; stats: string; fameBonus: number } | null = null;

      // Check for dominant pitcher (7+ IP, 0-1 ER)
      const dominantPitcher = allPitcherStats.find(p => p.outsRecorded >= 21 && p.er <= 1);
      if (dominantPitcher) {
        playerOfGame = {
          name: dominantPitcher.name,
          teamId: dominantPitcher.teamId,
          stats: `${dominantPitcher.ip} IP, ${dominantPitcher.er} ER, ${dominantPitcher.k} K`,
          fameBonus: 2,
        };
      } else if (allBatterStats.length > 0) {
        const topBatterData = allBatterStats[0];
        const extras: string[] = [];
        if (topBatterData.hrs > 0) extras.push(`${topBatterData.hrs} HR`);
        if (topBatterData.doubles > 0) extras.push(`${topBatterData.doubles} 2B`);
        playerOfGame = {
          name: topBatterData.name,
          teamId: topBatterData.teamId,
          stats: `${topBatterData.hits}-${topBatterData.atBats}, ${topBatterData.rbi} RBI, ${topBatterData.runs} R${extras.length > 0 ? ', ' + extras.join(', ') : ''}`,
          fameBonus: 2,
        };
      }

      // Detect walkoff: home team wins in bottom of 9th+ with go-ahead run
      const isWalkoffWin = halfInning === 'BOTTOM' && inning >= 9 && homeScore > awayScore;

      // Call the callback with game end data
      onGameEnd({
        awayTeamId,
        homeTeamId,
        awayScore,
        homeScore,
        innings: inning,
        isWalkoff: isWalkoffWin,
        topBatters,
        topPitchers,
        playerOfGame,
      });
    }
  }, [
    gameId, inning, halfInning, outs, awayScore, homeScore, bases,
    maxDeficitAway, maxDeficitHome, lastHRBatterId, consecutiveHRCount,
    pitcherGameStats, fameDetection, awayTeamId, homeTeamId, awayTeamName, homeTeamName,
    gamePersistence, buildPersistenceState, addFameEvent, onGameEnd, playerStats, lineupState
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

  // Calculate LOB from current base state
  const calculateCurrentLOB = useCallback(() => calculateLOB(bases), [bases]);

  // Actually perform the inning flip (called after summary closes)
  const performInningFlip = useCallback(() => {
    dispatch({ type: 'FLIP_INNING' });
    // Reset per-inning pitch tracking for Immaculate Inning detection
    setCurrentInningPitches({ pitches: 0, strikeouts: 0, pitcherId: '' });
    // Reset half-inning stats for next half
    setHalfInningRuns(0);
    setHalfInningHits(0);
  }, []);

  // Handle inning end summary close
  const handleInningEndSummaryClose = useCallback(() => {
    setShowInningEndSummary(false);
    setInningEndData(null);
    // Now actually flip the inning
    performInningFlip();
  }, [performInningFlip]);

  // ============================================
  // PITCHER EXIT PROMPT HANDLERS
  // Per Ralph Framework S-B012
  // ============================================
  // Check if pitcher has crossed a new threshold
  const checkPitcherFatigue = useCallback((pitcherId: string, pitchCount: number) => {
    const acknowledgedThreshold = acknowledgedPitchThresholds[pitcherId] || 0;

    // Find the highest threshold crossed that hasn't been acknowledged
    for (let i = PITCH_THRESHOLDS.length - 1; i >= 0; i--) {
      const threshold = PITCH_THRESHOLDS[i];
      if (pitchCount >= threshold && threshold > acknowledgedThreshold) {
        setShowPitcherExitPrompt(true);
        return; // Only show one prompt at a time
      }
    }
  }, [acknowledgedPitchThresholds]);

  // Handle "Keep In" - acknowledge current threshold
  const handleKeepPitcherIn = useCallback(() => {
    const pitcherId = getCurrentPitcherId();
    const stats = pitcherGameStats.get(pitcherId);
    const pitchCount = stats?.pitchCount || 0;

    // Find highest crossed threshold to acknowledge
    let highestCrossed = 0;
    for (const threshold of PITCH_THRESHOLDS) {
      if (pitchCount >= threshold) {
        highestCrossed = threshold;
      }
    }

    setAcknowledgedPitchThresholds(prev => ({
      ...prev,
      [pitcherId]: highestCrossed,
    }));
    setShowPitcherExitPrompt(false);
  }, [getCurrentPitcherId, pitcherGameStats]);

  // Handle "Make Change" - open pitching change modal
  const handlePitcherExitChange = useCallback(() => {
    setShowPitcherExitPrompt(false);
    setPendingSubType('PITCH_CHANGE');
  }, []);

  // Flip inning - shows summary first, then flips when closed
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

    // Capture stats for the inning end summary
    const teamName = halfInning === 'TOP' ? awayTeamName : homeTeamName;
    const lob = calculateCurrentLOB();

    setInningEndData({
      inning,
      halfInning,
      teamName,
      runs: halfInningRuns,
      hits: halfInningHits,
      lob,
    });
    setShowInningEndSummary(true);
  }, [halfInning, inning, awayScore, homeScore, awayTeamName, homeTeamName, checkGameEnd, handleEndGame, calculateCurrentLOB, halfInningRuns, halfInningHits]);

  useEffect(() => {
    if (outs < 3 || showInningEndSummary) return;
    flipInning();
  }, [outs, showInningEndSummary, flipInning]);

  // Find player ID by defensive position (for fielding stat credit)
  const getPlayerIdByPosition = (position: Position): string | null => {
    const player = lineupState.lineup.find(p => p.position === position);
    return player?.playerId || null;
  };

  // Find full player info by defensive position (for fielding event logging)
  const getPlayerByPosition = (position: Position): { playerId: string; playerName: string } | null => {
    const player = lineupState.lineup.find(p => p.position === position);
    if (!player) return null;
    return { playerId: player.playerId, playerName: player.playerName };
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

  // ============================================
  // EVENT LOG HELPERS
  // Per STAT_TRACKING_ARCHITECTURE_SPEC.md Phase 4
  // ============================================

  // Convert current bases to RunnerState for event logging
  const buildRunnerState = useCallback((): RunnerState => {
    const toRunnerInfo = (runner: Runner | null, pitcherId: string): RunnerInfo | null => {
      if (!runner) return null;
      return {
        runnerId: runner.playerId,
        runnerName: runner.playerName,
        responsiblePitcherId: runner.inheritedFrom || pitcherId,
      };
    };
    const currentPitcherId = getCurrentPitcherId();
    return {
      first: toRunnerInfo(bases.first, currentPitcherId),
      second: toRunnerInfo(bases.second, currentPitcherId),
      third: toRunnerInfo(bases.third, currentPitcherId),
    };
  }, [bases, getCurrentPitcherId]);

  // Helper: Map result and playType to ball trajectory for BallInPlayData
  const mapPlayTypeToTrajectory = (result: AtBatResult, playType: string): 'ground' | 'line' | 'fly' | 'popup' | 'bunt' => {
    if (['GO', 'DP', 'FC', 'SAC'].includes(result)) return 'ground';
    if (['FO', 'SF'].includes(result)) return 'fly';
    if (result === 'LO') return 'line';
    if (result === 'PO') return 'popup';
    // For hits, infer from playType or default
    if (playType === 'diving' || playType === 'charging') return 'ground';
    if (playType === 'wall' || playType === 'leaping') return 'fly';
    return 'line'; // Default for hits
  };

  // Helper: Map direction to field zone number
  const mapDirectionToZone = (direction: Direction | null | undefined): number => {
    if (!direction) return 3; // Default to center
    const zoneMap: Record<string, number> = {
      'Left': 1,
      'Left-Center': 2,
      'Center': 3,
      'Right-Center': 4,
      'Right': 5,
    };
    return zoneMap[direction] || 3;
  };

  // Helper: Map FieldingData.playType to FieldingEvent.difficulty
  const mapPlayTypeToDifficulty = (playType: string): 'routine' | 'likely' | '50-50' | 'unlikely' | 'spectacular' => {
    const difficultyMap: Record<string, 'routine' | 'likely' | '50-50' | 'unlikely' | 'spectacular'> = {
      'routine': 'routine',
      'charging': 'likely',
      'running': 'likely',
      'sliding': '50-50',
      'diving': 'unlikely',
      'leaping': 'unlikely',
      'over_shoulder': 'unlikely',
      'wall': 'spectacular',
      'robbed_hr': 'spectacular',
    };
    return difficultyMap[playType] || 'routine';
  };

  // Create game header on first at-bat (lazy initialization)
  const ensureGameHeaderCreated = useCallback(async () => {
    if (gameHeaderCreated) return;

    const seasonId = 'season-2026'; // Would come from game setup
    try {
      // BUG-004/BUG-005 FIX: Ensure season exists before creating game
      // This creates the season if it doesn't exist, making WAR/leaderboards work
      await getOrCreateSeason(
        seasonId,
        1, // seasonNumber
        '2026 Season', // seasonName
        48 // totalGames (SMB4 default season length)
      );
      console.log('[Season] Season ensured:', seasonId);

      await createGameHeader({
        gameId,
        seasonId,
        date: Date.now(),
        awayTeamId,
        awayTeamName,
        homeTeamId,
        homeTeamName,
        finalScore: null,
        finalInning: 9,
        isComplete: false,
      });
      setGameHeaderCreated(true);
      console.log('[EventLog] Game header created:', gameId);
    } catch (err) {
      console.error('[EventLog] Failed to create game header:', err);
    }
  }, [gameId, gameHeaderCreated, awayTeamId, awayTeamName, homeTeamId, homeTeamName]);

  // Log an at-bat event to the event log
  const logAtBatToEventLog = useCallback(async (
    result: AtBatResult,
    rbiCount: number,
    runsScored: number,
    outsAfter: number,
    runnersAfter: RunnerState,
    awayScoreAfter: number,
    homeScoreAfter: number,
    detectedFameEvents: FameEvent[],
    fieldingData?: FieldingData,
    direction?: Direction | null,
    specialPlay?: SpecialPlayType | null
  ) => {
    // Ensure game header exists
    await ensureGameHeaderCreated();

    const newSequence = eventSequence + 1;
    setEventSequence(newSequence);

    const currentPitcherId = getCurrentPitcherId();
    const pitcherStats = pitcherGameStats.get(currentPitcherId);
    const currentTeamId = halfInning === 'TOP' ? awayTeamId : homeTeamId;
    const pitcherTeamId = halfInning === 'TOP' ? homeTeamId : awayTeamId;

    // Build runner state BEFORE the at-bat
    const runnersBefore = buildRunnerState();

    // Calculate leverage index using centralized mojoSystem
    const leverageGameState: LeverageGameState = {
      inning,
      halfInning,
      outs: outs as 0 | 1 | 2,
      runners: {
        first: !!bases.first,
        second: !!bases.second,
        third: !!bases.third,
      },
      homeScore,
      awayScore,
    };
    const leverageIndex = calculateLeverageIndex(leverageGameState);

    // Calculate win probability (simplified)
    const winProbBefore = calculateSimpleWinProbability(inning, halfInning, awayScore, homeScore, outs);
    const winProbAfter = calculateSimpleWinProbability(
      outsAfter >= 3 ? inning + (halfInning === 'TOP' ? 0 : 1) : inning,
      outsAfter >= 3 ? (halfInning === 'TOP' ? 'BOTTOM' : 'TOP') : halfInning,
      awayScoreAfter,
      homeScoreAfter,
      outsAfter >= 3 ? 0 : outsAfter
    );

    // WPA from batting team's perspective
    const isHomeBatting = halfInning === 'BOTTOM';
    const wpa = isHomeBatting
      ? winProbAfter - winProbBefore
      : winProbBefore - winProbAfter;

    // Convert Fame events to records
    const fameEventRecords: FameEventRecord[] = detectedFameEvents.map(fe => ({
      eventType: fe.eventType,
      fameType: fe.fameType,
      fameValue: fe.fameValue,
      playerId: fe.playerId,
      playerName: fe.playerName,
      description: fe.description || '',
    }));

    const atBatEvent: EventLogAtBat = {
      eventId: `${gameId}_${newSequence}`,
      gameId,
      sequence: newSequence,
      timestamp: Date.now(),

      // Who
      batterId: currentBatter.id,
      batterName: currentBatter.name,
      batterTeamId: currentTeamId,
      pitcherId: pitcherStats?.pitcherId || currentPitcherId,
      pitcherName: pitcherStats?.pitcherName || 'Unknown',
      pitcherTeamId,

      // Result
      result,
      rbiCount,
      runsScored,

      // Situation BEFORE
      inning,
      halfInning,
      outs,
      runners: runnersBefore,
      awayScore,
      homeScore,

      // Situation AFTER
      outsAfter: outsAfter >= 3 ? 0 : outsAfter,
      runnersAfter,
      awayScoreAfter,
      homeScoreAfter,

      // Calculated metrics
      leverageIndex,
      winProbabilityBefore: winProbBefore,
      winProbabilityAfter: winProbAfter,
      wpa,

      // Ball in play data from fielding modal
      ballInPlay: fieldingData ? {
        trajectory: mapPlayTypeToTrajectory(result, fieldingData.playType),
        zone: mapDirectionToZone(direction),
        velocity: 'medium' as const, // Default - could be enhanced with exit velocity tracking
        fielderIds: [fieldingData.primaryFielder, ...fieldingData.assistChain.map(a => a.position)],
        primaryFielderId: fieldingData.primaryFielder,
      } : null,

      // Fame events
      fameEvents: fameEventRecords,

      // Flags
      isLeadoff: atBatCount === 0 || outs === 0, // Simplified - first batter or first of inning
      isClutch: isClutchSituation(leverageIndex),
      isWalkOff: halfInning === 'BOTTOM' && homeScoreAfter > awayScoreAfter && homeScore <= awayScore,
    };

    try {
      await logAtBatEvent(atBatEvent);
      console.log(`[EventLog] Logged at-bat #${newSequence}: ${currentBatter.name} - ${result}`);

      // Log fielding event if fielding data was captured
      // This persists detailed fielding data for fWAR calculation
      if (fieldingData) {
        const fieldingTeamId = halfInning === 'TOP' ? homeTeamId : awayTeamId;

        // Determine play type for the fielding event
        const isError = fieldingData.playType === 'error' || ['E', 'ROE'].includes(result);
        const isDP = result === 'DP';
        const isOutfieldAssist = fieldingData.assistChain.some(a =>
          ['LF', 'CF', 'RF'].includes(a.position)
        ) && ['GO', 'OUT_HOME', 'OUT_3B', 'OUT_2B'].includes(result);

        // Look up actual player from lineup by position
        const fielderInfo = getPlayerByPosition(fieldingData.primaryFielder);

        const fieldingEvent: EventLogFielding = {
          fieldingEventId: `${gameId}_${newSequence}_fielding`,
          gameId,
          atBatEventId: atBatEvent.eventId,
          sequence: newSequence,

          // Use actual player info from lineup lookup, fallback to position if not found
          playerId: fielderInfo?.playerId || fieldingData.primaryFielder,
          playerName: fielderInfo?.playerName || fieldingData.primaryFielder,
          position: fieldingData.primaryFielder,
          teamId: fieldingTeamId,  // Team that made the defensive play

          playType: isError ? 'error' :
                    isDP ? 'double_play_pivot' :
                    isOutfieldAssist ? 'outfield_assist' :
                    fieldingData.assistChain.length > 0 ? 'assist' : 'putout',
          difficulty: mapPlayTypeToDifficulty(fieldingData.playType),
          specialPlayType: specialPlay ?? null,

          ballInPlay: atBatEvent.ballInPlay || {
            trajectory: mapPlayTypeToTrajectory(result, fieldingData.playType),
            zone: mapDirectionToZone(direction),
            velocity: 'medium',
            fielderIds: [fieldingData.primaryFielder],
            primaryFielderId: fieldingData.primaryFielder,
          },

          success: !isError,
          runsPreventedOrAllowed: fieldingData.savedRun ? 1 : isError ? -1 : 0,
        };

        try {
          await logFieldingEvent(fieldingEvent);
          console.log(`[EventLog] Logged fielding event: ${fieldingData.primaryFielder} - ${fieldingEvent.playType}`);
        } catch (fieldingErr) {
          console.error('[EventLog] Failed to log fielding event:', fieldingErr);
        }
      }
    } catch (err) {
      console.error('[EventLog] Failed to log at-bat:', err);
    }
  }, [
    ensureGameHeaderCreated, eventSequence, gameId, getCurrentPitcherId,
    pitcherGameStats, halfInning, awayTeamId, homeTeamId, buildRunnerState,
    inning, outs, bases, awayScore, homeScore, currentBatter, atBatCount,
    mapPlayTypeToDifficulty, mapPlayTypeToTrajectory, mapDirectionToZone, getPlayerByPosition
  ]);

  // ============================================
  // NOTE: Leverage Index calculation has been moved to ../../utils/mojoSystem.ts
  // Import: calculateLeverageIndex, isClutchSituation, LeverageGameState
  // ============================================

  // Handle at-bat result selection
  const handleResultSelect = (result: AtBatResult) => {
    setPendingResult(result);
  };

  // Handle at-bat flow completion
  const handleAtBatFlowComplete = (flowState: AtBatFlowState) => {
    if (!flowState.result) return;
    const currentPitcherId = getCurrentPitcherId();
    const currentPitcherStats = pitcherGameStats.get(currentPitcherId) ?? null;

    dispatch({
      type: 'RECORD_AT_BAT',
      flowState,
      batterId: currentBatter.id,
      batterName: currentBatter.name,
      lineupSize: demoLineup.length,
      currentPitcherId,
      currentPitcherStats,
    });
  };

  const formatSpecialPlayNote = (specialPlay: SpecialPlayType | null, result: AtBatResult | null): string | null => {
    if (!specialPlay || !result) return null;

    if (result === 'HR') {
      if (specialPlay === 'Over Fence') return null;
      return `(${specialPlay})`;
    }

    if (isHit(result)) {
      if (specialPlay === 'Clean') return null;
      return `(${specialPlay} effort)`;
    }

    if (isOut(result) && specialPlay !== 'Routine') {
      return `(${specialPlay} play)`;
    }

    return null;
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

    const specialNote = formatSpecialPlayNote(flowState.specialPlay, result);
    if (specialNote) {
      log += ` ${specialNote}`;
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
      case 'POS_SWITCH':
        setPendingSubType('POS_SWITCH');
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

    // Initialize pitcher stats for new pitchers
    if (event.eventType === 'PITCH_CHANGE') {
      const pc = event as PitchingChangeEvent;
      setPitcherGameStats((prev) => {
        const newMap = new Map(prev);
        if (!newMap.has(pc.incomingPitcherId)) {
          // Determine team based on which half of inning (home pitches in TOP, away in BOTTOM)
          const teamId = halfInning === 'TOP' ? homeTeamId : awayTeamId;
          newMap.set(
            pc.incomingPitcherId,
            createInitialPitcherStats(
              pc.incomingPitcherId,
              pc.incomingPitcherName,
              teamId,
              false, // Not a starter
              inning // Entry inning
            )
          );
        }
        return newMap;
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
      case 'POS_SWITCH': {
        const ps = event as PositionSwitchEvent;
        logEntry = `Position switch: ${ps.switches.map((s) => `${s.playerName} ${s.fromPosition} → ${s.toPosition}`).join(', ')}`;
        break;
      }
    }

    if (logEntry) {
      setActivityLog((prev) => [logEntry, ...prev.slice(0, 9)]);
    }

    // ============================================
    // MWAR DECISION TRACKING (Day 2 Wire-up)
    // Per MWAR_CALCULATION_SPEC.md - Track manager decisions
    // ============================================
    // Map substitution event types to mWAR decision types
    const decisionTypeMap: Record<string, 'pitching_change' | 'pinch_hitter' | 'pinch_runner' | 'defensive_sub' | null> = {
      'PITCH_CHANGE': 'pitching_change',
      'PINCH_HIT': 'pinch_hitter',
      'PINCH_RUN': 'pinch_runner',
      'DEF_SUB': 'defensive_sub',
      'POS_SWITCH': null, // Position switches don't count as decisions
    };

    const decisionType = decisionTypeMap[event.eventType];
    if (decisionType) {
      // Determine manager ID (using team ID for now)
      const managerId = halfInning === 'TOP' ? awayTeamId : homeTeamId;

      // Get involved players
      let involvedPlayers: string[] = [];
      if (event.eventType === 'PITCH_CHANGE') {
        const pc = event as PitchingChangeEvent;
        involvedPlayers = [pc.incomingPitcherId, pc.outgoingPitcherId];
      } else if (event.eventType === 'PINCH_HIT') {
        const ph = event as PinchHitterEvent;
        involvedPlayers = [ph.pinchHitterId, ph.replacedPlayerId];
      } else if (event.eventType === 'PINCH_RUN') {
        const pr = event as PinchRunnerEvent;
        involvedPlayers = [pr.pinchRunnerId, pr.replacedPlayerId];
      } else if (event.eventType === 'DEF_SUB') {
        const ds = event as DefensiveSubEvent;
        involvedPlayers = ds.substitutions.flatMap((s) => [s.playerInId, s.playerOutId]);
      }

      const mwarDecisionInput: ManagerDecisionInput = {
        decisionType,
        gameId,
        managerId,
        gameState: {
          inning,
          halfInning,
          outs,
          runners: {
            first: !!bases.first,
            second: !!bases.second,
            third: !!bases.third,
          },
          homeScore,
          awayScore,
        },
        involvedPlayers,
        notes: logEntry,
      };

      mwarCalculations.recordDecision(mwarDecisionInput);
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
      syncReducerState({ bases: newBases });
    }

    // Close modal
    setPendingSubType(null);
  };

  // Handle balk
  const handleBalk = () => {
    dispatch({ type: 'RECORD_EVENT', event: 'BALK' });
    setActivityLog(prev => ['Balk - all runners advance one base.', ...prev.slice(0, 9)]);
  };

  // Handle event flow completion
  const handleEventFlowComplete = (result: EventResult) => {
    const { event, runner, outcome, toBase } = result;
    const runnerInfo = bases[runner];
    const runnerName = runnerInfo?.playerName?.split(' ').pop() || 'Runner';

    dispatch({
      type: 'RECORD_EVENT',
      event: event as NonAtBatEvent,
      result,
    });

    if (outcome === 'OUT') {
      const eventName = event === 'SB' ? 'caught stealing' : event === 'PK' ? 'picked off' : 'out';
      setActivityLog(prev => [`${runnerName} ${eventName} at ${toBase || 'base'}.`, ...prev.slice(0, 9)]);
    } else if (outcome === 'SCORE') {
      const eventName = event === 'SB' ? 'steals home!' : `scores on ${event}`;
      setActivityLog(prev => [`${runnerName} ${eventName}`, ...prev.slice(0, 9)]);
    } else if (outcome === 'ADVANCE') {
      const eventName = event === 'SB' ? `steals ${toBase}` : `advances to ${toBase} on ${event}`;
      setActivityLog(prev => [`${runnerName} ${eventName}.`, ...prev.slice(0, 9)]);
    }
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

  // Strict gate: never render gameplay until rehydration handshake completes.
  if (!isRehydrated) return <LoadingSpinner />;

  return (
    <div style={styles.container}>
      <Scoreboard
        awayName={awayTeamName}
        homeName={homeTeamName}
        awayScore={awayScore}
        homeScore={homeScore}
        inning={inning}
        halfInning={halfInning}
        outs={outs}
        gameNumber={1}
        leverageIndex={currentLeverageIndex}
        batterMojo={mojoState.getPlayerMojo(currentBatter.id).level}
        batterName={currentBatter.name}
        pitcherMojo={mojoState.getPlayerMojo(getCurrentPitcherId()).level}
        pitcherName={pitcherGameStats.get(getCurrentPitcherId())?.pitcherName || lineupState.currentPitcher?.playerName}
      />

      {/* Pitcher Info Bar */}
      {(() => {
        const pitcherId = getCurrentPitcherId();
        const stats = pitcherGameStats.get(pitcherId);
        const pitcherName = stats?.pitcherName || lineupState.currentPitcher?.playerName || 'Unknown';
        const pitchCount = stats?.pitchCount ?? 0;
        // Get pitcher fitness state from hook (defaults to FIT)
        const pitcherFitnessData = fitnessState.getPlayerFitness(pitcherId);
        const fitnessInfo = pitcherFitnessData.definition;
        // Get pitcher's team ID (opposite of batting team)
        const pitcherTeamId = halfInning === 'TOP' ? homeTeamId : awayTeamId;
        return (
          <div style={styles.pitcherBar}>
            <span style={styles.pitcherBarLabel}>PITCHING:</span>
            <span
              style={{ ...styles.pitcherBarName, cursor: 'pointer' }}
              onClick={() => handlePlayerClick(pitcherId, pitcherName, pitcherTeamId)}
              title="Click to view player stats"
            >
              {pitcherName}
            </span>
            <span style={styles.pitcherBarDivider}>|</span>
            <span style={styles.pitcherBarPitches}>
              Pitches: <strong>{pitchCount}</strong>
            </span>
            <span style={styles.pitcherBarDivider}>|</span>
            <span
              style={{
                ...styles.pitcherFitnessBadge,
                color: fitnessInfo.color,
                backgroundColor: `${fitnessInfo.color}20`,
              }}
              title={`Fitness: ${fitnessInfo.displayName}`}
            >
              {fitnessInfo.emoji} {fitnessInfo.displayName}
            </span>
            {/* Pitcher Mojo Badge */}
            {(() => {
              const pitcherMojoInfo = mojoState.getPlayerMojo(pitcherId);
              const mojoColor = MOJO_STATES[pitcherMojoInfo.level].name === 'NORMAL' ? '#888' :
                pitcherMojoInfo.level > 0 ? '#22c55e' : '#ef4444';
              return pitcherMojoInfo.level !== 0 ? (
                <>
                  <span style={styles.pitcherBarDivider}>|</span>
                  <span
                    style={{
                      ...styles.pitcherFitnessBadge,
                      color: mojoColor,
                      backgroundColor: `${mojoColor}20`,
                    }}
                    title={`Mojo: ${pitcherMojoInfo.state.displayName}`}
                  >
                    {pitcherMojoInfo.state.emoji} {pitcherMojoInfo.state.displayName}
                  </span>
                </>
              ) : null;
            })()}
          </div>
        );
      })()}

      <div style={styles.mainContent}>
        <div style={styles.leftPanel}>
          <Diamond bases={bases} onBaseClick={handleBaseClick} />

          <div style={styles.dueUp}>
            <div style={styles.dueUpLabel}>DUE UP:</div>
            {getDueUp().map((player, i) => (
              <div
                key={player.id}
                style={{ ...styles.dueUpPlayer, cursor: 'pointer' }}
                onClick={() => handlePlayerClick(
                  player.id,
                  player.name,
                  halfInning === 'TOP' ? awayTeamId : homeTeamId
                )}
                title="Click to view player stats"
              >
                {currentBatterIndex + i + 2}.{' '}
                <PlayerNameWithMorale name={player.name} />
              </div>
            ))}
          </div>
        </div>

        <div style={styles.rightPanel}>
          <div style={styles.atBatCard}>
            <div style={styles.atBatHeader}>CURRENT AT-BAT</div>

            <div
              style={{ ...styles.batterName, cursor: 'pointer' }}
              onClick={() => handlePlayerClick(
                currentBatter.id,
                currentBatter.name,
                halfInning === 'TOP' ? awayTeamId : homeTeamId
              )}
              title="Click to view player stats"
            >
              #{currentBatter.jerseyNumber}{' '}
              <PlayerNameWithMorale name={currentBatter.name} />
            </div>
            <div style={styles.batterInfo}>
              {currentBatter.position} | {currentBatter.grade} |{' '}
              {playerStats[currentBatter.id].h}-{playerStats[currentBatter.id].ab}
              {/* Batter Mojo Badge */}
              {(() => {
                const batterMojoInfo = mojoState.getPlayerMojo(currentBatter.id);
                const batterMojoColors: Record<MojoLevel, string> = {
                  [-2]: '#ef4444',
                  [-1]: '#f97316',
                  [0]: '#6b7280',
                  [1]: '#22c55e',
                  [2]: '#3b82f6',
                };
                return (
                  <span
                    style={{
                      marginLeft: '8px',
                      padding: '2px 6px',
                      fontSize: '11px',
                      fontWeight: 600,
                      borderRadius: '4px',
                      color: batterMojoColors[batterMojoInfo.level],
                      backgroundColor: `${batterMojoColors[batterMojoInfo.level]}20`,
                    }}
                    title={`Mojo: ${batterMojoInfo.state.displayName}`}
                  >
                    {batterMojoInfo.state.emoji}
                  </span>
                );
              })()}
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
            <button
              style={styles.undoButton}
              onClick={() => setShowLineupPanel(true)}
            >
              📋 Lineup
            </button>
            <button
              style={{
                ...styles.undoButton,
                opacity: undoStack.length === 0 ? 0.4 : 1,
                cursor: undoStack.length === 0 ? 'not-allowed' : 'pointer',
              }}
              onClick={handleUndo}
              disabled={undoStack.length === 0}
            >
              ↩ Undo {undoStack.length > 0 && `(${undoStack.length})`}
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
          batterHand={currentBatter.batterHand || 'R'}
          outs={outs}
          onComplete={(flowState) => {
            handleAtBatFlowComplete(flowState);
            setPendingResult(null);
          }}
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

      {pendingSubType === 'POS_SWITCH' && (
        <PositionSwitchModal
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

      {/* ============================================ */}
      {/* FAN MORALE PANEL                            */}
      {/* Per Ralph Framework S-C013 / WIRE-004       */}
      {/* ============================================ */}
      <div style={{ marginTop: '12px' }}>
        <FanMoralePanel
          morale={fanMorale}
          trend={moraleTrend}
          compact={true}
        />
      </div>

      {/* ============================================ */}
      {/* WAR DISPLAY                                 */}
      {/* Per BWAR_CALCULATION_SPEC.md, PWAR_CALCULATION_SPEC.md */}
      {/* ============================================ */}
      <div style={{ marginTop: '12px' }}>
        <WARPanel defaultTab="total" />
      </div>

      {/* ============================================ */}
      {/* SEASON LEADERBOARDS                         */}
      {/* Per IMPLEMENTATION_PLAN.md v3 - Day 7       */}
      {/* ============================================ */}
      <div style={{ marginTop: '12px' }}>
        <SeasonLeaderboardsPanel defaultTab="batting" onPlayerClick={handlePlayerClick} />
      </div>

      {/* ============================================ */}
      {/* CAREER STATS DISPLAY                        */}
      {/* Per IMPLEMENTATION_PLAN.md v3 - Day 5/6     */}
      {/* ============================================ */}
      <div style={{ marginTop: '12px' }}>
        <CareerPanel defaultTab="batting" />
      </div>

      {/* ============================================ */}
      {/* SEASON SUMMARY BUTTON                       */}
      {/* Per IMPLEMENTATION_PLAN.md v3 - Day 8       */}
      {/* ============================================ */}
      <div style={{ marginTop: '12px' }}>
        <button
          onClick={() => setSeasonSummaryOpen(true)}
          style={{
            width: '100%',
            padding: '12px 16px',
            borderRadius: '8px',
            backgroundColor: '#374151',
            color: '#f3f4f6',
            border: '1px solid #4b5563',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '0.875rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}
        >
          View Season Summary
        </button>
      </div>

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

      {/* Inning End Summary - Per Ralph Framework S-B011 */}
      {inningEndData && (
        <InningEndSummary
          isOpen={showInningEndSummary}
          onClose={handleInningEndSummaryClose}
          inning={inningEndData.inning}
          halfInning={inningEndData.halfInning}
          teamName={inningEndData.teamName}
          runs={inningEndData.runs}
          hits={inningEndData.hits}
          lob={inningEndData.lob}
        />
      )}

      {/* Pitcher Exit Prompt - Per Ralph Framework S-B012 */}
      {(() => {
        const pitcherId = getCurrentPitcherId();
        const stats = pitcherGameStats.get(pitcherId);
        if (!stats || !showPitcherExitPrompt) return null;
        const outsRecorded = stats.outsRecorded || 0;
        const fullInnings = Math.floor(outsRecorded / 3);
        const partialOuts = outsRecorded % 3;
        const ipDisplay = partialOuts > 0 ? `${fullInnings}.${partialOuts}` : `${fullInnings}.0`;
        return (
          <PitcherExitPrompt
            isOpen={showPitcherExitPrompt}
            onClose={() => setShowPitcherExitPrompt(false)}
            onKeepIn={handleKeepPitcherIn}
            onChangePitcher={handlePitcherExitChange}
            pitcherName={stats.pitcherName}
            pitchCount={stats.pitchCount}
            ip={ipDisplay}
            hits={stats.hitsAllowed}
            runs={stats.runsAllowed}
            strikeouts={stats.strikeoutsThrown}
            walks={stats.walksAllowed}
          />
        );
      })()}

      {/* Walkoff Celebration - Per Ralph Framework S-B016 */}
      {walkoffResult && showWalkoffCelebration && (
        <WalkoffCelebration
          walkoff={walkoffResult}
          homeTeamName={homeTeamName}
          homeScore={homeScore}
          awayScore={awayScore}
          onDismiss={() => {
            setShowWalkoffCelebration(false);
            setWalkoffResult(null);
          }}
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

      {/* Player Card Modal */}
      {selectedPlayer && (
        <PlayerCardModal
          isOpen={playerCardOpen}
          playerId={selectedPlayer.playerId}
          playerName={selectedPlayer.playerName}
          teamId={selectedPlayer.teamId}
          onClose={() => {
            setPlayerCardOpen(false);
            setSelectedPlayer(null);
          }}
          mojoLevel={mojoState.getPlayerMojo(selectedPlayer.playerId).level}
          fitnessState={fitnessState.getPlayerFitness(selectedPlayer.playerId).state}
        />
      )}

      {/* Season Summary Modal */}
      <SeasonSummaryModal
        isOpen={seasonSummaryOpen}
        onClose={() => setSeasonSummaryOpen(false)}
        onPlayerClick={handlePlayerClick}
      />

      {/* Lineup Panel */}
      <LineupPanel
        lineupState={lineupState}
        isOpen={showLineupPanel}
        onClose={() => setShowLineupPanel(false)}
        halfInning={halfInning}
        onPlayerClick={handlePlayerClick}
        teamId={halfInning === 'TOP' ? awayTeamId : homeTeamId}
        playerMojoLevels={Object.fromEntries(mojoState.playerMojo)}
        playerFitnessStates={Object.fromEntries(fitnessState.playerFitness)}
        onMojoChange={handleMojoChange}
        onFitnessChange={handleFitnessChange}
      />
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div style={{ ...styles.container, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
      <div style={{ textAlign: 'center', color: '#fff' }}>
        <div style={{ fontSize: '24px', marginBottom: '16px' }}>⚾</div>
        <div>Loading...</div>
      </div>
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
  pitcherBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: '#111827',
    padding: '8px 12px',
    borderRadius: '8px',
    marginBottom: '12px',
    fontSize: '13px',
  },
  pitcherBarLabel: {
    color: '#6b7280',
    fontSize: '10px',
    letterSpacing: '0.5px',
    fontWeight: 600,
  },
  pitcherBarName: {
    color: '#e5e7eb',
    fontWeight: 600,
  },
  pitcherBarDivider: {
    color: '#374151',
  },
  pitcherBarPitches: {
    color: '#9ca3af',
  },
  pitcherFitnessBadge: {
    fontSize: '11px',
    fontWeight: 600,
    padding: '2px 6px',
    borderRadius: '4px',
    marginLeft: '4px',
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
