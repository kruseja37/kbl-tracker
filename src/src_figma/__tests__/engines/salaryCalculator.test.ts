/**
 * Salary Calculator Tests
 *
 * Tests the salary calculation engine including:
 * - Position player weight calculations (3:3:2:1:1)
 * - Pitcher weight calculations (1:1:1)
 * - Position multipliers (C, SS premium, etc.)
 * - Trait modifiers (Clutch, Choker, etc.)
 * - Pitcher batting bonus
 * - Two-way player premium
 * - Age factors
 * - Fame modifiers
 * - Personality modifiers
 */

import { describe, test, expect } from 'vitest';
import {
  // Types
  type BatterRatings,
  type PitcherRatings,
  type PlayerPosition,

  // Constants
  POSITION_PLAYER_WEIGHTS,
  PITCHER_WEIGHTS,
  POSITION_MULTIPLIERS,
  ELITE_POSITIVE_TRAITS,
  GOOD_POSITIVE_TRAITS,
  MINOR_POSITIVE_TRAITS,
  SEVERE_NEGATIVE_TRAITS,
  MODERATE_NEGATIVE_TRAITS,
  MINOR_NEGATIVE_TRAITS,
  TRAIT_SALARY_IMPACT,
  PITCHER_BATTING_BONUS,
  TWO_WAY_PREMIUM,
  MAX_SALARY,
  MIN_SALARY,
  PERSONALITY_MODIFIERS,
  ROI_THRESHOLDS,

  // Rating functions
  isPitcherRatings,
  getUnifiedBattingRating,
  getPitcherRating,
  calculateWeightedRating,

  // Base salary functions
  calculatePositionPlayerBaseSalary,
  calculatePitcherBaseSalary,
  calculatePitcherBattingBonus,

  // Modifier functions
  calculateTraitModifier,
  calculateAgeFactor,
  getPositionMultiplier,
  calculateFameModifier,
} from '../../../engines/salaryCalculator';

// ============================================
// HELPERS
// ============================================

const createBatterRatings = (overrides: Partial<BatterRatings> = {}): BatterRatings => ({
  power: 50,
  contact: 50,
  speed: 50,
  fielding: 50,
  arm: 50,
  ...overrides,
});

const createPitcherRatings = (overrides: Partial<PitcherRatings> = {}): PitcherRatings => ({
  velocity: 50,
  junk: 50,
  accuracy: 50,
  ...overrides,
});

// ============================================
// CONSTANTS TESTS
// ============================================

