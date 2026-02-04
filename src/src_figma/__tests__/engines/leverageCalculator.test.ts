/**
 * Leverage Index Calculator Tests
 *
 * Tests the leverage calculation engine including:
 * - Base state encoding/decoding
 * - BASE_OUT_LI table lookups
 * - Inning multiplier calculations
 * - Score dampener calculations
 * - Full LI calculation with various game states
 * - LI category classification
 * - gmLI accumulator and calculation
 * - Clutch situation detection
 */

import { describe, test, expect } from 'vitest';
import {
  BaseState,
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
  BASE_OUT_LI,
  LI_BOUNDS,
  LI_CATEGORIES,
  LI_SCENARIOS,
  type GameStateForLI,
  type RunnersOnBase,
} from '../../../engines/leverageCalculator';

// ============================================
// BASE STATE ENCODING/DECODING TESTS
// ============================================

describe('Base State Encoding', () => {
  test('encodes empty bases as 0', () => {
    expect(encodeBaseState({ first: false, second: false, third: false })).toBe(BaseState.EMPTY);
  });

  test('encodes runner on first as 1', () => {
    expect(encodeBaseState({ first: true, second: false, third: false })).toBe(BaseState.FIRST);
  });

  test('encodes runner on second as 2', () => {
    expect(encodeBaseState({ first: false, second: true, third: false })).toBe(BaseState.SECOND);
  });

  test('encodes runners on first and second as 3', () => {
    expect(encodeBaseState({ first: true, second: true, third: false })).toBe(BaseState.FIRST_SECOND);
  });

  test('encodes runner on third as 4', () => {
    expect(encodeBaseState({ first: false, second: false, third: true })).toBe(BaseState.THIRD);
  });

  test('encodes runners on first and third as 5', () => {
    expect(encodeBaseState({ first: true, second: false, third: true })).toBe(BaseState.FIRST_THIRD);
  });

  test('encodes runners on second and third as 6', () => {
    expect(encodeBaseState({ first: false, second: true, third: true })).toBe(BaseState.SECOND_THIRD);
  });

  test('encodes bases loaded as 7', () => {
    expect(encodeBaseState({ first: true, second: true, third: true })).toBe(BaseState.LOADED);
  });
});

describe('Base State Decoding', () => {
  test('decodes 0 to empty bases', () => {
    expect(decodeBaseState(BaseState.EMPTY)).toEqual({ first: false, second: false, third: false });
  });

  test('decodes 1 to runner on first', () => {
    expect(decodeBaseState(BaseState.FIRST)).toEqual({ first: true, second: false, third: false });
  });

  test('decodes 2 to runner on second', () => {
    expect(decodeBaseState(BaseState.SECOND)).toEqual({ first: false, second: true, third: false });
  });

  test('decodes 3 to runners on first and second', () => {
    expect(decodeBaseState(BaseState.FIRST_SECOND)).toEqual({ first: true, second: true, third: false });
  });

  test('decodes 4 to runner on third', () => {
    expect(decodeBaseState(BaseState.THIRD)).toEqual({ first: false, second: false, third: true });
  });

  test('decodes 5 to runners on first and third', () => {
    expect(decodeBaseState(BaseState.FIRST_THIRD)).toEqual({ first: true, second: false, third: true });
  });

  test('decodes 6 to runners on second and third', () => {
    expect(decodeBaseState(BaseState.SECOND_THIRD)).toEqual({ first: false, second: true, third: true });
  });

  test('decodes 7 to bases loaded', () => {
    expect(decodeBaseState(BaseState.LOADED)).toEqual({ first: true, second: true, third: true });
  });

  test('encode/decode roundtrip works correctly', () => {
    const runners: RunnersOnBase = { first: true, second: false, third: true };
    expect(decodeBaseState(encodeBaseState(runners))).toEqual(runners);
  });
});

// ============================================
// BASE_OUT_LI TABLE TESTS
// ============================================

