/**
 * Detection Functions Integration
 *
 * Per FIGMA_IMPLEMENTATION_PLAN.md Phase 3
 *
 * This module re-exports detection functions from the legacy codebase
 * with any needed adaptations for the Figma GameTracker.
 *
 * Detection functions are categorized by type:
 * 1. PROMPT DETECTION - Suggest events for user confirmation
 * 2. AUTO DETECTION - Automatically detect events from play data
 * 3. MANUAL TRIGGERS - User-initiated special events
 */

// ============================================
// RE-EXPORT LEGACY DETECTION FUNCTIONS
// ============================================

// Import all detection functions from legacy
export {
  // Prompt detection (user confirms)
  promptWebGem,
  promptRobbery,
  promptTOOTBLAN,
  promptNutShot,
  promptKilledPitcher,
  promptInsideParkHR,

  // Auto-detection
  detectBlownSave,
  isSaveOpportunity,
  detectTriplePlay,
  detectHitIntoTriplePlay,
  detectEscapeArtist,
  detectPositionPlayerPitching,
  detectDroppedFly,
  detectBootedGrounder,
  detectWrongBaseThrow,
  detectPassedBallRun,
  detectThrowOutAtHome,
  detectPickedOff,
  detectWalkedInRun,
  detectClutchGrandSlam,
  detectRallyStarter,
  detectRallyKiller,
  detectIBBStrikeout,

  // Aggregated prompt check
  getPromptDetections,

  // Types
  type DetectionContext,
  type PlayResult,
  type PitcherAppearance,
  type PromptResult,
} from '../../../engines/detectionFunctions';

// ============================================
// ADDITIONAL FIGMA-SPECIFIC DETECTION WRAPPERS
// ============================================

import type { PlayData } from '../components/EnhancedInteractiveField';
import type {
  DetectionContext as LegacyDetectionContext,
  PlayResult as LegacyPlayResult,
} from '../../../engines/detectionFunctions';

/**
 * Convert Figma PlayData to legacy PlayResult for detection functions
 */
export function convertPlayDataToPlayResult(
  playData: PlayData,
  batterInfo: { id: string; name: string },
  pitcherInfo: { id: string; name: string },
  rbi: number = 0
): LegacyPlayResult {
  // Map PlayData to PlayResult
  const result = playData.type === 'hit'
    ? (playData.hitType as '1B' | '2B' | '3B' | 'HR')
    : playData.type === 'hr'
      ? 'HR'
      : playData.type === 'out'
        ? (playData.outType || 'GO')
        : 'GO';

  // Determine catch type from location if it's a fly out
  let catchType: 'DIVING_CATCH' | 'WALL_CATCH' | 'LEAPING_CATCH' | 'ROUTINE' | undefined;
  if (playData.type === 'out' && playData.ballLocation) {
    const y = playData.ballLocation.y;
    if (y > 0.95) {
      catchType = 'WALL_CATCH';
    } else if (y > 0.8 && playData.playDifficulty === 'difficult') {
      catchType = 'DIVING_CATCH';
    } else if (playData.playDifficulty === 'difficult') {
      catchType = 'LEAPING_CATCH';
    } else {
      catchType = 'ROUTINE';
    }
  }

  return {
    result: result as any,
    batterId: batterInfo.id,
    batterName: batterInfo.name,
    pitcherId: pitcherInfo.id,
    pitcherName: pitcherInfo.name,
    rbi,
    fieldingData: {
      catchType,
      savedRun: catchType && catchType !== 'ROUTINE' && playData.gameSituation?.bases.third,
      primaryFielder: playData.fieldingSequence[0]?.toString() as any,
      assistChain: playData.fieldingSequence.slice(0, -1).map(n => n.toString() as any),
      putoutPosition: playData.fieldingSequence[playData.fieldingSequence.length - 1]?.toString() as any,
    },
  };
}

/**
 * Convert Figma game state to legacy DetectionContext
 */
