/**
 * Mojo Engine - Player Confidence/Momentum System
 *
 * SMB4 has a Mojo system that affects player performance.
 * This engine tracks Mojo states, triggers, effects, and carryover.
 *
 * Per MOJO_FITNESS_SYSTEM_SPEC.md:
 * - 5-level scale from -2 (Rattled) to +2 (Jacked)
 * - Mojo affects stats by ~10% per level
 * - Mojo changes based on in-game events
 * - Partial carryover between games (30%)
 *
 * @see MOJO_FITNESS_SYSTEM_SPEC.md Section 2
 */

// ============================================
// TYPES
// ============================================

export type MojoLevel = -2 | -1 | 0 | 1 | 2;

export type MojoName = 'RATTLED' | 'TENSE' | 'NORMAL' | 'LOCKED_IN' | 'JACKED';

export interface MojoState {
  level: MojoLevel;
  name: MojoName;
  displayName: string;
  emoji: string;
  statMultiplier: number;
}

export interface MojoChangeEvent {
  playerId: string;
  gameId: string;
  previousMojo: MojoLevel;
  newMojo: MojoLevel;
  trigger: MojoTrigger;
  delta: number;
  timestamp: number;
  inningNumber?: number;
  plateAppearance?: number;
}

export type MojoTrigger =
  // Positive triggers
  | 'SINGLE'
  | 'DOUBLE'
  | 'TRIPLE'
  | 'HOME_RUN'
  | 'RBI'
  | 'STOLEN_BASE'
  | 'GREAT_DEFENSIVE_PLAY'
  | 'PITCHER_STRIKEOUT'
  | 'PITCHER_OUT'
  | 'PITCHER_CLEAN_INNING'
  // Negative triggers
  | 'STRIKEOUT'
  | 'BATTER_OUT'
  | 'ERROR'
  | 'CAUGHT_STEALING'
  | 'PITCHER_WALK'
  | 'PITCHER_HIT'
  | 'PITCHER_XBH'
  | 'PITCHER_RUN'
  | 'WILD_PITCH'
  | 'PASSED_BALL'
  // Manual/User-reported
  | 'USER_ADJUSTMENT';

export interface MojoTriggerValue {
  trigger: MojoTrigger;
  baseDelta: number;
  description: string;
}

export interface MojoEntry {
  gameId: string;
  playerId: string;
  startingMojo: MojoLevel;
  endingMojo: MojoLevel;
  peakMojo: MojoLevel;
  lowMojo: MojoLevel;
  events: MojoChangeEvent[];
}

export interface MojoGameSnapshot {
  playerId: string;
  startingMojo: MojoLevel;
  currentMojo: MojoLevel;
  endingMojo?: MojoLevel;
}

export interface MojoAmplification {
  tieGameLateInnings: number;
  rispTwoOuts: number;
  closeGame: number;
  playoffGame: number;
  basesLoaded: number;
}

// ============================================
// CONSTANTS
// ============================================

/**
 * Mojo state definitions
 * Per spec Section 2.1
 */
export const MOJO_STATES: Record<MojoLevel, MojoState> = {
  [-2]: {
    level: -2,
    name: 'RATTLED',
    displayName: 'Rattled',
    emoji: '😱',
    statMultiplier: 0.82, // -18%
  },
  [-1]: {
    level: -1,
    name: 'TENSE',
    displayName: 'Tense',
    emoji: '😰',
    statMultiplier: 0.90, // -10%
  },
  [0]: {
    level: 0,
    name: 'NORMAL',
    displayName: 'Normal',
    emoji: '➖',
    statMultiplier: 1.00, // baseline
  },
  [1]: {
    level: 1,
    name: 'LOCKED_IN',
    displayName: 'Locked In',
    emoji: '🔥🔥',
    statMultiplier: 1.10, // +10%
  },
  [2]: {
    level: 2,
    name: 'JACKED',
    displayName: 'Jacked',
    emoji: '🔥🔥🔥',
    statMultiplier: 1.18, // +18%
  },
};