describe('BASE_OUT_LI Table', () => {
  test('table has 8 base states', () => {
    expect(BASE_OUT_LI.length).toBe(8);
  });

  test('each base state has 3 out values', () => {
    BASE_OUT_LI.forEach((outs, baseState) => {
      expect(outs.length).toBe(3);
    });
  });

  test('empty bases, 0 out = 0.86', () => {
    expect(getBaseOutLI(BaseState.EMPTY, 0)).toBe(0.86);
  });

  test('empty bases, 1 out = 0.90', () => {
    expect(getBaseOutLI(BaseState.EMPTY, 1)).toBe(0.90);
  });

  test('empty bases, 2 out = 0.93', () => {
    expect(getBaseOutLI(BaseState.EMPTY, 2)).toBe(0.93);
  });

  test('bases loaded, 0 out = 1.60', () => {
    expect(getBaseOutLI(BaseState.LOADED, 0)).toBe(1.60);
  });

  test('bases loaded, 1 out = 2.25', () => {
    expect(getBaseOutLI(BaseState.LOADED, 1)).toBe(2.25);
  });

  test('bases loaded, 2 out = 2.67', () => {
    expect(getBaseOutLI(BaseState.LOADED, 2)).toBe(2.67);
  });

  test('runner on second, 2 out = 1.56', () => {
    expect(getBaseOutLI(BaseState.SECOND, 2)).toBe(1.56);
  });

  test('second and third, 2 out = 2.50', () => {
    expect(getBaseOutLI(BaseState.SECOND_THIRD, 2)).toBe(2.50);
  });

  test('LI increases with more outs for most states', () => {
    // For most base states, LI increases with outs (more pressure)
    expect(getBaseOutLI(BaseState.LOADED, 0)).toBeLessThan(getBaseOutLI(BaseState.LOADED, 1));
    expect(getBaseOutLI(BaseState.LOADED, 1)).toBeLessThan(getBaseOutLI(BaseState.LOADED, 2));
  });

  test('LI increases with more runners', () => {
    // More runners = higher stakes
    expect(getBaseOutLI(BaseState.EMPTY, 1)).toBeLessThan(getBaseOutLI(BaseState.FIRST, 1));
    expect(getBaseOutLI(BaseState.FIRST, 1)).toBeLessThan(getBaseOutLI(BaseState.FIRST_SECOND, 1));
    expect(getBaseOutLI(BaseState.FIRST_SECOND, 1)).toBeLessThan(getBaseOutLI(BaseState.LOADED, 1));
  });
});

// ============================================
// INNING MULTIPLIER TESTS
// ============================================

describe('Inning Multiplier', () => {
  test('early innings have lower multipliers', () => {
    const { multiplier } = getInningMultiplier(1, 'TOP', 9);
    expect(multiplier).toBeLessThan(1.0);
  });

  test('middle innings have standard multiplier', () => {
    const { multiplier } = getInningMultiplier(5, 'TOP', 9);
    expect(multiplier).toBe(1.0);
  });

  test('late innings have higher multipliers', () => {
    const { multiplier } = getInningMultiplier(8, 'TOP', 9);
    expect(multiplier).toBeGreaterThan(1.0);
  });

  test('9th inning has highest multiplier', () => {
    const { multiplier } = getInningMultiplier(9, 'TOP', 9);
    expect(multiplier).toBeGreaterThanOrEqual(1.8);
  });

  test('extra innings increase multiplier further', () => {
    const { multiplier: ninth } = getInningMultiplier(9, 'TOP', 9);
    const { multiplier: tenth } = getInningMultiplier(10, 'TOP', 9);
    expect(tenth).toBeGreaterThan(ninth);
  });

  test('extra innings cap at 2.5', () => {
    const { multiplier } = getInningMultiplier(15, 'TOP', 9);
    expect(multiplier).toBeLessThanOrEqual(2.5);
  });

  test('walkoff boost is 1.0 in top of inning', () => {
    const { walkoffBoost } = getInningMultiplier(9, 'TOP', 9, 0);
    expect(walkoffBoost).toBe(1.0);
  });

  test('walkoff boost is 1.4 in bottom of 9th when tied', () => {
    const { walkoffBoost } = getInningMultiplier(9, 'BOTTOM', 9, 0);
    expect(walkoffBoost).toBe(1.40);
  });

  test('walkoff boost is 1.4 in bottom of 9th when trailing', () => {
    const { walkoffBoost } = getInningMultiplier(9, 'BOTTOM', 9, -1);
    expect(walkoffBoost).toBe(1.40);
  });

  test('no walkoff boost when leading', () => {
    const { walkoffBoost } = getInningMultiplier(9, 'BOTTOM', 9, 2);
    expect(walkoffBoost).toBe(1.0);
  });

  test('walkoff boost in extra innings', () => {
    const { walkoffBoost } = getInningMultiplier(11, 'BOTTOM', 9, -1);
    expect(walkoffBoost).toBe(1.40);
  });

  test('adapts to shorter games (5 innings)', () => {
    // In a 5-inning game, inning 5 is the final inning
    const { multiplier } = getInningMultiplier(5, 'TOP', 5);
    expect(multiplier).toBeGreaterThanOrEqual(1.8);
  });

  test('adapts to shorter games (7 innings)', () => {
    // In a 7-inning game, inning 7 is the final inning
    const { multiplier } = getInningMultiplier(7, 'TOP', 7);
    expect(multiplier).toBeGreaterThanOrEqual(1.8);
  });
});