export function convertGameStateToContext(
  gameId: string,
  gameState: {
    inning: number;
    isTop: boolean;
    outs: number;
    bases: { first: boolean; second: boolean; third: boolean };
    homeScore: number;
    awayScore: number;
  },
  leverageIndex?: number,
  isPlayoffs: boolean = false
): LegacyDetectionContext {
  return {
    gameId,
    inning: gameState.inning,
    halfInning: gameState.isTop ? 'TOP' : 'BOTTOM',
    outs: gameState.outs,
    score: {
      away: gameState.awayScore,
      home: gameState.homeScore,
    },
    bases: {
      first: gameState.bases.first ? { playerId: 'r1', playerName: 'Runner', inheritedFrom: null } : null,
      second: gameState.bases.second ? { playerId: 'r2', playerName: 'Runner', inheritedFrom: null } : null,
      third: gameState.bases.third ? { playerId: 'r3', playerName: 'Runner', inheritedFrom: null } : null,
    },
    leverageIndex,
    isPlayoffs,
  };
}

// ============================================
// DETECTION RESULT TYPES FOR UI
// ============================================

export interface UIDetectionResult {
  detected: boolean;
  eventType: string;
  message: string;
  fameImpact?: number;
  requiresConfirmation: boolean;
  icon: string;
}

/**
 * Map detection results to UI-friendly format
 */
export function mapDetectionToUI(
  detection: { eventType: string; message: string } | null,
  requiresConfirmation: boolean = true
): UIDetectionResult | null {
  if (!detection) return null;

  const iconMap: Record<string, string> = {
    WEB_GEM: '✨',
    ROBBERY: '🔥',
    TOOTBLAN: '🤦',
    NUT_SHOT: '🥜',
    NUT_SHOT_EXIT: '🥜',
    KILLED_PITCHER: '💥',
    TRIPLE_PLAY: '🎉',
    BLOWN_SAVE: '💔',
    BLOWN_SAVE_LOSS: '💔',
    ESCAPE_ARTIST: '🎩',
    POSITION_PLAYER_PITCHING: '😱',
    CLUTCH_GRAND_SLAM: '🎆',
    RALLY_STARTER: '⚡',
    RALLY_KILLER: '🛑',
    INSIDE_PARK_HR: '🏃',
  };

  return {
    detected: true,
    eventType: detection.eventType,
    message: detection.message,
    requiresConfirmation,
    icon: iconMap[detection.eventType] || '⚾',
  };
}

// ============================================
// BATCH DETECTION FOR PLAY COMPLETION
// ============================================

import {
  promptWebGem,
  promptRobbery,
  promptTOOTBLAN,
  detectTriplePlay,
  detectClutchGrandSlam,
} from '../../../engines/detectionFunctions';

/**
 * Run all relevant detections after a play completes
 * Returns an array of detected events for UI display
 */
