/**
 * Leverage Index Calculator Tests
 *
 * Phase 2.4 of Testing Implementation Plan
 *
 * Tests the leverageCalculator.ts engine which calculates:
 * - Base-out leverage index
 * - Inning multipliers
 * - Score dampeners
 * - Walk-off boosts
 * - Complete LI calculation
 * - gmLI for relievers
 * - Clutch situation detection
 *
 * Per LEVERAGE_INDEX_SPEC.md
 */

import { describe, test, expect } from 'vitest';
import {
  BaseState,
  BASE_OUT_LI,
  LI_BOUNDS,
  LI_CATEGORIES,
  encodeBaseState,
  decodeBaseState,
  getBaseOutLI,
  getInningMultiplier,
  getScoreDampener,
  getLICategory,
  calculateLeverageIndex,
  getLeverageIndex,
  createLIAccumulator,
  addLIAppearance,
  calculateGmLI,
  gmLIToLeverageMultiplier,
  estimateGmLI,
  isClutchSituation,
  isHighLeverageSituation,
  isExtremeLeverageSituation,
  calculateClutchValue,
  estimateWinProbability,
  formatLI,
  getLIColor,
  getLIEmoji,
  LI_SCENARIOS,
  type GameStateForLI,
  type RunnersOnBase,
} from '../../../engines/leverageCalculator';

// ============================================
// TEST DATA HELPERS
// ============================================

function createGameState(overrides: Partial<GameStateForLI> = {}): GameStateForLI {
  return {
    inning: 5,
    halfInning: 'TOP',
    outs: 1,
    runners: { first: false, second: false, third: false },
    homeScore: 0,
    awayScore: 0,
    ...overrides,
  };
}

function createRunners(config: { first?: boolean; second?: boolean; third?: boolean } = {}): RunnersOnBase {
  return {
    first: config.first ?? false,
    second: config.second ?? false,
    third: config.third ?? false,
  };
}

// ============================================
// BASE STATE CONSTANTS TESTS
// ============================================

describe('BaseState Constants', () => {
  test('EMPTY is 0', () => {
    expect(BaseState.EMPTY).toBe(0);
  });

  test('FIRST is 1 (bitwise 001)', () => {
    expect(BaseState.FIRST).toBe(1);
  });

  test('SECOND is 2 (bitwise 010)', () => {
    expect(BaseState.SECOND).toBe(2);
  });

  test('FIRST_SECOND is 3 (bitwise 011)', () => {
    expect(BaseState.FIRST_SECOND).toBe(3);
  });

  test('THIRD is 4 (bitwise 100)', () => {
    expect(BaseState.THIRD).toBe(4);
  });

  test('FIRST_THIRD is 5 (bitwise 101)', () => {
    expect(BaseState.FIRST_THIRD).toBe(5);
  });

  test('SECOND_THIRD is 6 (bitwise 110)', () => {
    expect(BaseState.SECOND_THIRD).toBe(6);
  });

  test('LOADED is 7 (bitwise 111)', () => {
    expect(BaseState.LOADED).toBe(7);
  });
});

// ============================================
// BASE-OUT LI TABLE TESTS
// ============================================

