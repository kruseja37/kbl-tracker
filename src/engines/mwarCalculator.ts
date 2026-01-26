/**
 * Manager WAR (mWAR) Calculator
 * Per MWAR_CALCULATION_SPEC.md
 *
 * Quantifies manager value through:
 * 1. In-game decisions weighted by leverage (60%)
 * 2. Team overperformance vs salary-based expectation (40%)
 *
 * Formula: mWAR = (decisionWAR × 0.60) + (overperformanceWAR × 0.40)
 */

import { getLeverageIndex, type GameStateForLI } from './leverageCalculator';

// ============================================
// TYPES
// ============================================

/**
 * Decision types tracked for mWAR
 */
export type DecisionType =
  | 'pitching_change'
  | 'leave_pitcher_in'
  | 'pinch_hitter'
  | 'pinch_runner'
  | 'defensive_sub'
  | 'intentional_walk'
  | 'steal_call'
  | 'bunt_call'
  | 'squeeze_call'
  | 'hit_and_run'
  | 'shift_on'
  | 'shift_off';

/**
 * Decision outcome
 */
export type DecisionOutcome = 'success' | 'failure' | 'neutral';

/**
 * How the decision was recorded
 */
export type InferenceMethod = 'auto' | 'user_prompted' | 'user_flagged';

/**
 * Game state snapshot for decision context
 */
export interface DecisionGameState {
  inning: number;
  halfInning: 'TOP' | 'BOTTOM';
  outs: 0 | 1 | 2;
  runners: { first: boolean; second: boolean; third: boolean };
  homeScore: number;
  awayScore: number;
}

/**
 * Individual manager decision record
 */
export interface ManagerDecision {
  decisionId: string;
  gameId: string;
  managerId: string;
  inning: number;
  halfInning: 'TOP' | 'BOTTOM';

  // Decision details
  decisionType: DecisionType;
  leverageIndex: number;
  gameState: DecisionGameState;

  // How it was recorded
  inferenceMethod: InferenceMethod;

  // Outcome (filled after resolution)
  resolved: boolean;
  outcome: DecisionOutcome;
  clutchImpact: number;  // LI-weighted value

  // Context
  involvedPlayers: string[];
  notes?: string;
}

/**
 * Decision counts for a manager
 */
export interface DecisionCounts {
  total: number;
  successes: number;
  failures: number;
  neutral: number;
}

/**
 * Decision breakdown by type
 */
export interface DecisionTypeBreakdown {
  count: number;
  successes: number;
  failures: number;
  totalValue: number;
}

/**
 * Manager season statistics
 */
export interface ManagerSeasonStats {
  seasonId: string;
  managerId: string;
  teamId: string;
  mWAR: number;

  // Decision tracking
  decisions: ManagerDecision[];
  decisionCounts: DecisionCounts;
  decisionWAR: number;

  // Team performance
  teamRecord: { wins: number; losses: number };
  gamesPlayed: number;
  expectedWinPct: number;
  actualWinPct: number;
  overperformanceWins: number;
  overperformanceWAR: number;

  // Breakdowns
  decisionsByType: Record<DecisionType, DecisionTypeBreakdown>;

  // High-leverage performance
  highLeverageDecisions: number;
  highLeverageSuccessRate: number;
}

/**
 * Manager career profile
 */
export interface ManagerProfile {
  id: string;
  name: string;
  teamId: string;

  // Career stats
  careerRecord: { wins: number; losses: number };
  careerMWAR: number;
  seasonsManaged: number;

  // Current season
  currentSeasonStats?: ManagerSeasonStats;
}

/**
 * Game-level manager statistics
 */
export interface GameManagerStats {
  gameId: string;
  managerId: string;

  decisions: ManagerDecision[];
  totalDecisionValue: number;

  successfulDecisions: number;
  failedDecisions: number;
  highLeverageDecisions: number;
}

/**
 * mWAR calculation result
 */
