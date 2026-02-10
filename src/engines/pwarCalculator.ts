/**
 * Pitching WAR (pWAR) Calculator
 * Per PWAR_CALCULATION_SPEC.md
 *
 * Uses FIP (Fielding Independent Pitching) as foundation.
 * SMB4 baselines from ADAPTIVE_STANDARDS_ENGINE_SPEC.md.
 */

// ============================================
// SMB4 BASELINES
// ============================================

/**
 * SMB4 pitching baselines from ADAPTIVE_STANDARDS_ENGINE_SPEC.md
 */
export const SMB4_PITCHING_BASELINES = {
  // League averages (from 8-team season data)
  leagueERA: 4.04,
  leagueFIP: 4.04,  // ≈ ERA when calibrated
  leagueWHIP: 1.36,

  // FIP constant (ERA - FIP_core)
  fipConstant: 3.28,

  // FIP coefficients (standard)
  fipCoefficients: {
    HR: 13,
    BB_HBP: 3,
    K: 2,
  },

  // Replacement levels per 9 IP
  replacementLevel: {
    starter: 0.12,
    reliever: 0.03,
  },

  // Season scaling
  gamesPerTeam: 50,

  // ⚠️ WARNING: This is for run environment analysis (Pythagorean), NOT for WAR!
  // WAR uses: 10 × (seasonGames / 162) — see getBaseRunsPerWin()
  runEnvironmentRPW: 17.87,  // sqrt(3.19) × 10 — DO NOT USE FOR WAR
};

// ============================================
// TYPES
// ============================================

/**
 * Pitching stats required for pWAR calculation
 */
export interface PitchingStatsForWAR {
  // Core FIP inputs
  ip: number;          // Innings pitched (can be decimal, e.g., 5.67 = 5 2/3)
  strikeouts: number;  // K
  walks: number;       // BB
  hitByPitch: number;  // HBP
  homeRunsAllowed: number;  // HR

  // Role determination
  gamesStarted: number;
  gamesAppeared: number;

  // Optional: for leverage adjustment
  saves?: number;
  holds?: number;
  averageLeverageIndex?: number;  // If tracked
}

/**
 * Complete pWAR result breakdown
 */
export interface PWARResult {
  // Core metrics
  fip: number;           // Fielding Independent Pitching
  leagueFIP: number;     // League average FIP
  fipDiff: number;       // League FIP - Player FIP (positive = better)

  // WAR components
  fipRunsAboveAvg: number;  // FIP diff converted to runs
  replacementLevel: number;  // Role-based replacement level
  leverageMultiplier: number;  // 1.0 for starters, variable for relievers

  // Runs per win used
  pitcherRPW: number;

  // Final result
  pWAR: number;

  // Context
  ip: number;
  role: 'starter' | 'reliever' | 'swingman';
  starterShare: number;  // 0-1, percentage of games started
}

/**
 * League context for calibration
 */
export interface PitchingLeagueContext {
  seasonId: string;
  gamesPerTeam: number;

  // League averages
  leagueERA: number;
  leagueFIP: number;
  fipConstant: number;

  // Calibration
  calibrationConfidence: number;  // 0-1
}

// ============================================
// FIP CALCULATION
// ============================================

/**
 * Calculate FIP (Fielding Independent Pitching)
 *
 * FIP = ((13 × HR) + (3 × (BB + HBP)) - (2 × K)) / IP + FIP_Constant
 */
export function calculateFIP(
  stats: PitchingStatsForWAR,
  fipConstant: number = SMB4_PITCHING_BASELINES.fipConstant
): number {
  const { ip, strikeouts, walks, hitByPitch, homeRunsAllowed } = stats;

  if (ip === 0) return 0;

  const numerator =
    (SMB4_PITCHING_BASELINES.fipCoefficients.HR * homeRunsAllowed) +
    (SMB4_PITCHING_BASELINES.fipCoefficients.BB_HBP * (walks + hitByPitch)) -
    (SMB4_PITCHING_BASELINES.fipCoefficients.K * strikeouts);

  return (numerator / ip) + fipConstant;
}

/**
 * Calculate FIP constant from league stats
 *
 * FIP_Constant = lgERA - (((13 × lgHR) + (3 × (lgBB + lgHBP)) - (2 × lgK)) / lgIP)
 */