describe('Base-Out LI Table', () => {
  test('table has 8 base states (0-7)', () => {
    expect(BASE_OUT_LI.length).toBe(8);
  });

  test('each base state has 3 out states (0-2)', () => {
    for (const state of BASE_OUT_LI) {
      expect(state.length).toBe(3);
    }
  });

  test('empty bases, 0 out = 0.86', () => {
    expect(BASE_OUT_LI[0][0]).toBe(0.86);
  });

  test('empty bases, 2 out = 0.93', () => {
    expect(BASE_OUT_LI[0][2]).toBe(0.93);
  });

  test('bases loaded, 2 out = 2.67 (highest)', () => {
    expect(BASE_OUT_LI[7][2]).toBe(2.67);
  });

  test('runner on 1st, 0 out = 1.07', () => {
    expect(BASE_OUT_LI[1][0]).toBe(1.07);
  });

  test('runner on 2nd, 2 out = 1.56', () => {
    expect(BASE_OUT_LI[2][2]).toBe(1.56);
  });

  test('2nd and 3rd, 2 out = 2.50', () => {
    expect(BASE_OUT_LI[6][2]).toBe(2.50);
  });

  test('LI increases with more runners on base', () => {
    // At 0 outs
    expect(BASE_OUT_LI[0][0]).toBeLessThan(BASE_OUT_LI[1][0]); // Empty < 1st
    expect(BASE_OUT_LI[1][0]).toBeLessThan(BASE_OUT_LI[3][0]); // 1st < 1st+2nd
    expect(BASE_OUT_LI[3][0]).toBeLessThan(BASE_OUT_LI[7][0]); // 1st+2nd < Loaded
  });

  test('LI generally increases with more outs', () => {
    // For non-empty bases, more outs = higher LI (more pressure)
    for (let state = 1; state <= 7; state++) {
      expect(BASE_OUT_LI[state][2]).toBeGreaterThanOrEqual(BASE_OUT_LI[state][0]);
    }
  });
});

// ============================================
// LI BOUNDS TESTS
// ============================================

describe('LI Bounds', () => {
  test('minimum LI is 0.1', () => {
    expect(LI_BOUNDS.min).toBe(0.1);
  });

  test('maximum LI is 10.0', () => {
    expect(LI_BOUNDS.max).toBe(10.0);
  });
});

// ============================================
// LI CATEGORIES TESTS
// ============================================

describe('LI Categories', () => {
  test('LOW is 0.0 - 0.85', () => {
    expect(LI_CATEGORIES.LOW.min).toBe(0.0);
    expect(LI_CATEGORIES.LOW.max).toBe(0.85);
  });

  test('MEDIUM is 0.85 - 2.0', () => {
    expect(LI_CATEGORIES.MEDIUM.min).toBe(0.85);
    expect(LI_CATEGORIES.MEDIUM.max).toBe(2.0);
  });

  test('HIGH is 2.0 - 5.0', () => {
    expect(LI_CATEGORIES.HIGH.min).toBe(2.0);
    expect(LI_CATEGORIES.HIGH.max).toBe(5.0);
  });

  test('EXTREME is 5.0+', () => {
    expect(LI_CATEGORIES.EXTREME.min).toBe(5.0);
    expect(LI_CATEGORIES.EXTREME.max).toBe(Infinity);
  });
});

// ============================================
// BASE STATE ENCODING/DECODING TESTS
// ============================================

describe('Base State Encoding', () => {
  test('empty bases encodes to 0', () => {
    expect(encodeBaseState({ first: false, second: false, third: false })).toBe(0);
  });

  test('runner on first encodes to 1', () => {
    expect(encodeBaseState({ first: true, second: false, third: false })).toBe(1);
  });

  test('runner on second encodes to 2', () => {
    expect(encodeBaseState({ first: false, second: true, third: false })).toBe(2);
  });

  test('runners on first and second encodes to 3', () => {
    expect(encodeBaseState({ first: true, second: true, third: false })).toBe(3);
  });

  test('runner on third encodes to 4', () => {
    expect(encodeBaseState({ first: false, second: false, third: true })).toBe(4);
  });

  test('bases loaded encodes to 7', () => {
    expect(encodeBaseState({ first: true, second: true, third: true })).toBe(7);
  });
});

describe('Base State Decoding', () => {
  test('0 decodes to empty bases', () => {
    const result = decodeBaseState(0);
    expect(result.first).toBe(false);
    expect(result.second).toBe(false);
    expect(result.third).toBe(false);
  });

  test('1 decodes to runner on first', () => {
    const result = decodeBaseState(1);
    expect(result.first).toBe(true);
    expect(result.second).toBe(false);
    expect(result.third).toBe(false);
  });

  test('7 decodes to bases loaded', () => {
    const result = decodeBaseState(7);
    expect(result.first).toBe(true);
    expect(result.second).toBe(true);
    expect(result.third).toBe(true);
  });

  test('encode/decode round trip', () => {
    for (let state = 0; state <= 7; state++) {
      const decoded = decodeBaseState(state as typeof BaseState.EMPTY);
      const encoded = encodeBaseState(decoded);
      expect(encoded).toBe(state);
    }
  });
});

