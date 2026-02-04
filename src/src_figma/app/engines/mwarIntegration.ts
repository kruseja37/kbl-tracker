/**
 * mWAR Integration for Figma GameTracker
 * Per MWAR_CALCULATION_SPEC.md
 *
 * Integrates the legacy mwarCalculator into the Figma codebase.
 * Provides Manager Moment prompts at high-leverage situations (LI >= 2.0).
 */

// Import from legacy mwarCalculator
import {
  // Types
  type DecisionType,
  type DecisionOutcome,
  type InferenceMethod,
  type DecisionGameState,
  type ManagerDecision,
  type DecisionCounts,
  type DecisionTypeBreakdown,
  type ManagerSeasonStats,
  type ManagerProfile,
  type GameManagerStats,
  type MWARResult,

  // Constants
  MWAR_WEIGHTS,
  MANAGER_OVERPERFORMANCE_CREDIT,
  DECISION_VALUES,
  MWAR_THRESHOLDS,
  HIGH_LEVERAGE_THRESHOLD,
  EXPECTED_SUCCESS_RATES,

  // Decision creation & evaluation
  createManagerDecision,
  getDecisionBaseValue,
  calculateDecisionClutchImpact,
  resolveDecision,
  evaluatePitchingChange,
  evaluateLeavePitcherIn,
  evaluatePinchHitter,
  evaluatePinchRunner,
  evaluateIBB,
  evaluateStealCall,
  evaluateBuntCall,
  evaluateSqueezeCall,
  evaluateShift,

  // Team & season calculations
  calculateTeamSalaryScore,
  getExpectedWinPct,
  calculateOverperformance,
  getDecisionSuccessRate,
  calculateDecisionWAR,
  calculateSeasonMWAR,

  // Utility functions
  getMWARRating,
  createEmptyDecisionCounts,
  createEmptyDecisionTypeBreakdown,
  createManagerSeasonStats,
  addDecisionToSeasonStats,
  recalculateSeasonStats,
  createGameManagerStats,
  addDecisionToGameStats,
  calculateMOYVotes,
  formatMWAR,
  getMWARColor,
  isAutoDetectedDecision,
  isUserPromptedDecision,
} from '../../../engines/mwarCalculator';

// Import leverage calculator for LI checks
import { getLeverageIndex, type GameStateForLI } from '../../../engines/leverageCalculator';

// Re-export all types
export type {
  DecisionType,
  DecisionOutcome,
  InferenceMethod,
  DecisionGameState,
  ManagerDecision,
  DecisionCounts,
  DecisionTypeBreakdown,
  ManagerSeasonStats,
  ManagerProfile,
  GameManagerStats,
  MWARResult,
};

// Re-export all constants
export {
  MWAR_WEIGHTS,
  MANAGER_OVERPERFORMANCE_CREDIT,
  DECISION_VALUES,
  MWAR_THRESHOLDS,
  HIGH_LEVERAGE_THRESHOLD,
  EXPECTED_SUCCESS_RATES,
};

// Re-export all functions
export {
  createManagerDecision,
  getDecisionBaseValue,
  calculateDecisionClutchImpact,
  resolveDecision,
  evaluatePitchingChange,
  evaluateLeavePitcherIn,
  evaluatePinchHitter,
  evaluatePinchRunner,
  evaluateIBB,
  evaluateStealCall,
  evaluateBuntCall,
  evaluateSqueezeCall,
  evaluateShift,
  calculateTeamSalaryScore,
  getExpectedWinPct,
  calculateOverperformance,
  getDecisionSuccessRate,
  calculateDecisionWAR,
  calculateSeasonMWAR,
  getMWARRating,
  createEmptyDecisionCounts,
  createEmptyDecisionTypeBreakdown,
  createManagerSeasonStats,
  addDecisionToSeasonStats,
  recalculateSeasonStats,
  createGameManagerStats,
  addDecisionToGameStats,
  calculateMOYVotes,
  formatMWAR,
  getMWARColor,
  isAutoDetectedDecision,
  isUserPromptedDecision,
};

// ============================================
// MANAGER MOMENT INTEGRATION
// Per MWAR_CALCULATION_SPEC.md - Manager Moment prompt
// ============================================

/**
 * Manager Moment trigger state
 */
export interface ManagerMomentState {
  isTriggered: boolean;
  leverageIndex: number;
  decisionType: DecisionType | null;
  context: string;
  suggestedAction?: string;
}

/**
 * Check if a Manager Moment should be triggered
 * Per user specification: Trigger when LI >= 2.0 (high leverage)
 *
 * @param gameState Current game state for LI calculation
 * @returns ManagerMomentState indicating if prompt should show
 */
export function checkManagerMoment(gameState: GameStateForLI): ManagerMomentState {
  const li = getLeverageIndex(gameState);

  if (li < HIGH_LEVERAGE_THRESHOLD) {
    return {
      isTriggered: false,
      leverageIndex: li,
      decisionType: null,
      context: '',
    };
  }

  // Determine the most relevant decision type based on game state
  const decisionType = inferRelevantDecisionType(gameState);
  const context = buildManagerMomentContext(gameState, li, decisionType);

  return {
    isTriggered: true,
    leverageIndex: li,
    decisionType,
    context,
    suggestedAction: getSuggestedAction(gameState, decisionType),
  };
}