export function calculateFIPConstant(leagueStats: {
  era: number;
  homeRunsAllowed: number;
  walks: number;
  hitByPitch: number;
  strikeouts: number;
  ip: number;
}): number {
  const { era, homeRunsAllowed, walks, hitByPitch, strikeouts, ip } = leagueStats;

  if (ip === 0) return SMB4_PITCHING_BASELINES.fipConstant;

  const rawFIPCore =
    ((13 * homeRunsAllowed) + (3 * (walks + hitByPitch)) - (2 * strikeouts)) / ip;

  return era - rawFIPCore;
}

// ============================================
// REPLACEMENT LEVEL
// ============================================

/**
 * Get replacement level based on starter/reliever split
 *
 * Per spec: Starters = 0.12, Relievers = 0.03, Mixed = weighted average
 */
export function getPitcherReplacementLevel(
  gamesStarted: number,
  gamesAppeared: number
): number {
  if (gamesAppeared === 0) return SMB4_PITCHING_BASELINES.replacementLevel.starter;

  const starterShare = gamesStarted / gamesAppeared;
  const relieverShare = 1 - starterShare;

  return (
    (SMB4_PITCHING_BASELINES.replacementLevel.reliever * relieverShare) +
    (SMB4_PITCHING_BASELINES.replacementLevel.starter * starterShare)
  );
}

/**
 * Determine pitcher role
 */
export function getPitcherRole(
  gamesStarted: number,
  gamesAppeared: number
): 'starter' | 'reliever' | 'swingman' {
  if (gamesAppeared === 0) return 'starter';

  const starterShare = gamesStarted / gamesAppeared;

  if (starterShare >= 0.8) return 'starter';
  if (starterShare <= 0.2) return 'reliever';
  return 'swingman';
}

// ============================================
// LEVERAGE INDEX
// ============================================

/**
 * Get leverage multiplier for relievers
 *
 * Per spec: LI_Multiplier = (gmLI + 1) / 2
 * This regresses the pitcher's LI halfway toward average (1.0)
 */
export function getLeverageMultiplier(
  averageLeverageIndex: number,
  isReliever: boolean
): number {
  if (!isReliever) return 1.0;  // Starters get no adjustment

  // Regress halfway toward average (1.0)
  return (averageLeverageIndex + 1) / 2;
}

/**
 * Estimate leverage index from saves/holds when not tracked
 *
 * Per spec Section 11: Use save-based estimation
 */
export function estimateLeverageIndex(
  gamesStarted: number,
  gamesAppeared: number,
  saves: number = 0,
  holds: number = 0
): number {
  // Starters default to 1.0
  if (gamesStarted === gamesAppeared) return 1.0;

  const reliefAppearances = gamesAppeared - gamesStarted;
  if (reliefAppearances === 0) return 1.0;

  const saveRate = saves / reliefAppearances;
  const holdRate = holds / reliefAppearances;

  // Estimate based on role
  if (saveRate > 0.6) return 1.7;       // Primary closer
  if (saveRate > 0.3) return 1.4;       // Closer/setup mix
  if (holdRate > 0.3) return 1.3;       // Setup man
  if (saveRate > 0.1 || holdRate > 0.1) return 1.2;  // High-leverage
  return 0.9;                            // Middle relief/mop-up
}

// ============================================
// RUNS PER WIN (Pitcher-Specific)
// ============================================

/**
 * Get base runs per win for a season
 * Per FWAR_CALCULATION_SPEC.md Section 2:
 * MLB: 162 games = 10 RPW. Shorter seasons = fewer runs per win.
 * Each run has MORE impact on win% in shorter seasons.
 *
 * Formula: RPW = 10 × (seasonGames / 162)
 */
export function getBaseRunsPerWin(seasonGames: number): number {
  const MLB_GAMES = 162;
  const MLB_RUNS_PER_WIN = 10;
  return MLB_RUNS_PER_WIN * (seasonGames / MLB_GAMES);
}

/**
 * Get pitcher-specific runs per win
 *
 * Better pitchers (lower FIP) have slightly lower RPW thresholds.
 * Per spec: Range from 0.9 (elite) to 1.1 (poor) of base RPW.
 */