// ============================================
// GET BASE-OUT LI TESTS
// ============================================

describe('getBaseOutLI', () => {
  test('empty, 0 out returns 0.86', () => {
    expect(getBaseOutLI(0, 0)).toBe(0.86);
  });

  test('loaded, 2 out returns 2.67', () => {
    expect(getBaseOutLI(7, 2)).toBe(2.67);
  });

  test('1st, 1 out returns 1.10', () => {
    expect(getBaseOutLI(1, 1)).toBe(1.10);
  });

  test('2nd+3rd, 1 out returns 2.10', () => {
    expect(getBaseOutLI(6, 1)).toBe(2.10);
  });
});

// ============================================
// INNING MULTIPLIER TESTS
// ============================================

describe('Inning Multiplier', () => {
  test('early game (inning 1-3) has low multiplier ~0.75', () => {
    const result = getInningMultiplier(1, 'TOP', 9, 0);
    expect(result.multiplier).toBeCloseTo(0.75, 1);
  });

  test('mid game (inning 4-6) has neutral multiplier ~1.0', () => {
    const result = getInningMultiplier(5, 'TOP', 9, 0);
    expect(result.multiplier).toBeCloseTo(1.0, 1);
  });

  test('late game (inning 7-8) has higher multiplier ~1.3', () => {
    const result = getInningMultiplier(7, 'TOP', 9, 0);
    expect(result.multiplier).toBeCloseTo(1.3, 1);
  });

  test('final inning has highest multiplier ~1.8', () => {
    const result = getInningMultiplier(9, 'TOP', 9, 0);
    expect(result.multiplier).toBeCloseTo(1.8, 1);
  });

  test('extra innings increase multiplier further', () => {
    const ninth = getInningMultiplier(9, 'TOP', 9, 0);
    const tenth = getInningMultiplier(10, 'TOP', 9, 0);
    const eleventh = getInningMultiplier(11, 'TOP', 9, 0);

    expect(tenth.multiplier).toBeGreaterThan(ninth.multiplier);
    expect(eleventh.multiplier).toBeGreaterThan(tenth.multiplier);
  });

  test('extra innings multiplier capped at 2.5', () => {
    const result = getInningMultiplier(15, 'TOP', 9, 0);
    expect(result.multiplier).toBeLessThanOrEqual(2.5);
  });

  test('walkoff boost applied in bottom of final inning when tied', () => {
    const result = getInningMultiplier(9, 'BOTTOM', 9, 0);
    expect(result.walkoffBoost).toBe(1.40);
  });

  test('walkoff boost applied when trailing in bottom of final', () => {
    const result = getInningMultiplier(9, 'BOTTOM', 9, -1);
    expect(result.walkoffBoost).toBe(1.40);
  });

  test('no walkoff boost when leading in bottom of final', () => {
    const result = getInningMultiplier(9, 'BOTTOM', 9, 2);
    expect(result.walkoffBoost).toBe(1.0);
  });

  test('no walkoff boost in top of inning', () => {
    const result = getInningMultiplier(9, 'TOP', 9, 0);
    expect(result.walkoffBoost).toBe(1.0);
  });

  test('adapts to shorter games (5-inning SMB4)', () => {
    // In a 5-inning game, inning 4 is "late game"
    const result = getInningMultiplier(4, 'TOP', 5, 0);
    expect(result.multiplier).toBeGreaterThan(1.0);
  });
});

// ============================================
// SCORE DAMPENER TESTS
// ============================================

