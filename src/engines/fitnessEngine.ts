/**
 * Fitness Engine - Player Physical Condition System
 *
 * SMB4 has a Fitness system that affects player performance and injury risk.
 * This engine tracks Fitness states, decay, recovery, and injury probability.
 *
 * Per MOJO_FITNESS_SYSTEM_SPEC.md:
 * - 6 categorical states from Juiced (120%) to Hurt (0%)
 * - Fitness degrades based on activity (games played, innings pitched)
 * - Recovery happens on rest days
 * - Juiced is special - requires extended rest or special circumstances
 *
 * @see MOJO_FITNESS_SYSTEM_SPEC.md Section 3
 */

// ============================================
// TYPES
// ============================================

export type FitnessState = 'JUICED' | 'FIT' | 'WELL' | 'STRAINED' | 'WEAK' | 'HURT';

export interface FitnessDefinition {
  state: FitnessState;
  displayName: string;
  value: number;       // Percentage (120, 100, 80, 60, 40, 0)
  multiplier: number;  // Stat multiplier
  canPlay: boolean;
  emoji: string;
  color: string;
  injuryChance: number;      // Per-game injury probability
  severityModifier: number;  // Injury severity multiplier
}

export interface FitnessEntry {
  date: string;
  state: FitnessState;
  reason: FitnessChangeReason;
  previousState?: FitnessState;
  details?: string;
}

export type FitnessChangeReason =
  | 'GAME_PLAYED'
  | 'REST_DAY'
  | 'INJURY'
  | 'RECOVERY'
  | 'RANDOM_EVENT'
  | 'SEASON_START'
  | 'ALL_STAR_BREAK'
  | 'USER_ADJUSTMENT';

export type PlayerPosition =
  | 'SP' | 'RP' | 'CL'  // Pitchers
  | 'C'                  // Catcher
  | '1B' | '2B' | '3B' | 'SS' | 'LF' | 'CF' | 'RF' | 'DH';  // Position players

export type PositionCategory = 'STARTER_PITCHER' | 'RELIEVER' | 'CLOSER' | 'CATCHER' | 'POSITION_PLAYER';

export interface FitnessDecayConfig {
  positionPlayer: {
    started: number;
    pinchHit: number;
    defensiveReplacement: number;
    didNotPlay: number;
  };
  starter: {
    base: number;
    perInning: number;
    highPitchCount: number;  // 100+ pitches
  };
  reliever: {
    base: number;
    perInning: number;
    backToBack: number;
  };
  closer: {
    base: number;
    perInning: number;
    backToBack: number;
  };
  catcher: {
    started: number;
    perInning: number;
    didNotPlay: number;
  };
}

export interface FitnessRecoveryConfig {
  positionPlayer: number;
  pitcher: number;
  catcher: number;
  maxDailyRecovery: number;
  traitModifiers: {
    durable: number;
    injuryProne: number;
  };
  consecutiveRestBonus: Record<number, number>;
}

export interface PlayerFitnessProfile {
  playerId: string;
  currentFitness: FitnessState;
  currentValue: number;           // Granular value (0-120)
  position: PlayerPosition;
  traits: string[];
  age: number;
  consecutiveDaysOff: number;
  lastGamePlayed: string | null;  // Date string
  gamesAtJuiced: number;          // This season
  lastJuicedGame: number | null;  // Game number
  juicedCooldown: number;         // Games until can be Juiced again
  recentlyJuiced: boolean;
  fitnessHistory: FitnessEntry[];
}

export interface InjuryRisk {
  chance: number;           // 0-1 probability
  severityModifier: number;
  riskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'EXTREME';
  recommendation: string;
}

export interface GameActivity {
  started: boolean;
  inningsPlayed: number;
  pitchCount?: number;
  isPitcher: boolean;
  isBackToBack?: boolean;  // Pitched yesterday
  position: PlayerPosition;
}

// ============================================
// CONSTANTS
// ============================================

/**
 * Fitness state definitions
 * Per spec Section 3.1
 */