// ============================================
// SCORE DAMPENER TESTS
// ============================================

describe('Score Dampener', () => {
  test('tie game has no dampening (1.0)', () => {
    expect(getScoreDampener(0)).toBe(1.0);
  });

  test('1-run game has slight dampening (0.95)', () => {
    expect(getScoreDampener(1)).toBe(0.95);
    expect(getScoreDampener(-1)).toBe(0.95);
  });

  test('2-run game has moderate dampening (0.85)', () => {
    expect(getScoreDampener(2)).toBe(0.85);
    expect(getScoreDampener(-2)).toBe(0.85);
  });

  test('3-run game dampening depends on inning', () => {
    const early = getScoreDampener(3, 2);
    const late = getScoreDampener(3, 8);
    expect(late).toBeGreaterThan(early);
  });

  test('4-run lead has heavy dampening (0.40)', () => {
    expect(getScoreDampener(4)).toBe(0.40);
  });

  test('5-run lead has heavy dampening (0.25)', () => {
    expect(getScoreDampener(5)).toBe(0.25);
  });

  test('7+ run blowout has minimal leverage (0.10)', () => {
    expect(getScoreDampener(7)).toBe(0.10);
    expect(getScoreDampener(10)).toBe(0.10);
    expect(getScoreDampener(-8)).toBe(0.10);
  });

  test('dampener is symmetric for leading/trailing', () => {
    expect(getScoreDampener(2)).toBe(getScoreDampener(-2));
    expect(getScoreDampener(5)).toBe(getScoreDampener(-5));
  });
});

// ============================================
// LI CATEGORY TESTS
// ============================================

describe('LI Category Classification', () => {
  test('LOW for LI < 0.85', () => {
    expect(getLICategory(0.5)).toBe('LOW');
    expect(getLICategory(0.84)).toBe('LOW');
  });

  test('MEDIUM for LI 0.85-2.0', () => {
    expect(getLICategory(0.85)).toBe('MEDIUM');
    expect(getLICategory(1.5)).toBe('MEDIUM');
    expect(getLICategory(1.99)).toBe('MEDIUM');
  });

  test('HIGH for LI 2.0-5.0', () => {
    expect(getLICategory(2.0)).toBe('HIGH');
    expect(getLICategory(3.5)).toBe('HIGH');
    expect(getLICategory(4.99)).toBe('HIGH');
  });

  test('EXTREME for LI >= 5.0', () => {
    expect(getLICategory(5.0)).toBe('EXTREME');
    expect(getLICategory(8.0)).toBe('EXTREME');
    expect(getLICategory(10.0)).toBe('EXTREME');
  });
});

// ============================================
// FULL LI CALCULATION TESTS
// ============================================