describe('Score Dampener', () => {
  test('tie game = 1.0 (max leverage)', () => {
    expect(getScoreDampener(0)).toBe(1.0);
  });

  test('1-run game = 0.95', () => {
    expect(getScoreDampener(1)).toBe(0.95);
    expect(getScoreDampener(-1)).toBe(0.95);
  });

  test('2-run game = 0.85', () => {
    expect(getScoreDampener(2)).toBe(0.85);
    expect(getScoreDampener(-2)).toBe(0.85);
  });

  test('3-run game ~0.60-0.72 depending on inning', () => {
    const early = getScoreDampener(3, 1);
    const late = getScoreDampener(3, 9);

    expect(early).toBeLessThan(late);
    expect(early).toBeGreaterThanOrEqual(0.60);
    expect(late).toBeLessThanOrEqual(0.72);
  });

  test('4-run game = 0.40', () => {
    expect(getScoreDampener(4)).toBe(0.40);
  });

  test('5-6 run game = 0.25', () => {
    expect(getScoreDampener(5)).toBe(0.25);
    expect(getScoreDampener(6)).toBe(0.25);
  });

  test('7+ run blowout = 0.10 (min)', () => {
    expect(getScoreDampener(7)).toBe(0.10);
    expect(getScoreDampener(10)).toBe(0.10);
    expect(getScoreDampener(-8)).toBe(0.10);
  });

  test('sign of score diff does not matter (absolute)', () => {
    expect(getScoreDampener(3)).toBe(getScoreDampener(-3));
    expect(getScoreDampener(5)).toBe(getScoreDampener(-5));
  });
});

// ============================================
// LI CATEGORY TESTS
// ============================================

describe('LI Category Classification', () => {
  test('LI < 0.85 = LOW', () => {
    expect(getLICategory(0.5)).toBe('LOW');
    expect(getLICategory(0.84)).toBe('LOW');
  });

  test('0.85 <= LI < 2.0 = MEDIUM', () => {
    expect(getLICategory(0.85)).toBe('MEDIUM');
    expect(getLICategory(1.0)).toBe('MEDIUM');
    expect(getLICategory(1.99)).toBe('MEDIUM');
  });

  test('2.0 <= LI < 5.0 = HIGH', () => {
    expect(getLICategory(2.0)).toBe('HIGH');
    expect(getLICategory(3.5)).toBe('HIGH');
    expect(getLICategory(4.99)).toBe('HIGH');
  });

  test('LI >= 5.0 = EXTREME', () => {
    expect(getLICategory(5.0)).toBe('EXTREME');
    expect(getLICategory(7.5)).toBe('EXTREME');
    expect(getLICategory(10.0)).toBe('EXTREME');
  });
});

// ============================================
// COMPLETE LI CALCULATION TESTS
// ============================================