/**
 * Mojo trigger values
 * Per spec Section 2.2
 */
export const MOJO_TRIGGERS: Record<MojoTrigger, MojoTriggerValue> = {
  // Positive (Mojo Up)
  SINGLE: { trigger: 'SINGLE', baseDelta: 0.5, description: 'Getting a single' },
  DOUBLE: { trigger: 'DOUBLE', baseDelta: 0.75, description: 'Getting a double' },
  TRIPLE: { trigger: 'TRIPLE', baseDelta: 1.0, description: 'Getting a triple' },
  HOME_RUN: { trigger: 'HOME_RUN', baseDelta: 1.5, description: 'Hitting a home run' },
  RBI: { trigger: 'RBI', baseDelta: 0.5, description: 'Driving in a run' },
  STOLEN_BASE: { trigger: 'STOLEN_BASE', baseDelta: 0.5, description: 'Stealing a base' },
  GREAT_DEFENSIVE_PLAY: { trigger: 'GREAT_DEFENSIVE_PLAY', baseDelta: 0.5, description: 'Making a great defensive play' },
  PITCHER_STRIKEOUT: { trigger: 'PITCHER_STRIKEOUT', baseDelta: 0.5, description: 'Recording a strikeout' },
  PITCHER_OUT: { trigger: 'PITCHER_OUT', baseDelta: 0.3, description: 'Recording an out' },
  PITCHER_CLEAN_INNING: { trigger: 'PITCHER_CLEAN_INNING', baseDelta: 0.5, description: 'Pitching a clean inning' },

  // Negative (Mojo Down)
  STRIKEOUT: { trigger: 'STRIKEOUT', baseDelta: -0.5, description: 'Striking out' },
  BATTER_OUT: { trigger: 'BATTER_OUT', baseDelta: -0.3, description: 'Making an out' },
  ERROR: { trigger: 'ERROR', baseDelta: -1.0, description: 'Committing an error' },
  CAUGHT_STEALING: { trigger: 'CAUGHT_STEALING', baseDelta: -1.0, description: 'Getting caught stealing' },
  PITCHER_WALK: { trigger: 'PITCHER_WALK', baseDelta: -0.5, description: 'Issuing a walk' },
  PITCHER_HIT: { trigger: 'PITCHER_HIT', baseDelta: -0.3, description: 'Allowing a hit' },
  PITCHER_XBH: { trigger: 'PITCHER_XBH', baseDelta: -0.75, description: 'Allowing an extra-base hit' },
  PITCHER_RUN: { trigger: 'PITCHER_RUN', baseDelta: -1.0, description: 'Allowing a run' },
  WILD_PITCH: { trigger: 'WILD_PITCH', baseDelta: -0.5, description: 'Throwing a wild pitch' },
  PASSED_BALL: { trigger: 'PASSED_BALL', baseDelta: -0.5, description: 'Allowing a passed ball' },

  // Manual
  USER_ADJUSTMENT: { trigger: 'USER_ADJUSTMENT', baseDelta: 0, description: 'User-reported adjustment' },
};

/**
 * Situational amplification multipliers
 * Per spec Section 2.3
 */
export const MOJO_AMPLIFICATION: MojoAmplification = {
  tieGameLateInnings: 1.5, // 8th/9th inning, tied
  rispTwoOuts: 1.3,        // RISP, 2 outs
  closeGame: 1.2,          // Within 1-2 runs
  playoffGame: 1.5,        // Maximum stakes
  basesLoaded: 1.4,        // High leverage
};

/**
 * Carryover rate between games
 * Per spec Section 2.4
 */
export const MOJO_CARRYOVER_RATE = 0.3; // 30%

// ============================================
// CORE FUNCTIONS
// ============================================

/**
 * Get the Mojo state object for a given level
 */