export function getPitcherRunsPerWin(
  pitcherFIP: number,
  leagueFIP: number,
  seasonGames: number
): number {
  const baseRPW = getBaseRunsPerWin(seasonGames);

  // Ratio adjustment: elite pitchers get slightly lower RPW
  const fipRatio = Math.min(1.1, Math.max(0.9, pitcherFIP / leagueFIP));

  return baseRPW * fipRatio;
}

// ============================================
// COMPLETE pWAR CALCULATION
// ============================================

/**
 * Calculate complete pWAR with all adjustments
 */
export function calculatePWAR(
  stats: PitchingStatsForWAR,
  context: PitchingLeagueContext,
  options: {
    useLeverageAdjustment?: boolean;
  } = {}
): PWARResult {
  const { useLeverageAdjustment = true } = options;
  const { ip, gamesStarted, gamesAppeared, saves = 0, holds = 0, averageLeverageIndex } = stats;

  // NaN guard: if any numeric input is NaN, return zero result
  if (isNaN(ip) || isNaN(gamesStarted) || isNaN(gamesAppeared) || isNaN(context.leagueFIP) ||
      isNaN(context.fipConstant) || isNaN(context.gamesPerTeam)) {
    return { fip: 0, leagueFIP: 0, fipDiff: 0, fipRunsAboveAvg: 0,
      replacementLevel: 0, leverageMultiplier: 1.0, pitcherRPW: 0, pWAR: 0,
      ip: 0, role: 'starter', starterShare: 1 };
  }

  // Handle zero innings
  if (ip === 0) {
    return {
      fip: 0,
      leagueFIP: context.leagueFIP,
      fipDiff: 0,
      fipRunsAboveAvg: 0,
      replacementLevel: getPitcherReplacementLevel(gamesStarted, gamesAppeared),
      leverageMultiplier: 1.0,
      pitcherRPW: getBaseRunsPerWin(context.gamesPerTeam),
      pWAR: 0,
      ip: 0,
      role: getPitcherRole(gamesStarted, gamesAppeared),
      starterShare: gamesAppeared > 0 ? gamesStarted / gamesAppeared : 1,
    };
  }

  // Step 1: Calculate FIP
  const pitcherFIP = calculateFIP(stats, context.fipConstant);
  const leagueFIP = context.leagueFIP;

  // Step 2: FIP difference (positive = better than average)
  const fipDiff = leagueFIP - pitcherFIP;

  // Step 3: Get pitcher-specific runs per win
  const pitcherRPW = getPitcherRunsPerWin(pitcherFIP, leagueFIP, context.gamesPerTeam);

  // Step 4: Convert FIP diff to runs above average (per 9 IP)
  // Then scale by actual IP
  const fipRunsAboveAvg = fipDiff * (ip / 9);

  // Step 5: Convert to wins above average
  const winsAboveAvg = fipRunsAboveAvg / pitcherRPW;

  // Step 6: Add replacement level contribution
  const replacementLevel = getPitcherReplacementLevel(gamesStarted, gamesAppeared);
  const replacementContribution = replacementLevel * (ip / 9);
  const rawWAR = winsAboveAvg + replacementContribution;

  // Step 7: Apply leverage multiplier (relievers only)
  const role = getPitcherRole(gamesStarted, gamesAppeared);
  const isReliever = role === 'reliever';

  let leverageMultiplier = 1.0;
  if (useLeverageAdjustment && isReliever) {
    const li = averageLeverageIndex ?? estimateLeverageIndex(gamesStarted, gamesAppeared, saves, holds);
    leverageMultiplier = getLeverageMultiplier(li, true);
  }

  const adjustedWAR = rawWAR * leverageMultiplier;

  return {
    fip: Math.round(pitcherFIP * 100) / 100,
    leagueFIP,
    fipDiff: Math.round(fipDiff * 100) / 100,
    fipRunsAboveAvg: Math.round(fipRunsAboveAvg * 100) / 100,
    replacementLevel,
    leverageMultiplier: Math.round(leverageMultiplier * 100) / 100,
    pitcherRPW: Math.round(pitcherRPW * 100) / 100,
    pWAR: Math.round(adjustedWAR * 100) / 100,
    ip,
    role,
    starterShare: gamesAppeared > 0 ? gamesStarted / gamesAppeared : 1,
  };
}

/**
 * Simplified pWAR calculation using SMB4 defaults
 */