describe('Complete LI Calculation', () => {
  test('early inning, empty, tie = low LI', () => {
    const state = createGameState({
      inning: 1,
      outs: 0,
      runners: createRunners(),
      homeScore: 0,
      awayScore: 0,
    });

    const result = calculateLeverageIndex(state);

    expect(result.leverageIndex).toBeLessThan(1.0);
    expect(result.category).toBe('LOW');
  });

  test('mid game, RISP, tie = elevated LI', () => {
    const state = createGameState({
      inning: 5,
      halfInning: 'TOP',
      outs: 1,
      runners: createRunners({ second: true }),
      homeScore: 3,
      awayScore: 3,
    });

    const result = calculateLeverageIndex(state);

    expect(result.leverageIndex).toBeGreaterThan(1.0);
    expect(result.category).toBe('MEDIUM');
  });

  test('9th inning, bases loaded, tie = extreme LI', () => {
    const state = createGameState({
      inning: 9,
      halfInning: 'BOTTOM',
      outs: 2,
      runners: createRunners({ first: true, second: true, third: true }),
      homeScore: 5,
      awayScore: 5,
    });

    const result = calculateLeverageIndex(state);

    expect(result.leverageIndex).toBeGreaterThan(5.0);
    expect(result.category).toBe('EXTREME');
  });

  test('blowout = very low LI regardless of base-out state', () => {
    const state = createGameState({
      inning: 5,
      outs: 2,
      runners: createRunners({ first: true, second: true, third: true }),
      homeScore: 0,
      awayScore: 10,
    });

    const result = calculateLeverageIndex(state);

    expect(result.leverageIndex).toBeLessThan(0.5);
    expect(result.scoreDampener).toBe(0.10);
  });

  test('LI clamped to minimum 0.1', () => {
    const state = createGameState({
      inning: 1,
      outs: 0,
      runners: createRunners(),
      homeScore: 0,
      awayScore: 15,
    });

    const result = calculateLeverageIndex(state);

    expect(result.leverageIndex).toBe(0.1);
  });

  test('LI clamped to maximum 10.0', () => {
    // Extreme scenario that would exceed 10.0
    const state = createGameState({
      inning: 12,
      halfInning: 'BOTTOM',
      outs: 2,
      runners: createRunners({ first: true, second: true, third: true }),
      homeScore: 5,
      awayScore: 5,
    });

    const result = calculateLeverageIndex(state);

    expect(result.leverageIndex).toBeLessThanOrEqual(10.0);
  });

  test('result includes all expected components', () => {
    const state = createGameState();
    const result = calculateLeverageIndex(state);

    expect(result.leverageIndex).toBeDefined();
    expect(result.rawLI).toBeDefined();
    expect(result.baseOutLI).toBeDefined();
    expect(result.inningMultiplier).toBeDefined();
    expect(result.scoreDampener).toBeDefined();
    expect(result.walkoffBoost).toBeDefined();
    expect(result.baseState).toBeDefined();
    expect(result.scoreDifferential).toBeDefined();
    expect(result.isWalkoffPossible).toBeDefined();
    expect(result.gameProgress).toBeDefined();
    expect(result.category).toBeDefined();
  });

  test('score differential from batting team perspective', () => {
    // Home batting (BOTTOM), home leading
    const homeLeading = calculateLeverageIndex(createGameState({
      halfInning: 'BOTTOM',
      homeScore: 5,
      awayScore: 3,
    }));
    expect(homeLeading.scoreDifferential).toBe(2); // Positive = leading

    // Away batting (TOP), away leading
    const awayLeading = calculateLeverageIndex(createGameState({
      halfInning: 'TOP',
      homeScore: 3,
      awayScore: 5,
    }));
    expect(awayLeading.scoreDifferential).toBe(2); // Positive = leading
  });
});

describe('getLeverageIndex (simplified)', () => {
  test('returns just the LI number', () => {
    const state = createGameState();
    const li = getLeverageIndex(state);

    expect(typeof li).toBe('number');
    expect(li).toBeGreaterThanOrEqual(0.1);
    expect(li).toBeLessThanOrEqual(10.0);
  });

  test('accepts totalInnings parameter', () => {
    const state = createGameState({ inning: 5 });

    const li9 = getLeverageIndex(state, 9);
    const li5 = getLeverageIndex(state, 5);

    // In 5-inning game, inning 5 is final inning (higher LI)
    expect(li5).toBeGreaterThan(li9);
  });
});

// ============================================
// gmLI ACCUMULATOR TESTS
// ============================================

describe('LI Accumulator', () => {
  test('creates empty accumulator', () => {
    const acc = createLIAccumulator();

    expect(acc.totalLI).toBe(0);
    expect(acc.appearances).toBe(0);
    expect(acc.maxLI).toBe(0);
    expect(acc.minLI).toBe(Infinity);
    expect(acc.highLeverageAppearances).toBe(0);
    expect(acc.extremeLeverageAppearances).toBe(0);
  });

  test('addLIAppearance updates accumulator', () => {
    const acc = createLIAccumulator();

    addLIAppearance(acc, 1.5);
    addLIAppearance(acc, 2.5);
    addLIAppearance(acc, 0.5);

    expect(acc.totalLI).toBe(4.5);
    expect(acc.appearances).toBe(3);
    expect(acc.maxLI).toBe(2.5);
    expect(acc.minLI).toBe(0.5);
  });

  test('tracks high leverage appearances (>= 2.0)', () => {
    const acc = createLIAccumulator();

    addLIAppearance(acc, 1.5);  // Not high
    addLIAppearance(acc, 2.0);  // High
    addLIAppearance(acc, 3.5);  // High

    expect(acc.highLeverageAppearances).toBe(2);
  });

  test('tracks extreme leverage appearances (>= 5.0)', () => {
    const acc = createLIAccumulator();

    addLIAppearance(acc, 4.0);  // Not extreme
    addLIAppearance(acc, 5.0);  // Extreme
    addLIAppearance(acc, 7.5);  // Extreme

    expect(acc.extremeLeverageAppearances).toBe(2);
  });
});

