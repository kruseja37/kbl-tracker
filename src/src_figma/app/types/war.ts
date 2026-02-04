/**
 * WAR Calculation Types
 * Per BWAR_CALCULATION_SPEC.md, PWAR_CALCULATION_SPEC.md, etc.
 *
 * Comprehensive type definitions for all WAR components.
 */

// ============================================
// LEAGUE CONTEXT & BASELINES
// ============================================

/**
 * SMB4 season length configurations
 */
export type SeasonLength = 'mini' | 'short' | 'standard' | 'long';

export const SEASON_GAMES: Record<SeasonLength, number> = {
  mini: 16,
  short: 20,
  standard: 32,
  long: 48,
};

/**
 * MLB baseline constants (reference only - use SMB4 for actual calculations)
 */
export const MLB_BASELINES = {
  gamesPerSeason: 162,
  runsPerWin: 10.0,
  runsPerPA: 0.115,
  replacementRunsPer600PA: -17.5,
  leagueWOBA: 0.320,
  wobaScale: 1.226,
} as const;

/**
 * SMB4 baseline constants (PRIMARY defaults for KBL Tracker)
 * Per ADAPTIVE_STANDARDS_ENGINE_SPEC.md Section 7.4
 *
 * Source: KBL franchise 8-team, ~50-game season
 * Total IP: 2,791.3 | Total PA: 10,994 | Total R: 1,277
 */
export const SMB4_BASELINES = {
  // Season structure (source data was 50-game, 9-inning season)
  gamesPerTeam: 50,
  inningsPerGame: 9,
  opportunityFactor: 0.309,

  // Batting
  leagueAVG: 0.288,
  leagueOBP: 0.329,
  leagueSLG: 0.448,
  leagueOPS: 0.777,
  leagueWOBA: 0.329,
  runsPerGame: 3.19,
  hrPerPA: 0.031,
  kPerPA: 0.166,
  bbPerPA: 0.055,

  // Pitching
  leagueERA: 4.04,
  leagueWHIP: 1.36,
  leagueFIP: 4.04,
  fipConstant: 3.28,

  // Run environment
  runsPerGameBothTeams: 6.38,

  // ⚠️ WARNING: This is for Pythagorean expectation analysis, NOT for WAR!
  // For WAR calculations, use: 10 × (seasonGames / 162)
  // See getRunsPerWin() in each calculator, or MLB_BASELINES.runsPerWin
  runEnvironmentRPW: 17.87,  // sqrt(3.19) × 10 — DO NOT USE FOR WAR

  // Replacement level
  replacementWinPct: 0.294,
  replacementRunsPerPA: -0.020,
  replacementRunsPer600PA: -12.0,

  // wOBA scale (from Jester GUTS)
  wobaScale: 1.7821,
} as const;

/**
 * Linear weights for offensive events
 * Per Jester GUTS methodology: rOut = R/Outs, others derive from rOut
 */
export interface LinearWeights {
  uBB: number;      // Unintentional walk
  HBP: number;      // Hit by pitch
  single: number;   // 1B
  double: number;   // 2B
  triple: number;   // 3B
  homeRun: number;  // HR
  out: number;      // Generic out value (negative)
  strikeout: number; // K
}

/**
 * SMB4 linear weights (from ADAPTIVE_STANDARDS_ENGINE_SPEC.md)
 * Derived from: 1,277 R / 8,374 Outs = 0.1525 rOut
 */
export const SMB4_LINEAR_WEIGHTS: LinearWeights = {
  uBB: 0.2925,      // rOut + 0.14
  HBP: 0.3175,      // rBB + 0.025
  single: 0.4475,   // rOut + 0.14 + 0.155
  double: 0.7475,   // r1B + 0.30
  triple: 1.0175,   // r2B + 0.27
  homeRun: 1.40,    // Fixed value
  out: -0.1525,     // rOut (negative)
  strikeout: -0.1525,
};

// MLB reference (for comparison only)
export const MLB_LINEAR_WEIGHTS: LinearWeights = {
  uBB: 0.69,
  HBP: 0.72,
  single: 0.87,
  double: 1.25,
  triple: 1.58,
  homeRun: 2.01,
  out: -0.26,
  strikeout: -0.27,
};