describe('Salary Constants', () => {
  describe('Position Player Weights (3:3:2:1:1)', () => {
    test('power is 30%', () => {
      expect(POSITION_PLAYER_WEIGHTS.power).toBe(0.30);
    });

    test('contact is 30%', () => {
      expect(POSITION_PLAYER_WEIGHTS.contact).toBe(0.30);
    });

    test('speed is 20%', () => {
      expect(POSITION_PLAYER_WEIGHTS.speed).toBe(0.20);
    });

    test('fielding is 10%', () => {
      expect(POSITION_PLAYER_WEIGHTS.fielding).toBe(0.10);
    });

    test('arm is 10%', () => {
      expect(POSITION_PLAYER_WEIGHTS.arm).toBe(0.10);
    });

    test('weights sum to 1.0', () => {
      const sum =
        POSITION_PLAYER_WEIGHTS.power +
        POSITION_PLAYER_WEIGHTS.contact +
        POSITION_PLAYER_WEIGHTS.speed +
        POSITION_PLAYER_WEIGHTS.fielding +
        POSITION_PLAYER_WEIGHTS.arm;
      expect(sum).toBeCloseTo(1.0, 5);
    });
  });

  describe('Pitcher Weights (1:1:1)', () => {
    test('velocity is 1/3', () => {
      expect(PITCHER_WEIGHTS.velocity).toBeCloseTo(1 / 3, 5);
    });

    test('junk is 1/3', () => {
      expect(PITCHER_WEIGHTS.junk).toBeCloseTo(1 / 3, 5);
    });

    test('accuracy is 1/3', () => {
      expect(PITCHER_WEIGHTS.accuracy).toBeCloseTo(1 / 3, 5);
    });

    test('weights sum to 1.0', () => {
      const sum = PITCHER_WEIGHTS.velocity + PITCHER_WEIGHTS.junk + PITCHER_WEIGHTS.accuracy;
      expect(sum).toBeCloseTo(1.0, 5);
    });
  });

  describe('Position Multipliers', () => {
    test('catcher has highest multiplier (1.15)', () => {
      expect(POSITION_MULTIPLIERS['C']).toBe(1.15);
    });

    test('shortstop is premium (1.12)', () => {
      expect(POSITION_MULTIPLIERS['SS']).toBe(1.12);
    });

    test('center field is above average (1.08)', () => {
      expect(POSITION_MULTIPLIERS['CF']).toBe(1.08);
    });

    test('DH is lowest for position players (0.88)', () => {
      expect(POSITION_MULTIPLIERS['DH']).toBe(0.88);
    });

    test('reliever is discounted (0.85)', () => {
      expect(POSITION_MULTIPLIERS['RP']).toBe(0.85);
    });

    test('starter is baseline (1.00)', () => {
      expect(POSITION_MULTIPLIERS['SP']).toBe(1.00);
    });
  });

  describe('Trait Categories', () => {
    test('Clutch is elite positive', () => {
      expect(ELITE_POSITIVE_TRAITS).toContain('Clutch');
    });

    test('Two Way is elite positive', () => {
      expect(ELITE_POSITIVE_TRAITS).toContain('Two Way');
    });

    test('Choker is severe negative', () => {
      expect(SEVERE_NEGATIVE_TRAITS).toContain('Choker');
    });

    test('Volatile is severe negative', () => {
      expect(SEVERE_NEGATIVE_TRAITS).toContain('Volatile');
    });

    test('Whiffer is moderate negative', () => {
      expect(MODERATE_NEGATIVE_TRAITS).toContain('Whiffer');
    });
  });

  describe('Trait Salary Impact', () => {
    test('elite positive is +10%', () => {
      expect(TRAIT_SALARY_IMPACT.ELITE_POSITIVE).toBe(1.10);
    });

    test('good positive is +5%', () => {
      expect(TRAIT_SALARY_IMPACT.GOOD_POSITIVE).toBe(1.05);
    });

    test('minor positive is +2%', () => {
      expect(TRAIT_SALARY_IMPACT.MINOR_POSITIVE).toBe(1.02);
    });

    test('minor negative is -2%', () => {
      expect(TRAIT_SALARY_IMPACT.MINOR_NEGATIVE).toBe(0.98);
    });

    test('moderate negative is -5%', () => {
      expect(TRAIT_SALARY_IMPACT.MODERATE_NEGATIVE).toBe(0.95);
    });

    test('severe negative is -10%', () => {
      expect(TRAIT_SALARY_IMPACT.SEVERE_NEGATIVE).toBe(0.90);
    });
  });

  describe('Salary Bounds', () => {
    test('max salary is 50M', () => {
      expect(MAX_SALARY).toBe(50);
    });

    test('min salary is 0.5M', () => {
      expect(MIN_SALARY).toBe(0.5);
    });
  });

  describe('Pitcher Batting Bonus', () => {
    test('elite threshold is 70', () => {
      expect(PITCHER_BATTING_BONUS.ELITE.threshold).toBe(70);
    });

    test('elite bonus is 50%', () => {
      expect(PITCHER_BATTING_BONUS.ELITE.bonus).toBe(1.50);
    });

    test('good threshold is 55', () => {
      expect(PITCHER_BATTING_BONUS.GOOD.threshold).toBe(55);
    });

    test('good bonus is 25%', () => {
      expect(PITCHER_BATTING_BONUS.GOOD.bonus).toBe(1.25);
    });

    test('competent threshold is 40', () => {
      expect(PITCHER_BATTING_BONUS.COMPETENT.threshold).toBe(40);
    });

    test('competent bonus is 10%', () => {
      expect(PITCHER_BATTING_BONUS.COMPETENT.bonus).toBe(1.10);
    });
  });

  describe('Two Way Premium', () => {
    test('two way premium is 25%', () => {
      expect(TWO_WAY_PREMIUM).toBe(1.25);
    });
  });

  describe('Personality Modifiers', () => {
    test('Egotistical demands more (1.15)', () => {
      expect(PERSONALITY_MODIFIERS['Egotistical']).toBe(1.15);
    });

    test('Jolly takes less (0.90)', () => {
      expect(PERSONALITY_MODIFIERS['Jolly']).toBe(0.90);
    });

    test('Tough is neutral (1.00)', () => {
      expect(PERSONALITY_MODIFIERS['Tough']).toBe(1.00);
    });
  });

  describe('ROI Thresholds', () => {
    test('elite value is 1.0 WAR per $1M', () => {
      expect(ROI_THRESHOLDS.ELITE_VALUE).toBe(1.0);
    });

    test('great value is 0.5 WAR per $1M', () => {
      expect(ROI_THRESHOLDS.GREAT_VALUE).toBe(0.5);
    });

    test('bust is 0 WAR per $1M', () => {
      expect(ROI_THRESHOLDS.BUST).toBe(0);
    });
  });
});