describe('gmLI Calculation', () => {
  test('empty accumulator returns 1.0 (average)', () => {
    const acc = createLIAccumulator();
    expect(calculateGmLI(acc)).toBe(1.0);
  });

  test('calculates average LI', () => {
    const acc = createLIAccumulator();
    addLIAppearance(acc, 1.0);
    addLIAppearance(acc, 2.0);
    addLIAppearance(acc, 3.0);

    expect(calculateGmLI(acc)).toBe(2.0); // (1+2+3)/3
  });

  test('closer-level gmLI around 1.8-2.0', () => {
    const acc = createLIAccumulator();
    // Closer typically enters in high-leverage spots
    addLIAppearance(acc, 2.5);
    addLIAppearance(acc, 1.8);
    addLIAppearance(acc, 2.0);
    addLIAppearance(acc, 1.5);

    const gmLI = calculateGmLI(acc);
    expect(gmLI).toBeGreaterThan(1.5);
    expect(gmLI).toBeLessThan(2.5);
  });
});

describe('gmLI to Leverage Multiplier', () => {
  test('gmLI = 1.0 -> multiplier = 1.0', () => {
    expect(gmLIToLeverageMultiplier(1.0)).toBe(1.0);
  });

  test('gmLI = 2.0 -> multiplier = 1.5', () => {
    expect(gmLIToLeverageMultiplier(2.0)).toBe(1.5);
  });

  test('gmLI = 0.5 -> multiplier = 0.75', () => {
    expect(gmLIToLeverageMultiplier(0.5)).toBe(0.75);
  });

  test('gmLI = 1.8 -> multiplier = 1.4', () => {
    expect(gmLIToLeverageMultiplier(1.8)).toBe(1.4);
  });

  test('formula is (gmLI + 1) / 2', () => {
    for (const gmLI of [0.5, 1.0, 1.5, 2.0, 2.5]) {
      expect(gmLIToLeverageMultiplier(gmLI)).toBe((gmLI + 1) / 2);
    }
  });
});

describe('Estimate gmLI', () => {
  test('STARTER = 1.0', () => {
    expect(estimateGmLI('STARTER')).toBe(1.0);
  });

  test('CLOSER base = 1.85', () => {
    expect(estimateGmLI('CLOSER', 0, 0)).toBe(1.75); // Low saves = lower
    expect(estimateGmLI('CLOSER', 5, 0)).toBe(1.85);
    expect(estimateGmLI('CLOSER', 10, 0)).toBe(1.90);
    expect(estimateGmLI('CLOSER', 15, 0)).toBe(1.95);
  });

  test('SETUP base = 1.45', () => {
    expect(estimateGmLI('SETUP')).toBe(1.45);
  });

  test('SETUP with hold opportunities increases', () => {
    const base = estimateGmLI('SETUP', 0, 0);
    const withHolds = estimateGmLI('SETUP', 0, 10);
    expect(withHolds).toBeGreaterThan(base);
  });

  test('MOP_UP = 0.5 (lowest)', () => {
    expect(estimateGmLI('MOP_UP')).toBe(0.5);
  });

  test('MIDDLE = 1.1', () => {
    expect(estimateGmLI('MIDDLE')).toBe(1.1);
  });

  test('LONG = 0.9', () => {
    expect(estimateGmLI('LONG')).toBe(0.9);
  });
});

// ============================================
// CLUTCH SITUATION DETECTION TESTS
// ============================================