/**
 * wOBA weights (scaled linear weights)
 */
export interface WOBAWeights {
  uBB: number;
  HBP: number;
  single: number;
  double: number;
  triple: number;
  homeRun: number;
}

/**
 * SMB4 wOBA weights (from ADAPTIVE_STANDARDS_ENGINE_SPEC.md)
 * Calculated as: linear weight × wOBAscale (1.7821)
 */
export const SMB4_WOBA_WEIGHTS: WOBAWeights = {
  uBB: 0.521,
  HBP: 0.566,
  single: 0.797,
  double: 1.332,
  triple: 1.813,
  homeRun: 2.495,
};

// MLB reference (for comparison only)
export const MLB_WOBA_WEIGHTS: WOBAWeights = {
  uBB: 0.690,
  HBP: 0.722,
  single: 0.888,
  double: 1.271,
  triple: 1.616,
  homeRun: 2.101,
};

/**
 * League context for WAR calculations
 * Updated each season based on aggregate stats
 */
export interface LeagueContext {
  seasonId: string;
  seasonGames: number;

  // Run environment
  runsPerWin: number;
  runsPerPA: number;
  leagueWOBA: number;
  wobaScale: number;

  // Linear weights (calibrated)
  linearWeights: LinearWeights;
  wobaWeights: WOBAWeights;

  // Replacement level
  replacementRunsPer600PA: number;

  // Positional adjustments (runs per 162 games)
  positionalAdjustments: PositionalAdjustments;

  // Calibration metadata
  calibrationDate: number;
  sampleSize: number;  // Total PA used for calibration
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
}

/**
 * Positional adjustments (runs per 162 games, scaled for season)
 * Per FWAR_CALCULATION_SPEC.md
 */
export interface PositionalAdjustments {
  C: number;
  '1B': number;
  '2B': number;
  '3B': number;
  SS: number;
  LF: number;
  CF: number;
  RF: number;
  DH: number;
  P: number;
}

export const MLB_POSITIONAL_ADJUSTMENTS: PositionalAdjustments = {
  C: 12.5,    // Hardest position
  SS: 7.5,
  CF: 2.5,
  '2B': 2.5,
  '3B': 2.5,
  RF: -7.5,
  LF: -7.5,
  '1B': -12.5,
  DH: -17.5,  // No defensive value
  P: 0,       // Pitchers handled separately
};

/**
 * Create default league context for a new season
 * Uses SMB4 baselines (not MLB) per ADAPTIVE_STANDARDS_ENGINE_SPEC.md
 */
export function createDefaultLeagueContext(
  seasonId: string,
  seasonGames: number
): LeagueContext {
  // Scale runs per win based on season length
  // Per FWAR_CALCULATION_SPEC.md Section 2:
  // MLB: 162 games = 10 RPW. Shorter seasons = fewer runs per win.
  // This is because each run has MORE impact on win% in shorter seasons.
  const runsPerWin = MLB_BASELINES.runsPerWin * (seasonGames / MLB_BASELINES.gamesPerSeason);

  return {
    seasonId,
    seasonGames,
    runsPerWin,
    runsPerPA: SMB4_BASELINES.runsPerGame / 27.5,  // ~27.5 PA per team per game
    leagueWOBA: SMB4_BASELINES.leagueWOBA,
    wobaScale: SMB4_BASELINES.wobaScale,
    linearWeights: { ...SMB4_LINEAR_WEIGHTS },
    wobaWeights: { ...SMB4_WOBA_WEIGHTS },
    replacementRunsPer600PA: SMB4_BASELINES.replacementRunsPer600PA,
    positionalAdjustments: { ...MLB_POSITIONAL_ADJUSTMENTS },  // Still use MLB positional
    calibrationDate: Date.now(),
    sampleSize: 0,
    confidence: 'LOW',
  };
}

// ============================================
// BATTING STATS FOR WAR
// ============================================

/**
 * Batting stats required for bWAR calculation
 */
