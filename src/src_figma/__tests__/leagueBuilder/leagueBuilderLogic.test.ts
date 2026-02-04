/**
 * League Builder Logic Tests
 *
 * Tests the business logic and validation rules for league building.
 * These tests verify player ratings, roster validation, and salary calculations.
 */

import { describe, test, expect } from 'vitest';

// ============================================
// TYPES (from leagueBuilderStorage)
// ============================================

type Position = 'C' | '1B' | '2B' | '3B' | 'SS' | 'LF' | 'CF' | 'RF' | 'DH' | 'SP' | 'RP';
type Grade = 'S' | 'A+' | 'A' | 'A-' | 'B+' | 'B' | 'B-' | 'C+' | 'C' | 'C-' | 'D+' | 'D';
type PitchType = '4F' | '2F' | 'CF' | 'CB' | 'SL' | 'CH' | 'FK' | 'SB' | 'SC' | 'KN';

interface PlayerRatings {
  power: number;
  contact: number;
  speed: number;
  fielding: number;
  arm: number;
  velocity?: number;
  junk?: number;
  accuracy?: number;
}

interface Player {
  id: string;
  name: string;
  position: Position;
  secondaryPosition?: Position;
  ratings: PlayerRatings;
  age: number;
  bats: 'L' | 'R' | 'S';
  throws: 'L' | 'R';
  arsenal?: PitchType[];
}

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Calculate overall grade from ratings
 */
function calculateOverallGrade(ratings: PlayerRatings, isPitcher: boolean): Grade {
  let overall: number;

  if (isPitcher) {
    // Pitchers: Average of velocity, junk, accuracy
    const vel = ratings.velocity ?? 50;
    const junk = ratings.junk ?? 50;
    const acc = ratings.accuracy ?? 50;
    overall = (vel + junk + acc) / 3;
  } else {
    // Position players: Weighted average (POW 30%, CON 30%, SPD 20%, FLD 10%, ARM 10%)
    overall = (
      ratings.power * 0.30 +
      ratings.contact * 0.30 +
      ratings.speed * 0.20 +
      ratings.fielding * 0.10 +
      ratings.arm * 0.10
    );
  }

  // Map to grade
  if (overall >= 90) return 'S';
  if (overall >= 85) return 'A+';
  if (overall >= 80) return 'A';
  if (overall >= 75) return 'A-';
  if (overall >= 70) return 'B+';
  if (overall >= 65) return 'B';
  if (overall >= 60) return 'B-';
  if (overall >= 55) return 'C+';
  if (overall >= 50) return 'C';
  if (overall >= 45) return 'C-';
  if (overall >= 40) return 'D+';
  return 'D';
}

/**
 * Validate player ratings are in range
 */
function validateRatings(ratings: PlayerRatings): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  const checkRange = (name: string, value: number | undefined) => {
    if (value === undefined) return;
    if (value < 0 || value > 99) {
      errors.push(`${name} must be 0-99, got ${value}`);
    }
  };

  checkRange('power', ratings.power);
  checkRange('contact', ratings.contact);
  checkRange('speed', ratings.speed);
  checkRange('fielding', ratings.fielding);
  checkRange('arm', ratings.arm);
  checkRange('velocity', ratings.velocity);
  checkRange('junk', ratings.junk);
  checkRange('accuracy', ratings.accuracy);

  return { valid: errors.length === 0, errors };
}

/**
 * Check if position is valid for a player
 */
function isValidPosition(position: Position, primaryPosition: Position, secondaryPosition?: Position): boolean {
  if (position === primaryPosition) return true;
  if (secondaryPosition && position === secondaryPosition) return true;
  // DH is always valid for non-pitchers
  if (position === 'DH' && primaryPosition !== 'SP' && primaryPosition !== 'RP') return true;
  return false;
}

/**
 * Check if roster has required positions filled
 */
