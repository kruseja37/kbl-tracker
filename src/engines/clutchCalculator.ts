/**
 * Clutch Attribution Calculator
 * Per CLUTCH_ATTRIBUTION_SPEC.md
 *
 * Multi-participant clutch/choke attribution system.
 * Credit flows to whoever controlled the outcome, weighted by Leverage Index.
 *
 * Core formula: clutchValue = baseValue × skillFactor × √(leverageIndex)
 */

import {
  getLeverageIndex,
  calculateClutchValue as applyLIWeight,
  type GameStateForLI,
  type LIResult,
  calculateLeverageIndex,
} from './leverageCalculator';

// ============================================
// TYPES
// ============================================

/**
 * Contact quality scale (0.1 to 1.0)
 */
export type ContactQuality = number;

/**
 * Default contact quality by trajectory
 */
export const DEFAULT_CONTACT_QUALITY = {
  // Home runs are always barreled
  home_run: 1.0,

  // Line drives are almost always hard
  line_drive: 0.85,

  // Fly balls vary by depth
  fly_ball_deep: 0.75,
  fly_ball_medium: 0.50,
  fly_ball_shallow: 0.35,

  // Ground balls vary by speed
  ground_ball_hard: 0.70,
  ground_ball_medium: 0.50,
  ground_ball_weak: 0.30,

  // Pop-ups are always weak
  popup_infield: 0.10,
  popup_shallow: 0.15,

  // Default for unknown
  default: 0.50,
} as const;

/**
 * Exit type from UI
 */
export type ExitType = 'Line Drive' | 'Fly Ball' | 'Ground Ball' | 'Popup' | 'Bunt';

/**
 * Trajectory depth/speed modifier
 */
export interface TrajectoryModifier {
  depth?: 'deep' | 'medium' | 'shallow';
  speed?: 'hard' | 'medium' | 'weak';
}

/**
 * Play result types
 */
export type PlayResult =
  | 'HR' | 'triple' | 'double' | 'single' | 'bloop_single' | 'infield_single'
  | 'ground_rule_double' | 'inside_park_hr'
  | 'fly_out' | 'ground_out' | 'line_out' | 'popup_out'
  | 'diving_catch' | 'leaping_catch' | 'wall_catch' | 'robbed_hr'
  | 'strikeout_swinging' | 'strikeout_looking'
  | 'walk' | 'intentional_walk' | 'hbp'
  | 'error' | 'throwing_error' | 'bad_hop_error'
  | 'gidp' | 'dp_line_drive' | 'dp_turned'
  | 'stolen_base' | 'caught_stealing' | 'pickoff_pitcher' | 'pickoff_catcher'
  | 'wild_pitch' | 'passed_ball'
  | 'sac_fly' | 'sac_bunt' | 'squeeze_scores' | 'squeeze_failed'
  | 'fielders_choice' | 'fc_batter_out';

/**
 * Participant role in a play
 */
export type ParticipantRole = 'batter' | 'pitcher' | 'catcher' | 'fielder' | 'runner' | 'manager';

/**
 * Fielder play type
 */
export type FielderPlayType = 'routine' | 'diving' | 'leaping' | 'wall' | 'relay' | 'error';

/**
 * Position for arm calculations
 */
export type Position = 'P' | 'C' | '1B' | '2B' | 'SS' | '3B' | 'LF' | 'CF' | 'RF';

/**
 * Individual participant attribution
 */
export interface ParticipantAttribution {
  playerId: string;
  role: ParticipantRole;
  clutchValue: number;
  baseValue: number;
  liWeight: number;
  skillFactor?: number;
  notes?: string;
}

/**
 * Complete play attribution
 */
export interface PlayAttribution {
  playId: string;
  gameId: string;
  inning: number;
  leverageIndex: number;
  liResult?: LIResult;
  contactQuality?: number;
  playResult: PlayResult;

  participants: {
    batter?: ParticipantAttribution;
    pitcher?: ParticipantAttribution;
    catcher?: ParticipantAttribution;
    fielders?: ParticipantAttribution[];
    runners?: ParticipantAttribution[];
    manager?: ParticipantAttribution;
  };