export function getMojoState(level: MojoLevel): MojoState {
  return MOJO_STATES[level];
}

/**
 * Get display name for a Mojo level
 */
export function getMojoDisplayName(level: MojoLevel): string {
  return MOJO_STATES[level].displayName;
}

/**
 * Get emoji for a Mojo level
 */
export function getMojoEmoji(level: MojoLevel): string {
  return MOJO_STATES[level].emoji;
}

/**
 * Clamp a Mojo value to valid range (-2 to +2)
 */
export function clampMojo(value: number): MojoLevel {
  return Math.max(-2, Math.min(2, Math.round(value))) as MojoLevel;
}

/**
 * Check if a value is a valid MojoLevel
 */
export function isValidMojoLevel(value: number): value is MojoLevel {
  return value >= -2 && value <= 2 && Number.isInteger(value);
}

// ============================================
// STAT MULTIPLIERS
// ============================================

/**
 * Get stat multiplier for a Mojo level
 * Per spec Section 8.1: getMojoStatMultiplier
 */
export function getMojoStatMultiplier(mojo: MojoLevel): number {
  return MOJO_STATES[mojo].statMultiplier;
}

/**
 * Apply Mojo to a stat value
 */
export function applyMojoToStat(baseStat: number, mojo: MojoLevel): number {
  return Math.round(baseStat * getMojoStatMultiplier(mojo));
}

/**
 * Get all stats adjusted for Mojo
 */
export interface AdjustedStats {
  power: number;
  contact: number;
  speed: number;
  fielding: number;
  arm: number;
  velocity?: number;
  junk?: number;
  accuracy?: number;
}

export interface BaseStats {
  power: number;
  contact: number;
  speed: number;
  fielding: number;
  arm: number;
  velocity?: number;
  junk?: number;
  accuracy?: number;
}

export function applyMojoToAllStats(baseStats: BaseStats, mojo: MojoLevel): AdjustedStats {
  const multiplier = getMojoStatMultiplier(mojo);

  return {
    power: Math.round(baseStats.power * multiplier),
    contact: Math.round(baseStats.contact * multiplier),
    speed: Math.round(baseStats.speed * multiplier), // Mojo affects speed less (optional per spec)
    fielding: Math.round(baseStats.fielding * multiplier),
    arm: Math.round(baseStats.arm * multiplier),
    velocity: baseStats.velocity ? Math.round(baseStats.velocity * multiplier) : undefined,
    junk: baseStats.junk ? Math.round(baseStats.junk * multiplier) : undefined,
    accuracy: baseStats.accuracy ? Math.round(baseStats.accuracy * multiplier) : undefined,
  };
}

// ============================================
// MOJO CHANGE CALCULATION
// ============================================

/**
 * Calculate the amplification multiplier for a situation
 */
export interface GameSituation {
  inning: number;
  isBottom: boolean;
  outs: number;
  runnersOn: number[]; // Bases with runners (1, 2, 3)
  scoreDiff: number;   // Home perspective (positive = home leading)
  isPlayoff: boolean;
}

export function calculateAmplification(situation: GameSituation): number {
  let amplification = 1.0;

  // Tie game late innings (8th/9th)
  if (situation.scoreDiff === 0 && situation.inning >= 8) {
    amplification *= MOJO_AMPLIFICATION.tieGameLateInnings;
  }

  // RISP with 2 outs
  const hasRISP = situation.runnersOn.includes(2) || situation.runnersOn.includes(3);
  if (hasRISP && situation.outs === 2) {
    amplification *= MOJO_AMPLIFICATION.rispTwoOuts;
  }

  // Close game (within 2 runs)
  if (Math.abs(situation.scoreDiff) <= 2 && situation.scoreDiff !== 0) {
    amplification *= MOJO_AMPLIFICATION.closeGame;
  }

  // Playoff game
  if (situation.isPlayoff) {
    amplification *= MOJO_AMPLIFICATION.playoffGame;
  }

  // Bases loaded
  if (situation.runnersOn.length === 3) {
    amplification *= MOJO_AMPLIFICATION.basesLoaded;
  }

  return amplification;
}