export interface BattingStatsForWAR {
  // Counting stats
  pa: number;         // Plate appearances
  ab: number;         // At bats
  hits: number;
  singles: number;
  doubles: number;
  triples: number;
  homeRuns: number;
  walks: number;      // Total walks (BB)
  intentionalWalks: number;  // IBB
  hitByPitch: number;
  sacFlies: number;
  sacBunts: number;
  strikeouts: number;
  gidp: number;       // Grounded into DP

  // Baserunning (for rWAR)
  stolenBases: number;
  caughtStealing: number;

  // Context (optional, for park adjustments)
  homePA?: number;
  roadPA?: number;
  teamId?: string;
}

// ============================================
// bWAR CALCULATION RESULTS
// ============================================

/**
 * Complete bWAR breakdown
 */
export interface BWARResult {
  // Core metrics
  wOBA: number;         // Weighted On-Base Average
  wRAA: number;         // Weighted Runs Above Average
  battingRuns: number;  // wRAA + park/league adjustments

  // Adjustments applied
  parkAdjustment: number;
  leagueAdjustment: number;

  // Replacement level
  replacementRuns: number;
  runsAboveReplacement: number;

  // Final WAR
  runsPerWin: number;
  bWAR: number;

  // Context
  plateAppearances: number;
  seasonGames: number;
}

// ============================================
// PITCHING STATS FOR WAR
// ============================================

/**
 * Pitching stats required for pWAR calculation
 */
export interface PitchingStatsForWAR {
  // Counting stats
  outsRecorded: number;  // IP = outsRecorded / 3
  hitsAllowed: number;
  runsAllowed: number;
  earnedRuns: number;
  walksAllowed: number;
  strikeouts: number;
  homeRunsAllowed: number;
  hitBatters: number;

  // Role indicators
  gamesStarted: number;
  games: number;

  // For leverage adjustment
  highLeverageOuts?: number;

  // Context
  teamId?: string;
}

/**
 * Complete pWAR breakdown
 */
export interface PWARResult {
  // FIP components
  fip: number;           // Fielding Independent Pitching
  fipConstant: number;   // League-adjusted constant

  // Runs calculation
  fipRuns: number;       // FIP converted to runs
  leagueAdjustment: number;

  // Replacement level
  replacementRuns: number;
  runsAboveReplacement: number;

  // Role adjustments
  leverageMultiplier: number;  // For relievers
  roleAdjustedRAR: number;

  // Final WAR
  runsPerWin: number;
  pWAR: number;

  // Context
  inningsPitched: number;
  isStarter: boolean;
  seasonGames: number;
}

// ============================================
// FIELDING STATS FOR WAR
// ============================================

/**
 * Fielding stats required for fWAR calculation
 */
export interface FieldingStatsForWAR {
  games: number;
  innings: number;  // Defensive innings

  // Per-play stats
  putouts: number;
  assists: number;
  errors: number;
  doublePlays: number;

  // Advanced (if tracked)
  divingPlays?: number;
  wallCatches?: number;
  robbedHRs?: number;

  // Position context
  position: string;
  gamesByPosition?: Record<string, number>;
}

/**
 * Complete fWAR breakdown
 */
export interface FWARResult {
  // Per-play values
  putoutValue: number;
  assistValue: number;
  errorValue: number;
  dpValue: number;

  // Special plays
  specialPlayValue: number;

  // Total fielding runs
  totalFieldingRuns: number;

  // Positional adjustment (scaled for season)
  positionalAdjustment: number;

  // Final WAR
  runsPerWin: number;
  fWAR: number;

  // Context
  primaryPosition: string;
  seasonGames: number;
}

// ============================================
// BASERUNNING WAR (rWAR)
// ============================================

/**
 * Baserunning stats for rWAR
 */
export interface BaserunningStatsForWAR {
  stolenBases: number;
  caughtStealing: number;
  gidp: number;
  gdpOpportunities: number;  // Times up with runner on 1st, <2 outs
  speedRating?: number;      // SMB4 speed rating (for UBR proxy)
}

/**
 * Complete rWAR breakdown
 */
