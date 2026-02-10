/**
 * Grade Engine - Player Overall Grade Calculation & Prospect Generation
 *
 * Per GRADE_ALGORITHM_SPEC.md:
 * - Position player grades based on weighted stats (3:3:2:1:1)
 * - Pitcher grades based on equal weights (1:1:1)
 * - Two-way player premium (1.25×)
 * - Prospect generation with round-based distributions
 * - Position-specific stat biases
 *
 * MAJ-B4-004: Uses spec's data-driven thresholds (from 261 player analysis),
 * NOT the simpler 5-point interval test helper values.
 */

// ============================================
// TYPES
// ============================================

export type Grade = 'S' | 'A+' | 'A' | 'A-' | 'B+' | 'B' | 'B-' | 'C+' | 'C' | 'C-' | 'D+' | 'D';

export interface PositionPlayerRatings {
  power: number;
  contact: number;
  speed: number;
  fielding: number;
  arm: number;
}

export interface PitcherRatings {
  velocity: number;
  junk: number;
  accuracy: number;
}

export interface ProspectOutput {
  grade: Grade;
  potentialCeiling: Grade;
  ratings: PositionPlayerRatings | PitcherRatings;
  isPitcher: boolean;
  arsenal?: string[];
  trait?: string;
}

// ============================================
// GRADE THRESHOLDS (Spec §Position Player / Pitcher Thresholds)
// MAJ-B4-004: Data-driven from 261 player analysis
// ============================================

export const POSITION_PLAYER_GRADE_THRESHOLDS: { grade: Grade; min: number }[] = [
  { grade: 'S',  min: 80 },
  { grade: 'A+', min: 78 },
  { grade: 'A',  min: 73 },
  { grade: 'A-', min: 66 },
  { grade: 'B+', min: 58 },
  { grade: 'B',  min: 55 },
  { grade: 'B-', min: 48 },
  { grade: 'C+', min: 45 },
  { grade: 'C',  min: 38 },
  { grade: 'C-', min: 35 },
  { grade: 'D+', min: 30 },
  { grade: 'D',  min: 0 },
];

export const PITCHER_GRADE_THRESHOLDS: { grade: Grade; min: number }[] = [
  { grade: 'S',  min: 80 },
  { grade: 'A+', min: 78 },
  { grade: 'A',  min: 73 },
  { grade: 'A-', min: 66 },
  { grade: 'B+', min: 58 },
  { grade: 'B',  min: 55 },
  { grade: 'B-', min: 48 },
  { grade: 'C+', min: 45 },
  { grade: 'C',  min: 38 },
  { grade: 'C-', min: 35 },
  { grade: 'D+', min: 30 },
  { grade: 'D',  min: 0 },
];

// ============================================
// WEIGHT CONSTANTS
// ============================================

/** Position player weights: 3:3:2:1:1 = POW/CON/SPD/FLD/ARM */
const BATTER_WEIGHTS = {
  power: 0.30,
  contact: 0.30,
  speed: 0.20,
  fielding: 0.10,
  arm: 0.10,
};

/** Pitcher weights: equal 1:1:1 */
const PITCHER_WEIGHTS = {
  velocity: 1 / 3,
  junk: 1 / 3,
  accuracy: 1 / 3,
};

// ============================================
// GRADE CALCULATION
// ============================================

/** Calculate weighted rating for a position player */
export function calculatePositionWeightedRating(ratings: PositionPlayerRatings): number {
  return (
    ratings.power * BATTER_WEIGHTS.power +
    ratings.contact * BATTER_WEIGHTS.contact +
    ratings.speed * BATTER_WEIGHTS.speed +
    ratings.fielding * BATTER_WEIGHTS.fielding +
    ratings.arm * BATTER_WEIGHTS.arm
  );
}

/** Calculate weighted rating for a pitcher */
export function calculatePitcherWeightedRating(ratings: PitcherRatings): number {
  return (
    ratings.velocity * PITCHER_WEIGHTS.velocity +
    ratings.junk * PITCHER_WEIGHTS.junk +
    ratings.accuracy * PITCHER_WEIGHTS.accuracy
  );
}

