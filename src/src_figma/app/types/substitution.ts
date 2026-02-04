/**
 * Substitution System Types
 * Per FIGMA_IMPLEMENTATION_PLAN.md Phase 1.1
 *
 * Covers all substitution event types:
 * - Pitching changes (with bequeathed runners)
 * - Pinch hitters
 * - Pinch runners (with ER inheritance)
 * - Defensive substitutions
 * - Double switches
 * - Position switches
 */

// ============================================
// CORE TYPES
// ============================================

export type Position =
  | 'P' | 'C' | '1B' | '2B' | '3B' | 'SS'
  | 'LF' | 'CF' | 'RF' | 'DH'
  | 'SP' | 'RP' | 'CL';

export type HalfInning = 'TOP' | 'BOTTOM';

export type HowReached = 'hit' | 'walk' | 'HBP' | 'error' | 'FC' | 'inherited';

export type BatterHand = 'L' | 'R' | 'S';

export type PitcherRole = 'SP' | 'RP' | 'CL';

// ============================================
// LINEUP TYPES
// ============================================

export interface LineupPlayer {
  playerId: string;
  playerName: string;
  position: Position;
  battingOrder: number;  // 1-9
  enteredInning: number;
  enteredFor?: string;   // Who they replaced (if any)
  isStarter: boolean;
}

export interface BenchPlayer {
  playerId: string;
  playerName: string;
  positions: Position[];        // Multi-position capability
  isAvailable: boolean;         // Not yet used in game
  batterHand?: BatterHand;
  isPitcher?: boolean;
}

export interface LineupState {
  lineup: LineupPlayer[];
  bench: BenchPlayer[];
  usedPlayers: string[];        // Players already used (can't re-enter)
  currentPitcher: LineupPlayer | null;
}

// ============================================
// RUNNER TYPES (for ER tracking)
// ============================================

export interface Runner {
  playerId: string;
  playerName: string;
  inheritedFrom: string | null;  // Pitcher ID who allowed them on base
  howReached?: HowReached;       // For ER calculation
}

export interface Bases {
  first: Runner | null;
  second: Runner | null;
  third: Runner | null;
}

// ============================================
// BASE SUBSTITUTION EVENT
// ============================================

export interface BaseSubstitutionEvent {
  gameId: string;
  inning: number;
  halfInning: HalfInning;
  outs: number;
  timestamp: number;
}

// ============================================
// PITCHING CHANGE EVENT
// ============================================

export interface PitcherLine {
  ip: number;     // Outs recorded (stored as outs, display as IP)
  h: number;
  r: number;
  er: number;
  bb: number;
  k: number;
  hr?: number;
}

export interface BequeathedRunner {
  base: '1B' | '2B' | '3B';
  runnerId: string;
  runnerName: string;
  howReached: HowReached;
}

export interface PitchingChangeEvent extends BaseSubstitutionEvent {
  eventType: 'PITCH_CHANGE';
  outgoingPitcherId: string;
  outgoingPitcherName: string;
  outgoingPitchCount: number;
  outgoingLine?: PitcherLine;
  bequeathedRunners: BequeathedRunner[];
  incomingPitcherId: string;
  incomingPitcherName: string;
  incomingPitcherRole: PitcherRole;
  inheritedRunners: number;  // Count for new pitcher
}

// ============================================
// PINCH HITTER EVENT
// ============================================

export interface PinchHitterEvent extends BaseSubstitutionEvent {
  eventType: 'PINCH_HIT';
  replacedPlayerId: string;
  replacedPlayerName: string;
  replacedBattingOrder: number;  // 1-9
  pinchHitterId: string;
  pinchHitterName: string;
  fieldingPosition: Position;    // Position PH will play after AB
  pitcherFacing?: string;        // Opposing pitcher (for L/R matchup)
}

// ============================================
// PINCH RUNNER EVENT
// ============================================

export interface PinchRunnerEvent extends BaseSubstitutionEvent {
  eventType: 'PINCH_RUN';
  replacedPlayerId: string;
  replacedPlayerName: string;
  replacedBattingOrder: number;
  base: '1B' | '2B' | '3B';
  pinchRunnerId: string;
  pinchRunnerName: string;
  fieldingPosition: Position;
  // CRITICAL: Inherit pitcher responsibility for ER tracking
  pitcherResponsible: string;
  howOriginalReached: HowReached;
}

// ============================================
// DEFENSIVE SUBSTITUTION EVENT
// ============================================

export interface DefensiveSub {
  playerOutId: string;
  playerOutName: string;
  playerInId: string;
  playerInName: string;
  position: Position;
  battingOrder: number;
}