export const FITNESS_STATES: Record<FitnessState, FitnessDefinition> = {
  JUICED: {
    state: 'JUICED',
    displayName: 'Juiced',
    value: 120,
    multiplier: 1.20,
    canPlay: true,
    emoji: '💉',
    color: '#a855f7', // purple-500
    injuryChance: 0.005,   // 0.5%
    severityModifier: 0.5, // Quick recovery
  },
  FIT: {
    state: 'FIT',
    displayName: 'Fit',
    value: 100,
    multiplier: 1.00,
    canPlay: true,
    emoji: '✓',
    color: '#22c55e', // green-500
    injuryChance: 0.01,    // 1%
    severityModifier: 1.0,
  },
  WELL: {
    state: 'WELL',
    displayName: 'Well',
    value: 80,
    multiplier: 0.95,
    canPlay: true,
    emoji: '~',
    color: '#84cc16', // lime-500
    injuryChance: 0.02,    // 2%
    severityModifier: 1.0,
  },
  STRAINED: {
    state: 'STRAINED',
    displayName: 'Strained',
    value: 60,
    multiplier: 0.85,
    canPlay: true,  // Risky
    emoji: '⚠️',
    color: '#eab308', // yellow-500
    injuryChance: 0.05,    // 5%
    severityModifier: 1.5,
  },
  WEAK: {
    state: 'WEAK',
    displayName: 'Weak',
    value: 40,
    multiplier: 0.70,
    canPlay: true,  // Very risky
    emoji: '⛔',
    color: '#f97316', // orange-500
    injuryChance: 0.15,    // 15%
    severityModifier: 2.0,
  },
  HURT: {
    state: 'HURT',
    displayName: 'Hurt',
    value: 0,
    multiplier: 0.00,
    canPlay: false,
    emoji: '🏥',
    color: '#dc2626', // red-600
    injuryChance: 1.0,     // N/A - already injured
    severityModifier: 1.0,
  },
};

/**
 * Fitness state order (worst to best)
 */
export const FITNESS_STATE_ORDER: FitnessState[] = [
  'HURT', 'WEAK', 'STRAINED', 'WELL', 'FIT', 'JUICED'
];

/**
 * Fitness decay configuration
 * Per spec Section 3.2
 */
export const FITNESS_DECAY: FitnessDecayConfig = {
  positionPlayer: {
    started: -3,
    pinchHit: -1,
    defensiveReplacement: -1,
    didNotPlay: +2, // Recovery
  },
  starter: {
    base: -15,
    perInning: -2,
    highPitchCount: -5, // 100+ pitches
  },
  reliever: {
    base: -5,
    perInning: -3,
    backToBack: -3,
  },
  closer: {
    base: -8,
    perInning: -2,
    backToBack: -5,
  },
  catcher: {
    started: -5,
    perInning: -0.5,
    didNotPlay: +3,
  },
};

/**
 * Fitness recovery configuration
 * Per spec Section 3.3
 */
export const FITNESS_RECOVERY: FitnessRecoveryConfig = {
  positionPlayer: 5,   // +5% per rest day
  pitcher: 8,          // +8% per rest day
  catcher: 6,          // +6% per rest day
  maxDailyRecovery: 15,
  traitModifiers: {
    durable: 1.5,      // 50% faster recovery
    injuryProne: 0.7,  // 30% slower recovery
  },
  consecutiveRestBonus: {
    2: 1.1,   // 2 days off = 10% bonus
    3: 1.2,   // 3 days off = 20% bonus
    4: 1.25,  // 4+ days off = 25% bonus (max)
  },
};

/**
 * Juiced status requirements
 * Per spec Section 3.4
 */
export const JUICED_REQUIREMENTS = {
  minConsecutiveDaysOff: 5,
  cooldownGames: 20,           // Can't be Juiced twice in 20 games
  duration: {
    extendedRest: 3,           // 3 games
    allStarBreak: 10,          // Rest of first half (estimate)
    seasonStart: 10,           // First 10 games
    randomEvent: 5,            // 5 games from "Hot Streak" event
  },
};

