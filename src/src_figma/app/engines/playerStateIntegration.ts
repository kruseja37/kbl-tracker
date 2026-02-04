/**
 * Player State Integration
 *
 * Per FIGMA_IMPLEMENTATION_PLAN.md Phase 5
 *
 * Integrates the Mojo, Fitness, and Clutch systems for the Figma GameTracker.
 * Provides unified player state management and stat adjustments.
 */

// ============================================
// RE-EXPORT MOJO ENGINE
// ============================================

export {
  // Types
  type MojoLevel,
  type MojoName,
  type MojoState,
  type MojoChangeEvent,
  type MojoTrigger,
  type MojoTriggerValue,
  type MojoEntry,
  type MojoGameSnapshot,
  type MojoAmplification,
  type GameSituation,
  type AdjustedStats,
  type BaseStats,
  type PlayResultForMojo,
  type MojoSuggestion,
  type MojoSplitStats,
  type PlayerMojoSplits,
  type MojoGameStats,

  // Constants
  MOJO_STATES,
  MOJO_TRIGGERS,
  MOJO_AMPLIFICATION,
  MOJO_CARRYOVER_RATE,

  // Core functions
  getMojoState,
  getMojoDisplayName,
  getMojoEmoji,
  clampMojo,
  isValidMojoLevel,

  // Stat functions
  getMojoStatMultiplier,
  applyMojoToStat,
  applyMojoToAllStats,

  // Change calculation
  calculateAmplification,
  getMojoDelta,
  applyMojoChange,
  processMojoTriggers,

  // Carryover
  calculateStartingMojo,
  getCarryoverExplanation,

  // Game tracking
  createMojoEntry,
  updateMojoEntry,
  calculateMojoGameStats,

  // Fame/WAR integration
  getMojoFameModifier,
  getMojoWARMultiplier,
  getMojoClutchMultiplier,

  // Auto-inference
  inferMojoTriggers,
  suggestMojoChange,

  // Splits
  createEmptyMojoSplitStats,
  createPlayerMojoSplits,
  recalculateSplitRates,

  // Display
  getMojoColor,
  getMojoBarFill,
  formatMojo,
  getMojoChangeNarrative,
} from '../../../engines/mojoEngine';

// ============================================
// RE-EXPORT FITNESS ENGINE
// ============================================

export {
  // Types
  type FitnessState,
  type FitnessDefinition,
  type FitnessEntry,
  type FitnessChangeReason,
  type PlayerPosition,
  type PositionCategory,
  type FitnessDecayConfig,
  type FitnessRecoveryConfig,
  type PlayerFitnessProfile,
  type InjuryRisk,
  type GameActivity,
  type RecoveryProjection,

  // Constants
  FITNESS_STATES,
  FITNESS_STATE_ORDER,
  FITNESS_DECAY,
  FITNESS_RECOVERY,
  JUICED_REQUIREMENTS,

  // Core functions
  getFitnessDefinition,
  getFitnessStateFromValue,
  getFitnessValue,
  canPlay,
  isRiskyToPlay,
  getPositionCategory,

  // Stat functions
  getFitnessStatMultiplier,
  applyFitnessToStat,
  applyCombinedMultiplier,

  // Decay/Recovery
  calculateFitnessDecay,
  applyFitnessDecay,
  calculateDailyRecovery,
  applyRecovery,

  // Juiced status
  checkJuicedEligibility,
  applyJuicedStatus,
  updateJuicedStatus,

  // Injury risk
  calculateInjuryRisk,
  rollForInjury,

  // Fame/WAR integration
  getFitnessFameModifier,
  getFitnessWARMultiplier,
  calculateAdjustedFame,

  // Profile management
  createFitnessProfile,
  createSeasonStartProfile,

  // Recovery projection
  projectRecovery,

  // Display
  getFitnessColor,
  getFitnessEmoji,
  getFitnessBarFill,
  formatFitness,
  getFitnessNarrative,
  getJuicedStigmaNarrative,
  getRandomJuicedNarrative,
} from '../../../engines/fitnessEngine';

// ============================================
// RE-EXPORT CLUTCH CALCULATOR
// ============================================