/**
 * Infer the most relevant decision type based on game state
 */
function inferRelevantDecisionType(gameState: GameStateForLI): DecisionType {
  const { outs, runners, inning, halfInning } = gameState;

  // Late game with close score - pitching changes are key
  if (inning >= 7) {
    return 'pitching_change';
  }

  // Runners on base with less than 2 outs - tactical decisions
  if (runners.second || runners.third) {
    if (outs < 2) {
      // Consider IBB with runner in scoring position
      return 'intentional_walk';
    }
  }

  // Runner on first with less than 2 outs - steal/bunt opportunity
  if (runners.first && !runners.second && outs < 2) {
    return 'steal_call';
  }

  // Default to pitching evaluation
  return 'leave_pitcher_in';
}

/**
 * Build contextual message for Manager Moment prompt
 */
function buildManagerMomentContext(
  gameState: GameStateForLI,
  li: number,
  decisionType: DecisionType
): string {
  const { inning, halfInning, outs, runners, homeScore, awayScore } = gameState;

  const half = halfInning === 'TOP' ? 'Top' : 'Bottom';
  const runnerDesc = getRunnerDescription(runners);
  const scoreDiff = Math.abs(homeScore - awayScore);
  const scoreSituation = homeScore === awayScore ? 'Tie game' :
    scoreDiff <= 2 ? 'Close game' : 'Significant lead';

  let situationText = `${half} ${inning}, ${outs} out${outs !== 1 ? 's' : ''}`;
  if (runnerDesc) {
    situationText += `, ${runnerDesc}`;
  }
  situationText += `. ${scoreSituation}.`;

  const liText = li >= 3.0 ? 'Critical moment' :
    li >= 2.5 ? 'Very high leverage' : 'High leverage situation';

  return `${liText} (LI: ${li.toFixed(2)}). ${situationText}`;
}

/**
 * Get description of runners on base
 */
function getRunnerDescription(runners: { first: boolean; second: boolean; third: boolean }): string {
  const positions: string[] = [];
  if (runners.first) positions.push('1st');
  if (runners.second) positions.push('2nd');
  if (runners.third) positions.push('3rd');

  if (positions.length === 0) return '';
  if (positions.length === 3) return 'bases loaded';
  return `runner${positions.length > 1 ? 's' : ''} on ${positions.join(' and ')}`;
}

/**
 * Get suggested action based on game state and decision type
 */
function getSuggestedAction(gameState: GameStateForLI, decisionType: DecisionType): string {
  switch (decisionType) {
    case 'pitching_change':
      return 'Consider pitching change';
    case 'leave_pitcher_in':
      return 'Evaluate current pitcher performance';
    case 'intentional_walk':
      return 'Consider intentional walk';
    case 'steal_call':
      return 'Consider steal attempt';
    case 'bunt_call':
      return 'Consider sacrifice bunt';
    case 'pinch_hitter':
      return 'Consider pinch hitter';
    default:
      return 'Review tactical options';
  }
}

// ============================================
// GAME SESSION TRACKING
// ============================================

/**
 * Create a game-level mWAR tracking state
 */
export function createGameMWARState(gameId: string, managerId: string): GameManagerStats {
  return createGameManagerStats(gameId, managerId);
}

/**
 * Record a manager decision during a game
 * NOTE: addDecisionToGameStats mutates in place, we return a copy for React state updates
 */
export function recordManagerDecision(
  gameStats: GameManagerStats,
  decision: ManagerDecision
): GameManagerStats {
  addDecisionToGameStats(gameStats, decision);
  return { ...gameStats };  // Return new reference
}

/**
 * Get mWAR display info for UI
 */
export function getMWARDisplayInfo(mWAR: number): {
  formatted: string;
  rating: string;
  color: string;
} {
  return {
    formatted: formatMWAR(mWAR),
    rating: getMWARRating(mWAR),
    color: getMWARColor(getMWARRating(mWAR)),
  };
}

// ============================================
// LI HELPERS FOR UI
// ============================================

/**
 * Get LI tier description
 */
export function getLITierDescription(li: number): string {
  if (li >= 4.0) return 'Extreme';
  if (li >= 2.5) return 'Very High';
  if (li >= 2.0) return 'High';
  if (li >= 1.0) return 'Above Average';
  if (li >= 0.5) return 'Average';
  return 'Low';
}

/**
 * Get LI color for UI
 */
export function getLIColor(li: number): string {
  if (li >= 4.0) return '#dc2626';  // Red
  if (li >= 2.5) return '#ea580c';  // Orange
  if (li >= 2.0) return '#ca8a04';  // Yellow/Amber
  if (li >= 1.0) return '#65a30d';  // Green
  return '#6b7280';  // Gray
}

/**
 * Check if LI indicates Manager Moment should trigger
 */
export function shouldShowManagerMoment(li: number): boolean {
  return li >= HIGH_LEVERAGE_THRESHOLD;
}