/** Look up grade from weighted rating using threshold table */
export function gradeFromWeightedRating(
  weighted: number,
  thresholds: { grade: Grade; min: number }[] = POSITION_PLAYER_GRADE_THRESHOLDS
): Grade {
  for (const { grade, min } of thresholds) {
    if (weighted >= min) return grade;
  }
  return 'D';
}

/** Calculate grade for a position player */
export function calculatePositionPlayerGrade(ratings: PositionPlayerRatings): Grade {
  const weighted = calculatePositionWeightedRating(ratings);
  return gradeFromWeightedRating(weighted, POSITION_PLAYER_GRADE_THRESHOLDS);
}

/** Calculate grade for a pitcher */
export function calculatePitcherGrade(ratings: PitcherRatings): Grade {
  const weighted = calculatePitcherWeightedRating(ratings);
  return gradeFromWeightedRating(weighted, PITCHER_GRADE_THRESHOLDS);
}

/**
 * GAP-B4-006: Two-way player valuation
 * Combined grade = (posRating + pitchRating) × 1.25 premium
 */
export function calculateTwoWayPlayerGrade(
  posRatings: PositionPlayerRatings,
  pitchRatings: PitcherRatings
): Grade {
  const posWeighted = calculatePositionWeightedRating(posRatings);
  const pitchWeighted = calculatePitcherWeightedRating(pitchRatings);
  const combined = (posWeighted + pitchWeighted) * 1.25;
  // Use position thresholds scaled for the combined range
  // Combined max is (99 + 99) * 1.25 = 247.5, but we normalize to single-player scale
  const normalized = combined / 2;
  return gradeFromWeightedRating(normalized, POSITION_PLAYER_GRADE_THRESHOLDS);
}

// ============================================
// PROSPECT GENERATION
// ============================================

/** Position-specific stat biases for prospect generation (GAP-B4-007) */
export const POSITION_STAT_BIAS: Record<string, Partial<PositionPlayerRatings>> = {
  C:  { speed: -10, fielding: 10, arm: 10 },
  '1B': { power: 15, speed: -10, fielding: -5 },
  '2B': { power: -10, contact: 5, speed: 5 },
  SS: { power: -10, speed: 5, fielding: 10, arm: 5 },
  '3B': { power: 10, speed: -10, arm: 5 },
  LF: { power: 10, fielding: -5, arm: -5 },
  CF: { power: -10, speed: 15, fielding: 5 },
  RF: { power: 5, speed: -5, arm: 10 },
};

/** Target weighted ranges for draft grades */
const DRAFT_GRADE_TARGETS: Record<string, { min: number; max: number }> = {
  'B':  { min: 55, max: 62 },
  'B-': { min: 48, max: 54 },
  'C+': { min: 45, max: 47 },
  'C':  { min: 38, max: 44 },
  'C-': { min: 35, max: 37 },
};

/** Round-based grade probability distributions (GAP-B4-008) */
const ROUND_GRADE_PROBABILITIES: Record<number, { grade: string; probability: number }[]> = {
  1: [
    { grade: 'B', probability: 0.25 },
    { grade: 'B-', probability: 0.35 },
    { grade: 'C+', probability: 0.25 },
    { grade: 'C', probability: 0.10 },
    { grade: 'C-', probability: 0.05 },
  ],
  2: [
    { grade: 'B', probability: 0.10 },
    { grade: 'B-', probability: 0.20 },
    { grade: 'C+', probability: 0.35 },
    { grade: 'C', probability: 0.25 },
    { grade: 'C-', probability: 0.10 },
  ],
  // Rounds 4+ use the "later" distribution
  4: [
    { grade: 'B', probability: 0.05 },
    { grade: 'B-', probability: 0.15 },
    { grade: 'C+', probability: 0.30 },
    { grade: 'C', probability: 0.30 },
    { grade: 'C-', probability: 0.20 },
  ],
};
// Round 3 uses same as round 2
ROUND_GRADE_PROBABILITIES[3] = ROUND_GRADE_PROBABILITIES[2];