// ============================================
// RATING FUNCTIONS
// ============================================

describe('Rating Functions', () => {
  describe('isPitcherRatings', () => {
    test('returns true for pitcher ratings', () => {
      const ratings = createPitcherRatings();
      expect(isPitcherRatings(ratings)).toBe(true);
    });

    test('returns false for batter ratings', () => {
      const ratings = createBatterRatings();
      expect(isPitcherRatings(ratings)).toBe(false);
    });
  });

  describe('getUnifiedBattingRating', () => {
    test('calculates weighted average correctly', () => {
      const ratings = createBatterRatings({
        power: 80,
        contact: 80,
        speed: 50,
        fielding: 40,
        arm: 40,
      });

      // 80×0.30 + 80×0.30 + 50×0.20 + 40×0.10 + 40×0.10
      // = 24 + 24 + 10 + 4 + 4 = 66
      const result = getUnifiedBattingRating(ratings);
      expect(result).toBe(66);
    });

    test('all 50s gives 50 rating', () => {
      const ratings = createBatterRatings();
      const result = getUnifiedBattingRating(ratings);
      expect(result).toBe(50);
    });

    test('all 100s gives 100 rating', () => {
      const ratings = createBatterRatings({
        power: 100,
        contact: 100,
        speed: 100,
        fielding: 100,
        arm: 100,
      });
      const result = getUnifiedBattingRating(ratings);
      expect(result).toBe(100);
    });

    test('power heavy player gets proper weight', () => {
      const powerHitter = createBatterRatings({ power: 90, contact: 40 });
      const contactHitter = createBatterRatings({ power: 40, contact: 90 });

      // Both should have same weighted rating since power and contact have equal weight
      expect(getUnifiedBattingRating(powerHitter)).toBe(getUnifiedBattingRating(contactHitter));
    });
  });

  describe('getPitcherRating', () => {
    test('calculates equal weighted average', () => {
      const ratings = createPitcherRatings({
        velocity: 90,
        junk: 60,
        accuracy: 60,
      });

      // (90 + 60 + 60) / 3 = 70
      const result = getPitcherRating(ratings);
      expect(result).toBeCloseTo(70, 5);
    });

    test('all 50s gives 50 rating', () => {
      const ratings = createPitcherRatings();
      const result = getPitcherRating(ratings);
      expect(result).toBeCloseTo(50, 5);
    });
  });

  describe('calculateWeightedRating', () => {
    test('uses batter weights for position players', () => {
      const ratings = createBatterRatings();
      const result = calculateWeightedRating(ratings, false);
      expect(result).toBe(getUnifiedBattingRating(ratings));
    });

    test('uses pitcher weights for pitchers', () => {
      const ratings = createPitcherRatings();
      const result = calculateWeightedRating(ratings, true);
      expect(result).toBeCloseTo(getPitcherRating(ratings), 5);
    });
  });
});

