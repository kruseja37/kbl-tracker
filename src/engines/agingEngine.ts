/**
 * AgingEngine - Player aging and development
 * Per Ralph Framework S-F005, S-F006
 *
 * Features:
 * - Young players improve
 * - Old players decline
 * - Retirement probability calculated
 * - Max age enforced (49)
 */

// Career phases
export const CareerPhase = {
  DEVELOPMENT: 'DEVELOPMENT', // 18-24
  PRIME: 'PRIME', // 25-32
  DECLINE: 'DECLINE', // 33-48
  FORCED_RETIREMENT: 'FORCED_RETIREMENT', // 49+
} as const;

export type CareerPhase = (typeof CareerPhase)[keyof typeof CareerPhase];

// Phase thresholds
const DEVELOPMENT_END = 24;
const PRIME_END = 32;
const MAX_AGE = 49;

// Rating change configuration
interface RatingChangeConfig {
  minChange: number;
  maxChange: number;
  declineChance: number; // 0-1, chance of decline in this phase
}

const PHASE_CONFIGS: Record<CareerPhase, RatingChangeConfig> = {
  [CareerPhase.DEVELOPMENT]: {
    minChange: -1,
    maxChange: 5,
    declineChance: 0.1, // 10% chance of decline
  },
  [CareerPhase.PRIME]: {
    minChange: -2,
    maxChange: 2,
    declineChance: 0.3, // 30% chance of decline
  },
  [CareerPhase.DECLINE]: {
    minChange: -5,
    maxChange: 1,
    declineChance: 0.8, // 80% chance of decline
  },
  [CareerPhase.FORCED_RETIREMENT]: {
    minChange: 0,
    maxChange: 0,
    declineChance: 1,
  },
};

// Retirement probability by age
const RETIREMENT_BASE_PROBABILITY: Record<number, number> = {
  35: 0.05,
  36: 0.08,
  37: 0.12,
  38: 0.18,
  39: 0.25,
  40: 0.35,
  41: 0.45,
  42: 0.55,
  43: 0.65,
  44: 0.75,
  45: 0.85,
  46: 0.90,
  47: 0.95,
  48: 0.98,
  49: 1.0, // Forced retirement
};

/**
 * Get career phase for an age
 */
export function getCareerPhase(age: number): CareerPhase {
  if (age >= MAX_AGE) return CareerPhase.FORCED_RETIREMENT;
  if (age > PRIME_END) return CareerPhase.DECLINE;
  if (age > DEVELOPMENT_END) return CareerPhase.PRIME;
  return CareerPhase.DEVELOPMENT;
}

/**
 * Get career phase display name
 */
export function getCareerPhaseDisplayName(phase: CareerPhase): string {
  const names: Record<CareerPhase, string> = {
    [CareerPhase.DEVELOPMENT]: 'Development',
    [CareerPhase.PRIME]: 'Prime Years',
    [CareerPhase.DECLINE]: 'Declining',
    [CareerPhase.FORCED_RETIREMENT]: 'Must Retire',
  };
  return names[phase];
}

/**
 * Get career phase color
 */
export function getCareerPhaseColor(phase: CareerPhase): string {
  const colors: Record<CareerPhase, string> = {
    [CareerPhase.DEVELOPMENT]: '#22c55e', // Green
    [CareerPhase.PRIME]: '#3b82f6', // Blue
    [CareerPhase.DECLINE]: '#fbbf24', // Yellow
    [CareerPhase.FORCED_RETIREMENT]: '#ef4444', // Red
  };
  return colors[phase];
}

/**
 * Calculate rating change for end of season
 */
export function calculateRatingChange(
  currentRating: number,
  age: number,
  performanceModifier: number = 0 // -1 to 1, based on season performance
): number {
  const phase = getCareerPhase(age);
  const config = PHASE_CONFIGS[phase];

  if (phase === CareerPhase.FORCED_RETIREMENT) {
    return 0;
  }

  // Determine if declining or improving
  const randomRoll = Math.random();
  const isDecline = randomRoll < config.declineChance;

  let change: number;
  if (isDecline) {
    // Decline: negative change
    change = Math.floor(
      Math.random() * (Math.abs(config.minChange) + 1)
    ) * -1;
  } else {
    // Improvement: positive change
    change = Math.floor(Math.random() * (config.maxChange + 1));
  }

  // Apply performance modifier
  change += Math.round(performanceModifier * 2);

  // Ensure rating stays in valid range
  const newRating = Math.max(1, Math.min(99, currentRating + change));
  return newRating - currentRating;
}

/**
 * Calculate retirement probability for a player
 */
export function calculateRetirementProbability(
  age: number,
  overallRating: number,
  fame: number = 0
): number {
  // Get base probability from age
  let probability = RETIREMENT_BASE_PROBABILITY[age] || 0;

  if (age < 35) {
    probability = 0; // No natural retirement before 35
  }

  if (age >= MAX_AGE) {
    return 1.0; // Forced retirement at 49
  }

  // Low rating increases probability
  if (overallRating < 50) {
    probability *= 1.5;
  } else if (overallRating < 60) {
    probability *= 1.25;
  } else if (overallRating > 80) {
    probability *= 0.7;
  }

  // Fame decreases probability (famous players stick around)
  if (fame > 50) {
    probability *= 0.8;
  } else if (fame > 80) {
    probability *= 0.6;
  }

  // Cap at 1.0
  return Math.min(1.0, probability);
}

/**
 * Determine if player retires this offseason
 */
export function shouldRetire(
  age: number,
  overallRating: number,
  fame: number = 0
): boolean {
  const probability = calculateRetirementProbability(age, overallRating, fame);
  return Math.random() < probability;
}

/**
 * Process end of season aging for a player
 */
export interface AgingResult {
  newAge: number;
  ratingChanges: { attribute: string; change: number }[];
  shouldRetire: boolean;
  retirementProbability: number;
  phase: CareerPhase;
}

export function processEndOfSeasonAging(
  currentAge: number,
  ratings: Record<string, number>,
  fame: number = 0,
  performanceModifier: number = 0
): AgingResult {
  const newAge = currentAge + 1;
  const phase = getCareerPhase(newAge);

  // Calculate overall rating for retirement check
  const ratingValues = Object.values(ratings);
  const overallRating =
    ratingValues.length > 0
      ? Math.round(ratingValues.reduce((a, b) => a + b, 0) / ratingValues.length)
      : 50;

  // Calculate rating changes for each attribute
  const ratingChanges: { attribute: string; change: number }[] = [];
  for (const [attribute, currentValue] of Object.entries(ratings)) {
    const change = calculateRatingChange(currentValue, newAge, performanceModifier);
    if (change !== 0) {
      ratingChanges.push({ attribute, change });
    }
  }

  // Check retirement
  const retirementProbability = calculateRetirementProbability(
    newAge,
    overallRating,
    fame
  );
  const retiring = shouldRetire(newAge, overallRating, fame);

  return {
    newAge,
    ratingChanges,
    shouldRetire: retiring,
    retirementProbability,
    phase,
  };
}

/**
 * Get years remaining estimate for a player
 */
export function getYearsRemainingEstimate(age: number): string {
  if (age >= MAX_AGE) return '0';
  if (age >= 40) return '1-3';
  if (age >= 35) return '3-7';
  if (age >= 30) return '5-12';
  return '10+';
}
