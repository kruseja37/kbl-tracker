/**
 * Fan Morale Integration for Figma GameTracker
 * Per FAN_MORALE_SYSTEM_SPEC.md
 *
 * Integrates the legacy fanMoraleEngine into the Figma codebase.
 * Tracks fan morale 0-99, contraction risk, trade scrutiny, FA attractiveness.
 */

// Import from legacy fanMoraleEngine
import {
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
  type GameResult,
  type PlayerGamePerformance,
  type ContractionRisk,

  // Constants
  FAN_STATE_THRESHOLDS,
  FAN_STATE_CONFIG,
  BASE_MORALE_IMPACTS,
  FAN_MORALE_CONFIG,

  // State functions
  getFanState,
  getRiskLevel,
  initializeFanMorale,

  // Performance classification
  classifyPerformance,
  getPerformanceMultiplier,
  getTimingMultiplier,
  getHistoryModifier,

  // Expected wins
  calculateExpectedWins,
  determineFanReaction,

  // Trade aftermath
  startTradeAftermath,
  updateTradeAftermath,
  calculateFanVerdict,
  getPostTradeGameImpact,

  // Morale calculations
  calculateMoraleBaseline,
  calculateMoraleDrift,
  applyMomentum,
  calculateTrend,
  createGameMoraleEvent,
  processMoraleEvent,
  processMoraleDrift,
  checkForStreakEvent,
  calculateContractionRisk,
} from '../../../engines/fanMoraleEngine';

// Re-export all types
export type {
  FanState,
  MoraleTrend,
  RiskLevel,
  GameDate,
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
  GameResult,
  PlayerGamePerformance,
  ContractionRisk,
};

// Re-export constants
export {
  FAN_STATE_THRESHOLDS,
  FAN_STATE_CONFIG,
  BASE_MORALE_IMPACTS,
  FAN_MORALE_CONFIG,
};

// Re-export all functions
export {
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
};

// ============================================
// FIGMA-SPECIFIC HELPERS
// ============================================

/**
 * Get display info for fan state
 */
export function getFanStateDisplay(fanState: FanState): {
  label: string;
  color: string;
  icon: string;
  description: string;
} {
  const config = FAN_STATE_CONFIG[fanState];
  return {
    label: config.label,
    color: config.color,
    icon: getMoraleIcon(fanState),
    description: getFanStateDescription(fanState),
  };
}

/**
 * Get icon for fan state
 *
 * Legacy FanState values: EUPHORIC, EXCITED, CONTENT, RESTLESS, FRUSTRATED, APATHETIC, HOSTILE
 */
function getMoraleIcon(fanState: FanState): string {
  switch (fanState) {
    case 'EUPHORIC': return '🏆';   // 90-99: Championship fever
    case 'EXCITED': return '🔥';    // 75-89: Playoff buzz
    case 'CONTENT': return '😊';    // 55-74: Satisfied fanbase
    case 'RESTLESS': return '😒';   // 40-54: Growing impatient
    case 'FRUSTRATED': return '😤'; // 25-39: Angry but loyal
    case 'APATHETIC': return '😐';  // 10-24: Checked out
    case 'HOSTILE': return '😡';    // 0-9: Demanding change
    default: return '😐';
  }
}

/**
 * Get description for fan state
 *
 * Legacy FanState values: EUPHORIC, EXCITED, CONTENT, RESTLESS, FRUSTRATED, APATHETIC, HOSTILE
 */
function getFanStateDescription(fanState: FanState): string {
  switch (fanState) {
    case 'EUPHORIC': return 'Championship fever! Fans are absolutely thrilled. Stadium atmosphere is electric.';
    case 'EXCITED': return 'Playoff buzz! Fans are excited and engaged. Strong support.';
    case 'CONTENT': return 'Fans are satisfied. Steady support and attendance.';
    case 'RESTLESS': return 'Fans are getting impatient. Attendance may start slipping.';
    case 'FRUSTRATED': return 'Fans are unhappy. Media criticism increasing.';
    case 'APATHETIC': return 'Fans have checked out. Low attendance and engagement.';
    case 'HOSTILE': return 'Fans are demanding changes. Front office under pressure.';
    default: return 'Fan morale is unknown.';
  }
}

/**
 * Get risk level display
 */