/**
 * Calculate raw Mojo change from a trigger
 */
export function getMojoDelta(trigger: MojoTrigger, situation?: GameSituation): number {
  const triggerData = MOJO_TRIGGERS[trigger];
  if (!triggerData) return 0;

  let delta = triggerData.baseDelta;

  // Apply amplification if situation provided
  if (situation) {
    const amplification = calculateAmplification(situation);
    delta *= amplification;
  }

  return delta;
}

/**
 * Apply a Mojo change and return the new level
 */
export function applyMojoChange(
  currentMojo: MojoLevel,
  trigger: MojoTrigger,
  situation?: GameSituation,
  customDelta?: number
): { newMojo: MojoLevel; actualDelta: number } {
  const delta = customDelta ?? getMojoDelta(trigger, situation);

  // Rattled is "sticky" - harder to escape
  // Per spec: "Once a player gets Rattled, it's very difficult to climb back out"
  let adjustedDelta = delta;
  if (currentMojo === -2 && delta > 0) {
    // Need extra positive events to escape Rattled
    adjustedDelta = delta * 0.7; // 30% penalty on positive changes
  }

  const rawNewMojo = currentMojo + adjustedDelta;
  const newMojo = clampMojo(rawNewMojo);
  const actualDelta = newMojo - currentMojo;

  return { newMojo, actualDelta };
}

/**
 * Process multiple triggers and return final Mojo
 */
export function processMojoTriggers(
  startingMojo: MojoLevel,
  triggers: Array<{ trigger: MojoTrigger; situation?: GameSituation }>,
  gameId: string,
  playerId: string
): { finalMojo: MojoLevel; events: MojoChangeEvent[] } {
  let currentMojo = startingMojo;
  const events: MojoChangeEvent[] = [];

  for (const { trigger, situation } of triggers) {
    const { newMojo, actualDelta } = applyMojoChange(currentMojo, trigger, situation);

    if (actualDelta !== 0) {
      events.push({
        playerId,
        gameId,
        previousMojo: currentMojo,
        newMojo,
        trigger,
        delta: actualDelta,
        timestamp: Date.now(),
      });
      currentMojo = newMojo;
    }
  }

  return { finalMojo: currentMojo, events };
}

// ============================================
// CARRYOVER CALCULATION
// ============================================

/**
 * Calculate starting Mojo for next game based on ending Mojo
 * Per spec Section 2.4
 *
 * Formula: nextStartMojo = 0 + (endMojo * 0.3)
 */
export function calculateStartingMojo(endOfLastGameMojo: MojoLevel): MojoLevel {
  const carryover = endOfLastGameMojo * MOJO_CARRYOVER_RATE;
  return clampMojo(Math.round(carryover));
}

/**
 * Get next game's starting Mojo with explanation
 */
export function getCarryoverExplanation(endMojo: MojoLevel): {
  startingMojo: MojoLevel;
  explanation: string;
} {
  const startingMojo = calculateStartingMojo(endMojo);
  const endState = MOJO_STATES[endMojo];
  const startState = MOJO_STATES[startingMojo];

  let explanation: string;
  if (endMojo === 0) {
    explanation = 'Ended at Normal, starts next game at Normal';
  } else if (endMojo > 0) {
    explanation = `Ended ${endState.displayName} (+${endMojo}), 30% carries → starts ${startState.displayName}`;
  } else {
    explanation = `Ended ${endState.displayName} (${endMojo}), 30% carries → starts ${startState.displayName}`;
  }

  return { startingMojo, explanation };
}

// ============================================
// GAME TRACKING
// ============================================

/**
 * Create a new game Mojo entry
 */