export interface RWARResult {
  // Stolen base value
  wSB: number;           // Weighted Stolen Base runs
  sbAttempts: number;
  sbSuccessRate: number;

  // GDP avoidance
  wGDP: number;          // Weighted GDP runs
  gdpRate: number;
  expectedGDP: number;

  // UBR (Ultimate Base Running) - proxy from speed
  ubrProxy: number;

  // Total
  totalBaserunningRuns: number;

  // Final WAR
  runsPerWin: number;
  rWAR: number;
}

// ============================================
// MANAGER WAR (mWAR)
// ============================================

/**
 * Manager decision types
 */
export type ManagerDecisionType =
  | 'pitching_change'
  | 'pinch_hitter'
  | 'pinch_runner'
  | 'defensive_sub'
  | 'stolen_base_call'  // If prompted
  | 'bunt_call'         // If prompted
  | 'intentional_walk';

/**
 * Manager decision record
 */
export interface ManagerDecision {
  decisionType: ManagerDecisionType;
  gameId: string;
  inning: number;
  leverageIndex: number;
  expectedWPA: number;    // Expected Win Probability Added
  actualWPA: number;      // Actual WPA after outcome
  isOptimal: boolean;     // Did the decision align with optimal play?
}

/**
 * Complete mWAR breakdown
 */
export interface MWARResult {
  // Decision tracking
  totalDecisions: number;
  optimalDecisions: number;
  decisionScore: number;  // % optimal weighted by LI

  // Team performance
  expectedWins: number;   // Based on run differential
  actualWins: number;
  overperformance: number;  // Wins above expected

  // Components
  decisionWAR: number;
  overperformanceWAR: number;

  // Final WAR
  mWAR: number;
}

// ============================================
// TOTAL WAR
// ============================================

/**
 * Complete WAR breakdown for a player
 */
export interface TotalWARResult {
  playerId: string;
  playerName: string;
  seasonId: string;

  // Components
  bWAR: BWARResult | null;  // null if pitcher-only
  pWAR: PWARResult | null;  // null if position player
  fWAR: FWARResult | null;
  rWAR: RWARResult | null;

  // Totals
  offensiveWAR: number;   // bWAR + rWAR (if applicable)
  defensiveWAR: number;   // fWAR + positional
  totalWAR: number;       // All components combined

  // Context
  games: number;
  isPitcher: boolean;
  primaryPosition: string;
}

// ============================================
// WAR THRESHOLDS & GRADES
// ============================================

/**
 * WAR quality thresholds (per 162 games, scale for shorter seasons)
 */
export const WAR_THRESHOLDS = {
  mvp: 8.0,
  allStar: 4.0,
  starter: 2.0,
  replacement: 0.0,
  belowReplacement: -1.0,
} as const;

/**
 * Get WAR grade description
 */
export function getWARGrade(war: number, seasonGames: number): string {
  const scale = seasonGames / 162;
  const scaledWAR = war / scale;  // Normalize to 162-game equivalent

  if (scaledWAR >= WAR_THRESHOLDS.mvp) return 'MVP Candidate';
  if (scaledWAR >= 6.0) return 'Superstar';
  if (scaledWAR >= WAR_THRESHOLDS.allStar) return 'All-Star';
  if (scaledWAR >= 3.0) return 'Above Average';
  if (scaledWAR >= WAR_THRESHOLDS.starter) return 'Starter';
  if (scaledWAR >= 1.0) return 'Role Player';
  if (scaledWAR >= WAR_THRESHOLDS.replacement) return 'Replacement Level';
  return 'Below Replacement';
}

// ============================================
// HELPER TYPES
// ============================================

/**
 * Park factors for WAR adjustments
 */
export interface ParkFactors {
  overall: number;
  runs: number;
  homeRuns: number;
  leftHandedHR: number;
  rightHandedHR: number;
  leftHandedAVG: number;
  rightHandedAVG: number;
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
}

/**
 * Team stint for multi-team adjustments
 */
export interface TeamStint {
  teamId: string;
  startDate: number;
  endDate?: number;
  pa: number;
  homePA: number;
  roadPA: number;
}
