/**
 * Game State Hook for Figma GameTracker
 *
 * This hook bridges the Figma UI to the existing KBL Tracker data layer.
 * It wraps the existing hooks and provides a simplified interface for the UI.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
// Import from src/ persistence layer
import {
  logAtBatEvent,
  createGameHeader,
  completeGame,
  getGameEvents,
  getUnaggregatedGames,
  markGameAggregated,
  type AtBatEvent,
  type RunnerState,
  type GameHeader,
  type FameEventRecord,
} from '../../utils/eventLog';
import { aggregateGameToSeason } from '../../utils/seasonAggregator';
import type { PersistedGameState } from '../../utils/gameStorage';
import type { AtBatResult, HalfInning } from '../../types/game';
import { getBaseOutLI, type BaseState } from '../../engines/leverageCalculator';

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
  k: number;
  sb: number;
  cs: number;
}

export interface PitcherGameStats {
  outsRecorded: number;
  hitsAllowed: number;
  runsAllowed: number;
  earnedRuns: number;
  walksAllowed: number;
  strikeoutsThrown: number;
  homeRunsAllowed: number;
  pitchCount: number;
  battersFaced: number;
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
  makeSubstitution: (benchPlayerId: string, lineupPlayerId: string, benchPlayerName?: string, lineupPlayerName?: string) => void;
  changePitcher: (newPitcherId: string, exitingPitcherId: string, newPitcherName?: string, exitingPitcherName?: string) => void;
  advanceCount: (type: 'ball' | 'strike' | 'foul') => void;
  resetCount: () => void;
  endInning: () => void;
  endGame: () => Promise<void>;

  // Pitch count prompts (per PITCH_COUNT_TRACKING_SPEC.md)
  pitchCountPrompt: PitchCountPrompt | null;
  confirmPitchCount: (pitcherId: string, finalCount: number) => void;
  dismissPitchCountPrompt: () => void;

  // Initialization
  initializeGame: (config: GameInitConfig) => Promise<void>;
  loadExistingGame: () => Promise<boolean>;

  // Undo support
  restoreState: (snapshot: { gameState: GameState; scoreboard: ScoreboardState }) => void;

  // Loading/persistence
  isLoading: boolean;
  isSaving: boolean;
  lastSavedAt: number | null;
  atBatSequence: number;
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
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function mapAtBatResultFromHit(hitType: HitType): AtBatResult {
  // AtBatResult uses abbreviations: '1B', '2B', '3B', 'HR'
  return hitType;
}

function mapAtBatResultFromOut(outType: OutType): AtBatResult {
  // AtBatResult types per game.ts: 'K', 'KL', 'GO', 'FO', 'LO', 'PO', 'DP', 'SF', 'SAC', 'FC', 'D3K'
  switch (outType) {
    case 'K': return 'K';
    case 'KL': return 'KL';
    case 'GO': return 'GO';
    case 'FO': return 'FO';
    case 'LO': return 'LO';
    case 'PO': return 'PO';
    case 'DP': return 'DP';
    case 'TP': return 'DP'; // Triple play recorded as DP (closest type)
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
    r: 0, rbi: 0, bb: 0, k: 0, sb: 0, cs: 0,
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

  // DP doesn't give RBIs even if run scores
  if (result === 'DP') {
    rbis = 0;
  }

  return rbis;
}

/**
 * Helper type definitions matching src/types/game.ts
 */
export function isOut(result: AtBatResult): boolean {
  return ['K', 'KL', 'GO', 'FO', 'LO', 'PO', 'DP', 'SF', 'SAC'].includes(result);
}

export function isHit(result: AtBatResult): boolean {
  return ['1B', '2B', '3B', 'HR'].includes(result);
}

export function reachesBase(result: AtBatResult): boolean {
  return ['1B', '2B', '3B', 'HR', 'BB', 'IBB', 'HBP', 'E', 'FC', 'D3K'].includes(result);
}

function createEmptyPitcherStats(): PitcherGameStats {
  return {
    outsRecorded: 0, hitsAllowed: 0, runsAllowed: 0, earnedRuns: 0,
    walksAllowed: 0, strikeoutsThrown: 0, homeRunsAllowed: 0,
    pitchCount: 0, battersFaced: 0,
  };
}

// ============================================
// MAIN HOOK
// ============================================