describe('Calculate Leverage Index', () => {
  const createGameState = (overrides: Partial<GameStateForLI>): GameStateForLI => ({
    inning: 5,
    halfInning: 'TOP',
    outs: 1,
    runners: { first: false, second: false, third: false },
    homeScore: 0,
    awayScore: 0,
    ...overrides,
  });

  test('returns LIResult with all fields', () => {
    const result = calculateLeverageIndex(createGameState({}));

    expect(result).toHaveProperty('leverageIndex');
    expect(result).toHaveProperty('rawLI');
    expect(result).toHaveProperty('baseOutLI');
    expect(result).toHaveProperty('inningMultiplier');
    expect(result).toHaveProperty('scoreDampener');
    expect(result).toHaveProperty('walkoffBoost');
    expect(result).toHaveProperty('baseState');
    expect(result).toHaveProperty('scoreDifferential');
    expect(result).toHaveProperty('isWalkoffPossible');
    expect(result).toHaveProperty('gameProgress');
    expect(result).toHaveProperty('category');
  });

  test('LI is clamped to minimum 0.1', () => {
    // Blowout should have very low LI
    const result = calculateLeverageIndex(createGameState({
      homeScore: 15,
      awayScore: 0,
    }));
    expect(result.leverageIndex).toBeGreaterThanOrEqual(0.1);
  });

  test('LI is clamped to maximum 10.0', () => {
    // Even extreme situations cap at 10
    const result = calculateLeverageIndex(createGameState({
      inning: 12,
      halfInning: 'BOTTOM',
      outs: 2,
      runners: { first: true, second: true, third: true },
      homeScore: 5,
      awayScore: 5,
    }));
    expect(result.leverageIndex).toBeLessThanOrEqual(10.0);
  });

  test('early game, empty bases has low LI', () => {
    const result = calculateLeverageIndex(createGameState({
      inning: 1,
      halfInning: 'TOP',
      outs: 0,
    }));
    expect(result.category).toBe('LOW');
  });

  test('late game, tie, RISP has high LI', () => {
    const result = calculateLeverageIndex(createGameState({
      inning: 8,
      halfInning: 'TOP',
      outs: 2,
      runners: { first: false, second: true, third: false },
    }));
    expect(result.leverageIndex).toBeGreaterThan(1.5);
  });

  test('9th inning, bases loaded, tie game has extreme LI', () => {
    const result = calculateLeverageIndex(createGameState({
      inning: 9,
      halfInning: 'BOTTOM',
      outs: 2,
      runners: { first: true, second: true, third: true },
      homeScore: 5,
      awayScore: 5,
    }));
    expect(result.category).toBe('EXTREME');
    expect(result.isWalkoffPossible).toBe(true);
  });

  test('blowout has low LI regardless of situation', () => {
    const result = calculateLeverageIndex(createGameState({
      inning: 9,
      halfInning: 'BOTTOM',
      outs: 2,
      runners: { first: true, second: true, third: true },
      homeScore: 0,
      awayScore: 10,
    }));
    expect(result.leverageIndex).toBeLessThan(1.0);
  });

  test('score differential calculated from batting team perspective', () => {
    // Top of inning, away team batting, away leads
    const topResult = calculateLeverageIndex(createGameState({
      halfInning: 'TOP',
      homeScore: 3,
      awayScore: 5,
    }));
    expect(topResult.scoreDifferential).toBe(2); // Away leads by 2

    // Bottom of inning, home team batting, home trails
    const bottomResult = calculateLeverageIndex(createGameState({
      halfInning: 'BOTTOM',
      homeScore: 3,
      awayScore: 5,
    }));
    expect(bottomResult.scoreDifferential).toBe(-2); // Home trails by 2
  });

  test('game progress calculated correctly', () => {
    const result = calculateLeverageIndex(createGameState({
      inning: 5,
    }));
    expect(result.gameProgress).toBeCloseTo(5 / 9, 2);
  });

  test('respects custom total innings', () => {
    const result = calculateLeverageIndex(
      createGameState({ inning: 5 }),
      { totalInnings: 5 }
    );
    // 5th inning of a 5-inning game should have high multiplier
    expect(result.inningMultiplier).toBeGreaterThanOrEqual(1.8);
  });
});

describe('getLeverageIndex (simplified)', () => {
  test('returns just the LI number', () => {
    const li = getLeverageIndex({
      inning: 5,
      halfInning: 'TOP',
      outs: 1,
      runners: { first: false, second: false, third: false },
      homeScore: 0,
      awayScore: 0,
    });
    expect(typeof li).toBe('number');
    expect(li).toBeGreaterThanOrEqual(0.1);
    expect(li).toBeLessThanOrEqual(10.0);
  });
});

// ============================================
// LI SCENARIOS TESTS
// ============================================