export function createMojoEntry(
  gameId: string,
  playerId: string,
  startingMojo: MojoLevel
): MojoEntry {
  return {
    gameId,
    playerId,
    startingMojo,
    endingMojo: startingMojo,
    peakMojo: startingMojo,
    lowMojo: startingMojo,
    events: [],
  };
}

/**
 * Update a Mojo entry with a new event
 */
export function updateMojoEntry(
  entry: MojoEntry,
  event: MojoChangeEvent
): MojoEntry {
  const newPeak = Math.max(entry.peakMojo, event.newMojo) as MojoLevel;
  const newLow = Math.min(entry.lowMojo, event.newMojo) as MojoLevel;

  return {
    ...entry,
    endingMojo: event.newMojo,
    peakMojo: newPeak,
    lowMojo: newLow,
    events: [...entry.events, event],
  };
}

/**
 * Calculate Mojo statistics for a game
 */
export interface MojoGameStats {
  startingMojo: MojoLevel;
  endingMojo: MojoLevel;
  peakMojo: MojoLevel;
  lowMojo: MojoLevel;
  totalSwing: number; // Total absolute change
  netChange: number;
  positiveEvents: number;
  negativeEvents: number;
}

export function calculateMojoGameStats(entry: MojoEntry): MojoGameStats {
  let positiveEvents = 0;
  let negativeEvents = 0;
  let totalSwing = 0;

  for (const event of entry.events) {
    if (event.delta > 0) positiveEvents++;
    else if (event.delta < 0) negativeEvents++;
    totalSwing += Math.abs(event.delta);
  }

  return {
    startingMojo: entry.startingMojo,
    endingMojo: entry.endingMojo,
    peakMojo: entry.peakMojo,
    lowMojo: entry.lowMojo,
    totalSwing: Math.round(totalSwing * 100) / 100,
    netChange: entry.endingMojo - entry.startingMojo,
    positiveEvents,
    negativeEvents,
  };
}

// ============================================
// FAME INTEGRATION
// ============================================

/**
 * Get Fame modifier based on Mojo state
 * Per spec Section 4.2: Achievements while disadvantaged are MORE impressive
 */
export function getMojoFameModifier(mojo: MojoLevel): number {
  const modifiers: Record<MojoLevel, number> = {
    [-2]: 1.30, // +30% for Rattled (hardest to overcome)
    [-1]: 1.15, // +15% for Tense
    [0]: 1.00,  // Baseline
    [1]: 0.90,  // -10% for Locked In
    [2]: 0.80,  // -20% for Jacked
  };
  return modifiers[mojo];
}

/**
 * Get WAR multiplier based on Mojo state
 * Per spec Section 5.1
 */
export function getMojoWARMultiplier(mojo: MojoLevel): number {
  const multipliers: Record<MojoLevel, number> = {
    [-2]: 1.15, // +15% for overcoming Rattled
    [-1]: 1.07, // +7% for Tense
    [0]: 1.00,  // Baseline
    [1]: 0.95,  // -5% for Locked In
    [2]: 0.90,  // -10% for Jacked
  };
  return multipliers[mojo];
}

/**
 * Get Clutch multiplier based on Mojo state
 * Per spec Section 5.2: Being clutch when Rattled is MORE impressive
 */
export function getMojoClutchMultiplier(mojo: MojoLevel): number {
  const multipliers: Record<MojoLevel, number> = {
    [-2]: 1.30, // +30% clutch credit for Rattled
    [-1]: 1.15, // +15% for Tense
    [0]: 1.00,  // Baseline
    [1]: 0.90,  // -10% for Locked In
    [2]: 0.85,  // -15% clutch credit for Jacked
  };
  return multipliers[mojo];
}

// ============================================
// AUTO-INFERENCE
// ============================================

/**
 * Result of a play for Mojo inference
 */
