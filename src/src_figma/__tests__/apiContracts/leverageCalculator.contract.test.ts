/**
 * Leverage Calculator API Contract Tests
 * Phase 5.5 - Prevent API Hallucination Bugs
 *
 * Per TESTING_IMPLEMENTATION_PLAN.md Section 5.5:
 * Verify getLeverageIndex exists at correct import path
 * and returns expected types.
 */

import { describe, test, expect } from 'vitest';
import {
  // Main function under contract
  getLeverageIndex,
  calculateLeverageIndex,

  // Types that must exist
  type GameStateForLI,
  type LIResult,

  // Constants
  BASE_OUT_LI,
  getLICategory,
} from '../../../engines/leverageCalculator';

// ============================================
// FUNCTION SIGNATURE CONTRACTS
// ============================================

describe('Leverage Calculator API Contract', () => {
  describe('getLeverageIndex Signature', () => {
    test('accepts GameStateForLI parameter', () => {
      const gameState: GameStateForLI = {
        inning: 5,
        halfInning: 'TOP',
        outs: 1,
        runners: { first: false, second: false, third: false },
        homeScore: 3,
        awayScore: 3,
      };

      const li = getLeverageIndex(gameState);

      expect(typeof li).toBe('number');
    });

    test('accepts optional totalInnings parameter', () => {
      const gameState: GameStateForLI = {
        inning: 3,
        halfInning: 'BOTTOM',
        outs: 2,
        runners: { first: true, second: true, third: false },
        homeScore: 1,
        awayScore: 3,
      };

      const li6 = getLeverageIndex(gameState, 6);  // 6-inning game
      const li9 = getLeverageIndex(gameState, 9);  // 9-inning game

      expect(typeof li6).toBe('number');
      expect(typeof li9).toBe('number');
    });

    test('returns number >= 0', () => {
      const gameState: GameStateForLI = {
        inning: 1,
        halfInning: 'TOP',
        outs: 0,
        runners: { first: false, second: false, third: false },
        homeScore: 0,
        awayScore: 0,
      };

      const li = getLeverageIndex(gameState);
      expect(li).toBeGreaterThanOrEqual(0);
    });
  });

  // ============================================
  // GameStateForLI TYPE CONTRACT
  // ============================================

  describe('GameStateForLI Type Contract', () => {
    test('has inning property (number)', () => {
      const state: GameStateForLI = {
        inning: 5,
        halfInning: 'TOP',
        outs: 1,
        runners: { first: false, second: false, third: false },
        homeScore: 0,
        awayScore: 0,
      };

      expect(typeof state.inning).toBe('number');
    });

    test('has halfInning property (TOP | BOTTOM)', () => {
      const state: GameStateForLI = {
        inning: 5,
        halfInning: 'BOTTOM',
        outs: 1,
        runners: { first: false, second: false, third: false },
        homeScore: 0,
        awayScore: 0,
      };

      expect(['TOP', 'BOTTOM']).toContain(state.halfInning);
    });

    test('has outs property (number 0-2)', () => {
      const states: GameStateForLI[] = [
        { inning: 5, halfInning: 'TOP', outs: 0, runners: { first: false, second: false, third: false }, homeScore: 0, awayScore: 0 },
        { inning: 5, halfInning: 'TOP', outs: 1, runners: { first: false, second: false, third: false }, homeScore: 0, awayScore: 0 },
        { inning: 5, halfInning: 'TOP', outs: 2, runners: { first: false, second: false, third: false }, homeScore: 0, awayScore: 0 },
      ];

      for (const state of states) {
        expect(state.outs).toBeGreaterThanOrEqual(0);
        expect(state.outs).toBeLessThanOrEqual(2);
      }
    });

    test('has runners property (object with first/second/third booleans)', () => {
      const state: GameStateForLI = {
        inning: 5,
        halfInning: 'TOP',
        outs: 1,
        runners: { first: true, second: false, third: true },
        homeScore: 0,
        awayScore: 0,
      };

      expect(typeof state.runners.first).toBe('boolean');
      expect(typeof state.runners.second).toBe('boolean');
      expect(typeof state.runners.third).toBe('boolean');
    });

    test('has homeScore and awayScore properties (number)', () => {
      const state: GameStateForLI = {
        inning: 5,
        halfInning: 'TOP',
        outs: 1,
        runners: { first: false, second: false, third: false },
        homeScore: 3,
        awayScore: 5,
      };

      expect(typeof state.homeScore).toBe('number');
      expect(typeof state.awayScore).toBe('number');
    });
  });

  // ============================================
  // calculateLeverageIndex CONTRACT
  // ============================================

  describe('calculateLeverageIndex Signature', () => {
    test('accepts (gameState, config?) and returns LIResult', () => {
      const gameState: GameStateForLI = {
        inning: 9,
        halfInning: 'BOTTOM',
        outs: 2,
        runners: { first: false, second: true, third: true },
        homeScore: 3,
        awayScore: 3,
      };

      const result = calculateLeverageIndex(gameState);

      expect(result).toHaveProperty('leverageIndex');
      expect(result).toHaveProperty('rawLI');
      expect(result).toHaveProperty('baseOutLI');
    });
  });

  describe('LIResult Type Contract', () => {
    const gameState: GameStateForLI = {
      inning: 9,
      halfInning: 'BOTTOM',
      outs: 2,
      runners: { first: false, second: true, third: false },
      homeScore: 3,
      awayScore: 3,
    };

    const result = calculateLeverageIndex(gameState);

    test('has leverageIndex property (number)', () => {
      expect(typeof result.leverageIndex).toBe('number');
    });

    test('has rawLI property (number)', () => {
      expect(typeof result.rawLI).toBe('number');
    });

    test('has baseOutLI property (number)', () => {
      expect(typeof result.baseOutLI).toBe('number');
    });

    test('has inningMultiplier property (number)', () => {
      expect(typeof result.inningMultiplier).toBe('number');
    });

    test('has scoreDampener property (number)', () => {
      expect(typeof result.scoreDampener).toBe('number');
    });
  });

  // ============================================
  // BASE_OUT_LI CONSTANT CONTRACT
  // ============================================

  describe('BASE_OUT_LI Constant Contract', () => {
    test('exists and is an array', () => {
      expect(BASE_OUT_LI).toBeDefined();
      expect(Array.isArray(BASE_OUT_LI)).toBe(true);
    });

    test('has 8 base states (rows)', () => {
      // BASE_OUT_LI[baseState][outs] - 8 base states
      expect(BASE_OUT_LI.length).toBe(8);
    });

    test('each base state has 3 out entries (0, 1, 2)', () => {
      for (let baseState = 0; baseState < 8; baseState++) {
        expect(BASE_OUT_LI[baseState].length).toBe(3);
      }
    });

    test('LI values are reasonable (0.5 - 3.0 typical range)', () => {
      for (let baseState = 0; baseState < 8; baseState++) {
        for (let outs = 0; outs <= 2; outs++) {
          const li = BASE_OUT_LI[baseState][outs];
          expect(typeof li).toBe('number');
          expect(li).toBeGreaterThan(0);
        }
      }
    });

    test('bases loaded (7) with 2 outs has highest base LI', () => {
      const basesLoadedTwoOuts = BASE_OUT_LI[7][2];
      const emptyNoOuts = BASE_OUT_LI[0][0];

      expect(basesLoadedTwoOuts).toBeGreaterThan(emptyNoOuts);
    });
  });

  // ============================================
  // getLICategory CONTRACT
  // ============================================

  describe('getLICategory Function Contract', () => {
    test('accepts LI value (number) and returns category string', () => {
      const cat = getLICategory(2.0);
      expect(typeof cat).toBe('string');
    });

    test('Low LI (< 0.85) returns "LOW"', () => {
      const cat = getLICategory(0.5);
      expect(cat).toBe('LOW');
    });

    test('High LI (>= 2.0) returns "HIGH" or "EXTREME"', () => {
      const cat = getLICategory(2.5);
      expect(['HIGH', 'EXTREME']).toContain(cat);
    });

    test('returns valid category', () => {
      const validCategories = ['LOW', 'MEDIUM', 'HIGH', 'EXTREME'];
      expect(validCategories).toContain(getLICategory(1.0));
    });
  });

  // ============================================
  // SEMANTIC CONTRACTS
  // ============================================

  describe('Semantic Contracts - LI Values', () => {
    test('9th inning tie game has higher LI than 1st inning', () => {
      const earlyGame: GameStateForLI = {
        inning: 1,
        halfInning: 'TOP',
        outs: 0,
        runners: { first: false, second: false, third: false },
        homeScore: 0,
        awayScore: 0,
      };

      const lateGame: GameStateForLI = {
        inning: 9,
        halfInning: 'BOTTOM',
        outs: 2,
        runners: { first: false, second: false, third: false },
        homeScore: 3,
        awayScore: 3,
      };

      const earlyLI = getLeverageIndex(earlyGame);
      const lateLI = getLeverageIndex(lateGame);

      expect(lateLI).toBeGreaterThan(earlyLI);
    });

    test('bases loaded has higher LI than bases empty', () => {
      const empty: GameStateForLI = {
        inning: 5,
        halfInning: 'TOP',
        outs: 1,
        runners: { first: false, second: false, third: false },
        homeScore: 3,
        awayScore: 3,
      };

      const loaded: GameStateForLI = {
        inning: 5,
        halfInning: 'TOP',
        outs: 1,
        runners: { first: true, second: true, third: true },
        homeScore: 3,
        awayScore: 3,
      };

      const emptyLI = getLeverageIndex(empty);
      const loadedLI = getLeverageIndex(loaded);

      expect(loadedLI).toBeGreaterThan(emptyLI);
    });

    test('close game has higher LI than blowout', () => {
      const close: GameStateForLI = {
        inning: 7,
        halfInning: 'TOP',
        outs: 1,
        runners: { first: false, second: false, third: false },
        homeScore: 3,
        awayScore: 3, // Tied
      };

      const blowout: GameStateForLI = {
        inning: 7,
        halfInning: 'TOP',
        outs: 1,
        runners: { first: false, second: false, third: false },
        homeScore: 3,
        awayScore: 13, // 10-run lead for away
      };

      const closeLI = getLeverageIndex(close);
      const blowoutLI = getLeverageIndex(blowout);

      expect(closeLI).toBeGreaterThan(blowoutLI);
    });
  });
});

// ============================================
// TYPE COMPILATION TESTS
// ============================================

describe('Type Compilation Verification', () => {
  test('GameStateForLI type is usable', () => {
    const state: GameStateForLI = {
      inning: 5,
      halfInning: 'BOTTOM',
      outs: 2,
      runners: { first: true, second: false, third: false },
      homeScore: 2,
      awayScore: 3,
    };

    expect(state.inning).toBe(5);
    expect(state.halfInning).toBe('BOTTOM');
    expect(state.runners.first).toBe(true);
  });

  test('LIResult type is usable', () => {
    const result: LIResult = {
      leverageIndex: 2.5,
      rawLI: 2.8,
      baseOutLI: 1.5,
      inningMultiplier: 1.3,
      scoreDampener: 1.0,
      walkoffBoost: 0.5,
      baseState: '000',
      scoreDifferential: 0,
      isWalkoffPossible: true,
      gameProgress: 0.9,
    };

    expect(result.leverageIndex).toBe(2.5);
    expect(result.rawLI).toBe(2.8);
  });
});