export function getRiskLevelDisplay(riskLevel: RiskLevel): {
  label: string;
  color: string;
  description: string;
} {
  switch (riskLevel) {
    case 'SAFE':
      return {
        label: 'Safe',
        color: '#22c55e',
        description: 'Team is secure. No contraction risk.',
      };
    case 'WATCH':
      return {
        label: 'Watch',
        color: '#eab308',
        description: 'Team should be monitored. Performance matters.',
      };
    case 'DANGER':
      return {
        label: 'Danger',
        color: '#f97316',
        description: 'Team is at risk. Improvement needed.',
      };
    case 'CRITICAL':
      return {
        label: 'Critical',
        color: '#dc2626',
        description: 'Contraction possible! Immediate action required.',
      };
    default:
      return {
        label: 'Unknown',
        color: '#6b7280',
        description: 'Risk level unknown.',
      };
  }
}

/**
 * Get morale trend display
 */
export function getTrendDisplay(trend: MoraleTrend): {
  label: string;
  color: string;
  arrow: string;
} {
  switch (trend) {
    case 'RISING':
      return { label: 'Rising', color: '#22c55e', arrow: '↑' };
    case 'STABLE':
      return { label: 'Stable', color: '#6b7280', arrow: '→' };
    case 'FALLING':
      return { label: 'Falling', color: '#dc2626', arrow: '↓' };
    default:
      return { label: 'Unknown', color: '#6b7280', arrow: '?' };
  }
}

/**
 * Format morale value for display
 */
export function formatMorale(morale: number): string {
  return Math.round(morale).toString();
}

/**
 * Get morale bar color
 */
export function getMoraleBarColor(morale: number): string {
  if (morale >= 80) return '#22c55e';  // Green
  if (morale >= 60) return '#84cc16';  // Lime
  if (morale >= 40) return '#eab308';  // Yellow
  if (morale >= 20) return '#f97316';  // Orange
  return '#dc2626';  // Red
}

/**
 * Calculate trade scrutiny level (affects how fans react to trades)
 */
export function getTradeScrutinyLevel(morale: number): {
  level: 'LOW' | 'MEDIUM' | 'HIGH' | 'EXTREME';
  multiplier: number;
  description: string;
} {
  if (morale >= 70) {
    return {
      level: 'LOW',
      multiplier: 0.8,
      description: 'Happy fans trust the front office',
    };
  }
  if (morale >= 50) {
    return {
      level: 'MEDIUM',
      multiplier: 1.0,
      description: 'Fans watching trades closely',
    };
  }
  if (morale >= 30) {
    return {
      level: 'HIGH',
      multiplier: 1.3,
      description: 'Fans skeptical of management decisions',
    };
  }
  return {
    level: 'EXTREME',
    multiplier: 1.6,
    description: 'Every move heavily scrutinized',
  };
}

/**
 * Calculate FA attractiveness (affects free agent interest)
 */
export function getFAAttractiveness(morale: number, marketSize: 'SMALL' | 'MEDIUM' | 'LARGE'): {
  rating: number;  // 0-100
  tier: 'ELITE' | 'DESIRABLE' | 'AVERAGE' | 'BELOW_AVERAGE' | 'UNATTRACTIVE';
  description: string;
} {
  // Base attractiveness from morale
  let rating = morale;

  // Market size modifier
  switch (marketSize) {
    case 'LARGE':
      rating += 15;
      break;
    case 'MEDIUM':
      rating += 5;
      break;
    case 'SMALL':
      rating -= 10;
      break;
  }

  // Clamp to 0-100
  rating = Math.max(0, Math.min(100, rating));

  // Determine tier
  let tier: 'ELITE' | 'DESIRABLE' | 'AVERAGE' | 'BELOW_AVERAGE' | 'UNATTRACTIVE';
  let description: string;

  if (rating >= 85) {
    tier = 'ELITE';
    description = 'Top free agents actively want to play here';
  } else if (rating >= 70) {
    tier = 'DESIRABLE';
    description = 'Quality free agents interested';
  } else if (rating >= 50) {
    tier = 'AVERAGE';
    description = 'Standard free agent interest';
  } else if (rating >= 30) {
    tier = 'BELOW_AVERAGE';
    description = 'May need to overpay for free agents';
  } else {
    tier = 'UNATTRACTIVE';
    description = 'Significant premium needed to attract talent';
  }

  return { rating, tier, description };
}
