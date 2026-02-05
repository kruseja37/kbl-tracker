/**
 * WAR Calculation Engines - Unified Export
 *
 * All WAR calculators for KBL Tracker.
 * Uses SMB4 baselines from ADAPTIVE_STANDARDS_ENGINE_SPEC.md.
 */

// ============================================
// bWAR - Batting WAR
// ============================================

export {
  calculateWOBA,
  calculateWRAA,
  getReplacementLevelRuns,
  getRunsPerWin as getBattingRunsPerWin,
  calculateBWAR,
  calculateBWARSimplified,
  SMB4_BASELINES as BWAR_BASELINES,
  SMB4_WOBA_WEIGHTS as BWAR_WOBA_WEIGHTS,
} from './bwarCalculator';

export type {
  BattingStatsForWAR,
  BWARResult,
  LeagueContext as BWARLeagueContext,
  WOBAWeights,
} from './bwarCalculator';

// ============================================
// pWAR - Pitching WAR
// ============================================

export {
  calculateFIP,
  calculateFIPConstant,
  getPitcherReplacementLevel,
  getPitcherRole,
  getLeverageMultiplier,
  estimateLeverageIndex,
  getBaseRunsPerWin as getPitchingBaseRunsPerWin,
  getPitcherRunsPerWin,
  calculatePWAR,
  calculatePWARSimplified,
  createDefaultPitchingContext,
  recalibratePitchingContext,
  formatIP,
  parseIP,
  getFIPTier,
  getPWARTier,
  SMB4_PITCHING_BASELINES,
} from './pwarCalculator';

export type {
  PitchingStatsForWAR,
  PWARResult,
  PitchingLeagueContext,
} from './pwarCalculator';

// ============================================
// fWAR - Fielding WAR
// ============================================

export {
  FIELDING_RUN_VALUES,
  POSITION_MODIFIERS,
  DIFFICULTY_MULTIPLIERS,
  POSITIONAL_ADJUSTMENTS,
  getRunsPerWin as getFieldingRunsPerWin,
  runsToWAR as fieldingRunsToWAR,
  calculatePutoutValue,
  calculateAssistValue,
  calculateDPValue,
  calculateErrorValue,
  calculateStarPlayValue,
  calculateEventValue,
  calculateGameFWAR,
  calculateSeasonFWAR,
  calculateFWARFromStats,
  getFWARTier,
  getStarPlayFameBonus,
  isWebGem,
} from './fwarCalculator';

export type {
  Position,
  PutoutType,
  AssistType,
  DPRole,
  ErrorType,
  Difficulty,
  FieldingEvent,
  FWARResult,
  GameFieldingSummary,
} from './fwarCalculator';

// ============================================
// rWAR - Baserunning WAR
// ============================================

export {
  STOLEN_BASE_VALUES,
  ADVANCEMENT_VALUES,
  GIDP_VALUES,
  getRunsPerWin as getBaserunningRunsPerWin,
  calculateWSB,
  calculateWSBSimplified,
  calculateUBR,
  estimateUBR,
  calculateWGDP,
  calculateWGDPSimplified,
  calculateRWAR,
  calculateRWARSimplified,
  createDefaultLeagueStats as createDefaultBaserunningLeagueStats,
  getRWARTier,
  getSBSuccessRate,
  isSBProfitable,
  estimateRWARFromSpeed,
} from './rwarCalculator';

export type {
  StolenBaseStats,
  AdvancementStats,
  GIDPStats,
  BaserunningStats,
  LeagueBaserunningStats,
  RWARResult,
} from './rwarCalculator';

// ============================================
// UNIFIED HELPERS
// ============================================

/**
 * Get runs per win for a given season length
 * Central function that all WAR calculators use
 *
 * Per FWAR_CALCULATION_SPEC.md Section 2:
 * - MLB: 162 games = 10 RPW
 * - Shorter seasons = fewer runs per win
 * - Each run has MORE impact on win% in shorter seasons
 *
 * Formula: RPW = 10 × (seasonGames / 162)
 */
export function getUnifiedRunsPerWin(seasonGames: number): number {
  const MLB_GAMES = 162;
  const MLB_RUNS_PER_WIN = 10;
  return MLB_RUNS_PER_WIN * (seasonGames / MLB_GAMES);
}