export interface PlayResultForMojo {
  type: 'BATTING' | 'PITCHING' | 'FIELDING';
  result: string;
  rbis?: number;
  isStrikeout?: boolean;
  isError?: boolean;
  isCleanInning?: boolean;
}

/**
 * Infer Mojo triggers from a play result
 */
export function inferMojoTriggers(playResult: PlayResultForMojo): MojoTrigger[] {
  const triggers: MojoTrigger[] = [];

  if (playResult.type === 'BATTING') {
    switch (playResult.result) {
      case '1B':
        triggers.push('SINGLE');
        break;
      case '2B':
        triggers.push('DOUBLE');
        break;
      case '3B':
        triggers.push('TRIPLE');
        break;
      case 'HR':
        triggers.push('HOME_RUN');
        break;
      case 'K':
        triggers.push('STRIKEOUT');
        break;
      case 'GO':
      case 'FO':
      case 'LO':
      case 'PO':
      case 'DP':
        triggers.push('BATTER_OUT');
        break;
      case 'CS':
        triggers.push('CAUGHT_STEALING');
        break;
      case 'SB':
        triggers.push('STOLEN_BASE');
        break;
    }

    // Add RBI triggers
    if (playResult.rbis && playResult.rbis > 0) {
      for (let i = 0; i < playResult.rbis; i++) {
        triggers.push('RBI');
      }
    }
  } else if (playResult.type === 'PITCHING') {
    switch (playResult.result) {
      case 'K':
        triggers.push('PITCHER_STRIKEOUT');
        break;
      case 'BB':
      case 'IBB':
      case 'HBP':
        triggers.push('PITCHER_WALK');
        break;
      case '1B':
        triggers.push('PITCHER_HIT');
        break;
      case '2B':
      case '3B':
      case 'HR':
        triggers.push('PITCHER_XBH');
        break;
      case 'GO':
      case 'FO':
      case 'LO':
      case 'PO':
        triggers.push('PITCHER_OUT');
        break;
      case 'WP':
        triggers.push('WILD_PITCH');
        break;
    }

    if (playResult.isCleanInning) {
      triggers.push('PITCHER_CLEAN_INNING');
    }
  } else if (playResult.type === 'FIELDING') {
    if (playResult.isError) {
      triggers.push('ERROR');
    }
    if (playResult.result === 'GREAT_PLAY') {
      triggers.push('GREAT_DEFENSIVE_PLAY');
    }
  }

  return triggers;
}

/**
 * Suggest Mojo change based on game events
 */
export interface MojoSuggestion {
  currentMojo: MojoLevel;
  suggestedMojo: MojoLevel;
  confidence: number; // 0-1
  reason: string;
  triggers: MojoTrigger[];
}

export function suggestMojoChange(
  currentMojo: MojoLevel,
  playResults: PlayResultForMojo[]
): MojoSuggestion {
  const allTriggers: MojoTrigger[] = [];

  for (const result of playResults) {
    const triggers = inferMojoTriggers(result);
    allTriggers.push(...triggers);
  }

  // Calculate total delta
  let totalDelta = 0;
  for (const trigger of allTriggers) {
    totalDelta += MOJO_TRIGGERS[trigger].baseDelta;
  }

  const suggestedMojo = clampMojo(currentMojo + Math.round(totalDelta));

  // Calculate confidence based on number of events
  const confidence = Math.min(1, playResults.length * 0.2);

  // Generate reason
  let reason: string;
  if (totalDelta > 1) {
    reason = 'Strong positive performance';
  } else if (totalDelta > 0) {
    reason = 'Positive play';
  } else if (totalDelta < -1) {
    reason = 'Struggling';
  } else if (totalDelta < 0) {
    reason = 'Negative outcome';
  } else {
    reason = 'Neutral result';
  }

  return {
    currentMojo,
    suggestedMojo,
    confidence,
    reason,
    triggers: allTriggers,
  };
}

// ============================================
// MOJO SPLITS TRACKING
// ============================================