// ============================================
// CORE FUNCTIONS
// ============================================

/**
 * Get fitness definition for a state
 */
export function getFitnessDefinition(state: FitnessState): FitnessDefinition {
  return FITNESS_STATES[state];
}

/**
 * Get fitness state from a granular value
 */
export function getFitnessStateFromValue(value: number): FitnessState {
  if (value >= 110) return 'JUICED';
  if (value >= 90) return 'FIT';
  if (value >= 70) return 'WELL';
  if (value >= 50) return 'STRAINED';
  if (value > 0) return 'WEAK';
  return 'HURT';
}

/**
 * Get granular value from a fitness state
 */
export function getFitnessValue(state: FitnessState): number {
  return FITNESS_STATES[state].value;
}

/**
 * Check if a player can play at their current fitness
 */
export function canPlay(state: FitnessState): boolean {
  return FITNESS_STATES[state].canPlay;
}

/**
 * Check if playing at this fitness level is risky
 */
export function isRiskyToPlay(state: FitnessState): boolean {
  return state === 'STRAINED' || state === 'WEAK';
}

/**
 * Get position category for decay/recovery calculations
 */
export function getPositionCategory(position: PlayerPosition): PositionCategory {
  if (position === 'SP') return 'STARTER_PITCHER';
  if (position === 'RP') return 'RELIEVER';
  if (position === 'CL') return 'CLOSER';
  if (position === 'C') return 'CATCHER';
  return 'POSITION_PLAYER';
}

// ============================================
// STAT MULTIPLIERS
// ============================================

/**
 * Get stat multiplier for a fitness state
 * Per spec Section 8.1
 */
export function getFitnessStatMultiplier(state: FitnessState): number {
  return FITNESS_STATES[state].multiplier;
}

/**
 * Apply fitness to a stat value
 */
export function applyFitnessToStat(baseStat: number, fitness: FitnessState): number {
  return Math.round(baseStat * getFitnessStatMultiplier(fitness));
}

/**
 * Apply both Mojo and Fitness to stats
 */
export function applyCombinedMultiplier(
  baseStat: number,
  mojoMultiplier: number,
  fitness: FitnessState
): number {
  const fitnessMultiplier = getFitnessStatMultiplier(fitness);
  return Math.round(baseStat * mojoMultiplier * fitnessMultiplier);
}

// ============================================
// DECAY CALCULATION
// ============================================

/**
 * Calculate fitness decay from game activity
 * Per spec Section 3.2
 */
export function calculateFitnessDecay(
  activity: GameActivity,
  currentValue: number
): number {
  const category = getPositionCategory(activity.position);
  let decay = 0;

  switch (category) {
    case 'STARTER_PITCHER':
      if (activity.started) {
        decay = FITNESS_DECAY.starter.base;
        decay += FITNESS_DECAY.starter.perInning * activity.inningsPlayed;
        if (activity.pitchCount && activity.pitchCount >= 100) {
          decay += FITNESS_DECAY.starter.highPitchCount;
        }
      } else {
        decay = FITNESS_DECAY.positionPlayer.didNotPlay; // Recovery for starters who don't pitch
      }
      break;

    case 'RELIEVER':
      if (activity.started || activity.inningsPlayed > 0) {
        decay = FITNESS_DECAY.reliever.base;
        decay += FITNESS_DECAY.reliever.perInning * activity.inningsPlayed;
        if (activity.isBackToBack) {
          decay += FITNESS_DECAY.reliever.backToBack;
        }
      } else {
        decay = FITNESS_DECAY.positionPlayer.didNotPlay * 1.5; // Better recovery for relievers
      }
      break;

    case 'CLOSER':
      if (activity.started || activity.inningsPlayed > 0) {
        decay = FITNESS_DECAY.closer.base;
        decay += FITNESS_DECAY.closer.perInning * activity.inningsPlayed;
        if (activity.isBackToBack) {
          decay += FITNESS_DECAY.closer.backToBack;
        }
      } else {
        decay = FITNESS_DECAY.positionPlayer.didNotPlay * 1.5;
      }
      break;

    case 'CATCHER':
      if (activity.started) {
        decay = FITNESS_DECAY.catcher.started;
        decay += FITNESS_DECAY.catcher.perInning * activity.inningsPlayed;
      } else {
        decay = FITNESS_DECAY.catcher.didNotPlay;
      }
      break;

    case 'POSITION_PLAYER':
    default:
      if (activity.started) {
        decay = FITNESS_DECAY.positionPlayer.started;
      } else if (activity.inningsPlayed > 0) {
        // Came in as substitute
        decay = FITNESS_DECAY.positionPlayer.pinchHit;
      } else {
        decay = FITNESS_DECAY.positionPlayer.didNotPlay;
      }
      break;
  }

  return decay;
}