function validateRoster(players: Player[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Required positions
  const requiredPositions: Position[] = ['C', '1B', '2B', '3B', 'SS', 'LF', 'CF', 'RF'];
  const filledPositions = new Set(players.map(p => p.position));

  for (const pos of requiredPositions) {
    if (!filledPositions.has(pos)) {
      errors.push(`Missing required position: ${pos}`);
    }
  }

  // Check minimum roster size
  if (players.length < 9) {
    errors.push(`Roster too small: need at least 9 players, have ${players.length}`);
  }

  // Check for pitchers
  const pitchers = players.filter(p => p.position === 'SP' || p.position === 'RP');
  if (pitchers.length < 5) {
    errors.push(`Need at least 5 pitchers, have ${pitchers.length}`);
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Calculate position player salary value
 */
function calculatePositionPlayerSalary(ratings: PlayerRatings, position: Position): number {
  // Base value from ratings (weighted 3:3:2:1:1)
  const baseValue = (
    ratings.power * 0.30 +
    ratings.contact * 0.30 +
    ratings.speed * 0.20 +
    ratings.fielding * 0.10 +
    ratings.arm * 0.10
  );

  // Position multipliers
  const positionMultipliers: Record<Position, number> = {
    'C': 1.15,
    'SS': 1.12,
    'CF': 1.08,
    '2B': 1.05,
    '3B': 1.05,
    'RF': 1.00,
    'LF': 1.00,
    '1B': 0.92,
    'DH': 0.88,
    'SP': 1.00,
    'RP': 1.00,
  };

  return baseValue * (positionMultipliers[position] ?? 1.0);
}

/**
 * Calculate pitcher salary value
 */
function calculatePitcherSalary(ratings: PlayerRatings, isStarter: boolean): number {
  const vel = ratings.velocity ?? 50;
  const junk = ratings.junk ?? 50;
  const acc = ratings.accuracy ?? 50;

  // Equal weights for pitchers
  const baseValue = (vel + junk + acc) / 3;

  // Role multiplier
  const roleMultiplier = isStarter ? 1.0 : 0.85;

  // Contact bonus for pitchers who can hit
  let hitBonus = 1.0;
  if (ratings.contact >= 70) hitBonus = 1.50;
  else if (ratings.contact >= 55) hitBonus = 1.25;
  else if (ratings.contact >= 40) hitBonus = 1.10;

  return baseValue * roleMultiplier * hitBonus;
}

/**
 * Validate age is in valid range
 */
function validateAge(age: number): boolean {
  return age >= 18 && age <= 48;
}

/**
 * Get career phase from age
 */
function getCareerPhase(age: number): string {
  if (age <= 24) return 'PROSPECT';
  if (age <= 29) return 'PRIME';
  if (age <= 34) return 'VETERAN';
  if (age <= 39) return 'DECLINE';
  return 'TWILIGHT';
}

/**
 * Validate arsenal for pitcher
 */
function validateArsenal(arsenal: PitchType[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (arsenal.length === 0) {
    errors.push('Pitcher must have at least one pitch');
  }

  if (arsenal.length > 5) {
    errors.push('Pitcher cannot have more than 5 pitches');
  }

  // Must have at least one fastball variant
  const fastballs: PitchType[] = ['4F', '2F', 'CF'];
  const hasFastball = arsenal.some(p => fastballs.includes(p));
  if (!hasFastball) {
    errors.push('Pitcher must have at least one fastball (4F, 2F, or CF)');
  }

  // Check for duplicates
  const unique = new Set(arsenal);
  if (unique.size !== arsenal.length) {
    errors.push('Arsenal contains duplicate pitches');
  }

  return { valid: errors.length === 0, errors };
}

// ============================================
// OVERALL GRADE TESTS
// ============================================

describe('Overall Grade Calculation', () => {
  describe('Position players', () => {
    test('elite player gets S grade', () => {
      const ratings: PlayerRatings = {
        power: 95, contact: 92, speed: 88, fielding: 85, arm: 90,
      };
      expect(calculateOverallGrade(ratings, false)).toBe('S');
    });

    test('good player gets B grade', () => {
      const ratings: PlayerRatings = {
        power: 70, contact: 72, speed: 68, fielding: 65, arm: 70,
      };
      // 70*0.3 + 72*0.3 + 68*0.2 + 65*0.1 + 70*0.1 = 21 + 21.6 + 13.6 + 6.5 + 7 = 69.7
      expect(calculateOverallGrade(ratings, false)).toBe('B');
    });

    test('average player gets C grade', () => {
      const ratings: PlayerRatings = {
        power: 50, contact: 52, speed: 48, fielding: 50, arm: 50,
      };
      expect(calculateOverallGrade(ratings, false)).toBe('C');
    });

    test('poor player gets D grade', () => {
      const ratings: PlayerRatings = {
        power: 30, contact: 35, speed: 40, fielding: 35, arm: 30,
      };
      expect(calculateOverallGrade(ratings, false)).toBe('D');
    });

    test('power/contact weigh more than fielding/arm', () => {
      // High power/contact, low fielding
      const hitter: PlayerRatings = {
        power: 90, contact: 90, speed: 50, fielding: 30, arm: 30,
      };
      // Low power/contact, high fielding
      const fielder: PlayerRatings = {
        power: 30, contact: 30, speed: 50, fielding: 90, arm: 90,
      };
      const hitterGrade = calculateOverallGrade(hitter, false);
      const fielderGrade = calculateOverallGrade(fielder, false);
      // Hitter: 90*0.3 + 90*0.3 + 50*0.2 + 30*0.1 + 30*0.1 = 27 + 27 + 10 + 3 + 3 = 70 = B+
      // Fielder: 30*0.3 + 30*0.3 + 50*0.2 + 90*0.1 + 90*0.1 = 9 + 9 + 10 + 9 + 9 = 46 = C-
      // Hitter should have better grade due to higher weight on hitting
      expect(hitterGrade).toBe('B+');
      expect(fielderGrade).toBe('C-');
    });
  });

  describe('Pitchers', () => {
    test('ace pitcher gets S grade', () => {
      const ratings: PlayerRatings = {
        power: 0, contact: 0, speed: 30, fielding: 40, arm: 70,
        velocity: 95, junk: 92, accuracy: 90,
      };
      expect(calculateOverallGrade(ratings, true)).toBe('S');
    });

    test('average pitcher gets C grade', () => {
      const ratings: PlayerRatings = {
        power: 0, contact: 0, speed: 30, fielding: 40, arm: 60,
        velocity: 50, junk: 52, accuracy: 48,
      };
      expect(calculateOverallGrade(ratings, true)).toBe('C');
    });

    test('pitcher grade ignores batting stats', () => {
      const pitcher: PlayerRatings = {
        power: 99, contact: 99, speed: 99, fielding: 99, arm: 99,
        velocity: 50, junk: 50, accuracy: 50,
      };
      // Should still be C despite elite batting stats
      expect(calculateOverallGrade(pitcher, true)).toBe('C');
    });
  });
});

// ============================================
// RATING VALIDATION TESTS
// ============================================

describe('Rating Validation', () => {
  test('valid ratings pass', () => {
    const ratings: PlayerRatings = {
      power: 75, contact: 80, speed: 65, fielding: 70, arm: 60,
    };
    const result = validateRatings(ratings);
    expect(result.valid).toBe(true);
    expect(result.errors.length).toBe(0);
  });

  test('negative rating fails', () => {
    const ratings: PlayerRatings = {
      power: -5, contact: 80, speed: 65, fielding: 70, arm: 60,
    };
    const result = validateRatings(ratings);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('power'))).toBe(true);
  });

  test('rating over 99 fails', () => {
    const ratings: PlayerRatings = {
      power: 75, contact: 105, speed: 65, fielding: 70, arm: 60,
    };
    const result = validateRatings(ratings);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('contact'))).toBe(true);
  });

  test('multiple invalid ratings reports all errors', () => {
    const ratings: PlayerRatings = {
      power: -5, contact: 105, speed: 65, fielding: 70, arm: 60,
    };
    const result = validateRatings(ratings);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBe(2);
  });

  test('boundary values 0 and 99 are valid', () => {
    const ratings: PlayerRatings = {
      power: 0, contact: 99, speed: 0, fielding: 99, arm: 50,
    };
    const result = validateRatings(ratings);
    expect(result.valid).toBe(true);
  });
});