  // Flags
  isWalkoff?: boolean;
  isClutchSituation?: boolean;
  isHighLeverage?: boolean;
  isPlayoff?: boolean;
  playoffMultiplier?: number;
}

/**
 * Player clutch stats accumulator
 */
export interface PlayerClutchStats {
  playerId: string;

  // Accumulated values
  clutchPoints: number;
  chokePoints: number;
  netClutch: number;

  // Counts
  clutchMoments: number;
  chokeMoments: number;

  // Opportunity tracking
  totalLIExposure: number;
  highLeveragePAs: number;  // LI > 1.5
  plateAppearances: number;

  // Playoff-specific
  playoffClutchPoints: number;
  playoffChokePoints: number;
}

/**
 * Playoff context for multipliers
 */
export interface PlayoffContext {
  isPlayoff: boolean;
  playoffRound?: 'wild_card' | 'division_series' | 'championship_series' | 'world_series';
  isEliminationGame?: boolean;
  isClinchGame?: boolean;
}

// ============================================
// CONSTANTS
// ============================================

/**
 * Playoff multipliers
 */
export const PLAYOFF_MULTIPLIERS = {
  regular_season: 1.0,
  wild_card: 1.25,
  division_series: 1.5,
  championship_series: 1.75,
  world_series: 2.0,
  elimination_game: 0.5,  // Additional
  clinch_game: 0.25,      // Additional
} as const;

/**
 * Position-based arm strength defaults (0-1 scale)
 */
export const POSITION_ARM_DEFAULTS: Record<Position, number> = {
  'P': 0.35,
  'C': 0.70,
  '1B': 0.45,
  '2B': 0.60,
  'SS': 0.80,
  '3B': 0.80,
  'LF': 0.55,
  'CF': 0.65,
  'RF': 0.75,
};

/**
 * Clutch tier thresholds
 */
export const CLUTCH_TIERS = {
  'Elite Clutch': { min: 10.0, icon: '🔥🔥', color: 'gold' },
  'Clutch': { min: 5.0, icon: '🔥', color: 'orange' },
  'Reliable': { min: 1.0, icon: '✓', color: 'green' },
  'Average': { min: -1.0, icon: '—', color: 'gray' },
  'Shaky': { min: -5.0, icon: '😰', color: 'yellow' },
  'Choke Artist': { min: -Infinity, icon: '💀', color: 'red' },
} as const;

/**
 * Minimum opportunities for display
 */
export const CLUTCH_DISPLAY_CONFIG = {
  minHighLeveragePAs: 10,
  minTotalLIExposure: 15,
} as const;

// ============================================
// CONTACT QUALITY FUNCTIONS
// ============================================

/**
 * Get contact quality from UI exit type
 */
export function getContactQualityFromUI(
  exitType: ExitType,
  trajectory?: TrajectoryModifier,
  result?: PlayResult
): ContactQuality {
  // Home runs are always barrel-quality
  if (result === 'HR' || result === 'inside_park_hr') return 1.0;

  // Map exit types
  switch (exitType) {
    case 'Line Drive':
      return DEFAULT_CONTACT_QUALITY.line_drive;

    case 'Fly Ball': {
      const depth = trajectory?.depth ?? 'medium';
      if (depth === 'deep') return DEFAULT_CONTACT_QUALITY.fly_ball_deep;
      if (depth === 'shallow') return DEFAULT_CONTACT_QUALITY.fly_ball_shallow;
      return DEFAULT_CONTACT_QUALITY.fly_ball_medium;
    }

    case 'Ground Ball': {
      const speed = trajectory?.speed ?? 'medium';
      if (speed === 'hard') return DEFAULT_CONTACT_QUALITY.ground_ball_hard;
      if (speed === 'weak') return DEFAULT_CONTACT_QUALITY.ground_ball_weak;
      return DEFAULT_CONTACT_QUALITY.ground_ball_medium;
    }

    case 'Popup':
      return DEFAULT_CONTACT_QUALITY.popup_infield;

    case 'Bunt':
      return 0.30;  // Intentional weak contact

    default:
      return DEFAULT_CONTACT_QUALITY.default;
  }
}

/**
 * Infer fly ball depth from context
 */