export function runPlayDetections(
  playData: PlayData,
  batterInfo: { id: string; name: string },
  pitcherInfo: { id: string; name: string },
  gameState: {
    inning: number;
    isTop: boolean;
    outs: number;
    bases: { first: boolean; second: boolean; third: boolean };
    homeScore: number;
    awayScore: number;
  },
  options: {
    gameId: string;
    leverageIndex?: number;
    isPlayoffs?: boolean;
    rbi?: number;
  }
): UIDetectionResult[] {
  const results: UIDetectionResult[] = [];

  const playResult = convertPlayDataToPlayResult(
    playData,
    batterInfo,
    pitcherInfo,
    options.rbi || 0
  );
  const context = convertGameStateToContext(
    options.gameId,
    gameState,
    options.leverageIndex,
    options.isPlayoffs
  );

  // Web Gem detection (fly outs)
  if (playData.type === 'out' || playData.type === 'foul_out') {
    const webGemResult = promptWebGem(playResult, context);
    const mapped = mapDetectionToUI(webGemResult, true);
    if (mapped) results.push(mapped);

    // Robbery detection (HR denied)
    const wasBasesLoaded = gameState.bases.first && gameState.bases.second && gameState.bases.third;
    const robberyResult = promptRobbery(playResult, context, wasBasesLoaded);
    const robberyMapped = mapDetectionToUI(robberyResult, true);
    if (robberyMapped) results.push(robberyMapped);
  }

  // Triple play detection
  if (playData.type === 'out' && playData.fieldingSequence.length >= 3) {
    const outsOnPlay = playData.runnerOutcomes
      ? Object.values(playData.runnerOutcomes).filter(o => o?.to === 'out').length + 1
      : 1;
    if (outsOnPlay === 3) {
      const tpResult = detectTriplePlay(
        3,
        playData.fieldingSequence.map(n => n.toString() as any),
        [playData.fieldingSequence[playData.fieldingSequence.length - 1].toString() as any]
      );
      const tpMapped = mapDetectionToUI(tpResult, false);
      if (tpMapped) results.push(tpMapped);
    }
  }

  // Clutch grand slam detection
  if (playData.hitType === 'HR' && options.rbi === 4) {
    const wasBasesLoadedForGS = gameState.bases.first && gameState.bases.second && gameState.bases.third;
    // Determine score perspective: if top of inning, away is batting; if bottom, home is batting
    const scoreBefore = gameState.isTop
      ? { batting: gameState.awayScore, fielding: gameState.homeScore }
      : { batting: gameState.homeScore, fielding: gameState.awayScore };
    const gsResult = detectClutchGrandSlam(
      'HR', // AtBatResult type
      wasBasesLoadedForGS,
      options.rbi || 0,
      scoreBefore,
      batterInfo.id,
      batterInfo.name
    );
    const gsMapped = mapDetectionToUI(gsResult, false);
    if (gsMapped) results.push(gsMapped);
  }

  // TOOTBLAN detection (runner out on bad baserunning)
  if (playData.runnerOutcomes) {
    const runnerOuts = Object.entries(playData.runnerOutcomes)
      .filter(([_, outcome]) => outcome?.to === 'out' && outcome?.reason?.includes('TOOTBLAN'));
    if (runnerOuts.length > 0) {
      // Determine out type from runner outcomes
      const firstOutcome = runnerOuts[0][1];
      const outType = (firstOutcome?.reason?.includes('PICKED_OFF') ? 'PICKED_OFF' :
                       firstOutcome?.reason?.includes('CAUGHT_STEALING') ? 'CAUGHT_STEALING' :
                       firstOutcome?.reason?.includes('PASSED_RUNNER') ? 'PASSED_RUNNER' :
                       'OUT_ADVANCING') as 'PICKED_OFF' | 'CAUGHT_STEALING' | 'OUT_ADVANCING' | 'PASSED_RUNNER';
      const tootblanResult = promptTOOTBLAN(playResult, context, outType);
      const tootblanMapped = mapDetectionToUI(tootblanResult, true);
      if (tootblanMapped) results.push(tootblanMapped);
    }
  }

  return results;
}

// ============================================
// QUICK DETECTION HELPERS
// ============================================

/**
 * Check if play was likely a spectacular catch
 */
export function isSpectacularCatch(playData: PlayData): boolean {
  if (playData.type !== 'out' && playData.type !== 'foul_out') return false;
  if (!playData.ballLocation) return false;

  const y = playData.ballLocation.y;
  return (
    y > 0.8 || // Deep outfield
    playData.playDifficulty === 'difficult' ||
    playData.playDifficulty === 'impossible'
  );
}

/**
 * Check if play denied a home run
 */
export function isPotentialRobbery(playData: PlayData): boolean {
  if (playData.type !== 'out' && playData.type !== 'foul_out') return false;
  if (!playData.ballLocation) return false;

  const y = playData.ballLocation.y;
  return y > 0.95; // At the wall
}