/**
 * Apply fitness decay to a player profile
 */
export function applyFitnessDecay(
  profile: PlayerFitnessProfile,
  activity: GameActivity,
  gameDate: string
): PlayerFitnessProfile {
  const decay = calculateFitnessDecay(activity, profile.currentValue);
  const newValue = Math.max(0, Math.min(120, profile.currentValue + decay));
  const newState = getFitnessStateFromValue(newValue);

  const entry: FitnessEntry = {
    date: gameDate,
    state: newState,
    reason: activity.started || activity.inningsPlayed > 0 ? 'GAME_PLAYED' : 'REST_DAY',
    previousState: profile.currentFitness,
    details: `Decay: ${decay}, Innings: ${activity.inningsPlayed}`,
  };

  return {
    ...profile,
    currentFitness: newState,
    currentValue: newValue,
    consecutiveDaysOff: activity.started || activity.inningsPlayed > 0 ? 0 : profile.consecutiveDaysOff + 1,
    lastGamePlayed: activity.started || activity.inningsPlayed > 0 ? gameDate : profile.lastGamePlayed,
    fitnessHistory: [...profile.fitnessHistory, entry],
  };
}

// ============================================
// RECOVERY CALCULATION
// ============================================

/**
 * Calculate daily recovery for a player
 * Per spec Section 3.3
 */
export function calculateDailyRecovery(
  position: PlayerPosition,
  traits: string[],
  consecutiveDaysOff: number
): number {
  const category = getPositionCategory(position);

  // Base recovery rate by position
  let baseRecovery: number;
  switch (category) {
    case 'STARTER_PITCHER':
    case 'RELIEVER':
    case 'CLOSER':
      baseRecovery = FITNESS_RECOVERY.pitcher;
      break;
    case 'CATCHER':
      baseRecovery = FITNESS_RECOVERY.catcher;
      break;
    default:
      baseRecovery = FITNESS_RECOVERY.positionPlayer;
  }

  // Apply trait modifiers
  if (traits.includes('Durable')) {
    baseRecovery *= FITNESS_RECOVERY.traitModifiers.durable;
  } else if (traits.includes('Injury Prone')) {
    baseRecovery *= FITNESS_RECOVERY.traitModifiers.injuryProne;
  }

  // Apply consecutive rest bonus
  const restDays = Math.min(consecutiveDaysOff, 4);
  const restBonus = FITNESS_RECOVERY.consecutiveRestBonus[restDays] || 1;
  baseRecovery *= restBonus;

  // Cap at max daily recovery
  return Math.min(baseRecovery, FITNESS_RECOVERY.maxDailyRecovery);
}

/**
 * Apply recovery to a player profile
 */
export function applyRecovery(
  profile: PlayerFitnessProfile,
  date: string
): PlayerFitnessProfile {
  // Can't recover past Fit (100%) normally - Juiced requires special circumstances
  const maxRecovery = 100;

  const recovery = calculateDailyRecovery(
    profile.position,
    profile.traits,
    profile.consecutiveDaysOff
  );

  const newValue = Math.min(maxRecovery, profile.currentValue + recovery);
  const newState = getFitnessStateFromValue(newValue);

  // Check if became eligible for Juiced
  const becameJuicedEligible = checkJuicedEligibility(profile);

  const entry: FitnessEntry = {
    date,
    state: newState,
    reason: 'RECOVERY',
    previousState: profile.currentFitness,
    details: `Recovery: +${recovery}`,
  };

  return {
    ...profile,
    currentFitness: newState,
    currentValue: newValue,
    consecutiveDaysOff: profile.consecutiveDaysOff + 1,
    fitnessHistory: [...profile.fitnessHistory, entry],
  };
}