export interface MWARResult {
  mWAR: number;

  // Components
  decisionWAR: number;
  overperformanceWAR: number;

  // Breakdowns
  decisionCount: number;
  successRate: number;
  teamRecord: string;
  expectedWins: number;
  actualWins: number;
  overperformanceWins: number;

  // Rating
  rating: string;
}

// ============================================
// CONSTANTS
// ============================================

/**
 * mWAR component weights
 */
export const MWAR_WEIGHTS = {
  decision: 0.60,
  overperformance: 0.40,
} as const;

/**
 * Manager credit for team overperformance
 * (The remaining 70% is attributed to luck/variance, not redistributed to players)
 */
export const MANAGER_OVERPERFORMANCE_CREDIT = 0.30;

/**
 * Decision outcome values by type
 * Per MWAR_CALCULATION_SPEC.md §5
 */
export const DECISION_VALUES: Record<DecisionType, { success: number; failure: number }> = {
  pitching_change: { success: 0.4, failure: -0.3 },
  leave_pitcher_in: { success: 0.2, failure: -0.4 },
  pinch_hitter: { success: 0.5, failure: -0.4 },
  pinch_runner: { success: 0.4, failure: -0.4 },
  defensive_sub: { success: 0.4, failure: -0.3 },
  intentional_walk: { success: 0.3, failure: -0.5 },
  steal_call: { success: 0.3, failure: -0.4 },
  bunt_call: { success: 0.2, failure: -0.4 },
  squeeze_call: { success: 0.6, failure: -0.5 },
  hit_and_run: { success: 0.3, failure: -0.4 },
  shift_on: { success: 0.2, failure: -0.3 },
  shift_off: { success: 0.1, failure: -0.1 },
};

/**
 * mWAR rating thresholds
 */
export const MWAR_THRESHOLDS = {
  elite: 4.0,
  excellent: 2.5,
  aboveAverage: 1.0,
  average: 0,
  belowAverage: -1.0,
} as const;

/**
 * High leverage threshold for decisions
 */
export const HIGH_LEVERAGE_THRESHOLD = 2.0;

/**
 * Expected success rates by decision type (for reference)
 */
export const EXPECTED_SUCCESS_RATES: Record<DecisionType, number> = {
  pitching_change: 0.575,
  leave_pitcher_in: 0.50,
  pinch_hitter: 0.475,
  pinch_runner: 0.60,
  defensive_sub: 0.60,
  intentional_walk: 0.575,
  steal_call: 0.675,
  bunt_call: 0.55,
  squeeze_call: 0.625,
  hit_and_run: 0.525,
  shift_on: 0.55,
  shift_off: 0.50,
};

// ============================================
// DECISION TRACKING
// ============================================

/**
 * Create a new manager decision record
 */