/**
 * Calculate total WAR from components
 */
export function calculateTotalWAR(
  bWAR: number = 0,
  pWAR: number = 0,
  fWAR: number = 0,
  rWAR: number = 0
): number {
  // Position players: bWAR + fWAR + rWAR
  // Pitchers: pWAR + fWAR (minimal for most pitchers)
  return bWAR + pWAR + fWAR + rWAR;
}

/**
 * Get WAR quality tier
 */
export function getTotalWARTier(totalWAR: number, seasonGames: number = 48): string {
  // Scale to 162-game equivalent for grading
  const scaleFactor = 162 / seasonGames;
  const annualizedWAR = totalWAR * scaleFactor;

  if (annualizedWAR >= 8.0) return 'MVP Candidate';
  if (annualizedWAR >= 6.0) return 'Superstar';
  if (annualizedWAR >= 4.0) return 'All-Star';
  if (annualizedWAR >= 3.0) return 'Above Average';
  if (annualizedWAR >= 2.0) return 'Starter';
  if (annualizedWAR >= 1.0) return 'Role Player';
  if (annualizedWAR >= 0.0) return 'Replacement Level';
  return 'Below Replacement';
}

/**
 * SMB4-specific WAR thresholds for a 48-game season
 */
export const SMB4_WAR_THRESHOLDS = {
  // For a 48-game season (48/162 = 0.296 of full season)
  mvpCandidate: 2.4,     // 8.0 × 0.296
  superstar: 1.8,        // 6.0 × 0.296
  allStar: 1.2,          // 4.0 × 0.296
  aboveAverage: 0.9,     // 3.0 × 0.296
  starter: 0.6,          // 2.0 × 0.296
  rolePlayer: 0.3,       // 1.0 × 0.296
  replacement: 0.0,
};

// ============================================
// Leverage Index - Game State Importance
// ============================================

export {
  // Core LI calculation
  calculateLeverageIndex,
  getLeverageIndex,

  // LI components
  encodeBaseState,
  decodeBaseState,
  getBaseOutLI,
  getInningMultiplier,
  getScoreDampener,
  getLICategory,

  // gmLI for relievers
  createLIAccumulator,
  addLIAppearance,
  calculateGmLI,
  gmLIToLeverageMultiplier,
  estimateGmLI,

  // Clutch situation detection
  isClutchSituation,
  isHighLeverageSituation,
  isExtremeLeverageSituation,
  calculateClutchValue,

  // Win probability
  estimateWinProbability,

  // Display helpers
  formatLI,
  getLIColor,
  getLIEmoji,

  // Constants
  BASE_OUT_LI,
  LI_BOUNDS,
  LI_CATEGORIES,
  LI_SCENARIOS,
  BaseState,
} from './leverageCalculator';

export type {
  RunnersOnBase,
  GameStateForLI,
  LIConfig,
  LIResult,
  LIAccumulator,
} from './leverageCalculator';

// ============================================
// Clutch Attribution - Multi-Participant Credit
// ============================================

export {
  // Contact quality
  getContactQualityFromUI,
  inferFlyBallDepth,
  inferGroundBallSpeed,
  DEFAULT_CONTACT_QUALITY,

  // Playoff multipliers
  getPlayoffMultiplier,
  PLAYOFF_MULTIPLIERS,

  // Arm calculations
  getArmFactor,
  getInfieldSingleArmBlame,
  getSacFlyArmBlame,
  POSITION_ARM_DEFAULTS,

  // Attribution calculation
  calculatePlayAttribution,
  applyContactQualityModifier,
  calculateParticipantClutch,

  // Base values
  getBatterBaseValue,
  getPitcherBaseValue,
  getFielderBaseValue,
  getCatcherBaseValue,
  getRunnerBaseValue,
  getManagerBaseValue,

  // Player stats
  createPlayerClutchStats,
  accumulateClutchEvent,

  // Clutch tiers
  getClutchTier,
  getClutchConfidence,
  shouldDisplayClutchRating,
  CLUTCH_TIERS,
  CLUTCH_DISPLAY_CONFIG,

  // Trigger stacking
  calculateClutchTriggers,

  // All-Star voting
  scaleToRange,
  getClutchVotingComponent,
} from './clutchCalculator';