export function calculatePWARSimplified(
  stats: PitchingStatsForWAR,
  seasonGames: number = SMB4_PITCHING_BASELINES.gamesPerTeam
): PWARResult {
  const context: PitchingLeagueContext = {
    seasonId: 'default',
    gamesPerTeam: seasonGames,
    leagueERA: SMB4_PITCHING_BASELINES.leagueERA,
    leagueFIP: SMB4_PITCHING_BASELINES.leagueFIP,
    fipConstant: SMB4_PITCHING_BASELINES.fipConstant,
    calibrationConfidence: 1.0,
  };

  return calculatePWAR(stats, context);
}

// ============================================
// DEFAULT CONTEXT HELPER
// ============================================

/**
 * Create default league context with SMB4 baselines
 */
export function createDefaultPitchingContext(
  seasonId: string,
  gamesPerTeam: number = SMB4_PITCHING_BASELINES.gamesPerTeam
): PitchingLeagueContext {
  return {
    seasonId,
    gamesPerTeam,
    leagueERA: SMB4_PITCHING_BASELINES.leagueERA,
    leagueFIP: SMB4_PITCHING_BASELINES.leagueFIP,
    fipConstant: SMB4_PITCHING_BASELINES.fipConstant,
    calibrationConfidence: 1.0,
  };
}

// ============================================
// CALIBRATION HELPERS
// ============================================

/**
 * Recalibrate league context from season data
 */
export function recalibratePitchingContext(
  currentContext: PitchingLeagueContext,
  seasonStats: {
    totalIP: number;
    totalER: number;
    totalK: number;
    totalBB: number;
    totalHBP: number;
    totalHR: number;
  },
  blendWeight: number = 0.3  // How much to trust new data (0-1)
): PitchingLeagueContext {
  const { totalIP, totalER, totalK, totalBB, totalHBP, totalHR } = seasonStats;

  // Need minimum data
  if (totalIP < 100) return currentContext;

  // Calculate new league ERA and FIP
  const newLeagueERA = (totalER / totalIP) * 9;
  const newFIPConstant = calculateFIPConstant({
    era: newLeagueERA,
    homeRunsAllowed: totalHR,
    walks: totalBB,
    hitByPitch: totalHBP,
    strikeouts: totalK,
    ip: totalIP,
  });

  // Calculate new league FIP using the constant
  const newRawFIPCore =
    ((13 * totalHR) + (3 * (totalBB + totalHBP)) - (2 * totalK)) / totalIP;
  const newLeagueFIP = newRawFIPCore + newFIPConstant;

  // Blend old and new
  return {
    ...currentContext,
    leagueERA: (currentContext.leagueERA * (1 - blendWeight)) + (newLeagueERA * blendWeight),
    leagueFIP: (currentContext.leagueFIP * (1 - blendWeight)) + (newLeagueFIP * blendWeight),
    fipConstant: (currentContext.fipConstant * (1 - blendWeight)) + (newFIPConstant * blendWeight),
    calibrationConfidence: Math.min(1.0, currentContext.calibrationConfidence + (blendWeight * 0.2)),
  };
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Format innings pitched (e.g., 5.67 → "5.2" meaning 5 2/3)
 */
export function formatIP(ip: number): string {
  const fullInnings = Math.floor(ip);
  const partialOuts = Math.round((ip - fullInnings) * 3);
  return `${fullInnings}.${partialOuts}`;
}

/**
 * Convert IP string to decimal (e.g., "5.2" → 5.67)
 */
export function parseIP(ipString: string): number {
  const [innings, outs] = ipString.split('.').map(Number);
  return innings + (outs || 0) / 3;
}

/**
 * Get FIP quality tier
 */
export function getFIPTier(fip: number): string {
  if (fip < 3.00) return 'Excellent';
  if (fip < 3.50) return 'Great';
  if (fip < 4.00) return 'Above Average';
  if (fip < 4.50) return 'Average';
  if (fip < 5.00) return 'Below Average';
  return 'Poor';
}

/**
 * Get pWAR quality tier for a season
 */
export function getPWARTier(pWAR: number): string {
  if (pWAR > 5.0) return 'MVP-caliber';
  if (pWAR > 3.0) return 'All-Star';
  if (pWAR > 1.5) return 'Above Average';
  if (pWAR > 0.5) return 'Average';
  if (pWAR > 0.0) return 'Below Average';
  return 'Replacement';
}