export function useGameState(initialGameId?: string): UseGameStateReturn {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const [atBatSequence, setAtBatSequence] = useState(0);

  // Current batter index for each team
  const [awayBatterIndex, setAwayBatterIndex] = useState(0);
  const [homeBatterIndex, setHomeBatterIndex] = useState(0);

  // Lineup storage
  const awayLineupRef = useRef<{ playerId: string; playerName: string; position: string }[]>([]);
  const homeLineupRef = useRef<{ playerId: string; playerName: string; position: string }[]>([]);
  const seasonIdRef = useRef<string>('');

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
  });

  const [scoreboard, setScoreboard] = useState<ScoreboardState>({
    innings: Array(9).fill(null).map(() => ({ away: undefined, home: undefined })),
    away: { runs: 0, hits: 0, errors: 0 },
    home: { runs: 0, hits: 0, errors: 0 },
  });

  const [playerStats, setPlayerStats] = useState<Map<string, PlayerGameStats>>(new Map());
  const [pitcherStats, setPitcherStats] = useState<Map<string, PitcherGameStats>>(new Map());

  // Fame events tracked during game (per SPECIAL_EVENTS_SPEC.md)
  const [fameEvents, setFameEvents] = useState<FameEventRecord[]>([]);

  // Substitution log for game history
  const [substitutionLog, setSubstitutionLog] = useState<Array<{
    type: 'player_sub' | 'pitching_change';
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

  // ============================================
  // INITIALIZATION
  // ============================================

  const initializeGame = useCallback(async (config: GameInitConfig) => {
    setIsLoading(true);

    // Store lineup refs
    awayLineupRef.current = config.awayLineup;
    homeLineupRef.current = config.homeLineup;
    seasonIdRef.current = config.seasonId;

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

    // Initialize pitcher stats
    const initialPitcherStats = new Map<string, PitcherGameStats>();
    initialPitcherStats.set(config.awayStartingPitcherId, createEmptyPitcherStats());
    initialPitcherStats.set(config.homeStartingPitcherId, createEmptyPitcherStats());
    setPitcherStats(initialPitcherStats);

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
      const nextIndex = (currentIndex + 1) % battingTeamLineup.length;
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
      rbiCount: rbi,
      runsScored,
      inning: gameState.inning,
      halfInning: gameState.isTop ? 'TOP' : 'BOTTOM',
      outs: gameState.outs,
      runners: {
        first: gameState.bases.first ? { runnerId: '', runnerName: '', responsiblePitcherId: gameState.currentPitcherId } : null,
        second: gameState.bases.second ? { runnerId: '', runnerName: '', responsiblePitcherId: gameState.currentPitcherId } : null,
        third: gameState.bases.third ? { runnerId: '', runnerName: '', responsiblePitcherId: gameState.currentPitcherId } : null,
      },
      awayScore: gameState.awayScore,
      homeScore: gameState.homeScore,
      outsAfter: gameState.outs,
      runnersAfter: { first: null, second: null, third: null }, // Updated below
      awayScoreAfter: gameState.isTop ? gameState.awayScore + runsScored : gameState.awayScore,
      homeScoreAfter: gameState.isTop ? gameState.homeScore : gameState.homeScore + runsScored,
      leverageIndex,
      winProbabilityBefore: 0.5, // TODO: Implement win probability calculator
      winProbabilityAfter: 0.5,
      wpa: 0, // TODO: Calculate WPA = winProbAfter - winProbBefore
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
      batterStats.rbi += rbi;
      if (hitType === 'HR') batterStats.r++; // Batter scores on HR
      newStats.set(gameState.currentBatterId, batterStats);
      return newStats;
    });

    // Update pitcher stats
    setPitcherStats(prev => {
      const newStats = new Map(prev);
      const pStats = newStats.get(gameState.currentPitcherId) || createEmptyPitcherStats();
      pStats.hitsAllowed++;
      pStats.battersFaced++;
      pStats.pitchCount += pitchCount;
      if (hitType === 'HR') pStats.homeRunsAllowed++;
      pStats.runsAllowed += runsScored;
      pStats.earnedRuns += runsScored; // Simplified - all runs earned for now
      newStats.set(gameState.currentPitcherId, pStats);
      return newStats;
    });

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

    const battingTeamId = gameState.isTop ? gameState.awayTeamId : gameState.homeTeamId;
    const pitchingTeamId = gameState.isTop ? gameState.homeTeamId : gameState.awayTeamId;

    // Calculate outs on play:
    // - DP = 2 outs, TP = 3 outs (batter + runners)
    // - Otherwise start with 1 (batter out) and add any runners thrown out
    let outsOnPlay = outType === 'DP' ? 2 : outType === 'TP' ? 3 : 1;

    // FIX: Count additional outs from runners thrown out (e.g., tag up attempt on fly out)
    // Only count runner outs if NOT already a DP/TP (to avoid double counting)
    if (outType !== 'DP' && outType !== 'TP' && runnerData) {
      if (runnerData.fromFirst === 'out') outsOnPlay++;
      if (runnerData.fromSecond === 'out') outsOnPlay++;
      if (runnerData.fromThird === 'out') outsOnPlay++;
      console.log(`[recordOut] Outs on play: ${outsOnPlay} (batter + ${outsOnPlay - 1} runner(s))`);
    }

    const newOuts = gameState.outs + outsOnPlay;

    // Calculate runs scored on sacrifice plays
    let runsScored = 0;
    if (runnerData?.fromThird === 'home') runsScored++;

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
      result: mapAtBatResultFromOut(outType),
      rbiCount: outType === 'SF' ? 1 : 0,
      runsScored,
      inning: gameState.inning,
      halfInning: gameState.isTop ? 'TOP' : 'BOTTOM',
      outs: gameState.outs,
      runners: {
        first: gameState.bases.first ? { runnerId: '', runnerName: '', responsiblePitcherId: gameState.currentPitcherId } : null,
        second: gameState.bases.second ? { runnerId: '', runnerName: '', responsiblePitcherId: gameState.currentPitcherId } : null,
        third: gameState.bases.third ? { runnerId: '', runnerName: '', responsiblePitcherId: gameState.currentPitcherId } : null,
      },
      awayScore: gameState.awayScore,
      homeScore: gameState.homeScore,
      outsAfter: Math.min(newOuts, 3),
      runnersAfter: { first: null, second: null, third: null },
      awayScoreAfter: gameState.isTop ? gameState.awayScore + runsScored : gameState.awayScore,
      homeScoreAfter: gameState.isTop ? gameState.homeScore : gameState.homeScore + runsScored,
      leverageIndex,
      winProbabilityBefore: 0.5,
      winProbabilityAfter: 0.5,
      wpa: 0,
      ballInPlay: null,
      fameEvents: [],
      isLeadoff: gameState.outs === 0 && !gameState.bases.first && !gameState.bases.second && !gameState.bases.third,
      isClutch,
      isWalkOff: false, // Outs never cause walk-offs
    };

    await logAtBatEvent(event);

    // Update player stats
    setPlayerStats(prev => {
      const newStats = new Map(prev);
      const batterStats = newStats.get(gameState.currentBatterId) || createEmptyPlayerStats();
      batterStats.pa++;
      if (outType !== 'SF' && outType !== 'SH') {
        batterStats.ab++;
      }
      if (outType === 'K' || outType === 'KL' || outType === 'D3K') {
        batterStats.k++;
      }
      if (outType === 'SF') {
        batterStats.rbi++;
      }
      newStats.set(gameState.currentBatterId, batterStats);
      return newStats;
    });

    // Update pitcher stats
    setPitcherStats(prev => {
      const newStats = new Map(prev);
      const pStats = newStats.get(gameState.currentPitcherId) || createEmptyPitcherStats();
      pStats.outsRecorded += outsOnPlay;
      pStats.battersFaced++;
      pStats.pitchCount += pitchCount;
      if (outType === 'K' || outType === 'KL' || outType === 'D3K') {
        pStats.strikeoutsThrown++;
      }
      newStats.set(gameState.currentPitcherId, pStats);
      return newStats;
    });

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

    // Check for end of inning
    if (newOuts >= 3) {
      // Will be handled by endInning or UI
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
        first: gameState.bases.first ? { runnerId: '', runnerName: '', responsiblePitcherId: gameState.currentPitcherId } : null,
        second: gameState.bases.second ? { runnerId: '', runnerName: '', responsiblePitcherId: gameState.currentPitcherId } : null,
        third: gameState.bases.third ? { runnerId: '', runnerName: '', responsiblePitcherId: gameState.currentPitcherId } : null,
      },
      awayScore: gameState.awayScore,
      homeScore: gameState.homeScore,
      outsAfter: gameState.outs,
      runnersAfter: { first: null, second: null, third: null },
      awayScoreAfter: gameState.isTop ? gameState.awayScore + runsScored : gameState.awayScore,
      homeScoreAfter: isBottom ? homeScoreAfter : gameState.homeScore + runsScored,
      leverageIndex,
      winProbabilityBefore: 0.5,
      winProbabilityAfter: 0.5,
      wpa: 0,
      ballInPlay: null,
      fameEvents: [],
      isLeadoff: false,
      isClutch,
      isWalkOff,
    };

    await logAtBatEvent(event);

    // Update player stats
    setPlayerStats(prev => {
      const newStats = new Map(prev);
      const batterStats = newStats.get(gameState.currentBatterId) || createEmptyPlayerStats();
      batterStats.pa++;
      batterStats.bb++;
      if (basesLoaded) batterStats.rbi++;
      newStats.set(gameState.currentBatterId, batterStats);
      return newStats;
    });

    // Update pitcher stats
    setPitcherStats(prev => {
      const newStats = new Map(prev);
      const pStats = newStats.get(gameState.currentPitcherId) || createEmptyPitcherStats();
      pStats.walksAllowed++;
      pStats.battersFaced++;
      pStats.pitchCount += pitchCount;
      if (basesLoaded) {
        pStats.runsAllowed++;
        pStats.earnedRuns++;
      }
      newStats.set(gameState.currentPitcherId, pStats);
      return newStats;
    });

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

    const battingTeamId = gameState.isTop ? gameState.awayTeamId : gameState.homeTeamId;
    const pitchingTeamId = gameState.isTop ? gameState.homeTeamId : gameState.awayTeamId;

    // D3K always counts as strikeout for result type
    const result: AtBatResult = 'K';
    const newOuts = batterReached ? gameState.outs : gameState.outs + 1;

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
        first: gameState.bases.first ? { runnerId: '', runnerName: '', responsiblePitcherId: gameState.currentPitcherId } : null,
        second: gameState.bases.second ? { runnerId: '', runnerName: '', responsiblePitcherId: gameState.currentPitcherId } : null,
        third: gameState.bases.third ? { runnerId: '', runnerName: '', responsiblePitcherId: gameState.currentPitcherId } : null,
      },
      awayScore: gameState.awayScore,
      homeScore: gameState.homeScore,
      outsAfter: newOuts,
      runnersAfter: {
        first: batterReached ? { runnerId: '', runnerName: '', responsiblePitcherId: gameState.currentPitcherId } : null,
        second: null,
        third: null,
      },
      awayScoreAfter: gameState.awayScore,
      homeScoreAfter: gameState.homeScore,
      leverageIndex: 1.0,
      winProbabilityBefore: 0.5,
      winProbabilityAfter: 0.5,
      wpa: 0,
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

    // Check for end of inning
    if (newOuts >= 3) {
      // Will be handled by endInning or UI
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
      rbiCount: rbi,
      runsScored,
      inning: gameState.inning,
      halfInning: gameState.isTop ? 'TOP' : 'BOTTOM',
      outs: gameState.outs,
      runners: {
        first: gameState.bases.first ? { runnerId: '', runnerName: '', responsiblePitcherId: gameState.currentPitcherId } : null,
        second: gameState.bases.second ? { runnerId: '', runnerName: '', responsiblePitcherId: gameState.currentPitcherId } : null,
        third: gameState.bases.third ? { runnerId: '', runnerName: '', responsiblePitcherId: gameState.currentPitcherId } : null,
      },
      awayScore: gameState.awayScore,
      homeScore: gameState.homeScore,
      outsAfter: gameState.outs,
      runnersAfter: { first: null, second: null, third: null },
      awayScoreAfter: gameState.isTop ? gameState.awayScore + runsScored : gameState.awayScore,
      homeScoreAfter: gameState.isTop ? gameState.homeScore : gameState.homeScore + runsScored,
      leverageIndex: 1.0,
      winProbabilityBefore: 0.5,
      winProbabilityAfter: 0.5,
      wpa: 0,
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
      // No AB charged on error
      batterStats.rbi += rbi;
      newStats.set(gameState.currentBatterId, batterStats);
      return newStats;
    });

    // Update pitcher stats - runs on errors are unearned
    setPitcherStats(prev => {
      const newStats = new Map(prev);
      const pStats = newStats.get(gameState.currentPitcherId) || createEmptyPitcherStats();
      pStats.battersFaced++;
      pStats.pitchCount += pitchCount;
      pStats.runsAllowed += runsScored;
      // Note: earnedRuns NOT incremented - runs on errors are unearned
      newStats.set(gameState.currentPitcherId, pStats);
      return newStats;
    });

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

    // Update game state - batter takes first base
    setGameState(prev => {
      let newBases = { first: true, second: false, third: false };

      // Handle runner advancement
      if (runnerData) {
        if (runnerData.fromFirst === 'second') newBases.second = true;
        if (runnerData.fromFirst === 'third') newBases.third = true;
        if (runnerData.fromSecond === 'third') newBases.third = true;
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
      ROBBERY: 1.5,         // HR denied at wall (y > 0.95)

      // Baserunning events (runner receives Fame)
      TOOTBLAN: -3.0,       // Baserunning blunder

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
      const baseFame = FAME_VALUES[eventType];
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

    // TODO: Log to separate event store
  }, [gameState.outs, gameState.bases]);

  const advanceRunner = useCallback((from: 'first' | 'second' | 'third', to: 'second' | 'third' | 'home', outcome: 'safe' | 'out') => {
    setGameState(prev => {
      const newBases = { ...prev.bases };
      let scoreChange = 0;
      let outsChange = 0;

      // Clear origin base
      if (from === 'first') newBases.first = false;
      if (from === 'second') newBases.second = false;
      if (from === 'third') newBases.third = false;

      if (outcome === 'safe') {
        if (to === 'second') newBases.second = true;
        if (to === 'third') newBases.third = true;
        if (to === 'home') scoreChange = 1;
      } else {
        outsChange = 1;
      }

      return {
        ...prev,
        bases: newBases,
        outs: prev.outs + outsChange,
        awayScore: prev.isTop ? prev.awayScore + scoreChange : prev.awayScore,
        homeScore: prev.isTop ? prev.homeScore : prev.homeScore + scoreChange,
      };
    });
  }, []);

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

    setGameState(prev => {
      // Start with all bases cleared for runners that moved
      const newBases = { ...prev.bases };
      let scoreChange = 0;
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
          if (move.to === 'home') scoreChange++;
        } else {
          // Runner is out
          outsChange++;
        }
      }

      console.log('[advanceRunnersBatch] Result - bases:', newBases, 'runs:', scoreChange, 'outs:', outsChange);

      return {
        ...prev,
        bases: newBases,
        outs: prev.outs + outsChange,
        awayScore: prev.isTop ? prev.awayScore + scoreChange : prev.awayScore,
        homeScore: prev.isTop ? prev.homeScore : prev.homeScore + scoreChange,
      };
    });
  }, []);

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

  const makeSubstitution = useCallback((benchPlayerId: string, lineupPlayerId: string, benchPlayerName?: string, lineupPlayerName?: string) => {
    // Log substitution event
    setSubstitutionLog(prev => [...prev, {
      type: 'player_sub',
      inning: gameState.inning,
      halfInning: gameState.isTop ? 'TOP' : 'BOTTOM',
      outgoingPlayerId: lineupPlayerId,
      outgoingPlayerName: lineupPlayerName || lineupPlayerId,
      incomingPlayerId: benchPlayerId,
      incomingPlayerName: benchPlayerName || benchPlayerId,
      timestamp: Date.now(),
    }]);

    // TODO: Update lineup refs to swap the players
    // This would require finding the player in the lineup and replacing them

    console.log(`[useGameState] Substitution logged: ${benchPlayerName || benchPlayerId} replaces ${lineupPlayerName || lineupPlayerId} in inning ${gameState.inning}`);
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

      // Initialize new pitcher stats
      setPitcherStats(prev => {
        const newStats = new Map(prev);
        if (!newStats.has(newPitcherId)) {
          newStats.set(newPitcherId, createEmptyPitcherStats());
        }
        return newStats;
      });

      setGameState(prev => ({
        ...prev,
        currentPitcherId: newPitcherId,
        currentPitcherName: newPitcherName || '',
      }));

      console.log(`[useGameState] Pitching change logged: ${newPitcherName || newPitcherId} replaces ${exitingPitcherName || exitingPitcherId} in inning ${gameState.inning}`);
    };
  }, [pitcherStats, gameState.inning, gameState.isTop]);

  // Confirm pitch count and execute pending action (per PITCH_COUNT_TRACKING_SPEC.md)
  const confirmPitchCount = useCallback((pitcherId: string, finalCount: number) => {
    // Update the pitcher's final pitch count
    setPitcherStats(prev => {
      const newStats = new Map(prev);
      const stats = newStats.get(pitcherId) || createEmptyPitcherStats();
      stats.pitchCount = finalCount;
      newStats.set(pitcherId, stats);
      return newStats;
    });

    console.log(`[useGameState] Pitch count confirmed: ${pitcherId} = ${finalCount} pitches`);

    // Execute the pending action (pitching change or end game)
    if (pendingActionRef.current) {
      pendingActionRef.current();
      pendingActionRef.current = null;
    }

    // Clear the prompt
    setPitchCountPrompt(null);
  }, []);

  // Dismiss pitch count prompt without confirming (cancels the pending action)
  const dismissPitchCountPrompt = useCallback(() => {
    setPitchCountPrompt(null);
    pendingActionRef.current = null;
    console.log('[useGameState] Pitch count prompt dismissed, action cancelled');
  }, []);

  const endInning = useCallback(() => {
    setGameState(prev => {
      const newIsTop = !prev.isTop;
      const newInning = !newIsTop ? prev.inning + 1 : prev.inning;

      // Get next batter
      const battingTeamLineup = newIsTop ? awayLineupRef.current : homeLineupRef.current;
      const currentIndex = newIsTop ? awayBatterIndex : homeBatterIndex;
      const nextBatter = battingTeamLineup[currentIndex];

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
      };
    });
  }, [awayBatterIndex, homeBatterIndex]);

  // Internal function to complete game after pitch counts confirmed
  const completeGameInternal = useCallback(async () => {
    setIsSaving(true);

    // Mark game as complete in event log
    await completeGame(
      gameState.gameId,
      { away: gameState.awayScore, home: gameState.homeScore },
      gameState.inning
    );

    // Convert Map to Record for PersistedGameState
    const playerStatsRecord: Record<string, {
      pa: number; ab: number; h: number; singles: number; doubles: number;
      triples: number; hr: number; rbi: number; r: number; bb: number;
      k: number; sb: number; cs: number; putouts: number; assists: number;
      fieldingErrors: number;
    }> = {};
    playerStats.forEach((stats, playerId) => {
      playerStatsRecord[playerId] = {
        ...stats,
        putouts: 0,
        assists: 0,
        fieldingErrors: 0,
      };
    });

    // Convert pitcher stats Map to array for PersistedGameState
    const pitcherGameStatsArray: PersistedGameState['pitcherGameStats'] = [];
    pitcherStats.forEach((stats, pitcherId) => {
      pitcherGameStatsArray.push({
        pitcherId,
        pitcherName: pitcherId, // TODO: Resolve from roster
        teamId: gameState.homeTeamId, // TODO: Determine from context
        isStarter: pitcherGameStatsArray.length === 0,
        entryInning: 1,
        outsRecorded: stats.outsRecorded,
        hitsAllowed: stats.hitsAllowed,
        runsAllowed: stats.runsAllowed,
        earnedRuns: stats.earnedRuns,
        walksAllowed: stats.walksAllowed,
        strikeoutsThrown: stats.strikeoutsThrown,
        homeRunsAllowed: stats.homeRunsAllowed,
        hitBatters: 0,
        basesReachedViaError: 0,
        wildPitches: 0,
        pitchCount: stats.pitchCount,
        battersFaced: stats.battersFaced,
        consecutiveHRsAllowed: 0,
        firstInningRuns: 0,
        basesLoadedWalks: 0,
        inningsComplete: Math.floor(stats.outsRecorded / 3),
      });
    });

    // Construct PersistedGameState for aggregation
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
      activityLog: [],
    };

    // Aggregate game stats to season totals
    const seasonId = seasonIdRef.current || 'season-1';
    await aggregateGameToSeason(persistedState, { seasonId });

    // Mark as aggregated after successful aggregation
    await markGameAggregated(gameState.gameId);

    setIsSaving(false);
    setLastSavedAt(Date.now());
  }, [gameState, playerStats, pitcherStats, fameEvents, atBatSequence]);

  const endGame = useCallback(async () => {
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

    // Store the pending action
    pendingActionRef.current = completeGameInternal;
  }, [gameState.currentPitcherId, gameState.currentPitcherName, gameState.inning, pitcherStats, completeGameInternal]);

  // Restore state from undo snapshot (Phase 7 - Undo System)
  const restoreState = useCallback((snapshot: { gameState: GameState; scoreboard: ScoreboardState }) => {
    console.log('[useGameState] Restoring state from snapshot');
    setGameState(snapshot.gameState);
    setScoreboard(snapshot.scoreboard);
  }, []);

  // Set loading to false after initial setup
  useEffect(() => {
    if (!initialGameId) {
      setIsLoading(false);
    }
  }, [initialGameId]);

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
    isLoading,
    isSaving,
    lastSavedAt,
    atBatSequence,
  };
}