export type {
  ContactQuality,
  ExitType,
  TrajectoryModifier,
  PlayResult,
  ParticipantRole,
  FielderPlayType,
  ParticipantAttribution,
  PlayAttribution,
  PlayerClutchStats,
  PlayoffContext,
} from './clutchCalculator';

// ============================================
// mWAR - Manager WAR
// ============================================

export {
  // Decision creation and tracking
  createManagerDecision,
  resolveDecision,
  getDecisionBaseValue,
  calculateDecisionClutchImpact,

  // Decision evaluation
  evaluatePitchingChange,
  evaluateLeavePitcherIn,
  evaluatePinchHitter,
  evaluatePinchRunner,
  evaluateIBB,
  evaluateStealCall,
  evaluateBuntCall,
  evaluateSqueezeCall,
  evaluateShift,

  // Team performance
  calculateTeamSalaryScore,
  getExpectedWinPct,
  calculateOverperformance,

  // Season mWAR calculation
  getDecisionSuccessRate,
  calculateDecisionWAR,
  calculateSeasonMWAR,
  getMWARRating,

  // Stats aggregation
  createEmptyDecisionCounts,
  createEmptyDecisionTypeBreakdown,
  createManagerSeasonStats,
  addDecisionToSeasonStats,
  recalculateSeasonStats,

  // Game stats
  createGameManagerStats,
  addDecisionToGameStats,

  // Manager of the Year
  calculateMOYVotes,

  // Display helpers
  formatMWAR,
  getMWARColor,
  isAutoDetectedDecision,
  isUserPromptedDecision,

  // Constants
  MWAR_WEIGHTS,
  MANAGER_OVERPERFORMANCE_CREDIT,
  DECISION_VALUES,
  MWAR_THRESHOLDS,
  HIGH_LEVERAGE_THRESHOLD,
  EXPECTED_SUCCESS_RATES,
} from './mwarCalculator';

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
} from './mwarCalculator';

// ============================================
// Fame Engine - Fame Scoring and Milestones
// ============================================

export {
  // LI weighting
  getLIMultiplier,
  getPlayoffMultiplier as getFamePlayoffMultiplier,

  // Fame calculation
  calculateFame,
  getFameTier,

  // Career milestone detection
  detectCareerMilestones,
  detectCareerNegativeMilestones,
  CAREER_THRESHOLDS,
  CAREER_NEGATIVE_THRESHOLDS,

  // Season milestone detection
  detectSeasonMilestones,
  detectSeasonNegativeMilestones,
  SEASON_THRESHOLDS,

  // First career
  detectFirstCareer,

  // Re-export FAME_VALUES for convenience
  FAME_VALUES,
} from './fameEngine';

export type {
  CareerStats,
  SeasonStats,
  MilestoneResult,
  FameResult,
} from './fameEngine';

// ============================================
// Detection Functions - Event Detection
// ============================================

export {
  // Prompt detection
  promptWebGem,
  promptRobbery,
  promptTOOTBLAN,
  promptNutShot,
  promptKilledPitcher,
  promptInsideParkHR,

  // Blown save
  detectBlownSave,
  isSaveOpportunity,

  // Triple play
  detectTriplePlay,
  detectHitIntoTriplePlay,

  // Pitching events
  detectEscapeArtist,

  // Position player pitching
  detectPositionPlayerPitching,

  // Fielding errors
  detectDroppedFly,
  detectBootedGrounder,
  detectWrongBaseThrow,

  // Catcher events
  detectPassedBallRun,
  detectThrowOutAtHome,

  // Baserunning events
  detectPickedOff,

  // Other
  detectWalkedInRun,
  detectClutchGrandSlam,
  detectRallyStarter,
  detectRallyKiller,

  // Helper
  getPromptDetections,
} from './detectionFunctions';

export type {
  DetectionContext,
  PlayResult as DetectionPlayResult,
  PitcherAppearance,
  PromptResult,
} from './detectionFunctions';

// ============================================
// Mojo Engine - Player Confidence/Momentum
// ============================================

