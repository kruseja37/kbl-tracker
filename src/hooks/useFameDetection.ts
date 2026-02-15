import { useCallback, useRef } from 'react';
import type {
  FameEventType,
  FameEvent,
  FameAutoDetectionSettings,
  HalfInning,
  AtBatResult,
  Bases,
  Position,
  SpecialPlayType,
} from '../types/game';
import {
  createFameEvent,
  DEFAULT_FAME_SETTINGS
} from '../types/game';
import type { MojoLevel } from '../engines/mojoEngine';
import type { FitnessState } from '../engines/fitnessEngine';

// ============================================
// FAME AUTO-DETECTION HOOK
const DEFAULT_INNINGS_PER_GAME = 9;

export const calculateMadduxThreshold = (inningsPerGame: number = DEFAULT_INNINGS_PER_GAME): number => (
  Math.floor(inningsPerGame * 9.44)
);

// Per FAN_HAPPINESS_SPEC.md Section 4
// ============================================

export interface PlayerStats {
  playerId: string;
  playerName: string;
  teamId: string;
  position: Position;
  // Batting stats for current game
  hits: { '1B': number; '2B': number; '3B': number; 'HR': number };
  strikeouts: number;
  walks: number;
  atBats: number;
  runnersLeftOnBase: number;  // For LOB_KING detection
  gidp: number;               // For MULTIPLE_GIDP detection
  totalHits: number;          // For multi-hit game detection (3, 4, 5, 6 hits)
  totalRBI: number;           // NEW: For multi-RBI game detection (5, 8, 10 RBI)
  isPinchHitter: boolean;     // For PINCH_HIT_HR detection
  battingOrderPosition: number; // For LEADOFF_HR detection
  // Pitching stats for current game
  runsAllowed: number;
  hitsAllowed: number;
  walksAllowed: number;
  hitBatters: number;
  outs: number;  // Outs recorded as pitcher
  homeRunsAllowed: number;
  consecutiveHRsAllowed: number;
  pitchCount: number;
  isStarter: boolean;
  inningsComplete: number;    // For complete game detection
  strikeoutsThrown: number;   // For K game detection
  firstInningRuns: number;    // For FIRST_INNING_DISASTER
  basesLoadedWalks: number;   // For WALKED_IN_RUN
  basesReachedViaError: number; // For perfect game detection (any runner reaching on error breaks it)
  // Fielding
  errors: number;
  outfieldAssistsAtHome: number; // For THROW_OUT_AT_HOME
}

// Per-inning pitch tracking (for Immaculate Inning detection)
interface InningPitchData {
  pitches: number;
  strikeouts: number;
  pitcherId: string;
}

interface GameContext {
  gameId: string;
  inning: number;
  halfInning: HalfInning;
  outs: number;
  score: { away: number; home: number };
  bases: Bases;
  isGameOver: boolean;
  scheduledInnings: number;
  inningsPerGame?: number;
  maxDeficitOvercome: number;  // For comeback detection
  lastHRBatterId: string | null;  // For back-to-back HR detection
  consecutiveHRCount: number;  // For B2B2B HR detection
  isFirstAtBatOfGame: boolean; // For leadoff HR
  leadChanges: number;         // For tracking go-ahead situations
  previousLeadTeam: 'away' | 'home' | 'tie'; // For go-ahead detection
  maxLeadBlown: { away: number; home: number }; // For blown lead detection
  // Per-inning tracking for Immaculate Inning detection
  currentInningPitches?: InningPitchData;
  // Leverage Index for Fame weighting (0.1-10.0, 1.0 = average)
  // Higher LI = higher-stakes situation = more Fame credit/blame
  leverageIndex?: number;
  // Current batter mojo/fitness for Fame adjustment
  // Per MOJO_FITNESS_SYSTEM_SPEC.md Section 4.2-4.3
  batterMojo?: MojoLevel;
  batterFitness?: FitnessState;
  // Current pitcher mojo/fitness for Fame adjustment
  pitcherMojo?: MojoLevel;
  pitcherFitness?: FitnessState;
}

interface DetectionResult {
  event: FameEvent;
  message: string;
}

interface UseFameDetectionProps {
  settings?: FameAutoDetectionSettings;
  onFameDetected?: (result: DetectionResult) => void;
}