/** Ceiling probability distributions by current grade (GAP-B4-009) */
const CEILING_PROBABILITIES: Record<string, { ceiling: Grade; probability: number }[]> = {
  'B': [
    { ceiling: 'A', probability: 0.20 },
    { ceiling: 'A-', probability: 0.40 },
    { ceiling: 'B+', probability: 0.30 },
    { ceiling: 'B', probability: 0.10 },
  ],
  'B-': [
    { ceiling: 'A', probability: 0.05 },
    { ceiling: 'A-', probability: 0.25 },
    { ceiling: 'B+', probability: 0.40 },
    { ceiling: 'B', probability: 0.30 },
  ],
  'C+': [
    { ceiling: 'A-', probability: 0.05 },
    { ceiling: 'B+', probability: 0.25 },
    { ceiling: 'B', probability: 0.45 },
    { ceiling: 'B-', probability: 0.25 },
  ],
  'C': [
    { ceiling: 'B+', probability: 0.10 },
    { ceiling: 'B', probability: 0.30 },
    { ceiling: 'B-', probability: 0.60 },
  ],
  'C-': [
    { ceiling: 'B', probability: 0.15 },
    { ceiling: 'B-', probability: 0.85 },
  ],
};

/** Prospect trait pool (only positive/neutral traits) */
const PROSPECT_TRAIT_POOL = [
  'Fastball Hitter', 'Off-Speed Hitter', 'Mind Gamer', 'Tough Out',
  'First Pitch Slayer', 'Consistent', 'Clutch', 'Sprinter',
  'RBI Hero', 'Durable', 'Sign Stealer', 'Pinch Perfect',
];

/** Trait generation odds by grade */
const TRAIT_ODDS: Record<string, number> = {
  'B': 0.40,
  'B-': 0.30,
  'C+': 0.20,
  'C': 0.20,
  'C-': 0.20,
};

/** Sample from a weighted probability distribution */
function sampleFromDistribution<T>(items: { probability: number }[] & T[]): T {
  const roll = Math.random();
  let cumulative = 0;
  for (const item of items) {
    cumulative += item.probability;
    if (roll <= cumulative) return item;
  }
  return items[items.length - 1];
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(val)));
}

function randomize(val: number, range = 10): number {
  return val + (Math.random() - 0.5) * range * 2;
}

/**
 * GAP-B4-008: Generate prospect grade based on draft round
 */
export function generateProspectGrade(round: number): string {
  const probabilities = ROUND_GRADE_PROBABILITIES[round] ?? ROUND_GRADE_PROBABILITIES[4];
  return sampleFromDistribution(probabilities).grade;
}

/**
 * GAP-B4-009: Generate potential ceiling based on current grade
 */
export function generatePotentialCeiling(currentGrade: string): Grade {
  const probabilities = CEILING_PROBABILITIES[currentGrade];
  if (!probabilities) return 'B-';
  return sampleFromDistribution(probabilities).ceiling;
}

/**
 * GAP-B4-007: Generate position player prospect ratings
 * Uses POSITION_STAT_BIAS and grade-specific target ranges
 */
export function generateProspectRatings(
  targetGrade: string,
  position: string
): PositionPlayerRatings {
  const target = DRAFT_GRADE_TARGETS[targetGrade] ?? DRAFT_GRADE_TARGETS['C'];
  const targetWeighted = target.min + Math.random() * (target.max - target.min);
  const baseRating = targetWeighted / (BATTER_WEIGHTS.power + BATTER_WEIGHTS.contact + BATTER_WEIGHTS.speed + BATTER_WEIGHTS.fielding + BATTER_WEIGHTS.arm);

  const bias = POSITION_STAT_BIAS[position] ?? {};

  let power = clamp(randomize(baseRating + (bias.power ?? 0)), 15, 85);
  let contact = clamp(randomize(baseRating + (bias.contact ?? 0)), 15, 85);
  let speed = clamp(randomize(baseRating + (bias.speed ?? 0)), 15, 85);
  let fielding = clamp(randomize(baseRating + (bias.fielding ?? 0)), 15, 85);
  let arm = clamp(randomize(baseRating + (bias.arm ?? 0)), 15, 85);

  // Verify grade and adjust if needed
  const actualWeighted = power * BATTER_WEIGHTS.power +
    contact * BATTER_WEIGHTS.contact +
    speed * BATTER_WEIGHTS.speed +
    fielding * BATTER_WEIGHTS.fielding +
    arm * BATTER_WEIGHTS.arm;

  const actualGrade = gradeFromWeightedRating(actualWeighted);
  if (actualGrade !== targetGrade) {
    const adjustment = (targetWeighted - actualWeighted) / 1.0;
    power = clamp(power + adjustment * BATTER_WEIGHTS.power, 15, 85);
    contact = clamp(contact + adjustment * BATTER_WEIGHTS.contact, 15, 85);
    speed = clamp(speed + adjustment * BATTER_WEIGHTS.speed, 15, 85);
    fielding = clamp(fielding + adjustment * BATTER_WEIGHTS.fielding, 15, 85);
    arm = clamp(arm + adjustment * BATTER_WEIGHTS.arm, 15, 85);
  }

  return { power, contact, speed, fielding, arm };
}

