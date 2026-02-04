/**
 * Aging Integration for Figma GameTracker
 * Per Ralph Framework S-F005, S-F006
 *
 * Integrates the legacy agingEngine into the Figma codebase.
 * Handles player aging, development, and retirement.
 */

// Import from legacy agingEngine
import {
  // Types/Constants
  CareerPhase,
  type AgingResult,

  // Functions
  getCareerPhase,
  getCareerPhaseDisplayName,
  getCareerPhaseColor,
  calculateRatingChange,
  calculateRetirementProbability,
  shouldRetire,
  processEndOfSeasonAging,
  getYearsRemainingEstimate,
} from '../../../engines/agingEngine';

// Re-export all
export {
  CareerPhase,
  type AgingResult,
  getCareerPhase,
  getCareerPhaseDisplayName,
  getCareerPhaseColor,
  calculateRatingChange,
  calculateRetirementProbability,
  shouldRetire,
  processEndOfSeasonAging,
  getYearsRemainingEstimate,
};

// ============================================
// FIGMA-SPECIFIC HELPERS
// ============================================

/**
 * Age display info for UI
 */
export interface AgeDisplayInfo {
  age: number;
  phase: typeof CareerPhase[keyof typeof CareerPhase];
  phaseName: string;
  phaseColor: string;
  yearsRemaining: string;
  retirementRisk: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CERTAIN';
  retirementRiskColor: string;
}

/**
 * Get comprehensive age display info
 */
export function getAgeDisplayInfo(
  age: number,
  overallRating: number,
  fame: number = 0
): AgeDisplayInfo {
  const phase = getCareerPhase(age);
  const retirementProb = calculateRetirementProbability(age, overallRating, fame);

  let retirementRisk: AgeDisplayInfo['retirementRisk'];
  let retirementRiskColor: string;

  if (retirementProb >= 1.0) {
    retirementRisk = 'CERTAIN';
    retirementRiskColor = '#dc2626';  // Red
  } else if (retirementProb >= 0.5) {
    retirementRisk = 'HIGH';
    retirementRiskColor = '#f97316';  // Orange
  } else if (retirementProb >= 0.2) {
    retirementRisk = 'MEDIUM';
    retirementRiskColor = '#eab308';  // Yellow
  } else if (retirementProb > 0) {
    retirementRisk = 'LOW';
    retirementRiskColor = '#84cc16';  // Lime
  } else {
    retirementRisk = 'NONE';
    retirementRiskColor = '#22c55e';  // Green
  }

  return {
    age,
    phase,
    phaseName: getCareerPhaseDisplayName(phase),
    phaseColor: getCareerPhaseColor(phase),
    yearsRemaining: getYearsRemainingEstimate(age),
    retirementRisk,
    retirementRiskColor,
  };
}

/**
 * Development potential for young players
 */
export interface DevelopmentPotential {
  currentRating: number;
  potentialRange: { min: number; max: number };
  expectedChange: number;
  upside: 'ELITE' | 'HIGH' | 'AVERAGE' | 'LIMITED' | 'DECLINING';
  description: string;
}

/**
 * Calculate development potential for a player
 */
export function calculateDevelopmentPotential(
  age: number,
  currentRating: number
): DevelopmentPotential {
  const phase = getCareerPhase(age);

  let potentialRange: { min: number; max: number };
  let expectedChange: number;
  let upside: DevelopmentPotential['upside'];
  let description: string;

  switch (phase) {
    case CareerPhase.DEVELOPMENT:
      // Young players have high upside
      potentialRange = {
        min: currentRating - 2,
        max: Math.min(99, currentRating + 15),
      };
      expectedChange = 2.5;
      if (currentRating < 50) {
        upside = 'ELITE';
        description = 'Major development potential';
      } else if (currentRating < 70) {
        upside = 'HIGH';
        description = 'Strong upside remaining';
      } else {
        upside = 'AVERAGE';
        description = 'Some improvement possible';
      }
      break;

    case CareerPhase.PRIME:
      // Prime players are stable
      potentialRange = {
        min: currentRating - 3,
        max: currentRating + 3,
      };
      expectedChange = 0;
      upside = 'AVERAGE';
      description = 'Peak performance years';
      break;

    case CareerPhase.DECLINE:
      // Declining players will lose skills
      potentialRange = {
        min: Math.max(1, currentRating - 10),
        max: currentRating + 1,
      };
      expectedChange = -2.5;
      upside = 'LIMITED';
      description = 'Skills declining';
      break;

    default:
      // Forced retirement
      potentialRange = { min: currentRating, max: currentRating };
      expectedChange = 0;
      upside = 'DECLINING';
      description = 'Must retire';
  }

  return {
    currentRating,
    potentialRange,
    expectedChange,
    upside,
    description,
  };
}

/**
 * Get upside color for UI
 */
export function getUpsideColor(upside: DevelopmentPotential['upside']): string {
  switch (upside) {
    case 'ELITE': return '#22c55e';  // Green
    case 'HIGH': return '#84cc16';  // Lime
    case 'AVERAGE': return '#eab308';  // Yellow
    case 'LIMITED': return '#f97316';  // Orange
    case 'DECLINING': return '#dc2626';  // Red
    default: return '#6b7280';  // Gray
  }
}

/**
 * Batch process aging for multiple players
 */
export interface BatchAgingResult {
  playerResults: Map<string, AgingResult>;
  retirements: string[];  // Player IDs who retired
  totalRatingChange: number;
  averageRatingChange: number;
}

/**
 * Process aging for a batch of players
 *
 * NOTE: The legacy processEndOfSeasonAging expects ratings as Record<string, number>
 * (e.g., { power: 75, contact: 80, speed: 60 }), not a single overallRating number.
 * This wrapper accepts overallRating for convenience and wraps it.
 */
export function processTeamAging(
  players: Array<{
    playerId: string;
    currentAge: number;
    overallRating: number;
    ratings?: Record<string, number>;  // Optional: full ratings breakdown
    fame?: number;
    performanceModifier?: number;
  }>
): BatchAgingResult {
  const playerResults = new Map<string, AgingResult>();
  const retirements: string[] = [];
  let totalRatingChange = 0;

  for (const player of players) {
    // Use full ratings if provided, otherwise wrap overallRating
    const ratingsToUse = player.ratings ?? { overall: player.overallRating };

    const result = processEndOfSeasonAging(
      player.currentAge,
      ratingsToUse,
      player.fame || 0,
      player.performanceModifier || 0
    );

    playerResults.set(player.playerId, result);

    // Sum up all rating changes from the result
    const totalChange = result.ratingChanges.reduce((sum, rc) => sum + rc.change, 0);
    totalRatingChange += totalChange;

    if (result.shouldRetire) {
      retirements.push(player.playerId);
    }
  }

  return {
    playerResults,
    retirements,
    totalRatingChange,
    averageRatingChange: players.length > 0 ? totalRatingChange / players.length : 0,
  };
}

/**
 * Format retirement risk for display
 */
export function formatRetirementRisk(probability: number): string {
  if (probability >= 1.0) return 'Must Retire';
  if (probability >= 0.5) return `${Math.round(probability * 100)}% (High)`;
  if (probability >= 0.2) return `${Math.round(probability * 100)}% (Medium)`;
  if (probability > 0) return `${Math.round(probability * 100)}% (Low)`;
  return 'None';
}