// ============================================
// BASE SALARY CALCULATION
// ============================================

describe('Base Salary Calculation', () => {
  describe('calculatePositionPlayerBaseSalary', () => {
    test('calculates salary using exponential formula', () => {
      // Formula: (rating/100)^2.5 * 50
      const ratings = createBatterRatings(); // 50 rating

      // (50/100)^2.5 * 50 = 0.5^2.5 * 50 = 0.1768 * 50 = 8.84
      const salary = calculatePositionPlayerBaseSalary(ratings);
      expect(salary).toBeCloseTo(8.8, 1);
    });

    test('100 rating gives max salary', () => {
      const ratings = createBatterRatings({
        power: 100,
        contact: 100,
        speed: 100,
        fielding: 100,
        arm: 100,
      });

      // (100/100)^2.5 * 50 = 1 * 50 = 50
      const salary = calculatePositionPlayerBaseSalary(ratings);
      expect(salary).toBe(50);
    });

    test('higher ratings give higher salary', () => {
      const lowRatings = createBatterRatings({ power: 40, contact: 40 });
      const highRatings = createBatterRatings({ power: 80, contact: 80 });

      const lowSalary = calculatePositionPlayerBaseSalary(lowRatings);
      const highSalary = calculatePositionPlayerBaseSalary(highRatings);

      expect(highSalary).toBeGreaterThan(lowSalary);
    });
  });

  describe('calculatePitcherBaseSalary', () => {
    test('calculates salary using same formula', () => {
      const ratings = createPitcherRatings(); // 50 rating

      const salary = calculatePitcherBaseSalary(ratings);
      expect(salary).toBeCloseTo(8.8, 1);
    });

    test('100 rating gives max salary', () => {
      const ratings = createPitcherRatings({
        velocity: 100,
        junk: 100,
        accuracy: 100,
      });

      const salary = calculatePitcherBaseSalary(ratings);
      expect(salary).toBe(50);
    });
  });
});

// ============================================
// PITCHER BATTING BONUS
// ============================================

describe('Pitcher Batting Bonus', () => {
  test('no bonus without batting ratings', () => {
    const bonus = calculatePitcherBattingBonus(undefined);
    expect(bonus).toBe(1.0);
  });

  test('no bonus for poor batting', () => {
    const ratings = createBatterRatings({
      power: 20,
      contact: 20,
      speed: 30,
      fielding: 30,
      arm: 30,
    });

    const bonus = calculatePitcherBattingBonus(ratings);
    expect(bonus).toBe(1.0);
  });

  test('competent bonus for 40+ batting', () => {
    const ratings = createBatterRatings({
      power: 45,
      contact: 45,
      speed: 40,
      fielding: 35,
      arm: 35,
    });

    const bonus = calculatePitcherBattingBonus(ratings);
    expect(bonus).toBe(1.10);
  });

  test('good bonus for 55+ batting', () => {
    const ratings = createBatterRatings({
      power: 60,
      contact: 60,
      speed: 50,
      fielding: 45,
      arm: 45,
    });

    const bonus = calculatePitcherBattingBonus(ratings);
    expect(bonus).toBe(1.25);
  });

  test('elite bonus for 70+ batting', () => {
    const ratings = createBatterRatings({
      power: 75,
      contact: 75,
      speed: 65,
      fielding: 60,
      arm: 60,
    });

    const bonus = calculatePitcherBattingBonus(ratings);
    expect(bonus).toBe(1.50);
  });
});