// ============================================
// JUICED STATUS
// ============================================

/**
 * Check if a player is eligible for Juiced status
 * Per spec Section 3.4
 */
export function checkJuicedEligibility(profile: PlayerFitnessProfile): boolean {
  return (
    profile.currentValue >= 100 &&                                    // Must be Fit
    profile.consecutiveDaysOff >= JUICED_REQUIREMENTS.minConsecutiveDaysOff && // Extended rest
    !profile.recentlyJuiced &&                                        // Not on cooldown
    profile.juicedCooldown === 0
  );
}

/**
 * Apply Juiced status to a player
 */
export function applyJuicedStatus(
  profile: PlayerFitnessProfile,
  date: string,
  duration: number,
  reason: string
): PlayerFitnessProfile {
  const entry: FitnessEntry = {
    date,
    state: 'JUICED',
    reason: 'RANDOM_EVENT',
    previousState: profile.currentFitness,
    details: reason,
  };

  return {
    ...profile,
    currentFitness: 'JUICED',
    currentValue: 120,
    gamesAtJuiced: 0,                  // Reset counter
    recentlyJuiced: true,
    juicedCooldown: JUICED_REQUIREMENTS.cooldownGames,
    fitnessHistory: [...profile.fitnessHistory, entry],
  };
}

/**
 * Decrement Juiced duration and cooldown after a game
 */
export function updateJuicedStatus(
  profile: PlayerFitnessProfile,
  playedWhileJuiced: boolean
): PlayerFitnessProfile {
  let updated = { ...profile };

  // Decrement cooldown
  if (updated.juicedCooldown > 0) {
    updated.juicedCooldown--;
    if (updated.juicedCooldown === 0) {
      updated.recentlyJuiced = false;
    }
  }

  // Track games played while Juiced
  if (playedWhileJuiced && updated.currentFitness === 'JUICED') {
    updated.gamesAtJuiced++;
  }

  return updated;
}

// ============================================
// INJURY RISK
// ============================================

/**
 * Calculate injury risk for a player
 * Per spec Section 3.5
 */
export function calculateInjuryRisk(profile: PlayerFitnessProfile): InjuryRisk {
  const fitnessDef = FITNESS_STATES[profile.currentFitness];
  let baseRisk = fitnessDef.injuryChance;

  // Position modifiers
  const category = getPositionCategory(profile.position);
  if (category === 'CATCHER') {
    baseRisk *= 1.3; // Catchers more injury-prone
  } else if (category === 'STARTER_PITCHER' || category === 'RELIEVER' || category === 'CLOSER') {
    baseRisk *= 1.1; // Pitchers slightly elevated
  }

  // Trait modifiers
  if (profile.traits.includes('Durable')) {
    baseRisk *= 0.6;
  } else if (profile.traits.includes('Injury Prone')) {
    baseRisk *= 1.8;
  }

  // Age modifiers
  if (profile.age >= 38) {
    baseRisk *= 1.6;
  } else if (profile.age >= 35) {
    baseRisk *= 1.3;
  }

  // Determine risk level
  let riskLevel: InjuryRisk['riskLevel'];
  let recommendation: string;

  if (baseRisk >= 0.10) {
    riskLevel = 'EXTREME';
    recommendation = 'STRONGLY recommend rest - very high injury risk';
  } else if (baseRisk >= 0.05) {
    riskLevel = 'HIGH';
    recommendation = 'Consider resting - elevated injury risk';
  } else if (baseRisk >= 0.02) {
    riskLevel = 'MODERATE';
    recommendation = 'Playable but monitor closely';
  } else {
    riskLevel = 'LOW';
    recommendation = 'Good to play';
  }

  return {
    chance: baseRisk,
    severityModifier: fitnessDef.severityModifier,
    riskLevel,
    recommendation,
  };
}