describe('Clutch Situation Detection', () => {
  test('isClutchSituation threshold is 1.5', () => {
    expect(isClutchSituation(1.4)).toBe(false);
    expect(isClutchSituation(1.5)).toBe(true);
    expect(isClutchSituation(2.0)).toBe(true);
  });

  test('isHighLeverageSituation threshold is 2.5', () => {
    expect(isHighLeverageSituation(2.4)).toBe(false);
    expect(isHighLeverageSituation(2.5)).toBe(true);
    expect(isHighLeverageSituation(5.0)).toBe(true);
  });

  test('isExtremeLeverageSituation threshold is 5.0', () => {
    expect(isExtremeLeverageSituation(4.9)).toBe(false);
    expect(isExtremeLeverageSituation(5.0)).toBe(true);
    expect(isExtremeLeverageSituation(10.0)).toBe(true);
  });
});

describe('Clutch Value Calculation', () => {
  test('uses sqrt(LI) for scaling', () => {
    const baseValue = 1.0;

    // LI = 1.0 -> sqrt(1) = 1.0
    expect(calculateClutchValue(baseValue, 1.0)).toBe(1.0);

    // LI = 4.0 -> sqrt(4) = 2.0
    expect(calculateClutchValue(baseValue, 4.0)).toBe(2.0);

    // LI = 9.0 -> sqrt(9) = 3.0
    expect(calculateClutchValue(baseValue, 9.0)).toBe(3.0);
  });

  test('negative base values are scaled correctly', () => {
    expect(calculateClutchValue(-1.0, 4.0)).toBe(-2.0);
  });

  test('low LI dampens clutch value', () => {
    // LI = 0.25 -> sqrt(0.25) = 0.5
    expect(calculateClutchValue(1.0, 0.25)).toBe(0.5);
  });
});

// ============================================
// WIN PROBABILITY ESTIMATE TESTS
// ============================================

describe('Win Probability Estimate', () => {
  test('tie game at start = ~50%', () => {
    const state = createGameState({
      inning: 1,
      halfInning: 'TOP',
      outs: 0,
      homeScore: 0,
      awayScore: 0,
    });

    const wp = estimateWinProbability(state);
    expect(wp).toBeCloseTo(0.50, 1);
  });

  test('leading increases WP', () => {
    const trailing = createGameState({ homeScore: 0, awayScore: 3, halfInning: 'BOTTOM' });
    const tied = createGameState({ homeScore: 3, awayScore: 3, halfInning: 'BOTTOM' });
    const leading = createGameState({ homeScore: 6, awayScore: 3, halfInning: 'BOTTOM' });

    expect(estimateWinProbability(trailing)).toBeLessThan(0.5);
    expect(estimateWinProbability(tied)).toBeCloseTo(0.5, 1);
    expect(estimateWinProbability(leading)).toBeGreaterThan(0.5);
  });

  test('runners on base when trailing increases WP', () => {
    const noRunners = createGameState({
      halfInning: 'BOTTOM',
      homeScore: 2,
      awayScore: 3,
      runners: createRunners(),
    });
    const runnersOn = createGameState({
      halfInning: 'BOTTOM',
      homeScore: 2,
      awayScore: 3,
      runners: createRunners({ first: true, second: true }),
    });

    expect(estimateWinProbability(runnersOn)).toBeGreaterThan(estimateWinProbability(noRunners));
  });

  test('WP clamped to 1-99%', () => {
    const blowout = createGameState({
      inning: 9,
      halfInning: 'TOP',
      homeScore: 0,
      awayScore: 15,
    });

    const wp = estimateWinProbability(blowout);
    expect(wp).toBeGreaterThanOrEqual(0.01);
    expect(wp).toBeLessThanOrEqual(0.99);
  });
});

// ============================================
// UTILITY FUNCTION TESTS
// ============================================

describe('Utility Functions', () => {
  test('formatLI formats with specified precision', () => {
    expect(formatLI(1.234, 2)).toBe('1.23');
    expect(formatLI(2.5, 1)).toBe('2.5');
    expect(formatLI(3.14159, 3)).toBe('3.142');
  });

  test('getLIColor returns correct colors', () => {
    expect(getLIColor('LOW')).toBe('#6b7280');
    expect(getLIColor('MEDIUM')).toBe('#3b82f6');
    expect(getLIColor('HIGH')).toBe('#f59e0b');
    expect(getLIColor('EXTREME')).toBe('#ef4444');
  });

  test('getLIEmoji returns correct emojis', () => {
    expect(getLIEmoji('LOW')).toBe('😌');
    expect(getLIEmoji('MEDIUM')).toBe('😐');
    expect(getLIEmoji('HIGH')).toBe('😰');
    expect(getLIEmoji('EXTREME')).toBe('🔥');
  });
});