export function inferFlyBallDepth(
  result?: PlayResult,
  fielderPosition?: string
): 'deep' | 'medium' | 'shallow' {
  if (result === 'wall_catch' || result === 'robbed_hr') return 'deep';
  if (result === 'bloop_single' || fielderPosition?.includes('shallow')) return 'shallow';
  return 'medium';
}

/**
 * Infer ground ball speed from result
 */
export function inferGroundBallSpeed(
  result?: PlayResult,
  wasInfieldSingle?: boolean
): 'hard' | 'medium' | 'weak' {
  if (result === 'infield_single' || wasInfieldSingle) return 'hard';
  // Ground ball speed is inferred from context - default to medium for routine grounders
  // 'weak' can be set manually via UI if needed
  return 'medium';
}

// ============================================
// PLAYOFF MULTIPLIER
// ============================================

/**
 * Calculate total playoff multiplier
 */
export function getPlayoffMultiplier(context: PlayoffContext): number {
  if (!context.isPlayoff) return PLAYOFF_MULTIPLIERS.regular_season;

  let multiplier = PLAYOFF_MULTIPLIERS[context.playoffRound ?? 'wild_card'];

  if (context.isEliminationGame) {
    multiplier += PLAYOFF_MULTIPLIERS.elimination_game;
  }

  if (context.isClinchGame) {
    multiplier += PLAYOFF_MULTIPLIERS.clinch_game;
  }

  return multiplier;
}

// ============================================
// ARM FACTOR CALCULATIONS
// ============================================

/**
 * Get arm factor from rating (0-99 scale to 0-1)
 */
export function getArmFactor(armRating?: number, position?: Position): number {
  if (armRating !== undefined) {
    return armRating / 100;
  }
  if (position) {
    return POSITION_ARM_DEFAULTS[position];
  }
  return 0.5;  // Default average
}

/**
 * Get infield single arm blame
 */
export function getInfieldSingleArmBlame(position: Position, armFactor: number): number {
  const throwDifficulty: Record<Position, number> = {
    'P': 0.20,
    'C': 0.50,
    '1B': 0.30,
    '2B': 0.50,
    'SS': 0.80,
    '3B': 0.85,
    'LF': 0,
    'CF': 0,
    'RF': 0,
  };

  const difficulty = throwDifficulty[position] ?? 0.5;
  return -0.25 * difficulty * armFactor;
}

/**
 * Get sac fly arm blame
 */
export function getSacFlyArmBlame(
  position: Position,
  depth: 'shallow' | 'medium' | 'deep',
  armFactor: number
): number {
  const throwExpectation: Record<Position, Record<string, number>> = {
    'LF': { shallow: 0.20, medium: 0.05, deep: 0 },
    'CF': { shallow: 0.40, medium: 0.20, deep: 0.05 },
    'RF': { shallow: 0.60, medium: 0.40, deep: 0.15 },
    'P': { shallow: 0, medium: 0, deep: 0 },
    'C': { shallow: 0, medium: 0, deep: 0 },
    '1B': { shallow: 0, medium: 0, deep: 0 },
    '2B': { shallow: 0, medium: 0, deep: 0 },
    'SS': { shallow: 0, medium: 0, deep: 0 },
    '3B': { shallow: 0, medium: 0, deep: 0 },
  };

  const expectation = throwExpectation[position]?.[depth] ?? 0;
  return -0.2 * expectation * armFactor;
}

// ============================================
// ATTRIBUTION BASE VALUES
// ============================================

/**
 * Get batter base value by play result
 */