export {
  // Types
  type ContactQuality,
  type ExitType,
  type TrajectoryModifier,
  type PlayResult as ClutchPlayResult,
  type ParticipantRole,
  type FielderPlayType,
  type Position,
  type ParticipantAttribution,
  type PlayAttribution,
  type PlayerClutchStats,
  type PlayoffContext,

  // Constants
  DEFAULT_CONTACT_QUALITY,
  PLAYOFF_MULTIPLIERS,
  POSITION_ARM_DEFAULTS,
  CLUTCH_TIERS,
  CLUTCH_DISPLAY_CONFIG,

  // Contact quality
  getContactQualityFromUI,
  inferFlyBallDepth,
  inferGroundBallSpeed,

  // Playoff
  getPlayoffMultiplier,

  // Arm factors
  getArmFactor,
  getInfieldSingleArmBlame,
  getSacFlyArmBlame,

  // Base values
  getBatterBaseValue,
  getPitcherBaseValue,
  getFielderBaseValue,
  getCatcherBaseValue,
  getRunnerBaseValue,
  getManagerBaseValue,

  // Attribution calculation
  applyContactQualityModifier,
  calculateParticipantClutch,
  calculatePlayAttribution,

  // Stats accumulation
  createPlayerClutchStats,
  accumulateClutchEvent,

  // Tiers and display
  getClutchTier,
  getClutchConfidence,
  shouldDisplayClutchRating,

  // Trigger stacking
  calculateClutchTriggers,

  // All-Star voting
  scaleToRange,
  getClutchVotingComponent,
} from '../../../engines/clutchCalculator';

// ============================================
// FIGMA-SPECIFIC TYPES
// ============================================

import type { MojoLevel } from '../../../engines/mojoEngine';
import type { FitnessState, PlayerFitnessProfile } from '../../../engines/fitnessEngine';
import type { PlayerClutchStats } from '../../../engines/clutchCalculator';
import { getMojoStatMultiplier, getMojoColor, getMojoEmoji } from '../../../engines/mojoEngine';
import { getFitnessStatMultiplier, getFitnessColor, getFitnessEmoji } from '../../../engines/fitnessEngine';
import { getClutchTier } from '../../../engines/clutchCalculator';

/**
 * Combined player state for UI display
 */
export interface CombinedPlayerState {
  playerId: string;
  playerName: string;

  // Mojo
  mojoLevel: MojoLevel;
  mojoEmoji: string;
  mojoColor: string;
  mojoMultiplier: number;

  // Fitness
  fitnessState: FitnessState;
  fitnessEmoji: string;
  fitnessColor: string;
  fitnessMultiplier: number;
  canPlay: boolean;
  isRisky: boolean;

  // Combined stat multiplier
  combinedMultiplier: number;

  // Clutch summary
  netClutch: number;
  clutchTier: string;
  clutchIcon: string;
  clutchColor: string;

  // Quick status
  statusLine: string;
}

/**
 * Create combined player state for UI
 */
export function createCombinedPlayerState(
  playerId: string,
  playerName: string,
  mojoLevel: MojoLevel,
  fitnessProfile: PlayerFitnessProfile,
  clutchStats?: PlayerClutchStats
): CombinedPlayerState {
  const mojoMult = getMojoStatMultiplier(mojoLevel);
  const fitnessMult = getFitnessStatMultiplier(fitnessProfile.currentFitness);
  const combinedMult = mojoMult * fitnessMult;

  const clutchTierData = clutchStats
    ? getClutchTier(clutchStats.netClutch)
    : { tier: 'Unknown', icon: '?', color: 'gray' };

  const canPlayNow = fitnessProfile.currentFitness !== 'HURT';
  const isRisky = fitnessProfile.currentFitness === 'STRAINED' || fitnessProfile.currentFitness === 'WEAK';

  // Generate status line
  let statusLine = '';
  if (mojoLevel >= 2) statusLine = 'On fire!';
  else if (mojoLevel === 1) statusLine = 'In the zone';
  else if (mojoLevel === -1) statusLine = 'Pressing';
  else if (mojoLevel <= -2) statusLine = 'Struggling';
  else statusLine = 'Steady';

  if (fitnessProfile.currentFitness === 'JUICED') statusLine += ' (Juiced)';
  else if (isRisky) statusLine += ' (Playing hurt)';
  else if (!canPlayNow) statusLine = 'Injured';

  return {
    playerId,
    playerName,
    mojoLevel,
    mojoEmoji: getMojoEmoji(mojoLevel),
    mojoColor: getMojoColor(mojoLevel),
    mojoMultiplier: mojoMult,
    fitnessState: fitnessProfile.currentFitness,
    fitnessEmoji: getFitnessEmoji(fitnessProfile.currentFitness),
    fitnessColor: getFitnessColor(fitnessProfile.currentFitness),
    fitnessMultiplier: fitnessMult,
    canPlay: canPlayNow,
    isRisky,
    combinedMultiplier: combinedMult,
    netClutch: clutchStats?.netClutch ?? 0,
    clutchTier: clutchTierData.tier,
    clutchIcon: clutchTierData.icon,
    clutchColor: clutchTierData.color,
    statusLine,
  };
}