export function useFameDetection({
  settings = DEFAULT_FAME_SETTINGS,
  onFameDetected
}: UseFameDetectionProps = {}) {
  // Track detected events to avoid duplicates
  const detectedEvents = useRef<Set<string>>(new Set());

  // Create unique key for deduplication
  const createEventKey = (
    eventType: FameEventType,
    playerId: string,
    inning: number
  ): string => {
    return `${eventType}_${playerId}_${inning}`;
  };

  // Check if event already detected
  const isAlreadyDetected = (key: string): boolean => {
    return detectedEvents.current.has(key);
  };

  // Mark event as detected
  const markDetected = (key: string): void => {
    detectedEvents.current.add(key);
  };

  // Reset for new game
  const resetDetection = useCallback(() => {
    detectedEvents.current.clear();
  }, []);

  // ============================================
  // WALK-OFF DETECTION
  // Distinguishes between regular walk-off, walk-off HR, and walk-off grand slam
  // ============================================
  const detectWalkOff = useCallback((
    context: GameContext,
    batterId: string,
    batterName: string,
    teamId: string,
    result: AtBatResult,
    rbi: number,
    basesLoaded: boolean = false
  ): DetectionResult | null => {
    if (!settings.enabled) return null;

    // Walk-off conditions:
    // - Bottom of inning
    // - Inning >= scheduled innings (9th or extra)
    // - Game is over (winning run scored)
    // - Home team won
    const isBottom = context.halfInning === 'BOTTOM';
    const isLateEnough = context.inning >= context.scheduledInnings;
    const homeWon = context.score.home > context.score.away && context.isGameOver;

    if (isBottom && isLateEnough && homeWon && rbi > 0) {
      // Determine event type based on result
      let eventType: FameEventType = 'WALK_OFF';
      let description = 'Walk-off hit!';
      let message = `Walk-off! ${batterName} wins it!`;

      if (result === 'HR') {
        if (basesLoaded && rbi >= 4) {
          eventType = 'WALK_OFF_GRAND_SLAM';
          description = 'WALK-OFF GRAND SLAM!!!';
          message = `🎆 WALK-OFF GRAND SLAM!!! ${batterName} is a LEGEND!`;
        } else {
          eventType = 'WALK_OFF_HR';
          description = 'Walk-off home run!';
          message = `💣 Walk-off HOME RUN! ${batterName} wins it!`;
        }
      }

      const key = createEventKey(eventType, batterId, context.inning);
      if (isAlreadyDetected(key)) return null;
      markDetected(key);

      const event = createFameEvent(
        context.gameId,
        context.inning,
        context.halfInning,
        eventType,
        batterId,
        batterName,
        teamId,
        true,
        description,
        undefined, // secondaryPlayerId
        undefined, // secondaryPlayerName
        context.leverageIndex,
        context.batterMojo,
        context.batterFitness
      );

      return { event, message };
    }

    return null;
  }, [settings.enabled]);

  // ============================================
  // CYCLE DETECTION
  // ============================================
  const detectCycle = useCallback((
    context: GameContext,
    playerStats: PlayerStats
  ): DetectionResult | null => {
    if (!settings.enabled) return null;

    const { hits } = playerStats;
    const hasCycle = hits['1B'] > 0 && hits['2B'] > 0 && hits['3B'] > 0 && hits['HR'] > 0;

    if (!hasCycle) return null;

    const key = createEventKey('CYCLE', playerStats.playerId, context.inning);
    if (isAlreadyDetected(key)) return null;
    markDetected(key);

    // Check for natural cycle (1B → 2B → 3B → HR in order)
    // This would require tracking hit order, simplified here
    const eventType: FameEventType = 'CYCLE';

    const event = createFameEvent(
      context.gameId,
      context.inning,
      context.halfInning,
      eventType,
      playerStats.playerId,
      playerStats.playerName,
      playerStats.teamId,
      true,
      'Hit for the cycle!',
      undefined,
      undefined,
      context.leverageIndex,
      context.batterMojo,
      context.batterFitness
    );

    return {
      event,
      message: `${playerStats.playerName} has hit for the CYCLE!`
    };
  }, [settings.enabled]);

  // ============================================
  // MULTI-HR DETECTION
  // ============================================
  const detectMultiHR = useCallback((
    context: GameContext,
    playerStats: PlayerStats
  ): DetectionResult | null => {
    if (!settings.enabled) return null;

    const hrCount = playerStats.hits['HR'];
    if (hrCount < 2) return null;

    let eventType: FameEventType;
    if (hrCount >= 4) eventType = 'MULTI_HR_4PLUS';
    else if (hrCount === 3) eventType = 'MULTI_HR_3';
    else eventType = 'MULTI_HR_2';

    const key = createEventKey(eventType, playerStats.playerId, context.inning);
    if (isAlreadyDetected(key)) return null;
    markDetected(key);

    const event = createFameEvent(
      context.gameId,
      context.inning,
      context.halfInning,
      eventType,
      playerStats.playerId,
      playerStats.playerName,
      playerStats.teamId,
      true,
      `${hrCount}-HR game!`,
      undefined,
      undefined,
      context.leverageIndex,
      context.batterMojo,
      context.batterFitness
    );

    return {
      event,
      message: `${playerStats.playerName} has ${hrCount} home runs!`
    };
  }, [settings.enabled]);

  // ============================================
  // BACK-TO-BACK HR DETECTION
  // ============================================
  const detectBackToBackHR = useCallback((
    context: GameContext,
    currentBatterId: string,
    currentBatterName: string,
    teamId: string,
    result: AtBatResult,
    previousBatterId: string | null
  ): DetectionResult | null => {
    if (!settings.enabled) return null;
    if (result !== 'HR' || !previousBatterId) return null;

    // Check if previous batter also hit HR (would need to track this in game state)
    // For now, this is a simplified check - the actual implementation would
    // check the game's at-bat history

    const key = createEventKey('BACK_TO_BACK_HR', currentBatterId, context.inning);
    if (isAlreadyDetected(key)) return null;
    markDetected(key);

    const event = createFameEvent(
      context.gameId,
      context.inning,
      context.halfInning,
      'BACK_TO_BACK_HR',
      currentBatterId,
      currentBatterName,
      teamId,
      true,
      'Back-to-back home runs!',
      undefined,
      undefined,
      context.leverageIndex,
      context.batterMojo,
      context.batterFitness
    );

    return {
      event,
      message: `Back-to-back HOME RUNS!`
    };
  }, [settings.enabled]);

  // ============================================
  // GOLDEN/PLATINUM SOMBRERO DETECTION
  // ============================================
  const detectSombrero = useCallback((
    context: GameContext,
    playerStats: PlayerStats
  ): DetectionResult | null => {
    if (!settings.enabled) return null;

    const kCount = playerStats.strikeouts;
    if (kCount < 4) return null;

    const eventType: FameEventType = kCount >= 5 ? 'PLATINUM_SOMBRERO' : 'GOLDEN_SOMBRERO';

    // Only detect once per threshold
    const key = createEventKey(eventType, playerStats.playerId, 0); // Use 0 for game-level
    if (isAlreadyDetected(key)) return null;
    markDetected(key);

    const event = createFameEvent(
      context.gameId,
      context.inning,
      context.halfInning,
      eventType,
      playerStats.playerId,
      playerStats.playerName,
      playerStats.teamId,
      true,
      `${kCount} strikeouts - ${eventType === 'PLATINUM_SOMBRERO' ? 'Platinum' : 'Golden'} Sombrero!`,
      undefined,
      undefined,
      context.leverageIndex,
      context.batterMojo,
      context.batterFitness
    );

    return {
      event,
      message: `${playerStats.playerName} has ${kCount} strikeouts - ${eventType === 'PLATINUM_SOMBRERO' ? 'Platinum' : 'Golden'} Sombrero!`
    };
  }, [settings.enabled]);

  // ============================================
  // MELTDOWN DETECTION
  // ============================================
  const detectMeltdown = useCallback((
    context: GameContext,
    pitcherStats: PlayerStats
  ): DetectionResult | null => {
    if (!settings.enabled) return null;

    const runs = pitcherStats.runsAllowed;
    if (runs < 6) return null;

    const eventType: FameEventType = runs >= 10 ? 'MELTDOWN_SEVERE' : 'MELTDOWN';

    // Only detect once per threshold
    const key = createEventKey(eventType, pitcherStats.playerId, 0);
    if (isAlreadyDetected(key)) return null;
    markDetected(key);

    const event = createFameEvent(
      context.gameId,
      context.inning,
      context.halfInning,
      eventType,
      pitcherStats.playerId,
      pitcherStats.playerName,
      pitcherStats.teamId,
      true,
      `Gave up ${runs} runs - Meltdown!`,
      undefined,
      undefined,
      context.leverageIndex,
      context.pitcherMojo,
      context.pitcherFitness
    );

    return {
      event,
      message: `${pitcherStats.playerName} has given up ${runs} runs - Meltdown!`
    };
  }, [settings.enabled]);

  // ============================================
  // NO-HITTER / PERFECT GAME DETECTION
  // ============================================
  const detectNoHitter = useCallback((
    context: GameContext,
    pitcherStats: PlayerStats
  ): DetectionResult | null => {
    if (!settings.enabled) return null;
    if (!context.isGameOver) return null;
    if (!pitcherStats.isStarter) return null;

    // Must have pitched complete game (9+ innings of outs)
    const minOuts = context.scheduledInnings * 3;
    if (pitcherStats.outs < minOuts) return null;

    // Check for no hits
    if (pitcherStats.hitsAllowed > 0) return null;

    // Perfect game check: No walks, no HBP, and no baserunners via error
    const isPerfect = pitcherStats.walksAllowed === 0 &&
                      pitcherStats.hitBatters === 0 &&
                      pitcherStats.basesReachedViaError === 0;

    const eventType: FameEventType = isPerfect ? 'PERFECT_GAME' : 'NO_HITTER';

    const key = createEventKey(eventType, pitcherStats.playerId, 0);
    if (isAlreadyDetected(key)) return null;
    markDetected(key);

    const event = createFameEvent(
      context.gameId,
      context.inning,
      context.halfInning,
      eventType,
      pitcherStats.playerId,
      pitcherStats.playerName,
      pitcherStats.teamId,
      true,
      isPerfect ? 'PERFECT GAME!' : 'NO-HITTER!',
      undefined,
      undefined,
      context.leverageIndex,
      context.pitcherMojo,
      context.pitcherFitness
    );

    return {
      event,
      message: isPerfect
        ? `${pitcherStats.playerName} has thrown a PERFECT GAME!`
        : `${pitcherStats.playerName} has thrown a NO-HITTER!`
    };
  }, [settings.enabled]);

  // ============================================
  // B2B2B HR ALLOWED DETECTION
  // ============================================
  const detectConsecutiveHRAllowed = useCallback((
    context: GameContext,
    pitcherStats: PlayerStats
  ): DetectionResult | null => {
    if (!settings.enabled) return null;

    if (pitcherStats.consecutiveHRsAllowed < 3) return null;

    const key = createEventKey('B2B2B_HR_ALLOWED', pitcherStats.playerId, context.inning);
    if (isAlreadyDetected(key)) return null;
    markDetected(key);

    const event = createFameEvent(
      context.gameId,
      context.inning,
      context.halfInning,
      'B2B2B_HR_ALLOWED',
      pitcherStats.playerId,
      pitcherStats.playerName,
      pitcherStats.teamId,
      true,
      'Gave up back-to-back-to-back home runs!',
      undefined,
      undefined,
      context.leverageIndex,
      context.pitcherMojo,
      context.pitcherFitness
    );

    return {
      event,
      message: `${pitcherStats.playerName} gives up back-to-back-to-back HRs!`
    };
  }, [settings.enabled]);

  // ============================================
  // BATTER OUT STRETCHING DETECTION
  // (Called from AtBatFlow when batter is out at 3B on a double)
  // ============================================
  const detectBatterOutStretching = useCallback((
    context: GameContext,
    batterId: string,
    batterName: string,
    teamId: string,
    hitType: '1B' | '2B' | '3B',
    outAtBase: '2B' | '3B' | 'HOME'
  ): DetectionResult | null => {
    if (!settings.enabled) return null;

    // Only detect "out stretching" for extra-base attempts
    // e.g., double but out at 3B, single but out at 2B
    if (hitType === '2B' && outAtBase === '3B') {
      const key = createEventKey('BATTER_OUT_STRETCHING', batterId, context.inning);
      if (isAlreadyDetected(key)) return null;
      markDetected(key);

      const event = createFameEvent(
        context.gameId,
        context.inning,
        context.halfInning,
        'BATTER_OUT_STRETCHING',
        batterId,
        batterName,
        teamId,
        true,
        'Thrown out stretching at 3B',
        undefined,
        undefined,
        context.leverageIndex,
        context.batterMojo,
        context.batterFitness
      );

      return {
        event,
        message: `${batterName} thrown out stretching to third!`
      };
    }

    return null;
  }, [settings.enabled]);

  // ============================================
  // GRAND SLAM DETECTION
  // ============================================
  const detectGrandSlam = useCallback((
    context: GameContext,
    batterId: string,
    batterName: string,
    teamId: string,
    result: AtBatResult,
    rbi: number,
    basesLoaded: boolean
  ): DetectionResult | null => {
    if (!settings.enabled) return null;
    if (result !== 'HR' || !basesLoaded || rbi < 4) return null;

    const key = createEventKey('GRAND_SLAM', batterId, context.inning);
    if (isAlreadyDetected(key)) return null;
    markDetected(key);

    const event = createFameEvent(
      context.gameId,
      context.inning,
      context.halfInning,
      'GRAND_SLAM',
      batterId,
      batterName,
      teamId,
      true,
      'Grand Slam!',
      undefined,
      undefined,
      context.leverageIndex,
      context.batterMojo,
      context.batterFitness
    );

    return {
      event,
      message: `💣 GRAND SLAM! ${batterName} clears the bases!`
    };
  }, [settings.enabled]);

  // ============================================
  // LEADOFF HR DETECTION
  // ============================================
  const detectLeadoffHR = useCallback((
    context: GameContext,
    batterId: string,
    batterName: string,
    teamId: string,
    result: AtBatResult
  ): DetectionResult | null => {
    if (!settings.enabled) return null;
    if (result !== 'HR' || !context.isFirstAtBatOfGame) return null;

    const key = createEventKey('LEADOFF_HR', batterId, 1);
    if (isAlreadyDetected(key)) return null;
    markDetected(key);

    const event = createFameEvent(
      context.gameId,
      context.inning,
      context.halfInning,
      'LEADOFF_HR',
      batterId,
      batterName,
      teamId,
      true,
      'Leadoff home run!',
      undefined,
      undefined,
      context.leverageIndex,
      context.batterMojo,
      context.batterFitness
    );

    return {
      event,
      message: `🚀 LEADOFF HOME RUN! ${batterName} starts it off with a bang!`
    };
  }, [settings.enabled]);

  // ============================================
  // PINCH HIT HR DETECTION
  // ============================================
  const detectPinchHitHR = useCallback((
    context: GameContext,
    batterStats: PlayerStats,
    result: AtBatResult
  ): DetectionResult | null => {
    if (!settings.enabled) return null;
    if (result !== 'HR' || !batterStats.isPinchHitter) return null;

    const key = createEventKey('PINCH_HIT_HR', batterStats.playerId, context.inning);
    if (isAlreadyDetected(key)) return null;
    markDetected(key);

    const event = createFameEvent(
      context.gameId,
      context.inning,
      context.halfInning,
      'PINCH_HIT_HR',
      batterStats.playerId,
      batterStats.playerName,
      batterStats.teamId,
      true,
      'Pinch hit home run!',
      undefined,
      undefined,
      context.leverageIndex,
      context.batterMojo,
      context.batterFitness
    );

    return {
      event,
      message: `🎯 Pinch hit HOME RUN! ${batterStats.playerName} delivers off the bench!`
    };
  }, [settings.enabled]);

  // ============================================
  // GO-AHEAD HR DETECTION
  // ============================================
  const detectGoAheadHR = useCallback((
    context: GameContext,
    batterId: string,
    batterName: string,
    teamId: string,
    result: AtBatResult
  ): DetectionResult | null => {
    if (!settings.enabled) return null;
    if (result !== 'HR') return null;

    // Check if team was tied or behind before this HR
    const wasTiedOrBehind = context.previousLeadTeam === 'tie' ||
      (teamId === 'away' && context.previousLeadTeam === 'home') ||
      (teamId === 'home' && context.previousLeadTeam === 'away');

    if (!wasTiedOrBehind) return null;

    const key = createEventKey('GO_AHEAD_HR', batterId, context.inning);
    if (isAlreadyDetected(key)) return null;
    markDetected(key);

    const event = createFameEvent(
      context.gameId,
      context.inning,
      context.halfInning,
      'GO_AHEAD_HR',
      batterId,
      batterName,
      teamId,
      true,
      'Go-ahead home run!',
      undefined,
      undefined,
      context.leverageIndex,
      context.batterMojo,
      context.batterFitness
    );

    return {
      event,
      message: `⚡ GO-AHEAD HOME RUN! ${batterName} puts the team in front!`
    };
  }, [settings.enabled]);

  // ============================================
  // FIVE HIT GAME DETECTION
  // ============================================
  const detectFiveHitGame = useCallback((
    context: GameContext,
    batterStats: PlayerStats
  ): DetectionResult | null => {
    if (!settings.enabled) return null;
    if (batterStats.totalHits < 5) return null;

    const key = createEventKey('FIVE_HIT_GAME', batterStats.playerId, 0);
    if (isAlreadyDetected(key)) return null;
    markDetected(key);

    const event = createFameEvent(
      context.gameId,
      context.inning,
      context.halfInning,
      'FIVE_HIT_GAME',
      batterStats.playerId,
      batterStats.playerName,
      batterStats.teamId,
      true,
      `${batterStats.totalHits}-hit game!`,
      undefined,
      undefined,
      context.leverageIndex,
      context.batterMojo,
      context.batterFitness
    );

    return {
      event,
      message: `🔥 ${batterStats.playerName} has ${batterStats.totalHits} HITS tonight!`
    };
  }, [settings.enabled]);

  // ============================================
  // MULTI-HIT GAME DETECTION (3, 4, 6 hits)
  // 5 hits is handled by detectFiveHitGame above
  // ============================================
  const detectMultiHitGame = useCallback((
    context: GameContext,
    batterStats: PlayerStats
  ): DetectionResult | null => {
    if (!settings.enabled) return null;
    const hits = batterStats.totalHits;

    // Skip if not at a threshold we care about
    if (hits < 3 || hits === 5) return null;  // 5 handled separately

    let eventType: FameEventType;
    if (hits >= 6) eventType = 'SIX_HIT_GAME';
    else if (hits === 4) eventType = 'FOUR_HIT_GAME';
    else if (hits === 3) eventType = 'THREE_HIT_GAME';
    else return null;

    const key = createEventKey(eventType, batterStats.playerId, 0);
    if (isAlreadyDetected(key)) return null;
    markDetected(key);

    const event = createFameEvent(
      context.gameId,
      context.inning,
      context.halfInning,
      eventType,
      batterStats.playerId,
      batterStats.playerName,
      batterStats.teamId,
      true,
      `${hits}-hit game!`,
      undefined,
      undefined,
      context.leverageIndex,
      context.batterMojo,
      context.batterFitness
    );

    return {
      event,
      message: hits >= 6
        ? `🔥🔥 ${batterStats.playerName} has ${hits} HITS - INCREDIBLE!`
        : `⚾ ${batterStats.playerName} has ${hits} hits tonight!`
    };
  }, [settings.enabled]);

  // ============================================
  // MULTI-RBI GAME DETECTION (5, 8, 10 RBI)
  // ============================================
  const detectMultiRBIGame = useCallback((
    context: GameContext,
    batterStats: PlayerStats
  ): DetectionResult | null => {
    if (!settings.enabled) return null;
    const rbi = batterStats.totalRBI;

    if (rbi < 5) return null;

    let eventType: FameEventType;
    if (rbi >= 10) eventType = 'TEN_RBI_GAME';
    else if (rbi >= 8) eventType = 'EIGHT_RBI_GAME';
    else eventType = 'FIVE_RBI_GAME';

    const key = createEventKey(eventType, batterStats.playerId, 0);
    if (isAlreadyDetected(key)) return null;
    markDetected(key);

    const event = createFameEvent(
      context.gameId,
      context.inning,
      context.halfInning,
      eventType,
      batterStats.playerId,
      batterStats.playerName,
      batterStats.teamId,
      true,
      `${rbi}-RBI game!`,
      undefined,
      undefined,
      context.leverageIndex,
      context.batterMojo,
      context.batterFitness
    );

    return {
      event,
      message: rbi >= 10
        ? `🏆 HISTORIC! ${batterStats.playerName} has ${rbi} RBI tonight!`
        : rbi >= 8
        ? `💪 ${batterStats.playerName} has ${rbi} RBI - DOMINANT!`
        : `💥 ${batterStats.playerName} has ${rbi} RBI!`
    };
  }, [settings.enabled]);

  // ============================================
  // TITANIUM SOMBRERO DETECTION (6K)
  // Extension of sombrero detection for extra innings
  // ============================================
  const detectTitaniumSombrero = useCallback((
    context: GameContext,
    batterStats: PlayerStats
  ): DetectionResult | null => {
    if (!settings.enabled) return null;
    if (batterStats.strikeouts < 6) return null;

    const key = createEventKey('TITANIUM_SOMBRERO', batterStats.playerId, 0);
    if (isAlreadyDetected(key)) return null;
    markDetected(key);

    const event = createFameEvent(
      context.gameId,
      context.inning,
      context.halfInning,
      'TITANIUM_SOMBRERO',
      batterStats.playerId,
      batterStats.playerName,
      batterStats.teamId,
      true,
      `6 strikeouts - TITANIUM Sombrero!`,
      undefined,
      undefined,
      context.leverageIndex,
      context.batterMojo,
      context.batterFitness
    );

    return {
      event,
      message: `💀💀 TITANIUM SOMBRERO! ${batterStats.playerName} strikes out for the 6th time!`
    };
  }, [settings.enabled]);

  // ============================================
  // COMPLETE GAME / SHUTOUT DETECTION
  // ============================================
  const detectCompleteGameShutout = useCallback((
    context: GameContext,
    pitcherStats: PlayerStats
  ): DetectionResult | null => {
    if (!settings.enabled) return null;
    if (!context.isGameOver) return null;
    if (!pitcherStats.isStarter) return null;

    // Must have pitched complete game (9+ innings of outs)
    const minOuts = context.scheduledInnings * 3;
    if (pitcherStats.outs < minOuts) return null;

    // Check for shutout (no runs allowed)
    const isShutout = pitcherStats.runsAllowed === 0;
    const eventType: FameEventType = isShutout ? 'SHUTOUT' : 'COMPLETE_GAME';

    const key = createEventKey(eventType, pitcherStats.playerId, 0);
    if (isAlreadyDetected(key)) return null;
    markDetected(key);

    const event = createFameEvent(
      context.gameId,
      context.inning,
      context.halfInning,
      eventType,
      pitcherStats.playerId,
      pitcherStats.playerName,
      pitcherStats.teamId,
      true,
      isShutout ? 'Complete Game Shutout!' : 'Complete Game!',
      undefined,
      undefined,
      context.leverageIndex,
      context.pitcherMojo,
      context.pitcherFitness
    );

    return {
      event,
      message: isShutout
        ? `⭐ SHUTOUT! ${pitcherStats.playerName} throws a complete game shutout!`
        : `💪 Complete Game! ${pitcherStats.playerName} goes the distance!`
    };
  }, [settings.enabled]);

  // ============================================
  // MADDUX DETECTION (CGSO with < pitch threshold)
  // A Maddux is a CGSO on fewer than a certain pitch count
  // Default threshold: 100 pitches (or scaled for shorter seasons)
  // ============================================
  const detectMaddux = useCallback((
    context: GameContext,
    pitcherStats: PlayerStats
  ): DetectionResult | null => {
    if (!settings.enabled) return null;
    if (!context.isGameOver) return null;
    if (!pitcherStats.isStarter) return null;

    // Must have pitched complete game
    const minOuts = context.scheduledInnings * 3;
    if (pitcherStats.outs < minOuts) return null;

    // Must be a shutout
    if (pitcherStats.runsAllowed > 0) return null;

    // Must be under scaled Maddux threshold (IDs 6 & 20: Math.floor(innings × 9.44))
    const inningsForThreshold = context.inningsPerGame ?? context.scheduledInnings ?? DEFAULT_INNINGS_PER_GAME;
    const madduxThreshold = calculateMadduxThreshold(inningsForThreshold);
    if (pitcherStats.pitchCount >= madduxThreshold) return null;

    const key = createEventKey('MADDUX', pitcherStats.playerId, 0);
    if (isAlreadyDetected(key)) return null;
    markDetected(key);

    const event = createFameEvent(
      context.gameId,
      context.inning,
      context.halfInning,
      'MADDUX',
      pitcherStats.playerId,
      pitcherStats.playerName,
      pitcherStats.teamId,
      true,
      `Maddux! CGSO on ${pitcherStats.pitchCount} pitches!`,
      undefined,
      undefined,
      context.leverageIndex,
      context.pitcherMojo,
      context.pitcherFitness
    );

    return {
      event,
      message: `🎯 MADDUX! ${pitcherStats.playerName} throws a CGSO on just ${pitcherStats.pitchCount} pitches!`
    };
  }, [settings.enabled]);

  // ============================================
  // IMMACULATE INNING DETECTION (3K on exactly 9 pitches)
  // ============================================
  const detectImmaculateInning = useCallback((
    context: GameContext,
    pitcherStats: PlayerStats
  ): DetectionResult | null => {
    if (!settings.enabled) return null;
    if (!context.currentInningPitches) return null;
    if (context.outs !== 3) return null;  // Only check at end of half-inning

    const { pitches, strikeouts, pitcherId } = context.currentInningPitches;

    // Immaculate Inning: exactly 9 pitches, 3 strikeouts
    if (pitches !== 9 || strikeouts !== 3) return null;
    if (pitcherId !== pitcherStats.playerId) return null;

    const key = createEventKey('IMMACULATE_INNING', pitcherStats.playerId, context.inning);
    if (isAlreadyDetected(key)) return null;
    markDetected(key);

    const event = createFameEvent(
      context.gameId,
      context.inning,
      context.halfInning,
      'IMMACULATE_INNING',
      pitcherStats.playerId,
      pitcherStats.playerName,
      pitcherStats.teamId,
      true,
      'Immaculate Inning! 9 pitches, 3 strikeouts!',
      undefined,
      undefined,
      context.leverageIndex,
      context.pitcherMojo,
      context.pitcherFitness
    );

    return {
      event,
      message: `⚡⚡⚡ IMMACULATE INNING! ${pitcherStats.playerName} - 9 pitches, 3 strikeouts!`
    };
  }, [settings.enabled]);

  // ============================================
  // BACK-TO-BACK-TO-BACK HR DETECTION (for batters)
  // Team event when 3 consecutive batters hit HRs
  // ============================================
  const detectBackToBackToBackHR = useCallback((
    context: GameContext,
    batterId: string,
    batterName: string,
    teamId: string,
    result: AtBatResult
  ): DetectionResult | null => {
    if (!settings.enabled) return null;
    if (result !== 'HR') return null;
    if (context.consecutiveHRCount < 3) return null;

    const key = createEventKey('BACK_TO_BACK_TO_BACK_HR', teamId, context.inning);
    if (isAlreadyDetected(key)) return null;
    markDetected(key);

    const event = createFameEvent(
      context.gameId,
      context.inning,
      context.halfInning,
      'BACK_TO_BACK_TO_BACK_HR',
      batterId,
      batterName,
      teamId,
      true,
      'Back-to-back-to-back home runs!',
      undefined,
      undefined,
      context.leverageIndex,
      context.batterMojo,
      context.batterFitness
    );

    return {
      event,
      message: `💣💣💣 BACK-TO-BACK-TO-BACK HOME RUNS! ${batterName} makes it THREE in a row!`
    };
  }, [settings.enabled]);

  // ============================================
  // STRIKEOUT SIDE DETECTION (Pitching)
  // ============================================
  const detectStrikeOutSide = useCallback((
    context: GameContext,
    pitcherStats: PlayerStats,
    inningStrikeouts: number
  ): DetectionResult | null => {
    if (!settings.enabled) return null;
    if (inningStrikeouts < 3 || context.outs !== 3) return null;

    const key = createEventKey('STRIKE_OUT_SIDE', pitcherStats.playerId, context.inning);
    if (isAlreadyDetected(key)) return null;
    markDetected(key);

    const event = createFameEvent(
      context.gameId,
      context.inning,
      context.halfInning,
      'STRIKE_OUT_SIDE',
      pitcherStats.playerId,
      pitcherStats.playerName,
      pitcherStats.teamId,
      true,
      'Struck out the side!',
      undefined,
      undefined,
      context.leverageIndex,
      context.pitcherMojo,
      context.pitcherFitness
    );

    return {
      event,
      message: `🔥 ${pitcherStats.playerName} STRIKES OUT THE SIDE!`
    };
  }, [settings.enabled]);

  // ============================================
  // HIGH K GAME DETECTION (10K, 15K)
  // ============================================
  const detectHighKGame = useCallback((
    context: GameContext,
    pitcherStats: PlayerStats
  ): DetectionResult | null => {
    if (!settings.enabled) return null;

    const k = pitcherStats.strikeoutsThrown;
    if (k < 10) return null;

    const eventType: FameEventType = k >= 15 ? 'FIFTEEN_K_GAME' : 'TEN_K_GAME';
    const key = createEventKey(eventType, pitcherStats.playerId, 0);
    if (isAlreadyDetected(key)) return null;
    markDetected(key);

    const event = createFameEvent(
      context.gameId,
      context.inning,
      context.halfInning,
      eventType,
      pitcherStats.playerId,
      pitcherStats.playerName,
      pitcherStats.teamId,
      true,
      `${k} strikeout game!`,
      undefined,
      undefined,
      context.leverageIndex,
      context.pitcherMojo,
      context.pitcherFitness
    );

    return {
      event,
      message: k >= 15
        ? `🌟 DOMINANT! ${pitcherStats.playerName} has ${k} STRIKEOUTS!`
        : `⚡ ${pitcherStats.playerName} has ${k} strikeouts!`
    };
  }, [settings.enabled]);

  // ============================================
  // HAT TRICK (3K) DETECTION
  // ============================================
  const detectHatTrick = useCallback((
    context: GameContext,
    batterStats: PlayerStats
  ): DetectionResult | null => {
    if (!settings.enabled) return null;
    // Only detect exactly 3K - 4+ is Golden Sombrero
    if (batterStats.strikeouts !== 3) return null;

    const key = createEventKey('HAT_TRICK', batterStats.playerId, 0);
    if (isAlreadyDetected(key)) return null;
    markDetected(key);

    const event = createFameEvent(
      context.gameId,
      context.inning,
      context.halfInning,
      'HAT_TRICK',
      batterStats.playerId,
      batterStats.playerName,
      batterStats.teamId,
      true,
      'Hat Trick (3 strikeouts)',
      undefined,
      undefined,
      context.leverageIndex,
      context.batterMojo,
      context.batterFitness
    );

    return {
      event,
      message: `🎩 Hat Trick... ${batterStats.playerName} strikes out for the 3rd time.`
    };
  }, [settings.enabled]);

  // ============================================
  // LOB KING DETECTION (5+ runners stranded)
  // ============================================
  const detectLOBKing = useCallback((
    context: GameContext,
    batterStats: PlayerStats
  ): DetectionResult | null => {
    if (!settings.enabled) return null;
    if (batterStats.runnersLeftOnBase < 5) return null;

    const key = createEventKey('LOB_KING', batterStats.playerId, 0);
    if (isAlreadyDetected(key)) return null;
    markDetected(key);

    const event = createFameEvent(
      context.gameId,
      context.inning,
      context.halfInning,
      'LOB_KING',
      batterStats.playerId,
      batterStats.playerName,
      batterStats.teamId,
      true,
      `Left ${batterStats.runnersLeftOnBase} runners on base`,
      undefined,
      undefined,
      context.leverageIndex,
      context.batterMojo,
      context.batterFitness
    );

    return {
      event,
      message: `😬 LOB King: ${batterStats.playerName} has stranded ${batterStats.runnersLeftOnBase} runners tonight.`
    };
  }, [settings.enabled]);

  // ============================================
  // MULTIPLE GIDP DETECTION
  // ============================================
  const detectMultipleGIDP = useCallback((
    context: GameContext,
    batterStats: PlayerStats
  ): DetectionResult | null => {
    if (!settings.enabled) return null;
    if (batterStats.gidp < 2) return null;

    const key = createEventKey('MULTIPLE_GIDP', batterStats.playerId, 0);
    if (isAlreadyDetected(key)) return null;
    markDetected(key);

    const event = createFameEvent(
      context.gameId,
      context.inning,
      context.halfInning,
      'MULTIPLE_GIDP',
      batterStats.playerId,
      batterStats.playerName,
      batterStats.teamId,
      true,
      `${batterStats.gidp} double plays hit into`,
      undefined,
      undefined,
      context.leverageIndex,
      context.batterMojo,
      context.batterFitness
    );

    return {
      event,
      message: `💀 ${batterStats.playerName} has hit into ${batterStats.gidp} double plays tonight.`
    };
  }, [settings.enabled]);

  // ============================================
  // FIRST INNING DISASTER (5+ runs in 1st)
  // ============================================
  const detectFirstInningDisaster = useCallback((
    context: GameContext,
    pitcherStats: PlayerStats
  ): DetectionResult | null => {
    if (!settings.enabled) return null;
    if (context.inning !== 1 || pitcherStats.firstInningRuns < 5) return null;

    const key = createEventKey('FIRST_INNING_DISASTER', pitcherStats.playerId, 1);
    if (isAlreadyDetected(key)) return null;
    markDetected(key);

    const event = createFameEvent(
      context.gameId,
      context.inning,
      context.halfInning,
      'FIRST_INNING_DISASTER',
      pitcherStats.playerId,
      pitcherStats.playerName,
      pitcherStats.teamId,
      true,
      `Gave up ${pitcherStats.firstInningRuns} runs in the 1st`,
      undefined,
      undefined,
      context.leverageIndex,
      context.pitcherMojo,
      context.pitcherFitness
    );

    return {
      event,
      message: `💥 First Inning DISASTER! ${pitcherStats.playerName} gives up ${pitcherStats.firstInningRuns} runs!`
    };
  }, [settings.enabled]);

  // ============================================
  // COMEBACK WIN DETECTION (Team-level)
  // ============================================
  const detectComebackWin = useCallback((
    context: GameContext,
    winningTeamId: string,
    teamName: string
  ): DetectionResult | null => {
    if (!settings.enabled) return null;
    if (!context.isGameOver) return null;

    const deficit = context.maxDeficitOvercome;
    if (deficit < 3) return null;

    let eventType: FameEventType;
    if (deficit >= 7) eventType = 'COMEBACK_WIN_7';
    else if (deficit >= 5) eventType = 'COMEBACK_WIN_5';
    else eventType = 'COMEBACK_WIN_3';

    const key = createEventKey(eventType, winningTeamId, 0);
    if (isAlreadyDetected(key)) return null;
    markDetected(key);

    const event = createFameEvent(
      context.gameId,
      context.inning,
      context.halfInning,
      eventType,
      winningTeamId,
      teamName,
      winningTeamId,
      true,
      `Comeback victory from ${deficit}-run deficit!`,
      undefined,
      undefined,
      context.leverageIndex
    );

    return {
      event,
      message: deficit >= 7
        ? `🏆 EPIC COMEBACK! ${teamName} overcomes ${deficit}-run deficit!`
        : `🔥 Comeback Victory! ${teamName} was down ${deficit} runs!`
    };
  }, [settings.enabled]);

  // ============================================
  // SPECIAL PLAY DETECTION (WEB GEM / ROBBERY)
  // ============================================
  const detectSpecialPlay = useCallback((
    context: GameContext,
    playerId: string,
    playerName: string,
    teamId: string,
    specialPlay: SpecialPlayType | null
  ): DetectionResult | null => {
    if (!settings.enabled || !specialPlay) return null;

    const specialPlayFameMap: Record<SpecialPlayType, FameEventType | null> = {
      Routine: null,
      Diving: 'WEB_GEM',
      'Wall Catch': 'WEB_GEM',
      Running: 'WEB_GEM',
      Leaping: 'WEB_GEM',
      Clean: null,
      'Robbery Attempt': 'ROBBERY',
      'Over Fence': null,
      'Wall Scraper': null,
    };

    const eventType = specialPlayFameMap[specialPlay];
    if (!eventType) return null;

    const key = createEventKey(eventType, playerId, context.inning);
    if (isAlreadyDetected(key)) return null;
    markDetected(key);

    const description =
      eventType === 'ROBBERY'
        ? `${playerName} went for the wall robbery`
        : `${playerName} made a ${specialPlay.toLowerCase()} catch`;

    const event = createFameEvent(
      context.gameId,
      context.inning,
      context.halfInning,
      eventType,
      playerId,
      playerName,
      teamId,
      true,
      description,
      undefined,
      undefined,
      context.leverageIndex,
      context.batterMojo,
      context.batterFitness
    );

    return {
      event,
      message: description
    };
  }, [settings.enabled]);

  // ============================================
  // MAIN DETECTION FUNCTION
  // Call this after each at-bat to check for auto-detected events
  // ============================================
  const checkForFameEvents = useCallback((
    context: GameContext,
    batterStats: PlayerStats,
    pitcherStats: PlayerStats,
    result: AtBatResult,
    rbi: number,
    basesLoaded: boolean = false,
    inningStrikeouts: number = 0
  ): DetectionResult[] => {
    if (!settings.enabled) return [];

    const detectedResults: DetectionResult[] = [];

    // ========== WALK-OFF EVENTS ==========
    const walkOff = detectWalkOff(
      context,
      batterStats.playerId,
      batterStats.playerName,
      batterStats.teamId,
      result,
      rbi,
      basesLoaded
    );
    if (walkOff) detectedResults.push(walkOff);

    // ========== HOME RUN EVENTS ==========
    if (result === 'HR') {
      // Grand Slam (only if not already walk-off grand slam)
      if (!walkOff || walkOff.event.eventType !== 'WALK_OFF_GRAND_SLAM') {
        const grandSlam = detectGrandSlam(
          context, batterStats.playerId, batterStats.playerName,
          batterStats.teamId, result, rbi, basesLoaded
        );
        if (grandSlam) detectedResults.push(grandSlam);
      }

      // Leadoff HR
      const leadoffHR = detectLeadoffHR(
        context, batterStats.playerId, batterStats.playerName,
        batterStats.teamId, result
      );
      if (leadoffHR) detectedResults.push(leadoffHR);

      // Back-to-back HR (previous batter also hit HR)
      if (context.lastHRBatterId && context.lastHRBatterId !== batterStats.playerId) {
        const b2bHR = detectBackToBackHR(
          context, batterStats.playerId, batterStats.playerName,
          batterStats.teamId, result, context.lastHRBatterId
        );
        if (b2bHR) detectedResults.push(b2bHR);
      }

      // Pinch Hit HR
      const pinchHitHR = detectPinchHitHR(context, batterStats, result);
      if (pinchHitHR) detectedResults.push(pinchHitHR);

      // Go-Ahead HR
      const goAheadHR = detectGoAheadHR(
        context, batterStats.playerId, batterStats.playerName,
        batterStats.teamId, result
      );
      if (goAheadHR) detectedResults.push(goAheadHR);
    }

    // ========== MULTI-HIT EVENTS ==========
    // Check cycle
    const cycle = detectCycle(context, batterStats);
    if (cycle) detectedResults.push(cycle);

    // Check multi-HR
    const multiHR = detectMultiHR(context, batterStats);
    if (multiHR) detectedResults.push(multiHR);

    // Check 5-hit game
    const fiveHitGame = detectFiveHitGame(context, batterStats);
    if (fiveHitGame) detectedResults.push(fiveHitGame);

    // Check 3, 4, 6 hit games (5 handled above)
    const multiHitGame = detectMultiHitGame(context, batterStats);
    if (multiHitGame) detectedResults.push(multiHitGame);

    // Check multi-RBI games (5, 8, 10 RBI)
    const multiRBIGame = detectMultiRBIGame(context, batterStats);
    if (multiRBIGame) detectedResults.push(multiRBIGame);

    // ========== BATTER SHAME EVENTS ==========
    // Check hat trick (3 K) - only if exactly 3
    const hatTrick = detectHatTrick(context, batterStats);
    if (hatTrick) detectedResults.push(hatTrick);

    // Check sombrero (4+ K) - Note: Titanium Sombrero (6K) handled at end of game
    const sombrero = detectSombrero(context, batterStats);
    if (sombrero) detectedResults.push(sombrero);

    // Check Titanium Sombrero (6K) - typically in extra inning games
    const titaniumSombrero = detectTitaniumSombrero(context, batterStats);
    if (titaniumSombrero) detectedResults.push(titaniumSombrero);

    // Check LOB King
    const lobKing = detectLOBKing(context, batterStats);
    if (lobKing) detectedResults.push(lobKing);

    // Check multiple GIDP
    const multiGidp = detectMultipleGIDP(context, batterStats);
    if (multiGidp) detectedResults.push(multiGidp);

    // ========== PITCHER EVENTS ==========
    // Check meltdown
    const meltdown = detectMeltdown(context, pitcherStats);
    if (meltdown) detectedResults.push(meltdown);

    // Check consecutive HR allowed
    const b2b2b = detectConsecutiveHRAllowed(context, pitcherStats);
    if (b2b2b) detectedResults.push(b2b2b);

    // Check first inning disaster
    const firstInningDisaster = detectFirstInningDisaster(context, pitcherStats);
    if (firstInningDisaster) detectedResults.push(firstInningDisaster);

    // Check strikeout the side (at end of half inning)
    if (context.outs === 3 && inningStrikeouts >= 3) {
      const strikeOutSide = detectStrikeOutSide(context, pitcherStats, inningStrikeouts);
      if (strikeOutSide) detectedResults.push(strikeOutSide);

      // Check Immaculate Inning (3K on exactly 9 pitches)
      const immaculateInning = detectImmaculateInning(context, pitcherStats);
      if (immaculateInning) detectedResults.push(immaculateInning);
    }

    // Check high K game
    const highKGame = detectHighKGame(context, pitcherStats);
    if (highKGame) detectedResults.push(highKGame);

    // ========== MULTI-HR BATTING TEAM EVENTS ==========
    // Check back-to-back-to-back HR (team event)
    if (result === 'HR' && context.consecutiveHRCount >= 3) {
      const b2b2bHR = detectBackToBackToBackHR(
        context, batterStats.playerId, batterStats.playerName,
        batterStats.teamId, result
      );
      if (b2b2bHR) detectedResults.push(b2b2bHR);
    }

    // Notify for each detected event
    if (settings.showToasts && onFameDetected) {
      detectedResults.forEach(r => onFameDetected(r));
    }

    return detectedResults;
  }, [
    settings.enabled,
    settings.showToasts,
    onFameDetected,
    detectWalkOff,
    detectGrandSlam,
    detectLeadoffHR,
    detectBackToBackHR,
    detectPinchHitHR,
    detectGoAheadHR,
    detectCycle,
    detectMultiHR,
    detectFiveHitGame,
    detectMultiHitGame,
    detectMultiRBIGame,
    detectHatTrick,
    detectSombrero,
    detectTitaniumSombrero,
    detectLOBKing,
    detectMultipleGIDP,
    detectMeltdown,
    detectConsecutiveHRAllowed,
    detectFirstInningDisaster,
    detectStrikeOutSide,
    detectHighKGame,
    detectImmaculateInning,
    detectBackToBackToBackHR
  ]);

  // ============================================
  // END OF GAME DETECTION
  // Call this when game ends to check for game-level achievements
  // ============================================
  const checkEndGameFame = useCallback((
    context: GameContext,
    allPitchers: PlayerStats[]
  ): DetectionResult[] => {
    if (!settings.enabled) return [];

    const detectedResults: DetectionResult[] = [];

    // Check pitching achievements for each pitcher
    for (const pitcher of allPitchers) {
      // Check for no-hitter/perfect game (most prestigious)
      const noHitter = detectNoHitter(context, pitcher);
      if (noHitter) {
        detectedResults.push(noHitter);
        // If perfect game, don't also credit Maddux/CGSO separately
        if (noHitter.event.eventType === 'PERFECT_GAME') continue;
      }

      // Check for Maddux (CGSO under pitch threshold) - only if not no-hitter
      if (!noHitter) {
        const maddux = detectMaddux(context, pitcher);
        if (maddux) {
          detectedResults.push(maddux);
          continue; // Maddux implies CGSO, don't double credit
        }
      }

      // Check for Complete Game / Shutout (if not already detected above)
      if (!noHitter) {
        const cgso = detectCompleteGameShutout(context, pitcher);
        if (cgso) detectedResults.push(cgso);
      }
    }

    // Notify for each detected event
    if (settings.showToasts && onFameDetected) {
      detectedResults.forEach(result => onFameDetected(result));
    }

    return detectedResults;
  }, [settings.enabled, settings.showToasts, onFameDetected, detectNoHitter, detectMaddux, detectCompleteGameShutout]);

  return {
    // Main detection functions
    checkForFameEvents,
    checkEndGameFame,
    resetDetection,
    // Individual detectors (for manual triggering)
    detectWalkOff,
    detectGrandSlam,
    detectLeadoffHR,
    detectPinchHitHR,
    detectGoAheadHR,
    detectCycle,
    detectMultiHR,
    detectFiveHitGame,
    detectMultiHitGame,
    detectMultiRBIGame,
    detectBackToBackHR,
    detectBackToBackToBackHR,
    detectHatTrick,
    detectSombrero,
    detectTitaniumSombrero,
    detectLOBKing,
    detectMultipleGIDP,
    detectMeltdown,
    detectFirstInningDisaster,
    detectStrikeOutSide,
    detectHighKGame,
    detectImmaculateInning,
    detectNoHitter,
    detectCompleteGameShutout,
    detectMaddux,
    detectConsecutiveHRAllowed,
    detectBatterOutStretching,
    detectSpecialPlay,
    detectComebackWin
  };
}

export default useFameDetection;