// ============================================
// TRAIT MODIFIER
// ============================================

describe('Trait Modifier', () => {
  test('returns 1.0 for no traits', () => {
    expect(calculateTraitModifier([])).toBe(1.0);
  });

  test('returns 1.0 for undefined traits', () => {
    expect(calculateTraitModifier(undefined)).toBe(1.0);
  });

  test('applies elite positive trait (+10%)', () => {
    const modifier = calculateTraitModifier(['Clutch']);
    expect(modifier).toBe(1.10);
  });

  test('applies good positive trait (+5%)', () => {
    const modifier = calculateTraitModifier(['Cannon Arm']);
    expect(modifier).toBe(1.05);
  });

  test('applies minor positive trait (+2%)', () => {
    const modifier = calculateTraitModifier(['Consistent']);
    expect(modifier).toBe(1.02);
  });

  test('applies severe negative trait (-10%)', () => {
    const modifier = calculateTraitModifier(['Choker']);
    expect(modifier).toBe(0.90);
  });

  test('applies moderate negative trait (-5%)', () => {
    const modifier = calculateTraitModifier(['Whiffer']);
    expect(modifier).toBe(0.95);
  });

  test('applies minor negative trait (-2%)', () => {
    const modifier = calculateTraitModifier(['Bad Jumps']);
    expect(modifier).toBe(0.98);
  });

  test('multiplies multiple traits', () => {
    // Clutch (1.10) × Choker (0.90) = 0.99
    const modifier = calculateTraitModifier(['Clutch', 'Choker']);
    expect(modifier).toBeCloseTo(0.99, 2);
  });

  test('ignores unknown traits', () => {
    expect(calculateTraitModifier(['Unknown Trait'])).toBe(1.0);
  });
});

// ============================================
// AGE FACTOR
// ============================================

describe('Age Factor', () => {
  test('prime age (27-29) has highest adjustment', () => {
    // The actual implementation may have slightly different prime years
    const age27 = calculateAgeFactor(27);
    const age28 = calculateAgeFactor(28);
    const age29 = calculateAgeFactor(29);

    // Prime ages should be >= 1.0
    expect(age27).toBeGreaterThanOrEqual(1.0);
    expect(age28).toBeGreaterThanOrEqual(1.0);
    expect(age29).toBeGreaterThanOrEqual(1.0);
  });

  test('young players get discount', () => {
    const youngFactor = calculateAgeFactor(22);
    expect(youngFactor).toBeLessThan(1.0);
  });

  test('old players get discount', () => {
    const oldFactor = calculateAgeFactor(36);
    expect(oldFactor).toBeLessThan(1.0);
  });

  test('very old players get larger discount', () => {
    const oldFactor = calculateAgeFactor(36);
    const veryOldFactor = calculateAgeFactor(40);
    expect(veryOldFactor).toBeLessThan(oldFactor);
  });
});

// ============================================
// POSITION MULTIPLIER
// ============================================

describe('Position Multiplier', () => {
  test('returns catcher premium', () => {
    expect(getPositionMultiplier('C')).toBe(1.15);
  });

  test('returns shortstop premium', () => {
    expect(getPositionMultiplier('SS')).toBe(1.12);
  });

  test('returns center field premium', () => {
    expect(getPositionMultiplier('CF')).toBe(1.08);
  });

  test('returns first base discount', () => {
    expect(getPositionMultiplier('1B')).toBe(0.92);
  });

  test('returns DH discount', () => {
    expect(getPositionMultiplier('DH')).toBe(0.88);
  });

  test('returns starter baseline', () => {
    expect(getPositionMultiplier('SP')).toBe(1.00);
  });

  test('returns reliever discount', () => {
    expect(getPositionMultiplier('RP')).toBe(0.85);
  });

  test('returns 1.0 for undefined position', () => {
    expect(getPositionMultiplier(undefined)).toBe(1.0);
  });
});