// ============================================
// POSITION VALIDATION TESTS
// ============================================

describe('Position Validation', () => {
  test('primary position is valid', () => {
    expect(isValidPosition('SS', 'SS', undefined)).toBe(true);
  });

  test('secondary position is valid', () => {
    expect(isValidPosition('2B', 'SS', '2B')).toBe(true);
  });

  test('DH is valid for position players', () => {
    expect(isValidPosition('DH', 'CF', undefined)).toBe(true);
  });

  test('DH is not valid for pitchers', () => {
    expect(isValidPosition('DH', 'SP', undefined)).toBe(false);
    expect(isValidPosition('DH', 'RP', undefined)).toBe(false);
  });

  test('unrelated position is invalid', () => {
    expect(isValidPosition('C', 'SS', '2B')).toBe(false);
  });
});

// ============================================
// ROSTER VALIDATION TESTS
// ============================================

describe('Roster Validation', () => {
  const createPlayer = (pos: Position): Player => ({
    id: Math.random().toString(),
    name: `Player ${pos}`,
    position: pos,
    ratings: { power: 50, contact: 50, speed: 50, fielding: 50, arm: 50 },
    age: 25,
    bats: 'R',
    throws: 'R',
  });

  test('valid roster passes', () => {
    const players: Player[] = [
      createPlayer('C'),
      createPlayer('1B'),
      createPlayer('2B'),
      createPlayer('3B'),
      createPlayer('SS'),
      createPlayer('LF'),
      createPlayer('CF'),
      createPlayer('RF'),
      createPlayer('SP'),
      createPlayer('SP'),
      createPlayer('SP'),
      createPlayer('RP'),
      createPlayer('RP'),
    ];
    const result = validateRoster(players);
    expect(result.valid).toBe(true);
  });

  test('missing catcher fails', () => {
    const players: Player[] = [
      createPlayer('1B'),
      createPlayer('2B'),
      createPlayer('3B'),
      createPlayer('SS'),
      createPlayer('LF'),
      createPlayer('CF'),
      createPlayer('RF'),
      createPlayer('SP'),
      createPlayer('SP'),
      createPlayer('SP'),
      createPlayer('RP'),
      createPlayer('RP'),
    ];
    const result = validateRoster(players);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('C'))).toBe(true);
  });

  test('too few players fails', () => {
    const players: Player[] = [
      createPlayer('C'),
      createPlayer('1B'),
      createPlayer('SP'),
    ];
    const result = validateRoster(players);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('Roster too small'))).toBe(true);
  });

  test('too few pitchers fails', () => {
    const players: Player[] = [
      createPlayer('C'),
      createPlayer('1B'),
      createPlayer('2B'),
      createPlayer('3B'),
      createPlayer('SS'),
      createPlayer('LF'),
      createPlayer('CF'),
      createPlayer('RF'),
      createPlayer('SP'),
    ];
    const result = validateRoster(players);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('pitchers'))).toBe(true);
  });
});

