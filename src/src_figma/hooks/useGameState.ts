/**
 * Game State Hook for Figma GameTracker
 *
 * This hook bridges the Figma UI to the existing KBL Tracker data layer.
 * It wraps the existing hooks and provides a simplified interface for the UI.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { getTeamColors } from '@/config/teamColors';
// Import from src/ persistence layer
import {
  logAtBatEvent,
  createGameHeader,
  completeGame,
  getGameEvents,
  getUnaggregatedGames,
  markGameAggregated,
  getGameFieldingEvents,
  getGameHeader,
  type AtBatEvent,
  type RunnerState,
  type GameHeader,
  type FameEventRecord,
} from '../../utils/eventLog';
import type { GameAggregationOptions } from '../../utils/seasonAggregator';
import { processCompletedGame } from '../../utils/processCompletedGame';
import { archiveCompletedGame, type PersistedGameState } from '../utils/gameStorage';
import type { AtBatResult, HalfInning, LineupState, LineupPlayer, BenchPlayer, Position } from '../../types/game';
import { validateSubstitution } from '../../types/game';
import { getBaseOutLI, type BaseState } from '../../engines/leverageCalculator';
import { calculateWPA } from '../../engines/wpaCalculator';
import {
  createRunnerTrackingState,
  addRunner as trackerAddRunner,
  advanceRunner as trackerAdvanceRunner,
  runnerOut as trackerRunnerOut,
  handlePitchingChange as trackerHandlePitchingChange,
  clearBases as trackerClearBases,
  nextInning as trackerNextInning,
  nextAtBat as trackerNextAtBat,
  getCurrentBases as trackerGetCurrentBases,
  type RunnerTrackingState,
  type RunnerScoredEvent,
  type PitcherRunnerStats,
} from '../app/engines/inheritedRunnerTracker';
import type { HowReached } from '../app/types/substitution';

// ============================================
// TYPES
// ============================================

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
  awayTeamId: string;
  homeTeamId: string;
  awayTeamName: string;
  homeTeamName: string;
  stadiumName?: string | null;
  seasonNumber: number;
}

export interface EndGameOptions {
  activityLog?: string[];
  seasonId?: string;
  franchiseId?: string;
  currentSeason?: number;
  currentGame?: number;
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
  hbp: number;    // MAJ-07: Track HBP separately from BB
  k: number;
  sb: number;
  cs: number;
  sf: number;     // MAJ-11: Sacrifice flies
  sh: number;     // MAJ-11: Sacrifice bunts (SH)
  gidp: number;   // MAJ-11: Grounded into double play
}

export interface PitcherGameStats {
  // Core counting stats (existing)
  outsRecorded: number;
  hitsAllowed: number;
  runsAllowed: number;
  earnedRuns: number;
  walksAllowed: number;         // BB only (not IBB or HBP)
  strikeoutsThrown: number;
  homeRunsAllowed: number;
  pitchCount: number;
  battersFaced: number;
  // MAJ-07: New counting stats per PITCHER_STATS_TRACKING_SPEC.md
  intentionalWalks: number;     // IBB
  hitByPitch: number;           // HBP
  wildPitches: number;          // WP
  basesLoadedWalks: number;     // BB/HBP/IBB with bases loaded
  firstInningRuns: number;      // Runs allowed in first inning (starters only)
  consecutiveHRsAllowed: number; // Current streak of consecutive HR allowed
  // Role/timing fields
  isStarter: boolean;
  entryInning: number;          // Which inning pitcher entered
  entryOuts: number;            // Outs when pitcher entered
  exitInning: number | null;    // Which inning pitcher left (null = still active)
  exitOuts: number | null;      // Outs when pitcher left
  finishedGame: boolean;
  // Inherited/bequeathed runners (from inheritedRunnerTracker)
  inheritedRunners: number;
  inheritedRunnersScored: number;
  bequeathedRunners: number;
  bequeathedRunnersScored: number;
  // MAJ-08: Pitcher decisions per PITCHER_STATS_TRACKING_SPEC.md §5-6
  decision: 'W' | 'L' | 'ND' | null;
  save: boolean;
  hold: boolean;
  blownSave: boolean;
}

export interface RunnerAdvancement {
  fromFirst?: 'second' | 'third' | 'home' | 'out';
  fromSecond?: 'third' | 'home' | 'out';
  fromThird?: 'home' | 'out';
}

export type HitType = '1B' | '2B' | '3B' | 'HR';
export type OutType = 'K' | 'KL' | 'GO' | 'FO' | 'LO' | 'PO' | 'DP' | 'TP' | 'FC' | 'SF' | 'SH' | 'D3K';
export type WalkType = 'BB' | 'HBP' | 'IBB';
export type ReachOnErrorType = 'E'; // Batter reaches base on fielding error
export type EventType =
  | 'SB' | 'CS' | 'WP' | 'PB' | 'PICK'
  | 'KILLED' | 'NUTSHOT'
  | 'WEB_GEM' | 'ROBBERY'
  | 'TOOTBLAN'
  | 'BEAT_THROW' | 'BUNT'
  | 'STRIKEOUT' | 'STRIKEOUT_LOOKING' | 'DROPPED_3RD_STRIKE'
  | 'SEVEN_PLUS_PITCH_AB';

// Pitch count prompt types per PITCH_COUNT_TRACKING_SPEC.md
export interface PitchCountPrompt {
  type: 'pitching_change' | 'end_game' | 'end_inning';
  pitcherId: string;
  pitcherName: string;
  currentCount: number;
  lastVerifiedInning: number;
  // For pitching change only
  newPitcherId?: string;
}

export interface UseGameStateReturn {
  // Game state
  gameState: GameState;
  scoreboard: ScoreboardState;
  playerStats: Map<string, PlayerGameStats>;
  pitcherStats: Map<string, PitcherGameStats>;

  // Actions
  recordHit: (hitType: HitType, rbi: number, runnerData?: RunnerAdvancement, pitchCount?: number) => Promise<void>;
  recordOut: (outType: OutType, runnerData?: RunnerAdvancement, pitchCount?: number) => Promise<void>;
  recordWalk: (walkType: WalkType, pitchCount?: number) => Promise<void>;
  recordD3K: (batterReached: boolean, pitchCount?: number) => Promise<void>;
  recordError: (rbi?: number, runnerData?: RunnerAdvancement, pitchCount?: number) => Promise<void>;
  recordEvent: (eventType: EventType, runnerId?: string) => Promise<void>;
  advanceRunner: (from: 'first' | 'second' | 'third', to: 'second' | 'third' | 'home', outcome: 'safe' | 'out') => void;
  /** Batch update runners - processes all movements atomically to avoid race conditions */
  advanceRunnersBatch: (movements: Array<{ from: 'first' | 'second' | 'third'; to: 'second' | 'third' | 'home' | 'out'; outcome: 'safe' | 'out' }>) => void;
  makeSubstitution: (benchPlayerId: string, lineupPlayerId: string, benchPlayerName?: string, lineupPlayerName?: string, options?: { subType?: 'player_sub' | 'pinch_hit' | 'pinch_run' | 'defensive_sub' | 'position_switch' | 'double_switch'; newPosition?: string; base?: '1B' | '2B' | '3B'; isPinchHitter?: boolean }) => { success: boolean; error?: string };
  switchPositions: (switches: Array<{ playerId: string; newPosition: string }>) => void;
  changePitcher: (newPitcherId: string, exitingPitcherId: string, newPitcherName?: string, exitingPitcherName?: string) => void;
  advanceCount: (type: 'ball' | 'strike' | 'foul') => void;
  resetCount: () => void;
  endInning: () => void;
  endGame: (options?: EndGameOptions) => Promise<void>;

  // Pitch count prompts (per PITCH_COUNT_TRACKING_SPEC.md)
  pitchCountPrompt: PitchCountPrompt | null;
  confirmPitchCount: (pitcherId: string, finalCount: number) => { immaculateInning?: { pitcherId: string; pitcherName: string } };
  dismissPitchCountPrompt: () => void;

  // Initialization
  initializeGame: (config: GameInitConfig) => Promise<void>;
  loadExistingGame: () => Promise<boolean>;

  // Undo support
  restoreState: (snapshot: {
    gameState: GameState;
    scoreboard: ScoreboardState;
    playerStats?: Map<string, PlayerGameStats>;
    pitcherStats?: Map<string, PitcherGameStats>;
    runnerTrackerState?: {
      runners: RunnerTrackingState['runners'];
      currentPitcherId: string;
      currentPitcherName: string;
      pitcherStats: Map<string, PitcherRunnerStats>;
      inning: number;
      atBatNumber: number;
    };
  }) => void;
  getRunnerTrackerSnapshot: () => {
    runners: RunnerTrackingState['runners'];
    currentPitcherId: string;
    currentPitcherName: string;
    pitcherStatsEntries: [string, PitcherRunnerStats][];
    inning: number;
    atBatNumber: number;
  };
  // T1-02/03/04: Runner names from tracker (replaces fragile runnerNames state)
  getBaseRunnerNames: () => { first?: string; second?: string; third?: string };
  runnerIdentityVersion: number;

  // Loading/persistence
  isLoading: boolean;
  isSaving: boolean;
  lastSavedAt: number | null;
  atBatSequence: number;

  // T0-01: Auto game-end detection
  showAutoEndPrompt: boolean;
  dismissAutoEndPrompt: () => void;

  // Playoff context setter (called from GameTracker with navigation state)
  setPlayoffContext: (seriesId: string | null, gameNumber: number | null) => void;
  // Stadium selector helper
  setStadiumName: (stadiumName: string | null) => void;
}

export interface GameInitConfig {
  gameId: string;
  seasonId: string;
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
  // Playoff context (optional — set when launching from playoff bracket)
  playoffSeriesId?: string;
  playoffGameNumber?: number;
  // T0-01: Number of regulation innings (default 9, SMB4 franchise often 6 or 7)
  totalInnings?: number;
  stadiumName?: string | null;
  seasonNumber: number;
}