describe('LI Scenarios (from spec)', () => {
  test('early inning empty bases is low leverage', () => {
    const scenario = LI_SCENARIOS.earlyInningEmpty;
    const result = calculateLeverageIndex(scenario.state);
    expect(result.leverageIndex).toBeGreaterThanOrEqual(scenario.expectedRange[0]);
    expect(result.leverageIndex).toBeLessThanOrEqual(scenario.expectedRange[1]);
  });

  test('blowout is very low leverage', () => {
    const scenario = LI_SCENARIOS.blowout;
    const result = calculateLeverageIndex(scenario.state);
    expect(result.leverageIndex).toBeGreaterThanOrEqual(scenario.expectedRange[0]);
    expect(result.leverageIndex).toBeLessThanOrEqual(scenario.expectedRange[1]);
  });

  test('mid game close is medium leverage', () => {
    const scenario = LI_SCENARIOS.midGameClose;
    const result = calculateLeverageIndex(scenario.state);
    expect(result.leverageIndex).toBeGreaterThanOrEqual(scenario.expectedRange[0]);
    expect(result.leverageIndex).toBeLessThanOrEqual(scenario.expectedRange[1]);
  });

  test('late game RISP is high leverage', () => {
    const scenario = LI_SCENARIOS.lateGameRISP;
    const result = calculateLeverageIndex(scenario.state);
    expect(result.leverageIndex).toBeGreaterThanOrEqual(scenario.expectedRange[0]);
    expect(result.leverageIndex).toBeLessThanOrEqual(scenario.expectedRange[1]);
  });

  test('9th inning loaded tie is extreme leverage', () => {
    const scenario = LI_SCENARIOS.ninthInningLoadedTie;
    const result = calculateLeverageIndex(scenario.state);
    expect(result.leverageIndex).toBeGreaterThanOrEqual(scenario.expectedRange[0]);
    expect(result.leverageIndex).toBeLessThanOrEqual(scenario.expectedRange[1]);
    expect(result.category).toBe('EXTREME');
  });

  test('closer up 1 is very high leverage', () => {
    const scenario = LI_SCENARIOS.closerUp1;
    const result = calculateLeverageIndex(scenario.state);
    expect(result.leverageIndex).toBeGreaterThanOrEqual(scenario.expectedRange[0]);
    expect(result.leverageIndex).toBeLessThanOrEqual(scenario.expectedRange[1]);
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

  test('adds appearance correctly', () => {
    const acc = createLIAccumulator();
    addLIAppearance(acc, 1.5);

    expect(acc.totalLI).toBe(1.5);
    expect(acc.appearances).toBe(1);
    expect(acc.maxLI).toBe(1.5);
    expect(acc.minLI).toBe(1.5);
  });

  test('tracks multiple appearances', () => {
    const acc = createLIAccumulator();
    addLIAppearance(acc, 1.0);
    addLIAppearance(acc, 2.5);
    addLIAppearance(acc, 0.5);

    expect(acc.totalLI).toBe(4.0);
    expect(acc.appearances).toBe(3);
    expect(acc.maxLI).toBe(2.5);
    expect(acc.minLI).toBe(0.5);
  });

  test('tracks high leverage appearances', () => {
    const acc = createLIAccumulator();
    addLIAppearance(acc, 1.5); // Not high
    addLIAppearance(acc, 2.0); // High (>= 2.0)
    addLIAppearance(acc, 3.5); // High

    expect(acc.highLeverageAppearances).toBe(2);
  });

  test('tracks extreme leverage appearances', () => {
    const acc = createLIAccumulator();
    addLIAppearance(acc, 3.0); // High, not extreme
    addLIAppearance(acc, 5.0); // Extreme (>= 5.0)
    addLIAppearance(acc, 7.5); // Extreme

    expect(acc.extremeLeverageAppearances).toBe(2);
    expect(acc.highLeverageAppearances).toBe(3); // All 3 are >= 2.0
  });
});

describe('gmLI Calculation', () => {
  test('returns 1.0 for empty accumulator', () => {
    const acc = createLIAccumulator();
    expect(calculateGmLI(acc)).toBe(1.0);
  });

  test('calculates average correctly', () => {
    const acc = createLIAccumulator();
    addLIAppearance(acc, 1.0);
    addLIAppearance(acc, 2.0);
    addLIAppearance(acc, 3.0);

    expect(calculateGmLI(acc)).toBeCloseTo(2.0, 5);
  });

  test('single appearance returns that LI', () => {
    const acc = createLIAccumulator();
    addLIAppearance(acc, 1.75);

    expect(calculateGmLI(acc)).toBe(1.75);
  });
});

describe('gmLI to Leverage Multiplier', () => {
  test('gmLI 1.0 gives multiplier 1.0', () => {
    expect(gmLIToLeverageMultiplier(1.0)).toBe(1.0);
  });

  test('gmLI 2.0 gives multiplier 1.5', () => {
    expect(gmLIToLeverageMultiplier(2.0)).toBe(1.5);
  });

  test('gmLI 0.5 gives multiplier 0.75', () => {
    expect(gmLIToLeverageMultiplier(0.5)).toBe(0.75);
  });

  test('gmLI 3.0 gives multiplier 2.0', () => {
    expect(gmLIToLeverageMultiplier(3.0)).toBe(2.0);
  });
});

describe('Estimate gmLI by Role', () => {
  test('starter has average gmLI (1.0)', () => {
    expect(estimateGmLI('STARTER')).toBe(1.0);
  });

  test('closer has high gmLI', () => {
    expect(estimateGmLI('CLOSER')).toBeGreaterThanOrEqual(1.75);
  });

  test('closer with many saves has higher gmLI', () => {
    const fewSaves = estimateGmLI('CLOSER', 3);
    const manySaves = estimateGmLI('CLOSER', 20);
    expect(manySaves).toBeGreaterThan(fewSaves);
  });

  test('setup has elevated gmLI', () => {
    expect(estimateGmLI('SETUP')).toBeGreaterThan(1.0);
    expect(estimateGmLI('SETUP')).toBeLessThan(estimateGmLI('CLOSER'));
  });

  test('setup with hold opportunities has higher gmLI', () => {
    const noHolds = estimateGmLI('SETUP', 0, 0);
    const manyHolds = estimateGmLI('SETUP', 0, 10);
    expect(manyHolds).toBeGreaterThan(noHolds);
  });

  test('middle reliever has slightly elevated gmLI', () => {
    expect(estimateGmLI('MIDDLE')).toBeCloseTo(1.1, 2);
  });

  test('long reliever has below-average gmLI', () => {
    expect(estimateGmLI('LONG')).toBeLessThan(1.0);
  });

  test('mop-up has lowest gmLI', () => {
    expect(estimateGmLI('MOP_UP')).toBe(0.5);
  });
});

// ============================================
// CLUTCH SITUATION TESTS
// ============================================

describe('Clutch Situation Detection', () => {
  test('isClutchSituation returns true for LI >= 1.5', () => {
    expect(isClutchSituation(1.5)).toBe(true);
    expect(isClutchSituation(2.0)).toBe(true);
    expect(isClutchSituation(1.4)).toBe(false);
  });

  test('isHighLeverageSituation returns true for LI >= 2.5', () => {
    expect(isHighLeverageSituation(2.5)).toBe(true);
    expect(isHighLeverageSituation(3.0)).toBe(true);
    expect(isHighLeverageSituation(2.4)).toBe(false);
  });

  test('isExtremeLeverageSituation returns true for LI >= 5.0', () => {
    expect(isExtremeLeverageSituation(5.0)).toBe(true);
    expect(isExtremeLeverageSituation(8.0)).toBe(true);
    expect(isExtremeLeverageSituation(4.9)).toBe(false);
  });
});

describe('Clutch Value Calculation', () => {
  test('calculates clutch value with sqrt(LI) scaling', () => {
    // baseValue * sqrt(LI)
    expect(calculateClutchValue(1.0, 1.0)).toBe(1.0);
    expect(calculateClutchValue(1.0, 4.0)).toBe(2.0);
    expect(calculateClutchValue(2.0, 4.0)).toBe(4.0);
  });

  test('negative base values work correctly', () => {
    // Choke value (negative)
    expect(calculateClutchValue(-1.0, 4.0)).toBe(-2.0);
  });
});

// ============================================
// WIN PROBABILITY TESTS
// ============================================

describe('Win Probability Estimation', () => {
  test('tie game is 50%', () => {
    const wp = estimateWinProbability({
      inning: 5,
      halfInning: 'TOP',
      outs: 1,
      runners: { first: false, second: false, third: false },
      homeScore: 0,
      awayScore: 0,
    });
    expect(wp).toBeCloseTo(0.5, 1);
  });

  test('leading increases WP', () => {
    const wp = estimateWinProbability({
      inning: 5,
      halfInning: 'TOP',
      outs: 1,
      runners: { first: false, second: false, third: false },
      homeScore: 0,
      awayScore: 3, // Away leads by 3
    });
    expect(wp).toBeGreaterThan(0.5);
  });

  test('trailing decreases WP', () => {
    const wp = estimateWinProbability({
      inning: 5,
      halfInning: 'TOP',
      outs: 1,
      runners: { first: false, second: false, third: false },
      homeScore: 3,
      awayScore: 0, // Away trails by 3
    });
    expect(wp).toBeLessThan(0.5);
  });

  test('runners on base help when trailing', () => {
    const noRunners = estimateWinProbability({
      inning: 5,
      halfInning: 'TOP',
      outs: 1,
      runners: { first: false, second: false, third: false },
      homeScore: 2,
      awayScore: 0,
    });
    const withRunners = estimateWinProbability({
      inning: 5,
      halfInning: 'TOP',
      outs: 1,
      runners: { first: true, second: true, third: false },
      homeScore: 2,
      awayScore: 0,
    });
    expect(withRunners).toBeGreaterThan(noRunners);
  });

  test('WP is clamped between 1% and 99%', () => {
    const blowoutWin = estimateWinProbability({
      inning: 9,
      halfInning: 'TOP',
      outs: 2,
      runners: { first: false, second: false, third: false },
      homeScore: 0,
      awayScore: 20,
    });
    expect(blowoutWin).toBeLessThanOrEqual(0.99);
    expect(blowoutWin).toBeGreaterThanOrEqual(0.01);

    const blowoutLoss = estimateWinProbability({
      inning: 9,
      halfInning: 'TOP',
      outs: 2,
      runners: { first: false, second: false, third: false },
      homeScore: 20,
      awayScore: 0,
    });
    expect(blowoutLoss).toBeLessThanOrEqual(0.99);
    expect(blowoutLoss).toBeGreaterThanOrEqual(0.01);
  });
});

// ============================================
// UTILITY FUNCTION TESTS
// ============================================

describe('Format LI', () => {
  test('formats with default 2 decimal places', () => {
    expect(formatLI(1.234)).toBe('1.23');
    expect(formatLI(5.0)).toBe('5.00');
  });

  test('formats with custom precision', () => {
    // Note: toFixed uses banker's rounding, so 1.2345 rounds to 1.234 not 1.235
    expect(formatLI(1.2346, 3)).toBe('1.235');
    expect(formatLI(1.2345, 1)).toBe('1.2');
    expect(formatLI(1.2345, 0)).toBe('1');
  });
});

describe('LI Colors', () => {
  test('LOW is gray', () => {
    expect(getLIColor('LOW')).toBe('#6b7280');
  });

  test('MEDIUM is blue', () => {
    expect(getLIColor('MEDIUM')).toBe('#3b82f6');
  });

  test('HIGH is amber', () => {
    expect(getLIColor('HIGH')).toBe('#f59e0b');
  });

  test('EXTREME is red', () => {
    expect(getLIColor('EXTREME')).toBe('#ef4444');
  });
});

describe('LI Emojis', () => {
  test('returns correct emojis for categories', () => {
    expect(getLIEmoji('LOW')).toBe('😌');
    expect(getLIEmoji('MEDIUM')).toBe('😐');
    expect(getLIEmoji('HIGH')).toBe('😰');
    expect(getLIEmoji('EXTREME')).toBe('🔥');
  });
});

// ============================================
// CONSTANTS TESTS
// ============================================

describe('LI Constants', () => {
  test('LI_BOUNDS has correct values', () => {
    expect(LI_BOUNDS.min).toBe(0.1);
    expect(LI_BOUNDS.max).toBe(10.0);
  });

  test('LI_CATEGORIES has correct thresholds', () => {
    expect(LI_CATEGORIES.LOW.min).toBe(0.0);
    expect(LI_CATEGORIES.LOW.max).toBe(0.85);
    expect(LI_CATEGORIES.MEDIUM.min).toBe(0.85);
    expect(LI_CATEGORIES.MEDIUM.max).toBe(2.0);
    expect(LI_CATEGORIES.HIGH.min).toBe(2.0);
    expect(LI_CATEGORIES.HIGH.max).toBe(5.0);
    expect(LI_CATEGORIES.EXTREME.min).toBe(5.0);
    expect(LI_CATEGORIES.EXTREME.max).toBe(Infinity);
  });
});