export function getBatterBaseValue(
  result: PlayResult,
  contactQuality: number,
  context?: { isDivingCatch?: boolean; isRobbedHR?: boolean }
): { base: number; useCQ: boolean; modifier: 'multiply' | 'inverse' } {
  // Hits
  if (result === 'HR' || result === 'inside_park_hr') {
    return { base: result === 'inside_park_hr' ? 1.2 : 1.0, useCQ: true, modifier: 'multiply' };
  }
  if (result === 'triple' || result === 'double' || result === 'ground_rule_double') {
    return { base: 1.0, useCQ: true, modifier: 'multiply' };
  }
  if (result === 'single') {
    return { base: 0.8, useCQ: true, modifier: 'multiply' };
  }
  if (result === 'bloop_single') {
    return { base: 0.5, useCQ: true, modifier: 'multiply' };
  }
  if (result === 'infield_single') {
    return { base: 0.7, useCQ: false, modifier: 'multiply' };
  }

  // Outs
  if (result === 'fly_out' || result === 'ground_out' || result === 'popup_out') {
    return { base: -0.3, useCQ: true, modifier: 'inverse' };
  }
  if (result === 'line_out') {
    return { base: -0.2, useCQ: true, modifier: 'multiply' };  // Hit it hard, reduced blame
  }
  if (result === 'diving_catch') {
    return { base: -0.1, useCQ: true, modifier: 'multiply' };  // Fielder hero
  }
  if (result === 'leaping_catch' || result === 'wall_catch') {
    return { base: -0.1, useCQ: true, modifier: 'multiply' };
  }
  if (result === 'robbed_hr') {
    return { base: 0, useCQ: false, modifier: 'multiply' };  // Was a HR!
  }

  // Strikeouts
  if (result === 'strikeout_swinging') {
    return { base: -1.0, useCQ: false, modifier: 'multiply' };
  }
  if (result === 'strikeout_looking') {
    return { base: -1.2, useCQ: false, modifier: 'multiply' };  // Extra shame
  }

  // Walks/HBP
  if (result === 'walk') {
    return { base: 0.5, useCQ: false, modifier: 'multiply' };
  }
  if (result === 'intentional_walk') {
    return { base: 0, useCQ: false, modifier: 'multiply' };  // Manager decision
  }
  if (result === 'hbp') {
    return { base: 0.3, useCQ: false, modifier: 'multiply' };
  }

  // GIDP
  if (result === 'gidp') {
    return { base: -1.0, useCQ: true, modifier: 'inverse' };
  }
  if (result === 'dp_line_drive') {
    return { base: -0.3, useCQ: true, modifier: 'multiply' };  // Hit it hard
  }

  // Errors
  if (result === 'error' || result === 'throwing_error') {
    return { base: 0.3, useCQ: false, modifier: 'multiply' };  // Reached on error
  }
  if (result === 'bad_hop_error') {
    return { base: 0.15, useCQ: false, modifier: 'multiply' };  // Lucky
  }

  // Sacrifice plays
  if (result === 'sac_fly') {
    return { base: 0.6, useCQ: false, modifier: 'multiply' };
  }
  if (result === 'sac_bunt') {
    return { base: 0.3, useCQ: false, modifier: 'multiply' };
  }
  if (result === 'squeeze_scores') {
    return { base: 0.7, useCQ: false, modifier: 'multiply' };
  }
  if (result === 'squeeze_failed') {
    return { base: -0.4, useCQ: false, modifier: 'multiply' };
  }

  // Fielder's choice
  if (result === 'fielders_choice') {
    return { base: 0.2, useCQ: false, modifier: 'multiply' };
  }
  if (result === 'fc_batter_out') {
    return { base: -0.3, useCQ: false, modifier: 'multiply' };
  }

  return { base: 0, useCQ: false, modifier: 'multiply' };
}

/**
 * Get pitcher base value by play result
 */