export interface DefensiveSubEvent extends BaseSubstitutionEvent {
  eventType: 'DEF_SUB';
  substitutions: DefensiveSub[];  // Can have multiple
}

// ============================================
// DOUBLE SWITCH EVENT
// ============================================

export interface PositionSwap {
  playerOutId: string;
  playerOutPosition: Position;
  playerOutBattingOrder: number;
  playerInId: string;
  playerInPosition: Position;
  playerInBattingOrder: number;
}

export interface DoubleSwitchEvent extends BaseSubstitutionEvent {
  eventType: 'DOUBLE_SWITCH';
  pitchingChange: Omit<PitchingChangeEvent, 'eventType' | keyof BaseSubstitutionEvent>;
  positionSwap: PositionSwap;
  newPitcherBattingOrder: number;
  newPositionPlayerBattingOrder: number;
}

// ============================================
// POSITION SWITCH EVENT
// ============================================

export interface PositionSwitch {
  playerId: string;
  playerName: string;
  fromPosition: Position;
  toPosition: Position;
}

export interface PositionSwitchEvent extends BaseSubstitutionEvent {
  eventType: 'POS_SWITCH';
  switches: PositionSwitch[];
}

// ============================================
// UNION TYPE
// ============================================

export type SubstitutionEvent =
  | PitchingChangeEvent
  | PinchHitterEvent
  | PinchRunnerEvent
  | DefensiveSubEvent
  | DoubleSwitchEvent
  | PositionSwitchEvent;

export type SubstitutionEventType =
  | 'PITCH_CHANGE'
  | 'PINCH_HIT'
  | 'PINCH_RUN'
  | 'DEF_SUB'
  | 'DOUBLE_SWITCH'
  | 'POS_SWITCH';

// ============================================
// GAME SUBSTITUTIONS HISTORY
// ============================================

export interface GameSubstitutions {
  gameId: string;
  events: SubstitutionEvent[];
}

// ============================================
// VALIDATION
// ============================================

export interface SubstitutionValidation {
  isValid: boolean;
  errors: string[];
}

// ============================================
// HELPER FUNCTIONS
// ============================================

export function countRunners(bases: Bases): number {
  let count = 0;
  if (bases.first) count++;
  if (bases.second) count++;
  if (bases.third) count++;
  return count;
}

export function isBasesLoaded(bases: Bases): boolean {
  return bases.first !== null && bases.second !== null && bases.third !== null;
}

export function hasRunnersInScoringPosition(bases: Bases): boolean {
  return bases.second !== null || bases.third !== null;
}

/**
 * Build bequeathed runners from current bases state
 */
export function buildBequeathedRunners(bases: Bases): BequeathedRunner[] {
  const runners: BequeathedRunner[] = [];

  if (bases.first) {
    runners.push({
      base: '1B',
      runnerId: bases.first.playerId,
      runnerName: bases.first.playerName,
      howReached: bases.first.howReached || 'hit',
    });
  }

  if (bases.second) {
    runners.push({
      base: '2B',
      runnerId: bases.second.playerId,
      runnerName: bases.second.playerName,
      howReached: bases.second.howReached || 'hit',
    });
  }

  if (bases.third) {
    runners.push({
      base: '3B',
      runnerId: bases.third.playerId,
      runnerName: bases.third.playerName,
      howReached: bases.third.howReached || 'hit',
    });
  }

  return runners;
}

/**
 * Get available bench players for a specific role
 */
export function getAvailablePitchers(bench: BenchPlayer[]): BenchPlayer[] {
  return bench.filter(p => p.isAvailable && p.isPitcher);
}

export function getAvailablePositionPlayers(bench: BenchPlayer[]): BenchPlayer[] {
  return bench.filter(p => p.isAvailable && !p.isPitcher);
}

/**
 * Validate defensive alignment after substitution
 */
export function validateDefensiveAlignment(
  lineup: LineupPlayer[],
  hasDH: boolean
): SubstitutionValidation {
  const errors: string[] = [];
  const positionMap = new Map<Position, string>();

  // Required defensive positions
  const defensivePositions: Position[] = ['P', 'C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'];

  for (const player of lineup) {
    // Skip DH when checking defensive positions
    if (player.position === 'DH') {
      if (!hasDH) {
        errors.push('DH not allowed in this game');
      }
      continue;
    }

    // Check for duplicates
    if (positionMap.has(player.position)) {
      errors.push(`Duplicate position: ${player.position} (${positionMap.get(player.position)} and ${player.playerName})`);
    } else {
      positionMap.set(player.position, player.playerName);
    }
  }

  // Check for missing positions
  for (const pos of defensivePositions) {
    if (!positionMap.has(pos)) {
      errors.push(`Missing position: ${pos}`);
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