// ============================================
// SALARY CALCULATION TESTS
// ============================================

describe('Salary Calculation', () => {
  describe('Position player salary', () => {
    test('catcher gets 15% premium', () => {
      const ratings: PlayerRatings = {
        power: 70, contact: 70, speed: 70, fielding: 70, arm: 70,
      };
      const catcherSalary = calculatePositionPlayerSalary(ratings, 'C');
      const rfSalary = calculatePositionPlayerSalary(ratings, 'RF');
      expect(catcherSalary).toBeCloseTo(rfSalary * 1.15, 1);
    });

    test('DH gets 12% discount', () => {
      const ratings: PlayerRatings = {
        power: 70, contact: 70, speed: 70, fielding: 70, arm: 70,
      };
      const dhSalary = calculatePositionPlayerSalary(ratings, 'DH');
      const rfSalary = calculatePositionPlayerSalary(ratings, 'RF');
      expect(dhSalary).toBeCloseTo(rfSalary * 0.88, 1);
    });

    test('shortstop gets 12% premium', () => {
      const ratings: PlayerRatings = {
        power: 70, contact: 70, speed: 70, fielding: 70, arm: 70,
      };
      const ssSalary = calculatePositionPlayerSalary(ratings, 'SS');
      const rfSalary = calculatePositionPlayerSalary(ratings, 'RF');
      expect(ssSalary).toBeCloseTo(rfSalary * 1.12, 1);
    });
  });

  describe('Pitcher salary', () => {
    test('starter has higher value than reliever', () => {
      const ratings: PlayerRatings = {
        power: 0, contact: 0, speed: 30, fielding: 40, arm: 60,
        velocity: 75, junk: 70, accuracy: 72,
      };
      const starterSalary = calculatePitcherSalary(ratings, true);
      const relieverSalary = calculatePitcherSalary(ratings, false);
      expect(starterSalary).toBeGreaterThan(relieverSalary);
    });

    test('high contact pitcher gets 50% bonus', () => {
      const baseRatings: PlayerRatings = {
        power: 0, contact: 30, speed: 30, fielding: 40, arm: 60,
        velocity: 75, junk: 70, accuracy: 72,
      };
      const hittingRatings: PlayerRatings = {
        ...baseRatings,
        contact: 70,
      };
      const baseSalary = calculatePitcherSalary(baseRatings, true);
      const hittingSalary = calculatePitcherSalary(hittingRatings, true);
      expect(hittingSalary).toBeCloseTo(baseSalary * 1.5, 1);
    });
  });
});

