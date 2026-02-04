/**
 * Figma GameTracker Engines Index
 *
 * Per FIGMA_IMPLEMENTATION_PLAN.md
 * Central export for all game tracking engines
 */

// Phase 1.1 - Adaptive Learning (existing)
export {
  recordFieldingEvent,
  predictFielder,
  getInferenceAccuracy,
  getZoneAccuracy,
  getOverridePatterns,
  clearLearningData,
  exportLearningData,
  importLearningData,
  buildHitZone,
  type FieldingEvent,
  type LearningStats,
  type ZoneProbability,
} from './adaptiveLearningEngine';

// Phase 1.2 - Save/Blown Save Detection
export {
  isSaveOpportunity,
  isSaveOpportunityBool,
  detectSave,
  detectBlownSave,
  detectHold,
  calculateLead,
  createPitcherAppearance,
  updatePitcherAppearance,
  finalizePitcherAppearance,
  type GameState,
  type PitcherAppearance,
  type SaveResult,
  type SaveDetectionResult,
} from './saveDetector';

// Phase 1.3 - Inherited/Bequeathed Runner Tracking
export {
  createRunnerTrackingState,
  addRunner,
  advanceRunner,
  runnerOut,
  handlePitchingChange,
  handlePinchRunner,
  clearBases,
  nextInning,
  nextAtBat,
  getERSummary,
  getCurrentBases,
  type TrackedRunner,
  type PitcherRunnerStats,
  type RunnerTrackingState,
  type RunnerScoredEvent,
} from './inheritedRunnerTracker';

// Phase 1.4 - D3K Tracking
export {
  isD3KLegal,
  checkD3KLegality,
  createD3KEvent,
  aggregateBatterD3KStats,
  aggregateCatcherD3KStats,
  getD3KDisplayMessage,
  getD3KIcon,
  shouldTriggerD3KFlow,
  getD3KOptions,
  type D3KOutcome,
  type D3KEvent,
  type D3KStats,
  type CatcherD3KStats,
} from './d3kTracker';

// Phase 3 - Detection Functions Integration
export {
  convertPlayDataToPlayResult,
  convertGameStateToContext,
  mapDetectionToUI,
  runPlayDetections,
  isSpectacularCatch,
  isPotentialRobbery,
  type UIDetectionResult,
} from './detectionIntegration';

// Phase 4 - Fame System Integration
export {
  // Fame calculation
  calculateFame,
  getLIMultiplier,
  getPlayoffMultiplier,
  getFameTier,

  // Fame event display
  formatFameEvent,
  formatFameValue,
  getFameColor,
  getTierColor,
  getFameIcon,

  // Game Fame tracking
  createGameFameTracker,
  addFameEvent,
  getPlayerGameFame,
  getPlayerGameEvents,
  getGameFameSummary,

  // Quick detection
  detectStrikeoutFameEvent,
  detectMultiHRFameEvent,
  detectMultiHitFameEvent,
  detectRBIFameEvent,
  detectPitcherKFameEvent,
  detectMeltdownFameEvent,

  // LI helpers
  describeLIEffect,
  getLITier,

  // Player Fame summary
  createPlayerFameSummary,

  type FameEventDisplay,
  type PlayerFameSummary,
  type GameFameTracker,
} from './fameIntegration';

// Phase 5 - Player State Integration
export {
  // Combined player state
  createCombinedPlayerState,
  adjustStatForState,
  adjustBattingStats,
  adjustPitchingStats,
  getStateBadge,
  getMultiplierIndicator,
  formatMultiplier,
  detectStateChanges,
  createGamePlayerState,
  updateGamePlayerState,

  type CombinedPlayerState,
  type BattingStats,
  type PitchingStats,
  type StateChangeNotification,
  type GamePlayerState,
} from './playerStateIntegration';

// Phase 6 - mWAR Integration (Manager WAR)
export {
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
  type ManagerMomentState,

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

  // Manager Moment integration
  checkManagerMoment,
  createGameMWARState,
  recordManagerDecision,
  getMWARDisplayInfo,
  getLITierDescription,
  getLIColor,
  shouldShowManagerMoment,
} from './mwarIntegration';

// Phase 7 - Fan Morale Integration
export {
  // Types
  type FanState,
  type MoraleTrend,
  type RiskLevel,
  type GameDate,
  type FanMorale,
  type MoraleEventType,
  type MoraleModifier,
  type MoraleEvent,
  type MoraleUpdate,
  type PerformanceClass,
  type PerformanceContext,
  type SeasonContext,
  type ExpectedWinsTrigger,
  type ExpectedWins,
  type FanReactionType,
  type FanReaction,
  type ExpectedWinsUpdate,
  type FanVerdict,
  type TradeAftermath,
  type AcquiredPlayerTracking,
  type ProspectSpotlight,
  type GameResult as FanMoraleGameResult,
  type PlayerGamePerformance,
  type ContractionRisk,

  // Constants
  FAN_STATE_THRESHOLDS,
  FAN_STATE_CONFIG,
  BASE_MORALE_IMPACTS,
  FAN_MORALE_CONFIG,

  // Functions
  getFanState,
  getRiskLevel,
  initializeFanMorale,
  classifyPerformance,
  getPerformanceMultiplier,
  getTimingMultiplier,
  getHistoryModifier,
  calculateExpectedWins,
  determineFanReaction,
  startTradeAftermath,
  updateTradeAftermath,
  calculateFanVerdict,
  getPostTradeGameImpact,
  calculateMoraleBaseline,
  calculateMoraleDrift,
  applyMomentum,
  calculateTrend,
  createGameMoraleEvent,
  processMoraleEvent,
  processMoraleDrift,
  checkForStreakEvent,
  calculateContractionRisk,

  // Display helpers
  getFanStateDisplay,
  getRiskLevelDisplay,
  getTrendDisplay,
  formatMorale,
  getMoraleBarColor,
  getTradeScrutinyLevel,
  getFAAttractiveness,
} from './fanMoraleIntegration';

// Phase 8 - Relationship/Chemistry Integration
export {
  // Types/Constants
  RelationshipType,
  RELATIONSHIP_ICONS,
  type Relationship,
  type TradeWarning,
  type RelationshipCategory,
  type RelationshipDisplayInfo,
  type TeamChemistrySummary,

  // Core functions
  generateRelationshipId,
  canCreateRelationship,
  createRelationship,
  getPlayerRelationships,
  calculateMoraleEffect,
  getMoraleBreakdown,
  generateTradeWarnings,
  endRelationship,
  getRelationshipDisplayName,

  // Figma helpers
  getRelationshipCategory,
  getRelationshipDisplayInfo,
  getRelationshipsByCategory,
  calculateTeamChemistry,
  getChemistryRatingColor,
} from './relationshipIntegration';

// Phase 9 - Aging/Development Integration
export {
  // Types/Constants
  CareerPhase,
  type AgingResult,
  type AgeDisplayInfo,
  type DevelopmentPotential,
  type BatchAgingResult,

  // Core functions
  getCareerPhase,
  getCareerPhaseDisplayName,
  getCareerPhaseColor,
  calculateRatingChange,
  calculateRetirementProbability,
  shouldRetire,
  processEndOfSeasonAging,
  getYearsRemainingEstimate,

  // Figma helpers
  getAgeDisplayInfo,
  calculateDevelopmentPotential,
  getUpsideColor,
  processTeamAging,
  formatRetirementRisk,
} from './agingIntegration';