/**
 * Interface for tracking stats by Mojo state
 */
export interface MojoSplitStats {
  plateAppearances: number;
  atBats: number;
  hits: number;
  doubles: number;
  triples: number;
  homeRuns: number;
  rbis: number;
  walks: number;
  strikeouts: number;
  avg: number;
  obp: number;
  slg: number;
  ops: number;
}

export interface PlayerMojoSplits {
  playerId: string;
  season: number;
  battingByMojo: Record<MojoLevel, MojoSplitStats>;
}

/**
 * Create empty split stats
 */
export function createEmptyMojoSplitStats(): MojoSplitStats {
  return {
    plateAppearances: 0,
    atBats: 0,
    hits: 0,
    doubles: 0,
    triples: 0,
    homeRuns: 0,
    rbis: 0,
    walks: 0,
    strikeouts: 0,
    avg: 0,
    obp: 0,
    slg: 0,
    ops: 0,
  };
}

/**
 * Create empty player Mojo splits
 */
export function createPlayerMojoSplits(playerId: string, season: number): PlayerMojoSplits {
  return {
    playerId,
    season,
    battingByMojo: {
      [-2]: createEmptyMojoSplitStats(),
      [-1]: createEmptyMojoSplitStats(),
      [0]: createEmptyMojoSplitStats(),
      [1]: createEmptyMojoSplitStats(),
      [2]: createEmptyMojoSplitStats(),
    },
  };
}

/**
 * Recalculate rate stats for splits
 */
export function recalculateSplitRates(stats: MojoSplitStats): MojoSplitStats {
  const avg = stats.atBats > 0 ? stats.hits / stats.atBats : 0;
  const obp = stats.plateAppearances > 0
    ? (stats.hits + stats.walks) / stats.plateAppearances
    : 0;
  const totalBases = stats.hits + stats.doubles + stats.triples * 2 + stats.homeRuns * 3;
  const slg = stats.atBats > 0 ? totalBases / stats.atBats : 0;
  const ops = obp + slg;

  return {
    ...stats,
    avg: Math.round(avg * 1000) / 1000,
    obp: Math.round(obp * 1000) / 1000,
    slg: Math.round(slg * 1000) / 1000,
    ops: Math.round(ops * 1000) / 1000,
  };
}

// ============================================
// DISPLAY HELPERS
// ============================================

/**
 * Get color for Mojo display
 */
export function getMojoColor(mojo: MojoLevel): string {
  const colors: Record<MojoLevel, string> = {
    [-2]: '#dc2626', // red-600
    [-1]: '#f97316', // orange-500
    [0]: '#6b7280',  // gray-500
    [1]: '#22c55e',  // green-500
    [2]: '#16a34a',  // green-600
  };
  return colors[mojo];
}

/**
 * Get Mojo bar fill percentage (0-100)
 */
export function getMojoBarFill(mojo: MojoLevel): number {
  // Map -2 to +2 → 0 to 100
  return ((mojo + 2) / 4) * 100;
}

/**
 * Format Mojo for display
 */
export function formatMojo(mojo: MojoLevel): string {
  const state = MOJO_STATES[mojo];
  const sign = mojo > 0 ? '+' : '';
  return `${state.displayName} (${sign}${mojo})`;
}

/**
 * Get narrative description of Mojo change
 */
export function getMojoChangeNarrative(previousMojo: MojoLevel, newMojo: MojoLevel, trigger: MojoTrigger): string {
  const prevState = MOJO_STATES[previousMojo];
  const newState = MOJO_STATES[newMojo];
  const triggerData = MOJO_TRIGGERS[trigger];

  if (previousMojo === newMojo) {
    return `Stays ${newState.displayName}`;
  }

  const direction = newMojo > previousMojo ? 'rises' : 'drops';
  return `${direction} from ${prevState.displayName} to ${newState.displayName} after ${triggerData.description.toLowerCase()}`;
}