/**
 * Roll for injury based on risk
 * Returns true if injured
 */
export function rollForInjury(risk: InjuryRisk): boolean {
  return Math.random() < risk.chance;
}

// ============================================
// FAME INTEGRATION
// ============================================

/**
 * Get Fitness modifier for Fame calculations
 * Per spec Section 4.1
 */
export function getFitnessFameModifier(fitness: FitnessState): number {
  const modifiers: Record<FitnessState, number> = {
    JUICED: 0.5,      // 50% Fame credit when Juiced (PED stigma)
    FIT: 1.0,         // Baseline
    WELL: 1.0,        // No penalty
    STRAINED: 1.15,   // +15% "playing hurt"
    WEAK: 1.25,       // +25% "gutsy performance"
    HURT: 0,          // Can't play
  };
  return modifiers[fitness];
}

/**
 * Get WAR multiplier for Fitness state
 * Per spec Section 5.1
 */
export function getFitnessWARMultiplier(fitness: FitnessState): number {
  const multipliers: Record<FitnessState, number> = {
    JUICED: 0.85,     // -15% for enhanced performance
    FIT: 1.0,         // Baseline
    WELL: 1.0,        // No adjustment
    STRAINED: 1.10,   // +10% for playing through pain
    WEAK: 1.20,       // +20% for gutsy performance
    HURT: 0,          // Can't play
  };
  return multipliers[fitness];
}

/**
 * Calculate adjusted Fame value accounting for Mojo and Fitness
 * Per spec Section 4.3
 */
export function calculateAdjustedFame(
  baseFame: number,
  mojoFameModifier: number,
  fitness: FitnessState
): number {
  let adjusted = baseFame;

  // Apply Mojo modifier
  adjusted *= mojoFameModifier;

  // Apply Fitness modifier
  adjusted *= getFitnessFameModifier(fitness);

  return Math.round(adjusted);
}

// ============================================
// PROFILE MANAGEMENT
// ============================================

/**
 * Create a new player fitness profile
 */
export function createFitnessProfile(
  playerId: string,
  position: PlayerPosition,
  traits: string[] = [],
  age: number = 25,
  startingFitness: FitnessState = 'FIT'
): PlayerFitnessProfile {
  return {
    playerId,
    currentFitness: startingFitness,
    currentValue: getFitnessValue(startingFitness),
    position,
    traits,
    age,
    consecutiveDaysOff: 0,
    lastGamePlayed: null,
    gamesAtJuiced: 0,
    lastJuicedGame: null,
    juicedCooldown: 0,
    recentlyJuiced: false,
    fitnessHistory: [{
      date: new Date().toISOString().split('T')[0],
      state: startingFitness,
      reason: 'SEASON_START',
    }],
  };
}

/**
 * Create fresh season-start profile (Juiced for first 10 games)
 */
export function createSeasonStartProfile(
  playerId: string,
  position: PlayerPosition,
  traits: string[] = [],
  age: number = 25
): PlayerFitnessProfile {
  return {
    playerId,
    currentFitness: 'JUICED',
    currentValue: 120,
    position,
    traits,
    age,
    consecutiveDaysOff: 0,
    lastGamePlayed: null,
    gamesAtJuiced: 0,
    lastJuicedGame: null,
    juicedCooldown: JUICED_REQUIREMENTS.duration.seasonStart, // Will naturally decay
    recentlyJuiced: false, // Fresh season
    fitnessHistory: [{
      date: new Date().toISOString().split('T')[0],
      state: 'JUICED',
      reason: 'SEASON_START',
      details: 'Fresh start, first 10 games Juiced',
    }],
  };
}

// ============================================
// RECOVERY PROJECTION
// ============================================

export interface RecoveryProjection {
  playerId: string;
  currentFitness: FitnessState;
  currentValue: number;
  daysToFit: number;
  daysToJuiced: number | null;  // null if not achievable
  recommendedRestDays: number;
  injuryRiskIfPlayed: InjuryRisk;
}