// ============================================
// STAT ADJUSTMENT HELPERS
// ============================================

/**
 * Apply Mojo + Fitness adjustments to a base stat
 */
export function adjustStatForState(
  baseStat: number,
  mojoLevel: MojoLevel,
  fitnessState: FitnessState
): number {
  const mojoMult = getMojoStatMultiplier(mojoLevel);
  const fitnessMult = getFitnessStatMultiplier(fitnessState);
  return Math.round(baseStat * mojoMult * fitnessMult);
}

/**
 * Apply adjustments to all batting stats
 */
export interface BattingStats {
  power: number;
  contact: number;
  speed: number;
  fielding: number;
  arm: number;
}

export function adjustBattingStats(
  stats: BattingStats,
  mojoLevel: MojoLevel,
  fitnessState: FitnessState
): BattingStats {
  return {
    power: adjustStatForState(stats.power, mojoLevel, fitnessState),
    contact: adjustStatForState(stats.contact, mojoLevel, fitnessState),
    speed: adjustStatForState(stats.speed, mojoLevel, fitnessState),
    fielding: adjustStatForState(stats.fielding, mojoLevel, fitnessState),
    arm: adjustStatForState(stats.arm, mojoLevel, fitnessState),
  };
}

/**
 * Apply adjustments to pitching stats
 */
export interface PitchingStats {
  velocity: number;
  junk: number;
  accuracy: number;
}

export function adjustPitchingStats(
  stats: PitchingStats,
  mojoLevel: MojoLevel,
  fitnessState: FitnessState
): PitchingStats {
  return {
    velocity: adjustStatForState(stats.velocity, mojoLevel, fitnessState),
    junk: adjustStatForState(stats.junk, mojoLevel, fitnessState),
    accuracy: adjustStatForState(stats.accuracy, mojoLevel, fitnessState),
  };
}

// ============================================
// UI DISPLAY HELPERS
// ============================================

/**
 * Get compact state badge for player card
 */
export function getStateBadge(
  mojoLevel: MojoLevel,
  fitnessState: FitnessState
): { text: string; color: string; bgColor: string } {
  // Priority: Hurt > Juiced > Mojo extreme states > Fitness warning
  if (fitnessState === 'HURT') {
    return { text: 'HURT', color: '#ffffff', bgColor: '#dc2626' };
  }
  if (fitnessState === 'JUICED') {
    return { text: 'JUICED', color: '#ffffff', bgColor: '#a855f7' };
  }
  if (mojoLevel === 2) {
    return { text: 'JACKED', color: '#ffffff', bgColor: '#16a34a' };
  }
  if (mojoLevel === -2) {
    return { text: 'RATTLED', color: '#ffffff', bgColor: '#dc2626' };
  }
  if (fitnessState === 'WEAK') {
    return { text: 'WEAK', color: '#ffffff', bgColor: '#f97316' };
  }
  if (fitnessState === 'STRAINED') {
    return { text: 'STRAINED', color: '#000000', bgColor: '#eab308' };
  }
  if (mojoLevel === 1) {
    return { text: 'HOT', color: '#ffffff', bgColor: '#22c55e' };
  }
  if (mojoLevel === -1) {
    return { text: 'COLD', color: '#000000', bgColor: '#f97316' };
  }

  // Default: no badge needed
  return { text: '', color: '', bgColor: '' };
}

/**
 * Get multiplier indicator for stat display
 */
export function getMultiplierIndicator(
  mojoLevel: MojoLevel,
  fitnessState: FitnessState
): { symbol: string; color: string; value: number } {
  const mojoMult = getMojoStatMultiplier(mojoLevel);
  const fitnessMult = getFitnessStatMultiplier(fitnessState);
  const combined = mojoMult * fitnessMult;

  if (combined >= 1.3) {
    return { symbol: '⬆⬆', color: '#16a34a', value: combined };
  }
  if (combined >= 1.1) {
    return { symbol: '⬆', color: '#22c55e', value: combined };
  }
  if (combined <= 0.7) {
    return { symbol: '⬇⬇', color: '#dc2626', value: combined };
  }
  if (combined <= 0.9) {
    return { symbol: '⬇', color: '#f97316', value: combined };
  }

  return { symbol: '', color: '#6b7280', value: combined };
}

/**
 * Format multiplier for display
 */