export function getPitcherBaseValue(
  result: PlayResult,
  contactQuality: number
): { base: number; useCQ: boolean; modifier: 'multiply' | 'inverse' } {
  // Strikeouts (pitcher success)
  if (result === 'strikeout_swinging') {
    return { base: 1.0, useCQ: false, modifier: 'multiply' };
  }
  if (result === 'strikeout_looking') {
    return { base: 0.9, useCQ: false, modifier: 'multiply' };
  }

  // Walks/HBP (pitcher failure)
  if (result === 'walk') {
    return { base: -0.5, useCQ: false, modifier: 'multiply' };
  }
  if (result === 'intentional_walk') {
    return { base: 0, useCQ: false, modifier: 'multiply' };  // Manager decision
  }
  if (result === 'hbp') {
    return { base: -0.35, useCQ: false, modifier: 'multiply' };
  }

  // Hits allowed
  if (result === 'HR' || result === 'inside_park_hr') {
    return { base: -1.0, useCQ: true, modifier: 'inverse' };
  }
  if (result === 'triple' || result === 'double' || result === 'ground_rule_double') {
    return { base: -0.9, useCQ: true, modifier: 'inverse' };
  }
  if (result === 'single') {
    return { base: -0.8, useCQ: true, modifier: 'inverse' };
  }
  if (result === 'bloop_single') {
    return { base: -0.3, useCQ: true, modifier: 'inverse' };  // Lucky for batter
  }
  if (result === 'infield_single') {
    return { base: -0.2, useCQ: true, modifier: 'inverse' };
  }

  // Outs recorded (pitcher success)
  if (result === 'fly_out' || result === 'ground_out' || result === 'popup_out') {
    return { base: 0.4, useCQ: true, modifier: 'multiply' };  // Weak contact = more credit
  }
  if (result === 'line_out') {
    return { base: 0.2, useCQ: true, modifier: 'inverse' };  // Hard hit, got lucky
  }
  if (result === 'diving_catch' || result === 'leaping_catch' || result === 'wall_catch') {
    return { base: 0.1, useCQ: false, modifier: 'multiply' };  // Fielder saved them
  }
  if (result === 'robbed_hr') {
    return { base: 0.3, useCQ: false, modifier: 'multiply' };  // Fielder saved them
  }

  // GIDP
  if (result === 'gidp') {
    return { base: 0.7, useCQ: true, modifier: 'multiply' };
  }
  if (result === 'dp_line_drive') {
    return { base: 0.15, useCQ: false, modifier: 'multiply' };
  }

  // Wild pitches
  if (result === 'wild_pitch') {
    return { base: -0.7, useCQ: false, modifier: 'multiply' };
  }

  return { base: 0, useCQ: false, modifier: 'multiply' };
}

/**
 * Get fielder base value by play result and play type
 */
export function getFielderBaseValue(
  result: PlayResult,
  playType: FielderPlayType
): number {
  // Star plays
  if (result === 'diving_catch') return 0.8;
  if (result === 'leaping_catch') return 0.7;
  if (result === 'wall_catch') return 0.7;
  if (result === 'robbed_hr') return 1.0;

  // Routine plays
  if (playType === 'routine') {
    if (['fly_out', 'ground_out', 'popup_out'].includes(result)) return 0.1;
    if (result === 'line_out') return 0.5;
  }

  // Errors
  if (result === 'error') {
    if (playType === 'routine') return -1.0;  // Routine error = full blame
    if (playType === 'diving') return 0.2;    // Missed dive = effort credit!
    return -0.6;  // Hard grounder error
  }
  if (result === 'throwing_error') return -0.8;
  if (result === 'bad_hop_error') return 0;  // No blame for physics

  // GIDP participation
  if (result === 'gidp' || result === 'dp_turned') {
    if (playType === 'relay') return 0.3;
    return 0.2;
  }
  if (result === 'dp_line_drive') return 0.6;  // Great reflexes

  return 0;
}

/**
 * Get catcher base value
 */
export function getCatcherBaseValue(result: PlayResult): number {
  if (result === 'strikeout_swinging') return 0.1;
  if (result === 'strikeout_looking') return 0.2;  // Good frame/call
  if (result === 'walk') return -0.1;
  if (result === 'hbp') return -0.05;
  if (result === 'caught_stealing') return 0.7;
  if (result === 'stolen_base') return -0.6;
  if (result === 'pickoff_catcher') return 0.7;
  if (result === 'passed_ball') return -0.75;  // Average of -0.6 to -0.9
  if (result === 'wild_pitch') return -0.25;   // Should block

  return 0;
}

/**
 * Get runner base value
 */
export function getRunnerBaseValue(result: PlayResult): number {
  if (result === 'stolen_base') return 1.0;
  if (result === 'caught_stealing') return -1.0;
  if (result === 'pickoff_pitcher' || result === 'pickoff_catcher') return -0.8;

  return 0;
}

// ============================================
// CORE ATTRIBUTION CALCULATION
// ============================================

/**
 * Apply contact quality modifier
 */
