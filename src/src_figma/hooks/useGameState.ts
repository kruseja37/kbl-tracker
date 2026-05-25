/**
 * Game State Hook for Figma GameTracker
 *
 * This hook bridges the Figma UI to the existing KBL Tracker data layer.
 * It wraps the existing hooks and provides a simplified interface for the UI.
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { getTeamColors } from "@/config/teamColors";
// Import from src/ persistence layer
import {
  logAtBatEvent,
  logBetweenPlayEvent,
  undoMostRecentGameAction,
  createGameHeader,
  completeGame,
  getGameEvents,
  getBetweenPlayEvent,
  getBetweenPlayEvents,
  markGameAggregated,
  getGameFieldingEvents,
  getGameHeader,
  updateBetweenPlayEvent,
  type AtBatEvent,
  type BetweenPlayEvent,
  type BetweenPlayEventType,
  type RunnerState,
  type GameHeader,
  type FameEventRecord,
  type PromptedManagerDecisionEvent,
} from "../../utils/eventLog";
import type { GameAggregationOptions } from "../../utils/seasonAggregator";
import { processCompletedGame } from "../../utils/processCompletedGame";
import { deriveCommittedManagerDecisionState } from "../../utils/managerWpaGameState";
import { deriveKblWpaCredits } from "../../utils/kblWpaAttribution";
import {
  getGamePogAwardSet,
  type PogAwardSet,
} from "../../utils/pogAwards";
import type {
  GameLockLineupSnapshots,
  ManagerRecommendationWatchEvent,
} from "../../types/managerWpa";
import { appendEliminationGameFameToRun } from "../../utils/eliminationRunFameStorage";
import { appendEliminationGameToAllTimeStats } from "../../utils/eliminationAllTimeStatsStorage";
import {
  saveCurrentGame,
  loadCurrentGame,
  immediateSaveCurrentGame,
  clearCurrentGame,
  archiveCompletedGame,
  type CompetitionType,
  type PersistedGameState,
} from "../utils/gameStorage";
import {
  buildStoredPlayersOfTheGame,
  rankPlayersOfTheGame,
  type PlayerOfTheGameEntry,
  type StoredPlayersOfTheGame,
} from "../../utils/playersOfTheGame";
import type {
  AtBatResult,
  HalfInning,
  LineupState,
  LineupPlayer,
  BenchPlayer,
  Position,
} from "../../types/game";
import { validateSubstitution } from "../../types/game";
import { calculateLeverageIndex } from "../../engines/leverageCalculator";
import { calculateWPA } from "../../engines/wpaCalculator";
import {
  createRunnerTrackingState,
  addRunner as trackerAddRunner,
  advanceRunner as trackerAdvanceRunner,
  runnerOut as trackerRunnerOut,
  handlePinchRunner,
  handlePitchingChange as trackerHandlePitchingChange,
  clearBases as trackerClearBases,
  nextInning as trackerNextInning,
  nextAtBat as trackerNextAtBat,
  getCurrentBases as trackerGetCurrentBases,
  type RunnerTrackingState,
  type RunnerScoredEvent,
  type PitcherRunnerStats,
} from "../app/engines/inheritedRunnerTracker";
import type { HowReached } from "../app/types/substitution";
import {
  buildLiveBasesFromRunnersAfter,
  reconcileRunnerTrackerBases,
  reconcileRunnerTrackerFromRunnersAfter,
} from "../app/utils/liveBaseCorrection";
import { normalizeLiveSubstitutionType } from "../app/utils/gameTrackerSubstitutionIntent";

// ============================================
// TYPES
// ============================================

function buildArchivePlayersOfTheGame(
  awardSet: PogAwardSet,
  rankedPlayers: PlayerOfTheGameEntry[],
): StoredPlayersOfTheGame | undefined {
  if (awardSet.dataQuality.source !== "kbl_wpa") {
    return buildStoredPlayersOfTheGame(rankedPlayers);
  }

  if (!awardSet.overall?.playerId) {
    return undefined;
  }

  const orderedPlayerIds = [
    awardSet.overall.playerId,
    ...awardSet.playerRoleAwards.flatMap((award) =>
      award.playerId ? [award.playerId] : [],
    ),
    ...rankedPlayers.map((player) => player.playerId),
  ];
  const uniquePlayerIds = Array.from(new Set(orderedPlayerIds)).slice(0, 3);

  if (uniquePlayerIds.length === 0) {
    return undefined;
  }

  return {
    first: uniquePlayerIds[0],
    second: uniquePlayerIds[1],
    third: uniquePlayerIds[2],
  };
}

export type GamePhase = "PRE_GAME" | "LIVE" | "POST_FINAL_OUT";

export interface GameState {
  gameId: string;
  homeScore: number;
  awayScore: number;
  inning: number;
  isTop: boolean;
  outs: number;
  balls: number;
  strikes: number;
  bases: { first: boolean; second: boolean; third: boolean };
  currentBatterId: string;
  currentBatterName: string;
  currentPitcherId: string;
  currentPitcherName: string;
  currentCatcherId: string;
  currentCatcherName: string;
  awayTeamId: string;
  homeTeamId: string;
  awayTeamName: string;
  homeTeamName: string;
  stadiumName?: string | null;
  seasonId?: string;
  statsScopeId?: string;
  seasonNumber: number;
  gamePhase: GamePhase;
  /** Master flag for in-game preamble + per-inning summaries (Grok). */
  liveBeatReporterEnabled: boolean;
  /** Master flag for post-game newspaper columns (Claude Sonnet). */
  postGameColumnsEnabled: boolean;
}

export interface EndGameOptions {
  activityLog?: string[];
  seasonId?: string;
  statsScopeId?: string;
  competitionType?: CompetitionType;
  competitionId?: string;
  leagueId?: string;
  franchiseId?: string;
  scheduleGameId?: string;
  currentSeason?: number;
  currentGame?: number;
  stadiumName?: string | null;
  awaitPitchCountConfirmation?: boolean;
  awayManagerId?: string;
  homeManagerId?: string;
  managerByTeamId?: Record<string, string | undefined>;
}

export interface ScoreboardState {
  innings: { away: number | undefined; home: number | undefined }[];
  away: { runs: number; hits: number; errors: number };
  home: { runs: number; hits: number; errors: number };
}

export interface PlayerGameStats {
  pa: number;
  ab: number;
  h: number;
  singles: number;
  doubles: number;
  triples: number;
  hr: number;
  r: number;
  rbi: number;
  bb: number;
  hbp: number; // MAJ-07: Track HBP separately from BB
  k: number;
  sb: number;
  cs: number;
  sf: number; // MAJ-11: Sacrifice flies
  sh: number; // MAJ-11: Sacrifice bunts (SH)
  gidp: number; // MAJ-11: Grounded into double play
  grandSlams: number; // GAP-05: Track grand slams for career milestones
  putouts: number;
  assists: number;
  fieldingErrors: number;
}

function mergePlayerMojoFitnessState(
  baseState: Record<string, { mojo: number; fitness: string }> | null | undefined,
  betweenPlayEvents: BetweenPlayEvent[],
): Record<string, { mojo: number; fitness: string }> | null {
  const merged = { ...(baseState ?? {}) } as Record<
    string,
    { mojo: number; fitness: string }
  >;

  for (const event of betweenPlayEvents) {
    const change = event.playerStateChange;
    if (!change || (change.stateType !== "mojo" && change.stateType !== "fitness")) {
      continue;
    }

    const existing = merged[change.playerId] ?? { mojo: 0, fitness: "FIT" };
    if (change.stateType === "mojo") {
      existing.mojo = Number(change.newValue);
    } else {
      existing.fitness = String(change.newValue);
    }
    merged[change.playerId] = existing;
  }

  return Object.keys(merged).length > 0 ? merged : null;
}

export interface PitcherGameStats {
  // Core counting stats (existing)
  outsRecorded: number;
  hitsAllowed: number;
  runsAllowed: number;
  earnedRuns: number;
  walksAllowed: number; // BB only (not IBB or HBP)
  strikeoutsThrown: number;
  homeRunsAllowed: number;
  pitchCount: number;
  battersFaced: number;
  // MAJ-07: New counting stats per PITCHER_STATS_TRACKING_SPEC.md
  intentionalWalks: number; // IBB
  hitByPitch: number; // HBP
  wildPitches: number; // WP
  basesLoadedWalks: number; // BB/HBP/IBB with bases loaded
  firstInningRuns: number; // Runs allowed in first inning (starters only)
  consecutiveHRsAllowed: number; // Current streak of consecutive HR allowed
  // Role/timing fields
  isStarter: boolean;
  entryInning: number; // Which inning pitcher entered
  entryOuts: number; // Outs when pitcher entered
  exitInning: number | null; // Which inning pitcher left (null = still active)
  exitOuts: number | null; // Outs when pitcher left
  finishedGame: boolean;
  // Inherited/bequeathed runners (from inheritedRunnerTracker)
  inheritedRunners: number;
  inheritedRunnersScored: number;
  bequeathedRunners: number;
  bequeathedRunnersScored: number;
  // MAJ-08: Pitcher decisions per PITCHER_STATS_TRACKING_SPEC.md §5-6
  decision: "W" | "L" | "ND" | null;
  save: boolean;
  hold: boolean;
  blownSave: boolean;
}

function consumePendingSessionBoolean(key: string): boolean | undefined {
  if (typeof sessionStorage === "undefined") return undefined;

  const raw = sessionStorage.getItem(key);
  sessionStorage.removeItem(key);

  if (raw === null) return undefined;

  try {
    return JSON.parse(raw) === true;
  } catch {
    return raw === "true";
  }
}

function consumePendingLiveBeatReporterEnabled(): boolean | undefined {
  // New key introduced in Phase 2a two-toggle refactor.
  const fromNew = consumePendingSessionBoolean(
    "kbl-pending-live-beat-reporter-enabled",
  );
  if (fromNew !== undefined) return fromNew;
  // Backward-compat: the pre-refactor single-toggle key.
  return consumePendingSessionBoolean("kbl-pending-beat-reporter-enabled");
}

function consumePendingPostGameColumnsEnabled(): boolean | undefined {
  return consumePendingSessionBoolean(
    "kbl-pending-post-game-columns-enabled",
  );
}

export interface RunnerAdvancement {
  fromFirst?: "second" | "third" | "home" | "out";
  fromSecond?: "third" | "home" | "out";
  fromThird?: "home" | "out";
}

export type HitType = "1B" | "2B" | "3B" | "HR" | "ITPHR" | "GRD"; // GRD = Ground Rule Double (GAP-GT-6-D)
export type OutType =
  | "K"
  | "Kc"
  | "GO"
  | "FO"
  | "FLO"
  | "LO"
  | "PO"
  | "DP"
  | "TP"
  | "FC"
  | "SF"
  | "SH"
  | "D3K";
export type WalkType = "BB" | "HBP" | "IBB";
export type ReachOnErrorType = "E"; // Batter reaches base on fielding error
export type PlateAppearanceOutType = OutType | "SAC";
export type PlateAppearanceAction =
  | {
      type: "hit";
      hitType: HitType;
      rbi: number;
      runnerAdvancement?: RunnerAdvancement;
    }
  | {
      type: "out";
      outType: PlateAppearanceOutType;
      runnerAdvancement?: RunnerAdvancement;
      batterReached?: boolean;
      isDroppedThirdStrike?: boolean;
      forceNoRuns?: boolean;
      dropReason?: "wild_pitch" | "passed_ball";
    }
  | {
      type: "walk";
      walkType: WalkType;
    }
  | {
      type: "error";
      rbi?: number;
      runnerAdvancement?: RunnerAdvancement;
    }
  | {
      type: "foul_ball";
    };
export type EventType =
  | "SB"
  | "CS"
  | "WP"
  | "PB"
  | "PICK"
  | "PICK_SAFE"
  | "PICK_E"
  | "ADVANCE"
  | "ADVANCE_E"
  | "KILLED"
  | "NUTSHOT"
  | "WEB_GEM"
  | "ROBBERY"
  | "TOOTBLAN"
  | "BEAT_THROW"
  | "BUNT"
  | "STRIKEOUT"
  | "STRIKEOUT_LOOKING"
  | "DROPPED_3RD_STRIKE"
  | "SEVEN_PLUS_PITCH_AB";

type SubstitutionLogEntry = {
  type:
    | "player_sub"
    | "pitching_change"
    | "pinch_hit"
    | "pinch_run"
    | "defensive_sub"
    | "position_switch"
    | "double_switch";
  inning: number;
  halfInning: "TOP" | "BOTTOM";
  outgoingPlayerId: string;
  outgoingPlayerName: string;
  incomingPlayerId: string;
  incomingPlayerName: string;
  timestamp: number;
};

export interface BetweenPlayEventDetails {
  runnerId?: string;
  runnerName?: string;
  fromBase?: "first" | "second" | "third";
  toBase?: "first" | "second" | "third" | "home" | "out";
  outcome?: "safe" | "out";
  fielderPosition?: number;
  fielderId?: string;
  fielderName?: string;
  errorType?: "fielding" | "throwing" | "mental";
  pitcherId?: string;
  pitcherName?: string;
  catcherId?: string;
  catcherName?: string;
  actorId?: string;
  actorName?: string;
  leverageIndex?: number;
  inning?: number;
  halfInning?: "TOP" | "BOTTOM";
}

// Pitch count prompt types per PITCH_COUNT_TRACKING_SPEC.md
export interface PitchCountPrompt {
  type: "pitching_change" | "end_game" | "end_inning";
  pitcherId: string;
  pitcherName: string;
  currentCount: number;
  lastVerifiedInning: number;
  // For pitching change only
  newPitcherId?: string;
}

export interface DeferredPitchCountEntry {
  pitcherId: string;
  pitcherName: string;
  lastKnownCount: number;
  inning: number;
  halfInning: HalfInning;
  timestamp: number;
  promptType: PitchCountPrompt["type"];
}

export type EndGameTriggerReason =
  | "walkoff"
  | "home_ahead_after_top"
  | "final_inning_complete";

export interface EndGameTriggerEvaluation {
  shouldEndGame: boolean;
  reason: EndGameTriggerReason | null;
  isWalkOff: boolean;
}

export interface UseGameStateReturn {
  // Game state
  gameState: GameState;
  scoreboard: ScoreboardState;
  playerStats: Map<string, PlayerGameStats>;
  pitcherStats: Map<string, PitcherGameStats>;

  // Actions
  recordHit: (
    hitType: HitType,
    rbi: number,
    runnerData?: RunnerAdvancement,
    pitchCount?: number,
  ) => Promise<void>;
  recordOut: (
    outType: OutType,
    runnerData?: RunnerAdvancement,
    pitchCount?: number,
    options?: { forceNoRuns?: boolean },
  ) => Promise<void>;
  recordWalk: (walkType: WalkType, pitchCount?: number) => Promise<void>;
  recordD3K: (
    batterReached: boolean,
    runnerData?: RunnerAdvancement,
    pitchCount?: number,
    dropReason?: "wild_pitch" | "passed_ball",
  ) => Promise<void>;
  recordError: (
    rbi?: number,
    runnerData?: RunnerAdvancement,
    pitchCount?: number,
  ) => Promise<void>;
  commitPlateAppearance: (action: PlateAppearanceAction) => Promise<void>;
  recordEvent: (
    eventType: EventType,
    runnerId?: string,
    details?: BetweenPlayEventDetails,
  ) => Promise<void>;
  recordPlayerStateChange: (
    playerId: string,
    playerName: string,
    stateType: "mojo" | "fitness" | "injury",
    previousValue: string | number,
    newValue: string | number,
    reason?: string,
    options?: PlayerStateChangeOptions,
  ) => Promise<BetweenPlayEvent>;
  reassignRunnerEventAttribution: (
    eventId: string,
    updates: {
      pitcherId?: string;
      pitcherName?: string;
      catcherId?: string;
      catcherName?: string;
      fielderId?: string;
      fielderName?: string;
      fielderPosition?: number;
    },
  ) => Promise<BetweenPlayEvent | null>;
  recordManagerMoment: (
    leverageIndex: number,
    decisionType: string,
    context?: string,
  ) => Promise<void>;
  recordPromptedManagerDecision: (
    decision: PromptedManagerDecisionEvent,
  ) => Promise<BetweenPlayEvent>;
  recordManagerRecommendationWatch: (
    watch: ManagerRecommendationWatchEvent,
  ) => Promise<BetweenPlayEvent>;
  placeGhostRunner: (base: "second", playerId: string) => void;
  advanceRunner: (
    from: "first" | "second" | "third",
    to: "second" | "third" | "home",
    outcome: "safe" | "out",
  ) => void;
  /** Batch update runners - processes all movements atomically to avoid race conditions */
  advanceRunnersBatch: (
    movements: Array<{
      from: "first" | "second" | "third";
      to: "second" | "third" | "home" | "out";
      outcome: "safe" | "out";
    }>,
  ) => void;
  makeSubstitution: (
    benchPlayerId: string,
    lineupPlayerId: string,
    benchPlayerName?: string,
    lineupPlayerName?: string,
    options?: {
      subType?:
        | "player_sub"
        | "pinch_hit"
        | "pinch_run"
        | "defensive_sub"
        | "position_switch"
        | "double_switch";
      newPosition?: string;
      lineupSpot?: number;
      base?: "1B" | "2B" | "3B";
      isPinchHitter?: boolean;
    },
  ) => { success: boolean; error?: string };
  swapBattingOrder: (firstPlayerId: string, secondPlayerId: string) => boolean;
  switchPositions: (
    switches: Array<{ playerId: string; newPosition: string }>,
  ) => void;
  changePitcher: (
    newPitcherId: string,
    exitingPitcherId: string,
    pitchingTeamSide: TeamSide,
    newPitcherName?: string,
    exitingPitcherName?: string,
  ) => void;
  advanceCount: (type: "ball" | "strike" | "foul") => void;
  resetCount: () => void;
  endInning: () => void;
  endGame: (options?: EndGameOptions) => Promise<void>;
  applyScoreAdjustment: (
    inning: number,
    halfInning: HalfInning,
    delta: number,
  ) => void;
  applyBasesCorrection: (
    bases: { first: boolean; second: boolean; third: boolean },
    runnersAfter?: RunnerState,
    correctionContext?: {
      inning: number;
      halfInning: HalfInning;
    },
    howReachedOverride?: HowReached,
  ) => void;
  updateTrackedRunnerHowReached: (
    runnerIdentity: { runnerId?: string | null; runnerName?: string | null },
    howReached: HowReached,
  ) => boolean;
  applyOutsAdjustment: (delta: number) => void;
  scheduleAutoEndInning: () => void;
  forceEndHalfInning: () => void;
  setRunnerOutcomeCorrectionActive: (isActive: boolean) => void;
  adjustPlayerFieldingErrors: (playerId: string, delta: number) => void;
  queueAutoEndGame: () => void;
  evaluateEndGameTrigger: (params: {
    inning: number;
    isTop: boolean;
    homeScoreBefore: number;
    awayScoreBefore: number;
    homeScoreAfter: number;
    awayScoreAfter: number;
    context: "live_play" | "half_inning_end";
  }) => EndGameTriggerEvaluation;

  // Pitch count prompts (per PITCH_COUNT_TRACKING_SPEC.md)
  pitchCountPrompt: PitchCountPrompt | null;
  confirmPitchCount: (
    pitcherId: string,
    finalCount: number,
  ) => { immaculateInning?: { pitcherId: string; pitcherName: string } };
  dismissPitchCountPrompt: () => void;
  deferredPitchCounts: DeferredPitchCountEntry[];
  openDeferredPitchCount: (pitcherId: string) => void;

  // Enrichment injection (Layer 1B)
  setNextEventEnrichment: (data: AtBatEvent["enrichment"]) => void;

  /** Position innings map: playerId → { [position]: halfInningsPlayed } (ticket 4.10) */
  positionInnings: Map<string, Record<string, number>>;

  // Initialization
  initializeGame: (config: GameInitConfig) => Promise<void>;
  loadExistingGame: (options?: LoadExistingGameOptions) => Promise<boolean>;
  undoLastAction: (options?: { skipReload?: boolean }) => Promise<boolean>;
  getLineupStateSnapshot: () => GameLineupSnapshot;
  getBatterIndicesSnapshot: () => {
    away: number;
    home: number;
  };

  // Undo support
  restoreState: (snapshot: {
    gameState: GameState;
    scoreboard: ScoreboardState;
    playerStats?: Map<string, PlayerGameStats>;
    pitcherStats?: Map<string, PitcherGameStats>;
    runnerTrackerState?: {
      runners: RunnerTrackingState["runners"];
      currentPitcherId: string;
      currentPitcherName: string;
      pitcherStats: Map<string, PitcherRunnerStats>;
      inning: number;
      atBatNumber: number;
    };
    lineupSnapshot?: GameLineupSnapshot;
    batterIndices?: {
      away: number;
      home: number;
    };
  }) => void;
  getRunnerTrackerSnapshot: () => {
    runners: RunnerTrackingState["runners"];
    currentPitcherId: string;
    currentPitcherName: string;
    pitcherStatsEntries: [string, PitcherRunnerStats][];
    inning: number;
    atBatNumber: number;
  };
  // T1-02/03/04: Runner names from tracker (replaces fragile runnerNames state)
  getBaseRunnerNames: () => { first?: string; second?: string; third?: string };
  runnerIdentityVersion: number;
  lineupVersion: number;
  substitutionLog: Array<{
    type: string;
    inning: number;
    halfInning: "TOP" | "BOTTOM";
    outgoingPlayerId: string;
    outgoingPlayerName: string;
    incomingPlayerId: string;
    incomingPlayerName: string;
    timestamp: number;
  }>;
  notifyPersistenceMetadataChanged: (reason: string) => void;

  // Loading/persistence
  isLoading: boolean;
  isSaving: boolean;
  lastSavedAt: number | null;
  atBatSequence: number;

  // §10.1: Three-phase lifecycle
  startGame: () => void;

  // T0-01: Auto game-end detection
  showInningEndConfirm: boolean;
  confirmInningEnd: () => void;
  declineInningEnd: () => void;
  showAutoEndPrompt: boolean;
  dismissAutoEndPrompt: () => void;

  // Playoff context setter (called from GameTracker with navigation state)
  setPlayoffContext: (
    seriesId: string | null,
    gameNumber: number | null,
    playoffId?: string | null,
  ) => void;
  // Stadium selector helper
  setStadiumName: (stadiumName: string | null) => void;

  // R3-T0: Regulation innings (restored from snapshot)
  totalInningsRef: React.MutableRefObject<number>;
  // R3-T0: Persistence refs for exhibition config & mojo/fitness
  extraInningRunnerRef: React.MutableRefObject<boolean>;
  extraInningRunnerDelayRef: React.MutableRefObject<1 | 2>;
  teamColorsRef: React.MutableRefObject<{
    awayTeamColor?: string;
    awayTeamBorderColor?: string;
    homeTeamColor?: string;
    homeTeamBorderColor?: string;
  }>;
  playerMojoFitnessGetterRef: React.MutableRefObject<
    (() => Record<string, { mojo: number; fitness: string }>) | null
  >;
  gameStartTimestampRef: React.MutableRefObject<number>;
  /** Restored mojo/fitness data from snapshot (null if fresh game) */
  restoredMojoFitness: Record<string, { mojo: number; fitness: string }> | null;
  restoredCompetitionContext: RestoredCompetitionContext;
  restoredPlayoffContext: RestoredPlayoffContext;
}

export interface GameInitConfig {
  gameId: string;
  seasonId?: string;
  statsScopeId?: string;
  competitionType?: CompetitionType;
  competitionId?: string;
  competitionName?: string;
  awayTeamId: string;
  homeTeamId: string;
  awayTeamName: string;
  homeTeamName: string;
  awayStartingPitcherId: string;
  awayStartingPitcherName: string;
  homeStartingPitcherId: string;
  homeStartingPitcherName: string;
  awayLineup: { playerId: string; playerName: string; position: string }[];
  homeLineup: { playerId: string; playerName: string; position: string }[];
  // MAJ-09: Optional bench rosters for substitution validation
  awayBench?: { playerId: string; playerName: string; positions: string[] }[];
  homeBench?: { playerId: string; playerName: string; positions: string[] }[];
  optimalLineupSnapshots?: GameLockLineupSnapshots;
  chosenLineupSnapshots?: GameLockLineupSnapshots;
  // Playoff context (optional — set when launching from playoff bracket)
  playoffSeriesId?: string;
  playoffGameNumber?: number;
  playoffId?: string;
  playoffRound?:
    | "wild_card"
    | "division_series"
    | "championship_series"
    | "world_series";
  isEliminationGame?: boolean;
  isClinchGame?: boolean;
  // T0-01: Number of regulation innings (default 9, SMB4 franchise often 6 or 7)
  totalInnings?: number;
  extraInningRunner?: boolean;
  extraInningRunnerDelay?: 1 | 2;
  stadiumName?: string | null;
  seasonNumber: number;
  // Layer 1B: Context snapshot identity fields
  franchiseId?: string;
  scheduleGameId?: string;
  leagueId?: string;
  /** @deprecated Pre-Phase-2a single-toggle field. Kept for backward-compat read path. */
  beatReporterEnabled?: boolean;
  liveBeatReporterEnabled?: boolean;
  postGameColumnsEnabled?: boolean;
  // Layer 1B: Team records for context snapshot
  awayRecord?: { w: number; l: number };
  homeRecord?: { w: number; l: number };
}

export interface LoadExistingGameOptions {
  preferSnapshot?: boolean;
}

export interface RestoredCompetitionContext {
  seasonId?: string;
  statsScopeId?: string;
  seasonNumber?: number;
  competitionType?: CompetitionType;
  competitionId?: string;
  competitionName?: string;
  franchiseId?: string;
  scheduleGameId?: string;
  leagueId?: string;
}

export interface RestoredPlayoffContext {
  playoffSeriesId: string | null;
  playoffGameNumber: number | null;
  playoffId: string | null;
  playoffRound?:
    | "wild_card"
    | "division_series"
    | "championship_series"
    | "world_series";
  isEliminationGame?: boolean;
  isClinchGame?: boolean;
}

function getGameStartedSessionKey(gameId: string): string {
  return `kbl-game-started:${gameId}`;
}

function markGameStartedForRefresh(gameId: string): void {
  try {
    sessionStorage.setItem(getGameStartedSessionKey(gameId), "true");
  } catch {
    // Session storage can be unavailable in private/browser test contexts.
  }
}

function wasGameStartedForRefresh(gameId: string): boolean {
  try {
    return sessionStorage.getItem(getGameStartedSessionKey(gameId)) === "true";
  } catch {
    return false;
  }
}

function canResumeSnapshotForRoute(
  snapshot: PersistedGameState,
  targetGameId: string,
): boolean {
  return (
    snapshot.gameId === targetGameId ||
    targetGameId.startsWith("exhibition-")
  );
}

function hasUsableSnapshotPayload(snapshot: PersistedGameState | null): boolean {
  return !!(
    snapshot &&
    snapshot.gamePhase !== "FINALIZED" &&
    (snapshot.scoreboard ||
      snapshot.runnerTrackerSnapshot ||
      snapshot.currentPitcherId ||
      snapshot.currentBatterId)
  );
}

function buildGameHeaderDraftFromSnapshot(
  snapshot: PersistedGameState,
): Omit<
  GameHeader,
  "aggregated" | "aggregatedAt" | "aggregationError" | "eventCount" | "checksum"
> {
  const persistedPitcherStats = snapshot.pitcherGameStats ?? [];
  const toLineupEntries = (
    lineup:
      | PersistedGameState["awayLineup"]
      | PersistedGameState["homeLineup"]
      | undefined,
    state:
      | PersistedGameState["awayLineupState"]
      | PersistedGameState["homeLineupState"]
      | undefined,
  ) => {
    const source =
      state?.lineup?.length
        ? state.lineup
        : lineup?.map((player, idx) => ({
            ...player,
            battingOrder: idx + 1,
          })) ?? [];

    return source.map((player, idx) => ({
      playerId: player.playerId,
      playerName: player.playerName,
      position: player.position,
      battingOrder: player.battingOrder || idx + 1,
    }));
  };

  const toBenchEntries = (
    state:
      | PersistedGameState["awayLineupState"]
      | PersistedGameState["homeLineupState"]
      | undefined,
  ) =>
    (state?.bench ?? []).map((player) => ({
      playerId: player.playerId,
      playerName: player.playerName,
      positions: player.positions,
    }));

  return {
    gameId: snapshot.gameId,
    seasonId: snapshot.seasonId,
    statsScopeId: snapshot.statsScopeId,
    competitionType: snapshot.competitionType,
    competitionId: snapshot.competitionId,
    competitionName: snapshot.competitionName,
    franchiseId: snapshot.franchiseId,
    scheduleGameId: snapshot.scheduleGameId,
    leagueId: snapshot.leagueId,
    playoffSeriesId: snapshot.playoffSeriesId,
    playoffGameNumber: snapshot.playoffGameNumber,
    playoffId: snapshot.playoffId,
    playoffRound: snapshot.playoffRound,
    isEliminationGame: snapshot.isEliminationGame,
    isClinchGame: snapshot.isClinchGame,
    liveBeatReporterEnabled: snapshot.liveBeatReporterEnabled,
    postGameColumnsEnabled: snapshot.postGameColumnsEnabled,
    date: snapshot.savedAt ?? Date.now(),
    awayTeamId: snapshot.awayTeamId,
    awayTeamName: snapshot.awayTeamName,
    homeTeamId: snapshot.homeTeamId,
    homeTeamName: snapshot.homeTeamName,
    stadiumName: snapshot.stadiumName ?? null,
    startingLineups: {
      away: toLineupEntries(snapshot.awayLineup, snapshot.awayLineupState),
      home: toLineupEntries(snapshot.homeLineup, snapshot.homeLineupState),
    },
    benchRosters: {
      away: toBenchEntries(snapshot.awayLineupState),
      home: toBenchEntries(snapshot.homeLineupState),
    },
    startingPitchers: {
      away: {
        playerId:
          snapshot.awayLineupState?.currentPitcher?.playerId ||
          persistedPitcherStats.find(
            (pitcher) => pitcher.teamId === snapshot.awayTeamId && pitcher.isStarter,
          )?.pitcherId ||
          "",
        playerName:
          snapshot.awayLineupState?.currentPitcher?.playerName ||
          persistedPitcherStats.find(
            (pitcher) => pitcher.teamId === snapshot.awayTeamId && pitcher.isStarter,
          )?.pitcherName ||
          "",
      },
      home: {
        playerId:
          snapshot.homeLineupState?.currentPitcher?.playerId ||
          persistedPitcherStats.find(
            (pitcher) => pitcher.teamId === snapshot.homeTeamId && pitcher.isStarter,
          )?.pitcherId ||
          "",
        playerName:
          snapshot.homeLineupState?.currentPitcher?.playerName ||
          persistedPitcherStats.find(
            (pitcher) => pitcher.teamId === snapshot.homeTeamId && pitcher.isStarter,
          )?.pitcherName ||
          "",
      },
    },
    optimalLineupSnapshots: snapshot.optimalLineupSnapshots,
    chosenLineupSnapshots: snapshot.chosenLineupSnapshots,
    finalScore: null,
    finalInning: snapshot.totalInnings ?? 9,
    totalInnings: snapshot.totalInnings,
    extraInningRunner: snapshot.extraInningRunner,
    extraInningRunnerDelay: snapshot.extraInningRunnerDelay,
    isComplete: false,
  };
}

export interface TeamLineupSnapshot {
  lineup: LineupPlayer[];
  bench: BenchPlayer[];
  usedPlayers: string[];
  currentPitcher: LineupPlayer | null;
}

export interface GameLineupSnapshot {
  away: TeamLineupSnapshot;
  home: TeamLineupSnapshot;
  // R3: Persisted DH flags for refresh survival
  awayUsesDh?: boolean;
  homeUsesDh?: boolean;
}

export interface PlayerStateChangeOptions {
  eventType?: BetweenPlayEventType;
  sourceEventType?: string;
  causedByPlayerId?: string;
  causedByPlayerName?: string;
  stayedIn?: boolean;
  linkedEventId?: string;
  eventGroupId?: string;
}

function parseSeasonNumberFromId(seasonId: string): number {
  if (!seasonId) return 1;
  const match = /(?:^|-)season-(\d+)/i.exec(seasonId);
  if (!match) return 1;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

function getFallbackSeasonNumber(
  scopeId?: string,
  explicitSeasonNumber?: number,
): number {
  if (typeof explicitSeasonNumber === "number" && explicitSeasonNumber > 0) {
    return explicitSeasonNumber;
  }
  if (!scopeId) return 1;
  return parseSeasonNumberFromId(scopeId);
}

export function evaluateEndGameTriggerWithTotalInnings(params: {
  inning: number;
  isTop: boolean;
  homeScoreBefore: number;
  awayScoreBefore: number;
  homeScoreAfter: number;
  awayScoreAfter: number;
  totalInnings: number;
  context: "live_play" | "half_inning_end";
}): EndGameTriggerEvaluation {
  const {
    inning,
    isTop,
    homeScoreBefore,
    awayScoreBefore,
    homeScoreAfter,
    awayScoreAfter,
    totalInnings,
    context,
  } = params;

  if (inning < totalInnings) {
    return { shouldEndGame: false, reason: null, isWalkOff: false };
  }

  if (context === "live_play") {
    const isWalkOff =
      !isTop &&
      homeScoreAfter > awayScoreAfter &&
      homeScoreBefore <= awayScoreBefore;

    return {
      shouldEndGame: isWalkOff,
      reason: isWalkOff ? "walkoff" : null,
      isWalkOff,
    };
  }

  if (isTop && homeScoreAfter > awayScoreAfter) {
    return {
      shouldEndGame: true,
      reason: "home_ahead_after_top",
      isWalkOff: false,
    };
  }

  if (!isTop && homeScoreAfter !== awayScoreAfter) {
    return {
      shouldEndGame: true,
      reason: "final_inning_complete",
      isWalkOff: false,
    };
  }

  return { shouldEndGame: false, reason: null, isWalkOff: false };
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function mapAtBatResultFromHit(hitType: HitType): AtBatResult {
  // AtBatResult uses abbreviations: '1B', '2B', '3B', 'HR'
  return hitType;
}

function mapAtBatResultFromOut(outType: OutType): AtBatResult {
  // AtBatResult types per game.ts: 'K', 'Kc', 'GO', 'FO', 'LO', 'PO', 'DP', 'TP', 'SF', 'SAC', 'FC', 'D3K'
  switch (outType) {
    case "K":
      return "K";
    case "Kc":
      return "Kc";
    case "GO":
      return "GO";
    case "FO":
      return "FO";
    case "FLO":
      return "FLO";
    case "LO":
      return "LO";
    case "PO":
      return "PO";
    case "DP":
      return "DP";
    case "TP":
      return "TP"; // CRIT-04 fix: Preserve TP as distinct AtBatResult (was losing data by mapping to DP)
    case "FC":
      return "FC";
    case "SF":
      return "SF";
    case "SH":
      return "SAC";
    case "D3K":
      return "D3K";
  }
}

function mapAtBatResultFromWalk(walkType: WalkType): AtBatResult {
  // AtBatResult types per game.ts: 'BB', 'IBB', 'HBP'
  switch (walkType) {
    case "BB":
      return "BB";
    case "HBP":
      return "HBP";
    case "IBB":
      return "IBB";
  }
}

function createEmptyPlayerStats(): PlayerGameStats {
  return {
    pa: 0,
    ab: 0,
    h: 0,
    singles: 0,
    doubles: 0,
    triples: 0,
    hr: 0,
    r: 0,
    rbi: 0,
    bb: 0,
    hbp: 0,
    k: 0,
    sb: 0,
    cs: 0,
    sf: 0,
    sh: 0,
    gidp: 0,
    grandSlams: 0,
    putouts: 0,
    assists: 0,
    fieldingErrors: 0,
  };
}

function baseToNumber(
  base: "first" | "second" | "third" | "home" | "out",
): 1 | 2 | 3 | 4 {
  switch (base) {
    case "first":
      return 1;
    case "second":
      return 2;
    case "third":
      return 3;
    case "home":
    case "out":
      return 4;
  }
}

function originBaseToNumber(
  base?: "first" | "second" | "third" | "home" | "out",
): 1 | 2 | 3 | undefined {
  switch (base) {
    case "first":
      return 1;
    case "second":
      return 2;
    case "third":
      return 3;
    default:
      return undefined;
  }
}

function destinationBaseToNumber(
  base?: "first" | "second" | "third" | "home" | "out",
): 2 | 3 | 4 | undefined {
  switch (base) {
    case "second":
      return 2;
    case "third":
      return 3;
    case "home":
    case "out":
      return 4;
    default:
      return undefined;
  }
}

function numberToBase(
  base: 1 | 2 | 3 | 4,
): "first" | "second" | "third" | "home" {
  switch (base) {
    case 1:
      return "first";
    case 2:
      return "second";
    case 3:
      return "third";
    case 4:
      return "home";
  }
}

// ============================================
// LAYER 1B: CONTEXT SNAPSHOT HELPERS
// ============================================

/** Derive outs recorded from an AtBatResult type */
function calculateOutsFromResult(result: AtBatResult): number {
  switch (result) {
    case "K":
    case "Kc":
    case "Ꝁ":
    case "GO":
    case "FO":
    case "FLO":
    case "LO":
    case "PO":
    case "SF":
    case "SAC":
    case "D3K":
    case "WP_K":
    case "PB_K":
      return 1;
    case "DP":
      return 2;
    case "TP":
      return 3;
    default:
      return 0; // Hits, walks, errors, HBP = 0 outs
  }
}

// ============================================
// BASEBALL RULES LOGIC
// Ported from src/components/GameTracker/AtBatFlow.tsx
// ============================================

export type RunnerOutcome =
  | "SCORED"
  | "TO_3B"
  | "TO_2B"
  | "HELD"
  | "OUT_HOME"
  | "OUT_3B"
  | "OUT_2B";

export interface Bases {
  first: boolean;
  second: boolean;
  third: boolean;
}

/**
 * Check if a runner is forced to advance based on result and base state.
 * Per AtBatFlow.tsx lines 156-190
 */
export function isRunnerForced(
  base: "first" | "second" | "third",
  result: AtBatResult,
  bases: Bases,
): boolean {
  // On walks/HBP, only runners with occupied bases behind them are forced
  if (["BB", "IBB", "HBP"].includes(result)) {
    if (base === "first") return true; // R1 always forced (batter takes 1B)
    if (base === "second") return !!bases.first; // R2 forced only if R1 exists
    if (base === "third") return !!bases.first && !!bases.second; // R3 forced only if bases loaded
  }

  // On singles, batter takes 1B so R1 is forced
  if (result === "1B") {
    if (base === "first") return true;
    return false;
  }

  // On doubles and GRD, batter takes 2B so R1 and R2 are forced
  if (result === "2B" || result === "GRD") {
    if (base === "first") return true;
    if (base === "second") return true;
    return false;
  }

  // On triples, batter takes 3B so all runners must vacate
  if (result === "3B") {
    return true;
  }

  // FC where batter reaches 1B
  if (result === "FC") {
    if (base === "first") return true;
    return false;
  }

  // On outs (GO, FO, LO, PO, K, etc.), batter doesn't reach - no forces
  return false;
}

/**
 * Get minimum base a runner must advance to (null if not forced).
 * Per AtBatFlow.tsx lines 193-213
 */
export function getMinimumAdvancement(
  base: "first" | "second" | "third",
  result: AtBatResult,
  bases: Bases,
): "second" | "third" | "home" | null {
  if (!isRunnerForced(base, result, bases)) return null;

  // On doubles, R1 must go to at least 3B (batter takes 2B)
  if (result === "2B") {
    if (base === "first") return "third";
    if (base === "second") return "third"; // R2 must vacate for batter
  }

  // On triples, all must score
  if (result === "3B") {
    return "home";
  }

  // Default: advance one base
  if (base === "first") return "second";
  if (base === "second") return "third";
  if (base === "third") return "home";

  return null;
}

/**
 * Get default/standard outcome for a runner based on result type.
 * Per AtBatFlow.tsx lines 452-557
 */
export function getDefaultRunnerOutcome(
  base: "first" | "second" | "third",
  result: AtBatResult,
  outs: number,
  bases: Bases,
): RunnerOutcome {
  const minAdvance = getMinimumAdvancement(base, result, bases);
  const forced = isRunnerForced(base, result, bases);

  // ============================================
  // HITS - Handle based on hit type
  // ============================================

  // DOUBLE (2B): R2 scores, R1 goes to 3B
  if (result === "2B") {
    if (base === "third") return "SCORED";
    if (base === "second") return "SCORED"; // R2 typically scores on double
    if (base === "first") return "TO_3B"; // R1 to 3B
  }

  // TRIPLE (3B): All runners score
  if (result === "3B") {
    return "SCORED";
  }

  // SINGLE (1B): Standard advancement
  if (result === "1B") {
    if (base === "third") return "SCORED";
    if (base === "second") return "TO_3B";
    if (base === "first") return "TO_2B";
  }

  // Home run: all score
  if (result === "HR" || result === "ITPHR") {
    return "SCORED";
  }

  // ============================================
  // WALKS/HBP - Forced runners advance one base, others hold
  // ============================================
  if (["BB", "IBB", "HBP"].includes(result)) {
    if (forced && minAdvance) {
      if (minAdvance === "home") return "SCORED";
      if (minAdvance === "third") return "TO_3B";
      if (minAdvance === "second") return "TO_2B";
    }
    return "HELD"; // Non-forced runners hold
  }

  // ============================================
  // OUTS - Most runners hold
  // ============================================

  // STRIKEOUTS (K, KL): Runners almost always hold
  if (["K", "Kc", "D3K", "WP_K", "PB_K"].includes(result)) {
    return "HELD";
  }

  // GROUND OUTS (GO): Runners typically hold unless advancing
  if (result === "GO") {
    return "HELD";
  }

  // FLY OUTS (FO, FLO, LO, PO): Runners typically hold
  // Exception: R3 can tag up on FO/FLO with < 2 outs
  if (["FO", "FLO", "LO", "PO"].includes(result)) {
    if (base === "third" && (result === "FO" || result === "FLO") && outs < 2) {
      return "SCORED"; // Tag up opportunity
    }
    return "HELD";
  }

  // DOUBLE PLAY (DP): R1 is typically out, others hold
  if (result === "DP") {
    if (base === "first") return "OUT_2B";
    return "HELD";
  }

  // TRIPLE PLAY (TP): R1 and R2 are out (CRIT-04 fix: TP now distinct from DP)
  if (result === "TP") {
    if (base === "first") return "OUT_2B";
    if (base === "second") return "OUT_3B";
    return "HELD";
  }

  // SACRIFICE FLY (SF): R3 scores (that's what makes it a SF)
  if (result === "SF") {
    if (base === "third") return "SCORED";
    return "HELD";
  }

  // SACRIFICE BUNT (SAC): Runners typically advance one base
  if (result === "SAC") {
    if (base === "third" && outs < 2) return "SCORED";
    if (base === "first") return "TO_2B";
    if (base === "second") return "TO_3B";
    return "HELD";
  }

  // FIELDER'S CHOICE (FC): R1 typically out, batter reaches
  if (result === "FC") {
    if (base === "first") return "OUT_2B";
    return "HELD";
  }

  // ERROR (E): Runners can advance, default to +1 base
  if (result === "E") {
    if (base === "third") return "SCORED";
    if (base === "second") return "TO_3B";
    if (base === "first") return "TO_2B";
  }

  return "HELD";
}

function runnerOutcomeToAdvancementDestination(
  base: "first",
  outcome: RunnerOutcome,
): "second" | "third" | "home" | "out" | undefined;
function runnerOutcomeToAdvancementDestination(
  base: "second",
  outcome: RunnerOutcome,
): "third" | "home" | "out" | undefined;
function runnerOutcomeToAdvancementDestination(
  base: "third",
  outcome: RunnerOutcome,
): "home" | "out" | undefined;
function runnerOutcomeToAdvancementDestination(
  base: "first" | "second" | "third",
  outcome: RunnerOutcome,
): "second" | "third" | "home" | "out" | undefined {
  switch (outcome) {
    case "TO_2B":
      return base === "first" ? "second" : undefined;
    case "TO_3B":
      return base === "first" || base === "second" ? "third" : undefined;
    case "SCORED":
      return "home";
    case "OUT_2B":
    case "OUT_3B":
    case "OUT_HOME":
      return "out";
    default:
      return undefined;
  }
}

function buildDefaultRunnerAdvancement(
  result: AtBatResult,
  outs: number,
  bases: Bases,
): RunnerAdvancement | undefined {
  const advancement: RunnerAdvancement = {};

  if (bases.first) {
    const destination = runnerOutcomeToAdvancementDestination(
      "first",
      getDefaultRunnerOutcome("first", result, outs, bases),
    );
    if (destination) advancement.fromFirst = destination;
  }

  if (bases.second) {
    const destination = runnerOutcomeToAdvancementDestination(
      "second",
      getDefaultRunnerOutcome("second", result, outs, bases),
    );
    if (destination) advancement.fromSecond = destination;
  }

  if (bases.third) {
    const destination = runnerOutcomeToAdvancementDestination(
      "third",
      getDefaultRunnerOutcome("third", result, outs, bases),
    );
    if (destination) advancement.fromThird = destination;
  }

  return Object.keys(advancement).length > 0 ? advancement : undefined;
}

/**
 * Auto-correct result type based on runner outcomes.
 * Per AtBatFlow.tsx lines 99-143
 *
 * @returns Corrected result and explanation, or null if no correction
 */
export function autoCorrectResult(
  initialResult: AtBatResult,
  outs: number,
  bases: Bases,
  runnerOutcomes: {
    first: RunnerOutcome | null;
    second: RunnerOutcome | null;
    third: RunnerOutcome | null;
  },
): { correctedResult: AtBatResult; explanation: string } | null {
  // Count runner outs from outcomes
  const countRunnerOuts = (): number => {
    let count = 0;
    if (runnerOutcomes.first?.startsWith("OUT_")) count++;
    if (runnerOutcomes.second?.startsWith("OUT_")) count++;
    if (runnerOutcomes.third?.startsWith("OUT_")) count++;
    return count;
  };

  // FO/FLO → SF: If runner from 3rd scores on a fly out with less than 2 outs
  if (
    (initialResult === "FO" || initialResult === "FLO") &&
    outs < 2 &&
    bases.third &&
    runnerOutcomes.third === "SCORED"
  ) {
    return {
      correctedResult: "SF",
      explanation:
        "Auto-corrected to Sac Fly (runner scored from 3rd on fly out)",
    };
  }

  // D-6: GO → DP auto-correction REMOVED per C-017 reconciliation.
  // GO→DP is now handled via an inline prompt in GameTracker.tsx (handleDpPromptAnswer).
  // The user explicitly chooses DP vs GO — no silent auto-correction.

  return null;
}

/**
 * Check if runner advancement exceeds standard for the result.
 * Extra advancement requires explanation (SB, WP, PB, E).
 * Per AtBatFlow.tsx lines 221-275
 */
export function isExtraAdvancement(
  base: "first" | "second" | "third",
  outcome: RunnerOutcome,
  result: AtBatResult,
  bases: Bases,
): boolean {
  // Map outcome to destination
  const outcomeToDestination = (
    o: RunnerOutcome,
  ): "2B" | "3B" | "HOME" | null => {
    switch (o) {
      case "TO_2B":
        return "2B";
      case "TO_3B":
        return "3B";
      case "SCORED":
        return "HOME";
      default:
        return null;
    }
  };

  const destination = outcomeToDestination(outcome);
  if (!destination) return false; // HELD or OUT doesn't need extra event

  // WALKS (BB, IBB, HBP): Standard is forced runners advance exactly 1 base
  if (["BB", "IBB", "HBP"].includes(result)) {
    // R1: Standard is TO_2B, anything beyond is extra
    if (base === "first") {
      return destination !== "2B"; // TO_3B or HOME = extra
    }
    // R2: If forced (R1 exists), standard is TO_3B. If not forced, any advance is extra
    if (base === "second") {
      if (isRunnerForced("second", result, bases)) {
        return destination === "HOME"; // Forced R2 scoring = extra
      } else {
        return true; // Non-forced R2 advancing at all = extra
      }
    }
    // R3: If forced (bases loaded), scoring is standard. Otherwise any advance is extra
    if (base === "third") {
      if (isRunnerForced("third", result, bases)) {
        return false; // Forced R3 scoring = standard
      } else {
        return destination === "HOME"; // Non-forced R3 scoring = extra
      }
    }
  }

  // STRIKEOUTS (K, KL): Any advancement requires WP, PB, or SB
  if (["K", "Kc"].includes(result)) {
    return true; // Any advancement on K requires extra event
  }

  // SINGLES (1B): R1 scoring on a single is rare - likely error
  if (result === "1B") {
    if (base === "first" && destination === "HOME") return true;
  }

  return false;
}

/**
 * Calculate RBIs from runner outcomes, applying baseball rules.
 * Per AtBatFlow.tsx lines 599-623
 * - Errors: No RBI
 * - DP: No RBI even if run scores
 */
export function calculateRBIs(
  result: AtBatResult,
  runnerOutcomes: {
    first: RunnerOutcome | null;
    second: RunnerOutcome | null;
    third: RunnerOutcome | null;
  },
  bases: Bases,
): number {
  let rbis = 0;

  // Count runners who scored
  if (runnerOutcomes.first === "SCORED") rbis++;
  if (runnerOutcomes.second === "SCORED") rbis++;
  if (runnerOutcomes.third === "SCORED") rbis++;

  // Home run adds batter's run as RBI
  if (result === "HR" || result === "ITPHR") {
    rbis =
      (bases.first ? 1 : 0) +
      (bases.second ? 1 : 0) +
      (bases.third ? 1 : 0) +
      1;
  }

  // Errors don't give RBIs
  if (result === "E") {
    rbis = 0;
  }

  // DP/TP doesn't give RBIs even if run scores
  if (result === "DP" || result === "TP") {
    rbis = 0;
  }

  return rbis;
}

function isForceOutRunner(
  fromBase: "first" | "second" | "third",
  runnerData: RunnerAdvancement,
  basesBeforePlay: Bases,
): boolean {
  const destination =
    fromBase === "first"
      ? runnerData.fromFirst
      : fromBase === "second"
        ? runnerData.fromSecond
        : runnerData.fromThird;

  if (destination !== "out") return false;

  if (fromBase === "first") return true;
  if (fromBase === "second") return basesBeforePlay.first;
  return basesBeforePlay.first && basesBeforePlay.second;
}

function shouldInvalidateRunsOnThirdOut(
  outType: OutType,
  outsBeforePlay: number,
  outsOnPlay: number,
  basesBeforePlay: Bases,
  runnerData?: RunnerAdvancement,
): boolean {
  const outsAfterPlay = outsBeforePlay + outsOnPlay;
  if (outsAfterPlay < 3) return false;

  // Project Bible: no run can score if the 3rd out is batter-runner out before 1B.
  if (outType === "GO") return true;

  if (!runnerData) return false;

  // Project Bible: no run can score if the 3rd out is ANY force out.
  return (
    isForceOutRunner("first", runnerData, basesBeforePlay) ||
    isForceOutRunner("second", runnerData, basesBeforePlay) ||
    isForceOutRunner("third", runnerData, basesBeforePlay)
  );
}

/**
 * Helper type definitions matching src/types/game.ts
 */
export function isOut(result: AtBatResult): boolean {
  return [
    "K",
    "Kc",
    "GO",
    "FO",
    "FLO",
    "LO",
    "PO",
    "DP",
    "TP",
    "SF",
    "SAC",
    "WP_K",
    "PB_K",
  ].includes(result);
}

export function isHit(result: AtBatResult): boolean {
  return ["1B", "2B", "3B", "HR", "ITPHR", "GRD"].includes(result);
}

export function reachesBase(result: AtBatResult): boolean {
  return [
    "1B",
    "2B",
    "3B",
    "HR",
    "BB",
    "IBB",
    "HBP",
    "E",
    "FC",
    "D3K",
  ].includes(result);
}

/**
 * Convert base position name to tracker base format
 */
function baseToTrackerBase(
  base: "first" | "second" | "third",
): "1B" | "2B" | "3B" {
  return base === "first" ? "1B" : base === "second" ? "2B" : "3B";
}

/**
 * Convert tracker base to position name format
 */
function trackerBaseToPosition(
  base: "1B" | "2B" | "3B",
): "first" | "second" | "third" {
  return base === "1B" ? "first" : base === "2B" ? "second" : "third";
}

/**
 * Ensure the tracker's current pitcher matches the game state's current pitcher.
 * This is necessary after half-inning transitions where endInning() clears bases
 * but doesn't know about the opposing team's pitcher.
 */
function syncTrackerPitcher(
  state: RunnerTrackingState,
  pitcherId: string,
  pitcherName: string,
): RunnerTrackingState {
  if (state.currentPitcherId === pitcherId) return state;
  return {
    ...state,
    currentPitcherId: pitcherId,
    currentPitcherName: pitcherName,
  };
}

/**
 * Find a runner in the tracker by their current base position
 */
function findRunnerOnBase(
  state: RunnerTrackingState,
  base: "first" | "second" | "third",
): string | null {
  const trackerBase = baseToTrackerBase(base);
  const runner = state.runners.find((r) => r.currentBase === trackerBase);
  return runner?.runnerId ?? null;
}

/**
 * Build runner info for event logging from tracker state.
 * Replaces empty-string runnerId stubs with actual runner IDs from the tracker.
 */
function buildRunnerInfo(
  trackerState: RunnerTrackingState,
  base: "first" | "second" | "third",
  occupied: boolean,
  fallbackPitcherId: string,
): {
  runnerId: string;
  runnerName: string;
  responsiblePitcherId: string;
} | null {
  if (!occupied) return null;
  const trackerBase = baseToTrackerBase(base);
  const runner = trackerState.runners.find(
    (r) => r.currentBase === trackerBase,
  );
  return {
    runnerId: runner?.runnerId ?? "",
    runnerName: runner?.runnerName ?? "",
    responsiblePitcherId: runner?.responsiblePitcherId ?? fallbackPitcherId,
  };
}

/**
 * Build runnersAfter snapshot from the tracker state.
 * Call AFTER tracker has been updated with all runner movements for this play.
 */
function buildRunnersAfter(trackerState: RunnerTrackingState): {
  first: {
    runnerId: string;
    runnerName: string;
    responsiblePitcherId: string;
  } | null;
  second: {
    runnerId: string;
    runnerName: string;
    responsiblePitcherId: string;
  } | null;
  third: {
    runnerId: string;
    runnerName: string;
    responsiblePitcherId: string;
  } | null;
} {
  const findOnBase = (base: "1B" | "2B" | "3B") => {
    const runner = trackerState.runners.find((r) => r.currentBase === base);
    if (!runner) return null;
    return {
      runnerId: runner.runnerId,
      runnerName: runner.runnerName,
      responsiblePitcherId: runner.responsiblePitcherId,
    };
  };
  return {
    first: findOnBase("1B"),
    second: findOnBase("2B"),
    third: findOnBase("3B"),
  };
}

function runnerOutcomeToEventDestination(
  outcome: RunnerOutcome,
): "second" | "third" | "home" | "out" | null {
  switch (outcome) {
    case "TO_2B":
      return "second";
    case "TO_3B":
      return "third";
    case "SCORED":
      return "home";
    case "OUT_2B":
    case "OUT_3B":
    case "OUT_HOME":
      return "out";
    default:
      return null;
  }
}

function buildEventRunnerOutcomes(
  trackerBeforePlay: RunnerTrackingState,
  basesBefore: Bases,
  runnerOutcomes: {
    first: RunnerOutcome | null;
    second: RunnerOutcome | null;
    third: RunnerOutcome | null;
  },
  fallbackPitcherId: string,
): AtBatEvent["runnerOutcomes"] | undefined {
  const outcomes = (["first", "second", "third"] as const).flatMap((base) => {
    if (!basesBefore[base]) return [];

    const outcome = runnerOutcomes[base];
    if (!outcome || outcome === "HELD") return [];

    const toBase = runnerOutcomeToEventDestination(outcome);
    if (!toBase) return [];

    const runner = buildRunnerInfo(
      trackerBeforePlay,
      base,
      true,
      fallbackPitcherId,
    );
    return [
      {
        runnerId: runner?.runnerId ?? "",
        runnerName: runner?.runnerName ?? "",
        fromBase: base,
        toBase,
      },
    ];
  });

  return outcomes.length > 0 ? outcomes : undefined;
}

/**
 * Convert destination to tracker format
 */
function destToTrackerBase(
  dest: "second" | "third" | "home",
): "1B" | "2B" | "3B" | "HOME" {
  if (dest === "home") return "HOME";
  return dest === "second" ? "2B" : "3B";
}

/**
 * Process scored events from the tracker and attribute ER/UER to correct pitchers.
 * Returns the number of earned runs and total runs, and updates pitcherStats.
 */
function processTrackerScoredEvents(
  scoredEvents: RunnerScoredEvent[],
  setPitcherStats: React.Dispatch<
    React.SetStateAction<Map<string, PitcherGameStats>>
  >,
  createEmpty: () => PitcherGameStats,
): { earnedRuns: number; totalRuns: number } {
  let earnedRuns = 0;
  const totalRuns = scoredEvents.length;

  for (const event of scoredEvents) {
    if (event.wasEarnedRun) earnedRuns++;

    // Attribute run to the RESPONSIBLE pitcher (who allowed runner on base)
    setPitcherStats((prev) => {
      const newStats = new Map(prev);
      const pStats = {
        ...(newStats.get(event.chargedToPitcherId) || createEmpty()),
      };
      pStats.runsAllowed++;
      if (event.wasEarnedRun) {
        pStats.earnedRuns++;
      }
      newStats.set(event.chargedToPitcherId, pStats);
      return newStats;
    });
  }

  return { earnedRuns, totalRuns };
}

function creditPlayerRunsForScoredEvents(
  scoredEvents: RunnerScoredEvent[],
  setPlayerStats: React.Dispatch<
    React.SetStateAction<Map<string, PlayerGameStats>>
  >,
  createEmpty: () => PlayerGameStats,
): void {
  if (scoredEvents.length === 0) return;

  setPlayerStats((prev) => {
    const next = new Map(prev);

    for (const event of scoredEvents) {
      const runnerId = event.runner.runnerId;
      if (!runnerId) continue;

      const stats = {
        ...(next.get(runnerId) || createEmpty()),
      };
      stats.r += 1;
      next.set(runnerId, stats);
    }

    return next;
  });
}

function isEarnedRunForHowReached(howReached: HowReached): boolean {
  return howReached !== "error" && howReached !== "ghost_runner";
}

function clonePitcherStatsMap(
  source: Map<string, PitcherGameStats>,
): Map<string, PitcherGameStats> {
  return new Map(
    Array.from(source.entries(), ([pitcherId, stats]) => [
      pitcherId,
      { ...stats },
    ]),
  );
}

type TeamSide = "away" | "home";
type PendingAtBatEnrichment = NonNullable<AtBatEvent["enrichment"]> & {
  fieldingAttemptType?: "routine";
  fieldingAttemptOutcome?: "made";
  playMechanic?: "routine";
};

function getDefaultAtBatEnrichment(
  result: AtBatResult,
): PendingAtBatEnrichment | undefined {
  if (["K", "Kc", "D3K", "WP_K", "PB_K", "BB", "IBB", "HBP"].includes(result)) {
    return undefined;
  }

  return {
    exitType: "normal",
    fieldingPlayType: "routine",
    fieldingAttemptType: "routine",
    fieldingAttemptOutcome: "made",
    playMechanic: "routine",
    ...(result === "SAC" ? { exitType: "bunt" } : {}),
  };
}

function registerTrackedIdentity(
  teamByPlayerId: Map<string, TeamSide>,
  nameByPlayerId: Map<string, string>,
  playerId: string | undefined,
  playerName: string | undefined,
  teamSide: TeamSide,
): void {
  if (!playerId) return;
  teamByPlayerId.set(playerId, teamSide);
  if (playerName) {
    nameByPlayerId.set(playerId, playerName);
  }
}

function resolveTrackedTeamSide(
  playerId: string | undefined,
  teamByPlayerId: Map<string, TeamSide>,
  awayLineup: Array<{ playerId: string }>,
  homeLineup: Array<{ playerId: string }>,
  awayLineupState: LineupState,
  homeLineupState: LineupState,
): TeamSide | null {
  if (!playerId) return null;

  const tracked = teamByPlayerId.get(playerId);
  if (tracked) return tracked;

  const hasPlayer = (players: Array<{ playerId: string }>, id: string) =>
    players.some((player) => player.playerId === id);

  if (
    hasPlayer(awayLineup, playerId) ||
    hasPlayer(awayLineupState.lineup, playerId) ||
    hasPlayer(awayLineupState.bench, playerId) ||
    awayLineupState.usedPlayers.includes(playerId) ||
    awayLineupState.currentPitcher?.playerId === playerId
  ) {
    return "away";
  }

  if (
    hasPlayer(homeLineup, playerId) ||
    hasPlayer(homeLineupState.lineup, playerId) ||
    hasPlayer(homeLineupState.bench, playerId) ||
    homeLineupState.usedPlayers.includes(playerId) ||
    homeLineupState.currentPitcher?.playerId === playerId
  ) {
    return "home";
  }

  return null;
}

function resolveActualTeamId(
  playerId: string | undefined,
  teamByPlayerId: Map<string, TeamSide>,
  awayLineup: Array<{ playerId: string }>,
  homeLineup: Array<{ playerId: string }>,
  awayLineupState: LineupState,
  homeLineupState: LineupState,
  awayTeamId: string,
  homeTeamId: string,
): string {
  const side = resolveTrackedTeamSide(
    playerId,
    teamByPlayerId,
    awayLineup,
    homeLineup,
    awayLineupState,
    homeLineupState,
  );
  return side === "away" ? awayTeamId : homeTeamId;
}

/**
 * MAJ-08: Calculate pitcher decisions (W/L/SV/H/BS) at game end.
 * Per PITCHER_STATS_TRACKING_SPEC.md §5-6.
 *
 * Returns a cloned stats map with pitcher decisions populated.
 */
async function calculatePitcherDecisions(
  pitcherStats: Map<string, PitcherGameStats>,
  homeScore: number,
  awayScore: number,
  gameInnings: number,
  gameId: string,
  resolvePitcherSide: (pitcherId: string) => TeamSide | null,
): Promise<Map<string, PitcherGameStats>> {
  const updatedPitcherStats = clonePitcherStatsMap(pitcherStats);

  if (homeScore === awayScore) return updatedPitcherStats; // Tie game = no decisions

  const winningTeam = homeScore > awayScore ? "home" : "away";
  const losingTeam = winningTeam === "home" ? "away" : "home";

  // Separate pitchers by team
  const teamPitchers: {
    id: string;
    stats: PitcherGameStats;
    team: "away" | "home";
  }[] = [];
  updatedPitcherStats.forEach((stats, id) => {
    const team = resolvePitcherSide(id) || "home";
    teamPitchers.push({ id, stats, team });
  });

  const winTeamPitchers = teamPitchers.filter((p) => p.team === winningTeam);
  const loseTeamPitchers = teamPitchers.filter((p) => p.team !== winningTeam);

  // --- D-01 FIX: LOSS via lead-change tracking ---
  // The L goes to the pitcher who was on the mound when the winning team
  // took a lead they never relinquished (the "go-ahead" run).
  // We scan AtBatEvents to find when the winning team last took the lead
  // for good, then identify which losing-team pitcher was pitching at that moment.
  if (loseTeamPitchers.length > 0) {
    let losingPitcherId: string | null = null;

    try {
      const events = await getGameEvents(gameId);
      if (events.length > 0) {
        // Walk through events chronologically to find the at-bat where the
        // winning team took their final go-ahead lead.
        // "Final go-ahead" = the first moment the winning team had a lead
        // that was never tied or surpassed afterward.
        //
        // Strategy: scan forward. Track every at-bat where the winning team
        // takes or extends a lead. The LAST at-bat where the winning team's
        // lead went from <= 0 to > 0 is the go-ahead moment. The losing-team
        // pitcher on the mound at that at-bat gets the L.

        let goAheadPitcherId: string | null = null;

        for (const evt of events) {
          // Calculate lead from winning team's perspective BEFORE and AFTER the at-bat
          const winScoreBefore =
            winningTeam === "home" ? evt.homeScore : evt.awayScore;
          const loseScoreBefore =
            winningTeam === "home" ? evt.awayScore : evt.homeScore;
          const winScoreAfter =
            winningTeam === "home" ? evt.homeScoreAfter : evt.awayScoreAfter;
          const loseScoreAfter =
            winningTeam === "home" ? evt.awayScoreAfter : evt.homeScoreAfter;

          const leadBefore = winScoreBefore - loseScoreBefore;
          const leadAfter = winScoreAfter - loseScoreAfter;

          // Did the winning team take or re-take the lead on this at-bat?
          if (leadBefore <= 0 && leadAfter > 0) {
            // This is a go-ahead moment. The pitcher of the LOSING team
            // who was pitching at this at-bat is the candidate for the L.
            // The losing team is the team pitching when the winning team bats.
            // If winning team is batting: the pitcher is on the losing team.
            const pitcherTeam = evt.pitcherTeamId
              .toLowerCase()
              .startsWith("away")
              ? "away"
              : "home";
            if (pitcherTeam === losingTeam) {
              goAheadPitcherId = evt.pitcherId;
            }
          }
        }

        if (goAheadPitcherId) {
          losingPitcherId = goAheadPitcherId;
        }
      }
    } catch (err) {
      // If IndexedDB fails, fall back to most-runs-allowed heuristic
      console.warn(
        "[calculatePitcherDecisions] Failed to read events for lead tracking, using fallback:",
        err,
      );
    }

    // Fallback: if lead-change tracking didn't find anyone (e.g., no events,
    // edge case), use the original heuristic: most runs allowed
    if (!losingPitcherId) {
      let worst = loseTeamPitchers[0];
      for (const p of loseTeamPitchers) {
        if (p.stats.runsAllowed > worst.stats.runsAllowed) {
          worst = p;
        }
      }
      losingPitcherId = worst.id;
    }

    // Assign L to the identified pitcher
    const lp = loseTeamPitchers.find((p) => p.id === losingPitcherId);
    if (lp) {
      lp.stats.decision = "L";
    } else {
      // ID not in loseTeamPitchers (shouldn't happen) — fallback to first
      loseTeamPitchers[0].stats.decision = "L";
    }

    // Mark rest as ND
    for (const p of loseTeamPitchers) {
      if (p.stats.decision === null) p.stats.decision = "ND";
    }
  }

  // --- WIN: Starter gets W if ≥5 IP (15 outs, scaled for short games) ---
  const minOutsForQualifyingW = Math.min(
    15,
    Math.floor(((gameInnings * 5) / 9) * 3),
  );
  const starter = winTeamPitchers.find((p) => p.stats.isStarter);

  if (starter && starter.stats.outsRecorded >= minOutsForQualifyingW) {
    starter.stats.decision = "W";
  } else {
    // Starter didn't qualify — find the most effective reliever
    // "Most effective" = most outs recorded among relievers
    const relievers = winTeamPitchers.filter(
      (p) => !p.stats.isStarter && p.stats.outsRecorded > 0,
    );
    if (relievers.length > 0) {
      let bestReliever = relievers[0];
      for (const r of relievers) {
        if (r.stats.outsRecorded > bestReliever.stats.outsRecorded) {
          bestReliever = r;
        }
      }
      bestReliever.stats.decision = "W";
    } else if (starter) {
      // If no relievers recorded outs, starter still gets W
      starter.stats.decision = "W";
    }
  }

  // --- SAVE: Last pitcher on winning team who isn't the W pitcher ---
  const lastWinPitcher = winTeamPitchers.find((p) => p.stats.finishedGame);
  if (
    lastWinPitcher &&
    lastWinPitcher.stats.decision !== "W" &&
    !lastWinPitcher.stats.isStarter
  ) {
    const scoreDiff = Math.abs(homeScore - awayScore);
    const outs = lastWinPitcher.stats.outsRecorded;

    // Save criteria: entered with ≤3 run lead and pitched ≥1 inning,
    // OR entered with tying run on base/at-bat/on-deck,
    // OR pitched ≥3 innings
    const criterion1 = scoreDiff <= 3 && outs >= 3;
    const criterion3 = outs >= 9; // 3+ innings

    // Simplified criterion 2: if inherited runners ≥ 1 and lead was small
    const criterion2 =
      lastWinPitcher.stats.inheritedRunners > 0 && scoreDiff <= 4;

    if (criterion1 || criterion2 || criterion3) {
      lastWinPitcher.stats.save = true;
    }
  }

  // Mark remaining winning team pitchers as ND
  for (const p of winTeamPitchers) {
    if (p.stats.decision === null) p.stats.decision = "ND";
  }

  return updatedPitcherStats;
}

function createEmptyPitcherStats(): PitcherGameStats {
  return {
    outsRecorded: 0,
    hitsAllowed: 0,
    runsAllowed: 0,
    earnedRuns: 0,
    walksAllowed: 0,
    strikeoutsThrown: 0,
    homeRunsAllowed: 0,
    pitchCount: 0,
    battersFaced: 0,
    // MAJ-07 new fields
    intentionalWalks: 0,
    hitByPitch: 0,
    wildPitches: 0,
    basesLoadedWalks: 0,
    firstInningRuns: 0,
    consecutiveHRsAllowed: 0,
    isStarter: false,
    entryInning: 1,
    entryOuts: 0,
    exitInning: null,
    exitOuts: null,
    finishedGame: false,
    inheritedRunners: 0,
    inheritedRunnersScored: 0,
    bequeathedRunners: 0,
    bequeathedRunnersScored: 0,
    decision: null,
    save: false,
    hold: false,
    blownSave: false,
  };
}

function hasPitcherGameAppearance(stats: PitcherGameStats | undefined): boolean {
  if (!stats) return false;
  return (
    stats.outsRecorded > 0 ||
    stats.hitsAllowed > 0 ||
    stats.runsAllowed > 0 ||
    stats.earnedRuns > 0 ||
    stats.walksAllowed > 0 ||
    stats.strikeoutsThrown > 0 ||
    stats.homeRunsAllowed > 0 ||
    stats.pitchCount > 0 ||
    stats.battersFaced > 0 ||
    stats.intentionalWalks > 0 ||
    stats.hitByPitch > 0 ||
    stats.wildPitches > 0 ||
    stats.basesLoadedWalks > 0 ||
    stats.inheritedRunners > 0 ||
    stats.inheritedRunnersScored > 0 ||
    stats.bequeathedRunners > 0 ||
    stats.bequeathedRunnersScored > 0
  );
}

function createEmptyScoreboardState(innings = 9): ScoreboardState {
  return {
    innings: Array(innings)
      .fill(null)
      .map(() => ({ away: undefined, home: undefined })),
    away: { runs: 0, hits: 0, errors: 0 },
    home: { runs: 0, hits: 0, errors: 0 },
  };
}

type PlayerFieldingTally = {
  putouts: number;
  assists: number;
  errors: number;
};

function createEmptyFieldingTally(): PlayerFieldingTally {
  return { putouts: 0, assists: 0, errors: 0 };
}

function buildPlayerFieldingTally(
  fieldingEvents: Awaited<ReturnType<typeof getGameFieldingEvents>>,
  betweenPlayEvents: BetweenPlayEvent[],
): Map<string, PlayerFieldingTally> {
  const tallyByPlayer = new Map<string, PlayerFieldingTally>();

  for (const fieldingEvent of fieldingEvents) {
    const tally =
      tallyByPlayer.get(fieldingEvent.playerId) ?? createEmptyFieldingTally();
    if (fieldingEvent.playType === "putout") {
      tally.putouts += 1;
    } else if (
      fieldingEvent.playType === "assist" ||
      fieldingEvent.playType === "outfield_assist" ||
      fieldingEvent.playType === "double_play_pivot"
    ) {
      tally.assists += 1;
    } else if (fieldingEvent.playType === "error") {
      tally.errors += 1;
    }
    tallyByPlayer.set(fieldingEvent.playerId, tally);
  }

  for (const betweenPlayEvent of betweenPlayEvents) {
    if (
      betweenPlayEvent.type !== "pickoff" ||
      betweenPlayEvent.runnerAction?.outcome !== "safe" ||
      betweenPlayEvent.errorChargedTo == null
    ) {
      continue;
    }

    const chargedPlayerId =
      betweenPlayEvent.errorChargedTo === "pitcher"
        ? betweenPlayEvent.runnerAttribution?.pitcherId
        : betweenPlayEvent.errorChargedTo === "catcher"
          ? betweenPlayEvent.runnerAttribution?.catcherId
          : betweenPlayEvent.runnerAttribution?.fielderId;

    if (!chargedPlayerId) {
      continue;
    }

    const tally =
      tallyByPlayer.get(chargedPlayerId) ?? createEmptyFieldingTally();
    tally.errors += 1;
    tallyByPlayer.set(chargedPlayerId, tally);
  }

  return tallyByPlayer;
}

type PersistedRunnerTrackerSnapshot = NonNullable<
  PersistedGameState["runnerTrackerSnapshot"]
>;

const PROCESSING_TIMEOUT = 10_000;

// ============================================
// MAIN HOOK
// ============================================

export function useGameState(initialGameId?: string): UseGameStateReturn {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [lineupVersion, setLineupVersion] = useState(0);
  const [persistenceMetadataVersion, setPersistenceMetadataVersion] = useState(0);
  const latestPersistedRef = useRef<PersistedGameState | null>(null);
  const autoSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoEndInningTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const autoEndGameTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  // T0-01: Auto game-end detection prompt
  const [showInningEndConfirm, setShowInningEndConfirm] = useState(false);
  const [showAutoEndPrompt, setShowAutoEndPrompt] = useState(false);
  const [atBatSequence, setAtBatSequence] = useState(0);
  const betweenPlayOrdinalRef = useRef(0);
  const isCorrectingRunnerOutcomesRef = useRef(false);
  const isRunnerOutcomeCorrectionPanelActiveRef = useRef(false);
  const autoEndGameQueuedRef = useRef(false);
  const liveOutsRef = useRef(0);

  // Current batter index for each team
  const [awayBatterIndex, setAwayBatterIndex] = useState(0);
  const [homeBatterIndex, setHomeBatterIndex] = useState(0);

  // Lineup storage
  const awayLineupRef = useRef<
    { playerId: string; playerName: string; position: string }[]
  >([]);
  const homeLineupRef = useRef<
    { playerId: string; playerName: string; position: string }[]
  >([]);
  const optimalLineupSnapshotsRef = useRef<GameLockLineupSnapshots | undefined>(
    undefined,
  );
  const chosenLineupSnapshotsRef = useRef<GameLockLineupSnapshots | undefined>(
    undefined,
  );
  const teamSideByPlayerIdRef = useRef<Map<string, TeamSide>>(new Map());
  const playerNameByIdRef = useRef<Map<string, string>>(new Map());
  const seasonIdRef = useRef<string>("");
  const statsScopeIdRef = useRef<string>("");
  const competitionTypeRef = useRef<CompetitionType | undefined>(undefined);
  const competitionIdRef = useRef<string | undefined>(undefined);
  const competitionNameRef = useRef<string | undefined>(undefined);
  // Layer 1B: Identity + team context refs
  const franchiseIdRef = useRef<string | undefined>(undefined);
  const scheduleGameIdRef = useRef<string | undefined>(undefined);
  const leagueIdRef = useRef<string | undefined>(undefined);
  const awayRecordRef = useRef<{ w: number; l: number } | undefined>(undefined);
  const homeRecordRef = useRef<{ w: number; l: number } | undefined>(undefined);
  // Layer 1B: Enrichment data ref — set from GameTracker before record calls
  const pendingEnrichmentRef = useRef<AtBatEvent["enrichment"]>(undefined);

  // MAJ-09: Full LineupState tracking for substitution validation
  const awayLineupStateRef = useRef<LineupState>({
    lineup: [],
    bench: [],
    usedPlayers: [],
    currentPitcher: null,
  });
  const homeLineupStateRef = useRef<LineupState>({
    lineup: [],
    bench: [],
    usedPlayers: [],
    currentPitcher: null,
  });

  // ============================================
  // POSITION INNINGS TRACKING (ticket 4.10 — Gold Glove / dWAR)
  // Maps playerId → { [position]: halfInningsPlayed }
  // Incremented at end of each half-inning for the fielding team
  // ============================================
  const positionInningsRef = useRef<Map<string, Record<string, number>>>(
    new Map(),
  );

  // Playoff context refs (set from GameTracker navigation state)
  const playoffSeriesIdRef = useRef<string | null>(null);
  const playoffGameNumberRef = useRef<number | null>(null);
  const playoffIdRef = useRef<string | null>(null);
  const [restoredCompetitionContext, setRestoredCompetitionContext] =
    useState<RestoredCompetitionContext>({});
  const [restoredPlayoffContext, setRestoredPlayoffContext] =
    useState<RestoredPlayoffContext>({
      playoffSeriesId: null,
      playoffGameNumber: null,
      playoffId: null,
    });

  // R3-T0: Refs for state that lives in GameTracker but must be persisted
  const extraInningRunnerRef = useRef<boolean>(false);
  const extraInningRunnerDelayRef = useRef<1 | 2>(1);
  const teamColorsRef = useRef<{
    awayTeamColor?: string;
    awayTeamBorderColor?: string;
    homeTeamColor?: string;
    homeTeamBorderColor?: string;
  }>({});
  const playerMojoFitnessGetterRef = useRef<
    (() => Record<string, { mojo: number; fitness: string }>) | null
  >(null);
  const gameStartTimestampRef = useRef<number>(Date.now());
  const gameStartedAtRef = useRef<number | null>(null);
  const [restoredMojoFitness, setRestoredMojoFitness] = useState<
    Record<string, { mojo: number; fitness: string }> | null
  >(null);
  const syncRestoredCompetitionContext = useCallback(
    (context: Partial<RestoredCompetitionContext>) => {
      const nextContext: RestoredCompetitionContext = {
        seasonId: context.seasonId,
        statsScopeId: context.statsScopeId,
        seasonNumber: context.seasonNumber,
        competitionType: context.competitionType,
        competitionId: context.competitionId,
        competitionName: context.competitionName,
        franchiseId: context.franchiseId,
        scheduleGameId: context.scheduleGameId,
        leagueId: context.leagueId,
      };
      setRestoredCompetitionContext((current) => {
        if (
          current.seasonId === nextContext.seasonId &&
          current.statsScopeId === nextContext.statsScopeId &&
          current.seasonNumber === nextContext.seasonNumber &&
          current.competitionType === nextContext.competitionType &&
          current.competitionId === nextContext.competitionId &&
          current.competitionName === nextContext.competitionName &&
          current.franchiseId === nextContext.franchiseId &&
          current.scheduleGameId === nextContext.scheduleGameId &&
          current.leagueId === nextContext.leagueId
        ) {
          return current;
        }
        return nextContext;
      });
    },
    [],
  );
  const syncRestoredPlayoffContext = useCallback(
    (context: Partial<RestoredPlayoffContext>) => {
      const nextContext = {
        playoffSeriesId: context.playoffSeriesId ?? null,
        playoffGameNumber: context.playoffGameNumber ?? null,
        playoffId: context.playoffId ?? null,
        playoffRound: context.playoffRound,
        isEliminationGame: context.isEliminationGame,
        isClinchGame: context.isClinchGame,
      };
      setRestoredPlayoffContext((current) => {
        if (
          current.playoffSeriesId === nextContext.playoffSeriesId &&
          current.playoffGameNumber === nextContext.playoffGameNumber &&
          current.playoffId === nextContext.playoffId &&
          current.playoffRound === nextContext.playoffRound &&
          current.isEliminationGame === nextContext.isEliminationGame &&
          current.isClinchGame === nextContext.isClinchGame
        ) {
          return current;
        }
        return nextContext;
      });
    },
    [],
  );
  const persistSnapshotImmediately = useCallback(
    (persisted: PersistedGameState) => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
        autoSaveTimeoutRef.current = null;
      }
      latestPersistedRef.current = persisted;
      immediateSaveCurrentGame(persisted);
      setLastSavedAt(Date.now());
    },
    [],
  );
  const notifyPersistenceMetadataChanged = useCallback((reason: string) => {
    console.log("[R3-T0] Persistence metadata changed", { reason });
    setPersistenceMetadataVersion((version) => version + 1);
  }, []);

  const [gameState, setGameState] = useState<GameState>({
    gameId: initialGameId || "",
    homeScore: 0,
    awayScore: 0,
    inning: 1,
    isTop: true,
    outs: 0,
    balls: 0,
    strikes: 0,
    bases: { first: false, second: false, third: false },
    currentBatterId: "",
    currentBatterName: "",
    currentPitcherId: "",
    currentPitcherName: "",
    currentCatcherId: "",
    currentCatcherName: "",
    awayTeamId: "",
    homeTeamId: "",
    awayTeamName: "",
    homeTeamName: "",
    stadiumName: null,
    seasonNumber: 1,
    gamePhase: "PRE_GAME",
    // Two-toggle defaults (Phase 2a): live OFF, post-game ON. Existing saved
    // games migrate to both-true via the snapshot load path for compat.
    liveBeatReporterEnabled: false,
    postGameColumnsEnabled: true,
  });
  const gameStateRef = useRef(gameState);

  const [scoreboard, setScoreboard] = useState<ScoreboardState>(
    createEmptyScoreboardState,
  );

  useEffect(() => {
    gameStateRef.current = gameState;
  }, [gameState]);

  useEffect(() => {
    betweenPlayOrdinalRef.current = 0;
  }, [atBatSequence]);

  const setStadiumName = useCallback((name: string | null) => {
    setGameState((prev) => ({ ...prev, stadiumName: name }));
  }, []);

  const getCurrentLeverageIndex = useCallback(
    (overrides?: {
      inning?: number;
      isTop?: boolean;
      outs?: number;
      bases?: { first: boolean; second: boolean; third: boolean };
      homeScore?: number;
      awayScore?: number;
    }) => {
      const outs = Math.max(
        0,
        Math.min(overrides?.outs ?? gameState.outs, 2),
      ) as 0 | 1 | 2;
      return calculateLeverageIndex({
        inning: overrides?.inning ?? gameState.inning,
        halfInning: (overrides?.isTop ?? gameState.isTop) ? "TOP" : "BOTTOM",
        outs,
        runners: overrides?.bases ?? gameState.bases,
        homeScore: overrides?.homeScore ?? gameState.homeScore,
        awayScore: overrides?.awayScore ?? gameState.awayScore,
        totalInnings: totalInningsRef.current,
      }).leverageIndex;
    },
    [
      gameState.awayScore,
      gameState.bases,
      gameState.homeScore,
      gameState.inning,
      gameState.isTop,
      gameState.outs,
    ],
  );

  const registerIdentityForSide = useCallback(
    (
      playerId: string | undefined,
      playerName: string | undefined,
      teamSide: TeamSide,
    ) => {
      registerTrackedIdentity(
        teamSideByPlayerIdRef.current,
        playerNameByIdRef.current,
        playerId,
        playerName,
        teamSide,
      );
    },
    [],
  );

  const resolveTeamSideForPlayerId = useCallback(
    (playerId: string | undefined): TeamSide | null => {
      return resolveTrackedTeamSide(
        playerId,
        teamSideByPlayerIdRef.current,
        awayLineupRef.current,
        homeLineupRef.current,
        awayLineupStateRef.current,
        homeLineupStateRef.current,
      );
    },
    [],
  );

  const resolveTeamIdForPlayerId = useCallback(
    (playerId: string | undefined): string => {
      return resolveActualTeamId(
        playerId,
        teamSideByPlayerIdRef.current,
        awayLineupRef.current,
        homeLineupRef.current,
        awayLineupStateRef.current,
        homeLineupStateRef.current,
        gameState.awayTeamId,
        gameState.homeTeamId,
      );
    },
    [gameState.awayTeamId, gameState.homeTeamId],
  );

  const resolvePlayerNameForId = useCallback(
    (playerId: string | undefined, fallback?: string): string => {
      if (!playerId) return fallback || "";
      const lineupName =
        awayLineupRef.current.find((player) => player.playerId === playerId)
          ?.playerName ||
        homeLineupRef.current.find((player) => player.playerId === playerId)
          ?.playerName ||
        awayLineupStateRef.current.bench.find(
          (player) => player.playerId === playerId,
        )?.playerName ||
        homeLineupStateRef.current.bench.find(
          (player) => player.playerId === playerId,
        )?.playerName ||
        (awayLineupStateRef.current.currentPitcher?.playerId === playerId
          ? awayLineupStateRef.current.currentPitcher.playerName
          : undefined) ||
        (homeLineupStateRef.current.currentPitcher?.playerId === playerId
          ? homeLineupStateRef.current.currentPitcher.playerName
          : undefined);

      return (
        lineupName ||
        pitcherNamesRef.current.get(playerId) ||
        playerNameByIdRef.current.get(playerId) ||
        fallback ||
        playerId
      );
    },
    [],
  );

  const syncPitcherIntoBattingLineup = useCallback(
    (
      teamSide: TeamSide,
      newPitcherId: string,
      exitingPitcherId: string,
      newPitcherName?: string,
      exitingPitcherName?: string,
    ) => {
      const pitchingStateRef =
        teamSide === "home" ? homeLineupStateRef : awayLineupStateRef;
      const pitchingLineupRef =
        teamSide === "home" ? homeLineupRef : awayLineupRef;
      const pitchState = pitchingStateRef.current;
      const resolvedPitcherName = resolvePlayerNameForId(
        newPitcherId,
        newPitcherName || newPitcherId,
      );
      const nextUsedPlayers = pitchState.usedPlayers.includes(exitingPitcherId)
        ? pitchState.usedPlayers
        : [...pitchState.usedPlayers, exitingPitcherId];
      const teamUsesDh =
        teamSide === "home" ? homeUsesDhRef.current : awayUsesDhRef.current;
      const currentPitcherLineupIndex = pitchState.currentPitcher
        ? pitchState.lineup.findIndex(
            (player) =>
              player.playerId === pitchState.currentPitcher?.playerId,
          )
        : -1;
      const currentPitcherIsInLineup = currentPitcherLineupIndex >= 0;
      const existingIncomingIndex = pitchState.lineup.findIndex(
        (player) => player.playerId === newPitcherId,
      );

      if (existingIncomingIndex >= 0) {
        const nextLineup = pitchState.lineup.map((player, index) =>
          index === existingIncomingIndex
            ? {
                ...player,
                playerName: resolvedPitcherName,
                position: "P" as Position,
              }
            : player,
        );
        pitchingLineupRef.current = nextLineup.map((player) => ({
          playerId: player.playerId,
          playerName: player.playerName,
          position: player.position,
        }));
        pitchingStateRef.current = {
          ...pitchState,
          lineup: nextLineup,
          currentPitcher: {
            ...nextLineup[existingIncomingIndex],
            position: "P" as Position,
            enteredFor:
              exitingPitcherName ||
              pitchState.currentPitcher?.playerName ||
              exitingPitcherId,
            isStarter: false,
          },
          usedPlayers: nextUsedPlayers,
        };
        return resolvedPitcherName;
      }

      const slotIndex = pitchState.lineup.findIndex(
        (player) =>
          player.playerId === exitingPitcherId ||
          player.position === "P" ||
          player.playerId === pitchState.currentPitcher?.playerId ||
          (
            !teamUsesDh &&
            currentPitcherIsInLineup &&
            player.battingOrder === pitchState.currentPitcher?.battingOrder
          ),
      );
      const battingOrder =
        slotIndex >= 0
          ? pitchState.lineup[slotIndex].battingOrder
          : pitchState.currentPitcher?.battingOrder || 1;
      const nextCurrentPitcher: LineupPlayer = {
        playerId: newPitcherId,
        playerName: resolvedPitcherName,
        position: "P" as Position,
        battingOrder,
        enteredInning: gameState.inning,
        enteredFor:
          (slotIndex >= 0
            ? pitchState.lineup[slotIndex].playerName
            : undefined) ||
          exitingPitcherName ||
          pitchState.currentPitcher?.playerName ||
          exitingPitcherId,
        isStarter: false,
      };

      if (slotIndex >= 0) {
        const nextLineup = [...pitchState.lineup];
        nextLineup[slotIndex] = nextCurrentPitcher;
        pitchingLineupRef.current = nextLineup.map((player) => ({
          playerId: player.playerId,
          playerName: player.playerName,
          position: player.position,
        }));
        pitchingStateRef.current = {
          ...pitchState,
          lineup: nextLineup,
          currentPitcher: nextCurrentPitcher,
          usedPlayers: nextUsedPlayers,
        };
        return resolvedPitcherName;
      }

      pitchingStateRef.current = {
        ...pitchState,
        currentPitcher: nextCurrentPitcher,
        usedPlayers: nextUsedPlayers,
      };
      return resolvedPitcherName;
    },
    [gameState.inning, resolvePlayerNameForId],
  );

  const buildBetweenPlayRunnersOn = useCallback((): NonNullable<
    BetweenPlayEvent["gameState"]
  >["runnersOn"] => {
    const runnersOn: NonNullable<BetweenPlayEvent["gameState"]>["runnersOn"] =
      {};
    for (const runner of runnerTrackerRef.current.runners) {
      if (runner.currentBase === "1B") runnersOn.first = runner.runnerId;
      if (runner.currentBase === "2B") runnersOn.second = runner.runnerId;
      if (runner.currentBase === "3B") runnersOn.third = runner.runnerId;
    }
    return runnersOn;
  }, []);

  const nextBetweenPlayEventIndex = useCallback((): number => {
    betweenPlayOrdinalRef.current += 1;
    return atBatSequence + betweenPlayOrdinalRef.current / 1000;
  }, [atBatSequence]);

  const createBetweenPlayEventBase = useCallback(
    (
      type: BetweenPlayEventType,
    ): Omit<BetweenPlayEvent, "eventId" | "timestamp" | "eventIndex"> & {
      eventId?: string;
      timestamp?: number;
      eventIndex?: number;
    } => {
      const timestamp = Date.now();
      const ordinal = betweenPlayOrdinalRef.current + 1;
      const eventIndex = nextBetweenPlayEventIndex();

      return {
        eventId: `${gameState.gameId}_bp_${atBatSequence}_${ordinal}_${timestamp}`,
        gameId: gameState.gameId,
        seasonId: seasonIdRef.current || undefined,
        statsScopeId:
          statsScopeIdRef.current || seasonIdRef.current || undefined,
        competitionType: competitionTypeRef.current,
        competitionId: competitionIdRef.current,
        franchiseId: franchiseIdRef.current,
        timestamp,
        eventIndex,
        type,
        gameState: {
          inning: gameState.inning,
          halfInning: gameState.isTop ? "TOP" : "BOTTOM",
          outs: gameState.outs,
          totalInnings: totalInningsRef.current,
          score: { away: gameState.awayScore, home: gameState.homeScore },
          extraInningRunner: extraInningRunnerRef.current,
          extraInningRunnerDelay: extraInningRunnerDelayRef.current,
          runnersOn: buildBetweenPlayRunnersOn(),
        },
      };
    },
    [
      atBatSequence,
      buildBetweenPlayRunnersOn,
      gameState.awayScore,
      gameState.gameId,
      gameState.homeScore,
      gameState.inning,
      gameState.isTop,
      gameState.outs,
      nextBetweenPlayEventIndex,
    ],
  );

  const persistBetweenPlayEvent = useCallback(
    async (
      event: Omit<
        BetweenPlayEvent,
        | "eventId"
        | "gameId"
        | "seasonId"
        | "statsScopeId"
        | "competitionType"
        | "competitionId"
        | "franchiseId"
        | "timestamp"
        | "eventIndex"
      >,
    ) => {
      const base = createBetweenPlayEventBase(event.type);
      const nextEvent: BetweenPlayEvent = {
        ...base,
        ...event,
        eventId: base.eventId!,
        timestamp: base.timestamp!,
        eventIndex: base.eventIndex!,
        gameState: event.gameState ?? base.gameState,
      };
      await logBetweenPlayEvent(nextEvent);
      return nextEvent;
    },
    [createBetweenPlayEventBase],
  );

  const mapBetweenPlayEventsToSubstitutionLog = useCallback(
    (events: BetweenPlayEvent[]): SubstitutionLogEntry[] => {
      return events.reduce<SubstitutionLogEntry[]>((log, event) => {
        if (event.type === "substitution" && event.substitution) {
          log.push({
            type:
              event.substitution.subType === "pinch_hit"
                ? "pinch_hit"
                : event.substitution.subType === "pinch_run"
                  ? "pinch_run"
                  : "player_sub",
            inning: event.gameState?.inning ?? 1,
            halfInning: event.gameState?.halfInning ?? "TOP",
            outgoingPlayerId: event.substitution.outPlayerId,
            outgoingPlayerName:
              event.substitution.outPlayerName ||
              event.substitution.outPlayerId,
            incomingPlayerId: event.substitution.inPlayerId,
            incomingPlayerName:
              event.substitution.inPlayerName || event.substitution.inPlayerId,
            timestamp: event.timestamp,
          });
          return log;
        }
        if (event.type === "position_change" && event.substitution) {
          log.push({
            type: "position_switch" as const,
            inning: event.gameState?.inning ?? 1,
            halfInning: event.gameState?.halfInning ?? "TOP",
            outgoingPlayerId: event.substitution.outPlayerId,
            outgoingPlayerName:
              event.substitution.outPlayerName ||
              event.substitution.outPlayerId,
            incomingPlayerId: event.substitution.inPlayerId,
            incomingPlayerName:
              event.substitution.inPlayerName || event.substitution.inPlayerId,
            timestamp: event.timestamp,
          });
          return log;
        }
        if (event.type === "pitcher_change" && event.pitcherChange) {
          log.push({
            type: "pitching_change" as const,
            inning: event.gameState?.inning ?? 1,
            halfInning: event.gameState?.halfInning ?? "TOP",
            outgoingPlayerId: event.pitcherChange.outgoingPitcherId,
            outgoingPlayerName:
              event.pitcherChange.outgoingPitcherName ||
              event.pitcherChange.outgoingPitcherId,
            incomingPlayerId: event.pitcherChange.incomingPitcherId,
            incomingPlayerName:
              event.pitcherChange.incomingPitcherName ||
              event.pitcherChange.incomingPitcherId,
            timestamp: event.timestamp,
          });
          return log;
        }
        return log;
      }, []);
    },
    [],
  );

  const seedLineupStateFromHeader = useCallback(
    (header: GameHeader) => {
      const awayStarters = header.startingLineups?.away || [];
      const homeStarters = header.startingLineups?.home || [];
      const awayBench = header.benchRosters?.away || [];
      const homeBench = header.benchRosters?.home || [];
      optimalLineupSnapshotsRef.current = header.optimalLineupSnapshots;
      chosenLineupSnapshotsRef.current = header.chosenLineupSnapshots;

      awayLineupRef.current = awayStarters
        .slice()
        .sort((a, b) => a.battingOrder - b.battingOrder)
        .map((player) => ({
          playerId: player.playerId,
          playerName: player.playerName,
          position: player.position,
        }));
      homeLineupRef.current = homeStarters
        .slice()
        .sort((a, b) => a.battingOrder - b.battingOrder)
        .map((player) => ({
          playerId: player.playerId,
          playerName: player.playerName,
          position: player.position,
        }));

      awayLineupStateRef.current = {
        lineup: awayStarters
          .slice()
          .sort((a, b) => a.battingOrder - b.battingOrder)
          .map((player) => ({
            playerId: player.playerId,
            playerName: player.playerName,
            position: player.position as Position,
            battingOrder: player.battingOrder,
            enteredInning: 1,
            isStarter: true,
          })),
        bench: awayBench.map((player) => ({
          playerId: player.playerId,
          playerName: player.playerName,
          positions: player.positions as Position[],
          isAvailable: true,
        })),
        usedPlayers: [],
        currentPitcher: header.startingPitchers?.away
          ? {
              playerId: header.startingPitchers.away.playerId,
              playerName: header.startingPitchers.away.playerName,
              position: "P",
              battingOrder:
                awayStarters.find(
                  (p) => p.playerId === header.startingPitchers?.away.playerId,
                )?.battingOrder || 1,
              enteredInning: 1,
              isStarter: true,
            }
          : null,
      };

      homeLineupStateRef.current = {
        lineup: homeStarters
          .slice()
          .sort((a, b) => a.battingOrder - b.battingOrder)
          .map((player) => ({
            playerId: player.playerId,
            playerName: player.playerName,
            position: player.position as Position,
            battingOrder: player.battingOrder,
            enteredInning: 1,
            isStarter: true,
          })),
        bench: homeBench.map((player) => ({
          playerId: player.playerId,
          playerName: player.playerName,
          positions: player.positions as Position[],
          isAvailable: true,
        })),
        usedPlayers: [],
        currentPitcher: header.startingPitchers?.home
          ? {
              playerId: header.startingPitchers.home.playerId,
              playerName: header.startingPitchers.home.playerName,
              position: "P",
              battingOrder:
                homeStarters.find(
                  (p) => p.playerId === header.startingPitchers?.home.playerId,
                )?.battingOrder || 1,
              enteredInning: 1,
              isStarter: true,
            }
          : null,
      };

      // Infer DH status from starting lineups (mirrors initializeGame logic)
      awayUsesDhRef.current = awayStarters.some((p) => p.position === "DH");
      homeUsesDhRef.current = homeStarters.some((p) => p.position === "DH");

      for (const player of awayStarters)
        registerIdentityForSide(player.playerId, player.playerName, "away");
      for (const player of homeStarters)
        registerIdentityForSide(player.playerId, player.playerName, "home");
      for (const player of awayBench)
        registerIdentityForSide(player.playerId, player.playerName, "away");
      for (const player of homeBench)
        registerIdentityForSide(player.playerId, player.playerName, "home");
      if (header.startingPitchers?.away) {
        registerIdentityForSide(
          header.startingPitchers.away.playerId,
          header.startingPitchers.away.playerName,
          "away",
        );
      }
      if (header.startingPitchers?.home) {
        registerIdentityForSide(
          header.startingPitchers.home.playerId,
          header.startingPitchers.home.playerName,
          "home",
        );
      }
    },
    [
      registerIdentityForSide,
      syncRestoredCompetitionContext,
      syncRestoredPlayoffContext,
    ],
  );

  const replayRosterChangeEvent = useCallback(
    (event: BetweenPlayEvent) => {
      if (event.type === "substitution" && event.substitution) {
        const substitution = event.substitution;
        const outPlayerId = event.substitution.outPlayerId;
        const inPlayerId = event.substitution.inPlayerId;
        const teamSide =
          resolveTeamSideForPlayerId(outPlayerId) ||
          resolveTeamSideForPlayerId(inPlayerId);
        if (!teamSide) return;

        const lineupRef = teamSide === "away" ? awayLineupRef : homeLineupRef;
        const lineupStateRef =
          teamSide === "away" ? awayLineupStateRef : homeLineupStateRef;
        const lineupIndex = lineupRef.current.findIndex(
          (player) => player.playerId === outPlayerId,
        );
        if (lineupIndex >= 0) {
          const previous = lineupStateRef.current.lineup[lineupIndex];
          lineupRef.current[lineupIndex] = {
            playerId: inPlayerId,
            playerName: substitution.inPlayerName || inPlayerId,
            position:
              substitution.inPosition ||
              substitution.outPosition ||
              lineupRef.current[lineupIndex].position,
          };
          lineupStateRef.current = {
            ...lineupStateRef.current,
            lineup: lineupStateRef.current.lineup.map((player, idx) =>
              idx === lineupIndex
                ? {
                    ...player,
                    playerId: inPlayerId,
                    playerName: substitution.inPlayerName || inPlayerId,
                    position: (substitution.inPosition ||
                      substitution.outPosition ||
                      previous.position) as Position,
                    enteredInning:
                      event.gameState?.inning || previous.enteredInning,
                    enteredFor: previous.playerName,
                    isStarter: false,
                  }
                : player,
            ),
            bench: lineupStateRef.current.bench.map((player) =>
              player.playerId === inPlayerId
                ? { ...player, isAvailable: false }
                : player,
            ),
            usedPlayers: lineupStateRef.current.usedPlayers.includes(
              outPlayerId,
            )
              ? lineupStateRef.current.usedPlayers
              : [...lineupStateRef.current.usedPlayers, outPlayerId],
          };
        }
        registerIdentityForSide(
          inPlayerId,
          substitution.inPlayerName,
          teamSide,
        );
        registerIdentityForSide(
          outPlayerId,
          substitution.outPlayerName,
          teamSide,
        );
        return;
      }

      if (event.type === "position_change" && event.substitution) {
        const substitution = event.substitution;
        const playerId = substitution.inPlayerId;
        const teamSide = resolveTeamSideForPlayerId(playerId);
        if (!teamSide) return;
        const lineupRef = teamSide === "away" ? awayLineupRef : homeLineupRef;
        const lineupStateRef =
          teamSide === "away" ? awayLineupStateRef : homeLineupStateRef;
        const lineupIndex = lineupRef.current.findIndex(
          (player) => player.playerId === playerId,
        );
        if (lineupIndex >= 0) {
          lineupRef.current[lineupIndex] = {
            ...lineupRef.current[lineupIndex],
            position:
              event.substitution.inPosition ||
              lineupRef.current[lineupIndex].position,
          };
          lineupStateRef.current = {
            ...lineupStateRef.current,
            lineup: lineupStateRef.current.lineup.map((player, idx) =>
              idx === lineupIndex
                ? {
                    ...player,
                    position: (substitution.inPosition ||
                      player.position) as Position,
                  }
                : player,
            ),
          };
        }
        return;
      }

      if (event.type === "pitcher_change" && event.pitcherChange) {
        const teamSide =
          event.gameState?.halfInning === "TOP" ? "home" : "away";
        const lineupStateRef =
          teamSide === "away" ? awayLineupStateRef : homeLineupStateRef;
        registerIdentityForSide(
          event.pitcherChange.incomingPitcherId,
          event.pitcherChange.incomingPitcherName,
          teamSide,
        );
        registerIdentityForSide(
          event.pitcherChange.outgoingPitcherId,
          event.pitcherChange.outgoingPitcherName,
          teamSide,
        );
        lineupStateRef.current = {
          ...lineupStateRef.current,
          currentPitcher: {
            playerId: event.pitcherChange.incomingPitcherId,
            playerName:
              event.pitcherChange.incomingPitcherName ||
              event.pitcherChange.incomingPitcherId,
            position: "P",
            battingOrder:
              lineupStateRef.current.currentPitcher?.battingOrder || 1,
            enteredInning: event.gameState?.inning || 1,
            isStarter: false,
          },
        };
      }
    },
    [registerIdentityForSide, resolveTeamSideForPlayerId],
  );

  const [playerStats, setPlayerStats] = useState<Map<string, PlayerGameStats>>(
    new Map(),
  );
  const [pitcherStats, setPitcherStats] = useState<
    Map<string, PitcherGameStats>
  >(new Map());
  const pitcherStatsRef = useRef<Map<string, PitcherGameStats>>(new Map());

  useEffect(() => {
    pitcherStatsRef.current = pitcherStats;
  }, [pitcherStats]);

  // Track pitcher ID → name mapping for post-game summary (EXH-011 pitcher names fix)
  const pitcherNamesRef = useRef<Map<string, string>>(new Map());

  // Fame events tracked during game (per SPECIAL_EVENTS_SPEC.md)
  const [, setFameEvents] = useState<FameEventRecord[]>([]);
  const fameEventsRef = useRef<FameEventRecord[]>([]);

  const replaceFameEvents = useCallback((events: FameEventRecord[]) => {
    fameEventsRef.current = events;
    setFameEvents(events);
  }, []);

  const appendFameEvent = useCallback((event: FameEventRecord) => {
    const nextEvents = [...fameEventsRef.current, event];
    fameEventsRef.current = nextEvents;
    setFameEvents(nextEvents);
  }, []);

  const buildPersistedFameEvents = useCallback(
    (
      currentInning: number,
      currentHalfInning: "TOP" | "BOTTOM",
    ): PersistedGameState["fameEvents"] => {
      return fameEventsRef.current.map((fe, idx) => ({
        id: `${gameState.gameId}_fame_${idx}`,
        gameId: gameState.gameId,
        eventType: fe.eventType,
        playerId: fe.playerId,
        playerName: resolvePlayerNameForId(fe.playerId, fe.playerName),
        playerTeam: resolveTeamIdForPlayerId(fe.playerId),
        fameValue: fe.fameValue,
        fameType: fe.fameType,
        inning: currentInning,
        halfInning: currentHalfInning,
        timestamp: Date.now(),
        autoDetected: false,
        description: fe.description,
      }));
    },
    [gameState.gameId, resolvePlayerNameForId, resolveTeamIdForPlayerId],
  );

  const creditFieldingOutsToPositions = useCallback(
    (outsRecorded: number) => {
      if (outsRecorded <= 0) return;

      const fieldingLineupState = gameState.isTop
        ? homeLineupStateRef.current
        : awayLineupStateRef.current;
      const activePitcherId = fieldingLineupState.currentPitcher?.playerId;
      let pitcherCredited = false;

      for (const player of fieldingLineupState.lineup) {
        if (!player.position || player.position === "DH") continue;

        const existing = positionInningsRef.current.get(player.playerId) || {};
        existing[player.position] =
          (existing[player.position] || 0) + outsRecorded;
        positionInningsRef.current.set(player.playerId, existing);

        if (player.playerId === activePitcherId && player.position === "P") {
          pitcherCredited = true;
        }
      }

      if (fieldingLineupState.currentPitcher && !pitcherCredited) {
        const existing =
          positionInningsRef.current.get(
            fieldingLineupState.currentPitcher.playerId,
          ) || {};
        existing.P = (existing.P || 0) + outsRecorded;
        positionInningsRef.current.set(
          fieldingLineupState.currentPitcher.playerId,
          existing,
        );
      }
    },
    [gameState.isTop],
  );

  // T1-02/03/04: Counter that increments when runner identity changes (pinch runner, etc.)
  // Used as a dependency trigger for the runnerNames sync effect in GameTracker.
  const [runnerIdentityVersion, setRunnerIdentityVersion] = useState(0);

  // Substitution log for game history
  const [substitutionLog, setSubstitutionLog] = useState<
    SubstitutionLogEntry[]
  >([]);

  const buildImmediateCurrentGameSnapshot = useCallback(
    (stateOverride?: GameState): PersistedGameState | null => {
      const currentGameState = stateOverride ?? gameStateRef.current;
      if (
        !currentGameState.gameId ||
        !currentGameState.awayTeamId ||
        !currentGameState.homeTeamId
      ) {
        return null;
      }

      const playerNameLookup = new Map<string, string>();
      for (const p of awayLineupRef.current) {
        playerNameLookup.set(p.playerId, p.playerName);
        registerIdentityForSide(p.playerId, p.playerName, "away");
      }
      for (const p of homeLineupRef.current) {
        playerNameLookup.set(p.playerId, p.playerName);
        registerIdentityForSide(p.playerId, p.playerName, "home");
      }
      for (const b of awayLineupStateRef.current.bench) {
        playerNameLookup.set(b.playerId, b.playerName);
        registerIdentityForSide(b.playerId, b.playerName, "away");
      }
      for (const b of homeLineupStateRef.current.bench) {
        playerNameLookup.set(b.playerId, b.playerName);
        registerIdentityForSide(b.playerId, b.playerName, "home");
      }

      const playerStatsRecord: PersistedGameState["playerStats"] = {};
      playerStats.forEach((stats, playerId) => {
        playerStatsRecord[playerId] = {
          playerName: resolvePlayerNameForId(
            playerId,
            playerNameLookup.get(playerId) ||
              playerNameByIdRef.current.get(playerId) ||
              playerId,
          ),
          teamId: resolveTeamIdForPlayerId(playerId),
          pa: stats.pa,
          ab: stats.ab,
          h: stats.h,
          singles: stats.singles,
          doubles: stats.doubles,
          triples: stats.triples,
          hr: stats.hr,
          rbi: stats.rbi,
          r: stats.r,
          bb: stats.bb,
          hbp: stats.hbp,
          k: stats.k,
          sb: stats.sb,
          cs: stats.cs,
          sf: stats.sf,
          sh: stats.sh,
          gidp: stats.gidp,
          putouts: 0,
          assists: 0,
          fieldingErrors: 0,
        };
      });

      const pitcherGameStats: PersistedGameState["pitcherGameStats"] = [];
      pitcherStats.forEach((stats, pitcherId) => {
        pitcherGameStats.push({
          pitcherId,
          pitcherName:
            pitcherNamesRef.current.get(pitcherId) ||
            playerNameByIdRef.current.get(pitcherId) ||
            pitcherId,
          teamId: resolveTeamIdForPlayerId(pitcherId),
          isStarter: stats.isStarter,
          entryInning: stats.entryInning,
          outsRecorded: stats.outsRecorded,
          hitsAllowed: stats.hitsAllowed,
          runsAllowed: stats.runsAllowed,
          earnedRuns: stats.earnedRuns,
          walksAllowed: stats.walksAllowed + stats.intentionalWalks,
          strikeoutsThrown: stats.strikeoutsThrown,
          homeRunsAllowed: stats.homeRunsAllowed,
          hitBatters: stats.hitByPitch,
          basesReachedViaError: 0,
          wildPitches: stats.wildPitches,
          pitchCount: stats.pitchCount,
          battersFaced: stats.battersFaced,
          consecutiveHRsAllowed: stats.consecutiveHRsAllowed,
          firstInningRuns: stats.firstInningRuns,
          basesLoadedWalks: stats.basesLoadedWalks,
          inningsComplete: Math.floor(stats.outsRecorded / 3),
          decision: stats.decision,
          save: stats.save,
          hold: stats.hold,
          blownSave: stats.blownSave,
        });
      });

      const tracker = runnerTrackerRef.current;
      const baseRunners: PersistedGameState["bases"] = {
        first: null,
        second: null,
        third: null,
      };
      for (const runner of tracker.runners) {
        const payload = {
          playerId: runner.runnerId,
          playerName: runner.runnerName,
          inheritedFrom: runner.isInherited
            ? runner.inheritedFromPitcherId || runner.responsiblePitcherId
            : null,
        };
        if (runner.currentBase === "1B") {
          baseRunners.first = payload;
        } else if (runner.currentBase === "2B") {
          baseRunners.second = payload;
        } else if (runner.currentBase === "3B") {
          baseRunners.third = payload;
        }
      }

      if (currentGameState.bases.first && !baseRunners.first) {
        baseRunners.first = latestPersistedRef.current?.bases.first || {
          playerId: `r1-${currentGameState.gameId}`,
          playerName: "Runner",
          inheritedFrom: null,
        };
      }
      if (currentGameState.bases.second && !baseRunners.second) {
        baseRunners.second = latestPersistedRef.current?.bases.second || {
          playerId: `r2-${currentGameState.gameId}`,
          playerName: "Runner",
          inheritedFrom: null,
        };
      }
      if (currentGameState.bases.third && !baseRunners.third) {
        baseRunners.third = latestPersistedRef.current?.bases.third || {
          playerId: `r3-${currentGameState.gameId}`,
          playerName: "Runner",
          inheritedFrom: null,
        };
      }

      const snapshotGameStartedAt =
        gameStartedAtRef.current ??
        latestPersistedRef.current?.gameStartedAt ??
        (currentGameState.gamePhase === "PRE_GAME" ? undefined : Date.now());

      return {
        id: "current",
        gameId: currentGameState.gameId,
        savedAt: Date.now(),
        inning: currentGameState.inning,
        halfInning: currentGameState.isTop ? "TOP" : "BOTTOM",
        outs: currentGameState.outs,
        homeScore: currentGameState.homeScore,
        awayScore: currentGameState.awayScore,
        bases: baseRunners,
        currentBatterIndex: currentGameState.isTop
          ? awayBatterIndex
          : homeBatterIndex,
        atBatCount: atBatSequence,
        awayTeamId: currentGameState.awayTeamId,
        homeTeamId: currentGameState.homeTeamId,
        awayTeamName: currentGameState.awayTeamName,
        homeTeamName: currentGameState.homeTeamName,
        seasonNumber: currentGameState.seasonNumber,
        stadiumName: currentGameState.stadiumName ?? null,
        currentBatterId: currentGameState.currentBatterId,
        currentBatterName: currentGameState.currentBatterName,
        currentPitcherId: currentGameState.currentPitcherId,
        currentPitcherName: currentGameState.currentPitcherName,
        gamePhase: currentGameState.gamePhase,
        gameStartedAt: snapshotGameStartedAt,
        playerStats: playerStatsRecord,
        pitcherGameStats,
        fameEvents: [],
        lastHRBatterId: null,
        consecutiveHRCount: 0,
        inningStrikeouts: 0,
        maxDeficitAway: 0,
        maxDeficitHome: 0,
        activityLog: [],
        currentInningPitches: inningPitchesRef.current,
        scoreboard: {
          innings: scoreboard.innings.map((inn) => ({
            away: inn.away,
            home: inn.home,
          })),
          away: { ...scoreboard.away },
          home: { ...scoreboard.home },
        },
        awayBatterIndex,
        homeBatterIndex,
        seasonId: seasonIdRef.current || undefined,
        statsScopeId:
          statsScopeIdRef.current || seasonIdRef.current || undefined,
        competitionType: competitionTypeRef.current,
        competitionId: competitionIdRef.current,
        competitionName: competitionNameRef.current,
        franchiseId: franchiseIdRef.current,
        scheduleGameId: scheduleGameIdRef.current,
        playoffSeriesId: playoffSeriesIdRef.current || undefined,
        playoffGameNumber: playoffGameNumberRef.current || undefined,
        playoffId: playoffIdRef.current || undefined,
        playoffRound: restoredPlayoffContext.playoffRound,
        isEliminationGame: restoredPlayoffContext.isEliminationGame,
        isClinchGame: restoredPlayoffContext.isClinchGame,
        leagueId: leagueIdRef.current,
        liveBeatReporterEnabled: currentGameState.liveBeatReporterEnabled,
        postGameColumnsEnabled: currentGameState.postGameColumnsEnabled,
        beatReporterEnabled:
          currentGameState.liveBeatReporterEnabled ||
          currentGameState.postGameColumnsEnabled,
        totalInnings: totalInningsRef.current,
        awayUsesDh: awayUsesDhRef.current,
        homeUsesDh: homeUsesDhRef.current,
        awayLineup: awayLineupRef.current,
        homeLineup: homeLineupRef.current,
        optimalLineupSnapshots: optimalLineupSnapshotsRef.current,
        chosenLineupSnapshots: chosenLineupSnapshotsRef.current,
        awayLineupState:
          awayLineupStateRef.current as PersistedGameState["awayLineupState"],
        homeLineupState:
          homeLineupStateRef.current as PersistedGameState["homeLineupState"],
        runnerTrackerSnapshot: {
          runners: tracker.runners as PersistedRunnerTrackerSnapshot["runners"],
          currentPitcherId: tracker.currentPitcherId,
          currentPitcherName: tracker.currentPitcherName,
          pitcherStatsEntries: Array.from(
            tracker.pitcherStats.entries(),
          ) as Array<[string, unknown]>,
          inning: tracker.inning,
          atBatNumber: tracker.atBatNumber,
        },
        pitcherNamesEntries: Array.from(pitcherNamesRef.current.entries()),
        substitutionLog:
          substitutionLog as PersistedGameState["substitutionLog"],
        extraInningRunner: extraInningRunnerRef.current,
        extraInningRunnerDelay: extraInningRunnerDelayRef.current,
        awayTeamColor: teamColorsRef.current.awayTeamColor,
        awayTeamBorderColor: teamColorsRef.current.awayTeamBorderColor,
        homeTeamColor: teamColorsRef.current.homeTeamColor,
        homeTeamBorderColor: teamColorsRef.current.homeTeamBorderColor,
        playerMojoFitness:
          playerMojoFitnessGetterRef.current?.() ?? undefined,
        gameStartTimestamp: gameStartTimestampRef.current,
      };
    },
    [
      atBatSequence,
      awayBatterIndex,
      homeBatterIndex,
      pitcherStats,
      playerStats,
      registerIdentityForSide,
      resolveTeamIdForPlayerId,
      scoreboard,
      substitutionLog,
      restoredPlayoffContext.playoffRound,
      restoredPlayoffContext.isEliminationGame,
      restoredPlayoffContext.isClinchGame,
    ],
  );

  // Pitch count prompt state (per PITCH_COUNT_TRACKING_SPEC.md)
  const [pitchCountPrompt, setPitchCountPrompt] =
    useState<PitchCountPrompt | null>(null);
  const [deferredPitchCounts, setDeferredPitchCounts] = useState<
    DeferredPitchCountEntry[]
  >([]);
  const pendingActionRef = useRef<(() => Promise<void>) | null>(null);
  const pendingActionCancelRef = useRef<
    (() => void | Promise<void>) | null
  >(null);

  // Ref to hold endInning function to avoid circular dependency
  const endInningRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    liveOutsRef.current = gameState.outs;
  }, [gameState.outs]);

  const scheduleAutoEndInning = useCallback(() => {
    if (
      isCorrectingRunnerOutcomesRef.current ||
      isRunnerOutcomeCorrectionPanelActiveRef.current
    ) {
      console.log(
        "[M3-3-universal] Skipping inning-end confirmation during runner outcome correction",
      );
      return;
    }
    if (showInningEndConfirm || autoEndInningTimeoutRef.current) {
      return;
    }
    autoEndInningTimeoutRef.current = setTimeout(() => {
      autoEndInningTimeoutRef.current = null;
      if (
        liveOutsRef.current < 3 ||
        isCorrectingRunnerOutcomesRef.current ||
        isRunnerOutcomeCorrectionPanelActiveRef.current
      ) {
        return;
      }
      console.log(
        "[M3-3-universal] Queued inning-end confirmation after third out",
      );
      setShowInningEndConfirm(true);
    }, 500);
  }, [showInningEndConfirm]);

  const queueAutoEndGame = useCallback(() => {
    if (
      autoEndGameQueuedRef.current ||
      autoEndGameTimeoutRef.current ||
      gameStateRef.current.gamePhase === "POST_FINAL_OUT"
    ) {
      return;
    }
    autoEndGameQueuedRef.current = true;
    gameStateRef.current = {
      ...gameStateRef.current,
      gamePhase: "POST_FINAL_OUT",
    };
    setGameState((prev) => ({
      ...prev,
      gamePhase: "POST_FINAL_OUT",
    }));
    autoEndGameTimeoutRef.current = setTimeout(() => {
      autoEndGameQueuedRef.current = false;
      autoEndGameTimeoutRef.current = null;
      setShowAutoEndPrompt(true);
    }, 300);
  }, []);

  const cancelAutoEndGameFlow = useCallback(() => {
    autoEndGameQueuedRef.current = false;
    if (autoEndGameTimeoutRef.current) {
      clearTimeout(autoEndGameTimeoutRef.current);
      autoEndGameTimeoutRef.current = null;
    }
    setShowAutoEndPrompt(false);
    if (gameStateRef.current.gamePhase !== "POST_FINAL_OUT") {
      return;
    }
    gameStateRef.current = {
      ...gameStateRef.current,
      gamePhase: "LIVE",
    };
    setGameState((prev) =>
      prev.gamePhase === "POST_FINAL_OUT"
        ? {
            ...prev,
            gamePhase: "LIVE",
          }
        : prev,
    );
  }, []);

  const evaluateEndGameTrigger = useCallback(
    (params: {
      inning: number;
      isTop: boolean;
      homeScoreBefore: number;
      awayScoreBefore: number;
      homeScoreAfter: number;
      awayScoreAfter: number;
      context: "live_play" | "half_inning_end";
    }) =>
      evaluateEndGameTriggerWithTotalInnings({
        ...params,
        totalInnings: totalInningsRef.current,
      }),
    [],
  );

  const reconcileEndGameAfterCorrection = useCallback(
    (params: {
      inning: number;
      isTop: boolean;
      outs: number;
      homeScoreBefore: number;
      awayScoreBefore: number;
      homeScoreAfter: number;
      awayScoreAfter: number;
      gamePhase: GamePhase;
    }) => {
      const context: "live_play" | "half_inning_end" =
        params.outs >= 3 ? "half_inning_end" : "live_play";
      const evaluation = evaluateEndGameTrigger({
        inning: params.inning,
        isTop: params.isTop,
        homeScoreBefore: params.homeScoreBefore,
        awayScoreBefore: params.awayScoreBefore,
        homeScoreAfter: params.homeScoreAfter,
        awayScoreAfter: params.awayScoreAfter,
        context,
      });

      if (evaluation.shouldEndGame) {
        if (params.gamePhase === "LIVE") {
          queueAutoEndGame();
        }
        return evaluation;
      }

      if (params.gamePhase === "POST_FINAL_OUT") {
        cancelAutoEndGameFlow();
      }

      return evaluation;
    },
    [cancelAutoEndGameFlow, evaluateEndGameTrigger, queueAutoEndGame],
  );

  const deferPitchCountPrompt = useCallback((prompt: PitchCountPrompt) => {
    const deferredEntry: DeferredPitchCountEntry = {
      pitcherId: prompt.pitcherId,
      pitcherName: prompt.pitcherName,
      lastKnownCount: prompt.currentCount,
      inning: prompt.lastVerifiedInning,
      halfInning: gameStateRef.current.isTop ? "TOP" : "BOTTOM",
      timestamp: Date.now(),
      promptType: prompt.type,
    };

    setDeferredPitchCounts((prev) => [
      ...prev.filter((entry) => entry.pitcherId !== prompt.pitcherId),
      deferredEntry,
    ]);
  }, []);

  // T0-01: Regulation innings for auto game-end detection (default 9)
  const totalInningsRef = useRef<number>(9);
  // R3: DH flags — persisted in snapshot so they survive refresh
  const awayUsesDhRef = useRef<boolean>(false);
  const homeUsesDhRef = useRef<boolean>(false);

  // CRIT-02 + MAJ-05: Shadow state for inherited runner tracking (ER/UER attribution)
  // This ref mirrors the boolean bases but stores rich runner identity data.
  // It does NOT trigger re-renders — only provides data for ER calculations.
  const runnerTrackerRef = useRef<RunnerTrackingState>(
    createRunnerTrackingState("", ""),
  );

  // Inning-level pitch tracking for immaculate inning detection
  // Tracks total pitches and strikeouts per half-inning
  const inningPitchesRef = useRef({ pitches: 0, strikeouts: 0, pitcherId: "" });

  // ============================================
  // LAYER 1B: CONTEXT SNAPSHOT BUILDER
  // ============================================

  /** Build context snapshot fields for AtBatEvent. Populates what's available; leaves rest undefined. */
  const buildContextSnapshot = useCallback(
    (result: AtBatResult, pitchCount?: number): Partial<AtBatEvent> => {
      const isBatterAway = gameState.isTop;
      const battingTeamId = isBatterAway
        ? gameState.awayTeamId
        : gameState.homeTeamId;
      const battingTeamName = isBatterAway
        ? gameState.awayTeamName
        : gameState.homeTeamName;
      const fieldingTeamId = isBatterAway
        ? gameState.homeTeamId
        : gameState.awayTeamId;
      const fieldingTeamName = isBatterAway
        ? gameState.homeTeamName
        : gameState.awayTeamName;

      // Look up batter in lineup state for position/order/enteredAs
      const batterLineupState = isBatterAway
        ? awayLineupStateRef.current
        : homeLineupStateRef.current;
      const batterInLineup = batterLineupState.lineup.find(
        (p) => p.playerId === gameState.currentBatterId,
      );

      // Look up pitcher in lineup state
      const pitcherLineupState = isBatterAway
        ? homeLineupStateRef.current
        : awayLineupStateRef.current;
      const pitcherInLineup = pitcherLineupState.currentPitcher;
      const catcherInLineup = pitcherLineupState.lineup.find(
        (p) => p.position === "C",
      );
      const catcherId =
        gameState.currentCatcherId || catcherInLineup?.playerId || "";
      const catcherName =
        gameState.currentCatcherName || catcherInLineup?.playerName || "";

      // Batter game stats
      const bStats = playerStats.get(gameState.currentBatterId);

      // Pitcher game stats
      const pStats = pitcherStats.get(gameState.currentPitcherId);

      // Batting/fielding team records
      const battingRecord = isBatterAway
        ? awayRecordRef.current
        : homeRecordRef.current;
      const fieldingRecord = isBatterAway
        ? homeRecordRef.current
        : awayRecordRef.current;

      // Determine enteredAs from lineup data
      let enteredAs:
        | "starter"
        | "pinch_hit"
        | "pinch_run"
        | "defensive_replacement"
        | undefined;
      if (batterInLineup) {
        if (batterInLineup.isStarter) {
          enteredAs = "starter";
        } else if (batterInLineup.enteredFor) {
          // Check substitution log for how they entered
          const subEntry = substitutionLog.find(
            (s) => s.incomingPlayerId === gameState.currentBatterId,
          );
          if (subEntry) {
            switch (subEntry.type) {
              case "pinch_hit":
                enteredAs = "pinch_hit";
                break;
              case "pinch_run":
                enteredAs = "pinch_run";
                break;
              case "defensive_sub":
                enteredAs = "defensive_replacement";
                break;
              default:
                enteredAs = "starter"; // fallback
            }
          }
        }
      }

      const defaultEnrichment = getDefaultAtBatEnrichment(result);
      const pendingEnrichment = pendingEnrichmentRef.current as
        | PendingAtBatEnrichment
        | undefined;
      const mergedEnrichment =
        defaultEnrichment || pendingEnrichment
          ? {
              ...defaultEnrichment,
              ...pendingEnrichment,
            }
          : undefined;
      const sanitizedEnrichment =
        result === "BB" || result === "IBB" || result === "HBP"
          ? undefined
          : mergedEnrichment;

      return {
        // 1.9: Identity
        seasonId: seasonIdRef.current || undefined,
        statsScopeId:
          statsScopeIdRef.current || seasonIdRef.current || undefined,
        competitionType: competitionTypeRef.current,
        competitionId: competitionIdRef.current,
        franchiseId: franchiseIdRef.current,
        leagueId: leagueIdRef.current,
        totalInnings: totalInningsRef.current,
        extraInningRunner: extraInningRunnerRef.current,
        extraInningRunnerDelay: extraInningRunnerDelayRef.current,

        // 1.10: Park context
        parkContext: gameState.stadiumName
          ? {
              stadiumId: gameState.stadiumName, // Use name as ID — no separate stadiumId system yet
              stadiumName: gameState.stadiumName,
            }
          : undefined,

        // 1.11: Team context
        teamContext: {
          battingTeam: {
            teamId: battingTeamId,
            teamName: battingTeamName,
            record: battingRecord,
          },
          fieldingTeam: {
            teamId: fieldingTeamId,
            teamName: fieldingTeamName,
            record: fieldingRecord,
          },
        },

        // 1.12: Batter context
        batterContext: {
          playerId: gameState.currentBatterId,
          playerName: gameState.currentBatterName,
          position: batterInLineup?.position,
          battingOrder: batterInLineup?.battingOrder,
          enteredAs,
          replacedPlayer: batterInLineup?.enteredFor,
          currentGameStats: bStats
            ? {
                ab: bStats.ab,
                h: bStats.h,
                hr: bStats.hr,
                rbi: bStats.rbi,
              }
            : undefined,
        },

        // 1.13: Pitcher context
        pitcherContext: {
          playerId: gameState.currentPitcherId,
          playerName: gameState.currentPitcherName,
          pitchCount: pStats?.pitchCount,
          currentGameStats: pStats
            ? {
                ip: pStats.outsRecorded / 3,
                h: pStats.hitsAllowed,
                er: pStats.earnedRuns,
                k: pStats.strikeoutsThrown,
                bb: pStats.walksAllowed,
              }
            : undefined,
          inheritedRunners: pStats?.inheritedRunners,
        },
        catcherContext: catcherId
          ? {
              playerId: catcherId,
              playerName: catcherName || catcherId,
              teamId: fieldingTeamId,
              position: "C",
            }
          : undefined,

        // 1.14: Matchup context — leave platoonAdvantage/isRivalry empty (no handedness/rivalry data in hook)
        // previousMatchupsThisGame left empty — requires querying event log

        // 1.15: Computed fields
        outsRecorded: calculateOutsFromResult(result),
        isQualityAtBat:
          (pitchCount !== undefined && pitchCount >= 7) ||
          ["1B", "2B", "3B", "HR", "ITPHR", "BB", "HBP", "IBB"].includes(result) ||
          undefined, // undefined if we can't determine

        // 1.16: Enrichment — consume pending enrichment data if set
        enrichment: sanitizedEnrichment,

        // 1.17: Versioning
        version: 1,
      };
    },
    [gameState, playerStats, pitcherStats, substitutionLog],
  );

  /** Set enrichment data to attach to the next recorded event */
  const setNextEventEnrichment = useCallback(
    (data: AtBatEvent["enrichment"]) => {
      pendingEnrichmentRef.current = {
        ...(pendingEnrichmentRef.current as PendingAtBatEnrichment | undefined),
        ...(data as PendingAtBatEnrichment),
      };
    },
    [],
  );

  // ============================================
  // INITIALIZATION
  // ============================================

  const initializeGame = useCallback(
    async (config: GameInitConfig) => {
      setIsLoading(true);
      latestPersistedRef.current = null;
      gameStartedAtRef.current = null;
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
        autoSaveTimeoutRef.current = null;
      }
      try {
        await clearCurrentGame();
      } catch (err) {
        console.warn(
          "[useGameState] Failed to clear stale currentGame before initialize:",
          err,
        );
      }

      // Clear all state from previous game (fix for stale data issue EXH-011)
      replaceFameEvents([]);
      setSubstitutionLog([]);
      setPitchCountPrompt(null);
      pitcherNamesRef.current.clear();
      teamSideByPlayerIdRef.current.clear();
      playerNameByIdRef.current.clear();
      inningPitchesRef.current = { pitches: 0, strikeouts: 0, pitcherId: "" };
      totalInningsRef.current = config.totalInnings || 9;
      extraInningRunnerRef.current = config.extraInningRunner ?? false;
      extraInningRunnerDelayRef.current = config.extraInningRunnerDelay ?? 1;
      setScoreboard(createEmptyScoreboardState(totalInningsRef.current));
      console.log("[R3-R5] Initialized scoreboard with regulation innings", {
        gameId: config.gameId,
        totalInnings: totalInningsRef.current,
      });

      // Store lineup refs
      awayLineupRef.current = config.awayLineup;
      homeLineupRef.current = config.homeLineup;
      optimalLineupSnapshotsRef.current = config.optimalLineupSnapshots;
      chosenLineupSnapshotsRef.current = config.chosenLineupSnapshots;
      seasonIdRef.current = config.seasonId || "";
      statsScopeIdRef.current = config.statsScopeId || config.seasonId || "";
      competitionTypeRef.current = config.competitionType;
      competitionIdRef.current = config.competitionId;
      competitionNameRef.current = config.competitionName;
      franchiseIdRef.current = config.franchiseId;
      scheduleGameIdRef.current = config.scheduleGameId;
      leagueIdRef.current = config.leagueId;
      syncRestoredCompetitionContext({
        seasonId: config.seasonId,
        statsScopeId: config.statsScopeId || config.seasonId,
        seasonNumber: config.seasonNumber,
        competitionType: config.competitionType,
        competitionId: config.competitionId,
        competitionName: config.competitionName,
        franchiseId: config.franchiseId,
        scheduleGameId: config.scheduleGameId,
        leagueId: config.leagueId,
      });
      awayRecordRef.current = config.awayRecord;
      homeRecordRef.current = config.homeRecord;
      // R3: Derive DH flags from whether lineup has a DH-position player
      awayUsesDhRef.current = config.awayLineup.some(p => p.position === "DH");
      homeUsesDhRef.current = config.homeLineup.some(p => p.position === "DH");

      // MAJ-09: Initialize full LineupState for substitution validation
      awayLineupStateRef.current = {
        lineup: config.awayLineup.map((p, idx) => ({
          playerId: p.playerId,
          playerName: p.playerName,
          position: p.position as Position,
          battingOrder: idx + 1,
          enteredInning: 1,
          isStarter: true,
        })),
        bench: (config.awayBench || []).map((b) => ({
          playerId: b.playerId,
          playerName: b.playerName,
          positions: b.positions as Position[],
          isAvailable: true,
        })),
        usedPlayers: [],
        currentPitcher: {
          playerId: config.awayStartingPitcherId,
          playerName: config.awayStartingPitcherName,
          position: "P" as Position,
          battingOrder:
            config.awayLineup.findIndex(
              (p) => p.playerId === config.awayStartingPitcherId,
            ) + 1 || 1,
          enteredInning: 1,
          isStarter: true,
        },
      };
      homeLineupStateRef.current = {
        lineup: config.homeLineup.map((p, idx) => ({
          playerId: p.playerId,
          playerName: p.playerName,
          position: p.position as Position,
          battingOrder: idx + 1,
          enteredInning: 1,
          isStarter: true,
        })),
        bench: (config.homeBench || []).map((b) => ({
          playerId: b.playerId,
          playerName: b.playerName,
          positions: b.positions as Position[],
          isAvailable: true,
        })),
        usedPlayers: [],
        currentPitcher: {
          playerId: config.homeStartingPitcherId,
          playerName: config.homeStartingPitcherName,
          position: "P" as Position,
          battingOrder:
            config.homeLineup.findIndex(
              (p) => p.playerId === config.homeStartingPitcherId,
            ) + 1 || 1,
          enteredInning: 1,
          isStarter: true,
        },
      };

      for (const player of config.awayLineup) {
        registerIdentityForSide(player.playerId, player.playerName, "away");
      }
      for (const player of config.homeLineup) {
        registerIdentityForSide(player.playerId, player.playerName, "home");
      }
      for (const player of config.awayBench || []) {
        registerIdentityForSide(player.playerId, player.playerName, "away");
      }
      for (const player of config.homeBench || []) {
        registerIdentityForSide(player.playerId, player.playerName, "home");
      }
      registerIdentityForSide(
        config.awayStartingPitcherId,
        config.awayStartingPitcherName,
        "away",
      );
      registerIdentityForSide(
        config.homeStartingPitcherId,
        config.homeStartingPitcherName,
        "home",
      );

      // Store playoff context if provided
      playoffSeriesIdRef.current = config.playoffSeriesId || null;
      playoffGameNumberRef.current = config.playoffGameNumber || null;
      playoffIdRef.current = config.playoffId || null;
      syncRestoredPlayoffContext({
        playoffSeriesId: config.playoffSeriesId || null,
        playoffGameNumber: config.playoffGameNumber || null,
        playoffId: config.playoffId || null,
        playoffRound: config.playoffRound,
        isEliminationGame: config.isEliminationGame,
        isClinchGame: config.isClinchGame,
      });

      // Create game header in IndexedDB
      await createGameHeader({
        gameId: config.gameId,
        seasonId: config.seasonId,
        statsScopeId: config.statsScopeId || config.seasonId,
        competitionType: config.competitionType,
        competitionId: config.competitionId,
        competitionName: config.competitionName,
        franchiseId: config.franchiseId,
        scheduleGameId: config.scheduleGameId,
        leagueId: config.leagueId,
        playoffSeriesId: config.playoffSeriesId,
        playoffGameNumber: config.playoffGameNumber,
        playoffId: config.playoffId,
        playoffRound: config.playoffRound,
        isEliminationGame: config.isEliminationGame,
        isClinchGame: config.isClinchGame,
        date: Date.now(),
        awayTeamId: config.awayTeamId,
        homeTeamId: config.homeTeamId,
        awayTeamName: config.awayTeamName,
        homeTeamName: config.homeTeamName,
        startingLineups: {
          away: config.awayLineup.map((player, idx) => ({
            playerId: player.playerId,
            playerName: player.playerName,
            position: player.position,
            battingOrder: idx + 1,
          })),
          home: config.homeLineup.map((player, idx) => ({
            playerId: player.playerId,
            playerName: player.playerName,
            position: player.position,
            battingOrder: idx + 1,
          })),
        },
        benchRosters: {
          away: config.awayBench || [],
          home: config.homeBench || [],
        },
        startingPitchers: {
          away: {
            playerId: config.awayStartingPitcherId,
            playerName: config.awayStartingPitcherName,
          },
          home: {
            playerId: config.homeStartingPitcherId,
            playerName: config.homeStartingPitcherName,
          },
        },
        optimalLineupSnapshots: config.optimalLineupSnapshots,
        chosenLineupSnapshots: config.chosenLineupSnapshots,
        finalScore: null,
        finalInning: totalInningsRef.current,
        totalInnings: totalInningsRef.current,
        extraInningRunner: extraInningRunnerRef.current,
        extraInningRunnerDelay: extraInningRunnerDelayRef.current,
        isComplete: false,
        liveBeatReporterEnabled:
          config.liveBeatReporterEnabled ??
          config.beatReporterEnabled ??
          false,
        postGameColumnsEnabled:
          config.postGameColumnsEnabled ??
          config.beatReporterEnabled ??
          true,
      });

      // Initialize player stats for all lineup players
      const initialPlayerStats = new Map<string, PlayerGameStats>();
      for (const player of [...config.awayLineup, ...config.homeLineup]) {
        initialPlayerStats.set(player.playerId, createEmptyPlayerStats());
      }
      setPlayerStats(initialPlayerStats);

      // Initialize pitcher stats and name mapping
      const initialPitcherStats = new Map<string, PitcherGameStats>();
      const awayStarter = createEmptyPitcherStats();
      awayStarter.isStarter = true;
      awayStarter.entryInning = 1;
      awayStarter.entryOuts = 0;
      const homeStarter = createEmptyPitcherStats();
      homeStarter.isStarter = true;
      homeStarter.entryInning = 1;
      homeStarter.entryOuts = 0;
      initialPitcherStats.set(config.awayStartingPitcherId, awayStarter);
      initialPitcherStats.set(config.homeStartingPitcherId, homeStarter);
      setPitcherStats(initialPitcherStats);

      // Track pitcher names for post-game summary (EXH-011 fix)
      pitcherNamesRef.current.set(
        config.awayStartingPitcherId,
        config.awayStartingPitcherName,
      );
      pitcherNamesRef.current.set(
        config.homeStartingPitcherId,
        config.homeStartingPitcherName,
      );

      // CRIT-02: Initialize runner tracker with home starting pitcher (they pitch first in top of 1st)
      runnerTrackerRef.current = createRunnerTrackingState(
        config.homeStartingPitcherId,
        config.homeStartingPitcherName,
      );

      // Two-toggle resolution (Phase 2a):
      //   - Prefer the new explicit config field.
      //   - Fall back to the legacy single-flag `beatReporterEnabled` for existing saves.
      //   - Fall back to the sessionStorage pending key (set by pre-game pages).
      //   - Final defaults: live OFF, post-game ON.
      const liveBeatReporterEnabled =
        config.liveBeatReporterEnabled ??
        config.beatReporterEnabled ??
        consumePendingLiveBeatReporterEnabled() ??
        false;
      const postGameColumnsEnabled =
        config.postGameColumnsEnabled ??
        config.beatReporterEnabled ??
        consumePendingPostGameColumnsEnabled() ??
        true;

      // Set initial game state
      const leadoffBatter = config.awayLineup[0];
      setGameState({
        gameId: config.gameId,
        homeScore: 0,
        awayScore: 0,
        inning: 1,
        isTop: true,
        outs: 0,
        balls: 0,
        strikes: 0,
        bases: { first: false, second: false, third: false },
        currentBatterId: leadoffBatter?.playerId || "",
        currentBatterName: leadoffBatter?.playerName || "",
        currentPitcherId: config.homeStartingPitcherId,
        currentPitcherName: config.homeStartingPitcherName,
        // UX-053: Auto-assign catcher from home lineup (home fields first in top of 1st)
        currentCatcherId:
          config.homeLineup.find((p) => p.position === "C")?.playerId || "",
        currentCatcherName:
          config.homeLineup.find((p) => p.position === "C")?.playerName || "",
        awayTeamId: config.awayTeamId,
        homeTeamId: config.homeTeamId,
        awayTeamName: config.awayTeamName,
        homeTeamName: config.homeTeamName,
        stadiumName: config.stadiumName || null,
        seasonId: config.seasonId,
        statsScopeId: config.statsScopeId || config.seasonId,
        seasonNumber: config.seasonNumber,
        gamePhase: "PRE_GAME",
        liveBeatReporterEnabled,
        postGameColumnsEnabled,
      });

      setAwayBatterIndex(0);
      setHomeBatterIndex(0);
      setAtBatSequence(0);
      setIsLoading(false);
    },
    [registerIdentityForSide],
  );

  const loadExistingGame = useCallback(
    async (options?: LoadExistingGameOptions): Promise<boolean> => {
      setIsLoading(true);
      latestPersistedRef.current = null;
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
        autoSaveTimeoutRef.current = null;
      }
      try {
        const targetGameId = initialGameId || gameState.gameId;
        if (!targetGameId) {
          setIsLoading(false);
          return false;
        }

        const header = await getGameHeader(targetGameId);
        let resolvedGameId = targetGameId;
        let inProgressGame = header && !header.isComplete ? header : null;
        const preferSnapshot = options?.preferSnapshot ?? true;

        // Primary rehydration path: restore exact in-progress snapshot from currentGame store.
        // This preserves non-at-bat runner movement + full scoreboard state across refresh.
        let savedSnapshot = null;
        if (preferSnapshot) {
          savedSnapshot = await loadCurrentGame();
          if (
            savedSnapshot &&
            savedSnapshot.gameId !== targetGameId &&
            !inProgressGame &&
            canResumeSnapshotForRoute(savedSnapshot, targetGameId)
          ) {
            const snapshotHeader = await getGameHeader(savedSnapshot.gameId);
            if (snapshotHeader && !snapshotHeader.isComplete) {
              resolvedGameId = savedSnapshot.gameId;
              inProgressGame = snapshotHeader;
            } else if (!snapshotHeader && hasUsableSnapshotPayload(savedSnapshot)) {
              const repairedHeaderDraft =
                buildGameHeaderDraftFromSnapshot(savedSnapshot);
              try {
                await createGameHeader(repairedHeaderDraft);
              } catch (err) {
                console.warn(
                  "[useGameState] Failed to repair missing game header from snapshot:",
                  err,
                );
              }
              resolvedGameId = savedSnapshot.gameId;
              inProgressGame = {
                ...repairedHeaderDraft,
                aggregated: false,
                aggregatedAt: null,
                aggregationError: null,
                eventCount: savedSnapshot.atBatCount ?? 0,
                checksum: "",
              };
            }
          }
          if (
            savedSnapshot &&
            savedSnapshot.gameId === resolvedGameId &&
            !header &&
            !inProgressGame &&
            hasUsableSnapshotPayload(savedSnapshot)
          ) {
            const repairedHeaderDraft =
              buildGameHeaderDraftFromSnapshot(savedSnapshot);
            try {
              await createGameHeader(repairedHeaderDraft);
            } catch (err) {
              console.warn(
                "[useGameState] Failed to repair missing game header from snapshot:",
                err,
              );
            }
            inProgressGame = {
              ...repairedHeaderDraft,
              aggregated: false,
              aggregatedAt: null,
              aggregationError: null,
              eventCount: savedSnapshot.atBatCount ?? 0,
              checksum: "",
            };
          }
          if (
            savedSnapshot &&
            savedSnapshot.gameId === resolvedGameId &&
            savedSnapshot.gamePhase === "PRE_GAME" &&
            inProgressGame
          ) {
            const headerShowsDurableActivity =
              typeof inProgressGame.eventCount === "number" &&
              inProgressGame.eventCount > 0;
            const betweenPlayEvents = headerShowsDurableActivity
              ? []
              : await getBetweenPlayEvents(resolvedGameId);
            const hasDurableActivity =
              headerShowsDurableActivity || betweenPlayEvents.length > 0;
            if (hasDurableActivity) {
              console.warn(
                "[useGameState] Ignoring stale PRE_GAME snapshot in favor of durable replay:",
                {
                  gameId: resolvedGameId,
                  eventCount: inProgressGame.eventCount ?? 0,
                  betweenPlayEvents: betweenPlayEvents.length,
                },
              );
              savedSnapshot = null;
              try {
                await clearCurrentGame();
              } catch (err) {
                console.warn(
                  "[useGameState] Failed to clear stale PRE_GAME snapshot:",
                  err,
                );
              }
            }
          }
          if (
            savedSnapshot &&
            (savedSnapshot.gameId !== resolvedGameId || !inProgressGame)
          ) {
            try {
              await clearCurrentGame();
            } catch (err) {
              console.warn(
                "[useGameState] Failed to clear stale currentGame snapshot:",
                err,
              );
            }
          }
        } else {
          try {
            await clearCurrentGame();
          } catch (err) {
            console.warn(
              "[useGameState] Failed to clear currentGame snapshot before durable replay:",
              err,
            );
          }
        }
        const hasUsableLiveSnapshot = hasUsableSnapshotPayload(savedSnapshot);
        if (
          savedSnapshot &&
          savedSnapshot.gameId === resolvedGameId &&
          hasUsableLiveSnapshot &&
          inProgressGame
        ) {
          const snapshotBetweenPlayEvents = await getBetweenPlayEvents(
            resolvedGameId,
          );
          const restoredTotalInnings =
            savedSnapshot.totalInnings ??
            inProgressGame.totalInnings ??
            9;
          const restoredExtraInningRunner =
            savedSnapshot.extraInningRunner ??
            inProgressGame.extraInningRunner ??
            false;
          const restoredExtraInningRunnerDelay =
            savedSnapshot.extraInningRunnerDelay ??
            inProgressGame.extraInningRunnerDelay ??
            1;
          const emptyBoard = createEmptyScoreboardState(
            restoredTotalInnings,
          );
          const snapshotBoard = savedSnapshot.scoreboard;
          const normalizedScoreboard: ScoreboardState = {
            innings:
              Array.isArray(snapshotBoard?.innings) &&
              snapshotBoard!.innings.length > 0
                ? snapshotBoard!.innings.map((inn) => ({
                    away: inn?.away,
                    home: inn?.home,
                  }))
                : emptyBoard.innings,
            away: {
              runs: snapshotBoard?.away?.runs ?? savedSnapshot.awayScore ?? 0,
              hits: snapshotBoard?.away?.hits ?? 0,
              errors: snapshotBoard?.away?.errors ?? 0,
            },
            home: {
              runs: snapshotBoard?.home?.runs ?? savedSnapshot.homeScore ?? 0,
              hits: snapshotBoard?.home?.hits ?? 0,
              errors: snapshotBoard?.home?.errors ?? 0,
            },
          };
          setScoreboard(normalizedScoreboard);

          if (savedSnapshot.awayLineup?.length) {
            awayLineupRef.current = savedSnapshot.awayLineup;
          }
          if (savedSnapshot.homeLineup?.length) {
            homeLineupRef.current = savedSnapshot.homeLineup;
          }
          if (savedSnapshot.awayLineupState) {
            awayLineupStateRef.current =
              savedSnapshot.awayLineupState as LineupState;
          }
          if (savedSnapshot.homeLineupState) {
            homeLineupStateRef.current =
              savedSnapshot.homeLineupState as LineupState;
          }
          optimalLineupSnapshotsRef.current =
            savedSnapshot.optimalLineupSnapshots;
          chosenLineupSnapshotsRef.current = savedSnapshot.chosenLineupSnapshots;
          teamSideByPlayerIdRef.current.clear();
          playerNameByIdRef.current.clear();
          seasonIdRef.current = savedSnapshot.seasonId || "";
          statsScopeIdRef.current =
            savedSnapshot.statsScopeId || savedSnapshot.seasonId || "";
          competitionTypeRef.current = savedSnapshot.competitionType;
          competitionIdRef.current = savedSnapshot.competitionId;
          competitionNameRef.current = savedSnapshot.competitionName;
          playoffSeriesIdRef.current = savedSnapshot.playoffSeriesId || null;
          playoffGameNumberRef.current =
            savedSnapshot.playoffGameNumber ?? null;
          playoffIdRef.current = savedSnapshot.playoffId || null;
          syncRestoredPlayoffContext({
            playoffSeriesId: savedSnapshot.playoffSeriesId || null,
            playoffGameNumber: savedSnapshot.playoffGameNumber ?? null,
            playoffId: savedSnapshot.playoffId || null,
            playoffRound: savedSnapshot.playoffRound,
            isEliminationGame: savedSnapshot.isEliminationGame,
            isClinchGame: savedSnapshot.isClinchGame,
          });
          // R3-R7: Restore leagueId for almanac queries
          leagueIdRef.current = savedSnapshot.leagueId;
          // R3: Restore game config refs from snapshot
          totalInningsRef.current = restoredTotalInnings;
          if (savedSnapshot.awayUsesDh != null) {
            awayUsesDhRef.current = savedSnapshot.awayUsesDh;
          }
          if (savedSnapshot.homeUsesDh != null) {
            homeUsesDhRef.current = savedSnapshot.homeUsesDh;
          }
          // R3-T0: Restore extra-inning runner config from snapshot
          extraInningRunnerRef.current = restoredExtraInningRunner;
          extraInningRunnerDelayRef.current = restoredExtraInningRunnerDelay;
          // R3-T0: Restore team colors from snapshot
          if (savedSnapshot.awayTeamColor) {
            teamColorsRef.current.awayTeamColor = savedSnapshot.awayTeamColor;
            teamColorsRef.current.awayTeamBorderColor = savedSnapshot.awayTeamBorderColor;
            teamColorsRef.current.homeTeamColor = savedSnapshot.homeTeamColor;
            teamColorsRef.current.homeTeamBorderColor = savedSnapshot.homeTeamBorderColor;
          }
          // R3-T0: Restore game start timestamp
          if (savedSnapshot.gameStartTimestamp) {
            gameStartTimestampRef.current = savedSnapshot.gameStartTimestamp;
          }
          gameStartedAtRef.current =
            savedSnapshot.gameStartedAt ??
            (savedSnapshot.gamePhase && savedSnapshot.gamePhase !== "PRE_GAME"
              ? (savedSnapshot.savedAt ?? Date.now())
              : null);
          console.log("[R3-T0] Restored persisted metadata from snapshot", {
            awayTeamColor: teamColorsRef.current.awayTeamColor ?? null,
            homeTeamColor: teamColorsRef.current.homeTeamColor ?? null,
            gameStartTimestamp: gameStartTimestampRef.current ?? null,
          });
          // R3-T0: Restore mojo/fitness for GameTracker to re-register with playerStateHook
          setRestoredMojoFitness(
            mergePlayerMojoFitnessState(
              savedSnapshot.playerMojoFitness ?? null,
              snapshotBetweenPlayEvents,
            ),
          );
          // Layer 1B: Restore identity refs from snapshot (if available)
          const snapshotAny = savedSnapshot as unknown as Record<
            string,
            unknown
          >;
          franchiseIdRef.current =
            typeof snapshotAny.franchiseId === "string"
              ? snapshotAny.franchiseId
              : undefined;
          scheduleGameIdRef.current =
            typeof snapshotAny.scheduleGameId === "string"
              ? snapshotAny.scheduleGameId
              : undefined;
          leagueIdRef.current =
            typeof snapshotAny.leagueId === "string"
              ? snapshotAny.leagueId
              : undefined;
          syncRestoredCompetitionContext({
            seasonId: seasonIdRef.current || undefined,
            statsScopeId:
              statsScopeIdRef.current || seasonIdRef.current || undefined,
            seasonNumber: savedSnapshot.seasonNumber,
            competitionType: competitionTypeRef.current,
            competitionId: competitionIdRef.current,
            competitionName: competitionNameRef.current,
            franchiseId: franchiseIdRef.current,
            scheduleGameId: scheduleGameIdRef.current,
            leagueId: leagueIdRef.current,
          });

          const restoredPlayerStats = new Map<string, PlayerGameStats>();
          for (const [playerId, stats] of Object.entries(
            savedSnapshot.playerStats || {},
          )) {
            restoredPlayerStats.set(playerId, {
              pa: stats.pa ?? 0,
              ab: stats.ab ?? 0,
              h: stats.h ?? 0,
              singles: stats.singles ?? 0,
              doubles: stats.doubles ?? 0,
              triples: stats.triples ?? 0,
              hr: stats.hr ?? 0,
              r: stats.r ?? 0,
              rbi: stats.rbi ?? 0,
              bb: stats.bb ?? 0,
              hbp: stats.hbp ?? 0,
              k: stats.k ?? 0,
              sb: stats.sb ?? 0,
              cs: stats.cs ?? 0,
              sf: stats.sf ?? 0,
              sh: stats.sh ?? 0,
              gidp: stats.gidp ?? 0,
              grandSlams: stats.grandSlams ?? 0,
              putouts: stats.putouts ?? 0,
              assists: stats.assists ?? 0,
              fieldingErrors: stats.fieldingErrors ?? 0,
            });
          }
          setPlayerStats(restoredPlayerStats);

          const restoredPitcherStats = new Map<string, PitcherGameStats>();
          for (const p of savedSnapshot.pitcherGameStats || []) {
            restoredPitcherStats.set(p.pitcherId, {
              outsRecorded: p.outsRecorded ?? 0,
              hitsAllowed: p.hitsAllowed ?? 0,
              runsAllowed: p.runsAllowed ?? 0,
              earnedRuns: p.earnedRuns ?? 0,
              walksAllowed: p.walksAllowed ?? 0,
              strikeoutsThrown: p.strikeoutsThrown ?? 0,
              homeRunsAllowed: p.homeRunsAllowed ?? 0,
              pitchCount: p.pitchCount ?? 0,
              battersFaced: p.battersFaced ?? 0,
              intentionalWalks: 0,
              hitByPitch: p.hitBatters ?? 0,
              wildPitches: p.wildPitches ?? 0,
              basesLoadedWalks: p.basesLoadedWalks ?? 0,
              firstInningRuns: p.firstInningRuns ?? 0,
              consecutiveHRsAllowed: p.consecutiveHRsAllowed ?? 0,
              isStarter: p.isStarter ?? false,
              entryInning: p.entryInning ?? 1,
              entryOuts: 0,
              exitInning: null,
              exitOuts: null,
              finishedGame: false,
              inheritedRunners: 0,
              inheritedRunnersScored: 0,
              bequeathedRunners: 0,
              bequeathedRunnersScored: 0,
              decision: p.decision ?? null,
              save: p.save ?? false,
              hold: p.hold ?? false,
              blownSave: p.blownSave ?? false,
            });
          }
          setPitcherStats(restoredPitcherStats);

          replaceFameEvents(
            (savedSnapshot.fameEvents || []).map((fe) => ({
              eventType: fe.eventType,
              fameType: fe.fameType,
              fameValue: fe.fameValue,
              playerId: fe.playerId,
              playerName: fe.playerName,
              description: fe.description || fe.eventType,
            })),
          );
          if (savedSnapshot.substitutionLog) {
            setSubstitutionLog(
              savedSnapshot.substitutionLog as typeof substitutionLog,
            );
          }

          if (savedSnapshot.pitcherNamesEntries) {
            pitcherNamesRef.current = new Map(
              savedSnapshot.pitcherNamesEntries,
            );
          } else {
            const rebuiltPitcherNames = new Map<string, string>();
            for (const p of savedSnapshot.pitcherGameStats || []) {
              rebuiltPitcherNames.set(p.pitcherId, p.pitcherName);
            }
            pitcherNamesRef.current = rebuiltPitcherNames;
          }

          const playerNameById = new Map<string, string>();
          const registerPlayerName = (
            playerId?: string,
            playerName?: string,
            teamSide?: TeamSide,
          ) => {
            if (!playerId || !playerName) return;
            playerNameById.set(playerId, playerName);
            playerNameByIdRef.current.set(playerId, playerName);
            if (teamSide) {
              teamSideByPlayerIdRef.current.set(playerId, teamSide);
            }
          };

          for (const player of savedSnapshot.awayLineup || []) {
            registerPlayerName(player.playerId, player.playerName, "away");
          }
          for (const player of savedSnapshot.homeLineup || []) {
            registerPlayerName(player.playerId, player.playerName, "home");
          }
          for (const player of savedSnapshot.awayLineupState?.lineup || []) {
            registerPlayerName(player.playerId, player.playerName, "away");
          }
          for (const player of savedSnapshot.homeLineupState?.lineup || []) {
            registerPlayerName(player.playerId, player.playerName, "home");
          }
          for (const player of savedSnapshot.awayLineupState?.bench || []) {
            registerPlayerName(player.playerId, player.playerName, "away");
          }
          for (const player of savedSnapshot.homeLineupState?.bench || []) {
            registerPlayerName(player.playerId, player.playerName, "home");
          }
          registerPlayerName(
            savedSnapshot.awayLineupState?.currentPitcher?.playerId,
            savedSnapshot.awayLineupState?.currentPitcher?.playerName,
            "away",
          );
          registerPlayerName(
            savedSnapshot.homeLineupState?.currentPitcher?.playerId,
            savedSnapshot.homeLineupState?.currentPitcher?.playerName,
            "home",
          );
          for (const [playerId, stats] of Object.entries(
            savedSnapshot.playerStats || {},
          )) {
            const teamSide =
              stats.teamId === savedSnapshot.awayTeamId ? "away" : "home";
            registerPlayerName(playerId, stats.playerName, teamSide);
          }
          for (const pitcher of savedSnapshot.pitcherGameStats || []) {
            const teamSide =
              pitcher.teamId === savedSnapshot.awayTeamId ? "away" : "home";
            registerPlayerName(
              pitcher.pitcherId,
              pitcher.pitcherName,
              teamSide,
            );
          }

          const snapshotPitcherId =
            savedSnapshot.currentPitcherId ||
            savedSnapshot.runnerTrackerSnapshot?.currentPitcherId ||
            "";
          const snapshotPitcherName =
            savedSnapshot.currentPitcherName ||
            savedSnapshot.runnerTrackerSnapshot?.currentPitcherName ||
            playerNameById.get(snapshotPitcherId) ||
            pitcherNamesRef.current.get(snapshotPitcherId) ||
            "";
          const snapshotBatterId = savedSnapshot.currentBatterId ?? "";
          const snapshotBatterName =
            savedSnapshot.currentBatterName ||
            playerNameById.get(snapshotBatterId) ||
            "";

          if (savedSnapshot.runnerTrackerSnapshot) {
            runnerTrackerRef.current = {
              runners: savedSnapshot.runnerTrackerSnapshot.runners.map(
                (runner) => ({
                  ...runner,
                  runnerName:
                    runner.runnerName ||
                    playerNameById.get(runner.runnerId) ||
                    runner.runnerId,
                  responsiblePitcherName:
                    runner.responsiblePitcherName ||
                    playerNameById.get(runner.responsiblePitcherId) ||
                    runner.responsiblePitcherId,
                }),
              ) as RunnerTrackingState["runners"],
              currentPitcherId:
                savedSnapshot.runnerTrackerSnapshot.currentPitcherId,
              currentPitcherName:
                savedSnapshot.runnerTrackerSnapshot.currentPitcherName ||
                snapshotPitcherName,
              pitcherStats: new Map(
                savedSnapshot.runnerTrackerSnapshot.pitcherStatsEntries as [
                  string,
                  PitcherRunnerStats,
                ][],
              ),
              inning: savedSnapshot.runnerTrackerSnapshot.inning,
              atBatNumber: savedSnapshot.runnerTrackerSnapshot.atBatNumber,
            };
          } else {
            const rebuiltTracker = createRunnerTrackingState(
              snapshotPitcherId,
              snapshotPitcherName,
            );
            rebuiltTracker.inning = savedSnapshot.inning ?? 1;
            rebuiltTracker.atBatNumber = (savedSnapshot.atBatCount ?? 0) + 1;
            const addTrackedRunner = (
              base: "1B" | "2B" | "3B",
              info: PersistedGameState["bases"]["first"],
            ) => {
              if (!info) return;
              const responsiblePitcherId =
                info.inheritedFrom || snapshotPitcherId;
              const isInherited = responsiblePitcherId !== snapshotPitcherId;
              const runner = {
                runnerId: info.playerId,
                runnerName: info.playerName,
                currentBase: base,
                startingBase: base,
                howReached: "hit" as const,
                responsiblePitcherId,
                responsiblePitcherName: responsiblePitcherId,
                isInherited,
                inheritedFromPitcherId: isInherited
                  ? responsiblePitcherId
                  : null,
                inningReached: rebuiltTracker.inning,
                atBatReached: Math.max(1, rebuiltTracker.atBatNumber - 1),
              };
              rebuiltTracker.runners.push(runner);
            };
            addTrackedRunner("1B", savedSnapshot.bases.first);
            addTrackedRunner("2B", savedSnapshot.bases.second);
            addTrackedRunner("3B", savedSnapshot.bases.third);
            runnerTrackerRef.current = rebuiltTracker;
          }
          setRunnerIdentityVersion((v) => v + 1);

          setAwayBatterIndex(
            savedSnapshot.awayBatterIndex ??
              (savedSnapshot.halfInning === "TOP"
                ? (savedSnapshot.currentBatterIndex ?? 0)
                : 0),
          );
          setHomeBatterIndex(
            savedSnapshot.homeBatterIndex ??
              (savedSnapshot.halfInning === "BOTTOM"
                ? (savedSnapshot.currentBatterIndex ?? 0)
                : 0),
          );
          setAtBatSequence(savedSnapshot.atBatCount ?? 0);
          inningPitchesRef.current = savedSnapshot.currentInningPitches || {
            pitches: 0,
            strikeouts: 0,
            pitcherId: "",
          };

          const savedGamePhase =
            savedSnapshot.gamePhase === "PRE_GAME" ||
            savedSnapshot.gamePhase === "LIVE" ||
            savedSnapshot.gamePhase === "POST_FINAL_OUT"
              ? savedSnapshot.gamePhase
              : undefined;
          const restoredGamePhase =
            savedGamePhase === "PRE_GAME" &&
            (savedSnapshot.gameStartedAt != null ||
              wasGameStartedForRefresh(savedSnapshot.gameId))
              ? "LIVE"
              : (savedGamePhase ?? "LIVE");

          setGameState({
            gameId: savedSnapshot.gameId,
            homeScore: savedSnapshot.homeScore ?? 0,
            awayScore: savedSnapshot.awayScore ?? 0,
            inning: savedSnapshot.inning ?? 1,
            isTop: (savedSnapshot.halfInning ?? "TOP") === "TOP",
            outs: savedSnapshot.outs ?? 0,
            balls: 0,
            strikes: 0,
            bases: {
              first: !!savedSnapshot.bases.first,
              second: !!savedSnapshot.bases.second,
              third: !!savedSnapshot.bases.third,
            },
            currentBatterId: snapshotBatterId,
            currentBatterName: snapshotBatterName,
            currentPitcherId: snapshotPitcherId,
            currentPitcherName: snapshotPitcherName,
            // UX-053: Recover catcher from snapshot or infer from fielding team lineup
            currentCatcherId:
              (savedSnapshot as unknown as Record<string, string>)
                .currentCatcherId || "",
            currentCatcherName:
              (savedSnapshot as unknown as Record<string, string>)
                .currentCatcherName || "",
            awayTeamId: savedSnapshot.awayTeamId,
            homeTeamId: savedSnapshot.homeTeamId,
            awayTeamName: savedSnapshot.awayTeamName,
            homeTeamName: savedSnapshot.homeTeamName,
            stadiumName: savedSnapshot.stadiumName ?? null,
            seasonId: savedSnapshot.seasonId,
            statsScopeId: savedSnapshot.statsScopeId || savedSnapshot.seasonId,
            seasonNumber: savedSnapshot.seasonNumber ?? 1,
            gamePhase: restoredGamePhase,
            // Backward compat: legacy saves had a single `beatReporterEnabled`;
            // map both new fields to it so the resumed game preserves prior
            // behavior. New saves will have both fields explicitly.
            liveBeatReporterEnabled:
              savedSnapshot.liveBeatReporterEnabled ??
              savedSnapshot.beatReporterEnabled ??
              true,
            postGameColumnsEnabled:
              savedSnapshot.postGameColumnsEnabled ??
              savedSnapshot.beatReporterEnabled ??
              true,
          });

          latestPersistedRef.current = savedSnapshot;
          setLastSavedAt(savedSnapshot.savedAt ?? Date.now());
          setIsLoading(false);
          return true;
        }

        if (inProgressGame) {
          totalInningsRef.current = inProgressGame.totalInnings ?? 9;
          extraInningRunnerRef.current =
            inProgressGame.extraInningRunner ?? false;
          extraInningRunnerDelayRef.current =
            inProgressGame.extraInningRunnerDelay ?? 1;

          // Reconstruct from durable logs when live snapshot is unavailable.
          const events = await getGameEvents(inProgressGame.gameId);
          const betweenPlayEvents = await getBetweenPlayEvents(
            inProgressGame.gameId,
          );
          setRestoredMojoFitness(
            mergePlayerMojoFitnessState(null, betweenPlayEvents),
          );
          const lastEvent =
            events.length > 0 ? events[events.length - 1] : null;
          const tailBetweenPlayEvents = betweenPlayEvents.filter((event) =>
            lastEvent ? event.eventIndex > lastEvent.eventIndex : true,
          );
          const reconstructedSubstitutionLog =
            mapBetweenPlayEventsToSubstitutionLog(betweenPlayEvents);
          setSubstitutionLog(reconstructedSubstitutionLog);

          teamSideByPlayerIdRef.current.clear();
          playerNameByIdRef.current.clear();
          seasonIdRef.current = inProgressGame.seasonId || "";
          statsScopeIdRef.current =
            inProgressGame.statsScopeId || inProgressGame.seasonId || "";
          competitionTypeRef.current = inProgressGame.competitionType;
          competitionIdRef.current = inProgressGame.competitionId;
          competitionNameRef.current = inProgressGame.competitionName;
          franchiseIdRef.current = inProgressGame.franchiseId;
          scheduleGameIdRef.current = inProgressGame.scheduleGameId;
          leagueIdRef.current = inProgressGame.leagueId;
          syncRestoredCompetitionContext({
            seasonId: seasonIdRef.current || undefined,
            statsScopeId:
              statsScopeIdRef.current || seasonIdRef.current || undefined,
            seasonNumber: getFallbackSeasonNumber(
              inProgressGame.statsScopeId ?? inProgressGame.seasonId,
              undefined,
            ),
            competitionType: competitionTypeRef.current,
            competitionId: competitionIdRef.current,
            competitionName: competitionNameRef.current,
            franchiseId: franchiseIdRef.current,
            scheduleGameId: scheduleGameIdRef.current,
            leagueId: leagueIdRef.current,
          });
          playoffSeriesIdRef.current = inProgressGame.playoffSeriesId || null;
          playoffGameNumberRef.current =
            inProgressGame.playoffGameNumber ?? null;
          playoffIdRef.current = inProgressGame.playoffId || null;
          syncRestoredPlayoffContext({
            playoffSeriesId: inProgressGame.playoffSeriesId || null,
            playoffGameNumber: inProgressGame.playoffGameNumber ?? null,
            playoffId: inProgressGame.playoffId || null,
            playoffRound: inProgressGame.playoffRound,
            isEliminationGame: inProgressGame.isEliminationGame,
            isClinchGame: inProgressGame.isClinchGame,
          });

          if (inProgressGame.startingLineups) {
            seedLineupStateFromHeader(inProgressGame);
          }

          for (const event of events) {
            registerTrackedIdentity(
              teamSideByPlayerIdRef.current,
              playerNameByIdRef.current,
              event.batterId,
              event.batterName,
              event.batterTeamId === inProgressGame.awayTeamId
                ? "away"
                : "home",
            );
            registerTrackedIdentity(
              teamSideByPlayerIdRef.current,
              playerNameByIdRef.current,
              event.pitcherId,
              event.pitcherName,
              event.pitcherTeamId === inProgressGame.awayTeamId
                ? "away"
                : "home",
            );
            for (const runner of [
              event.runners.first,
              event.runners.second,
              event.runners.third,
              event.runnersAfter.first,
              event.runnersAfter.second,
              event.runnersAfter.third,
            ]) {
              if (!runner) continue;
              registerTrackedIdentity(
                teamSideByPlayerIdRef.current,
                playerNameByIdRef.current,
                runner.runnerId,
                runner.runnerName,
                resolveActualTeamId(
                  runner.runnerId,
                  teamSideByPlayerIdRef.current,
                  awayLineupRef.current,
                  homeLineupRef.current,
                  awayLineupStateRef.current,
                  homeLineupStateRef.current,
                  inProgressGame.awayTeamId,
                  inProgressGame.homeTeamId,
                ) === inProgressGame.awayTeamId
                  ? "away"
                  : "home",
              );
            }
          }
          for (const event of betweenPlayEvents) {
            if (event.stolenBase?.runnerId) {
              registerTrackedIdentity(
                teamSideByPlayerIdRef.current,
                playerNameByIdRef.current,
                event.stolenBase.runnerId,
                event.stolenBase.runnerName,
                resolveActualTeamId(
                  event.stolenBase.runnerId,
                  teamSideByPlayerIdRef.current,
                  awayLineupRef.current,
                  homeLineupRef.current,
                  awayLineupStateRef.current,
                  homeLineupStateRef.current,
                  inProgressGame.awayTeamId,
                  inProgressGame.homeTeamId,
                ) === inProgressGame.awayTeamId
                  ? "away"
                  : "home",
              );
            }
            if (event.substitution?.outPlayerId) {
              registerTrackedIdentity(
                teamSideByPlayerIdRef.current,
                playerNameByIdRef.current,
                event.substitution.outPlayerId,
                event.substitution.outPlayerName,
                resolveActualTeamId(
                  event.substitution.outPlayerId,
                  teamSideByPlayerIdRef.current,
                  awayLineupRef.current,
                  homeLineupRef.current,
                  awayLineupStateRef.current,
                  homeLineupStateRef.current,
                  inProgressGame.awayTeamId,
                  inProgressGame.homeTeamId,
                ) === inProgressGame.awayTeamId
                  ? "away"
                  : "home",
              );
            }
            if (event.substitution?.inPlayerId) {
              registerTrackedIdentity(
                teamSideByPlayerIdRef.current,
                playerNameByIdRef.current,
                event.substitution.inPlayerId,
                event.substitution.inPlayerName,
                resolveActualTeamId(
                  event.substitution.inPlayerId,
                  teamSideByPlayerIdRef.current,
                  awayLineupRef.current,
                  homeLineupRef.current,
                  awayLineupStateRef.current,
                  homeLineupStateRef.current,
                  inProgressGame.awayTeamId,
                  inProgressGame.homeTeamId,
                ) === inProgressGame.awayTeamId
                  ? "away"
                  : "home",
              );
            }
            if (event.pitcherChange?.outgoingPitcherId) {
              registerTrackedIdentity(
                teamSideByPlayerIdRef.current,
                playerNameByIdRef.current,
                event.pitcherChange.outgoingPitcherId,
                event.pitcherChange.outgoingPitcherName,
                event.gameState?.halfInning === "TOP" ? "home" : "away",
              );
            }
            if (event.pitcherChange?.incomingPitcherId) {
              registerTrackedIdentity(
                teamSideByPlayerIdRef.current,
                playerNameByIdRef.current,
                event.pitcherChange.incomingPitcherId,
                event.pitcherChange.incomingPitcherName,
                event.gameState?.halfInning === "TOP" ? "home" : "away",
              );
            }
          }

          for (const event of betweenPlayEvents) {
            replayRosterChangeEvent(event);
          }

          // Rehydrate pitcher stats as a Map keyed by pitcherId (never as array).
          const rehydratedPitcherStats = new Map<string, PitcherGameStats>();
          const getOrCreatePitcher = (pitcherId: string): PitcherGameStats => {
            const existing = rehydratedPitcherStats.get(pitcherId);
            if (existing) return existing;
            const created = createEmptyPitcherStats();
            rehydratedPitcherStats.set(pitcherId, created);
            return created;
          };

          for (const event of events) {
            const stats = getOrCreatePitcher(event.pitcherId);
            stats.battersFaced += 1;

            // Approximate outs on play from before/after context.
            const outsOnPlay =
              event.outsAfter >= event.outs
                ? event.outsAfter - event.outs
                : event.outsAfter === 0
                  ? 3 - event.outs
                  : 0;
            if (outsOnPlay > 0) {
              stats.outsRecorded += outsOnPlay;
            }

            if (["1B", "2B", "3B", "HR", "ITPHR", "GRD"].includes(event.result)) {
              stats.hitsAllowed += 1;
            }
            if (event.result === "HR" || event.result === "ITPHR") {
              stats.homeRunsAllowed += 1;
              stats.consecutiveHRsAllowed += 1;
            } else {
              stats.consecutiveHRsAllowed = 0;
            }
            if (["K", "Kc", "D3K", "WP_K", "PB_K"].includes(event.result)) {
              stats.strikeoutsThrown += 1;
            }
            if (event.result === "WP_K") {
              stats.wildPitches += 1;
            }
            if (event.result === "BB") {
              stats.walksAllowed += 1;
            }
            if (event.result === "HBP") {
              stats.hitByPitch += 1;
            }
            if (event.result === "IBB") {
              stats.intentionalWalks += 1;
            }

            const runsAllowedOnPlay =
              event.pitcherTeamId === inProgressGame.homeTeamId
                ? Math.max(0, event.awayScoreAfter - event.awayScore)
                : Math.max(0, event.homeScoreAfter - event.homeScore);
            stats.runsAllowed += runsAllowedOnPlay;
          }

          if (lastEvent && !rehydratedPitcherStats.has(lastEvent.pitcherId)) {
            rehydratedPitcherStats.set(
              lastEvent.pitcherId,
              createEmptyPitcherStats(),
            );
          }
          setPitcherStats(rehydratedPitcherStats);

          // Rebuild scoreboard from event log so inning-by-inning line score is preserved.
          const rebuiltInnings: ScoreboardState["innings"] = Array(
            totalInningsRef.current,
          )
            .fill(null)
            .map(() => ({
              away: undefined,
              home: undefined,
            }));
          let awayHits = 0;
          let homeHits = 0;
          let awayErrors = 0;
          let homeErrors = 0;

          for (const event of events) {
            const inningIdx = Math.max(0, event.inning - 1);
            while (rebuiltInnings.length <= inningIdx) {
              rebuiltInnings.push({ away: undefined, home: undefined });
            }

            const awayRunsOnPlay = Math.max(
              0,
              event.awayScoreAfter - event.awayScore,
            );
            const homeRunsOnPlay = Math.max(
              0,
              event.homeScoreAfter - event.homeScore,
            );
            if (awayRunsOnPlay > 0) {
              rebuiltInnings[inningIdx].away =
                (rebuiltInnings[inningIdx].away ?? 0) + awayRunsOnPlay;
            }
            if (homeRunsOnPlay > 0) {
              rebuiltInnings[inningIdx].home =
                (rebuiltInnings[inningIdx].home ?? 0) + homeRunsOnPlay;
            }

            if (["1B", "2B", "3B", "HR", "ITPHR", "GRD"].includes(event.result)) {
              if (event.halfInning === "TOP") awayHits += 1;
              else homeHits += 1;
            }
            if (
              event.result === "E" ||
              event.result === "WP_K" ||
              event.result === "PB_K"
            ) {
              if (event.halfInning === "TOP") homeErrors += 1;
              else awayErrors += 1;
            }
          }

          setScoreboard({
            innings: rebuiltInnings,
            away: {
              runs: lastEvent?.awayScoreAfter ?? 0,
              hits: awayHits,
              errors: awayErrors,
            },
            home: {
              runs: lastEvent?.homeScoreAfter ?? 0,
              hits: homeHits,
              errors: homeErrors,
            },
          });

          // Rebuild runner tracker from last known runners-after state so base identities
          // (used by runnerNames/UI) survive refresh.
          const trackerPitcherFallback =
            (lastEvent?.halfInning ?? "TOP") === "TOP"
              ? homeLineupStateRef.current.currentPitcher
              : awayLineupStateRef.current.currentPitcher;
          const trackerPitcherId =
            lastEvent?.pitcherId ?? trackerPitcherFallback?.playerId ?? "";
          const trackerPitcherName =
            lastEvent?.pitcherName ?? trackerPitcherFallback?.playerName ?? "";
          let rebuiltTracker = createRunnerTrackingState(
            trackerPitcherId,
            trackerPitcherName,
          );
          rebuiltTracker.inning = lastEvent?.inning ?? 1;
          rebuiltTracker.atBatNumber = events.length + 1;

          const addTrackedRunner = (
            base: "1B" | "2B" | "3B",
            info:
              | RunnerState["first"]
              | RunnerState["second"]
              | RunnerState["third"],
          ) => {
            if (!info) return;
            const responsiblePitcherId =
              info.responsiblePitcherId || trackerPitcherId;
            const isInherited = responsiblePitcherId !== trackerPitcherId;
            const runner = {
              runnerId: info.runnerId,
              runnerName: info.runnerName,
              currentBase: base,
              startingBase: base,
              howReached: "hit" as const,
              responsiblePitcherId,
              responsiblePitcherName: responsiblePitcherId,
              isInherited,
              inheritedFromPitcherId: isInherited ? responsiblePitcherId : null,
              inningReached: rebuiltTracker.inning,
              atBatReached: Math.max(1, rebuiltTracker.atBatNumber - 1),
            };
            rebuiltTracker.runners.push(runner);

            const stats = rebuiltTracker.pitcherStats.get(
              responsiblePitcherId,
            ) || {
              pitcherId: responsiblePitcherId,
              pitcherName: responsiblePitcherId,
              runnersOnBase: [],
              runnersScored: [],
              inheritedRunners: [],
              inheritedRunnersScored: [],
              bequeathedRunnerCount: 0,
            };
            stats.runnersOnBase.push(runner);
            rebuiltTracker.pitcherStats.set(responsiblePitcherId, stats);
          };

          addTrackedRunner("1B", lastEvent?.runnersAfter.first ?? null);
          addTrackedRunner("2B", lastEvent?.runnersAfter.second ?? null);
          addTrackedRunner("3B", lastEvent?.runnersAfter.third ?? null);

          let recoveredHomeScore = lastEvent?.homeScoreAfter ?? 0;
          let recoveredAwayScore = lastEvent?.awayScoreAfter ?? 0;
          const endedHalfOnLastAtBat = !!lastEvent && lastEvent.outsAfter >= 3;
          let recoveredOuts = endedHalfOnLastAtBat
            ? 0
            : (lastEvent?.outsAfter ?? 0);
          let recoveredInning = endedHalfOnLastAtBat
            ? lastEvent?.halfInning === "BOTTOM"
              ? (lastEvent?.inning ?? 1) + 1
              : (lastEvent?.inning ?? 1)
            : (lastEvent?.inning ?? 1);
          let recoveredIsTop = endedHalfOnLastAtBat
            ? lastEvent?.halfInning === "BOTTOM"
            : lastEvent
              ? lastEvent.halfInning === "TOP"
              : true;
          const recoveredDefensivePitcher = recoveredIsTop
            ? homeLineupStateRef.current.currentPitcher
            : awayLineupStateRef.current.currentPitcher;
          let recoveredPitcherId = endedHalfOnLastAtBat
            ? recoveredDefensivePitcher?.playerId || lastEvent?.pitcherId || ""
            : (lastEvent?.pitcherId ??
              recoveredDefensivePitcher?.playerId ??
              "");
          let recoveredPitcherName = endedHalfOnLastAtBat
            ? recoveredDefensivePitcher?.playerName ||
              lastEvent?.pitcherName ||
              ""
            : (lastEvent?.pitcherName ??
              recoveredDefensivePitcher?.playerName ??
              "");
          let recoveredAwayBatterIndex = 0;
          let recoveredHomeBatterIndex = 0;

          if (endedHalfOnLastAtBat) {
            rebuiltTracker.runners = [];
          }

          for (const event of events) {
            const battingTeamKey = event.halfInning === "TOP" ? "away" : "home";
            const lineupRef =
              battingTeamKey === "away" ? awayLineupRef : homeLineupRef;
            const battingOrder =
              event.batterContext?.battingOrder ||
              lineupRef.current.findIndex(
                (player) => player.playerId === event.batterId,
              ) + 1;
            const nextIndex =
              lineupRef.current.length > 0
                ? battingOrder % lineupRef.current.length
                : 0;
            if (battingTeamKey === "away") {
              recoveredAwayBatterIndex = nextIndex;
            } else {
              recoveredHomeBatterIndex = nextIndex;
            }
          }

          const moveTrackedRunner = (
            runnerId: string,
            toBase: "first" | "second" | "third" | "home",
            outcome: "safe" | "out",
          ) => {
            const existing = rebuiltTracker.runners.find(
              (r) =>
                r.runnerId === runnerId &&
                r.currentBase !== "HOME" &&
                r.currentBase !== "OUT",
            );
            if (!existing) return;
            if (outcome === "out" || toBase === "home") {
              existing.currentBase = outcome === "out" ? "OUT" : "HOME";
              return;
            }
            existing.currentBase =
              toBase === "first" ? "1B" : toBase === "second" ? "2B" : "3B";
          };

          for (const event of tailBetweenPlayEvents) {
            if (event.gameState) {
              recoveredInning = event.gameState.inning;
              recoveredIsTop = event.gameState.halfInning === "TOP";
              recoveredOuts = event.gameState.outs;
              recoveredAwayScore = event.gameState.score.away;
              recoveredHomeScore = event.gameState.score.home;
            }

            if (event.runnerAction) {
              const toBase = numberToBase(event.runnerAction.toBase);
              moveTrackedRunner(
                event.runnerAction.runnerId,
                toBase,
                event.runnerAction.outcome,
              );

              if (event.runnerAction.outcome === "out") {
                recoveredOuts += 1;
              }
              if (toBase === "home" && event.runnerAction.outcome === "safe") {
                if (recoveredIsTop) recoveredAwayScore += 1;
                else recoveredHomeScore += 1;
              }
            }

            if (event.pitcherChange) {
              recoveredPitcherId = event.pitcherChange.incomingPitcherId;
              recoveredPitcherName =
                event.pitcherChange.incomingPitcherName ||
                event.pitcherChange.incomingPitcherId;
              rebuiltTracker.currentPitcherId = recoveredPitcherId;
              rebuiltTracker.currentPitcherName = recoveredPitcherName;
            }

            if (
              event.type === "substitution" &&
              event.substitution?.subType === "pinch_run"
            ) {
              const outgoingRunnerId = event.substitution.outPlayerId;
              const incomingRunnerId = event.substitution.inPlayerId;
              const incomingRunnerName =
                event.substitution.inPlayerName || incomingRunnerId;
              const activeOutgoingRunner = rebuiltTracker.runners.find(
                (runner) =>
                  runner.runnerId === outgoingRunnerId &&
                  (runner.currentBase === "1B" ||
                    runner.currentBase === "2B" ||
                    runner.currentBase === "3B"),
              );

              if (activeOutgoingRunner) {
                rebuiltTracker = handlePinchRunner(
                  rebuiltTracker,
                  outgoingRunnerId,
                  incomingRunnerId,
                  incomingRunnerName,
                );
              }
            }
          }

          rebuiltTracker.currentPitcherId = recoveredPitcherId;
          rebuiltTracker.currentPitcherName = recoveredPitcherName;
          rebuiltTracker.inning = recoveredInning;

          runnerTrackerRef.current = rebuiltTracker;
          setRunnerIdentityVersion((v) => v + 1);

          const runnerOnFirst = rebuiltTracker.runners.find(
            (r) => r.currentBase === "1B",
          );
          const runnerOnSecond = rebuiltTracker.runners.find(
            (r) => r.currentBase === "2B",
          );
          const runnerOnThird = rebuiltTracker.runners.find(
            (r) => r.currentBase === "3B",
          );
          const recoveredBattingLineup = recoveredIsTop
            ? awayLineupRef.current
            : homeLineupRef.current;
          const recoveredBatterIndex = recoveredIsTop
            ? recoveredAwayBatterIndex
            : recoveredHomeBatterIndex;
          const recoveredCurrentBatter =
            recoveredBattingLineup[recoveredBatterIndex];

          setAwayBatterIndex(recoveredAwayBatterIndex);
          setHomeBatterIndex(recoveredHomeBatterIndex);

          setGameState({
            gameId: inProgressGame.gameId,
            homeScore: recoveredHomeScore,
            awayScore: recoveredAwayScore,
            inning: recoveredInning,
            isTop: recoveredIsTop,
            outs: recoveredOuts,
            balls: 0,
            strikes: 0,
            bases: {
              first: !!runnerOnFirst,
              second: !!runnerOnSecond,
              third: !!runnerOnThird,
            },
            currentBatterId:
              recoveredCurrentBatter?.playerId || lastEvent?.batterId || "",
            currentBatterName:
              recoveredCurrentBatter?.playerName || lastEvent?.batterName || "",
            currentPitcherId: recoveredPitcherId,
            currentPitcherName: recoveredPitcherName,
            // UX-053: Recover catcher from fielding team lineup during durable log replay
            currentCatcherId: (() => {
              const fieldingLineup = recoveredIsTop
                ? homeLineupRef.current
                : awayLineupRef.current;
              return (
                fieldingLineup.find((p) => p.position === "C")?.playerId || ""
              );
            })(),
            currentCatcherName: (() => {
              const fieldingLineup = recoveredIsTop
                ? homeLineupRef.current
                : awayLineupRef.current;
              return (
                fieldingLineup.find((p) => p.position === "C")?.playerName || ""
              );
            })(),
            awayTeamId: inProgressGame.awayTeamId,
            homeTeamId: inProgressGame.homeTeamId,
            awayTeamName: inProgressGame.awayTeamName,
            homeTeamName: inProgressGame.homeTeamName,
            stadiumName: inProgressGame.stadiumName ?? null,
            seasonId: inProgressGame.seasonId,
            statsScopeId: inProgressGame.statsScopeId || inProgressGame.seasonId,
            seasonNumber: getFallbackSeasonNumber(
              inProgressGame.statsScopeId ?? inProgressGame.seasonId,
              1,
            ),
            gamePhase: "LIVE",
            liveBeatReporterEnabled:
              inProgressGame.liveBeatReporterEnabled ?? false,
            postGameColumnsEnabled:
              inProgressGame.postGameColumnsEnabled ?? true,
          });
          setAtBatSequence(lastEvent?.eventIndex ?? events.length);
          seasonIdRef.current = inProgressGame.seasonId || "";
          statsScopeIdRef.current =
            inProgressGame.statsScopeId || inProgressGame.seasonId || "";
          competitionTypeRef.current = inProgressGame.competitionType;
          competitionIdRef.current = inProgressGame.competitionId;
          competitionNameRef.current = inProgressGame.competitionName;
          franchiseIdRef.current = inProgressGame.franchiseId;
          scheduleGameIdRef.current = inProgressGame.scheduleGameId;
          leagueIdRef.current = inProgressGame.leagueId;
          syncRestoredCompetitionContext({
            seasonId: seasonIdRef.current || undefined,
            statsScopeId:
              statsScopeIdRef.current || seasonIdRef.current || undefined,
            seasonNumber: getFallbackSeasonNumber(
              inProgressGame.statsScopeId ?? inProgressGame.seasonId,
              undefined,
            ),
            competitionType: competitionTypeRef.current,
            competitionId: competitionIdRef.current,
            competitionName: competitionNameRef.current,
            franchiseId: franchiseIdRef.current,
            scheduleGameId: scheduleGameIdRef.current,
            leagueId: leagueIdRef.current,
          });
          setIsLoading(false);
          return true;
        }
      } catch (err) {
        console.error("[useGameState] Error loading existing game:", err);
      }
      setIsLoading(false);
      return false;
    },
    [
      gameState.gameId,
      initialGameId,
      mapBetweenPlayEventsToSubstitutionLog,
      replayRosterChangeEvent,
      replaceFameEvents,
      seedLineupStateFromHeader,
      syncRestoredCompetitionContext,
      syncRestoredPlayoffContext,
    ],
  );

  const undoLastAction = useCallback(async (options?: { skipReload?: boolean }): Promise<boolean> => {
    const targetGameId = gameState.gameId || initialGameId;
    if (!targetGameId) {
      return false;
    }

    try {
      const undone = await undoMostRecentGameAction(targetGameId);
      if (!undone) {
        return false;
      }

      if (undone.kind === "betweenPlay") {
        const betweenPlayEvent = await getBetweenPlayEvent(undone.eventId);
        if (
          betweenPlayEvent?.type === "pitch_count_update" &&
          betweenPlayEvent.pitchCountUpdate?.timing === "end_of_half_inning"
        ) {
          const pairedAtBatUndo = await undoMostRecentGameAction(targetGameId);
          if (!pairedAtBatUndo) {
            return false;
          }
        }
      }

      // R3-R7: When caller has a snapshot to restore from, skip the full reload
      // (loadExistingGame reloads stale scores from persisted snapshot)
      if (options?.skipReload) {
        console.log("[R3-R7] undoLastAction: skipping reload (caller will restore from snapshot)");
        return true;
      }

      await clearCurrentGame();
      return await loadExistingGame();
    } catch (err) {
      console.error("[useGameState] Failed to undo last action:", err);
      return false;
    }
  }, [gameState.gameId, initialGameId, loadExistingGame]);

  // Keep a live snapshot in currentGame so refresh restores exact state
  // (including runner identities and full scoreboard, not only at-bat events).
  useEffect(() => {
    if (isLoading) return;
    if (!gameState.gameId || !gameState.awayTeamId || !gameState.homeTeamId)
      return;

    const playerNameLookup = new Map<string, string>();
    for (const p of awayLineupRef.current) {
      playerNameLookup.set(p.playerId, p.playerName);
      registerIdentityForSide(p.playerId, p.playerName, "away");
    }
    for (const p of homeLineupRef.current) {
      playerNameLookup.set(p.playerId, p.playerName);
      registerIdentityForSide(p.playerId, p.playerName, "home");
    }
    for (const b of awayLineupStateRef.current.bench) {
      playerNameLookup.set(b.playerId, b.playerName);
      registerIdentityForSide(b.playerId, b.playerName, "away");
    }
    for (const b of homeLineupStateRef.current.bench) {
      playerNameLookup.set(b.playerId, b.playerName);
      registerIdentityForSide(b.playerId, b.playerName, "home");
    }

    const playerStatsRecord: PersistedGameState["playerStats"] = {};
    playerStats.forEach((stats, playerId) => {
      playerStatsRecord[playerId] = {
        playerName: resolvePlayerNameForId(
          playerId,
          playerNameLookup.get(playerId) ||
            playerNameByIdRef.current.get(playerId) ||
            playerId,
        ),
        teamId: resolveTeamIdForPlayerId(playerId),
        pa: stats.pa,
        ab: stats.ab,
        h: stats.h,
        singles: stats.singles,
        doubles: stats.doubles,
        triples: stats.triples,
        hr: stats.hr,
        rbi: stats.rbi,
        r: stats.r,
        bb: stats.bb,
        hbp: stats.hbp,
        k: stats.k,
        sb: stats.sb,
        cs: stats.cs,
        sf: stats.sf,
        sh: stats.sh,
        gidp: stats.gidp,
        putouts: 0,
        assists: 0,
        fieldingErrors: 0,
      };
    });

    const pitcherGameStats: PersistedGameState["pitcherGameStats"] = [];
    pitcherStats.forEach((stats, pitcherId) => {
      pitcherGameStats.push({
        pitcherId,
        pitcherName:
          pitcherNamesRef.current.get(pitcherId) ||
          playerNameByIdRef.current.get(pitcherId) ||
          pitcherId,
        teamId: resolveTeamIdForPlayerId(pitcherId),
        isStarter: stats.isStarter,
        entryInning: stats.entryInning,
        outsRecorded: stats.outsRecorded,
        hitsAllowed: stats.hitsAllowed,
        runsAllowed: stats.runsAllowed,
        earnedRuns: stats.earnedRuns,
        walksAllowed: stats.walksAllowed + stats.intentionalWalks,
        strikeoutsThrown: stats.strikeoutsThrown,
        homeRunsAllowed: stats.homeRunsAllowed,
        hitBatters: stats.hitByPitch,
        basesReachedViaError: 0,
        wildPitches: stats.wildPitches,
        pitchCount: stats.pitchCount,
        battersFaced: stats.battersFaced,
        consecutiveHRsAllowed: stats.consecutiveHRsAllowed,
        firstInningRuns: stats.firstInningRuns,
        basesLoadedWalks: stats.basesLoadedWalks,
        inningsComplete: Math.floor(stats.outsRecorded / 3),
        decision: stats.decision,
        save: stats.save,
        hold: stats.hold,
        blownSave: stats.blownSave,
      });
    });

    const tracker = runnerTrackerRef.current;
    const baseRunners: {
      first: PersistedGameState["bases"]["first"];
      second: PersistedGameState["bases"]["second"];
      third: PersistedGameState["bases"]["third"];
    } = {
      first: null,
      second: null,
      third: null,
    };
    for (const runner of tracker.runners) {
      if (runner.currentBase === "1B") {
        baseRunners.first = {
          playerId: runner.runnerId,
          playerName: runner.runnerName,
          inheritedFrom: runner.isInherited
            ? runner.inheritedFromPitcherId || runner.responsiblePitcherId
            : null,
        };
      } else if (runner.currentBase === "2B") {
        baseRunners.second = {
          playerId: runner.runnerId,
          playerName: runner.runnerName,
          inheritedFrom: runner.isInherited
            ? runner.inheritedFromPitcherId || runner.responsiblePitcherId
            : null,
        };
      } else if (runner.currentBase === "3B") {
        baseRunners.third = {
          playerId: runner.runnerId,
          playerName: runner.runnerName,
          inheritedFrom: runner.isInherited
            ? runner.inheritedFromPitcherId || runner.responsiblePitcherId
            : null,
        };
      }
    }

    // Fallback: preserve occupied bases from boolean state even if tracker identity is temporarily missing.
    if (gameState.bases.first && !baseRunners.first) {
      baseRunners.first = latestPersistedRef.current?.bases.first || {
        playerId: `r1-${gameState.gameId}`,
        playerName: "Runner",
        inheritedFrom: null,
      };
    }
    if (gameState.bases.second && !baseRunners.second) {
      baseRunners.second = latestPersistedRef.current?.bases.second || {
        playerId: `r2-${gameState.gameId}`,
        playerName: "Runner",
        inheritedFrom: null,
      };
    }
    if (gameState.bases.third && !baseRunners.third) {
      baseRunners.third = latestPersistedRef.current?.bases.third || {
        playerId: `r3-${gameState.gameId}`,
        playerName: "Runner",
        inheritedFrom: null,
      };
    }

    const previousPersisted = latestPersistedRef.current;
    const durableStartedAt =
      gameStartedAtRef.current ?? previousPersisted?.gameStartedAt ?? null;
    const persistedGamePhase =
      durableStartedAt != null && gameState.gamePhase === "PRE_GAME"
        ? "LIVE"
        : gameState.gamePhase;
    const nextGameStartedAt =
      durableStartedAt ??
      (persistedGamePhase === "PRE_GAME" ? undefined : Date.now());
    if (nextGameStartedAt != null) {
      gameStartedAtRef.current = nextGameStartedAt;
    }

    const persisted: PersistedGameState = {
      id: "current",
      gameId: gameState.gameId,
      savedAt: Date.now(),
      inning: gameState.inning,
      halfInning: gameState.isTop ? "TOP" : "BOTTOM",
      outs: gameState.outs,
      homeScore: gameState.homeScore,
      awayScore: gameState.awayScore,
      bases: baseRunners,
      currentBatterIndex: gameState.isTop ? awayBatterIndex : homeBatterIndex,
      atBatCount: atBatSequence,
      awayTeamId: gameState.awayTeamId,
      homeTeamId: gameState.homeTeamId,
      awayTeamName: gameState.awayTeamName,
      homeTeamName: gameState.homeTeamName,
      seasonNumber: gameState.seasonNumber,
      stadiumName: gameState.stadiumName ?? null,
      currentBatterId: gameState.currentBatterId,
      currentBatterName: gameState.currentBatterName,
      currentPitcherId: gameState.currentPitcherId,
      currentPitcherName: gameState.currentPitcherName,
      gamePhase: persistedGamePhase,
      gameStartedAt: nextGameStartedAt,
      playerStats: playerStatsRecord,
      pitcherGameStats,
      fameEvents: buildPersistedFameEvents(
        gameState.inning,
        gameState.isTop ? "TOP" : "BOTTOM",
      ).map((event, idx) => ({
        ...event,
        id: `${gameState.gameId}_fame_live_${idx}`,
      })),
      lastHRBatterId: null,
      consecutiveHRCount: 0,
      inningStrikeouts: 0,
      maxDeficitAway: 0,
      maxDeficitHome: 0,
      activityLog: [],
      currentInningPitches: inningPitchesRef.current,
      scoreboard: {
        innings: scoreboard.innings.map((inn) => ({
          away: inn.away,
          home: inn.home,
        })),
        away: { ...scoreboard.away },
        home: { ...scoreboard.home },
      },
      awayBatterIndex,
      homeBatterIndex,
      seasonId: seasonIdRef.current || undefined,
      statsScopeId: statsScopeIdRef.current || seasonIdRef.current || undefined,
      competitionType: competitionTypeRef.current,
      competitionId: competitionIdRef.current,
      competitionName: competitionNameRef.current,
      franchiseId: franchiseIdRef.current,
      scheduleGameId: scheduleGameIdRef.current,
      playoffSeriesId: playoffSeriesIdRef.current || undefined,
      playoffGameNumber: playoffGameNumberRef.current || undefined,
      playoffId: playoffIdRef.current || undefined,
      playoffRound: restoredPlayoffContext.playoffRound,
      isEliminationGame: restoredPlayoffContext.isEliminationGame,
      isClinchGame: restoredPlayoffContext.isClinchGame,
      // R3-R7: Persist leagueId for almanac queries after refresh
      leagueId: leagueIdRef.current,
      liveBeatReporterEnabled: gameState.liveBeatReporterEnabled,
      postGameColumnsEnabled: gameState.postGameColumnsEnabled,
      // Mirror the legacy flag so old consumers still read something sensible.
      beatReporterEnabled:
        gameState.liveBeatReporterEnabled || gameState.postGameColumnsEnabled,
      // R3: Persist game config that would be lost on refresh
      totalInnings: totalInningsRef.current,
      awayUsesDh: awayUsesDhRef.current,
      homeUsesDh: homeUsesDhRef.current,
      awayLineup: awayLineupRef.current,
      homeLineup: homeLineupRef.current,
      optimalLineupSnapshots: optimalLineupSnapshotsRef.current,
      chosenLineupSnapshots: chosenLineupSnapshotsRef.current,
      awayLineupState:
        awayLineupStateRef.current as PersistedGameState["awayLineupState"],
      homeLineupState:
        homeLineupStateRef.current as PersistedGameState["homeLineupState"],
      runnerTrackerSnapshot: {
        runners: tracker.runners as PersistedRunnerTrackerSnapshot["runners"],
        currentPitcherId: tracker.currentPitcherId,
        currentPitcherName: tracker.currentPitcherName,
        pitcherStatsEntries: Array.from(
          tracker.pitcherStats.entries(),
        ) as Array<[string, unknown]>,
        inning: tracker.inning,
        atBatNumber: tracker.atBatNumber,
      },
      pitcherNamesEntries: Array.from(pitcherNamesRef.current.entries()),
      substitutionLog: substitutionLog as PersistedGameState["substitutionLog"],
      // R3-T0: Persist exhibition config & cosmetic state
      extraInningRunner: extraInningRunnerRef.current,
      extraInningRunnerDelay: extraInningRunnerDelayRef.current,
      awayTeamColor: teamColorsRef.current.awayTeamColor,
      awayTeamBorderColor: teamColorsRef.current.awayTeamBorderColor,
      homeTeamColor: teamColorsRef.current.homeTeamColor,
      homeTeamBorderColor: teamColorsRef.current.homeTeamBorderColor,
      playerMojoFitness: playerMojoFitnessGetterRef.current?.() ?? undefined,
      gameStartTimestamp: gameStartTimestampRef.current,
    };

    latestPersistedRef.current = persisted;
    console.log("[R3-T0] Queued current-game snapshot save", {
      metadataVersion: persistenceMetadataVersion,
      awayTeamColor: persisted.awayTeamColor ?? null,
      homeTeamColor: persisted.homeTeamColor ?? null,
      gameStartTimestamp: persisted.gameStartTimestamp ?? null,
    });
    const shouldSaveImmediately =
      !previousPersisted ||
      previousPersisted.gameId !== persisted.gameId ||
      previousPersisted.gamePhase !== persisted.gamePhase;
    if (shouldSaveImmediately) {
      persistSnapshotImmediately(persisted);
      return;
    }
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    autoSaveTimeoutRef.current = setTimeout(() => {
      saveCurrentGame(persisted).catch((err) => {
        console.error("[useGameState] Auto-save failed:", err);
      });
    }, 250);
    setLastSavedAt(Date.now());
  }, [
    awayBatterIndex,
    atBatSequence,
    buildPersistedFameEvents,
    buildImmediateCurrentGameSnapshot,
    gameState,
    homeBatterIndex,
    isLoading,
    pitcherStats,
    playerStats,
    registerIdentityForSide,
    resolveTeamIdForPlayerId,
    scoreboard,
    substitutionLog,
    persistenceMetadataVersion,
    persistSnapshotImmediately,
    restoredPlayoffContext.playoffSeriesId,
    restoredPlayoffContext.playoffGameNumber,
    restoredPlayoffContext.playoffId,
    restoredPlayoffContext.playoffRound,
    restoredPlayoffContext.isEliminationGame,
    restoredPlayoffContext.isClinchGame,
  ]);

  useEffect(() => {
    const flushSave = () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
        autoSaveTimeoutRef.current = null;
      }
      if (!latestPersistedRef.current) return;
      immediateSaveCurrentGame(latestPersistedRef.current);
      setLastSavedAt(Date.now());
    };

    const onVisibility = () => {
      if (document.hidden) {
        flushSave();
      }
    };

    window.addEventListener("beforeunload", flushSave);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      window.removeEventListener("beforeunload", flushSave);
      document.removeEventListener("visibilitychange", onVisibility);
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
        autoSaveTimeoutRef.current = null;
      }
    };
  }, []);

  // ============================================
  // CORE ACTIONS
  // ============================================

  const advanceToNextBatter = useCallback(() => {
    setGameState((prev) => {
      const battingTeamLineup = prev.isTop
        ? awayLineupRef.current
        : homeLineupRef.current;
      const currentIndex = prev.isTop ? awayBatterIndex : homeBatterIndex;
      // Always cycle through first 9 batters (standard batting order)
      const nextIndex = (currentIndex + 1) % 9;
      const nextBatter = battingTeamLineup[nextIndex];

      if (prev.isTop) {
        setAwayBatterIndex(nextIndex);
      } else {
        setHomeBatterIndex(nextIndex);
      }

      return {
        ...prev,
        balls: 0,
        strikes: 0,
        currentBatterId: nextBatter?.playerId || "",
        currentBatterName: nextBatter?.playerName || "",
      };
    });
  }, [awayBatterIndex, homeBatterIndex]);

  const placeGhostRunner = useCallback(
    (base: "second", playerId: string) => {
      if (!playerId) {
        return;
      }

      const trackerBaseByUiBase = { second: "2B" } as const;
      const playerName = resolvePlayerNameForId(playerId, playerId);
      const trackerWithPitcher = syncTrackerPitcher(
        runnerTrackerRef.current,
        gameState.currentPitcherId,
        gameState.currentPitcherName,
      );
      const existingRunnerId = findRunnerOnBase(trackerWithPitcher, "second");

      if (existingRunnerId === playerId) {
        return;
      }

      let nextTracker = trackerWithPitcher;
      if (existingRunnerId) {
        nextTracker = trackerRunnerOut(nextTracker, existingRunnerId);
      }

      nextTracker = trackerAddRunner(
        nextTracker,
        playerId,
        playerName,
        trackerBaseByUiBase[base],
        "ghost_runner",
      );
      console.log("[R3-R4] Ghost runner placed:", {
        base,
        runnerId: playerId,
        runnerName: playerName,
      });
      runnerTrackerRef.current = nextTracker;
      setRunnerIdentityVersion((version) => version + 1);
      setGameState((prev) => ({
        ...prev,
        bases: {
          ...prev.bases,
          [base]: true,
        },
      }));
    },
    [
      gameState.currentPitcherId,
      gameState.currentPitcherName,
      resolvePlayerNameForId,
    ],
  );

  const recordHit = useCallback(
    async (
      hitType: HitType,
      rbi: number,
      runnerData?: RunnerAdvancement,
      pitchCount: number = 1,
    ) => {
      const newSequence = atBatSequence + 1;
      setAtBatSequence(newSequence);

      const battingTeamId = gameState.isTop
        ? gameState.awayTeamId
        : gameState.homeTeamId;
      const pitchingTeamId = gameState.isTop
        ? gameState.homeTeamId
        : gameState.awayTeamId;
      const isHomeRunHit = hitType === "HR" || hitType === "ITPHR";

      // Calculate runs scored
      let runsScored = isHomeRunHit ? 1 : 0; // Batter scores on home run
      if (runnerData?.fromFirst === "home") runsScored++;
      if (runnerData?.fromSecond === "home") runsScored++;
      if (runnerData?.fromThird === "home") runsScored++;

      // CRIT-02: Update runner tracker — advance existing runners FIRST, then add batter
      const scoredEvents: RunnerScoredEvent[] = [];
      const trackerBeforePlay = syncTrackerPitcher(
        runnerTrackerRef.current,
        gameState.currentPitcherId,
        gameState.currentPitcherName,
      );
      let tracker = trackerBeforePlay;

      // Advance existing runners per runnerData
      if (runnerData) {
        // Process in order: third → second → first (avoid collision)
        for (const [base, dest] of [
          ["third", runnerData.fromThird],
          ["second", runnerData.fromSecond],
          ["first", runnerData.fromFirst],
        ] as const) {
          if (!dest) continue;
          const runnerId = findRunnerOnBase(
            tracker,
            base as "first" | "second" | "third",
          );
          if (!runnerId) continue;

          if (dest === "out") {
            tracker = trackerRunnerOut(tracker, runnerId);
          } else {
            const trackerDest = destToTrackerBase(dest);
            const result = trackerAdvanceRunner(tracker, runnerId, trackerDest);
            tracker = result.state;
            if (result.scoredEvent) scoredEvents.push(result.scoredEvent);
          }
        }
      } else if (isHomeRunHit) {
        // Home run with no runnerData: all runners score
        for (const base of ["third", "second", "first"] as const) {
          const runnerId = findRunnerOnBase(tracker, base);
          if (runnerId) {
            const result = trackerAdvanceRunner(tracker, runnerId, "HOME");
            tracker = result.state;
            if (result.scoredEvent) scoredEvents.push(result.scoredEvent);
          }
        }
      }

      // Add batter to tracker
      const howReached: HowReached = "hit";
      if (isHomeRunHit) {
        // Batter scores immediately on a home run — add then advance to HOME
        tracker = trackerAddRunner(
          tracker,
          gameState.currentBatterId,
          gameState.currentBatterName,
          "1B",
          howReached,
        );
        const hrResult = trackerAdvanceRunner(
          tracker,
          gameState.currentBatterId,
          "HOME",
        );
        tracker = hrResult.state;
        if (hrResult.scoredEvent) scoredEvents.push(hrResult.scoredEvent);
      } else {
        // GRD (Ground Rule Double) puts batter at 2B like a regular double
        const batterBase =
          hitType === "1B"
            ? "1B"
            : hitType === "2B" || hitType === "GRD"
              ? "2B"
              : "3B";
        tracker = trackerAddRunner(
          tracker,
          gameState.currentBatterId,
          gameState.currentBatterName,
          batterBase,
          howReached,
        );
      }

      // Advance at-bat counter in tracker
      tracker = trackerNextAtBat(tracker);
      runnerTrackerRef.current = tracker;
      // R3-R8: Increment runner identity version so batting lineup runner markers update
      setRunnerIdentityVersion((v) => v + 1);

      const leverageIndex = getCurrentLeverageIndex();
      const homeScoreAfter = gameState.isTop
        ? gameState.homeScore
        : gameState.homeScore + runsScored;
      const awayScoreAfter = gameState.isTop
        ? gameState.awayScore + runsScored
        : gameState.awayScore;
      const endGameEvaluation = evaluateEndGameTrigger({
        inning: gameState.inning,
        isTop: gameState.isTop,
        homeScoreBefore: gameState.homeScore,
        awayScoreBefore: gameState.awayScore,
        homeScoreAfter,
        awayScoreAfter,
        context: "live_play",
      });

      if (endGameEvaluation.shouldEndGame) {
        queueAutoEndGame();
      }

      // Clutch = high leverage (LI >= 1.5)
      const isClutch = leverageIndex >= 1.5;

      const runnerOutcomesForRbi: {
        first: RunnerOutcome | null;
        second: RunnerOutcome | null;
        third: RunnerOutcome | null;
      } = {
        first: !gameState.bases.first
          ? null
          : isHomeRunHit && !runnerData
            ? "SCORED"
            : runnerData?.fromFirst === "home"
              ? "SCORED"
              : runnerData?.fromFirst === "third"
                ? "TO_3B"
                : runnerData?.fromFirst === "second"
                  ? "TO_2B"
                  : runnerData?.fromFirst === "out"
                    ? "OUT_2B"
                    : "HELD",
        second: !gameState.bases.second
          ? null
          : isHomeRunHit && !runnerData
            ? "SCORED"
            : runnerData?.fromSecond === "home"
              ? "SCORED"
              : runnerData?.fromSecond === "third"
                ? "TO_3B"
                : runnerData?.fromSecond === "out"
                  ? "OUT_3B"
                  : "HELD",
        third: !gameState.bases.third
          ? null
          : isHomeRunHit && !runnerData
            ? "SCORED"
            : runnerData?.fromThird === "home"
              ? "SCORED"
              : runnerData?.fromThird === "out"
                ? "OUT_HOME"
                : "HELD",
      };
      const calculatedRbi = calculateRBIs(
        mapAtBatResultFromHit(hitType),
        runnerOutcomesForRbi,
        gameState.bases,
      );

      // Create at-bat event
      const event: AtBatEvent = {
        eventId: `${gameState.gameId}_${newSequence}`,
        gameId: gameState.gameId,
        eventIndex: newSequence,
        timestamp: Date.now(),
        batterId: gameState.currentBatterId,
        batterName: gameState.currentBatterName,
        batterTeamId: battingTeamId,
        pitcherId: gameState.currentPitcherId,
        pitcherName: gameState.currentPitcherName,
        pitcherTeamId: pitchingTeamId,
        result: mapAtBatResultFromHit(hitType),
        rbiCount: calculatedRbi,
        runsScored,
        inning: gameState.inning,
        halfInning: gameState.isTop ? "TOP" : "BOTTOM",
        outs: gameState.outs,
        runners: {
          first: buildRunnerInfo(
            trackerBeforePlay,
            "first",
            !!gameState.bases.first,
            gameState.currentPitcherId,
          ),
          second: buildRunnerInfo(
            trackerBeforePlay,
            "second",
            !!gameState.bases.second,
            gameState.currentPitcherId,
          ),
          third: buildRunnerInfo(
            trackerBeforePlay,
            "third",
            !!gameState.bases.third,
            gameState.currentPitcherId,
          ),
        },
        awayScore: gameState.awayScore,
        homeScore: gameState.homeScore,
        outsAfter: gameState.outs,
        runnersAfter: buildRunnersAfter(tracker),
        awayScoreAfter,
        homeScoreAfter,
        runnerOutcomes: buildEventRunnerOutcomes(
          trackerBeforePlay,
          gameState.bases,
          runnerOutcomesForRbi,
          gameState.currentPitcherId,
        ),
        leverageIndex,
        // MAJ-12: WPA from win expectancy table
        ...(() => {
          const rAfter = buildRunnersAfter(tracker);
          const wpaResult = calculateWPA(
            {
              inning: gameState.inning,
              isTop: gameState.isTop,
              outs: gameState.outs,
              bases: gameState.bases,
              homeScore: gameState.homeScore,
              awayScore: gameState.awayScore,
              totalInnings: totalInningsRef.current,
              extraInningRunner: extraInningRunnerRef.current,
              extraInningRunnerDelay: extraInningRunnerDelayRef.current,
            },
            {
              outs: gameState.outs,
              bases: {
                first: !!rAfter.first,
                second: !!rAfter.second,
                third: !!rAfter.third,
              },
              homeScore: gameState.isTop
                ? gameState.homeScore
                : gameState.homeScore + runsScored,
              awayScore: gameState.isTop
                ? gameState.awayScore + runsScored
                : gameState.awayScore,
            },
          );
          return wpaResult;
        })(),
        ballInPlay: null,
        fameEvents: [],
        isLeadoff:
          gameState.outs === 0 &&
          !gameState.bases.first &&
          !gameState.bases.second &&
          !gameState.bases.third,
        isClutch,
        isWalkOff: endGameEvaluation.isWalkOff,
        ...buildContextSnapshot(mapAtBatResultFromHit(hitType), pitchCount),
      };

      // Log to IndexedDB
      await logAtBatEvent(event);
      pendingEnrichmentRef.current = undefined;

      // Update player stats
      setPlayerStats((prev) => {
        const newStats = new Map(prev);
        const batterStats = {
          ...(newStats.get(gameState.currentBatterId) ||
            createEmptyPlayerStats()),
        };
        batterStats.pa++;
        batterStats.ab++;
        batterStats.h++;
        if (hitType === "1B") batterStats.singles++;
        if (hitType === "2B" || hitType === "GRD") batterStats.doubles++; // GRD counts as a double
        if (hitType === "3B") batterStats.triples++;
        if (isHomeRunHit) batterStats.hr++;
        // GAP-05: Track grand slams — HR with all bases occupied pre-play
        if (isHomeRunHit && gameState.bases.first && gameState.bases.second && gameState.bases.third) {
          batterStats.grandSlams++;
        }
        batterStats.rbi += calculatedRbi;
        newStats.set(gameState.currentBatterId, batterStats);
        return newStats;
      });

      // Update pitcher stats — CRIT-02: Use tracker for ER attribution
      // First: update current pitcher's non-run stats (hits, pitch count, etc.)
      setPitcherStats((prev) => {
        const newStats = new Map(prev);
        const pStats = {
          ...(newStats.get(gameState.currentPitcherId) ||
            createEmptyPitcherStats()),
        };
        pStats.hitsAllowed++;
        pStats.battersFaced++;
        pStats.pitchCount += pitchCount;
        if (isHomeRunHit) {
          pStats.homeRunsAllowed++;
          pStats.consecutiveHRsAllowed++;
        } else {
          pStats.consecutiveHRsAllowed = 0; // Reset on non-HR hit
        }
        // MAJ-07: Track first-inning runs for starters
        if (pStats.isStarter && gameState.inning === 1 && runsScored > 0) {
          pStats.firstInningRuns += runsScored;
        }
        newStats.set(gameState.currentPitcherId, pStats);
        return newStats;
      });
      // Then: attribute runs/ER to the RESPONSIBLE pitcher via tracker events
      if (scoredEvents.length > 0) {
        creditPlayerRunsForScoredEvents(
          scoredEvents,
          setPlayerStats,
          createEmptyPlayerStats,
        );
        processTrackerScoredEvents(
          scoredEvents,
          setPitcherStats,
          createEmptyPitcherStats,
        );
      }

      // Update scoreboard
      setScoreboard((prev) => {
        const teamKey = gameState.isTop ? "away" : "home";
        const inningIdx = gameState.inning - 1;
        const newInnings = [...prev.innings];
        const currentInningScore = newInnings[inningIdx]?.[teamKey] || 0;
        newInnings[inningIdx] = {
          ...newInnings[inningIdx],
          [teamKey]: currentInningScore + runsScored,
        };
        return {
          ...prev,
          innings: newInnings,
          [teamKey]: {
            ...prev[teamKey],
            runs: prev[teamKey].runs + runsScored,
            hits: prev[teamKey].hits + 1,
          },
        };
      });

      // Update game state (bases, score)
      setGameState((prev) => {
        let newBases = { first: false, second: false, third: false };

        // Place batter on base based on hit type (unless HR)
        if (hitType === "1B") newBases.first = true;
        if (hitType === "2B" || hitType === "GRD") newBases.second = true;
        if (hitType === "3B") newBases.third = true;
        // HR: batter scores, bases cleared above

        // Handle runner advancement
        // IMPORTANT: Runners not mentioned in runnerData STAY on their current base
        // (unless the batter is taking that base)
        if (runnerData) {
          // Explicit advancements from runnerData
          if (runnerData.fromFirst === "second") newBases.second = true;
          if (runnerData.fromFirst === "third") newBases.third = true;
          if (runnerData.fromSecond === "third") newBases.third = true;
          // Note: 'home' and 'out' destinations don't need base tracking

          // Preserve runners who weren't mentioned (they stay put)
          // R1 stays if not mentioned AND batter isn't taking first
          if (prev.bases.first && !runnerData.fromFirst && hitType !== "1B") {
            newBases.first = true;
          }
          // R2 stays if not mentioned AND no one is moving there
          if (
            prev.bases.second &&
            !runnerData.fromSecond &&
            runnerData.fromFirst !== "second"
          ) {
            newBases.second = true;
          }
          // R3 stays if not mentioned AND no one is moving there
          if (
            prev.bases.third &&
            !runnerData.fromThird &&
            runnerData.fromFirst !== "third" &&
            runnerData.fromSecond !== "third"
          ) {
            newBases.third = true;
          }
        } else {
          // No runnerData - preserve all existing runners except where batter goes
          if (prev.bases.first && hitType !== "1B") newBases.first = true;
          if (prev.bases.second && hitType !== "2B") newBases.second = true;
          if (prev.bases.third && hitType !== "3B") newBases.third = true;
        }

        return {
          ...prev,
          balls: 0,
          strikes: 0,
          bases: newBases,
          awayScore: prev.isTop ? prev.awayScore + runsScored : prev.awayScore,
          homeScore: prev.isTop ? prev.homeScore : prev.homeScore + runsScored,
        };
      });

      // Advance to next batter
      advanceToNextBatter();
      setLastSavedAt(Date.now());
    },
    [
      advanceToNextBatter,
      atBatSequence,
      creditFieldingOutsToPositions,
      evaluateEndGameTrigger,
      gameState,
      getCurrentLeverageIndex,
      queueAutoEndGame,
    ],
  );

  const recordOut = useCallback(
    async (
      outType: OutType,
      runnerData?: RunnerAdvancement,
      pitchCount: number = 1,
      options?: { forceNoRuns?: boolean },
    ) => {
      const newSequence = atBatSequence + 1;
      setAtBatSequence(newSequence);
      const mappedResult = mapAtBatResultFromOut(outType);
      const effectiveRunnerData =
        runnerData ??
        (mappedResult === "SAC"
          ? buildDefaultRunnerAdvancement(
              mappedResult,
              gameState.outs,
              gameState.bases,
            )
          : outType === "FC" && (gameState.bases.first || gameState.bases.second || gameState.bases.third)
            ? (() => {
                // R3-FC: Auto-generate default FC runner advancement.
                // FC = fielder chose to throw to a base to get a runner instead of batter.
                // Default: most advanced runner is out, others advance by force.
                const fc: RunnerAdvancement = {};
                if (gameState.bases.third) {
                  fc.fromThird = "out"; // Throw home, runner out at plate
                  if (gameState.bases.second) fc.fromSecond = "third";
                  if (gameState.bases.first) fc.fromFirst = "second";
                } else if (gameState.bases.second) {
                  fc.fromSecond = "out"; // Throw to third, runner out
                  if (gameState.bases.first) fc.fromFirst = "second";
                } else if (gameState.bases.first) {
                  fc.fromFirst = "out"; // Throw to second, runner out (force)
                }
                console.log("[R3-FC] Default FC runner advancement:", fc);
                return fc;
              })()
            : undefined);

      // Track inning strikeouts for immaculate inning detection
      // (Pitch count will be confirmed by user at end of inning)
      if (outType === "K" || outType === "Kc") {
        inningPitchesRef.current.strikeouts++;
      }

      const battingTeamId = gameState.isTop
        ? gameState.awayTeamId
        : gameState.homeTeamId;
      const pitchingTeamId = gameState.isTop
        ? gameState.homeTeamId
        : gameState.awayTeamId;

      // Calculate outs on play:
      // - DP = 2 outs, TP = 3 outs (batter + runners)
      // - FC = 1 out (runner out, batter SAFE) - batter does NOT count as out
      // - Otherwise start with 1 (batter out) and add any runners thrown out
      let outsOnPlay: number;

      if (outType === "DP") {
        outsOnPlay = 2;
      } else if (outType === "TP") {
        outsOnPlay = 3;
      } else if (outType === "FC") {
        // FC: Batter is SAFE at first, only runners count as outs
        outsOnPlay = 0;
        if (effectiveRunnerData) {
          if (effectiveRunnerData.fromFirst === "out") outsOnPlay++;
          if (effectiveRunnerData.fromSecond === "out") outsOnPlay++;
          if (effectiveRunnerData.fromThird === "out") outsOnPlay++;
        }
        // Default to 1 out only when no explicit FC runner outcome was provided.
        if (outsOnPlay === 0 && !effectiveRunnerData) outsOnPlay = 1;
        console.log(
          `[recordOut] FC: ${outsOnPlay} runner out(s), batter safe at first`,
        );
      } else {
        // Standard out: batter is out
        outsOnPlay = 1;
        // Count additional outs from runners thrown out (e.g., tag up attempt on fly out)
        if (effectiveRunnerData) {
          if (effectiveRunnerData.fromFirst === "out") outsOnPlay++;
          if (effectiveRunnerData.fromSecond === "out") outsOnPlay++;
          if (effectiveRunnerData.fromThird === "out") outsOnPlay++;
          console.log(
            `[recordOut] Outs on play: ${outsOnPlay} (batter + ${outsOnPlay - 1} runner(s))`,
          );
        }
      }

      const newOuts = gameState.outs + outsOnPlay;

      // Calculate runs scored on this play before 3rd-out force-play validation.
      let rawRunsScored = 0;
      if (effectiveRunnerData?.fromThird === "home") rawRunsScored++;
      if (effectiveRunnerData?.fromSecond === "home") rawRunsScored++;
      if (effectiveRunnerData?.fromFirst === "home") rawRunsScored++;

      // CRIT-02: Update runner tracker for outs
      const outScoredEvents: RunnerScoredEvent[] = [];
      const trackerBeforePlay = syncTrackerPitcher(
        runnerTrackerRef.current,
        gameState.currentPitcherId,
        gameState.currentPitcherName,
      );
      let outTracker = trackerBeforePlay;

      if (effectiveRunnerData) {
        // Process runners: third → second → first (avoid collision)
        for (const [base, dest] of [
          ["third", effectiveRunnerData.fromThird],
          ["second", effectiveRunnerData.fromSecond],
          ["first", effectiveRunnerData.fromFirst],
        ] as const) {
          if (!dest) continue;
          const runnerId = findRunnerOnBase(
            outTracker,
            base as "first" | "second" | "third",
          );
          if (!runnerId) continue;

          if (dest === "out") {
            outTracker = trackerRunnerOut(outTracker, runnerId);
          } else {
            const trackerDest = destToTrackerBase(dest);
            const result = trackerAdvanceRunner(
              outTracker,
              runnerId,
              trackerDest,
            );
            outTracker = result.state;
            if (result.scoredEvent) outScoredEvents.push(result.scoredEvent);
          }
        }
      }

      // FC: batter reaches first base — add to tracker
      if (outType === "FC") {
        outTracker = trackerAddRunner(
          outTracker,
          gameState.currentBatterId,
          gameState.currentBatterName,
          "1B",
          "FC",
        );
      }

      // Advance at-bat counter
      outTracker = trackerNextAtBat(outTracker);
      runnerTrackerRef.current = outTracker;
      // R3-R8: Increment runner identity version so batting lineup runner markers update
      setRunnerIdentityVersion((v) => v + 1);

      const leverageIndex = getCurrentLeverageIndex();

      // Clutch = high leverage (LI >= 1.5)
      const isClutch = leverageIndex >= 1.5;

      // MAJ-07: Auto-correct result based on runner outcomes
      // Convert RunnerAdvancement → RunnerOutcome format for autoCorrectResult
      const runnerOutcomesForCorrection: {
        first: RunnerOutcome | null;
        second: RunnerOutcome | null;
        third: RunnerOutcome | null;
      } = {
        first: !gameState.bases.first
          ? null
          : effectiveRunnerData?.fromFirst === "home"
            ? "SCORED"
            : effectiveRunnerData?.fromFirst === "third"
              ? "TO_3B"
              : effectiveRunnerData?.fromFirst === "second"
                ? "TO_2B"
                : effectiveRunnerData?.fromFirst === "out"
                  ? "OUT_2B"
                  : "HELD",
        second: !gameState.bases.second
          ? null
          : effectiveRunnerData?.fromSecond === "home"
            ? "SCORED"
            : effectiveRunnerData?.fromSecond === "third"
              ? "TO_3B"
              : effectiveRunnerData?.fromSecond === "out"
                ? "OUT_3B"
                : "HELD",
        third: !gameState.bases.third
          ? null
          : effectiveRunnerData?.fromThird === "home"
            ? "SCORED"
            : effectiveRunnerData?.fromThird === "out"
              ? "OUT_HOME"
              : "HELD",
      };

      const correction = autoCorrectResult(
        mappedResult,
        gameState.outs,
        gameState.bases,
        runnerOutcomesForCorrection,
      );
      const effectiveResult = correction
        ? correction.correctedResult
        : mappedResult;
      if (correction) {
        console.log(`[recordOut] MAJ-07: ${correction.explanation}`);
      }

      const runsInvalidatedByThirdOutRule = shouldInvalidateRunsOnThirdOut(
        outType,
        gameState.outs,
        outsOnPlay,
        gameState.bases,
        effectiveRunnerData,
      );
      // GAP-GT-6-A: Time play rule — user can override to negate runs when out was recorded before runner scored
      const runsInvalidated =
        runsInvalidatedByThirdOutRule || options?.forceNoRuns === true;
      const runsScored = runsInvalidated ? 0 : rawRunsScored;
      const homeScoreAfter = gameState.isTop
        ? gameState.homeScore
        : gameState.homeScore + runsScored;
      const awayScoreAfter = gameState.isTop
        ? gameState.awayScore + runsScored
        : gameState.awayScore;
      const endGameEvaluation = evaluateEndGameTrigger({
        inning: gameState.inning,
        isTop: gameState.isTop,
        homeScoreBefore: gameState.homeScore,
        awayScoreBefore: gameState.awayScore,
        homeScoreAfter,
        awayScoreAfter,
        context: "live_play",
      });
      const rbiCount = runsInvalidated
        ? 0
        : calculateRBIs(
            effectiveResult,
            runnerOutcomesForCorrection,
            gameState.bases,
          );

      // Create at-bat event
      const event: AtBatEvent = {
        eventId: `${gameState.gameId}_${newSequence}`,
        gameId: gameState.gameId,
        eventIndex: newSequence,
        timestamp: Date.now(),
        batterId: gameState.currentBatterId,
        batterName: gameState.currentBatterName,
        batterTeamId: battingTeamId,
        pitcherId: gameState.currentPitcherId,
        pitcherName: gameState.currentPitcherName,
        pitcherTeamId: pitchingTeamId,
        result: effectiveResult,
        rbiCount,
        runsScored,
        inning: gameState.inning,
        halfInning: gameState.isTop ? "TOP" : "BOTTOM",
        outs: gameState.outs,
        runners: {
          first: buildRunnerInfo(
            trackerBeforePlay,
            "first",
            !!gameState.bases.first,
            gameState.currentPitcherId,
          ),
          second: buildRunnerInfo(
            trackerBeforePlay,
            "second",
            !!gameState.bases.second,
            gameState.currentPitcherId,
          ),
          third: buildRunnerInfo(
            trackerBeforePlay,
            "third",
            !!gameState.bases.third,
            gameState.currentPitcherId,
          ),
        },
        awayScore: gameState.awayScore,
        homeScore: gameState.homeScore,
        outsAfter: Math.min(newOuts, 3),
        runnersAfter:
          newOuts >= 3
            ? { first: null, second: null, third: null }
            : buildRunnersAfter(outTracker),
        awayScoreAfter,
        homeScoreAfter,
        runnerOutcomes: buildEventRunnerOutcomes(
          trackerBeforePlay,
          gameState.bases,
          runnerOutcomesForCorrection,
          gameState.currentPitcherId,
        ),
        leverageIndex,
        // MAJ-12: WPA from win expectancy table
        ...(() => {
          const rAfter =
            newOuts >= 3
              ? { first: false, second: false, third: false }
              : (() => {
                  const ra = buildRunnersAfter(outTracker);
                  return {
                    first: !!ra.first,
                    second: !!ra.second,
                    third: !!ra.third,
                  };
                })();
          return calculateWPA(
            {
              inning: gameState.inning,
              isTop: gameState.isTop,
              outs: gameState.outs,
              bases: gameState.bases,
              homeScore: gameState.homeScore,
              awayScore: gameState.awayScore,
              totalInnings: totalInningsRef.current,
              extraInningRunner: extraInningRunnerRef.current,
              extraInningRunnerDelay: extraInningRunnerDelayRef.current,
            },
            {
              outs: newOuts,
              bases: rAfter,
              homeScore: gameState.isTop
                ? gameState.homeScore
                : gameState.homeScore + runsScored,
              awayScore: gameState.isTop
                ? gameState.awayScore + runsScored
                : gameState.awayScore,
            },
          );
        })(),
        ballInPlay: null,
        fameEvents: [],
        isLeadoff:
          gameState.outs === 0 &&
          !gameState.bases.first &&
          !gameState.bases.second &&
          !gameState.bases.third,
        isClutch,
        isWalkOff: endGameEvaluation.isWalkOff,
        ...buildContextSnapshot(effectiveResult, pitchCount),
        outsRecorded: outsOnPlay,
      };

      if (endGameEvaluation.shouldEndGame) {
        queueAutoEndGame();
      }

      await logAtBatEvent(event);
      pendingEnrichmentRef.current = undefined;

      // Update player stats — MAJ-07: use effectiveResult for corrected type
      const statResult = effectiveResult; // corrected: e.g. FO→SF, GO→DP
      setPlayerStats((prev) => {
        const newStats = new Map(prev);
        const batterStats = {
          ...(newStats.get(gameState.currentBatterId) ||
            createEmptyPlayerStats()),
        };
        batterStats.pa++;
        if (statResult !== "SF" && statResult !== "SAC") {
          batterStats.ab++;
        }
        if (statResult === "K" || statResult === "Kc" || statResult === "D3K") {
          batterStats.k++;
        }
        batterStats.rbi += rbiCount;
        if (statResult === "SF") {
          batterStats.sf++; // MAJ-11: Track sacrifice flies
        }
        if (statResult === "SAC") {
          batterStats.sh++; // MAJ-11: Track sacrifice bunts (SAC = SH in AtBatResult)
        }
        if (statResult === "DP") {
          batterStats.gidp++; // MAJ-11: Track grounded into double play
        }
        newStats.set(gameState.currentBatterId, batterStats);
        return newStats;
      });

      // Update pitcher stats — CRIT-02: Use tracker for ER attribution
      setPitcherStats((prev) => {
        const newStats = new Map(prev);
        const pStats = {
          ...(newStats.get(gameState.currentPitcherId) ||
            createEmptyPitcherStats()),
        };
        pStats.outsRecorded += outsOnPlay;
        pStats.battersFaced++;
        pStats.pitchCount += pitchCount;
        if (outType === "K" || outType === "Kc" || outType === "D3K") {
          pStats.strikeoutsThrown++;
        }
        pStats.consecutiveHRsAllowed = 0; // Out breaks HR streak
        // Note: runs/ER now attributed via tracker below (not to current pitcher blindly)
        newStats.set(gameState.currentPitcherId, pStats);
        return newStats;
      });
      creditFieldingOutsToPositions(outsOnPlay);
      // Attribute runs/ER to responsible pitcher via tracker
      if (!runsInvalidated && outScoredEvents.length > 0) {
        creditPlayerRunsForScoredEvents(
          outScoredEvents,
          setPlayerStats,
          createEmptyPlayerStats,
        );
        processTrackerScoredEvents(
          outScoredEvents,
          setPitcherStats,
          createEmptyPitcherStats,
        );
      }

      // Update scoreboard if runs scored (e.g., sac fly, DP with runner scoring from third)
      if (runsScored > 0) {
        setScoreboard((prev) => {
          const teamKey = gameState.isTop ? "away" : "home";
          const inningIdx = gameState.inning - 1;
          const newInnings = [...prev.innings];
          const currentInningScore = newInnings[inningIdx]?.[teamKey] || 0;
          newInnings[inningIdx] = {
            ...newInnings[inningIdx],
            [teamKey]: currentInningScore + runsScored,
          };
          return {
            ...prev,
            innings: newInnings,
            [teamKey]: {
              ...prev[teamKey],
              runs: prev[teamKey].runs + runsScored,
            },
          };
        });
      }

      if (
        evaluateEndGameTrigger({
          inning: gameState.inning,
          isTop: gameState.isTop,
          homeScoreBefore: gameState.homeScore,
          awayScoreBefore: gameState.awayScore,
          homeScoreAfter: gameState.isTop
            ? gameState.homeScore
            : gameState.homeScore + runsScored,
          awayScoreAfter: gameState.isTop
            ? gameState.awayScore + runsScored
            : gameState.awayScore,
          context: "live_play",
        }).shouldEndGame
      ) {
        queueAutoEndGame();
      }

      // Update game state (including bases from runnerData)
      setGameState((prev) => {
        // Start with current bases (runners don't automatically clear on outs)
        let newBases = { ...prev.bases };

        // Handle runner advancement from runnerData
        // If a runner moved or was put out, clear their origin base
        if (effectiveRunnerData) {
          // Clear origin bases for runners who moved
          if (effectiveRunnerData.fromFirst !== undefined)
            newBases.first = false;
          if (effectiveRunnerData.fromSecond !== undefined)
            newBases.second = false;
          if (effectiveRunnerData.fromThird !== undefined)
            newBases.third = false;

          // Set destination bases for runners who advanced safely
          if (effectiveRunnerData.fromFirst === "second")
            newBases.second = true;
          if (effectiveRunnerData.fromFirst === "third") newBases.third = true;
          if (effectiveRunnerData.fromSecond === "third") newBases.third = true;
          // Note: 'home' and 'out' don't set any base
        }

        // FC special case: Batter reaches first base
        if (outType === "FC") {
          newBases.first = true;
          console.log("[recordOut] FC: Batter reaches first base");
        }

        // On DP/TP, typically bases are cleared based on the play
        // The runnerData should already reflect who was put out

        return {
          ...prev,
          balls: 0,
          strikes: 0,
          outs: newOuts,
          bases: newBases,
          awayScore: prev.isTop ? prev.awayScore + runsScored : prev.awayScore,
          homeScore: prev.isTop ? prev.homeScore : prev.homeScore + runsScored,
        };
      });

      // R3-05 fix: Always advance batter index so it points to NEXT batter due up
      // (previously skipped on 3rd out, causing off-by-one leadoff indicator)
      advanceToNextBatter();

      // Check for end of inning - auto-end on third out
      if (newOuts >= 3) {
        scheduleAutoEndInning();
      }

      setLastSavedAt(Date.now());
    },
    [
      advanceToNextBatter,
      atBatSequence,
      creditFieldingOutsToPositions,
      evaluateEndGameTrigger,
      gameState,
      getCurrentLeverageIndex,
      queueAutoEndGame,
      scheduleAutoEndInning,
    ],
  );

  const recordWalk = useCallback(
    async (walkType: WalkType, pitchCount: number = 4) => {
      const newSequence = atBatSequence + 1;
      setAtBatSequence(newSequence);

      const battingTeamId = gameState.isTop
        ? gameState.awayTeamId
        : gameState.homeTeamId;
      const pitchingTeamId = gameState.isTop
        ? gameState.homeTeamId
        : gameState.awayTeamId;

      // Check for bases loaded walk
      const basesLoaded =
        gameState.bases.first &&
        gameState.bases.second &&
        gameState.bases.third;
      const runsScored = basesLoaded ? 1 : 0;

      // CRIT-02: Update runner tracker for walk (force-advance pattern)
      const walkScoredEvents: RunnerScoredEvent[] = [];
      const trackerBeforePlay = syncTrackerPitcher(
        runnerTrackerRef.current,
        gameState.currentPitcherId,
        gameState.currentPitcherName,
      );
      let walkTracker = trackerBeforePlay;

      // Force-advance runners (process in order: third → second → first to avoid collision)
      if (basesLoaded) {
        const r3 = findRunnerOnBase(walkTracker, "third");
        if (r3) {
          const res = trackerAdvanceRunner(walkTracker, r3, "HOME");
          walkTracker = res.state;
          if (res.scoredEvent) walkScoredEvents.push(res.scoredEvent);
        }
      }
      if (gameState.bases.first && gameState.bases.second) {
        const r2 = findRunnerOnBase(walkTracker, "second");
        if (r2) {
          const res = trackerAdvanceRunner(walkTracker, r2, "3B");
          walkTracker = res.state;
        }
      }
      if (gameState.bases.first) {
        const r1 = findRunnerOnBase(walkTracker, "first");
        if (r1) {
          const res = trackerAdvanceRunner(walkTracker, r1, "2B");
          walkTracker = res.state;
        }
      }

      // Add batter to first base
      const walkHow: HowReached = walkType === "HBP" ? "HBP" : "walk";
      walkTracker = trackerAddRunner(
        walkTracker,
        gameState.currentBatterId,
        gameState.currentBatterName,
        "1B",
        walkHow,
      );
      walkTracker = trackerNextAtBat(walkTracker);
      runnerTrackerRef.current = walkTracker;
      // R3-R8: Increment runner identity version so batting lineup runner markers update
      setRunnerIdentityVersion((v) => v + 1);

      const leverageIndex = getCurrentLeverageIndex();

      const homeScoreAfter = gameState.isTop
        ? gameState.homeScore
        : gameState.homeScore + runsScored;
      const awayScoreAfter = gameState.isTop
        ? gameState.awayScore + runsScored
        : gameState.awayScore;
      const endGameEvaluation = evaluateEndGameTrigger({
        inning: gameState.inning,
        isTop: gameState.isTop,
        homeScoreBefore: gameState.homeScore,
        awayScoreBefore: gameState.awayScore,
        homeScoreAfter,
        awayScoreAfter,
        context: "live_play",
      });

      if (endGameEvaluation.shouldEndGame) {
        queueAutoEndGame();
      }

      // Clutch = high leverage (LI >= 1.5)
      const isClutch = leverageIndex >= 1.5;
      const walkRunnerOutcomes: {
        first: RunnerOutcome | null;
        second: RunnerOutcome | null;
        third: RunnerOutcome | null;
      } = {
        first: gameState.bases.first ? "TO_2B" : null,
        second: gameState.bases.second
          ? gameState.bases.first
            ? "TO_3B"
            : "HELD"
          : null,
        third: gameState.bases.third ? (basesLoaded ? "SCORED" : "HELD") : null,
      };

      const event: AtBatEvent = {
        eventId: `${gameState.gameId}_${newSequence}`,
        gameId: gameState.gameId,
        eventIndex: newSequence,
        timestamp: Date.now(),
        batterId: gameState.currentBatterId,
        batterName: gameState.currentBatterName,
        batterTeamId: battingTeamId,
        pitcherId: gameState.currentPitcherId,
        pitcherName: gameState.currentPitcherName,
        pitcherTeamId: pitchingTeamId,
        result: mapAtBatResultFromWalk(walkType),
        rbiCount: runsScored,
        runsScored,
        inning: gameState.inning,
        halfInning: gameState.isTop ? "TOP" : "BOTTOM",
        outs: gameState.outs,
        runners: {
          first: buildRunnerInfo(
            trackerBeforePlay,
            "first",
            !!gameState.bases.first,
            gameState.currentPitcherId,
          ),
          second: buildRunnerInfo(
            trackerBeforePlay,
            "second",
            !!gameState.bases.second,
            gameState.currentPitcherId,
          ),
          third: buildRunnerInfo(
            trackerBeforePlay,
            "third",
            !!gameState.bases.third,
            gameState.currentPitcherId,
          ),
        },
        awayScore: gameState.awayScore,
        homeScore: gameState.homeScore,
        outsAfter: gameState.outs,
        runnersAfter: buildRunnersAfter(walkTracker),
        awayScoreAfter,
        homeScoreAfter,
        runnerOutcomes: buildEventRunnerOutcomes(
          trackerBeforePlay,
          gameState.bases,
          walkRunnerOutcomes,
          gameState.currentPitcherId,
        ),
        leverageIndex,
        // MAJ-12: WPA from win expectancy table
        ...(() => {
          const rAfter = buildRunnersAfter(walkTracker);
          return calculateWPA(
            {
              inning: gameState.inning,
              isTop: gameState.isTop,
              outs: gameState.outs,
              bases: gameState.bases,
              homeScore: gameState.homeScore,
              awayScore: gameState.awayScore,
              totalInnings: totalInningsRef.current,
              extraInningRunner: extraInningRunnerRef.current,
              extraInningRunnerDelay: extraInningRunnerDelayRef.current,
            },
            {
              outs: gameState.outs,
              bases: {
                first: !!rAfter.first,
                second: !!rAfter.second,
                third: !!rAfter.third,
              },
              homeScore: homeScoreAfter,
              awayScore: awayScoreAfter,
            },
          );
        })(),
        ballInPlay: null,
        fameEvents: [],
        isLeadoff: false,
        isClutch,
        isWalkOff: endGameEvaluation.isWalkOff,
        ...buildContextSnapshot(mapAtBatResultFromWalk(walkType), pitchCount),
      };

      await logAtBatEvent(event);
      pendingEnrichmentRef.current = undefined;

      // Update player stats — MAJ-07: Track HBP separately from BB
      setPlayerStats((prev) => {
        const newStats = new Map(prev);
        const batterStats = {
          ...(newStats.get(gameState.currentBatterId) ||
            createEmptyPlayerStats()),
        };
        batterStats.pa++;
        if (walkType === "HBP") {
          batterStats.hbp = (batterStats.hbp || 0) + 1;
        } else {
          batterStats.bb++; // BB and IBB count as walks for batter
        }
        if (basesLoaded) batterStats.rbi++;
        newStats.set(gameState.currentBatterId, batterStats);
        return newStats;
      });

      // Update pitcher stats — CRIT-02: Use tracker for ER attribution on walks
      // MAJ-07: Track HBP/IBB separately from BB
      setPitcherStats((prev) => {
        const newStats = new Map(prev);
        const pStats = {
          ...(newStats.get(gameState.currentPitcherId) ||
            createEmptyPitcherStats()),
        };
        if (walkType === "HBP") {
          pStats.hitByPitch++;
        } else if (walkType === "IBB") {
          pStats.intentionalWalks++;
        } else {
          pStats.walksAllowed++; // BB only
        }
        if (basesLoaded) {
          pStats.basesLoadedWalks++;
        }
        pStats.battersFaced++;
        pStats.pitchCount += pitchCount;
        // Note: runs/ER attributed via tracker below (runner on 3rd may be inherited)
        newStats.set(gameState.currentPitcherId, pStats);
        return newStats;
      });
      // Attribute runs/ER to responsible pitcher via tracker
      if (walkScoredEvents.length > 0) {
        creditPlayerRunsForScoredEvents(
          walkScoredEvents,
          setPlayerStats,
          createEmptyPlayerStats,
        );
        processTrackerScoredEvents(
          walkScoredEvents,
          setPitcherStats,
          createEmptyPitcherStats,
        );
      }

      // Update scoreboard - walks do NOT count as hits, only update runs if bases loaded
      // FIX: This was missing entirely - walks weren't updating the scoreboard at all
      if (runsScored > 0) {
        setScoreboard((prev) => {
          const teamKey = gameState.isTop ? "away" : "home";
          const inningIdx = gameState.inning - 1;
          const newInnings = [...prev.innings];
          const currentInningScore = newInnings[inningIdx]?.[teamKey] || 0;
          newInnings[inningIdx] = {
            ...newInnings[inningIdx],
            [teamKey]: currentInningScore + runsScored,
          };
          return {
            ...prev,
            innings: newInnings,
            [teamKey]: {
              ...prev[teamKey],
              runs: prev[teamKey].runs + runsScored,
              // NOTE: walks do NOT increment hits - this is correct
            },
          };
        });
      }

      // Update bases - everyone advances if forced
      setGameState((prev) => ({
        ...prev,
        balls: 0,
        strikes: 0,
        bases: {
          first: true, // Batter takes first
          second: prev.bases.first || prev.bases.second,
          third: (prev.bases.first && prev.bases.second) || prev.bases.third,
        },
        awayScore: prev.isTop ? prev.awayScore + runsScored : prev.awayScore,
        homeScore: prev.isTop ? prev.homeScore : prev.homeScore + runsScored,
      }));

      advanceToNextBatter();
      setLastSavedAt(Date.now());
    },
    [
      advanceToNextBatter,
      atBatSequence,
      evaluateEndGameTrigger,
      gameState,
      getCurrentLeverageIndex,
      queueAutoEndGame,
    ],
  );

  /**
   * Record Dropped Third Strike (D3K)
   * FIX: BUG-004 - Proper D3K handling instead of using recordWalk as workaround
   *
   * D3K rules:
   * - Pitcher ALWAYS gets the strikeout (K stat)
   * - Batter ALWAYS gets the strikeout (K stat)
   * - If batterReached = true: batter reaches first, NO out recorded
   * - If batterReached = false: out is recorded
   * - D3K is legal when: first base empty OR 2 outs
   */
  const recordD3K = useCallback(
    async (
      batterReached: boolean,
      runnerData?: RunnerAdvancement,
      pitchCount: number = 3,
      dropReason?: "wild_pitch" | "passed_ball",
    ) => {
      const newSequence = atBatSequence + 1;
      setAtBatSequence(newSequence);

      // Track strikeout for immaculate inning detection (D3K is a strikeout)
      inningPitchesRef.current.strikeouts++;

      const battingTeamId = gameState.isTop
        ? gameState.awayTeamId
        : gameState.homeTeamId;
      const pitchingTeamId = gameState.isTop
        ? gameState.homeTeamId
        : gameState.awayTeamId;

      const result: AtBatResult =
        dropReason === "wild_pitch"
          ? "WP_K"
          : dropReason === "passed_ball"
            ? "PB_K"
            : "K";
      const newOuts = batterReached ? gameState.outs : gameState.outs + 1;
      const runsScored = [
        runnerData?.fromFirst,
        runnerData?.fromSecond,
        runnerData?.fromThird,
      ].filter((destination) => destination === "home").length;
      const homeScoreAfter = gameState.isTop
        ? gameState.homeScore
        : gameState.homeScore + runsScored;
      const awayScoreAfter = gameState.isTop
        ? gameState.awayScore + runsScored
        : gameState.awayScore;
      const endGameEvaluation = evaluateEndGameTrigger({
        inning: gameState.inning,
        isTop: gameState.isTop,
        homeScoreBefore: gameState.homeScore,
        awayScoreBefore: gameState.awayScore,
        homeScoreAfter,
        awayScoreAfter,
        context: "live_play",
      });

      // Update runner tracker BEFORE event creation so runnersAfter is correct
      const d3kScoredEvents: RunnerScoredEvent[] = [];
      const trackerBeforePlay = syncTrackerPitcher(
        runnerTrackerRef.current,
        gameState.currentPitcherId,
        gameState.currentPitcherName,
      );
      let d3kTracker = trackerBeforePlay;
      if (runnerData) {
        for (const [base, dest] of [
          ["third", runnerData.fromThird],
          ["second", runnerData.fromSecond],
          ["first", runnerData.fromFirst],
        ] as const) {
          if (!dest) continue;
          const runnerId = findRunnerOnBase(
            d3kTracker,
            base as "first" | "second" | "third",
          );
          if (!runnerId) continue;

          if (dest === "out") {
            d3kTracker = trackerRunnerOut(d3kTracker, runnerId);
          } else {
            const result = trackerAdvanceRunner(
              d3kTracker,
              runnerId,
              destToTrackerBase(dest),
            );
            d3kTracker = result.state;
            if (result.scoredEvent) d3kScoredEvents.push(result.scoredEvent);
          }
        }
      }
      if (batterReached) {
        d3kTracker = trackerAddRunner(
          d3kTracker,
          gameState.currentBatterId,
          gameState.currentBatterName,
          "1B",
          "error",
        );
      }
      d3kTracker = trackerNextAtBat(d3kTracker);
      runnerTrackerRef.current = d3kTracker;
      // R3-R8: Increment runner identity version so batting lineup runner markers update
      setRunnerIdentityVersion((v) => v + 1);

      const runnerOutcomesForCorrection: {
        first: RunnerOutcome | null;
        second: RunnerOutcome | null;
        third: RunnerOutcome | null;
      } = {
        first: !gameState.bases.first
          ? null
          : runnerData?.fromFirst === "home"
            ? "SCORED"
            : runnerData?.fromFirst === "third"
              ? "TO_3B"
              : runnerData?.fromFirst === "second"
                ? "TO_2B"
                : runnerData?.fromFirst === "out"
                  ? "OUT_2B"
                  : "HELD",
        second: !gameState.bases.second
          ? null
          : runnerData?.fromSecond === "home"
            ? "SCORED"
            : runnerData?.fromSecond === "third"
              ? "TO_3B"
              : runnerData?.fromSecond === "out"
                ? "OUT_3B"
                : "HELD",
        third: !gameState.bases.third
          ? null
          : runnerData?.fromThird === "home"
            ? "SCORED"
            : runnerData?.fromThird === "out"
              ? "OUT_HOME"
              : "HELD",
      };
      const contextSnapshot = buildContextSnapshot(result, pitchCount);
      const enrichment = dropReason
        ? {
            ...(contextSnapshot.enrichment || {}),
            fieldingSequence: dropReason === "wild_pitch" ? [1] : [2],
            fieldingAttemptType: "routine" as const,
            errors: [
              {
                position: dropReason === "wild_pitch" ? 1 : 2,
                type: "fielding" as const,
              },
            ],
          }
        : contextSnapshot.enrichment;

      const event: AtBatEvent = {
        eventId: `${gameState.gameId}_${newSequence}`,
        gameId: gameState.gameId,
        eventIndex: newSequence,
        timestamp: Date.now(),
        batterId: gameState.currentBatterId,
        batterName: gameState.currentBatterName,
        batterTeamId: battingTeamId,
        pitcherId: gameState.currentPitcherId,
        pitcherName: gameState.currentPitcherName,
        pitcherTeamId: pitchingTeamId,
        result,
        rbiCount: 0,
        runsScored: 0,
        inning: gameState.inning,
        halfInning: gameState.isTop ? "TOP" : "BOTTOM",
        outs: gameState.outs, // Outs BEFORE the play
        runners: {
          first: buildRunnerInfo(
            trackerBeforePlay,
            "first",
            !!gameState.bases.first,
            gameState.currentPitcherId,
          ),
          second: buildRunnerInfo(
            trackerBeforePlay,
            "second",
            !!gameState.bases.second,
            gameState.currentPitcherId,
          ),
          third: buildRunnerInfo(
            trackerBeforePlay,
            "third",
            !!gameState.bases.third,
            gameState.currentPitcherId,
          ),
        },
        awayScore: gameState.awayScore,
        homeScore: gameState.homeScore,
        outsAfter: newOuts,
        runnersAfter:
          newOuts >= 3
            ? { first: null, second: null, third: null }
            : buildRunnersAfter(d3kTracker),
        awayScoreAfter,
        homeScoreAfter,
        runnerOutcomes: buildEventRunnerOutcomes(
          trackerBeforePlay,
          gameState.bases,
          runnerOutcomesForCorrection,
          gameState.currentPitcherId,
        ),
        // D-05 FIX: Calculate leverageIndex from base-out state instead of hardcoding 1.0
        // Same pattern as recordHit (lines 1167-1173) and recordOut
        leverageIndex: getCurrentLeverageIndex(),
        // MAJ-12: WPA from win expectancy table
        ...(() => {
          const rAfter =
            newOuts >= 3
              ? { first: false, second: false, third: false }
              : (() => {
                  const ra = buildRunnersAfter(d3kTracker);
                  return {
                    first: !!ra.first,
                    second: !!ra.second,
                    third: !!ra.third,
                  };
                })();
          return calculateWPA(
            {
              inning: gameState.inning,
              isTop: gameState.isTop,
              outs: gameState.outs,
              bases: gameState.bases,
              homeScore: gameState.homeScore,
              awayScore: gameState.awayScore,
              totalInnings: totalInningsRef.current,
              extraInningRunner: extraInningRunnerRef.current,
              extraInningRunnerDelay: extraInningRunnerDelayRef.current,
            },
            {
              outs: newOuts,
              bases: rAfter,
              homeScore: gameState.isTop
                ? gameState.homeScore
                : gameState.homeScore + runsScored,
              awayScore: gameState.isTop
                ? gameState.awayScore + runsScored
                : gameState.awayScore,
            },
          );
        })(),
        ballInPlay: null,
        fameEvents: [],
        isLeadoff: false,
        isClutch: false,
        isWalkOff: endGameEvaluation.isWalkOff,
        ...contextSnapshot,
        enrichment,
      };

      if (endGameEvaluation.shouldEndGame) {
        queueAutoEndGame();
      }

      await logAtBatEvent(event);
      pendingEnrichmentRef.current = undefined;

      // Update batter stats - ALWAYS count K, PA, AB
      setPlayerStats((prev) => {
        const newStats = new Map(prev);
        const batterStats = {
          ...(newStats.get(gameState.currentBatterId) ||
            createEmptyPlayerStats()),
        };
        batterStats.pa++;
        batterStats.ab++; // K counts as AB
        batterStats.k++; // Always count the strikeout
        newStats.set(gameState.currentBatterId, batterStats);
        return newStats;
      });

      // Update pitcher stats - ALWAYS count K
      setPitcherStats((prev) => {
        const newStats = new Map(prev);
        const pStats = {
          ...(newStats.get(gameState.currentPitcherId) ||
            createEmptyPitcherStats()),
        };
        pStats.strikeoutsThrown++;
        pStats.battersFaced++;
        pStats.pitchCount += pitchCount;
        if (dropReason === "wild_pitch") {
          pStats.wildPitches++;
        }
        if (!batterReached) {
          pStats.outsRecorded++;
        }
        newStats.set(gameState.currentPitcherId, pStats);
        return newStats;
      });
      if (!batterReached) {
        creditFieldingOutsToPositions(1);
      }

      if (runsScored > 0) {
        creditPlayerRunsForScoredEvents(
          d3kScoredEvents,
          setPlayerStats,
          createEmptyPlayerStats,
        );
        processTrackerScoredEvents(
          d3kScoredEvents,
          setPitcherStats,
          createEmptyPitcherStats,
        );
      }

      if (runsScored > 0 || dropReason) {
        setScoreboard((prev) => {
          const fieldingTeamKey = gameState.isTop ? "home" : "away";
          const teamKey = gameState.isTop ? "away" : "home";
          const inningIdx = gameState.inning - 1;
          const newInnings = [...prev.innings];
          const currentInningScore = newInnings[inningIdx]?.[teamKey] || 0;
          if (runsScored > 0) {
            newInnings[inningIdx] = {
              ...newInnings[inningIdx],
              [teamKey]: currentInningScore + runsScored,
            };
          }
          return {
            ...prev,
            innings: newInnings,
            [teamKey]: {
              ...prev[teamKey],
              runs: prev[teamKey].runs + runsScored,
            },
            [fieldingTeamKey]: {
              ...prev[fieldingTeamKey],
              errors: prev[fieldingTeamKey].errors + (dropReason ? 1 : 0),
            },
          };
        });
      }

      // (Runner tracker already updated before event creation above)

      // Update game state
      setGameState((prev) => {
        const newBases = { ...prev.bases };
        if (runnerData) {
          if (runnerData.fromFirst !== undefined) newBases.first = false;
          if (runnerData.fromSecond !== undefined) newBases.second = false;
          if (runnerData.fromThird !== undefined) newBases.third = false;

          if (runnerData.fromFirst === "second") newBases.second = true;
          if (runnerData.fromFirst === "third") newBases.third = true;
          if (runnerData.fromSecond === "third") newBases.third = true;
        }

        if (batterReached) {
          newBases.first = true;
        }

        return {
          ...prev,
          balls: 0,
          strikes: 0,
          outs: newOuts,
          bases: newBases,
          awayScore: prev.isTop ? prev.awayScore + runsScored : prev.awayScore,
          homeScore: prev.isTop ? prev.homeScore : prev.homeScore + runsScored,
        };
      });

      // R3-05 fix: Always advance batter index so it points to NEXT batter due up
      advanceToNextBatter();

      // Check for end of inning - auto-end on third out
      if (newOuts >= 3) {
        scheduleAutoEndInning();
      }

      setLastSavedAt(Date.now());
      console.log(
        `[useGameState] D3K recorded: batterReached=${batterReached}, K counted, ${batterReached ? "no out" : "out recorded"}`,
      );
    },
    [
      advanceToNextBatter,
      atBatSequence,
      buildContextSnapshot,
      creditFieldingOutsToPositions,
      evaluateEndGameTrigger,
      gameState,
      getCurrentLeverageIndex,
      processTrackerScoredEvents,
      queueAutoEndGame,
      scheduleAutoEndInning,
    ],
  );

  // Record batter reaching base on fielding error
  const recordError = useCallback(
    async (
      rbi: number = 0,
      runnerData?: RunnerAdvancement,
      pitchCount: number = 1,
    ) => {
      const newSequence = atBatSequence + 1;
      setAtBatSequence(newSequence);

      const battingTeamId = gameState.isTop
        ? gameState.awayTeamId
        : gameState.homeTeamId;
      const pitchingTeamId = gameState.isTop
        ? gameState.homeTeamId
        : gameState.awayTeamId;
      const fieldingTeamKey = gameState.isTop ? "home" : "away"; // Fielding team commits error

      // Calculate runs scored from runners advancing
      let runsScored = 0;
      if (runnerData?.fromFirst === "home") runsScored++;
      if (runnerData?.fromSecond === "home") runsScored++;
      if (runnerData?.fromThird === "home") runsScored++;
      const homeScoreAfter = gameState.isTop
        ? gameState.homeScore
        : gameState.homeScore + runsScored;
      const awayScoreAfter = gameState.isTop
        ? gameState.awayScore + runsScored
        : gameState.awayScore;
      const endGameEvaluation = evaluateEndGameTrigger({
        inning: gameState.inning,
        isTop: gameState.isTop,
        homeScoreBefore: gameState.homeScore,
        awayScoreBefore: gameState.awayScore,
        homeScoreAfter,
        awayScoreAfter,
        context: "live_play",
      });

      // CRIT-02: Update runner tracker for errors
      const errorScoredEvents: RunnerScoredEvent[] = [];
      const trackerBeforePlay = syncTrackerPitcher(
        runnerTrackerRef.current,
        gameState.currentPitcherId,
        gameState.currentPitcherName,
      );
      let errorTracker = trackerBeforePlay;

      if (runnerData) {
        for (const [base, dest] of [
          ["third", runnerData.fromThird],
          ["second", runnerData.fromSecond],
          ["first", runnerData.fromFirst],
        ] as const) {
          if (!dest) continue;
          const runnerId = findRunnerOnBase(
            errorTracker,
            base as "first" | "second" | "third",
          );
          if (!runnerId) continue;

          if (dest === "out") {
            errorTracker = trackerRunnerOut(errorTracker, runnerId);
          } else {
            const trackerDest = destToTrackerBase(dest);
            const result = trackerAdvanceRunner(
              errorTracker,
              runnerId,
              trackerDest,
            );
            errorTracker = result.state;
            if (result.scoredEvent) errorScoredEvents.push(result.scoredEvent);
          }
        }
      }

      // Batter reaches first on error
      errorTracker = trackerAddRunner(
        errorTracker,
        gameState.currentBatterId,
        gameState.currentBatterName,
        "1B",
        "error",
      );
      errorTracker = trackerNextAtBat(errorTracker);
      runnerTrackerRef.current = errorTracker;
      // R3-R8: Increment runner identity version so batting lineup runner markers update
      setRunnerIdentityVersion((v) => v + 1);
      const runnerOutcomesForError: {
        first: RunnerOutcome | null;
        second: RunnerOutcome | null;
        third: RunnerOutcome | null;
      } = {
        first: !gameState.bases.first
          ? null
          : runnerData?.fromFirst === "home"
            ? "SCORED"
            : runnerData?.fromFirst === "third"
              ? "TO_3B"
              : runnerData?.fromFirst === "second"
                ? "TO_2B"
                : runnerData?.fromFirst === "out"
                  ? "OUT_2B"
                  : "TO_2B",
        second: !gameState.bases.second
          ? null
          : runnerData?.fromSecond === "home"
            ? "SCORED"
            : runnerData?.fromSecond === "third"
              ? "TO_3B"
              : runnerData?.fromSecond === "out"
                ? "OUT_3B"
                : "TO_3B",
        third: !gameState.bases.third
          ? null
          : runnerData?.fromThird === "home"
            ? "SCORED"
            : runnerData?.fromThird === "out"
              ? "OUT_HOME"
              : "SCORED",
      };

      const event: AtBatEvent = {
        eventId: `${gameState.gameId}_${newSequence}`,
        gameId: gameState.gameId,
        eventIndex: newSequence,
        timestamp: Date.now(),
        batterId: gameState.currentBatterId,
        batterName: gameState.currentBatterName,
        batterTeamId: battingTeamId,
        pitcherId: gameState.currentPitcherId,
        pitcherName: gameState.currentPitcherName,
        pitcherTeamId: pitchingTeamId,
        result: "E", // Reach on Error (E is the standard AtBatResult type)
        rbiCount: 0,
        runsScored,
        inning: gameState.inning,
        halfInning: gameState.isTop ? "TOP" : "BOTTOM",
        outs: gameState.outs,
        runners: {
          first: buildRunnerInfo(
            trackerBeforePlay,
            "first",
            !!gameState.bases.first,
            gameState.currentPitcherId,
          ),
          second: buildRunnerInfo(
            trackerBeforePlay,
            "second",
            !!gameState.bases.second,
            gameState.currentPitcherId,
          ),
          third: buildRunnerInfo(
            trackerBeforePlay,
            "third",
            !!gameState.bases.third,
            gameState.currentPitcherId,
          ),
        },
        awayScore: gameState.awayScore,
        homeScore: gameState.homeScore,
        outsAfter: gameState.outs,
        runnersAfter: buildRunnersAfter(errorTracker),
        awayScoreAfter,
        homeScoreAfter,
        runnerOutcomes: buildEventRunnerOutcomes(
          trackerBeforePlay,
          gameState.bases,
          runnerOutcomesForError,
          gameState.currentPitcherId,
        ),
        // MAJ-12: Calculate leverageIndex and WPA from game state
        leverageIndex: getCurrentLeverageIndex(),
        ...(() => {
          const rAfter = buildRunnersAfter(errorTracker);
          return calculateWPA(
            {
              inning: gameState.inning,
              isTop: gameState.isTop,
              outs: gameState.outs,
              bases: gameState.bases,
              homeScore: gameState.homeScore,
              awayScore: gameState.awayScore,
              totalInnings: totalInningsRef.current,
              extraInningRunner: extraInningRunnerRef.current,
              extraInningRunnerDelay: extraInningRunnerDelayRef.current,
            },
            {
              outs: gameState.outs,
              bases: {
                first: !!rAfter.first,
                second: !!rAfter.second,
                third: !!rAfter.third,
              },
              homeScore: gameState.isTop
                ? gameState.homeScore
                : gameState.homeScore + runsScored,
              awayScore: gameState.isTop
                ? gameState.awayScore + runsScored
                : gameState.awayScore,
            },
          );
        })(),
        ballInPlay: null,
        fameEvents: [],
        isLeadoff: false,
        isClutch: false,
        isWalkOff: endGameEvaluation.isWalkOff,
        ...buildContextSnapshot("E" as AtBatResult, pitchCount),
      };

      if (endGameEvaluation.shouldEndGame) {
        queueAutoEndGame();
      }

      await logAtBatEvent(event);
      pendingEnrichmentRef.current = undefined;

      // Update player stats (PA but no AB for ROE)
      setPlayerStats((prev) => {
        const newStats = new Map(prev);
        const batterStats = {
          ...(newStats.get(gameState.currentBatterId) ||
            createEmptyPlayerStats()),
        };
        batterStats.pa++;
        batterStats.ab++; // Reach on error is an at-bat per Project Bible.
        // D-04 FIX: Errors NEVER credit RBI per baseball rules and calculateRBIs().
        // The rbi parameter is kept in the signature for backward compat but ignored.
        // batterStats.rbi += rbi; // REMOVED — was D-04 bug
        newStats.set(gameState.currentBatterId, batterStats);
        return newStats;
      });

      // Update pitcher stats — CRIT-02: Use tracker for ER attribution on errors
      setPitcherStats((prev) => {
        const newStats = new Map(prev);
        const pStats = {
          ...(newStats.get(gameState.currentPitcherId) ||
            createEmptyPitcherStats()),
        };
        pStats.battersFaced++;
        pStats.pitchCount += pitchCount;
        // Note: runs/ER attributed via tracker (runner who scored may have been from a different pitcher)
        newStats.set(gameState.currentPitcherId, pStats);
        return newStats;
      });
      // Attribute runs/ER to responsible pitcher via tracker
      // The tracker correctly marks error-reached runners as unearned runs
      if (errorScoredEvents.length > 0) {
        creditPlayerRunsForScoredEvents(
          errorScoredEvents,
          setPlayerStats,
          createEmptyPlayerStats,
        );
        processTrackerScoredEvents(
          errorScoredEvents,
          setPitcherStats,
          createEmptyPitcherStats,
        );
      }

      // Update scoreboard - increment errors for fielding team
      setScoreboard((prev) => {
        const teamKey = gameState.isTop ? "away" : "home";
        const inningIdx = gameState.inning - 1;
        const newInnings = [...prev.innings];
        const currentInningScore = newInnings[inningIdx]?.[teamKey] || 0;
        newInnings[inningIdx] = {
          ...newInnings[inningIdx],
          [teamKey]: currentInningScore + runsScored,
        };
        return {
          ...prev,
          innings: newInnings,
          [teamKey]: {
            ...prev[teamKey],
            runs: prev[teamKey].runs + runsScored,
          },
          // Increment errors for the fielding team
          [fieldingTeamKey]: {
            ...prev[fieldingTeamKey],
            errors: prev[fieldingTeamKey].errors + 1,
          },
        };
      });

      // Update game state - batter takes first base, runners advance per runnerData
      setGameState((prev) => {
        // Start with current bases, then apply movements
        let newFirst = true; // Batter reaches first on error
        let newSecond = prev.bases.second; // Default: stay
        let newThird = prev.bases.third; // Default: stay

        // Handle runner advancement from runnerData
        if (runnerData) {
          // R1 movement
          if (prev.bases.first) {
            if (runnerData.fromFirst === "second") {
              newSecond = true;
              // First base now has batter
            } else if (runnerData.fromFirst === "third") {
              newThird = true;
            } else if (
              runnerData.fromFirst === "home" ||
              runnerData.fromFirst === "out"
            ) {
              // First vacated, batter takes it
            } else {
              // R1 stays at first - but batter also reaches first!
              // This shouldn't happen (two people on first), default to R1 goes to second
              newSecond = true;
            }
          }

          // R2 movement
          if (prev.bases.second) {
            if (runnerData.fromSecond === "third") {
              newThird = true;
              newSecond = prev.bases.first && runnerData.fromFirst === "second"; // Only occupied if R1 went there
            } else if (
              runnerData.fromSecond === "home" ||
              runnerData.fromSecond === "out"
            ) {
              // Second vacated
              newSecond = prev.bases.first && runnerData.fromFirst === "second";
            }
            // else R2 stays at second
          }

          // R3 movement (scores or holds)
          if (prev.bases.third) {
            if (
              runnerData.fromThird === "home" ||
              runnerData.fromThird === "out"
            ) {
              // Third vacated
              newThird = prev.bases.second && runnerData.fromSecond === "third";
            }
            // else R3 stays at third
          }
        } else {
          // No runner data - default behavior: runners advance one base
          if (prev.bases.third) newThird = false; // R3 scores
          if (prev.bases.second) {
            newThird = true;
            newSecond = false;
          } // R2 to third
          if (prev.bases.first) {
            newSecond = true;
          } // R1 to second
          // Batter to first (already set)
        }

        return {
          ...prev,
          balls: 0,
          strikes: 0,
          bases: { first: newFirst, second: newSecond, third: newThird },
          awayScore: prev.isTop ? prev.awayScore + runsScored : prev.awayScore,
          homeScore: prev.isTop ? prev.homeScore : prev.homeScore + runsScored,
        };
      });

      advanceToNextBatter();
      setLastSavedAt(Date.now());
      console.log(
        `[useGameState] Recorded error: ${fieldingTeamKey} team, ${runsScored} runs (unearned)`,
      );
    },
    [
      advanceToNextBatter,
      atBatSequence,
      evaluateEndGameTrigger,
      gameState,
      getCurrentLeverageIndex,
      queueAutoEndGame,
    ],
  );

  const recordEvent = useCallback(
    async (
      eventType: EventType,
      runnerId?: string,
      details?: BetweenPlayEventDetails,
    ) => {
      // Non-at-bat events like stolen bases, wild pitches, special events
      console.log(`[useGameState] recordEvent: ${eventType}`, runnerId);

      // Calculate base-out leverage index for Fame weighting
      // Encode bases as BaseState (0-7): 1=1st, 2=2nd, 4=3rd, combinations sum
      const li = details?.leverageIndex ?? getCurrentLeverageIndex();
      const fameMultiplier = Math.sqrt(li);

      // Fame base values per kbl-detection-philosophy.md and SPECIAL_EVENTS_SPEC.md
      // Formula: fameValue = baseFame × √LI × playoffMultiplier
      const FAME_VALUES: Record<string, number> = {
        // Fielding events (fielder receives Fame)
        WEB_GEM: 0.75, // Spectacular catch (0.8 < y ≤ 0.95)
        ROBBERY: 1.0, // HR denied at wall (y > 0.95) — CRIT-06: spec v3.3 standardized to +1

        // Baserunning events (runner receives Fame)
        // D-07 FIX: TOOTBLAN uses tiered fame, not flat -3.0.
        // Sentinel value — actual fame computed below based on rally-killer check.
        TOOTBLAN: -0.5, // Base value; overridden to -2.0 if rally killer

        // Comebacker events (batter receives Fame)
        KILLED: 3.0, // Killed pitcher (+3 Fame to batter)
        NUTSHOT: 1.0, // Nut shot (+1 Fame to batter)
        KILLED_PITCHER: 3.0, // Alias for KILLED
        NUT_SHOT: 1.0, // Alias for NUTSHOT

        // Informational events (no Fame impact, just tracking)
        BEAT_THROW: 0, // Infield hit - beat the throw (speed)
        BUNT: 0, // Bunt single (recorded but no Fame)
        STRIKEOUT: 0, // K swinging
        STRIKEOUT_LOOKING: 0, // K looking
        DROPPED_3RD_STRIKE: 0, // D3K
        SEVEN_PLUS_PITCH_AB: 0, // Tough AB (7+ pitches)
      };

      if (
        FAME_VALUES[eventType] !== undefined &&
        FAME_VALUES[eventType] !== 0
      ) {
        let baseFame = FAME_VALUES[eventType];

        // D-07 FIX: TOOTBLAN tiered fame per SPECIAL_EVENTS_SPEC.md
        // Rally killer: runner was in scoring position (2B or 3B) with <2 outs → -2.0
        // Standard: -0.5
        if (eventType === "TOOTBLAN") {
          const isRallyKiller =
            (gameState.bases.second || gameState.bases.third) &&
            gameState.outs < 2;
          baseFame = isRallyKiller ? -2.0 : -0.5;
        }

        const adjustedFame = baseFame * fameMultiplier;

        // Determine who receives the Fame
        let recipientId = "";
        let recipientName = "";

        if (
          eventType === "TOOTBLAN" ||
          eventType === "SB" ||
          eventType === "CS"
        ) {
          // Baserunning events - runner receives Fame
          recipientId = runnerId || "";
          recipientName = runnerId || "Unknown Runner";
        } else if (eventType === "WEB_GEM" || eventType === "ROBBERY") {
          // Fielding events - fielder receives Fame (would need fielder ID)
          recipientId = details?.actorId || runnerId || "fielder";
          recipientName = details?.actorName || runnerId || "Fielder";
        } else {
          // Default: batter receives Fame (KILLED, NUTSHOT, etc.)
          recipientId = details?.actorId || gameState.currentBatterId;
          recipientName = details?.actorName || gameState.currentBatterName;
        }

        const fameEvent: FameEventRecord = {
          eventType,
          fameType: adjustedFame >= 0 ? "bonus" : "boner",
          fameValue: Math.abs(adjustedFame),
          playerId: recipientId,
          playerName: recipientName,
          description: `${eventType} in inning ${details?.inning || gameState.inning} (LI: ${li.toFixed(2)})`,
        };

        appendFameEvent(fameEvent);
        console.log(
          `[Fame] Recorded: ${eventType} for ${recipientName}, value=${adjustedFame.toFixed(2)} (${fameEvent.fameType})`,
        );
      }

      // Update player stats for SB/CS
      if (eventType === "SB" && runnerId) {
        setPlayerStats((prev) => {
          const stats = prev.get(runnerId) || createEmptyPlayerStats();
          const updated = new Map(prev);
          updated.set(runnerId, { ...stats, sb: stats.sb + 1 });
          return updated;
        });
        console.log(`[useGameState] Recorded SB for runner: ${runnerId}`);
      }

      if (eventType === "CS" && runnerId) {
        setPlayerStats((prev) => {
          const stats = prev.get(runnerId) || createEmptyPlayerStats();
          const updated = new Map(prev);
          updated.set(runnerId, { ...stats, cs: stats.cs + 1 });
          return updated;
        });
        console.log(`[useGameState] Recorded CS for runner: ${runnerId}`);
      }

      // MAJ-07: Track WP in pitcher stats
      if (eventType === "WP") {
        setPitcherStats((prev) => {
          const newStats = new Map(prev);
          const pStats = {
            ...(newStats.get(gameState.currentPitcherId) ||
              createEmptyPitcherStats()),
          };
          pStats.wildPitches++;
          newStats.set(gameState.currentPitcherId, pStats);
          return newStats;
        });
      }

      const resolvedRunnerId = runnerId || details?.runnerId;
      const resolvedRunnerName = resolvePlayerNameForId(
        resolvedRunnerId,
        details?.runnerName,
      );
      const fromBaseNumber = originBaseToNumber(details?.fromBase);
      const toBaseNumber = destinationBaseToNumber(details?.toBase);

      if (
        eventType === "SB" &&
        resolvedRunnerId &&
        fromBaseNumber &&
        toBaseNumber
      ) {
        await persistBetweenPlayEvent({
          type: "stolen_base",
          stolenBase: {
            runnerId: resolvedRunnerId,
            runnerName: resolvedRunnerName,
            fromBase: fromBaseNumber,
            toBase: toBaseNumber,
            isSuccessful: true,
            caughtBy: details?.fielderPosition,
          },
          runnerAction: {
            runnerId: resolvedRunnerId,
            runnerName: resolvedRunnerName,
            fromBase: fromBaseNumber,
            toBase: toBaseNumber,
            outcome: "safe",
            reason: "stolen_base",
          },
          runnerAttribution: {
            pitcherId: details?.pitcherId || gameState.currentPitcherId,
            pitcherName: resolvePlayerNameForId(
              details?.pitcherId || gameState.currentPitcherId,
              details?.pitcherName,
            ),
            catcherId: details?.catcherId || gameState.currentCatcherId,
            catcherName: resolvePlayerNameForId(
              details?.catcherId || gameState.currentCatcherId,
              details?.catcherName,
            ),
            fielderId: details?.fielderId,
            fielderName: resolvePlayerNameForId(
              details?.fielderId,
              details?.fielderName,
            ),
            fielderPosition: details?.fielderPosition,
          },
        });
      } else if (
        eventType === "CS" &&
        resolvedRunnerId &&
        fromBaseNumber &&
        toBaseNumber
      ) {
        await persistBetweenPlayEvent({
          type: "caught_stealing",
          stolenBase: {
            runnerId: resolvedRunnerId,
            runnerName: resolvedRunnerName,
            fromBase: fromBaseNumber,
            toBase: toBaseNumber,
            isSuccessful: false,
            caughtBy: details?.fielderPosition,
          },
          runnerAction: {
            runnerId: resolvedRunnerId,
            runnerName: resolvedRunnerName,
            fromBase: fromBaseNumber,
            toBase: toBaseNumber,
            outcome: "out",
            reason: "caught_stealing",
          },
          runnerAttribution: {
            pitcherId: details?.pitcherId || gameState.currentPitcherId,
            pitcherName: resolvePlayerNameForId(
              details?.pitcherId || gameState.currentPitcherId,
              details?.pitcherName,
            ),
            catcherId: details?.catcherId || gameState.currentCatcherId,
            catcherName: resolvePlayerNameForId(
              details?.catcherId || gameState.currentCatcherId,
              details?.catcherName,
            ),
            fielderId: details?.fielderId,
            fielderName: resolvePlayerNameForId(
              details?.fielderId,
              details?.fielderName,
            ),
            fielderPosition: details?.fielderPosition,
          },
        });
      } else if (
        (eventType === "PICK" ||
          eventType === "PICK_SAFE" ||
          eventType === "PICK_E") &&
        resolvedRunnerId &&
        fromBaseNumber
      ) {
        await persistBetweenPlayEvent({
          type: "pickoff",
          runnerAction: {
            runnerId: resolvedRunnerId,
            runnerName: resolvedRunnerName,
            fromBase: fromBaseNumber,
            toBase: toBaseNumber ?? fromBaseNumber,
            outcome: eventType === "PICK" ? "out" : "safe",
            reason: "pickoff",
          },
          runnerAttribution: {
            pitcherId: details?.pitcherId || gameState.currentPitcherId,
            pitcherName: resolvePlayerNameForId(
              details?.pitcherId || gameState.currentPitcherId,
              details?.pitcherName,
            ),
            catcherId: details?.catcherId || gameState.currentCatcherId,
            catcherName: resolvePlayerNameForId(
              details?.catcherId || gameState.currentCatcherId,
              details?.catcherName,
            ),
            fielderId: details?.fielderId,
            fielderName: resolvePlayerNameForId(
              details?.fielderId,
              details?.fielderName,
            ),
            fielderPosition: details?.fielderPosition,
          },
          errorChargedTo: eventType === "PICK_E" ? "pitcher" : undefined,
        });
        if (eventType === "PICK_E") {
          console.log("[R3-R5] Logged pickoff error with default attribution", {
            gameId: gameState.gameId,
            runnerId: resolvedRunnerId,
            pitcherId: details?.pitcherId || gameState.currentPitcherId,
          });
        }
      } else if (
        (eventType === "ADVANCE" || eventType === "ADVANCE_E") &&
        resolvedRunnerId &&
        fromBaseNumber &&
        toBaseNumber
      ) {
        const errorAttribution =
          eventType === "ADVANCE_E" && details?.errorType
            ? [{
                type: details.errorType,
                fielderIds: details.fielderId ? [details.fielderId] : undefined,
                positions: details.fielderPosition
                  ? [details.fielderPosition as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9]
                  : undefined,
              }]
            : undefined;
        await persistBetweenPlayEvent({
          type: "runner_advance",
          runnerAction: {
            runnerId: resolvedRunnerId,
            runnerName: resolvedRunnerName,
            fromBase: fromBaseNumber,
            toBase: toBaseNumber,
            outcome: details?.outcome || "safe",
            reason: eventType === "ADVANCE_E" ? "advance_on_error" : "advance",
          },
          runnerAttribution: {
            pitcherId: details?.pitcherId || gameState.currentPitcherId,
            pitcherName: resolvePlayerNameForId(
              details?.pitcherId || gameState.currentPitcherId,
              details?.pitcherName,
            ),
            catcherId: details?.catcherId || gameState.currentCatcherId,
            catcherName: resolvePlayerNameForId(
              details?.catcherId || gameState.currentCatcherId,
              details?.catcherName,
            ),
            fielderId: details?.fielderId,
            fielderName: resolvePlayerNameForId(
              details?.fielderId,
              details?.fielderName,
            ),
            fielderPosition: details?.fielderPosition,
          },
          errorAttributions: errorAttribution,
          errorChargedTo: eventType === "ADVANCE_E" ? "fielder" : undefined,
        });
      } else if (
        (eventType === "WP" || eventType === "PB") &&
        resolvedRunnerId &&
        fromBaseNumber &&
        toBaseNumber
      ) {
        const bpType: BetweenPlayEventType =
          eventType === "WP" ? "wild_pitch" : "passed_ball";
        await persistBetweenPlayEvent({
          type: bpType,
          wildPitchOrPassedBall: {
            wpOrPb: bpType,
            pitcherId: details?.pitcherId || gameState.currentPitcherId,
            catcherId: details?.catcherId || gameState.currentCatcherId,
            runnersAdvanced: [
              {
                runnerId: resolvedRunnerId,
                fromBase: fromBaseNumber,
                toBase: toBaseNumber,
              },
            ],
            runScored:
              details?.toBase === "home" ? resolvedRunnerId : undefined,
          },
          runnerAction: {
            runnerId: resolvedRunnerId,
            runnerName: resolvedRunnerName,
            fromBase: fromBaseNumber,
            toBase: toBaseNumber,
            outcome: "safe",
            reason: eventType === "WP" ? "wild_pitch" : "passed_ball",
          },
          runnerAttribution: {
            pitcherId: details?.pitcherId || gameState.currentPitcherId,
            pitcherName: resolvePlayerNameForId(
              details?.pitcherId || gameState.currentPitcherId,
              details?.pitcherName,
            ),
            catcherId: details?.catcherId || gameState.currentCatcherId,
            catcherName: resolvePlayerNameForId(
              details?.catcherId || gameState.currentCatcherId,
              details?.catcherName,
            ),
            fielderId: details?.fielderId,
            fielderName: resolvePlayerNameForId(
              details?.fielderId,
              details?.fielderName,
            ),
            fielderPosition: details?.fielderPosition,
          },
        });
      }
    },
    [
      appendFameEvent,
      gameState.bases,
      gameState.currentBatterId,
      gameState.currentBatterName,
      gameState.currentCatcherId,
      gameState.currentPitcherId,
      gameState.inning,
      gameState.outs,
      getCurrentLeverageIndex,
      persistBetweenPlayEvent,
      resolvePlayerNameForId,
    ],
  );

  const recordPlayerStateChange = useCallback(
    async (
      playerId: string,
      playerName: string,
      stateType: "mojo" | "fitness" | "injury",
      previousValue: string | number,
      newValue: string | number,
      reason?: string,
      options?: PlayerStateChangeOptions,
    ) => {
      const type: BetweenPlayEventType =
        options?.eventType ??
        (stateType === "mojo"
          ? "mojo_change"
          : stateType === "injury"
            ? "injury"
            : "fitness_change");
      return persistBetweenPlayEvent({
        type,
        linkedEventId: options?.linkedEventId,
        eventGroupId: options?.eventGroupId,
        playerStateChange: {
          playerId,
          playerName,
          stateType,
          previousValue,
          newValue,
          reason,
          sourceEventType: options?.sourceEventType,
          causedByPlayerId: options?.causedByPlayerId,
          causedByPlayerName: options?.causedByPlayerName,
          stayedIn: options?.stayedIn,
        },
      });
    },
    [persistBetweenPlayEvent],
  );

  const reassignRunnerEventAttribution = useCallback(
    async (
      eventId: string,
      updates: {
        pitcherId?: string;
        pitcherName?: string;
        catcherId?: string;
        catcherName?: string;
        fielderId?: string;
        fielderName?: string;
        fielderPosition?: number;
      },
    ): Promise<BetweenPlayEvent | null> => {
      const existing = await getBetweenPlayEvent(eventId);
      if (!existing?.runnerAction) {
        return null;
      }

      const previousPitcherId =
        existing.runnerAttribution?.pitcherId ||
        existing.wildPitchOrPassedBall?.pitcherId;
      const nextPitcherId = updates.pitcherId || previousPitcherId;
      const previousCatcherId =
        existing.runnerAttribution?.catcherId ||
        existing.wildPitchOrPassedBall?.catcherId;
      const nextCatcherId = updates.catcherId ?? previousCatcherId;
      const previousFielderId = existing.runnerAttribution?.fielderId;
      const nextFielderId = updates.fielderId ?? previousFielderId;
      const previousFielderPosition =
        existing.runnerAttribution?.fielderPosition;
      const nextFielderPosition =
        updates.fielderPosition ?? previousFielderPosition;

      const timestamp = Date.now();
      const editHistory: NonNullable<BetweenPlayEvent["editHistory"]> = [];
      if (nextPitcherId !== previousPitcherId) {
        editHistory.push({
          field: "runnerAttribution.pitcherId",
          oldValue: previousPitcherId,
          newValue: nextPitcherId,
          timestamp,
        });
      }
      if (nextCatcherId !== previousCatcherId) {
        editHistory.push({
          field: "runnerAttribution.catcherId",
          oldValue: previousCatcherId ?? null,
          newValue: nextCatcherId ?? null,
          timestamp,
        });
      }
      if (nextFielderId !== previousFielderId) {
        editHistory.push({
          field: "runnerAttribution.fielderId",
          oldValue: previousFielderId ?? null,
          newValue: nextFielderId ?? null,
          timestamp,
        });
      }
      if (nextFielderPosition !== previousFielderPosition) {
        editHistory.push({
          field: "runnerAttribution.fielderPosition",
          oldValue: previousFielderPosition ?? null,
          newValue: nextFielderPosition ?? null,
          timestamp,
        });
      }

      if (editHistory.length === 0) {
        return existing;
      }

      const nextEvent: BetweenPlayEvent = {
        ...existing,
        version: (existing.version ?? 1) + 1,
        editHistory: [...(existing.editHistory || []), ...editHistory],
        runnerAttribution: {
          ...existing.runnerAttribution,
          pitcherId: nextPitcherId,
          pitcherName: nextPitcherId
            ? updates.pitcherName ||
              existing.runnerAttribution?.pitcherName ||
              resolvePlayerNameForId(nextPitcherId)
            : undefined,
          catcherId: nextCatcherId,
          catcherName: nextCatcherId
            ? updates.catcherName ||
              existing.runnerAttribution?.catcherName ||
              resolvePlayerNameForId(nextCatcherId)
            : undefined,
          fielderId: nextFielderId,
          fielderName: nextFielderId
            ? updates.fielderName ||
              existing.runnerAttribution?.fielderName ||
              resolvePlayerNameForId(nextFielderId)
            : undefined,
          fielderPosition: nextFielderPosition,
        },
        wildPitchOrPassedBall: existing.wildPitchOrPassedBall
          ? {
              ...existing.wildPitchOrPassedBall,
              pitcherId:
                nextPitcherId || existing.wildPitchOrPassedBall.pitcherId,
              catcherId: nextCatcherId,
            }
          : undefined,
      };

      await updateBetweenPlayEvent(eventId, {
        version: nextEvent.version,
        editHistory,
        runnerAttribution: nextEvent.runnerAttribution,
        wildPitchOrPassedBall: nextEvent.wildPitchOrPassedBall,
      });

      if (
        existing.type === "wild_pitch" &&
        nextPitcherId &&
        previousPitcherId &&
        nextPitcherId !== previousPitcherId
      ) {
        setPitcherStats((prev) => {
          const next = new Map(prev);
          const previousStats = {
            ...(next.get(previousPitcherId) || createEmptyPitcherStats()),
          };
          previousStats.wildPitches = Math.max(
            0,
            previousStats.wildPitches - 1,
          );
          next.set(previousPitcherId, previousStats);

          const nextStats = {
            ...(next.get(nextPitcherId) || createEmptyPitcherStats()),
          };
          nextStats.wildPitches += 1;
          next.set(nextPitcherId, nextStats);
          return next;
        });
      }

      const teamSide =
        existing.gameState?.halfInning === "TOP" ? "home" : "away";
      if (nextPitcherId) {
        registerIdentityForSide(
          nextPitcherId,
          updates.pitcherName || resolvePlayerNameForId(nextPitcherId),
          teamSide,
        );
      }
      if (nextCatcherId) {
        registerIdentityForSide(
          nextCatcherId,
          updates.catcherName || resolvePlayerNameForId(nextCatcherId),
          teamSide,
        );
      }
      if (nextFielderId) {
        registerIdentityForSide(
          nextFielderId,
          updates.fielderName || resolvePlayerNameForId(nextFielderId),
          teamSide,
        );
      }

      return nextEvent;
    },
    [registerIdentityForSide, resolvePlayerNameForId],
  );

  const recordManagerMoment = useCallback(
    async (leverageIndex: number, decisionType: string, context?: string) => {
      await persistBetweenPlayEvent({
        type: "manager_moment",
        managerMoment: {
          leverageIndex,
          decisionType,
          context,
        },
      });
    },
    [persistBetweenPlayEvent],
  );

  const recordPromptedManagerDecision = useCallback(
    async (decision: PromptedManagerDecisionEvent) =>
      persistBetweenPlayEvent({
        type: "manager_moment",
        managerMoment: {
          leverageIndex: decision.leverageIndex ?? 0,
          decisionType: decision.decisionType,
          context:
            decision.recommendationId ||
            decision.provenanceKey ||
            decision.source,
        },
        promptedManagerDecision: decision,
      }),
    [persistBetweenPlayEvent],
  );

  const recordManagerRecommendationWatch = useCallback(
    async (watch: ManagerRecommendationWatchEvent) =>
      persistBetweenPlayEvent({
        type: "manager_recommendation",
        managerRecommendationWatch: watch,
      }),
    [persistBetweenPlayEvent],
  );

  const advanceRunner = useCallback(
    (
      from: "first" | "second" | "third",
      to: "second" | "third" | "home",
      outcome: "safe" | "out",
    ) => {
      // Calculate score change first so we can update both game state and scoreboard
      const runsScored = outcome === "safe" && to === "home" ? 1 : 0;

      // CRIT-02: Update runner tracker for individual runner advancement (WP, PB, SB, etc.)
      let advTracker = syncTrackerPitcher(
        runnerTrackerRef.current,
        gameState.currentPitcherId,
        gameState.currentPitcherName,
      );
      const runnerId = findRunnerOnBase(advTracker, from);
      if (runnerId) {
        if (outcome === "out") {
          advTracker = trackerRunnerOut(advTracker, runnerId);
        } else {
          const trackerDest = destToTrackerBase(to);
          const result = trackerAdvanceRunner(
            advTracker,
            runnerId,
            trackerDest,
          );
          advTracker = result.state;
          // Attribute scored run to responsible pitcher
          if (result.scoredEvent) {
            creditPlayerRunsForScoredEvents(
              [result.scoredEvent],
              setPlayerStats,
              createEmptyPlayerStats,
            );
            processTrackerScoredEvents(
              [result.scoredEvent],
              setPitcherStats,
              createEmptyPitcherStats,
            );
          }
        }
      }
      runnerTrackerRef.current = advTracker;

      setGameState((prev) => {
        const newBases = { ...prev.bases };
        let outsChange = 0;

        // Clear origin base
        if (from === "first") newBases.first = false;
        if (from === "second") newBases.second = false;
        if (from === "third") newBases.third = false;

        if (outcome === "safe") {
          if (to === "second") newBases.second = true;
          if (to === "third") newBases.third = true;
          // home is handled by runsScored
        } else {
          outsChange = 1;
        }

        return {
          ...prev,
          bases: newBases,
          outs: prev.outs + outsChange,
          awayScore: prev.isTop ? prev.awayScore + runsScored : prev.awayScore,
          homeScore: prev.isTop ? prev.homeScore : prev.homeScore + runsScored,
        };
      });

      // Update scoreboard inning scores if a run scored (fixes WP/PB runs not showing in line score)
      if (runsScored > 0) {
        setScoreboard((prev) => {
          const teamKey = gameState.isTop ? "away" : "home";
          const inningIdx = gameState.inning - 1;
          const newInnings = [...prev.innings];
          const currentInningScore = newInnings[inningIdx]?.[teamKey] || 0;
          newInnings[inningIdx] = {
            ...newInnings[inningIdx],
            [teamKey]: currentInningScore + runsScored,
          };
          return {
            ...prev,
            innings: newInnings,
            [teamKey]: {
              ...prev[teamKey],
              runs: prev[teamKey].runs + runsScored,
            },
          };
        });
      }

      const endGameEvaluation = evaluateEndGameTrigger({
        inning: gameState.inning,
        isTop: gameState.isTop,
        homeScoreBefore: gameState.homeScore,
        awayScoreBefore: gameState.awayScore,
        homeScoreAfter: gameState.isTop
          ? gameState.homeScore
          : gameState.homeScore + runsScored,
        awayScoreAfter: gameState.isTop
          ? gameState.awayScore + runsScored
          : gameState.awayScore,
        context: "live_play",
      });

      if (endGameEvaluation.shouldEndGame) {
        queueAutoEndGame();
      }

      // T0-03 FIX: Check if baserunning out (CS, pickoff, TOOTBLAN, etc.) caused 3rd out.
      // advanceRunner increments outs via setGameState but never checked for inning end.
      // Uses same pattern as recordOut (line 1826): setTimeout to let UI update before flip.
      if (outcome === "out" && gameState.outs + 1 >= 3) {
        console.log(
          "[advanceRunner] T0-03: Baserunning out caused 3rd out — triggering end of inning",
        );
        scheduleAutoEndInning();
      }
      if (outcome === "out") {
        creditFieldingOutsToPositions(1);
      }
    },
    [
      creditFieldingOutsToPositions,
      evaluateEndGameTrigger,
      gameState.isTop,
      gameState.inning,
      gameState.outs,
      gameState.currentPitcherId,
      gameState.currentPitcherName,
      queueAutoEndGame,
      scheduleAutoEndInning,
    ],
  );

  /**
   * Batch update runners - processes all movements atomically
   * This is needed for stolen base events where multiple runners may move
   * Processing them one at a time causes race conditions
   */
  const advanceRunnersBatch = useCallback(
    (
      movements: Array<{
        from: "first" | "second" | "third";
        to: "second" | "third" | "home" | "out";
        outcome: "safe" | "out";
      }>,
    ) => {
      if (movements.length === 0) return;

      console.log("[advanceRunnersBatch] Processing movements:", movements);

      // Calculate runs scored first so we can update scoreboard
      const runsScored = movements.filter(
        (m) => m.outcome === "safe" && m.to === "home",
      ).length;

      // CRIT-02: Update runner tracker for batch movements (SB, WP, PB, etc.)
      let batchTracker = syncTrackerPitcher(
        runnerTrackerRef.current,
        gameState.currentPitcherId,
        gameState.currentPitcherName,
      );
      const batchScoredEvents: RunnerScoredEvent[] = [];

      // Sort movements: process from third → second → first to avoid collision
      const sortedMovements = [...movements].sort((a, b) => {
        const order = { third: 0, second: 1, first: 2 };
        return order[a.from] - order[b.from];
      });

      for (const move of sortedMovements) {
        const runnerId = findRunnerOnBase(batchTracker, move.from);
        if (!runnerId) continue;

        if (move.outcome === "out") {
          batchTracker = trackerRunnerOut(batchTracker, runnerId);
        } else if (move.to === "out") {
          batchTracker = trackerRunnerOut(batchTracker, runnerId);
        } else {
          const trackerDest = destToTrackerBase(
            move.to as "second" | "third" | "home",
          );
          const result = trackerAdvanceRunner(
            batchTracker,
            runnerId,
            trackerDest,
          );
          batchTracker = result.state;
          if (result.scoredEvent) batchScoredEvents.push(result.scoredEvent);
        }
      }
      runnerTrackerRef.current = batchTracker;

      // Attribute runs/ER to responsible pitchers
      if (batchScoredEvents.length > 0) {
        creditPlayerRunsForScoredEvents(
          batchScoredEvents,
          setPlayerStats,
          createEmptyPlayerStats,
        );
        processTrackerScoredEvents(
          batchScoredEvents,
          setPitcherStats,
          createEmptyPitcherStats,
        );
      }

      setGameState((prev) => {
        // Start with all bases cleared for runners that moved
        const newBases = { ...prev.bases };
        let outsChange = 0;

        // First pass: clear all origin bases
        for (const move of movements) {
          if (move.from === "first") newBases.first = false;
          if (move.from === "second") newBases.second = false;
          if (move.from === "third") newBases.third = false;
        }

        // Second pass: set destination bases (only for safe runners)
        for (const move of movements) {
          if (move.outcome === "safe") {
            if (move.to === "second") newBases.second = true;
            if (move.to === "third") newBases.third = true;
            // home is handled by runsScored
          } else {
            // Runner is out
            outsChange++;
          }
        }

        console.log(
          "[advanceRunnersBatch] Result - bases:",
          newBases,
          "runs:",
          runsScored,
          "outs:",
          outsChange,
        );

        return {
          ...prev,
          bases: newBases,
          outs: prev.outs + outsChange,
          awayScore: prev.isTop ? prev.awayScore + runsScored : prev.awayScore,
          homeScore: prev.isTop ? prev.homeScore : prev.homeScore + runsScored,
        };
      });

      // Update scoreboard inning scores if runs scored (fixes WP/PB runs not showing in line score)
      if (runsScored > 0) {
        setScoreboard((prev) => {
          const teamKey = gameState.isTop ? "away" : "home";
          const inningIdx = gameState.inning - 1;
          const newInnings = [...prev.innings];
          const currentInningScore = newInnings[inningIdx]?.[teamKey] || 0;
          newInnings[inningIdx] = {
            ...newInnings[inningIdx],
            [teamKey]: currentInningScore + runsScored,
          };
          return {
            ...prev,
            innings: newInnings,
            [teamKey]: {
              ...prev[teamKey],
              runs: prev[teamKey].runs + runsScored,
            },
          };
        });
      }

      if (
        evaluateEndGameTrigger({
          inning: gameState.inning,
          isTop: gameState.isTop,
          homeScoreBefore: gameState.homeScore,
          awayScoreBefore: gameState.awayScore,
          homeScoreAfter: gameState.isTop
            ? gameState.homeScore
            : gameState.homeScore + runsScored,
          awayScoreAfter: gameState.isTop
            ? gameState.awayScore + runsScored
            : gameState.awayScore,
          context: "live_play",
        }).shouldEndGame
      ) {
        queueAutoEndGame();
      }

      // T0-03 FIX: Check if batch runner outs caused 3rd out (same pattern as advanceRunner).
      const totalOuts = movements.filter((m) => m.outcome === "out").length;
      if (totalOuts > 0) {
        creditFieldingOutsToPositions(totalOuts);
      }
      if (totalOuts > 0 && gameState.outs + totalOuts >= 3) {
        console.log(
          "[advanceRunnersBatch] T0-03: Baserunning out(s) caused 3rd out — triggering end of inning",
        );
        scheduleAutoEndInning();
      }
    },
    [
      creditFieldingOutsToPositions,
      evaluateEndGameTrigger,
      gameState.isTop,
      gameState.inning,
      gameState.outs,
      gameState.currentPitcherId,
      gameState.currentPitcherName,
      queueAutoEndGame,
      scheduleAutoEndInning,
    ],
  );

  const advanceCount = useCallback((type: "ball" | "strike" | "foul") => {
    setGameState((prev) => {
      if (type === "ball") {
        return { ...prev, balls: Math.min(prev.balls + 1, 3) };
      } else if (type === "strike") {
        return { ...prev, strikes: Math.min(prev.strikes + 1, 2) };
      } else {
        // Foul - only add strike if less than 2
        return { ...prev, strikes: Math.min(prev.strikes + 1, 2) };
      }
    });
  }, []);

  const resetCount = useCallback(() => {
    setGameState((prev) => ({ ...prev, balls: 0, strikes: 0 }));
  }, []);

  const commitPlateAppearance = useCallback(
    async (action: PlateAppearanceAction) => {
      switch (action.type) {
        case "hit":
          await recordHit(action.hitType, action.rbi, action.runnerAdvancement);
          return;
        case "walk":
          await recordWalk(action.walkType);
          return;
        case "error":
          await recordError(action.rbi ?? 0, action.runnerAdvancement);
          return;
        case "foul_ball":
          advanceCount("strike");
          return;
        case "out": {
          const normalizedOutType: OutType =
            action.outType === "SAC" ? "SH" : action.outType;
          const isStrikeout =
            normalizedOutType === "K" || normalizedOutType === "Kc";

          if (
            isStrikeout &&
            (action.isDroppedThirdStrike || action.batterReached)
          ) {
            await recordD3K(
              action.batterReached === true,
              action.runnerAdvancement,
              undefined,
              action.dropReason,
            );
            return;
          }

          await recordOut(
            normalizedOutType,
            action.runnerAdvancement,
            undefined,
            action.forceNoRuns ? { forceNoRuns: true } : undefined,
          );
          return;
        }
      }
    },
    [advanceCount, recordD3K, recordError, recordHit, recordOut, recordWalk],
  );

  // MAJ-09: Substitution with validation via LineupState tracking
  const makeSubstitution = useCallback(
    (
      benchPlayerId: string,
      lineupPlayerId: string,
      benchPlayerName?: string,
      lineupPlayerName?: string,
      // MAJ-06: Optional rich substitution data from modals
      options?: {
        subType?:
          | "player_sub"
          | "pinch_hit"
          | "pinch_run"
          | "defensive_sub"
          | "position_switch"
          | "double_switch";
        newPosition?: string; // Override position instead of inheriting
        lineupSpot?: number; // For displayed pitcher rows synthesized into no-DH batting orders
        base?: "1B" | "2B" | "3B"; // For pinch runners: which base
        isPinchHitter?: boolean; // For pinch hitters: replace mid-at-bat
      },
    ): { success: boolean; error?: string } => {
      const subType = normalizeLiveSubstitutionType({
        requestedSubType: options?.subType,
        lineupPlayerId,
        currentBatterId: gameState.currentBatterId,
        gamePhase: gameState.gamePhase,
        isPinchHitter: options?.isPinchHitter,
      });

      // MAJ-09: Determine which team this substitution is for
      const matchesOutgoingPlayer = (player: {
        playerId: string;
        playerName?: string;
      }) =>
        player.playerId === lineupPlayerId ||
        (!!lineupPlayerName && player.playerName === lineupPlayerName);
      const matchesIncomingBench = (player: {
        playerId: string;
        playerName?: string;
      }) =>
        player.playerId === benchPlayerId ||
        (!!benchPlayerName && player.playerName === benchPlayerName);
      const matchesCurrentPitcher = (lineupState: LineupState) => {
        const currentPitcher = lineupState.currentPitcher;
        return !!currentPitcher && matchesOutgoingPlayer(currentPitcher);
      };

      const awayIndex = awayLineupRef.current.findIndex(matchesOutgoingPlayer);
      const homeIndex = homeLineupRef.current.findIndex(matchesOutgoingPlayer);
      const awayStateIndex =
        awayLineupStateRef.current.lineup.findIndex(matchesOutgoingPlayer);
      const homeStateIndex =
        homeLineupStateRef.current.lineup.findIndex(matchesOutgoingPlayer);
      const incomingAwayBench =
        awayLineupStateRef.current.bench.some(matchesIncomingBench);
      const incomingHomeBench =
        homeLineupStateRef.current.bench.some(matchesIncomingBench);
      const incomingAwayCurrentPitcher =
        !!awayLineupStateRef.current.currentPitcher &&
        matchesIncomingBench(awayLineupStateRef.current.currentPitcher);
      const incomingHomeCurrentPitcher =
        !!homeLineupStateRef.current.currentPitcher &&
        matchesIncomingBench(homeLineupStateRef.current.currentPitcher);
      const outgoingAwayPitcher = matchesCurrentPitcher(
        awayLineupStateRef.current,
      );
      const outgoingHomePitcher = matchesCurrentPitcher(
        homeLineupStateRef.current,
      );
      const teamSide: TeamSide | null =
        awayIndex >= 0 || awayStateIndex >= 0
          ? "away"
          : homeIndex >= 0 || homeStateIndex >= 0
            ? "home"
            : outgoingAwayPitcher
              ? "away"
              : outgoingHomePitcher
                ? "home"
                : (incomingAwayBench || incomingAwayCurrentPitcher) &&
                    !(incomingHomeBench || incomingHomeCurrentPitcher)
                  ? "away"
                  : (incomingHomeBench || incomingHomeCurrentPitcher) &&
                      !(incomingAwayBench || incomingAwayCurrentPitcher)
                    ? "home"
                    : null;

      if (!teamSide) {
        return { success: false, error: "Lineup player not found" };
      }

      const isAwayTeam = teamSide === "away";
      const lineupStateRef = isAwayTeam
        ? awayLineupStateRef
        : homeLineupStateRef;
      const directLineupIndex = isAwayTeam
        ? awayStateIndex >= 0
          ? awayStateIndex
          : awayIndex
        : homeStateIndex >= 0
          ? homeStateIndex
          : homeIndex;
      const currentState = lineupStateRef.current;
      const isVirtualPitcherSub =
        directLineupIndex < 0 && matchesCurrentPitcher(currentState);
      const virtualPitcherSlotIndex = (() => {
        if (!isVirtualPitcherSub) {
          return -1;
        }

        const currentPitcher = currentState.currentPitcher;
        const byRequestedSpot =
          options?.lineupSpot !== undefined
            ? currentState.lineup.findIndex(
                (player) => player.battingOrder === options.lineupSpot,
              )
            : -1;
        const byPitcherOrder =
          currentPitcher?.battingOrder !== undefined
            ? currentState.lineup.findIndex(
                (player) => player.battingOrder === currentPitcher.battingOrder,
              )
            : -1;
        const byPitcherPosition = currentState.lineup.findIndex(
          (player) => player.position === "P",
        );

        return byRequestedSpot >= 0
          ? byRequestedSpot
          : byPitcherOrder >= 0
            ? byPitcherOrder
            : byPitcherPosition;
      })();
      const lineupIdxForReplacement =
        directLineupIndex >= 0 ? directLineupIndex : virtualPitcherSlotIndex;
      const lineupSlot =
        lineupIdxForReplacement >= 0
          ? currentState.lineup[lineupIdxForReplacement]
          : undefined;
      const outgoingLineupPlayer =
        isVirtualPitcherSub && currentState.currentPitcher
          ? {
              ...currentState.currentPitcher,
              battingOrder:
                lineupSlot?.battingOrder ??
                currentState.currentPitcher.battingOrder,
            }
          : lineupSlot;
      if (!outgoingLineupPlayer || lineupIdxForReplacement < 0) {
        return { success: false, error: "Lineup player not found" };
      }

      // MAJ-09: Validate substitution if LineupState is initialized (bench data present)
      // If bench was never provided (legacy callers), skip validation gracefully
      if (
        lineupStateRef.current.bench.length > 0 ||
        lineupStateRef.current.usedPlayers.length > 0
      ) {
        const validationState =
          isVirtualPitcherSub && currentState.currentPitcher
            ? {
                ...currentState,
                lineup: currentState.lineup.map((player, index) =>
                  index === lineupIdxForReplacement
                    ? outgoingLineupPlayer
                    : player,
                ),
              }
            : currentState;
        const incomingIsCurrentPitcher =
          !!validationState.currentPitcher &&
          matchesIncomingBench(validationState.currentPitcher);
        const incomingAlreadyInLineup =
          validationState.lineup.some(matchesIncomingBench);
        const validationStateWithTwoWayPitcher =
          incomingIsCurrentPitcher && !incomingAlreadyInLineup
            ? {
                ...validationState,
                bench: [
                  ...validationState.bench,
                  {
                    playerId: validationState.currentPitcher!.playerId,
                    playerName: validationState.currentPitcher!.playerName,
                    positions: ["P" as Position],
                    isAvailable: true,
                  },
                ],
              }
            : validationState;
        const validation = validateSubstitution(
          validationStateWithTwoWayPitcher,
          benchPlayerId,
          lineupPlayerId,
        );
        if (!validation.isValid) {
          console.warn(
            `[useGameState] Substitution REJECTED: ${validation.errors.join(", ")}`,
          );
          return { success: false, error: validation.errors.join("; ") };
        }
      }

      const outgoingPosition = outgoingLineupPlayer.position || "";

      if (gameState.gamePhase === "PRE_GAME") {
        const lineupIdx = lineupIdxForReplacement;
        if (lineupIdx < 0) {
          return { success: false, error: "Lineup player not found" };
        }

        const removedPlayer = outgoingLineupPlayer;
        const newPosition = (options?.newPosition ||
          removedPlayer.position) as Position;
        const newLineup = [...currentState.lineup];
        newLineup[lineupIdx] = {
          playerId: benchPlayerId,
          playerName: benchPlayerName || benchPlayerId,
          position: newPosition,
          battingOrder: removedPlayer.battingOrder,
          enteredInning: 1,
          isStarter: true,
        };

        const nextBench = currentState.bench
          .filter((player) => player.playerId !== benchPlayerId)
          .map((player) => ({ ...player }));
        if (!nextBench.some((player) => player.playerId === lineupPlayerId)) {
          nextBench.push({
            playerId: lineupPlayerId,
            playerName: lineupPlayerName || lineupPlayerId,
            positions: [removedPlayer.position],
            isAvailable: true,
          });
        }

        lineupStateRef.current = {
          ...currentState,
          lineup: newLineup,
          bench: nextBench,
          currentPitcher:
            removedPlayer.position === "P" || newPosition === "P"
              ? newLineup[lineupIdx]
              : currentState.currentPitcher,
        };

        if (isAwayTeam) {
          awayLineupRef.current[lineupIdx] = {
            playerId: benchPlayerId,
            playerName: benchPlayerName || benchPlayerId,
            position: newPosition,
          };
        } else {
          homeLineupRef.current[lineupIdx] = {
            playerId: benchPlayerId,
            playerName: benchPlayerName || benchPlayerId,
            position: newPosition,
          };
        }

        registerIdentityForSide(
          benchPlayerId,
          benchPlayerName || benchPlayerId,
          teamSide,
        );
        registerIdentityForSide(
          lineupPlayerId,
          lineupPlayerName || lineupPlayerId,
          teamSide,
        );

        const activeDefensiveSide: TeamSide = gameState.isTop ? "home" : "away";
        const shouldUpdateBattery = teamSide === activeDefensiveSide;

        if (lineupPlayerId === gameState.currentBatterId) {
          setGameState((prev) => ({
            ...prev,
            currentBatterId: benchPlayerId,
            currentBatterName: benchPlayerName || benchPlayerId,
            currentPitcherId:
              shouldUpdateBattery &&
              (newPosition === "P" || removedPlayer.position === "P")
                ? benchPlayerId
                : prev.currentPitcherId,
            currentPitcherName:
              shouldUpdateBattery &&
              (newPosition === "P" || removedPlayer.position === "P")
                ? benchPlayerName || benchPlayerId
                : prev.currentPitcherName,
            currentCatcherId:
              shouldUpdateBattery &&
              (newPosition === "C" || removedPlayer.position === "C")
                ? benchPlayerId
                : prev.currentCatcherId,
            currentCatcherName:
              shouldUpdateBattery &&
              (newPosition === "C" || removedPlayer.position === "C")
                ? benchPlayerName || benchPlayerId
                : prev.currentCatcherName,
          }));
        } else if (
          shouldUpdateBattery &&
          (newPosition === "P" ||
            removedPlayer.position === "P" ||
            newPosition === "C" ||
            removedPlayer.position === "C")
        ) {
          setGameState((prev) => ({
            ...prev,
            currentPitcherId:
              newPosition === "P" || removedPlayer.position === "P"
                ? benchPlayerId
                : prev.currentPitcherId,
            currentPitcherName:
              newPosition === "P" || removedPlayer.position === "P"
                ? benchPlayerName || benchPlayerId
                : prev.currentPitcherName,
            currentCatcherId:
              newPosition === "C" || removedPlayer.position === "C"
                ? benchPlayerId
                : prev.currentCatcherId,
            currentCatcherName:
              newPosition === "C" || removedPlayer.position === "C"
                ? benchPlayerName || benchPlayerId
                : prev.currentCatcherName,
          }));
        }

        setLineupVersion((version) => version + 1);
        return { success: true };
      }

      // Log substitution event
      setSubstitutionLog((prev) => [
        ...prev,
        {
          type: subType,
          inning: gameState.inning,
          halfInning: gameState.isTop ? "TOP" : "BOTTOM",
          outgoingPlayerId: lineupPlayerId,
          outgoingPlayerName: lineupPlayerName || lineupPlayerId,
          incomingPlayerId: benchPlayerId,
          incomingPlayerName: benchPlayerName || benchPlayerId,
          timestamp: Date.now(),
        },
      ]);

      void persistBetweenPlayEvent({
        type: "substitution",
        substitution: {
          subType:
            subType === "pinch_run"
              ? "pinch_run"
              : subType === "pinch_hit" || options?.isPinchHitter
                ? "pinch_hit"
                : "defensive_replacement",
          outPlayerId: lineupPlayerId,
          outPlayerName: lineupPlayerName || lineupPlayerId,
          outPosition: outgoingPosition,
          inPlayerId: benchPlayerId,
          inPlayerName: benchPlayerName || benchPlayerId,
          inPosition: options?.newPosition,
        },
      }).catch((err) => {
        console.error(
          "[useGameState] Failed to log substitution between-play event:",
          err,
        );
      });

      // Update lineup refs to swap the players
      if (isAwayTeam) {
        // MAJ-06: Use newPosition if provided, otherwise preserve outgoing position
        const position =
          options?.newPosition ||
          awayLineupRef.current[lineupIdxForReplacement]?.position ||
          outgoingPosition;
        awayLineupRef.current[lineupIdxForReplacement] = {
          playerId: benchPlayerId,
          playerName: benchPlayerName || benchPlayerId,
          position,
        };
      } else {
        const position =
          options?.newPosition ||
          homeLineupRef.current[lineupIdxForReplacement]?.position ||
          outgoingPosition;
        homeLineupRef.current[lineupIdxForReplacement] = {
          playerId: benchPlayerId,
          playerName: benchPlayerName || benchPlayerId,
          position,
        };
      }

      registerIdentityForSide(
        benchPlayerId,
        benchPlayerName || benchPlayerId,
        teamSide,
      );
      registerIdentityForSide(
        lineupPlayerId,
        lineupPlayerName || lineupPlayerId,
        teamSide,
      );

      // MAJ-09: Update LineupState to reflect the substitution
      const lineupIdx = lineupIdxForReplacement;
      if (lineupIdx >= 0) {
        const removedPlayer = outgoingLineupPlayer;
        const newPosition = (options?.newPosition ||
          removedPlayer.position) as Position;

        // Build updated lineup: replace outgoing with incoming
        const newLineup = [...currentState.lineup];
        newLineup[lineupIdx] = {
          playerId: benchPlayerId,
          playerName: benchPlayerName || benchPlayerId,
          position: newPosition,
          battingOrder: lineupSlot?.battingOrder ?? removedPlayer.battingOrder,
          enteredInning: gameState.inning,
          enteredFor: removedPlayer.playerName,
          isStarter: false,
        };

        // Mark bench player as unavailable
        const newBench = currentState.bench.map((b) =>
          b.playerId === benchPlayerId ? { ...b, isAvailable: false } : b,
        );

        // Track used player (outgoing can't re-enter)
        const newUsedPlayers = currentState.usedPlayers.includes(
          lineupPlayerId,
        )
          ? currentState.usedPlayers
          : [...currentState.usedPlayers, lineupPlayerId];

        // Update currentPitcher if pitcher was replaced
        let newCurrentPitcher = currentState.currentPitcher;
        if (removedPlayer.position === "P" || subType === "double_switch") {
          // Check if the incoming player is the new pitcher
          if (newPosition === "P") {
            newCurrentPitcher = newLineup[lineupIdx];
          }
        }

        lineupStateRef.current = {
          lineup: newLineup,
          bench: newBench,
          usedPlayers: newUsedPlayers,
          currentPitcher: newCurrentPitcher,
        };
        setLineupVersion((version) => version + 1);
      }

      // UX-053: Update currentCatcherId if catcher was replaced or someone moved to C
      const resolvedNewPosition =
        options?.newPosition ||
        (() => {
          const awayIdx = awayLineupRef.current.findIndex(
            (p) => p.playerId === benchPlayerId,
          );
          const homeIdx = homeLineupRef.current.findIndex(
            (p) => p.playerId === benchPlayerId,
          );
          if (awayIdx >= 0) return awayLineupRef.current[awayIdx].position;
          if (homeIdx >= 0) return homeLineupRef.current[homeIdx].position;
          return "";
        })();
      // R3-R8: Only update gameState.currentPitcherId if this sub is on the FIELDING team
      // (the team currently on the mound). Pinch-hitting for the batting team's pitcher
      // should NOT change who is pitching in the current half-inning.
      const fieldingTeamSide: TeamSide = gameState.isTop ? "home" : "away";
      const isFieldingTeamSub = teamSide === fieldingTeamSide;
      const shouldUpdatePitcher =
        isFieldingTeamSub && (resolvedNewPosition === "P" || outgoingPosition === "P");
      const shouldUpdateCatcher =
        isFieldingTeamSub && (resolvedNewPosition === "C" || outgoingPosition === "C");
      if (shouldUpdatePitcher || shouldUpdateCatcher) {
        setGameState((prev) => ({
          ...prev,
          currentPitcherId: shouldUpdatePitcher
            ? benchPlayerId
            : prev.currentPitcherId,
          currentPitcherName: shouldUpdatePitcher
            ? benchPlayerName || benchPlayerId
            : prev.currentPitcherName,
          currentCatcherId: shouldUpdateCatcher
            ? benchPlayerId
            : prev.currentCatcherId,
          currentCatcherName: shouldUpdateCatcher
            ? benchPlayerName || benchPlayerId
            : prev.currentCatcherName,
        }));
        console.log("[R3-R5] Updated live battery attribution after substitution", {
          gameId: gameState.gameId,
          outgoingPlayerId: lineupPlayerId,
          incomingPlayerId: benchPlayerId,
          outgoingPosition,
          resolvedNewPosition,
          shouldUpdatePitcher,
          shouldUpdateCatcher,
        });
      }

      // If the substituted player is the current batter, update current batter
      // Also handle pinch hitter (replaces current batter mid-AB)
      if (
        lineupPlayerId === gameState.currentBatterId ||
        options?.isPinchHitter
      ) {
        setGameState((prev) => ({
          ...prev,
          currentBatterId: benchPlayerId,
          currentBatterName: benchPlayerName || benchPlayerId,
        }));
      }

      // Initialize stats for new player if they don't have any
      setPlayerStats((prev) => {
        const newStats = new Map(prev);
        if (!newStats.has(benchPlayerId)) {
          newStats.set(benchPlayerId, createEmptyPlayerStats());
        }
        return newStats;
      });

      // T1-02 FIX: Update runner tracker when pinch runner replaces a baserunner.
      // Without this, the tracker still has the old runner's ID, so scored runs and
      // SB/CS get credited to the replaced player instead of the pinch runner.
      if (subType === "pinch_run" && options?.base) {
        const tracker = runnerTrackerRef.current;
        const trackerBase = options.base; // Already '1B' | '2B' | '3B'
        const oldRunner = tracker.runners.find(
          (r) => r.currentBase === trackerBase,
        );
        if (oldRunner) {
          runnerTrackerRef.current = handlePinchRunner(
            runnerTrackerRef.current,
            oldRunner.runnerId,
            benchPlayerId,
            benchPlayerName || benchPlayerId,
          );
          console.log(
            `[useGameState] T1-02: Pinch runner ${benchPlayerName} replaced ${lineupPlayerName} on ${trackerBase}`,
          );
        }
        // T1-02: Increment version counter so the runnerNames sync effect fires in GameTracker.
        setRunnerIdentityVersion((v) => v + 1);
      }

      console.log("[R3-R5] Substitution recorded for play-log refresh", {
        gameId: gameState.gameId,
        subType,
        incomingPlayerId: benchPlayerId,
        outgoingPlayerId: lineupPlayerId,
      });

      console.log(
        `[useGameState] Substitution (${subType}): ${benchPlayerName || benchPlayerId} replaces ${lineupPlayerName || lineupPlayerId} in inning ${gameState.inning}`,
      );
      return { success: true };
    },
    [
      gameState.currentBatterId,
      gameState.currentCatcherId,
      gameState.currentCatcherName,
      gameState.currentPitcherId,
      gameState.currentPitcherName,
      gameState.gameId,
      gameState.gamePhase,
      gameState.inning,
      gameState.isTop,
      persistBetweenPlayEvent,
      registerIdentityForSide,
    ],
  );

  const swapBattingOrder = useCallback(
    (firstPlayerId: string, secondPlayerId: string): boolean => {
      const applySwap = (
        lineupRef: typeof awayLineupRef,
        lineupStateRef: typeof awayLineupStateRef,
        teamSide: TeamSide,
      ) => {
        const firstIndex = lineupRef.current.findIndex(
          (player) => player.playerId === firstPlayerId,
        );
        const secondIndex = lineupRef.current.findIndex(
          (player) => player.playerId === secondPlayerId,
        );
        if (firstIndex < 0 || secondIndex < 0) {
          return false;
        }

        const nextLineup = lineupStateRef.current.lineup.map((player) => ({
          ...player,
        }));
        [nextLineup[firstIndex], nextLineup[secondIndex]] = [
          nextLineup[secondIndex],
          nextLineup[firstIndex],
        ];
        nextLineup.forEach((player, index) => {
          player.battingOrder = index + 1;
          registerIdentityForSide(player.playerId, player.playerName, teamSide);
        });

        lineupStateRef.current = {
          ...lineupStateRef.current,
          lineup: nextLineup,
          currentPitcher: lineupStateRef.current.currentPitcher
            ? {
                ...lineupStateRef.current.currentPitcher,
                battingOrder:
                  nextLineup.find(
                    (player) =>
                      player.playerId ===
                      lineupStateRef.current.currentPitcher?.playerId,
                  )?.battingOrder ??
                  lineupStateRef.current.currentPitcher.battingOrder,
              }
            : null,
        };
        lineupRef.current = nextLineup.map((player) => ({
          playerId: player.playerId,
          playerName: player.playerName,
          position: player.position,
        }));

        return true;
      };

      const swappedAway = applySwap(awayLineupRef, awayLineupStateRef, "away");
      const swappedHome = swappedAway
        ? false
        : applySwap(homeLineupRef, homeLineupStateRef, "home");
      const swapped = swappedAway || swappedHome;
      if (!swapped) {
        return false;
      }

      if (gameState.gamePhase === "PRE_GAME") {
        const leadoffBatter = awayLineupRef.current[0];
        if (leadoffBatter) {
          setAwayBatterIndex(0);
          setGameState((prev) => ({
            ...prev,
            currentBatterId: leadoffBatter.playerId,
            currentBatterName: leadoffBatter.playerName,
          }));
        }
      }

      setLineupVersion((version) => version + 1);

      return true;
    },
    [gameState.gamePhase, registerIdentityForSide],
  );

  // MAJ-06: Position switch (no new players, just position reassignment)
  const switchPositions = useCallback(
    (switches: Array<{ playerId: string; newPosition: string }>) => {
      const previousPositions = new Map<string, string>();
      const applySwitches = (
        lineupRef: typeof awayLineupRef,
        lineupStateRef: typeof awayLineupStateRef,
        teamSide: TeamSide,
      ) => {
        let changed = false;
        const nextLineup = lineupStateRef.current.lineup.map((player) => {
          const requestedSwitch = switches.find(
            (sw) => sw.playerId === player.playerId,
          );
          if (!requestedSwitch) {
            return player;
          }

          changed = true;
          previousPositions.set(player.playerId, player.position);
          registerIdentityForSide(player.playerId, player.playerName, teamSide);
          return {
            ...player,
            position: requestedSwitch.newPosition as Position,
          };
        });

        if (!changed) {
          return false;
        }

        const currentPitcher = lineupStateRef.current.currentPitcher;
        const currentPitcherSwitch = currentPitcher
          ? switches.find((sw) => sw.playerId === currentPitcher.playerId)
          : undefined;

        lineupStateRef.current = {
          ...lineupStateRef.current,
          lineup: nextLineup,
          currentPitcher: currentPitcher
            ? {
                ...currentPitcher,
                position: (currentPitcherSwitch?.newPosition ??
                  currentPitcher.position) as Position,
              }
            : null,
        };
        lineupRef.current = nextLineup.map((player) => ({
          playerId: player.playerId,
          playerName: player.playerName,
          position: player.position,
        }));

        return true;
      };

      const changedAway = applySwitches(
        awayLineupRef,
        awayLineupStateRef,
        "away",
      );
      const changedHome = applySwitches(
        homeLineupRef,
        homeLineupStateRef,
        "home",
      );

      if (!changedAway && !changedHome) {
        return;
      }

      setSubstitutionLog((prev) => [
        ...prev,
        {
          type: "position_switch",
          inning: gameState.inning,
          halfInning: gameState.isTop ? "TOP" : "BOTTOM",
          outgoingPlayerId: switches.map((s) => s.playerId).join(","),
          outgoingPlayerName: "Position Switch",
          incomingPlayerId: switches.map((s) => s.playerId).join(","),
          incomingPlayerName: switches
            .map((s) => `${s.playerId}->${s.newPosition}`)
            .join(", "),
          timestamp: Date.now(),
        },
      ]);

      for (const sw of switches) {
        void persistBetweenPlayEvent({
          type: "position_change",
          substitution: {
            subType: "position_change",
            outPlayerId: sw.playerId,
            outPlayerName: resolvePlayerNameForId(sw.playerId),
            inPlayerId: sw.playerId,
            inPlayerName: resolvePlayerNameForId(sw.playerId),
            inPosition: sw.newPosition,
            previousPosition: previousPositions.get(sw.playerId),
          },
        }).catch((err) => {
          console.error(
            "[useGameState] Failed to log position-change between-play event:",
            err,
          );
        });
      }

      // UX-053: Update currentCatcherId if someone moved to catcher
      const newCatcher = switches.find((s) => s.newPosition === "C");
      if (newCatcher) {
        setGameState((prev) => ({
          ...prev,
          currentCatcherId: newCatcher.playerId,
          currentCatcherName:
            resolvePlayerNameForId(newCatcher.playerId) || newCatcher.playerId,
        }));
      }

      setLineupVersion((version) => version + 1);

      console.log(
        `[useGameState] Position switch: ${switches.map((s) => `${s.playerId}->${s.newPosition}`).join(", ")}`,
      );
    },
    [
      gameState.inning,
      gameState.isTop,
      persistBetweenPlayEvent,
      registerIdentityForSide,
      resolvePlayerNameForId,
    ],
  );

  const applyPregamePitchingChange = useCallback(
    (
      newPitcherId: string,
      exitingPitcherId: string,
      pitchingTeamSide: TeamSide,
      newPitcherName?: string,
      exitingPitcherName?: string,
    ) => {
      const pitchingStateRef =
        pitchingTeamSide === "home" ? homeLineupStateRef : awayLineupStateRef;
      const pitchingLineupRef =
        pitchingTeamSide === "home" ? homeLineupRef : awayLineupRef;
      const pitchState = pitchingStateRef.current;
      const lineupIndex = pitchState.lineup.findIndex(
        (player) =>
          player.playerId === exitingPitcherId || player.position === "P",
      );

      registerIdentityForSide(
        newPitcherId,
        newPitcherName || newPitcherId,
        pitchingTeamSide,
      );
      registerIdentityForSide(
        exitingPitcherId,
        exitingPitcherName || exitingPitcherId,
        pitchingTeamSide,
      );

      let nextLineup = pitchState.lineup;
      let nextCurrentPitcher: LineupPlayer;
      const nextBench = pitchState.bench
        .filter((player) => player.playerId !== newPitcherId)
        .map((player) => ({ ...player }));

      if (lineupIndex >= 0) {
        const outgoingPitcher = pitchState.lineup[lineupIndex];
        nextCurrentPitcher = {
          playerId: newPitcherId,
          playerName: newPitcherName || newPitcherId,
          position: "P" as Position,
          battingOrder: outgoingPitcher.battingOrder,
          enteredInning: outgoingPitcher.enteredInning,
          enteredFor: outgoingPitcher.playerName,
          isStarter: true,
        };
        nextLineup = [...pitchState.lineup];
        nextLineup[lineupIndex] = nextCurrentPitcher;
        pitchingLineupRef.current[lineupIndex] = {
          playerId: newPitcherId,
          playerName: newPitcherName || newPitcherId,
          position: "P",
        };

        if (!nextBench.some((player) => player.playerId === exitingPitcherId)) {
          nextBench.push({
            playerId: exitingPitcherId,
            playerName: exitingPitcherName || exitingPitcherId,
            positions: ["P"],
            isAvailable: true,
          });
        }
      } else {
        nextCurrentPitcher = {
          playerId: newPitcherId,
          playerName: newPitcherName || newPitcherId,
          position: "P" as Position,
          battingOrder: pitchState.currentPitcher?.battingOrder || 1,
          enteredInning: gameState.inning,
          enteredFor: exitingPitcherName || exitingPitcherId,
          isStarter: true,
        };
      }

      if (
        newPitcherId !== exitingPitcherId &&
        !nextBench.some((player) => player.playerId === exitingPitcherId)
      ) {
        nextBench.push({
          playerId: exitingPitcherId,
          playerName: exitingPitcherName || exitingPitcherId,
          positions: ["P"],
          isAvailable: true,
        });
      }

      if (pitchingLineupRef.current.length > 9) {
        console.error("[useGameState] PRE_GAME pitching lineup exceeded 9 entries", {
          pitchingTeamSide,
          exitingPitcherId,
          newPitcherId,
          lineupLength: pitchingLineupRef.current.length,
          lineup: pitchingLineupRef.current,
        });
      }

      pitchingStateRef.current = {
        ...pitchState,
        lineup: nextLineup,
        bench: nextBench,
        currentPitcher: nextCurrentPitcher,
      };

      if (newPitcherName) {
        pitcherNamesRef.current.set(newPitcherId, newPitcherName);
      }
      if (newPitcherId !== exitingPitcherId) {
        pitcherNamesRef.current.delete(exitingPitcherId);
      }

      setPitcherStats((prev) => {
        const nextStats = new Map(prev);
        const exitingStats = nextStats.get(exitingPitcherId);
        if (
          newPitcherId !== exitingPitcherId &&
          !hasPitcherGameAppearance(exitingStats)
        ) {
          nextStats.delete(exitingPitcherId);
        }
        if (!nextStats.has(newPitcherId)) {
          const starterStats = createEmptyPitcherStats();
          starterStats.isStarter = true;
          starterStats.entryInning = 1;
          starterStats.entryOuts = 0;
          nextStats.set(newPitcherId, starterStats);
        } else {
          const existing = nextStats.get(newPitcherId);
          if (existing) {
            nextStats.set(newPitcherId, {
              ...existing,
              isStarter: true,
              entryInning: 1,
              entryOuts: 0,
            });
          }
        }
        return nextStats;
      });

      const activeDefensiveSide: TeamSide = gameState.isTop ? "home" : "away";
      if (pitchingTeamSide === activeDefensiveSide) {
        runnerTrackerRef.current = syncTrackerPitcher(
          runnerTrackerRef.current,
          newPitcherId,
          newPitcherName || newPitcherId,
        );
        setGameState((prev) => ({
          ...prev,
          currentPitcherId: newPitcherId,
          currentPitcherName: newPitcherName || newPitcherId,
        }));
      }
      setLineupVersion((version) => version + 1);

      console.log("[R3-T0] PRE_GAME pitcher change applied", {
        pitchingTeamSide,
        activeDefensiveSide,
        lineupIndex,
        exitingPitcherId,
        newPitcherId,
        currentHomePitcher:
          homeLineupStateRef.current.currentPitcher?.playerName ?? null,
        currentAwayPitcher:
          awayLineupStateRef.current.currentPitcher?.playerName ?? null,
      });
    },
    [gameState.inning, gameState.isTop, registerIdentityForSide],
  );

  const changePitcher = useCallback(
    (
      newPitcherId: string,
      exitingPitcherId: string,
      pitchingTeamSide: TeamSide,
      newPitcherName?: string,
      exitingPitcherName?: string,
    ) => {
      if (gameState.gamePhase === "PRE_GAME") {
        applyPregamePitchingChange(
          newPitcherId,
          exitingPitcherId,
          pitchingTeamSide,
          newPitcherName,
          exitingPitcherName,
        );
        return;
      }

      // Per PITCH_COUNT_TRACKING_SPEC.md: Mandatory pitch count capture on pitching change
      const exitingStats =
        pitcherStats.get(exitingPitcherId) || createEmptyPitcherStats();

      // Show pitch count prompt before completing the change
      setPitchCountPrompt({
        type: "pitching_change",
        pitcherId: exitingPitcherId,
        pitcherName: exitingPitcherName || exitingPitcherId,
        currentCount: exitingStats.pitchCount,
        lastVerifiedInning: gameState.inning,
        newPitcherId,
      });

      // Store the pending action to execute after pitch count is confirmed
      pendingActionRef.current = async () => {
        const resolvedIncomingPitcherName = resolvePlayerNameForId(
          newPitcherId,
          newPitcherName || newPitcherId,
        );
        const resolvedOutgoingPitcherName = resolvePlayerNameForId(
          exitingPitcherId,
          exitingPitcherName || exitingPitcherId,
        );
        registerIdentityForSide(
          newPitcherId,
          resolvedIncomingPitcherName,
          pitchingTeamSide,
        );
        registerIdentityForSide(
          exitingPitcherId,
          resolvedOutgoingPitcherName,
          pitchingTeamSide,
        );

        // Log the pitching change
        setSubstitutionLog((prev) => [
          ...prev,
          {
            type: "pitching_change",
            inning: gameState.inning,
            halfInning: gameState.isTop ? "TOP" : "BOTTOM",
            outgoingPlayerId: exitingPitcherId,
            outgoingPlayerName: resolvedOutgoingPitcherName,
            incomingPlayerId: newPitcherId,
            incomingPlayerName: resolvedIncomingPitcherName,
            timestamp: Date.now(),
          },
        ]);

        void persistBetweenPlayEvent({
          type: "pitcher_change",
          pitcherChange: {
            outgoingPitcherId: exitingPitcherId,
            outgoingPitcherName: resolvedOutgoingPitcherName,
            incomingPitcherId: newPitcherId,
            incomingPitcherName: resolvedIncomingPitcherName,
            inheritedRunners: runnerTrackerRef.current.runners.filter(
              (r) =>
                r.currentBase &&
                r.currentBase !== "HOME" &&
                r.currentBase !== "OUT",
            ).length,
            outgoingPitchCount: exitingStats.pitchCount,
          },
        }).catch((err) => {
          console.error(
            "[useGameState] Failed to log pitcher-change between-play event:",
            err,
          );
        });

        // MAJ-07: Set exit info on outgoing pitcher and bequeathed runners
        setPitcherStats((prev) => {
          const newStats = new Map(prev);
          // Update outgoing pitcher
          const outgoing = newStats.get(exitingPitcherId);
          if (outgoing) {
            const updatedOutgoing = { ...outgoing };
            updatedOutgoing.exitInning = gameState.inning;
            updatedOutgoing.exitOuts = gameState.outs;
            // Count bequeathed runners from tracker
            const activeRunners = runnerTrackerRef.current.runners.filter(
              (r) =>
                r.currentBase &&
                r.currentBase !== "HOME" &&
                r.currentBase !== "OUT",
            );
            updatedOutgoing.bequeathedRunners = activeRunners.length;
            newStats.set(exitingPitcherId, updatedOutgoing);
          }
          // Initialize new pitcher stats with entry context
          if (!newStats.has(newPitcherId)) {
            const newPStats = createEmptyPitcherStats();
            newPStats.entryInning = gameState.inning;
            newPStats.entryOuts = gameState.outs;
            // Count inherited runners (same as bequeathed from outgoing)
            const activeRunners = runnerTrackerRef.current.runners.filter(
              (r) =>
                r.currentBase &&
                r.currentBase !== "HOME" &&
                r.currentBase !== "OUT",
            );
            newPStats.inheritedRunners = activeRunners.length;
            newStats.set(newPitcherId, newPStats);
          }
          return newStats;
        });

        setPlayerStats((prev) => {
          if (prev.has(newPitcherId)) {
            return prev;
          }
          const nextStats = new Map(prev);
          nextStats.set(newPitcherId, createEmptyPlayerStats());
          return nextStats;
        });

        // Track pitcher name for post-game summary (EXH-011 fix)
        if (resolvedIncomingPitcherName) {
          pitcherNamesRef.current.set(
            newPitcherId,
            resolvedIncomingPitcherName,
          );
        }

        // CRIT-02 + MAJ-05: Notify runner tracker of pitching change
        // This marks all current runners as "inherited" by the new pitcher
        const pitchChangeResult = trackerHandlePitchingChange(
          runnerTrackerRef.current,
          newPitcherId,
          resolvedIncomingPitcherName,
        );
        runnerTrackerRef.current = pitchChangeResult.state;
        console.log(
          `[useGameState] Runner tracker: ${pitchChangeResult.bequeathedRunners.length} bequeathed runners, ${pitchChangeResult.inheritedRunnerCount} inherited`,
        );

        setGameState((prev) => ({
          ...prev,
          currentPitcherId: newPitcherId,
          currentPitcherName: resolvedIncomingPitcherName,
        }));

        syncPitcherIntoBattingLineup(
          pitchingTeamSide,
          newPitcherId,
          exitingPitcherId,
          resolvedIncomingPitcherName,
          resolvedOutgoingPitcherName,
        );

        console.log(
          `[useGameState] Pitching change logged: ${newPitcherName || newPitcherId} replaces ${exitingPitcherName || exitingPitcherId} in inning ${gameState.inning}`,
        );
      };
    },
    [
      applyPregamePitchingChange,
      gameState.gamePhase,
      gameState.inning,
      gameState.isTop,
      gameState.outs,
      persistBetweenPlayEvent,
      pitcherStats,
      registerIdentityForSide,
      resolvePlayerNameForId,
      syncPitcherIntoBattingLineup,
    ],
  );

  // Confirm pitch count and execute pending action (per PITCH_COUNT_TRACKING_SPEC.md)
  const confirmPitchCount = useCallback(
    (
      pitcherId: string,
      finalCount: number,
    ): { immaculateInning?: { pitcherId: string; pitcherName: string } } => {
      let result: {
        immaculateInning?: { pitcherId: string; pitcherName: string };
      } = {};
      console.debug("[PITCH-COUNT] Confirming pitch count", {
        promptType: pitchCountPrompt?.type ?? null,
        pitcherId,
        finalCount,
      });
      // Check for immaculate inning at end of half-inning
      // Requires: user confirmed exactly 9 pitches AND we tracked 3 strikeouts this half-inning
      if (
        pitchCountPrompt?.type === "end_inning" &&
        finalCount === 9 &&
        inningPitchesRef.current.strikeouts === 3
      ) {
        const immaculateFameEvent: FameEventRecord = {
          eventType: "IMMACULATE_INNING",
          fameType: "bonus",
          fameValue: 2, // Per FAME_VALUES.IMMACULATE_INNING
          playerId: pitcherId,
          playerName: pitchCountPrompt.pitcherName,
          description: `Immaculate inning in inning ${gameState.inning} (${gameState.isTop ? "top" : "bottom"})`,
        };
        appendFameEvent(immaculateFameEvent);
        result = {
          immaculateInning: {
            pitcherId,
            pitcherName: pitchCountPrompt.pitcherName,
          },
        };
        console.log(
          `[Fame] Immaculate inning detected! Pitcher: ${pitchCountPrompt.pitcherName}, pitches: ${finalCount}, K: 3`,
        );
      }

      // Update the pitcher's final pitch count
      setPitcherStats((prev) => {
        const newStats = new Map(prev);
        const stats = {
          ...(newStats.get(pitcherId) || createEmptyPitcherStats()),
        };
        stats.pitchCount = finalCount;
        newStats.set(pitcherId, stats);
        pitcherStatsRef.current = newStats;
        return newStats;
      });

      setDeferredPitchCounts((prev) =>
        prev.filter((entry) => entry.pitcherId !== pitcherId),
      );

      console.log(
        `[useGameState] Pitch count confirmed: ${pitcherId} = ${finalCount} pitches`,
      );

      const timing =
        pitchCountPrompt?.type === "pitching_change"
          ? "pitcher_removed"
          : pitchCountPrompt?.type === "end_game"
            ? "end_of_game"
            : "end_of_half_inning";
      void persistBetweenPlayEvent({
        type: "pitch_count_update",
        pitchCountUpdate: {
          pitcherId,
          pitchCount: finalCount,
          timing,
        },
      }).catch((error) => {
        console.error(
          "[useGameState] Failed to log pitch-count update:",
          error,
        );
      });

      // Execute the pending action (pitching change, end inning, or end game).
      const pendingAction = pendingActionRef.current;
      pendingActionRef.current = null;
      pendingActionCancelRef.current = null;

      console.log("[R3-R7] confirmPitchCount: pendingAction =", pendingAction ? "FOUND" : "NULL",
        "promptType =", pitchCountPrompt?.type);

      if (pendingAction) {
        console.debug(
          "[PITCH-COUNT] Pending action found, executing continuation",
        );
        void Promise.resolve(pendingAction())
          .catch((error) => {
            console.error(
              "[useGameState] Pending pitch-count action failed:",
              error,
            );
          })
          .finally(() => {
            console.debug("[PITCH-COUNT] Confirmed, clearing prompt");
            setPitchCountPrompt(null);
          });
      } else {
        console.debug(
          "[PITCH-COUNT] No pending action, clearing prompt immediately",
        );
        setPitchCountPrompt(null);
      }

      return result;
    },
    [
      appendFameEvent,
      gameState.inning,
      gameState.isTop,
      persistBetweenPlayEvent,
      pitchCountPrompt,
    ],
  );

  const openDeferredPitchCount = useCallback((pitcherId: string) => {
    const deferredEntry = deferredPitchCounts.find(
      (entry) => entry.pitcherId === pitcherId,
    );

    if (!deferredEntry) {
      return;
    }

    setDeferredPitchCounts((prev) =>
      prev.filter((entry) => entry.pitcherId !== pitcherId),
    );
    pendingActionRef.current = null;
    pendingActionCancelRef.current = null;
    setPitchCountPrompt({
      type: deferredEntry.promptType,
      pitcherId: deferredEntry.pitcherId,
      pitcherName: deferredEntry.pitcherName,
      currentCount: deferredEntry.lastKnownCount,
      lastVerifiedInning: deferredEntry.inning,
    });
  }, [deferredPitchCounts]);

  // Dismiss pitch count prompt without confirming.
  // End-game dismissal still completes the archive using the last known count.
  const dismissPitchCountPrompt = useCallback(() => {
    if (pitchCountPrompt) {
      deferPitchCountPrompt(pitchCountPrompt);
    }

    if (pitchCountPrompt?.type === "end_inning") {
      // Still execute the inning transition, just don't update pitch count
      const pendingAction = pendingActionRef.current;
      pendingActionRef.current = null;
      pendingActionCancelRef.current = null;
      if (pendingAction) {
        void Promise.resolve(pendingAction()).catch((error) => {
          console.error(
            "[useGameState] Pending inning transition failed after prompt dismiss:",
            error,
          );
        });
      }
      console.log(
        "[useGameState] Pitch count prompt dismissed — inning transition proceeding without count update",
      );
    } else if (pitchCountPrompt?.type === "end_game") {
      const pendingCancel = pendingActionCancelRef.current;
      pendingActionRef.current = null;
      pendingActionCancelRef.current = null;
      if (pendingCancel) {
        void Promise.resolve(pendingCancel()).catch((error) => {
          console.error(
            "[useGameState] End-game completion failed after pitch count prompt dismiss:",
            error,
          );
        });
      }
      console.log(
        "[useGameState] End-game pitch count prompt dismissed — completing game with existing count",
      );
    } else {
      pendingActionRef.current = null;
      pendingActionCancelRef.current?.();
      pendingActionCancelRef.current = null;
      console.log(
        "[useGameState] Pitch count prompt dismissed, action cancelled",
      );
    }
    setPitchCountPrompt(null);
  }, [deferPitchCountPrompt, pitchCountPrompt]);

  // Internal function that performs the actual inning transition
  // Called after pitch count is confirmed by user
  const executeEndInning = useCallback(() => {
    const { inning, isTop, homeScore, awayScore } = gameState;
    const endGameEvaluation = evaluateEndGameTrigger({
      inning,
      isTop,
      homeScoreBefore: homeScore,
      awayScoreBefore: awayScore,
      homeScoreAfter: homeScore,
      awayScoreAfter: awayScore,
      context: "half_inning_end",
    });
    console.log(
      `[T0-01-DEBUG] executeEndInning: totalInnings=${totalInningsRef.current}, inning=${inning}, isTop=${isTop}, homeScore=${homeScore}, awayScore=${awayScore}, reason=${endGameEvaluation.reason}`,
    );
    const teamKey = isTop ? "away" : "home";
    const inningIdx = Math.max(0, inning - 1);

    // Ensure each completed half-inning is represented in line score, even if scoreless.
    // Without this, scoreless innings can remain undefined in GameTracker and archived inningScores.
    setScoreboard((prev) => {
      const inningsCopy = [...prev.innings];
      while (inningsCopy.length <= inningIdx) {
        inningsCopy.push({ away: undefined, home: undefined });
      }
      const currentInning = inningsCopy[inningIdx] || {
        away: undefined,
        home: undefined,
      };
      inningsCopy[inningIdx] = {
        ...currentInning,
        [teamKey]: currentInning[teamKey] ?? 0,
      };
      return {
        ...prev,
        innings: inningsCopy,
      };
    });

    if (endGameEvaluation.shouldEndGame) {
      console.log(
        `[T0-01] Auto game-end: ${endGameEvaluation.reason} at ${awayScore}-${homeScore} after ${isTop ? "top" : "bottom"} of inning ${inning}.`,
      );
      queueAutoEndGame();
      return;
    }

    if (!isTop && inning >= totalInningsRef.current && homeScore === awayScore) {
      console.log(
        `[T0-01] Tied ${homeScore}-${awayScore} after regulation. Extra innings.`,
      );
    }

    // CRIT-02: Clear runner tracker for new half-inning and update inning number
    let endTracker = trackerClearBases(runnerTrackerRef.current);
    endTracker = trackerNextInning(endTracker);

    setGameState((prev) => {
      const newIsTop = !prev.isTop;
      // After TOP (isTop was true, newIsTop is false): stay on same inning, switch to BOTTOM
      // After BOTTOM (isTop was false, newIsTop is true): increment inning, switch to TOP
      const newInning = newIsTop ? prev.inning + 1 : prev.inning;

      // Get next batter
      const battingTeamLineup = newIsTop
        ? awayLineupRef.current
        : homeLineupRef.current;
      const currentIndex = newIsTop ? awayBatterIndex : homeBatterIndex;
      const nextBatter = battingTeamLineup[currentIndex];

      // T0-02 FIX: Switch to the correct pitching team's current pitcher
      // When newIsTop (away bats), HOME team pitches; when !newIsTop (home bats), AWAY team pitches
      const pitchingTeamState = newIsTop
        ? homeLineupStateRef
        : awayLineupStateRef;
      const newPitcher = pitchingTeamState.current.currentPitcher;
      const newPitcherId = newPitcher?.playerId || prev.currentPitcherId;
      const newPitcherName = newPitcher?.playerName || prev.currentPitcherName;

      // UX-053: Find catcher from the new fielding team's lineup
      const fieldingLineup = newIsTop
        ? homeLineupRef.current
        : awayLineupRef.current;
      const newCatcher = fieldingLineup.find((p) => p.position === "C");
      const newCatcherId = newCatcher?.playerId || prev.currentCatcherId;
      const newCatcherName = newCatcher?.playerName || prev.currentCatcherName;

      // Sync tracker with new pitcher and inning number
      endTracker = syncTrackerPitcher(endTracker, newPitcherId, newPitcherName);
      endTracker = { ...endTracker, inning: newInning };
      runnerTrackerRef.current = endTracker;

      // Reset inning pitch counter for the NEW pitcher
      inningPitchesRef.current = {
        pitches: 0,
        strikeouts: 0,
        pitcherId: newPitcherId,
      };

      return {
        ...prev,
        inning: newInning,
        isTop: newIsTop,
        outs: 0,
        balls: 0,
        strikes: 0,
        bases: { first: false, second: false, third: false },
        currentBatterId: nextBatter?.playerId || "",
        currentBatterName: nextBatter?.playerName || "",
        currentPitcherId: newPitcherId,
        currentPitcherName: newPitcherName,
        currentCatcherId: newCatcherId,
        currentCatcherName: newCatcherName,
      };
    });
  }, [
    awayBatterIndex,
    evaluateEndGameTrigger,
    gameState,
    homeBatterIndex,
    queueAutoEndGame,
  ]);

  const endInning = useCallback(() => {
    // Show pitch count prompt for the current pitcher at end of half-inning
    const currentPitcherStats =
      pitcherStats.get(gameState.currentPitcherId) || createEmptyPitcherStats();

    setPitchCountPrompt({
      type: "end_inning",
      pitcherId: gameState.currentPitcherId,
      pitcherName: gameState.currentPitcherName || gameState.currentPitcherId,
      currentCount: currentPitcherStats.pitchCount,
      lastVerifiedInning: gameState.inning,
    });

    // Store the inning transition as a pending action
    pendingActionRef.current = async () => executeEndInning();
  }, [
    gameState.currentPitcherId,
    gameState.currentPitcherName,
    gameState.inning,
    pitcherStats,
    executeEndInning,
  ]);

  // Update endInning ref so it can be called from recordOut/recordD3K
  endInningRef.current = endInning;

  const confirmInningEnd = useCallback(() => {
    if (autoEndInningTimeoutRef.current) {
      clearTimeout(autoEndInningTimeoutRef.current);
      autoEndInningTimeoutRef.current = null;
    }
    setShowInningEndConfirm(false);
    isCorrectingRunnerOutcomesRef.current = false;
    endInning();
  }, [endInning]);

  const declineInningEnd = useCallback(() => {
    if (autoEndInningTimeoutRef.current) {
      clearTimeout(autoEndInningTimeoutRef.current);
      autoEndInningTimeoutRef.current = null;
    }
    console.log(
      "[M3-3-universal] Inning-end confirmation declined, runner correction mode enabled",
    );
    setShowInningEndConfirm(false);
    isCorrectingRunnerOutcomesRef.current = true;
  }, []);

  const forceEndHalfInning = useCallback(() => {
    if (autoEndInningTimeoutRef.current) {
      clearTimeout(autoEndInningTimeoutRef.current);
      autoEndInningTimeoutRef.current = null;
    }
    setShowInningEndConfirm(false);
    isCorrectingRunnerOutcomesRef.current = false;
    endInning();
  }, [endInning]);

  // Internal function to complete game after pitch counts confirmed
  const completeGameInternal = useCallback(
    async (opts?: EndGameOptions) => {
      const activityLog = opts?.activityLog ?? [];
      const resolvedArchiveLeagueId =
        opts?.leagueId ??
        leagueIdRef.current ??
        ((opts?.competitionType ?? competitionTypeRef.current) === "exhibition" ||
        !(opts?.competitionType ?? competitionTypeRef.current)
          ? (opts?.competitionId ?? competitionIdRef.current)
          : undefined);
      setIsSaving(true);
      try {
        // Mark game as complete in event log
        await completeGame(
          gameState.gameId,
          { away: gameState.awayScore, home: gameState.homeScore },
          gameState.inning,
        );

        // Convert Map to Record for PersistedGameState
        const playerNameLookup = new Map<string, string>();
        for (const p of awayLineupRef.current) {
          registerIdentityForSide(p.playerId, p.playerName, "away");
          playerNameLookup.set(p.playerId, p.playerName);
        }
        for (const p of homeLineupRef.current) {
          registerIdentityForSide(p.playerId, p.playerName, "home");
          playerNameLookup.set(p.playerId, p.playerName);
        }
        for (const b of awayLineupStateRef.current.bench) {
          registerIdentityForSide(b.playerId, b.playerName, "away");
          playerNameLookup.set(b.playerId, b.playerName);
        }
        for (const b of homeLineupStateRef.current.bench) {
          registerIdentityForSide(b.playerId, b.playerName, "home");
          playerNameLookup.set(b.playerId, b.playerName);
        }

        const [fieldingEvents, betweenPlayEvents, atBatEvents, gameHeader] =
          await Promise.all([
            getGameFieldingEvents(gameState.gameId),
            getBetweenPlayEvents(gameState.gameId),
            getGameEvents(gameState.gameId),
            getGameHeader(gameState.gameId).catch(() => null),
          ]);
        const playerFieldingTally = buildPlayerFieldingTally(
          fieldingEvents,
          betweenPlayEvents,
        );
        const committedManagerDecisionState =
          deriveCommittedManagerDecisionState({
            gameId: gameState.gameId,
            atBatEvents,
            betweenPlayEvents,
            fieldingEvents,
            startingLineups: gameHeader?.startingLineups,
            startingPitchers: gameHeader?.startingPitchers,
            optimalLineupSnapshots: gameHeader?.optimalLineupSnapshots,
            chosenLineupSnapshots: gameHeader?.chosenLineupSnapshots,
            awayTeamId: gameState.awayTeamId,
            homeTeamId: gameState.homeTeamId,
            awayManagerId: opts?.awayManagerId,
            homeManagerId: opts?.homeManagerId,
            managerByTeamId: opts?.managerByTeamId,
            totalInnings: totalInningsRef.current,
            extraInningRunner: extraInningRunnerRef.current,
            extraInningRunnerDelay: extraInningRunnerDelayRef.current,
            gameEnded: true,
          });

        const playerStatsRecord: Record<
          string,
          {
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
            hbp: number;
            k: number;
            sb: number;
            cs: number;
            sf: number;
            sh: number;
            gidp: number; // MAJ-11
            putouts: number;
            assists: number;
            fieldingErrors: number;
          }
        > = {};
        playerStats.forEach((stats, playerId) => {
          const fieldingTally = playerFieldingTally.get(playerId) || {
            putouts: 0,
            assists: 0,
            errors: 0,
          };
          playerStatsRecord[playerId] = {
            ...stats,
            playerName: resolvePlayerNameForId(
              playerId,
              playerNameLookup.get(playerId) ||
                playerNameByIdRef.current.get(playerId) ||
                playerId,
            ),
            teamId: resolveTeamIdForPlayerId(playerId),
            // CRIT-05 FIXED: Fielding stats now populated from IndexedDB fielding events
            putouts: fieldingTally.putouts,
            assists: fieldingTally.assists,
            fieldingErrors: fieldingTally.errors,
          };
        });

        // MAJ-07: Mark the last pitcher on each team as finishedGame on a cloned map.
        // Never mutate objects sourced from React state maps directly.
        const finalizedPitcherStats = clonePitcherStatsMap(
          pitcherStatsRef.current,
        );
        const lastPitcherId = gameState.currentPitcherId;
        const lastPitcherStats = finalizedPitcherStats.get(lastPitcherId);
        if (lastPitcherStats) {
          finalizedPitcherStats.set(lastPitcherId, {
            ...lastPitcherStats,
            finishedGame: true,
            // If they never had exit info set, set it now
            exitInning: lastPitcherStats.exitInning ?? gameState.inning,
            exitOuts: lastPitcherStats.exitOuts ?? gameState.outs,
          });
        }

        // MAJ-08: Calculate pitcher decisions (W/L/SV/H/BS)
        // D-01 FIX: Now async — uses lead-change tracking from AtBatEvents
        const pitcherStatsWithDecisions = await calculatePitcherDecisions(
          finalizedPitcherStats,
          gameState.homeScore,
          gameState.awayScore,
          gameState.inning,
          gameState.gameId,
          resolveTeamSideForPlayerId,
        );

        // Convert pitcher stats Map to array for PersistedGameState
        const pitcherGameStatsArray: PersistedGameState["pitcherGameStats"] =
          [];
        pitcherStatsWithDecisions.forEach((stats, pitcherId) => {
          const teamId = resolveTeamIdForPlayerId(pitcherId);
          const pitcherName =
            pitcherNamesRef.current.get(pitcherId) ||
            playerNameByIdRef.current.get(pitcherId) ||
            pitcherId;

          pitcherGameStatsArray.push({
            pitcherId,
            pitcherName,
            teamId,
            isStarter: stats.isStarter,
            entryInning: stats.entryInning,
            outsRecorded: stats.outsRecorded,
            hitsAllowed: stats.hitsAllowed,
            runsAllowed: stats.runsAllowed,
            earnedRuns: stats.earnedRuns,
            walksAllowed: stats.walksAllowed + stats.intentionalWalks, // Combine BB+IBB (matches endGame path)
            strikeoutsThrown: stats.strikeoutsThrown,
            homeRunsAllowed: stats.homeRunsAllowed,
            hitBatters: stats.hitByPitch,
            basesReachedViaError: (() => {
              // CRIT-06: Count runners who reached via error from runner tracker
              // Note: Undercounts runners who reached via error but were later put out (removed from tracker)
              const trackerPitcherStats =
                runnerTrackerRef.current.pitcherStats.get(pitcherId);
              if (!trackerPitcherStats) return 0;
              const onBase = trackerPitcherStats.runnersOnBase.filter(
                (r) => r.howReached === "error",
              ).length;
              const scored = trackerPitcherStats.runnersScored.filter(
                (r) => r.howReached === "error",
              ).length;
              return onBase + scored;
            })(),
            wildPitches: stats.wildPitches,
            pitchCount: stats.pitchCount,
            battersFaced: stats.battersFaced,
            consecutiveHRsAllowed: stats.consecutiveHRsAllowed,
            firstInningRuns: stats.firstInningRuns,
            basesLoadedWalks: stats.basesLoadedWalks,
            inningsComplete: Math.floor(stats.outsRecorded / 3),
            // MAJ-08: Pitcher decisions
            decision: stats.decision,
            save: stats.save,
            hold: stats.hold,
            blownSave: stats.blownSave,
          });
        });

        // Construct PersistedGameState for aggregation
        const resolvedStadium =
          opts?.stadiumName ??
          gameState.stadiumName ??
          getTeamColors(gameState.homeTeamId).stadium ??
          getTeamColors(gameState.awayTeamId).stadium ??
          "Unknown Stadium";

        const persistedState: PersistedGameState = {
          id: "current",
          gameId: gameState.gameId,
          savedAt: Date.now(),
          inning: gameState.inning,
          halfInning: gameState.isTop ? "TOP" : "BOTTOM",
          outs: gameState.outs,
          homeScore: gameState.homeScore,
          awayScore: gameState.awayScore,
          bases: {
            first: gameState.bases.first
              ? { playerId: "unknown", playerName: "Runner" }
              : null,
            second: gameState.bases.second
              ? { playerId: "unknown", playerName: "Runner" }
              : null,
            third: gameState.bases.third
              ? { playerId: "unknown", playerName: "Runner" }
              : null,
          },
          currentBatterIndex: 0,
          atBatCount: atBatSequence,
          awayTeamId: gameState.awayTeamId,
          homeTeamId: gameState.homeTeamId,
          awayTeamName: gameState.awayTeamName,
          homeTeamName: gameState.homeTeamName,
          seasonNumber: gameState.seasonNumber,
          stadiumName: resolvedStadium,
          seasonId: seasonIdRef.current || undefined,
          statsScopeId:
            opts?.statsScopeId ??
            statsScopeIdRef.current ??
            seasonIdRef.current ??
            undefined,
          competitionType: opts?.competitionType ?? competitionTypeRef.current,
          competitionId: opts?.competitionId ?? competitionIdRef.current,
          competitionName: competitionNameRef.current,
          franchiseId: opts?.franchiseId ?? franchiseIdRef.current,
          scheduleGameId: opts?.scheduleGameId ?? scheduleGameIdRef.current,
          playoffSeriesId: playoffSeriesIdRef.current || undefined,
          playoffGameNumber: playoffGameNumberRef.current || undefined,
          playoffId: playoffIdRef.current || undefined,
          playoffRound: restoredPlayoffContext.playoffRound,
          isEliminationGame: restoredPlayoffContext.isEliminationGame,
          isClinchGame: restoredPlayoffContext.isClinchGame,
          leagueId: resolvedArchiveLeagueId,
          liveBeatReporterEnabled: gameState.liveBeatReporterEnabled,
          postGameColumnsEnabled: gameState.postGameColumnsEnabled,
          beatReporterEnabled:
            gameState.liveBeatReporterEnabled ||
            gameState.postGameColumnsEnabled,
          playerStats: playerStatsRecord,
          pitcherGameStats: pitcherGameStatsArray,
          fameEvents: buildPersistedFameEvents(
            gameState.inning,
            gameState.isTop ? "TOP" : "BOTTOM",
          ),
          lastHRBatterId: null,
          consecutiveHRCount: 0,
          inningStrikeouts: 0,
          maxDeficitAway: 0,
          maxDeficitHome: 0,
          activityLog: activityLog.slice(-20),
          managerDecisions: committedManagerDecisionState.managerDecisions,
          managerDeploymentStints:
            committedManagerDecisionState.managerDeploymentStints,
          managerLineupDeltas: committedManagerDecisionState.managerLineupDeltas,
          managerRecommendationWatches:
            committedManagerDecisionState.managerRecommendationWatches,
          optimalLineupSnapshots: gameHeader?.optimalLineupSnapshots,
          chosenLineupSnapshots: gameHeader?.chosenLineupSnapshots,
          totalInnings: totalInningsRef.current,
          extraInningRunner: extraInningRunnerRef.current,
          extraInningRunnerDelay: extraInningRunnerDelayRef.current,
        };
        const kblWpaCredits = deriveKblWpaCredits({
          atBatEvents,
          fieldingEvents,
          betweenPlayEvents,
          totalInnings: totalInningsRef.current,
          extraInningRunner: extraInningRunnerRef.current,
          extraInningRunnerDelay: extraInningRunnerDelayRef.current,
          awayTeamId: gameState.awayTeamId,
          homeTeamId: gameState.homeTeamId,
          startingLineups: gameHeader?.startingLineups,
        });
        const pogAwardSet = getGamePogAwardSet({
          kblWpaCredits,
          playerStats: playerStatsRecord,
          pitcherGameStats: pitcherGameStatsArray,
          managerDecisions: committedManagerDecisionState.managerDecisions,
          managerDeploymentStints:
            committedManagerDecisionState.managerDeploymentStints,
          managerLineupDeltas: committedManagerDecisionState.managerLineupDeltas,
          eventLogAvailable:
            atBatEvents.length > 0 ||
            fieldingEvents.length > 0 ||
            betweenPlayEvents.length > 0,
        });
        const rankedPlayersOfTheGame = rankPlayersOfTheGame(
          {
            awayTeamId: gameState.awayTeamId,
            homeTeamId: gameState.homeTeamId,
            playerStats: playerStatsRecord,
            pitcherGameStats: pitcherGameStatsArray,
          },
          atBatEvents,
          kblWpaCredits,
        );
        const storedPlayersOfTheGame = buildArchivePlayersOfTheGame(
          pogAwardSet,
          rankedPlayersOfTheGame,
        );
        console.log("[R3-R5] Archived players of the game from final event log", {
          gameId: gameState.gameId,
          playersOfTheGame: storedPlayersOfTheGame,
        });

        // T1-08 FIX: Check if already aggregated (idempotency guard)
        // Prevents double aggregation when endGame's useEffect re-fires
        const header = await getGameHeader(gameState.gameId);
        const alreadyAggregated = header?.aggregated === true;
        let aggregationSucceeded = alreadyAggregated;

        const targetStatsScopeId =
          opts?.statsScopeId ??
          statsScopeIdRef.current ??
          opts?.seasonId ??
          seasonIdRef.current ??
          "season-1";
        const archivedSeasonId =
          opts?.seasonId ?? seasonIdRef.current ?? undefined;
        const currentSeasonNumber =
          opts?.currentSeason ?? gameState.seasonNumber;
        const aggregationOptions: GameAggregationOptions = {
          seasonId: targetStatsScopeId,
          detectMilestones: true,
          franchiseId: opts?.franchiseId ?? franchiseIdRef.current,
          currentGame: opts?.currentGame,
          currentSeason: currentSeasonNumber,
        };
        const inningScores = scoreboard.innings.map((inn) => ({
          away: inn.away ?? 0,
          home: inn.home ?? 0,
        }));

        if (!alreadyAggregated) {
          let processingTimeoutId: ReturnType<typeof setTimeout> | null = null;
          try {
            await Promise.race([
              (async () => {
                await processCompletedGame(
                  persistedState,
                  aggregationOptions,
                  resolvedArchiveLeagueId,
                  {
                    finalScore: {
                      away: gameState.awayScore,
                      home: gameState.homeScore,
                    },
                    inningScores,
                    seasonId: archivedSeasonId,
                    context: {
                      statsScopeId: targetStatsScopeId,
                      competitionType:
                        opts?.competitionType ?? competitionTypeRef.current,
                      competitionId:
                        opts?.competitionId ?? competitionIdRef.current,
                      competitionName: competitionNameRef.current,
                      playoffSeriesId:
                        playoffSeriesIdRef.current || undefined,
                      playoffGameNumber:
                        playoffGameNumberRef.current || undefined,
                      playoffId: playoffIdRef.current || undefined,
                      playoffRound: restoredPlayoffContext.playoffRound,
                      isEliminationGame:
                        restoredPlayoffContext.isEliminationGame,
                      isClinchGame: restoredPlayoffContext.isClinchGame,
                      leagueId: resolvedArchiveLeagueId,
                      franchiseId: opts?.franchiseId ?? franchiseIdRef.current,
                      scheduleGameId:
                        opts?.scheduleGameId ?? scheduleGameIdRef.current,
                      totalInnings: totalInningsRef.current,
                      extraInningRunner: extraInningRunnerRef.current,
                      extraInningRunnerDelay: extraInningRunnerDelayRef.current,
                      pogPlayerId: storedPlayersOfTheGame?.first,
                      playersOfTheGame: storedPlayersOfTheGame,
                      aggregationStatus: "aggregated",
                    },
                  },
                );
                await markGameAggregated(gameState.gameId);
                aggregationSucceeded = true;
              })(),
              new Promise<never>((_, reject) => {
                processingTimeoutId = setTimeout(() => {
                  reject(
                    new Error(
                      `processCompletedGame timed out after ${PROCESSING_TIMEOUT / 1000}s`,
                    ),
                  );
                }, PROCESSING_TIMEOUT);
              }),
            ]);
            console.log("[T1-08] Stats aggregated to season (first call)");
          } catch (error) {
            console.error(
              "[EndGame] processCompletedGame failed or timed out:",
              error,
            );
            const aggregationErrorMessage =
              error instanceof Error ? error.message : String(error);
            try {
              await archiveCompletedGame(
                persistedState,
                {
                  away: gameState.awayScore,
                  home: gameState.homeScore,
                },
                inningScores,
                archivedSeasonId,
                {
                  statsScopeId: targetStatsScopeId,
                  competitionType:
                    opts?.competitionType ?? competitionTypeRef.current,
                  competitionId:
                    opts?.competitionId ?? competitionIdRef.current,
                  competitionName: competitionNameRef.current,
                  playoffSeriesId: playoffSeriesIdRef.current || undefined,
                  playoffGameNumber:
                    playoffGameNumberRef.current || undefined,
                  playoffId: playoffIdRef.current || undefined,
                  playoffRound: restoredPlayoffContext.playoffRound,
                  isEliminationGame:
                    restoredPlayoffContext.isEliminationGame,
                  isClinchGame: restoredPlayoffContext.isClinchGame,
                  leagueId: resolvedArchiveLeagueId,
                  franchiseId: opts?.franchiseId ?? franchiseIdRef.current,
                  scheduleGameId:
                    opts?.scheduleGameId ?? scheduleGameIdRef.current,
                  totalInnings: totalInningsRef.current,
                  extraInningRunner: extraInningRunnerRef.current,
                  extraInningRunnerDelay: extraInningRunnerDelayRef.current,
                  pogPlayerId: storedPlayersOfTheGame?.first,
                  playersOfTheGame: storedPlayersOfTheGame,
                  aggregationStatus: "archive_only",
                  aggregationError: aggregationErrorMessage,
                },
              );
            } catch (archiveError) {
              console.error(
                "[EndGame] fallback archiveCompletedGame failed:",
                archiveError,
              );
            }
          } finally {
            if (processingTimeoutId !== null) {
              clearTimeout(processingTimeoutId);
            }
          }
        } else {
          console.log("[T1-08] Skipping aggregation — game already aggregated");
        }

        // Record playoff series game result if this was a playoff game
        if (aggregationSucceeded && playoffSeriesIdRef.current) {
          try {
            const { recordSeriesGame } =
              await import("../../utils/playoffStorage");
            if (gameState.homeScore === gameState.awayScore) {
              throw new Error(
                "Tied playoff games cannot be recorded as elimination series results.",
              );
            }
            const winnerId =
              gameState.homeScore > gameState.awayScore
                ? gameState.homeTeamId
                : gameState.awayTeamId;
            const updatedSeries = await recordSeriesGame(
              playoffSeriesIdRef.current,
              {
                gameNumber: playoffGameNumberRef.current || 1,
                homeTeamId: gameState.homeTeamId,
                awayTeamId: gameState.awayTeamId,
                status: "COMPLETED" as const,
                result: {
                  homeScore: gameState.homeScore,
                  awayScore: gameState.awayScore,
                  winnerId,
                  innings: gameState.inning,
                },
                gameLogId: gameState.gameId,
                playedAt: Date.now(),
              },
            );

            if (
              updatedSeries.status === "COMPLETED" &&
              updatedSeries.winner &&
              playoffIdRef.current
            ) {
              const {
                completePlayoff,
                createNextRoundSeries,
                getPlayoff,
                getSeriesByRound,
                updatePlayoff,
              } = await import("../../utils/playoffStorage");
              const playoff = await getPlayoff(playoffIdRef.current);

              if (playoff) {
                const loserId =
                  updatedSeries.winner === updatedSeries.higherSeed.teamId
                    ? updatedSeries.lowerSeed.teamId
                    : updatedSeries.higherSeed.teamId;
                const updatedTeams = playoff.teams.map((team) =>
                  team.teamId === loserId
                    ? {
                        ...team,
                        eliminated: true,
                        eliminatedInRound: updatedSeries.round,
                      }
                    : team,
                );
                await updatePlayoff(playoff.id, { teams: updatedTeams });

                const roundSeries = await getSeriesByRound(
                  playoff.id,
                  updatedSeries.round,
                );
                const allRoundComplete = roundSeries.every(
                  (series) => series.status === "COMPLETED",
                );

                if (allRoundComplete) {
                  if (updatedSeries.round === playoff.rounds) {
                    const champSeries = roundSeries.find(
                      (series) => series.winner,
                    );
                    if (champSeries?.winner) {
                      await completePlayoff(playoff.id, champSeries.winner);

                      if (playoff.eliminationId) {
                        const { updateElimination } =
                          await import("../../utils/eliminationManager");
                        const championName =
                          playoff.teams.find(
                            (team) => team.teamId === champSeries.winner,
                          )?.teamName || "Champion";
                        await updateElimination(playoff.eliminationId, {
                          status: "COMPLETED",
                          champion: championName,
                        });
                      }
                    }
                  } else {
                    await createNextRoundSeries(
                      playoff.id,
                      updatedSeries.round,
                      playoff,
                    );
                    await updatePlayoff(playoff.id, {
                      currentRound: updatedSeries.round + 1,
                    });

                    if (playoff.eliminationId) {
                      const { updateElimination } =
                        await import("../../utils/eliminationManager");
                      await updateElimination(playoff.eliminationId, {
                        currentRound: updatedSeries.round + 1,
                      });
                    }
                  }
                }
              }
            }

            console.log(
              `[Playoff] Recorded series game: ${playoffSeriesIdRef.current} G${playoffGameNumberRef.current}, winner: ${winnerId}`,
            );
          } catch (err) {
            console.error("[Playoff] Failed to record series game:", err);
          }
        }

        // Aggregate player stats to playoff stats store (populates Leaders tab)
        if (!alreadyAggregated && aggregationSucceeded && playoffIdRef.current) {
          try {
            const { aggregateGameToPlayoffStats } =
              await import("../../utils/playoffStorage");
            await aggregateGameToPlayoffStats(
              playoffIdRef.current,
              persistedState,
            );
            console.log(
              `[Playoff] Aggregated player stats to playoff stats: ${playoffIdRef.current}`,
            );
          } catch (err) {
            console.error("[Playoff] Failed to aggregate playoff stats:", err);
          }
        }

        // Archive is handled once inside processCompletedGame with full context.
        if (!alreadyAggregated) {
          const resolvedCompetitionType =
            opts?.competitionType ?? competitionTypeRef.current;
          const resolvedRunId =
            opts?.competitionId ?? competitionIdRef.current;
          if (
            resolvedCompetitionType === "elimination" &&
            resolvedRunId
          ) {
            try {
              await appendEliminationGameFameToRun(
                resolvedRunId,
                persistedState.gameId,
                persistedState.fameEvents,
              );
            } catch (error) {
              console.error(
                "[EndGame] appendEliminationGameFameToRun failed:",
                error,
              );
            }
            try {
              await appendEliminationGameToAllTimeStats(persistedState);
            } catch (error) {
              console.error(
                "[EndGame] appendEliminationGameToAllTimeStats failed:",
                error,
              );
            }
          }
        }

        try {
          if (autoSaveTimeoutRef.current) {
            clearTimeout(autoSaveTimeoutRef.current);
            autoSaveTimeoutRef.current = null;
          }
          await clearCurrentGame();
          latestPersistedRef.current = null;
        } catch (err) {
          console.warn(
            "[useGameState] Failed to clear currentGame at game end:",
            err,
          );
        }

        setLastSavedAt(Date.now());
      } finally {
        setIsSaving(false);
      }
    },
    [
      atBatSequence,
      buildPersistedFameEvents,
      gameState,
      pitcherStats,
      playerStats,
      registerIdentityForSide,
      resolveTeamIdForPlayerId,
      resolveTeamSideForPlayerId,
      scoreboard,
    ],
  );

  // §10.1: Transition from PRE_GAME → LIVE when user confirms lineup lock
  const startGame = useCallback(() => {
    const currentGameState = gameStateRef.current;
    if (currentGameState.gamePhase === "LIVE") {
      return;
    }

    const nextGameState = {
      ...currentGameState,
      gamePhase: "LIVE" as GamePhase,
    };
    gameStartedAtRef.current = gameStartedAtRef.current ?? Date.now();
    gameStateRef.current = nextGameState;
    setGameState(nextGameState);
    markGameStartedForRefresh(nextGameState.gameId);

    const immediateSnapshot = buildImmediateCurrentGameSnapshot(nextGameState);
    if (immediateSnapshot) {
      latestPersistedRef.current = immediateSnapshot;
      persistSnapshotImmediately(immediateSnapshot);
      void createGameHeader(buildGameHeaderDraftFromSnapshot(immediateSnapshot)).catch(
        (error) => {
          console.error("[useGameState] Failed to persist game-start header", error);
        },
      );
    }
  }, [buildImmediateCurrentGameSnapshot, persistSnapshotImmediately]);

  // §7.4: Runner correction — update live base occupancy directly
  const applyBasesCorrection = useCallback(
    (
      bases: { first: boolean; second: boolean; third: boolean },
      runnersAfter?: RunnerState,
      correctionContext?: {
        inning: number;
        halfInning: HalfInning;
      },
      howReachedOverride?: HowReached,
    ) => {
      const currentHalfInning: HalfInning = gameState.isTop ? "TOP" : "BOTTOM";
      if (
        correctionContext &&
        (correctionContext.inning !== gameState.inning ||
          correctionContext.halfInning !== currentHalfInning)
      ) {
        console.log(
          "[R3-R4] Skipping live base correction for completed half-inning",
          {
            correctionContext,
            currentInning: gameState.inning,
            currentHalfInning,
          },
        );
        return;
      }

      const syncedTracker = syncTrackerPitcher(
        runnerTrackerRef.current,
        gameState.currentPitcherId,
        gameState.currentPitcherName,
      );
      const battingTeamSide: TeamSide = gameState.isTop ? "away" : "home";
      const filteredRunnersAfter = runnersAfter
        ? ((
            ["first", "second", "third"] as const
          ).reduce<RunnerState>(
            (accumulator, base) => {
              const runner = runnersAfter[base];
              if (!runner) {
                accumulator[base] = null;
                return accumulator;
              }

              const runnerTeamSide = teamSideByPlayerIdRef.current.get(
                runner.runnerId,
              );
              if (runnerTeamSide === battingTeamSide) {
                accumulator[base] = runner;
                return accumulator;
              }

              console.log("[R3-R4] Filtered cross-team runner correction:", {
                base,
                runnerId: runner.runnerId,
                runnerName: runner.runnerName,
                runnerTeamSide: runnerTeamSide ?? null,
                battingTeamSide,
              });
              accumulator[base] = null;
              return accumulator;
            },
            { first: null, second: null, third: null },
          ))
        : undefined;
      const nextBases = filteredRunnersAfter
        ? buildLiveBasesFromRunnersAfter(filteredRunnersAfter)
        : bases;

      runnerTrackerRef.current = filteredRunnersAfter
        ? reconcileRunnerTrackerFromRunnersAfter(
            syncedTracker,
            filteredRunnersAfter,
            howReachedOverride,
          )
        : reconcileRunnerTrackerBases(syncedTracker, nextBases);
      setRunnerIdentityVersion((v) => v + 1);
      setGameState((prev) => ({ ...prev, bases: nextBases }));
    },
    [
      gameState.currentPitcherId,
      gameState.currentPitcherName,
      gameState.inning,
      gameState.isTop,
    ],
  );

  const updateTrackedRunnerHowReached = useCallback(
    (
      runnerIdentity: { runnerId?: string | null; runnerName?: string | null },
      howReached: HowReached,
    ): boolean => {
      const { runnerId, runnerName } = runnerIdentity;
      if (!runnerId && !runnerName) {
        return false;
      }

      const matchesRunner = (runner: RunnerTrackingState["runners"][number]) => {
        if (runnerId) {
          return runner.runnerId === runnerId;
        }
        return runner.runnerName === runnerName;
      };

      const tracker = runnerTrackerRef.current;
      const trackedRunner =
        tracker.runners.find(matchesRunner) ??
        Array.from(tracker.pitcherStats.values())
          .flatMap((stats) => [
            ...stats.runnersOnBase,
            ...stats.runnersScored,
            ...stats.inheritedRunners,
            ...stats.inheritedRunnersScored,
          ])
          .find(matchesRunner);

      if (!trackedRunner || trackedRunner.howReached === howReached) {
        return false;
      }

      const earnedRunDelta =
        trackedRunner.currentBase === "HOME"
          ? Number(isEarnedRunForHowReached(howReached)) -
            Number(isEarnedRunForHowReached(trackedRunner.howReached))
          : 0;

      const updateTrackedRunner = (
        runner: RunnerTrackingState["runners"][number],
      ) => (matchesRunner(runner) ? { ...runner, howReached } : runner);

      runnerTrackerRef.current = {
        ...tracker,
        runners: tracker.runners.map(updateTrackedRunner),
        pitcherStats: new Map(
          Array.from(tracker.pitcherStats.entries()).map(
            ([pitcherId, stats]) => [
              pitcherId,
              {
                ...stats,
                runnersOnBase: stats.runnersOnBase.map(updateTrackedRunner),
                runnersScored: stats.runnersScored.map(updateTrackedRunner),
                inheritedRunners: stats.inheritedRunners.map(updateTrackedRunner),
                inheritedRunnersScored:
                  stats.inheritedRunnersScored.map(updateTrackedRunner),
              },
            ],
          ),
        ),
      };

      if (earnedRunDelta !== 0) {
        setPitcherStats((prev) => {
          const next = new Map(prev);
          const updatedStats = {
            ...(next.get(trackedRunner.responsiblePitcherId) ||
              createEmptyPitcherStats()),
          };
          updatedStats.earnedRuns = Math.max(
            0,
            updatedStats.earnedRuns + earnedRunDelta,
          );
          next.set(trackedRunner.responsiblePitcherId, updatedStats);
          return next;
        });
      }

      setRunnerIdentityVersion((v) => v + 1);
      return true;
    },
    [],
  );

  // §7.4: Runner correction — adjust live outs count directly
  const applyOutsAdjustment = useCallback(
    (delta: number) => {
      if (!delta) return;
      const currentGameState = gameStateRef.current;
      const nextOuts = Math.max(0, Math.min(3, currentGameState.outs + delta));
      liveOutsRef.current = nextOuts;
      gameStateRef.current = {
        ...currentGameState,
        outs: nextOuts,
      };
      setGameState((prev) => ({
        ...prev,
        outs: nextOuts,
      }));
      if (nextOuts < 3) {
        isCorrectingRunnerOutcomesRef.current = false;
        setShowInningEndConfirm(false);
        if (autoEndInningTimeoutRef.current) {
          clearTimeout(autoEndInningTimeoutRef.current);
          autoEndInningTimeoutRef.current = null;
        }
      }
      if (nextOuts >= 3 && currentGameState.outs < 3) {
        scheduleAutoEndInning();
      }
      reconcileEndGameAfterCorrection({
        inning: currentGameState.inning,
        isTop: currentGameState.isTop,
        outs: nextOuts,
        homeScoreBefore: currentGameState.homeScore,
        awayScoreBefore: currentGameState.awayScore,
        homeScoreAfter: currentGameState.homeScore,
        awayScoreAfter: currentGameState.awayScore,
        gamePhase: currentGameState.gamePhase,
      });
    },
    [reconcileEndGameAfterCorrection, scheduleAutoEndInning],
  );

  const setRunnerOutcomeCorrectionActive = useCallback((isActive: boolean) => {
    isRunnerOutcomeCorrectionPanelActiveRef.current = isActive;
  }, []);

  const adjustPlayerFieldingErrors = useCallback(
    (playerId: string, delta: number) => {
      if (!playerId || !delta) {
        return;
      }
      setPlayerStats((prev) => {
        const next = new Map(prev);
        const current = next.get(playerId) || createEmptyPlayerStats();
        next.set(playerId, {
          ...current,
          fieldingErrors: Math.max(0, current.fieldingErrors + delta),
        });
        return next;
      });
    },
    [],
  );

  const applyScoreAdjustment = useCallback(
    (inning: number, halfInning: HalfInning, delta: number) => {
      if (!delta) return;

      const teamKey = halfInning === "TOP" ? "away" : "home";
      const inningIdx = Math.max(0, inning - 1);
      const currentGameState = gameStateRef.current;
      const nextGameState = {
        ...currentGameState,
        awayScore:
          teamKey === "away"
            ? Math.max(0, currentGameState.awayScore + delta)
            : currentGameState.awayScore,
        homeScore:
          teamKey === "home"
            ? Math.max(0, currentGameState.homeScore + delta)
            : currentGameState.homeScore,
      };

      gameStateRef.current = nextGameState;
      setGameState((prev) => ({
        ...prev,
        awayScore: nextGameState.awayScore,
        homeScore: nextGameState.homeScore,
      }));

      setScoreboard((prev) => {
        const innings = [...prev.innings];
        while (innings.length <= inningIdx) {
          innings.push({ away: undefined, home: undefined });
        }
        const currentInning = innings[inningIdx] || {
          away: undefined,
          home: undefined,
        };
        innings[inningIdx] = {
          ...currentInning,
          [teamKey]: Math.max(0, (currentInning[teamKey] ?? 0) + delta),
        };

        return {
          ...prev,
          innings,
          [teamKey]: {
            ...prev[teamKey],
            runs: Math.max(0, prev[teamKey].runs + delta),
          },
        };
      });

      reconcileEndGameAfterCorrection({
        inning: nextGameState.inning,
        isTop: nextGameState.isTop,
        outs: nextGameState.outs,
        homeScoreBefore: currentGameState.homeScore,
        awayScoreBefore: currentGameState.awayScore,
        homeScoreAfter: nextGameState.homeScore,
        awayScoreAfter: nextGameState.awayScore,
        gamePhase: currentGameState.gamePhase,
      });
    },
    [reconcileEndGameAfterCorrection],
  );

  const endGame = useCallback(
    async (options?: EndGameOptions) => {
      try {
        // Archive game FIRST so PostGameSummary can load it (EXH-011 fix)
        // Build persisted state for archiving — include player name and team
        const activityLog = options?.activityLog ?? [];
        const archivedSeasonId =
          options?.seasonId ?? seasonIdRef.current ?? undefined;
        const statsScopeIdValue =
          options?.statsScopeId ??
          statsScopeIdRef.current ??
          options?.seasonId ??
          seasonIdRef.current ??
          "season-1";
        const currentSeasonNumber =
          options?.currentSeason ?? gameState.seasonNumber;
        const resolvedArchiveLeagueId =
          options?.leagueId ??
          leagueIdRef.current ??
          ((options?.competitionType ?? competitionTypeRef.current) ===
            "exhibition" ||
          !(options?.competitionType ?? competitionTypeRef.current)
            ? (options?.competitionId ?? competitionIdRef.current)
            : undefined);
        const endGameOptions: EndGameOptions = {
          activityLog,
          seasonId: archivedSeasonId,
          statsScopeId: statsScopeIdValue,
          competitionType:
            options?.competitionType ?? competitionTypeRef.current,
          competitionId: options?.competitionId ?? competitionIdRef.current,
          leagueId: resolvedArchiveLeagueId,
          franchiseId: options?.franchiseId ?? franchiseIdRef.current,
          scheduleGameId: options?.scheduleGameId ?? scheduleGameIdRef.current,
          currentSeason: currentSeasonNumber,
          currentGame: options?.currentGame,
          stadiumName: options?.stadiumName,
          awayManagerId: options?.awayManagerId,
          homeManagerId: options?.homeManagerId,
          managerByTeamId: options?.managerByTeamId,
        };
      const playerNameLookupForEndGame = new Map<string, string>();
      for (const p of awayLineupRef.current) {
        registerIdentityForSide(p.playerId, p.playerName, "away");
        playerNameLookupForEndGame.set(p.playerId, p.playerName);
      }
      for (const p of homeLineupRef.current) {
        registerIdentityForSide(p.playerId, p.playerName, "home");
        playerNameLookupForEndGame.set(p.playerId, p.playerName);
      }
      for (const b of awayLineupStateRef.current.bench) {
        registerIdentityForSide(b.playerId, b.playerName, "away");
        playerNameLookupForEndGame.set(b.playerId, b.playerName);
      }
      for (const b of homeLineupStateRef.current.bench) {
        registerIdentityForSide(b.playerId, b.playerName, "home");
        playerNameLookupForEndGame.set(b.playerId, b.playerName);
      }

      const [
        endGameFieldingEvents,
        endGameBetweenPlayEvents,
        endGameAtBatEvents,
        endGameHeader,
      ] =
        await Promise.all([
          getGameFieldingEvents(gameState.gameId),
          getBetweenPlayEvents(gameState.gameId),
          getGameEvents(gameState.gameId),
          getGameHeader(gameState.gameId).catch(() => null),
        ]);
      const endGameFieldingTally = buildPlayerFieldingTally(
        endGameFieldingEvents,
        endGameBetweenPlayEvents,
      );
      const committedManagerDecisionState =
        deriveCommittedManagerDecisionState({
          gameId: gameState.gameId,
          atBatEvents: endGameAtBatEvents,
          betweenPlayEvents: endGameBetweenPlayEvents,
          fieldingEvents: endGameFieldingEvents,
          startingLineups: endGameHeader?.startingLineups,
          startingPitchers: endGameHeader?.startingPitchers,
          optimalLineupSnapshots: endGameHeader?.optimalLineupSnapshots,
          chosenLineupSnapshots: endGameHeader?.chosenLineupSnapshots,
          awayTeamId: gameState.awayTeamId,
          homeTeamId: gameState.homeTeamId,
          awayManagerId: options?.awayManagerId,
          homeManagerId: options?.homeManagerId,
          managerByTeamId: options?.managerByTeamId,
          totalInnings: totalInningsRef.current,
          extraInningRunner: extraInningRunnerRef.current,
          extraInningRunnerDelay: extraInningRunnerDelayRef.current,
          gameEnded: true,
        });

      const playerStatsRecord: Record<
        string,
        {
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
          hbp: number;
          k: number;
          sb: number;
          cs: number;
          sf: number;
          sh: number;
          gidp: number; // MAJ-11
          putouts: number;
          assists: number;
          fieldingErrors: number;
        }
      > = {};
      playerStats.forEach((stats, playerId) => {
        const fieldingTally = endGameFieldingTally.get(playerId) || {
          putouts: 0,
          assists: 0,
          errors: 0,
        };
        playerStatsRecord[playerId] = {
          ...stats,
          playerName: resolvePlayerNameForId(
            playerId,
            playerNameLookupForEndGame.get(playerId) ||
              playerNameByIdRef.current.get(playerId) ||
              playerId,
          ),
          teamId: resolveTeamIdForPlayerId(playerId),
          // CRIT-05 FIXED: Fielding stats from IndexedDB
          putouts: fieldingTally.putouts,
          assists: fieldingTally.assists,
          fieldingErrors: fieldingTally.errors,
        };
      });

      const pitcherGameStatsArray = Array.from(
        pitcherStatsRef.current.entries(),
      ).map(
        ([pitcherId, stats], idx) => {
          const pitcherName =
            pitcherNamesRef.current.get(pitcherId) ||
            playerNameByIdRef.current.get(pitcherId) ||
            pitcherId;

          return {
            pitcherId,
            pitcherName,
            teamId: resolveTeamIdForPlayerId(pitcherId),
            isStarter: stats.isStarter,
            entryInning: stats.entryInning,
            outsRecorded: stats.outsRecorded,
            hitsAllowed: stats.hitsAllowed,
            runsAllowed: stats.runsAllowed,
            earnedRuns: stats.earnedRuns,
            walksAllowed: stats.walksAllowed + stats.intentionalWalks, // Persisted format combines BB+IBB
            strikeoutsThrown: stats.strikeoutsThrown,
            homeRunsAllowed: stats.homeRunsAllowed,
            hitBatters: stats.hitByPitch,
            basesReachedViaError: (() => {
              // CRIT-06: Count runners who reached via error from runner tracker
              // Note: Undercounts runners who reached via error but were later put out (removed from tracker)
              const trackerPitcherStats =
                runnerTrackerRef.current.pitcherStats.get(pitcherId);
              if (!trackerPitcherStats) return 0;
              const onBase = trackerPitcherStats.runnersOnBase.filter(
                (r) => r.howReached === "error",
              ).length;
              const scored = trackerPitcherStats.runnersScored.filter(
                (r) => r.howReached === "error",
              ).length;
              return onBase + scored;
            })(),
            wildPitches: stats.wildPitches,
            pitchCount: stats.pitchCount,
            battersFaced: stats.battersFaced,
            consecutiveHRsAllowed: stats.consecutiveHRsAllowed,
            firstInningRuns: stats.firstInningRuns,
            basesLoadedWalks: stats.basesLoadedWalks,
            inningsComplete: Math.floor(stats.outsRecorded / 3),
            // MAJ-08: Pitcher decisions (not yet calculated at endGame time — set to null/false)
            // Decisions are calculated in completeGameInternal after pitch count confirmation
            decision: stats.decision,
            save: stats.save,
            hold: stats.hold,
            blownSave: stats.blownSave,
          };
        },
      );

      const resolvedStadium =
        options?.stadiumName ??
        gameState.stadiumName ??
        getTeamColors(gameState.homeTeamId).stadium ??
        getTeamColors(gameState.awayTeamId).stadium ??
        "Unknown Stadium";

      const persistedState: PersistedGameState = {
        id: "current",
        gameId: gameState.gameId,
        savedAt: Date.now(),
        inning: gameState.inning,
        halfInning: gameState.isTop ? "TOP" : "BOTTOM",
        outs: gameState.outs,
        homeScore: gameState.homeScore,
        awayScore: gameState.awayScore,
        bases: {
          first: gameState.bases.first
            ? { playerId: "r1", playerName: "R1" }
            : null,
          second: gameState.bases.second
            ? { playerId: "r2", playerName: "R2" }
            : null,
          third: gameState.bases.third
            ? { playerId: "r3", playerName: "R3" }
            : null,
        },
        currentBatterIndex: 0,
        atBatCount: atBatSequence,
        awayTeamId: gameState.awayTeamId,
        homeTeamId: gameState.homeTeamId,
        awayTeamName: gameState.awayTeamName,
        homeTeamName: gameState.homeTeamName,
        seasonNumber: currentSeasonNumber,
        stadiumName: resolvedStadium,
        seasonId: archivedSeasonId,
        statsScopeId: statsScopeIdValue,
        competitionType: options?.competitionType ?? competitionTypeRef.current,
        competitionId: options?.competitionId ?? competitionIdRef.current,
        competitionName: competitionNameRef.current,
        franchiseId: options?.franchiseId ?? franchiseIdRef.current,
        scheduleGameId: options?.scheduleGameId ?? scheduleGameIdRef.current,
        leagueId: resolvedArchiveLeagueId,
        liveBeatReporterEnabled: gameState.liveBeatReporterEnabled,
        postGameColumnsEnabled: gameState.postGameColumnsEnabled,
        beatReporterEnabled:
          gameState.liveBeatReporterEnabled ||
          gameState.postGameColumnsEnabled,
        playerStats: playerStatsRecord,
        pitcherGameStats: pitcherGameStatsArray,
        fameEvents: buildPersistedFameEvents(
          gameState.inning,
          gameState.isTop ? "TOP" : "BOTTOM",
        ).map((event) => ({
          ...event,
          autoDetected: true,
        })),
        lastHRBatterId: null,
        consecutiveHRCount: 0,
        inningStrikeouts: 0,
        maxDeficitAway: 0,
        maxDeficitHome: 0,
        activityLog: activityLog.slice(-20),
        managerDecisions: committedManagerDecisionState.managerDecisions,
        managerDeploymentStints:
          committedManagerDecisionState.managerDeploymentStints,
        managerLineupDeltas: committedManagerDecisionState.managerLineupDeltas,
        managerRecommendationWatches:
          committedManagerDecisionState.managerRecommendationWatches,
        optimalLineupSnapshots: endGameHeader?.optimalLineupSnapshots,
        chosenLineupSnapshots: endGameHeader?.chosenLineupSnapshots,
        totalInnings: totalInningsRef.current,
        extraInningRunner: extraInningRunnerRef.current,
        extraInningRunnerDelay: extraInningRunnerDelayRef.current,
      };
      const kblWpaCredits = deriveKblWpaCredits({
        atBatEvents: endGameAtBatEvents,
        fieldingEvents: endGameFieldingEvents,
        betweenPlayEvents: endGameBetweenPlayEvents,
        totalInnings: totalInningsRef.current,
        extraInningRunner: extraInningRunnerRef.current,
        extraInningRunnerDelay: extraInningRunnerDelayRef.current,
        awayTeamId: gameState.awayTeamId,
        homeTeamId: gameState.homeTeamId,
        startingLineups: endGameHeader?.startingLineups,
      });
      const pogAwardSet = getGamePogAwardSet({
        kblWpaCredits,
        playerStats: playerStatsRecord,
        pitcherGameStats: pitcherGameStatsArray,
        managerDecisions: committedManagerDecisionState.managerDecisions,
        managerDeploymentStints:
          committedManagerDecisionState.managerDeploymentStints,
        managerLineupDeltas: committedManagerDecisionState.managerLineupDeltas,
        eventLogAvailable:
          endGameAtBatEvents.length > 0 ||
          endGameFieldingEvents.length > 0 ||
          endGameBetweenPlayEvents.length > 0,
      });
      const rankedPlayersOfTheGame = rankPlayersOfTheGame(
        {
          awayTeamId: gameState.awayTeamId,
          homeTeamId: gameState.homeTeamId,
          playerStats: playerStatsRecord,
          pitcherGameStats: pitcherGameStatsArray,
        },
        endGameAtBatEvents,
        kblWpaCredits,
      );
      const storedPlayersOfTheGame = buildArchivePlayersOfTheGame(
        pogAwardSet,
        rankedPlayersOfTheGame,
      );
      console.log("[R3-R5] Prepared post-game archive context", {
        gameId: gameState.gameId,
        totalInnings: totalInningsRef.current,
        playersOfTheGame: storedPlayersOfTheGame,
      });

      // The authoritative completed-game archive is written once by
      // completeGameInternal after pitch decisions and playoff context settle.

      // Per PITCH_COUNT_TRACKING_SPEC.md: Mandatory pitch count capture at end of game
      // Show prompt for current pitcher (simplified - full spec requires all pitchers)
      const currentPitcherStats =
        pitcherStatsRef.current.get(gameState.currentPitcherId) ||
        createEmptyPitcherStats();

      setPitchCountPrompt({
        type: "end_game",
        pitcherId: gameState.currentPitcherId,
        pitcherName: gameState.currentPitcherName || gameState.currentPitcherId,
        currentCount: currentPitcherStats.pitchCount,
        lastVerifiedInning: gameState.inning,
      });

      if (options?.awaitPitchCountConfirmation) {
        console.log("[R3-R7] endGame: awaiting pitch count confirmation...");
        await new Promise<void>((resolve, reject) => {
          pendingActionRef.current = async () => {
            pendingActionCancelRef.current = null;
            console.log("[R3-R7] endGame: pitch count confirmed, running completeGameInternal...");
            try {
              await completeGameInternal(endGameOptions);
              console.log("[R3-R7] endGame: completeGameInternal finished, resolving");
              resolve();
            } catch (err) {
              console.error("[R3-R7] endGame: completeGameInternal threw:", err);
              reject(err);
              throw err;
            }
          };
          pendingActionCancelRef.current = async () => {
            pendingActionRef.current = null;
            pendingActionCancelRef.current = null;
            console.warn(
              "[R3-R7] endGame: pitch count dismissed; completing with existing count",
            );
            try {
              await completeGameInternal(endGameOptions);
              resolve();
            } catch (err) {
              console.error(
                "[R3-R7] endGame: completion after pitch count dismiss threw:",
                err,
              );
              reject(err);
              throw err;
            }
          };
        });
        console.log("[endGame] Prompt-confirmed end-game completion finished");
        return;
      }

      // Preserve the direct-completion path for non-UI callers and existing tests.
      pendingActionRef.current = null;
      pendingActionCancelRef.current = null;
      try {
        await completeGameInternal(endGameOptions);
        console.log(
          "[endGame] Direct end-game completion executed — stats aggregated",
        );
      } catch (err) {
        console.error("[endGame] Direct end-game completion failed:", err);
      }
      } finally {
        setIsSaving(false);
      }
    },
    [
      atBatSequence,
      buildPersistedFameEvents,
      completeGameInternal,
      gameState,
      pitcherStats,
      playerStats,
      registerIdentityForSide,
      resolveTeamIdForPlayerId,
      scoreboard,
    ],
  );

  // Snapshot runner tracker for undo system (Maps don't survive JSON.stringify)
  // Converts pitcherStats Map to serializable entries array
  const getRunnerTrackerSnapshot = useCallback(() => {
    const tracker = runnerTrackerRef.current;
    const pitcherStatsEntries: [string, PitcherRunnerStats][] = Array.from(
      tracker.pitcherStats.entries(),
    ).map(
      ([pitcherId, stats]): [string, PitcherRunnerStats] => [
        pitcherId,
        {
          ...stats,
          runnersOnBase: stats.runnersOnBase.map((runner) => ({ ...runner })),
          runnersScored: stats.runnersScored.map((runner) => ({
            ...runner,
          })),
          inheritedRunners: stats.inheritedRunners.map((runner) => ({
            ...runner,
          })),
          inheritedRunnersScored: stats.inheritedRunnersScored.map((runner) => ({
            ...runner,
          })),
        },
      ],
    );

    return {
      runners: tracker.runners.map((runner) => ({ ...runner })),
      currentPitcherId: tracker.currentPitcherId,
      currentPitcherName: tracker.currentPitcherName,
      pitcherStatsEntries,
      inning: tracker.inning,
      atBatNumber: tracker.atBatNumber,
    };
  }, []);

  // T1-02/03/04: Get runner names from the tracker (single source of truth)
  // This replaces the fragile runnerNames state in GameTracker that fell out of sync
  // with SB, WP, pinch runner, and thrown-out-advancing events.
  const getBaseRunnerNames = useCallback((): {
    first?: string;
    second?: string;
    third?: string;
  } => {
    const tracker = runnerTrackerRef.current;
    const result: { first?: string; second?: string; third?: string } = {};
    for (const runner of tracker.runners) {
      if (runner.currentBase === "1B") result.first = runner.runnerName;
      else if (runner.currentBase === "2B") result.second = runner.runnerName;
      else if (runner.currentBase === "3B") result.third = runner.runnerName;
    }
    return result;
  }, []);

  const getLineupStateSnapshot = useCallback(
    (): GameLineupSnapshot => ({
      away: {
        lineup: awayLineupStateRef.current.lineup.map((player) => ({
          ...player,
        })),
        bench: awayLineupStateRef.current.bench.map((player) => ({
          ...player,
        })),
        usedPlayers: [...awayLineupStateRef.current.usedPlayers],
        currentPitcher: awayLineupStateRef.current.currentPitcher
          ? { ...awayLineupStateRef.current.currentPitcher }
          : null,
      },
      home: {
        lineup: homeLineupStateRef.current.lineup.map((player) => ({
          ...player,
        })),
        bench: homeLineupStateRef.current.bench.map((player) => ({
          ...player,
        })),
        usedPlayers: [...homeLineupStateRef.current.usedPlayers],
        currentPitcher: homeLineupStateRef.current.currentPitcher
          ? { ...homeLineupStateRef.current.currentPitcher }
          : null,
      },
      // R3: Include DH flags so GameTracker can skip heuristic inference
      awayUsesDh: awayUsesDhRef.current,
      homeUsesDh: homeUsesDhRef.current,
    }),
    [],
  );

  const getBatterIndicesSnapshot = useCallback(
    () => ({
      away: awayBatterIndex,
      home: homeBatterIndex,
    }),
    [awayBatterIndex, homeBatterIndex],
  );

  // Restore state from undo snapshot (Phase 7 - Undo System)
  // CRIT-01 fix: Now also restores playerStats and pitcherStats Maps
  // Runner tracker undo fix: Also restores runnerTrackerRef for correct ER attribution
  const restoreState = useCallback(
    (snapshot: {
      gameState: GameState;
      scoreboard: ScoreboardState;
      playerStats?: Map<string, PlayerGameStats>;
      pitcherStats?: Map<string, PitcherGameStats>;
      runnerTrackerState?: {
        runners: RunnerTrackingState["runners"];
        currentPitcherId: string;
        currentPitcherName: string;
        pitcherStats: Map<string, PitcherRunnerStats>;
        inning: number;
        atBatNumber: number;
      };
      lineupSnapshot?: GameLineupSnapshot;
      batterIndices?: {
        away: number;
        home: number;
      };
    }) => {
      console.log("[useGameState] Restoring state from snapshot");
      if (snapshot.lineupSnapshot) {
        awayLineupStateRef.current = {
          lineup: snapshot.lineupSnapshot.away.lineup.map((player) => ({
            ...player,
          })),
          bench: snapshot.lineupSnapshot.away.bench.map((player) => ({
            ...player,
          })),
          usedPlayers: [...snapshot.lineupSnapshot.away.usedPlayers],
          currentPitcher: snapshot.lineupSnapshot.away.currentPitcher
            ? { ...snapshot.lineupSnapshot.away.currentPitcher }
            : null,
        };
        homeLineupStateRef.current = {
          lineup: snapshot.lineupSnapshot.home.lineup.map((player) => ({
            ...player,
          })),
          bench: snapshot.lineupSnapshot.home.bench.map((player) => ({
            ...player,
          })),
          usedPlayers: [...snapshot.lineupSnapshot.home.usedPlayers],
          currentPitcher: snapshot.lineupSnapshot.home.currentPitcher
            ? { ...snapshot.lineupSnapshot.home.currentPitcher }
            : null,
        };
        awayLineupRef.current = snapshot.lineupSnapshot.away.lineup.map(
          (player) => ({
            playerId: player.playerId,
            playerName: player.playerName,
            position: player.position,
          }),
        );
        homeLineupRef.current = snapshot.lineupSnapshot.home.lineup.map(
          (player) => ({
            playerId: player.playerId,
            playerName: player.playerName,
            position: player.position,
          }),
        );
        teamSideByPlayerIdRef.current.clear();
        playerNameByIdRef.current.clear();
        const registerLineupPlayer = (
          player: { playerId: string; playerName: string },
          side: TeamSide,
        ) => {
          playerNameByIdRef.current.set(player.playerId, player.playerName);
          teamSideByPlayerIdRef.current.set(player.playerId, side);
        };
        snapshot.lineupSnapshot.away.lineup.forEach((player) =>
          registerLineupPlayer(player, "away"),
        );
        snapshot.lineupSnapshot.away.bench.forEach((player) =>
          registerLineupPlayer(player, "away"),
        );
        snapshot.lineupSnapshot.home.lineup.forEach((player) =>
          registerLineupPlayer(player, "home"),
        );
        snapshot.lineupSnapshot.home.bench.forEach((player) =>
          registerLineupPlayer(player, "home"),
        );
        if (snapshot.lineupSnapshot.away.currentPitcher) {
          registerLineupPlayer(
            snapshot.lineupSnapshot.away.currentPitcher,
            "away",
          );
        }
        if (snapshot.lineupSnapshot.home.currentPitcher) {
          registerLineupPlayer(
            snapshot.lineupSnapshot.home.currentPitcher,
            "home",
          );
        }
      }
      if (snapshot.batterIndices) {
        setAwayBatterIndex(snapshot.batterIndices.away);
        setHomeBatterIndex(snapshot.batterIndices.home);
      }
      setGameState(snapshot.gameState);
      setScoreboard(snapshot.scoreboard);
      if (snapshot.playerStats) {
        setPlayerStats(snapshot.playerStats);
      }
      if (snapshot.pitcherStats) {
        pitcherStatsRef.current = snapshot.pitcherStats;
        setPitcherStats(snapshot.pitcherStats);
      }
      if (snapshot.runnerTrackerState) {
        runnerTrackerRef.current = snapshot.runnerTrackerState;
        setRunnerIdentityVersion((v) => v + 1);
        console.log("[useGameState] Runner tracker restored from snapshot");
      }
    },
    [],
  );

  // Set loading to false after initial setup
  useEffect(() => {
    if (!initialGameId) {
      setIsLoading(false);
    }
  }, [initialGameId]);

  // Playoff context setter (for GameTracker to set from navigation state)
  const setPlayoffContext = useCallback(
    (
      seriesId: string | null,
      gameNumber: number | null,
      playoffId?: string | null,
    ) => {
      playoffSeriesIdRef.current = seriesId;
      playoffGameNumberRef.current = gameNumber;
      playoffIdRef.current = playoffId ?? null;
      syncRestoredPlayoffContext({
        playoffSeriesId: seriesId,
        playoffGameNumber: gameNumber,
        playoffId: playoffId ?? null,
        playoffRound: restoredPlayoffContext.playoffRound,
        isEliminationGame: restoredPlayoffContext.isEliminationGame,
        isClinchGame: restoredPlayoffContext.isClinchGame,
      });
      if (seriesId) {
        console.log(
          `[Playoff] Context set: series=${seriesId}, game=${gameNumber}, playoff=${playoffIdRef.current}`,
        );
      }
    },
    [restoredPlayoffContext, syncRestoredPlayoffContext],
  );

  return {
    gameState,
    scoreboard,
    playerStats,
    pitcherStats,
    recordHit,
    recordOut,
    recordWalk,
    recordD3K,
    recordError,
    commitPlateAppearance,
    recordEvent,
    recordPlayerStateChange,
    reassignRunnerEventAttribution,
    recordManagerMoment,
    recordPromptedManagerDecision,
    recordManagerRecommendationWatch,
    placeGhostRunner,
    advanceRunner,
    advanceRunnersBatch,
    makeSubstitution,
    swapBattingOrder,
    switchPositions,
    changePitcher,
    advanceCount,
    resetCount,
    endInning,
    endGame,
    applyScoreAdjustment,
    applyBasesCorrection,
    updateTrackedRunnerHowReached,
    applyOutsAdjustment,
    scheduleAutoEndInning,
    forceEndHalfInning,
    setRunnerOutcomeCorrectionActive,
    adjustPlayerFieldingErrors,
    queueAutoEndGame,
    evaluateEndGameTrigger,
    // §10.1: Three-phase lifecycle
    startGame,
    // Pitch count prompts (per PITCH_COUNT_TRACKING_SPEC.md)
    pitchCountPrompt,
    confirmPitchCount,
    dismissPitchCountPrompt,
    deferredPitchCounts,
    openDeferredPitchCount,
    initializeGame,
    loadExistingGame,
    undoLastAction,
    getLineupStateSnapshot,
    getBatterIndicesSnapshot,
    restoreState,
    getRunnerTrackerSnapshot,
    getBaseRunnerNames,
    runnerIdentityVersion,
    lineupVersion,
    substitutionLog,
    notifyPersistenceMetadataChanged,
    isLoading,
    isSaving,
    lastSavedAt,
    atBatSequence,
    // T0-01: Auto game-end detection
    showInningEndConfirm,
    confirmInningEnd,
    declineInningEnd,
    showAutoEndPrompt,
    dismissAutoEndPrompt: useCallback(() => setShowAutoEndPrompt(false), []),
    setPlayoffContext,
    setStadiumName,
    setNextEventEnrichment,
    /** Position usage map: playerId → { [position]: outsPlayed } (convert to innings via / 3) */
    positionInnings: positionInningsRef.current,
    // R3-T0: Persistence refs for exhibition config & mojo/fitness
    totalInningsRef,
    extraInningRunnerRef,
    extraInningRunnerDelayRef,
    teamColorsRef,
    playerMojoFitnessGetterRef,
    gameStartTimestampRef,
    restoredMojoFitness,
    restoredCompetitionContext,
    restoredPlayoffContext,
  };
}