// ============================================
// AGE VALIDATION TESTS
// ============================================

describe('Age Validation', () => {
  test('valid ages pass', () => {
    expect(validateAge(18)).toBe(true);
    expect(validateAge(25)).toBe(true);
    expect(validateAge(40)).toBe(true);
    expect(validateAge(48)).toBe(true);
  });

  test('too young fails', () => {
    expect(validateAge(17)).toBe(false);
    expect(validateAge(15)).toBe(false);
  });

  test('too old fails', () => {
    expect(validateAge(49)).toBe(false);
    expect(validateAge(55)).toBe(false);
  });
});

// ============================================
// CAREER PHASE TESTS
// ============================================

describe('Career Phase', () => {
  test('young player is PROSPECT', () => {
    expect(getCareerPhase(18)).toBe('PROSPECT');
    expect(getCareerPhase(24)).toBe('PROSPECT');
  });

  test('mid-20s is PRIME', () => {
    expect(getCareerPhase(25)).toBe('PRIME');
    expect(getCareerPhase(29)).toBe('PRIME');
  });

  test('early 30s is VETERAN', () => {
    expect(getCareerPhase(30)).toBe('VETERAN');
    expect(getCareerPhase(34)).toBe('VETERAN');
  });

  test('late 30s is DECLINE', () => {
    expect(getCareerPhase(35)).toBe('DECLINE');
    expect(getCareerPhase(39)).toBe('DECLINE');
  });

  test('40+ is TWILIGHT', () => {
    expect(getCareerPhase(40)).toBe('TWILIGHT');
    expect(getCareerPhase(48)).toBe('TWILIGHT');
  });
});

// ============================================
// ARSENAL VALIDATION TESTS
// ============================================

describe('Arsenal Validation', () => {
  test('valid arsenal passes', () => {
    const arsenal: PitchType[] = ['4F', 'CB', 'SL', 'CH'];
    const result = validateArsenal(arsenal);
    expect(result.valid).toBe(true);
  });

  test('empty arsenal fails', () => {
    const arsenal: PitchType[] = [];
    const result = validateArsenal(arsenal);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('at least one pitch'))).toBe(true);
  });

  test('too many pitches fails', () => {
    const arsenal: PitchType[] = ['4F', '2F', 'CB', 'SL', 'CH', 'FK'];
    const result = validateArsenal(arsenal);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('more than 5'))).toBe(true);
  });

  test('no fastball fails', () => {
    const arsenal: PitchType[] = ['CB', 'SL', 'CH'];
    const result = validateArsenal(arsenal);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('fastball'))).toBe(true);
  });

  test('duplicate pitches fails', () => {
    const arsenal: PitchType[] = ['4F', 'CB', 'CB'];
    const result = validateArsenal(arsenal);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('duplicate'))).toBe(true);
  });

  test('single fastball is valid', () => {
    const arsenal: PitchType[] = ['4F'];
    const result = validateArsenal(arsenal);
    expect(result.valid).toBe(true);
  });
});