export {
  // Core Mojo functions
  getMojoState,
  getMojoDisplayName,
  getMojoEmoji,
  clampMojo,
  isValidMojoLevel,

  // Stat multipliers
  getMojoStatMultiplier,
  applyMojoToStat,
  applyMojoToAllStats,
  applyCombinedModifiers,

  // Mojo change calculation
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

  // Fame integration
  getMojoFameModifier,
  getMojoWARMultiplier,
  getMojoClutchMultiplier,

  // Auto-inference
  inferMojoTriggers,
  suggestMojoChange,

  // Splits tracking
  createEmptyMojoSplitStats,
  createPlayerMojoSplits,
  recalculateSplitRates,

  // Display helpers
  getMojoColor,
  getMojoBarFill,
  formatMojo,
  getMojoChangeNarrative,

  // Constants
  MOJO_STATES,
  MOJO_TRIGGERS,
  MOJO_AMPLIFICATION,
  MOJO_CARRYOVER_RATE,
} from './mojoEngine';

export type {
  MojoLevel,
  MojoName,
  MojoState,
  MojoChangeEvent,
  MojoTrigger,
  MojoTriggerValue,
  MojoEntry,
  MojoGameSnapshot,
  MojoAmplification,
  GameSituation,
  AdjustedStats,
  BaseStats,
  PlayResultForMojo,
  MojoSuggestion,
  MojoSplitStats,
  PlayerMojoSplits,
  MojoGameStats,
} from './mojoEngine';

// ============================================
// Fitness Engine - Player Physical Condition
// ============================================

export {
  // Core Fitness functions
  getFitnessDefinition,
  getFitnessStateFromValue,
  getFitnessValue,
  canPlay,
  isRiskyToPlay,
  getPositionCategory,

  // Stat multipliers
  getFitnessStatMultiplier,
  applyFitnessToStat,
  applyCombinedMultiplier,

  // Decay calculation
  calculateFitnessDecay,
  applyFitnessDecay,

  // Recovery calculation
  calculateDailyRecovery,
  applyRecovery,

  // Juiced status
  checkJuicedEligibility,
  applyJuicedStatus,
  updateJuicedStatus,

  // Injury risk
  calculateInjuryRisk,
  rollForInjury,

  // Fame integration
  getFitnessFameModifier,
  getFitnessWARMultiplier,
  calculateAdjustedFame,

  // Profile management
  createFitnessProfile,
  createSeasonStartProfile,

  // Recovery projection
  projectRecovery,

  // Display helpers
  getFitnessColor,
  getFitnessEmoji,
  getFitnessBarFill,
  formatFitness,
  getFitnessNarrative,
  getJuicedStigmaNarrative,
  getRandomJuicedNarrative,

  // Constants
  FITNESS_STATES,
  FITNESS_STATE_ORDER,
  FITNESS_DECAY,
  FITNESS_RECOVERY,
  JUICED_REQUIREMENTS,
} from './fitnessEngine';

export type {
  FitnessState,
  FitnessDefinition,
  FitnessEntry,
  FitnessChangeReason,
  PlayerPosition,
  PositionCategory,
  FitnessDecayConfig,
  FitnessRecoveryConfig,
  PlayerFitnessProfile,
  InjuryRisk,
  GameActivity,
  RecoveryProjection,
} from './fitnessEngine';

// ============================================
// Salary Calculator - Player Value System
// ============================================

export {
  // Core calculation
  isPitcherRatings,
  calculateWeightedRating,
  calculateBaseRatingSalary,
  calculateAgeFactor,
  calculatePerformanceModifier,
  calculateFameModifier,
  applyPersonalityModifier,
  calculateSalaryWithBreakdown,
  calculateSalary,

  // Expected performance
  calculateExpectedWAR,

  // True Value / ROI
  calculateTrueValue,
  getROITierDisplay,

  // Free agency / Trade matching
  calculateSwapRequirement,
  validateMultiPlayerSwap,

  // Draft budget
  calculateDraftBudget,
  canAffordDraftPick,

  // Salary updates
  updatePlayerSalary,

  // Fan expectations
  calculateFanExpectations,
  getExpectationLevelDisplay,

  // Bust/Comeback scoring
  calculateBustScore,
  calculateComebackScore,

  // Display helpers
  formatSalary,
  formatSalaryChange,
  getSalaryTier,
  getSalaryColor,
  getRatingSalaryScale,

  // Constants
  BATTER_RATING_WEIGHTS,
  PITCHER_RATING_WEIGHTS,
  MAX_SALARY,
  MIN_SALARY,
  PERSONALITY_MODIFIERS,
  BASE_DRAFT_ALLOCATION,
  STANDINGS_BONUS_PER_POSITION,
  ROI_THRESHOLDS,
} from './salaryCalculator';