/**
 * GAP-B4-010: Generate pitcher prospect ratings with SP/RP/CP bias
 */
export function generatePitcherProspectRatings(
  targetGrade: string,
  role: 'SP' | 'RP' | 'CP'
): PitcherRatings {
  const target = DRAFT_GRADE_TARGETS[targetGrade] ?? DRAFT_GRADE_TARGETS['C'];
  const targetWeighted = target.min + Math.random() * (target.max - target.min);
  const baseRating = targetWeighted; // equal weights sum to 1

  let velBias = 0, jnkBias = 0, accBias = 0;

  if (role === 'SP') {
    accBias = 5;
    velBias = -2;
    jnkBias = -3;
  } else if (role === 'CP') {
    velBias = 8;
    jnkBias = 5;
    accBias = -13;
  } else {
    // RP: random style
    const style = Math.random();
    if (style < 0.33) {
      velBias = 10; accBias = -10; // Power arm
    } else if (style < 0.66) {
      jnkBias = 10; velBias = -10; // Crafty
    }
    // else: balanced
  }

  return {
    velocity: clamp(randomize(baseRating + velBias), 15, 85),
    junk: clamp(randomize(baseRating + jnkBias), 15, 85),
    accuracy: clamp(randomize(baseRating + accBias), 15, 85),
  };
}

/**
 * GAP-B4-010: Generate pitch arsenal based on junk rating
 */
export function generateArsenal(junk: number): string[] {
  const pitches = ['4F', '2F'];
  const offSpeed = ['CB', 'SL', 'CH', 'FK', 'CF', 'SB'];

  // Shuffle off-speed pitches
  const shuffled = [...offSpeed].sort(() => Math.random() - 0.5);

  let count: number;
  if (junk >= 70) {
    count = 3 + (Math.random() > 0.5 ? 1 : 0); // 3-4
  } else if (junk >= 55) {
    count = 2 + (Math.random() > 0.5 ? 1 : 0); // 2-3
  } else if (junk >= 40) {
    count = 1 + (Math.random() > 0.5 ? 1 : 0); // 1-2
  } else {
    count = 1;
  }

  pitches.push(...shuffled.slice(0, count));
  return pitches;
}

/**
 * Generate a trait for a prospect (may return undefined)
 */
export function generateProspectTrait(grade: string): string | undefined {
  const odds = TRAIT_ODDS[grade] ?? 0.20;
  if (Math.random() < odds) {
    return PROSPECT_TRAIT_POOL[Math.floor(Math.random() * PROSPECT_TRAIT_POOL.length)];
  }
  return undefined;
}

/**
 * Full prospect generation: grade + ratings + ceiling + trait + arsenal (for pitchers)
 */
export function generateFullProspect(
  round: number,
  position: string,
  isPitcher: boolean,
  pitcherRole?: 'SP' | 'RP' | 'CP'
): ProspectOutput {
  const grade = generateProspectGrade(round) as Grade;
  const potentialCeiling = generatePotentialCeiling(grade);

  if (isPitcher && pitcherRole) {
    const ratings = generatePitcherProspectRatings(grade, pitcherRole);
    const arsenal = generateArsenal(ratings.junk);
    const trait = generateProspectTrait(grade);
    return { grade, potentialCeiling, ratings, isPitcher: true, arsenal, trait };
  }

  const ratings = generateProspectRatings(grade, position);
  const trait = generateProspectTrait(grade);
  return { grade, potentialCeiling, ratings, isPitcher: false, trait };
}