export function applyContactQualityModifier(
  baseValue: number,
  contactQuality: number,
  modifier: 'multiply' | 'inverse'
): number {
  if (modifier === 'multiply') {
    return baseValue * contactQuality;
  } else {
    // Inverse: weak contact = more blame/credit for pitcher
    return baseValue * (1 - contactQuality);
  }
}

/**
 * Calculate single participant's clutch value
 */
export function calculateParticipantClutch(
  baseValue: number,
  leverageIndex: number,
  playoffMultiplier: number = 1.0
): number {
  const liWeight = Math.sqrt(leverageIndex);
  return baseValue * liWeight * playoffMultiplier;
}

/**
 * Calculate full play attribution
 */
export function calculatePlayAttribution(
  playId: string,
  gameId: string,
  gameState: GameStateForLI,
  result: PlayResult,
  contactQuality: number,
  participants: {
    batterId?: string;
    pitcherId?: string;
    catcherId?: string;
    fielders?: Array<{ playerId: string; position: Position; playType: FielderPlayType }>;
    runners?: Array<{ playerId: string; action: PlayResult }>;
    managerId?: string;
    managerDecision?: { type: string; success: boolean };
  },
  context?: {
    playoffContext?: PlayoffContext;
    isWalkoff?: boolean;
    armRatings?: Record<string, number>;
  }
): PlayAttribution {
  // Calculate LI
  const liResult = calculateLeverageIndex(gameState);
  const li = liResult.leverageIndex;
  const playoffMultiplier = context?.playoffContext
    ? getPlayoffMultiplier(context.playoffContext)
    : 1.0;

  const attribution: PlayAttribution = {
    playId,
    gameId,
    inning: gameState.inning,
    leverageIndex: li,
    liResult,
    contactQuality,
    playResult: result,
    participants: {},
    isWalkoff: context?.isWalkoff,
    isClutchSituation: li >= 1.5,
    isHighLeverage: li >= 2.5,
    isPlayoff: context?.playoffContext?.isPlayoff,
    playoffMultiplier,
  };

  // Batter attribution
  if (participants.batterId) {
    const batterConfig = getBatterBaseValue(result, contactQuality);
    let batterBase = batterConfig.base;
    if (batterConfig.useCQ) {
      batterBase = applyContactQualityModifier(batterBase, contactQuality, batterConfig.modifier);
    }
    const batterClutch = calculateParticipantClutch(batterBase, li, playoffMultiplier);

    attribution.participants.batter = {
      playerId: participants.batterId,
      role: 'batter',
      clutchValue: batterClutch,
      baseValue: batterConfig.base,
      liWeight: Math.sqrt(li),
      skillFactor: batterConfig.useCQ ? contactQuality : undefined,
    };
  }

  // Pitcher attribution
  if (participants.pitcherId) {
    const pitcherConfig = getPitcherBaseValue(result, contactQuality);
    let pitcherBase = pitcherConfig.base;
    if (pitcherConfig.useCQ) {
      pitcherBase = applyContactQualityModifier(pitcherBase, contactQuality, pitcherConfig.modifier);
    }
    const pitcherClutch = calculateParticipantClutch(pitcherBase, li, playoffMultiplier);

    attribution.participants.pitcher = {
      playerId: participants.pitcherId,
      role: 'pitcher',
      clutchValue: pitcherClutch,
      baseValue: pitcherConfig.base,
      liWeight: Math.sqrt(li),
      skillFactor: pitcherConfig.useCQ ? contactQuality : undefined,
    };
  }

  // Catcher attribution
  if (participants.catcherId) {
    const catcherBase = getCatcherBaseValue(result);
    const catcherClutch = calculateParticipantClutch(catcherBase, li, playoffMultiplier);

    attribution.participants.catcher = {
      playerId: participants.catcherId,
      role: 'catcher',
      clutchValue: catcherClutch,
      baseValue: catcherBase,
      liWeight: Math.sqrt(li),
    };
  }

  // Fielder attributions
  if (participants.fielders && participants.fielders.length > 0) {
    attribution.participants.fielders = participants.fielders.map((fielder) => {
      let fielderBase = getFielderBaseValue(result, fielder.playType);

      // Apply arm factor for relevant plays
      if (result === 'infield_single') {
        const armFactor = getArmFactor(context?.armRatings?.[fielder.playerId], fielder.position);
        fielderBase += getInfieldSingleArmBlame(fielder.position, armFactor);
      }

      const fielderClutch = calculateParticipantClutch(fielderBase, li, playoffMultiplier);

      return {
        playerId: fielder.playerId,
        role: 'fielder' as const,
        clutchValue: fielderClutch,
        baseValue: fielderBase,
        liWeight: Math.sqrt(li),
        notes: fielder.playType,
      };
    });
  }

  // Runner attributions
  if (participants.runners && participants.runners.length > 0) {
    attribution.participants.runners = participants.runners.map((runner) => {
      const runnerBase = getRunnerBaseValue(runner.action);
      const runnerClutch = calculateParticipantClutch(runnerBase, li, playoffMultiplier);

      return {
        playerId: runner.playerId,
        role: 'runner' as const,
        clutchValue: runnerClutch,
        baseValue: runnerBase,
        liWeight: Math.sqrt(li),
        notes: runner.action,
      };
    });
  }

  // Manager attribution
  if (participants.managerId && participants.managerDecision) {
    const managerBase = getManagerBaseValue(
      participants.managerDecision.type,
      participants.managerDecision.success
    );
    const managerClutch = calculateParticipantClutch(managerBase, li, playoffMultiplier);

    attribution.participants.manager = {
      playerId: participants.managerId,
      role: 'manager',
      clutchValue: managerClutch,
      baseValue: managerBase,
      liWeight: Math.sqrt(li),
      notes: participants.managerDecision.type,
    };
  }

  return attribution;
}