function parseSeasonNumberFromId(seasonId: string): number {
  if (!seasonId) return 1;
  const match = /-season-(\d+)/i.exec(seasonId);
  if (!match) return 1;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function mapAtBatResultFromHit(hitType: HitType): AtBatResult {
  // AtBatResult uses abbreviations: '1B', '2B', '3B', 'HR'
  return hitType;
}

function mapAtBatResultFromOut(outType: OutType): AtBatResult {
  // AtBatResult types per game.ts: 'K', 'KL', 'GO', 'FO', 'LO', 'PO', 'DP', 'TP', 'SF', 'SAC', 'FC', 'D3K'
  switch (outType) {
    case 'K': return 'K';
    case 'KL': return 'KL';
    case 'GO': return 'GO';
    case 'FO': return 'FO';
    case 'LO': return 'LO';
    case 'PO': return 'PO';
    case 'DP': return 'DP';
    case 'TP': return 'TP'; // CRIT-04 fix: Preserve TP as distinct AtBatResult (was losing data by mapping to DP)
    case 'FC': return 'FC';
    case 'SF': return 'SF';
    case 'SH': return 'SAC';
    case 'D3K': return 'D3K';
  }
}

function mapAtBatResultFromWalk(walkType: WalkType): AtBatResult {
  // AtBatResult types per game.ts: 'BB', 'IBB', 'HBP'
  switch (walkType) {
    case 'BB': return 'BB';
    case 'HBP': return 'HBP';
    case 'IBB': return 'IBB';
  }
}

function createEmptyPlayerStats(): PlayerGameStats {
  return {
    pa: 0, ab: 0, h: 0, singles: 0, doubles: 0, triples: 0, hr: 0,
    r: 0, rbi: 0, bb: 0, hbp: 0, k: 0, sb: 0, cs: 0, sf: 0, sh: 0, gidp: 0,
  };
}

// ============================================
// BASEBALL RULES LOGIC
// Ported from src/components/GameTracker/AtBatFlow.tsx
// ============================================

export type RunnerOutcome = 'SCORED' | 'TO_3B' | 'TO_2B' | 'HELD' | 'OUT_HOME' | 'OUT_3B' | 'OUT_2B';

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
  base: 'first' | 'second' | 'third',
  result: AtBatResult,
  bases: Bases
): boolean {
  // On walks/HBP, only runners with occupied bases behind them are forced
  if (['BB', 'IBB', 'HBP'].includes(result)) {
    if (base === 'first') return true; // R1 always forced (batter takes 1B)
    if (base === 'second') return !!bases.first; // R2 forced only if R1 exists
    if (base === 'third') return !!bases.first && !!bases.second; // R3 forced only if bases loaded
  }

  // On singles, batter takes 1B so R1 is forced
  if (result === '1B') {
    if (base === 'first') return true;
    return false;
  }

  // On doubles, batter takes 2B so R1 and R2 are forced
  if (result === '2B') {
    if (base === 'first') return true;
    if (base === 'second') return true;
    return false;
  }

  // On triples, batter takes 3B so all runners must vacate
  if (result === '3B') {
    return true;
  }

  // FC where batter reaches 1B
  if (result === 'FC') {
    if (base === 'first') return true;
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
  base: 'first' | 'second' | 'third',
  result: AtBatResult,
  bases: Bases
): 'second' | 'third' | 'home' | null {
  if (!isRunnerForced(base, result, bases)) return null;

  // On doubles, R1 must go to at least 3B (batter takes 2B)
  if (result === '2B') {
    if (base === 'first') return 'third';
    if (base === 'second') return 'third'; // R2 must vacate for batter
  }

  // On triples, all must score
  if (result === '3B') {
    return 'home';
  }

  // Default: advance one base
  if (base === 'first') return 'second';
  if (base === 'second') return 'third';
  if (base === 'third') return 'home';

  return null;
}

/**
 * Get default/standard outcome for a runner based on result type.
 * Per AtBatFlow.tsx lines 452-557
 */
export function getDefaultRunnerOutcome(
  base: 'first' | 'second' | 'third',
  result: AtBatResult,
  outs: number,
  bases: Bases
): RunnerOutcome {
  const minAdvance = getMinimumAdvancement(base, result, bases);
  const forced = isRunnerForced(base, result, bases);

  // ============================================
  // HITS - Handle based on hit type
  // ============================================

  // DOUBLE (2B): R2 scores, R1 goes to 3B
  if (result === '2B') {
    if (base === 'third') return 'SCORED';
    if (base === 'second') return 'SCORED'; // R2 typically scores on double
    if (base === 'first') return 'TO_3B';   // R1 to 3B
  }

  // TRIPLE (3B): All runners score
  if (result === '3B') {
    return 'SCORED';
  }

  // SINGLE (1B): Standard advancement
  if (result === '1B') {
    if (base === 'third') return 'SCORED';
    if (base === 'second') return 'TO_3B';
    if (base === 'first') return 'TO_2B';
  }

  // HR: All score
  if (result === 'HR') {
    return 'SCORED';
  }

  // ============================================
  // WALKS/HBP - Forced runners advance one base, others hold
  // ============================================
  if (['BB', 'IBB', 'HBP'].includes(result)) {
    if (forced && minAdvance) {
      if (minAdvance === 'home') return 'SCORED';
      if (minAdvance === 'third') return 'TO_3B';
      if (minAdvance === 'second') return 'TO_2B';
    }
    return 'HELD'; // Non-forced runners hold
  }

  // ============================================
  // OUTS - Most runners hold
  // ============================================

  // STRIKEOUTS (K, KL): Runners almost always hold
  if (['K', 'KL', 'D3K'].includes(result)) {
    return 'HELD';
  }

  // GROUND OUTS (GO): Runners typically hold unless advancing
  if (result === 'GO') {
    return 'HELD';
  }

  // FLY OUTS (FO, LO, PO): Runners typically hold
  // Exception: R3 can tag up on FO with < 2 outs
  if (['FO', 'LO', 'PO'].includes(result)) {
    if (base === 'third' && result === 'FO' && outs < 2) {
      return 'SCORED'; // Tag up opportunity
    }
    return 'HELD';
  }

  // DOUBLE PLAY (DP): R1 is typically out, others hold
  if (result === 'DP') {
    if (base === 'first') return 'OUT_2B';
    return 'HELD';
  }

  // TRIPLE PLAY (TP): R1 and R2 are out (CRIT-04 fix: TP now distinct from DP)
  if (result === 'TP') {
    if (base === 'first') return 'OUT_2B';
    if (base === 'second') return 'OUT_3B';
    return 'HELD';
  }

  // SACRIFICE FLY (SF): R3 scores (that's what makes it a SF)
  if (result === 'SF') {
    if (base === 'third') return 'SCORED';
    return 'HELD';
  }

  // SACRIFICE BUNT (SAC): Runners typically advance one base
  if (result === 'SAC') {
    if (base === 'first') return 'TO_2B';
    if (base === 'second') return 'TO_3B';
    return 'HELD';
  }

  // FIELDER'S CHOICE (FC): R1 typically out, batter reaches
  if (result === 'FC') {
    if (base === 'first') return 'OUT_2B';
    return 'HELD';
  }

  // ERROR (E): Runners can advance, default to +1 base
  if (result === 'E') {
    if (base === 'third') return 'SCORED';
    if (base === 'second') return 'TO_3B';
    if (base === 'first') return 'TO_2B';
  }

  return 'HELD';
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
  runnerOutcomes: { first: RunnerOutcome | null; second: RunnerOutcome | null; third: RunnerOutcome | null }
): { correctedResult: AtBatResult; explanation: string } | null {
  // Count runner outs from outcomes
  const countRunnerOuts = (): number => {
    let count = 0;
    if (runnerOutcomes.first?.startsWith('OUT_')) count++;
    if (runnerOutcomes.second?.startsWith('OUT_')) count++;
    if (runnerOutcomes.third?.startsWith('OUT_')) count++;
    return count;
  };

  // FO → SF: If runner from 3rd scores on a fly out with less than 2 outs
  if (initialResult === 'FO' && outs < 2 && bases.third && runnerOutcomes.third === 'SCORED') {
    return {
      correctedResult: 'SF',
      explanation: 'Auto-corrected to Sac Fly (runner scored from 3rd on fly out)',
    };
  }

  // GO → DP: If GO with a runner out, and total outs = 2
  if (initialResult === 'GO' && outs < 2) {
    const runnerOutsCount = countRunnerOuts();

    // If a runner is out, and we'd record 2 total outs (batter + runner)
    if (runnerOutsCount >= 1) {
      return {
        correctedResult: 'DP',
        explanation: 'Auto-corrected to Double Play (2 outs recorded: batter + runner)',
      };
    }
  }

  return null;
}

/**
 * Check if runner advancement exceeds standard for the result.
 * Extra advancement requires explanation (SB, WP, PB, E, BALK).
 * Per AtBatFlow.tsx lines 221-275
 */
export function isExtraAdvancement(
  base: 'first' | 'second' | 'third',
  outcome: RunnerOutcome,
  result: AtBatResult,
  bases: Bases
): boolean {
  // Map outcome to destination
  const outcomeToDestination = (o: RunnerOutcome): '2B' | '3B' | 'HOME' | null => {
    switch (o) {
      case 'TO_2B': return '2B';
      case 'TO_3B': return '3B';
      case 'SCORED': return 'HOME';
      default: return null;
    }
  };

  const destination = outcomeToDestination(outcome);
  if (!destination) return false; // HELD or OUT doesn't need extra event

  // WALKS (BB, IBB, HBP): Standard is forced runners advance exactly 1 base
  if (['BB', 'IBB', 'HBP'].includes(result)) {
    // R1: Standard is TO_2B, anything beyond is extra
    if (base === 'first') {
      return destination !== '2B'; // TO_3B or HOME = extra
    }
    // R2: If forced (R1 exists), standard is TO_3B. If not forced, any advance is extra
    if (base === 'second') {
      if (isRunnerForced('second', result, bases)) {
        return destination === 'HOME'; // Forced R2 scoring = extra
      } else {
        return true; // Non-forced R2 advancing at all = extra
      }
    }
    // R3: If forced (bases loaded), scoring is standard. Otherwise any advance is extra
    if (base === 'third') {
      if (isRunnerForced('third', result, bases)) {
        return false; // Forced R3 scoring = standard
      } else {
        return destination === 'HOME'; // Non-forced R3 scoring = extra
      }
    }
  }

  // STRIKEOUTS (K, KL): Any advancement requires WP, PB, or SB
  if (['K', 'KL'].includes(result)) {
    return true; // Any advancement on K requires extra event
  }

  // SINGLES (1B): R1 scoring on a single is rare - likely error
  if (result === '1B') {
    if (base === 'first' && destination === 'HOME') return true;
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
  runnerOutcomes: { first: RunnerOutcome | null; second: RunnerOutcome | null; third: RunnerOutcome | null },
  bases: Bases
): number {
  let rbis = 0;

  // Count runners who scored
  if (runnerOutcomes.first === 'SCORED') rbis++;
  if (runnerOutcomes.second === 'SCORED') rbis++;
  if (runnerOutcomes.third === 'SCORED') rbis++;

  // HR adds batter's run as RBI
  if (result === 'HR') {
    rbis = (bases.first ? 1 : 0) + (bases.second ? 1 : 0) + (bases.third ? 1 : 0) + 1;
  }

  // Errors don't give RBIs
  if (result === 'E') {
    rbis = 0;
  }

  // DP/TP doesn't give RBIs even if run scores
  if (result === 'DP' || result === 'TP') {
    rbis = 0;
  }

  return rbis;
}

function isForceOutRunner(
  fromBase: 'first' | 'second' | 'third',
  runnerData: RunnerAdvancement,
  basesBeforePlay: Bases
): boolean {
  const destination = fromBase === 'first'
    ? runnerData.fromFirst
    : fromBase === 'second'
      ? runnerData.fromSecond
      : runnerData.fromThird;

  if (destination !== 'out') return false;

  if (fromBase === 'first') return true;
  if (fromBase === 'second') return basesBeforePlay.first;
  return basesBeforePlay.first && basesBeforePlay.second;
}

function shouldInvalidateRunsOnThirdOut(
  outType: OutType,
  outsBeforePlay: number,
  outsOnPlay: number,
  basesBeforePlay: Bases,
  runnerData?: RunnerAdvancement
): boolean {
  const outsAfterPlay = outsBeforePlay + outsOnPlay;
  if (outsAfterPlay < 3) return false;

  // Project Bible: no run can score if the 3rd out is batter-runner out before 1B.
  if (outType === 'GO') return true;

  if (!runnerData) return false;

  // Project Bible: no run can score if the 3rd out is ANY force out.
  return (
    isForceOutRunner('first', runnerData, basesBeforePlay) ||
    isForceOutRunner('second', runnerData, basesBeforePlay) ||
    isForceOutRunner('third', runnerData, basesBeforePlay)
  );
}

/**
 * Helper type definitions matching src/types/game.ts
 */
export function isOut(result: AtBatResult): boolean {
  return ['K', 'KL', 'GO', 'FO', 'LO', 'PO', 'DP', 'TP', 'SF', 'SAC'].includes(result);
}

export function isHit(result: AtBatResult): boolean {
  return ['1B', '2B', '3B', 'HR'].includes(result);
}

export function reachesBase(result: AtBatResult): boolean {
  return ['1B', '2B', '3B', 'HR', 'BB', 'IBB', 'HBP', 'E', 'FC', 'D3K'].includes(result);
}

/**
 * Convert base position name to tracker base format
 */
function baseToTrackerBase(base: 'first' | 'second' | 'third'): '1B' | '2B' | '3B' {
  return base === 'first' ? '1B' : base === 'second' ? '2B' : '3B';
}

/**
 * Convert tracker base to position name format
 */
function trackerBaseToPosition(base: '1B' | '2B' | '3B'): 'first' | 'second' | 'third' {
  return base === '1B' ? 'first' : base === '2B' ? 'second' : 'third';
}

/**
 * Ensure the tracker's current pitcher matches the game state's current pitcher.
 * This is necessary after half-inning transitions where endInning() clears bases
 * but doesn't know about the opposing team's pitcher.
 */
function syncTrackerPitcher(state: RunnerTrackingState, pitcherId: string, pitcherName: string): RunnerTrackingState {
  if (state.currentPitcherId === pitcherId) return state;
  return { ...state, currentPitcherId: pitcherId, currentPitcherName: pitcherName };
}

/**
 * Find a runner in the tracker by their current base position
 */
function findRunnerOnBase(state: RunnerTrackingState, base: 'first' | 'second' | 'third'): string | null {
  const trackerBase = baseToTrackerBase(base);
  const runner = state.runners.find(r => r.currentBase === trackerBase);
  return runner?.runnerId ?? null;
}

/**
 * Build runner info for event logging from tracker state.
 * Replaces empty-string runnerId stubs with actual runner IDs from the tracker.
 */
function buildRunnerInfo(
  trackerState: RunnerTrackingState,
  base: 'first' | 'second' | 'third',
  occupied: boolean,
  fallbackPitcherId: string,
): { runnerId: string; runnerName: string; responsiblePitcherId: string } | null {
  if (!occupied) return null;
  const trackerBase = baseToTrackerBase(base);
  const runner = trackerState.runners.find(r => r.currentBase === trackerBase);
  return {
    runnerId: runner?.runnerId ?? '',
    runnerName: runner?.runnerName ?? '',
    responsiblePitcherId: runner?.responsiblePitcherId ?? fallbackPitcherId,
  };
}

/**
 * Build runnersAfter snapshot from the tracker state.
 * Call AFTER tracker has been updated with all runner movements for this play.
 */
function buildRunnersAfter(
  trackerState: RunnerTrackingState,
): { first: { runnerId: string; runnerName: string; responsiblePitcherId: string } | null;
     second: { runnerId: string; runnerName: string; responsiblePitcherId: string } | null;
     third: { runnerId: string; runnerName: string; responsiblePitcherId: string } | null } {
  const findOnBase = (base: '1B' | '2B' | '3B') => {
    const runner = trackerState.runners.find(r => r.currentBase === base);
    if (!runner) return null;
    return {
      runnerId: runner.runnerId,
      runnerName: runner.runnerName,
      responsiblePitcherId: runner.responsiblePitcherId,
    };
  };
  return {
    first: findOnBase('1B'),
    second: findOnBase('2B'),
    third: findOnBase('3B'),
  };
}

/**
 * Convert destination to tracker format
 */
function destToTrackerBase(dest: 'second' | 'third' | 'home'): '1B' | '2B' | '3B' | 'HOME' {
  if (dest === 'home') return 'HOME';
  return dest === 'second' ? '2B' : '3B';
}

/**
 * Process scored events from the tracker and attribute ER/UER to correct pitchers.
 * Returns the number of earned runs and total runs, and updates pitcherStats.
 */
function processTrackerScoredEvents(
  scoredEvents: RunnerScoredEvent[],
  setPitcherStats: React.Dispatch<React.SetStateAction<Map<string, PitcherGameStats>>>,
  createEmpty: () => PitcherGameStats
): { earnedRuns: number; totalRuns: number } {
  let earnedRuns = 0;
  const totalRuns = scoredEvents.length;

  for (const event of scoredEvents) {
    if (event.wasEarnedRun) earnedRuns++;

    // Attribute run to the RESPONSIBLE pitcher (who allowed runner on base)
    setPitcherStats(prev => {
      const newStats = new Map(prev);
      const pStats = newStats.get(event.chargedToPitcherId) || createEmpty();
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

/**
 * MAJ-08: Calculate pitcher decisions (W/L/SV/H/BS) at game end.
 * Per PITCHER_STATS_TRACKING_SPEC.md §5-6.
 *
 * Mutates the PitcherGameStats objects in the provided Map.
 */
async function calculatePitcherDecisions(
  pitcherStats: Map<string, PitcherGameStats>,
  homeScore: number,
  awayScore: number,
  gameInnings: number,
  gameId: string,
): Promise<void> {
  if (homeScore === awayScore) return; // Tie game = no decisions

  const winningTeam = homeScore > awayScore ? 'home' : 'away';
  const losingTeam = winningTeam === 'home' ? 'away' : 'home';

  // Separate pitchers by team
  const teamPitchers: { id: string; stats: PitcherGameStats; team: 'away' | 'home' }[] = [];
  pitcherStats.forEach((stats, id) => {
    const team: 'away' | 'home' = id.toLowerCase().startsWith('away-') ? 'away' : 'home';
    teamPitchers.push({ id, stats, team });
  });

  const winTeamPitchers = teamPitchers.filter(p => p.team === winningTeam);
  const loseTeamPitchers = teamPitchers.filter(p => p.team !== winningTeam);

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
          const winScoreBefore = winningTeam === 'home' ? evt.homeScore : evt.awayScore;
          const loseScoreBefore = winningTeam === 'home' ? evt.awayScore : evt.homeScore;
          const winScoreAfter = winningTeam === 'home' ? evt.homeScoreAfter : evt.awayScoreAfter;
          const loseScoreAfter = winningTeam === 'home' ? evt.awayScoreAfter : evt.homeScoreAfter;

          const leadBefore = winScoreBefore - loseScoreBefore;
          const leadAfter = winScoreAfter - loseScoreAfter;

          // Did the winning team take or re-take the lead on this at-bat?
          if (leadBefore <= 0 && leadAfter > 0) {
            // This is a go-ahead moment. The pitcher of the LOSING team
            // who was pitching at this at-bat is the candidate for the L.
            // The losing team is the team pitching when the winning team bats.
            // If winning team is batting: the pitcher is on the losing team.
            const pitcherTeam = evt.pitcherTeamId.toLowerCase().startsWith('away') ? 'away' : 'home';
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
      console.warn('[calculatePitcherDecisions] Failed to read events for lead tracking, using fallback:', err);
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
    const lp = loseTeamPitchers.find(p => p.id === losingPitcherId);
    if (lp) {
      lp.stats.decision = 'L';
    } else {
      // ID not in loseTeamPitchers (shouldn't happen) — fallback to first
      loseTeamPitchers[0].stats.decision = 'L';
    }

    // Mark rest as ND
    for (const p of loseTeamPitchers) {
      if (p.stats.decision === null) p.stats.decision = 'ND';
    }
  }

  // --- WIN: Starter gets W if ≥5 IP (15 outs, scaled for short games) ---
  const minOutsForQualifyingW = Math.min(15, Math.floor(gameInnings * 5 / 9 * 3));
  const starter = winTeamPitchers.find(p => p.stats.isStarter);

  if (starter && starter.stats.outsRecorded >= minOutsForQualifyingW) {
    starter.stats.decision = 'W';
  } else {
    // Starter didn't qualify — find the most effective reliever
    // "Most effective" = most outs recorded among relievers
    const relievers = winTeamPitchers.filter(p => !p.stats.isStarter && p.stats.outsRecorded > 0);
    if (relievers.length > 0) {
      let bestReliever = relievers[0];
      for (const r of relievers) {
        if (r.stats.outsRecorded > bestReliever.stats.outsRecorded) {
          bestReliever = r;
        }
      }
      bestReliever.stats.decision = 'W';
    } else if (starter) {
      // If no relievers recorded outs, starter still gets W
      starter.stats.decision = 'W';
    }
  }

  // --- SAVE: Last pitcher on winning team who isn't the W pitcher ---
  const lastWinPitcher = winTeamPitchers.find(p => p.stats.finishedGame);
  if (lastWinPitcher && lastWinPitcher.stats.decision !== 'W' && !lastWinPitcher.stats.isStarter) {
    const scoreDiff = Math.abs(homeScore - awayScore);
    const outs = lastWinPitcher.stats.outsRecorded;

    // Save criteria: entered with ≤3 run lead and pitched ≥1 inning,
    // OR entered with tying run on base/at-bat/on-deck,
    // OR pitched ≥3 innings
    const criterion1 = scoreDiff <= 3 && outs >= 3;
    const criterion3 = outs >= 9; // 3+ innings

    // Simplified criterion 2: if inherited runners ≥ 1 and lead was small
    const criterion2 = lastWinPitcher.stats.inheritedRunners > 0 && scoreDiff <= 4;

    if (criterion1 || criterion2 || criterion3) {
      lastWinPitcher.stats.save = true;
    }
  }

  // Mark remaining winning team pitchers as ND
  for (const p of winTeamPitchers) {
    if (p.stats.decision === null) p.stats.decision = 'ND';
  }
}

function createEmptyPitcherStats(): PitcherGameStats {
  return {
    outsRecorded: 0, hitsAllowed: 0, runsAllowed: 0, earnedRuns: 0,
    walksAllowed: 0, strikeoutsThrown: 0, homeRunsAllowed: 0,
    pitchCount: 0, battersFaced: 0,
    // MAJ-07 new fields
    intentionalWalks: 0, hitByPitch: 0, wildPitches: 0,
    basesLoadedWalks: 0, firstInningRuns: 0, consecutiveHRsAllowed: 0,
    isStarter: false, entryInning: 1, entryOuts: 0,
    exitInning: null, exitOuts: null, finishedGame: false,
    inheritedRunners: 0, inheritedRunnersScored: 0,
    bequeathedRunners: 0, bequeathedRunnersScored: 0,
    decision: null, save: false, hold: false, blownSave: false,
  };
}

// ============================================
// MAIN HOOK
// ============================================

export function useGameState(initialGameId?: string): UseGameStateReturn {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  // T0-01: Auto game-end detection prompt
  const [showAutoEndPrompt, setShowAutoEndPrompt] = useState(false);
  const [atBatSequence, setAtBatSequence] = useState(0);

  // Current batter index for each team
  const [awayBatterIndex, setAwayBatterIndex] = useState(0);
  const [homeBatterIndex, setHomeBatterIndex] = useState(0);

  // Lineup storage
  const awayLineupRef = useRef<{ playerId: string; playerName: string; position: string }[]>([]);
  const homeLineupRef = useRef<{ playerId: string; playerName: string; position: string }[]>([]);
  const seasonIdRef = useRef<string>('');

  // MAJ-09: Full LineupState tracking for substitution validation
  const awayLineupStateRef = useRef<LineupState>({
    lineup: [], bench: [], usedPlayers: [], currentPitcher: null,
  });
  const homeLineupStateRef = useRef<LineupState>({
    lineup: [], bench: [], usedPlayers: [], currentPitcher: null,
  });

  // Playoff context refs (set from GameTracker navigation state)
  const playoffSeriesIdRef = useRef<string | null>(null);
  const playoffGameNumberRef = useRef<number | null>(null);

  const [gameState, setGameState] = useState<GameState>({
    gameId: initialGameId || '',
    homeScore: 0,
    awayScore: 0,
    inning: 1,
    isTop: true,
    outs: 0,
    balls: 0,
    strikes: 0,
    bases: { first: false, second: false, third: false },
    currentBatterId: '',
    currentBatterName: '',
    currentPitcherId: '',
    currentPitcherName: '',
    awayTeamId: '',
    homeTeamId: '',
    awayTeamName: '',
    homeTeamName: '',
    stadiumName: null,
    seasonNumber: 1,
  });

  const [scoreboard, setScoreboard] = useState<ScoreboardState>({
    innings: Array(9).fill(null).map(() => ({ away: undefined, home: undefined })),
    away: { runs: 0, hits: 0, errors: 0 },
    home: { runs: 0, hits: 0, errors: 0 },
  });

  const setStadiumName = useCallback((name: string | null) => {
    setGameState(prev => ({ ...prev, stadiumName: name }));
  }, []);

  const [playerStats, setPlayerStats] = useState<Map<string, PlayerGameStats>>(new Map());
  const [pitcherStats, setPitcherStats] = useState<Map<string, PitcherGameStats>>(new Map());

  // Track pitcher ID → name mapping for post-game summary (EXH-011 pitcher names fix)
  const pitcherNamesRef = useRef<Map<string, string>>(new Map());

  // Fame events tracked during game (per SPECIAL_EVENTS_SPEC.md)
  const [fameEvents, setFameEvents] = useState<FameEventRecord[]>([]);

  // T1-02/03/04: Counter that increments when runner identity changes (pinch runner, etc.)
  // Used as a dependency trigger for the runnerNames sync effect in GameTracker.
  const [runnerIdentityVersion, setRunnerIdentityVersion] = useState(0);

  // Substitution log for game history
  const [substitutionLog, setSubstitutionLog] = useState<Array<{
    type: 'player_sub' | 'pitching_change' | 'pinch_hit' | 'pinch_run' | 'defensive_sub' | 'position_switch' | 'double_switch';
    inning: number;
    halfInning: 'TOP' | 'BOTTOM';
    outgoingPlayerId: string;
    outgoingPlayerName: string;
    incomingPlayerId: string;
    incomingPlayerName: string;
    timestamp: number;
  }>>([]);

  // Pitch count prompt state (per PITCH_COUNT_TRACKING_SPEC.md)
  const [pitchCountPrompt, setPitchCountPrompt] = useState<PitchCountPrompt | null>(null);
  const pendingActionRef = useRef<(() => Promise<void>) | null>(null);

  // Ref to hold endInning function to avoid circular dependency
  const endInningRef = useRef<(() => void) | null>(null);

  // T0-01: Regulation innings for auto game-end detection (default 9)
  const totalInningsRef = useRef<number>(9);

  // CRIT-02 + MAJ-05: Shadow state for inherited runner tracking (ER/UER attribution)
  // This ref mirrors the boolean bases but stores rich runner identity data.
  // It does NOT trigger re-renders — only provides data for ER calculations.
  const runnerTrackerRef = useRef<RunnerTrackingState>(
    createRunnerTrackingState('', '')
  );

  // Inning-level pitch tracking for immaculate inning detection
  // Tracks total pitches and strikeouts per half-inning
  const inningPitchesRef = useRef({ pitches: 0, strikeouts: 0, pitcherId: '' });

  // ============================================
  // INITIALIZATION
  // ============================================

  const initializeGame = useCallback(async (config: GameInitConfig) => {
    setIsLoading(true);

    // Clear all state from previous game (fix for stale data issue EXH-011)
    setFameEvents([]);
    setSubstitutionLog([]);
    setPitchCountPrompt(null);
    pitcherNamesRef.current.clear();
    inningPitchesRef.current = { pitches: 0, strikeouts: 0, pitcherId: '' };
    setScoreboard({
      innings: Array(9).fill({ away: undefined, home: undefined }),
      away: { runs: 0, hits: 0, errors: 0 },
      home: { runs: 0, hits: 0, errors: 0 },
    });

    // Store lineup refs
    awayLineupRef.current = config.awayLineup;
    homeLineupRef.current = config.homeLineup;
    seasonIdRef.current = config.seasonId;
    totalInningsRef.current = config.totalInnings || 9;

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
      bench: (config.awayBench || []).map(b => ({
        playerId: b.playerId,
        playerName: b.playerName,
        positions: b.positions as Position[],
        isAvailable: true,
      })),
      usedPlayers: [],
      currentPitcher: {
        playerId: config.awayStartingPitcherId,
        playerName: config.awayStartingPitcherName,
        position: 'P' as Position,
        battingOrder: config.awayLineup.findIndex(p => p.playerId === config.awayStartingPitcherId) + 1 || 1,
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
      bench: (config.homeBench || []).map(b => ({
        playerId: b.playerId,
        playerName: b.playerName,
        positions: b.positions as Position[],
        isAvailable: true,
      })),
      usedPlayers: [],
      currentPitcher: {
        playerId: config.homeStartingPitcherId,
        playerName: config.homeStartingPitcherName,
        position: 'P' as Position,
        battingOrder: config.homeLineup.findIndex(p => p.playerId === config.homeStartingPitcherId) + 1 || 1,
        enteredInning: 1,
        isStarter: true,
      },
    };

    // Store playoff context if provided
    playoffSeriesIdRef.current = config.playoffSeriesId || null;
    playoffGameNumberRef.current = config.playoffGameNumber || null;

    // Create game header in IndexedDB
    await createGameHeader({
      gameId: config.gameId,
      seasonId: config.seasonId,
      date: Date.now(),
      awayTeamId: config.awayTeamId,
      homeTeamId: config.homeTeamId,
      awayTeamName: config.awayTeamName,
      homeTeamName: config.homeTeamName,
      finalScore: null,
      finalInning: 9,
      isComplete: false,
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
    pitcherNamesRef.current.set(config.awayStartingPitcherId, config.awayStartingPitcherName);
    pitcherNamesRef.current.set(config.homeStartingPitcherId, config.homeStartingPitcherName);

    // CRIT-02: Initialize runner tracker with home starting pitcher (they pitch first in top of 1st)
    runnerTrackerRef.current = createRunnerTrackingState(
      config.homeStartingPitcherId,
      config.homeStartingPitcherName
    );

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
      currentBatterId: leadoffBatter?.playerId || '',
      currentBatterName: leadoffBatter?.playerName || '',
      currentPitcherId: config.homeStartingPitcherId,
      currentPitcherName: config.homeStartingPitcherName,
      awayTeamId: config.awayTeamId,
      homeTeamId: config.homeTeamId,
      awayTeamName: config.awayTeamName,
      homeTeamName: config.homeTeamName,
      stadiumName: config.stadiumName || null,
      seasonNumber: config.seasonNumber,
    });

    setAwayBatterIndex(0);
    setHomeBatterIndex(0);
    setAtBatSequence(0);
    setIsLoading(false);
  }, []);

  const loadExistingGame = useCallback(async (): Promise<boolean> => {
    setIsLoading(true);
    try {
      // Find incomplete games (not aggregated means game in progress or not finalized)
      const incompleteGames = await getUnaggregatedGames();
      const inProgressGame = incompleteGames.find(g => !g.isComplete);

      if (inProgressGame) {
        // Get the last event to reconstruct current state
        const events = await getGameEvents(inProgressGame.gameId);
        const lastEvent = events.length > 0 ? events[events.length - 1] : null;

        setGameState({
          gameId: inProgressGame.gameId,
          homeScore: lastEvent?.homeScoreAfter ?? 0,
          awayScore: lastEvent?.awayScoreAfter ?? 0,
          inning: lastEvent?.inning ?? 1,
          isTop: lastEvent?.halfInning === 'TOP',
          outs: lastEvent?.outsAfter ?? 0,
          balls: 0,
          strikes: 0,
          bases: {
            first: !!lastEvent?.runnersAfter?.first,
            second: !!lastEvent?.runnersAfter?.second,
            third: !!lastEvent?.runnersAfter?.third,
          },
          currentBatterId: '',
          currentBatterName: '',
          currentPitcherId: '',
          currentPitcherName: '',
          awayTeamId: inProgressGame.awayTeamId,
          homeTeamId: inProgressGame.homeTeamId,
          awayTeamName: inProgressGame.awayTeamName,
          homeTeamName: inProgressGame.homeTeamName,
          stadiumName: inProgressGame.stadiumName ?? null,
          seasonNumber: parseSeasonNumberFromId(inProgressGame.seasonId),
        });
        setAtBatSequence(events.length);
        seasonIdRef.current = inProgressGame.seasonId;
        setIsLoading(false);
        return true;
      }
    } catch (err) {
      console.error('[useGameState] Error loading existing game:', err);
    }
    setIsLoading(false);
    return false;
  }, []);

  // ============================================
  // CORE ACTIONS
  // ============================================

  const advanceToNextBatter = useCallback(() => {
    setGameState(prev => {
      const battingTeamLineup = prev.isTop ? awayLineupRef.current : homeLineupRef.current;
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
        currentBatterId: nextBatter?.playerId || '',
        currentBatterName: nextBatter?.playerName || '',
      };
    });
  }, [awayBatterIndex, homeBatterIndex]);

  const recordHit = useCallback(async (hitType: HitType, rbi: number, runnerData?: RunnerAdvancement, pitchCount: number = 1) => {
    const newSequence = atBatSequence + 1;
    setAtBatSequence(newSequence);

    const battingTeamId = gameState.isTop ? gameState.awayTeamId : gameState.homeTeamId;
    const pitchingTeamId = gameState.isTop ? gameState.homeTeamId : gameState.awayTeamId;

    // Calculate runs scored
    let runsScored = hitType === 'HR' ? 1 : 0; // Batter scores on HR
    if (runnerData?.fromFirst === 'home') runsScored++;
    if (runnerData?.fromSecond === 'home') runsScored++;
    if (runnerData?.fromThird === 'home') runsScored++;

    // CRIT-02: Update runner tracker — advance existing runners FIRST, then add batter
    const scoredEvents: RunnerScoredEvent[] = [];
    let tracker = syncTrackerPitcher(runnerTrackerRef.current, gameState.currentPitcherId, gameState.currentPitcherName);

    // Advance existing runners per runnerData
    if (runnerData) {
      // Process in order: third → second → first (avoid collision)
      for (const [base, dest] of [
        ['third', runnerData.fromThird],
        ['second', runnerData.fromSecond],
        ['first', runnerData.fromFirst],
      ] as const) {
        if (!dest) continue;
        const runnerId = findRunnerOnBase(tracker, base as 'first' | 'second' | 'third');
        if (!runnerId) continue;

        if (dest === 'out') {
          tracker = trackerRunnerOut(tracker, runnerId);
        } else {
          const trackerDest = destToTrackerBase(dest);
          const result = trackerAdvanceRunner(tracker, runnerId, trackerDest);
          tracker = result.state;
          if (result.scoredEvent) scoredEvents.push(result.scoredEvent);
        }
      }
    } else if (hitType === 'HR') {
      // HR with no runnerData: all runners score
      for (const base of ['third', 'second', 'first'] as const) {
        const runnerId = findRunnerOnBase(tracker, base);
        if (runnerId) {
          const result = trackerAdvanceRunner(tracker, runnerId, 'HOME');
          tracker = result.state;
          if (result.scoredEvent) scoredEvents.push(result.scoredEvent);
        }
      }
    }

    // Add batter to tracker
    const howReached: HowReached = 'hit';
    if (hitType === 'HR') {
      // Batter scores immediately on HR — add then advance to HOME
      tracker = trackerAddRunner(tracker, gameState.currentBatterId, gameState.currentBatterName, '1B', howReached);
      const hrResult = trackerAdvanceRunner(tracker, gameState.currentBatterId, 'HOME');
      tracker = hrResult.state;
      if (hrResult.scoredEvent) scoredEvents.push(hrResult.scoredEvent);
    } else {
      const batterBase = hitType === '1B' ? '1B' : hitType === '2B' ? '2B' : '3B';
      tracker = trackerAddRunner(tracker, gameState.currentBatterId, gameState.currentBatterName, batterBase, howReached);
    }

    // Advance at-bat counter in tracker
    tracker = trackerNextAtBat(tracker);
    runnerTrackerRef.current = tracker;

    // Calculate leverage index from base-out state
    const baseState: BaseState = (
      (gameState.bases.first ? 1 : 0) +
      (gameState.bases.second ? 2 : 0) +
      (gameState.bases.third ? 4 : 0)
    ) as BaseState;
    const outs = Math.min(gameState.outs, 2) as 0 | 1 | 2;
    const leverageIndex = getBaseOutLI(baseState, outs);

    // Detect walk-off: home team batting in bottom of 9+ and takes the lead
    const isBottom = !gameState.isTop;
    const isLateGame = gameState.inning >= 9;
    const homeScoreAfter = isBottom ? gameState.homeScore + runsScored : gameState.homeScore;
    const awayScoreAfter = gameState.isTop ? gameState.awayScore + runsScored : gameState.awayScore;
    const isWalkOff = isBottom && isLateGame && homeScoreAfter > awayScoreAfter && gameState.homeScore <= gameState.awayScore;

    // Clutch = high leverage (LI >= 1.5)
    const isClutch = leverageIndex >= 1.5;

    const runnerOutcomesForRbi: { first: RunnerOutcome | null; second: RunnerOutcome | null; third: RunnerOutcome | null } = {
      first: !gameState.bases.first ? null
        : (hitType === 'HR' && !runnerData) ? 'SCORED'
        : runnerData?.fromFirst === 'home' ? 'SCORED'
        : runnerData?.fromFirst === 'third' ? 'TO_3B'
        : runnerData?.fromFirst === 'second' ? 'TO_2B'
        : runnerData?.fromFirst === 'out' ? 'OUT_2B'
        : 'HELD',
      second: !gameState.bases.second ? null
        : (hitType === 'HR' && !runnerData) ? 'SCORED'
        : runnerData?.fromSecond === 'home' ? 'SCORED'
        : runnerData?.fromSecond === 'third' ? 'TO_3B'
        : runnerData?.fromSecond === 'out' ? 'OUT_3B'
        : 'HELD',
      third: !gameState.bases.third ? null
        : (hitType === 'HR' && !runnerData) ? 'SCORED'
        : runnerData?.fromThird === 'home' ? 'SCORED'
        : runnerData?.fromThird === 'out' ? 'OUT_HOME'
        : 'HELD',
    };
    const calculatedRbi = calculateRBIs(mapAtBatResultFromHit(hitType), runnerOutcomesForRbi, gameState.bases);

    // Create at-bat event
    const event: AtBatEvent = {
      eventId: `${gameState.gameId}_${newSequence}`,
      gameId: gameState.gameId,
      sequence: newSequence,
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
      halfInning: gameState.isTop ? 'TOP' : 'BOTTOM',
      outs: gameState.outs,
      runners: {
        first: buildRunnerInfo(runnerTrackerRef.current, 'first', !!gameState.bases.first, gameState.currentPitcherId),
        second: buildRunnerInfo(runnerTrackerRef.current, 'second', !!gameState.bases.second, gameState.currentPitcherId),
        third: buildRunnerInfo(runnerTrackerRef.current, 'third', !!gameState.bases.third, gameState.currentPitcherId),
      },
      awayScore: gameState.awayScore,
      homeScore: gameState.homeScore,
      outsAfter: gameState.outs,
      runnersAfter: buildRunnersAfter(runnerTrackerRef.current),
      awayScoreAfter: gameState.isTop ? gameState.awayScore + runsScored : gameState.awayScore,
      homeScoreAfter: gameState.isTop ? gameState.homeScore : gameState.homeScore + runsScored,
      leverageIndex,
      // MAJ-12: WPA from win expectancy table
      ...(() => {
        const rAfter = buildRunnersAfter(runnerTrackerRef.current);
        const wpaResult = calculateWPA(
          { inning: gameState.inning, isTop: gameState.isTop, outs: gameState.outs,
            bases: gameState.bases, homeScore: gameState.homeScore, awayScore: gameState.awayScore },
          { outs: gameState.outs,
            bases: { first: !!rAfter.first, second: !!rAfter.second, third: !!rAfter.third },
            homeScore: gameState.isTop ? gameState.homeScore : gameState.homeScore + runsScored,
            awayScore: gameState.isTop ? gameState.awayScore + runsScored : gameState.awayScore }
        );
        return wpaResult;
      })(),
      ballInPlay: null,
      fameEvents: [],
      isLeadoff: gameState.outs === 0 && !gameState.bases.first && !gameState.bases.second && !gameState.bases.third,
      isClutch,
      isWalkOff
    };

    // Log to IndexedDB
    await logAtBatEvent(event);

    // Update player stats
    setPlayerStats(prev => {
      const newStats = new Map(prev);
      const batterStats = newStats.get(gameState.currentBatterId) || createEmptyPlayerStats();
      batterStats.pa++;
      batterStats.ab++;
      batterStats.h++;
      if (hitType === '1B') batterStats.singles++;
      if (hitType === '2B') batterStats.doubles++;
      if (hitType === '3B') batterStats.triples++;
      if (hitType === 'HR') batterStats.hr++;
      batterStats.rbi += calculatedRbi;
      if (hitType === 'HR') batterStats.r++; // Batter scores on HR
      newStats.set(gameState.currentBatterId, batterStats);
      return newStats;
    });

    // Update pitcher stats — CRIT-02: Use tracker for ER attribution
    // First: update current pitcher's non-run stats (hits, pitch count, etc.)
    setPitcherStats(prev => {
      const newStats = new Map(prev);
      const pStats = newStats.get(gameState.currentPitcherId) || createEmptyPitcherStats();
      pStats.hitsAllowed++;
      pStats.battersFaced++;
      pStats.pitchCount += pitchCount;
      if (hitType === 'HR') {
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
      processTrackerScoredEvents(scoredEvents, setPitcherStats, createEmptyPitcherStats);
    }

    // Update scoreboard
    setScoreboard(prev => {
      const teamKey = gameState.isTop ? 'away' : 'home';
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
    setGameState(prev => {
      let newBases = { first: false, second: false, third: false };

      // Place batter on base based on hit type (unless HR)
      if (hitType === '1B') newBases.first = true;
      if (hitType === '2B') newBases.second = true;
      if (hitType === '3B') newBases.third = true;
      // HR: batter scores, bases cleared above

      // Handle runner advancement
      // IMPORTANT: Runners not mentioned in runnerData STAY on their current base
      // (unless the batter is taking that base)
      if (runnerData) {
        // Explicit advancements from runnerData
        if (runnerData.fromFirst === 'second') newBases.second = true;
        if (runnerData.fromFirst === 'third') newBases.third = true;
        if (runnerData.fromSecond === 'third') newBases.third = true;
        // Note: 'home' and 'out' destinations don't need base tracking

        // Preserve runners who weren't mentioned (they stay put)
        // R1 stays if not mentioned AND batter isn't taking first
        if (prev.bases.first && !runnerData.fromFirst && hitType !== '1B') {
          newBases.first = true;
        }
        // R2 stays if not mentioned AND no one is moving there
        if (prev.bases.second && !runnerData.fromSecond && runnerData.fromFirst !== 'second') {
          newBases.second = true;
        }
        // R3 stays if not mentioned AND no one is moving there
        if (prev.bases.third && !runnerData.fromThird && runnerData.fromFirst !== 'third' && runnerData.fromSecond !== 'third') {
          newBases.third = true;
        }
      } else {
        // No runnerData - preserve all existing runners except where batter goes
        if (prev.bases.first && hitType !== '1B') newBases.first = true;
        if (prev.bases.second && hitType !== '2B') newBases.second = true;
        if (prev.bases.third && hitType !== '3B') newBases.third = true;
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
  }, [gameState, atBatSequence, advanceToNextBatter]);

  const recordOut = useCallback(async (outType: OutType, runnerData?: RunnerAdvancement, pitchCount: number = 1) => {
    const newSequence = atBatSequence + 1;
    setAtBatSequence(newSequence);

    // Track inning strikeouts for immaculate inning detection
    // (Pitch count will be confirmed by user at end of inning)
    if (outType === 'K' || outType === 'KL') {
      inningPitchesRef.current.strikeouts++;
    }

    const battingTeamId = gameState.isTop ? gameState.awayTeamId : gameState.homeTeamId;
    const pitchingTeamId = gameState.isTop ? gameState.homeTeamId : gameState.awayTeamId;

    // Calculate outs on play:
    // - DP = 2 outs, TP = 3 outs (batter + runners)
    // - FC = 1 out (runner out, batter SAFE) - batter does NOT count as out
    // - Otherwise start with 1 (batter out) and add any runners thrown out
    let outsOnPlay: number;

    if (outType === 'DP') {
      outsOnPlay = 2;
    } else if (outType === 'TP') {
      outsOnPlay = 3;
    } else if (outType === 'FC') {
      // FC: Batter is SAFE at first, only runners count as outs
      outsOnPlay = 0;
      if (runnerData) {
        if (runnerData.fromFirst === 'out') outsOnPlay++;
        if (runnerData.fromSecond === 'out') outsOnPlay++;
        if (runnerData.fromThird === 'out') outsOnPlay++;
      }
      // Default to 1 out if no runner data specified (most common FC scenario)
      if (outsOnPlay === 0) outsOnPlay = 1;
      console.log(`[recordOut] FC: ${outsOnPlay} runner out(s), batter safe at first`);
    } else {
      // Standard out: batter is out
      outsOnPlay = 1;
      // Count additional outs from runners thrown out (e.g., tag up attempt on fly out)
      if (runnerData) {
        if (runnerData.fromFirst === 'out') outsOnPlay++;
        if (runnerData.fromSecond === 'out') outsOnPlay++;
        if (runnerData.fromThird === 'out') outsOnPlay++;
        console.log(`[recordOut] Outs on play: ${outsOnPlay} (batter + ${outsOnPlay - 1} runner(s))`);
      }
    }

    const newOuts = gameState.outs + outsOnPlay;

    // Calculate runs scored on this play before 3rd-out force-play validation.
    let rawRunsScored = 0;
    if (runnerData?.fromThird === 'home') rawRunsScored++;
    if (runnerData?.fromSecond === 'home') rawRunsScored++;
    if (runnerData?.fromFirst === 'home') rawRunsScored++;

    // CRIT-02: Update runner tracker for outs
    const outScoredEvents: RunnerScoredEvent[] = [];
    let outTracker = syncTrackerPitcher(runnerTrackerRef.current, gameState.currentPitcherId, gameState.currentPitcherName);

    if (runnerData) {
      // Process runners: third → second → first (avoid collision)
      for (const [base, dest] of [
        ['third', runnerData.fromThird],
        ['second', runnerData.fromSecond],
        ['first', runnerData.fromFirst],
      ] as const) {
        if (!dest) continue;
        const runnerId = findRunnerOnBase(outTracker, base as 'first' | 'second' | 'third');
        if (!runnerId) continue;

        if (dest === 'out') {
          outTracker = trackerRunnerOut(outTracker, runnerId);
        } else {
          const trackerDest = destToTrackerBase(dest);
          const result = trackerAdvanceRunner(outTracker, runnerId, trackerDest);
          outTracker = result.state;
          if (result.scoredEvent) outScoredEvents.push(result.scoredEvent);
        }
      }
    }

    // FC: batter reaches first base — add to tracker
    if (outType === 'FC') {
      outTracker = trackerAddRunner(outTracker, gameState.currentBatterId, gameState.currentBatterName, '1B', 'FC');
    }

    // Advance at-bat counter
    outTracker = trackerNextAtBat(outTracker);
    runnerTrackerRef.current = outTracker;

    // Calculate leverage index from base-out state
    const baseState: BaseState = (
      (gameState.bases.first ? 1 : 0) +
      (gameState.bases.second ? 2 : 0) +
      (gameState.bases.third ? 4 : 0)
    ) as BaseState;
    const outsForLI = Math.min(gameState.outs, 2) as 0 | 1 | 2;
    const leverageIndex = getBaseOutLI(baseState, outsForLI);

    // Clutch = high leverage (LI >= 1.5)
    const isClutch = leverageIndex >= 1.5;

    // MAJ-07: Auto-correct result based on runner outcomes
    // Convert RunnerAdvancement → RunnerOutcome format for autoCorrectResult
    const runnerOutcomesForCorrection: {
      first: RunnerOutcome | null;
      second: RunnerOutcome | null;
      third: RunnerOutcome | null;
    } = {
      first: !gameState.bases.first ? null
        : runnerData?.fromFirst === 'home' ? 'SCORED'
        : runnerData?.fromFirst === 'third' ? 'TO_3B'
        : runnerData?.fromFirst === 'second' ? 'TO_2B'
        : runnerData?.fromFirst === 'out' ? 'OUT_2B'
        : 'HELD',
      second: !gameState.bases.second ? null
        : runnerData?.fromSecond === 'home' ? 'SCORED'
        : runnerData?.fromSecond === 'third' ? 'TO_3B'
        : runnerData?.fromSecond === 'out' ? 'OUT_3B'
        : 'HELD',
      third: !gameState.bases.third ? null
        : runnerData?.fromThird === 'home' ? 'SCORED'
        : runnerData?.fromThird === 'out' ? 'OUT_HOME'
        : 'HELD',
    };

    const mappedResult = mapAtBatResultFromOut(outType);
    const correction = autoCorrectResult(mappedResult, gameState.outs, gameState.bases, runnerOutcomesForCorrection);
    const effectiveResult = correction ? correction.correctedResult : mappedResult;
    if (correction) {
      console.log(`[recordOut] MAJ-07: ${correction.explanation}`);
    }

    const runsInvalidatedByThirdOutRule = shouldInvalidateRunsOnThirdOut(
      outType,
      gameState.outs,
      outsOnPlay,
      gameState.bases,
      runnerData
    );
    const runsScored = runsInvalidatedByThirdOutRule ? 0 : rawRunsScored;
    const rbiCount = runsInvalidatedByThirdOutRule
      ? 0
      : calculateRBIs(effectiveResult, runnerOutcomesForCorrection, gameState.bases);

    // Create at-bat event
    const event: AtBatEvent = {
      eventId: `${gameState.gameId}_${newSequence}`,
      gameId: gameState.gameId,
      sequence: newSequence,
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
      halfInning: gameState.isTop ? 'TOP' : 'BOTTOM',
      outs: gameState.outs,
      runners: {
        first: buildRunnerInfo(runnerTrackerRef.current, 'first', !!gameState.bases.first, gameState.currentPitcherId),
        second: buildRunnerInfo(runnerTrackerRef.current, 'second', !!gameState.bases.second, gameState.currentPitcherId),
        third: buildRunnerInfo(runnerTrackerRef.current, 'third', !!gameState.bases.third, gameState.currentPitcherId),
      },
      awayScore: gameState.awayScore,
      homeScore: gameState.homeScore,
      outsAfter: Math.min(newOuts, 3),
      runnersAfter: newOuts >= 3 ? { first: null, second: null, third: null } : buildRunnersAfter(runnerTrackerRef.current),
      awayScoreAfter: gameState.isTop ? gameState.awayScore + runsScored : gameState.awayScore,
      homeScoreAfter: gameState.isTop ? gameState.homeScore : gameState.homeScore + runsScored,
      leverageIndex,
      // MAJ-12: WPA from win expectancy table
      ...(() => {
        const rAfter = newOuts >= 3
          ? { first: false, second: false, third: false }
          : (() => { const ra = buildRunnersAfter(runnerTrackerRef.current); return { first: !!ra.first, second: !!ra.second, third: !!ra.third }; })();
        return calculateWPA(
          { inning: gameState.inning, isTop: gameState.isTop, outs: gameState.outs,
            bases: gameState.bases, homeScore: gameState.homeScore, awayScore: gameState.awayScore },
          { outs: newOuts,
            bases: rAfter,
            homeScore: gameState.isTop ? gameState.homeScore : gameState.homeScore + runsScored,
            awayScore: gameState.isTop ? gameState.awayScore + runsScored : gameState.awayScore }
        );
      })(),
      ballInPlay: null,
      fameEvents: [],
      isLeadoff: gameState.outs === 0 && !gameState.bases.first && !gameState.bases.second && !gameState.bases.third,
      isClutch,
      isWalkOff: false, // Outs never cause walk-offs
    };

    await logAtBatEvent(event);

    // Update player stats — MAJ-07: use effectiveResult for corrected type
    const statResult = effectiveResult; // corrected: e.g. FO→SF, GO→DP
    setPlayerStats(prev => {
      const newStats = new Map(prev);
      const batterStats = newStats.get(gameState.currentBatterId) || createEmptyPlayerStats();
      batterStats.pa++;
      if (statResult !== 'SF' && statResult !== 'SAC') {
        batterStats.ab++;
      }
      if (statResult === 'K' || statResult === 'KL' || statResult === 'D3K') {
        batterStats.k++;
      }
      batterStats.rbi += rbiCount;
      if (statResult === 'SF') {
        batterStats.sf++;       // MAJ-11: Track sacrifice flies
      }
      if (statResult === 'SAC') {
        batterStats.sh++;       // MAJ-11: Track sacrifice bunts (SAC = SH in AtBatResult)
      }
      if (statResult === 'DP') {
        batterStats.gidp++;     // MAJ-11: Track grounded into double play
      }
      newStats.set(gameState.currentBatterId, batterStats);
      return newStats;
    });

    // Update pitcher stats — CRIT-02: Use tracker for ER attribution
    setPitcherStats(prev => {
      const newStats = new Map(prev);
      const pStats = newStats.get(gameState.currentPitcherId) || createEmptyPitcherStats();
      pStats.outsRecorded += outsOnPlay;
      pStats.battersFaced++;
      pStats.pitchCount += pitchCount;
      if (outType === 'K' || outType === 'KL' || outType === 'D3K') {
        pStats.strikeoutsThrown++;
      }
      pStats.consecutiveHRsAllowed = 0; // Out breaks HR streak
      // Note: runs/ER now attributed via tracker below (not to current pitcher blindly)
      newStats.set(gameState.currentPitcherId, pStats);
      return newStats;
    });
    // Attribute runs/ER to responsible pitcher via tracker
    if (!runsInvalidatedByThirdOutRule && outScoredEvents.length > 0) {
      processTrackerScoredEvents(outScoredEvents, setPitcherStats, createEmptyPitcherStats);
    }

    // Update scoreboard if runs scored (e.g., sac fly, DP with runner scoring from third)
    if (runsScored > 0) {
      setScoreboard(prev => {
        const teamKey = gameState.isTop ? 'away' : 'home';
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

    // Update game state (including bases from runnerData)
    setGameState(prev => {
      // Start with current bases (runners don't automatically clear on outs)
      let newBases = { ...prev.bases };

      // Handle runner advancement from runnerData
      // If a runner moved or was put out, clear their origin base
      if (runnerData) {
        // Clear origin bases for runners who moved
        if (runnerData.fromFirst !== undefined) newBases.first = false;
        if (runnerData.fromSecond !== undefined) newBases.second = false;
        if (runnerData.fromThird !== undefined) newBases.third = false;

        // Set destination bases for runners who advanced safely
        if (runnerData.fromFirst === 'second') newBases.second = true;
        if (runnerData.fromFirst === 'third') newBases.third = true;
        if (runnerData.fromSecond === 'third') newBases.third = true;
        // Note: 'home' and 'out' don't set any base
      }

      // FC special case: Batter reaches first base
      if (outType === 'FC') {
        newBases.first = true;
        console.log('[recordOut] FC: Batter reaches first base');
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

    // Check for end of inning - auto-end on third out
    if (newOuts >= 3) {
      // Auto-end the inning with a small delay to let UI update
      setTimeout(() => {
        endInningRef.current?.();
      }, 500);
    } else {
      advanceToNextBatter();
    }

    setLastSavedAt(Date.now());
  }, [gameState, atBatSequence, advanceToNextBatter]);

  const recordWalk = useCallback(async (walkType: WalkType, pitchCount: number = 4) => {
    const newSequence = atBatSequence + 1;
    setAtBatSequence(newSequence);

    const battingTeamId = gameState.isTop ? gameState.awayTeamId : gameState.homeTeamId;
    const pitchingTeamId = gameState.isTop ? gameState.homeTeamId : gameState.awayTeamId;

    // Check for bases loaded walk
    const basesLoaded = gameState.bases.first && gameState.bases.second && gameState.bases.third;
    const runsScored = basesLoaded ? 1 : 0;

    // CRIT-02: Update runner tracker for walk (force-advance pattern)
    const walkScoredEvents: RunnerScoredEvent[] = [];
    let walkTracker = syncTrackerPitcher(runnerTrackerRef.current, gameState.currentPitcherId, gameState.currentPitcherName);

    // Force-advance runners (process in order: third → second → first to avoid collision)
    if (basesLoaded) {
      const r3 = findRunnerOnBase(walkTracker, 'third');
      if (r3) {
        const res = trackerAdvanceRunner(walkTracker, r3, 'HOME');
        walkTracker = res.state;
        if (res.scoredEvent) walkScoredEvents.push(res.scoredEvent);
      }
    }
    if (gameState.bases.first && gameState.bases.second) {
      const r2 = findRunnerOnBase(walkTracker, 'second');
      if (r2) {
        const res = trackerAdvanceRunner(walkTracker, r2, '3B');
        walkTracker = res.state;
      }
    }
    if (gameState.bases.first) {
      const r1 = findRunnerOnBase(walkTracker, 'first');
      if (r1) {
        const res = trackerAdvanceRunner(walkTracker, r1, '2B');
        walkTracker = res.state;
      }
    }

    // Add batter to first base
    const walkHow: HowReached = walkType === 'HBP' ? 'HBP' : 'walk';
    walkTracker = trackerAddRunner(walkTracker, gameState.currentBatterId, gameState.currentBatterName, '1B', walkHow);
    walkTracker = trackerNextAtBat(walkTracker);
    runnerTrackerRef.current = walkTracker;

    // Calculate leverage index from base-out state
    const baseState: BaseState = (
      (gameState.bases.first ? 1 : 0) +
      (gameState.bases.second ? 2 : 0) +
      (gameState.bases.third ? 4 : 0)
    ) as BaseState;
    const outs = Math.min(gameState.outs, 2) as 0 | 1 | 2;
    const leverageIndex = getBaseOutLI(baseState, outs);

    // Detect walk-off: home team batting in bottom of 9+ with bases loaded walk taking lead
    const isBottom = !gameState.isTop;
    const isLateGame = gameState.inning >= 9;
    const homeScoreAfter = isBottom ? gameState.homeScore + runsScored : gameState.homeScore;
    const isWalkOff = isBottom && isLateGame && basesLoaded && homeScoreAfter > gameState.awayScore && gameState.homeScore <= gameState.awayScore;

    // Clutch = high leverage (LI >= 1.5)
    const isClutch = leverageIndex >= 1.5;

    const event: AtBatEvent = {
      eventId: `${gameState.gameId}_${newSequence}`,
      gameId: gameState.gameId,
      sequence: newSequence,
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
      halfInning: gameState.isTop ? 'TOP' : 'BOTTOM',
      outs: gameState.outs,
      runners: {
        first: buildRunnerInfo(runnerTrackerRef.current, 'first', !!gameState.bases.first, gameState.currentPitcherId),
        second: buildRunnerInfo(runnerTrackerRef.current, 'second', !!gameState.bases.second, gameState.currentPitcherId),
        third: buildRunnerInfo(runnerTrackerRef.current, 'third', !!gameState.bases.third, gameState.currentPitcherId),
      },
      awayScore: gameState.awayScore,
      homeScore: gameState.homeScore,
      outsAfter: gameState.outs,
      runnersAfter: buildRunnersAfter(runnerTrackerRef.current),
      awayScoreAfter: gameState.isTop ? gameState.awayScore + runsScored : gameState.awayScore,
      homeScoreAfter: isBottom ? homeScoreAfter : gameState.homeScore + runsScored,
      leverageIndex,
      // MAJ-12: WPA from win expectancy table
      ...(() => {
        const rAfter = buildRunnersAfter(runnerTrackerRef.current);
        return calculateWPA(
          { inning: gameState.inning, isTop: gameState.isTop, outs: gameState.outs,
            bases: gameState.bases, homeScore: gameState.homeScore, awayScore: gameState.awayScore },
          { outs: gameState.outs,
            bases: { first: !!rAfter.first, second: !!rAfter.second, third: !!rAfter.third },
            homeScore: isBottom ? gameState.homeScore + runsScored : gameState.homeScore,
            awayScore: gameState.isTop ? gameState.awayScore + runsScored : gameState.awayScore }
        );
      })(),
      ballInPlay: null,
      fameEvents: [],
      isLeadoff: false,
      isClutch,
      isWalkOff,
    };

    await logAtBatEvent(event);

    // Update player stats — MAJ-07: Track HBP separately from BB
    setPlayerStats(prev => {
      const newStats = new Map(prev);
      const batterStats = newStats.get(gameState.currentBatterId) || createEmptyPlayerStats();
      batterStats.pa++;
      if (walkType === 'HBP') {
        batterStats.hbp = (batterStats.hbp || 0) + 1;
      } else {
        batterStats.bb++;  // BB and IBB count as walks for batter
      }
      if (basesLoaded) batterStats.rbi++;
      newStats.set(gameState.currentBatterId, batterStats);
      return newStats;
    });

    // Update pitcher stats — CRIT-02: Use tracker for ER attribution on walks
    // MAJ-07: Track HBP/IBB separately from BB
    setPitcherStats(prev => {
      const newStats = new Map(prev);
      const pStats = newStats.get(gameState.currentPitcherId) || createEmptyPitcherStats();
      if (walkType === 'HBP') {
        pStats.hitByPitch++;
      } else if (walkType === 'IBB') {
        pStats.intentionalWalks++;
      } else {
        pStats.walksAllowed++;  // BB only
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
      processTrackerScoredEvents(walkScoredEvents, setPitcherStats, createEmptyPitcherStats);
    }

    // Update scoreboard - walks do NOT count as hits, only update runs if bases loaded
    // FIX: This was missing entirely - walks weren't updating the scoreboard at all
    if (runsScored > 0) {
      setScoreboard(prev => {
        const teamKey = gameState.isTop ? 'away' : 'home';
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
    setGameState(prev => ({
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
  }, [gameState, atBatSequence, advanceToNextBatter]);

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
  const recordD3K = useCallback(async (batterReached: boolean, pitchCount: number = 3) => {
    const newSequence = atBatSequence + 1;
    setAtBatSequence(newSequence);

    // Track strikeout for immaculate inning detection (D3K is a strikeout)
    inningPitchesRef.current.strikeouts++;

    const battingTeamId = gameState.isTop ? gameState.awayTeamId : gameState.homeTeamId;
    const pitchingTeamId = gameState.isTop ? gameState.homeTeamId : gameState.awayTeamId;

    // D3K always counts as strikeout for result type
    const result: AtBatResult = 'K';
    const newOuts = batterReached ? gameState.outs : gameState.outs + 1;

    // Update runner tracker BEFORE event creation so runnersAfter is correct
    if (batterReached) {
      let d3kTracker = syncTrackerPitcher(runnerTrackerRef.current, gameState.currentPitcherId, gameState.currentPitcherName);
      d3kTracker = trackerAddRunner(d3kTracker, gameState.currentBatterId, gameState.currentBatterName, '1B', 'error');
      d3kTracker = trackerNextAtBat(d3kTracker);
      runnerTrackerRef.current = d3kTracker;
    }

    const event: AtBatEvent = {
      eventId: `${gameState.gameId}_${newSequence}`,
      gameId: gameState.gameId,
      sequence: newSequence,
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
      halfInning: gameState.isTop ? 'TOP' : 'BOTTOM',
      outs: gameState.outs, // Outs BEFORE the play
      runners: {
        first: buildRunnerInfo(runnerTrackerRef.current, 'first', !!gameState.bases.first, gameState.currentPitcherId),
        second: buildRunnerInfo(runnerTrackerRef.current, 'second', !!gameState.bases.second, gameState.currentPitcherId),
        third: buildRunnerInfo(runnerTrackerRef.current, 'third', !!gameState.bases.third, gameState.currentPitcherId),
      },
      awayScore: gameState.awayScore,
      homeScore: gameState.homeScore,
      outsAfter: newOuts,
      runnersAfter: newOuts >= 3 ? { first: null, second: null, third: null } : buildRunnersAfter(runnerTrackerRef.current),
      awayScoreAfter: gameState.awayScore,
      homeScoreAfter: gameState.homeScore,
      // D-05 FIX: Calculate leverageIndex from base-out state instead of hardcoding 1.0
      // Same pattern as recordHit (lines 1167-1173) and recordOut
      leverageIndex: (() => {
        const bs: BaseState = (
          (gameState.bases.first ? 1 : 0) +
          (gameState.bases.second ? 2 : 0) +
          (gameState.bases.third ? 4 : 0)
        ) as BaseState;
        const o = Math.min(gameState.outs, 2) as 0 | 1 | 2;
        return getBaseOutLI(bs, o);
      })(),
      // MAJ-12: WPA from win expectancy table
      ...(() => {
        const rAfter = newOuts >= 3
          ? { first: false, second: false, third: false }
          : (() => { const ra = buildRunnersAfter(runnerTrackerRef.current); return { first: !!ra.first, second: !!ra.second, third: !!ra.third }; })();
        return calculateWPA(
          { inning: gameState.inning, isTop: gameState.isTop, outs: gameState.outs,
            bases: gameState.bases, homeScore: gameState.homeScore, awayScore: gameState.awayScore },
          { outs: newOuts,
            bases: rAfter,
            homeScore: gameState.homeScore,
            awayScore: gameState.awayScore }
        );
      })(),
      ballInPlay: null,
      fameEvents: [],
      isLeadoff: false,
      isClutch: false,
      isWalkOff: false,
    };

    await logAtBatEvent(event);

    // Update batter stats - ALWAYS count K, PA, AB
    setPlayerStats(prev => {
      const newStats = new Map(prev);
      const batterStats = newStats.get(gameState.currentBatterId) || createEmptyPlayerStats();
      batterStats.pa++;
      batterStats.ab++; // K counts as AB
      batterStats.k++;  // Always count the strikeout
      newStats.set(gameState.currentBatterId, batterStats);
      return newStats;
    });

    // Update pitcher stats - ALWAYS count K
    setPitcherStats(prev => {
      const newStats = new Map(prev);
      const pStats = newStats.get(gameState.currentPitcherId) || createEmptyPitcherStats();
      pStats.strikeoutsThrown++;
      pStats.battersFaced++;
      pStats.pitchCount += pitchCount;
      if (!batterReached) {
        pStats.outsRecorded++;
      }
      newStats.set(gameState.currentPitcherId, pStats);
      return newStats;
    });

    // (Runner tracker already updated before event creation above)

    // Update game state
    setGameState(prev => ({
      ...prev,
      balls: 0,
      strikes: 0,
      outs: newOuts,
      bases: {
        first: batterReached ? true : prev.bases.first, // Batter takes first if reached
        second: prev.bases.second,
        third: prev.bases.third,
      },
    }));

    // Check for end of inning - auto-end on third out
    if (newOuts >= 3) {
      // Auto-end the inning with a small delay to let UI update
      setTimeout(() => {
        endInningRef.current?.();
      }, 500);
    } else {
      advanceToNextBatter();
    }

    setLastSavedAt(Date.now());
    console.log(`[useGameState] D3K recorded: batterReached=${batterReached}, K counted, ${batterReached ? 'no out' : 'out recorded'}`);
  }, [gameState, atBatSequence, advanceToNextBatter]);

  // Record batter reaching base on fielding error
  const recordError = useCallback(async (rbi: number = 0, runnerData?: RunnerAdvancement, pitchCount: number = 1) => {
    const newSequence = atBatSequence + 1;
    setAtBatSequence(newSequence);

    const battingTeamId = gameState.isTop ? gameState.awayTeamId : gameState.homeTeamId;
    const pitchingTeamId = gameState.isTop ? gameState.homeTeamId : gameState.awayTeamId;
    const fieldingTeamKey = gameState.isTop ? 'home' : 'away'; // Fielding team commits error

    // Calculate runs scored from runners advancing
    let runsScored = 0;
    if (runnerData?.fromFirst === 'home') runsScored++;
    if (runnerData?.fromSecond === 'home') runsScored++;
    if (runnerData?.fromThird === 'home') runsScored++;

    // CRIT-02: Update runner tracker for errors
    const errorScoredEvents: RunnerScoredEvent[] = [];
    let errorTracker = syncTrackerPitcher(runnerTrackerRef.current, gameState.currentPitcherId, gameState.currentPitcherName);

    if (runnerData) {
      for (const [base, dest] of [
        ['third', runnerData.fromThird],
        ['second', runnerData.fromSecond],
        ['first', runnerData.fromFirst],
      ] as const) {
        if (!dest) continue;
        const runnerId = findRunnerOnBase(errorTracker, base as 'first' | 'second' | 'third');
        if (!runnerId) continue;

        if (dest === 'out') {
          errorTracker = trackerRunnerOut(errorTracker, runnerId);
        } else {
          const trackerDest = destToTrackerBase(dest);
          const result = trackerAdvanceRunner(errorTracker, runnerId, trackerDest);
          errorTracker = result.state;
          if (result.scoredEvent) errorScoredEvents.push(result.scoredEvent);
        }
      }
    }

    // Batter reaches first on error
    errorTracker = trackerAddRunner(errorTracker, gameState.currentBatterId, gameState.currentBatterName, '1B', 'error');
    errorTracker = trackerNextAtBat(errorTracker);
    runnerTrackerRef.current = errorTracker;

    const event: AtBatEvent = {
      eventId: `${gameState.gameId}_${newSequence}`,
      gameId: gameState.gameId,
      sequence: newSequence,
      timestamp: Date.now(),
      batterId: gameState.currentBatterId,
      batterName: gameState.currentBatterName,
      batterTeamId: battingTeamId,
      pitcherId: gameState.currentPitcherId,
      pitcherName: gameState.currentPitcherName,
      pitcherTeamId: pitchingTeamId,
      result: 'E', // Reach on Error (E is the standard AtBatResult type)
      rbiCount: 0,
      runsScored,
      inning: gameState.inning,
      halfInning: gameState.isTop ? 'TOP' : 'BOTTOM',
      outs: gameState.outs,
      runners: {
        first: buildRunnerInfo(runnerTrackerRef.current, 'first', !!gameState.bases.first, gameState.currentPitcherId),
        second: buildRunnerInfo(runnerTrackerRef.current, 'second', !!gameState.bases.second, gameState.currentPitcherId),
        third: buildRunnerInfo(runnerTrackerRef.current, 'third', !!gameState.bases.third, gameState.currentPitcherId),
      },
      awayScore: gameState.awayScore,
      homeScore: gameState.homeScore,
      outsAfter: gameState.outs,
      runnersAfter: buildRunnersAfter(runnerTrackerRef.current),
      awayScoreAfter: gameState.isTop ? gameState.awayScore + runsScored : gameState.awayScore,
      homeScoreAfter: gameState.isTop ? gameState.homeScore : gameState.homeScore + runsScored,
      // MAJ-12: Calculate leverageIndex and WPA from game state
      leverageIndex: (() => {
        const bs: BaseState = (
          (gameState.bases.first ? 1 : 0) +
          (gameState.bases.second ? 2 : 0) +
          (gameState.bases.third ? 4 : 0)
        ) as BaseState;
        const o = Math.min(gameState.outs, 2) as 0 | 1 | 2;
        return getBaseOutLI(bs, o);
      })(),
      ...(() => {
        const rAfter = buildRunnersAfter(runnerTrackerRef.current);
        return calculateWPA(
          { inning: gameState.inning, isTop: gameState.isTop, outs: gameState.outs,
            bases: gameState.bases, homeScore: gameState.homeScore, awayScore: gameState.awayScore },
          { outs: gameState.outs,
            bases: { first: !!rAfter.first, second: !!rAfter.second, third: !!rAfter.third },
            homeScore: gameState.isTop ? gameState.homeScore : gameState.homeScore + runsScored,
            awayScore: gameState.isTop ? gameState.awayScore + runsScored : gameState.awayScore }
        );
      })(),
      ballInPlay: null,
      fameEvents: [],
      isLeadoff: false,
      isClutch: false,
      isWalkOff: false,
    };

    await logAtBatEvent(event);

    // Update player stats (PA but no AB for ROE)
    setPlayerStats(prev => {
      const newStats = new Map(prev);
      const batterStats = newStats.get(gameState.currentBatterId) || createEmptyPlayerStats();
      batterStats.pa++;
      batterStats.ab++; // Reach on error is an at-bat per Project Bible.
      // D-04 FIX: Errors NEVER credit RBI per baseball rules and calculateRBIs().
      // The rbi parameter is kept in the signature for backward compat but ignored.
      // batterStats.rbi += rbi; // REMOVED — was D-04 bug
      newStats.set(gameState.currentBatterId, batterStats);
      return newStats;
    });

    // Update pitcher stats — CRIT-02: Use tracker for ER attribution on errors
    setPitcherStats(prev => {
      const newStats = new Map(prev);
      const pStats = newStats.get(gameState.currentPitcherId) || createEmptyPitcherStats();
      pStats.battersFaced++;
      pStats.pitchCount += pitchCount;
      // Note: runs/ER attributed via tracker (runner who scored may have been from a different pitcher)
      newStats.set(gameState.currentPitcherId, pStats);
      return newStats;
    });
    // Attribute runs/ER to responsible pitcher via tracker
    // The tracker correctly marks error-reached runners as unearned runs
    if (errorScoredEvents.length > 0) {
      processTrackerScoredEvents(errorScoredEvents, setPitcherStats, createEmptyPitcherStats);
    }

    // Update scoreboard - increment errors for fielding team
    setScoreboard(prev => {
      const teamKey = gameState.isTop ? 'away' : 'home';
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
    setGameState(prev => {
      // Start with current bases, then apply movements
      let newFirst = true; // Batter reaches first on error
      let newSecond = prev.bases.second; // Default: stay
      let newThird = prev.bases.third;   // Default: stay

      // Handle runner advancement from runnerData
      if (runnerData) {
        // R1 movement
        if (prev.bases.first) {
          if (runnerData.fromFirst === 'second') {
            newSecond = true;
            // First base now has batter
          } else if (runnerData.fromFirst === 'third') {
            newThird = true;
          } else if (runnerData.fromFirst === 'home' || runnerData.fromFirst === 'out') {
            // First vacated, batter takes it
          } else {
            // R1 stays at first - but batter also reaches first!
            // This shouldn't happen (two people on first), default to R1 goes to second
            newSecond = true;
          }
        }

        // R2 movement
        if (prev.bases.second) {
          if (runnerData.fromSecond === 'third') {
            newThird = true;
            newSecond = prev.bases.first && runnerData.fromFirst === 'second'; // Only occupied if R1 went there
          } else if (runnerData.fromSecond === 'home' || runnerData.fromSecond === 'out') {
            // Second vacated
            newSecond = prev.bases.first && runnerData.fromFirst === 'second';
          }
          // else R2 stays at second
        }

        // R3 movement (scores or holds)
        if (prev.bases.third) {
          if (runnerData.fromThird === 'home' || runnerData.fromThird === 'out') {
            // Third vacated
            newThird = prev.bases.second && runnerData.fromSecond === 'third';
          }
          // else R3 stays at third
        }
      } else {
        // No runner data - default behavior: runners advance one base
        if (prev.bases.third) newThird = false; // R3 scores
        if (prev.bases.second) { newThird = true; newSecond = false; } // R2 to third
        if (prev.bases.first) { newSecond = true; } // R1 to second
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
    console.log(`[useGameState] Recorded error: ${fieldingTeamKey} team, ${runsScored} runs (unearned)`);
  }, [gameState, atBatSequence, advanceToNextBatter]);

  const recordEvent = useCallback(async (eventType: EventType, runnerId?: string) => {
    // Non-at-bat events like stolen bases, wild pitches, special events
    console.log(`[useGameState] recordEvent: ${eventType}`, runnerId);

    // Calculate base-out leverage index for Fame weighting
    // Encode bases as BaseState (0-7): 1=1st, 2=2nd, 4=3rd, combinations sum
    const baseState: BaseState = (
      (gameState.bases.first ? 1 : 0) +
      (gameState.bases.second ? 2 : 0) +
      (gameState.bases.third ? 4 : 0)
    ) as BaseState;
    const outs = Math.min(gameState.outs, 2) as 0 | 1 | 2;
    const li = getBaseOutLI(baseState, outs);
    const fameMultiplier = Math.sqrt(li);

    // Fame base values per kbl-detection-philosophy.md and SPECIAL_EVENTS_SPEC.md
    // Formula: fameValue = baseFame × √LI × playoffMultiplier
    const FAME_VALUES: Record<string, number> = {
      // Fielding events (fielder receives Fame)
      WEB_GEM: 1.0,         // Spectacular catch (0.8 < y ≤ 0.95)
      ROBBERY: 1.0,         // HR denied at wall (y > 0.95) — CRIT-06: spec v3.3 standardized to +1

      // Baserunning events (runner receives Fame)
      // D-07 FIX: TOOTBLAN uses tiered fame, not flat -3.0.
      // Sentinel value — actual fame computed below based on rally-killer check.
      TOOTBLAN: -0.5,       // Base value; overridden to -2.0 if rally killer

      // Comebacker events (batter receives Fame)
      KILLED: 3.0,          // Killed pitcher (+3 Fame to batter)
      NUTSHOT: 1.0,         // Nut shot (+1 Fame to batter)
      KILLED_PITCHER: 3.0,  // Alias for KILLED
      NUT_SHOT: 1.0,        // Alias for NUTSHOT

      // Informational events (no Fame impact, just tracking)
      BEAT_THROW: 0,        // Infield hit - beat the throw (speed)
      BUNT: 0,              // Bunt single (recorded but no Fame)
      STRIKEOUT: 0,         // K swinging
      STRIKEOUT_LOOKING: 0, // K looking
      DROPPED_3RD_STRIKE: 0, // D3K
      SEVEN_PLUS_PITCH_AB: 0, // Tough AB (7+ pitches)
    };

    if (FAME_VALUES[eventType] !== undefined && FAME_VALUES[eventType] !== 0) {
      let baseFame = FAME_VALUES[eventType];

      // D-07 FIX: TOOTBLAN tiered fame per SPECIAL_EVENTS_SPEC.md
      // Rally killer: runner was in scoring position (2B or 3B) with <2 outs → -2.0
      // Standard: -0.5
      if (eventType === 'TOOTBLAN') {
        const isRallyKiller = (gameState.bases.second || gameState.bases.third) && gameState.outs < 2;
        baseFame = isRallyKiller ? -2.0 : -0.5;
      }

      const adjustedFame = baseFame * fameMultiplier;

      // Determine who receives the Fame
      let recipientId = '';
      let recipientName = '';

      if (eventType === 'TOOTBLAN' || eventType === 'SB' || eventType === 'CS') {
        // Baserunning events - runner receives Fame
        recipientId = runnerId || '';
        recipientName = runnerId || 'Unknown Runner';
      } else if (eventType === 'WEB_GEM' || eventType === 'ROBBERY') {
        // Fielding events - fielder receives Fame (would need fielder ID)
        recipientId = runnerId || 'fielder'; // Use runnerId as fielder ID for now
        recipientName = runnerId || 'Fielder';
      } else {
        // Default: batter receives Fame (KILLED, NUTSHOT, etc.)
        recipientId = gameState.currentBatterId;
        recipientName = gameState.currentBatterName;
      }

      const fameEvent: FameEventRecord = {
        eventType,
        fameType: adjustedFame >= 0 ? 'bonus' : 'boner',
        fameValue: Math.abs(adjustedFame),
        playerId: recipientId,
        playerName: recipientName,
        description: `${eventType} in inning ${gameState.inning} (LI: ${li.toFixed(2)})`,
      };

      setFameEvents(prev => [...prev, fameEvent]);
      console.log(`[Fame] Recorded: ${eventType} for ${recipientName}, value=${adjustedFame.toFixed(2)} (${fameEvent.fameType})`);
    }

    // Update player stats for SB/CS
    if (eventType === 'SB' && runnerId) {
      setPlayerStats(prev => {
        const stats = prev.get(runnerId) || createEmptyPlayerStats();
        const updated = new Map(prev);
        updated.set(runnerId, { ...stats, sb: stats.sb + 1 });
        return updated;
      });
      console.log(`[useGameState] Recorded SB for runner: ${runnerId}`);
    }

    if (eventType === 'CS' && runnerId) {
      setPlayerStats(prev => {
        const stats = prev.get(runnerId) || createEmptyPlayerStats();
        const updated = new Map(prev);
        updated.set(runnerId, { ...stats, cs: stats.cs + 1 });
        return updated;
      });
      console.log(`[useGameState] Recorded CS for runner: ${runnerId}`);
    }

    // MAJ-07: Track WP in pitcher stats
    if (eventType === 'WP') {
      setPitcherStats(prev => {
        const newStats = new Map(prev);
        const pStats = newStats.get(gameState.currentPitcherId) || createEmptyPitcherStats();
        pStats.wildPitches++;
        newStats.set(gameState.currentPitcherId, pStats);
        return newStats;
      });
    }

    // TODO: Log to separate event store
  }, [gameState.outs, gameState.bases, gameState.currentPitcherId]);

  const advanceRunner = useCallback((from: 'first' | 'second' | 'third', to: 'second' | 'third' | 'home', outcome: 'safe' | 'out') => {
    // Calculate score change first so we can update both game state and scoreboard
    const runsScored = (outcome === 'safe' && to === 'home') ? 1 : 0;

    // CRIT-02: Update runner tracker for individual runner advancement (WP, PB, SB, etc.)
    let advTracker = syncTrackerPitcher(runnerTrackerRef.current, gameState.currentPitcherId, gameState.currentPitcherName);
    const runnerId = findRunnerOnBase(advTracker, from);
    if (runnerId) {
      if (outcome === 'out') {
        advTracker = trackerRunnerOut(advTracker, runnerId);
      } else {
        const trackerDest = destToTrackerBase(to);
        const result = trackerAdvanceRunner(advTracker, runnerId, trackerDest);
        advTracker = result.state;
        // Attribute scored run to responsible pitcher
        if (result.scoredEvent) {
          processTrackerScoredEvents([result.scoredEvent], setPitcherStats, createEmptyPitcherStats);
        }
      }
    }
    runnerTrackerRef.current = advTracker;

    setGameState(prev => {
      const newBases = { ...prev.bases };
      let outsChange = 0;

      // Clear origin base
      if (from === 'first') newBases.first = false;
      if (from === 'second') newBases.second = false;
      if (from === 'third') newBases.third = false;

      if (outcome === 'safe') {
        if (to === 'second') newBases.second = true;
        if (to === 'third') newBases.third = true;
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
      setScoreboard(prev => {
        const teamKey = gameState.isTop ? 'away' : 'home';
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

    // T0-03 FIX: Check if baserunning out (CS, pickoff, TOOTBLAN, etc.) caused 3rd out.
    // advanceRunner increments outs via setGameState but never checked for inning end.
    // Uses same pattern as recordOut (line 1826): setTimeout to let UI update before flip.
    if (outcome === 'out' && gameState.outs + 1 >= 3) {
      console.log('[advanceRunner] T0-03: Baserunning out caused 3rd out — triggering end of inning');
      setTimeout(() => {
        endInningRef.current?.();
      }, 500);
    }
  }, [gameState.isTop, gameState.inning, gameState.outs, gameState.currentPitcherId, gameState.currentPitcherName]);

  /**
   * Batch update runners - processes all movements atomically
   * This is needed for stolen base events where multiple runners may move
   * Processing them one at a time causes race conditions
   */
  const advanceRunnersBatch = useCallback((
    movements: Array<{ from: 'first' | 'second' | 'third'; to: 'second' | 'third' | 'home' | 'out'; outcome: 'safe' | 'out' }>
  ) => {
    if (movements.length === 0) return;

    console.log('[advanceRunnersBatch] Processing movements:', movements);

    // Calculate runs scored first so we can update scoreboard
    const runsScored = movements.filter(m => m.outcome === 'safe' && m.to === 'home').length;

    // CRIT-02: Update runner tracker for batch movements (SB, WP, PB, etc.)
    let batchTracker = syncTrackerPitcher(runnerTrackerRef.current, gameState.currentPitcherId, gameState.currentPitcherName);
    const batchScoredEvents: RunnerScoredEvent[] = [];

    // Sort movements: process from third → second → first to avoid collision
    const sortedMovements = [...movements].sort((a, b) => {
      const order = { third: 0, second: 1, first: 2 };
      return order[a.from] - order[b.from];
    });

    for (const move of sortedMovements) {
      const runnerId = findRunnerOnBase(batchTracker, move.from);
      if (!runnerId) continue;

      if (move.outcome === 'out') {
        batchTracker = trackerRunnerOut(batchTracker, runnerId);
      } else if (move.to === 'out') {
        batchTracker = trackerRunnerOut(batchTracker, runnerId);
      } else {
        const trackerDest = destToTrackerBase(move.to as 'second' | 'third' | 'home');
        const result = trackerAdvanceRunner(batchTracker, runnerId, trackerDest);
        batchTracker = result.state;
        if (result.scoredEvent) batchScoredEvents.push(result.scoredEvent);
      }
    }
    runnerTrackerRef.current = batchTracker;

    // Attribute runs/ER to responsible pitchers
    if (batchScoredEvents.length > 0) {
      processTrackerScoredEvents(batchScoredEvents, setPitcherStats, createEmptyPitcherStats);
    }

    setGameState(prev => {
      // Start with all bases cleared for runners that moved
      const newBases = { ...prev.bases };
      let outsChange = 0;

      // First pass: clear all origin bases
      for (const move of movements) {
        if (move.from === 'first') newBases.first = false;
        if (move.from === 'second') newBases.second = false;
        if (move.from === 'third') newBases.third = false;
      }

      // Second pass: set destination bases (only for safe runners)
      for (const move of movements) {
        if (move.outcome === 'safe') {
          if (move.to === 'second') newBases.second = true;
          if (move.to === 'third') newBases.third = true;
          // home is handled by runsScored
        } else {
          // Runner is out
          outsChange++;
        }
      }

      console.log('[advanceRunnersBatch] Result - bases:', newBases, 'runs:', runsScored, 'outs:', outsChange);

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
      setScoreboard(prev => {
        const teamKey = gameState.isTop ? 'away' : 'home';
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

    // T0-03 FIX: Check if batch runner outs caused 3rd out (same pattern as advanceRunner).
    const totalOuts = movements.filter(m => m.outcome === 'out').length;
    if (totalOuts > 0 && gameState.outs + totalOuts >= 3) {
      console.log('[advanceRunnersBatch] T0-03: Baserunning out(s) caused 3rd out — triggering end of inning');
      setTimeout(() => {
        endInningRef.current?.();
      }, 500);
    }
  }, [gameState.isTop, gameState.inning, gameState.outs, gameState.currentPitcherId, gameState.currentPitcherName]);

  const advanceCount = useCallback((type: 'ball' | 'strike' | 'foul') => {
    setGameState(prev => {
      if (type === 'ball') {
        return { ...prev, balls: Math.min(prev.balls + 1, 3) };
      } else if (type === 'strike') {
        return { ...prev, strikes: Math.min(prev.strikes + 1, 2) };
      } else {
        // Foul - only add strike if less than 2
        return { ...prev, strikes: Math.min(prev.strikes + 1, 2) };
      }
    });
  }, []);

  const resetCount = useCallback(() => {
    setGameState(prev => ({ ...prev, balls: 0, strikes: 0 }));
  }, []);

  // MAJ-09: Substitution with validation via LineupState tracking
  const makeSubstitution = useCallback((
    benchPlayerId: string,
    lineupPlayerId: string,
    benchPlayerName?: string,
    lineupPlayerName?: string,
    // MAJ-06: Optional rich substitution data from modals
    options?: {
      subType?: 'player_sub' | 'pinch_hit' | 'pinch_run' | 'defensive_sub' | 'position_switch' | 'double_switch';
      newPosition?: string;         // Override position instead of inheriting
      base?: '1B' | '2B' | '3B';   // For pinch runners: which base
      isPinchHitter?: boolean;      // For pinch hitters: replace mid-at-bat
    }
  ): { success: boolean; error?: string } => {
    const subType = options?.subType || 'player_sub';

    // MAJ-09: Determine which team this substitution is for
    const awayIndex = awayLineupRef.current.findIndex(p => p.playerId === lineupPlayerId);
    const isAwayTeam = awayIndex >= 0;
    const lineupStateRef = isAwayTeam ? awayLineupStateRef : homeLineupStateRef;

    // MAJ-09: Validate substitution if LineupState is initialized (bench data present)
    // If bench was never provided (legacy callers), skip validation gracefully
    if (lineupStateRef.current.bench.length > 0 || lineupStateRef.current.usedPlayers.length > 0) {
      const validation = validateSubstitution(lineupStateRef.current, benchPlayerId, lineupPlayerId);
      if (!validation.isValid) {
        console.warn(`[useGameState] Substitution REJECTED: ${validation.errors.join(', ')}`);
        return { success: false, error: validation.errors.join('; ') };
      }
    }

    // Log substitution event
    setSubstitutionLog(prev => [...prev, {
      type: subType,
      inning: gameState.inning,
      halfInning: gameState.isTop ? 'TOP' : 'BOTTOM',
      outgoingPlayerId: lineupPlayerId,
      outgoingPlayerName: lineupPlayerName || lineupPlayerId,
      incomingPlayerId: benchPlayerId,
      incomingPlayerName: benchPlayerName || benchPlayerId,
      timestamp: Date.now(),
    }]);

    // Update lineup refs to swap the players
    const homeIndex = homeLineupRef.current.findIndex(p => p.playerId === lineupPlayerId);

    if (isAwayTeam) {
      // MAJ-06: Use newPosition if provided, otherwise preserve outgoing position
      const position = options?.newPosition || awayLineupRef.current[awayIndex].position;
      awayLineupRef.current[awayIndex] = {
        playerId: benchPlayerId,
        playerName: benchPlayerName || benchPlayerId,
        position,
      };
    } else if (homeIndex >= 0) {
      const position = options?.newPosition || homeLineupRef.current[homeIndex].position;
      homeLineupRef.current[homeIndex] = {
        playerId: benchPlayerId,
        playerName: benchPlayerName || benchPlayerId,
        position,
      };
    }

    // MAJ-09: Update LineupState to reflect the substitution
    const currentState = lineupStateRef.current;
    const lineupIdx = currentState.lineup.findIndex(p => p.playerId === lineupPlayerId);
    if (lineupIdx >= 0) {
      const removedPlayer = currentState.lineup[lineupIdx];
      const newPosition = (options?.newPosition || removedPlayer.position) as Position;

      // Build updated lineup: replace outgoing with incoming
      const newLineup = [...currentState.lineup];
      newLineup[lineupIdx] = {
        playerId: benchPlayerId,
        playerName: benchPlayerName || benchPlayerId,
        position: newPosition,
        battingOrder: removedPlayer.battingOrder,
        enteredInning: gameState.inning,
        enteredFor: removedPlayer.playerName,
        isStarter: false,
      };

      // Mark bench player as unavailable
      const newBench = currentState.bench.map(b =>
        b.playerId === benchPlayerId ? { ...b, isAvailable: false } : b
      );

      // Track used player (outgoing can't re-enter)
      const newUsedPlayers = [...currentState.usedPlayers, lineupPlayerId];

      // Update currentPitcher if pitcher was replaced
      let newCurrentPitcher = currentState.currentPitcher;
      if (removedPlayer.position === 'P' || subType === 'double_switch') {
        // Check if the incoming player is the new pitcher
        if (newPosition === 'P') {
          newCurrentPitcher = newLineup[lineupIdx];
        }
      }

      lineupStateRef.current = {
        lineup: newLineup,
        bench: newBench,
        usedPlayers: newUsedPlayers,
        currentPitcher: newCurrentPitcher,
      };
    }

    // If the substituted player is the current batter, update current batter
    // Also handle pinch hitter (replaces current batter mid-AB)
    if (lineupPlayerId === gameState.currentBatterId || options?.isPinchHitter) {
      setGameState(prev => ({
        ...prev,
        currentBatterId: benchPlayerId,
        currentBatterName: benchPlayerName || benchPlayerId,
      }));
    }

    // Initialize stats for new player if they don't have any
    setPlayerStats(prev => {
      const newStats = new Map(prev);
      if (!newStats.has(benchPlayerId)) {
        newStats.set(benchPlayerId, createEmptyPlayerStats());
      }
      return newStats;
    });

    // T1-02 FIX: Update runner tracker when pinch runner replaces a baserunner.
    // Without this, the tracker still has the old runner's ID, so scored runs and
    // SB/CS get credited to the replaced player instead of the pinch runner.
    if (subType === 'pinch_run' && options?.base) {
      const tracker = runnerTrackerRef.current;
      const trackerBase = options.base; // Already '1B' | '2B' | '3B'
      const oldRunner = tracker.runners.find(r => r.currentBase === trackerBase);
      if (oldRunner) {
        // Swap runner identity while preserving responsible pitcher
        oldRunner.runnerId = benchPlayerId;
        oldRunner.runnerName = benchPlayerName || benchPlayerId;
        console.log(`[useGameState] T1-02: Pinch runner ${benchPlayerName} replaced ${lineupPlayerName} on ${trackerBase}`);
      }
      // T1-02: Increment version counter so the runnerNames sync effect fires in GameTracker.
      setRunnerIdentityVersion(v => v + 1);
    }

    console.log(`[useGameState] Substitution (${subType}): ${benchPlayerName || benchPlayerId} replaces ${lineupPlayerName || lineupPlayerId} in inning ${gameState.inning}`);
    return { success: true };
  }, [gameState.inning, gameState.isTop, gameState.currentBatterId]);

  // MAJ-06: Position switch (no new players, just position reassignment)
  const switchPositions = useCallback((switches: Array<{ playerId: string; newPosition: string }>) => {
    for (const sw of switches) {
      const awayIdx = awayLineupRef.current.findIndex(p => p.playerId === sw.playerId);
      const homeIdx = homeLineupRef.current.findIndex(p => p.playerId === sw.playerId);

      if (awayIdx >= 0) {
        awayLineupRef.current[awayIdx] = {
          ...awayLineupRef.current[awayIdx],
          position: sw.newPosition,
        };
      } else if (homeIdx >= 0) {
        homeLineupRef.current[homeIdx] = {
          ...homeLineupRef.current[homeIdx],
          position: sw.newPosition,
        };
      }
    }

    setSubstitutionLog(prev => [...prev, {
      type: 'position_switch',
      inning: gameState.inning,
      halfInning: gameState.isTop ? 'TOP' : 'BOTTOM',
      outgoingPlayerId: switches.map(s => s.playerId).join(','),
      outgoingPlayerName: 'Position Switch',
      incomingPlayerId: switches.map(s => s.playerId).join(','),
      incomingPlayerName: switches.map(s => `${s.playerId}->${s.newPosition}`).join(', '),
      timestamp: Date.now(),
    }]);

    console.log(`[useGameState] Position switch: ${switches.map(s => `${s.playerId}->${s.newPosition}`).join(', ')}`);
  }, [gameState.inning, gameState.isTop]);

  const changePitcher = useCallback((newPitcherId: string, exitingPitcherId: string, newPitcherName?: string, exitingPitcherName?: string) => {
    // Per PITCH_COUNT_TRACKING_SPEC.md: Mandatory pitch count capture on pitching change
    const exitingStats = pitcherStats.get(exitingPitcherId) || createEmptyPitcherStats();

    // Show pitch count prompt before completing the change
    setPitchCountPrompt({
      type: 'pitching_change',
      pitcherId: exitingPitcherId,
      pitcherName: exitingPitcherName || exitingPitcherId,
      currentCount: exitingStats.pitchCount,
      lastVerifiedInning: gameState.inning,
      newPitcherId,
    });

    // Store the pending action to execute after pitch count is confirmed
    pendingActionRef.current = async () => {
      // Log the pitching change
      setSubstitutionLog(prev => [...prev, {
        type: 'pitching_change',
        inning: gameState.inning,
        halfInning: gameState.isTop ? 'TOP' : 'BOTTOM',
        outgoingPlayerId: exitingPitcherId,
        outgoingPlayerName: exitingPitcherName || exitingPitcherId,
        incomingPlayerId: newPitcherId,
        incomingPlayerName: newPitcherName || newPitcherId,
        timestamp: Date.now(),
      }]);

      // MAJ-07: Set exit info on outgoing pitcher and bequeathed runners
      setPitcherStats(prev => {
        const newStats = new Map(prev);
        // Update outgoing pitcher
        const outgoing = newStats.get(exitingPitcherId);
        if (outgoing) {
          outgoing.exitInning = gameState.inning;
          outgoing.exitOuts = gameState.outs;
          // Count bequeathed runners from tracker
          const activeRunners = runnerTrackerRef.current.runners.filter(
            r => r.currentBase && r.currentBase !== 'HOME' && r.currentBase !== 'OUT'
          );
          outgoing.bequeathedRunners = activeRunners.length;
          newStats.set(exitingPitcherId, outgoing);
        }
        // Initialize new pitcher stats with entry context
        if (!newStats.has(newPitcherId)) {
          const newPStats = createEmptyPitcherStats();
          newPStats.entryInning = gameState.inning;
          newPStats.entryOuts = gameState.outs;
          // Count inherited runners (same as bequeathed from outgoing)
          const activeRunners = runnerTrackerRef.current.runners.filter(
            r => r.currentBase && r.currentBase !== 'HOME' && r.currentBase !== 'OUT'
          );
          newPStats.inheritedRunners = activeRunners.length;
          newStats.set(newPitcherId, newPStats);
        }
        return newStats;
      });

      // Track pitcher name for post-game summary (EXH-011 fix)
      if (newPitcherName) {
        pitcherNamesRef.current.set(newPitcherId, newPitcherName);
      }

      // CRIT-02 + MAJ-05: Notify runner tracker of pitching change
      // This marks all current runners as "inherited" by the new pitcher
      const pitchChangeResult = trackerHandlePitchingChange(
        runnerTrackerRef.current,
        newPitcherId,
        newPitcherName || ''
      );
      runnerTrackerRef.current = pitchChangeResult.state;
      console.log(`[useGameState] Runner tracker: ${pitchChangeResult.bequeathedRunners.length} bequeathed runners, ${pitchChangeResult.inheritedRunnerCount} inherited`);

      setGameState(prev => ({
        ...prev,
        currentPitcherId: newPitcherId,
        currentPitcherName: newPitcherName || '',
      }));

      // MAJ-09: Update LineupState currentPitcher and usedPlayers for the pitching team
      // Pitching team = opposite of batting team: if isTop, home is pitching; if !isTop, away is pitching
      const pitchingStateRef = gameState.isTop ? homeLineupStateRef : awayLineupStateRef;
      const pitchState = pitchingStateRef.current;

      // Find new pitcher in lineup (they might already be there via makeSubstitution/double switch)
      const newPitcherInLineup = pitchState.lineup.find(p => p.playerId === newPitcherId);
      if (newPitcherInLineup) {
        pitchingStateRef.current = {
          ...pitchState,
          currentPitcher: { ...newPitcherInLineup, position: 'P' as Position },
          usedPlayers: pitchState.usedPlayers.includes(exitingPitcherId)
            ? pitchState.usedPlayers
            : [...pitchState.usedPlayers, exitingPitcherId],
        };
      } else {
        // New pitcher came from bench (not yet in lineup via makeSubstitution — standalone pitching change)
        // The makeSubstitution call that preceded this should have already updated lineup
        // Just update currentPitcher reference
        pitchingStateRef.current = {
          ...pitchState,
          currentPitcher: {
            playerId: newPitcherId,
            playerName: newPitcherName || newPitcherId,
            position: 'P' as Position,
            battingOrder: pitchState.currentPitcher?.battingOrder || 1,
            enteredInning: gameState.inning,
            isStarter: false,
          },
          usedPlayers: pitchState.usedPlayers.includes(exitingPitcherId)
            ? pitchState.usedPlayers
            : [...pitchState.usedPlayers, exitingPitcherId],
        };
      }

      console.log(`[useGameState] Pitching change logged: ${newPitcherName || newPitcherId} replaces ${exitingPitcherName || exitingPitcherId} in inning ${gameState.inning}`);
    };
  }, [pitcherStats, gameState.inning, gameState.isTop]);

  // Confirm pitch count and execute pending action (per PITCH_COUNT_TRACKING_SPEC.md)
  const confirmPitchCount = useCallback((pitcherId: string, finalCount: number): { immaculateInning?: { pitcherId: string; pitcherName: string } } => {
    let result: { immaculateInning?: { pitcherId: string; pitcherName: string } } = {};
    // Check for immaculate inning at end of half-inning
    // Requires: user confirmed exactly 9 pitches AND we tracked 3 strikeouts this half-inning
    if (pitchCountPrompt?.type === 'end_inning' && finalCount === 9 && inningPitchesRef.current.strikeouts === 3) {
      const immaculateFameEvent: FameEventRecord = {
        eventType: 'IMMACULATE_INNING',
        fameType: 'bonus',
        fameValue: 2, // Per FAME_VALUES.IMMACULATE_INNING
        playerId: pitcherId,
        playerName: pitchCountPrompt.pitcherName,
        description: `Immaculate inning in inning ${gameState.inning} (${gameState.isTop ? 'top' : 'bottom'})`,
      };
      setFameEvents(prev => [...prev, immaculateFameEvent]);
      result = { immaculateInning: { pitcherId, pitcherName: pitchCountPrompt.pitcherName } };
      console.log(`[Fame] Immaculate inning detected! Pitcher: ${pitchCountPrompt.pitcherName}, pitches: ${finalCount}, K: 3`);
    }

    // Update the pitcher's final pitch count
    setPitcherStats(prev => {
      const newStats = new Map(prev);
      const stats = newStats.get(pitcherId) || createEmptyPitcherStats();
      stats.pitchCount = finalCount;
      newStats.set(pitcherId, stats);
      return newStats;
    });

    console.log(`[useGameState] Pitch count confirmed: ${pitcherId} = ${finalCount} pitches`);

    // Execute the pending action (pitching change, end inning, or end game)
    if (pendingActionRef.current) {
      pendingActionRef.current();
      pendingActionRef.current = null;
    }

    // Clear the prompt
    setPitchCountPrompt(null);
    return result;
  }, [pitchCountPrompt, gameState.inning, gameState.isTop]);

  // Dismiss pitch count prompt without confirming
  // For end_inning: still transitions the inning (just skips pitch count update)
  // For pitching_change/end_game: cancels the pending action
  const dismissPitchCountPrompt = useCallback(() => {
    if (pitchCountPrompt?.type === 'end_inning') {
      // Still execute the inning transition, just don't update pitch count
      if (pendingActionRef.current) {
        pendingActionRef.current();
        pendingActionRef.current = null;
      }
      console.log('[useGameState] Pitch count prompt dismissed — inning transition proceeding without count update');
    } else {
      pendingActionRef.current = null;
      console.log('[useGameState] Pitch count prompt dismissed, action cancelled');
    }
    setPitchCountPrompt(null);
  }, [pitchCountPrompt]);

  // Internal function that performs the actual inning transition
  // Called after pitch count is confirmed by user
  const executeEndInning = useCallback(() => {
    // T0-01: Auto game-end detection at regulation end.
    // Check BEFORE transitioning to the next half-inning.
    const totalInnings = totalInningsRef.current;
    const { inning, isTop, homeScore, awayScore } = gameState;

    // After TOP of regulation final inning (or later): if home team leads, game is over
    // (Home team doesn't need to bat if already ahead)
    if (isTop && inning >= totalInnings && homeScore > awayScore) {
      console.log(`[T0-01] Auto game-end: Home leads ${homeScore}-${awayScore} after top of inning ${inning}. Game over.`);
      // Trigger endGame flow after a small delay
      setTimeout(() => {
        setShowAutoEndPrompt(true);
      }, 300);
      return; // Don't transition to next half-inning
    }

    // After BOTTOM of regulation final inning (or later): if not tied, game is over
    if (!isTop && inning >= totalInnings && homeScore !== awayScore) {
      console.log(`[T0-01] Auto game-end: Score ${awayScore}-${homeScore} after bottom of inning ${inning}. Game over.`);
      setTimeout(() => {
        setShowAutoEndPrompt(true);
      }, 300);
      return; // Don't transition to next half-inning
    }

    // If tied after regulation, continue to extra innings (normal transition)
    if (!isTop && inning >= totalInnings && homeScore === awayScore) {
      console.log(`[T0-01] Tied ${homeScore}-${awayScore} after regulation. Extra innings.`);
    }

    // CRIT-02: Clear runner tracker for new half-inning and update inning number
    let endTracker = trackerClearBases(runnerTrackerRef.current);
    endTracker = trackerNextInning(endTracker);

    setGameState(prev => {
      const newIsTop = !prev.isTop;
      // After TOP (isTop was true, newIsTop is false): stay on same inning, switch to BOTTOM
      // After BOTTOM (isTop was false, newIsTop is true): increment inning, switch to TOP
      const newInning = newIsTop ? prev.inning + 1 : prev.inning;

      // Get next batter
      const battingTeamLineup = newIsTop ? awayLineupRef.current : homeLineupRef.current;
      const currentIndex = newIsTop ? awayBatterIndex : homeBatterIndex;
      const nextBatter = battingTeamLineup[currentIndex];

      // T0-02 FIX: Switch to the correct pitching team's current pitcher
      // When newIsTop (away bats), HOME team pitches; when !newIsTop (home bats), AWAY team pitches
      const pitchingTeamState = newIsTop ? homeLineupStateRef : awayLineupStateRef;
      const newPitcher = pitchingTeamState.current.currentPitcher;
      const newPitcherId = newPitcher?.playerId || prev.currentPitcherId;
      const newPitcherName = newPitcher?.playerName || prev.currentPitcherName;

      // Sync tracker with new pitcher and inning number
      endTracker = syncTrackerPitcher(endTracker, newPitcherId, newPitcherName);
      endTracker = { ...endTracker, inning: newInning };
      runnerTrackerRef.current = endTracker;

      // Reset inning pitch counter for the NEW pitcher
      inningPitchesRef.current = { pitches: 0, strikeouts: 0, pitcherId: newPitcherId };

      return {
        ...prev,
        inning: newInning,
        isTop: newIsTop,
        outs: 0,
        balls: 0,
        strikes: 0,
        bases: { first: false, second: false, third: false },
        currentBatterId: nextBatter?.playerId || '',
        currentBatterName: nextBatter?.playerName || '',
        currentPitcherId: newPitcherId,
        currentPitcherName: newPitcherName,
      };
    });
  }, [awayBatterIndex, homeBatterIndex, gameState]);

  const endInning = useCallback(() => {
    // Show pitch count prompt for the current pitcher at end of half-inning
    const currentPitcherStats = pitcherStats.get(gameState.currentPitcherId) || createEmptyPitcherStats();

    setPitchCountPrompt({
      type: 'end_inning',
      pitcherId: gameState.currentPitcherId,
      pitcherName: gameState.currentPitcherName || gameState.currentPitcherId,
      currentCount: currentPitcherStats.pitchCount,
      lastVerifiedInning: gameState.inning,
    });

    // Store the inning transition as a pending action
    pendingActionRef.current = async () => executeEndInning();
  }, [gameState.currentPitcherId, gameState.currentPitcherName, gameState.inning, pitcherStats, executeEndInning]);

  // Update endInning ref so it can be called from recordOut/recordD3K
  endInningRef.current = endInning;

  // Internal function to complete game after pitch counts confirmed
  const completeGameInternal = useCallback(async (opts?: EndGameOptions) => {
    const activityLog = opts?.activityLog ?? [];
    setIsSaving(true);

    // Mark game as complete in event log
    await completeGame(
      gameState.gameId,
      { away: gameState.awayScore, home: gameState.homeScore },
      gameState.inning
    );

    // Convert Map to Record for PersistedGameState
    // Build lookup sets for team assignment from lineup refs
    const awayPlayerIds = new Set(awayLineupRef.current.map(p => p.playerId));
    const playerNameLookup = new Map<string, string>();
    for (const p of [...awayLineupRef.current, ...homeLineupRef.current]) {
      playerNameLookup.set(p.playerId, p.playerName);
    }

    // CRIT-05 FIX: Query fielding events from IndexedDB and tally per player
    // Fielding events are stored with position-based playerIds (e.g., "SS", "CF")
    // We need to map them back to real player IDs via lineup refs
    const fieldingEvents = await getGameFieldingEvents(gameState.gameId);
    const positionToPlayerIdMap = new Map<string, string>(); // "SS_teamId" → playerId
    for (const p of [...awayLineupRef.current, ...homeLineupRef.current]) {
      if (p.position) {
        const teamId = awayPlayerIds.has(p.playerId) ? gameState.awayTeamId : gameState.homeTeamId;
        positionToPlayerIdMap.set(`${p.position}_${teamId}`, p.playerId);
      }
    }

    // Build per-player fielding tally
    const playerFieldingTally = new Map<string, { putouts: number; assists: number; errors: number }>();
    for (const fe of fieldingEvents) {
      // Try to resolve position-based ID to real player ID
      const resolvedId = positionToPlayerIdMap.get(`${fe.playerId}_${fe.teamId}`) ||
                          positionToPlayerIdMap.get(`${fe.position}_${fe.teamId}`) ||
                          fe.playerId;
      const tally = playerFieldingTally.get(resolvedId) || { putouts: 0, assists: 0, errors: 0 };
      if (fe.playType === 'putout') tally.putouts++;
      else if (fe.playType === 'assist' || fe.playType === 'outfield_assist') tally.assists++;
      else if (fe.playType === 'error') tally.errors++;
      else if (fe.playType === 'double_play_pivot') tally.assists++; // Pivot = assist
      playerFieldingTally.set(resolvedId, tally);
    }

    const playerStatsRecord: Record<string, {
      playerName: string; teamId: string;
      pa: number; ab: number; h: number; singles: number; doubles: number;
      triples: number; hr: number; rbi: number; r: number; bb: number;
      hbp: number; k: number; sb: number; cs: number;
      sf: number; sh: number; gidp: number; // MAJ-11
      putouts: number; assists: number; fieldingErrors: number;
    }> = {};
    playerStats.forEach((stats, playerId) => {
      const fieldingTally = playerFieldingTally.get(playerId) || { putouts: 0, assists: 0, errors: 0 };
      playerStatsRecord[playerId] = {
        ...stats,
        playerName: playerNameLookup.get(playerId) || playerId,
        teamId: awayPlayerIds.has(playerId) ? gameState.awayTeamId : gameState.homeTeamId,
        // CRIT-05 FIXED: Fielding stats now populated from IndexedDB fielding events
        putouts: fieldingTally.putouts,
        assists: fieldingTally.assists,
        fieldingErrors: fieldingTally.errors,
      };
    });

    // MAJ-07: Mark the last pitcher on each team as finishedGame
    // The pitcher still active at game end finished the game
    const lastPitcherId = gameState.currentPitcherId;
    const lastPitcherStats = pitcherStats.get(lastPitcherId);
    if (lastPitcherStats) {
      lastPitcherStats.finishedGame = true;
      // If they never had exit info set, set it now
      if (lastPitcherStats.exitInning === null) {
        lastPitcherStats.exitInning = gameState.inning;
        lastPitcherStats.exitOuts = gameState.outs;
      }
    }

    // MAJ-08: Calculate pitcher decisions (W/L/SV/H/BS)
    // D-01 FIX: Now async — uses lead-change tracking from AtBatEvents
    await calculatePitcherDecisions(pitcherStats, gameState.homeScore, gameState.awayScore, gameState.inning, gameState.gameId);

    // Convert pitcher stats Map to array for PersistedGameState
    // Use same team/name resolution as endGame() — pitcher IDs have "away-{name}" or "home-{name}" prefix
    const pitcherGameStatsArray: PersistedGameState['pitcherGameStats'] = [];
    pitcherStats.forEach((stats, pitcherId) => {
      const isAwayPitcher = pitcherId.toLowerCase().startsWith('away-');
      const teamId = isAwayPitcher ? gameState.awayTeamId : gameState.homeTeamId;
      const pitcherName = pitcherNamesRef.current.get(pitcherId) ||
        pitcherId.replace(/^(away|home)-/, '').replace(/-/g, ' ');

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
          const trackerPitcherStats = runnerTrackerRef.current.pitcherStats.get(pitcherId);
          if (!trackerPitcherStats) return 0;
          const onBase = trackerPitcherStats.runnersOnBase.filter(r => r.howReached === 'error').length;
          const scored = trackerPitcherStats.runnersScored.filter(r => r.howReached === 'error').length;
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
      gameState.stadiumName ??
      getTeamColors(gameState.homeTeamId).stadium ??
      getTeamColors(gameState.awayTeamId).stadium ??
      'Unknown Stadium';

    const resolvedStadium =
      gameState.stadiumName ??
      getTeamColors(gameState.homeTeamId).stadium ??
      getTeamColors(gameState.awayTeamId).stadium ??
      'Unknown Stadium';

    const persistedState: PersistedGameState = {
      id: 'current',
      gameId: gameState.gameId,
      savedAt: Date.now(),
      inning: gameState.inning,
      halfInning: gameState.isTop ? 'TOP' : 'BOTTOM',
      outs: gameState.outs,
      homeScore: gameState.homeScore,
      awayScore: gameState.awayScore,
      bases: {
        first: gameState.bases.first ? { playerId: 'unknown', playerName: 'Runner' } : null,
        second: gameState.bases.second ? { playerId: 'unknown', playerName: 'Runner' } : null,
        third: gameState.bases.third ? { playerId: 'unknown', playerName: 'Runner' } : null,
      },
      currentBatterIndex: 0,
      atBatCount: atBatSequence,
      awayTeamId: gameState.awayTeamId,
      homeTeamId: gameState.homeTeamId,
      awayTeamName: gameState.awayTeamName,
      homeTeamName: gameState.homeTeamName,
      seasonNumber: gameState.seasonNumber,
      stadiumName: resolvedStadium,
      playerStats: playerStatsRecord,
      pitcherGameStats: pitcherGameStatsArray,
      fameEvents: fameEvents.map((fe, idx) => ({
        id: `${gameState.gameId}_fame_${idx}`,
        gameId: gameState.gameId,
        eventType: fe.eventType,
        playerId: fe.playerId,
        playerName: fe.playerName,
        playerTeam: '', // TODO: Determine from player ID
        fameValue: fe.fameValue,
        fameType: fe.fameType,
        inning: gameState.inning,
        halfInning: gameState.isTop ? 'TOP' as const : 'BOTTOM' as const,
        timestamp: Date.now(),
        autoDetected: false,
        description: fe.description,
      })),
      lastHRBatterId: null,
      consecutiveHRCount: 0,
      inningStrikeouts: 0,
      maxDeficitAway: 0,
      maxDeficitHome: 0,
      activityLog: activityLog.slice(-20),
    };

    // T1-08 FIX: Check if already aggregated (idempotency guard)
    // Prevents double aggregation when endGame's useEffect re-fires
    const header = await getGameHeader(gameState.gameId);
    const alreadyAggregated = header?.aggregated === true;

    const targetSeasonId = opts?.seasonId ?? seasonIdRef.current ?? 'season-1';
    const currentSeasonNumber = opts?.currentSeason ?? gameState.seasonNumber;
    const aggregationOptions: GameAggregationOptions = {
      seasonId: targetSeasonId,
      detectMilestones: true,
      franchiseId: opts?.franchiseId,
      currentGame: opts?.currentGame,
      currentSeason: currentSeasonNumber,
    };

    if (!alreadyAggregated) {
      await processCompletedGame(persistedState, aggregationOptions);
      await markGameAggregated(gameState.gameId);
      console.log('[T1-08] Stats aggregated to season (first call)');
    } else {
      console.log('[T1-08] Skipping aggregation — game already aggregated');
    }

    // Record playoff series game result if this was a playoff game
    if (playoffSeriesIdRef.current) {
      try {
        const { recordSeriesGame } = await import('../../utils/playoffStorage');
        const winnerId = gameState.homeScore > gameState.awayScore
          ? gameState.homeTeamId : gameState.awayTeamId;
        await recordSeriesGame(playoffSeriesIdRef.current, {
          gameNumber: playoffGameNumberRef.current || 1,
          homeTeamId: gameState.homeTeamId,
          awayTeamId: gameState.awayTeamId,
          status: 'COMPLETED' as const,
          result: {
            homeScore: gameState.homeScore,
            awayScore: gameState.awayScore,
            winnerId,
            innings: gameState.inning,
          },
          gameLogId: gameState.gameId,
          playedAt: Date.now(),
        });
        console.log(`[Playoff] Recorded series game: ${playoffSeriesIdRef.current} G${playoffGameNumberRef.current}, winner: ${winnerId}`);
      } catch (err) {
        console.error('[Playoff] Failed to record series game:', err);
      }
    }

    // Archive completed game with full stats for post-game summary (EXH-011)
    // T1-08: Only archive if not already done by endGame() — the archive is idempotent
    // but skipping avoids unnecessary IndexedDB writes
    if (!alreadyAggregated) {
      const inningScores = scoreboard.innings.map(inn => ({
        away: inn.away ?? 0,
        home: inn.home ?? 0,
      }));
      await archiveCompletedGame(
        persistedState,
        { away: gameState.awayScore, home: gameState.homeScore },
        inningScores,
        targetSeasonId
      );
    }

    setIsSaving(false);
    setLastSavedAt(Date.now());
  }, [gameState, playerStats, pitcherStats, fameEvents, atBatSequence, scoreboard]);

  const endGame = useCallback(async (options?: EndGameOptions) => {
    // Archive game FIRST so PostGameSummary can load it (EXH-011 fix)
    // Build persisted state for archiving — include player name and team
    const activityLog = options?.activityLog ?? [];
    const seasonIdValue = options?.seasonId ?? seasonIdRef.current ?? 'season-1';
    const currentSeasonNumber = options?.currentSeason ?? gameState.seasonNumber;
    const endGameOptions: EndGameOptions = {
      activityLog,
      seasonId: seasonIdValue,
      franchiseId: options?.franchiseId,
      currentSeason: currentSeasonNumber,
      currentGame: options?.currentGame,
    };
    const awayPlayerIdsForEndGame = new Set(awayLineupRef.current.map(p => p.playerId));
    const playerNameLookupForEndGame = new Map<string, string>();
    for (const p of [...awayLineupRef.current, ...homeLineupRef.current]) {
      playerNameLookupForEndGame.set(p.playerId, p.playerName);
    }

    // CRIT-05 FIX: Query fielding events for endGame path too
    const endGameFieldingEvents = await getGameFieldingEvents(gameState.gameId);
    const endGamePosToPlayerMap = new Map<string, string>();
    for (const p of [...awayLineupRef.current, ...homeLineupRef.current]) {
      if (p.position) {
        const teamId = awayPlayerIdsForEndGame.has(p.playerId) ? gameState.awayTeamId : gameState.homeTeamId;
        endGamePosToPlayerMap.set(`${p.position}_${teamId}`, p.playerId);
      }
    }

    const endGameFieldingTally = new Map<string, { putouts: number; assists: number; errors: number }>();
    for (const fe of endGameFieldingEvents) {
      const resolvedId = endGamePosToPlayerMap.get(`${fe.playerId}_${fe.teamId}`) ||
                          endGamePosToPlayerMap.get(`${fe.position}_${fe.teamId}`) ||
                          fe.playerId;
      const tally = endGameFieldingTally.get(resolvedId) || { putouts: 0, assists: 0, errors: 0 };
      if (fe.playType === 'putout') tally.putouts++;
      else if (fe.playType === 'assist' || fe.playType === 'outfield_assist') tally.assists++;
      else if (fe.playType === 'error') tally.errors++;
      else if (fe.playType === 'double_play_pivot') tally.assists++;
      endGameFieldingTally.set(resolvedId, tally);
    }

    const playerStatsRecord: Record<string, {
      playerName: string; teamId: string;
      pa: number; ab: number; h: number; singles: number; doubles: number;
      triples: number; hr: number; rbi: number; r: number; bb: number;
      hbp: number; k: number; sb: number; cs: number;
      sf: number; sh: number; gidp: number; // MAJ-11
      putouts: number; assists: number; fieldingErrors: number;
    }> = {};
    playerStats.forEach((stats, playerId) => {
      const fieldingTally = endGameFieldingTally.get(playerId) || { putouts: 0, assists: 0, errors: 0 };
      playerStatsRecord[playerId] = {
        ...stats,
        playerName: playerNameLookupForEndGame.get(playerId) || playerId,
        teamId: awayPlayerIdsForEndGame.has(playerId) ? gameState.awayTeamId : gameState.homeTeamId,
        // CRIT-05 FIXED: Fielding stats from IndexedDB
        putouts: fieldingTally.putouts,
        assists: fieldingTally.assists,
        fieldingErrors: fieldingTally.errors,
      };
    });

    // Map local pitcher stats to PersistedGameState format
    // Note: Local PitcherGameStats has fewer fields, so we use defaults for missing ones
    // Pitcher IDs have format "away-{name}" or "home-{name}" - extract team from prefix
    const pitcherGameStatsArray = Array.from(pitcherStats.entries()).map(([pitcherId, stats], idx) => {
      // Determine team from pitcher ID prefix
      const isAwayPitcher = pitcherId.toLowerCase().startsWith('away-');
      const teamId = isAwayPitcher ? gameState.awayTeamId : gameState.homeTeamId;

      // Get actual pitcher name from our tracking ref (EXH-011 fix)
      const pitcherName = pitcherNamesRef.current.get(pitcherId) ||
        // Fallback: extract name from ID by removing team prefix
        pitcherId.replace(/^(away|home)-/, '').replace(/-/g, ' ');

      return {
        pitcherId,
        pitcherName,
        teamId,
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
          const trackerPitcherStats = runnerTrackerRef.current.pitcherStats.get(pitcherId);
          if (!trackerPitcherStats) return 0;
          const onBase = trackerPitcherStats.runnersOnBase.filter(r => r.howReached === 'error').length;
          const scored = trackerPitcherStats.runnersScored.filter(r => r.howReached === 'error').length;
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
    });

    const persistedState: PersistedGameState = {
      id: 'current',
      gameId: gameState.gameId,
      savedAt: Date.now(),
      inning: gameState.inning,
      halfInning: gameState.isTop ? 'TOP' : 'BOTTOM',
      outs: gameState.outs,
      homeScore: gameState.homeScore,
      awayScore: gameState.awayScore,
      bases: {
        first: gameState.bases.first ? { playerId: 'r1', playerName: 'R1' } : null,
        second: gameState.bases.second ? { playerId: 'r2', playerName: 'R2' } : null,
        third: gameState.bases.third ? { playerId: 'r3', playerName: 'R3' } : null,
      },
      currentBatterIndex: 0,
      atBatCount: atBatSequence,
      awayTeamId: gameState.awayTeamId,
      homeTeamId: gameState.homeTeamId,
      awayTeamName: gameState.awayTeamName,
      homeTeamName: gameState.homeTeamName,
      seasonNumber: currentSeasonNumber,
      stadiumName: resolvedStadium,
      playerStats: playerStatsRecord,
      pitcherGameStats: pitcherGameStatsArray,
      // Map local FameEventRecord to PersistedGameState format
      // Note: Local FameEventRecord has fewer fields, so we use defaults for missing ones
      fameEvents: fameEvents.map((fe, idx) => ({
        id: `${gameState.gameId}_fame_${idx}`,
        gameId: gameState.gameId,
        eventType: fe.eventType,
        playerId: fe.playerId,
        playerName: fe.playerName,
        playerTeam: '', // Not tracked in local FameEventRecord
        fameValue: fe.fameValue,
        fameType: fe.fameType,
        inning: gameState.inning, // Use current game inning
        halfInning: gameState.isTop ? 'TOP' as const : 'BOTTOM' as const,
        timestamp: Date.now(),
        autoDetected: true, // Assume auto-detected
        description: fe.description,
      })),
      lastHRBatterId: null,
      consecutiveHRCount: 0,
      inningStrikeouts: 0,
      maxDeficitAway: 0,
      maxDeficitHome: 0,
      activityLog: activityLog.slice(-20),
    };

    // Archive game for post-game summary
    const inningScores = scoreboard.innings.map(inn => ({
      away: inn.away ?? 0,
      home: inn.home ?? 0,
    }));
    const seasonId = seasonIdValue;
    await archiveCompletedGame(
      persistedState,
      { away: gameState.awayScore, home: gameState.homeScore },
      inningScores,
      seasonId
    );

    console.log('[endGame] Game archived for post-game summary');

    // Per PITCH_COUNT_TRACKING_SPEC.md: Mandatory pitch count capture at end of game
    // Show prompt for current pitcher (simplified - full spec requires all pitchers)
    const currentPitcherStats = pitcherStats.get(gameState.currentPitcherId) || createEmptyPitcherStats();

    setPitchCountPrompt({
      type: 'end_game',
      pitcherId: gameState.currentPitcherId,
      pitcherName: gameState.currentPitcherName || gameState.currentPitcherId,
      currentCount: currentPitcherStats.pitchCount,
      lastVerifiedInning: gameState.inning,
    });

    // Store the pending action (for season aggregation, etc.)
    pendingActionRef.current = () => completeGameInternal(endGameOptions);

    // T0-05 FIX: Call completeGameInternal directly instead of deferring to pitch count prompt.
    // The GameTracker navigates to PostGameSummary immediately after endGame() returns,
    // which unmounts the component before the pitch count prompt can render/fire.
    // This ensures processCompletedGame, markGameAggregated, and archiveCompletedGame run.
    try {
      await completeGameInternal(endGameOptions);
      console.log('[endGame] T0-05: completeGameInternal executed — stats aggregated');
    } catch (err) {
      console.error('[endGame] T0-05: completeGameInternal failed:', err);
    }
  }, [gameState, playerStats, pitcherStats, fameEvents, atBatSequence, scoreboard, completeGameInternal]);

  // Snapshot runner tracker for undo system (Maps don't survive JSON.stringify)
  // Converts pitcherStats Map to serializable entries array
  const getRunnerTrackerSnapshot = useCallback(() => {
    const tracker = runnerTrackerRef.current;
    return {
      runners: tracker.runners,
      currentPitcherId: tracker.currentPitcherId,
      currentPitcherName: tracker.currentPitcherName,
      pitcherStatsEntries: Array.from(tracker.pitcherStats.entries()),
      inning: tracker.inning,
      atBatNumber: tracker.atBatNumber,
    };
  }, []);

  // T1-02/03/04: Get runner names from the tracker (single source of truth)
  // This replaces the fragile runnerNames state in GameTracker that fell out of sync
  // with SB, WP, pinch runner, and thrown-out-advancing events.
  const getBaseRunnerNames = useCallback((): { first?: string; second?: string; third?: string } => {
    const tracker = runnerTrackerRef.current;
    const result: { first?: string; second?: string; third?: string } = {};
    for (const runner of tracker.runners) {
      if (runner.currentBase === '1B') result.first = runner.runnerName;
      else if (runner.currentBase === '2B') result.second = runner.runnerName;
      else if (runner.currentBase === '3B') result.third = runner.runnerName;
    }
    return result;
  }, []);

  // Restore state from undo snapshot (Phase 7 - Undo System)
  // CRIT-01 fix: Now also restores playerStats and pitcherStats Maps
  // Runner tracker undo fix: Also restores runnerTrackerRef for correct ER attribution
  const restoreState = useCallback((snapshot: {
    gameState: GameState;
    scoreboard: ScoreboardState;
    playerStats?: Map<string, PlayerGameStats>;
    pitcherStats?: Map<string, PitcherGameStats>;
    runnerTrackerState?: {
      runners: RunnerTrackingState['runners'];
      currentPitcherId: string;
      currentPitcherName: string;
      pitcherStats: Map<string, PitcherRunnerStats>;
      inning: number;
      atBatNumber: number;
    };
  }) => {
    console.log('[useGameState] Restoring state from snapshot');
    setGameState(snapshot.gameState);
    setScoreboard(snapshot.scoreboard);
    if (snapshot.playerStats) {
      setPlayerStats(snapshot.playerStats);
    }
    if (snapshot.pitcherStats) {
      setPitcherStats(snapshot.pitcherStats);
    }
    if (snapshot.runnerTrackerState) {
      runnerTrackerRef.current = snapshot.runnerTrackerState;
      console.log('[useGameState] Runner tracker restored from snapshot');
    }
  }, []);

  // Set loading to false after initial setup
  useEffect(() => {
    if (!initialGameId) {
      setIsLoading(false);
    }
  }, [initialGameId]);

  // Playoff context setter (for GameTracker to set from navigation state)
  const setPlayoffContext = useCallback((seriesId: string | null, gameNumber: number | null) => {
    playoffSeriesIdRef.current = seriesId;
    playoffGameNumberRef.current = gameNumber;
    if (seriesId) {
      console.log(`[Playoff] Context set: series=${seriesId}, game=${gameNumber}`);
    }
  }, []);

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
    recordEvent,
    advanceRunner,
    advanceRunnersBatch,
    makeSubstitution,
    switchPositions,
    changePitcher,
    advanceCount,
    resetCount,
    endInning,
    endGame,
    // Pitch count prompts (per PITCH_COUNT_TRACKING_SPEC.md)
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
    lastSavedAt,
    atBatSequence,
    // T0-01: Auto game-end detection
    showAutoEndPrompt,
    dismissAutoEndPrompt: useCallback(() => setShowAutoEndPrompt(false), []),
    setPlayoffContext,
    setStadiumName,
  };
}