export function createManagerDecision(
  gameId: string,
  managerId: string,
  decisionType: DecisionType,
  gameState: DecisionGameState | GameStateForLI,
  inferenceMethod: InferenceMethod = 'auto',
  involvedPlayers: string[] = [],
  notes?: string
): ManagerDecision {
  // Calculate LI if not already available
  const leverageIndex = getLeverageIndex(gameState as GameStateForLI);

  return {
    decisionId: `${gameId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    gameId,
    managerId,
    inning: gameState.inning,
    halfInning: gameState.halfInning,
    decisionType,
    leverageIndex,
    gameState: {
      inning: gameState.inning,
      halfInning: gameState.halfInning,
      outs: gameState.outs as 0 | 1 | 2,
      runners: gameState.runners,
      homeScore: gameState.homeScore,
      awayScore: gameState.awayScore,
    },
    inferenceMethod,
    resolved: false,
    outcome: 'neutral',
    clutchImpact: 0,
    involvedPlayers,
    notes,
  };
}

/**
 * Get base decision value (before LI weighting)
 */
export function getDecisionBaseValue(
  decisionType: DecisionType,
  outcome: DecisionOutcome
): number {
  if (outcome === 'neutral') return 0;

  const values = DECISION_VALUES[decisionType];
  return outcome === 'success' ? values.success : values.failure;
}

/**
 * Calculate LI-weighted clutch impact
 */
export function calculateDecisionClutchImpact(
  decisionType: DecisionType,
  outcome: DecisionOutcome,
  leverageIndex: number
): number {
  const baseValue = getDecisionBaseValue(decisionType, outcome);
  const liWeight = Math.sqrt(leverageIndex);
  return baseValue * liWeight;
}

/**
 * Resolve a decision with its outcome
 */
export function resolveDecision(
  decision: ManagerDecision,
  outcome: DecisionOutcome
): ManagerDecision {
  const clutchImpact = calculateDecisionClutchImpact(
    decision.decisionType,
    outcome,
    decision.leverageIndex
  );

  return {
    ...decision,
    resolved: true,
    outcome,
    clutchImpact,
  };
}

// ============================================
// DECISION OUTCOME EVALUATION
// ============================================

/**
 * Evaluate pitching change outcome
 */
export function evaluatePitchingChange(
  decision: ManagerDecision,
  newPitcherPerformance: {
    runsAllowed: number;
    outsRecorded: number;
    inheritedRunnersScored: number;
  }
): DecisionOutcome {
  const { runsAllowed, outsRecorded, inheritedRunnersScored } = newPitcherPerformance;

  // Success: New pitcher escapes jam or pitches well
  if (inheritedRunnersScored === 0 && runsAllowed <= 1 && outsRecorded >= 3) {
    return 'success';
  }

  // Failure: Inherited runners score or gives up runs quickly
  if (inheritedRunnersScored > 0 || (runsAllowed >= 2 && outsRecorded < 3)) {
    return 'failure';
  }

  return 'neutral';
}

/**
 * Evaluate leave pitcher in outcome
 */
export function evaluateLeavePitcherIn(
  decision: ManagerDecision,
  pitcherPerformance: {
    runsAllowed: number;
    gotOutOfInning: boolean;
  }
): DecisionOutcome {
  const { runsAllowed, gotOutOfInning } = pitcherPerformance;

  if (gotOutOfInning && runsAllowed === 0) {
    return 'success';
  }

  if (runsAllowed >= 2) {
    return 'failure';
  }

  return 'neutral';
}

/**
 * Evaluate pinch hitter outcome
 */
export function evaluatePinchHitter(
  decision: ManagerDecision,
  atBatResult: string
): DecisionOutcome {
  const successResults = ['1B', '2B', '3B', 'HR', 'BB', 'HBP', 'SF', 'SAC', 'single', 'double', 'triple', 'walk'];
  const failureResults = ['K', 'GIDP', 'strikeout', 'strikeout_swinging', 'strikeout_looking'];

  const normalizedResult = atBatResult.toLowerCase();

  if (successResults.some(r => normalizedResult.includes(r.toLowerCase()))) {
    return 'success';
  }

  if (failureResults.some(r => normalizedResult.includes(r.toLowerCase()))) {
    return 'failure';
  }

  // Regular outs are mild failures
  return 'failure';
}

/**
 * Evaluate pinch runner outcome
 */
export function evaluatePinchRunner(
  decision: ManagerDecision,
  runnerOutcome: 'scored' | 'advanced' | 'held' | 'out_on_bases'
): DecisionOutcome {
  if (runnerOutcome === 'scored') return 'success';
  if (runnerOutcome === 'out_on_bases') return 'failure';
  if (runnerOutcome === 'advanced') return 'success';
  return 'neutral';
}

/**
 * Evaluate IBB outcome
 */
export function evaluateIBB(
  decision: ManagerDecision,
  nextBatterResult: string,
  runsScored: number = 0
): DecisionOutcome {
  const outResults = ['GO', 'FO', 'LO', 'PO', 'K', 'DP', 'ground_out', 'fly_out', 'line_out', 'popup_out', 'strikeout'];
  const hitResults = ['1B', '2B', '3B', 'HR', 'single', 'double', 'triple'];

  const normalizedResult = nextBatterResult.toLowerCase();

  // Success: Next batter makes out
  if (outResults.some(r => normalizedResult.includes(r.toLowerCase()))) {
    return 'success';
  }

  // Failure: Next batter gets a hit (especially bad if runs score)
  if (hitResults.some(r => normalizedResult.includes(r.toLowerCase()))) {
    return 'failure';
  }

  // Walk after IBB is usually bad (bases loaded)
  if (normalizedResult.includes('walk') || normalizedResult.includes('bb')) {
    return 'failure';
  }

  return 'neutral';
}

/**
 * Evaluate steal call outcome
 */
export function evaluateStealCall(
  decision: ManagerDecision,
  stealResult: 'SB' | 'CS' | 'stolen_base' | 'caught_stealing'
): DecisionOutcome {
  if (stealResult === 'SB' || stealResult === 'stolen_base') return 'success';
  if (stealResult === 'CS' || stealResult === 'caught_stealing') return 'failure';
  return 'neutral';
}

/**
 * Evaluate bunt call outcome
 */
export function evaluateBuntCall(
  decision: ManagerDecision,
  buntResult: 'success' | 'out' | 'double_play' | 'foul_out'
): DecisionOutcome {
  if (buntResult === 'success') return 'success';
  if (buntResult === 'double_play' || buntResult === 'foul_out') return 'failure';
  return 'neutral';  // Regular out on sacrifice is expected
}

/**
 * Evaluate squeeze play outcome
 */
export function evaluateSqueezeCall(
  decision: ManagerDecision,
  squeezeResult: 'scores' | 'out_at_home' | 'batter_out_runner_scores' | 'double_play'
): DecisionOutcome {
  if (squeezeResult === 'scores' || squeezeResult === 'batter_out_runner_scores') return 'success';
  if (squeezeResult === 'out_at_home' || squeezeResult === 'double_play') return 'failure';
  return 'neutral';
}

/**
 * Evaluate shift outcome
 */
export function evaluateShift(
  decision: ManagerDecision,
  playResult: 'out' | 'hit',
  ballDirection: 'pull' | 'center' | 'opposite'
): DecisionOutcome {
  if (decision.decisionType === 'shift_on') {
    // Shift helps: Pull-side grounder turned into out
    if (ballDirection === 'pull' && playResult === 'out') {
      return 'success';
    }
    // Shift hurts: Opposite field hit through hole
    if (ballDirection === 'opposite' && playResult === 'hit') {
      return 'failure';
    }
  }

  return 'neutral';
}

// ============================================
// TEAM PERFORMANCE
// ============================================

/**
 * Calculate team salary score (0-1 scale)
 * Higher score = higher payroll = higher expected win%
 */
export function calculateTeamSalaryScore(
  teamTotalSalary: number,
  leagueMedianSalary: number,
  leagueMaxSalary: number
): number {
  // Normalize to 0-1 range
  // Median = 0.5, Max = 1.0, Min (assumed 0.3 × median) = 0.0
  const minSalary = leagueMedianSalary * 0.3;
  const normalizedSalary = (teamTotalSalary - minSalary) / (leagueMaxSalary - minSalary);
  return Math.max(0, Math.min(1, normalizedSalary));
}

/**
 * Get expected win percentage based on team salary/ratings
 * Range: 35% to 65%
 */
export function getExpectedWinPct(teamSalaryScore: number): number {
  // Linear interpolation: 0.35 at score 0, 0.65 at score 1
  return 0.35 + (teamSalaryScore * 0.30);
}

/**
 * Calculate team overperformance
 */
export function calculateOverperformance(
  actualWins: number,
  actualLosses: number,
  teamSalaryScore: number,
  totalGames: number
): {
  expectedWinPct: number;
  actualWinPct: number;
  overperformance: number;
  overperformanceWins: number;
  managerCredit: number;
} {
  const expectedWinPct = getExpectedWinPct(teamSalaryScore);
  const actualWinPct = actualWins / (actualWins + actualLosses);

  const overperformance = actualWinPct - expectedWinPct;
  const overperformanceWins = overperformance * totalGames;

  // Manager gets partial credit
  const managerCredit = overperformanceWins * MANAGER_OVERPERFORMANCE_CREDIT;

  return {
    expectedWinPct,
    actualWinPct,
    overperformance,
    overperformanceWins,
    managerCredit,
  };
}

// ============================================
// SEASON mWAR CALCULATION
// ============================================

/**
 * Get decision success rate
 */
export function getDecisionSuccessRate(decisions: ManagerDecision[]): number {
  const resolved = decisions.filter(d => d.resolved);
  if (resolved.length === 0) return 0;

  const successes = resolved.filter(d => d.outcome === 'success').length;
  return successes / resolved.length;
}

/**
 * Calculate decision WAR component
 */
export function calculateDecisionWAR(
  decisions: ManagerDecision[],
  runsPerWin: number
): number {
  const totalValue = decisions
    .filter(d => d.resolved)
    .reduce((sum, d) => sum + d.clutchImpact, 0);

  return totalValue / runsPerWin;
}

/**
 * Calculate season mWAR
 */
export function calculateSeasonMWAR(
  decisions: ManagerDecision[],
  teamStats: {
    wins: number;
    losses: number;
    salaryScore: number;
  },
  seasonGames: number,
  runsPerWin?: number
): MWARResult {
  // Default RPW for season length
  const rpw = runsPerWin ?? (10 * (seasonGames / 162));

  // Component 1: Decision WAR (60%)
  const decisionWAR = calculateDecisionWAR(decisions, rpw);

  // Component 2: Overperformance WAR (40%)
  const overperf = calculateOverperformance(
    teamStats.wins,
    teamStats.losses,
    teamStats.salaryScore,
    seasonGames
  );
  const overperformanceWAR = overperf.managerCredit;

  // Combine with weights
  const mWAR = (decisionWAR * MWAR_WEIGHTS.decision) + (overperformanceWAR * MWAR_WEIGHTS.overperformance);

  // Get rating
  const rating = getMWARRating(mWAR);

  return {
    mWAR,
    decisionWAR,
    overperformanceWAR,
    decisionCount: decisions.filter(d => d.resolved).length,
    successRate: getDecisionSuccessRate(decisions),
    teamRecord: `${teamStats.wins}-${teamStats.losses}`,
    expectedWins: Math.round(overperf.expectedWinPct * seasonGames),
    actualWins: teamStats.wins,
    overperformanceWins: overperf.overperformanceWins,
    rating,
  };
}

/**
 * Get mWAR rating string
 */
export function getMWARRating(mWAR: number): string {
  if (mWAR >= MWAR_THRESHOLDS.elite) return 'Elite';
  if (mWAR >= MWAR_THRESHOLDS.excellent) return 'Excellent';
  if (mWAR >= MWAR_THRESHOLDS.aboveAverage) return 'Above Average';
  if (mWAR >= MWAR_THRESHOLDS.average) return 'Average';
  if (mWAR >= MWAR_THRESHOLDS.belowAverage) return 'Below Average';
  return 'Poor';
}

// ============================================
// STATS AGGREGATION
// ============================================

/**
 * Create empty decision counts
 */
export function createEmptyDecisionCounts(): DecisionCounts {
  return {
    total: 0,
    successes: 0,
    failures: 0,
    neutral: 0,
  };
}

/**
 * Create empty decision type breakdown
 */
export function createEmptyDecisionTypeBreakdown(): DecisionTypeBreakdown {
  return {
    count: 0,
    successes: 0,
    failures: 0,
    totalValue: 0,
  };
}

/**
 * Create empty manager season stats
 */
export function createManagerSeasonStats(
  seasonId: string,
  managerId: string,
  teamId: string
): ManagerSeasonStats {
  const decisionsByType: Record<DecisionType, DecisionTypeBreakdown> = {
    pitching_change: createEmptyDecisionTypeBreakdown(),
    leave_pitcher_in: createEmptyDecisionTypeBreakdown(),
    pinch_hitter: createEmptyDecisionTypeBreakdown(),
    pinch_runner: createEmptyDecisionTypeBreakdown(),
    defensive_sub: createEmptyDecisionTypeBreakdown(),
    intentional_walk: createEmptyDecisionTypeBreakdown(),
    steal_call: createEmptyDecisionTypeBreakdown(),
    bunt_call: createEmptyDecisionTypeBreakdown(),
    squeeze_call: createEmptyDecisionTypeBreakdown(),
    hit_and_run: createEmptyDecisionTypeBreakdown(),
    shift_on: createEmptyDecisionTypeBreakdown(),
    shift_off: createEmptyDecisionTypeBreakdown(),
  };

  return {
    seasonId,
    managerId,
    teamId,
    mWAR: 0,
    decisions: [],
    decisionCounts: createEmptyDecisionCounts(),
    decisionWAR: 0,
    teamRecord: { wins: 0, losses: 0 },
    gamesPlayed: 0,
    expectedWinPct: 0.5,
    actualWinPct: 0.5,
    overperformanceWins: 0,
    overperformanceWAR: 0,
    decisionsByType,
    highLeverageDecisions: 0,
    highLeverageSuccessRate: 0,
  };
}

/**
 * Add a decision to manager season stats
 */
export function addDecisionToSeasonStats(
  stats: ManagerSeasonStats,
  decision: ManagerDecision
): void {
  stats.decisions.push(decision);
  stats.decisionCounts.total += 1;

  if (decision.resolved) {
    if (decision.outcome === 'success') {
      stats.decisionCounts.successes += 1;
    } else if (decision.outcome === 'failure') {
      stats.decisionCounts.failures += 1;
    } else {
      stats.decisionCounts.neutral += 1;
    }
  }

  // Update type breakdown
  const typeBreakdown = stats.decisionsByType[decision.decisionType];
  typeBreakdown.count += 1;
  if (decision.resolved) {
    if (decision.outcome === 'success') typeBreakdown.successes += 1;
    else if (decision.outcome === 'failure') typeBreakdown.failures += 1;
    typeBreakdown.totalValue += decision.clutchImpact;
  }

  // Track high-leverage decisions
  if (decision.leverageIndex >= HIGH_LEVERAGE_THRESHOLD) {
    stats.highLeverageDecisions += 1;
  }
}

/**
 * Recalculate manager season stats
 */
export function recalculateSeasonStats(
  stats: ManagerSeasonStats,
  teamStats: { wins: number; losses: number; salaryScore: number },
  seasonGames: number
): void {
  const result = calculateSeasonMWAR(stats.decisions, teamStats, seasonGames);

  stats.mWAR = result.mWAR;
  stats.decisionWAR = result.decisionWAR;
  stats.overperformanceWAR = result.overperformanceWAR;
  stats.teamRecord = { wins: teamStats.wins, losses: teamStats.losses };
  stats.gamesPlayed = teamStats.wins + teamStats.losses;
  stats.expectedWinPct = getExpectedWinPct(teamStats.salaryScore);
  stats.actualWinPct = teamStats.wins / (teamStats.wins + teamStats.losses);
  stats.overperformanceWins = result.overperformanceWins;

  // Calculate high-leverage success rate
  const hlDecisions = stats.decisions.filter(
    d => d.leverageIndex >= HIGH_LEVERAGE_THRESHOLD && d.resolved
  );
  if (hlDecisions.length > 0) {
    const hlSuccesses = hlDecisions.filter(d => d.outcome === 'success').length;
    stats.highLeverageSuccessRate = hlSuccesses / hlDecisions.length;
  }
}

// ============================================
// GAME STATS
// ============================================

/**
 * Create game-level manager stats
 */
export function createGameManagerStats(
  gameId: string,
  managerId: string
): GameManagerStats {
  return {
    gameId,
    managerId,
    decisions: [],
    totalDecisionValue: 0,
    successfulDecisions: 0,
    failedDecisions: 0,
    highLeverageDecisions: 0,
  };
}

/**
 * Add decision to game stats
 */
export function addDecisionToGameStats(
  stats: GameManagerStats,
  decision: ManagerDecision
): void {
  stats.decisions.push(decision);

  if (decision.resolved) {
    stats.totalDecisionValue += decision.clutchImpact;

    if (decision.outcome === 'success') {
      stats.successfulDecisions += 1;
    } else if (decision.outcome === 'failure') {
      stats.failedDecisions += 1;
    }
  }

  if (decision.leverageIndex >= HIGH_LEVERAGE_THRESHOLD) {
    stats.highLeverageDecisions += 1;
  }
}

// ============================================
// MANAGER OF THE YEAR VOTING
// ============================================

/**
 * Scale a value to 0-100 range
 */
function scaleToRange(
  value: number,
  min: number,
  max: number
): number {
  if (max === min) return 50;
  return ((value - min) / (max - min)) * 100;
}

/**
 * Calculate Manager of the Year voting score
 * Per MWAR_CALCULATION_SPEC.md §8
 *
 * Formula: mWAR × 0.60 + Overperformance × 0.40
 */
export function calculateMOYVotes(
  manager: { mWAR: number; overperformanceWins: number },
  allManagers: Array<{ mWAR: number; overperformanceWins: number }>
): number {
  const allMWARs = allManagers.map(m => m.mWAR);
  const allOverperfs = allManagers.map(m => m.overperformanceWins);

  const mwarScore = scaleToRange(
    manager.mWAR,
    Math.min(...allMWARs),
    Math.max(...allMWARs)
  ) * 0.60;

  const overperfScore = scaleToRange(
    manager.overperformanceWins,
    Math.min(...allOverperfs),
    Math.max(...allOverperfs)
  ) * 0.40;

  return mwarScore + overperfScore;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Format mWAR for display
 */
export function formatMWAR(mWAR: number, precision: number = 2): string {
  const sign = mWAR >= 0 ? '+' : '';
  return `${sign}${mWAR.toFixed(precision)}`;
}

/**
 * Get color for mWAR rating
 */
export function getMWARColor(rating: string): string {
  switch (rating) {
    case 'Elite': return '#fbbf24';      // Gold
    case 'Excellent': return '#22c55e';  // Green
    case 'Above Average': return '#3b82f6'; // Blue
    case 'Average': return '#6b7280';    // Gray
    case 'Below Average': return '#f59e0b'; // Amber
    case 'Poor': return '#ef4444';       // Red
    default: return '#6b7280';
  }
}

/**
 * Check if a decision type can be auto-detected
 */
export function isAutoDetectedDecision(decisionType: DecisionType): boolean {
  const autoTypes: DecisionType[] = [
    'pitching_change',
    'pinch_hitter',
    'pinch_runner',
    'defensive_sub',
    'intentional_walk',
  ];
  return autoTypes.includes(decisionType);
}

/**
 * Check if a decision type requires user prompting
 */
export function isUserPromptedDecision(decisionType: DecisionType): boolean {
  const promptedTypes: DecisionType[] = [
    'steal_call',
    'bunt_call',
    'squeeze_call',
    'hit_and_run',
    'shift_on',
    'shift_off',
  ];
  return promptedTypes.includes(decisionType);
}