/**
 * Project recovery timeline for a player
 * Per spec Section 7.2
 */
export function projectRecovery(profile: PlayerFitnessProfile): RecoveryProjection {
  const toFit = 100 - profile.currentValue;
  const dailyRecovery = calculateDailyRecovery(
    profile.position,
    profile.traits,
    profile.consecutiveDaysOff
  );

  const daysToFit = toFit > 0 ? Math.ceil(toFit / dailyRecovery) : 0;

  // Days to Juiced: Need to be at Fit (100) for 5 consecutive days
  let daysToJuiced: number | null = null;
  if (profile.currentValue >= 100 && !profile.recentlyJuiced) {
    daysToJuiced = Math.max(0, JUICED_REQUIREMENTS.minConsecutiveDaysOff - profile.consecutiveDaysOff);
  } else if (!profile.recentlyJuiced) {
    daysToJuiced = daysToFit + JUICED_REQUIREMENTS.minConsecutiveDaysOff;
  }

  // Recommended rest based on current fitness
  let recommendedRestDays: number;
  switch (profile.currentFitness) {
    case 'JUICED':
    case 'FIT':
      recommendedRestDays = 0;
      break;
    case 'WELL':
      recommendedRestDays = 1;
      break;
    case 'STRAINED':
      recommendedRestDays = 2;
      break;
    case 'WEAK':
      recommendedRestDays = 4;
      break;
    case 'HURT':
      recommendedRestDays = daysToFit;
      break;
    default:
      recommendedRestDays = 0;
  }

  return {
    playerId: profile.playerId,
    currentFitness: profile.currentFitness,
    currentValue: profile.currentValue,
    daysToFit,
    daysToJuiced,
    recommendedRestDays,
    injuryRiskIfPlayed: calculateInjuryRisk(profile),
  };
}

// ============================================
// DISPLAY HELPERS
// ============================================

/**
 * Get color for fitness display
 */
export function getFitnessColor(fitness: FitnessState): string {
  return FITNESS_STATES[fitness].color;
}

/**
 * Get emoji for fitness display
 */
export function getFitnessEmoji(fitness: FitnessState): string {
  return FITNESS_STATES[fitness].emoji;
}

/**
 * Get fitness bar fill percentage (0-100)
 */
export function getFitnessBarFill(value: number): number {
  // Map 0-120 → 0-100
  return Math.min(100, (value / 120) * 100);
}

/**
 * Format fitness for display
 */
export function formatFitness(fitness: FitnessState): string {
  const def = FITNESS_STATES[fitness];
  return `${def.emoji} ${def.displayName}`;
}

/**
 * Get narrative description of fitness
 */
export function getFitnessNarrative(fitness: FitnessState, playerName: string = 'Player'): string {
  const narratives: Record<FitnessState, string> = {
    JUICED: `${playerName} is in peak physical condition - look out!`,
    FIT: `${playerName} is healthy and ready to go`,
    WELL: `${playerName} has minor fatigue but can play`,
    STRAINED: `${playerName} is playing through some discomfort`,
    WEAK: `${playerName} is clearly struggling physically - injury risk elevated`,
    HURT: `${playerName} is injured and on the IL`,
  };
  return narratives[fitness];
}

/**
 * Get PED stigma narrative for Juiced players
 * Per spec Section 4.1
 */
export function getJuicedStigmaNarrative(): string[] {
  return [
    "Fans notice {player} looking suspiciously spry...",
    "{player}'s 'fitness regimen' raising eyebrows in the stands",
    "What's in {player}'s protein shake? Fans want to know",
    "Beat writer notes {player} seems 'unnaturally fresh'",
    "Social media buzzing about {player}'s sudden energy boost",
  ];
}

/**
 * Get random Juiced stigma narrative
 */
export function getRandomJuicedNarrative(playerName: string): string {
  const narratives = getJuicedStigmaNarrative();
  const narrative = narratives[Math.floor(Math.random() * narratives.length)];
  return narrative.replace('{player}', playerName);
}