export function formatMultiplier(value: number): string {
  const percent = Math.round((value - 1) * 100);
  if (percent > 0) return `+${percent}%`;
  if (percent < 0) return `${percent}%`;
  return '—';
}

// ============================================
// STATE CHANGE DETECTION
// ============================================

/**
 * Detect significant state changes for notifications
 */
export interface StateChangeNotification {
  type: 'mojo_change' | 'fitness_change' | 'injury' | 'recovery';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  icon: string;
}

export function detectStateChanges(
  playerId: string,
  playerName: string,
  previousMojo: MojoLevel,
  currentMojo: MojoLevel,
  previousFitness: FitnessState,
  currentFitness: FitnessState
): StateChangeNotification[] {
  const notifications: StateChangeNotification[] = [];

  // Mojo changes
  if (currentMojo !== previousMojo) {
    const mojoDelta = currentMojo - previousMojo;

    if (currentMojo === 2) {
      notifications.push({
        type: 'mojo_change',
        severity: 'info',
        message: `${playerName} is JACKED! 🔥🔥🔥`,
        icon: '🔥',
      });
    } else if (currentMojo === -2) {
      notifications.push({
        type: 'mojo_change',
        severity: 'warning',
        message: `${playerName} is RATTLED 😱`,
        icon: '😱',
      });
    } else if (mojoDelta >= 2) {
      notifications.push({
        type: 'mojo_change',
        severity: 'info',
        message: `${playerName}'s confidence surging! 📈`,
        icon: '📈',
      });
    } else if (mojoDelta <= -2) {
      notifications.push({
        type: 'mojo_change',
        severity: 'warning',
        message: `${playerName}'s confidence crashing 📉`,
        icon: '📉',
      });
    }
  }

  // Fitness changes
  if (currentFitness !== previousFitness) {
    if (currentFitness === 'HURT') {
      notifications.push({
        type: 'injury',
        severity: 'critical',
        message: `${playerName} is INJURED! 🏥`,
        icon: '🏥',
      });
    } else if (previousFitness === 'HURT') {
      // Recovered from injury (currentFitness is not HURT since we're in else branch)
      notifications.push({
        type: 'recovery',
        severity: 'info',
        message: `${playerName} has recovered from injury! ✓`,
        icon: '✓',
      });
    } else if (currentFitness === 'JUICED') {
      notifications.push({
        type: 'fitness_change',
        severity: 'info',
        message: `${playerName} is JUICED! 💉`,
        icon: '💉',
      });
    } else if (currentFitness === 'WEAK' || currentFitness === 'STRAINED') {
      if (previousFitness !== 'WEAK' && previousFitness !== 'STRAINED') {
        notifications.push({
          type: 'fitness_change',
          severity: 'warning',
          message: `${playerName} is wearing down ⚠️`,
          icon: '⚠️',
        });
      }
    }
  }

  return notifications;
}

// ============================================
// GAME STATE MANAGEMENT
// ============================================

/**
 * Player state entry for game tracking
 */
export interface GamePlayerState {
  playerId: string;
  startingMojo: MojoLevel;
  currentMojo: MojoLevel;
  startingFitness: FitnessState;
  currentFitness: FitnessState;
  inningsPlayed: number;
  pitchCount?: number;
  atBats: number;
  clutchMoments: number;
}

/**
 * Create initial game player state
 */
export function createGamePlayerState(
  playerId: string,
  startingMojo: MojoLevel = 0,
  startingFitness: FitnessState = 'FIT'
): GamePlayerState {
  return {
    playerId,
    startingMojo,
    currentMojo: startingMojo,
    startingFitness,
    currentFitness: startingFitness,
    inningsPlayed: 0,
    pitchCount: undefined,
    atBats: 0,
    clutchMoments: 0,
  };
}

/**
 * Update player state after a play
 */
export function updateGamePlayerState(
  state: GamePlayerState,
  update: {
    newMojo?: MojoLevel;
    newFitness?: FitnessState;
    addedInnings?: number;
    addedPitches?: number;
    hadAtBat?: boolean;
    hadClutchMoment?: boolean;
  }
): GamePlayerState {
  return {
    ...state,
    currentMojo: update.newMojo ?? state.currentMojo,
    currentFitness: update.newFitness ?? state.currentFitness,
    inningsPlayed: state.inningsPlayed + (update.addedInnings ?? 0),
    pitchCount: update.addedPitches !== undefined
      ? (state.pitchCount ?? 0) + update.addedPitches
      : state.pitchCount,
    atBats: state.atBats + (update.hadAtBat ? 1 : 0),
    clutchMoments: state.clutchMoments + (update.hadClutchMoment ? 1 : 0),
  };
}