/**
 * Get manager base value by decision type and outcome
 */
export function getManagerBaseValue(decisionType: string, success: boolean): number {
  const values: Record<string, { success: number; failure: number }> = {
    pitching_change: { success: 0.4, failure: -0.3 },
    leave_pitcher_in: { success: 0.2, failure: -0.4 },
    pinch_hitter: { success: 0.5, failure: -0.4 },
    pinch_runner: { success: 0.4, failure: -0.4 },
    defensive_sub: { success: 0.4, failure: -0.3 },
    ibb: { success: 0.3, failure: -0.5 },
    steal_call: { success: 0.3, failure: -0.4 },
    bunt_call: { success: 0.2, failure: -0.4 },
    squeeze_call: { success: 0.6, failure: -0.5 },
    hit_and_run: { success: 0.3, failure: -0.4 },
    shift_on: { success: 0.2, failure: -0.3 },
  };

  const config = values[decisionType] ?? { success: 0.2, failure: -0.2 };
  return success ? config.success : config.failure;
}

// ============================================
// PLAYER STATS ACCUMULATION
// ============================================

/**
 * Create empty player clutch stats
 */
export function createPlayerClutchStats(playerId: string): PlayerClutchStats {
  return {
    playerId,
    clutchPoints: 0,
    chokePoints: 0,
    netClutch: 0,
    clutchMoments: 0,
    chokeMoments: 0,
    totalLIExposure: 0,
    highLeveragePAs: 0,
    plateAppearances: 0,
    playoffClutchPoints: 0,
    playoffChokePoints: 0,
  };
}

/**
 * Accumulate clutch event for a player
 */
export function accumulateClutchEvent(
  stats: PlayerClutchStats,
  clutchValue: number,
  leverageIndex: number,
  isPlayoff: boolean = false
): void {
  if (clutchValue > 0) {
    stats.clutchPoints += clutchValue;
    stats.clutchMoments += 1;
    if (isPlayoff) {
      stats.playoffClutchPoints += clutchValue;
    }
  } else if (clutchValue < 0) {
    stats.chokePoints += Math.abs(clutchValue);
    stats.chokeMoments += 1;
    if (isPlayoff) {
      stats.playoffChokePoints += Math.abs(clutchValue);
    }
  }

  stats.netClutch = stats.clutchPoints - stats.chokePoints;
  stats.totalLIExposure += leverageIndex;
  stats.plateAppearances += 1;

  if (leverageIndex > 1.5) {
    stats.highLeveragePAs += 1;
  }
}

// ============================================
// CLUTCH TIERS AND DISPLAY
// ============================================