export type {
  Personality,
  BatterRatings,
  PitcherRatings,
  PlayerRatings,
  PlayerForSalary,
  SeasonStatsForSalary,
  ExpectedPerformance,
  SalaryBreakdown,
  SalaryHistory,
  SalaryTrigger,
  TrueValueResult,
  ROITier,
  SwapRequirement,
  SwapValidation,
  DraftBudget,
  ExpectationLevel,
  FanExpectations,
  SalaryUpdateResult,
} from './salaryCalculator';

// ============================================
// Fan Morale Engine - Fan Sentiment System
// ============================================

export {
  // Initialization
  initializeFanMorale,

  // State functions
  getFanState,
  getRiskLevel,

  // Performance context
  classifyPerformance,
  getPerformanceMultiplier,
  getTimingMultiplier,
  getHistoryModifier,

  // Expected wins
  calculateExpectedWins as calculateFanExpectedWins,
  determineFanReaction,

  // Trade scrutiny
  startTradeAftermath,
  updateTradeAftermath,
  calculateFanVerdict,
  getPostTradeGameImpact,

  // Drift & momentum
  calculateMoraleBaseline,
  calculateMoraleDrift,
  applyMomentum,
  calculateTrend,

  // Event processing
  createGameMoraleEvent,
  processMoraleEvent,
  processMoraleDrift,
  checkForStreakEvent,

  // Contraction risk
  calculateContractionRisk,

  // Constants
  FAN_STATE_THRESHOLDS,
  FAN_STATE_CONFIG,
  BASE_MORALE_IMPACTS,
  FAN_MORALE_CONFIG,
} from './fanMoraleEngine';

export type {
  FanState,
  MoraleTrend,
  RiskLevel,
  FanMorale,
  MoraleEventType,
  MoraleModifier,
  MoraleEvent,
  MoraleUpdate,
  PerformanceClass,
  PerformanceContext,
  SeasonContext,
  ExpectedWinsTrigger,
  ExpectedWins,
  FanReactionType,
  FanReaction,
  ExpectedWinsUpdate,
  FanVerdict,
  TradeAftermath,
  AcquiredPlayerTracking,
  ProspectSpotlight,
  GameResult as FanMoraleGameResult,
  PlayerGamePerformance,
  ContractionRisk,
} from './fanMoraleEngine';

// ============================================
// Narrative Engine - Beat Reporter System
// ============================================

export {
  // Reporter generation
  generateBeatReporter,
  getReporterName,
  updateReporterReputation,
  advanceReporterSeason,

  // Personality system
  shouldAlignWithPersonality,
  getOffBrandPersonality,
  getEffectivePersonality,

  // Morale calculation
  calculateStoryMoraleImpact,

  // Reliability system
  determineStoryAccuracy,
  determineInaccuracyType,
  determineConfidenceLevel,
  getHedgingLanguage,
  requiresRetraction,
  generateRetractionNarrative,
  calculateCredibilityHit,

  // Narrative generation
  generateNarrative,
  generateNarrativeWithClaude,
  generateGameNarratives,
  generateTradeNarrative,
  generateMilestoneNarrative,

  // Constants
  REPORTER_PERSONALITY_WEIGHTS,
  VOICE_PROFILES,
  REPORTER_MORALE_INFLUENCE,
  PERSONALITY_ALIGNMENT_RATE,
  REPORTER_ACCURACY_RATES,
  CONFIDENCE_THRESHOLDS,
  INACCURACY_TYPE_WEIGHTS,
} from './narrativeEngine';

export type {
  ReporterPersonality,
  ReporterReputation,
  BeatReporter,
  VoiceProfile,
  ReporterMoraleConfig,
  NarrativeEventType,
  NarrativeContext,
  GeneratedNarrative,
  NarrativeGeneratorOptions,
  ReporterConfidence,
  InaccuracyType,
} from './narrativeEngine';