// ============================================
// SCENARIO VALIDATION TESTS
// ============================================

describe('LI Scenarios', () => {
  test('earlyInningEmpty scenario', () => {
    const { state, expectedRange } = LI_SCENARIOS.earlyInningEmpty;
    const li = getLeverageIndex(state);

    expect(li).toBeGreaterThanOrEqual(expectedRange[0]);
    expect(li).toBeLessThanOrEqual(expectedRange[1]);
  });

  test('blowout scenario', () => {
    const { state, expectedRange } = LI_SCENARIOS.blowout;
    const li = getLeverageIndex(state);

    expect(li).toBeGreaterThanOrEqual(expectedRange[0]);
    expect(li).toBeLessThanOrEqual(expectedRange[1]);
  });

  test('midGameClose scenario', () => {
    const { state, expectedRange } = LI_SCENARIOS.midGameClose;
    const li = getLeverageIndex(state);

    expect(li).toBeGreaterThanOrEqual(expectedRange[0]);
    expect(li).toBeLessThanOrEqual(expectedRange[1]);
  });

  test('lateGameRISP scenario', () => {
    const { state, expectedRange } = LI_SCENARIOS.lateGameRISP;
    const li = getLeverageIndex(state);

    expect(li).toBeGreaterThanOrEqual(expectedRange[0]);
    expect(li).toBeLessThanOrEqual(expectedRange[1]);
  });

  test('ninthInningLoadedTie scenario', () => {
    const { state, expectedRange } = LI_SCENARIOS.ninthInningLoadedTie;
    const li = getLeverageIndex(state);

    expect(li).toBeGreaterThanOrEqual(expectedRange[0]);
    expect(li).toBeLessThanOrEqual(expectedRange[1]);
  });

  test('closerUp1 scenario', () => {
    const { state, expectedRange } = LI_SCENARIOS.closerUp1;
    const li = getLeverageIndex(state);

    expect(li).toBeGreaterThanOrEqual(expectedRange[0]);
    expect(li).toBeLessThanOrEqual(expectedRange[1]);
  });
});

// ============================================
// EDGE CASES
// ============================================

describe('Edge Cases', () => {
  test('extra innings beyond 15th', () => {
    const state = createGameState({
      inning: 18,
      halfInning: 'BOTTOM',
      outs: 2,
      runners: createRunners({ second: true }),
      homeScore: 5,
      awayScore: 5,
    });

    const result = calculateLeverageIndex(state);

    expect(result.leverageIndex).toBeGreaterThan(0);
    expect(result.inningMultiplier).toBeLessThanOrEqual(2.5);
  });

  test('0 total innings defaults gracefully', () => {
    const state = createGameState();
    // Should not throw
    const result = calculateLeverageIndex(state, { totalInnings: 0 });
    expect(result.leverageIndex).toBeDefined();
  });

  test('very short game (3 innings)', () => {
    const state = createGameState({
      inning: 3,
      halfInning: 'BOTTOM',
      outs: 2,
      runners: createRunners({ first: true, second: true }),
      homeScore: 2,
      awayScore: 2,
    });

    const result = calculateLeverageIndex(state, { totalInnings: 3 });

    // Final inning of short game should have high LI
    expect(result.leverageIndex).toBeGreaterThan(1.5);
    expect(result.isWalkoffPossible).toBe(true);
  });

  test('negative scores handled (theoretical)', () => {
    const state = createGameState({
      homeScore: -1,
      awayScore: 0,
    });

    // Should not throw
    const result = calculateLeverageIndex(state);
    expect(result.leverageIndex).toBeDefined();
  });
});