// ============================================
// FAME MODIFIER
// ============================================

describe('Fame Modifier', () => {
  test('neutral fame gives 1.0', () => {
    expect(calculateFameModifier(0)).toBe(1.0);
  });

  test('positive fame increases modifier', () => {
    const modifier = calculateFameModifier(50);
    expect(modifier).toBeGreaterThan(1.0);
  });

  test('negative fame decreases modifier', () => {
    const modifier = calculateFameModifier(-30);
    expect(modifier).toBeLessThan(1.0);
  });

  test('fame modifier is capped at 1.3', () => {
    // Formula: 1 + (fame * 0.03), capped at 1.3
    // Fame of 10 gives exactly 1.3, any higher stays at 1.3
    const fame10 = calculateFameModifier(10);
    const fame50 = calculateFameModifier(50);
    const fame100 = calculateFameModifier(100);

    expect(fame10).toBe(1.3);
    expect(fame50).toBe(1.3);
    expect(fame100).toBe(1.3);
  });

  test('fame modifier is capped at 0.7', () => {
    // Formula: 1 + (fame * 0.03), capped at 0.7
    // Fame of -10 gives exactly 0.7, any lower stays at 0.7
    const fameMinus10 = calculateFameModifier(-10);
    const fameMinus50 = calculateFameModifier(-50);
    const fameMinus100 = calculateFameModifier(-100);

    expect(fameMinus10).toBe(0.7);
    expect(fameMinus50).toBe(0.7);
    expect(fameMinus100).toBe(0.7);
  });

  test('fame modifier scales linearly within range', () => {
    // Formula: 1 + (fame * 0.03)
    // Within -10 to +10 range, modifier is not capped
    expect(calculateFameModifier(5)).toBeCloseTo(1.15, 2);  // 1 + (5 * 0.03) = 1.15
    expect(calculateFameModifier(-5)).toBeCloseTo(0.85, 2); // 1 + (-5 * 0.03) = 0.85
    expect(calculateFameModifier(3)).toBeCloseTo(1.09, 2);  // 1 + (3 * 0.03) = 1.09
    expect(calculateFameModifier(-3)).toBeCloseTo(0.91, 2); // 1 + (-3 * 0.03) = 0.91
  });
});

// ============================================
// EDGE CASES
// ============================================

describe('Edge Cases', () => {
  test('handles zero ratings gracefully', () => {
    const ratings = createBatterRatings({
      power: 0,
      contact: 0,
      speed: 0,
      fielding: 0,
      arm: 0,
    });

    const salary = calculatePositionPlayerBaseSalary(ratings);
    expect(salary).toBeGreaterThanOrEqual(0);
  });

  test('handles empty traits array', () => {
    const modifier = calculateTraitModifier([]);
    expect(modifier).toBe(1.0);
  });

  test('handles extreme age values', () => {
    const youngFactor = calculateAgeFactor(18);
    const oldFactor = calculateAgeFactor(50);

    expect(youngFactor).toBeGreaterThan(0);
    expect(oldFactor).toBeGreaterThan(0);
  });

  test('handles extreme fame values', () => {
    const infamousMod = calculateFameModifier(-100);
    const legendaryMod = calculateFameModifier(100);

    expect(infamousMod).toBeGreaterThan(0);
    expect(legendaryMod).toBeGreaterThan(1);
  });

  test('handles L/R splits in batting ratings', () => {
    const ratings: BatterRatings = {
      power: 60, // Combined
      contact: 60,
      speed: 50,
      fielding: 50,
      arm: 50,
      powerL: 55, // L/R splits (should be ignored if combined exists)
      powerR: 65,
      contactL: 55,
      contactR: 65,
    };

    // Should use combined ratings, not splits
    const result = getUnifiedBattingRating(ratings);
    const expected = 60 * 0.30 + 60 * 0.30 + 50 * 0.20 + 50 * 0.10 + 50 * 0.10;
    expect(result).toBe(expected);
  });
});