/**
 * Get clutch tier for a player
 */
export function getClutchTier(netClutch: number): {
  tier: string;
  icon: string;
  color: string;
} {
  for (const [tierName, config] of Object.entries(CLUTCH_TIERS)) {
    if (netClutch >= config.min) {
      return { tier: tierName, icon: config.icon, color: config.color };
    }
  }
  return { tier: 'Average', icon: '—', color: 'gray' };
}

/**
 * Get confidence level for clutch rating
 */
export function getClutchConfidence(
  highLeveragePAs: number
): 'insufficient' | 'low' | 'moderate' | 'high' {
  if (highLeveragePAs < 10) return 'insufficient';
  if (highLeveragePAs < 25) return 'low';
  if (highLeveragePAs < 50) return 'moderate';
  return 'high';
}

/**
 * Should display clutch rating?
 */
export function shouldDisplayClutchRating(stats: PlayerClutchStats): boolean {
  return (
    stats.highLeveragePAs >= CLUTCH_DISPLAY_CONFIG.minHighLeveragePAs ||
    stats.totalLIExposure >= CLUTCH_DISPLAY_CONFIG.minTotalLIExposure
  );
}

// ============================================
// CLUTCH TRIGGER STACKING
// ============================================

/**
 * Calculate base clutch triggers (before LI application)
 * Uses stacking rules from CLUTCH_ATTRIBUTION_SPEC.md §9.5
 */
export function calculateClutchTriggers(event: {
  isWalkoff?: boolean;
  result?: PlayResult;
  goAheadRBI?: boolean;
  twoOutRBI?: boolean;
  basesLoadedHit?: boolean;
  isGrandSlam?: boolean;
  hitOn0_2Count?: boolean;
  isCloseGame?: boolean;
  inning?: number;
}): number {
  let clutchValue = 0;

  // Category: Walk-off (highest only)
  if (event.isWalkoff) {
    if (event.result === 'HR') {
      clutchValue = Math.max(clutchValue, 3);
    } else if (event.result === 'triple' || event.result === 'double') {
      clutchValue = Math.max(clutchValue, 2);
    } else {
      clutchValue = Math.max(clutchValue, 2);  // Single, walk, etc.
    }
  }

  // Category: RBI Situation (highest only) - only if NOT walk-off
  if (!event.isWalkoff && event.isCloseGame) {
    let rbiSituationValue = 0;
    if (event.goAheadRBI && (event.inning ?? 0) >= 7) {
      rbiSituationValue = Math.max(rbiSituationValue, 1);
    }
    if (event.twoOutRBI) {
      rbiSituationValue = Math.max(rbiSituationValue, 1);
    }
    if (event.basesLoadedHit) {
      rbiSituationValue = Math.max(rbiSituationValue, 1);
    }
    clutchValue += rbiSituationValue;
  }

  // Category: Special Hit (STACKS)
  if (event.isGrandSlam) {
    clutchValue += 2;
  }

  // Category: Count (STACKS)
  if (event.hitOn0_2Count && event.isCloseGame) {
    clutchValue += 1;
  }

  return clutchValue;
}

// ============================================
// SCALING FOR ALL-STAR VOTING
// ============================================

/**
 * Scale a value to a 0-100 range
 */
export function scaleToRange(
  value: number,
  min: number,
  max: number,
  targetMin: number = 0,
  targetMax: number = 100
): number {
  if (max === min) return targetMin;
  return ((value - min) / (max - min)) * (targetMax - targetMin) + targetMin;
}

/**
 * Get clutch component for All-Star voting
 * Per CLUTCH_ATTRIBUTION_SPEC.md §10:
 * votes = (warScaled × 0.50) + (clutchScaled × 0.30) + (narrativeScaled × 0.20)
 */
export function getClutchVotingComponent(
  playerNetClutch: number,
  allPlayersNetClutch: number[]
): number {
  const minClutch = Math.min(...allPlayersNetClutch);
  const maxClutch = Math.max(...allPlayersNetClutch);

  const clutchScaled = scaleToRange(playerNetClutch, minClutch, maxClutch, 0, 100);

  // Apply 30% weight
  return clutchScaled * 0.30;
}
